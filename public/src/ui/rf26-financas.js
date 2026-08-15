/* =====================================================================
   RetroFoot98 — FINANÇAS, as cinco abas completas
   Marcação de telas-v3/Financas - Abas.dc.html, coluna por coluna.

   Resumo · Extrato · Histórico · Estádio · Patrocínio.

   As cinco abas empilham cartões de LARGURA CHEIA; onde o pacote põe duas
   peças lado a lado (ENTRA/SAI, preço do bilhete e obras, espaços livres e
   a nota do patrocínio), a grade é INTERNA ao cartão.

   A linha de tabela é a peça partilhada (.rf-el-row, grade vinda de
   --el-cols) e os blocos de número grande são o mesmo rfElStat do Elenco e
   do Treinador.

   O EXTRATO É POR RODADA, não por dia: S.finances guarda uma entrada por
   rodada fechada (income, salaries, opex, playerSales, playerPurchases,
   stadium, net, log) — não existe data de lançamento no motor. A coluna que
   o pacote chama de DATA mostra a jornada, que é a unidade em que o dinheiro
   de facto se move aqui.
   ===================================================================== */

function rfFiTotais(){
  const t=S.seasonTotals||{};
  const receita=(t.income||0)+(t.playerSales||0);
  const despesa=(t.salaries||0)+(t.bonuses||0)+(t.opex||0)+(t.playerPurchases||0)+(t.stadium||0);
  return {receita, despesa, saldo:receita-despesa};
}
/* linha de ENTRA/SAI: rótulo · barrinha proporcional ao maior item · valor */
function rfFiLinha(rot, valor, maior, cor){
  const pct=maior?Math.round(100*valor/maior):0;
  return `<div class="rf-fi-l">
    <span class="rf-fi-l-t">${escC(rot)}</span>
    <span class="rf-fi-l-b"><i style="width:${Math.max(valor?4:0,pct)}%;background:${cor}"></i></span>
    <span class="rf-fi-l-v">${escC(fmt(valor))}</span>
  </div>`;
}
function rfFiTotalHTML(valor, tom){
  return `<div class="rf-fi-total">
    <span class="rf-fi-total-t">Total</span>
    <span class="rf-fi-total-v ${tom}">${escC(fmt(valor))}</span>
  </div>`;
}

/* =====================================================================
   1 · RESUMO
   ===================================================================== */
function rfFiResumoHTML(){
  const {receita,despesa}=rfFiTotais();
  const t=S.seasonTotals||{};
  const ult=(S.finances||[])[0];
  const sq=squad(CL.clubId);
  const folha=sq.reduce((s,p)=>s+((p.contract&&p.contract.salary)||p.salary||0),0);
  const jornadas=(S.sched||[]).length||14;
  const faltam=Math.max(0,jornadas-(S.round||0));
  const rodadas=Math.max(1,S.round||1);
  const porRodada=Math.round((receita-despesa)/rodadas);
  const projecao=(S.budget||0)+porRodada*faltam;
  const entra=[['Receita da rodada', t.income||0],['Venda de jogadores', t.playerSales||0]];
  const sai=[['Folha salarial', t.salaries||0],['Bônus', t.bonuses||0],
             ['Custo operacional', t.opex||0],['Compra de jogadores', t.playerPurchases||0],
             ['Obras no estádio', t.stadium||0]];
  const maiE=Math.max.apply(null,entra.map(x=>x[1]).concat([1]));
  const maiS=Math.max.apply(null,sai.map(x=>x[1]).concat([1]));
  const delta=ult?ult.net:0;
  return `<div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">CAIXA</span>
        <span class="rf-label-r">${(S.round||0)}ª jornada de ${escC(String(S.season||''))}</span></div>
      <div class="rf-fi-caixa">
        <span class="rf-fi-caixa-v">${escC(fmt(S.budget||0))}</span>
        <span class="rf-fi-caixa-s ${delta>=0?'ok':'ruim'}">${ult
          ? ((delta>=0?'+':'')+fmt(delta)+' na última rodada')
          : 'sem movimento ainda'}</span>
      </div>
    </div>
    <div class="rf-fi-duo">
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">ENTRA</span></div>
        ${entra.map(([r,v])=>rfFiLinha(r,v,maiE,'var(--ok)')).join('')}
        ${rfFiTotalHTML(receita,'ok')}
      </div>
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">SAI</span>
          <span class="rf-label-r">folha atual ${escC(fmt(folha))}</span></div>
        ${sai.map(([r,v])=>rfFiLinha(r,v,maiS,'var(--danger)')).join('')}
        ${rfFiTotalHTML(despesa,'ruim')}
      </div>
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">PROJEÇÃO ATÉ O FIM DA TEMPORADA</span></div>
      <div class="rf-el-stats">
        ${rfElStat('SALDO PREVISTO', fmt(projecao), 'se manter o ritmo')}
        ${rfElStat('POR RODADA', (porRodada>=0?'+':'')+fmt(porRodada), 'média desta temporada')}
        ${rfElStat('JORNADAS QUE FALTAM', faltam, faltam?'até o fim da fase':'temporada encerrada')}
        ${rfElStat('FOLHA POR RODADA', fmt(folha), 'compromisso fixo')}
      </div>
    </div>`;
}

