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
        return;
      }
      // SB_AUTH_USER era gravado só no init e no login, e nunca mais mudava. Duas contas na MESMA
      // janela compartilham o localStorage: o segundo login sobrescreve a sessão do primeiro e o
      // servidor destrói a sessão antiga — mas a aba antiga continuava se achando logada, mandando
      // um token de sessão inexistente ("Session not found") em toda chamada. Manter em sincronia é
      // o que permite detectar isso (ver netInvokeFn) em vez de degradar calado.
      if(event==='SIGNED_OUT'){
        // SIGNED_OUT também dispara EM FALSO: com duas abas no mesmo domínio, a rotação do refresh
        // token faz a aba "perdedora" receber "Refresh Token Not Found" e emitir SIGNED_OUT — mesmo
        // com a sessão nova, válida, já gravada no localStorage pela aba irmã. E anular SB_AUTH_USER
        // aqui mesmo que por 1,5s derrubava o cliente inteiro: todo callback do realtime que lia a
        // identidade explodia (01/ago). Então NÃO anula nada agora — espera e CONFERE; sessão de pé
        // (rotação) -> segue o jogo; morta de verdade -> netHandleSessionLost desmonta e anula.
        setTimeout(async ()=>{
          if(await netRefreshAuth()) return;         // sessão válida no storage — era alarme falso
          SB_AUTH_USER = null;
          netHandleSessionLost();                     // morta de verdade (guard de CL.online lá dentro)
        }, 1500);
        return;
      }
      if(session && session.user){
        SB_AUTH_USER = session.user;
        /* trocou de conta -> o plano e outro. Redesenha quando chegar, para o
           cabecalho passar a mostrar o botao PRO sem esperar por um clique. */
        netCarregarPlano().then(()=>{
          try{ cdraw(); }catch(e){}
          /* QUEM VEIO PARA ASSINAR VOLTA AO PAGAMENTO. O botao do plano guarda a intencao
             antes de mandar criar a conta (ver rfPlanoCta); sem esta chamada a pessoa
             criava a conta e caia na tela do jogo, sem nunca ter chegado ao checkout. */
          try{ if(typeof rfPlanoIntencaoRetomar==='function') rfPlanoIntencaoRetomar(); }catch(e){}
        });
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
    if(SB_AUTH_USER) await netCarregarPlano();
    console.log('✓ Supabase pronto', SB_AUTH_USER ? '(sessão ativa: '+(SB_AUTH_USER.email||'?')+', plano '+SB_PLANO.plan+')' : '(sem sessão)');
    return true;
  } catch(e) { console.warn('⚠ Supabase init erro:', e.message); return false; }
}

/* ---- CHAMADA DE EDGE FUNCTION COM RETENTATIVA DE AUTENTICAÇÃO ----
   As functions de rodada (resolve-round/kickoff-round) sobem com verify_jwt, então o gateway
   exige um JWT válido. O token de acesso do usuário expira no meio de uma sala longa: o
   supabase-js renova sozinho, mas a chamada disparada no instante em que o token vence sai com
   o token velho e leva 401. Visto em produção (31/jul/2026): dois 401 em kickoff-round seguidos
   de um 200 no mesmo segundo — token vencido, renovação a caminho.
   Sem esta retentativa netFetchRoundStreams devolvia null e o cliente caía na simulação local,
   perdendo justamente o stream determinístico que a Fase 2 existe pra garantir. */
function netIsAuthError(error){
  const st = error && error.context && error.context.status;
  if(st===401 || st===403) return true;
  return /jwt|unauthor|not authorized|401/i.test((error && error.message) || '');
}
/* getSession() já renova o token vencido; refreshSession() é o plano B pra sessão ausente.
   TETO DE TEMPO obrigatório: o supabase-js serializa o acesso à sessão num lock compartilhado
   entre as abas do mesmo domínio, e com duas abas abertas essa espera pode não voltar. Isso roda
   no caminho crítico do fechamento da rodada (onlineHostCloseRound -> await NET.resolveRound):
   um await que nunca resolve deixa a sala inteira parada na pausa técnica, sem erro nenhum —
   foi exatamente o que aconteceu quando esta espera era feita ANTES de toda chamada. */
function netWithTimeout(p, ms, fallback){
  return Promise.race([ p, new Promise(r=>setTimeout(()=>r(fallback), ms)) ]);
}
/* teto na tentativa INTEIRA, não por etapa: getSession + refreshSession em série com um teto cada
   somariam o dobro em cima do fechamento da rodada. Aqui o orçamento é um só. */
function netRefreshAuth(){ return netWithTimeout(netRefreshAuthInner(), 3000, false); }
async function netRefreshAuthInner(){
  try{
    const { data } = await sb.auth.getSession();
    if(data && data.session) return netAdoptSession(data.session);
    const { data:r } = await sb.auth.refreshSession();
    if(r && r.session) return netAdoptSession(r.session);
  }catch(e){ console.warn('refreshAuth:', e&&e.message); }
  return false;
}
/* sessão recuperada do storage: se veio de OUTRA conta (login trocado em outra aba), esta aba
   NÃO pode seguir jogando com a identidade antiga — os assentos são por usuário, e escrever com
   o token da conta nova em nome da antiga corrompe a sala. Aí é sessão perdida de verdade. */
function netAdoptSession(session){
  if(typeof NET!=='undefined' && NET.uid && session.user && session.user.id!==NET.uid && typeof CL!=='undefined' && CL.online){
    console.warn('sessão no storage é de OUTRA conta ('+(session.user.email||session.user.id)+') — saindo da sala');
    SB_AUTH_USER = null;
    netHandleSessionLost();
    return false;
  }
  SB_AUTH_USER = session.user;
  return true;
}
/* Chama primeiro e só mexe em autenticação se o servidor RECUSAR. O caminho feliz — a esmagadora
   maioria — não paga nenhuma espera extra, e nada de auth entra na frente do fechamento da rodada. */
async function netInvokeFn(name, body){
  let res = await sb.functions.invoke(name, { body });
  if(res.error && netIsAuthError(res.error) && await netRefreshAuth()){
    res = await sb.functions.invoke(name, { body });
  }
  if(res.error && netIsAuthError(res.error)) netWarnDeadSession();
  return res;
}
/* Sessão morta não é um detalhe silencioso: sem ela a rodada da Resenha perde o stream
   determinístico do servidor e cada cliente simula por conta própria — os jogadores da sala
   começam a ver partidas diferentes. Avisa UMA vez (não a cada rodada) pra não virar spam.
   Aqui só AVISA, nunca desmonta a sala: um 401 isolado pode ser uma recusa passageira, e derrubar
   a sala por causa dele é muito pior que a degradação que o aviso denuncia — se for o ANFITRIÃO,
   a rodada nunca fecha e todo mundo fica parado na pausa técnica. Quem desmonta é o SIGNED_OUT
   (ver onAuthStateChange), que é sinal definitivo de que a sessão acabou. */
function netWarnDeadSession(){
  if(CL._deadSessionWarned) return;
  CL._deadSessionWarned = true;
  console.warn('Sessão do Supabase inválida — a rodada vai ser simulada localmente. Entre de novo pra voltar a sincronizar.');
  if(typeof toastC==='function') toastC('⚠ Sua sessão expirou — entre de novo pra sincronizar a Resenha');
}

/* retorna {loggedIn, email, name} pra UI decidir se mostra login/cadastro ou "continuar como X" */
/* PLANO DO TREINADOR (free/pro). Vem de elifoot_v3.user_plans pela funcao
   my_plan(), que ja resolve o prazo — `until` no passado deixa de ser PRO sem
   ninguem ter de rebaixar a conta a mao.

   FICA EM CACHE NUMA VARIAVEL porque netAuthStatus() e chamada em todo o
   desenho (o cabecalho pergunta a cada cdraw): uma consulta por redesenho
   seria absurdo. A cache e preenchida uma vez por sessao, ao ligar, e ao
   trocar de conta — ver netCarregarPlano. */
/* OS LIMITES VEM DO BANCO, NAO DAQUI. my_plan() devolve, alem do plano,
   quantos saves ele guarda, se abre sala, quantos treinadores cabem nela e se
   tem retrato por IA — os mesmos numeros que o servidor usa para RECUSAR
   (trigger em solo_saves, create_game, claim_seat). Escrever "3" ou "10" no
   navegador seria uma segunda lista de limites, e uma delas ficaria errada.

   PLANO_PADRAO e' o que vale sem sessao ou com o banco fora do ar: e' o plano
   de graca, mas com os limites em null — ver rfLimites(), que nesse caso NAO
   tranca nada. Trancar por falta de resposta seria trancar quem pagou. */
const PLANO_PADRAO = { plan:'free', pro:false, until:null,
  savesMax:null, podeHospedar:null, salaMax:null, avatarIA:null,
  podeResenha:null, resenhaAte:null, savesNoMes:null, savesRenovaEm:null };
let SB_PLANO = { ...PLANO_PADRAO };
async function netCarregarPlano(){
  SB_PLANO = { ...PLANO_PADRAO };
  if(!sb || !SB_AUTH_USER) return SB_PLANO;
  try{
    const { data, error } = await sb.rpc('my_plan');
    if(error) throw error;
    const r = Array.isArray(data) ? data[0] : data;
    if(r) SB_PLANO = { plan:r.plan||'free', pro:!!r.pro, until:r.until||null,
      /* saves_max null = sem teto (Embaixador). O `?? null` distingue isso de
         "o banco nao respondeu", que fica com o campo ausente. */
      /* CAMPO AUSENTE != CAMPO FALSO. Um banco ainda sem a migracao dos tres
         planos devolve my_plan() sem estas colunas; ler isso como "nao pode"
         trancaria toda a gente de uma vez. Ausente fica null = desconhecido, e
         rfLimites() nao tranca no desconhecido. */
      savesMax: ('saves_max' in r) ? r.saves_max : null,
      podeHospedar: ('pode_hospedar' in r) ? !!r.pode_hospedar : null,
      salaMax: ('sala_max' in r) ? (r.sala_max||0) : null,
      avatarIA: ('avatar_ia' in r) ? !!r.avatar_ia : null,
      podeResenha: ('pode_resenha' in r) ? !!r.pode_resenha : null,
      resenhaAte: ('resenha_ate' in r) ? (r.resenha_ate||null) : null,
      savesNoMes: ('saves_no_mes' in r) ? Number(r.saves_no_mes||0) : null,
      savesRenovaEm: ('saves_renova_em' in r) ? (r.saves_renova_em||null) : null };
  }catch(e){ console.warn('plano do treinador:', e && e.message); }
  return SB_PLANO;
}
function netAuthStatus(){
  if(!SB_AUTH_USER) return { loggedIn:false };
  return { loggedIn:true, email: SB_AUTH_USER.email,
    name: SB_AUTH_USER.user_metadata?.name || (SB_AUTH_USER.email||'').split('@')[0],
    plan: SB_PLANO.plan, pro: SB_PLANO.pro, proAte: SB_PLANO.until,
    savesMax: SB_PLANO.savesMax, podeHospedar: SB_PLANO.podeHospedar,
    salaMax: SB_PLANO.salaMax, avatarIA: SB_PLANO.avatarIA,
    podeResenha: SB_PLANO.podeResenha, resenhaAte: SB_PLANO.resenhaAte,
    savesNoMes: SB_PLANO.savesNoMes, savesRenovaEm: SB_PLANO.savesRenovaEm };
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
  await netAtribuirReferral();
  return SB_AUTH_USER;
}

/* Conta recém-criada veio pelo link de um parceiro? O código ficou guardado desde a
   visita (ver ads.js) e é gravado UMA vez — no banco a chave é o user_id, então
   reabrir outro link depois não rouba a indicação de quem trouxe a pessoa. */
