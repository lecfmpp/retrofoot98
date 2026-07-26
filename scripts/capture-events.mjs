// Captura screenshots dos EVENTOS internos da partida (pênalti, lesão, expulsão) + classificação
// pós-rodada. Dispara os modais com eventos sintéticos válidos. Salva em screenshots-atual/ (continua a numeração).
// Uso: node scripts/capture-events.mjs   (preview em http://localhost:5173)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:5173/';
const OUT = resolve(process.cwd(), 'screenshots-atual');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let n = 36; // continua depois dos 36 já capturados
const log = (...a) => console.log('  ', ...a);

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox','--window-size=1360,900','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'],
  defaultViewport: { width: 1320, height: 860 },
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0,120)));
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(1500);
async function shot(name){ n++; const label=String(n).padStart(2,'0')+' - '+name;
  try{ await page.evaluate(()=>{ const t=document.getElementById('c-toast'); if(t) t.replaceChildren(); }); }catch(e){}
  await page.screenshot({ path: resolve(OUT, label+'.png') }); log('📸', label, '| screen=', await page.evaluate(()=>typeof CL!=='undefined'?CL.screen:'?')); }
async function run(fn, wait=600){ try{ await page.evaluate(fn); }catch(e){ log('(evaluate falhou)', String(e).slice(0,90)); } await sleep(wait); }

// ---- SETUP -> main (igual capture-screens) ----
await run(()=>clGoModo()); await run(()=>clPickSolo()); await run(()=>clSoloNew());
await run(()=>{ CL.save='EV01'; clModoOk(); }, 900);
await run(()=>clPaisesOk(), 900);
if(await page.evaluate(()=>CL.screen==='paisJogavel')) await run(()=>clPaisJogavelOk(), 900);
if(await page.evaluate(()=>CL.screen==='moeda')) await run(()=>clMoedaOk(), 900);
await run(()=>{ CL.names=['VOCE']; if(typeof clEscolherClubes==='function') clEscolherClubes(); }, 3500);
await run(()=>{ if(typeof clSortearStart==='function') clSortearStart(); }, 3500);
let skipped=false;
for(let i=0;i<50 && await page.evaluate(()=>CL.screen!=='main'); i++){
  if(await page.evaluate(()=>CL.screen==='cupdraw') && !skipped){ skipped=true; await run(()=>{ if(typeof clCupDrawSkip==='function') clCupDrawSkip(); },400); }
  await run(()=>{ if((CL.screen==='classif'||CL.screen==='seatclassif')&&typeof clClassifContinue==='function') clClassifContinue(); }, 400);
}
await sleep(2500);
log('estado:', await page.evaluate(()=>CL.screen));

// ---- INICIA PARTIDA AO VIVO ----
await run(()=>{ try{ if(typeof autoXI==='function'&&CL.clubId) S.xi=autoXI(CL.clubId); }catch(e){} CL.tacticChosen=true; CL.formation=CL.formation||'4-4-2'; }, 300);
await run(()=>{ if(typeof clJogar==='function') clJogar(); }, 2500);
if(!await page.evaluate(()=>CL.screen==='live')){ log('partida não abriu; abortando eventos'); await browser.close(); process.exit(0); }
await sleep(2500); // deixa a partida progredir um pouco

