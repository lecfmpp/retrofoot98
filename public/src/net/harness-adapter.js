/* ================================================================
   HARNESS DE DOIS CLIENTES — adapter de transporte para testes.
   Carregado SÓ quando a página roda com ?harness=<uid> DENTRO do
   runner (public/harness/index.html), que expõe window.__HSRV — um
   "Supabase de mentira" com a MESMA semântica das RPCs de produção
   (arm_ready_timer / advance_phase_if_expired / reopen_ready /
   start_running) e das colunas de games/game_seats.

   O que é REAL aqui: TODO o jogo (engine, UI, local-transport, o
   onlineTimerLoop, publicação de resultados, adoção/reconcile). O
   que é mock: só o transporte (este arquivo) e o servidor (runner).
   NET.resolveRound NÃO é definido de propósito: sem ele, o host
   fecha a rodada pelo caminho local completo (_commitLeagueRound) e
   os convidados adotam via loadGame — código de produção dos dois
   lados. Limite conhecido do v1: sem resolve-round não há semana de
   dois estágios (S.roundStage nunca é criado) — o harness testa o
   lockstep de entrada/saída, cerimônias, anti-replay e telas
   pós-rodada; a quarta-feira dedicada fica pro v2.
   ================================================================ */
(function(){
  if(typeof window==='undefined') return;
  const q=new URLSearchParams(location.search);
  const HUID=q.get('harness');
  if(!HUID) return;
  const SRV = (window.parent && window.parent!==window) ? window.parent.__HSRV : null;
  if(!SRV){ console.error('[harness] runner ausente (window.parent.__HSRV) — adapter inerte'); return; }

  const uid='h_'+HUID;
  const myName='TREINADOR '+HUID.toUpperCase();
  console.log('[harness] cliente '+uid+' ligado ao servidor de mentira');

  /* ---- tradução servidor -> NET.room (mesma forma que netMergeParticipants monta) ---- */
  function roomFromGame(g){
    if(!g) return null;
    const parts=Object.keys(g.players).map(id=>{ const p=g.players[id]; const seat=g.seats[id]||{};
      return { id, name:p.name, email:p.email||'', confirmed:true, clubId:seat.club_id||null,
        ready:!!seat.is_ready, host:id===g.hostId, online:true,
        busy:!!(seat.busy_until && seat.busy_until>Date.now()) }; });
    return { code:g.code, gameId:g.code, name:g.name, hostId:g.hostId, mode:'sorteio',
      phase:g.phase, participants:parts, seed:g.seed, round:g.round||0,
      deadline:g.ready_deadline||0, paused:!!g.paused, chat:[], speedMult:1,
      kickoffLineups:g.kickoff_lineups||null, kickoffAt:g.kickoff_at||null };
  }
  function refreshClaimed(g){
    NET._claimed={};
    Object.keys(g.seats||{}).forEach(id=>{ const s=g.seats[id]; if(!s||!s.club_id) return;
      NET._claimed[id]={ clubId:s.club_id, ready:!!s.is_ready, name:(g.players[id]||{}).name,
        email:'', busy_until:s.busy_until||null, last_xi:s.last_xi||null, last_tactic:s.last_tactic||null,
        last_result:s.last_result||null, last_result_round:s.last_result_round??null,
        last_cup_result:s.last_cup_result||null, last_cup_round:s.last_cup_round??null,
        last_seen:Date.now() }; });
  }
  function pushState(g){
    if(!g) return;
    NET.room=roomFromGame(g); refreshClaimed(g);
    if(NET.onState){ try{ NET.onState(NET.room); }catch(e){ console.warn('[harness] onState:', e&&e.message); } }
  }
  // o runner chama isto sempre que o estado do servidor muda
  window.__hOnServerUpdate=function(){ const g=SRV.snapshot(NET.gameId); pushState(g); };

  /* ---- superfície NET (sobrescreve o adapter Supabase, que carregou antes) ---- */
  NET.useSupabase=false; NET.uid=uid;
  NET.self={ id:uid, name:myName, email:uid+'@harness' };
  NET.authStatus=()=>({ loggedIn:true, email:uid+'@harness', name:myName });
  NET.authSignOut=async()=>{};

  NET.createRoom=async function(name, host){
    const code=SRV.createGame(name||'HARNESS', uid, host&&host.name||myName);
    NET.gameId=code; NET.code=code; NET.isHost=true;
    pushState(SRV.snapshot(code)); return code;
  };
  NET.joinRoom=async function(code){
    SRV.join(code, uid, myName);
    NET.gameId=code; NET.code=code; NET.isHost=false;
    pushState(SRV.snapshot(code)); return true;
  };
  NET.confirm=function(me){ if(me&&me.name) SRV.rename(NET.gameId, uid, me.name); };
  NET.refreshRoom=async function(){ pushState(SRV.snapshot(NET.gameId)); };
  NET.listJoinRequests=async()=>[]; NET.approveJoin=async()=>{}; NET.kick=function(){};
  NET.inviteLink=()=>location.origin+'/?sala='+NET.gameId;
  NET.sendEmailInvite=async()=>{}; NET.sendChat=async()=>{}; NET.clubOnline=()=>true;
  NET.heartbeatSeen=function(){ SRV.seen(NET.gameId, uid); };

  /* sorteio dos assentos: o HOST monta o pool com o dado real do jogo (resenhaStartClubs)
     e o servidor só grava — mesmo papel do host_assign_seat de produção */
  NET.drawClubs=async function(){
    const div=(typeof resolveRoomDivision==='function')?resolveRoomDivision():'D';
    const pool=((typeof resenhaStartClubs==='function')?resenhaStartClubs(div):[]).map(c=>c.id);
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    SRV.assignSeats(NET.gameId, pool);
  };
  NET.setMyClub=async function(clubId){ SRV.setClub(NET.gameId, uid, clubId); };
  NET.mySeat=async function(){ const g=SRV.snapshot(NET.gameId); return (g&&g.seats[uid])?JSON.parse(JSON.stringify(g.seats[uid])):null; };

  /* máquina de fases — semântica idêntica às RPCs (ver runner) */
  NET.start=function(){ if(NET.isHost) SRV.openSeason(NET.gameId); };
  NET.toRunning=async function(){ if(NET.isHost) SRV.startRunning(NET.gameId); };
  NET.reopenReady=async function(){ SRV.reopenReady(NET.gameId); };
  NET.armReadyTimer=async function(){ SRV.armReadyTimer(NET.gameId); };
  NET.advancePhaseExpired=async function(){ SRV.advanceIfExpired(NET.gameId); };
  NET.pause=async function(){}; NET.setSpeed=async function(){}; NET.setMode=function(){};
  NET.setReady=function(ready){ SRV.setReady(NET.gameId, uid, !!ready); };
  NET.heartbeatBusy=function(){ SRV.busy(NET.gameId, uid, Date.now()+90000); };
  NET.clearBusy=function(){ SRV.busy(NET.gameId, uid, null); };

  /* estado compartilhado (games.shared_state) */
  NET._loadedVersion=0;
  NET.saveGame=async function(payload){
    if(!payload||!payload.S) return;
    SRV.saveShared(NET.gameId, JSON.parse(JSON.stringify(payload.S)), payload.round??payload.S.round??0);
  };
  NET.loadGame=async function(){
    const sh=SRV.loadShared(NET.gameId); if(!sh) return null;
    NET._loadedVersion=sh.version; return { S: JSON.parse(JSON.stringify(sh.S)) };
  };

  /* publicações por assento */
  NET.publishLineup=function(xi,tactic){ SRV.seatPatch(NET.gameId, uid, { last_xi:(xi||[]).slice(), last_tactic:tactic||'equilibrado' }); };
  NET.publishResult=function(round,res){ SRV.seatPatch(NET.gameId, uid, { last_result:res||null, last_result_round:round }); };
  NET.publishCupResult=function(round,res){ SRV.seatPatch(NET.gameId, uid, { last_cup_result:res||null, last_cup_round:round }); };
  NET.markCupDone=async function(round){
    const g=SRV.snapshot(NET.gameId); const s=g&&g.seats[uid];
    if(s && s.last_cup_round===round) return;                      // nunca sobrescreve resultado publicado
    SRV.seatPatch(NET.gameId, uid, { last_cup_round:round, last_cup_result:null });
  };
  NET.publishBudget=function(v){ SRV.seatPatch(NET.gameId, uid, { budget:v }); };
  NET.allHumanResultsIn=function(round){
    const g=SRV.snapshot(NET.gameId); if(!g) return false;
    return Object.keys(g.seats).every(id=>{ const s=g.seats[id];
      return !s.club_id || s.last_result_round===round; });
  };
  NET.collectHumanResults=function(round){
    const g=SRV.snapshot(NET.gameId); const map={}; if(!g) return map;
    Object.keys(g.seats).forEach(id=>{ const s=g.seats[id];
      if(s && s.last_result_round===round && s.last_result && s.last_result.h!=null)
        map[s.last_result.h+'-'+s.last_result.a]=s.last_result; });
    return map;
  };

  /* apito/streams: snapshot vem do servidor; transmissão humano-a-humano fica de fora no v1
     (o jogo já tem fallback real pra stream ausente — é esse caminho que roda aqui) */
  NET.fetchKickoff=async function(){ const g=SRV.snapshot(NET.gameId);
    if(g&&NET.room){ NET.room.kickoffLineups=g.kickoff_lineups||null; NET.room.kickoffAt=g.kickoff_at||null; } };
  NET.fetchRoundStreams=async function(){ return null; };
  NET.broadcastKickoff=function(){}; NET.broadcastMatch=function(){}; NET.broadcastDecision=function(){};

  /* sem servidor de verdade, sem edge functions */
  delete NET.resolveRound;
  NET.getDivisionClubs=null;                     // clubes reais indisponíveis -> fallback procedural
  NET.saveSoloGame=async()=>{}; NET.loadSoloSave=async()=>null; NET.listSoloSaves=async()=>[];
  NET.saveInbox=async()=>{}; NET.loadInbox=async()=>null; NET.deleteSoloSave=async()=>{};

  /* atalhos que o runner usa pra dirigir este cliente sem passar pelas telas de conta */
  window.__h={
    uid, state(){ return { screen:CL.screen, round:(typeof S!=='undefined'&&S)?S.round:null,
      played:CL._playedRound, stageDone:CL._stageDone||{}, live:!!CL.live,
      netStep:CL.net&&CL.net.step||null, online:CL.online||false }; },
    /* espelha a entrada de produção: no lobby o cliente ainda NÃO está online (CL.online=false,
       tela 'online') — é a transição de fase do wireNet que dispara o reveal e só o
       onlineBeginSeason liga o online de verdade. O atalho anterior ligava CL.online no lobby e
       o cliente ocioso armava/vencia o relógio em ciclo antes de o jogo existir. */
    hostCreate(roomName){ CL.mgr=myName; CL.online=false;
      return NET.createRoom(roomName, NET.self).then(code=>{ wireNet();
        CL.screen='online'; CL.net={ step:'lobby', roomName:roomName, name:myName }; cdraw(); return code; }); },
    join(code){ CL.mgr=myName; CL.online=false;
      return NET.joinRoom(code).then(()=>{ wireNet();
        CL.screen='online'; CL.net={ step:'lobby', name:myName }; cdraw(); return true; }); },
    lobbyStart(){ clLobbyStart(); },
    fast(){ // acelera qualquer cerimônia em cena (sorteio da Resenha / cerimônias de copa)
      try{ if(CL.net&&CL.net.draw&&!CL.net.draw.done) clResenhaDrawSkip(); }catch(e){}
      try{ if(CL.screen==='cupdraw'&&typeof clCupDrawSkip==='function') clCupDrawSkip(); }catch(e){}
      try{ if(CL.screen==='boasvindas') clBoasVindasContinuar(); }catch(e){}
      try{ if(CL.screen==='classif'||CL.screen==='seatclassif') clClassifContinue(); }catch(e){}
      try{ if(CL.screen==='cupclassif') cupClassifContinue(); }catch(e){}
    },
    jogar(){ if(!CL.tacticChosen){ try{ clSelFormation('auto'); }catch(e){} CL.tacticChosen=true; }
      try{ clJogar(); }catch(e){ console.warn('[harness] clJogar:', e&&e.message); } },
    speedUp(){ CL.speedMult=8; }
  };
})();