/* =====================================================================
   2 · EXTRATO
   Grade do pacote: 58 / lançamento / 74 / 92 / 92
   ===================================================================== */
const RF_FI_EXT_COLS='70px minmax(0,1.6fr) minmax(74px,.5fr) minmax(92px,.6fr) minmax(92px,.6fr)';
function rfFiExtratoHTML(){
  const fin=(S.finances||[]);
  let saldo=S.budget||0;
  const linhas=[];
  fin.forEach(f=>{
    const itens=[
      ['Receita da rodada', f.income||0, 1],
      ['Venda de jogadores', f.playerSales||0, 1],
      ['Folha salarial', -(f.salaries||0), -1],
      ['Custo operacional', -(f.opex||0), -1],
      ['Compra de jogadores', -(f.playerPurchases||0), -1],
      ['Obras no estádio', -(f.stadium||0), -1],
    ].filter(x=>x[1]);
    itens.forEach(([rot,valor])=>{
      const entrada=valor>0;
      linhas.push(`<div class="rf-el-row">
        <span class="rf-fi-data">${(f.round!=null?f.round:'—')}ª</span>
        <span class="rf-fi-lanc">${escC(rot)}${f.log?(' · '+escC(String(f.log).slice(0,40))):''}</span>
        <span class="rf-fi-tipo ${entrada?'entrada':'saida'}">${entrada?'ENTRADA':'SAÍDA'}</span>
        <span class="rf-fi-valor ${entrada?'ok':'ruim'}">${escC(fmt(Math.abs(valor)))}</span>
        <span class="rf-fi-saldo">${escC(fmt(saldo))}</span>
      </div>`);
    });
    saldo-=(f.net||0);
  });
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_FI_EXT_COLS}">
    <span>DATA</span><span>LANÇAMENTO</span><span>TIPO</span>
    <span class="dir">VALOR</span><span class="dir">SALDO</span>
  </div>`;
  return `<div class="rf-card rf-el-tbl" style="--el-cols:${RF_FI_EXT_COLS}">
      <div class="rf-label"><span class="rf-label-t">LANÇAMENTOS</span>
        <span class="rf-label-r">temporada de ${escC(String(S.season||''))}</span></div>
      ${cab}
      ${rfLista('extrato', linhas, 'Nenhuma rodada fechada ainda nesta temporada.')}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">FILTROS</span></div>
      <div class="rf-fi-filtros">
        <span class="rf-fi-filtro"><b>Temporada</b><span>${escC(String(S.season||''))}</span><i>▾</i></span>
        <span class="rf-fi-filtro"><b>Tipo</b><span>todos</span><i>▾</i></span>
        <span class="rf-fi-filtro"><b>Valor mínimo</b><span>${escC(fmt(0))}</span><i>▾</i></span>
        <div class="rf-sp"></div>
        <button type="button" class="rf-btn rf-btn-secondary" onclick="rfFiExportar()">${rfIcone('exportar',16)} Exportar extrato</button>
      </div>
    </div>`;
}
/* dinheiro miúdo (preço por lugar): o `fmt` encurta para k/M e transformava
   8 reais em "R$ 0k" */
function rfFiReais(v){
  const sim=(typeof curSym==='function')?curSym():'R$';
  const n=Math.round((typeof curConv==='function')?curConv(v||0):(v||0));
  return sim+' '+((typeof grp==='function')?grp(n):String(n));
}
function rfFiExportar(){
  const linhas=(S.finances||[]).map(f=>[f.round!=null?f.round:'', f.income||0, f.playerSales||0,
    f.salaries||0, f.opex||0, f.playerPurchases||0, f.stadium||0, f.net||0].join(';'));
  const txt='jornada;receita;vendas;salarios;operacional;compras;estadio;saldo\n'+linhas.join('\n');
  try{
    const a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(txt);
    a.download='extrato-'+(S.season||'')+'.csv'; a.click();
    toastC('Extrato exportado.');
  }catch(e){ toastC('Não deu pra exportar aqui.'); }
}

/* =====================================================================
   3 · HISTÓRICO
   Grade do pacote: 50 / 92 / 92 / 92 / 100
   ===================================================================== */
const RF_FI_HIST_COLS='60px minmax(92px,1fr) minmax(92px,1fr) minmax(92px,1fr) minmax(100px,1fr)';
function rfFiHistoricoHTML(){
  const ent=((S.financeHistory&&S.financeHistory[CL.clubId])||[]).slice().reverse();
  const atual={season:S.season, budget:S.budget||0, receita:rfFiTotais().receita,
    despesa:rfFiTotais().despesa};
  const todas=[atual].concat(ent.map(e=>({season:e.season, budget:e.budget||e.caixa||0,
    receita:e.receita||e.income||0, despesa:e.despesa||e.expenses||0})));
  const linhas=todas.map((e,i)=>{
    const saldo=(e.receita||0)-(e.despesa||0);
    return `<div class="rf-el-row ${i===0?'sel':''}">
      <span class="rf-fi-ano ${i===0?'agora':''}">${escC(String(e.season||''))}</span>
      <span class="rf-fi-cel forte">${escC(fmt(e.budget||0))}</span>
      <span class="rf-fi-cel">${escC(fmt(e.receita||0))}</span>
      <span class="rf-fi-cel">${escC(fmt(e.despesa||0))}</span>
      <span class="rf-fi-cel ${saldo>=0?'ok':'ruim'}">${(saldo>=0?'+':'')+escC(fmt(saldo))}</span>
    </div>`;
  }).join('');
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_FI_HIST_COLS}">
    <span>ANO</span><span class="dir">CAIXA FINAL</span><span class="dir">RECEITAS</span>
    <span class="dir">DESPESAS</span><span class="dir">SALDO</span>
  </div>`;
  // EVOLUÇÃO DO CAIXA: uma barra por rodada fechada, a última em destaque
  const fin=(S.finances||[]).slice().reverse();
  let acc=(S.budget||0)-fin.reduce((t,f)=>t+(f.net||0),0);
  const pontos=fin.map(f=>{ acc+=(f.net||0); return {r:f.round, v:acc}; });
  const maior=Math.max.apply(null,pontos.map(p=>p.v).concat([1]));
  const barras=pontos.map((p,i)=>`<span class="rf-fi-barra ${i===pontos.length-1?'agora':''}"
    style="height:${Math.max(6,Math.round(100*p.v/maior))}%" title="${escC(fmt(p.v))}"></span>`).join('');
  const eixo=pontos.length?`<div class="rf-fi-eixo">
      <span>${pontos[0].r||1}ª</span>
      <span>${pontos[Math.floor(pontos.length/2)].r||''}ª</span>
      <span>${pontos[pontos.length-1].r||''}ª</span>
    </div>`:'';
  return `<div class="rf-card rf-el-tbl" style="--el-cols:${RF_FI_HIST_COLS}">
      <div class="rf-label"><span class="rf-label-t">POR TEMPORADA</span>
        <span class="rf-label-r">${todas.length} ${todas.length===1?'ano':'anos'}</span></div>
      ${cab}
      ${linhas}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">EVOLUÇÃO DO CAIXA</span>
        <span class="rf-label-r">${pontos.length?('últimas '+pontos.length+' rodadas'):'sem rodadas'}</span></div>
      ${pontos.length
        ? `<div class="rf-fi-graf">${barras}</div>${eixo}`
        : '<div class="rf-empty">O gráfico aparece quando a primeira rodada fechar.</div>'}
    </div>`;
}

