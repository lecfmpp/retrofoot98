/* ==================================================================
   player-avatar — o retrato do JOGADOR do Embaixador.

   Terceira irma da familia: generate-image e' do painel (prompt cru, so' socio
   alcanca), coach-avatar e' o retrato do TREINADOR, e esta e' o retrato do
   JOGADOR que o Embaixador poe na base oficial.

   POR QUE NAO REAPROVEITAR A coach-avatar: os moldes sao outros. O treinador e'
   cabeca e peito em fundo transparente, de terno ou agasalho, quadrado — o
   molde do card de perfil. O jogador e' RETRATO 2:3 no gabarito de
   enquadramento do jogo (ENQ, o mesmo do Estudio do painel), de camisa do
   clube nas cores do clube, porque ele vai ficar lado a lado com os outros
   jogadores do elenco na tela de Escalacao. Gerar o jogador com o prompt do
   treinador dava exactamente o que se viu: um tecnico de terno na ficha de um
   atacante.

   A FOTO DE REFERENCIA E' OBRIGATORIA aqui, ao contrario do treinador. Nao e'
   capricho: o produto vendido e' "o SEU jogador na base", e sem referencia o
   resultado e' um desconhecido qualquer — que a pessoa nao ia reconhecer como
   dela. Continua a ser INSPIRACAO, nunca copia (ver o prompt).

   Tres travas, todas no servidor:
   · so' Embaixador gera (plano_limites.avatar_ia, conferido aqui);
   · cota por conta, incrementada ANTES da OpenAI (player_avatar_consumir);
   · a referencia so' pode ser da PROPRIA pasta, e e' APAGADA no finally.

   Body: { modalidade:'mas'|'fem', posicao:'GK'|'DEF'|'MID'|'ATT',
           corA?:'#RRGGBB', corB?:'#RRGGBB', idade?:16..42, referencia: path }
   Resposta: { url, geracoes } ou { error }
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

const BUCKET_SAIDA = "jogadores";
const BUCKET_REF   = "referencias-treinador";   // o mesmo bucket privado do treinador: mesma
                                                // politica de pasta por uid, mesma limpeza
const TAMANHO = "1024x1536", FORMATO = "webp", CONTENT_TYPE = "image/webp", COMPRESSAO = 80;
const QUALIDADE = "medium", CUSTO_USD = 0.063;  // tabela do gpt-image-1: 1024x1536 medium
const TETO_GERACOES = 6;
const REF_MAX_BYTES = 8 * 1024 * 1024;

const POSICOES: Record<string, string> = {
  GK:  "goalkeeper",
  DEF: "centre-back defender",
  MID: "midfielder",
  ATT: "striker",
};

/* ===== GABARITO DE ENQUADRAMENTO =====
   Os mesmos numeros do Estudio do painel (ENQ, em admin.js). Todo jogador do
   jogo e' fotografado no MESMO quadro — e' o que faz o retrato do Embaixador
   sentar-se ao lado dos outros na Escalacao sem parecer colado de outro jogo.
   Mexer aqui sem mexer la' desalinha as duas familias de foto. */
const ENQ = {
  topoCabeca: 0.06, altCabeca: 0.26, linhaGola: 0.40, linhaPeito: 0.62,
  largCabeca: 0.27, largOmbros: 0.66, folgaBraco: 0.08,
};
const pc = (f: number) => Math.round(f * 100) + "%";
function textoEnquadramento() {
  return [
    "FIXED FRAMING SPEC — this exact geometry is mandatory, because every player in the game is",
    "photographed in the same frame: PORTRAIT 2:3 frame.",
    `Top of the head at exactly ${pc(ENQ.topoCabeca)} from the top edge.`,
    `Head from crown to chin exactly ${pc(ENQ.altCabeca)} of the frame height and ${pc(ENQ.largCabeca)} of the frame width.`,
    `Base of the neck / jersey collar line at exactly ${pc(ENQ.linhaGola)} from the top.`,
    `Chest line at ${pc(ENQ.linhaPeito)} from the top.`,
    `Shoulder-to-shoulder width exactly ${pc(ENQ.largOmbros)} of the frame width, centered horizontally.`,
    `The arms NEVER touch the left or right edge: keep at least ${pc(ENQ.folgaBraco)} of empty studio background on each side.`,
    "Identical crop and zoom for every player — do not zoom in or out to fit a taller or shorter player.",
  ].join(" ");
}

/* ===== A CAMISA SAI LIMPA =====
   Mesma razao do treinador: gpt-image-1 nao reproduz marca nem texto, ele
   INVENTA um brasao ilegivel e um patrocinador que nao existe. A camisa nasce
   nas cores do clube e vazia; o escudo e o numero entram por cima, como camada
   do proprio jogo (rfFotoNumHTML). */
const CAMISA_LIMPA = "The jersey is COMPLETELY CLEAN: no crest, no badge, no sponsor, no brand mark, "
  + "no text, no numbers and no logos anywhere — not on the chest, not on the sleeves, not on the "
  + "collar. Plain fabric only, because the crest and the shirt number are overlaid later.";

