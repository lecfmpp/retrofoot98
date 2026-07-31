/* ================================================================
   ELIFOOT 2026 — camada ONLINE (pele Clássica)
   Transporte local (BroadcastChannel + localStorage) que sincroniza
   entre abas do mesmo navegador AGORA, com a MESMA API que um adapter
   Supabase usaria depois (host-autoritativo).
   Fluxo: conta -> abrir sala -> convite (WhatsApp +55) -> lobby
   (participantes Confirmado/Não) -> modo Sorteio | Anfitrião escolhe ->
   Começar -> rodada ao vivo com timer 60s (apito nos últimos 10s) e
   botão Pausar (só anfitrião).
   ================================================================ */
const NET = {
  code:null, isHost:false, self:null, room:null, bc:null, onState:null, onChat:null, useSupabase:false,
  _key(){ return 'elifoot2026_room_'+this.code; },
  _persist(){ try{ localStorage.setItem(this._key(), JSON.stringify(this.room)); }catch(e){} },
  _open(){ try{ if(this.bc) this.bc.close(); this.bc=new BroadcastChannel('elifoot2026_'+this.code); this.bc.onmessage=(e)=>this._recv(e.data); }catch(e){ this.bc=null; } },
  _recv(m){ if(!m) return;
    if(m.t==='state'){ this.room=m.room; this._persist(); if(this.onState) this.onState(this.room); }
    else if(m.t==='chat'){ if(this.room){ this.room.chat=(this.room.chat||[]).concat(m.msg).slice(-120); } if(this.onChat) this.onChat(m.msg); if(this.onState) this.onState(this.room); }
    else if(m.t==='join'){ if(this.isHost){ this._merge(m.p); this._push(); } }
    else if(m.t==='kick'){ // expulso pelo anfitrião (fallback local)
      if(this.self && m.uid===this.self.id){ this._onKicked(); return; }
      if(this.room) this.room.participants=this.room.participants.filter(p=>p.id!==m.uid);
      if(typeof CL!=='undefined' && CL.humans && m.clubId) delete CL.humans[m.clubId];
      if(this.onState) this.onState(this.room); }
    else if(m.t==='hello'){ if(this.isHost) this._push(); } },
  _onKicked(){ this.room=null; this.isHost=false; this.onState=null; this.onChat=null;
    if(typeof CL!=='undefined'){ CL.online=false; CL.humans={}; CL.screen='abertura'; }
    if(typeof toastC==='function') toastC('⚠ Você foi removido da sala pelo anfitrião.');
    if(typeof cdraw==='function') cdraw(); },
  kick(uid, clubId){ if(!this.isHost || !this.room || !uid || (this.self&&uid===this.self.id)) return;
    this.room.participants=this.room.participants.filter(p=>p.id!==uid);
    if(typeof CL!=='undefined' && CL.humans && clubId) delete CL.humans[clubId];
    try{ if(this.bc) this.bc.postMessage({t:'kick',uid,clubId}); }catch(e){}
    this._push(); },
  _push(){ this._persist(); try{ if(this.bc) this.bc.postMessage({t:'state',room:this.room}); }catch(e){} if(this.onState) this.onState(this.room); },
  gen(){ let s=''; const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; for(let i=0;i<5;i++) s+=A[Math.floor(Math.random()*A.length)]; return s; },
  _merge(p){ if(!this.room) return; const i=this.room.participants.findIndex(x=>x.id===p.id);
    if(i>=0) this.room.participants[i]=Object.assign({},this.room.participants[i],p); else this.room.participants.push(p); },
  createRoom(name, host){ this.code=this.gen(); this.isHost=true; this.self=host;
    this.room={ code:this.code, name, hostId:host.id, mode:'sorteio', phase:'lobby',
      participants:[{id:host.id,name:host.name,email:host.email,confirmed:true,clubId:null,ready:false,host:true}],
      seed:(Math.random()*1e9)>>>0, round:0, deadline:0, paused:false, chat:[] };
    this._open(); this._push(); return this.code; },
  joinRoom(code, me){ this.code=code; this.isHost=false; this.self=me; this._open();
    try{ const raw=localStorage.getItem(this._key()); if(raw) this.room=JSON.parse(raw); }catch(e){}
    try{ if(this.bc) this.bc.postMessage({t:'hello'}); }catch(e){}
    return true; },
  confirm(me){ this.self=Object.assign({},this.self,me);
    const p={id:me.id,name:me.name,email:me.email,confirmed:true,clubId:null,ready:false,host:this.isHost};
    if(this.isHost){ this._merge(p); this._push(); }
    else { this._merge(p); try{ this.bc.postMessage({t:'join',p}); }catch(e){} if(this.onState) this.onState(this.room); } },
  _hostPush(fn){ if(this.isHost){ fn(); this._push(); } else { /* peça ao host via join com o campo alterado */ } },
  setMode(mode){ if(this.isHost){ this.room.mode=mode; this._push(); } },
  assignClub(pid,clubId){ const isSelf=this.self&&pid===this.self.id; if(!this.isHost && !isSelf) return; const p=this.room.participants.find(x=>x.id===pid); if(p){ p.clubId=clubId; this._push(); } },
  drawClubs(clubIds){ if(!this.isHost) return; const pool=clubIds.slice(); for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    this.room.participants.forEach((p,i)=>{ p.clubId=pool[i]; }); this._push(); },
  setReady(ready, clubId){ const id=this.self.id; const upd={id,ready,clubId, name:this.self.name, email:this.self.email, confirmed:true, host:this.isHost};
    if(this.isHost){ this._merge(upd); this._push(); } else { this._merge(upd); try{ this.bc.postMessage({t:'join',p:upd}); }catch(e){} if(this.onState) this.onState(this.room); } },
  start(){ if(!this.isHost) return; this.room.phase='ready'; this.room.deadline=Date.now()+60000; this.room.paused=false; this.room.participants.forEach(p=>p.ready=false); this._push(); },
  pause(){ if(!this.isHost) return; if(this.room.paused){ this.room.deadline=Date.now()+(this.room._left||10000); this.room.paused=false; } else { this.room._left=Math.max(1000,(this.room.deadline||0)-Date.now()); this.room.paused=true; } this._push(); },
  toRunning(){ if(!this.isHost) return; this.room.phase='running'; this._push(); },
  reopenReady(){ if(this.isHost && this.room && this.room.phase==='running') this.start(); }, // fallback local do cronômetro soberano
  toLobby(){ if(this.isHost){ this.room.phase='lobby'; this.room.round=(this.room.round||0)+1; this.room.deadline=0; this.room.participants.forEach(p=>p.ready=false); this._push(); } },
  sendChat(text, clubId){ const msg={id:this.self.id,name:this.self.name,clubId,text,ts:Date.now()};
    if(this.isHost){ this.room.chat=(this.room.chat||[]).concat(msg).slice(-120); this._push(); }
    else { this.room && (this.room.chat=(this.room.chat||[]).concat(msg).slice(-120)); try{ this.bc.postMessage({t:'chat',msg}); }catch(e){} if(this.onState) this.onState(this.room); } },
  gameURL(){ try{ return location.origin+location.pathname; }catch(e){ return ''; } },
  inviteLink(){ return this.gameURL()+'?sala='+this.code; },
  waLink(phoneDigits){ const num='55'+String(phoneDigits||'').replace(/\D/g,''); const txt=encodeURIComponent('Bora jogar RetroFoot98 comigo! 🟢 Entra na minha sala "'+((this.room&&this.room.name)||'')+'": '+this.inviteLink()); return 'https://wa.me/'+num+'?text='+txt; },
};

/* ---- chat da liga (visível no lobby e como doca no hub) ---- */
function chatMsgsHTML(){ const room=NET.room; const msgs=(room&&room.chat)||[];
  if(!msgs.length) return '<div class="cl-chat-empty">Nenhuma mensagem ainda. Diga oi! 👋</div>';
  return msgs.slice(-60).map(m=>{ const c=m.clubId?clubOf(m.clubId):null; const col=c?c.color:'#666';
    return `<div class="cl-chat-msg"><span class="cl-chat-who" style="color:${col}">${escC((m.name||'').split(' ')[0])}:</span> <span class="cl-chat-txt">${escC(m.text)}</span></div>`; }).join(''); }
function clChatSend(inputId){ const el=document.querySelector('#'+inputId); if(!el) return; const text=(el.value||'').trim(); if(!text) return;
  el.value='';
  Promise.resolve(NET.sendChat(text, CL.clubId||null)).then(()=>{ renderChatBoxes(); }).catch(e=>{ toastC('⚠ Mensagem não enviada: '+(e.message||'erro desconhecido')); });
}
function clChatKey(e,inputId){ if(e.key==='Enter'){ clChatSend(inputId); } }
function renderChatBoxes(){ const a=document.querySelector('#cl-chat-msgs-lobby'); if(a){ a.innerHTML=chatMsgsHTML(); a.scrollTop=a.scrollHeight; }
  const b=document.querySelector('#cl-chat-msgs-dock'); if(b){ b.innerHTML=chatMsgsHTML(); b.scrollTop=b.scrollHeight; } }
function chatLobbyHTML(){ return `<fieldset class="cl-chatbox"><legend>💬 Chat da sala</legend>
  <div class="cl-chat-msgs" id="cl-chat-msgs-lobby">${chatMsgsHTML()}</div>
  <div class="cl-chat-in"><input id="cl-chat-input-lobby" class="cl-input cl-chat-input" placeholder="Escreva uma mensagem..." onkeydown="clChatKey(event,'cl-chat-input-lobby')">${btn('Enviar',"clChatSend('cl-chat-input-lobby')",{cls:'cl-btn-mini'})}</div>
</fieldset>`; }
function clChatToggle(){ CL.chatOpen=!CL.chatOpen; if(CL.chatOpen) CL.chatUnread=0; if(typeof renderChatDock==='function') renderChatDock(); else cdraw(); }
/* HOST GLOBAL do chat: a doca vive num container fixo em <body>, re-renderizado a CADA cdraw —
   assim o chat aparece em TODAS as telas do jogo online (principal, ao vivo, classificação,
   sorteio de copa...), não só na tela principal. No lobby (CL.screen==='online') o chat já está
   embutido na própria tela, então lá o host fica vazio. */
function renderChatDock(){
  if(typeof document==='undefined') return;
  let host=document.getElementById('cl-chatdock-host');
  const show = CL.online && CL.screen!=='online';
  if(!show){ if(host){ host.innerHTML=''; host.className=''; } return; }
  if(!host){ host=document.createElement('div'); host.id='cl-chatdock-host'; document.body.appendChild(host); }
  host.className = (CL.screen==='main') ? 'onmain' : ''; // no mobile, na tela principal sobe pra não bater na barra de status/Jogar
  host.innerHTML = chatDockHTML();
}
function chatDockHTML(){ if(!CL.online) return '';
  const unread=CL.chatUnread||0;
  const badge=(!CL.chatOpen && unread>0) ? `<span class="cl-chatdock-badge" title="${unread} nova(s) mensagem(ns)">${unread>99?'99+':unread}</span>` : '';
  return `<div class="cl-chatdock ${CL.chatOpen?'open':''} ${(!CL.chatOpen&&unread>0)?'has-unread':''}">
    <div class="cl-chatdock-bar" onclick="clChatToggle()"><span class="cl-chatdock-lbl">💬 Chat da Liga${badge}</span><span class="cl-chatdock-caret">${CL.chatOpen?'▾':'▴'}</span></div>
    ${CL.chatOpen?`<div class="cl-chatdock-body">
      <div class="cl-chat-msgs" id="cl-chat-msgs-dock">${chatMsgsHTML()}</div>
      <div class="cl-chat-in"><input id="cl-chat-input-dock" class="cl-input cl-chat-input" placeholder="Escreva uma mensagem..." onkeydown="clChatKey(event,'cl-chat-input-dock')">${btn('➤',"clChatSend('cl-chat-input-dock')",{cls:'cl-btn-mini'})}</div>
    </div>`:''}
  </div>`; }

/* ================= COMPARTILHAR — print da tela num quadro 1080x1350 =================
   Tira um screenshot real da tela atual (html2canvas), arredonda os cantos e centraliza
   num quadro 1080x1350 (formato de story/feed) com fundo verde da marca e um respiro
   entre o print e a borda. Os próprios botões de compartilhar (.cl-noshot) são omitidos. */
