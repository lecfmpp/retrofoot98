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
  const linhas=mostra.map(({p,clubId,ask})=>`<div class="rf-tbl-row" onclick="rfMkPropor('${escC(clubId)}','${escC(p.n)}')">
    <span class="rf-tbl-n">${escC(p.n)}</span>
    ${rfMkPos(p)}
    <span class="rf-tbl-x">${p.age||'—'}</span>
    <span class="rf-tbl-f">${p.f}</span>
    ${rfMkClube(clubId)}
    <span class="rf-tbl-v">${escC(mvShort(ask))}</span>
    <span class="rf-tbl-v">${escC(rfMkSalario(p))}</span>
    <span class="rf-tbl-act"><button type="button" class="rf-btn rf-btn-pill"
      onclick="event.stopPropagation();rfMkPropor('${escC(clubId)}','${escC(p.n)}')">Propor</button></span>
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
  return rfMktGavetaHTML(['oferta']) + rfCol(
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
        onclick="rfMkLance('${escC(l.sellerId)}','${escC(l.player)}')">${meu?'Aumentar':'Cobrir'}</button></span>
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
  return rfMktGavetaHTML(['lance']) + rfCol(
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
          <button type="button" class="rf-btn rf-btn-recusar" onclick="rfMkRecusar(${o.id})">Recusar</button>
          <button type="button" class="rf-btn rf-btn-secondary" onclick="rfMkContrapor(${o.id})">Contrapropor</button>
          <button type="button" class="rf-btn rf-btn-cta" onclick="rfMkAceitar(${o.id})">Aceitar</button>
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
  return rfMktGavetaHTML(['contra']) + rfCol(cards) + rfCol(
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
        onclick="rfMkPropor('${escC(o.sellerId||'')}','${escC(o.playerName||'')}')">Subir</button></span>
    </div>`;
  }).join('');
  const cabecalho=`<span>JOGADOR</span><span>POS</span><span>CLUBE</span>
    <span class="dir">SUA OFERTA</span><span class="dir">PEDIDO DELES</span>
    <span class="dir">DIFERENÇA</span><span class="dir">SITUAÇÃO</span><span></span>`;
  return rfMktGavetaHTML(['oferta']) + rfCol(
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
    return `<div class="rf-tbl-row" onclick="rfMkListar('${escC(p.pid)}')">
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
        onclick="event.stopPropagation();rfMkListar('${escC(p.pid)}')">Listar</button></span>
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
  return rfMktGavetaHTML(['listar']) + rfCol(
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

/* =====================================================================
   AS GAVETAS DO MERCADO — o que era modal agora acontece DENTRO da aba

   Nenhuma ação do Mercado abre mais sobreposição. Propor, cobrir um
   leilão, contrapropor e listar pra venda abrem uma GAVETA: um cartão
   que nasce no topo da própria aba, empurra a tabela pra baixo e fecha
   sozinho quando o negócio termina. A tabela continua visível o tempo
   todo — era isso que o modal tirava.

   O motor é o MESMO de antes (startNego/clubRespond/agentRespond/
   finalizeTransfer/placeAuctionBid/counterIncomingOffer). O que mudou é
   só quem desenha o passo: em vez de renderMarketOffer() abrir o dlg,
   cada ação chama cdraw() e a gaveta se redesenha no lugar.
   ===================================================================== */
function rfMkP(){ return CL.mkP||null; }
function rfMkFechar(){ CL.mkP=null; CL.market=null; cdraw(); }
function rfMkNum(id){
  const el=document.querySelector('#'+id);
  return el ? (parseInt((el.value||'').replace(/\D/g,''),10)||0) : 0;
}
/* moldura comum: título, subtítulo, o ✕ e o corpo */
function rfMkGavetaHTML(titulo, sub, corpo){
  return `<div class="rf-card rf-gaveta">
    <div class="rf-gaveta-hd">
      <div class="rf-gaveta-id">
        <span class="rf-gaveta-t">${titulo}</span>
        ${sub?`<span class="rf-gaveta-s">${sub}</span>`:''}
      </div>
      <button type="button" class="rf-gaveta-x" onclick="rfMkFechar()" title="Fechar">✕</button>
    </div>
    ${corpo}
  </div>`;
}
function rfMkCampoHTML(id, rotulo, valor, dica){
  return `<label class="rf-mkc">
    <span class="rf-mkc-l">${escC(rotulo)}</span>
    <span class="rf-mkc-f"><span class="rf-mkc-cur">${escC(curSym())}</span>
      <input class="rf-mkc-in" id="${id}" inputmode="numeric" value="${valor?escC(moneyDisp(valor)):''}"
        oninput="clMoneyInputReformat(this)"></span>
    ${dica?`<span class="rf-mkc-d">${dica}</span>`:''}
  </label>`;
}

/* ---- 1 · PROPOR / SUBIR A OFERTA (Comprar e Contrapropostas) ---- */
function rfMkPropor(clubId, nome){
  const p=(typeof findP==='function')?findP(nome,clubId):null; if(!p) return;
  if(typeof isTradeLocked==='function' && isTradeLocked(p)){
    toastC(`${p.n} já foi negociado nesta temporada.`); return; }
  const ask=(typeof playerAsk==='function')?playerAsk(p,clubId):(p.mv||0);
  // reaproveita a negociação já aberta com este jogador, se houver
  const idx=(S.negos||[]).findIndex(n=>n && n.clubId===clubId && n.player===nome && !n.done);
  CL.market={step:'offer', clubId, player:nome,
    offer: idx>=0 ? (S.negos[idx].clubCounter||S.negos[idx].offerFee) : Math.round(ask/1000)*1000,
    negoIdx: idx>=0?idx:null};
  CL.mkP={tipo:'oferta'};
  cdraw();
}
function rfMkProporFee(){
  const M=CL.market; if(!M) return;
  M.offer=rfMkNum('rf-mk-fee');
  if(M.offer<=0){ toastC('Digite quanto você quer oferecer.'); return; }
  if(M.negoIdx==null) M.negoIdx=startNego(M.clubId,M.player,M.offer);
  else S.negos[M.negoIdx].offerFee=M.offer;
  const r=clubRespond(S.negos[M.negoIdx]); toastC(r.msg||''); cdraw();
}
function rfMkIgualar(){
  const M=CL.market; const n=M&&M.negoIdx!=null?S.negos[M.negoIdx]:null;
  if(!n||!n.clubCounter){ toastC('Não há pedido pra igualar.'); return; }
  if(n.clubCounter>(S.budget||0)){ toastC('Caixa insuficiente pra igualar esse pedido.'); return; }
  M.offer=n.clubCounter;
  S.negos[M.negoIdx].offerFee=M.offer;
  const r=clubRespond(S.negos[M.negoIdx]); toastC(r.msg||''); cdraw();
}
function rfMkTermos(){
  const M=CL.market; const n=S.negos[M.negoIdx];
  n.salary=rfMkNum('rf-mk-sal')||n.salary;
  const r=agentRespond(n); toastC(r.msg||''); cdraw();
}
function rfMkAceitarAgente(){
  const M=CL.market; const n=S.negos[M.negoIdx];
  if(n.agentCounter) n.salary=n.agentCounter; cdraw();
}
function rfMkFinalizar(){
  const M=CL.market; const r=finalizeTransfer(M.negoIdx);
  toastC(r.msg||'');
  if(r.ok){ if(typeof saveV3==='function') saveV3(); CL.mkP=null; CL.market=null; }
  cdraw();
}
function rfMkOfertaHTML(){
  const M=CL.market; if(!M) return '';
  const p=(typeof findP==='function')?findP(M.player,M.clubId):null;
  if(!p){ CL.mkP=null; return ''; }
  const c=anyClubOf(M.clubId)||{short:'—'};
  const n=M.negoIdx!=null?S.negos[M.negoIdx]:null;
  const sub=`${escC(rfPosInicial(p.s))} · ${p.age||'—'} anos · força ${p.f} · ${escC(c.short)}`;
  // clube de outro humano: proposta vai pro e-mail dele, não há regateio algorítmico
  if(CL.online && CL.humans && CL.humans[M.clubId]){
    return rfMkGavetaHTML('Proposta por '+escC(p.n), sub, `
      <span class="rf-note">Este jogador é de outro treinador. A proposta vai direto pro e-mail dele — ele aceita, recusa ou negocia.</span>
      <div class="rf-mkg-linha">
        ${rfMkCampoHTML('rf-mk-fee','Sua proposta',M.offer,'valor de mercado '+escC(mvShort(p.mv||0)))}
        <button type="button" class="rf-btn rf-btn-primary" onclick="rfMkEnviarHumano()">Enviar proposta</button>
      </div>`);
  }
  if(!n || n.stage==='fee' || n.stage==='counterFee'){
    const pediu = n && n.stage==='counterFee' && n.clubCounter;
    return rfMkGavetaHTML('Proposta por '+escC(p.n), sub, `
      ${pediu?`<div class="rf-mkg-aviso">O ${escC(c.short)} quer a partir de <b>${escC(fmt(n.clubCounter))}</b>.
        <button type="button" class="rf-btn rf-btn-ghost" onclick="rfMkIgualar()">Igualar pedido</button></div>`:''}
      <div class="rf-mkg-linha">
        ${rfMkCampoHTML('rf-mk-fee','Sua proposta (taxa)',M.offer,'valor de mercado '+escC(mvShort(p.mv||0))+' · caixa '+escC(mvShort(S.budget||0)))}
        <button type="button" class="rf-btn rf-btn-primary" onclick="rfMkProporFee()">Propor</button>
      </div>`);
  }
  if(n.stage==='terms'){
    return rfMkGavetaHTML('Salário de '+escC(p.n), 'taxa acertada em '+escC(fmt(n.offerFee)), `
      ${n.agentCounter?`<div class="rf-mkg-aviso">O empresário pede <b>${escC(fmt(n.agentCounter))}</b> por semana.
        <button type="button" class="rf-btn rf-btn-ghost" onclick="rfMkAceitarAgente()">Aceitar o pedido</button></div>`:''}
      <div class="rf-mkg-linha">
        ${rfMkCampoHTML('rf-mk-sal','Salário semanal',n.salary,'a folha de hoje é '+escC(fmt(rfFolha())))}
        <button type="button" class="rf-btn rf-btn-primary" onclick="rfMkTermos()">Oferecer</button>
      </div>`);
  }
  return rfMkGavetaHTML(escC(p.n)+' está fechado', 'taxa '+escC(fmt(n.offerFee))+' · salário '+escC(fmt(n.salary||0)), `
    <div class="rf-mkg-linha">
      <span class="rf-note">Falta só assinar. O valor sai do caixa na hora e o salário entra na folha do mês seguinte.</span>
      <button type="button" class="rf-btn rf-btn-cta" onclick="rfMkFinalizar()">Fechar contratação</button>
    </div>`);
}
function rfMkEnviarHumano(){
  const M=CL.market; M.offer=rfMkNum('rf-mk-fee');
  const r=sendHumanOffer(M.clubId,M.player,M.offer); toastC(r.msg||'');
  if(r.ok){ if(typeof saveV3==='function') saveV3(); CL.mkP=null; CL.market=null; }
  cdraw();
}
function rfFolha(){
  return squad(CL.clubId).reduce((t,p)=>t+((p.contract&&p.contract.salary)||p.salary||0),0);
}

/* ---- 2 · LANCE DE LEILÃO ---- */
function rfMkLance(sellerId, player){
  if(typeof mergeAuctionBidsFromSeats==='function'){ try{ mergeAuctionBidsFromSeats(); }catch(e){} }
  CL.mkP={tipo:'lance', sellerId, player}; cdraw();
}
function rfMkLanceGo(){
  const P=CL.mkP; const r=placeAuctionBid(P.sellerId+'|'+P.player, rfMkNum('rf-mk-lance'));
  toastC(r.msg||'');
  if(r.ok){ if(typeof saveV3==='function') saveV3(); CL.mkP=null; }
  cdraw();
}
function rfMkLanceHTML(){
  const P=CL.mkP;
  const lot=((S.auctions&&S.auctions.lots)||[]).find(l=>l.id===P.sellerId+'|'+P.player && l.status==='open');
  const p=(typeof findP==='function')?findP(P.player,P.sellerId):null;
  if(!lot||!p){ CL.mkP=null; return ''; }
  const c=anyClubOf(P.sellerId)||{short:'—'};
  const meu=lot.leader===S.clubId;
  const sugerido=Math.round(lot.bid+Math.max(50000,lot.bid*0.08));
  return rfMkGavetaHTML('Lance por '+escC(p.n),
    `${escC(rfPosInicial(p.s))} · força ${p.f} · ${escC(c.short)} · ${lot.interest} clubes na disputa`, `
    <div class="rf-mkg-aviso">Maior lance agora: <b>${escC(mvShort(lot.bid))}</b> ${meu?'(seu)':'(concorrência)'}
      · fecha em <b>${lot.roundsLeft} rodada${lot.roundsLeft===1?'':'s'}</b></div>
    <div class="rf-mkg-linha">
      ${rfMkCampoHTML('rf-mk-lance','Seu lance',sugerido,'precisa passar de '+escC(mvShort(lot.bid))+' · caixa '+escC(mvShort(S.budget||0)))}
      <button type="button" class="rf-btn rf-btn-cta" onclick="rfMkLanceGo()">Confirmar lance</button>
    </div>`);
}

/* ---- 3 · CONTRAPROPOR (uma proposta recebida) ---- */
function rfMkContrapor(id){ CL.mkP={tipo:'contra', id}; cdraw(); }
function rfMkContraporGo(){
  const P=CL.mkP; const valor=rfMkNum('rf-mk-ask');
  if(valor<=0){ toastC('Digite quanto você quer pedir.'); return; }
  const o=rfPropostas().find(x=>x.id===P.id);
  const humano = o && CL.online && CL.humans && CL.humans[o.buyerId];
  const r = humano ? counterHumanOffer(P.id, curParse(valor))
                   : (counterIncomingOffer(P.id, curParse(valor))||{ok:true});
  if(r&&r.msg) toastC(r.msg);
  if(!r||r.ok!==false){ if(typeof saveV3==='function') saveV3(); CL.mkP=null; }
  cdraw();
}
function rfMkContraHTML(){
  const o=rfPropostas().find(x=>x.id===CL.mkP.id);
  if(!o){ CL.mkP=null; return ''; }
  const p=squad(CL.clubId).find(x=>x.n===o.playerName)||{};
  const vm=(typeof computeVM==='function'&&p.n)?computeVM(p):(p.mv||0);
  return rfMkGavetaHTML('Contraproposta por '+escC(o.playerName),
    `${escC(o.buyerName||'um clube')} ofereceu ${escC(mvShort(o.fee||0))}`, `
    <div class="rf-mkg-linha">
      ${rfMkCampoHTML('rf-mk-ask','Quanto você pede',Math.round((vm||o.fee)*1.15/1000)*1000,
        'valor de mercado '+escC(mvShort(vm||0))+' · pedir muito acima costuma matar a negociação')}
      <button type="button" class="rf-btn rf-btn-primary" onclick="rfMkContraporGo()">Enviar contraproposta</button>
    </div>`);
}

/* ---- 4 · LISTAR PRA VENDA ---- */
function rfMkListar(pid){ CL.mkP={tipo:'listar', pid}; CL.selPlayer=pid; cdraw(); }
function rfMkListarGo(){
  CL.selPlayer=CL.mkP.pid;
  CL.sellPrice=String(rfMkNum('rf-mk-preco')||'');
  CL.mkP=null;
  clSellConfirm();
}
function rfMkListarHTML(){
  const p=squad(CL.clubId).find(x=>x.pid===CL.mkP.pid);
  if(!p){ CL.mkP=null; return ''; }
  const vm=(typeof computeVM==='function')?computeVM(p):(p.mv||0);
  const titular=xiPlayers(CL.clubId).some(x=>x.pid===p.pid);
  return rfMkGavetaHTML('Listar '+escC(p.n),
    `${escC(rfPosInicial(p.s))} · ${p.age||'—'} anos · força ${p.f} · ${titular?'titular':'reserva'}`, `
    ${titular?'<div class="rf-mkg-aviso">É titular. Sair dele agora abre buraco no onze até você repor.</div>':''}
    <div class="rf-mkg-linha">
      ${rfMkCampoHTML('rf-mk-preco','Preço que você pede',Math.round(vm/1000)*1000,
        'valor de mercado '+escC(mvShort(vm))+' · pedir muito acima afasta comprador')}
      <button type="button" class="rf-btn rf-btn-cta" onclick="rfMkListarGo()">Pôr à venda</button>
    </div>`);
}

/* a gaveta certa pra aba certa — cada aba chama isto no topo */
function rfMktGavetaHTML(abas){
  const P=rfMkP(); if(!P) return '';
  if(abas && abas.indexOf(P.tipo)<0) return '';
  if(P.tipo==='oferta') return rfMkOfertaHTML();
  if(P.tipo==='lance')  return rfMkLanceHTML();
  if(P.tipo==='contra') return rfMkContraHTML();
  if(P.tipo==='listar') return rfMkListarHTML();
  return '';
}

/* aceitar e recusar também deixam de abrir sobreposição: resolvem na
   própria aba e o cartão da proposta some da lista no redesenho. */
function rfMkAceitar(id){
  const r=(typeof acceptIncomingOffer==='function')?acceptIncomingOffer(id):null;
  toastC((r&&r.msg)||'');
  if(r&&r.ok){ if(typeof saveV3==='function') saveV3(); CL.mkP=null; }
  cdraw();
}
function rfMkRecusar(id){
  if(typeof rejectIncomingOffer==='function') rejectIncomingOffer(id);
  if(CL.mkP&&CL.mkP.tipo==='contra'&&CL.mkP.id===id) CL.mkP=null;
  cdraw();
}
