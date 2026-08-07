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
/* Gera o PNG do print da tela (mesma arte usada desde sempre: fundo verde da marca, cartão com
   cantos arredondados e sombra) e devolve o Blob, em vez de abrir numa aba. Quem chama decide o
   que fazer com ele — abrir, baixar ou entregar pro compartilhamento nativo. */
async function buildShareBlob(){
  if(!window.html2canvas) await waitForLib(()=>!!window.html2canvas, 6000);
  if(!window.html2canvas) throw new Error('Não foi possível gerar a imagem (sem conexão?)');
  const el = document.querySelector('.cl-main, .cl-live') || document.querySelector('#c-root');
  const shot = await html2canvas(el, { backgroundColor:null, scale:2, useCORS:true, logging:false,
    ignoreElements:(e)=> e.classList && e.classList.contains('cl-noshot') });
  const W=1080, H=1350, pad=56, radius=42;
  const out=document.createElement('canvas'); out.width=W; out.height=H; const ctx=out.getContext('2d');
  ctx.fillStyle='#2f8f2f'; ctx.fillRect(0,0,W,H);
  const availW=W-2*pad, availH=H-2*pad;
  const sc=Math.min(availW/shot.width, availH/shot.height);
  const dw=Math.round(shot.width*sc), dh=Math.round(shot.height*sc);
  const dx=Math.round((W-dw)/2), dy=Math.round((H-dh)/2);
  ctx.save(); ctx.shadowColor='rgba(0,0,0,.4)'; ctx.shadowBlur=34; ctx.shadowOffsetY=12;
  roundRectPath(ctx,dx,dy,dw,dh,radius); ctx.fillStyle='#0b2a14'; ctx.fill(); ctx.restore();
  ctx.save(); roundRectPath(ctx,dx,dy,dw,dh,radius); ctx.clip();
  ctx.drawImage(shot,dx,dy,dw,dh); ctx.restore();
  return await new Promise((res,rej)=>out.toBlob(b=>b?res(b):rej(new Error('Falha ao gerar imagem'))));
}
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
  // NO LOBBY o problema é só metadado (o anfitrião já começou e eu não vi): refreshRoom resolve.
  // DENTRO DO JOGO, refreshRoom relê participantes/fase/rodada e NÃO readota o estado
  // compartilhado — era por isso que este item de menu não consertava dessincronia nenhuma.
  // Ali o caminho certo é a retomada completa (ver clResenhaSync).
  if(CL.online && S){ clResenhaSync(); return; }
  toastC('🔄 Sincronizando com a sala...');
  (async ()=>{ try{ await NET.refreshRoom(); if(CL.screen==='online') cdraw(); }catch(e){ toastC('⚠ '+(e.message||'erro ao sincronizar')); } })();
}

/* ============================ SINCRONIZAR A RESENHA ============================
   Quando um cliente sai de sincronia, o estado local pode estar errado de formas que nenhum
   remendo pontual cobre: rodada atrasada, sim, mas também flag presa (CL._liveBusy), partida
   órfã em CL.live, timer de apresentação/pênalti pendurado, evento de realtime perdido. Cada
   travada desta semana foi uma variação disso, e a lista de "o que limpar" envelhece a cada
   feature nova.

   Então aqui a saída é RECARREGAR A PÁGINA de verdade — o único jeito de garantir heap limpo —
   e voltar direto pra tela do clube, sem passar por login nem por lobby. Isso já era possível e
   faltava pouco pra ficar de pé:
     • a sessão do Supabase é persistida (persistSession:true), então o F5 não desloga;
     • clRequestOrJoin -> routeAfterJoin -> onlineBeginSeason(false) já é o caminho de RECONEXÃO,
       e ele termina em CL.screen='main' com o shared_state autoritativo já adotado, preservando
       carreira/finanças/clube próprios (ver CAREER_KEYS e restoreMyFinances).
   O que faltava era o boot saber que aquele reload era uma retomada — daí a marca em
   sessionStorage (RESYNC_KEY), lida em index.html.

   REGRA DE OURO (pedido do dono do jogo): a sincronia NUNCA pode custar o resultado da partida
   de alguém. Por isso nada acontece sem passar por resenhaSyncCheck() — partida em andamento
   é bloqueio absoluto, e resultado ainda não confirmado pelo servidor exige um "sim" explícito
   na tela, nunca um reload silencioso. */
const RESYNC_KEY='rf98:resync';
/* mantém ?sala=CODE na barra de endereço durante a Resenha: assim até um F5 na unha (sem passar
   pelo modal) reentra na sala certa em vez de cair na tela de abertura. O anfitrião nunca tinha
   esse parâmetro — ele só existia no link de convite. */
function resenhaRememberRoomInUrl(){
  try{
    const code=(NET&&NET.room&&NET.room.code)||null; if(!code) return;
    const u=new URL(window.location.href);
    if(u.searchParams.get('sala')===code) return;
    u.searchParams.set('sala', code);
    history.replaceState(null,'',u.pathname+u.search);
  }catch(e){}
}
/* TRAVAS. Devolve {bloqueio, avisos[]}:
   • bloqueio  -> não dá pra sincronizar agora de jeito nenhum (perderia partida em andamento);
   • avisos[]  -> dá, mas tem coisa em risco; a tela pede confirmação explícita. */
