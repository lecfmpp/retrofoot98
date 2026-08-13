/* =====================================================================
   RetroFoot98 — CAMPEONATOS, as cinco abas completas
   Portado de telas/Campeonatos - Abas.html.

   Minhas competições · Calendário · Artilharia · História · Ligas
   internacionais.

   TROFÉU É ARTE REAL nos cards de competição (trophyImg), nunca escudo
   nem emoji — a mesma regra da leva 4.
   ===================================================================== */

/* =====================================================================
   1 · MINHAS COMPETIÇÕES — um card por competição, com o troféu
   ===================================================================== */
function rfCpCards(){
  const cards=[];
  // a LIGA em que o clube está
  const pos=rfMinhaPosicao(), total=Object.keys(S.table||{}).length;
  const t=(S.table&&S.table[CL.clubId])||{Pts:0,P:0};
  cards.push({ key:'div'+(S.division||''), trofeu:'serie'+(S.division||'D'),
    nome:classifDivName(S.division),
    linha1: pos? pos+'º de '+total : 'a começar',
    linha2: (t.Pts||0)+' pontos em '+(t.P||0)+' jogos',
    selo: rfCpSeloDivisao(pos,total), acao:"rfSetTab('campeonatos','calendario')" });
  // as copas do save
  ((typeof allCupKeys==='function')?allCupKeys():[]).forEach(k=>{
    if(S.compToggle && S.compToggle[k]===false) return;
    const c=S.cups&&S.cups[k]; if(!c) return;
    const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    const vivo=(typeof cupCompetitionTeamAlive==='function')&&cupCompetitionTeamAlive(c,CL.clubId);
    const campeao=(typeof cupCompetitionChampion==='function')?cupCompetitionChampion(c):null;
    cards.push({ key:k, trofeu:k, nome:def.name||k,
      linha1:(typeof cupCompetitionRoundLabel==='function'&&cupCompetitionRoundLabel(c,k))||'—',
      linha2: campeao===CL.clubId ? 'campeão' : (vivo?'na disputa':'fora da competição'),
      selo: campeao===CL.clubId?'CAMPEÃO':(vivo?'NA DISPUTA':'ELIMINADO'),
      acao:`clCupView('${k}')` });
  });
  return cards;
}
function rfCpSeloDivisao(pos,total){
  if(!pos) return '';
  const promo=(typeof DIVISION_PROMO!=='undefined'&&DIVISION_PROMO[S.division])||0;
  const releg=(typeof DIVISION_RELEG!=='undefined'&&DIVISION_RELEG[S.division])||0;
  if(promo&&pos<=promo) return 'ZONA DE ACESSO';
  if(releg&&pos>total-releg) return 'ZONA DE QUEDA';
  return 'MEIO DE TABELA';
}
function rfCpMinhasHTML(){
  const cards=rfCpCards();
  const fora=((typeof allCupKeys==='function')?allCupKeys():[]).filter(k=>{
    if(S.compToggle && S.compToggle[k]===false) return true;
    return !(S.cups&&S.cups[k]);
  });
  return rfCol(`<div class="rf-cp-cards">${cards.map(c=>`
    <div class="rf-card rf-cp-card">
      <div class="rf-cp-card-hd">
        ${rfTrofeuHTML(c.trofeu,56)}
        <div class="rf-cp-card-id">
          <span class="rf-cp-card-n">${escC(c.nome)}</span>
          <span class="rf-cp-card-1">${escC(c.linha1)}</span>
          <span class="rf-cp-card-2">${escC(c.linha2)}</span>
        </div>
      </div>
      <div class="rf-cp-card-ft">
        ${c.selo?`<span class="rf-cp-card-selo">${escC(c.selo)}</span>`:''}
        <div class="rf-sp"></div>
        <button type="button" class="rf-btn rf-btn-pill" onclick="${c.acao}">Abrir</button>
      </div>
    </div>`).join('')}</div>`)
  + rfCol(rfCard('Competições que você não disputa',
      fora.length
        ? fora.map(k=>{ const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
            const desligada=S.compToggle&&S.compToggle[k]===false;
            return `<div class="rf-linha"><span class="rf-linha-t">${escC(def.name||k)}</span>
              <span class="rf-linha-v">${desligada?'desligada no save':'ainda não sorteada'}</span></div>`; }).join('')
        : '<span class="rf-note">Você está em todas as competições deste save.</span>'));
}

/* =====================================================================
   2 · CALENDÁRIO — a liga e as copas
   ===================================================================== */
