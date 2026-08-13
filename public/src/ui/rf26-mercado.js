/* =====================================================================
   RetroFoot98 — MERCADO, as seis abas completas
   Portado de telas/Mercado - Abas.html (pacote "Abas Completas").

   Cada aba é uma TELA INTEIRA, com os blocos que o pacote define:
     Comprar         · Jogadores no mercado + O que o caixa permite
     Leilão          · Lotes abertos + Arrematados recentemente
     Propostas       · Um card por proposta + Impacto se aceitar
     Contrapropostas · Negociações em andamento + Como negociar
     Vender          · Seu elenco à venda + Quem você não deveria vender
     Transferências  · Janela + Movimentações da divisão

   ONDE O JOGO NÃO TEM O DADO, A TELA DIZ ISSO. O relógio de leilão da
   referência ("02:14") não existe aqui: o leilão do RetroFoot98 fecha por
   RODADA (roundsLeft), então a coluna mostra rodadas. Inventar um relógio
   seria prometer um leilão em tempo real que o motor não roda.
   ===================================================================== */

/* ---- peças que se repetem nas seis abas ---- */
function rfMkTabela(cols, cabecalho, linhas, vazio){
  return `<div class="rf-tbl" style="--rf-tbl-cols:${cols}">
    <div class="rf-tbl-head">${cabecalho}</div>
    <div class="rf-tbl-body">${linhas || `<div class="rf-empty">${escC(vazio||'Nada aqui agora.')}</div>`}</div>
  </div>`;
}
function rfMkClube(id){
  const c=anyClubOf(id)||{short:'—'};
  return `<span class="rf-tbl-clube">${rfCrest(c,18)}<span>${escC(c.short)}</span></span>`;
}
function rfMkPos(p){ return `<span class="rf-tbl-pos">${escC(rfPosInicial(p.s))}</span>`; }
/* a referência usa UMA letra por setor (G/D/M/A) */
function rfPosInicial(s){ return ({GK:'G',DEF:'D',MID:'M',ATT:'A'})[s]||'—'; }
function rfMkSalario(p){
  const sal=(p.contract&&p.contract.salary)||p.salary||0;
  return sal?fmt(sal):'—';
}
function rfMkFimContrato(p){
  const anos=(p.contract&&p.contract.years)!=null?p.contract.years:p.contract;
  return (typeof anos==='number')?String((S.season||0)+anos):'—';
}

/* =====================================================================
   1 · COMPRAR
   ===================================================================== */
