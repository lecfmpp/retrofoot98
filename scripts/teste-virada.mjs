/* BANCO DE PROVAS DA VIRADA DE TEMPORADA — do SERVIDOR, não do cliente.

   POR QUE EXISTE. A virada roda UMA VEZ a cada 38 jornadas e é o bloco mais perigoso do
   resolve-round: promoção, rebaixamento, aposentadoria, regen, copas novas. O harness de dois
   clientes (public/harness/) não a alcança — ele exercita o CLIENTE, e a virada é do servidor.
   Resultado: quando a pirâmide brasileira deixou de estar congelada e passou a sair de
   UNIVERSOS, não havia rede nenhuma. Um erro ali só apareceria em dezembro, com a sala dentro.

   COMO FUNCIONA. O index.ts é um módulo só, com duas importações e um punhado de usos de `Deno`.
   Aqui ele é lido, as importações e o `Deno.serve` são trocados por tocos, as funções internas
   são expostas e o resultado roda num contexto de Node. Não há cópia do código do servidor: o
   que se testa é o arquivo que vai para produção, tal e qual.

   Uso:  node scripts/teste-virada.mjs   (sai 1 se algo divergir) */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';
import { runInNewContext } from 'node:vm';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ALVO = resolve(raiz, 'supabase/functions/resolve-round/index.ts');

/* ---- carrega o resolve-round num contexto de Node ---- */
function carregarServidor() {
  let src = readFileSync(ALVO, 'utf8');
  src = src.replace(/^import .*$/gm, '');                       // as duas importações jsr:
  src = src.replace(/Deno\.serve\(/, '((globalThis).__naoServe = ');   // não sobe servidor nenhum
  src += `
;globalThis.__RR = { aplicarUniverso, resolveSeasonTurnover, computeDivisionSwap,
  rebuildContinentalCups, cupTotalRoundsS, makeScheduleT, makeBracketT, rbForce, bandKeyDiv,
  resolveLeagueRound, resolverPiramideDoPais, archiveSeasonT, backfillArchiveT,
  advanceBgLeaguesT, rollBgLeaguesSeasonT, bgTopStandingsT, materializeBgClubT,
  get DIV_ORDER(){ return DIV_ORDER; }, get DIVISION_SIZE(){ return DIVISION_SIZE; },
  get UNI_ATIVO(){ return UNI_ATIVO; } };`;
  const js = transformSync(src, { loader: 'ts', format: 'cjs' }).code;
  const ctx = {
    console, Math, Date, JSON, Object, Array, String, Number, Boolean, Set, Map, isFinite, parseInt, parseFloat,
    Deno: { env: { get: () => '' }, serve: () => {} },
    createClient: () => ({ from: () => ({ select: () => ({}) }) }),
    module: { exports: {} }, exports: {},
  };
  ctx.globalThis = ctx;
  runInNewContext(js, ctx);
  return ctx;
}

let falhas = 0;
function reprova(msg) { falhas++; console.log('  ✘ ' + msg); }
/* Um bloco que ESTOURA é uma reprovação, não um crash do banco de provas: quando a pirâmide sai
   errada, o mundo sintético do país nem existe e o acesso a S.otherDivs falha. Sem isto o teste
   morre com stack trace e os blocos seguintes nem rodam — verificado quebrando de propósito. */
function bloco(nome, fn) { try { fn(); } catch (e) { reprova(nome + ': estourou — ' + e.message); } }
function conferir(nome, obtido, esperado) {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) return;
  reprova(nome + '\n      obtido:   ' + JSON.stringify(obtido) + '\n      esperado: ' + JSON.stringify(esperado));
}

