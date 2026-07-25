// ============================================================================
// MANIFESTO DE PÁGINAS SEO (Brasil) — RetroFoot98
// Cada entrada vira dist/<slug>/index.html (gerada por scripts/build-seo.mjs) + entra no sitemap.
// ready:true gera a página. Imagens: screenshots reais em /img/seo/*.webp.
// Copy em rascunho para revisão (foco nostalgia + features + comparação "antes x agora").
// ============================================================================

const fig = (img, cap) => `<figure><img src="/img/seo/${img}.webp" alt="${cap}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;

export const pages = [

  // ======================= PÁGINA-PILAR: HISTÓRIA =======================
  {
    slug: 'historia-do-elifoot', ready: true, priority: 1.0, lastmod: '2026-07-25',
    title: 'A História do Elifoot e dos Jogos de Treinador de Futebol',
    description: 'Do ZX Spectrum de 1987 à febre brasileira: a história do Elifoot, de André Elias e a evolução dos jogos de manager de futebol — até renascer online no RetroFoot98.',
    h1: 'A história do Elifoot: do disquete à resenha online',
    keywords: 'historia do elifoot, elifoot criador, elifoot andre elias, elifoot quando foi lançado, elifoot 2, elifoot o que é, elifoot acabou',
    body: `
<p class="lead">Tem um jogo que marcou gerações de brasileiros que gostam de futebol e de mexer com números:
o <strong>Elifoot</strong>. Se você é dessa turma, senta que lá vem história — e no fim ela desemboca num lugar
que talvez você estivesse esperando faz tempo.</p>

<h2>Antes do Elifoot: os jogos de treinador</h2>
<p>No fim dos anos 80, quase todo videogame de futebol era sobre <em>jogar a bola</em> — chutar, driblar, defender.
Mas existia uma turma que curtia o outro lado: <strong>ser o técnico</strong>. Montar o elenco, escolher a tática,
decidir quem compra, quem vende, quem entra em campo. É o gênero <em>manager</em>, e foi nele que o Elifoot virou lenda.</p>

<h2>1987: um Spectrum, umas cassetes e um piloto de avião</h2>
<p>O Elifoot foi criado pelo português <strong>André Elias</strong> — programador e, curiosamente, piloto de avião.
A primeira versão nasceu em <strong>1987, no ZX Spectrum</strong>, e era literalmente uma brincadeira distribuída entre
amigos em fitas cassete. O foco não era finta nem golaço: era liderança, escolha de plantel, tática, decisão. A essência
do técnico.</p>
<p>Dois anos depois veio o <strong>"Elifoot II"</strong> — que era pra ter sido o fim da linha. André ia focar nos estudos
e deixar os jogos de lado.</p>

${fig('abertura', 'A cara retrô continua — a tela de abertura do RetroFoot98')}

<h2>1996: a faixa do Palmeiras que mudou tudo</h2>
<p>Passaram-se anos. Em 1996, numa busca rápida pela internet, André Elias resolveu ver o que tinha acontecido com aquele
joguinho antigo. Descobriu que o <strong>Elifoot continuava vivo — e tinha explodido no Brasil</strong>. O estalo veio ao ver,
num jogo do Brasileirão, uma faixa da torcida do Palmeiras com os dizeres: <em>"Palmeiras campeão só no Elifoot"</em>.</p>
<p>Foi o empurrão que faltava. "Já que as pessoas jogam tanto, vou tentar ter algum retorno", pensou. Em <strong>1998</strong>
saiu a primeira versão paga, para baixar da internet — e foi a partir dali que o jogo virou <strong>fenômeno nacional</strong>.
Desde então, o Brasil é a maior comunidade de jogadores do manager no mundo.</p>

<h2>Por que o Elifoot marcou tanto</h2>
<p>Ganhou até o apelido de <strong>"Pai dos Managers"</strong>: foi o primeiro jogo do gênero para PC realmente acessível a
todos, leve, simples de entender e — detalhe importante — com <strong>suporte a vários jogadores</strong>. Você e os amigos,
cada um com seu time, brigando pelo título. Só que, na época, "vários jogadores" quase sempre queria dizer <em>o mesmo PC,
passando o teclado de mão em mão</em>.</p>