const RF_MKT_FILTROS=[
  { k:'pos',   l:'Posição', op:[['all','Todas'],['GK','Goleiros'],['DEF','Defesa'],['MID','Meio'],['ATT','Ataque']] },
  { k:'forca', l:'Força',   op:[['all','qualquer'],['70','70+'],['80','80+'],['90','90+']] },
  { k:'idade', l:'Idade',   op:[['all','qualquer'],['23','até 23'],['27','até 27'],['30','até 30']] },
  { k:'preco', l:'Preço',   op:[['all','qualquer'],['caixa','o que cabe no caixa'],['meio','até metade do caixa']] },
];
function rfMktF(){ return CL.mktF||(CL.mktF={pos:'all',forca:'all',idade:'all',preco:'all'}); }
function rfMktSetF(k,v){ rfMktF()[k]=v; CL._mktCache2=null; cdraw(); }
function rfMktLimpar(){ CL.mktF={pos:'all',forca:'all',idade:'all',preco:'all'}; CL._mktCache2=null; cdraw(); }
/* o mercado inteiro, com os filtros da referência aplicados */
function rfMktMercado(){
  const f=rfMktF();
  const teto=S.budget||0;
  const out=[];
  (DATA.clubs||[]).forEach(c=>{
    if(c.id===CL.clubId) return;
    (squad(c.id)||[]).forEach(p=>{
      if(typeof isTradeLocked==='function' && isTradeLocked(p)) return;
      if(f.pos!=='all' && p.s!==f.pos) return;
      if(f.forca!=='all' && (p.f||0)<Number(f.forca)) return;
      if(f.idade!=='all' && (p.age||0)>Number(f.idade)) return;
      const ask=(typeof playerAsk==='function')?playerAsk(p,c.id):(p.mv||0);
      if(f.preco==='caixa' && ask>teto) return;
      if(f.preco==='meio'  && ask>teto/2) return;
      out.push({p,clubId:c.id,ask});
    });
  });
  out.sort((a,b)=>(b.p.f||0)-(a.p.f||0));
  return out;
}
function rfMktComprarHTML(){
  if(typeof canNegotiate==='function' && !canNegotiate())
    return rfCol(rfCard('Jogadores no mercado',
      `<div class="rf-empty">${escC(typeof windowClosedMsg==='function'?windowClosedMsg():'A janela de transferências está fechada.')}</div>`));
  const f=rfMktF();
  const todos=rfMktMercado();
  const mostra=todos.slice(0,60);
  const teto=S.budget||0;
  const cabem=todos.filter(x=>x.ask<=teto);
  const linhas=mostra.map(({p,clubId,ask})=>`<div class="rf-tbl-row" onclick="clMarketPlayer('${escC(clubId)}','${escC(p.n)}')">
    <span class="rf-tbl-n">${escC(p.n)}</span>
    ${rfMkPos(p)}
    <span class="rf-tbl-x">${p.age||'—'}</span>
    <span class="rf-tbl-f">${p.f}</span>
    ${rfMkClube(clubId)}
    <span class="rf-tbl-v">${escC(mvShort(ask))}</span>
    <span class="rf-tbl-v">${escC(rfMkSalario(p))}</span>
    <span class="rf-tbl-act"><button type="button" class="rf-btn rf-btn-pill"
      onclick="event.stopPropagation();clMarketPlayer('${escC(clubId)}','${escC(p.n)}')">Propor</button></span>
  </div>`).join('');
  const filtros=`<div class="rf-mkf">
    ${RF_MKT_FILTROS.map(ff=>`<label class="rf-mkf-i">
      <span class="rf-mkf-l">${escC(ff.l)}</span>
      <select class="rf-mkf-s" onchange="rfMktSetF('${ff.k}',this.value)">
        ${ff.op.map(([v,l])=>`<option value="${v}" ${f[ff.k]===v?'selected':''}>${escC(l)}</option>`).join('')}
      </select>
    </label>`).join('')}
    <div class="rf-sp"></div>
    <button type="button" class="rf-mkf-x" onclick="rfMktLimpar()">Limpar filtros</button>
  </div>`;
  const cabecalho=`<span>JOGADOR</span><span>POS</span><span>IDA</span><span>FOR</span>
    <span>CLUBE</span><span class="dir">VALOR</span><span class="dir">SALÁRIO</span><span></span>`;
  return rfCol(
    rfCard('Jogadores no mercado',
      filtros + rfMkTabela('minmax(0,1fr) 34px 40px 40px minmax(0,120px) 92px 88px 84px',
        cabecalho, linhas, 'Nenhum jogador com esses filtros.'),
      {right: mostra.length+' de '+todos.length})
  ) + rfCol(
    rfCard('O que o caixa permite', `
      <div class="rf-kpis">
        ${rfKpiHTML('Em caixa', fmt(teto), 'para gastar agora')}
        ${rfKpiHTML('Cabem no caixa', String(cabem.length), 'de '+todos.length+' no mercado')}
        ${rfKpiHTML('Mais caro que cabe', cabem.length?mvShort(cabem[0].ask):'—', cabem.length?escC(cabem[0].p.n):'')}
      </div>
      <span class="rf-note">A folha pesa depois: cada contratação entra no salário do mês seguinte.</span>`)
  );
}

/* =====================================================================
   2 · LEILÃO
   ===================================================================== */
