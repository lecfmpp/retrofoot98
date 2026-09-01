/* Gera docs/conteudo/plano-conteudo.pdf a partir do plano-conteudo.html.
   Uso: node scripts/conteudo-pdf.mjs
   Mesma receita do media kit: Chrome headless pagina o proprio HTML, e as regras
   de quebra vivem no @media print do documento. */
import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';
import { statSync } from 'node:fs';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HTML=resolve(process.cwd(),'docs/conteudo/plano-conteudo.html');
const PDF =resolve(process.cwd(),'docs/conteudo/plano-conteudo.pdf');
const browser=await puppeteer.launch({ executablePath:CHROME, headless:'new', args:['--no-sandbox'] });
const page=await browser.newPage();
page.on('pageerror',e=>console.log('  [erro]',String(e).slice(0,110)));
await page.goto('file://'+HTML,{ waitUntil:'networkidle0', timeout:120000 });
await page.pdf({ path:PDF, format:'A4', printBackground:true,
  margin:{top:'0',right:'0',bottom:'0',left:'0'} });
await browser.close();
console.log('pronto →', PDF, (statSync(PDF).size/1024).toFixed(0)+' KB');
