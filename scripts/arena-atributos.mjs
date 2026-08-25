/* Prova que dois jogadores da MESMA força (f) mas atributos diferentes agora produzem
   resultados diferentes (artilharia do "finalizador nato" vs do "genérico"; e goleiro
   "reflexo" vs "linha" sofrendo menos/mais gols). Usa o motor real do servidor. */
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { runInNewContext } from 'node:vm';

const RAIZ = new URL('..', import.meta.url).pathname;
function carregarServidor() {
  let src = readFileSync(process.env.MOTOR_ALVO || '/Users/clawdio/Documents/GitHub/Elifoot/.claude/worktrees/calendar-multiplayer-sync-4c6601/supabase/functions/resolve-round/index.ts', 'utf8');
  src = src.replace(/^import .*$/gm, '').replace(/Deno\.serve\(/, '((globalThis).__naoServe = ');
  src += `;globalThis.__ME = ME;`;
  const js = transformSync(src, { loader: 'ts', format: 'cjs' }).code;
  const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Boolean, Set, Map, isFinite, parseInt, parseFloat,
    Deno: { env: { get: () => '' }, serve: () => {} }, createClient: () => ({ from: () => ({ select: () => ({}) }) }),
    module: { exports: {} }, exports: {} };
  ctx.globalThis = ctx; runInNewContext(js, ctx); return ctx.__ME;
}
const ME = carregarServidor();
const N = Number(process.argv[2] || 4000);

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function j(n, s, f, attr) { return { n, pid: n, f, rawF: f, s, energy: 100, moral: 70, attr }; }

// dois times IGUAIS em força (f=70 em todo mundo), só muda o ATT titular: um "finalizador
// nato" (fin bem acima do seu próprio nível), outro "genérico" (fin na média do nível).
function elenco(attName, finLvl) {
  const generic = { fin: 12, pas: 12, dri: 12, des: 12, cab: 12, cru: 12, vis: 12, pos: 12, com: 12, det: 12, vel: 12, res: 12, fis: 12, agi: 12, ref: 8, mao: 8 };
  const sq = [j('gk', 'GK', 70, { ...generic, ref: 12, mao: 12 })];
  for (let i = 0; i < 4; i++) sq.push(j('d' + i, 'DEF', 70, generic));
  for (let i = 0; i < 4; i++) sq.push(j('m' + i, 'MID', 70, generic));
  sq.push(j('a0', 'ATT', 70, generic));
  sq.push(j(attName, 'ATT', 70, { ...generic, fin: finLvl }));
  return sq;
}
const TIME_NATO = elenco('artilheiro', 20);   // fin no teto — bem acima do nível (level(70)≈13)
const TIME_GEN = elenco('generico', 12);      // fin na média do resto do time

function golsDoAlvo(sq, alvoNome, rounds) {
  let gols = 0, jogos = 0;
  for (let r = 0; r < rounds; r++) {
    const H = { rat: ME.computeRatings(sq, sq.map(p => p.pid)), xi: sq, tactic: 'equilibrado', cap: 20000, short: 'A' };
    const A = { rat: ME.computeRatings(sq, sq.map(p => p.pid)), xi: sq, tactic: 'equilibrado', cap: 20000, short: 'B' };
    const res = ME.simMatchPure('h', 'a', H, A, (r * 7919 + 13) >>> 0, {});
    jogos++;
    res.scorers.forEach(sc => { if (sc.name === alvoNome) gols++; });
  }
  return { gols, jogos };
}
const nato = golsDoAlvo(TIME_NATO, 'artilheiro', N);
const gen = golsDoAlvo(TIME_GEN, 'generico', N);
console.log(`mesma força (f=70), atacante titular parceiro variando só o FIN — ${N} partidas`);
console.log(`  fin=20 (nato):     ${nato.gols} gols  (${(nato.gols / N).toFixed(3)}/jogo)`);
console.log(`  fin=12 (genérico): ${gen.gols} gols  (${(gen.gols / N).toFixed(3)}/jogo)`);
console.log(`  diferença: ${(100 * (nato.gols - gen.gols) / Math.max(1, gen.gols)).toFixed(0)}%`);

// goleiro "reflexo" (ref/mao no teto) vs "de linha" (ref/mao baixo), mesma f, contra o MESMO
// ataque fixo — mede gols sofridos.
function elencoGK(refLvl, maoLvl) {
  const generic = { fin: 12, pas: 12, dri: 12, des: 12, cab: 12, cru: 12, vis: 12, pos: 12, com: 12, det: 12, vel: 12, res: 12, fis: 12, agi: 12, ref: 8, mao: 8 };
  const sq = [j('gk', 'GK', 70, { ...generic, ref: refLvl, mao: maoLvl })];
  for (let i = 0; i < 4; i++) sq.push(j('d' + i, 'DEF', 70, generic));
  for (let i = 0; i < 4; i++) sq.push(j('m' + i, 'MID', 70, generic));
  for (let i = 0; i < 2; i++) sq.push(j('a' + i, 'ATT', 70, generic));
  return sq;
}
const ATACANTE_FIXO = elencoGK(8, 8); // usado só como adversário fixo
function golsSofridos(sqDefesa, rounds) {
  let sofridos = 0;
  for (let r = 0; r < rounds; r++) {
    const H = { rat: ME.computeRatings(sqDefesa, sqDefesa.map(p => p.pid)), xi: sqDefesa, tactic: 'equilibrado', cap: 20000, short: 'D' };
    const A = { rat: ME.computeRatings(ATACANTE_FIXO, ATACANTE_FIXO.map(p => p.pid)), xi: ATACANTE_FIXO, tactic: 'equilibrado', cap: 20000, short: 'X' };
    const res = ME.simMatchPure('h', 'a', H, A, (r * 4441 + 3) >>> 0, {});
    sofridos += res.ag;
  }
  return sofridos;
}
const golsReflexo = golsSofridos(elencoGK(20, 20), N);
const golsLinha = golsSofridos(elencoGK(4, 4), N);
console.log(`\nmesma força de goleiro (f=70), variando REF+MÃO — gols sofridos em ${N} partidas`);
console.log(`  ref/mao=20 (reflexo): ${golsReflexo} sofridos (${(golsReflexo / N).toFixed(3)}/jogo)`);
console.log(`  ref/mao=4  (linha):   ${golsLinha} sofridos (${(golsLinha / N).toFixed(3)}/jogo)`);
console.log(`  diferença: ${(100 * (golsLinha - golsReflexo) / Math.max(1, golsLinha)).toFixed(0)}% menos gols sofridos com o goleiro-reflexo`);
