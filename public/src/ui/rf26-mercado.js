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

/* DINHEIRO POR EXTENSO — "R$ 620 mil", "R$ 1,25 mi". É a escrita das
   telas, e nenhuma outra: fmt() dá "R$ 762k" e mvShort() dá "50M", duas
   abreviações que a referência não usa em lugar nenhum do Mercado. */
/* O SÍMBOLO SEM A CONVERSÃO É UMA MENTIRA. Esta função punha "€" (ou o que
   fosse) à frente de um número que continuava em reais internos, enquanto o
   `mvShort` e o `fmt` ao lado dela, na mesma linha da mesma tabela, convertiam.
   Em Reais (taxa 1) ninguém via; em qualquer outra moeda os dois números da
   mesma linha discordavam. O motor guarda tudo em R$ e converte só na
   apresentação — aqui é a apresentação. */
/* o valor de mercado que a interface mostra é sempre o VIVO (idade + fase),
   nunca o `p.mv` de base — é o mesmo por que o motor precifica (ver liveMV) */
function rfVM(p){ return (typeof computeVM==='function'&&p&&p.n)?computeVM(p):((p&&p.mv)||0); }
function rfDin(v){
  v=Math.round((typeof curConv==='function')?curConv(v||0):(v||0));
  const s=(typeof curSym==='function')?curSym():'R$';
  const neg=v<0?'-':''; v=Math.abs(v);
  const num=(n,c)=>String(n.toFixed(c)).replace('.',',').replace(/,0+$/,'');
  if(v>=1e9) return neg+s+' '+num(v/1e9,2)+' bi';
  if(v>=1e6) return neg+s+' '+num(v/1e6,2)+' mi';
  if(v>=1e3) return neg+s+' '+num(v/1e3,0)+' mil';
  return neg+s+' '+v;
}

/* ---- peças que se repetem nas seis abas ---- */
/* AÇÕES DO CABEÇALHO — os dois botões do canto superior direito */
function rfMktAcoesHTML(){
  return `<div class="rf-mk-acoes">
    <button type="button" class="rf-btn rf-btn-secondary" onclick="rfMktExportar()">${rfIcone('exportar',16)} Exportar lista</button>
    <button type="button" class="rf-btn rf-btn-cta" onclick="rfMktIrBuscar()">${rfIcone('buscar',16)} Buscar jogador</button>
  </div>`;
}
function rfMktExportar(){
  const linhas=rfMktMercado().map(({p,clubId,ask})=>[p.n,rfPosInicial(p.s),p.age||'',p.f,
    (anyClubOf(clubId)||{short:''}).short, ask, rfMkSalario(p)].join(';'));
  const txt='jogador;pos;idade;forca;clube;valor;salario\n'+linhas.join('\n');
  try{
    const a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(txt);
    a.download='mercado-'+(S.season||'')+'.csv'; a.click();
    toastC('Lista exportada.');
  }catch(e){ toastC('Não deu pra exportar aqui.'); }
}
/* TABELA — a grelha da referência: cabeçalho em mono espaçado, linhas
   altas, e a última coluna reservada pro botão de ação. */
/* Todas as seis abas do Mercado passam por AQUI, então a rolagem dentro do
   card e o limite de linhas entram numa alteração só. `linhas` aceita array
   (o corte precisa acontecer por linha) ou a string já junta, para as
   chamadas antigas continuarem funcionando — sem `chave` não há limite. */
function rfMkTabela(cols, cabecalho, linhas, vazio, chave){
  const arr = Array.isArray(linhas) ? linhas
    : (typeof linhas==='string' && linhas ? [linhas] : []);
  const corpo = chave
    ? rfLista(chave, arr, vazio)
    : `<div class="rf-mkt-body">${(Array.isArray(linhas)?linhas.join(''):linhas) || `<div class="rf-empty">${escC(vazio||'Nada aqui agora.')}</div>`}</div>`;
  /* `data-mkt` dá nome à tabela: no telefone cada aba precisa da sua própria
     prioridade de colunas, e sem isso uma regra escrita para o Comprar (7
     colunas) desalinharia o Vender (9) e o Leilão. */
  return `<div class="rf-mkt" data-mkt="${escC(chave||'')}" style="--rf-mkt-cols:${cols}">
    <div class="rf-mkt-head">${cabecalho}</div>
    ${corpo}
  </div>`;
}
/* mesma conta do calendário (rfCpDataDaJornada): o motor não guarda data por
   jornada, deriva do dia — sete por rodada */
/* FECHA: a DATA, nao a contagem. A coluna dizia "3 rodadas", que obriga a
   contar de cabeca para saber quando e — e ocupava o dobro da largura. Agora
   sai a data do dia em que o lote fecha, na mesma regua curta do calendario
   (rfMkDataDaJornada: sete dias por jornada). Sem data calculavel, cai na
   contagem de antes em vez de mostrar travessao. */
function rfMkFechaEm(roundsLeft){
  if(roundsLeft==null) return '—';
  const d=rfMkDataDaJornada((S.round||0)+roundsLeft);
  if(d) return d;
  return roundsLeft+(roundsLeft===1?' rodada':' rodadas');
}
/* mesma fonte unica do calendario (ver dataCurtaDaJornada). Tinha aqui a sua
   propria conta `1+i*7+6`, que e a da LIGA — e por isso o mercado e o
   calendario podiam discordar se uma delas mudasse. */
