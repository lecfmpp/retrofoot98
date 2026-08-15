/* =====================================================================
   RetroFoot98 — AS AÇÕES INTERNAS
   Portado de telas/Acoes - Mercado, Acoes - Elenco e E-mail e
   Acoes - Sistema e Conta (pacote "Ações Internas").

   São 24 diálogos: o que abre quando você clica num botão de ação
   dentro de uma página. Todos usam o MESMO envelope — cartão branco de
   cantos redondos, cabeçalho em degradê escuro com o filete amarelo à
   esquerda, corpo de 18px e rodapé com a ação à direita.

   Esta camada SUBSTITUI os popups antigos (dlg/overlayC) dessas ações.
   Nenhum deles volta: quem desenha ação interna daqui pra frente é
   rfAcao(), e nada mais.
   ===================================================================== */

/* ---------- o envelope ---------- */
function rfAcao(o){
  o=o||{};
  const larg=o.w||520;
  const rodape = (o.acoes||[]).map(a=>{
    const cls = a.tom==='perigo' ? 'perigo' : a.tom==='fantasma' ? 'fantasma' : 'cta';
    return `<button type="button" class="rf-ac-bt ${cls}" onclick="${a.on||'rfAcFechar()'}">${a.l}</button>`;
  });
  // um botão só fica à direita; dois abrem-se nas pontas
  const barra = rodape.length>1
    ? rodape[0]+'<div class="rf-sp"></div>'+rodape.slice(1).join('')
    : '<div class="rf-sp"></div>'+rodape.join('');
  return `<div class="rf-ac-fundo" onclick="if(event.target===this)rfAcFechar()">
    <div class="rf-ac" style="width:${larg}px" role="dialog" aria-modal="true">
      <div class="rf-ac-hd">
        <span class="rf-ac-k">${o.kicker||''}</span>
        <span class="rf-ac-t">${o.titulo||''}</span>
      </div>
      <div class="rf-ac-corpo">${o.corpo||''}</div>
      ${rodape.length?`<div class="rf-ac-pe">${barra}</div>`:''}
    </div>
  </div>`;
}
function rfAcAbrir(id, dados){ CL.acao={id, d:dados||{}}; cdraw(); }
function rfAcFechar(){ CL.acao=null; cdraw(); }
function rfAcD(){ return (CL.acao&&CL.acao.d)||{}; }

/* ---------- as peças do corpo ---------- */
/* faixa de identidade: camisa, nome + linha de contexto, e um número à direita */
function rfAcFichaHTML(p, rotulo, valor, num){
  const th=(typeof clubTheme==='function')?clubTheme(CL.clubId):{};
  const c1=th.col||'#17458F', c2=th.col2||'#F2B90C';
  const setor=({GK:'Goleiro',DEF:'Defesa',MID:'Meio-campo',ATT:'Atacante'})[p&&p.s]||'—';
  return `<div class="rf-ac-ficha">
    <span class="rf-ac-cam" aria-hidden="true">
      <i class="rf-ac-cam-b" style="background:${c1}"></i>
      <i class="rf-ac-cam-l" style="background:${c2}"></i><i class="rf-ac-cam-r" style="background:${c2}"></i>
      <i class="rf-ac-cam-g" style="background:${c2}"></i>
      <b style="color:${barTextColor(c1,c2)}">${escC(String(num||''))}</b>
    </span>
    <span class="rf-ac-f-id">
      <span class="rf-ac-f-n">${escC((p&&p.n)||'—')}</span>
      <span class="rf-ac-f-s">${escC(setor)} · ${(p&&p.age)||'—'} anos · força ${(p&&p.f)||'—'}</span>
    </span>
    ${rotulo?`<span class="rf-ac-f-v">
      <span class="rf-ac-f-vl">${escC(rotulo)}</span>
      <span class="rf-ac-f-vv">${escC(valor||'—')}</span>
    </span>`:''}
  </div>`;
}
/* campo de dinheiro: rótulo, caixa e a linha de ajuda embaixo */
/* ATALHOS DE LANCE (+25 / +50 / +100 mil). O pacote troca a digitação por três
   botões com o VALOR RESULTANTE à vista: num leilão o que importa é decidir
   rápido, e obrigar a somar de cabeça sob relógio é o oposto disso. Cada botão
   escreve no campo do diálogo, então o handler continua lendo um só lugar. */
