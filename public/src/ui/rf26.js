/* =====================================================================
   RetroFoot98 — REBRANDING 2026 · ENVELOPE, SIDEBAR E ROTEADOR DE PÁGINAS
   Carrega DEPOIS de main.js e assume o desenho das telas de dentro do jogo.

   O QUE MUDA DE VERDADE (não é só pele):
   a barra de menu horizontal com sete menus suspensos virou uma SIDEBAR de
   sete destinos, e cada item que antes abria um modal virou ABA dentro da
   página do destino. A regra que decide isso está no design system e é
   curta: se está no menu, é página; se apareceu sozinho, é popup.

   POR QUE AS PÁGINAS REAPROVEITAM AS FUNÇÕES DE MENU (ver rfCaptura):
   as ~25 funções de menu (clSell, clCalendar, clTrophyRoom...) já montam o
   HTML certo de cada assunto; o que elas fazem de errado, no desenho novo,
   é só o último passo — chamar overlayC() e virar modal. Em vez de duplicar
   esse HTML dentro de cada página (dois lugares pra corrigir cada bug de
   conteúdo pelo resto da vida do jogo), a página CAPTURA a chamada de
   overlayC e usa o corpo do diálogo como conteúdo da aba. Uma fonte da
   verdade por assunto, e o dia em que uma dessas funções for reescrita de
   verdade a captura simplesmente deixa de ser usada pra ela.
   ===================================================================== */

/* ---- estado de navegação novo. Mora em CL (mesmo objeto do resto da UI) ---- */
function rfState(){
  // _ultimaTab nasce com o CL.tab ATUAL, não indefinido: senão a ponte das abas
  // antigas (rfSyncFromLegacyTab) enxerga "mudou" no primeiro desenho e joga o
  // usuário de volta pro Hub, atropelando a página que ele pediu.
  if(!CL.rf) CL.rf={ page:'hub', tab:{}, sbCollapsed:false, _ultimaTab:CL.tab };
  return CL.rf;
}
/* a sidebar recolhida é preferência do usuário, não estado de save: persiste
   no aparelho e vale pra qualquer save que ele abrir. */
const RF_SB_KEY='rf98.sidebar.collapsed';
function rfSidebarCollapsed(){
  const st=rfState();
  if(st._sbLoaded) return st.sbCollapsed;
  try{ st.sbCollapsed = localStorage.getItem(RF_SB_KEY)==='1'; }catch(e){ st.sbCollapsed=false; }
  st._sbLoaded=true; return st.sbCollapsed;
}
function rfToggleSidebar(){
  const st=rfState(); st.sbCollapsed=!rfSidebarCollapsed(); st._sbLoaded=true;
  try{ localStorage.setItem(RF_SB_KEY, st.sbCollapsed?'1':'0'); }catch(e){}
  cdraw();
}

/* =====================================================================
   AS SETE PÁGINAS
   `tabs` são os sub-itens que ANTES eram itens de menu abrindo modal.
   `run` é a função de menu correspondente — a página a executa capturada.
   `build` (quando existe) tem precedência: é conteúdo escrito pro layout
   novo, sem passar pela captura.
   ===================================================================== */
/* =====================================================================
   OS NOVE DESTINOS DA SIDEBAR
   A lista sai da TELA de referência (Hub do Time - Sidebar), não da tabela
   de consolidação do PROMPT-IMPLEMENTACAO.md: a tabela lista sete páginas,
   a tela mostra nove itens — com "RetroFoot98" no topo e "E-mail" como
   destino próprio. Quando os dois discordam, manda a tela.

   `titulo`/`sub`/`pill` são o cabeçalho da página, copiados da referência.
   A faixa do clube (gradiente) existe SÓ no Hub; as demais páginas abrem
   com título de 26px + subtítulo + pílula de status à direita.

   `grid` é a grade de duas colunas daquela página, também da referência —
   elas não são todas iguais: Elenco & Base usa 360px na coluna lateral e
   Clube & Sistema inverte a ordem.
   ===================================================================== */
const RF_PAGES=[
  { key:'inicio', ico:'🏠', label:'RetroFoot98', curto:'Início',
    titulo:'Clube & Sistema', sub:'E-mail, opções do jogo, save e Modo Resenha',
    pill:()=>rfPillGravado(), grid:'340px minmax(0,1fr)',
    tabs:[ {k:'email',   l:()=>'E-mail'+rfSufixo(rfNaoLidas()), build:()=>rfEmailHTML()},
           {k:'opcoes',  l:()=>'Opções',      run:()=>clOptions()},
           {k:'jogo',    l:()=>'Jogo',        run:()=>clSaveMenu()},
           {k:'resenha', l:()=>'Modo Resenha',build:()=>rfResenhaHTML()} ] },

  { key:'hub', ico:'🥅', label:'Formação', curto:'Formação', banda:true },

  { key:'equipa', ico:'👥', label:'Equipa', curto:'Equipa',
    titulo:'Equipa', sub:'Estádio, historial e identidade do clube',
    pill:()=>rfPillDivisao(), grid:'minmax(0,1fr) 340px',
    tabs:[ {k:'estadio',  l:()=>'Estádio',  run:()=>clStadium()},
           {k:'historial',l:()=>'Historial',run:()=>clClubHistory()} ] },

  { key:'mercado', ico:'🛒', label:'Mercado', curto:'Mercado',
    titulo:'Mercado', sub:()=>rfSubMercado(),
    pill:()=>rfPillCaixa(), grid:'minmax(0,1fr) 340px',
    tabs:[ {k:'comprar',l:()=>'Comprar',                      build:()=>rfMercadoComprarHTML()},
           {k:'leilao', l:()=>'Leilão',                       build:()=>rfMercadoLeilaoHTML()},
           {k:'propostas',l:()=>'Propostas'+rfSufixo(rfLen(rfPropostas())), build:()=>rfMercadoPropostasHTML()},
           {k:'contra', l:()=>'Contrapropostas',              run:()=>clCounterOffers()},
           {k:'vender', l:()=>'Vender',                       build:()=>rfVenderHTML()},
           {k:'transf', l:()=>'Transferências',               run:()=>clTransferHistory()} ] },

  { key:'elenco', ico:'👤', label:'Elenco & Base', curto:'Elenco',
    titulo:'Elenco & Base', sub:'Ficha do jogador, promoções da base e treino especial',
    pill:()=>rfPillFolha(), grid:'minmax(0,1fr) 360px',
    tabs:[ {k:'elenco', l:()=>'Elenco',           build:()=>rfElencoHTML()},
           {k:'ficha',  l:()=>'Ficha do jogador', build:()=>rfElencoHTML('ficha')},
           {k:'base',   l:()=>'Base',             build:()=>rfElencoHTML('base')},
           {k:'treino', l:()=>'Treino especial',  build:()=>rfElencoHTML('treino')} ] },

  { key:'campeonatos', ico:'🏆', label:'Campeonatos', curto:'Copas',
    titulo:'Campeonatos', sub:'Tabela, calendário, artilharia e história das competições',
    pill:()=>rfPillPosicao(), grid:'minmax(0,1fr) 340px',
    tabs:[ {k:'minhas',    l:()=>'Minhas competições', run:()=>clCompList()},
           {k:'calendario',l:()=>'Calendário',         run:()=>clCalendar()},
           {k:'artilharia',l:()=>'Artilharia',         run:()=>clScorers()},
           {k:'historia',  l:()=>'História',           run:()=>clUltimosVencedores()},
           {k:'intl',      l:()=>'Ligas internacionais', run:()=>clBgLeaguesMenu(),
            show:()=>!!(S&&S.bgLeagues&&Object.keys(S.bgLeagues).length)} ] },

  { key:'treinador', ico:'🎓', label:'Treinador', curto:'Treinador',
    titulo:'Treinador', sub:'Carreira, troféus, ranking, ofertas e preferências',
    pill:()=>rfPillReputacao(), grid:'minmax(0,1fr) 340px',
    tabs:[ {k:'carreira',l:()=>'Carreira',        run:()=>clPerfilTreinador()},
           {k:'historia',l:()=>'História',        run:()=>clCoachHistory()},
           {k:'trofeus', l:()=>'Sala de Troféus', run:()=>clTrophyRoom()},
           {k:'ranking', l:()=>'Ranking',         run:()=>clCoachRanking()},
           {k:'ofertas', l:()=>'Ofertas'+rfSufixo(rfLen(S&&S.jobOffers)), run:()=>clJobOffers()},
           {k:'perfil',  l:()=>'Perfil',          run:()=>clPerfilTreinador()} ] },

  { key:'financas', ico:'💰', label:'Finanças', curto:'Finanças',
    titulo:'Finanças', sub:'Caixa, folha, bilheteria, estádio e histórico por temporada',
    pill:()=>rfPillSaldo(), grid:'minmax(0,1fr) 340px',
    tabs:[ {k:'resumo',   l:()=>'Resumo',    build:()=>panFinancas()},
           {k:'extrato',  l:()=>'Extrato',   build:()=>panFinancas()},
           {k:'historico',l:()=>'Histórico', build:()=>panFinancas()},
           {k:'estadio',  l:()=>'Estádio',   run:()=>clStadium()},
           {k:'patrocinio',l:()=>'Patrocínio', build:()=>rfPatrocinioHTML()} ] },

  { key:'email', ico:'✉️', label:'E-mail', curto:'E-mail',
    titulo:'E-mail', sub:'Comunicados da diretoria, propostas e avisos',
    pill:()=>rfPillNaoLidas(), grid:'340px minmax(0,1fr)',
    tabs:[ {k:'caixa', l:()=>'Caixa de entrada', build:()=>rfEmailHTML()} ] },
];

