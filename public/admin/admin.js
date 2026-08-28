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
  ST.tab = tab; renderNav(); menuLateral(false);
  const n = NAV.find(x=>x.id===tab);
  el('pg-tit').textContent = n.tit; el('pg-sub').textContent = n.sub;
  el('mob-tit').textContent = n.tit;
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
    jogo('ia_custos').select('tipo,custo_usd,criado_em')
  ]);
  if(ov.error) throw ov.error;
  if(lanc.error) throw lanc.error;
  D.overview = ov.data; D.lancamentos = lanc.data||[];
  D.iaCustos = ia.error ? [] : (ia.data||[]);

  const mes = new Date().toISOString().slice(0,7);

  /* GASTO DE IA VIRA DESPESA DO MÊS: uma linha única por mês em adm_lancamentos
     (categoria creditos_ia), com o total de ia_custos convertido em R$ e
     ATUALIZADA a cada abertura desta página — o extrato não vira poeira de
     microlançamentos e a soma de despesas passa a incluir a IA. */
  try{
    const iaMesUsd = D.iaCustos
      .filter(r => String(r.criado_em||'').slice(0,7) === mes)
      .reduce((t,r) => t + Number(r.custo_usd), 0);
    if(iaMesUsd > 0 && podeEditar('financas')){
      let cotSync = 0;
      try{
        const cc = JSON.parse(localStorage.getItem('rf_cotacao')||'null');
        if(cc && Date.now()-cc.t < 3600e3) cotSync = cc.v;
        else{
          const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
          cotSync = parseFloat((await r.json()).USDBRL.bid)||0;
          if(cotSync) localStorage.setItem('rf_cotacao', JSON.stringify({v:cotSync, t:Date.now()}));
        }
      }catch(e){}
      if(!cotSync) cotSync = 5.5;
      const DESC_IA = 'Gastos com IA — Estúdio de imagens';
      const centavos = Math.round(iaMesUsd * cotSync * 100);
      const existente = D.lancamentos.find(l =>
        l.tipo==='despesa' && l.descricao===DESC_IA && String(l.data).slice(0,7)===mes);
      if(!existente){
        const ins = await sb.from('adm_lancamentos').insert({
          data: mes+'-01', descricao: DESC_IA, categoria: 'creditos_ia',
          tipo: 'despesa', valor_centavos: centavos }).select().single();
        if(!ins.error && ins.data) D.lancamentos.unshift(ins.data);
      } else if(Math.abs(existente.valor_centavos - centavos) >= 1){
        const up = await sb.from('adm_lancamentos').update({ valor_centavos: centavos }).eq('id', existente.id);
        if(!up.error) existente.valor_centavos = centavos;
      }
    }
  }catch(e){ console.warn('sincronia da despesa de IA:', e && e.message); }
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
  if(titulo){
    titulo.classList.add('box-hd');
    /* FECHAR SEMPRE À MÃO: no telemóvel o modal ocupa a tela inteira — não há
       "fora do modal" para clicar, nem Esc para carregar. */
    const x = document.createElement('button');
    x.type = 'button'; x.className = 'box-x'; x.textContent = '✕';
    x.setAttribute('aria-label', 'Fechar'); x.title = 'Fechar';
    x.onclick = fecharModal;
    titulo.appendChild(x);
  }
  if(acoes){ acoes.classList.add('box-ft'); box.appendChild(acoes); }

  m.onclick = ev => { if(ev.target===m) fecharModal(); };
  m.querySelectorAll('[data-fechar]').forEach(b => b.onclick = fecharModal);
  document.addEventListener('keydown', escFechar);
}
function fecharModal(){ el('modais').innerHTML=''; document.removeEventListener('keydown', escFechar); }
function escFechar(e){ if(e.key==='Escape') fecharModal(); }

/* ============================ gaveta do telemóvel ============================ */
/* A navegação é a MESMA da barra lateral — abaixo de 900px o CSS tira a barra do
   fluxo e ela entra por cima. Fecha em tudo o que significa "já escolhi": item do
   menu (ver irPara), fundo escuro, Esc, e ao voltar para a largura de desktop. */
function menuLateral(abrir){
  const app = el('app'), bt = el('mob-menu');
  app.classList.toggle('menu-on', abrir);
  if(bt) bt.setAttribute('aria-expanded', String(!!abrir));
  document.body.style.overflow = abrir ? 'hidden' : '';
}
el('mob-menu').onclick = () => menuLateral(!el('app').classList.contains('menu-on'));
el('side-fundo').onclick = () => menuLateral(false);
document.addEventListener('keydown', e => {
  if(e.key==='Escape' && el('app').classList.contains('menu-on')) menuLateral(false);
});
addEventListener('resize', () => { if(innerWidth > 900) menuLateral(false); });

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
      ${[['clubes','Clubes'],['jogadores','Jogadores'],['competicoes','Competições'],['economia','Economia']]
        .map(([id,l])=>`<span class="${aba===id?'on':''}" data-aba="${id}" style="padding:9px 16px">${l}</span>`).join('')}
    </div>
    <div id="ed-aba"></div>`;

  document.querySelectorAll('[data-aba]').forEach(x => x.onclick = () => { ST.abaEditor=x.dataset.aba; pgEditor(); });
  ligarCabecalhoPatches(pack, editar);

  if(aba==='clubes')         abaClubes(editar);
  else if(aba==='jogadores') abaJogadores(editar);
  else if(aba==='economia')  abaEconomia();
  /* explícito de propósito: com um `else` aberto, uma aba nova cairia em
     Competições por descuido — foi o que já aconteceu no Estúdio. */
  else if(aba==='competicoes') abaCompeticoes(pack, editar);
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
        <button class="btn btn-sm btn-ghost" id="ed-csv"
          title="Planilha com todos os jogadores das Séries A, B, C e D do Brasil, com o patch em edição aplicado">⤓ CSV Brasil A–D</button>
        ${editar?'<button class="btn btn-sm" id="ed-novo">+ Clube</button>':''}
      </div>
      <div class="rowh" style="grid-template-columns:44px 1.6fr .9fr .7fr .7fr .8fr .9fr">
        <span></span><span>Clube</span><span>País</span><span style="text-align:center">Divisão</span>
        <span style="text-align:center">Força</span><span style="text-align:center">Elenco</span>
        <span style="text-align:right">Neste patch</span>
      </div>
      ${lista.length ? lista.slice(0,120).map(x => {
        const e = D.edits[x.c.id]; const cor = (e && e.patch && e.patch.color) || x.c.color || '#333';
        /* MOSTRA O QUE O JOGO MOSTRA: escudo, nome e cor do PATCH quando existem
           (a lista exibia sempre o de fábrica e parecia desatualizada). */
        const crest = (e && e.patch && e.patch.crest) || x.c.crest;
        const nome = (e && e.patch && (e.patch.short || e.patch.name)) || x.c.short || x.c.name;
        return `<div class="row" style="grid-template-columns:44px 1.6fr .9fr .7fr .7fr .8fr .9fr;cursor:pointer" data-clube="${h(x.c.id)}">
          <span>${crest
            ? `<img src="${h(crest)}" alt="" style="width:26px;height:26px;object-fit:contain">`
            : `<i class="av" style="width:26px;height:26px;border-radius:6px;background:${h(cor)};color:#fff;font-size:10px">${h(iniciais(nome))}</i>`}</span>
          <span style="min-width:0"><b style="display:block;font-size:13px;font-weight:600">${h(nome)}</b>
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
  el('ed-csv').onclick = baixarCSVJogadoresBrasil;
  document.querySelectorAll('[data-clube]').forEach(r => r.onclick = () => abrirClube(r.dataset.clube));
  if(editar) el('ed-novo').onclick = modalNovoClube;
}

/* ---------- CSV do elenco brasileiro (Séries A, B, C e D) ----------
   Planilha para conferir o catálogo fora do painel: uma linha por jogador dos 80
   clubes das quatro divisões do Brasil. Sai o que o JOGO mostra com o patch em
   edição aplicado por cima do arquivo de fábrica — mesma regra da lista de clubes
   — para a planilha não discordar da tela. */
const SERIES_BR = ['A','B','C','D'];

function clubeEfetivo(x){
  const ed = (D.edits||{})[x.c.id], p = (ed && ed.patch) || {};
  const c = Object.assign({}, x.c);
  for(const k of CAMPOS_CLUBE) if(p[k]!=null && p[k]!=='') c[k] = p[k];
  return c;
}
/* elenco com o diff do patch aplicado: quem foi removido sai, quem foi editado sai
   corrigido e os criados no patch entram no fim. Em clube CRIADO no patch, `squad`
   já vem do próprio patch (objeto de diffs, não lista) — daí o Array.isArray. */
function elencoEfetivo(x){
  const ed = (D.edits||{})[x.c.id], p = (ed && ed.patch) || {};
  const base = Array.isArray(x.c.squad) ? x.c.squad : [];
  const dif  = (p.squad && !Array.isArray(p.squad)) ? p.squad : {};
  const fora = new Set(p.squad_remover || []);
  const out = [];
  base.forEach(j => { if(!fora.has(j.n)) out.push(Object.assign({}, j, dif[j.n]||{})); });
  (p.squad_novos||[]).forEach(j => out.push(Object.assign({}, j)));
  return out;
}
/* ; como separador e BOM à frente: é o que o Excel em pt-BR abre em colunas sem
   pedir importação. Aspas duplicadas dentro do campo, como manda o RFC 4180. */
