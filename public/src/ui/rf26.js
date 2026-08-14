/* =====================================================================
   RetroFoot98 — REBRANDING 2026 · ENVELOPE, SIDEBAR E ROTEADOR DE PÁGINAS
   Carrega DEPOIS de main.js e assume o desenho das telas de dentro do jogo.

   O QUE MUDA DE VERDADE (não é só pele):
   a barra de menu horizontal com sete menus suspensos virou uma SIDEBAR de
   sete destinos, e cada item que antes abria um modal virou ABA dentro da
   página do destino. A regra que decide isso está no design system e é
   curta: se está no menu, é página; se apareceu sozinho, é popup.

   TODA PÁGINA É MONTADA A PARTIR DA TELA DE REFERÊNCIA (docs/rebranding-2026/
   telas/). Nenhuma reaproveita a marcação da pele antiga: as funções de menu
   do main.js continuam existindo pro que ainda é POPUP legítimo (proposta
   recebida, convite de emprego, confirmação destrutiva), mas nenhuma delas
   desenha página. Houve uma fase de transição em que a página capturava a
   chamada de overlayC() dessas funções; ela acabou quando a última aba
   ganhou marcação própria, e o mecanismo foi removido junto.
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
/* =====================================================================
   OS OITO DESTINOS E AS 31 ABAS (pacote "Abas Completas")
   Formação · Mercado · Elenco & Base · Campeonatos · Treinador · Finanças ·
   E-mail · Configurações.

   O item "RetroFoot98" saiu do menu: o escudo no topo da sidebar já faz o
   papel de voltar ao hub. Clube & Sistema virou CONFIGURAÇÕES, e o E-mail
   ganhou destino próprio com as suas duas abas.

   MODELO DE ABA: cada aba é uma tela inteira, com o conteúdo dela. Foi assim
   que o pacote das abas definiu, e substitui o desenho anterior (bloco =
   resumo, aba = extensão) — que era a leitura possível das telas antigas,
   antes de existirem estas.
   ===================================================================== */
const RF_PAGES=[
  { key:'hub', ico:'jogar', label:'Formação', curto:'Formação', banda:true },

  { key:'mercado', ico:'mercado', label:'Mercado', curto:'Mercado',
    titulo:'Mercado', sub:()=>rfSubMercado(),
    /* MERCADO É UMA COLUNA SÓ. As telas do Mercado empilham: a tabela
       ocupa a largura inteira e o bloco de apoio ("O que o caixa
       permite", "Como negociar") vem embaixo. Espremer a tabela num
       1fr+340 comia justamente a coluna do NOME do jogador. */
    acoes:()=>rfMktAcoesHTML(), grid:'minmax(0,1fr)',
    tabs:[ {k:'comprar', l:()=>'Comprar',        build:()=>rfMktComprarHTML()},
           {k:'leilao',  l:()=>'Leilão',         build:()=>rfMktLeilaoHTML()},
           {k:'propostas',l:()=>'Propostas'+rfSufixo(rfLen(rfPropostas())), build:()=>rfMktPropostasHTML()},
           {k:'contra',  l:()=>'Contrapropostas',build:()=>rfMktContraHTML()},
           {k:'vender',  l:()=>'Vender',         build:()=>rfMktVenderHTML()},
           {k:'transf',  l:()=>'Transferências', build:()=>rfMktTransfHTML()} ] },

  { key:'elenco', ico:'elenco', label:'Elenco & Base', curto:'Elenco',
    titulo:'Elenco & Base', sub:()=>rfElSubHTML(),
    acoes:()=>rfElAcoesHTML(), grid:'minmax(0,1fr) 340px',
    tabs:[ {k:'elenco', l:()=>'Elenco',           build:()=>rfElElencoHTML()},
           {k:'ficha',  l:()=>'Ficha do jogador', build:()=>rfElFichaHTML()},
           {k:'base',   l:()=>'Base',             build:()=>rfElBaseHTML()},
           {k:'treino', l:()=>'Treino especial',  build:()=>rfElTreinoHTML()} ] },

  { key:'campeonatos', ico:'trofeu', label:'Campeonatos', curto:'Copas',
    titulo:'Campeonatos', sub:()=>rfCpSubHTML(),
    acoes:()=>rfCpAcoesHTML(), grid:'minmax(0,1fr)',
    tabs:[ {k:'minhas',    l:()=>'Minhas competições', build:()=>rfCpMinhasHTML()},
           {k:'calendario',l:()=>'Calendário',          build:()=>rfCpCalendarioHTML()},
           {k:'artilharia',l:()=>'Artilharia',          build:()=>rfCpArtilhariaHTML()},
           {k:'historia',  l:()=>'História',            build:()=>rfCpHistoriaHTML()},
           {k:'intl',      l:()=>'Ligas internacionais',build:()=>rfCpIntlHTML(),
            show:()=>!!(S&&S.bgLeagues&&Object.keys(S.bgLeagues).length)} ] },

  { key:'treinador', ico:'treinador', label:'Treinador', curto:'Treinador',
    titulo:'Treinador', sub:()=>rfTrSubHTML(),
    acoes:()=>rfTrAcoesHTML(), grid:'minmax(0,1fr)',
    tabs:[ {k:'carreira',l:()=>'Carreira',        build:()=>rfTrCarreiraHTML()},
           {k:'historia',l:()=>'História',        build:()=>rfTrHistoriaHTML()},
           {k:'trofeus', l:()=>'Sala de Troféus', build:()=>rfTrTrofeusHTML()},
           {k:'ranking', l:()=>'Ranking',         build:()=>rfTrRankingHTML()},
           {k:'ofertas', l:()=>'Ofertas'+rfSufixo(rfLen(S&&S.jobOffers)), build:()=>rfTrOfertasHTML()},
           {k:'perfil',  l:()=>'Perfil',          build:()=>rfTrPerfilHTML()} ] },

  { key:'financas', ico:'financas', label:'Finanças', curto:'Finanças',
    titulo:'Finanças', sub:()=>rfFiSubHTML(),
    acoes:()=>rfFiAcoesHTML(), grid:'minmax(0,1fr)',
    tabs:[ {k:'resumo',    l:()=>'Resumo',     build:()=>rfFiResumoHTML()},
           {k:'extrato',   l:()=>'Extrato',    build:()=>rfFiExtratoHTML()},
           {k:'historico', l:()=>'Histórico',  build:()=>rfFiHistoricoHTML()},
           {k:'estadio',   l:()=>'Estádio',    build:()=>rfFiEstadioHTML()},
           {k:'patrocinio',l:()=>'Patrocínio', build:()=>rfFiPatrocinioHTML()} ] },

  { key:'email', ico:'email', label:'E-mail', curto:'E-mail',
    titulo:'E-mail & Sistema', sub:()=>rfEmSubHTML(),
    acoes:()=>rfEmAcoesHTML(), grid:'minmax(0,380px) minmax(0,1fr)',
    tabs:[ {k:'caixa',     l:()=>'Caixa de entrada'+rfSufixo(rfNaoLidas()), build:()=>rfEmCaixaHTML()},
           {k:'arquivadas',l:()=>'Arquivadas',                              build:()=>rfEmArquivadasHTML()} ] },

  { key:'config', ico:'config', label:'Configurações', curto:'Config',
    titulo:'Configurações', sub:()=>rfCfSubHTML(),
    acoes:()=>rfCfAcoesHTML(), grid:'minmax(0,1fr)',
    tabs:[ {k:'opcoes',  l:()=>'Opções',       build:()=>rfCfOpcoesHTML()},
           {k:'jogo',    l:()=>'Jogo',         build:()=>rfCfJogoHTML()},
           {k:'resenha', l:()=>'Modo Resenha', build:()=>rfCfResenhaHTML(),
            show:()=>!!CL.online} ] },
];