/* ---- as pílulas de status do cabeçalho, cada uma com o dado real do save ---- */
function rfSufixo(n){ return n>0? ' ('+n+')' : ''; }
function rfNaoLidas(){ return (typeof inboxUnread==='function')?inboxUnread():0; }
function rfPropostas(){ return (typeof myIncomingOffers==='function')?myIncomingOffers():[]; }
function rfPill(txt,tom){ return {txt,tom:tom||'info'}; }
function rfPillCaixa(){ return rfPill('🟢 Caixa '+fmt(S.budget||0)); }
function rfPillGravado(){
  const t=CL._lastSaveAt?new Date(CL._lastSaveAt):null;
  return rfPill('💾 '+(t?('Gravado '+String(t.getHours()).padStart(2,'0')+'h'+String(t.getMinutes()).padStart(2,'0')):'Gravação automática'));
}
function rfPillDivisao(){ return rfPill('🛡️ '+divisionLabel()); }
function rfPillFolha(){
  const folha=squad(CL.clubId).reduce((s,p)=>s+(typeof playerSalary==='function'?playerSalary(p):0),0);
  return rfPill('Folha '+fmt(folha)+'/sem');
}
function rfPillPosicao(){
  const pos=rfMinhaPosicao();
  return rfPill('🏆 '+(pos?pos+'º na '+divisionLabel():divisionLabel()));
}
function rfPillReputacao(){ return rfPill('🎓 Reputação '+Math.round((S.coachRep!=null?S.coachRep:50))); }
function rfPillSaldo(){
  const b=S.budget||0;
  return rfPill((b>=0?'▲ Saldo positivo':'▼ Saldo negativo'), b>=0?'ok':'danger');
}
function rfPillNaoLidas(){ const n=rfNaoLidas(); return rfPill('✉️ '+(n?n+' por ler':'Tudo lido')); }
function rfSubMercado(){
  const dias=(typeof windowClosesIn==='function')?windowClosesIn():null;
  if(typeof canNegotiate==='function' && !canNegotiate()) return 'Comprar, vender, leilão e propostas — janela fechada';
  return 'Comprar, vender, leilão e propostas'+(dias?' — janela fecha em '+dias:'');
}
/* posição do meu clube na tabela da divisão */
function rfMinhaPosicao(){
  const t=S.table||{}; const ids=Object.keys(t); if(!ids.length) return null;
  const ord=ids.map(id=>({id,r:t[id]})).sort((a,b)=>(b.r.Pts-a.r.Pts)||((b.r.GF-b.r.GA)-(a.r.GF-a.r.GA))||(b.r.GF-a.r.GF));
  const i=ord.findIndex(x=>x.id===CL.clubId);
  return i<0?null:i+1;
}
function rfLen(x){ return (x&&x.length)||0; }
function rfLen0(n){ return n||0; }
function rfPageDef(key){ return RF_PAGES.find(p=>p.key===key)||RF_PAGES[0]; }
/* abas visíveis de uma página (a de ligas internacionais só existe se houver liga carregada) */
function rfTabs(def){ return (def.tabs||[]).filter(t=>!t.show||t.show()); }
function rfTabLabel(t){ return typeof t.l==='function'? t.l() : t.l; }
function rfActiveTab(def){
  const st=rfState(); const tabs=rfTabs(def); if(!tabs.length) return null;
  const want=st.tab[def.key];
  return tabs.find(t=>t.k===want)||tabs[0];
}

/* ---- navegação ---- */
function rfGo(page, tab){
  const st=rfState();
  st.page=page; if(tab) st.tab[page]=tab;
  CL.menu=null; CL.mobMenuOpen=false;
  // o Hub é a única página que ainda usa CL.tab (as abas antigas do painel direito)
  if(page==='hub') CL.tab='seleccao';
  cdraw();
}
function rfSetTab(page, tab){ rfState().tab[page]=tab; cdraw(); }

/* =====================================================================
   CAPTURA — ver a explicação no cabeçalho do arquivo.
   Troca overlayC/clCloseOverlay por coletores enquanto a função de menu roda,
   devolve o corpo do diálogo, e recoloca os originais no finally (senão um
   erro no meio deixaria o jogo sem modal pelo resto da sessão).
   ===================================================================== */
function rfCaptura(fn){
  const _ov=window.overlayC, _cl=window.clCloseOverlay, _cd=window.cdraw;
  let capturado=null;
  try{
    window.overlayC=function(html){ capturado=html; };
    window.clCloseOverlay=function(){};
    // algumas funções de menu chamam cdraw() antes de montar o modal (pra fechar
    // a gaveta): dentro da captura isso seria recursão infinita — a página está
    // sendo desenhada AGORA. Vira no-op só durante a captura.
    window.cdraw=function(){};
    fn();
  }catch(e){
    console.warn('[rf26] captura falhou:', e);
    return `<div class="rf-empty">Não foi possível carregar esta secção.<br><small>${escC(e.message||'')}</small></div>`;
  }finally{
    window.overlayC=_ov; window.clCloseOverlay=_cl; window.cdraw=_cd;
  }
  if(capturado==null) return '<div class="rf-empty">Nada a mostrar aqui agora.</div>';
  return rfLimpaModal(capturado);
}
/* Tira do HTML capturado o que só fazia sentido dentro de um modal: a barra de
   título (a página já tem a sua), o ✕ e o bloco do botão OK (fechar o quê? a
   página não fecha). O resto — tabelas, listas, botões de ação — fica intacto. */
function rfLimpaModal(html){
  const d=document.createElement('div'); d.innerHTML=html;
  d.querySelectorAll('.cl-dlg-title,.cl-dlg-x,.cl-cal-ok,.cl-dlg-badge').forEach(n=>n.remove());
  // o corpo do diálogo vira o corpo da aba, sem a moldura
  const body=d.querySelector('.cl-dlg-content')||d.querySelector('.cl-dlg-body');
  const out=body?body.innerHTML:d.innerHTML;
  return `<div class="rf-legacy">${out}</div>`;
}

/* =====================================================================
   PEÇAS DO ENVELOPE
   ===================================================================== */

/* escudo: <img> do arquivo real com badge de iniciais como fallback — o mesmo
   comportamento de clubCrestHTML(), que já resolve os dois casos. */
function rfCrest(club, size){
  if(typeof clubCrestHTML==='function'){
    const h=clubCrestHTML(club);
    if(h) return h;
  }
  const {col,col2}=clubColors(club||{});
  const ini=String((club&&club.short)||'?').slice(0,3).toUpperCase();
  return `<span class="rf-crest-fb" style="background:${col};color:${col2};width:${size||30}px;height:${size||30}px">${escC(ini)}</span>`;
}

/* forma: os últimos cinco resultados do meu clube, do mais antigo pro mais novo */
function rfForma(){
  const id=CL.clubId; const out=[];
  const res=(S.results||[]).filter(r=>r.h===id||r.a===id).slice(-5);
  res.forEach(r=>{
    const eu=r.h===id?r.gh:r.ga, ele=r.h===id?r.ga:r.gh;
    out.push(eu>ele?'v':eu<ele?'d':'e');
  });
  return out;
}
function rfFormaHTML(){
  const f=rfForma(); if(!f.length) return '<span class="rf-band-sh">sem jogos</span>';
  const L={v:'V',e:'E',d:'D'};
  return `<span class="rf-forma">${f.map(x=>`<i class="${x}">${L[x]}</i>`).join('')}</span>`;
}

/* faixa do clube — o cabeçalho de TODAS as páginas */
function rfBandHTML(titulo){
  const cl=clubOf(CL.clubId)||{short:'—'};
  const nm=(typeof nextUserMatch==='function')?nextUserMatch():null;
  const apito=nm&&typeof shortMatchDate==='function'?shortMatchDate(nm):'';
  return `<div class="rf-band">
    <div class="rf-band-filete"></div>
    <div class="rf-band-crest">${rfCrest(cl,38)}</div>
    <div class="rf-band-id">
      <span class="rf-band-club">${escC(cl.short)}</span>
      <span class="rf-band-sub">
        <span class="rf-band-mgr">${escC(CL.mgr||'Treinador')}</span>
        <span class="rf-label-t">Treinador</span>
        <span>·</span><span>${universeFlag()} ${escC(universeCountryName())}</span>
        <span>·</span><span>${escC(divisionLabel())}</span>
        <span>·</span><span class="rf-num">${escC(String(S.season||''))}</span>
      </span>
    </div>
    <div class="rf-band-sp"></div>
    <div class="rf-band-stat end">
      <span class="rf-band-sl">Em caixa</span>
      <span class="rf-band-sv gold rf-num">${escC(fmt(S.budget||0))}</span>
    </div>
    <div class="rf-band-stat mid">
      <span class="rf-band-sl">Forma</span>
      ${rfFormaHTML()}
    </div>
    <div class="rf-band-stat end">
      <span class="rf-band-sl">Apito inicial</span>
      <span class="rf-band-sv rf-num">${escC(apito||'—')}</span>
    </div>
  </div>`;
}

