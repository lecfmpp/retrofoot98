/* ==================================================================
   coach-avatar — o retrato do treinador, gerado por IA para o jogador.

   Irma da generate-image, NAO substituta. A generate-image e' do painel:
   ela aceita um prompt cru do browser, e por isso so' socio alcanca. Aqui
   quem chama e' o jogador, entao nada de prompt: o body diz genero, estilo
   e (opcional) a foto de referencia, e o texto e' montado AQUI.

   Tres travas, todas no servidor:
   · so' PRO gera (elifoot_v3.user_plans, conferido aqui — nunca no cliente);
   · cota por conta, incrementada ANTES de chamar a OpenAI (coach_avatar_consumir);
   · a foto de referencia so' pode ser da PROPRIA pasta do usuario, e e'
     APAGADA no finally — dando certo ou dando errado.

   Body: { genero:'m'|'f', estilo: chave, idade?: 25..75, referencia?: path }
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
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/* os 5 estilos de roupa — mesma forma do ESTILOS_CAMISA do painel:
   [chave] -> frase que entra no prompt. Mexer aqui muda o jogo todo. */
const ESTILOS: Record<string, string> = {
  terno:    "a sharp dark charcoal tailored suit with a tie",
  agasalho: "a technical zip-up training tracksuit jacket in dark navy blue",
  polo:     "a plain fitted training polo shirt in light heather grey",
  blazer:   "a casual unstructured beige blazer over an open-collar shirt, no tie",
  retro90:  "an oversized 1990s coach shell jacket in dark navy blue, era-accurate cut",
};
/* apelido: o cliente antigo em cache ainda manda "retro". Aceitar os dois
   custa uma linha e evita 400 em quem nao recarregou a pagina. */
ESTILOS.retro = ESTILOS.retro90;

/* ===== A CARA NAO PODE SAIR TRISTE =====
   Sem pedir a expressao, o modelo escorrega para "serio", e "serio" vira boca
   caida e olhar baixo. Aqui a expressao e' sorteada entre cinco boas — o que
   da' variedade a quem refaz — e o que nao se quer e' proibido por escrito:
   dizer so' "sorria" nao resolve, porque o defeito mora na metade seria. */
const EXPRESSOES = [
  "a calm, composed neutral expression, mouth relaxed and level",
  "a serious and focused expression, confident and alert — composed, never downcast",
  "a light closed-mouth smile, friendly and relaxed",
  "a warm open smile showing teeth, genuinely cheerful",
  "a confident half-smile, one corner of the mouth slightly raised",
];
const NUNCA = "NEVER sad, gloomy, melancholic, tired or defeated: no downturned mouth corners, "
  + "no furrowed worried brow, no drooping eyelids, no downcast gaze. The eyes look straight at "
  + "the camera, open and engaged, and the posture is upright and self-assured.";

/* ===== A ROUPA SAI LIMPA DA IA =====
   Pedir o escudo no prompt nao funciona: gpt-image-1 nao reproduz marca nem
   texto, ele INVENTA um brasao ilegivel. A peca nasce vazia e o escudo e a
   marca entram por CIMA, como camada — mesma solucao do uniforme do jogador. */
const BUCKET_SAIDA = "treinadores";
const BUCKET_REF   = "referencias-treinador";
const TAMANHO = "1024x1024", FORMATO = "webp", CONTENT_TYPE = "image/webp", COMPRESSAO = 80;
const QUALIDADE = "medium", CUSTO_USD = 0.042;   // tabela do gpt-image-1: 1024x1024 medium
const TETO_GERACOES = 6;
const REF_MAX_BYTES = 8 * 1024 * 1024;

const ROUPA_LIMPA = "The garment is COMPLETELY CLEAN: no crest, no badge, no sponsor, no brand mark, "
  + "no text, no numbers, no logos and no embroidery of any kind, anywhere — not on the chest, "
  + "not on the collar, not on the sleeves. Plain fabric only, because the crest and the brand "
  + "mark are overlaid later as separate layers.";

/* a idade vira faixa, nao numero: "37 years old" faz o modelo desenhar uma
   ficha de identidade; a faixa faz ele desenhar uma pessoa. */
function faixaEtaria(idade: number): string {
  if (idade < 35) return "in their early thirties";
  if (idade < 45) return "in their late thirties";
  if (idade < 55) return "in their late forties";
  if (idade < 65) return "in their late fifties";
  return "in their late sixties, visibly experienced";
}

