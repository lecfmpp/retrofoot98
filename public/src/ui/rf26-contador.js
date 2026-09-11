/* =====================================================================
   RetroFoot — O CONTADOR DO CLUBE
   ---------------------------------------------------------------------
   Uma pessoa, com nome e rosto, que olha para o caixa e diz em voz alta o
   que a decisão vai fazer com ele. Existe porque o motor deixa o clube
   endividar-se sem avisar (ver docs/financas-dos-clubes.md, secções 5 e 6):
   · a compra só confere se a TAXA cabe no caixa — o salário nunca;
   · o patrocínio do ano inteiro cai na 1ª rodada, junto com a 1ª janela,
     e o caixa parece sobra quando é o dinheiro do ano;
   · caixa negativo só gera uma notícia.

   ONDE ELE APARECE
   1. Dentro de todo diálogo que gasta dinheiro (compra nas 3 etapas,
      proposta a humano, lance, cobertura, obra, renovação): um cartão com
      a fala e três números — caixa depois, ritmo por rodada, fim do ano.
   2. Um diálogo PRÓPRIO que segura a decisão quando ela deixa o caixa
      negativo no fim da temporada ("Voltar e rever" / "Seguir mesmo
      assim"). Não proíbe: avisa uma vez, e a pessoa decide.
   3. Fixo no topo de Finanças, em todas as abas, com a situação de hoje.

   A CONTA é a da secção 7 do documento, com as MESMAS réguas do motor
   (REBAL.receitaPartes, REBAL.OPEX, attendanceFor) — nunca uma tabela
   própria. Não conta prémio de vitória nem premiação de fim de ano: são
   incertos, e o contador é prudente de propósito.
   ===================================================================== */

/* O ROSTO E O NOME. Dez pessoas fictícias, cinco homens e cinco mulheres. As faces
   são geradas no painel (Estúdio IA > Contadores) e chegam em RF_CONTADORES pela
   mesma busca das fotos (ver net/dados.js). A chave c1..c10 liga as duas pontas:
   o nome mora aqui E no painel (CONTADORES em admin.js) — mudar um exige o outro.

   SORTEADO POR SAVE, NÃO POR CLUBE. Na primeira vez que o contador aparece, o save
   sorteia um dos dez e guarda em S.contador; dali em diante é sempre ele, mesmo se
   o treinador trocar de clube (é o contador DO USUÁRIO, que o acompanha). Sem face
   gerada, aparecem as iniciais. */
const RF_CT_POOL=[
  ['c1','Arlindo Mesquita',0], ['c2','Célia Brandão',1],    ['c3','Nivaldo Peixoto',0],
  ['c4','Dirce Albuquerque',1],['c5','Osmar Tavares',0],    ['c6','Rosângela Pires',1],
  ['c7','Wanderley Couto',0],  ['c8','Marlene Viana',1],    ['c9','Joaquim Serrano',0],
  ['c10','Ivone Cardoso',1]
];
function rfCtChave(){
  if(!S) return RF_CT_POOL[0][0];
  if(!S.contador || !RF_CT_POOL.some(e=>e[0]===S.contador))
    S.contador=RF_CT_POOL[Math.floor(Math.random()*RF_CT_POOL.length)][0];   // grava junto no próximo save()
  return S.contador;
}
function rfCtPessoa(){
  const chave=rfCtChave();
  const [, nome, fem]=RF_CT_POOL.find(e=>e[0]===chave)||RF_CT_POOL[0];
  const partes=nome.split(' ');
  return { chave, nome, fem:!!fem, cargo:fem?'Contadora':'Contador',
    ini:(partes[0][0]+(partes[partes.length-1][0]||'')).toUpperCase(),
    foto:((typeof window!=='undefined' && window.RF_CONTADORES)||{})[chave]||null };
}
function rfCtRostoHTML(p){
  return `<span class="rf-ct-rosto" aria-hidden="true">${escC(p.ini)}
    ${p.foto?`<img src="${escC(p.foto)}" alt="" onerror="this.remove()">`:''}</span>`;
}