<h2>A limitação era a tecnologia — não a ideia</h2>
<p>Pensa no que era jogar naquele tempo: baixar, instalar no Windows, digitar registro e senha, elencos que envelheciam,
placar em texto, tudo num computador só. A ideia era genial; a tecnologia da época é que segurava. E é exatamente aí que
entra a nossa parte da história.</p>

<h2>2026: o RetroFoot98 tira as amarras</h2>
<p>O <strong>RetroFoot98</strong> pega aquela mesma alma — a do técnico raiz, do placar em mono, da resenha com os amigos —
e resolve o que a tecnologia dos anos 90 não deixava:</p>
<ul>
  <li><strong>Abre no navegador</strong>, sem baixar nem instalar nada.</li>
  <li><strong>Multiplayer online de verdade</strong> (o modo <em>Resenha</em>): cada um no seu aparelho, a rodada rolando em tempo real.</li>
  <li><strong>Clubes e jogadores reais</strong> — Séries A, B, C e D, Copa do Brasil e Libertadores.</li>
  <li>Partida ao vivo, classificação, janela de transferências, finanças, e-mails do treinador… e é <strong>grátis</strong>.</li>
</ul>

${fig('tela-principal', 'A tela do seu time no RetroFoot98 — escalação, próximo jogo, elenco e caixa')}

<p>É o mesmo prazer de antigamente, agora leve, online e com a galera — pra matar a saudade sem precisar de disquete.
Quer conferir? Veja <a href="/elifoot-online/">como jogar o Elifoot online</a>, entenda por que é um
<a href="/jogo-treinador-futebol-online/">jogo de treinador de futebol com jogadores reais</a>, ou simplesmente…</p>
`.trim(),
  },

  // ======================= P1: ELIFOOT ONLINE =======================
  {
    slug: 'elifoot-online', ready: true, priority: 0.9, lastmod: '2026-07-25',
    title: 'Elifoot Online Grátis — Jogue no Navegador (2026)',
    description: 'Sente falta do Elifoot? O RetroFoot98 é o manager retrô online: sem baixar, grátis, com clubes reais e multiplayer. Jogue agora no navegador.',
    h1: 'Elifoot online: jogue no navegador, de graça e com os amigos',
    keywords: 'elifoot online, jogar elifoot online, elifoot online gratis, elifoot navegador, elifoot multiplayer, novo elifoot, elifoot acabou',
    body: `
<p class="lead">Se você procurou por <strong>"elifoot online"</strong>, provavelmente é da turma que passou tardes
escalando o time, vendendo jogador pra fechar as contas e brigando pra tirar o clube da Série D. A boa notícia:
dá pra viver tudo isso de novo — <strong>direto no navegador, de graça e com os amigos</strong>.</p>

<h2>O Elifoot acabou? Não — ele ficou online</h2>
<p>O <a href="/historia-do-elifoot/">Elifoot</a> nasceu em 1987, num ZX Spectrum, pelas mãos do português André Elias,
e virou febre no Brasil a partir de 1998. Era outra época: instalar no Windows, registro e senha, um PC só passando o
teclado de mão em mão. O <strong>RetroFoot98</strong> pega aquela mesma alma e resolve as amarras da tecnologia daquele tempo.</p>

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

${fig('partida-ao-vivo', 'A partida ao vivo: público, placar e os lances acontecendo em tempo real')}

<h2>Joga com os amigos, como era pra ser</h2>
<p>O melhor do Elifoot sempre foi a resenha. No RetroFoot98 você cria uma sala, chama a galera e cada um comanda o seu
clube — a rodada roda pra todo mundo ao mesmo tempo. Veja mais em <a href="/jogar-com-amigos/">jogar com os amigos</a>.</p>

${fig('convidar-amigos', 'Crie a sala e convide os amigos para o modo Resenha')}

