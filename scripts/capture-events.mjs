// Captura screenshots dos EVENTOS internos da partida (pênalti, lesão, expulsão) + classificação
// pós-rodada. Dispara os modais com eventos sintéticos válidos. Salva em screenshots-atual/ (continua a numeração).
// Uso: node scripts/capture-events.mjs   (preview em http://localhost:5173)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.RF_URL || 'http://localhost:5199/';
const OUT = resolve(process.cwd(), 'screenshots-catalogo');
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
await page.goto(URL+'?rf=hub',{waitUntil:'networkidle2',timeout:60000}); await sleep(3500);
async function shot(name){ n++; const label=String(n).padStart(2,'0')+' - '+name;
  try{ await page.evaluate(()=>{ const t=document.getElementById('c-toast'); if(t) t.replaceChildren(); }); }catch(e){}
  await page.screenshot({ path: resolve(OUT, label+'.png') }); log('📸', label, '| screen=', await page.evaluate(()=>typeof CL!=='undefined'?CL.screen:'?')); }
async function run(fn, wait=600){ try{ await page.evaluate(fn); }catch(e){ log('(evaluate falhou)', String(e).slice(0,90)); } await sleep(wait); }

/* ENTRA-SE PELO ATALHO DE BANCADA (?rf=hub), NAO PELO ASSISTENTE.
   Estes scripts percorriam os sete passos do onboarding chamando clGoModo/clPickSolo/... a
   cada corrida. O assistente foi redesenhado em 20/08 e ganhou um passo novo (Modalidade,
   masculino ou feminino): a sequencia antiga passa por ele sem responder e encalha em
   'boasvindas' — a partida nunca abria e o script saia sem tirar foto nenhuma dos eventos.
   O ?rf=hub monta um save descartavel da Serie D e cai direto no jogo, que e' exatamente o
   ponto de partida de que estas capturas precisam. Quem fotografa o assistente, e le a regua
   na propria pagina em vez de adivinhar a ordem, e' o scripts/capture-wizard.mjs. */
log('estado:', await page.evaluate(()=>typeof CL!=='undefined'?CL.screen:'?'));

// ---- INICIA PARTIDA AO VIVO ----
await run(()=>{ try{ if(typeof autoXI==='function'&&CL.clubId) S.xi=autoXI(CL.clubId); }catch(e){} CL.tacticChosen=true; CL.formation=CL.formation||'4-4-2'; }, 300);
/* ATE O CAMPO, E NAO UM CLIQUE SO. O botao "Jogar" e' uma ESCADA (ver rfProximaAcao em
   rf26.js): num dia de sorteio ele abre o sorteio, num dia de classificacao abre a tabela,
   e so' depois disso e' que leva a campo. O clique unico que estava aqui parava no primeiro
   degrau -- a corrida saia com "partida nao abriu" sempre que a rodada tivesse copa pela
   frente, que e' precisamente a rodada 1 de qualquer save novo. */
for(let i=0;i<40 && !(await page.evaluate(()=>CL.screen==='live')); i++){
  await run(()=>{
    if(CL.screen==='cupdraw' && typeof clCupDrawSkip==='function') return clCupDrawSkip();
    if((CL.screen==='classif'||CL.screen==='seatclassif') && typeof clClassifContinue==='function') return clClassifContinue();
    if(typeof rfJogar==='function') return rfJogar();
    if(typeof clJogar==='function') return clJogar();
  }, 700);
}
await sleep(1500);
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
