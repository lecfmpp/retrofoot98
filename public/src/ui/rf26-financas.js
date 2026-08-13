/* =====================================================================
   RetroFoot98 — FINANÇAS, as cinco abas completas
   Portado de telas/Financas - Abas.html.

   Resumo · Extrato · Histórico · Estádio · Patrocínio.

   O EXTRATO É POR RODADA, não por dia. S.finances guarda uma entrada por
   rodada fechada (income, salaries, opex, playerSales, playerPurchases,
   stadium, net, log) — não existe data de lançamento no motor. A coluna
   que a referência chama de DATA mostra a jornada, que é a unidade em que
   o dinheiro realmente se move aqui.
   ===================================================================== */

function rfFiTotais(){
  const t=S.seasonTotals||{};
  const receita=(t.income||0)+(t.playerSales||0);
  const despesa=(t.salaries||0)+(t.bonuses||0)+(t.opex||0)+(t.playerPurchases||0)+(t.stadium||0);
  return {receita, despesa, saldo:receita-despesa};
}

/* =====================================================================
   1 · RESUMO
   ===================================================================== */
function rfFiResumoHTML(){
  const {receita,despesa,saldo}=rfFiTotais();
  const t=S.seasonTotals||{};
  const ult=(S.finances||[])[0];
  const sq=squad(CL.clubId);
  const folha=sq.reduce((s,p)=>s+((p.contract&&p.contract.salary)||p.salary||0),0);
  const jornadas=(S.sched||[]).length||14;
  const faltam=Math.max(0,jornadas-(S.round||0));
  const linha=(l,v,tom)=>`<div class="rf-linha">
    <span class="rf-linha-t">${escC(l)}</span>
    <span class="rf-linha-v ${tom||''}">${escC(fmt(v))}</span></div>`;
  // PROJEÇÃO: caixa de hoje mais o que as rodadas que faltam devem render,
  // usando a média por rodada desta temporada — sem inventar cenário.
  const rodadas=Math.max(1,S.round||1);
  const porRodada=Math.round((receita-despesa)/rodadas);
  const projecao=(S.budget||0)+porRodada*faltam;
  return rfCol(
    rfCard('Caixa', `
      <div class="rf-fi-caixa">
        <span class="rf-fi-caixa-v">${escC(fmt(S.budget||0))}</span>
        <span class="rf-fi-caixa-s ${ult&&ult.net>=0?'ok':'ruim'}">${ult?((ult.net>=0?'+':'')+fmt(ult.net)+' na última rodada'):'sem movimento ainda'}</span>
      </div>`, {right: (S.round||0)+'ª jornada'})
    + rfCard('Projeção até o fim da temporada', `
      <div class="rf-kpis">
        ${rfKpiHTML('Hoje', fmt(S.budget||0), 'em caixa')}
        ${rfKpiHTML('Por rodada', (porRodada>=0?'+':'')+fmt(porRodada), 'média desta temporada')}
        ${rfKpiHTML('No fim', fmt(projecao), faltam+' jornada'+(faltam===1?'':'s')+' pela frente')}
      </div>
      <span class="rf-note">A projeção repete a média desta temporada nas rodadas que faltam.
        Não considera acesso, queda nem cota de copa — essas entram quando acontecem.</span>`)
  ) + rfCol(
    rfCard('Entra',
      linha('Receita da rodada', t.income||0)
      + linha('Venda de jogadores', t.playerSales||0)
      + `<div class="rf-linha forte"><span class="rf-linha-t">Total</span>
          <span class="rf-linha-v ok">${escC(fmt(receita))}</span></div>`)
    + rfCard('Sai',
      linha('Salários', t.salaries||0)
      + linha('Bônus', t.bonuses||0)
      + linha('Custo operacional', t.opex||0)
      + linha('Compra de jogadores', t.playerPurchases||0)
      + linha('Obras no estádio', t.stadium||0)
      + `<div class="rf-linha forte"><span class="rf-linha-t">Total</span>
          <span class="rf-linha-v ruim">${escC(fmt(despesa))}</span></div>`,
      {right:'folha atual '+fmt(folha)})
  );
}

/* =====================================================================
   2 · EXTRATO
   ===================================================================== */