function rfMktLeilaoHTML(){
  if(typeof mergeAuctionBidsFromSeats==='function'){ try{ mergeAuctionBidsFromSeats(); }catch(e){} }
  const lots=((S.auctions&&S.auctions.lots)||[]);
  const abertos=lots.filter(l=>l.status==='open');
  const fechados=lots.filter(l=>l.status!=='open').slice(-6).reverse();
  const linha=l=>{
    const p=(typeof findP==='function')?findP(l.player,l.sellerId):null; if(!p) return '';
    const meu=l.leader===S.clubId;
    return `<div class="rf-tbl-row ${meu?'me':''}">
      <span class="rf-tbl-n">${escC(p.n)}</span>
      ${rfMkPos(p)}
      <span class="rf-tbl-x">${p.age||'—'}</span>
      <span class="rf-tbl-f">${p.f}</span>
      ${rfMkClube(l.sellerId)}
      <span class="rf-tbl-v">${escC(mvShort(l.bid))}</span>
      <span class="rf-tbl-v ${meu?'ok':''}">${l.myBid?escC(mvShort(l.myBid)):'—'}</span>
      <span class="rf-tbl-x">${l.roundsLeft!=null?l.roundsLeft+(l.roundsLeft===1?' rodada':' rodadas'):'—'}</span>
      <span class="rf-tbl-act"><button type="button" class="rf-btn rf-btn-pill"
        onclick="clAuctionBidPrompt('${escC(l.sellerId)}','${escC(l.player)}')">Cobrir</button></span>
    </div>`;
  };
  const cabecalho=`<span>JOGADOR</span><span>POS</span><span>IDA</span><span>FOR</span>
    <span>CLUBE</span><span class="dir">LANCE ATUAL</span><span class="dir">SEU LANCE</span>
    <span class="dir">FECHA</span><span></span>`;
  const arrematados=fechados.map(l=>{
    const c=anyClubOf(l.leader==='cpu'?l.sellerId:l.leader)||{short:'—'};
    return `<div class="rf-linha">
      <span class="rf-linha-t">${escC(l.player)} → ${escC(c.short)}</span>
      <span class="rf-linha-v">${escC(mvShort(l.bid))}</span>
    </div>`;
  }).join('');
  return rfCol(
    rfCard('Lotes abertos',
      rfMkTabela('minmax(0,1fr) 34px 40px 40px minmax(0,120px) 96px 92px 84px 84px',
        cabecalho, abertos.map(linha).join(''), 'Nenhum leilão aberto nesta rodada.'),
      {right: abertos.length? abertos.length+' ativos':''})
  ) + rfCol(
    rfCard('Arrematados recentemente',
      arrematados || '<span class="rf-note">Ainda não houve arremate nesta temporada.</span>')
  );
}

/* =====================================================================
   3 · PROPOSTAS — um card por proposta, com os quatro números
   ===================================================================== */
