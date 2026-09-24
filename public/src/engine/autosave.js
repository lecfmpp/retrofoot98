/* ====================== SALVAMENTO AUTOMÁTICO (rede de segurança) ======================
   Guarda uma FOTO do estado do jogo ao fim de cada rodada e mantém as 3 mais recentes, mais
   uma foto FIXA da última rodada de cada temporada encerrada. Se a virada de temporada der
   errado — ou se qualquer coisa sair do lugar nas últimas rodadas — dá pra voltar.

   POR QUE IndexedDB E NÃO localStorage: uma foto de S passa fácil de 500 KB (elencos de 80
   clubes, chaveamentos, histórico). Quatro fotos estouram o teto de ~5 MB do localStorage e,
   pior, o estouro derruba tambémo que já estava guardado lá (caixa de entrada, finanças do
   cliente, opções). O IndexedDB é assíncrono e tem espaço de sobra.

   POR QUE A FOTO É DO CLIENTE, E NÃO DO SERVIDOR: na Resenha o estado autoritativo é do
   anfitrião, mas cada cliente já adota esse estado inteiro a cada rodada — então a foto local
   do anfitrião É o estado da sala. Restaurar, porém, é outra história: rebobinar a sala afeta
   os dois jogadores, então só o anfitrião pode fazê-lo (ver autoSaveRestaurar).

   A FOTO DE FIM DE TEMPORADA não é tirada "antes da virada": na Resenha quem vira a temporada é
   o servidor, e quando o cliente descobre a virada o estado velho já não existe do lado dele. O
   que existe é a foto da ÚLTIMA RODADA daquela temporada, tirada minutos antes — então a virada
   apenas PROMOVE essa foto a permanente (autoSaveFixarFimDeTemporada), em vez de tentar tirar
   uma que já não é possível. */

const AUTOSAVE_DB='retrofoot98_snapshots';
const AUTOSAVE_STORE='fotos';
const AUTOSAVE_MANTER=3;            // fotos de rodada mantidas por save/sala (as mais recentes)
const AUTOSAVE_TEMPORADAS=3;        // fotos de fim de temporada mantidas (as mais recentes)

function autoSaveLigado(){
  if(typeof CL==='undefined') return true;                  // padrão LIGADO pra todo mundo
  const o=(typeof clOpcoes==='function')?clOpcoes():CL.options;
  return ((o&&o.autoSave)||'Sim')!=='Não';
}
/* identifica o save/sala + o clube — mesma régua do inbox e das finanças do cliente: duas salas
   diferentes, ou o mesmo save com clubes diferentes, não podem compartilhar fotos. */
function autoSaveKey(){
  if(typeof CL==='undefined' || typeof S==='undefined' || !S) return null;
  const g=(CL.online && typeof NET!=='undefined' && NET.gameId) ? ('sala_'+NET.gameId)
                                                               : ('solo_'+(CL.save||'')+'_'+(S.seed||'x'));
  return g+'_'+(CL.clubId||S.clubId||'');
}

function autoSaveDB(){
  return new Promise((ok,erro)=>{
    if(typeof indexedDB==='undefined') return erro(new Error('sem IndexedDB'));
    const req=indexedDB.open(AUTOSAVE_DB, 1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(AUTOSAVE_STORE)){
        const st=db.createObjectStore(AUTOSAVE_STORE, {keyPath:'id', autoIncrement:true});
        st.createIndex('porSave','save',{unique:false});
      }
    };
    req.onsuccess=()=>ok(req.result);
    req.onerror=()=>erro(req.error);
  });
}
function autoSaveTx(modo){
  return autoSaveDB().then(db=>{
    const tx=db.transaction(AUTOSAVE_STORE, modo);
    return { st:tx.objectStore(AUTOSAVE_STORE), tx, db };
  });
}
function autoSavePedido(req){
  return new Promise((ok,erro)=>{ req.onsuccess=()=>ok(req.result); req.onerror=()=>erro(req.error); });
}