/* ---- as pílulas de status do cabeçalho, cada uma com o dado real do save ---- */
function rfSufixo(n){ return n>0? ' ('+n+')' : ''; }
function rfNaoLidas(){ return (typeof inboxUnread==='function')?inboxUnread():0; }
function rfPropostas(){ return (typeof myIncomingOffers==='function')?myIncomingOffers():[]; }
function rfPill(txt,tom){ return {txt,tom:tom||'info'}; }
function rfPillCaixa(){ return rfPill('🟢 Caixa '+fmt(S.budget||0)); }
function rfPillGravado(){
  const t=CL._lastSaveAt?new Date(CL._lastSaveAt):null;
  return rfPill(rfIcone('gravar',16)+''+(t?('Gravado '+String(t.getHours()).padStart(2,'0')+'h'+String(t.getMinutes()).padStart(2,'0')):'Gravação automática'));
}
function rfPillDivisao(){ return rfPill(rfIcone('marcacao',16)+''+divisionLabel()); }
function rfPillFolha(){
  const folha=squad(CL.clubId).reduce((s,p)=>s+(typeof playerSalary==='function'?playerSalary(p):0),0);
  return rfPill('Folha '+fmt(folha)+'/sem');
}
function rfPillPosicao(){
  const pos=rfMinhaPosicao();
  return rfPill(rfIcone('trofeu',16)+''+(pos?pos+'º na '+divisionLabel():divisionLabel()));
}
function rfPillReputacao(){ return rfPill(rfIcone('treinador',16)+' Reputação '+Math.round((S.coachRep!=null?S.coachRep:50))); }
function rfPillSaldo(){
  const b=S.budget||0;
  return rfPill((b>=0?'▲ Saldo positivo':'▼ Saldo negativo'), b>=0?'ok':'danger');
}
function rfPillNaoLidas(){ const n=rfNaoLidas(); return rfPill(rfIcone('email',16)+''+(n?n+' por ler':'Tudo lido')); }
function rfSubMercado(){
  const aberta=(typeof canNegotiate!=='function')||canNegotiate();
  return (aberta?'Janela aberta':'Janela fechada')
    +' · caixa '+rfDin(S.budget||0)
    +' · folha '+rfDin(rfFolha())+'/mês';
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
/* A ABA ATIVA PODE SER NENHUMA. O estado em que a página abre é o RESUMO: os
   blocos todos, cada um com uma amostra e a contagem do total ao lado — é
   exatamente o que as telas do pacote desenham. Uma aba é a EXTENSÃO de um
   bloco: abre aquele bloco inteiro, sem corte. Tocar de novo na aba acesa
   volta pro resumo. Páginas sem `resumo` continuam como antes (primeira aba). */
function rfActiveTab(def){
  const st=rfState(); const tabs=rfTabs(def); if(!tabs.length) return null;
  const want=st.tab[def.key];
  return tabs.find(t=>t.k===want)||tabs[0];
}
function rfSetTabAlterna(page, tab){
  const st=rfState();
  st.tab[page] = (st.tab[page]===tab) ? '' : tab;   // clicou na acesa: volta ao resumo
  cdraw();
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
   PEÇAS DO ENVELOPE
   ===================================================================== */

/* escudo: <img> do arquivo real com badge de iniciais como fallback — o mesmo
   comportamento de clubCrestHTML(), que já resolve os dois casos. */
/* ESCUDO — marcação própria, sem passar pelo clubCrestHTML legado (que trazia
   um invólucro fixo de 34x41 e o emblema de iniciais com estilo do skin antigo).
   Aqui o tamanho vem SEMPRE do contêiner (.rf-*-crest img/.rf-crest-fb), e o
   emblema de iniciais entra como irmão escondido — é ele que aparece quando a
   imagem do escudo não carrega. */
function rfCrest(club, size){
  club=club||{};
  const {col,col2}=clubColors(club);
  const txt=(typeof barTextColor==='function')?barTextColor(col,col2):col2;
  const ini=escC(String(club.short||club.name||'?').replace(/[^\p{L}\p{N}]/gu,'').slice(0,3).toUpperCase());
  const s=size?`width:${size}px;height:${size}px`:'';
  const fb=`<span class="rf-crest-fb" style="background:${col};color:${txt};${s}">${ini}</span>`;
  const url=(typeof clubCrestUrl==='function')?clubCrestUrl(club):'';
  if(!url) return fb;
  return `<img class="rf-crest" src="${escC(url)}" alt="Escudo do ${escC(club.short||'')}" style="${s}"
    onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'"
  ><span class="rf-crest-fb" style="display:none;background:${col};color:${txt};${s}">${ini}</span>`;
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
        <span class="rf-band-mgr">${escC(rfTreinadorNome())}</span>
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
    if(key==='email') return unread;
    if(key==='mercado') return rfLen(typeof myIncomingOffers==='function'&&myIncomingOffers())
                             + rfLen(typeof myCounterOffers==='function'&&myCounterOffers());
    if(key==='treinador') return rfLen(S&&S.jobOffers);
    return 0;
  };
  const itens=RF_PAGES.map(p=>{
    const n=badgeDe(p.key);
    return `<button type="button" class="rf-nav-i ${st.page===p.key?'on':''}" title="${escC(p.label)}"
      onclick="rfGo('${p.key}')">
      <span class="rf-nav-ico" aria-hidden="true">${rfIcone(p.ico,18)}</span>
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

  // O INTERRUPTOR DO MENU FICA NO TOPO, e é a mesma peça nos dois estados.
  // Estava no pé, abaixo do botão Jogar, sem moldura: num fundo branco virava
  // um texto cinza que ninguém achava — e recolhido só sobrava a setinha solta.
  const recolhida=rfSidebarCollapsed();
  const aba=`<div class="rf-sb-top">
    <button type="button" class="rf-sb-toggle" onclick="rfToggleSidebar()"
      aria-expanded="${recolhida?'false':'true'}"
      title="${recolhida?'Expandir menu':'Recolher menu'}">
      <span class="rf-sb-toggle-i" aria-hidden="true">${recolhida?'»':'«'}</span>
      <span class="rf-sb-toggle-l">Recolher</span>
    </button>
  </div>`;

  return `<aside class="rf-sidebar">
    ${aba}
    <button type="button" class="rf-sb-club" onclick="rfGo('hub')" title="Voltar à Formação">
      <span class="rf-sb-crest">${rfCrest(cl,34)}</span>
      <span class="rf-sb-cnames">
        <span class="rf-sb-cname">${escC(cl.short)}</span>
        <span class="rf-sb-cmeta">${escC(divisionLabel())} · ${escC(String(S.season||''))}</span>
      </span>
    </button>
    <nav class="rf-sb-nav">${itens}</nav>
    <div class="rf-sb-sp"></div>
    ${proximo}
  </aside>`;
}
/* O BOTÃO JOGAR DA SIDEBAR É O MESMO BOTÃO DE SEMPRE, não um atalho novo:
   fora da Resenha ele começa a partida (clJogar); dentro dela ele é o
   interruptor "Pronto" — clicar de novo cancela e a sala volta a esperar
   por mim (ver jogarBtnHTML/clCancelarPronto em main.js). Duplicar essa
   regra aqui seria criar um segundo caminho pra virar rodada. */
/* de quem é esta cadeira: no hotseat o envelope é o MESMO, mas quem está
   sentado é o assento da vez — mostrar o nome do anfitrião ali seria dizer que
   o time é dele (ver enterSeatContext) */
function rfTreinadorNome(){
  const seat=CL._seatContext&&CL._seatContext.seat;
  return (seat&&seat.name)||CL.mgr||'Treinador';
}
function rfJogar(){
  if(typeof estouPronto==='function' && estouPronto()){ clCancelarPronto(); return; }
  if(typeof clJogar==='function') clJogar();
}
function rfJogarLabel(){
  return (typeof estouPronto==='function' && estouPronto()) ? rfIcone('ok',16)+' Pronto' : rfIcone('jogar',16)+' Jogar';
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

/* O ENVELOPE — painel, não cápsula.
   Antes isto era uma mesa que CENTRAVA um envelope de `width:max-content`,
   ladeado por dois trilhos de anúncio. Três coisas saíam erradas disso:
   a área logada deixava vazio metade de um monitor largo; o banner do topo
   (970px fixos, centrado na mesa) não alinhava com nada — nem com a faixa do
   clube, que é a barra logo abaixo dele; e a sidebar era um cartão flutuando
   com 18px de respiro em volta, em vez de a coluna de navegação da página.
   Agora é o desenho de painel: sidebar colada à borda esquerda ocupando a
   altura toda, miolo com o resto da largura e rolagem PRÓPRIA (a página não
   rola, o miolo rola), e o banner como primeiro bloco da coluna de conteúdo —
   mesma caixa da faixa do clube, que era o pedido.
   Os trilhos laterais saíram: a publicidade da área logada passa a morar
   dentro da página. */
function rfEnvelope(conteudo){
  return `<div class="rf-app ${rfSidebarCollapsed()?'collapsed':''}">
    ${rfSidebarHTML()}
    <main class="rf-main">
      <div class="rf-content">
        ${rfTopAd()}
        ${conteudo}
      </div>
    </main>
    ${rfBottomNavHTML()}
    ${typeof rfAcaoHTML==='function'?rfAcaoHTML():''}
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
  /* AÇÕES DA PÁGINA: quando a tela do pacote desenha botões no canto
     superior direito (Mercado tem "Exportar lista" e "Buscar jogador"),
     eles substituem a pílula de estado — não convivem com ela. */
  const acoes = typeof def.acoes==='function' ? def.acoes() : null;
  return `<div class="rf-pagehead">
    <div class="rf-pagehead-top">
      <div class="rf-pagehead-id">
        <span class="rf-pagehead-t">${escC(def.titulo||def.label)}</span>
        ${sub?`<span class="rf-pagehead-s">${escC(sub)}</span>`:''}
      </div>
      ${acoes||(pill?`<span class="rf-pill rf-pill-${pill.tom}">${escC(pill.txt)}</span>`:'')}
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
      ${rfMedidorHTML('Moral do plantel', moral, rfFormaHTML()||'sem jogos',
        'var(--brand-primary)', moralTipText())}
      ${rfSegurancaHTML()}
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
        ${btn('Seleccionar descansados','clSelectRested()',{icon:rfIcone('energia',16)+'',dis:!CL.tacticChosen,
          title:'Reescala o onze priorizando quem está com mais energia, dentro da mesma formação'})}
      </div>
    </div>
    <div class="rf-hub-baixo">
      ${rfNotasHTML()}
      ${rfAdversarioCardHTML()}
    </div>`;

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
/* =====================================================================
   MEDIDORES E CLASSIFICAÇÃO DO HUB  (pacote "Hub do time v2")
   Os dois medidores são a mesma peça: rótulo, o número grande em mono
   à esquerda e a leitura em texto à direita, na MESMA linha de base, e
   a barra de 8px embaixo. Antes eram dois desenhos diferentes — a moral
   com o número solto e a segurança ainda com a barra do jogo antigo.
   ===================================================================== */
function rfMedidorHTML(rotulo, valor, leitura, cor, dica){
  const v=Math.max(0,Math.min(100,Math.round(valor)));
  return `<div class="rf-card rf-medidor">
    <span class="rf-label-t"${dica?` title="${escC(dica)}"`:''}>${escC(rotulo)}</span>
    <div class="rf-med-l">
      <span class="rf-med-v rf-num">${v}</span>
      <span class="rf-med-t">${leitura}</span>
    </div>
    <div class="rf-med-bar"><i style="width:${v}%;background:${cor}"></i></div>
  </div>`;
}
function rfSegurancaHTML(){
  const js=Math.round(S.jobSecurity!=null?S.jobSecurity:60);
  const leitura = js>=70?'direção confiante' : js>=40?'direção neutra'
                : js>=16?'direção impaciente' : 'cargo em risco';
  const cor = js>=70?'var(--ok)' : js>=40?'var(--brand-secondary,#F2B90C)' : 'var(--danger)';
  const dica=(typeof jobSecurityTipText==='function')
    ? jobSecurityTipText(js, leitura) : '';
  return rfMedidorHTML('Segurança no cargo', js, escC(leitura), cor, dica);
}

/* ----- Classificação com os CHIPS das competições -----
   O bloco mostra uma competição por vez e os chips trocam entre elas.
   Só entram competições que o clube DISPUTA neste save: a liga sempre, e
   cada copa que existe em S.cups e não foi desligada no compToggle. Nada
   de chip decorativo pra torneio que o motor não simula. */
function rfHubComps(){
  const out=[{key:'liga', rot:divisionLabel()}];
  ((typeof allCupKeys==='function')?allCupKeys():[]).forEach(k=>{
    if(S.compToggle && S.compToggle[k]===false) return;
    if(!(S.cups&&S.cups[k])) return;
    const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    out.push({key:k, rot:def.short||def.name||k});
  });
  return out;
}
function rfSetHubComp(k){ CL.hubComp=k; cdraw(); }
function rfClassifHTML(){
  const comps=rfHubComps();
  const atual = comps.find(c=>c.key===CL.hubComp) || comps[0];
  const chips = comps.length>1 ? `<div class="rf-comp-chips">${comps.map(c=>
    `<button type="button" class="rf-comp-chip ${c.key===atual.key?'on':''}"
      onclick="rfSetHubComp('${escC(c.key)}')">${escC(c.rot)}</button>`).join('')}</div>` : '';
  const corpo = atual.key==='liga' ? rfClassifLigaHTML() : rfClassifCopaHTML(atual.key);
  return `<div class="rf-cl-hd">
      <span class="rf-label-t">Classificação · ${escC(atual.rot)}</span>
      <span class="rf-label-r">${corpo.meta}</span>
    </div>
    ${chips}
    ${corpo.html}
    <div class="rf-cl-fill"></div>
    <button type="button" class="rf-cl-ver" onclick="rfGo('campeonatos')">Ver tabela completa</button>`;
}
function rfClTabelaHTML(linhas){
  return `<div class="rf-tb-head"><span></span><span></span><span>J</span><span>V</span>
      <span>E</span><span>D</span><span>GM:GS</span><span>P</span></div>
    <div class="rf-tb-list">${linhas}</div>`;
}
function rfClassifLigaHTML(){
  const ids=Object.keys(S.table||{});
  if(!ids.length) return {meta:'a começar',
    html:'<div class="rf-empty">A tabela aparece depois da primeira rodada.</div>'};
  const rows=ids.map(id=>({id,t:S.table[id]}))
    .sort((a,b)=>(b.t.Pts-a.t.Pts)||((b.t.GF-b.t.GA)-(a.t.GF-a.t.GA))||(b.t.GF-a.t.GF));
  const promo=(typeof DIVISION_PROMO!=='undefined'&&DIVISION_PROMO[S.division])||0;
  const releg=(typeof DIVISION_RELEG!=='undefined'&&DIVISION_RELEG[S.division])||0;
  const minha=rows.findIndex(r=>r.id===CL.clubId)+1;
  const linhas=rows.map((r,i)=>{
    const z = (promo&&i<promo)?'promo' : (releg&&i>=rows.length-releg)?'drop' : '';
    const c=anyClubOf(r.id)||{short:r.id};
    return `<div class="rf-tb-row ${r.id===CL.clubId?'me':''}">
      <span class="rf-tb-pos"><i class="rf-zona ${z}"></i><b>${i+1}</b></span>
      <span class="rf-tb-n">${escC(c.short||r.id)}</span>
      <span class="rf-tb-x">${r.t.P}</span><span class="rf-tb-x">${r.t.W}</span>
      <span class="rf-tb-x">${r.t.D}</span><span class="rf-tb-x">${r.t.L}</span>
      <span class="rf-tb-x">${r.t.GF}:${r.t.GA}</span>
      <span class="rf-tb-p">${r.t.Pts}</span>
    </div>`;
  }).join('');
  return {meta: minha? minha+'º de '+rows.length : rows.length+' equipas',
    html: rfClTabelaHTML(linhas)};
}
/* Copa tem DOIS formatos e eles não se parecem: a fase de grupos é uma
   tabela de verdade (do meu grupo), o mata-mata é a escada de fases. As
   duas usam a mesma grelha da liga — no mata-mata as colunas que não
   existem (J V E D) ficam em travessão, como no desenho. */
function rfClassifCopaHTML(key){
  const c=(S.cups&&S.cups[key])||{};
  const meta=(typeof cupCompetitionRoundLabel==='function'&&cupCompetitionRoundLabel(c,key))||'—';
  const gobj=(c.group&&c.group.groups)||null;
  if(gobj && !c.bracket){
    const letras=Object.keys(gobj).sort();
    const L=letras.find(x=>(gobj[x].teams||[]).includes(CL.clubId));
    const tab=L?gobj[L]:null;
    if(!tab) return {meta:'não disputa',
      html:'<div class="rf-empty">O clube não está na fase de grupos desta competição.</div>'};
    const ord=Object.values(tab.table||{})
      .sort((a,b)=>(b.Pts-a.Pts)||((b.GF-b.GA)-(a.GF-a.GA))||(b.GF-a.GF));
    const linhas=ord.map((t,i)=>{
      const cl=anyClubOf(t.id)||{short:t.id};
      return `<div class="rf-tb-row ${t.id===CL.clubId?'me':''}">
        <span class="rf-tb-pos"><i class="rf-zona ${i<2?'promo':''}"></i><b>${i+1}</b></span>
        <span class="rf-tb-n">${escC(cl.short||t.id)}</span>
        <span class="rf-tb-x">${t.P}</span><span class="rf-tb-x">${t.W}</span>
        <span class="rf-tb-x">${t.D}</span><span class="rf-tb-x">${t.L}</span>
        <span class="rf-tb-x">${t.GF}:${t.GA}</span>
        <span class="rf-tb-p">${t.Pts}</span>
      </div>`;
    }).join('');
    return {meta:'grupo '+L, html:rfClTabelaHTML(linhas)};
  }
  const br=c.bracket;
  if(!br) return {meta, html:'<div class="rf-empty">A chave ainda não foi sorteada.</div>'};
  const fases=[];
  (br.history||[]).forEach(h=>(h.ties||[]).forEach(t=>{
    if(t.h!==CL.clubId && t.a!==CL.clubId) return;
    const casa=t.h===CL.clubId, adv=anyClubOf(casa?t.a:t.h)||{short:'—'};
    fases.push({f:cupPhaseLabel(h.round,br.roundsTotal), adv:adv.short||'—',
      pl:(t.hg!=null&&t.ag!=null)?((casa?t.hg:t.ag)+':'+(casa?t.ag:t.hg)):'—',
      ok:t.winner?(t.winner===CL.clubId?'promo':'drop'):''});
  }));
  (br.ties||[]).forEach(t=>{
    if(t.h!==CL.clubId && t.a!==CL.clubId) return;
    const casa=t.h===CL.clubId, adv=anyClubOf(casa?t.a:t.h)||{short:'—'};
    fases.push({f:cupPhaseLabel(br.round,br.roundsTotal), adv:adv.short||'—', pl:'—', ok:''});
  });
  if(!fases.length) return {meta, html:'<div class="rf-empty">O clube não está nesta chave.</div>'};
  const linhas=fases.map(x=>`<div class="rf-tb-row">
      <span class="rf-tb-pos"><i class="rf-zona ${x.ok}"></i><b>${escC(x.f.replace(/[^0-9A-Za-zªº]/g,'').slice(0,5))}</b></span>
      <span class="rf-tb-n">${escC(x.adv)}</span>
      <span class="rf-tb-x">—</span><span class="rf-tb-x">—</span>
      <span class="rf-tb-x">—</span><span class="rf-tb-x">—</span>
      <span class="rf-tb-x">${escC(x.pl)}</span>
      <span class="rf-tb-p">—</span>
    </div>`).join('');
  return {meta, html:rfClTabelaHTML(linhas)};
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
  const monta = at ? at.build : def.resumo;
  if(monta){
    try{ corpo = monta(); }
    catch(e){
      console.warn('[rf26] página falhou:', def.key+'/'+(at?at.k:'resumo'), e);
      corpo=`<div class="rf-empty">Não foi possível carregar esta secção.<br><small>${escC(e.message||'')}</small></div>`;
    }
  }
  // `corpo` pode devolver as duas colunas já montadas (quando a aba foi
  // refeita pela referência) ou um bloco só (quando ainda é conteúdo
  // herdado). Nos dois casos a grade da página é a mesma — quem monta é
  // rfCols(), com a proporção que aquela tela declara.
  // Uma aba pode devolver: (a) só um bloco — vira painel de largura cheia;
  // (b) duas colunas marcadas com data-rf-col — vão pra grade da página;
  // (c) uma FAIXA (data-rf-top, os KPIs de Finanças) seguida das colunas —
  // a faixa fica ACIMA da grade, atravessando as duas colunas.
  const s=String(corpo);
  const iCol=s.indexOf('data-rf-col');
  if(iCol<0) return rfEnvelope(`${rfPageHeadHTML(def)}
    <div class="rf-tabpane" data-tab="${at?at.k:''}">${s}</div>`);
  // tudo que vem antes do primeiro <div class="rf-pagecol"> é faixa de topo
  const corte=s.lastIndexOf('<div class="rf-pagecol"', iCol);
  const topo=corte>0?s.slice(0,corte):'';
  const colunas=corte>0?s.slice(corte):s;
  return rfEnvelope(`${rfPageHeadHTML(def)}
    ${topo}
    <div class="rf-pagegrid" style="grid-template-columns:${def.grid||'minmax(0,1fr) 340px'}">${colunas}</div>`);
}

/* =====================================================================
   BLOCO É RESUMO, ABA É O BLOCO INTEIRO
   Toda página interna é uma lista de BLOCOS. Sem aba escolhida, a página
   desenha todos eles, cada um com uma amostra e a contagem do todo ao lado
   — é o que as telas do pacote mostram. Escolhida uma aba, a página desenha
   SÓ aquele bloco, inteiro e em largura cheia: a aba é a extensão do bloco,
   não outro assunto.

   `col` diz em qual das duas colunas o bloco mora no resumo. `lim` é quantas
   linhas o resumo mostra; o corpo recebe esse número e decide o que fazer
   com ele (quem não tem lista ignora).
   ===================================================================== */
function rfBlocos(pagina, blocos, so){
  const dir=b=>(typeof b.dir==='function')?b.dir():b.dir;
  if(so){
    const b=blocos.find(x=>x.k===so);
    if(!b) return '';
    return rfCol(rfCard(typeof b.t==='function'?b.t():b.t, b.corpo(0), {right:dir(b)}));
  }
  const card=b=>rfCard(typeof b.t==='function'?b.t():b.t, b.corpo(b.lim||0), {right:dir(b),
    cls: b.lim? 'rf-card-resumo':''});
  const c1=blocos.filter(b=>(b.col||1)===1).map(card).join('');
  const c2=blocos.filter(b=>b.col===2).map(card).join('');
  return (pagina&&pagina.topo?pagina.topo():'') + rfCol(c1) + rfCol(c2);
}
/* rodapé de um bloco resumido: "ver os N …" leva pra aba daquele bloco */
function rfVerMais(pagina, k, texto){
  return `<button type="button" class="rf-vermais" onclick="rfSetTab('${pagina}','${k}')">${escC(texto)}</button>`;
}

/* helpers de composição das páginas refeitas pela referência */
function rfCol(html){ return `<div class="rf-pagecol" data-rf-col>${html}</div>`; }

/* =====================================================================
   LISTA LONGA — rola DENTRO do card, e não carrega tudo de uma vez.
   Duas coisas que uma lista de 38 jornadas ou de 60 e-mails quebra:
   a página inteira vira um rolo (o cabeçalho da lista sai da vista logo na
   terceira linha), e o navegador monta centenas de nós que ninguém vai ler.
   Aqui a lista ganha rolagem própria — do mesmo jeito que o bloco Elenco do
   Hub sempre teve — e um limite de 20/50/100 linhas com o pé mostrando
   quantas estão à vista de quantas existem.
   O limite vive em CL (não no save): é preferência de sessão, não estado
   de jogo, e não deve viajar no arquivo do save.
   ===================================================================== */
const RF_LISTA_PASSOS=[20,50,100];
function rfListaLim(chave){
  const v=CL.listaLim && CL.listaLim[chave];
  return RF_LISTA_PASSOS.indexOf(v)>=0 ? v : RF_LISTA_PASSOS[0];
}
function rfListaSetLim(chave, n){
  CL.listaLim=CL.listaLim||{}; CL.listaLim[chave]=n;
  cdraw();
}
/* `linhas` é um ARRAY de HTML, não uma string já juntada: o corte tem de
   acontecer por linha, e receber a string pronta obrigaria a cortar no
   meio de uma marcação. */
function rfLista(chave, linhas, vazio){
  linhas=linhas||[];
  if(!linhas.length) return `<div class="rf-empty">${vazio||'Nada aqui agora.'}</div>`;
  const lim=rfListaLim(chave);
  const total=linhas.length;
  const vistas=Math.min(lim,total);
  const corpo=`<div class="rf-lista">${linhas.slice(0,vistas).join('')}</div>`;
  // o pé só aparece quando há mais linha do que o menor passo — numa lista
  // de seis nomes ele seria ruído
  if(total<=RF_LISTA_PASSOS[0]) return corpo;
  return corpo+`<div class="rf-lista-pe">
    <span class="rf-lista-conta">mostrando ${vistas} de ${total}</span>
    <div class="rf-sp"></div>
    <span class="rf-lista-l">linhas</span>
    ${RF_LISTA_PASSOS.map(n=>`<button type="button" class="rf-lista-n ${lim===n?'on':''}"
      onclick="rfListaSetLim('${escC(chave)}',${n})">${n}</button>`).join('')}
  </div>`;
}
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
        // ?rf=ob1..ob7 abre um PASSO DO ONBOARDING direto, com o save de
        // bancada por trás — é o único jeito de rever o passo 6 (sorteio) ou o
        // 7 (boas-vindas) sem refazer o fluxo inteiro a cada recarga.
        if(/^ob[1-7]$/.test(alvo)){ rfBancadaOnboarding(alvo); return; }
        if(alvo!=='hub'&&alvo!=='1') rfState().page=alvo;
        cdraw();
        console.info('[rf26] bancada:', clubOf(cid).short, '→', alvo);
      }catch(e){ console.error('[rf26] bancada falhou:', e); }
    },80);
  });
})();