function rfMktPropostasHTML(){
  const ofertas=rfPropostas().filter(o=>o.expiresRound>S.round);
  if(!ofertas.length) return rfCol(rfCard('Propostas recebidas',
    `<div class="rf-empty">Nenhuma proposta no momento.<br><small>Clubes fazem propostas pelos seus destaques enquanto a janela está aberta.</small></div>`));
  const sq=squad(CL.clubId);
  const cards=ofertas.map(o=>{
    const p=sq.find(x=>x.n===o.playerName)||{};
    const rodadas=Math.max(0,o.expiresRound-S.round);
    const vm=(typeof computeVM==='function'&&p.n)?computeVM(p):(p.mv||0);
    const sal=(p.contract&&p.contract.salary)||p.salary||0;
    // SUBSTITUTO: o melhor do elenco no mesmo setor, tirando quem está saindo
    const sub=sq.filter(x=>x.s===p.s && x.n!==p.n).sort((a,b)=>(b.f||0)-(a.f||0))[0];
    const dif=vm?Math.round((o.fee-vm)/vm*100):0;
    return `<div class="rf-card rf-prop2">
      <div class="rf-prop2-hd">
        ${rfCrest(anyClubOf(o.buyerId)||{short:o.buyerName||'—'},34)}
        <div class="rf-prop2-id">
          <span class="rf-prop2-t">${escC(o.buyerName||'Um clube')} quer o ${escC(o.playerName)}</span>
          <span class="rf-prop2-s">${escC(rfPosInicial(p.s))} · ${p.age||'—'} anos · força ${o.playerForce||p.f||'—'} · resposta em ${rodadas} rodada${rodadas===1?'':'s'}</span>
        </div>
        <div class="rf-sp"></div>
        <div class="rf-prop2-acts">
          <button type="button" class="rf-btn rf-btn-secondary" onclick="clRejectOffer(${o.id})">Recusar</button>
          <button type="button" class="rf-btn rf-btn-primary" onclick="clAcceptOffer(${o.id})">Aceitar</button>
        </div>
      </div>
      <div class="rf-prop2-nums">
        ${rfKpiHTML('Oferta', mvShort(o.fee), 'à vista')}
        ${rfKpiHTML('Salário que sai', sal?fmt(sal):'—', sal?'alívio na folha':'')}
        ${rfKpiHTML('Valor de mercado', vm?mvShort(vm):'—', vm?(dif>=0?'+'+dif+'% acima':dif+'% abaixo'):'')}
        ${rfKpiHTML('Substituto', sub?sub.n:'—', sub?('força '+sub.f):'sem reserva no setor')}
      </div>
      ${o.lastMsg?`<span class="rf-prop-msg">💬 ${escC(o.lastMsg)}</span>`:''}
    </div>`;
  }).join('');
  const totalFee=ofertas.reduce((t,o)=>t+(o.fee||0),0);
  const totalSal=ofertas.reduce((t,o)=>{ const p=sq.find(x=>x.n===o.playerName);
    return t+((p&&((p.contract&&p.contract.salary)||p.salary))||0); },0);
  return rfCol(cards) + rfCol(
    rfCard(`Impacto se aceitar ${ofertas.length===1?'a proposta':'as '+ofertas.length}`, `
      <div class="rf-kpis">
        ${rfKpiHTML('Entra no caixa', mvShort(totalFee), 'à vista')}
        ${rfKpiHTML('Sai da folha', totalSal?fmt(totalSal):'—', 'por mês')}
        ${rfKpiHTML('Caixa depois', mvShort((S.budget||0)+totalFee), 'para reinvestir')}
        ${rfKpiHTML('Elenco depois', String(sq.length-ofertas.length), 'jogadores')}
      </div>`)
  );
}

/* =====================================================================
   4 · CONTRAPROPOSTAS
   ===================================================================== */