<p>É leve, rápido e feito pra matar a saudade. <a href="/">Comece agora — é de graça, no navegador.</a></p>
`.trim(),
  },

  // ======================= P1: JOGO DE TREINADOR ONLINE =======================
  {
    slug: 'jogo-treinador-futebol-online', ready: true, priority: 0.9, lastmod: '2026-07-25',
    title: 'Jogo de Treinador de Futebol Online com Jogadores Reais',
    description: 'Assuma um clube de verdade, escale o time, defina a tática e dispute o campeonato. Jogadores reais, online e grátis. Comece agora, no navegador.',
    h1: 'Jogo de treinador de futebol online com jogadores reais',
    keywords: 'jogo de treinador de futebol online, jogo de treinador de futebol online com jogadores reais, jogo de ser tecnico de futebol, jogo de tecnico de futebol',
    body: `
<p class="lead">Procurando um <strong>jogo de treinador de futebol online com jogadores reais</strong>? É exatamente
isso que o RetroFoot98 faz — e sem precisar baixar nada. Você é o técnico: monta o elenco, define a tática e briga
pelo título rodada a rodada.</p>

<h2>Você no comando</h2>
<p>Nada de controlar o jogador com a bola no pé. Aqui o seu jogo é a <strong>cabeça do técnico</strong>: escalação,
esquema tático, substituições, negociações e finanças. Escolha a formação certa, ajuste no intervalo e veja o resultado
sair na partida ao vivo.</p>

${fig('lineup-tatica', 'Escale o time e escolha a tática antes de entrar em campo')}

<h2>Clubes e jogadores reais</h2>
<p>Comande um clube de verdade, com elencos reais das divisões brasileiras (Séries A a D) e das copas continentais.
É a fantasia de todo torcedor: pegar o time do coração — ou um azarão — e levar do fundo da tabela ao topo.</p>

${fig('aba-jogador', 'Cada jogador tem seus atributos, contrato e valor de mercado')}

<h2>Online, grátis e com os amigos</h2>
<p>Jogue sozinho contra a máquina ou monte uma liga no <a href="/jogar-com-amigos/">modo Resenha</a> com a galera.
Tudo roda no navegador, de graça. Se você curtia o clima do <a href="/elifoot-online/">Elifoot online</a>, vai se sentir em casa.</p>

<p><a href="/">Assuma um clube agora — é de graça.</a></p>
`.trim(),
  },

  // ======================= P1: MANAGER BRASILEIRO =======================
  {
    slug: 'manager-futebol-brasileiro', ready: true, priority: 0.8, lastmod: '2026-07-25',
    title: 'Manager de Futebol Brasileiro Online — Séries A à D',
    description: 'Comande um clube brasileiro de verdade: Séries A, B, C e D, Copa do Brasil e Libertadores com elencos reais. Online, grátis e no navegador.',
    h1: 'Manager de futebol brasileiro: Séries A, B, C, D e Copa do Brasil',
    keywords: 'jogo de manager de futebol brasileiro, simulador de futebol brasileiro, jogo de gerenciar futebol brasileiro, jogo de tecnico de futebol brasileiro',
    body: `
<p class="lead">Quer um <strong>manager de futebol brasileiro</strong> de verdade? No RetroFoot98 você começa lá embaixo,
na Série D, e tem a missão de subir divisão após divisão até brigar pelo título nacional e por uma vaga na Libertadores.</p>

<h2>As quatro divisões, de verdade</h2>
<p>Séries A, B, C e D com <strong>clubes e elencos reais</strong>. Cada divisão tem seu equilíbrio: na D o buraco é mais embaixo,
o dinheiro é curto e cada contratação conta; na A, você encara os gigantes. Subir de divisão muda tudo — receita, torcida, elenco.</p>

${fig('escolher-ligas', 'Escolha o país e a liga — o Brasil com suas quatro divisões')}

<h2>Copa do Brasil e Libertadores</h2>
<p>Não é só o campeonato de pontos corridos: tem mata-mata de Copa do Brasil e as competições continentais
(Libertadores e Sul-Americana), com chaveamento e aquele frio na barriga do jogo de volta.</p>

${fig('campeonato', 'Acompanhe as competições, tabelas e o chaveamento das copas')}

<h2>Suba de divisão e faça história</h2>
<p>Gerencie o caixa, monte um elenco competitivo, acerte a tática e leve seu clube ao topo. Quando quiser acelerar,
dê uma olhada no <a href="/guia/">guia do técnico</a> pra saber como fazer dinheiro e subir mais fácil — ou chame os amigos
pra uma <a href="/jogar-com-amigos/">Resenha</a>.</p>

