/* =====================================================================
   RetroFoot98 — CAMPEONATOS, as cinco abas completas
   Marcação de telas-v3/Campeonatos - Abas.dc.html, coluna por coluna.

   Minhas competições · Calendário · Artilharia · História · Ligas
   internacionais.

   As cinco abas empilham cartões de LARGURA CHEIA — nenhuma usa a grade de
   duas colunas da página. Onde o pacote põe duas peças lado a lado (os dois
   cards de competição, os dois blocos de artilharia, as duas copas
   continentais), a grade é INTERNA ao cartão, não da página.

   A linha de tabela é a mesma peça do Elenco (.rf-el-head/.rf-el-row, com a
   grade vindo de --el-cols): mesma altura, mesmo raio, mesmo realce. Ter
   duas tabelas diferentes no mesmo produto era o que fazia navegar parecer
   trocar de site.

   TROFÉU É ARTE REAL nos cards de competição (rfTrofeuHTML), nunca escudo
   nem emoji — a mesma regra da leva 4.
   ===================================================================== */

/* clube com escudo de 20px, do jeito que o pacote desenha em três tabelas */
function rfCpClube(id){
  const c=anyClubOf(id)||{short:'—'};
  /* `title` para o telefone: lá o nome fica escondido e só o escudo aparece,
     então o nome tem de chegar por outro caminho — passar o rato ou tocar e
     segurar mostra a dica do navegador. */
  const nome=c.short||c.name||'—';
  /* CLICAR NO ESCUDO ABRE O ELENCO DO CLUBE. `stopPropagation` porque a linha
     costuma ter a sua própria ação (abrir a ficha, propor); o clube é um
     desvio, não a ação da linha. */
  const acao = (id===CL.clubId) ? 'clGoSquad()' : `clViewTeam('${escC(String(id))}')`;
  return `<span class="rf-cp-clube rf-clicavel" title="Ver o elenco do ${escC(nome)}"
    onclick="event.stopPropagation();${acao}">${rfCrest(c,20)}<span>${escC(nome)}</span></span>`;
}
/* selo de resultado: V verde, E amarelo, D vermelho, jogo por vir em cinza */
function rfCpResultado(r){
  return `<span class="rf-cp-res ${r?('r'+r):'vazio'}">${escC(r||'')}</span>`;
}

/* =====================================================================
   1 · MINHAS COMPETIÇÕES
   Dois cards lado a lado (troféu + identidade + rodapé com selo e Abrir),
   e embaixo a lista das competições que o clube não disputa.
   ===================================================================== */
/* ESTAR FORA NÃO É TER SIDO ELIMINADO.
   "Minhas competições" listava TODA copa que existe no save e carimbava
   ELIMINADO em qualquer uma onde o clube não estivesse vivo. Mas
   `cupCompetitionTeamAlive` devolve falso nos dois casos — quem caiu e quem
   nunca entrou — e o cartão dizia "eliminado · fase de grupos, rodada 1/6" de
   uma copa em que o clube nem foi sorteado. Ao mesmo tempo o bloco de baixo
   garantia "você está em todas as competições deste save", porque só olhava as
   copas que não existem de todo.

   `S.qualification[k]` é a lista de inscritos de cada copa — a resposta exata a
   "eu entrei nesta?". Quem não está nela vai para o bloco de baixo, onde
   sempre pertenceu; ELIMINADO fica reservado a quem entrou e caiu.

   A lista de inscritos vem antes da busca nos grupos de propósito: na Copa do
   Brasil o clube pode ter recebido bye na primeira fase e não aparecer em
   confronto nenhum, apesar de estar dentro. */
function rfCpInscrito(k, c){
  const q=(S.qualification&&S.qualification[k]);
  if(Array.isArray(q)) return q.indexOf(CL.clubId)>=0;
  if(c&&c.group&&c.group.groups
     && Object.values(c.group.groups).some(g=>(g.teams||[]).indexOf(CL.clubId)>=0)) return true;
  if(c&&c.bracket&&(c.bracket.ties||[]).some(t=>t.h===CL.clubId||t.a===CL.clubId)) return true;
  if(c&&(c.ties||[]).some(t=>t.h===CL.clubId||t.a===CL.clubId)) return true;
  return false;
}
function rfCpCards(){
  const cards=[];
  const pos=rfMinhaPosicao(), total=Object.keys(S.table||{}).length;
  const t=(S.table&&S.table[CL.clubId])||{Pts:0,P:0};
  cards.push({ chave:S.division, trofeu:'serie'+(S.division||'D'),
    nome:classifDivName(S.division),
    linha1: pos? (pos+'º de '+total) : 'a começar',
    linha2: (t.Pts||0)+' pontos em '+(t.P||0)+' jogos',
    selo: rfCpSeloDivisao(pos,total), tom:rfCpTomDivisao(rfCpSeloDivisao(pos,total)),
    acao:"rfSetTab('campeonatos','calendario')" });
  ((typeof allCupKeys==='function')?allCupKeys():[]).forEach(k=>{
    if(S.compToggle && S.compToggle[k]===false) return;
    const c=S.cups&&S.cups[k]; if(!c) return;
    if(!rfCpInscrito(k,c)) return;     // não entrou: o lugar dela é no bloco de baixo
    const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    const vivo=(typeof cupCompetitionTeamAlive==='function')&&cupCompetitionTeamAlive(c,CL.clubId);
    const campeao=(typeof cupCompetitionChampion==='function')?cupCompetitionChampion(c):null;
    cards.push({ chave:k, trofeu:k, nome:def.name||k,
      linha1:(typeof cupCompetitionRoundLabel==='function'&&cupCompetitionRoundLabel(c,k))||'—',
      linha2: campeao===CL.clubId ? 'campeão' : (vivo?'na disputa':'fora da competição'),
      selo: campeao===CL.clubId?'CAMPEÃO':(vivo?'NA DISPUTA':'ELIMINADO'),
      tom: campeao===CL.clubId?'ouro':(vivo?'verde':'cinza'),
      acao:`clCupView('${k}')` });
  });
  return cards;
}
/* ===== O 1o LUGAR NAO E "MEIO DE TABELA" =====
   A conta so conhecia duas zonas: acesso e queda. Na 1a Divisao nao ha divisao acima, entao
   DIVISION_PROMO.A e 0 e o primeiro ramo NUNCA dispara -- o lider da Serie A caia no `return`
   final e a etiqueta dizia "meio de tabela" a quem estava em primeiro. E o mesmo tipo de furo
   do ultimo lugar na Serie D (releg=0), corrigido antes em rfDesfecho.
   A liderança e um facto por si, independente de haver divisao acima; e na 1a Divisao as vagas
   continentais tambem sao zona, e sao o que aquela tabela de facto disputa. */
