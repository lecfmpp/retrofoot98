/* Captura, no jogo a correr, UMA imagem por espaço publicitário — o lugar dele em contexto,
   com o marcador visível. Serve o media kit: o anunciante vê onde a arte dele entra.
   Uso: node scripts/capture-ads.mjs   (dev server em http://localhost:5199) */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL='http://localhost:5199/?rf=hub';
const OUT=resolve(process.cwd(),'docs/media-kit/telas');
mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const browser=await puppeteer.launch({ executablePath:CHROME, headless:'new',
  args:['--no-sandbox','--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'],
  defaultViewport:{ width:1440, height:950, deviceScaleFactor:2 } });
const page=await browser.newPage();
page.on('pageerror',e=>console.log('  [erro]',String(e).slice(0,110)));
await page.goto(URL,{waitUntil:'networkidle2',timeout:60000});
await sleep(1800);

const run=async(fn,w=800)=>{ try{ await page.evaluate(fn); }catch(e){ console.log('  (evaluate)',String(e).slice(0,90)); } await sleep(w); };
/* realça o espaço para o media kit: contorno e um rótulo por cima */
const marcar=sel=>page.evaluate((s)=>{
  document.querySelectorAll('.rf-kit-mark').forEach(n=>n.remove());
  const el=document.querySelector(s); if(!el) return null;
  const r=el.getBoundingClientRect();
  const m=document.createElement('div'); m.className='rf-kit-mark';
  m.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;
    border:2px solid #F2B90C;border-radius:10px;box-shadow:0 0 0 9999px rgba(10,18,14,.55);z-index:99998;pointer-events:none`;
  document.body.appendChild(m);
  return Math.round(r.width)+'x'+Math.round(r.height);
}, sel);

async function tira(nome, sel){
  const med=await marcar(sel);
  if(!med){ console.log('  ✗',nome,'(não encontrado)'); return; }
  await page.screenshot({ path:resolve(OUT,nome+'.png') });
  await page.evaluate(()=>document.querySelectorAll('.rf-kit-mark').forEach(n=>n.remove()));
  console.log('  ✓',nome,med);
}

console.log('DESKTOP 1440');
await run(()=>{ rfGo('hub'); });
await tira('01-topo-970x90','.rf-ad-top');
await run(()=>{ const a=document.querySelector('[data-ad-vazio="rf98.hub.sidebar"]'); if(a) a.scrollIntoView({block:'center'}); },600);
await tira('03-hub-300x250','[data-ad-vazio="rf98.hub.sidebar"]');

/* A ENTRADA NO CLUBE (rf98.entrada.sorteio) — a tela de boas-vindas do pos-sorteio.
   Chega-se a ela pelo roteador (CL.screen='boasvindas' -> rfOb7), sem refazer o
   funil: o save de bancada do ?rf= ja' tem clube, elenco e estadio, que e' tudo o
   que a tela le'.

   VEM ANTES DA RODADA AO VIVO de proposito. startLiveRound() deixa um
   temporizador a redesenhar, e depois dele qualquer troca de CL.screen e'
   desfeita no quadro seguinte — a captura saia sempre "nao encontrado". */
await run(()=>{ CL.screen='boasvindas'; cdraw(); },1200);
await run(()=>{ const a=document.querySelector('[data-ad-vazio="rf98.entrada.sorteio"]');
  if(a) a.scrollIntoView({block:'center'}); },700);
await tira('16-entrada-clube-970x250','[data-ad-vazio="rf98.entrada.sorteio"]');
await run(()=>{ CL.screen='hub'; cdraw(); },600);

// rodada ao vivo: trilhos + faixa entre divisões
await run(()=>{ let g=0; while(g++<3){ try{ playRound(null); }catch(e){ S.round++; } }
  CL.tacticChosen=true; S.xi=autoXI(CL.clubId); startLiveRound(); },1600);
await tira('04-trilho-esq-160x600','[data-ad-rail="left"]');
await tira('05-trilho-dir-160x600','[data-ad-rail="right"]');
await tira('06-faixa-rodada-468x60','[data-ad-vazio="rf98.live.inline"]');

// um modal com a faixa de 728x90
await run(()=>{ CL.live=null; CL.screen='main'; cdraw();
  overlayC(dlg('Leilão de jogadores','<div class="cl-res"><div class="cl-res-verd">Exemplo de modal com a faixa inferior.</div><div class="cl-cal-ok"></div></div>',
    {w:720, ad:'rf98.auction.footer', bodyClass:'cl-body-gray'})); },900);
await tira('07-modal-728x90','[data-ad-vazio="rf98.auction.footer"]');

// splash
await run(()=>{ clCloseOverlay(); CL.screen='loading'; cdraw(); },900);
await tira('08-splash-1280x720','[data-ad-vazio="rf98.loading.splash"]');


console.log('TELEFONE 375');
await page.setViewport({ width:375, height:812, deviceScaleFactor:3 });
await page.goto(URL,{waitUntil:'networkidle2',timeout:60000});
await sleep(1800);
await run(()=>{ rfGo('hub'); });
await tira('09-mobile-topo-320x100','.rf-ad-top');
/* no telefone o Hub mostra um bloco de cada vez. A classificacao (e o retangulo que vai com
   ela) aparece na aba "Jogo" — ver rf-cols[data-hubtab="jogo"] no css. */
await run(()=>{ CL.hubTab='jogo'; cdraw(); },700);
await run(()=>{ const a=document.querySelector('[data-ad-vazio="rf98.hub.sidebar"]'); if(a) a.scrollIntoView({block:'center'}); },700);
await tira('11-mobile-hub-300x250','[data-ad-vazio="rf98.hub.sidebar"]');
/* a faixa da rodada ao vivo tambem no telefone */
await run(()=>{ let g=0; while(g++<3){ try{ playRound(null); }catch(e){ S.round++; } }
  CL.tacticChosen=true; S.xi=autoXI(CL.clubId); startLiveRound(); },1600);
await tira('12-mobile-faixa-rodada','[data-ad-vazio="rf98.live.inline"]');

await run(()=>{ CL.live=null; CL.screen='boasvindas'; cdraw(); },1200);
await run(()=>{ const a=document.querySelector('[data-ad-vazio="rf98.entrada.sorteio"]');
  if(a) a.scrollIntoView({block:'center'}); },700);
await tira('17-mobile-entrada-clube','[data-ad-vazio="rf98.entrada.sorteio"]');

await browser.close();
console.log('pronto →', OUT);
