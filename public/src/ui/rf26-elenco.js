/* =====================================================================
   RetroFoot98 — ELENCO & BASE, as quatro abas completas
   Portado de telas/Elenco e Base - Abas.html.

   DUAS COISAS QUE O MOTOR NÃO TEM, e por isso a tela não finge ter:

   1. OS OITO ATRIBUTOS (finalização, velocidade, drible, passe, cabeceio,
      defesa, resistência, frieza). O jogador daqui tem UMA força (p.f),
      mais energia, moral e o setor. Oito barras derivadas de um número só
      seriam oito jeitos de mostrar o mesmo dado — e passariam a ideia de
      que dá pra montar time por atributo, o que o motor não faz. O bloco
      mostra o que existe, e diz o que não existe.

   2. O FOCO DE TREINO por tema (finalização / marcação / resistência). O
      treino especial daqui é por JOGADOR: até três em treino ao mesmo
      tempo (TRAINING_MAX_SLOTS), e quem treina cresce. O bloco mostra as
      vagas e quem está nelas.
   ===================================================================== */

/* ---- peças ---- */
function rfElBarra(rot, valor, pct, cor){
  return `<div class="rf-el-attr">
    <span class="rf-el-attr-l">${escC(rot)}</span>
    <span class="rf-el-attr-b"><i style="width:${Math.max(0,Math.min(100,pct))}%;background:${cor||'var(--club-primary)'}"></i></span>
    <span class="rf-el-attr-v">${escC(String(valor))}</span>
  </div>`;
}
function rfElForma(p){
  const r=(p.stats&&p.stats.r3)||[];
  if(!r.length) return '<span class="rf-el-forma">—</span>';
  return '<span class="rf-el-forma">'+r.slice(-3).map(x=>{
    const l=x>=6?'V':x>=5?'E':'D';
    return `<i class="rf-el-f${l}">${l}</i>`;
  }).join('')+'</span>';
}

/* =====================================================================
   1 · ELENCO
   ===================================================================== */
function rfElElencoHTML(){
  const sq=squad(CL.clubId).slice().sort(bySquadOrder);
  const xi=new Set(xiPlayers(CL.clubId).map(p=>p.pid));
  const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};
  const linhas=sq.map(p=>{
    const en=Math.round(p.energy!=null?p.energy:100);
    return `<div class="rf-tbl-row ${xi.has(p.pid)?'me':''}" onclick="rfSelPlayer('${escC(p.pid)}')">
      <span class="rf-tbl-num">${escC(String(nums[p.pid]||p.num||''))}</span>
      <span class="rf-tbl-n">${escC(p.n)}</span>
      <span class="rf-tbl-pos">${escC(rfPosInicial(p.s))}</span>
      <span class="rf-tbl-x">${p.age||'—'}</span>
      <span class="rf-tbl-f">${p.f}</span>
      <span class="rf-tbl-en"><i class="rf-ener" style="--v:${en};--c:${rfEnergiaCor(en)}"></i></span>
      ${rfElForma(p)}
      <span class="rf-tbl-v">${escC(rfMkSalario(p))}</span>
      <span class="rf-tbl-x">${escC(rfMkFimContrato(p))}</span>
    </div>`;
  }).join('');
  const cabecalho=`<span></span><span>JOGADOR</span><span>POS</span><span>IDA</span><span>FOR</span>
    <span>ENERGIA</span><span>FORMA</span><span class="dir">SALÁRIO</span><span class="dir">FIM</span>`;
  // RESUMO POR SETOR: quantos e a força média de cada linha
  const setores=[['GK','Goleiros'],['DEF','Defesa'],['MID','Meio'],['ATT','Ataque']];
  const resumo=setores.map(([k,l])=>{
    const g=sq.filter(p=>p.s===k);
    const media=g.length?Math.round(g.reduce((t,p)=>t+(p.f||0),0)/g.length):0;
    const titulares=g.filter(p=>xi.has(p.pid)).length;
    return `<div class="rf-linha">
      <span class="rf-linha-t">${escC(l)} <i class="rf-el-sub">${g.length} · ${titulares} titular${titulares===1?'':'es'}</i></span>
      <span class="rf-linha-v">${media||'—'}</span>
    </div>`;
  }).join('');
  return rfCol(
    rfCard('Elenco principal',
      rfMkTabela('30px minmax(0,1fr) 34px 40px 40px 64px 60px 88px 56px',
        cabecalho, linhas, 'Elenco vazio.'),
      {right: sq.length+' jogadores'})
  ) + rfCol(
    rfCard('Resumo por setor', resumo + '<span class="rf-note">A força média é a do setor inteiro; entre parênteses, quantos são titulares.</span>')
  );
}
function rfSelPlayer(pid){ CL.selPlayer=pid; rfSetTab('elenco','ficha'); }