async function netAtribuirReferral(){
  try{
    const cod = window.ADS && ADS.refGuardado && ADS.refGuardado();
    if(!cod || !sb || !SB_AUTH_USER) return;
    await sb.rpc('rf_ref_signup', { p_codigo: cod });
  }catch(e){ console.warn('referral:', e && e.message); }
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

/* ---- IDENTIDADE ESTÁVEL NA SALA ----
   SB_AUTH_USER é o objeto VIVO da sessão e fica null em qualquer soluço de auth (SIGNED_OUT
   espúrio de outra aba, rotação de refresh token, verificação em andamento). Amarrar a
   identidade do jogo nele derrubava tudo em cascata (31/jul-01/ago): setReady falhava com
   "Cannot read properties of null", o merge de participantes explodia DENTRO do callback do
   realtime (matando o processamento dos eventos seguintes) e o jogador ficava fora da rodada.
   NET.uid é congelado no create/join: é QUEM EU SOU nesta sala, independente do humor da
   sessão. SB_UID() prefere a sessão viva (cobre o caso raro de nunca ter entrado em sala) e
   cai pro congelado. Escrita com sessão morta ainda falha no servidor (RLS) — mas falha
   GRACIOSAMENTE, capturada, sem quebrar o cliente; a autocura do timer loop reidrata a sessão
   e a próxima tentativa passa. */
/* Caixa do MEU assento numa releitura do banco. Só eu escrevo essa coluna, então uma leitura que
   ainda não enxerga meu último update não é notícia nova — é eco velho. Enquanto o valor em voo
   não aparecer no banco, o cache mantém o que eu publiquei; quando os dois baterem, o guarda
   se apaga sozinho. */
function seatBudgetEmVoo(s){
  if(!s || !s.user_id || s.user_id!==SB_UID()) return s ? s.budget : null;
  const emVoo=(typeof NET!=='undefined') ? NET._budgetEmVoo : null;
  if(emVoo==null) return s.budget;
  if(Number(s.budget)===Number(emVoo)){ NET._budgetEmVoo=null; return s.budget; }  // banco alcançou
  return emVoo;
}
function SB_UID(){ return (SB_AUTH_USER && SB_AUTH_USER.id) || (typeof NET!=='undefined' && NET.uid) || null; }
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
  const isSeen=(uid,c)=> uid===SB_UID() || !!(SB_ONLINE && SB_ONLINE[uid] && (SB_ONLINE[uid][0]))
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
  if(!seen[SB_UID()] && !claimed[SB_UID()]){
    list.push({ id:SB_UID(), name:NET.self.name, email:NET.self.email, confirmed:true, clubId:null, ready:false, host:NET.isHost, online:true, busy:false });
  }
  NET.room.participants = list;
  // PONTE de escalação: joga a última escalação/tática sincronizada de cada OUTRO humano em
  // S.clubXI[clube]/S.clubTactic[clube] — é o que availableXI/tacticForClub leem pra simular o clube
  // dele com a escalação REAL dele (não autoXI) quando ele está ausente/não joga ao vivo. Pulamos o
  // MEU clube (mando localmente a minha escalação; o synced pode estar defasado do que acabei de mudar).
  if(typeof S!=='undefined' && S && S.squads){
    S.clubXI=S.clubXI||{}; S.clubTactic=S.clubTactic||{};
    Object.keys(claimed).forEach(uid=>{ if(uid===SB_UID()) return; const c=claimed[uid];
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
  // MODO TESTE (TESTING_FREE_DIVISION_PICK, ui/main.js): CL.testStartDiv.brasil, quando escolhido
  // em scSalaHost, sobrescreve a divisão inicial só desta sala — sem escolha, cai no 'D' de sempre.
  // PATCH DE DADOS DO ANFITRIÃO — antes de ler os clubes. O pool vira os assentos da sala e,
  // logo depois, os elencos gravados em shared_state; aplicar depois disso não mudaria nada.
  if(CL.packId && window.RF_PACKS){
    try{ await RF_PACKS.usarPacote(CL.packId); }
    catch(e){ console.warn('patch de dados da sala:', e && e.message); }
  }
  const testDiv = (typeof TESTING_FREE_DIVISION_PICK!=='undefined' && TESTING_FREE_DIVISION_PICK && CL.testStartDiv && CL.testStartDiv.brasil) || undefined;
  /* ===== O SORTEIO É DE UM PAÍS SÓ =====
     Sala com vários países NÃO quer dizer um treinador no Flamengo e outro no Manchester: quer
     dizer que aquelas ligas existem por inteiro no mundo desta sala — simuladas, assistíveis,
     com mercado e calendário próprios. Todos começam JUNTOS no mesmo país; sair para outro é uma
     decisão de carreira, por convite (ver resenhaOfferClubs / applyManagerJobChange).

     Por isso o pool do sorteio é o do país INICIAL, e só dele. Misturar aqui separaria a sala
     logo no primeiro dia, que é o contrário do que a Resenha é.

     E é também o desenho mais barato: no arranque só um país tem humano, logo só um precisa de
     elencos completos (~1 MB no shared_state, medido). Um país ganha elencos quando um humano vai
     treinar lá — o custo acompanha o uso, em vez de vir todo de uma vez. */
  const paisInicial = (CL.net && CL.net.paisInicial) || 'brasil';
  const divInicial = (paisInicial==='brasil') ? testDiv
    : ((typeof UNI_CONFIGS!=='undefined' && UNI_CONFIGS[paisInicial] && UNI_CONFIGS[paisInicial].order)
        ? UNI_CONFIGS[paisInicial].order[UNI_CONFIGS[paisInicial].order.length-1] : undefined);
  let poolClubs = (typeof clubesDoUniverso==='function') ? clubesDoUniverso(paisInicial, divInicial) : [];
  if(!poolClubs || !poolClubs.length){
    poolClubs = (typeof resenhaStartClubs==='function' && resenhaStartClubs(testDiv).length) ? resenhaStartClubs(testDiv)
      : ((typeof DATA!=='undefined' && DATA.clubsSerieA && DATA.clubsSerieA.length) ? DATA.clubsSerieA : DATA.clubs);
  }
  const clubIds = poolClubs.map(c=>c.id);
  const { data: code, error } = await sb.rpc('create_game', { p_name:name, p_club_ids:clubIds, p_mode: CL.net.mode||'sorteio' });
  if(error) throw error;
  NET.code = code; NET.gameId = code; NET.isHost = true;
  NET.uid = SB_AUTH_USER.id; // identidade congelada da sala (ver SB_UID)
  NET.self = { id: NET.uid, name: (host&&host.name) || netAuthStatus().name, email: (host&&host.email)||SB_AUTH_USER.email };
  NET._claimed = {};
  // LÊ o seed real gerado por create_game — sem isso o host ficava com seed:0 e montava uma
  // competição DIFERENTE da do convidado (que lê games.seed no join) -> "dois jogos em paralelo".
  let createdSeed=0; try{ const { data: g } = await sb.from('games').select('seed').eq('id', code).single(); createdSeed = g && g.seed; }catch(e){}
  NET.room = { code, gameId: code, name, hostId: SB_UID(), mode: CL.net.mode||'sorteio', phase:'lobby',
    participants: [], seed:createdSeed, round:0, deadline:0, paused:false,
    speedMult:(typeof TEMPO_MULT!=='undefined' && TEMPO_MULT[TEMPO_DEFAULT]) || 1, chat:[],
    kickoffAt:0, kickoffLineups:null };
  // PADRÃO DA SALA: grava o ritmo no banco já na criação. games.speed_mult nasce em 1 (= 'Usain
  // Bolt', ~3,5s de rodada) e o convidado lê o banco — sem gravar aqui, cada sala nova nasceria
  // rápida demais e com o Modo Camarote trancado. O anfitrião troca quando quiser em Opções.
  if(NET.room.speedMult !== 1){
    try{ await sb.from('games').update({ speed_mult: NET.room.speedMult }).eq('id', code); }
    catch(e){ console.warn('padrão de ritmo da sala:', e && e.message); }
  }
  // a sala guarda COM QUE PATCH nasceu: o elenco já vai em shared_state, mas nome, cor e
  // escudo o convidado desenha do catálogo dele — sem isto, anfitrião e convidado veriam
  // clubes com nomes diferentes na mesma sala
  if(CL.packId){
    try{ await sb.from('games').update({ pack_id: CL.packId }).eq('id', code); }
    catch(e){ console.warn('patch da sala:', e && e.message); }
  }
  netSetupRealtime(); netTrackPresence(); netMergeParticipants();
  return code;
}

async function netJoinRoom(code, me){
  if(!sb || !SB_AUTH_USER) throw new Error('Supabase não autenticado');
  const upcode = String(code||'').toUpperCase();
  const { data: gameData, error: e2 } = await sb.from('games').select('*').eq('id', upcode).single();
  if(e2) throw new Error('Sala não encontrada');
  NET.uid = SB_AUTH_USER.id; // identidade congelada da sala (ver SB_UID)
  NET.code = gameData.id; NET.gameId = gameData.id; NET.isHost = (gameData.host_id === NET.uid);
  NET.self = { id: NET.uid, name: (me&&me.name) || netAuthStatus().name, email: (me&&me.email)||SB_AUTH_USER.email };
  // patch com que a sala foi criada — o convidado aplica só para VER o mesmo que o
  // anfitrião (os elencos já chegam prontos pelo shared_state)
  if(gameData.pack_id && window.RF_PACKS){
    try{ await RF_PACKS.usarPacote(gameData.pack_id); CL.packId = gameData.pack_id; }
    catch(e){ console.warn('patch da sala:', e && e.message); }
  }
  const { data: seatsData } = await sb.from('game_seats').select('*').eq('game_id', gameData.id);
  const { data: msgs } = await sb.from('messages').select('*').eq('game_id', gameData.id).order('created_at').limit(100);
  NET._claimed = {};
  // budget/stadium entram aqui porque o ASSENTO é a autoridade do caixa de um humano (o servidor
  // nunca mexe nele — ver 'caixa de humano é do assento' no resolve-round). Sem ler a coluna, o
  // cliente só conhecia o valor que ELE MESMO publicou nesta sessão, e depois de um reload
  // sobrava o número do mundo, que é sempre mais velho. Ver applyViewerDivision.
  (seatsData||[]).forEach(s=>{ if(s.user_id) NET._claimed[s.user_id] = { clubId:s.club_id, ready:s.is_ready, name:s.name, email:s.email, busy_until:s.busy_until, last_xi:s.last_xi, last_tactic:s.last_tactic, last_result:s.last_result, last_result_round:s.last_result_round, last_bids:s.last_bids, last_seen:s.last_seen, budget:seatBudgetEmVoo(s), stadium:s.stadium, last_cup_result:s.last_cup_result, last_cup_round:s.last_cup_round, day_ack:s.day_ack }; });
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
      kickoffAt: g.kickoff_at?new Date(g.kickoff_at).getTime():0, kickoffLineups: g.kickoff_lineups||null,
      // VERSÃO DO ESTADO COMPARTILHADO. É o único sinal honesto de "meu mundo está velho": a rodada
      // pode coincidir e o conteúdo divergir (publicação perdida, adoção parcial, fallback antigo).
      // Toda resolução do servidor incrementa isto, então comparar com a versão que EU adotei
      // detecta a defasagem que a comparação por rodada não vê. Ver onlineReconcileIfBehind.
      stateVersion: g.state_version||0
    });
    /* O DIA DA SALA, direto do servidor. É daqui que as telas passam a sair: enquanto cada
       cliente deduzia a competição do próprio estado local, dois humanos podiam estar "certos" e
       ainda assim em competições diferentes. Agora a resposta é uma linha só.
       O PLANO PODE TROCAR: na virada de temporada ele é refeito (ver netSeedDayPlan(force)). O
       cache aqui só era preenchido quando estava VAZIO — então o cliente seguia com o calendário
       da temporada velha, o ponteiro do servidor apontava pra rodada 37 e o meu S.round já era 0:
       o desacordo nunca se resolvia e a sala ficava em "acertando a rodada" pra sempre. */
    if(g.day_plan && (!NET.room.dayPlan || NET.room.dayPlan.length!==g.day_plan.length
        || JSON.stringify(NET.room.dayPlan[0]||null)!==JSON.stringify(g.day_plan[0]||null))){
      NET.room.dayPlan = g.day_plan;
    }
    if(NET.room.dayPlan){
      const e = NET.room.dayPlan[g.day_idx||0] || null;
      NET.room.day = e ? { idx:g.day_idx||0, moment:g.day_moment||'escalando',
                           round:e.r, comp:e.comp, cupIdx:e.idx, dia:e.dia,
                           total:NET.room.dayPlan.length } : null;
    }
    const { data: seats } = await sb.from('game_seats').select('*').eq('game_id', NET.gameId);
    NET._claimed = NET._claimed || {};
    (seats||[]).forEach(s=>{ if(s.user_id) NET._claimed[s.user_id] = { clubId:s.club_id, ready:s.is_ready, name:s.name, email:s.email, busy_until:s.busy_until, last_xi:s.last_xi, last_tactic:s.last_tactic, last_result:s.last_result, last_result_round:s.last_result_round, last_bids:s.last_bids, last_seen:s.last_seen, budget:seatBudgetEmVoo(s), stadium:s.stadium, last_cup_result:s.last_cup_result, last_cup_round:s.last_cup_round, day_ack:s.day_ack }; });
    netMergeParticipants(); // -> NET.onState (transição lobby->jogo + reconcile de rodada)
    return NET.room;
  }catch(e){ console.warn('refreshRoom:', e&&e.message); return null; }
}