/* ---- um mundo sintético mínimo, mas completo o bastante para a virada rodar ---- */
function mundo(uniKey, universos, worldConfig) {
  const t = worldConfig.tabelasDoUniverso(uniKey);
  const S = {
    season: 1, seed: 12345, round: 0, division: t.ordem[0], intlUniverse: uniKey === 'brasil' ? undefined : uniKey,
    squads: {}, budgets: {}, clubOverall: {}, clubPool: {}, otherDivs: {}, table: {}, cups: {}, scorers: {},
  };
  if (uniKey === 'brasil') delete S.intlUniverse;      // sala antiga: o campo nem existe
  let n = 0;
  const clubesDe = (div) => {
    const ids = [];
    for (let i = 0; i < t.size[div]; i++) {
      const id = 'c' + (++n);
      ids.push(id);
      S.clubPool[id] = { id };
      S.clubOverall[id] = 70 - (worldConfig.nivelDaDivisao(uniKey, div) * 8) + (i % 5);
      S.squads[id] = [];
      for (let p = 0; p < 20; p++) {
        S.squads[id].push({ n: id + '-p' + p, pid: id + p, p: 'MC', s: 'MC', f: 60, rawF: 60, _div: div,
          age: 20 + (p % 16), mv: 1e6, moral: 70, energy: 100, attr: {}, stats: { r3: [], g3: [], apps: 0, goals: 0 } });
      }
      S.budgets[id] = 5e6;
    }
    return ids;
  };
  const tabela = (ids) => { const tb = {}; ids.forEach((id, i) => tb[id] = { id, P: 38, W: 38 - i, D: 0, L: i, GF: 60 - i, GA: 20 + i, Pts: (38 - i) * 3 }); return tb; };
  t.ordem.forEach((d, i) => {
    const ids = clubesDe(d);
    if (i === 0) { S.table = tabela(ids); S.sched = worldConfig ? [] : []; }
    else S.otherDivs[d] = { clubs: ids.map((id) => ({ id })), sched: [], table: tabela(ids) };
  });
  return S;
}

console.log('Banco de provas da virada de temporada (servidor real)\n');
const ctx = carregarServidor();
const RR = ctx.__RR;
const U = ctx.UNIVERSOS, W = ctx.WORLD_CONFIG;
if (!RR || !U || !W) { console.log('✘ não consegui carregar o resolve-round'); process.exit(1); }

/* ===== 1. O BRASIL VIRA A TEMPORADA COMO SEMPRE =====
   4 divisões de 20, sobem 4 e descem 4 entre divisões vizinhas. */
console.log('1. Brasil: 4 divisões de 20, sobe 4 / desce 4');
bloco('Brasil', () => {
  const S = mundo('brasil', U, W);
  RR.aplicarUniverso(S);
  conferir('universo ativo', RR.UNI_ATIVO, 'brasil');
  conferir('DIV_ORDER', RR.DIV_ORDER, ['A', 'B', 'C', 'D']);

  const antes = { A: Object.keys(S.table), B: S.otherDivs.B.clubs.map((c) => c.id) };
  const nova = RR.computeDivisionSwap(S);
  ['A', 'B', 'C', 'D'].forEach((d) => { if (nova[d].length !== 20) reprova('divisão ' + d + ' com ' + nova[d].length + ' clubes, esperado 20'); });
  // os 4 últimos da A caem; os 4 primeiros da B sobem
  const caem = antes.A.slice(-4), sobem = antes.B.slice(0, 4);
  caem.forEach((id) => { if (!nova.B.includes(id)) reprova('rebaixado ' + id + ' não está na B'); });
  sobem.forEach((id) => { if (!nova.A.includes(id)) reprova('promovido ' + id + ' não está na A'); });
  // ninguém em duas divisões ao mesmo tempo
  const todos = ['A', 'B', 'C', 'D'].flatMap((d) => nova[d]);
  if (new Set(todos).size !== todos.length) reprova('clube repetido em mais de uma divisão');
});

/* ===== 2. A INGLATERRA VIRA COM A PIRÂMIDE DELA =====
   2 divisões de tamanhos DIFERENTES (20 e 24) — o que a pirâmide congelada não sabia
   representar — e sobem/descem 3. */