/* todas as fotos de um save/sala, da mais nova pra mais velha */
async function autoSaveLista(save){
  const chave=save||autoSaveKey(); if(!chave) return [];
  try{
    const {st}=await autoSaveTx('readonly');
    const todas=await autoSavePedido(st.index('porSave').getAll(chave));
    return todas.sort((a,b)=>b.quando-a.quando);
  }catch(e){ console.warn('autoSave lista:', e&&e.message); return []; }
}

/* Tira a foto. `tipo` é 'rodada' (rotativa) ou 'temporada' (fixa, sobrevive à poda).
   Nunca lança: uma falha de disco não pode derrubar o fim de rodada. */
async function autoSaveGuardar(tipo){
  if(!autoSaveLigado()) return null;
  const chave=autoSaveKey(); if(!chave || typeof S==='undefined' || !S) return null;
  try{
    const foto={
      save:chave, tipo:tipo||'rodada', quando:Date.now(),
      season:S.season||0, round:S.round||0,
      clubId:(typeof CL!=='undefined'&&CL.clubId)||S.clubId||null,
      online:!!(typeof CL!=='undefined'&&CL.online),
      // JSON.parse(JSON.stringify()) e não structuredClone: o S carrega funções e referências
      // circulares em alguns caminhos, e o structuredClone estoura nelas em vez de ignorá-las.
      S: JSON.parse(JSON.stringify(S))
    };
    const {st}=await autoSaveTx('readwrite');
    await autoSavePedido(st.add(foto));
    await autoSavePodar(chave);
    autoSaveListaMudou();
    return foto;
  }catch(e){ console.warn('autoSave guardar:', e&&e.message); autoSaveAvisarFalha(e); return null; }
}

/* ===== A FALHA TEM DE APARECER =====
   Um save grande (o do GRINGO tem 12 MB em JSON) estoura o espaco do navegador — no celular,
   sobretudo — e a foto falhava so' com um aviso na consola: o jogador descobria que nao havia
   ponto nenhum no dia em que precisava dele. Agora avisa UMA vez por sessao, e a pagina de
   Configuracoes mostra o motivo (CL._autoSaveErro). */
function autoSaveAvisarFalha(e){
  if(typeof CL==='undefined') return;
  const cheio=!!(e && (e.name==='QuotaExceededError' || /quota|space|espa/i.test(String(e.message||''))));
  CL._autoSaveErro = cheio
    ? 'Sem espaço neste navegador para guardar os pontos de rodada.'
    : 'Este navegador não deixou guardar os pontos de rodada.';
  if(CL._autoSaveAvisou) return;
  CL._autoSaveAvisou=true;
  const nuvem=!CL.online ? ' O fim de cada temporada continua guardado na nuvem.' : '';
  if(typeof toastC==='function') toastC('⚠ '+CL._autoSaveErro+nuvem);
}
/* a lista de Configuracoes guarda o que leu (ver rfOpPontos); qualquer foto nova a invalida */
function autoSaveListaMudou(){ if(typeof CL!=='undefined') CL._opPts=undefined; }

/* ===== FIM DE TEMPORADA NA NUVEM (so' Modo Solo) =====
   A foto local mora num navegador so': trocou de aparelho, limpou os dados, ficou sem espaco — e
   nao ha para onde voltar. A de fim de temporada vai tambem para o Supabase (solo_save_fotos),
   tirada na virada, ANTES de newSeasonReset: e' o estado com a temporada fechada e o resumo
   pronto, e voltar para ela deixa o jogador na tela de fim de temporada. `copia` e' um S ja'
   clonado pelo chamador — a copia tem de ser sincrona, o envio nao. Nunca lanca. */
async function autoSaveNuvemFimDeTemporada(copia){
  try{
    if(!autoSaveLigado() || !copia) return false;
    if(typeof CL==='undefined' || CL.online || !CL.save) return false;
    if(typeof NET==='undefined' || !NET.saveSoloFoto) return false;
    const ok=await NET.saveSoloFoto({ save_name:CL.save, seed:copia.seed||'x', club_id:CL.clubId||copia.clubId||null,
      season:copia.season||0, round:copia.round||0, state:copia });
    if(ok){ autoSaveListaMudou(); console.log('auto-save: fim da temporada '+(copia.season||'?')+' guardado na nuvem'); }
    return ok;
  }catch(e){ console.warn('autoSave nuvem:', e&&e.message); return false; }
}

