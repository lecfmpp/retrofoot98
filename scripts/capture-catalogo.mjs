/* CATALOGO DE TELAS — uma foto de CADA pagina e CADA aba do jogo, na pele atual.
   Serve o site (as paginas do rodape), o media kit e o video.

   POR QUE UM SCRIPT NOVO E NAO UM REMENDO NO capture-screens.mjs: aquele percorre o
   FLUXO (abertura -> onboarding -> partida) chamando as funcoes cl* uma a uma, e o
   fluxo mudou de desenho em 20/08 — os rotulos dele ja nao batem com as telas (o
   passo 4 hoje e "Modalidade", e ele fotografa isso chamando de "nome do save").
   O assistente inteiro ja tem dono: scripts/capture-wizard.mjs, que le a regua na
   propria pagina e acerta sempre. Aqui trata-se do DENTRO do jogo, onde nao ha fluxo
   nenhum a percorrer: RF_PAGES declara as paginas e as abas, e rfGo(page,tab) leva a
   qualquer uma direto. Fotografar isto e ler a declaracao, nao adivinhar o caminho.

   Uso:  node scripts/capture-catalogo.mjs            (dev em http://localhost:5199)
         RF_URL=http://localhost:5198/ node scripts/capture-catalogo.mjs
*/
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE=process.env.RF_URL||'http://localhost:5199/';
const OUT=resolve(process.cwd(),'screenshots-catalogo');
mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* As mesmas duas folhas do capture-home: sem anuncios (o lugar deles nao e' a
   foto do produto) e sem animacao (senao a captura apanha barras a meio de
   encher e paineis a 30% de opacidade). */
const SEM_ADS=`.rf-ad-top,[data-ad-rail],.rf-ad-anchor,.rf-sb-ad,.rf-sb-next,.cl-ad,.rf-ad,.rf-adph,
  .rf-ad-fixo,.rf-ad-inline,.rf-ad-splash,.rf-cam-ad,.rf-cam-banda,.rf-cam-patro,[data-ad-vazio],[data-ad-fixo]{display:none!important}`;
const SEM_ANIMACAO=`*,*::before,*::after{animation:none!important;transition:none!important}`;

const browser=await puppeteer.launch({executablePath:CHROME,headless:'new',
  args:['--no-sandbox','--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'],
  defaultViewport:{width:1440,height:900,deviceScaleFactor:2}});

const page=await browser.newPage();
/* SEM O CLIENTE DO VITE: a arvore e' partilhada por varias sessoes, e qualquer
   ficheiro que mude no meio da captura dispara um full-reload que evapora o save
   de bancada (o classico "CL is not defined" a meio da corrida). */
await page.setRequestInterception(true);
page.on('request',r=>{ /@vite\/client/.test(r.url()) ? r.abort() : r.continue(); });
page.on('pageerror',e=>console.log('  [pageerror]',String(e).slice(0,140)));

await page.goto(BASE+'?rf=hub',{waitUntil:'networkidle2',timeout:60000});
await sleep(3000);

let n=0;
async function shot(nome){
  n++;
  await page.addStyleTag({content:SEM_ADS}).catch(()=>{});
  await page.addStyleTag({content:SEM_ANIMACAO}).catch(()=>{});
  try{ await page.evaluate(()=>{const t=document.getElementById('c-toast'); if(t) t.replaceChildren();}); }catch(e){}
  await sleep(250);
  const label=String(n).padStart(2,'0')+' - '+nome;
  await page.screenshot({path:resolve(OUT,label+'.png'), fullPage:true});
  console.log('  📸',label);
}

/* A LISTA DE TELAS VEM DO JOGO, nao daqui. RF_PAGES ja declara cada pagina e cada
   aba dela — copiar essa lista para dentro deste ficheiro era garantir que, no dia
   em que nascesse uma aba nova, o catalogo ficasse sem ela e ninguem desse por isso. */
const mapa=await page.evaluate(()=>{
  if(typeof RF_PAGES==='undefined') return [];
  return RF_PAGES
    .filter(p=>p.key!=='sairjogo'&&p.key!=='resenha')   // nao sao telas: uma sai do jogo, a outra e' a conta
    .map(p=>({
      key:p.key,
      label:p.label||p.key,
      abas:(p.tabs||[]).filter(t=>!t.show||t.show())
                       .map(t=>({k:t.k, l:(typeof t.l==='function'?t.l():t.l)})),
    }));
});
if(!mapa.length){ console.error('RF_PAGES nao encontrado — o jogo carregou?'); await browser.close(); process.exit(1); }

const limpo=s=>String(s).replace(/[·/\\:]/g,'-').replace(/\s+/g,' ').replace(/\s*\(\d+\)\s*$/,'').trim();

for(const p of mapa){
  if(!p.abas.length){
    await page.evaluate(k=>rfGo(k), p.key); await sleep(900);
    await shot(limpo(p.label));
    continue;
  }
  for(const aba of p.abas){
    await page.evaluate((k,t)=>rfGo(k,t), p.key, aba.k); await sleep(900);
    await shot(limpo(p.label)+' - '+limpo(aba.l));
  }
}

console.log('\n'+n+' telas em '+OUT);
await browser.close();
