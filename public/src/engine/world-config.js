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
  /* ===== O UNIVERSO DA PIRÂMIDE ÂNCORA — não "o país da sala" =====
     `S.intlUniverse` diz de que país é a pirâmide que mora em S.table/S.otherDivs: a que o
     servidor resolve a cada rodada. NÃO descreve os jogadores. Num mundo com humanos em países
     diferentes não existe "o país da sala" — o país de cada um sai do clube do assento dele.
     Ausente = Brasil, que é o que toda sala criada até agosto/2026 é. */
  function uniDoEstado(S){ return (S && S.intlUniverse) || PADRAO; }
  /* Os países que existem por inteiro neste mundo. Plural de propósito: um humano ir treinar no
     Chelsea acrescenta a Inglaterra e NÃO tira o Brasil — os outros treinadores continuam lá.
     Saves antigos não têm a lista; nesse caso o mundo tem um país só, o da âncora. */
  function paisesVivos(S){
    const lista=(S && Array.isArray(S.paisesVivos) && S.paisesVivos.length) ? S.paisesVivos.slice() : [uniDoEstado(S)];
    const set=new Set(lista); set.add(uniDoEstado(S));      // a âncora está sempre viva
    return [...set];
  }

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
    /* ===== POOLS AMPLIADOS (01/09) =====
       Eram 18 nomes x 24 sobrenomes por pais europeu (432 combinacoes) e um `_hispano` unico para
       os nove da CONMEBOL (625). Chegavam para gerar um reforco aqui e outro ali, que era para o
       que existiam. Nao chegam para BATIZAR OS ELENCOS INTEIROS: sao 1.245 jogadores so' em
       Inglaterra, e com 432 combinacoes o homonimo deixa de ser acidente e vira regra.

       Agora cada pais tem ~50x50 (~2.500) e os nove da CONMEBOL ganharam pool PROPRIO -- um
       sobrenome boliviano nao e' um sobrenome uruguaio, e o `_hispano` unico apagava isso. A folga
       ficou entre 2,0x (Inglaterra) e 6,6x (Venezuela) sobre o numero real de jogadores.

       TODA PALAVRA TEM NO MAXIMO 11 CARACTERES, e isso e' medida, nao gosto: nos 1.900 nomes
       ficticios brasileiros -- o conjunto que ja' provou caber nas telas -- a palavra mais longa
       tem 11 e o nome inteiro nao passa de 21. Nome de 45 caracteres ('Bernardo Fernandes da Silva
       Junior', que existe hoje no bundle) estoura o layout onde nao ha' reticencias.

       `_hispano` fica como rede para um pais sem pool proprio. */
    Inglaterra:{ first:[
      'Jack','Harry','Oliver','Charlie','George','Jacob','Alfie','Freddie','Archie','Thomas','Callum',
      'Reece','Kieran','Declan','Mason','Ollie','Josh','Lewis','Ethan','Noah','Leo','Riley','Finley',
      'Tyler','Jamie','Connor','Dylan','Aaron','Bailey','Cameron','Dexter','Elliot','Frankie','Harvey',
      'Isaac','Jude','Kyle','Lucas','Marcus','Nathan','Owen','Reuben','Sonny','Toby','Wilfred','Zack',
      'Rhys','Spencer','Miles','Joel',
    ], last:[
      'Smith','Jones','Taylor','Brown','Wilson','Davies','Evans','Thomas','Roberts','Walker','Wright',
      'Robinson','Thompson','White','Hughes','Edwards','Green','Hall','Wood','Harris','Clarke','Baker',
      'Turner','Hill','Cooper','Ward','Morris','Bennett','Bailey','Carter','Foster','Gibson','Hayes',
      'Jackson','Kelly','Lawson','Marsh','Newton','Palmer','Quinn','Reid','Shaw','Ellis','Vaughan','Webb',
      'Young','Barnes','Chapman','Dawson','Fletcher',
    ] },
    Alemanha:{ first:[
      'Lukas','Jonas','Leon','Finn','Tim','Niklas','Maximilian','Felix','Paul','Julian','Moritz','Jan',
      'Tobias','Marvin','Philipp','Nico','Kevin','Sven','Anton','Bastian','Cedric','Dennis','Elias',
      'Fabian','Florian','Hendrik','Jannik','Jonathan','Kilian','Lennart','Linus','Marco','Mats','Merlin',
      'Nils','Oskar','Pascal','Rafael','Simon','Thilo','Tom','Valentin','Vincent','Yannick','Emil','Malte',
      'Ruben','Silas','Theo',
    ], last:[
      'Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Hoffmann','Schäfer',
      'Koch','Bauer','Richter','Klein','Wolf','Neumann','Schwarz','Zimmermann','Braun','Krüger','Hofmann',
      'Lange','Werner','Krause','Böhm','Busch','Dietrich','Engel','Frank','Gross','Haas','Hartmann','Jung',
      'Kaiser','Keller','König','Kraus','Lorenz','Mayer','Otto','Peters','Reuter','Sauer','Seidel','Stein',
      'Vogel','Walter','Winter','Ziegler','Berg',
    ] },
    'Itália':{ first:[
      'Lorenzo','Matteo','Andrea','Francesco','Alessandro','Davide','Simone','Luca','Marco','Riccardo',
      'Gabriele','Federico','Tommaso','Nicolò','Stefano','Giulio','Emanuele','Pietro','Antonio','Cristian',
      'Daniele','Edoardo','Fabio','Filippo','Giacomo','Giovanni','Leonardo','Manuel','Mattia','Michele',
      'Nicola','Paolo','Raffaele','Salvatore','Samuele','Sergio','Valerio','Vincenzo','Alberto','Claudio',
      'Diego','Enrico','Gianluca','Ivan','Massimo','Mirko','Roberto','Sandro','Tiziano','Umberto',
    ], last:[
      'Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Colombo','Ricci','Marino','Greco','Bruno',
      'Gallo','Conti','Costa','Giordano','Mancini','Rizzo','Lombardi','Moretti','Barbieri','Fontana',
      'Santoro','Mariani','Rinaldi','Caruso','Ferrara','Galli','Martini','Leone','Longo','Gentile',
      'Martinelli','Vitale','Lombardo','Serra','Coppola','Sala','Farina','Villa','Monti','Grasso',
      'Pellegrini','Palumbo','Sanna','Basile','Neri','Testa','Ferri','Rossetti','Silvestri',
    ] },
    Espanha:{ first:[
      'Alejandro','Javier','Sergio','Carlos','Pablo','Adrián','Álvaro','Marcos','Rubén','Iván','Jorge',
      'Raúl','Óscar','Víctor','Hugo','Aitor','Borja','Cristian','Daniel','David','Diego','Eduardo',
      'Enrique','Fernando','Gonzalo','Guillermo','Ignacio','Iker','Isaac','Joaquín','Jordi','Julián',
      'Lucas','Manuel','Mario','Miguel','Nacho','Nicolás','Pedro','Rafael','Roberto','Rodrigo','Samuel',
      'Santiago','Tomás','Unai','Vicente','Xavi','Andrés','Bruno',
    ], last:[
      'García','Martínez','López','Sánchez','Pérez','Gómez','Fernández','Ruiz','Díaz','Moreno','Álvarez',
      'Romero','Navarro','Torres','Domínguez','Gil','Vázquez','Serrano','Blanco','Molina','Castro','Ortega',
      'Rubio','Marín','Sanz','Núñez','Iglesias','Medina','Cortés','Garrido','Santos','Lozano','Cano',
      'Prieto','Méndez','Cruz','Calvo','Gallego','Vidal','León','Herrera','Peña','Cabrera','Campos','Reyes',
      'Vega','Fuentes','Carrasco','Soler','Pardo',
    ] },
    Portugal:{ first:[
      'João','Miguel','Rui','Tiago','Bruno','Diogo','Ricardo','Nuno','Pedro','André','Gonçalo','Rafael',
      'Hugo','Fábio','Duarte','Afonso','Alexandre','Bernardo','Carlos','Daniel','David','Dinis','Eduardo',
      'Fernando','Filipe','Francisco','Gabriel','Gil','Gustavo','Henrique','Ivo','Jorge','Leandro','Luís',
      'Manuel','Marco','Mário','Martim','Nelson','Paulo','Renato','Roberto','Rodrigo','Salvador','Samuel',
      'Sérgio','Simão','Tomás','Vasco','Vítor',
    ], last:[
      'Silva','Santos','Ferreira','Pereira','Oliveira','Costa','Rodrigues','Martins','Jesus','Sousa',
      'Fernandes','Gonçalves','Gomes','Lopes','Marques','Alves','Almeida','Ribeiro','Pinto','Carvalho',
      'Teixeira','Moreira','Correia','Mendes','Nunes','Soares','Vieira','Monteiro','Cardoso','Rocha',
      'Neves','Coelho','Cruz','Cunha','Pires','Ramos','Reis','Antunes','Barbosa','Branco','Campos','Duarte',
      'Faria','Freitas','Leite','Matos','Nogueira','Pacheco','Queirós','Tavares',
    ] },
    Argentina:{ first:[
      'Martín','Franco','Nicolás','Iván','Gonzalo','Agustín','Matías','Joaquín','Tomás','Julián','Facundo',
      'Lautaro','Santiago','Emiliano','Ezequiel','Leandro','Maximiliano','Federico','Cristian','Bruno',
      'Ramiro','Thiago','Valentín','Lisandro','Nahuel','Alan','Brian','Damián','Enzo','Gastón','Hernán',
      'Ignacio','Juan','Kevin','Lucas','Marcos','Nicolas','Pablo','Rodrigo','Sebastián','Tobías','Ulises',
      'Vicente','Walter','Ariel','Braian','Cristofer','Dylan','Elías','Fabricio',
    ], last:[
      'Gómez','Fernández','Rodríguez','Sosa','Díaz','Romero','Torres','Núñez','Acosta','Ramírez','Vega',
      'Cabrera','Godoy','Molina','Ortiz','Benítez','Aguirre','Suárez','Ibáñez','Herrera','Castro','Flores',
      'Rojas','Medina','Silva','Álvarez','Bustos','Cáceres','Domínguez','Escobar','Figueroa','Gutiérrez',
      'Juárez','Ledesma','Luna','Maidana','Miranda','Moyano','Ojeda','Peralta','Quiroga','Ríos','Ruiz',
      'Salvatierra','Tévez','Vera','Villalba','Zárate','Arias','Bravo',
    ] },
    Uruguai:{ first:[
      'Diego','Sebastián','Rodrigo','Federico','Nicolás','Mathías','Facundo','Gastón','Martín','Bruno',
      'Camilo','Emiliano','Fabián','Gonzalo','Ignacio','Joaquín','Leandro','Lucas','Manuel','Maximiliano',
      'Nahuel','Pablo','Rafael','Renzo','Santiago','Thiago','Agustín','Alejandro','Andrés','Brian',
      'Cristian','Damián','Emanuel','Franco','Guillermo','Hernán','Jonathan','Juan','Kevin','Marcelo',
      'Matías','Mauricio','Nicolas','Óscar','Ramiro','Rubén','Sergio','Tomás','Valentín','Walter',
    ], last:[
      'Pereira','Rodríguez','Fernández','González','Silva','Martínez','Sánchez','Techera','Cabrera',
      'Olivera','Suárez','Núñez','Píriz','Viera','Correa','Machado','Barrios','Duarte','Méndez','Ramos',
      'Vázquez','Acuña','Alonso','Bentancur','Cáceres','Castro','Coelho','Domínguez','Espinosa','Ferreira',
      'Figueredo','Gómez','Larrañaga','Lima','Lozano','Mederos','Mereles','Morales','Olivares','Peña',
      'Quintana','Rivero','Rossi','Sosa','Tabárez','Ubal','Varela','Vera','Zabala','Britos',
    ] },
    Chile:{ first:[
      'Matías','Benjamín','Vicente','Diego','Sebastián','Cristóbal','Ignacio','Felipe','Joaquín','Gabriel',
      'Bastián','Nicolás','Tomás','Martín','Agustín','Alonso','Andrés','Ángel','Antonio','Camilo','Carlos',
      'Claudio','César','Daniel','Eduardo','Emilio','Esteban','Fabián','Francisco','Gonzalo','Hernán',
      'Hugo','Iván','Javier','Jorge','José','Juan','Leandro','Lucas','Luis','Manuel','Marco','Mauricio',
      'Miguel','Nelson','Óscar','Pablo','Patricio','Rodrigo','Víctor',
    ], last:[
      'González','Muñoz','Rojas','Díaz','Pérez','Soto','Contreras','Silva','Martínez','Sepúlveda','Morales',
      'Rodríguez','López','Fuentes','Hernández','Torres','Araya','Flores','Espinoza','Valenzuela',
      'Castillo','Tapia','Reyes','Gutiérrez','Castro','Vargas','Álvarez','Vásquez','Sánchez','Fernández',
      'Ramírez','Carrasco','Riquelme','Miranda','Cortés','Herrera','Guzmán','Aguilera','Cáceres','Bravo',
      'Vera','Salazar','Ortiz','Pizarro','Vergara','Escobar','Alarcón','Cañas','Bustos','Leiva',
    ] },
    Peru:{ first:[
      'Luis','Carlos','José','Jorge','Miguel','Christian','Diego','Sergio','Renato','Piero','Alexander',
      'Aldo','André','Ángel','Antonio','Bruno','César','Cristian','Daniel','Edison','Eduardo','Erick',
      'Fabio','Fernando','Franco','Gabriel','Gerson','Gianluca','Gonzalo','Gustavo','Hernán','Iván','Jean',
      'Jesús','Joel','Jhonny','Juan','Kevin','Leandro','Manuel','Marcos','Mauricio','Nilson','Óscar',
      'Pablo','Paolo','Raúl','Ricardo','Rodrigo','Sebastián',
    ], last:[
      'Quispe','Flores','Rojas','Vásquez','Ramos','Castillo','Sánchez','García','Chávez','Huamán','Torres',
      'Guerrero','Cueva','Advíncula','Zambrano','Aquino','Ballón','Benavente','Cabrera','Calderón',
      'Cárdenas','Carrillo','Concha','Córdova','Corzo','Díaz','Espinoza','Farfán','Gómez','Herrera','Lazo',
      'Loyola','Malca','Mendoza','Mora','Ortiz','Palacios','Peña','Ponce','Quiroz','Reyna','Ríos','Salazar',
      'Solano','Tapia','Ugarte','Valera','Vega','Villanueva','Zegarra',
    ] },
    'Colômbia':{ first:[
      'Juan','Carlos','Andrés','Santiago','Sebastián','Camilo','Nicolás','David','Julián','Miguel',
      'Alejandro','Álvaro','Brayan','Cristian','Daniel','Diego','Duván','Edwin','Emerson','Fabián','Felipe',
      'Fernando','Gustavo','Harold','Hernán','Jaime','Jefferson','Jhon','Johan','Jorge','José','Kevin',
      'Leonardo','Luis','Mateo','Mauricio','Michael','Óscar','Pablo','Rafael','Ricardo','Roberto','Rodrigo',
      'Samuel','Sergio','Steven','Víctor','Wilmar','Yeison','Yerry',
    ], last:[
      'Rodríguez','Gómez','González','Martínez','Ramírez','Moreno','Muñoz','Sánchez','Castro','Ospina',
      'Cárdenas','Quintero','Zapata','Arias','Mosquera','Palacios','Restrepo','Valencia','Vargas',
      'Hernández','Álvarez','Bedoya','Borja','Cadavid','Cortés','Cuesta','Duque','Escobar','Estupiñán',
      'Giraldo','Guerra','Hoyos','Jaramillo','Londoño','Marulanda','Mejía','Mena','Montoya','Murillo',
      'Navarro','Ortega','Perea','Pérez','Renteria','Riascos','Salazar','Sarmiento','Torres','Uribe',
      'Villa',
    ] },
    Equador:{ first:[
      'Ángel','Jhon','Christian','Michael','Carlos','Jefferson','Byron','Bryan','Dixon','Enner','Alan',
      'Alexander','Andrés','Anthony','Antonio','Ayrton','Cristian','Damián','Daniel','Diego','Édison',
      'Édson','Erick','Fernando','Franklin','Gabriel','Gonzalo','Gustavo','Hernán','Jackson','Jaime',
      'Javier','Jeremy','Jhonny','Joao','Joffre','Jordy','Jorge','José','Juan','Kevin','Leonardo','Luis',
      'Marcos','Mario','Miguel','Nilson','Óscar','Pedro','Washington',
    ], last:[
      'Valencia','Castillo','Preciado','Caicedo','Quiñónez','Mena','Angulo','Arroyo','Ayoví','Bagüí',
      'Bolaños','Cabezas','Campana','Carabalí','Cazares','Congo','Corozo','Delgado','Espinoza','Estupiñán',
      'Franco','Gruezo','Guagua','Hurtado','Ibarra','Jiménez','Klinger','Lastra','Loor','Mendoza','Minda',
      'Montaño','Morales','Nazareno','Ordóñez','Ortiz','Palacios','Perlaza','Plata','Quintero','Ramírez',
      'Reasco','Rodríguez','Sánchez','Solís','Tenorio','Torres','Vargas','Vera','Zambrano',
    ] },
    Paraguai:{ first:[
      'Óscar','Julio','Miguel','Gustavo','Hernán','Ángel','Derlis','Antonio','Alberto','Alejandro','Ariel',
      'Blas','Braian','Carlos','César','Cristian','Dante','Diego','Édgar','Enzo','Fabián','Fernando',
      'Gabriel','Gonzalo','Guillermo','Iván','Javier','Jorge','José','Juan','Junior','Luis','Marcelo',
      'Marcos','Mathias','Matías','Nelson','Néstor','Osmar','Pablo','Pedro','Ramón','Raúl','Ricardo',
      'Roberto','Rodrigo','Rubén','Santiago','Sergio','Víctor',
    ], last:[
      'González','Benítez','Martínez','Villalba','Ramírez','Ortiz','Cáceres','Duarte','Giménez','Fernández',
      'Rojas','Aquino','Alonso','Ayala','Barrios','Bobadilla','Cabañas','Cardozo','Centurión','Chávez',
      'Colmán','Delgado','Domínguez','Escobar','Espínola','Fariña','Ferreira','Franco','Galeano','Godoy',
      'Gómez','Insfrán','Larrosa','Lezcano','López','Maciel','Medina','Mendoza','Núñez','Ojeda','Paredes',
      'Pérez','Recalde','Riveros','Riquelme','Samudio','Sanabria','Torres','Valdez','Vera',
    ] },
    Venezuela:{ first:[
      'Salomón','Yeferson','Darwin','Josef','Jhon','Rómulo','Alejandro','Ángel','Anthony','Carlos','César',
      'Christian','Cristian','Daniel','David','Edson','Eduard','Eduardo','Fernando','Francisco','Gabriel',
      'Gelmin','Gustavo','Héctor','Jefferson','Jesús','Johan','John','Jorge','José','Juan','Junior',
      'Leonardo','Luis','Manuel','Mario','Miguel','Nahuel','Nelson','Óscar','Pablo','Pedro','Rafael',
      'Ricardo','Roberto','Rolf','Ronald','Samuel','Sergio','Wuilker','Yangel',
    ], last:[
      'Rondón','Machís','Rincón','Martínez','Osorio','Otero','Bello','Casseres','Chancellor','Contreras',
      'Faríñez','Ferraresi','Figuera','Flores','González','Guerra','Guzmán','Hernández','Herrera','Jiménez',
      'Lucena','Manzano','Marrufo','Mago','Medina','Mendoza','Moreno','Navarro','Ortiz','Peñaranda','Pérez',
      'Ramírez','Rivas','Rivero','Rodríguez','Rojas','Romo','Rosales','Ruiz','Sánchez','Sanabria',
      'Savarino','Segovia','Sosa','Soteldo','Suárez','Torres','Vargas','Velázquez','Vielma',
    ] },
    'Bolívia':{ first:[
      'Marcelo','Carlos','Juan','Luis','Diego','Ramiro','Erwin','Bruno','Alejandro','Álvaro','Ariel',
      'Bernardo','Boris','Christian','Cristhian','Danny','Dario','Edemir','Edson','Efraín','Enrique',
      'Fernando','Gabriel','Gilbert','Henry','Iván','Jaime','Jairo','Javier','Jhon','Jorge','José','Julio',
      'Leonardo','Lucas','Marco','Mario','Martín','Miguel','Moisés','Nelson','Óscar','Pablo','Roberto',
      'Rodrigo','Rubén',
    ], last:[
      'Arce','Justiniano','Vaca','Chumacero','Saucedo','Céspedes','Melgar','Flores','Quispe','Mamani','Alí',
      'Álvarez','Aponte','Ballivián','Bejarano','Bruno','Cabrera','Callaú','Campos','Cardozo','Castro',
      'Chávez','Choque','Cuéllar','Encinas','Fernández','Gutiérrez','Haquin','Lampe','Lima','Machado',
      'Mendoza','Menacho','Miranda','Montaño','Moreno','Ortiz','Paniagua','Peredo','Pinedo','Ribera',
      'Rojas','Roca','Salvatierra','Sánchez','Suárez','Terceros','Vargas','Zambrana',
    ] },
    _hispano:{ first:[
      'Martín','Diego','Franco','Nicolás','Iván','Bruno','Gonzalo','Sebastián','Rodrigo','Emiliano','Cristian',
      'Federico','Agustín','Maximiliano','Ezequiel','Leandro','Matías','Joaquín','Tomás','Julián','Rafael',
      'Andrés','Carlos','Luis','Pedro'],
      last:[
      'Gómez','Fernández','Rodríguez','Sosa','Díaz','Romero','Torres','Núñez','Silva','Acosta','Ramírez','Vega',
      'Cabrera','Godoy','Molina','Ortiz','Benítez','Aguirre','Suárez','Ibáñez','Herrera','Castro','Flores',
      'Rojas','Medina'] },
  };
  /* ===== NOMES FICTICIOS DOS ESTRANGEIROS, CALCULADOS =====
     Os 1.900 brasileiros sao renomeados por PACOTE: o painel edita, o banco guarda, o boot
     aplica. Para os 9.832 de fora esse caminho foi medido e recusado -- o pacote e' baixado por
     todo cliente no arranque e pesa hoje 106 KB; as 352 linhas de elenco fariam dele 576 KB, uma
     descarga 5,4x maior em cada primeira visita, para dados que ninguem vai editar clube a clube.

     Entao o nome nao viaja: nasce aqui, do mesmo pool do pais, por uma semente estavel
     (club_id + indice no elenco). Duas maquinas chegam ao mesmo nome sem combinarem nada, e nao
     ha' payload nenhum.

     O SERVIDOR HERDA DE GRACA. Ele nunca le os bundles -- trabalha sobre `S.squads`, que o
     cliente publica ja' renomeado. E' exatamente como o pacote brasileiro ja' funciona: o
     resolve-round nao sabe que ele existe.

     AS TRE^S REGRAS DE COMPRIMENTO sao as do conjunto brasileiro, o unico que ja' provou caber
     nas telas: duas palavras, palavra ate' 11 caracteres, nome ate' 21. O bundle tem hoje nomes
     de 45 ("Bernardo Fernandes da Silva Junior") e ha' slots sem reticencias, onde isso estoura.

     NINGUEM REAL: um sorteio que calhe de dar um nome que existe no bundle e' rejeitado -- o pool
     ingles tem "Declan" e tem "Rice", e a combinacao sairia sozinha mais cedo ou mais tarde. */
  var INTL_MAX_PALAVRA=11, INTL_MAX_NOME=21;
  function intlSemente(s){ var h=2166136261>>>0;
    for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; }
    return h||1; }
  function intlRng(seed){ var x=seed; return function(){
    x^=x<<13; x>>>=0; x^=x>>17; x^=x<<5; x>>>=0; return x/4294967296; }; }
  /* `usados` e `reais` sao Sets que o chamador mantem entre clubes — e' o que garante nome
     unico no mundo inteiro, e nao apenas dentro de um elenco. */
  function nomeFicticioIntl(pais, chave, usados, reais){
    var pool=nomesDoPais(pais)||NAME_POOLS._hispano;
    var R=intlRng(intlSemente(chave));
    for(var t=0;t<4000;t++){
      var f=pool.first[Math.floor(R()*pool.first.length)];
      var l=pool.last [Math.floor(R()*pool.last .length)];
      if(f.length>INTL_MAX_PALAVRA || l.length>INTL_MAX_PALAVRA) continue;
      var nome=f+' '+l;
      if(nome.length>INTL_MAX_NOME) continue;
      var k=nome.toLowerCase();
      if((usados&&usados.has(k)) || (reais&&reais.has(k))) continue;
      if(usados) usados.add(k);
      return nome;
    }
    return null;
  }
  /* Renomeia os elencos de um mapa pais -> [clubes], NO LUGAR. Idempotente pelo carimbo
     `_nIntl` em cada jogador: o pacote e' aplicado duas vezes por visita (cache e rede) e uma
     segunda passagem daria nomes diferentes. */
  function renomearIntl(mapas){
    var usados=new Set(), reais=new Set(), n=0;
    mapas.forEach(function(m){ for(var pais in m) (m[pais]||[]).forEach(function(c){
      (c.squad||[]).forEach(function(p){ if(p&&p.n) reais.add(p.n.toLowerCase()); }); }); });
    mapas.forEach(function(m){ for(var pais in m) (m[pais]||[]).forEach(function(c){
      (c.squad||[]).forEach(function(p,i){
        if(!p || !p.n || p._nIntl) return;
        var novo=nomeFicticioIntl(pais, String(c.id)+'|'+i, usados, reais);
        if(!novo) return;
        p._n0=p._n0||p.n; p.n=novo; p._nIntl=1; n++;
      }); }); });
    return n;
  }

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

  const API={ PADRAO, uniCfg, uniDoEstado, paisesVivos, nivelDaDivisao, divisoesDe,
    tamanhoDaDivisao, sobemDaDivisao, descemDaDivisao,
    BANDA_POR_NIVEL, FORCA_POR_NIVEL, CAP_POR_NIVEL,
    bandaDaDivisao, forcaDaDivisao, capDaDivisao, bandaDaDivisaoSemPais, tabelasDoUniverso,
    CONFEDERACOES, COPA_NACIONAL, nomeDoPais, confederacaoDe, copasContinentaisDe, copasDe,
    vagasContinentais, NAME_POOLS, nomesDoPais, nacionalidadeDe, codigoDaLiga,
    nomeFicticioIntl, renomearIntl };
  root.WORLD_CONFIG=API;
  if(typeof module!=='undefined' && module.exports){ module.exports=API; }
})(typeof globalThis!=='undefined'?globalThis:this);
