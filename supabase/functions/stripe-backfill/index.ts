/* ==================================================================
   stripe-backfill — a receita que aconteceu ANTES do webhook a gravar.

   POR QUE EXISTE. O `stripe-webhook` só passou a registrar dinheiro em
   `admin_rf98.stripe_pagamentos` a partir do deploy de 21/09/2026. Tudo o que
   foi cobrado antes disso está no Stripe e em lado nenhum nosso — o painel
   fecharia os meses anteriores com despesa cheia e receita zero. Isto é a
   passagem única que traz esse histórico.

   PERCORRE AS COBRANÇAS, e não as faturas. Uma volta por `charges` apanha as
   assinaturas E os Pix; e a `balance_transaction` vem expandida na mesma
   listagem, então a TAXA do Stripe entra sem uma ida extra por cobrança.

   A CHAVE RESTRITA PODE NÃO TER TUDO, e a função não desiste por causa disso.
   `charge_read` é o mínimo — sem ele não há o que ler. Já `balance_transaction`
   é um extra: se o Stripe recusar o expand, a listagem é refeita SEM ele e a
   receita entra na mesma, com a taxa em `null` (que o banco lê como "ainda não
   contada"). Perder a taxa é um número a menos; perder a listagem inteira por
   causa dela seria o mês fechar com receita zero.

   A CHAVE DE CADA LINHA É A MESMA QUE O WEBHOOK ESCREVE — id da FATURA para
   assinatura, id da SESSÃO para Pix. Se fosse o id da cobrança, correr isto
   depois de o webhook já ter gravado criaria uma segunda linha para o mesmo
   dinheiro, e o mês apareceria com o dobro da receita. Com a mesma chave, o
   `upsert` só atualiza: pode correr as vezes que for.

   DE QUEM É: pelo `customer`, em `elifoot_v3.stripe_customers`. O `user_id` que
   o webhook lê do metadata não existe nas cobranças antigas, e o dono é
   informativo aqui — o que a página soma é o valor.

   SÓ SÓCIO. É a única função que escreve receita a pedido de um humano.

   Body (opcional): { desde?: 'AAAA-MM-DD', limite_paginas?: number }
   Resposta: { lidas, gravadas, ignoradas, sem_sessao, erros, de, ate }
   ================================================================== */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.7.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resp(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp(405, { error: "Método não suportado" });

  const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  if (!STRIPE_KEY) return resp(500, { error: "STRIPE_SECRET_KEY não configurado." });

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return resp(401, { error: "Sessão inválida." });
  const { data: adm } = await admin
    .schema("admin_rf98").from("adm_users")
    .select("papel").eq("user_id", userData.user.id).maybeSingle();
  if (!adm || adm.papel !== "socio") {
    return resp(403, { error: "Só sócios importam o histórico de cobranças." });
  }

  let body: { desde?: string; limite_paginas?: number } = {};
  try { body = await req.json(); } catch { /* body vazio é válido */ }
  const teto = Math.min(Math.max(Number(body.limite_paginas) || 20, 1), 100);

  const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2025-02-24.acacia" });

  const filtro: Record<string, unknown> = { limit: 100 };
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(body.desde || ""))) {
    filtro.created = { gte: Math.floor(Date.parse(body.desde + "T00:00:00Z") / 1000) };
  }

  /* o expand da taxa é tentado uma vez; recusado por permissão, desliga-se para
     o resto da corrida — não adianta apanhar o mesmo 403 a cada página */
  let comTaxa = true;
  let avisoTaxa = "";
  async function listar(pagina: Record<string, unknown>) {
    if (comTaxa) {
      try {
        return await stripe.charges.list({ ...pagina, expand: ["data.balance_transaction"] } as any);
      } catch (e) {
        const msg = (e as Error)?.message || "";
        if (!/permission|does not have the required/i.test(msg)) throw e;
        comTaxa = false;
        avisoTaxa = "A chave não tem permissão de ler balance transactions: a receita entrou, " +
                    "mas sem a taxa do Stripe. Ligue 'Balance transactions → Read' e importe de novo.";
        console.log("stripe-backfill: sem taxa —", msg);
      }
    }
    return await stripe.charges.list(pagina as any);
  }

  /* o dono sai do `customer`, e o mesmo cliente repete-se em todas as renovações
     — por isso a resposta fica em cache, em vez de uma consulta por cobrança */
  const donos = new Map<string, string | null>();
  async function donoDo(customer?: string | null) {
    if (!customer) return null;
    if (donos.has(customer)) return donos.get(customer)!;
    const { data } = await admin.schema("elifoot_v3")
      .from("stripe_customers").select("user_id").eq("customer_id", customer).maybeSingle();
    const uid = data?.user_id || null;
    donos.set(customer, uid);
    return uid;
  }

  let lidas = 0, gravadas = 0, ignoradas = 0, semSessao = 0;
  const erros: string[] = [];
  let de = "", ate = "";

  try {
    let depois: string | undefined, voltas = 0, temMais = true;
    while (temMais && voltas++ < teto) {
      const pag: any = await listar(depois ? { ...filtro, starting_after: depois } : filtro);
      for (const ch of pag.data as Stripe.Charge[]) {
        lidas++;
        depois = ch.id;
        /* cobrança recusada, pendente ou já estornada por completo antes de
           assentar não é receita — e uma de valor zero também não */
        if (ch.status !== "succeeded" || !ch.paid || !(Number(ch.amount) > 0)) { ignoradas++; continue; }

        const fatura = (ch as any).invoice;
        let id: string | null = typeof fatura === "string" ? fatura : (fatura?.id ?? null);
        let tipo = "assinatura";
        if (!id) {
          /* Pix (ou qualquer compra avulsa): a chave do webhook é a SESSÃO do
             checkout, e é por ela que se pergunta, pelo payment_intent */
          tipo = "pix";
          const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;
          if (pi) {
            try {
              const ses = await stripe.checkout.sessions.list({ payment_intent: pi, limit: 1 });
              id = ses.data[0]?.id || null;
            } catch (e) { erros.push(`sessão de ${ch.id}: ${(e as Error)?.message}`); }
          }
          /* sem sessão (cobrança feita à mão no painel do Stripe, por exemplo) a
             própria cobrança serve de chave: é única, e o webhook nunca vai
             escrever uma linha com este id — não há como duplicar */
          if (!id) { id = ch.id; semSessao++; }
        }

        const bt: any = ch.balance_transaction;
        const temTaxa = bt && typeof bt === "object" && Number.isFinite(Number(bt.fee));
        const dia = new Date(Number(ch.created) * 1000).toISOString().slice(0, 10);
        if (!de || dia < de) de = dia;
        if (!ate || dia > ate) ate = dia;

        const { error } = await admin.schema("admin_rf98").from("stripe_pagamentos").upsert({
          id, cobranca_id: ch.id, tipo,
          user_id: await donoDo(typeof ch.customer === "string" ? ch.customer : ch.customer?.id),
          plano: (ch.metadata?.plano as string) || null,
          moeda: String(ch.currency || "brl").toLowerCase(),
          bruto_centavos: Number(ch.amount),
          taxa_centavos: temTaxa ? Number(bt.fee) : null,
          liquido_centavos: temTaxa ? Number(bt.net) : null,
          reembolsado_centavos: Number(ch.amount_refunded) || 0,
          pago_em: new Date(Number(ch.created) * 1000).toISOString(),
          evento: "backfill", atualizado_em: new Date().toISOString(),
        }, { onConflict: "id" });
        if (error) erros.push(`${id}: ${error.message}`);
        else gravadas++;
      }
      temMais = !!pag.has_more;
    }
  } catch (e) {
    console.error("stripe-backfill:", e);
    /* o que já entrou FICA: a função é idempotente, então correr de novo
       continua de onde parou sem somar nada duas vezes */
    return resp(502, { error: "Falha a ler o Stripe: " + ((e as Error)?.message || "erro"),
                       lidas, gravadas, ignoradas, semSessao, erros: erros.slice(0, 10) });
  }

  console.log(`stripe-backfill: ${gravadas} de ${lidas} cobranças (${de} a ${ate})`);
  return resp(200, { lidas, gravadas, ignoradas, sem_sessao: semSessao, de, ate,
                     aviso: avisoTaxa || undefined, erros: erros.slice(0, 10) });
});