function rfCpSeloDivisao(pos,total){
  if(!pos) return '';
  const promo=(typeof DIVISION_PROMO!=='undefined'&&DIVISION_PROMO[S.division])||0;
  const releg=(typeof DIVISION_RELEG!=='undefined'&&DIVISION_RELEG[S.division])||0;
  if(pos===1) return (S&&S.finished)?'CAMPEÃO':'LÍDER';
  if(promo&&pos<=promo) return 'ZONA DE ACESSO';
  if(releg&&pos>total-releg) return 'ZONA DE QUEDA';
  const z=(typeof qualificationZone==='function')?qualificationZone(S.division,pos):null;
  if(z==='lib') return 'ZONA DE LIBERTADORES';
  if(z==='sul') return 'ZONA DE SUL-AMERICANA';
  return 'MEIO DE TABELA';
}
/* o tom do selo acompanha o que ele diz — antes era sempre 'ouro', mesmo a anunciar queda */
function rfCpTomDivisao(selo){
  if(selo==='CAMPEÃO'||selo==='LÍDER') return 'ouro';
  if(selo==='ZONA DE ACESSO'||selo==='ZONA DE LIBERTADORES') return 'verde';
  if(selo==='ZONA DE QUEDA') return 'vermelho';
  return 'cinza';
}
function rfCpMinhasHTML(){
  const selMin=rfCpCompFiltro();
  const cards=rfCpCards().filter(c=>selMin==='todas'||String(c.chave)===String(selMin));
  const fora=((typeof allCupKeys==='function')?allCupKeys():[]).filter(k=>{
    if(S.compToggle && S.compToggle[k]===false) return true;
    const c=S.cups&&S.cups[k];
    if(!c) return true;               // nem existe neste save
    return !rfCpInscrito(k,c);        // existe, mas o clube não foi sorteado nela
  });
  /* CADA CARTAO NA COR DA SUA COMPETICAO (ver rfCompInfo): a mesma tinta que a
     rodada ao vivo, o Camarote e o palco de fim de fase usam. E o que faz a
     grade dizer "Libertadores" antes de o utilizador ler o nome. */
  const grade=`<div class="rf-cp-cards">${cards.map(c=>`
    <div class="rf-card rf-cp-card rf-tema" data-tema="${escC(rfCompTemaDe(c.chave))}">
      <div class="rf-cp-card-hd">
        ${rfCompTrofeuHTML(rfCompInfo(c.chave),56)}
        <div class="rf-cp-card-id">
          <span class="rf-cp-card-n">${escC(c.nome)}</span>
          <span class="rf-cp-card-1">${escC(c.linha1)}</span>
          <span class="rf-cp-card-2">${escC(c.linha2)}</span>
        </div>
      </div>
      <div class="rf-cp-card-ft">
        ${c.selo?`<span class="rf-cp-selo ${c.tom||''}">${escC(c.selo)}</span>`:''}
        <div class="rf-sp"></div>
        <button type="button" class="rf-btn rf-btn-secondary" onclick="${c.acao}">Abrir</button>
      </div>
    </div>`).join('')}</div>`;
  const lista = fora.length
    ? fora.map(k=>{
        const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
        const desligada=S.compToggle&&S.compToggle[k]===false;
        const existe=!!(S.cups&&S.cups[k]);
        // três motivos diferentes para não disputar, e cada um diz o seu
        const motivo = desligada ? 'desligada neste save'
          : existe ? 'em disputa, sem o seu clube — a vaga vem da classificação'
          : (def.vaga||'ainda não sorteada');
        return `<div class="rf-cp-fora">
          ${rfTrofeuHTML(k,34)}
          <span class="rf-cp-fora-n">${escC(def.name||k)}</span>
          <span class="rf-cp-fora-v">${escC(motivo)}</span>
        </div>`; }).join('')
    : '<span class="rf-note">Você está em todas as competições deste save.</span>';
  return `${grade}
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">COMPETIÇÕES QUE VOCÊ NÃO DISPUTA</span>
        <span class="rf-label-r">${escC(String(S.season||''))}</span></div>
      ${lista}
    </div>`;
}

/* =====================================================================
   2 · CALENDÁRIO — a liga num cartão, cada copa no seu
   Grade da liga: 44 / 22 / adversário / 62 / 62 / 30
   ===================================================================== */
/* DIA DO JOGO no calendário: a coluna DATA entra entre a jornada e o escudo.
   O motor não guarda data por jornada — ele deriva do dia do calendário
   (7 dias por rodada, ver shortMatchDate), então a conta é a mesma aqui. */
const RF_CP_CAL_COLS='46px 54px 22px minmax(0,1.4fr) minmax(62px,.5fr) minmax(62px,.5fr) 34px';
/* delega na fonte unica (dataCurtaDaJornada, engine/core.js). `copa` deixou de
   ser um booleano: e a CHAVE da competicao ('copaBrasil', 'libertadores', ...),
   porque cada uma tem o seu dia dentro da semana — antes as tres caiam no mesmo
   dia sempre que partilhavam a jornada, e isso acontece 11 vezes por temporada. */