/* ===== NINGUEM REAL, MESMO COM A FOTO NA MAO =====
   A referencia e' de uma pessoa de verdade, e o resultado vai para a base de
   TODOS os jogadores. Pedir "a mesma cara" faz o gpt-image-1 recusar a chamada
   inteira, e sera' direito de imagem de terceiros no dia em que alguem mandar
   a foto de outra pessoa. O contrato e' inspiracao: mesma familia de traco,
   pessoa nova. */
const INSPIRACAO = "Use the general facial structure, skin tone, hair and build of the input photo as "
  + "LOOSE INSPIRATION ONLY. The result must be a NEW, clearly fictional person — do not reproduce "
  + "the likeness of the person in the photo, and do not resemble any real footballer or public figure.";

/* cor em hexadecimal vira PALAVRA. O modelo entende "royal blue", nao "#17458F" — e mandar o
   hexadecimal cru costuma sair como uma cor vizinha aleatoria de imagem para imagem. */
const CORES: [number, number, number, string][] = [
  [255, 255, 255, "white"], [0, 0, 0, "black"], [128, 128, 128, "grey"],
  [200, 30, 30, "red"], [130, 20, 30, "dark crimson red"], [255, 120, 0, "orange"],
  [245, 200, 20, "golden yellow"], [30, 120, 60, "green"], [10, 70, 40, "dark bottle green"],
  [30, 70, 160, "royal blue"], [15, 35, 90, "navy blue"], [60, 160, 220, "sky blue"],
  [90, 30, 130, "purple"], [120, 70, 30, "brown"], [230, 130, 170, "pink"],
];
function nomeDaCor(hex: string | undefined, padrao: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return padrao;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  let melhor = padrao, dist = Infinity;
  for (const [cr, cg, cb, nome] of CORES) {
    const d = (cr - r) ** 2 + (cg - g) ** 2 + (cb - b) ** 2;
    if (d < dist) { dist = d; melhor = nome; }
  }
  return melhor;
}

function faixaEtaria(idade: number): string {
  if (idade < 21) return "a very young player, late teens";
  if (idade < 26) return "in their early twenties";
  if (idade < 31) return "in their late twenties";
  return "in their thirties, visibly experienced";
}

function montarPrompt(o: {
  fem: boolean; posicao: string; corA: string; corB: string; idade: number;
}) {
  const quem = o.fem
    ? "female professional football player (a woman)"
    : "male professional football player";
  /* O GOLEIRO NAO VESTE A CAMISA DO CLUBE — no jogo tambem nao. Sair de verde
     fluorescente ao lado dos outros e' o que a Escalacao mostra, e e' o que
     torna a ficha dele reconhecivel de relance. */
  const camisa = o.posicao === "GK"
    ? "a plain goalkeeper jersey in fluorescent lime green with long sleeves"
    : `a plain football jersey in ${o.corA} with the collar and both sleeve cuffs in ${o.corB}`;
  return [
    `Hyper-realistic studio photograph of a fictional ${quem}, a ${POSICOES[o.posicao]}, ${faixaEtaria(o.idade)}, wearing ${camisa}.`,
    "Facing the camera directly, official club media day photo style, confident and composed expression,",
    "soft professional studio lighting, sharp focus, DSLR photo quality.",
    CAMISA_LIMPA,
    textoEnquadramento(),
    "Plain, evenly lit neutral studio backdrop behind the player — no crowd, no pitch, no stadium.",
    INSPIRACAO,
  ].join(" ");
}

