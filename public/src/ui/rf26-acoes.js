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
    /* O CAMPO NASCE COM O QUE O EMPRESARIO PEDE. Antes trazia a oferta ANTIGA
       e o pedido dele aparecia so na linha de ajuda, em letra pequena: quem
       carregasse em "Enviar termos" sem reparar reenviava o mesmo valor baixo. */
    const salAtual=pedeAgente||n.salary||sal;
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
    /* O EMPRESARIO PODE TER PEDIDO MAIS E A NEGOCIACAO VIR DIRETO PARA CA:
       agentRespond() poe n.agentCounter e n.stage='verdict' na MESMA linha.
       Este ecra mostrava "Salario combinado: n.salary" — o valor antigo — e
       fechava por ele. Havendo pedido em aberto, o valor que vale e o dele,
       e o campo fica editavel para o utilizador ver e decidir. */
    const pede=n.agentCounter||0;
    const emAberto=pede && (n.salary||0)<pede;
    const salFinal=emAberto?pede:(n.salary||sal);
    return rfAcao({ kicker:'MERCADO · COMPRAR · ETAPA 3 DE 3',
      titulo:'Fechar a contratação de '+escC((p&&p.n)||'—'), w:520,
      corpo:
        rfAcFichaHTML(p,'TAXA',rfDin(n.offerFee),d.num)
        + (emAberto
            ? rfAcAvisoHTML(`O empresário pede <b>${escC(rfDin(pede))}</b>/mês — acima da sua oferta de ${escC(rfDin(n.salary||0))}. O valor abaixo não fecha.`,'aviso')
              + rfAcCampoHTML('rf-ac-sal','Salário oferecido', moneyDisp(pede),
                  'Abaixo de '+escC(rfDin(pede))+' o empresário recusa.', {sufixo:'/mês', foco:true})
            : rfAcLinhaHTML('Salário combinado', rfDin(salFinal)+'/mês', '', true))
        + rfAcLinhaHTML('Caixa depois', rfDin((S.budget||0)-n.offerFee), ((S.budget||0)-n.offerFee)<0?'ruim':'ok')
        + rfAcLinhaHTML('Folha depois', rfDin(rfFolha()+salFinal)+'/mês', 'aviso')
        + rfAcNotaHTML('Clube e jogador já concordaram. Confirmar transfere o jogador para o seu elenco.'),
      acoes:[{l:'Cancelar',tom:'fantasma'},
             {l:emAberto?'Aceitar e fechar':'Fechar contratação',on:'rfMkFinalizar()'}] });
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
  acoes:[{l:'Descartar',tom:'fantasma'},{l:'Enviar resposta',on:`rfMailResponderGo('${escC(String(d.key||''))}')`}] }),

