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
function clChatToggle(){ CL.chatOpen=!CL.chatOpen; cdraw(); }
function chatDockHTML(){ if(!CL.online) return '';
  return `<div class="cl-chatdock ${CL.chatOpen?'open':''}">
    <div class="cl-chatdock-bar" onclick="clChatToggle()">💬 Chat da Liga ${CL.chatOpen?'▾':'▴'}</div>
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
    onlineReconcileIfBehind(room); // itens 1 e 3: mantém todos na MESMA rodada (recarrega se ficou pra trás)
    if(CL.screen==='online'){ renderOnlineInto(); } else { renderChatBoxes(); const rb=document.querySelector('.cl-readybar'); if(rb && room) rb.outerHTML=onlineReadyBar(); }
    if(CL.online && room && room.phase==='running' && CL.screen!=='live'){ onlineRunRound(); } };
  NET.onChat=()=>{ if(CL.screen==='online') renderOnlineInto(); else renderChatBoxes(); }; }
/* SINCRONIZAÇÃO (itens 1 e 3): se este cliente (não-anfitrião) ficou PRA TRÁS da rodada
   autoritativa da sala (ex.: perdeu uma rodada por desconexão), recarrega o estado da sala pra
   voltar pra mesma rodada de todos — em TODAS as competições (liga + copas avançam por S.round).
   Só reconcilia em tela segura (nunca no meio de uma partida/sorteio) e só quando ATRÁS, então
   clientes em dia (e o anfitrião) nunca são afetados, e ninguém perde uma partida em andamento. */
let ONLINE_RECONCILE_BUSY=false;
function onlineReconcileIfBehind(room){
  if(!CL.online || (typeof NET!=='undefined' && NET.isHost) || !room || !S) return;
  if(CL.screen==='live' || CL.live || CL._liveBusy || CL._hotseat || CL.screen==='cupdraw' || CL.screen==='classif' || CL.screen==='seatclassif') return;
  const authRound = room.round||0;
  if(authRound <= (S.round||0)) return;            // já em dia (ou à frente) — nada a fazer
  if(ONLINE_RECONCILE_BUSY || typeof NET==='undefined' || !NET.loadGame) return;
  ONLINE_RECONCILE_BUSY=true;
  (async ()=>{ try{
    const saved = await NET.loadGame();
    const sState = saved && saved.S;
    if(sState && (sState.round||0) > (S.round||0)){
      Object.assign(S, sState); if(typeof syncDataClubsFromState==='function') syncDataClubsFromState();
      toastC('🔄 Sincronizado com a sala (rodada '+((S.round||0)+1)+').');
      cdraw();
    }
  }catch(e){ console.warn('reconcile:', e && e.message); } finally { ONLINE_RECONCILE_BUSY=false; } })();
}

/* cada tela do fluxo Resenha já retorna o shell completo (wizShell) — sem deskWrap/titleBar */
function renderOnline(){ const n=CL.net||{};
  if(n.step==='escolha') return scResenhaChoice();
  if(n.step==='joincode') return scJoinCode();
  if(n.step==='conta')  return scConta();
  if(n.step==='minhassalas') return scMinhasSalas();
  if(n.step==='sala')   return scSalaHost();
  if(n.step==='midjoin') return scMidJoin();
  if(n.step==='lobby')  return scLobby();
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
function clJoinCodeGo(){ const n=CL.net; const st=(NET.authStatus?NET.authStatus():{}); if(!(n.code&&n.code.length>=4)) return;
  toastC('Entrando na Resenha...');
  (async ()=>{ try {
    CL.mgr = CL.mgr || n.name;
    await NET.joinRoom(n.code, { name: CL.mgr||n.name, email: st.email });
    routeAfterJoin();
  } catch(e){ toastC('⚠ '+(e.message||'Não foi possível entrar. Confira o código.')); } })();
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
  toastC('Entrando na sala...');
  (async ()=>{ try {
    CL.mgr = CL.net.name;
    await NET.joinRoom(CL.net.code, { name: CL.net.name, email: st.email });
    routeAfterJoin();
  } catch(e) { toastC('⚠ '+e.message); } })();
}
/* decide pra onde ir depois de entrar numa sala: lobby (pré-temporada),
   direto pro jogo (já tem clube) ou escolher um clube livre (temporada já rolando) */
function routeAfterJoin(){
  const room=NET.room; if(!room){ cdraw(); return; }
  const me=room.participants.find(p=>p.id===NET.self.id);
  if(room.phase==='lobby'){ CL.net.step='lobby'; cdraw(); return; }
  if(me && me.clubId){ onlineBeginSeason(); return; }
  CL.net.step='midjoin'; cdraw();
}

/* ---- escolher o próprio clube: aceitar convite (pré-temporada) ou entrar
   com a liga já rolando — sempre um clube livre, CPU até então ---- */
function scMidJoin(){
  const room=NET.room; if(!room) return wizShell({ title:'Sala', back:'clLobbyExit()', backLabel:'Sair', contentCls:'cl-wiz-center', body:`<div class="cl-wiz-sub">A ligar à sala…</div>` });
  const midSeason=room.phase!=='lobby';
  const rows=freeClubIds().map(c=>`<div class="cl-midjoin-club" onclick="clPickMidJoinClub('${c.id}')" style="${clubEdge(c)}">
      <span class="cl-midjoin-name">${escC(c.short)}</span>
      <span class="cl-midjoin-ov">força ${c.overall}</span>
      <span class="cl-midjoin-cpu">🤖 CPU</span>
    </div>`).join('') || '<div class="cl-midjoin-empty">Não há mais clubes livres nesta sala no momento.</div>';
  const msg=midSeason
    ? `🏁 A Resenha <b>${escC(room.name)}</b> já começou (${room.round||1}ª rodada).<br>Escolha um clube disponível — hoje controlado pela CPU — pra assumir o comando:`
    : `👋 Você foi convidado pra Resenha <b>${escC(room.name)}</b>!<br>Escolha o clube que você quer assumir:`;
  const body=`<div class="cl-wiz-authcard" style="max-width:600px">
      <div class="cl-midjoin-msg">${msg}</div>
      <div class="cl-midjoin-list">${rows}</div>
    </div>`;
  return wizShell({ title:'Sala · '+escC(room.name||''), back:'clLobbyExit()', backLabel:'Sair', contentCls:'cl-wiz-top', body });
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
function clJoinMyRoom(code, pending){
  toastC('Entrando na sala...');
  (async ()=>{ try {
    await NET.joinRoom(code, { name: CL.net.name, email: NET.authStatus().email });
    if(pending){ CL.net.step='midjoin'; cdraw(); } else { routeAfterJoin(); }
  } catch(e) { toastC('⚠ '+e.message); } })();
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
    CL.net.step='lobby'; wireNet(); cdraw();
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
  const confirmedN=room.participants.filter(p=>p.confirmed).length;
  const parts=room.participants.map(p=>{ const c=p.clubId?clubOf(p.clubId):null;
    const isSelf=p.id===NET.self.id;
    return `<div class="cl-part">
      <span class="cl-part-dot ${p.confirmed?'ok':''}"></span>
      <span class="cl-part-n">${escC(p.name||'—')}${p.host?' <i>(anfitrião)</i>':''}</span>
      <span class="cl-part-st">${p.confirmed?'Confirmado':'Não confirmado'}</span>
      <span class="cl-part-team" style="${c?clubStripe(c):''}">${c?escC(c.short):'🎲 sorteado no início'}</span>
      ${host && !isSelf ? `<button class="cl-part-kick" title="Remover da sala" onclick="clKick('${p.id}','${p.clubId||''}')">✖</button>` : ''}
    </div>`; }).join('');
  const canStart=host && room.participants.length>=2;

  // ---- coluna esquerda: convites + participantes ----
  const invitePanel = host ? `<div class="cl-wiz-panel">
      <div class="cl-wiz-secttitle">Convidar treinadores</div>
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
      <div class="cl-wiz-invhint">Link da sala: <a class="cl-wiz-invlink" href="${escC(NET.inviteLink())}" target="_blank">${escC(NET.inviteLink())}</a></div>
    </div>
    <div class="cl-wiz-panel">
      <div class="cl-wiz-secttitle">🔍 Convidar quem já tem conta</div>
      <input id="cl-usersearch-input" class="cl-wiz-searchin" placeholder="Buscar por nome ou e-mail (mín. 3 letras)" oninput="clUserSearch(this.value)">
      <div id="cl-usersearch-results" class="cl-usersearch-results"></div>
    </div>` : '';
  const leftCol=`<div class="cl-wiz-lobbyL">
      ${invitePanel}
      <div>
        <div class="cl-wiz-secttitle">Participantes (${confirmedN})</div>
        <div class="cl-parts">${parts}</div>
      </div>
    </div>`;

  // ---- coluna direita: partida (sortear) + chat ----
  const partidaPanel = (host && room.phase==='lobby') ? `<div class="cl-wiz-panel">
      <div class="cl-wiz-secttitle">Partida</div>
      <button class="cl-btn cl-wiz-drawbtn" onclick="clLobbyDraw()">🎲 Sortear times</button>
    </div>` : '';
  const chatPanel=`<div class="cl-wiz-panel cl-wiz-chatpanel">
      <div class="cl-wiz-secttitle">💬 Chat da sala</div>
      <div class="cl-chat-msgs cl-wiz-chatmsgs" id="cl-chat-msgs-lobby">${chatMsgsHTML()||'<div class="cl-wiz-chatempty">Nenhuma mensagem ainda. Diga oi! 👋</div>'}</div>
      <div class="cl-wiz-invrow"><input id="cl-chat-input-lobby" class="cl-chat-input" placeholder="Escreva uma mensagem…" onkeydown="clChatKey(event,'cl-chat-input-lobby')">${btn('Enviar',"clChatSend('cl-chat-input-lobby')",{cls:'cl-btn-sm'})}</div>
    </div>`;
  const rightCol=`<div class="cl-wiz-lobbyR">${partidaPanel}${chatPanel}</div>`;

  const action=`<span class="cl-wiz-hint">${host?'Mínimo de 2 treinadores pra começar.':'À espera do anfitrião…'}</span>
    <div class="cl-wiz-actbtns">
      ${btn('Sair','clLobbyExit()',{icon:'✖',cls:'cl-wiz-sairbtn'})}
      ${host?btn('Começar','clLobbyStart()',{icon:'✔',cls:'cl-wiz-cta',dis:!canStart}):''}
    </div>`;
  return wizShell({
    title:'Sala · '+escC(room.name||''), back:'clLobbyExit()', backLabel:'Sair da sala',
    pill:'Código '+escC(room.code||''),
    contentCls:'cl-wiz-lobbycontent',
    body:`<div class="cl-wiz-lobbycols">${leftCol}${rightCol}</div>`,
    action
  });
}
/* clubes ainda controlados pela CPU nesta sala — o próprio jogador escolhe entre eles
   (mesma lista que scMidJoin usa pra convite/entrada com a liga já rolando). */
function freeClubIds(){ const room=NET.room; if(!room) return [];
  const taken=new Set((room.participants||[]).map(p=>p.clubId).filter(Boolean));
  return DATA.clubs.filter(c=>!taken.has(c.id));
}
function freeClubOptions(){ const free=freeClubIds();
  return '<option value="">Escolher time...</option>'+free.map(c=>`<option value="${c.id}">${escC(c.short)} (${c.overall})</option>`).join('');
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
function clLobbyDraw(){ NET.drawClubs(DATA.clubs.map(c=>c.id)); toastC('Times sorteados!'); }
function clLobbyExit(){ CL.screen='modo'; cdraw(); }
function clLobbyStart(){ const room=NET.room;
  // preenche com sorteio quem ainda não escolheu o próprio time até aqui
  if(!room.participants.every(p=>p.clubId)) NET.drawClubs(DATA.clubs.map(c=>c.id));
  // cria o jogo compartilhado (mesma seed p/ todos) e entra no hub online
  onlineBeginSeason();
}
function onlineBeginSeason(){ const room=NET.room; const me=room.participants.find(p=>p.id===NET.self.id);
  // A Resenha é sempre Brasil Série A. Se este jogador vinha de um solo (universo intl,
  // divisão baixa, transferência ao exterior), DATA.clubs/universo ficaram alterados e
  // newGame(clubId) teria squads[clubId] === undefined -> crash "reading 'forEach'".
  // Restaura o contexto do Brasil (Série A) antes de montar o jogo online.
  if(typeof setUniverse==='function') setUniverse('brasil');
  if(DATA.clubsSerieA) DATA.clubs = DATA.clubsSerieA.slice();
  CL.intlUniverse=false; CL.bgCountries=[]; CL.playCountry='Brasil';
  CL.clubId=(me&&me.clubId)||room.participants[0].clubId; CL.mgr=me?me.name:CL.mgr;
  newGame(CL.clubId); if(!S.stadium) S.stadium={capacity:STAND_START}; S.seed=room.seed;
  CL.humans={}; room.participants.forEach(p=>{ if(p.clubId) CL.humans[p.clubId]=p.name; });
  CL.online=true; CL.formation=null; CL.tacticChosen=false; S.coachHistory=[{season:S.season, type:'contratado', text:`Contratado pelo ${clubOf(CL.clubId).short.toUpperCase()}`}];
  CL.screen='main'; CL.tab='jogo'; CL.selPlayer=squad(CL.clubId)[0]?.n||null;
  
  // carrega estado anterior do Supabase se existir
  if(typeof NET!=='undefined' && NET.loadGame){
    (async ()=>{ try {
      const savedState = await NET.loadGame();
      if(savedState && savedState.S){ Object.assign(S, savedState.S); syncDataClubsFromState(); console.log('✓ Jogo carregado (rodada', savedState.round, ')'); cdraw(); }
    } catch(e) { console.warn('Load Supabase:', e); } })();
  }
  
  if(NET.isHost) NET.start();   // abre janela de 60s
  cdraw();
  checkPendingCupDraws(()=>{}); // mostra o sorteio da Copa do Brasil (destaca os clubes humanos da sala)
}

/* ---- durante a rodada online: painel "à espera dos treinadores" + timer ---- */
function onlineReadyBar(){ const room=NET.room; if(!CL.online||!room||room.phase==='lobby') return '';
  const ready=room.participants.filter(p=>p.ready).length, total=room.participants.length;
  // cronômetro SOBERANO/IMUTÁVEL: sempre conta pelo deadline (sem pausa do anfitrião)
  const secs=Math.max(0,Math.ceil(((room.deadline||0)-Date.now())/1000));
  const list=room.participants.map(p=>{ const self=NET.self&&p.id===NET.self.id;
    const k=(NET.isHost && !self)?`<button class="cl-rb-kick" title="Remover da Resenha" onclick="clKick('${p.id}','${p.clubId||''}')">✖</button>`:'';
    return `<span class="cl-rb-p ${p.ready?'rdy':''}">${p.ready?'✓':'⏳'} ${escC((p.name||'').split(' ')[0])}${k}</span>`; }).join('');
  return `<div class="cl-readybar ${secs<=10?'urgent':''}">
    <span class="cl-rb-t">À espera dos treinadores ${ready}/${total}</span>
    <span class="cl-rb-list">${list}</span>
    <span class="cl-rb-clock">${secs+'s'}</span>
  </div>`; }
/* anfitrião remove um jogador da Resenha (lobby ou durante a partida): confirma, dispara o kick
   (broadcast + libera assento -> clube vira CPU) e re-renderiza. O expulso recebe o sinal e volta ao menu. */
function clKick(uid, clubId){
  if(!uid || typeof NET==='undefined' || !NET.isHost) return;
  const p=(NET.room && NET.room.participants || []).find(x=>x.id===uid);
  const nm=(p&&p.name)||'este jogador';
  if(!confirm('Remover '+nm+' da Resenha?\n\nO time dele passa a ser controlado pela CPU e ele volta ao menu.')) return;
  if(NET.kick) NET.kick(uid, clubId||(p&&p.clubId));
  if(typeof cdraw==='function') cdraw();
}
function clOnlinePause(){ /* pausa removida: cronômetro da Resenha é soberano e imutável */ }
function clSetSpeed(mult){ CL.speedMult=mult; if(CL.online && typeof NET!=='undefined' && NET.setSpeed) NET.setSpeed(mult).catch(()=>{}); cdraw(); }
let ONLINE_TIMER=null, ONLINE_LASTBEEP=-1, ONLINE_LASTSEC=null, ONLINE_ADV_T=0;
function onlineTimerLoop(){
  const room=(typeof NET!=='undefined')?NET.room:null;
  if(CL.online && room && room.phase==='ready'){  // sem !room.paused: cronômetro imutável
    const secs=Math.max(0,Math.ceil(((room.deadline||0)-Date.now())/1000));
    if(secs!==ONLINE_LASTSEC){ ONLINE_LASTSEC=secs;
      if(secs<=10 && secs>0){ netBeep(secs<=3?1100:820); }
      if(secs<=0){ netBeep(1400); }
      const bar=document.querySelector('.cl-rb-clock'); if(bar) bar.textContent=secs+'s';
      const wrap=document.querySelector('.cl-readybar'); if(wrap){ wrap.classList.toggle('urgent', secs<=10); }
    }
    const all=room.participants.length>0 && room.participants.every(p=>p.ready);
    if(secs<=0 || all){
      // início da rodada: QUALQUER cliente pede ao servidor pra avançar (validado pelo deadline/
      // prontidão) — não depende mais do anfitrião estar com a aba ativa. Fallback local: só o host.
      if(NET.advancePhaseExpired){ if(Date.now()-ONLINE_ADV_T>900){ ONLINE_ADV_T=Date.now(); NET.advancePhaseExpired(); } }
      else if(NET.isHost){ room.participants.forEach(p=>{ if(!p.ready) p.ready=true; }); NET.toRunning(); }
    }
  } else { ONLINE_LASTSEC=null; }
  const intv=Math.max(100, 300/(CL.speedMult||1));
  ONLINE_TIMER=setTimeout(onlineTimerLoop, intv);
}
function onlineRunRound(){ if(CL.screen==='live'||CL.live||CL._liveBusy) return; if(!CL.online || !S) return; CL._liveBusy=true; startLiveRound(); }

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
  onlineRecoverRunRound(); // a fase já virou 'running' (cronômetro expirou enquanto eu jogava a copa)? destrava a rodada de liga
}