function rfMkDataDaJornada(i){
  return (typeof dataCurtaDaJornada==='function') ? dataCurtaDaJornada(i, 'liga') : '';
}
function rfMkClube(id){
  const c=anyClubOf(id)||{short:'—'};
  // ver rfCpClube: no telefone fica só o escudo, o nome chega pelo `title`, e o
  // clique abre o elenco do clube
  const acao = (id===CL.clubId) ? 'clGoSquad()' : `clViewTeam('${escC(String(id))}')`;
  return `<span class="rf-mkt-clube rf-clicavel" title="Ver o elenco do ${escC(c.short||'')}"
    onclick="event.stopPropagation();${acao}">${rfCrest(c,22)}<span>${escC(c.short)}</span></span>`;
}
function rfMkPos(p){ return `<span class="rf-mkt-pos">${escC(rfPosInicial(p.s))}</span>`; }
/* a referência usa UMA letra por setor (G/D/M/A) */
function rfPosInicial(s){ return ({GK:'G',DEF:'D',MID:'M',ATT:'A'})[s]||'—'; }
function rfMkSalario(p){
  const sal=(p.contract&&p.contract.salary)||p.salary||0;
  return sal?rfDin(sal):'—';
}
function rfMkFimContrato(p){
  const anos=(p.contract&&p.contract.years)!=null?p.contract.years:p.contract;
  return (typeof anos==='number')?String((S.season||0)+anos):'—';
}
/* botão de linha: contorno fino, texto na cor da marca. O amarelo cheio
   fica reservado pra linha em destaque (o lance que é seu, o negócio
   aceito) — é assim que a referência separa as duas. */
function rfMkBt(rot, acao, cta){
  return `<span class="rf-mkt-act"><button type="button" class="rf-mkt-bt ${cta?'cta':''}"
    onclick="event.stopPropagation();${acao}">${escC(rot)}</button></span>`;
}
/* camisa pequena do Vender — a mesma peça do banco, sem colete */
/* MESMA CAMISA DO RESTO DO JOGO. Aqui havia um segundo desenho — 34×30, sem
   gola, número em 11px preso ao corpo — e o número saía miúdo e desalinhado em
   relação ao das outras listas. Agora é a peça canónica, no tamanho médio. */
function rfMkCamisaHTML(num){ return rfElCamisa(num,'m'); }

/* =====================================================================
   1 · COMPRAR
   ===================================================================== */
const RF_MKT_FILTROS=[
  { k:'pos',   l:'Posição', op:[['all','Todas'],['GK','Goleiros'],['DEF','Defesa'],['MID','Meio'],['ATT','Ataque']] },
  { k:'forca', l:'Força',   op:[['all','qualquer'],['70','70+'],['80','80+'],['90','90+']] },
  { k:'idade', l:'Idade',   op:[['all','qualquer'],['23','até 23'],['27','até 27'],['30','até 30']] },
  { k:'preco', l:'Preço',   op:[['all','qualquer'],['caixa','o que cabe no caixa'],['meio','até metade do caixa']] },
  /* o pacote traz CINCO filtros; faltava o de clube */
  { k:'clube', l:'Clube',   op:()=>rfMktClubesOp() },
];
/* os clubes que de facto têm alguém à venda, em ordem alfabética */
/* Os clubes vêm de DATA.clubs, NÃO do mercado já filtrado: se saíssem da lista
   filtrada, escolher um clube deixaria só ele na própria caixa de selecção e não
   haveria como voltar a outro. */
function rfMktClubesOp(){
  const lista=(DATA.clubs||[])
    .filter(c=>c.id!==CL.clubId)
    .map(c=>[String(c.id), c.short||c.name||String(c.id)])
    .sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
  return [['all','qualquer']].concat(lista);
}
function rfMktF(){ return CL.mktF||(CL.mktF={pos:'all',forca:'all',idade:'all',preco:'all',clube:'all',q:''}); }
function rfMktSetF(k,v){ rfMktF()[k]=v; CL._mktCache2=null; cdraw(); }
function rfMktLimpar(){ CL.mktF={pos:'all',forca:'all',idade:'all',preco:'all',clube:'all',q:''}; CL._mktCache2=null; cdraw(); }
/* ===== BUSCA POR NOME =====
   "Buscar jogador", no Resumo, levava para a aba Comprar e mais nada: nao havia
   campo nenhum onde escrever um nome. Quem procura alguem em concreto tinha de
   percorrer sessenta linhas ordenadas por forca.

   O CAMPO NAO REDESENHA A TELA A CADA TECLA. `cdraw()` recria o HTML por
   innerHTML: o input perderia o foco e o cursor voltaria ao inicio, o que
   inverte o texto de quem escreve depressa (ja aconteceu no nome do treinador).
   Aqui so a LISTA e refeita, no lugar, e o campo nem sabe. */
/* "Buscar jogador" leva a aba Comprar E poe o cursor no campo -- antes so
   trocava de aba, e quem procurava um nome ficava a olhar para a lista. */
function rfMktIrBuscar(){
  rfSetTab('mercado','comprar');
  setTimeout(()=>{ const i=document.querySelector('#rf-mkt-q'); if(i){ i.focus(); i.select(); } },40);
}
function rfMktNorm(t){
  return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function rfMktBusca(v){
  rfMktF().q=v||'';
  CL._mktCache2=null;
  const alvo=document.querySelector('.rf-mkt[data-mkt="mkt-mercado"]');
  if(!alvo) { cdraw(); return; }
  const novo=document.createElement('div');
  novo.innerHTML=rfMktComprarTabelaHTML();
  const cheio=novo.querySelector('.rf-mkt[data-mkt="mkt-mercado"]');
  if(cheio) alvo.replaceWith(cheio);
  const cnt=document.querySelector('[data-mkt-conta]');
  if(cnt) cnt.textContent=rfMktConta();
}
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
      if(f.clube && f.clube!=='all' && String(c.id)!==String(f.clube)) return;
      if(f.q && rfMktNorm(p.n).indexOf(rfMktNorm(f.q))<0) return;
      out.push({p,clubId:c.id,ask});
    });
  });
  out.sort((a,b)=>(b.p.f||0)-(a.p.f||0));
  return out;
}
/* FILTRO = PÍLULA, não caixa de selecção do sistema. O <select> nativo é o
   último resto de aparência de sistema operativo na tela; aqui ele fica por
   baixo, invisível, e quem se vê é a pílula com rótulo e valor. */