function rfCpDataDaJornada(i, copa){
  return (typeof dataCurtaDaJornada==='function') ? dataCurtaDaJornada(i, copa||'liga') : '';
}
/* ===== O CALENDARIO E DE TODAS AS COMPETICOES, E O CHIP ESCOLHE QUAL =====
   As copas ja apareciam — mas empilhadas em cartoes por baixo do da liga, de forma que era
   preciso rolar a pagina inteira para achar o jogo da Libertadores. Agora o mesmo chip com
   trofeu que ja identificava a Serie A vira FILTRO: uma fila com todas as competicoes em que o
   clube esta inscrito, mais "Todas". */
function rfCpCompFiltro(){
  const st=(typeof rfState==='function')?rfState():null;
  if(!st) return 'todas';
  return st.calComp||'todas';
}
function rfCpCompIr(k){ const st=rfState(); st.calComp=k; cdraw(); }
function rfCpCalCompeticoes(){
  const out=[{k:S.division, tag:rfCompTagHTML(S.division)}];
  ((typeof allCupKeys==='function')?allCupKeys():[]).forEach(k=>{
    const c=S.cups&&S.cups[k]; if(!c) return;
    if(typeof rfCpInscrito==='function' && !rfCpInscrito(k,c)) return;
    out.push({k, tag:rfCompTagHTML(k)});
  });
  return out;
}
function rfCpCompChipsHTML(){
  const comps=rfCpCalCompeticoes();
  if(comps.length<2) return '';           // so a liga: o chip do cartao ja diz tudo
  const sel=rfCpCompFiltro();
  const chip=(k,dentro,on)=>`<button type="button" class="rf-cp-calchip ${on?'on':''}"
    onclick="rfCpCompIr('${escC(String(k))}')">${dentro}</button>`;
  return `<div class="rf-cp-calchips" role="group" aria-label="Filtrar por competição">
    ${chip('todas','<span class="rf-comp-tag-n">Todas</span>', sel==='todas')}
    ${comps.map(c=>chip(c.k, c.tag, String(sel)===String(c.k))).join('')}
  </div>`;
}
function rfCpCalendarioHTML(){
  const sel=rfCpCompFiltro();
  const mostraLiga = (sel==='todas' || String(sel)===String(S.division));
  const sched=S.sched||[];
  // o calendário do motor é [[casaId, foraId], …] por jornada, e o placar mora
  // em S.results com gh/ga (não hg/ag — essa é a pegadinha do lado da liga)
  const jogos=sched.map((j,i)=>{
    const p=(j||[]).find(m=>m[0]===CL.clubId||m[1]===CL.clubId);
    if(!p) return '';
    const casa=p[0]===CL.clubId, outro=anyClubOf(casa?p[1]:p[0])||{short:'—'};
    const res=(S.results||[]).find(r=>r.round===i && r.h===p[0] && r.a===p[1]);
    const feito=!!res;
    const gm=feito?(casa?res.hg:res.ag):null, gc=feito?(casa?res.ag:res.hg):null;
    const letra=feito?(gm>gc?'V':gm===gc?'E':'D'):'';
    const proximo=!feito && (i===(S.round||0));
    return `<div class="rf-el-row ${proximo?'sel':''} ${feito?'':'porvir'}">
      <span class="rf-cp-jor">${i+1}ª</span>
      <span class="rf-cp-data">${escC(rfCpDataDaJornada(i))}</span>
      ${rfCrest(outro,20)}
      <span class="rf-el-nome">${escC(outro.short||outro.name||'—')}</span>
      <span class="rf-cp-local">${casa?'casa':'fora'}</span>
      <span class="rf-cp-placar">${feito?(gm+'–'+gc):'—'}</span>
      ${rfCpResultado(letra)}
    </div>`;
  }).filter(Boolean);
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_CP_CAL_COLS}">
    <span>JORNADA</span><span>DATA</span><span></span><span>ADVERSÁRIO</span><span>LOCAL</span>
    <span class="dir">PLACAR</span><span></span>
  </div>`;
  const grupo=(typeof myGroupLabel==='function')?myGroupLabel():'';
  const cartaoLiga = mostraLiga ? `<div class="rf-card rf-el-tbl" style="--el-cols:${RF_CP_CAL_COLS}">
      <div class="rf-label">
        <span class="rf-label-t">${rfCompTagHTML(S.division)}${grupo?' <i class="rf-cp-grupo">'+escC(grupo)+'</i>':''}</span>
        <span class="rf-label-r">${(S.round||0)} de ${sched.length||14} jornadas</span></div>
      ${cab}
      ${rfLista('cal-liga', jogos, 'O calendário ainda não foi sorteado.')}
    </div>` : '';
  const copas=rfCpCopasCalendarioHTML(sel==='todas'?null:sel);
  return cartaoLiga + copas
    + ((!cartaoLiga && !copas) ? '<div class="rf-empty">Nada marcado nesta competição ainda.</div>' : '');
}
/* uma copa por cartão: FASE no lugar de JORNADA, e a DATA ao lado, igual à liga */
const RF_CP_COPA_COLS='124px 54px 22px minmax(0,1.4fr) minmax(62px,.5fr) minmax(70px,.5fr) 34px';
/* ===== A COPA NÃO TINHA DATA =====
   Este cartão remontava o calendário à mão, lendo `c.bracket.ties` e `mg.groups[].sched`.
   Nesses dois lugares está QUEM joga contra quem — não EM QUE SEMANA. Sem a semana não há
   como calcular o dia (cada competição tem o seu dentro dela: a Sul-Americana joga na quinta,
   a Libertadores na quarta, a Copa do Brasil na terça), então a coluna de data simplesmente
   não existia aqui: a liga mostrava "sáb 14/mar" e a copa, nada.
   O motor já responde isso e é ele quem manda no calendário: userCupPlayedRows() e
   userCupCalendarRows() devolvem cada jogo do clube com a JORNADA (`w`) — as mesmas linhas que
   o Calendário antigo sempre usou. Daí a data sai de dataCurtaDaJornada(w, chave), a mesma
   função da liga. De quebra vêm juntos a fase certa, os pênaltis do mata-mata e o confronto
   ainda "a definir", que a leitura à mão também deixava de fora. */
function rfCpCopasCalendarioHTML(so){
  const jogados=(typeof userCupPlayedRows==='function')?userCupPlayedRows():[];
  const porvir=(typeof userCupCalendarRows==='function')?userCupCalendarRows():[];
  const todas=jogados.concat(porvir);
  const out=[];
  ((typeof allCupKeys==='function')?allCupKeys():[]).forEach(k=>{
    if(so && String(so)!==String(k)) return;   // filtro do chip
    const c=S.cups&&S.cups[k]; if(!c) return;
    // copa que o clube não disputa não tem calendário nenhum a mostrar aqui
    if(typeof rfCpInscrito==='function' && !rfCpInscrito(k,c)) return;
    const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    const linhas=todas.filter(r=>r.key===k)
      .sort((a,b)=>(a.w||0)-(b.w||0) || (a.played?0:1)-(b.played?0:1))
      .map(r=>{
        const feito=!!r.played;
        const letra=!feito?'':(r.venceu===true?'V':r.venceu===false?'D':r.myG>r.oppG?'V':r.myG<r.oppG?'D':'E');
        const outro=r.opp?(anyClubOf(r.opp)||{short:'—'}):null;
        const data=rfCpDataDaJornada(r.w, k);
        const pens=r.pens?` <i class="rf-cp-pens">(pên. ${escC(r.pens)})</i>`:'';
        return `<div class="rf-el-row ${feito?'':'porvir'}">
          <span class="rf-cp-jor" title="${escC(r.phase||'')}">${escC(r.phase||'—')}</span>
          <span class="rf-cp-data">${escC(data)}</span>
          ${outro?rfCrest(outro,20):'<span class="rf-cp-semescudo"></span>'}
          <span class="rf-el-nome">${outro?escC(outro.short||outro.name||'—'):'<i>adversário a definir</i>'}</span>
          <span class="rf-cp-local">${r.home==null?'—':(r.home?'casa':'fora')}</span>
          <span class="rf-cp-placar">${feito?(r.myG+'–'+r.oppG+pens):'—'}</span>
          ${rfCpResultado(letra)}
        </div>`;
      });
    /* cabeçalho de tabela em cima de tabela vazia é ruído: com três copas
       empilhadas eram três cabeçalhos a anunciar nada. Só entra se houver linha. */
    const cabCopa=linhas.length?`<div class="rf-el-head" style="--el-cols:${RF_CP_COPA_COLS}">
        <span>FASE</span><span>DATA</span><span></span><span>ADVERSÁRIO</span><span>LOCAL</span>
        <span class="dir">PLACAR</span><span></span>
      </div>`:'';
    out.push(`<div class="rf-card rf-el-tbl" style="--el-cols:${RF_CP_COPA_COLS}">
      <div class="rf-label"><span class="rf-label-t">${(typeof rfCompTagHTML==='function')?rfCompTagHTML(k):escC(def.name||k)}</span>
        ${linhas.length?`<span class="rf-label-r">${linhas.length} jogo${linhas.length>1?'s':''}</span>`:''}</div>
      ${cabCopa}
      ${linhas.join('') || '<div class="rf-empty">O sorteio desta fase ainda não saiu.</div>'}
    </div>`);
  });
  return out.join('');
}

/* =====================================================================
   3 · ARTILHARIA
   Grade: 26 / jogador / clube / 28 / 40 / 56
   ===================================================================== */
const RF_CP_ART_COLS='30px minmax(0,1.2fr) minmax(0,1fr) 34px 44px minmax(56px,.5fr)';
function rfCpArtilhariaHTML(){
  const jogos=Math.max(1,(S.round||0));
  /* ===== A ARTILHARIA SEGUE O CHIP DA PAGINA =====
     Era sempre o pote unico (S.scorers), que mistura gol de liga com gol de copa. Com uma
     competicao escolhida, a lista passa a ser a DELA — o mapa por competicao existe desde que
     cada gol passou a ser carimbado onde caiu (ver recordScorers no core). Save antigo nao tem o
     mapa: nesse caso o cartao diz isso, em vez de mostrar uma lista vazia sem explicacao. */
  const selArt=rfCpCompFiltro();
  const fonte=(selArt==='todas')
    ? (S.scorers||{})
    : ((S.scorersByComp&&S.scorersByComp[selArt])||null);
  if(fonte===null){
    return `<div class="rf-card"><div class="rf-label"><span class="rf-label-t">${rfCompTagHTML(selArt)}</span></div>
      <span class="rf-note">Ainda não há gol registrado nesta competição nesta temporada.</span></div>`;
  }
  const arr=Object.entries(fonte).map(([n,g])=>({n,g})).sort((a,b)=>b.g-a.g).slice(0,20);
  const meu=squad(CL.clubId);
  const meuNome=new Set(meu.map(p=>p.n));
  const posDe=n=>{ const p=meu.find(x=>x.n===n); return p?rfPosInicial(p.s):'—'; };
  const linhas=arr.map((s,i)=>{
    const cid=(typeof findPlayerClub==='function')?findPlayerClub(s.n):null;
    /* `sel` estava fixo em TODAS as linhas: a lista inteira de artilheiros
       aparecia destacada, o que é o mesmo que nenhuma estar. */
    return `<div class="rf-el-row">
      <span class="rf-cp-rank">${i+1}</span>
      <span class="rf-cp-art-n rf-clicavel" title="Ver a ficha de ${escC(s.n)}"
        onclick="rfMdVerJogador('${escC(s.n)}')">${escC(s.n)}</span>
      ${cid?rfCpClube(cid):'<span class="rf-cp-clube">—</span>'}
      <span class="rf-el-c">${escC(posDe(s.n))}</span>
      <span class="rf-cp-gols">${s.g}</span>
      <span class="rf-el-d">${(s.g/jogos).toFixed(2).replace('.',',')}</span>
    </div>`;
  });
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_CP_ART_COLS}">
    <span></span><span>JOGADOR</span><span>CLUBE</span><span>POS</span>
    <span class="dir">GOLS</span><span class="dir">G/JOGO</span>
  </div>`;
  const meusGols=Object.entries(S.scorers||{}).filter(([n])=>meuNome.has(n)).sort((a,b)=>b[1]-a[1]);
  /* DEFESAS MENOS VAZADAS sai da tabela (GA), o mesmo dado da classificação —
     o motor não tem estatística de goleiro à parte. */
  const defesas=(typeof sortedTable==='function'?sortedTable():[]).slice()
    .sort((a,b)=>(a.GA||0)-(b.GA||0)).slice(0,5);
  const marcadores = meusGols.length
    ? meusGols.map(([n,g])=>`<div class="rf-cp-mini m3">
        <span class="rf-cp-mini-n">${escC(n)}</span>
        <span class="rf-el-c">${escC(posDe(n))}</span>
        <span class="rf-cp-mini-v">${g}</span></div>`).join('')
    : '<span class="rf-note">Ninguém do seu elenco marcou ainda.</span>';
  const vazadas = defesas.length
    ? defesas.map(t=>{ const c=anyClubOf(t.id)||{short:t.id};
        return `<div class="rf-cp-mini m3c ${t.id===CL.clubId?'meu':''}">
          ${rfCrest(c,20)}
          <span class="rf-cp-mini-n">${escC(c.short||c.name||'—')}</span>
          <span class="rf-cp-mini-v">${t.GA||0}</span></div>`; }).join('')
    : '<span class="rf-note">A tabela ainda não tem jogos.</span>';
  return `<div class="rf-card rf-el-tbl" style="--el-cols:${RF_CP_ART_COLS}">
      <!-- o titulo tem de dizer QUAL artilharia: com o filtro na Copa do Brasil ele continuava
           a anunciar a da divisao, por cima de uma lista que ja era outra -->
      <div class="rf-label"><span class="rf-label-t">${selArt==='todas'
        ? 'ARTILHARIA DA TEMPORADA'
        : ('ARTILHARIA · '+escC(String(((typeof rfCompInfo==='function')?rfCompInfo(selArt).curto:selArt)).toUpperCase()))}</span>
        <!-- "todos os grupos" nao queria dizer nada numa liga de pontos corridos -->
        <span class="rf-label-r">${arr.length?(arr.length+(arr.length===1?' artilheiro':' artilheiros')):''}</span></div>
      ${cab}
      ${rfLista('artilharia', linhas, 'Sem gols marcados ainda nesta temporada.')}
    </div>
    <div class="rf-cp-duo">
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">SEUS MARCADORES</span></div>
        ${marcadores}
      </div>
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">DEFESAS MENOS VAZADAS</span></div>
        ${vazadas}
      </div>
    </div>`;
}