/* custo real por token — a mesma conta das outras duas funcoes */
const TOK_USD = { texto_in: 5.0, imagem_in: 10.0, imagem_out: 40.0 };
function custoDoUsage(usage: any) {
  const det = usage?.input_tokens_details || {};
  const tIn = Number(det.text_tokens ?? usage?.input_tokens ?? 0);
  const iIn = Number(det.image_tokens ?? 0);
  const out = Number(usage?.output_tokens ?? 0);
  if (!out && !tIn && !iIn) return null;
  return {
    tokens_in_texto: tIn, tokens_in_imagem: iIn, tokens_out: out,
    custo_usd: (tIn * TOK_USD.texto_in + iIn * TOK_USD.imagem_in + out * TOK_USD.imagem_out) / 1e6,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp(405, { error: "Método não suportado" });

  const OPENAI_KEY = Deno.env.get("OPENAI-RETROFOOT")
    ?? Deno.env.get("OPENAI_RETROFOOT")
    ?? Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_KEY) return resp(500, { error: "Secret OPENAI-RETROFOOT não configurado no projeto Supabase." });

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return resp(401, { error: "Sessão inválida." });
  const uid = userData.user.id;

  let body: {
    modalidade?: string; posicao?: string; corA?: string; corB?: string;
    idade?: number; referencia?: string;
  };
  try { body = await req.json(); } catch { return resp(400, { error: "Body inválido." }); }

  const fem = String(body.modalidade || "mas") === "fem";
  const posicao = String(body.posicao || "").toUpperCase();
  if (!POSICOES[posicao]) return resp(400, { error: "posicao tem que ser GK, DEF, MID ou ATT." });
  const idadeBruta = Number(body.idade);
  const idade = Number.isFinite(idadeBruta) ? Math.min(42, Math.max(16, Math.round(idadeBruta))) : 25;
  const corA = nomeDaCor(body.corA, "royal blue");
  const corB = nomeDaCor(body.corB, "white");

  /* PORTA DO EMBAIXADOR, no servidor — a mesma pergunta que a vaga_pedir faz.
     Esconder o botao no cliente e' desenho, nao controle de acesso. */
  const { data: limites } = await admin.schema("elifoot_v3").rpc("plano_limites", { p_user: uid });
  const lim = Array.isArray(limites) ? limites[0] : limites;
  if (!lim?.avatar_ia) {
    return resp(403, { error: "O jogador na base oficial é do plano Embaixador.", motivo: "plano" });
  }

  const refPath = String(body.referencia || "");
  if (!refPath) return resp(400, { error: "Mande a sua foto primeiro — é dela que sai o jogador.", motivo: "sem_foto" });
  if (!refPath.startsWith(uid + "/")) return resp(403, { error: "Referência fora da sua pasta." });

  /* COTA ANTES DA OPENAI: cobra primeiro, gera depois. */
  const { data: usadas, error: cotaErr } = await admin
    .schema("elifoot_v3").rpc("player_avatar_consumir", { p_user: uid, p_teto: TETO_GERACOES });
  if (cotaErr) {
    console.error("cota falhou:", cotaErr.message);
    return resp(500, { error: "Não consegui conferir a sua cota." });
  }
  if (usadas == null) {
    return resp(429, { error: `Você já usou as ${TETO_GERACOES} gerações desta conta.`, motivo: "cota" });
  }

  try {
    const baixada = await admin.storage.from(BUCKET_REF).download(refPath);
    if (baixada.error || !baixada.data) {
      return resp(400, { error: "Não encontrei a foto que você enviou. Mande de novo." });
    }
    const blob = baixada.data;
    if (blob.size > REF_MAX_BYTES) return resp(400, { error: "A foto é grande demais (máx. 8 MB)." });

    const prompt = montarPrompt({ fem, posicao, corA, corB, idade });
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", prompt);
    form.append("n", "1");
    form.append("size", TAMANHO);
    form.append("quality", QUALIDADE);
    form.append("output_format", FORMATO);
    form.append("output_compression", String(COMPRESSAO));
    form.append("image[]", new File([blob], "referencia", { type: blob.type || "image/webp" }));
    const oa = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST", headers: { "Authorization": `Bearer ${OPENAI_KEY}` }, body: form,
    });
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
    const caminho = `embaixadores/${uid}/${Date.now()}-${crypto.randomUUID().slice(0, 6)}.${FORMATO}`;
    const up = await admin.storage.from(BUCKET_SAIDA).upload(caminho, bytes, {
      contentType: CONTENT_TYPE, cacheControl: "31536000", upsert: false,
    });
    if (up.error) {
      console.error("Upload falhou:", up.error.message);
      return resp(500, { error: "Retrato gerado, mas o upload falhou: " + up.error.message });
    }
    const publica = admin.storage.from(BUCKET_SAIDA).getPublicUrl(caminho).data.publicUrl;

    /* o custo cai na MESMA tabela do Estudio: os cards de Financas do painel ja'
       somam ia_custos, entao este gasto aparece la' sem trabalho nenhum. */
    const real = custoDoUsage(out?.usage);
    const { error: logErr } = await admin.schema("elifoot_v3").from("ia_custos").insert({
      tipo: "embaixador", qualidade: QUALIDADE, tamanho: TAMANHO, quem: uid,
      custo_usd: real ? real.custo_usd : CUSTO_USD,
      tokens_in_texto: real?.tokens_in_texto ?? null,
      tokens_in_imagem: real?.tokens_in_imagem ?? null,
      tokens_out: real?.tokens_out ?? null,
      custo_fonte: real ? "tokens" : "tabela",
    });
    if (logErr) console.error("registro de custo falhou:", logErr.message);

    return resp(200, { url: publica, geracoes: usadas, teto: TETO_GERACOES });
  } catch (e) {
    console.error("player-avatar:", e);
    return resp(500, { error: (e as Error)?.message || "Falha ao gerar o retrato." });
  } finally {
    /* A FOTO PESSOAL NAO FICA. Dando certo ou dando errado — e' o que a tela promete. */
    try { await admin.storage.from(BUCKET_REF).remove([refPath]); }
    catch (e) { console.error("nao apaguei a referencia:", (e as Error)?.message); }
  }
});
