/* ============================================================================
   HTML DAS PÁGINAS -> MARKDOWN, para quem lê por agente
   ----------------------------------------------------------------------------
   POR QUE UM CONVERSOR PRÓPRIO E NÃO UMA BIBLIOTECA: o HTML daqui não é a web
   aberta — é o punhado de tags que seo/pages.mjs escreve à mão (h2, h3, p, ul,
   ol, li, table, figure, strong, em, a). Um turndown da vida traria 40kB de
   dependência para tratar casos que este HTML nunca tem, e mais uma coisa a
   atualizar. O que ele NÃO cobrir, o build denuncia: ver `restos()`.

   POR QUE NÃO É NEGOCIAÇÃO POR `Accept: text/markdown`: esse caminho — o que a
   Cloudflare documenta — exige o servidor VARIAR a resposta conforme o
   cabeçalho do pedido. O site é Firebase Hosting servindo ficheiro estático:
   ele não faz content negotiation. Então a versão markdown é um ficheiro de
   verdade, em /<slug>/index.md, anunciado no <head> com
   <link rel="alternate" type="text/markdown">. O agente que quiser encontra
   pelo link; o navegador continua a receber HTML, que é o padrão.
   ============================================================================ */

const decodeEnt = s => String(s)
  .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<')
  .replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");

/* escapa o que, em markdown, mudaria de significado. Deliberadamente curto:
   escapar demais deixa o texto cheio de barras e ilegível para quem lê. */
const escMd = s => String(s).replace(/([*_`[\]])/g,'\\$1');

/* o conteúdo de um trecho inline (negrito, itálico, link) */
function inline(html){
  return decodeEnt(String(html)
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_,href,txt)=>`[${inline(txt)}](${href})`)
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/g, (_,__,t)=>`**${inline(t)}**`)
    .replace(/<(em|i)>([\s\S]*?)<\/\2>/g,      (_,__,t)=>`*${inline(t)}*`)
    .replace(/<code>([\s\S]*?)<\/code>/g,      (_,t)=>`\`${t}\``)
    .replace(/<br\s*\/?>/g,'\n')
    .replace(/<[^>]+>/g,''))
    .replace(/[ \t]+/g,' ').trim();
}

/* UMA TABELA SÓ VIRA TABELA SE TIVER CABEÇALHO. Sem <thead> o markdown de
   tabela não é válido em metade dos leitores, e o conteúdo desaparece — por
   isso o fallback é lista, que perde a grelha mas não perde o texto. */
