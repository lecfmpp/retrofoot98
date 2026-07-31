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
let SB_KICKED = {}; // uids expulsos pelo anfitrião — excluídos do lobby/jogo na hora (sem esperar timeout de presença)

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
  const isBusy=(c)=> !!(c && c.busy_until && new Date(c.busy_until).getTime() > Date.now()); // em partida ao vivo
  // ONLINE confiável = heartbeat no banco (last_seen nos últimos 40s) OU presença do realtime OU sou EU.
  // O presence sozinho é instável (mostrava todos Offline mesmo na sala) — o last_seen resolve.
  const SEEN_WINDOW=40000;
  const isSeen=(uid,c)=> uid===SB_AUTH_USER.id || !!(SB_ONLINE && SB_ONLINE[uid] && (SB_ONLINE[uid][0]))
    || !!(c && c.last_seen && (Date.now()-new Date(c.last_seen).getTime()) < SEEN_WINDOW);
  Object.keys(SB_ONLINE||{}).forEach(uid=>{
    if(SB_KICKED[uid]) return; // expulso: não conta mais como participante (mesmo se a presença ainda não caiu)
    const meta = (SB_ONLINE[uid]||[])[0]; if(!meta) return;
    seen[uid]=1; const c = claimed[uid]||{};
    list.push({ id:uid, name:meta.name||c.name||'(sem nome)', email:c.email||'', confirmed:true, clubId:c.clubId||null, ready:c.ready||false, host: uid===NET.room.hostId, online:true, busy:isBusy(c) });
  });
  Object.keys(claimed).forEach(uid=>{
    if(seen[uid] || SB_KICKED[uid]) return; const c=claimed[uid];
    list.push({ id:uid, name:c.name||'(sem nome)', email:c.email||'', confirmed:true, clubId:c.clubId||null, ready:c.ready||false, host: uid===NET.room.hostId, online:isSeen(uid,c), busy:isBusy(c) });
  });
  if(!seen[SB_AUTH_USER.id] && !claimed[SB_AUTH_USER.id]){
    list.push({ id:SB_AUTH_USER.id, name:NET.self.name, email:NET.self.email, confirmed:true, clubId:null, ready:false, host:NET.isHost, online:true, busy:false });
  }
  NET.room.participants = list;
  // PONTE de escalação: joga a última escalação/tática sincronizada de cada OUTRO humano em
  // S.clubXI[clube]/S.clubTactic[clube] — é o que availableXI/tacticForClub leem pra simular o clube
  // dele com a escalação REAL dele (não autoXI) quando ele está ausente/não joga ao vivo. Pulamos o
  // MEU clube (mando localmente a minha escalação; o synced pode estar defasado do que acabei de mudar).
  if(typeof S!=='undefined' && S && S.squads){
    S.clubXI=S.clubXI||{}; S.clubTactic=S.clubTactic||{};
    Object.keys(claimed).forEach(uid=>{ if(uid===SB_AUTH_USER.id) return; const c=claimed[uid];
      if(c && c.clubId){ if(c.last_xi && c.last_xi.length) S.clubXI[c.clubId]=c.last_xi.slice(); if(c.last_tactic) S.clubTactic[c.clubId]=c.last_tactic; } });
  }
  if(NET.onState) NET.onState(NET.room);
}

/* ---- ROOMS: criar / entrar (código curto = id direto, sem UUID separado) ---- */
async function netCreateRoom(name, host){
  if(!sb || !SB_AUTH_USER) throw new Error('Supabase não autenticado');
  // A Resenha começa SEMPRE na última divisão do Brasil (Série D) — ver onlineBeginSeason. O pool de
  // clubes NÃO pode depender do universo/divisão em que o host estava (ex.: explorando Argentina/
  // Europa) — senão os assentos ficam com clubes de outro país e o convidado não consegue reivindicar.
  const poolClubs = (typeof resenhaStartClubs==='function' && resenhaStartClubs().length) ? resenhaStartClubs()
    : ((typeof DATA!=='undefined' && DATA.clubsSerieA && DATA.clubsSerieA.length) ? DATA.clubsSerieA : DATA.clubs);
  const clubIds = poolClubs.map(c=>c.id);
  const { data: code, error } = await sb.rpc('create_game', { p_name:name, p_club_ids:clubIds, p_mode: CL.net.mode||'sorteio' });
  if(error) throw error;
  NET.code = code; NET.gameId = code; NET.isHost = true;
  NET.self = { id: SB_AUTH_USER.id, name: (host&&host.name) || netAuthStatus().name, email: (host&&host.email)||SB_AUTH_USER.email };
  NET._claimed = {};
  // LÊ o seed real gerado por create_game — sem isso o host ficava com seed:0 e montava uma
  // competição DIFERENTE da do convidado (que lê games.seed no join) -> "dois jogos em paralelo".
  let createdSeed=0; try{ const { data: g } = await sb.from('games').select('seed').eq('id', code).single(); createdSeed = g && g.seed; }catch(e){}
  NET.room = { code, gameId: code, name, hostId: SB_AUTH_USER.id, mode: CL.net.mode||'sorteio', phase:'lobby',
    participants: [], seed:createdSeed, round:0, deadline:0, paused:false, speedMult:1, chat:[],
    kickoffAt:0, kickoffLineups:null };
  netSetupRealtime(); netTrackPresence(); netMergeParticipants();
  return code;
}

async function netJoinRoom(code, me){
  if(!sb || !SB_AUTH_USER) throw new Error('Supabase não autenticado');
  const upcode = String(code||'').toUpperCase();
  const { data: gameData, error: e2 } = await sb.from('games').select('*').eq('id', upcode).single();
  if(e2) throw new Error('Sala não encontrada');
  NET.code = gameData.id; NET.gameId = gameData.id; NET.isHost = (gameData.host_id === SB_AUTH_USER.id);
  NET.self = { id: SB_AUTH_USER.id, name: (me&&me.name) || netAuthStatus().name, email: (me&&me.email)||SB_AUTH_USER.email };
  const { data: seatsData } = await sb.from('game_seats').select('*').eq('game_id', gameData.id);
  const { data: msgs } = await sb.from('messages').select('*').eq('game_id', gameData.id).order('created_at').limit(100);
  NET._claimed = {};
  (seatsData||[]).forEach(s=>{ if(s.user_id) NET._claimed[s.user_id] = { clubId:s.club_id, ready:s.is_ready, name:s.name, email:s.email, busy_until:s.busy_until, last_xi:s.last_xi, last_tactic:s.last_tactic, last_result:s.last_result, last_result_round:s.last_result_round, last_bids:s.last_bids, last_seen:s.last_seen }; });
  NET.room = {
    code: gameData.id, gameId: gameData.id, name: gameData.name, hostId: gameData.host_id, mode: gameData.mode, phase: gameData.phase,
    participants: [], seed: gameData.seed, round: gameData.round||0, deadline: gameData.ready_deadline?new Date(gameData.ready_deadline).getTime():0,
    paused: gameData.paused, speedMult: parseFloat(gameData.speed_mult)||1,
    kickoffAt: gameData.kickoff_at?new Date(gameData.kickoff_at).getTime():0, kickoffLineups: gameData.kickoff_lineups||null,
    chat: (msgs||[]).map(m=>({ id:m.user_id, name:m.user_name||'?', clubId:m.club_id, text:m.body, ts:new Date(m.created_at).getTime() }))
  };
  netSetupRealtime(); netTrackPresence(); netMergeParticipants();
  return true;
}

