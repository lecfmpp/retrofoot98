/* BATERIA DE VALIDAÇÃO DO REBALANCE (relatório de validação do dono, 21/08) — roda o
   simMatchPure REAL do resolve-round nos testes P0/P1:
   P0: temporadas por tática · curva de qualidade · matriz formação×formação · formação×tática
   P1: mando de campo · distribuição de placares · temporadas com elencos desiguais
   Uso: node scripts/arena-validacao.mjs [rapido] */
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
    Deno: { env: { get: () => '' }, serve: () => {} }, createClient: () => ({ from: () => ({ select: () => ({}) }) }),
    module: { exports: {} }, exports: {} };
  ctx.globalThis = ctx; runInNewContext(js, ctx); return ctx.__ME;
}
const ME = carregarServidor();
const RAPIDO = process.argv.includes('rapido');

const F_ATT = [70, 64, 58, 52], F_MID = [66, 62, 58, 54, 50], F_DEF = [68, 64, 60, 56, 52], F_GK = 62;
const FORMACOES = { '4-3-3': [4, 3, 3], '4-4-2': [4, 4, 2], '3-4-3': [3, 4, 3], '3-3-4': [3, 3, 4], '4-5-1': [4, 5, 1], '4-2-4': [4, 2, 4] };
function xiDe(fm, mult) {
  mult = mult || 1; const [nd, nm, na] = fm;
  const j = (n, f, s) => ({ n, f: Math.round(f * mult), s, energy: 100, moral: 70, behavior: 'Discreto' });
  const xi = [j('GK', F_GK, 'GK')];
  for (let i = 0; i < nd; i++) xi.push(j('D' + i, F_DEF[i] ?? 50, 'DEF'));
  for (let i = 0; i < nm; i++) xi.push(j('M' + i, F_MID[i] ?? 48, 'MID'));
  for (let i = 0; i < na; i++) xi.push(j('A' + i, F_ATT[i] ?? 48, 'ATT'));
  return xi;
}
function ratDe(xi) {
  const media = (s) => { const l = xi.filter(p => p.s === s); return l.length ? l.reduce((a, p) => a + p.f, 0) / l.length : 55; };
  return { OS: media('ATT'), MS: media('MID'), DS: media('GK') * 0.35 + media('DEF') * 0.65, mor: 70 };
}
function lado(fm, tactic, mult, cap) { const xi = xiDe(FORMACOES[fm] || fm, mult); return { rat: ratDe(xi), xi, tactic, cap: cap == null ? 20000 : cap, short: 'X' }; }
function sim(H, A, seed) { return ME.simMatchPure('h', 'a', H, A, seed >>> 0, {}); }
const pc = (x, n) => (100 * x / n).toFixed(0) + '%';

/* duelo neutro (metade de cada lado do mando) */
function duelo(mk1, mk2, N, seedBase) {
  let w1 = 0, w2 = 0, e = 0, g1 = 0, g2 = 0;
  for (let i = 0; i < N; i++) {
    const casa1 = i % 2 === 0;
    const r = sim(casa1 ? mk1() : mk2(), casa1 ? mk2() : mk1(), (seedBase + i * 2654435761) >>> 0);
    const a = casa1 ? r.hg : r.ag, b = casa1 ? r.ag : r.hg;
    g1 += a; g2 += b; if (a > b) w1++; else if (b > a) w2++; else e++;
  }
  return { w1, w2, e, g1, g2, N };
}

