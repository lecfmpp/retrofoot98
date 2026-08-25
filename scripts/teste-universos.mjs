/* CONFERÊNCIA DA PIRÂMIDE DE PAÍS.
   O `resolve-round` tinha a pirâmide brasileira congelada em seis tabelas, com o comentário
   "Config brasileira (Resenha = sempre Brasil)". Elas passaram a sair de UNIVERSOS +
   world-config.js, indexadas pelo NÍVEL na pirâmide em vez da letra da divisão.

   ESTE ARQUIVO EXISTE PARA PROVAR UMA COISA: **o Brasil não mudou**. Uma generalização que
   altere o que já está no ar não é generalização, é regressão — e a virada de temporada roda uma
   vez a cada 38 jornadas, então um erro aqui só apareceria em dezembro.

   Uso:  node scripts/teste-universos.mjs   (sai 1 se algo divergir) */
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
require(resolve(raiz, 'public/src/data/universos.js'));
require(resolve(raiz, 'public/src/engine/world-config.js'));
const W = globalThis.WORLD_CONFIG, U = globalThis.UNIVERSOS;

let falhas = 0;
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function conferir(nome, obtido, esperado) {
  if (igual(obtido, esperado)) return;
  falhas++;
  console.log('  ✘ ' + nome + '\n      obtido:   ' + JSON.stringify(obtido) + '\n      esperado: ' + JSON.stringify(esperado));
}

/* ===== 1. O BRASIL, BYTE A BYTE =====
   Os valores abaixo são cópia literal do que estava escrito no resolve-round antes da mudança.
   Não derive nada aqui: o valor deste teste está em ser uma transcrição independente. */
console.log('1. Brasil idêntico ao que estava congelado no servidor');
const br = W.tabelasDoUniverso('brasil');
conferir('DIV_ORDER',            br.ordem, ['A', 'B', 'C', 'D']);
conferir('DIVISION_SIZE',        br.size,  { A: 20, B: 20, C: 20, D: 20 });
conferir('DIVISION_PROMO',       br.promo, { A: 0, B: 4, C: 4, D: 4 });
conferir('DIVISION_RELEG',       br.releg, { A: 4, B: 4, C: 4, D: 0 });
conferir('DIVISION_FORCE_RANGE', br.forca, { A: [58, 88], B: [58, 80], C: [52, 74], D: [48, 68] });
conferir('DIV_FORCE_CAP (nível 1..3)', { B: br.cap.B, C: br.cap.C, D: br.cap.D }, { B: 37, C: 24, D: 12 });

/* ===== 2. O MAPA DE BANDAS ESCRITO À MÃO =====
   `BAND_BY_DIV` existia em DUAS cópias (rebalance.js e resolve-round) e cobria seis países.
   A derivação por nível tem de reproduzi-lo entrada por entrada. */
console.log('2. Banda por nível reproduz o mapa manual, entrada por entrada');
const MAPA_ANTIGO = { A:'A',B:'B',C:'C',D:'D', PL:'A',ES:'A',IT:'A',DE:'A',PT:'A', CH:'B',ES2:'B',IT2:'B',DE2:'B',PT2:'B' };
Object.keys(MAPA_ANTIGO).forEach((div) => conferir('banda de ' + div, W.bandaDaDivisaoSemPais(div), MAPA_ANTIGO[div]));

/* ===== 3. TODO PAÍS RESOLVE — é o ponto da mudança =====
   Nenhum dos 15 pode devolver tabela vazia, nível negativo ou tamanho zero. É o que faz um país
   novo criado no painel admin funcionar sem tocar em código. */
console.log('3. Os ' + Object.keys(U).length + ' países resolvem');
Object.keys(U).forEach((k) => {
  const t = W.tabelasDoUniverso(k);
  if (!t.ordem.length) { falhas++; console.log('  ✘ ' + k + ': sem divisões'); return; }
  t.ordem.forEach((d, i) => {
    if (W.nivelDaDivisao(k, d) !== i) { falhas++; console.log('  ✘ ' + k + '/' + d + ': nível ' + W.nivelDaDivisao(k, d) + ', esperado ' + i); }
    if (!(t.size[d] > 1)) { falhas++; console.log('  ✘ ' + k + '/' + d + ': tamanho ' + t.size[d]); }
    if (!Array.isArray(t.forca[d]) || t.forca[d].length !== 2) { falhas++; console.log('  ✘ ' + k + '/' + d + ': faixa de força inválida'); }
  });
});

/* ===== 4. INGLATERRA, O CASO CONCRETO =====
   Duas divisões de tamanhos diferentes (20 e 24) — é o que a pirâmide brasileira não sabia
   representar. E era aqui que o cliente entregava a faixa de força da Série D para a Premier
   League, porque DIVISION_FORCE_RANGE['PL'] era undefined. */
console.log('4. Inglaterra: 2 divisões, 20 e 24 clubes, faixas certas');
const en = W.tabelasDoUniverso('Inglaterra');
conferir('ordem',  en.ordem, ['PL', 'CH']);
conferir('tamanho', en.size, { PL: 20, CH: 24 });
conferir('sobe/desce', { sobe: en.promo.CH, desce: en.releg.PL }, { sobe: 3, desce: 3 });
conferir('força da PL (1ª divisão, não Série D)', en.forca.PL, [58, 88]);
conferir('força da CH (2ª divisão)', en.forca.CH, [58, 80]);