/* sidebar: 216px → 62px, sete destinos, o "próximo jogo" ancorado no pé */
function rfSidebarHTML(){
  const st=rfState();
  const cl=clubOf(CL.clubId)||{short:'—'};
  const nm=(typeof nextUserMatch==='function')?nextUserMatch():null;
  const opp=nm?(anyClubOf(nm.oppId)||{short:'—'}):null;
  const unread=(typeof inboxUnread==='function')?inboxUnread():0;

  const badgeDe=key=>{
    if(key==='clube') return unread;
    if(key==='mercado') return rfLen(typeof myIncomingOffers==='function'&&myIncomingOffers())
                             + rfLen(typeof myCounterOffers==='function'&&myCounterOffers());
    if(key==='treinador') return rfLen(S&&S.jobOffers);
    return 0;
  };
  const itens=RF_PAGES.map(p=>{
    const n=badgeDe(p.key);
    return `<button type="button" class="rf-nav-i ${st.page===p.key?'on':''}" title="${escC(p.label)}"
      onclick="rfGo('${p.key}')">
      <span class="rf-nav-ico" aria-hidden="true">${p.ico}</span>
      <span class="rf-nav-l">${escC(p.label)}</span>
      ${n>0?`<span class="rf-nav-b">${n>9?'9+':n}</span>`:''}
    </button>`;
  }).join('');

  const xi=xiPlayers(CL.clubId);
  const pronto = xi.length>=11 && CL.tacticChosen && xiGKCount(xi)===1;
  const proximo = nm ? `<div class="rf-sb-next">
      <div class="rf-sb-next-hd">
        <span class="rf-sb-next-l">Próximo jogo</span>
        <span class="rf-sb-next-d">${escC(shortMatchDate(nm)||'')}</span>
      </div>
      <div class="rf-sb-next-opp">
        <span class="rf-sb-next-crest">${rfCrest(opp,26)}</span>
        <span style="min-width:0;display:flex;flex-direction:column">
          <span class="rf-sb-next-n">${escC(opp.short)}</span>
          <span class="rf-sb-next-m">${nm.home?'CASA':'FORA'} · ${escC(nm.comp||'')}</span>
        </span>
      </div>
      <button type="button" class="rf-btn rf-btn-primary rf-btn-full ${pronto?'rf-btn-pulse':''}"
        ${pronto?'':'disabled'} title="${pronto?'Jogar':'Escale onze jogadores e escolha a tática'}"
        onclick="rfJogar()">${rfJogarLabel()}</button>
    </div>` : '';

  return `<aside class="rf-sidebar">
    <div class="rf-sb-club">
      <span class="rf-sb-crest">${rfCrest(cl,34)}</span>
      <span class="rf-sb-cnames">
        <span class="rf-sb-cname">${escC(cl.short)}</span>
        <span class="rf-sb-cmeta">${escC(divisionLabel())} · ${escC(String(S.season||''))}</span>
      </span>
    </div>
    <nav class="rf-sb-nav">${itens}</nav>
    <div class="rf-sb-sp"></div>
    ${proximo}
    <button type="button" class="rf-sb-toggle" onclick="rfToggleSidebar()"
      title="${rfSidebarCollapsed()?'Expandir menu':'Recolher menu'}">
      <span class="rf-nav-ico" aria-hidden="true">${rfSidebarCollapsed()?'▶':'◀'}</span>
      <span>Recolher menu</span>
    </button>
  </aside>`;
}
/* O BOTÃO JOGAR DA SIDEBAR É O MESMO BOTÃO DE SEMPRE, não um atalho novo:
   fora da Resenha ele começa a partida (clJogar); dentro dela ele é o
   interruptor "Pronto" — clicar de novo cancela e a sala volta a esperar
   por mim (ver jogarBtnHTML/clCancelarPronto em main.js). Duplicar essa
   regra aqui seria criar um segundo caminho pra virar rodada. */
function rfJogar(){
  if(typeof estouPronto==='function' && estouPronto()){ clCancelarPronto(); return; }
  if(typeof clJogar==='function') clJogar();
}
function rfJogarLabel(){
  return (typeof estouPronto==='function' && estouPronto()) ? '✔ Pronto' : '⚽ Jogar';
}

/* trilhos de publicidade — ficam FORA da coluna de conteúdo e somem antes dela */
function rfRail(lado){
  const slot='rf98.rail.'+lado;
  const real=window.ADS?ADS.html(slot,{cls:'rf-ad-slot'}):'';
  return `<div data-ad-rail="${lado}">${real||`<div class="rf-ad-slot"><span class="rf-ad-lbl">Publicidade</span></div>`}</div>`;
}
function rfTopAd(){
  const real=window.ADS?ADS.html('rf98.top.970x90',{cls:'rf-ad-top'}):'';
  return real||`<div class="rf-ad-top"><span class="rf-ad-lbl">Publicidade</span></div>`;
}

/* O ENVELOPE: mesa → banner do topo → [trilho · shell(sidebar+conteúdo) · trilho] */
function rfEnvelope(conteudo){
  return `<div class="rf-desk">
    ${rfTopAd()}
    <div class="rf-envelope">
      ${rfRail('left')}
      <div class="rf-shell ${rfSidebarCollapsed()?'collapsed':''}">
        ${rfSidebarHTML()}
        <div class="rf-content">${conteudo}</div>
      </div>
      ${rfRail('right')}
    </div>
    ${rfBottomNavHTML()}
  </div>`;
}

/* ----- Barra de abas: as pastilhas moram DENTRO de um card branco -----
   (referência: card de raio 16 com 6px de respiro, pastilha de raio 11 e
   14px de padding; a ativa é azul cheia com texto branco). A barra rola na
   horizontal quando não cabe, em vez de quebrar em duas linhas. */
function rfTabsHTML(def){
  const tabs=rfTabs(def); if(tabs.length<2) return '';
  const at=rfActiveTab(def);
  return `<div class="rf-tabbar">${tabs.map(t=>
    `<button type="button" class="rf-tabp ${at&&at.k===t.k?'on':''}"
      onclick="rfSetTab('${def.key}','${t.k}')">${escC(rfTabLabel(t))}</button>`).join('')}</div>`;
}

/* ----- Cabeçalho de página: título de 26px, subtítulo e pílula de status.
   A faixa do clube (gradiente) NÃO aparece aqui — ela existe só no Hub. ----- */
function rfPageHeadHTML(def){
  const sub = typeof def.sub==='function' ? def.sub() : def.sub;
  const pill = typeof def.pill==='function' ? def.pill() : null;
  return `<div class="rf-pagehead">
    <div class="rf-pagehead-top">
      <div class="rf-pagehead-id">
        <span class="rf-pagehead-t">${escC(def.titulo||def.label)}</span>
        ${sub?`<span class="rf-pagehead-s">${escC(sub)}</span>`:''}
      </div>
      ${pill?`<span class="rf-pill rf-pill-${pill.tom}">${escC(pill.txt)}</span>`:''}
    </div>
    ${rfTabsHTML(def)}
  </div>`;
}

/* =====================================================================
   O HUB — a tela principal, e o padrão de envelope de todas as outras.
   Coluna esquerda 530px: elenco, moral/segurança, classificação.
   Coluna direita: campo (470×585 FIXOS), formações, destaques, adversário.
   ===================================================================== */
