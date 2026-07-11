/* ================================================================
   ELIFOOT 2026 v3 — Supabase Adapter (schema ISOLADO elifoot_v3)
   Não compartilha tabelas com a v2 (schema `elifoot`). Login anônimo.
   games.id É o código curto da sala (ex: YQHML) — chave primária direta.
   Save/load via games.shared_state + state_version (concorrência otimista).
   Presence (Realtime) cobre "quem está na sala antes de escolher clube".
   ================================================================ */

const SB_URL = 'https://alxwgqvjmetjbbqtjkhx.supabase.co';
const SB_KEY = 'sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';
const SB_SCHEMA = 'elifoot_v3';
let sb = null, SB_AUTH_USER = null, SB_CH = null, SB_ONLINE = {};

/* ---- INIT: só cria o client e recupera sessão existente — NUNCA cria usuário anônimo ---- */
/* o SDK do Supabase carrega via <script async>, então pode não estar pronto quando
   o usuário entra no modo Resenha. Espera ele aparecer (com timeout) antes de falhar. */
function waitForSupabaseSDK(timeoutMs){
  return new Promise(resolve=>{
    if(window.supabase) return resolve(true);
    const t0=Date.now();
    const iv=setInterval(()=>{
      if(window.supabase){ clearInterval(iv); resolve(true); }
      else if(Date.now()-t0>timeoutMs){ clearInterval(iv); resolve(false); }
    },100);
  });
}
async function netInitSupabase(){
  if(sb) return true;
  try {
    if(!window.supabase) await waitForSupabaseSDK(6000);
    if(!window.supabase) throw new Error('SDK Supabase não carregou (verifique a conexão)');
    sb = window.supabase.createClient(SB_URL, SB_KEY, {
      db:{ schema:SB_SCHEMA }, auth:{ persistSession:true, autoRefreshToken:true }, realtime:{ params:{ eventsPerSecond:5 } }
    });
    // link de "esqueci minha senha": o e-mail traz o usuário de volta pra cá com um hash
    // de recuperação; o supabase-js já detecta isso na criação do client (acima) e dispara
    // esse evento — interrompe o fluxo normal (splash/login) e mostra a tela de nova senha.
    sb.auth.onAuthStateChange((event, session) => {
      if(event==='PASSWORD_RECOVERY'){
        SB_AUTH_USER = session && session.user;
        CL.screen='resetpassword'; cdraw();
      }
    });
    const { data:{ session } } = await sb.auth.getSession();
    if(session && session.user && session.user.is_anonymous){
      // sessão anônima de testes antigos (antes do login real) — descarta, força login de verdade
      try { await sb.auth.signOut(); } catch(e){}
      SB_AUTH_USER = null;
    } else if(session) {
      SB_AUTH_USER = session.user;
    }
    console.log('✓ Supabase pronto', SB_AUTH_USER ? '(sessão ativa: '+(SB_AUTH_USER.email||'?')+')' : '(sem sessão)');
    return true;
  } catch(e) { console.warn('⚠ Supabase init erro:', e.message); return false; }
}

/* retorna {loggedIn, email, name} pra UI decidir se mostra login/cadastro ou "continuar como X" */
function netAuthStatus(){
  if(!SB_AUTH_USER) return { loggedIn:false };
  return { loggedIn:true, email: SB_AUTH_USER.email, name: SB_AUTH_USER.user_metadata?.name || (SB_AUTH_USER.email||'').split('@')[0] };
}

/* ---- Traduz os erros crus do GoTrue (vêm em inglês) pra mensagens claras em PT.
   Sem match: devolve a própria mensagem original como fallback. ---- */
