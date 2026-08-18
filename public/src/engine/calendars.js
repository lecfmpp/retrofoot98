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

   A JANELA É O DESEMPATE QUE FALTAVA. A ordenação era por data justamente porque a final da Copa
   do Brasil é 06/12 e o último jogo da liga é 03/12: mesma semana, e a final vem depois. Com
   slots isso é explícito — a final ocupa um slot PRÓPRIO, depois do último slot de liga.

   O QUE MUDA PARA QUEM JOGA. No calendário antigo havia 11 semanas com mais de uma copa, três
   delas com as três juntas — e metade da temporada sem copa nenhuma. Aqui cada copa tem a sua
   janela e nenhuma semana tem duas copas. As finais acontecem depois do fim da liga, como na
   vida real, em vez de serem espremidas para dentro dela.

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

  const CALENDARIOS={};

  /* ---------------- BRASIL ----------------
     Liga aos fins de semana, 38 rodadas nos slots 1..38. As três copas em janelas de meio de
     semana, espaçadas, e nenhuma dividindo slot com outra: Libertadores na MIDWEEK_1;
     Sul-Americana e Copa do Brasil dividem a MIDWEEK_2, em slots disjuntos.
     Os slots 39 a 42 não têm liga — existem para as finais acontecerem DEPOIS de o Brasileirão
     acabar, que é o que a vida real faz e o que o calendário antigo não conseguia representar sem
     espremer a final para trás ou perdê-la. */
  CALENDARIOS.brasil={
    pais:'brasil', slotsTotal:42, inicio:[2026,2,1],
    competicoes:{
      liga:        { janela:'WEEKEND',   slots:serie(1,38) },
      libertadores:{ janela:'MIDWEEK_1', slots:[2,5,8,11,14,17,20,24,28,32,36,40] },
      sulamericana:{ janela:'MIDWEEK_2', slots:[3,6,9,12,15,18,21,25,29,33,37,41] },
      copaBrasil:  { janela:'MIDWEEK_2', slots:[4,10,16,23,30,35,42] },
    },
    /* datas reais dos jogos de liga, na ordem dos slots — RÓTULO, não ordenação. As de copa são
       derivadas: a MIDWEEK_1 cai 4 dias antes do jogo de liga daquele slot e a MIDWEEK_2, 3. */
    datasLiga:['03-01','03-07','03-30','04-10','04-16','05-06','05-11','05-15','06-01','06-07',
               '06-11','06-22','07-05','07-11','07-22','07-25','08-05','08-18','08-23','08-30',
               '09-14','09-20','09-24','09-28','10-01','10-05','10-10','10-18','10-21','10-24',
               '10-27','10-30','11-03','11-07','11-11','11-18','12-01','12-03'],
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
      liga:           { janela:'WEEKEND',   slots:serie(1,46) },
      championsLeague:{ janela:'MIDWEEK_1', slots:[2,5,8,11,14,17,20,25,30,35,40,48] },
      europaLeague:   { janela:'MIDWEEK_2', slots:[3,6,9,12,15,18,21,26,31,36,41,49] },
    },
    datasLiga:null,          // sem folha de datas reais: os rótulos saem do passo semanal
  };

  function calendarioDe(pais){ return CALENDARIOS[pais] || CALENDARIOS.brasil; }
  function temCalendario(pais){ return !!CALENDARIOS[pais]; }
  function paisesComCalendario(){ return Object.keys(CALENDARIOS); }

  const API={ JANELAS, ordemDaJanela, chaveDoDia, CALENDARIOS, calendarioDe, temCalendario,
    paisesComCalendario };
  root.CALENDARIOS_API=API;
  if(typeof module!=='undefined' && module.exports){ module.exports=API; }
})(typeof globalThis!=='undefined'?globalThis:this);