/* =====================================================================
   2 · FICHA DO JOGADOR
   ===================================================================== */
function rfElFichaHTML(){
  const sq=squad(CL.clubId);
  const p=sq.find(x=>x.pid===CL.selPlayer)||sq[0];
  if(!p) return rfCol(rfCard('Ficha do jogador','<div class="rf-empty">Selecciona um jogador no Elenco.</div>'));
  const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};
  const en=Math.round(p.energy!=null?p.energy:100);
  const moral=Math.round(p.moral!=null?p.moral:70);
  const sal=(typeof playerSalary==='function')?playerSalary(p):0;
  const topo=Math.max(1,...sq.map(x=>x.f||0));
  const tot=(typeof careerHistTotals==='function')?careerHistTotals(p):{apps:0,goals:0,yellows:0,reds:0};
  const st=p.stats||{};
  const notas=(st.r3||[]);
  const media=notas.length?(notas.reduce((a,b)=>a+b,0)/notas.length):0;
  const melhor=sq.slice().sort((a,b)=>{
    const na=((a.stats&&a.stats.r3)||[]), nb=((b.stats&&b.stats.r3)||[]);
    const ma=na.length?na.reduce((x,y)=>x+y,0)/na.length:0;
    const mb=nb.length?nb.reduce((x,y)=>x+y,0)/nb.length:0;
    return mb-ma; })[0];
  return `<div class="rf-card rf-el-hd">
      ${rfJerseyHTML(nums[p.pid]||p.num)}
      <div class="rf-el-hd-id">
        <span class="rf-el-hd-n">${escC(p.n)}</span>
        <span class="rf-el-hd-s">${escC(rfPosLabel(p.s))} · ${p.age||'?'} anos${p.ft?' · '+(p.ft==='L'?'canhoto':'destro'):''}${p.nat?' · '+escC(p.nat):''}</span>
      </div>
      <div class="rf-sp"></div>
      <div class="rf-el-hd-acts">
        <button type="button" class="rf-btn rf-btn-secondary" onclick="clRenewPlayer&&clRenewPlayer('${escC(p.n)}')">Renovar contrato…</button>
        <button type="button" class="rf-btn rf-btn-primary" onclick="clVenderJogador&&clVenderJogador('${escC(p.n)}')">Listar para venda</button>
      </div>
    </div>`
  + rfCol(
    rfCard('Atributos', `
      ${rfElBarra('Força', p.f, 100*(p.f||0)/topo, 'var(--club-primary)')}
      ${rfElBarra('Energia', en+'%', en, rfEnergiaCor(en))}
      ${rfElBarra('Moral', moral, moral, 'var(--club-secondary)')}
      <span class="rf-note">O RetroFoot98 avalia o jogador por UMA força, do jeito clássico —
        não por atributos separados. Força, energia e moral são o que entra na conta da partida.</span>`)
    + rfCard('Na temporada', `
      <div class="rf-kpis">
        ${rfKpiHTML('Gols', String((S.scorers&&S.scorers[p.n])||0), (st.apps||0)+' jogos')}
        ${rfKpiHTML('Nota média', media?media.toFixed(1).replace('.',','):'—',
          melhor&&melhor.pid===p.pid?'melhor do elenco':'')}
        ${rfKpiHTML('Cartões', (tot.yellows||0)+'A '+(tot.reds||0)+'V', '')}
      </div>`)
  ) + rfCol(
    rfCard('Contrato e moral', `
      <div class="rf-linha"><span class="rf-linha-t">Salário</span>
        <span class="rf-linha-v">${escC(fmt(sal))}</span></div>
      <div class="rf-linha"><span class="rf-linha-t">Fim do contrato</span>
        <span class="rf-linha-v">${escC(rfMkFimContrato(p))}</span></div>
      <div class="rf-linha"><span class="rf-linha-t">Valor de mercado</span>
        <span class="rf-linha-v">${escC(fmt((typeof computeVM==='function')?computeVM(p):(p.mv||0)))}</span></div>
      <div class="rf-linha"><span class="rf-linha-t">Comportamento</span>
        <span class="rf-linha-v">${escC((typeof playerBehaviorLabel==='function')?playerBehaviorLabel(p):'—')}</span></div>`)
    + rfCard('Histórico', `
      <div class="rf-linha"><span class="rf-linha-t">Jogos na carreira</span>
        <span class="rf-linha-v">${tot.apps||0}</span></div>
      <div class="rf-linha"><span class="rf-linha-t">Gols na carreira</span>
        <span class="rf-linha-v">${tot.goals||0}</span></div>
      <div class="rf-linha"><span class="rf-linha-t">Lesões</span>
        <span class="rf-linha-v">${tot.injuries||0}</span></div>
      ${(p.transferHistory||[]).length
        ? (p.transferHistory||[]).slice(-3).reverse().map(h=>`<div class="rf-linha">
            <span class="rf-linha-t">${escC(String(h.season||''))} · ${escC((anyClubOf(h.from)||{short:'—'}).short)} → ${escC((anyClubOf(h.to)||{short:'—'}).short)}</span>
            <span class="rf-linha-v">${escC(mvShort(h.fee||0))}</span></div>`).join('')
        : '<span class="rf-note">Sem transferências registradas.</span>'}`)
  );
}