const RF_LANCE_MIN=25000;   // incremento mínimo anunciado no diálogo e no 1º atalho
function rfAcAtalhosLanceHTML(id, base){
  const passos=[RF_LANCE_MIN,50000,100000];
  return `<div class="rf-ac-atalhos">${passos.map(inc=>{
    const v=Math.round(base+inc);
    return `<button type="button" class="rf-ac-atalho" onclick="rfAcSetValor(event,'${id}',${v})">
      <span class="rf-ac-atalho-i">+${Math.round(inc/1000)} mil</span>
      <span class="rf-ac-atalho-v">${escC(rfDin(v))}</span>
    </button>`;
  }).join('')}</div>`;
}
function rfAcSetValor(ev, id, v){
  const el=document.getElementById(id);
  if(!el) return;
  el.value=(typeof moneyDisp==='function')?moneyDisp(v):String(v);
  el.dispatchEvent(new Event('input',{bubbles:true}));
  /* o botão vem pelo próprio evento — `window.event` é legado e não é fiável */
  document.querySelectorAll('.rf-ac-atalho').forEach(b=>b.classList.remove('on'));
  const bt=ev&&ev.currentTarget; if(bt&&bt.classList) bt.classList.add('on');
}
function rfAcCampoHTML(id, rotulo, valor, dica, opts){
  opts=opts||{};
  return `<label class="rf-ac-campo">
    <span class="rf-ac-l">${escC(rotulo)}</span>
    <span class="rf-ac-cx ${opts.foco?'foco':''}">
      ${opts.puro?'':`<span class="rf-ac-cur">${escC(curSym())}</span>`}
      <input class="rf-ac-in" id="${id}" ${opts.tipo==='texto'?'':'inputmode="numeric"'}
        value="${valor!=null?escC(String(valor)):''}" placeholder="${escC(opts.ph||'')}"
        ${opts.tipo==='texto'?'':'oninput="clMoneyInputReformat(this)"'}>
      ${opts.sufixo?`<span class="rf-ac-suf">${escC(opts.sufixo)}</span>`:''}
    </span>
    ${dica?`<span class="rf-ac-d">${dica}</span>`:''}
  </label>`;
}
/* − valor ＋ */
function rfAcPassoHTML(id, rotulo, valor, dica){
  return `<label class="rf-ac-campo">
    <span class="rf-ac-l">${escC(rotulo)}</span>
    <span class="rf-ac-passo">
      <button type="button" class="rf-ac-pb" onclick="rfAcPasso('${id}',-1)">−</button>
      <span class="rf-ac-pv" id="${id}">${valor}</span>
      <button type="button" class="rf-ac-pb" onclick="rfAcPasso('${id}',1)">＋</button>
    </span>
    ${dica?`<span class="rf-ac-d">${dica}</span>`:''}
  </label>`;
}
function rfAcPasso(id, d){
  const el=document.querySelector('#'+id); if(!el) return;
  const v=Math.max(1,Math.min(6,(parseInt(el.textContent,10)||1)+d));
  el.textContent=v;
}
/* linha de consequência: rótulo à esquerda, número à direita, com tom */
function rfAcLinhaHTML(rotulo, valor, tom, topo){
  return `<div class="rf-ac-linha ${topo?'topo':''}">
    <span class="rf-ac-li-l">${escC(rotulo)}</span>
    <span class="rf-ac-li-v ${tom||''}">${escC(valor)}</span>
  </div>`;
}
function rfAcNotaHTML(txt){ return `<span class="rf-ac-nota">${txt}</span>`; }
/* medidor de chance (0-100) */
function rfAcChanceHTML(rotulo, pct){
  const cor = pct>=70?'ok' : pct>=40?'aviso' : 'ruim';
  return `<div class="rf-ac-chance">
    <div class="rf-ac-ch-l"><span class="rf-ac-l">${escC(rotulo)}</span>
      <span class="rf-ac-ch-p ${cor}">${pct}%</span></div>
    <div class="rf-ac-ch-t"><i class="${cor}" style="width:${pct}%"></i></div>
  </div>`;
}
/* aviso destacado (perigo, atenção) */
function rfAcAvisoHTML(txt, tom){ return `<div class="rf-ac-aviso ${tom||''}">${txt}</div>`; }
/* selo grande de resultado (arrematado, gravado, renovado) */
function rfAcSeloHTML(emoji, titulo, sub){
  return `<div class="rf-ac-selo">
    <span class="rf-ac-selo-e">${emoji}</span>
    <span class="rf-ac-selo-t">${escC(titulo)}</span>
    ${sub?`<span class="rf-ac-selo-s">${escC(sub)}</span>`:''}
  </div>`;
}
/* lista de opções de rádio (o que responder, como listar, o que fazer) */
function rfAcOpcoesHTML(nome, opcoes, sel){
  return `<div class="rf-ac-ops">${opcoes.map((o,i)=>`
    <button type="button" class="rf-ac-op ${(sel==null?i===0:sel===i)?'on':''}"
      onclick="rfAcEscolher('${nome}',${i})">
      <span class="rf-ac-op-r"></span>
      <span class="rf-ac-op-id"><span class="rf-ac-op-t">${escC(o.t)}</span>
        ${o.s?`<span class="rf-ac-op-s">${escC(o.s)}</span>`:''}</span>
    </button>`).join('')}</div>`;
}
function rfAcEscolher(nome, i){ CL.acao.d[nome]=i; cdraw(); }

/* =====================================================================
   OS 24 DIÁLOGOS
   Cada entrada devolve o envelope montado. O ROTEADOR embaixo é o único
   ponto que o resto do jogo precisa conhecer: rfAcAbrir('id', dados).
   ===================================================================== */