function roundRectPath(ctx,x,y,w,h,r){ r=Math.min(r,w/2,h/2); ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function waitForLib(check,timeoutMs){ return new Promise(res=>{ if(check())return res(true);
  const t0=Date.now(); const iv=setInterval(()=>{ if(check()){clearInterval(iv);res(true);}
    else if(Date.now()-t0>timeoutMs){clearInterval(iv);res(false);} },80); }); }
async function shareScreenshot(){
  try{
    toastC('Gerando imagem...');
    if(!window.html2canvas) await waitForLib(()=>!!window.html2canvas, 6000);
    if(!window.html2canvas){ toastC('⚠ Não foi possível gerar a imagem (sem conexão?).'); return; }
    const el = document.querySelector('.cl-main, .cl-live') || document.querySelector('#c-root');
    const shot = await html2canvas(el, { backgroundColor:null, scale:2, useCORS:true, logging:false,
      ignoreElements:(e)=> e.classList && e.classList.contains('cl-noshot') });
    const W=1080, H=1350, pad=56, radius=42;
    const out=document.createElement('canvas'); out.width=W; out.height=H; const ctx=out.getContext('2d');
    ctx.fillStyle='#2f8f2f'; ctx.fillRect(0,0,W,H);                       // fundo verde da marca
    const availW=W-2*pad, availH=H-2*pad;
    const sc=Math.min(availW/shot.width, availH/shot.height);
    const dw=Math.round(shot.width*sc), dh=Math.round(shot.height*sc);
    const dx=Math.round((W-dw)/2), dy=Math.round((H-dh)/2);
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.4)'; ctx.shadowBlur=34; ctx.shadowOffsetY=12; // sombra suave
    roundRectPath(ctx,dx,dy,dw,dh,radius); ctx.fillStyle='#0b2a14'; ctx.fill(); ctx.restore();
    ctx.save(); roundRectPath(ctx,dx,dy,dw,dh,radius); ctx.clip();         // cantos arredondados
    ctx.drawImage(shot,dx,dy,dw,dh); ctx.restore();
    out.toBlob(blob=>{ if(!blob){ toastC('⚠ Falha ao gerar imagem.'); return; }
      const url=URL.createObjectURL(blob); window.open(url,'share'); toastC('Imagem pronta pra compartilhar!'); });
  }catch(e){ console.warn('shareScreenshot erro:', e); toastC('⚠ '+(e.message||'erro ao gerar imagem')); }
}
/* os 3 botões (time / resultado / classificação) agora usam o mesmo print da tela atual */
function clShareTeam(){ shareScreenshot(); }
function clShareResult(){ shareScreenshot(); }
function clShareStandings(){ shareScreenshot(); }

/* ---------- apito (WebAudio) ---------- */
let NET_AC=null;
function netBeep(freq){ try{ if(!NET_AC) NET_AC=new (window.AudioContext||window.webkitAudioContext)(); const o=NET_AC.createOscillator(),g=NET_AC.createGain();
  o.type='square'; o.frequency.value=freq||880; g.gain.value=0.001; o.connect(g); g.connect(NET_AC.destination); const t=NET_AC.currentTime;
  g.gain.exponentialRampToValueAtTime(0.28,t+0.01); g.gain.exponentialRampToValueAtTime(0.001,t+0.16); o.start(t); o.stop(t+0.17); }catch(e){} }

/* ================= UI ONLINE (pele Clássica) ================= */
function clOnlineStart(){ CL.screen='online'; CL.net={step:'conta',intent:'host',authMode:'login',name:CL.mgr||'',email:'',password:'',roomName:'',phone:''}; wireNet();
  (async ()=>{ await netInitSupabase(); const st=NET.authStatus(); if(st.loggedIn){ CL.net.email=st.email; CL.net.name=st.name; } cdraw(); })(); cdraw(); }
function clOnlineJoin(code){ CL.screen='online'; CL.net={step:'conta',intent:'join',authMode:'login',code:code,name:'',email:'',password:'',phone:''}; wireNet();
  (async ()=>{ await netInitSupabase(); const st=NET.authStatus(); if(st.loggedIn){ CL.net.email=st.email; CL.net.name=st.name; } cdraw(); })(); cdraw(); }
function netUid(){ return 'u'+Math.random().toString(36).slice(2,9); }
function wireNet(){ NET.onState=(room)=>{ if(room && room.speedMult && !NET.isHost) CL.speedMult=room.speedMult;
    // CONVIDADO NO LOBBY: quando o anfitrião COMEÇA (a fase sai de 'lobby'), o convidado entra no
    // jogo JUNTO — antes ele ficava preso no "à espera do anfitrião" enquanto o host já jogava.
    if(room && room.phase && room.phase!=='lobby' && !CL.online && CL.screen==='online' && CL.net && CL.net.step==='lobby'){
      // host COMEÇOU: re-lê os assentos (clubes sorteados) e vai pra TELA DE SORTEIO (reveal) antes
      // do jogo. O reveal chama onlineBeginSeason ao terminar.
      (async ()=>{ try{ if(NET.refreshRoom) await NET.refreshRoom(); }catch(e){} startResenhaDraw(); })(); return;
    }
    onlineReconcileIfBehind(room); // itens 1 e 3: mantém todos na MESMA rodada (recarrega se ficou pra trás)
    if(CL.screen==='online'){ renderOnlineInto(); } else { renderChatBoxes(); const rb=document.querySelector('.cl-statusbar'); if(rb && room) rb.outerHTML=onlineStatusSidebar(); }
    if(CL.online && room && room.phase==='running' && CL.screen!=='live'){ onlineRunRound(); } };
  // pedido de entrada mudou (realtime): o anfitrião rebusca os pendentes e re-renderiza o painel na hora
  NET.onJoinReq=()=>{ if(typeof NET==='undefined' || !NET.isHost) return;
    (async ()=>{ try{ CL.pendingJoins=await NET.listJoinRequests(); }catch(e){} clRefreshReqSurfaces(); })(); };
  NET.onChat=(msg)=>{
    const mine = !!(msg && NET.self && msg.id===NET.self.id);
    if(CL.screen==='online'){ renderOnlineInto(); return; } // lobby: chat sempre visível, sem badge
    if(CL.chatOpen){ renderChatBoxes(); return; }           // doca aberta: só atualiza as mensagens (preserva o input)
    // doca fechada: conta como não-lida (menos as minhas), notifica e atualiza o badge da doca
    if(msg && !mine){
      CL.chatUnread=(CL.chatUnread||0)+1;
      if(typeof toastC==='function' && msg.text){ const who=(msg.name||'').split(' ')[0]; toastC('💬 '+who+': '+(msg.text.length>60?msg.text.slice(0,60)+'…':msg.text)); }
    }
    refreshChatDock();
  }; }
/* re-renderiza SÓ a doca do chat (bar + badge) sem redesenhar a tela toda — usado quando chega
   mensagem com a doca fechada (não há input pra preservar). */
function refreshChatDock(){ const d=document.querySelector('.cl-chatdock'); if(d) d.outerHTML=chatDockHTML(); }
/* SINCRONIZAR (botão): força um refetch do estado da sala e reaplica — leva o convidado do lobby
   pro jogo se o anfitrião já começou, e recarrega a rodada se ficou pra trás. Rede de segurança
   caso um evento de Realtime não chegue. */
function clSyncResenha(){ CL.menu=null;
  if(typeof NET==='undefined' || !NET.refreshRoom){ toastC('Sincronização indisponível.'); return; }
  toastC('🔄 Sincronizando com a sala...');
  (async ()=>{ try{ await NET.refreshRoom(); if(CL.screen==='online') cdraw(); }catch(e){ toastC('⚠ '+(e.message||'erro ao sincronizar')); } })();
}
/* SINCRONIZAÇÃO (itens 1 e 3): se este cliente (não-anfitrião) ficou PRA TRÁS da rodada
   autoritativa da sala (ex.: perdeu uma rodada por desconexão), recarrega o estado da sala pra
   voltar pra mesma rodada de todos — em TODAS as competições (liga + copas avançam por S.round).
   Só reconcilia em tela segura (nunca no meio de uma partida/sorteio) e só quando ATRÁS, então
   clientes em dia (e o anfitrião) nunca são afetados, e ninguém perde uma partida em andamento. */
/* RENDER POR-DIVISÃO (F3.5): o mundo compartilhado tem uma divisão "âncora" (S.table/S.sched/
   S.division) + as outras em S.otherDivs. A partir da temporada 2, cada humano pode estar numa
   divisão diferente. Este overlay LOCAL põe a divisão do PRÓPRIO clube como âncora, pra toda a UI
   (tabela, calendário, partida ao vivo) mostrar/jogar a divisão certa. É um transform de visão,
   re-derivado a cada carga do estado (não altera o shared_state do servidor). Idempotente: se o
   clube já está na âncora, não faz nada. */
/* mantém S.divisionClubs (registro divisão -> ids) alinhado com o mundo que o SERVIDOR acabou de
   mandar: a virada de temporada server-side reconstrói S.table/S.otherDivs mas NÃO reescreve
   divisionClubs, que ficaria com a composição da temporada PASSADA e desalinharia DATA.clubs
   (ver syncDataClubsFromState) e tudo que resolve a divisão de um clube por id. Só sobrescreve
   divisão cuja tabela veio de fato preenchida — nunca apaga registro por tabela vazia. */