function rfHubHTML(){
  const nm=(typeof nextUserMatch==='function')?nextUserMatch():null;
  const oppId=nm?nm.oppId:null;
  const xi=xiPlayers(CL.clubId);
  const sq=squad(CL.clubId);
  const moral=Math.round(sq.reduce((s,p)=>s+(p.moral||70),0)/Math.max(1,sq.length));

  const esquerda=`
    <div class="rf-card rf-card-flat">
      <div class="rf-card-hd">
        <span class="rf-label-t">Elenco</span>
        <span class="rf-label-r">${sq.length} jogadores · <b>${xi.length}/11</b> titulares</span>
      </div>
      ${rfSquadTableHTML('hub')}
    </div>
    <div class="rf-duo">
      <div class="rf-card">
        <span class="rf-label-t" title="${escC(moralTipText())}">Moral do plantel</span>
        <span class="rf-big rf-num">${moral}</span>
        <div class="rf-bar"><div class="rf-bar-fill" style="width:${moral}%;background:var(--ok)"></div></div>
      </div>
      <div class="rf-card">${jobSecurityBarHTML({dark:false})}</div>
    </div>
    <div class="rf-card rf-card-grow">${rfClassifHTML()}</div>`;

  const direita=`
    <div class="rf-card rf-pitch-card">
      <div class="rf-card-hd">
        <span class="rf-label-t">Tática ${escC(CL.formation||'—')}</span>
        <span class="rf-label-r">onze <b>${xi.length}/11</b> · titulares marcados com T na lista</span>
      </div>
      ${pitchHTML()}
    </div>
    <div class="rf-card">
      <span class="rf-label-t">Formações</span>
      ${rfFormacoesHTML()}
      <div class="rf-acts">
        ${btn('Seleccionar descansados','clSelectRested()',{icon:'🔋',dis:!CL.tacticChosen,
          title:'Reescala o onze priorizando quem está com mais energia, dentro da mesma formação'})}
      </div>
    </div>
    ${oppId?`<div class="rf-card rf-card-grow">
      <span class="rf-label-t">Adversário</span>
      ${panAdversario(oppId)}
    </div>`:''}`;

  return `${rfBandHTML('Formação')}
    <div class="rf-cols">
      <div class="rf-col">${esquerda}</div>
      <div class="rf-col">${direita}</div>
    </div>`;
}

/* as oito pastilhas de formação (seis + Auto + Melhores), com o atalho embaixo */
function rfFormacoesHTML(){
  const opts=Object.keys(FORMATIONS).map(f=>({sel:!CL.xiModo&&CL.formation===f, on:`clSelFormation('${f}');cdraw()`, l:f, h:FKEY[f], t:'Tecla '+FKEY[f]}))
    .concat([
      {sel:CL.xiModo==='auto', on:"clSelFormation('auto');cdraw()", l:'Auto', h:'A', t:'Escalação automática'},
      {sel:CL.xiModo==='best', on:"clSelFormation('best');cdraw()", l:'11+', h:'Melhores', t:'O melhor de cada posição'},
    ]);
  return `<div class="rf-formgrid">${opts.map(o=>
    `<button type="button" class="rf-chip rf-chip-hint ${o.sel?'on':''}" title="${escC(o.t)}" onclick="${o.on}">
      <span class="rf-chip-l">${escC(o.l)}</span><span class="rf-chip-h">${escC(o.h)}</span>
    </button>`).join('')}</div>`;
}

/* classificação compacta da coluna esquerda, com as competições como chips */
function rfClassifHTML(){
  try{
    if(typeof classifTableHTML==='function') return classifTableHTML();
  }catch(e){}
  // fallback: a tabela da divisão do usuário, direto de S.table
  const ids=Object.keys(S.table||{});
  if(!ids.length) return '<span class="rf-label-t">Classificação</span><div class="rf-empty">A tabela aparece depois da primeira rodada.</div>';
  const rows=ids.map(id=>({id,t:S.table[id]}))
    .sort((a,b)=>(b.t.Pts-a.t.Pts)||((b.t.GF-b.t.GA)-(a.t.GF-a.t.GA))||(b.t.GF-a.t.GF));
  return `<span class="rf-label-t">Classificação · ${escC(divisionLabel())}</span>
    <div class="rf-table">
      <div class="rf-tr rf-th"><span>#</span><span>Equipa</span><span class="rf-num-r">J</span>
        <span class="rf-num-r">V</span><span class="rf-num-r">E</span><span class="rf-num-r">D</span>
        <span class="rf-num-r">GP:GC</span><span class="rf-num-r">P</span></div>
      ${rows.map((r,i)=>`<div class="rf-tr ${r.id===CL.clubId?'me':''}">
        <span class="rf-num">${i+1}</span>
        <span class="rf-td-n">${escC((anyClubOf(r.id)||{short:r.id}).short)}</span>
        <span class="rf-num-r">${r.t.P}</span><span class="rf-num-r">${r.t.W}</span>
        <span class="rf-num-r">${r.t.D}</span><span class="rf-num-r">${r.t.L}</span>
        <span class="rf-num-r">${r.t.GF}:${r.t.GA}</span>
        <span class="rf-num-r"><b>${r.t.Pts}</b></span>
      </div>`).join('')}
    </div>`;
}

/* ----- Mercado ▸ Vender -----
   clSell() é a exceção do grupo: ela não abre modal nenhum. O que ela faz é
   ligar CL.rightMode='vender' e mandar redesenhar, porque a tela de venda
   sempre morou DENTRO do painel do jogador. Capturar overlayC aqui não pega
   nada (não há overlay), então a aba liga o mesmo modo na mão e desenha o
   mesmo painel — sem duplicar a tela de venda em lugar nenhum.
   Sem jogador seleccionado não há o que vender: a aba diz isso em vez de
   abrir um formulário vazio. */
function rfVenderHTML(){
  const p=squad(CL.clubId).find(x=>x.pid===CL.selPlayer);
  if(!p) return `<div class="rf-empty">Selecciona um jogador no elenco primeiro.<br>
    <small>A venda acontece sobre o jogador escolhido na lista da <b>Formação</b>.</small></div>`;
  if(typeof canNegotiate==='function' && !canNegotiate())
    return `<div class="rf-empty">${escC(typeof windowClosedMsg==='function'?windowClosedMsg():'A janela de transferências está fechada.')}</div>`;
  CL.tab='jogador'; CL.rightMode='vender'; if(CL.sellPrice==null) CL.sellPrice='';
  return panJogador();
}

/* aba Modo Resenha dentro de Clube & Sistema */
function rfResenhaHTML(){
  if(!CL.online) return `<div class="rf-empty">Você está no <b>Modo Solo</b>.<br>
    <small>O Modo Resenha é o campeonato com a sua turma, na mesma rodada.</small></div>`;
  const acts=[];
  if(typeof NET!=='undefined' && NET.isHost){
    const nr=(CL.pendingJoins&&CL.pendingJoins.length)||0;
    acts.push(btn('Aprovar entradas'+(nr?' ('+nr+')':''),'clJoinRequestsPanel()'));
  }
  acts.push(btn('Sincronizar com a sala','clSyncResenha()'));
  acts.push(btn('Chamar pra Resenha','clInviteResenha()',{cls:'cl-btn-ok'}));
  return `<div class="rf-acts">${acts.join('')}</div>`;
}

/* =====================================================================
   O ROTEADOR — o que cdraw() chama no lugar de scMain()
   ===================================================================== */
/* ===== A PONTE DAS ABAS ANTIGAS =====
   Vinte lugares do jogo dizem "volta pra tela principal mostrando X" com
   `CL.tab='jogador'` / `'financas'` / `'correio'` — o vocabulário da barra de
   abas que não existe mais. Reescrever os vinte seria churn e deixaria o
   próximo `CL.tab=` que alguém escrever apontando pro vazio. Em vez disso o
   roteador ENTENDE o vocabulário antigo: quando CL.tab muda, ele leva pra
   página equivalente.

   Só age na MUDANÇA. Se agisse a cada desenho, o usuário não conseguiria
   navegar: qualquer clique na sidebar seria desfeito no render seguinte,
   porque CL.tab continuaria com o último valor escrito. */
const RF_TAB_LEGADA={
  jogador:  ['elenco','ficha'],
  financas: ['financas','caixa'],
  correio:  ['clube','email'],
  seleccao: ['hub',null],
  jogo:     ['hub',null],
  elenco:   ['hub',null],
  equipa:   ['hub',null],
  adversario:['hub',null],
};
function rfSyncFromLegacyTab(){
  const st=rfState();
  if(CL.tab===st._ultimaTab) return;      // ninguém pediu nada de novo
  st._ultimaTab=CL.tab;
  const alvo=RF_TAB_LEGADA[CL.tab]; if(!alvo) return;
  st.page=alvo[0];
  if(alvo[1]) st.tab[alvo[0]]=alvo[1];
}
function rfScreenHTML(){
  const st=rfState();
  rfSyncFromLegacyTab();
  const def=rfPageDef(st.page);

  // O HUB é a única página com faixa do clube e com a grade 530px + campo.
  if(def.key==='hub') return rfEnvelope(rfHubHTML());

  const at=rfActiveTab(def);
  let corpo='<div class="rf-empty">Nada a mostrar aqui agora.</div>';
  if(at){
    try{ corpo = at.build ? at.build() : rfCaptura(at.run); }
    catch(e){ corpo=`<div class="rf-empty">Não foi possível carregar esta secção.<br><small>${escC(e.message||'')}</small></div>`; }
  }
  // `corpo` pode devolver as duas colunas já montadas (quando a aba foi
  // refeita pela referência) ou um bloco só (quando ainda é conteúdo
  // herdado). Nos dois casos a grade da página é a mesma — quem monta é
  // rfCols(), com a proporção que aquela tela declara.
  const duasColunas = String(corpo).indexOf('data-rf-col')>=0;
  return rfEnvelope(`${rfPageHeadHTML(def)}
    ${duasColunas
      ? `<div class="rf-pagegrid" style="grid-template-columns:${def.grid||'minmax(0,1fr) 340px'}">${corpo}</div>`
      : `<div class="rf-tabpane" data-tab="${at?at.k:''}">${corpo}</div>`}`);
}