function montarPrompt(genero: string, estilo: string, idade: number, comReferencia: boolean) {
  const quem = genero === "f" ? "woman" : "man";
  const roupa = ESTILOS[estilo];
  const expressao = EXPRESSOES[Math.floor(Math.random() * EXPRESSOES.length)];
  const base = [
    `Hyper-realistic studio portrait of a fictional professional football MANAGER, a ${quem} ${faixaEtaria(idade)}, wearing ${roupa}.`,
    `The face has ${expressao}.`,
    NUNCA,
    ROUPA_LIMPA,
    "Head and upper chest only, facing the camera directly, official club media day photo style.",
    "Cropped just below the collarbone — do not show the arms, the waist or any part of the background scene.",
    "Soft professional studio lighting, sharp focus, DSLR photo quality.",
    "FULLY TRANSPARENT BACKGROUND — no backdrop and NO SHADOW cast behind the person (a cast shadow becomes a grey fringe when the portrait is placed over colours).",
    "The head is horizontally centered and fills about 55% of the frame height, with a small margin of empty space above the hair.",
    "Clean, crisp edges around the hair and the shoulders — every pixel outside the person must be fully transparent, with no grey halo, no soft fade and no leftover backdrop.",
  ];
  if (comReferencia) {
    /* DE PROPOSITO "as loose inspiration", nunca "the same face": pedir a
       semelhanca de uma pessoa real faz o gpt-image-1 recusar a chamada
       inteira. O produto aqui e' um avatar inspirado, nao um clone. */
    base.push(
      "Use the general facial structure and hair of the input photo as loose inspiration only.",
      "The result must be a NEW, clearly fictional person — do not reproduce the likeness of the person in the photo.",
    );
  } else {
    /* NEGACAO SOZINHA E' FRACA. O modelo foi treinado em fotos de gente real e
       um pedido generico puxa para caras conhecidas; "not resembling any real
       person" e' uma negacao, e o modelo pesa mal negacoes. Entao o texto
       tambem AFIRMA o que se quer (rosto inventado, comum) e NOMEIA o risco
       (treinadores e celebridades), que e' o que ele evita de facto.
       Semelhanca reconhecivel num produto comercial e' direito de imagem, nao
       detalhe estetico. */
    base.push(
      "CRITICAL: invent a completely new, ordinary face that does NOT look like any real football",
      "manager or coach, past or present, and does not resemble any celebrity or public figure.",
      "Avoid distinctive features associated with well-known figures. This person does not exist.",
    );
  }
  return base.join(" ");
}


/* ===== CUSTO REAL, NAO ESTIMADO =====
   gpt-image-1 e' cobrado POR TOKEN, e a resposta traz `usage`. A tabela por
   imagem que existia acertava a saida e IGNORAVA a entrada inteira — em
   especial as imagens de entrada do images/edits, que a montagem manda de
   duas em duas. No periodo 25-27/08 isso subestimou a fatura em 11,9%.
   Precos por 1M de tokens; se a OpenAI mexer neles, e' aqui que se mexe. */
