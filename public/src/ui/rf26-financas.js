/* =====================================================================
   RetroFoot — FINANÇAS (redesign de 10/09/2026, pacote "financas")
   Quatro abas — Resumo · Extrato · Estádio · Patrocínio — e a faixa azul do
   contador, fixa entre as abas e o conteúdo (rfFiFaixaHTML, pendurada no
   `aviso` da página em rf26.js). A aba Histórico saiu: a tabela "por
   temporada" tinha uma linha só e o gráfico do caixa contava a mesma história
   dos gráficos do Resumo. Quando houver mais de uma temporada, a comparação
   ano a ano volta como faixa no pé do Resumo — não como aba.

   NADA DE NÚMERO REPETIDO. O que a faixa mostra (caixa, queima, folha,
   projeção) não volta no corpo de nenhuma aba.

   OS NÚMEROS DA MAQUETE ERAM INVENTADOS; aqui tudo vem do motor. Onde o motor
   é diferente da maquete, vale o motor:
   · as obras são BANCADAS de 5 000 lugares (STAND_SEATS), com o preço de cada
     uma a subir com o estádio (standCostFor) e no máximo SEASON_BUILD_LIMIT
     lugares por ano — não pacotes lineares de 2 000 / 5 000 / 10 000;
   · o mês a mês vem de S.fiMeses, acumulado em pushFinanceEntry (core.js); o
     save anterior a ele reconstrói os meses a partir do extrato;
   · o caixa depois de cada rodada não é guardado — sai de trás para a frente,
     do caixa de hoje menos o saldo de cada rodada mais recente.
   ===================================================================== */

function rfFiTotais(){
  const t=S.seasonTotals||{};
  const receita=(t.income||0)+(t.playerSales||0);
  const despesa=(t.salaries||0)+(t.bonuses||0)+(t.opex||0)+(t.playerPurchases||0)+(t.stadium||0);
  return {receita, despesa, saldo:receita-despesa};
}
/* ===== DE ONDE VEM A RECEITA =====
   O lançamento carimba as parcelas (RF_RECEITA_PARTES em core.js). Save anterior a elas só tem o
   total, e então a linha única volta em vez de quatro zeros; a sobra de uma receita que nasça fora
   destas cinco naturezas sai como "Outras receitas" em vez de sumir. */
const RF_FI_RECEITA_ROT=[['tvFixa','Cota de TV (fixa)'],['tvMerito','Cota de TV (mérito)'],
  ['patrocinio','Patrocínio'],['bilheteria','Bilheteria'],['premioVitoria','Prêmio de desempenho']];
function rfFiReceitaLinhas(o){
  const total=(o&&o.income)||0;
  const partes=RF_FI_RECEITA_ROT.map(([k,rot])=>[rot, Math.round((o&&o[k])||0)]);
  const soma=partes.reduce((t,x)=>t+x[1],0);
  if(!soma) return total?[['Receita da rodada', total]]:[];
  const sobra=total-soma;
  return partes.filter(x=>x[1]).concat(sobra>0?[['Outras receitas', sobra]]:[]);
}
function rfFiG(){ return (typeof RF_GENERO!=='undefined')?RF_GENERO:{t:x=>x}; }
/* dinheiro miúdo (preço por lugar): o `fmt` encurta para k/M e transformava 8 reais em "R$ 0k" */
function rfFiReais(v){
  const sim=(typeof curSym==='function')?curSym():'R$';
  const n=Math.round((typeof curConv==='function')?curConv(v||0):(v||0));
  return sim+' '+((typeof grp==='function')?grp(n):String(n));
}
/* o rótulo curto das colunas do gráfico ("402k", "1,2M"), sem moeda — a moeda está no cabeçalho */
function rfFiCurto(v){
  v=Math.round((typeof curConv==='function')?curConv(v||0):(v||0));
  const a=Math.abs(v);
  if(a>=1e6) return (v/1e6).toFixed(1).replace('.',',').replace(/,0$/,'')+'M';
  if(a>=1e3) return Math.round(v/1e3)+'k';
  return String(v);
}
/* a data do lançamento: o dia carimbado (pushFinanceEntry) ou, em save antigo, a data da rodada */
function rfFiDataDe(f){
  let d=null;
  if(f.day!=null && typeof realDateForDay==='function'){ try{ d=realDateForDay(f.day); }catch(e){} }
  if(!d && f.round!=null && typeof dataDaJornada==='function'){ try{ d=dataDaJornada(Math.max(0,f.round-1),'liga'); }catch(e){} }
  return d||null;
}
function rfFiDataTxt(f){ const d=rfFiDataDe(f); return d?(d.getDate()+'/'+PT_MONTHS_ABBR[d.getMonth()]):'—'; }
function rfFiExportar(){
  const linhas=(S.finances||[]).map(f=>[f.round!=null?f.round:'', f.income||0, f.playerSales||0,
    f.salaries||0, f.opex||0, f.playerPurchases||0, f.stadium||0, f.net||0].join(';'));
  const txt='rodada;receita;vendas;salarios;operacional;compras;estadio;saldo\n'+linhas.join('\n');
  try{
    const a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(txt);
    a.download='extrato-'+(S.season||'')+'.csv'; a.click();
    toastC('Extrato exportado.');
  }catch(e){ toastC('Não deu pra exportar aqui.'); }
}

/* =====================================================================
   A FAIXA DO CONTADOR — igual nas quatro abas; só a fala muda
   A ordem dos quatro números conta uma frase e não se reordena:
   caixa hoje → quanto queima → o que é fixo → onde termina.
   ===================================================================== */