/* =====================================================================
   4 · HISTÓRIA
   Grade: 50 / competição / posição / desfecho / copas
   ===================================================================== */
const RF_CP_HIST_COLS='50px minmax(0,.9fr) minmax(0,.9fr) minmax(0,1.1fr) minmax(0,1.1fr)';
function rfCpHistoriaHTML(){
  const minhas=(S.history||[]).filter(h=>h.clubId===CL.clubId).slice().reverse();
  const linhas=minhas.map((h,i)=>{
    const cups=Object.entries(h.myCups||{}).map(([k,v])=>{
      const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
      return (def.short||def.name||k)+' · '+v; }).join(', ');
    return `<div class="rf-el-row ${i===0?'sel':''}">
      <span class="rf-cp-ano">${escC(String(h.season))}</span>
      <span class="rf-cp-hist-c">${escC((typeof divisionLabelOf==='function')?divisionLabelOf(h.division):('Série '+h.division))}</span>
      <span class="rf-cp-hist-v">${h.myPos?(h.myPos+'º'):'—'}</span>
      <span class="rf-cp-hist-s">${escC(rfCpDesfecho(h))}</span>
      <span class="rf-cp-hist-s">${escC(cups||'—')}</span>
    </div>`;
  }).join('');
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_CP_HIST_COLS}">
    <span>ANO</span><span>COMPETIÇÃO</span><span>POSIÇÃO</span><span>DESFECHO</span><span>COPAS</span>
  </div>`;
  const titulos=(typeof rfTitulosDoTreinador==='function')?rfTitulosDoTreinador():[];
  const estante = titulos.length
    ? titulos.map(t=>`<div class="rf-cp-mini m2">
        <span class="rf-cp-mini-n">${escC(t.label||t.text||'')}</span>
        <span class="rf-cp-mini-v">${escC(String(t.season||''))}</span></div>`).join('')
    : `<div class="rf-cp-vazio">
        <span class="rf-cp-vazio-i">🏆</span>
        <span class="rf-cp-vazio-t">Nenhum título ainda. A estante enche a partir do primeiro.</span>
      </div>`;
  return `<div class="rf-card rf-el-tbl" style="--el-cols:${RF_CP_HIST_COLS}">
      <div class="rf-label"><span class="rf-label-t">HISTÓRICO DO CLUBE</span>
        <span class="rf-label-r">${minhas.length} ${minhas.length===1?'temporada':'temporadas'}</span></div>
      ${cab}
      ${linhas || '<div class="rf-empty">Nenhuma temporada concluída neste save.</div>'}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">TÍTULOS DO CLUBE</span>
        <span class="rf-label-r">na sua gestão</span></div>
      ${estante}
    </div>`;
}
function rfCpDesfecho(h){
  const promo=(typeof DIVISION_PROMO!=='undefined'&&DIVISION_PROMO[h.division])||0;
  const releg=(typeof DIVISION_RELEG!=='undefined'&&DIVISION_RELEG[h.division])||0;
  if(!h.myPos) return '—';
  if(h.myPos===1) return 'campeão';
  if(promo&&h.myPos<=promo) return 'acesso';
  if(releg&&h.relegated&&h.relegated.includes(h.myClubShort)) return 'rebaixado';
  return 'meio de tabela';
}

/* =====================================================================
   5 · LIGAS INTERNACIONAIS
   Grade: 28 / liga / líder / 56 / vice / 56
   ===================================================================== */
const RF_CP_INTL_COLS='28px minmax(0,1fr) minmax(0,1.1fr) 56px minmax(0,1.1fr) 56px';
function rfCpIntlHTML(){
  const paises=Object.keys((S&&S.bgLeagues)||{});
  const linhas=paises.map(pais=>{
    const cfg=(typeof UNI_CONFIGS!=='undefined')?UNI_CONFIGS[(typeof uniKeyOf==='function')?uniKeyOf(pais):pais]:null;
    const topo=(cfg&&cfg.order&&cfg.order[0])||null; if(!topo) return '';
    const tab=(typeof bgStandings==='function')?bgStandings(pais,topo):[];
    const lider=tab[0], vice=tab[1];
    const nomeDe=t=>{ if(!t) return '—';
      const c=(typeof bgClubById==='function')?bgClubById(t.id):null; return (c&&c.short)||String(t.id); };
    return `<div class="rf-el-row">
      <span class="rf-cp-bandeira">${(typeof flagImg==='function')?flagImg(pais):''}</span>
      <span class="rf-cp-liga">${escC((cfg.label&&cfg.label[topo])||pais)}</span>
      <span class="rf-cp-time">${escC(nomeDe(lider))}</span>
      <span class="rf-cp-pts">${lider?lider.Pts:'—'} pts</span>
      <span class="rf-cp-time fraco">${escC(nomeDe(vice))}</span>
      <span class="rf-cp-pts fraco">${vice?vice.Pts:'—'} pts</span>
    </div>`;
  }).join('');
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_CP_INTL_COLS}">
    <span></span><span>LIGA</span><span>LÍDER</span><span class="dir">PTS</span>
    <span class="dir">VICE</span><span class="dir">PTS</span>
  </div>`;
  const copas=((typeof allCupKeys==='function')?allCupKeys():[]).filter(k=>k!=='copaBrasil').map(k=>{
    const c=S.cups&&S.cups[k]; const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    const fase=c?((typeof cupCompetitionRoundLabel==='function'&&cupCompetitionRoundLabel(c,k))||'em andamento'):'não sorteada';
    const lider=(c&&typeof cupCompetitionLeader==='function')?cupCompetitionLeader(c):null;
    return `<div class="rf-cp-tile">
      ${rfTrofeuHTML(k,44)}
      <div class="rf-cp-tile-id">
        <span class="rf-cp-tile-n">${escC(def.name||k)}</span>
        <span class="rf-cp-tile-1">${escC(fase)}</span>
        <span class="rf-cp-tile-2">${escC(lider||'—')}</span>
      </div>
    </div>`;
  }).join('');
  return `<div class="rf-card rf-el-tbl" style="--el-cols:${RF_CP_INTL_COLS}">
      <div class="rf-label"><span class="rf-label-t">LIGAS DO MUNDO</span>
        <span class="rf-label-r">líderes da rodada</span></div>
      ${cab}
      ${linhas || '<div class="rf-empty">Nenhuma liga de fundo neste save.</div>'}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">COPAS CONTINENTAIS</span></div>
      ${copas ? `<div class="rf-cp-tiles">${copas}</div>`
              : '<span class="rf-note">Sem copas continentais neste save.</span>'}
    </div>`;
}