'mail-arquivar': d=>rfAcao({ kicker:'E-MAIL', titulo:'Arquivar esta mensagem?', w:440,
  corpo:
    rfAcNotaHTML(`<b>${escC(d.assunto||'A mensagem')}</b> sai da caixa de entrada. Nada se perde: ela continua na aba <b>Arquivo</b>.`),
  acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Arquivar',on:`rfMailArquivarGo('${escC(String(d.key||''))}')`}] }),

'elenco-renovar': d=>{
  const p=squad(CL.clubId).find(x=>x.pid===d.pid); if(!p) return '';
  const sal=(p.contract&&p.contract.salary)||p.salary||0;
  const novo=Math.round(sal*1.2/1000)*1000;
  // a chance vem da MESMA função que o sorteio usa (ver rfElChanceRenovar):
  // se fosse calculada duas vezes, a tela podia prometer um número e o motor
  // usar outro — e oferecer mais deixaria de melhorar alguma coisa
  const chance=(typeof rfElChanceRenovar==='function')?rfElChanceRenovar(p,novo)
    :Math.max(5,Math.min(95, 50 + Math.round((novo-sal)/Math.max(1,sal)*140) - Math.max(0,(p.f||0)-70)));
  return rfAcao({ kicker:'ELENCO · RENOVAÇÃO', titulo:'Renovar com '+escC(p.n), w:500,
    corpo:
      rfAcFichaHTML(p,'SALÁRIO',sal?rfDin(sal):'—',d.num)
      + rfAcCampoHTML('rf-ac-novo','Novo salário', moneyDisp(novo),
          `Hoje ele ganha ${escC(rfDin(sal))}. Abaixo disso ele nem escuta.`, {foco:true,sufixo:'/mês'})
      + rfAcPassoHTML('rf-ac-anos','Anos de contrato', 3, 'Mais anos seguram o jogador, mas travam a folha.')
      + rfAcChanceHTML('Chance de aceitar', chance)
      + rfAcNotaHTML('Contrato vencendo derruba o valor do passe: renovar cedo é o que segura o preço.'),
    acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Oferecer renovação',on:`rfElRenovarGo('${escC(String(d.pid))}')`}] });
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
      /* idem: p.f vem fracionario do motor */
      + rfAcLinhaHTML('Força hoje', (p.f!=null?String(Math.round(p.f)):'—')+(d.teto?(' · pode chegar a '+Math.round(d.teto)):''), '')
      + rfAcLinhaHTML('Entra na folha', rfDin(d.salario||0)+'/mês', 'aviso', true)
      /* o teto do motor é 40, não 30 — ver youthAvailable() */
      + rfAcLinhaHTML('Elenco depois', (squad(CL.clubId).length+1)+' de 40', '')
      + rfAcNotaHTML('Promovido, ele ocupa vaga no elenco e passa a contar na folha. Só sobe um jogador da base por janela de transferências.'),
    acoes:[{l:'Deixar na base',tom:'fantasma'},{l:'Promover',on:`rfBasePromoverGo(${d.idx||0})`}] });
},

/* `treino-confirmar` foi removido: descrevia um custo de energia que o motor
   não cobra, e depois da reescrita do Treino especial ninguém o abria. */

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
  acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Gravar e sair',on:'rfSairSaveGo()'}] }),

'sys-apagar-save': d=>rfAcao({ kicker:'SAVE', titulo:'Apagar o save do '+escC(d.clube||'—')+'?', w:480,
  corpo:
    rfAcAvisoHTML('Isto <b>não tem volta</b>. A temporada, o elenco e o histórico do treinador somem para sempre.','perigo')
    + rfAcCampoHTML('rf-ac-conf','Digite o nome do clube para confirmar','', '', {tipo:'texto',puro:true,ph:escC(d.clube||'')})
    + rfAcNotaHTML('Se a ideia é só começar outra carreira, dá para criar um save novo sem apagar este.'),
  acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Apagar para sempre',tom:'perigo',on:'rfApagarSaveGo()'}] }),

'sys-encerrar': d=>rfAcao({ kicker:'TREINADOR', titulo:'Encerrar a carreira do '+escC(d.nome||'—')+'?', w:480,
  corpo:
    rfAcLinhaHTML('Temporadas', String(d.temporadas||0), '', true)
    + rfAcLinhaHTML('Títulos', String(d.titulos||0), 'ok')
    + rfAcAvisoHTML('A carreira vai para o hall e <b>não continua</b>. O save fica só para consulta.','perigo')
    + rfAcNotaHTML('Encerrar não apaga nada — o histórico continua visível na sala de troféus.'),
  acoes:[{l:'Voltar',tom:'fantasma'},{l:'Encerrar carreira',tom:'perigo',on:'rfEncerrarCarreiraGo()'}] }),

'sys-sair-sala': d=>rfAcao({ kicker:'MODO RESENHA · SALA '+escC(String(d.sala||'')).toUpperCase(), titulo:'Sair da resenha?', w:480,
  corpo:
    rfAcAvisoHTML('Os outros treinadores continuam a rodada sem você — e seu clube passa a ser jogado pela máquina.','aviso')
    + rfAcLinhaHTML('Treinadores na sala', String(d.n||'—'), '', true)
    + rfAcNotaHTML('Dá para voltar depois com o mesmo código, desde que a sala ainda esteja aberta.'),
  acoes:[{l:'Ficar na sala',tom:'fantasma'},{l:'Sair da resenha',on:'rfSairSalaGo()',tom:'perigo'}] }),

'conta-senha': d=>rfAcao({ kicker:'CONTA', titulo:'Trocar a senha', w:460,
  /* A TROCA EM LINHA NÃO EXISTE. Os três campos (senha atual, nova, confirmar)
     estavam desenhados e o botão não fazia nada — e não podia fazer: o
     `netUpdatePassword` do adaptador só funciona depois do evento
     PASSWORD_RECOVERY, ou seja, dentro da sessão temporária que o link de
     e-mail abre. O caminho real do jogo é esse link, e é ele que este diálogo
     passa a oferecer, em vez de três campos que não levam a lado nenhum. */
  corpo:
    rfAcLinhaHTML('Conta', escC(d.email||'—'), '', true)
    + rfAcNotaHTML('A senha é trocada por um <b>link enviado para o seu e-mail</b> — é assim que a conta fica protegida mesmo se alguém estiver com o jogo aberto. O link vale por uma hora.'),
  acoes:[{l:'Fechar',tom:'fantasma'},{l:'Enviar o link',on:'rfTrocarSenhaGo()'}] }),

'conta-apagar': d=>rfAcao({ kicker:'CONTA', titulo:'Apagar a sua conta', w:480,
  /* NÃO HÁ COMO APAGAR A CONTA A PARTIR DAQUI, e fingir que há era pior do que
     dizer. O botão "Apagar a conta" não tinha handler nenhum: clicar fechava o
     diálogo e a conta continuava exatamente onde estava — quem quisesse mesmo
     sair ficava a pensar que tinha saído. O adaptador não expõe nenhuma
     chamada de remoção de conta; enquanto não existir, o diálogo explica o que
     dá para fazer hoje. */
  corpo:
    rfAcAvisoHTML('Apagar a conta ainda <b>não é possível de dentro do jogo</b>. Este botão não fazia nada — agora diz porquê.','aviso')
    + rfAcNotaHTML('O que dá para fazer hoje: <b>apagar um save</b> (em Sair do jogo → Apagar) tira aquela carreira da nuvem, e <b>sair da conta</b> desliga este aparelho sem perder nada.'),
  acoes:[{l:'Fechar',tom:'fantasma'},{l:'Apagar um save',on:"rfAcFechar();rfGo('sairjogo')"}] }),

'sys-sincronizar': d=>rfAcao({ kicker:'MODO RESENHA · SALA '+escC(String(d.sala||'')).toUpperCase(), titulo:'Sincronizando a rodada', w:460,
  corpo:
    rfAcChanceHTML('Assentos prontos', Math.round(((d.prontos||0)/Math.max(1,d.total||1))*100))
    + rfAcLinhaHTML('Faltam', String(Math.max(0,(d.total||0)-(d.prontos||0)))+' treinador'+(((d.total||0)-(d.prontos||0))===1?'':'es'), 'aviso', true)
    + rfAcNotaHTML('A rodada só fecha quando todos os assentos jogarem. Enquanto isso dá para ver a tabela e o elenco.'),
  acoes:[{l:'Fechar',tom:'fantasma'},{l:'⏩ Pular espera',on:'rfPularEsperaGo()'}] }),
};

/* O ROTEADOR — o resto do jogo só precisa de rfAcAbrir('id', dados). */
function rfAcaoHTML(){
  if(!CL.acao) return '';
  const f=RF_ACOES[CL.acao.id];
  if(!f){ CL.acao=null; return ''; }
  try{ return f(rfAcD())||''; }catch(e){ CL.acao=null; return ''; }
}

/* ---------- OPÇÕES E ESTÁDIO (9) ----------
   Porte de "Acoes - Opcoes e Estadio.html", o último ficheiro do pacote que
   ainda não tinha pele nova. As três telas que estes diálogos substituem
   (clOptions, clStadium, clClubHistory) continuavam a desenhar-se com o
   dlg()/overlayC() de 98 — e as três eram alcançáveis a partir da pele nova:
   Configurações → "Abrir opções do jogo", Hub → "Gerir estádio", e o menu
   do topo. Ver o override no fim deste ficheiro.

   DUAS COISAS DO PACOTE QUE O MOTOR NÃO TEM, e que por isso não estão aqui:
   · o NOME do estádio ("Barão de Serra Negra") — o save só guarda capacidade
     (S.clubStadiumCap) e foto (STADIUM_IMG); não há tabela de nomes;
   · a coluna PTS do histórico — S.history guarda posição, divisão e taças,
     nunca os pontos. A coluna que entrou no lugar é TAÇAS, que é real. */

/* abas do diálogo (Geral | Jogo) */
function rfAcAbasHTML(abas, atual){
  return `<div class="rf-ac-abas">${abas.map(a=>
    `<button type="button" class="rf-ac-aba ${a.k===atual?'on':''}"
      onclick="rfAcEscolher('aba','${a.k}')">${escC(a.l)}</button>`).join('')}</div>`;
}
/* linha de opção: rótulo à esquerda, botões segmentados à direita.
   `travada` desenha o cadeado do pacote em vez dos botões. */
function rfAcSegHTML(rotulo, chave, opcoes, val, dica, travada){
  const dir = travada
    ? `<span class="rf-ac-seg-lock">🔒 ${escC(travada)}</span>`
    : `<span class="rf-ac-seg">${opcoes.map(o=>
        `<button type="button" class="rf-ac-sg ${o===val?'on':''}"
          onclick="rfOpcoesSet('${chave}',this.dataset.v)" data-v="${escC(o)}">${escC(o)}</button>`).join('')}</span>`;
  return `<div class="rf-ac-orow">
    <span class="rf-ac-or-id"><span class="rf-ac-or-t">${escC(rotulo)}</span>
      ${dica?`<span class="rf-ac-or-s">${escC(dica)}</span>`:''}</span>
    ${dir}
  </div>`;
}
/* AGORA → DEPOIS DA OBRA */
function rfAcSaltoHTML(rotA, a, rotB, b, delta){
  return `<div class="rf-ac-salto">
    <span class="rf-ac-sl-c"><span class="rf-ac-sl-l">${escC(rotA)}</span>
      <span class="rf-ac-sl-v">${escC(a)}</span></span>
    <span class="rf-ac-sl-seta">→</span>
    <span class="rf-ac-sl-c depois"><span class="rf-ac-sl-l">${escC(rotB)}</span>
      <span class="rf-ac-sl-v">${escC(b)}</span>
      ${delta?`<span class="rf-ac-sl-d">${escC(delta)}</span>`:''}</span>
  </div>`;
}
/* bloco "COMO FUNCIONA" — lista de itens com marcador */
function rfAcComoHTML(titulo, itens){
  return `<div class="rf-ac-como">
    <span class="rf-ac-como-t">${escC(titulo)}</span>
    ${itens.map(i=>`<span class="rf-ac-como-i">
      <i class="rf-ac-como-b">${i.ico||'·'}</i>
      <span class="rf-ac-como-x">${i.tt?`<b>${escC(i.tt)}</b> `:''}${escC(i.t)}</span></span>`).join('')}
  </div>`;
}
/* tabela curta (histórico do clube) */
function rfAcTabelaHTML(cols, linhas){
  const g=cols.map(c=>c.w||'1fr').join(' ');
  return `<div class="rf-ac-tab">
    <div class="rf-ac-tb-h" style="grid-template-columns:${g}">
      ${cols.map(c=>`<span class="${c.dir?'dir':''}">${escC(c.l)}</span>`).join('')}</div>
    ${linhas.map(r=>`<div class="rf-ac-tb-r" style="grid-template-columns:${g}">
      ${r.map((v,i)=>`<span class="${cols[i]&&cols[i].dir?'dir':''}">${v}</span>`).join('')}</div>`).join('')}
  </div>`;
}

/* ===== OS DADOS REAIS DO ESTÁDIO =====
   Uma só leitura do estado, usada pelo diálogo de obra e pelas três recusas,
   pra que os números do "pode construir" e do "não pode" nunca discordem. */
function rfEstadioEstado(){
  const st=(typeof myStadium==='function')?myStadium():null;
  const cap=(st&&st.capacity)||STAND_START;
  const feito=(st&&st.builtThisSeason)||0;
  const teto=(typeof stadiumMaxCapacity==='function')?stadiumMaxCapacity():cap;
  const custo=(typeof standCost==='function')?standCost():0;
  const caixa=(S&&S.budget)||0;
  return { cap, feito, teto, custo, caixa,
    sobraCota:Math.max(0,SEASON_BUILD_LIMIT-feito),
    noTeto:(cap+STAND_SEATS)>teto,
    semCota:((feito+STAND_SEATS)>SEASON_BUILD_LIMIT),
    semCaixa:(caixa<custo) };
}
/* Abre a obra OU a recusa certa — a mesma ordem de checagem do clBuildStand,
   para que o diálogo nunca ofereça um botão que o motor vai recusar. */
function rfAcEstadio(){
  const e=rfEstadioEstado();
  if(e.noTeto)   return rfAcAbrir('est-teto');
  if(e.semCota)  return rfAcAbrir('est-cota');
  if(e.semCaixa) return rfAcAbrir('est-caixa');
  rfAcAbrir('est-construir');
}
function rfEstConstruirGo(){
  const e=rfEstadioEstado();
  if(e.noTeto)   return rfAcAbrir('est-teto');
  if(e.semCota)  return rfAcAbrir('est-cota');
  if(e.semCaixa) return rfAcAbrir('est-caixa');
  rfAcFechar();
  if(typeof clBuildStand==='function') clBuildStand();
}

/* ===== AS OPÇÕES ===== */
function rfOpcoesSet(k,v){
  if(!CL.options) CL.options={};
  CL.options[k]=v;
  /* NAO chamar clSetTempo(): ele termina em renderOptions(), que reabre o overlay
     de 98 por tras deste dialogo. O que ele faz de util e so a linha abaixo —
     publicar o ritmo para a sala, e so o anfitriao pode. */
  if(k==='tempo' && CL.online && typeof NET!=='undefined' && NET.isHost
     && typeof clSetSpeed==='function' && typeof TEMPO_MULT!=='undefined'){
    clSetSpeed(TEMPO_MULT[v]||1);
  }
  cdraw();
}
function rfOpcoesGuardar(){
  rfAcFechar();
  if(typeof rfGravar==='function') rfGravar();
  if(typeof toastC==='function') toastC('Opções guardadas.');
}

const RF_ACOES_EXTRA = {

'opcoes': d=>{
  if(!CL.options) CL.options={chicotadas:'Dos humanos',sorteio:'Quando houver humanos',
    gravar:'De 3 em 3 jornadas',som:'Sim',subsIntervalo:'Sim',penaltisCPU:'Sim',tempo:TEMPO_DEFAULT};
  if(!CL.options.autoSave) CL.options.autoSave='Sim';
  const o=CL.options, aba=d.aba||'geral';
  const online=!!CL.online, anfitriao=(typeof NET!=='undefined' && NET.isHost);
  // na sala, só o anfitrião mexe no ritmo — a partida é uma só para todos
  const trava = (online && !anfitriao)
    ? ((typeof tempoLabelFromMult==='function')?tempoLabelFromMult(CL.speedMult):(o.tempo||'—')) : null;

  const geral =
      rfAcSegHTML('Mostrar chicotadas psicológicas','chicotadas',['Nunca','Dos humanos','De todos'],o.chicotadas)
    + rfAcSegHTML('Ver sorteio da taça','sorteio',['Nunca','Quando houver humanos','Sempre'],o.sorteio)
    + rfAcSegHTML('Gravar o jogo','gravar',['Nunca','De 3 em 3 jornadas','Sempre'],o.gravar)
    + rfAcSegHTML('Som','som',['Sim','Não'],o.som)
    + rfAcSegHTML('Salvamento automático','autoSave',['Sim','Não'],o.autoSave,
        'Guarda as 3 últimas jornadas e o fim de cada temporada.')
    + `<div class="rf-ac-orow">
        <span class="rf-ac-or-id"><span class="rf-ac-or-t">Voltar a um ponto guardado</span>
          <span class="rf-ac-or-s">Abre a lista dos pontos guardados neste save.</span></span>
        <button type="button" class="rf-ac-bt fantasma peq" onclick="rfAcFechar();clAutoSaveAbrir&&clAutoSaveAbrir()">Escolher ponto…</button>
      </div>`;

  const jogo =
      rfAcSegHTML('Substituições ao intervalo','subsIntervalo',['Sim','Não'],o.subsIntervalo)
    + rfAcSegHTML('Ver desempates por penalties','penaltisCPU',['Sim','Não'],o.penaltisCPU,
        'Nos jogos sem treinadores humanos.')
    + rfAcSegHTML('Tempo de jogo','tempo',['Curto','Médio','Longo','Ultrassônico','Usain Bolt'],
        o.tempo, trava?('Numa resenha, quem define o tempo de jogo é o Anfitrião. Fale com ele para mudar.'):'', trava)
    + ((typeof TEMPO_TESTE!=='undefined' && TEMPO_TESTE)
        ? rfAcAvisoHTML('🧪 <b>Modo de teste:</b> o ritmo está travado em <b>'+escC(TEMPO_TESTE)+'</b> no Solo e na Resenha, ignorando esta opção e a escolha do anfitrião.','aviso')
        : '');

  return rfAcao({
    kicker:'OPÇÕES DO JOGO'+((online&&NET&&NET.room&&NET.room.code)?(' · SALA '+escC(String(NET.room.code).toUpperCase())):''),
    titulo:'Opções', w:560,
    corpo: rfAcAbasHTML([{k:'geral',l:'Geral'},{k:'jogo',l:'Jogo'}], aba)
      + `<div class="rf-ac-opanel">${aba==='geral'?geral:jogo}</div>`,
    acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Guardar',on:'rfOpcoesGuardar()'}] });
},

'hist-clube': d=>{
  const id=d.clubId||CL.clubId;
  const c=(typeof clubOf==='function')?clubOf(id):null;
  const nome=(c&&(c.name||c.short))||'—';
  const linhas=((S&&S.history)||[]).filter(h=>h.clubId===id).slice().reverse();
  const tacas=h=>{
    const t=[]; if(h.myCups){ Object.keys(h.myCups).forEach(k=>{ if(/campeã|campeao|vencedor|título|titulo/i.test(String(h.myCups[k]||''))) t.push('🏆'); }); }
    if(h.champ && c && h.champ===(c.short||c.name)) t.unshift('🏆');
    return t.length?t.join(''):'—';
  };
  const corpo = linhas.length
    ? rfAcTabelaHTML(
        [{l:'ANO',w:'52px'},{l:'DIVISÃO'},{l:'POSIÇÃO'},{l:'TAÇAS',w:'62px',dir:true}],
        linhas.map(h=>[String(h.season||'—'),
          'Série '+escC(h.division||'—'),
          h.myPos?(h.myPos+'º'):'—',
          tacas(h)]))
      + rfAcNotaHTML('O histórico guarda só as temporadas em que <b>você</b> foi o treinador do clube. A temporada em curso entra aqui quando fechar.')
    : rfAcSeloHTML('📕','Você nunca comandou o '+escC(nome),'')
      + rfAcNotaHTML('O histórico guarda só as temporadas em que <b>você</b> foi o treinador do clube. O mundo do jogo começou em 2026 — nenhum clube tem passado antes disso.');
  return rfAcao({ kicker:'HISTÓRICO NESTE SAVE', titulo:escC(nome), w:520,
    corpo:
      (linhas.length?`<div class="rf-ac-hsub">${linhas.length} temporada${linhas.length===1?'':'s'} sob o seu comando</div>`:'')
      + corpo,
    acoes:[{l:'Fechar'}] });
},

'est-construir': d=>{
  const e=rfEstadioEstado();
  const c=(typeof clubOf==='function')?clubOf(CL.clubId):null;
  return rfAcao({ kicker:'ESTÁDIO DO '+escC(String((c&&(c.short||c.name))||'CLUBE')).toUpperCase(),
    titulo:'Construir mais uma bancada', w:520,
    corpo:
      rfAcSaltoHTML('AGORA', grp(e.cap), 'DEPOIS DA OBRA', grp(e.cap+STAND_SEATS), '+'+grp(STAND_SEATS))
      + rfAcLinhaHTML('Custo da bancada', rfDin(e.custo), 'aviso', true)
      + rfAcLinhaHTML('Caixa depois da obra', rfDin(e.caixa-e.custo), (e.caixa-e.custo)>0?'ok':'ruim')
      + rfAcLinhaHTML('Cota da temporada', grp(e.feito)+' de '+grp(SEASON_BUILD_LIMIT)+' usados', '')
      + rfAcLinhaHTML('Tecto do porte do clube', grp(e.teto)+' lugares', '')
      + rfAcComoHTML('COMO FUNCIONA A OBRA', [
          {t:'Cada bancada são '+grp(STAND_SEATS)+' lugares.'},
          {t:'No máximo '+grp(SEASON_BUILD_LIMIT)+' lugares por temporada — obra é lenta e cresce por anos.'},
          {t:'O tecto sobe com o porte do clube: título e elenco melhor liberam mais.'} ])
      + rfAcNotaHTML('Mais lugares rendem mais bilheteria nos jogos em casa. As bancadas novas só valem a partir do próximo jogo.'),
    acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Construir',on:'rfEstConstruirGo()'}] });
},

'est-cota': d=>{
  const e=rfEstadioEstado();
  const ano=(S&&S.season)||2026;
  return rfAcao({ kicker:'ESTÁDIO · OBRA RECUSADA', titulo:'Cota da temporada esgotada', w:480,
    corpo:
      rfAcAvisoHTML('Você já construiu '+grp(e.feito)+' lugares nesta temporada. O limite é por ano — a próxima bancada só na temporada de '+(ano+1)+'.','aviso')
      + rfAcLinhaHTML('Construído em '+ano, grp(e.feito)+' lugares', 'aviso', true)
      + rfAcLinhaHTML('Limite por temporada', grp(SEASON_BUILD_LIMIT)+' lugares', '')
      + rfAcLinhaHTML('Capacidade atual', grp(e.cap)+' lugares', '')
      + rfAcLinhaHTML('Libera em', 'temporada '+(ano+1), 'ok')
      + rfAcNotaHTML('O caixa fica reservado para reforços até lá.'),
    acoes:[{l:'Entendi'}] });
},

'est-teto': d=>{
  const e=rfEstadioEstado();
  const c=(typeof clubOf==='function')?clubOf(CL.clubId):null;
  const nome=(c&&(c.short||c.name))||'clube';
  return rfAcao({ kicker:'ESTÁDIO · OBRA RECUSADA', titulo:'O clube ainda não sustenta mais', w:480,
    corpo:
      rfAcAvisoHTML('O estádio chegou ao tecto do porte do '+escC(nome)+'. Para construir mais, o clube precisa crescer.','aviso')
      + rfAcLinhaHTML('Capacidade atual', grp(e.cap)+' lugares', '', true)
      + rfAcLinhaHTML('Tecto do porte atual', grp(e.teto)+' lugares', 'aviso')
      + rfAcComoHTML('COMO SUBIR O TECTO', [
          {ico:'🏆', tt:'Ganhar um título', t:'sobe o porte do clube de imediato'},
          {ico:'📈', tt:'Subir de divisão',  t:'cada divisão amplia o tecto'},
          {ico:'👤', tt:'Elenco mais forte', t:'a força média do plantel conta'} ]),
    acoes:[{l:'Entendi'}] });
},

'est-caixa': d=>{
  const e=rfEstadioEstado();
  const falta=Math.max(0,e.custo-e.caixa);
  return rfAcao({ kicker:'ESTÁDIO · OBRA RECUSADA', titulo:'Caixa insuficiente para a obra', w:480,
    corpo:
      rfAcAvisoHTML('Não há caixa para pagar a bancada à vista. A obra não é parcelada.','perigo')
      + rfAcLinhaHTML('Custo da bancada', rfDin(e.custo), 'aviso', true)
      + rfAcLinhaHTML('Caixa disponível', rfDin(e.caixa), '')
      + rfAcLinhaHTML('Falta', rfDin(falta), 'ruim')
      + rfAcNotaHTML('Vender um jogador do elenco ou esperar a bilheteria das próximas em casa são os caminhos mais rápidos.'),
    acoes:[{l:'Cancelar',tom:'fantasma'},{l:'Ir ao mercado',on:'rfAcFechar();rfSetTab(\'mercado\',\'vender\')'}] });
},

};
Object.keys(RF_ACOES_EXTRA).forEach(k=>{ RF_ACOES[k]=RF_ACOES_EXTRA[k]; });

/* ===== O OVERRIDE =====
   As três funções antigas continuam a existir e a ser chamadas de vários
   pontos (menu do topo, Hub, Configurações, Finanças). Em vez de caçar cada
   chamada, redefinimos as três aqui — este ficheiro carrega depois do main.js
   —, e assim TODO caminho, novo ou velho, cai na pele nova. */
if(typeof clOptions==='function'){
  window.clOptions=function(){ CL.menu=null; rfAcAbrir('opcoes',{aba:'geral'}); };
}
if(typeof clStadium==='function'){
  window.clStadium=function(){ CL.menu=null; rfAcEstadio(); };
}
if(typeof clClubHistory==='function'){
  window.clClubHistory=function(clubId){ CL.menu=null; rfAcAbrir('hist-clube',{clubId:clubId||CL.clubId}); };
}
