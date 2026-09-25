/* ==================================================================
   stripe-webhook — o UNICO lugar que concede plano pago.

   Nada no cliente, e nem a criar-checkout, escreve em user_plans: abrir o
   checkout nao e' ter pago. Quem decide e' o Stripe, e a prova de que a
   mensagem veio mesmo dele e' a assinatura HMAC conferida aqui. Sem essa
   conferencia, qualquer um faria um POST a esta URL e sairia Embaixador.

   PUBLICA DE PROPOSITO (deploy com --no-verify-jwt): quem chama e' o Stripe,
   que nao tem sessao de utilizador. A porta e' a assinatura, nao o JWT.

   Eventos ouvidos:
   · checkout.session.completed        -> primeira cobranca confirmada
   · customer.subscription.updated     -> renovacao, troca de plano, past_due
   · customer.subscription.deleted     -> cancelamento
   · checkout.session.completed (mode payment, forma pix) e
     checkout.session.async_payment_succeeded -> Pix avulso pago: prazo de 1 mes/1 ano
   · invoice.paid                      -> a cobranca da assinatura (primeira e renovacoes)
   · charge.refunded                   -> reembolso, que abate a receita do mes

   O DINHEIRO TAMBEM FICA REGISTRADO. Ate' aqui o webhook usava o evento so' para
   conceder plano e deitava fora o VALOR — e a pagina de Financas ficava com a
   receita por digitar a mao, mes a mes. Agora cada cobranca paga vira uma linha
   em `admin_rf98.stripe_pagamentos` (ver supabase/sql/stripe-receita.sql), com o
   id do Stripe como chave: reenvio de evento nao soma duas vezes.

   REGISTRAR DINHEIRO NUNCA DERRUBA O WEBHOOK. O plano e' o que a pessoa pagou
   para ter; a linha de receita e' contabilidade nossa. Se a segunda falhar, o
   erro fica no log e o plano entra na mesma — devolver 500 aqui poria o Stripe a
   reenviar o evento (e a regravar o plano) por causa de um numero de relatorio.

   DE QUEM E' A ASSINATURA: do user_id carimbado em subscription.metadata pelo
   checkout. Se faltar (assinatura criada a mao no painel do Stripe), cai na
   tabela stripe_customers pelo customer.

   QUAL PLANO: do metadata do PRECO vendido, nao de um id escrito aqui. E' o
   mesmo principio da criar-checkout — preco novo com o mesmo metadata entra
   sozinho, sem publicar codigo.

   UMA ASSINATURA POR CONTA (troca de plano). Quem sobe de Resenha para Embaixador
   (ou desce) passa pelo Checkout de novo e ganha uma assinatura NOVA. Duas coisas
   impedem que as duas convivam:
   · no `checkout.session.completed`, as outras assinaturas vivas do mesmo cliente
     sao canceladas na hora, com rateio — o que sobrou do periodo pago vira credito
     no saldo do cliente e abate a proxima fatura da assinatura nova;
   · a conta guarda QUAL assinatura manda (user_plans.note = "sub:<id>:<criada_em>").
     Evento de uma assinatura mais velha do que essa e' ignorado: a renovacao, o
     past_due ou o cancelamento da assinatura antiga nunca mais mexem no plano.
     A comparacao e' pela data de criacao que vem no proprio evento — nao precisa
     de ler nada no Stripe.
   ================================================================== */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.7.0";

/* Sem CORS de navegador: quem chama e' servidor do Stripe, nao uma pagina. */
function resp(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  });
}

/* FOLGA DE DOIS DIAS depois do fim do periodo pago. E' deliberado, e a escolha
   e' entre dois erros: ou alguem fica trancado por um webhook que atrasou, ou
   alguem joga dois dias a mais de graca. Trancar quem pagou e' o erro caro —
   vira reclamacao e reembolso; dois dias de cortesia nao custam nada. A
   renovacao normal empurra o prazo muito antes disso. */
const FOLGA_MS = 2 * 24 * 60 * 60 * 1000;

/* status que continuam valendo. `past_due` fica: o Stripe ainda esta' a tentar
   cobrar, e cortar o acesso no primeiro cartao recusado perde cliente que so'
   trocou de cartao. Quando desistir, manda `canceled` e cai aqui. */
const VIVOS = new Set(["active", "trialing", "past_due"]);