/* =====================================================================
   4 · ESTÁDIO
   ===================================================================== */
function rfFiEstadioHTML(){
  const st=(typeof myStadium==='function')?myStadium():null;
  const cap=(st&&st.capacity)||(typeof STAND_START!=='undefined'?STAND_START:0);
  const max=(typeof stadiumMaxCapacity==='function')?stadiumMaxCapacity():cap;
  const custo=(typeof standCost==='function')?standCost():0;
  const foto=(typeof stadiumPhotoFor==='function')?stadiumPhotoFor(CL.clubId):'';
  const cl=clubOf(CL.clubId)||{short:'—'};
  const att=CL.lastAtt||0;
  const ocup=cap&&att?Math.round(att/cap*100):0;
  /* O PREÇO VEM DA DIVISÃO, e é o motor que o diz. `CL.ticket` é uma cópia
     recalculada a cada carregamento (ver main.js) e o motor nunca a lê: a
     bilheteria usa `ticketPriceForDivision(div)`, uma tabela fixa
     (A:25 · B:20 · C:15 · D:10). Ler daqui é ler da mesma fonte que paga. */
  const preco=(typeof ticketPriceForDivision==='function')
    ? ticketPriceForDivision(S.division) : (CL.ticket||0);
  const casa=(S.results||[]).filter(r=>r.h===CL.clubId);
  const publicos=casa.map(r=>r.att||0).filter(Boolean);
  const medio=publicos.length?Math.round(publicos.reduce((a,b)=>a+b,0)/publicos.length):0;
  const maiorP=publicos.length?Math.max.apply(null,publicos):0;
  const receita=(S.seasonTotals&&S.seasonTotals.gate)||0;
  /* O PREÇO DO BILHETE NÃO É UMA ESCOLHA DESTE JOGO.
     Aqui havia três faixas clicáveis — 25% abaixo, o preço de hoje, 30% acima —
     com o efeito no público ao lado. Nenhuma delas mudava coisa nenhuma: as
     três chamavam `clTicketPrice && clTicketPrice()`, e `clTicketPrice` NÃO
     EXISTE — o `&&` transformava o clique num silêncio. E não podia existir:
     a bilheteria do motor é `att × ticketPriceForDivision(div)`, uma tabela
     fixa por divisão que o jogador não toca.
     De caminho, os três valores saíam como "R$ 0k": o preço é por lugar (8, 10,
     25 reais) e estava a passar pelo `fmt`, que encurta para milhares.
     No lugar da escolha falsa fica a tabela verdadeira — o que se paga em cada
     divisão — que responde à única pergunta real: quanto rende subir. */
  const TAB_PRECO=[['A','Série A',25],['B','Série B',20],['C','Série C',15],['D','Série D',10]];
  return `<div class="rf-card rf-fi-est">
      <div class="rf-fi-est-foto"${foto?` style="background-image:url('${escC(foto)}')"`:''}>
        <span class="rf-fi-est-veu"></span>
        <div class="rf-fi-est-id">
          <span class="rf-fi-est-n">${escC(rfObEstadioNome(cl,st))}</span>
          <span class="rf-fi-est-s">CAPACIDADE ${grp(cap)}${ocup?' · OCUPAÇÃO MÉDIA '+ocup+'%':''}</span>
        </div>
      </div>
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">BILHETERIA</span></div>
      <div class="rf-el-stats">
        ${rfElStat('PÚBLICO MÉDIO', medio?grp(medio):'—', casa.length+' jogo'+(casa.length===1?'':'s')+' em casa')}
        ${rfElStat('MAIOR PÚBLICO', maiorP?grp(maiorP):'—', maiorP?'nesta temporada':'ainda sem jogo em casa')}
        ${rfElStat('PREÇO DO BILHETE', rfFiReais(preco), 'por lugar')}
        ${rfElStat('RECEITA NO ANO', receita?fmt(receita):'—', 'só bilheteria')}
      </div>
    </div>
    <div class="rf-fi-duo">
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">PREÇO DO BILHETE</span>
          <span class="rf-label-r">definido pela divisão</span></div>
        ${TAB_PRECO.map(([d,nome,v])=>`<div class="rf-fi-preco ${d===S.division?'on':''}">
          <span class="rf-fi-preco-v">${escC(rfFiReais(v))}</span>
          <span class="rf-fi-preco-o">${escC(nome)}</span>
          <span class="rf-fi-preco-r">${d===S.division?'a sua divisão':(v>preco?'subindo':'abaixo')}</span>
        </div>`).join('')}
        <span class="rf-note">A bilheteria de cada jogo é <b>público × preço</b>. O preço não se
          escolhe: sobe quando o clube sobe de divisão.</span>
      </div>
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">OBRAS</span></div>
        <button type="button" class="rf-fi-obra" onclick="clBuildStand&&clBuildStand()" ${cap>=max?'disabled':''}>
          <span class="rf-fi-obra-n">${cap>=max?'No teto de expansão':'Nova bancada'}</span>
          <span class="rf-fi-obra-v">${escC(fmt(custo))}</span>
          <span class="rf-fi-obra-p">+5.000</span>
        </button>
        <div class="rf-fi-obra estatica">
          <span class="rf-fi-obra-n">Teto de expansão</span>
          <span class="rf-fi-obra-v">${grp(max)}</span>
          <span class="rf-fi-obra-p">lugares</span>
        </div>
        <div class="rf-fi-obra estatica">
          <span class="rf-fi-obra-n">Capacidade de hoje</span>
          <span class="rf-fi-obra-v">${grp(cap)}</span>
          <span class="rf-fi-obra-p">lugares</span>
        </div>
      </div>
    </div>`;
}