/* A LISTA QUE A TELA MOSTRA: fotos locais + fotos de fim de temporada da nuvem. Os ids viram
   texto com prefixo ('l' local, 'n' nuvem) para os dois nao colidirem. Quando ha' as duas fotos
   do fim da mesma temporada, fica a da nuvem: vale em qualquer aparelho e foi tirada ja' com a
   temporada fechada. */
async function autoSaveListaCompleta(){
  const locais=(await autoSaveLista()).map(f=>Object.assign({}, f, {id:'l'+f.id, S:undefined}));
  let nuvem=[];
  try{
    const online=(typeof CL!=='undefined' && CL.online);
    if(!online && typeof NET!=='undefined' && NET.listSoloFotos && typeof S!=='undefined' && S && CL.save)
      nuvem=(await NET.listSoloFotos(CL.save, S.seed||'x')).map(r=>({ id:'n'+r.id, nuvem:true, tipo:'temporada',
        season:r.season, round:r.round, clubId:r.club_id, quando:new Date(r.criado_em).getTime() }));
  }catch(e){ console.warn('autoSave lista nuvem:', e&&e.message); }
  const naNuvem=new Set(nuvem.map(f=>f.season));
  return locais.filter(f=>!(f.tipo==='temporada' && naNuvem.has(f.season))).concat(nuvem)
    .sort((a,b)=>b.quando-a.quando);
}

/* poda: mantém as N fotos de rodada mais recentes e as N de fim de temporada mais recentes */
async function autoSavePodar(chave){
  try{
    const todas=await autoSaveLista(chave);
    const sobra=[];
    ['rodada','temporada'].forEach(t=>{
      const limite=(t==='rodada')?AUTOSAVE_MANTER:AUTOSAVE_TEMPORADAS;
      todas.filter(f=>f.tipo===t).slice(limite).forEach(f=>sobra.push(f.id));
    });
    if(!sobra.length) return;
    const {st}=await autoSaveTx('readwrite');
    sobra.forEach(id=>st.delete(id));
  }catch(e){ console.warn('autoSave podar:', e&&e.message); }
}

/* A virada de temporada aconteceu: promove a foto mais recente da temporada que FECHOU a
   permanente. É essa que responde ao "voltar pra última rodada da temporada anterior".
   Se não houver foto daquela temporada (jogador entrou na sala já na virada), não inventa nada. */
async function autoSaveFixarFimDeTemporada(temporadaQueFechou){
  if(!autoSaveLigado()) return null;
  const chave=autoSaveKey(); if(!chave) return null;
  try{
    const todas=await autoSaveLista(chave);
    const ja=todas.find(f=>f.tipo==='temporada' && f.season===temporadaQueFechou);
    if(ja) return ja;                                              // virada reprocessada: não duplica
    const alvo=todas.find(f=>f.tipo==='rodada' && f.season===temporadaQueFechou);
    if(!alvo) return null;
    const {st}=await autoSaveTx('readwrite');
    alvo.tipo='temporada';
    await autoSavePedido(st.put(alvo));
    await autoSavePodar(chave);
    autoSaveListaMudou();
    console.log('auto-save: foto da temporada '+temporadaQueFechou+' (jornada '+alvo.round+') fixada');
    return alvo;
  }catch(e){ console.warn('autoSave fixar:', e&&e.message); return null; }
}

/* GANCHO ÚNICO DE FIM DE RODADA. Chamado dos caminhos que fecham/adotam uma rodada, tanto no
   solo quanto na Resenha. Detecta a virada de temporada comparando com a foto anterior — assim
   a promoção acontece sem cada chamador ter que saber que houve virada. */
async function autoSaveAoFecharJornada(){
  if(!autoSaveLigado()) return;
  const chave=autoSaveKey(); if(!chave) return;
  const anteriores=await autoSaveLista(chave);
  const ultima=anteriores.filter(f=>f.tipo==='rodada')[0];
  if(ultima && ultima.season===(S.season||0) && ultima.round===(S.round||0)) return;  // já fotografei esta rodada
  if(ultima && (S.season||0) > ultima.season) await autoSaveFixarFimDeTemporada(ultima.season);
  await autoSaveGuardar('rodada');
}