function rfFiExtratoHTML(){
  const fin=(S.finances||[]);
  let saldo=S.budget||0;
  const linhas=[];
  fin.forEach(f=>{
    const itens=[
      ['Receita da rodada', f.income||0, 1],
      ['Venda de jogadores', f.playerSales||0, 1],
      ['Salários', -(f.salaries||0), 0],
      ['Bônus', -(f.bonuses||0), 0],
      ['Custo operacional', -(f.opex||0), 0],
      ['Compra de jogadores', -(f.playerPurchases||0), 0],
      ['Obras no estádio', -(f.stadium||0), 0],
    ].filter(([,v])=>v);
    itens.forEach(([nome,valor,entrada])=>{
      linhas.push(`<div class="rf-tbl-row">
        <span class="rf-tbl-x">${f.round}ª</span>
        <span class="rf-tbl-n">${escC(nome)}</span>
        <span class="rf-tbl-tag ${entrada?'':'leve'}">${entrada?'ENTRADA':'SAÍDA'}</span>
        <span class="rf-tbl-v ${entrada?'ok':'ruim'}">${(valor>=0?'+':'')+escC(fmt(valor))}</span>
        <span class="rf-tbl-v">${escC(fmt(saldo))}</span>
      </div>`);
    });
    saldo-=(f.net||0);
  });
  const cabecalho=`<span>JORNADA</span><span>LANÇAMENTO</span><span class="dir">TIPO</span>
    <span class="dir">VALOR</span><span class="dir">SALDO</span>`;
  // o log em texto, do jeito que o jogo já escreve
  const logs=[]; fin.forEach(f=>{ (f.log||[]).forEach(l=>logs.push({r:f.round,l})); });
  return rfCol(
    rfCard('Lançamentos',
      rfMkTabela('64px minmax(0,1fr) 84px 100px 100px', cabecalho, linhas.join(''),
        'Nenhum movimento registrado nesta temporada ainda.'),
      {right: 'temporada '+(S.season||'')})
  ) + rfCol(
    rfCard('O que o jogo anotou',
      logs.length
        ? logs.slice(0,14).map(({r,l})=>`<div class="rf-linha">
            <span class="rf-linha-t">${escC(String(l))}</span>
            <span class="rf-linha-v">${r}ª</span></div>`).join('')
        : '<span class="rf-note">Sem anotações nesta temporada.</span>')
  );
}

/* =====================================================================
   3 · HISTÓRICO
   ===================================================================== */
function rfFiHistoricoHTML(){
  const ent=((S.financeHistory&&S.financeHistory[CL.clubId])||[]).slice().reverse();
  const linhas=ent.map(e=>{
    const rec=e.income||0, des=e.expenses||0, luc=rec-des;
    return `<div class="rf-tbl-row">
      <span class="rf-tbl-x">${escC(String(e.season))}</span>
      <span class="rf-tbl-v">${escC(mvShort(e.budget||0))}</span>
      <span class="rf-tbl-v ok">${escC(mvShort(rec))}</span>
      <span class="rf-tbl-v ruim">${escC(mvShort(des))}</span>
      <span class="rf-tbl-v ${luc>=0?'ok':'ruim'}">${(luc>=0?'+':'')+escC(mvShort(luc))}</span>
    </div>`;
  }).join('');
  const cabecalho=`<span>ANO</span><span class="dir">CAIXA FINAL</span><span class="dir">RECEITAS</span>
    <span class="dir">DESPESAS</span><span class="dir">SALDO</span>`;
  // EVOLUÇÃO DO CAIXA: as rodadas desta temporada, que é o que S.finances tem
  const fin=(S.finances||[]).slice().reverse();
  let acc=(S.budget||0)-fin.reduce((t,f)=>t+(f.net||0),0);
  const pontos=fin.map(f=>{ acc+=(f.net||0); return {r:f.round,v:acc}; });
  const maxv=Math.max(1,...pontos.map(p=>Math.abs(p.v)));
  return rfCol(
    rfCard('Por temporada',
      rfMkTabela('56px 100px 100px 100px 100px', cabecalho, linhas,
        'O histórico aparece quando a primeira temporada fechar.'),
      {right: ent.length+(ent.length===1?' ano':' anos')})
  ) + rfCol(
    rfCard('Evolução do caixa',
      pontos.length
        ? `<div class="rf-fi-graf">${pontos.map(p=>`<span class="rf-fi-barra"
             style="height:${Math.max(4,Math.round(Math.abs(p.v)/maxv*100))}%"
             title="${p.r}ª jornada · ${escC(fmt(p.v))}"></span>`).join('')}</div>
           <span class="rf-note">Caixa ao fim de cada jornada desta temporada.</span>`
        : '<span class="rf-note">A curva aparece depois da primeira rodada.</span>')
  );
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
  const preco=CL.ticket||0;
  return rfCol(
    `<div class="rf-card rf-fi-est">
      <div class="rf-bv-casa">
        ${foto?`<img class="rf-bv-foto" src="${escC(foto)}" alt="Estádio do ${escC(cl.short)}">`:''}
        <div class="rf-bv-veu"></div>
        <div class="rf-bv-casa-id">
          ${rfCrest(cl,36)}
          <span class="rf-bv-casa-t">
            <span class="rf-bv-casa-n">${escC(rfObEstadioNome(cl,st))}</span>
            <span class="rf-bv-casa-s">CAPACIDADE ${grp(cap)}${ocup?' · OCUPAÇÃO '+ocup+'%':''}</span>
          </span>
        </div>
      </div>
    </div>`
    + rfCard('Bilheteria', `
      <div class="rf-kpis">
        ${rfKpiHTML('Público', att?grp(att):'—', 'no último jogo em casa')}
        ${rfKpiHTML('Ocupação', ocup?ocup+'%':'—', 'da capacidade')}
        ${rfKpiHTML('Renda', CL.lastGate?fmt(CL.lastGate):'—', 'do último jogo')}
      </div>`)
  ) + rfCol(
    rfCard('Preço do bilhete', `
      <div class="rf-linha"><span class="rf-linha-t">Preço atual</span>
        <span class="rf-linha-v">${preco} reais</span></div>
      <span class="rf-note">Bilhete caro enche menos o estádio; barato enche mais e rende menos por
        cabeça. A conta do público usa o preço, o momento do time e a capacidade.</span>
      <div class="rf-acts"><button type="button" class="rf-btn rf-btn-secondary"
        onclick="clTicketPrice&&clTicketPrice()">Mudar o preço</button></div>`)
    + rfCard('Obras', `
      <div class="rf-linha"><span class="rf-linha-t">Capacidade</span>
        <span class="rf-linha-v">${grp(cap)} lugares</span></div>
      <div class="rf-linha"><span class="rf-linha-t">Teto de expansão</span>
        <span class="rf-linha-v">${grp(max)}</span></div>
      <div class="rf-linha"><span class="rf-linha-t">Nova bancada</span>
        <span class="rf-linha-v">${escC(fmt(custo))}</span></div>
      <div class="rf-acts"><button type="button" class="rf-btn rf-btn-primary"
        onclick="clBuildStand&&clBuildStand()" ${cap>=max?'disabled':''}>
        ${cap>=max?'No teto de expansão':'Construir bancada'}</button></div>`)
  );
}

