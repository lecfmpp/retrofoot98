/* =====================================================================
   RetroFoot98 — ELENCO & BASE, as quatro abas completas
   Marcação de telas-v3/Elenco e Base - Abas.dc.html, coluna por coluna.

   O DESENHO VEM PRIMEIRO. Uma versão anterior desta tela omitia de
   propósito o que o motor não tem — potencial do garoto, nível do CT, foco
   de treino por tema — e explicava a ausência em nota de rodapé. A decisão
   agora é outra: a tela é o desenho, inteiro, e o que ainda não tem fonte
   no motor aparece com o dado mais próximo que existe ou com um traço.
   Ligar cada peça à base vem depois, uma a uma.

   O que é DERIVADO (e não lido) está marcado caso a caso lá embaixo.
   ===================================================================== */

/* ---- peças ---- */
function rfElBarra(rot, valor, pct, cor){
  return `<div class="rf-el-attr">
    <span class="rf-el-attr-l">${escC(rot)}</span>
    <span class="rf-el-attr-b"><i style="width:${Math.max(0,Math.min(100,pct))}%;background:${cor||'var(--club-primary)'}"></i></span>
    <span class="rf-el-attr-v">${escC(String(valor))}</span>
  </div>`;
}
/* A CAMISA COM O NÚMERO — cinco caixas absolutas: corpo, duas mangas, gola e
   o número por cima. É a marca da tabela de elenco no pacote; sem ela a linha
   vira uma planilha. Vem em dois tamanhos: 'p' na tabela, 'g' na ficha. */
/* `tam`: '' (28px, listas densas), 'm' (34px) ou 'g' (54px). É a ÚNICA camisa do
   jogo — o Mercado tinha um desenho próprio, sem gola e com o número em 11px,
   e as duas peças nunca coincidiam lado a lado. */
function rfElCamisa(num, tam){
  const cls = tam===true ? 'g' : (tam||'');
  return `<span class="rf-el-camisa ${cls}">
    <i class="c-corpo"></i><i class="c-mgesq"></i><i class="c-mgdir"></i><i class="c-gola"></i>
    <b>${escC(String(num||''))}</b>
  </span>`;
}
/* barrinha fina de 6px usada em ENERGIA, POTENCIAL e PROGRESSO */
/* `larg` virou TETO, não largura fixa: a barra enche a célula até esse limite.
   Como largura fixa ela ficava numa poça de espaço vazio agora que as colunas
   numéricas dividem a folga da tela. */
function rfElMini(pct, cor, larg){
  pct=Math.max(0,Math.min(100,Math.round(pct||0)));
  return `<span class="rf-el-mini" ${larg?`style="--mini-w:${larg*2}px"`:''}><i style="width:${pct}%;background:${cor}"></i></span>`;
}
/* a escala verde→amarelo→vermelho que o pacote usa nas três barras */
function rfElTom(pct){
  return pct>=80?'#2fbf5f':pct>=60?'#8cc63f':pct>=40?'#F2B90C':'#d94141';
}
function rfElForma(p){
  const r=(p.stats&&p.stats.r3)||[];
  // o pacote mostra SEMPRE três casas: sem jogo, entra travessão
  const tres=[0,1,2].map(i=>{
    const x=r.slice(-3)[i];
    if(x==null) return '—';
    return x>=6?'V':x>=5?'E':'D';
  });
  return `<span class="rf-el-forma">${tres.join(' ')}</span>`;
}
/* linha de estatística dos rodapés (RESUMO POR SETOR, INVESTIMENTO NA BASE):
   rótulo micro em mono, número grande, e uma legenda opcional embaixo */
function rfElStat(rot, valor, sub){
  return `<div class="rf-el-stat">
    <span class="rf-el-stat-l">${escC(rot)}</span>
    <span class="rf-el-stat-v">${escC(String(valor))}</span>
    ${sub?`<span class="rf-el-stat-s">${escC(sub)}</span>`:''}
  </div>`;
}