console.log('2. Inglaterra: 2 divisões (20 e 24), sobe 3 / desce 3');
bloco('Inglaterra', () => {
  const S = mundo('Inglaterra', U, W);
  RR.aplicarUniverso(S);
  conferir('universo ativo', RR.UNI_ATIVO, 'Inglaterra');
  conferir('DIV_ORDER', RR.DIV_ORDER, ['PL', 'CH']);

  const antes = { PL: Object.keys(S.table), CH: S.otherDivs.CH.clubs.map((c) => c.id) };
  const nova = RR.computeDivisionSwap(S);
  conferir('tamanho da PL', nova.PL.length, 20);
  conferir('tamanho da CH', nova.CH.length, 24);
  antes.PL.slice(-3).forEach((id) => { if (!nova.CH.includes(id)) reprova('rebaixado ' + id + ' não está na CH'); });
  antes.CH.slice(0, 3).forEach((id) => { if (!nova.PL.includes(id)) reprova('promovido ' + id + ' não está na PL'); });
  const todos = nova.PL.concat(nova.CH);
  if (new Set(todos).size !== todos.length) reprova('clube repetido nas duas divisões');
});

/* ===== 3. UM PAÍS DE DIVISÃO ÚNICA NÃO QUEBRA =====
   CONMEBOL não tem pirâmide: ninguém sobe, ninguém desce, e a virada tem de passar. */
console.log('3. Argentina: divisão única, ninguém sobe nem desce');
bloco('Argentina', () => {
  const S = mundo('Argentina', U, W);
  RR.aplicarUniverso(S);
  conferir('DIV_ORDER', RR.DIV_ORDER, ['ARG']);
  const antes = Object.keys(S.table);
  const nova = RR.computeDivisionSwap(S);
  conferir('mesmos clubes, mesma ordem', nova.ARG.slice().sort(), antes.slice().sort());
});

/* ===== 4. A VIRADA INTEIRA RODA, NOS TRÊS PAÍSES =====
   Não é só o swap: é aposentadoria, regen, copas novas, calendário novo. E o que importa aqui é
   o que a mudança de país tocou — a copa nacional só existe onde há copa nacional, e os regens
   nascem com a nacionalidade certa. */
console.log('4. Virada completa: copa nacional e nacionalidade do regen');
for (const [uniKey, temCopaNacional, nat] of [['brasil', true, 'Brasil'], ['Inglaterra', false, 'England'], ['Argentina', false, 'Argentina']]) {
  const S = mundo(uniKey, U, W);
  RR.aplicarUniverso(S);
  try {
    RR.resolveSeasonTurnover(S, new Set());
  } catch (e) {
    reprova(uniKey + ': virada lançou — ' + e.message);
    continue;
  }
  conferir(uniKey + ': temporada avançou', S.season, 2);
  conferir(uniKey + ': rodada zerada', S.round, 0);
  const temCB = !!(S.cups && S.cups.copaBrasil);
  if (temCB !== temCopaNacional) reprova(uniKey + ': copaBrasil ' + (temCB ? 'criada' : 'ausente') + ', esperado o contrário');
  // regens: quem nasceu nesta virada tem de ter a nacionalidade do país
  const nascidos = [];
  Object.keys(S.squads).forEach((cid) => (S.squads[cid] || []).forEach((p) => { if (p.nat) nascidos.push(p.nat); }));
  const estranhas = Array.from(new Set(nascidos)).filter((x) => x !== nat);
  if (estranhas.length) reprova(uniKey + ': regen com nacionalidade ' + estranhas.join('/') + ', esperado ' + nat);
  if (!nascidos.length) console.log('      (' + uniKey + ': nenhum regen nesta semente — aposentadoria não disparou)');
}

/* ===== 5. UMA RODADA DE LIGA CONTINUA A ACONTECER =====
   `resolveLeagueRound` passou a iterar os países vivos em vez de resolver uma pirâmide só. Com um
   país vivo — que é toda sala existente — o laço tem de dar exatamente uma volta e o resultado
   tem de ser o de sempre. É a rede desta refatoração: a capacidade de iterar entra sem mexer no
   que já está no ar. */