/* ---- SINCRONIZAR: re-lê o estado da sala (games + assentos) do banco e reaplica, sem recriar o
   canal. Dispara netMergeParticipants -> NET.onState, que trata a transição lobby->jogo do convidado
   e a reconciliação de rodada. Serve tanto pro botão manual quanto como rede de segurança. ---- */
async function netRefreshRoom(){
  if(!sb || !NET.gameId || !NET.room) return null;
  try{
    const { data: g } = await sb.from('games').select('*').eq('id', NET.gameId).single();
    if(!g) return null;
    Object.assign(NET.room, {
      name: g.name, mode: g.mode, phase: g.phase, round: g.round||0, seed: g.seed,
      deadline: g.ready_deadline?new Date(g.ready_deadline).getTime():0,
      paused: g.paused, paused_remaining_ms: g.paused_remaining_ms, speedMult: parseFloat(g.speed_mult)||1,
      kickoffAt: g.kickoff_at?new Date(g.kickoff_at).getTime():0, kickoffLineups: g.kickoff_lineups||null
    });
    const { data: seats } = await sb.from('game_seats').select('*').eq('game_id', NET.gameId);
    NET._claimed = NET._claimed || {};
    (seats||[]).forEach(s=>{ if(s.user_id) NET._claimed[s.user_id] = { clubId:s.club_id, ready:s.is_ready, name:s.name, email:s.email, busy_until:s.busy_until, last_xi:s.last_xi, last_tactic:s.last_tactic, last_result:s.last_result, last_result_round:s.last_result_round, last_bids:s.last_bids, last_seen:s.last_seen }; });
    netMergeParticipants(); // -> NET.onState (transição lobby->jogo + reconcile de rodada)
    return NET.room;
  }catch(e){ console.warn('refreshRoom:', e&&e.message); return null; }
}

/* ---- HEARTBEAT DE ATIVIDADE (barreira de sincronização) ----
   Enquanto EU estou numa partida ao vivo (liga ou copa), marco meu assento como "ocupado"
   (busy_until no futuro). O RPC advance_phase_if_expired NÃO avança a rodada enquanto houver
   qualquer humano ocupado — assim ninguém pula a rodada enquanto o outro joga liga/copa. Se eu
   cair no meio (parar de bater o heartbeat), o busy_until expira em ~90s e a rodada segue. ---- */
async function netHeartbeatBusy(){
  if(!sb || !NET.gameId || !SB_AUTH_USER) return;
  try{ await sb.from('game_seats').update({ busy_until: new Date(Date.now()+90000).toISOString() }).eq('game_id', NET.gameId).eq('user_id', SB_AUTH_USER.id); }catch(e){}
}
async function netClearBusy(){
  if(!sb || !NET.gameId || !SB_AUTH_USER) return;
  try{ await sb.from('game_seats').update({ busy_until: null }).eq('game_id', NET.gameId).eq('user_id', SB_AUTH_USER.id); }catch(e){}
}
/* HEARTBEAT DE PRESENÇA (confiável, no banco): enquanto estou na Resenha, carimbo last_seen no meu
   assento a cada ~15s. O "online" da barra de status vem daqui (visto nos últimos ~40s), não do
   presence do realtime — que é instável e mostrava todo mundo Offline mesmo estando na sala. */
async function netHeartbeatSeen(){
  if(!sb || !NET.gameId || !SB_AUTH_USER) return;
  const now=new Date().toISOString();
  const upd={ last_seen: now };
  // AUTO-CURA do nome: se o MEU assento ficou sem nome (ex.: reatribuição no sorteio), re-carimbo o
  // meu nome de conta aqui — cada um conhece o próprio nome com segurança.
  const myName=(NET.self&&NET.self.name)||netAuthStatus().name;
  const cur=NET._claimed && NET._claimed[SB_AUTH_USER.id];
  if(myName && (!cur || !cur.name || cur.name==='(sem nome)')){ upd.name=myName; upd.email=(NET.self&&NET.self.email)||SB_AUTH_USER.email; if(cur){ cur.name=myName; cur.email=upd.email; } }
  if(cur) cur.last_seen=now; // reflete já localmente
  try{ await sb.from('game_seats').update(upd).eq('game_id', NET.gameId).eq('user_id', SB_AUTH_USER.id); }catch(e){}
}
/* PUBLICA a última escalação/tática do MEU clube no meu assento — os outros clientes leem isso
   (via game_seats -> _claimed -> S.clubXI) pra simular o MEU clube com a MINHA escalação real quando
   eu estou ausente/não jogo ao vivo. Sem isso, cada cliente simulava com autoXI e os resultados
   divergiam. jsonb aceita o array de nomes de S.xi. */
async function netPublishLineup(xi, tactic){
  if(!sb || !NET.gameId || !SB_AUTH_USER) return;
  try{ await sb.from('game_seats').update({ last_xi:(xi&&xi.length)?xi:null, last_tactic:tactic||null }).eq('game_id', NET.gameId).eq('user_id', SB_AUTH_USER.id); }catch(e){}
}

/* ---- SAVE ÚNICO (Fase A): publica o RESULTADO REAL da MINHA partida desta rodada ----
   Cada humano joga a sua partida ao vivo no próprio aparelho e publica {round,h,a,hg,ag,scorers,
   perf,events} no seu assento. Todos os clientes leem os resultados de TODOS e rodam
   _commitLeagueRound uma única vez com esses resultados (humanResults) -> S idêntico pra todos,
   sem re-simular a partida do vizinho (que divergia). Espelha last_result no _claimed local na hora
   (o realtime confirma). */
