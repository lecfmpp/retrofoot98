/* ==================================================================
   generate-image — gerador de imagens do Estúdio do painel dos sócios.
   Gera escudos fictícios e fotos realistas de jogadores via OpenAI
   (gpt-image-1) e grava o resultado direto no Storage, devolvendo a
   URL pública. A chave da OpenAI mora nos secrets do projeto
   (OPENAI_API_KEY) e NUNCA passa pelo browser.

   SÓ ADMIN GERA: além do JWT válido (verify_jwt do gateway), a função
   confere que o usuário está em admin_rf98.adm_users com papel que
   pode editar dados do jogo (socio ou produto). Cada imagem custa
   dinheiro — anon e jogador comum não alcançam a OpenAI por aqui.

   Body: { tipo: 'escudo' | 'jogador', prompt: string, qualidade?: 'low'|'medium'|'high' }
   Resposta: { url, caminho } ou { error }
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
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// tipo -> onde a imagem cai e como ela é pedida à OpenAI.
// TUDO sai em WebP comprimido (o formato leve que o jogo já usa nos criativos);
// o escudo mantém o fundo transparente — WebP suporta alfa.
// torso e montagem saem em RETRATO 2:3 (1024x1536) — o formato do cartão do
// jogador no site do jogo; o resto continua quadrado.
const TIPOS: Record<string, { bucket: string; background: "transparent" | "opaque"; size: string }> = {
  escudo:  { bucket: "escudos",   background: "transparent", size: "1024x1024" },
  jogador: { bucket: "jogadores", background: "opaque",      size: "1024x1024" }, // retrato inteiro (legado)
  rosto:   { bucket: "jogadores", background: "transparent", size: "1024x1024" }, // só cabeça+pescoço, recortado
  torso:   { bucket: "jogadores", background: "opaque",      size: "1024x1536" }, // a camisa do clube — base única
};
const FORMATO = "webp", CONTENT_TYPE = "image/webp", COMPRESSAO = 80; // 0-100, 80 é leve sem serrilhar

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp(405, { error: "Método não suportado" });

  // o secret foi salvo no projeto com o nome OPENAI-RETROFOOT; os outros nomes
  // são fallback caso o dashboard normalize o hífen para underscore
  const OPENAI_KEY = Deno.env.get("OPENAI-RETROFOOT")
    ?? Deno.env.get("OPENAI_RETROFOOT")
    ?? Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_KEY) {
    return resp(500, { error: "Secret OPENAI-RETROFOOT não configurado no projeto Supabase." });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);

  // quem chama tem que ser sócio/produto no painel — papel que edita dados do jogo
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return resp(401, { error: "Sessão inválida." });

  const { data: adm } = await admin
    .schema("admin_rf98").from("adm_users")
    .select("papel").eq("user_id", userData.user.id).maybeSingle();
  if (!adm || !["socio", "produto"].includes(adm.papel)) {
    return resp(403, { error: "Só sócios do painel podem gerar imagens." });
  }

  let body: { tipo?: string; prompt?: string; qualidade?: string; imagens?: string[]; nome?: string };
  try { body = await req.json(); } catch { return resp(400, { error: "Body inválido." }); }

  const tipo = String(body.tipo || "");
  const cfg = tipo === "montagem"
    ? { bucket: "jogadores", background: "opaque" as const, size: "1024x1536" }
    : TIPOS[tipo];
  const prompt = String(body.prompt || "").trim();
  if (!cfg) return resp(400, { error: "tipo tem que ser escudo, jogador, rosto, torso ou montagem." });
  if (!prompt || prompt.length > 4000) return resp(400, { error: "prompt vazio ou longo demais." });
  const qualidade = ["low", "medium", "high"].includes(String(body.qualidade)) ? String(body.qualidade) : "medium";

  // IMAGENS DE ENTRADA/REFERÊNCIA (montagem exige; os outros tipos aceitam como
  // referência opcional). Só do NOSSO Storage — nada de buscar URL arbitrária
  // com a chave do projeto (SSRF).
  const urls = Array.isArray(body.imagens) ? body.imagens.map(String).filter(Boolean) : [];
  const prefixo = `${url}/storage/v1/object/public/`;
  if (urls.length > 3 || urls.some((u) => !u.startsWith(prefixo))) {
    return resp(400, { error: "no máximo 3 imagens, todas do Storage do projeto." });
  }
  if (tipo === "montagem" && urls.length < 1) {
    return resp(400, { error: "montagem exige de 1 a 3 imagens do Storage do projeto." });
  }

  let oa: Response;
  if (urls.length) {
    // com imagens de entrada, a geração vira EDIÇÃO (images/edits)
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", prompt);
    form.append("n", "1");
    form.append("size", cfg.size);
    form.append("quality", qualidade);
    form.append("output_format", FORMATO);
    form.append("output_compression", String(COMPRESSAO));
    if (cfg.background === "transparent") form.append("background", "transparent");
    for (let i = 0; i < urls.length; i++) {
      const r = await fetch(urls[i]);
      if (!r.ok) return resp(400, { error: `Não consegui baixar a imagem ${i + 1} (${r.status}).` });
      const blob = await r.blob();
      form.append("image[]", new File([blob], `entrada-${i}.webp`, { type: blob.type || "image/webp" }));
    }
    oa = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_KEY}` },
      body: form,
    });
  } else {
    // OpenAI Images — gpt-image-1 devolve base64
    oa = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: cfg.size,
        quality: qualidade,
        background: cfg.background,
        output_format: FORMATO,
        output_compression: COMPRESSAO,
      }),
    });
  }
  if (!oa.ok) {
    const detalhe = await oa.text().catch(() => "");
    console.error("OpenAI falhou:", oa.status, detalhe.slice(0, 500));
    let msg = `OpenAI respondeu ${oa.status}.`;
    try { msg = JSON.parse(detalhe)?.error?.message || msg; } catch { /* texto cru */ }
    return resp(502, { error: msg });
  }
  const out = await oa.json();
  const b64 = out?.data?.[0]?.b64_json;
  if (!b64) return resp(502, { error: "OpenAI não devolveu imagem." });

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  // nome organizado vindo do painel (pais/divisao/clube/...), saneado — só
  // minúsculas, números, hífen, underscore e barras, sem subir de nível
  const nomeSeguro = String(body.nome || "")
    .toLowerCase().replace(/[^a-z0-9/_-]/g, "").replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "").slice(0, 180);
  const caminho = `${nomeSeguro || "ia"}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}.${FORMATO}`;
  const up = await admin.storage.from(cfg.bucket).upload(caminho, bytes, {
    contentType: CONTENT_TYPE,
    cacheControl: "31536000",
    upsert: false,
  });
  if (up.error) {
    console.error("Upload falhou:", up.error.message);
    return resp(500, { error: "Imagem gerada, mas o upload falhou: " + up.error.message });
  }

  // custo REGISTRADO a cada geração — alimenta os cards de Finanças do painel.
  // Tabela oficial de preço do gpt-image-1 por tamanho×qualidade (USD/imagem).
  const PRECOS: Record<string, Record<string, number>> = {
    "1024x1024": { low: 0.011, medium: 0.042, high: 0.167 },
    "1024x1536": { low: 0.016, medium: 0.063, high: 0.25 },
  };
  const custo = PRECOS[cfg.size]?.[qualidade] ?? 0.042;
  const { error: logErr } = await admin.schema("elifoot_v3").from("ia_custos").insert({
    tipo, qualidade, tamanho: cfg.size, custo_usd: custo, quem: userData.user.id,
  });
  if (logErr) console.error("registro de custo falhou:", logErr.message);

  const publica = admin.storage.from(cfg.bucket).getPublicUrl(caminho).data.publicUrl;
  return resp(200, { url: publica, caminho });
});