/* ---------- A CONTA ----------
   o = { taxa:  dinheiro que sai AGORA (taxa, lance, obra);
         salario: quanto a folha SOBE por rodada (salário novo, ou a diferença
                  da renovação) }
   Devolve os números e o nível: 'ok' | 'atencao' | 'perigo'. */
function rfCtFolha(){
  return squad(CL.clubId).reduce((t,p)=>t+((p.contract&&p.contract.salary)||p.salary||0),0);
}
function rfCtConta(o){
  o=o||{};
  const taxa=Math.max(0,Math.round(o.taxa||0));
  const salario=Math.round(o.salario||0);
  const cl=clubOf(CL.clubId)||{};
  const med=(typeof divOverallAvgOf==='function')?divOverallAvgOf(S.division):undefined;
  const partes=REBAL.receitaPartes(cl.overall, med);
  const total=((S.sched||[]).length)||38;
  const faltam=Math.max(0, total-(S.round||0));
  const tv=partes.tvFixa+partes.tvMerito;
  /* bilheteria média por rodada: metade das rodadas é em casa. attendanceFor com
     sorteio neutro (0,5) — é a mesma fórmula que o jogo usa no dia do jogo. */
  let bilheteria=0;
  try{ const a=attendanceFor(CL.clubId, ()=>0.5); bilheteria=Math.round(a.att*a.price/2); }catch(e){}
  const opex=Math.round(partes.total*REBAL.OPEX);
  const folha=rfCtFolha(), folhaNova=folha+salario;
  /* o patrocínio do ano ainda não pago (antes da 1ª rodada) é dinheiro que VAI
     entrar — mesma trava de patrocinioRodadasAPagar, sem carimbar nada */
  const patroPendente=(S._patroAno_eu!==S.season)?partes.patrocinio*faltam:0;
  const ritmoAntes=Math.round(tv+bilheteria-folha-opex);
  const ritmo=Math.round(tv+bilheteria-folhaNova-opex);
  const caixa=S.budget||0;
  const caixaDepois=caixa-taxa;
  const fimAno=Math.round(caixaDepois+patroPendente+ritmo*faltam);
  let viraEm=null;
  if(ritmo<0 && caixaDepois+patroPendente>0) viraEm=Math.floor((caixaDepois+patroPendente)/(-ritmo))+1;
  if(viraEm!=null && viraEm>faltam) viraEm=null;               // não vira dentro da temporada
  const nivel=(caixaDepois<0 || fimAno<0) ? 'perigo' : (ritmo<0 ? 'atencao' : 'ok');
  return { taxa, salario, caixa, caixaDepois, tv, bilheteria, opex, folha, folhaNova,
    ritmoAntes, ritmo, faltam, fimAno, viraEm, patroPendente, patroAno:partes.patrocinio*total,
    nivel, decisao:!!(taxa||salario) };
}

/* ---------- AS FALAS ----------
   Várias por nível para não repetir sempre a mesma frase. A escolha é pela
   temporada + rodada + contexto, e não por Math.random: a tela redesenha a cada
   tecla (cdraw), e uma fala que trocasse a cada redesenho seria ruído. */