function syncDivisionClubsFromTables(){
  if(!S) return;
  S.divisionClubs=S.divisionClubs||{};
  const put=(d,tbl)=>{ if(!d||!tbl) return; const ids=Object.keys(tbl); if(ids.length) S.divisionClubs[d]=ids; };
  put(S.division, S.table);
  const od=S.otherDivs||{};
  for(const d in od){ if(od[d]) put(d, od[d].table); }
}
function applyViewerDivision(clubId){
  if(!S || !clubId) return;
  if(S.budgets && S.budgets[clubId]!=null) S.budget = S.budgets[clubId]; // F3.3: caixa do PRÓPRIO clube (sempre, mesmo já sendo âncora)
  if(S.table && S.table[clubId]){ syncDivisionClubsFromTables(); return; } // já sou a âncora (divisão)
  const od=S.otherDivs||{};
  for(const d in od){
    if(od[d] && od[d].table && od[d].table[clubId]){
      const oldAnchor=S.division, oldTable=S.table, oldSched=S.sched;
      S.otherDivs[oldAnchor]={ clubs:Object.keys(oldTable||{}).map(id=>({id})), sched:oldSched, table:oldTable };
      S.division=d; S.table=od[d].table; S.sched=od[d].sched;
      delete S.otherDivs[d];
      syncDivisionClubsFromTables();
      return;
    }
  }
  syncDivisionClubsFromTables();
}
let ONLINE_RECONCILE_BUSY=false;
function onlineReconcileIfBehind(room){
  if(!CL.online || (typeof NET!=='undefined' && NET.isHost) || !room || !S) return;
  if(CL.screen==='live' || CL.live || CL._liveBusy || CL._hotseat || CL.screen==='cupdraw' || CL.screen==='classif' || CL.screen==='seatclassif') return;
  const authRound = room.round||0;
  // Reconcilia sempre que a rodada da sala DIFERE da minha — à frente (rodada normal) OU "pra trás"
  // (nova temporada: a virada leva a rodada de 38 -> 0). Antes só cobria `>`, então na virada o
  // cliente ficava preso na última rodada da temporada velha ("Rodada 39") e nunca adotava a nova
  // divisão. A comparação REAL de "quem está mais novo" é por (temporada, rodada), feita abaixo.
  if(authRound === (S.round||0)) return;           // exatamente a mesma rodada — nada a fazer
  if(ONLINE_RECONCILE_BUSY || typeof NET==='undefined' || !NET.loadGame) return;
  ONLINE_RECONCILE_BUSY=true;
  // mostra o loading JÁ AQUI, antes do await da rede — cobre exatamente a janela onde o
  // convidado ficava vendo a tela ATUAL (podia ser a principal, com dados da rodada VELHA, se
  // ele tivesse ido ver o time enquanto esperava) até o fetch do estado novo terminar. Some só
  // quando a tela de destino (classificação ou principal já atualizada) estiver pronta.
  if(typeof showSyncLoading==='function') showSyncLoading();
  (async ()=>{ try{
    const saved = await NET.loadGame();
    const sState = saved && saved.S;
    const oldSeason = S.season||0;
    const newer = sState && ( (sState.season||0) > oldSeason || ((sState.season||0)===oldSeason && (sState.round||0) > (S.round||0)) );
    if(typeof _prLog==='function') _prLog('GUEST reconcile: authRound='+(room.round||0)+' myRound='+(S.round||0)+' newer='+!!newer);
    if(!newer && typeof hideSyncLoading==='function') hideSyncLoading(); // nada pra adotar afinal -> não trava o loading
    if(newer){
      const isTurnover = (sState.season||0) > oldSeason; // VIRADA de temporada (rodada volta a 0)
      Object.assign(S, sState);
      // o save é do HOST — restaura o MEU clube (senão eu assumo o clube do host no motor)
      S.clubId = CL.clubId;
      applyViewerDivision(CL.clubId);                    // F3.5: renderiza a divisão do PRÓPRIO clube (temporada 2+)
      S.xi = resolveClubXI(CL.clubId);
      if(typeof syncDataClubsFromState==='function') syncDataClubsFromState();
      if(typeof pruneAppliedNetTransfers==='function') pruneAppliedNetTransfers(); // solta as transferências já aplicadas pelo servidor
      if(typeof pruneAppliedNetOffers==='function') pruneAppliedNetOffers();       // idem pras propostas mandadas a outro humano
      if(typeof restoreMyFinances==='function') restoreMyFinances();               // finanças são individuais (ver restoreMyFinances)
      if(typeof settleMyOutgoingOffers==='function') settleMyOutgoingOffers(); // debita o caixa se alguma proposta MINHA foi aceita
      if(typeof applyOwnPendingFinances==='function') applyOwnPendingFinances(); // F3.3: finanças da MINHA rodada (convidado)
      if(typeof applyMyCupPrizes==='function') applyMyCupPrizes(); // cota de fase da Copa do Brasil resolvida pelo servidor
      // ESTABILIDADE DO CARGO (convidado): faltava aqui — só rodava no adopt do ANFITRIÃO
      // (onlineAdoptServerRound) e no caminho solo/fallback (_commitLeagueRound). Sem isto,
      // S.jobSecurity do convidado nunca atualizava (ficava travado no valor inicial) e ele
      // nunca podia ser demitido nem receber convite de outro clube durante a Resenha — a
      // mecânica "funcionava normal no solo" mas não existia pra quem não era o anfitrião.
      if(!S.finished && typeof tickJobSecurity==='function'){ tickJobSecurity(); const je=checkManagerJobEvent(); if(je) CL._pendingManagerEvent=je; }
      if(isTurnover){
        // VIRADA: NÃO mostra a classificação pós-rodada (a tabela nova está zerada e o cliente ficava
        // preso nessa tela sem voltar pro "jogar" -> o outro travava em "esperando"). Vai direto pro
        // main, pronto pra jogar a rodada 1 da temporada nova, na divisão do próprio clube.
        CL._playedRound=-1; CL.screen='main'; CL.tab='jogo';
        // premiação do PRÓPRIO clube (convidado): cada humano vê o SEU resumo, lido de S._prevSeason.
        // Credita ANTES do cdraw pra não perder o dinheiro se o desenho falhar.
        const _sum=(typeof applyMyPrevSeasonPrizes==='function')?applyMyPrevSeasonPrizes():null; if(typeof accrueCareerStats==='function') accrueCareerStats();
        if(typeof hideSyncLoading==='function') hideSyncLoading();
        cdraw();
        if(typeof openPressRoom==='function') openPressRoom(_sum);
        else { const _divLbl=(typeof DIV_LABEL_FULL!=='undefined' && DIV_LABEL_FULL[S.division]) || ('Série '+S.division); toastC('🏆 Nova temporada '+ (S.season||'') +'! Você está na '+_divLbl+'.'); }
      } else {
        toastC('🔄 Sincronizado com a sala (rodada '+((S.round||0)+1)+').');
        // NÃO faz cdraw() aqui: renderizar a tela atual (que pode ser a PRINCIPAL, se o convidado
        // foi ver o time enquanto esperava) fazia a sequência virar tela-inicial -> classificação
        // -> tela-inicial. Vai DIRETO pra classificação (que já desenha a própria tela).
        // Ao espelhar a rodada, o CONVIDADO vê o MESMO que o host: (1) sorteio de copa pendente e
        // depois (2) a CLASSIFICAÇÃO pós-rodada. Ao terminar (Continuar/10s), o loop dispara a próxima.
        const _showClassif=()=>{
          if(typeof hideSyncLoading==='function') hideSyncLoading();
          if(typeof showLiveClassif==='function') showLiveClassif();
          if(typeof checkPendingManagerEvents==='function') checkPendingManagerEvents();
          if(typeof handleResenhaCareer==='function') handleResenhaCareer(); // demissão/convite na Resenha — idem host
        };
        if(typeof queueSeasonCupDrawsIfNew==='function') queueSeasonCupDrawsIfNew(); // convidado enfileira o sorteio novo por conta própria
        if(typeof checkPendingCupDraws==='function' && S._pendingDrawShows && S._pendingDrawShows.length){ checkPendingCupDraws(_showClassif); }
        else _showClassif();
      }
    }
  }catch(e){ console.warn('reconcile:', e && e.message); if(typeof hideSyncLoading==='function') hideSyncLoading(); } finally { ONLINE_RECONCILE_BUSY=false; } })();
}

/* cada tela do fluxo Resenha já retorna o shell completo (wizShell) — sem deskWrap/titleBar */
function renderOnline(){ const n=CL.net||{};
  if(n.step==='escolha') return scResenhaChoice();
  if(n.step==='joincode') return scJoinCode();
  if(n.step==='conta')  return scConta();
  if(n.step==='minhassalas') return scMinhasSalas();
  if(n.step==='sala')   return scSalaHost();
  if(n.step==='midjoin') return scMidJoin();
  if(n.step==='waitapproval') return scWaitApproval();
  if(n.step==='lobby')  return scLobby();
  if(n.step==='reveal') return scResenhaDraw();
  return scConta();
}
/* ---- Modo Resenha (logado): escolher entre CRIAR sala nova (anfitrião) ou ENTRAR por código ---- */
function scResenhaChoice(){
  const rooms=CL.net.myRooms||[];
  const rejoin = rooms.length ? `<button class="cl-wiz-rejoin" onclick="CL.net.step='minhassalas';cdraw()">↻ Você já joga ${rooms.length} Resenha${rooms.length>1?'s':''} — toque pra reentrar</button>` : '';
  return wizShell({
    title:'Modo Resenha', back:'clGoModo()', backLabel:'Voltar ao início',
    contentCls:'cl-wiz-center', actionCls:'cl-wiz-action-c',
    action:`<span class="cl-wiz-hint">Toque num cartão para continuar.</span>`,
    body:`
      <div class="cl-wiz-h">O que você quer fazer?</div>
      <div class="cl-wiz-sub">Jogue online com amigos — cada um assume um clube.</div>
      <div class="cl-wiz-cards">
        <div class="cl-mc-card" onclick="clResenhaCreate()">
          <div class="cl-mc-ic">🏟️</div>
          <div class="cl-mc-t">Criar nova Resenha</div>
          <div class="cl-mc-d">Você vira o anfitrião e convida os amigos com um código.</div>
        </div>
        <div class="cl-mc-card" onclick="clResenhaJoinPrompt()">
          <div class="cl-mc-ic">🔑</div>
          <div class="cl-mc-t">Entrar numa Resenha</div>
          <div class="cl-mc-d">Já tem o código de um amigo? Entre na Resenha dele.</div>
        </div>
      </div>
      ${rejoin}`
  });
}
function clResenhaCreate(){ CL.net.intent='host'; CL.net.step='sala'; cdraw(); }
function clResenhaJoinPrompt(){ CL.net.intent='join'; CL.net.code=''; CL.net.step='joincode'; cdraw(); }
function clResenhaBackChoice(){ CL.net.step='escolha'; cdraw(); }
/* ---- entrar por código ---- */
function scJoinCode(){ const n=CL.net;
  const ok=(n.code||'').length>=4;
  const body=`<div class="cl-wiz-authcard">
      <div class="cl-wiz-authsub" style="text-align:left">Digite o código que o anfitrião te passou.</div>
      <div class="cl-authform">
        <div class="cl-authfield"><label>Código da Resenha</label>
          <input id="cl-focus" class="cl-joincode-in" maxlength="6" placeholder="EX: S9RJH" value="${escC(n.code||'')}" oninput="CL.net.code=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);this.value=CL.net.code;clJoinCodeSync()" onkeydown="if(event.key==='Enter')clJoinCodeGo()"></div>
      </div>
    </div>`;
  return wizShell({
    title:'Entrar numa Resenha', back:'clResenhaBackChoice()', backLabel:'Voltar',
    contentCls:'cl-wiz-top', body, actionCls:'cl-wiz-action-e',
    action: btn('Entrar','clJoinCodeGo()',{icon:'✔',cls:'cl-wiz-cta',dis:!ok})
  });
}
function clJoinCodeSync(){ const b=document.querySelector('.cl-wiz-cta, .cl-btn-ok'); if(b) b.disabled=!((CL.net.code||'').length>=4); }
function clJoinCodeGo(){ const n=CL.net; if(!(n.code&&n.code.length>=4)) return;
  CL.mgr = CL.mgr || n.name;
  clRequestOrJoin(n.code);
}
/* pede pra entrar por código: pré-aprovado (host, já tem assento, convite interno ou pedido já
   aprovado) entra direto; senão cria um pedido pendente e vai pra tela de espera. */
function clRequestOrJoin(code){
  const st=(NET.authStatus?NET.authStatus():{});
  const me={ name: CL.mgr||CL.net.name, email: st.email };
  toastC('Entrando na Resenha...');
  (async ()=>{ try {
    const res = await NET.requestJoin(code, me, clOnJoinDecision);
    if(res && res.entered){ routeAfterJoin(); }
    else { CL.net.code=code; CL.net.pendingName=(res&&res.name)||''; CL.net.step='waitapproval'; cdraw(); }
  } catch(e){ toastC('⚠ '+(e.message||'Não foi possível entrar. Confira o código.')); } })();
}
/* chamado pelo poll quando o anfitrião decide o pedido */
function clOnJoinDecision(status, roomName){
  if(status==='approved'){
    toastC('✓ Entrada aprovada! Entrando...');
    const st=(NET.authStatus?NET.authStatus():{});
    (async ()=>{ try {
      await NET.joinRoom(CL.net.code, { name: CL.mgr||CL.net.name, email: st.email });
      CL.net.pendingName=null; routeAfterJoin();
    } catch(e){ toastC('⚠ '+e.message); } })();
  } else if(status==='rejected'){
    if(typeof NET.clearJoinPoll==='function') NET.clearJoinPoll();
    CL.net.pendingName=null; CL.net.step='escolha';
    toastC('⚠ O anfitrião recusou sua entrada na Resenha.');
    cdraw();
  }
}
/* tela de espera do convidado enquanto o anfitrião não aprova/recusa (poll roda no NET) */
function scWaitApproval(){ const n=CL.net;
  const body=`<div class="cl-wiz-authcard" style="max-width:520px;text-align:center">
      <div class="cl-wait-spin">⏳</div>
      <div class="cl-wait-t">Pedido enviado!</div>
      <div class="cl-wait-sub">Aguardando o anfitrião aprovar a sua entrada na Resenha${n.pendingName?` <b>${escC(n.pendingName)}</b>`:''}.<br>Assim que ele aprovar, você entra automaticamente.</div>
      <div class="cl-wait-dots"><span></span><span></span><span></span></div>
    </div>`;
  return wizShell({ title:'À espera de aprovação', back:'clCancelJoinReq()', backLabel:'Cancelar pedido',
    contentCls:'cl-wiz-center', body, actionCls:'cl-wiz-action-c',
    action: btn('Cancelar pedido','clCancelJoinReq()',{icon:'✖',cls:'cl-wiz-sairbtn'}) });
}
function clCancelJoinReq(){
  (async ()=>{ try{ await NET.cancelJoinRequest(CL.net.code); }catch(e){} })();
  CL.net.pendingName=null; CL.net.step='escolha'; cdraw();
}
function renderOnlineInto(){ const r=document.querySelector('#c-root'); if(!r) return; r.innerHTML=renderOnline(); const f=document.querySelector('#cl-focus'); if(f)f.focus(); }

