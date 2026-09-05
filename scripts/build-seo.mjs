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
/* AS LEGAIS SAO OUTRA LISTA. Mesmo gerador, mesma casca — mas nao sao conteudo de marketing:
   nao levam resumo, FAQ nem cartao de referencia, nao entram na grelha "Conheca o RetroFoot98"
   da home e vao ao fundo do sitemap. Misturar as duas listas em pages.mjs faria os Termos
   aparecerem como sugestao de leitura no rodape de um artigo. */
import { legal } from '../seo/legal.mjs';
/* O MEDIA KIT E' UMA TERCEIRA CATEGORIA: nem artigo, nem documento legal. E' uma pagina
   comercial de largura inteira, com desenho proprio (`css`) e sem a barra branca do site
   (soMiolo) — mantem a casca do site e corta so' a mobilia de artigo. */
import { mediaKit } from '../seo/media-kit.mjs';
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

/* rotulos curtos do rodape, iguais aos de LANDING_PAGINAS em public/src/ui/main.js */
const CURTO = {
  'guia':'Guia do jogo', 'ranking':'Ranking de treinadores',
  'historia-do-elifoot':'História do Elifoot', 'elifoot-online':'Elifoot online',
  'jogar-com-amigos':'Jogar com amigos', 'manager-futebol-brasileiro':'Futebol brasileiro',
  'jogo-treinador-futebol-online':'Jogo de treinador',
  'melhores-jogos-treinador-futebol':'Melhores jogos de treinador',
  'jogos-parecidos-com-elifoot':'Jogos parecidos com o Elifoot',
  'elifoot-vs-brasfoot':'Elifoot vs Brasfoot',
};
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
  // links internos (rodapé) — só páginas de CONTEÚDO prontas, exceto a atual. As legais nunca
  // entram aqui: elas têm o seu próprio lugar, na base do rodapé.
  // O RODAPE USA O ROTULO CURTO, nao o H1. O H1 e' a manchete da pagina ("A historia do
  // Elifoot: do disquete a' resenha online") e numa coluna de rodape ele vira um paragrafo:
  // a coluna "Paginas" ficava com o dobro da altura das outras. Os rotulos sao os mesmos de
  // LANDING_PAGINAS (public/src/ui/main.js) — o rodape do site e o do jogo dizem o mesmo.
  const nav = pages.filter(x=>x.ready && x.slug!==p.slug)
    .map(x=>`<a href="/${x.slug}/">${esc(CURTO[x.slug]||x.h1||x.title)}</a>`).join('');
  const navLegal = legal.filter(x=>x.ready)
    .map(x=>`<a href="/${x.slug}/">${esc(x.h1||x.title)}</a>`).join(' · ');
  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
<title>${esc(p.title)} | RetroFoot98</title>
<meta name="description" content="${esc(p.description)}">
<meta name="robots" content="${p.legal?'index, follow':'index, follow, max-image-preview:large'}">
${p.keywords?`<meta name="keywords" content="${esc(p.keywords)}">\n`:''}<link rel="canonical" href="${url}">
<meta name="theme-color" content="#2f8f2f">
<link rel="icon" type="image/webp" href="/img/logo.webp">
<link rel="sitemap" type="application/xml" href="/sitemap.xml">
${p.head||''}
<meta property="og:type" content="${p.legal?'website':'article'}">
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
/* ===== A CASCA DAS PAGINAS ESTATICAS ==================================
   Estas paginas sao HTML puro, servido solto: nao carregam o CSS do jogo. Por
   isso os tokens sao COPIADOS aqui, com os mesmos valores de
   public/src/styles/tokens/*.css — se a marca mudar la', muda aqui a seguir.
   Era um desenho proprio (barra verde, rodape #00005c, tipos de sistema) que
   nao era o de lugar nenhum: quem chega pelo Google caia numa pagina que nao
   parecia o site. Agora o cabecalho e o rodape sao os da home, e o corpo usa a
   mesma linguagem do media kit — cartao branco de 18-20px, capa azul com a
   barra amarela, Space Grotesk no texto e IBM Plex Mono nos numeros. */