console.log('5. Rodada de liga: um país vivo, uma volta, tudo joga');
bloco('rodada de liga', () => {
  const S = mundo('brasil', U, W);
  RR.aplicarUniverso(S);
  S.sched = RR.makeScheduleT(Object.keys(S.table));
  S.results = []; S.round = 0; S.week = 1; S.day = 1;
  const clubes = Object.keys(S.table);
  /* o mundo sintético vem com uma temporada INTEIRA jogada (é o que a virada precisa). Para medir
     UMA rodada, a tabela começa do zero — senão os 38 jogos anteriores entram na conta. */
  clubes.forEach((id) => { S.table[id] = { id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 }; });
  const antes = 0;
  RR.resolveLeagueRound(S, {}, new Set(), {}, {}, {});
  const jogosPorClube = clubes.map((id) => S.table[id].P);
  const depois = jogosPorClube.reduce((a, b) => a + b, 0);
  conferir('cada clube jogou uma vez', new Set(jogosPorClube).size === 1 && jogosPorClube[0] === 1, true);
  conferir('partidas somadas', depois - antes, clubes.length);
  conferir('a rodada avançou', S.round, 1);
  const daRodada = (S.results || []).filter((r) => r.round === 0);
  conferir('resultados gravados', daRodada.length, clubes.length / 2);
  // cada resultado sabe de que país é — é o que permite mais de uma pirâmide na mesma sala
  conferir('resultados carregam o país', daRodada.every((r) => r.pais === 'brasil'), true);
  // os pontos batem com os placares
  let ptsEsperados = 0;
  daRodada.forEach((r) => { ptsEsperados += (r.hg === r.ag) ? 2 : 3; });
  const ptsNaTabela = clubes.map((id) => S.table[id].Pts).reduce((a, b) => a + b, 0);
  conferir('pontos da tabela batem com os placares', ptsNaTabela, ptsEsperados);
});

/* ===== 6. DUAS PIRÂMIDES NA MESMA SALA =====
   É o fecho da Fase 5: um humano foi treinar noutro país, `criarMundoDoPais` montou o mundo de lá
   (S.mundos), e o resolvedor tem de fazer as DUAS andarem na mesma rodada — a do Brasil, onde os
   outros treinadores continuam, e a da Inglaterra, onde ele está agora. Se só uma andar, ou o
   inglês fica parado ou o campeonato dos outros para por causa da carreira dele. */