const RF_FI_ABAS=['resumo','extrato','estadio','patrocinio'];
function rfFiAbaAtual(){
  const w=((typeof rfState==='function' && rfState().tab)||{}).financas;
  return RF_FI_ABAS.indexOf(w)>=0 ? w : 'resumo';
}
/* QUEIMA (ou sobra) MÉDIA DAS RODADAS JÁ JOGADAS — só o que se repete toda rodada: cota de TV,
   bilheteria e prêmio de jogo contra folha, bônus e custo. Fica de fora o que acontece uma vez:
   o patrocínio do ano (entra de uma vez na 1ª rodada) e o mercado e as obras — uma compra de
   R$ 3,9 M dividida por onze rodadas projectaria uma queima que não existe. Antes da 1ª rodada
   não há média: devolve null e a faixa usa a projeção do contador. */
function rfFiRitmo(){
  const n=S.round||0; if(!n) return null;
  const t=S.seasonTotals||{};
  const temPartes=(t.tvFixa||t.tvMerito||t.bilheteria||t.premioVitoria);
  const entra = temPartes ? (t.tvFixa||0)+(t.tvMerito||0)+(t.bilheteria||0)+(t.premioVitoria||0)
                          : (t.income||0)-(t.patrocinio||0);
  const sai=(t.salaries||0)+(t.bonuses||0)+(t.opex||0);
  return Math.round((entra-sai)/n);
}
function rfFiFalaExtrato(r){
  const entra=r.tv+r.bilheteria, sai=r.folha+r.opex;
  if(entra>=sai) return `Cada rodada repete o mesmo desenho: TV e bilheteria pagam a folha e os custos, e sobram ${rfDin(entra-sai)} para o caixa.`;
  const pct=Math.round(r.tv/Math.max(1,r.folha)*100);
  return `Cada rodada repete o mesmo desenho: a cota de TV cobre ${pct>=100?'a folha inteira':pct+'% da folha'}, o resto sai do caixa.`;
}
function rfFiFalaEstadio(){
  const e=rfFiEstadioDados();
  const base=`Lugar vazio não rende. Com ${grp(e.cap)} lugares a ${rfFiReais(e.preco)}, o teto de uma tarde é ${rfDin(e.cap*e.preco)}`;
  if(e.liberado>0) return base+' — e o teto é o problema.';
  return base+(e.noTeto
    ? ' — e o estádio chegou ao limite do porte do clube: agora, só subindo de divisão.'
    : ' — e a cota de obras deste ano já foi usada. Na próxima temporada dá para crescer de novo.');
}
function rfFiFalaPatro(){
  const vagos=rfFiPatroDados().contratos.filter(c=>!c.marcaSrc).length;
  return vagos
    ? 'Os três espaços já estão vendidos. O que falta é a arte da marca, não o dinheiro.'
    : 'Os três espaços estão vendidos e estampados. Agora o contrato cresce com o elenco e com a divisão.';
}
/* A SITUAÇÃO DO CAIXA, numa conta só — a faixa de Finanças e o aviso do Hub leem daqui, para
   nunca dizerem números diferentes sobre o mesmo clube. */
function rfFiSituacao(){
  const r=rfCtConta({});
  const real=rfFiRitmo();
  const ritmo=(real!=null)?real:r.ritmo;
  const fim=Math.round(r.caixa + r.patroPendente + ritmo*r.faltam);
  return { r, real, ritmo, fim, rr:Object.assign({}, r, {ritmo, fimAno:fim}),
    vermelho: r.caixa<0 || fim<0 };
}
function rfFiSelo(r, fim, ritmo){
  return r.caixa<0 ? ['NO VERMELHO','ruim'] : fim<0 ? ['VAI FECHAR NO VERMELHO','ruim']
       : ritmo<0 ? ['NO AZUL, SEM FOLGA',''] : ['NO AZUL, COM FOLGA','ok'];
}
function rfFiContadorTopoHTML(selo, fala){
  const p=rfCtPessoa(); const cl=clubOf(CL.clubId)||{};
  return `<div class="rf-cf-top">
      <span class="rf-cf-av" aria-hidden="true">${escC(p.ini)}${p.foto?`<img src="${escC(p.foto)}" alt="" onerror="this.remove()">`:''}</span>
      <span class="rf-cf-id">
        <span class="rf-cf-n">${escC(p.nome)}</span>
        <span class="rf-cf-c">${escC((p.cargo+' do '+(cl.short||'clube')).toUpperCase())}</span>
      </span>
      <span class="rf-cf-selo ${selo[1]}"><i></i>${selo[0]}</span>
      ${fala?`<span class="rf-cf-fala">“${escC(fala)}”</span>`:''}
    </div>`;
}
function rfFiFaixaHTML(){
  let sit; try{ sit=rfFiSituacao(); }catch(e){ return ''; }
  const {r, real, ritmo, fim, rr}=sit;
  const aba=rfFiAbaAtual();
  let fala='';
  try{
    fala = aba==='extrato' ? rfFiFalaExtrato(rr)
         : aba==='estadio' ? rfFiFalaEstadio()
         : aba==='patrocinio' ? rfFiFalaPatro()
         : rfCtFalaHoje(rr);
  }catch(e){ fala=''; }
  const selo=rfFiSelo(r, fim, ritmo);
  const n=S.round||0;
  /* rótulo em duas versões: o do celular é o curto da maquete de 390px ("QUEIMA/RODADA"), para
     nenhum rótulo quebrar nem sair cortado */
  const kpi=(rot,val,nota,tom,curto)=>`<div class="rf-cf-kpi">
      <span class="rf-cf-kpi-l"><span class="rf-f2-so-desk">${escC(rot)}</span><span class="rf-f2-so-mob">${escC(curto||rot)}</span></span>
      <span class="rf-cf-kpi-v ${tom||''}">${escC(val)}</span>
      <span class="rf-cf-kpi-n">${escC(nota)}</span>
    </div>`;
  return `<div class="rf-cf">
    ${rfFiContadorTopoHTML(selo, fala)}
    <div class="rf-cf-kpis">
      ${kpi('CAIXA HOJE', rfDin(r.caixa), n+'ª semana de '+(S.season||''), r.caixa<0?'ruim':'', 'CAIXA HOJE')}
      ${kpi(ritmo<0?'QUEIMA POR RODADA':'SOBRA POR RODADA', (ritmo>0?'+':'')+rfDin(ritmo),
            real!=null?('média das '+n+' já jogada'+(n===1?'':'s')):'projeção, antes da 1ª rodada', ritmo<0?'queima':'ok',
            ritmo<0?'QUEIMA/RODADA':'SOBRA/RODADA')}
      ${kpi('FOLHA POR RODADA', rfDin(r.folha), 'compromisso fixo', '', 'FOLHA/RODADA')}
      ${kpi('PROJEÇÃO · FIM DA TEMPORADA', rfDin(fim),
            r.faltam?('em '+r.faltam+' rodada'+(r.faltam===1?'':'s')+', no ritmo atual'):'temporada encerrada', fim<0?'ruim':'fim',
            'FIM DA TEMPORADA')}
    </div>
    <span class="rf-cf-nota">Prêmios de vitória e de fim de temporada ficam fora da conta — quando vierem, são lucro.</span>
  </div>`;
}

