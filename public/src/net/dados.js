/* ============================================================================
   PACOTES DE DADOS — catálogo de fábrica + correções por cima
   ----------------------------------------------------------------------------
   Clubes e elencos vêm de public/src/data/*.js (window.GAME_DATA para a Série A,
   window.BRASIL_LOWER para B/C/D). Esses arquivos continuam sendo a base: são
   iguais para todo jogador, mudam raramente e já vêm pela CDN. O banco guarda só
   o que DIFERE — o pacote.

   QUANDO O PACOTE ENTRA. mpBuildInitialState() materializa os elencos DENTRO do
   save/da sala no momento da criação, e o resolve-round trabalha em cima desse
   estado. Ou seja: basta o catálogo estar corrigido na hora de criar o jogo.
   Quem entra na sala depois recebe o elenco pronto pelo shared_state — não
   precisa ter o pacote, e não há como divergir do anfitrião.

   O PACOTE OFICIAL é aplicado sempre, para todo mundo: é onde a equipe corrige
   dado errado do catálogo. Um pacote de anfitrião entra por cima dele.

   Save já começado não muda — o universo está gravado dentro dele.
   ============================================================================ */
(function(){
'use strict';

const SB_URL = 'https://alxwgqvjmetjbbqtjkhx.supabase.co';
const SB_KEY = 'sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';
const REST   = SB_URL + '/rest/v1/';
const CACHE  = 'rf98:pack:oficial:v1';

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

/* lista fechada de propósito: patch com chave errada não planta campo novo dentro
   do objeto de clube que o motor lê */
const CAMPOS_CLUBE   = ['name','short','color','color2','crest','OS','MS','DS','overall'];
const CAMPOS_JOGADOR = ['n','p','s','f','age','mv','num','nat','ft','moral','energy'];
function copiar(destino, patch, permitidos){
  for(const k of permitidos) if(patch[k] !== undefined && patch[k] !== null) destino[k] = patch[k];
}

/* aplica uma lista de edições sobre o catálogo em memória. Idempotente: é
   atribuição, não incremento — reaplicar o mesmo pacote não acumula efeito. */
function aplicar(edits){
  if(!Array.isArray(edits) || !edits.length) return 0;
  let n = 0;
  for(const e of edits){
    try{
      if(e.novo){
        const alvo = listas().find(l => l.div === (e.divisao||'D'));
        if(!alvo || acharClube(e.club_id)) continue;
        const clube = Object.assign({}, e.patch, { id: e.club_id });
        if(!Array.isArray(clube.squad)) clube.squad = [];
        alvo.arr.push(clube); n++; continue;
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
        if(Array.isArray(e.patch.squad_remover)) for(const nome of e.patch.squad_remover){
          const i = sq.findIndex(x => x.n === nome); if(i>=0) sq.splice(i,1);
        }
        if(Array.isArray(e.patch.squad_novos)) for(const novo of e.patch.squad_novos){
          if(!novo || !novo.n || sq.some(x => x.n === novo.n)) continue;
          const p = { moral:70, energy:100 }; copiar(p, novo, CAMPOS_JOGADOR); sq.push(p);
        }
      }
      n++;
    }catch(err){ /* um patch torto não pode derrubar o boot do jogo */ }
  }
  return n;
}

function buscarEdits(packId){
  const q = packId ? 'pack_id=eq.'+encodeURIComponent(packId)
                   : 'pack_id=eq.'+encodeURIComponent(PACOTE_OFICIAL||'');
  return fetch(REST + 'pack_edits?select=club_id,divisao,novo,patch&' + q,
    { headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY, 'Accept-Profile':'elifoot_v3' } })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP '+r.status)));
}

let PACOTE_OFICIAL = null;
const aplicados = new Set();

/* 1) CACHE, SÍNCRONO — o pacote oficial da visita anterior entra antes de o motor
      montar qualquer coisa. Sem isto, quem criasse um jogo nos primeiros milissegundos
      pegaria o catálogo sem correção. */
try{
  const c = JSON.parse(localStorage.getItem(CACHE)||'null');
  if(c && Array.isArray(c.v)){ aplicar(c.v); PACOTE_OFICIAL = c.id||null; aplicados.add('oficial'); }
}catch(e){}

/* 2) REDE — atualiza para a próxima visita (e para esta, se ainda der tempo) */
fetch(REST + 'data_packs?select=id,codigo,nome&oficial=is.true&limit=1',
      { headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY, 'Accept-Profile':'elifoot_v3' } })
  .then(r => r.ok ? r.json() : [])
  .then(ps => {
    if(!ps || !ps.length) return;
    PACOTE_OFICIAL = ps[0].id;
    return buscarEdits(PACOTE_OFICIAL).then(edits => {
      aplicar(edits); aplicados.add('oficial');
      try{ localStorage.setItem(CACHE, JSON.stringify({ t:Date.now(), id:PACOTE_OFICIAL, v:edits })); }catch(e){}
    });
  })
  .catch(()=>{ /* sem rede: fica com o cache */ });

/* PACOTE DA SALA/DO SAVE — chamado antes de gerar o universo (anfitrião) e ao
   entrar numa sala criada com pacote (convidado, para ver os mesmos nomes e
   escudos que o anfitrião). Devolve quantos clubes foram tocados. */
async function usarPacote(packId){
  if(!packId || aplicados.has(packId)) return 0;
  try{
    const edits = await buscarEdits(packId);
    const n = aplicar(edits);
    aplicados.add(packId);
    return n;
  }catch(e){ console.warn('pacote de dados:', e && e.message); return 0; }
}

/* pacotes que esta conta pode usar como anfitrião: o oficial + os que ela tem */
async function meusPacotes(token){
  const h = { apikey:SB_KEY, Authorization:'Bearer '+(token||SB_KEY), 'Accept-Profile':'elifoot_v3' };
  const [ofi, meus] = await Promise.all([
    fetch(REST+'data_packs?select=id,codigo,nome,descricao,oficial&oficial=is.true', {headers:h}).then(r=>r.json()).catch(()=>[]),
    token ? fetch(REST+'pack_users?select=pack_id,data_packs(id,codigo,nome,descricao,oficial)', {headers:h})
              .then(r=>r.json()).catch(()=>[]) : Promise.resolve([])
  ]);
  const out = (ofi||[]).slice();
  (meus||[]).forEach(m => { if(m.data_packs && !out.some(p=>p.id===m.data_packs.id)) out.push(m.data_packs); });
  return out;
}

window.RF_PACKS = { aplicar, usarPacote, meusPacotes, acharClube,
                    get oficial(){ return PACOTE_OFICIAL; } };
})();