function tabela(html){
  const linha = tr => [...tr.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(m=>inline(m[1]));
  const cab = /<thead>([\s\S]*?)<\/thead>/.exec(html);
  const corpo = /<tbody>([\s\S]*?)<\/tbody>/.exec(html) || [null, html];
  const linhas = [...String(corpo[1]).matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m=>linha(m[1]));
  if(!cab) return linhas.map(c=>'- '+c.join(' — ')).join('\n');
  const h = linha(cab[1]);
  return [ '| '+h.join(' | ')+' |',
           '| '+h.map(()=>'---').join(' | ')+' |',
           ...linhas.map(c=>'| '+c.join(' | ')+' |') ].join('\n');
}

export function htmlParaMarkdown(html){
  let s = String(html);
  const blocos = [];
  /* MARCADOR VISÍVEL, NÃO BYTE DE CONTROLO. Isto já usou `\u0000` como sentinela:
     funcionava, mas punha bytes NUL no meio do ficheiro-fonte — invisíveis no
     editor, capazes de confundir ferramenta que trate o ficheiro como texto, e
     impossíveis de procurar quando algo desse errado. `@@RF<n>@@` não aparece em
     texto de página nenhuma e lê-se num grep. */
  const guarda = md => { blocos.push(md); return `@@RF${blocos.length-1}@@`; };

  // tabelas e figuras primeiro: têm estrutura interna que os passos seguintes destruiriam
  s = s.replace(/<div class="tabela-wrap">([\s\S]*?)<\/div>/g, (_,t)=>guarda(tabela(t)));
  s = s.replace(/<table>[\s\S]*?<\/table>/g, m=>guarda(tabela(m)));
  /* A FIGURA VIRA A LEGENDA, com a imagem como link. Um `![](...)` de screenshot
     não diz nada a quem lê por texto — a legenda é que carrega a informação. */
  s = s.replace(/<figure>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<figcaption>([\s\S]*?)<\/figcaption>[\s\S]*?<\/figure>/g,
    (_,src,cap)=>guarda(`![${inline(cap)}](${src})`));

  s = s.replace(/<ul>([\s\S]*?)<\/ul>/g, (_,t)=>guarda(
        [...t.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m=>'- '+inline(m[1])).join('\n')));
  s = s.replace(/<ol>([\s\S]*?)<\/ol>/g, (_,t)=>guarda(
        [...t.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m,i)=>(i+1)+'. '+inline(m[1])).join('\n')));

  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/g, (_,t)=>guarda('## '+inline(t)));
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, (_,t)=>guarda('### '+inline(t)));
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/g,   (_,t)=>guarda(inline(t)));
  s = s.replace(/<!--[\s\S]*?-->/g,'');

  const texto = s.split(/@@RF(\d+)@@/).map((parte,i)=>
    i%2 ? blocos[Number(parte)] : inline(parte)).filter(Boolean).join('\n\n');

  return texto.replace(/\n{3,}/g,'\n\n').trim();
}

/* O QUE FICOU POR CONVERTER. Uma tag nova em pages.mjs (um <dl>, um <blockquote>)
   sairia como texto colado, sem marcação, e ninguém daria por isso — markdown
   estragado não quebra build nenhum. Isto devolve as tags que sobraram para o
   gerador poder avisar. */
export function restos(markdown){
  return [...new Set([...String(markdown).matchAll(/<\/?([a-z][a-z0-9]*)[^>]*>/gi)].map(m=>m[1].toLowerCase()))];
}

/* A PÁGINA INTEIRA em markdown: frente-matéria curta, resumo, corpo, FAQ e
   referências — a mesma ordem da página HTML, para quem ler os dois não ver
   duas coisas diferentes. */
/* LINK INTERNO VAI ABSOLUTO NO MARKDOWN. No HTML, `/guia/` resolve contra o
   domínio da página — mas o ficheiro .md viaja: é baixado, colado num contexto,
   passado adiante. Fora do site, `/guia/` não resolve para lado nenhum. */
const absolutizar = (md, site) => String(md).replace(/\]\(\/(?!\/)/g, '](' + site + '/');

export function paginaMarkdown(p, site){
  const url = site + '/' + p.slug + '/';
  const L = [];
  L.push('# ' + p.h1);
  L.push('');
  L.push(`> ${p.description}`);
  L.push('');
  L.push(`*Publicado em [${site.replace(/^https?:\/\//,'')}](${url}) · atualizado em ${p.lastmod}*`);
  L.push('');
  if(Array.isArray(p.resumo) && p.resumo.length){
    L.push('## Resumo rápido');
    L.push('');
    p.resumo.forEach(t=>L.push('- '+inline(t)));
    L.push('');
  }
  L.push(htmlParaMarkdown(p.body||''));
  if(Array.isArray(p.faq) && p.faq.length){
    L.push('');
    L.push('## Perguntas frequentes');
    p.faq.forEach(f=>{ L.push(''); L.push('### '+decodeEnt(f.q)); L.push(''); L.push(htmlParaMarkdown(f.a)); });
  }
  if(Array.isArray(p.refs) && p.refs.length){
    L.push('');
    L.push('## Os clássicos do gênero');
    L.push('');
    p.refs.forEach(r=>L.push(`- [${r.nome}](${r.url}) — ${r.desc}`));
  }
  L.push('');
  return absolutizar(L.join('\n').replace(/\n{3,}/g,'\n\n'), site);
}

export { escMd };
