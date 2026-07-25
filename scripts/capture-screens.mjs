// Captura screenshots reais do RetroFoot98 (jogo atual) dirigindo o preview via puppeteer-core + Chrome do sistema.
// Uso: node scripts/capture-screens.mjs   (preview precisa estar em http://localhost:5173)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:5173/';
const OUT = resolve(process.cwd(), 'screenshots-atual');
mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let n = 0;
const log = (...a) => console.log('  ', ...a);

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox','--window-size=1360,900',
    // headless "esconde" a página e estrangula setTimeout/setInterval — isso travava o loading e o
    // sorteio da copa (ambos dirigidos por timer). Estas flags mantêm os timers em velocidade normal.
    '--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'],
  defaultViewport: { width: 1320, height: 860 },
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0,120)));
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(1500);

async function shot(name){
  n++;
  const label = String(n).padStart(2,'0') + ' - ' + name;
  try{ await page.evaluate(()=>{ const t=document.getElementById('c-toast'); if(t) t.replaceChildren(); }); }catch(e){} // limpa toasts sobrando
  await page.screenshot({ path: resolve(OUT, label + '.png') });
  log('📸', label, '| screen=', await page.evaluate(()=>typeof CL!=='undefined'?CL.screen:'?'));
}
// chama código no jogo com try/catch e espera o redraw
async function run(fn, wait=700){ try{ await page.evaluate(fn); }catch(e){ log('  (evaluate falhou)', String(e).slice(0,80)); } await sleep(wait); }

// ---------------- ABERTURA + SETUP ----------------
await shot('Abertura (landing)');
await run(()=>clGoModo());            await shot('Modo (Solo ou Resenha)');
await run(()=>clPickSolo());          await shot('Solo - novo ou continuar');
await run(()=>clSoloNew());           await shot('Solo - nome do save');
await run(()=>{ CL.save='CAP01'; clModoOk(); }, 900);  await shot('Selecao de paises');
await run(()=>clPaisesOk(), 900);
if(await page.evaluate(()=>CL.screen==='paisJogavel')){ await shot('Pais jogavel / divisao'); await run(()=>clPaisJogavelOk(), 900); }
if(await page.evaluate(()=>CL.screen==='moeda')){ await shot('Escolha de moeda'); await run(()=>clMoedaOk(), 900); }
if(await page.evaluate(()=>CL.screen==='jogadores')){ await shot('Numero de jogadores'); }

// jogadores -> escolha de clubes (clEscolherClubes monta o _pickPool via bundle, sem exigir login)
await run(()=>{ CL.names=['VOCE']; if(typeof clEscolherClubes==='function') clEscolherClubes(); }, 3500);
if(await page.evaluate(()=>CL.screen==='escolhaclubes')) await shot('Escolha os clubes (sorteio)');
// sorteia o clube e começa (loading -> clConfirmarClubes -> clEntrar -> main)
await run(()=>{ if(typeof clSortearStart==='function') clSortearStart(); }, 3500);
let drewCup=false, skipped=false;
for(let i=0;i<50 && await page.evaluate(()=>CL.screen!=='main'); i++){
  const sc = await page.evaluate(()=>typeof CL!=='undefined'?CL.screen:'?');
  if(sc==='cupdraw' && !drewCup){ drewCup=true; await shot('Sorteio da Copa (inicio)'); }
  if(sc==='cupdraw' && !skipped){ skipped=true; await run(()=>{ if(typeof clCupDrawSkip==='function') clCupDrawSkip(); }, 400); } // acelera 1x só
  await run(()=>{ if((CL.screen==='classif'||CL.screen==='seatclassif') && typeof clClassifContinue==='function') clClassifContinue(); }, 400);
}
await sleep(3000); // deixa os toasts ("Sorteio acelerado") expirarem antes de fotografar as abas
log('estado apos setup:', await page.evaluate(()=>CL.screen));

// ---------------- TELA PRINCIPAL: ABAS ----------------
async function tab(t,nome){ try{ await page.evaluate((tt)=>clTab(tt), t); }catch(e){} await sleep(600); await shot(nome); }
if(await page.evaluate(()=>CL.screen==='main')){
  await tab('jogo','Aba Jogo'); await tab('jogador','Aba Jogador'); await tab('financas','Aba Financas');
  await tab('seleccao','Aba Formacao'); await tab('correio','Aba E-mail'); await tab('adversario','Aba Adversario');
  await run(()=>clTab('jogo'),400);

  // ---------------- MENUS DO TOPO ----------------
  async function menu(m){ try{ await page.evaluate(()=>{CL.menu=null;}); }catch(e){} try{ await page.evaluate((mm)=>clMenu(mm,{stopPropagation(){},preventDefault(){}}), m); }catch(e){} await sleep(500); await shot('Menu - '+m); try{ await page.evaluate(()=>{CL.menu=null;cdraw();}); }catch(e){} await sleep(200); }
  for(const m of ['RetroFoot98','Formação','Equipa','Jogador','Campeonatos','Treinador']) await menu(m);

  // ---------------- MODAIS ----------------
  async function modal(fnName, nome, arg){ try{ await page.evaluate((f,a)=>{ if(typeof window[f]==='function'){ a!==undefined?window[f](a):window[f](); } }, fnName, arg); }catch(e){ log('modal falhou', fnName); } await sleep(700); await shot('Modal - '+nome); await run(()=>{ if(typeof clCloseOverlay==='function') clCloseOverlay(); CL.menu=null; },300); }
  await modal('clClassif','Classificacao');
  await modal('clCompList','Minhas competicoes');
  await modal('clStadium','Estadio');
  await modal('clIncomingOffers','Propostas recebidas');
  await modal('clAuctionScreen','Leilao');
  await modal('clPromoteYouth','Subir da base');
  await modal('clCoachHistory','Treinador - Historia');
  await modal('clCoachRanking','Treinador - Ranking');
  await modal('clPerfilTreinador','Perfil do treinador');
  await modal('clClubHistory','Historia do clube');
  await modal('clCalendar','Calendario');
  await modal('clOptions','Opcoes');

  // ---------------- PARTIDA AO VIVO ----------------
  await run(()=>{ if(typeof clCloseOverlay==='function') clCloseOverlay(); CL.menu=null; CL.tab='jogo'; }, 300);
  await run(()=>{ try{ if(typeof autoXI==='function' && CL.clubId) S.xi=autoXI(CL.clubId); }catch(e){} CL.tacticChosen=true; CL.formation=CL.formation||'4-4-2'; }, 300);
  await run(()=>{ if(typeof clJogar==='function') clJogar(); }, 3000);
  if(await page.evaluate(()=>CL.screen==='live')){
    await shot('Partida ao vivo (1o tempo)');
    await sleep(4000); await shot('Partida ao vivo (andamento)');
    await sleep(4000); await shot('Partida ao vivo (mais tarde)');
  } else { log('partida ao vivo: não abriu (screen='+await page.evaluate(()=>CL.screen)+')'); }
}

await browser.close();
console.log('\\nOK. Screenshots em:', OUT, '(', n, 'imagens )');