/* ===== P0.1 — TEMPORADAS COMPLETAS POR TÁTICA ===== */
console.log('\n════ P0.1 · TEMPORADAS COMPLETAS POR TÁTICA (20 times iguais, 38 rodadas) ════');
{
  const NSEASONS = RAPIDO ? 60 : 400;
  // 20 times: 5 por grupo. adaptativo = ofensivo em casa, retranca fora.
  const grupos = ['ofensivo', 'equilibrado', 'retranca', 'adaptativo'];
  const times = []; for (let g = 0; g < 4; g++) for (let i = 0; i < 5; i++) times.push({ id: g * 5 + i, grupo: grupos[g] });
  // round-robin (mesmo algoritmo do jogo)
  const ids = times.map(t => t.id); const teams = ids.slice(); const n = teams.length; const rounds = []; let arr = teams.slice();
  for (let r = 0; r < n - 1; r++) { const rr = []; for (let i = 0; i < n / 2; i++) rr.push(r % 2 ? [arr[n - 1 - i], arr[i]] : [arr[i], arr[n - 1 - i]]); rounds.push(rr); arr.splice(1, 0, arr.pop()); }
  const sched = rounds.concat(rounds.map(rr => rr.map(([a, b]) => [b, a])));
  const acc = {}; grupos.forEach(g => acc[g] = { pts: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, titulos: 0, temporadas: 0 });
  for (let s = 0; s < NSEASONS; s++) {
    const tab = times.map(() => ({ pts: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }));
    sched.forEach((rr, ri) => rr.forEach(([h, a]) => {
      const gh = times[h].grupo, ga = times[a].grupo;
      const th = gh === 'adaptativo' ? 'ofensivo' : gh;          // adaptativo: ofensivo em casa...
      const ta = ga === 'adaptativo' ? 'retranca' : ga;          // ...retranca fora
      const r = sim(lado('4-3-3', th), lado('4-3-3', ta), (s * 1e6 + ri * 1000 + h * 20 + a) >>> 0);
      tab[h].gp += r.hg; tab[h].gc += r.ag; tab[a].gp += r.ag; tab[a].gc += r.hg;
      if (r.hg > r.ag) { tab[h].pts += 3; tab[h].v++; tab[a].d++; }
      else if (r.hg < r.ag) { tab[a].pts += 3; tab[a].v++; tab[h].d++; }
      else { tab[h].pts++; tab[a].pts++; tab[h].e++; tab[a].e++; }
    }));
    let campeao = 0; tab.forEach((t, i) => { if (t.pts > tab[campeao].pts || (t.pts === tab[campeao].pts && (t.gp - t.gc) > (tab[campeao].gp - tab[campeao].gc))) campeao = i; });
    acc[times[campeao].grupo].titulos++;
    times.forEach((t, i) => { const a = acc[t.grupo]; a.pts += tab[i].pts; a.v += tab[i].v; a.e += tab[i].e; a.d += tab[i].d; a.gp += tab[i].gp; a.gc += tab[i].gc; a.temporadas++; });
  }
  console.log('grupo'.padEnd(13) + 'pts/temp  V-E-D por temp     gols pró×con   títulos');
  grupos.forEach(g => { const a = acc[g]; const t = a.temporadas;
    console.log(g.padEnd(13) + (a.pts / t).toFixed(1).padStart(6) + '   ' +
      `${(a.v / t).toFixed(1)}-${(a.e / t).toFixed(1)}-${(a.d / t).toFixed(1)}`.padEnd(17) +
      `${(a.gp / t / 38).toFixed(2)}×${(a.gc / t / 38).toFixed(2)}`.padEnd(14) + pc(a.titulos, NSEASONS)); });
  console.log(`(${NSEASONS} temporadas · título = % das temporadas vencidas pelo grupo, 5 times por grupo → neutro seria 25%)`);
}

/* ===== P0.2 — CURVA DE QUALIDADE ===== */
console.log('\n════ P0.2 · CURVA DE QUALIDADE (equilibrado × equilibrado, 4-3-3) ════');
{
  const N = RAPIDO ? 800 : 3000;
  console.log('vantagem   vitória  empate  derrota   gols');
  for (const pctForca of [0, 5, 10, 15, 20, 25, 30, 40]) {
    const m = 1 + pctForca / 100;
    const r = duelo(() => lado('4-3-3', 'equilibrado', m), () => lado('4-3-3', 'equilibrado', 1), N, 77 + pctForca);
    console.log(('+' + pctForca + '%').padEnd(10) + pc(r.w1, N).padStart(6) + pc(r.e, N).padStart(8) + pc(r.w2, N).padStart(8) + ('   ' + (r.g1 / N).toFixed(2) + '×' + (r.g2 / N).toFixed(2)));
  }
}

/* ===== P0.3 — MATRIZ FORMAÇÃO × FORMAÇÃO ===== */
console.log('\n════ P0.3 · MATRIZ FORMAÇÃO × FORMAÇÃO (tática equilibrada, % vitória da LINHA; resto empate/derrota) ════');
{
  const N = RAPIDO ? 800 : 3000;
  const fs = Object.keys(FORMACOES);
  const cel = {}; let extremos = [];
  for (let a = 0; a < fs.length; a++) for (let b = a + 1; b < fs.length; b++) {
    const r = duelo(() => lado(fs[a], 'equilibrado'), () => lado(fs[b], 'equilibrado'), N, a * 131 + b * 17);
    cel[fs[a] + '|' + fs[b]] = pc(r.w1, N); cel[fs[b] + '|' + fs[a]] = pc(r.w2, N);
    const mx = Math.max(r.w1, r.w2) / N; if (mx > 0.5) extremos.push(`${r.w1 > r.w2 ? fs[a] : fs[b]} × ${r.w1 > r.w2 ? fs[b] : fs[a]}: ${(100 * mx).toFixed(0)}%`);
  }
  console.log(' '.repeat(8) + fs.map(f => f.padStart(7)).join(''));
  fs.forEach(a => console.log(a.padEnd(8) + fs.map(b => (a === b ? '—' : cel[a + '|' + b]).padStart(7)).join('')));
  console.log(extremos.length ? '⚠ confrontos acima de 50% de vitória: ' + extremos.join(' · ') : '✓ nenhum confronto passa de 50% de vitória');
}