function authErrPt(error){
  const msg=(error&&error.message||'').toLowerCase();
  if(msg.includes('weak') || msg.includes('pwned') || msg.includes('easy to guess'))
    return 'Essa senha é muito fácil de adivinhar. Escolha uma senha mais forte (misture letras, números e evite senhas óbvias).';
  if(msg.includes('at least') || msg.includes('should be at least') || msg.includes('minimum') || (msg.includes('password')&&msg.includes('6 characters')))
    return 'A senha precisa ter pelo menos 6 caracteres.';
  if(msg.includes('invalid format') || msg.includes('unable to validate email') || msg.includes('invalid email'))
    return 'E-mail inválido. Confira o endereço e tente de novo.';
  if(msg.includes('requires a valid password') || (msg.includes('password')&&msg.includes('required')))
    return 'Informe uma senha válida.';
  if(msg.includes('for security purposes') || msg.includes('rate limit') || msg.includes('too many'))
    return 'Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente de novo.';
  if(msg.includes('email not confirmed'))
    return 'Confirme seu e-mail antes de entrar (verifique a caixa de entrada e o spam).';
  if(msg.includes('failed to fetch') || msg.includes('network'))
    return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
  return error&&error.message || 'Ocorreu um erro. Tente de novo.';
}

/* ---- CADASTRO: e-mail + senha + nome. Bloqueia duplicado com mensagem clara. ---- */
async function netAuthSignUp(email, password, name){
  if(!sb) await netInitSupabase();
  if(!sb) throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.');
  const { data, error } = await sb.auth.signUp({ email, password, options:{ data:{ name } } });
  if(error){
    const msg = (error.message||'').toLowerCase();
    if(msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')){
      const e2 = new Error('Essa conta já existe. Use "Entrar" com sua senha.');
      e2.code = 'DUPLICATE_ACCOUNT';
      throw e2;
    }
    throw new Error(authErrPt(error));
  }
  // heurística extra: signUp com e-mail já cadastrado às vezes não retorna erro (proteção contra enumeração),
  // mas devolve um "user" com identities vazio — trata como duplicado também.
  if(data.user && Array.isArray(data.user.identities) && data.user.identities.length===0){
    const e2 = new Error('Essa conta já existe. Use "Entrar" com sua senha.');
    e2.code = 'DUPLICATE_ACCOUNT';
    throw e2;
  }
  if(!data.session){
    const e2 = new Error('Conta criada! Confirme seu e-mail antes de entrar (verifique a caixa de entrada).');
    e2.code = 'NEEDS_CONFIRM';
    throw e2;
  }
  SB_AUTH_USER = data.user;
  return SB_AUTH_USER;
}

/* ---- LOGIN: e-mail + senha ---- */
async function netAuthSignIn(email, password){
  if(!sb) await netInitSupabase();
  if(!sb) throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if(error){
    const msg=(error.message||'').toLowerCase();
    if(msg.includes('invalid login')) throw new Error('E-mail ou senha incorretos.');
    throw new Error(authErrPt(error));
  }
  SB_AUTH_USER = data.user;
  return SB_AUTH_USER;
}

async function netAuthSignOut(){
  if(sb) await sb.auth.signOut();
  SB_AUTH_USER = null;
}

/* ---- ESQUECI MINHA SENHA: manda pela Edge Function send-password-reset (Resend,
   com o design da marca) em vez do e-mail padrão do Supabase — mesmo link de
   recuperação de verdade por baixo (gerado pela Admin API), só troca remetente/
   template. O link do e-mail traz de volta pra cá com um hash tipo
   #access_token=...&type=recovery — o supabase-js detecta isso sozinho na criação
   do client (netInitSupabase) e dispara o evento PASSWORD_RECOVERY, que abre a
   tela de "Nova senha". ---- */
async function netAuthResetPassword(email){
  if(!sb) await netInitSupabase();
  if(!sb) throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.');
  const redirectTo = window.location.origin + window.location.pathname;
  const { data, error } = await sb.functions.invoke('send-password-reset', { body: { email, redirectTo } });
  if(error){
    // supabase-js só bota uma mensagem genérica em error.message ("Edge Function
    // returned a non-2xx status code") — a mensagem de verdade que a function manda
    // (ex: "Falha ao enviar o e-mail...") vem no corpo JSON, acessível via
    // error.context (o Response cru do fetch). Tenta ler de lá antes de cair pro
    // texto genérico (se o parse falhar por qualquer motivo, sem problema).
    let msg=error.message;
    try{ const body=await error.context.json(); if(body&&body.error) msg=body.error; }catch(e2){}
    throw new Error(msg);
  }
  if(data && data.error) throw new Error(data.error);
  return true;
}
/* ---- NOVA SENHA: só é chamada depois do evento PASSWORD_RECOVERY (já autenticado
   pela sessão temporária de recuperação que o link trouxe). ---- */