async function resenhaSyncCheck(){
  const out={ bloqueio:null, avisos:[] };
  if(typeof CL==='undefined' || !CL.online || typeof S==='undefined' || !S){
    out.bloqueio='Você não está numa Resenha.'; return out;
  }
  // 1) PARTIDA EM ANDAMENTO: bloqueio absoluto. Recarregar aqui apaga a partida que está
  //    rolando na tela e o resultado dela nunca chega no servidor.
  if(CL.live && !CL.live.done){
    out.bloqueio='Você está no meio de uma partida. Termine o jogo primeiro — sincronizar agora apagaria o resultado dela.';
    return out;
  }
  // 2) RESULTADO DA RODADA AINDA NÃO CONFIRMADO. Só pergunto ao servidor se eu de fato joguei
  //    esta rodada; quem ainda não jogou não tem resultado nenhum a perder.
  if(CL._playedRound===S.round && typeof NET!=='undefined' && NET.mySeat){
    const seat=await NET.mySeat();
    if(!seat) out.avisos.push('Não deu pra confirmar com o servidor se o resultado da sua partida chegou (conexão instável). Se ele não tiver chegado, esta rodada será resolvida sem o seu placar.');
    else if(seat.last_result_round!==S.round) out.avisos.push('O resultado da sua partida desta rodada ainda não consta no servidor. Se você sincronizar agora, a rodada pode ser resolvida sem ele.');
  }
  // 3) NEGOCIAÇÕES AINDA NÃO ENVIADAS: viajam junto do resultado da rodada, então uma rodada
  //    travada as segura. Não bloqueiam (senão a sincronia seria impossível justamente quando é
  //    necessária), mas o usuário precisa saber o que está pondo em risco.
  const pend=[];
  if(Array.isArray(S._netTransfers) && S._netTransfers.length) pend.push('contratações/vendas');
  if(Array.isArray(S._netOffers) && S._netOffers.length) pend.push('propostas enviadas');
  if(Array.isArray(S._netCounters) && S._netCounters.length) pend.push('contrapropostas');
  if(Array.isArray(S._netOfferDrops) && S._netOfferDrops.length) pend.push('respostas a propostas');
  if(pend.length) out.avisos.push('Você tem '+pend.join(', ')+' que ainda não foram confirmadas pelo servidor. Elas viajam junto com o resultado da rodada e podem se perder.');
  // 4) ANFITRIÃO NO MEIO DO FECHAMENTO: existe rede (qualquer membro fecha rodada órfã, ver
  //    onlineOrphanCloseCheck), mas recarregar bem agora atrasa a sala.
  if(NET && NET.isHost && CL._hostPendingCommit) out.avisos.push('Você é o anfitrião e está fechando a rodada agora. A sala se vira sozinha se você sair, mas pode demorar um pouco mais.');
  return out;
}
/* modal principal */
function clResenhaSync(){
  CL.menu=null; CL._syncOffered=(S&&S.round!=null)?S.round:0;   // não reoferecer sozinho nesta rodada
  overlayC(dlg('Sincronizar a Resenha', `<div class="cl-resync">
    <div class="cl-resync-h">Deu aquela piscada e perdeu o bonde?</div>
    <p class="cl-resync-p">Parece que essa Resenha perdeu a sincronia. É hora de juntar geral de novo.
    Clique no botão abaixo para sincronizar com os outros treinadores da Resenha.</p>
    <div class="cl-resync-how">
      <div class="cl-resync-how-t">O que vai acontecer</div>
      <ul>
        <li>A página recarrega e o jogo <b>volta direto pra tela do seu clube</b> — sem login, sem lobby.</li>
        <li>Seu time, seu elenco, seu caixa e sua carreira vêm do servidor, <b>na mesma rodada dos outros</b>.</li>
        <li>Nada é apagado: o que já está salvo na sala continua lá.</li>
      </ul>
    </div>
    <div id="cl-resync-check" class="cl-resync-check">Conferindo se é seguro sincronizar agora…</div>
    <div id="cl-resync-actions" class="cl-cal-ok"></div>
  </div>`,{w:560,bodyClass:'cl-body-green'}));
  (async ()=>{
    let r; try{ r=await resenhaSyncCheck(); }catch(e){ r={bloqueio:'Não foi possível conferir o estado da sala.',avisos:[]}; }
    const box=document.querySelector('#cl-resync-check'), act=document.querySelector('#cl-resync-actions');
    if(!box||!act) return;   // o usuário fechou a tela enquanto a checagem rodava
    if(r.bloqueio){
      box.className='cl-resync-check block';
      box.innerHTML='<b>🛑 Agora não dá.</b><br>'+escC(r.bloqueio);
      act.innerHTML=btn('Entendi','clCloseOverlay()',{icon:'✔',cls:'cl-btn-cancel'});
      return;
    }
    if(r.avisos.length){
      box.className='cl-resync-check warn';
      box.innerHTML='<b>⚠ Antes de sincronizar, veja isto:</b><ul>'+r.avisos.map(a=>'<li>'+escC(a)+'</li>').join('')+'</ul>'
        +'<label class="cl-resync-ok"><input type="checkbox" id="cl-resync-agree" onchange="clResenhaSyncAgree(this.checked)"> Entendi o risco e quero sincronizar mesmo assim</label>';
      act.innerHTML=btn('Cancelar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})
        +btn('Sincronizar agora','clResenhaSyncGo()',{icon:'🔄',cls:'cl-btn-ok',dis:true});
      return;
    }
    box.className='cl-resync-check ok';
    box.innerHTML='<b>✓ Tudo certo.</b><br>Nenhuma partida em andamento e nada seu pendente no servidor.';
    act.innerHTML=btn('Cancelar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})
      +btn('Sincronizar agora','clResenhaSyncGo()',{icon:'🔄',cls:'cl-btn-ok'});
  })();
}
/* o botão de sincronizar só liga depois do "entendi o risco" (caminho com avisos) */
function clResenhaSyncAgree(on){
  const act=document.querySelector('#cl-resync-actions'); if(!act) return;
  const b=act.querySelectorAll('button')[1]; if(b) b.disabled=!on;
}
function clResenhaSyncGo(){
  const code=(typeof NET!=='undefined' && NET.room && NET.room.code)||null;
  if(!code){ toastC('⚠ Sala não identificada — não dá pra sincronizar.'); return; }
  // re-checa o bloqueio duro na hora do clique: a checagem inicial pode ter ficado alguns
  // segundos na tela, e nesse meio-tempo uma partida pode ter começado (rede de segurança).
  if(CL.live && !CL.live.done){ toastC('⚠ Partida em andamento — não dá pra sincronizar agora.'); return; }
  try{ sessionStorage.setItem(RESYNC_KEY, code); }catch(e){}
  toastC('🔄 Sincronizando com a sala…');
  try{ if(typeof NET!=='undefined' && NET.clearBusy) NET.clearBusy(); }catch(e){}   // libera a barreira antes de sair
  setTimeout(()=>{ try{ location.reload(); }catch(e){} }, 250);
}
/* RETOMADA (chamada pelo boot, em index.html, quando existe a marca do reload). Entra pelo mesmo
   caminho da reconexão normal — clRequestOrJoin -> routeAfterJoin -> onlineBeginSeason(false) —
   que termina na tela do clube com o estado do servidor já adotado. */
function clResenhaResume(code){
  CL.screen='online';
  CL.net={step:'conta',intent:'join',authMode:'login',code:code,name:'',email:'',password:'',phone:''};
  wireNet();
  const st=(typeof NET!=='undefined' && NET.authStatus)?NET.authStatus():{};
  CL.net.email=st.email||''; CL.net.name=st.name||'';
  CL.mgr=CL.mgr||st.name||'';
  cdraw();
  clRequestOrJoin(code);
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
  // 'cupclassif' entrou junto de 'classif'/'seatclassif': o reconcile navegava por cima da tela
  // da copa e deixava o timer de 10s dela órfão — ele disparava depois, já dentro da partida de
  // liga, e derrubava o jogador (bug do "não assisti a 3ª rodada", 01/ago).
  if(CL.screen==='live' || CL.live || CL._liveBusy || CL._hotseat || CL.screen==='cupdraw' || CL.screen==='classif' || CL.screen==='seatclassif' || CL.screen==='cupclassif') return;
  const authRound = room.round||0;
  // Reconcilia sempre que a rodada da sala DIFERE da minha — à frente (rodada normal) OU "pra trás"
  // (nova temporada: a virada leva a rodada de 38 -> 0). Antes só cobria `>`, então na virada o
  // cliente ficava preso na última rodada da temporada velha ("Rodada 39") e nunca adotava a nova
  // divisão. A comparação REAL de "quem está mais novo" é por (temporada, rodada), feita abaixo.
  // SINCRONIA DE FUNDO A CADA RODADA. Antes a reconciliação só olhava o NÚMERO da rodada: mesma
  // rodada = nada a fazer. Só que dois clientes podem estar na mesma rodada com mundos DIFERENTES
  // — publicação perdida, adoção parcial, um fallback antigo que rodou só de um lado. Era assim
  // que a sala ia se afastando em silêncio até alguém notar o estrago rodadas depois.
  // games.state_version é incrementado por TODA resolução do servidor, então ele é o sinal honesto
  // de "meu mundo está velho". Se a versão que eu adotei ficou pra trás, reconcilio mesmo com a
  // rodada igual. O usuário não sente: o adopt já roda atrás da tela de sincronização
  // (showSyncLoading) e, entre rodadas, da própria pausa técnica.
  const authVer = room.stateVersion||0;
  const meuVer = CL._adoptedVer||0;
  const versaoVelha = authVer>0 && meuVer>0 && authVer>meuVer;
  if(authRound === (S.round||0) && !versaoVelha) return;   // mesma rodada E mesma versão — nada a fazer
  if(ONLINE_RECONCILE_BUSY || typeof NET==='undefined' || !NET.loadGame) return;
  ONLINE_RECONCILE_BUSY=true;
  // mostra o loading JÁ AQUI, antes do await da rede — cobre exatamente a janela onde o
  // convidado ficava vendo a tela ATUAL (podia ser a principal, com dados da rodada VELHA, se
  // ele tivesse ido ver o time enquanto esperava) até o fetch do estado novo terminar. Some só
  // quando a tela de destino (classificação ou principal já atualizada) estiver pronta.
  if(typeof showSyncLoading==='function') showSyncLoading();
  (async ()=>{ try{
    const saved = await NET.loadGame();
    CL._adoptedVer=(typeof NET!=='undefined' && NET._loadedVersion)||CL._adoptedVer||0; // versão do estado que acabei de adotar
    const sState = saved && saved.S;
    const oldSeason = S.season||0;
    const newer = sState && ( (sState.season||0) > oldSeason || ((sState.season||0)===oldSeason && (sState.round||0) > (S.round||0)) );
    if(typeof _prLog==='function') _prLog('GUEST reconcile: authRound='+(room.round||0)+' myRound='+(S.round||0)+' newer='+!!newer);
    if(!newer && typeof hideSyncLoading==='function') hideSyncLoading(); // nada pra adotar afinal -> não trava o loading
    if(newer){
      const isTurnover = (sState.season||0) > oldSeason; // VIRADA de temporada (rodada volta a 0)
      const _roundAntes = (S.round||0);                  // jornada que acabou de ser resolvida (ver queueRoundCupClassifs)
      const _career=(typeof snapshotCareer==='function')?snapshotCareer():null; // carreira é minha, não do anfitrião (ver CAREER_KEYS)
      Object.assign(S, sState);
      if(typeof restoreCareer==='function') restoreCareer(_career);
      // o save é do HOST — restaura o MEU clube (senão eu assumo o clube do host no motor)
      S.clubId = CL.clubId;
      applyViewerDivision(CL.clubId);                    // F3.5: renderiza a divisão do PRÓPRIO clube (temporada 2+)
      S.xi = resolveClubXI(CL.clubId);
      if(typeof syncDataClubsFromState==='function') syncDataClubsFromState();
      if(typeof pruneAppliedNetTransfers==='function') pruneAppliedNetTransfers(); // solta as transferências já aplicadas pelo servidor
      if(typeof pruneAppliedNetOffers==='function') pruneAppliedNetOffers();       // idem pras propostas mandadas a outro humano
      if(typeof pruneAppliedNetCounters==='function') pruneAppliedNetCounters(); // idem pras contrapropostas
      if(typeof pruneAppliedNetOfferDrops==='function') pruneAppliedNetOfferDrops(); // idem pras baixas de proposta
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
          const liga=()=>{
            if(typeof showLiveClassif==='function') showLiveClassif();
            if(typeof checkPendingManagerEvents==='function') checkPendingManagerEvents();
            if(typeof handleResenhaCareer==='function') handleResenhaCareer(); // demissão/convite na Resenha — idem host
          };
          // AS COPAS DA JORNADA VÊM ANTES DA TABELA DA LIGA — E ESTE É O CAMINHO DO CONVIDADO.
          // Era AQUI que morria a regra "todo mundo vê a classificação de todas as competições":
          // queueRoundCupClassifs existia só no onlineAdoptServerRound, que é o caminho de quem
          // FECHA a rodada (o anfitrião). O convidado espelha o estado por este reconcile e ia
          // direto pra tabela da liga — por isso só UM humano via a classificação da copa.
          const go=()=>{
            if(typeof queueRoundCupClassifs==='function') queueRoundCupClassifs(_roundAntes, liga);
            else liga();
          };
          if(typeof adGate==='function') adGate(go); else go(); // janela de publicidade (ver adGate em main.js)
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
    // entrada NOVA nesta sala (escolheu o clube agora, temporada já rolando) — primeira vez que
    // ESTE jogador vê o clube dele, então mostra a Boas-vindas como no sorteio normal.
    if(NET.room.phase==='lobby'){ CL.net.step='lobby'; cdraw(); } else { onlineBeginSeason(true); }
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
/* MODO TESTE (TESTING_FREE_DIVISION_PICK, ui/main.js): escolher a divisão inicial da Resenha
   precisa acontecer AQUI, antes de "Abrir" — o pool de clubes da sala (game_seats) é fixado na
   criação (netCreateRoom, net/supabase-adapter.js), não dá pra trocar depois no lobby. Some
   inteiro fora do modo teste (volta a ser sempre Série D, sem escolha nenhuma). */
function salaTestDivRow(){
  if(typeof TESTING_FREE_DIVISION_PICK==='undefined' || !TESTING_FREE_DIVISION_PICK) return '';
  const cfg=(typeof UNI_CONFIGS!=='undefined') && UNI_CONFIGS.brasil; if(!cfg) return '';
  const chosen=(CL.testStartDiv && CL.testStartDiv.brasil) || cfg.order[cfg.order.length-1];
  const opts=cfg.order.map(d=>{
    const label=(cfg.label&&cfg.label[d])||d, on=d===chosen;
    return `<div class="cl-comp-toggle on ${on?'start':''}" onclick="clSetTestStartDiv('brasil','${d}')" style="cursor:pointer">${(typeof divisionTrophyImg==='function'&&divisionTrophyImg(d,22))||'<span class="cl-divopt-ic">🏆</span>'}<b>${escC(label)}</b>${on?'<span class="cl-comp-start-tag">início</span>':''}</div>`;
  }).join('');
  return `<div class="cl-authfield"><label>🧪 Modo teste — divisão inicial da sala</label>
    <div class="cl-divopt-row">${opts}</div></div>`;
}
function scSalaHost(){ const n=CL.net;
  const body=`<div class="cl-wiz-authcard">
      <div class="cl-authfield"><label>Nome da sala</label>
        <input id="cl-focus" maxlength="18" placeholder="Ex: Resenha da firma" value="${escC(n.roomName||'')}" oninput="CL.net.roomName=this.value;netSalaSync()" onkeydown="if(event.key==='Enter')clOpenRoom()"></div>
      <div class="cl-authhint">Cada jogador escolhe o próprio time ao entrar, entre os clubes ainda controlados pela CPU.</div>
      ${salaTestDivRow()}
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
/* MODO TESTE (TESTING_FREE_DIVISION_PICK, ui/main.js): qual divisão do Brasil ESTA sala usa —
   normalmente sempre D, mas o anfitrião pode ter escolhido outra em scSalaHost (netCreateRoom já
   criou os assentos nela). Fonte de verdade, em ordem: (1) o clube de QUALQUER participante já
   sentado (funciona pra qualquer cliente, incluindo convidados que nunca escolheram nada
   localmente — divisionOfResenhaClub deriva do id, sem precisar guardar a divisão na sala/banco);
   (2) sala vazia ainda (acabou de ser criada) — só o próprio anfitrião sabe, no CL.testStartDiv
   local dele; (3) RESENHA_START_DIV ('D'), a regra de sempre. */
function resolveRoomDivision(){
  const room=NET.room;
  if(room){
    for(const p of (room.participants||[])){
      if(p.clubId && typeof divisionOfResenhaClub==='function'){ const d=divisionOfResenhaClub(p.clubId); if(d) return d; }
    }
  }
  if(typeof TESTING_FREE_DIVISION_PICK!=='undefined' && TESTING_FREE_DIVISION_PICK && CL.testStartDiv && CL.testStartDiv.brasil) return CL.testStartDiv.brasil;
  return (typeof RESENHA_START_DIV!=='undefined') ? RESENHA_START_DIV : 'D';
}
/* clubes ainda controlados pela CPU nesta sala — o próprio jogador escolhe entre eles
   (mesma lista que scMidJoin usa pra convite/entrada com a liga já rolando). */
function freeClubIds(){ const room=NET.room; if(!room) return [];
  // o pool de sorteio precisa ser exatamente os clubes da divisão desta sala (resolveRoomDivision
  // — normalmente D, ver ali), não o DATA.clubs local do convidado (que pode estar noutro
  // universo/divisão e não bater com os assentos).
  const div=resolveRoomDivision();
  const pool = (typeof resenhaStartClubs==='function' && resenhaStartClubs(div).length) ? resenhaStartClubs(div)
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
  if(!room){ onlineBeginSeason(true); return; }
  const poolById={}; (typeof resenhaStartClubs==='function'?resenhaStartClubs(resolveRoomDivision()):[]).forEach(c=>{ poolById[c.id]=c; });
  // só treinadores COM assento sorteado; ordem DETERMINÍSTICA por clubId → todos veem a mesma sequência
  const list=(room.participants||[]).filter(p=>p.clubId).slice()
    .sort((a,b)=> String(a.clubId).localeCompare(String(b.clubId)));
  if(!list.length){ onlineBeginSeason(true); return; }
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
    CL._resDrawTimer=setTimeout(()=>{ if(CL.net) CL.net.draw=null; onlineBeginSeason(true); }, d.fast?500:1600);
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
/* `fresh`=true só na saída do reveal do sorteio (startResenhaDraw/resenhaDrawTick) e na entrada
   nova de um clube livre (clPickMidJoinClub) — únicos momentos em que faz sentido mostrar a
   Boas-vindas ao Clube (ver showBoasVindas, ui/main.js). Reconexão a jogo em andamento
   (routeAfterJoin, acima neste arquivo) chama sem argumento e cai direto na tela principal,
   como sempre foi. */
function onlineBeginSeason(fresh){ const room=NET.room; if(!room) return; const me=room.participants.find(p=>p.id===NET.self.id);
  // SEGURANÇA: convidado sem clube ainda? re-lê os assentos e tenta de novo (o sorteio do host pode
  // não ter chegado). NUNCA pega o clube de outro — dois usuários com o MESMO time era exatamente
  // o bug. Tenta até 6x (~6s); se ainda não tiver assento, aborta com aviso (não rouba clube).
  if(CL.online && !NET.isHost && (!me || !me.clubId)){
    onlineBeginSeason._retry=(onlineBeginSeason._retry||0)+1;
    if(onlineBeginSeason._retry<=6 && typeof NET!=='undefined' && NET.refreshRoom){
      (async ()=>{ try{ await NET.refreshRoom(); }catch(e){} setTimeout(()=>onlineBeginSeason(fresh), 1000); })();
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
  // MODO TESTE (TESTING_FREE_DIVISION_PICK, ui/main.js): a divisão real desta sala pode não ser D
  // (anfitrião escolheu outra em scSalaHost) — divisionOfResenhaClub deriva do PRÓPRIO clube já
  // confirmado (me.clubId), então funciona igual pro anfitrião e pra qualquer convidado.
  if(typeof setUniverse==='function') setUniverse('brasil');
  const startDiv = (typeof divisionOfResenhaClub==='function') ? divisionOfResenhaClub(me.clubId) : ((typeof RESENHA_START_DIV!=='undefined') ? RESENHA_START_DIV : 'D');
  const startClubs = (typeof resenhaStartClubs==='function' && resenhaStartClubs(startDiv).length) ? resenhaStartClubs(startDiv) : ((DATA.clubsSerieA||DATA.clubs)||[]);
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
  CL.tab='jogo'; CL.selPlayer=squad(CL.clubId)[0]?.pid||null;
  // entrada fresca (logo após o sorteio): mostra a Boas-vindas ao Clube antes da tela principal.
  // reconexão a jogo em andamento vai direto pra TELA PRINCIPAL do time, como sempre foi.
  resenhaRememberRoomInUrl();   // ?sala=CODE na barra de endereço: um F5 na unha reentra na sala
  // igual ao solo: boas-vindas -> sorteios de abertura de TODAS as competições -> tela do clube.
  // Antes a Resenha entrava direto no clube e as cerimônias apareciam semanas adentro, cada uma na
  // véspera da estreia da sua competição (ver startSeasonOpeningDraws em ui/main.js).
  if(fresh && typeof showBoasVindas==='function') showBoasVindas(()=>{ if(typeof startSeasonOpeningDraws==='function') startSeasonOpeningDraws(); });
  else { CL.screen='main'; cdraw(); }

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
        CL._adoptedVer=(typeof NET!=='undefined' && NET._loadedVersion)||CL._adoptedVer||0; // versão do estado que acabei de adotar
        if(savedState && savedState.S){
          const _career=(typeof snapshotCareer==='function')?snapshotCareer():null; // carreira é minha, não do anfitrião (ver CAREER_KEYS)
          Object.assign(S, savedState.S);
          if(typeof restoreCareer==='function') restoreCareer(_career);
          // convidado ENTRANDO sem carreira própria: começa a régua do zero em vez de herdar a
          // Segurança no cargo / o histórico do anfitrião, que vêm juntos no save da sala.
          if(!NET.isHost && (!_career || _career.jobSecurity==null)){
            S.jobSecurity=60; S.roundsSinceFired=null; S.pendingJobOffers=[]; S.coachHistory=[]; S.lastClubChangeSeason=null;
          }
          // O save é do HOST — S.clubId/S.xi dele. RESTAURA o MEU clube: sem isso, quem reconecta/volta
          // (ex.: depois de ser expulso) assume o CLUBE DO HOST no motor -> "dois usuários com o mesmo
          // time". CL.clubId é o clube (livre) que EU acabei de assumir; o motor tem que usar ELE.
          S.clubId = CL.clubId;
          applyViewerDivision(CL.clubId);                // F3.5: renderiza a divisão do PRÓPRIO clube (temporada 2+)
          S.xi = resolveClubXI(CL.clubId);
          CL.selPlayer = (squad(CL.clubId)[0]||{}).pid || CL.selPlayer; // pid: CL.selPlayer é comparado com p.pid
          syncDataClubsFromState();
          // o estado carregado é o do ANFITRIÃO: extrato, totais e carimbo de premiação dele vêm
          // junto. Restaura os MEUS por cima — sem isto, toda vez que o convidado entrava na sala
          // ele voltava a ver as transações do anfitrião e as próprias sumiam (ver restoreMyFinances).
          if(typeof restoreMyFinances==='function') restoreMyFinances();
          console.log('✓ Jogo carregado (rodada', savedState.round, ') — clube:', CL.clubId); }
        // SEMENTE DO ESTADO COMPARTILHADO: sala nova, mundo recém-montado e NADA salvo ainda.
        // Sem isto, a 1ª rodada chamava resolve-round com games.shared_state vazio, a função devolvia
        // 409 "sem estado salvo ainda" e o cliente caía no FALLBACK LOCAL — justamente a rodada em que
        // o servidor deveria ser a autoridade única. Quem semeia é só o ANFITRIÃO (o convidado monta o
        // mesmo mundo a partir da mesma seed, mas a autoridade é do host), e só quando não há save —
        // reconexão a jogo em andamento cai no ramo de cima e não sobrescreve nada.
        else if(NET.isHost && NET.saveGame){
          try{ await NET.saveGame({ S, round: S.round }); console.log('✓ Estado inicial semeado (rodada', S.round, ')'); }
          catch(e){ console.warn('Semente do estado inicial:', e && e.message); }
        }
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
/* AS DUAS TRAVAS CONTRA O NÓ QUE TRAVA A SALA (ver onlineTimerLoop). Cada regra do fluxo é
   razoável sozinha; juntas elas se trancavam — cliente preso numa tela não era puxado pra rodada
   certa, e por estar na tela contava como ocupado, e por contar como ocupado a sala não andava,
   e por não andar ninguém saía da tela. */
/* REPARO, NÃO PREVENÇÃO: puxar quem ficou pra trás faz ele PERDER os jogos que não assistiu, e
   isso não pode ser rotina. A prevenção é a barreira segurar a sala (ver BUSY_MAX_MS, que
   destrava no lugar em vez de soltar). Este número só existe pro save que JÁ quebrou — atrasado
   tanto assim, os jogos daquelas rodadas não existem mais em lugar nenhum e ficar parado não
   traz nenhum de volta. Por isso é alto: só dispara quando não há mais o que salvar. */
const ROUND_LAG_MAX=3;
/* 10s, não 2min. A destrava NÃO pula ninguém e não solta a barreira — ela só conserta o que
   prendeu ESTE cliente e o devolve à ação que ele deve. Sendo inofensiva pros outros, não há
   motivo pra ser lenta: 2 minutos parados matam a dinâmica do jogo, e o cliente que travou
   costuma travar de cara. Quanto antes ele volta a andar, antes a sala anda. */
const BUSY_MAX_MS=10000;
const CUP_FLOW_SCREENS_LOCAL=['cupclassif','cupdraw','cupview','classif','seatclassif'];
function onlineTimerLoop(){
  const room=(typeof NET!=='undefined')?NET.room:null;
  // SAVE ÚNICO: o ANFITRIÃO fecha a rodada quando ninguém está mais em partida (não-bloqueante,
  // teto de 90s do busy). Convidados voltam livres e só ESPELHAM (onlineReconcileIfBehind).
  if(CL.online && CL._hostPendingCommit && typeof onlineHostCloseRound==='function'){
    onlineHostCloseRound();
  }
  // PARTIDA ÓRFÃ NA TELA: CL.live vivo mas a tela é outra = alguma navegação tardia passou por
  // cima do jogo (o caso clássico era o timer da copa; qualquer outro futuro cai aqui também).
  // Sem isto o jogo roda invisível até o fim e o jogador simplesmente não vê a rodada dele.
  if(CL.online && CL.live && !CL.live.done && CL.screen==='main' && !CL._hotseat){
    console.warn('partida em andamento fora da tela — devolvendo o jogador pro jogo');
    CL.screen='live'; if(typeof cdraw==='function') cdraw();
  }
  // FAILOVER DO FECHAMENTO: se o anfitrião sumiu (fechou a aba, caiu, foi deslogado), ninguém
  // chamava resolve-round e a sala INTEIRA ficava presa na pausa técnica pra sempre — o fechamento
  // era ponto único de falha. A edge function aceita qualquer membro da sala e é idempotente,
  // então qualquer cliente pode fechar a rodada órfã (ver onlineOrphanCloseCheck).
  onlineOrphanCloseCheck();
  // HEARTBEAT DE PRESENÇA: carimba last_seen a cada ~15s enquanto estou na Resenha, pra a barra de
  // status mostrar "online" de verdade (o presence do realtime era instável e dava todo mundo Offline).
  if(CL.online && typeof NET!=='undefined' && NET.gameId && NET.heartbeatSeen){
    if(Date.now()-ONLINE_SEEN_T>15000){ ONLINE_SEEN_T=Date.now(); NET.heartbeatSeen();
      // AUTOCURA DA SESSÃO: se ela sumiu no meio do jogo (soluço de auth), reidrata do storage —
      // NET.uid (identidade congelada) mantém o cliente funcional enquanto isso, mas as ESCRITAS
      // precisam do JWT vivo; sem esta reidratação o jogador ficava com a sessão morta até o F5.
      if(typeof SB_AUTH_USER!=='undefined' && !SB_AUTH_USER && typeof netRefreshAuth==='function'){ netRefreshAuth(); }
    }
  }
  // BARREIRA DE SINCRONIZAÇÃO: enquanto EU ainda estou fechando a rodada anterior, bato um
  // heartbeat "ocupado" — o servidor não arma o cronômetro nem avança a fase sem mim (ver
  // arm_ready_timer / advance_phase_if_expired).
  // Ao sair da sequência, limpo o "ocupado" uma vez (fim normal = libera; queda = expira em ~90s).
  //
  // A sequência inteira conta, não só a tela ao vivo: partida -> CLASSIFICAÇÃO -> SORTEIO da copa
  // -> tela do time. Cobrir só 'live'/'cupdraw' deixava o cronômetro armar durante a
  // classificação, e aí o sorteio da Copa do Brasil abria com o relógio JÁ correndo ao fundo
  // (apitando durante um evento que é à parte). Agora o cronômetro só arma quando TODOS
  // terminaram o sorteio e voltaram pra tela do time — que é a regra que o jogo promete.
  //
  // A OBRIGAÇÃO DE COPA conta como ocupado do MESMO jeito, mesmo com o cliente parado na tela do
  // time: entre o fim da partida de copa e o próximo "Jogar" (tela de resultado, escalação, pausa
  // técnica) o cara está em 'main' e, sem isto, o cronômetro da liga armava, contava e apitava por
  // cima dele — a rodada começava sem quem ainda devia a copa da semana, e ele voltava pra tela
  // principal sem ver o próprio jogo. Com a obrigação dentro da barreira, a rodada de liga só
  // ARMA quando todo mundo zerou a copa, que é a regra pedida: quem não joga a copa espera quem joga.
  onlineSettleCupDebt();   // ver definição: a dívida de copa se quita por qualquer caminho, não só jogando
  // ===== "OCUPADO" TEM PRAZO DE VALIDADE =====
  // O busy_until é renovado a cada 15s enquanto o cliente se considerar ocupado — e um cliente
  // TRAVADO se considera ocupado para sempre, então ele renovava indefinidamente e a sala inteira
  // ficava refém dele (medido na K8AJ6: 23 minutos parados com os dois assentos ocupados). O teto
  // do servidor (90s no busy_until) nunca chegava a expirar justamente porque era renovado.
  // Aqui o relógio é da ETAPA: se eu estou me declarando ocupado há mais de BUSY_MAX_MS na MESMA
  // etapa, alguma coisa travou do meu lado — paro de segurar a sala e deixo o jogo andar.
  onlineForceExpiredDecision();   // ver definição: modal de decisão vencido não pode segurar a sala
  onlineOpenQueuedDraw();         // ver definição: sorteio na fila se ABRE, não vira "ocupado" eterno
  const _etapaBusy = onlineStageKey();
  if(CL._busyStage!==_etapaBusy){ CL._busyStage=_etapaBusy; CL._busySince=0; CL._busyUnstuck=0; }
  let _euOcupado = CL.online && onlineClosingRound();
  if(_euOcupado){
    if(!CL._busySince) CL._busySince=Date.now();
    // DESTRAVA NO LUGAR — NUNCA SOLTA A SALA PRA ME PULAR.
    // A saída óbvia seria parar de me declarar ocupado, mas aí a rodada anda SEM mim e eu perco os
    // meus jogos sem ter assistido — o que não faz sentido nenhum. Então, em vez de soltar a
    // barreira, eu conserto o que me prendeu: limpo os cronômetros pendurados e as flags de tela e
    // volto pra ação que eu DEVO nesta etapa (a partida/classificação pendente). A sala continua
    // esperando por mim — só que agora eu consigo andar. Se nem isso resolver, ela espera mesmo:
    // sala parada com aviso é muito melhor que jogador pulado em silêncio.
    if(Date.now()-CL._busySince > BUSY_MAX_MS && Date.now()-(CL._busyUnstuck||0) > BUSY_MAX_MS){
      CL._busyUnstuck=Date.now();
      console.warn('ocupado há '+Math.round((Date.now()-CL._busySince)/1000)+'s na etapa '+_etapaBusy+
        ' (tela "'+CL.screen+'") — destravando NO LUGAR (a sala continua esperando por mim)');
      if(CL._liveTimer && (!CL.live || CL.live.done)){ clearTimeout(CL._liveTimer); CL._liveTimer=null; }
      if(typeof clearCupFlowTimer==='function') clearCupFlowTimer();
      if(typeof clearCupIntroTimer==='function') clearCupIntroTimer();
      if(typeof clearLeagueIntroTimer==='function') clearLeagueIntroTimer();
      if(!CL.live){ CL._liveBusy=false; CL._cupIntro=null; CL._leagueIntro=false; CL._leagueIntroRound=null;
        if(CUP_FLOW_SCREENS_LOCAL.indexOf(CL.screen)>=0){ CL.screen='main'; CL.tab='jogo'; if(typeof cdraw==='function') cdraw(); }
        if(typeof onlineRecoverRunRound==='function') onlineRecoverRunRound();   // volta pra MINHA ação pendente
      }
    }
  } else { CL._busySince=0; CL._busyUnstuck=0; }
  if(_euOcupado && typeof NET!=='undefined' && NET.gameId){
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
    // ===================== A LARGADA TEM UM DONO SÓ: O ANFITRIÃO =====================
    // Antes, QUALQUER cliente podia empurrar a fase (advance_phase_if_expired), armar o cronômetro
    // (arm_ready_timer) ou, no limite, virar pra 'running' sozinho. Eram caminhos independentes de
    // avanço, cada um nascido pra destravar um caso — e cada um uma porta pra um cliente sair de
    // sincronia com o resto. Tapar porta com barreira só criava a porta seguinte (a sessão de
    // 06-07/08 inteira foi isso: cada correção virava o bug seguinte).
    // Agora o convidado NÃO AVANÇA NADA. Ele só marca pronto e desenha o relógio. Quem libera o
    // dia é o anfitrião, por onlineHostRelease — um ponto único, auditável, que é onde a "mesa do
    // anfitrião" (passo 2) vai pendurar o botão e o pular-ausente.
    const armed = (room.deadline||0) > 0;
    if(!armed){
      ONLINE_LASTSEC=null;
      const bar=document.querySelector('.cl-statusbar-clock'); if(bar) bar.textContent='⏳';
    } else {
      const secs=Math.max(0,Math.ceil(((room.deadline||0)-Date.now())/1000));
      if(ONLINE_BUSY_ACTIVE){
        // eu cheguei atrasado numa tela de fechamento: não apita nem conta por cima de mim
        ONLINE_LASTSEC=null;
        const bar=document.querySelector('.cl-statusbar-clock'); if(bar) bar.textContent='⏳';
      } else if(secs!==ONLINE_LASTSEC){ ONLINE_LASTSEC=secs;
        if(secs<=10 && secs>0){ netBeep(secs<=3?1100:820); }
        if(secs<=0){ netBeep(1400); }
        const bar=document.querySelector('.cl-statusbar-clock'); if(bar) bar.textContent=secs+'s';
        const wrap=document.querySelector('.cl-statusbar'); if(wrap){ wrap.classList.toggle('urgent', secs<=10); }
      }
    }
    if(NET.isHost) onlineHostTick(room, armed);
  } else if(CL.online && room && room.phase==='running' && CL.screen!=='live' && !CL.live && !CL._liveBusy && !ONLINE_BUSY_ACTIVE){
    // SAVE ÚNICO: quem reabre a próxima 'ready' é SÓ o ANFITRIÃO, e SÓ depois de já ter fechado a
    // rodada (sem commit pendente). Se um convidado reabrisse antes, a fase ciclava e a rodada
    // travava/loopava. O reopen só efetiva quando ninguém está busy (barreira do servidor).
    ONLINE_LASTSEC=null;
    // O FALLBACK DE REABERTURA DO HOST FOI REMOVIDO DE VEZ. Ele reabria a fase sem saber se a
    // etapa corrente tinha FECHADO: bastava o host ter cumprido a etapa (stageDone persiste em
    // disco e sobrevive ao reload da sincronia) com o fechamento ainda pendente pra ele reabrir a
    // MESMA etapa em ciclo — ready -> cronômetro -> running -> nada -> reopen -> ... (medido no
    // harness; é o loop pós-sincronia). Toda reabertura legítima já tem chamada explícita no fim
    // do fechamento (onlineHostCloseRound, _commitLeagueRound, cão de guarda, virada) — e se o
    // host cair depois de fechar sem reabrir, o cão de guarda de QUALQUER cliente reabre (1860).
    // CONVIDADO: se a fase é 'running' e ainda não joguei ESTA rodada, jogo agora (rede de segurança
    // caso o gatilho do onState tenha sido perdido enquanto eu via o sorteio/classificação). onlineRunRound
    // se auto-protege (não re-simula rodada já jogada, não interrompe telas de sorteio/classificação).
    // 'cupview' incluído: as novas telas de copa (chave/grupos) convidam a navegar depois da
    // partida de copa — quem estava lá quando a rodada de liga começou ficava de fora dela.
    if((CL.screen==='main'||CL.screen==='cupview') && CL._playedRound!==S.round && typeof onlineRunRound==='function'){ onlineRunRound(); }
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
  // ===== ÚLTIMO RECURSO: SAVE JÁ QUEBRADO =====
  // As guardas acima ("não interrompe partida/sorteio/classificação") existem por bons motivos,
  // mas juntas com o heartbeat de ocupado elas formam um nó que se aperta sozinho:
  //   preso numa tela -> não sou puxado pra rodada certa -> continuo preso -> conto como ocupado
  //   -> a sala não avança -> ninguém sai da tela.
  // Medido na sala K8AJ6: dois humanos ONLINE, um na rodada 4 e outro na 7, com a sala na 9 e
  // parada há 23 minutos.
  // A PREVENÇÃO é a barreira segurar a sala e o cliente se destravar NO LUGAR (ver BUSY_MAX_MS).
  // Isto aqui NÃO é prevenção: puxar pro estado da sala faz o jogador perder os jogos que ele não
  // assistiu, e isso nunca pode ser o caminho normal. Só vale pro save que já quebrou — atrasado
  // ROUND_LAG_MAX rodadas, aquelas partidas não existem mais em lugar nenhum e ficar parado não
  // traz nenhuma de volta; a escolha passa a ser entre um save inutilizado e um save que continua.
  if(CL.online && room && typeof S!=='undefined' && S && typeof onlineReconcileIfBehind==='function'
     && (room.round||0) - (S.round||0) >= ROUND_LAG_MAX){
    const k=(room.round||0)+':'+(S.round||0);
    if(CL._lagForced!==k){
      CL._lagForced=k;
      console.warn('atrasado '+((room.round||0)-(S.round||0))+' rodada(s) (eu='+(S.round||0)+' sala='+(room.round||0)+
        ') — puxando o estado da sala por cima da tela "'+CL.screen+'"');
      // solta o que prende: partida órfã, flags de tela e o próprio "ocupado"
      if(CL._liveTimer){ clearTimeout(CL._liveTimer); CL._liveTimer=null; }
      CL.live=null; CL._liveBusy=false; CL._cupIntro=null; CL._leagueIntro=false;
      if(typeof clearCupFlowTimer==='function') clearCupFlowTimer();
      if(typeof NET.clearBusy==='function') NET.clearBusy();
      ONLINE_BUSY_ACTIVE=false; ONLINE_BUSY_T=0;
      CL.screen='main';
      onlineReconcileIfBehind(room);
    }
  }
  // DIAGNÓSTICO DA PAUSA: passou de 12s parado aqui, o console diz exatamente o que falta — fase,
  // rodada minha vs. da sala, quem está em partida e quem não publicou. Cada travada desta semana
  // custou uma ida ao banco pra descobrir isso; agora o relatório vem junto do problema.
  if(CL.online && CL.screen==='waitround' && room && typeof S!=='undefined' && S){
    const dt=Date.now()-(CL._waitSince||Date.now());
    // OFERTA AUTOMÁTICA DA SINCRONIA. O diagnóstico logo abaixo sempre soube que a sala estava
    // parada, mas só contava isso pro console — o jogador ficava olhando a pausa técnica sem
    // saber que existia saída. Passando de WAIT_ESCAPE_MS, o modal se oferece sozinho. Fica FORA
    // do intervalo de 10s do diagnóstico de propósito: dentro dele, a primeira reavaliação só
    // viria aos 22s. Uma vez por rodada (CL._syncOffered) e nunca por cima de partida ou de tela
    // de decisão com contagem regressiva.
    if(dt>WAIT_ESCAPE_MS && CL._syncOffered!==S.round && !CL.live
       && !CL._cupIntroTimer && !CL._leagueIntroTimer && typeof clResenhaSync==='function'){
      clResenhaSync();
    }
    if(dt>12000 && Date.now()-(CL._waitDiagT||0)>10000){
      CL._waitDiagT=Date.now();
      const cl=NET._claimed||{}, ag=Date.now(); const ocupados=[], semResultado=[];
      for(const uid in cl){ const c=cl[uid]; if(!(c&&c.clubId)) continue;
        if(c.busy_until && new Date(c.busy_until).getTime()>ag) ocupados.push(c.clubId);
        if(!(c.last_result && c.last_result_round===S.round)) semResultado.push(c.clubId); }
      console.warn('pausa há '+Math.round(dt/1000)+'s | fase='+room.phase+
        ' rodada: eu='+(S.round||0)+' sala='+(room.round||0)+
        ' | cronômetro='+((room.deadline||0)>0?'armado':'desarmado')+
        ' | eu-ocupado='+ONLINE_BUSY_ACTIVE+
        ' | em partida=['+ocupados.join(',')+'] sem resultado=['+semResultado.join(',')+']');
    }
  }
  roomDayTick();     // item 3: carimba o momento do dia que EU já cumpri (ver roomDayTick)
  dayRoundWatch();   // item 3: confere a jornada do ponteiro contra a local (ver dayRoundWatch)
  // TETO de 1s: o intervalo acompanha o ritmo, mas nos tempos lentos a conta explodia (em 'Longo'
  // dava ~6,6s entre sondagens — reconcile, cronômetro e barreira todos com essa latência).
  const intv=Math.max(100, Math.min(1000, 300/((typeof roundSpeedMult==='function'?roundSpeedMult():CL.speedMult)||1)));
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
      CL._adoptedVer=(typeof NET!=='undefined' && NET._loadedVersion)||CL._adoptedVer||0; // versão do estado que acabei de adotar
      if(saved && saved.S){
        const _career=(typeof snapshotCareer==='function')?snapshotCareer():null; // carreira é minha, não do anfitrião (ver CAREER_KEYS)
        Object.assign(S, saved.S);
        if(typeof restoreCareer==='function') restoreCareer(_career);
        S.clubId=CL.clubId;
        if(typeof applyViewerDivision==='function') applyViewerDivision(CL.clubId);
        S.xi = resolveClubXI(CL.clubId);
        if(typeof syncDataClubsFromState==='function') syncDataClubsFromState();
        if(typeof restoreMyFinances==='function') restoreMyFinances(); // ANTES da premiação: o carimbo de "já recebi" é meu, não do anfitrião
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
/* ==================== O DIA DA SALA, VINDO DO SERVIDOR ====================
   ITEM 1 DO CHECKLIST. Até aqui cada cliente OLHAVA O PRÓPRIO ESTADO pra decidir o que mostrar:
   "tenho confronto de copa? então copa; senão, liga". Dois humanos podiam responder essa pergunta
   de formas diferentes e os dois estarem certos pelas suas contas — foi assim que acabaram
   jogando competições diferentes na mesma jornada. A pergunta agora tem uma resposta só, e ela
   mora numa linha do banco: games.day_idx aponta pra uma entrada do calendário da sala.

   O QUE O PONTEIRO DECIDE: qual COMPETIÇÃO está em campo. A jornada continua andando pelo caminho
   de sempre (games.round + fechamento). São dois eixos, e eles se encontram aqui: o ponteiro só
   manda quando fala da MESMA jornada que eu. Se falar de outra, devolvo null e o caminho antigo
   assume — desalinhamento degrada pro comportamento de antes, nunca em tela parada.

   E se o ponteiro ficar PRA TRÁS da jornada (fechamento por atalho, sala de save antigo), o
   day_sync o puxa pra frente. Uma vez por jornada, senão viraria enxurrada de chamadas.

   DESACORDO SEGURA — NUNCA DEVOLVE A DECISÃO AO CLIENTE. A primeira versão desta função devolvia
   null quando o ponteiro falava de outra jornada, e eu chamei isso de "degradar em vez de
   congelar". Era uma porta de divergência disfarçada de rede de segurança: medido no harness
   (cenário 3, sala 365ZV reproduzida), 12 instantes em que o cliente voltou a decidir sozinho —
   o único vermelho da execução. Agora discordância devolve {hold}, e quem recebe hold ESPERA e
   puxa os dois lados pra concordar:
     · ponteiro ATRÁS da minha jornada -> day_sync empurra o ponteiro pra frente;
     · ponteiro À FRENTE -> sou EU que estou velho: reconcilio meu mundo com o da sala.
   Sala parada com os dois na mesma tela é melhor que dois humanos "certos" em telas diferentes. */
/* carência antes de a rede de segurança do ponteiro entrar (ver o day_sync abaixo). A sequência
   normal de fim de jornada — fechamento, classificação da liga, classificação das copas, janela de
   publicidade e volta à tela do clube — leva dezenas de segundos, e é ela que vira o dia pelo
   caminho certo (o carimbo do momento 'classificacao'). Curto demais aqui faz a rede de segurança
   virar o caminho normal, que é justamente o que o item 3 está tirando de cena. */
const DAY_SYNC_GRACE_MS=45000;
function roomDay(){
  const d=(typeof NET!=='undefined' && NET.room) ? NET.room.day : null;
  if(!d || !S) return null;                 // sala sem plano (save antigo): caminho de sempre
  const meu=S.round||0;
  if(d.round===meu){ CL._daySyncSince=0; return d; }
  if(d.round<meu){
    /* O day_sync VOLTOU A SER SÓ REDE DE SEGURANÇA. Ele empurra o ponteiro pela jornada LOCAL —
       exatamente o número que o item 3 está tirando de cena — então dispará-lo à primeira
       discordância atropelava o caminho normal: fechada a rodada N, o ponteiro fica legitimamente
       no dia da jornada N até o último assento carimbar a classificação, e o day_sync o arrancaria
       dali antes disso, decidindo pelo palpite local o que o carimbo ia decidir em seguida.
       Com a carência, o caminho normal tem tempo de acontecer e o day_sync só entra quando ele
       claramente não aconteceu (ponteiro preso, sala de save antigo, fechamento por atalho). */
    if(!CL._daySyncSince) CL._daySyncSince=Date.now();
    if(Date.now()-CL._daySyncSince > DAY_SYNC_GRACE_MS &&
       typeof NET!=='undefined' && NET.daySync && CL._daySyncedFor!==meu){
      CL._daySyncedFor=meu;
      console.warn('ponteiro preso na jornada '+d.round+' há '+Math.round((Date.now()-CL._daySyncSince)/1000)+
        's com a sala na '+meu+' — puxando pelo day_sync (rede de segurança, não caminho normal)');
      NET.daySync(meu).then(()=>{ if(typeof NET.refreshRoom==='function') NET.refreshRoom(); }).catch(()=>{});
    }
  } else if(typeof NET!=='undefined' && NET.room && typeof onlineReconcileIfBehind==='function'){
    onlineReconcileIfBehind(NET.room);      // o ponteiro está adiante: quem tem que andar sou eu
  }
  return { hold:true, round:d.round, comp:d.comp };
}
/* avisa o servidor que terminei o dia que estava vendo. Idempotente por construção: mando a visão
   que eu tinha, e quem chegar depois recebe "já virou" em vez de andar de novo.

   Fecha os TRÊS momentos numa tacada. Os momentos (escalando/jogando/classificacao) ainda não
   desenham tela nenhuma — quem desenha continua sendo o fluxo de sempre — então esperar um ciclo
   de atualização entre cada um só somaria atraso entre uma competição e a próxima. Quando os
   momentos passarem a mandar na tela, este laço vira um passo por momento.

   Uma tentativa por dia (_dayDoneKey pelo índice): se o servidor não andou é porque alguém ainda
   está ocupado, e martelar não muda isso — a próxima volta do loop tenta de novo com a visão nova. */
/* ITEM 2 — "NINGUÉM OCUPADO" NÃO É "DIA CUMPRIDO". O caminho antigo (day_advance_if_all_done)
   liberava o dia quando nenhum assento estava marcado como ocupado, e ocupado é uma FOTO: entre uma
   tela e outra todo mundo está livre por um instante, e o dia virava sem ninguém ter cumprido nada.
   Agora cada assento CARIMBA o dia que viveu (day_ack) e o dia só vira quando o último carimbar.
   O caminho antigo fica como degradação pra servidor sem a função nova — nunca como preferência. */
const DAY_ACK_IGNORAR_AUSENTES_SEG=0;   // "começar sem eles" entra no item 5, junto do modal do anfitrião
/* OS TRÊS MOMENTOS VIRARAM FATOS, E CADA UM É CARIMBADO SOZINHO.
   A primeira versão fechava os três de uma vez porque nenhum deles desenhava tela — eram só um
   contador. Agora eles são a espinha do dia:
     · escalando    = EU já disse que estou pronto para esta etapa;
     · jogando      = EU já cumpri a minha partida desta etapa (e publiquei o resultado);
     · classificacao= EU já voltei para a tela do clube, sem nada pendente na frente.
   Cada carimbo é um fato do MEU assento, não uma leitura do relógio nem do "ocupado" de ninguém.
   Quando o último assento carimba, o servidor — e só ele — vira o momento; virado o terceiro, vira
   o DIA e escreve games.round a partir do plano. É por isso que o momento 'classificacao' aparecer
   no ponteiro é o sinal de que a jornada foi cumprida por todos: é ele que o anfitrião espera para
   fechar a rodada (ver onlineHostCloseRound).
   Uma chamada por (dia:momento) — o carimbo é idempotente no servidor, mas martelar não adianta:
   o que falta é o carimbo DO OUTRO. */
function roomDayNaTelaDoClube(){
  return CL.screen==='main' && !CL.live && !CL._liveBusy && !CL._cupIntro && !CL._leagueIntro
         && !(typeof S!=='undefined' && S && S._pendingDrawShows && S._pendingDrawShows.length);
}
function roomDayFact(d){
  const mom=d.moment;
  // CHEGUEI NESTE DIA: estou na tela do clube (ou já pedi para começar), sem nada aberto na frente.
  if(mom==='escalando') return CL._readyForStage===onlineStageKey() || roomDayNaTelaDoClube();
  if(mom==='jogando'){
    // CUMPRI A COMPETIÇÃO DESTE DIA. Tem que ser por COMPETIÇÃO, não por etapa da semana: a jornada
    // 3 tem Libertadores, Sul-Americana e Copa do Brasil, e as três dividem a mesma etapa 'cup' —
    // usar onlineStageDone() aqui faria terminar a primeira valer como carimbo das outras duas, que
    // é exatamente o atalho do last_cup_round que já nos custou uma sala travada.
    if(d.comp!=='liga') return (typeof cupWasSeen==='function') ? cupWasSeen(d.comp) : false;
    return (typeof onlineStageDone==='function' && onlineStageDone()) || CL._playedRound===(S.round||0);
  }
  // VI O QUE VEIO DEPOIS e voltei para a tela do clube — este é o carimbo que encerra o dia.
  if(mom==='classificacao') return roomDayNaTelaDoClube();
  return false;
}
function roomDayTick(){
  if(!CL.online || typeof NET==='undefined' || !NET.room) return;
  const d=NET.room.day; if(!d) return;                         // sala sem plano (save antigo)
  if(!(NET.dayAck||NET.dayDone)) return;
  if(typeof S==='undefined' || !S) return;
  /* Que dias eu posso carimbar: o da MINHA jornada — e a CAUDA da que acabou de ser resolvida.
     A segunda parte não é folga: o momento 'classificacao' do dia de liga acontece, por
     construção, DEPOIS de a rodada fechar (é a tabela que sai do fechamento), e nesse instante o
     meu S.round já é o seguinte. Sem esta linha ninguém jamais carimbaria o último momento do dia,
     o ponteiro ficaria preso no dia da jornada velha e só a rede de segurança do day_sync o
     tiraria de lá — ou seja, o palpite local voltaria a decidir justamente o que o carimbo existe
     para decidir. */
  const meu=S.round||0;
  if(!(d.round===meu || (d.round<meu && d.moment==='classificacao'))) return;
  if(!roomDayFact(d)) return;                                  // ainda não cumpri este momento
  const k=d.idx+':'+d.moment;
  if(CL._dayAckKey===k) return;
  CL._dayAckKey=k;
  const p = NET.dayAck ? NET.dayAck(d.idx, d.moment, DAY_ACK_IGNORAR_AUSENTES_SEG)
                       : NET.dayDone(d.idx, d.moment);
  Promise.resolve(p).then(()=>{ if(NET.refreshRoom) return NET.refreshRoom(); }).catch(()=>{});
}

/* ==================== ITEM 3, PRIMEIRA METADE: LER A JORNADA DO PONTEIRO ====================
   HOJE quem manda na jornada é o motor local do anfitrião: playRound() incrementa S.round, o
   saveGame publica, e games.round + o ponteiro SEGUEM esse número. O objetivo do item 3 é inverter
   a causa — a jornada passa a sair do dia apontado (day_ack já escreve games.round a partir do
   plano) e todo cliente, inclusive o anfitrião, adota o número do ponteiro.
   Inverter isso de uma vez seria trocar o dono da jornada no escuro. Então esta metade LÊ o número
   do ponteiro e o CONFERE contra o local, mantendo a escrita antiga: se os dois nunca discordarem
   de forma sustentada, cortar a escrita local vira uma troca sem surpresa; se discordarem, o
   cenário 3 acusa ANTES de o cliente publicado depender disso.
   Divergência INSTANTÂNEA é normal e não conta: o ponteiro só larga o dia da jornada N quando o
   último assento carimba, então logo depois do fechamento ele fica legitimamente um dia atrás por
   alguns instantes. O que não pode existir é divergência que PERSISTE — essa é o ponteiro preso
   (ninguém carimbou) ou a jornada andando por fora dele. */
const DAY_ROUND_DRIFT_MS=12000;
function dayPointerRound(){
  const d=(typeof NET!=='undefined' && NET.room) ? NET.room.day : null;
  return (d && d.round!=null) ? d.round : null;
}
function dayRoundWatch(){
  if(!CL.online || typeof S==='undefined' || !S || S.round==null){ CL._dayDriftSince=0; return; }
  const pt=dayPointerRound();
  if(pt==null || pt===S.round){ CL._dayDriftSince=0; return; }   // sala sem plano ou de acordo
  if(!CL._dayDriftSince){ CL._dayDriftSince=Date.now(); return; }
  if(Date.now()-CL._dayDriftSince < DAY_ROUND_DRIFT_MS) return;
  const k=pt+':'+S.round;
  if(CL._dayDriftKey===k) return;                                // um aviso por par, não uma enxurrada
  CL._dayDriftKey=k;
  CL._dayDrift=(CL._dayDrift||0)+1;
  console.warn('ponteiro e jornada local discordam há '+Math.round((Date.now()-CL._dayDriftSince)/1000)+
    's: ponteiro='+pt+' eu='+(S.round||0)+' — o item 3 vai tirar essa segunda fonte de verdade');
}

function onlineRunRound(){ if(CL.screen==='live'||CL.live||CL._liveBusy) return; if(!CL.online || !S) return;
  // APRESENTAÇÃO JÁ NA TELA: as telas de "entrar em campo" (copa e liga) são OVERLAY, não trocam
  // CL.screen — continua valendo 'main'. Sem esta guarda, o loop do cronômetro (~300ms) reentra
  // aqui, reabre a mesma apresentação e RE-ARMA o auto-avanço de 6s a cada volta: a tela nunca
  // avançava sozinha e quem estivesse longe do teclado segurava a sala até o busy expirar.
  // A guarda é o TIMER, não o flag da tela: o overlay fecha ao clicar fora, e um flag preso ali
  // travaria esta rede de segurança pra sempre. O timer só existe enquanto o auto-avanço está
  // armado, e ele SEMPRE dispara (clique fora não o cancela) — então a espera é no máximo 6s.
  if(CL._cupIntroTimer || CL._leagueIntroTimer) return;
  // não interrompe as telas de sorteio/classificação pós-rodada (o convidado está vendo o ranking)
  if(CL.screen==='classif'||CL.screen==='cupdraw'||CL.screen==='seatclassif'||CL.screen==='cupclassif') return;
  // DESEMPREGADO (Fase 2): não jogo — só assisto. Marco a rodada como "vista" pra não tentar simular
  // um clube que não é mais meu (o servidor já resolve o clube antigo como CPU, sem humano no assento).
  if(CL.unemployed){ CL._playedRound=S.round; onlineMarkStageDone(); return; }
  // rodada além do calendário -> a virada não completou: completa via servidor (não joga fantasma)
  if(Array.isArray(S.sched) && (S.round||0) >= S.sched.length){ onlineCompleteSeasonTurnover(); return; }
  // JÁ CUMPRI ESTA ETAPA: fico LIVRE aguardando o fechamento — NÃO re-simulo. A checagem
  // definitiva é o mapa por (temporada, jornada, quarta|sábado), que nenhum caminho zera (ver
  // onlineMarkStageDone); o _playedRound fica como segunda linha pros caminhos degradados.
  if(onlineStageDone()) return;
  if(CL._playedRound===S.round) return;
  // SAVE ÚNICO: não jogo uma rodada ANTES de espelhar o estado autoritativo do anfitrião. Se o host
  // já fechou a rodada (games.round à frente da minha), primeiro sincronizo (mundo/tabela novos).
  if(typeof NET!=='undefined' && NET.room && (NET.room.round||0) > (S.round||0)){ onlineReconcileIfBehind(NET.room); return; }
  // ESTOU NA FRENTE DA SALA: espero, não jogo. Aconteceu em produção — dois humanos na 8ª rodada
  // enquanto outro já jogava a 9ª. A causa está no fechamento (ver onlineHostCloseRound: quando o
  // resolve-round falhava, quem fechava comitava a rodada LOCALMENTE e avançava sozinho, com o
  // servidor e todos os outros parados na rodada anterior). A causa foi corrigida lá, mas a trava
  // fica aqui também: qualquer caminho — atual ou futuro — que empurre um cliente à frente do
  // estado autoritativo agora o faz ESPERAR na tela do clube em vez de jogar uma rodada que ninguém
  // mais está jogando. Uma rodada jogada à frente não teria como ser reconciliada depois.
  if(typeof NET!=='undefined' && NET.room && (S.round||0) > (NET.room.round||0)){
    if(!CL._aheadWarned || CL._aheadWarned!==S.round){
      CL._aheadWarned=S.round;
      console.warn('à frente da sala: eu='+(S.round||0)+' sala='+(NET.room.round||0)+' — esperando o fechamento da rodada pra todos');
    }
    return;
  }
  // TRAVA DE KICKOFF (Fases 1 e 2): antes de simular QUALQUER partida da rodada (copa ou liga),
  // garante que estão carregados (a) o snapshot congelado do apito (games.kickoff_lineups, Fase 1 —
  // inputs de escalação/tática idênticos em todos os clientes) e (b) os streams PRÉ-COMPUTADOS da
  // rodada (kickoff-round -> round_events, Fase 2 — todos REPRODUZEM as mesmas partidas de liga em
  // vez de simular cada um a sua; ver buildLiveMatchObject). Marcadores por temporada+rodada (o nº
  // da rodada repete a cada temporada). Falha mesmo com retry -> segue sem (fallback = simulação
  // local com a ponte de assentos, comportamento antigo — nada trava).
  const _rk=(S.season||1)+'-'+(S.round||0);
  const needSnap = typeof NET!=='undefined' && NET.fetchKickoff && NET.room && !NET.room.kickoffLineups && CL._kickoffFetched!==_rk;
  const needStreams = typeof NET!=='undefined' && NET.fetchRoundStreams && !(CL._roundStreams && CL._roundStreams.key===_rk) && CL._streamsFetched!==_rk;
  if(needSnap || needStreams){
    if(CL._kickoffFetching) return;
    CL._kickoffFetching=true;
    (async ()=>{
      try{
        if(needSnap){
          await NET.fetchKickoff();
          if(!NET.room.kickoffLineups){ await new Promise(r=>setTimeout(r,700)); await NET.fetchKickoff(); } // retry: o carimbo pode estar a caminho
        }
        if(needStreams){
          let m=await NET.fetchRoundStreams(S.round);
          if(!m){ await new Promise(r=>setTimeout(r,700)); m=await NET.fetchRoundStreams(S.round); } // retry: o estado/apito pode estar a caminho
          if(m) CL._roundStreams={ key:_rk, matches:m };
        }
      }catch(e){}
      CL._kickoffFetching=false; CL._kickoffFetched=_rk; CL._streamsFetched=_rk;
      onlineRunRound(); // re-entra com snapshot+streams (ou segue sem, marcado como tentado nesta rodada)
    })();
    return;
  }
  // PARTIDA DE COPA PENDENTE primeiro — MESMA ordem do clJogar. Sem isto, quando a fase avança pro
  // 'running' (cronômetro/outro jogador) ANTES de eu clicar em Jogar, esta rede de segurança jogava
  // a LIGA direto e PULAVA a Copa do Brasil -> o servidor auto-simulava a minha chave (bug "não
  // joguei a copa"). Agora joga a copa ao vivo; ao terminar (cupQueue vazio), a liga entra na
  // próxima passada. O fluxo de resultado da copa auto-avança no online (ver clCupResultContinue).
  // A COMPETIÇÃO DO DIA VEM DO SERVIDOR (ver roomDay). Enquanto o dia é de uma copa, a liga não
  // entra — nem pra quem não disputa aquela copa. Enquanto o dia é de liga, nenhuma copa entra.
  // É a trava que faltava: as duas ramificações abaixo consultavam só o meu estado.
  const dia=roomDay();
  // SEGURAR É A RESPOSTA CERTA. Ponteiro e cliente discordando da jornada significa que um dos dois
  // está velho — roomDay() já disparou a correção dos dois lados. Até eles concordarem eu não jogo
  // nada: qualquer coisa que eu decidisse aqui seria pelo meu palpite local, que é exatamente a
  // divergência que este ponteiro existe pra acabar.
  if(dia && dia.hold){
    if(CL._holdAviso!==dia.round){ CL._holdAviso=dia.round;
      console.log('sala no dia da jornada '+dia.round+' ('+dia.comp+') e eu na '+(S.round||0) +
                  ' — esperando os dois concordarem, sem decidir nada por conta própria'); }
    return;
  }
  if(typeof pendingUserCupMatches==='function' && (!dia || dia.comp!=='liga')){
    const cupQueue=pendingUserCupMatches()
      .filter(c=>!dia || c.key===dia.comp)
      .filter(c=>typeof cupWasSeen!=='function' || !cupWasSeen(c.key));
    // apresentação da rodada de copa também aqui (ver showCupIntro) — mas com auto-avanço, porque
    // este caminho roda com o cronômetro de 60s da sala já correndo: uma tela que espera clique
    // seguraria a rodada dos outros jogadores.
    if(cupQueue.length && typeof showCupIntro==='function'){ showCupIntro(cupQueue[0], true); return; }
    if(cupQueue.length && typeof startCupLiveMatch==='function'){ startCupLiveMatch(cupQueue[0]); return; }
  }
  // RODADA DE COPA QUE EU NÃO JOGO: assisto junto, igual ao clJogar. Esta rede de segurança
  // conhecia só a copa em que EU tenho confronto (pendingUserCupMatches) e ignorava a lista de
  // quem fica de fora (cupRoundsUserSitsOut) — então, quando a fase virava 'running' antes do meu
  // clique em "Jogar", eu ia direto pra liga e a rodada de copa dos outros passava sem eu ver
  // nada. Era o caso relatado: numa rodada de Libertadores, quem não estava na competição pulou a
  // copa inteira e foi jogar o Brasileirão. Assistir é o que mantém a semana de copa simétrica —
  // todos entram e saem da copa no mesmo momento.
  // Chegar aqui já significa fase 'running': a largada foi dada pra sala inteira no mesmo
  // instante, então quem assiste entra JUNTO com quem joga — e é justamente por isso que a
  // partida do outro humano chega como transmissão ao vivo dele, e não como simulação local (ver
  // buildLiveMatchObject/isCup). Uma barreira extra aqui (a tentativa anterior de segurar o
  // espectador até os participantes terminarem) serializava o que tem que ser simultâneo e
  // matava a transmissão: não se transmite uma partida que já acabou.
  if(typeof cupRoundsUserSitsOut==='function' && typeof startCupRound==='function' && (!dia || dia.comp!=='liga')){
    const idle=cupRoundsUserSitsOut()
      .filter(c=>!dia || c.key===dia.comp)
      .filter(c=>typeof cupWasSeen!=='function' || !cupWasSeen(c.key));
    if(idle.length){
      const cand=idle[0];
      if(typeof cupMarkSeen==='function') cupMarkSeen(cand.key);
      CL._pendingCupIdleQueue=idle.slice(1);
      if(startCupRound(cand.key, cand.stage, null)) return;
    }
  }
  // BARREIRA DO DIA DE COPA: a rodada de liga da semana N só começa quando TODOS os humanos que
  // tinham partida de copa nesta semana já a cumpriram. É o "dia" da Fase 3 na prática — quarta
  // inteira antes de sábado inteiro — sem trocar a unidade de sincronia do servidor.
  // Sem isto, quem não tinha jogo de copa (ou terminava antes) entrava na liga enquanto o vizinho
  // ainda estava na quarta-feira: os dois viviam dias diferentes da mesma semana, que é a origem
  // da "confusão de calendário". Escape: o cronômetro da sala, o mesmo que força a entrada de
  // todos — ninguém fica preso se alguém travar na copa.
  // Dia de liga declarado pelo servidor: a barreira de copa abaixo já não tem o que segurar, e
  // mantê-la ligada só criaria uma espera por um dia que a sala inteira já fechou.
  if(typeof onlineCupDayPending==='function' && !(dia && dia.comp==='liga')){
    const faltam=onlineCupDayPending();
    if(faltam.length && !cupDayWaitExpired()){
      if(!CL._cupDayWarned || CL._cupDayWarned!==S.round){
        CL._cupDayWarned=S.round;
        console.log('dia de copa: esperando '+faltam.length+' treinador(es) terminarem a copa da semana antes de liberar a liga');
      }
      return;
    }
  }
  // ESTÁGIO DE QUARTA-FEIRA: cumprida a copa, a semana ainda NÃO libera o jogo de liga — ela
  // precisa fechar a quarta primeiro (o servidor resolve só as copas e devolve a semana no estágio
  // de sábado). Marcar pronto aqui é o que dispara esse fechamento, exatamente como acontece no
  // fim da rodada de liga. É isto que dá à quarta um momento próprio de sincronia: todos entram e
  // saem dela juntos, em vez de a copa ser um apêndice da rodada de liga.
  if(isCupStage()){
    // VÁLVULA DE SEGURANÇA. O estágio de quarta é um passo de sincronia a mais, e um passo a mais é
    // um lugar a mais pra travar (host que caiu antes de fechá-lo, resolve-round fora do ar). Se a
    // quarta não fechar em CUP_STAGE_MAX_MS, o cliente segue pro sábado como se a semana fosse de
    // um estágio só — e o servidor, ao resolver a liga, vê roundStage==='cup' e avança as copas
    // junto, exatamente como fazia antes desta mudança. Ou seja: a falha degrada pro comportamento
    // antigo em vez de parar a sala.
    if(!CL._cupStageSince || CL._cupStageRound!==S.round){ CL._cupStageRound=S.round; CL._cupStageSince=Date.now(); }
    if(Date.now()-CL._cupStageSince < CUP_STAGE_MAX_MS){
      // ANFITRIÃO: arma o fechamento da QUARTA. Sem isto ninguém fecharia esse estágio —
      // _hostPendingCommit só é armado no fim da partida de LIGA (ver finishLiveRound), que na
      // quarta não existe. Era o deadlock que a divisão em estágios criaria.
      if(typeof NET!=='undefined' && NET.isHost && !CL._hostPendingCommit){
        CL._hostPendingCommit={ RL:null, userResult:null, audit:null, round:S.round, uf:null, stage:'cup' };
      }
      // UMA VEZ POR RODADA. onlineMarkReady termina chamando onlineRecoverRunRound, que reentra
      // aqui — e sem esta guarda a dupla vira recursão infinita (medido: "Maximum call stack size
      // exceeded", com a aba travando). Marcar pronto é idempotente do ponto de vista da sala, e
      // uma vez basta: o que fecha a quarta é o anfitrião, não uma remarcação.
      if(CL._cupStageReady!==S.round){ CL._cupStageReady=S.round;
        onlineMarkStageDone();   // a quarta desta jornada está cumprida pra mim — nunca reentrar (ver onlineStageDone)
        onlineMarkReady(); }
      return;
    }
    console.warn('estágio de quarta não fechou em '+(CUP_STAGE_MAX_MS/1000)+'s — seguindo pro jogo de liga (a copa é resolvida junto pelo servidor)');
  }
  // RODADA DE LIGA: nunca mais cai em campo sem avisar. Antes esta linha chamava startLiveRound()
  // direto — e como o loop do cronômetro reentra aqui assim que o cliente pousa em 'main' (ver
  // onlineTimerLoop), o efeito era a rodada do Brasileirão COMEÇAR SOZINHA no segundo seguinte ao
  // fim de uma partida de copa, sem passar pela tela do clube. O jogador não revia escalação nem
  // entendia que aquilo já era outra competição. Agora a rodada de liga tem a mesma apresentação
  // que a copa sempre teve (showCupIntro): um modal dizendo o que vem, com auto-avanço — o
  // auto-avanço é obrigatório aqui, porque este caminho roda com o cronômetro da sala correndo e
  // uma tela que espera clique pra sempre seguraria a rodada dos outros.
  // ÚLTIMA PORTA ANTES DA LIGA. Chegar aqui com o servidor dizendo que o dia ainda é de copa
  // significa que eu terminei a minha parte e alguém não terminou a dele. Espero na tela do
  // clube e aviso que estou pronto — o dia só vira quando o último assento ficar livre.
  // Esta guarda vem DEPOIS do fechamento do estágio de quarta de propósito: aquele bloco é o que
  // faz a semana virar, e barrá-lo antes deixaria o ponteiro preso na copa pra sempre.
  // (o carimbo do dia NÃO é dado aqui: ele é um fato do assento, carimbado pelo roomDayTick a cada
  // volta do laço da sala. Passar por esta linha não é ter cumprido nada.)
  if(dia && dia.comp!=='liga'){ return; }
  if(typeof showLeagueIntro==='function'){ showLeagueIntro(true); return; }
  CL._liveBusy=true; startLiveRound(); }

/* ESTÁGIO DA SEMANA (quarta ou sábado). Estado sem S.roundStage = save de antes desta versão:
   trata como semana de um estágio só, exatamente o comportamento antigo. */
/* Teto da quarta-feira: acima disso a semana degrada pra um estágio só. ERA 75s — e o relógio
   começa no PRIMEIRO cliente que cumpre a copa, enquanto o fechamento precisa esperar o último
   (a rodada de copa de quem assiste leva 60-90s, mais as classificações). Com dois humanos em
   ritmos diferentes o estágio degradava quase sempre ("estágio de quarta não fechou em 75s" no
   log da noite de 06/08), a liga rodava na MESMA fase e o loop da rodada nascia aí — reproduzido
   no harness na primeira rodada de Libertadores. 240s dá folga real; o escape continua existindo. */
const CUP_STAGE_MAX_MS=240000;
function roundStage(){ return (S && S.roundStage) || null; }
function isCupStage(){ return roundStage()==='cup'; }
/* quem, entre os HUMANOS da sala, ainda deve a partida de copa desta semana. "Deve" = o clube dele
   tem confronto numa competição que bate nesta semana E o assento dele ainda não publicou o
   resultado de copa da rodada (game_seats.last_cup_round). Quem não tem jogo de copa nesta semana
   simplesmente não aparece — não há o que esperar dele. */
function onlineCupDayPending(){
  if(!CL.online || !S || typeof clubOwesCupThisWeek!=='function') return [];
  const claimed=(typeof NET!=='undefined' && NET._claimed)||{};
  const out=[];
  Object.keys(claimed).forEach(uid=>{
    const c=claimed[uid]; if(!c || !c.clubId) return;
    if(String(c.clubId)===String(CL.clubId)) return;      // eu já cumpri a minha (cheguei até aqui)
    const devendo = (typeof cupsOwedThisWeek==='function') ? cupsOwedThisWeek(c.clubId) : [];
    if(!devendo.length) return;                           // não deve NADA de copa nesta jornada
    // JÁ CUMPRIU TODAS AS QUE DEVIA? A lista `done` (publicada pelo próprio assento) diz QUAIS
    // competições ele fechou nesta jornada. Terminar a Libertadores não paga mais a Copa do Brasil.
    // O ATALHO DO last_cup_round SAIU — ele mentia quando a jornada tem MAIS DE UMA competição.
    // Essa coluna é UMA por rodada: ela guarda "publiquei um resultado de copa na jornada N", sem
    // dizer QUAL competição. Com o calendário oficial, a jornada 3 tem Libertadores (01/04),
    // Sul-Americana (02/04) E Copa do Brasil (04/04) — as três. Então bastava o jogador terminar a
    // PRIMEIRA delas pra coluna marcar a jornada inteira como paga: os outros clientes liam "ele
    // já publicou", soltavam a barreira e seguiam para a rodada de liga enquanto ele ainda estava
    // na Copa do Brasil. Foi o travamento da 3ª rodada — um humano preso, o outro avançando.
    // Quem sabe se ainda falta alguma é o MUNDO (clubOwesCupThisWeek olha confronto por confronto,
    // competição por competição), e é só nele que a barreira se apoia agora. O teto de 90s
    // (cupDayWaitExpired) segue como escape pra quem sumiu.
    const done=(c.last_cup_round===S.round && c.last_cup_result && Array.isArray(c.last_cup_result.done)) ? c.last_cup_result.done : [];
    if(devendo.every(k=>done.indexOf(k)>=0)) return;      // todas cumpridas
    out.push(c.clubId);
  });
  return out;
}
/* A espera do dia de copa acabou? Solta quando o cronômetro da sala zera (quando existe um armado)
   ou quando o teto próprio estoura. O teto precisa existir: durante a fase 'running' NÃO há
   contagem armada — o cronômetro governa a largada da rodada, não o meio dela —, então sem ele a
   barreira ou nunca seguraria (se eu lesse "sem deadline = pode ir") ou seguraria pra sempre (se
   eu lesse o contrário). 90s cobre com folga uma partida de copa inteira, inclusive prorrogação e
   pênaltis, que foi o caso que travou a sala no playtest. */
const CUP_DAY_MAX_WAIT_MS=90000;
/* A RODADA JÁ COMEÇOU? É o portão de largada da sala: o servidor vira a fase pra 'running' quando
   todos estão prontos (ou o cronômetro zera) e carimba no MESMO update o snapshot de escalações
   (start_running/kickoff_lineups). Enquanto a fase for 'ready', ninguém entra em campo — é isso
   que faz a rodada começar no mesmo instante pra todo mundo. */
function onlinePhaseRunning(){ return !!(typeof NET!=='undefined' && NET.room && NET.room.phase==='running'); }
function cupDayWaitExpired(){
  const room=(typeof NET!=='undefined')?NET.room:null;
  const dl=(room && room.deadline)||0;
  if(dl>0 && Date.now()>=dl) return true;
  if(!CL._cupDaySince || CL._cupDayRound!==S.round){ CL._cupDayRound=S.round; CL._cupDaySince=Date.now(); return false; }
  return Date.now()-CL._cupDaySince > CUP_DAY_MAX_WAIT_MS;
}
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

/* ---- OBRIGAÇÃO DE COPA DA SEMANA ----
   Verdadeiro enquanto EU ainda devo uma partida de copa nesta leva. Entra na barreira de
   sincronização (ver onlineTimerLoop) pra que o cronômetro da rodada de LIGA nem arme antes de
   todo mundo ter zerado a copa — é a regra pedida: quem não joga a copa espera quem joga.

   Só conta partida que EU tenho pra JOGAR (pendingUserCupMatches). A mensagem de "hoje é dia de
   copa e você não participa" NÃO entra: ela é informativa e é justamente o caso de quem está
   esperando — se ela segurasse a barreira, todos ficariam esperando todos.

   TETO DE SEGURANÇA: se por qualquer motivo a obrigação não se resolver (confronto humano×humano
   fechado pelo servidor sem o meu `tie.winner` local, cliente que travou numa tela), solto a
   barreira depois de CUP_HOLD_MAX_MS. Sem esse teto, um cliente nesse estado prenderia a sala
   inteira pra sempre — o busy_until nunca expiraria porque eu continuaria carimbando. */
/* ---- TELAS DE FECHAMENTO DE RODADA ----
   Sequência que o jogador NÃO escolhe e não pode pular: partida ao vivo -> classificação ->
   sorteio da copa -> tela do time. Enquanto está em qualquer uma delas, ele ainda não voltou pro
   clube e o cronômetro da próxima rodada não pode nem armar.

   Telas VOLUNTÁRIAS (tela do time, elenco, mercado, chat do lobby) ficam de fora de propósito:
   se contassem como ocupado, quem parasse pra ler o elenco ou conversar prenderia a sala inteira. */
/* ---- FECHAMENTO ÓRFÃO: qualquer cliente resolve a rodada se o anfitrião não resolver ----
   O caminho normal é o anfitrião (onlineHostCloseRound -> resolve-round). Mas se a aba dele fechou,
   caiu ou a sessão dele morreu no meio, esse caminho simplesmente não existe mais — e TODOS os
   outros ficavam presos na pausa técnica, sem erro (visto em produção 31/jul: salas com todos
   prontos, resultados publicados, busy zerado, e nenhuma chamada a resolve-round por horas).
   O servidor não precisa do anfitrião: resolve-round aceita qualquer MEMBRO da sala, é idempotente
   (state_version + expectedRound) e simula ausentes com os resultados publicados. Este check roda
   em todo cliente; a carência de 20s dá folga pro caminho normal do anfitrião agir primeiro, então
   com anfitrião saudável isto nunca dispara. */
let ORPHAN_ROUND=null, ORPHAN_SINCE=0, ORPHAN_LAST_TRY=0, ORPHAN_INFLIGHT=false;
/* CÃO DE GUARDA DO FECHAMENTO — a versão definitiva.
   Histórico: a rodada travou 5 vezes seguidas, sempre pelo mesmo motivo estrutural — alguma
   condição LOCAL do cliente (tela de sorteio, fila adotada do shared_state, obrigação de copa,
   espelho de "ocupado" congelado) dizia "ainda não" e ninguém chamava resolve-round. A cada
   variação corrigida aparecia a seguinte.
   A lição: um cão de guarda NÃO pode consultar estado local frágil, e seu relógio NÃO pode ser
   reiniciado por condição que pisca — era o defeito da versão anterior (qualquer guard que
   oscilasse zerava o contador e ele nunca chegava aos 20s).
   Agora o relógio é ancorado na RODADA: começa quando vejo a sala em 'running' nesta rodada e só
   zera quando a rodada de fato muda. As únicas condições são as confiáveis: a fase, a rodada e se
   EU estou jogando. resolve-round aceita qualquer membro e é idempotente, então concorrência entre
   os clientes é inofensiva (o 2º recebe already:true). */
function onlineOrphanCloseCheck(){
  if(!CL.online || typeof NET==='undefined' || !NET.gameId || !NET.room || typeof S==='undefined' || !S){ ORPHAN_ROUND=null; return; }
  if(NET.room.phase!=='running'){ ORPHAN_ROUND=null; return; }
  if((NET.room.round||0)!==(S.round||0)){ ORPHAN_ROUND=null; return; }  // servidor já avançou: o reconcile me puxa
  if(CL.screen==='live' || CL.live){ ORPHAN_ROUND=null; return; }        // estou jogando: ninguém fecha por cima de mim
  const now=Date.now();
  // âncora na rodada — nenhuma condição intermediária reinicia esta contagem
  if(ORPHAN_ROUND!==S.round){ ORPHAN_ROUND=S.round; ORPHAN_SINCE=now; return; }
  // "ocupado" lido FRESCO dos assentos (o espelho room.participants congela o busy no instante do
  // último merge e pode nunca mais ser recalculado se um evento do realtime se perder)
  let anyBusy=false; const cl=NET._claimed||{};
  for(const uid in cl){ const c=cl[uid];
    if(c && c.busy_until && new Date(c.busy_until).getTime()>now){ anyBusy=true; break; } }
  const allIn = (typeof NET.allHumanResultsIn==='function') ? NET.allHumanResultsIn(S.round) : true;
  // alguém em partida: 120s (o busy_until do servidor expira em 90s, então isto nunca atropela
  // quem está jogando de verdade). Todos com resultado: 25s. Faltando alguém: 90s — quem caiu
  // antes de publicar é simulado pelo servidor, como sempre foi.
  // Sem ninguém em partida, a rodada devia ter fechado no ato: 6s é só a folga pro caminho normal
  // do anfitrião (que leva ~2-4s, incluindo a ida ao servidor) agir antes. resolve-round é
  // idempotente, então se os dois caminhos correrem juntos o segundo recebe already:true — o custo
  // de disparar cedo é uma chamada a mais; o de disparar tarde é o jogo parado.
  // Com alguém DE FATO em partida, 100s (o busy do servidor expira em 90s) — aí a espera é real.
  const espera = anyBusy ? 100000 : 6000;
  if(now-ORPHAN_SINCE < espera) return;
  if(ORPHAN_INFLIGHT || now-ORPHAN_LAST_TRY<6000) return;
  ORPHAN_LAST_TRY=now; ORPHAN_INFLIGHT=true;
  const round=S.round;
  console.warn('cão de guarda: rodada '+round+' aberta há '+Math.round((now-ORPHAN_SINCE)/1000)+'s sem fechar — resolvendo pelo servidor');
  (async ()=>{
    try{
      const res=await NET.resolveRound(round);
      if(res && res.ok && NET.reopenReady) await NET.reopenReady();
      else if(res && res.error) console.warn('cão de guarda: resolve-round recusou —', res.error);
    }catch(e){ console.warn('cão de guarda:', e&&e.message); }
    finally{ ORPHAN_INFLIGHT=false; }
  })();
}
/* Telas em que o jogador conta como OCUPADO pro servidor: com alguém nelas, o cronômetro da
   'ready' não arma e a fase não avança. 'boasvindas' entra porque é a porta das cerimônias de
   abertura (sorteio da Resenha -> boas-vindas -> sorteios de copa): sem ela na lista, o timer
   armava e estourava POR BAIXO das cerimônias e a rodada 0 começava sem ninguém ver. */
const CLOSING_SCREENS=['live','cupdraw','classif','seatclassif','cupclassif','sorteio','loading','boasvindas'];
let DRAW_HOLD_SINCE=0;
/* MODAL DE DECISÃO VENCIDO NÃO SEGURA A SALA. Expulsão, lesão, pênalti e disputa de pênaltis
   pausam a partida e se auto-resolvem por um setInterval de 200ms próprio. Esse intervalo é a
   ÚNICA coisa que faz o prazo valer — e o navegador estrangula timers de aba em segundo plano
   (medido no harness: prazo de 12s vencido há 12s com o modal ainda aberto e o intervalo parado).
   Quem troca de aba no meio da partida cai exatamente nisso, e tela de partida conta como ocupado:
   o jogador congela e a sala congela atrás dele. Aqui o laço da sala confere os prazos e resolve
   pelo PADRÃO — o mesmo que o prazo escolheria — com 2s de folga pro timer legítimo agir primeiro.
   A decisão nunca é pulada: ela é tomada, só que pelo relógio da sala em vez do da aba. */
function onlineForceExpiredDecision(){
  const RL=CL.live; if(!RL || !RL.paused) return;
  const venceu=(t)=>t && Date.now()-t>2000;
  try{
    if(RL.redEvent && venceu(CL.redDeadline) && typeof resolveRedSkip==='function') resolveRedSkip();
    else if(RL.injEvent && venceu(CL.injDeadline) && typeof resolveInjuryNoSub==='function') resolveInjuryNoSub();
    else if(RL.penEvent && venceu(CL.penDeadline) && typeof resolvePenalty==='function') resolvePenalty(CL.penSel);
    else if(RL.pensPicking && venceu(CL.penDeadline) && typeof resolveShootoutKick==='function') resolveShootoutKick(CL.penSel);
  }catch(e){ console.warn('decisão vencida:', e && e.message); }
}
/* SORTEIO NA FILA SE ABRE — NÃO VIRA "OCUPADO" ETERNO.
   A fila de cerimônias (S._pendingDrawShows) mora no mundo compartilhado, mas quem a consome é o
   fluxo PÓS-rodada de cada cliente (checkPendingCupDraws). Parado na tela do clube ninguém a
   consome — e a barreira lia "tem sorteio pra abrir" e declarava o jogador ocupado. Medido no
   cenário 3: os DOIS humanos na tela do clube, prontos, com ocupado='sorteio-na-fila', o anfitrião
   sem liberar porque havia alguém "ocupado", e a sala parada na jornada 1 sem nada acontecendo.
   É a quinta repetição do mesmo padrão — pendência que só se resolve depois do avanço marcando o
   jogador como ocupado antes do avanço. A saída não é soltar a barreira (aí a cerimônia some pra
   quem tinha direito a vê-la): é RESOLVER a pendência onde ela está. Aqui a fila é aberta na
   própria tela do clube — quem já viu aquele sorteio (marcador local) só drena a entrada velha,
   quem não viu assiste de verdade, e a barreira volta a significar o que promete. */
function onlineOpenQueuedDraw(){
  if(!CL.online || typeof S==='undefined' || !S) return;
  if(!S._pendingDrawShows || !S._pendingDrawShows.length) return;
  if(CL.screen!=='main' || CL.live || CL._liveBusy || CL._drawOpening) return;
  if(typeof checkPendingCupDraws!=='function') return;
  CL._drawOpening=true;
  try{ checkPendingCupDraws(()=>{ CL._drawOpening=false; }); }
  catch(e){ CL._drawOpening=false; console.warn('abrir sorteio da fila:', e && e.message); }
}
/* POR QUE eu me declaro ocupado — em uma palavra, ou null pra "não estou".
   O booleano sozinho já custou duas sessões de caça: a sala parava com todos os assentos ocupados
   e não havia como saber, de fora, QUAL das quatro condições estava acesa em cada cliente. Agora a
   razão é o valor e o booleano é derivado dela; o harness grava a razão a cada 150ms, então uma
   travada passa a vir com a causa escrita ao lado. */
function onlineBusyReason(){
  if(CL.screen==='waitround'){ DRAW_HOLD_SINCE=0; return null; }
  if(CLOSING_SCREENS.indexOf(CL.screen)>=0){ DRAW_HOLD_SINCE=0; return 'tela:'+CL.screen; }
  if(typeof S!=='undefined' && S && S._pendingDrawShows && S._pendingDrawShows.length){
    if(!DRAW_HOLD_SINCE) DRAW_HOLD_SINCE=Date.now();
    if(DRAW_HOLD_SINCE>0 && Date.now()-DRAW_HOLD_SINCE<20000) return 'sorteio-na-fila';
    if(DRAW_HOLD_SINCE!==-1){ DRAW_HOLD_SINCE=-1; console.warn('fila de sorteio parada há 20s sem abrir — barreira solta pra rodada não travar'); }
  } else DRAW_HOLD_SINCE=0;
  return onlineCupObligationPending() ? 'copa-devendo' : null;
}
/* As quatro condições, na ordem em que valem (o histórico de cada uma está nos comentários que
   sobreviveram dentro do onlineBusyReason e do onlineCupObligationPending):
     · pausa técnica NUNCA é ocupado — ali eu já fiz a minha parte e estou esperando;
     · tela de fechamento (partida, sorteio, classificação, cerimônia) é ocupado de verdade;
     · sorteio enfileirado e ainda não aberto vale por 20s — fila parada além disso é fila velha;
     · dívida de copa só conta na fase 'running' (ver onlineCupObligationPending). */
function onlineClosingRound(){ return !!onlineBusyReason(); }
// 60s: teto de SEGURANÇA, não de espera normal. Eram 240s — e como a barreira ficou presa na
// pausa, esses 4 minutos viraram o tempo real que a sala passava travada antes de destravar
// sozinha. Quem está de fato jogando a copa é coberto pelo busy_until (90s, renovado a cada 15s),
// não por este teto.
const CUP_HOLD_MAX_MS=60000;
function onlineCupObligationPending(){
  if(!CL.online || !S || typeof pendingUserCupMatches!=='function') return false;
  if(CL.unemployed) return false;
  // FASE 'ready' = ESTOU NO PORTÃO, E PORTÃO NÃO É OCUPADO.
  // Esta barreira nasceu pra segurar o cronômetro da 'ready' — "ninguém arma a liga devendo copa"
  // —, e isso valia enquanto a copa era jogada ANTES de marcar pronto. Desde que ela passou a
  // entrar em campo pelo mesmo portão da liga (onlineJogarGate), a partida de copa que eu devo só
  // acontece DEPOIS que a fase virar 'running'. Contar a obrigação como ocupado aqui trava o
  // próprio portão: o servidor não arma nem avança a fase com alguém ocupado, e eu só deixo de
  // dever a copa quando a fase avança — a pendência passou a bloquear a única coisa capaz de
  // resolvê-la. Foi o travamento do "dia de copa: esperando 1 treinador(es) terminarem a copa"
  // com a rodada aberta sem fechar. Quarta variação do mesmo padrão: uma pendência que só se
  // resolve DEPOIS do avanço marcando o jogador como ocupado justamente antes do avanço.
  // Na 'running' a barreira segue valendo: é ela que segura o FECHAMENTO da rodada até eu ter
  // cumprido a minha partida de copa.
  if(typeof NET!=='undefined' && NET.room && NET.room.phase==='ready') return false;
  // RODADA AINDA FECHANDO (já joguei a liga, esperando o fechamento na pausa técnica): idem —
  // pendingUserCupMatches já enxerga a copa da rodada seguinte, que só é jogável depois do
  // fechamento desta.
  if(typeof NET!=='undefined' && NET.room && NET.room.phase==='running' && CL._playedRound===S.round) return false;
  let pend=false;
  try{ pend = pendingUserCupMatches().filter(c=>typeof cupWasSeen!=='function' || !cupWasSeen(c.key)).length>0; }catch(e){ return false; }
  const key=(S.season||1)+'-'+(S.round||0);
  if(!pend){ CL._cupHoldKey=null; CL._cupHoldSince=0; return false; }
  if(CL._cupHoldKey!==key){ CL._cupHoldKey=key; CL._cupHoldSince=Date.now(); }
  if(Date.now()-(CL._cupHoldSince||0) > CUP_HOLD_MAX_MS){
    if(!CL._cupHoldWarned){ CL._cupHoldWarned=key;
      console.warn('barreira de copa solta pelo teto de '+(CUP_HOLD_MAX_MS/1000)+'s — a rodada segue sem esperar mais'); }
    return false;
  }
  return true;
}

/* quando o usuário clica Jogar no modo online, marca "pronto" em vez de rodar sozinho */
/* etapa da semana que eu estou prestes a jogar: (jornada, quarta ou sábado). A quarta e o sábado
   têm a MESMA jornada, então a jornada sozinha não distingue "já pedi pra começar" entre as duas. */
function onlineStageKey(){ return (typeof S!=='undefined'&&S?((S.season||1)+':'+(S.round||0)):'0')+':'+(roundStage()||'league'); }
/* ---- ETAPA CUMPRIDA: O ANTI-REPETIÇÃO DEFINITIVO ----
   Uma etapa (temporada, jornada, quarta|sábado) que este cliente JÁ cumpriu nunca é reentrada,
   não importa por qual caminho a fase volte a 'running' — fechamento idempotente do cão de
   guarda, adoção repetida, reconcile atrasado. O CL._playedRound (um inteiro só) não dava conta:
   a quarta e o sábado compartilham a jornada, e qualquer caminho que o zerasse reabria a rodada
   inteira ("repetiu o mesmo jogo da primeira rodada várias vezes"). O mapa é só-cresce e local:
   etapa cumprida é fato MEU, não do mundo. */
/* PERSISTE: o "Sincronizar a Resenha" recarrega a página de propósito, e um mapa só em memória
   voltava vazio — a etapa recém-jogada reabria DEPOIS da sincronia, que era justamente o socorro
   do jogador travado ("forcei a sincronia e o loop continuou"). Usa o mesmo balde por sala do
   drawSeenKey (ui/main). */
function onlineMarkStageDone(){ const k=onlineStageKey();
  CL._stageDone=CL._stageDone||{}; CL._stageDone[k]=true;
  if(typeof rememberDrawSeen==='function') rememberDrawSeen('stage:'+k);
}
function onlineStageDone(){ const k=onlineStageKey();
  if(CL._stageDone && CL._stageDone[k]) return true;
  return (typeof drawAlreadySeen==='function') && drawAlreadySeen('stage:'+k);
}
/* QUITA A MINHA DÍVIDA DE COPA ASSIM QUE ELA DEIXA DE EXISTIR — seja qual for o motivo: joguei a
   partida, não tinha jogo nesta jornada, ou o confronto já foi resolvido por outro caminho (o
   servidor me simulou por ausência, ou o cliente de outro humano fechou o resto da rodada).
   Quem sabe se eu ainda devo é o MEU cliente, que é quem roda pendingUserCupMatches — então é ele
   que carimba. Antes a dívida só era quitada por "joguei ao vivo até o fim", e o resto dos
   caminhos ficava esperando o teto de 90s da barreira. Uma vez por etapa da semana; o
   markCupDone sai cedo se eu já tiver publicado um resultado nesta jornada. */
function onlineSettleCupDebt(){
  if(!CL.online || typeof S==='undefined' || !S) return;
  if(typeof NET==='undefined' || !NET.markCupDone) return;
  if(typeof pendingUserCupMatches!=='function') return;
  const etapa=onlineStageKey();
  if(CL._cupDebtSettled===etapa) return;
  let pend=true;
  try{ pend = pendingUserCupMatches().length>0; }catch(e){ return; }
  if(pend) return;
  CL._cupDebtSettled=etapa;
  NET.markCupDone(S.round);
}
/* ===================== MESA DO ANFITRIÃO — o motor da largada =====================
   PASSO 1 do modelo novo: o dia tem UM DONO. O convidado marca pronto e espera; quem libera é o
   anfitrião, sempre por aqui. Antes existiam quatro motores concorrentes (advance_phase_if_expired
   chamado por qualquer cliente, arm_ready_timer idem, o toRunning de emergência e os cães de
   guarda) — e cada um era uma porta pra um cliente entrar num dia diferente dos outros.
   O botão "Liberar" e o "pular ausente" da mesa (passo 2) penduram exatamente aqui: hoje a
   liberação é automática (todos prontos, ou prazo vencido com CL.autoRelease ligado), amanhã é
   uma decisão explícita — sem tocar em mais nada. */
function onlineHostSeats(){
  const cl=(typeof NET!=='undefined' && NET._claimed)||{}; const agora=Date.now();
  return Object.keys(cl).map(uid=>{ const c=cl[uid]||{};
    const bu=c.busy_until; const busyMs = bu ? (typeof bu==='number'?bu:new Date(bu).getTime()) : 0;
    return { uid, clubId:c.clubId, name:c.name, ready:!!c.ready, busy: busyMs>agora };
  }).filter(s=>s.clubId);
}
function onlineHostTick(room, armed){
  if(typeof NET==='undefined' || !NET.isHost || !room || room.phase!=='ready') return;
  if(Date.now()-ONLINE_ADV_T<400) return;
  const seats=onlineHostSeats();
  const alguemOcupado = ONLINE_BUSY_ACTIVE || seats.some(s=>s.busy);
  const todosProntos = seats.length>0 && seats.every(s=>s.ready);
  // TODOS PRONTOS E NINGUÉM EM TELA DE PASSAGEM -> começa agora, sem esperar cronômetro nenhum
  if(todosProntos && !alguemOcupado){ ONLINE_ADV_T=Date.now(); onlineHostRelease('todos prontos'); return; }
  // cronômetro é só o teto pra quem sumiu; só arma quando ninguém está ocupado (senão conta por
  // cima de quem ainda está numa cerimônia)
  if(!armed){ if(!alguemOcupado && NET.armReadyTimer){ ONLINE_ADV_T=Date.now(); NET.armReadyTimer(); } return; }
  if((room.deadline||0)>0 && Date.now()>=room.deadline && !alguemOcupado && CL.autoRelease!==false){
    ONLINE_ADV_T=Date.now(); onlineHostRelease('prazo vencido');
  }
}
/* ponto ÚNICO de largada da sala. start_running é RPC exclusiva do anfitrião e carimba o snapshot
   de escalações no mesmo update — é o que garante que todo mundo simula os mesmos jogos. */
function onlineHostRelease(motivo){
  if(typeof NET==='undefined' || !NET.isHost || !NET.room || NET.room.phase!=='ready') return;
  const seats=onlineHostSeats();
  console.log('[mesa] liberando '+onlineStageKey()+' ('+motivo+') — '+seats.filter(s=>s.ready).length+'/'+seats.length+' prontos');
  if(NET.toRunning) NET.toRunning();
}
function onlineMarkReady(){ CL._readyForStage=onlineStageKey();
  NET.setReady(true, CL.clubId); toastC('Pronto! À espera dos outros treinadores.'); cdraw();
  // publica minha escalação/tática atual pros outros clientes — se eu ficar ausente, meu clube é
  // simulado com ELA (não com autoXI). availableXI/tacticForClub leem via S.clubXI (ver a ponte).
  if(typeof NET!=='undefined' && NET.publishLineup && typeof S!=='undefined' && S){ if(!CL.humans||CL.humans[CL.clubId]) NET.publishLineup((S.xi||[]).slice(), S.tactic||'equilibrado'); }
  onlineRecoverRunRound(); // a fase já virou 'running' (cronômetro expirou enquanto eu jogava a copa)? destrava a rodada de liga
}