function rfCpCalendarioHTML(){
  return rfCol(rfCard(classifDivName(S.division), rfCalendarioHTML(),
      {right:((S.round||0)+1)+'ª de '+((S.sched||[]).length||14)+' jornadas'}))
    + rfCol(rfCard('Jogos de copa', rfCpCopaJogosHTML()));
}
function rfCpCopaJogosHTML(){
  const linhas=[];
  ((typeof allCupKeys==='function')?allCupKeys():[]).forEach(k=>{
    const c=S.cups&&S.cups[k]; if(!c||!c.bracket) return;
    const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    (c.bracket.ties||[]).forEach(t=>{
      if(t.h!==CL.clubId && t.a!==CL.clubId) return;
      const casa=t.h===CL.clubId, outro=anyClubOf(casa?t.a:t.h)||{short:'—'};
      const placar=(t.hg!=null&&t.ag!=null)?((casa?t.hg:t.ag)+'–'+(casa?t.ag:t.hg)):'—';
      linhas.push(`<div class="rf-linha">
        <span class="rf-linha-t">${escC(def.short||def.name||k)} · ${escC(outro.short)} <i class="rf-el-sub">${casa?'casa':'fora'}</i></span>
        <span class="rf-linha-v">${escC(placar)}</span></div>`);
    });
  });
  return linhas.join('') || '<span class="rf-note">Sem jogos de copa marcados agora.</span>';
}

/* =====================================================================
   3 · ARTILHARIA
   ===================================================================== */
function rfCpArtilhariaHTML(){
  const jogos=Math.max(1,(S.round||0));
  const arr=Object.entries(S.scorers||{}).map(([n,g])=>({n,g})).sort((a,b)=>b.g-a.g).slice(0,20);
  const meu=new Set(squad(CL.clubId).map(p=>p.n));
  const linhas=arr.map((s,i)=>{
    const cid=(typeof findPlayerClub==='function')?findPlayerClub(s.n):null;
    return `<div class="rf-tbl-row ${meu.has(s.n)?'me':''}">
      <span class="rf-tbl-x">${i+1}</span>
      <span class="rf-tbl-n">${escC(s.n)}</span>
      ${cid?rfMkClube(cid):'<span class="rf-tbl-clube">—</span>'}
      <span class="rf-tbl-f">${s.g}</span>
      <span class="rf-tbl-v">${(s.g/jogos).toFixed(2).replace('.',',')}</span>
    </div>`;
  }).join('');
  const cabecalho=`<span></span><span>JOGADOR</span><span>CLUBE</span>
    <span class="dir">GOLS</span><span class="dir">G/JOGO</span>`;
  const meusGols=Object.entries(S.scorers||{}).filter(([n])=>meu.has(n)).sort((a,b)=>b[1]-a[1]);
  /* DEFESAS MENOS VAZADAS: sai direto da tabela (GA), o mesmo dado da
     classificação — não existe estatística de goleiro à parte no motor. */
  const defesas=(typeof sortedTable==='function'?sortedTable():[]).slice()
    .sort((a,b)=>(a.GA||0)-(b.GA||0)).slice(0,6);
  return rfCol(
    rfCard('Artilharia da '+divisionLabel(),
      rfMkTabela('28px minmax(0,1fr) minmax(0,130px) 56px 68px', cabecalho, linhas,
        'Sem gols marcados ainda nesta temporada.'),
      {right:'todos os clubes'})
  ) + rfCol(
    rfCard('Seus marcadores',
      meusGols.length
        ? meusGols.map(([n,g])=>`<div class="rf-linha">
            <span class="rf-linha-t">${escC(n)}</span><span class="rf-linha-v">${g}</span></div>`).join('')
        : '<span class="rf-note">Ninguém do seu elenco marcou ainda.</span>',
      {right:meusGols.length?meusGols.reduce((t,[,g])=>t+g,0)+' gols':''})
    + rfCard('Defesas menos vazadas',
      defesas.length
        ? defesas.map(t=>{ const c=anyClubOf(t.id)||{short:t.id};
            return `<div class="rf-linha ${t.id===CL.clubId?'me':''}">
              <span class="rf-linha-t">${escC(c.short)}</span>
              <span class="rf-linha-v">${t.GA||0} sofridos</span></div>`; }).join('')
        : '<span class="rf-note">A tabela ainda não tem jogos.</span>')
  );
}

/* =====================================================================
   4 · HISTÓRIA
   ===================================================================== */