async function netPublishResult(round, result){
  if(!sb || !NET.gameId || !SB_AUTH_USER || !result) return;
  // transfers: trocas de elenco feitas por MIM nesta rodada (compra/venda). Viajam junto do
  // resultado porque é o único canal por-assento que o convidado já escreve toda rodada — o
  // servidor aplica no mundo antes de jogar (applyHumanTransfers) e é idempotente, então
  // reenviar até confirmar é seguro. Ver recordNetTransfer/pruneAppliedNetTransfers no core.
  const _tr = (typeof S!=='undefined' && S && Array.isArray(S._netTransfers)) ? S._netTransfers : [];
  // morale: efeito da coletiva de imprensa no MEU elenco (sala de imprensa de fim de temporada).
  // Mesmo motivo das transferências: aplicar só no cliente seria desfeito pelo servidor.
  const _mo = (typeof S!=='undefined' && S && S._netMorale) ? S._netMorale : 0;
  // offers: propostas que EU mandei pro clube de outro humano. Mesmo motivo das transferências —
  // escrever só no meu S não faz a proposta chegar em ninguém (ver sendHumanOffer/pruneAppliedNetOffers).
  const _of = (typeof S!=='undefined' && S && Array.isArray(S._netOffers)) ? S._netOffers : [];
  const _ct = (typeof S!=='undefined' && S && Array.isArray(S._netCounters)) ? S._netCounters : []; // contrapropostas (vendedor -> comprador)
  const _dr = (typeof S!=='undefined' && S && Array.isArray(S._netOfferDrops)) ? S._netOfferDrops : []; // baixas (aceita/recusada/contraposta)
  const payload = { round, h:result.h, a:result.a, hg:result.hg, ag:result.ag,
    scorers:result.scorers||[], perf:result.perf||null, events:result.events||[], transfers:_tr, morale:_mo, offers:_of, counters:_ct, offerDrops:_dr };
  try{
    if(NET._claimed && NET._claimed[SB_AUTH_USER.id]){ NET._claimed[SB_AUTH_USER.id].last_result=payload; NET._claimed[SB_AUTH_USER.id].last_result_round=round; }
    await sb.from('game_seats').update({ last_result:payload, last_result_round:round }).eq('game_id', NET.gameId).eq('user_id', SB_AUTH_USER.id);
  }catch(e){ console.warn('publishResult:', e&&e.message); }
}
/* F3.5 CUTOVER: pede ao servidor pra RESOLVER a rodada (edge function resolve-round) — o servidor
   é o único produtor do shared_state (liga + outras divisões + copas + virada de temporada). Idempotente
   por state_version: se outro já resolveu, devolve {already:true}. Retorna {ok, round, version} ou {error}.
   `round` = a rodada que ESPERO resolver (S.round atual), pra o servidor não resolver a errada. */
async function netResolveRound(round){
  if(!sb || !NET.gameId) return { error:'sem sala' };
  try{
    const { data, error } = await sb.functions.invoke('resolve-round', { body:{ gameId:NET.gameId, round } });
    if(error) return { error: (error&&error.message)||'erro na edge function' };
    return data||{};
  }catch(e){ return { error: (e&&e.message)||'falha ao chamar resolve-round' }; }
}
/* publica o resultado de uma partida de COPA (mata-mata) jogada ao vivo pelo humano —
   análogo a netPublishResult, mas grava em last_cup_result/last_cup_round. O servidor
   (resolve-round) aplica esse resultado na chave (mandante-autoritativo) antes de simular
   o resto do bracket. Só copas de mata-mata (Copa do Brasil); grupos são Série A -> futuro. */
async function netPublishCupResult(round, cupResult){
  if(!sb || !NET.gameId || !SB_AUTH_USER || !cupResult || !cupResult.h || !cupResult.a || !cupResult.winner) return;
  const payload = { h:cupResult.h, a:cupResult.a, hg:cupResult.hg, ag:cupResult.ag,
    winner:cupResult.winner, pens:cupResult.pens||null, events:cupResult.events||[] };
  try{
    if(NET._claimed && NET._claimed[SB_AUTH_USER.id]){ NET._claimed[SB_AUTH_USER.id].last_cup_result=payload; NET._claimed[SB_AUTH_USER.id].last_cup_round=round; }
    await sb.from('game_seats').update({ last_cup_result:payload, last_cup_round:round }).eq('game_id', NET.gameId).eq('user_id', SB_AUTH_USER.id);
  }catch(e){ console.warn('publishCupResult:', e&&e.message); }
}
/* F3.3: publica o caixa do PRÓPRIO clube no assento -> o servidor (resolve-round) lê pra montar
   S.budgets do mundo, e os reconciles voltam o valor certo (senão o caixa do humano resetava pro
   valor inicial do shared_state a cada rodada). Chamado após aplicar as finanças da rodada / mercado. */
async function netPublishBudget(budget){
  if(!sb || !NET.gameId || !SB_AUTH_USER || budget==null || !isFinite(budget)) return;
  const b=Math.round(budget);
  try{
    if(NET._claimed && NET._claimed[SB_AUTH_USER.id]) NET._claimed[SB_AUTH_USER.id].budget=b;
    await sb.from('game_seats').update({ budget:b }).eq('game_id', NET.gameId).eq('user_id', SB_AUTH_USER.id);
  }catch(e){ console.warn('publishBudget:', e&&e.message); }
}
/* publica o MEU lance atual num lote de leilão (game_seats.last_bids: {lotId:{amount,ts}, ...}) —
   os outros clientes leem via NET._claimed (já chega perto de tempo real pelo canal Realtime que
   assina game_seats). Sem isso, o leilão competitivo entre humanos era só local: cada um via a si
   mesmo como "líder" (leader:'me') sem saber do lance do outro, e a resolução no fallback do
   anfitrião sempre creditava o jogador pro PRÓPRIO clube do anfitrião, não pra quem realmente
   venceu (ver recomputeAuctionLeader/resolveAuctionLot em core.js). */
async function netPublishBids(lotId, amount, ts){
  if(!sb || !NET.gameId || !SB_AUTH_USER || !lotId) return;
  try{
    const mine=(NET._claimed && NET._claimed[SB_AUTH_USER.id]) || null;
    const bids=(mine && mine.last_bids) ? {...mine.last_bids} : {};
    bids[lotId]={amount, ts};
    if(mine) mine.last_bids=bids;
    await sb.from('game_seats').update({ last_bids:bids }).eq('game_id', NET.gameId).eq('user_id', SB_AUTH_USER.id);
  }catch(e){ console.warn('publishBids:', e&&e.message); }
}
/* clubes humanos desta sala (assentos ocupados por gente) */
function netHumanClubIds(){
  const out=[]; const cl=NET._claimed||{};
  Object.keys(cl).forEach(uid=>{ const c=cl[uid]; if(c && c.clubId) out.push(String(c.clubId)); });
  return out;
}
/* TRUE quando TODO clube humano já publicou o resultado desta rodada — barreira antes do commit */
function netAllHumanResultsIn(round){
  const cl=NET._claimed||{}; let any=false;
  for(const uid in cl){ const c=cl[uid]; if(!(c&&c.clubId)) continue; any=true;
    // basta ter publicado ALGO desta rodada (resultado real OU marcador de folga/bye)
    if(!(c.last_result && c.last_result_round===round)) return false; }
  return any;
}
/* já publicado por um humano (autoritativo mandante) pra este confronto+rodada específico — usado
   ANTES de simular localmente uma partida ao vivo (ver buildLiveMatchObject/main.js). Sem isso, os
   dois lados humanos de um confronto podiam assistir e registrar partidas DIFERENTES: mesmo seed,
   mas ratings calculados a partir de escalações que ainda não tinham chegado uma pro cliente da
   outra (netPublishLineup é assíncrono) — o resultado batido em cada tela divergia mesmo a tabela
   usando corretamente o do mandante depois. Reproduzindo os eventos já publicados em vez de
   simular de novo, os dois lados sempre assistem exatamente a MESMA partida. */
