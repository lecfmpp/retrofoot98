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
const SEL = { salas:new Set(), saves:new Set() };  // seleção em massa da página Resenhas & solo
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
  socio:      ['visao','usuarios','jogos','analytics','financas','publicidade','features','editor','equipa'],
  financeiro: ['visao','financas','publicidade'],
  produto:    ['visao','usuarios','jogos','analytics','features','editor'],
  leitura:    ['visao','usuarios','jogos','analytics','financas','publicidade','features','editor']
};
function podeVer(tab){ return (ACESSO[ME&&ME.papel] || ACESSO.leitura).includes(tab); }
function podeEditar(area){
  if(!ME) return false;
  if(ME.papel==='socio') return true;
  if(ME.papel==='financeiro') return area==='financas'||area==='publicidade';
  if(ME.papel==='produto') return area==='produto' || area==='dados';
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
  { id:'editor',      ic:'✎', label:'Editor de dados',tit:'Editor de dados do jogo', sub:'Clubes, elencos, escudos e força' },
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
               financas:pgFinancas, publicidade:pgPublicidade, features:pgFeatures,
               editor:pgEditor, equipa:pgEquipa }[tab];
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
  const podeApagar = ME.papel==='socio';   // apagar é irreversível (ver modalApagarEmMassa)
  SEL.salas = SEL.salas || new Set();
  SEL.saves = SEL.saves || new Set();
  // seleção só vale para o que ainda está na tela
  const idsSala = new Set(salas.map(s=>s.id));
  Array.from(SEL.salas).forEach(x => { if(!idsSala.has(x)) SEL.salas.delete(x); });
  const idsSave = new Set(solos.map(chaveSave));
  Array.from(SEL.saves).forEach(x => { if(!idsSave.has(x)) SEL.saves.delete(x); });

  const colSalas = `${podeApagar?'30px ':''}.9fr 1.2fr .8fr .8fr .8fr${podeApagar?' 30px':''}`;
  const colSolos = `${podeApagar?'30px ':''}1.2fr 1fr .7fr .7fr 1fr`;

  el('page').innerHTML = `
    <div class="g4">
      ${kpiHTML({l:'Resenhas abertas', v:num(salas.length), d:`${num(salas.filter(s=>s.phase==='running').length)} em jogo`})}
      ${kpiHTML({l:'Salas sem humano', v:num(data.salas_vazias), d:'só CPU — candidatas a limpeza'})}
      ${kpiHTML({l:'Convites (30 dias)', v:num(conv.length), d: conv.length? `${pct(aceites,conv.length)}% aceitos` : 'nenhum enviado'})}
      ${kpiHTML({l:'Jogos solo', v:num(solos.length), d:`${num(data.solos_parados)} parados há 14 dias ou mais`})}
    </div>

    <div style="display:grid;grid-template-columns:1.05fr 1fr;gap:16px">
      <div class="card" style="overflow:hidden">
        <div class="card-h">
          <b>Resenhas abertas</b>
          ${podeApagar?`<span class="st" style="margin:0">selecionar:
            <span class="link" data-sel-salas="vazias">sem humano</span> ·
            <span class="link" data-sel-salas="velhas">paradas 14d+</span> ·
            <span class="link" data-sel-salas="nenhuma">limpar</span></span>`:''}
        </div>
        <div class="rowh" style="grid-template-columns:${colSalas};border-bottom:none">
          ${podeApagar?'<span><input type="checkbox" id="sel-todas-salas" title="Selecionar todas"></span>':''}
          <span>Sala</span><span>Anfitrião</span><span style="text-align:center">Treinadores</span>
          <span style="text-align:right">Aberta há</span><span style="text-align:right">Ativa há</span>
          ${podeApagar?'<span></span>':''}
        </div>
        ${salas.length ? salas.map(s=>`
          <div class="row" style="grid-template-columns:${colSalas};padding:10px 20px">
            ${podeApagar?`<span><input type="checkbox" data-sala="${h(s.id)}" ${SEL.salas.has(s.id)?'checked':''}></span>`:''}
            <span class="mono" style="font-size:12px;color:var(--verde2)">${h(s.id)}</span>
            <span style="font-size:12.5px;min-width:0;overflow:hidden;text-overflow:ellipsis">${h(s.anfitriao)}</span>
            <span class="mono" style="font-size:12.5px;font-weight:700;text-align:center;color:${s.humanos>=s.lugares?'var(--verde2)':s.humanos?'var(--fg)':'var(--dim3)'}">${s.humanos}/${s.lugares}</span>
            <span class="mono" style="font-size:12px;text-align:right;color:var(--dim2)">${h(ha(s.created_at))}</span>
            <span class="mono" style="font-size:12px;text-align:right;color:${dias(s.updated_at)>=14?'var(--vermelho)':'var(--dim2)'}">${h(ha(s.updated_at))}</span>
            ${podeApagar?`<span class="link" data-apagar-sala="${h(s.id)}" data-humanos="${s.humanos}"
               title="Apagar a sala ${h(s.id)}" style="color:var(--dim3);text-align:center">✕</span>`:''}
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
      <div class="card-h">
        <b>Jogos abertos no modo solo</b>
        ${podeApagar?`<span class="st" style="margin:0">selecionar:
          <span class="link" data-sel-saves="14">parados 14d+</span> ·
          <span class="link" data-sel-saves="30">parados 30d+</span> ·
          <span class="link" data-sel-saves="zerados">sem temporada</span> ·
          <span class="link" data-sel-saves="nenhum">limpar</span></span>`:''}
      </div>
      <div class="rowh" style="grid-template-columns:${colSolos};border-bottom:none">
        ${podeApagar?'<span><input type="checkbox" id="sel-todos-saves" title="Selecionar todos"></span>':''}
        <span>Técnico</span><span>Clube</span><span style="text-align:center">Divisão</span>
        <span style="text-align:center">Temporada</span><span style="text-align:right">Último salvamento</span>
      </div>
      ${solos.length ? solos.map(s=>{
        const n = dias(s.updated_at);
        const cor = n<=2?'var(--verde2)':n<=13?'var(--ambar)':'var(--vermelho)';
        const k = chaveSave(s);
        return `<div class="row" style="grid-template-columns:${colSolos};padding:10px 20px">
          ${podeApagar?`<span><input type="checkbox" data-save="${h(k)}" ${SEL.saves.has(k)?'checked':''}></span>`:''}
          <span style="min-width:0"><b style="display:block;font-size:12.5px;font-weight:600">${h(s.tecnico||s.save_name)}</b>
            <small class="mono" style="font-size:11px;color:var(--dim3)">${h(s.save_name)}${s.dono?' · '+h(mascara(s.dono)):''}</small></span>
          <span style="font-size:12.5px;color:var(--dim)">${h(clube(s.clube))}</span>
          <span class="mono" style="font-size:12.5px;text-align:center">${h(s.divisao||'—')}</span>
          <span class="mono" style="font-size:12.5px;text-align:center">${h(s.temporada||'—')}</span>
          <span class="mono" style="font-size:12.5px;text-align:right;color:${cor}">${h(ha(s.updated_at))}</span>
        </div>`;
      }).join('') : '<div class="vazio">Nenhum save solo.</div>'}
    </div>`;

  if(podeApagar){
    document.querySelectorAll('[data-apagar-sala]').forEach(b =>
      b.onclick = () => modalApagarSala(b.dataset.apagarSala, +b.dataset.humanos));
    ligarSelecao(salas, solos);
  }
  barraSelecao();
}
/* um save é identificado pelo PAR dono+nome: dois jogadores podem ter um save "TESTE" */
function chaveSave(s){ return s.user_id + ' ' + s.save_name; }

function ligarSelecao(salas, solos){
  document.querySelectorAll('[data-sala]').forEach(c => c.onchange = () => {
    if(c.checked) SEL.salas.add(c.dataset.sala); else SEL.salas.delete(c.dataset.sala);
    barraSelecao();
  });
  document.querySelectorAll('[data-save]').forEach(c => c.onchange = () => {
    if(c.checked) SEL.saves.add(c.dataset.save); else SEL.saves.delete(c.dataset.save);
    barraSelecao();
  });
  const todasSalas = el('sel-todas-salas');
  if(todasSalas) todasSalas.onchange = () => {
    salas.forEach(s => { if(todasSalas.checked) SEL.salas.add(s.id); else SEL.salas.delete(s.id); });
    marcarCaixas(); barraSelecao();
  };
  const todosSaves = el('sel-todos-saves');
  if(todosSaves) todosSaves.onchange = () => {
    solos.forEach(s => { if(todosSaves.checked) SEL.saves.add(chaveSave(s)); else SEL.saves.delete(chaveSave(s)); });
    marcarCaixas(); barraSelecao();
  };
  /* FILTROS RÁPIDOS — o caso real de limpeza não é escolher linha a linha, é
     "tudo que está parado há um mês". Cada atalho SOMA à seleção atual. */
  document.querySelectorAll('[data-sel-salas]').forEach(a => a.onclick = () => {
    const q = a.dataset.selSalas;
    if(q==='nenhuma') SEL.salas.clear();
    else salas.filter(s => q==='vazias' ? s.humanos===0 : dias(s.updated_at)>=14)
              .forEach(s => SEL.salas.add(s.id));
    marcarCaixas(); barraSelecao();
  });
  document.querySelectorAll('[data-sel-saves]').forEach(a => a.onclick = () => {
    const q = a.dataset.selSaves;
    if(q==='nenhum') SEL.saves.clear();
    else solos.filter(s => q==='zerados' ? (!s.temporada || s.temporada==='0')
                                         : dias(s.updated_at) >= Number(q))
              .forEach(s => SEL.saves.add(chaveSave(s)));
    marcarCaixas(); barraSelecao();
  });
}
/* repinta só as caixinhas — redesenhar a página perderia a rolagem e o foco */
function marcarCaixas(){
  document.querySelectorAll('[data-sala]').forEach(c => { c.checked = SEL.salas.has(c.dataset.sala); });
  document.querySelectorAll('[data-save]').forEach(c => { c.checked = SEL.saves.has(c.dataset.save); });
}

/* BARRA FLUTUANTE — só existe com algo selecionado, e diz exatamente o que vai embora */
function barraSelecao(){
  let barra = el('sel-barra');
  const nS = SEL.salas ? SEL.salas.size : 0, nV = SEL.saves ? SEL.saves.size : 0;
  if(!nS && !nV){ if(barra) barra.remove(); return; }
  if(!barra){
    barra = document.createElement('div');
    barra.id = 'sel-barra'; barra.className = 'sel-barra';
    document.body.appendChild(barra);
  }
  const partes = [];
  if(nS) partes.push(`<b>${nS}</b> sala${nS>1?'s':''}`);
  if(nV) partes.push(`<b>${nV}</b> save${nV>1?'s':''} solo`);
  barra.innerHTML = `<span>${partes.join(' e ')} na seleção</span>
    <button class="btn btn-sm btn-ghost" id="sel-limpar">Limpar</button>
    <button class="btn btn-sm" id="sel-apagar" style="background:var(--vermelho);color:#fff">Apagar</button>`;
  el('sel-limpar').onclick = () => { SEL.salas.clear(); SEL.saves.clear(); marcarCaixas(); barraSelecao(); };
  el('sel-apagar').onclick = modalApagarEmMassa;
}

/* Confirmação proporcional ao estrago: mostra quantos treinadores HUMANOS perdem a
   temporada e exige digitar o número de itens — um "tem certeza?" não segura ninguém
   que acabou de clicar em "selecionar todos". */
function modalApagarEmMassa(){
  const salas = (D.jogos.salas||[]).filter(s => SEL.salas.has(s.id));
  const saves = (D.jogos.solos||[]).filter(s => SEL.saves.has(chaveSave(s)));
  const total = salas.length + saves.length;
  const humanos = salas.reduce((a,s)=>a+ (Number(s.humanos)||0), 0);
  const ativos = salas.filter(s=>dias(s.updated_at)<14).length + saves.filter(s=>dias(s.updated_at)<14).length;

  abrirModal(`
    <h3>Apagar ${total} ite${total>1?'ns':'m'}?</h3>
    <div class="col">
      <div class="erro" style="line-height:1.7">
        ${salas.length?`<b>${salas.length} sala${salas.length>1?'s':''}</b> — assentos, chat, convites e histórico de rodadas vão junto.<br>`:''}
        ${saves.length?`<b>${saves.length} save${saves.length>1?'s':''} solo</b> — a carreira de cada um acaba aqui.<br>`:''}
        ${humanos?`Há <b>${humanos} treinador${humanos>1?'es humanos':' humano'}</b> sentado${humanos>1?'s':''} nessas salas.<br>`:''}
        ${ativos?`<b>${ativos}</b> desses itens teve movimento nos últimos 14 dias — não são jogos abandonados.<br>`:''}
        Não dá para desfazer.
      </div>
      ${salas.length?`<div class="st mono" style="line-height:1.6">${h(salas.map(s=>s.id).slice(0,30).join(' '))}${salas.length>30?' …':''}</div>`:''}
      <label class="f">Digite <b class="mono">${total}</b> para confirmar
        <input class="f mono" id="bulk-n" inputmode="numeric" autocomplete="off" placeholder="${total}"></label>
      <div class="acoes">
        <button class="btn" id="bulk-ok" style="background:var(--vermelho);color:#fff" disabled>Apagar tudo</button>
        <button class="btn btn-ghost" data-fechar>Cancelar</button>
      </div>
    </div>`);
  const inp = el('bulk-n'), ok = el('bulk-ok');
  inp.oninput = () => { ok.disabled = inp.value.trim() !== String(total); };
  inp.onkeydown = ev => { if(ev.key==='Enter' && !ok.disabled) ok.click(); };
  inp.focus();
  ok.onclick = async () => {
    ok.disabled = true; ok.textContent = 'Apagando…';
    const msg = [];
    try{
      if(salas.length){
        const { data, error } = await sb.rpc('apagar_salas', { p_ids: salas.map(s=>s.id) });
        if(error) throw error;
        msg.push(`${data.apagadas} sala${data.apagadas>1?'s':''}`);
      }
      if(saves.length){
        const { data, error } = await sb.rpc('apagar_saves',
          { p_saves: saves.map(s => ({ u:s.user_id, s:s.save_name })) });
        if(error) throw error;
        msg.push(`${data.saves} save${data.saves>1?'s':''}`);
      }
    }catch(e){
      ok.disabled=false; ok.textContent='Apagar tudo';
      return toast(erroMsg(e), true);
    }
    SEL.salas.clear(); SEL.saves.clear();
    fecharModal(); barraSelecao();
    toast('Apagado: ' + msg.join(' e ') + '.');
    pgJogos();
  };
}

/* APAGAR SALA — some com a sala e com tudo que pende dela (assentos, chat, convites,
   pedidos, eventos da rodada), por cascata no banco. Não há cópia do estado em lugar
   nenhum: quem estava jogando perde a temporada. Por isso não é um confirm() seco —
   exige digitar o código da sala, que é o que separa "cliquei sem ler" de "quis mesmo". */
function modalApagarSala(codigo, humanos){
  abrirModal(`
    <h3>Apagar a sala ${h(codigo)}?</h3>
    <div class="col">
      <div class="erro" style="line-height:1.6">
        Isto apaga a sala do banco de vez — assentos, chat, convites e histórico de rodadas
        vão junto.${humanos>0?` Há <b>${humanos} treinador${humanos>1?'es humanos':' humano'}</b> nesta sala; a temporada deles acaba aqui.`:''}
        <br>Não dá para desfazer.
      </div>
      <label class="f">Digite <b class="mono">${h(codigo)}</b> para confirmar
        <input class="f mono" id="del-cod" autocomplete="off" placeholder="${h(codigo)}"></label>
      <div class="acoes">
        <button class="btn" id="del-ok" style="background:var(--vermelho);color:#fff" disabled>Apagar sala</button>
        <button class="btn btn-ghost" data-fechar>Cancelar</button>
      </div>
    </div>`);
  const inp = el('del-cod'), ok = el('del-ok');
  inp.oninput = () => { ok.disabled = inp.value.trim().toUpperCase() !== String(codigo).toUpperCase(); };
  inp.onkeydown = ev => { if(ev.key==='Enter' && !ok.disabled) ok.click(); };
  inp.focus();
  ok.onclick = async () => {
    ok.disabled = true; ok.textContent = 'Apagando…';
    const { data, error } = await sb.rpc('apagar_sala', { p_game: codigo });
    if(error){ ok.disabled = false; ok.textContent = 'Apagar sala'; return toast(erroMsg(error), true); }
    fecharModal();
    toast(`Sala ${data.sala} apagada — ${data.assentos} assentos, ${data.mensagens} mensagens.`);
    pgJogos();
  };
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
      // guarda o retrato ANTES de apagar — depois a linha já não existe para descrever
      const alvo = D.lancamentos.find(x => x.id === b.dataset.delLanc) || {};
      const { error } = await sb.from('adm_lancamentos').delete().eq('id', b.dataset.delLanc);
      if(error) return toast(erroMsg(error), true);
      registrar('lancamento.apagar', b.dataset.delLanc,
                { descricao: alvo.descricao, categoria: alvo.categoria, valor: alvo.valor_centavos });
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
      registrar('patrocinador.apagar', b.dataset.delPatro);
      toast('Patrocinador apagado.'); pgPublicidade();
    });
    document.querySelectorAll('[data-upload]').forEach(b => b.onclick = () => modalUpload(b.dataset.upload));
    document.querySelectorAll('[data-tirar]').forEach(b => b.onclick = async () => {
      if(!confirm('Tirar este criativo do ar? O espaço deixa de ser desenhado no jogo.')) return;
      const { error } = await jogo('ad_creatives').update({ ativo:false }).eq('id', b.dataset.tirar);
      if(error) return toast(erroMsg(error), true);
      registrar('criativo.tirar', b.dataset.tirar);
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
    registrar('patrocinador.criar', nome, {valor_mes_centavos:valor});
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
      registrar('criativo.publicar', e.chave, {arquivo:caminho, bytes:arquivo.size, link:link||null});
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

/* rótulos das ações do log — a coluna mostra a frase, não a chave técnica */
const ACOES = {
  'sala.apagar':'Apagou uma sala', 'convite.criar':'Criou convite',
  'convite.aceitar':'Entrou no painel pela primeira vez', 'papel.mudar':'Mudou o papel de alguém',
  'criativo.publicar':'Publicou criativo', 'criativo.tirar':'Tirou criativo do ar',
  'patrocinador.criar':'Cadastrou patrocinador', 'patrocinador.apagar':'Apagou patrocinador',
  'lancamento.apagar':'Apagou lançamento'
};
function resumoAcao(a){
  const d = a.detalhe || {};
  if(a.acao==='sala.apagar')  return `${a.alvo} · ${d.assentos||0} assentos, ${d.humanos||0} humano${d.humanos===1?'':'s'}`;
  if(a.acao==='lancamento.apagar') return `${d.descricao||a.alvo||''}${d.valor?' · '+brl(d.valor):''}`;
  if(a.acao==='criativo.publicar') return `${a.alvo}${d.bytes?' · '+Math.round(d.bytes/1024)+' KB':''}`;
  if(d.papel) return `${a.alvo} · ${d.papel}`;
  return a.alvo || '—';
}
/* ============================ EQUIPE ADMIN ============================ */
async function pgEquipa(){
  // A lista de contas do jogo alimenta o seletor do convite: quase sempre o convidado
  // já é jogador, e digitar o e-mail dele de novo é onde nasce o erro de digitação
  // (o convite fica preso a um endereço que ninguém usa).
  const [us, inv, jogadores, log] = await Promise.all([
    sb.from('adm_users').select('*').order('criado_em'),
    sb.from('adm_invites').select('*').is('aceito_em', null).order('criado_em', { ascending:false }),
    sb.rpc('usuarios', { p_busca:null, p_limite:500 }),
    sb.from('adm_audit').select('*').order('quando', { ascending:false }).limit(40)
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
    </div>

    <div class="card" style="overflow:hidden">
      <div class="card-h"><b>Histórico de ações</b>
        <span style="font-size:11.5px;color:var(--dim3)">quem mexeu em quê · o registro não pode ser editado nem apagado</span></div>
      ${(log.data||[]).length ? (log.data||[]).map(a=>`
        <div class="row" style="grid-template-columns:150px 1fr 1.2fr 130px;padding:10px 20px">
          <span class="mono" style="font-size:11.5px;color:var(--dim2)">${dmy(a.quando)} ${new Date(a.quando).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
          <span style="font-size:12.5px">${h(ACOES[a.acao]||a.acao)}</span>
          <span class="mono" style="font-size:12px;color:var(--dim);overflow:hidden;text-overflow:ellipsis">${h(resumoAcao(a))}</span>
          <span style="font-size:12px;color:var(--dim2);text-align:right;overflow:hidden;text-overflow:ellipsis">${h(a.quem_email||'—')}</span>
        </div>`).join('') : '<div class="vazio">Nenhuma ação registrada ainda.</div>'}
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
      registrar('papel.mudar', s.dataset.papel, {papel:s.value});
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
/* AUDITORIA — as ações que passam por RLS (sem função no banco no meio) registram
   daqui. As que já são função (apagar sala, convidar) registram lá dentro, na mesma
   transação. Falha de registro nunca derruba a ação em si: o log é consequência,
   não condição. */
async function registrar(acao, alvo, detalhe){
  try{
    const { data:{ user } } = await sb.auth.getUser();
    await sb.from('adm_audit').insert({ quem:user.id, quem_email:user.email,
      acao, alvo: alvo||null, detalhe: detalhe||null });
  }catch(e){ console.warn('auditoria:', e && e.message); }
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


/* ============================================================================
   EDITOR DE DADOS DO JOGO — pacotes
   ----------------------------------------------------------------------------
   O catálogo de fábrica (clubes e elencos) NÃO está no banco: são ~360 KB de JS
   servidos com o jogo, iguais para todo jogador. O editor carrega esses mesmos
   arquivos do site do jogo — assim o painel enxerga exatamente o que o jogador
   enxerga — e grava só o DIFF, dentro de um PACOTE.

   O pacote OFICIAL entra por padrão em todo jogo novo: é onde se corrige dado
   errado do catálogo. Os demais pacotes têm dono e código de compartilhamento, e
   valem no jogo de quem os escolhe ao criar a partida (ver src/net/dados.js).
   ============================================================================ */
const JOGO_URL = 'https://retrofoot98.com.br';
const CAMPOS_CLUBE   = ['name','short','color','color2','crest','OS','MS','DS','overall'];
const CAMPOS_JOGADOR = ['n','p','s','f','age','mv','num','nat'];
const POSICOES = ['GOL','ZAG','LAD','LAE','VOL','MC','MEI','PD','PE','SA','CA'];
/* o motor escala por SETOR (s), não pela posição escrita (p) */
function setorDe(pos){
  return pos==='GOL' ? 'GK'
       : ['ZAG','LAD','LAE'].includes(pos) ? 'DEF'
       : ['VOL','MC','MEI'].includes(pos) ? 'MID' : 'ATT';
}

let catalogoCarregado = false;
function carregarCatalogo(){
  if(catalogoCarregado) return Promise.resolve();
  const arquivos = ['/src/data/game-data.js', '/src/data/leagues-brasil-lower.js',
                    '/src/data/leagues-intl.js', '/src/data/leagues-conmebol.js',
                    '/src/data/universos.js', '/src/data/competicoes.js',
                    '/src/engine/world-rules.js'];
  return Promise.all(arquivos.map(f => new Promise((ok, erro) => {
    const t = document.createElement('script');
    t.src = JOGO_URL + f; t.onload = ok;
    t.onerror = () => erro(new Error('Não foi possível carregar ' + f + ' do site do jogo.'));
    document.head.appendChild(t);
  }))).then(() => { catalogoCarregado = true; });
}
/* Todo clube que o jogo conhece, com país e divisão. Brasil é separado por divisão;
   Europa e América do Sul têm uma lista por país, e a divisão de lá é o campo `lg`. */
function clubesDeFabrica(){
  const out = [];
  if(window.GAME_DATA && Array.isArray(window.GAME_DATA.clubs))
    window.GAME_DATA.clubs.forEach(c => out.push({ div:'A', pais:'Brasil', c }));
  if(window.BRASIL_LOWER) for(const d of ['B','C','D'])
    (window.BRASIL_LOWER[d]||[]).forEach(c => out.push({ div:d, pais:'Brasil', c }));
  for(const fonte of ['INTL_LEAGUES','CONMEBOL_LEAGUES']){
    const mapa = window[fonte]; if(!mapa) continue;
    for(const pais of Object.keys(mapa))
      (mapa[pais]||[]).forEach(c => out.push({ div:c.lg||'—', pais, c }));
  }
  return out;
}
/* comparação de nome tolerante: acento, caixa e pontuação não podem separar
   "Atlético-MG" de "atletico mg" quando o arquivo importado vier de outra fonte */
function chaveNome(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]/g,'');
}

async function pgEditor(){
  const editar = podeEditar('dados');
  try{ await carregarCatalogo(); }
  catch(e){ el('page').innerHTML = `<div class="erro">${h(e.message)}</div>`; return; }

  const packs = await jogo('data_packs').select('*').order('oficial', { ascending:false }).order('criado_em');
  if(packs.error) throw packs.error;
  D.packs = packs.data||[];
  if(!ST.packId || !D.packs.some(p=>p.id===ST.packId))
    ST.packId = (D.packs.find(p=>p.oficial)||D.packs[0]||{}).id;
  const pack = D.packs.find(p=>p.id===ST.packId);
  if(!pack){ el('page').innerHTML = '<div class="erro">Nenhum patch encontrado.</div>'; return; }

  const eds = await jogo('pack_edits').select('*').eq('pack_id', pack.id);
  if(eds.error) throw eds.error;
  D.edits = {}; (eds.data||[]).forEach(e => { D.edits[e.club_id] = e; });

  const base = clubesDeFabrica();
  (eds.data||[]).filter(e => e.novo && e.club_id !== COMPETICOES_CHAVE).forEach(e => {
    if(!base.some(x => String(x.c.id)===String(e.club_id)))
      base.push({ div:e.divisao||'D', pais:(e.patch||{}).pais||'Brasil',
                  c:Object.assign({id:e.club_id}, e.patch||{}), criado:true });
  });
  D.catalogo = base;

  const aba = ST.abaEditor || 'clubes';
  el('page').innerHTML = `
    ${cabecalhoPatches(pack, editar)}
    <div class="per" style="gap:6px;margin-top:2px">
      ${[['clubes','Clubes'],['jogadores','Jogadores'],['competicoes','Competições']]
        .map(([id,l])=>`<span class="${aba===id?'on':''}" data-aba="${id}" style="padding:9px 16px">${l}</span>`).join('')}
    </div>
    <div id="ed-aba"></div>`;

  document.querySelectorAll('[data-aba]').forEach(x => x.onclick = () => { ST.abaEditor=x.dataset.aba; pgEditor(); });
  ligarCabecalhoPatches(pack, editar);

  if(aba==='clubes')      abaClubes(editar);
  else if(aba==='jogadores') abaJogadores(editar);
  else                    abaCompeticoes(pack, editar);
}

/* ---------- cabeçalho: escolha do patch ---------- */
function nomePatch(p){ return p.oficial ? 'Patch Original RetroFoot 2026' : p.nome; }
function cabecalhoPatches(pack, editar){
  return `
    <div class="card card-p">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div style="flex:1"><div class="tt">Patch em edição</div>
          <div class="st">Clique num patch para editá-lo. O original entra em todo jogo novo; os demais valem para quem os escolher ao criar a partida.</div></div>
        ${editar?`<button class="btn btn-sm btn-ghost" id="ed-novo-pack">+ Novo patch</button>`:''}
        ${editar?`<button class="btn btn-sm" id="ed-importar">Importar arquivo</button>`:''}
      </div>
      <div class="g3" style="gap:10px">
        ${(D.packs||[]).map(p=>`
          <div class="slot ${p.id===pack.id?'no-ar':'livre'}" data-pack="${p.id}"
               style="cursor:pointer;padding:14px 16px;gap:8px">
            <div style="display:flex;align-items:flex-start;gap:8px">
              <div style="flex:1;min-width:0">
                <b style="display:block;font-size:13.5px">${h(nomePatch(p))}</b>
                <small style="display:block;font-size:11.5px;color:var(--dim2)">
                  ${p.oficial?'entra em todo jogo novo':'de '+h(p.autor_nome||'—')}</small>
              </div>
              ${p.id===pack.id?'<span class="tag t-ok">editando</span>':''}
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <code class="mono" style="font-size:11px;color:var(--verde2)">${h(p.codigo)}</code>
              ${p.id===pack.id?`<span class="link" data-copiar-pack style="font-size:11px">copiar convite</span>`:''}
            </div>
          </div>`).join('')}
        <div class="slot livre" style="padding:14px 16px;gap:8px;opacity:.65">
          <div><b style="display:block;font-size:13.5px">Editor público</b>
            <small style="display:block;font-size:11.5px;color:var(--dim2)">para o jogador montar o patch dele</small></div>
          <button class="btn btn-sm" disabled style="cursor:not-allowed">Em breve</button>
          <small style="font-size:11px;color:var(--dim3);line-height:1.5">
            Estamos trabalhando nisso para a próxima versão do jogo.</small>
        </div>
      </div>
      ${pack.descricao?`<div class="st" style="margin-top:10px">${h(pack.descricao)}</div>`:''}
    </div>`;
}
function ligarCabecalhoPatches(pack, editar){
  document.querySelectorAll('[data-pack]').forEach(c => c.onclick = ev => {
    if(ev.target.closest('[data-copiar-pack]')) return;
    ST.packId = c.dataset.pack; pgEditor();
  });
  const cp = document.querySelector('[data-copiar-pack]');
  if(cp) cp.onclick = () => {
    const url = `${JOGO_URL}/?pacote=${encodeURIComponent(pack.codigo)}`;
    navigator.clipboard.writeText(url).then(()=>toast('Convite do patch copiado.'), ()=>prompt('Copie o link:', url));
  };
  if(editar){
    el('ed-novo-pack').onclick = modalNovoPacote;
    el('ed-importar').onclick = modalImportar;
  }
}

/* ---------- aba CLUBES ---------- */
function abaClubes(editar){
  const base = D.catalogo||[];
  const busca = (ST.buscaClube||'').toLowerCase();
  const pais = ST.paisFiltro || 'todos';
  const paises = Array.from(new Set(base.map(x=>x.pais))).sort((a,b)=> a==='Brasil'?-1:b==='Brasil'?1:a.localeCompare(b,'pt-BR'));
  const lista = base.filter(x =>
    (pais==='todos' || x.pais===pais) &&
    (!busca || String(x.c.name||'').toLowerCase().includes(busca)
            || String(x.c.short||'').toLowerCase().includes(busca)
            || String(x.c.id).toLowerCase().includes(busca)));
  const editados = Object.values(D.edits||{}).filter(e=>e.club_id!==COMPETICOES_CHAVE).length;

  el('ed-aba').innerHTML = `
    <div class="g4" style="margin-bottom:16px">
      ${kpiHTML({l:'Clubes no catálogo', v:num(base.length), d:`${paises.length} países`})}
      ${kpiHTML({l:'Clubes neste patch', v:num(editados), d: editados? 'alterados ou criados' : 'nada alterado ainda'})}
      ${kpiHTML({l:'Criados aqui', v:num(base.filter(x=>x.criado).length), d:'não existem no arquivo de fábrica'})}
      ${kpiHTML({l:'Jogadores', v:num(base.reduce((a,x)=>a+((x.c.squad||[]).length),0)), d:'somando todos os países'})}
    </div>
    <div class="card" style="overflow:hidden">
      <div class="card-h">
        <b>Clubes</b>
        <select class="busca" id="ed-pais" style="width:170px">
          <option value="todos">Todos os países</option>
          ${paises.map(p=>`<option value="${h(p)}" ${p===pais?'selected':''}>${h(p)}</option>`).join('')}
        </select>
        <input class="busca" id="ed-busca" placeholder="Procurar clube…" value="${h(ST.buscaClube||'')}">
        ${editar?'<button class="btn btn-sm" id="ed-novo">+ Clube</button>':''}
      </div>
      <div class="rowh" style="grid-template-columns:44px 1.6fr .9fr .7fr .7fr .8fr .9fr">
        <span></span><span>Clube</span><span>País</span><span style="text-align:center">Divisão</span>
        <span style="text-align:center">Força</span><span style="text-align:center">Elenco</span>
        <span style="text-align:right">Neste patch</span>
      </div>
      ${lista.length ? lista.slice(0,120).map(x => {
        const e = D.edits[x.c.id]; const cor = x.c.color || '#333';
        return `<div class="row" style="grid-template-columns:44px 1.6fr .9fr .7fr .7fr .8fr .9fr;cursor:pointer" data-clube="${h(x.c.id)}">
          <span>${x.c.crest
            ? `<img src="${h(x.c.crest)}" alt="" style="width:26px;height:26px;object-fit:contain">`
            : `<i class="av" style="width:26px;height:26px;border-radius:6px;background:${h(cor)};color:#fff;font-size:10px">${h(iniciais(x.c.short||x.c.name))}</i>`}</span>
          <span style="min-width:0"><b style="display:block;font-size:13px;font-weight:600">${h(x.c.short||x.c.name)}</b>
            <small class="mono" style="font-size:11px;color:var(--dim3)">${h(x.c.id)}</small></span>
          <span style="font-size:12px;color:var(--dim)">${h(x.pais)}</span>
          <span class="mono" style="font-size:12px;text-align:center">${h(x.div)}</span>
          <span class="mono" style="font-size:12.5px;text-align:center">${x.c.overall!=null?x.c.overall:'—'}</span>
          <span class="mono" style="font-size:12.5px;text-align:center">${(x.c.squad||[]).length}</span>
          <span style="text-align:right">${e
            ? `<span class="tag ${e.novo?'t-roxo':'t-ok'}">${e.novo?'criado aqui':'editado'}</span>`
            : '<span style="font-size:12px;color:var(--dim3)">de fábrica</span>'}</span>
        </div>`;
      }).join('') : '<div class="vazio">Nenhum clube encontrado.</div>'}
      ${lista.length>120?`<div class="vazio">Mostrando 120 de ${lista.length} — refine a busca.</div>`:''}
    </div>`;

  const b = el('ed-busca'); let t=null;
  b.oninput = () => { clearTimeout(t); t=setTimeout(()=>{ ST.buscaClube=b.value.trim(); pgEditor(); },300); };
  el('ed-pais').onchange = () => { ST.paisFiltro = el('ed-pais').value; pgEditor(); };
  document.querySelectorAll('[data-clube]').forEach(r => r.onclick = () => abrirClube(r.dataset.clube));
  if(editar) el('ed-novo').onclick = modalNovoClube;
}

/* ---------- aba JOGADORES ----------
   A mesma edição da ficha do clube, mas entrando pelo jogador: quem quer corrigir
   "a idade do Vitor Roque" não deveria precisar saber em que clube ele está. */
function abaJogadores(editar){
  const busca = (ST.buscaJogador||'').trim().toLowerCase();
  let achados = [];
  if(busca.length >= 2){
    for(const x of (D.catalogo||[])){
      for(const p of (x.c.squad||[])){
        if(String(p.n||'').toLowerCase().includes(busca)) achados.push({ x, p });
        if(achados.length > 300) break;
      }
      if(achados.length > 300) break;
    }
    achados.sort((a,b)=>(b.p.f||0)-(a.p.f||0));
  }
  el('ed-aba').innerHTML = `
    <div class="card" style="overflow:hidden">
      <div class="card-h">
        <b>Jogadores</b>
        <input class="busca" id="ed-bj" style="width:300px" placeholder="Nome do jogador (mín. 2 letras)…" value="${h(ST.buscaJogador||'')}">
        <span style="font-size:12px;color:var(--dim2)">${busca.length>=2? num(achados.length)+' encontrados' : ''}</span>
      </div>
      ${busca.length<2
        ? '<div class="vazio">Escreva o nome do jogador para procurar em todos os clubes e países.</div>'
        : (achados.length ? `
          <div class="rowh" style="grid-template-columns:1.6fr 1.2fr .7fr .6fr .5fr .9fr">
            <span>Jogador</span><span>Clube</span><span>Pos</span>
            <span style="text-align:center">Força</span><span style="text-align:center">Idade</span>
            <span style="text-align:right">Valor</span>
          </div>` + achados.slice(0,120).map(({x,p})=>`
            <div class="row" style="grid-template-columns:1.6fr 1.2fr .7fr .6fr .5fr .9fr;cursor:pointer" data-jog-clube="${h(x.c.id)}">
              <b style="font-size:13px;font-weight:600">${h(p.n)}</b>
              <span style="font-size:12.5px;color:var(--dim)">${h(x.c.short||x.c.name)} · ${h(x.pais)}</span>
              <span class="mono" style="font-size:12px">${h(p.p||'—')}</span>
              <span class="mono" style="font-size:12.5px;text-align:center">${p.f!=null?p.f:'—'}</span>
              <span class="mono" style="font-size:12.5px;text-align:center">${p.age!=null?p.age:'—'}</span>
              <span class="mono" style="font-size:12px;text-align:right;color:var(--dim)">${p.mv?brl(p.mv*100):'—'}</span>
            </div>`).join('')
          : '<div class="vazio">Nenhum jogador com esse nome.</div>')}
      ${achados.length>120?`<div class="vazio">Mostrando 120 de ${achados.length}.</div>`:''}
    </div>`;
  const b = el('ed-bj'); let t=null;
  b.oninput = () => { clearTimeout(t); t=setTimeout(()=>{ ST.buscaJogador=b.value; pgEditor(); },350); };
  b.focus(); b.setSelectionRange(b.value.length,b.value.length);
  document.querySelectorAll('[data-jog-clube]').forEach(r => r.onclick = () => abrirClube(r.dataset.jogClube));
}

/* ---------- ficha do clube: dados + elenco ---------- */
function abrirClube(id){
  const item = (D.catalogo||[]).find(x => String(x.c.id)===String(id));
  if(!item) return;
  const c = item.c, ed = D.edits[id], editar = podeEditar('dados');
  const sq = (c.squad||[]).slice().sort((a,b)=>(b.f||0)-(a.f||0));

  abrirModal(`
    <h3 style="margin-bottom:4px">${h(c.short||c.name)}</h3>
    <div style="font-size:12.5px;color:var(--dim2);margin-bottom:16px">
      <span class="mono">${h(c.id)}</span> · Série ${h(item.div)}
      ${ed?` · <span class="tag ${ed.novo?'t-roxo':'t-ok'}">${ed.novo?'criado aqui':'editado'}</span>`:''}
    </div>
    <div class="col" style="gap:14px">
      <div class="g2" style="gap:12px">
        <label class="f">Nome<input class="f" id="c-name" value="${h(c.name||'')}" ${editar?'':'disabled'}></label>
        <label class="f">Nome curto<input class="f" id="c-short" value="${h(c.short||'')}" ${editar?'':'disabled'}></label>
      </div>
      <div class="g2" style="gap:12px">
        ${campoCor('c-color','Cor principal', c.color||'#1b7a3d')}
        ${campoCor('c-color2','Cor secundária', c.color2||'#ffffff')}
      </div>
      <div id="c-preview" style="padding:2px 0"></div>
      <label class="f">Escudo (URL)
        <input class="f" id="c-crest" value="${h(c.crest||'')}" placeholder="https://… ou envie um arquivo" ${editar?'':'disabled'}>
      </label>
      ${editar?`<div style="display:flex;align-items:center;gap:10px">
        <button class="btn btn-sm btn-ghost" id="c-escudo-btn">Enviar escudo (PNG/WEBP, até 1 MB)</button>
        <input type="file" id="c-escudo" accept=".png,.webp,.jpg,.jpeg" style="display:none">
        <span id="c-escudo-prev">${c.crest?`<img src="${h(c.crest)}" style="width:28px;height:28px;object-fit:contain">`:''}</span>
      </div>`:''}
      <div class="g4" style="gap:10px">
        ${[['OS','Ataque'],['MS','Meio'],['DS','Defesa'],['overall','Geral']].map(([k,l])=>
          `<label class="f">${l}<input class="f mono" id="c-${k}" type="number" min="1" max="99"
             value="${c[k]!=null?c[k]:''}" ${editar?'':'disabled'}></label>`).join('')}
      </div>

      <div style="display:flex;align-items:baseline;gap:10px;margin-top:6px">
        <div class="tt">Elenco — ${sq.length} jogadores</div>
        <span class="st" style="margin:0">valores em <b>R$</b> — o jogo converte para a moeda escolhida ao criar o save</span>
      </div>
      <div class="jog-wrap">
        <div class="jog-hd" style="grid-template-columns:${gradeElenco(editar)}">
          <span>Jogador</span><span>Posição</span><span style="text-align:center">Força</span>
          <span style="text-align:center">Idade</span><span style="text-align:right">Valor R$</span>${editar?'<span></span>':''}
        </div>
        <div id="c-elenco">
          ${sq.map(p => linhaJogador(p, editar)).join('') || '<div class="vazio">Elenco vazio.</div>'}
        </div>
      </div>
      ${editar?`<button class="btn btn-sm btn-ghost" id="c-add-jog">+ Adicionar jogador</button>`:''}

      <div class="acoes">
        ${editar?`<button class="btn" id="c-salvar">Salvar no patch</button>`:''}
        ${editar&&ed?`<button class="btn btn-ghost" id="c-reverter" style="flex:0 0 auto;color:var(--vermelho)">Tirar do patch</button>`:''}
        <button class="btn btn-ghost" data-fechar>Fechar</button>
      </div>
    </div>`, 'xl');

  if(!editar) return;

  /* RETRATO DO FORMULÁRIO NA ABERTURA. O diff não pode comparar o campo com o objeto
     do clube direto: <input type="color"> normaliza #1B7A3D para minúsculas e devolve
     #ffffff para clube sem cor secundária — sem tocar em nada, as duas cores entravam
     no patch. Comparar com o que o campo TINHA quando abriu diz o que a pessoa mexeu. */
  D.formInicial = {};
  CAMPOS_CLUBE.forEach(k => { const n = el('c-'+k); if(n) D.formInicial['c-'+k] = n.value; });
  // mesmos seletores do modal de clube novo: amostra da camisa ao vivo e o campo
  // hexadecimal em sincronia com o seletor visual, nos dois sentidos
  ligarCores('c-color','c-color2','c-preview');

  // Geral acompanha ataque/meio/defesa enquanto ninguém digitar nele à mão — era o
  // único número que ficava velho depois de mexer nos outros três
  let geralTocado = false;
  if(el('c-overall')) el('c-overall').oninput = () => { geralTocado = true; };
  ['OS','MS','DS'].forEach(k => { const n = el('c-'+k); if(n) n.oninput = () => {
    if(geralTocado || !el('c-overall')) return;
    const m = Math.round(((+el('c-OS').value||0)+(+el('c-MS').value||0)+(+el('c-DS').value||0))/3);
    if(m) el('c-overall').value = m;
  }; });

  el('c-escudo-btn').onclick = () => el('c-escudo').click();
  el('c-escudo').onchange = async () => {
    const f = el('c-escudo').files[0]; if(!f) return;
    if(f.size > 1024*1024) return toast('Escudo acima de 1 MB.', true);
    const ext = (f.name.split('.').pop()||'png').toLowerCase();
    const caminho = `${c.id}-${Date.now()}.${ext}`;
    const up = await sb.storage.from('escudos').upload(caminho, f, { upsert:false, cacheControl:'3600' });
    if(up.error) return toast(erroMsg(up.error), true);
    const url = sb.storage.from('escudos').getPublicUrl(caminho).data.publicUrl;
    el('c-crest').value = url;
    el('c-escudo-prev').innerHTML = `<img src="${h(url)}" style="width:28px;height:28px;object-fit:contain">`;
    toast('Escudo enviado — salve para valer.');
  };
  el('c-add-jog').onclick = () => {
    const div = document.createElement('div');
    div.innerHTML = linhaJogador({ n:'', p:'MC', s:'MID', f:30, age:22, mv:100000 }, true, true);
    const linha = div.firstElementChild;
    el('c-elenco').prepend(linha);
    linha.querySelector('[data-k="n"]').focus();
  };
  // remover jogador é só tirar a linha da tela: quem some do elenco entra em
  // squad_remover na hora de montar o diff (ver salvarClube)
  el('c-elenco').addEventListener('click', ev => {
    const x = ev.target.closest('[data-rm-jog]');
    if(x) x.closest('[data-jog]').remove();
  });
  // valor de mercado é pontuado enquanto se digita (o campo guarda R$ puro)
  el('c-elenco').addEventListener('input', ev => {
    const alvo = ev.target;
    if(!alvo.matches || !alvo.matches('[data-moeda]')) return;
    const n = lerBRLCampo(alvo.value);
    alvo.value = n==null ? '' : n.toLocaleString('pt-BR');
  });
  el('c-salvar').onclick = () => salvarClube(item);
  if(ed) el('c-reverter').onclick = async () => {
    if(!confirm('Tirar este clube do pacote? Ele volta ao arquivo de fábrica.')) return;
    const { error } = await jogo('pack_edits').delete().eq('pack_id', ST.packId).eq('club_id', c.id);
    if(error) return toast(erroMsg(error), true);
    registrar('clube.reverter', String(c.id), { pacote: ST.packId });
    fecharModal(); toast('Clube voltou ao de fábrica.'); pgEditor();
  };
}

/* UMA definição de grade para o cabeçalho e para as linhas do elenco: quando eram
   duas strings iguais copiadas, bastava mexer numa para as colunas desalinharem.
   Larguras fixas nos números e fr só no nome — é o que faz caber sem rolagem lateral. */
/* MOEDA DO EDITOR É SEMPRE REAL. O motor guarda todo valor em R$ e só converte na
   apresentação, conforme a moeda que o jogador escolhe ao criar o save (ver curInfo/
   curConv em index.html). Então o editor grava R$ puro — quem converte é o jogo, na
   hora de montar o save. O campo mostra o número pontuado para ser legível:
   235600000 vira "235.600.000". */
function brlCampo(v){
  const n = Math.max(0, Math.round(Number(v)||0));
  return n ? n.toLocaleString('pt-BR') : '';
}
function lerBRLCampo(txt){
  const d = String(txt==null?'':txt).replace(/\D/g,'');
  return d === '' ? null : Number(d);
}
function gradeElenco(editar){
  return `minmax(0,2fr) 88px 66px 62px minmax(0,1.1fr)${editar?' 24px':''}`;
}
function linhaJogador(p, editar, novo){
  const dis = editar?'':'disabled';
  return `<div class="jog-linha" style="grid-template-columns:${gradeElenco(editar)}"
       data-jog data-orig="${h(p.n||'')}" ${novo?'data-novo="1"':''}>
    <input class="f" data-k="n" value="${h(p.n||'')}" placeholder="Nome do jogador" ${dis}>
    <select class="f" data-k="p" ${dis}>
      ${POSICOES.map(x=>`<option ${x===p.p?'selected':''}>${x}</option>`).join('')}
    </select>
    <input class="f mono" data-k="f" type="number" min="1" max="99" value="${p.f!=null?p.f:''}" ${dis}>
    <input class="f mono" data-k="age" type="number" min="15" max="45" value="${p.age!=null?p.age:''}" ${dis}>
    <input class="f mono" data-k="mv" data-moeda="1" type="text" inputmode="numeric"
           value="${brlCampo(p.mv)}" ${dis} style="text-align:right"
           title="Valor de mercado em R$ — o jogo converte para a moeda do save">
    ${editar?`<span class="rm" data-rm-jog title="Remover do elenco">✕</span>`:''}
  </div>`;
}

/* monta o DIFF: só o que difere do arquivo de fábrica entra no patch. É o que mantém
   o pacote pequeno e deixa o clube seguir recebendo atualização do catálogo nos
   campos que ninguém tocou. */
function montarPatch(item){
  const c = item.c;
  const patch = {};
  const inicial = D.formInicial || {};
  const valor = id => { const n = el(id); return n ? n.value : null; };
  for(const k of CAMPOS_CLUBE){
    const v = valor('c-'+k);
    if(v == null) continue;
    if(v === inicial['c-'+k]) continue;
    if(['color','color2','crest','name','short'].includes(k)){
      const t = v.trim();
      if(t && t.toLowerCase() !== String(c[k]||'').toLowerCase()) patch[k] = t;
    } else if(v !== '' && Number(v) !== c[k]) {
      patch[k] = Number(v);
    }
  }
  const squad = {}, novos = [], remover = [];
  const originais = new Map((c.squad||[]).map(p => [p.n, p]));
  const vistos = new Set();
  document.querySelectorAll('#c-elenco [data-jog]').forEach(linha => {
    const dados = {};
    linha.querySelectorAll('[data-k]').forEach(inp => {
      const k = inp.dataset.k;
      dados[k] = (k==='n'||k==='p') ? inp.value.trim()
               : (k==='mv') ? lerBRLCampo(inp.value)
               : (inp.value===''?null:Number(inp.value));
    });
    if(!dados.n) return;
    dados.s = setorDe(dados.p);
    const orig = originais.get(linha.dataset.orig);
    if(linha.dataset.novo || !orig){ novos.push(dados); return; }
    vistos.add(orig.n);
    const dif = {};
    for(const k of CAMPOS_JOGADOR) if(dados[k]!=null && dados[k]!=='' && dados[k]!==orig[k]) dif[k]=dados[k];
    if(dados.s !== orig.s) dif.s = dados.s;
    if(Object.keys(dif).length) squad[orig.n] = dif;
  });
  (c.squad||[]).forEach(p => { if(!vistos.has(p.n)) remover.push(p.n); });
  if(Object.keys(squad).length) patch.squad = squad;
  if(novos.length) patch.squad_novos = novos;
  if(remover.length) patch.squad_remover = remover;
  return { patch, squad, novos, remover };
}

async function salvarClube(item){
  const c = item.c, ed = D.edits[c.id];
  const { patch, squad, novos, remover } = montarPatch(item);
  if(!Object.keys(patch).length && !ed){ toast('Nada mudou.'); return; }

  const linha = {
    pack_id: ST.packId, club_id: String(c.id), divisao: item.div, novo: !!(ed && ed.novo),
    patch: (ed && ed.novo) ? Object.assign({}, ed.patch, patch) : patch
  };
  const { error } = await jogo('pack_edits').upsert(linha, { onConflict:'pack_id,club_id' });
  if(error) return toast(erroMsg(error), true);
  await jogo('data_packs').update({ atualizado_em:new Date().toISOString() }).eq('id', ST.packId);
  registrar('clube.editar', String(c.id), {
    pacote: ST.packId,
    campos: Object.keys(patch).filter(k=>!k.startsWith('squad')),
    jogadores: Object.keys(squad).length, novos: novos.length, removidos: remover.length });
  fecharModal(); toast('Salvo no pacote.'); pgEditor();
}

function modalNovoClube(){
  const paises = paisesDisponiveis();
  abrirModal(`
    <h3>Novo clube</h3>
    <div class="col">
      <div class="st" style="line-height:1.6;margin-bottom:4px">
        Entra na divisão escolhida como qualquer clube de fábrica, para quem usar este pacote.
        O elenco pode ficar vazio agora e ser preenchido depois, na ficha do clube.</div>

      <div class="g2" style="gap:12px">
        <label class="f">País
          <select class="f" id="n-pais">
            ${paises.map(p=>`<option value="${h(p.chave)}">${h(p.nome)}</option>`).join('')}
          </select></label>
        <label class="f">Competição / divisão
          <select class="f" id="n-div"></select></label>
      </div>

      <div class="g2" style="gap:12px">
        <label class="f">Nome<input class="f" id="n-name" placeholder="Ex.: Grêmio Novo Horizonte"></label>
        <label class="f">Nome curto<input class="f" id="n-short" placeholder="Ex.: Novo Horizonte"></label>
      </div>
      <label class="f">Identificador
        <input class="f mono" id="n-id" placeholder="gerado a partir do nome — pode editar"></label>

      <div class="g2" style="gap:12px">
        ${campoCor('n-color','Cor principal','#1b7a3d')}
        ${campoCor('n-color2','Cor secundária','#ffffff')}
      </div>
      <div id="n-preview" style="padding:4px 0"></div>

      <label class="f">Escudo
        <input class="f" id="n-crest" placeholder="https://… ou envie um arquivo"></label>
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn btn-sm btn-ghost" id="n-escudo-btn">Enviar escudo (PNG/WEBP, até 1 MB)</button>
        <input type="file" id="n-escudo" accept=".png,.webp,.jpg,.jpeg" style="display:none">
        <span id="n-escudo-prev"></span>
      </div>

      <div class="g4" style="gap:10px">
        ${[['OS','Ataque'],['MS','Meio'],['DS','Defesa']].map(([k,l])=>
          `<label class="f">${l}<input class="f mono" id="n-${k}" type="number" min="1" max="99" value="30"></label>`).join('')}
        <label class="f">Geral<input class="f mono" id="n-overall" type="number" min="1" max="99" value="30" disabled></label>
      </div>

      <div class="acoes">
        <button class="btn" id="n-ok">Criar clube</button>
        <button class="btn btn-ghost" data-fechar>Cancelar</button>
      </div>
    </div>`, 'lg');

  // divisões seguem o país escolhido
  function encherDivisoes(){
    const pais = paises.find(p => p.chave === el('n-pais').value) || paises[0];
    el('n-div').innerHTML = pais.divisoes.map(d =>
      `<option value="${h(d.codigo)}">${h(d.nome)}</option>`).join('');
  }
  el('n-pais').onchange = encherDivisoes; encherDivisoes();
  ligarCores('n-color','n-color2','n-preview');

  // identificador sai do nome, mas continua editável (é a chave do clube no jogo)
  let idTocado = false;
  el('n-id').oninput = () => { idTocado = true; };
  el('n-name').oninput = () => {
    if(idTocado) return;
    const pais = el('n-pais').value, div = el('n-div').value;
    const base = chaveNome(el('n-name').value).slice(0,24);
    el('n-id').value = base ? `${pais==='brasil'?'br':pais.slice(0,3).toLowerCase()}_${div}_${base}` : '';
  };

  el('n-escudo-btn').onclick = () => el('n-escudo').click();
  el('n-escudo').onchange = async () => {
    const f = el('n-escudo').files[0]; if(!f) return;
    if(f.size > 1024*1024) return toast('Escudo acima de 1 MB.', true);
    const ext = (f.name.split('.').pop()||'png').toLowerCase();
    const caminho = `novo-${Date.now()}.${ext}`;
    const up = await sb.storage.from('escudos').upload(caminho, f, { upsert:false, cacheControl:'3600' });
    if(up.error) return toast(erroMsg(up.error), true);
    const url = sb.storage.from('escudos').getPublicUrl(caminho).data.publicUrl;
    el('n-crest').value = url;
    el('n-escudo-prev').innerHTML = `<img src="${h(url)}" style="width:30px;height:30px;object-fit:contain">`;
  };

  const media = () => {
    const m = Math.round(((+el('n-OS').value||0)+(+el('n-MS').value||0)+(+el('n-DS').value||0))/3);
    el('n-overall').value = m || 30;
  };
  ['OS','MS','DS'].forEach(k => { el('n-'+k).oninput = media; });

  el('n-ok').onclick = async () => {
    const id = el('n-id').value.trim(), nome = el('n-name').value.trim();
    if(!id || !nome) return toast('Nome e identificador são obrigatórios.', true);
    if(!/^[a-z0-9_]+$/i.test(id)) return toast('Identificador: só letras, números e _', true);
    if((D.catalogo||[]).some(x => String(x.c.id)===id)) return toast('Já existe clube com esse identificador.', true);
    const OS=+el('n-OS').value||30, MS=+el('n-MS').value||30, DS=+el('n-DS').value||30;
    const pais = el('n-pais').value;
    const { error } = await jogo('pack_edits').insert({
      pack_id: ST.packId, club_id:id, divisao:el('n-div').value, novo:true,
      patch:{ id, name:nome, short:el('n-short').value.trim()||nome,
              color:el('n-color').value, color2:el('n-color2').value,
              crest: el('n-crest').value.trim()||null, pais,
              OS, MS, DS, overall: Math.round((OS+MS+DS)/3), squad:[] }
    });
    if(error) return toast(erroMsg(error), true);
    registrar('clube.criar', id, { nome, pais, divisao: el('n-div').value, pacote: ST.packId });
    fecharModal(); toast('Clube criado.'); pgEditor();
  };
}

function modalNovoPacote(){
  abrirModal(`
    <h3>Novo pacote de dados</h3>
    <div class="col">
      <div class="st" style="line-height:1.6">
        Um pacote é um conjunto de mudanças com dono. Ele <b>não</b> entra em todo jogo novo:
        vale para quem escolher este pacote ao criar a partida — e o código pode ser
        compartilhado para outras pessoas usarem o mesmo.</div>
      <label class="f">Nome<input class="f" id="p-nome" placeholder="Ex.: Brasileirão 2027 atualizado"></label>
      <label class="f">Descrição<input class="f" id="p-desc" placeholder="O que este pacote muda"></label>
      <label class="f">Código de compartilhamento
        <input class="f mono" id="p-cod" placeholder="BR2027" maxlength="16"></label>
      <div class="acoes">
        <button class="btn" id="p-ok">Criar pacote</button>
        <button class="btn btn-ghost" data-fechar>Cancelar</button>
      </div>
    </div>`);
  el('p-ok').onclick = async () => {
    const nome = el('p-nome').value.trim();
    const cod = (el('p-cod').value.trim() || nome).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,16);
    if(!nome || !cod) return toast('Nome e código são obrigatórios.', true);
    const { data:{ user } } = await sb.auth.getUser();
    const { data, error } = await jogo('data_packs').insert({
      codigo: cod, nome, descricao: el('p-desc').value.trim()||null,
      autor: user.id, autor_nome: ME.nome || user.email, oficial:false, publico:true
    }).select().single();
    if(error) return toast(/duplicate|unique/i.test(error.message)?'Já existe pacote com esse código.':erroMsg(error), true);
    await jogo('pack_users').insert({ user_id:user.id, pack_id:data.id });
    registrar('pacote.criar', cod, { nome });
    ST.packId = data.id;
    fecharModal(); toast('Pacote criado.'); pgEditor();
  };
}

/* ============================================================================
   IMPORTADOR DE ARQUIVO (txt / md / csv)
   ----------------------------------------------------------------------------
   Sem IA de propósito: o formato é tabelado, e um interpretador comum é
   previsível — o mesmo arquivo dá sempre o mesmo resultado, e um arquivo torto
   falha na linha errada em vez de "quase acertar" o elenco inteiro.

   Aceita tabela markdown (| a | b |), CSV e TSV, com cabeçalho. As colunas são
   reconhecidas pelo NOME, sem depender da ordem, e sem depender de acento ou
   caixa (ver chaveNome). Linha sem coluna de jogador é entendida como dado de
   clube; com jogador, como dado de elenco.

   NADA é gravado direto: o arquivo vira uma PRÉVIA do que muda, e só o botão de
   confirmar aplica. É o que impede um arquivo mal formatado de reescrever o
   catálogo — e o que mostra, antes, as linhas que não casaram com nenhum clube.
   ============================================================================ */
const COLUNAS = {
  clube:    ['clube','time','equipe','club','team','id_clube','clubid'],
  jogador:  ['jogador','nome','atleta','player','name'],
  forca:    ['forca','força','overall','ovr','f','power','rating'],
  idade:    ['idade','age'],
  posicao:  ['posicao','posição','pos','position'],
  valor:    ['valor','mv','preco','preço','value','marketvalue','valordemercado'],
  nomecurto:['nomecurto','curto','short','apelido'],
  escudo:   ['escudo','crest','logo','brasao','brasão'],
  cor:      ['cor','color','corprincipal'],
  ataque:   ['ataque','os','atk'],
  meio:     ['meio','ms','mid'],
  defesa:   ['defesa','ds','def']
};
function acharColuna(cabecalho){
  const mapa = {};
  cabecalho.forEach((titulo, i) => {
    const k = chaveNome(titulo);
    for(const campo of Object.keys(COLUNAS))
      if(COLUNAS[campo].some(a => chaveNome(a) === k)) { mapa[campo] = i; break; }
  });
  return mapa;
}
/* separa a linha pelo delimitador do arquivo: | de markdown, ; ou , de CSV, tab de TSV */
function separar(linha){
  const t = linha.trim();
  if(t.startsWith('|')) return t.replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
  if(t.includes('\t')) return t.split('\t').map(x=>x.trim());
  if(t.includes(';'))  return t.split(';').map(x=>x.trim());
  return t.split(',').map(x=>x.trim());
}
const soLinha = l => /^[\s|:\-+=]+$/.test(l);   // separador de tabela markdown

/* interpreta o texto e devolve o que MUDA em relação ao catálogo carregado */
function interpretar(texto){
  const linhas = texto.split(/\r?\n/).filter(l => l.trim() && !soLinha(l));
  if(linhas.length < 2) return { erro:'O arquivo precisa de um cabeçalho e ao menos uma linha.' };
  const cabecalho = separar(linhas[0]);
  const col = acharColuna(cabecalho);
  if(col.clube == null)
    return { erro:'Não encontrei a coluna do clube. O cabeçalho precisa ter uma coluna "Clube" (ou Time, Equipe, Club).' };

  // índice de busca por id, nome e nome curto
  const porChave = new Map();
  (D.catalogo||[]).forEach(x => {
    [x.c.id, x.c.name, x.c.short].forEach(v => { if(v) porChave.set(chaveNome(v), x); });
  });

  const mudancas = new Map();   // club_id -> {item, clube:{}, squad:{}, novos:[]}
  const semClube = [], semJogador = [], semEfeito = [];
  // coluna ausente/vazia tem de virar null, não 0: Number('') é 0, e isso estava
  // zerando o valor de mercado de todo jogador de arquivo sem coluna de valor
  const numero = v => {
    const t = String(v==null?'':v).replace(/[^\d.-]/g,'');
    if(t==='' || t==='-') return null;
    const n = Number(t);
    return isNaN(n) ? null : n;
  };

  let colAtual = col;
  const pegaCol = (celulas, campo) => colAtual[campo]!=null ? (celulas[colAtual[campo]]||'').trim() : '';
  for(let i=1;i<linhas.length;i++){
    const cel = separar(linhas[i]);
    // ARQUIVO COM MAIS DE UMA TABELA: um bloco de clubes e outro de jogadores, cada um
    // com seu cabeçalho. Sem isto, o cabeçalho do segundo bloco era lido como dado e as
    // colunas dele iam para o lugar errado. Uma linha em que TODAS as células são nomes
    // de coluna conhecidos é cabeçalho, não dado.
    const talvezCabecalho = acharColuna(cel);
    if(talvezCabecalho.clube != null && cel.every(x => {
         const k = chaveNome(x);
         return !k || Object.keys(COLUNAS).some(campo => COLUNAS[campo].some(a2 => chaveNome(a2)===k));
       })){ colAtual = talvezCabecalho; continue; }
    const nomeClube = pegaCol(cel,'clube');
    if(!nomeClube) continue;
    const item = porChave.get(chaveNome(nomeClube));
    if(!item){ semClube.push(nomeClube); continue; }
    const id = String(item.c.id);
    if(!mudancas.has(id)) mudancas.set(id, { item, clube:{}, squad:{}, novos:[] });
    const alvo = mudancas.get(id);
    const nomeJog = pegaCol(cel,'jogador');

    if(!nomeJog){
      // linha de CLUBE
      const c = item.c;
      const cand = { short:pegaCol(cel,'nomecurto'), crest:pegaCol(cel,'escudo'), color:pegaCol(cel,'cor'),
                     OS:numero(pegaCol(cel,'ataque')), MS:numero(pegaCol(cel,'meio')), DS:numero(pegaCol(cel,'defesa')) };
      let mexeu = false;
      for(const k of Object.keys(cand)){
        const v = cand[k];
        if(v==null || v==='' ) continue;
        if(String(v).toLowerCase() === String(c[k]||'').toLowerCase()) continue;
        alvo.clube[k] = v; mexeu = true;
      }
      if(!mexeu) semEfeito.push(nomeClube);
      continue;
    }

    // linha de JOGADOR
    const jog = (item.c.squad||[]).find(p => chaveNome(p.n) === chaveNome(nomeJog));
    const dados = {};
    const f = numero(pegaCol(cel,'forca')), age = numero(pegaCol(cel,'idade')), mv = numero(pegaCol(cel,'valor'));
    const pos = pegaCol(cel,'posicao').toUpperCase();
    if(f!=null) dados.f = f;
    if(age!=null) dados.age = age;
    if(mv!=null) dados.mv = mv;
    if(pos && POSICOES.includes(pos)){ dados.p = pos; dados.s = setorDe(pos); }
    if(!Object.keys(dados).length){ semEfeito.push(nomeJog); continue; }

    if(!jog){
      // jogador que não existe no elenco: entra como novo (com o nome escrito no arquivo)
      semJogador.push(`${nomeJog} (${item.c.short||item.c.name})`);
      alvo.novos.push(Object.assign({ n:nomeJog, p:'MC', s:'MID', f:30, age:24, mv:100000 }, dados));
      continue;
    }
    const dif = {};
    for(const k of Object.keys(dados)) if(dados[k] !== jog[k]) dif[k] = dados[k];
    if(Object.keys(dif).length) alvo.squad[jog.n] = dif; else semEfeito.push(nomeJog);
  }

  // clubes cujo resultado final não muda nada saem da prévia
  for(const [id, m] of Array.from(mudancas))
    if(!Object.keys(m.clube).length && !Object.keys(m.squad).length && !m.novos.length) mudancas.delete(id);

  return { mudancas, semClube, semJogador, semEfeito, linhas: linhas.length-1 };
}

function modalImportar(){
  const pack = (D.packs||[]).find(p=>p.id===ST.packId) || {};
  abrirModal(`
    <h3>Importar arquivo de dados</h3>
    <div style="font-size:12.5px;color:var(--dim2);margin:-12px 0 16px">
      Aplica em <b>${h(pack.nome||'')}</b> · nada é salvo antes de você conferir a prévia
    </div>
    <div class="col">
      <div class="spec" style="grid-template-columns:1fr">
        <div style="display:block;line-height:1.7">
          Tabela <b>markdown</b>, <b>CSV</b> ou <b>TSV</b>, com cabeçalho. As colunas são
          reconhecidas pelo nome, em qualquer ordem:<br>
          <code class="mono" style="color:var(--verde2)">Clube</code> (obrigatória) ·
          <code class="mono">Jogador</code> · <code class="mono">Força</code> ·
          <code class="mono">Idade</code> · <code class="mono">Posição</code> ·
          <code class="mono">Valor</code> · <code class="mono">Escudo</code> ·
          <code class="mono">Ataque/Meio/Defesa</code><br>
          Linha <b>sem</b> jogador é lida como dado do clube; <b>com</b> jogador, como dado de elenco.
        </div>
      </div>
      <div class="drop" id="i-drop">
        <div class="ic">⬆</div>
        <div class="t" id="i-tit">Escolher arquivo (.txt, .md, .csv, .tsv)</div>
        <div class="s" id="i-sub">ou cole o conteúdo no campo abaixo</div>
        <input type="file" id="i-file" accept=".txt,.md,.csv,.tsv,text/plain" style="display:none">
      </div>
      <label class="f">Conteúdo
        <textarea class="f mono" id="i-texto" rows="8" style="font-size:12px"
          placeholder="| Clube | Jogador | Força | Idade |&#10;| Palmeiras | Vitor Roque | 92 | 20 |"></textarea>
      </label>
      <div class="erro hide" id="i-erro"></div>
      <div id="i-previa"></div>
      <div class="acoes">
        <button class="btn btn-ghost" id="i-ver">Ver o que muda</button>
        <button class="btn" id="i-aplicar" disabled>Aplicar ao pacote</button>
        <button class="btn btn-ghost" data-fechar>Cancelar</button>
      </div>
    </div>`, 'lg');

  const erro = el('i-erro'), previa = el('i-previa');
  let resultado = null;

  el('i-drop').onclick = () => el('i-file').click();
  el('i-drop').ondragover = ev => { ev.preventDefault(); el('i-drop').classList.add('ok'); };
  el('i-drop').ondragleave = () => el('i-drop').classList.remove('ok');
  el('i-drop').ondrop = ev => { ev.preventDefault(); if(ev.dataTransfer.files[0]) lerArquivo(ev.dataTransfer.files[0]); };
  el('i-file').onchange = () => { if(el('i-file').files[0]) lerArquivo(el('i-file').files[0]); };
  function lerArquivo(f){
    if(f.size > 2*1024*1024) { erro.textContent='Arquivo acima de 2 MB.'; erro.classList.remove('hide'); return; }
    const r = new FileReader();
    r.onload = () => { el('i-texto').value = r.result; el('i-tit').textContent = f.name;
                       el('i-drop').classList.add('ok'); verPrevia(); };
    r.readAsText(f);
  }

  el('i-ver').onclick = verPrevia;
  function verPrevia(){
    erro.classList.add('hide'); previa.innerHTML=''; el('i-aplicar').disabled = true;
    const texto = el('i-texto').value.trim();
    if(!texto){ erro.textContent='Escolha um arquivo ou cole o conteúdo.'; erro.classList.remove('hide'); return; }
    resultado = interpretar(texto);
    if(resultado.erro){ erro.textContent = resultado.erro; erro.classList.remove('hide'); return; }

    const ms = Array.from(resultado.mudancas.values());
    const totalJog = ms.reduce((a,m)=>a+Object.keys(m.squad).length,0);
    const totalNovos = ms.reduce((a,m)=>a+m.novos.length,0);
    if(!ms.length){
      previa.innerHTML = `<div class="ok">Li ${resultado.linhas} linhas e nada mudaria — os valores do arquivo já são os do catálogo.</div>`;
      return;
    }
    previa.innerHTML = `
      <div class="ok" style="margin-bottom:10px">
        ${resultado.linhas} linhas lidas · <b>${ms.length} clubes</b> mudam ·
        <b>${totalJog} jogadores</b> alterados${totalNovos?` · <b>${totalNovos}</b> jogadores novos`:''}
      </div>
      ${resultado.semClube.length?`<div class="erro" style="margin-bottom:10px">
        ${resultado.semClube.length} linhas ignoradas — clube não encontrado:
        ${h(Array.from(new Set(resultado.semClube)).slice(0,8).join(', '))}${resultado.semClube.length>8?'…':''}</div>`:''}
      <div style="max-height:220px;overflow:auto;border:1px solid var(--bd);border-radius:10px">
        ${ms.map(m => `
          <div class="row" style="grid-template-columns:1.2fr 2fr;padding:8px 12px;border-top:1px solid var(--bd3)">
            <b style="font-size:12.5px">${h(m.item.c.short||m.item.c.name)}</b>
            <span style="font-size:12px;color:var(--dim);line-height:1.6">
              ${Object.keys(m.clube).map(k=>`${h(k)} → <b>${h(String(m.clube[k]))}</b>`).join(' · ')}
              ${Object.keys(m.clube).length && (Object.keys(m.squad).length||m.novos.length) ? '<br>' : ''}
              ${Object.keys(m.squad).slice(0,6).map(n=>{
                 const d=m.squad[n];
                 return `${h(n)}: ${Object.keys(d).map(k=>k+' → '+d[k]).join(', ')}`;
               }).join('<br>')}
              ${Object.keys(m.squad).length>6?`<br><i>+${Object.keys(m.squad).length-6} jogadores</i>`:''}
              ${m.novos.length?`<br><span style="color:var(--roxo)">novos: ${h(m.novos.map(p=>p.n).slice(0,5).join(', '))}${m.novos.length>5?'…':''}</span>`:''}
            </span>
          </div>`).join('')}
      </div>`;
    el('i-aplicar').disabled = false;
  }

  el('i-aplicar').onclick = async () => {
    if(!resultado || !resultado.mudancas) return;
    const btn = el('i-aplicar'); btn.disabled = true; btn.textContent = 'Aplicando…';
    const linhas = [];
    for(const [id, m] of resultado.mudancas){
      const jaTem = D.edits[id];
      // funde com o que o pacote já tinha para aquele clube — importar duas vezes
      // não pode apagar a edição feita à mão antes
      const patch = Object.assign({}, (jaTem && jaTem.patch) || {});
      Object.assign(patch, m.clube);
      if(Object.keys(m.squad).length)
        patch.squad = Object.assign({}, patch.squad||{}, m.squad);
      if(m.novos.length){
        const nomes = new Set((patch.squad_novos||[]).map(p=>p.n));
        patch.squad_novos = (patch.squad_novos||[]).concat(m.novos.filter(p=>!nomes.has(p.n)));
      }
      linhas.push({ pack_id: ST.packId, club_id: id, divisao: m.item.div,
                    novo: !!(jaTem && jaTem.novo), patch });
    }
    const { error } = await jogo('pack_edits').upsert(linhas, { onConflict:'pack_id,club_id' });
    if(error){ btn.disabled=false; btn.textContent='Aplicar ao pacote'; return toast(erroMsg(error), true); }
    await jogo('data_packs').update({ atualizado_em:new Date().toISOString() }).eq('id', ST.packId);
    registrar('pacote.importar', ST.packId, { clubes: linhas.length, linhas: resultado.linhas });
    fecharModal(); toast(`${linhas.length} clubes atualizados no pacote.`); pgEditor();
  };
}

/* ============================================================================
   PAÍSES E COMPETIÇÕES DISPONÍVEIS
   ----------------------------------------------------------------------------
   Vem de src/data/universos.js — o MESMO arquivo que o core.js do jogo lê. Foi
   extraído do core.js justamente para o painel não manter uma segunda lista:
   duas versões da mesma regra é o que world-rules.js descreve como a origem dos
   bugs de calendário.
   ============================================================================ */
function universos(){ return window.UNIVERSOS || {}; }
function paisesDisponiveis(){
  return Object.keys(universos()).map(k => ({
    chave: k,
    nome: k==='brasil' ? 'Brasil' : (universos()[k].country || k),
    bandeira: (window.UNIVERSO_BANDEIRA||{})[k] || null,
    divisoes: (universos()[k].order||[]).map(d => ({ codigo:d, nome:(universos()[k].label||{})[d]||d }))
  })).sort((a,b)=> a.chave==='brasil' ? -1 : b.chave==='brasil' ? 1 : a.nome.localeCompare(b.nome,'pt-BR'));
}
function bandeiraImg(iso, px){
  if(!iso) return '';
  return `<img src="https://flagcdn.com/${h(iso)}.svg" alt="" style="width:${px||16}px;height:auto;border-radius:2px;vertical-align:middle">`;
}
/* seletor de cor com amostra grande — dois cliques e a pessoa vê o resultado,
   em vez de decorar hexadecimal */
function campoCor(id, rotulo, valor){
  return `<label class="f">${h(rotulo)}
    <span style="display:flex;align-items:center;gap:8px">
      <input type="color" id="${id}" value="${h(valor||'#1b7a3d')}"
             style="width:46px;height:34px;padding:2px;border:1px solid var(--bd2);border-radius:8px;background:var(--bg);cursor:pointer">
      <input class="f mono" id="${id}-hex" value="${h(valor||'#1b7a3d')}" style="flex:1;font-size:12px" maxlength="7">
    </span></label>`;
}
/* mantém o seletor visual e o campo hexadecimal em sincronia, e redesenha a
   amostra da camisa a cada mudança */
function ligarCores(idA, idB, idPreview){
  const par = (id) => {
    const cor = el(id), hex = el(id+'-hex');
    if(!cor || !hex) return;
    cor.oninput = () => { hex.value = cor.value; desenhar(); };
    hex.oninput = () => { if(/^#[0-9a-f]{6}$/i.test(hex.value)){ cor.value = hex.value; desenhar(); } };
  };
  function desenhar(){
    const alvo = el(idPreview); if(!alvo) return;
    const a = (el(idA)||{}).value || '#1b7a3d';
    const b = (el(idB)||{}).value || '#ffffff';
    alvo.innerHTML = `<span style="display:inline-flex;align-items:center;gap:10px">
      <span style="width:34px;height:40px;border-radius:4px 4px 8px 8px;border:1px solid #0006;
        background:linear-gradient(90deg,${h(a)} 0 34%, ${h(b)} 34% 66%, ${h(a)} 66%)"></span>
      <span style="width:34px;height:34px;border-radius:99px;border:2px solid ${h(b)};background:${h(a)}"></span>
      <small style="font-size:11.5px;color:var(--dim2)">camisa e escudo de reserva</small></span>`;
  }
  par(idA); par(idB); desenhar();
}

/* ============================================================================
   ABA COMPETIÇÕES
   ----------------------------------------------------------------------------
   As competições do jogo hoje são fixas no motor (COMP_DEFS em engine/core.js) e
   o calendário é uma tabela escrita à mão em engine/world-rules.js — que é
   injetada byte a byte dentro da edge function resolve-round, com trava no CI.
   Ou seja: o motor ainda não sabe jogar competição definida aqui.

   O que esta aba faz HOJE é definir a competição e o calendário dela dentro do
   patch, com a regra que world-rules.js chama de causa raiz dos bugs de
   calendário: DUAS competições não podem cair no mesmo dia. A validação já roda
   aqui, na definição — é mais barato impedir o conflito do que descobri-lo com a
   temporada rodando.
   ============================================================================ */
const COMPETICOES_CHAVE = '__competicoes__';   // guardada como uma linha especial do patch

function competicoesDoPatch(){
  const linha = (D.edits||{})[COMPETICOES_CHAVE];
  return (linha && linha.patch && Array.isArray(linha.patch.lista)) ? linha.patch.lista : [];
}
/* modelo do Brasileirão: 4 divisões, ida e volta, acesso e rebaixamento */
function modeloBrasileirao(){
  const uni = (window.UNIVERSOS||{}).brasil || {order:['A','B','C','D'],size:{},label:{}};
  return uni.order.map((d,i) => ({
    id: 'liga'+d, nome: (uni.label||{})[d] || ('Série '+d), tipo:'liga', pais:'brasil', divisao:d,
    clubes: (uni.size||{})[d] || 20, idaEVolta:true, playoff:false,
    sobe: (uni.promo||{})[d] || 0, desce: (uni.releg||{})[d] || 0,
    continental: i===0 ? { libertadores:6, sulamericana:6 } : null,
    datas: []
  }));
}
function modeloCopa(nome){
  return { id:'copa'+Date.now().toString(36), nome, tipo:'mata-mata', pais:'brasil', divisao:null,
           clubes:32, idaEVolta:true, playoff:true, sobe:0, desce:0,
           continental:null, datas:[] };
}

function abaCompeticoes(pack, editar){
  const doJogo = competicoesDoJogo();          // o que o motor joga HOJE
  const doPatch = competicoesDoPatch();        // o que este patch redefine
  const comps = doPatch.length ? doPatch : doJogo;
  const conflitos = conflitosDeCalendario(comps);
  const total = comps.reduce((a,c)=>a+(c.datas||[]).length, 0);
  const todas = comps.flatMap(c=>c.datas||[]).sort();

  el('ed-aba').innerHTML = `
    <div class="g4" style="margin-bottom:16px">
      ${kpiHTML({l:'Competições', v:num(comps.length), d: doPatch.length? 'definidas neste patch' : 'do calendário oficial'})}
      ${kpiHTML({l:'Dias com jogo', v:num(new Set(todas).size), d:`${num(total)} rodadas no ano`})}
      ${kpiHTML({l:'Conflitos de data', v:num(conflitos.length),
                 d: conflitos.length? 'duas competições no mesmo dia' : 'nenhum dia repetido',
                 c: conflitos.length? 'var(--vermelho)' : 'var(--verde2)'})}
      ${kpiHTML({l:'Temporada', v: todas.length? dmy(todas[0]).slice(0,5)+' → '+dmy(todas[todas.length-1]).slice(0,5) : '—',
                 d:'primeira e última rodada'})}
    </div>

    ${doPatch.length ? '' : `<div class="card card-p" style="border-color:#1c455c;background:#0f1a20;margin-bottom:16px">
      <div class="tt" style="margin-bottom:6px;color:var(--azul)">Você está vendo o calendário oficial do jogo</div>
      <div class="st" style="line-height:1.7">
        Estas são as competições e as datas que o motor usa hoje (engine/world-rules.js).
        Ao mudar qualquer coisa aqui, a versão editada passa a viver <b>neste patch</b> e o
        calendário oficial fica intacto.
      </div></div>`}

    <div class="card card-p" style="border-color:#5a4a18;background:#1c1710;margin-bottom:16px">
      <div class="tt" style="margin-bottom:6px;color:var(--ambar)">Até onde a edição chega hoje</div>
      <div class="st" style="line-height:1.7">
        Datas e formato ficam guardados e validados no patch. O motor ainda lê o calendário do
        próprio arquivo — passar a ler o do patch mexe no motor e na edge function que resolve as
        rodadas (as duas compartilham o arquivo byte a byte), e é a etapa seguinte.
      </div>
    </div>

    <div class="card" style="overflow:hidden;margin-bottom:16px">
      <div class="card-h">
        <b>Competições</b>
        ${editar?`<button class="btn btn-sm btn-ghost" id="cp-importar-oficial">Partir do calendário oficial</button>`:''}
        ${editar?`<button class="btn btn-sm btn-ghost" id="cp-brasileirao">Modelo do Brasileirão</button>`:''}
        ${editar?`<button class="btn btn-sm" id="cp-nova">+ Competição</button>`:''}
      </div>
      ${conflitos.length?`<div class="erro" style="margin:12px 20px">
        ${conflitos.length} conflito(s): ${h(conflitos.slice(0,4).map(c=>`${dmy(c.data)} (${c.quais.join(' × ')})`).join('; '))}
      </div>`:''}
      <div class="rowh" style="grid-template-columns:1.4fr .9fr .7fr 1.1fr .8fr 1.2fr ${editar?'26px':''}">
        <span>Competição</span><span>Formato</span><span style="text-align:center">Clubes</span>
        <span>Turno</span><span style="text-align:center">Rodadas</span>
        <span>Período</span>${editar?'<span></span>':''}
      </div>
      ${comps.map((c,i)=>{
        const ds = (c.datas||[]).slice().sort();
        return `<div class="row" style="grid-template-columns:1.4fr .9fr .7fr 1.1fr .8fr 1.2fr ${editar?'26px':''};cursor:pointer" data-comp="${i}">
          <span style="min-width:0;display:flex;align-items:center;gap:8px">
            <i style="width:9px;height:9px;border-radius:99px;background:${corComp(c.id)};flex:none"></i>
            <span style="min-width:0"><b style="display:block;font-size:13px">${h(c.nome)}</b>
              <small class="mono" style="font-size:11px;color:var(--dim3)">${h(c.id)}</small></span></span>
          <span class="tag ${c.tipo==='liga'?'t-azul':'t-roxo'}">${c.tipo==='liga'?'Liga':'Mata-mata'}</span>
          <span class="mono" style="font-size:12.5px;text-align:center">${c.clubes||'—'}</span>
          <span style="font-size:12px;color:var(--dim)">${c.idaEVolta?'Ida e volta':'Só ida'}${c.playoff?' + playoff':''}</span>
          <span class="mono" style="font-size:12.5px;text-align:center;color:${ds.length?'var(--verde2)':'var(--dim3)'}">${ds.length}</span>
          <span class="mono" style="font-size:11.5px;color:var(--dim)">${ds.length? dmy(ds[0])+' → '+dmy(ds[ds.length-1]) : 'sem datas'}</span>
          ${editar?`<span class="link" data-rm-comp="${i}" style="color:var(--dim3);text-align:center">✕</span>`:''}
        </div>`;
      }).join('') || '<div class="vazio">Nenhuma competição.</div>'}
    </div>

    ${calendarioHTML(comps)}`;

  if(!editar) return;
  const cpImp = el('cp-importar-oficial');
  if(cpImp) cpImp.onclick = async () => {
    if(doPatch.length && !confirm('Isto substitui as competições deste patch pelo calendário oficial do jogo. Continuar?')) return;
    await gravarCompeticoes(competicoesDoJogo());
  };
  el('cp-brasileirao').onclick = async () => {
    if(doPatch.length && !confirm('Isto substitui as competições deste patch pelas 4 divisões do Brasileirão. Continuar?')) return;
    await gravarCompeticoes(modeloBrasileirao());
  };
  el('cp-nova').onclick = () => modalCompeticao(null);
  document.querySelectorAll('[data-comp]').forEach(r => r.onclick = ev => {
    if(ev.target.closest('[data-rm-comp]')) return;
    // editar o calendário oficial passa a valer no patch, sem tocar no arquivo do jogo
    if(!doPatch.length){ gravarCompeticoes(doJogo).then(()=> setTimeout(()=>modalCompeticao(+r.dataset.comp), 300)); return; }
    modalCompeticao(+r.dataset.comp);
  });
  document.querySelectorAll('[data-rm-comp]').forEach(x => x.onclick = async () => {
    if(!confirm('Remover esta competição do patch?')) return;
    const base = doPatch.length ? doPatch : doJogo;
    const nova = base.slice(); nova.splice(+x.dataset.rmComp,1);
    await gravarCompeticoes(nova);
  });
}

/* AS COMPETIÇÕES QUE O MOTOR JOGA HOJE, lidas do próprio jogo:
   src/data/competicoes.js (identidade) + engine/world-rules.js (as datas).
   É o mesmo arquivo que a edge function usa para resolver as rodadas, então o
   que aparece aqui é o calendário de verdade, não uma cópia. */
function competicoesDoJogo(){
  const defs = window.COMPETICOES || {};
  const cal = (window.WORLD_RULES && window.WORLD_RULES.calendar) ? window.WORLD_RULES.calendar() : {};
  const ano = (window.WORLD_RULES && window.WORLD_RULES.seasonStart) ? window.WORLD_RULES.seasonStart()[0] : 2026;
  const iso = mmdd => `${ano}-${mmdd}`;
  const out = [];
  // a lista da liga vale para a divisão em que o jogador está — o motor usa uma tabela só
  if(Array.isArray(cal.league)) out.push({
    id:'serieA', nome:(defs.serieA&&defs.serieA.name)||'Liga nacional', tipo:'liga', pais:'brasil',
    divisao:'A', clubes:20, idaEVolta:true, playoff:false, sobe:0, desce:4,
    continental:{libertadores:6, sulamericana:6}, datas: cal.league.map(iso),
    nota:'mesma tabela de datas para as quatro divisões' });
  [['copaBrasil',32],['libertadores',32],['sulamericana',32]].forEach(([k,n])=>{
    if(!Array.isArray(cal[k])) return;
    out.push({ id:k, nome:(defs[k]&&defs[k].name)||k, tipo:'mata-mata', pais:'brasil', divisao:null,
      clubes:n, idaEVolta:true, playoff:true, sobe:0, desce:0, continental:null,
      datas: cal[k].map(iso),
      sorteio: cal.draws && cal.draws[k] ? iso(cal.draws[k]) : null });
  });
  return out;
}
const CORES_COMP = { serieA:'#4ade80', copaBrasil:'#e3b23c', libertadores:'#7dd3fc', sulamericana:'#c084fc' };
function corComp(id){
  if(CORES_COMP[id]) return CORES_COMP[id];
  let x=0; for(const ch of String(id)) x=(x*31+ch.charCodeAt(0))|0;
  return CORES_AV[Math.abs(x)%CORES_AV.length];
}

/* ===== COMO OS JOGOS SE DISTRIBUEM NO ANO =====
   A pergunta que o calendário precisa responder não é "que datas tem a Série A",
   é "o que acontece em cada dia do ano" — é aí que se vê competição empilhada,
   mês vazio e sequência apertada. Daí a grade por mês, com um ponto colorido por
   competição e o dia em vermelho quando duas caem juntas. */
function calendarioHTML(comps){
  const porDia = {};
  (comps||[]).forEach(c => (c.datas||[]).forEach((d,i) => {
    (porDia[d] = porDia[d] || []).push({ nome:c.nome, id:c.id, rodada:i+1 });
  }));
  const datas = Object.keys(porDia).sort();
  if(!datas.length) return `<div class="card"><div class="vazio">Sem datas para desenhar o calendário.</div></div>`;
  const ano = +datas[0].slice(0,4);
  const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const DS = ['D','S','T','Q','Q','S','S'];

  const meses = [];
  for(let m=0;m<12;m++){
    const primeiro = new Date(ano, m, 1);
    const dias = new Date(ano, m+1, 0).getDate();
    const vazios = primeiro.getDay();
    const temJogo = Object.keys(porDia).some(d => +d.slice(5,7) === m+1 && +d.slice(0,4) === ano);
    if(!temJogo) continue;
    let celulas = '';
    for(let i=0;i<vazios;i++) celulas += '<span></span>';
    for(let d=1;d<=dias;d++){
      const iso = `${ano}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const jogos = porDia[iso] || [];
      const conflito = jogos.length > 1;
      const titulo = jogos.length ? jogos.map(j=>`${j.nome} · ${j.rodada}ª rodada`).join(' | ') : '';
      celulas += `<span class="cal-dia ${jogos.length?'tem':''} ${conflito?'conflito':''}" title="${h(titulo)}">
        <b>${d}</b>
        ${jogos.length?`<i>${jogos.slice(0,3).map(j=>`<em style="background:${corComp(j.id)}"></em>`).join('')}</i>`:''}
      </span>`;
    }
    meses.push(`<div class="cal-mes">
      <div class="cal-mes-t">${MES[m]}</div>
      <div class="cal-grade">${DS.map(x=>`<span class="cal-ds">${x}</span>`).join('')}${celulas}</div>
    </div>`);
  }
  return `<div class="card card-p">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <div class="tt">Distribuição dos jogos no ano</div>
        <div class="st">Cada ponto é uma rodada. Dia em vermelho tem duas competições — o que o jogo não permite.</div>
      </div>
      <div class="leg">${(comps||[]).map(c=>`<span><i style="background:${corComp(c.id)};border-radius:99px"></i>${h(c.nome)}</span>`).join('')}</div>
    </div>
    <div class="cal-ano">${meses.join('')}</div>
  </div>`;
}

