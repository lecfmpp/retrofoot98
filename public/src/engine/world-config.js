/* ===================================================================
   CONFIGURAÇÃO DE MUNDO — a segunda folha ÚNICA compartilhada cliente ⇄ servidor.

   POR QUE ISTO EXISTE. O `world-rules.js` acabou com as duas versões das regras de CALENDÁRIO.
   Faltava o mesmo para as regras de PAÍS. Hoje elas estão escritas em três lugares:

     · `data/universos.js` descreve os 15 países (divisões, tamanho, acesso, rebaixamento) e o
       cliente já os usa por `setUniverse()`;
     · `resolve-round` tem DIV_ORDER / DIVISION_SIZE / DIVISION_PROMO / DIVISION_RELEG congelados
       no Brasil, com o comentário "Config brasileira (Resenha = sempre Brasil)";
     · `data/rebalance.js` e o `resolve-round` têm, CADA UM, um `BAND_BY_DIV` escrito à mão que
       traduz PL/CH/ES/ES2/... para as faixas A/B — e que só cobre seis países.

   Três cópias da mesma regra é exatamente o padrão que o cabeçalho do `world-rules.js` descreve
   como a causa dos bugs de calendário. Esta folha é o lugar único.

   A IDEIA CENTRAL: INDEXAR POR NÍVEL, NÃO PELA LETRA DA DIVISÃO.
   `A/B/C/D` são nomes brasileiros. O que a regra realmente quer saber é a PROFUNDIDADE na
   pirâmide — 1ª divisão, 2ª, 3ª. `UNIVERSOS[pais].order` já é essa lista, em ordem. Então:

       nivel = order.indexOf(divisao)        brasil: A=0 B=1 C=2 D=3   ·   Inglaterra: PL=0 CH=1

   Com isso o mapa escrito à mão desaparece e QUALQUER país novo — inclusive um criado no painel
   admin — funciona sem tocar em código. Para o Brasil o resultado é idêntico ao de hoje, e é
   isso que `scripts/teste-universos.mjs` prova.

   REGRA DE OURO (a mesma do world-rules.js): nada de S, CL, DATA, DOM ou qualquer global do
   jogo. `UNIVERSOS` é lido PREGUIÇOSAMENTE, dentro das funções — o painel admin carrega os
   arquivos em paralelo, e ler no topo criaria dependência de ordem de carga.

   PROPAGAÇÃO É AUTOMÁTICA: scripts/sync-world-rules.mjs injeta esta folha dentro do
   resolve-round entre marcadores, no build e no CI. Não há porte manual.
   =================================================================== */