/* ---- cabeçalho da página ---- */
function rfCpSubHTML(){
  const comps=[classifDivName(S.division)];
  ((typeof allCupKeys==='function')?allCupKeys():[]).forEach(k=>{
    if(!(S.cups&&S.cups[k])) return;
    const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    comps.push(def.name||k);
  });
  return comps.join(' · ')+' · '+(S.round||0)+'ª jornada disputada';
}
function rfCpAcoesHTML(){
  return `<div class="rf-mk-acoes">
    <button type="button" class="rf-btn rf-btn-secondary"
      onclick="rfSetTab('campeonatos','calendario')">${rfIcone('calendario',16)} Calendário completo</button>
    <button type="button" class="rf-btn rf-btn-cta"
      onclick="rfSetTab('campeonatos','classificacao')">${rfIcone('trofeu',16)} Ver classificação</button>
  </div>`;
}

/* =====================================================================
   O MUNDO NAVEGÁVEL — países, ligas e divisões, jogáveis e de fundo
   ---------------------------------------------------------------------
   As abas Calendário e Classificação mostravam UM campeonato: o do clube do
   jogador. Tudo o resto do mundo existia no save — as outras divisões correm,
   as ligas de fundo dos outros países correm — e não havia porta nenhuma para
   o ver. Numa sala com países misturados isso é o oposto do que o jogo
   promete: o companheiro de sala joga em Inglaterra e não dá para abrir a
   tabela dele.

   Estas funções são a fonte única das duas abas. Elas não sabem desenhar nada
   — respondem a três perguntas: que países existem, que competições tem cada
   um, e onde estão a tabela e o calendário de cada competição.
   ===================================================================== */