console.log('6. Duas pirâmides vivas: as duas andam na mesma rodada');
bloco('duas pirâmides', () => {
  const S = mundo('brasil', U, W);
  RR.aplicarUniverso(S);
  const zerar = (t) => { Object.keys(t).forEach((id) => t[id] = { id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 }); };
  S.sched = RR.makeScheduleT(Object.keys(S.table)); zerar(S.table);
  S.results = []; S.round = 0; S.week = 1; S.day = 1;

  // o mundo do segundo país, com a mesma forma da âncora — é o que criarMundoDoPais grava
  const ing = mundo('Inglaterra', U, W);              // reaproveita o construtor: dá clubes + elencos
  Object.keys(ing.squads).forEach((id) => S.squads[id] = ing.squads[id]);   // elencos são do jogo inteiro
  Object.keys(ing.clubOverall).forEach((id) => S.clubOverall[id] = ing.clubOverall[id]);
  const idsPL = Object.keys(ing.table);
  const tabPL = {}; idsPL.forEach((id) => tabPL[id] = { id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 });
  // a divisão de baixo do inglês (Championship) e a copa dele (Champions), como criarMundoDoPais monta
  const idsCH = Object.keys(ing.otherDivs.CH.table);
  const tabCH = {}; idsCH.forEach((id) => tabCH[id] = { id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 });
  const chave = RR.makeBracketT(idsPL.slice(0, 8), 12345, S.clubOverall);
  S.mundos = { Inglaterra: { pais: 'Inglaterra', division: 'PL',
    sched: RR.makeScheduleT(idsPL), table: tabPL,
    otherDivs: { CH: { clubs: idsCH.map((id) => ({ id })), sched: RR.makeScheduleT(idsCH), table: tabCH } },
    cups: { championsLeague: { group: null, bracket: chave } },
    cupCalendar: { _season: S.season, championsLeague: [0] } } };
  S.paisesVivos = ['brasil', 'Inglaterra'];
  const rodadaDaCopaAntes = chave.round;

  RR.resolveLeagueRound(S, {}, new Set(), {}, {}, {});

  const jogouBrasil = Object.keys(S.table).map((id) => S.table[id].P);
  const jogouIngl = idsPL.map((id) => S.mundos.Inglaterra.table[id].P);
  conferir('todo clube brasileiro jogou uma vez', new Set(jogouBrasil).size === 1 && jogouBrasil[0] === 1, true);
  conferir('todo clube inglês jogou uma vez', new Set(jogouIngl).size === 1 && jogouIngl[0] === 1, true);

  const doBrasil = (S.results || []).filter((r) => r.pais === 'brasil').length;
  const daIngl = (S.results || []).filter((r) => r.pais === 'Inglaterra').length;
  conferir('resultados do Brasil', doBrasil, Object.keys(S.table).length / 2);
  conferir('resultados da Inglaterra', daIngl, idsPL.length / 2);
  conferir('a rodada avançou uma vez só', S.round, 1);

  /* AS DIVISÕES DE BAIXO DO SEGUNDO PAÍS. Rodavam só na âncora: a Championship ficava parada
     enquanto a Premier jogava, e só se daria por isso na virada, com uma tabela de zeros. */
  const jogouCH = idsCH.map((id) => S.mundos.Inglaterra.otherDivs.CH.table[id].P);
  conferir('a Championship também jogou', new Set(jogouCH).size === 1 && jogouCH[0] === 1, true);

  /* AS COPAS DO SEGUNDO PAÍS. Rodavam só na âncora: a Champions do treinador inglês nunca
     avançava — ele veria a liga andar e a copa dele parada para sempre. */
  const chDepois = S.mundos.Inglaterra.cups.championsLeague.bracket;
  conferir('a Champions avançou de fase', chDepois.round > rodadaDaCopaAntes, true);
});

/* ===== 7. A TEMPORADA QUE FECHA VAI PARA O ARQUIVO, E NUNCA MAIS SAI =====
   O _prevSeason é buffer de uma temporada — a virada seguinte o sobrescreve. O S.archive é a
   memória permanente (checklist da virada, item 6): uma entrada por temporada, com as tabelas
   finais de todas as divisões. E o resgate (backfillArchiveT) tem de recuperar uma temporada
   fechada ANTES do archive existir, sem duplicar a que já está lá. */
console.log('7. Arquivo permanente: a virada arquiva, o resgate recupera, ninguém duplica');
bloco('arquivo permanente', () => {
  const S = mundo('brasil', U, W);
  RR.aplicarUniverso(S);
  S.scorersByComp = { A: { 'Zé Gol': 10 }, copaBrasil: { 'Tico': 4 } };   // o livro por competição da temporada
  RR.resolveSeasonTurnover(S, new Set());
  conferir('uma entrada no archive', (S.archive || []).length, 1);
  const arq = (S.archive || [])[0] || {};
  conferir('o ano arquivado é o que fechou', arq.season, 1);
  conferir('artilheiro por competição arquivado', (arq.artPorComp || {}).A, { nome: 'Zé Gol', gols: 10 });
  conferir('o livro por competição viaja na foto da virada', (S._prevSeason.scorersByComp || {}).copaBrasil, { 'Tico': 4 });
  conferir('o livro zera pra temporada nova', S.scorersByComp, {});
  ['A', 'B', 'C', 'D'].forEach((d) => {
    const n = ((arq.tables || {})[d] || []).length;
    if (n !== 20) reprova('divisão ' + d + ' arquivada com ' + n + ' linhas, esperado 20');
  });
  // segunda virada: o archive cresce, não sobrescreve
  RR.resolveSeasonTurnover(S, new Set());
  conferir('duas temporadas no archive', (S.archive || []).map((a) => a.season), [1, 2]);
  // resgate: sala que virou antes do archive existir (archive apagado, _prevSeason vivo)
  delete S.archive;
  RR.backfillArchiveT(S);
  conferir('resgate recuperou a temporada do _prevSeason', (S.archive || []).map((a) => a.season), [S._prevSeason.season]);
  const antes = S.archive.length;
  RR.backfillArchiveT(S);
  conferir('resgate é idempotente', S.archive.length, antes);
});