/* ---- HEARTBEAT DE ATIVIDADE (barreira de sincronização) ----
   Enquanto EU estou numa partida ao vivo (liga ou copa), marco meu assento como "ocupado"
   (busy_until no futuro). O RPC advance_phase_if_expired NÃO avança a rodada enquanto houver
   qualquer humano ocupado — assim ninguém pula a rodada enquanto o outro joga liga/copa. Se eu
   cair no meio (parar de bater o heartbeat), o busy_until expira em ~90s e a rodada segue. ---- */
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
  const cur=NET._claimed && NET._claimed[SB_UID()];
  if(myName && (!cur || !cur.name || cur.name==='(sem nome)')){ upd.name=myName; upd.email=(NET.self&&NET.self.email)||SB_AUTH_USER.email; if(cur){ cur.name=myName; cur.email=upd.email; } }
  if(cur) cur.last_seen=now; // reflete já localmente
  try{ await sb.from('game_seats').update(upd).eq('game_id', NET.gameId).eq('user_id', SB_UID()); }catch(e){}
}
/* PUBLICA a última escalação/tática do MEU clube no meu assento — os outros clientes leem isso
   (via game_seats -> _claimed -> S.clubXI) pra simular o MEU clube com a MINHA escalação real quando
   eu estou ausente/não jogo ao vivo. Sem isso, cada cliente simulava com autoXI e os resultados
   divergiam. jsonb aceita o array de S.xi — que são PIDS desde julho/2026, não nomes. */
async function netPublishLineup(xi, tactic){
  if(!sb || !NET.gameId || !SB_AUTH_USER) return;
  try{ await sb.from('game_seats').update({ last_xi:(xi&&xi.length)?xi:null, last_tactic:tactic||null }).eq('game_id', NET.gameId).eq('user_id', SB_UID()); }catch(e){}
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
  // training: quem EU pus em treino especial. Na Resenha quem evolui os jogadores é o servidor
  // (advanceDevelopment no resolve-round), e ele lê p._training — um flag que vive no OBJETO do
  // jogador, dentro de S.squads, que é justamente o que o adopt substitui pelo estado autoritativo.
  // Resultado: o cone aparecia no elenco e o treino não fazia absolutamente nada na Resenha. A
  // lista de pids viaja por aqui (mesmo canal das transferências) e o servidor remarca o flag
  // antes de evoluir. Fonte única: S.trainingByClub (o que o menu de Treino especial escreve).
  const _trn = (typeof S!=='undefined' && S && S.trainingByClub && S.clubId!=null)
    ? (S.trainingByClub[S.clubId]||[]) : [];
  // SEMENTE DAS LIGAS DE FUNDO (item 4): sala de antes do pacote existir. O estado adotado não
  // tem S.bgLeagues — este cliente monta o pacote de todos os países (bgInitCountry) e manda
  // UMA vez; o servidor só adota quando ainda não há (ver o seat loop no resolve-round).
  let _bgSeed=null;
  try{
    if(typeof S!=='undefined' && S && !S.bgLeagues && typeof bgLeagueCountries==='function' && typeof bgInitCountry==='function'){
      _bgSeed={};
      bgLeagueCountries().forEach(co=>{ const L=bgInitCountry(co); if(L) _bgSeed[co]=L; });
      if(!Object.keys(_bgSeed).length) _bgSeed=null;
    }
  }catch(e){ _bgSeed=null; }
  const payload = { round, h:result.h, a:result.a, hg:result.hg, ag:result.ag,
    ...( _bgSeed ? { bgSeed:_bgSeed } : {} ),
    scorers:result.scorers||[], perf:result.perf||null, events:result.events||[],
    decisions:result.decisions||[], // Fase 3A: log de decisões da partida (pênalti/lesão/expulsão/substituição)
    // caps = súmula de minutos em campo dos dois lados. Só o CLIENTE sabe disso numa partida
    // humana (é ele que roda a sessão ao vivo, com as substituições); sem mandar, o servidor
    // recalcularia nota/energia/moral pelo onze submetido no apito e ignoraria quem entrou ou
    // saiu no meio do jogo. Ver ratePlayersS/rateAppearances.
    /* com que motor este placar foi simulado — o servidor descarta o que vier de
       versão diferente da dele em vez de misturar dois jogos no mesmo campeonato */
    motorVer:(typeof RF_MOTOR_VER!=='undefined')?RF_MOTOR_VER:null,
    caps:result.caps||null, matchMinutes:result.matchMinutes||null,
    transfers:_tr, morale:_mo, offers:_of, counters:_ct, offerDrops:_dr, training:_trn };
  try{
    if(NET._claimed && NET._claimed[SB_UID()]){ NET._claimed[SB_UID()].last_result=payload; NET._claimed[SB_UID()].last_result_round=round; }
    await sb.from('game_seats').update({ last_result:payload, last_result_round:round }).eq('game_id', NET.gameId).eq('user_id', SB_UID());
  }catch(e){ console.warn('publishResult:', e&&e.message); }
}
/* F3.5 CUTOVER: pede ao servidor pra RESOLVER a rodada (edge function resolve-round) — o servidor
   é o único produtor do shared_state (liga + outras divisões + copas + virada de temporada). Idempotente
   por state_version: se outro já resolveu, devolve {already:true}. Retorna {ok, round, version} ou {error}.
   `round` = a rodada que ESPERO resolver (S.round atual), pra o servidor não resolver a errada. */
async function netResolveRound(round, stage){
  if(!sb || !NET.gameId) return { error:'sem sala' };
  try{
    // stage 'cup' fecha SÓ a quarta-feira (avança as copas da semana e para); sem stage, o servidor
    // resolve o sábado — a rodada completa, como sempre foi. Ver resolve-round/index.ts.
    const { data, error } = await netInvokeFn('resolve-round', { gameId:NET.gameId, round, stage:stage||undefined });
    if(error) return { error: (error&&error.message)||'erro na edge function' };
    return data||{};
  }catch(e){ return { error: (e&&e.message)||'falha ao chamar resolve-round' }; }
}
/* publica o resultado de uma partida de COPA (mata-mata) jogada ao vivo pelo humano —
   análogo a netPublishResult, mas grava em last_cup_result/last_cup_round. O servidor
   (resolve-round) aplica esse resultado na chave (mandante-autoritativo) antes de simular
   o resto do bracket. Só copas de mata-mata (Copa do Brasil); grupos são Série A -> futuro. */
/* competições que EU já cumpri nesta rodada (acumula; zera quando a rodada muda) */
function cupDoneList(round, addKey){
  const me=(NET._claimed&&NET._claimed[SB_UID()])||{};
  const prev=(me.last_cup_round===round && me.last_cup_result && Array.isArray(me.last_cup_result.done)) ? me.last_cup_result.done.slice() : [];
  if(addKey && prev.indexOf(addKey)<0) prev.push(addKey);
  return prev;
}
/* TODOS OS RESULTADOS DE COPA DESTA RODADA, UM POR COMPETIÇÃO.
   O BUG MEDIDO EM PRODUÇÃO: `last_cup_result` é UMA coluna, e o calendário oficial põe
   Libertadores, Sul-Americana e Copa do Brasil na MESMA rodada. Publicar a segunda partida
   APAGAVA a primeira. Consequências, todas relatadas:
     - o servidor não encontrava mais o resultado da Copa do Brasil e RE-SIMULAVA a partida que o
       humano tinha acabado de ganhar ao vivo -> ele era eliminado com outro placar;
     - netHumanCupResultFor devolvia null pros OUTROS clientes, que caíam na simulação -> cada um
       via um placar diferente do dono do clube;
     - sem o resultado, o título e a cota da fase não eram creditados.
   O `done` (acima) já tinha resolvido o lado da BARREIRA ("que competições eu cumpri"), mas não o
   lado do RESULTADO. `results` guarda uma entrada por competição dentro do mesmo JSONB — aditivo,
   um servidor antigo simplesmente ignora a chave que não conhece. */
function cupResultsList(round, entry){
  const me=(NET._claimed&&NET._claimed[SB_UID()])||{};
  const anterior=(me.last_cup_round===round && me.last_cup_result) || null;
  let prev=(anterior && Array.isArray(anterior.results)) ? anterior.results.slice() : [];
  // payload gravado por uma versão anterior (só um resultado, no topo): entra na lista pra não sumir
  if(!prev.length && anterior && anterior.h && anterior.a){
    const {results:_r, done:_d, ...solto}=anterior; prev=[solto];
  }
  if(!entry) return prev;
  // mesma competição + mesmo confronto = republicação (ex.: prorrogação): substitui, não duplica
  const i=prev.findIndex(r=>String(r.key||'')===String(entry.key||'') && String(r.h)===String(entry.h) && String(r.a)===String(entry.a));
  if(i>=0) prev[i]=entry; else prev.push(entry);
  return prev;
}
/* acha o resultado de UM confronto de UMA competição dentro do payload do assento */
function cupEntryIn(payload, h, a, cupKey){
  if(!payload) return null;
  const bate=r=>r && String(r.h)===String(h) && String(r.a)===String(a);
  const lista=Array.isArray(payload.results)?payload.results:null;
  if(lista) return lista.find(r=>bate(r) && (!cupKey || !r.key || String(r.key)===String(cupKey))) || null;
  // compat: payload antigo tinha um resultado só e não dizia de qual competição era. Se ele
  // declara a competição e é outra, recusa; sem declaração, o confronto é tudo que dá pra conferir.
  if(!bate(payload)) return null;
  if(cupKey && payload.key && String(payload.key)!==String(cupKey)) return null;
  return payload;
}
async function netPublishCupResult(round, cupResult){
  // `winner` só existe no mata-mata; confronto de FASE DE GRUPOS (stage:'group') não tem — sem
  // esta exceção o resultado de grupo era descartado aqui e o servidor re-simulava a partida que
  // o humano acabou de jogar ao vivo.
  if(!sb || !NET.gameId || !SB_AUTH_USER || !cupResult || !cupResult.h || !cupResult.a) return;
  if(!cupResult.winner && cupResult.stage!=='group') return;
  const payload = { key:cupResult.key||null, // QUAL competição — ver cupResultsList abaixo
    stage:cupResult.stage||'bracket', h:cupResult.h, a:cupResult.a, hg:cupResult.hg, ag:cupResult.ag,
    winner:cupResult.winner||null, pens:cupResult.pens||null, events:cupResult.events||[],
    scorers:cupResult.scorers||[], perf:cupResult.perf||null, // artilharia + Historial no servidor (cupSumula)
    caps:cupResult.caps||null, matchMinutes:cupResult.matchMinutes||null, // súmula de minutos em campo (ver liveCaps)
    decisions:cupResult.decisions||[] }; // Fase 3A: log de decisões
  // LISTA DE COMPETIÇÕES CUMPRIDAS NESTA RODADA. last_cup_round é UMA coluna por rodada e não diz
  // QUAL competição foi paga — com o calendário oficial a 3ª rodada tem Libertadores,
  // Sul-Americana e Copa do Brasil, então terminar a primeira marcava a rodada inteira como paga
  // e a barreira soltava com o jogador ainda em campo na Copa do Brasil. O campo `done` (dentro do
  // JSONB que já existe, aditivo — o servidor ignora chave que não conhece) carrega a lista.
  payload.done = cupDoneList(round, cupResult.key||null);
  // uma entrada por competição (ver cupResultsList) — lê o payload ANTERIOR, então tem que vir
  // antes de sobrescrever _claimed logo abaixo. A entrada não carrega `done`/`results` (só o jogo).
  const { done:_omitDone, ...entradaDoJogo } = payload;
  payload.results = cupResultsList(round, entradaDoJogo);
  try{
    if(NET._claimed && NET._claimed[SB_UID()]){ NET._claimed[SB_UID()].last_cup_result=payload; NET._claimed[SB_UID()].last_cup_round=round; }
    await sb.from('game_seats').update({ last_cup_result:payload, last_cup_round:round }).eq('game_id', NET.gameId).eq('user_id', SB_UID());
  }catch(e){ console.warn('publishCupResult:', e&&e.message); }
}
/* QUITA A OBRIGAÇÃO DE COPA DA RODADA SEM RESULTADO NENHUM.
   A barreira do dia de copa (onlineCupDayPending) pergunta "este assento ainda deve a partida de
   copa desta rodada?" e cruza duas fontes: (A) o mundo compartilhado diz que o clube tem
   confronto sem vencedor, e (B) game_seats.last_cup_round diz se ele já publicou. Só que (B) era
   escrito num lugar só — netPublishCupResult, no fim de uma partida jogada AO VIVO até o fim.
   Todo caminho em que o confronto se resolve sem isso deixava a dívida pendurada até o teto de
   90s: humano ausente simulado pelo servidor, confronto resolvido pelo cliente de outro humano
   (resolveCupRoundRest), transmissão perdida, ou confronto sem vencedor (que faz o publish sair
   antes de escrever). Agora o próprio devedor pode dizer "não devo mais", por qualquer motivo.
   DUAS PROTEÇÕES: nunca sobrescreve um resultado já publicado nesta rodada (sai cedo), e zera
   last_cup_result junto — sem isso o resolve-round veria last_cup_round==round com um resultado
   VELHO no assento e aplicaria o placar da rodada passada nesta. */
