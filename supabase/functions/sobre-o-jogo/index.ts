/* ==================================================================
   sobre-o-jogo — assistente de IA da página "Sobre o jogo" do painel.
   O time de suporte pergunta como o jogo funciona (regras, motor,
   planos, Resenha, telas) e o Gemini responde a partir da base de
   conhecimento em docs/conhecimento/*.md, empacotada em
   conhecimento.ts por scripts/build-conhecimento.mjs.

   A BASE INTEIRA VAI EM TODA PERGUNTA, como instrução de sistema — não
   há busca/recorte. Cabe folgado na janela do modelo, e o prefixo é
   sempre idêntico, o que deixa o cache implícito do Gemini cobrar a
   maior parte da entrada a preço de cache.

   A chave do Gemini mora nos secrets do projeto (GEMINI_API_KEY) e
   NUNCA passa pelo browser. Só quem está ATIVO em admin_rf98.adm_users
   pergunta — qualquer papel, porque é leitura sobre o jogo.

   Body: { pergunta: string, historico?: [{ papel:'user'|'model', texto }] }
   Resposta: text/event-stream com eventos
     data: {"t":"trecho"}                       (vários)
     data: {"fim":true,"id":123,"custo_usd":0.01}
     data: {"erro":"mensagem"}
   ================================================================== */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CONHECIMENTO } from "./conhecimento.ts";

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

/* Modelo e preço. GEMINI_MODEL nos secrets troca o modelo sem deploy.
   Padrão: 3.5 Flash-Lite — a tarefa é achar a resposta num texto que o modelo
   recebe pronto, e o Lite faz isso por menos da metade do 3.8 Flash (medido em
   28/09: ~US$ 0,058/pergunta no 3.8 Flash, que ainda dobra de preço em 2027).
   US$ por 1M de tokens; modelo fora da tabela registra custo pelo padrão. */
const MODELO_PADRAO = "gemini-3.5-flash-lite";
const PRECOS_USD: Record<string, { entrada: number; cache: number; saida: number }> = {
  "gemini-3.5-flash-lite": { entrada: 0.30, cache: 0.03, saida: 2.50 },
  "gemini-3.1-flash-lite": { entrada: 0.25, cache: 0.025, saida: 1.50 },
  "gemini-3.8-flash":      { entrada: 0.75, cache: 0.075, saida: 3.75 },  // preço até 31/12/2026
};

const LIMITE_PERGUNTA = 4000;
const LIMITE_TURNOS = 20;          // últimas N mensagens do histórico
const LIMITE_TEXTO_TURNO = 12000;

const INSTRUCOES = `Você é o assistente interno do RetroFoot98 — um manager de futebol retrô para navegador, inspirado no Elifoot. Quem conversa com você é o TIME DE SUPORTE e os sócios do jogo, dentro do painel admin. Eles usam você para entender como o jogo funciona e responder aos jogadores.

REGRAS:
1. Responda SEMPRE em português do Brasil, direto ao ponto. Comece pela resposta; detalhe depois se precisar.
2. Baseie-se APENAS na BASE DE CONHECIMENTO abaixo. Ela foi escrita a partir do código do jogo e é a fonte da verdade. Não invente números, regras, preços, telas ou botões.
3. Se a base não cobre a pergunta, diga claramente "isso não está na minha base" e sugira escalar para um dev — nunca preencha a lacuna com suposição. Se a base marca algo como incerto, repasse a incerteza.
4. Os modos se chamam sempre "Modo Solo" e "Modo Resenha" — use esses nomes próprios.
5. Quando for um procedimento, use passos numerados com os nomes de telas e botões como o jogador vê.
6. Quando a pergunta for sobre um problema de um jogador, termine com um bloco curto "Sugestão de resposta ao jogador:" em tom amigável, sem jargão técnico, pronto para copiar.
7. As linhas "Referência técnica" da base servem para escalar a um dev: mencione-as só quando ajudar (ex.: "se precisar escalar, cite ...").
8. Use Markdown simples (negrito, listas, tabelas pequenas). Nada de código.

===== BASE DE CONHECIMENTO =====
${CONHECIMENTO}
===== FIM DA BASE =====`;

