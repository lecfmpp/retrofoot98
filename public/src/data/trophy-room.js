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
    { id:'serieA', nome:'Brasileirão Série A', curto:'Série A', img:'serie-a.webp', regiao:'BRASIL', tipo:'liga',
      dica:'Termine a Série A em 1º. São 38 rodadas: precisa de elenco pra aguentar o ano inteiro e de caixa pra segurar os titulares.' },
    { id:'serieB', nome:'Brasileirão Série B', curto:'Série B', img:'serie-b.webp', regiao:'BRASIL', tipo:'liga',
      dica:'Suba da Série C e termine a B em 1º — o acesso e o título saem na mesma temporada.' },
    { id:'serieC', nome:'Brasileirão Série C', curto:'Série C', img:'serie-c.webp', regiao:'BRASIL', tipo:'liga',
      dica:'Suba da Série D e feche a C na liderança. Folha enxuta e time em forma decidem.' },
    { id:'serieD', nome:'Brasileirão Série D', curto:'Série D', img:'serie-d.webp', regiao:'BRASIL', tipo:'liga',
      dica:'O primeiro degrau da carreira. Folha baixa, foco em jogadores de forma alta.' },
    { id:'copaBrasil', nome:'Copa do Brasil', curto:'Copa do Brasil', img:'copa-do-brasil.webp', regiao:'BRASIL', tipo:'copa',
      dica:'Mata-mata puro, do começo ao fim. Sobreviva a todas as fases sem reclamar do sorteio.' },

    { id:'libertadores', nome:'Copa Libertadores', curto:'Libertadores', img:'libertadores.webp', escala:1.625, regiao:'AMÉRICA DO SUL', tipo:'copa',
      dica:'Entre pelos seis primeiros da Série A, passe da fase de grupos e ganhe o mata-mata.' },
    { id:'sulamericana', nome:'Copa Sul-Americana', curto:'Sul-Americana', img:'sul-americana.webp', escala:1.625, regiao:'AMÉRICA DO SUL', tipo:'copa',
      dica:'Vem pela faixa do 7º ao 12º lugar da Série A. Grupos e depois mata-mata.' },

    { id:'premier', nome:'Premier League', curto:'Premier League', img:'premier.webp', regiao:'EUROPA', tipo:'liga',
      dica:'Só num save da Inglaterra: termine a Premier League em 1º.' },
    { id:'championsLeague', nome:'UEFA Champions League', curto:'Champions League', img:'champions.webp', regiao:'EUROPA', tipo:'copa',
      dica:'Só num save europeu: classifique-se pela liga nacional, passe dos grupos e ganhe o mata-mata.' },
    { id:'europaLeague', nome:'UEFA Europa League', curto:'Europa League', img:'europa-league.webp', regiao:'EUROPA', tipo:'copa',
      dica:'A outra porta da Europa, para quem fica logo abaixo da zona de Champions.' },

    /* Ainda não existe no motor: nenhuma competição do jogo entrega este título hoje. Fica na
       estante como silhueta declarada, com a dica dizendo isso — decisão do usuário (05/08/2026),
       pra reservar o lugar dele na prateleira MUNDO. Quando o Mundial virar competição de
       verdade, basta o motor gravar comp:'mundial' que o card acende sozinho. */
    { id:'mundial', nome:'Mundial de Clubes FIFA', curto:'Mundial FIFA', img:'mundial.webp', regiao:'MUNDO', tipo:'copa', embreve:true,
      dica:'Ainda não é disputado no RetroFoot98. A taça já tem lugar guardado na estante para quando a competição entrar no jogo.' },
  ],
};
