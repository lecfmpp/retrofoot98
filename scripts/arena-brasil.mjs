/* TEMPORADA-TESTE DO BRASIL — as 4 divisões com ELENCOS REAIS (A) / faixa real (B-D),
   cada clube com um PERFIL DE TÁTICA fixo na temporada (5 por perfil por divisão):
   ofensivo · equilibrado · retranca · adaptativo (retranca fora contra mais forte,
   ofensivo em casa contra mais fraco). Roda o simMatchPure REAL do resolve-round,
   com a compressão de craques de verdade (ME.computeRatings).
   Uso: node scripts/arena-brasil.mjs [temporadas=30]  → imprime resumo e grava JSON. */
import { readFileSync, writeFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { runInNewContext } from 'node:vm';

const RAIZ = new URL('..', import.meta.url).pathname;
function carregarServidor() {
  // MOTOR_ALVO: aponta a arena pra OUTRO motor (ex.: o antigo, extraído do git) — comparação A/B
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

/* Série A real (elencos Transfermarkt do jogo) */
const gdCtx = { window: {} }; runInNewContext(readFileSync(RAIZ + '/public/src/data/game-data.js', 'utf8'), gdCtx);
const SERIE_A = (gdCtx.window.GAME_DATA.clubs || []).slice(0, 20);

/* B/C/D: nomes reais do jogo (extraídos do core), força na faixa real da divisão */
const core = readFileSync(RAIZ + '/public/src/engine/core.js', 'utf8');
const bloco = core.slice(core.indexOf('const REAL_LOWER_DIVISION_CLUBS={'));
const lit = bloco.slice(bloco.indexOf('{'), bloco.indexOf('};') + 1);
const LOWER = runInNewContext('(' + lit + ')', {});
const FAIXA = { B: [58, 80], C: [52, 74], D: [48, 68] };

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function squadSintetico(div, idx) {
  const [lo, hi] = FAIXA[div]; const R = mulberry((div.charCodeAt(0) * 1000 + idx * 77 + 5) >>> 0);
  const base = hi - (idx / 19) * (hi - lo) * 0.85;              // 1º da lista mais forte, último mais fraco
  const j = (n, s) => ({ n: n, f: Math.max(lo - 4, Math.round(base - 6 + R() * 12)), s, energy: 100, moral: 70 });
  const sq = [];
  for (let i = 0; i < 2; i++) sq.push(j(div + idx + '-g' + i, 'GK'));
  for (let i = 0; i < 6; i++) sq.push(j(div + idx + '-d' + i, 'DEF'));
  for (let i = 0; i < 6; i++) sq.push(j(div + idx + '-m' + i, 'MID'));
  for (let i = 0; i < 4; i++) sq.push(j(div + idx + '-a' + i, 'ATT'));
  return sq;
}
const DIVS = ['A', 'B', 'C', 'D'];
/* FORMAÇÕES: cada clube também joga a temporada inteira numa formação — e ela RODA entre os
   clubes a cada temporada, como o perfil de tática. O XI é o melhor por setor para aquela
   formação, e a nota (computeRatings) segue o XI escolhido — igual ao jogo. */
const FORMS = { '4-3-3': [4, 3, 3], '4-4-2': [4, 4, 2], '3-4-3': [3, 4, 3], '3-3-4': [3, 3, 4], '4-5-1': [4, 5, 1], '4-2-4': [4, 2, 4] };
const FORM_SLOTS = ['4-3-3','4-4-2','3-4-3','3-3-4','4-5-1','4-2-4','4-3-3','4-4-2','3-4-3','3-3-4','4-5-1','4-2-4','4-3-3','4-4-2','3-4-3','3-3-4','4-5-1','4-2-4','4-4-2','4-3-3'];
function xiPorFormacao(squad, fm) {
  const [nd, nm, na] = FORMS[fm];
  const top = (s, n) => squad.filter(p => p.s === s).sort((x, y) => (y.f || 0) - (x.f || 0)).slice(0, n);
  const xi = top('GK', 1).concat(top('DEF', nd), top('MID', nm), top('ATT', na));
  return xi.length >= 8 ? xi : squad.slice(0, 11);
}
const TIMES = {};                                            // por divisão: [{nome, squad, rat, xi, ov, perfil}]
DIVS.forEach((d) => {
  const lista = d === 'A'
    ? SERIE_A.map((c) => ({ nome: c.short || c.name, squad: c.squad, ovRaw: c.overall || 70 }))
    : (LOWER[d] || []).slice(0, 20).map((c, i) => ({ nome: c.short || c.name, squad: squadSintetico(d, i), ovRaw: 0 }));
  while (lista.length < 20) lista.push({ nome: d + '-Extra' + lista.length, squad: squadSintetico(d, lista.length), ovRaw: 0 });
  TIMES[d] = lista.map((t, i) => {
    const ov = t.ovRaw || Math.round(t.squad.reduce((s, p) => s + p.f, 0) / t.squad.length);
    // cache por formação: XI do melhor-por-setor + nota daquele XI
    const porForm = {};
    Object.keys(FORMS).forEach(fm => {
      const xi = xiPorFormacao(t.squad, fm);
      porForm[fm] = { xi, rat: ME.computeRatings(t.squad, xi.map(p => p.n)) };
    });
    return { nome: t.nome, porForm, ov, idx: i };
  });
  // perfis embaralhados deterministicamente: 5 de cada por divisão
  const perfis = []; ['ofensivo', 'equilibrado', 'retranca', 'adaptativo'].forEach((p) => { for (let k = 0; k < 5; k++) perfis.push(p); });
  const R = mulberry(d.charCodeAt(0) * 31 + 7);
  for (let i = perfis.length - 1; i > 0; i--) { const k = Math.floor(R() * (i + 1)); const tmp = perfis[i]; perfis[i] = perfis[k]; perfis[k] = tmp; }
  TIMES[d].forEach((t, i) => t.perfilBase = perfis[i]);
  TIMES[d]._perfis = perfis;
});
/* SEM VÍCIO DE ELENCO: o perfil RODA entre os clubes a cada temporada (o Palmeiras é ofensivo
   numa, retranca noutra) — na média das temporadas, a posição por perfil isola a TÁTICA, não
   o clube que calhou com ela. A temporada representativa (s=0) usa a atribuição base. */
function perfilDe(d, i, s){ return TIMES[d]._perfis[(i + s * 7) % 20]; }
function formDe(i, s){ return FORM_SLOTS[(i * 3 + s * 11) % 20]; }

function taticaDe(t, opp, emCasa) {
  if (t.perfil !== 'adaptativo') return t.perfil;
  if (opp.ov >= t.ov + 3) return 'retranca';
  if (emCasa && t.ov >= opp.ov + 3) return 'ofensivo';
  return 'equilibrado';
}
function schedDe(n) {
  const ids = Array.from({ length: n }, (_, i) => i); const teams = ids.slice(); const rounds = []; let arr = teams.slice();
  for (let r = 0; r < n - 1; r++) { const rr = []; for (let i = 0; i < n / 2; i++) rr.push(r % 2 ? [arr[n - 1 - i], arr[i]] : [arr[i], arr[n - 1 - i]]); rounds.push(rr); arr.splice(1, 0, arr.pop()); }
  return rounds.concat(rounds.map((rr) => rr.map(([a, b]) => [b, a])));
}
const SCHED = schedDe(20);
const NSEASONS = Number(process.argv[2] || 30);

const formPos = {};
const perfilPos = {};                                          // perfil -> {somaPos, n} por divisão
DIVS.forEach((d) => perfilPos[d] = { ofensivo: [], equilibrado: [], retranca: [], adaptativo: [] });
let tabelaRepresentativa = null;

for (let s = 0; s < NSEASONS; s++) {
  const tabelas = {};
  DIVS.forEach((d) => {
    const ts = TIMES[d];
    const tab = ts.map(() => ({ pts: 0, v: 0, e: 0, dd: 0, gp: 0, gc: 0 }));
    ts.forEach((t, i) => { t.perfil = perfilDe(d, i, s); t.form = formDe(i, s); });
    SCHED.forEach((rr, ri) => rr.forEach(([h, a]) => {
      const th = taticaDe(ts[h], ts[a], true), ta = taticaDe(ts[a], ts[h], false);
      const fH = ts[h].porForm[ts[h].form], fA = ts[a].porForm[ts[a].form];
      const H = { rat: fH.rat, xi: fH.xi, tactic: th, cap: 8000 + Math.max(0, ts[h].ov - 55) * 2100, short: ts[h].nome };
      const A = { rat: fA.rat, xi: fA.xi, tactic: ta, cap: 20000, short: ts[a].nome };
      const r = ME.simMatchPure('h', 'a', H, A, ((s * 53 + d.charCodeAt(0)) * 1e5 + ri * 1000 + h * 21 + a) >>> 0, {});
      tab[h].gp += r.hg; tab[h].gc += r.ag; tab[a].gp += r.ag; tab[a].gc += r.hg;
      if (r.hg > r.ag) { tab[h].pts += 3; tab[h].v++; tab[a].dd++; }
      else if (r.hg < r.ag) { tab[a].pts += 3; tab[a].v++; tab[h].dd++; }
      else { tab[h].pts++; tab[a].pts++; tab[h].e++; tab[a].e++; }
    }));
    const ordem = ts.map((_, i) => i).sort((x, y) => tab[y].pts - tab[x].pts || (tab[y].gp - tab[y].gc) - (tab[x].gp - tab[x].gc) || tab[y].gp - tab[x].gp);
    ordem.forEach((i, pos) => { perfilPos[d][ts[i].perfil].push(pos + 1); (formPos[ts[i].form] = formPos[ts[i].form] || []).push(pos + 1); });
    tabelas[d] = ordem.map((i, pos) => ({ pos: pos + 1, nome: ts[i].nome, perfil: ts[i].perfil, form: ts[i].form, ov: ts[i].ov, ...tab[i] }));
  });
  if (s === 0) tabelaRepresentativa = tabelas;
}

const resumo = {};
DIVS.forEach((d) => { resumo[d] = {}; Object.keys(perfilPos[d]).forEach((p) => { const l = perfilPos[d][p]; resumo[d][p] = +(l.reduce((a, b) => a + b, 0) / l.length).toFixed(1); }); });
const geral = {}; ['ofensivo', 'equilibrado', 'retranca', 'adaptativo'].forEach((p) => { const l = DIVS.flatMap((d) => perfilPos[d][p]); geral[p] = +(l.reduce((a, b) => a + b, 0) / l.length).toFixed(2); });

const geralForm = {}; Object.keys(formPos).forEach(f => { const l = formPos[f]; geralForm[f] = +(l.reduce((x, y) => x + y, 0) / l.length).toFixed(2); });
writeFileSync(process.env.SAIDA || (RAIZ + '/scripts/arena-brasil-resultado.json'), JSON.stringify({ NSEASONS, tabela: tabelaRepresentativa, resumo, geral, geralForm }, null, 1));
console.log(`${NSEASONS} temporadas × 4 divisões simuladas.`);
console.log('POSIÇÃO MÉDIA por perfil (todas as divisões, ' + NSEASONS + ' temporadas; neutro = 10,5):');
Object.entries(geral).sort((a, b) => a[1] - b[1]).forEach(([p, v]) => console.log('  ' + p.padEnd(12) + String(v)));
console.log('\nPor divisão:'); DIVS.forEach((d) => console.log('  ' + d + ': ' + Object.entries(resumo[d]).map(([p, v]) => p + ' ' + v).join(' · ')));
console.log('\nTEMPORADA REPRESENTATIVA — Série A:');
console.log('Posição média por FORMAÇÃO: ' + Object.entries(geralForm).sort((a,b)=>a[1]-b[1]).map(([f,v])=>f+' '+v).join(' · '));
tabelaRepresentativa.A.forEach((t) => console.log(`  ${String(t.pos).padStart(2)}. ${t.nome.padEnd(18)} ${t.form.padEnd(6)} ${t.perfil.padEnd(12)} ${String(t.pts).padStart(3)} pts  ${t.v}-${t.e}-${t.dd}  ${t.gp}×${t.gc}`));
