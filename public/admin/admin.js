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
const SEL = { salas:new Set(), saves:new Set(), contas:new Set(), convites:new Set() }; // seleções em massa
const JOGO_URL = 'https://retrofoot98.com.br';   // destino dos links que o painel gera
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
  socio:      ['visao','usuarios','jogos','analytics','financas','publicidade','parceiros','conteudo','features','editor','estudio','equipa'],
  financeiro: ['visao','financas','publicidade','parceiros'],
  produto:    ['visao','usuarios','jogos','analytics','parceiros','conteudo','features','editor','estudio'],
  leitura:    ['visao','usuarios','jogos','analytics','financas','publicidade','parceiros','conteudo','features','editor','estudio']
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
  { id:'parceiros',   ic:'★', label:'Parceiros',      tit:'Parceiros influenciadores', sub:'Canais, link de indicação e o que ele trouxe' },
  { id:'conteudo',    ic:'▦', label:'Conteúdo',       tit:'Calendário de conteúdo', sub:'Da ideia ao agendado, por canal' },
  { id:'editor',      ic:'✎', label:'Editor de dados',tit:'Editor de dados do jogo', sub:'Clubes, elencos, escudos e força' },
  { id:'estudio',     ic:'❖', label:'Estúdio IA',     tit:'Estúdio de imagens',  sub:'Escudos fictícios e fotos de jogadores por IA' },
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
               parceiros:pgParceiros, conteudo:pgConteudo,
               editor:pgEditor, estudio:pgEstudio, equipa:pgEquipa }[tab];
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
/* SOLO E RESENHA LADO A LADO. Somar os dois num número só escondia o que a página
   precisa responder — se a pessoa joga sozinha ou com amigos são comportamentos
   diferentes, e o total não distingue. Zero fica apagado para a coluna não virar
   um paredão de zeros. */
function duplaHTML(a, b, rotuloA, rotuloB, troféu){
  const na = Number(a)||0, nb = Number(b)||0;
  const cor = n => n ? 'var(--fg)' : 'var(--dim3)';
  return `<span class="mono" style="font-size:12px;text-align:center;line-height:1.35"
      title="${na} ${rotuloA}${na===1?'':'s'} · ${nb} ${rotuloB}${nb===1?'':'s'}">
    <b style="font-weight:600;color:${troféu&&na?'var(--ambar)':cor(na)}">${na}</b>
    <small style="color:var(--dim3)"> / </small>
    <b style="font-weight:600;color:${troféu&&nb?'var(--ambar)':cor(nb)}">${nb}</b>
    <small style="display:block;font-size:9.5px;color:var(--dim3);letter-spacing:.3px">solo/res</small>
  </span>`;
}
async function pgUsuarios(){
  const { data, error } = await sb.rpc('usuarios', { p_busca: ST.busca || null, p_limite: 500 });
  if(error) throw error;
  D.usuarios = data || [];
  const us = D.usuarios;
  const pagos = us.filter(u=>u.plano==='pago');
  const mrr = pagos.reduce((a,u)=>a+ +u.mrr, 0);
  const minutos = us.reduce((a,u)=>a+ +u.minutos, 0);
  const podeApagar = ME.papel==='socio';
  SEL.contas = SEL.contas || new Set();
  const vivos = new Set(us.map(u=>u.id));
  Array.from(SEL.contas).forEach(x => { if(!vivos.has(x)) SEL.contas.delete(x); });

  // Jogos / Pontos / Títulos vêm por MODO — é a leitura que a página precisa dar
  const col = `${podeApagar?'30px ':''}1.5fr .55fr .9fr .85fr .8fr .7fr .8fr .75fr .7fr 84px`;

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
        ${podeApagar?`<span class="st" style="margin:0">selecionar:
          <span class="link" data-sel-contas="nunca">nunca jogaram</span> ·
          <span class="link" data-sel-contas="90">sumidos 90d+</span> ·
          <span class="link" data-sel-contas="nenhuma">limpar</span></span>`:''}
        <input class="busca" id="u-busca" placeholder="Procurar técnico, clube ou e-mail…" value="${h(ST.busca)}">
        <span class="mono" style="font-size:12px;color:var(--dim2)">${num(us.length)} contas</span>
      </div>
      <div class="rowh" style="grid-template-columns:${col}">
        ${podeApagar?'<span><input type="checkbox" id="sel-todas-contas" title="Selecionar todas"></span>':''}
        <span>Técnico</span><span>Plano</span><span>Referral</span>
        <span style="text-align:center">Jogos</span><span style="text-align:center">Pontos</span>
        <span style="text-align:center">Títulos</span>
        <span style="text-align:right">Tempo</span><span style="text-align:right">Últ. acesso</span>
        <span style="text-align:center">Estado</span><span style="text-align:right">Senha</span>
      </div>
      ${us.length ? us.map(u => {
        const e = estadoAcesso(u.ultimo_acesso);
        return `<div class="row" style="grid-template-columns:${col}">
          ${podeApagar?`<span><input type="checkbox" data-conta="${h(u.id)}" ${SEL.contas.has(u.id)?'checked':''}></span>`:''}
          <span style="display:flex;align-items:center;gap:10px;min-width:0">
            <i class="av" style="width:26px;height:26px;background:${corAv(u.nome)};color:#0c1210;font-size:11px">${h(iniciais(u.nome))}</i>
            <span style="min-width:0"><b style="display:block;font-size:13px;font-weight:600">${h(u.nome)}</b>
            <small style="font-size:11.5px;color:var(--dim2)">${h(clube(u.clube))} · ${h(u.email)}</small></span>
          </span>
          <span class="tag ${u.plano==='pago'?'t-ok':'t-dim'}" style="justify-self:start">${u.plano==='pago'?'pago':'grátis'}</span>
          <span style="min-width:0;font-size:12px;overflow:hidden;text-overflow:ellipsis">${u.referral
            ? `<b style="font-weight:600;color:var(--fg2)">${h(u.parceiro||u.referral)}</b>
               <small class="mono" style="display:block;font-size:10.5px;color:var(--verde2)">${h(u.referral)}</small>`
            : '<span style="color:var(--dim3)">orgânico</span>'}</span>
          ${duplaHTML(u.saves_solo, u.salas_resenha, 'save solo', 'sala de Resenha')}
          ${duplaHTML(u.pontos_solo, u.pontos_resenha, 'ponto no Solo', 'ponto na Resenha')}
          ${duplaHTML(u.titulos_solo, u.titulos_resenha, 'título no Solo', 'título na Resenha', true)}
          <span class="mono" style="font-size:12.5px;text-align:right">${hm(u.minutos)}</span>
          <span class="mono" style="font-size:12.5px;text-align:right;color:var(--dim2)">${h(ha(u.ultimo_acesso))}</span>
          <span style="justify-self:center;display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dim)">
            <i style="width:7px;height:7px;border-radius:99px;background:${e.c};display:block"></i>${e.t}</span>
          <span style="text-align:right">
            <span class="link" data-reset="${h(u.email)}" data-nome="${h(u.nome)}"
                  style="font-size:11.5px" title="Enviar link de nova senha para ${h(u.email)}">Reenviar</span></span>
        </div>`;
      }).join('') : '<div class="vazio">Nenhuma conta encontrada.</div>'}
    </div>`;

  const b = el('u-busca');
  let t=null;
  b.oninput = () => { clearTimeout(t); t = setTimeout(()=>{ ST.busca = b.value.trim(); pgUsuarios(); }, 350); };

  document.querySelectorAll('[data-reset]').forEach(a =>
    a.onclick = () => modalResetSenha(a.dataset.reset, a.dataset.nome));

  if(podeApagar){
    document.querySelectorAll('[data-conta]').forEach(c => c.onchange = () => {
      if(c.checked) SEL.contas.add(c.dataset.conta); else SEL.contas.delete(c.dataset.conta);
      barraSelecao();
    });
    const todas = el('sel-todas-contas');
    if(todas) todas.onchange = () => {
      us.forEach(u => { if(todas.checked) SEL.contas.add(u.id); else SEL.contas.delete(u.id); });
      marcarCaixas(); barraSelecao();
    };
    document.querySelectorAll('[data-sel-contas]').forEach(a => a.onclick = () => {
      const q = a.dataset.selContas;
      if(q==='nenhuma') SEL.contas.clear();
      // "nunca jogaram" = sem clube, sem pontos e sem tempo: conta criada e abandonada
      else if(q==='nunca') us.filter(u => !u.clube && !u.pontos && !u.minutos).forEach(u=>SEL.contas.add(u.id));
      else us.filter(u => dias(u.ultimo_acesso) >= Number(q)).forEach(u=>SEL.contas.add(u.id));
      marcarCaixas(); barraSelecao();
    });
  }
  barraSelecao();
}

/* REENVIAR SENHA — usa a MESMA edge function que o "Esqueci a senha" do jogo
   (send-password-reset, com o template da marca via Resend). O painel não gera nem vê
   senha nenhuma: quem cria o link é o servidor, e ele vai direto para o e-mail da pessoa.
   O redirect é o SITE DO JOGO, não o painel — é lá que o jogador precisa entrar. */
function modalResetSenha(email, nome){
  abrirModal(`
    <h3>Enviar link de nova senha</h3>
    <div class="col">
      <div class="st" style="line-height:1.7">
        Vai um e-mail para <b class="mono">${h(email)}</b>${nome?` (${h(nome)})`:''} com um link para
        definir uma senha nova no jogo. O link vale por tempo limitado e é de uso único.
        <br>Você não vê nem define a senha — quem faz isso é a própria pessoa.
      </div>
      <div class="erro hide" id="rs-erro"></div>
      <div class="acoes">
        <button class="btn" id="rs-ok">Enviar e-mail</button>
        <button class="btn btn-ghost" data-fechar>Cancelar</button>
      </div>
    </div>`);
  el('rs-ok').onclick = async () => {
    const btn = el('rs-ok'), erro = el('rs-erro');
    btn.disabled = true; btn.textContent = 'Enviando…'; erro.classList.add('hide');
    try{
      const { error } = await sb.functions.invoke('send-password-reset',
        { body: { email, redirectTo: JOGO_URL + '/' } });
      if(error){
        // a mensagem real vem no corpo; error.message é sempre genérico
        let msg = error.message;
        try{ const b = await error.context.json(); if(b && b.error) msg = b.error; }catch(e){}
        throw new Error(msg);
      }
    }catch(e){
      btn.disabled = false; btn.textContent = 'Enviar e-mail';
      erro.textContent = erroMsg(e); erro.classList.remove('hide');
      return;
    }
    registrar('senha.reenviar', email);
    fecharModal();
    toast('Link de nova senha enviado para ' + email);
  };
}

/* ============================ RESENHAS & SOLO ============================ */
async function pgJogos(){
  const { data, error } = await sb.rpc('jogos');
  if(error) throw error;
  D.jogos = data;
  const salas = data.salas||[], conv = data.convites||[], solos = data.solos||[],
        pedidos = data.pedidos||[], soloUsers = data.solo_usuarios||[];
  const aceites = conv.filter(c=>c.estado==='aceito').length;
  const podeApagar = ME.papel==='socio';
  SEL.salas = SEL.salas || new Set();
  SEL.saves = SEL.saves || new Set();
  SEL.convites = SEL.convites || new Set();
  const idsSala = new Set(salas.map(s=>s.id));
  Array.from(SEL.salas).forEach(x => { if(!idsSala.has(x)) SEL.salas.delete(x); });
  const idsSave = new Set(solos.map(chaveSave));
  Array.from(SEL.saves).forEach(x => { if(!idsSave.has(x)) SEL.saves.delete(x); });
  const idsConv = new Set(conv.map(chaveConvite));
  Array.from(SEL.convites).forEach(x => { if(!idsConv.has(x)) SEL.convites.delete(x); });

  const colSalas = `${podeApagar?'30px ':''}.8fr 1.3fr .8fr .8fr .8fr .8fr${podeApagar?' 30px':''}`;
  const colSolo  = `${podeApagar?'30px ':''}1.6fr 1.4fr .7fr .8fr .9fr 1fr`;
  const colConv  = `${podeApagar?'30px ':''}1.6fr .8fr .8fr .9fr`;
  // saves de cada pessoa, para o check da linha marcar todos de uma vez
  const savesDe = u => solos.filter(s => s.user_id === u.user_id);

  el('page').innerHTML = `
    <div class="g4">
      ${kpiHTML({l:'Resenhas abertas', v:num(salas.length), d:`${num(salas.filter(s=>s.phase==='running').length)} em jogo`})}
      ${kpiHTML({l:'Salas sem humano', v:num(data.salas_vazias), d:'só CPU — candidatas a limpeza'})}
      ${kpiHTML({l:'Jogadores no solo', v:num(soloUsers.length), d:`${num(solos.length)} saves no total`})}
      ${kpiHTML({l:'Convites (30 dias)', v:num(conv.length), d: conv.length? `${pct(aceites,conv.length)}% aceitos` : 'nenhum enviado'})}
    </div>

    <!-- ===================== MODO RESENHA ===================== -->
    <div class="card" style="overflow:hidden">
      <div class="card-h">
        <b>Modo Resenha — salas abertas</b>
        ${podeApagar?`<span class="st" style="margin:0">selecionar:
          <span class="link" data-sel-salas="vazias">sem humano</span> ·
          <span class="link" data-sel-salas="velhas">paradas 14d+</span> ·
          <span class="link" data-sel-salas="nenhuma">limpar</span></span>`:''}
        <span class="mono" style="font-size:12px;color:var(--dim2)">${num(salas.length)} salas</span>
      </div>
      <div class="rowh" style="grid-template-columns:${colSalas};border-bottom:none">
        ${podeApagar?'<span><input type="checkbox" id="sel-todas-salas" title="Selecionar todas"></span>':''}
        <span>Sala</span><span>Anfitrião</span><span style="text-align:center">Treinadores</span>
        <span style="text-align:center">Jornada</span>
        <span style="text-align:right">Aberta há</span><span style="text-align:right">Ativa há</span>
        ${podeApagar?'<span></span>':''}
      </div>
      ${salas.length ? salas.map(s=>`
        <div class="row" style="grid-template-columns:${colSalas};padding:10px 20px">
          ${podeApagar?`<span><input type="checkbox" data-sala="${h(s.id)}" ${SEL.salas.has(s.id)?'checked':''}></span>`:''}
          <span class="mono" style="font-size:12px;color:var(--verde2)">${h(s.id)}</span>
          <span style="font-size:12.5px;min-width:0;overflow:hidden;text-overflow:ellipsis">${h(s.anfitriao)}</span>
          <span class="mono" style="font-size:12.5px;font-weight:700;text-align:center;color:${s.humanos>=s.lugares?'var(--verde2)':s.humanos?'var(--fg)':'var(--dim3)'}">${s.humanos}/${s.lugares}</span>
          <span class="mono" style="font-size:12px;text-align:center;color:var(--dim)">${s.round||0}ª</span>
          <span class="mono" style="font-size:12px;text-align:right;color:var(--dim2)">${h(ha(s.created_at))}</span>
          <span class="mono" style="font-size:12px;text-align:right;color:${dias(s.updated_at)>=14?'var(--vermelho)':'var(--dim2)'}">${h(ha(s.updated_at))}</span>
          ${podeApagar?`<span class="link" data-apagar-sala="${h(s.id)}" data-humanos="${s.humanos}"
             title="Apagar a sala ${h(s.id)}" style="color:var(--dim3);text-align:center">✕</span>`:''}
        </div>`).join('') : '<div class="vazio">Nenhuma sala aberta.</div>'}
    </div>

    <!-- ===================== MODO SOLO =====================
         Uma linha por JOGADOR, não por save: aqui a pergunta é quantos saves cada um
         tem. Quem é a pessoa, quanto pontuou e quantos títulos ganhou está em Usuários. -->
    <div class="card" style="overflow:hidden">
      <div class="card-h">
        <b>Modo Solo — saves por jogador</b>
        ${podeApagar?`<span class="st" style="margin:0">selecionar:
          <span class="link" data-sel-saves="14">saves parados 14d+</span> ·
          <span class="link" data-sel-saves="30">30d+</span> ·
          <span class="link" data-sel-saves="nenhum">limpar</span></span>`:''}
        <span class="mono" style="font-size:12px;color:var(--dim2)">${num(solos.length)} saves</span>
      </div>
      <div class="rowh" style="grid-template-columns:${colSolo};border-bottom:none">
        ${podeApagar?'<span><input type="checkbox" id="sel-todos-saves" title="Selecionar todos os saves"></span>':''}
        <span>Jogador</span><span>Conta</span><span style="text-align:center">Saves</span>
        <span style="text-align:center">Parados</span><span>Divisões</span>
        <span style="text-align:right">Último salvamento</span>
      </div>
      ${soloUsers.length ? soloUsers.map(u=>{
        const meus = savesDe(u);
        const marcados = meus.filter(s=>SEL.saves.has(chaveSave(s))).length;
        const n = dias(u.ultimo);
        const cor = n<=2?'var(--verde2)':n<=13?'var(--ambar)':'var(--vermelho)';
        return `<div class="row" style="grid-template-columns:${colSolo};padding:10px 20px">
          ${podeApagar?`<span><input type="checkbox" data-solo-user="${h(u.user_id)}"
             ${marcados===meus.length&&meus.length?'checked':''}
             title="Selecionar os ${meus.length} saves deste jogador"></span>`:''}
          <span style="display:flex;align-items:center;gap:10px;min-width:0">
            <i class="av" style="width:26px;height:26px;background:${corAv(u.tecnico)};color:#0c1210;font-size:11px">${h(iniciais(u.tecnico))}</i>
            <b style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis">${h(u.tecnico)}</b>
          </span>
          <span style="font-size:12px;color:var(--dim);min-width:0;overflow:hidden;text-overflow:ellipsis">${h(u.dono||'—')}</span>
          <span class="mono" style="font-size:13px;font-weight:700;text-align:center">${u.saves}${
            marcados&&marcados<meus.length?`<small style="color:var(--verde2);font-weight:500"> (${marcados} sel.)</small>`:''}</span>
          <span class="mono" style="font-size:12.5px;text-align:center;color:${+u.parados?'var(--vermelho)':'var(--dim3)'}">${u.parados}</span>
          <span class="mono" style="font-size:12px;color:var(--dim)">${h(u.divisoes||'—')}</span>
          <span class="mono" style="font-size:12.5px;text-align:right;color:${cor}">${h(ha(u.ultimo))}</span>
        </div>`;
      }).join('') : '<div class="vazio">Nenhum save solo.</div>'}
    </div>

    <!-- ===================== CONVITES ===================== -->
    <div class="card" style="overflow:hidden">
      <div class="card-h">
        <b>Convites de sala</b>
        ${podeApagar?`<span class="st" style="margin:0">selecionar:
          <span class="link" data-sel-conv="expirados">expirados</span> ·
          <span class="link" data-sel-conv="aceitos">já aceitos</span> ·
          <span class="link" data-sel-conv="nenhum">limpar</span></span>`:''}
        <span style="font-size:12px;color:var(--dim2)">${conv.length?pct(aceites,conv.length)+'% aceitos':'—'}</span>
      </div>
      <div class="rowh" style="grid-template-columns:${colConv};border-bottom:none">
        ${podeApagar?'<span><input type="checkbox" id="sel-todos-conv" title="Selecionar todos"></span>':''}
        <span>Destino</span><span>Sala</span><span style="text-align:right">Enviado</span>
        <span style="text-align:center">Estado</span>
      </div>
      ${conv.length ? conv.map(c=>{
        const k = chaveConvite(c);
        return `<div class="row" style="grid-template-columns:${colConv};padding:10px 20px">
          ${podeApagar?`<span><input type="checkbox" data-conv="${h(k)}" ${SEL.convites.has(k)?'checked':''}></span>`:''}
          <span style="font-size:12.5px;min-width:0;overflow:hidden;text-overflow:ellipsis">${h(mascara(c.destino))}</span>
          <span class="mono" style="font-size:12px;color:var(--verde2)">${h(c.game_id)}</span>
          <span class="mono" style="font-size:12.5px;text-align:right;color:var(--dim2)">${h(ha(c.created_at))}</span>
          <span class="tag ${c.estado==='aceito'?'t-ok':c.estado==='pendente'?'t-warn':'t-dim'}" style="justify-self:center">${h(c.estado)}</span>
        </div>`;
      }).join('') : '<div class="vazio">Nenhum convite registrado.</div>'}
      ${pedidos.length ? `<div class="card-h" style="border-top:1px solid var(--bd)"><b>Pedidos para entrar</b></div>` +
        pedidos.map(p=>`
        <div class="row" style="grid-template-columns:${colConv};padding:10px 20px">
          ${podeApagar?'<span></span>':''}
          <span style="font-size:12.5px">${h(p.destino||'—')}</span>
          <span class="mono" style="font-size:12px;color:var(--verde2)">${h(p.game_id)}</span>
          <span class="mono" style="font-size:12.5px;text-align:right;color:var(--dim2)">${h(ha(p.created_at))}</span>
          <span class="tag ${p.estado==='aceito'?'t-ok':p.estado==='pendente'?'t-warn':'t-dim'}" style="justify-self:center">${h(p.estado)}</span>
        </div>`).join('') : ''}
    </div>`;

  if(podeApagar){
    document.querySelectorAll('[data-apagar-sala]').forEach(b =>
      b.onclick = () => modalApagarSala(b.dataset.apagarSala, +b.dataset.humanos));
    ligarSelecao(salas, solos, soloUsers);
  }
  barraSelecao();
}

/* um save é identificado pelo PAR dono+nome: dois jogadores podem ter um save "TESTE" */
function chaveSave(s){ return s.user_id + ' ' + s.save_name; }
/* room_invites não tem chave única — o par sala+convidado é o que identifica */
function chaveConvite(c){ return c.game_id + ' ' + c.user_id; }

function ligarSelecao(salas, solos, soloUsers){
  document.querySelectorAll('[data-sala]').forEach(c => c.onchange = () => {
    if(c.checked) SEL.salas.add(c.dataset.sala); else SEL.salas.delete(c.dataset.sala);
    barraSelecao();
  });
  /* a linha do solo é por JOGADOR, mas a exclusão continua sendo por SAVE: marcar a
     linha marca todos os saves daquela pessoa, e os atalhos por idade seguem pegando
     save a save (é o que permite apagar só os parados de quem ainda joga). */
  document.querySelectorAll('[data-solo-user]').forEach(c => c.onchange = () => {
    const meus = solos.filter(s => s.user_id === c.dataset.soloUser);
    meus.forEach(s => { if(c.checked) SEL.saves.add(chaveSave(s)); else SEL.saves.delete(chaveSave(s)); });
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
    pgJogos();
  });
  document.querySelectorAll('[data-conv]').forEach(c => c.onchange = () => {
    if(c.checked) SEL.convites.add(c.dataset.conv); else SEL.convites.delete(c.dataset.conv);
    barraSelecao();
  });
  const todosConv = el('sel-todos-conv');
  if(todosConv) todosConv.onchange = () => {
    (D.jogos.convites||[]).forEach(c => { const k=chaveConvite(c);
      if(todosConv.checked) SEL.convites.add(k); else SEL.convites.delete(k); });
    marcarCaixas(); barraSelecao();
  };
  document.querySelectorAll('[data-sel-conv]').forEach(a => a.onclick = () => {
    const q = a.dataset.selConv, cs = D.jogos.convites||[];
    if(q==='nenhum') SEL.convites.clear();
    else cs.filter(c => c.estado === (q==='aceitos'?'aceito':'expirado'))
           .forEach(c => SEL.convites.add(chaveConvite(c)));
    pgJogos();
  });
  document.querySelectorAll('[data-sel-saves]').forEach(a => a.onclick = () => {
    const q = a.dataset.selSaves;
    if(q==='nenhum') SEL.saves.clear();
    else solos.filter(s => q==='zerados' ? (!s.temporada || s.temporada==='0')
                                         : dias(s.updated_at) >= Number(q))
              .forEach(s => SEL.saves.add(chaveSave(s)));
    pgJogos();
  });
}
/* repinta só as caixinhas — redesenhar a página perderia a rolagem e o foco */
function marcarCaixas(){
  document.querySelectorAll('[data-sala]').forEach(c => { c.checked = SEL.salas.has(c.dataset.sala); });
  document.querySelectorAll('[data-solo-user]').forEach(c => {
    const meus = ((D.jogos||{}).solos||[]).filter(s => s.user_id === c.dataset.soloUser);
    c.checked = meus.length > 0 && meus.every(s => SEL.saves.has(chaveSave(s)));
  });
  document.querySelectorAll('[data-conv]').forEach(c => { c.checked = SEL.convites.has(c.dataset.conv); });
  document.querySelectorAll('[data-conta]').forEach(c => { c.checked = SEL.contas.has(c.dataset.conta); });
}

/* BARRA FLUTUANTE — só existe com algo selecionado, e diz exatamente o que vai embora.
   Serve às quatro seleções (salas, saves, convites e contas), que vivem em páginas
   diferentes mas usam o mesmo caminho de exclusão. */
function barraSelecao(){
  let barra = el('sel-barra');
  const n = { salas:SEL.salas.size, saves:SEL.saves.size, convites:SEL.convites.size, contas:SEL.contas.size };
  const total = n.salas + n.saves + n.convites + n.contas;
  if(!total){ if(barra) barra.remove(); return; }
  if(!barra){
    barra = document.createElement('div');
    barra.id = 'sel-barra'; barra.className = 'sel-barra';
    document.body.appendChild(barra);
  }
  const partes = [];
  const plural = (q,s,p) => `<b>${q}</b> ${q>1?p:s}`;
  if(n.contas)   partes.push(plural(n.contas,'conta','contas'));
  if(n.salas)    partes.push(plural(n.salas,'sala','salas'));
  if(n.saves)    partes.push(plural(n.saves,'save solo','saves solo'));
  if(n.convites) partes.push(plural(n.convites,'convite','convites'));
  barra.innerHTML = `<span>${partes.join(' · ')} na seleção</span>
    <button class="btn btn-sm btn-ghost" id="sel-limpar">Limpar</button>
    <button class="btn btn-sm" id="sel-apagar" style="background:var(--vermelho);color:#fff">Apagar</button>`;
  el('sel-limpar').onclick = () => {
    SEL.salas.clear(); SEL.saves.clear(); SEL.convites.clear(); SEL.contas.clear();
    marcarCaixas(); barraSelecao();
  };
  el('sel-apagar').onclick = modalApagarEmMassa;
}

/* Confirmação proporcional ao estrago: diz o que cada tipo leva junto e exige digitar o
   NÚMERO de itens — um "tem certeza?" não segura quem acabou de clicar em "selecionar
   todos". Conta é o caso mais grave, e por isso ganha um resumo vindo do banco. */
async function modalApagarEmMassa(){
  const salas = ((D.jogos||{}).salas||[]).filter(s => SEL.salas.has(s.id));
  const saves = ((D.jogos||{}).solos||[]).filter(s => SEL.saves.has(chaveSave(s)));
  const convs = ((D.jogos||{}).convites||[]).filter(c => SEL.convites.has(chaveConvite(c)));
  const contas = (D.usuarios||[]).filter(u => SEL.contas.has(u.id));
  const total = salas.length + saves.length + convs.length + contas.length;
  const humanos = salas.reduce((a,s)=>a+ (Number(s.humanos)||0), 0);
  const ativos = salas.filter(s=>dias(s.updated_at)<14).length
               + saves.filter(s=>dias(s.updated_at)<14).length
               + contas.filter(u=>dias(u.ultimo_acesso)<14).length;

  // conta é o caso irreversível mais pesado: o banco diz o que vai junto ANTES de apagar
  let resumo = null;
  if(contas.length){
    try{
      const { data } = await sb.rpc('resumo_usuarios', { p_ids: contas.map(u=>u.id) });
      resumo = data;
    }catch(e){}
  }

  abrirModal(`
    <h3>Apagar ${total} ite${total>1?'ns':'m'}?</h3>
    <div class="col">
      <div class="erro" style="line-height:1.7">
        ${contas.length?`<b>${contas.length} conta${contas.length>1?'s':''} de jogador</b> — a pessoa perde o acesso
          e tudo que ela tem no jogo${resumo?`: <b>${resumo.saves}</b> save(s), <b>${resumo.assentos}</b> assento(s)
          e <b>${resumo.salas}</b> sala(s) que ela hospeda`:''}.<br>`:''}
        ${resumo && resumo.salas_com_gente?`As salas dela têm <b>outros treinadores</b> jogando — eles perdem a temporada também.<br>`:''}
        ${salas.length?`<b>${salas.length} sala${salas.length>1?'s':''}</b> — assentos, chat, convites e histórico vão junto.<br>`:''}
        ${saves.length?`<b>${saves.length} save${saves.length>1?'s':''} solo</b> — a carreira de cada um acaba aqui.<br>`:''}
        ${convs.length?`<b>${convs.length} convite${convs.length>1?'s':''}</b> de sala — só o registro do convite.<br>`:''}
        ${humanos?`Há <b>${humanos} treinador${humanos>1?'es humanos':' humano'}</b> sentado${humanos>1?'s':''} nas salas selecionadas.<br>`:''}
        ${ativos?`<b>${ativos}</b> desses itens teve movimento nos últimos 14 dias — não são abandonados.<br>`:''}
        Não dá para desfazer.
      </div>
      ${contas.length?`<div class="st mono" style="line-height:1.6">${h(contas.map(u=>u.email).slice(0,20).join(' '))}${contas.length>20?' …':''}</div>`:''}
      ${salas.length?`<div class="st mono" style="line-height:1.6">${h(salas.map(s=>s.id).slice(0,30).join(' '))}${salas.length>30?' …':''}</div>`:''}
      <label class="f">Digite <b class="mono">${total}</b> para confirmar
        <input class="f mono" id="bulk-n" inputmode="numeric" autocomplete="off" placeholder="${total}"></label>
      <div class="erro hide" id="bulk-erro"></div>
      <div class="acoes">
        <button class="btn" id="bulk-ok" style="background:var(--vermelho);color:#fff" disabled>Apagar tudo</button>
        <button class="btn btn-ghost" data-fechar>Cancelar</button>
      </div>
    </div>`);
  const inp = el('bulk-n'), ok = el('bulk-ok'), erro = el('bulk-erro');
  inp.oninput = () => { ok.disabled = inp.value.trim() !== String(total); };
  inp.onkeydown = ev => { if(ev.key==='Enter' && !ok.disabled) ok.click(); };
  inp.focus();
  ok.onclick = async () => {
    ok.disabled = true; ok.textContent = 'Apagando…'; erro.classList.add('hide');
    const msg = [];
    try{
      // contas primeiro: apagar a conta já limpa saves, assentos e salas dela, e evita
      // gastar chamada apagando o que sairia junto de qualquer jeito
      if(contas.length){
        const { data, error } = await sb.rpc('apagar_usuarios', { p_ids: contas.map(u=>u.id) });
        if(error) throw error;
        msg.push(`${data.apagadas} conta${data.apagadas>1?'s':''}`);
      }
      if(salas.length){
        const { data, error } = await sb.rpc('apagar_salas', { p_ids: salas.map(s=>s.id) });
        if(error) throw error;
        if(data.apagadas) msg.push(`${data.apagadas} sala${data.apagadas>1?'s':''}`);
      }
      if(saves.length){
        const { data, error } = await sb.rpc('apagar_saves',
          { p_saves: saves.map(s => ({ u:s.user_id, s:s.save_name })) });
        if(error) throw error;
        if(data.saves) msg.push(`${data.saves} save${data.saves>1?'s':''}`);
      }
      if(convs.length){
        const { data, error } = await sb.rpc('apagar_convites',
          { p_convites: convs.map(c => ({ g:c.game_id, u:c.user_id })) });
        if(error) throw error;
        if(data.convites) msg.push(`${data.convites} convite${data.convites>1?'s':''}`);
      }
    }catch(e){
      ok.disabled=false; ok.textContent='Apagar tudo';
      erro.textContent = erroMsg(e); erro.classList.remove('hide');
      return;
    }
    SEL.salas.clear(); SEL.saves.clear(); SEL.convites.clear(); SEL.contas.clear();
    fecharModal(); barraSelecao();
    toast('Apagado: ' + (msg.join(', ') || 'nada'));
    if(ST.tab==='usuarios') pgUsuarios(); else pgJogos();
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
/* Máscara de contato de terceiros — usada nas listas de CONVITE e de SAVE, onde o
   e-mail é só referência de quem é quem. Em Usuários o e-mail aparece inteiro: é a
   ferramenta de trabalho da página (procurar a conta, reenviar senha, dar suporte),
   e meio e-mail não serve para nada disso. */
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
  const [ov, lanc, ia] = await Promise.all([
    sb.rpc('overview', { p_dias: ST.periodo }),
    sb.from('adm_lancamentos').select('*').order('data', { ascending:false }).limit(400),
    jogo('ia_custos').select('tipo,custo_usd')
  ]);
  if(ov.error) throw ov.error;
  if(lanc.error) throw lanc.error;
  D.overview = ov.data; D.lancamentos = lanc.data||[];
  D.iaCustos = ia.error ? [] : (ia.data||[]);

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

  /* gastos com IA do Estúdio — registrados pela edge function a cada geração.
     "Escudo" = escudo; "Uniforme" = torso (uniformes e moldes); "Jogador" =
     rosto + montagem (e o retrato legado). Dólar, direto da tabela da OpenAI. */
  const iaSoma = tipos => D.iaCustos.filter(r=>tipos.includes(r.tipo))
    .reduce((a,r)=>({ n:a.n+1, v:a.v + Number(r.custo_usd) }), { n:0, v:0 });
  const iaEsc = iaSoma(['escudo']), iaUni = iaSoma(['torso']),
        iaJog = iaSoma(['rosto','montagem','jogador']);
  const iaTot = iaEsc.v + iaUni.v + iaJog.v;
  /* a moeda do painel é o REAL: converte pelo câmbio do dia (cache de 1h) e o
     dólar da fatura da OpenAI aparece como secundário */
  let cot = 0;
  try{
    const cc = JSON.parse(localStorage.getItem('rf_cotacao')||'null');
    if(cc && Date.now()-cc.t < 3600e3) cot = cc.v;
    else{
      const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
      cot = parseFloat((await r.json()).USDBRL.bid)||0;
      if(cot) localStorage.setItem('rf_cotacao', JSON.stringify({v:cot, t:Date.now()}));
    }
  }catch(e){}
  if(!cot) cot = 5.5;   // fallback honesto se a cotação não vier
  const usd  = v => 'US$ ' + v.toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});
  const emRe = v => 'R$ ' + (v*cot).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2});
  const iaCards = `
    <div class="card card-p" style="margin-top:4px">
      <div class="tt">Gastos com IA — Estúdio de imagens</div>
      <div class="st" style="margin-bottom:12px">Registrado automaticamente a cada geração (contagem desde 25/08/2026). Pintura de molde e camadas não custam nada. Câmbio do dia: R$ ${cot.toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2})}.</div>
      <div class="g4">
        ${kpiHTML({l:'Escudos gerados', v:emRe(iaEsc.v), d:`${usd(iaEsc.v)} · ${num(iaEsc.n)} gerações`})}
        ${kpiHTML({l:'Uniformes e moldes', v:emRe(iaUni.v), d:`${usd(iaUni.v)} · ${num(iaUni.n)} gerações`})}
        ${kpiHTML({l:'Jogadores (rosto + costura)', v:emRe(iaJog.v), d:`${usd(iaJog.v)} · ${num(iaJog.n)} gerações`})}
        ${kpiHTML({l:'Total gasto com IA', v:emRe(iaTot), d:`${usd(iaTot)} · ${num(iaEsc.n+iaUni.n+iaJog.n)} imagens`, c:'var(--ambar)'})}
      </div>
    </div>`;

  el('page').innerHTML = `
    <div class="g4">
      ${kpiHTML({l:'Receita do mês', v:brl(tRec), d:`${rec.length} lançamentos`, c:'var(--verde2)'})}
      ${kpiHTML({l:'Despesa do mês', v:brl(tDesp), d:`${desp.length} lançamentos`, c:'var(--vermelho)'})}
      ${kpiHTML({l:'Lucro do mês', v:brl(lucro), d: tRec? `margem de ${pct(lucro,tRec)}%` : 'sem receita', c: lucro>=0?'var(--verde2)':'var(--vermelho)'})}
      ${kpiHTML({l:'Por usuário ativo', v: ativos? brl(Math.round(tDesp/ativos)) : '—',
                 d: ativos? `receita ${brl(Math.round(tRec/ativos))} por ativo` : 'sem ativos no período'})}
    </div>
    ${iaCards}
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
      ${e.dur_max_s!=null?`<div><span>Vídeo</span><b>até ${e.dur_max_s}s${e.sem_audio===false?'':' · sem som'}</b></div>`:''}
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
                   mp4:'video/mp4', webm:'video/webm', gif:'image/gif' };
