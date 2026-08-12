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