const TOK_USD = { texto_in: 5.0, imagem_in: 10.0, imagem_out: 40.0 };
function custoDoUsage(usage: any) {
  const det = usage?.input_tokens_details || {};
  const tIn = Number(det.text_tokens ?? usage?.input_tokens ?? 0);
  const iIn = Number(det.image_tokens ?? 0);
  const out = Number(usage?.output_tokens ?? 0);
  if (!out && !tIn && !iIn) return null;   // sem usage: cai na estimativa antiga
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

  let body: { genero?: string; estilo?: string; idade?: number; referencia?: string };
  try { body = await req.json(); } catch { return resp(400, { error: "Body inválido." }); }

  const genero = String(body.genero || "");
  const estilo = String(body.estilo || "");
  if (genero !== "m" && genero !== "f") return resp(400, { error: "genero tem que ser m ou f." });
  if (!ESTILOS[estilo]) return resp(400, { error: "estilo desconhecido." });
  const idadeBruta = Number(body.idade);
  const idade = Number.isFinite(idadeBruta) ? Math.min(75, Math.max(25, Math.round(idadeBruta))) : 40;

  /* PORTA DO EMBAIXADOR — no servidor. O cliente ja' esconde o botao, mas
     esconder botao nao e' controle de acesso: quem chama a funcao direto
     passaria.

     A PERGUNTA E' FEITA A' MESMA FUNCAO QUE O RESTO DO JOGO USA. plano_limites
     ja' resolve o prazo (`until` no passado deixa de valer sozinho) e ja' sabe
     quais planos dao retrato — repetir a regra aqui era ter duas versoes dela,
     e foi assim que o 'pro' antigo ficou para tras quando nasceram os tres
     planos. */
  const { data: limites } = await admin
    .schema("elifoot_v3").rpc("plano_limites", { p_user: uid });
  const lim = Array.isArray(limites) ? limites[0] : limites;
  if (!lim?.avatar_ia) {
    return resp(403, { error: "O retrato por IA é do plano Embaixador.", motivo: "pro" });
  }

  const refPath = body.referencia ? String(body.referencia) : "";
  /* a referencia so' pode ser da PROPRIA pasta. Sem isto, um Pro qualquer
     le a foto pessoal de outro passando o path dele. */
  if (refPath && !refPath.startsWith(uid + "/")) {
    return resp(403, { error: "Referência fora da sua pasta." });
  }

  /* COTA ANTES DA OPENAI: cobra primeiro, gera depois. O contrario deixaria
     a corrida entre duas abas gerar de graca. */
  const { data: usadas, error: cotaErr } = await admin
    .schema("elifoot_v3").rpc("coach_avatar_consumir", { p_user: uid, p_teto: TETO_GERACOES });
  if (cotaErr) {
    console.error("cota falhou:", cotaErr.message);
    return resp(500, { error: "Não consegui conferir a sua cota." });
  }
  if (usadas == null) {
    return resp(429, { error: `Você já usou as ${TETO_GERACOES} gerações de retrato desta conta.`, motivo: "cota" });
  }

  /* o retorno da cota ja' foi consumido: daqui pra baixo, TODA saida passa
     pelo finally que apaga a referencia. */
  try {
    const prompt = montarPrompt(genero, estilo, idade, !!refPath);
    let oa: Response;

    if (refPath) {
      const baixada = await admin.storage.from(BUCKET_REF).download(refPath);
      if (baixada.error || !baixada.data) {
        return resp(400, { error: "Não encontrei a foto de referência que você enviou." });
      }
      const blob = baixada.data;
      if (blob.size > REF_MAX_BYTES) return resp(400, { error: "A foto de referência é grande demais (máx. 8 MB)." });

      const form = new FormData();
      form.append("model", "gpt-image-1");
      form.append("prompt", prompt);
      form.append("n", "1");
      form.append("size", TAMANHO);
      form.append("quality", QUALIDADE);
      form.append("output_format", FORMATO);
      form.append("output_compression", String(COMPRESSAO));
      /* O MESMO transparente do outro ramo. Faltava aqui: o /images/edits ignora
         o pedido do texto e devolve fundo opaco se o campo nao vier no form, e
         era por isso que o avatar de quem MANDA A PROPRIA FOTO no onboarding
         saia com fundo cinza enquanto o gerado do zero saia limpo. */
      form.append("background", "transparent");
      form.append("image[]", new File([blob], "referencia", { type: blob.type || "image/webp" }));
      oa = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_KEY}` },
        body: form,
      });
    } else {
      oa = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-image-1", prompt, n: 1, size: TAMANHO, quality: QUALIDADE,
          /* TRANSPARENTE, como o retrato de jogador. O card poe a identidade do
             clube no FUNDO e o avatar opaco tapava esse fundo inteiro. Vale
             para os avatares NOVOS; os ja' gerados sao recortados no painel. */
          background: "transparent", output_format: FORMATO, output_compression: COMPRESSAO,
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
    const caminho = `${uid}/${estilo}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}.${FORMATO}`;
    const up = await admin.storage.from(BUCKET_SAIDA).upload(caminho, bytes, {
      contentType: CONTENT_TYPE, cacheControl: "31536000", upsert: false,
    });
    if (up.error) {
      console.error("Upload falhou:", up.error.message);
      return resp(500, { error: "Retrato gerado, mas o upload falhou: " + up.error.message });
    }
    const publica = admin.storage.from(BUCKET_SAIDA).getPublicUrl(caminho).data.publicUrl;

    const { error: gravaErr } = await admin
      .schema("elifoot_v3").from("coach_avatars")
      .update({ url: publica, estilo, genero }).eq("user_id", uid);
    if (gravaErr) {
      console.error("gravar avatar falhou:", gravaErr.message);
      return resp(500, { error: "Retrato gerado, mas não consegui salvá-lo no seu perfil." });
    }

    /* custo REGISTRADO na mesma tabela do Estudio — os cards de Financas do
       painel ja' somam ia_custos, entao o gasto do jogador aparece la' sem
       nenhum trabalho a mais. */
    const real = custoDoUsage(out?.usage);
    const { error: logErr } = await admin.schema("elifoot_v3").from("ia_custos").insert({
      tipo: "treinador", qualidade: QUALIDADE, tamanho: TAMANHO, quem: uid,
      custo_usd: real ? real.custo_usd : CUSTO_USD,
      tokens_in_texto: real?.tokens_in_texto ?? null,
      tokens_in_imagem: real?.tokens_in_imagem ?? null,
      tokens_out: real?.tokens_out ?? null,
      custo_fonte: real ? "tokens" : "tabela",
    });
    if (logErr) console.error("registro de custo falhou:", logErr.message);

    return resp(200, { url: publica, geracoes: usadas, restam: Math.max(0, TETO_GERACOES - usadas) });
  } finally {
    /* A PROMESSA FEITA AO JOGADOR: a foto pessoal sai do nosso lado. Aqui e'
       o unico lugar que a cumpre, e por isso esta' no finally — erro da
       OpenAI, falha de upload ou retorno cedo nao podem deixar rosto para
       tras. Falhar ao apagar e' log, nunca resposta: o retrato ja' foi. */
    if (refPath) {
      const rm = await admin.storage.from(BUCKET_REF).remove([refPath]);
      if (rm.error) console.error("NAO APAGUEI a referencia:", refPath, rm.error.message);
    }
  }
});
