/* O CRAQUE QUE CARREGA O TIME — o clássico do Elifoot: um f50 num elenco de f~12, numa liga
   onde todos os outros são f~12. Ele faz o time subir? Mede posição média, taxa de acesso
   (G4) e artilharia do craque, no motor apontado (MOTOR_ALVO p/ comparar antigo × novo).
   Uso: [MOTOR_ALVO=...] node scripts/arena-craque.mjs [temporadas=80] [setor=ATT] [formacao=4-5-1] */
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { runInNewContext } from 'node:vm';

const RAIZ = new URL('..', import.meta.url).pathname;
function carregarServidor() {
  let src = readFileSync(process.env.MOTOR_ALVO || (RAIZ + '/supabase/functions/resolve-round/index.ts'), 'utf8');
  src = src.replace(/^import .*$/gm, '').replace(/Deno\.serve\(/, '((globalThis).__naoServe = ');
  src += `;globalThis.__ME = ME;`;
  const js = transformSync(src, { loader: 'ts', format: 'cjs' }).code;
  const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Boolean, Set, Map, isFinite, parseInt, parseFloat,
    Deno: { env: { get: () => '' }, serve: () => {} }, createClient: () => ({ from: () => ({ select: () => ({}) }) }),
    module: { exports: {} }, exports: {} };
  ctx.globalThis = ctx; runInNewContext(js, ctx); return ctx.__ME;
}
const ME = carregarServidor();

const NSEASONS = Number(process.argv[2] || 80);
const SETOR = process.argv[3] || 'ATT';
const FORM = { '4-3-3': [4, 3, 3], '4-4-2': [4, 4, 2], '4-5-1': [4, 5, 1], '3-3-4': [3, 3, 4] }[process.argv[4] || '4-5-1'] || [4, 5, 1];

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function elenco(idx, comCraque) {
  const R = mulberry(idx * 91 + 3);
  const f = () => Math.round(10 + R() * 5);   // a ralé: força 10-15
  const j = (n, s, fx) => ({ n, f: fx != null ? fx : f(), s, energy: 100, moral: 70 });
  const sq = [j(idx + 'g', 'GK')];
  for (let i = 0; i < 5; i++) sq.push(j(idx + 'd' + i, 'DEF'));
  for (let i = 0; i < 6; i++) sq.push(j(idx + 'm' + i, 'MID'));
  for (let i = 0; i < 4; i++) sq.push(j(idx + 'a' + i, 'ATT'));
  if (comCraque) { const alvo = sq.find(p => p.s === SETOR); alvo.f = 50; alvo.n = 'CRAQUE'; }
  return sq;
}
function xiDe(sq) {
  const [nd, nm, na] = FORM;
  const top = (s, n) => sq.filter(p => p.s === s).sort((x, y) => y.f - x.f).slice(0, n);
  return top('GK', 1).concat(top('DEF', nd), top('MID', nm), top('ATT', na));
}
const TIMES = Array.from({ length: 20 }, (_, i) => {
  const sq = elenco(i, i === 0);
  const xi = xiDe(sq);
  return { sq, xi, rat: ME.computeRatings(sq, xi.map(p => p.n)) };
});
function schedDe(n) { const t = Array.from({ length: n }, (_, i) => i); const rounds = []; let arr = t.slice();
  for (let r = 0; r < n - 1; r++) { const rr = []; for (let i = 0; i < n / 2; i++) rr.push(r % 2 ? [arr[n - 1 - i], arr[i]] : [arr[i], arr[n - 1 - i]]); rounds.push(rr); arr.splice(1, 0, arr.pop()); }
  return rounds.concat(rounds.map(rr => rr.map(([a, b]) => [b, a]))); }
const SCHED = schedDe(20);

let somaPos = 0, acesso = 0, titulos = 0, golsCraque = 0, golsTime = 0, somaPts = 0;
for (let s = 0; s < NSEASONS; s++) {
  const tab = TIMES.map(() => ({ pts: 0, gp: 0, gc: 0 }));
  SCHED.forEach((rr, ri) => rr.forEach(([h, a]) => {
    const H = { rat: TIMES[h].rat, xi: TIMES[h].xi, tactic: 'equilibrado', cap: 20000, short: 'T' + h };
    const A = { rat: TIMES[a].rat, xi: TIMES[a].xi, tactic: 'equilibrado', cap: 20000, short: 'T' + a };
    const r = ME.simMatchPure('h', 'a', H, A, (s * 9e5 + ri * 999 + h * 21 + a) >>> 0, {});
    if (h === 0 || a === 0) { r.scorers.forEach(sc => { if (sc.id === (h === 0 ? 'h' : 'a')) { golsTime++; if (sc.name === 'CRAQUE') golsCraque++; } }); }
    tab[h].gp += r.hg; tab[h].gc += r.ag; tab[a].gp += r.ag; tab[a].gc += r.hg;
    if (r.hg > r.ag) tab[h].pts += 3; else if (r.hg < r.ag) tab[a].pts += 3; else { tab[h].pts++; tab[a].pts++; }
  }));
  const ordem = TIMES.map((_, i) => i).sort((x, y) => tab[y].pts - tab[x].pts || (tab[y].gp - tab[y].gc) - (tab[x].gp - tab[x].gc));
  const pos = ordem.indexOf(0) + 1;
  somaPos += pos; somaPts += tab[0].pts;
  if (pos <= 4) acesso++; if (pos === 1) titulos++;
}
const pc = x => (100 * x / NSEASONS).toFixed(0) + '%';
console.log(`craque f50 no ${SETOR} · formação ${process.argv[4] || '4-5-1'} · liga de f10-15 · ${NSEASONS} temporadas`);
console.log(`posição média do time do craque: ${(somaPos / NSEASONS).toFixed(1)} (neutro 10,5) · ${(somaPts / NSEASONS).toFixed(0)} pts/temp`);
console.log(`ACESSO (G4): ${pc(acesso)} · título: ${pc(titulos)} · gols do craque: ${(golsCraque / NSEASONS).toFixed(1)}/temp (${(100 * golsCraque / Math.max(1, golsTime)).toFixed(0)}% dos gols do time)`);