:root{
  --az:#17458F; --az2:#0e2f66; --az-soft:#e9eff8; --az-line:#d6e1f1;
  --am:#F2B90C; --am2:#ffcb2e;
  --marca:#0A3C9F; --marca-am:#FFBF01;
  --desk:#e8f0e7; --card:#ffffff; --sunken:#f2f7f1; --escuro:#12201a;
  --l1:#dde7db; --l2:#d8e2d6; --l3:#eef1ee;
  --t1:#12201a; --t2:#3a473f; --t3:#5d6c62; --t4:#78877c;
  --mudo:#8b978d; --faint:#9aa79e; --claro:#c3d3ec; --claro2:#a9bfe0;
  --vd:#1a8f3c;
  --sans:'Space Grotesk',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,SFMono-Regular,monospace;
}
*{box-sizing:border-box}
body{margin:0;background:var(--desk);color:var(--t2);font-family:var(--sans);
  font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}

/* ---------- CABECALHO (o mesmo da home: tres zonas, links em pilula) ------- */
header{position:sticky;top:0;z-index:40;background:var(--card);
  border-bottom:1px solid var(--l1)}
.hdr-in{max-width:1180px;margin:0 auto;padding:14px 24px;display:grid;
  grid-template-columns:1fr minmax(0,auto) 1fr;align-items:center;gap:14px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;flex:0 0 auto;justify-self:start}
.brand img{width:auto;height:26px;max-width:186px;object-fit:contain}
header nav{display:flex;align-items:center;gap:2px;justify-self:center;padding:3px;
  border-radius:999px;background:var(--sunken);overflow-x:auto;scrollbar-width:none;max-width:100%}
header nav::-webkit-scrollbar{display:none}
header nav a{font-family:var(--sans);font-size:14px;font-weight:500;color:var(--t3);
  padding:7px 13px;border-radius:999px;text-decoration:none;white-space:nowrap;
  transition:background .15s ease,color .15s ease}
header nav a:hover{background:var(--az);color:var(--am);
  box-shadow:0 2px 8px -3px rgba(23,69,143,.55)}
header nav a[aria-current="page"]{background:var(--card);color:var(--t1);font-weight:600}
.cta{justify-self:end;height:38px;padding:0 16px;border:none;border-radius:12px;
  background:var(--az);color:#fff;font-family:var(--sans);font-size:14px;font-weight:700;
  display:inline-flex;align-items:center;gap:8px;text-decoration:none;white-space:nowrap;
  transition:background .15s ease}