/* ---- login / criar conta (e-mail + senha reais — nunca mais anônimo) ---- */
function scConta(){ const n=CL.net; const join=(n.intent==='join'); const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};

  // já logado nesta sessão do navegador: mostra atalho claro em vez de pedir login de novo
  if(st.loggedIn){
    const body=`<div class="cl-wiz-authcard">
        <div class="cl-conta-logged">
          <div class="cl-conta-logged-ic">✓</div>
          <div><div class="cl-conta-logged-t">Você já está logado</div>
          <div class="cl-conta-logged-e">${escC(st.email)}</div></div>
        </div>
        <div class="cl-authfield"><label>Nome de treinador</label><input id="cl-focus" maxlength="14" value="${escC(n.name||st.name)}" oninput="CL.net.name=this.value.toUpperCase();this.value=CL.net.name;netContaSync()"></div>
        ${join && NET.room?`<div class="cl-conta-room">Sala: <b>${escC(NET.room.name||n.code)}</b> · código <b>${escC(n.code)}</b></div>`:''}
        <div class="cl-conta-switch">Não é você? <a href="javascript:void(0)" onclick="clAuthSwitchAccount()">Trocar de conta</a></div>
      </div>`;
    return wizShell({ title:join?'Entrar na sala':'Criar sala', back:'clGoModo()', backLabel:'Voltar',
      contentCls:'cl-wiz-authcenter', body, actionCls:'cl-wiz-action-e',
      action: btn(join?'Entrar':'Continuar',join?'clContaJoin()':'clContaHost()',{icon:'✔',cls:'cl-wiz-cta',dis:!n.name}) });
  }

  const mode=n.authMode||'login'; const isSignup=(mode==='signup');
  const body=`<div class="cl-wiz-authcard">
      <div class="cl-conta-tabs">
        <div class="cl-conta-tab ${!isSignup?'on':''}" onclick="CL.net.authMode='login';cdraw()">Já tenho conta</div>
        <div class="cl-conta-tab ${isSignup?'on':''}" onclick="CL.net.authMode='signup';cdraw()">Criar conta nova</div>
      </div>
      <div class="cl-wiz-authsub">${isSignup?'Primeira vez aqui? Crie sua conta com e-mail e senha.':'Entre com o e-mail e senha da sua conta.'}</div>
      <div class="cl-authform">
        ${isSignup?`<div class="cl-authfield"><label>Nome de treinador</label><input id="cl-focus" maxlength="14" placeholder="Como quer ser chamado" value="${escC(n.name)}" oninput="CL.net.name=this.value.toUpperCase();this.value=CL.net.name;netContaSync()"></div>`:''}
        <div class="cl-authfield"><label>E-mail</label><input ${isSignup?'':'id="cl-focus"'} type="email" placeholder="voce@exemplo.com" value="${escC(n.email)}" oninput="CL.net.email=this.value;netContaSync()"></div>
        <div class="cl-authfield"><label>Senha</label><input type="password" minlength="6" placeholder="••••••••" value="${escC(n.password||'')}" oninput="CL.net.password=this.value;netContaSync()" onkeydown="if(event.key==='Enter')${isSignup?'clAuthDoSignup':'clAuthDoLogin'}()"></div>
        ${isSignup?`<div class="cl-authhint">Pelo menos 6 caracteres. Evite senhas óbvias (ex.: 123456).</div>`:''}
      </div>
      ${join && NET.room?`<div class="cl-conta-room">Sala: <b>${escC(NET.room.name||n.code)}</b> · código <b>${escC(n.code)}</b></div>`:''}
    </div>`;
  return wizShell({ public:true, title:join?'Entrar na sala':(isSignup?'Criar conta':'Sua conta'), back:'clGoModo()', backLabel:'Voltar',
    contentCls:'cl-wiz-authcenter', body, actionCls:'cl-wiz-action-e',
    action: btn(isSignup?'Criar conta':'Entrar',isSignup?'clAuthDoSignup()':'clAuthDoLogin()',{icon:'✔',cls:'cl-wiz-cta',dis:!(n.email&&n.password&&(!isSignup||n.name))}) });
}
function netContaSync(){ const b=document.querySelector('.cl-wiz-cta, .cl-btn-ok'); if(!b) return;
  const n=CL.net; const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};
  if(st.loggedIn){ b.disabled=!n.name; return; }
  const isSignup=(n.authMode||'login')==='signup';
  b.disabled=!(n.email&&n.password&&(!isSignup||n.name));
}
function clAuthSwitchAccount(){ (async ()=>{ await NET.authSignOut(); CL.net.name=''; CL.net.email=''; CL.net.password=''; cdraw(); })(); }
function clAuthDoSignup(){ const n=CL.net; if(!(n.email&&n.password&&n.name)) return;
  toastC('Criando conta...');
  (async ()=>{ try {
    await NET.authSignUp(n.email, n.password, n.name);
    toastC('Conta criada!'); cdraw();
  } catch(e) {
    if(e.code==='DUPLICATE_ACCOUNT'){ CL.net.authMode='login'; toastC('⚠ '+e.message); }
    else toastC('⚠ '+e.message);
    cdraw();
  } })();
}
function clAuthDoLogin(){ const n=CL.net; if(!(n.email&&n.password)) return;
  toastC('Entrando...');
  (async ()=>{ try {
    const user = await NET.authSignIn(n.email, n.password);
    CL.net.name = user.user_metadata?.name || n.email.split('@')[0];
    toastC('Login feito!'); cdraw();
  } catch(e) { toastC('⚠ '+e.message); cdraw(); } })();
}
function clContaHost(){ const st=NET.authStatus(); if(!st.loggedIn || !CL.net.name) return;
  CL.mgr = CL.net.name;
  toastC('Buscando suas salas...');
  (async ()=>{
    const rooms = await NET.listMyRooms();
    if(rooms.length){ CL.net.myRooms = rooms; CL.net.step = 'minhassalas'; } else { CL.net.step = 'sala'; }
    cdraw();
  })();
}
function clContaJoin(){ const st=NET.authStatus(); if(!st.loggedIn || !CL.net.name) return;
  CL.mgr = CL.net.name;
  clRequestOrJoin(CL.net.code);
}
/* decide pra onde ir depois de entrar numa sala: lobby (pré-temporada),
   direto pro jogo (já tem clube) ou escolher um clube livre (temporada já rolando) */
function routeAfterJoin(){
  const room=NET.room; if(!room){ cdraw(); return; }
  const me=room.participants.find(p=>p.id===NET.self.id);
  if(me && me.clubId){
    // já assumi um clube nesta sala (reconexão) — segue o fluxo normal
    if(room.phase==='lobby'){ CL.net.step='lobby'; cdraw(); } else { onlineBeginSeason(); }
    return;
  }
  if(room.phase==='lobby'){
    // SORTEIO NO LOBBY: assume um clube livre AGORA (aleatório, nunca escolha). Dois motivos:
    // (1) o TIME já aparece na tela da sala; (2) o convidado passa a ser visível pra TODOS via
    // game_seats (Realtime confiável) — a presença sozinha não chegava ao anfitrião. O anfitrião
    // pode re-sortear todos com "Sortear times". Todos avançam juntos quando o host clica "Começar".
    toastC('Sorteando seu time...');
    (async ()=>{ await clAutoSeatLobby(); CL.net.step='lobby'; cdraw(); })();
    return;
  }
  // temporada já rolando, sem clube -> tela de sorteio de entrada (midjoin, sempre aleatório)
  CL.net.step='midjoin'; cdraw();
}
/* sorteia um clube LIVRE pro jogador local no lobby, com retry contra corrida (dois entrando ao
   mesmo tempo podem escolher o mesmo — claim_seat rejeita o 2º; tentamos outro). Retorna se sentou. */
async function clAutoSeatLobby(){
  const uid=NET.self.id;
  for(let i=0;i<5;i++){
    if(NET._claimed && NET._claimed[uid] && NET._claimed[uid].clubId) return true; // já sentado
    const free=freeClubIds(); if(!free.length) return false;
    const pick=free[Math.floor(Math.random()*free.length)].id;
    await NET.assignClub(uid, pick);
    if(NET._claimed && NET._claimed[uid] && NET._claimed[uid].clubId) return true;
    try{ if(NET.refreshRoom) await NET.refreshRoom(); }catch(_){}
  }
  return false;
}

/* ---- escolher o próprio clube: aceitar convite (pré-temporada) ou entrar
   com a liga já rolando — sempre um clube livre, CPU até então ---- */
function scMidJoin(){
  const room=NET.room; if(!room) return wizShell({ title:'Sala', back:'clLobbyExit()', backLabel:'Sair', contentCls:'cl-wiz-center', body:`<div class="cl-wiz-sub">A ligar à sala…</div>` });
  const midSeason=room.phase!=='lobby';
  const free=freeClubIds();
  const msg=midSeason
    ? `🏁 A Resenha <b>${escC(room.name)}</b> já começou (${room.round||1}ª rodada).<br>Um clube livre (hoje da CPU) é <b>sorteado</b> pra você assumir o comando:`
    : `👋 Você foi convidado pra Resenha <b>${escC(room.name)}</b>!<br>Um clube livre é <b>sorteado</b> pra você.`;
  const cta = free.length
    ? btn('🎲 Entrar com time sorteado','clMidJoinRandom()',{cls:'cl-wiz-cta'})
    : '<div class="cl-midjoin-empty">Não há mais clubes livres nesta sala no momento.</div>';
  const body=`<div class="cl-wiz-authcard" style="max-width:600px">
      <div class="cl-midjoin-msg">${msg}</div>
      <div class="cl-midjoin-list" style="text-align:center;padding:14px 0">${cta}</div>
    </div>`;
  return wizShell({ title:'Sala · '+escC(room.name||''), back:'clLobbyExit()', backLabel:'Sair', contentCls:'cl-wiz-top', body });
}
/* sorteio obrigatório: o convidado entra com um clube livre SORTEADO (não escolhe) */
function clMidJoinRandom(){
  const free=freeClubIds(); if(!free.length){ toastC('Não há clubes livres nesta sala.'); return; }
  clPickMidJoinClub(free[Math.floor(Math.random()*free.length)].id);
}
function clPickMidJoinClub(clubId){
  toastC('Entrando...');
  (async ()=>{ try {
    await NET.assignClub(NET.self.id, clubId);
    if(NET.room.phase==='lobby'){ CL.net.step='lobby'; cdraw(); } else { onlineBeginSeason(); }
  } catch(e) { toastC('⚠ '+e.message); } })();
}

/* ---- minhas salas (reentrar rápido em salas já participadas, + convites pendentes) ---- */
function scMinhasSalas(){
  const rooms=CL.net.myRooms||[];
  const phaseLbl={lobby:'Aguardando início',ready:'Escalando...',running:'Em andamento',finished:'Encerrada'};
  const rows=rooms.map(r=>{ const c=r.clubId?clubOf(r.clubId):null;
    return `<div class="cl-myroom ${r.pending?'pending':''}" onclick="clJoinMyRoom('${escC(r.code)}',${r.pending?'true':'false'})">
      <div class="cl-myroom-main">
        <div class="cl-myroom-name">${escC(r.name)} ${r.isHost?'<span class="cl-myroom-host">ANFITRIÃO</span>':''}${r.pending?'<span class="cl-myroom-pending">CONVITE PENDENTE</span>':''}</div>
        <div class="cl-myroom-sub">${r.pending?'Toque pra aceitar e escolher seu time':(c?escC(c.short)+' · ':'')+(phaseLbl[r.phase]||r.phase)+(r.round?' · '+r.round+'ª rodada':'')}</div>
      </div>
      <div class="cl-myroom-code">${escC(r.code)}</div>
      <button class="cl-myroom-del" title="${r.isHost?'Apagar sala':'Sair da sala'}" onclick="event.stopPropagation();clDeleteRoom('${escC(r.code)}',${r.isHost?'true':'false'})">🗑</button>
      <div class="cl-myroom-arrow">➜</div>
    </div>`; }).join('');
  const body=`<div class="cl-wiz-authcard" style="max-width:560px">
      <div class="cl-wiz-authsub" style="text-align:left">Você já participa dessas salas ou foi convidado pra elas. Toque numa pra continuar.</div>
      <div class="cl-myrooms-list">${rows}</div>
    </div>`;
  return wizShell({ title:'Minhas salas', back:'clResenhaBackChoice()', backLabel:'Voltar',
    contentCls:'cl-wiz-top', body, actionCls:'cl-wiz-action-e',
    action: btn('Criar sala nova','clGoNovaSala()',{icon:'➕',cls:'cl-wiz-cta'}) });
}
function clGoNovaSala(){ CL.net.step='sala'; cdraw(); }
/* apagar (host) / sair (membro) de uma sala — confirmação + ação */
function clDeleteRoom(code, isHost){
  const room=(CL.net.myRooms||[]).find(r=>r.code===code); const nm=room?room.name:code;
  const msg=isHost?`Apagar a Resenha <b>${escC(nm)}</b>? A sala some pra todos os participantes.`
                  :`Sair da Resenha <b>${escC(nm)}</b>? Você deixa de participar dela.`;
  overlayC(dlg(isHost?'Apagar sala?':'Sair da sala?', `<div class="cl-res">
    <div class="cl-res-verd" style="text-align:center">${msg}</div>
    <div class="cl-cal-ok" style="display:flex;gap:10px;justify-content:center;margin-top:14px">
      ${btn('Cancelar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}
      ${btn(isHost?'Apagar':'Sair',`clDeleteRoomGo('${escC(code)}',${isHost?'true':'false'})`,{icon:'🗑',cls:'cl-btn-ok'})}
    </div></div>`,{w:440}));
}
function clDeleteRoomGo(code, isHost){
  clCloseOverlay(); toastC(isHost?'Apagando sala...':'Saindo...');
  (async ()=>{
    const ok=await NET.deleteRoom(code, isHost);
    if(ok){ CL.net.myRooms=(CL.net.myRooms||[]).filter(r=>r.code!==code);
      toastC(isHost?'Sala apagada.':'Você saiu da sala.');
      if(!(CL.net.myRooms||[]).length){ CL.net.step='sala'; }
      cdraw();
    } else toastC('⚠ Não foi possível concluir. Tente de novo.');
  })();
}
function clJoinMyRoom(code, pending){
  // salas em "Minhas salas" são sempre pré-aprovadas (tenho assento ou convite interno) OU
  // são minhas (host) — clRequestOrJoin detecta isso e entra direto, sem virar pedido pendente.
  CL.mgr = CL.mgr || CL.net.name;
  clRequestOrJoin(code);
}

