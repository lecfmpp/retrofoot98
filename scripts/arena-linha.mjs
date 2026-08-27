/* ARENA DOS ATRIBUTOS DE LINHA (26/08) — mede o efeito de PASSE, DRIBLE e DESARME
   depois que eles passaram a entrar na nota do setor. Times IGUAIS em força (f=70
   em todos), variando SÓ o atributo em teste no setor inteiro: "talentoso" (16) vs
   "genérico" (13 ≈ o nível da força). Motor real do servidor.
   Uso: node arena-linha.mjs [N]   ·   MOTOR_ALVO=<caminho> para comparar versões. */
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { runInNewContext } from 'node:vm';

const RAIZ = new URL('..', import.meta.url).pathname;
function carregarServidor() {
  let src = readFileSync(process.env.MOTOR_ALVO || RAIZ + '/supabase/functions/resolve-round/index.ts', 'utf8');
  src = src.replace(/^import .*$/gm, '').replace(/Deno\.serve\(/, '((globalThis).__naoServe = ');
  src += `;globalThis.__ME = ME;`;
  const js = transformSync(src, { loader: 'ts', format: 'cjs' }).code;
  const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Boolean, Set, Map, isFinite, parseInt, parseFloat,
    Deno: { env: { get: () => '' }, serve: () => {} }, createClient: () => ({ from: () => ({ select: () => ({}) }) }),
    module: { exports: {} }, exports: {} };
  ctx.globalThis = ctx; runInNewContext(js, ctx); return ctx.__ME;
}
const ME = carregarServidor();
const N = Number(process.argv[2] || 6000);

const BASE = { fin:13,pas:13,dri:13,des:13,cab:13,cru:13,vis:13,pos:13,com:13,det:13,vel:13,res:13,fis:13,agi:13,ref:8,mao:8 };
const j = (n,s,attr) => ({ n, pid:n, f:70, rawF:70, s, energy:100, moral:70, attr });

/* elenco 4-4-2 com f=70 em todos; `mod` aplica o atributo em teste ao setor alvo */
function elenco(setor, mods) {
  const A = (extra) => ({ ...BASE, ...(extra||{}) });
  const sq = [ j('gk','GK', A({ ref:13, mao:13 })) ];
  for (let i=0;i<4;i++) sq.push(j('d'+i,'DEF', A(setor==='DEF'?mods:null)));
  for (let i=0;i<4;i++) sq.push(j('m'+i,'MID', A(setor==='MID'?mods:null)));
  for (let i=0;i<2;i++) sq.push(j('a'+i,'ATT', A(setor==='ATT'?mods:null)));
  return sq;
}
function duelo(sqA, sqB, rounds) {
  let vA=0,eA=0,dA=0,gA=0,gB=0;
  for (let r=0;r<rounds;r++) {
    const casaA = r%2===0;
    const mk = sq => ({ rat: ME.computeRatings(sq, sq.map(p=>p.pid)), xi: sq, tactic:'equilibrado', cap:20000, short:'X' });
    const res = ME.simMatchPure('h','a', mk(casaA?sqA:sqB), mk(casaA?sqB:sqA), (r*7919+13)>>>0, {});
    const ga = casaA?res.hg:res.ag, gb = casaA?res.ag:res.hg;
    gA+=ga; gB+=gb;
    if (ga>gb) vA++; else if (ga===gb) eA++; else dA++;
  }
  return { v:100*vA/rounds, e:100*eA/rounds, d:100*dA/rounds, gp:gA/rounds, gc:gB/rounds };
}

const TESTES = [
  ['DRIBLE   (ataque)',  'ATT', { dri:16 }, { dri:13 }],
  ['PASSE    (meio)',    'MID', { pas:16, vis:16 }, { pas:13, vis:13 }],
  ['DESARME  (defesa)',  'DEF', { des:16, pos:16 }, { des:13, pos:13 }],
];
console.log(`\n=== ATRIBUTOS DE LINHA — setor "talentoso" (16) × "genérico" (13), times iguais em força, N=${N} ===`);
for (const [rot, setor, bom, neutro] of TESTES) {
  const r = duelo(elenco(setor,bom), elenco(setor,neutro), N);
  console.log(`${rot}  ${r.v.toFixed(0).padStart(2)}% V · ${r.e.toFixed(0).padStart(2)}% E · ${r.d.toFixed(0).padStart(2)}% D   gols ${r.gp.toFixed(2)} × ${r.gc.toFixed(2)}`);
}
/* controle: dois elencos IDÊNTICOS — tem que dar ~equilíbrio e é a régua do gol médio */
const c = duelo(elenco('MID',null), elenco('MID',null), N);
console.log(`CONTROLE (idênticos)  ${c.v.toFixed(0).padStart(2)}% V · ${c.e.toFixed(0).padStart(2)}% E · ${c.d.toFixed(0).padStart(2)}% D   gols ${c.gp.toFixed(2)} × ${c.gc.toFixed(2)}`);
