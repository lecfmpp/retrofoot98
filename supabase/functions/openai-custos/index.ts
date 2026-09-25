/* ==================================================================
   openai-custos — a FATURA da OpenAI puxada por API, sem CSV.

   POR QUE EXISTE. A conciliação do painel dependia de alguém entrar em
   platform.openai.com → Usage → Export, baixar o CSV e largá-lo na página de
   Finanças. Enquanto ninguém fazia isso, o mês fechado ficava lançado pela
   ESTIMATIVA (`elifoot_v3.ia_custos`), que subestima — em agosto de 2026, US$
   239,35 contra US$ 260,83 de fatura. Um fecho de mês não pode depender de um
   ritual manual que ninguém lembra de cumprir.

   O QUE ELA DEVOLVE. O endpoint de ORGANIZAÇÃO da OpenAI
   (`/v1/organization/costs`) devolve o custo já em DÓLARES, por dia, tal como
   ele vai ser cobrado — não tokens, como o CSV, que o painel tinha de
   multiplicar pela tabela de preços. É a fatura, e não uma segunda conta dela.

   A CHAVE: A DO ESTÚDIO PRIMEIRO. Tenta-se `OPENAI-RETROFOOT`, a mesma que gera
   as imagens — não faz sentido pedir uma chave nova antes de saber se a que já
   existe serve. `/v1/organization/*` é endpoint de ORGANIZAÇÃO, e a OpenAI
   documenta que ele quer uma ADMIN KEY (`sk-admin-…`); uma chave de projeto
   costuma levar 401 ali. Se isso acontecer, a resposta diz exatamente isso, e
   basta guardar uma Admin key no secret `OPENAI-ADMIN` — que tem prioridade
   quando existe. Nenhuma das duas passa pelo browser: é por isso que esta função
   existe em vez de o painel falar com a OpenAI direto (que, além da chave,
   esbarra no CORS).

   SÓ SÓCIO E FINANCEIRO. Gasto do projeto é dado de sócio; é a mesma trava da
   generate-image, com os papéis que mexem em Finanças.

   Body (tudo opcional): { desde?: 'AAAA-MM' }  — o padrão são 6 meses atrás.
   Resposta: { meses: { 'AAAA-MM': { usd, de, ate, dias } }, buscado_em }
   ================================================================== */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

/* Antes disto não há gasto nenhum: a contagem de IA começou em 25/08/2026, e
   pedir mais atrás só rende páginas de zeros (a API entrega 31 dias por página). */
const INICIO = Date.UTC(2026, 7, 1) / 1000;

const dia = (seg: number) => new Date(seg * 1000).toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp(405, { error: "Método não suportado" });

  /* o mesmo jogo de nomes do secret da generate-image: o dashboard às vezes
     normaliza o hífen, então os dois nomes valem. A Admin key ganha quando
     existe; sem ela, vale a chave do Estúdio, que é a que já está configurada. */
  const CHAVE_ADMIN = Deno.env.get("OPENAI-ADMIN") ?? Deno.env.get("OPENAI_ADMIN");
  const CHAVE_ESTUDIO = Deno.env.get("OPENAI-RETROFOOT")
    ?? Deno.env.get("OPENAI_RETROFOOT")
    ?? Deno.env.get("OPENAI_API_KEY");
  const CHAVE = CHAVE_ADMIN ?? CHAVE_ESTUDIO;
  const daOrganizacao = !!CHAVE_ADMIN;
  if (!CHAVE) {
    return resp(500, { error: "Nenhuma chave da OpenAI configurada no projeto Supabase." });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return resp(401, { error: "Sessão inválida." });

  const { data: adm } = await admin
    .schema("admin_rf98").from("adm_users")
    .select("papel").eq("user_id", userData.user.id).maybeSingle();
  if (!adm || !["socio", "financeiro"].includes(adm.papel)) {
    return resp(403, { error: "Só sócios e financeiro veem a fatura da OpenAI." });
  }

  let body: { desde?: string } = {};
  try { body = await req.json(); } catch { /* body vazio é válido */ }

  let inicio = INICIO;
  const m = /^(\d{4})-(\d{2})$/.exec(String(body.desde || ""));
  if (m) inicio = Math.max(INICIO, Date.UTC(Number(m[1]), Number(m[2]) - 1, 1) / 1000);
  else {
    const h = new Date();
    inicio = Math.max(INICIO, Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - 5, 1) / 1000);
  }

  /* ===== PAGINAR NÃO É OPCIONAL =====
     Com `bucket_width=1d` a OpenAI entrega no máximo 31 baldes por página. Sem
     seguir o `next_page`, meio ano de fatura voltaria como um mês — e o painel
     fecharia os outros cinco com a estimativa, achando que tinha fatura. */
  const meses: Record<string, { usd: number; de: string; ate: string; dias: number }> = {};
  let pagina: string | null = null, voltas = 0;
  try {
    do {
      const q = new URLSearchParams({ start_time: String(inicio), bucket_width: "1d", limit: "31" });
      if (pagina) q.set("page", pagina);
      const r = await fetch(`https://api.openai.com/v1/organization/costs?${q}`, {
        headers: { Authorization: `Bearer ${CHAVE}` },
      });
      if (!r.ok) {
        const t = await r.text();
        console.error("openai-custos:", r.status, t.slice(0, 400));
        if (r.status === 401 || r.status === 403) {
          /* o caso comum, e a mensagem tem de dizer O QUE FAZER: a chave do
             Estúdio é de projeto, e o endpoint de custos é de organização */
          return resp(502, {
            error: daOrganizacao
              ? "A OpenAI recusou a Admin key guardada em OPENAI-ADMIN — confira se ela ainda é válida."
              : "A OpenAI recusou a chave do Estúdio: /v1/organization/costs é endpoint de organização e " +
                "só aceita uma Admin key. Crie uma em platform.openai.com → Settings → Organization → " +
                "Admin keys e guarde-a nos secrets do projeto Supabase como OPENAI-ADMIN — a partir daí " +
                "a fatura passa a vir sozinha.",
          });
        }
        return resp(502, { error: `A OpenAI respondeu ${r.status}.` });
      }
      const p = await r.json();
      for (const balde of (p.data || [])) {
        const d = dia(Number(balde.start_time) || 0);
        const mes = d.slice(0, 7);
        /* o dia entra mesmo custando zero: é ele que diz até onde a fatura
           cobre, e é essa cobertura que decide se o mês pode ser fechado */
        const acc = meses[mes] || (meses[mes] = { usd: 0, de: d, ate: d, dias: 0 });
        for (const res of (balde.results || [])) acc.usd += Number(res?.amount?.value) || 0;
        if (d < acc.de) acc.de = d;
        if (d > acc.ate) acc.ate = d;
        acc.dias++;
      }
      pagina = p.has_more ? (p.next_page || null) : null;
    } while (pagina && ++voltas < 40);
  } catch (e) {
    console.error("openai-custos:", e);
    return resp(502, { error: "Não deu para falar com a OpenAI: " + ((e as Error)?.message || "erro de rede") });
  }

  /* o arredondamento é o mesmo de ia_custos_mes(): seis casas, para a diferença
     entre estimativa e fatura não nascer de ruído de ponto flutuante */
  for (const v of Object.values(meses)) v.usd = Math.round(v.usd * 1e6) / 1e6;

  return resp(200, { meses, buscado_em: new Date().toISOString() });
});