/* ---- abrir sala (nome) ---- */
/* Cada convidado escolhe o próprio time (entre os clubes ainda controlados pela CPU
   naquela sala) assim que entra — o anfitrião não atribui mais times a outros
   jogadores manualmente. "Sortear times" continua existindo como atalho opcional
   pro anfitrião preencher de uma vez as vagas que ninguém escolheu ainda. */
function scSalaHost(){ const n=CL.net;
  const body=`<div class="cl-wiz-authcard">
      <div class="cl-authfield"><label>Nome da sala</label>
        <input id="cl-focus" maxlength="18" placeholder="Ex: Resenha da firma" value="${escC(n.roomName||'')}" oninput="CL.net.roomName=this.value;netSalaSync()" onkeydown="if(event.key==='Enter')clOpenRoom()"></div>
      <div class="cl-authhint">Cada jogador escolhe o próprio time ao entrar, entre os clubes ainda controlados pela CPU.</div>
    </div>`;
  return wizShell({
    title:'Abrir sala', back:'clBackConta()', backLabel:'Voltar',
    contentCls:'cl-wiz-top', body, actionCls:'cl-wiz-action-e',
    action: btn('Abrir','clOpenRoom()',{icon:'✔',cls:'cl-wiz-cta',dis:!n.roomName})
  });
}
function netSalaSync(){ const b=document.querySelector('.cl-wiz-cta, .cl-btn-ok'); if(b) b.disabled=!CL.net.roomName; }
function clBackConta(){ CL.net.step='escolha'; cdraw(); }
function clOpenRoom(){ if(!CL.net.roomName)return;
  toastC('Abrindo sala...');
  (async ()=>{ try {
    await netInitSupabase();
    const host={name:CL.net.name,email:CL.net.email};
    await NET.createRoom(CL.net.roomName, host);
    wireNet(); // liga onState antes do sorteio pra a lista atualizar
    await clAutoSeatLobby(); // sorteia o time do PRÓPRIO anfitrião já no lobby (aparece na sala)
    CL.net.step='lobby'; cdraw();
  } catch(e) { toastC('⚠ Erro ao abrir: '+e.message); } })();
}

/* ---- lobby (código, convite WhatsApp, participantes, começar) ----
   Cada jogador escolhe o PRÓPRIO time — o anfitrião não atribui mais time a
   outro participante (a linha de cada um só mostra um seletor pro dono dela
   mesma, quando ainda não escolheu). "Sortear times" continua sendo um atalho
   do anfitrião pra preencher de uma vez só as vagas que ninguém pegou ainda. */
function scLobby(){ const room=NET.room;
  if(!room) return wizShell({ title:'Sala', back:'clLobbyExit()', backLabel:'Sair da sala',
    contentCls:'cl-wiz-center', body:`<div class="cl-wiz-sub">A ligar à sala…</div>` });
  const host=NET.isHost;
  const nParts=room.participants.length;
  const canStart=host && nParts>=2;
  if(host) clStartHostReqPoll();
  else clStartLobbyPoll(); // CONVIDADO: poll de segurança pra não ficar preso se o realtime falhar

  // ---- lista de treinadores na sala (o time NÃO é revelado aqui — só na tela de sorteio) ----
  const parts=room.participants.map(p=>{ const isSelf=p.id===NET.self.id;
    const status=p.confirmed?'<span class="cl-part-st ok">● na sala</span>':'<span class="cl-part-st">○ a entrar…</span>';
    return `<div class="cl-part">
      <span class="cl-part-dot ${p.confirmed?'ok':''}"></span>
      <span class="cl-part-n">${escC(p.name||'—')}${p.host?' <i>(anfitrião)</i>':''}${isSelf&&!p.host?' <i>(você)</i>':''}</span>
      ${status}
      <span class="cl-part-team wait">🎲 aguardando sorteio</span>
      ${host && !isSelf ? `<button class="cl-part-kick" title="Remover da sala" onclick="clKick('${p.id}','${p.clubId||''}')">✖</button>` : ''}
    </div>`; }).join('');

  const nReq=(CL.pendingJoins&&CL.pendingJoins.length)||0;

  // ======= VISÃO DO ANFITRIÃO: passo a passo em coluna única =======
  let steps='';
  if(host){
    // Passo 1 — convidar
    steps += `<section class="cl-step">
      <div class="cl-step-h"><span class="cl-step-num">1</span><span class="cl-step-t">Convide os treinadores</span></div>
      <div class="cl-step-b">
        <div class="cl-wiz-invitegrid">
          <div>
            <div class="cl-wiz-invlbl">🟢 Por WhatsApp</div>
            <div class="cl-wiz-invrow"><span class="cl-ddi">+55</span><input class="cl-phone" inputmode="numeric" placeholder="DDD + número" value="${escC(CL.net.phone||'')}" oninput="CL.net.phone=this.value.replace(/\\D/g,'');this.value=CL.net.phone">${btn('Enviar','clWaInvite()',{cls:'cl-btn-sm'})}</div>
          </div>
          <div>
            <div class="cl-wiz-invlbl">✉ Por e-mail</div>
            <div class="cl-wiz-invrow"><input class="cl-emailinv" type="email" placeholder="email@exemplo.com" value="${escC(CL.net.inviteEmail||'')}" oninput="CL.net.inviteEmail=this.value">${btn('Enviar','clEmailInvite()',{cls:'cl-btn-sm'})}</div>
          </div>
        </div>
        <div class="cl-wiz-invlbl" style="margin-top:10px">🔍 Quem já tem conta</div>
        <input id="cl-usersearch-input" class="cl-wiz-searchin" placeholder="Buscar por nome ou e-mail (mín. 3 letras)" oninput="clUserSearch(this.value)">
        <div id="cl-usersearch-results" class="cl-usersearch-results"></div>
        <div class="cl-wiz-invhint">Ou compartilhe o link: <a class="cl-wiz-invlink" href="${escC(NET.inviteLink())}" target="_blank">${escC(NET.inviteLink())}</a></div>
      </div>
    </section>`;
    // Passo 2 — aprovar entradas (só aparece quando há pedidos)
    if(nReq>0){
      steps += `<section class="cl-step cl-step-alert">
        <div class="cl-step-h"><span class="cl-step-num">2</span><span class="cl-step-t">Aprove os pedidos de entrada <span class="cl-step-badge">${nReq}</span></span></div>
        <div class="cl-step-b"><div class="cl-req-list">${clReqRowsHTML()}</div></div>
      </section>`;
    }
    // Passo 3 — treinadores na sala
    steps += `<section class="cl-step">
      <div class="cl-step-h"><span class="cl-step-num">${nReq>0?3:2}</span><span class="cl-step-t">Treinadores na sala (${nParts})</span></div>
      <div class="cl-step-b"><div class="cl-parts">${parts}</div>
        <div class="cl-wiz-invhint">Quando começar, cada treinador recebe um clube por sorteio — ninguém escolhe.</div>
      </div>
    </section>`;
  } else {
    // ======= VISÃO DO CONVIDADO: simples =======
    steps += `<section class="cl-step">
      <div class="cl-step-h"><span class="cl-step-t">Treinadores na sala (${nParts})</span></div>
      <div class="cl-step-b"><div class="cl-parts">${parts}</div>
        <div class="cl-wiz-invhint">Aguarde o anfitrião começar. Os clubes são sorteados na próxima tela.</div>
      </div>
    </section>`;
  }

  // Chat — recolhível (todos)
  const chatOpen=CL.net.lobbyChatOpen!==false;
  steps += `<section class="cl-step cl-step-chat">
      <div class="cl-step-h cl-step-h-btn" onclick="CL.net.lobbyChatOpen=${chatOpen?'false':'true'};renderOnlineInto()">
        <span class="cl-step-t">💬 Chat da sala</span><span class="cl-step-caret">${chatOpen?'▾':'▸'}</span>
      </div>
      ${chatOpen?`<div class="cl-step-b">
        <div class="cl-chat-msgs cl-wiz-chatmsgs" id="cl-chat-msgs-lobby">${chatMsgsHTML()||'<div class="cl-wiz-chatempty">Nenhuma mensagem ainda. Diga oi! 👋</div>'}</div>
        <div class="cl-wiz-invrow"><input id="cl-chat-input-lobby" class="cl-chat-input" placeholder="Escreva uma mensagem…" onkeydown="clChatKey(event,'cl-chat-input-lobby')">${btn('Enviar',"clChatSend('cl-chat-input-lobby')",{cls:'cl-btn-sm'})}</div>
      </div>`:''}
    </section>`;

  const action=`<span class="cl-wiz-hint">${host?(canStart?'O sorteio dos clubes acontece na próxima tela.':'Convide pelo menos mais 1 treinador pra começar.'):'À espera do anfitrião… toque em Sincronizar se ele já começou.'}</span>
    <div class="cl-wiz-actbtns">
      ${btn('Sair','clLobbyExit()',{icon:'✖',cls:'cl-wiz-sairbtn'})}
      ${host?btn('Começar (sortear times)','clLobbyStart()',{icon:'🎲',cls:'cl-wiz-cta',dis:!canStart})
            :btn('Sincronizar','clSyncResenha()',{icon:'🔄',cls:'cl-wiz-cta'})}
    </div>`;
  return wizShell({
    title:'Sala · '+escC(room.name||''), back:'clLobbyExit()', backLabel:'Sair da sala',
    pill:'Código '+escC(room.code||''),
    contentCls:'cl-wiz-lobbycontent',
    body:`<div class="cl-wiz-lobbycol">${steps}</div>`,
    action
  });
}
/* clubes ainda controlados pela CPU nesta sala — o próprio jogador escolhe entre eles
   (mesma lista que scMidJoin usa pra convite/entrada com a liga já rolando). */
function freeClubIds(){ const room=NET.room; if(!room) return [];
  // Resenha começa na Série D do Brasil — o pool de sorteio precisa ser exatamente os clubes da
  // Série D (que são os assentos criados na sala), não o DATA.clubs local do convidado (que pode
  // estar noutro universo/divisão e não bater com os assentos).
  const pool = (typeof resenhaStartClubs==='function' && resenhaStartClubs().length) ? resenhaStartClubs()
    : ((typeof DATA!=='undefined' && DATA.clubsSerieA && DATA.clubsSerieA.length) ? DATA.clubsSerieA : DATA.clubs);
  const taken=new Set((room.participants||[]).map(p=>p.clubId).filter(Boolean));
  return pool.filter(c=>!taken.has(c.id));
}
function clWaInvite(){ const ph=(CL.net.phone||'').replace(/\D/g,''); if(ph.length<10){ toastC('Informe DDD + número (ex.: 11912345678).'); return; }
  try{ window.open(NET.waLink(ph),'_blank'); }catch(e){} toastC('Abrindo WhatsApp…'); }
