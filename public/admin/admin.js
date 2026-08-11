/* ============================================================================
   PAINEL DOS SÓCIOS — RetroFoot98
   ----------------------------------------------------------------------------
   Mesma stack do jogo: HTML/CSS/JS clássico, sem build. Fala direto com o
   Supabase — as agregações que cruzam auth.users são funções SECURITY DEFINER
   no banco, porque o painel roda no browser e NÃO pode ver a tabela de contas.

   DOIS SCHEMAS, DE PROPÓSITO:
   · admin_rf98 — o que só os sócios veem (contas do painel, convites, finanças,
     patrocinadores, kanban). `anon` não tem sequer USAGE neste schema.
   · elifoot_v3 — o schema do jogo. Só o INVENTÁRIO de anúncios mora lá
     (ad_spaces/ad_creatives/ad_events) e o batimento de tempo, porque quem os
     lê e escreve é o jogo, muitas vezes deslogado.

   QUEM ENTRA: só quem está em adm_users. A porta é adm_reivindicar_convite():
   a conta autentica normalmente (é a mesma base de contas do jogo) e só vira
   admin se o e-mail tiver convite ativo. Sem convite, o painel não abre.
   ============================================================================ */
'use strict';

const SB_URL = 'https://alxwgqvjmetjbbqtjkhx.supabase.co';
const SB_KEY = 'sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';
const SCHEMA = 'admin_rf98';      // schema padrão do painel
const SCHEMA_JOGO = 'elifoot_v3'; // inventário de anúncios e tempo de jogo
const BUCKET = 'publicidade';

let sb = null;
/* tabelas do jogo (ad_spaces, ad_creatives): mesmo client, outro schema */
const jogo = (t) => sb.schema(SCHEMA_JOGO).from(t);
let ME = null;                     // linha de adm_users
const D  = {};                     // dados carregados por página
const ST = {
  tab: 'visao', periodo: 30, authMode: 'login', authErro: '', authOk: '',
  busca: '', carregando: false, modal: null, drag: null
};

/* ============================ utilidades ============================ */
const $  = s => document.querySelector(s);
const el = (id) => document.getElementById(id);
function h(s){ return String(s==null?'':s).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function brl(centavos){
  const v = (Number(centavos)||0)/100;
  return 'R$ ' + v.toLocaleString('pt-BR',{minimumFractionDigits:0, maximumFractionDigits:0});
}
function num(n){ return (Number(n)||0).toLocaleString('pt-BR'); }
function pct(a,b){ return b>0 ? Math.round(a*100/b) : 0; }
/* minutos -> "3h 20m" (a tabela de usuários e o KPI de tempo usam o mesmo formato) */
function hm(min){
  min = Math.max(0, Math.round(Number(min)||0));
  const hh = Math.floor(min/60), mm = min%60;
  return hh ? hh+'h '+(mm?mm+'m':'') : mm+'m';
}
/* Datas do banco vêm em dois sabores: `date` ("2026-12-31") e `timestamptz`.
   new Date("2026-12-31") é meia-noite UTC — no Brasil isso é dia 30, e o painel
   mostrava a data anterior. Por isso o caso `date` é partido à mão, sem Date. */
function partes(d){
  const s = String(d);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m) return { d:m[3], m:m[2], a:m[1] };
  const x = new Date(d);
  return { d:String(x.getDate()).padStart(2,'0'), m:String(x.getMonth()+1).padStart(2,'0'), a:String(x.getFullYear()) };
}
function dma(d){ if(!d) return '—'; const p=partes(d); return p.d+'/'+p.m; }
function dmy(d){ if(!d) return '—'; const p=partes(d); return p.d+'/'+p.m+'/'+p.a; }
/* "há 3 dias" — usado em último acesso, idade da sala e envio de convite */
function ha(d){
  if(!d) return 'nunca';
  const s = (Date.now()-new Date(d).getTime())/1000;
  if(s<60) return 'agora';
  if(s<3600) return 'há '+Math.floor(s/60)+' min';
  if(s<86400) return 'há '+Math.floor(s/3600)+'h';
  const dias = Math.floor(s/86400);
  return dias===1 ? 'há 1 dia' : 'há '+dias+' dias';
}
function dias(d){ return d ? Math.floor((Date.now()-new Date(d).getTime())/86400000) : 9999; }
/* estado derivado do último acesso (regra do guia: ≤2 ativo, 3-13 parado, ≥14 perdido) */
function estadoAcesso(d){
  const n = dias(d);
  if(n<=2)  return {t:'Ativo',   c:'var(--verde2)'};
  if(n<=13) return {t:'Parado',  c:'var(--ambar)'};
  return      {t:'Perdido', c:'var(--vermelho)'};
}
/* os ids de clube do jogo (br_D_veloclube, real_D_D17, intl_506) não têm nome
   legível no banco — o catálogo de nomes vive no JS do jogo. Aqui só se limpa
   o prefixo técnico, que é o suficiente para o painel identificar o clube. */
function clube(id){
  if(!id) return '—';
  const s = String(id).split('_').pop().replace(/([a-z])([A-Z])/g,'$1 $2');
  return s.charAt(0).toUpperCase()+s.slice(1);
}
function iniciais(nome){
  const p = String(nome||'?').trim().split(/\s+/);
  return ((p[0]||'?')[0] + (p[1]? p[1][0] : '')).toUpperCase();
}
const CORES_AV = ['#4ade80','#7dd3fc','#e3b23c','#c084fc','#f0546b','#35c46a'];
function corAv(s){ let x=0; for(const c of String(s||'')) x=(x*31+c.charCodeAt(0))|0;
  return CORES_AV[Math.abs(x)%CORES_AV.length]; }

let toastT=null;
function toast(msg, erro){
  const t = el('toast'); t.textContent = msg; t.className = erro?'err':'';
  clearTimeout(toastT); toastT = setTimeout(()=>t.classList.add('hide'), 3800);
}
/* Mensagem de erro do PostgREST/Supabase em português, sem vazar SQL para a tela */
function erroMsg(e){
  const m = (e && (e.message||e.error_description||e.msg)) || 'Erro inesperado';
  if(/Invalid login/i.test(m)) return 'E-mail ou senha inválidos.';
  if(/Email not confirmed/i.test(m)) return 'Confirme o e-mail antes de entrar.';
  if(/already registered|already exists/i.test(m)) return 'Essa conta já existe. Use "Entrar".';
  if(/Acesso restrito|convite ativo|Só sócios/i.test(m)) return m;
  return m;
}

/* ============================ ligação ============================ */
async function init(){
  if(!window.supabase){ document.body.innerHTML = '<p style="padding:40px">Falha ao carregar o SDK do Supabase.</p>'; return; }
  sb = window.supabase.createClient(SB_URL, SB_KEY, {
    db:{ schema: SCHEMA }, auth:{ persistSession:true, autoRefreshToken:true }
  });
  sb.auth.onAuthStateChange((ev)=>{
    if(ev==='PASSWORD_RECOVERY'){ ST.authMode='nova-senha'; mostrarAuth(); }
  });
  const { data:{ session } } = await sb.auth.getSession();
  if(session && !session.user.is_anonymous){ await entrarNoPainel(true); }
  else mostrarAuth();
}

/* Reivindica o convite (ou confirma que a conta já é admin) e abre o painel. */
async function entrarNoPainel(silencioso){
  const token = new URLSearchParams(location.search).get('convite');
  const { data, error } = await sb.rpc('reivindicar_convite', { p_token: token });
  if(error || !data){
    ME = null;
    ST.authErro = silencioso ? '' : erroMsg(error);
    if(!silencioso) mostrarAuth();
    else { ST.authErro = erroMsg(error||{message:'Sem acesso ao painel'}); mostrarAuth(); }
    return false;
  }
  ME = data;
  el('auth').classList.add('hide');
  el('app').classList.remove('hide');
  el('me-nome').textContent = ME.nome || ME.email;
  el('me-av').textContent = iniciais(ME.nome || ME.email);
  el('me-papel').textContent = PAPEIS[ME.papel] || ME.papel;
  renderNav(); irPara(ST.tab);
  return true;
}

const PAPEIS = { socio:'Sócio · vê tudo', financeiro:'Financeiro', produto:'Produto', leitura:'Leitura' };
/* o que cada papel vê (o guia: socio=tudo, financeiro=Finanças+Publicidade,
   produto=Analytics/Usuários/Funcionalidades, leitura=tudo em modo leitura) */
const ACESSO = {
  socio:      ['visao','usuarios','jogos','analytics','financas','publicidade','features','equipa'],
  financeiro: ['visao','financas','publicidade'],
  produto:    ['visao','usuarios','jogos','analytics','features'],
  leitura:    ['visao','usuarios','jogos','analytics','financas','publicidade','features']
};
function podeVer(tab){ return (ACESSO[ME&&ME.papel] || ACESSO.leitura).includes(tab); }
function podeEditar(area){
  if(!ME) return false;
  if(ME.papel==='socio') return true;
  if(ME.papel==='financeiro') return area==='financas'||area==='publicidade';
  if(ME.papel==='produto') return area==='produto';
  return false;
}