async function netUpdatePassword(newPassword){
  if(!sb) throw new Error('Sessão de recuperação perdida. Peça o link de novo.');
  const { data, error } = await sb.auth.updateUser({ password: newPassword });
  if(error) throw error;
  SB_AUTH_USER = data.user;
  return SB_AUTH_USER;
}

/* participantes = união de presença ao vivo (Realtime Presence) + assentos já reivindicados (game_seats) */
function netMergeParticipants(){
  if(!NET.room) return;
  const claimed = NET._claimed || {};
  const seen = {};
  const list = [];
  Object.keys(SB_ONLINE||{}).forEach(uid=>{
    const meta = (SB_ONLINE[uid]||[])[0]; if(!meta) return;
    seen[uid]=1; const c = claimed[uid]||{};
    list.push({ id:uid, name:meta.name||'(sem nome)', email:c.email||'', confirmed:true, clubId:c.clubId||null, ready:c.ready||false, host: uid===NET.room.hostId });
  });
  Object.keys(claimed).forEach(uid=>{
    if(seen[uid]) return; const c=claimed[uid];
    list.push({ id:uid, name:c.name||'(sem nome)', email:c.email||'', confirmed:true, clubId:c.clubId||null, ready:c.ready||false, host: uid===NET.room.hostId });
  });
  if(!seen[SB_AUTH_USER.id] && !claimed[SB_AUTH_USER.id]){
    list.push({ id:SB_AUTH_USER.id, name:NET.self.name, email:NET.self.email, confirmed:true, clubId:null, ready:false, host:NET.isHost });
  }
  NET.room.participants = list;
  if(NET.onState) NET.onState(NET.room);
}

/* ---- ROOMS: criar / entrar (código curto = id direto, sem UUID separado) ---- */
async function netCreateRoom(name, host){
  if(!sb || !SB_AUTH_USER) throw new Error('Supabase não autenticado');
  const clubIds = DATA.clubs.map(c=>c.id);
  const { data: code, error } = await sb.rpc('create_game', { p_name:name, p_club_ids:clubIds, p_mode: CL.net.mode||'sorteio' });
  if(error) throw error;
  NET.code = code; NET.gameId = code; NET.isHost = true;
  NET.self = { id: SB_AUTH_USER.id, name: host.name, email: host.email };
  NET._claimed = {};
  NET.room = { code, gameId: code, name, hostId: SB_AUTH_USER.id, mode: CL.net.mode||'sorteio', phase:'lobby',
    participants: [], seed:0, round:0, deadline:0, paused:false, speedMult:1, chat:[] };
  netSetupRealtime(); netTrackPresence(); netMergeParticipants();
  return code;
}

