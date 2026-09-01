/* ===================================================================
   UNIVERSOS — que países são jogáveis e quais divisões cada um tem.
   -------------------------------------------------------------------
   Isto era um `const` no meio do core.js. Saiu para cá porque o PAINEL também
   precisa da lista (para o editor perguntar em que país e em que divisão um
   clube novo entra), e o painel não carrega o core.js. Copiar a lista para lá
   criaria duas versões da mesma regra — exatamente o que world-rules.js
   descreve como a causa dos bugs de calendário.

   Consumido por engine/core.js (window.UNIVERSOS), por admin/admin.js e — desde que o
   resolve-round deixou de ter a pirâmide brasileira congelada — pelo SERVIDOR, por injeção
   (scripts/sync-world-rules.mjs). É por isso que o arquivo passou a atribuir em `globalThis` e
   não em `window`: no Deno da edge function `window` não existe, e no navegador
   `globalThis === window`, então nada muda para quem já lia.

   Regra de ouro: dado, não algoritmo. Nada de S, CL ou DOM aqui.
   =================================================================== */
(function(root){
'use strict';
root.UNIVERSOS = {
  brasil:    { order:['A','B','C','D'], size:{A:20,B:20,C:20,D:20}, promo:{A:0,B:4,C:4,D:4}, releg:{A:4,B:4,C:4,D:0},
               label:{A:'Série A',B:'Série B',C:'Série C',D:'Série D'}, nat:['Brasil','Brazil'], foreignMax:8 },
  Inglaterra:{ order:['PL','CH'], size:{PL:20,CH:24}, promo:{PL:0,CH:3}, releg:{PL:3,CH:0},
               label:{PL:'Premier League',CH:'Championship'}, lg:{PL:'ENG-1',CH:'ENG-2'}, country:'Inglaterra',
               nat:['England','Wales','Scotland','Northern Ireland'], foreignMax:22 },
  Espanha:   { order:['ES','ES2'], size:{ES:20,ES2:18}, promo:{ES:0,ES2:3}, releg:{ES:3,ES2:0},
               label:{ES:'La Liga',ES2:'La Liga 2'}, lg:{ES:'ESP-1',ES2:'ESP-2'}, country:'Espanha',
               nat:['Spain'], foreignMax:15 },
  'Itália':  { order:['IT','IT2'], size:{IT:20,IT2:18}, promo:{IT:0,IT2:3}, releg:{IT:3,IT2:0},
               label:{IT:'Serie A',IT2:'Serie B'}, lg:{IT:'ITA-1',IT2:'ITA-2'}, country:'Itália',
               nat:['Italy'], foreignMax:16 },
  Alemanha:  { order:['DE','DE2'], size:{DE:18,DE2:18}, promo:{DE:0,DE2:3}, releg:{DE:3,DE2:0},
               label:{DE:'Bundesliga',DE2:'2. Bundesliga'}, lg:{DE:'GER-1',DE2:'GER-2'}, country:'Alemanha',
               nat:['Germany'], foreignMax:17 },
  Portugal:  { order:['PT','PT2'], size:{PT:18,PT2:18}, promo:{PT:0,PT2:3}, releg:{PT:3,PT2:0},
               label:{PT:'Primeira Liga',PT2:'Liga Portugal 2'}, lg:{PT:'POR-1',PT2:'POR-2'}, country:'Portugal',
               nat:['Portugal'], foreignMax:18 },
  /* CONMEBOL: divisão ÚNICA (só 1ª divisão real, sem pirâmide -> sem acesso/rebaixamento);
     clubes reais em window.CONMEBOL_LEAGUES (src:'conmebol'). Classificam pra Libertadores/
     Sul-Americana. size = nº real de clubes raspados (Argentina cortada em 20 p/ temporada padrão). */
  Argentina: { order:['ARG'], size:{ARG:30}, promo:{ARG:0}, releg:{ARG:0}, label:{ARG:'Liga Profesional'}, lg:{ARG:'ARG-1'}, country:'Argentina', nat:['Argentina'], foreignMax:6, src:'conmebol' },
  Uruguai:   { order:['URU'], size:{URU:16}, promo:{URU:0}, releg:{URU:0}, label:{URU:'Primera División'}, lg:{URU:'URU-1'}, country:'Uruguai', nat:['Uruguay'], foreignMax:6, src:'conmebol' },
  'Colômbia':{ order:['COL'], size:{COL:20}, promo:{COL:0}, releg:{COL:0}, label:{COL:'Categoría Primera A'}, lg:{COL:'COL-1'}, country:'Colômbia', nat:['Colombia'], foreignMax:5, src:'conmebol' },
  Chile:     { order:['CHI'], size:{CHI:16}, promo:{CHI:0}, releg:{CHI:0}, label:{CHI:'Primera División'}, lg:{CHI:'CHI-1'}, country:'Chile', nat:['Chile'], foreignMax:6, src:'conmebol' },
  Peru:      { order:['PER'], size:{PER:18}, promo:{PER:0}, releg:{PER:0}, label:{PER:'Liga 1'}, lg:{PER:'PER-1'}, country:'Peru', nat:['Peru'], foreignMax:5, src:'conmebol' },
  Equador:   { order:['ECU'], size:{ECU:16}, promo:{ECU:0}, releg:{ECU:0}, label:{ECU:'LigaPro Serie A'}, lg:{ECU:'ECU-1'}, country:'Equador', nat:['Ecuador'], foreignMax:5, src:'conmebol' },
  Paraguai:  { order:['PAR'], size:{PAR:12},  promo:{PAR:0}, releg:{PAR:0}, label:{PAR:'División Profesional'}, lg:{PAR:'PAR-1'}, country:'Paraguai', nat:['Paraguay'], foreignMax:6, src:'conmebol' },
  Venezuela: { order:['VEN'], size:{VEN:14}, promo:{VEN:0}, releg:{VEN:0}, label:{VEN:'Liga FUTVE'}, lg:{VEN:'VEN-1'}, country:'Venezuela', nat:['Venezuela'], foreignMax:6, src:'conmebol' },
  'Bolívia': { order:['BOL'], size:{BOL:16}, promo:{BOL:0}, releg:{BOL:0}, label:{BOL:'División Profesional'}, lg:{BOL:'BOL-1'}, country:'Bolívia', nat:['Bolivia'], foreignMax:6, src:'conmebol' },
};

/* código ISO da bandeira de cada universo (UNIVERSOS só guarda o nome do país) */
/* ===== SO' O BRASIL, POR ENQUANTO =====
   Os 1.900 jogadores brasileiros ja' jogam com nome ficticio (o pacote oficial renomeia no boot).
   Os 9.832 estrangeiros ainda nao: Arsenal, River Plate e companhia chegam ao jogo com os nomes
   REAIS que vieram do bundle. Enquanto for assim, os outros paises ficam fora de alcance.

   E' UM INTERRUPTOR SO', E ELE PRECISA DE DUAS FECHADURAS. Esconder os paises no assistente NAO
   basta: o mercado le a lista dele direto dos bundles (foreignMarketCountries, core.js), sem
   consultar o que foi escolhido -- medido, com CL.countries=['Brasil'] o filtro continuava a
   oferecer os 15 paises e o Arsenal vinha com "Declan Rice". Por isso a trava e' lida nos dois
   sitios: COUNTRY_LIST (quem se pode escolher) e foreignMarketCountries (de quem se pode
   contratar).

   O BRASIL CONTINUA NO MERCADO. `foreignClubsOf('Brasil')` devolve a Serie A, que e' a prateleira
   de quem joga nas divisoes de baixo -- e esses nomes JA' sao ficticios. Travar isso nao protegia
   nada e tirava uma funcionalidade boa.

   PARA RELIGAR: `false`. Nada mais. Os bundles nunca foram tocados, entao os paises voltam
   inteiros -- e devem voltar no dia em que os nomes ficticios dos estrangeiros existirem. */
root.RF_SO_BRASIL = true;

root.UNIVERSO_BANDEIRA = {brasil:'br',Inglaterra:'gb-eng',Espanha:'es','Itália':'it',Alemanha:'de',Portugal:'pt',
  Argentina:'ar',Uruguai:'uy','Colômbia':'co',Chile:'cl',Peru:'pe',Equador:'ec',Paraguai:'py',Venezuela:'ve','Bolívia':'bo'};

if(typeof module!=='undefined' && module.exports){ module.exports={ UNIVERSOS:root.UNIVERSOS, UNIVERSO_BANDEIRA:root.UNIVERSO_BANDEIRA }; }
})(typeof globalThis!=='undefined'?globalThis:this);