function netHumanResultFor(h, a, round){
  const cl=NET._claimed||{}; let homeR=null, awayR=null;
  for(const uid in cl){ const c=cl[uid]; const r=c&&c.last_result;
    if(!(r && c.last_result_round===round && String(r.h)===String(h) && String(r.a)===String(a))) continue;
    if(String(c.clubId)===String(h)) homeR=r; else if(String(c.clubId)===String(a)) awayR=r;
  }
  return homeR||awayR||null; // mandante-autoritativo, igual ao dedup de netCollectHumanResults
}
/* monta humanResults {"h-a":{hg,ag,scorers,perf,events}} desta rodada a partir dos assentos.
   Dedup humano×humano: o resultado do MANDANTE (home) é o autoritativo pra uma partida entre dois
   humanos (os dois jogam ao vivo, mas a tabela usa o do mandante — regra determinística e igual
   pra todos). `exceptClubId` deixa de fora o clube que o chamador aplica como userResult. */
function netCollectHumanResults(round, exceptClubId){
  const cl=NET._claimed||{}; const byFx={};
  for(const uid in cl){ const c=cl[uid]; const r=c&&c.last_result;
    if(!(r && c.last_result_round===round && r.h && r.a)) continue;
    if(exceptClubId!=null && String(c.clubId)===String(exceptClubId)) continue;
    const k=r.h+'-'+r.a;
    // mandante ganha: se já temos um resultado pra essa partida vindo do visitante, o do dono do
    // clube mandante substitui (determinístico).
    if(!byFx[k] || String(c.clubId)===String(r.h)) byFx[k]={hg:r.hg,ag:r.ag,scorers:r.scorers||[],perf:r.perf||null,events:r.events||[]};
  }
  return byFx;
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
      const saved = (NET._seatInfo && NET._seatInfo[pid]) || {};
      // prioriza o nome REAL preservado do assento anterior; só usa a visão de participante se ela
      // tiver um nome de verdade (não "(sem nome)"), senão cai no preservado.
      const partName = (target && target.name && target.name!=='(sem nome)') ? target.name : null;
      nm = partName || saved.name || (target&&target.name) || null;
      em = (target && target.email) || saved.email || null;
      await sb.from('game_seats').update({ name: nm, email: em }).eq('game_id', NET.gameId).eq('club_id', clubId);
    } else { return; }
    NET._claimed[pid] = { clubId, ready:false, name:nm, email:em };
    netMergeParticipants();
  } catch(e) { console.error('assignClub erro:', e); if(typeof toastC==='function') toastC('⚠ Não foi possível escolher esse clube (já ocupado?).'); }
}

/* Sorteia clubes para os participantes.
   - reshuffle=false (padrão, usado no "Começar"): só PREENCHE quem ainda não tem clube (ex.: o
     anfitrião), sem mexer em quem já escolheu/entrou com time.
   - reshuffle=true ("Sortear times" no lobby): LIBERA todos os assentos humanos e re-atribui um
     clube aleatório distinto pra cada participante (embaralha os times de todo mundo). */