/* ===== 8. AS VAGAS DA LIBERTADORES OUVEM AS COPAS (regra do dono, 20-21/08) =====
   O campeão da Copa do Brasil (só ele — o vice NÃO leva vaga, ajuste de 21/08) e o campeão
   da Libertadores que fechou têm vaga na Libertadores seguinte — mesmo mal colocados na
   liga. A tabela completa o resto das 6 vagas, e ninguém ocupa vaga nas duas continentais. */
console.log('8. Vagas continentais: campeão da CdB e campeão da Libertadores têm vaga');
bloco('vagas continentais', () => {
  const S = mundo('brasil', U, W);
  RR.aplicarUniverso(S);
  const A = Object.keys(S.table);                       // c1..c20 já em ordem de tabela (1º..20º)
  const tie = (h, a, w) => ({ h, a, hg: 1, ag: 0, winner: w, events: [] });
  // estrangeiros reciclados, como no mundo real (26 por copa) — sem eles o fecho em múltiplo
  // de 4 (item 2) completaria as copas com mais brasileiros e as contas abaixo mudariam
  const estr = (pref, n) => { const out = [];
    for (let i = 1; i <= n; i++) { const id = pref + i; out.push(id);
      S.clubPool[id] = { id }; S.clubOverall[id] = 70;
      S.squads[id] = S.squads[A[0]].map((p, j) => ({ ...p, n: id + '-p' + j, pid: id + j })); }
    return out; };
  const gDe = (ids) => { const gr = {}; for (let i = 0; i < ids.length; i += 4) gr['G' + i] = { teams: ids.slice(i, i + 4) }; return gr; };
  // a edição anterior das continentais; o campeão da Libertadores é o 10º colocado — fora do G6 de propósito
  S.cups.libertadores = { group: { groups: gDe(A.slice(0, 6).concat(estr('exl', 26))) },
    bracket: { round: 3, roundsTotal: 3, ties: [], champion: A[9], eliminated: {}, history: [{ round: 3, ties: [tie(A[9], A[2], A[9])] }] } };
  // a Sula que fechou tem campeão ESTRANGEIRO (exs5): pela regra do dono ele SOBE pra Libertadores
  S.cups.sulamericana = { group: { groups: gDe(A.slice(6, 12).concat(estr('exs', 26))) },
    bracket: { round: 3, roundsTotal: 3, ties: [], champion: 'exs5', eliminated: {}, history: [{ round: 3, ties: [tie('exs5', 'exs6', 'exs5')] }] } };
  // Copa do Brasil decidida: campeão o 15º, vice o 18º — bem fora do G6
  S.cups.copaBrasil = { round: 2, roundsTotal: 2, ties: [], champion: A[14], eliminated: {},
    history: [{ round: 2, ties: [tie(A[14], A[17], A[14])] }] };
  RR.resolveSeasonTurnover(S, new Set());
  const doGrupo = (k) => { const g = (S.cups[k] && S.cups[k].group && S.cups[k].group.groups) || {};
    return Object.keys(g).flatMap((x) => g[x].teams || []); };
  const lib = doGrupo('libertadores'), sul = doGrupo('sulamericana');
  [[A[14], 'campeão da CdB'], [A[9], 'campeão da Libertadores']].forEach(([id, rot]) => {
    if (lib.indexOf(id) < 0) reprova(rot + ' (' + id + ') ficou fora da Libertadores nova');
    if (sul.indexOf(id) >= 0) reprova(rot + ' (' + id + ') também está na Sul-Americana');
  });
  conferir('o vice da CdB NÃO ganha vaga', lib.indexOf(A[17]) < 0, true);
  conferir('as vagas brasileiras continuam 6', lib.filter((id) => A.indexOf(id) >= 0).length, 6);
  conferir('o topo da tabela completa as vagas', [A[0], A[1], A[2], A[3]].every((id) => lib.indexOf(id) >= 0), true);
  conferir('a Sul-Americana fica com os melhores que sobraram', [A[4], A[5], A[6]].every((id) => sul.indexOf(id) >= 0), true);
  // o campeão estrangeiro da Sula subiu de copa — e as duas continuam fechando em múltiplo de 4
  conferir('campeão da Sula está na Libertadores nova', lib.indexOf('exs5') >= 0, true);
  conferir('campeão da Sula saiu da Sul-Americana', sul.indexOf('exs5') < 0, true);
  conferir('as duas copas fecham em múltiplo de 4', lib.length % 4 === 0 && sul.length % 4 === 0, true);
});

