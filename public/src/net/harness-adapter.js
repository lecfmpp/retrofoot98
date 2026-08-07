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
    const room={ code:g.code, gameId:g.code, name:g.name, hostId:g.hostId, mode:'sorteio',
      phase:g.phase, participants:parts, seed:g.seed, round:g.round||0,
      deadline:g.ready_deadline||0, paused:!!g.paused, chat:[],
      speedMult:8,   // testes rodam acelerados; convidados herdam do room a cada push (wireNet)
      kickoffLineups:g.kickoff_lineups||null, kickoffAt:g.kickoff_at||null };
    // ponteiro de dia: MESMA derivação do netRefreshRoom de produção
    if(g.day_plan){
      room.dayPlan=g.day_plan;
      const e=g.day_plan[g.day_idx||0]||null;
      room.day = e ? { idx:g.day_idx||0, moment:g.day_moment||'escalando',
                       round:e.r, comp:e.comp, cupIdx:e.idx, dia:e.dia, total:g.day_plan.length } : null;
    }
    return room;
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
     e o servidor só grava — mesmo papel do host_assign_seat de produção.
     RIG DE TESTE: o runner pode pedir divisão específica (__HDIV) e sorteio arranjado
     (__HRIG='cups': assento 1 = clube brasileiro da Libertadores 2026, assento 2 = da
     Sul-Americana), pra um cenário exercitar as rodadas de copa de verdade. */
  NET.drawClubs=async function(){
    const P=window.parent||{};
    const div=P.__HDIV || ((typeof resolveRoomDivision==='function')?resolveRoomDivision():'D');
    const pool=((typeof resenhaStartClubs==='function')?resenhaStartClubs(div):[]).map(c=>c.id);
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    const flat=obj=>Object.values(obj).flat().filter(x=>typeof x==='string');     // só ids brasileiros
    const libs=(typeof LIBERTADORES_GROUPS_2026!=='undefined')?flat(LIBERTADORES_GROUPS_2026):[];
    const sulas=(typeof SULAMERICANA_GROUPS_2026!=='undefined')?flat(SULAMERICANA_GROUPS_2026):[];
    if(P.__HRIG==='cups'){
      const lib=pool.find(id=>libs.includes(String(id)));
      const sula=pool.find(id=>sulas.includes(String(id)) && id!==lib);
      if(lib&&sula){ const rest=pool.filter(id=>id!==lib&&id!==sula); pool.length=0; pool.push(lib, sula, ...rest);
        console.log('[harness] rig cups: assento1='+lib+' (Libertadores) assento2='+sula+' (Sul-Americana)'); }
      else console.warn('[harness] rig cups: não achei clubes das copas no pool da divisão '+div);
    }
    /* RIG 'sem-copas': os DOIS humanos fora das continentais — o caso exato que o usuário relatou
       ("testei com dois usuários que não jogam a libertadores e ficou travado"). É o mais duro dos
       cenários: ninguém tem partida nas copas continentais, então TUDO que eles fazem nesses dias é
       assistir — e assistir junto é justamente o que vinha falhando. */
    if(P.__HRIG==='sem-copas'){
      const fora=pool.filter(id=>!libs.includes(String(id)) && !sulas.includes(String(id)));
      if(fora.length>=2){ const rest=pool.filter(id=>id!==fora[0]&&id!==fora[1]);
        pool.length=0; pool.push(fora[0], fora[1], ...rest);
        console.log('[harness] rig sem-copas: assentos '+fora[0]+' e '+fora[1]+' (nenhuma continental)'); }
      else console.warn('[harness] rig sem-copas: não achei 2 clubes fora das continentais na divisão '+div);
    }
    SRV.assignSeats(NET.gameId, pool);
  };
  NET.setMyClub=async function(clubId){ SRV.setClub(NET.gameId, uid, clubId); };
  NET.mySeat=async function(){ const g=SRV.snapshot(NET.gameId); return (g&&g.seats[uid])?JSON.parse(JSON.stringify(g.seats[uid])):null; };

  /* máquina de fases — semântica idêntica às RPCs (ver runner) */
  /* o anfitrião grava o calendário de dias da sala ao começar — mesmo momento e mesma regra do
     netSeedDayPlan de produção (a folha única monta; o servidor só guarda) */
  NET.start=function(){
    if(!NET.isHost) return;
    try{
      if(typeof WORLD_RULES!=='undefined' && WORLD_RULES.buildDayPlan){
        const tog=(typeof S!=='undefined' && S && S.compToggle)||{};
        const cups=(typeof allCupKeys==='function'?allCupKeys():[]).filter(k=>tog[k]!==false);
        const epoch=(typeof seasonEpoch==='function')?seasonEpoch():null;
        SRV.dayPlanSet(NET.gameId, WORLD_RULES.buildDayPlan(cups, epoch));
      }
    }catch(e){ console.warn('[harness] dayPlanSet:', e&&e.message); }
    SRV.openSeason(NET.gameId);
  };
  NET.dayPointer=async function(){ return SRV.dayCurrent(NET.gameId); };
  NET.dayDone=async function(idx, moment){ return SRV.dayAdvanceIfAllDone(NET.gameId, idx, moment); };
  NET.dayAck=async function(idx, moment, ignorarSeg){ return SRV.dayAck(NET.gameId, uid, idx, moment, ignorarSeg||0); };
  NET.dayStatus=async function(){ return SRV.dayStatus(NET.gameId); };
  NET.daySync=async function(round){ return SRV.daySync(NET.gameId, round|0); };
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

  /* RESOLVEDOR DE DOIS ESTÁGIOS (v2) — porta a semântica do resolve-round de produção usando o
     PRÓPRIO motor do jogo, no cliente HOST: fechar a quarta resolve só as copas da jornada e vira
     o estágio pra 'league' (rodada NÃO muda); fechar o sábado roda a rodada completa (playRound)
     e abre a semana seguinte na quarta se ela tiver copa. É o que faz o harness exercitar a
     semana quarta/sábado real — onde moram os bugs de copa. */
  NET.resolveRound=async function(round, stage){
    if(!NET.isHost) return { error:'harness: só o host resolve' };
    try{
      if((S.round||0)!==round) return { ok:true, already:true, round:S.round };
      const map=NET.collectHumanResults(round);
      const keys=['copaBrasil'].concat((typeof groupCupKeys==='function')?groupCupKeys():[]);
      if(stage==='cup'){
        if(S.roundStage!=='cup') return { ok:true, already:true, round:S.round, stage:S.roundStage||'league' };
        advancePendingCups();
        S._cupResolvedRound=S._cupResolvedRound||{};
        keys.forEach(k=>{ if(S.cups&&S.cups[k]&&cupTickMatchesRound(k,S.round)) S._cupResolvedRound[k]=S.round; });
        S.roundStage='league';
        await NET.saveGame({S, round:S.round});
        return { ok:true, round:S.round, stage:'league' };
      }
      const uf=(typeof userFixture==='function')?userFixture():null;
      const myKey=uf?uf[0]+'-'+uf[1]:null;
      const userResult=(myKey&&map[myKey])?map[myKey]:null;
      if(typeof advancePlayerAvailability==='function') advancePlayerAvailability();
      playRound(userResult, map);
      const temCopa=keys.some(k=>S.cups&&S.cups[k]&&cupTickMatchesRound(k,S.round));
      S.roundStage=temCopa?'cup':'league';
      await NET.saveGame({S, round:S.round});
      return { ok:true, round:S.round, stage:S.roundStage };
    }catch(e){ console.error('[harness] resolveRound:', e); return { error:String(e&&e.message||e) }; }
  };
  NET.getDivisionClubs=null;                     // clubes reais indisponíveis -> fallback procedural
  NET.saveSoloGame=async()=>{}; NET.loadSoloSave=async()=>null; NET.listSoloSaves=async()=>[];
  NET.saveInbox=async()=>{}; NET.loadInbox=async()=>null; NET.deleteSoloSave=async()=>{};

  /* ---- INSTRUMENTAÇÃO: espelha no runner cada passo relevante do fluxo de copa/fase ----
     (só no harness; produção nunca carrega este arquivo) */
  const HLOG=(m)=>{ try{ if(window.parent.__HLOG) window.parent.__HLOG(HUID, m); }catch(e){} };
  function wrap(name, fn, comStack){
    const orig=window[name];
    if(typeof orig!=='function') return;
    window[name]=function(){ try{
        let extra=fn?(' '+fn.apply(this,arguments)):'';
        if(comStack){ const st=(new Error().stack||'').split('\n').slice(2,4).map(s=>s.trim().replace(/@.*\/src\//,'@').replace(/https?:\S+/,'').trim()).join(' <- '); extra+=' ['+st+']'; }
        HLOG(name+'('+Array.from(arguments).slice(0,3).map(a=>typeof a==='object'?'{…}':String(a)).join(',')+')'+extra); }catch(e){}
      return orig.apply(this, arguments); };
  }
  setTimeout(()=>{ // depois de tudo carregado
    // LOCALSTORAGE ISOLADO POR CLIENTE: os dois iframes dividem a mesma origem, então o balde de
    // marcadores persistidos (drawSeenKey) era compartilhado — o A lia o "etapa cumprida" do B e
    // pulava a própria rodada. Em produção cada jogador tem a sua máquina; aqui, prefixo por uid.
    if(typeof window.drawSeenKey==='function'){
      const _dsk=window.drawSeenKey;
      window.drawSeenKey=function(){ return 'h:'+HUID+':'+_dsk(); };
    }
    wrap('cupMarkSeen');
    wrap('startCupRound', null, true);
    wrap('startCupSpectate');
    wrap('finishCupSpectate');
    wrap('finishCupLiveMatch');
    wrap('liveDone', null, true);
    wrap('showCupIdleMessage');
    wrap('advanceGroupStageRound');
    wrap('advancePendingCups', ()=>'@round='+(typeof S!=='undefined'&&S?S.round:'?'));
    wrap('resolveCupRoundRest');
    wrap('onlineMarkStageDone', ()=>'@key='+(typeof onlineStageKey==='function'?onlineStageKey():'?'));
    wrap('onlineMarkReady');
    wrap('playRound', ()=>'@round='+(typeof S!=='undefined'&&S?S.round:'?'));
    wrap('showCupIntro', null, true);
    wrap('startCupLiveMatch', null, true);
    const _rr=NET.reopenReady; NET.reopenReady=async function(){ HLOG('NET.reopenReady()'); return _rr.apply(this,arguments); };
    const _res=NET.resolveRound; NET.resolveRound=async function(r,st){ HLOG('NET.resolveRound('+r+','+st+')'); return _res.apply(this,arguments); };
  }, 500);

  /* atalhos que o runner usa pra dirigir este cliente sem passar pelas telas de conta */
  window.__h={
    uid, state(){ const d=(NET.room&&NET.room.day)||null; return {
      // o dia que ESTE cliente está lendo do servidor, e o que ele decidiu com isso.
      // diaComp = o que o servidor manda; diaVale = se o cliente está obedecendo ou caiu no
      // palpite local (roomDay() devolvendo null é a porta de divergência que estamos caçando)
      diaIdx:d?d.idx:null, diaComp:d?d.comp:null, diaRound:d?d.round:null,
      // diaVale = o cliente NÃO caiu no palpite local. diaHold = ele está segurando por desacordo
      // (que é obedecer, não divergir) — mas hold que não passa nunca é sala congelada, então o
      // cenário conta os dois: um sem o outro esconderia metade da verdade.
      diaVale:!!(typeof roomDay==='function' && roomDay()),
      diaHold:!!(typeof roomDay==='function' && (roomDay()||{}).hold),
      screen:CL.screen, round:(typeof S!=='undefined'&&S)?S.round:null,
      stage:(typeof S!=='undefined'&&S)?(S.roundStage||null):null,
      cupKey:(CL.live&&CL.live.cup)?CL.live.cup.key:null,
      myClub:CL.clubId||null,
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
    fast(){ // acelera qualquer tela de passagem (cerimônias, apresentações, pausa, classificações)
      if(CL.live) CL.speedMult=8;   // cobre as entradas automáticas (rede de segurança), onde ninguém chamou jogar()
      // O Chrome estrangula timers de iframe (~1/s): a partida ao vivo levaria uma era. Puxa o
      // relógio na mão — o mesmo liveTick de produção, só que mais vezes por empurrão do runner.
      if(CL.live && CL.live.paused && typeof liveContinue==='function'){ try{ liveContinue(); }catch(e){} } // intervalo/pausas
      // ERA 20 TICKS POR EMPURRÃO. Uma partida tem ~90 minutos de jogo; a 20 ticks a cada 250ms do
      // runner, cada partida levava minutos de relógio real — e um cenário que atravessa 4 jornadas
      // com copas (9 sequências ao vivo × 2 clientes) estourava o próprio orçamento antes de chegar
      // ao que ele mede. O teto alto termina a partida no primeiro empurrão; o laço para sozinho em
      // 'done' ou 'paused' (intervalo), então nada é pulado — só deixa de esperar à toa.
      if(CL.live && !CL.live.done && !CL.live.paused && typeof liveTick==='function'){
        for(var i=0;i<400 && CL.live && !CL.live.done && !CL.live.paused;i++){ try{ liveTick(); }catch(e){ break; } }
      }
      try{ if(CL.net&&CL.net.draw&&!CL.net.draw.done) clResenhaDrawSkip(); }catch(e){}
      try{ if(CL.screen==='cupdraw'&&typeof clCupDrawSkip==='function') clCupDrawSkip(); }catch(e){}
      try{ if(CL.screen==='boasvindas') clBoasVindasContinuar(); }catch(e){}
      try{ if(CL.screen==='classif'||CL.screen==='seatclassif') clClassifContinue(); }catch(e){}
      try{ if(CL.screen==='cupclassif') cupClassifContinue(); }catch(e){}
      try{ if(CL._cupIntro&&typeof clCupIntroGo==='function') clCupIntroGo(); }catch(e){}
      try{ if(CL._leagueIntro&&typeof clLeagueIntroGo==='function') clLeagueIntroGo(); }catch(e){}
      try{ if(CL.screen==='waitround'&&CL._adCont&&typeof clAdSkip==='function') clAdSkip(); }catch(e){}
    },
    jogar(){ if(!CL.tacticChosen){ try{ clSelFormation('auto'); }catch(e){} CL.tacticChosen=true; }
      CL.speedMult=8;   // o speedMult da sala só cobre convidados; o host jogaria a 1x e o teste levaria uma era
      try{ clJogar(); }catch(e){ console.warn('[harness] clJogar:', e&&e.message); } },
    speedUp(){ CL.speedMult=8; }
  };
})();
