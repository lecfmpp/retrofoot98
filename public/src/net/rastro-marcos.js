/* ===== RASTRO (Visiflow): MARCOS DO JOGO =====
   O snippet do <head> (index.html) cria window.rastro como fila; o loader s.js chega depois e
   esvazia a fila. Aqui ficam SÓ os avisos de marco — nada disto pode quebrar o jogo: toda
   chamada passa por rfRastro(), que engole qualquer erro e não faz nada sem o snippet.

   Sem dado pessoal: identify leva o id interno da conta (uuid do Supabase), nunca e-mail ou
   nome; as props são curtas (clube, país, divisão, modo).

   O QUE É DETECTADO AQUI, NO cdraw() (ver rfRastroTick, chamado no fim de cada desenho):
   - troca de tela   -> rastro('screen', CL.screen[/aba])
   - primeira_partida  : a rodada de liga do save passa de 0 para 1 na 1ª temporada
   - rodada_10         : a rodada passa de 9 para 10 na 1ª temporada
   - temporada_1_concluida : o histórico do save ganha a 1ª temporada fechada
   Funciona igual no solo, no hotseat e na Resenha porque olha o ESTADO (S), não o caminho que
   o levou até ali. Só conta passos de UMA rodada: carregar um save ou reconectar numa sala
   (newGame + Object.assign do estado do servidor) salta de 0 para N e não dispara nada. */
function rfRastro(){
  try{ if(typeof window!=='undefined' && typeof window.rastro==='function') window.rastro.apply(null, arguments); }catch(e){}
}
/* clube escolhido/sorteado — chamado logo depois do newGame() (solo em clEntrar, Resenha em onlineBeginSeason) */
function rfRastroClube(modo){
  try{
    if(typeof S==='undefined' || !S || typeof CL==='undefined') return;
    let clube=null;
    try{ const c=(typeof clubOf==='function') ? clubOf(CL.clubId) : null; clube=c ? (c.short||c.name||null) : null; }catch(e){}
    rfRastro('track','clube_escolhido',{
      clube: clube || String(CL.clubId),
      pais: CL.playCountry || 'Brasil',
      divisao: S.division || null,
      modo: modo || 'solo'
    });
  }catch(e){}
}
let RF_RASTRO_TELA=null;
let RF_RASTRO_BASE=null;   // {s: o objeto S observado, round, hist}
function rfRastroTick(){
  try{
    if(typeof window==='undefined' || typeof window.rastro!=='function') return;
    if(typeof CL!=='undefined' && CL && CL.screen){
      const tela = CL.screen==='main' && CL.tab ? ('main/'+CL.tab) : String(CL.screen);
      if(tela!==RF_RASTRO_TELA){ RF_RASTRO_TELA=tela; rfRastro('screen', tela); }
    }
    if(typeof S==='undefined' || !S || typeof S!=='object') return;
    const round = Number(S.round)||0;
    const hist = Array.isArray(S.history) ? S.history.length : 0;
    const b = RF_RASTRO_BASE;
    RF_RASTRO_BASE = { s:S, round, hist };
    if(!b || b.s!==S) return;                       // save novo/carregado: só marca a base
    if(b.hist===0 && hist===0){
      if(b.round===0 && round===1) rfRastro('track','primeira_partida',{ modo: CL && CL.online ? 'resenha' : 'solo' });
      if(b.round===9 && round===10) rfRastro('track','rodada_10',{ modo: CL && CL.online ? 'resenha' : 'solo' });
    }
    if(b.hist===0 && hist>=1 && b.round>=10) rfRastro('track','temporada_1_concluida',{ modo: CL && CL.online ? 'resenha' : 'solo' });
  }catch(e){}
}