/* =====================================================================
   1 · ELENCO
   Grade do pacote: 34 / nome / 28 / 30 / 34 / 62 / 62 / 78 / 52
   ===================================================================== */
const RF_EL_COLS='34px minmax(0,1.2fr) 34px 40px 40px minmax(62px,.5fr) minmax(62px,.5fr) minmax(78px,.6fr) minmax(52px,.45fr)';
function rfElElencoHTML(){
  const sq=squad(CL.clubId).slice().sort(bySquadOrder);
  const xi=new Set(xiPlayers(CL.clubId).map(p=>p.pid));
  const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};
  const linhas=sq.map(p=>{
    const en=Math.round(p.energy!=null?p.energy:100);
    return `<div class="rf-el-row ${CL.selPlayer===p.pid?'sel':''}" onclick="rfSelPlayer('${escC(p.pid)}')">
      ${rfElCamisa(nums[p.pid]||p.num||'')}
      <span class="rf-el-nome">${escC(p.n)}</span>
      <span class="rf-el-c">${escC(rfPosInicial(p.s))}</span>
      <span class="rf-el-c">${p.age||'—'}</span>
      <span class="rf-el-forte">${p.f}</span>
      ${rfElMini(en, rfElTom(en), 54)}
      ${rfElForma(p)}
      <span class="rf-el-d">${escC(rfMkSalario(p))}</span>
      <span class="rf-el-d">${escC(rfMkFimContrato(p))}</span>
    </div>`;
  });
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_EL_COLS}">
    <span></span><span>JOGADOR</span><span>POS</span><span>IDA</span><span>FOR</span>
    <span>ENERGIA</span><span>FORMA</span><span class="dir">SALÁRIO</span><span class="dir">FIM</span>
  </div>`;
  const setores=[['GK','GOLEIROS'],['DEF','DEFESA'],['MID','MEIO'],['ATT','ATAQUE']];
  const resumo=setores.map(([k,l])=>{
    const g=sq.filter(p=>p.s===k);
    const media=g.length?Math.round(g.reduce((t,p)=>t+(p.f||0),0)/g.length):0;
    return rfElStat(l, g.length, media?('força média '+media):'sem jogadores');
  }).join('');
  return `<div class="rf-card rf-el-tbl" style="--el-cols:${RF_EL_COLS}">
      <div class="rf-label"><span class="rf-label-t">ELENCO PRINCIPAL</span>
        <span class="rf-label-r">${sq.length} no elenco</span></div>
      ${cab}
      ${rfLista('elenco', linhas, 'Elenco vazio.')}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">RESUMO POR SETOR</span></div>
      <div class="rf-el-stats">${resumo}</div>
    </div>`;
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
        <button type="button" class="rf-btn rf-btn-secondary" onclick="rfAcAbrir('elenco-renovar',{pid:'${escC(p.pid)}'})">Renovar contrato</button>
        <button type="button" class="rf-btn rf-btn-primary" onclick="rfAcAbrir('mkt-listar',{pid:'${escC(p.pid)}'})">Listar para venda</button>
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
   Grade do pacote: nome / 28 / 30 / 34 / 74 / 74 / 74 / 74
   ===================================================================== */
const RF_BASE_COLS='minmax(0,1.2fr) 34px 40px 40px minmax(74px,.5fr) minmax(74px,.5fr) minmax(74px,.5fr) minmax(74px,.5fr)';
/* POTENCIAL e PRONTO EM são DERIVADOS — o motor não guarda nenhum dos dois.
   O garoto tem força e idade, e o crescimento sai de growthProfileOf; então
   o potencial é a força projetada até os 24 e o "pronto em" é quanto falta
   pra lá. Quando ligarmos a base de verdade, é só trocar as duas contas. */
function rfElPotencial(y){
  const g=(typeof growthProfileOf==='function')?growthProfileOf(y):null;
  const porTemp=(g&&g.forcaPorTemporada)||2;
  const anos=Math.max(0, 24-(y.age||18));
  const teto=Math.min(99,(y.f||0)+porTemp*anos);
  return {teto, anos, pct:Math.round(100*teto/99)};
}
function rfElBaseHTML(){
  const disp=(typeof youthAvailable==='function')&&youthAvailable();
  // o lote da rodada é o que o motor tem de "categoria de base"
  if(disp && !(S._youthCandidates && S._youthCandidates.length && S._youthCandidatesRound===S.round)
     && typeof rollYouthCandidatesForRound==='function') rollYouthCandidatesForRound();
  const cands=(S._youthCandidates||[]);
  const linhas=cands.map((c,i)=>{
    const y=c.youth; if(!y) return '';
    const pot=rfElPotencial(y);
    const primeiro=i===0;
    const sal=(c.contract&&c.contract.salary)||y.salary||0;
    return `<div class="rf-el-row ${primeiro?'sel':''}">
      <span class="rf-el-nome">${escC(y.n)}</span>
      <span class="rf-el-c">${escC(rfPosInicial(y.s))}</span>
      <span class="rf-el-c">${y.age||'—'}</span>
      <span class="rf-el-forte">${y.f}</span>
      ${rfElMini(pot.pct, rfElTom(pot.pct), 62)}
      <span class="rf-el-d">${pot.anos?(pot.anos+' ano'+(pot.anos>1?'s':'')):'agora'}</span>
      <span class="rf-el-d">${escC(sal?rfDin(sal):'—')}</span>
      <span class="rf-el-act"><button type="button" class="rf-el-bt ${primeiro?'cta':''}"
        onclick="event.stopPropagation();rfAcPromover()">${primeiro?'Promover':'Ver'}</button></span>
    </div>`;
  }).join('');
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_BASE_COLS}">
    <span>JOGADOR</span><span>POS</span><span>IDA</span><span>FOR</span>
    <span>POTENCIAL</span><span>PRONTO EM</span><span class="dir">SALÁRIO</span><span></span>
  </div>`;
  // INVESTIMENTO NA BASE: gasto sai da soma dos contratos do lote. Nível do CT
  // e vendas da base o motor não tem — entram como traço, não como número
  // inventado.
  const gasto=cands.reduce((t,c)=>t+(((c.contract&&c.contract.salary)||0)),0);
  const promovidos=(S.youthPromotedSeason===S.season)?1:0;
  return `<div class="rf-card rf-el-tbl" style="--el-cols:${RF_BASE_COLS}">
      <div class="rf-label"><span class="rf-label-t">CATEGORIA DE BASE</span>
        <span class="rf-label-r">${cands.length} em formação</span></div>
      ${cab}
      ${linhas || `<div class="rf-empty">${escC((typeof youthUnavailableMsg==='function'&&!disp)?youthUnavailableMsg():'A base não tem candidatos nesta rodada.')}</div>`}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">INVESTIMENTO NA BASE</span></div>
      <div class="rf-el-stats">
        ${rfElStat('GASTO POR MÊS', gasto?rfDin(gasto):'R$ 0')}
        ${rfElStat('NÍVEL DO CT', '—', 'o motor ainda não tem CT')}
        ${rfElStat('PROMOVIDOS EM '+(S.season||''), promovidos, promovidos?'cota da temporada usada':'cota livre')}
        ${rfElStat('VENDIDOS DA BASE', '—', 'sem histórico por origem')}
      </div>
    </div>`;
}