/* ===== O CONTADOR NO HUB — só quando as contas estão no vermelho =====
   Caixa negativo, ou a projeção do ano a fechar negativa (a mesma conta da faixa de Finanças).
   No azul ele não aparece: o Hub é a tela de escalar o time, e um aviso que está sempre lá deixa
   de ser lido. Leva a Finanças, onde está o resto da conversa. */
function rfFiHubHTML(){
  let sit; try{ sit=rfFiSituacao(); }catch(e){ return ''; }
  if(!sit.vermelho) return '';
  const {r, ritmo, fim, rr}=sit;
  let fala=''; try{ fala=rfCtFalaHoje(rr); }catch(e){}
  return `<div class="rf-cf rf-cf-hub">
    ${rfFiContadorTopoHTML(rfFiSelo(r, fim, ritmo), fala)}
    <div class="rf-cf-hub-pe">
      <span class="rf-cf-hub-n"><i>CAIXA HOJE</i><b class="${r.caixa<0?'ruim':''}">${escC(rfDin(r.caixa))}</b></span>
      <span class="rf-cf-hub-n"><i>FIM DA TEMPORADA</i><b class="${fim<0?'ruim':''}">${escC(rfDin(fim))}</b></span>
      <span class="rf-sp"></span>
      <button type="button" class="rf-cf-hub-b" onclick="rfGo('financas','resumo')">Ver finanças</button>
    </div>
  </div>`;
}

/* =====================================================================
   1 · RESUMO — dois gráficos mês a mês na MESMA escala, e Entra / Sai
   ===================================================================== */