function clEmailInvite(){ const em=(CL.net.inviteEmail||'').trim(); if(!em || !em.includes('@')){ toastC('Informe um e-mail válido.'); return; }
  toastC('Enviando convite...');
  (async ()=>{ try { await NET.sendEmailInvite(em); toastC('✓ Convite enviado por e-mail!'); CL.net.inviteEmail=''; cdraw(); }
  catch(e){ toastC('⚠ '+e.message); } })();
}
let USERSEARCH_DEBOUNCE=null;
function clUserSearch(q){
  clearTimeout(USERSEARCH_DEBOUNCE);
  USERSEARCH_DEBOUNCE=setTimeout(()=>{
    (async ()=>{
      const box=document.querySelector('#cl-usersearch-results'); if(!box) return;
      if((q||'').trim().length<3){ box.innerHTML=''; return; }
      box.innerHTML='<div class="cl-usersearch-loading">Buscando...</div>';
      const results=await NET.searchUsers(q);
      if(!results.length){ box.innerHTML='<div class="cl-usersearch-empty">Nenhum treinador encontrado.</div>'; return; }
      box.innerHTML=results.map(u=>`<div class="cl-usersearch-item">
        <span class="cl-usersearch-name">${escC(u.name)}</span>
        ${btn('Convidar',`clInviteInternalUser('${u.id}','${escC(u.name)}')`,{cls:'cl-btn-mini'})}
      </div>`).join('');
    })();
  }, 350);
}
function clInviteInternalUser(uid,name){
  toastC('Convidando '+name+'...');
  (async ()=>{ try { await NET.inviteInternal(uid,name); toastC('✓ '+name+' foi convidado! Quando ele entrar, escolhe o próprio time.');
    const inp=document.querySelector('#cl-usersearch-input'); if(inp) inp.value=''; const box=document.querySelector('#cl-usersearch-results'); if(box) box.innerHTML='';
  } catch(e){ toastC('⚠ '+e.message); } })();
}
/* ============ APROVAÇÃO DE ENTRADA — UI do anfitrião (lobby + dentro do jogo) ============
   Poll leve do host: mantém CL.pendingJoins atualizado pro badge do menu, o painel do lobby e o
   modal em jogo. Idempotente (não abre 2 intervalos); auto-limpa quando não é mais host. */
let HOST_REQ_POLL=null;
function clStartHostReqPoll(){
  if(HOST_REQ_POLL || typeof NET==='undefined' || !NET.isHost) return;
  const tick=async ()=>{
    if(typeof NET==='undefined' || !NET.isHost || !NET.gameId){ return; }
    try{
      const reqs=await NET.listJoinRequests();
      const prev=(CL.pendingJoins||[]).length;
      CL.pendingJoins=reqs;
      if(reqs.length>prev && CL.screen==='main'){ toastC('🔔 Novo pedido de entrada na Resenha — menu "Modo Resenha".'); }
      if(CL.screen==='online' && CL.net && CL.net.step==='lobby' && reqs.length!==prev) renderOnlineInto();
      if(CL._reqPanelOpen) clRenderReqPanel();
    }catch(e){}
  };
  tick();
  HOST_REQ_POLL=setInterval(tick, 5000);
}
function clStopHostReqPoll(){ if(HOST_REQ_POLL){ clearInterval(HOST_REQ_POLL); HOST_REQ_POLL=null; } CL.pendingJoins=[]; if(typeof NET!=='undefined') NET._approvedMembers={}; }
/* linhas de pedidos (reusadas no painel do lobby e no modal em jogo) */
function clReqRowsHTML(){
  const reqs=CL.pendingJoins||[];
  if(!reqs.length) return '<div class="cl-req-empty">Nenhum pedido de entrada no momento.</div>';
  return reqs.map(r=>`<div class="cl-req-row">
      <span class="cl-req-name">👤 ${escC(r.name||'Treinador')}</span>
      <span class="cl-req-acts">
        ${btn('Aprovar',`clApproveJoin('${r.user_id}')`,{cls:'cl-btn-mini cl-btn-ok'})}
        ${btn('Recusar',`clRejectJoin('${r.user_id}')`,{cls:'cl-btn-mini cl-btn-cancel'})}
      </span>
    </div>`).join('');
}
function clRefreshReqSurfaces(){
  if(CL.screen==='online' && CL.net && CL.net.step==='lobby') renderOnlineInto();
  if(CL._reqPanelOpen) clRenderReqPanel();
  else if(CL.screen==='main') cdraw();
}
function clApproveJoin(uid){
  toastC('Aprovando...');
  (async ()=>{ try{ await NET.approveJoin(uid);
    toastC('✓ Entrada aprovada.'); CL.pendingJoins=(CL.pendingJoins||[]).filter(r=>r.user_id!==uid); clRefreshReqSurfaces();
  }catch(e){ toastC('⚠ Não foi possível aprovar: '+(e&&e.message||'erro')); } })();
}
function clRejectJoin(uid){
  (async ()=>{ try{ await NET.rejectJoin(uid);
    toastC('Pedido recusado.'); CL.pendingJoins=(CL.pendingJoins||[]).filter(r=>r.user_id!==uid); clRefreshReqSurfaces();
  }catch(e){ toastC('⚠ Não foi possível recusar: '+(e&&e.message||'erro')); } })();
}
/* modal compacto dentro do jogo (item "Aprovar entradas..." do menu Modo Resenha) */
function clJoinRequestsPanel(){
  CL.menu=null; CL._reqPanelOpen=true; clStartHostReqPoll(); clRenderReqPanel();
  (async ()=>{ try{ CL.pendingJoins=await NET.listJoinRequests(); clRenderReqPanel(); }catch(e){} })();
}
function clRenderReqPanel(){
  if(!CL._reqPanelOpen) return;
  const html=`<div class="cl-req-panel">
      <div class="cl-req-panel-sub">Quem entrou pelo código está aguardando seu OK para participar da Resenha.</div>
      <div class="cl-req-list">${clReqRowsHTML()}</div>
      <div class="cl-cal-ok" style="margin-top:12px">${btn('Fechar','clCloseReqPanel()',{icon:'✔',cls:'cl-btn-ok'})}</div>
    </div>`;
  overlayC(dlg('🚪 Aprovar entradas na Resenha', html, {w:480}));
}
function clCloseReqPanel(){ CL._reqPanelOpen=false; clCloseOverlay(); }

/* CONVIDADO no lobby: poll de segurança. Se o realtime não entregar a saída de 'lobby' (o anfitrião
   apertou Começar), este poll re-lê o estado a cada 2.5s e o refreshRoom->onState dispara a transição
   pra tela de sorteio. Sem isso o convidado ficava preso no lobby esperando pra sempre. */
let LOBBY_POLL=null;
function clStartLobbyPoll(){
  if(LOBBY_POLL || (typeof NET!=='undefined' && NET.isHost)) return;
  LOBBY_POLL=setInterval(async ()=>{
    if(!(CL.screen==='online' && CL.net && CL.net.step==='lobby' && !CL.online)){ clStopLobbyPoll(); return; }
    try{ if(NET.refreshRoom) await NET.refreshRoom(); }catch(e){} // -> onState trata lobby->sorteio
    if(NET.room && NET.room.phase && NET.room.phase!=='lobby') clStopLobbyPoll();
  }, 2500);
}
function clStopLobbyPoll(){ if(LOBBY_POLL){ clearInterval(LOBBY_POLL); LOBBY_POLL=null; } }
function clLobbyExit(){ clStopHostReqPoll(); clStopLobbyPoll(); CL.screen='modo'; cdraw(); }
/* "Começar" (anfitrião): sorteia TODOS os assentos dos treinadores PRESENTES a partir dos clubes
   disponíveis do save (grava em game_seats), depois abre a temporada (NET.start → fase sai de
   'lobby'). A saída de 'lobby' dispara a TELA DE REVEAL em todos os clientes (host + convidados)
   via wireNet.onState; ao fim do reveal cada um chama onlineBeginSeason (mesma seed → mesma
   competição). O sorteio NÃO acontece mais no lobby — só aqui, garantindo uma única competição. */
function clLobbyStart(){ if(!NET.isHost) return;
  const room=NET.room; if(!room || (room.participants||[]).length<2){ toastC('Mínimo de 2 treinadores.'); return; }
  toastC('Sorteando os clubes…');
  (async ()=>{
    try{ await NET.drawClubs(true); }                 // re-sorteia todos os assentos presentes
    catch(e){ toastC('⚠ Não foi possível sortear. Tente de novo.'); return; }
    try{ if(NET.refreshRoom) await NET.refreshRoom(); }catch(e){}  // lê os assentos finais
    NET.start();   // fase 'lobby'→'ready': o onState dispara startResenhaDraw() (host + convidados)
  })();
}
/* ---------- Tela de sorteio com reveal (dedicada, após "Começar") ----------
   Todos os clientes caem aqui quando a fase sai de 'lobby'. Revela um treinador→clube por vez
   (~2s, estilo sorteio de copa) e, ao terminar, chama onlineBeginSeason() — que usa a seed
   compartilhada (mesma competição p/ todos) e restaura o clube local. Botão "Pular" acelera. */
function startResenhaDraw(){
  if(typeof clStopLobbyPoll==='function') clStopLobbyPoll(); // saí do lobby: para o poll de segurança
  const room=NET.room;
  if(!room){ onlineBeginSeason(); return; }
  const poolById={}; (typeof resenhaStartClubs==='function'?resenhaStartClubs():[]).forEach(c=>{ poolById[c.id]=c; });
  // só treinadores COM assento sorteado; ordem DETERMINÍSTICA por clubId → todos veem a mesma sequência
  const list=(room.participants||[]).filter(p=>p.clubId).slice()
    .sort((a,b)=> String(a.clubId).localeCompare(String(b.clubId)));
  if(!list.length){ onlineBeginSeason(); return; }
  if(CL._resDrawTimer){ clearTimeout(CL._resDrawTimer); CL._resDrawTimer=null; }
  CL.net.draw={ list, idx:0, done:false, fast:false, poolById };
  CL.net.step='reveal'; CL.screen='online';
  cdraw();
  CL._resDrawTimer=setTimeout(resenhaDrawTick, 700); // pequena pausa antes do 1º
}
function resenhaDrawTick(){
  const d=CL.net&&CL.net.draw; if(!d) return;
  if(d.idx>=d.list.length){
    d.done=true; renderOnlineInto();
    CL._resDrawTimer=setTimeout(()=>{ if(CL.net) CL.net.draw=null; onlineBeginSeason(); }, d.fast?500:1600);
    return;
  }
  d.idx++;
  renderOnlineInto();
  CL._resDrawTimer=setTimeout(resenhaDrawTick, d.fast?250:2000);
}
function clResenhaDrawSkip(){ const d=CL.net&&CL.net.draw; if(!d||d.done) return; d.fast=true;
  if(CL._resDrawTimer){ clearTimeout(CL._resDrawTimer); CL._resDrawTimer=null; }
  resenhaDrawTick();
}
function scResenhaDraw(){
  const d=(CL.net&&CL.net.draw)||{list:[],idx:0};
  const poolById=d.poolById||{};
  const rows=(d.list||[]).map((p,i)=>{
    const revealed=i<d.idx;
    if(!revealed) return `<div class="cl-rdraw-row pending"><span class="cl-rdraw-num">${i+1}</span><span class="cl-rdraw-name muted">${escC(p.name||'Treinador')}</span><span class="cl-rdraw-arrow">→</span><span class="cl-rdraw-team q">🎲</span></div>`;
    const c=clubOf(p.clubId)||poolById[p.clubId];
    const isLast=(i===d.idx-1)&&!d.done;
    return `<div class="cl-rdraw-row revealed${isLast?' pop':''}">
      <span class="cl-rdraw-num">${i+1}</span>
      <span class="cl-rdraw-name">${escC(p.name||'Treinador')}</span>
      <span class="cl-rdraw-arrow">→</span>
      <span class="cl-rdraw-team" style="${c?clubStripe(c):''}">${c?escC(c.short||c.name):'—'}</span>
    </div>`;
  }).join('');
  const sub=d.done?'Sorteio concluído! Entrando na Resenha… ⚽':'Sorteando os clubes… boa sorte a todos!';
  const action=d.done
    ? `<span class="cl-wiz-hint">Preparando a temporada…</span>`
    : `<div class="cl-wiz-actbtns">${btn('Pular','clResenhaDrawSkip()',{icon:'⏩',cls:'cl-wiz-cta'})}</div>`;
  return wizShell({
    title:'Sorteio dos clubes',
    contentCls:'cl-wiz-center',
    body:`<div class="cl-rdraw"><div class="cl-rdraw-sub">${sub}</div><div class="cl-rdraw-list">${rows}</div></div>`,
    action
  });
}
/* seed 32-bit estável e não-zero a partir do games.seed (bigint/string) — FNV-1a sobre a string.
   Igual em todos os clientes; evita a truncagem inconsistente / o 0-falsy do newGame. */
