// ============================================================================
// MANIFESTO DE PÁGINAS SEO (Brasil) — RetroFoot
// Cada entrada vira dist/<slug>/index.html (gerada por scripts/build-seo.mjs) + entra no sitemap.
// ready:true gera a página. Imagens: screenshots reais em /img/seo/*.webp.
// Copy em rascunho para revisão (foco nostalgia + features + comparação "antes x agora").
// ============================================================================

/* FIGURAS: apontam para as capturas REAIS do jogo (public/img/telas) — geradas com o jogo
   rodando, não de mock. Antes apontavam pra /img/seo/, pasta que nunca existiu: o gerador
   apagava toda figura sem arquivo, e as dez páginas iam ao ar SEM UMA IMAGEM.

   A PASTA É GERADA, NÃO É ACERVO À MÃO: scripts/capture-catalogo.mjs fotografa cada página e
   cada aba do jogo, e scripts/otimizar-telas.sh converte as escolhidas para cá com estes
   nomes curtos. Quem renomear um nome aqui tem de renomear lá — e o erro não aparece no
   build, aparece como página sem imagem.

   Nomes disponíveis (todos 1600×1000, salvo nota):
     hub · formacao · elenco · ficha-jogador · base · treino
     mercado · leilao · financas · estadio · patrocinio · email
     campeonatos: copa · calendario · classificacao · artilharia
     treinador: carreira · trofeus · ranking
     partida: partida · penalti · substituicao · disputa-penaltis · pos-rodada · camarote
     resenha: sala-resenha · resenha-criar · resenha-entrar · chat-resenha (retrato, 592×674)

   O TAMANHO É DECLARADO PORQUE ELE RESERVA O ESPAÇO: sem width/height o texto salta quando a
   imagem chega (é o CLS que o PageSpeed cobra). Mas declarar 1280×800 para TODAS era mentir
   sobre as que não são 8:5 — o painel do chat é retrato e saía esticado. Daí o terceiro
   argumento: `fig('chat-resenha', 'legenda', {w:592,h:674})`. */
const fig = (img, cap, dim, alt) => {
  const w=(dim&&dim.w)||1280, h=(dim&&dim.h)||800;
  return `<figure><img src="/img/telas/${img}.webp" alt="${alt||cap}" width="${w}" height="${h}" loading="lazy" decoding="async"><figcaption>${cap}</figcaption></figure>`;
};