function csvCampo(v){
  const s = v==null ? '' : String(v);
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
}
function csvJogadoresBrasil(){
  /* NÃO EXISTE ID DE JOGADOR no catálogo, e não adianta procurar: o `p.pid` que
     o motor usa nasce em tempo de execução (attachAttrs, index.html), numerado
     por save — o mesmo jogador recebe pid diferente em cada save, e ele não
     está no bundle, nem em division_clubs, nem em pack_edits.

     A identidade do jogador aqui é CLUBE + NOME: é assim que o patch o
     encontra (`sq.find(x => x.n === nome)`). `jogador_chave` é essa identidade
     escrita de forma estável e colável — serve para casar linhas entre duas
     exportações e para referenciar o jogador num patch.

     `linha` existe porque a chave NÃO é garantidamente única: dois clubes já
     têm homônimos no elenco (Brusque e Marcílio Dias). Enquanto isso não for
     corrigido, é o número da linha que separa os dois. */
  const cab = ['linha','serie','clube_id','jogador_chave','clube','clube_curto','jogador',
               'posicao','setor','forca','idade','valor_brl','pe','numero','nacionalidade',
               'moral','energia','homonimo','no_patch'];
  const linhas = [cab.join(';')];
  let n = 0;
  (D.catalogo||[])
    .filter(x => x.pais==='Brasil' && SERIES_BR.includes(x.div))
    .sort((a,b) => SERIES_BR.indexOf(a.div) - SERIES_BR.indexOf(b.div)
                || String(a.c.short||a.c.name).localeCompare(String(b.c.short||b.c.name),'pt-BR'))
    .forEach(x => {
      const c = clubeEfetivo(x), ed = (D.edits||{})[x.c.id];
      const marca = !ed ? 'de fábrica' : (ed.novo ? 'criado aqui' : 'editado');
      const elenco = elencoEfetivo(x);
      /* marca quem tem homônimo NO MESMO CLUBE: para esses, a chave não basta */
      const vezes = {};
      elenco.forEach(p => { vezes[p.n] = (vezes[p.n]||0)+1; });
      elenco
        .sort((a,b) => (b.f||0)-(a.f||0))
        .forEach(p => {
          n++;
          const chave = String(c.id)+'|'+chaveNome(p.n);
          linhas.push([n, x.div, c.id, chave, c.name||c.short||'', c.short||'', p.n||'', p.p||'',
                       p.s||'', p.f??'', p.age??'', p.mv??'', p.ft||'', p.num||'',
                       p.nat||'', p.moral??'', p.energy??'', (vezes[p.n]>1?'sim':''), marca].map(csvCampo).join(';'));
        });
    });
  return { texto: '﻿' + linhas.join('\r\n') + '\r\n', jogadores: n };
}
function baixarTexto(nome, texto, mime){
  const url = URL.createObjectURL(new Blob([texto], { type: mime || 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function baixarCSVJogadoresBrasil(){
  const { texto, jogadores } = csvJogadoresBrasil();
  if(!jogadores) return toast('Nenhum jogador brasileiro no catálogo carregado.', true);
  const pack = (D.packs||[]).find(p => p.id===ST.packId) || {};
  const dia = new Date().toISOString().slice(0,10);
  baixarTexto(`retrofoot98-jogadores-brasil-A-D-${(pack.codigo||'patch').toLowerCase()}-${dia}.csv`,
              texto, 'text/csv;charset=utf-8');
  toast(`${num(jogadores)} jogadores exportados.`);
  registrar('dados.csv_jogadores', 'brasil-A-D', { pacote: ST.packId, jogadores });
}

/* ---------- aba JOGADORES ----------
   A mesma edição da ficha do clube, mas entrando pelo jogador: quem quer corrigir
   "a idade do Vitor Roque" não deveria precisar saber em que clube ele está. */
/* ============================================================================
   ABA ECONOMIA — como o dinheiro do jogo funciona, e a planilha para baixar.
   ----------------------------------------------------------------------------
   Todos os numeros saem das MESMAS tabelas que o jogo usa em runtime
   (public/src/data/rebalance.js), nao de constantes copiadas para ca'. Se a
   calibracao mudar la', esta pagina muda junto — copiar numero seria criar uma
   segunda verdade que envelhece calada.

   DUAS ESCALAS DE FORCA, e errar isto d[a] numero errado por 4x: os clubes da
   Serie A vem do bundle na escala ANTIGA (jogador sem `_rb`, clube sem
   `_rbOv`) e sao remapeados em runtime — o jogador por attachAttrs, o clube
   por clubOf. B/C/D ja' vem remapeados. Aqui a normalizacao e' explicita.
   ========================================================================= */
const ECON_DIVS = ['A','B','C','D'];
/* preço do ingresso: tabela FIXA por divisão (main.js TICKET_PRICE_BY_TIER).
   O jogador não escolhe — a UI antiga que deixava escolher foi removida. */
const ECON_INGRESSO = { A:25, B:20, C:15, D:10 };
/* prêmio da liga por faixa de classificação (data/prizes.js) */
const ECON_PREMIO_LIGA = {
  A:{campeao:20e6, vice:14e6, top4:10e6, alto:6e6, meio:3.5e6, baixo:2e6},
  B:{campeao:9e6,  vice:6e6,  top4:4e6,  alto:2.5e6, meio:1.5e6, baixo:0.9e6},
  C:{campeao:4e6,  vice:2.7e6,top4:1.8e6,alto:1.1e6, meio:0.7e6, baixo:0.4e6},
  D:{campeao:2e6,  vice:1.3e6,top4:0.9e6,alto:0.55e6,meio:0.35e6,baixo:0.2e6}
};
const forcaNova   = (p, div) => p._rb   ? p.f       : REBAL.force(p.f, div);
const overallNovo = (c, div) => c._rbOv ? c.overall : REBAL.force(c.overall, div);

/* a economia de UM clube, na escala em que o jogo de fato conta */
function economiaDoClube(item){
  const c = item.c, div = item.div;
  const sq = c.squad || [];
  const ov = overallNovo(c, div);
  const folha = sq.reduce((s,p) => s + REBAL.wage(forcaNova(p, div)), 0);
  const receita = REBAL.income(ov);
  const opex = receita * REBAL.OPEX;
  const faixa = REBAL.BUDGET[div] || REBAL.BUDGET.C;
  /* ESTÁDIO PELO OVERALL, não pela divisão. REBAL.stadiumCapForDivision existe
     (A 75k/B 50k/C 25k/D 10k) mas NÃO é chamada em lugar nenhum do runtime —
     quem semeia a capacidade é stadiumCap(overall). Usar a tabela por divisão
     aqui mostraria um estádio que o jogo nunca constrói. */
  const cap = REBAL.stadiumCap(ov);
  const ingresso = ECON_INGRESSO[div] || 10;
  /* bilheteria de UM jogo em casa. A ocupação real varia com preço, campanha e
     sorte (0,12 a 0,99); aqui fica a MÉDIA prática da fórmula do jogo para o
     preço fixo da divisão, com campanha neutra — é estimativa, e está rotulada
     como tal na planilha. */
  const priceFactor = Math.max(0.28, Math.min(1, 1.25 - ingresso/22));
  const ocupacao = Math.max(0.12, Math.min(0.99, 0.45*priceFactor + 0.35*(0.6+0.5*0.7) + 0.10));
  const bilheteria = Math.round(cap*ocupacao) * ingresso;
  return {
    div, id:c.id, nome:c.short||c.name, elenco:sq.length,
    overallBruto:c.overall, overall:ov,
    forcaMedia: sq.length ? sq.reduce((s,p)=>s+forcaNova(p,div),0)/sq.length : 0,
    valorElenco: sq.reduce((s,p)=>s+(Number(p.mv)||0),0),
    folha, receita, opex,
    bonusVitoria: receita*REBAL.WIN_BONUS,
    bonusEmpate:  receita*REBAL.DRAW_BONUS,
    /* a sobra por rodada conta a bilheteria só na METADE das rodadas (metade
       dos jogos é fora de casa) — é o mesmo desconto que o motor faz na CPU. */
    sobra: receita + bilheteria/2 - opex - folha,
    folhaSobreReceita: receita ? folha/receita : 0,
    caixaMin: faixa[0], caixaMax: faixa[1],
    estadio: cap, ingresso, ocupacao, bilheteria,
    ampliar: Math.round(4000000*(0.7 + cap/50000))
  };
}
function economiaBrasil(){
  return (D.catalogo||[])
    .filter(x => x.pais === 'Brasil' && ECON_DIVS.includes(x.div) && (x.c.squad||[]).length)
    .map(economiaDoClube)
    .sort((a,b) => ECON_DIVS.indexOf(a.div) - ECON_DIVS.indexOf(b.div) || b.overall - a.overall);
}

/* CSV com blocos: primeiro as regras (as tabelas do rebalance), depois clube a
   clube. Uma planilha que so' tivesse os clubes nao explicaria de onde vem
   nenhum numero; uma que so' tivesse as tabelas nao serviria para conferir. */
function csvEconomia(){
  const linhas = [];
  const L = (...c) => linhas.push(c.map(v => {
    const t = String(v == null ? '' : v);
    return /[";\r\n]/.test(t) ? '"'+t.replace(/"/g,'""')+'"' : t;
  }).join(';'));
  const n2 = v => (Math.round(v*100)/100).toString().replace('.', ',');   // Excel pt-BR

  L('RETROFOOT98 — ECONOMIA DO JOGO');
  L('Gerado em', new Date().toLocaleString('pt-BR'));
  L('Fonte', 'public/src/data/rebalance.js (as mesmas tabelas que o jogo usa)');
  L('Moeda', 'R$');
  L('');

  L('== CAIXA INICIAL POR DIVISAO ==');
  L('Sorteado uma vez por clube, na criacao do save (REBAL.budget).');
  L('Divisao','Minimo','Maximo');
  ECON_DIVS.forEach(d => { const b = REBAL.BUDGET[d]; L(d, b[0], b[1]); });
  L('');

  L('== RECEITA-BASE POR RODADA (TV + patrocinio) ==');
  L('Interpolada pelo overall do clube na escala nova (REBAL.income).');
  L('Overall','Receita por rodada');
  [[3,25e3],[8,60e3],[11,100e3],[15,150e3],[21,240e3],[25,480e3],[30,860e3],
   [34,1.09e6],[40,1.25e6],[45,1.75e6],[48,2.05e6],[52,2.60e6],[58,3.90e6],[70,7.2e6]]
    .forEach(([ov,v]) => L(ov, v));
  L('');

  L('== PERCENTUAIS SOBRE A RECEITA-BASE ==');
  L('Item','Fator','Observacao');
  L('Bonus de vitoria', REBAL.WIN_BONUS, 'somado a cada vitoria');
  L('Bonus de empate',  REBAL.DRAW_BONUS, 'somado a cada empate');
  L('Custo operacional (OPEX)', REBAL.OPEX, 'descontado toda rodada');
  L('');

  L('== SALARIO SEMANAL POR FORCA ==');
  L('Forca','Salario por semana');
  [5,10,15,20,25,30,35,40,45,50,60,70,80,90,99].forEach(f => L(f, REBAL.salary(f)));
  L('');

  L('== VALOR DE MERCADO POR FORCA (idade neutra) ==');
  L('Forca','Valor de mercado');
  [5,10,15,20,25,30,35,40,45,50,60,70,80,90,99].forEach(f => L(f, Math.round(REBAL.valueBase(f))));
  L('');

  L('== ESTADIO ==');
  L('A capacidade inicial vem do OVERALL do clube, nao da divisao (REBAL.stadiumCap).');
  L('Overall','Capacidade');
  [[3,10000],[8,10000],[19,25000],[31,50000],[44,75000],[55,82000],[70,88000]].forEach(([o,c]) => L(o,c));
  L('');
  L('Obras','Valor');
  L('Lugares por arquibancada', 5000);
  L('Limite por temporada', 10000, '2 arquibancadas');
  L('Custo', 'R$ 4.000.000 x (0,7 + capacidade/50000)');
  L('Exemplo: capacidade 20.000', Math.round(4000000*(0.7+20000/50000)));
  L('Exemplo: capacidade 50.000', Math.round(4000000*(0.7+50000/50000)));
  L('Exemplo: capacidade 75.000', Math.round(4000000*(0.7+75000/50000)));
  L('');

  L('== BILHETERIA ==');
  L('Renda = publico x preco. So entra quando o clube joga EM CASA.');
  L('Preco do ingresso e FIXO por divisao; o jogador nao escolhe.');
  L('Divisao','Preco do ingresso');
  ECON_DIVS.forEach(d => L(d, ECON_INGRESSO[d]));
  L('');
  L('Ocupacao = 0,45 x fator_preco + 0,35 x fator_campanha + ate 0,20 de sorte (limitada entre 12% e 99%)');
  L('fator_preco = 1,25 - preco/22, minimo 0,28');
  L('fator_campanha = 0,6 + aproveitamento x 0,7');
  L('Divisao','Fator preco','Ocupacao estimada (campanha neutra)');
  ECON_DIVS.forEach(d => {
    const pf = Math.max(0.28, Math.min(1, 1.25 - ECON_INGRESSO[d]/22));
    L(d, n2(pf), n2(Math.max(0.12, Math.min(0.99, 0.45*pf + 0.35*0.95 + 0.10))*100)+'%');
  });
  L('');
  L('A CPU usa regra propria: ocupacao fixa de 55% e preco 6..16 por overall (world-rules.js).');
  L('');

  L('== PREMIO DA LIGA (por posicao final) ==');
  L('Divisao','Campeao','Vice','3o-4o','Ate 35%','Ate 70%','Resto');
  ECON_DIVS.forEach(d => { const p = ECON_PREMIO_LIGA[d];
    L(d, p.campeao, p.vice, p.top4, p.alto, p.meio, p.baixo); });
  L('');

  L('== PREMIO DE COPA (por fase alcancada) ==');
  L('Competicao','Campeao','Vice','Semi','Quartas','Oitavas','Participacao');
  L('Copa nacional', 15e6, 8e6, 4e6, 2.5e6, 1.5e6, 0.8e6);
  L('Libertadores', 24e6, 12e6, 7e6, 5e6, 3e6, 1.5e6);
  L('Sul-Americana', 12e6, 6e6, 3.5e6, 2.5e6, 1.5e6, 0.7e6);
  L('Champions (intl)', 22e6, 13e6, 8e6, 5e6, 3e6, 2e6);
  L('Europa (intl)', 12e6, 7e6, 4e6, 2.5e6, 1.5e6, 1e6);
  L('');
  L('Copa do Brasil paga POR FASE, na hora (nao no fim):');
  L('Fase','Valor');
  [['Final (campeao)',28e6],['Vice',14e6],['Semifinal',9e6],['Quartas',4e6],
   ['Oitavas',2e6],['Terceira fase',1.5e6],['Segunda fase',0.8e6],['Primeira fase',0.4e6]]
   .forEach(([f,v]) => L(f,v));
  L('');

  L('== PREMIO DE ARTILHARIA (se o artilheiro for do seu clube) ==');
  L('Divisao','Valor');
  [['A',3e6],['B',1.5e6],['C',0.7e6],['D',0.4e6]].forEach(([d,v]) => L(d,v));
  L('');

  L('== CLUBE A CLUBE ==');
  L('Divisao','Clube','Elenco','Overall (bruto)','Overall (escala do jogo)','Forca media',
    'Valor do elenco','Folha semanal','Receita por rodada','OPEX por rodada',
    'Bonus por vitoria','Capacidade do estadio','Preco do ingresso',
    'Bilheteria por jogo em casa (est.)','Custo de ampliar','Sobra por rodada',
    'Folha / receita','Caixa inicial (min)','Caixa inicial (max)');
  const dados = economiaBrasil();
  dados.forEach(e => L(e.div, e.nome, e.elenco, e.overallBruto, n2(e.overall), n2(e.forcaMedia),
    Math.round(e.valorElenco), Math.round(e.folha), Math.round(e.receita), Math.round(e.opex),
    Math.round(e.bonusVitoria), e.estadio, e.ingresso, Math.round(e.bilheteria),
    e.ampliar, Math.round(e.sobra), n2(e.folhaSobreReceita*100)+'%',
    e.caixaMin, e.caixaMax));
  L('');

  L('== MEDIA POR DIVISAO ==');
  L('Divisao','Clubes','Elenco','Overall','Folha semanal','Receita por rodada','Folha / receita');
  ECON_DIVS.forEach(d => {
    const g = dados.filter(e => e.div === d); if(!g.length) return;
    const m = k => g.reduce((s,e) => s + e[k], 0) / g.length;
    L(d, g.length, n2(m('elenco')), n2(m('overall')), Math.round(m('folha')),
      Math.round(m('receita')), n2(m('folha')/m('receita')*100)+'%');
  });

  return { texto: '﻿' + linhas.join('\r\n') + '\r\n', clubes: dados.length };
}
function baixarCSVEconomia(){
  const { texto, clubes } = csvEconomia();
  if(!clubes) return toast('Catálogo ainda não carregou.', true);
  baixarTexto(`retrofoot98-economia-${new Date().toISOString().slice(0,10)}.csv`, texto, 'text/csv;charset=utf-8');
  toast(`Planilha com ${clubes} clubes baixada.`);
  registrar('dados.csv_economia', 'brasil-A-D', { pacote: ST.packId, clubes });
}

/* AS TABELAS VÊM DO JOGO, e o painel não as tinha.
   `rebalance.js` define window.REBAL e nunca foi carregado aqui — o admin é um
   site SEPARADO (raiz em public/admin/), então um caminho relativo funciona no
   dev do vite e dá 404 em produção. Carrega sob demanda e tenta as duas
   origens: primeiro a local (dev, e pega alteração ainda não publicada),
   depois o site do jogo.

   Copiar as tabelas para cá seria mais simples e MUITO pior: viraria uma
   segunda verdade que envelhece calada quando a calibração mudar. */
let _rebalCarregando = null;
function garantirREBAL(){
  if(window.REBAL) return Promise.resolve(true);
  if(_rebalCarregando) return _rebalCarregando;
  const origens = ['../src/data/rebalance.js', 'https://retrofoot.com.br/src/data/rebalance.js'];
  _rebalCarregando = (async () => {
    for(const url of origens){
      try{
        await new Promise((ok, erro) => {
          const t = document.createElement('script');
          t.src = url; t.onload = ok; t.onerror = () => erro(new Error(url));
          document.head.appendChild(t);
        });
        if(window.REBAL) return true;
      }catch(e){ /* tenta a próxima origem */ }
    }
    return false;
  })();
  return _rebalCarregando;
}

async function abaEconomia(){
  el('ed-aba').innerHTML = '<div class="vazio">Carregando as tabelas do jogo…</div>';
  if(!await garantirREBAL()){
    el('ed-aba').innerHTML = `<div class="erro">Não consegui carregar as tabelas de economia do jogo
      (<span class="mono">src/data/rebalance.js</span>). Esta aba lê os números direto do jogo em vez
      de guardar uma cópia — sem esse arquivo ela não tem o que mostrar.</div>`;
    return;
  }
  const dados = economiaBrasil();
  const M = v => 'R$ ' + (v>=1e6 ? (v/1e6).toFixed(2)+'M' : num(Math.round(v)));
  const porDiv = ECON_DIVS.map(d => {
    const g = dados.filter(e => e.div === d);
    if(!g.length) return null;
    const m = k => g.reduce((s,e) => s + e[k], 0) / g.length;
    const b = REBAL.BUDGET[d];
    return { d, n:g.length, ov:m('overall'), folha:m('folha'), rec:m('receita'),
             pct:m('folha')/m('receita'), caixa:`${M(b[0])}–${M(b[1])}`,
             cap:m('estadio'), ing:ECON_INGRESSO[d], bil:m('bilheteria') };
  }).filter(Boolean);

  const regra = (t, d) => `<div style="display:flex;gap:10px;align-items:flex-start">
      <b style="font-size:12.5px;font-weight:600;flex:0 0 150px">${h(t)}</b>
      <span style="font-size:12.5px;color:var(--dim2);line-height:1.55">${d}</span></div>`;

  el('ed-aba').innerHTML = `
    <div class="card card-p col" style="gap:12px">
      <div>
        <div class="tt">Como o dinheiro funciona</div>
        <div class="st">Todos os números saem de <span class="mono">rebalance.js</span> — as mesmas tabelas que o jogo
          usa em partida. Mudar a calibração lá muda esta página junto.</div>
      </div>
      <div class="col" style="gap:8px">
        ${regra('Entra toda rodada', 'A <b>receita-base</b> (TV + patrocínio), interpolada pelo overall do clube. Mais <b>'
          + Math.round(REBAL.WIN_BONUS*100) + '%</b> dela por vitória e <b>' + Math.round(REBAL.DRAW_BONUS*100)
          + '%</b> por empate. Bilheteria entra por cima, pelo público do jogo em casa.')}
        ${regra('Sai toda rodada', 'A <b>folha salarial</b> — soma do salário de <b>todo</b> o elenco, não só dos titulares — '
          + 'e o <b>custo operacional</b>, ' + Math.round(REBAL.OPEX*100) + '% da receita-base.')}
        ${regra('Salário', 'Vem só da <b>força</b> do jogador, por tabela. A curva é agressiva: '
          + M(REBAL.salary(50)) + '/semana com força 50, ' + M(REBAL.salary(70)) + ' com 70, ' + M(REBAL.salary(90)) + ' com 90.')}
        ${regra('Caixa inicial', 'Sorteado uma vez por clube na criação do save, numa faixa fixa por divisão.')}
        ${regra('Bilheteria', 'Só quando joga <b>em casa</b>: público × preço. O preço é <b>fixo por divisão</b> '
          + '(A R$25 · B R$20 · C R$15 · D R$10) e o jogador não escolhe. A ocupação varia com o preço, '
          + 'a campanha e um pouco de sorte — de 12% a 99% da capacidade.')}
        ${regra('Estádio', 'A capacidade sai do <b>overall</b> do clube, não da divisão. Ampliar custa '
          + '<b>R$ 4M × (0,7 + capacidade/50.000)</b> por arquibancada de 5.000 lugares, com teto de 2 por temporada.')}
        ${regra('Prêmios', 'Liga por posição final (campeão da Série A leva <b>R$ 20M</b>), copa por fase alcançada. '
          + 'A <b>Copa do Brasil paga na hora</b>, fase a fase, e não no fim. Artilheiro da divisão rende '
          + 'R$ 3M na A, se for do seu clube.')}
        ${regra('Não gera dinheiro', 'A aba <b>Patrocínio</b> do jogo é vitrine: os valores que ela mostra não entram '
          + 'no caixa. O patrocínio real já está embutido na receita-base. Também não existem sócio-torcedor '
          + 'nem merchandising, e o salário do treinador não é despesa do clube.')}
      </div>
    </div>

    <div class="card" style="overflow:hidden;margin-top:14px">
      <div class="card-h">
        <b>Por divisão</b>
        <div style="flex:1"></div>
        <button class="btn btn-sm" id="ec-csv">Baixar planilha (CSV)</button>
      </div>
      <div class="rowh" style="grid-template-columns:66px 52px 62px .95fr .95fr 78px 1.1fr 78px 56px .95fr">
        <span>Divisão</span><span style="text-align:right">Clubes</span><span style="text-align:right">Overall</span>
        <span style="text-align:right">Folha/sem</span><span style="text-align:right">Receita/rod</span>
        <span style="text-align:right">Folha/rec</span><span style="text-align:right">Caixa inicial</span>
        <span style="text-align:right">Estádio</span><span style="text-align:right">Ingr.</span>
        <span style="text-align:right">Bilheteria/jogo</span>
      </div>
      ${porDiv.map(r => `<div class="row" style="grid-template-columns:66px 52px 62px .95fr .95fr 78px 1.1fr 78px 56px .95fr">
          <span><b>Série ${r.d}</b></span>
          <span class="mono" style="text-align:right">${r.n}</span>
          <span class="mono" style="text-align:right">${r.ov.toFixed(0)}</span>
          <span class="mono" style="text-align:right">${M(r.folha)}</span>
          <span class="mono" style="text-align:right">${M(r.rec)}</span>
          <span class="mono" style="text-align:right;color:${r.pct>0.85?'var(--vermelho)':r.pct>0.75?'var(--ambar)':'var(--verde2)'}">${(r.pct*100).toFixed(0)}%</span>
          <span class="mono" style="text-align:right">${r.caixa}</span>
          <span class="mono" style="text-align:right">${num(Math.round(r.cap))}</span>
          <span class="mono" style="text-align:right">R$ ${r.ing}</span>
          <span class="mono" style="text-align:right">${M(r.bil)}</span>
        </div>`).join('')}
      <div style="padding:12px 20px;font-size:12px;color:var(--dim2);line-height:1.55;border-top:1px solid var(--bd)">
        <b>Folha/receita</b> é quanto da receita-base o clube já gasta em salário antes de qualquer outra despesa.
        Acima de 85% o clube depende de bilheteria e prêmio para fechar a rodada no azul.
        A planilha traz isto clube a clube, mais as tabelas de salário, valor de mercado e receita.
      </div>
    </div>`;

  const bt = el('ec-csv');
  if(bt) bt.onclick = baixarCSVEconomia;
}

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
  /* o escudo EFETIVO é o do patch (o que o jogo mostra), não o de fábrica */
  const crestAtual = (ed && ed.patch && ed.patch.crest) || c.crest || '';
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
      <label class="f">Escudo
        <input class="f" id="c-crest" value="${h(crestAtual)}" readonly
          title="O escudo é gerenciado na aba Escudos — aqui é só leitura" style="opacity:.8">
      </label>
      ${editar?`<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <button class="btn btn-sm btn-ghost" id="c-escudo-btn">Alterar escudo (aba Escudos)</button>
        <span id="c-escudo-prev">${crestAtual?`<img src="${h(crestAtual)}" style="width:28px;height:28px;object-fit:contain">`:''}</span>
        <small style="font-size:11.5px;color:var(--dim3)">lá o arquivo é padronizado em WebP 512×512</small>
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

  /* UMA PORTA SÓ: o escudo é enviado/tratado no modal da aba Escudos, que grava
     direto no patch; ao voltar, a ficha do clube reabre já com o escudo novo. */
  el('c-escudo-btn').onclick = () => modalEscudoIA(item, () => abrirClube(c.id));
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
/* ===== CONTROLE DE QUALIDADE DA MONTAGEM (sem custo) =====
   O defeito recorrente é a cabeça sair solta ou nem aparecer. Isso dá para
   VER por pixel: no quadro canônico a coluna central tem que ir do topo da
   cabeça até a camisa SEM uma faixa de fundo no meio, e a cabeça precisa
   começar na metade de cima. Assim o lote refaz sozinho o que saiu torto,
   em vez de você conferir foto a foto. */
async function validarMontagem(url){
  try{
    const img = await new Promise((ok, erro) => {
      const i = new Image(); i.crossOrigin = 'anonymous';
      i.onload = () => ok(i); i.onerror = () => erro(new Error('cors'));
      i.src = url + (url.includes('?') ? '&' : '?') + 'v=1';
    });
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, W, H).data;
    const cor = (x,y) => { const i=((y*W)+x)*4; return [d[i],d[i+1],d[i+2]]; };
    /* o fundo é o cinza de estúdio — e ele só existe garantido na FAIXA DE CIMA,
       nos lados de fora da cabeça. Os cantos de baixo são o próprio jogador (o
       enquadramento é do peito pra cima), então incluí-los envenena a medida. */
    const amostras = [];
    [0.01, 0.03, 0.06].forEach(fy => [0.02, 0.06, 0.10, 0.90, 0.94, 0.98].forEach(fx =>
      amostras.push(cor(Math.round(W*fx), Math.round(H*fy)))));
    const fundo = [0,1,2].map(k => {
      const v = amostras.map(c=>c[k]).sort((a,b)=>a-b);
      return v[Math.floor(v.length/2)];
    });
    const eFundo = c => Math.abs(c[0]-fundo[0])+Math.abs(c[1]-fundo[1])+Math.abs(c[2]-fundo[2]) < 60;

    /* perfil por linha: onde começa e onde termina o jogador em cada altura.
       Ignoro sujeirinha solta exigindo uma corrida mínima de pixels opacos. */
    const passo = Math.max(1, Math.round(H/400));
    const MIN = Math.max(3, Math.round(W*0.02));
    const perfil = [];
    for(let y=0; y<H; y+=passo){
      let ini=-1, fim=-1, corrida=0;
      for(let x=0; x<W; x++){
        if(!eFundo(cor(x,y))){
          corrida++;
          if(corrida>=MIN){ if(ini<0) ini = x-corrida+1; fim = x; }
        } else corrida = 0;
      }
      perfil.push({ y, ini, fim, larg: ini<0 ? 0 : (fim-ini+1) });
    }
    const cheias = perfil.filter(r=>r.larg>0);
    if(!cheias.length) return { ok:false, motivo:'imagem vazia' };

    const f = v => v/H, fw = v => v/W;

    /* ===== O GABARITO DEIXOU DE REPROVAR =====
       Havia aqui cinco medidas contra o ENQ (topo da cabeça, largura da
       cabeça, ombros, braço na borda). Elas existiam por UM motivo: o escudo
       era posto por coordenada fixa, então todo jogador precisava sair no
       mesmo quadro. Com o escudo arrastável por foto, essa amarra perdeu a
       razão de ser.

       E a régua estava torta. Das 677 fotos marcadas, 621 caíram na mesma
       regra — a largura da cabeça. Medida contra medida: o conferidor lia
       entre 40% e 46% em TODAS as 621, e o gabarito aceitava de 19% a 35%.
       Nenhuma imagem podia passar; a menor leitura foi 36%. O alvo não
       existia, e as fotos reprovadas estão boas (conferido a olho).

       Fica só o que denuncia imagem INUTILIZÁVEL — quadro vazio e cabeça
       solta no ar. Essas duas nunca deram falso positivo em 715 fotos, e são
       o defeito que motivou a conferência.

       As medidas continuam sendo CALCULADAS e devolvidas: custam nada (é
       canvas local) e servem para você olhar. Só não reprovam mais nada. */

    const topo = f(cheias[0].y);
    const faixaCab = perfil.filter(r => r.y > cheias[0].y && f(r.y) < ENQ.topoCabeca+ENQ.altCabeca);
    const largCab = fw(Math.max(0, ...faixaCab.map(r=>r.larg)));
    const noPeito = perfil.find(r => f(r.y) >= ENQ.linhaPeito) || perfil[perfil.length-1];
    const largOmb = fw(noPeito.larg);

    /* cabeça descolada: vão de fundo entre a cabeça e a gola. É o defeito de
       verdade — a montagem que sai com a cabeça flutuando. */
    let vazio=0, maiorVazio=0;
    perfil.filter(r => r.y>cheias[0].y && f(r.y) < 0.75).forEach(r=>{
      if(r.larg===0){ vazio++; maiorVazio=Math.max(maiorVazio,vazio); } else vazio=0;
    });
    if(f(maiorVazio*passo) > 0.03)
      return { ok:false, motivo:`cabeça descolada (vão de ${pc(f(maiorVazio*passo))})` };

    return { ok:true, medidas:{ topo:pc(topo), cabeca:pc(largCab), ombros:pc(largOmb) } };
  }catch(e){ return { ok:true, motivo:'não deu para validar ('+e.message+')' }; }
}

/* CONFIRMAÇÃO COM A CARA DO PAINEL (substitui o confirm() nativo, que parece
   erro do navegador e não explica o que vai acontecer). Devolve Promise<bool>;
   abre POR CIMA do modal em curso, sem substituí-lo. */
function rfConfirm(o){
  o=o||{};
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:10001;background:#000b;display:flex;align-items:center;justify-content:center;padding:24px';
    ov.innerHTML = `
      <div class="card" style="max-width:${o.w||520}px;width:100%;padding:22px 24px;display:flex;flex-direction:column;gap:14px">
        <div>
          <div class="tt" style="font-size:15px">${h(o.titulo||'Confirmar')}</div>
          ${o.texto?`<div class="st" style="line-height:1.65;margin-top:6px">${o.texto}</div>`:''}
        </div>
        ${o.detalhe?`<div class="st" style="background:var(--card2);border:1px solid var(--bd2);border-radius:10px;padding:10px 12px;line-height:1.6">${o.detalhe}</div>`:''}
        <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
          <button class="btn btn-ghost" data-rf-nao style="flex:0 0 auto">${h(o.nao||'Cancelar')}</button>
          <button class="btn ${o.perigo?'':''}" data-rf-sim style="flex:0 0 auto${o.perigo?';background:var(--vermelho);color:#fff':''}">${h(o.sim||'Confirmar')}</button>
        </div>
      </div>`;
    const fecha = (v) => { ov.remove(); document.removeEventListener('keydown', esc, true); resolve(v); };
    const esc = e => { if(e.key==='Escape'){ e.stopImmediatePropagation(); fecha(false); } };
    ov.onclick = e => { if(e.target===ov) fecha(false); };
    document.addEventListener('keydown', esc, true);
    document.body.appendChild(ov);
    ov.querySelector('[data-rf-nao]').onclick = () => fecha(false);
    ov.querySelector('[data-rf-sim]').onclick = () => fecha(true);
    ov.querySelector('[data-rf-sim]').focus();
  });
}

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

    /* COR DE FUNDO: histograma (quantizado) dos pixels OPACOS da borda. Se a
       borda é toda transparente (imagem já padronizada), atravessa o
       transparente a partir da borda e usa os primeiros opacos que encontrar —
       é o que faz o "remover fundo" funcionar DEPOIS da conversão 512×512. */
    const quant = i => ((px[i]>>4)<<8) | ((px[i+1]>>4)<<4) | (px[i+2]>>4);
    const desquant = k => [((k>>8)&15)*17, ((k>>4)&15)*17, (k&15)*17];
    const hist = new Map();
    const somaBorda = i => { if(px[i+3] >= 8) hist.set(quant(i), (hist.get(quant(i))||0)+1); };
    for(let x=0; x<W; x++){ somaBorda(x*4); somaBorda(((H-1)*W+x)*4); }
    for(let y=0; y<H; y++){ somaBorda(y*W*4); somaBorda((y*W+W-1)*4); }
    let bg = null;
    if(hist.size){ let mk=null, mv=0; for(const [k,v] of hist) if(v>mv){ mv=v; mk=k; } bg = desquant(mk); }
    else{
      const visto = new Uint8Array(W*H), fila = [], h2 = new Map();
      for(let x=0; x<W; x++){ fila.push(x, (H-1)*W+x); }
      for(let y=0; y<H; y++){ fila.push(y*W, y*W+W-1); }
      while(fila.length){
        const p = fila.pop(); if(visto[p]) continue; visto[p] = 1;
        const i = p*4;
        if(px[i+3] >= 8){ h2.set(quant(i), (h2.get(quant(i))||0)+1); continue; }
        const x = p%W, y = (p/W)|0;
        if(x>0) fila.push(p-1); if(x<W-1) fila.push(p+1);
        if(y>0) fila.push(p-W); if(y<H-1) fila.push(p+W);
      }
      let mk=null, mv=0; for(const [k,v] of h2) if(v>mv){ mv=v; mk=k; }
      if(mk==null) return await new Promise(ok => cv.toBlob(ok, 'image/png'));
      bg = desquant(mk);
    }

    /* INUNDAÇÃO da borda por (transparente OU perto do fundo): o transparente é
       corredor, o perto-do-fundo é apagado. Branco DENTRO do desenho sobrevive. */
    const TOL = 120;
    const perto = i => (Math.abs(px[i]-bg[0]) + Math.abs(px[i+1]-bg[1]) + Math.abs(px[i+2]-bg[2])) <= TOL;
    const visto2 = new Uint8Array(W*H), fila2 = [];
    for(let x=0; x<W; x++){ fila2.push(x, (H-1)*W+x); }
    for(let y=0; y<H; y++){ fila2.push(y*W, y*W+W-1); }
    while(fila2.length){
      const p = fila2.pop(); if(visto2[p]) continue; visto2[p] = 1;
      const i = p*4;
      const transp = px[i+3] < 8;
      if(!transp && !perto(i)) continue;
      if(!transp) px[i+3] = 0;
      const x = p%W, y = (p/W)|0;
      if(x>0) fila2.push(p-1); if(x<W-1) fila2.push(p+1);
      if(y>0) fila2.push(p-W); if(y<H-1) fila2.push(p+W);
    }
    cx.putImageData(dados, 0, 0);
    return await new Promise(ok => cv.toBlob(ok, 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

/* ===== pílula de progresso: enquanto qualquer geração está no ar, uma pílula
   fixa no rodapé diz a etapa e o tempo decorrido. Várias em paralelo somam. ===== */
const IA_ROTULOS = {
  escudo:   'Desenhando o escudo…',
  torso:    'Gerando o uniforme…',
  rosto:    'Gerando o rosto do jogador…',
  jogador:  'Gerando a foto do jogador…',
  montagem: 'Costurando rosto e uniforme…'
};
const IA_FILA = [];
let iaTimer = null;
function iaDesenha(){
  let pill = el('ia-status');
  if(!IA_FILA.length){
    if(pill) pill.remove();
    if(iaTimer){ clearInterval(iaTimer); iaTimer = null; }
    return;
  }
  if(!pill){ pill = document.createElement('div'); pill.id = 'ia-status'; document.body.appendChild(pill); }
  const atual = IA_FILA[IA_FILA.length-1];
  const seg = Math.round((Date.now()-atual.inicio)/1000);
  pill.innerHTML = `<span class="giro"></span><span>${h(atual.rotulo)}</span>
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

/* recusa por excesso de chamadas — não custa token, mas perde o jogador se
   a gente desistir na hora. Como dá para rodar vários clubes em abas ao mesmo
   tempo, vale esperar e tentar de novo em vez de marcar como falha. */
const ehLimiteDeChamadas = m => /rate.?limit|429|too many requests|slow down/i.test(String(m||''));

async function gerarImagemIA(tipo, prompt, qualidade, imagens, nome, rotulo){
  const carga = iaComeca(rotulo || IA_ROTULOS[tipo] || 'Gerando imagem…');
  try{
    for(let tent = 1; ; tent++){
      const { data, error } = await sb.functions.invoke('generate-image',
        { body:{ tipo, prompt, qualidade: qualidade||'medium', imagens, nome } });
      if(error){
        let msg = error.message || 'Falha ao gerar a imagem.';
        try{ const j = await error.context.json(); if(j && j.error) msg = j.error; }catch(_e){}
        if(ehLimiteDeChamadas(msg) && tent < 5){
          const espera = 4000 * tent;   /* 4s, 8s, 12s, 16s */
          carga.rotulo = `Fila cheia na OpenAI — tento de novo em ${espera/1000}s…`;
          iaDesenha();
          await new Promise(r=>setTimeout(r, espera));
          continue;
        }
        throw new Error(msg);
      }
      if(!data || !data.url) throw new Error((data && data.error) || 'A função não devolveu imagem.');
      return data.url;
    }
  } finally { iaTermina(carga); }
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
/* ===== GABARITO DE ENQUADRAMENTO =====
   Todo jogador é fotografado no MESMO quadro: mesma altura de cabeça, mesma
   linha de peito, mesmo pescoço, mesma folga dos braços até a borda. É isso que
   faz o escudo cair sempre no mesmo ponto da camisa — a posição do escudo é
   guardada em porcentagem do quadro, então quadro igual = escudo igual.
   Frações do quadro retrato 2:3 (H = 1,5 × L). Estes números alimentam os
   prompts e a conferência por pixel; mexer aqui muda os dois juntos. */
const ENQ = {
  topoCabeca: 0.06,   // topo da cabeça a 6% da borda de cima
  altCabeca:  0.26,   // coroa→queixo = 26% da altura  (queixo em 32%)
  linhaGola:  0.40,   // base do pescoço / gola em 40%  (pescoço = 8%)
  linhaPeito: 0.62,   // linha do peito (onde o escudo mora) em 62%
  largCabeca: 0.27,   // largura da cabeça = 27% da largura
  largOmbros: 0.66,   // ombro a ombro = 66% da largura
  folgaBraco: 0.08    // braço nunca encosta: 8% de fundo de cada lado
};
const pc = f => Math.round(f*100)+'%';

/* a mesma especificação escrita para o modelo — sai igual no torso e na montagem */
function textoEnquadramento(){
  return [
    `FIXED FRAMING SPEC — this exact geometry is mandatory and identical for every player,`,
    `because a club crest is overlaid later at fixed coordinates:`,
    `PORTRAIT 2:3 frame.`,
    `Top of the head at exactly ${pc(ENQ.topoCabeca)} from the top edge.`,
    `Head from crown to chin exactly ${pc(ENQ.altCabeca)} of the frame height and ${pc(ENQ.largCabeca)} of the frame width — same head size for every player, never larger, never smaller.`,
    `Base of the neck / jersey collar line at exactly ${pc(ENQ.linhaGola)} from the top — the neck is always the same length.`,
    `Chest line at ${pc(ENQ.linhaPeito)} from the top.`,
    `Shoulder-to-shoulder width exactly ${pc(ENQ.largOmbros)} of the frame width, centered horizontally.`,
    `The arms NEVER touch the left or right edge: keep at least ${pc(ENQ.folgaBraco)} of empty studio background on each side, all the way down.`,
    `Identical crop and zoom for every player — treat every player as having the same torso height and the same neck length. Do not zoom in or out to fit a taller or shorter player.`
  ].join(' ');
}

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
    textoEnquadramento(),
    `The upper ${pc(ENQ.linhaGola)} of the frame is NOTHING but plain light gray studio background, left completely empty where the head will be added later — the jersey starts at the collar line and fills the frame below it.`,
    'Soft professional studio lighting, sharp focus, DSLR photo quality.'
  ].join(' ');
}
/* a MONTAGEM IA costura rosto + uniforme numa foto só (images/edits com as duas
   imagens de entrada) — é ela que fica realmente natural. As camadas CSS seguem
   como prévia barata; a montagem salva em atributos.montagem é a foto final. */
/* ===== O CAMINHO DE UMA CHAMADA SO' =====
   Hoje uma foto custa DUAS imagens pagas: o rosto recortado e a montagem dele
   sobre o uniforme (US$ 0,114). Isto faz o mesmo em UMA (US$ 0,070): manda o
   torso do clube como entrada e descreve o rosto por texto, em vez de gerar o
   rosto antes e costurar depois.

   O que se perde: o rosto recortado deixa de existir como peca reaproveitavel.
   Na transferencia de clube, em vez de recosturar o rosto guardado, manda-se a
   FOTO ANTIGA como referencia — mesmo numero de chamadas, mesma conta.

   Existe para ser COMPARADO lado a lado com o caminho de duas chamadas antes
   de trocar nada: a diferenca real e' visual, nao aritmetica. */
/* RECOSTURA A PARTIR DA FOTO INTEIRA. Com o rosto recortado, promptMontagem
   diz "a segunda imagem e' a cabeca". Nas fotos do metodo de uma chamada nao
   existe rosto solto — a segunda imagem e' o retrato COMPLETO, com a camisa
   antiga. Este prompt diz isso, senao o modelo traz a camisa velha junto. */
function promptRecostura(){
  return [
    'Combine the two input images into ONE photorealistic official club media day portrait:',
    'the FIRST image is the torso wearing the jersey, the SECOND image is a portrait of the player.',
    'Take ONLY THE HEAD AND FACE from the second image — same face, same hair, same skin tone, do not change the identity —',
    'and place it naturally on the torso from the first image. IGNORE the jersey in the second image completely.',
    'Correct head size and position for the body, seamless neck-to-collar transition, unified soft studio lighting.',
    'CRITICAL: do NOT move, scale, crop or reframe the jersey of the FIRST image — it must stay in EXACTLY the same position, size, pattern and colors, and completely clean (no crest, sponsor, text or logos added).',
    textoEnquadramento(),
    'Plain light gray studio background, facing the camera, sharp focus, DSLR quality.'
  ].join(' ');
}

/* ===== ROSTO ANCORADO NO MOLDE (metodo C) =====
   O promptRosto de sempre pede "cabeca e pescoco ocupando ~75% do quadro" e
   nao diz ONDE a cabeca fica dentro dele. Isso serve para a IA costurar
   depois, e e' exatamente o que impede colar o recorte direto no uniforme: a
   cabeca sai grande demais e em altura imprevisivel (testei seis calibracoes
   de CSS e nenhuma fechou — o defeito e' de origem, nao de folha de estilo).

   Aqui o quadro do rosto e' ANCORADO, espelhando o gabarito ENQ:
     topo da cabeca ....... 8%  do quadro
     base do pescoco ...... 58% do quadro   (cabeca+pescoco = 50%)
     largura da cabeca .... 26% do quadro
   Com isso o encaixe deixa de ser tentativa e vira aritmetica:
     altura de render = (linhaGola - topoCabeca) / 0,50 = 34/50 = 68%
     topo de render   = topoCabeca - 0,08 x 0,68        = 0,6%
   e a cabeca sai com ENCAIXE_LARG_CABECA (33,07%) da largura do composto. */
const ROSTO_MOLDE = { topo:0.08, base:0.58, larg:0.26 };
const rostoEncaixe = () => {
  const span = ROSTO_MOLDE.base - ROSTO_MOLDE.topo;
  const altura = (ENQ.linhaGola - ENQ.topoCabeca) / span;
  return { altura, topo: ENQ.topoCabeca - ROSTO_MOLDE.topo*altura };
};
function promptRostoMolde(item, p, at){
  const pais = item.pais==='Brasil' ? 'Brazil' : item.pais;
  const cab = /bald/.test(at.cabelo) ? at.cabelo : `${at.cabelo}, ${at.corCab} hair`;
  return [
    `Hyper-realistic studio photograph cutout: ONLY the head and neck of a fictional professional football player from ${pais}, isolated on a fully transparent background.`,
    `${at.idade} years old, ${at.pele}, ${cab}, ${at.barba}, ${at.sorriso}, ${at.brinco}, ${at.tattoo}.`,
    'Facing the camera directly, official club media day photo style, soft professional studio lighting, sharp focus, DSLR quality.',
    'The cutout ends in a clean straight horizontal cut at the base of the neck — NO shoulders, NO clothing, NO jersey, NO collar, NO background, nothing besides the head and neck.',
    'EXACT FRAMING, mandatory and identical for every player, because the head is composited onto a jersey at fixed coordinates:',
    `Square frame. Top of the head at exactly ${pc(ROSTO_MOLDE.topo)} from the top edge.`,
    `The straight cut at the base of the neck at exactly ${pc(ROSTO_MOLDE.base)} from the top edge.`,
    `Head width exactly ${pc(ROSTO_MOLDE.larg)} of the frame width, centered horizontally.`,
    'Everything outside the head and neck is fully transparent, including the whole lower half of the frame.',
    'This is a completely fictional person, not resembling any real footballer or celebrity.'
  ].join(' ');
}
/* ===== OS MOLDES NASCERAM FORA DO GABARITO =====
   MEDIDO nos cinco, por deteccao de pixel magenta/ciano no eixo central: a
   gola cai entre 16,1% e 19,9% da altura, quando ENQ.linhaGola manda 40%. O
   modelo ignorou a especificacao de enquadramento ao gerar os moldes (ela
   esta' la', em textoEnquadramento) — e a pintura por clube so' recolore,
   fielmente, entao os 79 uniformes herdaram o mesmo desvio.

   A montagem por IA disfarca isso porque reenquadra a imagem inteira. A
   composicao por CSS nao tem como: sem espaco vazio em cima, a cabeca cai
   por cima da camisa.

   Conserto SEM GERAR NADA: desce o torso ate' a gola bater nos 40%. Por
   estilo, porque eles divergem entre si em quase 4 pontos. Se um molde for
   refeito, remedir e atualizar aqui. */
const MOLDE_GOLA = { diagonal:0.161, horizontal:0.194, lisa:0.190, mangas:0.199, vertical:0.165 };
const MOLDE_GOLA_PADRAO = 0.182;   // media, para estilo desconhecido
const golaDoEstilo = estilo => MOLDE_GOLA[estilo] != null ? MOLDE_GOLA[estilo] : MOLDE_GOLA_PADRAO;
/* ===== O ENCAIXE, MEDIDO A MAO =====
   Os dois numeros abaixo nao sao estimativa: sairam da bancada de encaixe,
   com a cabeca arrastada ate' assentar e a medida lida na tela.

     largura da cabeca : 33,07% da largura do quadro   (a formula usava
       ENQ.largCabeca = 27% e a cabeca ficava 18% pequena demais)
     ancora vs. gola   : 0,00%  — a base do pescoco ENCOSTA na linha da gola
       (GOLA_SOBREPOR era 0,05, que a empurrava 4,3% para dentro da camisa)

   Ficam SEPARADOS de ENQ de proposito: ENQ tambem escreve o texto do prompt
   de geracao, e mexer nele mudaria o que pedimos ao modelo — que, alias,
   ignora ancora percentual (ver o bloco MEDIR, NAO PEDIR).

   A cabeca e' ancorada pela BASE DO PESCOCO, nunca pelo topo: rostos tem
   testa e cabelo de alturas diferentes, entao so' a base do pescoco cai no
   mesmo lugar em todos eles. E' o que faz um numero so' servir para o elenco
   inteiro. */
const ENCAIXE_LARG_CABECA = 0.3307;   // largura da cabeca / largura do quadro
const ENCAIXE_GOLA_OFFSET = 0;        // + desce a ancora para dentro da camisa

/* O PESCOCO DO MOLDE ESTORVA. Cada uniforme foi desenhado com um pescoco e um
   inicio de queixo proprios; por baixo da cabeca gerada isso vira duas peles
   sobrepostas, e a juncao com a gola fica estranha. O conserto e' local e de
   graca: um corte reto no molde, na linha da gola, apagando o que estiver
   ACIMA dela. Na altura da gola so' o pescoco cruza o corte — os ombros ja'
   descem — entao nada da camisa se perde.
   O corte e' RELATIVO a' gola do estilo; este numero so' desloca essa linha. */
const GOLA_CORTE = -0.115;   // medido: corta 11,5 pontos ACIMA da gola do estilo

/* Onde o uniforme fica no eixo horizontal do quadro. 0,5 = centrado. */
const TORSO_X = 0.4915;   // medido na bancada: 0,85% a' esquerda do centro

/* O QUADRO DA MONTAGEM E' O DA FICHA DO JOGADOR — 1:1.
   A Ficha exibe a foto em .rf-fotonum (38/52/64px, object-fit:cover): compor
   em 2:3 e' compor num quadro que ninguem ve'. Como o molde e' 2:3, dentro de
   um quadro quadrado ele fica 128% mais alto que o quadro — por isso o corpo
   e' posicionado pelo TOPO, e nao ancorado no rodape. */
const RATIO_QUADRO = 1;
const ENCAIXE_TOPO_CORPO = 0.3605;   // medido: 18,3% abaixo do recorte do jogo
const alturaTorsoNoQuadro = () => TORSO_ESCALA*RATIO_FOTO/RATIO_QUADRO;

/* CONVERSAO QUE FALTAVA. medirCentroX devolve o centro opaco em fracoes da
   LARGURA DO MOLDE; o molde entra no quadro a TORSO_ESCALA (85,5%), centrado
   em TORSO_X. Usar o numero cru como se fosse do quadro erra por
   (1 − TORSO_ESCALA) do desvio — pequeno, mas era erro de graca. */
const eixoNoQuadro = (centroMolde, corpoX) =>
  (corpoX == null ? TORSO_X : corpoX) + ((centroMolde == null ? 0.5 : centroMolde) - 0.5)*TORSO_ESCALA;

/* ===== MEDIR, NAO PEDIR =====
   O promptRostoMolde pede topo em 8%, pescoco em 58% e cabeca com 26% da
   largura. MEDIDO em duas geracoes: o modelo entregou topo 1,7%/3,0%, base
   93,7%/96,0% e cabeca com 53,8%/53,1%. Ele ignora ancoras percentuais — o
   mesmo que fez com os moldes de uniforme.

   Entao a geometria deixa de sair do prompt e passa a sair da IMAGEM: o rosto
   tem canal alfa, e a caixa do que e' opaco da' topo, base e largura com
   precisao de pixel, de graca, em canvas local. A composicao se autocorrige e
   nao depende mais de o modelo obedecer. */
async function medirRosto(url){
  const img = await new Promise((ok, erro) => {
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => ok(i); i.onerror = () => erro(new Error('cors'));
    i.src = url + (url.includes('?') ? '&' : '?') + 'm=1';
  });
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  cv.getContext('2d').drawImage(img, 0, 0);
  const d = cv.getContext('2d').getImageData(0, 0, W, H).data;
  const opaco = (x,y) => d[((y*W)+x)*4+3] > 25;
  let topo = null, base = null, esq = W, dir = 0;
  for(let y = 0; y < H; y++){
    let n = 0; for(let x = 0; x < W; x += 2) if(opaco(x,y)) n++;
    if(n > 3){ if(topo === null) topo = y; base = y; }
  }
  if(topo === null) return null;
  /* largura so' na FAIXA DA CABECA (60% de cima do trecho opaco): incluir o
     pescoco inteiro puxaria a medida para baixo e a cabeca sairia grande. */
  const lim = topo + (base - topo)*0.6;
  for(let y = topo; y < lim; y++){
    for(let x = 0; x < W; x++) if(opaco(x,y)){ if(x < esq) esq = x; break; }
    for(let x = W-1; x >= 0; x--) if(opaco(x,y)){ if(x > dir) dir = x; break; }
  }
  /* CENTRO HORIZONTAL da cabeca. Sem ele a montagem centraliza a IMAGEM, e
     um rosto que o modelo desenhou 3% fora do centro do proprio quadrado sai
     3% torto no uniforme — foi o "um pouco para a esquerda". */
  return { topo: topo/H, base: base/H, larg: (dir-esq)/W, span: (base-topo)/H,
           cx: ((esq+dir)/2)/W };
}

/* O centro do UNIFORME, pelo mesmo criterio. O molde tambem pode estar fora
   do eixo, e ai' centrar a cabeca no quadro nao basta: ela tem de casar com o
   corpo, nao com a moldura. Imagem sem transparencia devolve 0,5 — inofensivo. */
/* ===== TIRAR O FUNDO, SEM IA =====
   Os moldes vieram com um fundo cinza chapado. Ele nao pode ser parte da
   camisa: com o fundo embutido nao ha' como pôr a cabeca ATRAS do colarinho,
   nem trocar o fundo por clube, nem empilhar escudo e patrocinio com clareza.

   O corte e' por INUNDACAO A PARTIR DAS BORDAS, e nao "apague tudo que for
   cinza": cinza tambem aparece em sombra de dobra e em camisa clara, e uma
   regra por cor abriria buracos no meio do tecido. Inundando so' de fora, o
   que estiver cercado por pixel de camisa nunca e' alcancado.

   A tolerancia e' generosa no comeco e vai fechando (o gradiente do estudio
   nao e' um cinza so'), e a borda ganha meia transparencia para nao ficar
   serrilhada. Roda no browser, em canvas, e devolve um PNG — custo zero. */
async function tirarFundo(url, tol){
  const img = await new Promise((ok, erro) => {
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => ok(i); i.onerror = () => erro(new Error('cors'));
    i.src = url + (url.includes('?') ? '&' : '?') + 'm=1';
  });
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d', { willReadFrequently:true });
  cx.drawImage(img, 0, 0);
  const im = cx.getImageData(0, 0, W, H), d = im.data;
  const T = (tol == null ? 26 : tol);

  /* JA' LIMPO? entao nao mexe. Depois que os uniformes passam a ser pintados
     ja' sem fundo, o canto vem com alfa 0 — e amostrar um pixel transparente
     daria cor (0,0,0), fazendo a inundacao sair comendo camisa escura. Sair
     cedo aqui e' o que impede a limpeza de estragar o que ja' esta' certo. */
  if(d[3] === 0 && d[(W-1)*4+3] === 0) return url;

  /* a cor do fundo vem dos CANTOS, nao de um valor fixo: cada molde saiu do
     modelo com um cinza um pouco diferente */
  const amostra = [[0,0],[W-1,0],[0,H-1],[W-1,H-1],[(W>>1),0]];
  let r0=0,g0=0,b0=0;
  for(const [x,y] of amostra){ const k=((y*W)+x)*4; r0+=d[k]; g0+=d[k+1]; b0+=d[k+2]; }
  r0/=amostra.length; g0/=amostra.length; b0/=amostra.length;

  const dist = k => Math.max(Math.abs(d[k]-r0), Math.abs(d[k+1]-g0), Math.abs(d[k+2]-b0));
  const visto = new Uint8Array(W*H);
  const fila = [];
  const poe = (x,y) => { if(x<0||y<0||x>=W||y>=H) return; const i=y*W+x;
    if(visto[i]) return; visto[i]=1; if(dist(i*4) <= T) fila.push(i); };
  for(let x=0; x<W; x++){ poe(x,0); poe(x,H-1); }
  for(let y=0; y<H; y++){ poe(0,y); poe(W-1,y); }
  while(fila.length){
    const i = fila.pop(), x = i%W, y = (i/W)|0;
    d[i*4+3] = 0;
    poe(x+1,y); poe(x-1,y); poe(x,y+1); poe(x,y-1);
  }
  /* borda meio transparente: quem sobrou opaco mas encosta em buraco */
  for(let y=1; y<H-1; y++) for(let x=1; x<W-1; x++){
    const i=y*W+x; if(!d[i*4+3]) continue;
    if((!d[(i-1)*4+3] || !d[(i+1)*4+3] || !d[(i-W)*4+3] || !d[(i+W)*4+3]) && dist(i*4) <= T*1.8)
      d[i*4+3] = 110;
  }
  cx.putImageData(im, 0, 0);
  return cv.toDataURL('image/png');
}

async function medirCentroX(url){
  try{
    const img = await new Promise((ok, erro) => {
      const i = new Image(); i.crossOrigin = 'anonymous';
      i.onload = () => ok(i); i.onerror = () => erro(new Error('cors'));
      i.src = url + (url.includes('?') ? '&' : '?') + 'm=1';
    });
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.getContext('2d').drawImage(img, 0, 0);
    const d = cv.getContext('2d').getImageData(0, 0, W, H).data;
    let esq = W, dir = 0;
    for(let y = 0; y < H; y += 2){
      for(let x = 0; x < W; x++) if(d[((y*W)+x)*4+3] > 25){ if(x < esq) esq = x; break; }
      for(let x = W-1; x >= 0; x--) if(d[((y*W)+x)*4+3] > 25){ if(x > dir) dir = x; break; }
    }
    return dir > esq ? ((esq+dir)/2)/W : 0.5;
  }catch(_){ return 0.5; }
}

/* onde o rosto entra no quadro composto, a partir do que foi MEDIDO nele.
   Escala pelo VAO VERTICAL (topo da cabeca ate' a gola) e nao pela largura:
   casar a largura deixaria o pescoco curto demais e abriria um vao entre ele
   e a gola, que salta muito mais aos olhos do que 3 pontos de largura. */
/* ===== CALIBRACAO UNICA, MEDIDA — nao por render, nao por jogador =====
   O molde e' um close mais fechado que a foto costurada por IA: medido, ele
   ocupa 99,9% da largura na linha do peito, contra 85,4% das fotos de IA
   (media de 6 amostras reais). Ou seja, o molde esta' 1,17x mais perto.

   Por isso o corpo do metodo C saia maior que o de A e B mesmo "em escala
   natural": natural para o molde nao e' natural para a foto.

   A correcao e' UMA constante, medida uma vez e igual para todos os clubes,
   estilos e jogadores — o corpo para de mudar de tamanho a cada render, que
   era o defeito. O quadro volta a ser 2:3, identico ao de A e B.

   Nada e' gerado, regerado ou recortado: o molde e' o mesmo arquivo, so'
   desenhado na escala em que a foto de IA o mostraria. */
const TORSO_ESCALA = 0.855;        // 85,4 / 99,9 — medido
const TORSO_TOPO   = 1 - TORSO_ESCALA;   // ancorado embaixo, como uma pessoa em pe'

function encaixeComposto(m, estilo, centroCorpo){
  if(!m || !m.base || !m.larg) return null;
  /* onde a gola do uniforme cai DENTRO DO QUADRO, ja' na escala calibrada */
  const hTorso = alturaTorsoNoQuadro();
  const gola = ENCAIXE_TOPO_CORPO + golaDoEstilo(estilo)*hTorso;
  /* a cabeca sai com ENCAIXE_LARG_CABECA da largura do quadro — sempre, seja qual
     for o tamanho que o modelo deu a ela na imagem do rosto */
  const ladoLarg = ENCAIXE_LARG_CABECA / m.larg;     // em fracoes da LARGURA
  const rostoAltura = ladoLarg / RATIO_QUADRO;       // a mesma medida em fracoes da ALTURA
  /* ONDE POR A IMAGEM para que a CABECA — e nao o quadrado dela — caia no
     eixo do corpo. `left` marca o centro da imagem (ha' translateX(-50%)),
     entao ele recua o quanto a cabeca estiver fora do proprio centro. */
  const eixo = centroCorpo == null ? 0.5 : centroCorpo;
  const cx = m.cx == null ? 0.5 : m.cx;
  return {
    rostoAltura,
    rostoTopo: (gola + ENCAIXE_GOLA_OFFSET) - m.base*rostoAltura,
    corpoTopo: ENCAIXE_TOPO_CORPO,
    rostoEsq: eixo - (cx - 0.5)*ladoLarg,
    corte: golaDoEstilo(estilo) + GOLA_CORTE   // na altura do MOLDE, nao do quadro
  };
}

/* o composto do metodo C: uniforme do clube + rosto medido, sem IA nenhuma.
   `px` opcional — sem ele o quadro e' FLUIDO (width 100% + aspect-ratio), que
   e' o que os cartoes A e B usam. Passar largura fixa aqui encolhia o cartao C
   ao lado dos outros dois. */
function compostoMoldeHTML(torsoUrl, rostoUrl, px, estilo, medida, centroMolde, corpoX){
  const bx = corpoX == null ? TORSO_X : corpoX;
  const e = encaixeComposto(medida, estilo, eixoNoQuadro(centroMolde, bx));
  /* quadro 2:3, o MESMO de A e B */
  const quadro = px
    ? `width:${px}px;height:${Math.round(px*RATIO_QUADRO)}px`
    : `width:100%;aspect-ratio:${(1/RATIO_QUADRO).toFixed(4)}`;
  /* o uniforme entra sempre igual: escala calibrada, centrado, ancorado
     embaixo. Nao depende do jogador nem do render. */
  const recorte = e ? `;clip-path:inset(${(e.corte*100).toFixed(2)}% 0 0 0)` : '';
  const corpo = `<img src="${h(torsoUrl)}" style="position:absolute;left:${(bx*100).toFixed(2)}%;transform:translateX(-50%);top:${(ENCAIXE_TOPO_CORPO*100).toFixed(2)}%;width:${(TORSO_ESCALA*100).toFixed(1)}%${recorte}">`;
  if(!e){
    return `<span style="position:relative;display:block;${quadro};border-radius:10px;overflow:hidden;background:#d9d9d9">${corpo}</span>`;
  }
  return `<span style="position:relative;display:block;${quadro};border-radius:10px;overflow:hidden;background:#d9d9d9">
    ${corpo}
    ${rostoUrl?`<img src="${h(rostoUrl)}" style="position:absolute;left:${(e.rostoEsq*100).toFixed(2)}%;transform:translateX(-50%);top:${(e.rostoTopo*100).toFixed(2)}%;height:${(e.rostoAltura*100).toFixed(2)}%;object-fit:contain">`:''}
  </span>`;
}

function promptDireto(item, p, at){
  const pais = item.pais==='Brasil' ? 'Brazil' : item.pais;
  const cab = /bald/.test(at.cabelo) ? at.cabelo : `${at.cabelo}, ${at.corCab} hair`;
  return [
    'Take the input photo of a football player\'s torso and ADD A HEAD in the empty studio background above the collar,',
    'turning it into one photorealistic official club media day portrait.',
    `The head is a fictional professional football player from ${pais}: ${at.idade} years old, ${at.pele}, ${cab}, ${at.barba}, ${at.sorriso}, ${at.brinco}, ${at.tattoo}.`,
    'Facing the camera directly, natural neck-to-collar transition, unified soft studio lighting and color grading.',
    'CRITICAL: do NOT move, scale, crop or reframe the jersey — it must stay in EXACTLY the same position and size as in the input image, pixel-aligned, same pattern and colors, completely clean (no crest, sponsor, text or logos added).',
    textoEnquadramento(),
    'Plain light gray studio background, sharp focus, DSLR quality.',
    'This is a completely fictional person, not resembling any real footballer or celebrity.'
  ].join(' ');
}

function promptMontagem(){
  return [
    'Combine the two input images into ONE photorealistic official club media day portrait:',
    'the FIRST image is the torso with the football jersey, the SECOND image is the player\'s head.',
    'Attach that EXACT head (same face, same hair, same skin tone, do not change the identity) naturally onto the torso:',
    'correct head size and position for the body, seamless neck-to-collar transition, unified soft studio lighting and color grading.',
    'CRITICAL: do NOT move, scale, crop or reframe the jersey — it must stay in EXACTLY the same position and size as in the first image, pixel-aligned, same pattern and colors, completely clean (no crest, sponsor, text or logos added).',
    'The head goes into the empty background space ABOVE the collar, where the first image is blank — the final framing is identical to the first image, just with the head filled in.',
    textoEnquadramento(),
    'Plain light gray studio background, facing the camera, sharp focus, DSLR quality.'
  ].join(' ');
}
const TORSO_KEY = '__torso__';   // linha especial de player_photos: a camisa do clube

/* =====================================================================
   AS 10 FACES PADRAO DE TREINADOR
   ---------------------------------------------------------------------
   Quem nao e' Pro nao gera o proprio retrato: escolhe uma destas dez no
   assistente. Sao 5 por genero, e cada uma ja' vem vestindo um estilo
   diferente — assim dez imagens entregam variedade de ROSTO e de ROUPA,
   em vez das cinquenta que 5 rostos x 5 roupas custariam.

   Moram em player_photos com club_id '__treinador__', o mesmo truque de
   linha-sentinela que os moldes de uniforme ja' usam ('__molde__'). De
   carona nisso o jogo le' as faces sem UMA requisicao nova: buscarFotos()
   ja' varre a tabela inteira do pacote (ver src/net/dados.js).
   ===================================================================== */
const TREINADOR_KEY = '__treinador__';
/* O TOM DA PECA E' PARTE DA DESCRICAO, nao detalhe solto: a cor do bordado
   depende dele (branco em escuro, marinho em claro). Deixar a cor a cargo do
   modelo dava agasalho claro com escudo branco — bordado invisivel. */
const ESTILOS_TREINADOR = [
  ['terno',    'Terno',     'a sharp dark charcoal tailored suit with a tie'],
  ['agasalho', 'Agasalho',  'a technical zip-up training tracksuit jacket in dark navy blue'],
  ['polo',     'Polo',      'a plain fitted training polo shirt in light heather grey'],
  ['blazer',   'Blazer',    'a casual unstructured beige blazer over an open-collar shirt, no tie'],
  ['retro90',  'Retrô 90',  'an oversized 1990s coach shell jacket in dark navy blue, era-accurate cut']
];
/* a chave da linha e' o que o save do jogador guarda: m1..m5 / f1..f5.
   A ORDEM de ESTILOS_TREINADOR define quem e' m1 — reordenar aquele array
   troca a roupa de todo mundo que ja' escolheu. Nao reordene: acrescente. */
const faceChave = (genero, i) => genero + (i + 1);
const faceNome  = (genero, estilo) => (genero === 'f' ? 'treinadora-' : 'treinador-') + estilo;

/* variedade entre as cinco do mesmo genero: sem isto o modelo devolve
   praticamente a mesma pessoa cinco vezes, so' trocando a roupa. */
const FACE_POOL = {
  pele:   ['light skin','medium tan skin','light brown skin','brown skin','dark brown skin'],
  cabelo: ['short greying hair','salt-and-pepper hair','short dark hair','completely bald head','shoulder-length dark hair'],
  idade:  ['in their late thirties','in their forties','in their late forties','in their fifties','in their late fifties']
};

/* ===== A CARA NAO PODE SAIR TRISTE =====
   Sem dizer a expressao, o modelo escorrega para "serio" e "serio" vira boca
   caida e olhar baixo — varias das primeiras faces pareciam abatidas. Aqui a
   expressao e' PEDIDA, e o que nao se quer e' proibido por escrito: dizer so'
   "sorria" nao resolve, porque o problema esta' na metade seria da grade. */
const FACE_EXPRESSAO = [
  'a calm, composed neutral expression, mouth relaxed and level',
  'a serious and focused expression, confident and alert — composed, never downcast',
  'a light closed-mouth smile, friendly and relaxed',
  'a warm open smile showing teeth, genuinely cheerful',
  'a confident half-smile, one corner of the mouth slightly raised'
];
const FACE_NUNCA = 'NEVER sad, gloomy, melancholic, tired or defeated: no downturned mouth corners, '
  + 'no furrowed worried brow, no drooping eyelids, no downcast gaze. The eyes look straight at the '
  + 'camera, open and engaged, and the posture is upright and self-assured.';

/* ===== A ROUPA SAI LIMPA DA IA =====
   Pedir o escudo no prompt nao funciona: gpt-image-1 nao reproduz marca nem
   texto, ele INVENTA um brasao parecido e ilegivel (a primeira face gerada
   veio com "LIARDYBIR" bordado no peito). Entao a peca nasce vazia e o escudo
   e a marca entram por CIMA, como camada — mesma solucao que o uniforme do
   jogador ja' usa, e la' o motivo esta' escrito no promptTorso. Camada e'
   sempre nitida, sempre igual, e da' para arrastar depois. */
const ROUPA_LIMPA = 'The garment is COMPLETELY CLEAN: no crest, no badge, no sponsor, no brand mark, '
  + 'no text, no numbers, no logos and no embroidery of any kind, anywhere — not on the chest, '
  + 'not on the collar, not on the sleeves. Plain fabric only, because the crest and the brand '
  + 'mark are overlaid later as separate layers.';

function promptFaceTreinador(genero, i){
  const est = ESTILOS_TREINADOR[i];
  const quem = genero === 'f' ? 'woman' : 'man';
  const cab = genero === 'f'
    ? ['short dark bob','shoulder-length dark hair','curly shoulder-length hair','short greying hair','hair tied back in a ponytail'][i]
    : FACE_POOL.cabelo[i];
  /* a expressao acompanha o indice: as cinco faces do mesmo genero saem com as
     cinco expressoes, em vez de sortear e sair tres serias por acaso */
  return [
    `Hyper-realistic studio portrait of a fictional professional football MANAGER, a ${quem} ${FACE_POOL.idade[i]}, ${FACE_POOL.pele[i]}, ${cab}, wearing ${est[2]}.`,
    `The face has ${FACE_EXPRESSAO[i]}.`,
    FACE_NUNCA,
    ROUPA_LIMPA,
    'Head and shoulders, facing the camera directly, official club media day photo style.',
    'Soft professional studio lighting, plain neutral light gray background, sharp focus, DSLR photo quality.',
    'The head is centered and fills about half of the frame height.',
    'This is a completely fictional person, not resembling any real person.'
  ].join(' ');
}

/* =====================================================================
   AS CAMADAS DO TREINADOR — escudo e marca por cima da roupa limpa
   ---------------------------------------------------------------------
   Mesma ideia do uniforme do jogador: a IA entrega a peca vazia e o desenho
   de verdade entra como imagem por cima, arrastavel. Camada e' sempre nitida
   e sempre igual; prompt inventa brasao ilegivel.

   GEOMETRIA DIFERENTE, DE PROPOSITO: a foto do jogador e' retrato 2:3 e o
   compostoHTML carrega o mapa torso->foto dessa proporcao. A face do
   treinador e' QUADRADA (1024x1024) e enquadrada em cabeca-e-ombros. Reusar
   aquele mapa poria o escudo no lugar errado — aqui as porcentagens sao do
   proprio quadro quadrado, sem conversao nenhuma.

   ONDE MORA: uma linha-sentinela ('__treinador__' | '__marca__') guarda os
   dois logos e a posicao PADRAO, valida para as dez faces. Cada face pode ter
   o seu ajuste em atributos.pos, que vence o padrao — igual ao "salvar so
   neste jogador" do elenco. */
const MARCA_KEY = '__marca__';
const TR_POS_PADRAO = { escudo:{ x:60, y:62, w:14 }, marca:{ x:26, y:64, w:16 } };
const trMarca = () => (D.fotos[TREINADOR_KEY+'|'+MARCA_KEY] || {}).atributos || {};
function trPos(genero, i){
  const base = trMarca();
  const face = (D.fotos[TREINADOR_KEY+'|'+faceChave(genero,i)] || {}).atributos || {};
  const p = face.pos || {};
  return {
    escudo: Object.assign({}, TR_POS_PADRAO.escudo, base.escudo||{}, p.escudo||{}),
    marca:  Object.assign({}, TR_POS_PADRAO.marca,  base.marca ||{}, p.marca ||{})
  };
}
/* o retrato com as camadas — usado no cartao da aba e no palco do ajuste */
function trCompostoHTML(url, genero, i, px){
  const m = trMarca(), pos = trPos(genero, i);
  const cam = (u, p) => u ? `<img src="${h(u)}" alt="" draggable="false"
      style="position:absolute;left:${p.x}%;top:${p.y}%;width:${p.w}%;pointer-events:none">` : '';
  return `<span style="position:relative;display:block;width:${px?px+'px':'100%'};aspect-ratio:1/1;border-radius:9px;overflow:hidden;background:var(--bd3)">
    <img src="${h(url)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
    ${cam(m.escudoUrl, pos.escudo)}${cam(m.marcaUrl, pos.marca)}
  </span>`;
}

/* grava a linha-sentinela dos logos/posicao padrao */
async function trMarcaSalvar(campos){
  const at = Object.assign({}, trMarca(), campos);
  const linha = { pack_id: ST.packId, club_id: TREINADOR_KEY, jogador: MARCA_KEY,
                  url: at.escudoUrl || '', atributos: at };
  const r = await jogo('player_photos').upsert(linha, { onConflict:'pack_id,club_id,jogador' });
  if(r.error){ toast(erroMsg(r.error), true); return false; }
  D.fotos[TREINADOR_KEY+'|'+MARCA_KEY] = linha;
  return true;
}
async function trEnviarLogo(qual, arquivo){
  if(!arquivo) return;
  if(arquivo.size > 2*1024*1024) return toast('Logo acima de 2 MB.', true);
  const ext = (arquivo.name.split('.').pop()||'png').toLowerCase();
  const caminho = `treinador/${qual}-${Date.now()}.${ext}`;
  const up = await sb.storage.from('patrocinadores').upload(caminho, arquivo, { upsert:false, cacheControl:'31536000' });
  if(up.error) return toast(erroMsg(up.error), true);
  const url = sb.storage.from('patrocinadores').getPublicUrl(caminho).data.publicUrl;
  if(await trMarcaSalvar(qual==='escudo' ? { escudoUrl:url } : { marcaUrl:url })){
    toast('Logo enviado.'); pgEstudio();
  }
}

/* ---------- o palco de arraste (quadrado, duas camadas) ---------- */
function modalAjusteTreinador(genero, i){
  const linha = D.fotos[TREINADOR_KEY+'|'+faceChave(genero,i)];
  if(!linha) return toast('Gere esta face primeiro.', true);
  const m = trMarca();
  if(!m.escudoUrl && !m.marcaUrl) return toast('Envie o escudo ou a marca antes de posicionar.', true);
  const pos = trPos(genero, i);

  const estreito = innerWidth <= 640;
  const lado = Math.max(200, Math.floor(Math.min(440, innerWidth - (estreito?34:60),
    innerHeight * (estreito?0.52:0.62))));

  const alvo = (chave, url, cor) => url ? `<img data-alvo="${chave}" src="${h(url)}" draggable="false"
      style="position:absolute;left:${pos[chave].x}%;top:${pos[chave].y}%;width:${pos[chave].w}%;cursor:grab;outline:2px dashed ${cor};outline-offset:3px">` : '';
  const slider = (chave, url, cor, rot) => url ? `<label class="aj-sl"><span style="color:${cor}">${rot}</span>
      <input data-w="${chave}" type="range" min="4" max="45" step="0.5" value="${pos[chave].w}"></label>` : '';

  const ov = document.createElement('div');
  ov.className = 'aj-ov';
  ov.innerHTML = `
    <div class="aj-topo">
      <span class="aj-quem"><b>${h(faceNome(genero, ESTILOS_TREINADOR[i][0]))}</b>
        <small>arraste para posicionar · vale para as dez faces</small></span>
      <button class="aj-nav" id="ajt-x" title="Fechar" aria-label="Fechar">✕</button>
    </div>
    <div class="aj-palco" style="width:${lado}px;height:${lado}px">
      <img src="${h(linha.url)}" draggable="false" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none">
      ${alvo('escudo', m.escudoUrl, '#e3b23c')}
      ${alvo('marca',  m.marcaUrl,  '#35c46a')}
    </div>
    <div class="aj-ctrl">
      ${slider('escudo', m.escudoUrl, '#e3b23c', 'Escudo')}
      ${slider('marca',  m.marcaUrl,  '#35c46a', 'Marca')}
      <div class="aj-bts">
        <button class="btn btn-sm" id="ajt-todas">Salvar em todas</button>
        <button class="btn btn-sm btn-ghost" id="ajt-so">Salvar só nesta face</button>
      </div>
      <div class="aj-dica">O uniforme sai limpo da IA de propósito: escudo e marca entram por cima,
        então dá para trocar o logo sem gerar imagem nenhuma de novo.</div>
    </div>`;
  document.body.appendChild(ov);

  /* ARRASTE EM PORCENTAGEM DO PALCO, nao em pixel: o palco muda de tamanho com
     a janela, e posicao em pixel sairia do lugar no telemovel. */
  let arrastando = null, ini = null;
  const palco = ov.querySelector('.aj-palco');
  const ponto = e => (e.touches && e.touches[0]) || e;
  ov.querySelectorAll('[data-alvo]').forEach(el2 => {
    const baixa = e => {
      arrastando = el2.dataset.alvo;
      const r = palco.getBoundingClientRect(), pt = ponto(e);
      ini = { px:pt.clientX, py:pt.clientY, x:pos[arrastando].x, y:pos[arrastando].y, w:r.width, h:r.height };
      el2.style.cursor = 'grabbing'; e.preventDefault();
    };
    el2.addEventListener('mousedown', baixa);
    el2.addEventListener('touchstart', baixa, { passive:false });
  });
  const move = e => {
    if(!arrastando) return;
    const pt = ponto(e);
    const p = pos[arrastando];
    p.x = Math.max(-5, Math.min(95, ini.x + (pt.clientX-ini.px)/ini.w*100));
    p.y = Math.max(-5, Math.min(95, ini.y + (pt.clientY-ini.py)/ini.h*100));
    const el3 = ov.querySelector(`[data-alvo="${arrastando}"]`);
    el3.style.left = p.x+'%'; el3.style.top = p.y+'%';
    e.preventDefault();
  };
  const solta = () => {
    if(!arrastando) return;
    const el3 = ov.querySelector(`[data-alvo="${arrastando}"]`);
    if(el3) el3.style.cursor = 'grab';
    arrastando = null;
  };
  document.addEventListener('mousemove', move);
  document.addEventListener('touchmove', move, { passive:false });
  document.addEventListener('mouseup', solta);
  document.addEventListener('touchend', solta);
  ov.querySelectorAll('[data-w]').forEach(sl => sl.oninput = () => {
    const k = sl.dataset.w;
    pos[k].w = Number(sl.value);
    const el3 = ov.querySelector(`[data-alvo="${k}"]`);
    if(el3) el3.style.width = pos[k].w+'%';
  });

  const fechar = () => {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('touchmove', move);
    document.removeEventListener('mouseup', solta);
    document.removeEventListener('touchend', solta);
    document.removeEventListener('keydown', esc, true);
    ov.remove();
  };
  const esc = e => { if(e.key==='Escape'){ e.stopImmediatePropagation(); fechar(); } };
  document.addEventListener('keydown', esc, true);
  ov.querySelector('#ajt-x').onclick = fechar;
  ov.onclick = e => { if(e.target===ov) fechar(); };

  ov.querySelector('#ajt-todas').onclick = async () => {
    if(await trMarcaSalvar({ escudo:pos.escudo, marca:pos.marca })){
      /* o ajuste vira o PADRAO: as sobras por face teriam prioridade e o
         "salvar em todas" nao se veria nas que ja' foram ajustadas soltas. */
      for(const [g] of [['f'],['m']]) ESTILOS_TREINADOR.forEach((_e, k) => {
        const l = D.fotos[TREINADOR_KEY+'|'+faceChave(g,k)];
        if(l && l.atributos && l.atributos.pos){ delete l.atributos.pos;
          jogo('player_photos').upsert(l, { onConflict:'pack_id,club_id,jogador' }); }
      });
      toast('Posição salva para as dez faces.'); fechar(); pgEstudio();
    }
  };
  ov.querySelector('#ajt-so').onclick = async () => {
    const at = Object.assign({}, linha.atributos||{}, { pos:{ escudo:pos.escudo, marca:pos.marca } });
    const nova = Object.assign({}, linha, { atributos:at });
    const r = await jogo('player_photos').upsert(nova, { onConflict:'pack_id,club_id,jogador' });
    if(r.error) return toast(erroMsg(r.error), true);
    D.fotos[TREINADOR_KEY+'|'+faceChave(genero,i)] = nova;
    toast('Posição salva só nesta face.'); fechar(); pgEstudio();
  };
}

/* gera UMA face e grava. `refazer` pula o atalho do que ja' existe — e' o que
   o link Gerar usa para produzir uma face nova por cima da atual. */
async function garantirFaceTreinador(genero, i, refazer){
  const chave = faceChave(genero, i);
  const est = ESTILOS_TREINADOR[i];
  if(!refazer && D.fotos[TREINADOR_KEY+'|'+chave]) return D.fotos[TREINADOR_KEY+'|'+chave];
  const url = await gerarImagemIA('jogador', promptFaceTreinador(genero, i), 'medium', null,
    'treinadores/'+faceNome(genero, est[0]), 'Gerando a face do treinador…');
  const linha = { pack_id: ST.packId, club_id: TREINADOR_KEY, jogador: chave, url,
                  atributos: { genero, estilo: est[0], rotulo: est[1] } };
  const r = await jogo('player_photos').upsert(linha, { onConflict:'pack_id,club_id,jogador' });
  if(r.error) throw new Error(erroMsg(r.error));
  D.fotos[TREINADOR_KEY+'|'+chave] = linha;
  return linha;
}

function facesQueFaltam(){
  const faltam = [];
  ['f','m'].forEach(g => ESTILOS_TREINADOR.forEach((_e, i) => {
    if(!D.fotos[TREINADOR_KEY+'|'+faceChave(g, i)]) faltam.push([g, i]);
  }));
  return faltam;
}

/* o lote no molde exato de prepararEstilos(): confirma com o custo, conta
   acertos e falhas, e um erro num item NAO aborta os outros. */
async function prepararFacesTreinador(btn){
  const faltam = facesQueFaltam();
  if(!faltam.length) return toast('As 10 faces de treinador já estão prontas.');
  if(!await rfConfirm({ titulo:'Gerar as faces de treinador',
    texto:`Faltam <b>${faltam.length} face(s)</b> das dez que o jogador escolhe no assistente.`,
    detalhe:`Custo único: <b>~US$ ${(faltam.length*0.042).toFixed(2)}</b>. Face que sair torta pode ser
             refeita pelo link ↻ do cartão.`,
    nao:'Agora não', sim:`Gerar ${faltam.length} face(s)` })) return;
  btn.disabled = true; const rot = btn.textContent;
  let ok = 0, erros = 0;
  for(const [g, i] of faltam){
    btn.textContent = `${faceNome(g, ESTILOS_TREINADOR[i][0])}… (${ok+erros+1}/${faltam.length})`;
    try{ await garantirFaceTreinador(g, i); ok++; }
    catch(err){ erros++; console.warn('face de treinador falhou:', g, i, err.message); }
  }
  registrar('estudio.treinadores.preparar', String(ok), { pacote: ST.packId, falhas: erros });
  toast(`Faces geradas: ${ok}${erros?`, ${erros} falharam`:''}.`);
  btn.disabled = false; btn.textContent = rot;
  pgEstudio();
}

/* GERAR uma face solta. Nao existe "refazer": gerar de novo e' sempre uma
   geracao nova, paga, que substitui a anterior — e a confirmacao diz isso com
   todas as letras. A ideia de "corrigir" e' que fazia parecer barato repetir. */
async function refazerFaceTreinador(genero, i){
  const est = ESTILOS_TREINADOR[i];
  const existe = !!D.fotos[TREINADOR_KEY+'|'+faceChave(genero, i)];
  if(existe && !await rfConfirm({ titulo:'Gerar esta face de novo',
    texto:`Isto é uma <b>geração nova</b> de <b>${h(faceNome(genero, est[0]))}</b>, e ela substitui a atual.`,
    detalhe:'Custo: <b>~US$ 0,04</b>. A imagem de agora é perdida.', nao:'Agora não', sim:'Gerar de novo' })) return;
  try{
    await garantirFaceTreinador(genero, i, true);
    toast('Face gerada.');
  }catch(err){ toast(err.message, true); }
  pgEstudio();
}

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
    null, 'moldes/uniforme-'+estilo, 'Gerando o molde do estilo…');
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
    'GHOST-MANNEQUIN 3D shape: the jersey holds the volume of an invisible torso — the shoulders SLOPE naturally upward into a fully formed round collar, showing the complete neckline opening from the front. The top of the jersey must NEVER be a straight horizontal cut.',
    'Front view, short sleeves spread naturally, centered, filling most of the frame.',
    'Completely clean jersey: no crest, no badge, no sponsor, no text, no logos.',
    'Isolated cutout on a fully transparent background, soft even studio lighting, sharp focus.'
  ].join(' ') + AVISO_MARCADOR;
}
async function garantirMoldeMini(estilo, item){
  const chave = 'mini-'+estilo;
  let molde = D.fotos[MOLDE_KEY+'|'+chave];
  if(molde) return molde;
  /* a miniatura é EXTRAÍDA do molde do uniforme (edição sobre a mesma imagem):
     é o que garante listras com a mesma largura, espaçamento e simetria da
     camisa vestida — gerar solta dava um padrão parecido, nunca igual. */
  const moldeUni = D.fotos[MOLDE_KEY+'|'+estilo] || (item ? await garantirMolde(item, estilo) : null);
  const prompt = moldeUni
    ? 'From the input photo, isolate ONLY the football jersey as a ghost-mannequin product shot: keep the EXACT same jersey — identical stripe pattern, identical stripe widths, spacing and colors, pixel-faithful to the input, PERFECTLY SYMMETRICAL left-right with BOTH sleeves identical in color. Remove the body, the arms, the skin and the background completely, but KEEP the jersey\'s 3D ghost-mannequin volume: the shoulders slope naturally up into a fully formed round collar with the complete neckline opening visible — the top must NEVER be a flat straight cut. Front view, centered, jersey filling most of the frame, fully transparent background. No crest, no sponsor, no text, no logos.' + AVISO_MARCADOR
    : promptMiniCamisa(estilo);
  const url = await gerarImagemIA('rosto', prompt, 'medium', moldeUni ? [moldeUni.url] : null,
    'moldes/miniatura-'+estilo, 'Gerando a miniatura da camisa…');
  molde = { pack_id: ST.packId, club_id: MOLDE_KEY, jogador: chave, url, atributos:{ recorte:'molde-mini', estilo } };
  const r = await jogo('player_photos').upsert(molde, { onConflict:'pack_id,club_id,jogador' });
  if(r.error) throw new Error(erroMsg(r.error));
  D.fotos[MOLDE_KEY+'|'+chave] = molde;
  return molde;
}

/* PREPARAR ESTILOS: gera de uma vez os moldes que faltam (uniforme + miniatura)
   dos 5 estilos — depois disso todo modal de Uniforme tem os estilos prontos
   para reuso, e cada clube só escolhe cores (a pintura é local e grátis). */
async function prepararEstilos(btn){
  const item = (D.catalogo||[])[0];
  if(!item) return toast('Catálogo ainda não carregou.', true);
  const faltam = [];
  for(const [chave] of ESTILOS_CAMISA){
    if(!D.fotos[MOLDE_KEY+'|'+chave]) faltam.push(['uniforme', chave]);
    if(!D.fotos[MOLDE_KEY+'|mini-'+chave]) faltam.push(['miniatura', chave]);
  }
  if(!faltam.length) return toast('Os 5 estilos já estão prontos (uniforme + miniatura).');
  if(!await rfConfirm({ titulo:'Preparar os estilos de uniforme',
    texto:`Faltam <b>${faltam.length} molde(s)</b> (uniforme e/ou miniatura). Gerando agora, os 5 estilos
           ficam prontos e cada clube passa a ser <b>pintado na hora, sem IA</b>.`,
    detalhe:`Custo único: <b>~US$ ${(faltam.length*0.05).toFixed(2)}</b>. Molde que sair torto pode ser
             refeito pelos links ↻ dentro do wizard.`,
    nao:'Agora não', sim:`Gerar ${faltam.length} molde(s)` })) return;
  btn.disabled = true; const rot = btn.textContent;
  let ok=0, erros=0;
  for(const [tipo, chave] of faltam){
    btn.textContent = `${tipo==='uniforme'?'Molde':'Miniatura'} ${chave}… (${ok+erros+1}/${faltam.length})`;
    try{
      if(tipo==='uniforme') await garantirMolde(item, chave);
      else await garantirMoldeMini(chave, item);
      ok++;
    }catch(err){ erros++; console.warn('preparar estilo falhou:', tipo, chave, err.message); }
  }
  registrar('estudio.estilos.preparar', String(ok), { pacote: ST.packId, falhas: erros });
  toast(`Estilos preparados: ${ok} molde(s) gerado(s)${erros?`, ${erros} falharam`:''}.`);
  btn.disabled = false; btn.textContent = rot;
  pgEstudio();
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
  if(!await rfConfirm({ titulo:'Repintar todos os uniformes',
    texto:`Vou repintar <b>${alvos.length} uniformes</b> (e as miniaturas do campo) com os moldes atuais,
           mantendo as cores de cada clube.`,
    detalhe:(faltam.length
      ? `<b>${faltam.length} molde(s)</b> serão gerados por IA antes (~US$ ${(faltam.length*0.04).toFixed(2)}); o resto é pintura local, sem custo.`
      : 'Sem custo: é tudo pintura local.')+
      ' As posições salvas de escudo e patrocínio são preservadas, e <b>as fotos dos jogadores não são tocadas</b>.',
    nao:'Cancelar', sim:`Repintar ${alvos.length} uniformes` })) return;
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
        const blob = await pintarMolde(molde.url, t.atributos.cores[0], t.atributos.cores[1], t.atributos.estilo);
        const caminho = `${caminhoClube(x)}/uniforme-${Date.now()}.webp`;
        const up = await sb.storage.from('jogadores').upload(caminho, blob, { upsert:false, cacheControl:'31536000' });
        if(up.error) throw new Error(up.error.message);
        // a MINIATURA (camisa do campo na Formação) acompanha a repintura
        let miniUrl = t.atributos.miniatura || null;
        const moldeMini = D.fotos[MOLDE_KEY+'|mini-'+t.atributos.estilo];
        if(moldeMini){
          try{
            const bm = await pintarMolde(moldeMini.url, t.atributos.cores[0], t.atributos.cores[1], t.atributos.estilo);
            const cm = `${caminhoClube(x)}/miniatura-${Date.now()}.webp`;
            const um = await sb.storage.from('jogadores').upload(cm, bm, { upsert:false, cacheControl:'31536000' });
            if(!um.error) miniUrl = sb.storage.from('jogadores').getPublicUrl(cm).data.publicUrl;
          }catch(e2){ console.warn('miniatura na repintura falhou:', x.c.id, e2.message); }
        }
        const reg = Object.assign({}, t, { url: sb.storage.from('jogadores').getPublicUrl(caminho).data.publicUrl,
          atributos: Object.assign({}, t.atributos, { miniatura: miniUrl }) });
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
const AVISO_MARCADOR = ' The magenta and cyan are PLACEHOLDER colors for programmatic recoloring: keep them pure, flat and vivid, with shading coming only from fabric folds and lighting. The collar and the sleeve cuffs MUST also be one of these two placeholder colors (cyan preferred) — absolutely NO navy, NO gray and NO third color anywhere on the jersey. Every stripe and section must be ONE single uninterrupted solid color from edge to edge — absolutely NO patches, NO spots and NO bleeding of one placeholder color inside an area of the other. The jersey must be PERFECTLY SYMMETRICAL left-right: BOTH sleeves identical in color and pattern, both sides of the chest mirrored.';

/* PINTURA SEM IA: o molde do estilo é gerado UMA vez em cores-marcador (magenta
   #FF00FF na principal, ciano #00FFFF na secundária) e daqui pra frente cada
   clube só REPINTA o molde no navegador — magenta vira a cor principal, ciano a
   secundária, preservando a sombra do tecido (luminância). Zero token por clube. */
function hex2rgb(hx){
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hx||''));
  const n = parseInt(m ? m[1] : '1b7a3d', 16);
  return [n>>16&255, n>>8&255, n&255];
}
/* `estilo` liga a LIMPEZA: fundo cinza fora e pescoco fora, no mesmo passe da
   pintura. Sem ele a funcao se comporta como antes — quem nao souber o estilo
   nao ganha limpeza torta. */
async function pintarMolde(moldeUrl, corA, corB, estilo){
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
    /* a família quente FECHA o círculo até o vermelho (355°→8°): a sombra mais
       funda do magenta desvia até lá e escapava, deixando a mancha vinho */
    if(matiz >= 262 || matiz <= 8)        alvo = A;    // magenta, roxo, vinho, vermelho-sombra
    else if(matiz >= 148 && matiz < 262)  alvo = B;    // ciano, petróleo, azul (gola/punho)
    if(!alvo) continue;                                 // pele (~10-50°) e cabelo ficam
    const w = Math.min(1, (croma - 12) / 14);
    const L = Math.min(1, mx / 240);                    // sombra = só claro/escuro
    px[i] += (alvo[0]*L - r)*w; px[i+1] += (alvo[1]*L - g)*w; px[i+2] += (alvo[2]*L - b)*w;
  }
  /* ===== LIMPEZA, NO MESMO PASSE =====
     O molde veio do modelo com fundo cinza chapado e um pescoco proprio. Os
     dois atrapalham a montagem por camadas: com fundo embutido nao ha' como
     trocar o fundo por clube nem pôr a cabeca ATRAS do colarinho, e o pescoco
     do molde fica por baixo do pescoco da cabeca gerada — pele sobre pele.

     E' feito AQUI, e nao com IA, por uma razao dura: o modelo ignora
     instrucao de enquadramento (ja' provado com os moldes e com as cabecas),
     entao pedir "o mesmo uniforme sem pescoco, mesmas medidas" devolveria
     outro uniforme. O canvas nao tem essa liberdade — mesma tela, mesmos
     W x H, so' apagando o que sobra. Dimensao identica por construcao.

     Nada disso apaga arquivo: o molde original continua no Storage, e o que
     sai daqui e' a pintura do clube, que ja' era um arquivo novo. */
  if(estilo){
    /* 1) FUNDO — inundacao a partir das bordas, nunca "apague o que for
       cinza": cinza tambem e' sombra de dobra e camisa clara, e a regra por
       cor abriria buracos no meio do tecido. */
    const T = 30;
    const canto = [[0,0],[W-1,0],[0,H-1],[W-1,H-1],[W>>1,0]];
    let r0=0,g0=0,b0=0;
    for(const [x,y] of canto){ const k=((y*W)+x)*4; r0+=px[k]; g0+=px[k+1]; b0+=px[k+2]; }
    r0/=canto.length; g0/=canto.length; b0/=canto.length;
    const dist = k => Math.max(Math.abs(px[k]-r0), Math.abs(px[k+1]-g0), Math.abs(px[k+2]-b0));
    const visto = new Uint8Array(W*H), fila = [];
    const poe = (x,y) => { if(x<0||y<0||x>=W||y>=H) return; const i=y*W+x;
      if(visto[i]) return; visto[i]=1; if(dist(i*4) <= T) fila.push(i); };
    for(let x=0; x<W; x++){ poe(x,0); poe(x,H-1); }
    for(let y=0; y<H; y++){ poe(0,y); poe(W-1,y); }
    while(fila.length){ const i = fila.pop(), x = i%W, y = (i/W)|0;
      px[i*4+3] = 0; poe(x+1,y); poe(x-1,y); poe(x,y+1); poe(x,y-1); }
    /* borda meio transparente, para nao serrilhar */
    for(let y=1; y<H-1; y++) for(let x=1; x<W-1; x++){
      const i=y*W+x; if(!px[i*4+3]) continue;
      if((!px[(i-1)*4+3] || !px[(i+1)*4+3] || !px[(i-W)*4+3] || !px[(i+W)*4+3]) && dist(i*4) <= T*1.8)
        px[i*4+3] = 110;
    }
    /* 2) PESCOCO — corte reto na linha da gola. Naquela altura so' o pescoco
       cruza o corte: os ombros ja' descem, entao nada da camisa se perde. */
    const yCorte = Math.round((golaDoEstilo(estilo) + GOLA_CORTE) * H);
    for(let y=0; y<Math.max(0, Math.min(H, yCorte)); y++)
      for(let x=0; x<W; x++) px[((y*W)+x)*4+3] = 0;
  }
  cx.putImageData(d, 0, 0);
  /* WebP guarda transparencia — as camadas dependem disso */
  const blob = await new Promise(ok => cv.toBlob(ok, 'image/webp', 0.85));
  if(!blob) throw new Error('Falha ao exportar a pintura.');
  return blob;
}
/* miniatura/visual composto: a camisa por baixo, o rosto por cima. Os percentuais
   casam com o enquadramento pedido nos dois prompts — ajuste fino é aqui, num lugar só. */