async function netDrawClubs(reshuffle){
  if(!NET.isHost) return;
  try {
    const { data: seats0 } = await sb.from('game_seats').select('*').eq('game_id', NET.gameId);
    // LISTA CONFIÁVEL de humanos = assentos com user_id (do banco) UNIÃO participantes presentes.
    // Não confio só em NET.room.participants (presence instável) nem só nos assentos (auto-seat pode
    // estar em corrida) — a união garante que TODO mundo presente entra no sorteio.
    const humansMap={};
    (seats0||[]).forEach(s=>{ if(s.user_id) humansMap[s.user_id]={ user_id:s.user_id, name:s.name, email:s.email }; });
    (NET.room.participants||[]).forEach(p=>{ if(p.id && !SB_KICKED[p.id] && !humansMap[p.id]) humansMap[p.id]={ user_id:p.id, name:(p.name&&p.name!=='(sem nome)')?p.name:null, email:p.email }; });
    const humans=Object.values(humansMap);
    // preserva nome/e-mail conhecidos (o assento vira null na liberação; reuso aqui)
    NET._seatInfo=NET._seatInfo||{}; humans.forEach(h=>{ if(h.name||h.email) NET._seatInfo[h.user_id]={ name:h.name, email:h.email }; });

    // libera TODOS os assentos humanos (recomeça o sorteio do zero — determinístico o suficiente:
    // o host escreve, todos leem os mesmos assentos)
    await sb.from('game_seats').update({ user_id:null, is_cpu:true, is_ready:false, name:null, email:null })
      .eq('game_id', NET.gameId).not('user_id','is',null);

    // pool de clubes = TODOS os clubes da sala, embaralhado
    const pool=(seats0||[]).map(s=>s.club_id);
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }

    // atribui UM clube DISTINTO por humano via host_assign_seat (uniforme p/ host e convidados — evita
    // o erro "já está numa vaga" do claim_seat). RESILIENTE: um erro num jogador NÃO trava os outros.
    NET._claimed={};
    let idx=0, ok=0;
    for(const h of humans){
      if(idx>=pool.length) break;
      const club=pool[idx++];
      try{
        const { error } = await sb.rpc('host_assign_seat', { p_game: NET.gameId, p_club: club, p_target_user: h.user_id });
        if(error) throw error;
        const info=NET._seatInfo[h.user_id]||{};
        const nm=info.name||h.name||null, em=info.email||h.email||null;
        await sb.from('game_seats').update({ name:nm, email:em }).eq('game_id', NET.gameId).eq('club_id', club);
        NET._claimed[h.user_id]={ clubId:club, ready:false, name:nm, email:em };
        ok++;
      }catch(e){ console.error('drawClubs assign', h.user_id, e&&e.message); }
    }
    console.log('✓ Sorteio: '+ok+'/'+humans.length+' treinadores receberam clube distinto.');
    if(NET.refreshRoom) await NET.refreshRoom(); else netMergeParticipants();
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

/* CRONÔMETRO SOBERANO + LOCKSTEP: QUALQUER cliente pede pra reabrir a 'ready' da próxima rodada ao
   terminar sua partida. O servidor (reopen_ready) SÓ reabre quando NINGUÉM está mais ocupado — ou
   seja, quando TODOS terminaram a rodada (inclusive copa) e estão na tela do time. Assim ninguém
   avança de rodada antes dos outros. A reabertura deixa o timer DESARMADO (deadline null); ele só
   arma via arm_ready_timer, também quando todos estão livres — então o cronômetro começa junto. */
async function netReopenReady(){
  if(!sb || !NET.gameId || !NET.room || NET.room.phase!=='running') return;
  try{
    const { data, error } = await sb.rpc('reopen_ready', { p_game: NET.gameId });
    if(error) throw error;
    if(data==='ready' && NET.room){ NET.room.phase='ready'; NET.room.deadline=0; NET.room.paused=false; if(NET.onState) NET.onState(NET.room); }
  }catch(e){ console.warn('reopenReady:', e && e.message); }
}
/* arma os 60s da 'ready' — o servidor só arma quando ninguém está ocupado (todos na tela do time).
   Qualquer cliente chama enquanto está na 'ready' com o timer ainda desarmado. */
async function netArmReadyTimer(){
  if(!sb || !NET.gameId || !NET.room || NET.room.phase!=='ready') return;
  try{
    const { data, error } = await sb.rpc('arm_ready_timer', { p_game: NET.gameId });
    if(error) throw error;
    if(data==='armed' && NET.room && !NET.room.deadline){ NET.room.deadline=Date.now()+60000; if(NET.onState) NET.onState(NET.room); }
  }catch(e){ console.warn('armReadyTimer:', e && e.message); }
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

/* transição pra 'running' via RPC start_running: o SERVIDOR carimba o apito (kickoff_at) e congela
   o snapshot de escalações/táticas (kickoff_lineups) no MESMO update — é o que garante que todos os
   clientes simulem a rodada com inputs idênticos (Fase 1). Aguardamos o RPC (rápido) e aplicamos a
   fase localmente na volta; se o RPC falhar, cai no UPDATE cru antigo (sem snapshot, mas não trava). */
async function netToRunning(){
  if(!NET.isHost) return;
  if(NET.room.phase==='running') return; // evita disparo duplicado
  try {
    const { data, error } = await sb.rpc('start_running', { p_game: NET.gameId });
    if(error) throw error;
    if(data==='running' || data==='ready'){ /* ok (ou outro cliente virou antes) */ }
  } catch(e) {
    console.error('toRunning erro:', e);
    try { await sb.from('games').update({ phase:'running' }).eq('id', NET.gameId); } catch(e2){}
  }
  if(NET.room.phase!=='running'){ NET.room.phase='running'; if(NET.onState) NET.onState(NET.room); }
}
/* QUALQUER jogador pode pedir ao servidor pra iniciar a rodada quando o tempo zerou (ou todos
   prontos) — o servidor valida o deadline, então não depende do anfitrião estar com a aba ativa.
   Corrige o caso "cronômetro zerado mas a rodada não começa" quando o host está inativo. */
async function netAdvancePhaseExpired(){
  if(!sb || !NET.gameId || !NET.room || NET.room.phase!=='ready') return;
  try {
    const { data, error } = await sb.rpc('advance_phase_if_expired', { p_game: NET.gameId });
    if(error) throw error;
    if(data==='running' && NET.room && NET.room.phase!=='running'){ NET.room.phase='running'; if(NET.onState) NET.onState(NET.room); }
  } catch(e){ console.warn('advancePhaseExpired:', e && e.message); }
}

/* FASE 1: (re)carrega o carimbo do apito + snapshot congelado de escalações da rodada corrente.
   Usado como trava antes de simular (onlineRunRound): se a fase virou 'running' por um caminho que
   não trouxe o snapshot junto (ex.: retorno otimista de advance_phase_if_expired), busca do banco. */
async function netFetchKickoff(){
  if(!sb || !NET.gameId || !NET.room) return null;
  try{
    const { data: g } = await sb.from('games').select('kickoff_at,kickoff_lineups').eq('id', NET.gameId).single();
    if(g){
      NET.room.kickoffAt = g.kickoff_at ? new Date(g.kickoff_at).getTime() : 0;
      NET.room.kickoffLineups = g.kickoff_lineups || null;
    }
    return NET.room.kickoffLineups;
  }catch(e){ console.warn('fetchKickoff:', e&&e.message); return null; }
}

/* FASE 2: pede ao servidor os streams PRÉ-COMPUTADOS de todas as partidas de liga da rodada
   (edge function kickoff-round — o primeiro cliente a chamar dispara o cômputo, os demais recebem
   o payload já gravado em round_events). Retorna {"h-a":{hg,ag,scorers,events,perf,div}} ou null
   (sala sem estado ainda / rodada defasada / falha) — null = cliente simula localmente (fallback). */
async function netFetchRoundStreams(round){
  if(!sb || !NET.gameId) return null;
  try{
    const { data, error } = await sb.functions.invoke('kickoff-round', { body:{ gameId:NET.gameId, round } });
    if(error || !data || data.error || !data.ok || !data.matches) return null;
    if(data.round!==round) return null;
    return data.matches;
  }catch(e){ console.warn('fetchRoundStreams:', e&&e.message); return null; }
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
    // 3 fontes: (1) salas onde tenho ASSENTO (já reivindiquei clube), (2) salas que EU CRIEI
    // (anfitrião) — aparecem MESMO sem eu ter reivindicado clube ainda, pois create_game só cria
    // assentos CPU e o host não tem assento até escolher/sortear o time, (3) CONVITES pendentes.
    const [{ data: seatData, error: e1 }, { data: inviteData, error: e2 }, { data: hostData, error: e3 }] = await Promise.all([
      sb.from('game_seats').select('game_id, club_id, is_ready, games(name, phase, round, host_id)').eq('user_id', SB_AUTH_USER.id),
      sb.from('room_invites').select('game_id, games(name, phase, round, host_id)').eq('user_id', SB_AUTH_USER.id),
      sb.from('games').select('id, name, phase, round, host_id').eq('host_id', SB_AUTH_USER.id)
    ]);
    if(e1) throw e1;
    const byCode = new Map();
    // (1) assento reivindicado — tem prioridade (traz o clubId escolhido)
    (seatData||[]).filter(r=>r.games && r.games.phase!=='deleted').forEach(r=>{
      byCode.set(r.game_id, { code:r.game_id, name:r.games.name, phase:r.games.phase, round:r.games.round,
        isHost:r.games.host_id===SB_AUTH_USER.id, clubId:r.club_id, pending:false });
    });
    // (2) salas que eu criei (mesmo sem assento) — não sobrescreve um assento já mapeado
    (e3?[]:(hostData||[])).filter(g=>g.phase!=='deleted').forEach(g=>{
      if(byCode.has(g.id)) return;
      byCode.set(g.id, { code:g.id, name:g.name, phase:g.phase, round:g.round, isHost:true, clubId:null, pending:false });
    });
    // (3) convites pendentes — só se eu ainda não estiver na sala por outra via
    (e2?[]:(inviteData||[])).filter(r=>r.games && r.games.phase!=='deleted').forEach(r=>{
      if(byCode.has(r.game_id)) return;
      byCode.set(r.game_id, { code:r.game_id, name:r.games.name, phase:r.games.phase, round:r.games.round,
        isHost:false, clubId:null, pending:true });
    });
    return Array.from(byCode.values());
  } catch(e) { console.error('listMyRooms erro:', e); return []; }
}

/* ---- apagar/sair de uma sala ---- host marca a sala como 'deleted' (some pra todos, via a
   política de UPDATE do anfitrião); membro só larga o próprio assento (some da SUA lista). ---- */
async function netDeleteRoom(code, isHost){
  if(!sb || !SB_AUTH_USER || !code) return false;
  try {
    if(isHost){
      const { error } = await sb.from('games').update({ phase:'deleted' }).eq('id', code);
      if(error) throw error;
    } else {
      const { error } = await sb.from('game_seats').update({ user_id:null, is_cpu:true, is_ready:false })
        .eq('game_id', code).eq('user_id', SB_AUTH_USER.id);
      if(error) throw error;
    }
    return true;
  } catch(e) { console.error('deleteRoom erro:', e); return false; }
}

/* ---- convite por e-mail (Edge Function -> Resend) ---- */
async function netSendEmailInvite(toEmail){
  if(!sb || !SB_AUTH_USER) throw new Error('Não autenticado');
  const { data, error } = await sb.functions.invoke('send-invite-email', {
    body: { to: toEmail, hostName: NET.self.name, roomName: NET.room.name, inviteUrl: NET.inviteLink() }
  });
  if(error){
    // FunctionsHttpError esconde o corpo da resposta (só "non-2xx status") — extrai a mensagem
    // REAL do servidor (ex.: "RESEND_API_KEY ausente", domínio não verificado) pra mostrar ao host.
    let msg = (error && error.message) || 'Falha ao enviar o convite.';
    try{ if(error.context && typeof error.context.json==='function'){ const b=await error.context.json(); if(b && b.error) msg=b.error; } }catch(_){}
    throw new Error(msg);
  }
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
  // INSERT puro (NÃO upsert): a RLS bloqueia QUALQUER cláusula ON CONFLICT aqui — mesmo DO NOTHING —
  // porque o caminho de conflito exige a policy de SELECT/UPDATE sobre a linha, e a policy de leitura
  // (v3_invites_read_own: user_id = auth.uid()) impede o host de "enxergar" a linha do convidado.
  // Como reconvidar é idempotente, tratamos a violação de unicidade (23505) como "já convidado" (no-op).
  const { error } = await sb.from('room_invites').insert(
    { game_id: NET.gameId, user_id: targetUserId, invited_by: SB_AUTH_USER.id }
  );
  if(error && error.code !== '23505') { console.error('inviteInternal erro:', error); throw error; }
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
    // publica a RODADA AUTORITATIVA junto (games.round) — é o que os outros clientes usam pra
    // detectar que ficaram pra trás e recarregar o estado da sala (sincronização, itens 1 e 3).
    const authRound = (stateObj && stateObj.round!=null) ? stateObj.round : (stateObj && stateObj.S && stateObj.S.round);
    const { error } = await sb.from('games').update({ shared_state: stateObj, state_version: nextV, round: authRound }).eq('id', NET.gameId).eq('state_version', cur?.state_version||0);
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
      paused: p.new.paused, paused_remaining_ms: p.new.paused_remaining_ms, speedMult: parseFloat(p.new.speed_mult)||1,
      kickoffAt: p.new.kickoff_at?new Date(p.new.kickoff_at).getTime():0, kickoffLineups: p.new.kickoff_lineups||null
    });
    if(NET.onState) NET.onState(NET.room);
  });

  // '*' = INSERT + UPDATE + DELETE. INSERT é ESSENCIAL: quando um convidado aprovado entra no lobby
  // ele cria um assento NOVO (INSERT) — antes o listener só ouvia UPDATE, então a lista de treinadores
  // não atualizava até dar refresh. DELETE (assento removido) também some da lista na hora.
  SB_CH.on('postgres_changes', { event:'*', schema:SB_SCHEMA, table:'game_seats', filter:'game_id=eq.'+NET.gameId }, (p)=>{
    const row = p.new && Object.keys(p.new).length ? p.new : null;
    if(row){
      if(row.user_id){ NET._claimed[row.user_id] = { clubId:row.club_id, ready:row.is_ready, name:row.name, email:row.email, busy_until:row.busy_until, last_xi:row.last_xi, last_tactic:row.last_tactic, last_result:row.last_result, last_result_round:row.last_result_round, last_bids:row.last_bids, last_seen:row.last_seen }; }
      else { // assento LIBERADO (ex.: expulsão): remove o dono anterior do cache — senão o clube fica
             // "fantasma-ocupado" pros outros clientes (freeClubIds não oferece de volta) e o ex-dono
             // continua listado como participante.
        Object.keys(NET._claimed||{}).forEach(uid=>{ if(NET._claimed[uid] && NET._claimed[uid].clubId===row.club_id) delete NET._claimed[uid]; });
      }
    } else if(p.old && p.old.user_id){ // assento DELETADO -> tira o dono do cache
      delete NET._claimed[p.old.user_id];
    }
    netMergeParticipants();
  });

  SB_CH.on('postgres_changes', { event:'INSERT', schema:SB_SCHEMA, table:'messages', filter:'game_id=eq.'+NET.gameId }, (p)=>{
    if(!p.new) return;
    const msg = { id:p.new.user_id, name:p.new.user_name||'?', clubId:p.new.club_id, text:p.new.body, ts:new Date(p.new.created_at).getTime() };
    NET.room.chat = (NET.room.chat||[]).concat(msg).slice(-120);
    if(NET.onChat) NET.onChat(msg);
    if(NET.onState) NET.onState(NET.room);
  });

  // pedidos de entrada (join_requests): o anfitrião (membro, tem o canal) vê o painel de aprovação
  // ATUALIZAR SOZINHO quando chega um pedido novo ou muda uma decisão — sem depender de refresh manual.
  SB_CH.on('postgres_changes', { event:'*', schema:SB_SCHEMA, table:'join_requests', filter:'game_id=eq.'+NET.gameId }, ()=>{
    if(typeof NET.onJoinReq==='function') NET.onJoinReq(); // re-busca pendentes + re-renderiza o painel na hora
  });

  // expulsão pelo anfitrião: sinal em tempo real pra TODOS (inclusive o expulso), independente de DB/RLS
  SB_CH.on('broadcast', { event:'kick' }, ({ payload })=>{
    if(!payload || !payload.uid) return;
    const uid=payload.uid, clubId=payload.clubId;
    SB_KICKED[uid]=1;
    if(uid===(SB_AUTH_USER&&SB_AUTH_USER.id)){ netHandleKicked(); return; } // fui eu -> sair pro menu
    if(NET._claimed) delete NET._claimed[uid];
    if(typeof CL!=='undefined' && CL.humans && clubId) delete CL.humans[clubId]; // clube do expulso -> CPU
    netMergeParticipants();
    if(typeof cdraw==='function' && typeof CL!=='undefined' && CL.online && CL.screen!=='online') cdraw();
  });

  SB_CH.on('presence', { event:'sync' }, ()=>{ SB_ONLINE = SB_CH.presenceState(); netMergeParticipants(); });

  SB_CH.subscribe(async (st)=>{
    if(st==='SUBSCRIBED'){
      console.log('✓ Realtime conectado (elifoot_v3)');
      // track SÓ depois de SUBSCRIBED — track antes do join pode se perder; garante que este cliente
      // vira presença visível pros demais assim que o canal conecta (e re-afirma em reconexões).
      try{ await SB_CH.track({ name: NET.self.name, club: null }); }catch(e){ console.warn('presence track:', e&&e.message); }
      netMergeParticipants();
    }
  });
}
/* o track principal ocorre no callback SUBSCRIBED (netSetupRealtime); aqui só re-afirma se o canal
   já estiver conectado (chamada precoce logo após subscribe vira no-op, sem perder a presença). */
