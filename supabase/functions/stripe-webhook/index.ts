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

   DE QUEM E' A ASSINATURA: do user_id carimbado em subscription.metadata pelo
   checkout. Se faltar (assinatura criada a mao no painel do Stripe), cai na
   tabela stripe_customers pelo customer.

   QUAL PLANO: do metadata do PRECO vendido, nao de um id escrito aqui. E' o
   mesmo principio da criar-checkout — preco novo com o mesmo metadata entra
   sozinho, sem publicar codigo.
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

function planoDaAssinatura(sub: Stripe.Subscription): string | null {
  const doItem = sub.items?.data?.[0]?.price?.metadata?.plano;
  const daSub = sub.metadata?.plano;
  const p = String(doItem || daSub || "");
  return (p === "resenha" || p === "embaixador") ? p : null;
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

  async function gravar(uid: string, plano: string, until: string | null) {
    const { error } = await admin.schema("elifoot_v3").from("user_plans").upsert({
      user_id: uid, plan: plano, until, source: "stripe", updated_at: new Date().toISOString(),
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
    if (plano !== "embaixador") {
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

  try {
    switch (evento.type) {
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
        if (s.mode !== "subscription" || !s.subscription) break;
        const subId = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
        const uid = (s.client_reference_id as string) || (s.metadata?.user_id as string) || null;
        const pm = String(s.metadata?.plano || "");
        const plano = (pm === "resenha" || pm === "embaixador") ? pm : null;
        if (!uid || !plano) { console.error("checkout sem dono ou sem plano", s.id); break; }

        let until: string | null = null;
        try {
          const sub = await stripe.subscriptions.retrieve(subId);
          until = fimDoPeriodo(sub);
        } catch (e) {
          /* tipicamente falta `subscription_read` na chave. NAO e' motivo para recusar o evento:
             o plano entra na mesma e o prazo vem no evento seguinte. */
          console.error("sem ler a assinatura (segue sem prazo):", (e as Error)?.message);
        }
        await gravar(uid, plano, until);
        break;
      }

      case "customer.subscription.updated": {
        const sub = evento.data.object as Stripe.Subscription;
        const uid = await donoDa(sub);
        const plano = planoDaAssinatura(sub);
        if (!uid) { console.error("assinatura sem dono", sub.id); break; }
        if (VIVOS.has(sub.status) && plano) {
          await gravar(uid, plano, fimDoPeriodo(sub));
        } else {
          /* Nao apaga a linha: deixa o registo de que ja' foi assinante, com o
             plano rebaixado. `free` e' o que plano_limites le'. */
          await gravar(uid, "free", null);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = evento.data.object as Stripe.Subscription;
        const uid = await donoDa(sub);
        if (!uid) { console.error("cancelamento sem dono", sub.id); break; }
        await gravar(uid, "free", null);
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