<p><a href="/">Escolha seu clube brasileiro e comece — é grátis.</a></p>
`.trim(),
  },

  // ======================= P1: JOGAR COM AMIGOS =======================
  {
    slug: 'jogar-com-amigos', ready: true, priority: 0.8, lastmod: '2026-07-25',
    title: 'Jogo de Futebol Manager Online com Amigos — Modo Resenha',
    description: 'Crie uma liga com os amigos e dispute a rodada em tempo real no modo Resenha. Manager de futebol online, grátis e no navegador.',
    h1: 'Dispute um campeonato de manager com seus amigos',
    keywords: 'jogo de futebol online com amigos, elifoot multiplayer, jogo de manager de futebol online, jogo de futebol manager com amigos',
    body: `
<p class="lead">O melhor do manager sempre foi a resenha com os amigos. No RetroFoot98 isso virou o coração do jogo:
o <strong>modo Resenha</strong>, onde cada um comanda o seu clube e a rodada roda pra todos ao mesmo tempo, online.</p>

<h2>Como funciona</h2>
<p>Você cria uma sala, convida a galera pelo link, cada um pega o seu time e o campeonato começa. Não é mais um PC só
passando o teclado — é <strong>multiplayer de verdade</strong>, cada um no seu aparelho, do celular ao computador.</p>

${fig('convidar-amigos', 'Crie a sala e convide os amigos para a sua Resenha')}

<h2>O sorteio e a disputa</h2>
<p>Os times entram no sorteio, todo mundo escala o seu, e a rodada acontece em tempo real — com direito a zoação no chat,
viradas no fim e aquela treta saudável de quem terminou em primeiro.</p>

${fig('sorteio-amigos', 'O sorteio dos times entre os amigos antes de começar')}

<h2>Rodada ao vivo, juntos</h2>
<p>Todo mundo assiste à própria partida ao mesmo tempo, e a classificação atualiza pra todos ao fim da rodada. É a resenha
de sempre, só que agora à distância e sem complicação. Curtiu a ideia? Veja também
<a href="/elifoot-online/">o Elifoot online</a> e a <a href="/historia-do-elifoot/">história por trás desse tipo de jogo</a>.</p>

<p><a href="/">Chame os amigos e crie sua Resenha — é grátis.</a></p>
`.trim(),
  },

  // ======================= P2: MELHORES JOGOS =======================
  {
    slug: 'melhores-jogos-treinador-futebol', ready: true, priority: 0.7, lastmod: '2026-07-25',
    title: 'Melhores Jogos de Treinador de Futebol em 2026 (Grátis e Online)',
    description: 'Os melhores jogos de manager de futebol em 2026: grátis, online, para celular e clássicos. Veja qual tipo combina com você e comece a jogar.',
    h1: 'Os melhores jogos de treinador de futebol em 2026',
    keywords: 'melhor jogo de treinador de futebol, qual o melhor jogo de treinador de futebol, melhor jogo de manager de futebol, melhor jogo de manager de futebol para celular',
    body: `
<p class="lead">Existe jogo de treinador de futebol pra todo gosto: uns pesados e cheios de menus, outros leves e diretos,
uns pagos, outros grátis. Aqui vai um guia rápido pra achar o <strong>melhor jogo de treinador de futebol</strong> pro seu estilo em 2026.</p>

<h2>Por tipo de jogador</h2>
<ul>
  <li><strong>Quer algo leve, grátis e sem baixar nada</strong> → um manager que roda no navegador é o ideal. É por aqui que o RetroFoot98 se encaixa.</li>
  <li><strong>Quer jogar com os amigos</strong> → procure suporte a <em>multiplayer online</em> de verdade (o modo Resenha), não só "passar o teclado".</li>
  <li><strong>Quer profundidade máxima</strong> → os simuladores completos entregam isso, mas cobram em tempo, preço e curva de aprendizado.</li>
  <li><strong>Quer no celular, offline</strong> → há boas opções de app, embora a maioria peça download e às vezes pagamento.</li>
</ul>

