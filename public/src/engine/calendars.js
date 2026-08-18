/* ===================================================================
   CALENDÁRIOS POR PAÍS — a folha de SLOTS.

   POR QUE ISTO EXISTE. O calendário era uma tabela de datas reais (CAL_2026, em world-rules.js) e
   a temporada era montada a partir dela. Isso produziu o pior bug do jogo: existiam DUAS
   coordenadas — a jornada, que a ancoragem espremia para caber na temporada, e a data, que vinha
   da folha e não se movia junto. O plano de dias era ordenado por data, então a FINAL, que não
   tem data na folha e herdava um dia sintético, era marcada ANTES da própria semifinal. Medido
   nas três salas com day_plan de agosto/2026.

   AQUI SÓ EXISTE UMA COORDENADA: `(slot, janela)`.
     · SLOT é a semana da temporada, 1..slotsTotal.
     · JANELA é o momento dentro da semana: MIDWEEK_1 (ter/qua), MIDWEEK_2 (qui), WEEKEND.
   A ordem da temporada é `slot` e, dentro dele, a ordem das janelas. A DATA passou a ser
   RÓTULO derivado — ela aparece na tela e não decide nada. Duas coordenadas não podem discordar
   quando só existe uma.

   A JANELA É O DESEMPATE QUE FALTAVA. A ordenação era por data justamente porque duas
   competições caem na mesma semana e é preciso saber qual joga primeiro. Com slots isso é
   explícito — a final ocupa um slot PRÓPRIO, e a ordem dentro da semana é a das janelas.

   O QUE MUDA PARA QUEM JOGA. No calendário antigo havia 11 semanas com mais de uma copa, três
   delas com as três juntas — e metade da temporada sem copa nenhuma. Aqui cada copa tem a sua
   janela e nenhuma semana tem duas copas.

   ONDE MORAM AS FINAIS (regra do dono do jogo, 18/08/2026). Cada final tem a sua semana, sem
   jogo de liga, e todas elas vêm ANTES da última rodada do campeonato — que fecha a temporada.
   A folha chegou a pôr as finais DEPOIS do fim da liga, por ser o que a vida real faz; o efeito
   dentro do jogo era o oposto do pretendido: o campeonato acabava na rodada 38, a temporada
   dava-se por encerrada, e as três decisões viravam dias soltos no fim que o jogador atravessava
   sem as ver. Duas ou três semanas sem campeonato não incomodam ninguém; uma final que não
   acontece, incomoda.

   COMO ACRESCENTAR UM PAÍS: copiar um bloco e trocar os slots. Não há regra a mexer — é dado.
   `scripts/teste-calendario.mjs` confere as invariantes de todos os países declarados aqui.

   Regra de ouro (a mesma do world-rules.js): dado, não algoritmo. Nada de S, CL ou DOM.
   Injetada no resolve-round por scripts/sync-world-rules.mjs.
   =================================================================== */