function rfMktContraHTML(){
  const lista=(typeof myCounterOffers==='function')?myCounterOffers():[];
  const linhas=lista.map(o=>{
    const pedido=o.ask||o.counter||0, minha=o.fee||0;
    const dif=pedido-minha;
    return `<div class="rf-tbl-row">
      <span class="rf-tbl-n">${escC(o.playerName||'')}</span>
      ${o.playerPos?`<span class="rf-tbl-pos">${escC(o.playerPos)}</span>`:'<span class="rf-tbl-pos">—</span>'}
      ${o.sellerId?rfMkClube(o.sellerId):'<span class="rf-tbl-clube">—</span>'}
      <span class="rf-tbl-v">${escC(mvShort(minha))}</span>
      <span class="rf-tbl-v">${pedido?escC(mvShort(pedido)):'—'}</span>
      <span class="rf-tbl-v ${dif>0?'ruim':''}">${pedido?escC(mvShort(dif)):'—'}</span>
      <span class="rf-tbl-tag">${escC((o.state||'a decidir').toUpperCase())}</span>
      <span class="rf-tbl-act"><button type="button" class="rf-btn rf-btn-pill"
        onclick="clMarketPlayer('${escC(o.sellerId||'')}','${escC(o.playerName||'')}')">Subir</button></span>
    </div>`;
  }).join('');
  const cabecalho=`<span>JOGADOR</span><span>POS</span><span>CLUBE</span>
    <span class="dir">SUA OFERTA</span><span class="dir">PEDIDO DELES</span>
    <span class="dir">DIFERENÇA</span><span class="dir">SITUAÇÃO</span><span></span>`;
  return rfCol(
    rfCard('Negociações em andamento',
      rfMkTabela('minmax(0,1fr) 34px minmax(0,120px) 96px 100px 92px 92px 76px',
        cabecalho, linhas, 'Nenhuma negociação aberta agora.'),
      {right: lista.length? lista.length+' abertas':''})
  ) + rfCol(
    rfCard('Como negociar', `
      <div class="rf-passos">
        <div class="rf-passo"><span class="rf-passo-n">1</span>
          <span class="rf-passo-t">Comece abaixo do pedido. O clube vendedor quase sempre volta com um número menor.</span></div>
        <div class="rf-passo"><span class="rf-passo-n">2</span>
          <span class="rf-passo-t">Clube no Z-4 cobra mais caro para liberar; clube grande segura o atleta. A diferença já está no pedido.</span></div>
        <div class="rf-passo"><span class="rf-passo-n">3</span>
          <span class="rf-passo-t">A janela fecha por rodada. Proposta parada até o fechamento morre sem resposta.</span></div>
      </div>`)
  );
}

/* =====================================================================
   5 · VENDER
   ===================================================================== */
function rfMktVenderHTML(){
  const sq=squad(CL.clubId).slice().sort((a,b)=>(b.f||0)-(a.f||0));
  const xi=new Set(xiPlayers(CL.clubId).map(p=>p.pid));
  const linhas=sq.map(p=>{
    const vm=(typeof computeVM==='function')?computeVM(p):(p.mv||0);
    const titular=xi.has(p.pid);
    return `<div class="rf-tbl-row" onclick="clSellFrom&&clSellFrom('${escC(p.pid||p.n)}')">
      <span class="rf-tbl-num">${escC(String(p.num||''))}</span>
      <span class="rf-tbl-n">${escC(p.n)}</span>
      ${rfMkPos(p)}
      <span class="rf-tbl-x">${p.age||'—'}</span>
      <span class="rf-tbl-f">${p.f}</span>
      <span class="rf-tbl-v">${escC(mvShort(vm))}</span>
      <span class="rf-tbl-v">${escC(rfMkSalario(p))}</span>
      <span class="rf-tbl-x">${escC(rfMkFimContrato(p))}</span>
      <span class="rf-tbl-tag ${titular?'':'leve'}">${titular?'TITULAR':'RESERVA'}</span>
      <span class="rf-tbl-act"><button type="button" class="rf-btn rf-btn-pill"
        onclick="event.stopPropagation();clVenderJogador&&clVenderJogador('${escC(p.n)}')">Vender</button></span>
    </div>`;
  }).join('');
  const cabecalho=`<span></span><span>JOGADOR</span><span>POS</span><span>IDA</span><span>FOR</span>
    <span class="dir">VALOR</span><span class="dir">SALÁRIO</span><span class="dir">FIM</span>
    <span class="dir">SITUAÇÃO</span><span></span>`;
  // QUEM VOCÊ NÃO DEVERIA VENDER: os titulares sem reserva no mesmo setor
  const semReserva=[...xi].map(pid=>sq.find(p=>p.pid===pid)).filter(Boolean).filter(p=>{
    const outros=sq.filter(x=>x.s===p.s && x.pid!==p.pid && (x.f||0)>=(p.f||0)-5);
    return outros.length===0;
  }).slice(0,5);
  return rfCol(
    rfCard('Seu elenco à venda',
      rfMkTabela('30px minmax(0,1fr) 34px 40px 40px 92px 88px 56px 84px 80px',
        cabecalho, linhas, 'Elenco vazio.'),
      {right: sq.length+' jogadores'})
  ) + rfCol(
    rfCard('Quem você não deveria vender',
      semReserva.length
        ? semReserva.map(p=>`<div class="rf-linha">
            <span class="rf-linha-t">${escC(p.n)}</span>
            <span class="rf-linha-v">sem reserva</span></div>`).join('')
          + '<span class="rf-note">Titulares que não têm ninguém do mesmo setor à altura no banco.</span>'
        : '<span class="rf-note">O banco cobre todos os titulares. Dá para negociar sem abrir buraco.</span>')
  );
}