/* posição padrão do logo do patrocinador — o ajuste fino por clube (drag and
   drop no Estúdio) fica salvo em atributos.patro do uniforme e vence o padrão */
const PATRO_POS_PADRAO  = { x:33, y:65, w:34 };  // left %, top %, largura % (altura acompanha)
const ESCUDO_POS_PADRAO = { x:57, y:30, w:22 };  // peito esquerdo do jogador, altura do peito
const RATIO_FOTO = 1.5;   // retrato 2:3 (1024x1536) — o formato do cartão do jogador no site
const FAB_POS_PADRAO = { x:27, y:57, w:9 };   // fabricante: lado oposto ao escudo, menor
/* AS POSIÇÕES SÃO DO QUADRO DO UNIFORME (torso, sem cabeça). Na FOTO do jogador
   a camisa fica mais para baixo e um pouco menor — este mapa desloca/encolhe as
   camadas SÓ quando a base é a foto. Calibrado nos dois quadros; ajuste aqui. */
const FOTO_AJUSTE = { y0:34, yEsc:0.70, xEsc:0.77 };
function posParaFoto(p){
  const w = p.w * FOTO_AJUSTE.xEsc;
  const cx = 50 + (p.x + p.w/2 - 50) * FOTO_AJUSTE.xEsc;
  return { x: cx - w/2, y: FOTO_AJUSTE.y0 + p.y * FOTO_AJUSTE.yEsc, w };
}
function posDaFoto(p){
  const w = p.w / FOTO_AJUSTE.xEsc;
  const cx = 50 + (p.x + p.w/2 - 50) / FOTO_AJUSTE.xEsc;
  return { x: cx - w/2, y: (p.y - FOTO_AJUSTE.y0) / FOTO_AJUSTE.yEsc, w };
}
function compostoHTML(torsoUrl, rostoUrl, px, raio, camadas, emFoto){
  /* camadas, de baixo para cima: uniforme/foto final -> escudo -> fabricante ->
     patrocinador -> rosto. `camadas` = {patroUrl, escudoUrl, fabUrl, patro,
     escudo, fabricante}; posições arrastadas (✥/🛡) vencem os padrões — com o
     enquadramento canônico, os padrões já caem no lugar certo da camisa.
     Contêiner RETRATO 2:3 — px é a LARGURA; quadrada antiga aparece em cover. */
  const cm = camadas || {};
  const alt = Math.round(px*RATIO_FOTO);
  let pp = Object.assign({}, PATRO_POS_PADRAO,  cm.patro||{});
  let pe = Object.assign({}, ESCUDO_POS_PADRAO, cm.escudo||{});
  let pf = Object.assign({}, FAB_POS_PADRAO,    cm.fabricante||{});
  if(emFoto){ pp = posParaFoto(pp); pe = posParaFoto(pe); pf = posParaFoto(pf); }
  return `<span style="position:relative;display:inline-block;width:${px}px;height:${alt}px;border-radius:${raio!=null?raio:8}px;overflow:hidden;background:#d9d9d9">
    <img src="${h(torsoUrl)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
    ${cm.escudoUrl?`<img src="${h(cm.escudoUrl)}" style="position:absolute;left:${pe.x}%;top:${pe.y}%;width:${pe.w}%">`:''}
    ${cm.fabUrl?`<img src="${h(cm.fabUrl)}" style="position:absolute;left:${pf.x}%;top:${pf.y}%;width:${pf.w}%">`:''}
    ${cm.patroUrl?`<img src="${h(cm.patroUrl)}" style="position:absolute;left:${pp.x}%;top:${pp.y}%;width:${pp.w}%">`:''}
    ${rostoUrl?`<img src="${h(rostoUrl)}" style="position:absolute;left:50%;transform:translateX(-50%);top:-3%;height:72%;object-fit:contain">`:''}
  </span>`;
}