// ---- PÊNALTI (escolha do batedor) ----
await run(()=>{ const RL=CL.live; const m=RL.matches.find(x=>x.user)||RL.matches[0];
  const side=m.h===CL.clubId?'H':'A';
  const e={type:'penalti', team:CL.clubId, side, min:23, scorer:null, scored:null, stoppage:false};
  if(typeof openPenaltyModal==='function') openPenaltyModal(m,e);
  if(CL._penTimer){ clearInterval(CL._penTimer); CL._penTimer=null; } // congela o timer p/ a foto
}, 700);
await shot('Partida - Penalti (escolher batedor)');
await run(()=>{ const nome=CL.penSel||'Jogador'; CL.penPhase='suspense'; CL.penResultScorer=nome; cdraw(); }, 500);
await shot('Partida - Penalti (suspense)');
await run(()=>{ CL.penPhase='result'; CL.penResultScored=true; cdraw(); }, 500);
await shot('Partida - Penalti (gol)');
// reset pênalti (retoma)
await run(()=>{ const RL=CL.live; if(RL){ RL.penEvent=null; RL.penMatch=null; RL.paused=false; RL.sel=null; } CL.penPhase=null; CL.penResultScorer=null; CL.penResultScored=null; if(CL._penTimer){clearInterval(CL._penTimer);CL._penTimer=null;} cdraw(); }, 800);

// ---- LESÃO (substituição) ----
await run(()=>{ const RL=CL.live; const m=RL.matches.find(x=>x.user)||RL.matches[0];
  const side=m.h===CL.clubId?'H':'A';
  const inj=(xiPlayers(CL.clubId).find(p=>p.s!=='GK'))||xiPlayers(CL.clubId)[1];
  const e={type:'lesao', team:CL.clubId, side, min:34, player:inj.n, pid:inj.pid, pos:inj.s, severity:'leve', outMatches:2};
  if(typeof openInjuryModal==='function') openInjuryModal(m,e);
  if(CL._injTimer){ clearInterval(CL._injTimer); CL._injTimer=null; } // congela p/ a foto
}, 800);
await shot('Partida - Lesao (substituicao)');
await run(()=>{ const RL=CL.live; if(RL){ RL.injEvent=null; RL.injMatch=null; RL.paused=false; RL.sel=null; } CL.injSel=null; if(CL._injTimer){clearInterval(CL._injTimer);CL._injTimer=null;} cdraw(); }, 800);

// ---- EXPULSÃO (cartão vermelho no feed da partida) ----
await run(()=>{ const RL=CL.live; const m=RL.matches.find(x=>x.user)||RL.matches[0];
  const side=m.h===CL.clubId?'H':'A';
  const p=(xiPlayers(CL.clubId).find(x=>x.s==='DEF'))||xiPlayers(CL.clubId)[3];
  // o feed lê m.incidents (eventos JÁ ocorridos), não m.events (timeline futura)
  const xi=xiPlayers(CL.clubId); const y=xi.find(x=>x.s==='MID')||xi[6];
  m.incidents=m.incidents||[];
  m.incidents.push({type:'cartao', side, min:19, player:y.n, cardType:'amarelo', reason:null});
  m.incidents.push({type:'cartao', side, min:38, player:p.n, cardType:'vermelho', reason:'direto'});
  RL.sel=RL.matches.indexOf(m); cdraw();
}, 800);
await shot('Partida - Expulsao (cartao vermelho)');
await run(()=>{ const RL=CL.live; if(RL) RL.sel=null; cdraw(); }, 400);

// ---- DEIXA A PARTIDA TERMINAR -> CLASSIFICAÇÃO PÓS-RODADA ----
await run(()=>{ CL.speedMult=8; const RL=CL.live; if(RL){ RL.paused=false; RL.penEvent=null; RL.injEvent=null; } }, 300);
for(let i=0;i<60 && !await page.evaluate(()=>CL.screen==='classif'||CL.screen==='seatclassif'||CL.screen==='main'); i++) await sleep(600);
let sc = await page.evaluate(()=>CL.screen);
if(sc==='classif'||sc==='seatclassif'){ await shot('Pos-rodada - Classificacao das divisoes'); }
else { // fallback: renderiza a classificação direto
  await run(()=>{ if(typeof showLiveClassif==='function') showLiveClassif(); }, 800);
  if(await page.evaluate(()=>CL.screen==='classif')) await shot('Pos-rodada - Classificacao das divisoes');
  else log('classificação pós-rodada não capturada (screen='+sc+')');
}

await browser.close();
console.log('\\nOK. Novos screenshots (37+) em:', OUT);