/* ===== 5. ESTADO SEM PAÍS = BRASIL =====
   Toda sala criada até agosto/2026 não tem `intlUniverse` no shared_state. Ela é brasileira, e
   tem de continuar a ser sem migração nenhuma. */
console.log('5. Estado sem país cai em Brasil');
conferir('sem campo',   W.uniDoEstado({}), 'brasil');
conferir('estado nulo', W.uniDoEstado(null), 'brasil');
conferir('com campo',   W.uniDoEstado({ intlUniverse: 'Inglaterra' }), 'Inglaterra');

/* ===== 6. AS COPAS DE CADA PAÍS =====
   Reprodução literal do que `allCupKeys()`/`groupCupKeys()` (core.js) devolviam antes de
   delegarem à folha. O servidor assumia Libertadores/Sul-Americana em seis lugares — um save
   inglês remontava a Libertadores em vez da Champions. */
console.log('6. Copas por país reproduzem allCupKeys()/groupCupKeys()');
const antigoAll = (k) => {
  const cfg = U[k] || {};
  if (cfg.src === 'conmebol') return ['libertadores', 'sulamericana'];
  return k !== 'brasil' ? ['championsLeague', 'europaLeague'] : ['copaBrasil', 'libertadores', 'sulamericana'];
};
const antigoGrupo = (k) => {
  const cfg = U[k] || {};
  return (k !== 'brasil' && cfg.src !== 'conmebol') ? ['championsLeague', 'europaLeague'] : ['libertadores', 'sulamericana'];
};
Object.keys(U).forEach((k) => {
  conferir('copas de ' + k, W.copasDe(k), antigoAll(k));
  conferir('copas de grupo de ' + k, W.copasContinentaisDe(k), antigoGrupo(k));
});

/* As vagas continentais eram 6 e 6 fixos no servidor; a tabela por país já existia no cliente
   (LIB_SLOTS_UNI/SUL_SLOTS_UNI, core.js). Transcrita aqui — nenhum país pode ficar sem vaga. */
console.log('7. Vagas continentais por país');
const LIB_ANTIGO = { 'Brasil':6,'Argentina':6,'Colômbia':4,'Chile':3,'Uruguai':3,'Peru':3,'Equador':2,'Paraguai':2,'Venezuela':2,'Bolívia':1 };
const SUL_ANTIGO = { 'Brasil':6,'Argentina':5,'Colômbia':4,'Chile':3,'Uruguai':3,'Peru':3,'Equador':2,'Paraguai':2,'Venezuela':2,'Bolívia':2 };
Object.keys(U).forEach((k) => {
  const nome = W.nomeDoPais(k), v = W.vagasContinentais(k);
  if (LIB_ANTIGO[nome] != null) conferir('vagas de ' + nome, v, [LIB_ANTIGO[nome], SUL_ANTIGO[nome]]);
  if (!(v[0] > 0 && v[1] > 0)) { falhas++; console.log('  ✘ ' + nome + ': vaga zerada — o país não teria representante'); }
});

/* ===== 8. NOMES, NACIONALIDADE E CÓDIGO DE LIGA =====
   O regen do servidor nascia sempre brasileiro — nome, `nat` e `lg`. `nat` decide se o jogador
   conta na cota de estrangeiros, então um regen inglês contava como estrangeiro no próprio país.
   O Brasil tem de continuar exatamente como estava. */
console.log('8. Identidade do jogador criado do zero');
const brNomes = W.nomesDoPais('brasil');
conferir('1º nome brasileiro', brNomes.first[0], 'Gabriel');
conferir('1º sobrenome brasileiro', brNomes.last[0], 'Silva');
conferir('nº de nomes/sobrenomes do Brasil', [brNomes.first.length, brNomes.last.length], [50, 40]);
conferir('nacionalidade do Brasil', W.nacionalidadeDe('brasil'), 'Brasil');
conferir('código de liga do Brasil', ['A', 'B', 'C', 'D'].map((d) => W.codigoDaLiga('brasil', d)), ['BRA-A', 'BRA-B', 'BRA-C', 'BRA-D']);
conferir('código de liga da Inglaterra', ['PL', 'CH'].map((d) => W.codigoDaLiga('Inglaterra', d)), ['ENG-1', 'ENG-2']);
conferir('nacionalidade da Inglaterra', W.nacionalidadeDe('Inglaterra'), 'England');
Object.keys(U).forEach((k) => {
  const p = W.nomesDoPais(k);
  if (!p || !p.first.length || !p.last.length) { falhas++; console.log('  ✘ ' + k + ': sem pool de nomes'); }
  if (!W.nacionalidadeDe(k)) { falhas++; console.log('  ✘ ' + k + ': sem nacionalidade'); }
});

console.log('');
if (falhas) { console.log('✘ ' + falhas + ' divergência(s)'); process.exit(1); }
console.log('✓ pirâmide de país íntegra — Brasil inalterado, 15 países resolvem');
