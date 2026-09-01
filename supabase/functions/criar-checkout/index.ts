/* ==================================================================
   criar-checkout — abre a pagina de pagamento do plano escolhido.

   O jogador toca em "Assinar o Resenha" (ou bate numa trava e escolhe
   destravar), esta funcao devolve a URL do Checkout do Stripe e o cliente
   redireciona. Quem grava o plano NAO e' esta funcao: e' o webhook, quando o
   pagamento confirma. Aqui nada muda de estado no jogo — e e' assim de
   proposito, porque abrir o checkout nao e' ter pago.

   O PRECO E' ENCONTRADO PELO METADATA, nao por um id escrito no codigo. Os
   quatro precos nascem no Stripe com metadata.plano ('resenha'/'embaixador') e
   metadata.ciclo ('mes'/'ano'); trocar de preco amanha (promocao, reajuste) e'
   criar o preco novo com o mesmo metadata e arquivar o velho — sem tocar aqui,
   sem publicar nada. Quatro `price_...` espalhados pelo codigo seriam quatro
   sitios para esquecer de mudar.

   Body: { plano:'resenha'|'embaixador', ciclo:'mes'|'ano', origem?: url }
   Resposta: { url } ou { error }
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
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const PLANOS = new Set(["resenha", "embaixador"]);
const CICLOS = new Set(["mes", "ano"]);
const SITE_PADRAO = "https://retrofoot98.com.br";

/* So' o proprio site pode ser o destino de volta. Sem esta trava, um body com
   `origem` apontando para fora transformaria o checkout num redirecionador
   aberto — com o nome do RetroFoot no meio do caminho. */
const DESTINOS_OK = [
  "https://retrofoot98.com.br",
  "https://retrofoot.com.br",
  "https://retrofoot98-beta.web.app",
  "http://localhost:5199",
];
function destino(origem: string | undefined): string {
  const o = String(origem || "").replace(/\/+$/, "");
  return DESTINOS_OK.includes(o) ? o : SITE_PADRAO;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp(405, { error: "Método não suportado" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);

  /* QUEM E' VOCE ANTES DE COMO SE PAGA. A ordem importa: enquanto a chave do
     Stripe nao estiver posta, esta funcao ainda tem de responder 401 a quem
     chega sem sessao — e' o 401 que o teste de fumaca do deploy usa para provar
     que o worker subiu. Perguntando a chave primeiro, ela responderia 500 a
     todo mundo e o portao do CI reprovaria um deploy saudavel. */
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return resp(401, { error: "Sessão inválida." });
  const uid = userData.user.id;
  const email = userData.user.email || undefined;

  const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  if (!STRIPE_KEY) {
    return resp(503, { error: "Pagamento ainda não está ligado.", motivo: "sem_chave" });
  }

  let body: { plano?: string; ciclo?: string; origem?: string };
  try { body = await req.json(); } catch { return resp(400, { error: "Body inválido." }); }

  const plano = String(body.plano || "");
  const ciclo = String(body.ciclo || "mes");
  if (!PLANOS.has(plano)) return resp(400, { error: "Plano desconhecido." });
  if (!CICLOS.has(ciclo)) return resp(400, { error: "Ciclo desconhecido." });

  const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2025-02-24.acacia" });

  try {
    /* O preco vem do metadata. `search` e' o caminho direto; se o indice ainda
       nao pegou o preco recem-criado (o Stripe leva ~1min para indexar), a
       listagem serve de rede — vale a chamada extra para nao vender errado. */
    let preco: Stripe.Price | undefined;
    const busca = await stripe.prices.search({
      query: `active:'true' AND metadata['plano']:'${plano}' AND metadata['ciclo']:'${ciclo}'`,
      limit: 1,
    });
    preco = busca.data[0];
    if (!preco) {
      const lista = await stripe.prices.list({ active: true, limit: 100 });
      preco = lista.data.find((p) =>
        p.metadata?.plano === plano && p.metadata?.ciclo === ciclo
      );
    }
    if (!preco) return resp(500, { error: "Preço deste plano não está publicado no Stripe." });

    /* UM CLIENTE POR CONTA, para sempre. Sem isto, cada compra abriria um
       cliente novo para a mesma pessoa: historico partido e o portal de gerir
       assinatura sem ter o que mostrar. */
    let customerId: string | undefined;
    const { data: lig } = await admin.schema("elifoot_v3")
      .from("stripe_customers").select("customer_id").eq("user_id", uid).maybeSingle();
    customerId = lig?.customer_id;
    if (!customerId) {
      const c = await stripe.customers.create({ email, metadata: { user_id: uid } });
      customerId = c.id;
      await admin.schema("elifoot_v3").from("stripe_customers")
        .upsert({ user_id: uid, customer_id: customerId }, { onConflict: "user_id" });
    }

    const volta = destino(body.origem);
    const sessao = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: preco.id, quantity: 1 }],
      client_reference_id: uid,
      locale: "pt-BR",
      allow_promotion_codes: true,
      /* O CARIMBO QUE O WEBHOOK LE'. Fica na ASSINATURA, nao so' na sessao: a
         sessao acontece uma vez, a assinatura volta todo mes na renovacao e em
         todo cancelamento. Sem isto, o webhook saberia de quem foi a primeira
         cobranca e nao saberia de quem foi a segunda. */
      subscription_data: { metadata: { user_id: uid, plano } },
      metadata: { user_id: uid, plano, ciclo },
      success_url: `${volta}/?assinatura=ok`,
      cancel_url: `${volta}/?assinatura=cancelada`,
    });

    if (!sessao.url) return resp(500, { error: "O Stripe não devolveu a página de pagamento." });
    return resp(200, { url: sessao.url });
  } catch (e) {
    console.error("criar-checkout:", e);
    const msg = (e as Error)?.message || "Falha ao abrir o pagamento.";
    return resp(500, { error: msg });
  }
});
