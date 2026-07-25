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
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
// Canonical de produção. IMPORTANTE: deve ser o domínio real do site.
const SITE = process.env.SEO_SITE || 'https://elifoot-d368d.web.app';
const GA_ID = 'G-YE7PT01DGY';
const LOGO = SITE + '/img/logo.webp';

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function pageHtml(p){
  const url = SITE + '/' + p.slug + '/';
  const img = p.image ? (SITE + p.image) : LOGO;
  const jsonld = {
    '@context':'https://schema.org',
    '@type': p.schemaType || 'WebPage',
    name: p.title, headline: p.h1, description: p.description,
    inLanguage:'pt-BR', url, image: img,
    isPartOf:{ '@type':'WebSite', name:'RetroFoot98', url: SITE + '/' },
    breadcrumb:{ '@type':'BreadcrumbList', itemListElement:[
      { '@type':'ListItem', position:1, name:'Início', item: SITE + '/' },
      { '@type':'ListItem', position:2, name: p.h1, item: url },
    ]},
  };
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
header{background:var(--felt);color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
header img{height:34px;width:auto}
header .brand{font-weight:800;font-size:18px;color:#fff;text-decoration:none;margin-right:auto}
.cta{display:inline-block;background:var(--yellow);color:var(--ink);font-weight:800;text-decoration:none;padding:9px 18px;border-radius:8px}
main{max-width:760px;margin:0 auto;padding:28px 20px 8px}
main h1{font-size:30px;line-height:1.15;color:var(--navy);margin:.2em 0 .5em}
main h2{font-size:22px;color:var(--navy);margin:1.4em 0 .4em}
main p{margin:.7em 0}
main a{color:#1668c1}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:15px}
th,td{border:1px solid #cdd6cd;padding:8px 10px;text-align:left;vertical-align:top}
th{background:#e7efe7}
img{max-width:100%;height:auto;border-radius:8px}
.playbar{text-align:center;margin:26px 0}
.playbar .cta{padding:13px 26px;font-size:17px}
footer{max-width:760px;margin:20px auto 0;padding:20px;border-top:1px solid #d7ddd5;font-size:14px}
footer .links{display:flex;flex-wrap:wrap;gap:6px 16px;margin:8px 0}
footer a{color:var(--navy)}
</style>
</head><body>
<header>
  <img src="/img/logo.webp" alt="RetroFoot98" width="34" height="34">
  <a class="brand" href="/">RetroFoot98</a>
  <a class="cta" href="/">▶ Jogar agora</a>
</header>
<main>
  <h1>${esc(p.h1)}</h1>
  ${p.body||''}
  <div class="playbar"><a class="cta" href="/">▶ Jogar de graça no navegador</a></div>
</main>
<footer>
  <strong>RetroFoot98</strong> — futebol manager retrô, online e grátis.
  <div class="links">${nav}</div>
  <div><a href="/">Voltar ao jogo</a></div>
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