/* =====================================================================
   5 · PATROCÍNIO
   ===================================================================== */
function rfFiPatrocinioHTML(){
  const st=(typeof myStadium==='function')?myStadium():null;
  const cap=(st&&st.capacity)||(typeof STAND_START!=='undefined'?STAND_START:20000);
  const peso={A:8,B:4,C:2,D:1}[S.division]||1;
  const base=Math.round(cap*peso*0.7);
  /* OS ESPAÇOS SÃO O CÁLCULO DO JOGO, não contratos assinados: o motor não
     guarda contrato de patrocínio com marca e vencimento. O que existe é
     quanto cada espaço RENDE, por capacidade e divisão. As marcas do slider
     (AD_SPONSORS) são publicidade da tela, não do save. */
  const espacos=[
    ['Camisa', base*2, 'o principal'],
    ['Manga', Math.round(base*1.3), 'segundo espaço'],
    ['Placas do estádio', base, 'por jogo em casa'],
  ];
  const total=espacos.reduce((t,[,v])=>t+v,0);
  return rfCol(
    rfCard('Espaços do clube',
      espacos.map(([nome,valor,obs])=>`<div class="rf-fi-pat">
        <span class="rf-fi-pat-n">${escC(nome)}</span>
        <span class="rf-fi-pat-o">${escC(obs)}</span>
        <span class="rf-fi-pat-v">${escC(fmt(valor))}<i>/temporada</i></span>
      </div>`).join('')
      + `<div class="rf-linha forte"><span class="rf-linha-t">Total</span>
          <span class="rf-linha-v ok">${escC(fmt(total))}/temporada</span></div>`,
      {right: escC(divisionLabel())})
  ) + rfCol(
    rfCard('Como aumentar o patrocínio', `
      <div class="rf-passos">
        <div class="rf-passo"><span class="rf-passo-n">1</span>
          <span class="rf-passo-t">Subir de divisão. O peso da série multiplica todos os espaços de uma vez.</span></div>
        <div class="rf-passo"><span class="rf-passo-n">2</span>
          <span class="rf-passo-t">Aumentar o estádio. A conta usa a capacidade — mais lugares, mais valor por espaço.</span></div>
      </div>
      <span class="rf-note">O RetroFoot98 não assina contrato de patrocínio com marca e vencimento:
        o valor entra na receita da rodada, calculado por divisão e capacidade.</span>`)
  );
}
