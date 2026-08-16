// Captura uma foto de CADA tela do assistente (onboarding), nos dois modos, com o
// passo aceso na régua anotado no nome do ficheiro. Serve de referência para desenhar.
// Uso: node scripts/capture-wizard.mjs      (preview em http://localhost:5199)
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.RF_URL || 'http://localhost:5199/';
const OUT = resolve(process.cwd(), 'screenshots-assistente');
mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox','--window-size=1360,940',
    '--disable-background-timer-throttling','--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding'],
  defaultViewport: { width: 1320, height: 900 },
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('  [erro]', String(e).slice(0,100)));
await page.goto(URL, { waitUntil:'networkidle2', timeout:60000 });
await sleep(1800);

const inventario = [];

/* lê qual passo está aceso, seja qual for o dos dois desenhos de régua */
const lerPasso = () => page.evaluate(() => {
  let it=[...document.querySelectorAll('.rf-trilha-i')];
  if(!it.length) it=[...document.querySelectorAll('.rf-wiz-p')];
  const i=it.findIndex(x=>/atual|(^|\s)on(\s|$)/.test(x.className));
  const titulo=(document.querySelector('.rf-wiz-t')||document.querySelector('.cl-wiz-title')
             ||document.querySelector('.cl-wiz-h')||{}).textContent||'';
  return { total: it.length,
    passo: i>=0 ? i+1 : 0,
    rotulo: i>=0 ? it[i].textContent.replace(/\s+/g,' ').replace(/^\d+\s*/,'').trim() : '—',
    titulo: titulo.replace(/\s+/g,' ').trim().slice(0,60) };
});

async function foto(modo, id, nome, preparar){
  try{ await page.evaluate(preparar); }catch(e){ console.log('  (preparar falhou)', id, String(e).slice(0,70)); }
  await sleep(750);
  const p = await lerPasso();
  const etiqueta = `${modo} ${String(p.passo||0).padStart(2,'0')} ${id} - ${nome}`.replace(/[\/]/g,'-');
  await page.screenshot({ path: resolve(OUT, etiqueta + '.png') });
  inventario.push({ modo, id, nome, ...p, ficheiro: etiqueta + '.png' });
  console.log(`  📸 ${etiqueta}   [${p.passo}/${p.total} · ${p.rotulo}]`);
}

/* ---------------- MODO SOLO ---------------- */
console.log('\nSOLO');
await foto('solo','abertura','Landing', ()=>{ CL.online=false; CL.screen='abertura'; CL.landingView='home'; cdraw(); });
await foto('solo','login','Entrar ou criar conta', ()=>{ CL.screen='login'; cdraw(); });
await foto('solo','modo','Escolher o modo', ()=>{ CL.screen='modo'; cdraw(); });
await foto('solo','modosolo','Saves / comecar novo', ()=>{ CL.screen='modosolo'; cdraw(); });
await foto('solo','paises','Selecao de paises', ()=>{ CL.screen='paises'; cdraw(); });
await foto('solo','paisJogavel','Pais jogavel', ()=>{ CL.countries=new Set(['Brasil','Argentina']); CL.screen='paisJogavel'; cdraw(); });
await foto('solo','moeda','Escolha de moeda', ()=>{ CL.screen='moeda'; cdraw(); });
await foto('solo','jogadores','Numero de treinadores', ()=>{ CL.screen='jogadores'; cdraw(); });
await foto('solo','loading','Carregando', ()=>{ CL._loadPct=45; CL.screen='loading'; cdraw(); });
await foto('solo','escolhaclubes','Escolha dos clubes', ()=>{ CL.screen='escolhaclubes'; cdraw(); });

/* o sorteio e as boas-vindas precisam de um save montado */
console.log('\nSOLO (com save)');
await page.goto(URL+'?rf=1', { waitUntil:'networkidle2', timeout:60000 });
await sleep(3500);
await foto('solo','sorteio','Sorteio do clube', ()=>{ CL.online=false; CL.screen='sorteio'; cdraw(); });
await foto('solo','boasvindas','Boas-vindas', ()=>{ CL.screen='boasvindas'; cdraw(); });

/* ---------------- MODO RESENHA ---------------- */
console.log('\nRESENHA');
await page.goto(URL, { waitUntil:'networkidle2', timeout:60000 });
await sleep(1800);
/* o puppeteer serializa a funcao: nada de new Function nem de bind, so closures
   que ele consegue escrever como texto. */
await foto('resenha','conta','Entrar ou criar conta', ()=>{
  CL.online=true; CL.net=CL.net||{}; CL.net.step='conta';
  if(typeof NET==='undefined') window.NET={};
  CL.screen='online'; cdraw(); });
await foto('resenha','modo','Escolher o modo', ()=>{ CL.online=true; CL.screen='modo'; cdraw(); });
await foto('resenha','escolha','Criar ou entrar', ()=>{ CL.online=true; CL.net=CL.net||{}; CL.net.step='escolha';
  if(typeof NET==='undefined') window.NET={};
  CL.screen='online'; cdraw(); });
await foto('resenha','joincode','Entrar por codigo', ()=>{ CL.online=true; CL.net=CL.net||{}; CL.net.step='joincode';
  if(typeof NET==='undefined') window.NET={};
  CL.screen='online'; cdraw(); });
await foto('resenha','minhassalas','Minhas salas', ()=>{
  CL.online=true; CL.net=CL.net||{};
  CL.net.myRooms=[{code:'NKPPY',name:'Resenha da firma',phase:'lobby',host:true,createdAt:Date.now()},
                  {code:'K6YK6',name:'Sabado a noite',phase:'lobby',host:true,createdAt:Date.now()-1e6}];
  CL.net.step='minhassalas'; CL.screen='online'; cdraw(); });
await foto('resenha','sala','Criar a sala', ()=>{
  CL.online=true; CL.net=CL.net||{}; CL.net.step='sala';
  if(typeof NET==='undefined') window.NET={}; NET.isHost=true;
  CL.screen='online'; cdraw(); });
await foto('resenha','waitapproval','A espera de aprovacao', ()=>{ CL.online=true; CL.net=CL.net||{}; CL.net.step='waitapproval';
  if(typeof NET==='undefined') window.NET={};
  CL.screen='online'; cdraw(); });
await foto('resenha','lobby','Sala aberta / convites', ()=>{
  CL.online=true; CL.net=CL.net||{}; CL.net.step='lobby';
  if(typeof NET==='undefined') window.NET={};
  NET.isHost=true; NET.room={code:'7KP2M',name:'Resenha da firma',div:'D',
    seats:[{name:'GRINGO',club:null,host:true},{name:'ZECA',club:null}]};
  CL.screen='online'; cdraw(); });
await foto('resenha','reveal','Sorteio dos clubes', ()=>{
  CL.online=true; CL.net=CL.net||{}; CL.net.step='reveal'; CL.screen='online'; cdraw(); });

writeFileSync(resolve(OUT,'inventario.json'), JSON.stringify(inventario,null,1));
console.log(`\n${inventario.length} telas em ${OUT}`);
await browser.close();