(function(root){
  'use strict';

  /* A ordem das janelas DENTRO de um slot. É esta lista que resolve o caso da final da Copa do
     Brasil, e é por ela que o plano de dias é ordenado. */
  const JANELAS=['MIDWEEK_1','MIDWEEK_2','WEEKEND'];
  function ordemDaJanela(j){ const i=JANELAS.indexOf(j); return i<0 ? JANELAS.length : i; }
  /* chave ordenável de um dia — estritamente monótona, e a ÚNICA usada para ordenar */
  function chaveDoDia(slot, janela){ return (slot|0)*JANELAS.length + ordemDaJanela(janela); }

  function serie(de, ate){ const a=[]; for(let i=de;i<=ate;i++) a.push(i); return a; }

  /* ===================== O EIXO É DO MUNDO, NÃO DE UM PAÍS =====================
     O slot 40 tem de ser a MESMA semana para toda a gente. É isso que permite uma sala com
     brasileiro e inglês andar junta — e é isso que vai permitir, mais à frente, uma competição
     MUNDIAL (um Mundial de Clubes) em que clubes de países diferentes se enfrentam: ela ocupa um
     slot do mundo, e os dois calendários nacionais já sabem que aquela semana está tomada.

     Duas condições, e as duas são verificadas (validarCalendario):
       · todo país começa a temporada no MESMO dia (`inicio`) — se um começasse uma semana depois,
         o slot 40 dele seria outra semana e a fila da sala juntaria dias que não são simultâneos;
       · nenhum país passa de SLOTS_DO_MUNDO — é o tamanho do ano, e o teto comum.

     `slotsTotal` de cada país NÃO é o eixo: é onde a temporada daquele país acaba (o Brasil fecha
     na 42, a Inglaterra na 50). O eixo é este: */
  const SLOTS_DO_MUNDO=52;                 // as semanas do ano — o calendário é mundial
  const INICIO_DO_MUNDO=[2026,2,1];        // 1º de março: todo país começa aqui

  const CALENDARIOS={};

  /* ---------------- BRASIL ----------------
     Liga aos fins de semana, 38 rodadas espalhadas pelos 42 slots. As três copas em janelas de
     meio de semana, espaçadas, e nenhuma dividindo slot com outra: Libertadores na MIDWEEK_1;
     Sul-Americana e Copa do Brasil dividem a MIDWEEK_2, em slots disjuntos.

     AS SEMANAS 39, 40 E 41 SÃO AS DAS FINAIS, e não têm jogo de liga. A regra do dono do jogo
     (18/08/2026) é esta: a temporada NÃO acaba na última rodada do Brasileirão com as decisões
     ainda por jogar — as finais entram ANTES dela, e o campeonato fecha o ano no slot 42.
     Antes era o contrário (finais nos slots 40-42, depois do fim da liga) e o efeito para quem
     jogava era o pior possível: a liga acabava na rodada 38, o jogo dava a temporada por
     encerrada e as três finais viravam dias soltos no fim, atropelados pelo botão "Avançar".
     A quarta semana sem liga é a do slot 21 — a parada do meio do ano, que a folha ganha de
     graça por sobrar um slot depois de reservar as três das finais.

     ISTO É O PADRÃO PARA TODO PAÍS: reservar as semanas das decisões ANTES da última rodada da
     liga, mesmo que isso deixe duas ou três semanas sem jogo de campeonato. O salto não faz mal;
     a final não acontecer, faz. */
  CALENDARIOS.brasil={
    pais:'brasil', slotsTotal:42, inicio:[2026,2,1],
    competicoes:{
      liga:        { janela:'WEEKEND',   slots:serie(1,20).concat(serie(22,38), [42]) },
      libertadores:{ janela:'MIDWEEK_1', slots:[2,5,8,11,14,17,20,24,28,32,36,39] },
      sulamericana:{ janela:'MIDWEEK_2', slots:[3,6,9,12,15,18,21,25,29,33,37,40] },
      copaBrasil:  { janela:'MIDWEEK_2', slots:[4,10,16,23,30,35,41] },
    },
    /* datas reais dos jogos de liga, na ordem dos slots — RÓTULO, não ordenação. As de copa são
       derivadas: a MIDWEEK_1 cai 4 dias antes do jogo de liga daquele slot e a MIDWEEK_2, 3.
       A ÚLTIMA data não é a real (03/12): a última rodada do campeonato passou a fechar o ano
       DEPOIS das três finais, e mantê-la a 03/12 punha o rótulo a andar para trás — as finais
       eram datadas a partir do jogo de liga anterior (01/12) e caíam depois do fecho. O valor é o
       passo semanal a partir de 01/12 até ao slot 42, que é onde a rodada agora mora — assim
       nenhuma data derivada das semanas 39-41 ultrapassa a do fecho. A data é rótulo e segue o
       slot; quem manda é a ordem das semanas. */
    datasLiga:['03-01','03-07','03-30','04-10','04-16','05-06','05-11','05-15','06-01','06-07',
               '06-11','06-22','07-05','07-11','07-22','07-25','08-05','08-18','08-23','08-30',
               '09-14','09-20','09-24','09-28','10-01','10-05','10-10','10-18','10-21','10-24',
               '10-27','10-30','11-03','11-07','11-11','11-18','12-01','12-29'],
  };

  /* ---------------- INGLATERRA ----------------
     Existe para provar a forma com uma pirâmide diferente, e porque é o país que o levantamento
     de julho apontou como o mais caro: a Championship tem 24 clubes, logo 46 rodadas, contra as
     38 da Premier League. Com slots isso deixa de ser problema — a lista de slots de liga cobre a
     divisão MAIS LONGA, e quem joga numa divisão mais curta usa apenas os primeiros.
     Sem copa nacional (a FA Cup não existe no motor); Champions e Europa nas janelas de meio de
     semana, como as continentais do Brasil. */
  CALENDARIOS.Inglaterra={
    pais:'Inglaterra', slotsTotal:50, inicio:[2026,2,1],
    competicoes:{
      /* mesmo padrão do Brasil: as semanas 47 e 48 são as das finais, a 49 fica de folga e a
         liga fecha o ano no slot 50. A Premier League, que joga 38 e não 46 rodadas, usa estes
         mesmos slots espalhados (ver slotsDaLiga em world-rules.js) — também ela acaba no 50,
         depois das finais, em vez de terminar no meio da folha. */
      liga:           { janela:'WEEKEND',   slots:serie(1,24).concat(serie(26,46), [50]) },
      championsLeague:{ janela:'MIDWEEK_1', slots:[2,5,8,11,14,17,20,25,30,35,40,47] },
      europaLeague:   { janela:'MIDWEEK_2', slots:[3,6,9,12,15,18,21,26,31,36,41,48] },
    },
    datasLiga:null,          // sem folha de datas reais: os rótulos saem do passo semanal
  };

  /* ===================== O VALIDADOR =====================
     Uma folha de slots é DADO ESCRITO À MÃO, e dado escrito à mão erra. Estas são as regras que,
     se quebradas, produzem os bugs que já aconteceram — cada uma tem um nome e uma história:

       · POUCOS SLOTS: a competição precisa de mais rodadas do que a folha declara. Era assim que
         a final desaparecia — as continentais tinham 10 datas para 11 rodadas, e a que sobrava
         era sempre a última. O motor completa sozinho (slotsDaCompeticao estende), mas isso é
         conserto todo ano em vez de o dado estar certo desde o começo.
       · SLOT REPETIDO ou FORA DE ORDEM: duas rodadas da mesma copa no mesmo dia, ou a final
         antes da semifinal.
       · DIA PARTILHADO: duas competições no mesmo (slot, janela) — a sala inteira em duas telas
         ao mesmo tempo.
       · LIGA CURTA: a folha tem menos slots de liga do que a divisão mais longa do país joga
         (uma Championship de 24 clubes joga 46 rodadas, não 38).
       · FINAL DEPOIS DO FIM DA LIGA: a decisão fica para semanas em que já não há campeonato.
         Não é erro de motor — é escolha de calendário —, mas é a que faz o jogo parecer acabado
         na última rodada da liga, com as finais viradas em dias soltos no fim. A regra da casa
         é a inversa: a final vem ANTES da última rodada da liga, custe duas ou três semanas sem
         campeonato.

     AVISA, NUNCA TRAVA. Uma folha com problema tem de deixar o jogo abrir: travar já transformou
     erro de dado em sala morta (ver prorrogarPorCopasPendentes). Quem chama decide o que fazer
     com a lista — o painel pinta de vermelho, o teste reprova, o motor regista nos relatórios.

     `totais` é quantas rodadas cada competição precisa nesta temporada (cupTotalRounds no core);
     sem ele, a regra dos poucos slots não é verificável e é saltada.
     `divisoes` é o tamanho de cada divisão do país (UNIVERSOS[pais].size); sem ele, idem. */
  function validarCalendario(pais, opts){
    opts=opts||{};
    const cal=CALENDARIOS[pais];
    const out=[];
    const erro=(comp,texto)=>out.push({ nivel:'erro', comp, texto });
    const aviso=(comp,texto)=>out.push({ nivel:'aviso', comp, texto });
    if(!cal){ erro(null, 'não existe folha de calendário para "'+pais+'" — o jogo cai no calendário do Brasil'); return out; }

    const ocupadas={};
    Object.keys(cal.competicoes).forEach(key=>{
      const c=cal.competicoes[key];
      if(!c.slots || !c.slots.length){ erro(key, 'sem slots'); return; }
      if(JANELAS.indexOf(c.janela)<0) erro(key, 'janela desconhecida: "'+c.janela+'"');
      for(let i=1;i<c.slots.length;i++){
        if(c.slots[i]===c.slots[i-1]) erro(key, 'slot '+c.slots[i]+' repetido — duas rodadas no mesmo dia');
        else if(c.slots[i]<c.slots[i-1]) erro(key, 'slots fora de ordem ('+c.slots[i-1]+' depois de '+c.slots[i]+') — a final viria antes da semifinal');
      }
      c.slots.forEach(sl=>{
        if(sl<1 || sl>cal.slotsTotal) erro(key, 'slot '+sl+' fora do intervalo 1..'+cal.slotsTotal);
        const chave=sl+':'+c.janela;
        if(ocupadas[chave]) erro(key, 'divide o dia '+sl+'/'+c.janela+' com '+ocupadas[chave]+' — a sala ficaria em duas telas');
        else ocupadas[chave]=key;
      });
      const total=opts.totais && opts.totais[key];
      if(total && total>c.slots.length)
        erro(key, 'precisa de '+total+' rodadas e a folha declara '+c.slots.length+' slots — faltam '+(total-c.slots.length)+' (o motor completa, mas a folha fica errada)');
    });

    /* O EIXO COMUM. Um país que comece noutro dia, ou que passe do tamanho do ano, quebra a
       simultaneidade da sala: o slot deixaria de ser a mesma semana para toda a gente. */
    if(cal.slotsTotal>SLOTS_DO_MUNDO)
      erro(null, 'a temporada usa '+cal.slotsTotal+' slots e o ano tem '+SLOTS_DO_MUNDO);
    const ini=cal.inicio||INICIO_DO_MUNDO;
    if(ini.join('-')!==INICIO_DO_MUNDO.join('-'))
      erro(null, 'começa em '+ini.join('-')+' e o mundo começa em '+INICIO_DO_MUNDO.join('-')+
                 ' — o slot deixaria de ser a mesma semana para todos');

    const liga=cal.competicoes.liga;
    if(!liga) erro('liga', 'a folha não declara a liga');
    else if(opts.divisoes){
      let maior=0;
      Object.keys(opts.divisoes).forEach(d=>{ const n=2*((opts.divisoes[d]||0)-1); if(n>maior) maior=n; });
      if(maior>liga.slots.length)
        erro('liga', 'a divisão mais longa joga '+maior+' rodadas e a folha declara '+liga.slots.length+' slots de liga');
    }
    if(liga && liga.slots.length){
      const fim=liga.slots[liga.slots.length-1];
      Object.keys(cal.competicoes).forEach(key=>{
        if(key==='liga') return;
        const c=cal.competicoes[key], total=(opts.totais && opts.totais[key]) || c.slots.length;
        const usados=(total<=c.slots.length) ? c.slots.slice(c.slots.length-total) : c.slots;
        const finalEm=usados[usados.length-1];
        if(finalEm>fim) aviso(key, 'a final cai no slot '+finalEm+', depois de a liga já ter acabado no '+fim+
                                   ' — a temporada parece encerrada antes da decisão');
      });
    }
    return out;
  }

  /* ===================== FOLHA VINDA DO PACOTE =====================
     É isto que torna "acrescentar um país" trabalho de tela em vez de código: o painel admin grava
     uma folha em `pack_edits` e o jogo instala-a por cima da que vem no repositório. O servidor lê
     a mesma linha, pelo mesmo caminho — se só o cliente lesse, cliente e servidor jogariam
     calendários diferentes, que é a família de bug que este arquivo inteiro existe para acabar.

     REGRA DE ENTRADA: folha com ERRO não entra. Um calendário torto vindo do banco pode deixar
     uma sala sem final ou com duas competições no mesmo dia, e ninguém repara até dezembro.
     Aviso não bloqueia (é escolha de calendário, não defeito); erro bloqueia e a folha do
     repositório continua a valer. Devolve o que aconteceu, para quem chamou poder registar. */
  function instalarCalendario(pais, folha, opts){
    if(!pais || !folha || !folha.competicoes) return { ok:false, motivo:'folha vazia', problemas:[] };
    const anterior=CALENDARIOS[pais];
    CALENDARIOS[pais]=folha;
    const problemas=validarCalendario(pais, opts||{});
    const erros=problemas.filter(x=>x.nivel==='erro');
    if(erros.length){
      if(anterior) CALENDARIOS[pais]=anterior; else delete CALENDARIOS[pais];
      return { ok:false, motivo:'folha recusada: '+erros.length+' erro(s)', problemas };
    }
    return { ok:true, motivo:anterior?'folha substituída':'país novo', problemas };
  }

  function calendarioDe(pais){ return CALENDARIOS[pais] || CALENDARIOS.brasil; }
  function temCalendario(pais){ return !!CALENDARIOS[pais]; }
  function paisesComCalendario(){ return Object.keys(CALENDARIOS); }

  const API={ JANELAS, ordemDaJanela, chaveDoDia, CALENDARIOS, calendarioDe, temCalendario,
    SLOTS_DO_MUNDO, INICIO_DO_MUNDO,
    paisesComCalendario, validarCalendario, instalarCalendario };
  root.CALENDARIOS_API=API;
  if(typeof module!=='undefined' && module.exports){ module.exports=API; }
})(typeof globalThis!=='undefined'?globalThis:this);