/* =====================================================================
   3 · BASE
   ===================================================================== */
function rfElBaseHTML(){
  const disp=(typeof youthAvailable==='function')&&youthAvailable();
  const corpo = disp
    ? `<span class="rf-note">A base tem gente pronta. Cada promoção vale uma por temporada, e o jogador
         promovido entra no elenco com o contrato de formação.</span>
       <div class="rf-acts"><button type="button" class="rf-btn rf-btn-primary"
         onclick="clPromoteYouth()">Ver os jogadores da base</button></div>`
    : `<div class="rf-empty">A base não tem ninguém pronto nesta rodada.<br>
         <small>Os garotos aparecem em janelas específicas da temporada.</small></div>`;
  const jaPromovido=(S.youthPromotedSeason===S.season);
  return rfCol(
    rfCard('Categoria de base', corpo, {right: disp?'disponível':'sem candidatos'})
  ) + rfCol(
    rfCard('Investimento na base', `
      <div class="rf-linha"><span class="rf-linha-t">Promoção nesta temporada</span>
        <span class="rf-linha-v">${jaPromovido?'já usada':'disponível'}</span></div>
      <span class="rf-note">O RetroFoot98 não tem investimento em CT: a base entrega um jogador por
        temporada, e o que muda é QUEM você escolhe entre os candidatos.</span>`)
  );
}

/* =====================================================================
   4 · TREINO ESPECIAL
   ===================================================================== */
function rfElTreinoHTML(){
  const lista=(typeof myTrainingList==='function')?myTrainingList():[];
  const max=(typeof TRAINING_MAX_SLOTS!=='undefined')?TRAINING_MAX_SLOTS:3;
  const sq=squad(CL.clubId);
  const linhas=lista.map(pid=>{
    const p=sq.find(x=>x.pid===pid); if(!p) return '';
    const en=Math.round(p.energy!=null?p.energy:100);
    return `<div class="rf-tbl-row">
      <span class="rf-tbl-num">${escC(String(p.num||''))}</span>
      <span class="rf-tbl-n">${escC(p.n)}</span>
      <span class="rf-tbl-pos">${escC(rfPosInicial(p.s))}</span>
      <span class="rf-tbl-f">${p.f}</span>
      <span class="rf-tbl-en"><i class="rf-ener" style="--v:${en};--c:${rfEnergiaCor(en)}"></i></span>
      <span class="rf-tbl-act"><button type="button" class="rf-btn rf-btn-pill"
        onclick="clTrainingScreen()">Gerir</button></span>
    </div>`;
  }).join('');
  const cabecalho=`<span></span><span>JOGADOR</span><span>POS</span><span class="dir">FOR</span>
    <span class="dir">ENERGIA</span><span></span>`;
  return rfCol(
    rfCard('Quem está em treino',
      rfMkTabela('30px minmax(0,1fr) 34px 44px 70px 80px', cabecalho, linhas,
        'Ninguém em treino especial agora.'),
      {right: lista.length+' de '+max+' vagas'})
    + rfCard('Vagas', `
      <div class="rf-pz-trilho"><div class="rf-pz-fill" style="width:${Math.round(lista.length/max*100)}%"></div></div>
      <div class="rf-acts"><button type="button" class="rf-btn rf-btn-primary"
        onclick="clTrainingScreen()">Escolher quem treina</button></div>`)
  ) + rfCol(
    rfCard('Como funciona o treino', `
      <div class="rf-passos">
        <div class="rf-passo"><span class="rf-passo-n">1</span>
          <span class="rf-passo-t">Até ${max} jogadores em treino ao mesmo tempo. Quem entra cresce em força a cada rodada.</span></div>
        <div class="rf-passo"><span class="rf-passo-n">2</span>
          <span class="rf-passo-t">Jogador novo cresce mais rápido que veterano — a idade pesa na conta.</span></div>
        <div class="rf-passo"><span class="rf-passo-n">3</span>
          <span class="rf-passo-t">Tirar alguém do treino libera a vaga na hora, sem perder o que já foi ganho.</span></div>
      </div>
      <span class="rf-note">O treino daqui é por JOGADOR, não por tema da semana: não existe escolher
        "finalização" ou "marcação" — quem treina melhora a própria força.</span>`)
  );
}