function netTrackPresence(){ try{ if(SB_CH && SB_CH.state==='joined') SB_CH.track({ name: NET.self.name, club: null }); }catch(e){} }
function netIsOnline(uid){ return !!(SB_ONLINE && SB_ONLINE[uid] && SB_ONLINE[uid].length); }

/* ============ APROVAÇÃO DE ENTRADA (pendente -> aprovado) ============
   Quem entra por CÓDIGO/LINK NÃO entra direto: cria um pedido 'pending' e espera o anfitrião
   aprovar. São PRÉ-APROVADOS (entram direto) quem: é o host, já tem assento (reconexão), foi
   convidado internamente (room_invites) ou já tem pedido 'approved'. A guarda no RPC claim_seat
   reforça isso no servidor (não dá pra reivindicar assento sem aprovação). */
let SB_JOINPOLL = null, SB_JOINCH = null;
function netClearJoinPoll(){ if(SB_JOINPOLL){ clearInterval(SB_JOINPOLL); SB_JOINPOLL=null; } if(SB_JOINCH){ try{ sb.removeChannel(SB_JOINCH); }catch(e){} SB_JOINCH=null; } }

/* pede pra entrar: decide entre entrar direto (pré-aprovado) ou criar pedido pendente.
   onDecision(status, roomName) é chamado pelo poll quando o host aprova/recusa. */