/* ---------- página ---------- */
/* ===== COMPARADOR DOS DOIS CAMINHOS =====
   Gera O MESMO jogador pelos dois metodos e poe lado a lado. Os atributos sao
   sorteados UMA vez e usados nos dois, senao a comparacao seria entre pessoas
   diferentes e nao entre metodos.

   NAO GRAVA NADA em player_photos: e' um teste, e um teste que sobrescreve a
   foto boa do elenco nao e' teste, e' acidente. As imagens ficam no Storage
   (ja' foram pagas) e as URLs aparecem na tela. */
/* ===== ENCAIXE DA CABECA, NA MAO =====
   Gera SO' o rosto (US$ 0,044) e deixa VOCE arrastar e redimensionar ate'
   encaixar, com a medida ao vivo. O calculo automatico entra como ponto de
   partida; o que vale e' o numero que sair daqui.

   O corpo nao se mexe: entra sempre na escala calibrada (TORSO_ESCALA),
   ancorado embaixo, no quadro 2:3 das fotos de IA. As guias mostram onde ele
   esta' — topo do uniforme e linha da gola — para o ajuste ter referencia. */
async function compararMetodos(item, p){
  const t = D.fotos[item.c.id+'|'+TORSO_KEY];
  if(!t) return toast('Este clube precisa de uniforme antes: ele é a base do encaixe.', true);
  if(!await rfConfirm({ titulo:'Gerar a cabeça e encaixar',
    texto:`Vou gerar <b>só o rosto</b> de <b>${h(p.n)}</b>. Depois você arrasta e redimensiona até encaixar.`,
    detalhe:'Custo: <b>US$ 0,044</b> — uma imagem. O uniforme não é gerado nem alterado. Nada é salvo no elenco.',
    nao:'Agora não', sim:'Gerar a cabeça (~US$ 0,04)' })) return;

  const at = sortearAtributos(p);
  const caminho = caminhoClube(item)+'/comparacao/'+(chaveNome(p.n)||'jogador');
  let rosto = null, medida = null, erro = null;
  try{
    rosto = await gerarImagemIA('rosto', promptRostoMolde(item, p, at), 'medium', null, caminho+'-cabeca',
      'Gerando só a cabeça…');
    medida = await medirRosto(rosto);
  }catch(err){ erro = err.message; }
  if(!rosto) return abrirModal(`<div class="card-h"><b>${h(p.n)}</b></div>
    <div class="card-p"><div class="erro">${h(erro||'não saiu')}</div></div>`, 'lg');

  const estilo = (t.atributos||{}).estilo;
  /* o eixo do CORPO: a cabeca casa com o uniforme, nao com a moldura */
  const centroMolde = await medirCentroX(t.url);

  /* UM CLUBE DE CADA ESTILO, com a MESMA cabeca e os MESMOS numeros. Sem isto
     a calibragem e' uma amostra de um: as golas dos 5 moldes divergem quase 4
     pontos entre si, entao um numero que assenta num pode desencaixar noutro.
     Nada e' gerado — sao os torsos que ja' existem, so' remontados. */
  const vistos = new Set([estilo]);
  const amostras = [{ estilo, nome: item.c.name || item.c.id, url: t.url, centro: centroMolde }];
  for(const x of (D.catalogo || [])){
    const tt = D.fotos[x.c.id+'|'+TORSO_KEY];
    const e = tt && (tt.atributos||{}).estilo;
    if(!e || !tt.url || vistos.has(e)) continue;
    vistos.add(e);
    amostras.push({ estilo:e, nome: x.c.name || x.c.id, url: tt.url, centro: 0.5 });
  }
  await Promise.all(amostras.slice(1).map(async a => { a.centro = await medirCentroX(a.url); }));
  /* CADA CAMISA VIRA CAMADA: o fundo cinza sai por inundacao de borda, aqui e
     agora, sem IA e sem tocar no arquivo do Storage. Falhar nao pode derrubar
     a bancada — sem recorte, usa-se a imagem original. */
  await Promise.all(amostras.map(async a => {
    try{ a.limpo = await tirarFundo(a.url); }catch(_){ a.limpo = null; }
  }));
  const camisaDe = a => (st.semFundo && a.limpo) ? a.limpo : a.url;
  const rotuloEstilo = e => ((ESTILOS_CAMISA.find(x=>x[0]===e)||[])[1]) || e || '—';

  /* ===== O QUADRO NAO E' 2:3 =====
     A Ficha do Jogador mostra a foto num QUADRADO (.rf-fotonum, 38/52/64px,
     object-fit:cover com object-position:50% 8%) — o jogo so' exibe de 2,7% a
     69,3% da foto 2:3 guardada. Compor em 2:3 e' compor num quadro que
     ninguem ve': a cabeca no tamanho certo simplesmente nao cabe acima da
     gola, e sai cortada em cima.

     Daqui em diante toda a geometria e' relativa a `st.rq` (altura/largura do
     quadro), e nao mais a RATIO_FOTO. O molde continua 2:3 — ele nao mudou —
     mas sua ALTURA dentro do quadro passa a depender do formato escolhido. */
  const FORMATOS = { ficha:[RATIO_QUADRO, 'Ficha do Jogador (1:1)'], foto:[RATIO_FOTO, 'Foto guardada (2:3)'] };
  const alturaTorso = () => TORSO_ESCALA*RATIO_FOTO/st.rq;   // fracao da ALTURA do quadro
  /* PARAMETRIZADO PELO TOPO, nao pelo rodape. Num quadro 1:1 o molde 2:3 e'
     mais alto que o quadro (128%): ancorar embaixo empurra a gola para fora
     por cima. O padrao reproduz o que o jogo mostra — em 2:3, o torso comeca
     em 14,5%; no quadrado, o mesmo ponto visto pela janela da Ficha. */
  const topoPadrao = rq => rq === RATIO_QUADRO ? ENCAIXE_TOPO_CORPO : (1-TORSO_ESCALA);
  const corpoTopo   = () => st.corpoY;
  const golaNoQuadro = e => corpoTopo() + golaDoEstilo(e)*alturaTorso();
  const largRender  = () => st.alt*st.rq;                    // largura do render do rosto
  /* o recorte que a Ficha faz na foto 2:3, para se ver o que o jogo mostra */
  const JANELA = { alt: 1/RATIO_FOTO, topo: 0.08*(1 - 1/RATIO_FOTO) };
  const auto = encaixeComposto(medida, estilo, eixoNoQuadro(centroMolde, TORSO_X)) || { rostoAltura:0.35, rostoTopo:0.02 };

  /* ---- A GRADE ----------------------------------------------------------
     4 colunas x 6 linhas = 24 quadrantes de 25% x 16,67%, nomeados A1..D6.
     O nome nao e' enfeite: e' assim que a medida vira instrucao repetivel
     ("ancora em C4"), em vez de um numero solto que so vale para esta foto.

     A ANCORA NAO E' O TOPO DA CABECA, e' a BASE DO PESCOCO. E' o unico ponto
     que precisa encontrar a gola; ancorar pelo topo faz cada cabeca — que tem
     testa e cabelo de altura diferente — cair num lugar diferente com o mesmo
     numero. Pela base do pescoco, o mesmo numero encaixa qualquer cabeca. */
  const GRADE = { cols:4, linhas:6 };
  const COLA = { celula:[1/4, 1/6], meia:[1/8, 1/12], quarto:[1/16, 1/24], livre:[0, 0] };
  const LETRA = 'ABCDEFGH';
  const celulaDe = (x, y) => {
    const c = Math.max(0, Math.min(GRADE.cols-1,  Math.floor(x*GRADE.cols)));
    const l = Math.max(0, Math.min(GRADE.linhas-1, Math.floor(y*GRADE.linhas)));
    return LETRA[c] + (l+1);
  };
  const gruda = (v, passo) => passo ? Math.round(v/passo)*passo : v;

  /* estado: alt = altura do render; ancX/ancY = a base do pescoco no quadro */
  const st = { rq: RATIO_QUADRO, corpoX: TORSO_X, corpoY: 0,   /* = topo do corpo; ajustado logo abaixo */ junto: true,
               alt: ENCAIXE_LARG_CABECA/(medida.larg*RATIO_QUADRO),
               ancX: eixoNoQuadro(centroMolde, TORSO_X), ancY: 0,
               cola: 'meia', ima: true, cortar: true, corte: auto.corte,
               semFundo: true, fundo: '#e8e8e4' };
  const eixoAtual = () => eixoNoQuadro(centroMolde, st.corpoX);
  st.corpoY = topoPadrao(st.rq);
  st.ancY = golaNoQuadro(estilo);   // nasce colada na gola

  const gradeHTML = () => {
    let h = '';
    for(let c=1; c<GRADE.cols; c++)
      h += `<span style="position:absolute;top:0;bottom:0;left:${(c/GRADE.cols*100).toFixed(2)}%;border-left:1px solid #00000026"></span>`;
    for(let l=1; l<GRADE.linhas; l++)
      h += `<span style="position:absolute;left:0;right:0;top:${(l/GRADE.linhas*100).toFixed(2)}%;border-top:1px solid #00000026"></span>`;
    for(let c=0; c<GRADE.cols; c++) for(let l=0; l<GRADE.linhas; l++)
      h += `<span style="position:absolute;left:${(c/GRADE.cols*100).toFixed(2)}%;top:${(l/GRADE.linhas*100).toFixed(2)}%;
             width:${(100/GRADE.cols).toFixed(2)}%;height:${(100/GRADE.linhas).toFixed(2)}%;
             font:600 8.5px/1 ui-monospace,monospace;color:#00000038;padding:2px 0 0 3px;box-sizing:border-box">${LETRA[c]}${l+1}</span>`;
    return h;
  };
  /* pontos de cola visiveis: os cantos dos quadrantes */
  const pontosHTML = () => {
    let h = '';
    for(let c=0; c<=GRADE.cols; c++) for(let l=0; l<=GRADE.linhas; l++)
      h += `<span class="enc-pt" data-x="${(c/GRADE.cols).toFixed(4)}" data-y="${(l/GRADE.linhas).toFixed(4)}"
             style="position:absolute;left:${(c/GRADE.cols*100).toFixed(2)}%;top:${(l/GRADE.linhas*100).toFixed(2)}%;
             width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:#00000030"></span>`;
    return h;
  };

  abrirModal(`
    <div class="card-h"><b>${h(p.n)} — encaixe na grade</b></div>
    <div class="card-p col" style="gap:16px">
      <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start">
        <div style="flex:0 0 300px">
          <div id="enc-palco" style="position:relative;width:300px;
               border-radius:10px;overflow:hidden;background:#d9d9d9;cursor:grab;touch-action:none;user-select:none">
            <span id="enc-fundo" style="position:absolute;inset:0;pointer-events:none"></span>
            <img id="enc-corpo" src="${h(t.url)}" draggable="false"
                 style="position:absolute;transform:translateX(-50%);width:${(TORSO_ESCALA*100).toFixed(1)}%;pointer-events:none">
            <img id="enc-rosto" src="${h(rosto)}" draggable="false" style="position:absolute;object-fit:contain;pointer-events:none">
            <span style="position:absolute;inset:0;pointer-events:none">
              ${gradeHTML()}${pontosHTML()}
              <span style="position:absolute;left:0;right:0;top:${(TORSO_TOPO*100).toFixed(2)}%;border-top:1px dashed #35c46a"></span>
              <span id="enc-linha-gola" style="position:absolute;left:0;right:0;border-top:1.5px dashed #e3b23c"></span>
              <span id="enc-caixa" style="position:absolute;width:${(TORSO_ESCALA*100).toFixed(2)}%;transform:translateX(-50%);border:1px dashed #35c46a55"></span>
              <span id="enc-janela" style="position:absolute;left:0;right:0;border:1.5px solid #2f7fd655;display:none"></span>
              <span id="enc-eixo" style="position:absolute;top:0;bottom:0;border-left:1px dashed #2f7fd6"></span>
              <span id="enc-linha-corte" style="position:absolute;width:${(TORSO_ESCALA*100).toFixed(2)}%;transform:translateX(-50%);border-top:1px dotted #d94a4a99"></span>
              <span id="enc-anc" style="position:absolute;width:13px;height:13px;margin:-6.5px 0 0 -6.5px">
                <span style="position:absolute;left:6px;top:0;bottom:0;border-left:1.5px solid #d94a4a"></span>
                <span style="position:absolute;top:6px;left:0;right:0;border-top:1.5px solid #d94a4a"></span>
              </span>
            </span>
          </div>
          <div style="margin-top:8px;font-size:11.5px;color:var(--dim2);line-height:1.7">
            <span style="color:#35c46a">— topo do uniforme</span> ·
            <span style="color:#e3b23c">— gola</span> ·
            <span style="color:#d94a4a">✛ âncora (base do pescoço)</span> ·
            <span style="color:#2f7fd6">| eixo do uniforme</span><br>
            Arraste no palco. Setas do teclado andam um ponto de cola; <b>+</b>/<b>−</b> mudam o tamanho.
          </div>
        </div>

        <div class="col" style="gap:12px;flex:1;min-width:290px">
          <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
            <span style="font-size:12.5px;color:var(--dim)">Quadro</span>
            <select id="enc-rq" class="inp inp-sm" style="width:auto">
              <option value="ficha" selected>Ficha do Jogador (1:1)</option>
              <option value="foto">Foto guardada (2:3)</option>
            </select>
            <span style="font-size:12.5px;color:var(--dim)">Cola</span>
            <select id="enc-cola" class="inp inp-sm" style="width:auto">
              <option value="celula">Quadrante inteiro (25% × 16,7%)</option>
              <option value="meia" selected>Meio quadrante (12,5% × 8,3%)</option>
              <option value="quarto">Um quarto (6,25% × 4,2%)</option>
              <option value="livre">Livre (sem cola)</option>
            </select>
            <label style="font-size:12.5px;color:var(--dim);display:flex;gap:6px;align-items:center">
              <input type="checkbox" id="enc-ima" checked> ímã da gola</label>
            <label style="font-size:12.5px;color:var(--dim);display:flex;gap:6px;align-items:center">
              <input type="checkbox" id="enc-cortar" checked> cortar o pescoço do uniforme</label>
            <label style="font-size:12.5px;color:var(--dim);display:flex;gap:6px;align-items:center">
              <input type="checkbox" id="enc-semfundo" checked> fundo em camada própria</label>
            <input type="color" id="enc-cor" value="#e8e8e4" title="cor do fundo"
                   style="width:34px;height:24px;padding:0;border:1px solid var(--linha);background:none;border-radius:6px">
          </div>

          <label class="aj-sl" style="color:var(--fg)"><span style="width:110px">Linha do corte</span>
            <input id="enc-corte" type="range" min="0" max="45" step="0.25" value="${(st.corte*100).toFixed(2)}"></label>

          <div class="card" style="padding:10px 12px;background:var(--card2);display:flex;flex-direction:column;gap:8px">
            <div class="row" style="gap:10px;align-items:center;flex-wrap:wrap">
              <span class="tt" style="font-size:12px">Uniforme</span>
              <label style="font-size:12px;color:var(--dim);display:flex;gap:6px;align-items:center">
                <input type="checkbox" id="enc-junto" checked> a cabeça acompanha</label>
              <button class="btn btn-sm btn-ghost" id="enc-centro" style="margin-left:auto">Centrar</button>
            </div>
            <label class="aj-sl" style="color:var(--fg)"><span style="width:96px">↔ livre</span>
              <input id="enc-corpox" type="range" min="25" max="75" step="0.05" value="${(TORSO_X*100).toFixed(2)}"></label>
            <label class="aj-sl" style="color:var(--fg)"><span style="width:96px">↕ livre</span>
              <input id="enc-corpoy" type="range" min="-30" max="90" step="0.05" value="0"></label>
          </div>

          <label class="aj-sl" style="color:var(--fg)"><span style="width:110px">Tamanho</span>
            <input id="enc-alt" type="range" min="10" max="80" step="0.5" value="${(st.alt*100).toFixed(1)}"></label>
          <label class="aj-sl" style="color:var(--fg)"><span style="width:110px">Âncora ↕</span>
            <input id="enc-y" type="range" min="0" max="100" step="0.1" value="${(st.ancY*100).toFixed(1)}"></label>
          <label class="aj-sl" style="color:var(--fg)"><span style="width:110px">Âncora ↔</span>
            <input id="enc-x" type="range" min="0" max="100" step="0.1" value="50"></label>

          <div class="card" style="padding:12px 14px;background:var(--card2)">
            <div class="tt" style="font-size:12.5px;margin-bottom:8px">Medida atual — é isto que eu preciso</div>
            <pre id="enc-saida" class="mono" style="margin:0;font-size:12px;line-height:1.7;white-space:pre-wrap;color:var(--fg)"></pre>
            <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">
              <button class="btn btn-sm" id="enc-gola">Colar na gola</button>
              <button class="btn btn-sm btn-ghost" id="enc-copiar">Copiar medida</button>
              <button class="btn btn-sm btn-ghost" id="enc-auto">Voltar ao calculado</button>
            </div>
          </div>

          <div class="st" style="font-size:12px;line-height:1.6">
            O rosto gerado mede <b>topo ${(medida.topo*100).toFixed(1)}%</b>,
            <b>base do pescoço ${(medida.base*100).toFixed(1)}%</b>,
            <b>largura ${(medida.larg*100).toFixed(1)}%</b> no próprio quadro.
            O corpo está fixo em ${(TORSO_ESCALA*100).toFixed(1)}% e não se mexe.
          </div>
        </div>
      </div>
      <div class="card" style="padding:12px 14px;background:var(--card2)">
        <div class="tt" style="font-size:12.5px;margin-bottom:4px">Os ${amostras.length} estilos com esta mesma cabeça</div>
        <div class="st" style="font-size:12px;margin-bottom:10px">
          Mesmos números, aplicados como <b>distância</b> — o tamanho e a posição do uniforme são iguais em todos;
          a âncora e o corte acompanham a gola de cada estilo, que difere entre eles.
          Nada foi gerado aqui: são os uniformes que já existem.
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          ${amostras.map((a,i)=>`<div style="width:150px">
            <div id="enc-q${i}" style="position:relative;width:150px;
                 border-radius:8px;overflow:hidden;background:#d9d9d9">
              <img id="enc-q${i}-c" src="${h(a.url)}" style="position:absolute;transform:translateX(-50%);width:${(TORSO_ESCALA*100).toFixed(1)}%">
              <img id="enc-q${i}-r" src="${h(rosto)}" style="position:absolute;transform:translateX(-50%);object-fit:contain">
            </div>
            <div style="margin-top:6px;font-size:11px;line-height:1.4;color:var(--dim)">
              <b style="color:var(--fg)">${h(rotuloEstilo(a.estilo))}</b><br>${h(a.nome)}
              <span class="mono" id="enc-q${i}-m" style="display:block;color:var(--dim2);font-size:10px"></span>
            </div>
          </div>`).join('')}
        </div>
      </div>
      <small style="font-size:12px;color:var(--dim2)">${h(resumoAtributos(at))} · nada foi salvo no elenco.</small>
    </div>`, 'xl');

  const palco = el('enc-palco'), img = el('enc-rosto'), saida = el('enc-saida'), anc = el('enc-anc');
  const corpo = el('enc-corpo'), linhaCorte = el('enc-linha-corte');
  const caixa = el('enc-caixa'), eixo = el('enc-eixo'), janela = el('enc-janela');
  const fundoEl = el('enc-fundo'), linhaGola = el('enc-linha-gola');
  const pts = Array.from(palco.querySelectorAll('.enc-pt'));

  const desenha = () => {
    const [px, py] = COLA[st.cola];
    st.ancX = Math.max(0, Math.min(1, gruda(st.ancX, px)));
    st.ancY = Math.max(0, Math.min(1, gruda(st.ancY, py)));
    /* IMA DA GOLA: dentro de meia celula, a ancora salta para a linha da gola.
       E' o encaixe que interessa, e ele quase nunca cai num canto da grade. */
    if(st.ima && Math.abs(st.ancY - golaNoQuadro(estilo)) < (py || 1/24)/2 + 0.004) st.ancY = golaNoQuadro(estilo);

    palco.style.aspectRatio = (1/st.rq).toFixed(4);
    const topo = st.ancY - medida.base*st.alt;
    const lr = largRender();
    const cx = medida.cx == null ? 0.5 : medida.cx;
    const cTopo = corpoTopo(), hTorso = alturaTorso();
    img.style.height = (st.alt*100).toFixed(2)+'%';
    img.style.top    = (topo*100).toFixed(2)+'%';
    /* recua o quanto a CABECA estiver fora do centro da propria imagem, para
       que o que casa com o eixo do corpo seja ela, nao o quadrado dela */
    img.style.left   = ((st.ancX - (cx-0.5)*lr)*100).toFixed(2)+'%';
    img.style.transform = 'translateX(-50%)';
    fundoEl.style.background = st.semFundo ? st.fundo : 'transparent';
    const srcCamisa = camisaDe(amostras[0]);
    if(corpo.getAttribute('src') !== srcCamisa) corpo.src = srcCamisa;
    corpo.style.left = (st.corpoX*100).toFixed(2)+'%';
    corpo.style.top  = (cTopo*100).toFixed(2)+'%';
    caixa.style.left = (st.corpoX*100).toFixed(2)+'%';
    caixa.style.top  = (cTopo*100).toFixed(2)+'%';
    caixa.style.height = (hTorso*100).toFixed(2)+'%';
    linhaGola.style.top = (golaNoQuadro(estilo)*100).toFixed(2)+'%';
    linhaCorte.style.left = (st.corpoX*100).toFixed(2)+'%';
    eixo.style.left  = (eixoAtual()*100).toFixed(2)+'%';
    /* a janela que a Ficha recorta so' faz sentido sobre a foto 2:3 */
    janela.style.display = st.rq === 1 ? 'none' : '';
    janela.style.top = (JANELA.topo*100).toFixed(2)+'%';
    janela.style.height = (JANELA.alt*100).toFixed(2)+'%';
    corpo.style.clipPath = st.cortar ? `inset(${(st.corte*100).toFixed(2)}% 0 0 0)` : '';
    linhaCorte.style.display = st.cortar ? '' : 'none';
    /* a linha do corte esta' na altura do MOLDE; no quadro ela vira: */
    linhaCorte.style.top = ((cTopo + st.corte*hTorso)*100).toFixed(2)+'%';
    anc.style.left = (st.ancX*100).toFixed(2)+'%';
    anc.style.top  = (st.ancY*100).toFixed(2)+'%';

    const perto = (a,b) => Math.abs(a-b) < 0.004;
    pts.forEach(d => { const on = perto(+d.dataset.x, st.ancX) && perto(+d.dataset.y, st.ancY);
      d.style.background = on ? '#d94a4a' : '#00000030'; d.style.transform = on ? 'scale(1.6)' : ''; });

    /* a imagem e' quadrada: o lado renderizado em fracao da LARGURA e' alt*RATIO_FOTO */
    const cab = medida.larg * lr;
    saida.textContent =
      `camadas             : fundo · camisa${st.cortar?' (sem pescoço)':''}${st.semFundo?' · sem fundo':''} · cabeça\n`+
      `cor do fundo        : ${st.fundo}${amostras.some(a=>!a.limpo)?'   (⚠ algum molde não recortou)':''}\n`+
      `formato do quadro   : ${st.rq === 1 ? '1:1 — Ficha do Jogador' : '2:3 — foto guardada'}\n`+
      `quadrante da âncora : ${celulaDe(st.ancX, st.ancY)}   (cola: ${st.cola})\n`+
      `âncora ↔            : ${(st.ancX*100).toFixed(2)}%\n`+
      `âncora ↕ (pescoço)  : ${(st.ancY*100).toFixed(2)}%${perto(st.ancY,golaNoQuadro(estilo))?'   ← na gola':''}\n`+
      `gola do uniforme    : ${(golaNoQuadro(estilo)*100).toFixed(2)}%   (${st.ancY>golaNoQuadro(estilo)?'+':''}${((st.ancY-golaNoQuadro(estilo))*100).toFixed(2)}%)\n`+
      `tamanho do render   : ${(st.alt*100).toFixed(2)}%\n`+
      `topo do rosto        : ${(topo*100).toFixed(2)}%\n`+
      `cabeça no quadro    : ${(cab*100).toFixed(2)}% de largura\n`+
      `topo do uniforme    : ${(cTopo*100).toFixed(2)}%   (padrão ${(topoPadrao(st.rq)*100).toFixed(2)}%)\n`+
      `uniforme ↔          : ${(st.corpoX*100).toFixed(2)}%   (${st.corpoX>TORSO_X?'+':''}${((st.corpoX-TORSO_X)*100).toFixed(2)}% do centro)\n`+
      `eixo do uniforme    : ${(eixoAtual()*100).toFixed(2)}%   (âncora ${st.ancX>eixoAtual()?'+':''}${((st.ancX-eixoAtual())*100).toFixed(2)}%)\n`+
      `centro do molde     : ${(centroMolde*100).toFixed(2)}% da própria imagem\n`+
      `centro da cabeça    : ${(cx*100).toFixed(2)}% da própria imagem\n`+
      `corte do pescoço    : ${st.cortar ? (st.corte*100).toFixed(2)+'% do molde  (gola '+(golaDoEstilo(estilo)*100).toFixed(2)+'%)' : 'desligado'}\n`+
      `— rosto: topo ${(medida.topo*100).toFixed(1)}% · base ${(medida.base*100).toFixed(1)}% · larg ${(medida.larg*100).toFixed(1)}%`;

    el('enc-alt').value = (st.alt*100).toFixed(1);
    el('enc-y').value   = (st.ancY*100).toFixed(1);
    el('enc-x').value   = (st.ancX*100).toFixed(1);
    /* OS NUMEROS VIAJAM COMO DISTANCIA, nao como absoluto: tamanho e posicao
       do corpo sao os mesmos, mas ancora e corte sao medidos a partir da gola
       DAQUELE estilo — e' o que faz um ajuste so' valer para os cinco. */
    const dAncY  = st.ancY - golaNoQuadro(estilo);
    const dAncX  = st.ancX - eixoAtual();
    const dCorte = st.corte - golaDoEstilo(estilo);
    amostras.forEach((a,i) => {
      const c = el('enc-q'+i+'-c'), r = el('enc-q'+i+'-r'), m = el('enc-q'+i+'-m');
      if(!c || !r) return;
      const q = el('enc-q'+i); if(q) q.style.aspectRatio = (1/st.rq).toFixed(4);
      if(q) q.style.background = st.semFundo ? st.fundo : '#d9d9d9';
      const sc = camisaDe(a); if(c.getAttribute('src') !== sc) c.src = sc;
      c.style.top = (cTopo*100).toFixed(2)+'%';
      const aY = golaNoQuadro(a.estilo) + dAncY;
      const aX = eixoNoQuadro(a.centro, st.corpoX) + dAncX;
      const aC = golaDoEstilo(a.estilo) + dCorte;
      c.style.left = (st.corpoX*100).toFixed(2)+'%';
      c.style.clipPath = st.cortar ? `inset(${(aC*100).toFixed(2)}% 0 0 0)` : '';
      r.style.height = (st.alt*100).toFixed(2)+'%';
      r.style.top    = ((aY - medida.base*st.alt)*100).toFixed(2)+'%';
      r.style.left   = ((aX - (cx-0.5)*lr)*100).toFixed(2)+'%';
      if(m) m.textContent = `gola ${(golaNoQuadro(a.estilo)*100).toFixed(1)}% · eixo ${(eixoNoQuadro(a.centro, st.corpoX)*100).toFixed(1)}%`;
    });

    el('enc-corte').value  = (st.corte*100).toFixed(2);
    el('enc-corpox').value = (st.corpoX*100).toFixed(2);
    el('enc-corpoy').value = (st.corpoY*100).toFixed(2);
  };
  desenha();

  el('enc-cola').onchange = e => { st.cola = e.target.value; desenha(); };
  el('enc-ima').onchange     = e => { st.ima = e.target.checked; desenha(); };
  el('enc-semfundo').onchange = e => { st.semFundo = e.target.checked; desenha(); };
  el('enc-cor').oninput       = e => { st.fundo = e.target.value; desenha(); };
  el('enc-cortar').onchange  = e => { st.cortar = e.target.checked; desenha(); };
  el('enc-corte').oninput    = e => { st.corte = Number(e.target.value)/100; desenha(); };
  el('enc-junto').onchange   = e => { st.junto = e.target.checked; };
  /* MOVER O UNIFORME LEVA A CABECA JUNTO por padrao: o alinhamento ja' foi
     conquistado, e sem isso cada nudge do corpo o desfaz. Desligue para
     deslocar um em relacao ao outro de proposito. */
  /* trocar o formato reposiciona o corpo, logo a gola muda de lugar: a ancora
     e o tamanho sao refeitos, senao o encaixe se desfaz na troca */
  el('enc-rq').onchange = e => {
    st.rq = FORMATOS[e.target.value][0];
    st.alt = ENCAIXE_LARG_CABECA/(medida.larg*st.rq);
    st.corpoY = topoPadrao(st.rq);
    st.ancY = golaNoQuadro(estilo); st.ancX = eixoAtual(); desenha(); };
  el('enc-corpoy').oninput   = e => { st.corpoY = Number(e.target.value)/100; desenha(); };
  el('enc-corpox').oninput   = e => {
    const novo = Number(e.target.value)/100;
    if(st.junto) st.ancX += novo - st.corpoX;
    st.corpoX = novo; desenha(); };
  el('enc-centro').onclick   = () => { st.corpoY = topoPadrao(st.rq);
    if(st.junto) st.ancX += TORSO_X - st.corpoX;
    st.corpoX = TORSO_X; desenha(); };
  const liga = (id, campo) => { const c = el(id); c.oninput = () => { st[campo] = Number(c.value)/100; desenha(); }; };
  liga('enc-alt','alt'); liga('enc-y','ancY'); liga('enc-x','ancX');

  let arr = null;
  const pt = e => (e.touches && e.touches[0]) || e;
  const baixa = e => { const r = palco.getBoundingClientRect(), q = pt(e);
    arr = { px:q.clientX, py:q.clientY, x:st.ancX, y:st.ancY, w:r.width, h:r.height };
    palco.style.cursor='grabbing'; e.preventDefault(); };
  const move = e => { if(!arr) return; const q = pt(e);
    st.ancX = arr.x + (q.clientX-arr.px)/arr.w;
    st.ancY = arr.y + (q.clientY-arr.py)/arr.h;
    desenha(); e.preventDefault(); };
  const solta = () => { if(arr){ arr = null; palco.style.cursor='grab'; } };
  palco.addEventListener('mousedown', baixa);
  palco.addEventListener('touchstart', baixa, { passive:false });
  document.addEventListener('mousemove', move);
  document.addEventListener('touchmove', move, { passive:false });
  document.addEventListener('mouseup', solta);
  document.addEventListener('touchend', solta);

  const tecla = e => {
    if(/^(INPUT|SELECT|TEXTAREA)$/.test((e.target||{}).tagName||'')) return;
    const [px, py] = COLA[st.cola];
    const dx = px || 0.005, dy = py || 0.005;
    if(e.key==='ArrowUp')         st.ancY -= dy;
    else if(e.key==='ArrowDown')  st.ancY += dy;
    else if(e.key==='ArrowLeft')  st.ancX -= dx;
    else if(e.key==='ArrowRight') st.ancX += dx;
    else if(e.key==='+'||e.key==='=') st.alt += 0.005;
    else if(e.key==='-')              st.alt -= 0.005;
    else return;
    e.preventDefault(); desenha();
  };
  document.addEventListener('keydown', tecla);

  el('enc-gola').onclick = () => { st.ancY = golaNoQuadro(estilo); st.ancX = eixoAtual(); desenha(); };
  el('enc-copiar').onclick = () => navigator.clipboard.writeText(saida.textContent).then(
    () => toast('Medida copiada — cole aqui na conversa.'),
    () => toast('Não consegui copiar; selecione o texto à mão.', true));
  el('enc-auto').onclick = () => { st.alt = ENCAIXE_LARG_CABECA/(medida.larg*st.rq); st.corpoY = topoPadrao(st.rq);
    st.ancX = eixoAtual(); st.ancY = golaNoQuadro(estilo); st.corte = auto.corte; desenha(); };

  /* os ouvintes vivem no documento; sem isto o teclado seguiria mexendo
     num palco que ja' foi fechado */
  const obs = new MutationObserver(() => {
    if(!document.getElementById('enc-palco')){
      document.removeEventListener('mousemove', move); document.removeEventListener('touchmove', move);
      document.removeEventListener('mouseup', solta); document.removeEventListener('touchend', solta);
      document.removeEventListener('keydown', tecla); obs.disconnect();
    }
  });
  obs.observe(el('modais'), { childList:true, subtree:true });
}