/* planos que o Stripe vende ou ja' vendeu. Desde 25/09 so' se vende o `pro`; `resenha` e
   `embaixador` ficam porque ha' quem os pagou e as renovacoes/cancelamentos continuam a chegar. */
const PLANOS_PAGOS = new Set(["resenha", "embaixador", "pro"]);
function planoValido(p: unknown): string | null {
  const s = String(p || "");
  return PLANOS_PAGOS.has(s) ? s : null;
}

function planoDaAssinatura(sub: Stripe.Subscription): string | null {
  const doItem = sub.items?.data?.[0]?.price?.metadata?.plano;
  const daSub = sub.metadata?.plano;
  return planoValido(doItem || daSub);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return resp(405, { error: "Método não suportado" });

  /* SEM CABECALHO DE ASSINATURA NAO HA' O QUE CONFERIR — 400, e antes de olhar
     os secrets. Duas razoes: um POST sem assinatura e' pedido malformado seja
     qual for a configuracao, e e' este 400 que o teste de fumaca do deploy usa
     para provar de uma vez que o worker subiu E que continua publico (401 aqui
     seria bug: o Stripe nao tem JWT). Perguntando os secrets primeiro, a funcao
     responderia 500 ate' alguem ligar o Stripe, e o CI reprovaria um deploy que
     esta' saudavel. */
  const assinatura = req.headers.get("stripe-signature") || "";
  if (!assinatura) return resp(400, { error: "Sem assinatura do Stripe." });

  const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  const WH_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!STRIPE_KEY || !WH_SECRET) {
    console.error("stripe-webhook: falta STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET");
    return resp(500, { error: "Webhook não configurado." });
  }

  const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2025-02-24.acacia" });
  const cru = await req.text();

  let evento: Stripe.Event;
  try {
    /* constructEventAsync, nao a versao sincrona: no Deno o HMAC e' assincrono
       (WebCrypto), e a sincrona lanca "SubtleCryptoProvider cannot be used in a
       synchronous context". */
    evento = await stripe.webhooks.constructEventAsync(cru, assinatura, WH_SECRET);
  } catch (e) {
    console.error("stripe-webhook: assinatura inválida —", (e as Error)?.message);
    return resp(400, { error: "Assinatura inválida." });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);

  async function donoDa(sub: Stripe.Subscription): Promise<string | null> {
    const carimbado = sub.metadata?.user_id;
    if (carimbado) return carimbado;
    const cust = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (!cust) return null;
    const { data } = await admin.schema("elifoot_v3")
      .from("stripe_customers").select("user_id").eq("customer_id", cust).maybeSingle();
    return data?.user_id || null;
  }

  /* ===== QUAL ASSINATURA MANDA NA CONTA =====
     O carimbo mora em user_plans.note: "sub:<id>:<unix da criacao>". Sem carimbo (conta de antes
     desta regra, ou linha de outra origem) nao ha' com que comparar e o evento vale, como antes. */
  type Carimbo = { id: string; t: number };
  function lerCarimbo(note: string | null | undefined): Carimbo | null {
    const m = /^sub:([^:]+):(\d+)$/.exec(String(note || ""));
    return m ? { id: m[1], t: Number(m[2]) } : null;
  }
  const carimbar = (id: string, t: number) => `sub:${id}:${Math.floor(t)}`;

  /* Decide se um evento de assinatura pode mexer no plano, e com que carimbo gravar.
     Devolve null quando o evento e' de uma assinatura velha (ou quando um Pix mais novo que
     ela esta' valendo) — nesse caso nao se grava nada. */
  async function avaliarAssinatura(uid: string, sub: Stripe.Subscription):
      Promise<{ note: string | null } | null> {
    const { data: atual } = await admin.schema("elifoot_v3")
      .from("user_plans").select("source,until,note,updated_at").eq("user_id", uid).maybeSingle();
    const criada = Number(sub.created) || 0;

    /* um Pix valido, pago DEPOIS de esta assinatura nascer, vale mais do que ela */
    if (atual?.source === "stripe_pix" && atual.until &&
        new Date(atual.until).getTime() > Date.now() &&
        criada * 1000 < new Date(atual.updated_at || 0).getTime()) {
      console.log(`evento de ${sub.id} ignorado: ${uid} tem Pix válido e mais novo`);
      return null;
    }

    const c = lerCarimbo(atual?.note);
    if (!c) {
      /* sem carimbo: so' se carimba quem ja' e' linha de assinatura; linha de admin ou de outra
         origem guarda o seu `note` (e' la' que fica escrito o porque da cortesia) */
      if (atual?.source === "stripe" || !atual) return { note: carimbar(sub.id, criada) };
      return { note: atual.note ?? null };
    }
    if (c.id === sub.id) return { note: atual!.note };
    if (criada < c.t) {
      console.log(`evento ignorado: ${sub.id} é mais velha que a assinatura atual ${c.id} de ${uid}`);
      return null;
    }
    /* uma assinatura mais nova que a carimbada (ex.: o `updated` dela chegou antes do
       `checkout.session.completed`) passa a mandar */
    return { note: carimbar(sub.id, criada) };
  }

  /* ===== A ASSINATURA ANTIGA SAI QUANDO A NOVA ENTRA =====
     Cancela as outras assinaturas vivas do cliente, com rateio: `prorate` gera o credito do tempo
     que nao sera' usado e `invoice_now` fecha a conta ja', entao o credito cai no saldo do cliente
     e abate a proxima cobranca da assinatura nova. Quem subiu de plano paga, no fim, so' a
     diferenca — so' que no mes seguinte, nao no Checkout (que ainda cobra o preco cheio do novo).
     Precisa de `subscription_read` (listar) e `subscription_write` (cancelar) na chave. Sem elas
     falha AQUI, com log — e o plano novo entra na mesma: e' melhor cobrar em dobro por um erro
     visivel no log do que deixar sem plano quem acabou de pagar. */
  async function cancelarAntigas(customer: string, manter: string) {
    try {
      const lista = await stripe.subscriptions.list({ customer, status: "all", limit: 20 });
      for (const velha of lista.data) {
        if (velha.id === manter || !VIVOS.has(velha.status)) continue;
        await stripe.subscriptions.cancel(velha.id, { prorate: true, invoice_now: true });
        console.log(`assinatura antiga ${velha.id} cancelada (troca para ${manter})`);
      }
    } catch (e) {
      console.error(`NAO CANCELOU a assinatura antiga do cliente ${customer} — cobrança em dobro até alguém cancelar no painel:`,
        (e as Error)?.message);
    }
  }

  async function gravar(uid: string, plano: string, until: string | null,
                       source = "stripe", note: string | null = null) {
    /* ===== UM PIX PAGO NAO CAI POR CAUSA DE UM CARTAO ANTIGO =====
       Quem cancelou o cartao e pagou Pix ainda recebe, dias depois, o `subscription.deleted`
       ou o `updated` da assinatura velha. Esse evento rebaixaria para `free` um periodo que o
       Pix ja' pagou. Rebaixamento vindo de assinatura so' vale sobre linha de assinatura. */
    if (source === "stripe" && plano === "free") {
      const { data: atual } = await admin.schema("elifoot_v3")
        .from("user_plans").select("source,until").eq("user_id", uid).maybeSingle();
      if (atual?.source === "stripe_pix" && atual.until &&
          new Date(atual.until).getTime() > Date.now()) {
        console.log(`rebaixamento ignorado: ${uid} tem Pix válido até ${atual.until}`);
        return;
      }
    }
    const { error } = await admin.schema("elifoot_v3").from("user_plans").upsert({
      user_id: uid, plan: plano, until, source, note, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) throw error;
    console.log(`plano ${plano} para ${uid} até ${until ?? "sem prazo"}`);

    /* ===== CAIU DO EMBAIXADOR: A VAGA DO JOGADOR VOLTA PARA A FILA =====
       Regra do dono (04/09): quem cancela larga o jogador — ele recupera o nome de base e a vaga
       fica livre para outro Embaixador. Quem reassinar NAO a recupera: entra na fila e escolhe
       outra livre, e por isso aqui nao se guarda reserva nenhuma.
       Fica DENTRO do `gravar` de proposito: e' o unico sitio por onde um plano muda, entao nao
       ha' caminho de cancelamento que escape — nem o `deleted`, nem o rebaixamento por
       `updated`, nem um cancelamento feito a mao no painel do Stripe.
       Nao derruba o webhook se falhar: o plano ja' foi gravado, e um erro aqui deixaria o Stripe
       a repetir o evento e a regravar o plano em ciclo. O log fica. */
    /* O Pro (25/09) NAO traz jogador no banco oficial, mas quem ja' tem a vaga a mantem: um
       Embaixador que passa para o Pro nao perde o jogador. So' larga quem cai para o gratis. */
    if (plano !== "embaixador" && plano !== "pro") {
      const { data: n, error: eVaga } = await admin.schema("elifoot_v3")
        .rpc("vaga_liberar_do_usuario", { p_user: uid });
      if (eVaga) console.error("libertar vaga de jogador:", eVaga.message);
      else if (n) console.log(`vaga(s) de jogador libertada(s) para ${uid}: ${n}`);
    }
  }

  /* ===== O FIM DO PERIODO MUDOU DE SITIO =====
     Ate' a versao 2025-02-24 da API, `current_period_end` vivia na ASSINATURA. Agora vive no
     ITEM dela — e o objeto que o Stripe manda ja' nao traz o campo em cima. `new Date(undefined *
     1000)` da' Invalid Date, e `.toISOString()` sobre ele ATIRA: era o "RangeError: Invalid time
     value" que derrubava o `customer.subscription.updated` inteiro, com o plano por gravar.
     Le'-se o item primeiro, a assinatura como reserva, e devolve-se null quando nao ha' nenhum
     dos dois — nunca uma data invalida. Sem prazo e' um estado que `plano_limites` sabe ler
     ("plano pago nao tem prazo"); uma excepcao a meio do webhook nao e'. */
  function fimDoPeriodo(sub: Stripe.Subscription): string | null {
    const it: any = (sub as any)?.items?.data?.[0];
    const seg = Number(it?.current_period_end ?? (sub as any)?.current_period_end);
    if (!Number.isFinite(seg) || seg <= 0) {
      console.error("assinatura sem fim de periodo:", sub.id);
      return null;
    }
    return new Date(seg * 1000 + FOLGA_MS).toISOString();
  }

  /* ===== PIX AVULSO: O PRAZO E' O PERIODO PAGO =====
     Um mes (ou um ano) a contar de agora — ou do fim do periodo atual, se o jogador esta'
     pagando o MESMO plano antes de vencer (quem paga adiantado nao perde os dias que faltam).
     Trocar de plano recomeca a contar de hoje.

     O MESMO PIX NAO PODE SER CONTADO DUAS VEZES. O Stripe manda `completed` e, conforme o
     caso, `async_payment_succeeded` para a mesma sessao, e reenvia eventos quando quer. O id
     da sessao fica em `note`; chegando de novo, nao se soma nada. */
  async function concederPix(s: Stripe.Checkout.Session) {
    const uid = (s.client_reference_id as string) || (s.metadata?.user_id as string) || null;
    const plano = planoValido(s.metadata?.plano);
    const ciclo = s.metadata?.ciclo === "ano" ? "ano" : "mes";
    if (!uid || !plano) { console.error("pix sem dono ou sem plano", s.id); return; }

    const marca = `pix:${s.id}`;
    const { data: atual } = await admin.schema("elifoot_v3")
      .from("user_plans").select("plan,until,note").eq("user_id", uid).maybeSingle();
    if (atual?.note === marca) { console.log("pix já concedido", s.id); return; }

    const agora = Date.now();
    const fimAtual = atual?.until ? new Date(atual.until).getTime() - FOLGA_MS : 0;
    const base = (atual?.plan === plano && fimAtual > agora) ? fimAtual : agora;
    const fim = new Date(base);
    if (ciclo === "ano") fim.setUTCFullYear(fim.getUTCFullYear() + 1);
    else fim.setUTCMonth(fim.getUTCMonth() + 1);
    await gravar(uid, plano, new Date(fim.getTime() + FOLGA_MS).toISOString(), "stripe_pix", marca);
    await avisarGrupo("pix:" + s.id, "pix",
      `💠 Pix pago — ${NOME_PLANO[plano]} (${ciclo === "ano" ? "1 ano" : "1 mês"}) — ${reais(Number(s.amount_total) || 0, s.currency)}`, uid);
  }

  /* ===== A RECEITA, LINHA A LINHA =====
     `upsert` sobre o id da cobranca: o Stripe reenvia eventos quando quer, e
     somar duas vezes a mesma venda e' pior do que nao somar nenhuma — um numero
     errado ninguem desconfia, um numero em falta aparece.
     `ignoreDuplicates` fica FALSE de proposito: a reentrega costuma trazer mais
     informacao do que a primeira (a taxa do Stripe, por exemplo, so' existe
     depois de a transacao assentar), entao a linha e' atualizada. */
  async function registrarPagamento(p: {
    id: string; cobranca_id?: string | null; tipo: string; user_id?: string | null;
    plano?: string | null; moeda: string; bruto: number; taxa?: number | null;
    liquido?: number | null; pago_em: number; evento: string;
  }) {
    if (!p.id || !(p.bruto > 0)) return;
    const { error } = await admin.schema("admin_rf98").from("stripe_pagamentos").upsert({
      id: p.id, cobranca_id: p.cobranca_id ?? null,
      tipo: p.tipo, user_id: p.user_id ?? null, plano: p.plano ?? null,
      moeda: String(p.moeda || "brl").toLowerCase(),
      bruto_centavos: Math.round(p.bruto),
      taxa_centavos: p.taxa == null ? null : Math.round(p.taxa),
      liquido_centavos: p.liquido == null ? null : Math.round(p.liquido),
      pago_em: new Date(p.pago_em * 1000).toISOString(),
      evento: p.evento, atualizado_em: new Date().toISOString(),
    }, { onConflict: "id" });
    if (error) console.error("receita nao registrada:", p.id, error.message);
    else console.log(`receita ${p.id}: ${p.bruto} ${p.moeda} (${p.tipo})`);
  }

  /* A TAXA DO STRIPE SO' EXISTE NA BALANCE TRANSACTION, e ler essa exige
     `charge_read` na chave restrita. Sem a permissao (ou com a transacao ainda
     por assentar) volta null — e o banco entende null como "ainda nao contada",
     lancando a receita bruta sem taxa em vez de fingir que a taxa e' zero. */
  async function taxaDaCobranca(cobranca?: string | null) {
    if (!cobranca) return { taxa: null as number | null, liquido: null as number | null };
    try {
      const ch = await stripe.charges.retrieve(cobranca, { expand: ["balance_transaction"] });
      const bt: any = ch.balance_transaction;
      if (bt && typeof bt === "object" && Number.isFinite(Number(bt.fee))) {
        return { taxa: Number(bt.fee), liquido: Number(bt.net) };
      }
    } catch (e) {
      console.log("sem ler a taxa do Stripe (segue sem ela):", (e as Error)?.message);
    }
    return { taxa: null as number | null, liquido: null as number | null };
  }

  /* O Pix e o checkout de assinatura chegam como SESSAO; o id que vale para nao
     duplicar e' o da sessao, que e' unico por compra. */
  async function registrarSessao(s: Stripe.Checkout.Session, tipo: string) {
    const bruto = Number(s.amount_total) || 0;
    if (!bruto) return;
    const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
    let cobranca: string | null = null;
    if (pi) {
      try {
        const intent: any = await stripe.paymentIntents.retrieve(pi);
        cobranca = intent?.latest_charge || null;
      } catch (e) { console.log("sem ler o payment_intent:", (e as Error)?.message); }
    }
    const { taxa, liquido } = await taxaDaCobranca(cobranca);
    await registrarPagamento({
      id: s.id, cobranca_id: cobranca, tipo, moeda: String(s.currency || "brl"), bruto, taxa, liquido,
      user_id: (s.client_reference_id as string) || (s.metadata?.user_id as string) || null,
      plano: (s.metadata?.plano as string) || null,
      pago_em: Number(s.created) || Math.floor(Date.now() / 1000),
      evento: evento.type,
    });
  }

  /* ===== AVISO NO GRUPO DOS DEVS (WhatsApp, 25/09/2026) =====
     Cada pagamento que muda alguma coisa vira uma mensagem curta no grupo interno "PB Games":
     assinatura nova, Pix, renovacao, cancelamento e reembolso. Quem envia e' o banco
     (admin_rf98.avisar_grupo -> tabela avisos_grupo -> pg_net -> Green-API; ver
     scripts/sql/avisos_grupo_whatsapp.sql). A CHAVE e' o id do que foi pago/cancelado: o Stripe
     reenvia eventos e o mesmo Pix chega por dois, e a chave repetida nem entra.
     NUNCA derruba o webhook: o plano ja' foi gravado, o aviso e' so' conforto. */
  const NOME_PLANO: Record<string, string> = { resenha: "Resenha", embaixador: "Embaixador", pro: "Pro" };
  const reais = (centavos: number, moeda?: string | null) =>
    String(moeda || "brl").toLowerCase() === "brl"
      ? "R$ " + (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : (centavos / 100).toFixed(2) + " " + String(moeda).toUpperCase();
  function foneLegivel(d: string): string {
    if (/^55\d{10,11}$/.test(d)) return `+55 (${d.slice(2, 4)}) ${d.slice(4, d.length - 4)}-${d.slice(-4)}`;
    return "+" + d;
  }
  async function quemE(uid: string | null): Promise<string> {
    if (!uid) return "Conta: não identificada";
    try {
      const { data } = await admin.auth.admin.getUserById(uid);
      const u = data?.user;
      const m: any = u?.user_metadata || {};
      const zap = String(m.whatsapp || "").replace(/\D/g, "");
      return `Nome: ${m.name || m.nome || "—"}\nE-mail: ${u?.email || "—"}\nWhatsApp: ${zap ? foneLegivel(zap) : "—"}`;
    } catch (_e) {
      return `Conta: ${uid}`;
    }
  }
  async function avisarGrupo(chave: string, tipo: string, titulo: string, uid: string | null) {
    try {
      const texto = `${titulo}\n${await quemE(uid)}`;
      const { error } = await admin.schema("admin_rf98")
        .rpc("avisar_grupo", { p_tipo: tipo, p_texto: texto, p_chave: chave });
      if (error) console.error("aviso no grupo:", error.message);
    } catch (e) {
      console.error("aviso no grupo:", (e as Error)?.message);
    }
  }
  async function donoDoCliente(cust: string | null | undefined): Promise<string | null> {
    if (!cust) return null;
    const { data } = await admin.schema("elifoot_v3")
      .from("stripe_customers").select("user_id").eq("customer_id", cust).maybeSingle();
    return data?.user_id || null;
  }

  try {
    switch (evento.type) {
      /* Pix confirmado depois do fecho da sessao (pagamento assincrono). */
      case "checkout.session.async_payment_succeeded": {
        const s = evento.data.object as Stripe.Checkout.Session;
        if (s.mode === "payment" && s.metadata?.forma === "pix") {
          await concederPix(s);
          await registrarSessao(s, "pix");
        }
        break;
      }

      /* A sessao completa nao traz os itens da assinatura — so' o id dela.
         Buscar a assinatura e' o que da' acesso ao preco vendido (e ao plano). */
      /* ===== A SESSAO JA' TRAZ QUEM E' E O QUE COMPROU =====
         Esta ramificacao comecava por ir buscar a assinatura ao Stripe — e ficava refem de uma
         permissao (`subscription_read`) que a chave restrita pode nao ter: sem ela, 500, o
         Stripe reenvia sem parar e acaba por desligar o endpoint. Mas nada disso e' preciso para
         o essencial: a `criar-checkout` carimba `user_id` e `plano` na propria sessao, e o
         `client_reference_id` traz o dono. So' o FIM DO PERIODO exige a assinatura — e esse, se
         nao vier, chega depois no `customer.subscription.updated`, que traz o objeto inteiro.
         Entao: concede-se o plano com o que ha', e a data e' um extra. Um evento nao pode falhar
         inteiro por causa da parte opcional. */
      case "checkout.session.completed": {
        const s = evento.data.object as Stripe.Checkout.Session;
        /* Pix: so' concede com o dinheiro dentro. `unpaid` quer dizer QR gerado e ainda nao
           pago — a confirmacao vem depois, no `async_payment_succeeded`. */
        if (s.mode === "payment" && s.metadata?.forma === "pix") {
          if (s.payment_status === "paid") { await concederPix(s); await registrarSessao(s, "pix"); }
          break;
        }
        /* A ASSINATURA NAO E' REGISTRADA AQUI, e' no `invoice.paid`. Somar a
           sessao E a fatura contaria a primeira cobranca duas vezes; e so' a
           fatura chega nas RENOVACOES, que sao a maior parte da receita. */
        if (s.mode !== "subscription" || !s.subscription) break;
        const subId = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
        const uid = (s.client_reference_id as string) || (s.metadata?.user_id as string) || null;
        const plano = planoValido(s.metadata?.plano);
        if (!uid || !plano) { console.error("checkout sem dono ou sem plano", s.id); break; }

        let until: string | null = null;
        /* a data de criacao da assinatura: sem ler o Stripe, a da sessao serve de piso — a
           assinatura nasce depois dela, entao o carimbo nunca fica mais novo que a propria */
        let criada = Number(s.created) || Math.floor(Date.now() / 1000);
        try {
          const sub = await stripe.subscriptions.retrieve(subId);
          until = fimDoPeriodo(sub);
          criada = Number(sub.created) || criada;
        } catch (e) {
          /* tipicamente falta `subscription_read` na chave. NAO e' motivo para recusar o evento:
             o plano entra na mesma e o prazo vem no evento seguinte. */
          console.error("sem ler a assinatura (segue sem prazo):", (e as Error)?.message);
        }
        /* reenvio de um checkout antigo nao pode tomar o lugar de uma assinatura mais nova */
        const { data: atual } = await admin.schema("elifoot_v3")
          .from("user_plans").select("note").eq("user_id", uid).maybeSingle();
        const c = lerCarimbo(atual?.note);
        if (c && c.id !== subId && c.t > criada) {
          console.log(`checkout ${s.id} ignorado: ${uid} já tem assinatura mais nova (${c.id})`);
          break;
        }
        await gravar(uid, plano, until, "stripe", carimbar(subId, c?.id === subId ? c.t : criada));
        await avisarGrupo("assinatura:" + subId, "assinatura",
          `💳 Nova assinatura — ${NOME_PLANO[plano]}${Number(s.amount_total) ? " — " + reais(Number(s.amount_total), s.currency) : ""}`, uid);
        const cust = typeof s.customer === "string" ? s.customer : s.customer?.id;
        if (cust) await cancelarAntigas(cust, subId);
        break;
      }

      /* ===== A COBRANCA DA ASSINATURA =====
         `invoice.paid` e' o unico evento que cobre TODA a vida da assinatura: a
         primeira cobranca, cada renovacao mensal, e a diferenca cobrada numa
         troca de plano. Nao mexe em plano nenhum — quem concede continua a ser
         o checkout e o `subscription.updated`; aqui so' entra o dinheiro.
         Faturas de valor zero (cortesia, credito de rateio que cobre tudo) sao
         ignoradas pelo proprio `registrarPagamento`. */
      case "invoice.paid": {
        const inv = evento.data.object as Stripe.Invoice;
        const bruto = Number(inv.amount_paid) || 0;
        if (!bruto) break;
        const cobranca = (inv as any).charge
          ?? (inv as any).payments?.data?.[0]?.payment?.charge
          ?? null;
        const { taxa, liquido } = await taxaDaCobranca(typeof cobranca === "string" ? cobranca : null);
        const sub: any = (inv as any).subscription;
        let uid: string | null = (inv as any).subscription_details?.metadata?.user_id
          ?? (inv.metadata?.user_id as string) ?? null;
        if (!uid) {
          const cust = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
          if (cust) {
            const { data } = await admin.schema("elifoot_v3")
              .from("stripe_customers").select("user_id").eq("customer_id", cust).maybeSingle();
            uid = data?.user_id || null;
          }
        }
        await registrarPagamento({
          id: inv.id!, cobranca_id: typeof cobranca === "string" ? cobranca : null,
          tipo: "assinatura", user_id: uid,
          plano: (inv as any).subscription_details?.metadata?.plano
              ?? inv.lines?.data?.[0]?.price?.metadata?.plano ?? null,
          moeda: String(inv.currency || "brl"), bruto, taxa, liquido,
          pago_em: Number((inv as any).status_transitions?.paid_at) || Number(inv.created)
                   || Math.floor(Date.now() / 1000),
          evento: evento.type,
        });
        if (sub) console.log(`fatura ${inv.id} paga (assinatura ${typeof sub === "string" ? sub : sub.id})`);
        /* so' a RENOVACAO: a primeira fatura ('subscription_create') ja' foi avisada como
           assinatura nova, e a de troca de plano ('subscription_update') e' so' a diferenca */
        if ((inv as any).billing_reason === "subscription_cycle") {
          const pl = String((inv as any).subscription_details?.metadata?.plano
            ?? inv.lines?.data?.[0]?.price?.metadata?.plano ?? "");
          await avisarGrupo("renovacao:" + inv.id, "renovacao",
            `🔁 Renovação — ${NOME_PLANO[pl] || "plano"} — ${reais(bruto, inv.currency)}`, uid);
        }
        break;
      }

      /* ===== O REEMBOLSO ABATE O MES =====
         Fica na MESMA linha da cobranca, e nao numa linha negativa: o que a
         pagina precisa e' "quanto ficou", e uma linha negativa solta obrigaria
         cada leitura a casar as duas. `amount_refunded` e' acumulado — reembolso
         parcial seguido de outro nao soma duas vezes. */
      case "charge.refunded": {
        const ch = evento.data.object as Stripe.Charge;
        const abate = { reembolsado_centavos: Number(ch.amount_refunded) || 0,
                        atualizado_em: new Date().toISOString() };
        const tab = () => admin.schema("admin_rf98").from("stripe_pagamentos");
        /* pela COBRANCA, que e' o que o evento traz. A fatura e' a reserva: sem
           `charge_read` a linha pode ter ficado sem `cobranca_id`, e ai' o id da
           compra (a propria fatura) ainda a encontra. */
        let { data, error } = await tab().update(abate).eq("cobranca_id", ch.id).select("id");
        const fatura = (ch as any).invoice;
        if (!error && !data?.length && typeof fatura === "string") {
          ({ data, error } = await tab().update(abate).eq("id", fatura).select("id"));
        }
        if (error) console.error("reembolso nao registrado:", ch.id, error.message);
        else if (!data?.length) console.error(`reembolso de ${ch.amount_refunded} sem linha de receita: ${ch.id}`);
        else console.log(`reembolso de ${ch.amount_refunded} na cobranca ${ch.id}`);
        {
          const custR = typeof ch.customer === "string" ? ch.customer : ch.customer?.id;
          const uidR = (ch.metadata?.user_id as string) || await donoDoCliente(custR);
          await avisarGrupo(`reembolso:${ch.id}:${ch.amount_refunded}`, "reembolso",
            `↩️ Reembolso — ${reais(Number(ch.amount_refunded) || 0, ch.currency)}${ch.amount_refunded < ch.amount ? " (parcial, de " + reais(ch.amount, ch.currency) + ")" : ""}`, uidR);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = evento.data.object as Stripe.Subscription;
        const uid = await donoDa(sub);
        const plano = planoDaAssinatura(sub);
        if (!uid) { console.error("assinatura sem dono", sub.id); break; }
        const ok = await avaliarAssinatura(uid, sub);
        if (!ok) break;
        if (VIVOS.has(sub.status) && plano) {
          await gravar(uid, plano, fimDoPeriodo(sub), "stripe", ok.note);
        } else {
          /* Nao apaga a linha: deixa o registo de que ja' foi assinante, com o
             plano rebaixado. `free` e' o que plano_limites le'. */
          await gravar(uid, "free", null, "stripe", ok.note);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = evento.data.object as Stripe.Subscription;
        const uid = await donoDa(sub);
        if (!uid) { console.error("cancelamento sem dono", sub.id); break; }
        /* o cancelamento da assinatura ANTIGA (feito por cancelarAntigas, numa troca de plano)
           chega aqui tambem — e e' ignorado, porque ela e' mais velha que a carimbada */
        const ok = await avaliarAssinatura(uid, sub);
        if (!ok) break;
        await gravar(uid, "free", null, "stripe", ok.note);
        await avisarGrupo("cancelamento:" + sub.id, "cancelamento",
          `❌ Assinatura cancelada — ${NOME_PLANO[planoDaAssinatura(sub) || ""] || "plano"}`, uid);
        break;
      }

      default:
        /* Responder 200 ao que nao interessa e' de propósito: 4xx faria o
           Stripe reenviar para sempre um evento que nunca vamos usar. */
        break;
    }
  } catch (e) {
    console.error("stripe-webhook:", evento.type, e);
    /* 500 pede reenvio ao Stripe — e' o que se quer quando a falha foi nossa
       (banco fora do ar), porque o pagamento ja' aconteceu e o plano precisa
       chegar. O Stripe reenvia com recuo crescente por ate' 3 dias. */
    return resp(500, { error: "Falha ao gravar o plano." });
  }

  return resp(200, { recebido: true });
});