<h2>Por que o RetroFoot98 entra na lista</h2>
<p>Ele resolve o combo que costuma faltar: é <strong>grátis</strong>, roda <strong>no navegador</strong> (celular ou PC, sem instalar),
tem <strong>clubes e jogadores reais</strong> das divisões brasileiras e copas, e um <strong>multiplayer online</strong> pensado pra
resenha com os amigos. Tudo isso com aquela pegada retrô de quem cresceu jogando <a href="/elifoot-online/">Elifoot</a>.</p>

${fig('tela-principal', 'Interface direta e leve — o essencial do técnico na tela')}

<h2>Qual escolher?</h2>
<p>Se você quer começar a jogar <em>agora</em>, de graça e sem fricção, comece por um manager de navegador e evolua dali.
Vale também comparar com os <a href="/jogos-parecidos-com-elifoot/">jogos parecidos com o Elifoot</a> e o clássico
<a href="/elifoot-vs-brasfoot/">Elifoot vs Brasfoot</a>.</p>

<p><a href="/">Testar agora, de graça, no navegador.</a></p>
`.trim(),
  },

  // ======================= P2: JOGOS PARECIDOS =======================
  {
    slug: 'jogos-parecidos-com-elifoot', ready: true, priority: 0.7, lastmod: '2026-07-25',
    title: 'Jogos Parecidos com Elifoot: Alternativas para 2026',
    description: 'Procura um jogo tipo Elifoot? Veja alternativas de manager de futebol para jogar online e no navegador em 2026 — incluindo o RetroFoot98, grátis e multiplayer.',
    h1: 'Jogos parecidos com o Elifoot para jogar em 2026',
    keywords: 'jogo tipo elifoot, jogos parecidos elifoot, elifoot alternativa, games like elifoot, jogo tipo elifoot online',
    body: `
<p class="lead">Se você sente falta do <a href="/elifoot-online/">Elifoot</a> e procura um <strong>jogo parecido</strong>,
a lista abaixo ajuda a achar a alternativa certa — de olho no que importa: ser leve, ter clubes reais e dar pra jogar com os amigos.</p>

<h2>Alternativas de manager de futebol</h2>
<ul>
  <li><strong>RetroFoot98</strong> — o mais próximo da experiência clássica: retrô, leve, com clubes reais do Brasil,
      <em>online no navegador</em>, grátis e com multiplayer (Resenha). Sem baixar nada.</li>
  <li><strong>Brasfoot</strong> — outro clássico brasileiro do gênero; veja a comparação em <a href="/elifoot-vs-brasfoot/">Elifoot vs Brasfoot</a>.</li>
  <li><strong>Simuladores completos</strong> — entregam muita profundidade tática e de scouting, mas pesam mais e têm curva de aprendizado.</li>
  <li><strong>Managers de celular</strong> — práticos, porém a maioria exige download e às vezes compras dentro do app.</li>
</ul>

<h2>O que faz um jogo ser "tipo Elifoot"</h2>
<p>Três coisas: <strong>simplicidade</strong> (você entende em minutos), <strong>foco no técnico</strong> (tática, elenco, dinheiro)
e <strong>resenha com os amigos</strong>. É essa combinação que o RetroFoot98 busca recriar — com a vantagem de rodar direto no navegador.</p>

${fig('partida-detalhes', 'Os lances da partida ao vivo, com os detalhes de cada acontecimento')}

<p>Quer ir direto ao ponto? <a href="/">Jogue agora, de graça</a> — ou entenda a
<a href="/historia-do-elifoot/">história desse tipo de jogo</a>.</p>
`.trim(),
  },

  // ======================= P2: ELIFOOT VS BRASFOOT =======================
  {
    slug: 'elifoot-vs-brasfoot', ready: true, priority: 0.6, lastmod: '2026-07-25',
    title: 'Elifoot vs Brasfoot: qual o melhor manager de futebol?',
    description: 'Elifoot ou Brasfoot? Comparamos os dois clássicos do futebol manager brasileiro — e mostramos a opção online e grátis para jogar hoje mesmo.',
    h1: 'Elifoot vs Brasfoot: qual escolher?',
    keywords: 'elifoot vs brasfoot, elifoot ou brasfoot, brasfoot ou elifoot',
    body: `
<p class="lead">Duas gerações de brasileiros discutem isso até hoje: <strong>Elifoot ou Brasfoot?</strong> Os dois são clássicos
do manager de futebol, cada um com sua turma fiel. Vamos ao que interessa.</p>

