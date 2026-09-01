/* ===================================================================
   AS PALAVRAS QUE MUDAM COM QUEM JOGA.

   DOIS EIXOS, E ELES SAO INDEPENDENTES:

     RF_GENERO.t('goleiro')     -> o ELENCO. Segue a MODALIDADE do mundo (masc/fem).
     RF_GENERO.tec('treinador') -> o TECNICO. Segue S.coachGender, a escolha da PESSOA.

   Manter os dois separados nao e' preciosismo: alguem pode treinar o time feminino e ser
   treinador, ou o masculino e ser treinadora. Derivar um do outro seria presumir o genero de
   quem esta' jogando a partir do futebol que ela escolheu comandar.

   E' UMA TABELA, NAO LOGICA. Sem regras de flexao, sem heuristica de sufixo: cada termo tem as
   duas formas escritas a mao. Portugues nao se resolve por regra ('meia' e 'atacante' nao
   mudam, 'goleiro' muda), e uma regra errada erra em silencio numa palavra que ninguem testou.

   COM 'masc' NOS DOIS EIXOS, TODA CHAMADA DEVOLVE O INDICE 0 -- que e' exatamente a string que
   estava escrita antes. E' o que faz esta camada ser invisivel no mundo masculino, e o que
   permite provar isso comparando as telas antes e depois.

   NAO E' FOLHA COMPARTILHADA: o resolve-round nao emite prosa com genero. Fica so' no cliente.
   =================================================================== */
