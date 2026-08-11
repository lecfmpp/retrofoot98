/* ====================== SALVAMENTO AUTOMÁTICO (rede de segurança) ======================
   Guarda uma FOTO do estado do jogo ao fim de cada jornada e mantém as 3 mais recentes, mais
   uma foto FIXA da última jornada de cada temporada encerrada. Se a virada de temporada der
   errado — ou se qualquer coisa sair do lugar nas últimas jornadas — dá pra voltar.

   POR QUE IndexedDB E NÃO localStorage: uma foto de S passa fácil de 500 KB (elencos de 80
   clubes, chaveamentos, histórico). Quatro fotos estouram o teto de ~5 MB do localStorage e,
   pior, o estouro derruba tambémo que já estava guardado lá (caixa de entrada, finanças do
   cliente, opções). O IndexedDB é assíncrono e tem espaço de sobra.

   POR QUE A FOTO É DO CLIENTE, E NÃO DO SERVIDOR: na Resenha o estado autoritativo é do
   anfitrião, mas cada cliente já adota esse estado inteiro a cada jornada — então a foto local
   do anfitrião É o estado da sala. Restaurar, porém, é outra história: rebobinar a sala afeta
   os dois jogadores, então só o anfitrião pode fazê-lo (ver autoSaveRestaurar).

   A FOTO DE FIM DE TEMPORADA não é tirada "antes da virada": na Resenha quem vira a temporada é
   o servidor, e quando o cliente descobre a virada o estado velho já não existe do lado dele. O
   que existe é a foto da ÚLTIMA JORNADA daquela temporada, tirada minutos antes — então a virada
   apenas PROMOVE essa foto a permanente (autoSaveFixarFimDeTemporada), em vez de tentar tirar
   uma que já não é possível. */

const AUTOSAVE_DB='retrofoot98_snapshots';
const AUTOSAVE_STORE='fotos';
const AUTOSAVE_MANTER=3;            // fotos de jornada mantidas por save/sala (as mais recentes)
const AUTOSAVE_TEMPORADAS=3;        // fotos de fim de temporada mantidas (as mais recentes)

function autoSaveLigado(){
  if(typeof CL==='undefined' || !CL.options) return true;   // padrão LIGADO pra todo mundo
  return (CL.options.autoSave||'Sim')!=='Não';
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

/* Tira a foto. `tipo` é 'jornada' (rotativa) ou 'temporada' (fixa, sobrevive à poda).
   Nunca lança: uma falha de disco não pode derrubar o fim de jornada. */
async function autoSaveGuardar(tipo){
  if(!autoSaveLigado()) return null;
  const chave=autoSaveKey(); if(!chave || typeof S==='undefined' || !S) return null;
  try{
    const foto={
      save:chave, tipo:tipo||'jornada', quando:Date.now(),
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
    return foto;
  }catch(e){ console.warn('autoSave guardar:', e&&e.message); return null; }
}

/* poda: mantém as N fotos de jornada mais recentes e as N de fim de temporada mais recentes */
async function autoSavePodar(chave){
  try{
    const todas=await autoSaveLista(chave);
    const sobra=[];
    ['jornada','temporada'].forEach(t=>{
      const limite=(t==='jornada')?AUTOSAVE_MANTER:AUTOSAVE_TEMPORADAS;
      todas.filter(f=>f.tipo===t).slice(limite).forEach(f=>sobra.push(f.id));
    });
    if(!sobra.length) return;
    const {st}=await autoSaveTx('readwrite');
    sobra.forEach(id=>st.delete(id));
  }catch(e){ console.warn('autoSave podar:', e&&e.message); }
}

/* A virada de temporada aconteceu: promove a foto mais recente da temporada que FECHOU a
   permanente. É essa que responde ao "voltar pra última jornada da temporada anterior".
   Se não houver foto daquela temporada (jogador entrou na sala já na virada), não inventa nada. */
async function autoSaveFixarFimDeTemporada(temporadaQueFechou){
  if(!autoSaveLigado()) return null;
  const chave=autoSaveKey(); if(!chave) return null;
  try{
    const todas=await autoSaveLista(chave);
    const ja=todas.find(f=>f.tipo==='temporada' && f.season===temporadaQueFechou);
    if(ja) return ja;                                              // virada reprocessada: não duplica
    const alvo=todas.find(f=>f.tipo==='jornada' && f.season===temporadaQueFechou);
    if(!alvo) return null;
    const {st}=await autoSaveTx('readwrite');
    alvo.tipo='temporada';
    await autoSavePedido(st.put(alvo));
    await autoSavePodar(chave);
    console.log('auto-save: foto da temporada '+temporadaQueFechou+' (jornada '+alvo.round+') fixada');
    return alvo;
  }catch(e){ console.warn('autoSave fixar:', e&&e.message); return null; }
}

/* GANCHO ÚNICO DE FIM DE JORNADA. Chamado dos caminhos que fecham/adotam uma jornada, tanto no
   solo quanto na Resenha. Detecta a virada de temporada comparando com a foto anterior — assim
   a promoção acontece sem cada chamador ter que saber que houve virada. */
async function autoSaveAoFecharJornada(){
  if(!autoSaveLigado()) return;
  const chave=autoSaveKey(); if(!chave) return;
  const anteriores=await autoSaveLista(chave);
  const ultima=anteriores.filter(f=>f.tipo==='jornada')[0];
  if(ultima && ultima.season===(S.season||0) && ultima.round===(S.round||0)) return;  // já fotografei esta jornada
  if(ultima && (S.season||0) > ultima.season) await autoSaveFixarFimDeTemporada(ultima.season);
  await autoSaveGuardar('jornada');
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
  try{
    const {st}=await autoSaveTx('readonly');
    foto=await autoSavePedido(st.get(id));
  }catch(e){ return {ok:false, erro:e&&e.message}; }
  if(!foto || foto.save!==chave) return {ok:false, erro:'foto não encontrada'};
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
    console.log('auto-save: estado restaurado — temporada '+(S.season||'?')+', jornada '+(S.round||0));
    return {ok:true, foto};
  }catch(e){ return {ok:false, erro:e&&e.message}; }
}

/* rótulo humano de uma foto, pro diálogo de restauração */
function autoSaveRotulo(f){
  const quando=new Date(f.quando);
  const dd=String(quando.getDate()).padStart(2,'0')+'/'+String(quando.getMonth()+1).padStart(2,'0');
  const hh=String(quando.getHours()).padStart(2,'0')+':'+String(quando.getMinutes()).padStart(2,'0');
  const que=(f.tipo==='temporada')
    ? ('Fim da temporada '+(f.season||'?'))
    : ('Temporada '+(f.season||'?')+' · jornada '+((f.round||0)+1));
  return { que, quando:dd+' '+hh, fixa:f.tipo==='temporada' };
}