.cta:hover{background:var(--az2);color:#fff}
@media (max-width:860px){
  .hdr-in{grid-template-columns:1fr auto;padding:12px 16px}
  header nav{display:none}
}

/* ---------- MIOLO DE ARTIGO ---------- */
main{max-width:820px;margin:0 auto;padding:36px 24px 8px}
.migalhas{font-size:13px;color:var(--t4);margin-bottom:12px;font-family:var(--mono)}
.migalhas a{color:var(--az);text-decoration:none}
.migalhas a:hover{text-decoration:underline}
main h1{font-size:clamp(30px,4.6vw,44px);line-height:1.08;letter-spacing:-.03em;color:var(--t1);
  font-weight:700;margin:.1em 0 .45em;text-wrap:pretty}
main h2{font-size:clamp(22px,2.8vw,28px);line-height:1.18;letter-spacing:-.02em;color:var(--t1);
  font-weight:700;margin:1.7em 0 .5em;padding-top:.6em;border-top:1px solid var(--l1);
  scroll-margin-top:86px;text-wrap:pretty}
main h3{font-size:19px;line-height:1.25;color:var(--t1);font-weight:700;margin:1.5em 0 .4em}
main p{margin:.8em 0;max-width:70ch;color:var(--t2)}
main a{color:var(--az)}
main a:hover{color:var(--az2)}
.lead{font-size:18.5px;line-height:1.6;color:var(--t2);max-width:64ch}
main ul,main ol{margin:.7em 0;padding-left:1.3em}
main li{margin:.4em 0;color:var(--t2)}
main li::marker{color:var(--az)}
main strong,main b{color:var(--t1)}
code,.mono{font-family:var(--mono)}

/* resumo — o cartao de resposta curta */
.resumo{background:var(--card);border:1px solid var(--l1);border-left:5px solid var(--am);
  border-radius:16px;padding:18px 22px;margin:20px 0 24px}
.resumo-h{font-family:var(--mono)!important;font-size:11px!important;letter-spacing:.14em;
  text-transform:uppercase;color:var(--az)!important;font-weight:600!important;
  margin:0 0 10px!important;border:0!important;padding:0!important}
.resumo ul{margin:0;padding-left:20px}
.resumo li{margin:.4em 0;font-size:15.5px;line-height:1.55}

/* indice */
.indice{background:var(--card);border:1px solid var(--l1);border-radius:16px;padding:18px 22px;margin:0 0 28px}
.indice-h{font-family:var(--mono)!important;font-size:11px!important;letter-spacing:.14em;
  text-transform:uppercase;color:var(--t4)!important;font-weight:600!important;
  margin:0 0 10px!important;border:0!important;padding:0!important}
.indice ol{margin:0;padding-left:20px;columns:2;column-gap:28px}
.indice li{margin:.32em 0;font-size:14.5px;break-inside:avoid}
.indice a{color:var(--t2);text-decoration:none}
.indice a:hover{color:var(--az);text-decoration:underline}

/* tabelas */
.tabela-wrap{overflow-x:auto;margin:18px 0;-webkit-overflow-scrolling:touch;
  border:1px solid var(--l1);border-radius:16px;background:var(--card)}
.tabela-wrap table{margin:0;min-width:520px;border:0}
table{width:100%;border-collapse:collapse;font-size:15px;background:var(--card);
  border:1px solid var(--l1);border-radius:16px;overflow:hidden;margin:18px 0}
thead th{background:var(--az);color:#fff;font-size:12px;font-weight:700;letter-spacing:.08em;
  text-transform:uppercase;text-align:left;padding:11px 14px}
th,td{border-bottom:1px solid var(--l3);padding:11px 14px;text-align:left;vertical-align:top}
tbody tr:last-child td{border-bottom:0}
tbody tr:nth-child(even){background:#f6f8f5}
tbody td:first-child{font-weight:600;color:var(--t1)}

/* figuras */
figure{margin:24px 0;background:var(--card);border:1px solid var(--l1);border-radius:18px;padding:10px}
figure img{border-radius:12px}
figcaption{font-size:13px;color:var(--t4);text-align:center;margin-top:10px}

/* cartoes de referencia */
.refs{margin-top:30px}
.refgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:16px 0}
.refcard{display:flex;flex-direction:column;gap:5px;background:var(--card);border:1px solid var(--l1);
  border-radius:18px;padding:18px 20px;text-decoration:none;color:var(--t2);transition:border-color .15s,transform .15s}
.refcard:hover{border-color:var(--az);transform:translateY(-1px)}
.refcard-n{font-weight:700;font-size:16px;color:var(--t1)}
.refcard-d{font-size:13.5px;line-height:1.5;color:var(--t3)}
.refcard-u{font-family:var(--mono);font-size:12px;color:var(--az);word-break:break-all}

/* perguntas */
.faq{margin-top:30px}
.faq-i{background:var(--card);border:1px solid var(--l1);border-radius:16px;margin:10px 0;overflow:hidden}
.faq-i[open]{border-color:var(--az)}
.faq-i summary{cursor:pointer;padding:15px 18px;font-weight:700;font-size:15.5px;color:var(--t1);list-style:none}
.faq-i summary::-webkit-details-marker{display:none}
.faq-i summary::after{content:'+';float:right;font-weight:700;color:var(--az)}
.faq-i[open] summary::after{content:'–'}
.faq-i summary:hover{background:var(--sunken)}
.faq-a{padding:0 18px 16px;font-size:15px;line-height:1.6;color:var(--t2)}
.faq-a p{margin:.35em 0}

/* barra de jogar */
.playbar{text-align:center;margin:36px 0 8px}
.playbar .cta{height:52px;padding:0 26px;font-size:15px;border-radius:14px;
  background:var(--am);color:var(--az)}
.playbar .cta:hover{background:var(--am2);color:var(--az)}

/* ---------- PAGINAS LEGAIS ---------- */
.legal-data{font-family:var(--mono);font-size:13px;color:var(--t4);margin:0 0 20px;
  padding-bottom:16px;border-bottom:1px solid var(--l1)}
article.legal p{max-width:74ch;font-size:15.5px}
article.legal h2{font-size:clamp(18px,2.1vw,22px);border-top-color:var(--l3);margin-top:1.7em}
.legal-ver{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;margin:36px 0 8px;
  padding:18px 20px;background:var(--card);border:1px solid var(--l1);border-radius:18px}
.legal-ver-t{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--t4);font-weight:600}
.legal-ver a{font-weight:700;font-size:14.5px;text-decoration:none}
.legal-ver a:hover{text-decoration:underline}