/* ---------- aba TREINADORES: a oficina das 10 faces padrao ----------
   Nao e' lista de clube: as faces sao globais do pacote, iguais para todo
   jogador. Por isso ela substitui o card de clubes inteiro (ver pgEstudio)
   e ignora o filtro de pais e a busca, que ali nao querem dizer nada. */
function faceCartaoHTML(genero, i){
  const est = ESTILOS_TREINADOR[i];
  const linha = D.fotos[TREINADOR_KEY+'|'+faceChave(genero, i)];
  const nome = faceNome(genero, est[0]);
  const pode = podeEditar('dados');
  const acao = pode
    ? `${linha?`<span class="link" style="font-size:11.5px" data-face-pos="${genero}:${i}" title="Arrastar escudo e marca">✥</span>`:''}
       <span class="link" style="font-size:11.5px" data-face-refazer="${genero}:${i}">✦ Gerar</span>`
    : '';
  const moldura = linha
    ? `border:1px solid var(--bd);background:var(--card2)`
    : `border:1px dashed var(--bd2);background:transparent`;
  /* a previa mostra o que o jogo mostra: retrato + camadas no lugar */
  const retrato = linha
    ? `<span data-face-ver="${h(linha.url)}" style="display:block;cursor:zoom-in">${trCompostoHTML(linha.url, genero, i)}</span>`
    : `<span style="width:100%;aspect-ratio:1/1;border-radius:9px;border:1px dashed var(--bd2);display:flex;align-items:center;justify-content:center;font-size:20px;color:#3d4a43">＋</span>`;
  return `<div style="${moldura};border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:9px;min-width:0">
    ${retrato}
    <span style="display:flex;flex-direction:column;gap:2px;min-width:0">
      <b style="font-size:12.5px;font-weight:600${linha?'':';color:var(--dim)'}">${h(est[1])}</b>
      <span class="mono" style="font-size:10.5px;color:var(--dim3)">${h(nome)}</span>
    </span>
    <span style="display:flex;align-items:center;gap:8px">
      <span class="tag ${linha?'t-ok':'t-dim'}">${linha?'gerada':'não gerada'}</span>
      <div style="flex:1"></div>
      ${acao}
    </span>
  </div>`;
}
function faceSecaoHTML(genero, titulo, primeira){
  return `<div class="rowh" style="grid-template-columns:1fr${primeira?'':';border-top:1px solid var(--bd)'}">
      <span>${h(titulo)}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;padding:16px 20px">
      ${ESTILOS_TREINADOR.map((_e, i) => faceCartaoHTML(genero, i)).join('')}
    </div>`;
}
/* A ROUPA SAI LIMPA DA IA e o desenho entra aqui: dois logos, guardados uma
   vez e aplicados nas dez faces. Trocar o logo depois nao custa geracao
   nenhuma — e' o ganho inteiro de usar camada em vez de prompt. */
