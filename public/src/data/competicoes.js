/* ===================================================================
   COMPETIÇÕES DO JOGO — nome, apelido e formato de cada uma.
   -------------------------------------------------------------------
   Era um `const` no meio do core.js. Saiu para cá pelo mesmo motivo de
   universos.js: o PAINEL precisa da lista (o editor mostra e ajusta as
   competições e o calendário delas) e não carrega o core.js. Manter uma
   segunda cópia lá seria duas versões da mesma regra.

   As DATAS não moram aqui: o calendário é engine/world-rules.js, que é
   injetado byte a byte dentro da edge function resolve-round. Aqui é só
   a identidade de cada competição.
   =================================================================== */
window.COMPETICOES = {
  serieA:{id:'serieA',name:'Brasileirão Série A',short:'Série A',type:'liga'},
  copaBrasil:{id:'copaBrasil',name:'Copa do Brasil',short:'Copa do Brasil',type:'mata-mata'},
  libertadores:{id:'libertadores',name:'Copa Libertadores',short:'Libertadores',type:'mata-mata'},
  sulamericana:{id:'sulamericana',name:'Copa Sul-Americana',short:'Sul-Americana',type:'mata-mata'},
  championsLeague:{id:'championsLeague',name:'UEFA Champions League',short:'Champions League',type:'mata-mata'},
  europaLeague:{id:'europaLeague',name:'UEFA Europa League',short:'Europa League',type:'mata-mata'}
};

/* ===================================================================
   A CHAVE DE COMPETIÇÃO DE UMA DIVISÃO — onde o nome e a taça se penduram.
   -------------------------------------------------------------------
   O motor já escolhia esta chave (divisionCompKeyFor, engine/core.js) para gravar
   o título na carreira do treinador. Ela saiu de lá pelo MESMO motivo que esta
   lista saiu do core: o PAINEL precisa dela para saber em que chave gravar o nome
   e a arte de cada divisão de cada país, e o painel não carrega o core.js.
   Duas cópias da regra e o painel gravaria a taça numa chave que o jogo nunca lê.

   Brasil mantém as chaves de sempre (serieA/B/C/D — as mesmas de trophies.js);
   Inglaterra/PL casa com a arte de Premier League; o resto vira
   'liga:<universo>:<divisão>'.

   `base` é o que faz o gêmeo feminino (brasilFem) cair nas chaves do Brasil:
   é o mesmo campeonato, com as mesmas taças, jogado por outras pessoas.
   =================================================================== */
window.COMP_CHAVE_DIVISAO = function(uni, div){
  var U = window.UNIVERSOS || {};
  var base = (U[uni] && U[uni].base) || uni;
  if(base === 'brasil') return ({A:'serieA',B:'serieB',C:'serieC',D:'serieD'})[div] || ('liga:brasil:'+div);
  if(uni === 'Inglaterra' && div === 'PL') return 'premier';
  return 'liga:'+uni+':'+div;
};