function rfCpHistoriaHTML(){
  const minhas=(S.history||[]).filter(h=>h.clubId===CL.clubId).slice().reverse();
  const linhas=minhas.map(h=>{
    const cups=Object.entries(h.myCups||{}).map(([k,v])=>{
      const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
      return (def.short||k)+' · '+v; }).join(', ');
    return `<div class="rf-tbl-row">
      <span class="rf-tbl-x">${escC(String(h.season))}</span>
      <span class="rf-tbl-n">${escC((typeof divisionLabelOf==='function')?divisionLabelOf(h.division):('Série '+h.division))}</span>
      <span class="rf-tbl-v">${h.myPos?h.myPos+'º':'—'}</span>
      <span class="rf-tbl-clube"><span>${escC(rfCpDesfecho(h))}</span></span>
      <span class="rf-tbl-clube"><span>${escC(cups||'—')}</span></span>
    </div>`;
  }).join('');
  const cabecalho=`<span>ANO</span><span>COMPETIÇÃO</span><span class="dir">POSIÇÃO</span>
    <span>DESFECHO</span><span>COPAS</span>`;
  const titulos=(typeof rfTitulosDoTreinador==='function')?rfTitulosDoTreinador():[];
  return rfCol(
    rfCard('Histórico do clube',
      rfMkTabela('50px minmax(0,1fr) 70px minmax(0,140px) minmax(0,160px)', cabecalho, linhas,
        'Nenhuma temporada concluída neste save.'),
      {right: minhas.length+(minhas.length===1?' temporada':' temporadas')})
  ) + rfCol(
    rfCard('Títulos do clube',
      titulos.length
        ? titulos.map(t=>`<div class="rf-linha">
            <span class="rf-linha-t">${escC(t.label||t.text||'')}</span>
            <span class="rf-linha-v">${escC(String(t.season||''))}</span></div>`).join('')
        : '<span class="rf-note">Nenhum título ainda. A sala de troféus enche a partir do primeiro.</span>',
      {right:titulos.length?titulos.length+' na estante':''})
  );
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
   ===================================================================== */
function rfCpIntlHTML(){
  const paises=Object.keys((S&&S.bgLeagues)||{});
  const linhas=paises.map(pais=>{
    const cfg=(typeof UNI_CONFIGS!=='undefined')?UNI_CONFIGS[(typeof uniKeyOf==='function')?uniKeyOf(pais):pais]:null;
    const topo=(cfg&&cfg.order&&cfg.order[0])||null; if(!topo) return '';
    const tab=(typeof bgStandings==='function')?bgStandings(pais,topo):[];
    const lider=tab[0], vice=tab[1];
    const nomeDe=t=>{ if(!t) return '—';
      const c=(typeof bgClubById==='function')?bgClubById(t.id):null; return (c&&c.short)||String(t.id); };
    return `<div class="rf-tbl-row">
      <span class="rf-tbl-x">${(typeof flagImg==='function')?flagImg(pais):''}</span>
      <span class="rf-tbl-n">${escC((cfg.label&&cfg.label[topo])||pais)}</span>
      <span class="rf-tbl-clube"><span>${escC(nomeDe(lider))}</span></span>
      <span class="rf-tbl-f">${lider?lider.Pts:'—'}</span>
      <span class="rf-tbl-clube"><span>${escC(nomeDe(vice))}</span></span>
      <span class="rf-tbl-v">${vice?vice.Pts:'—'}</span>
    </div>`;
  }).join('');
  const cabecalho=`<span></span><span>LIGA</span><span>LÍDER</span><span class="dir">PTS</span>
    <span>VICE</span><span class="dir">PTS</span>`;
  // COPAS CONTINENTAIS: as do próprio save
  const copas=((typeof allCupKeys==='function')?allCupKeys():[]).filter(k=>k!=='copaBrasil').map(k=>{
    const c=S.cups&&S.cups[k]; const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    return `<div class="rf-linha">
      <span class="rf-linha-t">${escC(def.name||k)}</span>
      <span class="rf-linha-v">${c?escC((typeof cupCompetitionRoundLabel==='function'&&cupCompetitionRoundLabel(c,k))||'—'):'não sorteada'}</span>
    </div>`;
  }).join('');
  return rfCol(
    rfCard('Ligas do mundo',
      rfMkTabela('30px minmax(0,1fr) minmax(0,140px) 56px minmax(0,140px) 56px', cabecalho, linhas,
        'Nenhuma liga de fundo neste save.'),
      {right:'líderes da rodada'})
  ) + rfCol(
    rfCard('Copas continentais', copas || '<span class="rf-note">Sem copas continentais neste save.</span>')
  );
}