const RF_MES_EXT=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function rfFiMeses(){
  const vazio=()=>({r:0,d:0,compras:0,bil:0});
  const out={}; const k0=String(S.season)+'|'; const M=S.fiMeses||{};
  Object.keys(M).forEach(k=>{ if(k.indexOf(k0)===0) out[Number(k.slice(k0.length))]=Object.assign(vazio(), M[k]); });
  if(!Object.keys(out).length){
    /* SAVE ANTERIOR AO MÊS A MÊS: reconstrói do extrato (as rodadas que ele ainda guarda) */
    (S.finances||[]).forEach(f=>{
      const d=rfFiDataDe(f); if(!d) return;
      const o=out[d.getMonth()]||(out[d.getMonth()]=vazio());
      o.r+=(f.income||0)+(f.playerSales||0);
      o.d+=(f.salaries||0)+(f.bonuses||0)+(f.opex||0)+(f.playerPurchases||0)+(f.stadium||0);
      o.compras+=f.playerPurchases||0; o.bil+=f.bilheteria||0;
    });
  }
  const ks=Object.keys(out).map(Number).sort((a,b)=>a-b);
  if(!ks.length) return [];
  const lista=[];
  for(let m=ks[0]; m<=ks[ks.length-1]; m++) lista.push(Object.assign({m}, out[m]||vazio()));
  return lista;
}
function rfFiGraficoHTML(rec, meses, teto, total, leitura, fora){
  const vals=meses.map(x=>rec?x.r:x.d);
  return `<div class="rf-card rf-f2-graf">
    <div class="rf-f2-cab">
      <span class="rf-f2-cab-t"><i class="${rec?'rec':'des'}"></i>${rec?'RECEITAS':'DESPESAS'} MÊS A MÊS</span>
      <span class="rf-f2-cab-r">total ${escC(rfDin(total))}</span>
    </div>
    <div class="rf-f2-cols">${vals.map((v,i)=>`<div class="rf-f2-col">
        <span class="rf-f2-col-v">${v?escC(rfFiCurto(v)):''}</span>
        <span class="rf-f2-col-b ${rec?'rec':'des'}${(!rec&&i===fora)?' fora':''}" style="height:${v>0?Math.max(6,Math.round(v/teto*84)):0}%"></span>
      </div>`).join('')}</div>
    <div class="rf-f2-meses">${meses.map(x=>`<span>${PT_MONTHS_ABBR[x.m]}</span>`).join('')}</div>
    <span class="rf-f2-leitura">${leitura}</span>
  </div>`;
}
function rfFiFluxoHTML(titulo, direita, itens, total, rec){
  const ord=itens.slice().sort((a,b)=>b[1]-a[1]);
  const maior=Math.max.apply(null, ord.map(x=>x[1]).concat([1]));
  return `<div class="rf-card rf-f2-fluxo">
    <div class="rf-f2-cab"><span class="rf-f2-cab-t">${titulo}</span><span class="rf-f2-cab-r">${escC(direita)}</span></div>
    ${ord.map(([rot,v])=>`<div class="rf-f2-lin">
      <span class="rf-f2-lin-t">${escC(rot)}</span>
      <span class="rf-f2-lin-b"><i class="${rec?'rec':'des'}" style="width:${v>0?Math.max(4,Math.round(100*v/maior)):0}%"></i></span>
      <span class="rf-f2-lin-v">${escC(rfDin(v))}</span>
    </div>`).join('')}
    <div class="rf-f2-tot ${rec?'rec':'des'}"><span>Total</span><b>${escC(rfDin(total))}</b></div>
  </div>`;
}
function rfFiResumoHTML(){
  const {receita,despesa}=rfFiTotais();
  const t=S.seasonTotals||{};
  const folha=squad(CL.clubId).reduce((s,p)=>s+((p.contract&&p.contract.salary)||p.salary||0),0);
  const meses=rfFiMeses();
  let graficos;
  if(!meses.length){
    graficos=`<div class="rf-card"><div class="rf-empty">Os gráficos aparecem quando a primeira rodada fechar.</div></div>`;
  } else {
    /* A ESCALA É UMA SÓ para os dois gráficos: o maior valor entre receitas e despesas é 100%.
       Duas escalas faziam um mês de despesa normal parecer maior que o melhor mês de receita. */
    const teto=Math.max.apply(null, meses.map(x=>Math.max(x.r,x.d)).concat([1]));
    const totR=meses.reduce((a,x)=>a+x.r,0), totD=meses.reduce((a,x)=>a+x.d,0);
    let iBom=0; meses.forEach((x,i)=>{ if(x.r>meses[iBom].r) iBom=i; });
    let iMax=0; meses.forEach((x,i)=>{ if(x.d>meses[iMax].d) iMax=i; });
    const ds=meses.map(x=>x.d).filter(Boolean).sort((a,b)=>a-b);
    const mediana=ds.length?ds[Math.floor(ds.length/2)]:0;
    const fora=(meses.length>=3 && mediana && meses[iMax].d>=1.6*mediana) ? iMax : -1;
    const mb=meses[iBom], mm=meses[iMax];
    const leituraR = meses.length===1
      ? `Primeiro mês da temporada: <b>${RF_MES_EXT[mb.m]}</b>`
      : `Melhor mês: <b>${RF_MES_EXT[mb.m]}</b> · ${escC(rfDin(mb.r))}${mb.bil>mb.r*0.4?' · bilheteria forte':''}`;
    const leituraD = fora>=0
      ? `Fora da curva: <b>${RF_MES_EXT[mm.m]}</b> · ${mm.compras>=mm.d*0.5
          ? escC(rfDin(mm.compras))+' em compra de '+rfFiG().t('jogadores')
          : escC(rfDin(mm.d))+' no mês'}`
      : `Maior mês: <b>${RF_MES_EXT[mm.m]}</b> · ${escC(rfDin(mm.d))}`;
    graficos=`<div class="rf-f2-duo">${rfFiGraficoHTML(true, meses, teto, totR, leituraR, -1)}${rfFiGraficoHTML(false, meses, teto, totD, leituraD, fora)}</div>`;
  }
  const entra=rfFiReceitaLinhas(t).concat([['Venda de '+rfFiG().t('jogadores'), t.playerSales||0]]);
  /* A FOLHA NAO NASCE A ZERO: antes da 1ª rodada o acumulado é 0, e o compromisso já é a soma dos
     salários do elenco. Enquanto nada foi pago, mostra-se o que VAI ser pago. */
  const sai=[['Folha salarial', (t.salaries||0) || folha],['Bônus', t.bonuses||0],
             ['Custo operacional', t.opex||0],['Compra de '+rfFiG().t('jogadores'), t.playerPurchases||0],
             ['Obras no estádio', t.stadium||0]];
  return graficos+`<div class="rf-f2-duo estica">
      ${rfFiFluxoHTML('ENTRA', 'temporada '+(S.season||''), entra, receita, true)}
      ${rfFiFluxoHTML('SAI', 'folha atual '+rfDin(folha), sai, despesa || folha, false)}
    </div>`;
}

/* =====================================================================
   2 · EXTRATO — agrupado por rodada; o caixa aparece uma vez por rodada
   ===================================================================== */