/* ===== 9. NADA DE GRUPO DE 3 (checklist da virada, item 2) =====
   O cenário real da sala WEBLG: a edição 2026 da Sul-Americana tem 7 brasileiros + 25
   estrangeiros; na remontagem a cota brasileira é 6, então 6 + 25 = 31 e o grupo H saía
   com 3 clubes — para sempre. Agora o total fecha em múltiplo de 4, completando com o
   próximo da tabela. */
console.log('9. Sul-Americana fecha em múltiplo de 4: o grupo de 3 não volta');
bloco('grupo de 3', () => {
  const S = mundo('brasil', U, W);
  RR.aplicarUniverso(S);
  const A = Object.keys(S.table);
  const forasteiros = [];
  for (let i = 1; i <= 25; i++) { const id = 'ext' + i; forasteiros.push(id);
    S.clubPool[id] = { id }; S.clubOverall[id] = 70;
    S.squads[id] = S.squads[A[0]].map((p, j) => ({ ...p, n: id + '-p' + j, pid: id + j }));
  }
  const g = (ids) => { const gr = {}; for (let i = 0; i < ids.length; i += 4) gr['G' + i] = { teams: ids.slice(i, i + 4) }; return gr; };
  // edição anterior: 7 brasileiros (7º-13º) + 25 estrangeiros na Sula — o formato real de 2026
  S.cups.sulamericana = { group: { groups: g(A.slice(6, 13).concat(forasteiros)) }, bracket: null };
  S.cups.libertadores = { group: { groups: g(A.slice(0, 6)) }, bracket: null };
  RR.resolveSeasonTurnover(S, new Set());
  ['libertadores', 'sulamericana'].forEach((k) => {
    const gs = (S.cups[k] && S.cups[k].group && S.cups[k].group.groups) || {};
    const tam = Object.keys(gs).map((x) => (gs[x].teams || []).length);
    if (!tam.length) { reprova(k + ' não foi remontada'); return; }
    tam.forEach((n) => { if (n !== 4) reprova(k + ' remontada com grupo de ' + n + ' clubes'); });
  });
  const sulTeams = Object.keys(S.cups.sulamericana.group.groups).flatMap((x) => S.cups.sulamericana.group.groups[x].teams);
  conferir('a Sul-Americana fechou em 32 (31 + o próximo da tabela)', sulTeams.length, 32);
});

/* ===== 10. AS LIGAS DE FUNDO RODAM NO SERVIDOR E DÃO AS VAGAS REAIS (item 4) =====
   Um país de fundo sintético (Argentina, 4 clubes) anda rodada a rodada com artilharia no
   pool, vira a temporada com história, e a remontagem das copas usa a CLASSIFICAÇÃO dele
   (cota real) em vez da reciclagem — materializando do elenco compacto quem o mundo não
   conhecia. O arquivo ganha campeão/artilheiro/tabela do país. */