/* =====================================================================
   4 · TREINO ESPECIAL
   Grade do pacote: 34 / nome / 28 / 34 / 74 / 1fr / 74
   ===================================================================== */
const RF_TRN_COLS='34px minmax(0,1.2fr) 34px 40px minmax(74px,.5fr) minmax(0,1fr) minmax(74px,.5fr)';
/* O FOCO DO TREINO é do desenho, não do motor: aqui o treino é por JOGADOR
   (até TRAINING_MAX_SLOTS ao mesmo tempo), e não por tema da semana. Os três
   cartões existem e guardam a escolha em CL.trnFoco, mas ainda não mudam o
   resultado — é a primeira ligação a fazer quando formos ao motor. */
const RF_TRN_FOCOS=[
  {k:'finalizacao', ico:rfIcone('jogar',16)+'',  t:'Finalização', d:'+2 na finalização de até 3 atacantes'},
  {k:'marcacao',    ico:rfIcone('marcacao',16)+'', t:'Marcação',    d:'+2 na defesa de até 4 defensores'},
  {k:'resistencia', ico:rfIcone('resistencia',16)+'',  t:'Resistência', d:'+3 de energia para todo o elenco'},
];
function rfTrnFoco(k){ CL.trnFoco=k; cdraw(); }
function rfElTreinoHTML(){
  const lista=(typeof myTrainingList==='function')?myTrainingList():[];
  const max=(typeof TRAINING_MAX_SLOTS!=='undefined')?TRAINING_MAX_SLOTS:3;
  const sq=squad(CL.clubId);
  const foco=CL.trnFoco||RF_TRN_FOCOS[0].k;
  const cartoes=RF_TRN_FOCOS.map(f=>`
    <button type="button" class="rf-el-foco ${foco===f.k?'on':''}" onclick="rfTrnFoco('${f.k}')">
      <span class="rf-el-foco-i">${f.ico}</span>
      <span class="rf-el-foco-t">${escC(f.t)}</span>
      <span class="rf-el-foco-d">${escC(f.d)}</span>
    </button>`).join('');
  const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};
  const linhas=lista.map(pid=>{
    const p=sq.find(x=>x.pid===pid); if(!p) return '';
    // PROGRESSO é derivado: o quanto da força projetada da temporada já veio
    const g=(typeof growthProfileOf==='function')?growthProfileOf(p):null;
    // forcaPorTemporada vem fracionado do motor (1.68…) — na tela é um ganho,
    // não uma medição: arredonda pra uma casa e some com o zero à direita.
    const porTemp=Math.round(((g&&g.forcaPorTemporada)||0)*10)/10;
    const pct=Math.max(0,Math.min(100, Math.round(((S.round||0)%38)/38*100)));
    const ganho=porTemp?('+'+String(porTemp).replace('.',',')+' força'):'sem ganho previsto';
    /* mesmo caso das outras duas listas: `sel` fixo em toda linha, então a
       lista inteira aparecia marcada — o mesmo que nenhuma marcada */
    return `<div class="rf-el-row">
      ${rfElCamisa(nums[p.pid]||p.num||'')}
      <span class="rf-el-nome">${escC(p.n)}</span>
      <span class="rf-el-c">${escC(rfPosInicial(p.s))}</span>
      <span class="rf-el-forte">${p.f}</span>
      ${rfElMini(pct, rfElTom(pct), 62)}
      <span class="rf-el-ganho">${escC(ganho)}${pct>=80?' · quase':''}</span>
      <span class="rf-el-act"><button type="button" class="rf-el-bt perigo"
        onclick="event.stopPropagation();clStopTraining('${escC(p.pid)}');cdraw()">Tirar</button></span>
    </div>`;
  }).join('');
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_TRN_COLS}">
    <span></span><span>JOGADOR</span><span>POS</span><span class="dir">FOR</span>
    <span class="dir">PROGRESSO</span><span class="dir">GANHO ESPERADO</span><span></span>
  </div>`;
  return `<div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">FOCO DO TREINO</span>
        <span class="rf-label-r">1 por semana</span></div>
      <div class="rf-el-focos">${cartoes}</div>
    </div>
    <div class="rf-card rf-el-tbl" style="--el-cols:${RF_TRN_COLS}">
      <div class="rf-label"><span class="rf-label-t">QUEM VAI TREINAR</span>
        <span class="rf-label-r">${lista.length} de ${max} vagas</span></div>
      ${cab}
      ${linhas || '<div class="rf-empty">Ninguém em treino especial agora.</div>'}
      ${lista.length<max?`<div class="rf-acts"><button type="button" class="rf-btn rf-btn-cta"
        onclick="rfAcTreino()">${rfIcone('resistencia',16)} Pôr alguém em treino</button></div>`:''}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">CUSTO E RISCO</span></div>
      <span class="rf-el-texto">Treino especial gasta energia de cada jogador escalado, e jogador
        com energia baixa tem risco de lesão dobrado — o departamento médico avisa antes.</span>
    </div>`;
}
/* ---- as duas ações que precisam de dado antes de abrir o diálogo ---- */
/* PROMOVER: o pacote desenha a confirmação de UM garoto, não a lista.
   Quem escolhe continua sendo a tela da base do motor; aqui abrimos a
   confirmação já com o candidato que ela devolve. */
function rfAcPromover(){
  // A base sorteia UM LOTE por rodada (S._youthCandidates). O pacote
  // desenha a confirmação de um garoto, então abrimos com o mais forte do
  // lote. Sem lote — janela fechada, cota usada, elenco cheio — o diálogo
  // é o "não dá para promover", com o motivo que o motor dá. NUNCA cai no
  // modal antigo: ele não existe mais nesta pele.
  if(typeof youthAvailable!=='function' || !youthAvailable()){
    rfAcAbrir('elenco-semrenovar', {motivo:(typeof youthUnavailableMsg==='function')
      ? youthUnavailableMsg() : 'A base não tem ninguém pronto agora.'});
    return;
  }
  if(!(S._youthCandidates && S._youthCandidates.length && S._youthCandidatesRound===S.round)
     && typeof rollYouthCandidatesForRound==='function') rollYouthCandidatesForRound();
  // o candidato é um invólucro: o jogador de verdade mora em c.youth
  const c=(S._youthCandidates||[]).slice()
    .sort((a,b)=>((b.youth&&b.youth.f)||0)-((a.youth&&a.youth.f)||0))[0];
  const y=c&&c.youth;
  if(!y){ rfAcAbrir('elenco-semrenovar', {motivo:'A base não tem candidatos nesta rodada.'}); return; }
  rfAcAbrir('base-promover', {p:y, pronto:'agora',
    salario:(y.contract&&y.contract.salary)||y.salary||0, num:y.num});
}
function rfAcTreino(){
  const lista=(typeof myTrainingList==='function')?myTrainingList():[];
  rfAcAbrir('treino-confirmar', {semana:'Semana '+((S.round||0)+1),
    tema:'força', n:lista.length, custo:10});
}

/* ---- cabeçalho da página: o subtítulo conta o elenco, e as duas ações do
   pacote ficam no canto (a amarela leva pra Formação, que é onde se escala) ---- */
function rfElSubHTML(){
  const sq=squad(CL.clubId);
  const base=(S._youthCandidates&&S._youthCandidatesRound===S.round)?S._youthCandidates.length:0;
  const folha=sq.reduce((t,p)=>t+(typeof playerSalary==='function'?playerSalary(p):0),0);
  return `${sq.length} no principal · ${base} na base · folha ${fmt(folha)}/sem`;
}
function rfElAcoesHTML(){
  return `<div class="rf-mk-acoes">
    <button type="button" class="rf-btn rf-btn-secondary" onclick="rfElExportar()">${rfIcone('exportar',16)} Exportar elenco</button>
    <button type="button" class="rf-btn rf-btn-cta" onclick="rfGo('hub')">${rfIcone('jogar',16)} Ir para a formação</button>
  </div>`;
}
function rfElExportar(){
  const sq=squad(CL.clubId).slice().sort(bySquadOrder);
  const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};
  const linhas=sq.map(p=>[nums[p.pid]||p.num||'', p.n, rfPosInicial(p.s), p.age||'', p.f,
    Math.round(p.energy!=null?p.energy:100), rfMkSalario(p), rfMkFimContrato(p)].join(';'));
  const txt='numero;jogador;pos;idade;forca;energia;salario;fim\n'+linhas.join('\n');
  try{
    const a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(txt);
    a.download='elenco-'+(S.season||'')+'.csv'; a.click();
    toastC('Elenco exportado.');
  }catch(e){ toastC('Não deu pra exportar aqui.'); }
}
