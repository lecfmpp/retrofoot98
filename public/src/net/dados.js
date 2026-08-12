/* ============================================================================
   DADOS EDITADOS — correções do painel por cima dos arquivos de fábrica
   ----------------------------------------------------------------------------
   Clubes e elencos vêm de public/src/data/*.js (window.GAME_DATA para a Série A,
   window.BRASIL_LOWER para B/C/D). Esses arquivos continuam sendo a base: o
   painel dos sócios grava só o DIFF em elifoot_v3.club_edits, e é ele que este
   módulo aplica em cima — trazer os 360 KB do catálogo para o banco encareceria
   o boot de todo jogador só para servir uma edição de admin.

   ORDEM IMPORTA. O index.html faz `const DATA = window.GAME_DATA` num script
   clássico, ou seja, antes de qualquer fetch terminar. Duas coisas resolvem:

   1) DATA é uma REFERÊNCIA ao mesmo objeto — mudar window.GAME_DATA.clubs[i].OS
      depois já reflete em DATA, porque é o mesmo objeto na memória.
   2) O que não pode esperar a rede é o primeiro desenho, então o cache local é
      aplicado de forma SÍNCRONA aqui (este script é clássico e roda antes do
      motor). A rede só atualiza para a próxima visita.

   O que NÃO muda: save já começado. O universo é gerado e gravado dentro do
   save — a correção vale para jogos novos, e é assim que tem de ser (mudar a
   força de um elenco no meio da temporada de alguém seria pior que o erro).
   ============================================================================ */
(function(){
'use strict';

const SB_URL = 'https://alxwgqvjmetjbbqtjkhx.supabase.co';
const SB_KEY = 'sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';
const CACHE_KEY = 'rf98:edits:v1';

/* todas as listas de clube que o jogo conhece, num lugar só */
function listas(){
  const out = [];
  if(window.GAME_DATA && Array.isArray(window.GAME_DATA.clubs)) out.push({div:'A', arr:window.GAME_DATA.clubs});
  if(window.BRASIL_LOWER) for(const d of ['B','C','D']){
    if(Array.isArray(window.BRASIL_LOWER[d])) out.push({div:d, arr:window.BRASIL_LOWER[d]});
  }
  return out;
}
function acharClube(id){
  for(const l of listas()){ const c = l.arr.find(x => String(x.id) === String(id)); if(c) return c; }
  return null;
}

/* campos que o painel pode mexer num clube. Lista fechada de propósito: um patch
   com chave errada não deve conseguir plantar campo novo dentro do objeto de clube
   que o motor lê. */
const CAMPOS_CLUBE  = ['name','short','color','color2','crest','OS','MS','DS','overall'];
const CAMPOS_JOGADOR = ['n','p','s','f','age','mv','num','nat','ft','moral','energy'];

function copiar(destino, patch, permitidos){
  for(const k of permitidos) if(patch[k] !== undefined && patch[k] !== null) destino[k] = patch[k];
}

function aplicar(edits){
  if(!edits || !edits.length) return 0;
  let n = 0;
  for(const e of edits){
    try{
      if(e.novo){
        // clube que não existe no arquivo de fábrica: entra na divisão indicada
        const alvo = listas().find(l => l.div === (e.divisao||'D'));
        if(!alvo || acharClube(e.club_id)) continue;
        const clube = Object.assign({}, e.patch, { id: e.club_id });
        if(!Array.isArray(clube.squad)) clube.squad = [];
        alvo.arr.push(clube); n++;
        continue;
      }
      const clube = acharClube(e.club_id);
      if(!clube) continue;
      copiar(clube, e.patch||{}, CAMPOS_CLUBE);

      const sq = Array.isArray(clube.squad) ? clube.squad : null;
      if(sq && e.patch){
        // jogador é identificado pelo NOME: o elenco de fábrica não tem id estável
        if(e.patch.squad) for(const nome of Object.keys(e.patch.squad)){
          const p = sq.find(x => x.n === nome);
          if(p) copiar(p, e.patch.squad[nome], CAMPOS_JOGADOR);
        }
        if(Array.isArray(e.patch.squad_remover)){
          for(const nome of e.patch.squad_remover){
            const i = sq.findIndex(x => x.n === nome);
            if(i >= 0) sq.splice(i, 1);
          }
        }
        if(Array.isArray(e.patch.squad_novos)){
          for(const novo of e.patch.squad_novos){
            if(!novo || !novo.n || sq.some(x => x.n === novo.n)) continue;
            const p = { moral:70, energy:100 };
            copiar(p, novo, CAMPOS_JOGADOR);
            sq.push(p);
          }
        }
      }
      n++;
    }catch(err){ /* um patch torto não pode derrubar o boot do jogo */ }
  }
  return n;
}

// 1) cache local, síncrono — é o que garante que o primeiro jogo já sai corrigido
let doCache = null;
try{
  const c = JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
  if(c && Array.isArray(c.v)) doCache = c.v;
}catch(e){}
if(doCache) aplicar(doCache);

// 2) rede — atualiza o cache para a próxima visita. Reaplicar por cima do que já
//    foi aplicado é inofensivo: o patch é idempotente (atribuição, não incremento).
fetch(SB_URL + '/rest/v1/club_edits?select=club_id,divisao,novo,patch',
      { headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY, 'Accept-Profile':'elifoot_v3' } })
  .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP '+r.status)))
  .then(linhas => {
    const antes = JSON.stringify(doCache||[]);
    if(JSON.stringify(linhas) !== antes) aplicar(linhas);
    try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ t:Date.now(), v:linhas })); }catch(e){}
  })
  .catch(()=>{ /* sem rede: fica com o cache, que é melhor que nada */ });

window.RF_EDITS = { aplicar, acharClube };
})();