async function netMarkCupDone(round){
  if(!sb || !NET.gameId || !SB_AUTH_USER) return;
  const me = NET._claimed && NET._claimed[SB_UID()];
  if(me && me.last_cup_round===round) return;      // já publiquei o resultado desta rodada
  try{
    const payload={ done: cupDoneList(round, null), settled:true };   // sem placar, só a quitação
    if(me){ me.last_cup_round=round; me.last_cup_result=payload; }
    await sb.from('game_seats').update({ last_cup_round:round, last_cup_result:payload })
      .eq('game_id', NET.gameId).eq('user_id', SB_UID());
  }catch(e){ console.warn('markCupDone:', e&&e.message); }
}
/* F3.3: publica o caixa do PRÓPRIO clube no assento -> o servidor (resolve-round) lê pra montar
   S.budgets do mundo, e os reconciles voltam o valor certo (senão o caixa do humano resetava pro
   valor inicial do shared_state a cada rodada). Chamado após aplicar as finanças da rodada / mercado. */
async function netPublishBudget(budget){
  if(!sb || !NET.gameId || !SB_AUTH_USER || budget==null || !isFinite(budget)) return;
  const b=Math.round(budget);
  try{
    if(NET._claimed && NET._claimed[SB_UID()]) NET._claimed[SB_UID()].budget=b;
    // marca o valor em voo: um refresh que caia entre este update e a leitura seguinte traria o
    // número ANTERIOR do banco e rebobinaria o caixa pela porta dos fundos (ver seatBudgetEmVoo).
    NET._budgetEmVoo=b;
    await sb.from('game_seats').update({ budget:b }).eq('game_id', NET.gameId).eq('user_id', SB_UID());
  }catch(e){ NET._budgetEmVoo=null; console.warn('publishBudget:', e&&e.message); }
}
/* cópia fiel de netPublishBudget acima, pro estádio do PRÓPRIO clube (game_seats.stadium) — o
   servidor (resolve-round) lê pra montar S.clubStadiumCap do mundo, exatamente como já faz com
   budget. Chamado de commitStadium() (core.js) após clBuildStand() gravar localmente. */