/* países que o save conhece: o do clube do jogador primeiro, depois os de fundo */
function rfMdPaises(){
  const out=[];
  const meu=(typeof activeUniverseKey==='function')?activeUniverseKey():'brasil';
  const nomeDe=k=>{ const cfg=(typeof UNI_CONFIGS!=='undefined')&&UNI_CONFIGS[k];
    return (cfg&&cfg.country)||(k==='brasil'?'Brasil':k); };
  out.push({ key:meu, nome:nomeDe(meu), jogavel:true });
  Object.keys((typeof S!=='undefined'&&S&&S.bgLeagues)||{}).forEach(p=>{
    if(out.some(x=>x.key===p || x.nome===p)) return;
    out.push({ key:p, nome:nomeDe(p)||p, jogavel:false });
  });
  return out;
}
function rfMdPaisSel(){
  const st=rfState(); const paises=rfMdPaises();
  if(!st.mdPais || !paises.some(p=>p.key===st.mdPais)) st.mdPais=paises[0]?paises[0].key:null;
  return st.mdPais;
}
function rfMdPaisIr(k){ const st=rfState(); st.mdPais=k; st.mdComp=null; cdraw(); }

/* competições de um país. O país do jogador tem a pirâmide inteira MAIS as copas; um país de
   fundo tem só as divisões que a simulação dele faz correr (copas continentais são do mundo do
   jogador, não do país de fundo). */
