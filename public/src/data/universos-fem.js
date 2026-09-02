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

  /* ===== OS OUTROS PAISES, GEMEOS GERADOS =====
     O brasilFem esta' escrito a' mao acima porque tem particularidades (src:'conmebol' para cair
     na Libertadores, e a AUSENCIA de `lg`). Os outros catorze sao copia fiel do masculino mais
     dois campos -- e escrever catorze blocos a' mao seria catorze sitios para esquecer de
     atualizar quando a piramide de um pais mudar. Aqui derivam do original: se a Inglaterra
     ganhar uma terceira divisao amanha, a InglaterraFem ganha-a no mesmo instante.

     O `lg` VEM JUNTO, e isto e' o oposto do que brasilFem faz. La' ele foi omitido de proposito,
     porque o Brasil masculino tambem nao o declara e declara'-lo no gemeo faria o mapa reverso
     resolver 'BRA-A' para brasilFem. Aqui o masculino DEPENDE de `lg` -- e' assim que se acham os
     clubes de um pais dentro de INTL_LEAGUES -- entao o gemeo tem de o ter. O desvio do mapa
     reverso e' resolvido do outro lado: lgToUniDiv passa a ignorar universos femininos (core.js),
     que e' o certo, porque quem pergunta "de que pais e' o codigo ENG-1" quer o pais, nao a
     modalidade. */
  var _FEM_PAISES = ['Inglaterra','Espanha','Itália','Alemanha','Portugal',
    'Argentina','Uruguai','Colômbia','Chile','Peru','Equador','Paraguai','Venezuela','Bolívia'];
  _FEM_PAISES.forEach(function(pais){
    var m = U[pais]; if(!m) return;                 /* pais que o masculino nao tem: nao ha' gemeo */
    var g = {}; for(var k in m) g[k] = m[k];        /* copia rasa: os valores sao lidos, nunca mutados */
    g.base = pais;
    g.modalidade = 'fem';
    U[pais+'Fem'] = g;
    if(root.UNIVERSO_BANDEIRA && root.UNIVERSO_BANDEIRA[pais])
      root.UNIVERSO_BANDEIRA[pais+'Fem'] = root.UNIVERSO_BANDEIRA[pais];
  });

  if(root.UNIVERSO_BANDEIRA) root.UNIVERSO_BANDEIRA.brasilFem = 'br';

  /* A TRAVA MESTRA. `false` faz o seletor sumir do onboarding e do painel, e nenhum mundo
     feminino novo nasce — o jogo volta a ser byte a byte o de hoje, com uma linha e um deploy,
     sem git. Desliga a CRIAÇÃO, não a leitura: um save feminino que já exista continua
     carregando, porque o universo segue registrado aqui. */
  root.RF_MODALIDADES = { fem: true };

  if(typeof module!=='undefined' && module.exports){ module.exports={ RF_MODALIDADES:root.RF_MODALIDADES }; }
})(typeof globalThis!=='undefined'?globalThis:this);