function resenhaSeed32(raw){
  // COAGE pra Number primeiro: o host lê games.seed como number e o convidado como string; ambos
  // convergem pro MESMO double (mesma precisão), então String(Number(x)) é idêntico nos dois. Sem
  // isso, String("2566...456") != String(Number(...)=...520) -> seeds diferentes -> jogos paralelos.
  const n=Number(raw); const s=String(Number.isFinite(n)?n:0);
  let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
  h=h>>>0; return h||1; // nunca 0 (0 cairia no Math.random do newGame)
}
function onlineBeginSeason(){ const room=NET.room; if(!room) return; const me=room.participants.find(p=>p.id===NET.self.id);
  // SEGURANÇA: convidado sem clube ainda? re-lê os assentos e tenta de novo (o sorteio do host pode
  // não ter chegado). NUNCA pega o clube de outro — dois usuários com o MESMO time era exatamente
  // o bug. Tenta até 6x (~6s); se ainda não tiver assento, aborta com aviso (não rouba clube).
  if(CL.online && !NET.isHost && (!me || !me.clubId)){
    onlineBeginSeason._retry=(onlineBeginSeason._retry||0)+1;
    if(onlineBeginSeason._retry<=6 && typeof NET!=='undefined' && NET.refreshRoom){
      (async ()=>{ try{ await NET.refreshRoom(); }catch(e){} setTimeout(onlineBeginSeason, 1000); })();
      return;
    }
    onlineBeginSeason._retry=0;
    if(typeof toastC==='function') toastC('⚠ Seu clube ainda não foi sorteado. Peça ao anfitrião pra reabrir a sala.');
    CL.net=CL.net||{}; CL.net.step='lobby'; CL.screen='online'; cdraw();
    return;
  }
  onlineBeginSeason._retry=0;
  // GUARDA FINAL: sem clube próprio, não começa (jamais assume participants[0] — evita clone de time)
  if(!me || !me.clubId){ if(typeof toastC==='function') toastC('⚠ Não foi possível confirmar seu clube. Tente sincronizar.'); return; }
  // A Resenha começa SEMPRE na ÚLTIMA divisão do Brasil (Série D) — a graça é o desafio de subir da
  // base até a Série A e ganhar títulos. Se este jogador vinha de um solo (universo intl, outra
  // divisão, transferência ao exterior), DATA.clubs/universo ficaram alterados e newGame(clubId)
  // teria squads[clubId] === undefined -> crash. Restaura o Brasil na divisão inicial antes de montar.
  if(typeof setUniverse==='function') setUniverse('brasil');
  const startDiv = (typeof RESENHA_START_DIV!=='undefined') ? RESENHA_START_DIV : 'D';
  const startClubs = (typeof resenhaStartClubs==='function' && resenhaStartClubs().length) ? resenhaStartClubs() : ((DATA.clubsSerieA||DATA.clubs)||[]);
  DATA.clubs = startClubs.slice();
  CL.intlUniverse=false; CL.bgCountries=[]; CL.playCountry='Brasil';
  CL.clubId=me.clubId; CL.mgr=me.name||CL.mgr; // clube SEMPRE do próprio assento (guardado acima)
  // SEED: games.seed é um bigint enorme; passar direto pra newGame trunca de formas diferentes por
  // cliente (e >>>0 podia dar 0, caindo no Math.random -> competições paralelas). Derivo um seed
  // 32-bit ESTÁVEL e NÃO-ZERO da string do games.seed (FNV-1a) — igual em todos os clientes.
  const seed32=resenhaSeed32(room.seed);
  newGame(CL.clubId, startDiv, undefined, seed32); if(!S.stadium) S.stadium={capacity:STAND_START}; // seed compartilhada -> mesma competição p/ todos
  CL.humans={}; room.participants.forEach(p=>{ if(p.clubId) CL.humans[p.clubId]=p.name; });
  CL.online=true; CL._playedRound=null; CL._hostPendingCommit=null; CL._hostCloseSince=0; // zera controle de rodada do save novo
  CL.formation=null; CL.tacticChosen=false; S.coachHistory=[{season:S.season, type:'contratado', text:`Contratado pelo ${clubOf(CL.clubId).short.toUpperCase()}`}];
  CL.screen='main'; CL.tab='jogo'; CL.selPlayer=squad(CL.clubId)[0]?.pid||null;
  cdraw(); // ao entrar na Resenha, vai SEMPRE direto pra TELA PRINCIPAL do time

  // A janela de 60s (NET.start) já foi aberta pelo anfitrião em clLobbyStart, ANTES do reveal —
  // não reabrir aqui (dobraria o cronômetro). Reconexões a jogo em andamento caem aqui com a fase
  // já fora de 'lobby', então também não precisam reabrir.
  if(NET.isHost) clStartHostReqPoll();   // acompanha pedidos de entrada durante a temporada

  // Carrega o estado salvo (se houver). NÃO mostramos sorteio de copa na ENTRADA — nem na 1ª vez:
  // os sorteios pendentes (Copa do Brasil, grupos) ficam em S._pendingDrawShows e rolam na DATA
  // NORMAL, nas transições de rodada (ver checkPendingCupDraws em _commitLeagueRound / main.js:3026,
  // e o gate por data real em advancePendingCups). Assim todos caem direto na tela do time deles.
  if(typeof NET!=='undefined' && NET.loadGame){
    (async ()=>{
      try {
        const savedState = await NET.loadGame();
        if(savedState && savedState.S){ Object.assign(S, savedState.S);
          // O save é do HOST — S.clubId/S.xi dele. RESTAURA o MEU clube: sem isso, quem reconecta/volta
          // (ex.: depois de ser expulso) assume o CLUBE DO HOST no motor -> "dois usuários com o mesmo
          // time". CL.clubId é o clube (livre) que EU acabei de assumir; o motor tem que usar ELE.
          S.clubId = CL.clubId;
          applyViewerDivision(CL.clubId);                // F3.5: renderiza a divisão do PRÓPRIO clube (temporada 2+)
          S.xi = resolveClubXI(CL.clubId);
          CL.selPlayer = (squad(CL.clubId)[0]||{}).n || CL.selPlayer;
          syncDataClubsFromState(); console.log('✓ Jogo carregado (rodada', savedState.round, ') — clube:', CL.clubId); }
      } catch(e) { console.warn('Load Supabase:', e); }
      cdraw();
    })();
  }
}

/* ---- durante a rodada online: painel "à espera dos treinadores" + timer ---- */
/* BARRA LATERAL DE STATUS (direita): mostra cada treinador com um símbolo — verde=Pronto,
   amarelo=em partida/escalando, vermelho=offline — além do cronômetro. Substitui a antiga barra
   do topo (evita duplicar a mesma info). TIMER DESARMADO (deadline 0): mostra "aguardando" em vez
   de contar, pois o cronômetro só começa quando TODOS terminam a rodada. */
function onlineStatusSidebar(){ const room=NET.room; if(!CL.online||!room||room.phase==='lobby') return '';
  const armed=(room.deadline||0)>0;
  const secs=armed ? Math.max(0,Math.ceil(((room.deadline||0)-Date.now())/1000)) : null;
  const readyN=room.participants.filter(p=>p.ready).length, total=room.participants.length;
  const rows=room.participants.map(p=>{ const self=NET.self&&p.id===NET.self.id;
    let cls, lbl;
    if(!p.online){ cls='off'; lbl='Offline'; }
    else if(p.ready){ cls='rdy'; lbl='Pronto'; }
    else if(p.busy){ cls='play'; lbl='Em partida'; }
    else { cls='play'; lbl='Escalando'; }
    const k=(NET.isHost && !self)?`<button class="cl-st-kick" title="Remover da Resenha" onclick="clKick('${p.id}','${p.clubId||''}')">✖</button>`:'';
    return `<div class="cl-st-row">
      <span class="cl-st-dot ${cls}"></span>
      <span class="cl-st-name">${escC((p.name||'—').split(' ')[0])}${p.host?' <i>(anf)</i>':''}${self?' <b>(você)</b>':''}</span>
      <span class="cl-st-lbl ${cls}">${lbl}</span>${k}
    </div>`; }).join('');
  // ANFITRIÃO: botão pausar/retomar o cronômetro (só na fase de contagem 'ready')
  const pauseBtn=(NET.isHost && room.phase==='ready')
    ? `<button class="cl-st-pause" onclick="clOnlinePause()">${room.paused?'▶ Retomar':'⏸ Pausar'}</button>` : '';
  const clockTxt = room.paused ? '⏸' : (armed?secs+'s':'⏳');
  return `<div class="cl-statusbar ${!room.paused&&armed&&secs<=10?'urgent':''}" id="cl-statusbar">
    <div class="cl-statusbar-h"><span class="cl-statusbar-title">Treinadores ${readyN}/${total}</span><span class="cl-statusbar-clock">${clockTxt}</span></div>
    <div class="cl-statusbar-sub">${room.paused?'Pausado pelo anfitrião':(armed?'Rodada começa quando zerar':'Aguardando todos terminarem')}</div>
    <div class="cl-statusbar-list">${rows}</div>
    ${pauseBtn}
  </div>`; }
/* anfitrião remove um jogador da Resenha (lobby ou durante a partida): confirma, dispara o kick
   (broadcast + libera assento -> clube vira CPU) e re-renderiza. O expulso recebe o sinal e volta ao menu. */
function clKick(uid, clubId){
  if(!uid || typeof NET==='undefined' || !NET.isHost) return;
  const p=(NET.room && NET.room.participants || []).find(x=>x.id===uid);
  const nm=(p&&p.name)||'este jogador';
  const cid=clubId||(p&&p.clubId)||'';
  overlayC(dlg('Remover da Resenha?', `<div class="cl-res">
    <div class="cl-res-verd" style="text-align:center">Remover <b>${escC(nm)}</b> da Resenha?<br>O time dele passa a ser controlado pela CPU e ele volta ao menu.</div>
    <div class="cl-cal-ok" style="display:flex;gap:10px;justify-content:center;margin-top:14px">
      ${btn('Cancelar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}
      ${btn('Remover',`clKickGo('${escC(uid)}','${escC(cid)}')`,{icon:'✖',cls:'cl-btn-ok'})}
    </div></div>`,{w:440}));
}
function clKickGo(uid, clubId){
  clCloseOverlay();
  if(NET.kick) NET.kick(uid, clubId||undefined);
  if(typeof cdraw==='function') cdraw();
}
/* anfitrião pausa/retoma o cronômetro da rodada (item 2 do playtest). Só o host; o estado
   (games.paused + paused_remaining_ms) sincroniza pra todos via onState, e o cronômetro respeita
   isso no onlineTimerLoop. */