function rfMdCompeticoes(pais){
  const meu=(typeof activeUniverseKey==='function')?activeUniverseKey():'brasil';
  const out=[];
  if(pais===meu){
    (typeof DIV_ORDER!=='undefined'?DIV_ORDER:[]).forEach(d=>{
      out.push({ k:'liga:'+d, tipo:'liga', div:d,
        label:(typeof divLegend==='function')?divLegend(d):d, tag:(typeof rfCompTagHTML==='function')?rfCompTagHTML(d):null });
    });
    ((typeof allCupKeys==='function')?allCupKeys():[]).forEach(k=>{
      if(!(S.cups&&S.cups[k])) return;
      const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
      out.push({ k:'copa:'+k, tipo:'copa', cup:k, label:def.name||k,
        tag:(typeof rfCompTagHTML==='function')?rfCompTagHTML(k):null });
    });
    return out;
  }
  const L=(S.bgLeagues||{})[pais]; if(!L) return out;
  Object.keys(L.divs||{}).forEach(d=>{
    out.push({ k:'liga:'+d, tipo:'liga', div:d,
      label:(typeof bgDivLabel==='function')?bgDivLabel(pais,d):d, tag:null });
  });
  return out;
}
function rfMdCompSel(){
  const st=rfState(); const pais=rfMdPaisSel(); const comps=rfMdCompeticoes(pais);
  if(!st.mdComp || !comps.some(c=>c.k===st.mdComp)){
    /* A PRIMEIRA COISA A VER É O CAMPEONATO DELE. A lista começa na 1ª divisão do país, então
       sem isto um treinador da Série D abria o Calendário na Série A — o campeonato de outra
       gente. A divisão do jogador só é o primeiro item quando ele está mesmo no topo. */
    const meu=(typeof activeUniverseKey==='function')?activeUniverseKey():'brasil';
    const minha=(pais===meu) ? comps.find(c=>c.tipo==='liga' && c.div===S.division) : null;
    st.mdComp=(minha||comps[0]||{}).k||null;
  }
  return st.mdComp;
}
function rfMdCompIr(k){ const st=rfState(); st.mdComp=k; cdraw(); }
function rfMdComp(){ const sel=rfMdCompSel(); return rfMdCompeticoes(rfMdPaisSel()).find(c=>c.k===sel)||null; }

/* onde moram a tabela e o calendário da competição escolhida. Três casos, e é por isto que esta
   função existe: a MINHA divisão está em S.sched/S.table; as outras divisões do meu país em
   S.otherDivs[d]; as de outro país em S.bgLeagues[pais].divs[d]. Quem desenha não deve ter de
   saber isso. */
function rfMdDados(pais, comp){
  if(!comp || comp.tipo!=='liga') return null;
  const meu=(typeof activeUniverseKey==='function')?activeUniverseKey():'brasil';
  if(pais===meu){
    if(comp.div===S.division) return { sched:S.sched||[], table:S.table||{}, minha:true };
    const od=(S.otherDivs||{})[comp.div];
    return od ? { sched:od.sched||[], table:od.table||{}, minha:false, fundo:false, div:comp.div, pais } : null;
  }
  const dd=(((S.bgLeagues||{})[pais]||{}).divs||{})[comp.div];
  return dd ? { sched:dd.sched||[], table:dd.table||{}, minha:false, fundo:true, div:comp.div, pais } : null;
}

/* ---- a barra de filtros, partilhada pelas duas abas ---- */
function rfMdFiltroHTML(){
  const paises=rfMdPaises(), pSel=rfMdPaisSel();
  const comps=rfMdCompeticoes(pSel), cSel=rfMdCompSel();
  /* Um país só (save sem ligas de fundo) não precisa de fila de países: uma fila com um botão
     é ruído que não decide nada. As competições continuam, que aí há sempre mais de uma. */
  const filaPaises = paises.length<2 ? '' : `<div class="rf-md-fila" role="group" aria-label="Filtrar por país">
    ${paises.map(p=>`<button type="button" class="rf-md-chip ${p.key===pSel?'on':''}"
        onclick="rfMdPaisIr('${escC(p.key)}')" title="${escC(p.jogavel?'País jogável':'Liga de fundo')}">
        ${(typeof flagImg==='function')?flagImg(p.nome):''}<span>${escC(p.nome)}</span>
        ${p.jogavel?'<i class="rf-md-jog" title="País jogável">•</i>':''}
      </button>`).join('')}</div>`;
  const filaComps = !comps.length ? '' : `<div class="rf-md-fila" role="group" aria-label="Filtrar por competição">
    ${comps.map(c=>`<button type="button" class="rf-md-chip ${c.k===cSel?'on':''}"
        onclick="rfMdCompIr('${escC(c.k)}')">${c.tag||('<span>'+escC(c.label)+'</span>')}</button>`).join('')}</div>`;
  return (filaPaises||filaComps) ? `<div class="rf-md-filtros">${filaPaises}${filaComps}</div>` : '';
}

/* =====================================================================
   CLASSIFICAÇÃO DO MUNDO — a tabela de qualquer divisão de qualquer país
   ===================================================================== */
/* SEM COLUNA DE ESCUDO SOLTA: `rfCpClube` já devolve escudo + nome, clicáveis juntos. Desenhar
   um `rfCrest` ao lado punha o escudo duas vezes — e o primeiro caía no texto de recurso, que era
   o "ARSArsenal" visto na tabela da Premier. */