(function(root){
  'use strict';

  /* [masculino, feminino] */
  var TERMOS = {
    /* quem joga */
    jogador:    ['jogador','jogadora'],
    jogadores:  ['jogadores','jogadoras'],
    Jogador:    ['Jogador','Jogadora'],
    Jogadores:  ['Jogadores','Jogadoras'],
    /* posicoes — as que nao mudam estao aqui de proposito, para que quem le^ a tabela veja que
       foram consideradas, e nao esquecidas */
    goleiro:    ['goleiro','goleira'],
    goleiros:   ['goleiros','goleiras'],
    Goleiro:    ['Goleiro','Goleira'],
    Goleiros:   ['Goleiros','Goleiras'],
    zagueiro:   ['zagueiro','zagueira'],
    Zagueiro:   ['Zagueiro','Zagueira'],
    defensor:   ['defensor','defensora'],
    Defensor:   ['Defensor','Defensora'],
    meia:       ['meia','meia'],
    Meia:       ['Meia','Meia'],
    atacante:   ['atacante','atacante'],
    Atacante:   ['Atacante','Atacante'],
    /* lances */
    batedor:    ['batedor','batedora'],
    artilheiro: ['artilheiro','artilheira'],
    Artilheiro: ['Artilheiro','Artilheira'],
    artilheiros:['artilheiros','artilheiras'],
    Artilheiros:['Artilheiros','Artilheiras'],
    titular:    ['titular','titular'],
    reserva:    ['reserva','reserva'],
    craque:     ['craque','craque'],
    capitao:    ['capitão','capitã'],
    Capitao:    ['Capitão','Capitã'],
    contratado: ['contratado','contratada'],
    lesionado:  ['lesionado','lesionada'],
    suspenso:   ['suspenso','suspensa'],
    /* CORPO E PE' — sao adjetivos, e e' onde a ficha mais denunciava o masculino: "destro",
       "canhoto" e "nato" apareciam ao lado do nome de uma jogadora. */
    canhoto:    ['canhoto','canhota'],
    destro:     ['destro','destra'],
    nato:       ['nato','nata'],
    /* rotulos de PERFIL, em caixa alta como a ficha os escreve */
    PERFIL_GK:  ['PERFIL DE GOLEIRO','PERFIL DE GOLEIRA'],
    PERFIL_DEF: ['PERFIL DE DEFENSOR','PERFIL DE DEFENSORA'],
    PERFIL_MID: ['PERFIL DE MEIO-CAMPISTA','PERFIL DE MEIO-CAMPISTA'],
    PERFIL_ATT: ['PERFIL DE ATACANTE','PERFIL DE ATACANTE'],
    PERFIL_GEN: ['PERFIL DO JOGADOR','PERFIL DA JOGADORA'],
    /* estados que aparecem em lista e em aviso */
    Contratado: ['Contratado','Contratada'],
    Lesionado:  ['Lesionado','Lesionada'],
    Suspenso:   ['Suspenso','Suspensa'],
    Titular:    ['Titular','Titular'],
    Reserva:    ['Reserva','Reserva'],
    autor:      ['autor','autora'],
    /* concordancia de frase */
    deste:      ['deste','desta'],
    neste:      ['neste','nesta'],
    Deste:      ['Deste','Desta'],
    nenhum:     ['nenhum','nenhuma'],
    Nenhum:     ['Nenhum','Nenhuma'],
    outro:      ['outro','outra'],
    Outro:      ['Outro','Outra'],
    esse:       ['esse','essa'],
    Esse:       ['Esse','Essa'],
    /* quem comanda — usados por tec(), no outro eixo */
    treinador:  ['treinador','treinadora'],
    Treinador:  ['Treinador','Treinadora'],
    tecnico:    ['técnico','técnica'],
    Tecnico:    ['Técnico','Técnica'],
    bemvindo:   ['Bem-vindo','Bem-vinda'],
    /* artigos, para as frases que precisam concordar */
    o:          ['o','a'],
    O:          ['O','A'],
    um:         ['um','uma'],
  };

  /* A MODALIDADE DO MUNDO. Dentro do jogo sai de S.intlUniverse (via RF_FEM); no assistente,
     antes de o save existir, sai de CL.modalidade — que e' o unico dado disponivel ali. */
  /* `S` E `CL` NAO ESTAO EM globalThis. Sao declarados com `let` no topo dos scripts do jogo, e
     binding de `let` no escopo global NAO vira propriedade de globalThis -- `root.S` devolvia
     undefined e a camada inteira respondia 'masc' dentro de um mundo feminino. Resolver pelo
     IDENTIFICADOR (typeof S) enxerga a binding; o typeof tambem protege o Node, onde ela nao
     existe. */
  function estado(){ try{ return (typeof S!=='undefined') ? S : null; }catch(e){ return null; } }
  function cliente(){ try{ return (typeof CL!=='undefined') ? CL : null; }catch(e){ return null; } }

  function modo(){
    try{
      var st = estado();
      if(st && st.intlUniverse !== undefined && root.RF_FEM && root.RF_FEM.modalidade)
        return root.RF_FEM.modalidade(st.intlUniverse || 'brasil');
      var cl = cliente();
      if(cl && cl.modalidade) return cl.modalidade;
    }catch(e){}
    return 'masc';
  }
  /* O GENERO DE QUEM TREINA. `coachGender` guarda 'f'/'m' (rf26-fluxo), nao 'fem'/'masc'. */
  function modoTec(){
    try{
      var st = estado(); if(st && st.coachGender) return st.coachGender==='f' ? 'fem' : 'masc';
      var cl = cliente(); if(cl && cl.coachGender) return cl.coachGender==='f' ? 'fem' : 'masc';
    }catch(e){}
    return 'masc';
  }

  function pega(chave, fem){
    var par = TERMOS[chave];
    if(!par) return chave;                    /* termo que ninguem cadastrou volta como veio */
    return par[fem ? 1 : 0];
  }

  var API = {
    TERMOS: TERMOS,
    modo: modo,
    modoTec: modoTec,
    ehFem: function(){ return modo()==='fem'; },
    /* termo do ELENCO */
    t: function(chave){ return pega(chave, modo()==='fem'); },
    /* termo do TECNICO */
    tec: function(chave){ return pega(chave, modoTec()==='fem'); },
    /* o cabecalho "PERFIL DE ..." da ficha, pelo setor */
    perfil: function(setor){
      var fem = modo()==='fem';
      return pega(({GK:'PERFIL_GK',DEF:'PERFIL_DEF',MID:'PERFIL_MID',ATT:'PERFIL_ATT'})[setor] || 'PERFIL_GEN', fem);
    },
    /* rotulo de posicao a partir do SETOR (GK/DEF/MID/ATT), nos tre^s tamanhos que o jogo usa */
    pos: function(setor, tamanho){
      var fem = modo()==='fem';
      if(tamanho==='curto') return ({GK:'GOL',DEF:'ZAG',MID:'MEI',ATT:'ATA'})[setor] || 'MEI';
      if(tamanho==='setor'){   /* nome do setor, nao da pessoa: 'Defesa' nao tem genero */
        return ({GK:pega('Goleiro',fem),DEF:'Defesa',MID:'Meio-campo',ATT:'Ataque'})[setor] || '—';
      }
      return ({ GK:pega('Goleiro',fem), DEF:pega('Zagueiro',fem),
                MID:pega('Meia',fem),   ATT:pega('Atacante',fem) })[setor] || pega('Jogador',fem);
    },
  };

  root.RF_GENERO = API;
  if(typeof module!=='undefined' && module.exports){ module.exports = API; }
})(typeof globalThis!=='undefined'?globalThis:this);
