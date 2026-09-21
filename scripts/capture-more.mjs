// Captura telas adicionais: intervalo/substituição, disputa de pênaltis, fim de temporada
// (premiação) e telas da Resenha (escolha/criar/entrar). Estados sintéticos válidos.
// Salva em screenshots-atual/ continuando a numeração (43+).
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL=process.env.RF_URL||'http://localhost:5199/';
const OUT=resolve(process.cwd(),'screenshots-catalogo'); mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let n=42; const log=(...a)=>console.log('  ',...a);
const browser=await puppeteer.launch({ executablePath:CHROME, headless:'new',
  args:['--no-sandbox','--window-size=1360,900','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'],
  defaultViewport:{width:1320,height:860} });
const page=await browser.newPage();
page.on('pageerror',e=>console.log('  [pageerror]',String(e).slice(0,120)));
await page.goto(URL+'?rf=hub',{waitUntil:'networkidle2',timeout:60000}); await sleep(3500);
async function shot(name){ n++; const label=String(n).padStart(2,'0')+' - '+name;
  try{ await page.evaluate(()=>{ const t=document.getElementById('c-toast'); if(t) t.replaceChildren(); }); }catch(e){}
  await page.screenshot({path:resolve(OUT,label+'.png')}); log('📸',label,'| screen=',await page.evaluate(()=>typeof CL!=='undefined'?CL.screen:'?')); }
async function run(fn,wait=600){ try{ await page.evaluate(fn); }catch(e){ log('(evaluate falhou)',String(e).slice(0,90)); } await sleep(wait); }

/* ENTRA-SE PELO ATALHO DE BANCADA (?rf=hub), NAO PELO ASSISTENTE.
   Estes scripts percorriam os sete passos do onboarding chamando clGoModo/clPickSolo/... a
   cada corrida. O assistente foi redesenhado em 20/08 e ganhou um passo novo (Modalidade,
   masculino ou feminino): a sequencia antiga passa por ele sem responder e encalha em
   'boasvindas' — a partida nunca abria e o script saia sem tirar foto nenhuma dos eventos.
   O ?rf=hub monta um save descartavel da Serie D e cai direto no jogo, que e' exatamente o
   ponto de partida de que estas capturas precisam. Quem fotografa o assistente, e le a regua
   na propria pagina em vez de adivinhar a ordem, e' o scripts/capture-wizard.mjs. */
log('estado:', await page.evaluate(()=>typeof CL!=='undefined'?CL.screen:'?'));

// ---- INICIA PARTIDA ----
await run(()=>{ try{ if(typeof autoXI==='function'&&CL.clubId) S.xi=autoXI(CL.clubId); }catch(e){} CL.tacticChosen=true; CL.formation=CL.formation||'4-4-2'; },300);
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
const inLive=await page.evaluate(()=>CL.screen==='live');
if(inLive){
  await sleep(2000);
  // ---- INTERVALO ----
  await run(()=>{ const RL=CL.live; const m=RL.matches.find(x=>x.user)||RL.matches[0];
    RL.paused=true; RL.halftimeLeft=8; RL.sel=RL.matches.indexOf(m); RL.penEvent=null; RL.injEvent=null; RL.pens=null;
    if(CL._liveTimer){ clearTimeout(CL._liveTimer); CL._liveTimer=null; } cdraw(); },700);
  await shot('Partida - Intervalo (substituicao)');
  // ---- SUBSTITUIÇÃO (painel) ----
  await run(()=>{ CL.subPanelOpen=true; const xi=xiPlayers(CL.clubId); CL.subOut=(xi.find(p=>p.s!=='GK')||xi[7]).pid; cdraw(); },600);
  await shot('Partida - Substituicao (escolher quem entra)');
  await run(()=>{ CL.subPanelOpen=false; CL.subOut=null; const RL=CL.live; if(RL){ RL.paused=false; RL.halftimeLeft=null; RL.sel=null; } cdraw(); },500);
  // ---- DISPUTA DE PÊNALTIS ----
  await run(()=>{ const RL=CL.live; const m=RL.matches.find(x=>x.user)||RL.matches[0];
    RL.pens={ h:[{scored:true},{scored:true},{scored:false}], a:[{scored:true},{scored:false},{scored:true}], turn:'H' };
    RL.pensPicking=true; RL.sel=RL.matches.indexOf(m);
    CL.penSel=(xiPlayers(CL.clubId).find(p=>p.s!=='GK')||xiPlayers(CL.clubId)[9]).n;
    CL.penDeadline=Date.now()+10000; // sem isto o contador mostra "NaNs"
    if(CL._penTimer){ clearInterval(CL._penTimer); CL._penTimer=null; } cdraw(); },800);
  await shot('Partida - Disputa de penaltis');
  await run(()=>{ const RL=CL.live; if(RL){ RL.pens=null; RL.pensPicking=false; RL.sel=null; } cdraw(); },400);
  // sai da partida pro main
  await run(()=>{ if(CL._liveTimer){clearTimeout(CL._liveTimer);CL._liveTimer=null;} CL.live=null; CL.screen='main'; CL.tab='jogo'; cdraw(); },600);
} else log('partida não abriu; pulando telas de partida');

// ---- FIM DE TEMPORADA (PREMIAÇÃO) ----
await run(()=>{
  S._seasonPrizes={ total:8500000, lines:[
    {icon:'🏆', comp:'Série D', place:'Campeão', amount:5000000},
    {icon:'🥇', comp:'Acesso', place:'Subiu de divisão', amount:2000000},
    {icon:'👟', comp:'Artilharia', place:'Artilheiro da competição', amount:1500000},
  ], art:{ mine:true, name:'Diego Rodrigues', goals:22, valFrom:330000, valTo:2100000 } };
  S.history=S.history||[]; if(!S.history.length) S.history.push({ season:S.season, qualifiedFor:['libertadores'] });
  if(typeof seasonEndDialog==='function') seasonEndDialog();
}, 800);
if(await page.evaluate(()=>!!document.querySelector('.cl-prizes, .cl-res'))) await shot('Fim de temporada (premiacao)');
else log('premiação não renderizou');
await run(()=>{ if(typeof clCloseOverlay==='function') clCloseOverlay(); },400);

// ---- RESENHA (online): escolha / criar / entrar ----
await run(()=>{ CL.online=false; CL.screen='online';
  CL.net={ step:'escolha', intent:'host', authMode:'login', name:CL.mgr||'VOCE', email:'', roomName:'', code:'', myRooms:[] };
  if(typeof wireNet==='function') wireNet(); cdraw(); }, 700);
if(await page.evaluate(()=>CL.screen==='online')) await shot('Resenha - escolha (criar ou entrar)');
await run(()=>{ CL.net.step='sala'; CL.net.roomName='RESENHA DA GALERA'; cdraw(); },500);
await shot('Resenha - criar sala');
await run(()=>{ CL.net.step='joincode'; CL.net.code=''; cdraw(); },500);
await shot('Resenha - entrar por codigo');

await browser.close();
console.log('\\nOK. Novos screenshots (43+) em:', OUT);