<h2>O que cada um representa</h2>
<p>O <a href="/historia-do-elifoot/"><strong>Elifoot</strong></a> é o "Pai dos Managers": nasceu em 1987, ganhou o Brasil a partir
de 1998 e ficou conhecido pela simplicidade e pela resenha com os amigos. O <strong>Brasfoot</strong> chegou depois e conquistou
espaço com foco no futebol brasileiro e nas ligas do mundo, com atualizações de elenco e patches da comunidade.</p>

<h2>Comparando o essencial</h2>
<table>
  <thead><tr><th>Critério</th><th>Estilo Elifoot</th><th>Estilo Brasfoot</th></tr></thead>
  <tbody>
    <tr><td>Pegada</td><td>Simples, direto, retrô</td><td>Foco em ligas e patches</td></tr>
    <tr><td>Curva de aprendizado</td><td>Baixa (entende em minutos)</td><td>Média</td></tr>
    <tr><td>Resenha com amigos</td><td>É a alma do jogo</td><td>Presente</td></tr>
  </tbody>
</table>

<h2>E se desse pra ter o melhor dos dois, online e de graça?</h2>
<p>É essa a proposta do <strong>RetroFoot98</strong>: a simplicidade e a resenha do Elifoot, com clubes e jogadores reais do
Brasil (Séries A–D, Copa do Brasil, Libertadores), rodando <strong>no navegador, sem baixar, de graça</strong> e com
<a href="/jogar-com-amigos/">multiplayer online</a>. Em vez de escolher entre um e outro, dá pra simplesmente jogar.</p>

<p><a href="/">Jogar agora, de graça, no navegador.</a></p>
`.trim(),
  },

  // ======================= GUIA / DOCUMENTAÇÃO =======================
  {
    slug: 'guia', ready: true, priority: 0.8, lastmod: '2026-07-25',
    title: 'Guia do RetroFoot98: Como Jogar, Melhores Táticas e Dicas para Vencer',
    description: 'Domine o RetroFoot98: melhores formações por divisão e situação, como ganhar dinheiro comprando e vendendo jogadores, ampliar o estádio e subir de divisão.',
    h1: 'Guia do técnico: como jogar e vencer no RetroFoot98',
    keywords: 'como jogar, elifoot como ganhar, melhores taticas, melhores formações, dicas, como subir de divisão, como fazer dinheiro, ampliar estadio',
    body: `
<p class="lead">O RetroFoot98 foi pensado pra ser <strong>equilibrado</strong>: não existe fórmula mágica que ganha sozinha,
mas existem boas decisões que aumentam (e muito) as suas chances. Este guia reúne os princípios do jogo e dicas práticas —
sem revelar as contas por trás do motor, só o que você precisa pra jogar melhor.</p>

<h2>A filosofia: futebol é decisão, não sorte</h2>
<p>Cada rodada é a soma de escolhas: a formação certa pro contexto, o elenco com profundidade nas posições certas, o caixa
saudável e a moral do grupo em dia. O jogo recompensa consistência — quem gerencia bem ao longo da temporada, colhe.</p>

<h2>Melhores formações por situação</h2>
<p>Não existe "a melhor tática" fixa; existe a melhor <em>para cada momento</em>. Alguns princípios que funcionam:</p>
<ul>
  <li><strong>Jogando fora e contra um time mais forte:</strong> priorize solidez — mais gente no meio e na defesa, saída rápida.</li>
  <li><strong>Em casa, precisando do resultado:</strong> ouse mais no ataque, mas sem se expor a contra-ataques.</li>
  <li><strong>Segurando uma vantagem no fim:</strong> proteja o meio-campo e use as substituições pra dar fôlego.</li>
  <li><strong>Elenco curto/cansado:</strong> uma formação mais compacta poupa energia e reduz o risco de lesão e cartão.</li>
</ul>

${fig('lineup-tatica', 'Escolha a formação e a tática de acordo com o jogo — em casa, fora, atrás ou na frente do placar')}