function clOnlinePause(){ if(typeof NET!=='undefined' && NET.isHost && NET.pause){ NET.pause().catch(()=>{}); cdraw(); } }
function clSetSpeed(mult){ CL.speedMult=mult; if(CL.online && typeof NET!=='undefined' && NET.setSpeed) NET.setSpeed(mult).catch(()=>{}); cdraw(); }
let ONLINE_TIMER=null, ONLINE_LASTBEEP=-1, ONLINE_LASTSEC=null, ONLINE_ADV_T=0, ONLINE_BUSY_T=0, ONLINE_BUSY_ACTIVE=false, ONLINE_SEEN_T=0;
function onlineTimerLoop(){
  const room=(typeof NET!=='undefined')?NET.room:null;
  // SAVE ÚNICO: o ANFITRIÃO fecha a rodada quando ninguém está mais em partida (não-bloqueante,
  // teto de 90s do busy). Convidados voltam livres e só ESPELHAM (onlineReconcileIfBehind).
  if(CL.online && CL._hostPendingCommit && typeof onlineHostCloseRound==='function'){
    onlineHostCloseRound();
  }
  // HEARTBEAT DE PRESENÇA: carimba last_seen a cada ~15s enquanto estou na Resenha, pra a barra de
  // status mostrar "online" de verdade (o presence do realtime era instável e dava todo mundo Offline).
  if(CL.online && typeof NET!=='undefined' && NET.gameId && NET.heartbeatSeen){
    if(Date.now()-ONLINE_SEEN_T>15000){ ONLINE_SEEN_T=Date.now(); NET.heartbeatSeen(); }
  }
  // BARREIRA DE SINCRONIZAÇÃO: enquanto EU estou numa partida ao vivo (liga/copa/espectador)
  // OU assistindo ao SORTEIO da copa (cupdraw), bato um heartbeat "ocupado" — o servidor não
  // avança a rodada sem mim (ver advance_phase_if_expired). Incluir 'cupdraw' faz o sorteio
  // esperar todos: a rodada não fecha enquanto alguém ainda está vendo o sorteio.
  // Ao sair da tela, limpo o "ocupado" uma vez (fim normal = libera; queda = expira em ~90s).
  if(CL.online && (CL.screen==='live'||CL.screen==='cupdraw') && typeof NET!=='undefined' && NET.gameId){
    ONLINE_BUSY_ACTIVE=true;
    if(Date.now()-ONLINE_BUSY_T>15000){ ONLINE_BUSY_T=Date.now(); if(NET.heartbeatBusy) NET.heartbeatBusy(); }
  } else if(ONLINE_BUSY_ACTIVE){
    ONLINE_BUSY_ACTIVE=false; ONLINE_BUSY_T=0; if(typeof NET!=='undefined' && NET.clearBusy) NET.clearBusy();
  }
  if(CL.online && room && room.phase==='ready' && room.paused){
    // PAUSADO pelo anfitrião: congela o cronômetro (não conta nem avança a rodada). O deadline
    // foi guardado em paused_remaining_ms (ver netPause); ao retomar, o servidor rearma.
    ONLINE_LASTSEC=null;
    const bar=document.querySelector('.cl-statusbar-clock'); if(bar) bar.textContent='⏸';
  } else if(CL.online && room && room.phase==='ready'){
    const armed = (room.deadline||0) > 0;
    if(!armed){
      // TIMER DESARMADO: ainda tem gente terminando a rodada (copa/partida). NÃO conta o cronômetro
      // — só tenta armar (o servidor arma quando NINGUÉM está ocupado, ou seja, todos na tela do time).
      ONLINE_LASTSEC=null;
      const bar=document.querySelector('.cl-statusbar-clock'); if(bar) bar.textContent='⏳';
      if(NET.armReadyTimer && !ONLINE_BUSY_ACTIVE){ if(Date.now()-ONLINE_ADV_T>1200){ ONLINE_ADV_T=Date.now(); NET.armReadyTimer(); } }
    } else {
      const secs=Math.max(0,Math.ceil(((room.deadline||0)-Date.now())/1000));
      if(secs!==ONLINE_LASTSEC){ ONLINE_LASTSEC=secs;
        if(secs<=10 && secs>0){ netBeep(secs<=3?1100:820); }
        if(secs<=0){ netBeep(1400); }
        const bar=document.querySelector('.cl-statusbar-clock'); if(bar) bar.textContent=secs+'s';
        const wrap=document.querySelector('.cl-statusbar'); if(wrap){ wrap.classList.toggle('urgent', secs<=10); }
      }
      const all=room.participants.length>0 && room.participants.every(p=>p.ready);
      if(secs<=0 || all){
        // início da rodada: QUALQUER cliente pede ao servidor pra avançar (validado pelo deadline/
        // prontidão + barreira busy) — não depende do anfitrião estar com a aba ativa.
        if(NET.advancePhaseExpired){ if(Date.now()-ONLINE_ADV_T>900){ ONLINE_ADV_T=Date.now(); NET.advancePhaseExpired(); } }
        else if(NET.isHost){ room.participants.forEach(p=>{ if(!p.ready) p.ready=true; }); NET.toRunning(); }
      }
    }
  } else if(CL.online && room && room.phase==='running' && CL.screen!=='live' && !CL.live && !CL._liveBusy && !ONLINE_BUSY_ACTIVE){
    // SAVE ÚNICO: quem reabre a próxima 'ready' é SÓ o ANFITRIÃO, e SÓ depois de já ter fechado a
    // rodada (sem commit pendente). Se um convidado reabrisse antes, a fase ciclava e a rodada
    // travava/loopava. O reopen só efetiva quando ninguém está busy (barreira do servidor).
    ONLINE_LASTSEC=null;
    if(NET.isHost && !CL._hostPendingCommit && NET.reopenReady){ if(Date.now()-ONLINE_ADV_T>1200){ ONLINE_ADV_T=Date.now(); NET.reopenReady(); } }
    // CONVIDADO: se a fase é 'running' e ainda não joguei ESTA rodada, jogo agora (rede de segurança
    // caso o gatilho do onState tenha sido perdido enquanto eu via o sorteio/classificação). onlineRunRound
    // se auto-protege (não re-simula rodada já jogada, não interrompe telas de sorteio/classificação).
    if(CL.screen==='main' && CL._playedRound!==S.round && typeof onlineRunRound==='function'){ onlineRunRound(); }
  } else { ONLINE_LASTSEC=null; }
  // REDE DE SEGURANÇA DO SORTEIO/RECONCILE (convidado): NÃO depender só do realtime (throttle de 5
  // eventos/s, e o evento de UPDATE de `games` pode atrasar/se perder) nem de uma interação do
  // usuário. Se estou ATRÁS da rodada da sala e numa tela passiva (não em partida/sorteio/
  // classificação), reconcilio a cada tick (~300ms) — o onlineReconcileIfBehind já é barato quando
  // já estou em dia (early-return) e mostra o sorteio da copa como parte do fluxo. Sem isto, um
  // convidado parado no 'waitround'/'main' via o sorteio muitos segundos depois do anfitrião (ou só
  // ao clicar num menu) — privilégio de informação entre jogadores.
  if(CL.online && typeof NET!=='undefined' && !NET.isHost && room && typeof S!=='undefined' && S &&
     CL.screen!=='live' && !CL.live && !CL._liveBusy && !CL._hotseat &&
     CL.screen!=='cupdraw' && CL.screen!=='classif' && CL.screen!=='seatclassif' &&
     (room.round||0)!==(S.round||0) && typeof onlineReconcileIfBehind==='function'){
    onlineReconcileIfBehind(room);
  }
  const intv=Math.max(100, 300/(CL.speedMult||1));
  ONLINE_TIMER=setTimeout(onlineTimerLoop, intv);
}
let ONLINE_TURNOVER_BUSY=false;
/* FIM DE TEMPORADA travado: a rodada passou do fim do calendário (a virada não completou — ex.: um
   fallback antigo salvou o estado na última rodada sem virar). Em vez de jogar uma rodada FANTASMA
   (que aparece como "Rodada 39"), pede ao servidor completar a virada (rodada vazia além do
   calendário -> round++ -> vira a temporada) e adota o estado novo. Idempotente/concorrência-segura
   (o servidor resolve por state_version; vários clientes chamando -> um vira, os outros só adotam). */
function onlineCompleteSeasonTurnover(){
  if(ONLINE_TURNOVER_BUSY || typeof NET==='undefined' || !NET.resolveRound) return;
  ONLINE_TURNOVER_BUSY=true;
  (async ()=>{ try{
    const res = await NET.resolveRound(S.round);
    if(res && !res.error){
      const saved = await NET.loadGame();
      if(saved && saved.S){
        Object.assign(S, saved.S); S.clubId=CL.clubId;
        if(typeof applyViewerDivision==='function') applyViewerDivision(CL.clubId);
        S.xi = resolveClubXI(CL.clubId);
        if(typeof syncDataClubsFromState==='function') syncDataClubsFromState();
        if(typeof applyViewerDivision==='function') applyViewerDivision(CL.clubId);
        CL._playedRound=-1; CL.screen='main'; CL.tab='jogo';
        // credita a premiação ANTES do cdraw: se o desenho falhar, o dinheiro não se perde.
        const _sum=(typeof applyMyPrevSeasonPrizes==='function')?applyMyPrevSeasonPrizes():null; if(typeof accrueCareerStats==='function') accrueCareerStats();
        cdraw();
        if(typeof openPressRoom==='function') openPressRoom(_sum);
        else { const _dl=(typeof DIV_LABEL_FULL!=='undefined' && DIV_LABEL_FULL[S.division]) || ('Série '+S.division); toastC('🏆 Nova temporada '+(S.season||'')+'! Você está na '+_dl+'.'); }
        // reabre a fase 'ready' pra próxima rodada (senão os dois ficam presos sem conseguir jogar)
        if(NET.isHost && typeof NET.reopenReady==='function') NET.reopenReady();
      }
    }
  }catch(e){ console.warn('completar virada online:', e && e.message); } finally { ONLINE_TURNOVER_BUSY=false; } })();
}
function onlineRunRound(){ if(CL.screen==='live'||CL.live||CL._liveBusy) return; if(!CL.online || !S) return;
  // não interrompe as telas de sorteio/classificação pós-rodada (o convidado está vendo o ranking)
  if(CL.screen==='classif'||CL.screen==='cupdraw'||CL.screen==='seatclassif') return;
  // DESEMPREGADO (Fase 2): não jogo — só assisto. Marco a rodada como "vista" pra não tentar simular
  // um clube que não é mais meu (o servidor já resolve o clube antigo como CPU, sem humano no assento).
  if(CL.unemployed){ CL._playedRound=S.round; return; }
  // rodada além do calendário -> a virada não completou: completa via servidor (não joga fantasma)
  if(Array.isArray(S.sched) && (S.round||0) >= S.sched.length){ onlineCompleteSeasonTurnover(); return; }
  // JÁ JOGUEI ESTA RODADA: fico LIVRE aguardando o fechamento (anfitrião) — NÃO re-simulo a mesma
  // rodada. Sem isso, o cliente ficava em loop jogando a rodada 1 pra sempre (a fase volta pra
  // 'running' antes do host fechar, e o cliente jogava de novo).
  if(CL._playedRound===S.round) return;
  // SAVE ÚNICO: não jogo uma rodada ANTES de espelhar o estado autoritativo do anfitrião. Se o host
  // já fechou a rodada (games.round à frente da minha), primeiro sincronizo (mundo/tabela novos).
  if(typeof NET!=='undefined' && NET.room && (NET.room.round||0) > (S.round||0)){ onlineReconcileIfBehind(NET.room); return; }
  // PARTIDA DE COPA PENDENTE primeiro — MESMA ordem do clJogar. Sem isto, quando a fase avança pro
  // 'running' (cronômetro/outro jogador) ANTES de eu clicar em Jogar, esta rede de segurança jogava
  // a LIGA direto e PULAVA a Copa do Brasil -> o servidor auto-simulava a minha chave (bug "não
  // joguei a copa"). Agora joga a copa ao vivo; ao terminar (cupQueue vazio), a liga entra na
  // próxima passada. O fluxo de resultado da copa auto-avança no online (ver clCupResultContinue).
  if(typeof pendingUserCupMatches==='function'){
    const cupQueue=pendingUserCupMatches();
    if(cupQueue.length && typeof startCupLiveMatch==='function'){ startCupLiveMatch(cupQueue[0]); return; }
  }
  CL._liveBusy=true; startLiveRound(); }

/* Recupera a rodada de LIGA quando a fase virou 'running' enquanto o cliente estava numa
   tela AO VIVO de copa/espectador. Nesse caso a borda que dispara onlineRunRound no onState
   (wireNet) foi SUPRIMIDA pelo guard CL.screen==='live' e se perdeu (é edge-triggered de
   disparo único) — o cronômetro de 60s da rodada de liga corre em paralelo e expira durante
   a partida de copa (que dura mais que isso). Ao voltar pra tela normal, reavaliamos a fase e
   destravamos a rodada. Se a fase ainda for 'ready', não faz nada (segue o fluxo normal:
   marcar pronto + cronômetro). Corrige o travamento "host preso no pós-jogo da copa". */
function onlineRecoverRunRound(){
  const room=(typeof NET!=='undefined')?NET.room:null;
  if(CL.online && room && room.phase==='running' && CL.screen!=='live' && !CL.live && !CL._liveBusy){
    onlineRunRound(); return true;
  }
  return false;
}

/* quando o usuário clica Jogar no modo online, marca "pronto" em vez de rodar sozinho */
function onlineMarkReady(){ NET.setReady(true, CL.clubId); toastC('Pronto! À espera dos outros treinadores.'); cdraw();
  // publica minha escalação/tática atual pros outros clientes — se eu ficar ausente, meu clube é
  // simulado com ELA (não com autoXI). availableXI/tacticForClub leem via S.clubXI (ver a ponte).
  if(typeof NET!=='undefined' && NET.publishLineup && typeof S!=='undefined' && S){ if(!CL.humans||CL.humans[CL.clubId]) NET.publishLineup((S.xi||[]).slice(), S.tactic||'equilibrado'); }
  onlineRecoverRunRound(); // a fase já virou 'running' (cronômetro expirou enquanto eu jogava a copa)? destrava a rodada de liga
}