const RF_FI_TIPOS=['todos','entradas','saídas'];
const RF_FI_MIN=[0,10000,100000,1000000];
const RF_FI_POR_PAG=12;
function rfFiExtEstado(){ CL._fiExt=CL._fiExt||{tipo:0,min:0,pag:0}; return CL._fiExt; }
function rfFiExtSet(k){
  const e=rfFiExtEstado();
  if(k==='tipo'){ e.tipo=(e.tipo+1)%RF_FI_TIPOS.length; e.pag=0; }
  else if(k==='min'){ e.min=(e.min+1)%RF_FI_MIN.length; e.pag=0; }
  else if(k==='prox') e.pag++;
  else if(k==='ant') e.pag=Math.max(0,e.pag-1);
  cdraw();
}
function rfFiExtItens(f){
  const G=rfFiG();
  return rfFiReceitaLinhas(f).concat([
    ['Venda de '+G.t('jogadores'), f.playerSales||0],
    ['Folha salarial', -(f.salaries||0)],
    ['Bônus', -(f.bonuses||0)],
    ['Custo operacional', -(f.opex||0)],
    ['Compra de '+G.t('jogadores'), -(f.playerPurchases||0)],
    ['Obras no estádio', -(f.stadium||0)],
  ]).filter(x=>x[1]);
}
function rfFiExtratoHTML(){
  const e=rfFiExtEstado();
  /* GRUPOS POR RODADA. S.finances vem da mais recente para a mais antiga; lançamentos da mesma
     rodada (o fecho e uma compra no meio da semana) juntam-se no mesmo grupo. O caixa depois de
     cada rodada não é guardado: sai do caixa de hoje menos o saldo de cada rodada mais nova. */
  const grupos=[]; let caixa=S.budget||0;
  (S.finances||[]).forEach(f=>{
    let g=grupos[grupos.length-1];
    if(!g || g.round!==f.round){ g={round:f.round, f, net:0, itens:[], caixaDepois:caixa}; grupos.push(g); }
    g.net+=(f.net||0); caixa-=(f.net||0);
    g.itens=g.itens.concat(rfFiExtItens(f));
  });
  const tipo=RF_FI_TIPOS[e.tipo], minimo=RF_FI_MIN[e.min];
  const passa=([,v])=> Math.abs(v)>=minimo && (tipo==='todos' || (tipo==='entradas'?v>0:v<0));
  const lista=[]; grupos.forEach(g=>g.itens.filter(passa).forEach(it=>lista.push({g,it})));
  const total=lista.length;
  const pags=Math.max(1, Math.ceil(total/RF_FI_POR_PAG));
  const pag=Math.min(e.pag, pags-1); e.pag=pag;
  const fatia=lista.slice(pag*RF_FI_POR_PAG, (pag+1)*RF_FI_POR_PAG);
  const blocos=[]; fatia.forEach(x=>{ let b=blocos[blocos.length-1]; if(!b||b.g!==x.g){ b={g:x.g,itens:[]}; blocos.push(b); } b.itens.push(x.it); });
  const filtro=(rot,val,on)=>`<button type="button" class="rf-f2-filtro" onclick="${on}">
      <span>${escC(rot)}</span><b>${escC(val)}</b><i>▾</i></button>`;
  const corpo = !grupos.length
    ? '<div class="rf-empty">Nenhuma rodada fechada ainda nesta temporada.</div>'
    : !total ? '<div class="rf-empty">Nenhum lançamento com estes filtros.</div>'
    : blocos.map(b=>{
        const g=b.g;
        return `<div class="rf-f2-rod">
          <div class="rf-f2-rod-cab">
            <span class="rf-f2-rod-id"><b>${g.round!=null?g.round+'ª jornada':'Rodada'}</b><i>${escC(rfFiDataTxt(g.f))}</i></span>
            <span class="rf-f2-rod-num">
              <span class="rf-f2-rod-l">saldo da rodada</span>
              <span class="rf-f2-rod-s ${g.net>=0?'ok':'ruim'}">${g.net>=0?'+':'−'}${escC(rfDin(Math.abs(g.net)))}</span>
              <span class="rf-f2-rod-div"></span>
              <span class="rf-f2-rod-l">caixa</span>
              <span class="rf-f2-rod-c">${escC(rfDin(g.caixaDepois))}</span>
            </span>
          </div>
          ${b.itens.map(([rot,v])=>`<div class="rf-f2-it">
            <span class="rf-f2-chip ${v>0?'ent':'sai'}">${v>0?'ENTRADA':'SAÍDA'}</span>
            <span class="rf-f2-it-n">${escC(rot)}</span>
            <span class="rf-f2-it-v ${v>0?'ok':'ruim'}">${v>0?'+':'−'}${escC(rfDin(Math.abs(v)))}</span>
          </div>`).join('')}
        </div>`;
      }).join('');
  const de=total?(pag*RF_FI_POR_PAG+1):0, ate=Math.min(total,(pag+1)*RF_FI_POR_PAG);
  return `<div class="rf-card rf-f2-ext">
    <div class="rf-f2-filtros">
      <span class="rf-f2-cab-t rf-f2-so-desk">LANÇAMENTOS</span>
      <div class="rf-f2-trilho">
        ${filtro('Temporada', String(S.season||''), '')}
        ${filtro('Tipo', tipo, "rfFiExtSet('tipo')")}
        ${filtro('Valor mínimo', rfDin(minimo), "rfFiExtSet('min')")}
      </div>
      <span class="rf-sp rf-f2-so-desk"></span>
      <button type="button" class="rf-f2-exp rf-f2-so-desk" onclick="rfFiExportar()">${rfIcone('exportar',14)} Exportar extrato</button>
    </div>
    ${corpo}
    <div class="rf-f2-pag">
      <span class="rf-f2-pag-t">${total?`${de}–${ate} de ${total} lançamento${total===1?'':'s'}`:'0 lançamentos'}</span>
      <span class="rf-sp"></span>
      <button type="button" class="rf-f2-pag-b" ${pag<=0?'disabled':''} onclick="rfFiExtSet('ant')" aria-label="Página anterior">‹</button>
      <span class="rf-f2-pag-n">${pag+1} de ${pags}</span>
      <button type="button" class="rf-f2-pag-b" ${pag>=pags-1?'disabled':''} onclick="rfFiExtSet('prox')" aria-label="Próxima página">›</button>
    </div>
  </div>
  <button type="button" class="rf-f2-exp rf-f2-so-mob" onclick="rfFiExportar()">${rfIcone('exportar',14)} Exportar extrato</button>`;
}