export const pages = [

  // ======================= PÁGINA-PILAR: HISTÓRIA =======================
  {
    slug: 'historia-do-elifoot', ready: true, priority: 1.0, lastmod: '2026-09-20',
    title: 'Elifoot, Brasfoot e RetroFoot: a história do manager de futebol no Brasil',
    description: 'Do ZX Spectrum de 1987 à resenha online: como Elifoot e Brasfoot criaram a escola brasileira do jogo de treinador — e o que o RetroFoot faz hoje no navegador, de graça e com os amigos.',
    h1: 'A história do manager de futebol no Brasil — e o capítulo que o RetroFoot escreve agora',
    keywords: 'historia do elifoot, elifoot criador, elifoot andre elias, elifoot quando foi lançado, elifoot 2, brasfoot, retrofoot, jogo de treinador de futebol, manager de futebol brasileiro',
    resumo: [
      'O gênero <em>manager</em> chegou ao Brasil pelo <strong>Elifoot</strong>, de <strong>André Elias</strong>, que estreou em <strong>1987</strong> no ZX Spectrum.',
      'A febre nacional veio a partir de <strong>1998</strong>; depois o <strong>Brasfoot</strong> fundou a outra escola, a das muitas ligas e dos patches da comunidade.',
      'A alma nunca foi o gráfico: era escalar, negociar e <strong>resenhar com os amigos</strong>.',
      'O <strong>RetroFoot</strong> é o capítulo online dessa escola — jogo próprio, no navegador, de graça, com carreira, ranking de treinadores e a turma na mesma rodada.',
    ],
    refs: [
      { nome:'Elifoot (site oficial)', desc:'A página do próprio André Elias, criador do Elifoot, com as versões do jogo.', url:'https://www.elifoot.com/' },
      { nome:'Brasfoot (site oficial)', desc:'O clássico brasileiro das muitas ligas, com temporadas e patches da comunidade.', url:'https://www.brasfoot.com/' },
    ],
    faq: [
      { q:'O que é o RetroFoot?', a:'<p>É um <strong>jogo de treinador de futebol que roda no navegador</strong>, de graça: você comanda um clube brasileiro da Série A à Série D, escala, negocia no mercado, cuida do caixa e do estádio, e disputa liga, Copa do Brasil e as continentais. Dá para jogar no <strong>Modo Solo</strong>, contra a máquina, ou no <strong>Modo Resenha</strong>, com a sua turma — cada um no seu aparelho. <a href="/">Abra e comece</a>.</p>' },
      { q:'O RetroFoot é o Elifoot?', a:'<p>Não. O RetroFoot é um <strong>jogo próprio</strong>, escrito do zero, sem ligação com o Elifoot nem com o Brasfoot. O que ele tem em comum com eles é a escola: o prazer de ser o técnico, decidir e resenhar. O Elifoot segue com o criador dele, e o Brasfoot com o dele — os dois links estão logo abaixo.</p>' },
      { q:'Quem criou o Elifoot?', a:'<p>O português <strong>André Elias</strong>, programador (e piloto de avião), que lançou a primeira versão em 1987 no ZX Spectrum e seguiu atualizando o jogo por décadas.</p>' },
      { q:'Em que ano o Elifoot foi lançado?', a:'<p>A primeira versão é de <strong>1987</strong>. O "Elifoot II" saiu em 1989, e a explosão no Brasil veio a partir de <strong>1998</strong>, quando o jogo ganhou clubes e elencos brasileiros.</p>' },
      { q:'O Elifoot acabou?', a:'<p>Não. O jogo original seguiu recebendo versões, e o gênero está mais vivo do que nunca. Se o que você procura é jogar hoje, sem instalar nada, o <a href="/elifoot-online/">RetroFoot abre no navegador</a>.</p>' },
      { q:'Qual a diferença entre o RetroFoot e o Brasfoot?', a:'<p>São propostas diferentes. O <strong>Brasfoot</strong> é forte em <strong>quantidade</strong>: muitas ligas jogáveis, temporadas novas todo ano e uma comunidade de patches que mantém os elencos em dia. O <strong>RetroFoot</strong> é forte em <strong>fricção zero e resenha</strong>: abre no navegador sem instalar, o save fica na nuvem, e o Modo Resenha põe até 10 treinadores na mesma liga, cada um no seu aparelho. Hoje o RetroFoot só tem o Brasil como país jogável — nesse ponto o Brasfoot entrega mais. O comparativo completo está em <a href="/elifoot-vs-brasfoot/">Elifoot vs Brasfoot</a>.</p>' },
      { q:'O RetroFoot é pago?', a:'<p>O <strong>Modo Solo</strong> é gratuito e sem prazo, no plano <strong>Peladeiro</strong>: dá para começar até 3 carreiras por mês, nas quatro divisões. O <strong>Modo Resenha</strong> vem liberado por 7 dias ao criar a conta; depois disso ele é dos planos pagos. Entrar na sala de um amigo, aliás, não custa nada em plano nenhum — quem paga é quem <em>abre</em> a sala.</p>' },
    ],
        body: `
<p class="lead">No Brasil, quem gosta de futebol e de mexer com números tem uma história em comum: em algum momento
sentou na frente de uma tela para <strong>ser o técnico</strong>, e não o jogador. Essa história tem nomes conhecidos —
<strong>Elifoot</strong>, <strong>Brasfoot</strong> — e um capítulo que está sendo escrito agora, no navegador.</p>

<h2>Antes de tudo: o gênero de quem prefere o banco ao gramado</h2>
<p>No fim dos anos 80, quase todo videogame de futebol era sobre <em>jogar a bola</em> — chutar, driblar, defender.
Mas existia uma turma que curtia o outro lado: montar o elenco, escolher a tática, decidir quem compra, quem vende,
quem entra em campo. É o gênero <em>manager</em>, e foi no Brasil que ele criou raiz mais funda.</p>

<h2>1987: um Spectrum, umas cassetes e um piloto de avião</h2>
<p>O Elifoot foi criado pelo português <strong>André Elias</strong> — programador e, curiosamente, piloto de avião.
A primeira versão nasceu em <strong>1987, no ZX Spectrum</strong>, e era literalmente uma brincadeira distribuída entre
amigos em fitas cassete. O foco não era finta nem golaço: era liderança, escolha de plantel, tática, decisão. A essência
do técnico.</p>
<p>Dois anos depois veio o <strong>"Elifoot II"</strong> — que era pra ter sido o fim da linha. André ia focar nos estudos
e deixar os jogos de lado.</p>

<h2>1996: a faixa do Palmeiras que mudou tudo</h2>
<p>Passaram-se anos. Em 1996, numa busca rápida pela internet, André Elias resolveu ver o que tinha acontecido com aquele
joguinho antigo. Descobriu que o <strong>Elifoot continuava vivo — e tinha explodido no Brasil</strong>. O estalo veio ao ver,
num jogo do Brasileirão, uma faixa da torcida do Palmeiras com os dizeres: <em>"Palmeiras campeão só no Elifoot"</em>.</p>
<p>Foi o empurrão que faltava. Em <strong>1998</strong> saiu a primeira versão paga, para baixar da internet — e foi a partir
dali que o jogo virou <strong>fenômeno nacional</strong>. Desde então, o Brasil é a maior comunidade de manager do mundo.</p>

<h2>A outra escola: o Brasfoot</h2>
<p>O <strong>Brasfoot</strong> chegou depois e fundou a segunda escola brasileira do gênero — a da <strong>coleção</strong>.
Se o Elifoot ficou conhecido pela simplicidade e pela partida rápida, o Brasfoot ficou conhecido pela quantidade: muitas
ligas, muitos elencos, temporadas novas a cada ano e uma <strong>comunidade de patches</strong> que mantém os plantéis em dia
por conta própria. São feitios diferentes de amar a mesma coisa, e cada um formou a sua geração. Quem quiser a comparação
lado a lado, ela está em <a href="/elifoot-vs-brasfoot/">Elifoot vs Brasfoot</a>.</p>

<h2>Por que essa escola marcou tanto</h2>
<p>O Elifoot ganhou o apelido de <strong>"pai dos managers"</strong>: leve, direto, fácil de entender e — detalhe decisivo —
com <strong>suporte a vários jogadores</strong>. Você e os amigos, cada um com seu time, brigando pelo título. Só que, na época,
"vários jogadores" quase sempre queria dizer <em>o mesmo PC, passando o teclado de mão em mão</em>. A resenha era ótima, mas
cabia numa sala só.</p>

<h2>O que segurava não era a ideia — era a tecnologia</h2>
<p>Pensa no que era jogar naquele tempo: baixar, instalar no Windows, digitar registro e senha, elencos que envelheciam,
um computador só. A ideia estava certa desde 1987. O que faltava era a internet que a gente tem hoje.</p>

<h2>2026: o RetroFoot pega essa escola e leva para o navegador</h2>
<p>O <strong>RetroFoot</strong> é um jogo próprio, escrito do zero — não é uma versão do Elifoot nem do Brasfoot, e não
pretende substituir nenhum dos dois. O que ele herda é a escola: a do técnico raiz, da decisão que pesa, da resenha com
os amigos. E o que ele acrescenta é tudo aquilo que os anos 90 não permitiam.</p>
<p>Começa pelo mais simples: <strong>abre no navegador</strong>. Sem baixar, sem instalar, sem registro e senha em papel.
No computador ou no celular, e o save fica na nuvem — dá para começar no PC e continuar no ônibus.</p>

${fig('formacao', 'A tela do seu clube: escalação no campo, banco, próximo jogo e o caixa — tudo à vista')}

<h2>A resenha deixou de caber numa sala só</h2>
<p>O <strong>Modo Resenha</strong> é o multiplayer online: você abre uma sala, chama a turma (até <strong>10 treinadores</strong>),
e o sorteio distribui os clubes com todo mundo assistindo — ninguém escolhe time. Dali em diante cada um comanda o seu do
próprio aparelho, e a rodada só fecha quando todos jogarem. É a mesma resenha de sempre, sem o teclado passando de mão em mão.
Tem uma página só sobre isso: <a href="/jogar-com-amigos/">jogar com os amigos</a>.</p>

${fig('sala-resenha', 'A sala do Modo Resenha enchendo — cada treinador no seu aparelho')}

<h2>A carreira passou a ter memória</h2>
<p>Essa é a parte que a tecnologia antiga não tinha como dar. No RetroFoot o treinador é um personagem que atravessa
temporadas: acumula pontos de carreira, guarda cada taça na <strong>sala de troféus</strong>, recebe sondagens de outros
clubes quando vai bem, e aparece no <strong>ranking de treinadores</strong> — onde o peso de cada título é o peso real da
competição. Uma Libertadores conta bem acima de um acesso na Série D, e é isso que separa quem ganhou de quem só somou.</p>

${fig('ranking', 'O ranking de treinadores: pontos de carreira somados ao peso real de cada título')}

<h2>E o clube inteiro veio junto</h2>
<p>Não é só escalar e jogar. O RetroFoot põe na sua mão as decisões que o técnico brasileiro conhece de cor:</p>
<ul>
  <li><strong>Mercado e leilão</strong> — comprar, vender, receber proposta, fazer contraproposta e disputar um jogador no lance.</li>
  <li><strong>Base e treino especial</strong> — subir garoto da base e trabalhar quem tem potencial.</li>
  <li><strong>Finanças, estádio e patrocínio</strong> — bilheteria, folha, ampliar arquibancada na hora certa do caixa.</li>
  <li><strong>Série A, B, C e D, Copa do Brasil, Libertadores e Sul-Americana</strong> — com calendário de verdade, uma coisa de cada vez.</li>
  <li><strong>Futebol feminino</strong> — os mesmos clubes e o mesmo calendário, com elenco feminino, escolhido logo no começo da carreira.</li>
</ul>

${fig('estadio', 'Ampliar o estádio é decisão de caixa: mais bilheteria depois, menos dinheiro agora')}

<h2>E a partida continua sendo o melhor momento</h2>
<p>A rodada roda ao vivo, minuto a minuto: o placar anda, o público reage, entra lesão, sai expulso, o pênalti para tudo
e você escolhe o batedor. Se der empate em mata-mata, a disputa de pênaltis é uma a uma. É o pedaço do jogo que não mudou
de essência desde 1987 — só ganhou tela.</p>

${fig('partida', 'A rodada ao vivo: o placar andando, o público e os lances acontecendo')}

<h2>Os clássicos seguem vivos — e é bom que sigam</h2>
<p>Nada disso existe contra o Elifoot ou contra o Brasfoot. Os dois abriram o caminho, formaram a comunidade e continuam
tendo os seus donos, os seus jogadores e as suas versões. O RetroFoot é o que a gente conseguiu fazer com a internet de
hoje a partir daquilo que eles ensinaram. Os sites oficiais dos dois estão aqui embaixo, e vale a visita.</p>

<p>Se bateu a vontade de escalar um time agora: o RetroFoot <strong>abre no navegador e é de graça</strong>.
<a href="/"><strong>Comece a sua carreira de treinador</strong></a> — ou veja antes
<a href="/elifoot-online/">como jogar sem instalar nada</a> e o que é o
<a href="/jogo-treinador-futebol-online/">jogo de treinador por dentro</a>.</p>

<!-- O CONVITE FECHA AQUI, NA PRÓPRIA FRASE. O texto antigo terminava em "ou simplesmente…" a
     apontar para o botão — só que o botão (a playbar do build-seo.mjs) entra DEPOIS das
     referências e do FAQ, três seções abaixo. Quem lia até o fim caía num "…" que não levava
     a lugar nenhum. O botão continua lá, no fim da página; esta frase deixou de depender dele. -->
`.trim(),
  },
  // ======================= P1: ELIFOOT ONLINE =======================
  {
    slug: 'elifoot-online', ready: true, priority: 0.9, lastmod: '2026-09-20',
    title: 'Manager de futebol online e grátis: jogue o RetroFoot no navegador',
    description: 'Procurando um manager de futebol para jogar online? O RetroFoot abre no navegador, é de graça, tem clubes brasileiros da Série A à D e um modo para jogar com a sua turma. Sem baixar, sem instalar.',
    h1: 'Manager de futebol online: jogue no navegador, de graça',
    keywords: 'elifoot online, jogar elifoot online, elifoot online gratis, elifoot navegador, manager de futebol online, jogo de treinador online gratis, retrofoot',
    resumo: [
      'O <strong>RetroFoot</strong> roda <strong>no navegador</strong>: sem download, sem instalação, sem emulador.',
      'Funciona no celular, no tablet e no PC — e o save fica na nuvem.',
      'Dois modos: <strong>Modo Solo</strong>, contra a máquina, e <strong>Modo Resenha</strong>, com até <strong>10 treinadores</strong> na mesma liga.',
      'É <strong>gratuito</strong> para começar e jogar a sua carreira no <strong>Modo Solo</strong>.',
    ],
    refs: [
      { nome:'Elifoot (site oficial)', desc:'Se o que você procura é o Elifoot em si, ele fica aqui, com o criador dele.', url:'https://www.elifoot.com/' },
      { nome:'Brasfoot (site oficial)', desc:'O outro clássico brasileiro, das muitas ligas e dos patches da comunidade.', url:'https://www.brasfoot.com/' },
    ],
    faq: [
      { q:'Como jogar um manager de futebol online sem baixar?', a:'<p>Abra o <a href="/">RetroFoot</a> no navegador e comece. Não há instalador, emulador nem plugin: o jogo carrega como um site, igual a abrir qualquer página.</p>' },
      { q:'O RetroFoot é o Elifoot online?', a:'<p>Não. O RetroFoot é um <strong>jogo próprio</strong>, escrito do zero, sem ligação com o Elifoot. Os dois são managers de futebol e dividem a mesma escola — a de ser o técnico e decidir — mas são jogos diferentes, de gente diferente. O site oficial do Elifoot está nas referências desta página.</p>' },
      { q:'Funciona no celular?', a:'<p>Funciona. O layout se adapta à tela e o save fica na nuvem, então dá para começar no computador e continuar no celular — a carreira é a mesma.</p>' },
      { q:'Preciso criar conta?', a:'<p>No <strong>Modo Solo</strong>, dá para começar rápido. Para o Modo Resenha (com amigos) a conta é necessária, porque é ela que guarda a sua sala e o seu clube.</p>' },
      { q:'É pago?', a:'<p>Começar e jogar a sua carreira no <strong>Modo Solo</strong> é de graça, sem prazo. O <strong>Modo Resenha</strong> — o multiplayer, em que o servidor roda a rodada de todo mundo — vem liberado por <strong>7 dias</strong> quando você cria a conta, para experimentar com a turma; depois disso ele passa a ser do plano.</p>' },
      { q:'Preciso de internet o tempo todo?', a:'<p>Precisa: o RetroFoot roda no navegador e a sua carreira fica gravada na nuvem, ligada à conta. Não existe versão para jogar sem conexão.</p>' },
      { q:'Em que navegadores funciona?', a:'<p>Nos navegadores atuais de celular e computador — Chrome, Safari, Edge, Firefox. Não há instalador, extensão nem plugin: é uma página que carrega.</p>' },
      { q:'Quantas carreiras posso ter?', a:'<p>Depende do plano. No <strong>Peladeiro</strong> (grátis) você começa até <strong>3 carreiras por mês</strong>; no plano <strong>Resenha</strong>, até 10; no <strong>Embaixador</strong>, sem cota. Atenção a uma letra miúda: a conta é de carreiras <em>começadas</em> no mês, então apagar uma que acabou não devolve a vaga.</p>' },
      { q:'Dá para jogar mais rápido?', a:'<p>Dá: a partida ao vivo tem ritmos <strong>Curto, Médio e Longo</strong>, e o Curto já resolve um jogo em pouco mais de meio minuto. Quem assina tem também o <strong>Ultrassônico</strong>, em que a partida inteira passa em cerca de dez segundos — é o ritmo de quem quer atravessar várias temporadas.</p>' },
    ],
        body: `
<p class="lead">Se você quer sentar, pegar um clube e <strong>ser o técnico</strong> — escalar, negociar, fechar as contas,
brigar pelo acesso — sem baixar nada e sem pagar nada para começar, é disso que esta página trata. O
<strong>RetroFoot</strong> abre no navegador e a primeira partida acontece em menos de um minuto.</p>

<h2>Procurou "Elifoot online"? Duas respostas honestas</h2>
<p>Muita gente chega aqui digitando o nome do clássico. Então vamos ser diretos, porque são duas coisas diferentes:</p>
<ul>
  <li><strong>Se você quer o Elifoot em si</strong> — aquele jogo, daquele autor — ele continua existindo e tem site
  oficial. O link está no fim desta página, na seção dos clássicos do gênero.</li>
  <li><strong>Se o que você quer é jogar um manager agora, no navegador</strong>, com clubes brasileiros e com os amigos,
  sem instalar nada: é o <strong>RetroFoot</strong>, e é ele que você abre aqui.</li>
</ul>
<p>O RetroFoot não é uma versão, um port ou um sucessor oficial de ninguém. É um jogo próprio, feito por gente que
cresceu no gênero — a história completa dessa escola está em <a href="/historia-do-elifoot/">Elifoot, Brasfoot e o
RetroFoot</a>.</p>

<h2>Começar leva menos de um minuto</h2>
<ol>
  <li><strong>Abra o jogo</strong> — sem download, sem instalador, sem emulador.</li>
  <li><strong>Escolha o modo</strong>: <strong>Modo Solo</strong>, contra a máquina, ou <strong>Modo Resenha</strong>, com a turma.</li>
  <li><strong>Receba o seu clube no sorteio</strong>, escale o time e entre em campo.</li>
</ol>
<p>Ninguém escolhe o clube a dedo: o sorteio distribui, e o desafio começa aí — tirar o time de onde ele está.</p>

${fig('formacao', 'A tela do seu clube: escalação no campo, banco, próximo jogo e o caixa')}

<h2>O que o navegador resolveu</h2>
<p>A ideia de comandar um clube no computador é dos anos 80, e era boa desde sempre. O que atrapalhava era a tecnologia
da época — e é exatamente essa lista que deixou de existir:</p>
<table>
  <thead><tr><th>No PC dos anos 90</th><th>No RetroFoot, hoje</th></tr></thead>
  <tbody>
    <tr><td>Baixar, instalar, guardar registro e senha</td><td>Abre no navegador, como qualquer site</td></tr>
    <tr><td>Um computador só, passando o teclado de mão em mão</td><td>Cada um no seu aparelho, a rodada rodando para todos</td></tr>
    <tr><td>O save preso naquela máquina</td><td>Save na nuvem — começa no PC, continua no celular</td></tr>
    <tr><td>Placar em texto</td><td>Rodada ao vivo, com lance, lesão, expulsão e pênalti</td></tr>
    <tr><td>Elenco envelhecendo até sair o patch</td><td>Clubes e elencos brasileiros das Séries A, B, C e D</td></tr>
  </tbody>
</table>

<h2>O que você faz no jogo</h2>
<p>Não é só apertar "jogar". A semana do técnico tem as decisões que interessam:</p>
<ul>
  <li><strong>Mercado</strong> — comprar, vender, responder proposta, fazer contraproposta e disputar um reforço no leilão.</li>
  <li><strong>Base e treino especial</strong> — subir o garoto e trabalhar quem tem potencial para virar titular.</li>
  <li><strong>Finanças</strong> — folha, bilheteria, patrocínio, e a hora certa de ampliar o estádio.</li>
  <li><strong>Competições</strong> — Série A, B, C e D, Copa do Brasil, Libertadores e Sul-Americana, num calendário de verdade.</li>
  <li><strong>Futebol feminino</strong> — os mesmos clubes e o mesmo calendário, com elenco feminino.</li>
</ul>

${fig('mercado', 'O mercado: quem está à venda, por quanto, e o que o seu caixa aguenta')}

<h2>A rodada acontece ao vivo</h2>
<p>Quando a rodada roda, ela roda de verdade: o placar anda minuto a minuto, o público reage, entra lesão, sai expulso,
e quando marca pênalti é você que escolhe o batedor. Em mata-mata empatado, a disputa é cobrança a cobrança.</p>

${fig('partida', 'A rodada ao vivo: o placar andando, o público e os lances acontecendo')}

<h2>Com a turma: o Modo Resenha</h2>
<p>É aqui que o jogo fica melhor. Você abre uma sala, chama até <strong>10 treinadores</strong>, e o sorteio distribui os
clubes com todo mundo assistindo ao mesmo tempo. Dali em diante cada um comanda o seu do próprio aparelho — celular,
tablet ou PC — e a semana só fecha quando todos jogarem. Ninguém precisa estar na mesma sala, nem na mesma cidade.
Tem uma página só sobre isso: <a href="/jogar-com-amigos/">jogar com os amigos</a>.</p>

${fig('sala-resenha', 'A sala do Modo Resenha enchendo — cada treinador no seu aparelho')}

<h2>A carreira não recomeça do zero</h2>
<p>O save fica na nuvem, ligado à sua conta. E a carreira tem memória: os pontos que você soma atravessam as temporadas,
cada taça entra na <strong>sala de troféus</strong>, clubes maiores começam a sondar quem vai bem, e o
<a href="/ranking/">ranking de treinadores</a> coloca todo mundo na mesma régua — com cada título valendo o peso real da
competição que ele é.</p>

${fig('ranking', 'O ranking de treinadores: carreira somada ao peso real de cada título')}

<h2>No celular funciona igual</h2>
<p>A tela se adapta: no telefone o jogo vira uma coluna, com a faixa de estado (forma, moral, janela de transferências)
logo abaixo do cabeçalho. É a mesma carreira, o mesmo save, o mesmo clube — muda só o tamanho da tela.</p>

<p><a href="/"><strong>Abra o RetroFoot e pegue o seu clube</strong></a> — é de graça, roda no navegador, e a primeira
rodada é agora.</p>
`.trim(),
  },

  // ======================= P1: JOGO DE TREINADOR ONLINE =======================
  {
    slug: 'jogo-treinador-futebol-online', ready: true, priority: 0.9, lastmod: '2026-09-20',
    title: 'Jogo de treinador de futebol online — RetroFoot, grátis no navegador',
    description: 'No RetroFoot você é o técnico: escala, define a tática, negocia no mercado mundial e administra o clube. Clubes brasileiros das quatro divisões, partida ao vivo, no navegador e de graça.',
    h1: 'Jogo de treinador de futebol online: você no banco, não com a bola',
    keywords: 'jogo de treinador de futebol online, jogo de ser tecnico de futebol, jogo de tecnico de futebol, manager de futebol gratis, retrofoot',
    resumo: [
      'Você é o <strong>técnico</strong>: escala, define a tática, negocia e cuida do caixa.',
      'Clubes brasileiros das <strong>quatro divisões</strong>, mais Copa do Brasil e continentais.',
      'O <strong>mercado é mundial</strong>: dá para comprar lá fora e vender para o exterior.',
      'Roda no navegador, de graça, no <strong>Modo Solo</strong> ou no <strong>Modo Resenha</strong>.',
    ],
    faq: [
      { q:'O que faz um jogo de treinador de futebol?', a:'<p>Em vez de controlar a bola, você comanda o clube: escolhe a tática e o time titular, negocia jogadores, administra salários, bilheteria e estádio, e disputa a temporada rodada a rodada.</p>' },
      { q:'É difícil de aprender?', a:'<p>Não. Em poucos minutos você entende a tela e já escala o time — a formação entra arrastando o jogador para a posição. O <a href="/guia/">guia do jogo</a> cobre o resto, como fazer dinheiro no mercado e que formação usar em cada divisão.</p>' },
      { q:'Dá para contratar jogador de fora do Brasil?', a:'<p>Dá, desde a primeira temporada. O mercado do RetroFoot é <strong>mundial</strong>: você procura em qualquer país com elenco no jogo, e clubes de fora também aparecem oferecendo pelos seus jogadores.</p>' },
      { q:'Quanto custa?', a:'<p>O <strong>Modo Solo</strong> é gratuito e sem prazo. O <strong>Modo Resenha</strong>, com a turma, vem liberado por 7 dias quando você cria a conta e depois passa a ser do plano.</p>' },
      { q:'Os clubes e os jogadores são os de verdade?', a:'<p>Os <strong>clubes são os de verdade</strong>, com o escudo e as cores de cada um — só que aparecem pelo <strong>apelido da torcida</strong> em vez do nome oficial: o ABC é o <em>Elefante Potiguar</em>. Os <strong>elencos também são os reais</strong>, jogador por jogador, com <strong>nomes fictícios</strong>. É a mesma razão pela qual os clássicos do gênero sempre dependeram de patches da comunidade: nome de clube e de atleta é marca registrada, e licenciar isso num jogo gratuito não se paga.</p>' },
      { q:'Posso escolher o meu time do coração?', a:'<p>Não — e isso é de propósito. Você escolhe a <strong>divisão</strong>, e o <strong>sorteio</strong> escolhe o clube. A graça é o que você faz com o time que caiu na sua mão, e no Modo Resenha isso mantém a liga justa: ninguém pega o grandão por combinação.</p>' },
      { q:'Quanto tempo dura uma partida?', a:'<p>Você decide o ritmo: no <strong>Curto</strong> a partida dá pouco mais de meio minuto, e há ainda <strong>Médio</strong> e <strong>Longo</strong> para quem quer acompanhar lance a lance. Quem assina tem o <strong>Ultrassônico</strong>, de cerca de dez segundos por jogo.</p>' },
      { q:'Tem futebol feminino?', a:'<p>Tem. Logo no começo da carreira, no passo <strong>Modalidade</strong>, você escolhe comandar o elenco masculino ou o feminino — mesmos clubes, mesmo calendário e mesmas competições. A escolha vale para aquela carreira e não muda depois do sorteio dos clubes.</p>' },
    ],
        body: `
<p class="lead">Existe quem queira driblar, e existe quem queira <strong>decidir</strong>. Se você é do segundo time —
o que olha a escalação do técnico e pensa "eu faria diferente" — o RetroFoot é jogo para você. Aqui ninguém controla o
jogador com a bola no pé: você comanda o clube inteiro, e a partida é a consequência das suas decisões.</p>

<h2>A semana do técnico</h2>
<p>Entre uma rodada e outra, é isso que passa pela sua mesa:</p>
<ul>
  <li><strong>Escalação e tática</strong> — quem entra, em que posição, em que formação, e como o time se comporta em casa e fora.</li>
  <li><strong>Mercado</strong> — comprar, vender, responder proposta, fazer contraproposta, disputar reforço no leilão.</li>
  <li><strong>Elenco e base</strong> — quem está em forma, quem está com a moral em baixa, que garoto da base já dá para subir.</li>
  <li><strong>Finanças</strong> — folha, bilheteria, patrocínio e a hora certa de ampliar o estádio.</li>
  <li><strong>E-mail</strong> — diretoria, imprensa e propostas chegam por ali, e a sua resposta tem efeito.</li>
</ul>

${fig('formacao', 'A escalação: campo, banco e formação na mesma tela')}

<h2>Cada jogador é um jogador, não um número</h2>
<p>A ficha traz atributos, posição, idade, contrato, moral, forma e valor de mercado — e o valor é <strong>vivo</strong>:
ele se move com a força do jogador, a idade, o potencial, o comportamento e o momento dele. Um garoto em ascensão
valoriza; um veterano em má fase desvaloriza. Quem lê isso bem faz dinheiro no mercado.</p>

${fig('ficha-jogador', 'A ficha do jogador: atributos, contrato, forma e valor de mercado')}

<h2>O mercado é o mundo</h2>
<p>Você joga no Brasil, mas não negocia só no Brasil. Desde a primeira temporada dá para <strong>procurar reforço em
qualquer país</strong> com elenco no jogo — e o caminho é de mão dupla: clubes de fora aparecem oferecendo pelos seus
jogadores, e vender bem para o exterior é uma das formas mais rápidas de arrumar o caixa de um clube pequeno.</p>

${fig('mercado', 'O mercado: quem está à venda, por quanto, e o que o seu caixa aguenta')}

<h2>A partida é o resultado do que você decidiu</h2>
<p>Quando a rodada roda, ela roda ao vivo: placar andando minuto a minuto, público reagindo, lesão que obriga a mexer,
expulsão que muda o jogo, pênalti em que você escolhe o batedor. No intervalo dá para trocar peça e ajustar a tática —
e em mata-mata empatado a disputa de pênaltis é cobrança a cobrança.</p>

${fig('partida', 'A rodada ao vivo: o placar andando, o público e os lances acontecendo')}

<h2>A carreira é sua, não do save</h2>
<p>O treinador é um personagem que atravessa temporadas: acumula pontos de carreira, guarda as taças na sala de troféus,
recebe sondagens de clubes maiores quando vai bem — e aparece no <a href="/ranking/">ranking de treinadores</a>, onde cada
título vale o peso real da competição que ele é.</p>

${fig('carreira', 'A carreira do treinador: temporadas, campanhas e a segurança no cargo')}

<h2>Sozinho ou com a turma</h2>
<p>No <strong>Modo Solo</strong> você enfrenta a máquina no seu ritmo, de graça e sem prazo. No
<strong>Modo Resenha</strong>, até 10 treinadores disputam o mesmo campeonato, cada um no seu aparelho — é a
<a href="/jogar-com-amigos/">liga da sua turma</a>. Os dois rodam no navegador, sem instalar nada.</p>

<p><a href="/"><strong>Assuma um clube e comece a sua carreira</strong></a> — ou veja antes o
<a href="/manager-futebol-brasileiro/">que tem de futebol brasileiro no jogo</a>.</p>
`.trim(),
  },

  // ======================= P1: MANAGER BRASILEIRO =======================
  {
    slug: 'manager-futebol-brasileiro', ready: true, priority: 0.8, lastmod: '2026-09-20',
    title: 'Manager de futebol brasileiro online: Séries A, B, C e D — RetroFoot',
    description: 'Comande um clube brasileiro de verdade no RetroFoot: as quatro divisões, Copa do Brasil, Libertadores e Sul-Americana, com acesso e rebaixamento. Online, grátis, no navegador.',
    h1: 'Manager de futebol brasileiro: as quatro divisões, as copas e o acesso',
    keywords: 'jogo de manager de futebol brasileiro, simulador de futebol brasileiro, jogo de gerenciar futebol brasileiro, jogo de tecnico de futebol brasileiro, serie d, copa do brasil',
    resumo: [
      'Séries <strong>A, B, C e D</strong>, com os clubes do Brasil e os elencos de cada um.',
      '<strong>Copa do Brasil</strong>, Libertadores e Sul-Americana no mesmo calendário.',
      'Acesso e rebaixamento de verdade: dá para subir da quarta divisão até a elite.',
      'O <strong>mercado é mundial</strong> — mesmo comandando um clube brasileiro.',
    ],
    faq: [
      { q:'Quais campeonatos brasileiros estão no jogo?', a:'<p>As quatro divisões nacionais — <strong>Séries A, B, C e D</strong> — e a <strong>Copa do Brasil</strong>, além das continentais <strong>Libertadores</strong> e <strong>Sul-Americana</strong>, tudo num calendário só.</p>' },
      { q:'Dá para começar na Série D?', a:'<p>Dá — e é o caminho mais divertido: pegar um clube pequeno, arrumar o caixa e subir divisão por divisão. Lembrando que o clube vem por <strong>sorteio</strong>: você escolhe a divisão, não o time.</p>' },
      { q:'Dá para jogar com ligas de outros países?', a:'<p>Na versão atual o clube que você comanda é <strong>brasileiro</strong> — a carreira acontece nas quatro divisões daqui. As ligas estrangeiras existem e rodam ao fundo, e o <strong>mercado de transferências é mundial</strong>: você compra e vende com o exterior normalmente.</p>' },
      { q:'Tem futebol feminino?', a:'<p>Tem. Logo no começo da carreira você escolhe comandar o elenco masculino ou o feminino — mesmos clubes, mesmo calendário, mesmas competições.</p>' },
      { q:'Por que os clubes aparecem pelo apelido?', a:'<p>Porque nome de clube é marca registrada. Os clubes são os de verdade, com escudo e cores, e aparecem pelo <strong>apelido da torcida</strong> — o ABC é o <em>Elefante Potiguar</em>. Os elencos são os reais de cada clube, com nomes fictícios. É o mesmo motivo pelo qual os clássicos do gênero sempre viveram de patches.</p>' },
      { q:'Posso escolher o meu time?', a:'<p>Você escolhe a <strong>divisão</strong>; o <strong>sorteio</strong> escolhe o clube. É uma regra da casa: o desafio é o que você faz com o time que recebeu — e numa liga com amigos é o que impede alguém de pegar o grandão por combinação.</p>' },
      { q:'Quanto custa jogar?', a:'<p>Nada para começar: o <strong>Modo Solo</strong> é gratuito e sem prazo, com até 3 carreiras por mês. O <strong>Modo Resenha</strong> é liberado por 7 dias ao criar a conta e depois passa a ser dos planos pagos — mas entrar na sala de um amigo continua sem custar nada.</p>' },
    ],
        body: `
<p class="lead">Um manager brasileiro de verdade não começa na Série A. Começa lá embaixo, com o caixa curto, um elenco
que ninguém quer e a tabela inteira pela frente. No RetroFoot você escolhe em que divisão quer sofrer — e o resto é com
você.</p>

<h2>As quatro divisões, com o buraco mais embaixo</h2>
<p><strong>Séries A, B, C e D</strong>, com clubes e elencos brasileiros. E cada divisão é um jogo diferente: na Série D
o dinheiro é curto e cada contratação pesa; na Série A você encara os gigantes com orçamento de gigante. Subir de divisão
muda tudo de uma vez — receita, torcida, o nível de quem aceita jogar no seu clube.</p>
<p>Detalhe que muda a graça: <strong>o clube vem por sorteio</strong>. Você escolhe a divisão, o sorteio escolhe o time.
O desafio é o que você faz com o que caiu na sua mão.</p>

${fig('classificacao', 'A tabela da sua divisão — acesso em cima, rebaixamento embaixo')}

<h2>Copa do Brasil, Libertadores e Sul-Americana</h2>
<p>Não é só pontos corridos. Tem <strong>Copa do Brasil</strong> em mata-mata, com o frio na barriga do jogo de volta, e
tem as continentais — <strong>Libertadores</strong> e <strong>Sul-Americana</strong> — para quem conquistou a vaga na
temporada anterior. Cada competição tem o seu chaveamento, o seu sorteio e a sua premiação: copa dá dinheiro a cada fase
disputada, e as continentais pagam quando acabam.</p>

${fig('copa', 'Minhas competições: liga, copa e continentais no mesmo lugar')}

<h2>Um calendário que se comporta como calendário</h2>
<p>Liga, copa e continental não atropelam umas às outras: cada rodada tem o seu dia, e o jogo vai dizendo o que vem a
seguir. Dá para abrir o calendário e ver a temporada inteira — onde estão as finais, quando aperta, em que semana você
vai jogar três vezes.</p>

${fig('calendario', 'O calendário da temporada: liga, copa e continental, cada uma no seu dia')}

<h2>O clube é brasileiro, o mercado é o mundo</h2>
<p>Você comanda um clube do Brasil, mas não negocia só aqui dentro. Desde a primeira temporada o
<strong>mercado é mundial</strong>: dá para procurar reforço em qualquer país com elenco no jogo, e clubes estrangeiros
aparecem oferecendo pelos seus jogadores. Para clube pequeno, vender bem para fora costuma ser o atalho que arruma o
caixa de uma temporada inteira.</p>

${fig('leilao', 'O leilão: quando mais de um clube quer o mesmo jogador, decide o lance')}

<h2>Base, estádio e as contas do fim do mês</h2>
<p>Clube brasileiro se sustenta assim: <strong>revela da base</strong>, cuida do <strong>estádio</strong> para a
bilheteria crescer, segura a folha e negocia bem. Tudo isso está na sua mão — inclusive a decisão de gastar agora para
receber depois, que é a mais difícil de todas.</p>

${fig('financas', 'As finanças do clube: receita, folha, bilheteria e o saldo da temporada')}

<h2>Masculino ou feminino</h2>
<p>Logo no começo da carreira você escolhe qual elenco vai comandar: <strong>masculino ou feminino</strong>. São os mesmos
clubes, o mesmo calendário e as mesmas competições — muda quem entra em campo.</p>

<p><a href="/"><strong>Escolha a sua divisão e receba o seu clube</strong></a> — ou leia antes o
<a href="/guia/">guia do técnico</a>, que ensina a fazer dinheiro e a subir de série.</p>
`.trim(),
  },

  // ======================= P1: JOGAR COM AMIGOS =======================
  {
    slug: 'jogar-com-amigos', ready: true, priority: 0.8, lastmod: '2026-09-20',
    title: 'Jogar manager de futebol com amigos: o Modo Resenha do RetroFoot',
    description: 'No Modo Resenha do RetroFoot, até 10 treinadores disputam o mesmo campeonato online — cada um no seu aparelho, com sorteio dos clubes, rodada ao vivo e Modo Camarote. Grátis para experimentar.',
    h1: 'Modo Resenha: um campeonato de verdade com a sua turma',
    keywords: 'jogo de futebol online com amigos, manager de futebol multiplayer, jogo de treinador com amigos, modo resenha, retrofoot resenha, liga com amigos online',
    resumo: [
      'O <strong>Modo Resenha</strong> põe até <strong>10 treinadores</strong> no mesmo campeonato, cada um no seu aparelho.',
      'O <strong>sorteio distribui os clubes</strong> com todo mundo assistindo — ninguém escolhe time.',
      'A semana <strong>só fecha quando todos jogarem</strong>: ninguém é simulado pelas suas costas.',
      'Convite por <strong>código de sala</strong>, sem instalar nada. Sete dias liberados ao criar a conta.',
    ],
    faq: [
      { q:'Quantas pessoas podem jogar juntas?', a:'<p>Até <strong>10 treinadores</strong> na mesma sala, cada um com o seu clube.</p>' },
      { q:'Como convido meus amigos?', a:'<p>Você abre a sala e compartilha o <strong>código</strong>. Quem recebe entra pelo navegador, digita o código e ocupa um assento — sem baixar nada.</p>' },
      { q:'Todo mundo precisa estar online ao mesmo tempo?', a:'<p>Não precisa ser ao mesmo tempo, mas <strong>todo mundo precisa jogar a sua partida</strong> para a semana virar: a rodada só fecha quando o último assento jogar. Enquanto isso você continua no jogo — vendo a tabela, mexendo no elenco, negociando. É de propósito: ninguém tem o time simulado pelas costas por ter demorado.</p>' },
      { q:'Dá para jogar no celular?', a:'<p>Dá. Cada treinador entra do aparelho que quiser — celular, tablet ou computador — e o save fica na conta. O <strong>chat da sala</strong>, esse sim, só aparece no computador.</p>' },
      { q:'Meus amigos precisam pagar para entrar na minha sala?', a:'<p><strong>Não.</strong> Entrar na resenha de alguém funciona em qualquer plano, inclusive no grátis — basta o código da sala. Quem precisa de plano é o <strong>anfitrião</strong>, quem abre a sala e chama a turma.</p>' },
      { q:'Quanto custa abrir uma sala?', a:'<p>Abrir sala é do plano <strong>Embaixador</strong>: <strong>R$ 49,90 por mês</strong> ou R$ 399,00 por ano. Além de ser anfitrião de salas de 2 a 10 treinadores, ele dá carreiras ilimitadas no Modo Solo, o seu retrato por IA dentro do jogo e o selo no perfil. Há também o plano <strong>Resenha</strong> (R$ 19,90/mês), que tira o prazo de 7 dias e deixa você entrar na sala de qualquer anfitrião — mas não abre sala. E antes de qualquer assinatura: ao criar a conta, o Modo Resenha vem liberado por <strong>7 dias</strong>, justamente para a turma experimentar.</p>' },
      { q:'E se alguém sumir no meio do campeonato?', a:'<p>A rodada espera, porque a semana só fecha quando todos os assentos jogarem. Enquanto isso ninguém fica preso numa tela de espera: dá para ver a tabela, mexer no elenco e negociar. Se a pessoa sumiu de vez, quem organiza a sala é quem resolve — vale combinar isso com a turma antes de começar o campeonato.</p>' },
      { q:'Dá para jogar todo mundo no mesmo aparelho?', a:'<p>Dá: existe o modo de <strong>passar o aparelho</strong>, em que os treinadores da sala jogam em fila no mesmo celular ou computador, um de cada vez. É o jeito clássico, para quando a turma está junta na mesma mesa — mas o normal é cada um no seu aparelho, de onde estiver.</p>' },
      { q:'Precisamos combinar horário?', a:'<p>Não. Cada um joga a sua partida quando puder; a semana vira quando o último jogar. Combinar horário só vale a pena se vocês quiserem assistir juntos — e aí o <strong>Modo Camarote</strong> ajuda, porque põe o jogo em tela cheia com narração lance a lance.</p>' },
    ],
        body: `
<p class="lead">O RetroFoot tem dois modos. No <strong>Modo Solo</strong> você pega um clube e enfrenta a máquina. No
<strong>Modo Resenha</strong>, a liga é da sua turma: até <strong>10 treinadores</strong> no mesmo campeonato, cada um no
seu aparelho, disputando a mesma tabela — e é aqui que o jogo fica bom de verdade.</p>

<h2>Como a sala nasce</h2>
<ol>
  <li><strong>Você abre a sala</strong> e ela ganha um código.</li>
  <li><strong>Manda o código para a turma</strong> — no grupo, no direct, onde vocês já conversam.</li>
  <li><strong>Cada um entra pelo navegador</strong>, digita o código e ocupa um assento.</li>
</ol>
<p>Ninguém instala nada, ninguém precisa do mesmo aparelho, ninguém precisa estar na mesma cidade.</p>

${fig('resenha-criar', 'Abrir a sala do Modo Resenha — ela nasce com um código para você repassar')}

<h2>O sorteio: ninguém escolhe clube</h2>
<p>Essa é uma regra da casa, e faz diferença. Quando a sala fecha, o <strong>sorteio roda para todo mundo ao mesmo
tempo</strong> — cada treinador recebe o clube que o sorteio deu, com a turma inteira assistindo à cerimônia. Não tem
escolher o grandão, não tem combinar por fora. O que você faz com o time que caiu na sua mão é o jogo.</p>

${fig('sala-resenha', 'A sala enchendo antes do sorteio — cada treinador no seu aparelho')}

<h2>A semana só fecha quando todos jogarem</h2>
<p>Esta é a regra que segura a liga de pé, e vale explicar porque ela é uma escolha, não uma limitação: a rodada
<strong>não avança enquanto houver assento sem jogar</strong>. Ninguém tem o time escalado no automático nem o resultado
decidido pelas costas por ter demorado meio dia para abrir o jogo.</p>
<p>Enquanto a turma joga, você não fica parado olhando para uma tela de espera: dá para ver a tabela, mexer no elenco,
negociar no mercado, responder e-mail. Quando o último jogar, a semana vira para todo mundo junto.</p>

${fig('pos-rodada', 'Fechada a rodada, a classificação atualiza para a sala inteira')}

<h2>Modo Camarote: o seu jogo em tela cheia</h2>
<p>Na hora da partida, o <strong>Modo Camarote</strong> põe só o seu confronto ocupando a tela, com narração lance a lance
e as estatísticas do jogo. É o formato de quem quer assistir à própria partida como quem assiste à TV — e é o que a
galera que transmite a resenha costuma deixar ligado.</p>

${fig('camarote', 'O Modo Camarote: o seu jogo em tela cheia, com narração lance a lance')}

<h2>O chat da sala</h2>
<p>Tem chat entre os treinadores da sala, e ele é de propósito discreto: fica como uma bolha no canto, mostra uma linha
de cada vez quando chega mensagem, e abre em painel quando você quiser. <strong>Durante a partida ao vivo e no Modo
Camarote ele fica em silêncio total</strong> — o contador continua contando, mas nada interrompe o jogo. No celular o
chat não aparece: numa tela de 375px, um painel abrindo por engano atrapalha mais do que ajuda.</p>

<h2>A disputa continua fora da rodada</h2>
<p>O campeonato é o placar óbvio, mas não é o único. Cada taça conquistada entra na sua <strong>sala de troféus</strong>,
a carreira acumula pontos temporada após temporada, e o <a href="/ranking/">ranking de treinadores</a> coloca todo mundo
na mesma régua — com o peso de cada título valendo o que a competição vale. Dá para a resenha durar anos de jogo.</p>

<h2>O que você precisa para começar</h2>
<ul>
  <li><strong>Uma conta</strong> — é ela que guarda a sua sala, o seu assento e o seu clube.</li>
  <li><strong>Um navegador</strong> — no celular, no tablet ou no computador. Nada para instalar.</li>
  <li><strong>A turma</strong> — de 2 a 10 treinadores por sala.</li>
</ul>
<p>Ao criar a conta, o Modo Resenha vem liberado por <strong>7 dias</strong> para vocês experimentarem. Depois disso,
abrir sala passa a ser do plano; o <strong>Modo Solo</strong> segue de graça e sem prazo.</p>

<p><a href="/"><strong>Abra a sua sala e chame a turma</strong></a> — ou veja antes
<a href="/elifoot-online/">como o jogo funciona no navegador</a> e a
<a href="/historia-do-elifoot/">história da resenha nos managers brasileiros</a>.</p>
`.trim(),
  },

  // ======================= P2: MELHORES JOGOS =======================
  {
    slug: 'melhores-jogos-treinador-futebol', ready: true, priority: 0.7, lastmod: '2026-09-20',
    title: 'Melhores jogos de treinador de futebol em 2026 (grátis e online)',
    description: 'Os melhores jogos de manager de futebol em 2026, por perfil de jogador: simulação profunda, clássico direto e online com amigos. Veja onde o RetroFoot entra — grátis, no navegador.',
    h1: 'Os melhores jogos de treinador de futebol em 2026',
    keywords: 'melhor jogo de treinador de futebol, qual o melhor jogo de treinador de futebol, melhor jogo de manager de futebol, melhor jogo de manager de futebol para celular, jogo de manager gratis',
    resumo: [
      'O gênero tem três perfis: <strong>simulação profunda</strong>, <strong>clássico direto</strong> e <strong>online com a turma</strong>.',
      'Football Manager domina a simulação; Elifoot e Brasfoot fundaram a escola clássica brasileira.',
      'Para jogar hoje, de graça e sem instalar nada, a opção é o <strong>RetroFoot</strong>, no navegador.',
      'Nenhum é "o melhor" no absoluto — o melhor é o que combina com o tempo que você tem.',
    ],
    refs: [
      { nome:'Football Manager (SEGA)', desc:'A simulação mais profunda do gênero — paga, e pede PC.', url:'https://www.footballmanager.com/' },
      { nome:'Elifoot (site oficial)', desc:'O clássico de André Elias, referência de simplicidade.', url:'https://www.elifoot.com/' },
      { nome:'Brasfoot (site oficial)', desc:'Clássico brasileiro, forte em ligas e em patches da comunidade.', url:'https://www.brasfoot.com/' },
    ],
    faq: [
      { q:'Qual o melhor jogo de treinador de futebol grátis?', a:'<p>Entre os gratuitos e sem instalação, o <strong>RetroFoot</strong> é a opção mais direta: roda no navegador, tem clubes brasileiros das quatro divisões e um modo para jogar com a turma. O <strong>Modo Solo</strong> é gratuito e sem prazo.</p>' },
      { q:'Tem algum que rode no celular sem baixar?', a:'<p>Tem: o RetroFoot roda no navegador do celular, e o save fica na nuvem — dá para começar no computador e continuar no telefone.</p>' },
      { q:'Football Manager é grátis?', a:'<p>Não — é um jogo pago, com versões para PC e console. É a escolha de quem quer simulação profunda e não se importa em instalar e aprender.</p>' },
      { q:'Qual é o melhor para jogar com os amigos?', a:'<p>Depende de como a turma se organiza. Se todo mundo puder estar no mesmo lugar, qualquer clássico serve. Se cada um está numa cidade, você precisa de multiplayer online de verdade — é o que o <a href="/jogar-com-amigos/">Modo Resenha</a> do RetroFoot faz, com até 10 treinadores na mesma liga.</p>' },
      { q:'Por que o RetroFoot não usa os nomes reais dos jogadores?', a:'<p>Porque nome de clube e de atleta é marca registrada, e licenciar isso num jogo gratuito não se paga. Os clubes aparecem pelo <strong>apelido da torcida</strong> (o ABC é o <em>Elefante Potiguar</em>) e os elencos são os reais com <strong>nomes fictícios</strong>. É exatamente a lacuna que, nos clássicos do gênero, a comunidade sempre preencheu com patches.</p>' },
      { q:'Qual é o melhor para quem tem pouco tempo?', a:'<p>Um manager de navegador, porque o custo de entrar é zero: não há instalação nem atualização, e dá para jogar uma rodada em minutos. No RetroFoot a partida no ritmo Curto dura pouco mais de meio minuto, e quem assina tem o Ultrassônico, de cerca de dez segundos.</p>' },
    ],
        body: `
<p class="lead">Não existe "o melhor jogo de treinador de futebol" no absoluto — existe o que combina com o tempo que
você tem, o aparelho que você usa e a vontade de aprender menu. Abaixo, o gênero dividido por perfil, com o que cada
caminho entrega e o que cobra.</p>

<h2>Três perfis, três caminhos</h2>
<h3>1. Simulação profunda</h3>
<p>É a linha do <strong>Football Manager</strong>: scouting minucioso, dezenas de ligas, tática em camadas, relatório de
olheiro, coletiva de imprensa. Entrega o máximo de profundidade que o gênero tem. Cobra em preço, em instalação e,
principalmente, em <strong>tempo</strong> — não é jogo de trinta minutos.</p>

<h3>2. Clássico direto</h3>
<p>É a escola brasileira, fundada pelo <a href="/historia-do-elifoot/"><strong>Elifoot</strong></a> e pelo
<strong>Brasfoot</strong>: você entende a tela em minutos, escala, negocia e joga. O Elifoot ficou conhecido pela
simplicidade e pela resenha; o Brasfoot, pela quantidade de ligas e pela comunidade de patches que mantém os elencos em
dia. Quem quiser a comparação lado a lado: <a href="/elifoot-vs-brasfoot/">Elifoot vs Brasfoot</a>.</p>

<h3>3. Online, com a turma, sem instalar</h3>
<p>É onde o <strong>RetroFoot</strong> vive. A ideia é tirar toda a fricção da frente: abre no navegador, o save fica na
nuvem, e a liga com os amigos acontece com cada um no seu aparelho — sem marcar de estar todo mundo na mesma sala.</p>

${fig('hub', 'A tela do técnico no RetroFoot: o essencial à vista, sem menu escondido')}

<h2>Os três perfis, critério por critério</h2>
<p>As colunas são <strong>perfis</strong>, não produtos: cada jogo tem a sua edição, o seu preço e a sua versão do
ano, e comparar nome a nome envelhece em um mês. O que não envelhece é o feitio de cada caminho.</p>
<table>
  <thead><tr><th>Critério</th><th>Simulação profunda</th><th>Clássico de PC</th><th>RetroFoot (navegador)</th></tr></thead>
  <tbody>
    <tr><td>Onde roda</td><td>PC ou console, com instalação</td><td>PC ou celular, com instalação</td><td><strong>No navegador, sem instalar</strong></td></tr>
    <tr><td>Tempo até a primeira partida</td><td>Uma tarde aprendendo a tela</td><td>Minutos</td><td><strong>Menos de um minuto</strong></td></tr>
    <tr><td>Custo para começar</td><td>Pago</td><td>Versões grátis e pagas, varia por edição</td><td><strong>Modo Solo grátis, sem prazo</strong></td></tr>
    <tr><td>Ligas jogáveis</td><td><strong>Dezenas</strong></td><td><strong>Muitas</strong> — é o forte do Brasfoot</td><td>Só o Brasil: Séries A, B, C e D</td></tr>
    <tr><td>Elencos em dia</td><td>Atualização oficial</td><td>Patches da comunidade</td><td>Atualização do próprio jogo</td></tr>
    <tr><td>Nomes de clube e de atleta</td><td>Licenciados</td><td>Reais nos patches da comunidade</td><td>Clube pelo apelido, jogador com nome fictício</td></tr>
    <tr><td>Jogar com a turma à distância</td><td>Existe, com sessão combinada</td><td>Historicamente, o mesmo computador</td><td><strong>Modo Resenha: até 10, cada um no seu aparelho</strong></td></tr>
    <tr><td>Onde fica o save</td><td>No computador</td><td>No aparelho</td><td><strong>Na nuvem</strong> — troca de tela sem perder nada</td></tr>
    <tr><td>Duração de uma partida</td><td>Longa, é parte do prazer</td><td>Rápida</td><td>~30s no ritmo Curto; ~10s no Ultrassônico (plano)</td></tr>
    <tr><td>Profundidade tática</td><td><strong>Máxima do gênero</strong></td><td>Média</td><td>Média: formação, tática por contexto, ajuste no intervalo</td></tr>
  </tbody>
</table>
<p>Lendo as colunas de cima a baixo, o desenho fica claro: <strong>simulação profunda</strong> ganha em profundidade e
em número de ligas, <strong>clássico de PC</strong> ganha em coleção e em elenco atualizado pela comunidade, e o
<strong>RetroFoot</strong> ganha em começar rápido e em jogar com a turma de longe. Nenhuma das três colunas ganha
todas as linhas — se ganhasse, não haveria três escolas.</p>

<h2>O que o RetroFoot entrega</h2>
<ul>
  <li><strong>Grátis no Modo Solo</strong>, sem prazo e sem instalação — abre como qualquer site.</li>
  <li><strong>Clubes brasileiros das Séries A, B, C e D</strong>, mais Copa do Brasil, Libertadores e Sul-Americana.</li>
  <li><strong>Modo Resenha</strong> — até 10 treinadores na mesma liga, cada um no seu aparelho.</li>
  <li><strong>Mercado mundial</strong> — compra e venda com clubes de fora desde a primeira temporada.</li>
  <li><strong>Carreira de treinador</strong> — pontos, sala de troféus, sondagens e <a href="/ranking/">ranking</a>.</li>
  <li><strong>Partida ao vivo</strong> — com lesão, expulsão, pênalti e disputa por cobranças.</li>
</ul>

${fig('partida', 'A rodada ao vivo: placar andando, público e os lances acontecendo')}

<h2>A linha que mais separa: jogar junto de longe</h2>
<p>Esse é o critério em que a diferença não é de grau, é de natureza. Nos clássicos, "vários jogadores" quase sempre
quis dizer <em>o mesmo teclado, passando de mão em mão</em> — o que exige a turma na mesma sala, no mesmo horário.
No <a href="/jogar-com-amigos/">Modo Resenha</a> cada um entra do próprio aparelho, de onde estiver, e a semana só
fecha quando o último jogar: ninguém tem o time simulado pelas costas por ter demorado.</p>

${fig('sala-resenha', 'A sala do Modo Resenha enchendo — cada treinador no seu aparelho')}

<h2>O que ele não é</h2>
<p>Vale dizer, porque poupa o seu tempo: o RetroFoot <strong>não</strong> é um simulador de dezenas de ligas jogáveis —
na versão atual o clube que você comanda é brasileiro, e as ligas estrangeiras rodam ao fundo (embora o mercado negocie
com elas). Se o que você quer é sentar em um clube da Inglaterra ou da Espanha, hoje o caminho é outro jogo.</p>

<h2>Como escolher em uma pergunta</h2>
<p><em>Quanto tempo você quer gastar antes da primeira partida?</em> Se a resposta for "uma tarde aprendendo", vá de
simulação profunda. Se for "um minuto", abra um manager de navegador. Vale também olhar os
<a href="/jogos-parecidos-com-elifoot/">jogos parecidos com o Elifoot</a>.</p>

<p><a href="/"><strong>Testar o RetroFoot agora</strong></a> — é de graça e roda no navegador.</p>
`.trim(),
  },

  // ======================= P2: JOGOS PARECIDOS =======================
  {
    slug: 'jogos-parecidos-com-elifoot', ready: true, priority: 0.7, lastmod: '2026-09-20',
    title: 'Jogos parecidos com Elifoot: as alternativas de 2026',
    description: 'Procura um jogo tipo Elifoot? Veja as alternativas de manager de futebol em 2026 e o que faz um jogo ter essa pegada — incluindo o RetroFoot, que roda no navegador, de graça.',
    h1: 'Jogos parecidos com o Elifoot para jogar em 2026',
    keywords: 'jogo tipo elifoot, jogos parecidos elifoot, elifoot alternativa, games like elifoot, jogo tipo elifoot online, manager simples de futebol',
    resumo: [
      'Quem procura "jogo parecido com Elifoot" quer três coisas: <strong>simples</strong>, <strong>rápido</strong> e <strong>com amigos</strong>.',
      'Os clássicos do gênero seguem vivos — e cada um puxa para um lado diferente.',
      'O <strong>RetroFoot</strong> é a opção que roda no navegador, de graça, sem instalar nada.',
      'O <strong>Modo Resenha</strong> resolve o que nenhum clássico resolvia em 1998: a turma jogando à distância.',
    ],
    refs: [
      { nome:'Elifoot (site oficial)', desc:'O original de André Elias, o "pai dos managers" em português.', url:'https://www.elifoot.com/' },
      { nome:'Brasfoot (site oficial)', desc:'Clássico brasileiro, forte em ligas e em patches da comunidade.', url:'https://www.brasfoot.com/' },
      { nome:'Football Manager (SEGA)', desc:'A referência internacional do gênero, com simulação profunda e paga.', url:'https://www.footballmanager.com/' },
    ],
    faq: [
      { q:'Existe algum jogo tipo Elifoot grátis e online?', a:'<p>Sim: o <strong>RetroFoot</strong> roda no navegador, é gratuito no <strong>Modo Solo</strong> e não exige instalação — dá para jogar no celular ou no PC e continuar de onde parou, porque a carreira fica gravada na nuvem.</p>' },
      { q:'Preciso baixar alguma coisa?', a:'<p>Não. Abre o site e joga. É a diferença principal em relação aos clássicos de PC, que pedem download e instalação.</p>' },
      { q:'Os clubes e os jogadores são os de verdade?', a:'<p>Os <strong>clubes são os de verdade</strong> — as quatro divisões brasileiras, com o escudo e as cores de cada um —, só que aparecem pelo <strong>apelido da torcida</strong> em vez do nome oficial: o ABC é o <em>Elefante Potiguar</em>. Os <strong>elencos também são os reais</strong>, jogador por jogador, com <strong>nomes fictícios</strong>. É a mesma razão pela qual os clássicos do gênero dependiam de patches: nome de clube e de atleta é marca registrada, e licenciar tudo isso num jogo gratuito não se paga.</p>' },
      { q:'Dá para jogar com os amigos como era antigamente?', a:'<p>Dá, e sem o teclado passando de mão em mão: no <a href="/jogar-com-amigos/">Modo Resenha</a> até 10 treinadores disputam a mesma liga, cada um no seu aparelho.</p>' },
      { q:'Quanto custa?', a:'<p>O <strong>Modo Solo</strong> é grátis e sem prazo (até 3 carreiras por mês). O <strong>Modo Resenha</strong> vem liberado por 7 dias ao criar a conta; depois é dos planos — mas entrar na sala de um amigo nunca custa nada.</p>' },
    ],
        body: `
<p class="lead">Se você procura um <strong>jogo parecido com o Elifoot</strong>, provavelmente não está atrás de gráficos.
Está atrás de uma sensação: abrir, entender em dois minutos, escalar o time e brigar por uma vaga — de preferência
zoando os amigos no caminho. Esta página é sobre onde encontrar isso hoje.</p>

<h2>O que faz um jogo ser "tipo Elifoot"</h2>
<p>Três coisas, e elas andam juntas:</p>
<ul>
  <li><strong>Simplicidade</strong> — a tela se explica sozinha, sem tutorial de meia hora.</li>
  <li><strong>Foco no técnico</strong> — tática, elenco e dinheiro decidem o jogo; ninguém controla a bola.</li>
  <li><strong>Resenha</strong> — a graça mesmo é ter com quem disputar e de quem tirar sarro na segunda-feira.</li>
</ul>
<p>Um jogo que tem as três é "tipo Elifoot", independentemente de quando foi feito.</p>

<h2>As alternativas, e para quem cada uma serve</h2>
<h3>RetroFoot</h3>
<p>É o mais próximo dessa combinação hoje, e o único da lista que <strong>não pede instalação</strong>: abre no navegador,
no celular ou no PC. Tem clubes brasileiros das quatro divisões, Copa do Brasil e continentais, mercado mundial, partida
ao vivo e o <strong>Modo Resenha</strong> — até 10 treinadores na mesma liga, cada um no seu aparelho. O
<strong>Modo Solo</strong> é gratuito e sem prazo.</p>

${fig('formacao', 'A tela do técnico: escalação, banco, próximo jogo e caixa — tudo à vista')}

<h3>Brasfoot</h3>
<p>O outro clássico brasileiro, e a escolha de quem gosta de <strong>coleção</strong>: muitas ligas, temporadas novas
todo ano e uma comunidade de patches que mantém os elencos atualizados. A comparação completa está em
<a href="/elifoot-vs-brasfoot/">Elifoot vs Brasfoot</a>.</p>

<h3>O próprio Elifoot</h3>
<p>Continua existindo, com o criador dele. Se é o Elifoot em si que você quer, o site oficial está nas referências no
fim desta página — vale a visita.</p>

<h3>Simuladores completos</h3>
<p>Entregam profundidade tática e de scouting que nenhum clássico alcança, mas pesam mais, custam e têm curva de
aprendizado. Outro tipo de prazer, para outro tipo de tarde.</p>

<h2>O que mudou desde 1998</h2>
<p>A parte que envelheceu dos clássicos nunca foi a ideia — foi a tecnologia em volta. Instalar, guardar registro e
senha, o save preso naquele computador, e "multiplayer" querendo dizer o mesmo teclado. É exatamente essa lista que um
manager de navegador apaga.</p>

${fig('sala-resenha', 'O Modo Resenha: a turma na mesma liga, cada um no seu aparelho')}

<p>Quer ir direto ao ponto? <a href="/"><strong>Abra o RetroFoot e pegue um clube</strong></a> — ou entenda antes a
<a href="/historia-do-elifoot/">história desse tipo de jogo no Brasil</a>.</p>
`.trim(),
  },

  // ======================= P2: ELIFOOT VS BRASFOOT =======================
  {
    slug: 'elifoot-vs-brasfoot', ready: true, priority: 0.6, lastmod: '2026-09-20',
    title: 'Elifoot vs Brasfoot: as duas escolas do manager brasileiro',
    description: 'Elifoot ou Brasfoot? Um comparativo honesto entre os dois clássicos do manager de futebol brasileiro — o que cada um faz melhor, e onde entra o RetroFoot, que roda no navegador.',
    h1: 'Elifoot vs Brasfoot: duas escolas, e o que cada uma faz melhor',
    keywords: 'elifoot vs brasfoot, elifoot ou brasfoot, brasfoot ou elifoot, melhor manager brasileiro, retrofoot',
    resumo: [
      'São duas escolas: o <strong>Elifoot</strong> é a da simplicidade e da resenha; o <strong>Brasfoot</strong>, a da coleção — muitas ligas e patches.',
      'Elifoot tem a curva mais baixa: dá para entender em minutos.',
      'Brasfoot ganha em quantidade de ligas e na comunidade que mantém os elencos em dia.',
      'O <strong>RetroFoot</strong> é uma terceira opção, não um juiz: simples como a primeira escola, com a resenha online que nenhuma das duas tinha em 1998.',
    ],
    refs: [
      { nome:'Elifoot (site oficial)', desc:'Site do criador André Elias, com o histórico e as versões do jogo original.', url:'https://www.elifoot.com/' },
      { nome:'Brasfoot (site oficial)', desc:'Página oficial do Brasfoot, com temporadas, registros e a comunidade de patches.', url:'https://www.brasfoot.com/' },
    ],
    faq: [
      { q:'Qual é melhor: Elifoot ou Brasfoot?', a:'<p>Depende do que você procura, e os dois são bons no que se propõem. Se quer sentar e jogar em minutos, com foco em tática e resenha, a pegada do <strong>Elifoot</strong> combina mais. Se gosta de gerenciar muitas ligas e manter elencos atualizados com patches, o <strong>Brasfoot</strong> entrega mais nesse ponto.</p>' },
      { q:'Os dois são pagos?', a:'<p>Os dois têm versões gratuitas e versões ou registros pagos, que variam por edição — o melhor é conferir nos sites oficiais, linkados nesta página.</p>' },
      { q:'E o RetroFoot, onde entra?', a:'<p>É um <strong>jogo próprio</strong>, sem ligação com nenhum dos dois. Ele fica na mesma escola da simplicidade, e acrescenta o que a internet de hoje permite: roda no navegador sem instalar, o save fica na nuvem, e o <a href="/jogar-com-amigos/">Modo Resenha</a> põe até 10 treinadores na mesma liga, cada um no seu aparelho.</p>' },
      { q:'Dá para jogar com ligas de outros países no RetroFoot?', a:'<p>Na versão atual, não: o clube que você comanda é <strong>brasileiro</strong>, nas quatro divisões. As ligas estrangeiras rodam ao fundo e o mercado negocia com elas, mas sentar num clube de fora ainda não dá. Nesse quesito, quem quer muitas ligas jogáveis se serve melhor no Brasfoot.</p>' },
      { q:'Por que o Brasfoot tem os nomes reais e o RetroFoot não?', a:'<p>Não é falta de dados, é licença: nome de clube e de atleta é marca registrada. No Brasfoot, quem historicamente resolve isso é a <strong>comunidade de patches</strong>, por fora do jogo. No RetroFoot os clubes aparecem pelo <strong>apelido da torcida</strong> — o ABC é o <em>Elefante Potiguar</em> — e os elencos são os reais de cada clube com <strong>nomes fictícios</strong>.</p>' },
      { q:'Qual deles dá para jogar com os amigos à distância?', a:'<p>O <strong>Modo Resenha</strong> do RetroFoot foi feito para isso: até <strong>10 treinadores</strong> na mesma liga, cada um no seu aparelho, com sorteio dos clubes para todo mundo ao mesmo tempo e a semana fechando só quando o último jogar. Nos clássicos, jogar junto quase sempre queria dizer o mesmo computador.</p>' },
      { q:'Quanto custa cada um?', a:'<p>Elifoot e Brasfoot têm versões gratuitas e registros pagos que variam por edição — confira nos sites oficiais, aqui nesta página. No RetroFoot, o <strong>Modo Solo</strong> é gratuito e sem prazo; o <strong>Modo Resenha</strong> tem 7 dias liberados e depois entra nos planos (R$ 19,90/mês para jogar nas salas dos outros, R$ 49,90/mês para abrir a sua).</p>' },
    ],
        body: `
<p class="lead">Duas gerações discutem isso até hoje: <strong>Elifoot ou Brasfoot?</strong> A resposta honesta é que eles
não disputam a mesma coisa. São <strong>duas escolas</strong> do manager brasileiro, com virtudes diferentes — e vale
saber qual delas é a sua antes de escolher.</p>

<h2>O que cada um representa</h2>
<p>O <a href="/historia-do-elifoot/"><strong>Elifoot</strong></a> é o "pai dos managers": nasceu em 1987, ganhou o Brasil
a partir de 1998 e ficou conhecido por duas coisas — você entende o jogo em minutos, e a graça está na resenha com os
amigos. É a <strong>escola da simplicidade</strong>.</p>
<p>O <strong>Brasfoot</strong> chegou depois e fundou a outra: muitas ligas, temporadas novas a cada ano e uma
<strong>comunidade de patches</strong> que mantém os elencos em dia por conta própria. É a <strong>escola da
coleção</strong> — e essa comunidade é um patrimônio que nenhum jogo compra pronto.</p>

<h2>Ponto a ponto</h2>
<table>
  <thead><tr><th>Critério</th><th>Escola Elifoot</th><th>Escola Brasfoot</th><th>RetroFoot</th></tr></thead>
  <tbody>
    <tr><td>Pegada</td><td>Simples, direta, retrô</td><td>Muitas ligas e patches</td><td>Retrô, com os clubes do Brasil pelo apelido</td></tr>
    <tr><td>Curva de aprendizado</td><td>Baixa (entende em minutos)</td><td>Média</td><td>Baixa</td></tr>
    <tr><td>Ligas jogáveis</td><td>Varia por edição</td><td><strong>Muitas — é o forte dele</strong></td><td>Só o Brasil (4 divisões); mercado mundial</td></tr>
    <tr><td>Elencos atualizados</td><td>Por versão</td><td><strong>Patches da comunidade</strong></td><td>Atualização do próprio jogo</td></tr>
    <tr><td>Jogar com amigos</td><td>É a alma do jogo</td><td>Presente</td><td>Modo Resenha: até 10, online, cada um no seu aparelho</td></tr>
    <tr><td>Precisa instalar?</td><td>Sim (PC)</td><td>Sim (PC/celular)</td><td><strong>Não — roda no navegador</strong></td></tr>
    <tr><td>Onde fica o save</td><td>No computador</td><td>No aparelho</td><td>Na nuvem — continua em qualquer tela</td></tr>
  </tbody>
</table>

<h2>Em uma frase cada</h2>
<ul>
  <li><strong>Elifoot:</strong> a escola da simplicidade — senta e joga.</li>
  <li><strong>Brasfoot:</strong> a escola da coleção — muitas ligas, muitos elencos, muitos patches.</li>
  <li><strong>RetroFoot:</strong> a simplicidade da primeira, com a resenha online que nenhuma das duas tinha em 1998.</li>
</ul>

<h2>Onde o RetroFoot entra — e onde não entra</h2>
<p>O <strong>RetroFoot</strong> é um jogo próprio, escrito do zero, sem ligação com Elifoot nem com Brasfoot. Ele fica na
escola da simplicidade e acrescenta o que a internet de hoje permite: abre no navegador sem instalar nada, o save fica na
nuvem, o <strong>mercado é mundial</strong>, a carreira do treinador atravessa temporadas com troféus e
<a href="/ranking/">ranking</a>, e o <strong>Modo Resenha</strong> põe até 10 treinadores na mesma liga, cada um no seu
aparelho, com o sorteio distribuindo os clubes para todo mundo ao mesmo tempo.</p>
<p>E onde ele não entra, para ser justo: <strong>se o que você quer é sentar num clube da Europa</strong>, ou colecionar
dezenas de ligas jogáveis, o RetroFoot ainda não faz isso — a carreira acontece nas quatro divisões brasileiras. Nesse
ponto o Brasfoot serve melhor, e não há problema nenhum em dizer isso.</p>

${fig('formacao', 'A escalação do RetroFoot: campo, banco e formação na mesma tela', null, 'Tela de formação do RetroFoot com o campo, os titulares e o banco de reservas')}

<h2>Não precisa escolher um só</h2>
<p>Os três são jogos diferentes, de gente diferente, e os dois clássicos seguem com os donos deles — os sites oficiais
estão logo abaixo. Se hoje a sua vontade é abrir uma aba e escalar um time em um minuto, o caminho mais curto é este:</p>

<p><a href="/"><strong>Abrir o RetroFoot e pegar um clube</strong></a> — de graça, no navegador.</p>
`.trim(),
  },

  // ======================= P2: BRASFOOT VS RETROFOOT =======================
  {
    slug: 'brasfoot-vs-retrofoot', ready: true, priority: 0.7, lastmod: '2026-09-21',
    title: 'Brasfoot ou RetroFoot? Comparativo completo (2026)',
    description: 'Brasfoot vs RetroFoot: instalação, plataformas, celular, nomes de jogador, competições brasileiras e atualizações. Um precisa de Windows; o outro abre no navegador e é grátis.',
    h1: 'Brasfoot ou RetroFoot: qual manager jogar hoje?',
    keywords: 'brasfoot vs retrofoot, brasfoot ou retrofoot, brasfoot online, brasfoot no celular, brasfoot sem baixar, alternativa ao brasfoot, retrofoot',
    resumo: [
      'O <strong>Brasfoot</strong> é jogo de <strong>Windows</strong>: baixa, instala e joga naquele computador.',
      'O <strong>RetroFoot</strong> abre no <strong>navegador</strong> — sem baixar, sem instalar, e também no celular.',
      'Os dois têm o forte deles: o Brasfoot, muitas ligas e a comunidade de patches; o RetroFoot, o <strong>Modo Resenha</strong> online com até 10 treinadores.',
      'A última edição oficial do Brasfoot é a <strong>22-23</strong>; o RetroFoot é atualizado continuamente.',
    ],
    refs: [
      { nome:'Brasfoot (site oficial)', desc:'A página oficial, com as edições, o registro e a comunidade de patches.', url:'https://www.brasfoot.com/' },
    ],
    faq: [
      { q:'Dá para jogar Brasfoot no celular?', a:'<p>O Brasfoot é um jogo para <strong>Windows</strong> — o próprio site diz que roda em qualquer computador com Windows. Não há versão de celular. Se o que você procura é um manager para jogar no telefone sem instalar nada, o <a href="/">RetroFoot abre no navegador</a> do celular.</p>' },
      { q:'Dá para jogar Brasfoot online, sem baixar?', a:'<p>Não: ele precisa ser baixado e instalado, e o save fica naquele computador. O <strong>RetroFoot</strong> é o contrário por desenho — roda no navegador, a carreira fica na nuvem, e dá para começar no PC e continuar no celular.</p>' },
      { q:'O Brasfoot ainda é atualizado?', a:'<p>A última edição oficial é a <strong>Brasfoot 22-23</strong>, e o site oficial avisa explicitamente que <em>"não existe uma versão chamada Brasfoot 2026"</em>. A comunidade segue publicando patches de elenco, que é uma das forças históricas do jogo. Vale conferir a situação atual no site oficial, linkado nesta página.</p>' },
      { q:'Qual dos dois tem os nomes reais dos jogadores?', a:'<p>Nenhum dos dois traz os nomes oficiais de fábrica, e o motivo é o mesmo: nome de clube e de atleta é marca registrada. No <strong>Brasfoot</strong> quem resolve isso é a <strong>comunidade de patches</strong>, por fora do jogo, com um editor de nomes próprio. No <strong>RetroFoot</strong> os clubes aparecem pelo <strong>apelido da torcida</strong> (o ABC é o <em>Elefante Potiguar</em>) e os elencos são os reais com nomes fictícios. Vale dizer que nem o Football Manager escapa: por licenciamento, ele mostra os clubes brasileiros como sigla de três letras.</p>' },
      { q:'Qual é melhor para jogar com os amigos?', a:'<p>O <strong>RetroFoot</strong>, e por uma diferença de natureza: o <a href="/jogar-com-amigos/">Modo Resenha</a> põe até <strong>10 treinadores</strong> no mesmo campeonato, cada um no <strong>seu</strong> aparelho, de onde estiver, com a semana fechando só quando o último jogar. Nos clássicos de PC, jogar junto quase sempre quis dizer o mesmo computador.</p>' },
      { q:'Quanto custa cada um?', a:'<p>O Brasfoot é gratuito para jogar, com registro opcional e gratuito que libera recursos — confira as condições da edição atual no site oficial. No RetroFoot, o <strong>Modo Solo</strong> é grátis e sem prazo; o <strong>Modo Resenha</strong> vem liberado por 7 dias ao criar a conta e depois entra nos planos, sendo que <strong>entrar na sala de um amigo nunca custa nada</strong>.</p>' },
      { q:'O RetroFoot tem tantas ligas quanto o Brasfoot?', a:'<p>Não, e é honesto dizer: hoje o clube que você comanda no RetroFoot é <strong>brasileiro</strong>, nas quatro divisões. Muitas ligas jogáveis é justamente o forte do Brasfoot. O que o RetroFoot tem é <strong>mercado mundial</strong> — compra e venda com clubes de fora desde a primeira temporada — e as continentais.</p>' },
    ],
        body: `
<p class="lead">Se você jogou <strong>Brasfoot</strong>, conhece o ritual: baixar, instalar, procurar o patch da
temporada, e jogar naquele computador. O <strong>RetroFoot</strong> nasceu para tirar esse ritual da frente — abre no
navegador e a primeira partida acontece em menos de um minuto. Abaixo, os dois lado a lado, com o que cada um faz
melhor.</p>

<h2>Comparativo, critério por critério</h2>
<table>
  <thead><tr><th>Critério</th><th>Brasfoot</th><th>RetroFoot</th></tr></thead>
  <tbody>
    <tr><td>Precisa instalar?</td><td>Sim — baixa e instala</td><td><strong>Não — abre no navegador</strong></td></tr>
    <tr><td>Tamanho do download</td><td>Instalador de PC (leve, mas é download)</td><td><strong>Nenhum</strong> — é uma página que carrega</td></tr>
    <tr><td>Onde roda</td><td>Windows</td><td><strong>Qualquer navegador atual</strong> — Windows, Mac, Linux, celular, tablet</td></tr>
    <tr><td>Celular</td><td>Não tem versão de celular</td><td><strong>Sim</strong> (o desktop mostra mais recursos de uma vez)</td></tr>
    <tr><td>Onde fica o save</td><td>Naquele computador</td><td><strong>Na nuvem</strong> — troca de aparelho sem perder a carreira</td></tr>
    <tr><td>Um jogador</td><td>Sim</td><td>Sim — <strong>Modo Solo</strong>, grátis e sem prazo</td></tr>
    <tr><td>Vários jogadores</td><td>Historicamente, o mesmo computador</td><td><strong>Modo Resenha: até 10, online, cada um no seu aparelho</strong></td></tr>
    <tr><td>Ligas jogáveis</td><td><strong>Muitas — é o forte dele</strong></td><td>Brasil: Séries A, B, C e D</td></tr>
    <tr><td>Competições brasileiras</td><td>Presentes</td><td>Quatro divisões + Copa do Brasil + Libertadores + Sul-Americana</td></tr>
    <tr><td>Mercado de transferências</td><td>Dentro das ligas do jogo</td><td><strong>Mundial</strong> desde a 1ª temporada, de ida e de volta</td></tr>
    <tr><td>Nomes reais de jogador</td><td>Editor próprio + <strong>patches da comunidade</strong></td><td>Elencos reais com nomes fictícios; clubes pelo apelido</td></tr>
    <tr><td>Estilo e gráficos</td><td>2D, direto, foco em tabela e números</td><td>2D retrô, com partida ao vivo lance a lance</td></tr>
    <tr><td>Atualização oficial</td><td>Última edição: <strong>22-23</strong></td><td><strong>Contínua</strong></td></tr>
    <tr><td>Futebol feminino</td><td>—</td><td><strong>Sim</strong>, mesmos clubes e calendário</td></tr>
    <tr><td>Custo para começar</td><td>Grátis, com registro gratuito opcional</td><td><strong>Modo Solo grátis, sem prazo</strong></td></tr>
  </tbody>
</table>
<p class="nota-dados">Dados do Brasfoot conferidos no site oficial em 21/09/2026. Edição, plataformas e condições
mudam — confirme na fonte antes de decidir.</p>

<h2>A diferença que pesa mais: não precisar instalar</h2>
<p>Parece detalhe e não é. Sem instalação, o jogo funciona no computador do trabalho, no notebook emprestado, no
celular na fila do banco — e continua a mesma carreira, porque o save mora na nuvem e não naquela máquina. Some o
"depois eu baixo", que é onde morre a maior parte da vontade de jogar.</p>
<p>E some também a dependência de sistema operacional: o Brasfoot pede <strong>Windows</strong>. Quem está num Mac, num
Chromebook ou só no telefone não tem por onde entrar.</p>

${fig('formacao', 'A tela do técnico no RetroFoot: escalação, banco, próximo jogo e caixa')}

<h2>A resenha deixou de precisar de uma sala só</h2>
<p>Nos managers de PC, "vários jogadores" quase sempre significou <em>o mesmo teclado, passando de mão em mão</em>: exige
a turma junta, no mesmo horário. O <a href="/jogar-com-amigos/">Modo Resenha</a> resolve isso — cada um entra do próprio
aparelho, o sorteio distribui os clubes com todo mundo assistindo, e a semana só vira quando o último jogar. Ninguém
tem o time simulado pelas costas por ter demorado.</p>

${fig('sala-resenha', 'A sala do Modo Resenha enchendo — cada treinador no seu aparelho')}

<h2>Onde o Brasfoot ganha</h2>
<p>Seria desonesto fingir que não: <strong>ligas jogáveis</strong>. O Brasfoot é a escola da coleção, e sentar num clube
de fora do Brasil é algo que ele faz e o RetroFoot ainda não. E tem um patrimônio que nenhum jogo compra pronto: a
<strong>comunidade de patches</strong>, que mantém elencos em dia por conta própria há anos.</p>
<p>Se o que você quer é colecionar ligas e times do mundo inteiro, ele serve melhor. O comparativo dele com o Football
Manager está em <a href="/brasfoot-vs-football-manager/">Brasfoot vs Football Manager</a>.</p>

<h2>Onde o RetroFoot ganha</h2>
<ul>
  <li><strong>Zero instalação</strong> — abre como qualquer site, em qualquer sistema.</li>
  <li><strong>Multiplayer online de verdade</strong> — até 10 treinadores, cada um no seu aparelho.</li>
  <li><strong>Celular</strong> — a mesma carreira no telefone, com o save na nuvem.</li>
  <li><strong>Mercado mundial</strong> — negocia com clubes de fora desde a primeira temporada.</li>
  <li><strong>Carreira com memória</strong> — troféus, sondagens e <a href="/ranking/">ranking de treinadores</a>.</li>
  <li><strong>Atualização contínua</strong>, sem esperar a edição do ano.</li>
</ul>

${fig('ranking', 'O ranking de treinadores: carreira somada ao peso real de cada título')}

<h2>Sobre os nomes, que é a dúvida mais comum</h2>
<p>Nenhum manager gratuito traz os nomes oficiais de fábrica, porque nome de clube e de atleta é marca registrada. No
Brasfoot, quem preenche essa lacuna é a comunidade de patches. No RetroFoot, os clubes aparecem pelo
<strong>apelido da torcida</strong> — o ABC é o <em>Elefante Potiguar</em> — e os elencos são os reais de cada clube com
nomes fictícios.</p>
<p>E não é só coisa de jogo grátis: o <strong>Football Manager</strong>, que custa quase R$ 300, mostra os clubes
brasileiros como <strong>sigla de três letras</strong> — "GRE" em vez de Grêmio — da Série A até a C, também por
licenciamento. É uma restrição do gênero, não um atalho de quem faz o jogo.</p>

<h2>Em uma frase</h2>
<ul>
  <li><strong>Brasfoot:</strong> a escola da coleção — muitas ligas, patches da comunidade, no seu Windows.</li>
  <li><strong>RetroFoot:</strong> a escola de abrir e jogar — navegador, celular, save na nuvem e a turma na mesma liga.</li>
</ul>

<p><a href="/"><strong>Abrir o RetroFoot e pegar um clube</strong></a> — de graça, sem baixar nada. Ou veja o
<a href="/retrofoot-vs-football-manager/">comparativo com o Football Manager</a>.</p>
`.trim(),
  },
  // ======================= P2: RETROFOOT VS FOOTBALL MANAGER =======================
  {
    slug: 'retrofoot-vs-football-manager', ready: true, priority: 0.7, lastmod: '2026-09-21',
    title: 'RetroFoot vs Football Manager: comparativo honesto (2026)',
    description: 'Football Manager 26 custa US$ 59,99 e pede 20 GB; no celular, só para assinantes Netflix. O RetroFoot abre no navegador, de graça. Comparativo por critério, incluindo onde o FM ganha.',
    h1: 'RetroFoot vs Football Manager: o que cada um entrega',
    keywords: 'retrofoot vs football manager, football manager alternativa gratis, football manager sem baixar, football manager no celular, manager de futebol online gratis, fm26',
    resumo: [
      'O <strong>Football Manager 26</strong> custa <strong>US$ 59,99</strong> e pede <strong>20 GB</strong> de disco.',
      'No celular, o FM26 é <strong>exclusivo para assinantes Netflix</strong> (ou Apple Arcade, na versão Touch).',
      'O <strong>RetroFoot</strong> abre no navegador, sem baixar nada, e o <strong>Modo Solo</strong> é grátis.',
      'O FM ganha em profundidade e em número de ligas — e nem ele escapa do licenciamento: mostra os clubes brasileiros como sigla de três letras.',
    ],
    refs: [
      { nome:'Football Manager (site oficial)', desc:'A página oficial do FM26, com plataformas, preço e edições.', url:'https://www.footballmanager.com/' },
    ],
    faq: [
      { q:'Existe alternativa grátis ao Football Manager?', a:'<p>Existe, e roda sem instalar nada: o <a href="/">RetroFoot</a> abre no navegador e o <strong>Modo Solo</strong> é gratuito, sem prazo. Não é um substituto de profundidade — o FM entrega muito mais camada tática e dezenas de ligas. É outra proposta: começar em um minuto e jogar com a turma de longe.</p>' },
      { q:'Quanto custa o Football Manager 26?', a:'<p><strong>US$ 59,99</strong> nos Estados Unidos ou <strong>£45</strong> no Reino Unido, com desconto de 10% na pré-venda. Está incluído no Xbox Game Pass Ultimate e no PC Game Pass desde o lançamento. Dados conferidos em 21/09/2026 — confirme no site oficial.</p>' },
      { q:'Dá para jogar Football Manager no celular?', a:'<p>Dá, mas com condição: o <strong>FM26 Mobile</strong> é <strong>exclusivo para assinantes da Netflix</strong> no Android e no iOS, e a versão <strong>Touch</strong> vem pelo Apple Arcade. Ou seja, no telefone você depende de uma assinatura de terceiro. O RetroFoot abre no navegador do celular, sem assinatura e sem instalar.</p>' },
      { q:'Quanto espaço o Football Manager ocupa?', a:'<p><strong>20 GB</strong> de espaço livre, tanto no mínimo quanto no recomendado, em Windows e macOS. O RetroFoot não ocupa nada: é uma página que carrega.</p>' },
      { q:'O Football Manager tem os clubes brasileiros com nome real?', a:'<p>Nem ele. Por licenciamento, o FM26 mostra os clubes brasileiros como <strong>sigla de três letras</strong> — "GRE" em vez de Grêmio —, e isso vai da Série A até a C. A comunidade corrige com os chamados <em>real names fix</em>, que só valem em save novo. É a mesma restrição que faz o RetroFoot usar o apelido da torcida: nome de clube é marca registrada.</p>' },
      { q:'Qual é melhor para jogar com amigos?', a:'<p>Depende de como a turma se organiza. O FM tem modo online, com sessão combinada entre os jogadores. O <a href="/jogar-com-amigos/">Modo Resenha</a> do RetroFoot foi desenhado para o caso contrário: <strong>ninguém precisa marcar horário</strong> — cada um joga a sua partida quando puder, e a semana só fecha quando o último jogar.</p>' },
      { q:'Em que o Football Manager é melhor?', a:'<p>Em <strong>profundidade</strong>, e não é pouco: scouting minucioso, tática em camadas, dezenas de ligas jogáveis pelo mundo, motor de partida em 3D, relatório de olheiro, coletiva de imprensa. Se você quer o simulador mais completo do gênero e não se importa em instalar, pagar e aprender, é ele. O RetroFoot não disputa esse terreno.</p>' },
    ],
        body: `
<p class="lead">Esses dois não disputam a mesma coisa, e é melhor dizer isso na primeira linha. O
<strong>Football Manager</strong> é o simulador mais profundo do gênero — e cobra em preço, em disco e em tempo de
aprendizado. O <strong>RetroFoot</strong> aposta no oposto: abrir no navegador e estar em campo em menos de um minuto.
Abaixo, o que cada um entrega, incluindo as linhas em que o FM ganha.</p>

<h2>Comparativo, critério por critério</h2>
<table>
  <thead><tr><th>Critério</th><th>Football Manager 26</th><th>RetroFoot</th></tr></thead>
  <tbody>
    <tr><td>Preço</td><td>US$ 59,99 / £45 (ou Game Pass)</td><td><strong>Modo Solo grátis, sem prazo</strong></td></tr>
    <tr><td>Precisa instalar?</td><td>Sim</td><td><strong>Não — abre no navegador</strong></td></tr>
    <tr><td>Espaço em disco</td><td><strong>20 GB</strong></td><td><strong>Nenhum</strong></td></tr>
    <tr><td>Onde roda</td><td>Windows, macOS, Xbox Series X/S, PS5, Switch</td><td><strong>Qualquer navegador atual</strong>, em qualquer sistema</td></tr>
    <tr><td>Celular</td><td>FM26 Mobile: <strong>só para assinantes Netflix</strong>; Touch via Apple Arcade</td><td><strong>Sim, no navegador</strong> (o desktop mostra mais recursos de uma vez)</td></tr>
    <tr><td>Onde fica o save</td><td>No aparelho / na nuvem da plataforma</td><td><strong>Na nuvem</strong>, ligado à conta</td></tr>
    <tr><td>Um jogador</td><td>Sim, é o foco</td><td>Sim — <strong>Modo Solo</strong></td></tr>
    <tr><td>Vários jogadores</td><td>Modo online, com sessão combinada</td><td><strong>Modo Resenha: até 10, sem marcar horário</strong></td></tr>
    <tr><td>Ligas jogáveis</td><td><strong>Dezenas, pelo mundo</strong></td><td>Brasil: Séries A, B, C e D</td></tr>
    <tr><td>Profundidade tática</td><td><strong>Máxima do gênero</strong></td><td>Média: formação, tática por contexto, ajuste no intervalo</td></tr>
    <tr><td>Gráficos da partida</td><td><strong>Motor 3D</strong></td><td>2D retrô, lance a lance, com Modo Camarote</td></tr>
    <tr><td>Clubes brasileiros</td><td>Sigla de 3 letras por licenciamento ("GRE"); comunidade corrige</td><td>Apelido da torcida ("Elefante Potiguar")</td></tr>
    <tr><td>Nomes reais de jogador</td><td>Licenciados na maior parte das ligas</td><td>Elencos reais com nomes fictícios</td></tr>
    <tr><td>Tempo até a 1ª partida</td><td>Uma tarde, entre baixar e aprender</td><td><strong>Menos de um minuto</strong></td></tr>
    <tr><td>Duração de uma partida</td><td>Longa — é parte do prazer</td><td>~30s no Curto; ~10s no Ultrassônico (plano)</td></tr>
    <tr><td>Atualização oficial</td><td>Edição nova por temporada</td><td><strong>Contínua</strong></td></tr>
    <tr><td>Futebol feminino</td><td>Presente em edições recentes</td><td><strong>Sim</strong>, mesmos clubes e calendário</td></tr>
  </tbody>
</table>
<p class="nota-dados">Preço, plataformas e requisitos do FM26 conferidos no site oficial e na Steam em 21/09/2026 —
confirme na fonte, porque mudam a cada edição.</p>

<h2>Onde o Football Manager ganha, e ganha claro</h2>
<p>Profundidade. O FM tem scouting de verdade, tática em camadas, relatório de olheiro, coletiva de imprensa, dezenas
de ligas jogáveis e um motor de partida em <strong>3D</strong>. Se o seu prazer é passar a tarde ajustando instruções
individuais e lendo relatório de olheiro, nenhum manager de navegador vai substituir isso — e o RetroFoot não tenta.</p>
<p>Também ganha em <strong>abrangência</strong>: sentar num clube da Inglaterra, da Espanha ou do Japão é algo que ele
faz e o RetroFoot ainda não.</p>

<h2>Onde o RetroFoot ganha</h2>
<h3>Não precisa de 20 GB nem de cartão</h3>
<p>O FM26 pede <strong>20 GB</strong> de espaço livre e custa <strong>US$ 59,99</strong>. O RetroFoot é uma página: abre
e joga, e o <strong>Modo Solo</strong> é grátis sem prazo. A barreira entre a vontade de jogar e a primeira rodada é de
um minuto, não de uma tarde.</p>

${fig('formacao', 'A tela do técnico: escalação, banco, próximo jogo e caixa — tudo à vista')}

<h3>No celular, sem depender de assinatura de terceiro</h3>
<p>Essa linha surpreende quem não acompanha: o <strong>FM26 Mobile é exclusivo para assinantes da Netflix</strong> no
Android e no iOS, e a versão Touch vem pelo Apple Arcade. Ou seja, para jogar FM no telefone você precisa de uma
assinatura que não é do jogo. O RetroFoot abre no navegador do celular, com a mesma carreira que você tem no
computador, porque o save mora na nuvem.</p>
<p>Uma ressalva honesta: o jogo <strong>funciona</strong> no telefone, mas a experiência recomendada é o
<strong>desktop</strong> — a tela maior mostra elenco, tabela, finanças e próximo jogo ao mesmo tempo, e é ali que dá
para trabalhar o time com conforto.</p>

<h3>Jogar com a turma sem marcar horário</h3>
<p>O FM tem modo online, mas ele pressupõe sessão combinada. O <a href="/jogar-com-amigos/">Modo Resenha</a> foi
desenhado para a vida real de adulto com trabalho: até <strong>10 treinadores</strong>, cada um joga a sua partida
quando puder, e a semana só fecha quando o último jogar. Ninguém tem o time simulado pelas costas.</p>

${fig('sala-resenha', 'A sala do Modo Resenha enchendo — cada treinador no seu aparelho')}

<h2>O licenciamento não poupa nem quem cobra</h2>
<p>Se você já viu "GRE" no lugar de Grêmio, sabe do que se trata. Por <strong>licenciamento</strong>, o FM26 exibe os
clubes brasileiros como sigla de três letras, da Série A até a C, e a comunidade corrige com os <em>real names fix</em> —
que só valem em save novo.</p>
<p>É exatamente a mesma restrição que faz o RetroFoot usar o <strong>apelido da torcida</strong> (o ABC é o
<em>Elefante Potiguar</em>) e nomes fictícios de jogador sobre os elencos reais. Nome de clube e de atleta é marca
registrada, e isso vale para o jogo grátis e para o de US$ 59,99.</p>

<h2>Como escolher, em duas perguntas</h2>
<ol>
  <li><strong>Quanto tempo você quer gastar antes da primeira partida?</strong> Uma tarde → Football Manager. Um minuto → RetroFoot.</li>
  <li><strong>A sua turma consegue marcar horário?</strong> Se sim, qualquer um serve. Se cada um joga quando dá, o Modo Resenha resolve.</li>
</ol>

<p><a href="/"><strong>Testar o RetroFoot agora</strong></a> — grátis, no navegador. Ou compare com o
<a href="/brasfoot-vs-retrofoot/">Brasfoot</a>.</p>
`.trim(),
  },
  // ======================= P2: BRASFOOT VS FOOTBALL MANAGER =======================
  {
    slug: 'brasfoot-vs-football-manager', ready: true, priority: 0.6, lastmod: '2026-09-21',
    title: 'Brasfoot vs Football Manager: qual escolher em 2026?',
    description: 'Brasfoot é grátis e leve, só para Windows; Football Manager 26 custa US$ 59,99 e pede 20 GB. Comparativo por critério — e a terceira opção que roda no navegador, sem instalar.',
    h1: 'Brasfoot vs Football Manager: leve e grátis, ou profundo e pago?',
    keywords: 'brasfoot vs football manager, brasfoot ou football manager, football manager gratis, manager de futebol leve, brasfoot football manager diferenca',
    resumo: [
      'O <strong>Brasfoot</strong> é grátis, leve e roda em <strong>Windows</strong>; a última edição oficial é a <strong>22-23</strong>.',
      'O <strong>Football Manager 26</strong> custa <strong>US$ 59,99</strong>, pede <strong>20 GB</strong> e tem o motor mais profundo do gênero.',
      'Os dois precisam de <strong>instalação</strong>, e os dois dependem da comunidade para os nomes brasileiros.',
      'Há uma terceira via: o <strong>RetroFoot</strong> roda no navegador, sem baixar nada, com Modo Solo grátis.',
    ],
    refs: [
      { nome:'Brasfoot (site oficial)', desc:'A página oficial, com as edições, o registro e a comunidade de patches.', url:'https://www.brasfoot.com/' },
      { nome:'Football Manager (site oficial)', desc:'A página oficial do FM26, com plataformas, preço e edições.', url:'https://www.footballmanager.com/' },
    ],
    faq: [
      { q:'Qual é mais leve: Brasfoot ou Football Manager?', a:'<p>O <strong>Brasfoot</strong>, com folga. Ele é um programa de PC enxuto, enquanto o <strong>Football Manager 26</strong> pede <strong>20 GB</strong> de espaço livre. Se o critério é máquina modesta, o Brasfoot leva — e quem não quer instalar nada tem o <a href="/">RetroFoot</a>, que roda no navegador.</p>' },
      { q:'O Football Manager vale o preço se eu jogo Brasfoot?', a:'<p>Depende do que você procura. O FM26 (<strong>US$ 59,99</strong>) entrega profundidade que o Brasfoot não tenta: scouting minucioso, tática em camadas, dezenas de ligas e motor de partida em 3D. Se o seu prazer é a partida rápida e a tabela, o Brasfoot já resolve — e de graça.</p>' },
      { q:'Os dois rodam no celular?', a:'<p>O <strong>Brasfoot</strong> não tem versão de celular: é jogo de Windows. O <strong>FM26 Mobile</strong> existe no Android e no iOS, mas é <strong>exclusivo para assinantes da Netflix</strong> (a versão Touch vem pelo Apple Arcade). Para jogar no telefone sem instalar e sem assinatura de terceiro, o caminho é um manager de navegador.</p>' },
      { q:'Qual tem os clubes brasileiros com nome real?', a:'<p>Nenhum dos dois de fábrica, e o motivo é o mesmo: licenciamento. No <strong>FM26</strong> os clubes brasileiros aparecem como <strong>sigla de três letras</strong> — "GRE" em vez de Grêmio — da Série A até a C. No <strong>Brasfoot</strong> há editor próprio e uma forte <strong>comunidade de patches</strong>. Em ambos, quem resolve na prática é a comunidade.</p>' },
      { q:'O Brasfoot ainda recebe edição nova?', a:'<p>A última edição oficial é a <strong>Brasfoot 22-23</strong>, e o site oficial avisa que <em>"não existe uma versão chamada Brasfoot 2026"</em>. O Football Manager, por comparação, lança edição por temporada — o FM26 saiu em novembro de 2025. Confirme a situação atual nos dois sites oficiais, linkados aqui.</p>' },
      { q:'Existe opção sem instalar nada?', a:'<p>Existe: o <strong>RetroFoot</strong> abre no navegador, no computador ou no celular, com o <strong>Modo Solo</strong> grátis e sem prazo, e um <a href="/jogar-com-amigos/">Modo Resenha</a> com até 10 treinadores online. Em troca, hoje só o Brasil é jogável — nesse ponto os dois desta página entregam mais ligas.</p>' },
    ],
        body: `
<p class="lead">É a comparação entre dois extremos do gênero. O <strong>Brasfoot</strong> é leve, gratuito e direto; o
<strong>Football Manager</strong> é o simulador mais profundo que existe, e cobra por isso em dinheiro, disco e tempo.
Os dois, porém, têm uma coisa em comum que vale notar: <strong>precisam ser instalados</strong>.</p>

<h2>Comparativo, critério por critério</h2>
<table>
  <thead><tr><th>Critério</th><th>Brasfoot</th><th>Football Manager 26</th></tr></thead>
  <tbody>
    <tr><td>Preço</td><td><strong>Grátis</strong>, com registro gratuito opcional</td><td>US$ 59,99 / £45 (ou Game Pass)</td></tr>
    <tr><td>Precisa instalar?</td><td>Sim</td><td>Sim</td></tr>
    <tr><td>Espaço em disco</td><td><strong>Leve</strong> — programa de PC enxuto</td><td>20 GB</td></tr>
    <tr><td>Onde roda</td><td>Windows</td><td><strong>Windows, macOS, Xbox Series X/S, PS5, Switch</strong></td></tr>
    <tr><td>Celular</td><td>Não tem</td><td>FM26 Mobile: só para assinantes Netflix; Touch via Apple Arcade</td></tr>
    <tr><td>Ligas jogáveis</td><td><strong>Muitas</strong> — é o forte dele</td><td><strong>Dezenas, pelo mundo</strong></td></tr>
    <tr><td>Profundidade tática</td><td>Média — partida rápida, foco em tabela</td><td><strong>Máxima do gênero</strong></td></tr>
    <tr><td>Gráficos da partida</td><td>2D, direto</td><td><strong>Motor 3D</strong></td></tr>
    <tr><td>Clubes brasileiros</td><td>Editor próprio + patches da comunidade</td><td>Sigla de 3 letras por licenciamento; comunidade corrige</td></tr>
    <tr><td>Tempo até a 1ª partida</td><td>Minutos, depois de instalar</td><td>Uma tarde, entre baixar e aprender</td></tr>
    <tr><td>Atualização oficial</td><td>Última edição: <strong>22-23</strong></td><td><strong>Edição por temporada</strong> (FM26 em nov/2025)</td></tr>
    <tr><td>Vários jogadores</td><td>Historicamente, o mesmo computador</td><td>Modo online, com sessão combinada</td></tr>
  </tbody>
</table>
<p class="nota-dados">Dados conferidos nos sites oficiais e na Steam em 21/09/2026. Preço, plataformas, edição e
requisitos mudam — confirme na fonte.</p>

<h2>Escolha o Brasfoot se…</h2>
<ul>
  <li>Você quer <strong>gastar zero</strong> e tem um Windows à mão.</li>
  <li>A máquina é modesta e 20 GB não é opção.</li>
  <li>Você gosta de <strong>colecionar ligas</strong> e de mexer com patches da comunidade.</li>
  <li>O seu prazer é a partida rápida e a tabela, não o relatório de olheiro.</li>
</ul>

<h2>Escolha o Football Manager se…</h2>
<ul>
  <li>Você quer o <strong>simulador mais completo</strong> do gênero, e topa pagar por isso.</li>
  <li>Curte scouting, tática em camadas e <strong>motor de partida em 3D</strong>.</li>
  <li>Quer sentar num clube de qualquer lugar do mundo.</li>
  <li>Tem uma tarde para aprender a tela — e outras tantas para jogar.</li>
</ul>

<h2>A terceira via: não instalar nada</h2>
<p>Há uma coisa que os dois pedem e que nem todo mundo pode dar: <strong>instalação</strong>. Um exige Windows; o outro,
20 GB de disco. Quem está num Mac, num Chromebook, no computador do trabalho ou só com o celular na mão fica sem porta
de entrada em ambos.</p>
<p>É aí que entra o <strong>RetroFoot</strong>: abre no navegador, como qualquer site, e a primeira partida acontece em
menos de um minuto. O <strong>Modo Solo</strong> é grátis e sem prazo, a carreira fica na nuvem, e dá para começar no
computador e continuar no telefone.</p>

${fig('formacao', 'A tela do técnico no RetroFoot: escalação, banco, próximo jogo e caixa')}

<p>E o que ele tem que nenhum dos dois faz do mesmo jeito: o <a href="/jogar-com-amigos/">Modo Resenha</a>, com até
<strong>10 treinadores</strong> no mesmo campeonato, cada um no seu aparelho, <strong>sem precisar marcar horário</strong>
— a semana só fecha quando o último jogar.</p>

${fig('sala-resenha', 'A sala do Modo Resenha enchendo — cada treinador no seu aparelho')}

<p>Em troca, é justo dizer onde ele perde para os dois desta página: hoje o clube que você comanda no RetroFoot é
<strong>brasileiro</strong>, nas quatro divisões. Colecionar ligas do mundo é terreno deles.</p>

<h2>Sobre os nomes brasileiros, que atinge os três</h2>
<p>Vale registrar, porque é a dúvida que mais aparece: <strong>nenhum</strong> dos três traz os nomes oficiais de
fábrica. O FM26 mostra os clubes brasileiros como sigla de três letras por licenciamento; o Brasfoot tem editor próprio
e vive de patches; o RetroFoot usa o <strong>apelido da torcida</strong> sobre os elencos reais. Nome de clube e de
atleta é marca registrada — a diferença está em quem preenche a lacuna, não em quem tem a licença.</p>

<h2>Em uma frase cada</h2>
<ul>
  <li><strong>Brasfoot:</strong> grátis, leve e cheio de ligas — se você tem Windows.</li>
  <li><strong>Football Manager:</strong> o mais profundo que existe — se você tem 20 GB, US$ 59,99 e uma tarde.</li>
  <li><strong>RetroFoot:</strong> abre e joga, no navegador ou no celular, com a turma na mesma liga.</li>
</ul>

<p><a href="/"><strong>Abrir o RetroFoot</strong></a> — sem baixar, sem instalar, Modo Solo de graça. Comparativos
diretos: <a href="/brasfoot-vs-retrofoot/">Brasfoot vs RetroFoot</a> ·
<a href="/retrofoot-vs-football-manager/">RetroFoot vs Football Manager</a> ·
<a href="/elifoot-vs-brasfoot/">Elifoot vs Brasfoot</a>.</p>
`.trim(),
  },

  // ======================= GUIA / DOCUMENTAÇÃO =======================
  {
    slug: 'guia', ready: true, priority: 0.8, lastmod: '2026-09-20',
    title: 'Guia do RetroFoot: como jogar, táticas e como subir de divisão',
    description: 'O guia do técnico no RetroFoot: como escalar, que formação usar em cada situação, como fazer dinheiro no mercado, quando ampliar o estádio e como subir de série.',
    h1: 'Guia do técnico: como jogar e vencer no RetroFoot',
    keywords: 'como jogar retrofoot, melhores taticas, melhores formações, dicas, como subir de divisão, como fazer dinheiro, ampliar estadio, guia do treinador',
    resumo: [
      'Escale pensando em <strong>força e energia</strong>: jogador cansado rende menos.',
      'O <strong>mercado</strong> é onde se ganha dinheiro — e ele é mundial desde a primeira temporada.',
      'Ajuste a <strong>formação</strong> ao jogo: um meio-campista a mais segura partida fora de casa.',
      'Suba de divisão com o caixa no azul: folha alta derruba clube pequeno.',
    ],
    faq: [
      { q:'Qual a melhor formação no RetroFoot?', a:'<p>Não existe uma só. Contra times fortes e fora de casa, um meio-campo mais povoado (4-5-1 ou 4-4-2) segura melhor; em casa e contra adversários mais fracos, 4-3-3 e 3-4-3 criam mais. A escolha certa é a que responde ao jogo daquele dia.</p>' },
      { q:'Como ganhar dinheiro no jogo?', a:'<p>Venda quem já chegou ao teto e aposte em jovens com espaço para evoluir — o valor de mercado é vivo e se move com força, idade, potencial, comportamento e momento. Fique de olho no leilão, venda para o exterior quando a proposta for boa, e não deixe a folha passar do que a bilheteria sustenta.</p>' },
      { q:'O que é a energia do jogador?', a:'<p>É o quanto ele tem de gás para a próxima partida. Abaixo de 70% o rendimento cai — dá para usar "Selecionar descansados" e escalar priorizando quem está inteiro.</p>' },
      { q:'Dá para contratar jogador de fora do Brasil?', a:'<p>Dá, desde a primeira temporada: o mercado é mundial, de ida e de volta. Vender bem para o exterior costuma ser o atalho que arruma o caixa de um clube pequeno.</p>' },
      { q:'Quantas carreiras posso começar?', a:'<p>No <strong>Peladeiro</strong> (grátis), até <strong>3 por mês</strong>; no plano <strong>Resenha</strong>, até 10; no <strong>Embaixador</strong>, sem cota. A conta é de carreiras <em>começadas</em> no mês — apagar uma que acabou não devolve a vaga, então vale pensar antes de abrir uma carreira só para testar.</p>' },
      { q:'Perco o meu save se trocar de aparelho?', a:'<p>Não. A carreira fica na nuvem, ligada à sua conta: dá para começar no computador, continuar no celular e voltar, sempre no mesmo ponto.</p>' },
      { q:'Dá para acelerar a partida?', a:'<p>Dá. Os ritmos <strong>Curto, Médio e Longo</strong> estão disponíveis para todo mundo, e o Curto resolve um jogo em pouco mais de meio minuto. Quem assina tem o <strong>Ultrassônico</strong>, de cerca de dez segundos por partida — útil para atravessar temporadas sem abrir mão de ver o jogo.</p>' },
    ],
        body: `
<p class="lead">O RetroFoot recompensa <strong>decisão</strong>, não sorte. Não existe fórmula que ganha sozinha, mas
existem escolhas que aumentam muito as suas chances — e é disso que este guia trata: os princípios do jogo, sem revelar
as contas do motor.</p>

<h2>A escalação: força, energia e função</h2>
<p>Três coisas decidem quem entra. A <strong>força</strong> do jogador para a posição, a <strong>energia</strong> com que
ele chega ao jogo (abaixo de 70% o rendimento cai) e a <strong>moral</strong>, que sobe com vitória e título e desce com
sequência ruim. Um titular cansado costuma render menos que um reserva inteiro — e o botão "Selecionar descansados"
existe justamente para essa conta.</p>

${fig('formacao', 'A escalação: arraste o jogador para a posição e feche a formação')}

<h2>Formação: a melhor é a do dia</h2>
<p>Não existe tática fixa que resolva a temporada. O que funciona é ler o contexto:</p>
<ul>
  <li><strong>Fora de casa, contra time mais forte:</strong> povoe o meio e a defesa, saia rápido. 4-5-1 e 4-4-2 seguram melhor.</li>
  <li><strong>Em casa, precisando do resultado:</strong> ouse no ataque — 4-3-3 e 3-4-3 criam mais —, sem se expor ao contra-ataque.</li>
  <li><strong>Segurando vantagem no fim:</strong> proteja o meio-campo e gaste substituição para dar fôlego.</li>
  <li><strong>Elenco curto ou cansado:</strong> formação mais compacta poupa energia e reduz risco de lesão e cartão.</li>
</ul>
<p>E dá para corrigir no meio: no <strong>intervalo</strong> você troca peça e muda o esquema, com o placar já na sua frente.</p>

${fig('substituicao', 'No intervalo dá para trocar peça e ajustar o esquema com o placar à vista')}

<h2>Mercado: é aqui que se faz dinheiro</h2>
<p>O valor de um jogador é <strong>vivo</strong> — se move com a força dele, a idade, o potencial, o comportamento e o
momento. Quem lê isso bem transforma elenco em caixa:</p>
<ul>
  <li><strong>Compre barato quem ainda tem para onde crescer</strong> e venda quem já chegou ao teto.</li>
  <li><strong>Olhe as propostas recebidas:</strong> às vezes vale vender um titular por um valor alto e voltar com duas peças.</li>
  <li><strong>Use o leilão:</strong> quando mais de um clube quer o mesmo jogador, quem decide é o lance — e dá para vender assim também.</li>
  <li><strong>Negocie com o mundo:</strong> o mercado é mundial desde a primeira temporada, e clube de fora costuma pagar melhor.</li>
  <li><strong>Respeite a janela</strong> e não desmonte o time: elenco fraco derruba resultado, e resultado ruim derruba bilheteria.</li>
</ul>

${fig('leilao', 'O leilão: quando mais de um clube quer o mesmo jogador, decide o lance')}

<h2>Base e treino especial: reforço que não custa passe</h2>
<p>A <strong>base</strong> é a fonte mais barata de elenco que existe: garoto promovido não custa transferência. E o
<strong>treino especial</strong> serve para trabalhar quem tem potencial e ainda não chegou lá. Para clube de Série C ou
D, essa costuma ser a diferença entre completar o elenco e não completar.</p>

${fig('base', 'A base: quem já dá para subir, e quem precisa de mais uma temporada')}

<h2>Estádio: ampliar na hora certa</h2>
<p>Bilheteria é receita recorrente, então ampliar é bom — mas é gastar agora para receber depois. A regra prática:
amplie quando você <strong>já estiver enchendo o que tem</strong> e o caixa aguentar a obra sem sufocar a folha. Crescer
junto com a torcida, subindo de divisão, costuma ser mais seguro do que apostar tudo de uma vez.</p>

${fig('estadio', 'Ampliar o estádio é decisão de caixa: mais bilheteria depois, menos dinheiro agora')}

<h2>Copas também pagam</h2>
<p>Não jogue a copa como se fosse peso. A <strong>Copa do Brasil</strong> paga por fase disputada, tem bilheteria
própria, e as <strong>continentais</strong> pagam ao fim da campanha. Para clube pequeno, uma campanha boa de copa
financia a temporada inteira — além de valer muito no <a href="/ranking/">ranking de treinadores</a>.</p>

<h2>Como subir de divisão</h2>
<ul>
  <li><strong>Profundidade antes de luxo:</strong> garanta duas opções por posição antes de buscar estrela.</li>
  <li><strong>Caixa no azul:</strong> dívida trava o mercado; o contador do clube avisa quando o buraco está crescendo.</li>
  <li><strong>Constância vale mais que goleada:</strong> pontuar sempre sobe a tabela; golear uma vez não.</li>
  <li><strong>Suba com estrutura:</strong> chegar na divisão de cima com elenco curto é o caminho mais rápido de voltar.</li>
</ul>

${fig('classificacao', 'A tabela da divisão: acesso em cima, rebaixamento embaixo')}

<h2>O jogo continua mudando</h2>
<p>O equilíbrio do RetroFoot é medido e ajustado com o tempo, para que boas decisões sejam recompensadas e nenhuma
escolha vire atalho garantido. Se você achar algo desequilibrado, a caixa de opinião dentro do jogo é o caminho mais
curto até quem mexe no motor.</p>

<p><a href="/"><strong>Assuma um clube e comece a subir</strong></a> — ou veja como funciona o
<a href="/ranking/">ranking de treinadores</a>.</p>
`.trim(),
  },

  // ======================= RANKING (descritiva — sem PII) =======================
  {
    slug: 'ranking', ready: true, priority: 0.7, lastmod: '2026-09-20',
    title: 'Ranking de treinadores do RetroFoot: como os pontos são contados',
    description: 'Como funciona o ranking de treinadores do RetroFoot: pontos de carreira somados ao peso real de cada título — uma Libertadores vale muito mais que um acesso na Série D.',
    h1: 'Ranking de treinadores: como os pontos são contados',
    keywords: 'ranking retrofoot, ranking de treinadores, melhores treinadores, pontos de carreira, sala de trofeus',
    resumo: [
      'A pontuação soma os <strong>pontos de carreira</strong> de todas as temporadas com o <strong>peso dos títulos</strong>.',
      'Cada taça vale o que a competição vale: <strong>Libertadores 20</strong>, Série A 15, Copa do Brasil 12, Série D 0,5.',
      'Título pesa muito mais que campanha — mas regularidade continua subindo degraus.',
      'O aproveitamento aparece na tabela e é <strong>informativo</strong>: quem tem menos jogos não sobe por isso.',
    ],
    faq: [
      { q:'Como funcionam os pontos do ranking?', a:'<p>São duas moedas somadas: os <strong>pontos que você fez em campo</strong> ao longo de toda a carreira (todas as temporadas mais a atual) e o <strong>peso dos títulos</strong> conquistados. O peso do título entra multiplicado, então uma taça mexe bem mais no ranking do que uma boa campanha.</p>' },
      { q:'Todos os títulos valem a mesma coisa?', a:'<p>Não, e é de propósito. Cada competição tem o seu peso: <strong>Libertadores 20</strong>, <strong>Série A 15</strong>, <strong>Copa do Brasil 12</strong>, <strong>Sul-Americana 10</strong>, <strong>Série B 3</strong>, <strong>Série C 1</strong> e <strong>Série D 0,5</strong>. Ganhar a Série D é uma conquista, mas não é uma Libertadores.</p>' },
      { q:'O ranking zera todo ano?', a:'<p>Não. A temporada fecha e é premiada, mas o seu histórico de carreira continua — ele é o retrato de tudo o que você já fez, clube a clube, temporada a temporada.</p>' },
      { q:'Por que quem joga mais aparece na frente?', a:'<p>Porque metade da pontuação são pontos feitos em campo, e eles se acumulam. O <strong>aproveitamento</strong> aparece na tabela para você comparar rendimento, mas ele não empurra ninguém para cima: quem jogou pouco não sobe por ter um percentual alto.</p>' },
      { q:'Ganhar a Série D conta pouco mesmo?', a:'<p>Conta 0,5 contra os 20 de uma Libertadores — mas isso é só o ranking. O acesso continua mudando a sua carreira de verdade: sobe a receita, sobe o nível do elenco que aceita jogar no clube, sobe a sua segurança no cargo, e abre a porta para as taças que pesam.</p>' },
      { q:'O ranking conta o Modo Solo e o Modo Resenha?', a:'<p>A sua carreira de treinador acumula nos dois modos: as temporadas jogadas e as taças conquistadas entram no seu histórico e na sua sala de troféus. A disputa fica mais interessante no <a href="/jogar-com-amigos/">Modo Resenha</a>, onde a turma inteira está na mesma régua.</p>' },
    ],
        body: `
<p class="lead">Toda boa resenha tem um pódio. No RetroFoot existe um <strong>ranking de treinadores</strong> que mede
carreira, e não temporada solta: ele soma o que você fez em campo ao longo de todas as temporadas e acrescenta o peso
das taças que você levantou.</p>

<h2>A conta, sem mistério</h2>
<p>São duas moedas na mesma balança:</p>
<ul>
  <li><strong>Pontos de campanha</strong> — os pontos que os seus times somaram, de todas as temporadas mais a atual.</li>
  <li><strong>Peso dos títulos</strong> — cada taça vale o que a competição vale, e entra com multiplicador.</li>
</ul>
<p>O efeito prático é o que se espera de um ranking de treinador: <strong>ganhar pesa mais do que somar</strong>, mas
quem faz campanha consistente temporada após temporada continua subindo degraus.</p>

${fig('ranking', 'O ranking: pontos de carreira somados ao peso real de cada título')}

<h2>Quanto vale cada taça</h2>
<table>
  <thead><tr><th>Competição</th><th>Peso do título</th></tr></thead>
  <tbody>
    <tr><td>Libertadores</td><td>20</td></tr>
    <tr><td>Série A</td><td>15</td></tr>
    <tr><td>Copa do Brasil</td><td>12</td></tr>
    <tr><td>Sul-Americana</td><td>10</td></tr>
    <tr><td>Série B</td><td>3</td></tr>
    <tr><td>Série C</td><td>1</td></tr>
    <tr><td>Série D</td><td>0,5</td></tr>
  </tbody>
</table>
<p>É por isso que o ranking não recompensa quem fica colecionando acesso na base da pirâmide: subir da Série D é bonito,
mas o que separa o topo é taça grande.</p>

<h2>O aproveitamento é informação, não atalho</h2>
<p>A tabela mostra o seu aproveitamento — a proporção de pontos que você fez em relação ao que era possível. Ele serve
para você comparar rendimento entre treinadores, mas <strong>não empurra ninguém para cima</strong>: quem tem poucos
jogos não sobe no ranking por ter um percentual alto. Carreira se mede em temporadas.</p>

<h2>A sala de troféus e a história da carreira</h2>
<p>Cada taça conquistada entra na sua <strong>sala de troféus</strong>, e cada temporada vira uma linha no histórico da
carreira — clube, divisão, campanha, o que aconteceu. É o currículo que os clubes olham: ir bem abre
<strong>sondagens</strong> de times maiores, e a segurança no seu cargo sobe quando você ganha.</p>

${fig('trofeus', 'A sala de troféus: o que você já levantou, taça a taça')}

<h2>Começar a somar</h2>
<p>Todo treinador de topo começou pegando um clube lá embaixo. Escolha a sua divisão, receba o seu clube no sorteio e
comece a construir a carreira — o <a href="/guia/">guia do técnico</a> ajuda a acelerar, e o
<a href="/jogar-com-amigos/">Modo Resenha</a> é onde a disputa com a turma fica interessante de verdade.</p>

<p><a href="/"><strong>Começar a minha carreira de treinador</strong></a> — é de graça no Modo Solo.</p>
`.trim(),
  },
];
