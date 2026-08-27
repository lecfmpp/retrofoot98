/* ============================================================================
   VÍDEOS DE MOMENTO — override publicado pelo painel dos sócios
   ----------------------------------------------------------------------------
   O painel (admin.retrofoot98.com.br → aba "Vídeos") publica um vídeo por
   CHAVE de momento (a mesma chave de VIDEOS_MOMENTO em ui/main.js), global ou
   só para um país/divisão/competição. Este arquivo lê elifoot_v3.momento_videos
   e devolve, para cada chamada, o mais específico que bater com o contexto —
   se nada bater, quem chamou usa o arquivo estático de sempre. Publicar aqui
   NUNCA deixa uma tela sem vídeo: só troca o que já tinha.

   Mesmo padrão de net/ads.js: fetch cru (a chave publicável já basta, RLS é
   de leitura aberta para linhas ativas), cache local, atualização periódica —
   este script também roda antes do SDK do Supabase estar pronto.
   ============================================================================ */
(function(){
'use strict';

const SB_URL = 'https://alxwgqvjmetjbbqtjkhx.supabase.co';
const SB_KEY = 'sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';
const REST   = SB_URL + '/rest/v1/';
const CACHE_KEY = 'rf98:momvid:v1';
const REFRESH_MS = 5*60*1000;

let linhas = [];   // todas as linhas ativas, brutas

try{
  const c = JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
  if(c && c.t && (Date.now()-c.t) < 24*3600*1000) linhas = c.v||[];
}catch(e){}

async function carregar(){
  try{
    const url = REST + 'momento_videos?select=chave_momento,escopo_tipo,escopo_valor,ficheiro_url&ativo=eq.true';
    const r = await fetch(url, { headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY,
      'Accept-Profile':'elifoot_v3' } });
    if(!r.ok) throw new Error('HTTP '+r.status);
    linhas = await r.json();
    try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ t:Date.now(), v:linhas })); }catch(e){}
  }catch(e){ /* sem rede: fica com o cache (ou vazio) e tenta de novo no próximo ciclo */ }
}
carregar();
setInterval(carregar, REFRESH_MS);

/* `ctx` é opcional: { pais, divisao, competicao }. Procura primeiro uma linha
   escopada que bata com algum dos três, depois a global; devolve '' se não
   houver nenhuma (o chamador já sabe cair no arquivo estático). */
function url(chave, ctx){
  ctx = ctx || {};
  const doChave = linhas.filter(v => v.chave_momento === chave);
  if(ctx.divisao){
    const m = doChave.find(v => v.escopo_tipo==='divisao' && v.escopo_valor===ctx.divisao);
    if(m) return m.ficheiro_url;
  }
  if(ctx.competicao){
    const m = doChave.find(v => v.escopo_tipo==='competicao' && v.escopo_valor===ctx.competicao);
    if(m) return m.ficheiro_url;
  }
  if(ctx.pais){
    const m = doChave.find(v => v.escopo_tipo==='pais' && v.escopo_valor===ctx.pais);
    if(m) return m.ficheiro_url;
  }
  const g = doChave.find(v => !v.escopo_tipo);
  return g ? g.ficheiro_url : '';
}

/* chave de troféu (ver rfCompInfo/dadosCampeaoLiga) é OU divisão (A-D) OU chave
   de competição (copaBrasil, libertadores...) — nunca as duas. */
function ctxDeTrofeu(trofeu, pais){
  if(!trofeu) return pais ? {pais} : {};
  const ctx = /^[A-D]$/.test(String(trofeu)) ? {divisao:String(trofeu)} : {competicao:String(trofeu)};
  if(pais) ctx.pais = pais;
  return ctx;
}

window.MOMENTO_VIDEOS = { url, ctxDeTrofeu };
})();
