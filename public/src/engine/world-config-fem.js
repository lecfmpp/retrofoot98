/* ===================================================================
   A FOLHA FEMININA — o que o servidor também precisa saber.

   POR QUE É UM ARQUIVO NOVO. Mesma razão de `universos-fem.js`: `world-config.js` está no ar e
   fica com diff ZERO. Tudo aqui é ACRÉSCIMO a objetos que já existem — nenhuma função é
   reescrita nem envolvida.

   ESTA FOLHA VAI PARA O SERVIDOR. Como `world-config.js`, ela é injetada dentro do
   resolve-round por scripts/sync-world-rules.mjs. É isso que faz a virada de temporada de um
   save feminino nascer com nomes femininos: `makeRegen` já chama `nomesDoPais(UNI_ATIVO)`, e
   com `NAME_POOLS.brasilFem` registrado ele acha o pool certo sem uma linha de TypeScript.

   OS POOLS SAÍDOS DA PRÓPRIA BASE. Os 265 primeiros nomes e 63 sobrenomes são os que aparecem
   nas 1.900 jogadoras — 16.695 combinações. O número importa: `pickProcPlayerName` desiste
   depois de 400 tentativas e DEVOLVE NOME REPETIDO, e nome repetido corrompe artilharia e
   escalação, porque parte do motor ainda identifica jogador por nome.

   `_femHispano` é para as adversárias de Libertadores e Sul-Americana: os clubes argentinos e
   chilenos vêm de universos cuja modalidade é masculina, mas num mundo feminino quem entra em
   campo por eles são jogadoras.
   =================================================================== */