const RF_MD_TBL_COLS='30px minmax(0,1.6fr) 34px 34px 34px 34px 44px 44px 40px 44px';
function rfMdClassificacaoHTML(){
  const pais=rfMdPaisSel(), comp=rfMdComp();
  if(!comp) return '<div class="rf-empty">Este save não tem competições para mostrar.</div>';
  if(comp.tipo==='copa') return rfMdClassifCopaHTML(comp.cup);
  const dados=rfMdDados(pais, comp);
  if(!dados) return '<div class="rf-empty">Esta divisão ainda não começou.</div>';
  const linhas=(typeof sortTableRows==='function')?sortTableRows(dados.table):Object.values(dados.table||{});
  if(!linhas.length) return '<div class="rf-empty">Esta divisão ainda não começou.</div>';
  const corpo=linhas.map((t,i)=>{
    const eu=(t.id===CL.clubId);
    const sd=(t.GF||0)-(t.GA||0);
    return `<div class="rf-el-row ${eu?'sel':''}">
      <span class="rf-md-pos">${i+1}</span>
      <span class="rf-el-nome">${rfCpClube(t.id)}</span>
      <span>${t.P||0}</span><span>${t.W||0}</span><span>${t.D||0}</span><span>${t.L||0}</span>
      <span>${t.GF||0}</span><span>${t.GA||0}</span>
      <span>${sd>0?'+':''}${sd}</span>
      <span class="rf-md-pts">${t.Pts||0}</span>
    </div>`;
  }).join('');
  return `<div class="rf-card rf-el-tbl" style="--el-cols:${RF_MD_TBL_COLS}">
    <div class="rf-label"><span class="rf-label-t">${comp.tag||escC(comp.label)}</span>
      <span class="rf-label-r">${linhas.length} clubes · ${S.round||0} jornadas jogadas</span></div>
    <div class="rf-el-head" style="--el-cols:${RF_MD_TBL_COLS}">
      <span>#</span><span>CLUBE</span><span>J</span><span>V</span><span>E</span><span>D</span>
      <span>GP</span><span>GC</span><span>SG</span><span class="dir">PTS</span>
    </div>
    ${corpo}
  </div>`;
}
/* copa com grupos: uma tabela por grupo. Copa de mata-mata puro não tem classificação — tem
   chave, e a chave já tem tela própria; dizer isso é melhor que mostrar uma tabela vazia. */
function rfMdClassifCopaHTML(key){
  const c=S.cups&&S.cups[key]; const g=c&&c.group;
  if(!g || !g.groups) return `<div class="rf-empty">A ${escC(((typeof COMP_DEFS!=='undefined'&&COMP_DEFS[key])||{}).name||key)} é de mata-mata: a chave está na página da competição.</div>`;
  const cols='30px minmax(0,1.6fr) 34px 44px 44px 40px 44px';
  return Object.keys(g.groups).sort().map(L=>{
    const grp=g.groups[L];
    const linhas=(typeof sortTableRows==='function')?sortTableRows(grp.table):Object.values(grp.table||{});
    return `<div class="rf-card rf-el-tbl" style="--el-cols:${cols}">
      <div class="rf-label"><span class="rf-label-t">Grupo ${escC(L)}</span></div>
      <div class="rf-el-head" style="--el-cols:${cols}">
        <span>#</span><span>CLUBE</span><span>J</span><span>GP</span><span>GC</span><span>SG</span><span class="dir">PTS</span>
      </div>
      ${linhas.map((t,i)=>`<div class="rf-el-row ${t.id===CL.clubId?'sel':''}">
        <span class="rf-md-pos">${i+1}</span>
        <span class="rf-el-nome">${rfCpClube(t.id)}</span>
        <span>${t.P||0}</span><span>${t.GF||0}</span><span>${t.GA||0}</span>
        <span>${((t.GF||0)-(t.GA||0))>0?'+':''}${(t.GF||0)-(t.GA||0)}</span>
        <span class="rf-md-pts">${t.Pts||0}</span></div>`).join('')}
    </div>`;
  }).join('');
}

/* ===== A CLASSIFICACAO E A PAGINA QUE NAVEGA O MUNDO; O CALENDARIO E DO CLUBE =====
   Cheguei a por a grelha do mundo no Calendario -- todas as partidas de todos os clubes, jornada
   a jornada. O dono do jogo experimentou e a resposta foi curta: nao ficou bom. E nao fica mesmo:
   quem abre o Calendario quer saber quando joga o SEU clube e contra quem, e a grelha do mundo
   afoga essa resposta em vinte linhas por semana.
   Entao cada pagina volta a ter uma pergunta so. O Calendario continua a ser o do clube, a
   temporada inteira, liga e copas (rfCpCalendarioHTML). E a CLASSIFICACAO e a que navega: abre na
   liga do proprio clube e tem os filtros de pais, liga e divisao para quem quiser ver outra. */
function rfMdClassifHTML(){ return rfMdFiltroHTML()+rfMdClassificacaoHTML(); }

/* ===== O NOME DO JOGADOR ABRE A FICHA DELE =====
   A artilharia listava o nome como texto morto e só o CLUBE era clicável: para ver o artilheiro
   do campeonato era preciso abrir o clube e procurá-lo no elenco. `findPlayerClub` já sabe de
   quem é o jogador, e a tela do clube já sabe abrir a ficha de um jogador (clViewSelPlayer) —
   faltava ligar as duas. Clube que ainda não tem elenco materializado (liga de fundo nunca
   aberta) cai na tela do clube, que é o passo anterior, em vez de não fazer nada. */
function rfMdVerJogador(nome){
  const cid=(typeof findPlayerClub==='function')?findPlayerClub(nome):null;
  if(!cid){ toastC('Não achei em que clube esse jogador está.'); return; }
  if(cid===CL.clubId && typeof clGoSquad==='function'){ clGoSquad(); return; }
  if(typeof ensureBgClubMaterialized==='function') ensureBgClubMaterialized(cid);
  const p=((typeof squad==='function')?squad(cid):[]).find(x=>x.n===nome);
  if(typeof clViewTeam==='function') clViewTeam(cid);
  if(p && typeof clViewSelPlayer==='function') clViewSelPlayer(p.pid);
}