/* helpers de composição das páginas refeitas pela referência */
function rfCol(html){ return `<div class="rf-pagecol" data-rf-col>${html}</div>`; }
function rfCard(rotulo, corpo, opts){
  opts=opts||{};
  return `<div class="rf-card ${opts.cls||''}">
    ${rotulo?`<div class="rf-label"><span class="rf-label-t">${escC(rotulo)}</span>
      ${opts.right?`<span class="rf-label-r">${opts.right}</span>`:''}</div>`:''}
    ${corpo}
  </div>`;
}

/* =====================================================================
   ATALHO DE BANCADA — só em localhost, nunca em produção.
   Abrir /?rf=hub cria um save descartável e cai direto na tela pedida, em
   vez de percorrer os sete passos do onboarding a cada recarga. É a única
   porta que faz isso, e ela não existe fora da máquina de desenvolvimento:
   o guard de hostname é a trava, não um comentário pedindo pra ninguém usar.
   ===================================================================== */
(function(){
  const local=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if(!local) return;
  const alvo=new URLSearchParams(location.search).get('rf');
  if(!alvo) return;
  window.addEventListener('load',()=>{
    setTimeout(()=>{
      try{
        CL.countries=new Set(['Brasil']);
        CL.compToggle={libertadores:true,copaBrasil:true,sulamericana:true};
        CL.intlUniverse=false; CL.mgr='Gringo'; CL.mode='solo'; CL.save='bancada';
        const pool=DATA.clubs.filter(c=>c.div==='D'||c.division==='D');
        const cid=(pool[0]||DATA.clubs[0]).id;
        newGame(cid,'D',CL.compToggle);
        CL.clubId=cid; S.xi=autoXI(cid); CL.humans={}; CL.humans[cid]=CL.mgr;
        CL.online=false; CL.formation='4-4-2'; CL.tacticChosen=true; CL.tab='seleccao';
        CL.screen='main';
        if(alvo!=='hub'&&alvo!=='1') rfState().page=alvo;
        cdraw();
        console.info('[rf26] bancada:', clubOf(cid).short, '→', alvo);
      }catch(e){ console.error('[rf26] bancada falhou:', e); }
    },80);
  });
})();

/* =====================================================================
   MOBILE — a sidebar vira BARRA INFERIOR
   No telefone os sete destinos não cabem numa barra: cinco viram itens
   fixos e o resto entra em "Mais", que abre uma FOLHA DE BAIXO. O botão
   ⚽ Jogar fica sempre à direita, fora da contagem — é a ação da tela, não
   um destino. Na Resenha o chat entra como terceiro item, do jeito que o
   design system pede (no telefone não existe a bolha flutuante).
   ===================================================================== */
const RF_NAV_MOBILE=['hub','elenco','mercado','campeonatos'];

function rfBottomNavHTML(){
  const st=rfState();
  const chaves=RF_NAV_MOBILE.slice();
  if(CL.online) chaves.splice(2,0,'chat');          // chat é o terceiro item na Resenha
  const itens=chaves.slice(0,5).map(k=>{
    if(k==='chat'){
      const n=(typeof rfChatNaoLidas==='function')?rfChatNaoLidas():0;
      return `<button type="button" class="rf-bn-i ${rfChatAberto()?'on':''}" onclick="rfChatToggle()">
        <span class="rf-bn-ico">💬</span><span class="rf-bn-l">Chat</span>
        ${n>0?`<span class="rf-nav-b">${n>9?'9+':n}</span>`:''}</button>`;
    }
    const p=rfPageDef(k);
    // na barra inferior vale o rótulo CURTO: "Elenco & Base" e "Campeonatos"
    // não cabem em 375px sem quebrar em duas linhas, e rótulo quebrado é
    // justamente o que o checklist do design system proíbe.
    return `<button type="button" class="rf-bn-i ${st.page===k?'on':''}" onclick="rfGo('${k}')">
      <span class="rf-bn-ico">${p.ico}</span><span class="rf-bn-l">${escC(p.curto||p.label)}</span></button>`;
  }).join('');
  const restantes=RF_PAGES.filter(p=>chaves.indexOf(p.key)<0);
  const maisAtivo=restantes.some(p=>p.key===st.page);
  const xi=xiPlayers(CL.clubId);
  const pronto = xi.length>=11 && CL.tacticChosen && xiGKCount(xi)===1;
  return `<nav class="rf-bottomnav">
    ${itens}
    <button type="button" class="rf-bn-i ${maisAtivo?'on':''}" onclick="rfMaisSheet()">
      <span class="rf-bn-ico">☰</span><span class="rf-bn-l">Mais</span></button>
    <button type="button" class="rf-bn-jogar ${pronto?'rf-btn-pulse':''}" ${pronto?'':'disabled'}
      onclick="rfJogar()">${rfJogarLabel()}</button>
  </nav>`;
}

/* ----- FOLHA DE BAIXO (bottom sheet) — o que no desktop é Dialog -----
   Alça no topo, ações empilhadas, fecha no toque fora ou arrastando pra baixo.
   É o mesmo #c-overlay do desktop: uma peça só, dois formatos, pra um popup
   nunca precisar saber em que aparelho está. */
function rfSheet(titulo, corpo, opts){
  opts=opts||{};
  overlayC(`<div class="rf-sheet" onclick="event.stopPropagation()">
    <div class="rf-sheet-alca" aria-hidden="true"></div>
    ${titulo?`<div class="rf-sheet-hd"><span class="rf-dlg-t">${escC(titulo)}</span>
      <button type="button" class="rf-dlg-x" onclick="clCloseOverlay()" aria-label="Fechar">✕</button></div>`:''}
    <div class="rf-sheet-body">${corpo}</div>
    ${opts.footer?`<div class="rf-sheet-foot">${opts.footer}</div>`:''}
  </div>`);
}
function rfMaisSheet(){
  const st=rfState();
  const chaves=RF_NAV_MOBILE.concat(CL.online?['chat']:[]);
  const resto=RF_PAGES.filter(p=>chaves.indexOf(p.key)<0);
  const linhas=resto.map(p=>`<button type="button" class="rf-sheet-i ${st.page===p.key?'on':''}"
    onclick="clCloseOverlay();rfGo('${p.key}')">
    <span class="rf-nav-ico">${p.ico}</span><span class="rf-nav-l">${escC(p.label)}</span></button>`).join('');
  rfSheet('Ir para', `<div class="rf-sheet-list">${linhas}</div>`);
}

/* =====================================================================
   CHAT DA RESENHA — três estados no desktop, dois no telefone

   O chat já existia e foi DESLIGADO (CHAT_ATIVO em net/local-transport.js)
   por dois motivos concretos: a doca ficava por cima do jogo em toda tela
   online, e a mensagem nova interrompia a partida ao vivo. O desenho novo
   existe justamente pra resolver esses dois — então o transporte continua o
   mesmo (NET.sendChat, room.chat, chatMsgsHTML) e só a interface é nova.

     1 · FECHADO   só a bolha no canto inferior direito. O contador pulsa
                   quando chega mensagem. Sem som, sem notificação do
                   navegador, sem pop-up — o contador é o único aviso.
     2 · ESPIADA   uma linha por vez, 4 segundos, some sozinha. Só enquanto
                   o chat está fechado, e NUNCA durante a partida ao vivo.
     3 · ABERTO    painel de 264px ancorado no canto, por cima do conteúdo,
                   sem empurrar nada. Fecha no ✖, no Esc ou clicando fora.

   SILÊNCIO TOTAL na partida ao vivo e no Camarote: nada de espiada, nada de
   pulso. O contador continua contando — só não chama atenção.
   ===================================================================== */
const RF_CHAT_TELAS_MUDAS=['live','seatclassif'];
function rfChatMudo(){
  if(RF_CHAT_TELAS_MUDAS.indexOf(CL.screen)>=0) return true;
  return !!(CL.camaroteOn || CL.camOpen);      // Modo Camarote
}
function rfChatDisponivel(){ return !!(CL.online && typeof NET!=='undefined' && NET.room); }
function rfChatAberto(){ return !!CL.chatOpen; }
function rfChatNaoLidas(){ return CL.chatUnread||0; }
function rfChatToggle(){
  CL.chatOpen=!CL.chatOpen;
  if(CL.chatOpen){ CL.chatUnread=0; CL._chatPeek=null; }
  rfChatRender();
  if(CL.chatOpen) setTimeout(()=>{ const i=document.getElementById('rf-chat-in'); if(i) i.focus(); },30);
}
function rfChatFechar(){ if(CL.chatOpen){ CL.chatOpen=false; rfChatRender(); } }

/* uma linha por vez, 4 segundos — e só com o chat fechado e o jogo em silêncio */
function rfChatEspiada(msg){
  if(CL.chatOpen || rfChatMudo()) return;
  CL._chatPeek={ nome:(msg.name||'').split(' ')[0], txt:msg.text };
  clearTimeout(CL._chatPeekT);
  CL._chatPeekT=setTimeout(()=>{ CL._chatPeek=null; rfChatRender(); }, 4000);
  rfChatRender();
}