async function netPublishStadium(stadium){
  if(!sb || !NET.gameId || !SB_AUTH_USER || !stadium) return;
  try{
    if(NET._claimed && NET._claimed[SB_UID()]) NET._claimed[SB_UID()].stadium=stadium;
    await sb.from('game_seats').update({ stadium }).eq('game_id', NET.gameId).eq('user_id', SB_UID());
  }catch(e){ console.warn('publishStadium:', e&&e.message); }
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
    const mine=(NET._claimed && NET._claimed[SB_UID()]) || null;
    const bids=(mine && mine.last_bids) ? {...mine.last_bids} : {};
    bids[lotId]={amount, ts};
    if(mine) mine.last_bids=bids;
    await sb.from('game_seats').update({ last_bids:bids }).eq('game_id', NET.gameId).eq('user_id', SB_UID());
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
/* algum assento SEM resultado desta rodada pertence a alguém PRESENTE (heartbeat de presença
   fresco)? Distingue "caiu" (simula como ausente, 3s) de "está aqui, só não jogou ainda" —
   caso das telas pós-copa — que ganha carência de verdade (ver onlineHostCloseRound). */
function netAnyMissingResultOnline(round){
  const cl=NET._claimed||{}; const now=Date.now();
  for(const uid in cl){ const c=cl[uid]; if(!(c&&c.clubId)) continue;
    if(c.last_result && c.last_result_round===round) continue;
    if(c.last_seen && (now-new Date(c.last_seen).getTime())<45000) return true; }
  return false;
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
/* FASE 3C: resultado de COPA já publicado por um humano pra este confronto+rodada (mandante-
   autoritativo, igual netHumanResultFor da liga) — usado antes de abrir uma partida de copa ao
   vivo: se o outro lado JÁ jogou e publicou (ex.: eu estava ausente e cliquei depois), reproduzo
   o jogo oficial em vez de esperar um stream que não vai mais chegar. */
/* `cupKey` diz QUAL competição — sem ele, dois confrontos do mesmo par de clubes na mesma rodada
   (Copa do Brasil e Sul-Americana caem juntas no calendário oficial) se confundiam e o placar de
   uma aparecia na outra. Ver cupResultsList. */
function netHumanCupResultFor(h, a, round, cupKey){
  const cl=NET._claimed||{}; let homeR=null, awayR=null;
  for(const uid in cl){ const c=cl[uid];
    if(!c || c.last_cup_round!==round) continue;
    const r=cupEntryIn(c.last_cup_result, h, a, cupKey); if(!r) continue;
    if(String(c.clubId)===String(h)) homeR=r; else if(String(c.clubId)===String(a)) awayR=r;
  }
  return homeR||awayR||null;
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
    if(pid === SB_UID()){
      const { error } = await sb.rpc('claim_seat', { p_game: NET.gameId, p_club: clubId });
      if(error) throw error;
      nm = NET.self.name; em = NET.self.email;
      await sb.from('game_seats').update({ name: nm, email: em }).eq('game_id', NET.gameId).eq('club_id', clubId);
      // limpa convite pendente, se houver (aceito ao escolher o clube)
      sb.from('room_invites').delete().eq('game_id', NET.gameId).eq('user_id', SB_UID()).then(()=>{});
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
  } catch(e) { console.error('assignClub erro:', e);
    /* SALA CHEIA DE GENTE != CLUBE OCUPADO. O claim_seat recusa a pessoa que
       passa do teto de treinadores do plano do anfitriao (PLANO_SALA_CHEIA), e
       o aviso de sempre — "já ocupado?" — mandaria essa pessoa tentar outro
       clube a vida toda, porque nenhum ia funcionar. */
    const msg=(e&&e.message)||'';
    if(typeof toastC==='function') toastC(/PLANO_SALA_CHEIA/.test(msg)
      ? '⚠ Esta sala já está com o número máximo de treinadores.'
      : '⚠ Não foi possível escolher esse clube (já ocupado?).'); }
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
    await sb.from('game_seats').update({ is_ready: ready }).eq('game_id', NET.gameId).eq('user_id', SB_UID());
    if(NET._claimed[SB_UID()]) NET._claimed[SB_UID()].ready = ready;
    netMergeParticipants();
  } catch(e) { console.error('setReady erro:', e); }
}

/* ABRE A TEMPORADA COM O CRONÔMETRO DESARMADO. Antes armava 60s aqui mesmo — e esses 60s corriam
   POR BAIXO da cerimônia do sorteio da Resenha, das boas-vindas e dos sorteios de copa (que levam
   minutos). Como advance_phase_if_expired só olha prazo/prontidão (não olha busy), a fase virava
   'running' com todo mundo ainda nas cerimônias: a rodada 0 acontecia em segundo plano, cada
   cliente entrava quando por acaso chegava à tela do clube, e os sorteios "aconteciam no
   background". O timer agora só arma via arm_ready_timer — que o servidor só concede quando
   NINGUÉM está ocupado (cerimônias contam como ocupado, ver CLOSING_SCREENS) — então a contagem
   da rodada 1 só começa quando todos estão na tela do clube. */
/* PONTEIRO DE DIA. A temporada inteira vira uma lista ordenada de dias — cada um com a competição
   que entra em campo — e a sala guarda essa lista mais um índice e um momento. Quem decide qual
   tela todos veem passa a ser esse ponteiro, não o palpite de cada cliente a partir do seu próprio
   estado (foi assim que dois humanos acabaram em rodadas diferentes, cada um "certo" pela sua
   conta). A lista é montada pela folha de regras, a mesma que o servidor roda: montar de novo no
   banco seria uma terceira cópia das mesmas datas.
   Só o anfitrião grava, e só uma vez: day_plan já preenchido nunca é sobrescrito, senão um
   reinício jogaria a sala de volta pro primeiro dia. */
async function netSeedDayPlan(force){
  try{
    if(typeof WORLD_RULES==='undefined' || !WORLD_RULES.buildDayPlan) return false;
    const { data: g } = await sb.from('games').select('day_plan').eq('id', NET.gameId).single();
    // `force` é a VIRADA DE TEMPORADA: aí o calendário TEM que ser refeito, e o ponteiro voltar
    // ao dia 0. Sem isso o plano da temporada velha continuava valendo e o ponteiro ficava preso
    // na última rodada dela, enquanto os clientes já estavam na rodada 0 da temporada nova.
    if(g && g.day_plan && !force) return false;       // sala já tem o seu calendário — nada a fazer
    const tog = (typeof S!=='undefined' && S && S.compToggle) || {};
    const epoch = (typeof seasonEpoch==='function') ? seasonEpoch() : null;
    /* A ANCORA E A DO MUNDO DA SALA, NUNCA A DA ABA. netStart roda ANTES de o mundo novo existir:
       se o navegador do anfitriao vinha de um save noutro universo (ACTIVE_UNI='Inglaterra'), o
       semeador montava o plano do pais errado sobre um mundo do Brasil — plano vazio, sala sem
       ponteiro. O estado (S.intlUniverse) e quem sabe de que pais o mundo e. */
    const ancora = (typeof WORLD_CONFIG!=='undefined' && WORLD_CONFIG.uniDoEstado && typeof S!=='undefined' && S)
      ? WORLD_CONFIG.uniDoEstado(S)
      : ((typeof activeUniverseKey==='function') ? activeUniverseKey() : 'brasil');

    /* ===== A FILA DE DIAS É DE TODOS OS PAÍSES VIVOS =====
       O slot é da SALA e a mesma semana vale para toda a gente; o que muda por país é qual
       competição entra em campo nele. No slot 5, meio de semana, o brasileiro vê a Libertadores e
       o inglês vê a Champions — ao mesmo tempo, na mesma fila, sem ninguém esperar por ninguém.
       Cada dia carrega o país; cada cliente vive só os do país do clube dele (diasDoPais).

       Sala de um país só — que é toda sala existente — dá exatamente a fila de antes: o laço
       percorre uma lista de um elemento. */
    const vivos = (S && Array.isArray(S.paisesVivos) && S.paisesVivos.length) ? S.paisesVivos.slice() : [ancora];
    if(vivos.indexOf(ancora)<0) vivos.push(ancora);

    const cupsPorPais={}, totaisPorPais={}, jornadasPorPais={};
    vivos.forEach(pais=>{
      const naAncora = (pais===ancora);
      const mundo = naAncora ? S : ((S.mundos||{})[pais]||null);
      const cupsDoMundo = naAncora ? (S.cups||{}) : ((mundo&&mundo.cups)||{});
      /* quais copas este país disputa vem da folha; a âncora mantém o caminho antigo (allCupKeys),
         que também respeita o que o usuário desligou em compToggle. */
      const lista = naAncora
        ? (typeof allCupKeys==='function' ? allCupKeys() : []).filter(k=>tog[k]!==false)
        : ((typeof WORLD_CONFIG!=='undefined' && WORLD_CONFIG.copasDe) ? WORLD_CONFIG.copasDe(pais) : [])
            .filter(k=>cupsDoMundo[k]);
      cupsPorPais[pais]=lista;
      /* o total de rodadas vem do JOGO, não do número de slots na folha — senão a final das
         continentais fica sem dia no plano (ver buildDayPlan). */
      const nac = (typeof WORLD_CONFIG!=='undefined' && WORLD_CONFIG.COPA_NACIONAL) ? (WORLD_CONFIG.COPA_NACIONAL[pais]||null) : null;
      const t={}; lista.forEach(k=>{ try{
        t[k] = naAncora ? cupTotalRounds(k) : cupTotalRoundsDe(cupsDoMundo, k, nac);
      }catch(e){} });
      totaisPorPais[pais]=t;
      /* QUANTAS RODADAS A LIGA TEM DE VERDADE — não o tamanho de S.sched.
         `sched` é maior do que a liga: a temporada nasce com rodadas a mais, sem jogo de liga,
         só para dar dia às finais das copas (ver ensureCupCalendar). Usar o tamanho dele punha
         no plano dias de LIGA que não têm partida nenhuma — no Brasil, quatro deles, nos slots
         39 a 42, justamente onde moram as finais. O jogador via "dia de liga" e não havia jogo.
         Conta-se as rodadas com partida; se vier tudo vazio (save a meio de uma migração),
         cai no tamanho, que é o comportamento antigo. */
      const sched = naAncora ? S.sched : (mundo&&mundo.sched);
      const comJogo = Array.isArray(sched) ? sched.filter(j=>j && j.length).length : 0;
      jornadasPorPais[pais] = Array.isArray(sched) ? (comJogo || sched.length) : null;
    });

    const plan = WORLD_RULES.buildDayPlanMulti(vivos, epoch, totaisPorPais,
      { cups:cupsPorPais, jornadasLiga:jornadasPorPais });
    if(!plan || !plan.length) return false;
    /* REPLANTAR NUNCA PODE REBOBINAR UMA TEMPORADA EM ANDAMENTO.
       Este `day_idx: 0` era incondicional, e foi o que travou a TR9LF: o replantio existe para a
       VIRADA (aí o dia 0 é o certo, porque a rodada também é 0), mas ele é chamado por outro
       caminho — o autorreparo "sala sem calendário" — que dispara pelo cache VAZIO do cliente, e
       não por o servidor estar mesmo sem plano. Bastou um refresh do anfitrião (ou um timeout do
       banco, que houve) para uma sala saudável na rodada 20 voltar ao dia 0 e ficar rastejando
       dia a dia, sem nunca alcançar o mundo — a sala parecia congelada e nem reload, nem
       "Sincronizar sala", nem logout resolviam, porque o estrago estava no servidor.
       Agora o alvo sai do MUNDO: se já havia plano e a temporada está em curso, o ponteiro vai
       para o primeiro dia da rodada atual; a virada (rodada 0) continua indo para o dia 0. */
    const jaHaviaPlano = !!(g && g.day_plan);
    const rodadaAtual = (typeof S!=='undefined' && S && S.round) || 0;
    let alvo = 0;
    if(jaHaviaPlano && rodadaAtual>0){
      const i = plan.findIndex(d=>d && d.r===rodadaAtual);
      alvo = i<0 ? 0 : i;
      console.warn('replantio a meio da temporada — ponteiro para o dia '+alvo+' (rodada '+rodadaAtual+'), não para o dia 0');
    }
    await sb.from('games').update({ day_plan: plan, day_idx: alvo, day_moment: 'escalando' }).eq('id', NET.gameId);
    return true;
  }catch(e){ console.warn('seedDayPlan:', e && e.message); return false; }
}

/* o dia que a sala está vivendo agora, direto do servidor: {idx, momento, rodada, competicao,
   dia_da_temporada, total_dias}. null quando a sala ainda não tem plano (save antigo). */
async function netDayPointer(){
  if(!sb || !NET.gameId) return null;
  try{
    const { data, error } = await sb.rpc('day_current', { p_game: NET.gameId });
    if(error) throw error;
    return (data && data.length) ? data[0] : null;
  }catch(e){ console.warn('dayPointer:', e && e.message); return null; }
}
/* O PONTEIRO TEM QUE SER LIDO, NÃO ESPERADO.
   `NET.room.day` só era atualizado quando um evento de realtime chegava — e realtime é justamente o
   que não dá garantia: tem limite de eventos por segundo, o evento pode se perder, a aba pode estar
   em segundo plano. O efeito medido em sala real: o servidor com o dia CERTO e dois clientes
   decidindo em cima de leituras diferentes dele — um foi assistir a Libertadores enquanto o outro
   esperava para jogar a rodada. Não era o ponteiro que estava errado; era a cópia de cada um.
   Esta leitura é uma linha só (day_current) e roda de segundos em segundos, ao lado do realtime:
   ninguém mais entra em campo decidindo por uma foto velha do dia da sala. */
async function netRefreshDay(){
  if(!sb || !NET.gameId || !NET.room) return null;
  try{
    const { data, error } = await sb.rpc('day_current', { p_game: NET.gameId });
    if(error) throw error;
    const r=(data && data.length) ? data[0] : null;
    if(!r) return null;
    if(NET.room.dayPlan){
      const e=NET.room.dayPlan[r.idx] || null;
      NET.room.day = e ? { idx:r.idx, moment:r.momento, round:e.r, comp:e.comp,
                           cupIdx:e.idx, dia:e.dia, total:NET.room.dayPlan.length } : null;
    } else {
      /* SEM PLANO NAO HA DIA. A sala 6RZRX nasceu sem day_plan (o semeador falhou calado) e este
         ramo fabricava um dia com rodada NULL — e null nunca e igual a S.round, entao roomDay()
         devolvia hold para sempre: "a sala esta acertando a rodada" desde o dia zero. Sem
         rodada de verdade, nao ha ponteiro: a sala degrada para o caminho sem plano (que
         funciona), e o replantio do anfitriao (ver onlineTimerLoop) cria o plano que falta. */
      NET.room.day = (r.jornada==null) ? null
        : { idx:r.idx, moment:r.momento, round:r.jornada, comp:r.competicao,
            dia:r.dia_da_temporada, total:r.total_dias };
    }
    return NET.room.day;
  }catch(e){ return null; }
}
/* CARIMBO POR ASSENTO (item 2). Substitui o netDayDone acima, e a diferença é a que importa:
   "ninguém está ocupado" é uma FOTO do instante — entre uma tela e outra todo mundo está livre, e o
   dia virava sem nada ter sido cumprido (foi assim que o ponteiro chegou à rodada 4 com a sala na
   3, sala 365ZV). Aqui cada assento assina o dia que viveu; o dia só vira quando o último assinar.
   `ignorarSeg` é o "começar sem eles": quem não dá sinal de vida há tanto tempo deixa de ser
   esperado — é o escape que impede um jogador que fechou a aba de congelar a sala.
   O day_advance_if_all_done CONTINUA existindo no banco de propósito: cliente publicado antigo
   ainda o chama, e removê-lo congelaria as salas em campo. */
async function netDayAck(idx, moment, ignorarSeg){
  if(!sb || !NET.gameId) return null;
  try{
    const { data, error } = await sb.rpc('day_ack',
      { p_game: NET.gameId, p_idx: idx, p_moment: moment, p_ignorar_ausentes_seg: ignorarSeg|0 });
    if(error) throw error;
    return (data && data.length) ? data[0] : null;
  }catch(e){ console.warn('dayAck:', e && e.message); return null; }
}
/* DESFAZ O MEU CARIMBO — o "não estou mais pronto". Só limpa se o dia/momento ainda for o que eu
   carimbei, e nunca move o ponteiro (ver a migração day_unack). */
async function netDayUnack(idx, moment){
  if(!sb || !NET.gameId) return null;
  try{
    const { data, error } = await sb.rpc('day_unack', { p_game: NET.gameId, p_idx: idx, p_moment: moment });
    if(error) throw error;
    return (data && data.length) ? data[0] : null;
  }catch(e){ console.warn('dayUnack:', e && e.message); return null; }
}
/* quem a sala ainda está esperando, com nome — alimenta o modal do anfitrião (item 5). */
async function netDayStatus(){
  if(!sb || !NET.gameId) return null;
  try{
    const { data, error } = await sb.rpc('day_status', { p_game: NET.gameId });
    if(error) throw error;
    return (data && data.length) ? data[0] : null;
  }catch(e){ console.warn('dayStatus:', e && e.message); return null; }
}

async function netStart(){
  if(!NET.isHost) return;
  NET.room.phase='ready'; NET.room.deadline=0; NET.room.paused=false;
  if(NET.onState) NET.onState(NET.room);
  await netSeedDayPlan();
  try { await sb.from('games').update({ phase:'ready', ready_deadline: null, paused:false }).eq('id', NET.gameId); }
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
    const { data, error } = await netInvokeFn('kickoff-round', { gameId:NET.gameId, round });
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
  const { error } = await sb.from('messages').insert({ game_id: NET.gameId, user_id: SB_UID(), user_name: NET.self.name, club_id: clubId, body: text });
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
      sb.from('game_seats').select('game_id, club_id, is_ready, games(name, phase, round, host_id, created_at)').eq('user_id', SB_UID()),
      sb.from('room_invites').select('game_id, games(name, phase, round, host_id, created_at)').eq('user_id', SB_UID()),
      sb.from('games').select('id, name, phase, round, host_id, created_at').eq('host_id', SB_UID())
    ]);
    if(e1) throw e1;
    const byCode = new Map();
    // (1) assento reivindicado — tem prioridade (traz o clubId escolhido)
    (seatData||[]).filter(r=>r.games && r.games.phase!=='deleted').forEach(r=>{
      // `pronto` = is_ready deste assento, que a consulta JA buscava e era descartado. E o que
      // permite dizer "a sua vez" em vez de so "12a rodada" na lista de salas: numa resenha o
      // que a pessoa precisa saber e em QUAL das salas ela esta a segurar a rodada.
      byCode.set(r.game_id, { code:r.game_id, name:r.games.name, phase:r.games.phase, round:r.games.round,
        isHost:r.games.host_id===SB_UID(), clubId:r.club_id, pending:false, pronto:r.is_ready!==false,
        createdAt:r.games.created_at });
    });
    // (2) salas que eu criei (mesmo sem assento) — não sobrescreve um assento já mapeado
    (e3?[]:(hostData||[])).filter(g=>g.phase!=='deleted').forEach(g=>{
      if(byCode.has(g.id)) return;
      byCode.set(g.id, { code:g.id, name:g.name, phase:g.phase, round:g.round, isHost:true, clubId:null, pending:false, createdAt:g.created_at });
    });
    // (3) convites pendentes — só se eu ainda não estiver na sala por outra via
    (e2?[]:(inviteData||[])).filter(r=>r.games && r.games.phase!=='deleted').forEach(r=>{
      if(byCode.has(r.game_id)) return;
      byCode.set(r.game_id, { code:r.game_id, name:r.games.name, phase:r.games.phase, round:r.games.round,
        isHost:false, clubId:null, pending:true, createdAt:r.games.created_at });
    });
    // DA MAIS NOVA PRA MAIS VELHA. A lista saía na ordem em que o Map foi preenchido (assentos,
    // depois salas que criei, depois convites) — ou seja, numa ordem que não diz nada pra quem
    // olha. A sala aberta agora é a que a pessoa quer reentrar, então ela vem em cima.
    return Array.from(byCode.values())
      .sort((a,b)=> new Date(b.createdAt||0) - new Date(a.createdAt||0));
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
        .eq('game_id', code).eq('user_id', SB_UID());
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
    return (data||[]).filter(u=>u.id!==SB_UID());
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
    { game_id: NET.gameId, user_id: targetUserId, invited_by: SB_UID() }
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
    /* ITEM 3 — games.round TEM UM ESCRITOR SÓ, E NÃO É O ANFITRIÃO.
       Esta linha publicava a rodada a partir do estado LOCAL do host. Era a segunda fonte de
       verdade do mesmo número: o ponteiro do dia derivava a rodada do plano (day_ack) e o save do
       anfitrião a sobrescrevia com a conta dele. Dois escritores para um número é precisamente a
       origem de "cada humano numa rodada". Agora, em sala com plano de dias, o host publica só o
       MUNDO (shared_state) e quem escreve a rodada é o servidor, ao virar o dia.
       Os convidados não perdem o gatilho de sincronia: o reconcile também dispara por
       state_version, que este mesmo update incrementa (ver onlineReconcileIfBehind).
       Sala sem plano (save antigo) continua publicando a rodada como sempre. */
    const temPonteiro = !!(NET.room && NET.room.dayPlan);
    const authRound = (stateObj && stateObj.round!=null) ? stateObj.round : (stateObj && stateObj.S && stateObj.S.round);
    const patch = temPonteiro ? { shared_state: stateObj, state_version: nextV }
                              : { shared_state: stateObj, state_version: nextV, round: authRound };
    const { error } = await sb.from('games').update(patch).eq('id', NET.gameId).eq('state_version', cur?.state_version||0);
    if(error) throw error;
    console.log('✓ Jogo salvo (v'+nextV+', rodada '+(stateObj.round)+')');
  } catch(e) { console.error('saveGame erro:', e); }
}

/* MOTOR DIVERGENTE: verdade quando esta aba está rodando um motor diferente do que
   resolve a sala. Acontece com aba aberta desde antes de um deploy. Só é conhecida
   depois da primeira rodada resolvida (é o servidor que carimba o estado). */
