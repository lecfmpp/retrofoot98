/* ARENA DE CALIBRAÇÃO DO MOTOR — roda o simMatchPure REAL (o do resolve-round, mesmo truque
   do teste-virada) em milhares de partidas com times iguais, e mede o peso de cada escolha.
   Uso: node arena.mjs [N]   (N partidas por confronto; padrão 4000) */
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { runInNewContext } from 'node:vm';

const RAIZ = new URL('..', import.meta.url).pathname;
const ALVO = RAIZ + '/supabase/functions/resolve-round/index.ts';

function carregarServidor() {
  let src = readFileSync(ALVO, 'utf8');
  src = src.replace(/^import .*$/gm, '');
  src = src.replace(/Deno\.serve\(/, '((globalThis).__naoServe = ');
  src += `;globalThis.__ME = ME;`;
  const js = transformSync(src, { loader: 'ts', format: 'cjs' }).code;
  const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Boolean, Set, Map, isFinite, parseInt, parseFloat,
    Deno: { env: { get: () => '' }, serve: () => {} },
    createClient: () => ({ from: () => ({ select: () => ({}) }) }),
    module: { exports: {} }, exports: {} };
  ctx.globalThis = ctx;
  runInNewContext(js, ctx);
  return ctx.__ME;
}
const ME = carregarServidor();

/* elenco sintético com FORÇAS ESCALONADAS por setor (reproduz o efeito "nota de setor é média":
   1 atacante = só o craque; 4 atacantes = inclui o 4º melhor e baixa a média) */
const F_ATT = [70, 64, 58, 52];
const F_MID = [66, 62, 58, 54, 50];
const F_DEF = [68, 64, 60, 56, 52];
const F_GK = 62;
function xiDe(formacao) { // formacao = [nDEF, nMID, nATT]
  const [nd, nm, na] = formacao;
  const xi = [{ n: 'GK', f: F_GK, s: 'GK', energy: 100, moral: 70, behavior: 'Discreto' }];
  for (let i = 0; i < nd; i++) xi.push({ n: 'D' + i, f: F_DEF[i] ?? 50, s: 'DEF', energy: 100, moral: 70, behavior: 'Discreto' });
  for (let i = 0; i < nm; i++) xi.push({ n: 'M' + i, f: F_MID[i] ?? 48, s: 'MID', energy: 100, moral: 70, behavior: 'Discreto' });
  for (let i = 0; i < na; i++) xi.push({ n: 'A' + i, f: F_ATT[i] ?? 48, s: 'ATT', energy: 100, moral: 70, behavior: 'Discreto' });
  return xi;
}
function ratDe(xi) {
  const media = (s) => { const l = xi.filter(p => p.s === s); return l.length ? l.reduce((a, p) => a + p.f, 0) / l.length : 55; };
  const gk = media('GK'), def = media('DEF'), mid = media('MID'), att = media('ATT');
  return { OS: att, MS: mid, DS: gk * 0.35 + def * 0.65, mor: 70 };
}
function lado(formacao, tactic) { const xi = xiDe(formacao); return { rat: ratDe(xi), xi, tactic, cap: 20000, short: 'X' }; }

const FORMACOES = { '4-3-3': [4, 3, 3], '4-4-2': [4, 4, 2], '3-4-3': [3, 4, 3], '3-3-4': [3, 3, 4], '4-5-1': [4, 5, 1], '4-2-4': [4, 2, 4] };
const N = Number(process.argv[2] || 4000);

function duelo(ladoA, ladoB, rotulo) {
  let wA = 0, wB = 0, e = 0, gA = 0, gB = 0;
  for (let i = 0; i < N; i++) {
    // metade das partidas com A em casa, metade com B — o mando não contamina a medição
    const casaA = i % 2 === 0;
    const H = casaA ? ladoA : ladoB, A = casaA ? ladoB : ladoA;
    const r = ME.simMatchPure('h', 'a', H, A, (i * 2654435761) >>> 0, {});
    const ga = casaA ? r.hg : r.ag, gb = casaA ? r.ag : r.hg;
    gA += ga; gB += gb;
    if (ga > gb) wA++; else if (gb > ga) wB++; else e++;
  }
  const pc = (x) => (100 * x / N).toFixed(0) + '%';
  console.log(`${rotulo.padEnd(34)} ${pc(wA).padStart(4)} V · ${pc(e).padStart(4)} E · ${pc(wB).padStart(4)} D   gols ${(gA / N).toFixed(2)} × ${(gB / N).toFixed(2)}`);
  return { wA: wA / N, wB: wB / N };
}

console.log(`\n=== TÁTICAS (times iguais, 4-3-3 dos dois lados, N=${N}) ===`);
duelo(lado(FORMACOES['4-3-3'], 'ofensivo'), lado(FORMACOES['4-3-3'], 'equilibrado'), 'ofensivo × equilibrado');
duelo(lado(FORMACOES['4-3-3'], 'ofensivo'), lado(FORMACOES['4-3-3'], 'retranca'), 'ofensivo × retranca');
duelo(lado(FORMACOES['4-3-3'], 'retranca'), lado(FORMACOES['4-3-3'], 'equilibrado'), 'retranca × equilibrado');

console.log(`\n=== FORMAÇÕES (times iguais, tática equilibrada, N=${N}) ===`);
const nomes = Object.keys(FORMACOES);
const placar = {}; nomes.forEach(n => placar[n] = { w: 0, jogos: 0, gp: 0, gc: 0 });
for (let a = 0; a < nomes.length; a++) for (let b = a + 1; b < nomes.length; b++) {
  const A = nomes[a], B = nomes[b];
  let wA = 0, wB = 0, gA = 0, gB = 0;
  for (let i = 0; i < N; i++) {
    const casaA = i % 2 === 0;
    const H = casaA ? lado(FORMACOES[A], 'equilibrado') : lado(FORMACOES[B], 'equilibrado');
    const Aw = casaA ? lado(FORMACOES[B], 'equilibrado') : lado(FORMACOES[A], 'equilibrado');
    const r = ME.simMatchPure('h', 'a', H, Aw, ((a * 97 + b) * 1e6 + i) >>> 0, {});
    const ga = casaA ? r.hg : r.ag, gb = casaA ? r.ag : r.hg;
    gA += ga; gB += gb;
    if (ga > gb) wA++; else if (gb > ga) wB++;
  }
  placar[A].w += wA; placar[A].jogos += N; placar[A].gp += gA; placar[A].gc += gB;
  placar[B].w += wB; placar[B].jogos += N; placar[B].gp += gB; placar[B].gc += gA;
}
nomes.sort((x, y) => placar[y].w / placar[y].jogos - placar[x].w / placar[x].jogos).forEach(n => {
  const p = placar[n];
  console.log(`${n.padEnd(8)} ${(100 * p.w / p.jogos).toFixed(0).padStart(3)}% vitórias   gols ${(p.gp / p.jogos).toFixed(2)} × ${(p.gc / p.jogos).toFixed(2)}`);
});

console.log(`\n=== SANIDADE: time 20% melhor (equilibrado × equilibrado, 4-3-3) ===`);
const forte = lado(FORMACOES['4-3-3'], 'equilibrado');
forte.rat = { OS: forte.rat.OS * 1.2, MS: forte.rat.MS * 1.2, DS: forte.rat.DS * 1.2, mor: 70 };
forte.xi = forte.xi.map(p => ({ ...p, f: Math.round(p.f * 1.2) }));
duelo(forte, lado(FORMACOES['4-3-3'], 'equilibrado'), 'time +20% × time normal');