async function netJoinRoom(code, me){
  if(!sb || !SB_AUTH_USER) throw new Error('Supabase não autenticado');
  const upcode = String(code||'').toUpperCase();
  const { data: gameData, error: e2 } = await sb.from('games').select('*').eq('id', upcode).single();
  if(e2) throw new Error('Sala não encontrada');
  NET.code = gameData.id; NET.gameId = gameData.id; NET.isHost = (gameData.host_id === SB_AUTH_USER.id);
  NET.self = { id: SB_AUTH_USER.id, name: me.name, email: me.email };
  const { data: seatsData } = await sb.from('game_seats').select('*').eq('game_id', gameData.id);
  const { data: msgs } = await sb.from('messages').select('*').eq('game_id', gameData.id).order('created_at').limit(100);
  NET._claimed = {};
  (seatsData||[]).forEach(s=>{ if(s.user_id) NET._claimed[s.user_id] = { clubId:s.club_id, ready:s.is_ready, name:s.name, email:s.email }; });
  NET.room = {
    code: gameData.id, gameId: gameData.id, name: gameData.name, hostId: gameData.host_id, mode: gameData.mode, phase: gameData.phase,
    participants: [], seed: gameData.seed, round: gameData.round||0, deadline: gameData.ready_deadline?new Date(gameData.ready_deadline).getTime():0,
    paused: gameData.paused, speedMult: parseFloat(gameData.speed_mult)||1,
    chat: (msgs||[]).map(m=>({ id:m.user_id, name:m.user_name||'?', clubId:m.club_id, text:m.body, ts:new Date(m.created_at).getTime() }))
  };
  netSetupRealtime(); netTrackPresence(); netMergeParticipants();
  return true;
}

/* ---- reivindicar clube ---- */
async function netAssignClub(pid, clubId){
  let nm, em;
  try {
    if(pid === SB_AUTH_USER.id){
      const { error } = await sb.rpc('claim_seat', { p_game: NET.gameId, p_club: clubId });
      if(error) throw error;
      nm = NET.self.name; em = NET.self.email;
      await sb.from('game_seats').update({ name: nm, email: em }).eq('game_id', NET.gameId).eq('club_id', clubId);
      // limpa convite pendente, se houver (aceito ao escolher o clube)
      sb.from('room_invites').delete().eq('game_id', NET.gameId).eq('user_id', SB_AUTH_USER.id).then(()=>{});
    } else if(NET.isHost) {
      const { error } = await sb.rpc('host_assign_seat', { p_game: NET.gameId, p_club: clubId, p_target_user: pid });
      if(error) throw error;
      const target = NET.room.participants.find(p=>p.id===pid);
      nm = target?.name; em = target?.email;
      await sb.from('game_seats').update({ name: nm, email: em }).eq('game_id', NET.gameId).eq('club_id', clubId);
    } else { return; }
    NET._claimed[pid] = { clubId, ready:false, name:nm, email:em };
    netMergeParticipants();
  } catch(e) { console.error('assignClub erro:', e); if(typeof toastC==='function') toastC('⚠ Não foi possível escolher esse clube (já ocupado?).'); }
}

async function netDrawClubs(clubIds){
  if(!NET.isHost) return;
  try {
    const { data: seats } = await sb.from('game_seats').select('*').eq('game_id', NET.gameId);
    const free = (seats||[]).filter(s=>s.is_cpu && !s.user_id).map(s=>s.club_id);
    for(let i=free.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [free[i],free[j]]=[free[j],free[i]]; }
    let idx=0;
    for(const p of NET.room.participants){ if(!p.clubId && idx<free.length){ await netAssignClub(p.id, free[idx++]); } }
  } catch(e) { console.error('drawClubs erro:', e); }
}

async function netSetMode(mode){
  if(!NET.isHost) return;
  try { await sb.from('games').update({ mode }).eq('id', NET.gameId); NET.room.mode = mode; } catch(e) { console.error('setMode erro:', e); }
}

async function netSetReady(ready, clubId){
  try {
    await sb.from('game_seats').update({ is_ready: ready }).eq('game_id', NET.gameId).eq('user_id', SB_AUTH_USER.id);
    if(NET._claimed[SB_AUTH_USER.id]) NET._claimed[SB_AUTH_USER.id].ready = ready;
    netMergeParticipants();
  } catch(e) { console.error('setReady erro:', e); }
}

async function netStart(){
  if(!NET.isHost) return;
  const deadline = new Date(Date.now()+60000).toISOString();
  NET.room.phase='ready'; NET.room.deadline=Date.now()+60000; NET.room.paused=false;
  if(NET.onState) NET.onState(NET.room);
  try { await sb.from('games').update({ phase:'ready', ready_deadline: deadline, paused:false }).eq('id', NET.gameId); }
  catch(e) { console.error('start erro:', e); }
}

