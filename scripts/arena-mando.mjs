/* Mede o MANDO DE CAMPO isolado: times idênticos, SEM alternar casa. Qualquer
   desvio de 33/33/33 é o mando. Varre o tamanho do estádio. */
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { runInNewContext } from 'node:vm';
const RAIZ='/Users/clawdio/Documents/GitHub/Elifoot/.claude/worktrees/calendar-multiplayer-sync-4c6601/';
let src = readFileSync(RAIZ+'supabase/functions/resolve-round/index.ts','utf8')
  .replace(/^import .*$/gm,'').replace(/Deno\.serve\(/,'((globalThis).__naoServe = ') + ';globalThis.__ME = ME;';
const js = transformSync(src,{loader:'ts',format:'cjs'}).code;
const ctx={console,Math,Date,JSON,Object,Array,String,Number,Boolean,Set,Map,isFinite,parseInt,parseFloat,
  Deno:{env:{get:()=>''},serve:()=>{}},createClient:()=>({from:()=>({select:()=>({})})}),module:{exports:{}},exports:{}};
ctx.globalThis=ctx; runInNewContext(js,ctx); const ME=ctx.__ME;

const N=Number(process.argv[2]||20000);
const A={fin:13,pas:13,dri:13,des:13,cab:13,cru:13,vis:13,pos:13,com:13,det:13,vel:13,res:13,fis:13,agi:13,ref:13,mao:13};
const j=(n,s)=>({n,pid:n,f:70,rawF:70,s,energy:100,moral:70,attr:{...A}});
const sq=[j('gk','GK'),...[0,1,2,3].map(i=>j('d'+i,'DEF')),...[0,1,2].map(i=>j('m'+i,'MID')),...[0,1,2].map(i=>j('a'+i,'ATT'))];
const mk=cap=>({rat:ME.computeRatings(sq,sq.map(p=>p.pid)),xi:sq,tactic:'equilibrado',cap,short:'X'});

console.log(`times IDÊNTICOS, casa fixa, N=${N} por linha\n`);
console.log('capacidade    mando     V(casa)   E     D(fora)   gols casa × fora');
for(const cap of [8000,20000,40000,60000,75000,100000]){
  let v=0,e=0,d=0,gh=0,ga=0;
  for(let i=0;i<N;i++){
    const r=ME.simMatchPure('h','a',mk(cap),mk(cap),(i*7919+13)>>>0,{});
    gh+=r.hg; ga+=r.ag;
    if(r.hg>r.ag)v++; else if(r.hg===r.ag)e++; else d++;
  }
  const t=Math.max(0,Math.min(1,(cap-8000)/(75000-8000)));
  const mando=(0.007+t*0.009).toFixed(4);
  console.log(`${String(cap).padStart(7)}      ${mando}   ${(100*v/N).toFixed(1).padStart(5)}%  ${(100*e/N).toFixed(1).padStart(5)}%  ${(100*d/N).toFixed(1).padStart(5)}%    ${(gh/N).toFixed(3)} × ${(ga/N).toFixed(3)}`);
}