function rfChatHTML(){
  if(!rfChatDisponivel()) return '';
  const n=rfChatNaoLidas();
  const peek=CL._chatPeek;
  const pulsa = n>0 && !rfChatMudo();
  if(CL.chatOpen){
    return `<div class="rf-chat-painel" onclick="event.stopPropagation()">
      <div class="rf-chat-hd">
        <span class="rf-label-t">Chat da Resenha</span>
        <button type="button" class="rf-dlg-x" onclick="rfChatFechar()" aria-label="Fechar chat">✖</button>
      </div>
      <div class="rf-chat-msgs" id="rf-chat-msgs">${chatMsgsHTML()}</div>
      <div class="rf-chat-in">
        <input id="rf-chat-in" class="rf-chat-input" placeholder="Manda a braba…"
          onkeydown="if(event.key==='Enter')rfChatEnviar();if(event.key==='Escape')rfChatFechar()">
        <button type="button" class="rf-chat-send" onclick="rfChatEnviar()" aria-label="Enviar">➤</button>
      </div>
    </div>`;
  }
  return `${peek?`<div class="rf-chat-peek" onclick="rfChatToggle()">
      <span class="rf-chat-peek-q">${escC(peek.nome)}:</span>
      <span class="rf-chat-peek-t">${escC(peek.txt)}</span>
    </div>`:''}
    <button type="button" class="rf-chat-bolha" onclick="rfChatToggle()"
      title="Chat da Resenha (C)" aria-label="Abrir o chat da Resenha">
      <span aria-hidden="true">💬</span>
      ${n>0?`<span class="rf-chat-badge ${pulsa?'pulsa':''}">${n>99?'99+':n}</span>`:''}
    </button>`;
}
function rfChatEnviar(){
  const el=document.getElementById('rf-chat-in'); if(!el) return;
  const txt=(el.value||'').trim(); if(!txt) return;
  el.value='';
  Promise.resolve(NET.sendChat(txt, CL.clubId||null))
    .then(()=>rfChatRender())
    .catch(e=>toastC('Mensagem não enviada: '+(e.message||'erro desconhecido'),'danger'));
}

/* O chat mora num container fixo em <body>, fora do #c-root: assim ele
   sobrevive a cdraw() em qualquer tela (principal, ao vivo, classificação,
   sorteio) sem cada tela precisar saber que ele existe. */
function rfChatRender(){
  if(typeof document==='undefined') return;
  let host=document.getElementById('rf-chat-host');
  if(!rfChatDisponivel()){ if(host) host.remove(); return; }
  if(!host){ host=document.createElement('div'); host.id='rf-chat-host'; document.body.appendChild(host); }
  // no telefone não existe bolha: o chat é item da barra inferior e abre
  // como folha de baixo (ver rfChatSheet)
  if(isPhone()){ host.innerHTML = CL.chatOpen?'':''; if(CL.chatOpen) rfChatSheet(); return; }
  host.className = rfChatMudo()?'mudo':'';
  host.innerHTML = rfChatHTML();
  const m=document.getElementById('rf-chat-msgs'); if(m) m.scrollTop=m.scrollHeight;
}
/* telefone: folha de baixo ocupando 66% da tela */
function rfChatSheet(){
  rfSheet('Chat da Resenha', `<div class="rf-chat-msgs rf-chat-msgs-sheet" id="rf-chat-msgs">${chatMsgsHTML()}</div>`, {
    footer:`<div class="rf-chat-in">
      <input id="rf-chat-in" class="rf-chat-input" placeholder="Manda a braba…"
        onkeydown="if(event.key==='Enter')rfChatEnviar()">
      <button type="button" class="rf-chat-send" onclick="rfChatEnviar()" aria-label="Enviar">➤</button>
    </div>`});
  const m=document.getElementById('rf-chat-msgs'); if(m) m.scrollTop=m.scrollHeight;
}

/* atalhos: C abre, Esc fecha. C só vale fora de campo de texto — senão
   escrever "casa" no nome do save abriria o chat quatro vezes. */
document.addEventListener('keydown',e=>{
  if(!rfChatDisponivel()) return;
  const alvo=e.target, digitando = alvo && (alvo.tagName==='INPUT'||alvo.tagName==='TEXTAREA'||alvo.isContentEditable);
  if(e.key==='Escape' && CL.chatOpen){ rfChatFechar(); return; }
  if(!digitando && (e.key==='c'||e.key==='C') && !e.ctrlKey && !e.metaKey && !e.altKey){ rfChatToggle(); }
});
/* clicar fora fecha o painel — o mesmo alcance do Esc */
document.addEventListener('click',()=>{ if(CL.chatOpen && !isPhone()) rfChatFechar(); });

/* =====================================================================
   MERCADO — refeito a partir de telas/Mercado.html
   A tela troca o antigo caminho de gaveta (divisão → clube → elenco →
   jogador) por uma LISTA ÚNICA de jogadores à venda, com filtro por
   posição e o preço já visível. A coluna de 340px à direita fica fixa em
   qualquer aba: propostas, contrapropostas e últimas transferências são
   resumo permanente, não destino.
   ===================================================================== */

/* ---- quem está à venda: o elenco de todos os outros clubes do universo ----
   O jogo nunca teve uma "lista de transferências" — tinha o passeio por
   divisão e clube. A lista é derivada: todo jogador negociável de clube que
   não é o meu, ordenado por força. É a mesma fonte que o passeio usava, só
   que achatada, que é o que a tela pede. */
function rfMercadoLista(){
  if(CL._mktCache && CL._mktCache.round===S.round && CL._mktCache.pos===(CL.mktPos||'all'))
    return CL._mktCache.lista;
  const pos=CL.mktPos||'all';
  const SETOR={gk:'GK',def:'DEF',mid:'MID',att:'ATT'};
  // O TETO É O CAIXA. A referência escreve "até R$ 1,27 mi" no canto da lista:
  // ela mostra quem eu POSSO comprar, não o mercado inteiro. Sem esse corte um
  // clube da Série D abria a tela com trinta jogadores de 50 milhões e "Sem
  // caixa" em toda linha — uma lista que não serve pra decidir nada.
  const teto=S.budget||0;
  const out=[];
  (DATA.clubs||[]).forEach(c=>{
    if(c.id===CL.clubId) return;
    (squad(c.id)||[]).forEach(p=>{
      if(typeof isTradeLocked==='function' && isTradeLocked(p)) return;
      if(pos!=='all' && p.s!==SETOR[pos]) return;
      const ask=(typeof playerAsk==='function')?playerAsk(p,c.id):(p.mv||0);
      if(ask>teto) return;
      out.push({p,clubId:c.id,ask});
    });
  });
  out.sort((a,b)=>(b.p.f||0)-(a.p.f||0));
  const lista=out.slice(0,120);
  CL._mktCache={round:S.round,pos,lista,total:out.length};
  return lista;
}
function rfMercadoTotal(){ rfMercadoLista(); return (CL._mktCache&&CL._mktCache.total)||0; }
function rfMktPos(p){ CL.mktPos=p; CL._mktCache=null; cdraw(); }

/* linha da lista: escudo · nome · POS · ID · FRC · VALOR · ação
   (grade 30px minmax(0,1fr) 34px 30px 42px 74px 92px, da referência) */
function rfMercadoLinhaHTML(item){
  const p=item.p, c=clubOf(item.clubId)||{short:'?'};
  const ask=item.ask!=null?item.ask:((typeof playerAsk==='function')?playerAsk(p,item.clubId):(p.mv||0));
  return `<div class="rf-mkt-row" onclick="clMarketPlayer('${escC(item.clubId)}','${escC(p.n)}')"
      title="${escC(p.n)} — ${escC(c.short)}">
    <span class="rf-mkt-crest">${rfCrest(c,24)}</span>
    <span class="rf-mkt-name">${escC(p.n)}</span>
    <span class="rf-mkt-pos">${escC(rfPosLabel(p.s))}</span>
    <span class="rf-mkt-id">${p.age||''}</span>
    <span class="rf-mkt-frc">${p.f}</span>
    <span class="rf-mkt-val">${escC(mvShort(ask))}</span>
    <span class="rf-mkt-act">Fazer proposta</span>
  </div>`;
}
const RF_POS_LBL={GK:'GOL',DEF:'ZAG',MID:'MEI',ATT:'ATA'};
function rfPosLabel(s){ return RF_POS_LBL[s]||'MEI'; }