/* =====================================================================
   6 · TRANSFERÊNCIAS
   ===================================================================== */
function rfMktTransfHTML(){
  const nomeDe=id=>{ if(!id) return 'fora do mundo';
    const c=anyClubOf(id); return (c&&c.short)||String(id); };
  /* O jogo não guarda um log global: o histórico VIAJA COM O JOGADOR
     (p.transferHistory, ver recordTransferHistory no core). Então as
     movimentações da divisão são varridas dos elencos de todos os clubes. */
  const ent=[];
  (DATA.clubs||[]).forEach(c=>{ (squad(c.id)||[]).forEach(p=>{
    (p.transferHistory||[]).forEach(h=>ent.push({p,h}));
  }); });
  ent.sort((a,b)=>(b.h.season-a.h.season)||(b.h.round-a.h.round));
  const linhas=ent.slice(0,40).map(({p,h})=>`<div class="rf-tbl-row">
    <span class="rf-tbl-n">${escC(p.n)}</span>
    ${rfMkPos(p)}
    <span class="rf-tbl-f">${p.f}</span>
    ${h.from?rfMkClube(h.from):`<span class="rf-tbl-clube">${escC(nomeDe(h.from))}</span>`}
    <span class="rf-tbl-seta">→</span>
    ${h.to?rfMkClube(h.to):`<span class="rf-tbl-clube">${escC(nomeDe(h.to))}</span>`}
    <span class="rf-tbl-v">${escC(mvShort(h.fee||0))}</span>
    <span class="rf-tbl-x">${escC(String(h.season||''))}</span>
  </div>`).join('');
  const cabecalho=`<span>JOGADOR</span><span>POS</span><span>FOR</span><span>SAIU DE</span>
    <span></span><span>FOI PARA</span><span class="dir">VALOR</span><span class="dir">TEMP.</span>`;
  const aberta=(typeof inTransferWindow==='function')?inTransferWindow():true;
  const jornadas=(S.sched||[]).length||14;
  const pct=Math.max(0,Math.min(100,Math.round((S.round||0)/jornadas*100)));
  return rfCol(
    rfCard('Janela de transferências', `
      <div class="rf-pz-barra">
        <div class="rf-label"><span class="rf-label-t">${aberta?'Aberta':'Fechada'} · ${(S.round||0)+1}ª de ${jornadas} jornadas</span>
          <span class="rf-pz-pct">${pct}%</span></div>
        <div class="rf-pz-trilho"><div class="rf-pz-fill" style="width:${pct}%"></div></div>
      </div>
      <span class="rf-note">${aberta
        ? 'Enquanto a janela estiver aberta dá para comprar, vender e cobrir leilão.'
        : (typeof windowClosedMsg==='function'?escC(windowClosedMsg()):'A janela está fechada.')}</span>`,
      {right: aberta?'aberta':'fechada'})
    + rfCard('Movimentações da divisão',
      rfMkTabela('minmax(0,1fr) 34px 40px minmax(0,110px) 20px minmax(0,110px) 92px 60px',
        cabecalho, linhas, 'Nenhuma transferência registrada ainda nesta temporada.'),
      {right: ent.length? ent.length+' no total':''})
  );
}