async function netPause(){
  if(!NET.isHost) return;
  try {
    const newPaused = !NET.room.paused;
    const patch = { paused:newPaused };
    if(newPaused){ patch.paused_remaining_ms = Math.max(1000, (NET.room.deadline||0) - Date.now()); }
    else { patch.ready_deadline = new Date(Date.now() + (NET.room.paused_remaining_ms||10000)).toISOString(); }
    NET.room.paused = newPaused; if(newPaused) NET.room.paused_remaining_ms = patch.paused_remaining_ms; else NET.room.deadline = new Date(patch.ready_deadline).getTime();
    if(NET.onState) NET.onState(NET.room);
    await sb.from('games').update(patch).eq('id', NET.gameId);
  } catch(e) { console.error('pause erro:', e); }
}

async function netSetSpeed(mult){
  if(!NET.isHost) return;
  try { await sb.from('games').update({ speed_mult: mult }).eq('id', NET.gameId); NET.room.speedMult = mult; }
  catch(e) { console.error('setSpeed erro:', e); }
}

/* transição pra 'running' é otimista: aplicamos localmente na hora (não
   esperamos o round-trip do Realtime) pra garantir que o cronômetro chegando
   a zero SEMPRE dispare a rodada ao vivo imediatamente, sem depender de latência. */
async function netToRunning(){
  if(!NET.isHost) return;
  if(NET.room.phase==='running') return; // evita disparo duplicado
  NET.room.phase='running';
  if(NET.onState) NET.onState(NET.room);
  try { await sb.from('games').update({ phase:'running' }).eq('id', NET.gameId); } catch(e) { console.error('toRunning erro:', e); }
}

async function netToLobby(){
  if(!NET.isHost) return;
  try {
    const newRound = (NET.room.round||0) + 1;
    await sb.from('games').update({ phase:'lobby', round:newRound, ready_deadline:null }).eq('id', NET.gameId);
    await sb.from('game_seats').update({ is_ready:false }).eq('game_id', NET.gameId);
  } catch(e) { console.error('toLobby erro:', e); }
}

async function netSendChat(text, clubId){
  const { error } = await sb.from('messages').insert({ game_id: NET.gameId, user_id: SB_AUTH_USER.id, user_name: NET.self.name, club_id: clubId, body: text });
  if(error) { console.error('sendChat erro:', error); throw error; }
}

/* ---- lista de salas do usuário (pra reentrar rápido, sem criar de novo) ---- */
async function netListMyRooms(){
  if(!sb || !SB_AUTH_USER) return [];
  try {
    const [{ data: seatData, error: e1 }, { data: inviteData, error: e2 }] = await Promise.all([
      sb.from('game_seats').select('game_id, club_id, is_ready, games(name, phase, round, host_id)').eq('user_id', SB_AUTH_USER.id),
      sb.from('room_invites').select('game_id, games(name, phase, round, host_id)').eq('user_id', SB_AUTH_USER.id)
    ]);
    if(e1) throw e1;
    const claimed = (seatData||[]).filter(r=>r.games).map(r=>({
      code: r.game_id, name: r.games.name, phase: r.games.phase, round: r.games.round,
      isHost: r.games.host_id===SB_AUTH_USER.id, clubId: r.club_id, pending:false
    }));
    const claimedCodes = new Set(claimed.map(r=>r.code));
    const pending = (e2?[]:(inviteData||[])).filter(r=>r.games && !claimedCodes.has(r.game_id)).map(r=>({
      code: r.game_id, name: r.games.name, phase: r.games.phase, round: r.games.round,
      isHost: false, clubId: null, pending: true
    }));
    return claimed.concat(pending);
  } catch(e) { console.error('listMyRooms erro:', e); return []; }
}

/* ---- convite por e-mail (Edge Function -> Resend) ---- */
async function netSendEmailInvite(toEmail){
  if(!sb || !SB_AUTH_USER) throw new Error('Não autenticado');
  const { data, error } = await sb.functions.invoke('send-invite-email', {
    body: { to: toEmail, hostName: NET.self.name, roomName: NET.room.name, inviteUrl: NET.inviteLink() }
  });
  if(error) throw error;
  if(data && data.error) throw new Error(data.error);
  return data;
}