/* ---- aba Comprar: o card "JOGADORES À VENDA" ---- */
function rfMercadoComprarHTML(){
  if(typeof canNegotiate==='function' && !canNegotiate())
    return rfCol(rfCard('Jogadores à venda',
      `<div class="rf-empty">${escC(typeof windowClosedMsg==='function'?windowClosedMsg():'A janela de transferências está fechada.')}</div>`))
      + rfMercadoRailHTML();

  const lista=rfMercadoLista();
  const filtros=[['all','Todos'],['gk','Goleiros'],['def','Defesa'],['mid','Meio'],['att','Ataque']];
  const corpo=`
    <div class="rf-mkt-filtros">
      ${filtros.map(([k,l])=>`<button type="button" class="rf-chip ${(CL.mktPos||'all')===k?'on':''}"
        onclick="rfMktPos('${k}')">${escC(l)}</button>`).join('')}
      <div class="rf-sp"></div>
      <span class="rf-label-r">até ${escC(fmt(S.budget||0))}</span>
    </div>
    <div class="rf-mkt-head">
      <span></span><span>JOGADOR</span><span>POS</span><span>ID</span><span>FRC</span><span>VALOR</span><span>AÇÃO</span>
    </div>
    <div class="rf-mkt-list">${
      lista.length ? lista.map(rfMercadoLinhaHTML).join('')
                   : '<div class="rf-empty">Nenhum jogador nesta posição agora.</div>'}</div>`;
  return rfCol(rfCard('Jogadores à venda', corpo, {right:rfMercadoTotal()+' na janela'}))
       + rfMercadoRailHTML();
}

/* ---- aba Leilão ---- */
function rfMercadoLeilaoHTML(){
  const lots=((S.auctions&&S.auctions.lots)||[]).filter(l=>l.status==='open');
  if(typeof mergeAuctionBidsFromSeats==='function'){ try{ mergeAuctionBidsFromSeats(); }catch(e){} }
  const linhas=lots.map(l=>{
    const p=(typeof findP==='function')?findP(l.player,l.sellerId):null; if(!p) return '';
    const meu=l.leader===S.clubId;
    return `<div class="rf-auc-row ${meu?'me':''}">
      <span class="rf-auc-id">
        <span class="rf-auc-n">${escC(p.n)}</span>
        <span class="rf-auc-sub">${escC(rfPosLabel(p.s))} · ${escC((clubOf(l.sellerId)||{short:'?'}).short)} · 👥 ${l.interest||0}</span>
      </span>
      <span class="rf-auc-frc">${p.f}</span>
      <span class="rf-auc-lance ${meu?'me':''}">${meu?escC(mvShort(l.bid)):'—'}</span>
      <span class="rf-auc-maior">${escC(mvShort(l.bid))}</span>
      <span class="rf-auc-act">
        <button type="button" class="rf-btn rf-btn-pill"
          onclick="clAuctionBidPrompt('${escC(l.sellerId)}','${escC(l.player)}')">Cobrir</button>
      </span>
    </div>`;
  }).join('');
  const corpo=`
    <span class="rf-note">Cubra a maior oferta antes das rodadas acabarem — se o seu lance ficar abaixo, a concorrência cobre na rodada seguinte.</span>
    <div class="rf-auc-head"><span>JOGADOR</span><span>FRC</span><span>SEU LANCE</span><span>MAIOR</span><span></span></div>
    <div class="rf-auc-list">${linhas||'<div class="rf-empty">Nenhum leilão aberto nesta rodada.</div>'}</div>`;
  return rfCol(rfCard('Leilão de jogadores', corpo, {right:'fecha em 2 rodadas'}))
       + rfMercadoRailHTML();
}

/* ---- aba Propostas: as recebidas, em detalhe ---- */
function rfMercadoPropostasHTML(){
  const ofertas=rfPropostas().filter(o=>o.expiresRound>S.round);
  const corpo = ofertas.length
    ? `<div class="rf-prop-list">${ofertas.map(rfPropostaCardHTML).join('')}</div>`
    : `<div class="rf-empty">Nenhuma proposta no momento.<br><small>Clubes fazem propostas pelos seus destaques enquanto a janela está aberta.</small></div>`;
  return rfCol(rfCard('Propostas recebidas', corpo, {right:ofertas.length? ofertas.length+' novas':''}))
       + rfMercadoRailHTML();
}
function rfPropostaCardHTML(o){
  const p=squad(CL.clubId).find(x=>x.n===o.playerName);
  const rodadas=Math.max(0,o.expiresRound-S.round);
  return `<div class="rf-prop">
    <div class="rf-prop-top">
      <span class="rf-prop-n">${escC(o.playerName)}</span>
      <span class="rf-prop-fee">${escC(mvShort(o.fee))}</span>
    </div>
    <span class="rf-prop-sub">${escC(p?rfPosLabel(p.s):'—')} · ${o.playerForce} força · ${escC(o.buyerName||'')} · expira em ${rodadas} rodada(s)</span>
    ${o.lastMsg?`<span class="rf-prop-msg">💬 ${escC(o.lastMsg)}</span>`:''}
    <div class="rf-prop-acts">
      <button type="button" class="rf-btn rf-btn-primary rf-prop-b" onclick="clAcceptOffer(${o.id})">Aceitar</button>
      <button type="button" class="rf-btn rf-btn-secondary rf-prop-b" onclick="clRejectOffer(${o.id})">Recusar</button>
    </div>
  </div>`;
}

/* ---- A COLUNA DE 340px: fixa em qualquer aba ----
   Propostas, contrapropostas e últimas transferências são resumo
   permanente do mercado — na referência elas aparecem ao lado do conteúdo,
   não como destino separado. */
function rfMercadoRailHTML(){
  const ofertas=rfPropostas().filter(o=>o.expiresRound>S.round);
  const contra=(typeof myCounterOffers==='function')?myCounterOffers():[];
  const props = ofertas.length
    ? ofertas.slice(0,3).map(rfPropostaCardHTML).join('')
    : '<span class="rf-note">Nenhuma proposta aberta agora.</span>';
  const contraHTML = contra.length
    ? contra.slice(0,3).map(c=>`<div class="rf-linha">
        <span class="rf-linha-t">${escC(c.playerName||'')}</span>
        <span class="rf-linha-v">${escC(mvShort(c.fee||0))}</span></div>`).join('')
    : '<span class="rf-note">Nenhuma contraproposta aberta agora.</span>';
  // O jogo não guarda um log global de transferências: o histórico VIAJA COM O
  // JOGADOR (p.transferHistory, ver recordTransferHistory no core). Então as
  // "últimas" são as entradas mais recentes entre os jogadores do meu elenco —
  // a mesma fonte que a tela de Últimas transferências sempre usou.
  const nomeDe=id=>{ if(!id) return 'fora do mundo';
    const c=clubOf(id)||(typeof bgClubById==='function'&&bgClubById(id))||(typeof intlClubById==='function'&&intlClubById(id));
    return (c&&c.short)||String(id); };
  const entradas=[];
  squad(CL.clubId).forEach(p=>{ (p.transferHistory||[]).forEach(h=>entradas.push({p,h})); });
  entradas.sort((a,b)=>(b.h.season-a.h.season)||(b.h.round-a.h.round));
  const transfHTML = entradas.length
    ? entradas.slice(0,3).map(({p,h})=>{
        const entrou = h.to===CL.clubId;
        return `<div class="rf-linha">
          <span class="rf-linha-t">${escC(p.n)} ${entrou?'←':'→'} ${escC(nomeDe(entrou?h.from:h.to))}</span>
          <span class="rf-linha-v">${escC(mvShort(h.fee||0))}</span></div>`;
      }).join('')
    : '<span class="rf-note">Nenhuma transferência ainda nesta temporada.</span>';
  return rfCol(
    rfCard('Propostas recebidas', props, {right: ofertas.length? ofertas.length+' novas':''})
    + rfCard('Contrapropostas', contraHTML)
    + rfCard('Últimas transferências', transfHTML)
  );
}

/* ---- helpers ainda sem tela refeita: entregam conteúdo real no formato novo,
   e viram implementação completa quando a tela correspondente for portada ---- */
function rfEmailHTML(){
  if(typeof syncInbox==='function'){ try{ syncInbox(); }catch(e){} }
  return typeof panCorreio==='function' ? panCorreio()
    : '<div class="rf-empty">Caixa de entrada vazia.</div>';
}
/* ---- ELENCO & BASE (telas/Elenco e Base.html) ----
   Quatro cards: ELENCO e BASE na coluna larga, FICHA DO JOGADOR e TREINO
   ESPECIAL na de 360px. As abas do topo levam ao card correspondente — a
   página mostra tudo, a aba é a ênfase. */