async function netRequestJoin(code, me, onDecision){
  if(!sb || !SB_AUTH_USER) throw new Error('Supabase não autenticado');
  const upcode = String(code||'').toUpperCase();
  const { data: gameData, error: e2 } = await sb.from('games').select('id,name,host_id,phase').eq('id', upcode).single();
  if(e2 || !gameData) throw new Error('Sala não encontrada');
  if(gameData.phase==='deleted') throw new Error('Esta sala foi encerrada.');
  const uid = SB_AUTH_USER.id;
  let preApproved = (gameData.host_id === uid);
  if(!preApproved){ const { data:seat } = await sb.from('game_seats').select('game_id').eq('game_id',upcode).eq('user_id',uid).maybeSingle(); if(seat) preApproved=true; }
  if(!preApproved){ const { data:inv } = await sb.from('room_invites').select('game_id').eq('game_id',upcode).eq('user_id',uid).maybeSingle(); if(inv) preApproved=true; }
  if(!preApproved){ const { data:jr } = await sb.from('join_requests').select('status').eq('game_id',upcode).eq('user_id',uid).maybeSingle(); if(jr && jr.status==='approved') preApproved=true; }
  if(preApproved){ await netJoinRoom(upcode, me); return { entered:true, name:gameData.name }; }
  // cria pedido pendente — INSERT puro (nunca upsert): ignora 23505 (pedido já existe = segue pendente)
  const { error: eIns } = await sb.from('join_requests').insert({ game_id:upcode, user_id:uid, name:(me&&me.name)||'', status:'pending' });
  if(eIns && eIns.code !== '23505'){
    // FALLBACK: se a migração de join_requests ainda não foi aplicada (tabela ausente), degrada pro
    // comportamento antigo (entra direto) pra não travar a Resenha. Ao rodar o SQL, a aprovação
    // passa a valer automaticamente, sem novo deploy.
    const msg = (eIns.message||'');
    const missingTable = eIns.code==='42P01' || eIns.code==='PGRST205' || eIns.code==='PGRST202'
      || (/join_requests/i.test(msg) && /(does not exist|schema cache|not find|could not find)/i.test(msg));
    if(missingTable){ console.warn('join_requests ausente — entrando direto (rode a migração p/ ativar a aprovação).'); await netJoinRoom(upcode, me); return { entered:true, name:gameData.name }; }
    console.error('requestJoin erro:', eIns); throw eIns;
  }
  NET.pendingCode = upcode; NET.pendingRoomName = gameData.name;
  netClearJoinPoll();
  const decide=(st)=>{ if(st==='approved'){ netClearJoinPoll(); if(onDecision) onDecision('approved', gameData.name); }
    else if(st==='rejected'){ netClearJoinPoll(); if(onDecision) onDecision('rejected', gameData.name); } };
  // REALTIME: escuta a PRÓPRIA linha de join_request -> aprovação/recusa INSTANTÂNEA (sem esperar o poll).
  try{
    SB_JOINCH = sb.channel('joinreq:'+upcode+':'+uid)
      .on('postgres_changes', { event:'UPDATE', schema:SB_SCHEMA, table:'join_requests', filter:'game_id=eq.'+upcode }, (p)=>{
        if(p && p.new && p.new.user_id===uid && p.new.status) decide(p.new.status);
      })
      .subscribe();
  }catch(e){ console.warn('join realtime:', e&&e.message); }
  // poll de 3s como REDE DE SEGURANÇA (se o realtime não entregar)
  SB_JOINPOLL = setInterval(async ()=>{
    try{ const st = await netJoinRequestStatus(upcode); if(st==='approved'||st==='rejected') decide(st); }catch(_){/* mantém tentando */}
  }, 3000);
  return { entered:false, name:gameData.name };
}
async function netJoinRequestStatus(code){
  if(!sb || !SB_AUTH_USER) return null;
  const { data } = await sb.from('join_requests').select('status').eq('game_id', String(code||'').toUpperCase()).eq('user_id', SB_AUTH_USER.id).maybeSingle();
  return data ? data.status : null;
}
async function netCancelJoinRequest(code){
  netClearJoinPoll();
  const c = String(code||NET.pendingCode||'').toUpperCase();
  NET.pendingCode=null; NET.pendingRoomName=null;
  if(!c || !sb || !SB_AUTH_USER) return;
  try{ await sb.from('join_requests').delete().eq('game_id', c).eq('user_id', SB_AUTH_USER.id); }catch(e){}
}
/* ---- lado do anfitrião: listar / aprovar / recusar pedidos pendentes ---- */
async function netListJoinRequests(){
  if(!sb || !NET.gameId) return [];
  try{
    const { data, error } = await sb.from('join_requests').select('user_id,name,created_at').eq('game_id', NET.gameId).eq('status','pending').order('created_at');
    if(error) throw error;
    return data||[];
  }catch(e){ console.error('listJoinRequests erro:', e); return []; }
}
async function netCountPendingJoins(){
  if(!sb || !NET.gameId || !NET.isHost) return 0;
  try{
    const { count } = await sb.from('join_requests').select('user_id', { count:'exact', head:true }).eq('game_id', NET.gameId).eq('status','pending');
    return count||0;
  }catch(e){ return 0; }
}
/* membros já APROVADOS (host lê todos os pedidos aprovados da sala dele). Sem o auto-sorteio na
   entrada, o convidado não tem assento no lobby — então garantimos que ele apareça na lista de
   participantes por aqui (além da presença), pra o host conseguir sortear/começar de forma confiável. */
async function netListApprovedMembers(){
  if(!sb || !NET.gameId) return [];
  try{
    const { data } = await sb.from('join_requests').select('user_id,name').eq('game_id', NET.gameId).eq('status','approved');
    return data||[];
  }catch(e){ return []; }
}
async function netDecideJoin(userId, status){
  if(!sb) throw new Error('sem conexão');
  if(!NET.isHost) throw new Error('só o anfitrião aprova');
  if(!NET.gameId || !userId) throw new Error('sala/usuário inválido');
  // tenta 2x (falha transitória de rede/token não pode deixar o pedido preso)
  let lastErr=null;
  for(let i=0;i<2;i++){
    try{
      const { data, error } = await sb.from('join_requests').update({ status, decided_at: new Date().toISOString() })
        .eq('game_id', NET.gameId).eq('user_id', userId).select('user_id');
      if(error) throw error;
      if(!data || !data.length) throw new Error('pedido não encontrado (RLS/host?)'); // update não pegou nenhuma linha
      return true;
    }catch(e){ lastErr=e; console.error('decideJoin tentativa '+(i+1)+':', e&&e.message); }
  }
  throw lastErr || new Error('falha ao decidir');
}
function netApproveJoin(userId){ return netDecideJoin(userId, 'approved'); }
function netRejectJoin(userId){ return netDecideJoin(userId, 'rejected'); }