/* ============================ autenticação (telas) ============================ */
function mostrarAuth(){
  el('app').classList.add('hide');
  el('auth').classList.remove('hide');
  el('auth-stats').innerHTML = ''; // preenchido abaixo com números públicos
  renderAuthStats();
  const f = el('auth-form');
  const err = ST.authErro ? `<div class="erro" style="margin-bottom:14px">${h(ST.authErro)}</div>` : '';
  const ok  = ST.authOk ? `<div class="ok" style="margin-bottom:14px">${h(ST.authOk)}</div>` : '';

  if(ST.authMode==='signup'){
    f.innerHTML = `<h2>Criar conta de admin</h2>
      <p class="sub">A conta só é criada se o e-mail tiver convite ativo.</p>${err}${ok}
      <div class="col">
        <label class="f">Nome<input class="f" id="a-nome" placeholder="Ex.: Rafael Moreira"></label>
        <label class="f">E-mail do convite<input class="f" id="a-email" type="email" placeholder="socio@retrofoot98.com"></label>
        <div class="g2" style="gap:12px">
          <label class="f">Senha<input class="f" id="a-senha" type="password" placeholder="••••••••"></label>
          <label class="f">Repetir<input class="f" id="a-senha2" type="password" placeholder="••••••••"></label>
        </div>
        <button class="btn" id="a-go">Criar conta</button>
        <div style="text-align:center;font-size:13px;color:var(--dim)">Já tens conta? <span class="link" data-auth="login">Entrar</span></div>
      </div>`;
    el('a-go').onclick = fazerSignup;
  } else if(ST.authMode==='recover'){
    f.innerHTML = `<h2>Recuperar acesso</h2>
      <p class="sub">Enviamos um link para você definir uma senha nova. Vale 30 minutos.</p>${err}${ok}
      <div class="col">
        <label class="f">E-mail<input class="f" id="a-email" type="email" placeholder="socio@retrofoot98.com"></label>
        <button class="btn" id="a-go">Enviar link</button>
        <div style="text-align:center;font-size:13px;color:var(--dim)"><span class="link" data-auth="login">Voltar ao login</span></div>
      </div>`;
    el('a-go').onclick = fazerRecover;
  } else if(ST.authMode==='nova-senha'){
    f.innerHTML = `<h2>Nova senha</h2>
      <p class="sub">Defina a senha nova para entrar no painel.</p>${err}${ok}
      <div class="col">
        <label class="f">Senha<input class="f" id="a-senha" type="password" placeholder="••••••••"></label>
        <label class="f">Repetir<input class="f" id="a-senha2" type="password" placeholder="••••••••"></label>
        <button class="btn" id="a-go">Salvar e entrar</button>
      </div>`;
    el('a-go').onclick = fazerNovaSenha;
  } else {
    f.innerHTML = `<h2>Entrar</h2>
      <p class="sub">Use o e-mail com que você foi convidado.</p>${err}${ok}
      <div class="col">
        <label class="f">E-mail<input class="f" id="a-email" type="email" placeholder="socio@retrofoot98.com"></label>
        <label class="f">Senha<input class="f" id="a-senha" type="password" placeholder="••••••••"></label>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px">
          <label style="display:flex;align-items:center;gap:8px;color:var(--dim)">
            <input type="checkbox" id="a-manter" checked style="accent-color:#35c46a">Manter sessão</label>
          <span class="link" data-auth="recover">Esqueci a senha</span>
        </div>
        <button class="btn" id="a-go">Entrar no painel</button>
        <div style="text-align:center;font-size:13px;color:var(--dim)">Tem um convite? <span class="link" data-auth="signup">Criar conta</span></div>
      </div>`;
    el('a-go').onclick = fazerLogin;
    const ent = e => { if(e.key==='Enter') fazerLogin(); };
    ['a-email','a-senha'].forEach(id => el(id).addEventListener('keydown', ent));
  }
  f.querySelectorAll('[data-auth]').forEach(s => s.onclick = () => {
    ST.authMode = s.dataset.auth; ST.authErro=''; ST.authOk=''; mostrarAuth();
  });
  // convite por link: já preenche o e-mail e manda direto para "criar conta"
  const tk = new URLSearchParams(location.search).get('convite');
  if(tk && ST.authMode==='login' && !sessionStorage.getItem('rf98adm:convite')){
    sessionStorage.setItem('rf98adm:convite','1');
    ST.authMode='signup'; mostrarAuth();
  }
}

/* números da coluna esquerda do login: os únicos que o painel consegue mostrar
   sem sessão de admin — o resto exige adm_is_admin() no banco. */
async function renderAuthStats(){
  const box = el('auth-stats');
  const stats = [
    ['8', 'espaços publicitários'],
    ['4', 'papéis de acesso'],
    ['6', 'meses no gráfico'],
    ['1', 'painel para os sócios']
  ];
  box.innerHTML = stats.map(([v,l]) => `<div class="auth-stat"><b>${h(v)}</b><span>${h(l)}</span></div>`).join('');
}

async function fazerLogin(){
  const email = el('a-email').value.trim(), senha = el('a-senha').value;
  if(!email || !senha){ ST.authErro='Preencha e-mail e senha.'; return mostrarAuth(); }
  el('a-go').disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  if(error){ ST.authErro = 'E-mail ou senha inválidos.'; ST.authOk=''; return mostrarAuth(); }
  ST.authErro=''; await entrarNoPainel(false);
}

async function fazerSignup(){
  const nome = el('a-nome').value.trim(), email = el('a-email').value.trim();
  const s1 = el('a-senha').value, s2 = el('a-senha2').value;
  if(!nome || !email || !s1){ ST.authErro='Preencha todos os campos.'; return mostrarAuth(); }
  if(s1 !== s2){ ST.authErro='As senhas não são iguais.'; return mostrarAuth(); }
  if(s1.length < 6){ ST.authErro='A senha precisa ter 6 caracteres ou mais.'; return mostrarAuth(); }
  el('a-go').disabled = true;
  const { data, error } = await sb.auth.signUp({ email, password:s1, options:{ data:{ name: nome } } });
  if(error){
    // conta já existe: tenta entrar direto (o convite é reivindicado a seguir)
    if(/already/i.test(error.message||'')){
      const r = await sb.auth.signInWithPassword({ email, password:s1 });
      if(r.error){ ST.authErro='Essa conta já existe. Entre com a senha dela.'; return mostrarAuth(); }
    } else { ST.authErro = erroMsg(error); return mostrarAuth(); }
  } else if(!data.session){
    ST.authMode='login'; ST.authErro='';
    ST.authOk='Conta criada. Confirme o e-mail e entre em seguida.';
    return mostrarAuth();
  }
  ST.authErro=''; await entrarNoPainel(false);
}

async function fazerRecover(){
  const email = el('a-email').value.trim();
  if(!email){ ST.authErro='Digite o e-mail.'; return mostrarAuth(); }
  el('a-go').disabled = true;
  const redirectTo = location.origin + location.pathname;
  // mesma function do jogo (Resend, template da marca); se não responder, cai no
  // e-mail padrão do Supabase em vez de deixar o sócio sem caminho de volta
  let ok = false;
  try{
    const { error } = await sb.functions.invoke('send-password-reset', { body:{ email, redirectTo } });
    ok = !error;
  }catch(e){ ok = false; }
  if(!ok){ try{ await sb.auth.resetPasswordForEmail(email, { redirectTo }); ok = true; }catch(e){} }
  ST.authErro=''; ST.authOk = ok ? 'Link enviado. Confira a caixa de entrada.' : '';
  if(!ok) ST.authErro = 'Não foi possível enviar o link agora.';
  mostrarAuth();
}

async function fazerNovaSenha(){
  const s1 = el('a-senha').value, s2 = el('a-senha2').value;
  if(s1 !== s2 || s1.length < 6){ ST.authErro='Senhas diferentes ou curtas demais.'; return mostrarAuth(); }
  el('a-go').disabled = true;
  const { error } = await sb.auth.updateUser({ password: s1 });
  if(error){ ST.authErro = erroMsg(error); return mostrarAuth(); }
  ST.authErro=''; history.replaceState(null,'',location.pathname);
  await entrarNoPainel(false);
}

/* ============================ navegação ============================ */
const NAV = [
  { id:'visao',       ic:'◈', label:'Visão geral',    tit:'Visão geral',        sub:'Como o projeto está a andar' },
  { id:'usuarios',    ic:'◍', label:'Usuários',       tit:'Usuários',           sub:'Contas, plano e tempo de jogo' },
  { id:'jogos',       ic:'⚑', label:'Resenhas & solo',tit:'Resenhas & solo',    sub:'Salas abertas, convites e saves' },
  { id:'analytics',   ic:'◔', label:'Analytics',      tit:'Analytics',          sub:'Visitas, contas e funil' },
  { id:'financas',    ic:'▤', label:'Finanças',       tit:'Finanças',           sub:'Receita, despesa e fecho do mês' },
  { id:'publicidade', ic:'◫', label:'Publicidade',    tit:'Publicidade',        sub:'Patrocinadores e espaços do jogo' },
  { id:'features',    ic:'✦', label:'Funcionalidades',tit:'Funcionalidades',    sub:'O que os treinadores pedem' },
  { id:'equipa',      ic:'☗', label:'Equipe admin',   tit:'Equipe admin',       sub:'Quem entra no painel' }
];
function renderNav(){
  el('nav').innerHTML = NAV.filter(n=>podeVer(n.id)).map(n =>
    `<div class="nav-i ${n.id===ST.tab?'on':''}" data-tab="${n.id}">
       <span class="ic">${n.ic}</span><span class="lb">${h(n.label)}</span>
       <span class="tag" id="tag-${n.id}"></span></div>`).join('');
  el('nav').querySelectorAll('[data-tab]').forEach(d => d.onclick = () => irPara(d.dataset.tab));
  el('periodos').innerHTML = [[7,'7 dias'],[30,'30 dias'],[365,'Ano']].map(([v,l]) =>
    `<span class="${ST.periodo===v?'on':''}" data-per="${v}">${l}</span>`).join('');
  el('periodos').querySelectorAll('[data-per]').forEach(s => s.onclick = () => {
    ST.periodo = +s.dataset.per; renderNav(); irPara(ST.tab, true);
  });
}
function irPara(tab, forcar){
  if(!podeVer(tab)) tab = 'visao';
  ST.tab = tab; renderNav();
  const n = NAV.find(x=>x.id===tab);
  el('pg-tit').textContent = n.tit; el('pg-sub').textContent = n.sub;
  el('page').innerHTML = '<div class="vazio">Carregando…</div>';
  const fn = { visao:pgVisao, usuarios:pgUsuarios, jogos:pgJogos, analytics:pgAnalytics,
               financas:pgFinancas, publicidade:pgPublicidade, features:pgFeatures, equipa:pgEquipa }[tab];
  fn(forcar).catch(e => { el('page').innerHTML = `<div class="erro">${h(erroMsg(e))}</div>`; });
}