console.log('10. Ligas de fundo no servidor: tabela, artilharia, vagas reais e arquivo');
bloco('ligas de fundo', () => {
  const S = mundo('brasil', U, W);
  RR.aplicarUniverso(S);
  const A = Object.keys(S.table);
  const arg = ['arg1', 'arg2', 'arg3', 'arg4'];
  const tb = {}; arg.forEach((id) => tb[id] = { id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 });
  S.bgLeagues = { 'Argentina': { universe: 'Argentina', uniKey: 'Argentina',
    divs: { ARG: { clubIds: arg.slice(), sched: RR.makeScheduleT(arg.slice()), table: tb } },
    ov: { arg1: 90, arg2: 75, arg3: 65, arg4: 55 },
    pool: { arg1: [['Craque Uno', 140], ['Meia Dos', 60]], arg2: [['Nueve Tres', 120]] },
    elencos: { arg1: Array.from({ length: 18 }, (_, i) => ['Arg1 J' + i, 'MC', i < 6 ? 'ATT' : 'MID', 60, 25, 2e6]),
               arg2: Array.from({ length: 18 }, (_, i) => ['Arg2 J' + i, 'MC', 'MID', 55, 26, 1e6]) },
    scorers: {}, allTimeScorers: {}, history: [], season: 1 } };
  for (let r = 0; r < 6; r++) RR.advanceBgLeaguesT(S, r);
  const L = S.bgLeagues['Argentina'];
  const jogaram = Object.values(L.divs.ARG.table).every((t) => t.P === 6);
  conferir('todo clube argentino jogou 6 rodadas', jogaram, true);
  conferir('a artilharia estatística existe', Object.keys(L.scorers).length > 0, true);
  const standings = RR.bgTopStandingsT(S, 'Argentina');
  conferir('há classificação real', Array.isArray(standings) && standings.length === 4, true);
  // continentais da edição anterior (reciclagem viraria a fonte se não houvesse bgLeagues)
  const gDe = (ids) => { const gr = {}; for (let i = 0; i < ids.length; i += 4) gr['G' + i] = { teams: ids.slice(i, i + 4) }; return gr; };
  S.cups.libertadores = { group: { groups: gDe(A.slice(0, 8)) }, bracket: null };
  S.cups.sulamericana = { group: { groups: gDe(A.slice(8, 16)) }, bracket: null };
  RR.resolveSeasonTurnover(S, new Set());
  const doGrupo = (k) => { const g = (S.cups[k] && S.cups[k].group && S.cups[k].group.groups) || {};
    return Object.keys(g).flatMap((x) => g[x].teams || []); };
  const lib = doGrupo('libertadores');
  // arg1 e arg2 têm elenco compacto no pacote -> entram e são materializados;
  // arg3/arg4 não têm -> ficam de fora (o build filtra quem não existe no mundo)
  ['arg1', 'arg2'].forEach((id) => { if (lib.indexOf(id) < 0) reprova('argentino classificado (' + id + ') fora da Libertadores nova'); });
  ['arg3', 'arg4'].forEach((id) => { if (lib.indexOf(id) >= 0) reprova(id + ' entrou sem elenco no pacote'); });
  conferir('classificado desconhecido foi materializado do elenco compacto',
    Array.isArray(S.squads['arg1']) && S.squads['arg1'].length === 18, true);
  const arq = (S.archive || [])[0] || {};
  conferir('o arquivo tem o país', !!(arq.paises && arq.paises['Argentina'] && arq.paises['Argentina'].champ), true);
  conferir('a história do país registrou a temporada', L.history.length, 1);
  conferir('a artilharia zerou pra temporada nova', Object.keys(L.scorers).length, 0);
});

console.log('');
if (falhas) { console.log('✘ ' + falhas + ' divergência(s) na virada'); process.exit(1); }
console.log('✓ virada de temporada íntegra — Brasil, Inglaterra e Argentina');