NET._motorSala = null;
/* O AVISO. Barra fixa, uma vez por aba: quem está com motor velho precisa recarregar,
   e precisa SABER disso — senão continua jogando um jogo que o servidor vai descartar.
   Desenhada aqui, sem depender de nada da UI, para não quebrar tela nenhuma. */
let _avisoMotor=false;
function netAvisarMotorVelho(){
  console.warn('motor divergente: sala em '+NET._motorSala+', esta aba em '+RF_MOTOR_VER);
  if(_avisoMotor || typeof document==='undefined') return;
  _avisoMotor=true;
  const b=document.createElement('div');
  b.setAttribute('role','alert');
  b.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#F2B90C;'+
    'color:#17458F;font:600 14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'+
    'padding:13px 18px;display:flex;gap:14px;align-items:center;justify-content:center;'+
    'flex-wrap:wrap;box-shadow:0 -2px 12px rgba(0,0,0,.18)';
  b.innerHTML='<span>O jogo foi atualizado enquanto esta aba estava aberta. '+
    'Recarregue para continuar — seus resultados não valem até lá.</span>'+
    '<button type="button" style="background:#17458F;color:#fff;border:0;border-radius:8px;'+
    'padding:9px 18px;font:inherit;cursor:pointer">Recarregar agora</button>';
  b.querySelector('button').onclick=()=>location.reload();
  document.body.appendChild(b);
}
function netMotorDivergente(){
  const meu = (typeof RF_MOTOR_VER!=='undefined') ? RF_MOTOR_VER : null;
  if(!meu || !NET._motorSala) return false;   // sem carimbo dos dois lados, não há o que comparar
  return NET._motorSala !== meu;
}

async function netLoadGame(){
  try {
    const { data, error } = await sb.from('games').select('shared_state,state_version').eq('id', NET.gameId).single();
    if(error) return null;
    NET._loadedVersion = data?.state_version || 0;   // versão do que acabei de baixar (ver CL._adoptedVer)
    NET._motorSala = (data && data.shared_state && data.shared_state.motorVer) || null;
    if(netMotorDivergente()) netAvisarMotorVelho();
    return data?.shared_state || null;
  } catch(e) { console.error('loadGame erro:', e); return null; }
}

/* ---- PAGAMENTO: abre o checkout do plano escolhido ----
   Só pede a URL e devolve. Quem CONCEDE o plano é o webhook, quando o Stripe
   confirma a cobrança — abrir o checkout não é ter pago, e por isso nada aqui
   escreve em user_plans.

   `sem_chave` é resposta esperada, não erro: enquanto o Stripe não estiver
   ligado no projeto, a função responde 503 com esse motivo e quem chamou volta
   para a lista de espera, que é o comportamento de hoje. Botão nenhum morre no
   meio do caminho. */
async function netCriarCheckout(plano, ciclo){
  if(!sb) await netInitSupabase();
  if(!sb || !SB_AUTH_USER) return { erro:'sem_sessao' };
  const res = await netInvokeFn('criar-checkout', {
    plano, ciclo: ciclo||'mes',
    origem: (typeof location!=='undefined' ? location.origin : '')
  });
  if(res.error){
    /* o corpo do erro vem no context do invoke(); sem ele, trata como
       indisponível — quem chamou cai na lista de espera de qualquer forma */
    let motivo='falhou';
    try{ const c = await res.error.context?.json?.(); if(c && c.motivo) motivo=c.motivo; }catch(e){}
    return { erro: motivo };
  }
  const url = res.data && res.data.url;
  return url ? { url } : { erro:'sem_url' };
}