function rfElencoHTML(enfase){
  const sq=squad(CL.clubId), xi=xiPlayers(CL.clubId);
  const d=k=>enfase===k?'rf-card-destaque':'';
  return rfCol(
      rfCard('Elenco', rfSquadTableHTML('elenco'),
        {right:sq.length+' jogadores · <b>'+xi.length+'</b> titulares', cls:d('elenco')})
    + rfCard('Base', rfBaseHTML(), {cls:d('base')})
  ) + rfCol(
      rfCard('Ficha do jogador', rfFichaHTML(), {cls:d('ficha'), right:'selecionado'})
    + rfCard('Treino especial', rfTreinoHTML(), {cls:d('treino')})
  );
}
/* base: quem dá pra subir agora, com o custo e o botão */
function rfBaseHTML(){
  const disp=(typeof youthAvailable==='function')&&youthAvailable();
  if(!disp) return `<span class="rf-note">A base não tem ninguém pronto nesta rodada.</span>`;
  return `<span class="rf-note">Suba um jogador da base para o elenco principal. Cada promoção vale por temporada.</span>
    <div class="rf-acts">${btn('Ver jogadores da base','clPromoteYouth()',{cls:'cl-btn-ok'})}</div>`;
}
/* treino especial: os que estão em treino e as vagas que sobram */
function rfTreinoHTML(){
  const lista=(typeof myTrainingList==='function')?myTrainingList():[];
  const max=(typeof TRAINING_MAX_SLOTS!=='undefined')?TRAINING_MAX_SLOTS:3;
  const linhas=lista.length ? lista.map(pid=>{
      const p=squad(CL.clubId).find(x=>x.pid===pid); if(!p) return '';
      return `<div class="rf-linha"><span class="rf-linha-t">${escC(p.n)}</span>
        <span class="rf-linha-v">força ${p.f}</span></div>`;
    }).join('')
    : '<span class="rf-note">Ninguém em treino especial agora.</span>';
  return `${linhas}
    <div class="rf-acts">${btn('Gerir treino ('+lista.length+'/'+max+')','clTrainingScreen()')}</div>`;
}
function rfPatrocinioHTML(){
  return `<div class="rf-empty">O painel de patrocínio ainda não está nesta versão.<br>
    <small>A tela de referência dele não veio no pacote.</small></div>`;
}
/* quantos dias faltam pra janela fechar (texto do subtítulo do Mercado) */
function rfDiasJanela(){
  if(typeof transferWindowStatus!=='function') return null;
  try{ const st=transferWindowStatus(); return st&&st.closesIn?st.closesIn:null; }catch(e){ return null; }
}
function windowClosesIn(){ const d=rfDiasJanela(); return d? (d+' rodada'+(d>1?'s':'')) : null; }

/* =====================================================================
   SQUADTABLE — a tabela de elenco do design system
   Uma peça só, duas densidades, porque a referência traz as duas:
     'hub'    9 colunas (20/24/1fr/26/34/34/42/46/58) — inclui SAL.
     'elenco' 8 colunas (22/26/1fr/30/34/40/46/62)    — sem SAL., mais folgada
   Regras que não mudam entre elas: número em IBM Plex Mono alinhado à
   direita, nome em 14px/600, e o marcador de 17px à esquerda — "T" nas
   cores do clube pra titular, letra da posição em cinza pra reserva.
   ===================================================================== */
const RF_SQUAD_COLS={
  hub:    {grid:'20px 24px minmax(0,1fr) 26px 34px 34px 42px 46px 58px', sal:true,  pad:'7px 10px'},
  elenco: {grid:'22px 26px minmax(0,1fr) 30px 34px 40px 46px 62px',      sal:false, pad:'8px 10px'},
};
function rfSquadTableHTML(modo, opts){
  opts=opts||{};
  const cfg=RF_SQUAD_COLS[modo]||RF_SQUAD_COLS.hub;
  const id=opts.clubId||CL.clubId;
  const lista=(opts.lista||squad(id)).slice().sort(bySquadOrder);
  const xi=new Set(S.xi||[]);
  const cab=`<div class="rf-sq-head" style="grid-template-columns:${cfg.grid}">
    <span></span><span>POS</span><span>NOME</span>
    <span>ID</span><span>FRC</span><span>NOTA</span><span>ENER</span>
    ${cfg.sal?'<span>SAL.</span>':''}<span>VALOR</span>
  </div>`;
  const linhas=lista.map(p=>{
    const tit=xi.has(p.pid);
    const nota=(typeof playerNota==='function')?playerNota(p):null;
    const en=Math.round(p.energy!=null?p.energy:100);
    const sal=(typeof playerSalary==='function')?playerSalary(p):0;
    const indisp=(p.suspended>0)||(p.injuredMatches>0);
    return `<div class="rf-sq-row ${CL.selPlayer===p.pid?'sel':''} ${indisp?'off':''}"
        style="grid-template-columns:${cfg.grid};padding:${cfg.pad}"
        onclick="clSelPlayer('${escC(p.pid)}')" title="${escC(p.n)}">
      <span class="rf-sq-mark ${tit?'tit':''}">${tit?'T':escC(posLetter(p.s))}</span>
      <span class="rf-sq-pos">${escC(posLetter(p.s))}</span>
      <span class="rf-sq-name">${escC(p.n)}${indisp?(p.suspended>0?' 🟥':' ✚'):''}</span>
      <span class="rf-sq-id">${p.age||''}</span>
      <span class="rf-sq-frc">${p.f}</span>
      <span class="rf-sq-nota ${rfNotaTom(nota)}">${nota!=null?escC(String(nota).replace('.',',')):'–'}</span>
      <span class="rf-sq-ener"><i class="rf-ener" style="--v:${en};--c:${rfEnergiaCor(en)}"></i><b>${en}%</b></span>
      ${cfg.sal?`<span class="rf-sq-sal">${escC(mvShort(sal))}</span>`:''}
      <span class="rf-sq-val">${escC(mvShort(p.mv||0))}</span>
    </div>`;
  }).join('');
  return `${cab}<div class="rf-sq-list">${linhas}</div>`;
}
/* a escala de energia do design system: vermelho → verde em cinco faixas */
function rfEnergiaCor(v){
  return v>=80?'var(--energy-100)':v>=70?'var(--energy-80)':v>=55?'var(--energy-60)'
        :v>=40?'var(--energy-40)':'var(--energy-20)';
}
function rfNotaTom(n){ return n==null?'':(n>=7?'boa':n>=5?'media':'ruim'); }

/* =====================================================================
   FICHA DO JOGADOR (telas/Elenco e Base.html)
   Camisa desenhada em CSS (o design system proíbe SVG novo pra isso),
   nome, três barras — Força, Energia, Moral — e as linhas de valor,
   salário e gols. Nada de painel escuro: é card claro como o resto.
   ===================================================================== */
function rfJerseyHTML(num){
  return `<div class="rf-jersey" aria-hidden="true">
    <i class="rf-j-sl l"></i><i class="rf-j-sl r"></i>
    <i class="rf-j-body"><b>${escC(String(num||''))}</b></i>
    <i class="rf-j-collar"></i>
  </div>`;
}
function rfBarraHTML(rotulo, valor, pct, cor){
  return `<div class="rf-fb-l"><span>${escC(rotulo)}</span><span class="rf-num">${escC(String(valor))}</span></div>
    <div class="rf-fb"><i style="width:${Math.max(0,Math.min(100,pct))}%;background:${cor}"></i></div>`;
}
function rfFichaHTML(){
  const p=squad(CL.clubId).find(x=>x.pid===CL.selPlayer) || squad(CL.clubId)[0];
  if(!p) return '<div class="rf-empty">Selecciona um jogador no elenco.</div>';
  const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};
  const en=Math.round(p.energy!=null?p.energy:100);
  const moral=Math.round(p.moral!=null?p.moral:70);
  const sal=(typeof playerSalary==='function')?playerSalary(p):0;
  const gols=((S.scorers&&S.scorers[p.n])||0);
  const fim=(p.contract&&p.contract.until)||null;
  // a força do jogo é uma escala aberta; a barra usa a maior força do meu
  // elenco como topo, senão um clube de Série D teria todas as barras no chão
  const topo=Math.max(1,...squad(CL.clubId).map(x=>x.f||0));
  return `<div class="rf-ficha-id">
      ${rfJerseyHTML(nums[p.pid])}
      <div class="rf-ficha-nm">
        <span class="rf-ficha-n">${escC(p.n)}</span>
        <span class="rf-ficha-s">${escC(rfPosLabel(p.s))} · ${p.age||'?'} anos${fim?' · contrato até '+fim:''}</span>
      </div>
    </div>
    <div class="rf-ficha-bars">
      ${rfBarraHTML('Força', p.f, 100*p.f/topo, 'var(--club-primary)')}
      ${rfBarraHTML('Energia', en+'%', en, rfEnergiaCor(en))}
      ${rfBarraHTML('Moral', moral, moral, 'var(--club-secondary)')}
    </div>
    <div class="rf-sep"></div>
    <div class="rf-ficha-linhas">
      <div class="rf-linha"><span class="rf-linha-t">Valor de mercado</span><span class="rf-linha-v">${escC(fmt(p.mv||0))}</span></div>
      <div class="rf-linha"><span class="rf-linha-t">Salário</span><span class="rf-linha-v">${escC(fmt(sal))}/sem</span></div>
      <div class="rf-linha"><span class="rf-linha-t">Gols na temporada</span><span class="rf-linha-v">${gols}</span></div>
      <div class="rf-linha"><span class="rf-linha-t">Comportamento</span><span class="rf-linha-v">${escC(typeof playerBehaviorLabel==='function'?playerBehaviorLabel(p):'—')}</span></div>
    </div>`;
}
