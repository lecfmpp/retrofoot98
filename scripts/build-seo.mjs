// ============================================================================
// GERADOR DE PÁGINAS SEO ESTÁTICAS — RetroFoot98
// Roda DEPOIS do `vite build`. Para cada página `ready:true` em seo/pages.mjs,
// escreve dist/<slug>/index.html (HTML real indexável) e regenera dist/sitemap.xml
// com a home + todas as páginas prontas. Não toca no app (index.html) nem no dist/src.
//
// Uso: node scripts/build-seo.mjs   (já encadeado no `npm run build`)
// Domínio: troque SEO_SITE por env var, ou edite SITE abaixo (canonical de produção).
// ============================================================================
import { pages } from '../seo/pages.mjs';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
// Canonical de produção. IMPORTANTE: deve ser o domínio real do site.
const SITE = process.env.SEO_SITE || 'https://retrofoot98.com.br';
const GA_ID = 'G-YE7PT01DGY';
const LOGO = SITE + '/img/logo.webp';

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// Remove <figure> cuja imagem real ainda NÃO existe em public/img/seo/. Assim nunca sai imagem
// quebrada nem screenshot errado no ar: as figuras aparecem sozinhas quando o .webp real for
// adicionado com o nome certo. (Regra: usar SÓ screenshots reais e atuais do RetroFoot98.)
function stripMissingFigures(html){
  return html.replace(/<figure>[\s\S]*?<\/figure>/g, block => {
    const m = block.match(/src="\/img\/seo\/([^"]+)"/);
    if(!m) return block;
    const file = resolve(ROOT, 'public', 'img', 'seo', m[1]);
    return existsSync(file) ? block : '';
  });
}

/* RESPOSTA CURTA NO TOPO (AEO). Buscador e assistente querem a resposta em uma frase, não no
   quinto parágrafo. Este bloco é o resumo em bullets — e é o primeiro conteúdo depois do H1. */
function resumoHtml(p){
  if(!Array.isArray(p.resumo) || !p.resumo.length) return '';
  return `<aside class="resumo" aria-label="Resumo">
    <h2 class="resumo-h">Resumo rápido</h2>
    <ul>${p.resumo.map(t=>`<li>${t}</li>`).join('')}</ul>
  </aside>`;
}
/* ÍNDICE a partir dos próprios H2 do texto: dá âncora pra cada seção (link direto na busca),
   e de quebra obriga o texto a ter hierarquia de verdade. */
function indiceHtml(html){
  const hs=[...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map(m=>m[1].replace(/<[^>]+>/g,'').trim());
  if(hs.length<3) return '';
  const item=t=>`<li><a href="#${slugify(t)}">${t}</a></li>`;
  return `<nav class="indice" aria-label="Neste artigo"><h2 class="indice-h">Neste artigo</h2><ol>${hs.map(item).join('')}</ol></nav>`;
}
function slugify(t){
  return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);
}
/* põe id nos H2 pro índice ancorar */
/* TABELA ROLA DENTRO DA CAIXA. Uma comparação de quatro colunas não cabe em 390px, e sem isso
   ela empurrava a página inteira pro lado — o pior sintoma de layout que existe no celular. */
function envolveTabelas(html){
  return html.replace(/<table>/g,'<div class="tabela-wrap"><table>').replace(/<\/table>/g,'</table></div>');
}
function ancoraH2(html){
  return html.replace(/<h2(?![^>]*id=)([^>]*)>([\s\S]*?)<\/h2>/g,
    (_,attrs,txt)=>`<h2 id="${slugify(txt.replace(/<[^>]+>/g,''))}"${attrs}>${txt}</h2>`);
}
/* PERGUNTAS EM ACORDEÃO (<details> nativo: sem JS, acessível, e o texto continua no HTML —
   o robô lê a resposta mesmo com o item fechado). O mesmo array vira o FAQPage do JSON-LD. */
function faqHtml(p){
  if(!Array.isArray(p.faq) || !p.faq.length) return '';
  const itens=p.faq.map(f=>`<details class="faq-i"><summary>${esc(f.q)}</summary><div class="faq-a">${f.a}</div></details>`).join('');
  return `<section class="faq"><h2 id="perguntas-frequentes">Perguntas frequentes</h2>${itens}</section>`;
}
/* CARTÃO DE REFERÊNCIA EXTERNA: em vez de citar um jogo no meio do texto, um cartão com o nome,
   uma linha do que é e o link pro site oficial (rel=noopener; external pra deixar claro que sai
   do site). Sem logo de terceiro — não temos direito de uso sobre marca alheia. */