/* =====================================================================
   3 · ESTÁDIO — como faturar mais: receita por jogo = público × preço
   ===================================================================== */
function rfFiEstadioDados(){
  const st=(typeof myStadium==='function')?myStadium():null;
  const cap=(st&&st.capacity)||(typeof STAND_START!=='undefined'?STAND_START:0);
  const teto=(typeof stadiumMaxCapacity==='function')?stadiumMaxCapacity():cap;
  const feito=(st&&st.builtThisSeason)||0;
  const cota=(typeof SEASON_BUILD_LIMIT!=='undefined')?SEASON_BUILD_LIMIT:0;
  const liberado=Math.max(0, Math.min(cota-feito, teto-cap));
  const bloqueado=Math.max(0, teto-cap-liberado);
  /* O PREÇO VEM DA DIVISÃO, e é o motor que o diz (ticketPriceForDivision): é a mesma tabela que
     paga a bilheteria. O jogador não o escolhe. */
  const preco=(typeof ticketPriceForDivision==='function')?ticketPriceForDivision(S.division):(CL.ticket||0);
  return {st, cap, teto, feito, cota, liberado, bloqueado, preco, noTeto:cap>=teto};
}
/* o botão do pacote abre o diálogo da obra JÁ com a quantidade — é ele que cobra, confirma e
   passa pelo contador (rfCtSegurar em rfEstConstruirGo). Nunca vai direto ao motor. */