/* =====================================================================
   5 · PATROCÍNIO
   OS ESPAÇOS SÃO O CÁLCULO DO JOGO, não contratos assinados: o motor não
   guarda contrato com marca e vencimento. O que existe é quanto cada espaço
   RENDE, por capacidade e divisão. As marcas do inventário (AD_SPONSORS) são
   publicidade da tela, não do save — por isso entram como a arte do espaço
   ocupado, e o vencimento fica em traço.
   ===================================================================== */
function rfFiPatrocinioHTML(){
  const st=(typeof myStadium==='function')?myStadium():null;
  const cap=(st&&st.capacity)||(typeof STAND_START!=='undefined'?STAND_START:20000);
  const peso={A:8,B:4,C:2,D:1}[S.division]||1;
  const base=Math.round(cap*peso*0.7);
  const marcas=(typeof AD_SPONSORS!=='undefined')?AD_SPONSORS:[];
  const ativos=[
    {nome:'Camisa', papel:'Patrocinador principal', valor:base*2},
    {nome:'Manga',  papel:'Manga da camisa',        valor:Math.round(base*1.3)},
    {nome:'Placas', papel:'Placas do estádio',      valor:base},
  ];
  const total=ativos.reduce((t,e)=>t+e.valor,0);
  const livres=[
    {nome:'Calção', valor:Math.round(base*.35)},
    {nome:'Boné de treino', valor:Math.round(base*.12)},
  ];
  return `<div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">CONTRATOS ATIVOS</span>
        <span class="rf-label-r">${ativos.length} · ${escC(fmt(total))}/temporada</span></div>
      ${ativos.map((e,i)=>{
        const m=marcas[i%Math.max(1,marcas.length)];
        return `<div class="rf-fi-contrato">
          <span class="rf-fi-marca">${m?`<img src="${escC(m.src)}" alt="${escC(m.nome)}">`:'—'}</span>
          <span class="rf-fi-contrato-id">
            <span class="rf-fi-contrato-n">${escC(m?m.nome:e.nome)}</span>
            <span class="rf-fi-contrato-p">${escC(e.papel)}</span>
          </span>
          <span class="rf-fi-contrato-v">${escC(fmt(e.valor))}/temp.</span>
          <span class="rf-fi-contrato-d">—</span>
          <span class="rf-fi-selo ativo">ATIVO</span>
        </div>`;
      }).join('')}
    </div>
    <div class="rf-fi-duo">
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">ESPAÇOS LIVRES</span>
          <span class="rf-label-r">${livres.length}</span></div>
        ${livres.map(e=>`<div class="rf-fi-livre">
          <span class="rf-fi-livre-i">＋</span>
          <span class="rf-fi-livre-id">
            <span class="rf-fi-livre-n">${escC(e.nome)}</span>
            <span class="rf-fi-livre-v">${escC(fmt(e.valor))}/temporada estimados</span>
          </span>
        </div>`).join('')}
      </div>
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">COMO AUMENTAR O PATROCÍNIO</span></div>
        <span class="rf-fi-texto">Subir de divisão multiplica o valor dos espaços — o peso da
          ${escC(divisionLabel())} é o que manda na conta. Estádio maior também paga mais, porque o
          cálculo usa a capacidade: cada bancada nova entra no valor da temporada seguinte.</span>
      </div>
    </div>`;
}

/* ---- cabeçalho da página ---- */
function rfFiSubHTML(){
  const sq=squad(CL.clubId);
  const folha=sq.reduce((s,p)=>s+((p.contract&&p.contract.salary)||p.salary||0),0);
  const ult=(S.finances||[])[0];
  const saldo=ult?ult.net:0;
  return `Caixa ${fmt(S.budget||0)} · folha ${fmt(folha)}/rodada · saldo ${(saldo>=0?'+':'')+fmt(saldo)} na última`;
}
function rfFiAcoesHTML(){
  return `<div class="rf-mk-acoes">
    <button type="button" class="rf-btn rf-btn-secondary" onclick="rfFiExportar()">${rfIcone('exportar',16)} Exportar balanço</button>
    <button type="button" class="rf-btn rf-btn-cta" onclick="rfSetTab('financas','extrato')">${rfIcone('financas',16)} Ver extrato</button>
  </div>`;
}