/* monta o estado mínimo de cada passo e desenha só ele (ver o atalho acima) */
function rfBancadaOnboarding(alvo){
  const n=Number(alvo.slice(2));
  CL.auth={mode:'signup',name:CL.mgr,email:'',password:''};
  CL.playCountry='Brasil';
  if(n===2 && CL.soloSaves==null && typeof NET!=='undefined' && NET.listSoloSaves){
    NET.listSoloSaves().then(l=>{ CL.soloSaves=l||[]; rfBancadaDesenha(n); }).catch(()=>{ CL.soloSaves=[]; rfBancadaDesenha(n); });
  }
  if(n===4||n===5){
    // sala de mentira, só pra desenhar: o lobby de verdade exige servidor
    NET.isHost=true; NET.self=NET.self||{id:'u1',name:CL.mgr};
    NET.room=NET.room||{code:'RF-0000',name:'Sala de bancada',
      participants:[{id:'u1',name:CL.mgr,host:true,confirmed:true}]};
    if(!NET.inviteLink) NET.inviteLink=()=>location.origin+'/s/RF-0000';
    CL.net=CL.net||{roomName:'Sala de bancada',inviteEmail:'',phone:''};
  }
  if(n===6){
    const pool=DATA.clubs.slice(0,4);
    CL.soloDraw={ list:pool.map((c,i)=>({name:['Gringo','Zé do Bairro','Marreco','Tiu'][i],clubId:c.id})),
      idx:3, poolById:Object.fromEntries(pool.map(c=>[c.id,c])) };
  }
  rfBancadaDesenha(n);
}
function rfBancadaDesenha(n){
  const f=window['rfOb'+n]; if(typeof f!=='function'){ console.warn('[rf26] passo inexistente:',n); return; }
  document.querySelector('#c-root').innerHTML=f();
  console.info('[rf26] bancada: onboarding passo', n);
}

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
      <span class="rf-bn-ico">${rfIcone(p.ico,20)}</span><span class="rf-bn-l">${escC(p.curto||p.label)}</span></button>`;
  }).join('');
  const restantes=RF_PAGES.filter(p=>chaves.indexOf(p.key)<0);
  const maisAtivo=restantes.some(p=>p.key===st.page);
  const xi=xiPlayers(CL.clubId);
  const pronto = xi.length>=11 && CL.tacticChosen && xiGKCount(xi)===1;
  return `<nav class="rf-bottomnav">
    ${itens}
    <button type="button" class="rf-bn-i ${maisAtivo?'on':''}" onclick="rfMaisSheet()">
      <span class="rf-bn-ico">${rfIcone('menu',20)}</span><span class="rf-bn-l">Mais</span></button>
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
    <span class="rf-nav-ico">${rfIcone(p.ico,18)}</span><span class="rf-nav-l">${escC(p.label)}</span></button>`).join('');
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
        <input id="rf-chat-in" class="rf-chat-input" placeholder="Manda a braba"
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
      <input id="rf-chat-in" class="rf-chat-input" placeholder="Manda a braba"
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
    <!-- POS/ID/FRC ficam dentro de um invólucro que no DESKTOP é
         display:contents (os três viram colunas da grade, como na tela) e no
         TELEFONE vira uma linha só, de subtítulo embaixo do nome. Um HTML,
         duas leituras — sem repetir o dado em dois lugares. -->
    <span class="rf-mkt-meta">
      <span class="rf-mkt-pos">${escC(rfPosLabel(p.s))}</span>
      <span class="rf-mkt-id">${p.age||''}</span>
      <span class="rf-mkt-frc">${p.f}</span>
    </span>
    <span class="rf-mkt-val">${escC(mvShort(ask))}</span>
    <span class="rf-mkt-act">Fazer proposta</span>
  </div>`;
}
const RF_POS_LBL={GK:'GOL',DEF:'ZAG',MID:'MEI',ATT:'ATA'};
function rfPosLabel(s){ return RF_POS_LBL[s]||'MEI'; }