/* DUAS COMPETIÇÕES NO MESMO DIA é o bug que world-rules.js descreve como o pior do
   calendário (o jogador via dois jogos no mesmo dia e o avanço de copa duplicava).
   Aqui isso é impedido na definição, que é onde sai barato. */
function conflitosDeCalendario(comps){
  const porData = {};
  (comps||[]).forEach(c => (c.datas||[]).forEach(d => {
    (porData[d] = porData[d] || []).push(c.nome);
  }));
  return Object.keys(porData).filter(d => porData[d].length > 1)
    .sort().map(d => ({ data:d, quais:porData[d] }));
}
/* datas já ocupadas por OUTRAS competições do patch */
function datasOcupadas(comps, exceto){
  const s = new Set();
  (comps||[]).forEach((c,i) => { if(i!==exceto) (c.datas||[]).forEach(d=>s.add(d)); });
  return s;
}

async function gravarCompeticoes(lista){
  const linha = { pack_id: ST.packId, club_id: COMPETICOES_CHAVE, divisao: null, novo: true,
                  patch: { lista } };
  const { error } = await jogo('pack_edits').upsert(linha, { onConflict:'pack_id,club_id' });
  if(error) return toast(erroMsg(error), true);
  registrar('competicoes.gravar', ST.packId, { total: lista.length });
  toast('Competições salvas no patch.'); pgEditor();
}

