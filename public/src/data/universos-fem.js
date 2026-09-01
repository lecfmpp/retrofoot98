/* ===================================================================
   O UNIVERSO FEMININO — acréscimo puro, num arquivo só.

   POR QUE É UM ARQUIVO NOVO E NÃO UMA CHAVE DENTRO DE `universos.js`. O mundo masculino está no
   ar, e a garantia que governa este trabalho é que ele não pode mudar em nada. Registrando de
   fora, `universos.js` e `world-config.js` ficam com diff ZERO — `git diff --name-only` prova, e
   não é preciso confiar em revisão. Se algo der errado, apagar este arquivo devolve o jogo ao
   que era, sem `git revert` nem conflito.

   `brasilFem` É GÊMEO DO BRASIL, NÃO UM PAÍS NOVO. Mesma pirâmide, mesmos tamanhos, mesmo
   acesso e rebaixamento, mesmo calendário — e, sobretudo, OS MESMOS CLUBES: mesmo id, mesmo
   escudo, mesmas cores, mesmo estádio. O que muda é quem joga.

   OS TRÊS CAMPOS QUE FAZEM ISSO FUNCIONAR SEM TOCAR EM NENHUMA FUNÇÃO:

     src:'conmebol'   `confederacaoDe()` já lê este campo — sem ele, brasilFem cairia na UEFA e
                      jogaria Champions em vez de Libertadores. Não é preciso envolver a função.
     base:'brasil'    de que pirâmide e de que catálogo este universo é gêmeo. É o que faz o
                      motor buscar os clubes brasileiros em vez de um bundle próprio.
     modalidade:'fem' o eixo, escrito UMA vez, como dado. Quem precisa dele lê por RF_FEM.

   SEM `lg`, DE PROPÓSITO. O Brasil masculino não declara `lg` (cai no fallback 'BRA-'+divisão),
   e por isso `lgToUniDiv` hoje não tem entrada para 'BRA-A'. Se o gêmeo declarasse `lg`, o mapa
   reverso passaria a resolver 'BRA-A' para brasilFem — e isso desviaria comportamento no mundo
   MASCULINO. Sem `lg`, nada muda para ninguém.
   =================================================================== */
(function(root){
  'use strict';
  var U = root.UNIVERSOS;
  if(!U){ return; }   /* universos.js tem de vir antes; sem ele, não há o que estender */

  U.brasilFem = {
    order:['A','B','C','D'], size:{A:20,B:20,C:20,D:20}, promo:{A:0,B:4,C:4,D:4}, releg:{A:4,B:4,C:4,D:0},
    label:{A:'Série A',B:'Série B',C:'Série C',D:'Série D'}, nat:['Brasil','Brazil'], foreignMax:8,
    country:'Brasil',
    src:'conmebol',
    base:'brasil',
    modalidade:'fem',
  };

  if(root.UNIVERSO_BANDEIRA) root.UNIVERSO_BANDEIRA.brasilFem = 'br';

  /* A TRAVA MESTRA. `false` faz o seletor sumir do onboarding e do painel, e nenhum mundo
     feminino novo nasce — o jogo volta a ser byte a byte o de hoje, com uma linha e um deploy,
     sem git. Desliga a CRIAÇÃO, não a leitura: um save feminino que já exista continua
     carregando, porque o universo segue registrado aqui. */
  root.RF_MODALIDADES = { fem: true };

  if(typeof module!=='undefined' && module.exports){ module.exports={ RF_MODALIDADES:root.RF_MODALIDADES }; }
})(typeof globalThis!=='undefined'?globalThis:this);