(function(root){
  'use strict';

  const PADRAO='brasil';
  function universos(){ return root.UNIVERSOS || {}; }
  function uniCfg(key){ const U=universos(); return U[key] || U[PADRAO] || null; }
  /* chave do universo a partir do estado do jogo. `S.intlUniverse` é o campo que o save já
     guarda (core.js: activeUniverseKey) e que já viaja dentro do shared_state — ausente = Brasil,
     que é o que toda sala criada até agosto/2026 é. Retrocompatível por construção. */
  function uniDoEstado(S){ return (S && S.intlUniverse) || PADRAO; }

  /* ---------- NÍVEL NA PIRÂMIDE ---------- */
  function nivelDaDivisao(uniKey, div){
    const c=uniCfg(uniKey); if(!c || !c.order) return 0;
    const i=c.order.indexOf(div);
    return i<0 ? 0 : i;                       // divisão desconhecida conta como 1ª (nunca negativa)
  }
  function divisoesDe(uniKey){ const c=uniCfg(uniKey); return (c && c.order) ? c.order.slice() : ['A','B','C','D']; }
  function tamanhoDaDivisao(uniKey, div){ const c=uniCfg(uniKey); return (c && c.size && c.size[div]) || 20; }
  function sobemDaDivisao(uniKey, div){ const c=uniCfg(uniKey); return (c && c.promo && c.promo[div]) || 0; }
  function descemDaDivisao(uniKey, div){ const c=uniCfg(uniKey); return (c && c.releg && c.releg[div]) || 0; }

  /* ---------- TABELAS POR NÍVEL ----------
     Os valores são EXATAMENTE os que estavam escritos por letra: para o Brasil, nível 0 = 'A',
     1 = 'B', 2 = 'C', 3 = 'D'. Uma pirâmide mais funda que a tabela usa o último nível. */
  const BANDA_POR_NIVEL=['A','B','C','D'];
  const FORCA_POR_NIVEL=[[58,88],[58,80],[52,74],[48,68]];
  const CAP_POR_NIVEL=[99,37,24,12];
  function _porNivel(tab, n){ return tab[Math.max(0, Math.min(n, tab.length-1))]; }

  function bandaDaDivisao(uniKey, div){ return _porNivel(BANDA_POR_NIVEL, nivelDaDivisao(uniKey, div)); }
  function forcaDaDivisao(uniKey, div){ return _porNivel(FORCA_POR_NIVEL, nivelDaDivisao(uniKey, div)).slice(); }
  function capDaDivisao(uniKey, div){ return _porNivel(CAP_POR_NIVEL, nivelDaDivisao(uniKey, div)); }

  /* Tabelas prontas, com as LETRAS daquele país como chave. É o formato que o cliente e o
     servidor já consomem (`DIVISION_FORCE_RANGE[division]`), então ligar a folha não exige
     reescrever quem lê — só trocar de onde a tabela vem. */
  function tabelasDoUniverso(uniKey){
    const ordem=divisoesDe(uniKey);
    const size={}, promo={}, releg={}, forca={}, cap={}, banda={};
    ordem.forEach(d=>{
      size[d]=tamanhoDaDivisao(uniKey,d); promo[d]=sobemDaDivisao(uniKey,d); releg[d]=descemDaDivisao(uniKey,d);
      forca[d]=forcaDaDivisao(uniKey,d);  cap[d]=capDaDivisao(uniKey,d);     banda[d]=bandaDaDivisao(uniKey,d);
    });
    return { ordem, size, promo, releg, forca, cap, banda };
  }
  /* A banda de uma divisão SEM saber o país — é o que `rebalance.force(rawF, division)` tem em
     mãos. Procura a letra em todos os universos; se dois países usarem a mesma letra, o nível é o
     mesmo nos dois (é o que 'A'/'B' significam), então a ambiguidade não muda o resultado. */
  function bandaDaDivisaoSemPais(div){
    const U=universos();
    for(const k in U){ const o=U[k] && U[k].order; if(o && o.indexOf(div)>=0) return _porNivel(BANDA_POR_NIVEL, o.indexOf(div)); }
    return BANDA_POR_NIVEL[0];
  }

  /* ---------- CONFEDERAÇÃO E COPAS DE CADA PAÍS ----------
     Quais copas um país disputa era decidido por três funções do cliente (isConmebolUniverse,
     isIntlUniverse, allCupKeys em core.js) e o servidor não sabia nada disso: `rebuildContinental
     Cups` assumia Libertadores/Sul-Americana e que `topStandings` era a Série A brasileira.

     Aqui vira dado. `conf` sai do universo: `src:'conmebol'` e o Brasil são CONMEBOL, o resto é
     UEFA — a mesma regra que o cliente aplicava, agora escrita uma vez. `copaNacional` é a copa
     de país (só o Brasil tem uma modelada hoje).

     As VAGAS são as tabelas que o cliente já tinha (LIB_SLOTS_UNI/SUL_SLOTS_UNI, core.js), aqui
     chaveadas pelo NOME do país (`cfg.country`), como lá. O servidor usava 6 e 6 fixos. */
  const CONFEDERACOES={
    CONMEBOL:{ copas:['libertadores','sulamericana'],
      vagas:{ 'Brasil':[6,6],'Argentina':[6,5],'Colômbia':[4,4],'Chile':[3,3],'Uruguai':[3,3],
              'Peru':[3,3],'Equador':[2,2],'Paraguai':[2,2],'Venezuela':[2,2],'Bolívia':[1,2] } },
    UEFA:{ copas:['championsLeague','europaLeague'],
      vagas:{ 'Inglaterra':[4,2],'Espanha':[4,2],'Itália':[4,2],'Alemanha':[4,2],'Portugal':[2,2] } },
  };
  const COPA_NACIONAL={ brasil:'copaBrasil' };

  function nomeDoPais(uniKey){ const c=uniCfg(uniKey); return (c && c.country) || (uniKey===PADRAO ? 'Brasil' : uniKey); }
  function confederacaoDe(uniKey){
    const c=uniCfg(uniKey);
    if(uniKey===PADRAO || (c && c.src==='conmebol')) return 'CONMEBOL';
    return 'UEFA';
  }
  function copasContinentaisDe(uniKey){ return (CONFEDERACOES[confederacaoDe(uniKey)]||{}).copas.slice(); }
  /* TODAS as copas do país, na ordem que o cliente já usava em allCupKeys(): a nacional primeiro
     (quando existe), depois as duas continentais. */
  function copasDe(uniKey){
    const nac=COPA_NACIONAL[uniKey];
    return (nac ? [nac] : []).concat(copasContinentaisDe(uniKey));
  }
  /* [vagas na 1ª continental, vagas na 2ª]. País sem entrada na tabela cai em [4,2], que é o
     padrão europeu — nunca zero, senão o país simplesmente não teria representantes. */
  function vagasContinentais(uniKey){
    const conf=CONFEDERACOES[confederacaoDe(uniKey)]||{};
    const v=(conf.vagas||{})[nomeDoPais(uniKey)];
    return v ? v.slice() : [4,2];
  }

  /* ---------- NOMES DE JOGADOR POR PAÍS ----------
     O servidor gerava TODO regen com nomes brasileiros: `pickProcName` só conhecia BR_FIRST/
     BR_LAST, então a virada de temporada de um save inglês devolvia "Gabriel Silva" na Premier
     League. O cliente já tinha os pools de Espanha, Itália, Alemanha e Portugal (INTL_NAME_POOL)
     e um genérico hispânico (INTL_FIRST/INTL_LAST) para a CONMEBOL — mas só do lado dele.

     As listas do Brasil são as MESMAS que estavam nos dois arquivos (conferidas idênticas antes
     de mover), então nada muda para quem já joga. `Inglaterra` é nova: não existia em lugar
     nenhum. `_hispano` é o fallback dos países CONMEBOL, como o cliente já fazia.
     `nomesDoPais` nunca devolve vazio — sem pool, cai no hispânico para não gerar nome nulo. */
  const NAME_POOLS={
    brasil:{ first:[
      'Gabriel','Lucas','Matheus','Rafael','Bruno','Léo','Vitor','João','Pedro','Gustavo','Felipe','Diego',
      'Rodrigo','Thiago','Wesley','Éverton','Caio','Igor','Vinícius','Douglas','Renato','Marcos','André',
      'Fábio','Danilo','Kaio','Yuri','Alan','Juninho','Guilherme','Paulinho','Rennan','Éder','Wellington',
      'Luan','Nathan','Richard','Kevin','Wanderson','Jonathan','Ronaldo','Ricardo','Fernando','Cristian',
      'Emerson','Robson','Adriano','Cléber','Maicon','Otávio'],
      last:[
      'Silva','Santos','Oliveira','Souza','Pereira','Lima','Costa','Ferreira','Almeida','Ribeiro','Rodrigues',
      'Gomes','Martins','Barbosa','Rocha','Dias','Nascimento','Araújo','Cardoso','Teixeira','Moreira',
      'Carvalho','Cavalcante','Mendes','Freitas','Vieira','Monteiro','Nunes','Correia','Machado','Fernandes',
      'Ramos','Azevedo','Campos','Pinto','Cunha','Moraes','Farias','Batista','Andrade'] },
    Espanha:{ first:[
      'Álvaro','Sergio','Javier','Carlos','Pablo','Rubén','Iker','Marcos','Adrián','Diego','Jorge','Raúl',
      'Óscar','Iván','Mario','Hugo','Dani','Nacho'],
      last:[
      'García','Fernández','Martínez','López','Sánchez','Gómez','Ruiz','Torres','Navarro','Molina','Ortega',
      'Serrano','Castro','Vidal','Herrera','Cano','Rubio','Marín','Peña','Vega','Bravo','Nieto','Gallardo',
      'Reyes'] },
    Itália:{ first:[
      'Marco','Luca','Andrea','Matteo','Alessandro','Federico','Davide','Simone','Giacomo','Nicolò','Lorenzo',
      'Riccardo','Antonio','Gabriele','Stefano','Fabio','Emanuele','Christian'],
      last:[
      'Rossi','Bianchi','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Mancini',
      'Costa','Giordano','Rizzo','Lombardi','Moretti','Barbieri','Fontana','Caruso','Ferrara','Longo',
      'Marchetti','Villa'] },
    Alemanha:{ first:[
      'Lukas','Jonas','Leon','Finn','Tim','Niklas','Maximilian','Felix','Paul','Julian','Moritz','Jan','Tobias',
      'Marvin','Philipp','Nico','Kevin','Sven'],
      last:[
      'Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Hoffmann','Schäfer','Koch',
      'Bauer','Richter','Klein','Wolf','Neumann','Schwarz','Zimmermann','Braun','Krüger','Hofmann','Lange',
      'Werner','Krause'] },
    Portugal:{ first:[
      'João','Miguel','Rui','Pedro','Tiago','André','Bruno','Diogo','Ricardo','Nuno','Gonçalo','Fábio','Rafael',
      'Hélder','Vítor','Luís','Daniel','Sérgio'],
      last:[
      'Silva','Santos','Ferreira','Pereira','Oliveira','Costa','Rodrigues','Martins','Sousa','Fonseca','Gomes',
      'Lopes','Marques','Almeida','Ribeiro','Pinto','Carvalho','Teixeira','Moreira','Cardoso','Nunes','Correia',
      'Machado','Tavares'] },
    Inglaterra:{ first:[
      'Jack','Harry','Oliver','Charlie','George','Jacob','Alfie','Freddie','Archie','Thomas','Callum','Reece',
      'Kieran','Declan','Mason','Ollie','Josh','Lewis'],
      last:[
      'Smith','Jones','Taylor','Brown','Wilson','Davies','Evans','Thomas','Roberts','Walker','Wright',
      'Robinson','Thompson','White','Hughes','Edwards','Green','Hall','Wood','Harris','Clarke','Baker','Turner',
      'Hill'] },
    _hispano:{ first:[
      'Martín','Diego','Franco','Nicolás','Iván','Bruno','Gonzalo','Sebastián','Rodrigo','Emiliano','Cristian',
      'Federico','Agustín','Maximiliano','Ezequiel','Leandro','Matías','Joaquín','Tomás','Julián','Rafael',
      'Andrés','Carlos','Luis','Pedro'],
      last:[
      'Gómez','Fernández','Rodríguez','Sosa','Díaz','Romero','Torres','Núñez','Silva','Acosta','Ramírez','Vega',
      'Cabrera','Godoy','Molina','Ortiz','Benítez','Aguirre','Suárez','Ibáñez','Herrera','Castro','Flores',
      'Rojas','Medina'] },
  };
  function nomesDoPais(uniKey){
    const c=uniCfg(uniKey);
    return NAME_POOLS[uniKey] || NAME_POOLS[(c&&c.country)] || NAME_POOLS._hispano;
  }

  /* ---------- IDENTIDADE DE UM JOGADOR CRIADO DO ZERO ----------
     O regen do servidor nascia sempre com `nat:'Brasil'` e `lg:'BRA-'+divisao`, mesmo num save
     inglês. `nat` é o que decide se o jogador conta na cota de estrangeiros (playerIsForeign,
     core.js), então um regen inglês contava como estrangeiro no próprio país. Os valores do
     Brasil são exatamente os que estavam escritos: nat[0] de `brasil` é 'Brasil', e o Brasil não
     tem tabela `lg`, então continua a cair em 'BRA-'+divisao. */
  function nacionalidadeDe(uniKey){ const c=uniCfg(uniKey); return (c && c.nat && c.nat[0]) || 'Brasil'; }
  function codigoDaLiga(uniKey, div){ const c=uniCfg(uniKey); return (c && c.lg && c.lg[div]) || ('BRA-'+div); }

  const API={ PADRAO, uniCfg, uniDoEstado, nivelDaDivisao, divisoesDe,
    tamanhoDaDivisao, sobemDaDivisao, descemDaDivisao,
    BANDA_POR_NIVEL, FORCA_POR_NIVEL, CAP_POR_NIVEL,
    bandaDaDivisao, forcaDaDivisao, capDaDivisao, bandaDaDivisaoSemPais, tabelasDoUniverso,
    CONFEDERACOES, COPA_NACIONAL, nomeDoPais, confederacaoDe, copasContinentaisDe, copasDe,
    vagasContinentais, NAME_POOLS, nomesDoPais, nacionalidadeDe, codigoDaLiga };
  root.WORLD_CONFIG=API;
  if(typeof module!=='undefined' && module.exports){ module.exports=API; }
})(typeof globalThis!=='undefined'?globalThis:this);