function rfCtEscolher(lista, ctx){
  return lista[hashC(String(S.season)+'|'+String(S.round)+'|'+(ctx||''))%lista.length];
}
function rfCtFalaDecisao(r, ctx){
  const D=rfDin;
  if(r.nivel==='perigo'){
    if(r.caixaDepois<0) return `Não temos ${D(r.taxa)} em caixa. Isso já nasce no vermelho: ${D(r.caixaDepois)}.`;
    return rfCtEscolher([
      `Se isso passar, fechamos a temporada com ${D(r.fimAno)}. Não tenho de onde tirar a folha até lá.`,
      `Com ${D(r.taxa)} saindo agora e a folha subindo, o caixa não aguenta: o ano termina em ${D(r.fimAno)}.`,
      `Eu assino se o senhor mandar — mas isso nos deixa ${D(r.fimAno)} no vermelho no fim da temporada.`,
      `A conta não fecha. ${r.viraEm?`Em ${r.viraEm} rodada${r.viraEm===1?'':'s'} o caixa zera`:'O caixa zera antes do fim do ano'} e daí em diante é dívida.`,
      `Se isso passar, fechamos com ${D(r.fimAno)}. E aqui dentro dívida pesa tanto quanto derrota — já vi treinador perder o cargo por menos.`,
      `Eu cuido das contas, o senhor cuida do time. Mas se o clube afundar e a diretoria perder a paciência, o mercado lembra: quem sai devendo só recebe convite de clube menor.`
    ], 'p'+ctx);
  }
  if(r.nivel==='atencao'){
    return rfCtEscolher([
      `Dá para pagar, mas a folha passa a custar mais do que TV e bilheteria rendem: perdemos ${D(-r.ritmo)} por rodada.`,
      `Cabe hoje, não cabe amanhã. Com essa folha o caixa encolhe ${D(-r.ritmo)} a cada rodada${r.viraEm?` e zera em ${r.viraEm}`:''}.`,
      `Fechamos o ano no azul (${D(r.fimAno)}), mas só porque o caixa está cheio. Sem vitórias e prêmios, cada rodada tira ${D(-r.ritmo)}.`
    ], 'a'+ctx);
  }
  return rfCtEscolher([
    `Cabe no orçamento. Pela minha conta terminamos a temporada com ${D(r.fimAno)}.`,
    `Pode ir. Mesmo com o gasto novo, sobram ${D(r.ritmo)} por rodada depois da folha.`,
    `Sem susto: a folha continua abaixo do que entra de TV e bilheteria. Fim do ano em ${D(r.fimAno)}.`
  ], 'o'+ctx);
}
/* a fala de TODO DIA, na página de Finanças — sem decisão em jogo */
function rfCtFalaHoje(r){
  const D=rfDin;
  if(r.caixa<0){
    const base=Math.max(1, r.tv*2);                 // receita-base ≈ TV (metade) x 2
    const rodadas=Math.round(-r.caixa/base);
    if(rodadas>=6) return rfCtEscolher([
      `A dívida já passa de ${rodadas} rodadas de receita. Nesse tamanho, nem liderar o campeonato acalma a diretoria — preciso que o senhor venda alguém.`,
      `Vou ser franco: com ${D(r.caixa)} de buraco, o seu nome já aparece nas reuniões da diretoria. Um salário alto a menos muda essa conversa.`
    ], 'hg');
    return rfCtEscolher([
      `Estamos ${D(r.caixa)} no vermelho, e a diretoria já perguntou por isso esta semana. Resultado segura o cargo, mas conta no vermelho vai minando a paciência deles.`,
      `O caixa está negativo (${D(r.caixa)}). Enquanto não entrar dinheiro, nada de reforço — e cada rodada assim pesa na sua avaliação lá em cima.`,
      `Não gosto de trazer isso, mas preciso: com o clube devendo, se a coisa desandar, as portas que se abrem depois são de clubes menores. Vender um salário alto é o jeito mais rápido de respirar.`
    ], 'hv');
  }
  if(r.fimAno<0) return rfCtEscolher([
    `No ritmo de hoje fechamos o ano em ${D(r.fimAno)}. A diretoria ainda não reclamou, mas já pediu a projeção — e ela não está bonita.`,
    `A folha está pesada demais: ${r.viraEm?`em ${r.viraEm} rodadas`:'antes do fim do ano'} o caixa zera. Melhor resolver antes que a diretoria comece a perguntar.`
  ], 'hp');
  if(r.ritmo<0) return rfCtEscolher([
    `A folha já passa do que TV e bilheteria rendem: perdemos ${D(-r.ritmo)} por rodada. Os prêmios de fim de ano não podem ser o plano.`,
    `Estamos vivendo do caixa: cada rodada tira ${D(-r.ritmo)}. Fechamos no azul, mas sem folga para reforço caro.`
  ], 'ha');
  return rfCtEscolher([
    `Contas em ordem. No ritmo atual terminamos a temporada com ${D(r.fimAno)}.`,
    `Sobram ${D(r.ritmo)} por rodada depois de folha e custos. É esse o espaço que temos para um salário novo.`,
    `Tudo sob controle. A folha usa ${Math.round(r.folha/Math.max(1,r.tv+r.bilheteria)*100)}% do que entra de TV e bilheteria.`,
    `Com as contas no azul, a diretoria só olha para a tabela. É um sossego que vale a pena manter.`
  ], 'ho');
}
/* o lembrete do patrocínio: aparece nas primeiras rodadas, que é quando o
   caixa cheio engana e a 1ª janela está aberta */