type Turno = { papel?: string; texto?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp(405, { error: "Método não suportado" });

  const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GEMINI-RETROFOOT");
  if (!GEMINI_KEY) {
    return resp(500, { error: "Secret GEMINI_API_KEY não configurado no projeto Supabase." });
  }
  const modelo = Deno.env.get("GEMINI_MODEL") || MODELO_PADRAO;
  const PRECO_USD = PRECOS_USD[modelo] ?? PRECOS_USD[MODELO_PADRAO];

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);

  // quem chama tem que ser admin ATIVO do painel (qualquer papel)
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return resp(401, { error: "Sessão inválida." });
  const { data: adm } = await admin
    .schema("admin_rf98").from("adm_users")
    .select("papel, estado").eq("user_id", userData.user.id).maybeSingle();
  if (!adm || adm.estado !== "ativo") {
    return resp(403, { error: "Só a equipe do painel pode usar o assistente." });
  }

  let body: { pergunta?: string; historico?: Turno[] };
  try { body = await req.json(); } catch { return resp(400, { error: "Body inválido." }); }
  const pergunta = String(body.pergunta || "").trim();
  if (!pergunta) return resp(400, { error: "Pergunta vazia." });
  if (pergunta.length > LIMITE_PERGUNTA) return resp(400, { error: "Pergunta longa demais." });

  const historico = (Array.isArray(body.historico) ? body.historico : [])
    .filter((t) => (t.papel === "user" || t.papel === "model") && String(t.texto || "").trim())
    .slice(-LIMITE_TURNOS)
    .map((t) => ({ role: t.papel as string, parts: [{ text: String(t.texto).slice(0, LIMITE_TEXTO_TURNO) }] }));
  // o Gemini exige que a conversa comece pelo usuário
  while (historico.length && historico[0].role !== "user") historico.shift();

  const gemini = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCOES }] },
        contents: [...historico, { role: "user", parts: [{ text: pergunta }] }],
        generationConfig: { thinkingConfig: { thinkingLevel: "low" }, maxOutputTokens: 8192 },
      }),
    },
  );
  if (!gemini.ok || !gemini.body) {
    const txt = await gemini.text().catch(() => "");
    console.error("gemini", gemini.status, txt.slice(0, 500));
    let msg = `Gemini respondeu ${gemini.status}.`;
    try { msg += " " + (JSON.parse(txt)?.error?.message || ""); } catch { /* corpo não-JSON */ }
    return resp(502, { error: msg.trim() });
  }

  /* Repassa o SSE do Gemini já filtrado (só texto, sem "pensamentos") e, ao
     fim, grava pergunta+resposta+custo. Quem fecha a aba no meio não impede
     o registro: o stream do Gemini é lido até o fim de qualquer jeito. */
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      let aberto = true;
      const manda = (o: unknown) => {
        if (!aberto) return;
        try { ctrl.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`)); } catch { aberto = false; }
      };
      let resposta = "", uso: any = null, buf = "", motivo = "";
      try {
        const leitor = gemini.body!.pipeThrough(new TextDecoderStream()).getReader();
        for (;;) {
          const { value, done } = await leitor.read();
          if (done) break;
          buf += value;
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const linha = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!linha.startsWith("data:")) continue;
            let ev: any; try { ev = JSON.parse(linha.slice(5)); } catch { continue; }
            if (ev.usageMetadata) uso = ev.usageMetadata;
            const cand = ev.candidates?.[0];
            if (cand?.finishReason) motivo = cand.finishReason;
            for (const p of cand?.content?.parts || []) {
              if (p.thought || typeof p.text !== "string" || !p.text) continue;
              resposta += p.text; manda({ t: p.text });
            }
          }
        }
        if (!resposta) {
          manda({ erro: motivo ? `O modelo não respondeu (${motivo}).` : "O modelo não respondeu." });
        }
      } catch (e) {
        console.error("stream", e);
        manda({ erro: "A conexão com o Gemini caiu no meio da resposta." });
      }

      const tIn = Number(uso?.promptTokenCount || 0);
      const tCache = Number(uso?.cachedContentTokenCount || 0);
      const tOut = Number(uso?.candidatesTokenCount || 0) + Number(uso?.thoughtsTokenCount || 0);
      const custo = ((tIn - tCache) * PRECO_USD.entrada + tCache * PRECO_USD.cache + tOut * PRECO_USD.saida) / 1e6;
      let id: number | null = null;
      try {
        const { data } = await admin.schema("admin_rf98").from("sobre_perguntas").insert({
          user_id: userData.user.id, pergunta, resposta: resposta || null, modelo,
          tokens_in: tIn, tokens_out: tOut, tokens_cache: tCache, custo_usd: custo,
        }).select("id").single();
        id = data?.id ?? null;
      } catch (e) { console.error("registro", e); }
      if (resposta) manda({ fim: true, id, custo_usd: custo });
      if (aberto) { try { ctrl.close(); } catch { /* cliente já saiu */ } }
    },
  });

  return new Response(stream, {
    headers: { ...CORS, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" },
  });
});