function rfFiObra(n){ CL._obrasQtd=n; rfAcAbrir('est-construir'); }
function rfFiEstadioHTML(){
  const e=rfFiEstadioDados();
  const cl=clubOf(CL.clubId)||{short:'—'};
  const th=(typeof clubTheme==='function')?clubTheme(CL.clubId):{col:'#8f1d18',hdr:'#fff'};
  const esc=(c,k)=>(typeof shade==='function')?shade(c,k):c;
  const heroBg=`linear-gradient(105deg,${esc(th.col,-0.22)},${th.col} 55%,${esc(th.col,-0.34)})`;
  const pct=v=>e.teto?Math.round(v/e.teto*1000)/10:0;
  const nomeEst=(typeof rfObEstadioNome==='function')?rfObEstadioNome(cl,e.st):('Estádio do '+cl.short);
  const casa=Math.max(1, Math.round(((S.sched||[]).length||38)/2));
  const o=(typeof rfObrasPrecos==='function')?rfObrasPrecos():{linhas:[],maxPorRegra:0};
  const caixa=S.budget||0;
  const pacotes=o.linhas.slice(0,3);
  const cabem=pacotes.filter(l=>l.cabeNoCaixa);
  const destaque=cabem.length?cabem[cabem.length-1].n:0;
  const primeira=pacotes[0];
  const porLugar=primeira?Math.round(primeira.preco/STAND_SEATS):0;
  const paga=primeira?primeira.preco/(STAND_SEATS*e.preco*casa):0;
  const pagaTxt=!primeira?'' : paga<=1 ? 'a primeira bancada se paga dentro de uma temporada, com casa cheia'
    : paga>5 ? 'a obra leva mais de cinco temporadas a se pagar só com bilheteria'
    : `a primeira bancada se paga em ${paga.toFixed(1).replace('.',',')} temporadas com casa cheia`;
  const obraHTML=pacotes.map(l=>{
    const lug=l.n*STAND_SEATS;
    const falta=Math.max(0, l.total-caixa);
    const on=l.cabeNoCaixa;
    const nota = !on ? `faltam ${rfDin(falta)} no caixa`
      : l.n===o.maxPorRegra && l.n>1 ? 'tudo o que está liberado este ano'
      : 'cabe no caixa de hoje';
    return `<div class="rf-f2-obra ${l.n===destaque?'on':''}">
      <span class="rf-f2-obra-id"><b>+${grp(lug)} lugares</b><i>${escC(nota)}</i></span>
      <span class="rf-f2-obra-num"><b>${escC(rfDin(l.total))}</b><i>+${escC(rfDin(lug*e.preco))} / jogo</i></span>
      <button type="button" class="rf-f2-obra-b" ${on?`onclick="rfFiObra(${l.n})"`:'disabled'}>${on?'Construir':'Sem caixa'}</button>
    </div>`;
  }).join('');
  const semObra = e.noTeto
    ? `O estádio chegou ao teto do porte do clube (${grp(e.teto)} lugares). Crescer além disso só com o clube maior.`
    : `A cota de obras deste ano (${grp(e.cota)} lugares) já foi usada. Na próxima temporada dá para construir de novo.`;
  const ultimo=pacotes[pacotes.length-1];
  const aviso = !pacotes.length ? ''
    : destaque ? `Caixa hoje ${rfDin(caixa)}. Dá para erguer <b>${grp(destaque*STAND_SEATS)} lugares agora</b>${ultimo && !ultimo.cabeNoCaixa?`; para os ${grp(ultimo.n*STAND_SEATS)} de uma vez faltam ${rfDin(ultimo.total-caixa)}`:''}.`
    : `Caixa hoje ${rfDin(caixa)}. Nenhuma obra cabe agora: a primeira bancada custa ${rfDin(primeira.total)} e faltam ${rfDin(primeira.total-caixa)}.`;
  /* a escada das divisões: a de agora e o próximo degrau marcados */
  const TIERS=['A','B','C','D'];
  const tier=(typeof PRIZES!=='undefined'&&PRIZES.tierOf)?PRIZES.tierOf(S.division):S.division;
  const iT=Math.max(0,TIERS.indexOf(tier));
  const precoDe=t=>(typeof PRIZES!=='undefined'&&PRIZES.TICKET&&PRIZES.TICKET[t])||0;
  const prox=iT>0?TIERS[iT-1]:null;
  const escada=TIERS.map((t,i)=>{
    const v=precoDe(t);
    const cls = i===iT?'atual' : t===prox?'prox' : '';
    const nota = i===iT?'a sua divisão' : t===prox?'próximo degrau'
      : (e.preco? ((v>=e.preco?'+':'')+Math.round((v/e.preco-1)*100)+'%') : '');
    return `<div class="rf-f2-deg ${cls}"><b>${escC(rfFiReais(v))}</b><span>Série ${t}</span><i>${escC(nota)}</i></div>`;
  }).join('');
  const lugFut=e.cap+e.liberado;
  const junta = prox
    ? {rot:'AS DUAS JUNTAS, NA SÉRIE '+prox, v:lugFut*precoDe(prox), p:precoDe(prox)}
    : {rot:'COM AS OBRAS LIBERADAS', v:lugFut*e.preco, p:e.preco};
  const mult=e.cap*e.preco ? junta.v/(e.cap*e.preco) : 0;
  const casaRes=(S.results||[]).filter(r=>r.h===CL.clubId);
  const publicos=casaRes.map(r=>r.att||0).filter(Boolean);
  const medio=publicos.length?Math.round(publicos.reduce((a,b)=>a+b,0)/publicos.length):0;
  const maiorP=publicos.length?Math.max.apply(null,publicos):0;
  const receitaBil=(S.seasonTotals&&S.seasonTotals.bilheteria)||0;
  const bil=(rot,val,nota,vazio)=>`<div class="rf-f2-bil"><span class="rf-f2-bil-l">${rot}</span>
    <b class="${vazio?'vazio':''}">${escC(val)}</b><i>${escC(nota)}</i></div>`;
  return `<div class="rf-f2-hero" style="background:${heroBg};--hero-ink:${th.hdr||'#fff'}">
      <div class="rf-f2-hero-top">
        <span class="rf-f2-hero-id"><b>${escC(nomeEst)}</b><i>${grp(e.cap)} LUGARES · TETO ${grp(e.teto)}</i></span>
        <span class="rf-f2-hero-v"><i>RENDE HOJE, COM CASA CHEIA</i><b>${escC(rfDin(e.cap*e.preco))} / jogo</b></span>
      </div>
      <div class="rf-f2-cap"><span class="c" style="width:${pct(e.cap)}%"></span><span class="l" style="width:${pct(e.liberado)}%"></span></div>
      <div class="rf-f2-cap-leg">
        <span><i class="c"></i>${grp(e.cap)} construídos</span>
        ${e.liberado?`<span><i class="l"></i>${grp(e.liberado)} liberados para obra este ano</span>`:''}
        ${e.bloqueado?`<span><i class="b"></i>${grp(e.bloqueado)} só em temporadas futuras</span>`:''}
      </div>
    </div>
    <div class="rf-f2-alav">
      <div class="rf-card rf-f2-bloco">
        <div class="rf-f2-cab"><span class="rf-f2-cab-t">ALAVANCA 1 · MAIS LUGARES</span>
          ${porLugar?`<span class="rf-f2-cab-r">${escC(rfFiReais(porLugar))} por lugar</span>`:''}</div>
        <span class="rf-f2-txt">Cada lugar novo vale <b>${escC(rfFiReais(e.preco))} por jogo em casa</b> — o preço da sua divisão. Com ${casa} jogos em casa por temporada, ${escC(pagaTxt||'a obra rende a cada jogo')}${prox?', e mais rápido ainda se o clube subir de divisão':''}.</span>
        ${pacotes.length?`<div class="rf-f2-obras">${obraHTML}</div>`:`<div class="rf-f2-alerta">${escC(semObra)}</div>`}
        ${aviso?`<div class="rf-f2-alerta">⚠ <span>${aviso}</span></div>`:''}
      </div>
      <div class="rf-card rf-f2-bloco">
        <div class="rf-f2-cab"><span class="rf-f2-cab-t">ALAVANCA 2 · PREÇO DO BILHETE</span>
          <span class="rf-f2-cab-r">pela divisão</span></div>
        <span class="rf-f2-txt">O preço não se escolhe: sobe com o clube. Subir uma divisão vale o mesmo que construir milhares de lugares.</span>
        <div class="rf-f2-escada">${escada}</div>
        <div class="rf-f2-junta">
          <i>${escC(junta.rot)}</i>
          <b>${escC(rfDin(junta.v))} / jogo</b>
          <span>${grp(lugFut)} lugares × ${escC(rfFiReais(junta.p))}${mult>1.05?' — '+mult.toFixed(1).replace('.',',')+'× o de hoje':''}</span>
        </div>
      </div>
    </div>
    <div class="rf-card rf-f2-bloco">
      <div class="rf-f2-cab"><span class="rf-f2-cab-t">BILHETERIA ATÉ AQUI</span><span class="rf-f2-cab-r">temporada ${escC(String(S.season||''))}</span></div>
      <div class="rf-f2-bils">
        ${bil('JOGOS EM CASA', String(casaRes.length), 'de '+casa+' na temporada', false)}
        ${bil('PÚBLICO MÉDIO', medio?grp(medio):'—', medio?'pagantes por jogo':'ainda sem jogo em casa', !medio)}
        ${bil('MAIOR PÚBLICO', maiorP?grp(maiorP):'—', maiorP?'nesta temporada':'recorde ainda por bater', !maiorP)}
        ${bil('RECEITA NO ANO', receitaBil?rfDin(receitaBil):'—', 'só bilheteria', !receitaBil)}
      </div>
    </div>`;
}

