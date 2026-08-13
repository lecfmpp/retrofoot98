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
  if(!CL.rf) CL.rf={ page:'hub', tab:{}, sbCollapsed:false };
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
const RF_PAGES=[
  { key:'hub',        ico:'🥅', label:'Formação',      curto:'Formação',  titulo:'Formação' },
  { key:'equipa',     ico:'👥', label:'Equipa',        curto:'Equipa',    titulo:'Equipa',
    tabs:[ {k:'estadio',  l:'Estádio',   run:()=>clStadium()},
           {k:'historial',l:'Historial', run:()=>clClubHistory()} ] },
  { key:'mercado',    ico:'🛒', label:'Mercado',       curto:'Mercado',   titulo:'Mercado',
    tabs:[ {k:'comprar',  l:'Comprar',          run:()=>clMarketClubs()},
           {k:'vender',   l:'Vender',           build:()=>rfVenderHTML()},
           {k:'leilao',   l:'Leilão',           run:()=>clAuctionScreen()},
           {k:'propostas',l:'Propostas',        run:()=>clIncomingOffers(),  badge:()=>rfLen(typeof myIncomingOffers==='function'&&myIncomingOffers())},
           {k:'contra',   l:'Contrapropostas',  run:()=>clCounterOffers(),   badge:()=>rfLen(typeof myCounterOffers==='function'&&myCounterOffers())},
           {k:'transf',   l:'Últimas transferências', run:()=>clTransferHistory()} ] },
  { key:'elenco',     ico:'👤', label:'Elenco & Base', curto:'Elenco',    titulo:'Elenco & Base',
    tabs:[ {k:'ficha',  l:'Ficha do jogador', build:()=>panJogador()},
           {k:'base',   l:'Subir da base',    run:()=>clPromoteYouth()},
           {k:'treino', l:'Treino especial',  run:()=>clTrainingScreen()} ] },
  { key:'campeonatos',ico:'🏆', label:'Campeonatos',   curto:'Copas',     titulo:'Campeonatos',
    tabs:[ {k:'minhas',   l:'Minhas competições',       run:()=>clCompList()},
           {k:'calendario',l:'Calendário',              run:()=>clCalendar()},
           {k:'artilharia',l:'Artilharia',              run:()=>clScorers()},
           {k:'vencedores',l:'Últimos vencedores',      run:()=>clUltimosVencedores()},
           {k:'sempre',   l:'Marcadores de sempre',     run:()=>clScorersAllTime()},
           {k:'intl',     l:'Ligas internacionais',     run:()=>clBgLeaguesMenu(),
            show:()=>!!(S&&S.bgLeagues&&Object.keys(S.bgLeagues).length)} ] },
  { key:'treinador',  ico:'🎓', label:'Treinador',     curto:'Treinador', titulo:'Treinador',
    tabs:[ {k:'historia',l:'História',        run:()=>clCoachHistory()},
           {k:'trofeus', l:'Sala de Troféus', run:()=>clTrophyRoom()},
           {k:'ranking', l:'Ranking',         run:()=>clCoachRanking()},
           {k:'ofertas', l:'Ofertas',         run:()=>clJobOffers(),   badge:()=>rfLen(S&&S.jobOffers)},
           {k:'perfil',  l:'Perfil',          run:()=>clPerfilTreinador()} ] },
  { key:'financas',   ico:'💰', label:'Finanças',      curto:'Finanças',  titulo:'Finanças',
    tabs:[ {k:'caixa',   l:'Finanças',   build:()=>panFinancas()},
           {k:'estadio', l:'Estádio',    run:()=>clStadium()} ] },
  { key:'clube',      ico:'⚙️', label:'Clube & Sistema', curto:'Clube',   titulo:'Clube & Sistema',
    tabs:[ {k:'email',   l:'E-mail',   build:()=>panCorreio(), badge:()=>rfLen0(typeof inboxUnread==='function'&&inboxUnread())},
           {k:'opcoes',  l:'Opções',   run:()=>clOptions()},
           {k:'gravar',  l:'Gravar',   run:()=>clSaveMenu()},
           {k:'resenha', l:'Modo Resenha', build:()=>rfResenhaHTML()} ] },
];
function rfLen(x){ return (x&&x.length)||0; }
function rfLen0(n){ return n||0; }
function rfPageDef(key){ return RF_PAGES.find(p=>p.key===key)||RF_PAGES[0]; }
/* abas visíveis de uma página (a de ligas internacionais só existe se houver liga carregada) */
function rfTabs(def){ return (def.tabs||[]).filter(t=>!t.show||t.show()); }
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

/* barra de abas da página (sub-itens de menu, nunca páginas novas) */
function rfTabsHTML(def){
  const tabs=rfTabs(def); if(tabs.length<2) return '';
  const at=rfActiveTab(def);
  return `<div class="rf-tabs">${tabs.map(t=>{
    const n=t.badge?t.badge():0;
    return `<button type="button" class="rf-tab ${at&&at.k===t.k?'on':''}"
      onclick="rfSetTab('${def.key}','${t.k}')">${escC(t.l)}${n>0?` <span class="rf-nav-b">${n>9?'9+':n}</span>`:''}</button>`;
  }).join('')}</div>`;
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
      <div class="rf-roster">${rosterHTML()}</div>
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
  if(def.key==='hub') return rfEnvelope(rfHubHTML());

  const at=rfActiveTab(def);
  let corpo='<div class="rf-empty">Nada a mostrar aqui agora.</div>';
  if(at){
    try{ corpo = at.build ? at.build() : rfCaptura(at.run); }
    catch(e){ corpo=`<div class="rf-empty">Não foi possível carregar esta secção.<br><small>${escC(e.message||'')}</small></div>`; }
  }
  return rfEnvelope(`${rfBandHTML(def.titulo)}
    <div class="rf-card rf-page">
      <div class="rf-card-hd"><span class="rf-label-t">${escC(def.titulo)}</span></div>
      ${rfTabsHTML(def)}
      <div class="rf-tabpane" data-tab="${at?at.k:''}">${corpo}</div>
    </div>`);
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