function rfMktFiltrosHTML(){
  const f=rfMktF();
  return `<div class="rf-mkf">
    ${RF_MKT_FILTROS.map(ff0=>{
      /* as opções podem ser LISTA ou FUNÇÃO: o filtro de clube só sabe quais
         clubes existem depois de montar o mercado, e a lista muda a cada save */
      const ff={...ff0, op:(typeof ff0.op==='function')?ff0.op():ff0.op};
      const at=(ff.op.find(o=>o[0]===f[ff.k])||ff.op[0])[1];
      return `<label class="rf-mkf-p">
        <span class="rf-mkf-l">${escC(ff.l)}</span>
        <span class="rf-mkf-v">${escC(at)}</span>
        <span class="rf-mkf-c">▾</span>
        <select onchange="rfMktSetF('${ff.k}',this.value)">
          ${ff.op.map(([v,l])=>`<option value="${v}" ${f[ff.k]===v?'selected':''}>${escC(l)}</option>`).join('')}
        </select>
      </label>`;
    }).join('')}
    <label class="rf-mkf-busca">
      <span class="rf-mkf-busca-i">${rfIcone('buscar',15)}</span>
      <input id="rf-mkt-q" type="search" placeholder="Buscar jogador pelo nome"
        value="${escC(f.q||'')}" oninput="rfMktBusca(this.value)"
        onkeydown="if(event.key==='Escape'){this.value='';rfMktBusca('')}">
    </label>
    <div class="rf-sp"></div>
    <button type="button" class="rf-mkf-x" onclick="rfMktLimpar()">Limpar filtros</button>
  </div>`;
}
/* A TABELA SEPARADA DA TELA: a busca por nome refaz so isto, no lugar, sem
   passar por cdraw() -- ver rfMktBusca. */
