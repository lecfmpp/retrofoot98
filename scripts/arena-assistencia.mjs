/* ARENA DA ASSISTÊNCIA (26/08) — mede o passe para gol que o motor passou a sortear.
   Confere três coisas: a fração de gols assistidos, quem assiste (por posição) e se
   passe+visão realmente decidem o assistente. Motor real do servidor.
   Uso: node scripts/arena-assistencia.mjs [N] */
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { runInNewContext } from 'node:vm';
const RAIZ = new URL('..', import.meta.url).pathname;
let src = readFileSync(process.env.MOTOR_ALVO || RAIZ + '/supabase/functions/resolve-round/index.ts', 'utf8')
  .replace(/^import .*$/gm, '').replace(/Deno\.serve\(/, '((globalThis).__naoServe = ') + ';globalThis.__ME = ME;';
const js = transformSync(src, { loader: 'ts', format: 'cjs' }).code;
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Boolean, Set, Map, isFinite, parseInt, parseFloat,
  Deno: { env: { get: () => '' }, serve: () => {} }, createClient: () => ({ from: () => ({ select: () => ({}) }) }),
  module: { exports: {} }, exports: {} };
ctx.globalThis = ctx; runInNewContext(js, ctx);
const ME = ctx.__ME;
const N = Number(process.argv[2] || 8000);

const BASE = { fin:13,pas:13,dri:13,des:13,cab:13,cru:13,vis:13,pos:13,com:13,det:13,vel:13,res:13,fis:13,agi:13,ref:8,mao:8 };
const j = (n,s,extra) => ({ n, pid:n, f:70, rawF:70, s, energy:100, moral:70, attr:{...BASE, ...(extra||{})} });
/* 4-4-2, todos f=70. Dois meias marcados: um "armador" (passe/visão altos) e um
   genérico — mesma força, para o efeito medido ser só do atributo. */
const sq = [ j('gk','GK',{ref:13,mao:13}),
  ...[0,1,2,3].map(i=>j('d'+i,'DEF')),
  j('armador','MID',{pas:18,vis:18}), j('generico','MID'), j('m2','MID'), j('m3','MID'),
  ...[0,1].map(i=>j('a'+i,'ATT')) ];
const mk = () => ({ rat: ME.computeRatings(sq, sq.map(p=>p.pid)), xi: sq, tactic:'equilibrado', cap:20000, short:'X' });

let gols=0, comAssist=0; const porNome={}, porPos={};
for (let i=0;i<N;i++){
  const r = ME.simMatchPure('h','a', mk(), mk(), (i*7919+13)>>>0, {});
  (r.scorers||[]).forEach(s=>{
    gols++;
    if(s.assist){ comAssist++; porNome[s.assist]=(porNome[s.assist]||0)+1;
      const p=sq.find(x=>x.n===s.assist); if(p) porPos[p.s]=(porPos[p.s]||0)+1; }
  });
}
console.log(`\n=== ASSISTÊNCIA — ${N} partidas, ${gols} gols ===`);
console.log(`gols assistidos: ${comAssist} de ${gols}  (${(100*comAssist/gols).toFixed(1)}%)   alvo do desenho: 68% dos gols de bola rolando`);
console.log(`\npor posição do assistente:`);
Object.entries(porPos).sort((a,b)=>b[1]-a[1]).forEach(([s,n])=>
  console.log(`  ${s.padEnd(4)} ${String(n).padStart(5)}  (${(100*n/comAssist).toFixed(1)}%)`));
const A=porNome['armador']||0, G=porNome['generico']||0;
console.log(`\nmesma força, só o atributo muda:`);
console.log(`  armador  (pas/vis 18): ${A}`);
console.log(`  genérico (pas/vis 13): ${G}`);
console.log(`  o armador assiste ${(A/Math.max(1,G)).toFixed(2)}× mais`);