/* ===== P0.4 — FORMAÇÃO × TÁTICA (todas as 18 combinações, round-robin) ===== */
console.log('\n════ P0.4 · FORMAÇÃO × TÁTICA (18 combos, todos contra todos) ════');
{
  const N = RAPIDO ? 120 : 400;
  const fs = Object.keys(FORMACOES), ts = ['ofensivo', 'equilibrado', 'retranca'];
  const combos = []; fs.forEach(f => ts.forEach(t => combos.push({ f, t, w: 0, jogos: 0, gp: 0, gc: 0 })));
  const pares = [];
  for (let i = 0; i < combos.length; i++) for (let j = i + 1; j < combos.length; j++) {
    const r = duelo(() => lado(combos[i].f, combos[i].t), () => lado(combos[j].f, combos[j].t), N, i * 977 + j * 31);
    combos[i].w += r.w1; combos[i].jogos += N; combos[i].gp += r.g1; combos[i].gc += r.g2;
    combos[j].w += r.w2; combos[j].jogos += N; combos[j].gp += r.g2; combos[j].gc += r.g1;
    const mx = Math.max(r.w1, r.w2) / N;
    if (mx >= 0.60) pares.push(`${(r.w1 > r.w2 ? combos[i] : combos[j]).f}+${(r.w1 > r.w2 ? combos[i] : combos[j]).t} × ${(r.w1 > r.w2 ? combos[j] : combos[i]).f}+${(r.w1 > r.w2 ? combos[j] : combos[i]).t}: ${(100 * mx).toFixed(0)}%`);
  }
  combos.sort((x, y) => y.w / y.jogos - x.w / x.jogos);
  console.log('combo'.padEnd(22) + 'vitórias   gols pró×contra');
  combos.forEach((c, i) => { if (i < 5 || i >= combos.length - 5) console.log(((i + 1) + '. ' + c.f + ' ' + c.t).padEnd(22) + pc(c.w, c.jogos).padStart(6) + '     ' + (c.gp / c.jogos).toFixed(2) + '×' + (c.gc / c.jogos).toFixed(2)); if (i === 5) console.log('  …'); });
  console.log(pares.length ? '⚠ confrontos com 60%+ de vitória: ' + pares.slice(0, 8).join(' · ') : '✓ nenhum confronto de combos chega a 60% de vitória');
}

/* ===== P1.5 — MANDO DE CAMPO ===== */
console.log('\n════ P1.6 · MANDO DE CAMPO (times iguais, 4-3-3 equilibrado, mandante fixo) ════');
{
  const N = RAPIDO ? 2000 : 10000;
  let w = 0, e = 0, d = 0, gh = 0, ga = 0;
  for (let i = 0; i < N; i++) { const r = sim(lado('4-3-3', 'equilibrado'), lado('4-3-3', 'equilibrado'), (i * 48271 + 7) >>> 0); gh += r.hg; ga += r.ag; if (r.hg > r.ag) w++; else if (r.hg < r.ag) d++; else e++; }
  console.log(`mandante ${pc(w, N)} V · ${pc(e, N)} E · ${pc(d, N)} D   gols ${(gh / N).toFixed(2)}×${(ga / N).toFixed(2)}   (estádio 20 mil dos dois)`);
  let w2 = 0, e2 = 0, d2 = 0;
  for (let i = 0; i < N; i++) { const r = sim(lado('4-3-3', 'equilibrado', 1, 75000), lado('4-3-3', 'equilibrado', 1, 20000), (i * 69621 + 3) >>> 0); if (r.hg > r.ag) w2++; else if (r.hg < r.ag) d2++; else e2++; }
  console.log(`mandante ${pc(w2, N)} V · ${pc(e2, N)} E · ${pc(d2, N)} D   (estádio lotado de 75 mil — o teto do mando)`);
}