function modalCompeticao(indice){
  const comps = competicoesDoPatch();
  const c = indice==null
    ? { id:'comp'+Date.now().toString(36), nome:'', tipo:'liga', pais:'brasil', divisao:null,
        clubes:20, idaEVolta:true, playoff:false, sobe:0, desce:0, continental:null, datas:[] }
    : JSON.parse(JSON.stringify(comps[indice]));
  const paises = paisesDisponiveis();
  const ocupadas = datasOcupadas(comps, indice);

  abrirModal(`
    <h3>${indice==null?'Nova competição':h(c.nome)}</h3>
    <div class="col">
      <div class="g2" style="gap:12px">
        <label class="f">Nome<input class="f" id="k-nome" value="${h(c.nome)}" placeholder="Ex.: Brasileirão Série A"></label>
        <label class="f">País
          <select class="f" id="k-pais">
            ${paises.map(p=>`<option value="${h(p.chave)}" ${p.chave===c.pais?'selected':''}>${h(p.nome)}</option>`).join('')}
          </select></label>
      </div>

      <div class="tt" style="margin-top:4px">Formato</div>
      <div class="g2" style="gap:12px">
        <label class="f">Tipo
          <select class="f" id="k-tipo">
            <option value="liga" ${c.tipo==='liga'?'selected':''}>Liga (todos contra todos, por pontos)</option>
            <option value="mata-mata" ${c.tipo==='mata-mata'?'selected':''}>Copa (mata-mata)</option>
          </select></label>
        <label class="f">Nº de clubes<input class="f mono" id="k-clubes" type="number" min="2" max="64" value="${c.clubes}"></label>
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--fg2)">
        <input type="checkbox" id="k-ida" ${c.idaEVolta?'checked':''} style="accent-color:#35c46a">
        Ida e volta <small style="color:var(--dim2)">(na liga, turno e returno; na copa, dois jogos por confronto)</small></label>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--fg2)">
        <input type="checkbox" id="k-playoff" ${c.playoff?'checked':''} style="accent-color:#35c46a">
        Tem fase final / playoff <small style="color:var(--dim2)">(na liga, mata-mata entre os melhores no fim)</small></label>

      <div id="k-liga" class="${c.tipo==='liga'?'':'hide'}">
        <div class="tt" style="margin:8px 0 6px">Acesso e rebaixamento</div>
        <div class="g2" style="gap:12px">
          <label class="f">Sobem<input class="f mono" id="k-sobe" type="number" min="0" max="10" value="${c.sobe||0}"></label>
          <label class="f">Descem<input class="f mono" id="k-desce" type="number" min="0" max="10" value="${c.desce||0}"></label>
        </div>
        <div class="tt" style="margin:12px 0 6px">Classificação para competições continentais</div>
        <div class="st" style="margin-bottom:8px">Quantos primeiros colocados vão para cada uma. Zero = não classifica.</div>
        <div class="g2" style="gap:12px">
          <label class="f">Libertadores<input class="f mono" id="k-lib" type="number" min="0" max="12"
            value="${(c.continental&&c.continental.libertadores)||0}"></label>
          <label class="f">Sul-Americana<input class="f mono" id="k-sul" type="number" min="0" max="12"
            value="${(c.continental&&c.continental.sulamericana)||0}"></label>
        </div>
      </div>

      <div class="tt" style="margin-top:10px">Calendário</div>
      <div class="st" style="line-height:1.6">
        Uma data por rodada, na ordem. <b>Duas competições não podem cair no mesmo dia</b> —
        as datas já usadas por outras competições deste patch são recusadas aqui.
      </div>
      <div style="display:flex;gap:8px;align-items:flex-end">
        <label class="f" style="flex:1">Nova data<input class="f" id="k-data" type="date"></label>
        <button class="btn btn-sm btn-ghost" id="k-add-data" style="margin-bottom:2px">Adicionar</button>
        <button class="btn btn-sm btn-ghost" id="k-auto" style="margin-bottom:2px">Preencher automático</button>
      </div>
      <div class="erro hide" id="k-erro"></div>
      <div id="k-datas" style="display:flex;flex-wrap:wrap;gap:6px"></div>

      <div class="acoes">
        <button class="btn" id="k-ok">Salvar competição</button>
        <button class="btn btn-ghost" data-fechar>Cancelar</button>
      </div>
    </div>`, 'lg');

  const erro = el('k-erro');
  el('k-tipo').onchange = () => el('k-liga').classList.toggle('hide', el('k-tipo').value!=='liga');

  function desenharDatas(){
    el('k-datas').innerHTML = (c.datas||[]).length
      ? c.datas.map((d,i)=>`<span class="tag t-dim" style="display:inline-flex;align-items:center;gap:6px">
          <b class="mono" style="font-weight:500">${i+1}ª · ${h(dmy(d))}</b>
          <span class="link" data-rm-data="${i}" style="color:var(--dim3)">✕</span></span>`).join('')
      : '<span class="st">Nenhuma data ainda.</span>';
    el('k-datas').querySelectorAll('[data-rm-data]').forEach(x => x.onclick = () => {
      c.datas.splice(+x.dataset.rmData,1); desenharDatas();
    });
  }
  desenharDatas();

  function tentarAdicionar(d){
    erro.classList.add('hide');
    if(!d) return false;
    if(ocupadas.has(d)){ erro.textContent = `${dmy(d)} já é dia de outra competição deste patch.`; erro.classList.remove('hide'); return false; }
    if((c.datas||[]).includes(d)){ erro.textContent = `${dmy(d)} já está nesta competição.`; erro.classList.remove('hide'); return false; }
    c.datas = (c.datas||[]).concat([d]).sort();
    return true;
  }
  el('k-add-data').onclick = () => { if(tentarAdicionar(el('k-data').value)) { el('k-data').value=''; desenharDatas(); } };

  /* preenchimento automático: uma rodada por semana a partir da primeira data livre,
     pulando qualquer dia já usado por outra competição — é a regra do calendário
     aplicada na hora de gerar, não depois */
  el('k-auto').onclick = () => {
    erro.classList.add('hide');
    const tipo = el('k-tipo').value, n = +el('k-clubes').value||20;
    const rodadas = tipo==='liga'
      ? (n-1) * (el('k-ida').checked?2:1)
      : Math.ceil(Math.log2(Math.max(2,n))) * (el('k-ida').checked?2:1);
    const inicio = el('k-data').value ? new Date(el('k-data').value+'T12:00:00') : new Date('2026-03-01T12:00:00');
    c.datas = [];
    /* Uma rodada por semana. Quando o dia da semana já é de outra competição, procura
       OUTRO DIA DA MESMA SEMANA antes de pular para a seguinte — é assim que as quatro
       divisões correm em paralelo (A no domingo, B no sábado…). Pulando a semana inteira,
       a Série B só começava depois de a Série A acabar: 38 semanas depois. */
    const livre = iso => !ocupadas.has(iso) && !c.datas.includes(iso);
    const iso = dt => dt.toISOString().slice(0,10);
    let semana = 0, seguranca = 0;
    while(c.datas.length < rodadas && seguranca++ < 400){
      const base = new Date(inicio); base.setDate(base.getDate() + semana*7);
      let posta = false;
      for(const desloc of [0,-1,1,-2,2,-3,3]){        // mesmo dia, depois os vizinhos da semana
        const dia = new Date(base); dia.setDate(dia.getDate() + desloc);
        if(livre(iso(dia))){ c.datas.push(iso(dia)); posta = true; break; }
      }
      semana++;
      if(!posta && semana > rodadas + 60) break;      // semana lotada em todos os dias
    }
    c.datas.sort();
    desenharDatas();
    toast(`${c.datas.length} rodadas no calendário.`);
  };

  el('k-ok').onclick = async () => {
    const nome = el('k-nome').value.trim();
    if(!nome) return toast('Dê um nome à competição.', true);
    const tipo = el('k-tipo').value;
    const nova = Object.assign({}, c, {
      nome, tipo, pais: el('k-pais').value,
      clubes: +el('k-clubes').value||20,
      idaEVolta: el('k-ida').checked, playoff: el('k-playoff').checked,
      sobe: tipo==='liga' ? (+el('k-sobe').value||0) : 0,
      desce: tipo==='liga' ? (+el('k-desce').value||0) : 0,
      continental: tipo==='liga' && ((+el('k-lib').value||0) || (+el('k-sul').value||0))
        ? { libertadores:+el('k-lib').value||0, sulamericana:+el('k-sul').value||0 } : null
    });
    const lista = comps.slice();
    if(indice==null) lista.push(nova); else lista[indice] = nova;
    const conf = conflitosDeCalendario(lista);
    if(conf.length) return toast(`Conflito de data em ${conf[0].data} — duas competições no mesmo dia.`, true);
    fecharModal();
    await gravarCompeticoes(lista);
  };
}
