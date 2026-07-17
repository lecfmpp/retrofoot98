/* ================================================================
   ELIFOOT MODERNO v3 — pele "Clássico" sobre o motor v2 (app.js)
   Recria a estética/fluxo do RetroFoot98 com assets e textos próprios.
   Telas na ordem: 01 abertura · 02 modo · 03 países · 04 moeda ·
   05 loading · 06 jogadores · 07 sorteio · 08-13 tela principal.
   ================================================================ */
const $c = s => document.querySelector(s);
const CL = { screen:'abertura', landingView:'home', save:'', currency:'Reais', countries:new Set(), names:['','','','','',''],
             draw:[], clubId:null, tab:'jogo', selPlayer:null, menu:null, ticket:8, mgr:'', mobMenuOpen:false,
             divisionToggle:{A:true,B:true,C:true,D:true}, compToggle:{libertadores:true, copaBrasil:true, sulamericana:true} };
/* ---- troféu (imagem) das competições — usado na seleção de país e em qualquer
   tela que mostre o nome de uma competição, pra dar mais identidade visual ---- */
function trophyImg(key,size){ const src=(typeof TROPHIES!=='undefined')&&TROPHIES[key];
  if(!src) return ''; size=size||28;
  return `<img src="${src}" alt="" class="cl-trophy-img" style="width:${size}px;height:${size}px" draggable="false">`; }
/* resolve o troféu certo por divisão (A/B/C/D) — cai pro emoji 🏆 se ainda não tivermos a imagem daquela divisão */
function divisionTrophyImg(division,size){
  const key=({A:'serieA',B:'serieB',C:'serieC',D:'serieD'})[division];
  return trophyImg(key,size);
}

/* ---- helpers de dinheiro / texto ---- */
function grp(n){ return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,' '); }
/* número de dinheiro agrupado JÁ convertido pra moeda de exibição (curConv/curSym vêm do
   index.html). O motor guarda tudo em R$; isto só apresenta na moeda escolhida. */
function moneyDisp(n){ return grp(Math.round(curConv(n))); }
function spellMoney(n){ n=Math.round(curConv(n)); const mi=Math.floor(n/1e6), mil=Math.floor((n%1e6)/1e3); const p=[];
  if(mi) p.push(mi+(mi===1?' milhão':' milhões')); if(mil) p.push(mil+' mil');
  if(!p.length) p.push(String(n));
  const word={BRL:'reais',USD:'dólares',EUR:'euros'}[curInfo().iso]||'reais';
  return p.join(' e ')+' '+word; }
function mvShort(mv){ mv=curConv(mv||0); return mv>=1e6? (mv/1e6).toFixed(mv>=1e7?0:1).replace('.',',')+'M' : Math.round(mv/1e3)+'k'; }
function posLetter(s){ return ({GK:'G',DEF:'D',MID:'M',ATT:'A'})[s]||'M'; }
/* ordena por posição (G, D, M, A) e depois por força — usado em listas de escalação/troca
   pra que jogador comprado apareça na posição certa, não no fim da lista */
function posRank(s){ return ({GK:0,DEF:1,MID:2,ATT:3})[s]!=null?({GK:0,DEF:1,MID:2,ATT:3})[s]:2; }
function bySquadOrder(a,b){ return posRank(a.s)-posRank(b.s) || (b.f||0)-(a.f||0); }
/* ---- atalhos universais: nome de clube/jogador em QUALQUER tela leva à
   ação correspondente — clube abre o elenco (do usuário ou de outro time
   pro mercado), jogador abre a ficha (venda, se for seu; oferta, se não). ---- */
function clubLink(clubId, label){
  if(!clubId || !clubOf(clubId)) return escC(label||'');
  const txt = label!=null ? label : clubOf(clubId).short;
  const action = clubId===CL.clubId ? `clGoSquad()` : `clViewTeam('${clubId}')`;
  return `<span class="cl-link" onclick="event.stopPropagation();${action}">${escC(txt)}</span>`;
}
function playerLink(playerName, clubId, label){
  if(!playerName) return '';
  const txt = label!=null ? label : playerName;
  if(!clubId) return escC(txt); // clube desconhecido (ex: jogador vendido/aposentado) — sem link quebrado
  const action = clubId===CL.clubId
    ? `clGoSquad('${escC(playerName)}')`
    : `clMarketPlayer('${clubId}','${escC(playerName)}')`;
  return `<span class="cl-link" onclick="event.stopPropagation();${action}">${escC(txt)}</span>`;
}
/* leva o usuário direto pro elenco do PRÓPRIO clube na aba Jogo, opcionalmente já selecionando um jogador */
function clGoSquad(playerName){ CL.menu=null; CL.rightMode=null; CL.tab='jogo'; CL.screen='main';
  if(playerName) CL.selPlayer=playerName; clCloseOverlay(); cdraw(); }
function shade(hex,amt){ hex=(hex||'#12224a').replace('#',''); if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');
  let r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
  const f=amt<0?0:255, t=Math.abs(amt); r=Math.round(r+(f-r)*t); g=Math.round(g+(f-g)*t); b=Math.round(b+(f-b)*t);
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join(''); }
function lumin(hex){ hex=(hex||'#000').replace('#',''); if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');
  const r=parseInt(hex.slice(0,2),16)/255,g=parseInt(hex.slice(2,4),16)/255,b=parseInt(hex.slice(4,6),16)/255; return 0.299*r+0.587*g+0.114*b; }
/* ---- identidade visual do clube (as DUAS cores oficiais) ----
   col = uniforme principal · col2 = secundária (clubes sem cor2 cadastrada,
   como os da Série A, ganham uma secundária derivada automaticamente). ---- */
function clubColors(club){ const col=(club&&club.color)||'#12224a'; const col2=(club&&club.color2)||shade(col,-0.35); return {col,col2}; }
/* cor de texto legível sobre o fundo `bg`: usa a cor secundária do clube se ela
   tiver contraste suficiente com o fundo; se as duas forem parecidas demais,
   cai pra preto ou branco (o que contrastar melhor). */
function barTextColor(bg, sec){
  const Lbg=lumin(bg);
  if(sec && Math.abs(Lbg - lumin(sec)) >= 0.45) return sec;
  return Lbg>0.58 ? '#111' : '#fff';
}
/* barra do clube: FUNDO = cor primária, TEXTO = cor secundária (com contraste
   garantido). O mesmo badge aparece igual em qualquer tela/tabela que mostra o
   nome do time numa barra (ao vivo, resultado, classificação, lobby, sorteio...) */
function clubStripe(club){ const {col,col2}=clubColors(club);
  return `background:${col};color:${barTextColor(col,col2)}`; }
/* acento de duas cores pra borda esquerda de linhas de lista (mercado, entrar na sala) */
function clubEdge(club){ const {col,col2}=clubColors(club); return `border-left-color:${col2};box-shadow:inset 4px 0 0 0 ${col}`; }
function clubTheme(id){ const cl=clubOf(id); const {col,col2}=clubColors(cl); return { col, col2, bg:shade(col,-0.6), bg2:shade(col,-0.42),
  txt:lumin(col)>0.62?shade(col,-0.45):col, hdr:lumin(col)>0.62?'#111':'#fff' }; }
/* formações: G-D-M-A */
const FORMATIONS={ '3-3-4':[1,3,3,4],'3-4-3':[1,3,4,3],'4-2-4':[1,4,2,4],'4-3-3':[1,4,3,3],'4-4-2':[1,4,4,2],'4-5-1':[1,4,5,1] };
const FKEY={ '3-3-4':'F1','3-4-3':'F2','4-2-4':'F3','4-3-3':'F4','4-4-2':'F5','4-5-1':'F6' };
// preço propositalmente alto (aprox. o orçamento inicial inteiro de um clube recém-criado):
// expandir estádio de verdade é obra pesada, não dá pra sair comprando bancada toda hora —
// ver clBuildStand/pushFinanceEntry (aba Finanças) pra onde essa despesa é registrada.
const STAND_SEATS=5000, STAND_PRICE=4000000, STAND_START=20000;
const SEASON_BUILD_LIMIT=10000; // no máx. 2 bancadas (10 mil lugares) por temporada — obra é lenta, cresce por anos
/* capacidade INICIAL realista por porte do clube (proxy pelo overall — não temos capacidade
   real de estádio nos dados). Clube grande já nasce com estádio grande; pequeno, modesto. */
function realStadiumCapacity(overall){
  // item 4: capacidade por divisão (overall na escala NOVA) — A 75k · B 50k · C 25k · D 10k
  return (typeof REBAL!=='undefined') ? REBAL.stadiumCap(overall) : Math.round(clamp(6000 + Math.max(0,(overall||30)-50)*1350, 10000, 68000)/1000)*1000;
}
/* TETO de expansão por porte do clube: maior que a inicial, mas realista — um clube pequeno
   nunca constrói um estádio gigante. Nunca abaixo da capacidade atual (não "encolhe"). */
function stadiumMaxCapacity(){
  const c=(typeof clubOf==='function')?clubOf(S.clubId):null; const ov=(c&&c.overall)||30;
  // teto de expansão = capacidade inicial da divisão + folga (item 4, escala nova de overall)
  const byLevel = realStadiumCapacity(ov) + 15000;
  const cur=(S.stadium&&S.stadium.capacity)||STAND_START;
  return Math.round(clamp(byLevel, cur, 90000)/1000)*1000;
}
/* custo de UMA bancada — escala com o tamanho atual (estádio grande é mais caro de expandir) */
function standCost(){ const cap=(S.stadium&&S.stadium.capacity)||STAND_START; return Math.round(STAND_PRICE*(0.7+cap/50000)); }
/* preço de ingresso "natural" por porte do clube — proporcional, sem exagero (faixa 6–16) */
function levelTicketPrice(overall){ return Math.round(clamp(6 + Math.max(0,(overall||30)-20)*0.32, 6, 16)); } // item 4: rebase p/ overall escala nova (A~44→~14, D~8→6)
function tacticPosture(f){ const a=(FORMATIONS[f]||[1,4,3,3])[3]; return a>=4?'ofensivo':a<=1?'retranca':'equilibrado'; }
/* quando o elenco não tem jogadores suficientes numa posição pra formação escolhida
   (ex: 4-5-1 sem 5 meio-campos), pickXIByFormation preenche com quem sobrar de outra
   posição — mas o resultado real de defesas/meios/ataques deixa de bater com a
   formação escolhida. Aqui a gente acha, entre as formações existentes, a mais
   parecida que o elenco realmente comporta, pra manter o botão marcado e a tática
   coerentes com o onze que vai a campo. */
function squadPositionCounts(id){ const c={GK:0,DEF:0,MID:0,ATT:0}; squad(id).forEach(p=>{ if(c[p.s]!=null) c[p.s]++; }); return c; }
function formationFits(f,counts){ const need=FORMATIONS[f]; return need && counts.DEF>=need[1] && counts.MID>=need[2] && counts.ATT>=need[3]; }
function coherentFormation(id,preferred){
  const counts=squadPositionCounts(id);
  if(formationFits(preferred,counts)) return preferred;
  const need0=FORMATIONS[preferred]; let best=null,bestScore=Infinity;
  Object.keys(FORMATIONS).forEach(k=>{ if(!formationFits(k,counts)) return;
    const n=FORMATIONS[k]; const score=Math.abs(n[1]-need0[1])+Math.abs(n[2]-need0[2])+Math.abs(n[3]-need0[3]);
    if(score<bestScore){ bestScore=score; best=k; } });
  return best || preferred;
}
function pickXIByFormation(id,f){ const need=FORMATIONS[f]||FORMATIONS['4-3-3']; const secs=['GK','DEF','MID','ATT'];
  const sq=squad(id).slice().sort((a,b)=>b.f-a.f); const xi=[];
  secs.forEach((sec,i)=>{ sq.filter(p=>p.s===sec).slice(0,need[i]).forEach(p=>xi.push(p.n)); });
  if(xi.length<11){ const have=new Set(xi); // completa sem colocar 2º goleiro na linha
    const add=n=>{ if(xi.length<11 && !have.has(n)){ xi.push(n); have.add(n); } };
    for(const p of sq){ if(p.s!=='GK') add(p.n); }  // jogadores de linha primeiro
    for(const p of sq){ add(p.n); }                  // último recurso: evita XI < 11
  }
  return xi.slice(0,11); }
/* simula uma partida completa capturando eventos (determinístico; usa SIM_SYNC do motor) */
function simEventsC(h,a,seed,opts){ const evs=[]; let fin=null; const isU=(h===S.clubId||a===S.clubId);
  const prev=(typeof SIM_SYNC!=='undefined')?SIM_SYNC:false; if(typeof SIM_SYNC!=='undefined')SIM_SYNC=true;
  try{ const s=simulateMatch(h,a,isU,(t)=>{ if(t.ev) evs.push({min:t.minute,type:t.ev.type,team:t.ev.team,side:t.ev.side,scorer:t.ev.scorer,
      player:t.ev.player,pos:t.ev.pos,cardType:t.ev.cardType,reason:t.ev.reason,severity:t.ev.severity,outMatches:t.ev.outMatches}); },(res)=>{fin=res;}, seed, opts);
    let g=0; while(!fin && g++<600){ s.step(); } }
  finally{ if(typeof SIM_SYNC!=='undefined')SIM_SYNC=prev; }
  return {hg:fin.hg,ag:fin.ag,scorers:fin.scorers,events:evs,perf:fin.perf}; }
function escC(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function rngFrom(seed){ let x=(seed>>>0)||1; return ()=>{ x^=x<<13; x^=x>>>17; x^=x<<5; return ((x>>>0)/0xffffffff); }; }
const REFS_C=['Anderson Daronco','Wilton Sampaio','Raphael Claus','Bráulio da Silva','Ramon Abatti','Flávio Rodrigues','Ferreira Rodrigues'];
const COACHES_C=['Arnaldo Lira','Renato Bianchi','Vanderlei Souza','Paulo Meira','Zé Carlos','Ademir Fonseca','Cuca Ramires'];

/* ---- chrome Win3.1 ---- */
function deskWrap(inner,opts){ opts=opts||{};
  const logoImg=`<img class="cl-desk-logo" src="img/logo.webp" width="500" height="500" alt="RetroFoot98" draggable="false">`;
  const logo=opts.logo?(opts.linkHome?`<a class="cl-logo-link" href="https://retrofoot98.com.br/" aria-label="RetroFoot98 — página inicial">${logoImg}</a>`:logoImg):'';
  return `<div class="cl-desk">${logo}${inner}</div>`; }
function topbarAuth(){
  if(typeof NET==='undefined' || !NET.authStatus) return '';
  const st=NET.authStatus(); if(!st.loggedIn) return '';
  const label=st.name||(st.email||'').split('@')[0]||'Conta';
  return `<div class="cl-topbar-auth" title="${escC(st.email||'')}">
    <span class="cl-topbar-auth-name">👤 ${escC(label)}</span>
    <button class="cl-topbar-auth-out" onclick="clAuthLogout()">Sair</button>
  </div>`;
}
async function clAuthLogout(){
  try{ if(typeof NET!=='undefined' && NET.authSignOut) await NET.authSignOut(); }catch(e){ console.warn('Logout erro:', e); }
  CL.screen='abertura'; CL.landingView='home'; cdraw();
  if(typeof toastC==='function') toastC('Sessão encerrada.');
}
function titleBarTop(t,opts){ opts=opts||{};
  const logoImg=`<img class="cl-topbar-logo" src="img/logo.webp" width="500" height="500" alt="">`;
  const logo=opts.logo?(opts.linkHome?`<a class="cl-logo-link" href="https://retrofoot98.com.br/" aria-label="RetroFoot98 — página inicial">${logoImg}</a>`:logoImg):'';
  return `<div class="cl-topbar">${logo}${escC(t)}${topbarAuth()}</div>`; }
function dlg(title,body,opts){ opts=opts||{}; const w=opts.w||620;
  const badge = opts.badge ? `<div class="cl-dlg-badge">${opts.badge.icon||''}<span class="cl-dlg-badge-t">${escC(opts.badge.label||'')}</span></div>` : '';
  return `<div class="cl-dlg" style="width:${w}px">
    ${badge}
    <div class="cl-dlg-title"><span>${escC(title)}</span>${opts.min?'<span class="cl-min">–</span>':''}</div>
    <div class="cl-dlg-body ${opts.bodyClass||''}">${body}</div>
  </div>`; }
function btn(label,onclick,opts){ opts=opts||{}; return `<button class="cl-btn ${opts.cls||''}" ${opts.dis?'disabled':''} onclick="${onclick}">${opts.icon?`<span class="cl-btn-ic">${opts.icon}</span>`:''}<span>${escC(label)}</span></button>`; }

/* ================= RENDER RAIZ ================= */
function cdraw(){ const r=$c('#c-root'); if(!r)return;
  let html='';
  switch(CL.screen){
    case 'abertura':  html=scAbertura(); break;
    case 'login':     html=scLogin(); break;
    case 'resetpassword': html=scResetPassword(); break;
    case 'modo':      html=scModoChoice(); break;
    case 'modosolo':  html=scModoSolo(); break;
    case 'paises':    html=scPaises(); break;
    case 'paisJogavel': html=titleBarTop('RetroFoot98',{logo:true})+deskWrap(scPaisJogavel(),{logo:true}); break;
    case 'moeda':     html=scMoeda(); break;
    case 'loading':   html=scLoading(); break;
    case 'jogadores': html=scJogadores(); break;
    case 'escolhaclubes': html=scEscolhaClubes(); break;
    case 'sorteio':   html=titleBarTop('RetroFoot98',{logo:true})+deskWrap(scSorteio(),{logo:true}); break;
    case 'main':      html=titleBarTop('RetroFoot98')+deskWrap(scMain()); break;
    case 'teamview':  html=titleBarTop('RetroFoot98')+deskWrap(scTeamView()); break;
    case 'handoff':   html=titleBarTop('RetroFoot98')+deskWrap(scHandoff()); break;
    case 'seatturn':  html=titleBarTop('RetroFoot98')+deskWrap(scSeatTurn()); break;
    case 'seatclassif': html=scSeatClassif(); break;
    case 'live':      html=scLive(); break;
    case 'classif':   html=scClassif(); break;
    case 'cupclassif':html=scCupClassif(); break;
    case 'cupdraw':   html=scCupDraw(); break;
    case 'online':    html=renderOnline(); break;
  }
  r.innerHTML=html;
  if(typeof renderChatDock==='function') renderChatDock(); // doca do chat em TODAS as telas online (inclusive ao vivo)
  if(CL.screen==='loading') runLoading();
  const f=$c('#cl-focus'); if(f) f.focus();
}

/* ================= 01 · ABERTURA (Home) =================
   Redesenho do handoff de design (templates/home/Home.dc.html do pacote entregue):
   janela com barra de título + navbar de páginas institucionais (Início/Sobre nós/Como
   jogar/Contato) + corpo com UM CTA dominante (Jogar agora) + rodapé (Sobre/Contato/
   Termos/Privacidade). O protótipo original usa um canvas de tamanho fixo (1100×632)
   escalado por JS — truque específico da ferramenta de design pra caber num iframe de
   preview. Aqui adaptado pro padrão responsivo real do resto do app: 100vh fluido,
   único breakpoint em 760px (ver .cl-home-* no CSS), igual todo o resto do RetroFoot98. */
const FEATURES=[
  {img:'img/badge-clubes.webp', t:'Clubes e jogadores reais', d:'Elencos de verdade, das quatro divisões às copas.'},
  {img:'img/badge-liga.webp', t:'Liga com amigos', d:'Monte a sua liga no Modo Resenha e dispute a rodada.'},
  {img:'img/badge-chat.webp', t:'Chat em tempo real', d:'Resenha com a galera enquanto os jogos rolam.'}
];
const LANDING_NAV=[['home','Início'],['sobre','Sobre nós'],['ajuda','Como jogar'],['contato','Contato']];
const LANDING_FOOT=[['sobre','Sobre nós'],['contato','Contato'],['termos','Termos'],['priv','Privacidade']];
/* navbar da Home/wizard: links à esquerda + ações à direita. No mobile os links colapsam
   num menu hambúrguer (☰) em vez de rolar horizontalmente. navItems = [[label,onclick,ativo]]. */
function homeNavbar(navItems, rightHTML){
  const open=CL.navMenuOpen?'open':'';
  const links=navItems.map(([label,onclick,active])=>`<button class="cl-home-nav ${active?'on':''}" onclick="${onclick}">${escC(label)}</button>`).join('');
  return `<div class="cl-home-navbar">
    <button class="cl-home-burger" onclick="clToggleNavMenu(event)" aria-label="Menu">☰</button>
    <div class="cl-home-navlinks ${open}">${links}</div>
    <div class="cl-home-navsp"></div>
    ${rightHTML}
  </div>`;
}
function clToggleNavMenu(e){ if(e&&e.stopPropagation) e.stopPropagation(); CL.navMenuOpen=!CL.navMenuOpen; cdraw(); }
function scAbertura(){
  const v=CL.landingView||'home';
  const navHTML=LANDING_NAV.map(([view,label])=>`<button class="cl-home-nav ${v===view?'on':''}" onclick="clLandingGo('${view}')">${escC(label)}</button>`).join('');
  const footHTML=LANDING_FOOT.map(([view,label])=>`<a class="cl-home-foot" onclick="clLandingGo('${view}')">${escC(label)}</a>`).join('');
  const bodyFns={sobre:landingSobreHTML, ajuda:landingAjudaHTML, contato:landingContatoHTML, termos:landingTermosHTML, priv:landingPrivHTML};
  const body=(bodyFns[v]||landingHomeHTML)();
  return `<div class="cl-home">
    <div class="cl-home-titlebar">
      <div class="cl-home-tb-l"><img src="img/logo.webp" width="500" height="500" alt="">RetroFoot98</div>
      <div class="cl-home-tb-r"><span>_</span><span>□</span><span>✕</span></div>
    </div>
    ${homeNavbar(LANDING_NAV.map(([view,label])=>[label,`clLandingGo('${view}')`,v===view]),
      `<span class="cl-home-online"><span class="cl-home-online-dot"></span>100% Online</span>
       <button class="cl-home-entrar" onclick="clGoModo()"><span>🔑</span>Entrar</button>`)}
    <div class="cl-home-body">${body}</div>
    <div class="cl-home-footer">
      <div class="cl-home-foot-l"><span class="cl-home-ver">v2026.01</span><span>© 2026 RetroFoot98</span></div>
      <div class="cl-home-foot-r">${footHTML}</div>
    </div>
  </div>`;
}
function landingHomeHTML(){
  const featHTML=FEATURES.map(f=>`<div class="cl-home-feat">
      <img src="${f.img}" width="500" height="500" alt="">
      <div class="cl-home-feat-t">${escC(f.t)}</div>
      <div class="cl-home-feat-d">${escC(f.d)}</div>
    </div>`).join('');
  return `<div class="cl-home-hero">
    <img class="cl-home-hero-logo" src="img/logo.webp" width="500" height="500" alt="RetroFoot98">
    <div class="cl-home-hero-h">O clássico da sua infância,<br>agora online e com os amigos.</div>
    <div class="cl-home-hero-sub">Você é o técnico. Escale o time, negocie jogadores e leve o clube da Série D ao topo.</div>
    <div class="cl-home-hero-cta">
      <button class="cl-home-cta" onclick="clGoModo()"><span>⚽</span>Jogar agora</button>
      <div class="cl-home-hero-links">
        <button class="cl-home-mini" onclick="clGoModo('signup')">Criar conta grátis</button>
        <span>·</span>
        <button class="cl-home-mini" onclick="clGoModo('login')">Já tenho conta</button>
      </div>
    </div>
    <div class="cl-home-features">
      <div class="cl-home-features-lbl">POR QUE JOGAR</div>
      <div class="cl-home-featrow">${featHTML}</div>
    </div>
  </div>`;
}
function landingPageHTML(title, bodyHTML, opts){ opts=opts||{};
  return `<div class="cl-home-page">
    <div class="cl-home-pagebox" style="${opts.w?`width:${opts.w}px`:''}">
      <div class="cl-home-pagebox-h">${escC(title)}</div>
      <div class="cl-home-pagebox-b ${opts.bodyClass||''}">${bodyHTML}</div>
    </div>
  </div>`;
}
function landingSobreHTML(){
  return landingPageHTML('Sobre nós', `
    <div class="cl-home-h2">Feito por quem cresceu jogando Elifoot.</div>
    <p>O RetroFoot98 é o jogo de gerenciamento de futebol que você jogava na escola — a mesma pegada raiz de janelinha e placar em mono — só que agora online e com os amigos. Você comanda o clube: escolhe a tática, negocia jogadores, cuida do caixa e briga por acesso da Série D até o topo.</p>
    <p class="cl-home-p2">É um projeto independente, tocado por gente apaixonada por futebol e pelos clássicos de PC. Sem tela de energia, sem pay-to-win: só o jogo que a gente sempre quis ter de volta.</p>
    <button class="cl-home-mini cl-home-back" onclick="clLandingGo('home')">↩ Voltar ao início</button>
  `, {w:620});
}
function landingAjudaHTML(){
  const steps=[
    ['1','Escolha o modo.','Solo contra a máquina ou Modo Resenha, com a liga da galera.'],
    ['2','Pegue um clube.','Elencos reais das quatro divisões. Comece de onde quiser.'],
    ['3','Monte a tática e jogue.','Escale os titulares, ajuste a Formação e mande ver na rodada.']
  ];
  const rows=steps.map(([n,t,d])=>`<div class="cl-home-step">
      <span class="cl-home-step-n">${n}</span>
      <div><b>${escC(t)}</b><span>${escC(d)}</span></div>
    </div>`).join('');
  return landingPageHTML('Como jogar', `
    <div class="cl-home-steps">${rows}</div>
    <div class="cl-home-ajuda-actions">
      ${btn('Jogar agora','clGoModo()',{icon:'⚽',cls:'cl-btn-ok'})}
      <button class="cl-home-mini cl-home-back" onclick="clLandingGo('home')">↩ Voltar</button>
    </div>
  `, {w:640});
}
function landingContatoHTML(){
  return landingPageHTML('Contato', `
    <p>Achou um bug, tem uma ideia ou quer chamar pra resenha? Fala com a gente:</p>
    <div class="cl-home-contact-list">
      <div class="cl-home-contact-row"><span>✉️</span><span class="cl-home-mono">contato@retrofoot98.com</span></div>
      <div class="cl-home-contact-row"><span>💬</span><b>Discord da comunidade</b><span class="cl-home-muted">&nbsp;— resenha e suporte</span></div>
      <div class="cl-home-contact-row"><span>🐦</span><b>@retrofoot98</b><span class="cl-home-muted">&nbsp;— novidades e updates</span></div>
    </div>
    <button class="cl-home-mini cl-home-back" onclick="clLandingGo('home')">↩ Voltar ao início</button>
  `, {w:560, bodyClass:'cl-home-pagebox-b-gray'});
}
function landingTermosHTML(){
  return landingPageHTML('Termos de uso', `
    <p><b>1. O jogo.</b> O RetroFoot98 é gratuito para jogar. Você é responsável pela sua conta e pelo que faz nas ligas em que entra.</p>
    <p><b>2. Fair play.</b> Nada de trapaça, bots ou ofensa na resenha. Contas fora da linha podem ser suspensas.</p>
    <p><b>3. Marcas.</b> Nomes de clubes e jogadores pertencem aos seus donos e são usados apenas para fins de simulação.</p>
    <p class="cl-home-fine">Versão v2026.01 — última atualização em julho de 2026.</p>
    <button class="cl-home-mini cl-home-back" onclick="clLandingGo('home')">↩ Voltar ao início</button>
  `, {w:620, bodyClass:'cl-home-pagebox-b-gray'});
}
function landingPrivHTML(){
  return landingPageHTML('Privacidade', `
    <p><b>O que guardamos.</b> Só o essencial pra você jogar: e-mail, apelido de treinador e o progresso do seu clube, gravado na nuvem.</p>
    <p><b>O que não fazemos.</b> A gente não vende seus dados. Sem rastreio pra fora do jogo.</p>
    <p><b>Seus direitos.</b> Você pode pedir seus dados ou apagar sua conta a qualquer momento, é só falar com a gente no Contato.</p>
    <p class="cl-home-fine">Versão v2026.01 — última atualização em julho de 2026.</p>
    <button class="cl-home-mini cl-home-back" onclick="clLandingGo('home')">↩ Voltar ao início</button>
  `, {w:620, bodyClass:'cl-home-pagebox-b-gray'});
}
function clNoop(){}
/* 'Entrar' na abertura: login é OBRIGATÓRIO (vale p/ Solo e Resenha). Se já houver
   sessão salva, vai direto pra escolha de modo; senão mostra a tela de login. */
function clGoModo(mode){
  CL.navMenuOpen=false;
  toastC('Conectando...');
  (async ()=>{
    await netInitSupabase();
    const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};
    if(st.loggedIn){ CL.mgr=CL.mgr||st.name; CL.screen='modo'; }
    else { CL.auth={mode:mode||'login',name:CL.mgr||'',email:'',password:''}; CL.screen='login'; }
    cdraw();
  })();
}
/* páginas institucionais da Home (Sobre nós/Como jogar/Contato/Termos/Privacidade) —
   trocam só o corpo da mesma página (mesmo header/footer), sem sair da tela 'abertura'. */
function clLandingGo(view){ CL.landingView=view; CL.navMenuOpen=false; cdraw(); }
/* ================= LOGIN (abertura) — obrigatório, vale p/ os dois modos ================= */
function scLogin(){ const a=CL.auth||(CL.auth={mode:'login',name:'',email:'',password:''});
  const isSignup=a.mode==='signup';
  const disabled=!(a.email&&a.password&&(!isSignup||a.name));
  const body=`
    <div class="cl-wiz-authcard">
      <div class="cl-conta-tabs">
        <div class="cl-conta-tab ${!isSignup?'on':''}" onclick="CL.auth.mode='login';cdraw()">Já tenho conta</div>
        <div class="cl-conta-tab ${isSignup?'on':''}" onclick="CL.auth.mode='signup';cdraw()">Criar conta nova</div>
      </div>
      <div class="cl-wiz-authsub">${isSignup?'Crie sua conta pra salvar seus jogos na nuvem e continuar em qualquer aparelho.':'Entre pra acessar seus jogos salvos na nuvem.'}</div>
      <div class="cl-authform">
        ${isSignup?`<div class="cl-authfield"><label>Nome de treinador</label><input id="cl-focus" maxlength="14" placeholder="Como quer ser chamado" value="${escC(a.name)}" oninput="CL.auth.name=this.value.toUpperCase();this.value=CL.auth.name;clLoginSync()"></div>`:''}
        <div class="cl-authfield"><label>E-mail</label><input ${isSignup?'':'id="cl-focus"'} type="email" inputmode="email" autocomplete="email" placeholder="voce@exemplo.com" value="${escC(a.email)}" oninput="CL.auth.email=this.value;clLoginSync()"></div>
        <div class="cl-authfield">
          <div class="cl-wiz-fieldhd2"><label>Senha</label>${isSignup?'':'<span class="cl-forgot-link" onclick="clForgotPassword()">Esqueci minha senha</span>'}</div>
          <input type="password" autocomplete="${isSignup?'new-password':'current-password'}" minlength="6" placeholder="••••••••" value="${escC(a.password||'')}" oninput="CL.auth.password=this.value;clLoginSync()" onkeydown="if(event.key==='Enter')${isSignup?'clLoginSignup':'clLoginDo'}()"></div>
        ${isSignup?`<div class="cl-authhint">Pelo menos 6 caracteres. Evite senhas óbvias (ex.: 123456, sua data de nascimento).</div>`:''}
      </div>
    </div>`;
  return wizShell({
    public:true, title:isSignup?'Criar conta':'Sua conta',
    back:'clGoAbertura()', backLabel:'Voltar ao início',
    contentCls:'cl-wiz-authcenter', body,
    actionCls:'cl-wiz-action-e',
    action: btn(isSignup?'Criar conta':'Entrar', isSignup?'clLoginSignup()':'clLoginDo()', {icon:'✔',cls:'cl-wiz-cta',dis:disabled})
  });
}
function clLoginSync(){ const b=document.querySelector('.cl-wiz-cta, .cl-btn-ok'); if(!b) return; const a=CL.auth||{}; const isSignup=a.mode==='signup'; b.disabled=!(a.email&&a.password&&(!isSignup||a.name)); }
function clLoginAfter(name){ CL.mgr=name||CL.mgr; CL.auth=null; CL.screen='modo'; cdraw(); }
function clLoginDo(){ const a=CL.auth; if(!a||!(a.email&&a.password)) return; toastC('Entrando...');
  (async ()=>{ try {
    const user=await NET.authSignIn(a.email, a.password);
    clLoginAfter(user.user_metadata?.name || a.email.split('@')[0]); toastC('Login feito!');
  } catch(e){ toastC('⚠ '+e.message); } })();
}
function clLoginSignup(){ const a=CL.auth; if(!a||!(a.email&&a.password&&a.name)) return; toastC('Criando conta...');
  (async ()=>{ try {
    await NET.authSignUp(a.email, a.password, a.name);
    clLoginAfter(a.name); toastC('Conta criada!');
  } catch(e){
    if(e.code==='DUPLICATE_ACCOUNT'){ CL.auth.mode='login'; cdraw(); }
    toastC('⚠ '+e.message);
  } })();
}

/* ---- Esqueci minha senha: modal simples pedindo o e-mail (pré-preenchido se
   já tiver algo digitado na tela de login), manda o link de recuperação. ---- */
function clForgotPassword(){
  CL._resetEmail = (CL.auth&&CL.auth.email) || '';
  overlayC(dlg('Esqueci minha senha', `<div class="cl-authbox">
    <div class="cl-authsub">Informe seu e-mail. Vamos mandar um link pra você criar uma senha nova.</div>
    <div class="cl-authform">
      <div class="cl-authfield"><label>E-mail</label><input id="cl-focus" type="email" inputmode="email" autocomplete="email" value="${escC(CL._resetEmail)}" oninput="CL._resetEmail=this.value" onkeydown="if(event.key==='Enter')clSendResetLink()"></div>
    </div>
    <div class="cl-auth-actions">
      ${btn('Enviar link','clSendResetLink()',{icon:'✔',cls:'cl-btn-ok cl-authbtn-primary'})}
      ${btn('Cancelar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel cl-authbtn-secondary'})}
    </div>
  </div>`, {w:420,bodyClass:'cl-body-green'}));
}
function clSendResetLink(){
  const email=(CL._resetEmail||'').trim();
  if(!email||!email.includes('@')){ toastC('⚠ Informe um e-mail válido.'); return; }
  toastC('Enviando...');
  (async ()=>{ try {
    await NET.authResetPassword(email);
    clCloseOverlay();
    toastC('✓ Link enviado! Confira seu e-mail (e a caixa de spam).');
  } catch(e){ toastC('⚠ '+(e&&e.message||'Erro ao enviar o link.')); } })();
}

/* ---- Nova senha: só chega aqui via link de recuperação (evento PASSWORD_RECOVERY,
   ver netInitSupabase) — a sessão temporária do link já autentica o updateUser. ---- */
function scResetPassword(){
  const st=CL.resetPw||(CL.resetPw={password:'',confirm:'',focus:'password'});
  const ok=st.password.length>=6 && st.password===st.confirm;
  const mismatch=st.confirm.length>0 && st.password!==st.confirm;
  // o campo com foco muda dinamicamente (não fixo em "Nova senha"), senão o cdraw()
  // disparado a cada tecla sempre devolvia o cursor pro primeiro campo — impossível
  // digitar "Confirmar senha" de corrido.
  const idP = st.focus!=='confirm' ? 'id="cl-focus"' : '';
  const idC = st.focus==='confirm' ? 'id="cl-focus"' : '';
  const body=`<div class="cl-wiz-authcard">
    <div class="cl-wiz-authsub">Escolha uma senha nova pra sua conta.</div>
    <div class="cl-authform">
      <div class="cl-authfield"><label>Nova senha</label><input ${idP} type="password" autocomplete="new-password" minlength="6" placeholder="••••••••" value="${escC(st.password)}" onfocus="CL.resetPw.focus='password'" oninput="CL.resetPw.password=this.value;cdraw()"></div>
      <div class="cl-authfield"><label>Confirmar senha</label><input ${idC} type="password" autocomplete="new-password" placeholder="••••••••" value="${escC(st.confirm)}" onfocus="CL.resetPw.focus='confirm'" oninput="CL.resetPw.confirm=this.value;cdraw()" onkeydown="if(event.key==='Enter')clDoUpdatePassword()"></div>
      ${mismatch?'<div class="cl-authwarn">As senhas não coincidem.</div>':''}
    </div>
  </div>`;
  return wizShell({
    public:true, title:'Nova senha', back:'clGoAbertura()', backLabel:'Voltar ao início',
    contentCls:'cl-wiz-authcenter', body, actionCls:'cl-wiz-action-e',
    action: btn('Salvar senha','clDoUpdatePassword()',{icon:'✔',cls:'cl-wiz-cta',dis:!ok})
  });
}
function clDoUpdatePassword(){
  const st=CL.resetPw; if(!st||st.password.length<6||st.password!==st.confirm) return;
  toastC('Salvando...');
  (async ()=>{ try {
    await NET.updatePassword(st.password);
    CL.resetPw=null;
    // limpa o hash/query de recuperação da URL sem recarregar a página
    try{ history.replaceState(null,'',window.location.pathname); }catch(e){}
    toastC('✓ Senha alterada! Entrando...');
    clLoginAfter(SB_AUTH_USER && (SB_AUTH_USER.user_metadata?.name || (SB_AUTH_USER.email||'').split('@')[0]));
  } catch(e){ toastC('⚠ '+(e&&e.message||'Erro ao salvar a senha.')); } })();
}

/* ================= FLUXO "NOVO JOGO" — wizard de 4 passos =================
   Redesign do handoff (design_handoff_novo_jogo): shell fixo igual à Home (barra de
   título + navbar logada + footer), cabeçalho de etapa (‹ Voltar + título + pill N/4) e
   barra de ação inferior. Só markup/estilo/navegação — a lógica (handlers) é a mesma.
   Passos: 1 Escolher modo · 2 Modo Solo · 3 Novo jogo (nome) · 4 Selecção de Países. */
function clWizHome(view){ CL.screen='abertura'; CL.landingView=view||'home'; CL.navMenuOpen=false; cdraw(); }
/* ação inline (botão principal logo abaixo do formulário) — automática nas telas de formulário
   (CTA único à direita, actionCls 'cl-wiz-action-e') ou quando o.actionInline for pedido. As
   telas de escolha (action-c), o lobby e a Selecção de Países mantêm a barra de ação inferior. */
function _wizInline(o){ return !!(o.actionInline || (o.actionCls && String(o.actionCls).indexOf('cl-wiz-action-e')>=0)); }
function wizShell(o){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};
  const user=st.name||CL.mgr||'jogador';
  const back = o.back
    ? `<button class="cl-wiz-back" onclick="${o.back}">‹ ${escC(o.backLabel||'Voltar')}</button>`
    : `<span class="cl-wiz-back-sp"></span>`;
  // navbar à direita: público (login/criar conta) mostra "Entrar"; logado mostra chip + usuário + Sair
  const navRight = o.public
    ? `<button class="cl-home-entrar" onclick="clGoAbertura()"><span>🔑</span>Entrar</button>`
    : `<span class="cl-home-online"><span class="cl-home-online-dot"></span>100% Online</span>
       <span class="cl-wiz-user">👤 ${escC(user)}</span>
       <button class="cl-topbar-auth-out cl-wiz-sair" onclick="clAuthLogout()">Sair</button>`;
  // pill à direita do cabeçalho de etapa: customizado (o.pill, ex.: código da sala), ou passo N/4, ou vazio
  const pill = o.pill!=null ? `<span class="cl-wiz-steppill">${o.pill}</span>`
    : (o.step!=null ? `<span class="cl-wiz-steppill">${o.step} / 4</span>` : `<span class="cl-wiz-back-sp"></span>`);
  return `<div class="cl-home cl-wiz ${o.rootCls||''}">
    <div class="cl-home-titlebar">
      <div class="cl-home-tb-l"><img src="img/logo.webp" width="500" height="500" alt="">RetroFoot98</div>
      <div class="cl-home-tb-r"><span>_</span><span>□</span><span>✕</span></div>
    </div>
    ${homeNavbar(
      [['Início',"clWizHome('home')"],['Sobre nós',"clWizHome('sobre')"],['Como jogar',"clWizHome('ajuda')"],['Contato',"clWizHome('contato')"]],
      navRight)}
    <div class="cl-home-body cl-wiz-body">
      ${o.noHeader?'':`<div class="cl-wiz-stephead">
        ${o.headLeft!=null?o.headLeft:back}
        <span class="cl-wiz-steptitle">${escC(o.title)}</span>
        ${pill}
      </div>`}
      <div class="cl-wiz-content ${o.contentCls||''}">${o.body}${(_wizInline(o) && o.action!=null)?`<div class="cl-wiz-inlineaction ${o.actionCls||''}">${o.action}</div>`:''}</div>
      ${(o.action!=null && !_wizInline(o))?`<div class="cl-wiz-actionbar ${o.actionCls||''}">${o.action}</div>`:''}
    </div>
    <div class="cl-home-footer">
      <div class="cl-home-foot-l"><span class="cl-home-ver">v2026.01</span><span>© 2026 RetroFoot98</span></div>
      <div class="cl-home-foot-r">
        <a class="cl-home-foot" onclick="clWizHome('sobre')">Sobre nós</a>
        <a class="cl-home-foot" onclick="clWizHome('contato')">Contato</a>
        <a class="cl-home-foot" onclick="clWizHome('termos')">Termos</a>
        <a class="cl-home-foot" onclick="clWizHome('priv')">Privacidade</a>
      </div>
    </div>
  </div>`;
}

/* ================= 02a · PASSO 1 — ESCOLHER MODO (Solo / Resenha) ================= */
function scModoChoice(){
  return wizShell({ step:1, title:'Escolher modo', back:'clGoAbertura()', backLabel:'Voltar ao início',
    contentCls:'cl-wiz-center', actionCls:'cl-wiz-action-c',
    action:`<span class="cl-wiz-hint">Toque num cartão para continuar.</span>`,
    body:`
      <div class="cl-wiz-h">Como você quer jogar?</div>
      <div class="cl-wiz-sub">Você pode mudar de modo depois, a qualquer momento.</div>
      <div class="cl-wiz-cards">
        <div class="cl-mc-card" onclick="clPickSolo()">
          <div class="cl-mc-ic">🎮</div>
          <div class="cl-mc-t">Modo Solo</div>
          <div class="cl-mc-d">Você contra a máquina, no estilo RetroFoot98 tradicional.</div>
        </div>
        <div class="cl-mc-card" onclick="clPickResenha()">
          <div class="cl-mc-ic">👥</div>
          <div class="cl-mc-t">Modo Resenha</div>
          <div class="cl-mc-d">Jogue online com amigos — cada um assume um clube, com chat da liga.</div>
        </div>
      </div>`
  });
}
function clPickSolo(){ CL.screen='modosolo'; CL.soloStep='choice'; CL.soloSaves=null; CL.mode=null; CL.contSel=null; CL.save=''; cdraw();
  (async ()=>{ CL.soloSaves = (typeof NET!=='undefined'&&NET.listSoloSaves)?await NET.listSoloSaves():[]; if(CL.screen==='modosolo') cdraw(); })(); }
function clPickResenha(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};
  if(!st.loggedIn){ clOnlineStart(); return; } // fallback: o gate da abertura normalmente já garante login
  // Resenha é sempre Brasil Série A — limpa qualquer resíduo de um solo anterior (universo intl,
  // divisão baixa) pra que a sala criada use os clubes certos e newGame não quebre depois.
  if(typeof setUniverse==='function') setUniverse('brasil');
  if(DATA.clubsSerieA) DATA.clubs=DATA.clubsSerieA.slice();
  CL.intlUniverse=false; CL.bgCountries=[]; CL.playCountry='Brasil';
  CL.screen='online';
  CL.net={ step:'escolha', intent:'host', authMode:'login', name:CL.mgr||st.name||'', email:st.email||'', roomName:'', phone:'', code:'', myRooms:null };
  wireNet(); cdraw();
  // busca em segundo plano as salas que o usuário já participa (pra oferecer reentrar)
  (async ()=>{ try{ CL.net.myRooms = await NET.listMyRooms(); if(CL.net&&CL.net.step==='escolha') cdraw(); }catch(e){} })();
}

/* ================= PASSO 2 · MODO SOLO — novo / continuar (saves na NUVEM) ================= */
function scModoSolo(){
  const step=CL.soloStep||'choice';
  if(step==='novo') return scSoloNovo();
  if(step==='cont') return scSoloCont();
  const loading=CL.soloSaves==null; const n=(CL.soloSaves||[]).length;
  const contDesc = loading?'Carregando seus jogos salvos…' : (n?`Você tem <b>${n}</b> jogo${n>1?'s':''} salvo${n>1?'s':''} na nuvem.`:'Nenhum jogo salvo ainda.');
  return wizShell({ step:2, title:'Modo Solo', back:'clGoModo()',
    contentCls:'cl-wiz-center', actionCls:'cl-wiz-action-c',
    action:`<span class="cl-wiz-hint">Toque num cartão para continuar.</span>`,
    body:`
      <div class="cl-wiz-h">Como você quer começar?</div>
      <div class="cl-wiz-sub">Comece do zero ou retome um dos seus saves na nuvem.</div>
      <div class="cl-wiz-cards">
        <div class="cl-mc-card sel" onclick="clSoloNew()">
          <span class="cl-mc-badge">NEW</span>
          <div class="cl-mc-t">Novo jogo</div>
          <div class="cl-mc-d">Comece uma carreira nova do zero, contra a máquina.</div>
        </div>
        <div class="cl-mc-card" onclick="clSoloContinue()">
          <div class="cl-mc-ic">📁</div>
          <div class="cl-mc-t">Continuar</div>
          <div class="cl-mc-d">${contDesc}</div>
        </div>
      </div>`
  });
}
/* ================= PASSO 3 · NOVO JOGO — nome do save ================= */
function scSoloNovo(){
  const val=CL.save||''; const ok=val.trim().length>0;
  return wizShell({ step:3, title:'Novo jogo', back:'clSoloBackChoice()',
    contentCls:'cl-wiz-top', actionCls:'cl-wiz-action-e',
    action:`${btn('Começar','clModoOk()',{icon:'✔',cls:'cl-btn-ok cl-wiz-cta',dis:!ok})}`,
    body:`
      <div class="cl-wiz-form">
        <p class="cl-wiz-p">Dê um nome pra este jogo (até 8 letras/números). Ele fica salvo na sua conta, na nuvem.</p>
        <div class="cl-wiz-fieldhd">
          <label class="cl-wiz-label">Nome do jogo</label>
          <span class="cl-wiz-count">${val.length}/8</span>
        </div>
        <input id="cl-focus" class="cl-wiz-field" type="text" maxlength="8" placeholder="EX: SAVE01" value="${escC(val)}"
          oninput="CL.save=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'');this.value=CL.save;clSyncOk();clSyncCount()"
          onkeydown="if(event.key==='Enter')clModoOk()">
        <div class="cl-wiz-note">Só letras e números, sem espaços.</div>
      </div>`
  });
}
function clSyncCount(){ const el=document.querySelector('.cl-wiz-count'); if(el) el.textContent=(CL.save||'').length+'/8'; }
/* Continuar: lista de saves na nuvem (variante do passo 2) */
function scSoloCont(){
  const loading=CL.soloSaves==null; const saves=CL.soloSaves||[];
  let list;
  if(loading) list='<div class="cl-savempty">carregando seus jogos…</div>';
  else if(!saves.length) list='<div class="cl-savempty">Você ainda não tem jogos salvos. Comece um novo jogo!</div>';
  else list=saves.map(s=>`<div class="cl-myroom" onclick="clLoadSave('${escC(s.name)}')">
      <div class="cl-myroom-main">
        <div class="cl-myroom-name">${escC(s.name)}</div>
        <div class="cl-myroom-sub">${s.updated_at?('Salvo em '+new Date(s.updated_at).toLocaleDateString('pt-BR')):'Jogo salvo'}</div>
      </div>
      <button class="cl-myroom-del" title="Apagar jogo" onclick="event.stopPropagation();clDeleteSave('${escC(s.name)}')">🗑</button>
      <div class="cl-myroom-arrow">➜</div>
    </div>`).join('');
  return wizShell({ step:2, title:'Continuar jogo', back:'clSoloBackChoice()',
    contentCls:'cl-wiz-top', actionCls:'cl-wiz-action-c',
    action:`<span class="cl-wiz-hint">Toque num jogo pra continuar de onde parou.</span>`,
    body:`<div class="cl-wiz-form cl-wiz-form-wide"><div class="cl-myrooms-list">${list}</div></div>`
  });
}
/* apagar um jogo salvo (solo) — confirmação + delete na nuvem */
function clDeleteSave(name){
  overlayC(dlg('Apagar jogo?', `<div class="cl-res">
    <div class="cl-res-verd" style="text-align:center">Apagar o jogo salvo <b>${escC(name)}</b>? Esta ação não pode ser desfeita.</div>
    <div class="cl-cal-ok" style="display:flex;gap:10px;justify-content:center;margin-top:14px">
      ${btn('Cancelar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}
      ${btn('Apagar',`clDeleteSaveGo('${escC(name)}')`,{icon:'🗑',cls:'cl-btn-ok'})}
    </div></div>`,{w:440}));
}
function clDeleteSaveGo(name){
  clCloseOverlay(); toastC('Apagando jogo...');
  (async ()=>{
    const ok=(typeof NET!=='undefined'&&NET.deleteSoloSave)?await NET.deleteSoloSave(name):false;
    if(ok){ CL.soloSaves=(CL.soloSaves||[]).filter(s=>s.name!==name); toastC('Jogo apagado.'); cdraw(); }
    else toastC('⚠ Não foi possível apagar o jogo. Tente de novo.');
  })();
}
function clSoloNew(){ CL.soloStep='novo'; cdraw(); }
function clSoloContinue(){ CL.soloStep='cont'; cdraw(); }
function clSoloBackChoice(){ CL.soloStep='choice'; cdraw(); }
function clSyncOk(){ const b=document.querySelector('.cl-wiz-cta, .cl-btn-ok'); if(b) b.disabled = !((CL.save||'').trim().length>0); }
function clGoAbertura(){ CL.screen='abertura'; cdraw(); }
function clModoOk(){
  if(CL.mode==='cont'&&CL.contSel){ clLoadSave(CL.contSel); return; }
  if((CL.save||'').trim().length>0){ CL.mode='novo'; CL.compToggle={libertadores:true,copaBrasil:true,sulamericana:true};
    if(!CL.countries.size) CL.countries.add('Brasil'); // Brasil pré-selecionado (default)
    CL.screen='paises'; cdraw(); }
}

/* ================= 03 · SELECÇÃO DE PAÍSES ================= */
/* nº TOTAL de clubes jogáveis de um país = soma de todas as divisões do universo (1ª real +
   2ª criada), pra a tela mostrar o tamanho de verdade e o botão de iniciar liberar (mín. 20).
   País europeu só conta se os dados reais da 1ª divisão estiverem carregados (INTL_LEAGUES). */
function intlTeams(country){
  const uniKey = country==='Brasil' ? 'brasil' : country;
  const cfg=(typeof UNI_CONFIGS!=='undefined') && UNI_CONFIGS[uniKey];
  const total = (cfg&&cfg.size&&cfg.order) ? cfg.order.reduce((s,d)=>s+(cfg.size[d]||0),0) : 0;
  if(country==='Brasil') return total||80;
  const l=((typeof window!=='undefined'&&window.INTL_LEAGUES||{})[country]) || ((typeof window!=='undefined'&&window.CONMEBOL_LEAGUES||{})[country]);
  if(!l || !l.length) return 0; // sem dados reais carregados -> país não jogável
  return total || l.length;
}
/* lista de países da tela — Brasil sempre jogável; europeus ficam clicáveis quando têm
   clubes reais carregados. Função (não const) pra refletir os dados carregados. */
function COUNTRY_LIST(){ const row=n=>({f:flagImg(n),n,teams:intlTeams(n),on:intlTeams(n)>0}); return [
  {f:flagImg('Brasil'),n:'Brasil',teams:intlTeams('Brasil'),on:true},
  // CONMEBOL (América do Sul) — ligas reais jogáveis
  row('Argentina'), row('Uruguai'), row('Colômbia'), row('Chile'), row('Peru'),
  row('Equador'), row('Paraguai'), row('Venezuela'), row('Bolívia'),
  // Europa
  row('Alemanha'), row('Espanha'), {f:flagImg('França'),n:'França',teams:intlTeams('França'),on:intlTeams('França')>0},
  row('Itália'), row('Portugal'), row('Inglaterra'),
]; }
function scPaises(){
  const rows=COUNTRY_LIST().map(c=>{const sel=CL.countries.has(c.n);
    return `<div class="cl-ctry ${sel?'sel':''} ${c.on?'':'off'}" ${c.on?`onclick="clToggleCountry('${c.n}')"`:''}>
      <span class="cl-flag">${c.f}</span><span class="cl-ctry-n">${c.n}</span>
      <span class="cl-ctry-t">${c.teams} ${c.teams===1?'clube':'clubes'}</span></div>`;}).join('');
  const teamsSel=[...CL.countries].reduce((s,n)=>{const c=COUNTRY_LIST().find(x=>x.n===n);return s+(c?c.teams:0);},0);
  const okDis=teamsSel<8; // uma liga viável (a menor CONMEBOL, Paraguai, tem 9 clubes)
  const totalTeams=COUNTRY_LIST().reduce((s,c)=>s+c.teams,0);
  // uma seção de competições por país SELECIONADO (ligas + copas), no estilo do Brasil
  const selCountries = COUNTRY_LIST().filter(c=>CL.countries.has(c.n)).map(c=>c.n);
  const compCol = selCountries.map(countryCompSection).join('');
  const compHelp = selCountries.length
    ? '<div class="cl-wiz-comphelp">Todas as ligas e copas de cada país selecionado entram no seu save.</div>'
    : '<div class="cl-wiz-comphelp">Selecione países à esquerda para ver as competições disponíveis.</div>';
  return wizShell({ step:4, title:'Selecção de Países', back:'clPaisesBack()',
    contentCls:'cl-wiz-paises', actionCls:'',
    action:`
      ${btn('Todas','clAllCountries()',{icon:'▤',cls:'cl-btn-row'})}
      <div class="cl-wiz-action-e">
        ${btn('Cancelar','clPaisesBack()',{icon:'✖',cls:'cl-btn-cancel cl-btn-row'})}
        ${btn('OK','clPaisesOk()',{icon:'✔',cls:'cl-btn-ok cl-wiz-cta',dis:okDis})}
      </div>`,
    body:`
      <div class="cl-wiz-chips">
        <span class="cl-wiz-chip on"><span>Clubes</span><b>${teamsSel}</b><span class="cl-wiz-chip-tot">de ${totalTeams}</span></span>
        <span class="cl-wiz-chip on"><span>Países</span><b>${CL.countries.size}</b><span class="cl-wiz-chip-tot">de ${COUNTRY_LIST().length}</span></span>
        <span class="cl-wiz-chips-note">Totalize pelo menos 8 clubes.</span>
      </div>
      <div class="cl-wiz-paisescols">
        <div class="cl-wiz-col cl-wiz-col-paises">
          <div class="cl-wiz-collabel">Países</div>
          <div class="cl-ctry-list cl-wiz-clist">${rows}</div>
        </div>
        <div class="cl-wiz-col cl-wiz-col-comp">
          <div class="cl-wiz-collabel">Competições</div>
          ${compCol}
          ${compHelp}
        </div>
      </div>`
  });
}
function clPaisesBack(){ CL.screen='modosolo'; CL.soloStep='novo'; cdraw(); }
/* competições de UM país selecionado (divisões + copas), no mesmo visual do Brasil.
   Brasil: Séries A–D + Copa do Brasil/Libertadores/Sul-Americana (ligáveis por CL.compToggle).
   Países europeus: 1ª/2ª divisão + Champions League/Europa League (inclusas com o país).
   'início' vai na divisão de baixo (onde a jornada começa se você jogar esse país). */
function countryCompSection(country){
  const uniKey = country==='Brasil' ? 'brasil' : country;
  const cfg = (typeof UNI_CONFIGS!=='undefined') && UNI_CONFIGS[uniKey];
  if(!cfg || !cfg.order) return '';
  const isBr = country==='Brasil';
  const order = cfg.order, startDiv = order[order.length-1];
  const openKey = 'compOpen_'+uniKey.replace(/[^a-z0-9]/gi,'');
  const open = CL[openKey]!==false;
  const divBadges = order.map(d=>{
    const label=(cfg.label&&cfg.label[d])||d;
    const ic = (isBr && divisionTrophyImg(d,26)) || '<span class="cl-divopt-ic">🏆</span>';
    const start = d===startDiv;
    return `<div class="cl-comp-toggle on ${start?'start':''}" style="cursor:default">${ic}<b>${escC(label)}</b>${start?'<span class="cl-comp-start-tag">início</span>':''}</div>`;
  }).join('');
  // toda competição do país entra sempre no save — badges informativos (✔), sem liga/desliga
  const cupBadge=(label,tk)=>`<div class="cl-comp-toggle on" style="cursor:default">${(tk&&trophyImg(tk,26))||'<span class="cl-divopt-ic">🏆</span>'}<b>${escC(label)}</b><span class="cl-comp-check">✔</span></div>`;
  const cupBadges = isBr
    ? cupBadge('Libertadores','libertadores')+cupBadge('Sul-Americana','sulamericana')+cupBadge('Copa do Brasil','copaBrasil')
    : cfg.src==='conmebol'
      ? cupBadge('Libertadores','libertadores')+cupBadge('Sul-Americana','sulamericana')
      : cupBadge('Champions League')+cupBadge('Europa League');
  return `<div class="cl-paises-divisao">
    <div class="cl-paises-sec-title cl-acc-hd" onclick="clToggleAcc('${openKey}')">
      <span class="cl-comp-country">${flagImg(country)} ${escC(country)}</span>
      <span class="cl-acc-arrow ${open?'':'closed'}">▾</span></div>
    <div class="cl-acc-body ${open?'':'closed'}">
      <div class="cl-comp-grouplbl">Ligas</div>
      <div class="cl-divopt-row">${divBadges}</div>
      <div class="cl-comp-grouplbl">Copas e continentais</div>
      <div class="cl-divopt-row">${cupBadges}</div>
    </div>
  </div>`;
}
/* multi-seleção: qual(is) divisões do Brasil entram nesse save. Não deixa desmarcar
   a última (precisa sobrar pelo menos uma pra começar o jogo). */
function clToggleDivision(d){
  const checkedCount=Object.values(CL.divisionToggle).filter(Boolean).length;
  if(CL.divisionToggle[d] && checkedCount<=1){ toastC('Precisa deixar pelo menos uma divisão marcada.'); return; }
  CL.divisionToggle[d]=!CL.divisionToggle[d]; cdraw();
}
/* divisão em que o save realmente começa: a mais alta marcada (A > B > C > D) */
function computeStartDivision(){
  // no clássico, todo mundo começa na Série D e vai subindo — não é mais escolha do usuário
  return 'D';
}
function divisionShortLabel(d){ return (typeof DIV_LABEL_FULL!=='undefined'&&DIV_LABEL_FULL[d]) || ({A:'Série A',B:'Série B',C:'Série C',D:'Série D'})[d] || 'Série A'; }
/* flag + nome do país do universo ativo (Brasil/Inglaterra/Espanha...) — usado no cabeçalho */
/* bandeira/nome do universo ATIVO no cabeçalho do clube do usuário. Fonte de verdade:
   universeCountryInfo()/activeUniverseKey() (core.js), que leem S.intlUniverse — NÃO o
   antigo S.universe, que nunca era gravado e deixava tudo como Brasil. */
function universeFlag(){ return (typeof universeCountryInfo==='function'?universeCountryInfo():{flag:flagImg('Brasil')}).flag; }
function universeCountryName(){ return (typeof universeCountryInfo==='function'?universeCountryInfo():{name:'Brasil'}).name; }
function clToggleComp(key){ CL.compToggle[key]=!CL.compToggle[key]; cdraw(); }
function clToggleCountry(n){ if(CL.countries.has(n))CL.countries.delete(n); else CL.countries.add(n); cdraw(); }
function clAllCountries(){ COUNTRY_LIST().forEach(c=>{ if(c.on)CL.countries.add(c.n); }); cdraw(); }
/* chave de universo de um país selecionável (Brasil = pirâmide A/B/C/D; europeus = UNI_CONFIGS) */
function countryUniverseKey(country){ if(country==='Brasil') return 'brasil'; return (typeof UNI_CONFIGS!=='undefined'&&UNI_CONFIGS[country])?country:null; }
/* países selecionados que têm liga jogável de verdade (têm clubes carregados) */
function selectedPlayableCountries(){ return [...CL.countries].filter(c=>countryUniverseKey(c) && (c==='Brasil'||intlTeams(c)>0)); }
function clPaisesOk(){
  const playable=selectedPlayableCountries();
  if(playable.length>1){
    // 2+ países: usuário precisa escolher em qual terá time jogável (os outros rodam no background)
    if(!CL.playCountry || playable.indexOf(CL.playCountry)<0) CL.playCountry=playable[0];
    CL.screen='paisJogavel';
  } else {
    CL.playCountry=playable[0]||'Brasil';
    CL.screen='moeda';
  }
  cdraw();
}
/* ================= 03b · PAÍS JOGÁVEL (só quando 2+ países selecionados) ================= */
const COUNTRY_FLAG={Brasil:flagImg('Brasil'),Argentina:flagImg('Argentina'),Uruguai:flagImg('Uruguai'),'Colômbia':flagImg('Colômbia'),Chile:flagImg('Chile'),Peru:flagImg('Peru'),Equador:flagImg('Equador'),Paraguai:flagImg('Paraguai'),Venezuela:flagImg('Venezuela'),'Bolívia':flagImg('Bolívia'),Alemanha:flagImg('Alemanha'),Espanha:flagImg('Espanha'),'França':flagImg('França'),'Itália':flagImg('Itália'),Portugal:flagImg('Portugal'),Inglaterra:flagImg('Inglaterra')};
function scPaisJogavel(){
  const playable=selectedPlayableCountries();
  const rows=playable.map(c=>{
    const sel=CL.playCountry===c;
    const teams=intlTeams(c)|| (c==='Brasil'?20:0);
    return `<div class="cl-ctry ${sel?'sel':''}" onclick="CL.playCountry='${c}';cdraw()">
      <span class="cl-flag">${flagImg(c)}</span><span class="cl-ctry-n">${escC(c)}</span>
      <span class="cl-ctry-t">${sel?'✔ seu time':`${teams} equipas`}</span></div>`;
  }).join('');
  const others=playable.filter(c=>c!==CL.playCountry);
  return dlg('Onde você vai treinar?', `
    <div class="cl-paises">
      <div class="cl-ctry-list">${rows}</div>
      <div class="cl-paises-side">
        <div class="cl-side-btns">${btn('OK','clPaisJogavelOk()',{icon:'✔',cls:'cl-btn-ok'})}${btn('Voltar','clGoPaises()',{icon:'↩',cls:'cl-btn-cancel'})}</div>
        <div class="cl-instr">Escolha o país onde você vai comandar um clube. ${others.length?`As outras ligas (${others.map(escC).join(', ')}) rodam sozinhas no background — dá pra acompanhar tabelas, artilheiros e campeões no menu <b>Campeonatos</b>, e negociar jogadores com elas.`:''}</div>
      </div>
    </div>`, {w:900,bodyClass:'cl-body-green'});
}
function clGoPaises(){ CL.screen='paises'; cdraw(); }
function clPaisJogavelOk(){ CL.screen='moeda'; cdraw(); }

/* ================= SETUP DO JOGO (redesign handoff_setup_jogo) — wizShell 1/4..4/4 =================
   Dinheiro (1/4) → Jogadores (2/4) → Escolha os clubes (3/4) → A iniciar o jogo (loading).
   Só markup/estilo/navegação; a lógica (nomes, moeda, sorteio, montagem do jogo) é a mesma. */
/* ---- 1/4 · DINHEIRO (moeda) ---- */
function scMoeda(){
  const cur=CL.currency||'Reais';
  const body=`<div class="cl-wiz-form">
    <label class="cl-wiz-label" style="display:block;margin-bottom:8px">Com que moeda vai querer jogar?</label>
    <select class="cl-bigsel" onchange="CL.currency=this.value">
      <option ${cur==='Reais'?'selected':''}>Reais</option>
      <option ${cur==='Dólares'?'selected':''}>Dólares</option>
      <option ${cur==='Euros'?'selected':''}>Euros</option>
    </select>
    <div class="cl-wiz-note">A moeda vale pra toda a Resenha — todo mundo negocia jogadores e vê as finanças nela.</div>
  </div>`;
  return wizShell({ step:1, title:'Dinheiro', back:'clMoedaBack()', backLabel:'Voltar',
    contentCls:'cl-wiz-top', body, actionCls:'cl-wiz-action-e',
    action: btn('OK','clMoedaOk()',{icon:'✔',cls:'cl-wiz-cta'}) });
}
function clMoedaBack(){ CL.screen = selectedPlayableCountries().length>1 ? 'paisJogavel' : 'paises'; cdraw(); }
function clMoedaOk(){ CL.screen='jogadores'; cdraw(); }
function clGoMoeda(){ CL.screen='moeda'; cdraw(); }

/* ---- 4/4 · A INICIAR O JOGO (loading + barra de progresso) ---- */
function scLoading(){
  const body=`<div class="cl-progwrap">
    <div class="cl-progtitle">A iniciar o jogo…</div>
    <div class="cl-progtrack"><div id="cl-load-fill" class="cl-progfill" style="width:0%"></div><div id="cl-load-pct" class="cl-progpct">0%</div></div>
    <div class="cl-wiz-note" style="text-align:center;margin-top:10px">Montando tabelas, elencos e calendário da temporada.</div>
  </div>`;
  return wizShell({ noHeader:true, contentCls:'cl-wiz-center', body });
}
function runLoading(){ let p=0; const t=setInterval(()=>{ p+=Math.floor(8+Math.random()*14); if(p>=100)p=100;
  const f=$c('#cl-load-fill'), pc=$c('#cl-load-pct'); if(f)f.style.width=p+'%'; if(pc)pc.textContent=p+'%';
  if(p>=100){ clearInterval(t); setTimeout(()=>{
    if(CL._pendingLaunch){ const fn=CL._pendingLaunch; CL._pendingLaunch=null; fn(); } // clubes -> loading -> lança o jogo
    else { CL.screen='jogadores'; cdraw(); }
  },350); } }, 180); }

/* ---- 2/4 · JOGADORES (nomes) ---- */
function scJogadores(){
  const rows=[0,1,2,3,4,5].map(i=>`<div class="cl-prow">
      <span class="cl-plabel">Jogador ${i+1}</span>
      <input class="cl-pinput ${i===0?'cur':''}" ${i===0?'id="cl-focus"':''} maxlength="12" placeholder="${i===0?'LEANDRO':''}" value="${escC(CL.names[i])}" oninput="CL.names[${i}]=this.value.toUpperCase();this.value=CL.names[${i}]">
      <span class="cl-pteam">${i===0?'(você)':''}</span>
    </div>`).join('');
  const body=`<div class="cl-wiz-form-wide">
    <div class="cl-prow cl-prow-head"><span></span><span class="cl-wiz-collabel">Nome</span><span class="cl-wiz-collabel">Equipa</span></div>
    ${rows}
    <div class="cl-wiz-note">Preencha o nome de cada treinador. Os vazios ficam com a CPU.</div>
  </div>`;
  return wizShell({ step:2, title:'Jogadores', back:'clGoMoeda()', backLabel:'Voltar',
    contentCls:'cl-wiz-top', body, actionCls:'cl-wiz-action-e',
    action: btn('Escolher clubes','clEscolherClubes()',{icon:'›',cls:'cl-wiz-cta'}) });
}
/* clubes reais dos países europeus selecionados (união de todas as ligas escolhidas) */
function intlSelectedClubs(){
  const out=[]; const seen=new Set();
  [...CL.countries].forEach(country=>{
    const clubs=(typeof window!=='undefined'&&window.INTL_LEAGUES||{})[country];
    if(clubs) clubs.forEach(c=>{ if(!seen.has(c.id)){ seen.add(c.id); out.push(c); } });
  });
  return out;
}
/* algum país europeu (com dado real) selecionado? */
function hasIntlSelection(){
  return [...CL.countries].some(n=>n!=='Brasil' && intlTeams(n)>0);
}
/* país europeu ÚNICO selecionado que tem sistema de divisões próprio (UNI_CONFIGS).
   Só nesse caso ligamos o universo com pirâmide/promoção (ex.: Inglaterra PL/CH) ou
   divisão única com classificação continental (Espanha/Itália/Alemanha/Portugal). */
function intlSingleUniverseCountry(){
  const sel=[...CL.countries];
  if(sel.length!==1) return null;
  const c=sel[0];
  if(c==='Brasil') return null;
  return (typeof UNI_CONFIGS!=='undefined' && UNI_CONFIGS[c] && intlTeams(c)>0) ? c : null;
}
function clSortear(){
  const names=CL.names.map(n=>(n||'').trim()).filter(Boolean);
  if(!names.length){ CL.names[0]='JOGADOR'; return cdraw(); }
  // universo jogável = país escolhido (CL.playCountry). NUNCA misturamos países numa liga:
  // os demais países selecionados rodam sozinhos no background (ver S.bgCountries).
  const uni = CL.playCountry || (selectedPlayableCountries()[0]) || 'Brasil';
  (async ()=>{
    if(uni==='Brasil'){
      setUniverse('brasil'); CL.intlUniverse=false;
      const startDivision=computeStartDivision();
      if(startDivision!=='A'){
        if(typeof NET!=='undefined' && NET.getDivisionClubs && NET.authStatus && NET.authStatus().loggedIn){
          toastC('Carregando times da Série '+startDivision+'...');
          try{ await loadRealDivisionClubs(startDivision); }catch(e){ console.warn('divisão real indisponível, usando fallback procedural:',e); }
        }
        DATA.clubs = clubsForDivision(startDivision);
      } else {
        DATA.clubs = DATA.clubsSerieA || DATA.clubs;
      }
    } else {
      // universo europeu: liga própria; começa na ÚLTIMA divisão (começa embaixo e sobe).
      setUniverse(uni); CL.intlUniverse=uni;
      const startDiv=DIV_ORDER[DIV_ORDER.length-1];
      // fonte única: tenta o Supabase (division_clubs) igual ao Brasil; fallback = bundle INTL_LEAGUES
      if(typeof NET!=='undefined' && NET.getDivisionClubs && NET.authStatus && NET.authStatus().loggedIn){
        try{ await loadRealDivisionClubs(startDiv); }catch(e){ console.warn('liga real indisponível, usando bundle:',e); }
      }
      DATA.clubs = clubsForDivision(startDiv).slice();
    }
    // demais países selecionados = ligas de background (visíveis em Campeonatos, mercado)
    CL.bgCountries = selectedPlayableCountries().filter(c=>c!==uni);
    const pool=DATA.clubs.map(c=>c.id); const seed=(Math.random()*1e9)>>>0; const rnd=rngFrom(seed);
    // embaralha e distribui clubes distintos
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    CL.draw=names.map((nm,i)=>({name:nm, clubId:pool[i]}));
    CL.screen='sorteio'; cdraw();
  })().catch(err=>{
    console.error('Erro no sorteio:', err);
    toastC('⚠ Erro ao preparar o sorteio: '+(err&&err.message||'desconhecido'));
  });
}

/* ================= 07 · SORTEIO (nomes + clubes em cores) ================= */
function scSorteio(){
  const rows=[0,1,2,3,4,5].map(i=>{const d=CL.draw[i]; const c=d?clubOf(d.clubId):null;
    return `<div class="cl-jrow"><span class="cl-jlbl">Jogador ${i+1}</span>
      <span class="cl-jname">${d?escC(d.name):''}</span>
      <span class="cl-jteam" style="${c?clubStripe(c):''}">${c?escC(c.short):''}</span></div>`;}).join('');
  return dlg('Jogadores', `
    <div class="cl-jog">
      <div class="cl-jog-head"><span class="cl-jh-n">Nome</span><span class="cl-jh-e2">Equipa</span></div>
      ${rows}
      <div class="cl-jog-actions">${btn('Fechar','clEntrar()',{cls:'cl-btn-wide'})}</div>
    </div>`, {w:820,bodyClass:'cl-body-gray',min:true});
}
function clEntrar(){
  CL.clubId=CL.draw[0].clubId; CL.mgr=CL.draw[0].name;
  // universo: país europeu = liga própria (começa na ÚLTIMA divisão, ex.: Championship);
  // false = Brasil. Copas brasileiras só no universo Brasil.
  const isIntl = !!CL.intlUniverse;
  const startDiv = isIntl ? DIV_ORDER[DIV_ORDER.length-1] : computeStartDivision();
  const comps = isIntl ? {libertadores:false,copaBrasil:false,sulamericana:false} : CL.compToggle;
  newGame(CL.clubId, startDiv, comps); S.xi=autoXI(CL.clubId);
  S.intlUniverse = CL.intlUniverse; // false | país (ex.: 'Inglaterra')
  S.bgCountries = (CL.bgCountries||[]).slice(); // outros países selecionados: ligas de background
  initBgLeagues(); // materializa as ligas de background pra simular/visualizar/negociar
  if(!S.stadium){ const ov=(clubOf(CL.clubId)||{}).overall||70;
    const cap=(typeof REBAL!=='undefined' && REBAL.stadiumCapForDivision) ? REBAL.stadiumCapForDivision(S.division) : realStadiumCapacity(ov);
    S.stadium={capacity:cap, builtThisSeason:0}; CL.ticket=levelTicketPrice(ov); }
  CL.formation=null; CL.tacticChosen=false;   // precisa escolher tática no menu p/ liberar "Jogar"
  S.coachHistory=[{season:S.season, type:'contratado', text:`Contratado pelo ${clubOf(CL.clubId).short.toUpperCase()}`}];
  CL.speedMult=1;  // 1.0x, 1.5x, 2x, 3x (só anfitrião no modo Resenha pode mudar)
  // modo solo de verdade: garante que nada do modo online "vaza" pra cá (ex: se o usuário
  // tinha entrado numa sala online antes, na mesma aba, CL.online ficava travado em true e
  // liveDone() chamava NET.start() sozinho, avançando a rodada seguinte sem o usuário pedir)
  CL.online=false;
  if(typeof NET!=='undefined'){ NET.isHost=false; NET.gameId=null; NET.onState=null; }
  CL.humans={}; CL.draw.forEach(d=>CL.humans[d.clubId]=d.name);
  CL.screen='main'; CL.tab='jogo'; CL.selPlayer=squad(CL.clubId)[0]?.n||null;
  saveV3();
  cdraw();
  checkPendingCupDraws(()=>{}); // mostra o sorteio da Copa do Brasil já no início do save, se houver
}

/* ================= FASE 1 · ESCOLHA DE CLUBES POR MANAGER (multi-país) =================
   Cada manager escolhe país + clube (livre). O clube do manager 1 é o que VOCÊ comanda
   ao vivo (universo primário) hoje; os demais ficam registrados como humanos nas suas
   ligas. A Fase 2 torna cada um jogável de verdade a cada rodada sincronizada. */
function startClubsForCountry(country){
  const uniKey = country==='Brasil' ? 'brasil' : country;
  setUniverse(uniKey);
  const div = country==='Brasil' ? computeStartDivision() : DIV_ORDER[DIV_ORDER.length-1];
  return clubsForDivision(div).slice();
}
function buildPickPool(){
  const pool={};
  selectedPlayableCountries().forEach(c=>{ pool[c]=startClubsForCountry(c).map(x=>({id:x.id,short:x.short,name:x.name})); });
  setUniverse('brasil'); // reset — clConfirmarClubes/clEntrar seta o universo certo depois
  return pool;
}
function clEscolherClubes(){
  const names=CL.names.map(n=>(n||'').trim()).filter(Boolean);
  if(!names.length){ CL.names[0]='JOGADOR'; return cdraw(); }
  toastC('Carregando clubes...');
  (async ()=>{
    // pré-carrega do Supabase a divisão inicial de CADA país jogável (Brasil B/C/D E Europa),
    // pra o pick pool já usar os clubes reais; fallback = bundle/procedural.
    if(typeof NET!=='undefined' && NET.getDivisionClubs && NET.authStatus && NET.authStatus().loggedIn){
      for(const c of selectedPlayableCountries()){
        const uk=c==='Brasil'?'brasil':c; const cfg=UNI_CONFIGS[uk]; if(!cfg) continue;
        const sd = c==='Brasil' ? computeStartDivision() : cfg.order[cfg.order.length-1];
        if(c==='Brasil' && sd==='A') continue; // Série A vem do bundle
        try{ await loadRealDivisionClubs(sd); }catch(e){}
      }
    }
    CL._pickPool = buildPickPool();
    const countries = selectedPlayableCountries();
    CL.pick = names.map(nm=>({ name:nm, country:countries[0]||'Brasil', clubId:null }));
    CL.screen='escolhaclubes'; cdraw();
  })().catch(err=>{ console.error(err); toastC('⚠ Erro ao carregar clubes.'); });
}
/* ---- 3/4 · ESCOLHA OS CLUBES ---- */
function scEscolhaClubes(){
  const countries=selectedPlayableCountries();
  // SORTEIO OBRIGATÓRIO em todos os modos: cada jogador só escolhe o país; o clube é sempre
  // sorteado (nunca escolhido). Antes, com 1 jogador, ele escolhia o próprio clube.
  const multi=true;
  const taken=new Set((CL.pick||[]).filter(p=>p.clubId).map(p=>p.clubId));
  const rows=(CL.pick||[]).map((p,i)=>{
    const countrySel=countries.map(c=>`<option value="${escC(c)}" ${p.country===c?'selected':''}>${escC(c)}</option>`).join('');
    const countryCell=`<select class="cl-navysel" onchange="clPickCountry(${i},this.value)">${countrySel}</select>`;
    const nameCell=`<span class="cl-plabel">${escC(p.name)}${i===0?' <span class="cl-pick-you">(você)</span>':''}</span>`;
    if(multi){
      return `<div class="cl-crow nocl">${nameCell}${countryCell}</div>`;
    }
    const clubs=((CL._pickPool||{})[p.country]||[]).filter(c=>!taken.has(c.id)||c.id===p.clubId).sort((a,b)=>a.short.localeCompare(b.short));
    const clubSel=`<option value="">— escolha —</option>`+clubs.map(c=>`<option value="${escC(c.id)}" ${p.clubId===c.id?'selected':''}>${escC(c.short)}</option>`).join('');
    return `<div class="cl-crow">${nameCell}${countryCell}
      <select class="cl-navysel" onchange="clPickClub(${i},this.value)">${clubSel}</select></div>`;
  }).join('');
  const allChosen=(CL.pick||[]).length>0 && CL.pick.every(p=>p.clubId);
  const head=multi
    ? `<div class="cl-crow nocl cl-crow-head"><span class="cl-wiz-collabel">Jogador</span><span class="cl-wiz-collabel">País</span></div>`
    : `<div class="cl-crow cl-crow-head"><span class="cl-wiz-collabel">Jogador</span><span class="cl-wiz-collabel">País</span><span class="cl-wiz-collabel">Clube</span></div>`;
  const instr=multi
    ? `Cada jogador escolhe seu país. Os times são <b>sorteados</b>. ${countries.length>1?'Podem estar em países diferentes.':''}`
    : `Cada jogador escolhe seu país e um clube livre.`;
  const action=multi
    ? `<span class="cl-wiz-back-sp"></span><div class="cl-wiz-actbtns">${btn('Voltar','clGoJogadores()',{icon:'↩',cls:'cl-btn'})}${btn('Sortear e começar','clSortearStart()',{icon:'🎲',cls:'cl-wiz-cta'})}</div>`
    : `${btn('Sortear','clSortearPick()',{icon:'🎲',cls:'cl-btn'})}<div class="cl-wiz-actbtns">${btn('Voltar','clGoJogadores()',{icon:'↩',cls:'cl-btn'})}${btn('Começar','clStartGame()',{icon:'✔',cls:'cl-wiz-cta',dis:!allChosen})}</div>`;
  const body=`<div class="cl-wiz-clubes">
    ${head}
    ${rows}
    <div class="cl-wiz-note">${instr}</div>
  </div>`;
  return wizShell({ step:3, title:'Escolha os clubes', back:'clGoJogadores()', backLabel:'Voltar',
    contentCls:'cl-wiz-top', body, action });
}
/* atribui aleatoriamente um clube livre a cada manager (respeita o país escolhido) */
function _assignRandomClubs(){
  const taken=new Set();
  (CL.pick||[]).forEach(p=>{ const pool=((CL._pickPool||{})[p.country]||[]).filter(c=>!taken.has(c.id));
    if(pool.length){ const pk=pool[Math.floor(Math.random()*pool.length)]; p.clubId=pk.id; taken.add(pk.id); } });
}
function clSortearPick(){ _assignRandomClubs(); cdraw(); }
/* clubes -> loading (4/4) -> lança o jogo. Começar (1 jogador, clubes escolhidos) */
function clStartGame(){ if(!(CL.pick||[]).every(p=>p.clubId)) return; CL._pendingLaunch=clConfirmarClubes; CL.screen='loading'; cdraw(); }
/* multi-jogador: sorteia os times, passa pelo loading e começa */
function clSortearStart(){ _assignRandomClubs(); CL._pendingLaunch=clConfirmarClubes; CL.screen='loading'; cdraw(); }
function clPickCountry(i,c){ if(!CL.pick[i])return; CL.pick[i].country=c; CL.pick[i].clubId=null; cdraw(); }
function clPickClub(i,id){ if(!CL.pick[i])return; CL.pick[i].clubId=id||null; cdraw(); }
function clGoJogadores(){ CL.screen='jogadores'; cdraw(); }
function clConfirmarClubes(){
  if(!(CL.pick||[]).every(p=>p.clubId)) return;
  CL.draw=CL.pick.map(p=>({name:p.name, clubId:p.clubId, country:p.country}));
  // FASE 2: o assento PRIMÁRIO (universo completo, com copas) tem que ser um manager do Brasil
  // se houver algum — o Brasil não é suportado como liga de background, então precisa ser o
  // universo-base; os demais países viram ligas de fundo (já suportadas). Cobre o caso
  // "Flamengo + Inter + Bayern + City": Flamengo comanda o universo, o resto joga no fundo.
  const bi=CL.draw.findIndex(d=>d.country==='Brasil');
  if(bi>0){ const [b]=CL.draw.splice(bi,1); CL.draw.unshift(b); }
  const uni=CL.draw[0].country;
  CL.playCountry=uni;
  if(uni==='Brasil'){ setUniverse('brasil'); CL.intlUniverse=false; DATA.clubs=clubsForDivision(computeStartDivision()); }
  else { setUniverse(uni); CL.intlUniverse=uni; DATA.clubs=clubsForDivision(DIV_ORDER[DIV_ORDER.length-1]).slice(); }
  CL.bgCountries=selectedPlayableCountries().filter(c=>c!==uni);
  clEntrar();
}

/* ================= FASE 2 · HOTSEAT MULTI-HUMANO (rodadas sincronizadas 1 a 1) =================
   Cada humano (além do manager 1) joga a SUA partida ao vivo a cada rodada, passando o
   aparelho. Humanos no país primário jogam na divisão do usuário; humanos de outros países
   jogam na liga de fundo daquele país (clube materializado com elenco real). Os resultados
   entram nas tabelas certas via playRound()/advanceBgLeagues(). Nada disso roda quando só
   existe 1 humano — o caminho de 1 país fica idêntico. */
function primaryCountry(){ return S.intlUniverse || 'Brasil'; }
/* país (universo) onde o clube de um assento joga: primário (tabela do usuário / outras
   divisões do universo) ou uma liga de background. */
function seatCountryOfClub(cid){
  if(S.table && S.table[cid]) return primaryCountry();
  if(S.otherDivs){ for(const d in S.otherDivs){ const od=S.otherDivs[d]; if(od.clubs && od.clubs.find(x=>x.id===cid)) return primaryCountry(); } }
  const bg=S.bgLeagues||{}; for(const c in bg){ for(const d in bg[c].divs){ if((bg[c].divs[d].clubIds||[]).indexOf(cid)>=0) return c; } }
  return primaryCountry();
}
/* assentos humanos que NÃO são o manager 1 (o que este aparelho comanda por padrão) */
function secondaryHumanSeats(){
  const out=[]; const H=CL.humans||{};
  Object.keys(H).forEach(cid=>{ if(cid===String(CL.clubId)) return;
    out.push({ clubId:cid, name:H[cid], country:seatCountryOfClub(cid) }); });
  return out;
}
function hasSecondaryHumans(){ return !CL.online && secondaryHumanSeats().length>0; }
/* localiza a partida de um assento humano NESTA rodada. Retorna {kind,country,div,home,away,seed}
   ou null (folga / divisão não hand-jogável nesta fase). */
function secondaryHumanFixtureThisRound(cid){
  const country=seatCountryOfClub(cid);
  if(country===primaryCountry()){
    if(S.table && S.table[cid]){ // divisão do usuário
      const fx=(S.sched[S.round]||[]).find(([h,a])=>h===cid||a===cid);
      if(!fx || fx[0]==null || fx[1]==null) return null;
      return { kind:'primary', country, div:S.division, home:fx[0], away:fx[1], seed:matchSeed(fx[0],fx[1]) };
    }
    return null; // humano numa OUTRA divisão do universo primário: auto nesta fase (raro; só após temporadas)
  }
  const L=(S.bgLeagues||{})[country]; if(!L) return null;
  for(const d in L.divs){ const dd=L.divs[d]; if((dd.clubIds||[]).indexOf(cid)<0) continue;
    if(!dd.sched.length) return null;
    const fx=(dd.sched[S.round % dd.sched.length]||[]).find(p=>p[0]===cid||p[1]===cid);
    if(!fx || fx[0]==null || fx[1]==null) return null; // folga
    return { kind:'bg', country, div:d, home:fx[0], away:fx[1], seed:hashSeed(S.seed,'bghuman',country,d,S.round,fx[0],fx[1]) };
  }
  return null;
}
/* fila de partidas hotseat desta rodada (dedup: uma mesma partida entre dois humanos, ou a
   do manager 1, entra só uma vez). */
function buildHumanQueue(uf){
  const seen={}; if(uf) seen[uf[0]+'-'+uf[1]]=1;
  const q=[];
  secondaryHumanSeats().forEach(seat=>{
    const fx=secondaryHumanFixtureThisRound(seat.clubId); if(!fx) return;
    const k=fx.home+'-'+fx.away; if(seen[k]) return; seen[k]=1;
    q.push({ seat, fx });
  });
  return q;
}
/* mostra a tela de "passe o aparelho" pro próximo humano, ou commita a rodada se a fila acabou */
function startNextHotseatMatch(){
  const H=CL._hotseat; if(!H) return;
  if(!H.queue.length){
    CL._postRoundSeats=(H.playedSeats||[]).slice(); // rotação de classificação de pós-jogo
    _commitLeagueRound(H.primaryRL, H.userResult, H.humanResults, H.allEvents, H.audit);
    CL._hotseat=null; CL._handoff=null;
    return;
  }
  CL._handoff=H.queue[0];
  CL.screen='handoff'; cdraw();
}
/* do handoff "Continuar": entra no contexto do assento e mostra a TELA DO TIME dele
   (elenco + tática + classificação), igual ao manager 1 — daí ele escolhe a tática e joga. */
function clPlayHotseatMatch(){
  const H=CL._hotseat, item=CL._handoff; if(!H||!item) return;
  H.queue=H.queue.slice(1); CL._handoff=null;
  H.playedSeats=(H.playedSeats||[]).concat(item.seat); // pra rotação de classificação pós-rodada
  enterSeatContext(item.seat, item.fx);
  CL.screen='seatturn'; cdraw();
}
/* troca o contexto de "quem eu comando" (engine+UI) pro clube do assento — assim rosterHTML/
   panSeleccao/clJogar/clSelFormation e a partida ao vivo operam sobre o assento. Guarda o
   contexto do manager 1 pra restaurar depois (exitSeatContext). A escolha de tática de cada
   assento persiste entre rodadas em CL.seatStore (igual à do manager, que persiste em S). */
function enterSeatContext(seat, fx){
  const H=CL._hotseat;
  ensureBgClubMaterialized(fx.home); ensureBgClubMaterialized(fx.away);
  H._prev={ clubId:S.clubId, xi:(S.xi||[]).slice(), tactic:S.tactic, formation:CL.formation,
    tacticChosen:CL.tacticChosen, selPlayer:CL.selPlayer, escalacaoMode:CL.escalacaoMode, tab:CL.tab };
  CL._seatContext={ seat, fx };
  const st=(CL.seatStore&&CL.seatStore[seat.clubId])||null;
  S.clubId=seat.clubId; CL.clubId=seat.clubId;
  if(st){ S.xi=(st.xi||[]).slice(); CL.formation=st.formation; S.tactic=st.tactic||'equilibrado'; CL.tacticChosen=true; }
  else { S.xi=autoXI(seat.clubId); CL.formation=null; S.tactic='equilibrado'; CL.tacticChosen=false; }
  fixUserXIAvailability();
  CL.selPlayer=squad(seat.clubId)[0]?.n||null; CL.escalacaoMode=false; CL.tab='seleccao';
  CL.subPanelOpen=false; CL.subsUsed=0; CL.liveDivOpen=null;
}
function exitSeatContext(){
  const H=CL._hotseat, seat=CL._seatContext&&CL._seatContext.seat;
  if(seat){ CL.seatStore=CL.seatStore||{}; CL.seatStore[seat.clubId]={ xi:(S.xi||[]).slice(), formation:CL.formation, tactic:S.tactic }; }
  const p=H&&H._prev;
  if(p){ S.clubId=p.clubId; CL.clubId=p.clubId; S.xi=p.xi; S.tactic=p.tactic; CL.formation=p.formation;
    CL.tacticChosen=p.tacticChosen; CL.selPlayer=p.selPlayer; CL.escalacaoMode=p.escalacaoMode; CL.tab=p.tab; }
  CL._seatContext=null;
}
/* "Jogar partida" na tela do assento -> inicia a partida ao vivo dele (contexto já é o do assento) */
function clSeatPlay(){
  const c=CL._seatContext; if(!c) return;
  const xi=xiPlayers(CL.clubId); if(!(xi.length>=11 && CL.tacticChosen)){ toastC('Escolha a tática primeiro.'); return; }
  const fx=c.fx;
  CL.subPanelOpen=false; CL.subsUsed=0; CL.liveDivOpen=null;
  const m=buildLiveMatchObject(fx.home,fx.away,fx.seed,{user:true, div:fx.div});
  const RL={ jornada:S.round+1, minute:0, half:1, done:false, sel:null, subOpen:false, matches:[m], humanSeat:{seat:c.seat,fx} };
  RL.maxMin=Math.max(94, m.events.length?m.events[m.events.length-1].min:90);
  CL.live=RL; CL.screen='live'; cdraw(); CL._liveTimer=setTimeout(liveTick,650);
}
function finishHotseatMatch(){
  const RL=CL.live, m=RL.matches[0], H=CL._hotseat;
  const scorers=m.events.filter(e=>e.type==='gol'||(e.type==='penalti'&&e.scored)).map(e=>({name:e.scorer,id:e.team}));
  if(H){ H.humanResults[m.h+'-'+m.a]={hg:m.hg,ag:m.ag,perf:m.perf,scorers,events:m.events};
    H.allEvents=(H.allEvents||[]).concat(m.events||[]); }
  CL.live=null; CL.subsUsed=0;
  exitSeatContext(); // restaura o manager 1 (persistindo a tática do assento)
  startNextHotseatMatch();
}
/* rótulo da divisão do assento (no universo do país dele) */
function seatDivLabel(seat, fx){ const cfg=UNI_CONFIGS[uniKeyOf(seat.country)]||{}; return (cfg.label&&cfg.label[fx.div])||fx.div; }
/* divisão da liga do assento que contém o clube dele (fundo OU primária) */
function seatDivOfClub(seat){
  const country=seat.country;
  if(S.bgLeagues&&S.bgLeagues[country]){ const divs=S.bgLeagues[country].divs;
    for(const d in divs){ if((divs[d].clubIds||[]).indexOf(seat.clubId)>=0) return d; } return Object.keys(divs)[0]; }
  if(S.table&&S.table[seat.clubId]) return S.division;
  if(S.otherDivs){ for(const d in S.otherDivs){ const od=S.otherDivs[d]; if(od.clubs&&od.clubs.find(x=>x.id===seat.clubId)) return d; } }
  return S.division;
}
/* ---------- PÓS-JOGO AO VIVO (rotação de classificação por humano) ----------
   Ao fim da rodada, o manager 1 vê a classificação (scClassif) e, em seguida, CADA outro
   humano vê a SUA (a mesma tela de pós-jogo, com a liga dele). Igual pra todos. */
function startPostRoundClassifs(seats){
  CL._classifQueue=(seats||[]).slice(); // humanos secundários, mostrados DEPOIS do manager 1
  CL.clsDivOpen=null; showLiveClassif(); // manager 1 primeiro (screen='classif')
}
function postRoundClassifNext(){
  if(CL._classifTimer){ clearTimeout(CL._classifTimer); CL._classifTimer=null; }
  const q=CL._classifQueue;
  if(!q || !q.length){ CL._classifQueue=null; CL._classifSeat=null; liveDone(); return; }
  CL._classifSeat=q[0]; CL._classifQueue=q.slice(1);
  CL.clsDivOpen=null; CL.screen='seatclassif'; cdraw(); armClassifTimer();
}
/* "Continuar"/auto-avanço da tela de classificação: se há rotação ativa, vai pro próximo
   humano; senão, volta pra tela principal do manager 1 (comportamento original). */
function clClassifContinue(){
  if(CL._classifQueue!=null){ postRoundClassifNext(); return; }
  liveDone();
}
/* classificação de pós-jogo de um HUMANO secundário — mesma tela do manager 1 (scClassif),
   só que com a liga do assento (fundo OU divisão primária, se mesmo país) e o clube dele em destaque. */
function scSeatClassif(){
  const seat=CL._classifSeat; if(!seat) return deskWrap('');
  const country=seat.country, flag=(typeof flagImg==='function')?flagImg(country):'';
  const cfg=UNI_CONFIGS[uniKeyOf(country)]||{}; const labels=cfg.label||{};
  const isBg=!!(S.bgLeagues&&S.bgLeagues[country]);
  const seatDiv=seatDivOfClub(seat);
  const divs=isBg?Object.keys(S.bgLeagues[country].divs):(cfg.order||[S.division]);
  const ordered=[seatDiv,...divs.filter(d=>d!==seatDiv)];
  const rowsFor=(d)=>{
    const tbl=isBg?bgStandings(country,d):sortedTableOf(d===S.division?S.table:((S.otherDivs&&S.otherDivs[d]&&S.otherDivs[d].table)||{}));
    return (tbl||[]).map((t,i)=>{ const c=clubOf(t.id)||bgClubById(t.id)||{short:String(t.id)}; const me=t.id===seat.clubId;
      return `<div class="cl-cls2-row ${me?'me':''}" style="${clubStripe(c)}">
        <span class="cl-cls2-pos">${i+1}</span><span class="cl-cls2-n">${escC(c.short||'')}</span>
        <span class="cl-cls2-pts">${t.Pts}</span><span class="cl-cls2-x">${t.W}</span><span class="cl-cls2-x">${t.D}</span><span class="cl-cls2-x">${t.L}</span>
        <span class="cl-cls2-x">${t.GF}</span><span class="cl-cls2-x">${t.GA}</span></div>`; }).join('');
  };
  const panelHTML=(d)=>{ const open=(CL.clsDivOpen&&CL.clsDivOpen[d]!=null)?CL.clsDivOpen[d]:(d===seatDiv); const mine=d===seatDiv;
    return `<div class="cl-clsacc ${open?'open':'collapsed'}">
      <div class="cl-clsacc-h" onclick="event.stopPropagation();clToggleDivAcc('clsDivOpen','${d}')">
        <span class="cl-clsacc-h-title">🏆 ${escC(classifDivName(d, country))}${mine?' <span class="cl-acc-you">'+escC(seat.name)+'</span>':''}</span>
        <span class="cl-acc-arrow ${open?'':'closed'}">▾</span></div>
      <div class="cl-clsacc-body">
        <div class="cl-cls2-head"><span class="cl-cls2-pos">#</span><span class="cl-cls2-n">Equipa</span><span class="cl-cls2-pts">P</span><span class="cl-cls2-x">V</span><span class="cl-cls2-x">E</span><span class="cl-cls2-x">D</span><span class="cl-cls2-x">GP</span><span class="cl-cls2-x">GC</span></div>
        ${rowsFor(d)}</div></div>`; };
  return `<div class="cl-live cl-classif">
    <div class="cl-classif-buttons">${btn('Continuar','clClassifContinue()',{icon:'✔',cls:'cl-btn-ok cl-btn-sm'})}</div>
    <div class="cl-classif-autohint">avança sozinho em alguns segundos...</div>
    <div class="cl-live-top">${flag} ${escC(seat.name)} · Classificação - ${S.round}ª jornada</div>
    <div class="cl-clsacc-wrap">${ordered.map(panelHTML).join('')}</div>
  </div>`;
}
/* TELA DO TIME do assento (hotseat): mesma pegada da tela principal — elenco à esquerda,
   tática + classificação + Jogar à direita. Reusa rosterHTML()/panSeleccao() com o contexto
   já trocado pro assento (clJogar detecta o contexto e chama clSeatPlay). */
function scSeatTurn(){
  const c=CL._seatContext; if(!c) return deskWrap('');
  const seat=c.seat, fx=c.fx; const cl=clubOf(seat.clubId)||bgClubById(seat.clubId)||{};
  const oppId=fx.home===seat.clubId?fx.away:fx.home; const opp=clubOf(oppId)||bgClubById(oppId)||{};
  const home=fx.home===seat.clubId; const flag=(typeof flagImg==='function')?flagImg(seat.country):'';
  const th=clubTheme(seat.clubId);
  return `<div class="cl-main" style="border-color:${th.col}">
    <div class="cl-main-top">${flag} ${escC(seat.name)} · ${escC(cl.short||'')}</div>
    <div class="cl-main-body">
      <div class="cl-main-left" style="background:${th.bg}">
        <div class="cl-hdr"><div class="cl-mgr">${escC(seat.name)}</div>
          <div class="cl-hdr-sub"><span class="cl-flag2">${flag}</span> ${escC(seat.country)} <span class="cl-div">${escC(seatDivLabel(seat,fx))}</span></div></div>
        <div class="cl-roster-hd cl-acc-hd"><span>Elenco</span></div>
        <div class="cl-roster cl-acc-body">${rosterHTML()}</div>
      </div>
      <div class="cl-main-right" style="background:${th.bg}">
        <div class="cl-right-hdr"><div class="cl-adv-lbl">Adversário</div>
          <div class="cl-adv-name" style="background:${th.bg2};padding:3px 8px">${escC(opp.short||'')}</div>
          <div class="cl-adv-loc">${home?'CASA':'FORA'} · ${(S.round||0)+1}ª Jornada</div></div>
        <div class="cl-panel">${panSeleccao()}</div>
      </div>
    </div>
  </div>`;
}
/* tela de passagem de aparelho (hotseat) entre os treinadores humanos */
function scHandoff(){
  const it=CL._handoff; if(!it) return deskWrap('');
  const seat=it.seat, fx=it.fx;
  // clube de fundo pode ainda não estar materializado (clubOf só resolve nesse ponto após
  // ensureBgClubMaterialized) — cai no dado real do intlClubById pra mostrar nome/cores.
  const anyClub=id=>clubOf(id)||(typeof bgClubById==='function'?bgClubById(id):null)||{};
  const c=anyClub(seat.clubId);
  const oppId=fx.home===seat.clubId?fx.away:fx.home; const opp=anyClub(oppId);
  const loc=fx.home===seat.clubId?'em casa':'fora';
  const flag=(typeof flagImg==='function')?flagImg(seat.country):'';
  return dlg('Passe o aparelho', `
    <div class="cl-handoff">
      <div class="cl-handoff-to">Agora é a vez de</div>
      <div class="cl-handoff-name">${escC(seat.name)}</div>
      <div class="cl-handoff-club" style="${clubStripe?clubStripe(c):''}">${flag} ${escC(c.short||c.name||'')}</div>
      <div class="cl-handoff-country">${flag} ${escC(seat.country)}</div>
      <div class="cl-handoff-match">${escC(c.short||'')} <span class="cl-handoff-x">×</span> ${escC(opp.short||'')} <span class="cl-handoff-loc">(${loc})</span></div>
      <div class="cl-handoff-actions">${btn('Continuar','clPlayHotseatMatch()',{icon:'▶',cls:'cl-btn-ok cl-btn-wide'})}</div>
    </div>`, {w:600,bodyClass:'cl-body-green'});
}

/* ================= SAVE / LOAD (Modo Solo — só nuvem via Supabase) =================
   Salva/carrega por nome, vinculado ao usuário logado. O estado do jogo NUNCA fica
   no localStorage — sempre no Supabase (tabela elifoot_v3.solo_saves).
   `explicit=true` mostra a barra de "Gravando..." e o toast de resultado (usado no
   menu "Gravar jogo"); os auto-saves de fim de rodada continuam totalmente silenciosos
   (nem toast, nem barra — só tentam gravar em segundo plano, sem incomodar o jogador).
   Em modo online (Resenha) o save é o da sala (NET.saveGame), então aqui é no-op.
   Antes disso era "fire and forget" (nunca esperado por quem chamava) — o menu fechava
   e redesenhava a tela na hora, sem mostrar NADA enquanto a gravação de verdade ainda
   estava em andamento, e o erro real (sessão expirada, timeout de rede num save grande,
   etc.) era engolido num console.warn — o jogador só via um aviso genérico sem saber
   por quê. Agora é de verdade assíncrono/esperado, mostra progresso real (indeterminado,
   já que não dá pra saber % de upload) e tenta dar uma pista honesta do motivo do erro. */
async function saveV3(explicit){
  if(CL._seatContext) return; // hotseat: contexto trocado pro assento — NÃO persistir (seria salvo com o clube errado como primário)
  if(CL.online) return; // online usa o save da sala (host-autoritativo), não o solo
  const name = CL.save||CL.mgr||'SAVE';
  const payload = { ts:Date.now(), mgr:CL.mgr, clubId:CL.clubId, currency:CL.currency, ticket:CL.ticket, humans:CL.humans, S };
  if(typeof NET==='undefined' || !NET.saveSoloGame){ if(explicit&&typeof toastC==='function') toastC('⚠ Sem conexão pra gravar.'); return; }
  let finishSavingOverlay=null;
  if(explicit) finishSavingOverlay=showSavingOverlay();
  try{
    await NET.saveSoloGame(name, payload);
    if(explicit){
      finishSavingOverlay();
      await new Promise(r=>setTimeout(r,350));
      clCloseOverlay(); toastC('✓ Jogo gravado na nuvem.');
    }
  } catch(e){
    console.warn('saveSolo erro:', e);
    if(explicit){
      clCloseOverlay();
      const msg=(e&&e.message)?String(e.message):'';
      const authIssue=/jwt|auth|session|401|403/i.test(msg);
      toastC(authIssue
        ? '⚠ Sessão expirada — faça login novamente pra gravar na nuvem.'
        : '⚠ Não foi possível gravar na nuvem'+(msg?' ('+msg+')':'.')+'.');
    }
  }
}
/* barra de "Gravando..." — visual e animação IDÊNTICOS à barra usada ao criar um save novo
   (scLoading/runLoading: preenchimento sólido crescendo + porcentagem, não a barrinha
   deslizante indeterminada de antes). Como aqui é uma operação de rede de verdade (duração
   desconhecida), a barra sobe do mesmo jeito até travar em 90% — só pula pra 100% quando
   NET.saveSoloGame() realmente terminar (ver finishSavingOverlay), nunca fingindo estar
   pronta antes da hora. */
function showSavingOverlay(){
  overlayC(dlg('', `<div class="cl-loadbar"><div class="cl-loadbar-title">Gravando na nuvem...</div>
    <div class="cl-loadbar-track"><div id="cl-save-fill" class="cl-loadbar-fill" style="width:0%"><span id="cl-save-pct">0%</span></div></div></div>`,
    {w:460,bodyClass:'cl-body-gray',min:true}));
  let p=0;
  const t=setInterval(()=>{ p=Math.min(90, p+Math.floor(8+Math.random()*14));
    const f=$c('#cl-save-fill'), pc=$c('#cl-save-pct'); if(f)f.style.width=p+'%'; if(pc)pc.textContent=p+'%';
    if(p>=90) clearInterval(t); }, 180);
  return function finishSavingOverlay(){
    clearInterval(t);
    const f=$c('#cl-save-fill'), pc=$c('#cl-save-pct'); if(f)f.style.width='100%'; if(pc)pc.textContent='100%';
  };
}
function clLoadSave(name){
  toastC('Carregando jogo…');
  (async ()=>{ try {
    const g = (typeof NET!=='undefined'&&NET.loadSoloSave)?await NET.loadSoloSave(name):null;
    if(!g){ toastC('⚠ Save não encontrado.'); return; }
    S=g.S; CL.clubId=g.clubId; CL.mgr=g.mgr; CL.currency=g.currency||'Reais'; CL.ticket=g.ticket||8; CL.humans=g.humans||{};
    CL.save=name; CL.online=false; // jogo solo — nunca herda estado de sala online
    if(typeof NET!=='undefined'){ NET.isHost=false; NET.gameId=null; NET.onState=null; }
    setUniverse(S.intlUniverse||'brasil'); // restaura a config de divisões do universo do save (Brasil/Inglaterra/...)
    CL.intlUniverse = S.intlUniverse||false;
    syncDataClubsFromState(); // realinha DATA.clubs com a divisão real do save carregado
    CL.screen='main'; CL.tab='jogo'; CL.selPlayer=squad(CL.clubId)[0]?.n||null; cdraw();
    // sorteio de copa pode ter ficado pendente de uma sessão anterior (fila em
    // S._pendingDrawShows, ver initSeasonCups/advancePendingCups) — sem isso aqui, o
    // usuário só via o sorteio depois de terminar a PRÓXIMA rodada ao vivo (via
    // finishLiveRound), o que em muitas divisões passava despercebido por rodadas.
    checkPendingCupDraws(()=>{});
  } catch(e){ toastC('⚠ '+(e.message||'erro ao carregar')); } })();
}

/* ================= 08-13 · TELA PRINCIPAL ================= */
function divisionLabel(){ return (typeof DIV_LABEL_FULL!=='undefined'&&DIV_LABEL_FULL[S.division]) || ({A:'Série A',B:'Série B',C:'Série C',D:'Série D'})[S.division] || 'Série A'; }
function scMain(){
  const cl=clubOf(CL.clubId);
  const uf=userFixture(); const oppId=uf?(uf[0]===CL.clubId?uf[1]:uf[0]):null; const home=uf?uf[0]===CL.clubId:true;
  const menuNames=['RetroFoot98','Seleccionar','Equipa','Jogador','Campeonatos','Treinador']; if(CL.online) menuNames.push('Modo Resenha');
  const hamburger=`<div class="cl-hamburger" onclick="clToggleMobMenu(event)"><span>☰ Menu</span><span>${CL.mobMenuOpen?'▲':'▼'}</span></div>`;
  const offerCoin=(S.incomingOffers&&S.incomingOffers.length)?' 💰':''; // propostas de compra pendentes
  const resenhaBadge=(CL.online && typeof NET!=='undefined' && NET.isHost && CL.pendingJoins && CL.pendingJoins.length)?' 🔔':''; // pedidos de entrada pendentes
  const menu=`<div class="cl-menu ${CL.mobMenuOpen?'mob-open':''}" id="cl-menubar">
    ${menuNames.map(mm=>`<span class="cl-menu-i ${CL.menu===mm?'open':''}" onclick="clMenu('${mm}',event)">${mm}${mm==='Jogador'?offerCoin:''}${mm==='Modo Resenha'?resenhaBadge:''}${CL.menu===mm?menuDropdown(mm):''}</span>`).join('')}
  </div>`;
  const tabs=['jogo','jogador','financas','seleccao','adversario'];
  const tabLbl={jogo:'Jogo',jogador:'Jogador',financas:'Finanças',seleccao:'Formação',adversario:'Adversário'};
  const tabBar=`<div class="cl-tabs">${tabs.map(t=>`<span class="cl-tab ${CL.tab===t?'on':''}" onclick="clTab('${t}')">${tabLbl[t]}${t==='jogador'?offerCoin:''}</span>`).join('')}</div>`;
  let panel='';
  if(CL.tab==='jogo') panel=panJogo(oppId,home,uf);
  else if(CL.tab==='jogador') panel=panJogador();
  else if(CL.tab==='financas') panel=panFinancas();
  else if(CL.tab==='seleccao') panel=panSeleccao();
  else panel=panAdversario(oppId);
  const jornada=(S.round||0)+1;
  const th=clubTheme(CL.clubId);
  return `<div class="cl-main ${CL.online?'cl-main-online':''}" style="border-color:${th.col}">
    <div class="cl-main-top">${escC(cl.short)}</div>
    <div class="cl-mobmenu-wrap">${hamburger}${menu}</div>
    ${CL.online?onlineStatusSidebar():''}
    <div class="cl-main-body">
      <div class="cl-main-left" style="background:${th.bg}">
        <div class="cl-hdr">
          <div class="cl-mgr">${escC(CL.mgr||'TREINADOR')}</div>
          <div class="cl-hdr-sub"><span class="cl-flag2">${universeFlag()}</span> ${escC(universeCountryName())} <span class="cl-div">${divisionTrophyImg(S.division,16)||''} ${divisionLabel()}</span> ${windowBadge()} <span class="cl-share-mini cl-noshot" onclick="clShareTeam()" title="Compartilhar meu time">Compartilhar</span></div>
        </div>
        <div class="cl-roster-hd cl-acc-hd" onclick="clToggleRoster()">
          <span>Elenco</span><span class="cl-acc-arrow ${CL.rosterOpen===false?'closed':''}">▾</span>
        </div>
        <div class="cl-roster cl-acc-body ${CL.rosterOpen===false?'closed':''}">${rosterHTML()}</div>
      </div>
      <div class="cl-main-right" style="background:${th.bg}">
        <div class="cl-right-hdr">
          <div class="cl-adv-lbl">Adversário</div>
          <div class="cl-year">${S.season}</div>
          <div class="cl-adv-name" style="background:${th.bg2};padding:3px 8px">${oppId?escC(clubOf(oppId).short):'—'}</div>
          <div class="cl-adv-loc">${home?'CASA':'FORA'} ${jornada}ª Jornada</div>
        </div>
        <div class="cl-panel">${panel}</div>
        ${tabBar}
      </div>
    </div>
  </div>`;
}
function rosterHTML(){
  const groups=[['GK','G'],['DEF','D'],['MID','M'],['ATT','A']];
  const sq=squad(CL.clubId); const th=clubTheme(CL.clubId);
  const showMarks=(CL.tab==='seleccao'||CL.escalacaoMode); const xiSet=new Set(S.xi||[]);
  const escala=CL.escalacaoMode;
  let html='';
  groups.forEach(([sec])=>{ const list=sq.filter(p=>p.s===sec);
    html+=`<div class="cl-rgroup">`+list.map(p=>{const starter=xiSet.has(p.n);
      const marked=escala && CL.preSubOut===p.n;
      const selc=!escala && CL.selPlayer===p.n;
      const unavail=p.suspended>0||p.injuredMatches>0;
      const badge=p.suspended>0?'🟥':(p.injuredMatches>0?'✚'+p.injuredMatches:'');
      const onclickFn=escala?`clEscalaPick('${escC(p.n)}')`:`clSelPlayer('${escC(p.n)}')`;
      return `<div class="cl-rrow ${selc?'sel':''} ${marked?'swap-out':''} ${unavail?'unavail':''}" style="${selc?'':`color:${th.txt}`}" onclick="${onclickFn}">
        <span class="cl-rmark ${showMarks?(starter?'t':'r'):''}">${showMarks?(starter?'T':'R'):''}</span>
        <span class="cl-rpos">${posLetter(p.s)}</span><span class="cl-rname">${escC(p.n)}${(p.age&&p.age<=20)?'*':''}${badge?' '+badge:''}${(S.incomingOffers||[]).some(o=>o.playerName===p.n)?' <span title="Proposta de compra recebida">💰</span>':''}</span>
        <span class="cl-rf">${p.f}</span><span class="cl-rv">${grp(Math.round(curConv(p.mv)*0.00006)*10)}</span></div>`;}).join('')+`</div>`;
  });
  return html;
}
function clSelPlayer(n){ CL.selPlayer=n;
  // na aba Selecção o clique NÃO tira o usuário da aba — assim o botão "Alterar
  // Escalação" continua acessível até ele clicar em Jogar. Nas outras abas, abre o Jogador.
  if(CL.tab!=='jogador' && CL.tab!=='seleccao') CL.tab='jogador';
  cdraw(); }
function clTab(t){ CL.tab=t; cdraw(); }

/* ================= VISUALIZAR TIME (view-only) =================
   Usado quando o usuário clica no nome de um clube que NÃO é o dele (ex: na
   Classificação de "Minhas competições", ou em "Ver elenco" do adversário).
   Mostra a mesma tela principal (elenco, próximo jogo, jogador, adversário),
   só que 100% de LEITURA — sem comprar, vender, renovar, escalar ou jogar,
   já que essas ações só fazem sentido pro dono do time. ---- */
function clViewTeam(clubId){
  clCloseOverlay();
  CL.viewClubId=clubId; CL.viewTab='jogo'; CL.viewSelPlayer=null;
  CL.screen='teamview'; cdraw();
}
function clViewTeamBack(){ clCloseOverlay(); CL.viewClubId=null; CL.screen='main'; cdraw(); }
function clViewTab(t){ CL.viewTab=t; cdraw(); }
function clViewSelPlayer(n){ CL.viewSelPlayer=n; CL.viewTab='jogador'; cdraw(); }
function fixtureFor(clubId){ return currentFixtures().find(([h,a])=>h===clubId||a===clubId); }
function scTeamView(){
  const vid=CL.viewClubId; const c=clubOf(vid);
  if(!c){ CL.viewClubId=null; CL.screen='main'; return scMain(); }
  const th=clubTheme(vid);
  const uf=fixtureFor(vid); const oppId=uf?(uf[0]===vid?uf[1]:uf[0]):null; const home=uf?uf[0]===vid:true;
  const tabs=['jogo','jogador','adversario'];
  const tabLbl={jogo:'Jogo',jogador:'Jogador',adversario:'Adversário'};
  const tabBar=`<div class="cl-tabs">${tabs.map(t=>`<span class="cl-tab ${CL.viewTab===t?'on':''}" onclick="clViewTab('${t}')">${tabLbl[t]}</span>`).join('')}</div>`;
  let panel='';
  if(CL.viewTab==='jogador') panel=panViewJogador(vid);
  else if(CL.viewTab==='adversario') panel=panViewAdversario(oppId);
  else panel=panViewJogo(vid,oppId,uf);
  const jornada=(S.round||0)+1;
  return `<div class="cl-main" style="border-color:${th.col}">
    <div class="cl-main-top">${escC(c.short)} <span class="cl-view-tag">👁 Visualização</span></div>
    <div class="cl-mobmenu-wrap">${btn('← Voltar','clViewTeamBack()',{cls:'cl-btn-mini'})}</div>
    <div class="cl-main-body">
      <div class="cl-main-left" style="background:${th.bg}">
        <div class="cl-hdr">
          <div class="cl-mgr">${escC(c.name)}</div>
          <div class="cl-hdr-sub"><span class="cl-flag2">${clubCountry(c).flag}</span> ${escC(clubCountry(c).name)} ${(function(){ const lg=clubLeagueLabel(c); if(lg) return `<span class="cl-div">${escC(lg)}</span>`; return !c.country?`<span class="cl-div">${divisionTrophyImg(S.division,16)||''} ${divisionLabel()}</span>`:''; })()}</div>
        </div>
        <div class="cl-roster-hd cl-acc-hd" onclick="clToggleRoster()">
          <span>Elenco</span><span class="cl-acc-arrow ${CL.rosterOpen===false?'closed':''}">▾</span>
        </div>
        <div class="cl-roster cl-acc-body ${CL.rosterOpen===false?'closed':''}">${viewRosterHTML(vid)}</div>
      </div>
      <div class="cl-main-right" style="background:${th.bg}">
        <div class="cl-right-hdr">
          <div class="cl-adv-lbl">Adversário</div>
          <div class="cl-year">${S.season}</div>
          <div class="cl-adv-name" style="background:${th.bg2};padding:3px 8px">${oppId?escC(clubOf(oppId).short):'—'}</div>
          <div class="cl-adv-loc">${uf?(home?'CASA':'FORA')+' '+jornada+'ª Jornada':'—'}</div>
        </div>
        <div class="cl-panel">${panel}</div>
        ${tabBar}
      </div>
    </div>
  </div>`;
}
function viewRosterHTML(clubId){
  const groups=[['GK','G'],['DEF','D'],['MID','M'],['ATT','A']];
  const sq=squad(clubId)||[];
  let html='';
  groups.forEach(([sec])=>{ const list=sq.filter(p=>p.s===sec);
    html+=`<div class="cl-rgroup">`+list.map(p=>{const selc=CL.viewSelPlayer===p.n;
      const unavail=p.suspended>0||p.injuredMatches>0;
      const badge=p.suspended>0?'🟥':(p.injuredMatches>0?'✚'+p.injuredMatches:'');
      return `<div class="cl-rrow ${selc?'sel':''} ${unavail?'unavail':''}" onclick="clViewSelPlayer('${escC(p.n)}')">
        <span class="cl-rmark"></span>
        <span class="cl-rpos">${posLetter(p.s)}</span><span class="cl-rname">${escC(p.n)}${(p.age&&p.age<=20)?'*':''}${badge?' '+badge:''}</span>
        <span class="cl-rf">${p.f}</span><span class="cl-rv">${grp(Math.round(curConv(p.mv)*0.00006)*10)}</span></div>`;}).join('')+`</div>`;
  });
  return html || '<div class="cl-savempty">— sem elenco —</div>';
}
function panViewJogo(vid,oppId,uf){
  const me=tableRow(vid), op=oppId?tableRow(oppId):null;
  const rnd=rngFrom(uf?(hashC(uf[0])+hashC(uf[1])):hashC(vid));
  const ref=REFS_C[Math.floor(rnd()*REFS_C.length)];
  const sq=squad(vid)||[];
  const moral=sq.length?Math.round(sq.reduce((s,p)=>s+(p.moral||70),0)/sq.length):70;
  const line=(id,t,blue)=>`<div class="cl-grow ${blue?'blue':''}"><span class="cl-gname">${escC(clubOf(id).short)}</span>
     <span class="cl-gnums"><b>${t.P}</b><b>${t.W}</b><b>${t.D}</b><b>${t.GF}:${t.GA}</b><b>${t.Pts}</b></span></div>`;
  return `<div class="cl-jogo">
    ${uf?line(vid,me,false):''}
    ${oppId?line(oppId,op,true):''}
    ${uf?`<div class="cl-blk"><div class="cl-blk-l">Árbitro</div><div class="cl-blk-v cl-strong">${escC(ref)}</div></div>`:'<div class="cl-jogo-empty">Sem jogo marcado nesta jornada.</div>'}
    <div class="cl-blk"><div class="cl-blk-l">Moral do elenco</div><div class="cl-bar cl-bar-moral" style="--val:${moral}"><div class="cl-bar-fill" style="width:${moral}%"></div></div></div>
  </div>`;
}
function panViewJogador(vid){
  const sq=squad(vid)||[];
  const p=sq.find(x=>x.n===CL.viewSelPlayer)||sq[0]; if(!p) return '<div class="cl-jgd">Sem jogadores.</div>';
  const st=p.stats||{};
  const statusBar = p.suspended>0 ? `<div class="cl-jgd-status susp">🟥 Suspenso — falta o próximo jogo</div>`
    : p.injuredMatches>0 ? `<div class="cl-jgd-status hurt">✚ Lesionado — fora por ${p.injuredMatches} jogo${p.injuredMatches>1?'s':''}</div>` : '';
  const ctry=clubCountry(clubOf(vid));
  return `<div class="cl-jgd">
    <div class="cl-jgd-name">${escC(p.n)}</div>
    <div class="cl-jgd-nat"><span class="cl-flag2">${flagImg(p.nat||ctry.name)}</span> ${escC(p.nat||ctry.name)}</div>
    ${statusBar}
    <div class="cl-jgd-row"><span>Posição</span><b>${posLetter(p.s)}</b></div>
    <div class="cl-jgd-row"><span>Força</span><b>${p.f}</b></div>
    <div class="cl-jgd-row"><span>Valor de mercado</span><b>${curSym()} ${moneyDisp(p.mv)}</b></div>
    <div class="cl-jgd-row"><span>Comportamento</span><b>${playerBehaviorLabel(p)}</b></div>
    <div class="cl-jgd-row"><span>Gols nesta temporada</span><b>${(S.scorers&&S.scorers[p.n])||0}</b></div>
    <fieldset class="cl-hist"><legend>Historial</legend>
      <div class="cl-hist-row"><span>Jogos</span><b>${st.apps||0}</b></div>
      <div class="cl-hist-row"><span>Gols</span><b>${st.goals||0}</b></div>
      <div class="cl-hist-row"><span>Cartões amarelos</span><b>${st.yellows||0}</b></div>
      <div class="cl-hist-row"><span>Cartões vermelhos</span><b>${st.reds||0}</b></div>
      <div class="cl-hist-row"><span>Lesões</span><b>${st.injuries||0}</b></div>
    </fieldset>
  </div>`;
}
function panViewAdversario(oppId){
  if(!oppId) return `<div class="cl-adv">Sem adversário nesta jornada.</div>`;
  const r=ratings(oppId,false); const forca=Math.max(6,Math.min(100,Math.round((r.OS+r.DS)/2)));
  const rnd=rngFrom(hashC(oppId)); const coach=COACHES_C[Math.floor(rnd()*COACHES_C.length)];
  return `<div class="cl-adv">
    <div class="cl-adv-big"><span class="cl-link" onclick="clViewTeam('${oppId}')">${escC(clubOf(oppId).short)}</span></div>
    <div class="cl-bar cl-bar-lg"><div class="cl-bar-fill" style="width:${forca}%"></div></div>
    <div class="cl-adv-coach"><span>Treinador</span><b>${escC(coach)}</b></div>
  </div>`;
}

/* ---- painel: JOGO ---- */
function tableRow(id){ const t=(S.table&&S.table[id])||{P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0}; return t; }
function panJogo(oppId,home,uf){
  const me=tableRow(CL.clubId), op=oppId?tableRow(oppId):null;
  const rnd=rngFrom(uf?(hashC(uf[0])+hashC(uf[1])):12345);
  const ref=REFS_C[Math.floor(rnd()*REFS_C.length)];
  const moral=Math.round(squad(CL.clubId).reduce((s,p)=>s+(p.moral||70),0)/Math.max(1,squad(CL.clubId).length));
  const line=(id,t,blue)=>`<div class="cl-grow ${blue?'blue':''}"><span class="cl-gname">${escC(clubOf(id).short)}</span>
     <span class="cl-gnums"><b>${t.P}</b><b>${t.W}</b><b>${t.D}</b><b>${t.GF}:${t.GA}</b><b>${t.Pts}</b></span></div>`;
  return `<div class="cl-jogo">
    ${uf?line(CL.clubId,me,false):''}
    ${oppId?line(oppId,op,true):''}
    <div class="cl-blk"><div class="cl-blk-l">Árbitro</div><div class="cl-blk-v cl-strong">${escC(ref)}</div></div>
    <div class="cl-blk"><div class="cl-blk-l">Dinheiro em caixa</div><div class="cl-blk-v">${spellMoney(S.budget)}</div></div>
    <div class="cl-blk"><div class="cl-blk-l">Moral</div><div class="cl-bar cl-bar-moral" style="--val:${moral}"><div class="cl-bar-fill" style="width:${moral}%"></div></div></div>
  </div>`;
}
function hashC(s){ s=String(s); let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h; }

/* ---- painel: JOGADOR ---- */
/* comportamento é um traço FIXO do jogador (Casca-Grossa, Brigão, Encrenqueiro,
   Discreto, Manso, Exemplar) — sorteado uma vez na criação
   e nunca muda; afeta cartão, lesão e valor de mercado de verdade (ver app.js). */
function playerBehaviorLabel(p){ return p.behavior || 'Exemplar'; }
function panJogador(){
  const p=squad(CL.clubId).find(x=>x.n===CL.selPlayer)||squad(CL.clubId)[0]; if(!p) return '';
  if(CL.rightMode==='renovar') return renewPanel(p);
  if(CL.rightMode==='vender') return venderPanel(p);
  const st=p.stats||{};
  const statusBar = p.suspended>0 ? `<div class="cl-jgd-status susp">🟥 Suspenso — falta o próximo jogo</div>`
    : p.injuredMatches>0 ? `<div class="cl-jgd-status hurt">✚ Lesionado — fora por ${p.injuredMatches} jogo${p.injuredMatches>1?'s':''}</div>` : '';
  return `<div class="cl-jgd">
    <div class="cl-jgd-name">${escC(p.n)}</div>
    <div class="cl-jgd-nat"><span class="cl-flag2">${flagImg(p.nat||'Brasil')}</span> ${escC(p.nat||'Brasil')}</div>
    ${statusBar}
    <div class="cl-jgd-row"><span>Comportamento</span><b>${playerBehaviorLabel(p)}</b></div>
    <div class="cl-jgd-row"><span>Gols nesta temporada</span><b>${(S.scorers&&S.scorers[p.n])||0}</b></div>
    <fieldset class="cl-hist"><legend>Historial</legend>
      <div class="cl-hist-row"><span>Jogos</span><b>${st.apps||0}</b></div>
      <div class="cl-hist-row"><span>Gols</span><b>${st.goals||0}</b></div>
      <div class="cl-hist-row"><span>Cartões amarelos</span><b>${st.yellows||0}</b></div>
      <div class="cl-hist-row"><span>Cartões vermelhos</span><b>${st.reds||0}</b></div>
      <div class="cl-hist-row"><span>Lesões</span><b>${st.injuries||0}</b></div>
    </fieldset>
    <div class="cl-jgd-act">${btn('Renovar contrato...','clRenew()',{icon:'🔄',cls:'cl-btn-ok'})}${btn('Vender','clSell()',{icon:'💰',cls:'cl-btn-cancel'})}</div>
  </div>`;
}
function renewPanel(p){
  const currentSalary = (p.contract && p.contract.salary) || 0;
  const currentYears = (p.contract && p.contract.years) || 0;
  const newYears = 3;
  const totalCost = CL.newSalary * newYears * 52; // 52 semanas
  const currentBudget = S.budget;
  const budgetAfterRenew = currentBudget - totalCost;
  const budgetWarning = budgetAfterRenew < 0 ? ' ⚠️' : '';
  return `<div class="cl-renew">
  <div class="cl-renew-title">Renovar contrato</div>
  <div style="color:#fff;font-size:13px;margin-bottom:24px;padding:12px;background:#1a3a1a;border-radius:4px">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Salário atual:</span><b>${grp(currentSalary)}/sem</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Tempo restante:</span><b>${currentYears} ano(s)</b></div>
    <div style="display:flex;justify-content:space-between;border-top:1px solid #2a4a2a;padding-top:8px;margin-top:8px"><span>Novo salário:</span><b>${grp(CL.newSalary)}/sem</b></div>
  </div>
  <div class="cl-renew-row"><span>Novo salário:</span>
    <span class="cl-spin"><span id="cl-sal" class="cl-spin-v">${grp(CL.newSalary)}</span>
      <span class="cl-spin-btns"><button onclick="clSalaryStep(1)">▲</button><button onclick="clSalaryStep(-1)">▼</button></span></span></div>
  <div style="color:#fff;font-size:13px;margin-bottom:20px;padding:12px;background:#2a3a2a;border-radius:4px">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Duração do contrato:</span><b>${newYears} ano(s)</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Custo total:</span><b>${grp(totalCost)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Caixa atual:</span><b>${curSym()} ${moneyDisp(currentBudget)}</b></div>
    <div style="display:flex;justify-content:space-between;border-top:1px solid #3a4a3a;padding-top:8px;margin-top:8px"><span>Caixa após renovação:</span><b>${curSym()} ${moneyDisp(budgetAfterRenew)}${budgetWarning}</b></div>
  </div>
  <div class="cl-renew-btns">${btn('Propôr','clRenewPropose()',{icon:'🔄',cls:'cl-btn-ok'})}${btn('Cancelar','clCancelRight()',{icon:'✖',cls:'cl-btn-cancel'})}</div>
</div>`; }
/* piso de venda: 70% do valor de mercado, arredondado. Abaixo disso é subvalorizar o
   jogador (queima de ativo) — a janela avisa em vermelho. */
function sellMinPrice(mv){ return Math.round((mv||0)*0.7/10000)*10000; }
function venderPanel(p){
  const askingPrice = CL.sellPrice ? parseInt(CL.sellPrice) : 0;
  const mv = p.mv || 0;
  const minPrice = sellMinPrice(mv);
  const diff = askingPrice - mv;
  const diffPct = mv > 0 ? Math.round((diff / mv) * 100) : 0;
  const diffLabel = diff > 0 ? `+${moneyDisp(diff)} (+${diffPct}%)` : diff < 0 ? `${moneyDisp(diff)} (${diffPct}%)` : 'Preço igual';
  const belowMin = askingPrice > 0 && askingPrice < minPrice;
  return `<div class="cl-vender">
  <div class="cl-vender-title">Vender</div>
  <div style="color:#fff;font-size:13px;margin-bottom:20px;padding:12px;background:#3a2a2a;border-radius:4px">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Valor de mercado <span style="opacity:.7">(preço sugerido)</span>:</span><b>${moneyDisp(mv)}</b></div>
    <div class="cl-sell-min"><span>Preço mínimo:</span><b>${moneyDisp(minPrice)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-top:8px"><span>Preço pedido:</span><b id="cl-sellprice-asked">${askingPrice > 0 ? moneyDisp(askingPrice) : '-'}</b></div>
  </div>
  <div class="cl-vender-lbl">Preço de venda pedido<br><span id="cl-sellprice-diff" style="font-size:12px;opacity:.8;color:#aaa">${diffLabel}</span></div>
  <div id="cl-sellprice-warn" class="cl-sell-warn" style="${belowMin?'':'display:none'}">⚠ Abaixo do preço mínimo — você está subvalorizando o jogador.</div>
  <div class="cl-money-field">
    <span class="cl-money-cur">${curSym()}</span>
    <input id="cl-sellprice" class="cl-money-in" inputmode="numeric" placeholder="${grp(mv)}" value="${CL.sellPrice?moneyDisp(CL.sellPrice):''}" oninput="clSellPriceInput(this)">
  </div>
  <div class="cl-vender-btns">${btn('Vender','clSellConfirm()',{icon:'💰',cls:'cl-btn-ok'})}${btn('Cancelar','clCancelRight()',{icon:'✖',cls:'cl-btn-cancel'})}</div>
</div>`; }

/* ---- Jogador > Comprar jogador: primeiro escolhe a DIVISÃO, depois o clube dela ---- */
const MKT_DIV_LEGEND={A:'Série A — 1ª Divisão',B:'Série B — 2ª Divisão',C:'Série C — 3ª Divisão',D:'Série D — 4ª Divisão'};
/* legenda de divisão universo-consciente: usa o nome brasileiro quando é o universo Brasil,
   senão o rótulo da divisão do universo ativo (Premier League, Championship, La Liga...). */
function divLegend(d){ return MKT_DIV_LEGEND[d] || (typeof DIV_LABEL_FULL!=='undefined'&&DIV_LABEL_FULL[d]) || d; }
function clMarketClubs(){ CL.menu=null;
  if(!canNegotiate()){ toastC(windowClosedMsg()); return; }
  CL.market={step:'divisions'};
  // divisões do universo do usuário
  let rows=DIV_ORDER.map(d=>{
    const isOwn=d===S.division;
    const count=isOwn ? DATA.clubs.length : ((S.otherDivs&&S.otherDivs[d])?S.otherDivs[d].clubs.length:0);
    return `<div class="cl-mkt-club" onclick="clMarketDivision('${d}')">
      ${divisionTrophyImg(d,28)||'<span class="cl-divopt-ic">🏆</span>'}
      <span class="cl-mkt-club-n">${escC(divLegend(d))}${isOwn?' <b>(sua divisão)</b>':''}</span>
      <span class="cl-mkt-club-ov">${count} clubes</span>
    </div>`;
  }).join('');
  // + ligas de background (outros países): dá pra buscar/comprar jogadores delas também
  const bg=S.bgLeagues||{};
  Object.keys(bg).forEach(country=>{
    Object.keys(bg[country].divs).forEach(d=>{
      const count=(bg[country].divs[d].clubIds||[]).length;
      rows += `<div class="cl-mkt-club" onclick="clMarketDivision('${d}','${country}')">
        <span class="cl-divopt-ic">${flagImg(country)}</span>
        <span class="cl-mkt-club-n">${escC(country)} — ${escC(bgDivLabel(country,d))}</span>
        <span class="cl-mkt-club-ov">${count} clubes</span></div>`;
    });
  });
  overlayC(dlg('Comprar jogador — escolha a liga', `<div class="cl-mkt-clublist">${rows}</div>
    <div class="cl-cal-ok">${btn('Fechar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}</div>`,
    {w:560,bodyClass:'cl-body-gray',min:true}));
}
/* ---- clubes daquela divisão específica (country = país de background, se houver) ---- */
function clMarketDivision(division,country){
  CL.market={step:'clubs',division,country};
  let clubs;
  if(country){ // liga de background: clubes vêm de S.bgLeagues (bgClubById cobre intl E Brasil-bg)
    const L=S.bgLeagues&&S.bgLeagues[country];
    clubs=(L&&L.divs[division]?L.divs[division].clubIds:[]).map(id=>bgClubById(id)).filter(Boolean);
  } else {
    const isOwn=division===S.division;
    clubs=isOwn ? DATA.clubs.filter(c=>c.id!==CL.clubId) : ((S.otherDivs&&S.otherDivs[division])?S.otherDivs[division].clubs:[]);
  }
  const cq=country?`,'${country}'`:'';
  const rows=clubs.map(c=>`<div class="cl-mkt-club" onclick="clMarketSquad('${c.id}'${cq})" style="${clubEdge(c)}">
      <span class="cl-mkt-club-n">${escC(c.short)}</span><span class="cl-mkt-club-ov">força ${c.overall||Math.round(((c.OS||0)+(c.MS||0)+(c.DS||0))/3)}</span>
    </div>`).join('') || '<div class="cl-mkt-counter">Sem clubes disponíveis nessa liga ainda.</div>';
  const title=country?`${escC(country)} — ${escC(bgDivLabel(country,division))}`:escC(divLegend(division));
  overlayC(dlg('Comprar jogador — '+title, `<div class="cl-mkt-clublist">${rows}</div>
    <div class="cl-cal-ok">${btn('Voltar','clMarketClubs()',{icon:'↩',cls:'cl-btn-cancel'})}</div>`,
    {w:560,bodyClass:'cl-body-gray',min:true}));
}
/* ---- elenco do clube escolhido ---- */
function clMarketSquad(clubId,country){
  const division=(CL.market&&CL.market.division)||S.division;
  if(country) ensureBgClubMaterialized(clubId); // materializa o elenco real do clube de background
  CL.market={step:'squad',clubId,division,country};
  const sq=squad(clubId).slice().sort((a,b)=>b.f-a.f);
  const rows=sq.map(p=>`<div class="cl-mkt-p" onclick="clMarketPlayer('${clubId}','${escC(p.n)}')">
      <span class="cl-mkt-p-pos">${posLetter(p.s)}</span><span class="cl-mkt-p-n">${escC(p.n)}${p.age<=20?'*':''}</span>
      <span class="cl-mkt-p-f">${p.f}</span><span class="cl-mkt-p-v">${grp(Math.round(curConv(p.mv)*0.001))} mil</span>
    </div>`).join('');
  const backArg=country?`'${division}','${country}'`:`'${division}'`;
  overlayC(dlg('Elenco — '+clubOf(clubId).short, `<div class="cl-mkt-squad">${rows}</div>
    <div class="cl-cal-ok">${btn('Voltar','clMarketDivision('+backArg+')',{icon:'↩',cls:'cl-btn-cancel'})}</div>`,
    {w:640,bodyClass:'cl-body-gray',min:true}));
}
/* ---- detalhe do jogador + início da proposta (Dia 1: taxa) ---- */
function clMarketPlayer(clubId,name){
  const p=findP(name,clubId); if(!p) return;
  const ask=playerAsk(p,clubId);
  CL.market={step:'offer',clubId,player:name,offer:Math.round(ask/1000)*1000,negoIdx:null};
  renderMarketOffer();
}
function renderMarketOffer(){
  const M=CL.market; const p=findP(M.player,M.clubId); if(!p){ clCloseOverlay(); return; }
  const nego = M.negoIdx!=null ? S.negos[M.negoIdx] : null;
  let body;
  if(!nego || nego.stage==='fee' || nego.stage==='counterFee'){
    const hint = nego && nego.stage==='counterFee' ? `<div class="cl-mkt-counter">O clube pediu um valor a partir de ${curSym()} ${moneyDisp(nego.clubCounter)}. Ofereça esse valor (ou mais) ou desista.</div>` : '';
    body = `<div class="cl-mkt-offer">
      <div class="cl-mkt-offer-hd">${escC(p.n)} <span>(${escC(clubOf(M.clubId).short)})</span></div>
      <div class="cl-mkt-offer-row"><span>Força</span><b>${p.f}</b></div>
      <div class="cl-mkt-offer-row"><span>Valor de mercado</span><b>${curSym()} ${moneyDisp(p.mv)}</b></div>
      ${hint}
      <div class="cl-mkt-offer-row"><span>Sua proposta (taxa)</span>
        <span class="cl-money-field"><span class="cl-money-cur">${curSym()}</span>
          <input class="cl-money-in" id="cl-mkt-fee" inputmode="numeric" placeholder="0" value="${M.offer?moneyDisp(M.offer):''}" oninput="var t=parseInt(this.value.replace(/\\D/g,''))||0;CL.market.offer=curParse(t);this.value=t?grp(t):''"></span></div>
      ${btn('Propor','clMarketProposeFee()',{cls:'cl-btn-mini'})}
    </div>`;
  } else if(nego.stage==='terms'){
    body = `<div class="cl-mkt-offer">
      <div class="cl-mkt-offer-hd">${escC(p.n)} — taxa acertada em ${fmt(nego.offerFee)}</div>
      <div class="cl-mkt-offer-row"><span>Salário semanal oferecido</span>
        <span class="cl-money-field"><span class="cl-money-cur">${curSym()}</span>
          <input class="cl-money-in" id="cl-mkt-sal" inputmode="numeric" placeholder="0" value="${nego.salary?moneyDisp(nego.salary):''}" oninput="var t=parseInt(this.value.replace(/\\D/g,''))||0;S.negos[${M.negoIdx}].salary=curParse(t);this.value=t?grp(t):''"></span></div>
      <div class="cl-mkt-offer-row"><span>Papel no elenco</span>
        <select class="cl-mkt-sel" onchange="S.negos[${M.negoIdx}].role=this.value">
          ${['Jogador Chave','Titular Regular','Rotação','Jovem da Base'].map(r=>`<option ${nego.role===r?'selected':''}>${r}</option>`).join('')}
        </select></div>
      ${btn('Negociar termos','clMarketProposeTerms()',{cls:'cl-btn-mini'})}
    </div>`;
  } else if(nego.stage==='verdict'){
    const counterMsg = nego.agentCounter ? `<div class="cl-mkt-counter">Empresário pede ${fmt(nego.agentCounter)}/sem pra fechar.</div>
      ${btn('Aceitar contraproposta','clMarketAcceptCounter()',{cls:'cl-btn-mini'})}` : '';
    body = `<div class="cl-mkt-offer">
      <div class="cl-mkt-offer-hd">${escC(p.n)} — pronto pra fechar!</div>
      <div class="cl-mkt-offer-row"><span>Taxa</span><b>${fmt(nego.offerFee)}</b></div>
      <div class="cl-mkt-offer-row"><span>Salário</span><b>${fmt(nego.salary)}/sem</b></div>
      ${counterMsg}
      ${btn('Fechar negócio','clMarketFinalize()',{cls:'cl-btn-ok'})}
    </div>`;
  } else {
    body = `<div class="cl-mkt-offer"><div class="cl-mkt-offer-hd">${escC(p.n)}</div><div class="cl-mkt-counter">${escC(nego.status==='recusada'?'Negociação recusada.':'Negociação encerrada.')}</div></div>`;
  }
  overlayC(dlg('Fazer proposta', body+`<div class="cl-cal-ok">${btn('Voltar','clMarketSquad(\''+M.clubId+'\')',{icon:'↩',cls:'cl-btn-cancel'})}</div>`,
    {w:560,bodyClass:'cl-body-gray',min:true}));
}
function clMarketProposeFee(){ const M=CL.market;
  if(M.negoIdx==null) M.negoIdx=startNego(M.clubId,M.player,M.offer);
  else S.negos[M.negoIdx].offerFee=M.offer;
  const r=clubRespond(S.negos[M.negoIdx]);
  toastC(r.msg); renderMarketOffer();
}
function clMarketProposeTerms(){ const M=CL.market;
  const r=agentRespond(S.negos[M.negoIdx]); toastC(r.msg); renderMarketOffer();
}
function clMarketAcceptCounter(){ const M=CL.market; const n=S.negos[M.negoIdx];
  if(n.agentCounter) n.salary=n.agentCounter; renderMarketOffer();
}
function clMarketFinalize(){ const M=CL.market;
  const r=finalizeTransfer(M.negoIdx);
  toastC(r.msg);
  if(r.ok){ saveV3(); clCloseOverlay(); cdraw(); } else renderMarketOffer();
}

/* ---- Jogador > Leilão de jogadores (compra direta, sem regatear) ---- */
function clAuctionScreen(){ CL.menu=null;
  const st=transferWindowStatus();
  if(!st.open){ toastC(windowClosedMsg()); return; }
  const lots=((S.auctions&&S.auctions.lots)||[]).filter(l=>l.status==='open');
  const rows=lots.map(l=>{ const p=findP(l.player,l.sellerId); if(!p) return ''; const c=clubOf(l.sellerId);
    const mine=l.leader==='me';
    return `<div class="cl-auc-row ${mine?'me':''}">
      <div class="cl-auc-r1">
        <span class="cl-auc-club" style="${clubStripe(c)}">${clubLink(l.sellerId,c.short)}</span>
        <span class="cl-auc-p-pos">${posLetter(p.s)}</span><span class="cl-auc-p-n">${escC(p.n)}</span>
        <span class="cl-auc-p-f">${p.f}</span>
        <span class="cl-auc-price">${moneyDisp(l.bid)}</span>
      </div>
      <div class="cl-auc-r2">
        <span class="cl-auc-lead ${mine?'me':'cpu'}">${mine?'✅ Você na frente':'🔨 CPU na frente'}</span>
        <span class="cl-auc-disp" title="clubes disputando">👥 ${l.interest}</span>
        <span class="cl-auc-rounds" title="rodadas restantes">⏳ ${l.roundsLeft}</span>
        ${btn(mine?'Aumentar lance':'Cobrir',`clAuctionBidPrompt('${l.sellerId}','${escC(l.player)}')`,{cls:'cl-btn-mini'})}
      </div>
    </div>`; }).join('') || '<div class="cl-mkt-counter">Sem jogadores em leilão agora — volta em breve.</div>';
  overlayC(dlg('Leilão de jogadores', `<div class="cl-auc-head">Cada jogador tem vários clubes disputando. Para levar, <b>cubra a maior oferta</b> antes das rodadas acabarem — se seu lance ficar abaixo do que a concorrência topa pagar, ela cobre na rodada seguinte.</div><div class="cl-auc">${rows}</div>
    <div class="cl-cal-ok">${btn('Fechar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}</div>`,
    {w:700,bodyClass:'cl-body-gray',min:true}));
}
/* dá/aumenta o lance num lote — abre um input de valor (precisa superar o maior lance atual) */
function clAuctionBidPrompt(sellerId,player){
  const id=sellerId+'|'+player;
  const lot=((S.auctions&&S.auctions.lots)||[]).find(l=>l.id===id && l.status==='open');
  const p=findP(player,sellerId); if(!lot||!p){ toastC('Esse lote não está mais disponível.'); return; }
  const c=clubOf(sellerId);
  const suggest=Math.round(lot.bid + Math.max(50000, lot.bid*0.08));
  overlayC(dlg('Dar lance', `<div class="cl-jobmodal">
    <div class="cl-jobmodal-msg">Lance por <b>${escC(p.n)}</b> (${posLetter(p.s)}, força ${p.f}) do <b style="${clubStripe(c)};padding:2px 6px;border-radius:3px">${escC(c.short)}</b>.<br>
      Maior lance atual: <b>${curSym()} ${moneyDisp(lot.bid)}</b> ${lot.leader==='me'?'(seu)':'(concorrência)'} · 👥 ${lot.interest} clubes · ⏳ ${lot.roundsLeft} rodada(s)<br>
      Seu caixa: <b>${curSym()} ${moneyDisp(S.budget)}</b></div>
    <div class="cl-auc-bidrow"><span class="cl-auc-cur">${curSym()}</span><input id="cl-auc-bid-in" class="cl-input cl-auc-bid-in" inputmode="numeric" value="${suggest}" onkeydown="if(event.key==='Enter')clAuctionBidGo('${sellerId}','${escC(player)}')"></div>
    <div class="cl-auc-bidhint">Precisa ser maior que ${moneyDisp(lot.bid)}. Para <b>garantir</b>, ofereça acima do que a concorrência topa pagar.</div>
    <div class="cl-jog-actions">${btn('Confirmar lance',`clAuctionBidGo('${sellerId}','${escC(player)}')`,{icon:'🔨',cls:'cl-btn-ok'})}${btn('Cancelar','clAuctionScreen()',{icon:'✖',cls:'cl-btn-cancel'})}</div>
  </div>`, {w:480,bodyClass:'cl-body-gray',min:true}));
}
function clAuctionBidGo(sellerId,player){
  const el=document.querySelector('#cl-auc-bid-in');
  const amount=el? parseInt((el.value||'').replace(/\D/g,''),10)||0 : 0;
  const r=placeAuctionBid(sellerId+'|'+player, amount);
  toastC(r.msg);
  if(r.ok){ saveV3(); clAuctionScreen(); } // volta pra lista já com o lance atualizado
}


function panFinancas(){
  const sq=squad(CL.clubId);
  const totalSalaryPerWeek = sq.reduce((s,p)=>s+(p.contract?.salary||0),0);
  const totalSalaryPerSeason = totalSalaryPerWeek * 52; // 52 semanas na temporada

  // totais da temporada "até agora" vêm de S.seasonTotals — um acumulador SEM cap (ver
  // pushFinanceEntry). Importante: NÃO somar isso a partir de S.finances, que é só um log
  // das últimas 12 transações pro histórico recente — somar por ali fazia o total "esquecer"
  // salário/bônus/receita de qualquer rodada mais antiga que a 12ª mais recente.
  const st=S.seasonTotals||{income:0,salaries:0,bonuses:0,playerSales:0,playerPurchases:0,stadium:0};
  const totalGate=st.income, totalSalaries=st.salaries, totalBonuses=st.bonuses,
        totalPlayerSales=st.playerSales, totalPlayerPurchases=st.playerPurchases, totalStadium=st.stadium||0;
  const financesLog = [];
  (S.finances||[]).forEach(f=>{ if(f.log) financesLog.push(...f.log); });

  const totalIncome = totalGate + totalPlayerSales;
  const totalExpenses = totalSalaries + totalBonuses + totalPlayerPurchases + totalStadium;
  const currentBalance = totalIncome - totalExpenses;

  const R=(l,v)=>`<div class="cl-fin-row"><span>${l}</span><b>${grp(v)}</b></div>`;

  // renderizar histórico de transações recentes
  const recentLogs = financesLog.slice(0,8).map(log=>`<div class="cl-fin-log-item">${escC(log)}</div>`).join('');

  return `<div class="cl-fin">
    <div class="cl-fin-row cl-fin-h"><span>Temporada</span><b>${S.season}</b><span style="font-size:12px;color:#aaa">Rodada ${S.round}/${S.sched.length}</span></div>
    <div class="cl-fin-sec">Receitas (até agora)</div>
    ${R('Bilhetes',totalGate)}${R('Jogadores vendidos',totalPlayerSales)}${R('Prémios',0)}
    <div class="cl-fin-sec">Despesas (até agora)</div>
    ${R('Salários',totalSalaries)}${R('Bônus jogadores',totalBonuses)}${R('Jogadores comprados',totalPlayerPurchases)}${R('Bancadas',totalStadium)}${R('Juros',0)}
    <div class="cl-fin-tot">${R('Total de receitas',totalIncome)}${R('Total de despesas',totalExpenses)}${R('Saldo até agora',currentBalance)}</div>
    <div class="cl-fin-foot">
      <div class="cl-fin-row big"><span>Salários (por semana)</span><b>${grp(totalSalaryPerWeek)}</b></div>
      <div class="cl-fin-row big"><span>Salários (temporada)</span><b>${grp(totalSalaryPerSeason)}</b></div>
      <div class="cl-fin-row big2"><span>Dinheiro em caixa</span><b>${curSym()} ${moneyDisp(S.budget)}</b></div>
      <div class="cl-fin-row"><span>Preço dos bilhetes</span><b>${CL.ticket} reais</b></div>
      ${recentLogs ? `<div style="margin-top:20px;border-top:1px solid #2a4a2a;padding-top:12px"><div style="font-size:13px;color:#aaa;margin-bottom:8px">Transações recentes:</div>${recentLogs}</div>` : ''}
      ${(S.financeHistory&&S.financeHistory[CL.clubId]&&S.financeHistory[CL.clubId].length) ? `<div style="margin-top:20px;border-top:1px solid #2a4a2a;padding-top:12px">
        <div style="font-size:13px;color:#aaa;margin-bottom:8px">Histórico de temporadas encerradas:</div>
        ${btn('Ver histórico completo','clFinanceHistory()',{cls:'cl-btn-mini'})}
      </div>` : ''}
    </div>
  </div>`;
}
/* ---- Finanças > histórico por temporada — resumo de receita/despesa/lucro de cada
   temporada ENCERRADA do clube atual, gravado em S.financeHistory (ver endSeason() em
   core.js), pra o treinador poder consultar mesmo depois de assumir outro clube (basta
   trocar o clubId — por padrão mostra o clube atual). Reaproveita o grid de
   .cl-seasonhist-* já usado pelo histórico de temporadas do Treinador/Equipa. ---- */
function clFinanceHistory(clubId){
  clubId = clubId || CL.clubId;
  const c=clubOf(clubId);
  const entries=((S.financeHistory&&S.financeHistory[clubId])||[]).slice().reverse();
  const head=`<div class="cl-seasonhist-row cl-seasonhist-head" style="grid-template-columns:48px 1fr 1fr 1fr 1fr">
    <span>Ano</span><span>Receita</span><span>Despesa</span><span>Lucro</span><span></span></div>`;
  const rows=entries.map(f=>{
    const income=f.income+f.playerSales, expense=f.salaries+f.bonuses+f.playerPurchases+(f.stadium||0);
    return `<div class="cl-seasonhist-row" style="grid-template-columns:48px 1fr 1fr 1fr 1fr">
      <span class="cl-seasonhist-season">${f.season}</span>
      <span>${moneyDisp(income)}</span><span>${moneyDisp(expense)}</span>
      <span style="color:${f.net>=0?'#1e9e3f':'#c0392b'};font-weight:800">${moneyDisp(f.net)}</span><span></span></div>`;
  }).join('');
  const body = entries.length ? head+rows : '<div class="cl-cup-hint">Nenhuma temporada encerrada ainda pra este clube.</div>';
  overlayC(dlg('Histórico financeiro — '+(c?c.short:'clube'), `<div class="cl-seasonhist-wrap">${body}</div>
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:600,bodyClass:'cl-body-gray',min:true}));
}
function panFinancasLog(){
  const R=(l,v)=>`<div class="cl-fin-row"><span>${l}</span><b>${grp(v)}</b></div>`;
  return (S.finances||[]).slice(0,12).map((f,i)=>{
    const log=f.log||[];
    return `<div style="margin-bottom:16px;padding:12px;background:#1a3a1a;border-radius:4px">
      <div style="color:#aaa;font-size:12px;margin-bottom:8px">Rodada ${f.round}</div>
      <div class="cl-fin-row"><span>Receita</span><b style="color:#4a9">+${moneyDisp(f.income||0)}</b></div>
      ${f.playerSales?`<div class="cl-fin-row"><span>Venda de jogador</span><b style="color:#4a9">+${grp(f.playerSales)}</b></div>`:''}
      <div class="cl-fin-row"><span>Salários</span><b style="color:#a44">-${moneyDisp(f.salaries||0)}</b></div>
      <div class="cl-fin-row"><span>Bônus</span><b style="color:#a44">-${moneyDisp(f.bonuses||0)}</b></div>
      ${f.playerPurchases?`<div class="cl-fin-row"><span>Compra de jogador</span><b style="color:#a44">-${grp(f.playerPurchases)}</b></div>`:''}
      ${f.stadium?`<div class="cl-fin-row"><span>Bancada construída</span><b style="color:#a44">-${grp(f.stadium)}</b></div>`:''}
      <div class="cl-fin-row" style="border-top:1px solid #2a4a2a;padding-top:8px;margin-top:8px"><span>Saldo</span><b style="color:${f.net>=0?'#4a9':'#a44'}">${f.net>=0?'+':''}${moneyDisp(f.net||0)}</b></div>
      ${log.length ? `<div style="font-size:12px;color:#aaa;margin-top:8px">${log.map(l=>'• '+escC(l)).join('<br>')}</div>` : ''}
    </div>`;
  }).join('');
}

/* ---- painel: SELECÇÃO (+ Jogar) ---- */
function panSeleccao(){
  const xi=xiPlayers(CL.clubId); const ok=xi.length>=11 && CL.tacticChosen;
  const escala=CL.escalacaoMode;
  const escalaBlock = !CL.tacticChosen ? '' : escala
    ? `<div class="cl-sel-escala">
        <div class="cl-sel-escala-note">Toque num titular (T) no elenco à esquerda pra marcar, depois num reserva da mesma posição pra trocar.</div>
        ${btn('Concluído','clToggleEscalacao()',{icon:'✔',cls:'cl-btn-mini'})}
      </div>`
    : '';

  // formações disponíveis com atalhos — estilo vintage RetroFoot98
  const formKeys = Object.keys(FORMATIONS);
  const formationsBlock = `<div class="cl-sel-formations">
    <div style="color:#aaa;font-size:12px;margin-bottom:10px">Formações:</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:340px">
      ${formKeys.map((f,i)=>{
        const isSelected = CL.formation===f;
        const btnStyle = isSelected
          ? 'border:2px solid;border-color:#fff #111 #111 #fff;background:#2f8f2f;color:#fff;font-weight:700'
          : 'border:2px solid;border-color:#999 #333 #333 #999;background:#ccc;color:#000;font-weight:700';
        return `<button style="padding:8px 6px;text-align:center;font-size:13px;cursor:pointer;${btnStyle}" onclick="clSelFormation('${f}');cdraw()" title="Tecla ${FKEY[f]}">${escC(f)}<br><small style="font-size:10px;opacity:.7">${FKEY[f]}</small></button>`;
      }).join('')}
    </div>
  </div>`;

  return `<div class="cl-sel">
    <div class="cl-sel-note">${CL.tacticChosen?`Tática <b>${escC(CL.formation)}</b> · onze <b>${xi.length}/11</b>.<br>Titulares marcados com <b class="cl-rmark t" style="display:inline-flex">T</b> na lista.`:'Escolha a tática para liberar o <b>Jogar</b>.'}</div>
    ${formationsBlock}
    ${escalaBlock}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px;max-width:320px">
      ${btn('Alterar Escalação','clToggleEscalacao()',{icon:'⇄',cls:'cl-btn-ok',dis:!CL.tacticChosen})}
      ${btn('Jogar','clJogar()',{icon:'⚽',cls:'cl-btn-ok',dis:!ok})}
    </div>
  </div>`;
}
/* ---- troca de titular ANTES da partida, direto na lista de elenco (à esquerda) —
   diferente da troca AO VIVO (liveSubPick/liveDoSub, limitada a 3 e só durante a
   partida): aqui é livre. Fluxo: toca no titular (marca), toca num reserva da
   mesma posição (pede confirmação num popup), confirma. ---- */
function clToggleEscalacao(){ CL.escalacaoMode=!CL.escalacaoMode; CL.preSubOut=null; CL.preSubIn=null; cdraw(); }
function clEscalaPick(name){
  const xiSet=new Set(S.xi||[]);
  if(xiSet.has(name)){ CL.preSubOut=(CL.preSubOut===name?null:name); CL.preSubIn=null; cdraw(); return; }
  if(!CL.preSubOut){ toastC('Toque primeiro num titular (T) pra substituir.'); return; }
  const outP=findP(CL.preSubOut,CL.clubId), inP=findP(name,CL.clubId);
  if(!outP||!inP) return;
  if(inP.suspended>0||inP.injuredMatches>0){ toastC('Esse jogador não está disponível.'); return; }
  CL.preSubIn=name;
  // troca livre entre qualquer posição (ex: colocar um meia no lugar de um zagueiro
  // machucado) — antes travava com "só mesma posição", forçando o time a jogar com um a
  // menos mesmo tendo reservas disponíveis noutra posição. Só avisa quando é fora de
  // posição, não impede mais.
  const offPos=outP.s!==inP.s;
  overlayC(dlg('Trocar titular', `<div class="cl-escala-confirm">Você quer trocar <b>${escC(outP.n)}</b> por <b>${escC(inP.n)}</b>?
    ${offPos?`<div class="cl-escala-warn">⚠ ${escC(inP.n)} joga de ${posLetter(inP.s)} — fora da posição de ${posLetter(outP.s)}</div>`:''}</div>
    <div class="cl-jog-actions">${btn('Sim','clEscalaDoSwap()',{icon:'✔',cls:'cl-btn-ok'})}${btn('Desistir','clEscalaCancel()',{icon:'✖',cls:'cl-btn-cancel'})}</div>`,
    {w:420,bodyClass:'cl-body-gray',min:true}));
}
function clEscalaDoSwap(){
  if(!CL.preSubOut || !CL.preSubIn){ clCloseOverlay(); return; }
  S.xi=(S.xi||[]).map(n=>n===CL.preSubOut?CL.preSubIn:n);
  toastC(CL.preSubIn.split(' ').slice(-1)[0]+' entrou no lugar de '+CL.preSubOut.split(' ').slice(-1)[0]+' na escalação.');
  CL.preSubOut=null; CL.preSubIn=null;
  saveV3(); clCloseOverlay(); cdraw();
}
function clEscalaCancel(){ CL.preSubOut=null; CL.preSubIn=null; clCloseOverlay(); cdraw(); }
function clJogar(){
  if(CL._seatContext){ clSeatPlay(); return; } // hotseat: "Jogar" na tela do assento inicia a partida dele
  if(!CL.tacticChosen){ toastC('Escolha a tática no menu Seleccionar primeiro.'); CL.tab='seleccao'; cdraw(); return; }
  // semana de avanço de copa com partida do clube pendente: joga a copa primeiro, só
  // depois libera a rodada — ver pendingUserCupMatches/clCupResultContinue. Se houver
  // mais de uma competição pendente na mesma semana (ex: Copa do Brasil + Libertadores),
  // jogamos só a PRIMEIRA agora — ao voltar pra tela principal, pendingUserCupMatches()
  // já não vai mais incluir essa (foi resolvida), e o próximo clique em "Jogar" pega a
  // seguinte. Isso garante que o jogador sempre passa pela tela de escalação de novo
  // antes de cada partida, mesmo dentro da mesma rodada/semana — nunca encadeamos duas
  // partidas ao vivo direto uma atrás da outra. Vale pros dois modos: online já vem
  // filtrado (pendingUserCupMatches exclui confronto humano x humano da mesma sala,
  // resolvido em segundo plano igual sempre foi).
  const cupQueue=pendingUserCupMatches();
  if(cupQueue.length){ startCupLiveMatch(cupQueue[0]); return; }
  // nenhuma partida de copa pra JOGAR nesta rodada — mas pode ter rodada de copa
  // rolando de competições das quais o usuário não participa (ou já foi eliminado);
  // oferece assistir, uma competição de cada vez, antes de liberar a rodada de liga.
  // cupSpectateCandidates() não marca nada como "resolvido" (assistir é só visual, ver
  // startCupSpectate) — sem esse filtro, a mesma competição seria oferecida de novo pra
  // sempre depois de "Jogar" voltar pra tela principal; CL._spectatedKeysThisRound lembra
  // o que já foi mostrado (assistido ou pulado) nesta leva, até a rodada de liga rolar.
  const spectateQueue=cupSpectateCandidates().filter(c=>!(CL._spectatedKeysThisRound||[]).includes(c.key));
  if(spectateQueue.length){ CL._pendingSpectateQueue=spectateQueue.slice(1); askSpectate(spectateQueue[0]); return; }
  CL._spectatedKeysThisRound=null;
  if(CL.online){ onlineMarkReady(); return; }
  startLiveRound();
}
/* ---- MODO ESPECTADOR: assistir a uma rodada de copa de fora, sem participar —
   pergunta antes (Sim/Pular), e se aceitar mostra a partida (ou partidas, se for
   fase de grupos com vários jogos na mesma rodada) exatamente como um participante
   veria, só que nenhuma das duas equipes é controlada pelo usuário: motor roda
   sozinho, sem pênalti/lesão/substituição interativos (ver liveTick — só pausa pra
   modal quando `m.user` é verdadeiro, nunca é o caso aqui). Não escreve NADA no
   estado — quem resolve de verdade a partida continua sendo o avanço em segundo
   plano (advanceCupBracket/advanceGroupStageRound), que roda pouco depois; a seed
   usada aqui é EXATAMENTE a mesma que ele vai usar, então o placar assistido bate
   com o que fica gravado de verdade. */
function askSpectate(cand){
  CL._spectateCand=cand;
  // Na RESENHA (item 1) assistir a rodada de copa é OBRIGATÓRIO — assim ninguém pula a rodada e
  // fica adiantado; todos avançam juntos. O "Pular" só existe no solo (ou, no futuro, quando a
  // rodada é de um jogador de OUTRO país com calendário diferente — cand.crossCalendar).
  const mandatory = CL.online && !cand.crossCalendar;
  const actions = mandatory
    ? btn('Assistir','clSpectateYes()',{icon:'✔',cls:'cl-btn-ok'})
    : `${btn('Assistir','clSpectateYes()',{icon:'✔',cls:'cl-btn-ok'})}${btn('Pular','clSpectateNo()',{icon:'✖',cls:'cl-btn-cancel'})}`;
  const prompt = mandatory
    ? 'Tem uma rodada de copa rolando na Resenha — assista ao vivo pra todos seguirem na mesma rodada.'
    : 'Tem uma rodada rolando agora — quer assistir ao vivo?';
  overlayC(dlg(COMP_DEFS[cand.key].name, `
    <div class="cl-res"><div class="cl-live-cup-top" style="margin:-4px -4px 14px">${trophyImg(cand.key,48)}
      <div class="cl-live-cup-name">${escC(COMP_DEFS[cand.key].name)}</div></div>
    <div class="cl-res-verd">${prompt}</div>
    <div class="cl-cal-ok">${actions}</div></div>`,
    {w:480,bodyClass:'cl-body-green'}));
}
function clSpectateYes(){ clCloseOverlay(); const cand=CL._spectateCand; CL._spectateCand=null; startCupSpectate(cand); }
function clSpectateNo(){ clCloseOverlay(); const cand=CL._spectateCand; CL._spectateCand=null; markSpectateHandled(cand.key); advanceSpectateQueue(); }
function markSpectateHandled(key){
  CL._spectatedKeysThisRound=CL._spectatedKeysThisRound||[];
  if(!CL._spectatedKeysThisRound.includes(key)) CL._spectatedKeysThisRound.push(key);
}
/* nunca encadeia direto pra rodada de liga daqui — mesmo princípio do mata-mata de copa
   (ver clCupResultContinue): depois de assistir (ou pular) uma competição, sempre volta
   pra tela principal e exige um novo clique em "Jogar" antes de continuar, mesmo que
   ainda sobre outra competição pra assistir ou já esteja tudo resolvido. */
function advanceSpectateQueue(){
  const q=CL._pendingSpectateQueue||[];
  if(q.length){ CL._pendingSpectateQueue=q.slice(1); askSpectate(q[0]); return; }
  CL._pendingSpectateQueue=null;
  CL.screen='main'; cdraw();
}
/* monta a(s) partida(s) da rodada ATUAL da competição indicada, todas com user:false
   (motor roda sozinho, sem pausar pra modal nenhum) — usa a MESMA fórmula de seed que
   advanceCupBracket/advanceGroupStageRound vão usar pra resolver de verdade essa
   mesma rodada em segundo plano (ver advancePendingCups), pro placar assistido bater
   exatamente com o que fica gravado. */
function startCupSpectate(cand){
  const key=cand.key, c=S.cups[key];
  const fixtures=[];
  if(cand.stage==='bracket'){
    const b = key==='copaBrasil' ? c : c.bracket;
    const roundLabel = key==='copaBrasil' ? ('copaBrasil-r'+b.round) : (key+'-r'+b.round);
    (b.ties||[]).forEach(t=>{ fixtures.push({h:t.h,a:t.a,seed:hashSeed(S.seed,'cup',roundLabel,t.h,t.a)}); });
  } else {
    const mg=c.group, roundLabel=key+'-grupo-r'+mg.round;
    Object.values(mg.groups).forEach(g=>{
      (g.sched[mg.round]||[]).forEach(([h,a])=>{
        if(h==null||a==null) return;
        fixtures.push({h,a,seed:hashSeed(S.seed,roundLabel,g.label,h,a)});
      });
    });
  }
  if(!fixtures.length){ markSpectateHandled(key); advanceSpectateQueue(); return; } // nada pra assistir agora (raro)
  const matches=fixtures.map(f=>buildLiveMatchObject(f.h,f.a,f.seed,{user:false,div:key}));
  const RL={ jornada:S.round+1, minute:0, half:1, done:false, sel:matches.length===1?0:null, subOpen:false,
    matches, cup:{key, stage:cand.stage, spectate:true} };
  RL.maxMin=Math.max(94,...matches.map(m=>m.events.length?m.events[m.events.length-1].min:90));
  CL.live=RL; CL.screen='live'; cdraw(); CL._liveTimer=setTimeout(liveTick,650);
}
function finishCupSpectate(){
  const RL=CL.live;
  toastC('Rodada da '+COMP_DEFS[RL.cup.key].short+' assistida!');
  markSpectateHandled(RL.cup.key);
  CL.live=null; CL.screen='main'; cdraw();
  advanceSpectateQueue();
  // se a fase virou 'running' enquanto eu assistia (borda perdida pelo guard CL.screen==='live'),
  // destrava a rodada de liga ao terminar de assistir — só age se não houver outra copa na fila.
  if(CL.online && typeof onlineRecoverRunRound==='function') onlineRecoverRunRound();
}
/* ---------- PARTIDA AO VIVO (estilo RetroFoot98: placar por divisões) ---------- */
function attendanceFor(homeId,rnd){
  const homeClub=(typeof clubOf==='function')?clubOf(homeId):null; const homeOv=(homeClub&&homeClub.overall)||70;
  // CPU: capacidade e ingresso proporcionais ao porte do clube (não mais aleatório puro)
  const cap=(homeId===CL.clubId && S.stadium)?S.stadium.capacity:realStadiumCapacity(homeOv);
  const price=(homeId===CL.clubId)?(CL.ticket||levelTicketPrice(homeOv)):levelTicketPrice(homeOv);
  const tbl=S.table[homeId]||{Pts:0,P:0}; const form=(tbl.P?tbl.Pts/(tbl.P*3):0.5);       // momento do time (0..1)
  const priceFactor=Math.max(0.28, Math.min(1, 1.25 - price/22));                            // ingresso alto => menos gente
  const momFactor=0.6+form*0.7;                                                              // time em alta => mais gente
  const fill=Math.max(0.12, Math.min(0.99, (0.45*priceFactor + 0.35*momFactor + rnd()*0.2)));
  return { att:Math.round(cap*fill), price, cap };
}
/* monta um objeto de partida pra RL.matches — extraído de dentro de startLiveRound() pra
   poder ser reusado por uma partida avulsa de copa (ver startCupLiveMatch), sem duplicar
   a lógica de gerar eventos/público/árbitro. */
function buildLiveMatchObject(h,a,seed,opts){
  opts=opts||{};
  const rnd=rngFrom(seed);
  const ev=simEventsC(h,a,seed); const gate=attendanceFor(h,rnd);
  return { h,a,hg:0,ag:0,idx:0,events:ev.events,att:gate.att,price:gate.price,cap:gate.cap,
    ref:REFS_C[Math.floor(rnd()*REFS_C.length)], goals:[], incidents:[], fhg:ev.hg, fag:ev.ag, perf:ev.perf,
    user:opts.user!==undefined?opts.user:(h===CL.clubId||a===CL.clubId), div:opts.div };
}
function startLiveRound(){
  fixUserXIAvailability(); // segunda camada de proteção: nunca deixa suspenso/lesionado marcado como titular
  // Resenha (online): guarda a escalação que EU de fato uso nesta rodada pro meu clube —
  // é o que outros clientes vão enxergar como "última escalação conhecida" desse clube
  // (ver availableXI) caso eu não confirme a tempo numa rodada futura e ela expire sozinha.
  if(CL.online && CL.humans && CL.humans[CL.clubId]){ S.clubXI=S.clubXI||{}; S.clubXI[CL.clubId]=(S.xi||[]).slice(); S.clubTactic=S.clubTactic||{}; S.clubTactic[CL.clubId]=S.tactic||"equilibrado";
    if(typeof NET!=='undefined' && NET.publishLineup) NET.publishLineup(S.clubXI[CL.clubId], S.clubTactic[CL.clubId]); } // publica minha escalação pros outros clientes (sim. de ausente)
  CL.subPanelOpen=false; CL.subsUsed=0; CL.liveDivOpen=null; // accordion reabre na divisão do usuário a cada rodada
  const fx=(S.sched[S.round])||[]; const seedBase=hashC('rnd'+S.season+'-'+S.round);
  const RL={ jornada:S.round+1, minute:0, half:1, done:false, sel:null, subOpen:false, matches:[] };
  fx.forEach(([h,a],i)=>{ const seed=(seedBase+hashC(h)+hashC(a))>>>0;
    RL.matches.push(buildLiveMatchObject(h,a,matchSeed(h,a),{div:S.division})); });
  // as outras 3 divisões rodam junto, em segundo plano, igual ao clássico (as 4 divisões
  // ao mesmo tempo na mesma tela) — mesmo motor de simulação, só sem pausa interativa
  // (nunca é o time do usuário, então pênalti/lesão nessas partidas resolvem sozinhos).
  if(S.otherDivs){ Object.keys(S.otherDivs).forEach(d=>{
    const od=S.otherDivs[d]; const oFx=od.sched[S.round % od.sched.length]||[];
    const oSeedBase=hashC('rnd'+S.season+'-'+S.round+'-'+d);
    oFx.forEach(([h,a])=>{ const seed=(oSeedBase+hashC(h)+hashC(a))>>>0;
      RL.matches.push(buildLiveMatchObject(h,a,seed,{user:false,div:d})); }); }); }
  RL.maxMin=Math.max(94,...RL.matches.map(m=>m.events.length?m.events[m.events.length-1].min:90));
  CL.live=RL; CL.screen='live'; cdraw(); CL._liveTimer=setTimeout(liveTick,650);
}
/* ---- PARTIDA DE COPA AO VIVO — mesma maquinaria de startLiveRound/liveTick/scLive/
   liveModalHTML (pênalti, lesão, substituições), só que pra UMA partida avulsa, fora do
   calendário de liga. RL.sel=0 já abre o modal da partida direto (só tem 1 jogo na lista,
   então a lista agrupada por divisão fica vazia — inofensivo). Ver finishCupLiveMatch pro
   fechamento, que NÃO passa por finishLiveRound/playRound (aquilo é só pra liga). ---- */
function startCupLiveMatch(pending){
  fixUserXIAvailability();
  // Resenha (online): grava a escalação que EU de fato uso nesta partida pro meu clube,
  // igual startLiveRound() já faz pra rodada de liga — é o que outros clientes vão
  // enxergar como "última escalação conhecida" (ver availableXI) se meu clube precisar
  // ser simulado em segundo plano antes de eu jogar a próxima partida de liga.
  if(CL.online && CL.humans && CL.humans[CL.clubId]){ S.clubXI=S.clubXI||{}; S.clubXI[CL.clubId]=(S.xi||[]).slice(); S.clubTactic=S.clubTactic||{}; S.clubTactic[CL.clubId]=S.tactic||"equilibrado";
    if(typeof NET!=='undefined' && NET.publishLineup) NET.publishLineup(S.clubXI[CL.clubId], S.clubTactic[CL.clubId]); } // publica minha escalação pros outros clientes (sim. de ausente)
  CL.subPanelOpen=false; CL.subsUsed=0;
  const seed=hashSeed(S.seed,'cupmatch',pending.key,pending.stage,S.round,pending.h,pending.a);
  const m=buildLiveMatchObject(pending.h,pending.a,seed,{user:true,div:pending.key});
  // sel:null (não 0): começa mostrando o CONFRONTO (placar + estágio da copa), sem o modal de
  // acontecimentos já aberto por cima escondendo o jogo. O modal abre sozinho no intervalo e nos
  // pênaltis (momentos decisivos), e o usuário pode tocar no confronto pra ver os lances — igual à liga.
  const RL={ jornada:S.round+1, minute:0, half:1, done:false, sel:null, subOpen:false, matches:[m], cup:pending };
  RL.maxMin=Math.max(94, m.events.length?m.events[m.events.length-1].min:90);
  CL.live=RL; CL.screen='live'; cdraw(); CL._liveTimer=setTimeout(liveTick,650);
}
function liveTick(){ const RL=CL.live; if(!RL||RL.done||RL.paused) return;
  RL.minute+=1;
  let pendingPenalty=null, pendingInjury=null;
  RL.matches.forEach(m=>{ while(m.idx<m.events.length && m.events[m.idx].min<=RL.minute){ const e=m.events[m.idx];
    const isUserSide = m.user && ((e.side==='H'&&m.h===CL.clubId)||(e.side==='A'&&m.a===CL.clubId));
    if(e.type==='penalti' && isUserSide && !e._resolved){ pendingPenalty={m,e}; break; } // não consome ainda — pausa antes, resolve pelo modal
    if(e.type==='lesao' && isUserSide && !e._resolved){ pendingInjury={m,e}; break; } // idem — precisa escolher quem entra
    m.idx++;
    if(e.type==='gol'){ if(e.side==='H')m.hg++; else m.ag++; m.goals.push({min:e.min,side:e.side,scorer:e.scorer,team:e.team});
      m.incidents.push({min:e.min,type:'gol',side:e.side,player:e.scorer}); }
    else if(e.type==='penalti'){ if(e.scored){ if(e.side==='H')m.hg++; else m.ag++; m.goals.push({min:e.min,side:e.side,scorer:e.scorer,team:e.team}); }
      m.incidents.push({min:e.min,type:'penalti',side:e.side,player:e.scorer,scored:e.scored}); }
    else if(e.type==='cartao'){ m.incidents.push({min:e.min,type:'cartao',side:e.side,player:e.player,cardType:e.cardType,reason:e.reason}); }
    else if(e.type==='lesao'){ m.incidents.push({min:e.min,type:'lesao',side:e.side,player:e.player,severity:e.severity}); }
  } });
  updateLive();
  if(pendingPenalty){ openPenaltyModal(pendingPenalty.m, pendingPenalty.e); return; }
  if(pendingInjury){ openInjuryModal(pendingInjury.m, pendingInjury.e); return; }
  if(RL.minute>=45 && !RL.halftimeDone){ RL.halftimeDone=true;
    const ui=RL.matches.findIndex(m=>m.user);
    if(ui>=0 && (!CL.options || CL.options.subsIntervalo!=='Não')){ RL.paused=true; RL.sel=ui;
      if(CL.online) startHalftimeCountdown(); // Resenha: intervalo dura no máximo 10s (mantém todos sincronizados)
      cdraw(); return; } }
  if(RL.minute>=RL.maxMin){
    // mata-mata empatado, jogado ao vivo pelo próprio usuário: prorrogação e pênaltis
    // acontecem AO VIVO na tela dele (não são resolvidos instantaneamente por trás) —
    // só se aplica à partida que ele mesmo está jogando (RL.cup, sem spectate); partidas
    // de fundo/espectador continuam resolvendo em segundo plano, sem essa pausa dramática.
    if(RL.cup && RL.cup.stage==='bracket' && !RL.cup.spectate){
      const m=RL.matches[0];
      if(m.hg===m.ag){
        if(!RL.cup.wentExtra){ startExtraTime(m); return; }
        if(!RL.cup.wentPens){ startPenaltyShootout(m); return; }
        // disputa de pênaltis ainda rolando (RL.pens existe mas finalH/finalA só são
        // calculados em finishPenaltyShootout, quando de fato decide) — nunca finaliza
        // a partida no meio, mesmo que algum tick perdido chegue até aqui.
        if(RL.pens && RL.pens.finalH==null) return;
      }
    }
    RL.done=true; if(RL.cup&&RL.cup.spectate) finishCupSpectate(); else if(RL.cup) finishCupLiveMatch(); else if(RL.humanSeat) finishHotseatMatch(); else finishLiveRound(); return;
  }
  const spd=({Curto:360,Médio:560,Longo:820,Ultrassônico:110,'Usain Bolt':37})[(CL.options&&CL.options.tempo)||'Usain Bolt']||37;
  const actualSpd=Math.max(12, spd / (CL.speedMult||1));
  CL._liveTimer=setTimeout(liveTick, actualSpd);
}
/* ---- PRORROGAÇÃO AO VIVO: mesma partida, mais 30min (2 tempos de 15) gerados com o
   mesmo motor (gols/cartões/lesões/pênaltis podem acontecer igual ao tempo normal — um
   pênalti do usuário aqui pausa e abre o modal normal, igual sempre). Os eventos entram
   na timeline da própria partida (deslocados +90'), então liveTick continua tocando
   normalmente — só o relógio muda de escala/rótulo (ver scLive). ---- */
function startExtraTime(m){
  const RL=CL.live;
  RL.cup.wentExtra=true;
  const roundLabel = RL.cup.key==='copaBrasil' ? ('copaBrasil-r'+RL.cup.bracket.round) : (RL.cup.key+'-r'+RL.cup.bracket.round);
  const seed=hashSeed(S.seed,'cup',roundLabel,RL.cup.tie.h,RL.cup.tie.a,'extra');
  const ev=simEventsC(m.h,m.a,seed,{extraTime:true});
  ev.events.forEach(e=>{ e.min+=90; m.events.push(e); });
  RL.extraStartMinute=RL.minute;
  RL.maxMin=m.events.length ? m.events[m.events.length-1].min : (RL.minute+34);
  toastC('⏱️ Empate! Vamos pra prorrogação.');
  cdraw();
  CL._liveTimer=setTimeout(liveTick,900);
}
/* ---- DISPUTA DE PÊNALTIS AO VIVO: mesma mecânica visual do pênalti batido em campo
   (modal clássico, usuário escolhe quem bate, suspense, revelação) repetida cobrança a
   cobrança, alternando os dois times — só o time do usuário (m.user) escolhe; o outro
   lado (CPU, ou o adversário do usuário) tem o cobrador escolhido automaticamente pelo
   motor (mesmo peso de força/posição de sempre) e resolve na hora, sem pausar. 5 cobranças
   normais por time; se seguir empatado, morte súbita (1 cobrança cada, decide assim que
   alguém marca e o outro não). ---- */
function startPenaltyShootout(m){
  const RL=CL.live;
  RL.cup.wentPens=true; RL.paused=true;
  RL.pens={ h:[], a:[], turn:'H' };
  toastC('🥅 Segue empatado — vai pra disputa de pênaltis!');
  cdraw();
  setTimeout(shootoutNextKick,1000);
}
function shootoutDecided(P){
  const nH=P.h.length, nA=P.a.length;
  if(nH===0 && nA===0) return false;
  // P.h/P.a guardam {name,scored} — filtra por .scored (um {scored:false} ainda é "truthy").
  const scoredH=P.h.filter(k=>k.scored).length, scoredA=P.a.filter(k=>k.scored).length;
  // FASE DE MELHOR-DE-5: decide a QUALQUER cobrança, inclusive no meio da rodada (regra oficial).
  // Assim que o time que está atrás não tiver mais como alcançar — mesmo com um lado tendo batido
  // uma vez a mais que o outro — a disputa acaba na hora, sem cobranças inúteis. Antes o código só
  // olhava quando os dois tinham batido o mesmo número (nH===nA), então numa vantagem irreversível
  // criada por uma cobrança ímpar (ex.: 4×1 com o rival tendo batido só 3) ele ainda deixava o
  // próximo bater — daí "eu já tinha ganho e meu último jogador ainda foi bater".
  if(nH<5 || nA<5){
    const remH=Math.max(0,5-nH), remA=Math.max(0,5-nA);
    return scoredH>scoredA+remA || scoredA>scoredH+remH;
  }
  // MORTE SÚBITA (os dois já bateram 5+): só decide com rodada completa (nº igual) e placar diferente.
  return nH===nA && scoredH!==scoredA;
}
/* regra oficial (IFAB): dentro da MESMA disputa, um jogador só pode bater de novo depois
   que todos os outros elegíveis do time já bateram uma vez — nunca antes disso. `pool` já
   vem sem goleiro (só bate goleiro em emergência, ver fallback abaixo); `takenNames` junta
   os nomes que já bateram NESTA disputa pro lado em questão (RL.pens.h/a). Se todo mundo
   elegível já bateu (disputa foi longe, morte súbita), reabre o ciclo do zero. */
function shootoutEligibleTakers(pool, takenNames){
  const fresh=pool.filter(p=>!takenNames.has(p.n));
  return fresh.length ? fresh : pool;
}
function shootoutNextKick(){
  const RL=CL.live; if(!RL || !RL.pens) return;
  // teto de segurança (mesmo usado em resolveDrawnKnockoutTie pro caso não-interativo):
  // decide na marra se por algum motivo passar de 20 cobranças cada — nunca deveria
  // chegar nem perto disso na prática, é só rede de proteção contra loop infinito.
  if(shootoutDecided(RL.pens) || RL.pens.h.length>=20){ finishPenaltyShootout(); return; }
  const m=RL.matches[0], side=RL.pens.turn;
  const teamId=side==='H'?m.h:m.a;
  const isUserTurn = m.user && teamId===CL.clubId;
  cdraw();
  if(isUserTurn) openShootoutPickerModal();
  else {
    const oppId=side==='H'?m.a:m.h;
    const gk=squad(oppId).find(p=>p.s==='GK')||null;
    const pool=availableXI(teamId).filter(p=>p.s!=='GK');
    const takenNames=new Set((side==='H'?RL.pens.h:RL.pens.a).map(k=>k.name));
    const eligible=shootoutEligibleTakers(pool.length?pool:availableXI(teamId), takenNames);
    const R=makeRng(hashSeed(S.seed,S.round,'pens',m.h,m.a,side,RL.pens.h.length+RL.pens.a.length));
    const taker=pickPenaltyTaker(eligible,R);
    const scored=R.random()<penaltyConvChance(taker,gk);
    setTimeout(()=>recordShootoutKick(side,taker?taker.n:null,scored),700);
  }
}
function openShootoutPickerModal(){
  const RL=CL.live;
  const list=xiPlayers(CL.clubId).filter(p=>p.s!=='GK');
  const pool=list.length?list:squad(CL.clubId).filter(p=>p.s!=='GK');
  const takenNames=new Set((RL.pens.turn==='H'?RL.pens.h:RL.pens.a).map(k=>k.name));
  const takers=shootoutEligibleTakers(pool, takenNames);
  const best=takers.slice().sort((a,b)=>b.f-a.f)[0];
  CL.penSel=best?best.n:(takers[0]&&takers[0].n)||null;
  CL.penDeadline=Date.now()+10000;
  RL.pensPicking=true;
  sfx('penalti'); cdraw();
  if(CL._penTimer) clearInterval(CL._penTimer);
  CL._penTimer=setInterval(shootoutPenaltyTick,200);
}
function shootoutPenaltyTick(){ const RL=CL.live; if(!RL||!RL.pensPicking){ clearInterval(CL._penTimer); return; }
  const left=Math.max(0,CL.penDeadline-Date.now()); const secs=Math.ceil(left/1000);
  const cd=$c('#cl-pen-count'); if(cd) cd.textContent=secs+'s';
  if(left<=0){ clearInterval(CL._penTimer); resolveShootoutKick(CL.penSel); }
}
function resolveShootoutKick(takerName){
  const RL=CL.live; if(!RL||!RL.pensPicking) return;
  if(CL._penTimer){ clearInterval(CL._penTimer); CL._penTimer=null; }
  // NÃO zera RL.pensPicking aqui — só quando a cobrança é de fato registrada em
  // recordShootoutKick(), depois do suspense+revelação. Zerar cedo demais (como antes)
  // fazia "shooting" (liveModalHTML) virar false no meio da animação, escondendo o modal
  // de suspense/revelação e mostrando por engano a barra de ação normal ("Continuar" etc)
  // — se o usuário clicasse nela, a partida seguia e terminava o mata-mata sem a disputa
  // de pênaltis ter de fato terminado (RL.pens.finalH/finalA nunca calculados), travando
  // o confronto com "pênaltis undefined×undefined" pra sempre.
  const m=RL.matches[0], side=RL.pens.turn;
  const teamId=side==='H'?m.h:m.a, oppId=side==='H'?m.a:m.h;
  const taker=findP(takerName,teamId);
  const gk=squad(oppId).find(p=>p.s==='GK')||null;
  const kickIdx=RL.pens.h.length+RL.pens.a.length;
  const R=makeRng(hashSeed(S.seed,S.round,'pens',m.h,m.a,side,kickIdx,takerName));
  const scored=R.random()<penaltyConvChance(taker,gk);
  CL.penPhase='suspense'; CL.penResultScorer=taker?taker.n:takerName; CL.penResultScored=scored;
  cdraw();
  CL._penRevealTimer=setTimeout(()=>{
    CL.penPhase='result'; sfx(scored?'penaltiGol':'penaltiPerdido'); cdraw();
    CL._penCloseTimer=setTimeout(()=>{
      CL.penPhase=null; CL.penResultScorer=null; CL.penResultScored=null;
      recordShootoutKick(side, taker?taker.n:takerName, scored);
    },2200);
  },1400);
}
function recordShootoutKick(side,takerName,scored){
  const RL=CL.live; if(!RL||!RL.pens) return;
  RL.pensPicking=false;
  (side==='H'?RL.pens.h:RL.pens.a).push({name:takerName,scored});
  RL.pens.turn = side==='H' ? 'A' : 'H';
  cdraw();
  setTimeout(shootoutNextKick,1200);
}
function finishPenaltyShootout(){
  const RL=CL.live; const P=RL.pens;
  P.finalH=P.h.filter(k=>k.scored).length; P.finalA=P.a.filter(k=>k.scored).length;
  // se bateu o teto de segurança (20 cobranças cada) ainda empatado — praticamente
  // impossível na prática — desempata pro lado de casa, só pra sempre ter um vencedor.
  if(P.finalH===P.finalA) P.finalH++;
  RL.paused=false; RL.done=true;
  finishCupLiveMatch();
}
/* ---- PÊNALTI INTERATIVO: pausa a partida, mostra o modal clássico, escolhe o batedor.
   Se não decidir em 10s, bate automaticamente com o jogador pré-selecionado (o de maior força). ---- */
function openPenaltyModal(m,e){ const RL=CL.live;
  RL.paused=true; RL.penMatch=m; RL.penEvent=e; RL.sel=RL.matches.indexOf(m);
  const list=xiPlayers(CL.clubId).filter(p=>p.s!=='GK');
  const takers=list.length?list:squad(CL.clubId).filter(p=>p.s!=='GK');
  const best=takers.slice().sort((a,b)=>b.f-a.f)[0];
  CL.penSel = best ? best.n : (takers[0]&&takers[0].n) || null;
  CL.penDeadline = Date.now()+10000;
  sfx('penalti'); cdraw();
  if(CL._penTimer) clearInterval(CL._penTimer);
  CL._penTimer=setInterval(penaltyTick, 200);
}
function penaltyTick(){ const RL=CL.live; if(!RL || !RL.penEvent){ clearInterval(CL._penTimer); return; }
  const left=Math.max(0, CL.penDeadline-Date.now());
  const secs=Math.ceil(left/1000);
  const cd=$c('#cl-pen-count'); if(cd) cd.textContent=secs+'s';
  if(left<=0){ clearInterval(CL._penTimer); resolvePenalty(CL.penSel); }
}
function penaltySelect(name){ CL.penSel=name; cdraw(); }
/* ---- resultado do pênalti: agora em 3 fases, igual ao RetroFoot98 clássico —
   1) escolhe o batedor  2) suspense (só o título, alguns segundos)
   3) revelação dramática (GOLO em vermelho / Defendeu em preto) antes de continuar. ---- */
function resolvePenalty(takerName){
  const RL=CL.live; if(!RL || !RL.penEvent) return;
  if(CL._penTimer){ clearInterval(CL._penTimer); CL._penTimer=null; }
  const e=RL.penEvent; const taker=findP(takerName,CL.clubId);
  const oppId = RL.penMatch.h===CL.clubId ? RL.penMatch.a : RL.penMatch.h;
  const gk=squad(oppId).find(p=>p.s==='GK')||null;
  const R=makeRng(hashSeed(S.seed,S.round,'pen',e.min,takerName));
  const pConv=penaltyConvChance(taker,gk);
  const scored=R.random()<pConv;
  e.scored=scored; e.scorer=taker?taker.n:e.scorer; e._resolved=true;
  CL.penPhase='suspense'; CL.penResultScorer=e.scorer; CL.penResultScored=scored;
  cdraw();
  CL._penRevealTimer=setTimeout(()=>penaltyReveal(scored,e.scorer), 1400);
}
function penaltyReveal(scored,scorer){
  CL.penPhase='result';
  sfx(scored?'penaltiGol':'penaltiPerdido');
  cdraw();
  CL._penCloseTimer=setTimeout(closePenaltyModal, 2200);
}
function closePenaltyModal(){
  const RL=CL.live; if(!RL) return;
  const scored=CL.penResultScored, scorer=CL.penResultScorer;
  toastC(scored ? `⚽ GOL! ${scorer||''} converteu o pênalti!` : `❌ ${scorer||''} desperdiçou o pênalti!`);
  RL.paused=false; RL.penMatch=null; RL.penEvent=null;
  CL.penSel=null; CL.penPhase=null; CL.penResultScorer=null; CL.penResultScored=null;
  cdraw();
  CL._liveTimer=setTimeout(liveTick,420);
}

function liveRowClick(i){ CL.live.sel=i; CL.subOut=CL.subIn=null; CL.subPanelOpen=false; cdraw(); }
function liveContinue(){ const RL=CL.live; if(!RL) return;
  CL.subPanelOpen=false;
  if(RL.paused){ clearHalftimeCountdown(); RL.paused=false; RL.halftimeLeft=null; RL.sel=RL.cup?0:null; cdraw(); CL._liveTimer=setTimeout(liveTick,320); return; }
  if(RL.cup) return; // partida avulsa de copa: só tem essa partida, não tem lista pra "voltar"
  RL.sel=null; cdraw(); }
/* INTERVALO na Resenha: no máximo 10s para fazer a substituição — se o usuário não apertar
   Continuar, avança sozinho ao fim do tempo (mantém todos os treinadores sincronizados no tempo). */
let HALFTIME_TIMER=null;
function startHalftimeCountdown(){
  clearHalftimeCountdown();
  const RL=CL.live; if(!RL) return;
  RL.halftimeLeft=10;
  HALFTIME_TIMER=setInterval(()=>{
    const rl=CL.live;
    if(!rl || !rl.paused){ clearHalftimeCountdown(); return; }
    rl.halftimeLeft=(rl.halftimeLeft!=null?rl.halftimeLeft:10)-1;
    const el=document.querySelector('.cl-ht-count'); if(el) el.textContent=Math.max(0,rl.halftimeLeft);
    if(rl.halftimeLeft<=0){ clearHalftimeCountdown(); liveContinue(); }
  }, 1000);
}
function clearHalftimeCountdown(){ if(HALFTIME_TIMER){ clearInterval(HALFTIME_TIMER); HALFTIME_TIMER=null; } }
/* ---- LESÃO: jogador do usuário se machuca em campo — pausa e pede pra escolher quem
   entra no lugar, filtrando pela MESMA posição do lesionado (com reserva de emergência
   se não sobrar ninguém daquela posição no banco). Modal clássico: barra de título com
   o nome do clube, fundo vinho, lista de opções, botão OK. ---- */
function openInjuryModal(m,e){ const RL=CL.live;
  RL.paused=true; RL.injMatch=m; RL.injEvent=e; RL.sel=RL.matches.indexOf(m);
  CL.injSel=null; sfx('lesao'); cdraw();
}
/* sempre lista TODOS os reservas disponíveis, de qualquer posição — antes só mostrava os
   da mesma posição do lesionado quando havia algum, então se um zagueiro se lesionasse o
   goleiro reserva desaparecia da lista (só reaparecia numa lesão futura sem zagueiro
   disponível), como se não pudesse ser escolhido ali. O treinador pode legitimamente
   querer escalar qualquer reserva (ex: sacrificar um atacante pra fechar a defesa); só
   ordena os da mesma posição primeiro, pra sugerir a troca mais natural sem obrigar nada. */
function injurySubOptions(e){
  const xiSet=new Set(S.xi||[]);
  const bench=squad(CL.clubId).filter(p=>!xiSet.has(p.n) && !(p.suspended>0) && !(p.injuredMatches>0)).sort(bySquadOrder);
  const samePos=bench.filter(p=>p.s===e.pos), rest=bench.filter(p=>p.s!==e.pos);
  return [...samePos, ...rest];
}
/* cor do modal de lesão = cor real do clube do jogador lesionado (mesma lógica do
   modal de pênalti, ver penaltyClubStyle) — antes ficava sempre vinho fixo. */
function injuryClubStyle(){
  const c=clubOf(CL.clubId); if(!c || !c.color) return '';
  const {col,col2}=clubColors(c);
  return `style="--inj-bg:linear-gradient(165deg,${col} 45%,${col2} 100%);--inj-fg:${txtOn(col)}"`;
}
function injurySubHTML(m,e){
  const posName={GK:'Goleiro',DEF:'Zagueiro',MID:'Meia',ATT:'Atacante'}[e.pos]||'Jogador';
  const opts=injurySubOptions(e);
  const noOpts = !opts.length;
  const rows=noOpts ? '<div class="cl-pen-row" style="cursor:default">Sem reservas disponíveis.</div>' : opts.map(p=>{
    const samePos=p.s===e.pos;
    return `<div class="cl-pen-row ${CL.injSel===p.n?'sel':''}" onclick="injurySelect('${escC(p.n)}')">
      <span class="cl-pen-pos">${posLetter(p.s)}</span><span class="cl-pen-n">${escC(p.n)}${samePos?' <span class="cl-inj-suggest">★ sugerido</span>':''}</span><span class="cl-pen-r">${p.f}</span>
    </div>`;
  }).join('');
  // sem reserva disponível (banco esgotado) -> não pode travar o jogo esperando uma escolha
  // impossível: deixa seguir com um jogador a menos, igual acontece numa expulsão.
  const actionBtn = noOpts
    ? btn('Continuar com 10 jogadores','resolveInjuryNoSub()',{icon:'➡',cls:'cl-btn-ok'})
    : btn('OK','resolveInjurySub(CL.injSel)',{icon:'✔',cls:'cl-btn-ok',dis:!CL.injSel});
  return `<div class="cl-pen-overlay"><div class="cl-inj-modal" ${injuryClubStyle()}>
    <div class="cl-inj-title"><span class="cl-inj-min">–</span><span>${escC(clubOf(CL.clubId).short)}</span></div>
    <div class="cl-inj-body">
      <div class="cl-inj-msg">${escC(e.player)} (${posName}) lesionou-se${noOpts?', mas não há reservas disponíveis':' e tem de ser substituído'}.<br>${noOpts?'O time seguirá com um jogador a menos.':'Escolha o jogador a entrar.'}</div>
      <div class="cl-pen-list">${rows}</div>
      <div class="cl-pen-btn">${actionBtn}</div>
    </div>
  </div></div>`;
}
function injurySelect(name){ CL.injSel=name; cdraw(); }
function resolveInjurySub(replacementName){
  const RL=CL.live; if(!RL || !RL.injEvent || !replacementName) return;
  const e=RL.injEvent; const rep=findP(replacementName,CL.clubId); if(!rep) return;
  const idx=(S.xi||[]).indexOf(e.player);
  if(idx>=0) S.xi[idx]=rep.n;
  e._resolved=true;
  toastC(`✚→✔ ${rep.n} entrou no lugar de ${e.player}.`);
  RL.paused=false; RL.injMatch=null; RL.injEvent=null; CL.injSel=null;
  cdraw();
  CL._liveTimer=setTimeout(liveTick,420);
}
function resolveInjuryNoSub(){
  const RL=CL.live; if(!RL || !RL.injEvent) return;
  const e=RL.injEvent; e._resolved=true;
  toastC(`✚ ${e.player} lesionou-se — sem reservas, o time seguiu com um jogador a menos.`);
  RL.paused=false; RL.injMatch=null; RL.injEvent=null; CL.injSel=null;
  cdraw();
  CL._liveTimer=setTimeout(liveTick,420);
}
function liveSubPick(side,n){ if(side==='out')CL.subOut=n; else CL.subIn=n; updateLive(); }
function liveDoSub(){ if(!CL.subOut||!CL.subIn){ toastC('Escolha um titular e um reserva.'); return; }
  if((CL.subsUsed||0)>=3){ toastC('Máximo de 3 substituições.'); return; }
  S.xi=(S.xi||[]).map(x=>x===CL.subOut?CL.subIn:x); CL.subsUsed=(CL.subsUsed||0)+1;
  toastC(CL.subIn.split(' ').slice(-1)[0]+' entrou no lugar de '+CL.subOut.split(' ').slice(-1)[0]); CL.subOut=CL.subIn=null; updateLive(); }
function txtOn(hex){ return lumin(hex)>0.58?'#111':'#fff'; }
function liveScoreCells(m){ return `<b>${m.hg}</b><b>${m.ag}</b>`; }
/* ---- accordion por divisão (ranking + jogos ao vivo): a divisão do usuário
   fica no topo e aberta por padrão; as outras começam colapsadas. ---- */
function divAccOpen(key,d){ const st=CL[key]; if(st && st[d]!=null) return st[d]; return d===S.division; }
function clToggleDivAcc(key,d){ if(!CL[key]){ CL[key]={}; DIV_ORDER.forEach(x=>CL[key][x]=(x===S.division)); } CL[key][d]=!CL[key][d];
  if(CL.screen==='classif') armClassifTimer();
  cdraw(); }
function divOrderUserFirst(){ return [S.division, ...DIV_ORDER.filter(d=>d!==S.division)]; }
function scLive(){ const RL=CL.live; if(!RL) return '';
  const rowHTML=(m,i)=>{const hc=clubOf(m.h),ac=clubOf(m.a);
    return `<div class="cl-lrow" onclick="liveRowClick(${i})">
      <span class="cl-latt">${grp(m.att)}</span>
      <span class="cl-lteam" style="${clubStripe(hc)}">${escC(hc.short)}</span>
      <span class="cl-lsc" id="cl-lm-${i}">${liveScoreCells(m)}</span>
      <span class="cl-lteam" style="${clubStripe(ac)}">${escC(ac.short)}</span>
      <span class="cl-lgoal" id="cl-lg-${i}"></span></div>`;};
  // partida(s) de copa: lista simples (não tem divisão A/B/C/D pra agrupar) — cobre tanto
  // a partida própria do usuário (uma só, modal abre sozinho) quanto o modo espectador
  // (várias partidas simultâneas da mesma rodada, nenhuma do usuário — ver startCupSpectate).
  // divisão do usuário no topo e aberta; as demais colapsadas por padrão (accordion)
  const single = RL.cup || RL.humanSeat; // partida avulsa (copa OU assento hotseat) — lista simples, sem accordion por divisão do universo primário
  const groups = single
    ? `<div class="cl-live-div open"><div class="cl-live-div-body">${RL.matches.map((m,i)=>rowHTML(m,i)).join('')}</div></div>`
    : divOrderUserFirst().map(d=>{
    const rows=RL.matches.map((m,i)=>({m,i})).filter(x=>(x.m.div||S.division)===d);
    if(!rows.length) return '';
    const open=divAccOpen('liveDivOpen',d); const mine=d===S.division;
    return `<fieldset class="cl-live-div ${open?'open':'collapsed'}">
      <legend onclick="clToggleDivAcc('liveDivOpen','${d}')"><span class="cl-live-legend-trophy">${divisionTrophyImg(d,18)||'🏆'}</span> ${escC(classifDivName(d))}${mine?' <span class="cl-acc-you">você</span>':''} <span class="cl-acc-arrow ${open?'':'closed'}">▾</span></legend>
      <div class="cl-live-div-body">${rows.map(x=>rowHTML(x.m,x.i)).join('')}</div>
    </fieldset>`;
  }).join('');
  // rótulo do estágio: prioriza pênaltis > prorrogação > fase normal da copa/liga
  const stageLabel = RL.pens ? '🥅 Disputa de pênaltis'
    : RL.extraStartMinute!=null ? '⏱️ Prorrogação'
    : RL.cup ? (RL.cup.stage==='group' ? 'Fase de grupos'
        : (RL.cup.bracket ? cupPhaseLabel(RL.cup.bracket.round, RL.cup.bracket.roundsTotal) : 'Fase eliminatória'))
      : null;
  const cupTop = RL.cup ? `<div class="cl-live-cup-top">${trophyImg(RL.cup.key,64)}
      <div class="cl-live-cup-name">${escC(COMP_DEFS[RL.cup.key].name)}</div>
      <div class="cl-live-cup-stage">${escC(stageLabel)}</div>
    </div>` : '';
  // cabeçalho da partida de assento (hotseat): nome do treinador + clube + país
  const hsTop = RL.humanSeat ? (function(){ const st=RL.humanSeat.seat; const c=clubOf(st.clubId)||{}; const fl=(typeof flagImg==='function')?flagImg(st.country):'';
    return `<div class="cl-live-cup-top"><div class="cl-live-cup-name">${escC(st.name)} · ${escC(c.short||c.name||'')}</div>
      <div class="cl-live-cup-stage">${fl} ${escC(st.country)} · ${RL.jornada}ª Jornada</div></div>`; })() : '';
  const topLabel = `${RL.jornada}ª Jornada - ${S.season}`;
  const shootoutBoard = RL.pens ? shootoutScoreboardHTML(RL) : '';
  return `<div class="cl-live">${cupTop}${hsTop}${single?'':`<div class="cl-live-top">${divisionTrophyImg(S.division,20)} ${topLabel}</div>`}
    ${RL.pens ? '' : `<div class="cl-live-clock" id="cl-liveclock" style="--pct:${liveClockPct(RL)}">${RL.extraStartMinute!=null?'<span class="cl-live-clock-lbl">PRORR.</span>':''}</div>`}
    ${shootoutBoard}
    ${groups}
    ${RL.sel!=null?`<div class="cl-live-overlay"><div class="cl-live-modal" id="cl-livemodal">${liveModalHTML(RL.matches[RL.sel])}</div></div>`:''}
  </div>`;
}
/* % do relógio circular — a prorrogação usa uma escala PRÓPRIA (34min: 30 + acréscimos),
   proporcional ao tempo real dela, em vez da escala de 94min do tempo normal. */
function liveClockPct(RL){
  if(RL.extraStartMinute!=null) return Math.min(100, Math.round((RL.minute-RL.extraStartMinute)/34*100));
  return Math.min(100, Math.round(RL.minute/94*100));
}
/* placar da disputa de pênaltis: uma linha de bolinhas por time, ✔ verde quando converte,
   ✖ vermelho quando desperdiça/defende — cresce cobrança a cobrança, igual ao clássico. */
function shootoutScoreboardHTML(RL){
  const m=RL.matches[0], hc=clubOf(m.h), ac=clubOf(m.a);
  const dot=k=>`<span class="cl-pens-dot ${k.scored?'ok':'miss'}">${k.scored?'✔':'✖'}</span>`;
  return `<div class="cl-pens-board">
    <div class="cl-pens-row"><span class="cl-pens-team" style="${clubStripe(hc)}">${escC(hc.short)}</span>
      <span class="cl-pens-dots">${RL.pens.h.map(dot).join('')}</span>
      <span class="cl-pens-score">${RL.pens.h.filter(k=>k.scored).length}</span></div>
    <div class="cl-pens-row"><span class="cl-pens-team" style="${clubStripe(ac)}">${escC(ac.short)}</span>
      <span class="cl-pens-dots">${RL.pens.a.map(dot).join('')}</span>
      <span class="cl-pens-score">${RL.pens.a.filter(k=>k.scored).length}</span></div>
  </div>`;
}
/* ficha da partida (desempenho): posse, finalizações e chances claras — reflete o novo
   motor que separa domínio do placar. Reusa a caixa do árbitro (cl-lm-ref). */
function matchStatsHTML(m){
  if(!m.perf || !m.perf.H) return '';
  const H=m.perf.H, A=m.perf.A;
  const tot=(H.poss+A.poss)||1; const hP=Math.round(100*H.poss/tot);
  const line=(lbl,hv,av)=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:1px 2px;color:#111"><b style="min-width:36px">${hv}</b><span style="color:#444;flex:1;text-align:center">${lbl}</span><b style="min-width:36px;text-align:right">${av}</b></div>`;
  // envolve num bloco CINZA (igual aos outros da janela) — sem isso a ficha ficava sobre o azul
  // do modal, com texto escuro ilegível.
  return `<div class="cl-lm-statswrap"><fieldset class="cl-lm-ref" style="margin:0"><legend>Ficha da partida</legend>
    ${line('Posse %',hP+'%',(100-hP)+'%')}
    ${line('Finalizações',H.shots,A.shots)}
    ${line('Chances Claras',H.big,A.big)}
  </fieldset></div>`;
}
function liveModalHTML(m){ const RL=CL.live; const hc=clubOf(m.h),ac=clubOf(m.a);
  const shooting=!!RL.pensPicking;
  const halftime=(RL.paused && m.user && !RL.penEvent && !RL.injEvent && !RL.pens);
  const penalty=(RL.penEvent && RL.penMatch===m);
  const injury=(RL.injEvent && RL.injMatch===m);
  const showSubs = m.user && !penalty && !injury && !shooting && (halftime || CL.subPanelOpen);
  const incHTML=incidentLines(m);
  const subsLeft=Math.max(0,3-(CL.subsUsed||0));
  // botões de ação ficam FORA de .cl-lm-top de propósito: esse é um flex row com os
  // eventos, e por padrão o flexbox estica todo mundo pra altura do irmão mais alto
  // (align-items:stretch) — com muitos incidentes na partida, isso inflava os botões
  // junto (mesmo com o teto de altura em .cl-lm-events). Como bloco separado abaixo,
  // os botões mantêm sempre o próprio tamanho natural, disputa alguma seja a duração do jogo.
  const actionsHTML=(penalty||injury||shooting)?'':`<div class="cl-lm-cont" style="grid-template-columns:${m.user && !halftime ? 'repeat(3,1fr)' : '1fr 1fr'}">
        ${(m.user && !halftime)?btn(showSubs?'Fechar substituições':`Substituições (${subsLeft})`,'clToggleSubPanel()',{icon:'⇄',cls:'cl-btn-ok',dis:subsLeft<=0&&!showSubs}):''}
        ${m.user?btn('Compartilhar','clShareResult()',{icon:'📤',cls:'cl-btn-cancel cl-noshot'}):''}
        ${btn('Continuar','liveContinue()',{icon:'✔',cls:'cl-btn-ok'})}
      </div>`;
  // contador do intervalo (Resenha): linha própria, FORA do botão — btn() escapa o label, então
  // HTML no rótulo apareceria como texto quebrado. Atualizado a cada segundo por startHalftimeCountdown.
  const halftimeTimerHTML=(halftime && CL.online)?`<div class="cl-ht-timer">⏱ Avança sozinho em <span class="cl-ht-count">${Math.max(0,RL.halftimeLeft!=null?RL.halftimeLeft:10)}</span>s se você não substituir</div>`:'';
  return `<div class="cl-lm-title">${escC(hc.short)}, ${m.hg} - ${escC(ac.short)}, ${m.ag}</div>
    <div class="cl-lm-top">
      <div class="cl-lm-events">${incHTML}</div>
      <fieldset class="cl-lm-ref"><legend>Árbitro</legend><b>${escC(m.ref)}</b></fieldset>
    </div>
    ${m.user?matchStatsHTML(m):''}
    ${halftimeTimerHTML}
    ${actionsHTML}
    ${showSubs?subPanelHTML(m):''}
    ${penalty?penaltyPickerHTML():''}${injury?injurySubHTML(m,RL.injEvent):''}${shooting?shootoutPickerHTML():''}`;
}
function clToggleSubPanel(){ CL.subPanelOpen=!CL.subPanelOpen; CL.subOut=CL.subIn=null; cdraw(); }
/* ---- modal clássico de pênalti: escolhe o batedor, com contagem regressiva de 10s ---- */
function penaltyRating(p){ return Math.max(1,Math.min(9,Math.round((p.f-40)/7))); }
/* cor do modal de pênalti = cor real do clube que está batendo (igual ao clássico:
   ATLETICO PR sai vermelho, VITORIA sai preto — cada time com sua própria paleta) */
function penaltyClubStyle(){
  const RL=CL.live; if(!RL) return '';
  let teamId=null;
  if(RL.penEvent) teamId=RL.penEvent.team;
  else if(RL.pens && RL.matches[0]) teamId = RL.pens.turn==='H'?RL.matches[0].h:RL.matches[0].a;
  if(!teamId) return '';
  const c=clubOf(teamId); if(!c || !c.color) return '';
  const {col,col2}=clubColors(c);
  return `style="--pen-bg:linear-gradient(165deg,${col} 45%,${col2} 100%);--pen-fg:${txtOn(col)}"`;
}
function penaltyPickerHTML(){
  if(CL.penPhase==='suspense') return penaltySuspenseHTML();
  if(CL.penPhase==='result') return penaltyResultHTML();
  const list=xiPlayers(CL.clubId).filter(p=>p.s!=='GK');
  const takers=(list.length?list:squad(CL.clubId).filter(p=>p.s!=='GK'));
  const secsLeft=Math.max(0,Math.ceil((CL.penDeadline-Date.now())/1000));
  const rows=takers.map(p=>`<div class="cl-pen-row ${CL.penSel===p.n?'sel':''}" style="grid-template-columns:22px 1fr" onclick="penaltySelect('${escC(p.n)}')">
      <span class="cl-pen-pos">${posLetter(p.s)}</span><span class="cl-pen-n">${escC(p.n)}</span>
    </div>`).join('');
  return `<div class="cl-pen-overlay"><div class="cl-pen-modal" ${penaltyClubStyle()}>
    <div class="cl-pen-title">PENALTI</div>
    <div class="cl-pen-sub">${escC(CL.mgr||'Técnico')}, escolha o jogador para marcar o penalti! <span id="cl-pen-count" class="cl-pen-count">${secsLeft}s</span></div>
    <div class="cl-pen-list">${rows}</div>
    <div class="cl-pen-btn">${btn('Chutar','resolvePenalty(CL.penSel)',{icon:'✔',cls:'cl-btn-ok'})}</div>
  </div></div>`;
}
/* ---- modal de pênalti da DISPUTA (mesma cara do pênalti normal, ver penaltyPickerHTML)
   — só troca o título (numera a cobrança) e chama resolveShootoutKick em vez de
   resolvePenalty. Reaproveita CL.penSel/CL.penPhase/CL.penDeadline (só um dos dois
   fluxos — pênalti em campo ou disputa — está ativo por vez, nunca os dois juntos). ---- */
/* placar (bolinhas ✔/✖) fica DENTRO do próprio modal — o modal de pênalti é um overlay
   que cobre a tela inteira (.cl-live-overlay), então renderizar o placar só no corpo da
   página (por trás do overlay) o deixava invisível durante toda a disputa. Passado como
   `extra` pras 3 fases (escolha/suspense/revelação) — só aparece nas variantes de
   DISPUTA de pênaltis; o pênalti normal em campo (penaltyPickerHTML) não passa `extra`. */
function shootoutPickerHTML(){
  const RL=CL.live;
  const board=shootoutScoreboardHTML(RL);
  if(CL.penPhase==='suspense') return penaltySuspenseHTML(board);
  if(CL.penPhase==='result') return penaltyResultHTML(board);
  const list=xiPlayers(CL.clubId).filter(p=>p.s!=='GK');
  const pool=(list.length?list:squad(CL.clubId).filter(p=>p.s!=='GK'));
  // quem já bateu NESTA disputa fica desabilitado na lista (regra oficial: só pode bater
  // de novo depois que todo mundo elegível já bateu uma vez) — mas continua visível, só
  // sem poder ser escolhido, pro treinador entender por que sumiu da seleção normal.
  const takenNames=new Set((RL.pens.turn==='H'?RL.pens.h:RL.pens.a).map(k=>k.name));
  const eligible=shootoutEligibleTakers(pool, takenNames);
  const cycleReset = eligible.length===pool.length; // ninguém bateu ainda, ou o ciclo reabriu (todo mundo já bateu 1x)
  const secsLeft=Math.max(0,Math.ceil((CL.penDeadline-Date.now())/1000));
  const kickNum=(RL.pens.h.length+RL.pens.a.length)+1;
  const rows=pool.map(p=>{
    const takenBefore = !cycleReset && takenNames.has(p.n);
    return `<div class="cl-pen-row ${CL.penSel===p.n?'sel':''} ${takenBefore?'dis':''}" ${takenBefore?'':`onclick="penaltySelect('${escC(p.n)}')"`}>
      <span class="cl-pen-pos">${posLetter(p.s)}</span><span class="cl-pen-n">${escC(p.n)}${takenBefore?' <span class="cl-pen-taken">já bateu</span>':''}</span><span class="cl-pen-r">${p.f}</span>
    </div>`;
  }).join('');
  return `<div class="cl-pen-overlay"><div class="cl-pen-modal" ${penaltyClubStyle()}>
    ${board}
    <div class="cl-pen-title">PÊNALTI ${kickNum}ª cobrança</div>
    <div class="cl-pen-sub">${escC(CL.mgr||'Técnico')}, escolha quem vai bater! <span id="cl-pen-count" class="cl-pen-count">${secsLeft}s</span></div>
    <div class="cl-pen-list">${rows}</div>
    <div class="cl-pen-btn">${btn('Chutar','resolveShootoutKick(CL.penSel)',{icon:'✔',cls:'cl-btn-ok'})}</div>
  </div></div>`;
}
/* fase 2: suspense — só o título, sem revelar nada ainda (a pausa dramática que faltava) */
function penaltySuspenseHTML(extra){
  return `<div class="cl-pen-overlay"><div class="cl-pen-modal" ${penaltyClubStyle()}>
    ${extra||''}
    <div class="cl-pen-title">PENALTI</div>
    <div class="cl-pen-suspense-dots">· · ·</div>
  </div></div>`;
}
/* fase 3: revelação — mesma cor do clube em todas as fases; só o texto GOLO/Defendeu muda */
function penaltyResultHTML(extra){
  const scored=CL.penResultScored;
  return `<div class="cl-pen-overlay"><div class="cl-pen-modal" ${penaltyClubStyle()}>
    ${extra||''}
    <div class="cl-pen-title">PENALTI</div>
    <div class="cl-pen-marcador">Marcador: ${escC(CL.penResultScorer||'')}</div>
    <div class="cl-pen-result ${scored?'golo':'defendeu'}">${scored?'GOL':'Defendeu'}</div>
  </div></div>`;
}
/* linha do tempo de incidentes: gols, cartões e lesões, mais recentes primeiro */
function incidentLines(m){
  let hh=0,aa=0;
  const rows=(m.incidents||[]).map(inc=>{
    if(inc.type==='gol'){ if(inc.side==='H')hh++; else aa++;
      return {min:inc.min,html:`⚽ ${hh}:${aa} ${escC(inc.player)} ${inc.min}'`}; }
    if(inc.type==='penalti'){
      if(inc.scored){ if(inc.side==='H')hh++; else aa++;
        return {min:inc.min,html:`⚽🥅 ${hh}:${aa} ${escC(inc.player)} converteu o pênalti! ${inc.min}'`}; }
      return {min:inc.min,html:`❌🥅 ${escC(inc.player)} perdeu o pênalti! ${inc.min}'`}; }
    if(inc.type==='cartao'){
      const ic=inc.cardType==='vermelho'?'🟥':'🟨';
      const suf=inc.reason==='segundo amarelo'?' (2º amarelo)':'';
      return {min:inc.min,html:`${ic} ${escC(inc.player)}${suf} ${inc.min}'`}; }
    if(inc.type==='lesao'){
      const suf=inc.severity==='grave'?' (grave)':'';
      return {min:inc.min,html:`✚ ${escC(inc.player)}${suf} ${inc.min}'`}; }
    return null;
  }).filter(Boolean).sort((a,b)=>b.min-a.min);
  if(!rows.length) return '<div class="cl-lm-noinc">Sem incidentes ainda…</div>';
  return rows.map(r=>`<div>${r.html}</div>`).join('');
}
function subPanelHTML(m){ const id=CL.clubId; const xiSet=new Set(S.xi||[]); const xi=squad(id).filter(p=>xiSet.has(p.n)).sort(bySquadOrder); const bench=squad(id).filter(p=>!xiSet.has(p.n)).sort(bySquadOrder);
  const rowP=(p,side)=>`<div class="cl-sub-row ${((side==='out')?CL.subOut:CL.subIn)===p.n?'sel':''}" onclick="liveSubPick('${side}','${escC(p.n)}')"><span class="cl-sub-p">${posLetter(p.s)}</span><span class="cl-sub-n">${escC(p.n)}</span><b>${p.f}</b></div>`;
  return `<fieldset class="cl-sub"><legend>${escC(clubOf(id).short)}</legend>
    <div class="cl-sub-cols"><div class="cl-sub-c">${xi.map(p=>rowP(p,'out')).join('')}</div><div class="cl-sub-c">${bench.map(p=>rowP(p,'in')).join('')}</div></div>
    <div class="cl-sub-btn">${btn('Substituir','liveDoSub()',{icon:'⇄',cls:'cl-btn-ico'})}</div>
  </fieldset>`;
}
function showLiveClassif(){ CL.screen='classif';
  // reseta o accordion pra sempre abrir na divisão do usuário ao mostrar o ranking
  CL.clsDivOpen=null;
  armClassifTimer();
  cdraw();
}
/* avança sozinho pra próxima tela depois de 10s sem interação — o "Continuar" continua
   disponível pra quem quiser passar na hora. Reabrir/fechar um accordion (clToggleDivAcc)
   reinicia a contagem, já que isso mostra que o jogador ainda está lendo a tabela. */
function armClassifTimer(){
  if(CL._classifTimer){ clearTimeout(CL._classifTimer); CL._classifTimer=null; }
  CL._classifTimer=setTimeout(()=>{ CL._classifTimer=null; if(CL.screen==='classif'||CL.screen==='seatclassif') clClassifContinue(); }, 10000);
}
/* tabela genérica pra qualquer divisão (a do usuário OU uma das 3 que rodam em segundo plano) */
function sortedTableOf(table){
  return Object.values(table||{}).sort((a,b)=> b.Pts-a.Pts || (b.GF-b.GA)-(a.GF-a.GA) || b.GF-a.GF || String(a.id).localeCompare(String(b.id)) );
}
/* nome da divisão pra classificação/ao-vivo — universo-consciente: Brasil usa "1ª..4ª Divisão";
   universos intl (Alemanha, Itália...) usam o rótulo real (Bundesliga, Serie A...). Antes o
   legend era fixo em A/B/C/D e dava "undefined" em qualquer divisão fora do Brasil. */
function classifDivName(d, country){
  const legend={A:'1ª Divisão',B:'2ª Divisão',C:'3ª Divisão',D:'4ª Divisão'};
  const labels = country
    ? ((typeof UNI_CONFIGS!=='undefined' && UNI_CONFIGS[uniKeyOf(country)] && UNI_CONFIGS[uniKeyOf(country)].label) || {})
    : ((typeof DIV_LABEL_FULL!=='undefined' && DIV_LABEL_FULL) || {});
  return legend[d] || labels[d] || d;
}
function scClassif(){
  // accordion vertical: divisão do usuário no topo e aberta; as outras colapsadas.
  const panelHTML=(d)=>{
    const isMine = d===S.division;
    const hasQual = d==='A'; // só a Série A classifica pra Libertadores/Sul-Americana
    const tbl = isMine ? sortedTable() : (S.otherDivs && S.otherDivs[d] ? sortedTableOf(S.otherDivs[d].table) : null);
    const open=divAccOpen('clsDivOpen',d);
    const rows=tbl?tbl.map((t,i)=>{ const c=clubOf(t.id); const me=isMine && t.id===CL.clubId;
      const zone=qualificationZone(d,i+1);
      const zoneCell = hasQual ? `<span class="cl-cls2-zone ${zone?'zone-'+zone:''}" title="${zone==='lib'?'Libertadores':zone==='sul'?'Sul-Americana':''}">${zone==='lib'?'Lib':zone==='sul'?'Sul':''}</span>` : '';
      return `<div class="cl-cls2-row ${me?'me':''} ${hasQual?'hasqual':''}" style="${clubStripe(c)}">
        <span class="cl-cls2-pos">${i+1}</span><span class="cl-cls2-n">${escC(c.short)}</span>
        <span class="cl-cls2-pts">${t.Pts}</span><span class="cl-cls2-x">${t.W}</span><span class="cl-cls2-x">${t.D}</span><span class="cl-cls2-x">${t.L}</span>
        <span class="cl-cls2-x">${t.GF}</span><span class="cl-cls2-x">${t.GA}</span>${zoneCell}</div>`; }).join('')
      : '<div class="cl-cls2-empty">—</div>';
    return `<div class="cl-clsacc ${open?'open':'collapsed'}">
      <div class="cl-clsacc-h" onclick="event.stopPropagation();clToggleDivAcc('clsDivOpen','${d}')">
        <span class="cl-clsacc-h-title">${divisionTrophyImg(d,18)||'🏆'} ${escC(classifDivName(d))}${isMine?' <span class="cl-acc-you">você</span>':''}</span>
        <span class="cl-acc-arrow ${open?'':'closed'}">▾</span></div>
      <div class="cl-clsacc-body">
        <div class="cl-cls2-head ${hasQual?'hasqual':''}"><span class="cl-cls2-pos">#</span><span class="cl-cls2-n">Equipa</span><span class="cl-cls2-pts">P</span><span class="cl-cls2-x">V</span><span class="cl-cls2-x">E</span><span class="cl-cls2-x">D</span><span class="cl-cls2-x">GP</span><span class="cl-cls2-x">GC</span>${hasQual?'<span></span>':''}</div>
        ${rows}</div></div>`;
  };
  return `<div class="cl-live cl-classif">
    <div class="cl-classif-buttons">
      ${btn('Compartilhar','clShareStandings()',{icon:'📤',cls:'cl-btn-cancel cl-btn-sm cl-noshot'})}
      ${btn('Continuar','clClassifContinue()',{icon:'✔',cls:'cl-btn-ok cl-btn-sm'})}
    </div>
    <div class="cl-classif-autohint">avança sozinho em alguns segundos...</div>
    <div class="cl-live-top">Classificação - ${S.round}ª jornada</div>
    <div class="cl-clsacc-wrap">${divOrderUserFirst().map(panelHTML).join('')}</div>
  </div>`;
}
function liveDone(){ if(CL._liveTimer)clearTimeout(CL._liveTimer); if(CL._classifTimer){clearTimeout(CL._classifTimer);CL._classifTimer=null;} CL.live=null; CL.subsUsed=0; CL._liveBusy=false; CL.screen='main'; CL.tab='jogo'; CL.selPlayer=squad(CL.clubId)[0]?.n||CL.selPlayer; cdraw();
  if(CL.lastGate) toastC('Bilheteira: +'+grp(CL.lastGate)+' reais'); CL.lastGate=0;
  // notificação de propostas de compra recebidas nesta rodada (toast no topo, ~3s cada)
  if(S._offerToasts && S._offerToasts.length){ S._offerToasts.forEach((m,i)=>setTimeout(()=>toastC(m), 500+i*400)); S._offerToasts=[]; }
  // cronômetro soberano: QUALQUER cliente reabre a rodada seguinte (não só o host) — ver reopen_ready
  if(CL.online && typeof NET!=='undefined' && NET.gameId && !S.finished){
    if(NET.reopenReady) NET.reopenReady(); else if(NET.isHost) NET.start(); // fallback: transporte local
  }
  if(S.finished) setTimeout(()=>seasonEndDialog(),300); }
/* ---- fim de temporada: mostra campeão + posição final, botão avança a temporada
   (com promoção/rebaixamento de verdade, pré-carregando dados reais da nova divisão) ---- */
function seasonEndDialog(){
  const tbl=sortedTable();
  const champ=clubOf(tbl[0].id).short;
  const myPos=tablePos(S.clubId);
  const hasQual = S.division==='A';
  // mesma info que endSeason() já calculou pro histórico (S.history acabou de ganhar essa
  // entrada) — reaproveita em vez de recalcular, e cobre o "pra qual competição classificou".
  const hist=S.history[S.history.length-1];
  const qualifiedFor=(hist&&hist.qualifiedFor)||[];
  let qualMsg;
  if(qualifiedFor.includes('libertadores')) qualMsg='🏆 Classificado pra Copa Libertadores '+(S.season+1)+'!';
  else if(qualifiedFor.includes('sulamericana')) qualMsg='🏆 Classificado pra Copa Sul-Americana '+(S.season+1)+'!';
  else if(myPos>tbl.length-4 && hasQual) qualMsg='⚠️ Fora das vagas continentais nesta temporada.';
  const rows=tbl.map((t,i)=>{ const c=clubOf(t.id); const me=t.id===S.clubId;
    const zone=hasQual?qualificationZone('A',i+1):null;
    const zoneCell = hasQual ? `<span class="cl-cls2-zone ${zone?'zone-'+zone:''}" title="${zone==='lib'?'Libertadores':zone==='sul'?'Sul-Americana':''}">${zone==='lib'?'Lib':zone==='sul'?'Sul':''}</span>` : '';
    return `<div class="cl-cls2-row ${me?'me':''} ${hasQual?'hasqual':''}" style="${clubStripe(c)}">
      <span class="cl-cls2-pos">${i+1}</span><span class="cl-cls2-n">${escC(c.short)}</span>
      <span class="cl-cls2-pts">${t.Pts}</span><span class="cl-cls2-x">${t.W}</span><span class="cl-cls2-x">${t.D}</span><span class="cl-cls2-x">${t.L}</span>
      <span class="cl-cls2-x">${t.GF}</span><span class="cl-cls2-x">${t.GA}</span>${zoneCell}</div>`; }).join('');
  const pz=S._seasonPrizes;
  const prizeBlock = (pz && pz.total>0) ? `<div class="cl-prizes">
      <div class="cl-prizes-h">💰 Premiação da temporada</div>
      ${pz.lines.map(l=>`<div class="cl-prize-row"><span class="cl-prize-ic">${l.icon}</span><span class="cl-prize-c">${escC(l.comp)}</span><span class="cl-prize-p">${escC(l.place)}</span><span class="cl-prize-v">+${fmt(l.amount)}</span></div>`).join('')}
      <div class="cl-prize-total"><span>Total recebido</span><span>+${fmt(pz.total)}</span></div>
      ${pz.art&&pz.art.mine?`<div class="cl-prize-art">👟 <b>${escC(pz.art.name)}</b> foi artilheiro (${pz.art.goals} gols) e valorizou: ${fmt(pz.art.valFrom)} → <b>${fmt(pz.art.valTo)}</b></div>`:''}
    </div>` : '';
  overlayC(dlg('Fim da temporada!', `<div class="cl-res">
    <div class="cl-res-score">${escC(champ)} é campeão</div>
    <div class="cl-res-verd">Você terminou em ${myPos}º na ${escC(divisionLabel())}${qualMsg?'<br>'+escC(qualMsg):''}</div>
    ${prizeBlock}
    <div class="cl-seasontbl-wrap" style="max-height:340px;overflow-y:auto;margin-top:10px">
      <div class="cl-cls2-head ${hasQual?'hasqual':''}"><span class="cl-cls2-pos">#</span><span class="cl-cls2-n">Equipa</span><span class="cl-cls2-pts">P</span><span class="cl-cls2-x">V</span><span class="cl-cls2-x">E</span><span class="cl-cls2-x">D</span><span class="cl-cls2-x">GP</span><span class="cl-cls2-x">GC</span>${hasQual?'<span></span>':''}</div>
      ${rows}
    </div>
    <div class="cl-cal-ok">${btn('Nova temporada','clAdvanceSeason()',{icon:'✔',cls:'cl-btn-ok'})}</div>
  </div>`,{w:620,bodyClass:'cl-body-green'}));
}
function clAdvanceSeason(){
  clCloseOverlay();
  const nd=pendingDivisionChange();
  const goingReal = nd!==S.division && nd!=='A';
  toastC(goingReal?'Preparando Série '+nd+'...':'Preparando nova temporada...');
  (async ()=>{
    if(goingReal && typeof NET!=='undefined' && NET.getDivisionClubs){
      try{ await loadRealDivisionClubs(nd); }catch(e){ console.warn('divisão real indisponível, usando fallback:',e); }
    }
    newSeasonReset();
    saveV3(); cdraw();
    checkPendingCupDraws(()=>{ // mostra o sorteio da Copa do Brasil da nova temporada antes do aviso de acesso/queda
      if(S._promoRelegNews==='promoted') resultDialog('🔺 Promoção!','Você subiu pra '+divisionLabel()+'!');
      else if(S._promoRelegNews==='relegated') resultDialog('🔻 Rebaixamento','Você caiu pra '+divisionLabel()+'.');
    });
  })().catch(err=>{
    // antes, qualquer erro aqui dentro travava a tela em silêncio (sem nenhum aviso).
    // agora mostra o erro de verdade e tenta voltar pra tela principal mesmo assim.
    console.error('Erro ao avançar de temporada:', err);
    toastC('⚠ Erro ao avançar de temporada: '+(err&&err.message||'desconhecido')+'. Tentando recuperar...');
    try{ CL.screen='main'; CL.tab='jogo'; cdraw(); }catch(e2){ console.error('Falha também ao recuperar:', e2); }
  });
}
/* ---- corrige a escalação do usuário se algum titular ficou suspenso/lesionado ----
   Chamada após cada rodada E de novo, defensivamente, antes de iniciar a próxima
   partida ao vivo (startLiveRound) — garante que suspenso/lesionado NUNCA fique
   marcado como titular, mesmo que algum estado antigo/salvo tenha escapado da
   primeira correção. Prioriza repor por um reserva da MESMA posição; só usa
   outra posição se não sobrar ninguém disponível daquela posição no banco. */
function fixUserXIAvailability(){
  if(!S.xi || !S.xi.length) return;
  const sq=squad(CL.clubId);
  const out=S.xi.filter(n=>{ const p=sq.find(x=>x.n===n); return p && (p.suspended>0 || p.injuredMatches>0); });
  if(!out.length) return;
  const avail=sq.filter(p=>!(p.suspended>0)&&!(p.injuredMatches>0));
  const inXi=new Set(S.xi);
  const bench=avail.filter(p=>!inXi.has(p.n)).sort((a,b)=>b.f-a.f);
  const fixedXi=S.xi.slice();
  out.forEach(n=>{
    const p=sq.find(x=>x.n===n); const idx=fixedXi.indexOf(n); if(idx<0) return;
    let subIdx=bench.findIndex(b=>b.s===(p&&p.s));
    if(subIdx<0) subIdx=0; // sem reserva da mesma posição -> qualquer reserva disponível (emergência)
    const sub=bench.splice(subIdx,1)[0];
    if(sub) fixedXi[idx]=sub.n;
  });
  S.xi=fixedXi;
  const names=out.map(n=>n.split(' ').slice(-1)[0]).join(', ');
  toastC('⚠ '+names+' fora do próximo jogo — escalação ajustada automaticamente.');
}
/* atualiza a tabela das outras 3 divisões (que rodam em paralelo, só pra ambientação)
   com os resultados que acabaram de ser simulados nesta rodada */
function applyOtherDivResults(RL){
  if(!S.otherDivs) return;
  RL.matches.forEach(m=>{
    if(m.user) return; // a partida do usuário já é tratada por playRound()
    const od=S.otherDivs[m.div]; if(!od || !od.table[m.h] || !od.table[m.a]) return;
    const th=od.table[m.h], ta=od.table[m.a];
    th.P++; ta.P++; th.GF+=m.hg; th.GA+=m.ag; ta.GF+=m.ag; ta.GA+=m.hg;
    if(m.hg>m.ag){ th.W++; th.Pts+=3; ta.L++; } else if(m.hg<m.ag){ ta.W++; ta.Pts+=3; th.L++; } else { th.D++; ta.D++; th.Pts++; ta.Pts++; }
  });
}
/* ---- Fase 2 Etapa A (auditoria server-side): retrato do elenco JUSTO ANTES de
   advancePlayerAvailability()/playRound() mexerem em energia/moral/suspensão — é
   exatamente o estado que o motor usou pra simular a partida em startLiveRound().
   Só os campos que ratings()/simulateMatch() realmente consomem. ---- */
function snapshotSquadForAudit(clubId){
  return squad(clubId).map(p=>({n:p.n,f:p.f,s:p.s,energy:p.energy,moral:p.moral,behavior:p.behavior,suspended:p.suspended,injuredMatches:p.injuredMatches}));
}
function finishLiveRound(){
  CL._postRoundSeats=null; // reset da rotação de classificação (o caminho hotseat a preenche antes do commit)
  const RL=CL.live; const uf=userFixture(); let userResult=null;
  let _auditPayload=null;
  if(uf){ const um=RL.matches.find(m=>m.h===uf[0]&&m.a===uf[1]);
    // gols de pênalti (type:'penalti', scored:true) contam no placar (hg/ag) desde sempre,
    // mas ficavam de fora daqui — o filtro só pegava type==='gol' — então o artilheiro
    // sumia da artilharia e das estatísticas dele mesmo tendo balançado a rede de verdade.
    if(um) userResult={hg:um.hg,ag:um.ag,perf:um.perf,scorers:um.events.filter(e=>e.type==='gol'||(e.type==='penalti'&&e.scored)).map(e=>({name:e.scorer,id:e.team}))};
    // payload de auditoria (Fase 2 Etapa A) — só online, e só se a partida do usuário
    // realmente rolou nesta rodada (uf). Capturado AGORA (elenco ainda intocado por
    // advancePlayerAvailability/playRound abaixo) pra bater com o que o motor usou.
    if(um && CL.online){
      const isUserSide=e=>(e.side==='H'&&uf[0]===CL.clubId)||(e.side==='A'&&uf[1]===CL.clubId);
      _auditPayload={
        gameId: NET.gameId, round: S.round, h: uf[0], a: uf[1], submitterClubId: CL.clubId,
        tactic: S.tactic, seed: S.seed,
        xiKickoff: (S.clubXI && S.clubXI[CL.clubId]) || (S.xi||[]).slice(),
        penaltyChoices: um.events.filter(e=>e.type==='penalti'&&e._resolved&&isUserSide(e)).map(e=>({min:e.min,takerName:e.scorer})),
        squadH: snapshotSquadForAudit(uf[0]), squadA: snapshotSquadForAudit(uf[1]),
        clientResult: userResult,
      };
    }
  }
  // receita de bilhetes do jogo do usuário em casa — só pro toast de feedback; o valor já
  // entra no caixa via processFinances()/pushFinanceEntry() (ver core.js), que lê o mesmo
  // CL.live.matches e loga isso na aba Finanças, então NÃO soma direto no S.budget aqui
  // (fazia isso duas vezes: aqui E de novo na renda-base da rodada).
  let gate=0; if(uf && uf[0]===CL.clubId){ const um=RL.matches.find(m=>m.h===uf[0]&&m.a===uf[1]); if(um){ gate=um.att*um.price; } }
  CL.lastGate=gate;
  // FASE 2 (hotseat solo): se há OUTROS humanos com jogo nesta rodada, cada um joga a SUA
  // partida ao vivo (passando o aparelho) ANTES de commitar a rodada. Guarda o contexto do
  // manager 1 e enfileira; ao esvaziar a fila, _commitLeagueRound roda com os resultados deles.
  const hq = hasSecondaryHumans() ? buildHumanQueue(uf) : [];
  if(hq.length){
    CL._hotseat={ primaryRL:RL, userResult, audit:_auditPayload, humanResults:{},
      allEvents:RL.matches.flatMap(m=>m.events||[]), queue:hq,
      prevClub:CL.clubId, prevXI:(S.xi||[]).slice(), prevTactic:S.tactic };
    startNextHotseatMatch();
    return;
  }
  // ===== SAVE ÚNICO (online) — NÃO-BLOQUEANTE: publico o MEU resultado real e VOLTO LIVRE pra tela
  // principal. Ninguém fica preso numa tela de espera. Quem FECHA a rodada é só o ANFITRIÃO, quando
  // ninguém está mais em partida (busy limpo, com teto de 90s) — daí ele resolve a rodada uma vez
  // (resultados reais de todos; ausentes simulados) e persiste. Os convidados só ESPELHAM (reconcile).
  if(CL.online && typeof NET!=='undefined' && NET.publishResult){
    const um = uf ? RL.matches.find(m=>m.h===uf[0]&&m.a===uf[1]) : null;
    const myResult = (uf && userResult) ? { h:uf[0], a:uf[1], hg:userResult.hg, ag:userResult.ag,
      scorers:userResult.scorers||[], perf:userResult.perf||null, events:(um&&um.events)||[] } : null;
    NET.publishResult(S.round, myResult || { h:null, a:null, bye:true }); // marcador de folga não trava nada
    if(NET.isHost){ CL._hostPendingCommit = { RL, userResult, audit:_auditPayload, round:S.round, uf }; }
    onlineReturnFreeAfterMatch(); // volta LIVRE pra tela principal (não bloqueia)
    return;
  }
  _commitLeagueRound(RL, userResult, {}, RL.matches.flatMap(m=>m.events||[]), _auditPayload);
}
/* pequeno helper de relógio (Date.now indireto pra não quebrar harness/replay determinístico) */
function nowMs(){ try{ return Date.now(); }catch(e){ return 0; } }
/* volta LIVRE pra tela principal depois da minha partida (online, save único). Sem tela de espera:
   fico livre pra gerenciar. O fechamento da rodada é do anfitrião (onlineHostCloseRound) e o
   avanço/reabertura segue soberano pelo cronômetro (reopen_ready quando ninguém está busy). */
function onlineReturnFreeAfterMatch(){
  if(CL._liveTimer) clearTimeout(CL._liveTimer);
  CL._playedRound=S.round; // marca que JÁ joguei esta rodada — não re-simulo (evita loop na mesma rodada)
  CL.live=null; CL.subsUsed=0; CL._liveBusy=false;
  CL.screen='main'; CL.tab='jogo'; CL.selPlayer=squad(CL.clubId)[0]?.n||CL.selPlayer; cdraw();
  if(CL.lastGate){ toastC('Bilheteira: +'+grp(CL.lastGate)+' reais'); CL.lastGate=0; }
  // NÃO reabro a próxima rodada aqui: quem fecha e reabre a rodada é o ANFITRIÃO, DEPOIS de resolver
  // (onlineHostCloseRound). Reabrir antes do commit fazia a fase ciclar e travava/loopava a rodada.
}
/* ANFITRIÃO fecha a rodada online: quando NENHUM humano está mais em partida (busy limpo — teto de
   90s no servidor, então não trava), resolve a rodada UMA vez com os resultados publicados por todos
   (ausentes são simulados dentro do playRound) e persiste. Chamado pelo onlineTimerLoop. */
function onlineHostCloseRound(){
  const pc=CL._hostPendingCommit; if(!pc) return;
  if(typeof NET==='undefined' || !NET.isHost){ CL._hostPendingCommit=null; return; }
  if(pc.round!==S.round){ CL._hostPendingCommit=null; return; } // já resolvida por outro caminho
  const room=NET.room; if(!room) return;
  const round=pc.round;
  const anyBusy=(room.participants||[]).some(p=>p.busy); // algum treinador ainda em partida?
  if(anyBusy){ CL._hostCloseSince=0; return; } // espera todos saírem da partida (teto de 90s do busy)
  // todos saíram da partida: dá uma CARÊNCIA curta pros resultados publicados propagarem (o publish
  // é async), mas NÃO trava — se algum não chegar em 3s, fecha assim mesmo (ausente é simulado).
  if(typeof NET!=='undefined' && NET.allHumanResultsIn && !NET.allHumanResultsIn(round)){
    if(!CL._hostCloseSince) CL._hostCloseSince=nowMs();
    if(nowMs()-CL._hostCloseSince < 3000) return;
  }
  CL._hostCloseSince=0;
  CL._hostPendingCommit=null;
  const map = (typeof NET!=='undefined' && NET.collectHumanResults) ? NET.collectHumanResults(round, null) : {};
  const uf=pc.uf; const myKey = uf ? uf[0]+'-'+uf[1] : null;
  const userResultAuth = (myKey && map[myKey]) ? map[myKey] : pc.userResult; // mandante-autoritativo
  const allEvents = Object.values(map).flatMap(r=>r.events||[]);
  _commitLeagueRound(pc.RL, userResultAuth, map, allEvents, pc.audit); // resolve + persiste (host)
  // reabre a próxima 'ready' pra TODOS logo após resolver+persistir (games.round já avançou, então os
  // convidados espelham antes de jogar a próxima). Sem isso a rodada não avançava (host-autoritativo).
  if(typeof NET!=='undefined' && NET.reopenReady) NET.reopenReady();
}
/* commit de uma rodada de liga — extraído do fim de finishLiveRound pra ser reusado depois
   da fila de partidas hotseat (FASE 2). humanResults = {fxKey:{hg,ag,scorers,perf,events}}. */
function _commitLeagueRound(RL, userResult, humanResults, allEvents, _auditPayload){
  // disciplina/lesões: cumpre suspensões pendentes e aplica os incidentes NOVOS desta rodada
  // (precisa vir ANTES de playRound() pra ratePlayers() enxergar S._roundIncidents)
  advancePlayerAvailability();
  applyMatchIncidents(allEvents);
  playRound(userResult, humanResults);
  applyOtherDivResults(RL);
  fixUserXIAvailability();
  // segurança no cargo do treinador: demissão ou proposta de outro clube, conforme desempenho
  // recente (não durante o resumo de fim de temporada, pra não conflitar com aquele modal)
  if(!S.finished){
    tickJobSecurity();
    const jobEvent=checkManagerJobEvent();
    if(jobEvent) CL._pendingManagerEvent=jobEvent;
  }
  // a tática/formação escolhida agora PERSISTE entre rodadas — antes forçava reescolher
  // toda vez (CL.tacticChosen=false), obrigando o usuário a voltar ao menu Seleccionar
  // a cada rodada só pra liberar o botão Jogar de novo. saveV3() já grava o estado atual.
  saveV3();
  // salva em Supabase se online
  if(CL.online && typeof NET!=='undefined' && NET.saveGame){
    (async ()=>{ await NET.saveGame({ S, round: S.round }); })().catch(e=>console.warn('Save Supabase:', e));
    // Fase 2 Etapa A: auditoria server-side em paralelo — só registra, nunca bloqueia
    // nem afeta a experiência do jogador (silenciosa mesmo se falhar/timeout).
    if(_auditPayload && typeof sb!=='undefined' && sb && sb.functions){
      sb.functions.invoke('verify-round-result', { body: _auditPayload }).catch(()=>{});
    }
  }
  // se a rodada acabou de decidir um sorteio de copa (Libertadores/Sul-Americana oitavas),
  // mostra a cerimônia ANTES da classificação — igual ao clássico "Sorteio dos jogos da taça".
  // Depois da classificação, se houver demissão/proposta pendente desta rodada, mostra o modal.
  checkPendingCupDraws(()=>{
    const seats=CL._postRoundSeats||[]; CL._postRoundSeats=null;
    if(seats.length) startPostRoundClassifs(seats); // cada humano vê a SUA classificação, em rotação
    else showLiveClassif();                          // solo de 1 humano: como sempre
    checkPendingManagerEvents();
  });
}
/* fecha uma partida de COPA jogada ao vivo — de propósito NÃO passa por finishLiveRound()/
   playRound(): aquilo é "avançar o mundo em uma rodada inteira" (salários, energia/moral/
   evolução de TODOS os elencos, S.round/S.week/S.day++, sorteio de mercado...). Uma partida
   de copa é só UMA partida a mais na mesma rodada — aplica só os efeitos dela (cartão/
   lesão/nota) e grava o resultado na própria copa, do mesmo jeito que advanceCupBracket/
   advanceGroupStageRound já fazem em segundo plano (ver os guards que fazem o avanço
   automático da mesma rodada pular essa partida específica, já resolvida aqui). */
function finishCupLiveMatch(){
  const RL=CL.live, pending=RL.cup, m=RL.matches[0];
  applyMatchIncidents(m.events);
  const scorers=m.events.filter(e=>e.type==='gol'||(e.type==='penalti'&&e.scored)).map(e=>({name:e.scorer,id:e.team}));
  const Rm=makeRng(hashSeed(S.seed,'cuprate',pending.key,S.round,m.h,m.a));
  ratePlayers(m.h,m.hg,m.ag,scorers,Rm,m.perf&&m.perf.H,m.perf&&m.perf.A); ratePlayers(m.a,m.ag,m.hg,scorers,Rm,m.perf&&m.perf.A,m.perf&&m.perf.H);
  if(m.h===CL.clubId) S.budget=(S.budget||0)+(m.att*m.price); // bilheteria do mando de campo, igual à liga
  const compShort=COMP_DEFS[pending.key].short;
  let resultMsg;
  if(pending.stage==='bracket'){
    const t=pending.tie;
    t.hg=m.hg; t.ag=m.ag; t.events=m.events;
    // prorrogação/pênaltis (se houve) já rolaram AO VIVO na tela do usuário — ver
    // startExtraTime/startPenaltyShootout/liveTick — então aqui só empacota o que já
    // aconteceu, não recalcula nada. m.hg/m.ag já inclui os gols da prorrogação (os
    // eventos dela entraram na timeline normal da partida e foram contados igual a
    // qualquer gol do jogo).
    let winner, pens=null, wentToPens=false, wentToExtra=!!RL.cup.wentExtra;
    if(RL.pens){
      wentToPens=true; pens={h:RL.pens.finalH,a:RL.pens.finalA};
      winner = pens.h>pens.a ? t.h : t.a;
    } else {
      winner = m.hg>m.ag ? t.h : t.a; // liveTick garante m.hg!==m.ag antes de chegar aqui
    }
    t.winner=winner; t.pens=pens;
    const loser=winner===t.h?t.a:t.h; pending.bracket.eliminated[loser]=true;
    const userWon=(winner===CL.clubId);
    if(wentToPens){
      const userIsHome=(t.h===CL.clubId);
      const myPen=userIsHome?pens.h:pens.a, oppPen=userIsHome?pens.a:pens.h;
      resultMsg = userWon
        ? `Empate em ${m.hg}×${m.ag} — você venceu nos pênaltis por ${myPen}×${oppPen} e avança na ${compShort}.`
        : `Empate em ${m.hg}×${m.ag} — eliminado nos pênaltis por ${oppPen}×${myPen} da ${compShort}.`;
    } else if(wentToExtra){
      resultMsg = userWon
        ? `Vitória na prorrogação por ${m.hg}×${m.ag}! Você avança na ${compShort}.`
        : `Eliminado na prorrogação — derrota por ${m.hg}×${m.ag} da ${compShort}.`;
    } else {
      resultMsg = userWon
        ? `Vitória por ${m.hg}×${m.ag}! Você avança na ${compShort}.`
        : `Eliminado da ${compShort} — derrota por ${m.hg}×${m.ag}.`;
    }
  } else {
    const mg=pending.group, g=Object.values(mg.groups).find(gr=>gr.label===pending.groupLabel);
    const T=g.table, h=m.h, a=m.a;
    T[h].P++; T[a].P++; T[h].GF+=m.hg; T[h].GA+=m.ag; T[a].GF+=m.ag; T[a].GA+=m.hg;
    if(m.hg>m.ag){ T[h].W++; T[a].L++; T[h].Pts+=3; }
    else if(m.hg<m.ag){ T[a].W++; T[h].L++; T[a].Pts+=3; }
    else { T[h].D++; T[a].D++; T[h].Pts++; T[a].Pts++; }
    mg._userRoundDone=mg.round; // avanço em segundo plano desta rodada pula só a partida do usuário
    const userIsHome=(h===CL.clubId);
    const userGF=userIsHome?m.hg:m.ag, userGA=userIsHome?m.ag:m.hg;
    const outcome=userGF>userGA?'Vitória':userGF<userGA?'Derrota':'Empate';
    resultMsg = `${outcome} por ${userGF}×${userGA} pela fase de grupos da ${compShort}.`;
  }
  saveV3();
  // Resenha (online): saveV3() é no-op nesse modo — persiste no Supabase igual finishLiveRound()
  // já faz pra rodada de liga (só grava de fato se quem está jogando for o anfitrião da
  // sala; característica já existente da arquitetura online, não nova pra copa).
  if(CL.online && typeof NET!=='undefined' && NET.saveGame){
    (async ()=>{ await NET.saveGame({ S, round: S.round }); })().catch(e=>console.warn('Save Supabase (copa):', e));
  }
  // marca esta competição pra mostrar a classificação/chaveamento assim que todas as
  // partidas de copa da rodada (pode haver mais de uma — Copa do Brasil + Libertadores
  // na mesma semana, por exemplo) tiverem sido jogadas — ver clCupResultContinue().
  CL._cupResultKeysThisRound = CL._cupResultKeysThisRound || [];
  if(!CL._cupResultKeysThisRound.includes(pending.key)) CL._cupResultKeysThisRound.push(pending.key);
  CL.screen='main';
  overlayC(dlg(compShort, `<div class="cl-res"><div class="cl-res-score">${escC(m.hg+'×'+m.ag)}</div>
    <div class="cl-res-verd">${escC(resultMsg)}</div><div class="cl-cal-ok">${btn('Continuar','clCupResultContinue()',{icon:'✔',cls:'cl-btn-ok'})}</div></div>`,
    {w:520,bodyClass:'cl-body-green'}));
  cdraw();
}
function clCupResultContinue(){
  clCloseOverlay(); CL.live=null;
  // nunca encadeia direto pra próxima partida de copa aqui, mesmo que já tenha outra
  // pendente (ex: Copa do Brasil + Libertadores na mesma semana) — cada partida tem que
  // passar pela tela principal antes da próxima, pro jogador rever/confirmar a escalação
  // em vez de jogar duas competições seguidas com o mesmo time sem escolher nada. Se
  // sobrar copa pendente, o próximo "Jogar" na tela principal pega ela (ver clJogar()).
  // mostra a classificação/chaveamento da competição que teve jogo agora, pro jogador se
  // situar (igual já fazemos com a tabela de Séries A/B/C/D depois da rodada de liga).
  const classifQueue=(CL._cupResultKeysThisRound||[]).slice();
  CL._cupResultKeysThisRound=null;
  if(classifQueue.length){ CL._cupClassifQueue=classifQueue.slice(1); showCupClassif(classifQueue[0]); return; }
  finishCupResultFlow();
}
/* cauda do fluxo pós-copa: igual ao que já existia antes das telas de classificação —
   online marca pronto e espera os outros; solo volta pra tela principal. */
function finishCupResultFlow(){
  if(CL.online){ onlineMarkReady(); return; }
  CL.screen='main'; cdraw();
}
/* ---- classificação/chaveamento da copa, mostrada automaticamente depois de uma
   partida de copa ao vivo — reaproveita cupGroupHTML/cupBracketHTML (mesma visualização
   de "Minhas competições"), com o troféu em destaque no topo. ---- */
function showCupClassif(key){ CL.screen='cupclassif'; CL._cupClassifKey=key; cdraw(); }
function scCupClassif(){
  const key=CL._cupClassifKey, c=S.cups&&S.cups[key];
  if(!c) return '';
  const hasGroup=COMP_HAS_GROUP[key];
  const inGroupStage = hasGroup && c.group && !c.bracket;
  const body = inGroupStage ? cupGroupHTML(c) : cupBracketHTML(c,key);
  const b = inGroupStage ? null : (c.champion!==undefined ? c : c.bracket);
  const stageLabel = inGroupStage ? 'Fase de grupos' : (b ? cupPhaseLabel(b.round,b.roundsTotal) : 'Fase eliminatória');
  return `<div class="cl-live cl-classif">
    <div class="cl-classif-buttons">${btn('Continuar','cupClassifContinue()',{icon:'✔',cls:'cl-btn-ok cl-btn-sm'})}</div>
    <div class="cl-live-cup-top">${trophyImg(key,64)}
      <div class="cl-live-cup-name">${escC(COMP_DEFS[key].name)}</div>
      <div class="cl-live-cup-stage">${escC(stageLabel)}</div>
    </div>
    <div class="cl-cup-classif-body">${body}</div>
  </div>`;
}
function cupClassifContinue(){
  const queue=CL._cupClassifQueue||[];
  if(queue.length){ showCupClassif(queue.shift()); return; }
  CL._cupClassifQueue=null;
  finishCupResultFlow();
}
function updateLive(){ const RL=CL.live; if(!RL) return;
  const clk=document.querySelector('#cl-liveclock'); if(clk) clk.style.setProperty('--pct', liveClockPct(RL));
  RL.matches.forEach((m,i)=>{ const sc=document.querySelector('#cl-lm-'+i); if(sc) sc.innerHTML=liveScoreCells(m);
    const lg=document.querySelector('#cl-lg-'+i); if(lg){ const inc=(m.incidents||[])[m.incidents.length-1]; lg.textContent=inc?lastIncidentTxt(inc):''; } });
  if(RL.sel!=null){ const box=document.querySelector('#cl-livemodal'); if(box) box.innerHTML=liveModalHTML(RL.matches[RL.sel]); }
}
function lastIncidentTxt(inc){
  if(inc.type==='gol') return `⚽ ${escC(inc.player)} ${inc.min}'`;
  if(inc.type==='cartao') return `${inc.cardType==='vermelho'?'🟥':'🟨'} ${escC(inc.player)} ${inc.min}'`;
  if(inc.type==='lesao') return `✚ ${escC(inc.player)} ${inc.min}'`;
  return '';
}

/* ---- painel: ADVERSÁRIO (+ Calendário) ---- */
function panAdversario(oppId){
  if(!oppId) return `<div class="cl-adv">Sem adversário nesta jornada.</div>`;
  const r=ratings(oppId,false); const forca=Math.max(6,Math.min(100,Math.round((r.OS+r.DS)/2)));
  const rnd=rngFrom(hashC(oppId)); const coach=COACHES_C[Math.floor(rnd()*COACHES_C.length)];
  return `<div class="cl-adv">
    <div class="cl-adv-big">${clubLink(oppId)}</div>
    <div class="cl-bar cl-bar-lg"><div class="cl-bar-fill" style="width:${forca}%"></div></div>
    <div class="cl-adv-coach"><span>Treinador</span><b>${escC(coach)}</b></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;max-width:320px">
      ${btn('Calendário','clCalendar()',{icon:'📅',cls:'cl-btn-ok'})}
      ${btn('Ver elenco','clViewTeam(\''+oppId+'\')',{icon:'👥',cls:'cl-btn-ok'})}
    </div>
  </div>`;
}

/* ---- 13 · CALENDÁRIO (modal) ---- */
function userCalendar(){ const out=[]; (S.sched||[]).forEach((rd,i)=>{ const m=rd.find(([h,a])=>h===CL.clubId||a===CL.clubId);
  if(m){ const home=m[0]===CL.clubId; const opp=home?m[1]:m[0]; out.push({n:i+1,opp,home}); } }); return out; }
/* cada copa avança numa rodada de liga PRÓPRIA (ver CUP_TICK_OFFSET/cupTickMatchesRound
   em core.js — Copa do Brasil, Libertadores e Sul-Americana ficam defasadas por 1 rodada
   cada, 7 dias no calendário do jogo, bem acima do mínimo de 2 dias pra não parecer que
   clubes jogam duas competições no mesmo dia). Um confronto de copa só fica jogável ao
   vivo na véspera do avanço daquela competição específica. Dá pra prever em QUAL jornada
   de liga cada confronto pendente vai rolar: a próxima jornada em que essa competição bate
   (cupTickMatchesRound), +3 pra cada avanço seguinte (2º confronto de grupo pendente, 3º,
   ...) — é isso que permite intercalar copa e liga no calendário na ordem certa. */
function nextCupJornada(key, stepsAhead){
  let j=S.round+1; while(!cupTickMatchesRound(key,j)) j++;
  return j + stepsAhead*3;
}
/* TODOS os confrontos de copa ainda pendentes do clube do usuário, pro Calendário —
   diferente de pendingUserCupMatches() (que só libera perto do avanço em segundo plano,
   pra saber quando dá pra JOGAR ao vivo), esta função existe só pra EXIBIÇÃO e não tem
   esse gate de "véspera da rodada". Na fase de grupos lista TODAS as rodadas restantes
   (não só a próxima); no mata-mata só dá pra saber o confronto da rodada atual — o
   próximo adversário só é conhecido depois que essa rodada terminar, igual na vida real. */
function userCupCalendarRows(){
  if(!S.cups || !CL.clubId) return [];
  const out=[];
  const cb=S.cups.copaBrasil;
  if(cb && !cupIsFinished(cb)){
    const tie=(cb.ties||[]).find(t=>!t.winner && (t.h===CL.clubId||t.a===CL.clubId));
    if(tie) out.push({key:'copaBrasil', n:nextCupJornada('copaBrasil',0), opp:tie.h===CL.clubId?tie.a:tie.h, home:tie.h===CL.clubId});
  }
  groupCupKeys().forEach(key=>{
    const c=S.cups[key]; if(!c) return;
    if(c.group && !c.bracket && !c.group.finished){
      const mg=c.group;
      Object.values(mg.groups).forEach(g=>{
        if(!g.teams.includes(CL.clubId)) return;
        for(let r=mg.round;r<mg.roundsTotal;r++){
          const fx=(g.sched[r]||[]).find(([h,a])=>h===CL.clubId||a===CL.clubId);
          if(fx) out.push({key, n:nextCupJornada(key,r-mg.round), opp:fx[0]===CL.clubId?fx[1]:fx[0], home:fx[0]===CL.clubId});
        }
      });
    } else if(c.bracket && !cupIsFinished(c.bracket)){
      const tie=(c.bracket.ties||[]).find(t=>!t.winner && (t.h===CL.clubId||t.a===CL.clubId));
      if(tie) out.push({key, n:nextCupJornada(key,0), opp:tie.h===CL.clubId?tie.a:tie.h, home:tie.h===CL.clubId});
    }
  });
  return out;
}
/* datas de sorteio (Libertadores/Sul-Americana, oitavas de final 2026) pro Calendário —
   só existe data real conhecida pra 2026 (ver COMP_R16_DRAW_2026); temporadas seguintes
   não têm sorteio real, a virada é automática assim que a fase de grupos termina. */
function userCupDrawRows(){
  if(!S.cups || S.season!==2026) return [];
  const out=[];
  groupCupKeys().forEach(key=>{
    const c=S.cups[key]; if(!c || !c.group || c.bracket) return; // só antes do sorteio acontecer
    const d=COMP_R16_DRAW_2026[key]; if(!d) return;
    out.push({key, n:Math.max(S.round+1, jornadaForRealDate(d)), date:d});
  });
  return out;
}
function clCalendar(){
  // intercala copa, sorteio e liga por jornada (ver nextCupJornada/jornadaForRealDate) —
  // na mesma jornada, a(s) partida(s) de copa vêm antes da de liga, igual à ordem real de
  // jogo (clJogar() enfileira as partidas de copa pendentes antes de liberar a rodada de
  // liga); sorteios entram como um marco à parte, sem confronto associado.
  const cupRows=userCupCalendarRows().map(pc=>({n:pc.n, ord:0, html:
    `<div class="cl-cal-row cl-cal-cup"><span class="cl-cal-n">${pc.n}ª</span>
      <span class="cl-cal-t">🏆 ${COMP_DEFS[pc.key].short} · ${clubLink(pc.opp)}</span><span class="cl-cal-cf">${pc.home?'C':'F'}</span></div>`}));
  const drawRows=userCupDrawRows().map(dr=>({n:dr.n, ord:0, html:
    `<div class="cl-cal-row cl-cal-draw"><span class="cl-cal-n">${dr.n}ª</span>
      <span class="cl-cal-t">🎲 Sorteio das oitavas — ${COMP_DEFS[dr.key].short} (${fmtRealDate(dr.date)})</span><span class="cl-cal-cf"></span></div>`}));
  const ligaRows=userCalendar().map(r=>({n:r.n, ord:1, html:
    `<div class="cl-cal-row"><span class="cl-cal-n">${r.n}ª</span>
    <span class="cl-cal-t">${clubLink(r.opp)}</span><span class="cl-cal-cf">${r.home?'C':'F'}</span></div>`}));
  const rows=cupRows.concat(drawRows).concat(ligaRows).sort((a,b)=>a.n-b.n || a.ord-b.ord).map(r=>r.html).join('');
  overlayC(dlg('Calendário', `<div class="cl-cal">${rows}</div>
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,
    {w:640,bodyClass:'cl-body-gray',min:true}));
}

/* ---- menu dropdown (topo) ---- */
function clMenu(m,e){ if(e)e.stopPropagation(); CL.menu=(CL.menu===m?null:m); cdraw(); }
function clToggleMobMenu(e){ if(e)e.stopPropagation(); CL.mobMenuOpen=!CL.mobMenuOpen; if(!CL.mobMenuOpen)CL.menu=null; cdraw(); }
function clToggleRoster(){ CL.rosterOpen = CL.rosterOpen===false ? true : false; cdraw(); }
/* toggle genérico de acordeão — usado em qualquer seção recolhível (país, financeiro, etc.) */
function clToggleAcc(key){ CL[key] = CL[key]===false ? true : false; cdraw(); }
function menuDropdown(name){ name=name||CL.menu;
  const F=Object.keys(FORMATIONS);
  const items={
    'RetroFoot98':[['Opções...','clOptions()'],['—'],['Gravar jogo','clSaveMenu()'],['Sair para o menu','clExit()']],
    'Seleccionar':[...F.map((f,i)=>[`${f}`,`clSelFormation('${f}')`,(i+1)+'/'+FKEY[f]]),['—'],['Automático','clSelFormation(\'auto\')'],['Melhores','clSelFormation(\'best\')']],
    'Equipa':[['Estádio...','clStadium()'],['Historial...','clClubHistory()']],
    'Jogador':[['Vender','clSell()'],['Comprar jogador...','clMarketClubs()'],[`Propostas recebidas${(S.incomingOffers&&S.incomingOffers.length)?' ('+S.incomingOffers.length+')':''}...`,'clIncomingOffers()'],['Leilão de jogadores...','clAuctionScreen()'],['Últimas transferências...','clStub(\'Últimas transferências\')']],
    'Campeonatos':[['Minhas competições...','clCompList()','C'],['—'],['Melhores marcadores...','clScorers()'],['Calendário...','clCalendar()'],['—'],['Últimos vencedores...','clUltimosVencedores()'],['Melhores marcadores de sempre...','clScorersAllTime()']].concat((S&&S.bgLeagues&&Object.keys(S.bgLeagues).length)?[['—'],['Ligas internacionais...','clBgLeaguesMenu()']]:[]),
    'Treinador':[['História...','clCoachHistory()'],['Ranking...','clCoachRanking()'],['Ofertas...','clJobOffers()'],['Perfil...','clPerfilTreinador()']]
  };
  if(CL.online){
    const rItems=[];
    if(typeof NET!=='undefined' && NET.isHost){ const nr=(CL.pendingJoins&&CL.pendingJoins.length)||0; rItems.push(['Aprovar entradas'+(nr?' ('+nr+')':'')+'...','clJoinRequestsPanel()']); }
    rItems.push(['Sincronizar com a sala','clSyncResenha()']);
    rItems.push(['Chamar pra Resenha...','clInviteResenha()']);
    items['Modo Resenha']=rItems;
  }
  const list=items[name]||[]; if(!list.length) return '';
  const rows=list.map(it=>{ if(it[0]==='—') return '<div class="cl-menu-sep"></div>';
    return `<div class="cl-menu-dd-i" onclick="${it[1]}"><span>${escC(it[0])}</span>${it[2]?`<b>${it[2]}</b>`:''}</div>`; }).join('');
  return `<div class="cl-menu-dd" onclick="event.stopPropagation()">${rows}</div>`;
}
function clStub(t){ CL.menu=null; toastC(t+' — em breve.'); cdraw(); }
/* ---- RetroFoot98 > Opções... ---- */
function clOptions(){ CL.menu=null; CL.optTab='geral';
  if(!CL.options) CL.options={chicotadas:'Dos humanos',sorteio:'Quando houver humanos',gravar:'De 3 em 3 jornadas',som:'Sim',
    subsIntervalo:'Sim',penaltisCPU:'Sim',tempo:'Usain Bolt'};
  renderOptions(); }
function renderOptions(){ const o=CL.options; const tab=CL.optTab||'geral';
  const sel=(id,opts,val)=>`<select class="cl-osel" onchange="CL.options['${id}']=this.value">${opts.map(x=>`<option ${x===val?'selected':''}>${escC(x)}</option>`).join('')}</select>`;
  const geral=`<div class="cl-orow"><span>Mostrar chicotadas psicológicas</span>${sel('chicotadas',['Nunca','Dos humanos','De todos'],o.chicotadas)}</div>
    <div class="cl-orow"><span>Ver sorteio da taça</span>${sel('sorteio',['Nunca','Quando houver humanos','Sempre'],o.sorteio)}</div>
    <div class="cl-orow"><span>Gravar o jogo</span>${sel('gravar',['Nunca','De 3 em 3 jornadas','Sempre'],o.gravar)}</div>
    <div class="cl-orow"><span>Habilitar som</span>${sel('som',['Sim','Não'],o.som)}</div>`;
  const jogo=`<div class="cl-orow"><span>Substituições ao intervalo</span>${sel('subsIntervalo',['Sim','Não'],o.subsIntervalo)}</div>
    <div class="cl-orow"><span>Ver os desempates por penalties<br>nos jogos sem treinadores humanos</span>${sel('penaltisCPU',['Sim','Não'],o.penaltisCPU)}</div>
    <div class="cl-orow"><span>Tempo de jogo</span>${sel('tempo',['Curto','Médio','Longo','Ultrassônico','Usain Bolt'],o.tempo)}</div>`;
  overlayC(dlg('Opções', `<div class="cl-opt">
    <div class="cl-otabs"><span class="cl-otab ${tab==='geral'?'on':''}" onclick="CL.optTab='geral';renderOptions()">Geral</span><span class="cl-otab ${tab==='jogo'?'on':''}" onclick="CL.optTab='jogo';renderOptions()">Jogo</span></div>
    <div class="cl-opanel">${tab==='geral'?geral:jogo}</div>
    <div class="cl-oside">${btn('OK','clOptOk()',{icon:'✔',cls:'cl-btn-ok'})}${btn('Cancelar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}</div>
  </div>`,{w:740,bodyClass:'cl-body-gray',min:true})); }
function clOptOk(){ saveV3(); clCloseOverlay(); toastC('Opções guardadas.'); }

/* ---- Treinador > Perfil: preferências de verdade, não só cosmética —
   "Gestão de Salários" reajusta contratos sozinho a cada temporada (ver
   autoManageSalaries em app.js) e "Compra em leilão" filtra de verdade
   o que aparece no seu leilão (ver refreshAuctionPool em app.js). ---- */
function clPerfilTreinador(){ CL.menu=null;
  if(!S.config.profile) S.config.profile=freshConfig().profile; // migração defensiva pra saves antigos
  CL._profileSnapshot=JSON.parse(JSON.stringify(S.config.profile));
  CL.perfilTab='salarios';
  renderPerfilTreinador();
}
function renderPerfilTreinador(){
  const prof=S.config.profile; const tab=CL.perfilTab||'salarios';
  const tabs=`<div class="cl-otabs">
    <span class="cl-otab ${tab==='salarios'?'on':''}" onclick="CL.perfilTab='salarios';renderPerfilTreinador()">Gestão de Salários</span>
    <span class="cl-otab ${tab==='leilao'?'on':''}" onclick="CL.perfilTab='leilao';renderPerfilTreinador()">Compra em leilão</span>
  </div>`;
  let body;
  if(tab==='salarios'){
    const cb=(key,label)=>`<label class="cl-pcheck"><input type="checkbox" ${prof.salaryMgmt[key]?'checked':''} onchange="S.config.profile.salaryMgmt['${key}']=this.checked"> ${label}</label>`;
    body=`<div class="cl-pbody">
      <div class="cl-pmsg">Quero que o computador faça a<br>gestão dos salários:</div>
      ${cb('nacionais','aos jogadores nacionais')}
      ${cb('bosman','aos jogadores estrangeiros abrangidos pela Lei Bosman')}
      ${cb('estrangeiros','aos outros jogadores estrangeiros')}
    </div>`;
  } else {
    const modeRadio=(val,label)=>`<label class="cl-pradio"><input type="radio" name="cl-auctionmode" ${prof.auctionMode===val?'checked':''} onchange="S.config.profile.auctionMode='${val}'"> ${label}</label>`;
    body=`<div class="cl-pbody">
      <label class="cl-pcheck"><input type="checkbox" ${prof.auctionPrivate?'checked':''} onchange="S.config.profile.auctionPrivate=this.checked"> Não quero que os outros vejam as minhas ofertas</label>
      <fieldset class="cl-pfield"><legend>Ofertas</legend>
        ${modeRadio('todos','Quero fazer ofertas a todos os jogadores')}
        ${modeRadio('sem_fracos','Não quero fazer ofertas aos jogadores mais fracos')}
        ${modeRadio('nenhum','Não quero comprar jogadores em leilão')}
      </fieldset>
    </div>`;
  }
  overlayC(dlg('Perfil de '+escC(CL.mgr||'Treinador'), `<div class="cl-opt">
    ${tabs}
    <div class="cl-opanel">${body}</div>
    <div class="cl-oside">${btn('OK','clPerfilOk()',{icon:'✔',cls:'cl-btn-ok'})}${btn('Cancelar','clPerfilCancel()',{icon:'✖',cls:'cl-btn-cancel'})}</div>
  </div>`,{w:740,bodyClass:'cl-body-gray',min:true}));
}
function clPerfilOk(){ saveV3(); clCloseOverlay(); toastC('Preferências do treinador guardadas.'); advanceAuctions(); }
function clPerfilCancel(){ S.config.profile=CL._profileSnapshot; clCloseOverlay(); }

/* ---- Treinador > História / Ranking ---- */
const COACH_POOL=['C. A. Silva','Artur Nunes','Dimas Filgueiras','Wanderlei Sousa','Carlos A. Silva','Antônio Lopes','Celso Roth','Émerson Leão','Cláudio Duarte','Gassem','Eduardo Amorim','Joel Castro','Oswaldo Alvarez','Arnaldo Lira','Felipe Scolari','Rafael Granit','Nelsinho','C. A. Torres','Gilson Nunes','Rubens Minelli','Beto Almeida','Pardal','Lauro Búrigo','Amado Bucar','Abel Braga','Evaristo Macedo','Jair Pereira'];
function coachName(clubId,idx){ if(CL.humans&&CL.humans[clubId]) return CL.humans[clubId]; return COACH_POOL[idx%COACH_POOL.length]; }
/* ícone por tipo de evento da carreira do treinador — troféus de campeão usam a imagem
   real da competição (ver comp); os demais tipos usam um emoji fixo */
const COACH_HIST_ICON={contratado:'🤝', acesso:'🔺', rebaixamento:'🔻', campeao:'🏆', demissao:'🚪'};
function coachHistRowHTML(entry){
  // compat: saves antigos guardavam a linha como texto puro "TEMPORADA  Texto"; sem tipo,
  // sem ícone reconhecido — mostra como estava antes.
  if(typeof entry==='string') return `<div class="cl-chist-row"><span class="cl-chist-ic">📌</span><span>${escC(entry)}</span></div>`;
  const trophy = entry.type==='campeao' && entry.comp ? trophyImg(entry.comp,20) : '';
  const icon = trophy || `<span class="cl-chist-ic">${COACH_HIST_ICON[entry.type]||'📌'}</span>`;
  return `<div class="cl-chist-row">${icon}<span><b>${entry.season}</b> — ${escC(entry.text)}</span></div>`;
}
/* tabela temporada-a-temporada (posição na divisão + fase alcançada em cada copa) —
   reaproveitada por clCoachHistory (carreira inteira, todos os clubes) e clClubHistory
   (só as temporadas de um clube específico). Fonte: S.history, alimentado em endSeason(). */
function seasonHistoryTableHTML(entries){
  if(!entries.length) return '<div class="cl-cup-hint">Nenhuma temporada concluída ainda.</div>';
  const head=`<div class="cl-seasonhist-row cl-seasonhist-head">
    <span>Ano</span><span>Clube</span><span>Posição</span><span>Copa do Brasil</span><span>Libertadores</span><span>Sul-Americana</span></div>`;
  const cupLabel=(h,k)=>escC((h.myCups&&h.myCups[k])||'—');
  const rows=entries.slice().reverse().map(h=>`<div class="cl-seasonhist-row">
      <span class="cl-seasonhist-season">${h.season}</span>
      <span>${escC(h.myClubShort||'—')}</span>
      <span>${h.myPos?h.myPos+'º — Série '+escC(h.division||'A'):'—'}</span>
      <span>${cupLabel(h,'copaBrasil')}</span>
      <span>${cupLabel(h,'libertadores')}</span>
      <span>${cupLabel(h,'sulamericana')}</span>
    </div>`).join('');
  return head+rows;
}
function clCoachHistory(){ CL.menu=null;
  const lines=(S.coachHistory&&S.coachHistory.length)?S.coachHistory:[{season:S.season, type:'contratado', text:`Contratado pelo ${clubOf(CL.clubId).short.toUpperCase()}`}];
  const seasonTable=seasonHistoryTableHTML(S.history||[]);
  overlayC(dlg(CL.mgr||'Treinador', `
    <div class="cl-seasonhist-wrap">${seasonTable}</div>
    <div class="cl-chist" style="margin-top:12px">${lines.map(coachHistRowHTML).join('')}</div>
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:660,bodyClass:'cl-body-gray',min:true})); }
/* ---- Equipa > Historial: as temporadas em que o clube (o atual, por padrão) foi
   comandado pelo treinador neste save — útil se ele já assumiu outros clubes e quer ver
   o resumo de um deles. Só cobre clubes que o próprio jogador já comandou (S.history só
   grava detalhe pra CL.clubId de cada temporada, não pra todos os 80 clubes do universo). */
function clClubHistory(clubId){ CL.menu=null;
  clubId = clubId || CL.clubId;
  const c=clubOf(clubId);
  const entries=(S.history||[]).filter(h=>h.clubId===clubId);
  const table=seasonHistoryTableHTML(entries);
  const hint = '<div class="cl-cup-hint">Mostra só as temporadas em que você comandou este clube neste save.</div>';
  overlayC(dlg('Historial — '+(c?c.short:'clube'), `<div class="cl-seasonhist-wrap">${table}</div>${hint}
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:660,bodyClass:'cl-body-gray',min:true})); }
function clCoachRanking(){ CL.menu=null;
  const rows=DATA.clubs.map((c,i)=>{const t=S.table[c.id]||{W:0,D:0,Pts:0}; return {name:coachName(c.id,i),club:clubOf(c.id).short,W:t.W,D:t.D,Pts:t.Pts,human:!!(CL.humans&&CL.humans[c.id])};})
    .sort((a,b)=>b.Pts-a.Pts||b.W-a.W);
  const list=rows.map((r,i)=>`<div class="cl-rank-row ${r.human?'me':''}"><span class="cl-rank-p">${i+1}</span><span class="cl-rank-c">${escC(r.name)}</span><span class="cl-rank-t">${escC(r.club)}</span><span class="cl-rank-n">${r.W} +</span><span class="cl-rank-n">${r.D} =</span><span class="cl-rank-n b">${r.Pts}</span></div>`).join('');
  overlayC(dlg('Ranking de Treinadores', `<div class="cl-rank">${list}</div>
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:780,bodyClass:'cl-body-gray',min:true})); }

/* ---- Treinador > Ofertas ---- */
function clJobOffers(){ CL.menu=null;
  const offers=S.pendingJobOffers||[];
  if(!offers.length){
    overlayC(dlg('Ofertas', `<div class="cl-offers-empty">
      <div style="padding:20px;text-align:center">Nenhuma oferta no momento.</div>
    </div>
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:600,bodyClass:'cl-body-gray',min:true}));
    return;
  }
  const rows=offers.map((o,i)=>{
    const c=clubOf(o.clubId);
    const sq = squad(o.clubId);
    const avgMoral = sq ? sq.reduce((s,p)=>s+(p.moral||70),0) / (sq.length||1) : 0;
    const tablePos = sortedTable().findIndex(t=>t.id===o.clubId)+1;
    return `<div class="cl-offer-item">
      <div class="cl-offer-header" style="${clubStripe(c)};padding:8px;border-radius:4px;color:white;margin-bottom:6px">
        <span style="font-weight:bold">${escC(c.short)}</span> — <span>${DIV_LABEL_FULL[o.division]}</span>
      </div>
      <div class="cl-offer-details">
        <div><span>Posição:</span><b>${tablePos}º lugar</b></div>
        <div><span>Salário:</span><b>${fmt(o.salary)}/sem</b></div>
        <div><span>Moral média do time:</span><b>${Math.round(avgMoral)}%</b></div>
        <div><span>Caixa do clube:</span><b>${fmt(c.cash||0)}</b></div>
      </div>
      <div class="cl-offer-actions">
        ${btn('Aceitar','clAcceptPendingOffer('+i+')',{icon:'✔',cls:'cl-btn-ok'})}
        ${btn('Ver elenco','clViewOfferSquad('+i+')',{icon:'👥',cls:'cl-btn-info'})}
        ${btn('Recusar','clDeclinePendingOffer('+i+')',{icon:'✖',cls:'cl-btn-cancel'})}
      </div>
    </div>`; }).join('');
  overlayC(dlg('Ofertas de Contratação', `<div class="cl-offers-list">${rows}</div>
    <div class="cl-offer-footer" style="padding:12px;background:#f5f5f5;border-top:1px solid #ddd;color:#666;font-size:13px">
      Você tem até 5 rodadas para responder cada oferta.
    </div>
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:700,bodyClass:'cl-body-gray'}));
}
function clAcceptPendingOffer(idx){
  const o=S.pendingJobOffers[idx]; if(!o) return;
  S.coachHistory=S.coachHistory||[];
  S.coachHistory.push({season:S.season, type:'contratado', text:`Contratado pelo ${clubOf(o.clubId).short.toUpperCase()}`});
  applyManagerJobChange(o.clubId,o.division);
  if(o.salary) S.coachSalary=o.salary;
  S.pendingJobOffers.splice(idx,1);
  clCloseOverlay(); saveV3(); cdraw();
}
function clDeclinePendingOffer(idx){
  S.pendingJobOffers.splice(idx,1);
  clJobOffers(); // reabrir modal
}
function clViewOfferSquad(idx){
  const o=S.pendingJobOffers[idx]; if(!o) return;
  const sq = squad(o.clubId) || [];
  const rows=sq.map(p=>`<div class="cl-prow ${p.n===CL.selPlayer?'sel':''}" style="padding:4px 8px;border-bottom:1px solid #eee">
    <span style="font-weight:bold">${escC(p.n)}</span> <span style="color:#666">${p.pos}</span> <span style="float:right">${p.ov||55}</span>
  </div>`).join('');
  overlayC(dlg('Elenco '+escC(clubOf(o.clubId).short), `<div style="max-height:400px;overflow-y:auto">${rows}</div>
    <div class="cl-cal-ok">${btn('Voltar','clJobOffers()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:500,bodyClass:'cl-body-gray',min:true}));
}

/* ---- Modo Resenha > Chamar pra Resenha ---- */
function clInviteResenha(){ CL.menu=null; if(!CL.online){ toastC('Modo Resenha requer jogo online.'); return; }
  const link=(typeof NET!=='undefined')?NET.inviteLink():'';
  overlayC(dlg('Chamar pra Resenha', `<div class="cl-invres">
    <div class="cl-invres-msg">Convide amigos para assumir times de CPU nesta partida. Eles entrarão agora mesmo na sua sala de jogo.</div>
    <div class="cl-invres-opt" style="margin-bottom:16px">
      <div class="cl-invres-lbl">🔗 Link da sala</div>
      <div class="cl-invres-linkrow">
        <input class="cl-input cl-invres-link" id="cl-invres-link" readonly value="${escC(link)}" onclick="this.select()">
        ${btn('Copiar link','clCopyResenhaLink()',{icon:'📋',cls:'cl-btn-ok'})}
      </div>
    </div>
    <div class="cl-invres-item">
      <div class="cl-invres-club">🎲 Um time livre é <b>sorteado</b> para o convidado ao entrar.</div>
    </div>
    <div class="cl-invite2col">
      <div class="cl-invres-opt">
        <div class="cl-invres-lbl">📱 Por WhatsApp</div>
        <div class="cl-invres-phone"><span class="cl-ddi">+55</span><input class="cl-input" inputmode="numeric" placeholder="DDD + número" id="cl-invres-phone" maxlength="11"></div>
        ${btn('Enviar por WhatsApp','clSendResenhaInvite()',{icon:'✔',cls:'cl-btn-ok'})}
      </div>
      <div class="cl-invres-opt">
        <div class="cl-invres-lbl">✉️ Por e-mail</div>
        <input class="cl-input" type="email" placeholder="email@exemplo.com" id="cl-invres-email">
        ${btn('Enviar por e-mail','clSendResenhaEmailInvite()',{icon:'✔',cls:'cl-btn-ok'})}
      </div>
    </div>
  </div>
  <div class="cl-cal-ok">${btn('Fechar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}</div>`,
  {w:700,bodyClass:'cl-body-green'})); }
/* copia o link da sala com 1 clique — clipboard API com fallback pra execCommand
   (alguns webviews/navegadores mais antigos não expõem navigator.clipboard) */
function clCopyResenhaLink(){
  const inp=document.querySelector('#cl-invres-link'); const link=inp?inp.value:'';
  if(!link){ toastC('⚠ Link indisponível.'); return; }
  const done=()=>toastC('✓ Link copiado!');
  const fallback=()=>{ try{ inp.select(); inp.setSelectionRange(0,99999); document.execCommand('copy'); done(); }
    catch(e){ toastC('⚠ Não foi possível copiar — selecione o link e copie manualmente.'); } };
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(link).then(done).catch(fallback); }
  else fallback();
}
function clSendResenhaInvite(){ const phone=(document.querySelector('#cl-invres-phone')?.value||'').replace(/\D/g,'');
  if(phone.length<10){ toastC('Informe um telefone válido.'); return; }
  const link=(typeof NET!=='undefined')?NET.inviteLink():''; const wa='https://wa.me/55'+phone+'?text='+encodeURIComponent('Vem pra minha Resenha do RetroFoot98! Um time é sorteado pra você. '+link);
  try{ window.open(wa,'_blank'); }catch(e){} toastC('Abrindo WhatsApp…'); }
function clSendResenhaEmailInvite(){ const email=(document.querySelector('#cl-invres-email')?.value||'').trim();
  if(!email || !email.includes('@')){ toastC('Informe um e-mail válido.'); return; }
  if(typeof NET==='undefined' || !NET.sendEmailInvite){ toastC('Convite por e-mail requer jogo online.'); return; }
  toastC('Enviando convite por e-mail…');
  (async ()=>{ try { await NET.sendEmailInvite(email); toastC('✓ Convite enviado por e-mail!'); const inp=document.querySelector('#cl-invres-email'); if(inp) inp.value=''; }
    catch(e){ toastC('⚠ '+(e&&e.message||'Erro ao enviar convite por e-mail')); } })(); }
function clTab2(t){ CL.menu=null; CL.tab=t; cdraw(); }
function clSaveMenu(){ CL.menu=null; cdraw(); saveV3(true); }
/* "Sair para o menu" não pode simplesmente descartar a partida em andamento — progresso
   não gravado (rodadas jogadas desde o último save) se perderia sem aviso. Pergunta
   primeiro; em modo online a sala já fica sincronizada a cada rodada (NET.saveGame), então
   não faz sentido oferecer "gravar" ali, só confirmar a saída mesmo. */
function clExit(){
  CL.menu=null;
  overlayC(exitModalHTML(!!CL.online));
}
/* modal "Sair para o menu" (redesign handoff_sorteio_dialogo): barra navy com minimizar à
   esquerda, texto centralizado, botões grandes (emoji acima do label) e Cancelar. Fecha no
   backdrop (overlayC.onclick), no "_" ou no Cancelar. Online: só confirma a saída (sala segue). */
function exitModalHTML(online){
  const text = online
    ? 'Sair da partida agora? A sala continua ativa pros outros treinadores — você pode voltar depois.'
    : 'Quer gravar o jogo antes de sair? O progresso não gravado será perdido.';
  const bigBtns = online
    ? btn('Sair','clExitConfirm(false)',{icon:'✔',cls:'cl-btn-ok cl-btn-big'})
    : `${btn('Gravar e sair','clExitConfirm(true)',{icon:'☁',cls:'cl-btn-ok cl-btn-big'})}${btn('Sair sem gravar','clExitConfirm(false)',{icon:'✖',cls:'cl-btn-cancel cl-btn-big'})}`;
  return `<div class="cl-exitmodal">
    <div class="cl-exitmodal-bar"><button class="cl-exitmodal-min" onclick="clCloseOverlay()" aria-label="Fechar">_</button>Sair para o menu</div>
    <div class="cl-exitmodal-body">
      <p class="cl-exitmodal-text">${text}</p>
      <div class="cl-exitmodal-btns">${bigBtns}</div>
      <div class="cl-exitmodal-cancel">${btn('Cancelar','clCloseOverlay()',{cls:'cl-btn-mini'})}</div>
    </div>
  </div>`;
}
async function clExitConfirm(shouldSave){
  clCloseOverlay();
  if(typeof clStopHostReqPoll==='function') clStopHostReqPoll(); // encerra o acompanhamento de pedidos
  if(shouldSave) await saveV3(true); // já mostra a barra de gravação e um toast de sucesso/erro
  CL.screen='abertura'; cdraw();
}
/* zona de classificação continental pra próxima temporada (só existe na Série A —
   ver computeQualification: G6 -> Libertadores, 7º-12º -> Sul-Americana) */
function qualificationZone(division,pos){
  if(division!=='A') return null;
  if(pos<=6) return 'lib';
  if(pos<=12) return 'sul';
  return null;
}
function qualificationZoneBadge(zone){
  if(zone==='lib') return `<span class="cl-cls-zone zone-lib">${trophyImg('libertadores',14)||'🏆'} Libertadores</span>`;
  if(zone==='sul') return `<span class="cl-cls-zone zone-sul">${trophyImg('sulamericana',14)||'🥈'} Sul-Americana</span>`;
  return '';
}
function clClassif(){ CL.menu=null;
  const rows=sortedTable().map((t,i)=>{const me=t.id===CL.clubId; const zone=qualificationZone(S.division,i+1);
    return `<div class="cl-cls-row ${me?'me':''} ${zone?'zone-'+zone:''}"><span class="cl-cls-p">${i+1}</span><span class="cl-cls-n">${clubLink(t.id)}</span>
      <span class="cl-cls-num b">${t.Pts}</span><span class="cl-cls-num">${t.W}</span><span class="cl-cls-num">${t.D}</span><span class="cl-cls-num">${t.L}</span>
      <span class="cl-cls-num">${t.GF}</span><span class="cl-cls-num">${t.GA}</span>${qualificationZoneBadge(zone)}</div>`;}).join('');
  overlayC(dlg('Classificação', `<div class="cl-cls-head"><span class="cl-cls-p">#</span><span class="cl-cls-n">Equipa</span>
    <span class="cl-cls-num">P</span><span class="cl-cls-num">V</span><span class="cl-cls-num">E</span><span class="cl-cls-num">D</span><span class="cl-cls-num">GP</span><span class="cl-cls-num">GC</span><span></span></div>
    <div class="cl-cls">${rows}</div><div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,
    {w:680,bodyClass:'cl-body-gray',min:true})); }


/* ---- Campeonatos > Minhas competições (lista + estado de classificação) ---- */
function clCompList(){ CL.menu=null;
  const cid=CL.clubId;
  const inSerieA = S.division==='A';
  // competições do universo ativo (Brasil: Copa do Brasil/Libertadores/Sul-Americana;
  // internacional: Champions League/Europa League)
  const cups=allCupKeys().map(k=>({key:k, def:COMP_DEFS[k], c:S.cups&&S.cups[k]}));
  const trophyFor={copaBrasil:'copaBrasil', libertadores:'libertadores', sulamericana:'sulamericana', championsLeague:'championsLeague', europaLeague:'europaLeague'};
  const rows=[`<div class="cl-complist-row" onclick="clClassif()">
      <span class="cl-complist-ic">${divisionTrophyImg(S.division,24)||'🏆'}</span><span class="cl-complist-n">${escC(divisionLabel())}</span>
      <span class="cl-complist-st ok">Disputando — ${tablePos(cid)}º lugar</span></div>`];
  cups.forEach(x=>{
    const disabled = S.compToggle && S.compToggle[x.key]===false;
    // no Brasil, Libertadores/Sul-Americana são exclusivas da Série A; no universo intl não há
    // essa restrição (a vaga na Champions/Europa vem de estar classificado, não da divisão).
    const restrictToSerieA = !isIntlUniverse() && x.key!=='copaBrasil';
    const qualified = (!restrictToSerieA || inSerieA) && S.qualification && S.qualification[x.key] && S.qualification[x.key].includes(cid);
    const c=x.c;
    let statusTxt, statusCls, clickable=false;
    // não classificado/eliminado/fora da Série A não bloqueia mais o acesso — só não
    // dá pra ver uma competição desligada neste save ou que ainda nem foi sorteada
    // (não existe nada pra mostrar). Fora isso, qualquer um pode acompanhar tabela e
    // chaveamento, mesmo sem disputar.
    if(disabled){ statusTxt='Desligada neste save'; statusCls='off'; }
    else if(!c){ statusTxt='Aguardando sorteio'; statusCls='off'; }
    else if(cupCompetitionChampion(c)===cid){ statusTxt='🏆 CAMPEÃO'; statusCls='ok'; clickable=true; }
    else if(restrictToSerieA && !inSerieA){ statusTxt='Só clubes da Série A · acompanhar'; statusCls='out'; clickable=true; }
    else if(!qualified){ statusTxt='Não classificado · acompanhar'; statusCls='out'; clickable=true; }
    else if(!cupCompetitionTeamAlive(c,cid)){ statusTxt='Eliminado · acompanhar'; statusCls='out'; clickable=true; }
    else { statusTxt=cupCompetitionRoundLabel(c,x.key); statusCls='ok'; clickable=true; }
    const icon=trophyImg(trophyFor[x.key],24) || (x.key==='copaBrasil'?flagImg('Brasil'):'🌎');
    rows.push(`<div class="cl-complist-row ${clickable?'':'disabled'}" ${clickable?`onclick="clCupView('${x.key}')"`:''}>
      <span class="cl-complist-ic">${icon}</span>
      <span class="cl-complist-n">${escC(x.def.name)}</span>
      <span class="cl-complist-st ${statusCls}">${statusTxt}</span></div>`);
  });
  overlayC(dlg('Minhas competições', `<div class="cl-complist">${rows.join('')}</div>
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,
    {w:620,bodyClass:'cl-body-gray',min:true}));
}
/* ---- tela da copa: fase de grupos (se houver) + fase eliminatória (chaveamento visual) ---- */
function clCupView(key, tab){ CL.menu=null;
  const c=S.cups&&S.cups[key]; if(!c) return;
  const hasGroup=COMP_HAS_GROUP[key];
  CL.cupTab = tab || (CL.cupTab && (hasGroup || CL.cupTab==='chave') ? CL.cupTab : null) || (hasGroup ? 'grupos' : 'chave');
  overlayC(dlg(COMP_DEFS[key].name, cupViewBodyHTML(key,c,hasGroup), {w:720,bodyClass:'cl-body-gray',min:true}));
}
function clCupTab(key,tab){ CL.cupTab=tab; clCupView(key,tab); }
function cupViewBodyHTML(key,c,hasGroup){
  const trophyHdr = `<div class="cl-comp-hdr-trophy">${trophyImg(key,44)}</div>`;
  const champ=cupCompetitionChampion(c);
  const champBanner = champ ? `<div class="cl-cup-champ">🏆 Campeão: <b>${clubLink(champ)}</b></div>` : '';
  const tabsHTML = hasGroup ? `<div class="cl-cup-tabs">
      ${btn('Fase de Grupos',`clCupTab('${key}','grupos')`,{cls:'cl-cup-tabbtn'+(CL.cupTab==='grupos'?' active':'')})}
      ${btn('Fase Eliminatória',`clCupTab('${key}','chave')`,{cls:'cl-cup-tabbtn'+(CL.cupTab==='chave'?' active':'')})}
    </div>` : '';
  const body = (hasGroup && CL.cupTab==='grupos') ? cupGroupHTML(c) : cupBracketHTML(c,key);
  return `<div class="cl-cup">${trophyHdr}${champBanner}${tabsHTML}${body}</div>
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`;
}
/* fase de grupos: turno-e-returno único entre os classificados brasileiros — os N
   melhores (destacados) avançam pro mata-mata quando a fase termina */
function cupGroupHTML(c){
  if(!c.group) return '<div class="cl-cup-hint">Esta competição não tem fase de grupos.</div>';
  const g=c.group, cid=CL.clubId;
  const labels=Object.keys(g.groups);
  const multi=labels.length>1;
  const myLabel=labels.find(l=>g.groups[l].teams.includes(cid));
  const groupHead=`<div class="cl-cls2-head"><span class="cl-cls2-pos">#</span><span class="cl-cls2-n">Clube</span><span class="cl-cls2-pts">P</span><span class="cl-cls2-x">V</span><span class="cl-cls2-x">E</span><span class="cl-cls2-x">D</span><span class="cl-cls2-x">GP</span><span class="cl-cls2-x">GC</span></div>`;
  const groupBlock=(label)=>{
    const standings=groupTableStandings(g.groups[label]);
    const rows=standings.map((t,i)=>{ const cl=clubOf(t.id); const me=t.id===cid;
      return `<div class="cl-cls2-row ${me?'me':''} ${i<g.advancePerGroup?'cl-cup-advances':''}" style="${clubStripe(cl)}">
        <span class="cl-cls2-pos">${i+1}</span><span class="cl-cls2-n">${clubLink(t.id)}</span>
        <span class="cl-cls2-pts">${t.Pts}</span><span class="cl-cls2-x">${t.W}</span><span class="cl-cls2-x">${t.D}</span><span class="cl-cls2-x">${t.L}</span>
        <span class="cl-cls2-x">${t.GF}</span><span class="cl-cls2-x">${t.GA}</span></div>`; }).join('');
    return multi
      ? `<fieldset class="cl-cup-round"><legend>Grupo ${escC(label)}${label===myLabel?' — seu grupo':''}</legend>${groupHead}${rows}</fieldset>`
      : `${groupHead}${rows}`;
  };
  const ordered = (multi && myLabel) ? [myLabel, ...labels.filter(l=>l!==myLabel)] : labels;
  const status = g.finished
    ? `<div class="cl-cup-hint">Fase de grupos encerrada — os ${g.advancePerGroup} primeiros de cada grupo (destacados) avançam à fase eliminatória.</div>`
    : `<div class="cl-cup-hint">Rodada ${g.round}/${g.roundsTotal} — avançam os ${g.advancePerGroup} primeiros de cada grupo ao final. Resolve automaticamente a cada 3 rodadas do Brasileirão.</div>`;
  return `<div class="cl-cup-groups-wrap">${ordered.map(groupBlock).join('')}</div>${status}`;
}
/* fase eliminatória: chaveamento visual, uma coluna por rodada (estrutura de chaves) */
function cupBracketHTML(c,key){
  const b = c.champion!==undefined ? c : c.bracket;
  if(!b){
    if(c.group && c.group.finished){
      const drawDate=key && S.season===2026 ? COMP_R16_DRAW_2026[key] : null;
      return `<div class="cl-cup-hint">Fase de grupos encerrada — aguardando o sorteio das oitavas de final${drawDate?` (${fmtRealDate(drawDate)})`:''}.</div>`;
    }
    return `<div class="cl-cup-hint">A fase eliminatória ainda não começou — aguardando o fim da fase de grupos.</div>`;
  }
  const cid=CL.clubId;
  // times "de folga" (bye) não entram no chaveamento como caixa própria — ainda não têm
  // adversário de verdade, então só apareceriam como "fulano — de folga", confuso. Eles
  // simplesmente aparecem na rodada seguinte assim que caírem num confronto real.
  const tieBox=(t)=>{ const w=t.winner, decided=w!=null;
    // defesa contra dados corrompidos de uma disputa de pênaltis que não terminou direito
    // (ex: save antigo travado antes do bug do RL.pensPicking ser corrigido) — nunca
    // mostra "pênaltis undefined×undefined", só omite a linha se os números não baterem.
    const pensTag = (t.pens && Number.isFinite(t.pens.h) && Number.isFinite(t.pens.a))
      ? `<div class="cl-bracket-pens">pênaltis ${t.pens.h}×${t.pens.a}</div>` : '';
    return `<div class="cl-bracket-tie ${(t.h===cid||t.a===cid)?'me':''}">
      <div class="cl-bracket-team ${w===t.h?'win':decided?'lose':''}"><span>${clubLink(t.h)}</span>${decided?`<b>${t.hg}</b>`:''}</div>
      <div class="cl-bracket-team ${w===t.a?'win':decided?'lose':''}"><span>${clubLink(t.a)}</span>${decided?`<b>${t.ag}</b>`:''}</div>
      ${pensTag}
    </div>`; };
  const cols=[];
  (b.history||[]).forEach(h=>{
    if(h.ties.length) cols.push({label:cupPhaseLabel(h.round,b.roundsTotal), boxes:h.ties.map(tieBox)});
  });
  if(!cupIsFinished(b) && b.ties.length){
    cols.push({label:`${cupPhaseLabel(b.round,b.roundsTotal)} (pendente)`, boxes:b.ties.map(tieBox)});
  }
  if(!cols.length) return '<div class="cl-cup-hint">O chaveamento ainda não começou.</div>';
  if(b.champion){
    cols.push({label:'Campeão', boxes:[`<div class="cl-bracket-tie champ"><div class="cl-bracket-team win"><span>🏆 ${clubLink(b.champion)}</span></div></div>`]});
  } else if(b.round<b.roundsTotal){
    // taça sempre visível como destino final do chaveamento, mesmo faltando rodadas — não
    // duplica quando a própria rodada pendente já É a final (já rotulada "Final (pendente)"
    // acima) — ajuda o jogador a sentir o quão perto (ou longe) está do título.
    cols.push({label:'Final', boxes:[`<div class="cl-bracket-tie champ-pending"><div class="cl-bracket-team"><span>🏆 ?</span></div></div>`], ghost:true});
  }
  return `<div class="cl-bracket-wrap">${cols.map(col=>`<div class="cl-bracket-col${col.ghost?' cl-bracket-col-ghost':''}"><div class="cl-bracket-col-h">${escC(col.label)}</div>${col.boxes.join('')}</div>`).join('')}</div>`;
}

/* ================= SORTEIO DOS JOGOS DA TAÇA (cerimônia animada, igual ao RetroFoot98 clássico) =================
   Quando um chaveamento novo é montado (Copa do Brasil no início da temporada; Libertadores/
   Sul-Americana no dia real do sorteio das oitavas), o pareamento em si já foi decidido de
   forma determinística (makeBracket — mesmo overall/seed de sempre); esta tela só ANIMA a
   revelação bola-a-bola desse resultado, com ~2s entre cada sorteio (acelerável), igual à
   tela clássica "Sorteio dos jogos da taça": lista de times à esquerda (encolhendo conforme
   saem), confrontos sorteados à direita, e destaque embaixo pro(s) time(s) do usuário —
   um único destaque no modo solo, ou um por jogador humano (cores do próprio clube) na Resenha. */
/* fila de sorteios a mostrar: cada item é {key, stage} — stage 'group' (fase de grupos,
   time -> grupo) ou 'bracket' (mata-mata, pares/isento). */
function queueDrawShow(key, stage){ S._pendingDrawShows=S._pendingDrawShows||[]; stage=stage||'bracket';
  if(!S._pendingDrawShows.some(x=>(x&&x.key)===key && (x&&x.stage||'bracket')===stage)) S._pendingDrawShows.push({key, stage}); }
/* dispara o próximo sorteio pendente, se houver; encadeia até esvaziar a fila e só então
   chama onDone (ex: mostrar a classificação da rodada, ou o aviso de acesso/queda) */
function checkPendingCupDraws(onDone){
  if(!S._pendingDrawShows || !S._pendingDrawShows.length){ if(onDone) onDone(); return false; }
  const item=S._pendingDrawShows.shift();
  const key=(item&&item.key)||item, stage=(item&&item.stage)||'bracket'; // retrocompat com saves que guardaram só a string
  startCupDrawReplay(key, stage, ()=>checkPendingCupDraws(onDone));
  return true;
}
function startCupDrawReplay(key, stage, onDone){
  if(typeof stage==='function'){ onDone=stage; stage='bracket'; } // retrocompat
  const c=S.cups&&S.cups[key];
  let reveal=[], remaining=[];
  if(stage==='group'){
    const g=c&&c.group; if(!g||!g.groups){ if(onDone) onDone(); return; }
    Object.values(g.groups).forEach(grp=>{ (grp.teams||[]).forEach(id=>reveal.push({type:'group',id,group:grp.label})); });
    reveal.sort((a,b)=>clubOf(a.id).name.localeCompare(clubOf(b.id).name)); // sai em ordem alfabética
    remaining=reveal.map(r=>r.id);
  } else {
    const b = c&&c.champion!==undefined ? c : (c&&c.bracket);
    if(!b){ if(onDone) onDone(); return; }
    b.byeTeams.forEach(id=>reveal.push({type:'bye',id})); b.ties.forEach(t=>reveal.push({type:'tie',h:t.h,a:t.a}));
    remaining=[...b.byeTeams,...b.ties.flatMap(t=>[t.h,t.a])].sort((x,y)=>clubOf(x).name.localeCompare(clubOf(y).name));
  }
  CL.cupDraw={ key, stage, reveal, idx:0, drawn:[], remaining, fast:false, onDone };
  CL.screen='cupdraw'; cdraw();
  cupDrawTick();
}
function cupDrawTick(){
  const st=CL.cupDraw; if(!st || CL.screen!=='cupdraw') return;
  if(st.idx>=st.reveal.length){
    CL._cupDrawTimer=setTimeout(()=>{ const done=st.onDone; CL.cupDraw=null; CL.screen='main'; cdraw(); if(done) done(); }, st.fast?400:1800);
    cdraw(); return;
  }
  const item=st.reveal[st.idx++];
  if(item.type==='bye'){ st.drawn.push({h:item.id,a:null,bye:true}); st.remaining=st.remaining.filter(id=>id!==item.id); }
  else if(item.type==='group'){ st.drawn.push({h:item.id,group:item.group}); st.remaining=st.remaining.filter(id=>id!==item.id); }
  else { st.drawn.push({h:item.h,a:item.a}); st.remaining=st.remaining.filter(id=>id!==item.h&&id!==item.a); }
  cdraw();
  CL._cupDrawTimer=setTimeout(cupDrawTick, st.fast?150:2000);
}
function clCupDrawSkip(){ if(CL.cupDraw){ CL.cupDraw.fast=true; toastC('⏩ Sorteio acelerado'); } }
function cupDrawHighlightHTML(pair){
  const hCl=clubOf(pair.h), aCl=pair.a?clubOf(pair.a):null;
  return `<div class="cl-draw-hrow">
    <div class="cl-draw-hbox" style="${clubStripe(hCl)}">${escC(hCl.short.toUpperCase())}</div>
    ${aCl?`<div class="cl-draw-hbox" style="${clubStripe(aCl)}">${escC(aCl.short.toUpperCase())}</div>`:`<div class="cl-draw-hbox bye">ISENTO</div>`}
  </div>`;
}
function scCupDraw(){
  const st=CL.cupDraw; if(!st) return deskWrap('');
  const def=COMP_DEFS[st.key]; const isGroup=st.stage==='group';
  // Times (restantes, alfabético) | Sorteados (bold navy + status mono verde: grupo OU confronto)
  const leftRows=st.remaining.map(id=>`<div class="cl-draw2-row">${escC(clubOf(id).name.toUpperCase())}</div>`).join('') || '<div class="cl-draw2-row" style="color:#999">— fim —</div>';
  const rightRows=st.drawn.slice().reverse().map(p=>{ const h=escC(clubOf(p.h).short.toUpperCase());
    const tag = p.group!=null ? ('— GRUPO '+escC(p.group)) : (p.bye?'— ISENTO':('× '+escC(clubOf(p.a).short.toUpperCase())));
    return `<div class="cl-draw2-row drawn">${h} <span class="cl-draw2-tag">${tag}</span></div>`; }).join('') || '<div class="cl-draw2-row" style="color:#999">—</div>';
  let highlight=''; // destaque "seu confronto" só faz sentido no mata-mata, não na fase de grupos
  if(!isGroup){
    if(!CL.online){
      const mine=st.drawn.find(p=>p.h===CL.clubId||p.a===CL.clubId);
      if(mine) highlight=cupDrawHighlightHTML(mine);
    } else if(CL.humans){
      highlight=st.drawn.filter(p=>CL.humans[p.h]||CL.humans[p.a]).map(cupDrawHighlightHTML).join('');
    }
  }
  const done=st.idx>=st.reveal.length;
  const rightHd=isGroup?'Grupos':'Sorteados';
  const body=`<div class="cl-draw2-cols">
      <div class="cl-draw2-box"><div class="cl-draw2-head">Times</div><div class="cl-draw2-body">${leftRows}</div></div>
      <div class="cl-draw2-box"><div class="cl-draw2-head">${rightHd}</div><div class="cl-draw2-body">${rightRows}</div></div>
    </div>
    ${highlight?`<div class="cl-draw2-highlight">${highlight}</div>`:''}`;
  const action = done
    ? `<i class="cl-wiz-hint">Sorteio encerrado…</i>`
    : btn('Acelerar sorteio','clCupDrawSkip()',{icon:'⏩',cls:'cl-btn',dis:st.fast});
  const title = isGroup ? `Sorteio da fase de grupos da ${def.short}` : `Sorteio dos jogos da ${def.short}`;
  return wizShell({
    rootCls:'cl-wiz-fixedh',
    headLeft:`<span class="cl-wiz-steptitle cl-wiz-seal">${trophyImg(st.key,20)||'🏆'} ${escC(def.short)}</span>`,
    title,
    contentCls:'cl-draw2-content', body,
    actionCls:'cl-wiz-action-c', action
  });
}

/* ---- Seleccionar (tática/formação) ---- */
function clSelFormation(f){ CL.menu=null; let adjustedFrom=null;
  if(f==='auto'){ S.xi=autoXI(CL.clubId); CL.formation='Automático'; S.tactic='equilibrado'; }
  else if(f==='best'){ S.xi=squad(CL.clubId).slice().sort((a,b)=>b.f-a.f).slice(0,11).map(p=>p.n); CL.formation='Melhores'; S.tactic='equilibrado'; }
  else { const real=coherentFormation(CL.clubId,f); if(real!==f) adjustedFrom=f;
    S.xi=pickXIByFormation(CL.clubId,real); CL.formation=real; S.tactic=tacticPosture(real); }
  CL.tacticChosen=true; CL.tab='seleccao'; CL.preSubOut=null; CL.preSubIn=null; CL.escalacaoMode=false; saveV3(); cdraw();
  toastC(adjustedFrom ? `Sem jogadores pro ${adjustedFrom} — ajustado pra ${CL.formation}.` : 'Tática '+CL.formation+' seleccionada.'); }

/* ---- Estádio (Equipa > Estádio...) ---- */
function clStadium(){ CL.menu=null; renderStadium(false); }
function standSVG(cap){ const tiers=Math.min(6,Math.max(1,Math.round((cap-STAND_START)/STAND_SEATS)+1)); const arcs=[];
  for(let i=0;i<tiers;i++){ const ry=40+i*9; arcs.push(`<path d="M ${100-ry*1.55} 128 A ${ry*1.55} ${ry} 0 0 1 ${100+ry*1.55} 128" fill="none" stroke="#9a9a9a" stroke-width="7"/>`); }
  return `<svg viewBox="0 0 200 165" class="cl-est-svg">${arcs.join('')}
    <ellipse cx="100" cy="118" rx="64" ry="38" fill="#2f7d32" stroke="#e9e36a" stroke-width="3"/>
    <rect x="68" y="96" width="64" height="44" fill="none" stroke="#fff" stroke-width="1.4"/>
    <line x1="100" y1="96" x2="100" y2="140" stroke="#fff" stroke-width="1.4"/>
    <circle cx="100" cy="118" r="8" fill="none" stroke="#fff" stroke-width="1.4"/></svg>`; }
function renderStadium(built){ const cap=(S.stadium&&S.stadium.capacity)||STAND_START;
  const maxCap=stadiumMaxCapacity(); const atMax=cap>=maxCap;
  const builtSeason=(S.stadium&&S.stadium.builtThisSeason)||0; const seasonLeft=Math.max(0,SEASON_BUILD_LIMIT-builtSeason);
  const cost=standCost(); const seasonFull=seasonLeft<STAND_SEATS;
  const dis=atMax||seasonFull;
  overlayC(dlg('Estádio', `<div class="cl-est">
    ${standSVG(cap)}
    <div class="cl-est-cap">${grp(cap)} lugares</div>
    <div class="cl-est-price">Preço de uma bancada com<br>${grp(STAND_SEATS)} lugares: ${fmt(cost)}</div>
    <div class="cl-est-maxcap">Teto do estádio para o porte do clube: ${grp(maxCap)} lugares<br>Obras liberadas nesta temporada: ${grp(seasonLeft)} lugares</div>
    <div class="cl-est-btns">${btn('Construir','clBuildStand()',{icon:'🚜',cls:'cl-btn-ico',dis:dis})}${btn('Fechar','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok cl-btn-ico'})}</div>
    ${built?`<div class="cl-est-note">As novas bancadas só estarão disponíveis para o próximo jogo</div>`:''}
    ${atMax?`<div class="cl-est-note">⚠ Estádio no teto para o porte atual do clube. Cresça o clube pra ampliar mais.</div>`:seasonFull?`<div class="cl-est-note">⚠ Limite de obras da temporada atingido — o resto só na próxima temporada (obra é lenta).</div>`:''}
  </div>`,{w:660,bodyClass:'cl-body-estadio',min:true})); }
function clBuildStand(){
  if(!S.stadium)S.stadium={capacity:STAND_START,builtThisSeason:0};
  const cap=S.stadium.capacity||STAND_START; const cost=standCost();
  if(cap+STAND_SEATS>stadiumMaxCapacity()){ toastC('⚠ Estádio no teto para o porte do clube — cresça o clube (título/elenco) pra poder ampliar mais.'); renderStadium(false); return; }
  if(((S.stadium.builtThisSeason||0)+STAND_SEATS)>SEASON_BUILD_LIMIT){ toastC('⚠ Obra é lenta: só '+grp(SEASON_BUILD_LIMIT)+' lugares por temporada. Continue na próxima.'); renderStadium(false); return; }
  if((S.budget||0)<cost){ toastC('Caixa insuficiente para construir ('+fmt(cost)+').'); return; }
  S.budget-=cost; S.stadium.capacity+=STAND_SEATS; S.stadium.builtThisSeason=(S.stadium.builtThisSeason||0)+STAND_SEATS;
  pushFinanceEntry({stadium:cost, log:[`🏟️ Bancada construída: +${grp(STAND_SEATS)} lugares (${fmt(cost)})`]});
  saveV3(); renderStadium(true); }

/* ---- Jogador > Vender (painel na aba + leilão) ---- */
function windowClosedMsg(){ const st=transferWindowStatus();
  if(st.pre) return `🟡 Pré-janela: dá pra pré-acordar transferências agora — o jogador só troca de clube quando a janela abrir (em ${st.opensIn} rodada${st.opensIn===1?'':'s'}).`;
  return st.opensIn!=null ? `⛔ Janela de transferências fechada. Abre em ${st.opensIn} rodada${st.opensIn===1?'':'s'}.` : '⛔ Janela de transferências fechada — não há mais janelas nesta temporada.'; }
function windowBadge(){ const st=transferWindowStatus();
  if(st.open) return `<span class="cl-winbadge open">🟢 Janela aberta (fecha em ${st.closesIn})</span>`;
  if(st.pre) return `<span class="cl-winbadge closed" style="background:#b8860b">🟡 Pré-janela (abre em ${st.opensIn}) — pré-acordos liberados</span>`;
  return `<span class="cl-winbadge closed">🔒 Janela fechada${st.opensIn!=null?' (abre em '+st.opensIn+')':''}</span>`; }
/* atualiza o preço de venda pedido SEM re-renderizar a tela inteira (cdraw() recriava o
   <input>, derrubando o foco a cada tecla — tinha que clicar de novo pra continuar digitando).
   Só mexe no texto/valor dos elementos afetados, mantendo o cursor no lugar. */
function clSellPriceInput(input){
  const typed=parseInt(input.value.replace(/[^0-9]/g,''))||0;   // valor na moeda exibida
  CL.sellPrice=String(curParse(typed));                          // guarda sempre em R$ interno
  input.value=typed?grp(typed):'';                               // mantém o que ele digitou (moeda)
  const p=squad(CL.clubId).find(x=>x.n===CL.selPlayer); if(!p) return;
  const askingPrice=CL.sellPrice?parseInt(CL.sellPrice):0;       // R$
  const mv=p.mv||0;
  const diff=askingPrice-mv;
  const diffPct=mv>0?Math.round((diff/mv)*100):0;
  const diffLabel=diff>0?`+${moneyDisp(diff)} (+${diffPct}%)`:diff<0?`${moneyDisp(diff)} (${diffPct}%)`:'Preço igual';
  const askedEl=$c('#cl-sellprice-asked'); if(askedEl) askedEl.textContent=askingPrice>0?moneyDisp(askingPrice):'-';
  const diffEl=$c('#cl-sellprice-diff'); if(diffEl) diffEl.textContent=diffLabel;
  const warnEl=$c('#cl-sellprice-warn'); if(warnEl) warnEl.style.display=(askingPrice>0 && askingPrice<sellMinPrice(mv))?'block':'none';
}
function clSell(){ CL.menu=null;
  if(!canNegotiate()){ toastC(windowClosedMsg()); return; }
  const p=squad(CL.clubId).find(x=>x.n===CL.selPlayer);
  if(!p){ toastC('Selecciona um jogador na lista primeiro.'); cdraw(); return; }
  CL.tab='jogador'; CL.rightMode='vender'; CL.sellPrice=''; cdraw(); }
function clSellConfirm(){
  if(!canNegotiate()){ toastC(windowClosedMsg()); CL.rightMode=null; cdraw(); return; }
  const p=squad(CL.clubId).find(x=>x.n===CL.selPlayer); if(!p){ CL.rightMode=null; cdraw(); return; }
  const seed=(hashC(p.n)+ (S.round||0)*7)>>>0; const rnd=rngFrom(seed);
  const buyers=DATA.clubs.filter(c=>c.id!==CL.clubId); const buyer=buyers[Math.floor(rnd()*buyers.length)];
  const base=Math.round(p.mv/1000); const ask=Math.round((parseInt(CL.sellPrice,10)||0)/1000); // sellPrice em reais -> milhares
  let feeK=Math.max(1,Math.round(base*(0.7+rnd()*0.7)));           // proposta do mercado em milhares
  if(ask>0 && ask<=feeK*1.2) feeK=Math.max(ask,Math.round(feeK*0.9)); else if(ask>feeK*1.2) feeK=Math.round(feeK*0.85);
  const fee=feeK*1000;
  const preOpen=inPreWindow();
  if(!inTransferWindow() && preOpen){
    // PRÉ-ACORDO: fecha o negócio, mas o jogador só sai na abertura da janela (segue jogando até lá)
    p._pendingSale=true;
    S.pendingTransfers=S.pendingTransfers||[];
    S.pendingTransfers.push({ kind:'sell', playerName:p.n, buyerId:buyer.id, buyerName:clubOf(buyer.id).short, buyerCountry:null, fee, executeRound:preOpen });
    S.roundNews=S.roundNews||[]; S.roundNews.push(`🤝 Acordo fechado: ${p.n} vai pro ${clubOf(buyer.id).short} na abertura da janela (rodada ${preOpen+1}) por ${fmt(fee)}.`);
    saveV3(); CL.rightMode=null;
    resultDialog('🤝 Acordo fechado', `${p.n} vai pro ${clubOf(buyer.id).short} por ${fmt(fee)}, com a mudança de clube na abertura da janela (rodada ${preOpen+1}). Ele segue jogando por você até lá.`);
    return;
  }
  S.budget=(S.budget||0)+fee; S.squads[CL.clubId]=S.squads[CL.clubId].filter(x=>x.n!==p.n);
  if(S.xi) S.xi=S.xi.filter(n=>n!==p.n);
  pushFinanceEntry({playerSales:fee, log:[`💰 ${p.n} vendido ao ${clubOf(buyer.id).short} por ${fmt(fee)}.`]});
  S.roundNews=S.roundNews||[]; S.roundNews.push(`💰 ${p.n} vendido ao ${clubOf(buyer.id).short} por ${fmt(fee)}.`);
  saveV3(); auctionDialog(p,buyer,feeK); }
function auctionDialog(p,buyer,feeK){
  const st=p.stats||{}; const beh=playerBehaviorLabel(p);
  overlayC(dlg('Venda de jogador por leilão', `<div class="cl-leilao">
    <div class="cl-lei-grid">
      <div class="cl-lei-l">
        <div class="cl-lei-row"><span>Equipa</span><b class="cl-lei-team" style="${clubStripe(clubOf(CL.clubId))}">${escC(clubOf(CL.clubId).short)}</b></div>
        <div class="cl-lei-row"><span>Jogador</span><b>${escC(p.n)}</b></div>
        <div class="cl-lei-row"><span>Posição</span><b>${({GK:'Goleiro',DEF:'Zagueiro',MID:'Meia',ATT:'Atacante'})[p.s]||'Meia'}</b></div>
        <div class="cl-lei-row"><span>Força</span><b class="cl-lei-big">${p.f}</b></div>
        <div class="cl-lei-row" style="margin-top:14px"><span>Salário pretendido</span><b>${curSym()} ${moneyDisp(Math.round(p.mv*0.0006))}</b></div>
        <div class="cl-lei-row"><span>Preço base</span><b>zero</b></div>
      </div>
      <div class="cl-lei-r">
        <div class="cl-lei-row"><span>Nacionalidade</span><b>${flagImg('Brasil')} Brasil</b></div>
        <div class="cl-lei-row"><span>Comportamento</span><b>${beh}</b></div>
        <div class="cl-lei-row"><span>Gols nesta temporada</span><b>${(S.scorers&&S.scorers[p.n])||0}</b></div>
        <fieldset class="cl-hist" style="max-width:300px;color:#000"><legend style="color:#000">Historial</legend>
          <div class="cl-hist-row"><span>Jogos</span><b>${st.apps||0}</b></div>
          <div class="cl-hist-row"><span>Gols</span><b>${st.goals||0}</b></div>
          <div class="cl-hist-row"><span>Cartões amarelos</span><b>${st.yellows||0}</b></div>
          <div class="cl-hist-row"><span>Cartões vermelhos</span><b>${st.reds||0}</b></div>
          <div class="cl-hist-row"><span>Lesões</span><b>${st.injuries||0}</b></div>
        </fieldset>
      </div>
    </div>
    <div class="cl-lei-sold">Vendido ao ${escC(buyer.short.toUpperCase())} por ${spellMoney(feeK*1000)}</div>
    <div class="cl-lei-ok">${btn('OK','clCloseAuction()',{icon:'✔',cls:'cl-btn-ok'})}</div>
  </div>`,{w:760,bodyClass:'cl-body-yellow',min:true})); }
function clCloseAuction(){ clCloseOverlay(); CL.rightMode=null; CL.selPlayer=squad(CL.clubId)[0]?.n||null; cdraw(); toastC('Jogador vendido.'); }

/* ---- Jogador (aba) > Renovar contrato (painel) ---- */
function clRenew(){ const p=squad(CL.clubId).find(x=>x.n===CL.selPlayer); if(!p){ toastC('Selecciona um jogador.'); return; }
  CL.tab='jogador'; CL.rightMode='renovar'; CL.newSalary=Math.round(p.mv*0.0006); cdraw(); }
function clSalaryStep(d){ const p=squad(CL.clubId).find(x=>x.n===CL.selPlayer); const base=Math.round((p?p.mv:1e6)*0.0006);
  CL.newSalary=Math.max(Math.round(base*0.4), (CL.newSalary||base)+d*Math.max(100,Math.round(base*0.1))); const n=document.querySelector('#cl-sal'); if(n)n.textContent=grp(CL.newSalary); }
function clRenewPropose(){
  const p=squad(CL.clubId).find(x=>x.n===CL.selPlayer);
  if(!p) return;

  const oldSalary = (p.contract && p.contract.salary) || 0;
  const newYears = 3;
  const weeksPerYear = 52;
  const totalCost = CL.newSalary * newYears * weeksPerYear;
  const oldAnnualCost = oldSalary * weeksPerYear;
  const extraCost = totalCost - (oldAnnualCost * newYears);

  // validar se há orçamento suficiente para a renovação
  if(S.budget < 0 && extraCost > 0){
    toastC('⚠️ Caixa insuficiente para renovar este contrato.');
    return;
  }

  // atualizar contrato
  p.contract = Object.assign({}, p.contract, {salary: CL.newSalary, years: newYears});
  p.moral = Math.min(100, (p.moral||70) + 6);

  // registrar na notícia de rodada
  S.roundNews = S.roundNews || [];
  S.roundNews.push(`✍️ ${p.n} renovou contrato: ${fmt(CL.newSalary)}/sem por ${newYears} ano(s).`);

  saveV3();
  CL.rightMode = null;
  cdraw();
  toastC('✓ Contrato renovado com sucesso.');
}
function clCancelRight(){ CL.rightMode=null; cdraw(); }

/* ---- Campeonato > Melhores marcadores ---- */
/* acha o clube de um jogador só pelo nome — útil em telas que só guardam o nome (artilheiros, notícias) */
function findPlayerClub(name){
  for(const cid of Object.keys(S.squads||{})){ if(S.squads[cid].some(p=>p.n===name)) return cid; }
  return null;
}
function clScorers(){ CL.menu=null;
  const arr=Object.entries(S.scorers||{}).map(([n,g])=>({n,g})).sort((a,b)=>b.g-a.g).slice(0,20);
  const rows=arr.length?arr.map((s,i)=>{ const cid=findPlayerClub(s.n);
    return `<div class="cl-cal-row"><span class="cl-cal-n">${i+1}</span><span class="cl-cal-t">${playerLink(s.n,cid)}${cid?' <small style="color:#666">('+escC(clubOf(cid).short)+')</small>':''}</span><span class="cl-cal-cf">${s.g}</span></div>`;
  }).join(''):'<div style="padding:14px">Sem gols marcados ainda.</div>';
  overlayC(dlg('Melhores marcadores', `<div class="cl-cal">${rows}</div><div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:520,bodyClass:'cl-body-gray',min:true})); }

/* ---- Campeonato > Últimos vencedores: histórico persistido por save (S.history), com o
   campeão da liga (por divisão) e das copas (Copa do Brasil/Libertadores/Sul-Americana).
   Um bloco por temporada (fieldset/legend, mesmo estilo de cupGroupHTML) — cada competição
   numa linha própria com nome à esquerda e campeão à direita, em vez do texto corrido de
   antes, pra ficar fácil de escanear com muitas temporadas acumuladas. ---- */
function clUltimosVencedores(){ CL.menu=null;
  const hist=(S.history||[]).slice().reverse().slice(0,15);
  const winnerRow=(label,trophy,winner)=> winner ? `<div class="cl-winrow">
      <span class="cl-winrow-lbl">${trophy?trophyImg(trophy,16)+' ':''}${escC(label)}</span>
      <span class="cl-winrow-val">${escC(winner)}</span>
    </div>` : '';
  const blocks=hist.length?hist.map(h=>{
    const rows=[winnerRow(classifDivName(h.division||'A', h.country), 'serie'+(h.division||'A'), h.champ)]
      .concat(allCupKeys().map(k=>winnerRow(COMP_DEFS[k].short, k, h.cups&&h.cups[k])))
      .filter(Boolean).join('');
    return `<fieldset class="cl-cup-round"><legend>${h.season}</legend>${rows}</fieldset>`;
  }).join(''):'<div class="cl-cup-hint">Ainda não há temporadas concluídas neste save.</div>';
  overlayC(dlg('Últimos vencedores', `<div class="cl-cup-groups-wrap">${blocks}</div><div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:560,bodyClass:'cl-body-gray',min:true})); }

/* ---- Campeonato > Melhores marcadores de sempre: acumulado histórico (S.allTimeScorers,
   gravado a cada fim de temporada) + gols da temporada em andamento, persistido no save. ---- */
function clScorersAllTime(){ CL.menu=null;
  const acc={...(S.allTimeScorers||{})};
  Object.entries(S.scorers||{}).forEach(([n,g])=>{ acc[n]=(acc[n]||0)+g; });
  const arr=Object.entries(acc).map(([n,g])=>({n,g})).sort((a,b)=>b.g-a.g).slice(0,20);
  const rows=arr.length?arr.map((s,i)=>{ const cid=findPlayerClub(s.n);
    return `<div class="cl-cal-row"><span class="cl-cal-n">${i+1}</span><span class="cl-cal-t">${playerLink(s.n,cid)}${cid?' <small style="color:#666">('+escC(clubOf(cid).short)+')</small>':''}</span><span class="cl-cal-cf">${s.g}</span></div>`;
  }).join(''):'<div style="padding:14px">Sem gols marcados ainda.</div>';
  overlayC(dlg('Melhores marcadores de sempre', `<div class="cl-cal">${rows}</div><div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:520,bodyClass:'cl-body-gray',min:true})); }

/* ---- Campeonatos > Ligas internacionais: visualizador das ligas de background por país
   (tabela, artilheiros, artilheiros de sempre, campeões). Só leitura — cada liga roda sozinha. */
function bgDivLabel(country,divKey){ const cfg=(typeof UNI_CONFIGS!=='undefined')&&UNI_CONFIGS[country]; return (cfg&&cfg.label&&cfg.label[divKey])||divKey; }
function clBgLeaguesMenu(){ CL.menu=null;
  if(!S.bgLeagues || !Object.keys(S.bgLeagues).length){ toastC('Nenhuma liga internacional neste save.'); return; }
  const countries=Object.keys(S.bgLeagues);
  CL.bgView=CL.bgView||{};
  if(!CL.bgView.country || countries.indexOf(CL.bgView.country)<0) CL.bgView.country=countries[0];
  CL.bgView.tab=CL.bgView.tab||'tabela';
  renderBgLeagues();
}
function renderBgLeagues(){
  const V=CL.bgView; const L=S.bgLeagues[V.country]; if(!L){ clCloseOverlay(); return; }
  const countries=Object.keys(S.bgLeagues);
  const divKeys=Object.keys(L.divs);
  if(!V.div || divKeys.indexOf(V.div)<0) V.div=divKeys[0];
  const ctryTabs=countries.map(c=>`<span class="cl-otab ${c===V.country?'on':''}" onclick="CL.bgView.country='${c}';CL.bgView.div=null;renderBgLeagues()">${flagImg(c)} ${escC(c)}</span>`).join('');
  const divTabs=divKeys.length>1?('<div class="cl-otabs">'+divKeys.map(d=>`<span class="cl-otab ${d===V.div?'on':''}" onclick="CL.bgView.div='${d}';renderBgLeagues()">${escC(bgDivLabel(V.country,d))}</span>`).join('')+'</div>'):'';
  const contentTabs=[['tabela','Tabela'],['artilheiros','Artilheiros'],['sempre','De sempre'],['transferencias','Transferências'],['historico','Campeões']].map(a=>`<span class="cl-otab ${V.tab===a[0]?'on':''}" onclick="CL.bgView.tab='${a[0]}';renderBgLeagues()">${a[1]}</span>`).join('');
  let body='';
  if(V.tab==='tabela'){
    body=bgStandings(V.country,V.div).map((t,i)=>{const c=bgClubById(t.id);return `<div class="cl-cal-row"><span class="cl-cal-n">${i+1}</span><span class="cl-cal-t">${escC(c?c.short:t.id)} <small style="color:#888">${t.P}j ${t.W}-${t.D}-${t.L}</small></span><span class="cl-cal-cf">${t.Pts}</span></div>`;}).join('');
  } else if(V.tab==='artilheiros'||V.tab==='sempre'){
    const src=V.tab==='sempre'?L.allTimeScorers:L.scorers;
    const list=Object.entries(src).sort((a,b)=>b[1]-a[1]).slice(0,25);
    body=list.length?list.map((x,i)=>`<div class="cl-cal-row"><span class="cl-cal-n">${i+1}</span><span class="cl-cal-t">${escC(x[0])}</span><span class="cl-cal-cf">${x[1]}</span></div>`).join(''):'<div style="padding:14px">Ainda sem gols nesta temporada.</div>';
  } else if(V.tab==='transferencias'){
    const log=L.transferLog||[];
    body=log.length?log.slice(0,30).map(t=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 12px;border-bottom:1px solid rgba(0,0,0,.12)">
      <span style="flex:1;min-width:0"><b>${escC(t.player)}</b><br><small style="color:#888">${escC(t.from)} → ${escC(t.to)}</small></span>
      <span style="white-space:nowrap;font-weight:700;font-size:12px">${fmt(t.fee)}</span></div>`).join(''):'<div style="padding:14px">Nenhuma transferência ainda (acontecem nas janelas de transferência).</div>';
  } else {
    body=(L.history||[]).length?L.history.slice().reverse().map(h=>`<div class="cl-cal-row"><span class="cl-cal-n">${h.season}</span><span class="cl-cal-t">🏆 ${escC(h.champ)}</span><span class="cl-cal-cf" style="font-size:11px">${escC(h.artilheiro)}</span></div>`).join(''):'<div style="padding:14px">Nenhuma temporada concluída ainda.</div>';
  }
  overlayC(dlg('Ligas internacionais', `
    <div class="cl-otabs" style="flex-wrap:wrap">${ctryTabs}</div>
    ${divTabs}
    <div class="cl-otabs">${contentTabs}</div>
    <div class="cl-cal">${body}</div>
    <div class="cl-cal-ok">${btn('Fechar','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,
    {w:560,bodyClass:'cl-body-gray',min:true}));
}

/* ---- Jogador > Propostas recebidas: ofertas de compra pelos jogadores do usuário ---- */
function clIncomingOffers(){ CL.menu=null;
  const offers=(S.incomingOffers||[]).filter(o=>o.expiresRound>S.round);
  const rows=offers.length?offers.map(o=>{
    const roundsLeft=Math.max(0,o.expiresRound-S.round);
    const counterUI = o.state!=='final' ? `<span class="cl-money-field" style="margin:0"><span class="cl-money-cur">${curSym()}</span><input class="cl-money-in" style="width:96px" id="cl-ask-${o.id}" inputmode="numeric" placeholder="pedir mais" oninput="this.value=this.value.replace(/\\D/g,'')?grp(this.value.replace(/\\D/g,'')):''"></span>${btn('Contrapropor','clCounterOffer('+o.id+')',{cls:'cl-btn-mini'})}` : '';
    return `<div style="padding:10px 12px;border-bottom:1px solid rgba(0,0,0,.12)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div style="flex:1;min-width:0"><b>${escC(o.playerName)}</b> <small style="color:#888">(força ${o.playerForce})</small><br>
          <small style="color:#888">${escC(o.buyerName)}${o.buyerCountry?' · '+escC(o.buyerCountry):''} · expira em ${roundsLeft} rodada(s)</small></div>
        <div style="text-align:right;white-space:nowrap;font-weight:700">${fmt(o.fee)}</div>
      </div>
      ${o.lastMsg?`<div style="margin-top:6px;font-size:12px;color:#555;background:#f3efe0;padding:5px 8px;border-radius:4px">💬 ${escC(o.lastMsg)}</div>`:''}
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;align-items:center">
        ${btn('Aceitar','clAcceptOffer('+o.id+')',{cls:'cl-btn-mini'})}${counterUI}${btn('Recusar','clRejectOffer('+o.id+')',{cls:'cl-btn-cancel'})}
      </div></div>`;
  }).join(''):'<div style="padding:16px;text-align:center;color:#888">Nenhuma proposta no momento.<br><small>Clubes fazem propostas pelos seus destaques durante as janelas (e na pré-janela).</small></div>';
  // pré-acordos pendentes (entram em vigor na abertura da janela)
  const pend=(S.pendingTransfers||[]);
  const pendHtml=pend.length?`<div style="padding:8px 12px;background:#eee7cf;font-weight:700;font-size:13px">🤝 Pré-acordos (entram em vigor na abertura da janela)</div>`+
    pend.map(t=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid rgba(0,0,0,.1)">
      <span style="flex:1;min-width:0"><b>${escC(t.playerName)}</b><br><small style="color:#888">${t.kind==='buy'?'chega de '+escC(clubOf(t.sellerId)?clubOf(t.sellerId).short:'?'):'sai pro '+escC(t.buyerName)} · rodada ${t.executeRound+1}</small></span>
      <span style="white-space:nowrap;font-weight:700;font-size:12px">${t.kind==='buy'?'−':'+'}${fmt(t.fee)}</span></div>`).join(''):'';
  overlayC(dlg('Propostas recebidas', `${pendHtml}<div class="cl-cal">${rows}</div><div class="cl-cal-ok">${btn('Fechar','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:560,bodyClass:'cl-body-gray',min:true}));
}
function clAcceptOffer(id){ const r=acceptIncomingOffer(id); toastC(r&&r.msg||''); if(r&&r.ok){ clCloseOverlay(); cdraw(); } else { clIncomingOffers(); } }
function clRejectOffer(id){ rejectIncomingOffer(id); clIncomingOffers(); }
function clCounterOffer(id){
  const el=$c('#cl-ask-'+id); const typed=el?(parseInt((el.value||'').replace(/\D/g,''))||0):0;
  if(typed<=0){ toastC('Digite quanto você quer pedir.'); return; }
  counterIncomingOffer(id, curParse(typed)); // valor digitado (moeda exibida) -> R$
  clIncomingOffers(); // re-renderiza já com a resposta do clube
}

/* ---- overlays / toasts ---- */
function overlayC(html){ let o=$c('#c-overlay'); if(!o){ o=document.createElement('div'); o.id='c-overlay'; o.className='cl-overlay'; o.onclick=clCloseOverlay; document.body.appendChild(o); }
  o.innerHTML=`<div class="cl-overlay-in" onclick="event.stopPropagation()">${html}</div>`; o.style.display='flex'; }
function clCloseOverlay(){ const o=$c('#c-overlay'); if(o){ o.style.display='none'; o.innerHTML=''; } }
function resultDialog(score,verd){ overlayC(dlg('RetroFoot98', `<div class="cl-res"><div class="cl-res-score">${escC(score)}</div>
  <div class="cl-res-verd">${escC(verd)}</div><div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div></div>`,{w:520,bodyClass:'cl-body-green'})); }
function toastC(msg){ let t=$c('#c-toast'); if(!t){ t=document.createElement('div'); t.id='c-toast'; document.body.appendChild(t); }
  const d=document.createElement('div'); d.className='cl-toast'; d.textContent=msg; t.appendChild(d); setTimeout(()=>d.remove(),2600); }

/* fechar dropdown ao clicar fora */
document.addEventListener('click',()=>{ if(CL.menu||CL.mobMenuOpen){ CL.menu=null; CL.mobMenuOpen=false; cdraw(); } });
/* ---- atalhos de teclado pra tática rápida (formação), sem precisar abrir o menu
   Seleccionar. F1-F6 igual ao clássico — mas o navegador intercepta F1 (Ajuda) e
   às vezes F5 (recarregar) ANTES do JavaScript da página receber o evento, então
   nenhum preventDefault resolve isso. Por isso as teclas 1-6 funcionam igual, sem
   esse problema — é o atalho confiável de verdade; F1-F6 continua valendo de bônus
   nos navegadores onde não é bloqueado. ---- */
const FKEY_INV = Object.fromEntries(Object.entries(FKEY).map(([f,k])=>[k,f]));
/* atalho SÓ com F1-F6 (nunca dígito puro 1-6) — dígito puro conflitava com o
   preenchimento do valor de venda do jogador (campo "Vender" na tela do time),
   onde digitar 1-6 pra compor o preço trocava a tática sem querer. */
function tacticShortcutsActive(){
  // só faz sentido trocar tática na tela principal, fora de partida ao vivo e sem menu aberto
  return CL.screen==='main' && !CL.live && !CL.menu;
}
function handleTacticShortcut(key){
  const f=FKEY_INV[key];
  if(!f || !tacticShortcutsActive()) return false;
  clSelFormation(f);
  return true;
}
document.addEventListener('keydown', (e)=>{
  const tag=(e.target&&e.target.tagName)||'';
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return; // não atrapalha quem tá digitando
  if(FKEY_INV[e.key] && handleTacticShortcut(e.key)) e.preventDefault(); // evita F1=ajuda do navegador, F5=recarregar, etc.
});