function rfCtDicaHoje(r){
  if(r.caixa<0) return 'Aqui dentro, conta no vermelho pesa na avaliação do treinador junto com a tabela — quanto maior a dívida, mais pesa.';
  if(r.fimAno<0) return 'A diretoria acompanha a projeção do ano. Fechar no vermelho começa a pesar na sua cadeira antes mesmo de o caixa virar.';
  if(r.patroPendente>0) return `O patrocínio do ano (${rfDin(r.patroPendente)}) entra na 1ª rodada — já está nesta conta.`;
  if((S.round||0)<10 && r.patroAno>0) return `O patrocínio do ano já entrou (${rfDin(r.patroAno)}). Não é sobra: é o que segura a folha até o fim da temporada.`;
  return 'Prêmios de vitória e de fim de temporada ficam fora da conta — quando vierem, são lucro.';
}

/* ---------- AS PEÇAS ---------- */
function rfCtNumHTML(rotulo, valor, tom, sub){
  return `<span class="rf-ct-num"><span class="rf-ct-num-l">${escC(rotulo)}</span>
    <span class="rf-ct-num-v ${tom||''}">${escC(valor)}</span>${sub?`<span class="rf-ct-num-s">${escC(sub)}</span>`:''}</span>`;
}
function rfCtTom(v){ return v<0?'ruim':'ok'; }
function rfCtCartaoHTML(r, fala, modo){
  const p=rfCtPessoa();
  const cl=clubOf(CL.clubId)||{};
  const nums = modo==='painel'
    /* O RESUMO DA RODADA EM TRES LINHAS — o que entra, o que sai e o que sobra — e depois as
       duas fotografias do caixa: hoje e no fim do ano. Cada cartao diz de onde vem o numero. */
    ? rfCtNumHTML('Receita por rodada', rfDin(r.tv+r.bilheteria), 'ok',
        'TV '+rfDin(r.tv)+' · bilheteria '+rfDin(r.bilheteria))
      + rfCtNumHTML('Despesas por rodada', rfDin(r.folha+r.opex), 'despesa',
        'folha '+rfDin(r.folha)+' · custos '+rfDin(r.opex))
      + rfCtNumHTML('Saldo por rodada', (r.ritmo>=0?'+':'')+rfDin(r.ritmo), r.ritmo<0?'ruim':'ok',
        'despesas = '+Math.round((r.folha+r.opex)/Math.max(1,r.tv+r.bilheteria)*100)+'% da receita')
      + rfCtNumHTML('Caixa hoje', rfDin(r.caixa), rfCtTom(r.caixa),
        r.patroPendente>0 ? 'patrocínio a receber '+rfDin(r.patroPendente) : 'o que há hoje na conta')
      + rfCtNumHTML('Fim da temporada', rfDin(r.fimAno), rfCtTom(r.fimAno),
        r.faltam ? 'em '+r.faltam+' rodada'+(r.faltam===1?'':'s')+', sem prêmios' : 'temporada encerrada')
    : rfCtNumHTML('Caixa depois', rfDin(r.caixaDepois), rfCtTom(r.caixaDepois))
      + rfCtNumHTML('Por rodada', (r.ritmo>=0?'+':'')+rfDin(r.ritmo), r.ritmo<0?'aviso':'ok')
      + rfCtNumHTML('Fim da temporada', rfDin(r.fimAno), rfCtTom(r.fimAno));
  return `<div class="rf-ct ${r.nivel} ${modo||''}">
    ${rfCtRostoHTML(p)}
    <div class="rf-ct-txt">
      <span class="rf-ct-quem">${escC(p.nome)} · <i>${p.cargo} do ${escC(cl.short||'clube')}</i></span>
      <span class="rf-ct-fala">“${fala}”</span>
      <div class="rf-ct-nums">${nums}</div>
      ${modo==='painel'?`<span class="rf-ct-dica">${rfCtDicaHoje(r)}</span>`:''}
    </div>
  </div>`;
}
/* dentro dos diálogos de decisão */
function rfCtDialogoHTML(o){
  try{
    const r=rfCtConta(o);
    return rfCtCartaoHTML(r, rfCtFalaDecisao(r, (o&&o.ctx)||''), 'dialogo');
  }catch(e){ return ''; }   // o contador nunca pode derrubar o diálogo de compra
}
/* fixo no topo de Finanças */
function rfCtPainelHTML(){
  try{
    const r=rfCtConta({});
    return rfCtCartaoHTML(r, rfCtFalaHoje(r), 'painel');
  }catch(e){ return ''; }
}