function refsHtml(p){
  if(!Array.isArray(p.refs) || !p.refs.length) return '';
  const cards=p.refs.map(r=>`<a class="refcard" href="${esc(r.url)}" target="_blank" rel="noopener nofollow external">
      <span class="refcard-n">${esc(r.nome)}</span>
      <span class="refcard-d">${esc(r.desc)}</span>
      <span class="refcard-u">${esc(String(r.url).replace(/^https?:\/\//,'').replace(/\/$/,''))} ↗</span>
    </a>`).join('');
  return `<section class="refs"><h2 id="onde-conhecer-os-originais">Onde conhecer os originais</h2>
    <p>Os sites oficiais de cada jogo citado — vale conhecer a fonte.</p>
    <div class="refgrid">${cards}</div></section>`;
}
function pageHtml(p){
  const url = SITE + '/' + p.slug + '/';
  const img = p.image ? (SITE + p.image) : LOGO;
  // GRAFO DE DADOS ESTRUTURADOS. Antes era um WebPage solto; agora vai um @graph com três nós:
  //  · a página (com breadcrumb e datas — o buscador mostra "atualizado em");
  //  · o FAQPage, quando a página tem perguntas (é o que vira resposta direta na busca e nos
  //    assistentes — o ganho de AEO mais direto que existe);
  //  · a organização, pra ligar as páginas à marca.
  const nodes = [{
    '@type': p.schemaType || 'Article',
    '@id': url + '#pagina',
    name: p.title, headline: p.h1, description: p.description,
    inLanguage:'pt-BR', url, image: img,
    datePublished: p.published || p.lastmod, dateModified: p.lastmod,
    author:{ '@type':'Organization', name:'RetroFoot98', url: SITE + '/' },
    publisher:{ '@type':'Organization', name:'RetroFoot98', url: SITE + '/', logo:{ '@type':'ImageObject', url: LOGO } },
    isPartOf:{ '@type':'WebSite', name:'RetroFoot98', url: SITE + '/' },
    breadcrumb:{ '@type':'BreadcrumbList', itemListElement:[
      { '@type':'ListItem', position:1, name:'Início', item: SITE + '/' },
      { '@type':'ListItem', position:2, name: p.h1, item: url },
    ]},
  }];
  if(Array.isArray(p.faq) && p.faq.length){
    nodes.push({ '@type':'FAQPage', '@id': url + '#faq',
      mainEntity: p.faq.map(f=>({ '@type':'Question', name:f.q,
        acceptedAnswer:{ '@type':'Answer', text:String(f.a).replace(/<[^>]+>/g,'') } })) });
  }
  const jsonld = { '@context':'https://schema.org', '@graph': nodes };
  // links internos (rodapé) — só páginas prontas, exceto a atual
  const nav = pages.filter(x=>x.ready && x.slug!==p.slug)
    .map(x=>`<a href="/${x.slug}/">${esc(x.h1||x.title)}</a>`).join('');
  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
<title>${esc(p.title)} | RetroFoot98</title>
<meta name="description" content="${esc(p.description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
${p.keywords?`<meta name="keywords" content="${esc(p.keywords)}">\n`:''}<link rel="canonical" href="${url}">
<meta name="theme-color" content="#2f8f2f">
<link rel="icon" type="image/webp" href="/img/logo.webp">
<link rel="sitemap" type="application/xml" href="/sitemap.xml">
<meta property="og:type" content="article">
<meta property="og:site_name" content="RetroFoot98">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.title)}">
<meta name="twitter:description" content="${esc(p.description)}">
<meta name="twitter:image" content="${img}">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>
:root{--felt:#2f8f2f;--navy:#0b2a4a;--yellow:#ffd23f;--ink:#14210f}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--ink);background:#f4f6f2;line-height:1.6}
/* CABEÇALHO E RODAPÉ NO PADRÃO DA HOME. As dez páginas de conteúdo tinham uma barra verde e um
   rodapé de duas linhas — desenho próprio, que não era o de lugar nenhum. Quem chega pelo Google
   cai aqui primeiro: se a página não parece o site, ela parece um clone. Agora é a mesma casca
   da home (barra branca com o logo à esquerda, bisel de 2px nos botões, rodapé navy com as
   colunas) — sem depender do CSS do jogo, porque estas páginas são HTML puro e servidas soltas. */
header{background:#fff;border-bottom:2px solid #707070;box-shadow:0 4px 14px rgba(0,0,0,.18);
  padding:0;position:sticky;top:0;z-index:20}
.hdr-in{max-width:1180px;margin:0 auto;min-height:66px;display:flex;align-items:center;gap:16px;padding:8px 20px;flex-wrap:wrap}
header img{height:40px;width:40px;object-fit:contain;border-radius:0}
header .brand{font-weight:900;font-size:19px;color:#000080;text-decoration:none;letter-spacing:.4px;display:flex;align-items:center;gap:10px}
header .brand i{font-style:normal;color:#a8791a;margin-left:-4px}
header nav{display:flex;gap:2px;flex-wrap:wrap;margin-right:auto}
header nav a{font-weight:700;font-size:13.5px;color:#000080;text-decoration:none;padding:10px 8px}
header nav a:hover{background:#000080;color:#fff}
/* mesmo CTA amarelo da home: sobre o verde do site, amarelo é o que salta */
.cta{display:inline-flex;align-items:center;gap:8px;background:#ffd23f;color:#111;font-weight:800;
  text-decoration:none;padding:0 20px;height:44px;border:2px solid;border-color:#ffe89a #a8791a #a8791a #ffe89a;
  border-radius:0;box-shadow:0 4px 0 rgba(0,0,0,.22)}
.cta:hover{background:#ffdf6b}
.cta:active{border-color:#a8791a #ffe89a #ffe89a #a8791a;box-shadow:none;transform:translateY(3px)}
main{max-width:760px;margin:0 auto;padding:28px 20px 8px}
main h1{font-size:30px;line-height:1.15;color:var(--navy);margin:.2em 0 .5em}
main h2{font-size:22px;color:var(--navy);margin:1.4em 0 .4em}
main p{margin:.7em 0}
main a{color:#1668c1}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:15px}
th,td{border:1px solid #cdd6cd;padding:8px 10px;text-align:left;vertical-align:top}
th{background:#e7efe7}
img{max-width:100%;height:auto;border-radius:8px;display:block}
figure{margin:20px 0}
figure img{border:1px solid #cdd6cd;box-shadow:0 2px 10px rgba(0,0,0,.08)}
figcaption{font-size:13px;color:#5a6b58;text-align:center;margin-top:6px}
.lead{font-size:18px;color:#33422f}
ul,ol{margin:.6em 0;padding-left:1.3em}li{margin:.3em 0}
.playbar{text-align:center;margin:26px 0}
.playbar .cta{padding:13px 26px;font-size:17px}

/* ===== HIERARQUIA E ELEMENTOS VISUAIS =====
   O texto corrido era uma parede: H1, H2 e parágrafo, e nada mais. Quem lê na busca escaneia —
   e o robô também. Aqui a hierarquia é explícita (H1 > H2 com filete > H3), e o conteúdo ganha
   peças: resumo em bullets, índice ancorado, tabela zebrada, figuras com legenda, cartões de
   referência e as perguntas em acordeão nativo. */
main h1{font-size:clamp(28px,4.2vw,38px);line-height:1.12;color:var(--navy);margin:.1em 0 .35em;letter-spacing:-.01em}
main h2{font-size:clamp(21px,2.6vw,26px);line-height:1.2;color:var(--navy);margin:1.8em 0 .5em;
  padding-top:.5em;border-top:2px solid #e2e8e0;scroll-margin-top:80px}
main h3{font-size:18px;line-height:1.25;color:#1d3a5c;margin:1.4em 0 .35em}
main p{margin:.75em 0;max-width:68ch}
.lead{font-size:19px;line-height:1.55;color:#33422f;max-width:64ch}
.migalhas{font-size:13px;color:#5a6b58;margin-bottom:10px}
.migalhas a{color:var(--navy)}
/* resumo (resposta curta pro buscador e pro leitor apressado) */
.resumo{background:#eef6ec;border:1px solid #cddfc9;border-left:5px solid var(--felt);
  padding:14px 18px;margin:18px 0 22px;border-radius:6px}
.resumo-h{font-size:13px!important;letter-spacing:1.2px;text-transform:uppercase;color:#3c6b3c!important;
  margin:0 0 8px!important;border:0!important;padding:0!important}
.resumo ul{margin:0;padding-left:20px}
.resumo li{margin:.35em 0;font-size:15.5px;line-height:1.5}
/* índice */
.indice{background:#fff;border:1px solid #d7ddd5;border-radius:6px;padding:14px 18px;margin:0 0 26px}
.indice-h{font-size:13px!important;letter-spacing:1.2px;text-transform:uppercase;color:#5a6b58!important;
  margin:0 0 8px!important;border:0!important;padding:0!important}
.indice ol{margin:0;padding-left:20px;columns:2;column-gap:26px}
.indice li{margin:.3em 0;font-size:14.5px;break-inside:avoid}
.indice a{color:var(--navy);text-decoration:none}
.indice a:hover{text-decoration:underline}
/* listas com marcador de verdade */
main ul li::marker{color:var(--felt)}
main ol li::marker{color:var(--felt);font-weight:700}
main li{margin:.4em 0}
/* tabela de comparação */
.tabela-wrap{overflow-x:auto;margin:14px 0;-webkit-overflow-scrolling:touch}
.tabela-wrap table{margin:0;min-width:520px}
table{border:1px solid #cdd6cd;border-radius:6px;overflow:hidden}
thead th{background:var(--navy);color:#fff;font-size:14px;letter-spacing:.3px}
tbody tr:nth-child(odd){background:#f7faf6}
tbody td:first-child{font-weight:700;color:#1d3a5c;width:32%}
/* figuras */
figure{margin:22px 0;background:#fff;border:1px solid #d7ddd5;border-radius:8px;padding:10px}
figure img{border:1px solid #e2e8e0;border-radius:4px;box-shadow:none}
figcaption{font-size:13px;color:#5a6b58;text-align:center;margin-top:8px}
/* cartões de referência externa */
.refgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin:14px 0}
.refcard{display:flex;flex-direction:column;gap:4px;background:#fff;border:1px solid #d7ddd5;border-radius:8px;
  padding:14px 16px;text-decoration:none;color:var(--ink);transition:border-color .15s}
.refcard:hover{border-color:var(--felt)}
.refcard-n{font-weight:800;font-size:16px;color:var(--navy)}
.refcard-d{font-size:13.5px;line-height:1.45;color:#3f4d3d}
.refcard-u{font-size:12.5px;color:#1668c1;word-break:break-all}
/* perguntas em acordeão */
.faq-i{background:#fff;border:1px solid #d7ddd5;border-radius:6px;margin:8px 0;overflow:hidden}
.faq-i[open]{border-color:var(--felt)}
.faq-i summary{cursor:pointer;padding:13px 16px;font-weight:700;font-size:15.5px;color:var(--navy);list-style:none}
.faq-i summary::-webkit-details-marker{display:none}
.faq-i summary::after{content:'+';float:right;font-weight:800;color:var(--felt)}
.faq-i[open] summary::after{content:'–'}
.faq-i summary:hover{background:#f4f8f3}
.faq-a{padding:0 16px 14px;font-size:15px;line-height:1.6}
.faq-a p{margin:.3em 0}
@media (max-width:640px){ .indice ol{columns:1} main h2{margin-top:1.4em} }
footer{background:#00005c;border-top:3px solid #1a1aa8;margin-top:34px;color:#dfe4f7;font-size:14px}
.foot-in{max-width:1180px;margin:0 auto;padding:32px 20px 20px}
.foot-marca{display:flex;align-items:center;gap:10px;font-weight:900;font-size:17px;color:#fff;margin-bottom:8px}
.foot-marca img{height:34px;width:34px}
.foot-marca i{font-style:normal;color:#e0b23a;margin-left:-3px}
.foot-sobre{margin:0 0 18px;color:#b9c2e8;max-width:52ch;line-height:1.55;font-size:13px}
.foot-h{font-weight:800;font-size:12px;color:#ffff00;letter-spacing:1.2px;margin:0 0 10px}
footer .links{display:flex;flex-wrap:wrap;gap:8px 18px;margin:0 0 18px}
footer a{color:#dfe4f7;text-decoration:none;font-weight:700;font-size:13px}
footer a:hover{text-decoration:underline;color:#ffff00}
.foot-fim{padding-top:14px;border-top:1px solid #2a2a7a;display:flex;flex-wrap:wrap;gap:10px;
  justify-content:space-between;font-size:12px;color:#9aa3d0}
</style>
</head><body>
<header>
  <div class="hdr-in">
    <a class="brand" href="/"><img src="/img/logo.webp" alt="RetroFoot98" width="40" height="40">RetroFoot<i>98</i></a>
    <nav>
      <a href="/guia/">Como jogar</a>
      <a href="/ranking/">Ranking</a>
      <a href="/historia-do-elifoot/">História</a>
      <a href="/jogar-com-amigos/">Jogar com amigos</a>
    </nav>
    <a class="cta" href="/">📋 Entrar na lista</a>
  </div>
</header>
<main>
  <nav class="migalhas" aria-label="Você está em"><a href="/">Início</a> › <span>${esc(p.h1)}</span></nav>
  <h1>${esc(p.h1)}</h1>
  ${resumoHtml(p)}
  ${indiceHtml(p.body||'')}
  <article>${envolveTabelas(ancoraH2(stripMissingFigures(p.body||'')))}</article>
  ${refsHtml(p)}
  ${faqHtml(p)}
  <div class="playbar"><a class="cta" href="/">▶ Jogar de graça no navegador</a></div>
</main>
<footer>
  <div class="foot-in">
    <div class="foot-marca"><img src="/img/logo.webp" alt="" width="34" height="34">RetroFoot<i>98</i></div>
    <p class="foot-sobre">O jogo de gerenciamento de futebol que você jogava na escola — agora online, com os amigos e no navegador. Grátis, sem instalar nada.</p>
    <div class="foot-h">CONHEÇA O RETROFOOT98</div>
    <div class="links">${nav}</div>
    <div class="foot-fim">
      <span>© 2026 RetroFoot98. Todos os direitos reservados.</span>
      <span><a href="/">▶ Voltar ao jogo</a></span>
    </div>
  </div>
</footer>
</body></html>`;
}

function sitemapXml(ready){
  const url = (loc, pr, mod) => `  <url>\n    <loc>${loc}</loc>\n${mod?`    <lastmod>${mod}</lastmod>\n`:''}    <changefreq>weekly</changefreq>\n    <priority>${pr}</priority>\n  </url>`;
  const rows = [ url(SITE + '/', '1.0', '2026-07-25') ];
  for(const p of ready) rows.push(url(SITE + '/' + p.slug + '/', String(p.priority ?? 0.7), p.lastmod));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

// ---- build ----
if(!existsSync(DIST)){ console.error('dist/ não existe — rode `vite build` antes.'); process.exit(1); }
const ready = pages.filter(p=>p.ready);
for(const p of ready){
  const dir = resolve(DIST, p.slug);
  mkdirSync(dir, { recursive:true });
  writeFileSync(resolve(dir, 'index.html'), pageHtml(p));
  console.log('SEO  ✓ /' + p.slug + '/');
}
writeFileSync(resolve(DIST, 'sitemap.xml'), sitemapXml(ready));
// mantém public/sitemap.xml em sincronia (fonte que o Vite copia em builds futuros)
try{ writeFileSync(resolve(ROOT, 'public', 'sitemap.xml'), sitemapXml(ready)); }catch(e){}
console.log(`SEO  sitemap.xml -> ${ready.length+1} URLs  |  domínio: ${SITE}`);

/* PÁGINA SEM LINK INTERNO É PÁGINA ÓRFÃ.
   As dez páginas ficaram meses no ar sem uma única porta do site levando a elas: só chegava quem
   viesse do Google. Quem já estava no site nunca as encontrava, e o buscador via conteúdo sem
   nenhum link apontando — um dos sinais mais fortes que existem, desperdiçado.
   O rodapé (LANDING_PAGINAS, em public/src/ui/main.js) agora linka todas. Isto confere se as duas
   listas continuam batendo: uma página nova em seo/pages.mjs que não entre no rodapé nasceria
   órfã de novo, e o silêncio é exatamente como o problema durou tanto. Avisa, não quebra o build —
   publicar a página sem o link ainda é melhor que não publicar. */
try{
  const ui = readFileSync(resolve(ROOT, 'public', 'src', 'ui', 'main.js'), 'utf8');
  const semLink = ready.filter(p => !ui.includes(`'${p.slug}'`));
  if(semLink.length){
    console.warn('SEO  ⚠ sem link no rodapé (ficariam órfãs): ' + semLink.map(p=>'/'+p.slug+'/').join(', '));
    console.warn('SEO    -> acrescente em LANDING_PAGINAS, public/src/ui/main.js');
  } else {
    console.log('SEO  ✓ todas as páginas estão linkadas no rodapé');
  }
}catch(e){ console.warn('SEO  ⚠ não deu pra conferir os links do rodapé:', e.message); }