/* ---- EXPULSÃO (anfitrião remove um jogador da Resenha, no lobby ou durante a partida) ----
   Sinal em tempo real via broadcast (chega em todos, inclusive o expulso, sem depender de RLS),
   MAIS liberação do assento no banco (clube volta a CPU; persiste e impede reentrada). */
/* Fase 2 (demissão/carreira): troca o clube do PRÓPRIO assento — clubId nulo = fico
   desempregado (clube antigo vira CPU); um id = assumo um clube livre. Chama a RPC
   set_my_seat_club (ver scripts/sql/set_my_seat_club.sql; aplicar no Supabase antes de usar). */
async function netSetMyClub(clubId){
  try{ const { error } = await sb.rpc('set_my_seat_club', { p_game: NET.gameId, p_club: clubId||null }); if(error) throw error; return {ok:true}; }
  catch(e){ return {ok:false, error:(e&&e.message)||String(e)}; }
}
/* CAIXA DE ENTRADA (e-mail): grava/lê o inbox no PRÓPRIO assento (coluna game_seats.inbox —
   ver scripts/sql/game_seats_inbox.sql). Falha silenciosa: se a coluna não existe ainda, o
   cliente segue só com localStorage. */
async function netSaveInbox(data){
  if(!NET.gameId || !SB_AUTH_USER) return;
  try{ await sb.from('game_seats').update({ inbox:data }).eq('game_id', NET.gameId).eq('user_id', SB_AUTH_USER.id); }catch(e){}
}
async function netLoadInbox(){
  if(!NET.gameId || !SB_AUTH_USER) return null;
  try{ const { data } = await sb.from('game_seats').select('inbox').eq('game_id', NET.gameId).eq('user_id', SB_AUTH_USER.id).maybeSingle(); return (data&&data.inbox)||null; }catch(e){ return null; }
}
async function netKick(uid, clubId){
  if(!NET.isHost || !uid || uid===(SB_AUTH_USER&&SB_AUTH_USER.id)) return;
  SB_KICKED[uid]=1;
  try{ if(SB_CH) await SB_CH.send({ type:'broadcast', event:'kick', payload:{ uid, clubId: clubId||null } }); }
  catch(e){ console.warn('kick broadcast:', e && e.message); }
  // libera o assento -> clube controlado pela CPU (o host tem permissão de update na sua sala).
  // Limpa também a escalação/ocupado do assento liberado (não é mais de ninguém).
  try{ await sb.from('game_seats').update({ user_id:null, is_ready:false, is_cpu:true, last_xi:null, last_tactic:null, busy_until:null }).eq('game_id', NET.gameId).eq('user_id', uid); }
  catch(e){ console.warn('kick seat:', e && e.message); }
  // remove convite/aprovação pra o expulso NÃO reentrar sozinho — pra voltar, precisa ser aprovado de novo
  try{ await sb.from('room_invites').delete().eq('game_id', NET.gameId).eq('user_id', uid); }catch(e){}
  try{ await sb.from('join_requests').delete().eq('game_id', NET.gameId).eq('user_id', uid); }catch(e){}
  // limpeza local imediata (host)
  if(NET._claimed) delete NET._claimed[uid];
  if(typeof CL!=='undefined' && CL.humans && clubId) delete CL.humans[clubId];
  netMergeParticipants();
}
/* o cliente EXPULSO recebe o broadcast e cai aqui: desconecta do canal e volta ao menu */
function netHandleKicked(){
  try{ if(SB_CH){ if(SB_CH.untrack) SB_CH.untrack(); sb.removeChannel(SB_CH); } }catch(e){}
  SB_CH=null; SB_ONLINE={};
  NET.room=null; NET.gameId=null; NET.isHost=false; NET.onState=null; NET.onChat=null;
  if(typeof CL!=='undefined'){ CL.online=false; CL.humans={}; }
  if(typeof toastC==='function') toastC('⚠ Você foi removido da sala pelo anfitrião.');
  if(typeof CL!=='undefined') CL.screen='abertura';
  if(typeof cdraw==='function') cdraw();
}

/* ---- expõe no NET (mesma API já usada pela UI clássica) ---- */
NET.createRoom = netCreateRoom;
NET.joinRoom = netJoinRoom;
NET.refreshRoom = netRefreshRoom;
NET.heartbeatBusy = netHeartbeatBusy;
NET.clearBusy = netClearBusy;
NET.heartbeatSeen = netHeartbeatSeen;
NET.publishLineup = netPublishLineup;
NET.publishResult = netPublishResult;
NET.resolveRound = netResolveRound;
NET.publishBudget = netPublishBudget;
NET.publishBids = netPublishBids;
NET.publishCupResult = netPublishCupResult;
NET.humanClubIds = netHumanClubIds;
NET.allHumanResultsIn = netAllHumanResultsIn;
NET.collectHumanResults = netCollectHumanResults;
NET.humanResultFor = netHumanResultFor;
NET.setMode = netSetMode;
NET.assignClub = netAssignClub;
NET.setMyClub = netSetMyClub;
NET.saveInbox = netSaveInbox;
NET.loadInbox = netLoadInbox;
NET.drawClubs = netDrawClubs;
NET.setReady = netSetReady;
NET.start = netStart;
NET.pause = netPause;
NET.setSpeed = netSetSpeed;
NET.toRunning = netToRunning;
NET.fetchKickoff = netFetchKickoff;
NET.fetchRoundStreams = netFetchRoundStreams;
NET.advancePhaseExpired = netAdvancePhaseExpired;
NET.reopenReady = netReopenReady;
NET.armReadyTimer = netArmReadyTimer;
NET.toLobby = netToLobby;
NET.kick = netKick;
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
NET.deleteRoom = netDeleteRoom;
NET.sendEmailInvite = netSendEmailInvite;
NET.searchUsers = netSearchUsers;
NET.inviteInternal = netInviteInternal;
NET.requestJoin = netRequestJoin;
NET.joinRequestStatus = netJoinRequestStatus;
NET.cancelJoinRequest = netCancelJoinRequest;
NET.clearJoinPoll = netClearJoinPoll;
NET.listJoinRequests = netListJoinRequests;
NET.listApprovedMembers = netListApprovedMembers;
NET.mergeParticipants = netMergeParticipants;
NET.countPendingJoins = netCountPendingJoins;
NET.approveJoin = netApproveJoin;
NET.rejectJoin = netRejectJoin;
NET.getDivisionClubs = netGetDivisionClubs;
NET.listSoloSaves = netListSoloSaves;
NET.loadSoloSave = netLoadSoloSave;
NET.saveSoloGame = netSaveSoloGame;
NET.deleteSoloSave = netDeleteSoloSave;
NET.useSupabase = true;