/* ---------- O DIÁLOGO QUE SEGURA A DECISÃO ----------
   rfCtSegurar({taxa, salario, chave, volta, guardar}) — chamado pelo handler que
   GASTA (rfMkFinalizar, rfMkLanceGo, rfEstConstruirGo) antes de ir ao motor.
   Devolve true quando abriu o aviso (o handler para ali). "Seguir mesmo assim"
   libera a MESMA chave uma vez e chama o handler de novo (`volta`, nome de
   função global); `guardar` devolve um valor que só existia no campo do
   diálogo anterior (o lance). */
function rfCtSegurar(o){
  if(CL._ctLiberado && CL._ctLiberado===o.chave){ CL._ctLiberado=null; return false; }
  let r=null; try{ r=rfCtConta(o); }catch(e){ return false; }
  if(r.nivel!=='perigo') return false;
  const prev=CL.acao;
  rfAcAbrir('ct-confirmar', { o, prev });
  return true;
}
function rfCtVoltar(){
  const d=rfAcD();
  CL.acao=d.prev||null; cdraw();
}
function rfCtSeguirMesmoAssim(){
  const d=rfAcD(); const o=d.o||{};
  CL._ctLiberado=o.chave;
  if(o.guardar!=null) CL._ctValor=o.guardar;
  CL.acao=d.prev||null;
  const fn=window[o.volta];
  if(typeof fn==='function') fn(); else cdraw();
}
RF_ACOES['ct-confirmar']=d=>{
  const o=d.o||{};
  const r=rfCtConta(o);
  const p=rfCtPessoa();
  return rfAcao({ kicker:'FINANÇAS · '+(p.fem?'A CONTADORA':'O CONTADOR')+' AVISA',
    titulo:'Isto vai endividar o clube', w:540,
    corpo:
      rfCtCartaoHTML(r, rfCtFalaDecisao(r, 'confirmar'), 'dialogo')
      + rfAcLinhaHTML('Caixa hoje', rfDin(r.caixa), '', true)
      + (r.taxa?rfAcLinhaHTML(o.rotuloTaxa||'Sai agora', '−'+rfDin(r.taxa), 'ruim'):'')
      + (r.salario?rfAcLinhaHTML('Folha a mais por rodada', '+'+rfDin(r.salario), 'aviso'):'')
      + rfAcLinhaHTML('Rodadas até o fim da temporada', String(r.faltam), '')
      + rfAcLinhaHTML('Caixa no fim da temporada', rfDin(r.fimAno), 'ruim')
      + rfAcNotaHTML('Não vou impedir — a decisão é sua. Só lembro três coisas: com o caixa negativo não entra reforço nem obra, a diretoria passa a cobrar as contas junto com os resultados, e prêmio nenhum está garantido para tapar o buraco.'),
    acoes:[{l:'Voltar e rever',tom:'fantasma',on:'rfCtVoltar()'},
           {l:'Seguir mesmo assim',tom:'perigo',on:'rfCtSeguirMesmoAssim()'}],
    fechar:'rfCtVoltar()' });
};