/* ============================ VISÃO GERAL ============================ */
async function pgVisao(){
  const { data, error } = await sb.rpc('overview', { p_dias: ST.periodo });
  if(error) throw error;
  D.overview = data;
  const meses = data.meses||[], mesAtual = meses[meses.length-1] || {receita:0,despesa:0,lucro:0};
  const meta = Number(data.meta_lucro)||0;
  const maxBarra = Math.max(1, ...meses.map(m=>Math.max(+m.receita,+m.despesa)), meta);
  const eng = data.engajamento||{};

  const kpis = [
    { l:'Usuários no jogo', v:num(data.usuarios), d:`${num(data.ativos7)} ativos em 7 dias` },
    { l:'Ativos (7 dias)',  v:num(data.ativos7),  d:`${num(data.retorno7)} voltaram noutro dia` },
    { l:'Tempo médio por usuário', v:hm(data.minutos_medio), d:`${hm(data.minutos_total)} no total` },
    { l:'Lucro do mês', v:brl(mesAtual.lucro),
      d: meta ? (mesAtual.lucro>=meta ? 'acima da meta '+brl(meta) : 'abaixo da meta '+brl(meta)) : 'sem meta definida',
      c: mesAtual.lucro>=0 ? 'var(--verde2)' : 'var(--vermelho)' }
  ];

  const barras = meses.map(m => `
    <div class="chcol">
      <div class="cap" style="color:${m.lucro>=0?'var(--verde2)':'var(--vermelho)'}">${brl(m.lucro)}</div>
      <div class="chpair">
        <i class="chrec"  style="height:${Math.round(m.receita*100/maxBarra)}%"></i>
        <i class="chdesp" style="height:${Math.round(m.despesa*100/maxBarra)}%"></i>
      </div>
    </div>`).join('');

  const catLinha = (c, total, cor) => `
    <div style="display:grid;grid-template-columns:110px 1fr 86px;align-items:center;gap:10px">
      <span style="font-size:12.5px;color:var(--fg2)">${h(catNome(c.nome))}</span>
      <span class="bar"><i style="width:${pct(c.valor,total)}%;background:${cor}"></i></span>
      <span class="mono" style="font-size:12px;text-align:right">${brl(c.valor)}</span>
    </div>`;
  const totRec = (data.cats_receita||[]).reduce((a,c)=>a+ +c.valor, 0) || 1;
  const totDesp= (data.cats_despesa||[]).reduce((a,c)=>a+ +c.valor, 0) || 1;

  const engBarras = [
    ['Salas de Resenha no período', eng.salas, Math.max(eng.salas,1)],
    ['Saves solo gravados', eng.solos, Math.max(eng.solos,1)],
    ['Treinadores que sentaram numa sala', eng.assentos, Math.max(eng.assentos,1)],
    ['Convites enviados', eng.convites, Math.max(eng.convites,1)]
  ];
  const maxEng = Math.max(1, ...engBarras.map(b=>+b[1]||0));

  el('page').innerHTML = `
    <div class="g4">${kpis.map(k=>kpiHTML(k)).join('')}</div>
    <div style="display:grid;grid-template-columns:1.45fr 1fr;gap:16px">
      <div class="card card-p">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
          <div><div class="tt">Receita, despesa e lucro</div>
            <div class="st">Últimos 6 meses${meta?' · meta de lucro '+brl(meta):''}</div></div>
          <div class="leg">
            <span><i style="background:#35c46a"></i>Receita</span>
            <span><i style="background:#f0546b"></i>Despesa</span>
            <span><i style="background:#e3b23c"></i>Lucro</span></div>
        </div>
        <div class="chart">
          ${meta?`<div class="meta" style="bottom:${Math.round(meta*100/maxBarra)}%"></div>`:''}
          ${barras || '<div class="vazio">Sem lançamentos ainda.</div>'}
        </div>
        <div class="chlabels">${meses.map(m=>`<div>${h(m.rotulo)}</div>`).join('')}</div>
      </div>
      <div class="card card-p" style="display:flex;flex-direction:column;gap:16px">
        <div class="tt">Onde entra e onde sai — este mês</div>
        <div style="display:flex;flex-direction:column;gap:9px">
          <div style="font-size:11px;font-weight:700;color:var(--dim2);letter-spacing:.6px">RECEITAS</div>
          ${(data.cats_receita||[]).map(c=>catLinha(c,totRec,'var(--verde)')).join('') || '<div class="st">Sem receitas neste mês.</div>'}
        </div>
        <div style="display:flex;flex-direction:column;gap:9px">
          <div style="font-size:11px;font-weight:700;color:var(--dim2);letter-spacing:.6px">DESPESAS</div>
          ${(data.cats_despesa||[]).map(c=>catLinha(c,totDesp,'var(--vermelho)')).join('') || '<div class="st">Sem despesas neste mês.</div>'}
        </div>
        <div style="margin-top:auto;background:var(--verde-bg);border:1px solid var(--verde-bd);border-radius:10px;
             padding:12px 14px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:700;color:var(--fg2)">Lucro do mês</span>
          <span class="mono" style="font-size:19px;font-weight:700;color:${mesAtual.lucro>=0?'var(--verde2)':'var(--vermelho)'}">${brl(mesAtual.lucro)}</span>
        </div>
      </div>
    </div>
    <div class="g2">
      <div class="card card-p">
        <div class="tt" style="margin-bottom:14px">Ranking de pontuação</div>
        ${(data.ranking||[]).length ? (data.ranking||[]).map((r,i)=>`
          <div style="display:grid;grid-template-columns:26px 1fr 130px 88px;align-items:center;gap:10px;padding:8px">
            <span class="mono" style="font-size:12px;font-weight:700;color:${i<3?'var(--verde2)':'var(--dim2)'}">${i+1}</span>
            <span style="font-size:13px;font-weight:600">${h(r.tecnico)}</span>
            <span style="font-size:12px;color:var(--dim2)">${h(clube(r.clube))}</span>
            <span class="mono" style="font-size:13px;font-weight:700;text-align:right">${num(r.pontos)}</span>
          </div>`).join('') : '<div class="vazio">Ninguém pontuou ainda.</div>'}
      </div>
      <div class="card card-p" style="display:flex;flex-direction:column;gap:16px">
        <div class="tt">Engajamento no período</div>
        ${engBarras.map(([l,v]) => `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px">
              <span style="color:var(--fg2);font-weight:600">${h(l)}</span>
              <span class="mono" style="color:var(--dim)">${num(v)}</span></div>
            <span class="bar"><i style="width:${pct(v,maxEng)}%"></i></span>
          </div>`).join('')}
        <div style="margin-top:auto;font-size:12.5px;color:var(--dim);line-height:1.65;border-top:1px solid var(--bd);padding-top:14px">
          Tempo de jogo vem do batimento do próprio jogo (um minuto por minuto jogado, por conta).
          Contas sem tempo registrado ainda não jogaram depois de a medição entrar no ar.
        </div>
      </div>
    </div>`;
}
function kpiHTML(k){
  return `<div class="kpi"><div class="l">${h(k.l)}</div>
    <div class="v" ${k.c?`style="color:${k.c}"`:''}>${k.v}</div>
    <div class="d" ${k.dc?`style="color:${k.dc}"`:''}>${h(k.d||'')}</div></div>`;
}
const CAT_NOMES = { softwares:'Softwares', creditos_ia:'Créditos de IA', banco_dados:'Banco de dados',
  servidor:'Servidor', publicidade:'Publicidade', assinaturas:'Assinaturas', aportes:'Aportes' };
function catNome(c){ return CAT_NOMES[c] || c; }
const CAT_TAG = { softwares:'t-azul', creditos_ia:'t-roxo', banco_dados:'t-warn', servidor:'t-dim',
  publicidade:'t-azul', assinaturas:'t-ok', aportes:'t-roxo' };

/* ============================ USUÁRIOS ============================ */
async function pgUsuarios(){
  const { data, error } = await sb.rpc('usuarios', { p_busca: ST.busca || null, p_limite: 500 });
  if(error) throw error;
  D.usuarios = data || [];
  const us = D.usuarios;
  const pagos = us.filter(u=>u.plano==='pago');
  const mrr = pagos.reduce((a,u)=>a+ +u.mrr, 0);
  const minutos = us.reduce((a,u)=>a+ +u.minutos, 0);

  el('page').innerHTML = `
    <div class="g4">
      ${kpiHTML({l:'Contas totais', v:num(us.length), d:`${num(us.filter(u=>dias(u.ultimo_acesso)<=2).length)} ativas hoje/ontem`})}
      ${kpiHTML({l:'Plano grátis',  v:num(us.length-pagos.length), d:'sem cobrança ligada'})}
      ${kpiHTML({l:'Plano pago',    v:num(pagos.length), d:`${brl(mrr)} de MRR`})}
      ${kpiHTML({l:'Tempo total jogado', v:hm(minutos), d:'somado de todas as contas'})}
    </div>
    <div class="card" style="overflow:hidden">
      <div class="card-h">
        <b>Usuários no jogo</b>
        <input class="busca" id="u-busca" placeholder="Procurar técnico, clube ou e-mail…" value="${h(ST.busca)}">
        <span class="mono" style="font-size:12px;color:var(--dim2)">${num(us.length)} contas</span>
      </div>
      <div class="rowh" style="grid-template-columns:1.6fr .7fr .9fr .8fr .9fr .8fr">
        <span>Técnico</span><span>Plano</span><span style="text-align:right">Tempo de jogo</span>
        <span style="text-align:right">Pontos</span><span style="text-align:right">Últ. acesso</span>
        <span style="text-align:center">Estado</span>
      </div>
      ${us.length ? us.map(u => {
        const e = estadoAcesso(u.ultimo_acesso);
        return `<div class="row" style="grid-template-columns:1.6fr .7fr .9fr .8fr .9fr .8fr">
          <span style="display:flex;align-items:center;gap:10px;min-width:0">
            <i class="av" style="width:26px;height:26px;background:${corAv(u.nome)};color:#0c1210;font-size:11px">${h(iniciais(u.nome))}</i>
            <span style="min-width:0"><b style="display:block;font-size:13px;font-weight:600">${h(u.nome)}</b>
            <small style="font-size:11.5px;color:var(--dim2)">${h(clube(u.clube))}</small></span>
          </span>
          <span class="tag ${u.plano==='pago'?'t-ok':'t-dim'}" style="justify-self:start">${u.plano==='pago'?'pago':'grátis'}</span>
          <span class="mono" style="font-size:12.5px;text-align:right">${hm(u.minutos)}</span>
          <span class="mono" style="font-size:12.5px;text-align:right">${num(u.pontos)}</span>
          <span class="mono" style="font-size:12.5px;text-align:right;color:var(--dim2)">${h(ha(u.ultimo_acesso))}</span>
          <span style="justify-self:center;display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dim)">
            <i style="width:7px;height:7px;border-radius:99px;background:${e.c};display:block"></i>${e.t}</span>
        </div>`;
      }).join('') : '<div class="vazio">Nenhuma conta encontrada.</div>'}
    </div>`;
  const b = el('u-busca');
  let t=null;
  b.oninput = () => { clearTimeout(t); t = setTimeout(()=>{ ST.busca = b.value.trim(); pgUsuarios(); }, 350); };
  b.focus(); b.setSelectionRange(b.value.length, b.value.length);
}