/* ---- busca de usuários cadastrados (convite interno, sem recriar conta) ---- */
async function netSearchUsers(query){
  if(!sb || !SB_AUTH_USER) return [];
  if((query||'').trim().length < 3) return [];
  try {
    const { data, error } = await sb.rpc('search_users', { p_query: query.trim() });
    if(error) throw error;
    return (data||[]).filter(u=>u.id!==SB_AUTH_USER.id);
  } catch(e) { console.error('searchUsers erro:', e); return []; }
}

/* convite interno: só REGISTRA o convite (sem reivindicar clube nenhum).
   O convidado precisa entrar e aceitar — aí ele mesmo escolhe o time dele
   (aparece como "convite pendente" em Minhas Salas, leva pra scMidJoin). */
async function netInviteInternal(targetUserId, targetName){
  if(!NET.isHost) return;
  const { error } = await sb.from('room_invites').upsert(
    { game_id: NET.gameId, user_id: targetUserId, invited_by: SB_AUTH_USER.id },
    { onConflict: 'game_id,user_id' }
  );
  if(error) { console.error('inviteInternal erro:', error); throw error; }
}

/* ---- Séries B/C/D: lê o cache de clubes reais ---- */
async function netGetDivisionClubs(division){
  if(!sb) return [];
  const { data, error } = await sb.from('division_clubs').select('*').eq('division', division);
  if(error){ console.error('getDivisionClubs erro:', error); return []; }
  return data||[];
}

async function netSaveGame(stateObj){
  if(!NET.isHost) return;
  try {
    const { data: cur } = await sb.from('games').select('state_version').eq('id', NET.gameId).single();
    const nextV = (cur?.state_version||0) + 1;
    const { error } = await sb.from('games').update({ shared_state: stateObj, state_version: nextV }).eq('id', NET.gameId).eq('state_version', cur?.state_version||0);
    if(error) throw error;
    console.log('✓ Jogo salvo (v'+nextV+', rodada '+(stateObj.round)+')');
  } catch(e) { console.error('saveGame erro:', e); }
}

async function netLoadGame(){
  try {
    const { data, error } = await sb.from('games').select('shared_state,state_version').eq('id', NET.gameId).single();
    if(error) return null;
    return data?.shared_state || null;
  } catch(e) { console.error('loadGame erro:', e); return null; }
}