function rfMktComprarTabelaHTML(){
  const mostra=rfMktMercado().slice(0,60);
  const linhas=mostra.map(({p,clubId,ask})=>`<div class="rf-mkt-row" onclick="rfMkPropor('${escC(clubId)}','${escC(p.n)}')">
    <span class="rf-mkt-n">${escC(p.n)}</span>
    <span class="rf-mkt-f">${p.f}</span>
    ${rfMkPos(p)}
    <span class="rf-mkt-x">${p.age||'—'}</span>
    ${rfMkClube(clubId)}
    <span class="rf-mkt-v">${escC(rfDin(ask))}</span>
    <span class="rf-mkt-v leve">${escC(rfMkSalario(p))}</span>
    ${rfMkBt('Propor',`rfMkPropor('${escC(clubId)}','${escC(p.n)}')`)}
  </div>`);
  const cabecalho=`<span>JOGADOR</span><span>FOR</span><span>POS</span><span>IDA</span>
    <span>CLUBE</span><span class="dir">VALOR</span><span class="dir">SALÁRIO</span><span></span>`;
  const vazio=(rfMktF().q||'').trim()
    ? 'Nenhum jogador com esse nome — e os filtros de posicao, forca e preco tambem contam.'
    : 'Nenhum jogador com esses filtros.';
  /* GRADE LITERAL DO PACOTE (Mercado - Abas): duas colunas flexiveis (1.3fr e
     1fr) repartem nome e clube. */
  return rfMkTabela('minmax(0,1.3fr) 28px 34px 34px minmax(0,1fr) 96px 84px 74px',
    cabecalho, linhas, vazio, 'mkt-mercado');
}
function rfMktConta(){
  const todos=rfMktMercado();
  return Math.min(60,todos.length)+' de '+todos.length;
}
function rfMktComprarHTML(){
  if(typeof canNegotiate==='function' && !canNegotiate())
    return rfCol(rfCard('Jogadores no mercado',
      `<div class="rf-empty">${escC(typeof windowClosedMsg==='function'?windowClosedMsg():'A janela de transferências está fechada.')}</div>`));
  const teto=S.budget||0;
  const folha=rfFolha();
  const sq=squad(CL.clubId);
  return rfMktGavetaHTML(['oferta']) + rfCol(
    rfCard('Jogadores no mercado',
      rfMktFiltrosHTML() + rfMktComprarTabelaHTML(),
      {right: `<span data-mkt-conta>${escC(rfMktConta())}</span>`})
    + rfCard('O que o caixa permite', `
      <div class="rf-kpis rf-kpis-4">
        ${rfKpiHTML('Caixa', rfDin(teto))}
        ${rfKpiHTML('Folha atual', rfDin(folha)+'/mês')}
        ${rfKpiHTML('Margem de salário', rfDin(Math.max(0,Math.round(teto/12)-folha))+'/mês')}
        ${rfKpiHTML('Elenco', sq.length+' de 30')}
      </div>`)
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
    return `<div class="rf-mkt-row ${meu?'destaque':''}">
      <span class="rf-mkt-n">${escC(p.n)}</span>
      <span class="rf-mkt-f">${p.f}</span>
      ${rfMkPos(p)}
      <span class="rf-mkt-x">${p.age||'—'}</span>
      ${rfMkClube(l.sellerId)}
      <span class="rf-mkt-v">${escC(rfDin(l.bid))}</span>
      <span class="rf-mkt-v ${l.myBid?'meu':'leve'}">${l.myBid?escC(rfDin(l.myBid)):'—'}</span>
      <span class="rf-mkt-prazo">${escC(rfMkFechaEm(l.roundsLeft))}</span>
      ${rfMkBt(meu?'Cobrir':'Dar lance',`rfMkLance('${escC(l.sellerId)}','${escC(l.player)}')`, meu)}
    </div>`;
  };
  const cabecalho=`<span>JOGADOR</span><span>FOR</span><span>POS</span><span>IDA</span>
    <span>CLUBE</span><span class="dir">LANCE ATUAL</span><span class="dir">SEU LANCE</span>
    <span class="dir">FECHA</span><span></span>`;
  const arrematados=fechados.map(l=>{
    const p=(typeof findP==='function')?findP(l.player,l.sellerId):null;
    const c=anyClubOf(l.leader==='cpu'?l.sellerId:l.leader)||{short:'—'};
    const meu=l.leader===S.clubId;
    return `<div class="rf-arr ${meu?'destaque':''}">
      <span class="rf-arr-i">🔨</span>
      <span class="rf-arr-n">${escC(l.player)}</span>
      <span class="rf-arr-s">${p?escC(rfPosInicial(p.s))+' · força '+p.f:''}</span>
      <span class="rf-arr-c">${escC(c.short)}</span>
      <span class="rf-arr-v">${escC(rfDin(l.bid))}</span>
    </div>`;
  }).join('');
  return rfMktGavetaHTML(['lance']) + rfCol(
    rfCard('Lotes abertos',
      rfMkTabela('minmax(0,1fr) 44px 48px 48px minmax(0,160px) 116px 108px 92px 104px',
        cabecalho, abertos.map(linha), 'Nenhum leilão aberto nesta rodada.', 'mkt-leilao'),
      {right: abertos.length? abertos.length+' ativos':''})
    + rfCard('Arrematados recentemente',
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
  const cards=ofertas.map((o,i)=>{
    const p=sq.find(x=>x.n===o.playerName)||{};
    const rodadas=Math.max(0,o.expiresRound-S.round);
    const vm=(typeof computeVM==='function'&&p.n)?computeVM(p):(p.mv||0);
    const sal=(p.contract&&p.contract.salary)||p.salary||0;
    const sub=sq.filter(x=>x.s===p.s && x.n!==p.n).sort((a,b)=>(b.f||0)-(a.f||0))[0];
    const acima=vm?(o.fee>=vm):null;
    // a tarja da esquerda é a urgência: vermelha quando resta uma rodada
    return `<div class="rf-card rf-prop2 ${rodadas<=1?'urgente':'atencao'}">
      <div class="rf-prop2-hd">
        <span class="rf-prop2-crest">${rfCrest(anyClubOf(o.buyerId)||{short:o.buyerName||'—'},44)}</span>
        <div class="rf-prop2-id">
          <span class="rf-prop2-t">${escC(o.buyerName||'Um clube')} quer o ${escC(o.playerName)}</span>
          <!-- no telefone o prazo entra curto: "resposta em 2 rodadas" quebrava a
               linha em duas e o desenho mostra o contexto numa linha só.
               Fica "rodadas", que é a unidade real do motor — o desenho escreve
               "dias", mas dia não quer dizer nada aqui e seria falso. -->
          <span class="rf-prop2-s">${escC(rfPosInicial(p.s))} · ${p.age||'—'} anos · força ${o.playerForce||p.f||'—'} · ${
            (typeof isPhone==='function'&&isPhone())?'':'resposta em '}${rodadas} rodada${rodadas===1?'':'s'}</span>
        </div>
        <div class="rf-sp"></div>
        <div class="rf-prop2-acts">
          <button type="button" class="rf-btn rf-btn-recusar" onclick="rfAcAbrir('mkt-recusar',{id:${o.id}})">Recusar</button>
          <button type="button" class="rf-btn rf-btn-secondary" onclick="rfMkContrapor(${o.id})">Contrapropor</button>
          <button type="button" class="rf-btn rf-btn-cta" onclick="rfAcAbrir('mkt-aceitar',{id:${o.id}})">Aceitar</button>
        </div>
      </div>
      <div class="rf-prop2-nums">
        ${rfKpiHTML('Oferta', rfDin(o.fee), 'à vista')}
        ${rfKpiHTML('Salário que sai', sal?rfDin(sal):'—', sal?'alívio na folha':'', sal?'bom':'')}
        ${rfKpiHTML('Valor de mercado', vm?rfDin(vm):'—',
          acima===null?'':(acima?'acima do valor':'abaixo do valor'), acima===null?'':(acima?'bom':'ruim'))}
        <!-- "PROVAVEL": e o palpite do jogo sobre quem herda a vaga, nao uma
             escalacao. Quem decide continua a ser o utilizador. -->
        ${rfKpiHTML('Provável substituto', sub?sub.n:'—', sub?'já no elenco':'sem reserva no setor', sub?'':'ruim')}
      </div>
      ${o.lastMsg?`<span class="rf-prop-msg">${rfIcone('chat',16)} ${escC(o.lastMsg)}</span>`:''}
    </div>`;
  }).join('');
  const totalFee=ofertas.reduce((t,o)=>t+(o.fee||0),0);
  const totalSal=ofertas.reduce((t,o)=>{ const p=sq.find(x=>x.n===o.playerName);
    return t+((p&&((p.contract&&p.contract.salary)||p.salary))||0); },0);
  // força de ataque e meio ANTES e DEPOIS, pra medir o buraco que a saída abre
  const saindo=new Set(ofertas.map(o=>o.playerName));
  const media=(lista,sec)=>{ const f=lista.filter(x=>x.s===sec).slice().sort((a,b)=>b.f-a.f).slice(0,4);
    return f.length?Math.round(f.reduce((t,x)=>t+x.f,0)/f.length):0; };
  const depois=sq.filter(x=>!saindo.has(x.n));
  const dAtt=media(depois,'ATT')-media(sq,'ATT'), dMid=media(depois,'MID')-media(sq,'MID');
  const del=n=>n===0?'':(n>0?'+'+n:String(n));
  return rfMktGavetaHTML(['contra']) + rfCol(cards +
    rfCard(`Impacto se aceitar ${ofertas.length===1?'a proposta':(ofertas.length===2?'as duas':'as '+ofertas.length)}`, `
      <div class="rf-kpis rf-kpis-4">
        ${rfKpiHTML('Caixa', rfDin((S.budget||0)+totalFee), '+'+rfDin(totalFee), 'bom')}
        ${rfKpiHTML('Folha', rfDin(rfFolha()-totalSal)+'/mês', totalSal?'−'+rfDin(totalSal):'', 'bom')}
        ${rfKpiHTML('Força do ataque', String(media(depois,'ATT')), del(dAtt), dAtt<0?'ruim':'bom')}
        ${rfKpiHTML('Força do meio', String(media(depois,'MID')), del(dMid), dMid<0?'ruim':'bom')}
      </div>`)
  );
}

/* =====================================================================
   4 · CONTRAPROPOSTAS
   ===================================================================== */
/* a SITUAÇÃO é uma tarja de três estados, e a cor é a distância que falta:
   cinza quando ainda não decidiram, amarelo quando falta pouco, verde
   quando aceitaram — aí a linha inteira acende e o botão vira Fechar. */
function rfMkSituacao(minha, pedido){
  if(!pedido || pedido<=minha) return {k:'ok', t:'ACEITO'};
  const dif=(pedido-minha)/pedido;
  return dif<=0.1 ? {k:'quase', t:'QUASE FECHADO'} : {k:'neutro', t:'A DECIDIR'};
}
function rfMktContraHTML(){
  const lista=(typeof myCounterOffers==='function')?myCounterOffers():[];
  const linhas=lista.map(o=>{
    const pedido=o.ask||o.counter||0, minha=o.fee||0;
    const dif=pedido-minha;
    const st=rfMkSituacao(minha,pedido);
    const feito=st.k==='ok';
    return `<div class="rf-mkt-row ${feito?'destaque':''}">
      <span class="rf-mkt-n">${escC(o.playerName||'')}</span>
      <span class="rf-mkt-pos">${escC(o.playerPos||'—')}</span>
      ${o.sellerId?rfMkClube(o.sellerId):'<span class="rf-mkt-clube">—</span>'}
      <span class="rf-mkt-v meu">${escC(rfDin(minha))}</span>
      <span class="rf-mkt-v">${pedido?escC(rfDin(pedido)):'—'}</span>
      <span class="rf-mkt-v ${dif>0?'ruim':'leve'}">${dif>0?escC(rfDin(dif)):'—'}</span>
      <span class="rf-mkt-tag ${st.k}">${st.t}</span>
      ${rfMkBt(feito?'Fechar':'Subir',`rfMkPropor('${escC(o.sellerId||'')}','${escC(o.playerName||'')}')`, feito)}
    </div>`;
  });
  const cabecalho=`<span>JOGADOR</span><span>POS</span><span>CLUBE</span>
    <span class="dir">SUA OFERTA</span><span class="dir">PEDIDO DELES</span>
    <span class="dir">DIFERENÇA</span><span class="dir">SITUAÇÃO</span><span></span>`;
  return rfMktGavetaHTML(['oferta']) + rfCol(
    rfCard('Negociações em andamento',
      rfMkTabela('minmax(0,1fr) 44px minmax(0,160px) 116px 124px 112px 132px 104px',
        cabecalho, linhas, 'Nenhuma negociação aberta agora.', 'mkt-propostas'),
      {right: lista.length? lista.length+' abertas':''})
    + rfCard('Como negociar',
      `<p class="rf-texto">Cada subida na oferta consome um dia da janela. Clubes da mesma divisão
       pedem 20% a mais quando o jogador é titular. Se a diferença for menor que 10%, costumam
       aceitar na primeira contraproposta.</p>`)
  );
}

/* =====================================================================
   5 · VENDER
   ===================================================================== */
function rfMktVenderHTML(){
  const sq=squad(CL.clubId).slice().sort((a,b)=>(b.f||0)-(a.f||0));
  const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};
  const xi=new Set(xiPlayers(CL.clubId).map(p=>p.pid));
  const linhas=sq.map((p,i)=>{
    const vm=(typeof computeVM==='function')?computeVM(p):(p.mv||0);
    // INTERESSE: quantos clubes já mandaram proposta por ele
    const clubes=rfPropostas().filter(o=>o.playerName===p.n).length;
    /* SEM LINHA DESTACADA. O primeiro da lista vinha com contorno claro como se
       estivesse selecionado, mas ninguém o selecionou — era só o mais valioso.
       Marca de seleção que não corresponde a uma escolha do utilizador confunde
       em vez de orientar. */
    return `<div class="rf-mkt-row" onclick="rfMkListar('${escC(p.pid)}')">
      <span class="rf-mkt-nome">${rfMkCamisaHTML(nums[p.pid]||p.num)}<b>${escC(p.n)}</b></span>
      <span class="rf-mkt-f">${p.f}</span>
      ${rfMkPos(p)}
      <span class="rf-mkt-x">${p.age||'—'}</span>
      <span class="rf-mkt-v">${escC(rfDin(vm))}</span>
      <span class="rf-mkt-v leve">${escC(rfMkSalario(p))}</span>
      ${rfMkBt('Listar',`rfMkListar('${escC(p.pid)}')`)}
    </div>`;
  });
  /* FIM DE CONTRATO e INTERESSE saíram: com nove colunas o botão Listar só
     aparecia depois de rolar. As duas continuam na ficha do jogador. */
  const cabecalho=`<span>JOGADOR</span><span>FOR</span><span>POS</span><span>IDA</span>
    <span class="dir">VALOR</span><span class="dir">SALÁRIO</span><span></span>`;
  // QUEM VOCÊ NÃO DEVERIA VENDER: o titular mais caro de repor
  const chave=[...xi].map(pid=>sq.find(p=>p.pid===pid)).filter(Boolean).filter(p=>{
    const outros=sq.filter(x=>x.s===p.s && x.pid!==p.pid && (x.f||0)>=(p.f||0)-5);
    return outros.length===0;
  }).sort((a,b)=>(b.f||0)-(a.f||0))[0];
  const gols=(chave&&chave.stats&&chave.stats.goals)||0;
  const golsTime=sq.reduce((t,p)=>t+((p.stats&&p.stats.goals)||0),0);
  return rfMktGavetaHTML(['listar']) + rfCol(
    rfCard('Seu elenco à venda',
      rfMkTabela('minmax(0,1.3fr) 28px 34px 34px 96px 92px 74px',
        cabecalho, linhas, 'Elenco vazio.', 'mkt-vender'),
      {right: sq.length+' jogadores'})
    + rfCard('Quem você não deveria vender',
      chave
        ? `<p class="rf-texto">${escC(chave.n)} é o único do sector com esse nível no elenco${
            golsTime?` e responde por ${gols} dos ${golsTime} gols do time`:''}. Vender agora abre
           um buraco no onze que o banco não cobre, e a direcção cobra explicação se a campanha cair.</p>`
        : `<p class="rf-texto">O banco cobre todos os titulares. Dá para negociar sem abrir buraco no onze.</p>`)
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
  /* QUANDO: data curta (7/mar), a mesma régua do calendário — sete dias por
     jornada, ver rfCpDataDaJornada. Antes saía em texto ("há 3 jornadas",
     "temporada 2027"), que ocupava o dobro da largura e ainda obrigava a contar
     de cabeça para saber quando foi. De outra temporada, entra o ano. */
  const quando=h=>{
    const d=rfMkDataDaJornada(h.round||0);
    if(h.season!==S.season) return (d?d+'/':'')+String(h.season||'').slice(-2);
    return d||'—';
  };
  /* SEM DESTAQUE NAS LINHAS. Marcava toda transferência que envolvia o seu clube,
     e numa janela movimentada isso enchia a tabela de faixas coloridas — o
     realce perdia o sentido e o bloco ficava pesado de ler. O seu clube já se
     identifica pelo escudo e pelo nome na própria linha. */
  const linhas=ent.map(({p,h})=>`<div class="rf-mkt-row">
    <span class="rf-mkt-n">${escC(p.n)}</span>
    ${rfMkPos(p)}
    <span class="rf-mkt-f">${p.f}</span>
    ${h.from?rfMkClube(h.from):`<span class="rf-mkt-clube">${escC(nomeDe(h.from))}</span>`}
    <span class="rf-mkt-seta">→</span>
    ${h.to?rfMkClube(h.to):`<span class="rf-mkt-clube">${escC(nomeDe(h.to))}</span>`}
    <span class="rf-mkt-v">${escC(rfDin(h.fee||0))}</span>
    <span class="rf-mkt-x">${escC(quando(h))}</span>
  </div>`);
  const cabecalho=`<span>JOGADOR</span><span>POS</span><span>FOR</span><span>DE</span>
    <span></span><span>PARA</span><span class="dir">VALOR</span><span class="dir">QUANDO</span>`;
  const aberta=(typeof inTransferWindow==='function')?inTransferWindow():true;
  const jornadas=(S.sched||[]).length||14;
  const pct=Math.max(0,Math.min(100,Math.round((S.round||0)/jornadas*100)));
  const faltam=Math.max(0,jornadas-(S.round||0));
  return rfCol(
    rfCard('Janela de transferências', `
      <div class="rf-jan-l">
        <span class="rf-jan-t">${aberta?'Aberta desde a 1ª jornada':'Fechada'}</span>
        <span class="rf-jan-p">${pct}%</span>
      </div>
      <div class="rf-jan-trilho"><i style="width:${pct}%"></i></div>`,
      {right: aberta?('fecha em '+faltam+' jornada'+(faltam===1?'':'s')):'fechada'})
    + rfCard('Movimentações da divisão',
      rfMkTabela('minmax(0,1fr) 44px 48px minmax(0,150px) 28px minmax(0,150px) 116px 116px',
        /* CHAVE PRÓPRIA. Esta tabela usava 'mkt-contra', a mesma das
           contrapropostas: as duas dividiam o estado da lista longa e herdavam
           uma da outra a grade do telefone, o que partia o cabeçalho em duas
           linhas e desalinhava as colunas. */
        cabecalho, linhas, 'Nenhuma transferência registrada ainda nesta temporada.', 'mkt-transf'),
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
/* O MESMO CAMPO TEM DOIS NOMES. A gaveta do Mercado desenha `rf-mk-*`; os
   diálogos de ação (rf26-acoes.js) desenham `rf-ac-*`. Os handlers só procuravam
   `rf-mk-*`, então TODA proposta feita pelo diálogo lia zero e devolvia "Digite
   quanto você quer oferecer" — mesmo com o valor digitado à vista. Valia para
   propor, dar lance, listar e contrapor: quatro botões mortos pelo mesmo motivo.
   Aqui a busca aceita os dois nomes, e o diálogo tem prioridade porque, quando
   ele está aberto, é nele que a pessoa está a escrever. */
function rfMkNum(id){
  const alt=String(id||'').replace(/^rf-mk-/,'rf-ac-');
  const el=document.querySelector('#'+alt) || document.querySelector('#'+id);
  return el ? (parseInt((el.value||'').replace(/\D/g,''),10)||0) : 0;
}
/* O QUE ENTRA TEM DE VOLTAR NA MESMA MOEDA EM QUE SAIU.
   Todo campo de dinheiro destes diálogos é preenchido com `moneyDisp(...)`, que
   converte de R$ interno para a moeda escolhida. Mas quatro dos seis leitores
   pegavam o número digitado e mandavam direto para o motor, sem desfazer a
   conversão: a proposta, o salário da negociação, a proposta a humano e o lance
   do leilão. Em Reais (taxa 1) ninguém via; em qualquer outra moeda o jogador
   escrevia um valor e o caixa era debitado noutro — dinheiro a sério, errado.
   `rfMkVal` é o leitor de dinheiro; `rfMkNum` fica para o que não é dinheiro. */
function rfMkVal(id){
  const v=rfMkNum(id);
  return (typeof curParse==='function')?curParse(v):v;
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
  rfAcPreparar(clubId, nome); if(!CL.market) return;
  rfAcAbrir('mkt-propor', {clubId, player:nome, oferta:CL.market.offer});
}
function rfAcPreparar(clubId, nome){
  CL.market=null;
  const p=(typeof findP==='function')?findP(nome,clubId):null; if(!p) return;
  if(typeof isTradeLocked==='function' && isTradeLocked(p)){
    toastC(`${p.n} já foi negociado nesta temporada.`); return; }
  const ask=(typeof playerAsk==='function')?playerAsk(p,clubId):(p.mv||0);
  // reaproveita a negociação já aberta com este jogador, se houver
  const idx=(S.negos||[]).findIndex(n=>n && n.clubId===clubId && n.player===nome && !n.done);
  CL.market={step:'offer', clubId, player:nome,
    offer: idx>=0 ? (S.negos[idx].clubCounter||S.negos[idx].offerFee) : Math.round(ask/1000)*1000,
    negoIdx: idx>=0?idx:null};
}
function rfMkProporFee(){
  const M=CL.market; if(!M) return;
  M.offer=rfMkVal('rf-mk-fee');
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
/* LIA O CAMPO ERRADO. O diálogo novo (rf26-acoes.js) desenha o input com o id
   `rf-ac-sal`; aqui lia-se `rf-mk-sal`, que é o da gaveta ANTIGA. Fora dela o
   selector não achava nada, `rfMkVal` devolvia 0 e o `||n.salary` repunha o
   valor de antes — ou seja, o que o utilizador escrevesse no campo do salário
   era simplesmente ignorado. Agora lê o que estiver na tela, seja qual for. */
function rfMkSalarioDoCampo(){
  const v=rfMkVal('rf-ac-sal');
  return v || rfMkVal('rf-mk-sal') || 0;
}
function rfMkTermos(){
  const M=CL.market; const n=S.negos[M.negoIdx];
  n.salary=rfMkSalarioDoCampo()||n.salary;
  const r=agentRespond(n); toastC(r.msg||''); cdraw();
}
function rfMkAceitarAgente(){
  const M=CL.market; const n=S.negos[M.negoIdx];
  if(n.agentCounter) n.salary=n.agentCounter; cdraw();
}
function rfMkFinalizar(){
  const M=CL.market; const n=S.negos[M.negoIdx];
  /* grava o que está no campo ANTES de fechar: no veredito com pedido do
     empresário em aberto o campo é editável e é ele que manda */
  const doCampo=rfMkSalarioDoCampo();
  if(n && doCampo) n.salary=doCampo;
  const r=finalizeTransfer(M.negoIdx);
  toastC(r.msg||'');
  if(r.ok){ rfGravar(); CL.mkP=null; CL.market=null; CL.acao=null; }
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
        ${rfMkCampoHTML('rf-mk-fee','Sua proposta',M.offer,'valor de mercado '+escC(rfDin(rfVM(p))))}
        <button type="button" class="rf-btn rf-btn-primary" onclick="rfMkEnviarHumano()">Enviar proposta</button>
      </div>`);
  }
  if(!n || n.stage==='fee' || n.stage==='counterFee'){
    const pediu = n && n.stage==='counterFee' && n.clubCounter;
    return rfMkGavetaHTML('Proposta por '+escC(p.n), sub, `
      ${pediu?`<div class="rf-mkg-aviso">O ${escC(c.short)} quer a partir de <b>${escC(rfDin(n.clubCounter))}</b>.
        <button type="button" class="rf-btn rf-btn-ghost" onclick="rfMkIgualar()">Igualar pedido</button></div>`:''}
      <div class="rf-mkg-linha">
        ${rfMkCampoHTML('rf-mk-fee','Sua proposta (taxa)',M.offer,'valor de mercado '+escC(rfDin(rfVM(p)))+' · caixa '+escC(rfDin(S.budget||0)))}
        <button type="button" class="rf-btn rf-btn-primary" onclick="rfMkProporFee()">Propor</button>
      </div>`);
  }
  if(n.stage==='terms'){
    return rfMkGavetaHTML('Salário de '+escC(p.n), 'taxa acertada em '+escC(rfDin(n.offerFee)), `
      ${n.agentCounter?`<div class="rf-mkg-aviso">O empresário pede <b>${escC(fmt(n.agentCounter))}</b> por semana.
        <button type="button" class="rf-btn rf-btn-ghost" onclick="rfMkAceitarAgente()">Aceitar o pedido</button></div>`:''}
      <div class="rf-mkg-linha">
        ${rfMkCampoHTML('rf-mk-sal','Salário semanal',n.salary,'a folha de hoje é '+escC(rfDin(rfFolha())))}
        <button type="button" class="rf-btn rf-btn-primary" onclick="rfMkTermos()">Oferecer</button>
      </div>`);
  }
  return rfMkGavetaHTML(escC(p.n)+' está fechado', 'taxa '+escC(rfDin(n.offerFee))+' · salário '+escC(rfDin(n.salary||0)), `
    <div class="rf-mkg-linha">
      <span class="rf-note">Falta só assinar. O valor sai do caixa na hora e o salário entra na folha do mês seguinte.</span>
      <button type="button" class="rf-btn rf-btn-cta" onclick="rfMkFinalizar()">Fechar contratação</button>
    </div>`);
}
function rfMkEnviarHumano(){
  const M=CL.market; M.offer=rfMkVal('rf-mk-fee');
  const r=sendHumanOffer(M.clubId,M.player,M.offer); toastC(r.msg||'');
  if(r.ok){ rfGravar(); CL.mkP=null; CL.market=null; CL.acao=null; }
  cdraw();
}
function rfFolha(){
  return squad(CL.clubId).reduce((t,p)=>t+((p.contract&&p.contract.salary)||p.salary||0),0);
}

/* ---- 2 · LANCE DE LEILÃO ---- */
function rfMkLance(sellerId, player){
  if(typeof mergeAuctionBidsFromSeats==='function'){ try{ mergeAuctionBidsFromSeats(); }catch(e){} }
  CL.mkP={tipo:'lance', sellerId, player};
  const lot=((S.auctions&&S.auctions.lots)||[]).find(l=>l.id===sellerId+'|'+player);
  // COBRIR e DAR LANCE são dois diálogos diferentes no pacote: cobrir é
  // quando alguém já está na frente, e abre com o aviso de quem é.
  const cobrir = lot && lot.leader && lot.leader!==S.clubId && lot.myBid;
  rfAcAbrir(cobrir?'mkt-cobrir':'mkt-lance', {sellerId, player});
}
/* Mostra o próximo leilão fechado por OUTRO clube, um de cada vez, e só uma vez
   por venda. Chamado ao voltar da rodada (ver rfPrContinuar): é o momento em que
   o utilizador está a par do que aconteceu na jornada. */
function rfMkLeilaoOutroPendente(){
  const fila=(typeof S!=='undefined' && S.auctionSales)||[];
  const v=fila.find(x=>x && !x._visto);
  if(!v) return false;
  v._visto=true;
  rfAcAbrir('mkt-leilao-outro',{venda:v});
  return true;
}
function rfMkLanceGo(){
  const P=CL.mkP; const id=P.sellerId+'|'+P.player;
  const lot=((S.auctions&&S.auctions.lots)||[]).find(l=>l.id===id);
  /* COBERTURA = dar lance quando a liderança é de outro clube. O motor não
     contava isso; o diálogo do pacote mostra "2 de 3" e avisa que na terceira o
     lote fecha, então o número precisa existir em algum lugar. Fica no próprio
     lote, que é salvo junto com o resto do leilão. */
  const eraCobertura = !!(lot && lot.leader && lot.leader!==S.clubId);
  const r=placeAuctionBid(id, rfMkVal('rf-mk-lance'));
  if(r&&r.ok&&eraCobertura&&lot) lot.myCovers=(lot.myCovers||0)+1;
  toastC(r.msg||'');
  if(r.ok){ rfGravar(); CL.mkP=null; CL.acao=null; }
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
      ${rfMkCampoHTML('rf-mk-lance','Seu lance',sugerido,'precisa passar de '+escC(mvShort(lot.bid))+' · caixa '+escC(rfDin(S.budget||0)))}
      <button type="button" class="rf-btn rf-btn-cta" onclick="rfMkLanceGo()">Confirmar lance</button>
    </div>`);
}

/* ---- 3 · CONTRAPROPOR (uma proposta recebida) ---- */
function rfMkContrapor(id){ CL.mkP={tipo:'contra', id}; rfAcAbrir('mkt-contra',{id}); }
function rfMkContraporGo(){
  const P=CL.mkP; const valor=rfMkVal('rf-mk-ask');
  if(valor<=0){ toastC('Digite quanto você quer pedir.'); return; }
  const o=rfPropostas().find(x=>x.id===P.id);
  /* PEDIR ABAIXO DA OFERTA NAO E CONTRAPROPOSTA. O motor aceita e responde "segue valendo X" —
     so que gasta uma das tres rodadas de negociacao e nada muda no ecra. Barrado aqui, com o
     numero a bater: e a mesma conta que enche o campo. */
  if(o && valor<=(o.fee||0)){ toastC('Peça mais do que os '+rfDin(o.fee||0)+' que eles já oferecem.'); return; }
  const humano = o && CL.online && CL.humans && CL.humans[o.buyerId];
  const r = humano ? counterHumanOffer(P.id, valor)
                   : (counterIncomingOffer(P.id, valor)||{ok:true});
  if(r&&r.msg) toastC(r.msg);
  if(!r||r.ok!==false) rfGravar();
  /* ===== O DIALOGO SO FECHA QUANDO NAO HA MAIS NADA A DECIDIR =====
     Ele fechava sempre que a resposta vinha "ok" — e o caso mais importante e justamente esse:
     "toparam o seu pedido". A venda NAO estava feita (falta aceitar), mas o diálogo desaparecia
     e o jogador tinha de voltar à lista e procurar a proposta outra vez, sem o número que
     acabara de negociar à frente. Agora fica aberto enquanto a proposta existir: ali estão a
     resposta deles, o valor novo e o botão de aceitar. */
  if(!rfPropostas().find(x=>x.id===P.id)){ CL.mkP=null; CL.acao=null; }
  cdraw();
}
function rfMkContraHTML(){
  const o=rfPropostas().find(x=>x.id===CL.mkP.id);
  if(!o){ CL.mkP=null; return ''; }
  const p=squad(CL.clubId).find(x=>x.n===o.playerName)||{};
  const vm=(typeof computeVM==='function'&&p.n)?computeVM(p):(p.mv||0);
  return rfMkGavetaHTML('Contraproposta por '+escC(o.playerName),
    `${escC(o.buyerName||'um clube')} ofereceu ${escC(rfDin(o.fee||0))}`, `
    <div class="rf-mkg-linha">
      ${rfMkCampoHTML('rf-mk-ask','Quanto você pede',Math.round((vm||o.fee)*1.15/1000)*1000,
        'valor de mercado '+escC(mvShort(vm||0))+' · pedir muito acima costuma matar a negociação')}
      <button type="button" class="rf-btn rf-btn-primary" onclick="rfMkContraporGo()">Enviar contraproposta</button>
    </div>`);
}

/* ---- 4 · LISTAR PRA VENDA ---- */
function rfMkListar(pid){ CL.mkP={tipo:'listar', pid}; CL.selPlayer=pid; rfAcAbrir('mkt-listar',{pid}); }
function rfMkListarGo(){
  CL.selPlayer=CL.mkP.pid;
  CL.sellPrice=String(rfMkNum('rf-mk-preco')||'');
  CL.mkP=null; CL.acao=null;
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
        'valor de mercado '+escC(rfDin(vm))+' · pedir muito acima afasta comprador')}
      <button type="button" class="rf-btn rf-btn-cta" onclick="rfMkListarGo()">Pôr à venda</button>
    </div>`);
}

/* a gaveta certa pra aba certa — cada aba chama isto no topo */
/* AS GAVETAS SAÍRAM. O pacote "Ações Internas" define ação interna como
   DIÁLOGO — cartão centrado, cabeçalho em degradê, filete amarelo —, não
   como cartão dentro da aba. Quem desenha agora é rfAcao(), em
   rf26-acoes.js; esta função devolve vazio para as abas não mudarem. */
function rfMktGavetaHTML(abas){
  return '';
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
  if(r&&r.ok){ rfGravar(); CL.mkP=null; CL.acao=null; }
  cdraw();
}
function rfMkRecusar(id){
  if(typeof rejectIncomingOffer==='function') rejectIncomingOffer(id);
  if(CL.mkP&&CL.mkP.tipo==='contra'&&CL.mkP.id===id) CL.mkP=null;
  CL.acao=null;
  cdraw();
}