/* ============================ RESENHAS & SOLO ============================ */
async function pgJogos(){
  const { data, error } = await sb.rpc('jogos');
  if(error) throw error;
  D.jogos = data;
  const salas = data.salas||[], conv = data.convites||[], solos = data.solos||[], pedidos = data.pedidos||[];
  const aceites = conv.filter(c=>c.estado==='aceito').length;

  el('page').innerHTML = `
    <div class="g3">
      ${kpiHTML({l:'Resenhas abertas', v:num(salas.length), d:`${num(salas.filter(s=>s.phase==='running').length)} em jogo`})}
      ${kpiHTML({l:'Convites (30 dias)', v:num(conv.length), d: conv.length? `${pct(aceites,conv.length)}% aceitos` : 'nenhum enviado'})}
      ${kpiHTML({l:'Jogos solo', v:num(solos.length), d:`${num(data.solos_parados)} parados há 14 dias ou mais`})}
    </div>
    <div style="display:grid;grid-template-columns:1.05fr 1fr;gap:16px">
      <div class="card" style="overflow:hidden">
        <div class="card-h"><b>Resenhas abertas</b></div>
        <div class="rowh" style="grid-template-columns:.9fr 1.2fr .8fr .8fr;border-bottom:none">
          <span>Sala</span><span>Anfitrião</span><span style="text-align:center">Treinadores</span><span style="text-align:right">Aberta há</span>
        </div>
        ${salas.length ? salas.map(s=>`
          <div class="row" style="grid-template-columns:.9fr 1.2fr .8fr .8fr;padding:10px 20px">
            <span class="mono" style="font-size:12px;color:var(--verde2)">${h(s.id)}</span>
            <span style="font-size:12.5px">${h(s.anfitriao)}</span>
            <span class="mono" style="font-size:12.5px;font-weight:700;text-align:center;color:${s.humanos>=s.lugares?'var(--verde2)':'var(--fg)'}">${s.humanos}/${s.lugares}</span>
            <span class="mono" style="font-size:12.5px;text-align:right;color:var(--dim2)">${h(ha(s.created_at))}</span>
          </div>`).join('') : '<div class="vazio">Nenhuma sala aberta.</div>'}
      </div>
      <div class="card" style="overflow:hidden">
        <div class="card-h"><b>Convites enviados</b>
          <span style="font-size:12px;color:var(--dim2);font-weight:500">${conv.length?pct(aceites,conv.length)+'% aceitos':'—'}</span></div>
        <div class="rowh" style="grid-template-columns:1.4fr .8fr .7fr .9fr;border-bottom:none">
          <span>Destino</span><span>Canal</span><span style="text-align:right">Enviado</span><span style="text-align:center">Estado</span>
        </div>
        ${conv.length ? conv.map(c=>`
          <div class="row" style="grid-template-columns:1.4fr .8fr .7fr .9fr;padding:10px 20px">
            <span style="font-size:12.5px">${h(mascara(c.destino))}</span>
            <span style="font-size:12.5px;color:var(--dim)">Sala ${h(c.game_id)}</span>
            <span class="mono" style="font-size:12.5px;text-align:right;color:var(--dim2)">${h(ha(c.created_at))}</span>
            <span class="tag ${c.estado==='aceito'?'t-ok':c.estado==='pendente'?'t-warn':'t-dim'}" style="justify-self:center">${h(c.estado)}</span>
          </div>`).join('') : '<div class="vazio">Nenhum convite nos últimos 30 dias.</div>'}
        ${pedidos.length ? `<div class="card-h" style="border-top:1px solid var(--bd)"><b>Pedidos para entrar</b></div>` +
          pedidos.map(p=>`
          <div class="row" style="grid-template-columns:1.4fr .8fr .7fr .9fr;padding:10px 20px">
            <span style="font-size:12.5px">${h(p.destino||'—')}</span>
            <span style="font-size:12.5px;color:var(--dim)">Sala ${h(p.game_id)}</span>
            <span class="mono" style="font-size:12.5px;text-align:right;color:var(--dim2)">${h(ha(p.created_at))}</span>
            <span class="tag ${p.estado==='aceito'?'t-ok':p.estado==='pendente'?'t-warn':'t-dim'}" style="justify-self:center">${h(p.estado)}</span>
          </div>`).join('') : ''}
      </div>
    </div>
    <div class="card" style="overflow:hidden">
      <div class="card-h"><b>Jogos abertos no modo solo</b></div>
      <div class="rowh" style="grid-template-columns:1.3fr 1.1fr .8fr .8fr 1fr;border-bottom:none">
        <span>Técnico</span><span>Clube</span><span style="text-align:center">Divisão</span>
        <span style="text-align:center">Temporada</span><span style="text-align:right">Último salvamento</span>
      </div>
      ${solos.length ? solos.map(s=>{
        const n = dias(s.updated_at);
        const cor = n<=2?'var(--verde2)':n<=13?'var(--ambar)':'var(--vermelho)';
        return `<div class="row" style="grid-template-columns:1.3fr 1.1fr .8fr .8fr 1fr;padding:10px 20px">
          <span style="font-size:12.5px;font-weight:600">${h(s.tecnico||s.save_name)}</span>
          <span style="font-size:12.5px;color:var(--dim)">${h(clube(s.clube))}</span>
          <span class="mono" style="font-size:12.5px;text-align:center">${h(s.divisao||'—')}</span>
          <span class="mono" style="font-size:12.5px;text-align:center">${h(s.temporada||'—')}</span>
          <span class="mono" style="font-size:12.5px;text-align:right;color:${cor}">${h(ha(s.updated_at))}</span>
        </div>`;
      }).join('') : '<div class="vazio">Nenhum save solo.</div>'}
    </div>`;
}
/* e-mail/telefone de terceiros no painel: mostra o suficiente para identificar,
   não o contato inteiro */
function mascara(s){
  if(!s) return '—';
  const [u,d] = String(s).split('@');
  if(!d) return s.replace(/\d(?=\d{4})/g,'•');
  return u.slice(0,2) + '•••@' + d;
}