/* ---- SAVES DO MODO SOLO (só nuvem, por usuário) ---- */
async function netListSoloSaves(){
  if(!sb) await netInitSupabase();
  if(!sb || !SB_AUTH_USER) return [];
  try {
    /* A LISTA MOSTRA O TIME, não só o nome do save (pedido do dono, 21/08 — mesmo estilo da
       lista de salas da Resenha). Os campos do clube saem do próprio jsonb, sem baixar o
       estado inteiro: identidade (clubId/short/crest, gravados pelo saveV3) + onde o save
       está (temporada, divisão, rodada). Save antigo não tem short/crest — o cliente
       resolve pelo clubId (ver rfClubeDoSave em rf26-fluxo). */
    const { data, error } = await sb.from('solo_saves')
      .select('save_name,updated_at,clubId:state->>clubId,clubShort:state->>clubShort,clubCrest:state->>clubCrest,modalidade:state->>modalidade,season:state->S->>season,division:state->S->>division,round:state->S->>round')
      .order('updated_at',{ascending:false});
    if(error){ console.error('listSoloSaves erro:', error); return []; }
    return (data||[]).map(r=>({ name:r.save_name, updated_at:r.updated_at,
      clubId:r.clubId||null, clubShort:r.clubShort||null, clubCrest:r.clubCrest||null,
      season:r.season||null, division:r.division||null, round:r.round||null }));
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
    { user_id: SB_UID(), save_name: name, state, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,save_name' });
  if(error) throw error;
  return true;
}
/* ===== O LIVRO DE TITULOS DO RANKING =====
   Entrega os titulos da carreira a `rf_registrar_titulos` (elifoot_v3). O user_id NAO vai no
   payload — quem o poe e' a funcao, a partir de auth.uid(); mandar daqui seria abrir a porta a
   escrever no nome de outra conta.

   IDEMPOTENTE DO OUTRO LADO: a chave (conta, carreira, temporada, competicao) faz o reenvio do
   historico inteiro nao duplicar nada, e e' por isso que se pode chamar a cada gravacao sem
   contabilidade nenhuma aqui.

   SILENCIOSO E BEST-EFFORT, como o persistCareer: um ranking que nao subiu nunca pode atrapalhar
   quem esta a jogar. */
async function netEnviarTitulos(modo, origem, treinador, titulos){
  if(!sb || !SB_AUTH_USER || !modo || !origem) return 0;
  if(!Array.isArray(titulos) || !titulos.length) return 0;
  const { data, error } = await sb.rpc('rf_registrar_titulos', {
    p_modo:modo, p_origem:String(origem), p_treinador:treinador||null, p_titulos:titulos });
  if(error){ console.warn('enviarTitulos:', error.message||error); return 0; }
  return data||0;
}
/* O RANKING PUBLICO. `rf_ranking` e' SECURITY DEFINER e devolve nome e totais —
   nunca user_id, nunca e-mail (ver a migracao). Leitura publica: funciona sem
   sessao, que e' o que permite a faixa do topo existir antes do login. */
async function netRanking(modo, limite){
  if(!sb) await netInitSupabase();
  if(!sb) return [];
  const { data, error } = await sb.rpc('rf_ranking', { p_modo:modo||'geral', p_limite:limite||100 });
  if(error){ console.warn('ranking:', error.message||error); return []; }
  return data||[];
}
/* gemea de netEnviarTitulos, para a CAMPANHA (ver rf_registrar_temporadas). */
async function netEnviarTemporadas(modo, origem, treinador, temporadas){
  if(!sb || !SB_AUTH_USER || !modo || !origem) return 0;
  if(!Array.isArray(temporadas) || !temporadas.length) return 0;
  const { data, error } = await sb.rpc('rf_registrar_temporadas', {
    p_modo:modo, p_origem:String(origem), p_treinador:treinador||null, p_temporadas:temporadas });
  if(error){ console.warn('enviarTemporadas:', error.message||error); return 0; }
  return data||0;
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
  SB_CH = sb.channel('game:'+NET.gameId, { config:{ presence:{ key: SB_UID() } } });

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
      /* O REALTIME NAO PODE EMPOBRECER O CACHE. Este bloco reescrevia o assento com um
         subconjunto das colunas: budget/stadium/last_cup_result/day_ack sumiam do _claimed no
         instante em que chegava QUALQUER update daquele assento — e sao exatamente as colunas
         que os chips da sala e a adocao de resultado de copa leem. O payload do realtime traz a
         linha inteira, entao o cache recebe a linha inteira. */
      if(row.user_id){ NET._claimed[row.user_id] = { clubId:row.club_id, ready:row.is_ready, name:row.name, email:row.email, busy_until:row.busy_until, last_xi:row.last_xi, last_tactic:row.last_tactic, last_result:row.last_result, last_result_round:row.last_result_round, last_bids:row.last_bids, last_seen:row.last_seen, budget:seatBudgetEmVoo(row), stadium:row.stadium, last_cup_result:row.last_cup_result, last_cup_round:row.last_cup_round, day_ack:row.day_ack }; }
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

  /* ===== FASE 3B: transmissão AO VIVO da partida autoritativa =====
     'mlive' = snapshot cumulativo da partida (eventos + pendência) emitido pelo cliente que roda a
     sessão (mandante no humano×humano). 'mdec' = decisão remota do visitante (pênalti/lesão/
     expulsão/substituição) de volta pro autoritativo. Hooks implementados na UI (main.js). */
  SB_CH.on('broadcast', { event:'mlive' }, ({ payload })=>{
    if(!payload || !payload.k) return;
    if(payload.from===SB_UID()) return; // meu próprio eco: ignora
    if(typeof onNetMatchLive==='function'){ try{ onNetMatchLive(payload); }catch(e){ console.warn('mlive:', e&&e.message); } }
  });
  /* 'mready' = "entrei em campo nesta partida". Existe pra o confronto humano×humano só COMEÇAR
     quando os dois estão na tela. Sem isso, quem clicava Jogar primeiro esperava 10s em silêncio,
     assumia que o adversário tinha caído, jogava a partida inteira sozinho e PUBLICAVA o
     resultado — e quando o outro entrava, recebia esse resultado como replay, com as
     substituições dele sem efeito nenhum. Ver kickoffReadyFor/liveTick na UI. */
  SB_CH.on('broadcast', { event:'mready' }, ({ payload })=>{
    if(!payload || !payload.k) return;
    if(payload.from===SB_UID()) return;
    if(typeof onNetMatchReady==='function'){ try{ onNetMatchReady(payload); }catch(e){ console.warn('mready:', e&&e.message); } }
  });
  SB_CH.on('broadcast', { event:'mdec' }, ({ payload })=>{
    if(!payload || !payload.k) return;
    if(payload.from===SB_UID()) return;
    // segurança: só aceita decisão de quem é DONO do clube daquele lado (assento confere)
    const c=NET._claimed && NET._claimed[payload.from];
    if(!c || !c.clubId || String(c.clubId)!==String(payload.clubId)) return;
    if(typeof onNetMatchDecision==='function'){ try{ onNetMatchDecision(payload); }catch(e){ console.warn('mdec:', e&&e.message); } }
  });

  // expulsão pelo anfitrião: sinal em tempo real pra TODOS (inclusive o expulso), independente de DB/RLS
  /* BANCADA: o anfitrião liga o modo de teste para a SALA INTEIRA. Sem isto, só quem clicou
     entraria em auto-jogo e a sala pararia à espera dos outros — o carimbo do dia exige todos. */
  SB_CH.on('broadcast', { event:'teste' }, ({ payload })=>{
    if(!payload || payload.from===SB_UID()) return;
    if(typeof clTesteEntrar==='function') clTesteEntrar(payload);
  });
  SB_CH.on('broadcast', { event:'kick' }, ({ payload })=>{
    if(!payload || !payload.uid) return;
    const uid=payload.uid, clubId=payload.clubId;
    SB_KICKED[uid]=1;
    if(uid===SB_UID()){ netHandleKicked(); return; } // fui eu -> sair pro menu
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
/* FASE 3B: o dono humano deste clube está PRESENTE agora? (usa o merge de participantes, que
   combina presença realtime + last_seen no banco). Decide quem transmite e quem assiste. */
function netClubOnline(clubId){
  const ps=(NET.room&&NET.room.participants)||[];
  const p=ps.find(x=>String(x.clubId)===String(clubId));
  return !!(p && p.online);
}
/* FASE 3B: emite o snapshot da MINHA partida autoritativa (mandante) pro canal da sala */
function netBroadcastMatch(payload){
  if(!SB_CH || !SB_AUTH_USER || !payload) return;
  try{ SB_CH.send({ type:'broadcast', event:'mlive', payload:{ ...payload, from:SB_UID() } }); }catch(e){}
}
/* avisa a sala que EU já estou na tela desta partida (ver 'mready' acima). Reenviado a cada
   poucos segundos enquanto espero: quem entrar depois precisa receber o aviso mesmo tendo perdido
   o primeiro (broadcast não tem histórico). */
function netBroadcastKickoff(streamKey){
  if(!SB_CH || !SB_AUTH_USER || !streamKey) return;
  try{ SB_CH.send({ type:'broadcast', event:'mready', payload:{ k:streamKey, from:SB_UID(), clubId:(typeof CL!=='undefined'&&CL.clubId)||null } }); }catch(e){}
}
/* FASE 3B: manda a MINHA decisão remota (visitante) pro cliente autoritativo. clubId viaja junto
   pro receptor validar que a decisão vem do dono real daquele lado. */
function netBroadcastDecision(payload){
  if(!SB_CH || !SB_AUTH_USER || !payload) return;
  try{ SB_CH.send({ type:'broadcast', event:'mdec', payload:{ ...payload, from:SB_UID(), clubId:(typeof CL!=='undefined'&&CL.clubId)||null } }); }catch(e){}
}

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
  const uid = SB_UID();
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
  const { data } = await sb.from('join_requests').select('status').eq('game_id', String(code||'').toUpperCase()).eq('user_id', SB_UID()).maybeSingle();
  return data ? data.status : null;
}
async function netCancelJoinRequest(code){
  netClearJoinPoll();
  const c = String(code||NET.pendingCode||'').toUpperCase();
  NET.pendingCode=null; NET.pendingRoomName=null;
  if(!c || !sb || !SB_AUTH_USER) return;
  try{ await sb.from('join_requests').delete().eq('game_id', c).eq('user_id', SB_UID()); }catch(e){}
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
  try{ await sb.from('game_seats').update({ inbox:data }).eq('game_id', NET.gameId).eq('user_id', SB_UID()); }catch(e){}
}
async function netLoadInbox(){
  if(!NET.gameId || !SB_AUTH_USER) return null;
  try{ const { data } = await sb.from('game_seats').select('inbox').eq('game_id', NET.gameId).eq('user_id', SB_UID()).maybeSingle(); return (data&&data.inbox)||null; }catch(e){ return null; }
}
/* CARREIRA DO TREINADOR POR ASSENTO (game_seats.career).
   O BUG: títulos, troféus e conquistas (coachHistory, history, titlesByClub, financeHistory)
   vivem no S COMPARTILHADO, mas são de CADA treinador — CAREER_KEYS já os protegia do
   Object.assign do adopt DENTRO da sessão. Só que eles nunca eram gravados em lugar nenhum: o
   save da sala é o do ANFITRIÃO. Bastava sair, deslogar e voltar pra mesma Resenha e o convidado
   reentrava com a estante vazia — pior, o próprio código zerava coachHistory de propósito, pra
   ele não herdar a do host. Agora a carreira tem casa própria, por assento. */
async function netSaveCareer(data){
  if(!sb || !NET.gameId || !SB_AUTH_USER || !data) return;
  try{ await sb.from('game_seats').update({ career:data }).eq('game_id', NET.gameId).eq('user_id', SB_UID()); }
  catch(e){ console.warn('saveCareer:', e&&e.message); }
}
async function netLoadCareer(){
  if(!sb || !NET.gameId || !SB_AUTH_USER) return null;
  try{ const { data } = await sb.from('game_seats').select('career').eq('game_id', NET.gameId).eq('user_id', SB_UID()).maybeSingle(); return (data&&data.career)||null; }
  catch(e){ return null; }
}
/* LEITURA FRESCA DO MEU ASSENTO (direto do servidor, sem passar pelo cache _claimed).
   Existe pra UMA pergunta que só o servidor responde com honestidade: "o resultado da minha
   partida desta rodada já chegou?". O NET._claimed local não serve — netPublishResult carimba
   last_result_round nele ANTES do await, de forma otimista, então ele diz "publicado" mesmo
   quando o update falhou. Quem decide se é seguro recarregar a página é esta função
   (ver resenhaSyncCheck no local-transport). Devolve null se não deu pra ler. */
async function netMySeat(){
  if(!sb || !NET.gameId || !SB_AUTH_USER) return null;
  try{
    const { data, error } = await sb.from('game_seats')
      .select('club_id,last_result_round,last_cup_round,is_ready,busy_until')
      .eq('game_id', NET.gameId).eq('user_id', SB_UID()).maybeSingle();
    if(error) return null;
    return data||null;
  }catch(e){ return null; }
}
async function netKick(uid, clubId){
  if(!NET.isHost || !uid || uid===SB_UID()) return;
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
/* ---- SESSÃO PERDIDA NO MEIO DA RESENHA ----
   Mesma desmontagem do expulso (netHandleKicked), mas o destino é o LOGIN. Sem sessão válida
   nada mais do sincronismo funciona: não dá pra salvar o estado, publicar o resultado da partida
   nem pedir a rodada ao servidor — o RLS recusa tudo. Continuar na sala só produziria uma partida
   que nenhum outro jogador enxerga, e o silêncio disso é pior que a interrupção.
   Só age na RESENHA: no Solo a sessão não participa de nada durante o jogo, então derrubar o
   usuário ali seria perder a partida dele à toa. */
function netHandleSessionLost(){
  if(typeof CL==='undefined' || !CL.online) return;
  if(CL._sessionLostHandled) return;   // um aviso por sessão perdida, não um por chamada que falha
  CL._sessionLostHandled = true;
  try{ if(SB_CH){ if(SB_CH.untrack) SB_CH.untrack(); sb.removeChannel(SB_CH); } }catch(e){}
  SB_CH=null; SB_ONLINE={}; SB_AUTH_USER=null;
  NET.room=null; NET.gameId=null; NET.isHost=false; NET.onState=null; NET.onChat=null;
  // para os relógios da partida ao vivo: liveTick sai sozinho sem CL.live, mas os timers de
  // lesão/pênalti/classificação ficariam batendo numa tela que não existe mais.
  CL.online=false; CL.humans={}; CL.live=null;
  ['_liveTimer','_classifTimer','_cupFlowTimer','_cupDrawTimer','_injTimer','_penTimer'].forEach(k=>{
    if(CL[k]){ clearTimeout(CL[k]); clearInterval(CL[k]); CL[k]=null; }
  });
  if(typeof toastC==='function') toastC('⚠ Sua sessão expirou — entre de novo pra voltar à Resenha');
  CL.auth={ mode:'login', name:CL.mgr||'', email:'', password:'' };
  CL.screen='login';
  if(typeof cdraw==='function') cdraw();
}

/* ---- expõe no NET (mesma API já usada pela UI clássica) ---- */
NET.createRoom = netCreateRoom;
NET.joinRoom = netJoinRoom;
NET.refreshRoom = netRefreshRoom;
NET.heartbeatSeen = netHeartbeatSeen;
NET.publishLineup = netPublishLineup;
NET.publishResult = netPublishResult;
NET.resolveRound = netResolveRound;
NET.publishBudget = netPublishBudget;
NET.publishStadium = netPublishStadium;
NET.publishBids = netPublishBids;
NET.publishCupResult = netPublishCupResult;
NET.markCupDone = netMarkCupDone;
NET.humanClubIds = netHumanClubIds;
NET.allHumanResultsIn = netAllHumanResultsIn;
NET.anyMissingResultOnline = netAnyMissingResultOnline;
NET.collectHumanResults = netCollectHumanResults;
NET.humanResultFor = netHumanResultFor;
NET.humanCupResultFor = netHumanCupResultFor;
NET.setMode = netSetMode;
NET.assignClub = netAssignClub;
NET.setMyClub = netSetMyClub;
NET.saveInbox = netSaveInbox;
NET.loadInbox = netLoadInbox;
NET.saveCareer = netSaveCareer;
NET.loadCareer = netLoadCareer;
NET.mySeat = netMySeat;
NET.drawClubs = netDrawClubs;
NET.setReady = netSetReady;
NET.start = netStart;
NET.pause = netPause;
NET.setSpeed = netSetSpeed;
NET.toRunning = netToRunning;
NET.fetchKickoff = netFetchKickoff;
NET.fetchRoundStreams = netFetchRoundStreams;
NET.clubOnline = netClubOnline;
NET.broadcastMatch = netBroadcastMatch;
NET.broadcastDecision = netBroadcastDecision;
NET.broadcastTeste = function(payload){
  if(!SB_CH || !SB_AUTH_USER) return;
  try{ SB_CH.send({ type:'broadcast', event:'teste', payload:{ ...payload, from:SB_UID() } }); }catch(e){}
};
NET.broadcastKickoff = netBroadcastKickoff;
NET.reopenReady = netReopenReady;
NET.toLobby = netToLobby;
NET.kick = netKick;
NET.sendChat = netSendChat;
NET.saveGame = netSaveGame;
NET.loadGame = netLoadGame;
NET.motorDivergente = netMotorDivergente;   // a UI pode travar o "resolver rodada" com isto
NET.isOnlineUser = netIsOnline;
NET.authStatus = netAuthStatus;
NET.carregarPlano = netCarregarPlano;   // releitura a pedido (ex.: depois de comprar o PRO)
NET.criarCheckout = netCriarCheckout;   // devolve {url} ou {erro}
NET.authSignUp = netAuthSignUp;
NET.authSignIn = netAuthSignIn;
NET.authSignOut = netAuthSignOut;
NET.authResetPassword = netAuthResetPassword;
NET.updatePassword = netUpdatePassword;
NET.dayPointer = netDayPointer;
NET.dayAck = netDayAck;
NET.dayUnack = netDayUnack;
NET.dayStatus = netDayStatus;
NET.refreshDay = netRefreshDay;
/* VOLTAR O PONTEIRO DE DIA JUNTO COM O ESTADO (restauração do auto-save). Sem isto a sala
   ficaria apontando pra um dia que o estado restaurado ainda não viveu — o mesmo descompasso que
   travou a ZAF6T em "acertando a rodada". Escolhe o PRIMEIRO dia do plano cuja rodada é a
   restaurada; se o plano não tiver essa rodada (restauração pra uma temporada anterior), volta
   ao dia 0. Só o anfitrião escreve. */
async function netRewindDayPointer(round){
  if(!sb || !NET.gameId || !NET.isHost) return;
  try{
    const { data:g } = await sb.from('games').select('day_plan').eq('id', NET.gameId).maybeSingle();
    const plano=(g && g.day_plan) || [];
    let idx=plano.findIndex(d=>d && d.r===round);
    if(idx<0) idx=0;
    await sb.from('games').update({ day_idx:idx, day_moment:'escalando', round:round }).eq('id', NET.gameId);
    if(NET.room) NET.room.dayIdx=idx;
    await sb.from('game_seats').update({ day_ack:null }).eq('game_id', NET.gameId);   // ninguém carimbou este dia ainda
    console.log('ponteiro de dia rebobinado pro dia '+idx+' (jornada '+round+')');
  }catch(e){ console.warn('rewindDayPointer:', e&&e.message); }
}
NET.rewindDayPointer = netRewindDayPointer;
NET.reseedDayPlan = ()=>netSeedDayPlan(true);
/* SEMEAR SEM FORÇAR: para o autorreparo da sala que nasceu sem plano. Sai calado se o servidor já
   tiver calendário — o cache vazio deste cliente nunca é prova de que a sala está sem ponteiro. */
NET.seedDayPlan = ()=>netSeedDayPlan(false);
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
NET.enviarTitulos = netEnviarTitulos;
NET.enviarTemporadas = netEnviarTemporadas;
NET.ranking = netRanking;
NET.perfilFoto = netPerfilFoto;
NET.perfilSemFoto = netPerfilSemFoto;
NET.perfilLer = netPerfilLer;
NET.perfilRanking = netPerfilRanking;
NET.deleteSoloSave = netDeleteSoloSave;

/* ===== AVATAR DO TREINADOR =====
   Tres operacoes, todas por conta (nao por save): ler o que ja' existe, gravar
   a escolha barata (genero/preset/aceite dos termos) e pedir o retrato por IA.

   A DIVISAO DE QUEM ESCREVE O QUE E' DE PROPOSITO e esta' travada no banco:
   daqui o jogador so' consegue mexer em genero, preset e termos. `url` e
   `geracoes` sao do servidor — se o browser pudesse escrever `geracoes`, a
   cota que segura o custo da OpenAI seria uma sugestao (ver o trigger
   coach_avatars_guarda e supabase/sql/coach-avatars.sql). */
async function netCoachAvatarGet(){
  if(!sb || !SB_AUTH_USER) return null;
  const { data, error } = await sb.from('coach_avatars')
    .select('genero,preset,url,estilo,geracoes,termos_versao').maybeSingle();
  if(error){ console.warn('avatar do treinador:', error.message); return null; }
  return data || null;
}
async function netCoachAvatarSet(campos){
  if(!sb || !SB_AUTH_USER) return { error:'sem sessão' };
  const { error } = await sb.from('coach_avatars')
    .upsert(Object.assign({ user_id: SB_AUTH_USER.id }, campos), { onConflict:'user_id' });
  return error ? { error: error.message } : {};
}

/* A FOTO DE REFERENCIA SOBE PARA UM BUCKET PRIVADO e o servidor a apaga logo
   depois de gerar. O caminho COMECA pelo uid porque e' isso que a policy do
   Storage exige — e e' o que impede um assinante de mandar gerar em cima da
   foto pessoal de outro. */
/* ===== A FOTO DE PERFIL DO TREINADOR =====
   Bucket `perfil`, pasta `<uid>/` — a politica so' aceita ali (ver a migracao).

   SEMPRE O MESMO CAMINHO (`<uid>/avatar.<ext>`) com upsert: trocar a foto
   substitui o ficheiro em vez de deixar um orfao por troca. E' por isso que o
   bucket tem politica de UPDATE alem de INSERT.

   O ENDERECO VAI PARA A TABELA, nao fica so' no storage: e' `coach_profiles` que
   o ranking le' (rf_ranking), e o URL publico e' estavel, entao guarda'-lo uma
   vez chega. `?v=` no fim e' para o navegador nao servir a foto velha do cache
   depois de uma troca — o caminho nao muda, so' o conteudo. */
async function netPerfilFoto(arquivo){
  if(!sb) await netInitSupabase();
  if(!sb || !SB_AUTH_USER) return { error:'sem sessão' };
  const tipo=String(arquivo && arquivo.type||'');
  if(!/^image\/(jpeg|png|webp)$/.test(tipo)) return { error:'A foto tem de ser JPG, PNG ou WebP.' };
  if(arquivo.size > 2*1024*1024) return { error:'A foto passa de 2 MB. Escolha uma menor.' };
  const ext = tipo.split('/')[1].replace('jpeg','jpg');
  const caminho = `${SB_AUTH_USER.id}/avatar.${ext}`;
  const up = await sb.storage.from('perfil').upload(caminho, arquivo, { upsert:true, contentType:tipo });
  if(up.error) return { error: up.error.message };
  const { data } = sb.storage.from('perfil').getPublicUrl(caminho);
  const url = (data && data.publicUrl ? data.publicUrl : '') + '?v=' + Date.now();
  const r = await sb.rpc('rf_perfil_gravar', { p_foto_url:url, p_no_ranking:null });
  if(r.error) return { error: r.error.message };
  return { url };
}
/* voltar a's iniciais: limpa o endereco (string vazia = "apaga", ver a RPC) e o
   ficheiro. A ordem importa — primeiro o endereco, para nao ficar um URL a
   apontar para um ficheiro que ja' nao existe se o remove falhar. */
async function netPerfilSemFoto(){
  if(!sb || !SB_AUTH_USER) return { error:'sem sessão' };
  const r = await sb.rpc('rf_perfil_gravar', { p_foto_url:'', p_no_ranking:null });
  if(r.error) return { error: r.error.message };
  try{ await sb.storage.from('perfil').remove([
    SB_AUTH_USER.id+'/avatar.jpg', SB_AUTH_USER.id+'/avatar.png', SB_AUTH_USER.id+'/avatar.webp' ]); }catch(e){}
  return { ok:true };
}
async function netPerfilLer(){
  if(!sb || !SB_AUTH_USER) return null;
  const { data, error } = await sb.rpc('rf_perfil_meu');
  if(error) return null;
  return (data && data[0]) || { foto_url:null, no_ranking:true };
}
async function netPerfilRanking(visivel){
  if(!sb || !SB_AUTH_USER) return { error:'sem sessão' };
  const r = await sb.rpc('rf_perfil_gravar', { p_foto_url:null, p_no_ranking:!!visivel });
  return r.error ? { error:r.error.message } : { ok:true };
}
async function netCoachAvatarRef(arquivo){
  if(!sb || !SB_AUTH_USER) return { error:'sem sessão' };
  const ext = (String(arquivo.type||'').split('/')[1]||'jpg').replace(/[^a-z0-9]/gi,'').slice(0,5);
  const caminho = `${SB_AUTH_USER.id}/ref-${Date.now()}.${ext||'jpg'}`;
  const { error } = await sb.storage.from('referencias-treinador')
    .upload(caminho, arquivo, { upsert:false, contentType: arquivo.type||'image/jpeg' });
  return error ? { error: error.message } : { caminho };
}
/* desistiu antes de gerar: a foto nao pode ficar la' esperando */
async function netCoachAvatarRefApagar(caminho){
  if(!sb || !caminho) return;
  try{ await sb.storage.from('referencias-treinador').remove([caminho]); }
  catch(e){ console.warn('nao apaguei a referencia:', e.message); }
}
async function netCoachAvatarGerar(corpo){
  const res = await netInvokeFn('coach-avatar', corpo);
  if(res.error){
    let msg = res.error.message || 'Não consegui gerar o retrato.';
    let motivo = null;
    /* o texto util da funcao vem no CORPO da resposta, nao em error.message —
       sem desembrulhar, o jogador leria "Edge Function returned a non-2xx
       status code" no lugar de "você já usou as 6 gerações". */
    try{ const j = await res.error.context.json(); if(j){ msg = j.error||msg; motivo = j.motivo||null; } }catch(_e){}
    return { error: msg, motivo };
  }
  const d = res.data||{};
  if(!d.url) return { error: d.error || 'A função não devolveu retrato.' };
  return d;
}
/* ===== O MEU JOGADOR NA BASE OFICIAL (plano Embaixador) =====
   Quatro vagas por clube, nas quatro divisoes, nas duas modalidades (640 no total). O cliente
   LE' pela vista publica — que esconde o `motivo` da recusa e o dono de cada vaga — e ESCREVE
   so' por RPC, onde moram as regras: ter o plano, a vaga estar livre, uma vaga por pessoa.
   Ver a migracao player_slots_rpcs. */
async function netVagasDoClube(modalidade, clubId){
  if(!sb) await netInitSupabase();
  if(!sb) return [];
  const { data, error } = await sb.schema('elifoot_v3').from('player_slots_publicas')
    .select('modalidade,club_id,player_id,divisao,clube_nome,nome_base,forca,posicao,status,nome')
    .eq('modalidade', modalidade).eq('club_id', clubId)
    .order('forca', { ascending:false });
  if(error){ console.warn('vagas do clube:', error.message); return []; }
  return data||[];
}
/* quantas vagas livres tem cada clube — e' o que o dropdown de clube mostra ao lado do nome,
   para nao se escolher um clube e descobrir la' dentro que nao ha' nada */
async function netVagasPorClube(modalidade, divisao){
  if(!sb) await netInitSupabase();
  if(!sb) return [];
  const { data, error } = await sb.schema('elifoot_v3').from('player_slots_publicas')
    .select('club_id,clube_nome,status')
    .eq('modalidade', modalidade).eq('divisao', divisao);
  if(error){ console.warn('vagas por clube:', error.message); return []; }
  const m=new Map();
  (data||[]).forEach(r=>{
    const c=m.get(r.club_id)||{ club_id:r.club_id, clube_nome:r.clube_nome, livres:0, total:0 };
    c.total++; if(r.status==='livre') c.livres++;
    m.set(r.club_id, c);
  });
  return [...m.values()].sort((a,b)=>a.clube_nome.localeCompare(b.clube_nome,'pt-BR'));
}
async function netVagaMinha(modalidade){
  if(!sb) await netInitSupabase();
  if(!sb || !SB_AUTH_USER) return null;
  const { data, error } = await sb.schema('elifoot_v3').rpc('vaga_minha', { p_modalidade: modalidade||null });
  if(error){ console.warn('minha vaga:', error.message); return null; }
  return (data && data[0]) || null;
}
async function netVagaPedir(modalidade, clubId, playerId, nome, fotoUrl){
  if(!sb) await netInitSupabase();
  if(!sb || !SB_AUTH_USER) return { error:'Entre na sua conta primeiro.' };
  const { data, error } = await sb.schema('elifoot_v3').rpc('vaga_pedir', {
    p_modalidade:modalidade, p_club:clubId, p_player:playerId, p_nome:nome, p_foto:fotoUrl||null });
  if(error) return { error: error.message };
  return { vaga: (data && data[0]) || data || null };
}
async function netVagaLargar(modalidade){
  if(!sb || !SB_AUTH_USER) return { error:'sem sessão' };
  const { error } = await sb.schema('elifoot_v3').rpc('vaga_largar', { p_modalidade:modalidade });
  return error ? { error:error.message } : {};
}
/* A FOTO DO JOGADOR VAI PARA O BUCKET DOS JOGADORES, nao para o do perfil: sao coisas
   diferentes — uma e' a cara do treinador (so' dele), a outra entra na base que todos veem. */
async function netVagaFoto(arquivo){
  if(!sb || !SB_AUTH_USER) return { error:'sem sessão' };
  const tipo=String(arquivo && arquivo.type||'');
  if(!/^image\/(jpeg|png|webp)$/.test(tipo)) return { error:'A foto tem de ser JPG, PNG ou WebP.' };
  if(arquivo.size > 4*1024*1024) return { error:'A foto passa de 4 MB. Escolha uma menor.' };
  const ext = tipo.split('/')[1].replace('jpeg','jpg');
  const caminho = `embaixadores/${SB_AUTH_USER.id}/jogador.${ext}`;
  const up = await sb.storage.from('jogadores').upload(caminho, arquivo, { upsert:true, contentType:tipo });
  if(up.error) return { error: up.error.message };
  const { data } = sb.storage.from('jogadores').getPublicUrl(caminho);
  return { url: (data && data.publicUrl ? data.publicUrl : '') + '?v=' + Date.now() };
}
/* a tela de pagamento confirmado repergunta o plano enquanto o webhook nao chega (ver
   rf26-pagamento.js): sem isto ela ficaria a olhar para o plano que leu no arranque */
NET.carregarPlano = netCarregarPlano;
NET.vagasDoClube = netVagasDoClube;
NET.vagasPorClube = netVagasPorClube;
NET.vagaMinha = netVagaMinha;
NET.vagaPedir = netVagaPedir;
NET.vagaLargar = netVagaLargar;
NET.vagaFoto = netVagaFoto;

NET.coachAvatarGet = netCoachAvatarGet;
NET.coachAvatarSet = netCoachAvatarSet;
NET.coachAvatarRef = netCoachAvatarRef;
NET.coachAvatarRefApagar = netCoachAvatarRefApagar;
NET.coachAvatarGerar = netCoachAvatarGerar;

/* ---- TEMPO DE JOGO ----
   O painel dos sócios mostra "tempo médio por usuário" e "ativos em 7 dias", e nada no jogo
   media isso: só havia o último login, que não distingue quem entrou e saiu de quem jogou
   duas horas. Um tique por minuto de jogo REAL (aba visível e dentro do jogo, não parado na
   Home) incrementa um contador por conta/dia — uma linha por dia, não por sessão.
   Falha de rede aqui é irrelevante: perde-se um minuto de estatística, nada do jogo. */
let HB_TIMER = null;
function netStartHeartbeat(){
  if(HB_TIMER) return;
  HB_TIMER = setInterval(async ()=>{
    try{
      if(document.hidden) return;                       // aba em segundo plano não conta
      if(!sb || !SB_AUTH_USER) return;                  // deslogado não tem a quem creditar
      if(typeof CL==='undefined' || !CL) return;
      // só conta quem está DENTRO de um jogo (hub, partida, classificação…) — a landing,
      // o login e os assistentes de criação não são tempo de jogo
      const dentro = ['main','live','classif','cupclassif','cupview','cupdraw','waitround',
                      'imprensa','teamview','seatturn','seatclassif','handoff','boasvindas'];
      if(dentro.indexOf(CL.screen) < 0) return;
      await sb.rpc('rf_heartbeat', { p_modo: CL.online ? 'resenha' : 'solo' });
    }catch(e){}
  }, 60000);
}
NET.startHeartbeat = netStartHeartbeat;
netStartHeartbeat();

/* token da sessão — o seletor de patch precisa dele para listar os patches QUE A CONTA
   tem (pack_users é protegido por RLS; o patch oficial é público e vem sem token) */
NET.accessToken = async function(){
  try{ const { data:{ session } } = await sb.auth.getSession(); return session && session.access_token; }
  catch(e){ return null; }
};
/* adicionar patch por código (link ?pacote=CODIGO) — guarda na conta para aparecer no
   seletor das próximas partidas */
NET.adicionarPatch = async function(codigo){
  if(!sb || !SB_AUTH_USER) return null;
  const { data: p } = await sb.from('data_packs').select('id,codigo,nome').eq('codigo', String(codigo).toUpperCase()).maybeSingle();
  if(!p) return null;
  try{ await sb.from('pack_users').upsert({ user_id: SB_AUTH_USER.id, pack_id: p.id }); }catch(e){}
  return p;
};

NET.useSupabase = true;