function blocoMarcaHTML(){
  const m = trMarca(), pode = podeEditar('dados');
  const slot = (qual, rot, url) => `<span style="display:flex;align-items:center;gap:9px;min-width:0">
      <span style="width:40px;height:40px;flex:0 0 auto;border-radius:8px;border:1px solid var(--bd2);background:var(--card2);display:flex;align-items:center;justify-content:center;overflow:hidden">
        ${url?`<img src="${h(url)}" alt="" style="max-width:100%;max-height:100%;object-fit:contain">`
             :'<span style="font-size:15px;color:var(--dim3)">＋</span>'}</span>
      <span style="display:flex;flex-direction:column;gap:2px;min-width:0">
        <b style="font-size:12.5px;font-weight:600">${h(rot)}</b>
        ${pode?`<span class="link" style="font-size:11.5px" data-marca-up="${qual}">${url?'Trocar':'Enviar'}</span>`
              :`<span class="mono" style="font-size:10.5px;color:var(--dim3)">${url?'enviado':'sem logo'}</span>`}
      </span>
    </span>`;
  return `<div style="border-bottom:1px solid var(--bd);padding:14px 20px;display:flex;align-items:center;gap:26px;flex-wrap:wrap">
      ${slot('escudo','Escudo (Moda Esporte Clube)', m.escudoUrl)}
      ${slot('marca','Marca (RetroFoot)', m.marcaUrl)}
      <div style="flex:1"></div>
      <span style="font-size:11.5px;color:var(--dim2);max-width:340px;line-height:1.5">
        Entram como <b>camada</b> por cima da roupa, que a IA gera limpa. Use o ✥ de uma face para arrastar e definir a posição das dez.</span>
    </div>`;
}
function blocoTreinadoresHTML(){
  const faltam = facesQueFaltam().length;
  const prontas = 10 - faltam;
  const pro = D.avataresPro || { n:0, usd:0 };
  return `<div class="card" style="overflow:hidden">
      <div class="card-h">
        <b>As 10 faces padrão de treinador</b>
        <span class="mono" style="font-size:11.5px;color:var(--dim3);white-space:nowrap;flex:0 0 auto">${prontas} de 10 geradas</span>
        ${faltam && podeEditar('dados')
          ? `<button class="btn btn-sm" id="est-faces" style="white-space:nowrap;flex:0 0 auto"
               title="Gera só as faces que ainda não existem, nos 5 estilos de roupa">Gerar as faces que faltam (${faltam})</button>`
          : ''}
      </div>
      ${blocoMarcaHTML()}
      ${faceSecaoHTML('f', 'Treinadoras', true)}
      ${faceSecaoHTML('m', 'Treinadores', false)}
      <div style="border-top:1px solid var(--bd);padding:13px 20px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;font-size:12px;color:var(--dim2)">
        <span>Avatares gerados por assinantes Pro <b class="mono" style="color:var(--dim);font-weight:500">${num(pro.n)}</b></span>
        <span>Custo acumulado <b class="mono" style="color:var(--verde2);font-weight:500">US$ ${pro.usd.toFixed(2)}</b></span>
      </div>
    </div>`;
}

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

  /* numeros do rodape da aba Treinadores. SO' nesta aba: e' consulta que as
     outras tres nao usam, e o Estudio ja' carrega catalogo, patches e fotos —
     nao vale pendurar mais duas por pagina. Falhar aqui e' zero, nunca erro:
     o rodape e' informativo e nao pode impedir a oficina de abrir. */
  if(aba === 'treinadores'){
    D.avataresPro = { n:0, usd:0 };
    try{
      const [av, cst] = await Promise.all([
        jogo('coach_avatars').select('user_id', { count:'exact', head:true }).not('url','is',null),
        jogo('ia_custos').select('custo_usd').eq('tipo','treinador')
      ]);
      if(!av.error) D.avataresPro.n = av.count || 0;
      if(!cst.error) D.avataresPro.usd = (cst.data||[]).reduce((a,r)=>a+Number(r.custo_usd||0), 0);
    }catch(e){ console.warn('resumo de avatares:', e.message); }
  }
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
      ${[['escudos','Escudos'],['uniformes','Uniformes'],['fotos','Fotos de jogadores'],['treinadores','Treinadores']]
        .map(([id,l])=>`<span class="${aba===id?'on':''}" data-est-aba="${id}" style="padding:9px 16px">${l}</span>`).join('')}
    </div>
    ${aba==='treinadores' ? blocoTreinadoresHTML() : `
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
        ${aba==='uniformes' && podeEditar('dados') ? `<button class="btn btn-sm" id="est-estilos" title="Gera os moldes que faltam (uniforme + miniatura) dos 5 estilos, para reuso em todos os clubes">Preparar estilos</button>
        <button class="btn btn-sm btn-ghost" id="est-repintar" title="Repinta todos os uniformes de molde com os moldes atuais">Repintar todos</button>` : ''}
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
    </div>`}`;

  el('est-pack').onchange = () => { ST.packId = el('est-pack').value; pgEstudio(); };
  document.querySelectorAll('[data-est-aba]').forEach(x => x.onclick = () => { ST.abaEstudio=x.dataset.estAba; pgEstudio(); });
  /* O FILTRO E A BUSCA SO' EXISTEM NAS ABAS DE CLUBE. Sem estes guards a aba
     Treinadores achava null aqui, o TypeError estourava e MATAVA o resto do
     wiring — seletor de patch, botoes de aba, tudo — deixando o Estudio
     travado numa tela sem saida. E' o mesmo `if(bt...)` dos botoes abaixo. */
  const selPais = el('est-pais');
  if(selPais) selPais.onchange = () => { ST.paisEstudio = selPais.value; pgEstudio(); };
  const btLote = el('est-lote');
  if(btLote) btLote.onclick = modalLoteEscudos;
  const btRep = el('est-repintar');
  if(btRep) btRep.onclick = () => repintarTodosUniformes(btRep);
  const btEst = el('est-estilos');
  if(btEst) btEst.onclick = () => prepararEstilos(btEst);
  const btFaces = el('est-faces');
  if(btFaces) btFaces.onclick = () => prepararFacesTreinador(btFaces);
  document.querySelectorAll('[data-face-refazer]').forEach(x => x.onclick = () => {
    const [g, i] = x.dataset.faceRefazer.split(':');
    refazerFaceTreinador(g, Number(i));
  });
  document.querySelectorAll('[data-face-ver]').forEach(x => x.onclick = () =>
    abrirLightbox(x.dataset.faceVer, 'Face de treinador'));
  document.querySelectorAll('[data-face-pos]').forEach(x => x.onclick = (ev) => {
    ev.stopPropagation();   // senao o clique sobe para o retrato e abre o lightbox
    const [g, i] = x.dataset.facePos.split(':');
    modalAjusteTreinador(g, Number(i));
  });
  document.querySelectorAll('[data-marca-up]').forEach(x => x.onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.png,.webp,.jpg,.jpeg,.svg';
    inp.onchange = () => trEnviarLogo(x.dataset.marcaUp, inp.files[0]);
    inp.click();
  });
  const b = el('est-busca'); let t=null;
  if(b) b.oninput = () => { clearTimeout(t); t=setTimeout(()=>{ ST.buscaEstudio=b.value.trim(); pgEstudio(); },300); };
  document.querySelectorAll('[data-est-clube]').forEach(r => r.onclick = () => {
    const item = (D.catalogo||[]).find(x => String(x.c.id)===String(r.dataset.estClube));
    if(!item) return;
    const abaAtual = ST.abaEstudio||'escudos';
    if(abaAtual==='escudos') modalEscudoIA(item);
    else if(abaAtual==='uniformes') modalUniformeIA(item);
    /* explicito de proposito: com um `else` aberto, QUALQUER aba futura que
       liste clubes abriria o modal de fotos por descuido. */
    else if(abaAtual==='fotos') modalFotosIA(item);
  });
}

/* ---------- modal: gerar escudo ---------- */
/* padroniza o escudo: WebP 512×512 com transparência preservada, desenho
   centralizado e contido — todo escudo salvo tem o mesmo formato e peso baixo */
async function padronizarEscudo(arquivo){
  const url = URL.createObjectURL(arquivo);
  try{
    const img = await new Promise((ok, erro) => {
      const i = new Image(); i.onload = () => ok(i);
      i.onerror = () => erro(new Error('Não consegui ler a imagem.')); i.src = url;
    });
    /* AUTO-AJUSTE: recorta a imagem pela caixa do que é visível (alfa) e
       encaixa no quadro 512×512 com margem fixa — todo escudo salvo preenche o
       MESMO espaço, não importa quanta folga o arquivo original tinha. */
    const W = img.naturalWidth, H = img.naturalHeight;
    const cvSrc = document.createElement('canvas'); cvSrc.width = W; cvSrc.height = H;
    const cxSrc = cvSrc.getContext('2d'); cxSrc.drawImage(img, 0, 0);
    const d = cxSrc.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for(let y=0; y<H; y++) for(let x=0; x<W; x++){
      if(d[(y*W+x)*4+3] >= 8){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    }
    if(x1 < 0){ x0=0; y0=0; x1=W-1; y1=H-1; }   // imagem 100% transparente: mantém como veio
    const bw = x1-x0+1, bh = y1-y0+1;
    const LADO = 512, MARGEM = 14;
    const cv = document.createElement('canvas'); cv.width = LADO; cv.height = LADO;
    const cx = cv.getContext('2d');
    const esc = Math.min((LADO-2*MARGEM)/bw, (LADO-2*MARGEM)/bh);
    const w = bw*esc, hh = bh*esc;
    cx.drawImage(cvSrc, x0, y0, bw, bh, (LADO-w)/2, (LADO-hh)/2, w, hh);
    const blob = await new Promise(ok => cv.toBlob(ok, 'image/webp', 0.9));
    if(!blob) throw new Error('Falha ao converter.');
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

function modalEscudoIA(item, onSalvo){
  const c = item.c, editar = podeEditar('dados');
  const e = D.edits[c.id];
  const atual = (e && e.patch && e.patch.crest) || c.crest;
  abrirModal(`
    <h3>Escudo — ${h(c.short||c.name)}</h3>
    <div class="duas-col">
      <div class="col" style="gap:12px">
        <div class="st" style="line-height:1.7">Envie o arquivo do escudo (PNG, WEBP, JPG ou SVG, até 5 MB).
          O painel converte para <b>WebP 512×512</b> com transparência, e o "Remover fundo" limpa
          fundo sólido se precisar. <b>Salvar no clube</b> grava no patch em edição — o jogo passa a
          mostrar este escudo no lugar do real. Para vários clubes de uma vez, use o
          <b>Enviar em lote</b> na aba Escudos.</div>
        ${editar?`
          <button class="btn" id="ia-upload" style="align-self:flex-start">Enviar arquivo…</button>
          <input type="file" id="ia-arquivo" accept=".png,.webp,.jpg,.jpeg,.svg" style="display:none">
          <button class="btn btn-sm btn-ghost" id="ia-rmfundo" style="align-self:flex-start" ${atual?'':'disabled'}>Remover fundo da imagem</button>`:''}
      </div>
      <div class="col" style="gap:10px;align-items:center;justify-content:center">
        <div id="ia-preview" title="Clique para ver em tela expandida"
             style="width:230px;height:230px;display:flex;align-items:center;justify-content:center;cursor:zoom-in;
             border:1px dashed var(--bd2);border-radius:12px;background:repeating-conic-gradient(#0002 0 25%,transparent 0 50%) 0 0/18px 18px">
          ${atual?`<img src="${h(atual)}" style="width:100%;height:100%;object-fit:contain">`
                 :'<span style="font-size:12px;color:var(--dim3)">sem escudo ainda</span>'}
        </div>
        <small style="font-size:11px;color:var(--dim3)">quadro real de 512×512 — como fica salvo e no jogo</small>
        <div id="ia-estado" style="font-size:12px;color:var(--dim2);min-height:16px"></div>
      </div>
    </div>
    <div class="acoes">
      ${editar?`<button class="btn" id="ia-salvar" disabled>Salvar no clube</button>`:''}
      <button class="btn btn-ghost" data-fechar>Fechar</button>
    </div>`, 'lg');

  el('ia-preview').onclick = () => {
    const img = el('ia-preview').querySelector('img');
    if(img) abrirLightbox(img.src, c.short||c.name);
  };

  if(!editar) return;

  let gerada = null;
  const mostrarNoPreview = (url, aviso) => {
    gerada = url;
    el('ia-preview').innerHTML = `<img src="${h(url)}" style="width:100%;height:100%;object-fit:contain">`;
    el('ia-estado').textContent = aviso;
    el('ia-salvar').disabled = false;
    el('ia-rmfundo').disabled = false;
  };

  el('ia-upload').onclick = () => el('ia-arquivo').click();
  el('ia-arquivo').onchange = async () => {
    const f = el('ia-arquivo').files[0]; if(!f) return;
    if(f.size > 5*1024*1024) return toast('Arquivo acima de 5 MB.', true);
    try{
      const padrao = await padronizarEscudo(f);
      const caminho = `${caminhoClube(item)}/escudo-upload-${Date.now()}.webp`;
      const up = await sb.storage.from('escudos').upload(caminho, padrao, { upsert:false, cacheControl:'31536000' });
      if(up.error) return toast(erroMsg(up.error), true);
      mostrarNoPreview(sb.storage.from('escudos').getPublicUrl(caminho).data.publicUrl,
        'Convertido para WebP 512×512 — confira o fundo; "Remover fundo" limpa se precisar.');
    }catch(err){ toast(err.message||'Falha ao processar a imagem.', true); }
  };

  el('ia-rmfundo').onclick = async () => {
    const alvo = gerada || atual;
    if(!alvo) return toast('Envie um escudo primeiro.', true);
    const bt = el('ia-rmfundo'); bt.disabled = true; bt.textContent = 'Removendo fundo…';
    try{
      const r = await fetch(alvo);
      if(!r.ok) throw new Error('não consegui baixar a imagem ('+r.status+')');
      const limpo = await removerFundoDeImagem(await r.blob());
      if(!limpo) throw new Error('falha ao processar');
      const padrao = await padronizarEscudo(limpo);
      const caminho = `${caminhoClube(item)}/escudo-semfundo-${Date.now()}.webp`;
      const up = await sb.storage.from('escudos').upload(caminho, padrao, { upsert:false, cacheControl:'31536000' });
      if(up.error) throw new Error(up.error.message);
      mostrarNoPreview(sb.storage.from('escudos').getPublicUrl(caminho).data.publicUrl,
        'Fundo removido — salve para valer.');
    }catch(err){ toast('Não deu para remover o fundo ('+err.message+').', true); }
    bt.disabled = false; bt.textContent = 'Remover fundo da imagem';
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
    D.edits[c.id] = linha;
    await jogo('data_packs').update({ atualizado_em:new Date().toISOString() }).eq('id', ST.packId);
    registrar('estudio.escudo', String(c.id), { pacote: ST.packId });
    fecharModal(); toast('Escudo salvo no patch.');
    if(onSalvo) onSalvo(); else pgEstudio();
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
  /* `f` opcional: a linha da foto do jogador. Se ela tiver ajuste próprio
     (atributos.pos), ele ganha do padrão do clube — só nas camadas, as URLs
     continuam sendo as do clube. */
  const camadasClube = (f) => {
    const t0 = torso(), at0 = (t0 && t0.atributos) || {};
    const ex = (f && f.atributos && f.atributos.pos) || {};
    return { patroUrl: at0.patroUrl || ST.patroTeste, escudoUrl: escudoClube(), fabUrl: at0.fabricanteUrl,
             patro: ex.patro || at0.patro, escudo: ex.escudo || at0.escudo,
             fabricante: ex.fabricante || at0.fabricante };
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
      return compostoHTML(f.atributos.montagem, null, px, 8, camadasClube(f), true);
    if(f && f.atributos && f.atributos.recorte==='rosto')
      return t ? compostoHTML(t.url, f.url, px, 8, camadasClube())
               : `<span style="display:inline-block;width:${px}px;height:${px}px;border-radius:8px;background:#d9d9d9;overflow:hidden"><img src="${h(f.url)}" style="width:100%;height:100%;object-fit:contain"></span>`;
    return `<img src="${h(f.url)}" style="width:${px}px;height:${px}px;border-radius:8px;object-fit:cover">`;
  };

  /* linha enxuta: foto, nome e botões. Os botões são ÍCONE + rótulo: no telemóvel
     o CSS esconde o rótulo e sobra um quadrado de 38px — assim os dois botões
     cabem lado a lado em qualquer largura, e todas as linhas ficam da mesma
     altura (com o texto, o segundo botão caía para baixo em telas estreitas). */
  const botao = (attr, ic, lb, extra) =>
    `<button class="btn btn-sm btn-ico ${attr==='data-escudo'?'btn-ghost':''}" ${attr} ${extra||''}
       title="${h(lb)}" aria-label="${h(lb)}"><span class="ic">${ic}</span><span class="lb">${h(lb)}</span></button>`;
  /* o rótulo agora vive num <span>: trocar textContent do botão apagaria o ícone */
  const rotulo = (bt, txt, ic) => {
    const l = bt.querySelector('.lb'), i = bt.querySelector('.ic');
    if(l){ l.textContent = txt; bt.title = txt; bt.setAttribute('aria-label', txt); } else bt.textContent = txt;
    if(i && ic) i.textContent = ic;
  };
  const rotuloDe = (bt) => { const l = bt.querySelector('.lb'); return l ? l.textContent : bt.textContent; };

  const linhaFoto = (p) => {
    const f = D.fotos[c.id+'|'+p.n];
    const temMontagem = !!(f && f.atributos && f.atributos.montagem);
    return `<div class="row ft-row" data-foto-jog="${h(p.n)}">
      <span data-thumb ${f?'style="cursor:zoom-in" title="Ver em tela expandida"':''}>${f
        ? thumbHTML(f, 40)
        : `<i class="av" style="width:40px;height:40px;border-radius:8px;background:${h(c.color||'#333')};color:#fff;font-size:12px">${h(iniciais(p.n))}</i>`}</span>
      <span style="min-width:0"><b style="display:block;font-size:13px;font-weight:600">${h(p.n)}</b>
        <small style="font-size:11px;color:var(--dim3)">${h(p.p||'—')} · ${p.age!=null?p.age+' anos':'idade —'} · força ${p.f!=null?p.f:'—'}</small></span>
      <span class="ft-acoes">
        ${f&&f.atributos&&f.atributos.revisar?`<span class="tag t-bad" title="${h(String(f.atributos.revisar))}">revisar</span>`:''}
        ${botao('data-escudo','⛶','Posicionar', temMontagem?'':'disabled')}
        ${editar? botao('data-comparar','⌗','Encaixe') :''}
        ${editar? botao('data-gerar', '✦', 'Gerar') :''}
      </span>
    </div>`;
  };

  abrirModal(`
    <h3>Fotos por IA — ${h(c.short||c.name)}</h3>
    <details class="ajuda"><summary>Como funciona e quanto custa</summary>
    <div class="st" style="line-height:1.6;margin:8px 0 0">
      A foto é em DUAS camadas: o <b>rosto</b> (recortado, um por jogador) sobre a
      <b>camisa do clube</b> (base única para o elenco inteiro). Trocou de clube?
      O visual do rosto (pele, cabelo, barba, sorriso, brinco, tatuagem) é sorteado automaticamente
      por jogador. Com o uniforme pronto, a IA <b>costura</b> rosto e uniforme numa foto natural
      (a montagem); o rosto solto fica guardado para remontar barato na troca de clube.
      A idade vem do elenco. ~US$ 0,08 por jogador (rosto + montagem).
      <b>No primeiro jogador do clube, confira o encaixe:</b> escudo e patrocinador podem
      precisar de ajuste de posição — clique em "Posicionar" na linha dele, arraste e salve; a posição
      vale para o elenco inteiro. Dentro do ajuste dá para <b>passar de jogador em jogador</b> com as
      setas, e salvar já leva para o seguinte.</div></details>
    <div class="ft-uni">
      <span data-torso-thumb ${torso()?'style="cursor:zoom-in" title="Ver em tela expandida"':''}>${torso()
        ? compostoHTML(torso().url, null, 44, 8, camadasClube())
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
      abrirLightboxHTML(compostoHTML(f.atributos.montagem, null, lado, 16, camadasClube(f), true));
    else if(f.atributos && f.atributos.recorte==='rosto' && t)
      abrirLightboxHTML(compostoHTML(t.url, f.url, lado, 16, camadasClube(f)));
    else abrirLightbox(f.url, alt);
  };
  el('ft-lista').addEventListener('click', ev => {
    if(!ev.target.closest('[data-thumb]')) return;
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
    /* ===== UMA CHAMADA POR FOTO =====
       Antes eram duas: o rosto recortado e a costura dele sobre o uniforme
       (US$ 0,114). Agora o rosto nasce JA' NA CAMISA — manda-se o torso do
       clube como entrada e o rosto vai descrito no texto. US$ 0,070, -39%.

       A escolha nao foi por aritmetica: o comparador (botao ⚖) gerou o mesmo
       jogador pelos dois caminhos, com os mesmos atributos, e o de uma chamada
       segurou a listra VERTICAL do Palmeiras — que era o caso mais dificil,
       onde ele tinha mais chance de escorregar.

       Sem uniforme no clube nao ha' o que editar: cai no retrato completo por
       texto (tipo 'jogador', US$ 0,044), que tambem e' uma chamada so'. */
    const t = torso();
    const base = caminhoClube(item)+'/jogadores/'+(chaveNome(p.n)||'jogador');
    const at = Object.assign({}, sorteios[p.n], { recorte: t ? 'direto' : 'retrato' });
    let url = null;
    try{
      url = t
        ? await gerarImagemIA('montagem', promptDireto(item, p, at), 'medium', [t.url], base+'-foto')
        : await gerarImagemIA('jogador', promptRosto(item, p, at), 'medium', null, base+'-foto');
    }catch(err){ throw new Error(err.message); }

    /* a conferencia continua, mas so' AVISA: nao refaz nada. Sobraram as duas
       regras que denunciam imagem inutilizavel (quadro vazio, cabeca solta). */
    at.montagem = url;
    if(t){
      const v = await validarMontagem(url);
      if(v.ok) at.medidas = v.medidas || null;
      else { at.revisar = v.motivo; console.warn('foto marcada para revisão ('+p.n+'):', v.motivo); }
    }
    /* NADA DO QUE FOI PAGO SE PERDE. O upsert sobrescreve o ponteiro da linha:
       o .webp anterior continua no Storage, mas ficaria orfao — sem URL em
       lugar nenhum, invisivel no painel. Guardando a lista, gerar de novo
       deixa de ser um caminho sem volta, e da' para recuperar a versao antiga
       se a nova sair pior. Guarda so' a URL (texto), nao a imagem. */
    const antes = D.fotos[c.id+'|'+p.n];
    const anteriores = ((antes && antes.atributos && antes.atributos.anteriores) || []).slice(-9);
    if(antes && antes.atributos && antes.atributos.montagem) anteriores.push(antes.atributos.montagem);
    else if(antes && antes.url) anteriores.push(antes.url);
    if(anteriores.length) at.anteriores = anteriores;

    const reg = { pack_id: ST.packId, club_id: String(c.id), jogador: p.n, url, atributos: at };
    const { error } = await jogo('player_photos').upsert(reg, { onConflict:'pack_id,club_id,jogador' });
    if(error) throw new Error(erroMsg(error));
    D.fotos[c.id+'|'+p.n] = reg;
    if(linha){
      const th = linha.querySelector('[data-thumb]');
      th.innerHTML = thumbHTML(reg, 40);
      th.style.cursor = 'zoom-in'; th.title = 'Ver em tela expandida';
      const bt = linha.querySelector('[data-gerar]'); if(bt) rotulo(bt, 'Gerar', '✦');
      const be = linha.querySelector('[data-escudo]'); if(be) be.disabled = !at.montagem;
    }
  }

  el('ft-lista').addEventListener('click', async ev => {
    const linha = ev.target.closest('[data-foto-jog]'); if(!linha) return;
    const p = sq.find(x => x.n === linha.dataset.fotoJog); if(!p) return;
    if(ev.target.closest('[data-escudo]')){
      const f = D.fotos[c.id+'|'+p.n];
      if(f && f.atributos && f.atributos.montagem)
        modalAjustePatrocinio(item, () => modalFotosIA(item), f.atributos.montagem, true, p.n);
      return;
    }
    if(ev.target.closest('[data-comparar]')){ compararMetodos(item, p); return; }
    const bt = ev.target.closest('[data-gerar]'); if(!bt) return;
    const antes = rotuloDe(bt);
    bt.disabled = true; rotulo(bt, 'Gerando…', '·');
    try{ await gerarPara(p, linha); registrar('estudio.foto', c.id+'|'+p.n, { pacote: ST.packId }); toast('Foto salva.'); }
    catch(err){ rotulo(bt, antes, '✦'); toast(err.message||'Falha ao gerar.', true); }
    bt.disabled = false; if(rotuloDe(bt)==='Gerando…') rotulo(bt, 'Gerar', '✦');
  });

  const btTodos = el('ft-todos');
  if(btTodos) btTodos.onclick = async () => {
    const fila = faltantes();
    if(!fila.length) return toast('Todo o elenco já tem foto.');
    /* valores MEDIDOS na fatura (rosto US$ 0,044 + montagem US$ 0,070), nao a
       tabela antiga por imagem, que subestimava a montagem em 11%. */
    const custo = (fila.length*(torso()?0.114:0.044)).toFixed(2);
    if(!await rfConfirm({ titulo:'Gerar as fotos que faltam',
      texto:`Vou gerar <b>${fila.length} foto(s)</b> de jogador — rosto sorteado e costura com o uniforme do clube.`,
      detalhe:`Cada montagem é <b>conferida por pixel</b> (cabeça presa à camisa). Saindo torta,
               ela <b>não é refeita sozinha</b>: fica marcada para revisão e você decide.
               Custo: <b>~US$ ${custo}</b> — este é o teto, não sobe.
               No fim eu listo o que ficou marcado.`,
      nao:'Agora não', sim:`Gerar ${fila.length} fotos` })) return;
    btTodos.disabled = true;
    let ok = 0, erroN = 0; const revisar = [];
    for(const p of fila){
      el('ft-progresso').textContent = `Gerando ${ok+erroN+1}/${fila.length} — ${p.n}…`;
      const linha = el('ft-lista').querySelector(`[data-foto-jog="${CSS.escape(p.n)}"]`);
      try{
        await gerarPara(p, linha); ok++;
        const f = D.fotos[c.id+'|'+p.n];
        if(f && f.atributos && f.atributos.revisar) revisar.push(p.n);
      }
      catch(err){ erroN++; console.warn('foto falhou:', p.n, err.message); }
      /* respiro entre jogadores: um lote grande sem pausa esbarra no limite de
         chamadas da OpenAI, e chamada recusada custa tempo do mesmo jeito */
      await new Promise(r=>setTimeout(r, 1200));
    }
    registrar('estudio.foto.lote', String(c.id), { pacote: ST.packId, geradas: ok, falhas: erroN, revisar: revisar.length });
    el('ft-progresso').textContent = `Pronto: ${ok} geradas${erroN?`, ${erroN} falharam`:''}`
      + (revisar.length ? ` · ${revisar.length} para revisar` : ' · todas aprovadas') + '.';
    if(revisar.length) toast(`${revisar.length} foto(s) pedem revisão: ${revisar.slice(0,3).join(', ')}${revisar.length>3?'…':''}`, true);
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
    <div class="row" style="grid-template-columns:34px minmax(0,1fr) 110px 86px minmax(0,1fr) 140px;gap:8px;align-items:center" data-linha="${i}">
      <img src="${h(p.urlPrevia)}" style="width:28px;height:28px;object-fit:contain">
      <span class="mono" style="font-size:11.5px;min-width:0;overflow:hidden;text-overflow:ellipsis" title="${h(p.f.name)}">${h(p.f.name)}</span>
      ${selHTML(i, p)}
      <span style="text-align:right;display:flex;gap:6px;justify-content:flex-end">${p.salvo
        ? '<span class="tag t-ok">salvo ✓</span>'
        : p.erro ? `<span class="tag t-bad" title="${h(p.erro)}">erro</span>`
        : `<button class="btn btn-sm btn-ghost" data-semfundo="${i}" title="Remover o fundo — a miniatura mostra o resultado">◌</button>
           <button class="btn btn-sm" data-conf="${i}" ${p.clube?'':'disabled'}>Confirmar</button>`}</span>
    </div>`;

  function desenhar(){
    const pend = plano.filter(p=>!p.salvo && p.clube).length;
    el('lt-lista').innerHTML = plano.length ? `
      <div class="rowh" style="grid-template-columns:34px minmax(0,1fr) 110px 86px minmax(0,1fr) 140px;gap:8px">
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
    el('lt-lista').querySelectorAll('[data-semfundo]').forEach(bt => bt.onclick = async () => {
      const p2 = plano[+bt.dataset.semfundo]; if(!p2 || p2.salvo) return;
      bt.disabled = true;
      try{
        const limpo = await removerFundoDeImagem(p2.f);
        if(limpo){ p2.f = limpo; p2.extForcada = 'png';
          URL.revokeObjectURL(p2.urlPrevia); p2.urlPrevia = URL.createObjectURL(limpo); }
      }catch(err){ toast('Falha ao remover o fundo: '+err.message, true); }
      desenhar();
    });
  }

  async function confirmarLinha(i){
    const p = plano[i];
    if(!p || p.salvo || !p.clube) return;
    const item = (D.catalogo||[]).find(x => String(x.c.id)===String(p.clube));
    if(!item) return;
    try{
      const arq = await padronizarEscudo(p.f);   // WebP 512×512, transparência preservada
      const caminho = `${caminhoClube(item)}/escudo-lote-${Date.now()}.webp`;
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
/* Ajuste de camadas. Sem `jogador`, mexe no padrão do CLUBE (vale para todo o
   elenco). Com `jogador`, o ajuste vira EXCEÇÃO daquela foto: a montagem por IA
   nunca sai com o enquadramento no mesmo pixel, então cada camisa pode pedir
   um encaixe seu. A exceção não apaga o padrão do clube — só ganha dele. */
function modalAjustePatrocinio(item, onSalvo, baseUrl, ehFoto, jogador){
  const c = item.c;
  const t = D.fotos[c.id+'|'+TORSO_KEY];
  /* sem uniforme salvo, as posições vivem PENDENTES no wizard (D.wiz.posPend)
     e são gravadas junto quando o uniforme for gerado/salvo */
  const pend = (!t && D.wiz && D.wiz.clube===c.id) ? D.wiz : null;
  if(!t && !pend) return toast('Abra o uniforme do clube primeiro.', true);
  if(!t && !baseUrl) return toast('Escolha estilo e cores primeiro — a prévia é o palco do ajuste.', true);

  /* O AJUSTE É SOBRE A FOTO FINAL: o fundo é a foto do jogador clicado (baseUrl)
     ou, sem ela, a primeira montagem do elenco — é aí que escudo e logo precisam
     encaixar. Sem montagem nenhuma, o fundo é o uniforme cru. As posições salvas
     valem para o clube todo. */
  /* baseMontagem = o fundo é FOTO DE JOGADOR (só aí o mapa torso→foto entra;
     sobre o uniforme, o que se vê é o que se salva, sem conversão nenhuma) */
  let base = baseUrl || (t && t.url), baseMontagem = !!ehFoto;
  if(!baseUrl) for(const p of (c.squad||[])){
    const f = D.fotos[c.id+'|'+p.n];
    if(f && f.atributos && f.atributos.montagem){ base = f.atributos.montagem; baseMontagem = true; break; }
  }
  const e = D.edits[c.id];
  const escudoUrl = (e && e.patch && e.patch.crest) || c.crest || null;
  const fJog = jogador ? D.fotos[c.id+'|'+jogador] : null;
  const atClube = t ? (t.atributos || {}) : (pend.posPend || {});
  /* a foto do jogador começa de onde o clube parou e só se afasta se você mexer */
  const at0 = fJog ? Object.assign({}, atClube, fJog.atributos && fJog.atributos.pos || {}) : atClube;
  const fabUrl = ST.fabTeste || at0.fabricanteUrl || null;
  /* as posições SALVAS são do quadro do uniforme; quando o fundo do editor é a
     FOTO do jogador, mostramos/arrastamos no quadro da foto e convertemos de
     volta no salvar — um único conjunto salvo serve aos dois quadros */
  const noQuadroDaFoto = p2 => baseMontagem ? posParaFoto(p2) : p2;
  const doQuadroDaFoto = p2 => baseMontagem ? posDaFoto(p2) : p2;
  const pos = {
    patro:      noQuadroDaFoto(Object.assign({}, PATRO_POS_PADRAO,  at0.patro      || {})),
    escudo:     noQuadroDaFoto(Object.assign({}, ESCUDO_POS_PADRAO, at0.escudo     || {})),
    fabricante: noQuadroDaFoto(Object.assign({}, FAB_POS_PADRAO,    at0.fabricante || {}))
  };

  /* o palco encolhe no telemóvel para caber ele + o painel de controles na
     mesma tela: antes o palco tomava 72% da altura e os botões ficavam abaixo
     da dobra, num overlay que não rolava */
  const estreito = innerWidth <= 640;
  const lado = Math.max(160, Math.floor(Math.min(420, innerWidth - (estreito?34:60),
    (innerHeight * (estreito?0.46:0.58)) / RATIO_FOTO)));
  const ladoAlt = Math.round(lado*RATIO_FOTO);

  /* NAVEGAÇÃO ENTRE JOGADORES — a mesma ordem da lista do modal de fotos (força
     decrescente, de cima para baixo). Só entram os que já têm montagem: sem foto
     costurada não há camisa onde encaixar as camadas. */
  const ordem = (c.squad||[]).slice().sort((a,b)=>(b.f||0)-(a.f||0)).map(p=>p.n)
    .filter(n => { const f = D.fotos[c.id+'|'+n]; return !!(f && f.atributos && f.atributos.montagem); });
  const iAtual = jogador ? ordem.indexOf(jogador) : -1;

  const sliderHTML = (chave, cor, rot, min, max) =>
    `<label class="aj-sl"><span style="color:${cor}">${rot}</span>
      <input data-w="${chave}" type="range" min="${min}" max="${max}" step="0.5" value="${pos[chave].w}"></label>`;

  const ov = document.createElement('div');
  ov.className = 'aj-ov';
  ov.innerHTML = `
    <div class="aj-topo">
      ${iAtual>=0 ? `<button class="aj-nav" id="aj-ant" ${iAtual<=0?'disabled':''}
          title="Jogador anterior" aria-label="Jogador anterior">‹</button>` : ''}
      <span class="aj-quem">
        <b>${h(iAtual>=0 ? jogador : 'Posição das camadas')}</b>
        <small>${iAtual>=0 ? `${iAtual+1} de ${ordem.length} · ${h(c.short||c.name)}`
                           : `${h(c.short||c.name)} · vale para o elenco todo`}</small>
      </span>
      ${iAtual>=0 ? `<button class="aj-nav" id="aj-prox" ${iAtual>=ordem.length-1?'disabled':''}
          title="Próximo jogador" aria-label="Próximo jogador">›</button>` : ''}
      <button class="aj-nav" id="aj-x" title="Fechar" aria-label="Fechar">✕</button>
    </div>
    <div class="aj-palco" style="width:${lado}px;height:${ladoAlt}px">
      <img src="${h(base)}" draggable="false" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none">
      ${escudoUrl?`<img data-alvo="escudo" src="${h(escudoUrl)}" draggable="false"
        style="position:absolute;left:${pos.escudo.x}%;top:${pos.escudo.y}%;width:${pos.escudo.w}%;cursor:grab;outline:2px dashed #e3b23c;outline-offset:3px">`:''}
      ${fabUrl?`<img data-alvo="fabricante" src="${h(fabUrl)}" draggable="false"
        style="position:absolute;left:${pos.fabricante.x}%;top:${pos.fabricante.y}%;width:${pos.fabricante.w}%;cursor:grab;outline:2px dashed #7dd3fc;outline-offset:3px">`:''}
      ${ST.patroTeste?`<img data-alvo="patro" src="${h(ST.patroTeste)}" draggable="false"
        style="position:absolute;left:${pos.patro.x}%;top:${pos.patro.y}%;width:${pos.patro.w}%;cursor:grab;outline:2px dashed #35c46a;outline-offset:3px">`:''}
    </div>
    <div class="aj-ctrl">
      ${escudoUrl? sliderHTML('escudo','#e3b23c','Escudo',5,40) : ''}
      ${fabUrl? sliderHTML('fabricante','#7dd3fc','Fabricante',4,30) : ''}
      ${ST.patroTeste? sliderHTML('patro','#35c46a','Patrocínio',8,60) : ''}
      <div class="aj-bts">
        ${jogador ? `<button class="btn btn-sm" id="aj-salvar" title="${h(jogador)}">Salvar nesta camisa</button>
                     <button class="btn btn-sm btn-ghost" id="aj-salvar-todos">Salvar no elenco todo</button>
                     ${fJog && fJog.atributos && fJog.atributos.pos
                       ? `<button class="btn btn-sm btn-ghost" id="aj-padrao">Voltar ao padrão</button>` : ''}`
                  : `<button class="btn btn-sm" id="aj-salvar">Salvar posições</button>`}
        <button class="btn btn-sm btn-ghost" id="aj-cancelar">Cancelar</button>
      </div>
    </div>
    <small class="aj-dica">
      Arraste o escudo (amarelo), o fabricante (azul) e o patrocinador (verde) até encaixarem.
      ${iAtual>=0 ? 'Salvar já leva para o próximo jogador da lista.'
                  : 'As posições salvas valem para todas as fotos do clube.'}
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
  ov.querySelector('#aj-x').onclick = fechar;

  /* PASSAR DE JOGADOR sem voltar à lista: fecha este palco e abre o do vizinho.
     `refrescar` redesenha a lista atrás — depois de salvar, as miniaturas mudam. */
  const abrirJogador = (i, refrescar) => {
    const n = ordem[i]; if(n == null) return false;
    const f = D.fotos[c.id+'|'+n];
    if(!(f && f.atributos && f.atributos.montagem)) return false;
    fechar();
    if(refrescar && onSalvo) onSalvo();
    modalAjustePatrocinio(item, onSalvo, f.atributos.montagem, true, n);
    return true;
  };
  const btAnt = ov.querySelector('#aj-ant');
  if(btAnt) btAnt.onclick = () => abrirJogador(iAtual-1);
  const btProx = ov.querySelector('#aj-prox');
  if(btProx) btProx.onclick = () => abrirJogador(iAtual+1);

  /* SALVOU, SEGUE: conferir o elenco camisa a camisa é o trabalho real aqui —
     voltar à lista a cada uma custava dois cliques por jogador. No último (ou
     quando o ajuste é do clube), encerra e devolve a lista atualizada. */
  const concluir = () => {
    if(iAtual < 0 || !abrirJogador(iAtual+1, true)){ fechar(); if(onSalvo) onSalvo(); }
  };

  const medir = () => {
    const lim = o => { const v = doQuadroDaFoto(o); return { x:+v.x.toFixed(2), y:+v.y.toFixed(2), w:+v.w.toFixed(2) }; };
    return { patro: lim(pos.patro), escudo: lim(pos.escudo), fabricante: lim(pos.fabricante) };
  };

  /* exceção da foto: grava em atributos.pos da linha do jogador */
  const btSoEle = ov.querySelector('#aj-salvar-todos') ? ov.querySelector('#aj-salvar') : null;
  if(btSoEle) btSoEle.onclick = async () => {
    if(!fJog) return toast('Gere a foto deste jogador primeiro.', true);
    const at = Object.assign({}, fJog.atributos, { pos: medir() });
    const { error } = await jogo('player_photos').update({ atributos: at })
      .eq('pack_id', ST.packId).eq('club_id', String(c.id)).eq('jogador', jogador);
    if(error) return toast(erroMsg(error), true);
    fJog.atributos = at;
    registrar('estudio.camadas.pos.jogador', c.id+'|'+jogador, at.pos);
    toast(`Posições salvas nesta camisa apenas (${jogador}).`);
    concluir();
  };

  const btPadrao = ov.querySelector('#aj-padrao');
  if(btPadrao) btPadrao.onclick = async () => {
    const at = Object.assign({}, fJog.atributos); delete at.pos;
    const { error } = await jogo('player_photos').update({ atributos: at })
      .eq('pack_id', ST.packId).eq('club_id', String(c.id)).eq('jogador', jogador);
    if(error) return toast(erroMsg(error), true);
    fJog.atributos = at;
    toast(`${jogador} volta a seguir o padrão do clube.`);
    fechar(); if(onSalvo) onSalvo();
  };

  const btTodos2 = ov.querySelector('#aj-salvar-todos') || ov.querySelector('#aj-salvar');
  btTodos2.onclick = async () => {
    const novas = medir();
    if(!t){
      pend.posPend = novas;
      toast('Posições guardadas — serão salvas junto com o uniforme.');
      concluir();
      return;
    }
    const at = Object.assign({}, t.atributos, novas);
    const { error } = await jogo('player_photos').update({ atributos: at })
      .eq('pack_id', ST.packId).eq('club_id', String(c.id)).eq('jogador', TORSO_KEY);
    if(error) return toast(erroMsg(error), true);
    t.atributos = at;
    registrar('estudio.camadas.pos', String(c.id), at);
    toast('Posições salvas — valem para todo o elenco'
      + (jogador ? ' (a exceção desta foto continua valendo; apague-a no botão do lado)' : '') + '.');
    concluir();
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
      patroUrl: at.patroUrl || ST.patroTeste || '',
      patroNome: at.patroNome || '',
      fabUrl: at.fabricanteUrl || '',
      pv: null, pvChave: '' };
  }
  const wiz = D.wiz;
  const abrir = () => modalUniformeIA(item);
  const escudoEscolhido = () => escudoAtual();

  const PASSOS = [
    ['Estilo','o desenho da camisa'],
    ['Cores','principal e secundária'],
    ['Miniatura','só a camisa, para o campo'],
    ['Escudo','suba um novo ou mantenha'],
    ['Patrocinador','logo sobre a camisa'],
    ['Fabricante','logo pequena, lado oposto ao escudo'],
    ['Salvar','rascunho ou aplicar no jogo']];
  const camadasWiz = () => { const pp = wiz.posPend || {};
    return { patroUrl: wiz.patroUrl, escudoUrl: escudoEscolhido(), fabUrl: wiz.fabUrl,
      patro: pp.patro || at.patro, escudo: pp.escudo || at.escudo, fabricante: pp.fabricante || at.fabricante }; };
  /* o preview é do ESTILO selecionado: prévia pintada dele ou o uniforme salvo
     se (e só se) for do mesmo estilo — estilo sem molde mostra o placeholder */
  const basePreview = () => wiz.pv || ((t() && (t().atributos||{}).estilo === wiz.estilo) ? t().url : null);
  const resumo = n =>
    n===1 ? h((ESTILOS_CAMISA.find(e=>e[0]===wiz.estilo)||[])[1]||'') :
    n===2 ? `<i style="display:inline-block;width:13px;height:13px;border-radius:4px;background:${h(wiz.corA)};vertical-align:-2px"></i>
             <i style="display:inline-block;width:13px;height:13px;border-radius:4px;background:${h(wiz.corB)};border:1px solid var(--bd2);vertical-align:-2px"></i>` :
    n===3 ? (D.fotos[MOLDE_KEY+'|mini-'+wiz.estilo] ? 'pronta — pinta ao salvar' : 'molde ainda não gerado') :
    n===4 ? (escudoAtual() ? 'usa o escudo atual do clube' : 'sem escudo') :
    n===5 ? (wiz.patroUrl ? 'logo definido' : 'sem patrocinador') :
    n===6 ? (wiz.fabUrl ? 'logo definido' : 'sem fabricante') : '';

  const corpoPasso = n => {
    if(n===1) return `<div class="col" style="gap:6px">
      ${ESTILOS_CAMISA.map(e=>`<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid ${wiz.estilo===e[0]?'var(--verde2)':'var(--bd2)'};border-radius:10px;cursor:pointer;font-size:13px">
        <input type="radio" name="wz-estilo" value="${e[0]}" ${wiz.estilo===e[0]?'checked':''}> <span style="flex:1">${h(e[1])}</span>
        ${D.fotos[MOLDE_KEY+'|'+e[0]]?'<span class="tag t-ok" style="font-size:10px">pronto</span>':'<span style="font-size:10.5px;color:var(--dim3)">gera na 1ª vez</span>'}</label>`).join('')}
      ${editar && (!D.fotos[MOLDE_KEY+'|'+wiz.estilo] || !D.fotos[MOLDE_KEY+'|mini-'+wiz.estilo]) ? `
        <button class="btn btn-sm btn-ghost" id="wz-molde-gerar" style="align-self:flex-start;margin-top:4px">Gerar molde deste estilo (~US$ 0,08 — uniforme + miniatura, 1x por estilo)</button>`:''}
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
        ${editar && !mini ? `<small style="font-size:12px;color:var(--dim2)">O molde da miniatura é gerado junto com o do estilo — volte ao passo <b>Estilo</b> e use "Gerar molde deste estilo".</small>`:''}
        ${editar && mini ? `<span class="link" id="wz-mini-refazer" style="font-size:12px;align-self:flex-start">↻ miniatura não bate com o uniforme? Refazer (~US$ 0,04 — extraída do molde do uniforme)</span>`:''}
        <button class="btn btn-sm" data-continuar style="align-self:flex-start">Continuar</button></div>`;
    }
    if(n===4) return `<div class="col" style="gap:10px">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;border:1px dashed var(--bd2);border-radius:10px">
          ${escudoAtual()?`<img src="${h(escudoAtual())}" style="max-width:44px;max-height:44px;object-fit:contain">`:'<small style="color:var(--dim3)">—</small>'}</span>
        <small style="flex:1;font-size:12px;color:var(--dim2)">${escudoAtual()
          ?'O uniforme usa o escudo ATUAL do clube (do patch ou de fábrica). Para trocá-lo, altere na aba Escudos e volte — o wizard pega o novo automaticamente.'
          :'O clube ainda não tem escudo — cadastre um na aba Escudos e volte para continuar.'}</small>
      </div>
      ${editar?`<button class="btn btn-sm btn-ghost" id="wz-esc-alterar" style="align-self:flex-start">${escudoAtual()?'Alterar escudo do clube':'Cadastrar escudo do clube'}</button>`:''}
      <button class="btn btn-sm" data-continuar style="align-self:flex-start">${escudoAtual()?'Manter e continuar':'Continuar sem escudo'}</button></div>`;
    if(n===5) return `<div class="col" style="gap:10px">
      <span style="display:flex;gap:8px">
        <input class="f" id="wz-patro" style="flex:1;min-width:0" placeholder="https://… ou envie um arquivo" value="${h(wiz.patroUrl)}">
        ${editar?`<button class="btn btn-sm btn-ghost" id="wz-patro-up" style="flex:0 0 auto" title="Enviar arquivo do logo">↥</button>
        <input type="file" id="wz-patro-arq" accept=".png,.webp,.jpg,.jpeg,.svg" style="display:none">`:''}
      </span>
      ${editar?`<button class="btn btn-sm btn-ghost" id="wz-patro-rmfundo" style="align-self:flex-start" ${wiz.patroUrl?'':'disabled'}>Remover fundo do logo</button>`:''}
      <label class="f" style="font-size:12.5px">Nome do patrocinador (aparece na aba Patrocínio do jogo)
        <input class="f" id="wz-patro-nome" placeholder="Ex.: Betano" value="${h(wiz.patroNome||'')}"
          oninput="D.wiz.patroNome=this.value"></label>
      <small style="font-size:12px;color:var(--dim2)">O logo fica salvo com o uniforme deste clube e entra como camada — e o jogo mostra este patrocinador como o contrato da CAMISA na aba Patrocínio. Trocar depois não custa nada.</small>
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
      ${!D.fotos[MOLDE_KEY+'|mini-'+wiz.estilo] ? `<div class="erro" style="margin-bottom:4px">
        <b>Sem molde de miniatura neste estilo.</b> O uniforme salva normalmente, mas a
        <b>camisa do campo</b> (Formação) continuará com o desenho padrão — gere o molde no passo
        <b>Estilo</b> e salve de novo para a miniatura entrar.</div>`:''}
      <small style="font-size:12.5px;color:var(--dim2);line-height:1.6">Confira a prévia ao lado. <b>Salvar rascunho</b> guarda o uniforme no Estúdio para continuar depois; <b>Salvar e aplicar no jogo</b> grava o uniforme do elenco.</small>
      ${editar?`<button class="btn btn-sm btn-ghost" id="wz-ajustar" style="align-self:flex-start" ${basePreview()?'':'disabled'}>✥ Ajustar escudo e patrocínio na foto</button>`:''}
      <div id="wz-estado" style="font-size:12px;color:var(--dim2);min-height:16px"></div>
      ${editar?`<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-ghost" id="wz-rascunho">${t()?'Salvar rascunho':'Gerar uniforme'}</button>
        <button class="btn" id="wz-aplicar">${t()?'Salvar e aplicar no jogo':'Gerar e aplicar no jogo'}</button>
        ${t()?`<span class="link" id="wz-remover" style="font-size:12px;color:var(--vermelho)">Remover uniforme do clube</span>`:''}
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
        ${editar?`<button class="btn btn-sm btn-ghost" id="wz-ajustar-topo" ${basePreview()?'':'disabled'}>✥ Ajustar imagens</button>`:''}
        <div id="wz-preview" title="Clique para ver em tela expandida" style="cursor:zoom-in">
          ${basePreview() ? compostoHTML(basePreview(), null, 320, 12, camadasWiz())
            : `<div style="width:320px;height:${Math.round(320*RATIO_FOTO)}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;border:1px dashed var(--bd2);border-radius:12px;background:#d9d9d9">
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
  /* re-renderiza o preview com as camadas ATUAIS (escudo/logo/fabricante) sem
     repintar a base — é o tempo real da troca de camada */
  function atualizarPreview(){
    const alvo = el('wz-preview'); if(!alvo) return;
    const base = basePreview();
    if(base) alvo.innerHTML = compostoHTML(base, null, 320, 12, camadasWiz());
  }
  async function pintarPrevia(){
    const molde = D.fotos[MOLDE_KEY+'|'+wiz.estilo];
    if(!molde){
      if(wiz.pv){ if(wiz.pv.startsWith('blob:')) URL.revokeObjectURL(wiz.pv); wiz.pv=null; wiz.pvChave=''; abrir(); }
      return;
    }
    const chave = molde.url+'|'+wiz.estilo+'|'+wiz.corA+'|'+wiz.corB;
    if(wiz.pvChave === chave && wiz.pv) return;
    try{
      const blob = await pintarMolde(molde.url, wiz.corA, wiz.corB, wiz.estilo);
      if(wiz.pv && wiz.pv.startsWith('blob:')) URL.revokeObjectURL(wiz.pv);
      wiz.pv = URL.createObjectURL(blob); wiz.pvChave = chave;
      atualizarPreview();
      // a prévia chegou: os ajustes ganham palco, mesmo sem uniforme salvo
      const bt1 = el('wz-ajustar-topo'); if(bt1) bt1.disabled = false;
      const bt2 = el('wz-ajustar');      if(bt2) bt2.disabled = false;
    }catch(err){ console.warn('prévia local falhou:', err.message); }
  }
  pintarPrevia();

  const ajTopo = el('wz-ajustar-topo');
  if(ajTopo) ajTopo.onclick = () => { ST.patroTeste = wiz.patroUrl; ST.fabTeste = wiz.fabUrl; modalAjustePatrocinio(item, abrir, basePreview()); };
  el('wz-preview').onclick = () => {
    const base = basePreview(); if(!base) return;
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
    document.querySelectorAll('[name="wz-estilo"]').forEach(r => r.onchange = () => {
      wiz.estilo = r.value;
      if(wiz.pv){ if(wiz.pv.startsWith('blob:')) URL.revokeObjectURL(wiz.pv); wiz.pv=null; wiz.pvChave=''; }
      abrir();          // re-render: sem molde deste estilo, entra o placeholder
      pintarPrevia();   // com molde, repinta e o preview volta na sequência
    });
    const bg1 = el('wz-molde-gerar');
    if(bg1) bg1.onclick = async () => {
      bg1.disabled = true; bg1.textContent = 'Gerando molde do estilo…';
      try{
        if(!D.fotos[MOLDE_KEY+'|'+wiz.estilo]) await garantirMolde(item, wiz.estilo);
        if(!D.fotos[MOLDE_KEY+'|mini-'+wiz.estilo]) await garantirMoldeMini(wiz.estilo, item);
        toast('Molde do estilo pronto (uniforme + miniatura).');
        abrir(); pintarPrevia();
        return;
      }catch(err){ toast(err.message||'Falha ao gerar o molde.', true); }
      bg1.disabled = false; bg1.textContent = 'Gerar molde deste estilo (~US$ 0,08 — uniforme + miniatura, 1x por estilo)';
    };
    const rf = el('wz-refazer-molde');
    if(rf) rf.onclick = async () => {
      if(!await rfConfirm({ titulo:'Refazer o molde deste estilo',
        texto:'O molde atual é descartado e um novo é gerado por IA.',
        detalhe:'Custo: <b>~US$ 0,04</b>. Depois use <b>Repintar todos</b> na aba Uniformes para os clubes que já usam este estilo pegarem o molde novo.',
        nao:'Cancelar', sim:'Refazer molde (~US$ 0,04)' })) return;
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
          const blob = await pintarMolde(mini.url, wiz.corA, wiz.corB, wiz.estilo);
          if(wiz.pvMini && wiz.pvMini.startsWith('blob:')) URL.revokeObjectURL(wiz.pvMini);
          wiz.pvMini = URL.createObjectURL(blob); wiz.pvMiniChave = chave;
        }
        alvo.innerHTML = `<img src="${h(wiz.pvMini)}" style="max-width:78%;max-height:78%;object-fit:contain;display:block">`;
      }catch(err){ alvo.innerHTML = '<small style="font-size:11px;color:var(--vermelho)">falha na pintura</small>'; }
    };
    desenharMini();
    const rfM = el('wz-mini-refazer');
    if(rfM) rfM.onclick = async () => {
      if(!await rfConfirm({ titulo:'Refazer a miniatura deste estilo',
        texto:'A miniatura é extraída do molde do uniforme, mantendo o mesmo padrão da camisa.',
        detalhe:'Custo: <b>~US$ 0,04</b>. As fotos dos jogadores não são afetadas.',
        nao:'Cancelar', sim:'Refazer miniatura (~US$ 0,04)' })) return;
      rfM.textContent = 'Refazendo…';
      try{
        const del = await jogo('player_photos').delete()
          .eq('pack_id', ST.packId).eq('club_id', MOLDE_KEY).eq('jogador', 'mini-'+wiz.estilo);
        if(del.error) throw new Error(erroMsg(del.error));
        delete D.fotos[MOLDE_KEY+'|mini-'+wiz.estilo];
        wiz.pvMini = null; wiz.pvMiniChave = '';
        await garantirMoldeMini(wiz.estilo, item);
        registrar('estudio.molde-mini.refazer', wiz.estilo, { pacote: ST.packId });
        toast('Miniatura refeita a partir do uniforme.');
        abrir();
        return;
      }catch(err){ toast(err.message||'Falha ao refazer.', true); rfM.textContent = '↻ refazer miniatura'; }
    };
  }
  if(wiz.passo===4 && el('wz-esc-alterar')){
    el('wz-esc-alterar').onclick = () => modalEscudoIA(item, abrir);
  }
  if(wiz.passo===5 && el('wz-patro-up')){
    el('wz-patro').onchange = () => { colher(); atualizarPreview(); pintarPrevia(); };
    el('wz-patro').oninput  = () => { colher(); atualizarPreview(); };
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
    el('wz-fab').onchange = () => { colher(); atualizarPreview(); pintarPrevia(); };
    el('wz-fab').oninput  = () => { colher(); atualizarPreview(); };
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
      ST.fabTeste = wiz.fabUrl;
      modalAjustePatrocinio(item, abrir, basePreview());
    };

    async function salvar(aplicar){
      const bts = [el('wz-rascunho'), el('wz-aplicar')].filter(Boolean);
      bts.forEach(b=>b.disabled=true);
      try{
        let molde = D.fotos[MOLDE_KEY+'|'+wiz.estilo];
        if(!molde){
          if(!await rfConfirm({ titulo:'Primeiro uniforme neste estilo',
            texto:'O molde deste estilo ainda não existe — ele é gerado por IA <b>uma única vez</b>.',
            detalhe:'Custo: <b>~US$ 0,04</b>. Depois disso, todo clube deste estilo é pintado na hora, sem IA.',
            nao:'Cancelar', sim:'Gerar molde e salvar' })){
            bts.forEach(b=>b.disabled=false); return;
          }
          el('wz-estado').textContent = 'Gerando o molde deste estilo (uma vez só)…';
          molde = await garantirMolde(item, wiz.estilo);
        }
        el('wz-estado').textContent = 'Pintando o molde nas cores do clube — sem IA, sem custo.';
        const blob = await pintarMolde(molde.url, wiz.corA, wiz.corB, wiz.estilo);
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
            const bm = await pintarMolde(moldeMini.url, wiz.corA, wiz.corB, wiz.estilo);
            const cm = `${caminhoClube(item)}/miniatura-${Date.now()}.webp`;
            const um = await sb.storage.from('jogadores').upload(cm, bm, { upsert:false, cacheControl:'31536000' });
            if(!um.error) miniUrl = sb.storage.from('jogadores').getPublicUrl(cm).data.publicUrl;
          }catch(err){ console.warn('miniatura falhou:', err.message); }
        }
        const reg = { pack_id: ST.packId, club_id: String(c.id), jogador: TORSO_KEY, url,
          atributos: Object.assign({}, at, wiz.posPend || {}, { recorte:'torso', estilo: wiz.estilo, cores:[wiz.corA, wiz.corB],
            molde:true, patroUrl: wiz.patroUrl||null, patroNome: (wiz.patroNome||'').trim()||null,
            fabricanteUrl: wiz.fabUrl||null,
            miniatura: miniUrl, rascunho: !aplicar }) };
        const { error } = await jogo('player_photos').upsert(reg, { onConflict:'pack_id,club_id,jogador' });
        if(error) throw new Error(erroMsg(error));
        D.fotos[c.id+'|'+TORSO_KEY] = reg;
        ST.patroTeste = wiz.patroUrl || ST.patroTeste;
        registrar(aplicar?'estudio.uniforme.aplicar':'estudio.uniforme.rascunho', String(c.id), { pacote: ST.packId, estilo: wiz.estilo });

        /* UNIFORME NOVO = ELENCO ATUALIZADO: os rostos ficam guardados separados
           exatamente para isto — recosturar cada um sobre o uniforme novo, sem
           re-sortear visual. Só ao APLICAR, e sempre com custo confirmado. */
        if(aplicar){
          /* 'rosto' = fotos antigas, com o recorte guardado; 'direto' = as do
             metodo de uma chamada, onde a peca reaproveitavel e' a propria
             foto. Filtrar so' por 'rosto' faria a recostura PULAR EM SILENCIO
             toda foto nova, e o elenco ficaria com a camisa velha para sempre. */
          const comFoto = (c.squad||[]).map(p => D.fotos[c.id+'|'+p.n])
            .filter(f => f && f.atributos &&
                    (f.atributos.recorte==='rosto' || f.atributos.recorte==='direto'));
          const custoRe = (comFoto.length*0.07).toFixed(2);   // montagem medida na fatura
          const refazer = comFoto.length ? await rfConfirm({
            titulo:'Uniforme aplicado no jogo',
            texto:`O uniforme novo já está valendo no jogo. As <b>${comFoto.length} fotos</b> do elenco
                   ainda mostram a camisa anterior — elas só mudam se você refizer a montagem agora.`,
            detalhe:`<b>Refazer</b> usa os <b>mesmos rostos</b> (nada é sorteado de novo) e custa
                     <b>~US$ ${custoRe}</b>. <b>Manter</b> não gasta nada: o uniforme e a camisa do
                     campo já estão atualizados, só as fotos ficam com a camisa antiga.`,
            nao:'Manter as fotos atuais',
            sim:`Refazer as ${comFoto.length} fotos (~US$ ${custoRe})`, w:560 }) : false;
          if(refazer){
            let ok=0, falhas=0;
            for(const f of comFoto){
              el('wz-estado').textContent = `Aplicando novo uniforme nos jogadores atuais — ${ok+falhas+1}/${comFoto.length} (${f.jogador})…`;
              try{
                /* a entrada muda conforme a origem: rosto recortado ou foto inteira */
                const dela = f.atributos.recorte==='direto' ? f.atributos.montagem : f.url;
                const nova = await gerarImagemIA('montagem',
                  f.atributos.recorte==='direto' ? promptRecostura() : promptMontagem(),
                  'medium', [url, dela],
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
    const rmU = el('wz-remover');
    if(rmU) rmU.onclick = async () => {
      if(!await rfConfirm({ titulo:'Remover o uniforme deste clube',
        texto:'O clube volta à silhueta (sem uniforme) e a camisa do campo volta ao desenho padrão.',
        detalhe:'As fotos já costuradas do elenco continuam com a camisa antiga até serem refeitas.',
        nao:'Cancelar', sim:'Remover uniforme', perigo:true })) return;
      const { error } = await jogo('player_photos').delete()
        .eq('pack_id', ST.packId).eq('club_id', String(c.id)).eq('jogador', TORSO_KEY);
      if(error) return toast(erroMsg(error), true);
      delete D.fotos[c.id+'|'+TORSO_KEY];
      if(wiz.pv && wiz.pv.startsWith('blob:')) URL.revokeObjectURL(wiz.pv);
      D.wiz = null;
      registrar('estudio.uniforme.remover', String(c.id), { pacote: ST.packId });
      toast('Uniforme removido — o clube voltou à silhueta.');
      modalUniformeIA(item);
    };
  }
}
