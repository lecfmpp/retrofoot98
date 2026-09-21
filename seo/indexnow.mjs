/* ============================================================================
   INDEXNOW — avisa os buscadores de que uma pagina mudou, sem esperar o robo.
   ----------------------------------------------------------------------------
   POR QUE ISTO E NAO UM "ping": os endpoints de ping do Google e do Bing foram
   DESLIGADOS em 2023 — aquele `google.com/ping?sitemap=` que se ve em tutorial
   antigo hoje responde 404. O que substituiu foi o IndexNow, e ele e aberto:
   basta hospedar um ficheiro com a chave na raiz do dominio e fazer um POST.

   QUEM RECEBE: Bing, Yandex, Seznam e Naver partilham a mesma submissao (um POST
   chega a todos). O GOOGLE NAO PARTICIPA do IndexNow — para ele o caminho e o
   Search Console, que exige a conta do dono. Isto aqui nao substitui aquilo.

   A CHAVE E PUBLICA de proposito: ela nao autoriza nada: so' prova que quem
   submete controla o dominio, porque o buscador vai buscar
   https://retrofoot.com.br/<chave>.txt e conferir que o conteudo e a propria
   chave. Por isso o ficheiro vive em public/ e vai no repositorio.

   ATENCAO AO REWRITE DO FIREBASE: o site tem um catch-all que devolve
   index.html para tudo o que nao existe. Se o ficheiro da chave sumir, a URL
   dela continua a responder 200 — mas com HTML, e a submissao passa a ser
   recusada em silencio. Conferir o CONTEUDO, nunca o codigo de estado.

   Uso:  node seo/indexnow.mjs            (submete todas as URLs do sitemap)
         node seo/indexnow.mjs /guia/     (submete so' as indicadas)
   ============================================================================ */
export const INDEXNOW_KEY = 'a2660a7ee193c82fe5a0e271d7d7ef1b';
export const HOST = 'retrofoot.com.br';

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://' + HOST;

/* As URLs saem do SITEMAP GERADO, nao de uma lista a mao: o sitemap ja e a
   verdade sobre o que existe (build-seo.mjs escreve-o), e uma segunda lista so
   serviria para divergir da primeira no dia em que nascesse uma pagina. */
function urlsDoSitemap(){
  const xml = readFileSync(resolve(ROOT,'dist','sitemap.xml'),'utf8');
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
}

/* CONFERE O CONTEUDO, NAO O 200. Ver a nota sobre o catch-all do Firebase. */
async function chaveNoAr(){
  const url = `${SITE}/${INDEXNOW_KEY}.txt`;
  try{
    const r = await fetch(url);
    const txt = (await r.text()).trim();
    return { ok: r.ok && txt === INDEXNOW_KEY, url, recebido: txt.slice(0,60) };
  }catch(e){ return { ok:false, url, recebido:'(falhou: '+e.message+')' }; }
}

const alvos = process.argv.slice(2);
const urls = alvos.length ? alvos.map(u=>u.startsWith('http')?u:SITE+u) : urlsDoSitemap();

const k = await chaveNoAr();
if(!k.ok){
  console.error('✗ a chave nao esta no ar (ou responde outra coisa):', k.url);
  console.error('  recebido:', k.recebido);
  console.error('  publique o site antes de submeter — sem a chave, a submissao e recusada.');
  process.exit(1);
}
console.log('✓ chave confirmada em', k.url);

const corpo = { host: HOST, key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: urls };
const r = await fetch('https://api.indexnow.org/IndexNow', {
  method:'POST', headers:{'Content-Type':'application/json; charset=utf-8'}, body: JSON.stringify(corpo),
});
/* 200 = aceite; 202 = aceite, chave ainda a validar. Os dois sao sucesso. */
console.log((r.status===200||r.status===202 ? '✓' : '✗'), 'IndexNow respondeu', r.status, r.statusText);
console.log('  ' + urls.length + ' URLs submetidas:');
urls.forEach(u=>console.log('    · '+u));
if(r.status!==200 && r.status!==202){ console.error('  corpo:', (await r.text()).slice(0,300)); process.exit(1); }