/* ============================ ANALYTICS ============================ */
async function pgAnalytics(){
  const { data, error } = await sb.rpc('analytics', { p_dias: Math.min(ST.periodo,60) });
  if(error) throw error;
  D.analytics = data;
  const ds = data.dias||[], f = data.funil||{}, ga4 = data.ga4;
  const maxS = Math.max(1, ...ds.map(d=>+d.sessoes), ...ds.map(d=>+d.contas));
  const totalContas = ds.reduce((a,d)=>a+ +d.contas,0);
  const totalSes = ds.reduce((a,d)=>a+ +d.sessoes,0);

  // Funil: largura pela RAIZ da percentagem, senão as últimas etapas desaparecem
  const base = ga4 && ga4.visitas ? +ga4.visitas : +f.contas;
  const etapas = [
    ga4 && ga4.visitas ? {n:'Visitas ao site', v:+ga4.visitas, nota:'GA4'} : null,
    { n:'Contas criadas', v:+f.contas, nota:'base do jogo' },
    { n:'Primeiro jogo concluído', v:+f.jogaram, nota:'tem save solo ou assento numa sala' },
    { n:'Plano pago', v:+f.pagos, nota:'marcado em Usuários' }
  ].filter(Boolean);

  el('page').innerHTML = `
    <div class="g4">
      ${kpiHTML({l:'Sessões (período)', v:num(totalSes), d:'contas com tempo de jogo registrado'})}
      ${kpiHTML({l:'Contas criadas', v:num(totalContas), d:`${num(f.contas)} no total`})}
      ${kpiHTML({l:'Chegaram a jogar', v:num(f.jogaram), d:`${pct(f.jogaram,f.contas)}% das contas`})}
      ${kpiHTML({l:'Plano pago', v:num(f.pagos), d:`${pct(f.pagos,f.contas)}% de conversão`})}
    </div>
    <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:16px">
      <div class="card card-p">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div><div class="tt">Atividade e contas criadas</div>
            <div class="st">Por dia · últimos ${ds.length} dias</div></div>
          <div class="leg"><span><i style="background:#35c46a"></i>Ativos</span>
            <span><i style="background:#e3b23c"></i>Contas criadas</span></div>
        </div>
        <div class="chart" style="height:210px;gap:9px">
          ${ds.map(d=>`
            <div class="chcol" title="${h(d.dia)} · ${d.sessoes} ativos · ${d.contas} contas">
              <div style="width:100%;display:flex;flex-direction:column;justify-content:flex-end;height:100%">
                <div style="width:100%;border-radius:4px 4px 0 0;background:linear-gradient(180deg,#4ade80,#1f7a45);height:${Math.round(d.sessoes*100/maxS)}%"></div>
                <div style="width:100%;background:#e3b23c;height:${Math.round(d.contas*100/maxS)}%"></div>
              </div>
            </div>`).join('')}
        </div>
        <div class="chlabels" style="gap:9px">${ds.map(d=>`<div class="mono" style="font-size:10.5px;color:var(--dim3)">${h(String(d.dia).slice(8))}</div>`).join('')}</div>
      </div>
      <div class="card card-p">
        <div class="tt" style="margin-bottom:4px">Funil de conversão</div>
        <div class="st" style="margin-bottom:16px">${ga4&&ga4.visitas?'Visita → conta → primeiro jogo → pago':'Conta → primeiro jogo → pago'}</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${etapas.map(e=>{
            const p = base? e.v*100/base : 0;
            return `<div>
              <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px">
                <span style="font-weight:600;color:var(--fg2)">${h(e.n)}</span>
                <span class="mono" style="color:var(--dim)">${num(e.v)} · ${p.toFixed(1)}%</span></div>
              <span style="height:26px;border-radius:7px;background:var(--bd3);display:block">
                <i style="display:block;height:100%;border-radius:7px;background:var(--verde);width:${Math.max(4,Math.sqrt(p/100)*100)}%"></i></span>
              <div style="font-size:11.5px;color:var(--dim3);margin-top:5px">${h(e.nota)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
    ${ga4 ? renderGA4(ga4) : `
    <div class="card card-p">
      <div class="tt" style="margin-bottom:6px">Origem do tráfego, páginas e dispositivo (GA4)</div>
      <div class="st" style="line-height:1.7">
        Estes três blocos vêm da Google Analytics Data API, que precisa de uma chave de serviço no
        servidor — o painel roda no browser e não pode guardar essa chave. Enquanto a ligação não
        existir, o painel mostra só o que a base do jogo sabe (acima).<br>
        Assim que houver um job a escrever o snapshot em <code class="mono">adm_config['ga4_snapshot']</code>,
        estes blocos aparecem sozinhos. Formato esperado:
        <code class="mono">{visitas, fontes:[{nome,pct}], paginas:[{url,n}], device:[{l,v}]}</code>.
      </div>
    </div>`}`;
}
function renderGA4(ga4){
  const linha = (l,v,bar) => `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bd3)">
    <span style="font-size:12.5px;color:var(--fg2)">${h(l)}</span>
    <span class="mono" style="font-size:12px;color:var(--dim)">${h(v)}</span></div>`;
  return `<div class="g3">
    <div class="card card-p"><div class="tt" style="margin-bottom:14px">Origem do tráfego</div>
      ${(ga4.fontes||[]).map(f=>linha(f.nome, f.pct+'%')).join('') || '<div class="st">—</div>'}</div>
    <div class="card card-p"><div class="tt" style="margin-bottom:14px">Páginas mais vistas</div>
      ${(ga4.paginas||[]).map(p=>linha(p.url, num(p.n))).join('') || '<div class="st">—</div>'}</div>
    <div class="card card-p"><div class="tt" style="margin-bottom:14px">Dispositivo e retenção</div>
      ${(ga4.device||[]).map(d=>linha(d.l, d.v)).join('') || '<div class="st">—</div>'}</div>
  </div>`;
}

/* ============================ FINANÇAS ============================ */
const CATS_DESPESA = ['softwares','creditos_ia','banco_dados','servidor'];
const CATS_RECEITA = ['publicidade','assinaturas','aportes'];

async function pgFinancas(){
  // recorrência mensal/anual materializa os meses em falta antes de somar
  try{ await sb.rpc('gerar_recorrencias'); }catch(e){}
  const [ov, lanc] = await Promise.all([
    sb.rpc('overview', { p_dias: ST.periodo }),
    sb.from('adm_lancamentos').select('*').order('data', { ascending:false }).limit(400)
  ]);
  if(ov.error) throw ov.error;
  if(lanc.error) throw lanc.error;
  D.overview = ov.data; D.lancamentos = lanc.data||[];

  const mes = new Date().toISOString().slice(0,7);
  const doMes = D.lancamentos.filter(l => String(l.data).slice(0,7)===mes);
  const desp = doMes.filter(l=>l.tipo==='despesa');
  const rec  = doMes.filter(l=>l.tipo==='receita');
  const tDesp = desp.reduce((a,l)=>a+ +l.valor_centavos,0);
  const tRec  = rec.reduce((a,l)=>a+ +l.valor_centavos,0);
  const lucro = tRec - tDesp;
  const ativos = +ov.data.ativos7 || 0;
  const meses = ov.data.meses||[];
  const maxL = Math.max(1, ...meses.map(m=>Math.abs(+m.lucro)));
  const caixa = +ov.data.caixa || 0;
  const custoFixo = tDesp || 1;
  const editar = podeEditar('financas');

  const tabela = (lista, cor) => lista.length ? lista.map(l=>`
    <div class="row" style="grid-template-columns:.6fr 1.6fr 1fr .8fr ${editar?'28px':''}">
      <span class="mono" style="font-size:12px;color:var(--dim2)">${dma(l.data)}</span>
      <span style="font-size:12.5px">${h(l.descricao)}${l.origem_id?' <small style="color:var(--dim3)">(recorrente)</small>':''}</span>
      <span class="tag ${CAT_TAG[l.categoria]||'t-dim'}" style="justify-self:start">${h(catNome(l.categoria))}</span>
      <span class="mono" style="font-size:12.5px;font-weight:700;text-align:right;color:${cor}">${brl(l.valor_centavos)}</span>
      ${editar?`<span class="link" data-del-lanc="${l.id}" title="Apagar" style="color:var(--dim3);text-align:center">✕</span>`:''}
    </div>`).join('') : '<div class="vazio">Nada lançado neste mês.</div>';

  el('page').innerHTML = `
    <div class="g4">
      ${kpiHTML({l:'Receita do mês', v:brl(tRec), d:`${rec.length} lançamentos`, c:'var(--verde2)'})}
      ${kpiHTML({l:'Despesa do mês', v:brl(tDesp), d:`${desp.length} lançamentos`, c:'var(--vermelho)'})}
      ${kpiHTML({l:'Lucro do mês', v:brl(lucro), d: tRec? `margem de ${pct(lucro,tRec)}%` : 'sem receita', c: lucro>=0?'var(--verde2)':'var(--vermelho)'})}
      ${kpiHTML({l:'Por usuário ativo', v: ativos? brl(Math.round(tDesp/ativos)) : '—',
                 d: ativos? `receita ${brl(Math.round(tRec/ativos))} por ativo` : 'sem ativos no período'})}
    </div>
    <div class="card card-p">
      <div class="tt" style="margin-bottom:16px">Lucro por mês</div>
      <div style="height:130px;display:flex;align-items:flex-end;gap:16px">
        ${meses.map(m=>`
          <div class="chcol">
            <div class="cap" style="color:var(--dim)">${brl(m.lucro)}</div>
            <div style="width:46%;border-radius:6px 6px 0 0;height:${Math.round(Math.abs(m.lucro)*100/maxL)}%;
                 background:${m.lucro>=0?'var(--verde)':'var(--vermelho)'}"></div>
            <div style="font-size:12px;color:var(--dim);font-weight:600">${h(m.rotulo)}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="g2">
      <div class="card" style="overflow:hidden">
        <div class="card-h">
          <b>Despesas do mês</b>
          <span class="mono" style="font-size:13px;color:var(--vermelho)">${brl(tDesp)}</span>
          ${editar?'<button class="btn btn-sm" id="f-nova-desp">+ Despesa</button>':''}
        </div>
        ${tabela(desp,'var(--vermelho)')}
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card" style="overflow:hidden">
          <div class="card-h">
            <b>Receitas do mês</b>
            <span class="mono" style="font-size:13px;color:var(--verde2)">${brl(tRec)}</span>
            ${editar?'<button class="btn btn-sm" id="f-nova-rec">+ Receita</button>':''}
          </div>
          ${tabela(rec,'var(--verde2)')}
        </div>
        <div class="card card-p">
          <div class="tt" style="margin-bottom:12px">Fechamento do mês</div>
          <div style="display:flex;flex-direction:column;gap:9px;font-size:13px">
            <div style="display:flex;justify-content:space-between;color:var(--fg2)"><span>Receita</span><b class="mono" style="color:var(--verde2)">${brl(tRec)}</b></div>
            <div style="display:flex;justify-content:space-between;color:var(--fg2)"><span>Despesa</span><b class="mono" style="color:var(--vermelho)">${brl(tDesp)}</b></div>
            <div style="display:flex;justify-content:space-between;border-top:1px solid var(--bd);padding-top:10px"><b>Lucro</b><b class="mono" style="font-size:16px">${brl(lucro)}</b></div>
            <div style="font-size:12px;color:var(--dim2);line-height:1.6;margin-top:2px">
              Caixa do projeto: <b class="mono" style="color:var(--fg2)">${brl(caixa)}</b>
              ${caixa? `— cobre ${Math.floor(caixa/custoFixo)} ${Math.floor(caixa/custoFixo)===1?'mês':'meses'} de custo no ritmo atual.` : '— ainda não informado.'}
              ${editar?' <span class="link" id="f-caixa">editar</span>':''}
            </div>
            <div style="font-size:12px;color:var(--dim2)">
              Meta de lucro: <b class="mono" style="color:var(--fg2)">${brl(ov.data.meta_lucro)}</b>
              ${editar?' <span class="link" id="f-meta">editar</span>':''}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  if(editar){
    el('f-nova-desp').onclick = () => modalLancamento('despesa');
    el('f-nova-rec').onclick  = () => modalLancamento('receita');
    el('f-caixa').onclick = () => editarConfig('caixa_centavos','Caixa do projeto (R$)', caixa);
    el('f-meta').onclick  = () => editarConfig('meta_lucro_centavos','Meta de lucro mensal (R$)', +ov.data.meta_lucro);
    document.querySelectorAll('[data-del-lanc]').forEach(b => b.onclick = async () => {
      if(!confirm('Apagar este lançamento?')) return;
      const { error } = await sb.from('adm_lancamentos').delete().eq('id', b.dataset.delLanc);
      if(error) return toast(erroMsg(error), true);
      toast('Lançamento apagado.'); pgFinancas();
    });
  }
}
async function editarConfig(chave, rotulo, atual){
  const v = prompt(rotulo, String((atual||0)/100));
  if(v==null) return;
  const centavos = Math.round(parseFloat(String(v).replace(/\./g,'').replace(',','.'))*100);
  if(isNaN(centavos)) return toast('Valor inválido.', true);
  const { error } = await sb.from('adm_config').upsert({ chave, valor: centavos });
  if(error) return toast(erroMsg(error), true);
  toast('Salvo.'); pgFinancas();
}

function modalLancamento(tipo){
  const cats = tipo==='despesa' ? CATS_DESPESA : CATS_RECEITA;
  abrirModal(`
    <h3>Adicionar ${tipo}</h3>
    <div class="col">
      <label class="f">Descrição<input class="f" id="l-desc" placeholder="${tipo==='despesa'?'Ex.: Renovação Figma anual':'Ex.: Patrocínio Copa Resenha'}"></label>
      <div class="g2" style="gap:12px">
        <label class="f">Categoria<select class="f" id="l-cat">${cats.map(c=>`<option value="${c}">${h(catNome(c))}</option>`).join('')}</select></label>
        <label class="f">Data<input class="f" id="l-data" type="date" value="${new Date().toISOString().slice(0,10)}"></label>
      </div>
      <div class="g2" style="gap:12px">
        <label class="f">Valor (R$)<input class="f mono" id="l-valor" placeholder="0,00" inputmode="decimal"></label>
        <label class="f">Recorrência<select class="f" id="l-rec">
          <option value="uma_vez">Uma vez</option><option value="mensal">Mensal</option><option value="anual">Anual</option>
        </select></label>
      </div>
      <div class="acoes">
        <button class="btn" id="l-ok">Salvar ${tipo}</button>
        <button class="btn btn-ghost" data-fechar>Cancelar</button>
      </div>
    </div>`);
  el('l-ok').onclick = async () => {
    const desc = el('l-desc').value.trim();
    const valor = Math.round(parseFloat(el('l-valor').value.replace(/\./g,'').replace(',','.'))*100);
    if(!desc || isNaN(valor) || valor<0) return toast('Preencha a descrição e um valor válido.', true);
    const { error } = await sb.from('adm_lancamentos').insert({
      tipo, data: el('l-data').value, descricao: desc, categoria: el('l-cat').value,
      valor_centavos: valor, recorrencia: el('l-rec').value, criado_por: (await sb.auth.getUser()).data.user.id
    });
    if(error) return toast(erroMsg(error), true);
    fecharModal(); toast('Lançamento salvo.'); pgFinancas();
  };
}

/* ============================ PUBLICIDADE ============================ */
async function pgPublicidade(){
  const { data, error } = await sb.rpc('publicidade');
  if(error) throw error;
  D.pub = data;
  const espacos = data.espacos||[], patros = data.patrocinadores||[];
  const noAr = espacos.filter(e=>e.criativo).length;
  const editar = podeEditar('publicidade');
  const ctr = data.imp30 ? (data.clq30*100/data.imp30).toFixed(2)+'%' : '—';

  // que espaços cada patrocinador ocupa hoje (para a coluna "Espaços")
  const porPatro = {};
  espacos.forEach(e => { if(e.criativo && e.criativo.patrocinador){
    (porPatro[e.criativo.patrocinador] = porPatro[e.criativo.patrocinador] || []).push(e.nome); } });

  el('page').innerHTML = `
    <div class="g4">
      ${kpiHTML({l:'Espaços ocupados', v:`${noAr}/${espacos.length}`, d:`${espacos.length-noAr} livres para vender`})}
      ${kpiHTML({l:'Impressões (30 dias)', v:num(data.imp30), d:`${num(data.clq30)} cliques`})}
      ${kpiHTML({l:'CTR (30 dias)', v:ctr, d:'cliques ÷ impressões'})}
      ${kpiHTML({l:'Contratado por mês', v:brl(data.receita_mes), d:`${patros.length} patrocinadores`, c:'var(--verde2)'})}
    </div>

    <div class="card" style="overflow:hidden">
      <div class="card-h"><b>Patrocinadores</b>
        ${editar?'<button class="btn btn-sm" id="p-novo">+ Patrocinador</button>':''}</div>
      <div class="rowh" style="grid-template-columns:1.5fr 1fr 1.2fr .8fr .9fr .8fr ${editar?'28px':''};border-bottom:none">
        <span>Marca</span><span>Contato</span><span>Espaços</span><span style="text-align:right">Valor / mês</span>
        <span style="text-align:right">Contrato até</span><span style="text-align:center">Estado</span>${editar?'<span></span>':''}
      </div>
      ${patros.length ? patros.map(p=>`
        <div class="row" style="grid-template-columns:1.5fr 1fr 1.2fr .8fr .9fr .8fr ${editar?'28px':''};padding:12px 20px">
          <span style="display:flex;align-items:center;gap:10px;min-width:0">
            <i class="av" style="width:28px;height:28px;border-radius:8px;background:${corAv(p.nome)};color:#0c1210">${h(iniciais(p.nome))}</i>
            <b style="font-size:13px;font-weight:600">${h(p.nome)}</b></span>
          <span style="font-size:12px;color:var(--dim2);overflow:hidden;text-overflow:ellipsis">${h(p.contato||'—')}</span>
          <span style="font-size:12px;color:var(--dim)">${h((porPatro[p.nome]||[]).join(' · ') || '—')}</span>
          <span class="mono" style="font-size:12.5px;text-align:right;color:var(--verde2)">${brl(p.valor_mes_centavos)}</span>
          <span class="mono" style="font-size:12px;text-align:right;color:var(--dim2)">${p.contrato_ate?dmy(p.contrato_ate):'—'}</span>
          <span class="tag ${p.estado==='ativo'?'t-ok':p.estado==='a_renovar'?'t-warn':p.estado==='programatico'?'t-azul':'t-dim'}" style="justify-self:center">${h(p.estado.replace('_',' '))}</span>
          ${editar?`<span class="link" data-del-patro="${p.id}" style="color:var(--dim3);text-align:center" title="Apagar">✕</span>`:''}
        </div>`).join('') : '<div class="vazio">Nenhum patrocinador registrado.</div>'}
    </div>

    <div style="display:flex;align-items:center;gap:12px;margin-top:4px">
      <span class="tt" style="flex:1">Espaços publicitários</span>
      <span style="font-size:12px;color:var(--dim2)">Cada espaço tem formato e peso próprios — o upload valida antes de publicar.</span>
    </div>
    <div class="g3">${espacos.map(e=>slotHTML(e, editar)).join('')}</div>

    <div class="card card-p">
      <div class="tt" style="margin-bottom:6px">Como o jogo lê estes espaços</div>
      <div class="st" style="line-height:1.7">
        O jogo pede o criativo no ar por <b>chave</b> (<code class="mono">public/src/net/ads.js</code>) e não desenha o
        espaço quando vem vazio. Publicar aqui substitui o criativo ativo daquela chave na hora —
        o jogo recarrega o inventário a cada 5 minutos e a cada nova sessão.
      </div>
    </div>`;

  if(editar){
    el('p-novo').onclick = modalPatrocinador;
    document.querySelectorAll('[data-del-patro]').forEach(b => b.onclick = async () => {
      if(!confirm('Apagar este patrocinador? Os criativos dele ficam no ar sem marca associada.')) return;
      const { error } = await sb.from('adm_patrocinadores').delete().eq('id', b.dataset.delPatro);
      if(error) return toast(erroMsg(error), true);
      toast('Patrocinador apagado.'); pgPublicidade();
    });
    document.querySelectorAll('[data-upload]').forEach(b => b.onclick = () => modalUpload(b.dataset.upload));
    document.querySelectorAll('[data-tirar]').forEach(b => b.onclick = async () => {
      if(!confirm('Tirar este criativo do ar? O espaço deixa de ser desenhado no jogo.')) return;
      const { error } = await jogo('ad_creatives').update({ ativo:false }).eq('id', b.dataset.tirar);
      if(error) return toast(erroMsg(error), true);
      toast('Criativo fora do ar.'); pgPublicidade();
    });
  }
}

function slotHTML(e, editar){
  const c = e.criativo;
  const video = c && /video|mp4/i.test(c.mime||'');
  const prev = c
    ? `<div class="prev tem">${video
        ? `<video src="${h(c.ficheiro_url)}" muted autoplay loop playsinline></video>`
        : `<img src="${h(c.ficheiro_url)}" alt="">`}</div>`
    : `<div class="prev"><span style="font-size:12.5px;font-weight:600;color:var(--dim2)">Espaço livre</span>
        <span class="mono" style="font-size:11px;color:var(--dim3)">${e.w}×${e.h}</span></div>`;
  return `<div class="slot ${c?'no-ar':'livre'}">
    <div style="display:flex;align-items:flex-start;gap:8px">
      <div style="flex:1;min-width:0">
        <b style="display:block;font-size:13.5px;font-weight:700">${h(e.nome)}</b>
        <small style="display:block;font-size:11.5px;color:var(--dim2)">${h(e.local)}</small>
        <code>${h(e.chave)}</code>
      </div>
      <span class="tag ${e.tipo==='modal'?'t-roxo':'t-azul'}">${e.tipo==='modal'?'Modal':'Página'}</span>
    </div>
    ${prev}
    <div class="meta-l">
      <div><span>Padrão</span><b>${h(e.iab||'—')}</b></div>
      <div><span>Desktop</span><b>${e.w}×${e.h}</b></div>
      <div><span>Celular</span><b>${e.mw}×${e.mh}</b></div>
      <div><span>Formatos</span><b>${h((e.formatos||[]).join(', '))}</b></div>
      <div><span>Peso máx.</span><b>${e.peso_kb} KB</b></div>
      <div><span>Impressões (30d)</span><b>${num(e.impressoes)} · ${num(e.cliques)} cliques</b></div>
    </div>
    <div class="foot">
      <span style="flex:1;font-size:12px;color:${c?'var(--verde2)':'var(--dim2)'}">
        ${c ? h(c.patrocinador||'Sem marca') + (c.no_ar_ate? ' · até '+dmy(c.no_ar_ate) : '') : 'Sem criativo'}
      </span>
      ${editar ? (c?`<button class="btn btn-sm btn-ghost" data-tirar="${c.id}">Tirar</button>`:'') +
        `<button class="btn btn-sm" data-upload="${h(e.chave)}">${c?'Trocar':'Enviar'}</button>` : ''}
    </div>
  </div>`;
}

function modalPatrocinador(){
  abrirModal(`
    <h3>Adicionar patrocinador</h3>
    <div class="col">
      <label class="f">Marca<input class="f" id="np-nome" placeholder="Ex.: Chuteira BR"></label>
      <label class="f">Contato<input class="f" id="np-cont" placeholder="nome@marca.com"></label>
      <div class="g2" style="gap:12px">
        <label class="f">Valor / mês (R$)<input class="f mono" id="np-valor" placeholder="0,00" inputmode="decimal"></label>
        <label class="f">Contrato até<input class="f" id="np-ate" type="date"></label>
      </div>
      <label class="f">Estado<select class="f" id="np-estado">
        <option value="ativo">Ativo</option><option value="a_renovar">A renovar</option>
        <option value="programatico">Programático</option><option value="encerrado">Encerrado</option>
      </select></label>
      <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--dim)">
        <input type="checkbox" id="np-receita" checked style="accent-color:#35c46a">
        Lançar o valor deste mês como receita de publicidade</label>
      <div class="acoes">
        <button class="btn" id="np-ok">Salvar</button>
        <button class="btn btn-ghost" data-fechar>Cancelar</button>
      </div>
    </div>`);
  el('np-ok').onclick = async () => {
    const nome = el('np-nome').value.trim();
    const valor = Math.round((parseFloat(el('np-valor').value.replace(/\./g,'').replace(',','.'))||0)*100);
    if(!nome) return toast('Digite o nome da marca.', true);
    const { data, error } = await sb.from('adm_patrocinadores').insert({
      nome, contato: el('np-cont').value.trim()||null, valor_mes_centavos: valor,
      contrato_ate: el('np-ate').value || null, estado: el('np-estado').value
    }).select().single();
    if(error) return toast(erroMsg(error), true);
    // "os valores contratados alimentam a categoria publicidade das receitas" (guia)
    if(el('np-receita').checked && valor>0){
      await sb.from('adm_lancamentos').insert({
        tipo:'receita', data: new Date().toISOString().slice(0,10),
        descricao: 'Patrocínio — '+nome, categoria:'publicidade',
        valor_centavos: valor, recorrencia:'mensal'
      });
    }
    fecharModal(); toast('Patrocinador salvo.'); pgPublicidade();
  };
}

/* ---------- upload de criativo ---------- */
const MIME_EXT = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp',
                   mp4:'video/mp4', gif:'image/gif' };
function modalUpload(chave){
  const e = (D.pub.espacos||[]).find(x=>x.chave===chave);
  if(!e) return;
  const exts = (e.formatos||[]).map(f=>f.toLowerCase());
  const accept = exts.map(x=>'.'+x).join(',');
  const patros = D.pub.patrocinadores||[];
  const razao = (e.w/e.h).toFixed(2);
  let arquivo = null;

  abrirModal(`
    <h3>Enviar criativo</h3>
    <div style="font-size:12.5px;color:var(--dim2);margin:-12px 0 18px">${h(e.nome)} · ${h(e.local)}</div>
    <div class="spec">
      <div class="full"><code class="mono" style="color:var(--verde2)">${h(e.chave)}</code>
        <span style="color:var(--dim2);text-align:right">${h(e.iab||'')}</span></div>
      <div><span style="color:var(--dim2)">Dimensão</span><b>${e.w}×${e.h}</b></div>
      <div><span style="color:var(--dim2)">Celular</span><b>${e.mw}×${e.mh}</b></div>
      <div><span style="color:var(--dim2)">Formatos</span><b>${h((e.formatos||[]).join(', '))}</b></div>
      <div><span style="color:var(--dim2)">Peso máx.</span><b>${e.peso_kb} KB</b></div>
      <div><span style="color:var(--dim2)">Proporção</span><b>${razao}:1</b></div>
    </div>
    <div class="col">
      <div class="drop" id="up-drop">
        <div class="ic">⬆</div>
        <div class="t" id="up-tit">Escolher arquivo</div>
        <div class="s" id="up-sub">${h((e.formatos||[]).join(', '))} até ${e.peso_kb} KB · ${e.w}×${e.h} ou ${e.mw}×${e.mh}</div>
        <input type="file" id="up-file" accept="${h(accept)}" style="display:none">
      </div>
      <div class="erro hide" id="up-erro"></div>
      <label class="f">Patrocinador<select class="f" id="up-patro">
        <option value="">— sem marca associada —</option>
        ${patros.map(p=>`<option value="${p.id}">${h(p.nome)}</option>`).join('')}
      </select></label>
      <div class="g2" style="gap:12px">
        <label class="f">Link de destino<input class="f" id="up-link" placeholder="https://"></label>
        <label class="f">No ar até<input class="f" id="up-ate" type="date"></label>
      </div>
      <div class="acoes">
        <button class="btn" id="up-ok">Publicar criativo</button>
        <button class="btn btn-ghost" data-fechar>Cancelar</button>
      </div>
    </div>`, 'lg');

  const drop = el('up-drop'), input = el('up-file'), erro = el('up-erro');
  const falhar = m => { erro.textContent = m; erro.classList.remove('hide'); drop.classList.remove('ok'); arquivo=null; };
  drop.onclick = () => input.click();
  drop.ondragover = ev => { ev.preventDefault(); drop.classList.add('ok'); };
  drop.ondragleave = () => drop.classList.remove('ok');
  drop.ondrop = ev => { ev.preventDefault(); if(ev.dataTransfer.files[0]) validar(ev.dataTransfer.files[0]); };
  input.onchange = () => { if(input.files[0]) validar(input.files[0]); };

  /* Validação no cliente: extensão, peso e DIMENSÃO exata (desktop ou celular).
     A dimensão é lida do próprio arquivo antes de subir — é o que impede um
     970×250 entrar num espaço de 300×250 e rebentar o layout do jogo. */
  async function validar(f){
    erro.classList.add('hide');
    const ext = (f.name.split('.').pop()||'').toLowerCase();
    if(!exts.includes(ext)) return falhar(`Formato .${ext} não é aceito aqui (só ${exts.join(', ')}).`);
    if(f.size > e.peso_kb*1024) return falhar(`O arquivo tem ${Math.round(f.size/1024)} KB e o máximo é ${e.peso_kb} KB.`);
    let dim = null;
    try{ dim = await medir(f, ext); }catch(err){ return falhar('Não foi possível ler o arquivo.'); }
    if(dim){
      const bate = (dim.w===e.w && dim.h===e.h) || (dim.w===e.mw && dim.h===e.mh);
      if(!bate) return falhar(`O criativo tem ${dim.w}×${dim.h}. Este espaço aceita ${e.w}×${e.h} (desktop) ou ${e.mw}×${e.mh} (celular).`);
    }
    arquivo = f; drop.classList.add('ok');
    el('up-tit').textContent = f.name;
    el('up-sub').textContent = `${Math.round(f.size/1024)} KB${dim?` · ${dim.w}×${dim.h}`:''} — pronto para publicar`;
  }
  function medir(f, ext){
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(f);
      if(ext==='mp4'){
        const v = document.createElement('video');
        v.onloadedmetadata = () => { URL.revokeObjectURL(url);
          if(v.duration > 15.5) return rej(new Error('vídeo maior que 15 s'));
          res({w:v.videoWidth, h:v.videoHeight}); };
        v.onerror = () => { URL.revokeObjectURL(url); rej(new Error('vídeo inválido')); };
        v.src = url;
      } else {
        const i = new Image();
        i.onload = () => { URL.revokeObjectURL(url); res({w:i.naturalWidth, h:i.naturalHeight}); };
        i.onerror = () => { URL.revokeObjectURL(url); rej(new Error('imagem inválida')); };
        i.src = url;
      }
    });
  }

  el('up-ok').onclick = async () => {
    if(!arquivo) return falhar('Escolha um arquivo primeiro.');
    const link = el('up-link').value.trim();
    if(link && !/^https?:\/\//i.test(link)) return falhar('O link de destino precisa começar com http:// ou https://');
    const btn = el('up-ok'); btn.disabled = true; btn.textContent = 'Publicando…';
    try{
      const ext = (arquivo.name.split('.').pop()||'').toLowerCase();
      const caminho = `${e.chave}/${Date.now()}.${ext}`;
      const up = await sb.storage.from(BUCKET).upload(caminho, arquivo, {
        contentType: MIME_EXT[ext] || arquivo.type, upsert:false, cacheControl:'300'
      });
      if(up.error) throw up.error;
      const url = sb.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
      // publicar SUBSTITUI: o espaço só tem um criativo no ar de cada vez
      await jogo('ad_creatives').update({ ativo:false }).eq('chave_espaco', e.chave).eq('ativo', true);
      const ins = await jogo('ad_creatives').insert({
        chave_espaco: e.chave,
        patrocinador_id: el('up-patro').value || null,
        ficheiro_url: url, ficheiro_path: caminho,
        mime: MIME_EXT[ext] || arquivo.type, bytes: arquivo.size,
        link_destino: link || null,
        no_ar_ate: el('up-ate').value ? new Date(el('up-ate').value+'T23:59:59').toISOString() : null
      });
      if(ins.error) throw ins.error;
      fecharModal(); toast('Criativo no ar em '+e.chave); pgPublicidade();
    }catch(err){
      btn.disabled = false; btn.textContent = 'Publicar criativo';
      falhar(erroMsg(err));
    }
  };
}

/* ============================ FUNCIONALIDADES (kanban) ============================ */
async function pgFeatures(){
  const [cols, feats] = await Promise.all([
    sb.from('adm_kanban_cols').select('*').order('ord'),
    sb.from('adm_features').select('*').order('ord')
  ]);
  if(cols.error) throw cols.error;
  if(feats.error) throw feats.error;
  D.cols = cols.data||[]; D.feats = feats.data||[];
  const editar = podeEditar('produto');
  const total = D.feats.length, votos = D.feats.reduce((a,f)=>a+ +f.votos,0);

  el('page').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
      <span style="font-size:12.5px;color:var(--dim2);flex:1">
        ${total} funcionalidades · ${votos} votos${editar?' · arraste um card para mudar de coluna':''}</span>
      ${editar?'<button class="btn btn-sm" id="kb-nova">+ Nova funcionalidade</button>':''}
    </div>
    <div class="kb" id="kb">
      ${D.cols.map(c=>colunaHTML(c, editar)).join('')}
      ${editar?`<div style="width:236px;flex:none;display:flex;flex-direction:column;gap:8px">
        <input class="f" id="kb-nome" placeholder="Nome da nova coluna" style="border-style:dashed;background:var(--card)">
        <button class="btn btn-ghost btn-sm" id="kb-add-col">+ Criar coluna</button>
      </div>`:''}
    </div>`;

  if(editar) ligarKanban();
}
function colunaHTML(c, editar){
  const cards = D.feats.filter(f=>f.coluna_id===c.id).sort((a,b)=>a.ord-b.ord);
  return `<div class="kbcol" data-col="${c.id}">
    <div class="kbh">
      <i style="background:${h(c.cor)}"></i>
      <input value="${h(c.nome)}" data-rename="${c.id}" ${editar?'':'disabled'}>
      <span class="n">${cards.length}</span>
      ${editar?`<span class="x" data-del-col="${c.id}" title="Apagar coluna">✕</span>`:''}
    </div>
    <div class="kbcards" data-cards="${c.id}">${cards.map(f=>cardHTML(f, editar)).join('')}</div>
    ${editar?`<span class="kbadd" data-add-card="${c.id}">+ Adicionar card</span>`:''}
  </div>`;
}
function cardHTML(f, editar){
  const quente = f.votos>=50;
  return `<div class="kbcard" data-card="${f.id}">
    <div style="display:flex;align-items:flex-start;gap:8px">
      <b>${h(f.titulo)}</b>
      ${editar?`<span class="x" data-del-card="${f.id}" title="Apagar">✕</span>`:''}
    </div>
    ${f.nota?`<div class="nota">${h(f.nota)}</div>`:''}
    <div class="pe">
      <span class="tag ${f.origem==='usuario'?'t-azul':'t-dim'}" style="font-size:10.5px">${f.origem==='usuario'?'Usuário':'Equipe'}</span>
      <span class="mono" style="font-size:11px;color:var(--dim3);flex:1">${dma(f.criada_em)}</span>
      <span class="votos ${quente?'quente':''}">
        ${editar?`<span data-voto="-1" data-id="${f.id}" title="Remover voto">−</span>`:''}
        <b style="color:${quente?'var(--verde2)':'var(--fg)'}">${f.votos}</b>
        ${editar?`<span class="up" data-voto="1" data-id="${f.id}" title="Votar">▲</span>`:''}
      </span>
    </div>
  </div>`;
}

function ligarKanban(){
  el('kb-nova').onclick = () => modalFeature(D.cols[0] && D.cols[0].id);
  el('kb-add-col').onclick = criarColuna;
  el('kb-nome').onkeydown = ev => { if(ev.key==='Enter') criarColuna(); };

  document.querySelectorAll('[data-add-card]').forEach(b => b.onclick = () => modalFeature(b.dataset.addCard));
  document.querySelectorAll('[data-rename]').forEach(i => {
    i.onchange = async () => {
      const { error } = await sb.from('adm_kanban_cols').update({ nome: i.value.trim()||'Sem nome' }).eq('id', i.dataset.rename);
      if(error) return toast(erroMsg(error), true);
      toast('Coluna renomeada.');
    };
  });
  document.querySelectorAll('[data-del-col]').forEach(b => b.onclick = async () => {
    const id = b.dataset.delCol;
    if(D.cols.length<2) return toast('Precisa sobrar pelo menos uma coluna.', true);
    if(!confirm('Apagar a coluna? Os cards vão para a primeira coluna.')) return;
    const destino = D.cols.find(c=>c.id!==id).id;
    await sb.from('adm_features').update({ coluna_id: destino }).eq('coluna_id', id);
    const { error } = await sb.from('adm_kanban_cols').delete().eq('id', id);
    if(error) return toast(erroMsg(error), true);
    toast('Coluna apagada.'); pgFeatures();
  });
  document.querySelectorAll('[data-del-card]').forEach(b => b.onclick = async ev => {
    ev.stopPropagation();
    if(!confirm('Apagar esta funcionalidade?')) return;
    const { error } = await sb.from('adm_features').delete().eq('id', b.dataset.delCard);
    if(error) return toast(erroMsg(error), true);
    pgFeatures();
  });
  document.querySelectorAll('[data-voto]').forEach(b => b.onclick = async ev => {
    ev.stopPropagation();
    const f = D.feats.find(x=>x.id===b.dataset.id); if(!f) return;
    const novo = Math.max(0, f.votos + (+b.dataset.voto));
    const { error } = await sb.from('adm_features').update({ votos: novo }).eq('id', f.id);
    if(error) return toast(erroMsg(error), true);
    f.votos = novo; pgFeatures();
  });

  // ---- arrastar e soltar por POINTER EVENTS (não HTML5 drag) ----
  // limiar de 4px para não roubar o clique; fantasma inclinado segue o cursor e
  // um espaço tracejado abre onde o card vai cair. Ao largar, grava col+ord da coluna.
  document.querySelectorAll('.kbcard').forEach(card => {
    card.addEventListener('pointerdown', ev => {
      if(ev.button!==0 || ev.target.closest('[data-voto],[data-del-card]')) return;
      const inicio = { x:ev.clientX, y:ev.clientY };
      const id = card.dataset.card;
      let ativo = false, ghost = null, slot = null;

      const mover = e2 => {
        if(!ativo){
          if(Math.hypot(e2.clientX-inicio.x, e2.clientY-inicio.y) < 4) return;
          ativo = true;
          const r = card.getBoundingClientRect();
          ghost = card.cloneNode(true);
          ghost.className = 'kbcard kbghost';
          ghost.style.width = r.width+'px';
          document.body.appendChild(ghost);
          slot = document.createElement('div');
          slot.className = 'kbslot';
          slot.style.height = r.height+'px';
          card.after(slot);
          card.style.display = 'none';
          card.setPointerCapture(ev.pointerId);
        }
        ghost.style.left = (e2.clientX-40)+'px';
        ghost.style.top  = (e2.clientY-18)+'px';
        const alvo = alvoDrop(e2.clientX, e2.clientY);
        document.querySelectorAll('.kbcol').forEach(c=>c.classList.remove('alvo'));
        if(alvo){
          alvo.coluna.classList.add('alvo');
          const lista = alvo.coluna.querySelector('.kbcards');
          if(alvo.antes) lista.insertBefore(slot, alvo.antes); else lista.appendChild(slot);
        }
      };
      const largar = async () => {
        window.removeEventListener('pointermove', mover);
        window.removeEventListener('pointerup', largar);
        document.querySelectorAll('.kbcol').forEach(c=>c.classList.remove('alvo'));
        if(!ativo) return;
        if(ghost) ghost.remove();
        const lista = slot.parentElement;
        const colId = lista.dataset.cards;
        // ordem final da coluna de destino, com o card na posição do espaço
        const ids = Array.from(lista.children)
          .map(n => n===slot ? id : n.dataset.card).filter(Boolean);
        slot.remove(); card.style.display = '';
        try{
          await Promise.all(ids.map((cid,i) =>
            sb.from('adm_features').update({ coluna_id: colId, ord: i }).eq('id', cid)));
        }catch(err){ toast(erroMsg(err), true); }
        pgFeatures();
      };
      window.addEventListener('pointermove', mover, { passive:true });
      window.addEventListener('pointerup', largar);
    });
  });
}
/* coluna sob o cursor + card antes do qual inserir (pelo meio de cada card) */
function alvoDrop(x, y){
  const cols = Array.from(document.querySelectorAll('.kbcol'));
  const coluna = cols.find(c => { const r = c.getBoundingClientRect();
    return x>=r.left && x<=r.right && y>=r.top-40 && y<=r.bottom+40; });
  if(!coluna) return null;
  const cards = Array.from(coluna.querySelectorAll('.kbcard')).filter(c=>c.style.display!=='none');
  const antes = cards.find(c => { const r = c.getBoundingClientRect(); return y < r.top + r.height/2; });
  return { coluna, antes };
}
async function criarColuna(){
  const nome = el('kb-nome').value.trim();
  if(!nome) return toast('Digite o nome da coluna.', true);
  const { error } = await sb.from('adm_kanban_cols').insert({ nome, ord: D.cols.length,
    cor: CORES_AV[D.cols.length % CORES_AV.length] });
  if(error) return toast(erroMsg(error), true);
  toast('Coluna criada.'); pgFeatures();
}
function modalFeature(colunaId){
  abrirModal(`
    <h3>Registrar funcionalidade</h3>
    <div class="col">
      <label class="f">Funcionalidade<input class="f" id="nf-tit" placeholder="Ex.: Renovar contratos em bloco"></label>
      <label class="f">Nota / contexto<input class="f" id="nf-nota" placeholder="Quem pediu, em que tela, porquê"></label>
      <div class="g2" style="gap:12px">
        <label class="f">Origem<select class="f" id="nf-origem">
          <option value="usuario">Usuário</option><option value="equipa">Equipe</option></select></label>
        <label class="f">Coluna<select class="f" id="nf-col">
          ${D.cols.map(c=>`<option value="${c.id}" ${c.id===colunaId?'selected':''}>${h(c.nome)}</option>`).join('')}
        </select></label>
      </div>
      <div class="acoes">
        <button class="btn" id="nf-ok">Registrar</button>
        <button class="btn btn-ghost" data-fechar>Cancelar</button>
      </div>
    </div>`);
  el('nf-ok').onclick = async () => {
    const titulo = el('nf-tit').value.trim();
    if(!titulo) return toast('Digite o título.', true);
    const col = el('nf-col').value;
    const ord = D.feats.filter(f=>f.coluna_id===col).length;
    const { error } = await sb.from('adm_features').insert({
      titulo, nota: el('nf-nota').value.trim()||null, origem: el('nf-origem').value,
      coluna_id: col, ord
    });
    if(error) return toast(erroMsg(error), true);
    fecharModal(); toast('Funcionalidade registrada.'); pgFeatures();
  };
}

/* ============================ EQUIPA ADMIN ============================ */
async function pgEquipa(){
  // A lista de contas do jogo alimenta o seletor do convite: quase sempre o convidado
  // já é jogador, e digitar o e-mail dele de novo é onde nasce o erro de digitação
  // (o convite fica preso a um endereço que ninguém usa).
  const [us, inv, jogadores] = await Promise.all([
    sb.from('adm_users').select('*').order('criado_em'),
    sb.from('adm_invites').select('*').is('aceito_em', null).order('criado_em', { ascending:false }),
    sb.rpc('usuarios', { p_busca:null, p_limite:500 })
  ]);
  if(us.error) throw us.error;
  D.admins = us.data||[]; D.invites = inv.data||[];
  // quem já é admin ou já tem convite pendente sai da lista — convidar de novo não faz nada
  const jaTem = new Set([...D.admins, ...D.invites].map(x => String(x.email||'').toLowerCase()));
  D.convidaveis = (jogadores.data||[])
    .filter(u => u.email && !jaTem.has(String(u.email).toLowerCase()))
    .sort((a,b) => String(a.nome||'').localeCompare(String(b.nome||''), 'pt-BR'));
  // só o dono do painel convida e mexe em papéis (regra do banco: admin_rf98.dono())
  const dono = !!ME.dono;

  el('page').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 340px;gap:16px;align-items:start">
      <div class="card" style="overflow:hidden">
        <div class="card-h"><b>Contas de administrador</b></div>
        <div class="rowh" style="grid-template-columns:1.6fr 1fr 1fr .9fr;border-bottom:none">
          <span>Pessoa</span><span>Papel</span><span style="text-align:center">Estado</span><span style="text-align:right">Últ. acesso</span>
        </div>
        ${D.admins.map(a=>`
          <div class="row" style="grid-template-columns:1.6fr 1fr 1fr .9fr;padding:12px 20px">
            <span style="display:flex;align-items:center;gap:10px;min-width:0">
              <i class="av" style="width:28px;height:28px;background:${corAv(a.nome||a.email)};color:#0c1210">${h(iniciais(a.nome||a.email))}</i>
              <span style="min-width:0"><b style="display:block;font-size:13px;font-weight:600">${h(a.nome||'—')}</b>
              <small style="font-size:11.5px;color:var(--dim2)">${h(a.email)}</small></span></span>
            <span style="font-size:12.5px;color:var(--fg2)">
              ${dono && a.user_id!==ME.user_id ? `<select class="f" data-papel="${a.user_id}" style="padding:5px 8px;font-size:12px">
                  ${Object.keys(PAPEIS).map(p=>`<option value="${p}" ${p===a.papel?'selected':''}>${h(p)}</option>`).join('')}
                </select>` : h(PAPEIS[a.papel]||a.papel)}</span>
            <span class="tag ${a.estado==='ativo'?'t-ok':'t-dim'}" style="justify-self:center">${h(a.estado)}</span>
            <span class="mono" style="font-size:12px;text-align:right;color:var(--dim2)">${h(ha(a.ultimo_acesso))}</span>
          </div>`).join('')}
        ${D.invites.map(i=>`
          <div class="row" style="grid-template-columns:1.6fr 1fr 1fr .9fr;padding:12px 20px">
            <span style="display:flex;align-items:center;gap:10px;min-width:0">
              <i class="av" style="width:28px;height:28px;background:var(--bd2);color:var(--dim)">✉</i>
              <span style="min-width:0"><b style="display:block;font-size:13px;font-weight:600">${h(i.email)}</b>
              <small style="font-size:11.5px;color:var(--dim2)">convite ${new Date(i.expira_em)<new Date()?'expirado':'enviado '+ha(i.criado_em)}</small></span></span>
            <span style="font-size:12.5px;color:var(--fg2)">${h(PAPEIS[i.papel]||i.papel)}</span>
            <span class="tag t-warn" style="justify-self:center">convite pendente</span>
            <span style="text-align:right">${dono?`<span class="link" data-link-inv="${h(i.token)}" style="font-size:11.5px">Copiar link</span>`:''}</span>
          </div>`).join('')}
      </div>

      <div class="card card-p">
        <div class="tt" style="margin-bottom:4px">Convidar por e-mail</div>
        <p class="st" style="line-height:1.6;margin:0 0 16px">
          O convite dá acesso ao painel a quem entrar com esse e-mail. Expira em 7 dias e pode ser renovado.</p>
        ${dono ? `<div class="col" style="gap:14px">
          <label class="f">Quem
            <input class="f" id="i-email" type="email" list="i-jogadores" autocomplete="off"
                   placeholder="Buscar jogador ou digitar um e-mail">
            <datalist id="i-jogadores">
              ${D.convidaveis.map(u=>`<option value="${h(u.email)}">${h(u.nome||'')}${u.clube?' · '+h(clube(u.clube)):''}</option>`).join('')}
            </datalist>
            <small style="font-size:11.5px;color:var(--dim3);font-weight:500">
              ${D.convidaveis.length} contas do jogo na lista — comece a escrever o nome ou o e-mail.
              Quem ainda não joga, é só digitar o e-mail.</small>
          </label>
          <label class="f">Papel<select class="f" id="i-papel">
            <option value="socio">Sócio — vê tudo</option>
            <option value="financeiro">Financeiro — receitas e despesas</option>
            <option value="produto">Produto — engajamento e funcionalidades</option>
            <option value="leitura" selected>Leitura — só ver</option>
          </select></label>
          <label class="f">Mensagem (opcional)<textarea class="f" id="i-msg" rows="3"
            placeholder="Uma linha para a pessoa saber do que se trata"></textarea></label>
          <button class="btn" id="i-go">Criar convite</button>
          <div class="st" style="line-height:1.6">
            O painel não envia e-mail por conta própria (isso exige uma function no servidor):
            depois de criar, copie o link e mande pelo canal que preferir.</div>
        </div>` : `<div class="st">Só o dono do painel (${h(donoEmail())}) pode convidar.</div>`}
      </div>
    </div>`;

  if(dono){
    el('i-go').onclick = async () => {
      const email = el('i-email').value.trim();
      if(!email || !/@/.test(email)) return toast('E-mail inválido.', true);
      const { data, error } = await sb.rpc('convidar', {
        p_email: email, p_papel: el('i-papel').value, p_mensagem: el('i-msg').value.trim()||null });
      if(error) return toast(erroMsg(error), true);
      copiarLink(data.token);
      pgEquipa();
    };
    document.querySelectorAll('[data-link-inv]').forEach(b => b.onclick = () => copiarLink(b.dataset.linkInv));
    document.querySelectorAll('[data-papel]').forEach(s => s.onchange = async () => {
      const { error } = await sb.from('adm_users').update({ papel: s.value }).eq('user_id', s.dataset.papel);
      if(error) return toast(erroMsg(error), true);
      toast('Papel atualizado.');
    });
  }
}
/* quem é o dono do painel — só para explicar na tela a quem pedir acesso. Quem MANDA é o
   banco (admin_rf98.dono(), lido de adm_config['dono_email']); isto aqui é só o rótulo. */
function donoEmail(){
  const d = (D.admins||[]).find(a => a.papel==='socio');
  return (d && d.email) || 'o sócio fundador';
}
function copiarLink(token){
  const url = location.origin + location.pathname + '?convite=' + token;
  navigator.clipboard.writeText(url).then(
    () => toast('Link do convite copiado.'),
    () => prompt('Copie o link do convite:', url));
}

/* ============================ modais ============================ */
function abrirModal(html, cls){
  el('modais').innerHTML = `<div class="modal"><div class="box ${cls||''}">${html}</div></div>`;
  const m = el('modais').firstElementChild;
  m.onclick = ev => { if(ev.target===m) fecharModal(); };
  m.querySelectorAll('[data-fechar]').forEach(b => b.onclick = fecharModal);
  document.addEventListener('keydown', escFechar);
}
function fecharModal(){ el('modais').innerHTML=''; document.removeEventListener('keydown', escFechar); }
function escFechar(e){ if(e.key==='Escape') fecharModal(); }

/* ============================ arranque ============================ */
el('sair').onclick = async () => { await sb.auth.signOut(); ME=null; ST.authMode='login'; mostrarAuth(); };
init();
