/* Catálogo da Sala de Troféus (Treinador > Sala de Troféus...) — ver clTrophyRoom em ui/main.js.
   A chave de cada entrada é a MESMA chave de competição que o motor grava em S.coachHistory
   (type:'campeao', campo comp), pra não precisar de tabela de tradução no meio:
     serieA/B/C/D · copaBrasil · libertadores · sulamericana  (universo Brasil)
     premier · championsLeague · europaLeague                 (universos europeus)
   Ligas dos outros universos (La Liga, Bundesliga, Serie A italiana, Primeira Liga, os países
   da CONMEBOL...) NÃO estão aqui de propósito: não temos arte de taça pra elas. Quando o
   treinador ganha uma dessas, o motor grava comp='liga:<universo>:<divisão>' e a sala monta um
   card avulso com o nome da liga e o 🏆 genérico (ver trophyRoomShelf) — assim a estante nunca
   esconde um título, mesmo sem imagem.
   As imagens vivem em public/img/trofeus/ (webP recortado, fornecido no handoff). São OUTRAS,
   maiores, que as miniaturas base64 de trophies.js — aquelas continuam servindo os ícones de
   20-28px espalhados pelo jogo (trophyImg) e não foram tocadas.
   escala: fator sobre a altura base de 78px do card. Libertadores e Sul-Americana vêm com muita
   margem transparente na arte, então precisam de 1.625 pra ficarem do mesmo tamanho visual. */
