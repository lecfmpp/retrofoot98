/* ==================================================================
   portal-assinatura — abre o portal do Stripe para o jogador gerir o Pro.

   A pagina de planos promete "cancele quando quiser em Minha Conta"; ate' 25/09
   nada no jogo cumpria isso e cancelar era pedir a' equipe. O portal e' do
   proprio Stripe: cancelar (no fim do periodo pago), trocar mensal/anual, trocar
   cartao e ver as faturas. A configuracao dele vive no Stripe
   (bpc_1UJbngG6vHgCiPOGoCFyPKtp, a padrao da conta) — mudar o que o portal
   oferece e' la', sem publicar nada aqui.

   Quem grava o plano continua a ser SO' o stripe-webhook: cancelar no portal
   gera `customer.subscription.updated` (cancel_at_period_end) e, no fim do
   periodo, `customer.subscription.deleted`, que ja' devolvem a conta ao gratis.

   Body: { origem?: url }   Resposta: { url } ou { error, motivo? }
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

const SITE_PADRAO = "https://retrofoot.com.br";
/* mesma lista do criar-checkout: so' o proprio site pode ser o destino de volta */
const DESTINOS_OK = [
  "https://retrofoot.com.br",
  "https://retrofoot98.com.br",
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

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  /* sessao ANTES da chave, como no criar-checkout: o 401 e' o que o teste de fumaca do deploy usa */
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return resp(401, { error: "Sessão inválida." });
  const uid = userData.user.id;

  const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  if (!STRIPE_KEY) return resp(503, { error: "Pagamento ainda não está ligado.", motivo: "sem_chave" });

  let body: { origem?: string } = {};
  try { body = await req.json(); } catch { /* corpo vazio vale */ }

  /* o cliente do Stripe nasce no primeiro checkout (criar-checkout). Sem ele, nunca houve compra. */
  const { data: lig } = await admin.schema("elifoot_v3")
    .from("stripe_customers").select("customer_id").eq("user_id", uid).maybeSingle();
  if (!lig?.customer_id) {
    return resp(404, { error: "Você ainda não tem assinatura.", motivo: "sem_assinatura" });
  }

  try {
    const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2025-02-24.acacia" });
    const sessao = await stripe.billingPortal.sessions.create({
      customer: lig.customer_id,
      return_url: `${destino(body.origem)}/`,
      locale: "pt-BR",
    });
    return resp(200, { url: sessao.url });
  } catch (e) {
    console.error("portal-assinatura:", e);
    return resp(500, { error: (e as Error)?.message || "Falha ao abrir o portal." });
  }
});