<h2>Como fazer dinheiro comprando e vendendo jogadores</h2>
<p>O mercado é uma das maiores fontes de receita — se você jogar bem:</p>
<ul>
  <li><strong>Compre barato, valorize, venda caro:</strong> jovens com espaço pra crescer tendem a valorizar jogando bem.</li>
  <li><strong>Fique de olho nas propostas recebidas:</strong> às vezes vale vender um titular por um valor alto e reinvestir em duas peças.</li>
  <li><strong>Respeite a janela:</strong> as transferências abrem em períodos específicos da temporada — planeje antes de fechar.</li>
  <li><strong>Não desmonte o time:</strong> vender demais enfraquece o elenco e derruba os resultados (e a bilheteria).</li>
</ul>

${fig('vender-jogador', 'Negocie e venda jogadores — o mercado bem trabalhado vira caixa')}

<h2>Estádio: quando ampliar</h2>
<p>A bilheteria é receita recorrente. Ampliar o estádio faz sentido quando você já enche o que tem e o caixa aguenta o
investimento sem sufocar a folha. Crescer junto com a torcida — subindo de divisão — costuma ser mais sustentável do que
gastar tudo de uma vez.</p>

${fig('estadio', 'Amplie o estádio para aumentar a bilheteria — no momento certo do caixa')}

<h2>Como subir de divisão mais fácil</h2>
<ul>
  <li><strong>Base sólida antes de luxo:</strong> garanta qualidade e profundidade em todas as posições antes de contratar estrelas.</li>
  <li><strong>Caixa no azul:</strong> dívida alta trava o mercado e a evolução; equilibre folha e receita.</li>
  <li><strong>Constância &gt; heroísmo:</strong> pontuar sempre vale mais do que uma goleada isolada.</li>
  <li><strong>Aproveite a base:</strong> subir jovens das categorias de base reforça o elenco sem pesar no caixa.</li>
</ul>

${fig('classificacao', 'A classificação das divisões ao fim de cada rodada — seu placar da temporada')}

<h2>Feito pra ser justo — e pra melhorar sempre</h2>
<p>O equilíbrio do RetroFoot98 é calibrado continuamente pra que boas decisões sejam recompensadas e nenhuma tática seja
"quebrada". O jogo está em evolução constante, ouvindo a comunidade. Agora é com você: <a href="/">assuma um clube e comece a subir</a>.</p>
`.trim(),
  },

  // ======================= RANKING (descritiva — sem PII) =======================
  {
    slug: 'ranking', ready: true, priority: 0.7, lastmod: '2026-07-25',
    title: 'Ranking de Treinadores do RetroFoot98 — Pontos e Troféus',
    description: 'Como funciona o ranking de treinadores do RetroFoot98: pontuação por carreira, com os troféus como principal critério de desempate. Suba no ranking geral.',
    h1: 'Ranking de treinadores: pontos de carreira e troféus',
    keywords: 'ranking retrofoot, ranking de treinadores, ranking elifoot, melhores treinadores',
    body: `
<p class="lead">Toda boa resenha tem um pódio. No RetroFoot98 existe um <strong>ranking de treinadores</strong> que mede quem
construiu a melhor carreira ao longo das temporadas — e, claro, quem levantou mais taças.</p>

<h2>Como a pontuação funciona</h2>
<p>A posição no ranking é definida pelos <strong>pontos de carreira</strong> acumulados (temporadas disputadas, campanhas e
desempenho ao longo do tempo). No desempate, o critério de maior peso são os <strong>troféus</strong>: quem venceu mais fica na frente.
É a forma de valorizar tanto a regularidade quanto a glória.</p>

${fig('ranking-treinadores', 'O ranking de treinadores dentro do jogo')}

<h2>Seu ranking e o ranking geral</h2>
<p>Você acompanha a sua evolução e se compara com os outros técnicos da comunidade. Quanto mais temporadas você joga e mais
títulos conquista, mais alto você chega. É o incentivo perfeito pra voltar a cada temporada e brigar por mais uma taça.</p>

<h2>Comece a sua carreira</h2>
<p>Todo treinador de topo começou pegando um clube lá embaixo. Escolha o seu, veja o <a href="/guia/">guia do técnico</a>
pra acelerar a evolução e comece a somar pontos e troféus.</p>

<p><a href="/">Começar minha carreira de treinador — é grátis.</a></p>
`.trim(),
  },
];