window.TROPHY_ROOM = {
  regions: ['BRASIL', 'AMÉRICA DO SUL', 'EUROPA', 'MUNDO'],
  comps: [
    { id:'serieA', nome:'Brasileirão Série A', curto:'Série A', img:'liga-soberana.webp', regiao:'BRASIL', tipo:'liga',
      dica:'Termine a Série A em 1º. São 38 rodadas: precisa de elenco pra aguentar o ano inteiro e de caixa pra segurar os titulares.' },
    { id:'serieB', nome:'Brasileirão Série B', curto:'Série B', img:'liga-acesso.webp', regiao:'BRASIL', tipo:'liga',
      dica:'Suba da Série C e termine a B em 1º — o acesso e o título saem na mesma temporada.' },
    { id:'serieC', nome:'Brasileirão Série C', curto:'Série C', img:'liga-impulso.webp', regiao:'BRASIL', tipo:'liga',
      dica:'Suba da Série D e feche a C na liderança. Folha enxuta e time em forma decidem.' },
    { id:'serieD', nome:'Brasileirão Série D', curto:'Série D', img:'liga-raiz.webp', regiao:'BRASIL', tipo:'liga',
      dica:'O primeiro degrau da carreira. Folha baixa, foco em jogadores de forma alta.' },
    { id:'copaBrasil', nome:'Copa do Brasil', curto:'Copa do Brasil', img:'copa-federacao.webp', regiao:'BRASIL', tipo:'copa',
      dica:'Mata-mata puro, do começo ao fim. Sobreviva a todas as fases sem reclamar do sorteio.' },

    { id:'libertadores', nome:'Copa Libertadores', curto:'Libertadores', img:'liberta-cup.webp', regiao:'AMÉRICA DO SUL', tipo:'copa',
      dica:'Entre pelos seis primeiros da Série A, passe da fase de grupos e ganhe o mata-mata.' },
    { id:'sulamericana', nome:'Copa Sul-Americana', curto:'Sul-Americana', img:'clubes-america.webp', regiao:'AMÉRICA DO SUL', tipo:'copa',
      dica:'Vem pela faixa do 7º ao 12º lugar da Série A. Grupos e depois mata-mata.' },

    { id:'premier', nome:'Crown League', curto:'Crown League', img:'crown-league.webp', regiao:'EUROPA', tipo:'liga',
      dica:'Só num save da Inglaterra: termine a primeira divisão em 1º.' },
    { id:'championsLeague', nome:'UEFA Champions League', curto:'Champions League', img:'champions.webp', regiao:'EUROPA', tipo:'copa',
      dica:'Só num save europeu: classifique-se pela liga nacional, passe dos grupos e ganhe o mata-mata.' },
    { id:'europaLeague', nome:'UEFA Europa League', curto:'Europa League', img:'europa-league.webp', regiao:'EUROPA', tipo:'copa',
      dica:'A outra porta da Europa, para quem fica logo abaixo da zona de Champions.' },


    /* AS LIGAS DE FORA, com arte de estúdio e o nome do universo RetroFoot. Não estavam aqui
       porque não tínhamos taça delas — o motor gravava 'liga:<universo>:<divisão>' e a Sala
       montava um card avulso com o 🏆 genérico (ver salaCatalog). Agora têm ficha própria.
       A CHAVE É A DO MOTOR: quem a decide é COMP_CHAVE_DIVISAO (src/data/competicoes.js), e é
       por ela que o título conquistado casa com o card. Inglaterra/1ª é a exceção histórica:
       chama-se 'premier' desde antes disto. */
    { id:'liga:Inglaterra:CH', nome:'Vanguard League', curto:'Vanguard League', img:'vanguard-league.webp', regiao:'EUROPA', tipo:'liga',
      dica:'Só num save da Inglaterra: termine a segunda divisão em 1º e suba.' },
    { id:'liga:Itália:IT', nome:'Lega Suprema', curto:'Lega Suprema', img:'lega-suprema.webp', regiao:'EUROPA', tipo:'liga',
      dica:'Só num save da Itália: termine a primeira divisão em 1º.' },
    { id:'liga:Itália:IT2', nome:'Lega Ascesa', curto:'Lega Ascesa', img:'lega-ascesa.webp', regiao:'EUROPA', tipo:'liga',
      dica:'Só num save da Itália: termine a segunda divisão em 1º e suba.' },
    { id:'liga:Espanha:ES', nome:'Liga Hispânica', curto:'Liga Hispânica', img:'liga-hispanica.webp', regiao:'EUROPA', tipo:'liga',
      dica:'Só num save da Espanha: termine a primeira divisão em 1º.' },
    { id:'liga:Espanha:ES2', nome:'Liga Segunda', curto:'Liga Segunda', img:'liga-segunda.webp', regiao:'EUROPA', tipo:'liga',
      dica:'Só num save da Espanha: termine a segunda divisão em 1º e suba.' },
    { id:'liga:Alemanha:DE', nome:'Meisterliga', curto:'Meisterliga', img:'meisterliga.webp', regiao:'EUROPA', tipo:'liga',
      dica:'Só num save da Alemanha: termine a primeira divisão em 1º.' },
    { id:'liga:Alemanha:DE2', nome:'Zweite Liga', curto:'Zweite Liga', img:'zweite-liga.webp', regiao:'EUROPA', tipo:'liga',
      dica:'Só num save da Alemanha: termine a segunda divisão em 1º e suba.' },
    { id:'liga:Portugal:PT', nome:'Liga Lusitana', curto:'Liga Lusitana', img:'liga-lusitana.webp', regiao:'EUROPA', tipo:'liga',
      dica:'Só num save de Portugal: termine a primeira divisão em 1º.' },
    { id:'liga:Portugal:PT2', nome:'Liga Navegação', curto:'Liga Navegação', img:'liga-navegacao.webp', regiao:'EUROPA', tipo:'liga',
      dica:'Só num save de Portugal: termine a segunda divisão em 1º e suba.' },
    { id:'liga:Argentina:ARG', nome:'Liga ARG Suprema', curto:'Liga ARG Suprema', img:'liga-arg-suprema.webp', regiao:'AMÉRICA DO SUL', tipo:'liga',
      dica:'Só num save da Argentina: termine a divisão nacional em 1º.' },

    /* Ainda não existe no motor: nenhuma competição do jogo entrega este título hoje. Fica na
       estante como silhueta declarada, com a dica dizendo isso — decisão do usuário (05/08/2026),
       pra reservar o lugar dele na prateleira MUNDO. Quando o Mundial virar competição de
       verdade, basta o motor gravar comp:'mundial' que o card acende sozinho. */
    { id:'mundial', nome:'Mundial de Clubes FIFA', curto:'Mundial FIFA', img:'mundial.webp', regiao:'MUNDO', tipo:'copa', embreve:true,
      dica:'Ainda não é disputado no RetroFoot98. A taça já tem lugar guardado na estante para quando a competição entrar no jogo.' },
  ],
};

/* ===== A MESMA TAÇA NO ÍCONE DE 28px =====
   `TROPHIES` (trophies.js) guarda as miniaturas em base64 e é dele que saem os ícones
   espalhados pelo jogo — tabela, calendário, relatório de fim de temporada, cerimônia.
   Enquanto a estante mostrava a arte nova e o resto do jogo a antiga, eram duas taças
   para a mesma competição, e o jogador via as duas na mesma tela.
   Só as SETE que ganharam arte de estúdio entram aqui. As outras (Premier, Champions,
   Europa, Mundial) continuam com a miniatura que sempre tiveram: trocá-las por uma foto
   grande reduzida a 28px pioraria o ícone sem ninguém ter pedido.
   Depende da ordem em index.html — trophies.js vem antes deste ficheiro. */
(function(){
  /* As três herdadas ficam com a miniatura que sempre tiveram: uma fotografia grande
     reduzida a 28px piora o ícone sem ninguém ter pedido. Toda arte nova entra. */
  var LEGADO = ['championsLeague','europaLeague','mundial'];
  window.TROPHIES = window.TROPHIES || {};
  window.TROPHY_ROOM.comps.forEach(function(c){
    if(LEGADO.indexOf(c.id) < 0 && c.img) window.TROPHIES[c.id] = 'img/trofeus/' + c.img;
  });
})();
