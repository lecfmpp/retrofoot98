/* Gera docs/media-kit/media-kit.pdf a partir do media-kit.html.
   Uso: node scripts/media-kit-pdf.mjs

   Chrome headless, não uma biblioteca de PDF: o documento é HTML com as capturas
   embutidas em base64, e o mesmo motor que o desenha no ecrã é o que o pagina.
   As regras de quebra vivem no @media print do próprio HTML — ver lá porquê. */
import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';
import { statSync } from 'node:fs';

const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HTML=resolve(process.cwd(),'docs/media-kit/media-kit.html');
const PDF =resolve(process.cwd(),'docs/media-kit/media-kit.pdf');

const browser=await puppeteer.launch({ executablePath:CHROME, headless:'new',
  args:['--no-sandbox'] });
const page=await browser.newPage();
page.on('pageerror',e=>console.log('  [erro]',String(e).slice(0,110)));

await page.goto('file://'+HTML,{ waitUntil:'networkidle0', timeout:120000 });
/* as imagens são data: URIs — já vêm decodificadas com o documento, mas esperar
   por elas evita uma página em branco quando o Chrome ainda está a descodificar */
await page.evaluate(()=>Promise.all(
  [...document.images].filter(i=>!i.complete).map(i=>new Promise(r=>{ i.onload=i.onerror=r; }))));

await page.pdf({ path:PDF, format:'A4', printBackground:true, preferCSSPageSize:true,
  displayHeaderFooter:false });
await browser.close();

const kb=Math.round(statSync(PDF).size/1024);
console.log(`pronto → ${PDF}  (${kb} KB)`);