/* ---- SAVES DO MODO SOLO (só nuvem, por usuário) ---- */
async function netListSoloSaves(){
  if(!sb) await netInitSupabase();
  if(!sb || !SB_AUTH_USER) return [];
  try {
    const { data, error } = await sb.from('solo_saves').select('save_name,updated_at').order('updated_at',{ascending:false});
    if(error){ console.error('listSoloSaves erro:', error); return []; }
    return (data||[]).map(r=>({ name:r.save_name, updated_at:r.updated_at }));
  } catch(e){ console.error('listSoloSaves erro:', e); return []; }
}
async function netLoadSoloSave(name){
  if(!sb) await netInitSupabase();
  if(!sb || !SB_AUTH_USER) throw new Error('Não conectado.');
  const { data, error } = await sb.from('solo_saves').select('state').eq('save_name', name).maybeSingle();
  if(error) throw error;
  return data ? data.state : null;
}
async function netSaveSoloGame(name, state){
  if(!sb) await netInitSupabase();
  if(!sb || !SB_AUTH_USER) throw new Error('Não conectado.');
  const { error } = await sb.from('solo_saves').upsert(
    { user_id: SB_AUTH_USER.id, save_name: name, state, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,save_name' });
  if(error) throw error;
  return true;
}
async function netDeleteSoloSave(name){
  if(!sb || !SB_AUTH_USER) return false;
  const { error } = await sb.from('solo_saves').delete().eq('save_name', name);
  if(error){ console.error('deleteSoloSave erro:', error); return false; }
  return true;
}

/* ---- REALTIME: postgres_changes + presence ---- */
function netSetupRealtime(){
  if(!sb || SB_CH) return;
  SB_CH = sb.channel('game:'+NET.gameId, { config:{ presence:{ key: SB_AUTH_USER.id } } });

  SB_CH.on('postgres_changes', { event:'UPDATE', schema:SB_SCHEMA, table:'games', filter:'id=eq.'+NET.gameId }, (p)=>{
    if(!p.new) return;
    Object.assign(NET.room, {
      mode: p.new.mode, phase: p.new.phase, round: p.new.round,
      deadline: p.new.ready_deadline?new Date(p.new.ready_deadline).getTime():0,
      paused: p.new.paused, paused_remaining_ms: p.new.paused_remaining_ms, speedMult: parseFloat(p.new.speed_mult)||1
    });
    if(NET.onState) NET.onState(NET.room);
  });

  SB_CH.on('postgres_changes', { event:'UPDATE', schema:SB_SCHEMA, table:'game_seats', filter:'game_id=eq.'+NET.gameId }, (p)=>{
    if(!p.new) return;
    if(p.new.user_id){ NET._claimed[p.new.user_id] = { clubId:p.new.club_id, ready:p.new.is_ready, name:p.new.name, email:p.new.email }; }
    netMergeParticipants();
  });

  SB_CH.on('postgres_changes', { event:'INSERT', schema:SB_SCHEMA, table:'messages', filter:'game_id=eq.'+NET.gameId }, (p)=>{
    if(!p.new) return;
    const msg = { id:p.new.user_id, name:p.new.user_name||'?', clubId:p.new.club_id, text:p.new.body, ts:new Date(p.new.created_at).getTime() };
    NET.room.chat = (NET.room.chat||[]).concat(msg).slice(-120);
    if(NET.onChat) NET.onChat(msg);
    if(NET.onState) NET.onState(NET.room);
  });

  SB_CH.on('presence', { event:'sync' }, ()=>{ SB_ONLINE = SB_CH.presenceState(); netMergeParticipants(); });

  SB_CH.subscribe(async (st)=>{ if(st==='SUBSCRIBED') console.log('✓ Realtime conectado (elifoot_v3)'); });
}
function netTrackPresence(){ if(SB_CH) SB_CH.track({ name: NET.self.name, club: null }); }
function netIsOnline(uid){ return !!(SB_ONLINE && SB_ONLINE[uid] && SB_ONLINE[uid].length); }

/* ---- expõe no NET (mesma API já usada pela UI clássica) ---- */
NET.createRoom = netCreateRoom;
NET.joinRoom = netJoinRoom;
NET.setMode = netSetMode;
NET.assignClub = netAssignClub;
NET.drawClubs = netDrawClubs;
NET.setReady = netSetReady;
NET.start = netStart;
NET.pause = netPause;
NET.setSpeed = netSetSpeed;
NET.toRunning = netToRunning;
NET.toLobby = netToLobby;
NET.sendChat = netSendChat;
NET.saveGame = netSaveGame;
NET.loadGame = netLoadGame;
NET.isOnlineUser = netIsOnline;
NET.authStatus = netAuthStatus;
NET.authSignUp = netAuthSignUp;
NET.authSignIn = netAuthSignIn;
NET.authSignOut = netAuthSignOut;
NET.authResetPassword = netAuthResetPassword;
NET.updatePassword = netUpdatePassword;
NET.listMyRooms = netListMyRooms;
NET.sendEmailInvite = netSendEmailInvite;
NET.searchUsers = netSearchUsers;
NET.inviteInternal = netInviteInternal;
NET.getDivisionClubs = netGetDivisionClubs;
NET.listSoloSaves = netListSoloSaves;
NET.loadSoloSave = netLoadSoloSave;
NET.saveSoloGame = netSaveSoloGame;
NET.deleteSoloSave = netDeleteSoloSave;
NET.useSupabase = true;