/* ---------------------------------- RESTAURAR ----------------------------------
   Solo: troca o estado e regrava o save.
   Resenha: rebobinar a sala afeta OS DOIS jogadores, e só o anfitrião escreve o estado
   compartilhado — então só ele pode restaurar. Além do estado, o ponteiro de dia precisa voltar
   junto, senão a sala fica apontando pra um dia que o estado restaurado ainda não viveu (foi
   exatamente esse descompasso que travou a ZAF6T). */
async function autoSaveRestaurar(id){
  const chave=autoSaveKey(); if(!chave) return {ok:false, erro:'sem save ativo'};
  const online=!!(typeof CL!=='undefined' && CL.online);
  if(online && !(typeof NET!=='undefined' && NET.isHost)) return {ok:false, erro:'só o Anfitrião pode voltar a sala'};
  let foto=null;
  const txt=String(id);
  if(txt.charAt(0)==='n'){
    /* da nuvem: o estado vem agora (a lista nao o trouxe). Confere a carreira pela semente —
       o mesmo nome de save pode ser um jogo novo. */
    if(online) return {ok:false, erro:'a nuvem guarda só saves do Modo Solo'};
    try{
      const r=(typeof NET!=='undefined' && NET.loadSoloFoto) ? await NET.loadSoloFoto(Number(txt.slice(1))) : null;
      if(!r || !r.state || r.save_name!==CL.save || String(r.seed)!==String(S.seed||'x')) return {ok:false, erro:'foto não encontrada'};
      foto={ S:r.state, season:r.state.season, round:r.state.round, tipo:'temporada', nuvem:true };
    }catch(e){ return {ok:false, erro:(e&&e.message)||'sem ligação'}; }
  } else {
    try{
      const {st}=await autoSaveTx('readonly');
      foto=await autoSavePedido(st.get(Number(txt.charAt(0)==='l'?txt.slice(1):txt)));
    }catch(e){ return {ok:false, erro:e&&e.message}; }
    if(!foto || foto.save!==chave) return {ok:false, erro:'foto não encontrada'};
  }
  try{
    // limpa o S no lugar (outros módulos guardam a referência do objeto, não podem vê-la trocada)
    Object.keys(S).forEach(k=>{ delete S[k]; });
    Object.assign(S, JSON.parse(JSON.stringify(foto.S)));
    if(typeof CL!=='undefined' && CL.clubId) S.clubId=CL.clubId;
    if(typeof syncDataClubsFromState==='function') syncDataClubsFromState();
    if(typeof applyViewerDivision==='function' && typeof CL!=='undefined') applyViewerDivision(CL.clubId||S.clubId);
    if(typeof resolveClubXI==='function') S.xi=resolveClubXI((typeof CL!=='undefined'&&CL.clubId)||S.clubId);
    if(online){
      if(NET.saveGame) await NET.saveGame({ S, round:S.round });
      if(NET.rewindDayPointer) await NET.rewindDayPointer(S.round||0);
      if(NET.reopenReady) NET.reopenReady();
    } else if(typeof saveV3==='function') saveV3();
    autoSaveListaMudou();
    console.log('auto-save: estado restaurado — temporada '+(S.season||'?')+', rodada '+(S.round||0));
    return {ok:true, foto};
  }catch(e){ return {ok:false, erro:e&&e.message}; }
}

/* rótulo humano de uma foto, pro diálogo de restauração */
function autoSaveRotulo(f){
  const quando=new Date(f.quando);
  const dd=String(quando.getDate()).padStart(2,'0')+'/'+String(quando.getMonth()+1).padStart(2,'0');
  const hh=String(quando.getHours()).padStart(2,'0')+':'+String(quando.getMinutes()).padStart(2,'0');
  const que=(f.tipo==='temporada')
    ? ((f.nuvem?'☁️ ':'')+'Fim da temporada '+(f.season||'?'))
    : ('Temporada '+(f.season||'?')+' · rodada '+((f.round||0)+1));
  return { que, quando:dd+' '+hh, fixa:f.tipo==='temporada', nuvem:!!f.nuvem };
}