/* ===== P1.6 — DISTRIBUIÇÃO DE PLACARES ===== */
console.log('\n════ P1.7 · DISTRIBUIÇÃO DE PLACARES (times iguais, equilibrado; e ofensivo×ofensivo) ════');
{
  const N = RAPIDO ? 2000 : 10000;
  const conta = (mk1, mk2, rotulo) => {
    const hist = {}; let gols = 0, g5 = 0;
    for (let i = 0; i < N; i++) { const r = sim(mk1(), mk2(), (i * 22695477 + 1) >>> 0); const k = Math.max(r.hg, r.ag) + '×' + Math.min(r.hg, r.ag); hist[k] = (hist[k] || 0) + 1; gols += r.hg + r.ag; if (r.hg + r.ag >= 5) g5++; }
    const top = Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${pc(v, N)}`).join(' · ');
    console.log(`${rotulo.padEnd(26)} média ${(gols / N).toFixed(2)} gols/jogo · 5+ gols em ${pc(g5, N)}\n  ${top}`);
  };
  conta(() => lado('4-3-3', 'equilibrado'), () => lado('4-3-3', 'equilibrado'), 'equilibrado × equilibrado');
  conta(() => lado('4-3-3', 'ofensivo'), () => lado('4-3-3', 'ofensivo'), 'ofensivo × ofensivo');
  conta(() => lado('4-3-3', 'retranca'), () => lado('4-3-3', 'retranca'), 'retranca × retranca');
}

/* ===== P1.7 — TEMPORADAS COM ELENCOS DESIGUAIS (espalhamento realista de Série A) ===== */
console.log('\n════ P1.8 · TEMPORADAS COM ELENCOS DESIGUAIS (20 times, forças 1,00 a 1,45 — grandes e pequenos) ════');
{
  const NSEASONS = RAPIDO ? 40 : 200;
  const mults = Array.from({ length: 20 }, (_, i) => 1 + (19 - i) * 0.45 / 19); // t0 = grande (1,45x) ... t19 = pequeno (1,00x)
  const ids = mults.map((_, i) => i); const teams = ids.slice(); const n = 20; const rounds = []; let arr = teams.slice();
  for (let r = 0; r < n - 1; r++) { const rr = []; for (let i = 0; i < n / 2; i++) rr.push(r % 2 ? [arr[n - 1 - i], arr[i]] : [arr[i], arr[n - 1 - i]]); rounds.push(rr); arr.splice(1, 0, arr.pop()); }
  const sched = rounds.concat(rounds.map(rr => rr.map(([a, b]) => [b, a])));
  const titulos = Array(20).fill(0), g4 = Array(20).fill(0), z4 = Array(20).fill(0);
  let ptsCampeao = 0, ptsLanterna = 0, golsRodada = 0, zebra = 0, jogosDesiguais = 0;
  for (let s = 0; s < NSEASONS; s++) {
    const tab = mults.map(() => ({ pts: 0, gp: 0, gc: 0 }));
    sched.forEach((rr, ri) => rr.forEach(([h, a]) => {
      const r = sim(lado('4-3-3', 'equilibrado', mults[h]), lado('4-3-3', 'equilibrado', mults[a]), (s * 7e5 + ri * 999 + h * 21 + a) >>> 0);
      golsRodada += r.hg + r.ag;
      if (Math.abs(mults[h] - mults[a]) >= 0.25) { jogosDesiguais++; const fracoVenceu = (mults[h] < mults[a] && r.hg > r.ag) || (mults[a] < mults[h] && r.ag > r.hg); if (fracoVenceu) zebra++; }
      tab[h].gp += r.hg; tab[h].gc += r.ag; tab[a].gp += r.ag; tab[a].gc += r.hg;
      if (r.hg > r.ag) tab[h].pts += 3; else if (r.hg < r.ag) tab[a].pts += 3; else { tab[h].pts++; tab[a].pts++; }
    }));
    const ordem = ids.slice().sort((x, y) => tab[y].pts - tab[x].pts || (tab[y].gp - tab[y].gc) - (tab[x].gp - tab[x].gc));
    titulos[ordem[0]]++; ordem.slice(0, 4).forEach(i => g4[i]++); ordem.slice(-4).forEach(i => z4[i]++);
    ptsCampeao += tab[ordem[0]].pts; ptsLanterna += tab[ordem[19]].pts;
  }
  const topTitulos = ids.map(i => ({ i, t: titulos[i] })).filter(x => x.t).sort((a, b) => b.t - a.t);
  console.log('títulos por time (força relativa): ' + topTitulos.slice(0, 6).map(x => `#${x.i + 1}(${mults[x.i].toFixed(2)}x): ${pc(x.t, NSEASONS)}`).join(' · '));
  console.log(`G4 dos 4 mais fortes: ${pc(g4[0] + g4[1] + g4[2] + g4[3], NSEASONS * 4)} das vagas · Z4 dos 4 mais fracos: ${pc(z4[16] + z4[17] + z4[18] + z4[19], NSEASONS * 4)} das vagas`);
  console.log(`campeão faz em média ${(ptsCampeao / NSEASONS).toFixed(1)} pts · lanterna ${(ptsLanterna / NSEASONS).toFixed(1)} pts · ${(golsRodada / (NSEASONS * 380)).toFixed(2)} gols/jogo`);
  console.log(`ZEBRAS: o time bem mais fraco (25%+ de diferença) vence ${pc(zebra, jogosDesiguais)} desses jogos`);
}
console.log('');
