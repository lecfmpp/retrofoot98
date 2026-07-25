// ============================================================================
// MANIFESTO DE PÁGINAS SEO (Brasil) — RetroFoot98
// Cada entrada vira uma página HTML estática indexável em dist/<slug>/index.html,
// gerada por scripts/build-seo.mjs e incluída no sitemap.xml.
//
// `ready:true`  -> a página é gerada e entra no sitemap.
// `ready:false` -> metadados reservados, mas NÃO gera página (evita conteúdo "fino"
//                  no ar antes da copy pronta). Vira true quando o conteúdo estiver escrito.
//
// `body` é HTML real (indexável). Escrita natural, foco em nostalgia + features + comparação
// "antes x agora". Imagens entram como <img src="/img/seo/....webp"> (ver screenshots).
// ============================================================================

export const pages = [
  {
    slug: 'elifoot-online',
    ready: true,
    priority: 0.9,
    lastmod: '2026-07-25',
    title: 'Elifoot Online Grátis — Jogue no Navegador (2026)',
    description: 'Sente falta do Elifoot? O RetroFoot98 é o manager retrô online: sem baixar, grátis, com clubes reais e multiplayer. Jogue agora no navegador.',
    h1: 'Elifoot online: jogue no navegador, de graça e com os amigos',
    keywords: 'elifoot online, jogar elifoot online, elifoot online gratis, elifoot navegador, elifoot multiplayer, novo elifoot, elifoot acabou',
    // Rascunho — a copy final a gente refina junto (esp. a página-pilar da história).
    body: `
<p>Se você digitou <strong>“elifoot online”</strong>, provavelmente é da turma que passou tardes inteiras
escalando o time, vendendo jogador pra fechar as contas e brigando pra tirar o clube da Série D. A boa
notícia: dá pra viver tudo isso de novo — só que <strong>direto no navegador, de graça e com os amigos</strong>.</p>

<h2>O Elifoot acabou? Não — ele ficou online</h2>
<p>O <a href="/historia-do-elifoot/">Elifoot</a> nasceu em 1987, num ZX Spectrum, pelas mãos do português
André Elias, e virou febre no Brasil a partir de 1998. Só que era outra época: instalar no Windows,
registro e senha, um PC só passando o teclado de mão em mão. O <strong>RetroFoot98</strong> pega aquela
mesma alma e resolve as amarras da tecnologia daquele tempo.</p>

<h2>O que mudou (e o que continua igual)</h2>
<table>
  <thead><tr><th>Naquela época</th><th>No RetroFoot98</th></tr></thead>
  <tbody>
    <tr><td>Baixar, instalar, registro e senha</td><td>Abre no navegador, sem baixar nada</td></tr>
    <tr><td>Um PC só, passando o teclado</td><td>Multiplayer online de verdade (modo Resenha), em tempo real</td></tr>
    <tr><td>Placar em texto</td><td>Partida ao vivo, classificação e janela de transferências</td></tr>
    <tr><td>Elencos desatualizados</td><td>Clubes e jogadores reais (Séries A–D, Copa do Brasil, Libertadores)</td></tr>
    <tr><td>Pago</td><td>Grátis</td></tr>
  </tbody>
</table>

<p>É leve, é rápido e é pra matar a saudade jogando com a galera. <a href="/">Comece agora — é de graça.</a></p>
`.trim(),
  },

  // --- Reservadas (conteúdo a escrever junto) — NÃO geram página enquanto ready:false ---
  { slug: 'historia-do-elifoot', ready: false, priority: 1.0,
    title: 'A História do Elifoot e dos Jogos de Treinador de Futebol',
    description: 'Do ZX Spectrum de 1987 à febre brasileira: a história do Elifoot, de André Elias e a evolução dos jogos de manager de futebol — até renascer online.',
    h1: 'A história do Elifoot: do disquete à resenha online',
    keywords: 'historia do elifoot, elifoot criador, elifoot andre elias, elifoot quando foi lançado, elifoot 2, elifoot o que é' },

  { slug: 'jogo-treinador-futebol-online', ready: false, priority: 0.9,
    title: 'Jogo de Treinador de Futebol Online com Jogadores Reais',
    description: 'Assuma um clube de verdade, escale, dê a tática e dispute o campeonato. Jogadores reais, online e grátis. Comece agora.',
    h1: 'Jogo de treinador de futebol online com jogadores reais',
    keywords: 'jogo de treinador de futebol online, jogo de treinador de futebol online com jogadores reais, jogo de ser tecnico de futebol' },

  { slug: 'manager-futebol-brasileiro', ready: false, priority: 0.8,
    title: 'Manager de Futebol Brasileiro Online — Séries A à D',
    description: 'Comande um clube brasileiro de verdade: Séries A a D, Copa do Brasil e Libertadores com elencos reais. Online e grátis.',
    h1: 'Manager de futebol brasileiro: Séries A, B, C, D e Copa do Brasil',
    keywords: 'jogo de manager de futebol brasileiro, simulador de futebol brasileiro, jogo de gerenciar futebol brasileiro' },

  { slug: 'jogar-com-amigos', ready: false, priority: 0.8,
    title: 'Jogo de Futebol Manager Online com Amigos — Modo Resenha',
    description: 'Crie uma liga com os amigos e dispute a rodada em tempo real no modo Resenha. Manager de futebol online, grátis e no navegador.',
    h1: 'Dispute um campeonato de manager com seus amigos',
    keywords: 'jogo de futebol online com amigos, elifoot multiplayer, jogo de manager de futebol online' },

  { slug: 'melhores-jogos-treinador-futebol', ready: false, priority: 0.7,
    title: 'Melhores Jogos de Treinador de Futebol em 2026 (Grátis e Online)',
    description: 'Comparamos os melhores jogos de manager de futebol grátis, online e para celular em 2026. Veja qual vale a pena jogar.',
    h1: 'Os melhores jogos de treinador de futebol em 2026',
    keywords: 'melhor jogo de treinador de futebol, qual o melhor jogo de treinador de futebol, melhor jogo de manager de futebol' },

  { slug: 'jogos-parecidos-com-elifoot', ready: false, priority: 0.7,
    title: 'Jogos Parecidos com Elifoot: Alternativas para 2026',
    description: 'Procura um jogo tipo Elifoot? Veja alternativas online e no navegador — incluindo o RetroFoot98, grátis e multiplayer.',
    h1: 'Jogos parecidos com o Elifoot para jogar em 2026',
    keywords: 'jogo tipo elifoot, jogos parecidos elifoot, elifoot alternativa, games like elifoot' },

  { slug: 'elifoot-vs-brasfoot', ready: false, priority: 0.6,
    title: 'Elifoot vs Brasfoot: qual o melhor manager de futebol?',
    description: 'Elifoot ou Brasfoot? Comparamos os dois clássicos do futebol manager — e a opção online e grátis pra jogar hoje.',
    h1: 'Elifoot vs Brasfoot: qual escolher?',
    keywords: 'elifoot vs brasfoot, elifoot ou brasfoot' },
];