/* =====================================================================
   4 · PATROCÍNIO
   O DINHEIRO AQUI É O DINHEIRO A SÉRIO: metade da receita-base do clube é patrocínio
   (REBAL.receitaPartes, a mesma conta de processFinances), repartida pelos três espaços — a soma
   é o total exacto. NÃO HÁ CONTRATO NO MOTOR (marca, vencimento, negociação); sem marca, o lugar
   diz "em breve", que é a verdade. A exceção é a camisa quando o uniforme do clube tem
   patrocinador (Estúdio do painel -> RF_UNIFORMES): esse é real, e fica.
   ===================================================================== */
function rfFiPatroDados(){
  const cl=(typeof clubOf==='function')?clubOf(CL.clubId):null;
  const med=(typeof divOverallAvgOf==='function')?divOverallAvgOf(S.division):undefined;
  const partes=(cl && REBAL.receitaPartes)?REBAL.receitaPartes(cl.overall, med):null;
  const porRodada=partes?partes.patrocinio:0;
  const rodadas=((S.sched||[]).length)||38;
  /* O NÚMERO É O QUE ENTROU NO CAIXA. Depois da 1ª rodada o patrocínio do ano já foi creditado
     (processFinances carimba S._patroAno_eu) e o valor certo é o que o motor pagou —
     seasonTotals.patrocinio —, não uma conta refeita agora: o elenco mudou desde o pagamento, e
     as rodadas extras de copa que a temporada possa ganhar não pagam patrocínio. Antes da 1ª
     rodada, mostra o que VAI entrar, pela mesma conta de patrocinioRodadasAPagar. */
  const pago=(S._patroAno_eu===S.season);
  const creditado=(S.seasonTotals&&S.seasonTotals.patrocinio)||0;
  const total = pago ? (creditado || porRodada*rodadas) : porRodada*Math.max(0, rodadas-(S.round||0));
  const uni=(window.RF_UNIFORMES||{})[String(CL.clubId)]||{};
  const quota=[0.55,0.27,0.18];                    // camisa · manga · placas
  const v0=Math.round(total*quota[0]), v1=Math.round(total*quota[1]);
  const contratos=[
    {espaco:'Patrocinador principal', onde:'camisa', icone:'👕', valor:v0, marcaSrc:uni.patroUrl||null, marcaNome:uni.patroNome||null},
    /* o logo na manga do uniforme é o do FABRICANTE, não um patrocinador — não há contrato dele */
    {espaco:'Manga da camisa', onde:'manga', icone:'💪', valor:v1, marcaSrc:null, marcaNome:null},
    {espaco:'Placas do estádio', onde:'placas', icone:'🪧', valor:total-v0-v1, marcaSrc:null, marcaNome:null},
  ];
  return {total, porRodada, rodadas, contratos, pago};
}
function rfFiPatrocinioHTML(){
  const d=rfFiPatroDados();
  const cards=d.contratos.map(c=>{
    const pct=d.total?Math.round(c.valor/d.total*100):0;
    const selo=c.marcaSrc?escC(c.marcaNome||'ATIVO').toUpperCase():'MARCA EM BREVE';
    return `<div class="rf-card rf-f2-pat">
      <div class="rf-f2-pat-top">
        <span class="rf-f2-pat-ic">${c.marcaSrc?`<img src="${escC(c.marcaSrc)}" alt="">`:c.icone}</span>
        <span class="rf-f2-pat-id"><b>${escC(c.espaco)}</b><i class="${c.marcaSrc?'ativo':''}">${selo}</i></span>
        <span class="rf-f2-pat-v rf-f2-so-mob">${escC(rfDin(c.valor))}</span>
      </div>
      <div class="rf-f2-pat-num rf-f2-so-desk"><b>${escC(rfDin(c.valor))}</b></div>
      <div class="rf-f2-pat-peso"><span><i style="width:${pct}%"></i></span><b>${pct}%</b></div>
      <span class="rf-f2-pat-r">${escC(c.onde)} · ${escC(rfDin(d.rodadas?Math.round(c.valor/d.rodadas):0))} por rodada</span>
    </div>`;
  }).join('');
  return `<div class="rf-f2-tri">${cards}</div>
    <div class="rf-f2-duo estica">
      <div class="rf-card rf-f2-bloco">
        <span class="rf-f2-cab-t">COMO O DINHEIRO ENTRA</span>
        <div class="rf-f2-tot azul"><span>${d.pago?'Recebido nesta temporada':'A receber na 1ª rodada'}</span><b>${escC(rfDin(d.total))}</b></div>
        <span class="rf-f2-txt">O valor do ano inteiro entra <b>de uma vez, na primeira rodada da temporada</b> — é caixa para o mercado logo na abertura, e não volta a entrar. Depois disso o clube vive de cota de TV e bilheteria.</span>
        <span class="rf-f2-txt fraco">O espaço já rende sem marca nenhuma estampada: o "em breve" é só a arte, não o dinheiro.</span>
      </div>
      <div class="rf-card rf-f2-bloco">
        <span class="rf-f2-cab-t">O QUE FAZ O CONTRATO SUBIR</span>
        <div class="rf-f2-porque"><span>💪</span><span><b>Elenco mais forte</b><i>Quanto mais vale o time em campo, mais a marca paga para estar nele. O contrato acompanha a força do elenco.</i></span></div>
        <div class="rf-f2-porque"><span>📅</span><span><b>Quando o valor é fechado</b><i>No início de cada temporada, pela força do elenco naquele momento. Reforço contratado no meio do ano só pesa no contrato do ano seguinte.</i></span></div>
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
