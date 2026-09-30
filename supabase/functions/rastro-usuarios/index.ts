/* ==================================================================
   rastro-usuarios — quais contas têm sessão gravada no Visiflow/Rastro.

   POR QUE EXISTE. O painel quer mostrar um ▶ só em quem tem gravação. A API de leitura do
   Visiflow (`rastro-read/users`) exige uma chave que NÃO pode ir para o navegador; então o painel
   pergunta aqui, e esta função (no servidor) pergunta lá. A chave mora no secret
   `VISIFLOW_READ_KEY` (só lê o site do RetroFoot).

   SÓ QUEM É DO PAINEL. Qualquer papel de admin_rf98.adm_users (a lista de Usuários já é vista
   por todos eles).

   Body: { user_ids: string[] }  (até 2000; a função fatia em lotes de 200)
   Resposta: { usuarios: { [user_id]: { sessions, sessions_with_video, first_session_at,
     last_session_at, total_duration_s, latest_session_id, latest_recorded_session_id,
     panel_url, latest_replay_url } } }   — quem não tem sessão simplesmente não aparece.
   ================================================================== */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const resp = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const READ = "https://ccbwtzqrumuiyubvtvas.supabase.co/functions/v1/rastro-read/users";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp(405, { error: "Método não suportado" });

  const CHAVE = Deno.env.get("VISIFLOW_READ_KEY");
  if (!CHAVE) return resp(500, { error: "Secret VISIFLOW_READ_KEY não configurado no projeto Supabase." });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return resp(401, { error: "Sessão inválida." });
  const { data: adm } = await admin.schema("admin_rf98").from("adm_users")
    .select("papel").eq("user_id", userData.user.id).maybeSingle();
  if (!adm) return resp(403, { error: "Só quem é do painel vê as gravações." });

  let body: { user_ids?: unknown } = {};
  try { body = await req.json(); } catch { /* vazio */ }
  const ids = Array.isArray(body.user_ids)
    ? [...new Set(body.user_ids.map(String).filter((x) => UUID.test(x)))].slice(0, 2000) : [];
  if (!ids.length) return resp(200, { usuarios: {} });

  const lotes: string[][] = [];
  for (let i = 0; i < ids.length; i += 200) lotes.push(ids.slice(i, i + 200));

  const usuarios: Record<string, unknown> = {};
  /* em ondas de 5 para ficar longe do limite de 120 chamadas/min */
  for (let i = 0; i < lotes.length; i += 5) {
    const ondas = await Promise.all(lotes.slice(i, i + 5).map(async (lote) => {
      const r = await fetch(`${READ}?user_ids=${lote.join(",")}`, { headers: { Authorization: `Bearer ${CHAVE}` } });
      if (!r.ok) throw new Error(`Visiflow ${r.status}`);
      return r.json();
    })).catch((e) => e as Error);
    if (ondas instanceof Error) return resp(502, { error: ondas.message });
    for (const j of ondas) {
      /* o formato exato da lista não foi confirmado: aceita {users:{id:{…}}}, {users:[{user_id,…}]} ou um mapa direto */
      const u = j?.users ?? j;
      if (Array.isArray(u)) u.forEach((x) => { if (x?.user_id) usuarios[x.user_id] = x; });
      else if (u && typeof u === "object") Object.entries(u).forEach(([k, v]) => { if (UUID.test(k)) usuarios[k] = v; });
    }
  }
  return resp(200, { usuarios });
});