/* ---- aba Comprar: o card "JOGADORES À VENDA" ---- */
/* =====================================================================
   MERCADO — BLOCO É RESUMO, ABA É O BLOCO INTEIRO
   A página abre no RESUMO: os cinco blocos, cada um com uma amostra e a
   contagem do todo ao lado ("126 na janela", "2 novas"). É o que a tela do
   pacote desenha. Tocar numa aba abre AQUELE bloco por inteiro, em largura
   cheia e sem corte — a aba é a extensão do bloco, não outro assunto.
   ===================================================================== */
function rfMktVendaCard(lim){
  if(typeof canNegotiate==='function' && !canNegotiate())
    return rfCard('Jogadores à venda',
      `<div class="rf-empty">${escC(typeof windowClosedMsg==='function'?windowClosedMsg():'A janela de transferências está fechada.')}</div>`);
  const lista=rfMercadoLista();
  const mostra=lim?lista.slice(0,lim):lista;
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
      mostra.length ? mostra.map(rfMercadoLinhaHTML).join('')
                    : '<div class="rf-empty">Nenhum jogador nesta posição agora.</div>'}</div>
    ${lim&&lista.length>lim?`<button type="button" class="rf-vermais" onclick="rfSetTab('mercado','comprar')">
      Ver os ${lista.length} jogadores à venda</button>`:''}`;
  // "na janela" é o que a ABA abre — não o total do mundo. rfMercadoLista()
  // corta em 120 por desempenho, e prometer 328 num botão que abre 120 é
  // mentir sobre o próprio resumo.
  return rfCard('Jogadores à venda', corpo, {right:lista.length+' na janela'});
}
function rfMktLeilaoCard(lim){
  const lots=((S.auctions&&S.auctions.lots)||[]).filter(l=>l.status==='open');
  if(typeof mergeAuctionBidsFromSeats==='function'){ try{ mergeAuctionBidsFromSeats(); }catch(e){} }
  const mostra=lim?lots.slice(0,lim):lots;
  const linhas=mostra.map(l=>{
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
    ${lim?'':'<span class="rf-note">Cubra a maior oferta antes das rodadas acabarem — se o seu lance ficar abaixo, a concorrência cobre na rodada seguinte.</span>'}
    <div class="rf-auc-head"><span>JOGADOR</span><span>FRC</span><span>SEU LANCE</span><span>MAIOR</span><span></span></div>
    <div class="rf-auc-list">${linhas||'<div class="rf-empty">Nenhum leilão aberto nesta rodada.</div>'}</div>
    ${lim&&lots.length>lim?`<button type="button" class="rf-vermais" onclick="rfSetTab('mercado','leilao')">
      Ver os ${lots.length} leilões abertos</button>`:''}`;
  return rfCard('Leilão de jogadores', corpo, {right: lots.length?'fecha em 2 rodadas':''});
}
/* o RESUMO da página: coluna 1 com venda + leilão, coluna 2 com o trilho */
function rfMercadoResumoHTML(){
  return rfCol(rfMktVendaCard(6) + rfMktLeilaoCard(5)) + rfMercadoRailHTML();
}
/* as abas: o mesmo bloco, inteiro e em largura cheia */
function rfMercadoComprarHTML(){ return rfCol(rfMktVendaCard()); }
function rfMercadoLeilaoHTML(){ return rfCol(rfMktLeilaoCard()); }