(function(root){
  'use strict';
  var W = root.WORLD_CONFIG;
  if(!W) return;   /* world-config.js tem de vir antes */

  /* A COPA DO BRASIL. Sem esta linha, `copasDe('brasilFem')` devolve só as duas continentais e
     o universo feminino joga uma temporada sem copa nacional — foi o que o primeiro teste
     mostrou. */
  if(W.COPA_NACIONAL) W.COPA_NACIONAL.brasilFem = 'copaBrasil';

  if(W.NAME_POOLS){
    W.NAME_POOLS.brasilFem = {
      first:[
      "Beatriz","Luana","Carla","Roberta","Cristina","Yasmin","Ingrid","Simone",
      "Bruna","Tatiana","Vanessa","Jéssica","Bianca","Thaís","Adriana","Renata",
      "Patrícia","Gabriela","Franciele","Gislaine","Lorena","Sabrina","Michele","Giovana",
      "Viviane","Larissa","Vitória","Talita","Paula","Daniela","Valentina","Helena",
      "Jaqueline","Fabiana","Camila","Carolina","Kelly","Sandra","Elaine","Márcia",
      "Luíza","Natália","Eduarda","Débora","Flávia","Karina","Amanda","Rafaela",
      "Ana","Fernanda","Priscila","Juliana","Aline","Letícia","Mariana","Raquel",
      "Nathalia","Denise","Maria","Isabela","Antonella","Rocío","Lucía","Brisa",
      "Khadija","Micaela","Rê","Adrizinha","Cami","Kaki","Flá","Ingridzinha",
      "Isa","Danizinha","Tati","Debinha","Lalá","Bibi","Gis","Lari",
      "Carlita","Grid","Bebeta","Gabi","Gabizinha","Mandinha","Lorenzinha","Yas",
      "Rafaella","Leninha","Gigi","Sanzinha","Fabi","Cris","Mari","Luaninha",
      "Mariazinha","Driele","Bela","Pri","Marci","Vale","Lane","Debs",
      "Prisci","Tali","Yasminha","Denizinha","Taisinha","Flavinha","Ali","Sandrinha",
      "Ju","Vitinha","Brunete","Binha","Lu","Marcinha","Bru","Lainha",
      "Paulinha","Vaninha","Michelinha","Simoninha","Mi","Lelê","Leonor","Raquelzinha",
      "Ximena","Vanê","Patyzinha","Ticinha","Renatinha","Rafinha","Manda","Isabella",
      "Carolzinha","Pauly","Florencia","Carlinha","Carol","Bi","Vivizinha","Lena",
      "Marizinha","Catalina","Nathalinha","Fabizinha","Vivi","Tatá","Kazinha","Giovaninha",
      "Aninka","Mone","Talitinha","Jê","Cristininha","Rá","Jessizinha","Beá",
      "Nicole","Lô","Bia","Rita","Ngozi","Luizinha","Aninha","Kel",
      "Fefê","Jaquinha","Naty","Kellyzinha","Sabi","Sofía","Valezinha","Julieta",
      "Franzinha","Andrea","Paty","Milena","Julinha","Fran","Francisca","Robertinha",
      "Lulu","Nati","Dudinha","Míssil","Gislainezinha","Xerifa","Molecona","Maninha",
      "Alininha","Coruja","Nandinha","Rainha","Ventania","Fagulha","Cabeçuda","Gata",
      "Tempestade","Escorpiana","Pulguinha","Craque","Estopim","Platina","Faísca","Cobre",
      "Jaque","Aranhinha","Sereia","Estrela","Setinha","Espetinho","Magrinha","Trave",
      "Coelhinha","Fúria","Pedra","Foguetona","Ciclone","Girafinha","Turbina","Turbo",
      "Cobrinha","Elástica","Loba","Borboleta","Foguetinha","Ourinha","Doida","Bolinha",
      "Besourinha","Tornado","Princesinha","Esmeralda","Onça","Peste","Fadinha","Bazuca",
      "Raiz","Danadinha","Vulcão","Ligeira","Trovoada","Vespa","Corça","Agulha",
      "Leoa","Lua","Pipoca","Bruxinha","Abelha","Barreira","Chama","Tigresa",
      "Guriazinha","Cometa","Docinho","Jaguara","Encrenqueira","Selvagem","Sorriso","Índia",
      "Ligeirinha"
      ],
      last:[
      "Barbosa","Freitas","Bezerra","Monteiro","Batista","Costa","Almeida","Peixoto",
      "Vieira","Araújo","Guimarães","Martins","Melo","Rodrigues","Tavares","Teixeira",
      "Nunes","Ferreira","Correia","Gomes","Santos","Machado","Siqueira","Lima",
      "Cavalcanti","Pereira","Andrade","Farias","Dias","Xavier","Silva","Oliveira",
      "Nascimento","Cardoso","Pinto","Ribeiro","Carvalho","Souza","Moreira","Rocha",
      "Muñoz","Esquivel","Benavídez","Castillo","Fonseca","Guerrero","Mendoza","Romero",
      "Flores","Benítez","Furtado","Marques","Martínez","Restrepo","Terán","Rojas",
      "Eze","Vargas","Viveros","Portilla","Baldé","Rodríguez","Aguirre"
      ]
    };
    W.NAME_POOLS._femHispano = {
      first:[
      "María","Camila","Valentina","Sofía","Daniela","Antonella","Martina","Lucía",
      "Agustina","Micaela","Florencia","Rocío","Julieta","Milagros","Paula","Carolina",
      "Andrea","Gabriela","Natalia","Belén","Ximena","Fernanda","Catalina","Constanza",
      "Javiera","Josefa","Renata","Emilia","Isidora","Trinidad","Yamila","Abril",
      "Delfina","Guadalupe","Malena"
      ],
      last:[
      "Gómez","Fernández","Rodríguez","Sosa","Díaz","Romero","Torres","Núñez",
      "Silva","Acosta","Ramírez","Vega","Cabrera","Godoy","Molina","Ortiz",
      "Benítez","Aguirre","Suárez","Ibáñez","Herrera","Castro","Flores","Rojas",
      "Medina"
      ]
    };
  }

  /* ---------- O EIXO, LIDO DE FORA ----------
     `base` e `modalidade` são campos do registro do universo (universos-fem.js). Estas duas
     funções são a única forma de lê-los, para que nenhum ponto do motor precise conhecer o nome
     'brasilFem'. Para TODO universo que existe hoje, `base(k)` devolve o próprio k e
     `modalidade(k)` devolve 'masc' — então trocar um literal 'brasil' por base(k)==='brasil' é
     idêntico por construção, e é isso que deixa a auditoria do motor ser segura. */
  function cfg(k){ var U = root.UNIVERSOS || {}; return U[k] || null; }
  root.RF_FEM = {
    base: function(k){ var c = cfg(k); return (c && c.base) || k; },
    modalidade: function(k){ var c = cfg(k); return (c && c.modalidade) || 'masc'; },
    /* pool das adversárias continentais num mundo feminino: o país do CLUBE, mas a modalidade
       do MUNDO. Sem isto, a Libertadores feminina escalaria 'Gonzalo Fernández' pelo River. */
    poolFeminino: function(k){
      var P = (W.NAME_POOLS || {});
      return P[k + 'Fem'] || (k === 'brasil' ? P.brasilFem : null) || P._femHispano || P.brasilFem;
    }
  };

  if(typeof module!=='undefined' && module.exports){ module.exports={ RF_FEM:root.RF_FEM }; }
})(typeof globalThis!=='undefined'?globalThis:this);
