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
/* A COLUNA MOSTRAVA V/E/D — vitoria, empate, derrota — que e forma de TIME.
   Aplicada a um jogador nao dizia nada: ela pegava as ultimas tres NOTAS dele
   (p.stats.r3) e reduzia cada uma a uma letra, com o corte em 6. Quem jogou
   com 6,1 e quem jogou com 9,4 apareciam iguais, ambos "V", e a informacao
   que o motor tinha — a nota — perdia-se na traducao.

   Agora e a MEDIA das notas, que e o que playerForma() ja calculava no motor
   e nunca chegava a esta tabela. `stats.r3` guarda so os ultimos tres jogos,
   entao e a media dos tres — e o que existe; nao ha media de temporada
   gravada em lado nenhum. Sem jogo nenhum fica travessao.
   As faixas de cor sao as mesmas do resto do jogo (notaCls): 7,5 destaque ·
   6,8 portao da evolucao · 6 abaixo disso foi mal. */
function rfElForma(p){
  const n=(typeof playerForma==='function')?playerForma(p):null;
  const jogos=((p.stats&&p.stats.r3)||[]).length;
  const cls=(typeof notaCls==='function')?notaCls(n):'na';
  const txt=(typeof notaTxt==='function')?notaTxt(n):(n==null?'—':String(n));
  const titulo=n==null
    ? 'Ainda não jogou nesta temporada'
    : ('Média das notas dos últimos '+jogos+' jogo'+(jogos===1?'':'s'));
  return `<span class="rf-el-forma"><span class="rf-el-nota ${cls}" title="${escC(titulo)}">${escC(txt)}</span></span>`;
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
  return `<div class="rf-card rf-el-tbl" data-el="elenco" style="--el-cols:${RF_EL_COLS}">
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
   RENOVAR CONTRATO — o botão existia, a renovação não acontecia.

   `elenco-renovar` desenhava o salário, os anos e a chance de aceitar, e o
   botão "Oferecer renovação" não tinha `on:` nenhum: fechava o diálogo e o
   contrato ficava exatamente como estava. É o mesmo defeito que o "Promover"
   da Base tinha — a tela inteira construída, sem o fio até ao motor.

   Aqui não há função pronta para reaproveitar: o `clRenewPropose` da pele
   antiga lê `CL.newSalary`, um estado que só o painel antigo preenchia, e fixa
   três anos. Esta faz o mesmo trabalho a partir dos campos do diálogo novo, com
   a mesma regra de caixa e o mesmo efeito na moral.

   A CHANCE DE ACEITAR É REAL. O diálogo mostra uma percentagem; se ela fosse
   decorativa, oferecer o mínimo teria o mesmo resultado que oferecer o dobro.
   O sorteio usa a mesma conta que a tela imprime.
   ===================================================================== */
function rfElRenovarGo(pid){
  const p=squad(CL.clubId).find(x=>String(x.pid)===String(pid));
  if(!p){ toastC('Esse jogador não está mais no elenco.'); CL.acao=null; cdraw(); return; }
  const salAtual=(p.contract&&p.contract.salary)||p.salary||0;
  const novo=(typeof rfMkVal==='function')?rfMkVal('rf-ac-novo'):0;
  const anosEl=document.querySelector('#rf-ac-anos');
  const anos=Math.max(1,Math.min(6,parseInt(anosEl&&anosEl.textContent,10)||3));
  if(novo<=0){ toastC('Digite o novo salário.'); return; }
  if(novo<Math.round(salAtual*0.9)){
    toastC(`${p.n} não escuta menos do que ganha hoje.`); return; }

  /* CAIXA: a renovação não pode ser assinada com o clube no vermelho e a folha
     a subir — mesma regra do caminho antigo (clRenewPropose). */
  const semanas=(S.sched&&S.sched.length)||38;
  const extra=(novo-salAtual)*semanas*anos;
  if((S.budget||0)<0 && extra>0){ toastC('⚠️ Caixa insuficiente para renovar este contrato.'); return; }

  const chance=rfElChanceRenovar(p, novo);
  const R=(typeof makeRng==='function')?makeRng(hashSeed(S.seed,'renova',p.pid,S.round)):null;
  const sorte=R?R.random()*100:Math.random()*100;
  if(sorte>chance){
    p.moral=Math.max(0,(p.moral||70)-3);
    rfGravar();
    CL.acao=null;
    toastC(`${p.n} recusou a proposta. Ele quer mais.`);
    cdraw(); return;
  }
  p.contract=Object.assign({}, p.contract||{}, {salary:novo, years:anos});
  p.moral=Math.min(100,(p.moral||70)+6);
  S.roundNews=S.roundNews||[];
  S.roundNews.push(`✍️ ${p.n} renovou contrato: ${fmt(novo)}/mês por ${anos} ano${anos>1?'s':''}.`);
  rfGravar();
  CL.acao=null;
  rfAcAbrir('elenco-renovado', {nome:p.n, salario:novo, ate:(S.season||2026)+anos});
}
/* a mesma conta que o diálogo imprime — uma fonte só para o número e o sorteio */
function rfElChanceRenovar(p, novo){
  const sal=(p.contract&&p.contract.salary)||p.salary||0;
  return Math.max(5,Math.min(95, 50 + Math.round((novo-sal)/Math.max(1,sal)*140) - Math.max(0,(p.f||0)-70)));
}

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
        <!-- Renovar é a ação que se quer: leva o amarelo padrão dos botões do jogo.
             Listar para venda é a que desfaz o elenco: leva o vermelho claro, que
             avisa sem gritar. Antes estavam ao contrário — vender era o amarelo. -->
        <button type="button" class="rf-btn rf-btn-cta" onclick="rfAcAbrir('elenco-renovar',{pid:'${escC(p.pid)}'})">Renovar contrato</button>
        <button type="button" class="rf-btn rf-btn-vender" onclick="rfAcAbrir('mkt-listar',{pid:'${escC(p.pid)}'})">Listar para venda</button>
      </div>
    </div>`
  + rfCol(
    rfCard('Atributos', `
      ${rfElBarra('Força', p.f, 100*(p.f||0)/topo, 'var(--club-primary)')}
      ${rfElBarra('Energia', en+'%', en, rfEnergiaCor(en))}
      ${rfElBarra('Moral', moral, moral, 'var(--club-secondary)')}
      <span class="rf-note">O RetroFoot98 avalia o jogador por UMA força, do jeito clássico —
        não por atributos separados. Força, energia e moral são o que entra na conta da partida.</span>`)
    /* QUATRO BLOCOS, COMO NO PACOTE — mas o quarto dele é ASSISTÊNCIAS, e o
       motor não regista assistência nenhuma (p.stats guarda r3, g3, apps, goals
       e cs). Com três, o terceiro ficava órfão numa grade de dois em dois.
       O quarto passa a ser o que existe de verdade: jogos sem sofrer gol para
       o goleiro, jogos disputados para o resto. */
    + rfCard('Na temporada', (()=>{
        const gols=(S.scorers&&S.scorers[p.n])||0, apps=st.apps||0;
        const ehGK=p.s==='GK';
        const media4=(gols&&apps)?('1 a cada '+Math.max(1,Math.round(apps/gols))+' jogos'):'';
        return `<div class="rf-kpis">
        ${rfKpiHTML('Gols', String(gols), media4)}
        ${rfKpiHTML('Nota média', media?media.toFixed(1).replace('.',','):'—',
          melhor&&melhor.pid===p.pid?'melhor do elenco':'')}
        ${rfKpiHTML('Cartões', (tot.yellows||0)+'A '+(tot.reds||0)+'V', '')}
        ${ehGK ? rfKpiHTML('Sem sofrer gol', String(st.cs||0), apps?('de '+apps+' jogos'):'')
               : rfKpiHTML('Jogos', String(apps), 'na temporada')}
      </div>`;})())
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
  /* ARREDONDADO. A forca do motor e fracionaria (33.509940930...) e o teto
     herdava as casas todas — a tela mostrava "pode chegar a 41.8199404". Numero
     de forca le-se inteiro; a precisao interna continua intacta no motor. */
  const teto=Math.round(Math.min(99,(y.f||0)+porTemp*anos));
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
    /* A ESCOLHA É DE QUEM JOGA. Todas as linhas chamavam `rfAcPromover()` sem
       argumento, e essa função abria sempre o mais forte do lote: clicar no
       terceiro garoto abria a ficha do primeiro. E a segunda e a terceira linha
       diziam "Ver", que não levava a lado nenhum diferente. Agora cada linha
       leva o seu índice e todas dizem Promover — são três candidatos, e o lote
       só dá para promover um. */
    const primeiro=i===(CL.baseSel||0);
    const sal=(c.contract&&c.contract.salary)||y.salary||0;
    return `<div class="rf-el-row ${primeiro?'sel':''}" onclick="rfBaseSel(${i})">
      <span class="rf-el-nome">${escC(y.n)}</span>
      <span class="rf-el-c">${escC(rfPosInicial(y.s))}</span>
      <span class="rf-el-c">${y.age||'—'}</span>
      <span class="rf-el-forte">${y.f}</span>
      ${rfElMini(pot.pct, rfElTom(pot.pct), 62)}
      <span class="rf-el-d">${pot.anos?(pot.anos+' ano'+(pot.anos>1?'s':'')):'agora'}</span>
      <span class="rf-el-d">${escC(sal?rfDin(sal):'—')}</span>
      <span class="rf-el-act"><button type="button" class="rf-el-bt ${primeiro?'cta':''}"
        onclick="event.stopPropagation();rfAcPromover(${i})">Promover</button></span>
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
  return `<div class="rf-card rf-el-tbl" data-el="base" style="--el-cols:${RF_BASE_COLS}">
      <div class="rf-label"><span class="rf-label-t">CATEGORIA DE BASE</span>
        <span class="rf-label-r">${cands.length} em formação</span></div>
      ${cab}
      ${linhas || `<div class="rf-empty">${escC((typeof youthUnavailableMsg==='function'&&!disp)?youthUnavailableMsg():'A base não tem candidatos nesta semana.')}</div>`}
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

   ESTA TELA EXPLICAVA TRÊS MECÂNICAS QUE NÃO EXISTEM.

   Havia um "FOCO DO TREINO" com três temas e promessas concretas ("+2 na
   finalização de até 3 atacantes"), que o próprio código admitia não estarem
   ligados a nada. Havia um bloco "CUSTO E RISCO" a dizer que o treino gasta
   energia e dobra o risco de lesão — o motor não cobra energia nenhuma. E
   havia um diálogo de confirmação semanal com "−10% de energia por jogador",
   igualmente inventado. Por cima disso tudo, a coluna PROGRESSO mostrava
   `rodada % 38 / 38`: o andamento da TEMPORADA, idêntico em todas as linhas.

   O que o motor faz é uma coisa só, e cabe numa frase: até três jogadores em
   treino, e quem está em treino ganha um sorteio extra de evolução por rodada
   (5%, ou 9% com destaque). Sem custo. É isso que a tela passa a dizer.

   O resto do ecrã agora vem de `growthProfileOf(p)`, que é o mesmo cálculo do
   `evolvePlayer` lido de fora: dá a chance real por fonte e o ganho de força
   por temporada. Números do motor, não promessas.
   ===================================================================== */
const RF_TRN_COLS='34px minmax(0,1.2fr) 34px 40px minmax(74px,.5fr) minmax(0,1fr) minmax(74px,.5fr)';
/* "+1,7 força" / "sem ganho previsto" */
function rfTrnGanho(g){
  const v=Math.round(((g&&g.forcaPorTemporada)||0)*10)/10;
  if(!v) return {txt:'sem ganho previsto', v:0};
  const sinal=v>0?'+':'−';
  return {txt:sinal+String(Math.abs(v)).replace('.',',')+' força por temporada', v};
}
/* a chance do sorteio do treino, em percentagem inteira */
function rfTrnChance(p){
  const star=(typeof hasEstrelinha==='function')&&hasEstrelinha(p);
  return {pct:star?9:5, star};
}
function rfElTreinoHTML(){
  const lista=(typeof myTrainingList==='function')?myTrainingList():[];
  const max=(typeof TRAINING_MAX_SLOTS!=='undefined')?TRAINING_MAX_SLOTS:3;
  const sq=squad(CL.clubId);
  const emTreino=new Set(lista.map(String));
  const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};

  /* A LISTA É O ELENCO INTEIRO, ordenado por quem mais cresce agora — e não só
     os três já escolhidos. Antes, para pôr alguém em treino era preciso achar um
     botão que abria OUTRO ecrã com outra lista; a escolha e a consequência
     viviam em sítios diferentes. Aqui vê-se, na mesma linha, quanto o jogador
     cresce e o botão que o põe a treinar. */
  const comG=sq.map(p=>({p, g:(typeof growthProfileOf==='function')?growthProfileOf(p):null}))
    .sort((a,b)=>{
      const ta=emTreino.has(String(a.p.pid))?1:0, tb=emTreino.has(String(b.p.pid))?1:0;
      if(ta!==tb) return tb-ta;                       // quem já treina fica em cima
      return ((b.g&&b.g.forcaPorTemporada)||0)-((a.g&&a.g.forcaPorTemporada)||0);
    });

  const linhas=comG.map(({p,g})=>{
    const treina=emTreino.has(String(p.pid));
    const ganho=rfTrnGanho(g);
    const ch=rfTrnChance(p);
    const cheio=lista.length>=max;
    return `<div class="rf-el-row ${treina?'sel':''}">
      ${rfElCamisa(nums[p.pid]||p.num||'')}
      <!-- o crescimento aparece DUAS vezes de propósito: como coluna no
           computador e como segunda linha do nome no telefone, onde a coluna
           de ação fica presa à direita e taparia a coluna. Só uma delas está
           visível de cada vez (ver rf26.css). -->
      <span class="rf-el-nome">${escC(p.n)}${ch.star?' <i class="rf-trn-star" title="Destaque: evolui mais rápido">★</i>':''}
        <i class="rf-el-sub ${ganho.v<0?'cai':(ganho.v>0?'sobe':'')}">${escC(ganho.txt)}</i></span>
      <span class="rf-el-c">${escC(rfPosInicial(p.s))}</span>
      <span class="rf-el-forte">${p.f}</span>
      <span class="rf-el-c">${p.age||'—'} anos</span>
      <span class="rf-el-ganho ${ganho.v<0?'cai':(ganho.v>0?'sobe':'')}">${escC(ganho.txt)}</span>
      <span class="rf-el-act"><button type="button"
        class="rf-el-bt ${treina?'perigo':'cta'}" ${(!treina&&cheio)?'disabled title="As 3 vagas estão ocupadas"':''}
        onclick="event.stopPropagation();rfTrnToggle('${escC(p.pid)}')">${treina?'Tirar':'Treinar'}</button></span>
    </div>`;
  }).join('');

  const cab=`<div class="rf-el-head" style="--el-cols:${RF_TRN_COLS}">
    <span></span><span>JOGADOR</span><span>POS</span><span class="dir">FOR</span>
    <span class="dir">IDADE</span><span class="dir">CRESCIMENTO PREVISTO</span><span></span>
  </div>`;

  /* Quem está em treino, dito por extenso: nome e a chance dele. Três linhas,
     não uma tabela — é a resposta a "o que é que eu estou a ganhar com isto". */
  const dentro=lista.map(pid=>{
    const p=sq.find(x=>x.pid===pid); if(!p) return '';
    const ch=rfTrnChance(p);
    return `<div class="rf-linha"><span class="rf-linha-t">${escC(p.n)}${ch.star?' ★':''}</span>
      <span class="rf-linha-v">+${ch.pct}% de evoluir por semana</span></div>`;
  }).join('');

  return `<div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">COMO FUNCIONA</span>
        <span class="rf-label-r">${lista.length} de ${max} vagas</span></div>
      <span class="rf-el-texto">Até <b>${max} jogadores</b> podem estar em treino especial ao mesmo
        tempo. Quem está em treino ganha <b>um sorteio extra de evolução por semana</b> — 5% de
        chance, ou 9% para quem é destaque (★). <b>Não custa dinheiro nem energia</b>, e pode-se
        trocar quem treina quando se quiser.</span>
      ${dentro || '<span class="rf-note">Ninguém em treino. As três vagas estão livres.</span>'}
    </div>
    <div class="rf-card rf-el-tbl" data-el="treino" style="--el-cols:${RF_TRN_COLS}">
      <div class="rf-label"><span class="rf-label-t">QUEM PODE TREINAR</span>
        <span class="rf-label-r">do que mais cresce ao que menos cresce</span></div>
      ${cab}
      ${linhas || '<div class="rf-empty">Elenco vazio.</div>'}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">DE ONDE VEM O CRESCIMENTO</span></div>
      <span class="rf-el-texto">A força não sobe sozinha: o jogador ganha ponto de atributo, e a
        força é a média deles. <b>Jogar bem</b> é a maior fonte — nota acima de 6,8 dá dois
        sorteios por semana. <b>Ter até 20 anos</b> dá um sorteio mesmo sem jogar. O
        <b>treino especial</b> soma o dele por cima. A partir dos <b>29 anos</b> começa o
        desgaste, e quem passa <b>4 semanas seguidas fora do time</b> perde ritmo — treinar
        protege dessa perda.</span>
    </div>`;
}
function rfTrnToggle(pid){
  const lista=(typeof myTrainingList==='function')?myTrainingList():[];
  const treina=lista.map(String).indexOf(String(pid))>=0;
  if(treina){
    if(typeof stopTraining==='function') stopTraining(pid);
    const p=squad(CL.clubId).find(x=>String(x.pid)===String(pid));
    toastC((p?p.n:'Jogador')+' saiu do treino especial.');
  }else{
    const r=(typeof startTraining==='function')?startTraining(pid):{ok:false,msg:'Treino indisponível.'};
    toastC(r.msg||'');
    if(!r.ok){ cdraw(); return; }
  }
  rfGravar();
  cdraw();
}
/* ---- as duas ações que precisam de dado antes de abrir o diálogo ---- */
/* PROMOVER: o pacote desenha a confirmação de UM garoto, não a lista.
   Quem escolhe continua sendo a tela da base do motor; aqui abrimos a
   confirmação já com o candidato que ela devolve. */
function rfAcPromover(idx){
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
  const lote=S._youthCandidates||[];
  const i=(idx!=null && lote[idx]) ? idx : (CL.baseSel||0);
  const c=lote[i];
  const y=c&&c.youth;
  if(!y){ rfAcAbrir('elenco-semrenovar', {motivo:'A base não tem candidatos nesta semana.'}); return; }
  const pot=rfElPotencial(y);
  rfAcAbrir('base-promover', {idx:i, p:y, pronto:pot.anos?(pot.anos+' ano'+(pot.anos>1?'s':'')):'agora',
    teto:pot.teto, salario:(c.contract&&c.contract.salary)||y.salary||0, num:y.num});
}
function rfBaseSel(i){ CL.baseSel=i; cdraw(); }
/* A PROMOÇÃO ACONTECE AQUI — e antes não acontecia em lado nenhum. O diálogo
   `base-promover` tinha o botão "Promover" sem `on:` nenhum: clicava, fechava,
   e o garoto continuava na base. O motor já tinha tudo pronto
   (`confirmYouthPromotion`), faltava o fio. */
function rfBasePromoverGo(idx){
  const c=(S._youthCandidates||[])[idx];
  if(!c || !c.youth){ toastC('Esse candidato não está mais disponível.'); CL.acao=null; cdraw(); return; }
  if(typeof youthAvailable==='function' && !youthAvailable()){
    toastC((typeof youthUnavailableMsg==='function')?youthUnavailableMsg():'Não dá para promover agora.');
    CL.acao=null; cdraw(); return;
  }
  const nome=c.youth.n, forca=c.youth.f;
  try{ confirmYouthPromotion(c); }
  catch(e){ toastC('Não foi possível promover: '+(e&&e.message||'erro')); CL.acao=null; cdraw(); return; }
  CL.baseSel=0; CL.acao=null;
  toastC('🌱 '+nome+' subiu para o elenco principal (força '+forca+').');
  cdraw();
}
/* `rfAcTreino` saiu com o resto do treino inventado: ela abria o diálogo
   `treino-confirmar`, que anunciava "−10% de energia por jogador" — um custo
   que o motor nunca cobrou. Pôr e tirar do treino agora acontece na própria
   linha da tabela (rfTrnToggle), sem confirmação, porque não há nada a
   confirmar: a troca é reversível e não custa nada. */

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