const RF_ACOES = {

/* ---------- MERCADO (9) ---------- */
'mkt-propor': d=>{
  const p=(typeof findP==='function')?findP(d.player,d.clubId):null;
  const c=anyClubOf(d.clubId)||{short:'—'};
  const ask=(p&&typeof playerAsk==='function')?playerAsk(p,d.clubId):0;
  /* O CAMPO NUNCA NASCE ABAIXO DO QUE O CLUBE ACEITA. Ele já vinha com o pedido
     na primeira abertura, mas ao REABRIR depois de uma recusa voltava com o valor
     anterior — que era justamente o que o clube tinha recusado. O piso é o mínimo
     que o clube aceita (o mesmo 90% do pedido que a dica logo abaixo anuncia),
     então a proposta pré-preenchida é sempre uma proposta viável. */
  const minimo=Math.round(ask*0.9/1000)*1000;
  const oferta=Math.max(minimo, d.oferta||Math.round(ask/1000)*1000);
  const sal=(p&&((p.contract&&p.contract.salary)||p.salary))||0;
  const caixa=(S.budget||0)-oferta;
  const folha=rfFolha()+sal;

  /* ===== UMA COMPRA TEM TRÊS ETAPAS, E O DIÁLOGO PRECISA SABER EM QUAL ESTÁ =====
     O motor já separa: `fee` (acertar a taxa com o CLUBE), `terms` (acertar o
     salário com o JOGADOR) e `verdict` (fechar). O diálogo mostrava taxa e
     salário juntos e nunca olhava o estágio — então, depois de o clube aceitar,
     reaparecia igual, pedindo a taxa outra vez com um valor novo. Era impossível
     saber se havia que refazer a proposta ou só preencher o salário.
     Agora cada etapa tem a sua tela, e a etapa vencida aparece como FATO
     ("taxa acertada"), não como campo para preencher de novo. */
  const M=CL.market;
  const n=(M && M.negoIdx!=null && S.negos) ? S.negos[M.negoIdx] : null;
  const etapa=(n&&n.stage)||'fee';

  if(n && etapa==='terms'){
    const pedeAgente=n.agentCounter||0;
    const salAtual=n.salary||sal;
    const folhaDepois=rfFolha()+salAtual;
    return rfAcao({ kicker:'MERCADO · COMPRAR · ETAPA 2 DE 3',
      titulo:'Salário de '+escC((p&&p.n)||'—'), w:520,
      corpo:
        rfAcFichaHTML(p,'TAXA ACERTADA',rfDin(n.offerFee),d.num)
        + rfAcAvisoHTML(`O ${escC(c.short)} <b>aceitou a taxa</b> de ${escC(rfDin(n.offerFee))}. Falta acertar o salário com o jogador.`,'ok')
        + rfAcCampoHTML('rf-ac-sal','Salário oferecido', moneyDisp(salAtual),
            pedeAgente?`O empresário pede ${escC(rfDin(pedeAgente))}/mês.`
                      :`O jogador pede no mínimo ${escC(rfDin(Math.round(salAtual*0.9)))}.`,
            {sufixo:'/mês', foco:true})
        + rfAcLinhaHTML('Folha depois da contratação', rfDin(folhaDepois)+'/mês', 'aviso', true)
        + rfAcNotaHTML('A taxa já está fechada — daqui em diante você negocia só com o jogador.'),
      acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Enviar termos',on:'rfMkTermos()'}] });
  }

  if(n && etapa==='verdict'){
    const salFinal=n.salary||sal;
    return rfAcao({ kicker:'MERCADO · COMPRAR · ETAPA 3 DE 3',
      titulo:'Fechar a contratação de '+escC((p&&p.n)||'—'), w:520,
      corpo:
        rfAcFichaHTML(p,'TAXA',rfDin(n.offerFee),d.num)
        + rfAcLinhaHTML('Salário combinado', rfDin(salFinal)+'/mês', '', true)
        + rfAcLinhaHTML('Caixa depois', rfDin((S.budget||0)-n.offerFee), ((S.budget||0)-n.offerFee)<0?'ruim':'ok')
        + rfAcLinhaHTML('Folha depois', rfDin(rfFolha()+salFinal)+'/mês', 'aviso')
        + rfAcNotaHTML('Clube e jogador já concordaram. Confirmar transfere o jogador para o seu elenco.'),
      acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Fechar contratação',on:'rfMkFinalizar()'}] });
  }

  const pediu = n && n.clubCounter;
  return rfAcao({ kicker:'MERCADO · COMPRAR · ETAPA 1 DE 3',
    titulo:'Proposta por '+escC((p&&p.n)||'—'), w:520,
    corpo:
      rfAcFichaHTML(p,'PEDIDO',rfDin(ask),d.num)
      + (pediu?rfAcAvisoHTML(`O ${escC(c.short)} quer a partir de <b>${escC(rfDin(n.clubCounter))}</b>.`,'aviso'):'')
      + rfAcCampoHTML('rf-ac-fee','Valor da proposta', oferta?moneyDisp(oferta):'',
          `Abaixo de ${escC(rfDin(minimo))} o ${escC(c.short)} recusa direto.`, {foco:true})
      + rfAcLinhaHTML('Caixa depois da compra', rfDin(caixa), caixa<0?'ruim':'ok', true)
      + rfAcLinhaHTML('Folha depois da contratação', rfDin(folha)+'/mês', 'aviso')
      + rfAcNotaHTML(`Primeiro acerta-se a TAXA com o ${escC(c.short)}. O salário do jogador vem na etapa seguinte.`),
    acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Enviar proposta',on:'rfMkProporFee()'}] });
},

/* LEILÃO DE OUTRO CLUBE — a ficha completa do jogador que saiu, e para onde foi.
   O pacote desenha isto como aviso de tela cheia sobre véu: não é uma decisão,
   é uma notícia que fecha com OK. Os dados vêm da fotografia guardada na
   resolução do lote (S.auctionSales), porque nesse momento o jogador já trocou
   de elenco e ler dele agora daria o clube errado. */
'mkt-leilao-outro': d=>{
  const v=d.venda||{};
  const comprador=anyClubOf(v.comprador)||{short:'—'};
  const vendedor=anyClubOf(v.vendedor)||{short:'—'};
  const setor=({GK:'Goleiro',DEF:'Defesa',MID:'Meio-campo',ATT:'Atacante'})[v.pos]||'—';
  const linha=(r,val)=>rfAcLinhaHTML(r,String(val==null?'—':val),'');
  return rfAcao({ kicker:'MERCADO · LEILÃO DE OUTRO CLUBE',
    titulo:'Venda de jogador por leilão', w:520,
    corpo:
      linha('Equipa', escC(vendedor.short||'—'))
      + linha('Jogador', escC(v.nome||'—'))
      + linha('Posição', setor)
      + linha('Força', v.forca)
      + linha('Salário pretendido', rfDin(v.salario||0))
      + linha('Preço base', v.base?rfDin(v.base):'zero')
      + linha('Gols nesta temporada', v.gols||0)
      + rfAcSeloHTML(rfIcone('leilao',18), 'Vendido ao '+escC((comprador.short||'—').toUpperCase()),
          'por '+escC(rfDin(v.preco||0)))
      + rfAcNotaHTML('O jogador deixou o mercado — não é mais possível dar lance neste lote.'),
    acoes:[{l:rfIcone('ok',16)+' OK'}] });
},

'mkt-lance': d=>{
  const lot=((S.auctions&&S.auctions.lots)||[]).find(l=>l.id===d.sellerId+'|'+d.player);
  const p=(typeof findP==='function')?findP(d.player,d.sellerId):null;
  if(!lot||!p) return '';
  /* O CAMPO PARTE DO LANCE MÍNIMO VÁLIDO. Vinha com uma sugestão 8% acima do
     lance atual, que não batia com nenhum dos atalhos nem com a dica do
     incremento — o utilizador via três números diferentes para a mesma coisa.
     Agora o campo, o primeiro atalho e a dica dizem todos R$ 25 mil acima. */
  const sug=Math.round(lot.bid+RF_LANCE_MIN);
  return rfAcao({ kicker:'MERCADO · LEILÃO · FECHA EM '+lot.roundsLeft+' RODADA'+(lot.roundsLeft===1?'':'S'),
    titulo:'Lance por '+escC(p.n), w:500,
    corpo:
      rfAcFichaHTML(p,'LANCE ATUAL',rfDin(lot.bid),d.num)
      + rfAcCampoHTML('rf-ac-lance','Seu lance', moneyDisp(sug),
          `Incremento mínimo de ${escC(rfDin(RF_LANCE_MIN))}.`, {foco:true})
      + rfAcAtalhosLanceHTML('rf-ac-lance', lot.bid)
      + rfAcLinhaHTML('Clubes na disputa', String(lot.interest||1), '', true)
      + rfAcLinhaHTML('Caixa disponível', rfDin(S.budget||0), '')
      + rfAcLinhaHTML('Se vencer, sobra', rfDin((S.budget||0)-sug), (S.budget||0)-sug<0?'ruim':'ok')
      + rfAcNotaHTML('Para <b>garantir</b>, ofereça acima do que a concorrência topa pagar — quem fica abaixo é coberto na rodada seguinte.'),
    acoes:[{l:'Cancelar',tom:'fantasma'},{l:rfIcone('leilao',16)+' Dar lance',on:'rfMkLanceGo()'}] });
},

'mkt-cobrir': d=>{
  const lot=((S.auctions&&S.auctions.lots)||[]).find(l=>l.id===d.sellerId+'|'+d.player);
  const p=(typeof findP==='function')?findP(d.player,d.sellerId):null;
  if(!lot||!p) return '';
  const lider=anyClubOf(lot.leader)||{short:'a concorrência'};
  const sug=Math.round(lot.bid+RF_LANCE_MIN);   // ver mkt-lance: parte do mínimo
  return rfAcao({ kicker:'MERCADO · LEILÃO · FECHA EM '+lot.roundsLeft+' RODADA'+(lot.roundsLeft===1?'':'S'),
    titulo:'Cobrir o lance do '+escC(lider.short), w:500,
    corpo:
      rfAcFichaHTML(p,'SEU LANCE',lot.myBid?rfDin(lot.myBid):'—',d.num)
      + rfAcAvisoHTML(`O lance na frente é de <b>${escC(rfDin(lot.bid))}</b>. Se a rodada fechar assim, o lote é do ${escC(lider.short)}.`,'aviso')
      + rfAcCampoHTML('rf-ac-lance','Cobrir com', moneyDisp(sug),
          `${escC(rfDin(sug-lot.bid))} acima do lance do ${escC(lider.short)}.`, {foco:true})
      + rfAcAtalhosLanceHTML('rf-ac-lance', lot.bid)
      + rfAcLinhaHTML('Lance a cobrir', rfDin(lot.bid), '', true)
      + rfAcLinhaHTML('Caixa depois', rfDin((S.budget||0)-sug), (S.budget||0)-sug<0?'ruim':'ok')
      + rfAcLinhaHTML('Vezes que você já cobriu', ((lot.myCovers||0)+' de 3'), (lot.myCovers||0)>=2?'aviso':'')
      + rfAcNotaHTML('Depois da terceira cobertura o leilão fecha automaticamente no maior lance.'),
    acoes:[{l:'Desistir do lote',tom:'fantasma'},{l:rfIcone('raio',16)+' Cobrir agora',on:'rfMkLanceGo()'}] });
},

'mkt-aceitar': d=>{
  const o=rfPropostas().find(x=>x.id===d.id); if(!o) return '';
  const p=squad(CL.clubId).find(x=>x.n===o.playerName)||{};
  const vm=(typeof computeVM==='function'&&p.n)?computeVM(p):(p.mv||0);
  const sal=(p.contract&&p.contract.salary)||p.salary||0;
  const sub=squad(CL.clubId).filter(x=>x.s===p.s&&x.n!==p.n).sort((a,b)=>(b.f||0)-(a.f||0))[0];
  return rfAcao({ kicker:'MERCADO · PROPOSTAS', titulo:'Aceitar a venda de '+escC(o.playerName)+'?', w:500,
    corpo:
      rfAcFichaHTML(p,'OFERTA',rfDin(o.fee),d.num)
      + rfAcLinhaHTML('Entra no caixa', '+'+rfDin(o.fee), 'ok', true)
      + rfAcLinhaHTML('Sai da folha', sal?('−'+rfDin(sal)+'/mês'):'—', 'ok')
      + rfAcLinhaHTML('Valor de mercado dele', vm?rfDin(vm):'—', o.fee>=vm?'ok':'ruim')
      + rfAcLinhaHTML('Quem herda a vaga', sub?sub.n+' (força '+sub.f+')':'ninguém no setor', sub?'':'ruim')
      + rfAcNotaHTML(sub
          ? 'A venda é definitiva e vale já nesta jornada.'
          : '<b>Sem reserva no setor.</b> Vender agora abre um buraco no onze que o banco não cobre.'),
    acoes:[{l:'Voltar',tom:'fantasma'},{l:'Confirmar a venda',on:`rfMkAceitar(${d.id})`}] });
},

'mkt-recusar': d=>{
  const o=rfPropostas().find(x=>x.id===d.id); if(!o) return '';
  const p=squad(CL.clubId).find(x=>x.n===o.playerName)||{};
  return rfAcao({ kicker:'MERCADO · PROPOSTAS', titulo:'Recusar a proposta do '+escC(o.buyerName||'clube')+'?', w:460,
    corpo:
      rfAcFichaHTML(p,'OFERTA',rfDin(o.fee),d.num)
      + rfAcNotaHTML(`O ${escC(o.buyerName||'clube')} pode não voltar nesta janela. Se a ideia é só melhorar o valor, use <b>Contrapropor</b> em vez de recusar.`),
    acoes:[{l:'Voltar',tom:'fantasma'},{l:'Recusar',tom:'perigo',on:`rfMkRecusar(${d.id})`}] });
},

'mkt-contra': d=>{
  const o=rfPropostas().find(x=>x.id===d.id); if(!o) return '';
  const p=squad(CL.clubId).find(x=>x.n===o.playerName)||{};
  const vm=(typeof computeVM==='function'&&p.n)?computeVM(p):(p.mv||0);
  const pedido=d.pedido||Math.round((vm||o.fee)*1.15/1000)*1000;
  const chance=Math.max(5,Math.min(95,Math.round(100-((pedido-o.fee)/Math.max(1,o.fee))*180)));
  return rfAcao({ kicker:'MERCADO · CONTRAPROPOSTA', titulo:'Contrapropor ao '+escC(o.buyerName||'clube'), w:500,
    corpo:
      rfAcFichaHTML(p,'OFERTA DELES',rfDin(o.fee),d.num)
      + rfAcCampoHTML('rf-ac-ask','Seu pedido', moneyDisp(pedido),
          `Valor de mercado: ${escC(rfDin(vm))}.`, {foco:true})
      + rfAcChanceHTML('Chance de aceitarem', chance)
      + rfAcNotaHTML('Pedir muito acima do valor de mercado costuma matar a negociação — o clube some da janela.'),
    acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Enviar contraproposta',on:'rfMkContraporGo()'}] });
},

'mkt-listar': d=>{
  const p=squad(CL.clubId).find(x=>x.pid===d.pid); if(!p) return '';
  const vm=(typeof computeVM==='function')?computeVM(p):(p.mv||0);
  const titular=xiPlayers(CL.clubId).some(x=>x.pid===p.pid);
  return rfAcao({ kicker:'MERCADO · VENDER', titulo:'Listar '+escC(p.n)+' para venda', w:500,
    corpo:
      rfAcFichaHTML(p,'VALOR',rfDin(vm),d.num)
      + rfAcCampoHTML('rf-ac-preco','Preço pedido', moneyDisp(Math.round(vm/1000)*1000),
          'Pedir muito acima do valor afasta comprador; abaixo, sai na primeira jornada.', {foco:true})
      /* AS DUAS OPÇÕES (venda direta / leilão) SAÍRAM. Elas eram decorativas: a
         escolha nunca era lida pelo handler, o save não guarda "jogador listado"
         e o motor não aceita o clube do utilizador como vendedor de leilão
         (isCpuMarketProtected devolve true para S.clubId). Vender aqui é uma
         venda IMEDIATA ao mercado da CPU — é isso que a nota abaixo diz agora,
         em vez de prometer uma vitrine que não existe. */
      + (titular?rfAcAvisoHTML('É <b>titular</b>. Sair dele agora abre buraco no onze até você repor.','aviso'):'')
      + rfAcNotaHTML('A venda é imediata: um clube interessado fecha na hora pelo preço pedido.'),
    acoes:[{l:'Cancelar',tom:'fantasma'},{l:rfIcone('destaque',16)+' Listar',on:'rfMkListarGo()'}] });
},

'mkt-arrematado': d=>{
  const p=(typeof findP==='function')?findP(d.player,d.sellerId):null;
  return rfAcao({ kicker:'MERCADO · LEILÃO ENCERRADO', titulo:'Arrematado!', w:460,
    corpo:
      rfAcSeloHTML(rfIcone('festa',16)+'', escC((p&&p.n)||d.player||'—'), 'entra no seu elenco agora')
      + rfAcLinhaHTML('Seu lance', rfDin(d.valor||0), 'ok', true)
      + rfAcLinhaHTML('Caixa depois', rfDin(S.budget||0), '')
      + rfAcNotaHTML('Ele já pode ser escalado na Formação.'),
    acoes:[{l:'Ver o elenco',tom:'fantasma',on:"rfAcFechar();rfGo('elenco')"},{l:'Continuar'}] });
},

'mkt-semcaixa': d=>rfAcao({ kicker:'MERCADO', titulo:'Caixa insuficiente', w:460,
  corpo:
    rfAcAvisoHTML(`A proposta é de <b>${escC(rfDin(d.pedido||0))}</b> e o caixa tem <b>${escC(rfDin(S.budget||0))}</b>.`,'perigo')
    + `<span class="rf-ac-l">De onde tirar</span>`
    + rfAcOpcoesHTML('donde',[
        {t:'Vender um jogador', s:'a aba Vender mostra quem sai sem abrir buraco'},
        {t:'Baixar a oferta', s:'o clube pode aceitar menos se o jogador for reserva lá'},
        {t:'Esperar a próxima jornada', s:'bilheteria e patrocínio entram no fecho da rodada'}], d.donde)
    + rfAcNotaHTML('O jogo não deixa o caixa ficar negativo — nenhuma compra passa acima do que existe.'),
  acoes:[{l:'Reduzir a oferta',tom:'fantasma'},{l:'Ir ao mercado',on:"rfAcFechar();rfSetTab('mercado','vender')"}] }),

/* ---------- ELENCO E E-MAIL (7) ---------- */
'mail-responder': d=>rfAcao({ kicker:'E-MAIL · RESPOSTA À DIRETORIA', titulo:escC(d.assunto||'Resposta'), w:520,
  corpo:
    `<span class="rf-ac-l">O que responder</span>`
    + rfAcOpcoesHTML('resp',[
        {t:'Assumo a meta', s:'a direção cobra o resultado, mas ganha paciência agora'},
        {t:'Peço mais tempo', s:'sem promessa; a segurança no cargo não sobe nem desce'},
        {t:'Discordo da meta', s:'a direção anota; segurança no cargo cai se a campanha não virar'}], d.resp)
    + rfAcCampoHTML('rf-ac-msg','Acrescentar algo (opcional)','', '', {tipo:'texto',puro:true,ph:'até 140 caracteres'})
    + rfAcNotaHTML('A resposta vai pro histórico da direção e pesa na avaliação de fim de temporada.'),
  acoes:[{l:'Descartar',tom:'fantasma'},{l:'Enviar resposta'}] }),

'mail-arquivar': d=>rfAcao({ kicker:'E-MAIL', titulo:'Arquivar esta mensagem?', w:440,
  corpo:
    rfAcNotaHTML(`<b>${escC(d.assunto||'A mensagem')}</b> sai da caixa de entrada. Nada se perde: ela continua na aba <b>Arquivo</b>.`),
  acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Arquivar'}] }),

'elenco-renovar': d=>{
  const p=squad(CL.clubId).find(x=>x.pid===d.pid); if(!p) return '';
  const sal=(p.contract&&p.contract.salary)||p.salary||0;
  const novo=Math.round(sal*1.2/1000)*1000;
  const chance=Math.max(5,Math.min(95, 50 + Math.round((novo-sal)/Math.max(1,sal)*140) - Math.max(0,(p.f||0)-70)));
  return rfAcao({ kicker:'ELENCO · RENOVAÇÃO', titulo:'Renovar com '+escC(p.n), w:500,
    corpo:
      rfAcFichaHTML(p,'SALÁRIO',sal?rfDin(sal):'—',d.num)
      + rfAcCampoHTML('rf-ac-novo','Novo salário', moneyDisp(novo),
          `Hoje ele ganha ${escC(rfDin(sal))}. Abaixo disso ele nem escuta.`, {foco:true,sufixo:'/mês'})
      + rfAcPassoHTML('rf-ac-anos','Anos de contrato', 3, 'Mais anos seguram o jogador, mas travam a folha.')
      + rfAcChanceHTML('Chance de aceitar', chance)
      + rfAcNotaHTML('Contrato vencendo derruba o valor do passe: renovar cedo é o que segura o preço.'),
    acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Oferecer renovação'}] });
},

'elenco-renovado': d=>rfAcao({ kicker:'ELENCO · RENOVAÇÃO', titulo:'Contrato renovado', w:440,
  corpo:
    rfAcSeloHTML(rfIcone('ok',16), escC(d.nome||'—'), 'assinou com você')
    + rfAcLinhaHTML('Novo salário', rfDin(d.salario||0), 'aviso', true)
    + rfAcLinhaHTML('Até', String(d.ate||'—'), '')
    + rfAcNotaHTML('A folha nova vale a partir do mês seguinte.'),
  acoes:[{l:'Continuar'}] }),

'elenco-semrenovar': d=>rfAcao({ kicker:'ELENCO · RENOVAÇÃO', titulo:'Não dá para renovar agora', w:460,
  corpo:
    rfAcAvisoHTML(escC(d.motivo||'A folha não comporta este salário.'),'perigo')
    + `<span class="rf-ac-l">O que fazer</span>`
    + rfAcOpcoesHTML('fazer',[
        {t:'Baixar a oferta', s:'ele pode aceitar menos se for titular'},
        {t:'Liberar salário', s:'vender ou emprestar quem não joga'},
        {t:'Esperar a rodada fechar', s:'bilheteria e patrocínio entram no caixa'}], d.fazer)
    + rfAcNotaHTML('Enquanto isso o contrato segue correndo — e o passe cai a cada jornada.'),
  acoes:[{l:'Entendi'}] }),

'base-promover': d=>{
  const p=d.p||{};
  return rfAcao({ kicker:'BASE · PROMOÇÃO', titulo:'Promover '+escC(p.n||'—')+'?', w:480,
    corpo:
      rfAcFichaHTML(p,'PRONTO EM',d.pronto||'—',d.num)
      + rfAcLinhaHTML('Entra na folha', rfDin(d.salario||0)+'/mês', 'aviso', true)
      + rfAcLinhaHTML('Elenco depois', (squad(CL.clubId).length+1)+' de 30', '')
      + rfAcNotaHTML('Promovido, ele ocupa vaga no elenco e passa a contar na folha. Não dá para devolvê-lo à base nesta temporada.'),
    acoes:[{l:'Deixar na base',tom:'fantasma'},{l:'Promover'}] });
},

'treino-confirmar': d=>rfAcao({ kicker:'TREINO ESPECIAL · '+escC(String(d.semana||'')).toUpperCase(),
  titulo:'Confirmar o treino de '+escC(d.tema||'—'), w:500,
  corpo:
    rfAcLinhaHTML('Jogadores no treino', String(d.n||0), '', true)
    + rfAcLinhaHTML('Energia que custa', '−'+(d.custo||10)+'% por jogador', 'aviso')
    + rfAcNotaHTML('Treino forte antes de jogo decisivo chega a tirar a energia que faltava. Quem estiver abaixo de 60% entra cansado.'),
  acoes:[{l:'Rever a lista',tom:'fantasma'},{l:'Confirmar treino'}] }),

/* ---------- SISTEMA E CONTA (8) ---------- */
'sys-gravado': d=>rfAcao({ kicker:'SAVE NA NUVEM', titulo:'Jogo gravado', w:420,
  corpo:
    rfAcSeloHTML(rfIcone('gravar',16)+'','Tudo salvo', escC(d.quando||'agora'))
    + rfAcNotaHTML('O save fica na nuvem e na máquina. Dá para continuar de qualquer aparelho com a mesma conta.'),
  acoes:[{l:'Continuar'}] }),

/* SAIR DA CONTA DE VERDADE. O botão "Sair da conta" da aba Opções abria o
   "Sair deste save?" — o rótulo prometia uma coisa e entregava outra, e não
   havia caminho nenhum para trocar de conta: `netAuthSignOut()` existia no
   adaptador e ninguém o chamava. */
'conta-sair': d=>rfAcao({ kicker:'CONTA', titulo:'Sair da conta?', w:460,
  corpo:
    rfAcLinhaHTML('Conta', escC(d.email||'—'), '', true)
    + rfAcNotaHTML('Os saves ficam na nuvem. Entrando de novo com a mesma conta, tudo volta como estava.'),
  acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Sair da conta',on:'rfSairContaGo()'}] }),

'sys-sair-save': d=>rfAcao({ kicker:'SAVE', titulo:'Sair deste save?', w:460,
  corpo:
    rfAcLinhaHTML('Clube', escC(d.clube||'—'), '', true)
    + rfAcLinhaHTML('Jornada', String(d.jornada||'—'), '')
    + rfAcNotaHTML('Nada se perde: o save é gravado antes de sair e aparece na lista de saves.'),
  acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Gravar e sair'}] }),

'sys-apagar-save': d=>rfAcao({ kicker:'SAVE', titulo:'Apagar o save do '+escC(d.clube||'—')+'?', w:480,
  corpo:
    rfAcAvisoHTML('Isto <b>não tem volta</b>. A temporada, o elenco e o histórico do treinador somem para sempre.','perigo')
    + rfAcCampoHTML('rf-ac-conf','Digite o nome do clube para confirmar','', '', {tipo:'texto',puro:true,ph:escC(d.clube||'')})
    + rfAcNotaHTML('Se a ideia é só começar outra carreira, dá para criar um save novo sem apagar este.'),
  acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Apagar para sempre',tom:'perigo'}] }),

'sys-encerrar': d=>rfAcao({ kicker:'TREINADOR', titulo:'Encerrar a carreira do '+escC(d.nome||'—')+'?', w:480,
  corpo:
    rfAcLinhaHTML('Temporadas', String(d.temporadas||0), '', true)
    + rfAcLinhaHTML('Títulos', String(d.titulos||0), 'ok')
    + rfAcAvisoHTML('A carreira vai para o hall e <b>não continua</b>. O save fica só para consulta.','perigo')
    + rfAcNotaHTML('Encerrar não apaga nada — o histórico continua visível na sala de troféus.'),
  acoes:[{l:'Voltar',tom:'fantasma'},{l:'Encerrar carreira',tom:'perigo'}] }),

'sys-sair-sala': d=>rfAcao({ kicker:'MODO RESENHA · SALA '+escC(String(d.sala||'')).toUpperCase(), titulo:'Sair da resenha?', w:480,
  corpo:
    rfAcAvisoHTML('Os outros treinadores continuam a rodada sem você — e seu clube passa a ser jogado pela máquina.','aviso')
    + rfAcLinhaHTML('Treinadores na sala', String(d.n||'—'), '', true)
    + rfAcNotaHTML('Dá para voltar depois com o mesmo código, desde que a sala ainda esteja aberta.'),
  acoes:[{l:'Ficar na sala',tom:'fantasma'},{l:'Sair da resenha',tom:'perigo'}] }),

'conta-senha': d=>rfAcao({ kicker:'CONTA', titulo:'Trocar a senha', w:460,
  corpo:
    rfAcCampoHTML('rf-ac-s1','Senha atual','', '', {tipo:'texto',puro:true,ph:'••••••••'})
    + rfAcCampoHTML('rf-ac-s2','Nova senha','', 'Pelo menos 8 caracteres.', {tipo:'texto',puro:true,ph:'••••••••',foco:true})
    + rfAcCampoHTML('rf-ac-s3','Confirme a nova senha','', '', {tipo:'texto',puro:true,ph:'••••••••'})
    + rfAcNotaHTML('Trocar a senha não desconecta os saves — só a conta.'),
  acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Trocar senha'}] }),

'conta-apagar': d=>rfAcao({ kicker:'CONTA', titulo:'Apagar a sua conta?', w:480,
  corpo:
    rfAcAvisoHTML('Some <b>tudo</b>: os saves na nuvem, as salas da Resenha e o histórico de treinador. Não tem volta.','perigo')
    + rfAcCampoHTML('rf-ac-apagar','Digite APAGAR para confirmar','', '', {tipo:'texto',puro:true,ph:'APAGAR'})
    + rfAcNotaHTML('Se você só quer parar de receber e-mail, dá para desligar isso em Configurações.'),
  acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Apagar a conta',tom:'perigo'}] }),

'sys-sincronizar': d=>rfAcao({ kicker:'MODO RESENHA · SALA '+escC(String(d.sala||'')).toUpperCase(), titulo:'Sincronizando a rodada', w:460,
  corpo:
    rfAcChanceHTML('Assentos prontos', Math.round(((d.prontos||0)/Math.max(1,d.total||1))*100))
    + rfAcLinhaHTML('Faltam', String(Math.max(0,(d.total||0)-(d.prontos||0)))+' treinador'+(((d.total||0)-(d.prontos||0))===1?'':'es'), 'aviso', true)
    + rfAcNotaHTML('A rodada só fecha quando todos os assentos jogarem. Enquanto isso dá para ver a tabela e o elenco.'),
  acoes:[{l:'Fechar',tom:'fantasma'},{l:'⏩ Pular espera'}] }),
};

/* O ROTEADOR — o resto do jogo só precisa de rfAcAbrir('id', dados). */
function rfAcaoHTML(){
  if(!CL.acao) return '';
  const f=RF_ACOES[CL.acao.id];
  if(!f){ CL.acao=null; return ''; }
  try{ return f(rfAcD())||''; }catch(e){ CL.acao=null; return ''; }
}