function modalUpload(chave){
  const e = (D.pub.espacos||[]).find(x=>x.chave===chave);
  if(!e) return;
  const exts = (e.formatos||[]).map(f=>f.toLowerCase());
  const accept = exts.map(x=>'.'+x).join(',');
  const patros = D.pub.patrocinadores||[];
  const razao = (e.w/e.h).toFixed(2);
  /* vídeo: o espaço só o aceita se tiver duração máxima definida E um formato de vídeo na lista */
  const aceitaVideo = e.dur_max_s != null && exts.some(x=>x==='mp4'||x==='webm');
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
      ${aceitaVideo ? `<div><span style="color:var(--dim2)">Duração máx.</span><b>${e.dur_max_s}s</b></div>
      <div><span style="color:var(--dim2)">Áudio</span><b>${e.sem_audio===false?'permitido':'sem som'}</b></div>` : ''}
      ${e.nota ? `<div class="full" style="color:var(--dim2);line-height:1.5">${h(e.nota)}</div>` : ''}
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
      if(ext==='mp4'||ext==='webm'){
        const v = document.createElement('video');
        /* o limite é o DO ESPAÇO (ad_spaces.dur_max_s) — era 15 s fixo para todos, e a pausa
           patrocinada precisa de 8 s. Meio segundo de folga para o arredondamento do encoder. */
        const limite = (e.dur_max_s != null ? e.dur_max_s : 15) + 0.5;
        v.onloadedmetadata = () => { URL.revokeObjectURL(url);
          if(v.duration > limite) return rej(new Error('vídeo maior que '+(e.dur_max_s!=null?e.dur_max_s:15)+' s'));
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
        ${total} funcionalidades · ${votos} votos${editar?' · arraste um card para mudar de coluna, ou o ⠿ para mudar a ordem das colunas':''}</span>
      ${editar?'<button class="btn btn-sm" id="kb-nova">+ Nova funcionalidade</button>':''}
    </div>
    <div class="kb" id="kb">
      ${D.cols.map(c=>colunaHTML(c, editar)).join('')}
      ${editar?`<div class="kbnova" style="width:236px;flex:none;display:flex;flex-direction:column;gap:8px">
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
      ${editar?`<span class="kbgrip" data-mover-col="${c.id}" title="Arraste para mudar a ordem da coluna">⠿</span>`:''}
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

  /* ---- ARRASTAR A COLUNA INTEIRA (pelo punho ⠿) ----
     Mesmo padrão do card: pointer events, limiar de 4px e um espaço tracejado abrindo
     onde ela vai cair. O punho existe porque o cabeçalho já tem o campo de renomear —
     arrastar por ele impediria de clicar para editar o nome. */
  document.querySelectorAll('[data-mover-col]').forEach(punho => {
    punho.addEventListener('pointerdown', ev => {
      if(ev.button!==0) return;
      ev.preventDefault();
      const col = punho.closest('.kbcol');
      const inicio = { x:ev.clientX, y:ev.clientY };
      let ativo=false, ghost=null, slot=null;

      const mover = e2 => {
        if(!ativo){
          if(Math.hypot(e2.clientX-inicio.x, e2.clientY-inicio.y) < 4) return;
          ativo = true;
          const r = col.getBoundingClientRect();
          ghost = col.cloneNode(true);
          ghost.className = 'kbcol kbcol-ghost';
          ghost.style.width = r.width+'px';
          ghost.style.height = Math.min(r.height, 360)+'px';
          document.body.appendChild(ghost);
          slot = document.createElement('div');
          slot.className = 'kbcol-slot';
          slot.style.width = r.width+'px';
          slot.style.height = Math.min(r.height, 360)+'px';
          col.after(slot);
          col.style.display='none';
          punho.setPointerCapture(ev.pointerId);
        }
        ghost.style.left = (e2.clientX-60)+'px';
        ghost.style.top  = (e2.clientY-18)+'px';
        const outras = Array.from(el('kb').querySelectorAll('.kbcol')).filter(c=>c.style.display!=='none');
        const antes = outras.find(c => { const r=c.getBoundingClientRect(); return e2.clientX < r.left + r.width/2; });
        if(antes) el('kb').insertBefore(slot, antes);
        else el('kb').insertBefore(slot, el('kb').querySelector('.kbnova') || null);
      };
      const largar = async () => {
        window.removeEventListener('pointermove', mover);
        window.removeEventListener('pointerup', largar);
        if(!ativo) return;
        if(ghost) ghost.remove();
        // ordem final: onde o espaço parou é onde a coluna entra
        // o elemento ORIGINAL continua no DOM, só escondido — sem tirá-lo daqui a coluna
        // entraria duas vezes na ordem, e dois updates do mesmo id disputariam a posição
        const ids = Array.from(el('kb').children)
          .map(n => n===slot ? punho.dataset.moverCol : (n===col ? null : n.dataset.col))
          .filter(Boolean);
        slot.remove(); col.style.display='';
        try{
          await Promise.all(ids.map((id,i) =>
            sb.from('adm_kanban_cols').update({ ord:i }).eq('id', id)));
          registrar('kanban.ordem', ids.length + ' colunas');
        }catch(e){ toast(erroMsg(e), true); }
        pgFeatures();
      };
      window.addEventListener('pointermove', mover, { passive:true });
      window.addEventListener('pointerup', largar);
    });
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
        // mesma armadilha do arrasto de coluna: o card original está escondido, não removido.
        // Solto na MESMA coluna, ele apareceria duas vezes na ordem.
        const ids = Array.from(lista.children)
          .map(n => n===slot ? id : (n===card ? null : n.dataset.card))
          .filter(Boolean);
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
            <span style="text-align:right;display:flex;gap:10px;justify-content:flex-end">${dono?
              `<span class="link" data-link-inv="${h(i.token)}" style="font-size:11.5px">Copiar link</span>
               <span class="link" data-del-inv="${h(i.id)}" data-email="${h(i.email)}"
                     style="font-size:11.5px;color:var(--dim3)" title="Cancelar convite">Cancelar</span>`:''}</span>
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
    document.querySelectorAll('[data-del-inv]').forEach(b => b.onclick = async () => {
      if(!confirm(`Cancelar o convite de ${b.dataset.email}? O link deixa de funcionar.`)) return;
      const { error } = await sb.rpc('apagar_convites_painel', { p_ids:[b.dataset.delInv] });
      if(error) return toast(erroMsg(error), true);
      toast('Convite cancelado.'); pgEquipa();
    });
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
/* MODAL SEMPRE INTEIRO NA TELA.
   Os modais são escritos como um bloco só (título, campos, botões). Nos maiores — ficha
   do clube com elenco, competição com calendário — isso passava da altura da janela: a
   pessoa rolava a PÁGINA atrás do botão de salvar, e em tela baixa o botão simplesmente
   não aparecia.

   Em vez de acertar cada modal à mão (e ter de lembrar disso em todo modal novo), a
   montagem é rearranjada aqui, uma vez: o <h3> vira cabeçalho fixo, os botões (.acoes)
   viram rodapé fixo, e TUDO que sobra no meio vai para uma área que rola sozinha. O
   modal nunca passa da altura da janela, e título e ação ficam sempre à vista. */
function abrirModal(html, cls){
  el('modais').innerHTML = `<div class="modal"><div class="box ${cls||''}">${html}</div></div>`;
  const m = el('modais').firstElementChild;
  const box = m.firstElementChild;

  const titulo = box.querySelector(':scope > h3');
  const acoes  = box.querySelector('.acoes');
  const corpo = document.createElement('div');
  corpo.className = 'box-corpo';
  // move o miolo para a área rolável (o cabeçalho e o rodapé ficam de fora)
  Array.from(box.childNodes).forEach(n => { if(n !== titulo) corpo.appendChild(n); });
  if(acoes && corpo.contains(acoes)) acoes.remove();
  box.appendChild(corpo);
  if(titulo) titulo.classList.add('box-hd');
  if(acoes){ acoes.classList.add('box-ft'); box.appendChild(acoes); }

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
                    '/src/engine/world-rules.js', '/src/engine/calendars.js',
                    '/src/engine/world-config.js'];
  /* NÃO acrescente uma folha aqui antes de o site estar PUBLICADO com ela: os arquivos vêm de
     JOGO_URL (produção, não do localhost) e um único 404 rejeita o Promise.all abaixo, deixando
     a página do Editor inteira sem catálogo. As quatro acima já estão no ar. */
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
    <div class="duas-col">
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

     </div>
     <div class="col" style="gap:10px">
      <div style="display:flex;align-items:baseline;gap:10px">
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
     </div>
    </div>
    <div class="acoes">
        ${editar?`<button class="btn" id="c-salvar">Salvar no patch</button>`:''}
        ${editar&&ed?`<button class="btn btn-ghost" id="c-reverter" style="flex:0 0 auto;color:var(--vermelho)">Tirar do patch</button>`:''}
        <button class="btn btn-ghost" data-fechar>Fechar</button>
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
      <input class="f mono" id="${id}-hex" value="${h(valor||'#1b7a3d')}" style="flex:1;min-width:0;font-size:12px" maxlength="7">
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

    ${gradeDeSlotsHTML()}

    <div class="card card-p" style="border-color:#5a4a18;background:#1c1710;margin-bottom:16px">
      <div class="tt" style="margin-bottom:6px;color:var(--ambar)">Datas e slots</div>
      <div class="st" style="line-height:1.7">
        A grade acima é o que o jogo joga: cada competição ocupa um <b>slot</b> (a semana) numa
        <b>janela</b> (meio de semana ou fim de semana), e a data é só o rótulo. A lista de datas
        abaixo é a mesma coisa, vista pelo calendário.
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

  /* O SELETOR DE PAÍS DA GRADE fica FORA do `if(!editar)` de propósito: a grade é leitura, e
     quem só tem permissão de ver precisa poder olhar o calendário de cada país. */
  const selPais = el('cal-pais');
  if(selPais) selPais.onchange = () => { ST.calPais = selPais.value; pgEditor(); };

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

/* ===================== A GRADE DE SLOTS =====================
   O que o jogo joga, exatamente como o motor o lê: engine/calendars.js. Cada linha é uma janela
   (MIDWEEK_1 = terça/quarta, MIDWEEK_2 = quinta, WEEKEND = fim de semana) e cada coluna é um slot
   — a semana da temporada. É a mesma folha que o servidor recebe injetada, então o que se vê aqui
   é o que acontece na sala.

   E o VALIDADOR é o do motor (CALENDARIOS_API.validarCalendario), não uma cópia: uma segunda
   versão da mesma regra é a causa histórica de toda esta família de bug — está escrito no
   cabeçalho do world-rules.js. Se o painel aprovasse uma folha que o jogo recusa, teríamos
   inventado exatamente esse problema outra vez.

   As cores das competições saem de corComp(), as mesmas do gráfico do ano logo abaixo. */
function calAPI(){ return (typeof window!=='undefined' && window.CALENDARIOS_API) || null; }

function gradeDeSlotsHTML(){
  const API = calAPI();
  if(!API) return `<div class="card card-p" style="margin-bottom:16px"><div class="st">
    A folha de calendário do jogo ainda não carregou.</div></div>`;

  const paises = API.paisesComCalendario();
  const pais = ST.calPais && paises.includes(ST.calPais) ? ST.calPais : paises[0];
  const cal = API.calendarioDe(pais);
  const uni = (window.UNIVERSOS||{})[pais];

  /* os totais REAIS de rodada não estão no painel (dependem do save: nº de grupos, tique de
     sorteio). Usa-se o nº de slots declarados, que é o que a folha promete — a regra dos "poucos
     slots" fica então por conta do motor, que conhece o total de verdade e avisa nos relatórios. */
  const problemas = API.validarCalendario(pais, { divisoes: uni && uni.size });
  const erros  = problemas.filter(x=>x.nivel==='erro');
  const avisos = problemas.filter(x=>x.nivel==='aviso');

  const comps = Object.keys(cal.competicoes);
  const onde = {};                                   // slot:janela -> competição
  comps.forEach(k => cal.competicoes[k].slots.forEach((sl,i) => { onde[sl+':'+cal.competicoes[k].janela] = { k, i }; }));

  const rotulo = { MIDWEEK_1:'Meio de semana I', MIDWEEK_2:'Meio de semana II', WEEKEND:'Fim de semana' };
  const linhas = API.JANELAS.map(j => {
    const celulas = [];
    for(let sl=1; sl<=cal.slotsTotal; sl++){
      const c = onde[sl+':'+j];
      celulas.push(c
        ? `<i class="sl sl-on" style="background:${corComp(c.k)}" title="${h(nomeComp(c.k))} — rodada ${c.i+1}, semana ${sl}"></i>`
        : `<i class="sl" title="semana ${sl}"></i>`);
    }
    return `<div class="sl-linha"><span class="sl-rot">${rotulo[j]||j}</span><div class="sl-cels">${celulas.join('')}</div></div>`;
  }).join('');

  const ultimoDeLiga = (cal.competicoes.liga && cal.competicoes.liga.slots.slice(-1)[0]) || 0;
  const finais = comps.filter(k=>k!=='liga').map(k=>{
    const sl = cal.competicoes[k].slots.slice(-1)[0];
    return `<span class="sl-final"><i style="background:${corComp(k)}"></i>${h(nomeComp(k))} decide na semana ${sl}</span>`;
  }).join('');

  return `<div class="card card-p" style="margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:220px">
        <div class="tt">A grade da temporada</div>
        <div class="st">${cal.slotsTotal} semanas. Cada quadradinho é um dia de jogo — a semana e o momento dela.</div>
      </div>
      <label class="f" style="margin:0">País
        <select class="f" id="cal-pais">
          ${paises.map(p=>`<option value="${h(p)}" ${p===pais?'selected':''}>${h(nomePais(p))}</option>`).join('')}
        </select></label>
    </div>

    ${erros.length ? `<div class="erro" style="margin-bottom:12px">
      <b>${erros.length} problema(s) que o jogo recusa:</b><br>
      ${erros.map(x=>`${h(x.comp||'')} — ${h(x.texto)}`).join('<br>')}
    </div>` : `<div class="ok" style="margin-bottom:12px">
      Folha válida: nenhuma competição divide o dia com outra, e nenhuma perde rodada.
    </div>`}
    ${avisos.length ? `<div class="aviso" style="margin-bottom:12px">
      ${avisos.map(x=>`${h(x.comp||'')} — ${h(x.texto)}`).join('<br>')}
    </div>` : ''}

    <div class="sl-grade">${linhas}</div>
    <div class="sl-rodape">
      <span class="sl-final"><i style="background:#5b6b7a"></i>Liga até a semana ${ultimoDeLiga}</span>
      ${finais}
    </div>
  </div>`;
}
function nomeComp(k){
  const d = (window.COMPETICOES||{})[k];
  return d ? d.short : (k==='liga' ? 'Liga nacional' : k);
}
function nomePais(k){
  if(k==='brasil') return 'Brasil';
  const u=(window.UNIVERSOS||{})[k];
  return (u && u.country) || k;
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
    <div class="duas-col">
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

     </div>
     <div class="col">
      <div class="tt">Calendário</div>
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
      <div id="k-datas" style="display:flex;flex-wrap:wrap;gap:6px;max-height:260px;overflow-y:auto;
           align-content:flex-start;padding:2px"></div>
     </div>
    </div>
    <div class="acoes">
      <button class="btn" id="k-ok">Salvar competição</button>
      <button class="btn btn-ghost" data-fechar>Cancelar</button>
    </div>`, 'xl');

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

/* ============================================================================
   PARCEIROS — influenciadores e o rastro do link deles
   ----------------------------------------------------------------------------
   O que interessa num programa de influenciador é uma linha só: visita → conta
   criada → conta pagante. As três pontas vivem em tabelas diferentes (ref_hits,
   ref_signups, adm_user_plans) e a função parceiros() já as cruza.

   O link é `?ref=CODIGO` no site do jogo. Quem registra a visita e guarda o
   código até o cadastro é o próprio jogo (ver src/net/ads.js): a pessoa quase
   nunca cria conta na primeira visita, e o primeiro link é o que vale.
   ============================================================================ */
/* Cada rede com o endereço que o link precisa ter. `arroba` marca as que põem @ antes
   do perfil (TikTok e YouTube), e `hosts` lista os domínios que a pessoa pode colar —
   inclusive os curtos (youtu.be) e o m. do celular, que é de onde vem metade dos links
   copiados no telefone. */
const REDES = [
  { k:'youtube',   nome:'YouTube',   ic:'▶', base:'youtube.com/',   arroba:true,
    hosts:['youtube.com','m.youtube.com','youtu.be'] },
  { k:'tiktok',    nome:'TikTok',    ic:'♪', base:'tiktok.com/',    arroba:true,
    hosts:['tiktok.com','m.tiktok.com','vm.tiktok.com'] },
  { k:'instagram', nome:'Instagram', ic:'◎', base:'instagram.com/', arroba:false,
    hosts:['instagram.com'] },
  { k:'twitch',    nome:'Twitch',    ic:'◇', base:'twitch.tv/',     arroba:false,
    hosts:['twitch.tv','m.twitch.tv'] },
  { k:'site',      nome:'Site',      ic:'⌂', base:null,             arroba:false, hosts:[] },
  /* GRUPOS DE COMUNIDADE — o convite do WhatsApp é um código, o do Telegram é um nome e
     o do Facebook é /groups/ID. Mesma regra dos canais: cole o link ou só o pedaço final. */
  { k:'whatsapp', nome:'Grupo de WhatsApp', ic:'✆', base:'chat.whatsapp.com/', arroba:false,
    grupo:true, hosts:['chat.whatsapp.com','wa.me','api.whatsapp.com'] },
  { k:'telegram', nome:'Grupo de Telegram', ic:'✈', base:'t.me/',              arroba:false,
    grupo:true, hosts:['t.me','telegram.me','telegram.dog'] },
  { k:'facebook', nome:'Grupo de Facebook', ic:'⌘', base:'facebook.com/groups/', arroba:false,
    grupo:true, hosts:['facebook.com','m.facebook.com','fb.com','web.facebook.com'] }
];
const CANAIS_REDE = () => REDES.filter(r => !r.grupo);
const GRUPOS_REDE = () => REDES.filter(r => r.grupo);
const REDE = k => REDES.find(r => r.k === k) || REDES[REDES.length-1];

/* COLOU A URL INTEIRA OU SÓ O PERFIL? Aceita os dois e devolve sempre o perfil limpo.
   Tira protocolo, www., o domínio da rede, o @, a barra final e o ?rastro=... que vem
   grudado quando se copia do app. É o que permite deixar o prefixo fixo na tela e a
   pessoa colar o que tiver na mão. */
function perfilLimpo(valor, rede){
  let t = String(valor||'').trim();
  if(!t) return '';
  t = t.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  (rede.hosts||[]).forEach(hst => {
    const re = new RegExp('^' + hst.replace(/\./g,'\\.') + '\/?', 'i');
    t = t.replace(re, '');
  });
  t = t.split('?')[0].split('#')[0];      // ?igsh=..., ?si=... e afins
  t = t.replace(/^@+/, '').replace(/\/+$/, '').trim();
  /* SÓ O PERFIL, NÃO A PÁGINA DELE. Link copiado do app costuma vir com a aba junto
     (/videos, /reels, /about) e isso virava parte do nome. Fica o primeiro pedaço —
     menos nas rotas antigas do YouTube (/channel/UC…, /c/nome, /user/nome), em que o
     perfil são dois pedaços. */
  if(rede.k === 'facebook') t = t.replace(/^groups\//i, '');
  if(rede.base){
    const partes = t.split('/').filter(Boolean);
    if(partes.length > 1){
      t = ['channel','c','user'].includes(partes[0].toLowerCase())
        ? partes.slice(0,2).join('/')
        : partes[0];
    }
  }
  return t;
}
/* perfil -> endereço canônico, que é o que fica gravado (a lista usa direto no href) */
function perfilUrl(perfil, rede){
  const t = perfilLimpo(perfil, rede);
  if(!t) return null;
  if(!rede.base){                          // site livre: só garante o protocolo
    return /^https?:\/\//i.test(String(perfil).trim()) ? String(perfil).trim() : 'https://' + t;
  }
  // /channel/UC… e /c/nome são caminho, não perfil com @
  const rota = /^(channel|c|user)\//i.test(t);
  return 'https://' + rede.base + (rede.arroba && !rota ? '@' : '') + t;
}
/* telefone brasileiro: guarda só dígitos, mostra (11) 91234-5678 */
function telFmt(v){
  const d = String(v||'').replace(/\D/g,'').slice(0,11);
  if(d.length <= 2) return d;
  if(d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if(d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}
const telDigitos = v => String(v||'').replace(/\D/g,'');
function linkRef(codigo){ return `${JOGO_URL}/?ref=${encodeURIComponent(codigo)}`; }
/* código a partir do nome: é o que aparece no link, então sem acento nem espaço */
function codigoDe(nome){
  return chaveNome(nome).toUpperCase().slice(0,16) || ('P'+Date.now().toString(36).toUpperCase());
}

/* CONTABILIDADE POR RESPONSÁVEL — quem trouxe quantos parceiros, e o que eles renderam.
   Não é só contar cabeça: um sócio com 2 parceiros que trazem 300 inscritos vale mais
   que outro com 10 parados, então a linha mostra as três colunas juntas. */
function porResponsavelHTML(ps){
  if(!ps.length) return '';
  const por = new Map();
  ps.forEach(p => {
    const chave = p.responsavel || 'não registrado';
    const r = por.get(chave) || { nome:chave, email:p.responsavel_email, saiu:p.responsavel_saiu,
                                  parceiros:0, ativos:0, inscritos:0, pagantes:0 };
    r.parceiros++;
    if(p.estado==='ativo') r.ativos++;
    r.inscritos += Number(p.inscritos)||0;
    r.pagantes  += Number(p.pagantes)||0;
    por.set(chave, r);
  });
  const linhas = Array.from(por.values()).sort((a,b)=> b.parceiros - a.parceiros);
  const maior = Math.max(1, ...linhas.map(l=>l.parceiros));
  return `<div class="card card-p">
    <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:14px">
      <div class="tt">Quem cadastrou cada parceiro</div>
      <span class="st" style="margin:0">com quem falar quando a negociação avança</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${linhas.map(l=>`
        <div style="display:grid;grid-template-columns:200px 1fr 92px 92px 92px;align-items:center;gap:12px">
          <span style="display:flex;align-items:center;gap:8px;min-width:0">
            ${l.nome==='não registrado'
              ? `<i class="av" style="width:24px;height:24px;font-size:11px;background:var(--bd2);color:var(--dim2)">?</i>`
              : `<i class="av" style="width:24px;height:24px;font-size:10px;background:${corAv(l.nome)};color:#0c1210">${h(iniciais(l.nome))}</i>`}
            <span style="min-width:0;overflow:hidden">
              <b style="display:block;font-size:12.5px;font-weight:600;color:${l.nome==='não registrado'?'var(--dim2)':'var(--fg)'};overflow:hidden;text-overflow:ellipsis">${h(l.nome)}</b>
              <small style="font-size:10.5px;color:${l.saiu?'var(--ambar)':'var(--dim3)'};overflow:hidden;text-overflow:ellipsis;display:block">
                ${l.saiu?'saiu do painel':h(l.email||(l.nome==='não registrado'?'cadastrado antes deste controle':''))}</small></span>
          </span>
          <span class="bar"><i style="width:${pct(l.parceiros,maior)}%"></i></span>
          <span class="mono" style="font-size:12.5px;text-align:right">${l.parceiros} parceiro${l.parceiros>1?'s':''}</span>
          <span class="mono" style="font-size:12.5px;text-align:right;color:var(--dim)">${num(l.inscritos)} inscritos</span>
          <span class="mono" style="font-size:12.5px;text-align:right;color:${l.pagantes?'var(--verde2)':'var(--dim3)'}">${num(l.pagantes)} pagantes</span>
        </div>`).join('')}
    </div>
  </div>`;
}
/* STATUS DA NEGOCIAÇÃO — eixo diferente do `estado` da parceria. `estado` diz se ela
   está de pé (ativo/pausado/encerrado); `status` diz em que ponto está a conversa. Um
   parceiro pode estar negociando e ainda não ativo, ou ativo e aguardando retorno sobre
   a próxima campanha. */
const STATUS_PARCEIRO = {
  novo:               ['Novo',              't-dim',  'var(--dim2)'],
  contatado:          ['Contatado',         't-azul', 'var(--azul)'],
  testando:           ['Testando',          't-ok',   'var(--verde)'],
  negociando:         ['Negociando',        't-warn', 'var(--ambar)'],
  aguardando_retorno: ['Aguardando retorno','t-roxo', 'var(--roxo)'],
  fechado:            ['Fechado',           't-ok',   'var(--verde2)']
};
/* CONTAGEM POR ETAPA, separada dos números de audiência. As duas leituras respondem
   perguntas diferentes: uma é "o que este parceiro já trouxe", a outra é "onde está a
   conversa" — juntar as duas numa fileira de KPIs faria parecer que são a mesma coisa. */
function funilParceirosHTML(ps){
  if(!ps.length) return '';
  const cont = {}; Object.keys(STATUS_PARCEIRO).forEach(k => cont[k] = 0);
  ps.forEach(p => { cont[p.status || 'novo'] = (cont[p.status || 'novo']||0) + 1; });
  const total = ps.length;
  return `<div class="card card-p">
    <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:14px">
      <div class="tt">Em que ponto está cada conversa</div>
      <span class="st" style="margin:0">${num(total)} parceiro${total>1?'s':''} no total</span>
    </div>
    <div class="etapas">
      ${Object.keys(STATUS_PARCEIRO).map(k=>{
        const [rot,, cor] = STATUS_PARCEIRO[k];
        const n = cont[k]||0;
        return `<div class="etapa ${n?'':'vazia'}" data-filtro-status="${k}" title="Ver só estes">
          <div class="etapa-n" style="color:${n?cor:'var(--dim3)'}">${n}</div>
          <div class="etapa-r">${rot}</div>
          <div class="etapa-b"><i style="width:${pct(n,total)}%;background:${cor}"></i></div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
/* ===== SEGUIDORES =====
   Só o YouTube dá o número de graça e sem depender do parceiro: channels.list custa 1
   unidade das 10.000 diárias e aceita o @handle direto (forHandle). Instagram e TikTok
   não expõem seguidores sem conta comercial vinculada, e o Twitch só devolve o total com
   autorização do próprio canal — nesses três o número é digitado à mão.
   A origem fica gravada porque um número conferido pela API e um anotado por alguém não
   valem a mesma coisa depois de três meses. */
const REDES_SEG = ['youtube','tiktok','instagram','twitch'];
function seguidoresTotal(p){
  return REDES_SEG.reduce((a,k)=> a + (Number(p['seg_'+k])||0), 0);
}
/* 12.400 -> "12,4 mil" · 1.250.000 -> "1,3 mi" — a lista precisa da ordem de grandeza,
   não do número exato (esse fica no tooltip) */
function segCurto(n){
  n = Number(n)||0;
  if(n >= 1e6) return (n/1e6).toFixed(n>=1e7?0:1).replace('.',',')+' mi';
  if(n >= 1e3) return (n/1e3).toFixed(n>=1e4?0:1).replace('.',',')+' mil';
  return String(n);
}
async function chaveYoutube(){
  if(D.ytKey !== undefined) return D.ytKey;
  try{
    const { data } = await sb.from('adm_config').select('valor').eq('chave','youtube_api_key').maybeSingle();
    D.ytKey = (data && String(data.valor).replace(/^"|"$/g,'')) || null;
  }catch(e){ D.ytKey = null; }
  return D.ytKey;
}
/* busca os inscritos de um @handle. Devolve null quando o canal não existe ou a chave
   não está configurada — quem chama decide o que dizer. */
async function inscritosYoutube(handle, key){
  if(!handle || !key) return null;
  const url = 'https://www.googleapis.com/youtube/v3/channels'
            + '?part=statistics&forHandle=' + encodeURIComponent(handle) + '&key=' + encodeURIComponent(key);
  const r = await fetch(url);
  if(!r.ok) throw new Error(r.status===403 ? 'A chave do YouTube foi recusada (cota ou restrição de domínio).' : 'YouTube respondeu HTTP '+r.status);
  const j = await r.json();
  const item = j.items && j.items[0];
  if(!item) return null;
  return Number(item.statistics && item.statistics.subscriberCount) || 0;
}
async function pgParceiros(){
  const editar = podeEditar('publicidade');
  const { data, error } = await sb.rpc('parceiros');
  if(error) throw error;
  D.parceiros = data || [];
  const todos = D.parceiros;
  const ps = ST.statusParceiro
    ? todos.filter(p => (p.status||'novo') === ST.statusParceiro)
    : todos;
  const colPa = '1.25fr 1.1fr .95fr .8fr .75fr .7fr .55fr .6fr .6fr .7fr';
  const visitas = ps.reduce((a,p)=>a+ +p.visitas, 0);
  const inscritos = ps.reduce((a,p)=>a+ +p.inscritos, 0);
  const pagantes = ps.reduce((a,p)=>a+ +p.pagantes, 0);

  el('page').innerHTML = `
    <div class="kpis">
      ${kpiHTML({l:'Parceiros', v:num(ps.length), d:`${num(ps.filter(p=>p.estado==='ativo').length)} ativos`})}
      ${kpiHTML({l:'Alcance somado', v:segCurto(ps.reduce((a,p)=>a+seguidoresTotal(p),0)),
                 d:`${num(ps.filter(p=>seguidoresTotal(p)).length)} com número registrado`})}
      ${kpiHTML({l:'Visitas pelos links', v:num(visitas), d:'uma por pessoa/dia'})}
      ${kpiHTML({l:'Contas criadas', v:num(inscritos),
                 d: visitas? `${pct(inscritos,visitas)}% das visitas` : 'nenhuma ainda'})}
      ${kpiHTML({l:'Viraram pagantes', v:num(pagantes),
                 d: inscritos? `${pct(pagantes,inscritos)}% dos inscritos` : '—', c:'var(--verde2)'})}
    </div>

    ${funilParceirosHTML(todos)}

    ${porResponsavelHTML(ps)}

    <div class="card" style="overflow:hidden">
      <div class="card-h">
        <b>Parceiros</b>
        ${editar?'<button class="btn btn-sm btn-ghost" id="pa-yt">Atualizar YouTube</button>':''}
        ${editar?'<button class="btn btn-sm" id="pa-novo">+ Parceiro</button>':''}
      </div>
      <div class="rowh" style="grid-template-columns:${colPa}">
        <span>Parceiro</span><span>Status</span><span>Responsável</span><span>Contato</span><span>Canais</span>
        <span style="text-align:center">Seguidores</span>
        <span style="text-align:center">Visitas</span><span style="text-align:center">Inscritos</span>
        <span style="text-align:center">Pagantes</span><span style="text-align:right">Link</span>
      </div>
      ${ps.length ? ps.map(p=>`
        <div class="row" style="grid-template-columns:${colPa};cursor:pointer" data-parceiro="${p.id}">
          <span style="display:flex;align-items:center;gap:10px;min-width:0">
            <i class="av" style="width:28px;height:28px;border-radius:8px;background:${corAv(p.nome)};color:#0c1210">${h(iniciais(p.nome))}</i>
            <span style="min-width:0"><b style="display:block;font-size:13px;font-weight:600">${h(p.nome)}</b>
              <small class="mono" style="font-size:11px;color:var(--verde2)">${h(p.codigo)}</small>
              ${p.estado!=='ativo'?`<span class="tag t-dim" style="font-size:9.5px">${h(p.estado)}</span>`:''}</span>
          </span>
          <span onclick="event.stopPropagation()">
            <select class="sel-status" data-status="${p.id}"
                    style="color:${STATUS_PARCEIRO[p.status||'novo'][2]}"
                    ${editar?'':'disabled'} title="${p.status_em?'Neste ponto desde '+h(dmy(p.status_em)):''}">
              ${Object.keys(STATUS_PARCEIRO).map(k=>
                `<option value="${k}" ${k===(p.status||'novo')?'selected':''}>${STATUS_PARCEIRO[k][0]}</option>`).join('')}
            </select></span>
          <span style="min-width:0;display:flex;align-items:center;gap:8px">
            ${p.responsavel
              ? `<i class="av" style="width:24px;height:24px;font-size:10px;background:${corAv(p.responsavel)};color:#0c1210"
                    title="${h(p.responsavel_email||'')}">${h(iniciais(p.responsavel))}</i>
                 <span style="min-width:0;overflow:hidden">
                   <b style="display:block;font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis">${h(p.responsavel)}</b>
                   ${p.responsavel_saiu?'<small style="font-size:10.5px;color:var(--ambar)">saiu do painel</small>':''}</span>`
              : '<span style="font-size:12px;color:var(--dim3)">não registrado</span>'}</span>
          <span style="min-width:0;font-size:12px;color:var(--dim);overflow:hidden;text-overflow:ellipsis">
            ${h(p.email||'—')}${p.telefone?'<br>'+h(telFmt(p.telefone)):''}</span>
          <span style="display:flex;gap:8px;font-size:14px">
            ${REDES.filter(r=>p[r.k]).map(r=>
              `<a href="${h(p[r.k])}" target="_blank" rel="noopener" title="${r.nome}: ${h(p[r.k])}"
                  onclick="event.stopPropagation()" style="color:var(--dim)">${r.ic}</a>`).join('') || '<span style="color:var(--dim3);font-size:12px">—</span>'}
          </span>
          <span class="mono" style="font-size:12.5px;text-align:center;color:${seguidoresTotal(p)?'var(--fg)':'var(--dim3)'}"
                title="${REDES_SEG.filter(k=>p['seg_'+k]).map(k=>REDE(k).nome+': '+num(p['seg_'+k])).join(' · ')||'sem número registrado'}${p.seg_em?' — atualizado '+ha(p.seg_em)+(p.seg_origem==='api'?' pela API':' à mão'):''}">
            ${seguidoresTotal(p) ? segCurto(seguidoresTotal(p)) : '—'}
            ${p.seg_origem==='api'?'<small style="display:block;font-size:9px;color:var(--verde2)">API</small>':''}
          </span>
          <span class="mono" style="font-size:12.5px;text-align:center">${num(p.visitas)}</span>
          <span class="mono" style="font-size:12.5px;text-align:center;color:${p.inscritos?'var(--fg)':'var(--dim3)'}">${num(p.inscritos)}</span>
          <span class="mono" style="font-size:12.5px;text-align:center;color:${p.pagantes?'var(--verde2)':'var(--dim3)'}">${num(p.pagantes)}</span>
          <span style="text-align:right"><span class="link" data-copiar="${h(p.codigo)}"
            onclick="event.stopPropagation()" style="font-size:11.5px">Copiar link</span></span>
        </div>`).join('') : '<div class="vazio">Nenhum parceiro cadastrado.</div>'}
    </div>

    <div class="card card-p">
      <div class="tt" style="margin-bottom:6px">Como o rastro funciona</div>
      <div class="st" style="line-height:1.7">
        O link do parceiro é <code class="mono">${h(JOGO_URL)}/?ref=CODIGO</code>. Ao abrir, o jogo
        conta <b>uma visita por pessoa por dia</b> e guarda o código no navegador. Quando essa
        pessoa cria conta — no mesmo dia ou semanas depois — a conta fica ligada ao parceiro, e
        aparece na coluna <b>Referral</b> em Usuários. <b>O primeiro link vence</b>: abrir o link
        de outro parceiro depois não rouba a indicação de quem trouxe a pessoa.
      </div>
    </div>`;

  document.querySelectorAll('[data-copiar]').forEach(b => b.onclick = () => {
    const url = linkRef(b.dataset.copiar);
    navigator.clipboard.writeText(url).then(()=>toast('Link copiado: '+url), ()=>prompt('Copie o link:', url));
  });
  document.querySelectorAll('[data-filtro-status]').forEach(e => e.onclick = () => {
    ST.statusParceiro = ST.statusParceiro===e.dataset.filtroStatus ? null : e.dataset.filtroStatus;
    pgParceiros();
  });
  if(editar){
    el('pa-yt').onclick = () => atualizarYoutube(ps);
    /* muda o ponto da conversa direto na lista: é uma troca de uma palavra, e abrir a
       ficha inteira para isso é o tipo de atrito que faz o status nunca ser atualizado */
    document.querySelectorAll('[data-status]').forEach(sel => sel.onchange = async () => {
      const antes = sel.dataset.antes || '';
      const { error } = await sb.from('adm_parceiros')
        .update({ status: sel.value, status_em: new Date().toISOString() })
        .eq('id', sel.dataset.status);
      if(error){ toast(erroMsg(error), true); return; }
      sel.style.color = STATUS_PARCEIRO[sel.value][2];
      registrar('parceiro.status', sel.dataset.status, { de: antes, para: sel.value });
      toast('Status: ' + STATUS_PARCEIRO[sel.value][0]);
      pgParceiros();
    });
    el('pa-novo').onclick = () => modalParceiro(null);
    document.querySelectorAll('[data-parceiro]').forEach(r => r.onclick = () =>
      modalParceiro(ps.find(p=>p.id===r.dataset.parceiro)));
  }
}

/* um campo de perfil: prefixo fixo + só o nome, com a seta que abre para conferir.
   Nos canais que têm público, o número de seguidores fica ao lado — YouTube vem da API
   (botão no topo da lista); os outros são digitados. */
function campoPerfil(r, valor, seguidores){
  const pre = r.base ? r.base + (r.arroba?'@':'') : 'https://';
  const v = r.base ? perfilLimpo(valor||'', r) : String(valor||'').replace(/^https?:\/\//i,'');
  return `<label class="f">${h(r.nome)}
    <span class="perfil">
      <span class="perfil-pre">${h(pre)}</span>
      <input id="pa-${r.k}" data-rede="${r.k}" autocomplete="off" value="${h(v)}"
             placeholder="${r.grupo?'código do convite':(r.base?'perfil':'site.com.br')}">
      <a class="perfil-ir hide" id="pa-${r.k}-ir" target="_blank" rel="noopener" title="Abrir para conferir">↗</a>
    </span>
    ${REDES_SEG.includes(r.k) ? `<span style="display:flex;align-items:center;gap:8px">
      <input class="f mono" id="pa-seg-${r.k}" inputmode="numeric" style="padding:7px 10px;font-size:12.5px"
             value="${seguidores!=null?num(seguidores):''}" placeholder="seguidores">
      ${r.k==='youtube'?'<small style="font-size:10.5px;color:var(--dim3);white-space:nowrap">vem da API</small>':''}
    </span>` : ''}
  </label>`;
}

/* MODAL EM SEÇÕES, LADO A LADO. Com canais, grupos, contato e indicação, a ficha
   empilhada passava de qualquer tela. Em duas colunas cada bloco tem um assunto, e a
   altura cai pela metade — abaixo de 980px de janela o CSS volta a empilhar. */

/* ATUALIZAÇÃO EM LOTE DOS INSCRITOS DO YOUTUBE.
   Uma chamada por parceiro com canal (1 unidade de cota cada), em série e não em
   paralelo: 30 parceiros é 30 unidades das 10.000 do dia, e disparar tudo de uma vez
   só serviria para tomar 403 por rajada. Mostra o que deu certo e o que não achou —
   canal renomeado é o caso comum, e falhar calado deixaria um número velho parecendo
   atual na tela. */
async function atualizarYoutube(ps){
  const key = await chaveYoutube();
  if(!key){ return modalChaveYoutube(); }
  const alvos = ps.filter(p => p.youtube);
  if(!alvos.length) return toast('Nenhum parceiro com canal do YouTube.', true);

  const btn = el('pa-yt'); btn.disabled = true;
  let ok = 0; const falhas = [];
  for(let i=0;i<alvos.length;i++){
    const p = alvos[i];
    btn.textContent = `Atualizando ${i+1}/${alvos.length}…`;
    try{
      const handle = perfilLimpo(p.youtube, REDE('youtube'));
      const n = await inscritosYoutube(handle, key);
      if(n == null){ falhas.push(p.nome + ' (canal não encontrado)'); continue; }
      const { error } = await sb.from('adm_parceiros')
        .update({ seg_youtube:n, seg_em:new Date().toISOString(), seg_origem:'api' })
        .eq('id', p.id);
      if(error) throw error;
      ok++;
    }catch(e){
      falhas.push(p.nome + ' — ' + erroMsg(e));
      if(/recusada/i.test(e.message||'')) break;   // chave ruim: não adianta insistir
    }
  }
  btn.disabled = false; btn.textContent = 'Atualizar YouTube';
  registrar('parceiros.seguidores', ok + ' canais', { ok, falhas: falhas.length });
  if(falhas.length) toast(`${ok} atualizados · ${falhas.length} sem resposta: ${falhas.slice(0,2).join('; ')}`, true);
  else toast(`${ok} canais atualizados.`);
  pgParceiros();
}

/* a chave é pedida uma vez e fica em adm_config (só admin lê). Não é segredo forte —
   o painel roda no navegador —, então a proteção certa é restringir a chave por
   domínio no console do Google, e é isso que o texto explica. */
function modalChaveYoutube(){
  abrirModal(`
    <h3>Ligar a contagem do YouTube</h3>
    <div class="col">
      <div class="st" style="line-height:1.7">
        Os inscritos vêm da <b>YouTube Data API v3</b>, que é gratuita: cada parceiro
        consultado custa 1 unidade das 10.000 por dia. Para ligar:
        <br>1. Crie um projeto em <code class="mono">console.cloud.google.com</code>
        <br>2. Ative a <b>YouTube Data API v3</b>
        <br>3. Crie uma chave de API e, em <i>Restrições</i>, limite-a ao domínio
        <code class="mono">admin.retrofoot.com.br</code>
        <br><br>A restrição por domínio é o que protege a chave: o painel roda no
        navegador, então ela fica visível para quem abrir o código da página.
      </div>
      <label class="f">Chave da API<input class="f mono" id="yt-key" placeholder="AIza…"></label>
      <div class="erro hide" id="yt-erro"></div>
      <div class="acoes">
        <button class="btn" id="yt-ok">Salvar e testar</button>
        <button class="btn btn-ghost" data-fechar>Cancelar</button>
      </div>
    </div>`, 'lg');
  el('yt-ok').onclick = async () => {
    const erro = el('yt-erro'), btn = el('yt-ok');
    const key = el('yt-key').value.trim();
    if(!key){ erro.textContent='Cole a chave.'; erro.classList.remove('hide'); return; }
    btn.disabled = true; btn.textContent = 'Testando…';
    try{
      // testa num canal que existe, para a chave não ser salva quebrada
      await inscritosYoutube('@youtube', key);
    }catch(e){
      btn.disabled=false; btn.textContent='Salvar e testar';
      erro.textContent = erroMsg(e); erro.classList.remove('hide'); return;
    }
    const { error } = await sb.from('adm_config').upsert({ chave:'youtube_api_key', valor: key });
    if(error){ btn.disabled=false; btn.textContent='Salvar e testar';
               erro.textContent=erroMsg(error); erro.classList.remove('hide'); return; }
    D.ytKey = key;
    registrar('config.youtube_api_key', 'configurada');
    fecharModal(); toast('Chave salva. Clique em "Atualizar YouTube".');
  };
}

function modalParceiro(p){
  const novo = !p;
  p = p || { nome:'', email:'', telefone:'', codigo:'', estado:'ativo' };
  abrirModal(`
    <h3>${novo?'Novo parceiro':h(p.nome)}</h3>
    <div class="col" style="gap:14px">
      ${!novo && p.responsavel ? `<div class="st" style="display:flex;align-items:center;gap:8px;margin:0">
        <i class="av" style="width:22px;height:22px;font-size:9.5px;background:${corAv(p.responsavel)};color:#0c1210">${h(iniciais(p.responsavel))}</i>
        Cadastrado por <b style="color:var(--fg2)">${h(p.responsavel)}</b>
        ${p.responsavel_email?`<span class="mono" style="font-size:11px">${h(p.responsavel_email)}</span>`:''}
        ${p.responsavel_saiu?'<span class="tag t-warn" style="font-size:10px">saiu do painel</span>':''}
      </div>` : ''}

      <div class="duas-col">
        <div class="col" style="gap:14px">
          <fieldset class="secao">
            <legend>Quem é</legend>
            <label class="f">Nome<input class="f" id="pa-nome" value="${h(p.nome)}" placeholder="Ex.: Canal do Zé"></label>
            <div class="g2" style="gap:12px">
              <label class="f">Status da conversa<select class="f" id="pa-status">
                ${Object.keys(STATUS_PARCEIRO).map(k=>
                  `<option value="${k}" ${k===(p.status||'novo')?'selected':''}>${STATUS_PARCEIRO[k][0]}</option>`).join('')}
              </select></label>
              <label class="f">Parceria<select class="f" id="pa-estado">
                ${['ativo','pausado','encerrado'].map(e=>`<option value="${e}" ${e===p.estado?'selected':''}>${e}</option>`).join('')}
              </select></label>
            </div>
            <label class="f">E-mail<input class="f" id="pa-email" type="email" value="${h(p.email||'')}" placeholder="contato@canal.com"></label>
            <label class="f">Telefone (com DDD)
              <input class="f mono" id="pa-tel" inputmode="numeric" value="${h(telFmt(p.telefone))}" placeholder="(11) 91234-5678"></label>
          </fieldset>

          <fieldset class="secao">
            <legend>Grupos de comunidade</legend>
            ${GRUPOS_REDE().map(r => campoPerfil(r, p[r.k])).join('')}
          </fieldset>
        </div>

        <div class="col" style="gap:14px">
          <fieldset class="secao">
            <legend>Canais</legend>
            ${CANAIS_REDE().map(r => campoPerfil(r, p[r.k], p['seg_'+r.k])).join('')}
            <div class="st" style="margin:0">Cole o link inteiro ou só o perfil — o campo ajusta.</div>
          </fieldset>

          <fieldset class="secao">
            <legend>Indicação</legend>
            <label class="f">Código do link
              <input class="f mono" id="pa-cod" value="${h(p.codigo)}" maxlength="16" placeholder="gerado a partir do nome">
              <small style="font-size:11.5px;color:var(--dim3)" id="pa-link">${p.codigo?h(linkRef(p.codigo)):''}</small>
            </label>
            <label class="f">Notas<textarea class="f" id="pa-notas" rows="3"
              placeholder="Combinado comercial, prazos…">${h(p.notas||'')}</textarea></label>
          </fieldset>
        </div>
      </div>

      <div class="erro hide" id="pa-erro"></div>
    </div>
    <div class="acoes">
      <button class="btn" id="pa-ok">${novo?'Cadastrar':'Salvar'}</button>
      ${!novo?`<button class="btn btn-ghost" id="pa-del" style="flex:0 0 auto;color:var(--vermelho)">Apagar</button>`:''}
      <button class="btn btn-ghost" data-fechar>Cancelar</button>
    </div>`, 'xl');

  const tel = el('pa-tel');
  tel.oninput = () => { tel.value = telFmt(tel.value); };

  /* o campo aceita o link inteiro (colado do app) e guarda só o perfil; a setinha ao
     lado abre o endereço montado, que é como se confere o parceiro sem sair da ficha */
  REDES.forEach(r => {
    const inp = el('pa-'+r.k), ir = el('pa-'+r.k+'-ir');
    if(!inp) return;
    const ajustar = () => {
      const limpo = perfilLimpo(inp.value, r);
      if(limpo !== inp.value) inp.value = limpo;
      const url = perfilUrl(inp.value, r);
      if(url){ ir.href = url; ir.classList.remove('hide'); }
      else ir.classList.add('hide');
    };
    inp.oninput = ajustar;
    inp.onpaste = () => setTimeout(ajustar, 0);   // o valor colado só existe no tique seguinte
    ajustar();
  });

  let codTocado = !novo;
  el('pa-cod').oninput = () => { codTocado = true; mostrarLink(); };
  el('pa-nome').oninput = () => {
    if(!codTocado) el('pa-cod').value = codigoDe(el('pa-nome').value);
    mostrarLink();
  };
  function mostrarLink(){
    const c = el('pa-cod').value.trim().toUpperCase();
    el('pa-link').textContent = c ? linkRef(c) : '';
  }

  el('pa-ok').onclick = async () => {
    const erro = el('pa-erro');
    const nome = el('pa-nome').value.trim();
    const cod = el('pa-cod').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(!nome || !cod){ erro.textContent='Nome e código são obrigatórios.'; erro.classList.remove('hide'); return; }
    const linha = {
      nome, codigo: cod, estado: el('pa-estado').value, status: el('pa-status').value,
      email: el('pa-email').value.trim()||null,
      telefone: telDigitos(el('pa-tel').value)||null,
      notas: el('pa-notas').value.trim()||null
    };
    REDES.forEach(r => { linha[r.k] = perfilUrl(el('pa-'+r.k).value, r); });
    // seguidores digitados: só marca 'manual' se algum número mudou, para não apagar o
    // carimbo de "veio da API" numa edição que só mexeu no telefone
    let mexeuSeg = false;
    REDES_SEG.forEach(k => {
      const campo = el('pa-seg-'+k); if(!campo) return;
      const n = campo.value.trim()==='' ? null : Number(campo.value.replace(/\D/g,''));
      linha['seg_'+k] = n;
      if(n !== (p['seg_'+k]==null?null:Number(p['seg_'+k]))) mexeuSeg = true;
    });
    if(mexeuSeg){ linha.seg_em = new Date().toISOString(); linha.seg_origem = 'manual'; }
    // status_em é "desde quando está neste ponto": só mexe quando o ponto muda
    if(!novo && linha.status !== (p.status||'novo')) linha.status_em = new Date().toISOString();
    let res;
    if(novo){
      linha.criado_por = (await sb.auth.getUser()).data.user.id;
      if(linha.status !== 'novo') linha.status_em = new Date().toISOString();
      res = await sb.from('adm_parceiros').insert(linha);
    } else {
      res = await sb.from('adm_parceiros').update(linha).eq('id', p.id);
    }
    if(res.error){
      erro.textContent = /duplicate|unique/i.test(res.error.message) ? 'Já existe parceiro com esse código.' : erroMsg(res.error);
      erro.classList.remove('hide'); return;
    }
    registrar(novo?'parceiro.criar':'parceiro.editar', cod, { nome });
    fecharModal(); toast(novo?'Parceiro cadastrado.':'Parceiro salvo.'); pgParceiros();
  };
  if(!novo) el('pa-del').onclick = async () => {
    if(!confirm(`Apagar ${p.nome}? O histórico de visitas e as contas já indicadas continuam no banco.`)) return;
    const { error } = await sb.from('adm_parceiros').delete().eq('id', p.id);
    if(error) return toast(erroMsg(error), true);
    registrar('parceiro.apagar', p.codigo);
    fecharModal(); toast('Parceiro apagado.'); pgParceiros();
  };
}

/* ============================================================================
   CONTEÚDO — calendário editorial
   ----------------------------------------------------------------------------
   Começa com uma ideia e só isso: título e canal bastam para salvar. O resto
   (descrição, arte, data, status) entra depois, editando o mesmo card — é assim
   que pauta funciona, e obrigar a preencher tudo de uma vez só faz a ideia não
   ser registrada.
   ============================================================================ */
const CANAIS = { youtube:['YouTube','#ff0033'], instagram:['Instagram','#c13584'],
                 facebook:['Facebook','#1877f2'], tiktok:['TikTok','#25f4ee'], twitch:['Twitch','#9146ff'] };
const STATUS = { ideia:['Ideia','t-dim'], design:['Design','t-azul'], edicao:['Edição','t-warn'],
                 agendado:['Agendado','t-roxo'], publicado:['Publicado','t-ok'] };

async function pgConteudo(){
  const editar = podeEditar('publicidade') || podeEditar('produto');
  const { data, error } = await sb.from('adm_conteudo').select('*').order('data_prevista', { ascending:true, nullsFirst:false });
  if(error) throw error;
  D.conteudo = data || [];
  const cs = D.conteudo;
  const filtro = ST.filtroConteudo || 'todos';
  const lista = filtro==='todos' ? cs : cs.filter(c => c.status===filtro);
  const semData = lista.filter(c => !c.data_prevista);
  const comData = lista.filter(c => c.data_prevista);

  el('page').innerHTML = `
    <div class="g4">
      ${kpiHTML({l:'Na pauta', v:num(cs.length), d:`${num(cs.filter(c=>c.status==='ideia').length)} ainda são ideia`})}
      ${kpiHTML({l:'Em produção', v:num(cs.filter(c=>c.status==='design'||c.status==='edicao').length), d:'design e edição'})}
      ${kpiHTML({l:'Agendados', v:num(cs.filter(c=>c.status==='agendado').length), d:'com data marcada'})}
      ${kpiHTML({l:'Aprovados', v:num(cs.filter(c=>c.aprovado).length), d:'prontos para publicar', c:'var(--verde2)'})}
    </div>

    <div style="display:flex;align-items:center;gap:12px">
      <span class="per" style="gap:6px;flex:1;flex-wrap:wrap">
        ${[['todos','Todos']].concat(Object.keys(STATUS).map(k=>[k,STATUS[k][0]]))
          .map(([k,l])=>`<span class="${filtro===k?'on':''}" data-fc="${k}">${l}</span>`).join('')}
      </span>
      ${editar?'<button class="btn btn-sm" id="ct-nova">+ Conteúdo</button>':''}
    </div>

    ${comData.length ? `<div class="card card-p">
      <div class="tt" style="margin-bottom:12px">Calendário</div>
      <div class="ct-cal">${comData.map(c=>cardConteudo(c)).join('')}</div>
    </div>` : ''}

    ${semData.length ? `<div class="card card-p">
      <div class="tt" style="margin-bottom:4px">Sem data — banco de ideias</div>
      <div class="st" style="margin-bottom:12px">Registre agora, agende depois.</div>
      <div class="ct-cal">${semData.map(c=>cardConteudo(c)).join('')}</div>
    </div>` : ''}

    ${!lista.length ? '<div class="card"><div class="vazio">Nada nesta lista ainda.</div></div>' : ''}`;

  document.querySelectorAll('[data-fc]').forEach(x => x.onclick = () => { ST.filtroConteudo=x.dataset.fc; pgConteudo(); });
  if(editar) el('ct-nova').onclick = () => modalConteudo(null);
  document.querySelectorAll('[data-conteudo]').forEach(c => c.onclick = ev => {
    if(ev.target.closest('[data-acao]')) return;
    modalConteudo(D.conteudo.find(x=>x.id===c.dataset.conteudo));
  });
  document.querySelectorAll('[data-acao="aprovar"]').forEach(b => b.onclick = async () => {
    const c = D.conteudo.find(x=>x.id===b.dataset.id);
    const novo = !c.aprovado;
    const { error } = await sb.from('adm_conteudo').update({
      aprovado: novo, aprovado_em: novo? new Date().toISOString() : null,
      aprovado_por: novo? (await sb.auth.getUser()).data.user.id : null
    }).eq('id', c.id);
    if(error) return toast(erroMsg(error), true);
    registrar(novo?'conteudo.aprovar':'conteudo.desaprovar', c.titulo);
    toast(novo?'Aprovado.':'Aprovação retirada.'); pgConteudo();
  });
}

function cardConteudo(c){
  const [canal, cor] = CANAIS[c.canal] || ['—','#666'];
  const [rot, tag] = STATUS[c.status] || ['—','t-dim'];
  const img = c.midia_url && c.midia_tipo==='imagem';
  const vid = c.midia_url && c.midia_tipo==='video';
  return `<div class="ct-card" data-conteudo="${c.id}">
    <div class="ct-mid">
      ${img ? `<img src="${h(c.midia_url)}" alt="">`
        : vid ? `<video src="${h(c.midia_url)}" muted playsinline preload="metadata"></video>`
        : c.midia_url ? `<span class="ct-link">🔗 link externo</span>`
        : `<span class="ct-vazio">sem arte ainda</span>`}
      ${c.aprovado?'<span class="ct-ok">✓ aprovado</span>':''}
    </div>
    <div class="ct-corpo">
      <div style="display:flex;align-items:center;gap:6px">
        <i style="width:8px;height:8px;border-radius:99px;background:${cor};flex:none"></i>
        <small style="font-size:11px;color:var(--dim2)">${canal}</small>
        <span class="tag ${tag}" style="margin-left:auto;font-size:10px">${rot}</span>
      </div>
      <b style="font-size:13px;line-height:1.35">${h(c.titulo)}</b>
      ${c.descricao?`<div class="ct-desc">${h(c.descricao)}</div>`:''}
      <div style="display:flex;align-items:center;gap:8px;margin-top:auto">
        <span class="mono" style="font-size:11px;color:${c.data_prevista?'var(--dim)':'var(--dim3)'}">
          ${c.data_prevista?dmy(c.data_prevista):'sem data'}</span>
        <span style="margin-left:auto;display:flex;gap:8px">
          ${c.midia_url?`<a class="link" style="font-size:11.5px" href="${h(c.midia_url)}"
             target="_blank" rel="noopener" download data-acao="baixar">Baixar</a>`:''}
          <span class="link" style="font-size:11.5px;color:${c.aprovado?'var(--dim3)':'var(--verde2)'}"
                data-acao="aprovar" data-id="${c.id}">${c.aprovado?'Desfazer':'Aprovar'}</span>
        </span>
      </div>
    </div>
  </div>`;
}

function modalConteudo(c){
  const novo = !c;
  c = c || { canal:'youtube', titulo:'', descricao:'', midia_url:'', midia_tipo:'link',
             status:'ideia', data_prevista:'', aprovado:false };
  abrirModal(`
    <h3>${novo?'Nova ideia de conteúdo':h(c.titulo)}</h3>
    <div class="col">
      ${novo?`<div class="st" style="line-height:1.6">Só título e canal bastam para salvar. O resto entra
        depois, editando este mesmo card.</div>`:''}
      <div class="g2" style="gap:12px">
        <label class="f">Canal<select class="f" id="ct-canal">
          ${Object.keys(CANAIS).map(k=>`<option value="${k}" ${k===c.canal?'selected':''}>${CANAIS[k][0]}</option>`).join('')}
        </select></label>
        <label class="f">Status<select class="f" id="ct-status">
          ${Object.keys(STATUS).map(k=>`<option value="${k}" ${k===c.status?'selected':''}>${STATUS[k][0]}</option>`).join('')}
        </select></label>
      </div>
      <label class="f">Título<input class="f" id="ct-titulo" value="${h(c.titulo)}" placeholder="Ex.: Como subir da Série D em 3 temporadas"></label>
      <label class="f">Descrição / roteiro<textarea class="f" id="ct-desc" rows="4"
        placeholder="A ideia, o ângulo, o que precisa aparecer">${h(c.descricao||'')}</textarea></label>

      <div class="g2" style="gap:12px">
        <label class="f">Tipo da mídia<select class="f" id="ct-tipo">
          ${[['imagem','Imagem'],['video','Vídeo'],['link','Link (Drive, etc.)']].map(([k,l])=>
            `<option value="${k}" ${k===c.midia_tipo?'selected':''}>${l}</option>`).join('')}
        </select></label>
        <label class="f">Data prevista<input class="f" id="ct-data" type="date" value="${c.data_prevista||''}"></label>
      </div>
      <label class="f">URL da mídia
        <input class="f" id="ct-url" value="${h(c.midia_url||'')}" placeholder="https://… ou envie um arquivo"></label>
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn btn-sm btn-ghost" id="ct-up-btn">Enviar arquivo (até 25 MB)</button>
        <input type="file" id="ct-up" accept="image/*,video/*" style="display:none">
        <span id="ct-prev"></span>
      </div>

      <div class="erro hide" id="ct-erro"></div>
      <div class="acoes">
        <button class="btn" id="ct-ok">${novo?'Salvar ideia':'Salvar'}</button>
        ${!novo?`<button class="btn btn-ghost" id="ct-del" style="flex:0 0 auto;color:var(--vermelho)">Apagar</button>`:''}
        <button class="btn btn-ghost" data-fechar>Fechar</button>
      </div>
    </div>`, 'lg');

  el('ct-up-btn').onclick = () => el('ct-up').click();
  el('ct-up').onchange = async () => {
    const f = el('ct-up').files[0]; if(!f) return;
    const erro = el('ct-erro');
    if(f.size > 25*1024*1024){ erro.textContent='Arquivo acima de 25 MB.'; erro.classList.remove('hide'); return; }
    el('ct-up-btn').disabled = true; el('ct-up-btn').textContent = 'Enviando…';
    const ext = (f.name.split('.').pop()||'bin').toLowerCase();
    const caminho = `${Date.now()}-${chaveNome(f.name).slice(0,20)}.${ext}`;
    const up = await sb.storage.from('conteudo').upload(caminho, f, { upsert:false, cacheControl:'3600' });
    el('ct-up-btn').disabled = false; el('ct-up-btn').textContent = 'Enviar arquivo (até 25 MB)';
    if(up.error){ erro.textContent = erroMsg(up.error); erro.classList.remove('hide'); return; }
    const url = sb.storage.from('conteudo').getPublicUrl(caminho).data.publicUrl;
    el('ct-url').value = url;
    el('ct-tipo').value = /^video\//.test(f.type) ? 'video' : 'imagem';
    el('ct-prev').innerHTML = /^video\//.test(f.type)
      ? `<video src="${h(url)}" style="height:34px" muted></video>`
      : `<img src="${h(url)}" style="height:34px;border-radius:4px">`;
    toast('Arquivo enviado — salve para valer.');
  };

  el('ct-ok').onclick = async () => {
    const erro = el('ct-erro');
    const titulo = el('ct-titulo').value.trim();
    if(!titulo){ erro.textContent='O título é obrigatório.'; erro.classList.remove('hide'); return; }
    const linha = {
      canal: el('ct-canal').value, status: el('ct-status').value, titulo,
      descricao: el('ct-desc').value.trim()||null,
      midia_url: el('ct-url').value.trim()||null,
      midia_tipo: el('ct-tipo').value,
      data_prevista: el('ct-data').value || null,
      atualizado_em: new Date().toISOString()
    };
    let r;
    if(novo){
      linha.criado_por = (await sb.auth.getUser()).data.user.id;
      r = await sb.from('adm_conteudo').insert(linha);
    } else {
      r = await sb.from('adm_conteudo').update(linha).eq('id', c.id);
    }
    if(r.error){ erro.textContent = erroMsg(r.error); erro.classList.remove('hide'); return; }
    registrar(novo?'conteudo.criar':'conteudo.editar', titulo, { canal: linha.canal, status: linha.status });
    fecharModal(); toast(novo?'Ideia registrada.':'Conteúdo salvo.'); pgConteudo();
  };
  if(!novo) el('ct-del').onclick = async () => {
    if(!confirm(`Apagar "${c.titulo}"?`)) return;
    const { error } = await sb.from('adm_conteudo').delete().eq('id', c.id);
    if(error) return toast(erroMsg(error), true);
    registrar('conteudo.apagar', c.titulo);
    fecharModal(); toast('Conteúdo apagado.'); pgConteudo();
  };
}

/* ============================================================================
   ESTÚDIO DE IMAGENS (IA)
   ----------------------------------------------------------------------------
   Gera, via OpenAI (edge function generate-image), duas coisas:
   · ESCUDOS fictícios para substituir os escudos reais — o resultado entra no
     patch em edição como `crest`, o MESMO campo que o jogo já aplica hoje;
   · FOTOS realistas de jogador, variando cabelo, pele, barba, sorriso, brinco
     e tatuagem conforme a idade do elenco. Ficam em elifoot_v3.player_photos
     (fora do patch de propósito: salvar o clube no editor reescreve o patch
     inteiro, e as fotos não podem se perder nesse movimento).
   A chave da OpenAI mora nos secrets do Supabase — o browser nunca a vê.
   ============================================================================ */

/* imagem em tela expandida, POR CIMA do modal que estiver aberto — não usa
   abrirModal de propósito: ele substituiria o modal de fotos/escudo em curso.
   Esc fecha só o lightbox (captura + stopImmediatePropagation, senão o Esc
   também derrubaria o modal de trás). */
function abrirLightboxHTML(miolo){
  const lb = document.createElement('div');
  lb.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000d;display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:24px';
  lb.innerHTML = `${miolo}
    <span style="position:absolute;top:14px;right:20px;font-size:26px;color:#fff9;line-height:1">✕</span>`;
  const fechar = () => { lb.remove(); document.removeEventListener('keydown', esc, true); };
  const esc = (e) => { if(e.key==='Escape'){ e.stopImmediatePropagation(); fechar(); } };
  lb.onclick = fechar;
  document.addEventListener('keydown', esc, true);
  document.body.appendChild(lb);
}
function abrirLightbox(url, alt){
  abrirLightboxHTML(`<img src="${h(url)}" alt="${h(alt||'')}" style="max-width:92vw;max-height:92vh;object-fit:contain;border-radius:12px;box-shadow:0 20px 60px #000">`);
}

/* Remove o fundo SÓLIDO de um logo no próprio navegador: pega a cor dos cantos
   e apaga, por inundação a partir das bordas, tudo que estiver perto dela.
   Inundação (e não "apagar toda cor parecida") de propósito: um P branco DENTRO
   do escudo não encosta na borda, então sobrevive. Devolve PNG com alfa. */
async function removerFundoDeImagem(arquivo){
  const url = URL.createObjectURL(arquivo);
  try{
    const img = await new Promise((ok, erro) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = () => erro(new Error('Não consegui ler a imagem.')); i.src = url;
    });
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const dados = cx.getImageData(0, 0, W, H), px = dados.data;
    const cantos = [0, (W-1)*4, (H-1)*W*4, ((H-1)*W + W-1)*4];
    const bg = [0,1,2].map(k => Math.round(cantos.reduce((a,i)=>a+px[i+k],0)/4));
    const TOL = 120;  // soma das diferenças RGB — pega branco sujo e jpeg comprimido
    const eFundo = i => px[i+3] !== 0 &&
      (Math.abs(px[i]-bg[0]) + Math.abs(px[i+1]-bg[1]) + Math.abs(px[i+2]-bg[2])) <= TOL;
    const fila = [], visto = new Uint8Array(W*H);
    for(let x=0; x<W; x++){ fila.push(x, (H-1)*W + x); }
    for(let y=0; y<H; y++){ fila.push(y*W, y*W + W-1); }
    while(fila.length){
      const p = fila.pop();
      if(visto[p]) continue; visto[p] = 1;
      const i = p*4;
      if(!eFundo(i)) continue;
      px[i+3] = 0;
      const x = p%W, y = (p/W)|0;
      if(x>0) fila.push(p-1); if(x<W-1) fila.push(p+1);
      if(y>0) fila.push(p-W); if(y<H-1) fila.push(p+W);
    }
    cx.putImageData(dados, 0, 0);
    return await new Promise(ok => cv.toBlob(ok, 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

/* chama a edge function e devolve a URL pública da imagem já no Storage.
   `imagens` (opcional) alimenta a montagem: URLs do nosso Storage que a função
   manda para a OpenAI como imagens de entrada (images/edits). */
/* ===== pílula de progresso: enquanto qualquer geração está no ar, uma pílula
   fixa no rodapé diz a etapa e o tempo decorrido. Várias em paralelo somam. ===== */
const IA_ROTULOS = {
  escudo:   'Desenhando o escudo…',
  torso:    'Gerando o uniforme…',
  rosto:    'Gerando o rosto do jogador…',
  jogador:  'Gerando a foto do jogador…',
  montagem: 'Costurando rosto e uniforme…'
};
const IA_FILA = [];   // rótulos das gerações em andamento
let iaTimer = null;
function iaDesenha(){
  let p = el('ia-status');
  if(!IA_FILA.length){
    if(p) p.remove();
    if(iaTimer){ clearInterval(iaTimer); iaTimer = null; }
    return;
  }
  if(!p){
    p = document.createElement('div'); p.id = 'ia-status';
    document.body.appendChild(p);
  }
  const atual = IA_FILA[IA_FILA.length-1];
  const seg = Math.round((Date.now()-atual.inicio)/1000);
  p.innerHTML = `<span class="giro"></span><span>${h(atual.rotulo)}</span>
    <small>${seg}s · normalmente até 1 min${IA_FILA.length>1?` · ${IA_FILA.length} na fila`:''}</small>`;
}
function iaComeca(rotulo){
  const item = { rotulo, inicio: Date.now() };
  IA_FILA.push(item);
  iaDesenha();
  if(!iaTimer) iaTimer = setInterval(iaDesenha, 1000);
  return item;
}
function iaTermina(item){
  const ix = IA_FILA.indexOf(item);
  if(ix >= 0) IA_FILA.splice(ix, 1);
  iaDesenha();
}

/* caminho organizado no Storage: pais/divisao/clube — os arquivos do clube
   ficam juntos e com nome legível (o sufixo de tempo evita colisão) */
function caminhoClube(item){
  return [chaveNome(item.pais)||'outro',
          'divisao-'+(chaveNome(String(item.div))||'x'),
          chaveNome(item.c.short||item.c.name)||String(item.c.id).toLowerCase()].join('/');
}

async function gerarImagemIA(tipo, prompt, qualidade, imagens, nome){
  const carga = iaComeca(IA_ROTULOS[tipo] || 'Gerando imagem…');
  try{
    const { data, error } = await sb.functions.invoke('generate-image',
      { body:{ tipo, prompt, qualidade: qualidade||'medium', imagens, nome } });
    if(error){
      let msg = error.message || 'Falha ao gerar a imagem.';
      try{ const j = await error.context.json(); if(j && j.error) msg = j.error; }catch(_e){}
      throw new Error(msg);
    }
    if(!data || !data.url) throw new Error((data && data.error) || 'A função não devolveu imagem.');
    return data.url;
  } finally { iaTermina(carga); }
}

const ESTILOS_ESCUDO = [
  ['classico',  'Brasão clássico brasileiro', 'classic Brazilian football club crest, traditional shield shape, bold outlines, vintage 1990s style'],
  ['europeu',   'Tradicional europeu',        'traditional European football club crest, ornate shield with laurel or star details, classic heraldic style'],
  ['moderno',   'Moderno minimalista',        'modern minimalist football club badge, clean geometric shapes, flat design, simple and bold'],
  ['retro',     'Retrô vintage',              'retro vintage football club badge, distressed classic look, circular or shield layout, old-school typography'],
  ['varzea',    'Várzea raiz',                'humble amateur Brazilian neighborhood football club crest, simple hand-drawn feel, honest and charming']
];

function promptEscudo(c, estiloChave, simbolo, texto, extra){
  const est = (ESTILOS_ESCUDO.find(e=>e[0]===estiloChave) || ESTILOS_ESCUDO[0])[2];
  return [
    `Football club crest logo for a fictional club, ${est}.`,
    `Primary color ${c.color||'#1b7a3d'}, secondary color ${c.color2||'#ffffff'}.`,
    simbolo ? `Main symbol: ${simbolo}.` : 'Main symbol: a football (soccer ball) integrated into the design.',
    texto ? `The short text "${texto}" integrated into the crest, legible.` : 'No text or lettering at all.',
    'Flat vector illustration style, sharp clean edges, centered composition, transparent background.',
    'Must NOT resemble any real existing football club crest or trademark. No mockup, no 3D, no photo.',
    extra || ''
  ].filter(Boolean).join(' ');
}

/* variação da foto: sorteio honesto — é o que dá cara diferente a cada jogador */
const FOTO_POOL = {
  pele:    ['very light skin','light skin','medium tan skin','light brown skin','brown skin','dark brown skin','black skin'],
  cabelo:  ['buzz cut','short fade haircut','curly top fade','medium curly hair','afro hair','short dreadlocks','slicked back hair','messy short hair','mullet haircut','completely bald head'],
  corCab:  ['black','black','dark brown','brown','bleached blond','dyed platinum blond'],
  barba:   ['clean-shaven','clean-shaven','light stubble','full short beard','goatee','thin mustache'],
  sorriso: ['neutral serious expression','neutral serious expression','confident slight smile','big friendly smile'],
  brinco:  ['no earrings','no earrings','no earrings','a small stud earring in one ear','small diamond earrings in both ears'],
  tattoo:  ['no visible tattoos','no visible tattoos','no visible tattoos','a small tattoo visible on the neck','tattoos partially visible on the arm']
};
function sortearAtributos(p){
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const at = {
    idade: (p && p.age) || (18+Math.floor(Math.random()*17)),
    pele: pick(FOTO_POOL.pele), cabelo: pick(FOTO_POOL.cabelo), corCab: pick(FOTO_POOL.corCab),
    barba: pick(FOTO_POOL.barba), sorriso: pick(FOTO_POOL.sorriso),
    brinco: pick(FOTO_POOL.brinco), tattoo: pick(FOTO_POOL.tattoo)
  };
  if(at.idade < 21){ at.barba = Math.random()<0.7 ? 'clean-shaven' : 'light stubble'; }
  if(/bald/.test(at.cabelo)) at.corCab = '';
  return at;
}
function resumoAtributos(at){
  const t = {
    'very light skin':'pele muito clara','light skin':'pele clara','medium tan skin':'pele morena',
    'light brown skin':'pele parda','brown skin':'pele castanha','dark brown skin':'pele escura','black skin':'pele negra',
    'buzz cut':'raspado','short fade haircut':'fade curto','curly top fade':'crespo com fade','medium curly hair':'cacheado',
    'afro hair':'black power','short dreadlocks':'dreads','slicked back hair':'penteado pra trás','messy short hair':'despenteado',
    'mullet haircut':'mullet','completely bald head':'careca',
    'clean-shaven':'sem barba','light stubble':'barba rala','full short beard':'barba cheia','goatee':'cavanhaque','thin mustache':'bigode',
    'neutral serious expression':'sério','confident slight smile':'meio sorriso','big friendly smile':'sorridente',
    'no earrings':'sem brinco','a small stud earring in one ear':'brinco','small diamond earrings in both ears':'2 brincos',
    'no visible tattoos':'sem tattoo','a small tattoo visible on the neck':'tattoo no pescoço','tattoos partially visible on the arm':'tattoo no braço',
    'black':'preto','dark brown':'castanho escuro','brown':'castanho','bleached blond':'loiro descolorido','dyed platinum blond':'platinado'
  };
  const tr = s => t[s]||s;
  return [at.idade+' anos', tr(at.pele), tr(at.cabelo)+(at.corCab?' '+tr(at.corCab):''),
          tr(at.barba), tr(at.sorriso), tr(at.brinco), tr(at.tattoo)].join(' · ');
}
/* A FOTO É EM DUAS CAMADAS, de propósito:
   · ROSTO (cabeça+pescoço, recortado em fundo transparente) — um por jogador;
   · TORSO (a camisa do clube, sem cabeça) — UM por clube, a base única.
   A imagem final é a sobreposição rosto-sobre-torso. É o que faz a troca de
   clube ser automática: muda a base, o rosto é o mesmo — sem gerar nada. */
function promptRosto(item, p, at){
  const pais = item.pais==='Brasil' ? 'Brazil' : item.pais;
  const cab = /bald/.test(at.cabelo) ? at.cabelo : `${at.cabelo}, ${at.corCab} hair`;
  return [
    `Hyper-realistic studio photograph cutout: ONLY the head and neck of a fictional professional football player from ${pais}, isolated on a fully transparent background.`,
    `${at.idade} years old, ${at.pele}, ${cab}, ${at.barba}, ${at.sorriso}, ${at.brinco}, ${at.tattoo}.`,
    'Facing the camera directly, official club media day photo style, soft professional studio lighting, sharp focus, DSLR quality.',
    'The cutout ends in a clean straight cut at the base of the neck — NO shoulders, NO clothing, NO jersey, NO collar, NO background, nothing besides the head and neck.',
    'Head centered horizontally, sized so head plus neck fill about 75% of the frame height, positioned in the upper part of the frame.',
    'This is a completely fictional person, not resembling any real footballer or celebrity.'
  ].join(' ');
}
/* os 5 estilos de camisa — a variedade visual do jogo nasce aqui. Cada entrada
   vira a frase da camisa dentro do prompt, sempre a partir das cores do clube. */
const ESTILOS_CAMISA = [
  ['vertical',  'Listras verticais',        (a,b)=>`a football jersey with classic vertical stripes in ${a} and ${b} — stripes of EQUAL width, evenly spaced, perfectly symmetrical, covering the ENTIRE jersey from the left side seam to the right side seam`],
  ['horizontal','Listras horizontais',      (a,b)=>`a football jersey with wide horizontal hoops in ${a} and ${b} — hoops of EQUAL height, evenly spaced, running straight across the ENTIRE jersey and both sleeves`],
  ['mangas',    'Lisa + mangas/gola',       (a,b)=>`a plain ${a} football jersey with BOTH sleeves entirely in ${b} and the collar in ${b}, clean color blocking`],
  ['diagonal',  'Faixa diagonal',           (a,b)=>`a plain ${a} football jersey with ONE single wide ${b} diagonal sash crossing the ENTIRE chest corner to corner — starting at the wearer's right shoulder seam and reaching the left bottom hem, edge to edge`],
  ['lisa',      'Cor única',                (a,b)=>`a plain solid ${a} football jersey with no secondary color`]
];
function promptTorso(item, estiloChave, corA, corB){
  const c = item.c;
  const est = ESTILOS_CAMISA.find(e=>e[0]===estiloChave) || ESTILOS_CAMISA[0];
  const camisa = est[2](corA||c.color||'#1b7a3d', corB||c.color2||'#ffffff');
  return [
    'Hyper-realistic studio photograph of the torso of a male professional football player, WITHOUT the head — the frame is cropped just below the chin, no face, no head visible at all.',
    `Wearing ${camisa}.`,
    'The jersey is COMPLETELY CLEAN: no club crest, no badge, no sponsor, no text, no logos anywhere — plain fabric only, because the club crest and the sponsor logo will be overlaid later as separate layers.',
    'Shoulders and chest framing, facing the camera directly, official club media day photo style.',
    'FRAMING IS FIXED (this exact layout is required): PORTRAIT 2:3 frame; the jersey occupies ONLY the lower 60% of the frame — the collar sits at 40% from the top, neckline centered horizontally — and the upper 40% of the frame is NOTHING but plain light gray studio background, left empty where the head would be in an official chest-up portrait.',
    'Soft professional studio lighting, sharp focus, DSLR photo quality.'
  ].join(' ');
}
/* a MONTAGEM IA costura rosto + uniforme numa foto só (images/edits com as duas
   imagens de entrada) — é ela que fica realmente natural. As camadas CSS seguem
   como prévia barata; a montagem salva em atributos.montagem é a foto final. */
function promptMontagem(){
  return [
    'Combine the two input images into ONE photorealistic official club media day portrait:',
    'the FIRST image is the torso with the football jersey, the SECOND image is the player\'s head.',
    'Attach that EXACT head (same face, same hair, same skin tone, do not change the identity) naturally onto the torso:',
    'correct head size and position for the body, seamless neck-to-collar transition, unified soft studio lighting and color grading.',
    'CRITICAL: do NOT move, scale, crop or reframe the jersey — it must stay in EXACTLY the same position and size as in the first image, pixel-aligned, same pattern and colors, completely clean (no crest, sponsor, text or logos added).',
    'The head goes into the empty background space ABOVE the collar, where the first image is blank — the final framing is identical to the first image, just with the head filled in.',
    'Plain light gray studio background, facing the camera, sharp focus, DSLR quality.'
  ].join(' ');
}
const TORSO_KEY = '__torso__';   // linha especial de player_photos: a camisa do clube

/* VISÃO "SÓ UNIFORME": a MESMA imagem canônica (camisa nos 60% de baixo, vazio
   em cima onde entra a cabeça), só que com zoom na área da camisa. Uma imagem,
   um conjunto de posições — cada uso escolhe o recorte. */
function compostoCropHTML(torsoUrl, px, raio, camadas){
  /* recorte quadrado px×px mostrando a área da camisa (os 60% de baixo do
     retrato 2:3): mesma imagem, mesmas posições — só o zoom muda */
  const innerW = Math.round(px / 0.9);
  const innerH = Math.round(innerW * RATIO_FOTO);
  return `<span style="display:inline-block;width:${px}px;height:${px}px;border-radius:${raio!=null?raio:8}px;overflow:hidden;position:relative;background:#d9d9d9">
    <span style="position:absolute;left:${Math.round((px-innerW)/2)}px;top:${-Math.round(innerH*0.4)}px">
      ${compostoHTML(torsoUrl, null, innerW, 0, camadas)}
    </span></span>`;
}

/* garante o molde de um estilo: devolve o existente ou gera UMA vez por IA
   (ancorado na referência quando há) e grava. Usado pelo wizard e pela
   repintura em massa. */
async function garantirMolde(item, estilo){
  let molde = D.fotos[MOLDE_KEY+'|'+estilo];
  if(molde) return molde;
  /* SEMPRE do zero: gerar por edição da referência "remenda" o desenho (faixa
     que não atravessa, listras tortas e assimétricas). O enquadramento fica por
     conta do prompt do torso, que já trava corte, pose e fundo. */
  const urlMolde = await gerarImagemIA('torso', promptTorso(item, estilo,
    'pure flat saturated magenta (#FF00FF)', 'pure flat saturated cyan (#00FFFF)') + AVISO_MARCADOR, 'medium',
    null, 'moldes/uniforme-'+estilo);
  molde = { pack_id: ST.packId, club_id: MOLDE_KEY, jogador: estilo, url: urlMolde, atributos:{ recorte:'molde', estilo } };
  const rM = await jogo('player_photos').upsert(molde, { onConflict:'pack_id,club_id,jogador' });
  if(rM.error) throw new Error(erroMsg(rM.error));
  D.fotos[MOLDE_KEY+'|'+estilo] = molde;
  return molde;
}

/* MINIATURA DA CAMISA: só a camisa (sem corpo, sem escudo), fundo transparente —
   para o campo e as páginas do clube. Mesmo esquema do uniforme: um molde de
   miniatura por estilo (IA 1x, magenta/ciano via tipo 'rosto', que é o
   transparente) e pintura local por clube, de graça. */
function promptMiniCamisa(estilo){
  const camisa = descrCamisa(estilo, 'pure flat saturated magenta (#FF00FF)', 'pure flat saturated cyan (#00FFFF)');
  return [
    'Product photograph of ONLY a football jersey — no person, no body, no mannequin, no hanger visible.',
    `The jersey is ${camisa}.`,
    'Front view, short sleeves spread naturally, ghost-mannequin style, centered, filling most of the frame.',
    'Completely clean jersey: no crest, no badge, no sponsor, no text, no logos.',
    'Isolated cutout on a fully transparent background, soft even studio lighting, sharp focus.'
  ].join(' ') + AVISO_MARCADOR;
}
async function garantirMoldeMini(estilo){
  const chave = 'mini-'+estilo;
  let molde = D.fotos[MOLDE_KEY+'|'+chave];
  if(molde) return molde;
  const url = await gerarImagemIA('rosto', promptMiniCamisa(estilo), 'medium', null, 'moldes/miniatura-'+estilo);
  molde = { pack_id: ST.packId, club_id: MOLDE_KEY, jogador: chave, url, atributos:{ recorte:'molde-mini', estilo } };
  const r = await jogo('player_photos').upsert(molde, { onConflict:'pack_id,club_id,jogador' });
  if(r.error) throw new Error(erroMsg(r.error));
  D.fotos[MOLDE_KEY+'|'+chave] = molde;
  return molde;
}

/* repinta TODOS os uniformes de molde do patch com os moldes atuais — gera os
   moldes que faltarem (IA, 1x por estilo) e o resto é pintura local, grátis.
   É o botão de virada quando a pintura ou os moldes melhoram. */
async function repintarTodosUniformes(btn){
  const alvos = [];
  for(const x of (D.catalogo||[])){
    const t = D.fotos[x.c.id+'|'+TORSO_KEY];
    if(t && t.atributos && t.atributos.molde && t.atributos.estilo && t.atributos.cores) alvos.push({ x, t });
  }
  if(!alvos.length) return toast('Nenhum uniforme de molde para repintar.', true);
  const estilos = Array.from(new Set(alvos.map(a=>a.t.atributos.estilo)));
  const faltam = estilos.filter(e => !D.fotos[MOLDE_KEY+'|'+e]);
  if(!confirm(`Repintar ${alvos.length} uniformes com os moldes atuais?`+
    (faltam.length?` ${faltam.length} molde(s) serão gerados por IA antes (~US$ ${(faltam.length*0.04).toFixed(2)}).`:' Sem custo — é tudo pintura local.')+
    ' As posições salvas de escudo/patrocínio são preservadas.')) return;
  btn.disabled = true; const rot = btn.textContent;
  let ok=0, erros=0;
  try{
    for(const e of faltam){
      btn.textContent = `Gerando molde ${e}…`;
      await garantirMolde(alvos[0].x, e);
    }
    for(const { x, t } of alvos){
      btn.textContent = `Repintando ${ok+erros+1}/${alvos.length}…`;
      try{
        const molde = D.fotos[MOLDE_KEY+'|'+t.atributos.estilo];
        const blob = await pintarMolde(molde.url, t.atributos.cores[0], t.atributos.cores[1]);
        const caminho = `${caminhoClube(x)}/uniforme-${Date.now()}.webp`;
        const up = await sb.storage.from('jogadores').upload(caminho, blob, { upsert:false, cacheControl:'31536000' });
        if(up.error) throw new Error(up.error.message);
        const reg = Object.assign({}, t, { url: sb.storage.from('jogadores').getPublicUrl(caminho).data.publicUrl });
        const r = await jogo('player_photos').upsert(reg, { onConflict:'pack_id,club_id,jogador' });
        if(r.error) throw new Error(r.error.message);
        D.fotos[x.c.id+'|'+TORSO_KEY] = reg;
        ok++;
      }catch(err){ erros++; console.warn('repintura falhou:', x.c.id, err.message); }
    }
    registrar('estudio.uniformes.repintar', String(ok), { pacote: ST.packId, falhas: erros });
    toast(`Repintados ${ok} uniformes${erros?`, ${erros} falharam`:''}.`);
  }catch(err){ toast(err.message||'Falha na repintura.', true); }
  btn.disabled = false; btn.textContent = rot;
  pgEstudio();
}
const MOLDE_KEY = '__molde__';   // "clube" especial: um molde de uniforme por ESTILO

/* CONSISTÊNCIA DOS UNIFORMES: o primeiro molde gerado é a REFERÊNCIA de
   enquadramento. Todo molde/camisa seguinte nasce como EDIÇÃO dessa foto
   ("mantenha tudo idêntico, mude só o desenho da camisa") — corpo, pose, corte
   e luz iguais em todos, em vez de cada geração sortear um enquadramento. */
function moldeReferencia(){
  for(const k of Object.keys(D.fotos||{}))
    if(k.startsWith(MOLDE_KEY+'|')) return D.fotos[k];
  return null;
}
function descrCamisa(estilo, corA, corB){
  const est = ESTILOS_CAMISA.find(e=>e[0]===estilo) || ESTILOS_CAMISA[0];
  return est[2](corA, corB);
}
function promptCamisaNaReferencia(camisa){
  return [
    'Edit the input photo. Keep EVERYTHING else IDENTICAL — the same headless male torso, the same pose, the same framing and crop (head cropped out just below the chin, no face visible, no shorts, chest-up only), the same soft studio lighting and the same plain light gray background.',
    `ONLY change the football jersey to: ${camisa}.`,
    'The jersey stays completely clean: no crest, no badge, no sponsor, no text, no logos anywhere.'
  ].join(' ');
}
const AVISO_MARCADOR = ' The magenta and cyan are PLACEHOLDER colors for programmatic recoloring: keep them pure, flat and vivid, with shading coming only from fabric folds and lighting. The collar and the sleeve cuffs MUST also be one of these two placeholder colors (cyan preferred) — absolutely NO navy, NO gray and NO third color anywhere on the jersey. Every stripe and section must be ONE single uninterrupted solid color from edge to edge — absolutely NO patches, NO spots and NO bleeding of one placeholder color inside an area of the other.';

/* PINTURA SEM IA: o molde do estilo é gerado UMA vez em cores-marcador (magenta
   #FF00FF na principal, ciano #00FFFF na secundária) e daqui pra frente cada
   clube só REPINTA o molde no navegador — magenta vira a cor principal, ciano a
   secundária, preservando a sombra do tecido (luminância). Zero token por clube. */
function hex2rgb(hx){
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hx||''));
  const n = parseInt(m ? m[1] : '1b7a3d', 16);
  return [n>>16&255, n>>8&255, n&255];
}
async function pintarMolde(moldeUrl, corA, corB){
  const img = await new Promise((ok, erro) => {
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => ok(i); i.onerror = () => erro(new Error('Não consegui carregar o molde.'));
    /* o sufixo evita pegar do cache uma resposta sem cabeçalho CORS (que
       mancharia o canvas); data: URLs não têm query e vão como estão */
    i.src = /^https?:/.test(moldeUrl) ? moldeUrl + (moldeUrl.includes('?') ? '&' : '?') + 'cors=1' : moldeUrl;
  });
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, W, H), px = d.data;
  const A = hex2rgb(corA), B = hex2rgb(corB);
  /* Classificação por MATIZ, não por canal: na sombra o magenta do molde desvia
     para roxo/vinho e o ciano para azul-petróleo — a faixa larga de matiz pega
     essas variações inteiras (era o que deixava a mancha roxa). Pele (~25°),
     fundo cinza (croma baixo) e gola azul-marinho (~220°) ficam fora das faixas. */
  /* Faixas LARGAS e peso duro: tudo que é da família fria (ciano→azul-marinho,
     148°–262°, gola e punho inclusive) vira a cor secundária, e da família quente
     (roxo→magenta→vinho, 262°–352°) vira a principal. O peso sobe rápido — pixel
     colorido converte INTEIRO em vez de ficar meio convertido (era o chuvisco nas
     bordas). A sombra é só nível: alvo × luminância, sem matiz residual. */
  for(let i = 0; i < px.length; i += 4){
    const r = px[i], g = px[i+1], b = px[i+2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), croma = mx - mn;
    if(croma < 12) continue;                            // cinza/branco/preto: já é só nível
    let matiz;
    if(mx === r)      matiz = ((g - b) / croma * 60 + 360) % 360;
    else if(mx === g) matiz = (b - r) / croma * 60 + 120;
    else              matiz = (r - g) / croma * 60 + 240;
    let alvo = null;
    if(matiz >= 262 && matiz <= 352)      alvo = A;    // magenta, roxo sombreado, vinho
    else if(matiz >= 148 && matiz < 262)  alvo = B;    // ciano, petróleo, azul (gola/punho)
    if(!alvo) continue;                                 // pele (~10-50°) e cabelo ficam
    const w = Math.min(1, (croma - 12) / 14);
    const L = Math.min(1, mx / 240);                    // sombra = só claro/escuro
    px[i] += (alvo[0]*L - r)*w; px[i+1] += (alvo[1]*L - g)*w; px[i+2] += (alvo[2]*L - b)*w;
  }
  cx.putImageData(d, 0, 0);
  const blob = await new Promise(ok => cv.toBlob(ok, 'image/webp', 0.85));
  if(!blob) throw new Error('Falha ao exportar a pintura.');
  return blob;
}
/* miniatura/visual composto: a camisa por baixo, o rosto por cima. Os percentuais
   casam com o enquadramento pedido nos dois prompts — ajuste fino é aqui, num lugar só. */
/* posição padrão do logo do patrocinador — o ajuste fino por clube (drag and
   drop no Estúdio) fica salvo em atributos.patro do uniforme e vence o padrão */
const PATRO_POS_PADRAO  = { x:33, y:65, w:34 };  // left %, top %, largura % (altura acompanha)
const ESCUDO_POS_PADRAO = { x:61, y:56, w:14 };  // peito esquerdo do jogador na foto final
const RATIO_FOTO = 1.5;   // retrato 2:3 (1024x1536) — o formato do cartão do jogador no site
const FAB_POS_PADRAO = { x:27, y:57, w:9 };   // fabricante: lado oposto ao escudo, menor
function compostoHTML(torsoUrl, rostoUrl, px, raio, camadas){
  /* camadas, de baixo para cima: uniforme/foto final -> escudo -> fabricante ->
     patrocinador -> rosto. `camadas` = {patroUrl, escudoUrl, fabUrl, patro,
     escudo, fabricante}; posições arrastadas (✥/🛡) vencem os padrões — com o
     enquadramento canônico, os padrões já caem no lugar certo da camisa.
     Contêiner RETRATO 2:3 — px é a LARGURA; quadrada antiga aparece em cover. */
  const cm = camadas || {};
  const alt = Math.round(px*RATIO_FOTO);
  const pp = Object.assign({}, PATRO_POS_PADRAO,  cm.patro||{});
  const pe = Object.assign({}, ESCUDO_POS_PADRAO, cm.escudo||{});
  const pf = Object.assign({}, FAB_POS_PADRAO,    cm.fabricante||{});
  return `<span style="position:relative;display:inline-block;width:${px}px;height:${alt}px;border-radius:${raio!=null?raio:8}px;overflow:hidden;background:#d9d9d9">
    <img src="${h(torsoUrl)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
    ${cm.escudoUrl?`<img src="${h(cm.escudoUrl)}" style="position:absolute;left:${pe.x}%;top:${pe.y}%;width:${pe.w}%">`:''}
    ${cm.fabUrl?`<img src="${h(cm.fabUrl)}" style="position:absolute;left:${pf.x}%;top:${pf.y}%;width:${pf.w}%">`:''}
    ${cm.patroUrl?`<img src="${h(cm.patroUrl)}" style="position:absolute;left:${pp.x}%;top:${pp.y}%;width:${pp.w}%">`:''}
    ${rostoUrl?`<img src="${h(rostoUrl)}" style="position:absolute;left:50%;transform:translateX(-50%);top:-3%;height:72%;object-fit:contain">`:''}
  </span>`;
}

/* ---------- página ---------- */
async function pgEstudio(){
  try{ await carregarCatalogo(); }
  catch(e){ el('page').innerHTML = `<div class="erro">${h(e.message)}</div>`; return; }

  const packs = await jogo('data_packs').select('*').order('oficial', { ascending:false }).order('criado_em');
  if(packs.error) throw packs.error;
  D.packs = packs.data||[];
  if(!ST.packId || !D.packs.some(p=>p.id===ST.packId))
    ST.packId = (D.packs.find(p=>p.oficial)||D.packs[0]||{}).id;
  const pack = D.packs.find(p=>p.id===ST.packId);
  if(!pack){ el('page').innerHTML = '<div class="erro">Nenhum patch encontrado.</div>'; return; }

  const [eds, fotos] = await Promise.all([
    jogo('pack_edits').select('*').eq('pack_id', pack.id),
    jogo('player_photos').select('*').eq('pack_id', pack.id)
  ]);
  if(eds.error) throw eds.error;
  if(fotos.error) throw fotos.error;
  D.edits = {}; (eds.data||[]).forEach(e => { D.edits[e.club_id] = e; });
  D.fotos = {}; (fotos.data||[]).forEach(f => { D.fotos[f.club_id+'|'+f.jogador] = f; });

  const base = clubesDeFabrica();
  (eds.data||[]).filter(e => e.novo && e.club_id !== COMPETICOES_CHAVE).forEach(e => {
    if(!base.some(x => String(x.c.id)===String(e.club_id)))
      base.push({ div:e.divisao||'D', pais:(e.patch||{}).pais||'Brasil',
                  c:Object.assign({id:e.club_id}, e.patch||{}), criado:true });
  });
  D.catalogo = base;

  const aba = ST.abaEstudio || 'escudos';
  const busca = (ST.buscaEstudio||'').toLowerCase();
  const paisSel = ST.paisEstudio || 'todos';
  const paises = Array.from(new Set(base.map(x=>x.pais))).sort((a,b)=> a==='Brasil'?-1:b==='Brasil'?1:a.localeCompare(b,'pt-BR'));
  const lista = base.filter(x =>
    (paisSel==='todos' || x.pais===paisSel) &&
    (!busca || String(x.c.name||'').toLowerCase().includes(busca)
            || String(x.c.short||'').toLowerCase().includes(busca)
            || String(x.c.id).toLowerCase().includes(busca)));

  const fotosDoClube = (x) => (x.c.squad||[]).filter(p => D.fotos[x.c.id+'|'+p.n]).length;
  const uniformeDoClube = (x) => D.fotos[x.c.id+'|'+TORSO_KEY];
  const escudoIA = (x) => { const e=D.edits[x.c.id];
    return !!(e && e.patch && e.patch.crest && /\/escudos\/(ia\/|ia-|.*\/escudo-\d)/.test(e.patch.crest)); };
  const totalFotos = Object.keys(D.fotos).filter(k => !k.endsWith('|'+TORSO_KEY) && !k.startsWith(MOLDE_KEY+'|')).length;
  const totalEscudosIA = base.filter(escudoIA).length;

  el('page').innerHTML = `
    <div class="card card-p">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:240px">
          <div class="tt">Estúdio de imagens</div>
          <div class="st">Escudos fictícios (substituem os reais no jogo, via patch) e fotos realistas de jogador.
            Cada imagem custa ~US$ 0,04 na qualidade média. Salvando no patch:
            <b>${h(nomePatch(pack))}</b></div>
        </div>
        <select class="busca" id="est-pack" style="width:230px">
          ${D.packs.map(p=>`<option value="${p.id}" ${p.id===pack.id?'selected':''}>${h(nomePatch(p))}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="g4" style="margin:16px 0">
      ${kpiHTML({l:'Clubes no catálogo', v:num(base.length), d:`${paises.length} países`})}
      ${kpiHTML({l:'Escudos gerados por IA', v:num(totalEscudosIA), d:'salvos neste patch'})}
      ${kpiHTML({l:'Fotos de jogador', v:num(totalFotos), d:'geradas neste patch'})}
      ${kpiHTML({l:'Jogadores no catálogo', v:num(base.reduce((a,x)=>a+((x.c.squad||[]).length),0)), d:'candidatos a foto'})}
    </div>
    <div class="per" style="gap:6px;margin-bottom:2px">
      ${[['escudos','Escudos'],['uniformes','Uniformes'],['fotos','Fotos de jogadores']]
        .map(([id,l])=>`<span class="${aba===id?'on':''}" data-est-aba="${id}" style="padding:9px 16px">${l}</span>`).join('')}
    </div>
    <div class="card" style="overflow:hidden">
      <div class="card-h">
        <b>${aba==='escudos'?'Escolha o clube para gerar o escudo'
           : aba==='uniformes'?'Escolha o clube para gerar o uniforme'
           :'Escolha o clube para gerar as fotos do elenco'}</b>
        <select class="busca" id="est-pais" style="width:170px">
          <option value="todos">Todos os países</option>
          ${paises.map(p=>`<option value="${h(p)}" ${p===paisSel?'selected':''}>${h(p)}</option>`).join('')}
        </select>
        <input class="busca" id="est-busca" placeholder="Procurar clube…" value="${h(ST.buscaEstudio||'')}">
        ${aba==='escudos' && podeEditar('dados') ? '<button class="btn btn-sm" id="est-lote">Enviar em lote</button>' : ''}
        ${aba==='uniformes' && podeEditar('dados') ? '<button class="btn btn-sm btn-ghost" id="est-repintar" title="Repinta todos os uniformes de molde com os moldes atuais">Repintar todos</button>' : ''}
      </div>
      <div class="rowh" style="grid-template-columns:44px 1.7fr .9fr .6fr 1fr">
        <span></span><span>Clube</span><span>País</span><span style="text-align:center">Divisão</span>
        <span style="text-align:right">${aba==='escudos'?'Escudo':aba==='uniformes'?'Uniforme':'Fotos do elenco'}</span>
      </div>
      ${lista.length ? lista.slice(0,120).map(x => {
        const cor = x.c.color || '#333';
        const e = D.edits[x.c.id];
        const crest = (e && e.patch && e.patch.crest) || x.c.crest;
        const nf = fotosDoClube(x), tot = (x.c.squad||[]).length;
        return `<div class="row" style="grid-template-columns:44px 1.7fr .9fr .6fr 1fr;cursor:pointer" data-est-clube="${h(x.c.id)}">
          <span>${crest
            ? `<img src="${h(crest)}" alt="" style="width:26px;height:26px;object-fit:contain">`
            : `<i class="av" style="width:26px;height:26px;border-radius:6px;background:${h(cor)};color:#fff;font-size:10px">${h(iniciais(x.c.short||x.c.name))}</i>`}</span>
          <span style="min-width:0"><b style="display:block;font-size:13px;font-weight:600">${h(x.c.short||x.c.name)}</b>
            <small class="mono" style="font-size:11px;color:var(--dim3)">${h(x.c.id)}</small></span>
          <span style="font-size:12px;color:var(--dim)">${h(x.pais)}</span>
          <span class="mono" style="font-size:12px;text-align:center">${h(x.div)}</span>
          <span style="text-align:right">${aba==='escudos'
            ? (escudoIA(x) ? '<span class="tag t-ok">IA salvo</span>'
               : (crest ? '<span style="font-size:12px;color:var(--dim3)">real / manual</span>'
                        : '<span style="font-size:12px;color:var(--dim3)">sem escudo</span>'))
            : aba==='uniformes'
            ? (uniformeDoClube(x)
               ? `<span class="tag t-ok">${h((ESTILOS_CAMISA.find(e=>e[0]===((uniformeDoClube(x).atributos||{}).estilo))||[])[1]||'gerado')}</span>`
               : '<span style="font-size:12px;color:var(--dim3)">sem uniforme</span>')
            : (tot ? `<span class="mono" style="font-size:12.5px;color:${nf>=tot?'var(--verde2)':nf?'var(--ambar)':'var(--dim3)'}">${nf}/${tot}</span>`
                   : '<span style="font-size:12px;color:var(--dim3)">sem elenco</span>')}</span>
        </div>`;
      }).join('') : '<div class="vazio">Nenhum clube encontrado.</div>'}
      ${lista.length>120?`<div class="vazio">Mostrando 120 de ${lista.length} — refine a busca.</div>`:''}
    </div>`;

  el('est-pack').onchange = () => { ST.packId = el('est-pack').value; pgEstudio(); };
  document.querySelectorAll('[data-est-aba]').forEach(x => x.onclick = () => { ST.abaEstudio=x.dataset.estAba; pgEstudio(); });
  el('est-pais').onchange = () => { ST.paisEstudio = el('est-pais').value; pgEstudio(); };
  const btLote = el('est-lote');
  if(btLote) btLote.onclick = modalLoteEscudos;
  const btRep = el('est-repintar');
  if(btRep) btRep.onclick = () => repintarTodosUniformes(btRep);
  const b = el('est-busca'); let t=null;
  b.oninput = () => { clearTimeout(t); t=setTimeout(()=>{ ST.buscaEstudio=b.value.trim(); pgEstudio(); },300); };
  document.querySelectorAll('[data-est-clube]').forEach(r => r.onclick = () => {
    const item = (D.catalogo||[]).find(x => String(x.c.id)===String(r.dataset.estClube));
    if(!item) return;
    const abaAtual = ST.abaEstudio||'escudos';
    if(abaAtual==='escudos') modalEscudoIA(item);
    else if(abaAtual==='uniformes') modalUniformeIA(item);
    else modalFotosIA(item);
  });
}

/* ---------- modal: gerar escudo ---------- */
function modalEscudoIA(item){
  const c = item.c, editar = podeEditar('dados');
  const e = D.edits[c.id];
  const atual = (e && e.patch && e.patch.crest) || c.crest;
  abrirModal(`
    <h3>Escudo por IA — ${h(c.short||c.name)}</h3>
    <div class="duas-col">
      <div class="col" style="gap:12px">
        <div class="st" style="line-height:1.6">Escudo fictício nas cores do clube
          (<span class="mono">${h(c.color||'—')}</span> / <span class="mono">${h(c.color2||'—')}</span>).
          Salvar grava no patch em edição — o jogo passa a mostrar este escudo no lugar do real.</div>
        <label class="f">Estilo
          <select class="f" id="ia-estilo">
            ${ESTILOS_ESCUDO.map(x=>`<option value="${x[0]}">${h(x[1])}</option>`).join('')}
          </select></label>
        <label class="f">Símbolo principal (opcional)
          <input class="f" id="ia-simbolo" placeholder="Ex.: leão, âncora, estrela, galo…"></label>
        <label class="f">Texto no escudo (opcional — texto sai errado às vezes)
          <input class="f" id="ia-texto" maxlength="24" placeholder="Ex.: ${h((c.short||'').slice(0,18))}"></label>
        <label class="f">Instruções extras (opcional)
          <input class="f" id="ia-extra" placeholder="Ex.: duas estrelas em cima, faixa diagonal…"></label>
        <label class="f">Qualidade
          <select class="f" id="ia-qual">
            <option value="low">Rascunho (~US$ 0,01)</option>
            <option value="medium" selected>Média (~US$ 0,04)</option>
            <option value="high">Alta (~US$ 0,17)</option>
          </select></label>
        ${editar?`<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dim2);cursor:pointer">
          <input type="checkbox" id="ia-nofundo"> Remover o fundo ao enviar arquivo (fundo sólido vira transparente)</label>`:''}
        <label class="f">Prompt final (edite à vontade — é o que vai para a OpenAI)
          <textarea class="f" id="ia-prompt" rows="6" style="resize:vertical;font-size:12px;line-height:1.5"></textarea></label>
        <span class="link" id="ia-recompor" style="font-size:11.5px;align-self:flex-start">↻ recompor o prompt a partir dos campos acima</span>
      </div>
      <div class="col" style="gap:10px;align-items:center;justify-content:center">
        <div id="ia-preview" title="Clique para ver em tela expandida"
             style="width:230px;height:230px;display:flex;align-items:center;justify-content:center;cursor:zoom-in;
             border:1px dashed var(--bd2);border-radius:12px;background:repeating-conic-gradient(#0002 0 25%,transparent 0 50%) 0 0/18px 18px">
          ${atual?`<img src="${h(atual)}" style="max-width:88%;max-height:88%;object-fit:contain">`
                 :'<span style="font-size:12px;color:var(--dim3)">sem escudo ainda</span>'}
        </div>
        <div id="ia-estado" style="font-size:12px;color:var(--dim2);min-height:16px"></div>
      </div>
    </div>
    <div class="acoes">
      ${editar?`<button class="btn" id="ia-gerar">Gerar escudo</button>`:''}
      ${editar?`<button class="btn btn-ghost" id="ia-upload" style="flex:0 0 auto">Enviar arquivo</button>
        <input type="file" id="ia-arquivo" accept=".png,.webp,.jpg,.jpeg,.svg" style="display:none">`:''}
      ${editar?`<button class="btn btn-ghost" id="ia-salvar" disabled>Salvar no clube</button>`:''}
      <button class="btn btn-ghost" data-fechar>Fechar</button>
    </div>`, 'lg');

  el('ia-preview').onclick = () => {
    const img = el('ia-preview').querySelector('img');
    if(img) abrirLightbox(img.src, c.short||c.name);
  };

  if(!editar) return;

  /* o prompt final é um campo de verdade: os campos estruturados o recompõem
     enquanto ninguém digitar nele à mão — depois disso, o que vale é o texto */
  let promptTocado = false;
  const recompor = () => {
    el('ia-prompt').value = promptEscudo(c, el('ia-estilo').value,
      el('ia-simbolo').value.trim(), el('ia-texto').value.trim(), el('ia-extra').value.trim());
  };
  recompor();
  ['ia-estilo','ia-simbolo','ia-texto','ia-extra'].forEach(id => {
    el(id).oninput = () => { if(!promptTocado) recompor(); };
    el(id).onchange = () => { if(!promptTocado) recompor(); };
  });
  el('ia-prompt').oninput = () => { promptTocado = true; };
  el('ia-recompor').onclick = () => { promptTocado = false; recompor(); };

  let gerada = null;
  const mostrarNoPreview = (url, aviso) => {
    gerada = url;
    el('ia-preview').innerHTML = `<img src="${h(url)}" style="max-width:88%;max-height:88%;object-fit:contain">`;
    el('ia-estado').textContent = aviso;
    el('ia-salvar').disabled = false; el('ia-salvar').classList.remove('btn-ghost');
  };
  /* upload manual: mesmo destino e mesmo "Salvar no clube" do escudo gerado */
  el('ia-upload').onclick = () => el('ia-arquivo').click();
  el('ia-arquivo').onchange = async () => {
    let f = el('ia-arquivo').files[0]; if(!f) return;
    if(f.size > 5*1024*1024) return toast('Arquivo acima de 5 MB.', true);
    let ext = (f.name.split('.').pop()||'png').toLowerCase();
    if(el('ia-nofundo') && el('ia-nofundo').checked){
      try{ const b2 = await removerFundoDeImagem(f); if(b2){ f = b2; ext = 'png'; } }
      catch(err){ return toast('Falha ao remover o fundo: '+err.message, true); }
    }
    const caminho = `${caminhoClube(item)}/escudo-upload-${Date.now()}.${ext}`;
    const up = await sb.storage.from('escudos').upload(caminho, f, { upsert:false, cacheControl:'31536000' });
    if(up.error) return toast(erroMsg(up.error), true);
    mostrarNoPreview(sb.storage.from('escudos').getPublicUrl(caminho).data.publicUrl,
      'Arquivo enviado — salve para valer.');
  };
  el('ia-gerar').onclick = async () => {
    const btn = el('ia-gerar');
    const prompt = el('ia-prompt').value.trim();
    if(!prompt) return toast('O prompt está vazio.', true);
    btn.disabled = true; btn.textContent = 'Gerando… (até 1 min)';
    el('ia-estado').textContent = 'A OpenAI está desenhando o escudo…';
    try{
      const url = await gerarImagemIA('escudo', prompt, el('ia-qual').value, null, caminhoClube(item)+'/escudo');
      gerada = url;
      el('ia-preview').innerHTML = `<img src="${h(url)}" style="max-width:88%;max-height:88%;object-fit:contain">`;
      el('ia-estado').textContent = 'Pronto — salve para valer, ou gere de novo.';
      el('ia-salvar').disabled = false; el('ia-salvar').classList.remove('btn-ghost');
    }catch(err){
      el('ia-estado').textContent = '';
      toast(err.message||'Falha ao gerar.', true);
    }
    btn.disabled = false; btn.textContent = 'Gerar de novo';
  };
  el('ia-salvar').onclick = async () => {
    if(!gerada) return;
    const ed = D.edits[c.id];
    const linha = {
      pack_id: ST.packId, club_id: String(c.id), divisao: item.div, novo: !!(ed && ed.novo),
      patch: Object.assign({}, ed && ed.patch, { crest: gerada })
    };
    const { error } = await jogo('pack_edits').upsert(linha, { onConflict:'pack_id,club_id' });
    if(error) return toast(erroMsg(error), true);
    await jogo('data_packs').update({ atualizado_em:new Date().toISOString() }).eq('id', ST.packId);
    registrar('estudio.escudo', String(c.id), { pacote: ST.packId });
    fecharModal(); toast('Escudo salvo no patch.'); pgEstudio();
  };
}

/* ---------- modal: fotos do elenco ---------- */
function modalFotosIA(item){
  const c = item.c, editar = podeEditar('dados');
  const sq = (c.squad||[]).slice().sort((a,b)=>(b.f||0)-(a.f||0));
  const sorteios = {};   // nome -> atributos sorteados nesta sessão do modal
  sq.forEach(p => { sorteios[p.n] = sortearAtributos(p); });
  const faltantes = () => sq.filter(p => !D.fotos[c.id+'|'+p.n]);
  const torso = () => D.fotos[c.id+'|'+TORSO_KEY];
  /* o escudo do clube entra como camada por cima do uniforme — o do patch em
     edição vale primeiro (é o fictício gerado aqui), senão o de fábrica */
  const escudoClube = () => {
    const e = D.edits[c.id];
    return (e && e.patch && e.patch.crest) || c.crest || null;
  };
  /* as camadas do clube num lugar só: URLs salvas no uniforme + posições */
  const camadasClube = () => {
    const t0 = torso(), at0 = (t0 && t0.atributos) || {};
    return { patroUrl: at0.patroUrl || ST.patroTeste, escudoUrl: escudoClube(), fabUrl: at0.fabricanteUrl,
             patro: at0.patro, escudo: at0.escudo, fabricante: at0.fabricante };
  };

  /* miniatura: rosto composto sobre a camisa do clube quando as duas camadas
     existem; rosto solto se a camisa ainda não foi gerada; retrato antigo
     (de antes das camadas) aparece como está */
  const thumbHTML = (f, px) => {
    const t = torso();
    /* a montagem IA (rosto costurado no uniforme) é a base — e o escudo e o
       patrocinador continuam entrando como camadas por cima: a costura mantém a
       camisa idêntica à do uniforme, então as posições valem também aqui */
    if(f && f.atributos && f.atributos.montagem)
      return compostoHTML(f.atributos.montagem, null, px, 8, camadasClube());
    if(f && f.atributos && f.atributos.recorte==='rosto')
      return t ? compostoHTML(t.url, f.url, px, 8, camadasClube())
               : `<span style="display:inline-block;width:${px}px;height:${px}px;border-radius:8px;background:#d9d9d9;overflow:hidden"><img src="${h(f.url)}" style="width:100%;height:100%;object-fit:contain"></span>`;
    return `<img src="${h(f.url)}" style="width:${px}px;height:${px}px;border-radius:8px;object-fit:cover">`;
  };

  const linhaFoto = (p) => {
    const f = D.fotos[c.id+'|'+p.n];
    return `<div class="row" style="grid-template-columns:52px minmax(0,1.4fr) minmax(0,2fr) 150px;align-items:center" data-foto-jog="${h(p.n)}">
      <span data-thumb ${f?'style="cursor:zoom-in" title="Ver em tela expandida"':''}>${f
        ? thumbHTML(f, 40)
        : `<i class="av" style="width:40px;height:40px;border-radius:8px;background:${h(c.color||'#333')};color:#fff;font-size:12px">${h(iniciais(p.n))}</i>`}</span>
      <span style="min-width:0"><b style="display:block;font-size:13px;font-weight:600">${h(p.n)}</b>
        <small style="font-size:11px;color:var(--dim3)">${h(p.p||'—')} · ${p.age!=null?p.age+' anos':'idade —'} · força ${p.f!=null?p.f:'—'}</small></span>
      <small data-attrs style="font-size:11px;color:var(--dim2);line-height:1.5">${h(resumoAtributos(sorteios[p.n]))}</small>
      <span style="display:flex;gap:6px;justify-content:flex-end">
        <button class="btn btn-sm btn-ghost" data-escudo title="Arrastar e soltar o escudo no uniforme desta foto" ${f&&f.atributos&&f.atributos.montagem?'':'disabled'}>🛡</button>
        <button class="btn btn-sm btn-ghost" data-ver title="Ver em tela expandida" ${f?'':'disabled'}>⛶</button>
        ${editar?`<button class="btn btn-sm btn-ghost" data-sortear title="Sortear outro visual">↻</button>
        <button class="btn btn-sm" data-gerar>${f?'Refazer':'Gerar'}</button>`:''}
      </span>
    </div>`;
  };

  abrirModal(`
    <h3>Fotos por IA — ${h(c.short||c.name)}</h3>
    <div class="st" style="line-height:1.6;margin-bottom:10px">
      A foto é em DUAS camadas: o <b>rosto</b> (recortado, um por jogador) sobre a
      <b>camisa do clube</b> (base única para o elenco inteiro). Trocou de clube?
      O visual do rosto (pele, cabelo, barba, sorriso, brinco, tatuagem) é sorteado — use ↻ antes
      de gerar. Com o uniforme pronto, a IA <b>costura</b> rosto e uniforme numa foto natural
      (a montagem); o rosto solto fica guardado para remontar barato na troca de clube.
      A idade vem do elenco. ~US$ 0,08 por jogador (rosto + montagem).
      <b>No primeiro jogador do clube, confira o encaixe:</b> escudo e patrocinador podem
      precisar de ajuste de posição — clique no 🛡 da linha dele, arraste e salve; a posição
      vale para o elenco inteiro.</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;padding:10px 12px;border:1px solid var(--bd2);border-radius:10px">
      <span data-torso-thumb ${torso()?'style="cursor:zoom-in" title="Ver em tela expandida"':''}>${torso()
        ? `<img src="${h(torso().url)}" style="width:44px;height:44px;border-radius:8px;object-fit:cover">`
        : `<i class="av" style="width:44px;height:44px;border-radius:8px;background:${h(c.color||'#333')};color:#fff;font-size:11px">⚽</i>`}</span>
      <span style="flex:1;min-width:0">
        <b style="display:block;font-size:13px">Uniforme do clube</b>
        <small style="font-size:11.5px;color:var(--dim2)">${torso()
          ?'Gerado — os rostos são montados sobre ele. Cores, estilo e patrocínio: aba Uniformes.'
          :'Ainda não gerado — gere na aba Uniformes; sem ele os rostos aparecem soltos.'}</small>
      </span>
      ${editar?`<button class="btn btn-sm btn-ghost" id="ft-ir-uniforme">Abrir na aba Uniformes</button>`:''}
    </div>
    ${editar && sq.length ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <button class="btn btn-sm" id="ft-todos">Gerar os que faltam (${faltantes().length})</button>
      <span id="ft-progresso" style="font-size:12px;color:var(--dim2)"></span></div>`:''}
    <div class="jog-wrap">
      <div id="ft-lista">${sq.map(linhaFoto).join('') || '<div class="vazio">Elenco vazio.</div>'}</div>
    </div>
    <div class="acoes"><button class="btn btn-ghost" data-fechar>Fechar</button></div>`, 'xl');

  /* ver em tela expandida funciona para todo papel — inclusive leitura.
     Rosto novo com camisa gerada abre a MONTAGEM (como vai aparecer no jogo);
     sem camisa, ou retrato antigo, abre a imagem sozinha. */
  const verExpandido = (f, alt) => {
    const t = torso();
    const lado = Math.min(520, Math.floor(Math.min(innerWidth*0.9, innerHeight*0.85/RATIO_FOTO)));
    if(f.atributos && f.atributos.montagem)
      abrirLightboxHTML(compostoHTML(f.atributos.montagem, null, lado, 16, camadasClube()));
    else if(f.atributos && f.atributos.recorte==='rosto' && t)
      abrirLightboxHTML(compostoHTML(t.url, f.url, lado, 16, camadasClube()));
    else abrirLightbox(f.url, alt);
  };
  el('ft-lista').addEventListener('click', ev => {
    if(!ev.target.closest('[data-ver], [data-thumb]')) return;
    const linha = ev.target.closest('[data-foto-jog]'); if(!linha) return;
    const f = D.fotos[c.id+'|'+linha.dataset.fotoJog];
    if(f) verExpandido(f, linha.dataset.fotoJog);
  });
  document.querySelector('[data-torso-thumb]').onclick = () => {
    const t = torso(); if(!t) return;
    const lado = Math.min(520, Math.floor(Math.min(innerWidth*0.9, innerHeight*0.85/RATIO_FOTO)));
    abrirLightboxHTML(compostoHTML(t.url, null, lado, 16, camadasClube()));
  };
  const irUni = el('ft-ir-uniforme');
  if(irUni) irUni.onclick = () => { ST.abaEstudio='uniformes'; modalUniformeIA(item); };

  if(!editar) return;

  async function gerarPara(p, linha){
    const at = Object.assign({}, sorteios[p.n], { recorte:'rosto' });
    const url = await gerarImagemIA('rosto', promptRosto(item, p, at), 'medium', null,
      caminhoClube(item)+'/jogadores/'+(chaveNome(p.n)||'jogador')+'-rosto');
    /* com o uniforme pronto, a OpenAI costura rosto+uniforme numa foto natural —
       é a montagem que o jogo mostra. O rosto solto fica guardado: é ele que
       permite refazer a montagem barata quando o jogador trocar de clube. */
    const t = torso();
    if(t){
      try{ at.montagem = await gerarImagemIA('montagem', promptMontagem(), 'medium', [t.url, url],
        caminhoClube(item)+'/jogadores/'+(chaveNome(p.n)||'jogador')+'-foto'); }
      catch(err){ console.warn('montagem falhou, fica a prévia por camadas:', err.message); }
    }
    const reg = { pack_id: ST.packId, club_id: String(c.id), jogador: p.n, url, atributos: at };
    const { error } = await jogo('player_photos').upsert(reg, { onConflict:'pack_id,club_id,jogador' });
    if(error) throw new Error(erroMsg(error));
    D.fotos[c.id+'|'+p.n] = reg;
    if(linha){
      const th = linha.querySelector('[data-thumb]');
      th.innerHTML = thumbHTML(reg, 40);
      th.style.cursor = 'zoom-in'; th.title = 'Ver em tela expandida';
      const bt = linha.querySelector('[data-gerar]'); if(bt) bt.textContent = 'Refazer';
      const bv = linha.querySelector('[data-ver]'); if(bv) bv.disabled = false;
      const be = linha.querySelector('[data-escudo]'); if(be) be.disabled = !at.montagem;
    }
  }

  el('ft-lista').addEventListener('click', async ev => {
    const linha = ev.target.closest('[data-foto-jog]'); if(!linha) return;
    const p = sq.find(x => x.n === linha.dataset.fotoJog); if(!p) return;
    if(ev.target.closest('[data-escudo]')){
      const f = D.fotos[c.id+'|'+p.n];
      if(f && f.atributos && f.atributos.montagem)
        modalAjustePatrocinio(item, () => modalFotosIA(item), f.atributos.montagem);
      return;
    }
    if(ev.target.closest('[data-sortear]')){
      sorteios[p.n] = sortearAtributos(p);
      linha.querySelector('[data-attrs]').textContent = resumoAtributos(sorteios[p.n]);
      return;
    }
    const bt = ev.target.closest('[data-gerar]'); if(!bt) return;
    bt.disabled = true; const rotulo = bt.textContent; bt.textContent = '…';
    try{ await gerarPara(p, linha); registrar('estudio.foto', c.id+'|'+p.n, { pacote: ST.packId }); toast('Foto salva.'); }
    catch(err){ bt.textContent = rotulo; toast(err.message||'Falha ao gerar.', true); }
    bt.disabled = false; if(bt.textContent==='…') bt.textContent = 'Refazer';
  });

  const btTodos = el('ft-todos');
  if(btTodos) btTodos.onclick = async () => {
    const fila = faltantes();
    if(!fila.length) return toast('Todo o elenco já tem foto.');
    const custo = (fila.length*(torso()?0.08:0.04)).toFixed(2);
    if(!confirm(`Gerar ${fila.length} fotos agora? Custo estimado ~US$ ${custo}. Uma por vez, dá para acompanhar.`)) return;
    btTodos.disabled = true;
    let ok = 0, erroN = 0;
    for(const p of fila){
      el('ft-progresso').textContent = `Gerando ${ok+erroN+1}/${fila.length} — ${p.n}…`;
      const linha = el('ft-lista').querySelector(`[data-foto-jog="${CSS.escape(p.n)}"]`);
      try{ await gerarPara(p, linha); ok++; }
      catch(err){ erroN++; console.warn('foto falhou:', p.n, err.message); }
    }
    registrar('estudio.foto.lote', String(c.id), { pacote: ST.packId, geradas: ok, falhas: erroN });
    el('ft-progresso').textContent = `Pronto: ${ok} geradas${erroN?`, ${erroN} falharam`:''}.`;
    btTodos.disabled = false; btTodos.textContent = `Gerar os que faltam (${faltantes().length})`;
  };
}

/* ---------- escudos em lote ----------
   O nome do ARQUIVO diz de que clube é o escudo: casa com o id do jogo
   (br_D_gama.png), com o nome ou com o nome curto (Gama.png, "Ponte Preta.webp"),
   tolerante a acento/caixa/pontuação — a mesma chaveNome do importador de dados.
   Nada sobe sem revisão: primeiro a lista mostra o que casou (e o que não),
   e só o botão de confirmar faz o upload + grava no patch. */
function modalLoteEscudos(){
  /* índice nome-normalizado -> clube (ambiguidade invalida a chave) + índices de
     país e divisão para o palpite pelo nome do arquivo */
  const indice = new Map();
  const registrarChave = (chave, item) => {
    if(!chave) return;
    if(indice.has(chave) && indice.get(chave) !== item) indice.set(chave, 'AMBIGUO');
    else indice.set(chave, item);
  };
  (D.catalogo||[]).forEach(item => {
    registrarChave(chaveNome(item.c.id), item);
    registrarChave(chaveNome(item.c.name), item);
    registrarChave(chaveNome(item.c.short), item);
  });
  const paises = Array.from(new Set((D.catalogo||[]).map(x=>x.pais)))
    .sort((a,b)=> a==='Brasil'?-1:b==='Brasil'?1:a.localeCompare(b,'pt-BR'));
  const chavePais = new Map(paises.map(p=>[chaveNome(p), p]));
  const divisoesDe = pais => Array.from(new Set((D.catalogo||[]).filter(x=>x.pais===pais).map(x=>String(x.div))))
    .sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const clubesDe = (pais, div) => (D.catalogo||[]).filter(x=>x.pais===pais && String(x.div)===String(div))
    .sort((a,b)=>String(a.c.short||a.c.name).localeCompare(String(b.c.short||b.c.name),'pt-BR'));

  /* palpite pelo nome do arquivo: 1º o clube inteiro (id, nome, nome curto);
     sem clube, ainda tenta reconhecer país e divisão nos pedaços do nome */
  function adivinhar(nomeArq){
    const semExt = nomeArq.replace(/\.[a-z0-9]+$/i,'');
    const cheio = indice.get(chaveNome(semExt));
    if(cheio && cheio!=='AMBIGUO') return { item: cheio };
    const pedacos = semExt.split(/[-_ .]+/).map(chaveNome).filter(Boolean);
    // combinações contíguas, das mais longas para as mais curtas
    for(let tam=pedacos.length; tam>=1; tam--)
      for(let i=0; i+tam<=pedacos.length; i++){
        const alvo = indice.get(pedacos.slice(i,i+tam).join(''));
        if(alvo && alvo!=='AMBIGUO') return { item: alvo };
      }
    const out = {};
    for(const t of pedacos){
      if(chavePais.has(t)) out.pais = chavePais.get(t);
      const m = /^serie([a-d])$/.exec(t); if(m) out.div = m[1].toUpperCase();
    }
    return out;
  }

  abrirModal(`
    <h3>Escudos em lote</h3>
    <div class="st" style="line-height:1.7;margin-bottom:12px">
      Selecione os arquivos (PNG/WEBP/JPG/SVG, até 5 MB, de preferência com fundo transparente).
      O sistema aponta o clube pelo <b>nome do arquivo</b> (id do jogo, nome do clube — e reconhece
      país/divisão no nome); confira ou corrija nos seletores e <b>confirme linha a linha</b>.</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
      <button class="btn" id="lt-escolher">Escolher arquivos…</button>
      <input type="file" id="lt-arquivos" accept=".png,.webp,.jpg,.jpeg,.svg" multiple style="display:none">
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dim2);cursor:pointer">
        <input type="checkbox" id="lt-nofundo"> Remover fundo</label>
      <span id="lt-resumo" style="font-size:12.5px;color:var(--dim2)"></span>
    </div>
    <div id="lt-lista"></div>
    <div class="acoes">
      <button class="btn" id="lt-subir" disabled>Confirmar todos os apontados</button>
      <button class="btn btn-ghost" data-fechar>Fechar</button>
    </div>`, 'xl');

  let plano = [];   // { f, urlPrevia, pais, div, clube(id|''), salvo, erro }

  const selHTML = (i, p) => {
    const divs = p.pais ? divisoesDe(p.pais) : [];
    const clubes = (p.pais && p.div) ? clubesDe(p.pais, p.div) : [];
    return `
      <select class="busca" data-i="${i}" data-sel="pais" style="width:110px" ${p.salvo?'disabled':''}>
        <option value="">País…</option>
        ${paises.map(x=>`<option ${x===p.pais?'selected':''}>${h(x)}</option>`).join('')}</select>
      <select class="busca" data-i="${i}" data-sel="div" style="width:86px" ${p.salvo?'disabled':''}>
        <option value="">Div…</option>
        ${divs.map(d=>`<option ${d===p.div?'selected':''}>${h(d)}</option>`).join('')}</select>
      <select class="busca" data-i="${i}" data-sel="clube" style="width:100%;min-width:0" ${p.salvo?'disabled':''}>
        <option value="">Clube…</option>
        ${clubes.map(x=>`<option value="${h(x.c.id)}" ${String(x.c.id)===String(p.clube)?'selected':''}>${h(x.c.short||x.c.name)}</option>`).join('')}</select>`;
  };
  const linhaHTML = (p, i) => `
    <div class="row" style="grid-template-columns:34px minmax(0,1fr) 110px 86px minmax(0,1fr) 96px;gap:8px;align-items:center" data-linha="${i}">
      <img src="${h(p.urlPrevia)}" style="width:28px;height:28px;object-fit:contain">
      <span class="mono" style="font-size:11.5px;min-width:0;overflow:hidden;text-overflow:ellipsis" title="${h(p.f.name)}">${h(p.f.name)}</span>
      ${selHTML(i, p)}
      <span style="text-align:right">${p.salvo
        ? '<span class="tag t-ok">salvo ✓</span>'
        : p.erro ? `<span class="tag t-erro" title="${h(p.erro)}">erro</span>`
        : `<button class="btn btn-sm" data-conf="${i}" ${p.clube?'':'disabled'}>Confirmar</button>`}</span>
    </div>`;

  function desenhar(){
    const pend = plano.filter(p=>!p.salvo && p.clube).length;
    el('lt-lista').innerHTML = plano.length ? `
      <div class="rowh" style="grid-template-columns:34px minmax(0,1fr) 110px 86px minmax(0,1fr) 96px;gap:8px">
        <span></span><span>Arquivo</span><span>País</span><span>Divisão</span><span>Clube</span><span style="text-align:right"></span>
      </div>
      <div style="max-height:44vh;overflow:auto">${plano.map((p,i)=>linhaHTML(p,i)).join('')}</div>` : '';
    el('lt-resumo').textContent = plano.length
      ? `${plano.filter(p=>p.salvo).length} salvos · ${pend} apontados · ${plano.filter(p=>!p.salvo && !p.clube).length} sem clube`
      : '';
    el('lt-subir').disabled = !pend;
    el('lt-subir').textContent = pend ? `Confirmar todos os apontados (${pend})` : 'Confirmar todos os apontados';

    el('lt-lista').querySelectorAll('[data-sel]').forEach(sel => sel.onchange = () => {
      const p = plano[+sel.dataset.i];
      if(sel.dataset.sel==='pais'){ p.pais = sel.value; p.div=''; p.clube=''; }
      else if(sel.dataset.sel==='div'){ p.div = sel.value; p.clube=''; }
      else p.clube = sel.value;
      desenhar();
    });
    el('lt-lista').querySelectorAll('[data-conf]').forEach(bt => bt.onclick = () => confirmarLinha(+bt.dataset.conf));
  }

  async function confirmarLinha(i){
    const p = plano[i];
    if(!p || p.salvo || !p.clube) return;
    const item = (D.catalogo||[]).find(x => String(x.c.id)===String(p.clube));
    if(!item) return;
    try{
      let arq = p.f, ext = (p.f.name.split('.').pop()||'png').toLowerCase();
      if(el('lt-nofundo') && el('lt-nofundo').checked){
        const b2 = await removerFundoDeImagem(p.f); if(b2){ arq = b2; ext = 'png'; }
      }
      const caminho = `${caminhoClube(item)}/escudo-lote-${Date.now()}.${ext}`;
      const up = await sb.storage.from('escudos').upload(caminho, arq, { upsert:false, cacheControl:'31536000' });
      if(up.error) throw new Error(up.error.message);
      const url = sb.storage.from('escudos').getPublicUrl(caminho).data.publicUrl;
      const ed = D.edits[item.c.id];
      const linha = {
        pack_id: ST.packId, club_id: String(item.c.id), divisao: item.div, novo: !!(ed && ed.novo),
        patch: Object.assign({}, ed && ed.patch, { crest: url })
      };
      const r = await jogo('pack_edits').upsert(linha, { onConflict:'pack_id,club_id' });
      if(r.error) throw new Error(r.error.message);
      D.edits[item.c.id] = linha;
      p.salvo = true; p.erro = null;
      registrar('estudio.escudo.lote.item', String(item.c.id), { pacote: ST.packId, arquivo: p.f.name });
    }catch(err){ p.erro = err.message; console.warn('lote escudo falhou:', p.f.name, err.message); }
    desenhar();
  }

  el('lt-escolher').onclick = () => el('lt-arquivos').click();
  el('lt-arquivos').onchange = () => {
    plano = Array.from(el('lt-arquivos').files||[]).map(f => {
      const palpite = adivinhar(f.name);
      if(f.size > 5*1024*1024) return { f, urlPrevia:URL.createObjectURL(f), erro:'acima de 5 MB', pais:'', div:'', clube:'' };
      if(palpite.item) return { f, urlPrevia:URL.createObjectURL(f),
        pais:palpite.item.pais, div:String(palpite.item.div), clube:String(palpite.item.c.id) };
      return { f, urlPrevia:URL.createObjectURL(f), pais:palpite.pais||'', div:palpite.div||'', clube:'' };
    });
    desenhar();
  };

  el('lt-subir').onclick = async () => {
    el('lt-subir').disabled = true;
    for(let i=0; i<plano.length; i++) if(!plano[i].salvo && plano[i].clube) await confirmarLinha(i);
    await jogo('data_packs').update({ atualizado_em:new Date().toISOString() }).eq('id', ST.packId);
  };
}

/* ---------- ajuste do patrocínio: arrastar e redimensionar sobre o uniforme ----------
   Abre POR CIMA do modal de fotos (overlay próprio, não abrirModal — que o
   substituiria). O logo é arrastável no palco e o tamanho vem do controle
   deslizante; salvar grava {x, y, w} em atributos.patro do uniforme — é essa
   posição que todas as montagens (e depois o jogo) usam para este clube. */
function modalAjustePatrocinio(item, onSalvo, baseUrl){
  const c = item.c;
  const t = D.fotos[c.id+'|'+TORSO_KEY];
  if(!t) return toast('Gere o uniforme primeiro.', true);

  /* O AJUSTE É SOBRE A FOTO FINAL: o fundo é a foto do jogador clicado (baseUrl)
     ou, sem ela, a primeira montagem do elenco — é aí que escudo e logo precisam
     encaixar. Sem montagem nenhuma, o fundo é o uniforme cru. As posições salvas
     valem para o clube todo. */
  let base = baseUrl || t.url, baseMontagem = !!baseUrl;
  if(!baseUrl) for(const p of (c.squad||[])){
    const f = D.fotos[c.id+'|'+p.n];
    if(f && f.atributos && f.atributos.montagem){ base = f.atributos.montagem; baseMontagem = true; break; }
  }
  const e = D.edits[c.id];
  const escudoUrl = (e && e.patch && e.patch.crest) || c.crest || null;
  const at0 = t.atributos || {};
  const fabUrl = at0.fabricanteUrl || null;
  const pos = {
    patro:      Object.assign({}, PATRO_POS_PADRAO,  at0.patro      || {}),
    escudo:     Object.assign({}, ESCUDO_POS_PADRAO, at0.escudo     || {}),
    fabricante: Object.assign({}, FAB_POS_PADRAO,    at0.fabricante || {})
  };

  const lado = Math.min(420, Math.floor(Math.min(innerWidth*0.85, (innerHeight*0.72)/RATIO_FOTO)));
  const ladoAlt = Math.round(lado*RATIO_FOTO);
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000d;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px';
  ov.innerHTML = `
    <div style="position:relative;width:${lado}px;height:${ladoAlt}px;border-radius:12px;overflow:hidden;background:#d9d9d9;touch-action:none">
      <img src="${h(base)}" draggable="false" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none">
      ${escudoUrl?`<img data-alvo="escudo" src="${h(escudoUrl)}" draggable="false"
        style="position:absolute;left:${pos.escudo.x}%;top:${pos.escudo.y}%;width:${pos.escudo.w}%;cursor:grab;outline:2px dashed #e3b23c;outline-offset:3px">`:''}
      ${fabUrl?`<img data-alvo="fabricante" src="${h(fabUrl)}" draggable="false"
        style="position:absolute;left:${pos.fabricante.x}%;top:${pos.fabricante.y}%;width:${pos.fabricante.w}%;cursor:grab;outline:2px dashed #7dd3fc;outline-offset:3px">`:''}
      ${ST.patroTeste?`<img data-alvo="patro" src="${h(ST.patroTeste)}" draggable="false"
        style="position:absolute;left:${pos.patro.x}%;top:${pos.patro.y}%;width:${pos.patro.w}%;cursor:grab;outline:2px dashed #35c46a;outline-offset:3px">`:''}
    </div>
    <div style="display:flex;align-items:center;gap:14px;color:#fff;font-size:13px;flex-wrap:wrap;justify-content:center">
      ${escudoUrl?`<span style="color:#e3b23c">Escudo</span>
        <input data-w="escudo" type="range" min="5" max="40" step="0.5" value="${pos.escudo.w}" style="width:150px">`:''}
      ${fabUrl?`<span style="color:#7dd3fc">Fabricante</span>
        <input data-w="fabricante" type="range" min="4" max="30" step="0.5" value="${pos.fabricante.w}" style="width:130px">`:''}
      ${ST.patroTeste?`<span style="color:#35c46a">Logo</span>
        <input data-w="patro" type="range" min="8" max="60" step="0.5" value="${pos.patro.w}" style="width:150px">`:''}
      <button class="btn btn-sm" id="aj-salvar">Salvar posições</button>
      <button class="btn btn-sm btn-ghost" id="aj-cancelar" style="color:#fff">Cancelar</button>
    </div>
    <small style="color:#fff8;text-align:center;max-width:${lado}px">
      Arraste o escudo (amarelo), o fabricante (azul) e o patrocinador (verde) até encaixarem
      — as posições salvas valem para todas as fotos do clube.
    </small>`;
  document.body.appendChild(ov);

  ov.querySelectorAll('[data-alvo]').forEach(img => {
    const chave = img.dataset.alvo;
    let drag = null;
    img.onpointerdown = e2 => { drag = { cx:e2.clientX, cy:e2.clientY, x:pos[chave].x, y:pos[chave].y };
      img.setPointerCapture(e2.pointerId); img.style.cursor='grabbing'; };
    img.onpointermove = e2 => { if(!drag) return;
      pos[chave].x = Math.min(96, Math.max(-30, drag.x + (e2.clientX-drag.cx)*100/lado));
      pos[chave].y = Math.min(96, Math.max(-30, drag.y + (e2.clientY-drag.cy)*100/ladoAlt));
      img.style.left = pos[chave].x+'%'; img.style.top = pos[chave].y+'%'; };
    img.onpointerup = () => { drag=null; img.style.cursor='grab'; };
  });
  ov.querySelectorAll('[data-w]').forEach(sl => sl.oninput = e2 => {
    const chave = sl.dataset.w; pos[chave].w = +e2.target.value;
    const img = ov.querySelector(`[data-alvo="${chave}"]`); if(img) img.style.width = pos[chave].w+'%';
  });

  const fechar = () => { ov.remove(); document.removeEventListener('keydown', esc, true); };
  const esc = e2 => { if(e2.key==='Escape'){ e2.stopImmediatePropagation(); fechar(); } };
  document.addEventListener('keydown', esc, true);
  ov.querySelector('#aj-cancelar').onclick = fechar;

  ov.querySelector('#aj-salvar').onclick = async () => {
    const lim = o => ({ x:+o.x.toFixed(2), y:+o.y.toFixed(2), w:+o.w.toFixed(2) });
    const at = Object.assign({}, t.atributos,
      { patro: lim(pos.patro), escudo: lim(pos.escudo), fabricante: lim(pos.fabricante) });
    const { error } = await jogo('player_photos').update({ atributos: at })
      .eq('pack_id', ST.packId).eq('club_id', String(c.id)).eq('jogador', TORSO_KEY);
    if(error) return toast(erroMsg(error), true);
    t.atributos = at;
    registrar('estudio.camadas.pos', String(c.id), at);
    toast('Posições salvas — valem para todo o elenco.');
    fechar(); if(onSalvo) onSalvo();
  };
}

/* ---------- modal: uniforme do clube — passo a passo ----------
   Régua vertical à esquerda guiando a criação: 1 Estilo -> 2 Cores -> 3 Escudo
   -> 4 Patrocinador -> 5 Salvar. A prévia à direita é pintada LOCALMENTE
   (molde + canvas, sem custo) a cada mudança; a IA só entra no molde novo.
   Salvar tem dois desfechos: rascunho (fica no Estúdio) e aplicar no jogo
   (grava o uniforme e, se houver escudo novo, o crest no patch). */
function modalUniformeIA(item){
  const c = item.c, editar = podeEditar('dados');
  const t = () => D.fotos[c.id+'|'+TORSO_KEY];
  const escudoAtual = () => { const e = D.edits[c.id]; return (e && e.patch && e.patch.crest) || c.crest || null; };
  const at = (t() && t().atributos) || {};

  if(!D.wiz || D.wiz.clube !== c.id){
    D.wiz = { clube:c.id, passo:1, max:1,
      estilo: at.estilo || 'vertical',
      corA: (at.cores && at.cores[0]) || c.color || '#1b7a3d',
      corB: (at.cores && at.cores[1]) || c.color2 || '#ffffff',
      escudoNovo: null,
      patroUrl: at.patroUrl || ST.patroTeste || '',
      fabUrl: at.fabricanteUrl || '',
      pv: null, pvChave: '' };
  }
  const wiz = D.wiz;
  const abrir = () => modalUniformeIA(item);
  const escudoEscolhido = () => wiz.escudoNovo || escudoAtual();

  const PASSOS = [
    ['Estilo','o desenho da camisa'],
    ['Cores','principal e secundária'],
    ['Miniatura','só a camisa, para o campo'],
    ['Escudo','suba um novo ou mantenha'],
    ['Patrocinador','logo sobre a camisa'],
    ['Fabricante','logo pequena, lado oposto ao escudo'],
    ['Salvar','rascunho ou aplicar no jogo']];
  const camadasWiz = () => ({ patroUrl: wiz.patroUrl, escudoUrl: escudoEscolhido(), fabUrl: wiz.fabUrl,
    patro: at.patro, escudo: at.escudo, fabricante: at.fabricante });
  const resumo = n =>
    n===1 ? h((ESTILOS_CAMISA.find(e=>e[0]===wiz.estilo)||[])[1]||'') :
    n===2 ? `<i style="display:inline-block;width:13px;height:13px;border-radius:4px;background:${h(wiz.corA)};vertical-align:-2px"></i>
             <i style="display:inline-block;width:13px;height:13px;border-radius:4px;background:${h(wiz.corB)};border:1px solid var(--bd2);vertical-align:-2px"></i>` :
    n===3 ? (D.fotos[MOLDE_KEY+'|mini-'+wiz.estilo] ? 'pronta — pinta ao salvar' : 'molde ainda não gerado') :
    n===4 ? (wiz.escudoNovo ? 'novo escudo enviado' : (escudoAtual() ? 'mantém o atual' : 'sem escudo')) :
    n===5 ? (wiz.patroUrl ? 'logo definido' : 'sem patrocinador') :
    n===6 ? (wiz.fabUrl ? 'logo definido' : 'sem fabricante') : '';

  const corpoPasso = n => {
    if(n===1) return `<div class="col" style="gap:6px">
      ${ESTILOS_CAMISA.map(e=>`<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid ${wiz.estilo===e[0]?'var(--verde2)':'var(--bd2)'};border-radius:10px;cursor:pointer;font-size:13px">
        <input type="radio" name="wz-estilo" value="${e[0]}" ${wiz.estilo===e[0]?'checked':''}> ${h(e[1])}</label>`).join('')}
      ${editar && D.fotos[MOLDE_KEY+'|'+wiz.estilo] ? `<span class="link" id="wz-refazer-molde" style="font-size:12px;align-self:flex-start">↻ molde deste estilo saiu com defeito? Refazer (~US$ 0,04 — repinta todos os clubes do estilo depois)</span>`:''}
      <button class="btn btn-sm" data-continuar style="align-self:flex-start;margin-top:6px">Continuar</button></div>`;
    if(n===2) return `<div class="col" style="gap:12px">
      <div class="g2" style="gap:12px">${campoCor('wz-color','Cor principal', wiz.corA)}${campoCor('wz-color2','Cor secundária', wiz.corB)}</div>
      <div id="wz-preview-cores"></div>
      <button class="btn btn-sm" data-continuar style="align-self:flex-start">Continuar</button></div>`;
    if(n===3){
      const mini = D.fotos[MOLDE_KEY+'|mini-'+wiz.estilo];
      return `<div class="col" style="gap:10px">
        <small style="font-size:12px;color:var(--dim2);line-height:1.6">Imagem só da camisa (sem jogador e sem escudo),
          com fundo transparente — vira a miniatura do campo e das páginas do clube. O molde é gerado
          por IA uma vez por estilo; a pintura nas cores é local e sai junto no salvar.</small>
        <div id="wz-mini-preview" style="width:150px;height:150px;display:flex;align-items:center;justify-content:center;border:1px dashed var(--bd2);border-radius:10px;background:repeating-conic-gradient(#0002 0 25%,transparent 0 50%) 0 0/16px 16px">
          ${mini?'<small style="font-size:11px;color:var(--dim3)">pintando…</small>':'<small style="font-size:11px;color:var(--dim3)">sem molde deste estilo</small>'}
        </div>
        ${editar && !mini ? `<button class="btn btn-sm btn-ghost" id="wz-mini-gerar" style="align-self:flex-start">Gerar molde da miniatura (~US$ 0,04, 1x por estilo)</button>`:''}
        <button class="btn btn-sm" data-continuar style="align-self:flex-start">Continuar</button></div>`;
    }
    if(n===4) return `<div class="col" style="gap:10px">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;border:1px dashed var(--bd2);border-radius:10px">
          ${escudoEscolhido()?`<img src="${h(escudoEscolhido())}" style="max-width:44px;max-height:44px;object-fit:contain">`:'<small style="color:var(--dim3)">—</small>'}</span>
        <small style="flex:1;font-size:12px;color:var(--dim2)">${wiz.escudoNovo?'Novo escudo enviado — entra no patch quando você aplicar no jogo.':(escudoAtual()?'Escudo atual do clube (do patch ou de fábrica).':'O clube ainda não tem escudo — envie um, ou gere na aba Escudos.')}</small>
      </div>
      ${editar?`<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <button class="btn btn-sm btn-ghost" id="wz-esc-btn">Enviar novo escudo</button>
        <input type="file" id="wz-esc-arq" accept=".png,.webp,.jpg,.jpeg,.svg" style="display:none">
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dim2);cursor:pointer">
          <input type="checkbox" id="wz-esc-nofundo"> Remover fundo</label>
        ${wiz.escudoNovo?'<span class="link" id="wz-esc-desfazer" style="font-size:12px">voltar ao atual</span>':''}
      </div>`:''}
      <button class="btn btn-sm" data-continuar style="align-self:flex-start">${escudoEscolhido()?'Manter e continuar':'Continuar sem escudo'}</button></div>`;
    if(n===5) return `<div class="col" style="gap:10px">
      <span style="display:flex;gap:8px">
        <input class="f" id="wz-patro" style="flex:1;min-width:0" placeholder="https://… ou envie um arquivo" value="${h(wiz.patroUrl)}">
        ${editar?`<button class="btn btn-sm btn-ghost" id="wz-patro-up" style="flex:0 0 auto" title="Enviar arquivo do logo">↥</button>
        <input type="file" id="wz-patro-arq" accept=".png,.webp,.jpg,.jpeg,.svg" style="display:none">`:''}
      </span>
      ${editar?`<button class="btn btn-sm btn-ghost" id="wz-patro-rmfundo" style="align-self:flex-start" ${wiz.patroUrl?'':'disabled'}>Remover fundo do logo</button>`:''}
      <small style="font-size:12px;color:var(--dim2)">O logo fica salvo com o uniforme deste clube e entra como camada — trocar depois não custa nada. "Remover fundo" apaga fundo sólido (branco/chapado) do logo atual.</small>
      <button class="btn btn-sm" data-continuar style="align-self:flex-start">${wiz.patroUrl?'Continuar':'Continuar sem patrocinador'}</button></div>`;
    if(n===6) return `<div class="col" style="gap:10px">
      <span style="display:flex;gap:8px">
        <input class="f" id="wz-fab" style="flex:1;min-width:0" placeholder="https://… ou envie um arquivo" value="${h(wiz.fabUrl)}">
        ${editar?`<button class="btn btn-sm btn-ghost" id="wz-fab-up" style="flex:0 0 auto" title="Enviar arquivo do logo do fabricante">↥</button>
        <input type="file" id="wz-fab-arq" accept=".png,.webp,.jpg,.jpeg,.svg" style="display:none">`:''}
      </span>
      ${editar?`<button class="btn btn-sm btn-ghost" id="wz-fab-rmfundo" style="align-self:flex-start" ${wiz.fabUrl?'':'disabled'}>Remover fundo do logo</button>`:''}
      <small style="font-size:12px;color:var(--dim2)">A marca do material esportivo — entra pequena, no lado oposto ao escudo, como camada (trocar não custa nada). Fica salva com o uniforme do clube.</small>
      <button class="btn btn-sm" data-continuar style="align-self:flex-start">${wiz.fabUrl?'Continuar':'Continuar sem fabricante'}</button></div>`;
    return `<div class="col" style="gap:10px">
      <small style="font-size:12.5px;color:var(--dim2);line-height:1.6">Confira a prévia ao lado. <b>Salvar rascunho</b> guarda o uniforme no Estúdio para continuar depois; <b>Salvar e aplicar no jogo</b> grava o uniforme do elenco${wiz.escudoNovo?' e põe o escudo novo no patch':''}.</small>
      ${editar?`<button class="btn btn-sm btn-ghost" id="wz-ajustar" style="align-self:flex-start" ${t()?'':'disabled'}>✥ Ajustar escudo e patrocínio na foto</button>`:''}
      <div id="wz-estado" style="font-size:12px;color:var(--dim2);min-height:16px"></div>
      ${editar?`<div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-ghost" id="wz-rascunho">${t()?'Salvar rascunho':'Gerar uniforme'}</button>
        <button class="btn" id="wz-aplicar">${t()?'Salvar e aplicar no jogo':'Gerar e aplicar no jogo'}</button>
      </div>`:''}</div>`;
  };

  const reguaHTML = PASSOS.map((p,ix) => {
    const n = ix+1, ativo = wiz.passo===n, feito = wiz.max>n || (ativo===false && wiz.max>=n);
    const podeIr = n<=wiz.max;
    return `<div style="display:grid;grid-template-columns:30px 1fr;gap:0 12px">
      <div style="display:flex;flex-direction:column;align-items:center">
        <span data-passo="${n}" style="width:26px;height:26px;flex:0 0 26px;border-radius:99px;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;
          ${ativo?'background:var(--verde2);color:#08210f':feito?'background:var(--bd2);color:var(--fg)':'border:1px solid var(--bd2);color:var(--dim3)'};${podeIr?'cursor:pointer':''}">${n}</span>
        ${n<PASSOS.length?`<span style="flex:1;width:2px;background:var(--bd2);margin:4px 0"></span>`:''}
      </div>
      <div style="padding-bottom:${ativo?'16px':'12px'};min-width:0">
        <div data-passo="${n}" style="display:flex;align-items:baseline;gap:8px;${podeIr?'cursor:pointer':''}">
          <b style="font-size:13.5px;${ativo?'':'color:var(--dim)'}">${h(p[0])}</b>
          <small style="font-size:11.5px;color:var(--dim3)">${ativo?h(p[1]):resumo(n)||''}</small>
        </div>
        ${ativo?`<div style="margin-top:10px">${corpoPasso(n)}</div>`:''}
      </div>
    </div>`;
  }).join('');

  abrirModal(`
    <h3>Uniforme — ${h(c.short||c.name)}</h3>
    <div class="duas-col">
      <div class="col" style="gap:0">${reguaHTML}</div>
      <div class="col" style="gap:10px;align-items:center">
        <div id="wz-preview" title="Clique para ver em tela expandida" style="cursor:zoom-in">
          ${(wiz.pv || t()) ? compostoCropHTML(wiz.pv || t().url, 250, 12, camadasWiz())
            : `<div style="width:250px;height:${Math.round(250*RATIO_FOTO)}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;border:1px dashed var(--bd2);border-radius:12px;background:#d9d9d9">
                <svg viewBox="0 0 100 100" style="width:150px;height:150px;opacity:.45">
                  <path fill="#8a8a8a" d="M35 12 L44 8 Q50 14 56 8 L65 12 L86 24 L79 42 L68 37 L68 92 L32 92 L32 37 L21 42 L14 24 Z"/>
                </svg>
                <small style="font-size:11.5px;color:#777;text-align:center;padding:0 14px;line-height:1.5"><b>O clube ainda não tem uniforme.</b><br>Escolha o estilo e as cores e conclua em "Gerar uniforme".</small>
              </div>`}
        </div>
        <small style="font-size:11.5px;color:var(--dim3);text-align:center;max-width:250px">
          ${wiz.pv?'Prévia pintada aqui no navegador — nada foi salvo ainda.':(t()?(at.rascunho?'Rascunho salvo.':'Uniforme atual do clube.'):'')}</small>
      </div>
    </div>
    <div class="acoes"><button class="btn btn-ghost" data-fechar>Fechar</button></div>`, 'xl');

  /* prévia local: com molde do estilo, pinta no canvas a cada mudança — zero IA.
     A CHAVE inclui a URL do molde: molde regenerado invalida a prévia antiga
     (era o que deixava o desenho velho preso na tela). */
  async function pintarPrevia(){
    const molde = D.fotos[MOLDE_KEY+'|'+wiz.estilo];
    if(!molde){
      if(wiz.pv){ if(wiz.pv.startsWith('blob:')) URL.revokeObjectURL(wiz.pv); wiz.pv=null; wiz.pvChave=''; abrir(); }
      return;
    }
    const chave = molde.url+'|'+wiz.estilo+'|'+wiz.corA+'|'+wiz.corB;
    if(wiz.pvChave === chave && wiz.pv) return;
    try{
      const blob = await pintarMolde(molde.url, wiz.corA, wiz.corB);
      if(wiz.pv && wiz.pv.startsWith('blob:')) URL.revokeObjectURL(wiz.pv);
      wiz.pv = URL.createObjectURL(blob); wiz.pvChave = chave;
      const alvo = el('wz-preview');
      if(alvo) alvo.innerHTML = compostoCropHTML(wiz.pv, 250, 12, camadasWiz());
    }catch(err){ console.warn('prévia local falhou:', err.message); }
  }
  pintarPrevia();

  el('wz-preview').onclick = () => {
    const base = wiz.pv || (t() && t().url); if(!base) return;
    const lado = Math.min(520, Math.floor(Math.min(innerWidth*0.9, innerHeight*0.85/RATIO_FOTO)));
    abrirLightboxHTML(compostoHTML(base, null, lado, 16, camadasWiz()));
  };
  document.querySelectorAll('[data-passo]').forEach(x => x.onclick = () => {
    const n = +x.dataset.passo; if(n<=wiz.max && n!==wiz.passo){ colher(); wiz.passo=n; abrir(); }
  });
  /* colhe os campos do passo ativo antes de navegar */
  function colher(){
    if(wiz.passo===1){ const r=document.querySelector('[name="wz-estilo"]:checked'); if(r) wiz.estilo=r.value; }
    if(wiz.passo===2){ if(el('wz-color')) wiz.corA=el('wz-color').value; if(el('wz-color2')) wiz.corB=el('wz-color2').value; }
    if(wiz.passo===5 && el('wz-patro')) wiz.patroUrl=el('wz-patro').value.trim();
    if(wiz.passo===6 && el('wz-fab')) wiz.fabUrl=el('wz-fab').value.trim();
  }
  document.querySelectorAll('[data-continuar]').forEach(b => b.onclick = () => {
    colher(); wiz.passo=Math.min(7,wiz.passo+1); wiz.max=Math.max(wiz.max,wiz.passo); abrir();
  });

  if(wiz.passo===1){
    document.querySelectorAll('[name="wz-estilo"]').forEach(r => r.onchange = () => { wiz.estilo=r.value; pintarPrevia(); });
    const rf = el('wz-refazer-molde');
    if(rf) rf.onclick = async () => {
      if(!confirm('Refazer o molde deste estilo (~US$ 0,04)? O molde atual é descartado; depois use "Repintar todos" na aba Uniformes para atualizar os clubes que já usam este estilo.')) return;
      rf.textContent = 'Refazendo o molde…';
      try{
        const del = await jogo('player_photos').delete()
          .eq('pack_id', ST.packId).eq('club_id', MOLDE_KEY).eq('jogador', wiz.estilo);
        if(del.error) throw new Error(erroMsg(del.error));
        delete D.fotos[MOLDE_KEY+'|'+wiz.estilo];
        await garantirMolde(item, wiz.estilo);
        registrar('estudio.molde.refazer', wiz.estilo, { pacote: ST.packId });
        toast('Molde refeito — a prévia já usa o novo.');
        abrir();
        return;
      }catch(err){ toast(err.message||'Falha ao refazer o molde.', true); rf.textContent = '↻ refazer o molde deste estilo'; }
    };
  }
  if(wiz.passo===2){
    ligarCores('wz-color','wz-color2','wz-preview-cores');
    ['wz-color','wz-color2','wz-color-hex','wz-color2-hex'].forEach(id => {
      const n=el(id); if(n) n.addEventListener('input', ()=>{ colher(); pintarPrevia(); });
    });
  }
  if(!editar) return;

  if(wiz.passo===3){
    const desenharMini = async () => {
      const mini = D.fotos[MOLDE_KEY+'|mini-'+wiz.estilo];
      const alvo = el('wz-mini-preview');
      if(!mini || !alvo) return;
      try{
        const chave = mini.url+'|'+wiz.corA+'|'+wiz.corB;
        if(wiz.pvMiniChave !== chave){
          const blob = await pintarMolde(mini.url, wiz.corA, wiz.corB);
          if(wiz.pvMini && wiz.pvMini.startsWith('blob:')) URL.revokeObjectURL(wiz.pvMini);
          wiz.pvMini = URL.createObjectURL(blob); wiz.pvMiniChave = chave;
        }
        alvo.innerHTML = `<img src="${h(wiz.pvMini)}" style="max-width:92%;max-height:92%;object-fit:contain">`;
      }catch(err){ alvo.innerHTML = '<small style="font-size:11px;color:var(--vermelho)">falha na pintura</small>'; }
    };
    desenharMini();
    const bg = el('wz-mini-gerar');
    if(bg) bg.onclick = async () => {
      bg.disabled = true; bg.textContent = 'Gerando molde…';
      try{ await garantirMoldeMini(wiz.estilo); toast('Molde da miniatura pronto.'); abrir(); return; }
      catch(err){ toast(err.message||'Falha ao gerar o molde.', true); }
      bg.disabled = false; bg.textContent = 'Gerar molde da miniatura (~US$ 0,04, 1x por estilo)';
    };
  }
  if(wiz.passo===4 && el('wz-esc-btn')){
    el('wz-esc-btn').onclick = () => el('wz-esc-arq').click();
    const desf = el('wz-esc-desfazer'); if(desf) desf.onclick = () => { wiz.escudoNovo=null; abrir(); };
    el('wz-esc-arq').onchange = async () => {
      let f = el('wz-esc-arq').files[0]; if(!f) return;
      if(f.size > 5*1024*1024) return toast('Arquivo acima de 5 MB.', true);
      let ext = (f.name.split('.').pop()||'png').toLowerCase();
      if(el('wz-esc-nofundo').checked){
        try{ const b2 = await removerFundoDeImagem(f); if(b2){ f=b2; ext='png'; } }
        catch(err){ return toast('Falha ao remover o fundo: '+err.message, true); }
      }
      const caminho = `${caminhoClube(item)}/escudo-upload-${Date.now()}.${ext}`;
      const up = await sb.storage.from('escudos').upload(caminho, f, { upsert:false, cacheControl:'31536000' });
      if(up.error) return toast(erroMsg(up.error), true);
      wiz.escudoNovo = sb.storage.from('escudos').getPublicUrl(caminho).data.publicUrl;
      toast('Escudo enviado — entra no patch quando você aplicar.'); abrir();
    };
  }
  if(wiz.passo===5 && el('wz-patro-up')){
    el('wz-patro').onchange = () => { colher(); pintarPrevia(); };
    el('wz-patro-up').onclick = () => el('wz-patro-arq').click();
    el('wz-patro-arq').onchange = async () => {
      const f = el('wz-patro-arq').files[0]; if(!f) return;
      if(f.size > 2*1024*1024) return toast('Logo acima de 2 MB.', true);
      const ext = (f.name.split('.').pop()||'png').toLowerCase();
      const caminho = `logos/${Date.now()}-${chaveNome(f.name||'logo').slice(0,24)||'logo'}.${ext}`;
      const up = await sb.storage.from('patrocinadores').upload(caminho, f, { upsert:false, cacheControl:'31536000' });
      if(up.error) return toast(erroMsg(up.error), true);
      wiz.patroUrl = sb.storage.from('patrocinadores').getPublicUrl(caminho).data.publicUrl;
      toast('Logo enviado.'); abrir();
    };
    const rmf = el('wz-patro-rmfundo');
    if(rmf) rmf.onclick = async () => {
      colher();
      if(!wiz.patroUrl) return toast('Defina o logo primeiro (URL ou arquivo).', true);
      rmf.disabled = true; rmf.textContent = 'Removendo fundo…';
      try{
        const r = await fetch(wiz.patroUrl);
        if(!r.ok) throw new Error('não consegui baixar o logo ('+r.status+')');
        const limpo = await removerFundoDeImagem(await r.blob());
        if(!limpo) throw new Error('falha ao processar a imagem');
        const caminho = `logos/${Date.now()}-semfundo.png`;
        const up = await sb.storage.from('patrocinadores').upload(caminho, limpo, { upsert:false, cacheControl:'31536000' });
        if(up.error) throw new Error(up.error.message);
        wiz.patroUrl = sb.storage.from('patrocinadores').getPublicUrl(caminho).data.publicUrl;
        toast('Fundo removido — versão limpa salva.');
        abrir();
        return;
      }catch(err){
        toast('Não deu para remover o fundo daqui ('+err.message+') — baixe o arquivo e envie pelo ↥.', true);
      }
      rmf.disabled = false; rmf.textContent = 'Remover fundo do logo';
    };
  }
  if(wiz.passo===6 && el('wz-fab-up')){
    el('wz-fab').onchange = () => { colher(); pintarPrevia(); };
    el('wz-fab-up').onclick = () => el('wz-fab-arq').click();
    el('wz-fab-arq').onchange = async () => {
      const f = el('wz-fab-arq').files[0]; if(!f) return;
      if(f.size > 2*1024*1024) return toast('Logo acima de 2 MB.', true);
      const ext = (f.name.split('.').pop()||'png').toLowerCase();
      const caminho = `fabricantes/${Date.now()}-${chaveNome(f.name||'logo').slice(0,24)||'logo'}.${ext}`;
      const up = await sb.storage.from('patrocinadores').upload(caminho, f, { upsert:false, cacheControl:'31536000' });
      if(up.error) return toast(erroMsg(up.error), true);
      wiz.fabUrl = sb.storage.from('patrocinadores').getPublicUrl(caminho).data.publicUrl;
      toast('Logo do fabricante enviado.'); abrir();
    };
    const rmfF = el('wz-fab-rmfundo');
    if(rmfF) rmfF.onclick = async () => {
      colher();
      if(!wiz.fabUrl) return toast('Defina o logo primeiro (URL ou arquivo).', true);
      rmfF.disabled = true; rmfF.textContent = 'Removendo fundo…';
      try{
        const r = await fetch(wiz.fabUrl);
        if(!r.ok) throw new Error('não consegui baixar o logo ('+r.status+')');
        const limpo = await removerFundoDeImagem(await r.blob());
        if(!limpo) throw new Error('falha ao processar a imagem');
        const caminho = `fabricantes/${Date.now()}-semfundo.png`;
        const up = await sb.storage.from('patrocinadores').upload(caminho, limpo, { upsert:false, cacheControl:'31536000' });
        if(up.error) throw new Error(up.error.message);
        wiz.fabUrl = sb.storage.from('patrocinadores').getPublicUrl(caminho).data.publicUrl;
        toast('Fundo removido — versão limpa salva.');
        abrir();
        return;
      }catch(err){ toast('Não deu para remover o fundo daqui ('+err.message+') — baixe o arquivo e envie pelo ↥.', true); }
      rmfF.disabled = false; rmfF.textContent = 'Remover fundo do logo';
    };
  }
  if(wiz.passo===7){
    const aj = el('wz-ajustar');
    /* no fluxo do UNIFORME o fundo do ajuste é o próprio uniforme (a prévia
       pintada ou o salvo) — nunca a foto de um jogador, que confunde a edição */
    if(aj) aj.onclick = () => {
      ST.patroTeste = wiz.patroUrl;
      modalAjustePatrocinio(item, abrir, wiz.pv || (t() && t().url));
    };

    async function salvar(aplicar){
      const bts = [el('wz-rascunho'), el('wz-aplicar')].filter(Boolean);
      bts.forEach(b=>b.disabled=true);
      try{
        let molde = D.fotos[MOLDE_KEY+'|'+wiz.estilo];
        if(!molde){
          if(!confirm('Primeiro uniforme neste estilo: o molde é gerado por IA UMA vez (~US$ 0,04) e todos os clubes deste estilo passam a ser pintados na hora, sem IA. Continuar?')){
            bts.forEach(b=>b.disabled=false); return;
          }
          el('wz-estado').textContent = 'Gerando o molde deste estilo (uma vez só)…';
          molde = await garantirMolde(item, wiz.estilo);
        }
        el('wz-estado').textContent = 'Pintando o molde nas cores do clube — sem IA, sem custo.';
        const blob = await pintarMolde(molde.url, wiz.corA, wiz.corB);
        const caminho = `${caminhoClube(item)}/uniforme-${Date.now()}.webp`;
        const up = await sb.storage.from('jogadores').upload(caminho, blob, { upsert:false, cacheControl:'31536000' });
        if(up.error) throw new Error(erroMsg(up.error));
        const url = sb.storage.from('jogadores').getPublicUrl(caminho).data.publicUrl;
        /* miniatura da camisa: pinta do molde-mini (se houver) e sobe junto */
        let miniUrl = (at.miniatura || null);
        const moldeMini = D.fotos[MOLDE_KEY+'|mini-'+wiz.estilo];
        if(moldeMini){
          try{
            el('wz-estado').textContent = 'Pintando a miniatura da camisa…';
            const bm = await pintarMolde(moldeMini.url, wiz.corA, wiz.corB);
            const cm = `${caminhoClube(item)}/miniatura-${Date.now()}.webp`;
            const um = await sb.storage.from('jogadores').upload(cm, bm, { upsert:false, cacheControl:'31536000' });
            if(!um.error) miniUrl = sb.storage.from('jogadores').getPublicUrl(cm).data.publicUrl;
          }catch(err){ console.warn('miniatura falhou:', err.message); }
        }
        const reg = { pack_id: ST.packId, club_id: String(c.id), jogador: TORSO_KEY, url,
          atributos: Object.assign({}, at, { recorte:'torso', estilo: wiz.estilo, cores:[wiz.corA, wiz.corB],
            molde:true, patroUrl: wiz.patroUrl||null, fabricanteUrl: wiz.fabUrl||null,
            miniatura: miniUrl, rascunho: !aplicar }) };
        const { error } = await jogo('player_photos').upsert(reg, { onConflict:'pack_id,club_id,jogador' });
        if(error) throw new Error(erroMsg(error));
        D.fotos[c.id+'|'+TORSO_KEY] = reg;
        if(aplicar && wiz.escudoNovo){
          const ed = D.edits[c.id];
          const linha = { pack_id: ST.packId, club_id: String(c.id), divisao: item.div, novo: !!(ed && ed.novo),
            patch: Object.assign({}, ed && ed.patch, { crest: wiz.escudoNovo }) };
          const rC = await jogo('pack_edits').upsert(linha, { onConflict:'pack_id,club_id' });
          if(rC.error) throw new Error(erroMsg(rC.error));
          D.edits[c.id] = linha;
          await jogo('data_packs').update({ atualizado_em:new Date().toISOString() }).eq('id', ST.packId);
        }
        ST.patroTeste = wiz.patroUrl || ST.patroTeste;
        registrar(aplicar?'estudio.uniforme.aplicar':'estudio.uniforme.rascunho', String(c.id), { pacote: ST.packId, estilo: wiz.estilo });

        /* UNIFORME NOVO = ELENCO ATUALIZADO: os rostos ficam guardados separados
           exatamente para isto — recosturar cada um sobre o uniforme novo, sem
           re-sortear visual. Só ao APLICAR, e sempre com custo confirmado. */
        if(aplicar){
          const comFoto = (c.squad||[]).map(p => D.fotos[c.id+'|'+p.n])
            .filter(f => f && f.atributos && f.atributos.recorte==='rosto');
          if(comFoto.length && confirm(`Uniforme aplicado. Recosturar as ${comFoto.length} fotos do elenco com o uniforme novo agora? ~US$ ${(comFoto.length*0.04).toFixed(2)} (os rostos são os mesmos — nada é sorteado de novo).`)){
            let ok=0, falhas=0;
            for(const f of comFoto){
              el('wz-estado').textContent = `Recosturando ${ok+falhas+1}/${comFoto.length} — ${f.jogador}…`;
              try{
                const nova = await gerarImagemIA('montagem', promptMontagem(), 'medium', [url, f.url],
                  caminhoClube(item)+'/jogadores/'+(chaveNome(f.jogador)||'jogador')+'-foto');
                const at2 = Object.assign({}, f.atributos, { montagem: nova });
                const r2 = await jogo('player_photos').update({ atributos: at2 })
                  .eq('pack_id', ST.packId).eq('club_id', String(c.id)).eq('jogador', f.jogador);
                if(r2.error) throw new Error(erroMsg(r2.error));
                f.atributos = at2; ok++;
              }catch(err){ falhas++; console.warn('remontagem falhou:', f.jogador, err.message); }
            }
            registrar('estudio.elenco.remontar', String(c.id), { pacote: ST.packId, geradas: ok, falhas });
            toast(`Elenco atualizado: ${ok} fotos recosturadas${falhas?`, ${falhas} falharam`:''}.`);
          }
        }
        toast(aplicar?'Uniforme aplicado no jogo.':'Rascunho salvo — continue quando quiser.');
        if(aplicar){ D.wiz=null; fecharModal(); pgEstudio(); }
        else abrir();
        return;
      }catch(err){ el('wz-estado').textContent=''; toast(err.message||'Falha ao salvar.', true); }
      bts.forEach(b=>b.disabled=false);
    }
    if(el('wz-rascunho')) el('wz-rascunho').onclick = () => salvar(false);
    if(el('wz-aplicar')) el('wz-aplicar').onclick = () => salvar(true);
  }
}