/* ---- aba Propostas: as recebidas, em detalhe ---- */
function rfMercadoPropostasHTML(){
  const ofertas=rfPropostas().filter(o=>o.expiresRound>S.round);
  const corpo = ofertas.length
    ? `<div class="rf-prop-list">${ofertas.map(rfPropostaCardHTML).join('')}</div>`
    : `<div class="rf-empty">Nenhuma proposta no momento.<br><small>Clubes fazem propostas pelos seus destaques enquanto a janela está aberta.</small></div>`;
  return rfCol(rfCard('Propostas recebidas', corpo, {right:ofertas.length? ofertas.length+' novas':''}));
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
    ${o.lastMsg?`<span class="rf-prop-msg">${rfIcone('chat',16)} ${escC(o.lastMsg)}</span>`:''}
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
const RF_BL_ELENCO=[
  { k:'elenco', t:'Elenco', col:1, corpo:()=>rfSquadTableHTML('elenco'),
    dir:()=>{ const sq=squad(CL.clubId), xi=xiPlayers(CL.clubId);
              return sq.length+' jogadores · <b>'+xi.length+'</b> titulares'; } },
  { k:'base',   t:'Base',   col:1, corpo:()=>rfBaseHTML() },
  { k:'ficha',  t:'Ficha do jogador', col:2, corpo:()=>rfFichaHTML(), dir:'selecionado' },
  { k:'treino', t:'Treino especial',  col:2, corpo:()=>rfTreinoHTML() },
];
function rfElencoHTML(so){ return rfBlocos(null, RF_BL_ELENCO, so); }

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
  modo=RF_SQUAD_COLS[modo]?modo:'hub';
  const cfg=RF_SQUAD_COLS[modo];
  const id=opts.clubId||CL.clubId;
  const lista=(opts.lista||squad(id)).slice().sort(bySquadOrder);
  const xi=new Set(S.xi||[]);
  // a densidade vai na CLASSE, não só na grade inline: é por ela que o CSS
  // enxuga a tabela do Hub quando a coluna aperta, sem tocar na do Elenco.
  const cab=`<div class="rf-sq-head rf-sq-${modo||'hub'}" style="grid-template-columns:${cfg.grid}">
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
    return `<div class="rf-sq-row rf-sq-${modo||'hub'} ${CL.selPlayer===p.pid?'sel':''} ${indisp?'off':''}"
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

/* =====================================================================
   CAMPEONATOS (telas/Campeonatos.html)
   Cinco cards: a TABELA e o CALENDÁRIO na coluna larga; artilharia,
   últimos vencedores e marcadores de sempre na de 340px.
   ===================================================================== */

/* zona da linha na tabela: acesso (verde), rebaixamento (vermelho), neutro.
   As faixas vêm das MESMAS constantes que decidem a virada de temporada
   (DIVISION_PROMO/DIVISION_RELEG) — a tabela não pode prometer um acesso
   que o motor não vai cumprir. */
function rfZonaTabela(pos, total){
  const promo=(typeof DIVISION_PROMO!=='undefined'&&DIVISION_PROMO[S.division])||0;
  const releg=(typeof DIVISION_RELEG!=='undefined'&&DIVISION_RELEG[S.division])||0;
  if(promo>0 && pos<=promo) return 'promo';
  if(releg>0 && pos>total-releg) return 'drop';
  return '';
}
/* `lim` corta a tabela para o RESUMO. O corte é uma JANELA EM VOLTA DO MEU
   CLUBE, não os primeiros da tabela: quem está em 14º precisa ver os vizinhos
   dele, não o líder. Sem `lim`, a tabela inteira. */
function rfTabelaHTML(lim){
  const linhas=(typeof sortedTable==='function')?sortedTable():[];
  if(!linhas.length) return '<div class="rf-empty">A tabela aparece depois da primeira rodada.</div>';
  const total=linhas.length;
  // a janela do resumo: eu no meio, os vizinhos em volta
  let mostra=linhas.map((t,i)=>({t,i}));
  if(lim && total>lim){
    const meu=Math.max(0, linhas.findIndex(t=>t.id===CL.clubId));
    let ini=Math.max(0, meu-Math.floor((lim-1)/2));
    ini=Math.min(ini, total-lim);
    mostra=mostra.slice(ini, ini+lim);
  }
  return `<div class="rf-tb-head">
      <span></span><span></span><span>J</span><span>V</span><span>E</span><span>D</span><span>GM:GS</span><span>P</span>
    </div>
    <div class="rf-tb-list">${mostra.map(({t,i})=>{
      const eu=t.id===CL.clubId;
      return `<div class="rf-tb-row ${eu?'me':''}" onclick="clubLink&&clClubHistory('${escC(t.id)}')">
        <span class="rf-tb-pos"><i class="rf-zona ${rfZonaTabela(i+1,total)}"></i><b>${i+1}</b></span>
        <span class="rf-tb-n">${escC((anyClubOf(t.id)||{short:t.id}).short)}</span>
        <span class="rf-tb-x">${t.P}</span><span class="rf-tb-x">${t.W}</span>
        <span class="rf-tb-x">${t.D}</span><span class="rf-tb-x">${t.L}</span>
        <span class="rf-tb-x">${t.GF}:${t.GA}</span>
        <span class="rf-tb-p">${t.Pts}</span>
      </div>`;
    }).join('')}</div>
    ${lim&&total>lim?rfVerMais('campeonatos','minhas','Ver a tabela dos '+total+' clubes'):''}`;
}

/* calendário do MEU clube: data, adversário, local e resultado */
function rfCalendarioHTML(){
  const sched=S.sched||[]; const linhas=[];
  sched.forEach((jornada,i)=>{
    (jornada||[]).forEach(m=>{
      if(m[0]!==CL.clubId && m[1]!==CL.clubId) return;
      const casa=m[0]===CL.clubId;
      const opp=anyClubOf(casa?m[1]:m[0])||{short:'—'};
      const res=(S.results||[]).find(r=>r.round===i && r.h===m[0] && r.a===m[1]);
      const meu=res?(casa?res.gh:res.ga):null, dele=res?(casa?res.ga:res.gh):null;
      const tom=res?(meu>dele?'v':meu<dele?'d':'e'):'';
      linhas.push(`<div class="rf-cal-row ${i===S.round?'agora':''}">
        <span class="rf-cal-d">${escC((typeof calRowDate==='function'&&calRowDate(i))||((i+1)+'ª'))}</span>
        <span class="rf-cal-o">${escC(opp.short)}</span>
        <span class="rf-cal-l">${casa?'Casa':'Fora'}</span>
        <span class="rf-cal-r ${tom}">${res?meu+'-'+dele:'—'}</span>
      </div>`);
    });
  });
  if(!linhas.length) return '<div class="rf-empty">O calendário aparece quando a temporada começa.</div>';
  return `<div class="rf-cal-head"><span>DATA</span><span>ADVERSÁRIO</span><span>LOCAL</span><span>RES.</span></div>
    <div class="rf-cal-list">${linhas.join('')}</div>`;
}

/* artilharia da divisão (temporada) e de sempre — a mesma peça, duas fontes */
function rfArtilhariaHTML(mapa, subDe, lim){
  const todos=Object.entries(mapa||{}).map(([n,g])=>({n,g})).sort((a,b)=>b.g-a.g);
  const arr=todos.slice(0, lim||20);
  if(!arr.length) return '<span class="rf-note">Sem gols marcados ainda.</span>';
  return arr.map((s,i)=>{
    const cid=(typeof findPlayerClub==='function')?findPlayerClub(s.n):null;
    const sub=subDe? subDe(s) : (cid?(clubOf(cid)||{short:''}).short:'');
    return `<div class="rf-art-row">
      <span class="rf-art-i">${i+1}</span>
      <span class="rf-art-id"><span class="rf-art-n">${escC(s.n)}</span><span class="rf-art-s">${escC(sub||'')}</span></span>
      <span class="rf-art-g">${s.g}</span>
    </div>`;
  }).join('') + (lim&&todos.length>lim
    ? `<span class="rf-note">e mais ${todos.length-lim} marcador${todos.length-lim===1?'':'es'}.</span>` : '');
}
function rfVencedoresHTML(){
  const hist=(S.history||[]).slice().reverse().slice(0,6);
  if(!hist.length) return '<span class="rf-note">Ainda não há temporadas concluídas neste save.</span>';
  return hist.map(h=>`<div class="rf-linha">
    <span class="rf-linha-t rf-num">${escC(String(h.season))}</span>
    <span class="rf-venc">${escC(h.champ||'—')}</span></div>`).join('');
}

function rfMarcadoresDeSempre(){
  const acc={...(S.allTimeScorers||{})};
  Object.entries(S.scorers||{}).forEach(([n,g])=>{ acc[n]=(acc[n]||0)+g; });
  return acc;
}
const RF_BL_CAMPEONATOS=[
  { k:'minhas',   t:()=>classifDivName(S.division), col:1, lim:7, corpo:l=>rfTabelaHTML(l),
    dir:()=>rfMinhaPosicao()?rfMinhaPosicao()+'º de '+Object.keys(S.table||{}).length:'' },
  { k:'calendario', t:'Calendário', col:1, corpo:()=>rfCalendarioHTML(),
    dir:()=>{ const nm=(typeof nextUserMatch==='function')?nextUserMatch():null;
              return nm? ((S.round||0)+1)+'ª jornada em '+(shortMatchDate(nm)||'') : ''; } },
  { k:'artilharia', t:()=>'Artilharia da '+divisionLabel(), col:2, lim:4,
    corpo:l=>rfArtilhariaHTML(S.scorers,null,l) },
  { k:'historia',   t:'Últimos vencedores', col:2, corpo:()=>rfVencedoresHTML() },
  // HISTORIAL DO CLUBE: era a única coisa que só existia na página Equipa. A
  // Equipa saiu da sidebar e o historial veio pra cá — é história de
  // competição, que é do que esta página trata.
  { k:'historial',  t:'Historial do clube', col:2, corpo:()=>rfHistorialHTML(),
    dir:()=>(S.history||[]).filter(h=>h.clubId===CL.clubId).length+' temporadas' },
  { k:'sempre',     t:'Marcadores de sempre', col:2, lim:2,
    corpo:l=>rfArtilhariaHTML(rfMarcadoresDeSempre(),null,l) },
];
function rfCampeonatosHTML(so){ return rfBlocos(null, RF_BL_CAMPEONATOS, so); }


/* =====================================================================
   FINANÇAS (telas/Financas.html)
   Uma tira de quatro KPIs no topo — caixa, folha, sócios, estádio — e
   depois EXTRATO e HISTÓRICO na coluna larga, ESTÁDIO e PATROCÍNIO na de
   340px. Todo número em IBM Plex Mono, e o vermelho é reservado pra
   despesa: nada de pintar de vermelho o que é só grande.
   ===================================================================== */
/* O NÚMERO É SEMPRE NEUTRO; quem carrega cor é a LINHA DEBAIXO. É assim
   nas telas: "R$ 3,05 mi" em preto e "+1,78 mi" em verde por baixo. Pintar
   o número grande de vermelho fazia a tela inteira parecer um alarme. */
function rfKpiHTML(rotulo, valor, sub, tom){
  return `<div class="rf-kpi">
    <span class="rf-label-t">${escC(rotulo)}</span>
    <span class="rf-kpi-v">${escC(valor)}</span>
    ${sub?`<span class="rf-kpi-s ${tom||''}">${escC(sub)}</span>`:''}
  </div>`;
}
function rfFinTotais(){
  return S.seasonTotals||{income:0,salaries:0,bonuses:0,opex:0,playerSales:0,playerPurchases:0,stadium:0};
}
function rfFinancasKpisHTML(){
  const sq=squad(CL.clubId);
  const folhaSem=sq.reduce((s,p)=>s+((p.contract&&p.contract.salary)||0),0);
  const st=myStadium?myStadium():null;
  const cap=(st&&st.capacity)||(typeof STAND_START!=='undefined'?STAND_START:0);
  const socios=Math.round(cap*0.18);   // proporção estável de sócios sobre a capacidade
  const ult=(S.finances||[])[0];
  const delta=ult?((ult.income||0)+(ult.playerSales||0)-((ult.salaries||0)+(ult.bonuses||0)+(ult.opex||0)+(ult.playerPurchases||0)+(ult.stadium||0))):0;
  return `<div class="rf-kpis">
    ${rfKpiHTML('Em caixa', fmt(S.budget||0), (delta>=0?'+ ':'− ')+fmt(Math.abs(delta))+' na rodada')}
    ${rfKpiHTML('Folha salarial', fmt(folhaSem), 'por semana · '+sq.length+' jogadores','neg')}
    ${rfKpiHTML('Sócios', grp(socios), 'estimativa sobre a capacidade')}
    ${rfKpiHTML('Estádio', grp(cap), 'lugares')}
  </div>`;
}
/* extrato: o log real de transações da temporada, mais recente primeiro */
function rfExtratoHTML(){
  const logs=[];
  (S.finances||[]).forEach(f=>{ if(f.log) logs.push(...f.log); });
  if(!logs.length) return '<span class="rf-note">Nenhum movimento registrado nesta temporada ainda.</span>';
  return `<div class="rf-extrato">${logs.slice(0,12).map(l=>{
    // o log já vem escrito na voz do jogo ("💰 Fulano vendido ao X por R$ 1M");
    // aqui só separamos o valor no fim pra ele cair na coluna mono à direita
    const m=String(l).match(/^(.*?)([+-]?\s*R?\$?\s*[\d.,]+\s*(?:mil|mi|k|M)?)\s*\.?$/);
    const txt=m?m[1].replace(/\s+por\s*$/,''):l, val=m?m[2].trim():'';
    return `<div class="rf-ext-row">
      <span class="rf-ext-t">${escC(txt)}</span>
      <span class="rf-ext-v">${escC(val)}</span></div>`;
  }).join('')}</div>`;
}
/* histórico: ANO · RECEITA · DESPESA · LUCRO */
function rfHistoricoHTML(){
  const ent=((S.financeHistory&&S.financeHistory[CL.clubId])||[]).slice().reverse();
  if(!ent.length) return '<span class="rf-note">O histórico aparece quando a primeira temporada fechar.</span>';
  return `<div class="rf-fh-head"><span>ANO</span><span>RECEITA</span><span>DESPESA</span><span>LUCRO</span></div>
    <div class="rf-fh-list">${ent.map(e=>{
      const rec=e.income||0, des=e.expenses||0, luc=rec-des;
      return `<div class="rf-fh-row">
        <span class="rf-fh-a">${escC(String(e.season))}</span>
        <span class="rf-fh-r">${escC(mvShort(rec))}</span>
        <span class="rf-fh-d">${escC(mvShort(des))}</span>
        <span class="rf-fh-l ${luc>=0?'pos':'neg'}">${luc>=0?'+ ':'− '}${escC(mvShort(Math.abs(luc)))}</span>
      </div>`;
    }).join('')}</div>`;
}
function rfEstadioCardHTML(){
  const st=myStadium?myStadium():null;
  const cap=(st&&st.capacity)||(typeof STAND_START!=='undefined'?STAND_START:0);
  const max=(typeof stadiumMaxCapacity==='function')?stadiumMaxCapacity():cap;
  const custo=(typeof standCost==='function')?standCost():0;
  return `<div class="rf-linha"><span class="rf-linha-t">Capacidade</span><span class="rf-linha-v">${grp(cap)} lugares</span></div>
    <div class="rf-linha"><span class="rf-linha-t">Teto de expansão</span><span class="rf-linha-v">${grp(max)}</span></div>
    <div class="rf-linha"><span class="rf-linha-t">Preço do bilhete</span><span class="rf-linha-v">${CL.ticket||0} reais</span></div>
    <div class="rf-linha"><span class="rf-linha-t">Nova bancada</span><span class="rf-linha-v">${escC(fmt(custo))}</span></div>
    <div class="rf-acts">${btn('Gerir estádio','clStadium()')}</div>`;
}
/* PATROCÍNIO: a referência traz camisa, manga e placas. Os valores saem da
   divisão e do porte do estádio — o jogo não tem contrato de patrocínio
   como entidade, então eles são derivados, não inventados a cada desenho. */
function rfPatrocinioHTML(){
  const st=myStadium?myStadium():null;
  const cap=(st&&st.capacity)||(typeof STAND_START!=='undefined'?STAND_START:20000);
  const peso={A:8,B:4,C:2,D:1}[S.division]||1;
  const base=Math.round(cap*peso*0.7);
  const linha=(l,v)=>`<div class="rf-linha"><span class="rf-linha-t">${escC(l)}</span>
    <span class="rf-linha-v">${escC(fmt(v))}/temporada</span></div>`;
  return linha('Camisa', base*2) + linha('Manga', Math.round(base*1.3)) + linha('Placas do estádio', base);
}
const RF_BL_FINANCAS=[
  { k:'extrato',   t:'Extrato da temporada', col:1, corpo:()=>rfExtratoHTML(),
    dir:()=>S.season+' · '+(S.round||0)+' jogos' },
  { k:'historico', t:'Histórico por temporada', col:1, corpo:()=>rfHistoricoHTML(),
    dir:()=>{ const n=(S.history||[]).length; return n?n+' temporadas':''; } },
  { k:'estadio',   t:'Estádio', col:2, corpo:()=>rfEstadioCardHTML(),
    dir:()=>{ const st=(typeof myStadium==='function')?myStadium():null;
              return st&&st.capacity?grp(st.capacity)+' lugares':''; } },
  { k:'patrocinio',t:'Patrocínio', col:2, corpo:()=>rfPatrocinioHTML() },
];
function rfFinancasHTML(so){
  return rfBlocos({topo:rfFinancasKpisHTML}, RF_BL_FINANCAS, so);
}


/* =====================================================================
   TREINADOR (telas/Treinador.html)
   Faixa de identidade no topo (nome em Georgia — o único uso de serifa da
   tela), depois HISTÓRIA e SALA DE TROFÉUS na coluna larga, OFERTAS,
   RANKING e PERFIL na de 340px.
   ===================================================================== */
function rfTreinadorTopoHTML(){
  const cl=clubOf(CL.clubId)||{short:'—'};
  const temps=(S.coachHistory||[]).length;
  const titulos=rfTitulosDoTreinador().length;
  return `<div class="rf-kpis">
    <div class="rf-kpi rf-kpi-id">
      <span class="rf-label-t">Treinador</span>
      <span class="rf-tr-nome">${escC(rfTreinadorNome())}</span>
      <span class="rf-kpi-s">${escC(cl.short)} · ${escC(divisionLabel())} · ${escC(String(S.season||''))}</span>
    </div>
    ${rfKpiHTML('Reputação', String(Math.round(S.coachRep!=null?S.coachRep:50)), 'entre 0 e 100')}
    ${rfKpiHTML('Títulos', String(titulos), titulos===1?'conquistado':'conquistados')}
    ${rfKpiHTML('Temporadas', String(temps), 'registradas na carreira')}
  </div>`;
}
/* os títulos do treinador, lidos de S.titlesByClub (mesma fonte da Sala) */
function rfTitulosDoTreinador(){
  const out=[];
  const porClube=(S&&S.titlesByClub)||{};
  Object.keys(porClube).forEach(id=>{
    Object.entries(porClube[id]||{}).forEach(([comp,n])=>{
      for(let i=0;i<(n||0);i++) out.push({comp,clubId:id});
    });
  });
  // e o histórico do treinador traz o ano de cada conquista
  (S.coachHistory||[]).forEach(h=>{ if(h.type==='titulo') out.push({comp:h.text,season:h.season}); });
  return out;
}
function rfTrofeusHTML(){
  const t=rfTitulosDoTreinador();
  if(!t.length) return `<span class="rf-note">Nenhum título ainda. As silhuetas aparecem quando a primeira taça vier.</span>`;
  return `<div class="rf-trofeus">${t.slice(0,8).map(x=>`<div class="rf-trofeu">
    <span class="rf-trofeu-i">${(typeof trophyImg==='function'&&trophyImg(x.comp,26))||rfIcone('trofeu',16)+''}</span>
    <span class="rf-trofeu-n">${escC(rfCompLabel(x.comp))}</span>
    <span class="rf-trofeu-a">${escC(String(x.season||''))}</span>
  </div>`).join('')}</div>`;
}
function rfCompLabel(k){
  if(typeof COMP_DEFS!=='undefined' && COMP_DEFS[k]) return COMP_DEFS[k].short||k;
  if(typeof divisionLabelOf==='function' && /^serie/i.test(k)) return divisionLabelOf(k.replace(/^serie/i,'').toUpperCase());
  return String(k);
}
/* história: ANO · CLUBE · DIVISÃO · POS · TÍTULO */
function rfHistoriaHTML(){
  const h=(S.coachHistory||[]).slice().reverse();
  if(!h.length) return '<span class="rf-note">A carreira começa agora.</span>';
  return `<div class="rf-th-head"><span>ANO</span><span>CLUBE</span><span>DIVISÃO</span><span>POS</span><span>TÍTULO</span></div>
    <div class="rf-th-list">${h.slice(0,12).map(e=>`<div class="rf-th-row">
      <span class="rf-th-a">${escC(String(e.season||''))}</span>
      <span class="rf-th-c">${escC((clubOf(CL.clubId)||{short:''}).short)}</span>
      <span class="rf-th-d">${escC(divisionLabel())}</span>
      <span class="rf-th-p">${e.pos||'—'}</span>
      <span class="rf-th-t">${escC(e.text||'')}</span>
    </div>`).join('')}</div>`;
}
/* ranking: posição · nome · pontos (mesma conta do clCoachRanking) */
function rfRankingHTML(lim){
  if(typeof migrateCoachCareerStats==='function'){ try{ migrateCoachCareerStats(); }catch(e){} }
  const BONUS=50;
  const rows=(DATA.clubs||[]).map((c,i)=>{
    const t=(S.table&&S.table[c.id])||{Pts:0};
    const car=(S.coachCareerStats&&S.coachCareerStats[c.id])||{pts:0,titles:0};
    return {nome:(typeof coachName==='function')?coachName(c.id,i):'—',
            pts:car.pts+(t.Pts||0), titles:car.titles||0,
            eu:!!(CL.humans&&CL.humans[c.id])};
  }).sort((a,b)=>(b.pts+b.titles*BONUS)-(a.pts+a.titles*BONUS)||b.pts-a.pts);
  return `<div class="rf-rk-list">${rows.slice(0, lim||20).map((r,i)=>`<div class="rf-rk-row ${r.eu?'me':''}">
    <span class="rf-rk-i">${i+1}</span>
    <span class="rf-rk-n">${escC(r.nome)}</span>
    <span class="rf-rk-p">${r.pts}</span>
  </div>`).join('')}</div>
  ${lim&&rows.length>lim?rfVerMais('treinador','ranking','Ver o ranking completo'):''}`;
}
function rfOfertasHTML(){
  const of=(S.jobOffers||[]);
  if(!of.length) return '<span class="rf-note">Nenhuma oferta na mesa agora.</span>';
  return of.slice(0,3).map(o=>{
    const c=(typeof jobOfferClub==='function')?jobOfferClub(o):{short:'?'};
    return `<div class="rf-oferta">
      <div class="rf-oferta-hd">
        <span class="rf-oferta-crest">${rfCrest(c,28)}</span>
        <span class="rf-oferta-id">
          <span class="rf-oferta-n">${escC(c.short)}</span>
          <span class="rf-oferta-s">${escC((typeof jobOfferDivLabel==='function'?jobOfferDivLabel(o):''))}${o.salary?' · salário '+fmt(o.salary):''}</span>
        </span>
      </div>
      <span class="rf-note">${escC((typeof jobOfferObjective==='function'?jobOfferObjective(o):''))}</span>
      <div class="rf-acts">${btn('Ver convite','showJobInvite('+JSON.stringify(o).replace(/"/g,'&quot;')+')',{cls:'cl-btn-ok'})}</div>
    </div>`;
  }).join('');
}
/* perfil: preferências, com interruptor de verdade onde o jogo tem opção */
function rfPerfilHTML(){
  const auto=!!(CL.options&&CL.options.autoSalary);
  return `<div class="rf-perfil">
    <div class="rf-pref"><span class="rf-pref-l">Salários automáticos</span>
      <button type="button" class="rf-switch ${auto?'on':''}" onclick="rfTogglePref('autoSalary')"
        aria-pressed="${auto?'true':'false'}"><i></i></button></div>
    <div class="rf-linha"><span class="rf-linha-t">Ritmo de jogo</span>
      <span class="rf-linha-v">${escC(typeof tempoLabelAtual==='function'?tempoLabelAtual():'—')}</span></div>
    <div class="rf-linha"><span class="rf-linha-t">Modo</span>
      <span class="rf-linha-v">${CL.online?'Resenha':'Solo'}</span></div>
    <div class="rf-acts">${btn('Abrir opções','clOptions()')}</div>
  </div>`;
}
function rfTogglePref(k){ CL.options=CL.options||{}; CL.options[k]=!CL.options[k]; cdraw(); }

const RF_BL_TREINADOR=[
  { k:'historia', t:'História', col:1, corpo:()=>rfHistoriaHTML(),
    dir:()=>(S.coachHistory||[]).length+' temporadas registradas' },
  { k:'trofeus',  t:'Sala de Troféus', col:1, corpo:()=>rfTrofeusHTML(),
    dir:()=>{ const t=rfTitulosDoTreinador(); return t.length+(t.length===1?' título':' títulos'); } },
  { k:'ofertas',  t:'Ofertas', col:2, corpo:()=>rfOfertasHTML(),
    dir:()=>(S.jobOffers||[]).length? (S.jobOffers||[]).length+' nova(s)':'' },
  { k:'ranking',  t:'Ranking de treinadores', col:2, lim:4, corpo:l=>rfRankingHTML(l),
    dir:'por pontos somados' },
  { k:'perfil',   t:'Perfil', col:2, corpo:()=>rfPerfilHTML(), dir:'preferências' },
];
function rfTreinadorHTML(so){
  return rfBlocos({topo:rfTreinadorTopoHTML}, RF_BL_TREINADOR, so);
}


/* =====================================================================
   CLUBE & SISTEMA / E-MAIL (telas/Clube e Sistema.html)
   Grade INVERTIDA: a lista de e-mails ocupa os 340px da ESQUERDA e o
   conteúdo (leitura, opções, jogo) fica na coluna larga da direita.
   ===================================================================== */
function rfInbox(){ if(typeof syncInbox==='function'){ try{ syncInbox(); }catch(e){} } return CL.inbox||[]; }
function rfQuandoHTML(e){
  const r=(e.round||0)+1;
  return 'rodada '+r+(e.season?(' · '+e.season):'');
}
function rfListaEmailsHTML(){
  const box=rfInbox();
  if(!box.length) return '<span class="rf-note">Caixa de entrada vazia.</span>';
  return `<div class="rf-mails">${box.slice(0,20).map(e=>`
    <div class="rf-mail ${e.read?'':'novo'} ${CL.inboxOpen===e.key?'aberto':''}"
         onclick="clInboxOpen('${escC(e.key)}')">
      <div class="rf-mail-top">
        <span class="rf-mail-a">${e.read?'':'● '}${escC(e.subject||'')}</span>
        <span class="rf-mail-q">${escC(rfQuandoHTML(e))}</span>
      </div>
      <span class="rf-mail-p">${escC(String(e.preview||e.from||'').slice(0,72))}</span>
    </div>`).join('')}</div>`;
}
function rfLeituraHTML(){
  const box=rfInbox();
  const e=CL.inboxOpen? box.find(x=>x.key===CL.inboxOpen) : box[0];
  if(!e) return '<div class="rf-empty">Escolha um e-mail na lista ao lado.</div>';
  return `<div class="rf-mail-hd">
      <span class="rf-mail-subj">${(typeof inboxIcon==='function'?inboxIcon(e.kind):'')} ${escC(e.subject||'')}</span>
      <span class="rf-label-r">${escC(rfQuandoHTML(e))}</span>
    </div>
    <div class="rf-mail-body">${e.body||''}</div>
    <div class="rf-acts">
      <button type="button" class="rf-btn rf-btn-secondary"
        onclick="rfAcAbrir('mail-arquivar',{key:'${escC(e.key)}',assunto:'${escC(e.subject||'')}'})">📥 Arquivar</button>
      <button type="button" class="rf-btn rf-btn-cta"
        onclick="rfAcAbrir('mail-responder',{key:'${escC(e.key)}',assunto:'${escC(e.subject||'')}'})">↩ Responder</button>
    </div>`;
}
/* OPÇÕES: cada linha é rótulo + explicação + controle, como na referência */
function rfOpcaoHTML(titulo, explica, controle){
  return `<div class="rf-opt">
    <div class="rf-opt-id"><span class="rf-opt-t">${escC(titulo)}</span>
      <span class="rf-opt-s">${escC(explica)}</span></div>
    ${controle}
  </div>`;
}
function rfOpcoesHTML(){
  const tempo=(typeof tempoLabelAtual==='function')?tempoLabelAtual():'—';
  const moeda=(typeof curSym==='function')?curSym():'R$';
  return rfOpcaoHTML('Tempo de jogo','Velocidade da rodada ao vivo — o Camarote trava no Usain Bolt',
      `<button type="button" class="rf-opt-c" onclick="clOptions()">${escC(tempo)}</button>`)
    + rfOpcaoHTML('Moeda','Símbolo usado em todo valor da tela',
      `<button type="button" class="rf-opt-c" onclick="clOptions()">${escC(moeda)}</button>`)
    + rfOpcaoHTML('Modo','Solo joga contra a máquina; Resenha é a liga com a turma',
      `<button type="button" class="rf-opt-c" onclick="clOptions()">${CL.online?'Resenha':'Solo'}</button>`);
}
function rfJogoHTML(){
  const acoes=[
    `<button type="button" class="rf-acao primaria" onclick="clSaveMenu()">${rfIcone('gravar',16)} Gravar jogo</button>`,
    CL.online?`<button type="button" class="rf-acao" onclick="clInviteResenha()">${rfIcone('chat',16)} Chamar pra Resenha</button>`:'',
    `<button type="button" class="rf-acao" onclick="clOptions()">${rfIcone('config',16)} Opções</button>`,
    `<button type="button" class="rf-acao perigo" onclick="clExit()">↩ Sair para o menu</button>`,
  ].filter(Boolean).join('');
  return `<div class="rf-acoes">${acoes}</div>
    <span class="rf-note">O jogo grava sozinho a cada rodada. "Gravar jogo" força a gravação agora e mostra os saves guardados.</span>`;
}
/* Clube & Sistema inverte as colunas (a lista de e-mails é a de 340). O
   bloco de LEITURA não tem aba: ele é o corpo do e-mail selecionado na
   lista ao lado — abrir "leitura" sozinho não mostraria nada de novo. */
const RF_BL_CLUBE=[
  { k:'email',   t:'E-mail', col:1, corpo:()=>rfListaEmailsHTML(),
    dir:()=>{ const n=rfNaoLidas(); return n?n+' novos':'tudo lido'; } },
  { k:'leitura', t:'', col:2, corpo:()=>rfLeituraHTML(), semAba:true },
  { k:'opcoes',  t:'Opções', col:2, corpo:()=>rfOpcoesHTML() },
  { k:'jogo',    t:'Jogo',   col:2, corpo:()=>rfJogoHTML() },
  { k:'resenha', t:'Modo Resenha', col:2, corpo:()=>rfResenhaHTML(), so:()=>!!CL.online },
];
function rfClubeSistemaHTML(so){
  const blocos=RF_BL_CLUBE.filter(b=>!b.so || b.so());
  return rfBlocos(null, blocos, so);
}


/* ---- HISTORIAL DO CLUBE ----
   Sobrou da página Equipa, que saiu da sidebar: elenco e formação já cobrem
   o time, estádio mora em Finanças, e a identidade do clube já está na faixa
   do topo do Hub. O historial é o único dado que não tinha outro lugar, e
   agora vive em Campeonatos.
   ===================================================================== */
function rfHistorialHTML(){
  const ent=(S.history||[]).filter(h=>h.clubId===CL.clubId).slice().reverse();
  if(!ent.length) return '<span class="rf-note">Mostra só as temporadas em que você comandou este clube neste save. Ainda não há nenhuma fechada.</span>';
  return `<div class="rf-th-head"><span>ANO</span><span>COMPETIÇÃO</span><span>DIVISÃO</span><span>POS</span><span>CAMPEÃO</span></div>
    <div class="rf-th-list">${ent.map(h=>`<div class="rf-th-row">
      <span class="rf-th-a">${escC(String(h.season))}</span>
      <span class="rf-th-c">${escC(classifDivName(h.division||'A', h.country))}</span>
      <span class="rf-th-d">${escC(divisionLabelOf(h.division||'A'))}</span>
      <span class="rf-th-p">${h.pos||'—'}</span>
      <span class="rf-th-t">${escC(h.champ||'—')}</span>
    </div>`).join('')}</div>`;
}


/* ---- Mercado ▸ Contrapropostas e Últimas transferências ----
   Os dois últimos destinos do Mercado que ainda passavam pela captura.
   Mesma anatomia do resto da página: card na coluna larga, o trilho de 340
   à direita continua igual. */
function rfContrapropostasHTML(){
  const lista=(typeof myCounterOffers==='function')?myCounterOffers():[];
  const corpo = lista.length
    ? lista.map(o=>`<div class="rf-prop">
        <div class="rf-prop-top">
          <span class="rf-prop-n">${escC(o.playerName||'')}</span>
          <span class="rf-prop-fee">${escC(mvShort(o.fee||0))}</span>
        </div>
        <span class="rf-prop-sub">${escC(o.buyerName||o.sellerName||'')}${o.state?' · '+escC(o.state):''}</span>
        ${o.lastMsg?`<span class="rf-prop-msg">${rfIcone('chat',16)} ${escC(o.lastMsg)}</span>`:''}
      </div>`).join('')
    : '<span class="rf-note">Nenhuma contraproposta aberta agora.</span>';
  return rfCol(rfCard('Contrapropostas', corpo, {right:lista.length?lista.length+' aberta(s)':''}));
}
function rfTransferenciasHTML(){
  const nomeDe=id=>{ if(!id) return 'fora do mundo';
    const c=clubOf(id)||(typeof bgClubById==='function'&&bgClubById(id))||(typeof intlClubById==='function'&&intlClubById(id));
    return (c&&c.short)||String(id); };
  const ent=[];
  squad(CL.clubId).forEach(p=>{ (p.transferHistory||[]).forEach(h=>ent.push({p,h})); });
  ent.sort((a,b)=>(b.h.season-a.h.season)||(b.h.round-a.h.round));
  const corpo = ent.length
    ? `<div class="rf-tr-head"><span>TEMP.</span><span>JOGADOR</span><span>DE → PARA</span><span>VALOR</span></div>
       <div class="rf-tr-list">${ent.slice(0,20).map(({p,h})=>`<div class="rf-tr-row">
         <span class="rf-tr-a">${escC(String(h.season))}</span>
         <span class="rf-tr-n">${escC(p.n)}</span>
         <span class="rf-tr-c">${escC(nomeDe(h.from))} → ${escC(nomeDe(h.to))}</span>
         <span class="rf-tr-v">${escC(mvShort(h.fee||0))}</span>
       </div>`).join('')}</div>`
    : `<span class="rf-note">Nenhuma transferência registrada. O histórico viaja com o jogador: aparecem aqui os movimentos de quem está no seu elenco.</span>`;
  return rfCol(rfCard('Últimas transferências', corpo, {right:ent.length?ent.length+' registros':''}));
}

/* =====================================================================
   MODAIS DE OFERTA — portados de telas/Modal - Convite para Jantar e
   telas/Modal - Jantar e Proposta.

   São POPUP legítimo pela regra do design system: acontecem sozinhos no
   meio do save, o treinador não foi procurar.

   Os dois têm a mesma anatomia — cabeçalho azul com o escudo do clube que
   sondou, vídeo à esquerda e ficha à direita, e uma barra de ação com a
   recusa em branco e o aceite em amarelo. Muda a largura (860 / 940), a
   coluna da direita (300 / 320) e o conteúdo da ficha.
   ===================================================================== */
function rfVideoHTML(titulo, dur){
  return `<div class="rf-video">
    <span class="rf-video-play">▶</span>
    <span class="rf-video-t">${escC(titulo)}</span>
    <span class="rf-video-s">Espaço reservado · 16:9</span>
    <span class="rf-video-d">${escC(dur||'0:18')}</span>
  </div>`;
}
function rfFichaLinha(l,v){
  return `<div class="rf-of-linha"><span class="rf-of-l">${escC(l)}</span>
    <span class="rf-of-v">${escC(String(v))}</span></div>`;
}
/* ---- 1 · CONVITE PARA JANTAR ---- */
function rfModalConviteHTML(o){
  const c=(typeof jobOfferClub==='function')?jobOfferClub(o):{short:'—'};
  const me=clubOf(CL.clubId)||{short:'—'};
  const js=Math.round((S.jobSecurity!=null?S.jobSecurity:50));
  const dir=js>=66?'direção tranquila':js>=34?'direção neutra':'direção impaciente';
  return `<div class="rf-of rf-of-convite">
    <div class="rf-of-hd">
      <div class="rf-band-filete"></div>
      <span class="rf-of-glyph">🍽️</span>
      <div class="rf-of-ttl">
        <span class="rf-of-t">Um convite para jantar.</span>
        <span class="rf-of-sub">O empresário ligou — querem conversar com você.</span>
      </div>
      <div class="rf-sp"></div>
      <span class="rf-of-clube">${rfCrest(c,22)}<span>${escC(c.short)}</span></span>
      <button type="button" class="rf-dlg-x" onclick="clCloseOverlay()" aria-label="Fechar">✖</button>
    </div>
    <div class="rf-of-body">
      <div class="rf-of-esq">
        ${rfVideoHTML('Convite para o jantar','0:18')}
        <p class="rf-of-p">O presidente do <b>${escC(c.short)}</b> (${escC((typeof jobOfferDivLabel==='function'?jobOfferDivLabel(o):''))}) pediu para falar com você pessoalmente. Ele acompanha o seu trabalho no ${escC(me.short)} e quer conversar num jantar, sem compromisso.</p>
        <p class="rf-of-p2">Aceitar o jantar não é aceitar emprego nenhum — é só ouvir o que eles têm a dizer.</p>
      </div>
      <div class="rf-of-dir">
        <div class="rf-card">
          <span class="rf-label-t">A vaga</span>
          ${rfFichaLinha('Clube', c.short)}
          ${rfFichaLinha('Divisão', (typeof jobOfferDivLabel==='function'?jobOfferDivLabel(o):'—'))}
          ${rfFichaLinha('Situação', 'vaga aberta')}
          ${rfFichaLinha('Seu clube hoje', me.short)}
        </div>
        <div class="rf-card rf-card-quiet">
          <span class="rf-label-t">Sua segurança no ${escC(me.short)}</span>
          <div class="rf-of-js">
            <span class="rf-of-jsn">${js}</span>
            <span class="rf-of-jsd">${escC(dir)}</span>
          </div>
          <div class="rf-fb"><i style="width:${js}%;background:var(--club-secondary)"></i></div>
        </div>
      </div>
    </div>
    <div class="rf-of-foot">
      <span class="rf-of-nota">Recusar encerra a conversa. O ${escC(me.short)} continua com você.</span>
      <div class="rf-sp"></div>
      <button type="button" class="rf-wiz-b2" onclick="clJobInviteDecline()">Recusar o convite</button>
      <button type="button" class="rf-wiz-cta" onclick="showJobProposal()">🍽️ Aceitar o jantar</button>
    </div>
  </div>`;
}
/* ---- 2 · JANTAR E PROPOSTA ---- */
function rfModalPropostaHTML(o){
  const c=(typeof jobOfferClub==='function')?jobOfferClub(o):{short:'—'};
  const me=clubOf(CL.clubId)||{short:'—'};
  return `<div class="rf-of rf-of-proposta">
    <div class="rf-of-hd">
      <div class="rf-band-filete"></div>
      <span class="rf-of-glyph">✍️</span>
      <div class="rf-of-ttl">
        <span class="rf-of-t">O jantar e a proposta.</span>
        <span class="rf-of-sub">Eles puseram os termos na mesa.</span>
      </div>
      <div class="rf-sp"></div>
      <span class="rf-of-clube">${rfCrest(c,22)}<span>${escC(c.short)}</span></span>
      <button type="button" class="rf-dlg-x" onclick="clCloseOverlay()" aria-label="Fechar">✖</button>
    </div>
    <div class="rf-of-body">
      <div class="rf-of-esq">
        ${rfVideoHTML('A assinatura','0:24')}
        <div class="rf-card rf-card-quiet">
          <span class="rf-label-t">💬 O presidente do ${escC(c.short)}</span>
          <p class="rf-of-p">Treinador, a gente viu o que você fez no ${escC(me.short)}. Aqui o projeto é sério: elenco pronto, torcida do lado e paciência pra construir. Vem com a gente.</p>
        </div>
      </div>
      <div class="rf-of-dir">
        <div class="rf-card">
          <span class="rf-label-t">Os termos</span>
          ${rfFichaLinha('Salário', o&&o.salary?fmt(o.salary):'—')}
          ${rfFichaLinha('Prêmio por título', o&&o.bonus?fmt(o.bonus):'—')}
          ${rfFichaLinha('Caixa do clube', (S.budgets&&S.budgets[o&&o.clubId])?fmt(S.budgets[o.clubId]):'—')}
          ${rfFichaLinha('Divisão', (typeof jobOfferDivLabel==='function'?jobOfferDivLabel(o):'—'))}
        </div>
        <div class="rf-card rf-card-quiet">
          <span class="rf-label-t">🎯 Objetivo principal</span>
          <p class="rf-of-p">${escC((typeof jobOfferObjective==='function'?jobOfferObjective(o):'—'))}</p>
        </div>
      </div>
    </div>
    <div class="rf-of-foot">
      <span class="rf-of-nota">Aceitar encerra o seu contrato com o ${escC(me.short)} na hora.</span>
      <div class="rf-sp"></div>
      <button type="button" class="rf-wiz-b2" onclick="clJobProposalDecline()">Agradecer e ficar</button>
      <button type="button" class="rf-wiz-cta" onclick="clJobProposalAccept()">✍️ Assinar com o ${escC(c.short)}</button>
    </div>
  </div>`;
}