@media (max-width:640px){
  main{padding:24px 16px 8px}
  .indice ol{columns:1}
  main h2{margin-top:1.5em}
}

/* ---------- RODAPE (o mesmo da home: escuro, colunas, legais na base) ------ */
footer{background:var(--escuro);color:var(--claro);margin-top:44px;font-family:var(--sans)}
.foot-in{max-width:1180px;margin:0 auto;padding:44px 24px 0}
.foot-grid{display:grid;grid-template-columns:minmax(0,1.4fr) repeat(3,minmax(0,1fr));gap:32px}
.foot-marca img{width:auto;height:24px;max-width:180px;margin-bottom:12px}
.foot-sobre{margin:0;color:var(--claro2);max-width:34ch;line-height:1.55;font-size:13.5px}
.foot-col{display:flex;flex-direction:column;gap:9px;min-width:0}
.foot-h{font-family:var(--mono);font-weight:600;font-size:11px;color:var(--am);
  letter-spacing:.14em;text-transform:uppercase;margin-bottom:3px}
footer a{color:var(--claro);text-decoration:none;font-size:13.5px;transition:color .15s ease}
footer a:hover{color:#fff;text-decoration:underline}
.foot-fim{max-width:1180px;margin:0 auto;padding:18px 24px 26px;margin-top:26px;
  border-top:1px solid rgba(255,255,255,.1);display:flex;flex-wrap:wrap;align-items:center;
  gap:12px;font-size:12.5px;color:var(--claro2)}
.foot-legal{display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap}
.foot-legal a{font-size:12.5px}
.foot-sp{flex:1}
.foot-v{font-family:var(--mono);font-size:11px;color:#7d90a8}
@media (max-width:860px){
  .foot-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:26px}
  .foot-in{padding:32px 16px 0}
  .foot-fim{padding:16px 16px 24px}
}
@media (max-width:520px){ .foot-grid{grid-template-columns:minmax(0,1fr)} }
${p.css||''}
</style>
</head><body>
<header>
  <div class="hdr-in">
    <a class="brand" href="/"><img src="/img/marca.svg" alt="Retrofoot.com.br" height="26"></a>
    <nav>
      <a href="/guia/"${p.slug==='guia'?' aria-current="page"':''}>Como jogar</a>
      <a href="/ranking/"${p.slug==='ranking'?' aria-current="page"':''}>Ranking</a>
      <a href="/historia-do-elifoot/"${p.slug==='historia-do-elifoot'?' aria-current="page"':''}>História</a>
      <a href="/jogar-com-amigos/"${p.slug==='jogar-com-amigos'?' aria-current="page"':''}>Jogar com amigos</a>
      <a href="/media-kit/"${p.slug==='media-kit'?' aria-current="page"':''}>Anuncie</a>
    </nav>
    <a class="cta" href="/">▶ Jogar de graça</a>
  </div>
</header>
<main>
  ${p.soMiolo?'':`<nav class="migalhas" aria-label="Você está em"><a href="/">Início</a> › <span>${esc(p.h1)}</span></nav>
  <h1>${esc(p.h1)}</h1>`}
  ${(p.legal||p.soMiolo)?'':resumoHtml(p)}
  <!-- O INDICE E' MOBILIA DE ARTIGO. Numa pagina com desenho proprio (o media kit) ele
       aparecia ACIMA da abertura, antes de o visitante ver o que a pagina e' — um sumario
       de acordeoes por cima de uma capa. Quem traz soMiolo desenha o seu proprio topo. -->
  ${p.soMiolo?'':indiceHtml(p.body||'')}
  <article${p.legal?' class="legal"':''}>${envolveTabelas(ancoraH2(stripMissingFigures(p.body||'')))}</article>
  ${(p.legal||p.soMiolo)?'':refsHtml(p)}
  ${(p.legal||p.soMiolo)?'':faqHtml(p)}
  ${(p.legal||p.soMiolo)?'':'<div class="playbar"><a class="cta" href="/">▶ Jogar de graça no navegador</a></div>'}
</main>
<footer>
  <div class="foot-in">
    <div class="foot-grid">
      <div>
        <div class="foot-marca"><img src="/img/marca-clara.svg" alt="Retrofoot.com.br" height="24"></div>
        <p class="foot-sobre">O jogo de gerenciamento de futebol que você jogava na escola — agora
          online, com os amigos e no navegador. Grátis, sem instalar nada.</p>
      </div>
      <div class="foot-col"><span class="foot-h">O jogo</span>
        <a href="/">Jogar agora</a>
        <a href="/jogar-com-amigos/">Modo Resenha</a>
        <a href="/guia/">Guia do jogo</a>
        <a href="/ranking/">Ranking de treinadores</a>
      </div>
      <div class="foot-col"><span class="foot-h">Para marcas</span>
        <a href="/media-kit/">Media kit</a>
        <a href="/media-kit/#mk-falar">Falar com o comercial</a>
      </div>
      <div class="foot-col"><span class="foot-h">Páginas</span>${nav}</div>
    </div>
  </div>
  <div class="foot-fim">
    <span>© 2026 RetroFoot98</span>
    <span class="foot-legal">${navLegal}</span>
    <span class="foot-sp"></span>
    <span class="foot-v">v2026.01 — feito por quem cresceu jogando Elifoot.</span>
  </div>
</footer>
${p.script?`<script>${p.script}</script>`:''}
</body></html>`;
}

function sitemapXml(ready){
  /* changefreq POR PAGINA: um artigo pode mudar toda semana, os Termos nao. Dizer "weekly" numa
     pagina legal e' pedir ao robo que volte sempre para nada. */
  const url = (loc, pr, mod, freq) => `  <url>\n    <loc>${loc}</loc>\n${mod?`    <lastmod>${mod}</lastmod>\n`:''}    <changefreq>${freq||'weekly'}</changefreq>\n    <priority>${pr}</priority>\n  </url>`;
  const rows = [ url(SITE + '/', '1.0', '2026-07-25') ];
  for(const p of ready) rows.push(url(SITE + '/' + p.slug + '/', String(p.priority ?? 0.7), p.lastmod, p.legal?'yearly':'weekly'));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

// ---- build ----
if(!existsSync(DIST)){ console.error('dist/ não existe — rode `vite build` antes.'); process.exit(1); }
const ready = [...pages, ...legal, ...mediaKit].filter(p=>p.ready);
for(const p of ready){
  const dir = resolve(DIST, p.slug);
  mkdirSync(dir, { recursive:true });
  writeFileSync(resolve(dir, 'index.html'), pageHtml(p));
  console.log((p.legal?'LEGAL':p.css?'PAGINA':'SEO  ') + ' ✓ /' + p.slug + '/');
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
