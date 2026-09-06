// ============================================================================
// MEDIA KIT — /media-kit/
// ----------------------------------------------------------------------------
// Portado do handoff design_handoff_media_kit (05/09/2026): os dois artboards
// .dc.html (desktop de 1180px e telefone de 390px), o LEIA-ME e os prompts que
// vieram com eles. Texto verbatim do desenho; os tokens sao os de la'.
//
// SO' O MIOLO. O cabecalho e o rodape do site continuam os mesmos e nao sao
// tocados — e' o que o handoff pede. Por isso a pagina traz soMiolo, que ao
// gerador quer dizer: mantem a casca, corta a mobilia de artigo (a migalha, o
// H1 automatico, o indice, o resumo, o FAQ, a barra de "jogar"). O H1 desta
// pagina vive dentro do desenho, no hero.
//
// UMA IMPLEMENTACAO, DOIS TAMANHOS. Nao ha' duas paginas: o artboard de
// telefone e' o mesmo conteudo noutra medida, entao ele virou os @media daqui.
// Os cortes de 900px sao os que o proprio ficheiro de desktop ja' trazia; os de
// 560px sao o prompt do mobile (padding 16, seccoes 32, botao de largura
// inteira, h1 32/h2 26, as duas capturas do topo lado a lado, e a tabela sem as
// colunas de impressoes e CPM — a impressao desce para a linha de apoio).
//
// DOIS ESTADOS NA MESMA ROTA: o kit e, depois do envio, a tabela de precos.
// O lead e' gravado ANTES de a tabela aparecer; se o envio falhar, o formulario
// fica preenchido e o erro aparece — como o prompt pede.
//
// O PORTAO E' DE VIDRO, e e' preciso dizer: a pagina e' estatica, entao a
// tabela de precos viaja no HTML e quem abrir o codigo-fonte le' os valores sem
// preencher nada. Para um portao a serio o preco teria de vir de uma edge
// function depois do lead gravado. Como o objetivo aqui e' captar contato e nao
// esconder preco, ficou o comportamento do prototipo.
//
// AS IMPRESSOES SAO PROJECAO, NAO MEDICAO — esta' escrito na propria tabela, e
// o LEIA-ME manda trocar pelos numeros reais do painel. Os valores recalculam-se
// mantendo o CPM unico de R$ 4,17 e o total de R$ 5.000.
// ============================================================================

const CONTATO = 'suporte@retrofoot.com.br';
/* O WHATSAPP COMERCIAL. So' digitos e com o codigo do pais, que e' o formato que o wa.me pede:
   +1 647 862 3292 -> 16478623292. Um numero do Canada, o mesmo que ja' estava no PDF do media
   kit (ver docs/media-kit/LEIA-ME.md).
   Vazio aqui, o botao NAO fica morto nem aponta para uma conversa que nao existe: vira o
   contato por e-mail. E' a mesma regra do resto do site — nada de botao que nao leva a lado
   nenhum. */
const WHATSAPP = '16478623292';
const VALIDADE = '31 de dezembro de 2026';

/* ---- peças ------------------------------------------------------------- */

const rotulo = t => `<span class="mk-rot">${t}</span>`;
const mono = (r, v) => `<span class="mk-med"><span class="mk-med-r">${r}</span><b class="mk-med-v">${v}</b></span>`;
const caixa = (r, v) => `<span class="mk-cx">${mono(r, v)}</span>`;
const tick = t => `<div class="mk-tk"><span aria-hidden="true">✓</span><span>${t}</span></div>`;
const bullet = (ic, forte, resto) =>
  `<div class="mk-bl"><span class="mk-bl-i" aria-hidden="true">${ic}</span><span><b>${forte}</b> — ${resto}</span></div>`;

const btn = (texto, cls, alvo) =>
  `<button type="button" class="mk-b ${cls}" data-mk-ir="${alvo}">${texto}</button>`;

/* cabeçalho azul de cartão — leva sempre a barra amarela na borda esquerda */
const capa = (titulo, direita) => `<div class="mk-capa">
  <span class="mk-capa-t">${titulo}</span>
  ${direita ? `<span class="mk-capa-d">${direita}</span>` : ''}
</div>`;

/* A CAPTURA DO HERO NAO E' LAZY. Ela e' o maior elemento da primeira dobra — e' o LCP da
   pagina —, e adiar o pedido dela e' adiar a unica coisa que o visitante veio ver. As de baixo
   continuam lazy, que e' onde o lazy serve para alguma coisa. */
const shot = (arq, alt, w, h, urgente) =>
  `<img class="mk-img" src="/img/mediakit/${arq}" alt="${alt}" width="${w}" height="${h}" ${
    urgente ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;

/* ---- a tabela de mídia -------------------------------------------------- */
/* ===== A TABELA E' DE PRECO, NAO DE AUDIENCIA (05/09/2026) =====
   Esta coluna ja' teve dois estados errados e agora nao tem nenhum. Primeiro trazia impressoes
   escritas a mao ("420.000/mes") que eram projecao e estavam ~60x acima do que o jogo regista.
   Depois passou a ler a medicao real (elifoot_v3.rf_ad_audiencia): honesto, mas com a base
   ainda pequena o numero ao lado do preco dizia por si uma coisa que nao interessa dizer a um
   anunciante nesta fase.
   Decisao do dono: a metrica SAI da pagina por enquanto e vende-se por valor mensal. Audiencia
   e' conversa com o comercial.
   A MEDICAO CONTINUA A CORRER — o que saiu foi a publicacao dela. rf_ad_audiencia() esta' de
   pe' e ad_events regista todos os espacos (inclusive os nao vendidos, desde 05/09). Quando a
   base crescer, repor a coluna e' voltar a chamar a RPC. */
const LINHAS = [
  ['Leaderboard de topo — Centroavante', 'Leaderboard de topo',      '970×90 · 320×100 · páginas principais', 'R$ 1.750'],
  ['Vitrine da barra lateral — Volante', 'Vitrine da barra lateral', '300×300 · áreas centrais',              'R$ 915'],
  ['Skyscraper esquerdo',                'Skyscraper esquerdo',      '160×600 · partida ao vivo',             'R$ 625'],
  ['Skyscraper direito',                 'Skyscraper direito',       '160×600 · partida ao vivo',             'R$ 395'],
  ['Placas — linha de fundo',            'Placas — linha de fundo',  '340×44 · 3 placas · 6 aparições',       'R$ 540'],
  ['Placas — corredor do gramado',       'Placas — corredor',        '40×384 · 3 placas · 6 aparições',       'R$ 540'],
  ['Modo Resenha — cota exclusiva',      'Modo Resenha — cota',      '1 marca por temporada',                 'R$ 235'],
];

const linhaTabela = ([nome, curto, apoio, valor], i) =>
  `<div class="mk-tl${i % 2 === 0 ? ' zebra' : ''}">
    <span class="mk-tl-id">
      <span class="mk-tl-n"><span class="mk-so-desk">${nome}</span><span class="mk-so-mob">${curto}</span></span>
      <span class="mk-tl-a">${apoio}</span>
    </span>
    <span class="mk-tl-v">${valor}</span>
  </div>`;

const pacote = (nome, desc, preco, de, off, destaque) =>
  `<div class="mk-pac${destaque ? ' azul' : ''}">
    <span class="mk-pac-n">${nome}</span>
    <span class="mk-pac-d">${desc}</span>
    <div class="mk-pac-p"><b>${preco}</b><s>${de}</s><span class="mk-off">−${off}%</span></div>
  </div>`;

/* ---- formulário --------------------------------------------------------- */
const campo = (id, etiqueta, obrig, dentro) => `<label class="mk-lb" for="${id}">
  <span class="mk-lb-t">${etiqueta}${obrig ? ' <i>*</i>' : ''}</span>${dentro}</label>`;

const opcoes = lista => lista.map(o => `<option>${o}</option>`).join('');

const formulario = `<div class="mk-form-cx">
  ${capa('✉ Fale com a gente')}
  <form class="mk-form" id="mk-form" novalidate>
    <span class="mk-form-sub">Preencha os dados abaixo e entraremos em contato.</span>
    <div class="mk-form-g">
      ${campo('mk-empresa', 'Nome da empresa', true,
        `<input class="mk-in" id="mk-empresa" name="empresa" type="text" autocomplete="organization" placeholder="Digite o nome da sua empresa" required>`)}
      ${campo('mk-contato', 'Nome do contato', false,
        `<input class="mk-in" id="mk-contato" name="contato" type="text" autocomplete="name" placeholder="Com quem falamos?">`)}
      ${campo('mk-email', 'E-mail', true,
        `<input class="mk-in" id="mk-email" name="email" type="email" autocomplete="email" placeholder="Digite o seu melhor e-mail" required>`)}
      ${campo('mk-tel', 'Telefone / WhatsApp', false,
        `<input class="mk-in" id="mk-tel" name="telefone" type="tel" autocomplete="tel" placeholder="(00) 00000-0000">`)}
      ${campo('mk-formato', 'Formato de interesse', false,
        `<select class="mk-in" id="mk-formato" name="formato">${opcoes(['Selecione o formato',
          'Leaderboard de topo — Centroavante', 'Skyscraper esquerdo', 'Skyscraper direito',
          'Domínio das laterais (esquerda + direita)', 'Placas — linha de fundo',
          'Placas — corredor do gramado', 'Placas — takeover completo',
          'Vitrine da barra lateral — Volante', 'Modo Resenha — cota exclusiva',
          'Inventário completo', 'Ainda não sei — quero conhecer tudo'])}</select>`)}
      ${campo('mk-verba', 'Orçamento previsto', false,
        `<select class="mk-in" id="mk-verba" name="verba">${opcoes(['Selecione a faixa',
          'Até R$ 500 / mês', 'R$ 500 a R$ 1.500 / mês', 'R$ 1.500 a R$ 3.000 / mês',
          'Acima de R$ 3.000 / mês', 'Quero o inventário completo'])}</select>`)}
    </div>
    ${campo('mk-msg', 'Mensagem (opcional)', false,
      `<textarea class="mk-in mk-ta" id="mk-msg" name="mensagem" rows="3" placeholder="Conte um pouco mais sobre a sua ideia"></textarea>`)}
    <div class="mk-erro" id="mk-erro" hidden></div>
    <button class="mk-b amarelo largo" id="mk-enviar" type="submit">Enviar contato →</button>
    <span class="mk-fine"><span aria-hidden="true">🔒</span> Seus dados estão seguros. Usaremos
      apenas para contato comercial — veja a <a href="/privacidade/">Política de Privacidade</a>.</span>
  </form>
</div>`;

/* ---- o script de produção ---------------------------------------------- */
/* O ENVIO GRAVA O LEAD e so' depois troca a tela — a ordem importa: mostrar a tabela primeiro e
   gravar depois perderia o contato de quem fechasse a aba. Falhando, o formulario fica como
   estava, preenchido, e o erro aparece (e' o que o prompt pede).
   Vai direto ao Supabase com a chave publicavel, como o resto do site (public/src/net/ads.js):
   a RLS da tabela e' a autorizacao. */
const script = `
(function(){
  var SB='https://alxwgqvjmetjbbqtjkhx.supabase.co/rest/v1/retrofoot_media_kit';
  var KEY='sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';
  var kit=document.getElementById('mk-kit'), precos=document.getElementById('mk-precos');
  var f=document.getElementById('mk-form'), erro=document.getElementById('mk-erro'),
      btn=document.getElementById('mk-enviar');

  document.addEventListener('click', function(ev){
    var b=ev.target.closest('[data-mk-ir]');
    if(b){ var alvo=document.getElementById(b.getAttribute('data-mk-ir'));
      if(alvo) window.scrollTo({ top: alvo.getBoundingClientRect().top + window.pageYOffset - 70,
        behavior:'smooth' });
      return; }
    if(ev.target.closest('[data-mk-voltar]')){
      precos.hidden=true; kit.hidden=false; window.scrollTo({top:0,behavior:'auto'}); }
  });

  if(!f) return;
  function falhar(m){ erro.textContent=m; erro.hidden=false;
    erro.scrollIntoView({behavior:'smooth',block:'center'}); }
  function val(id){ var e=document.getElementById(id); return e ? e.value.trim() : ''; }
  function esc(v){ return (v && v.indexOf('Selecione')!==0) ? v : null; }

  f.addEventListener('submit', async function(ev){
    ev.preventDefault(); erro.hidden=true;
    var empresa=val('mk-empresa'), contato=val('mk-contato'), email=val('mk-email');
    if(!empresa) return falhar('Escreva o nome da sua empresa.');
    if(email.indexOf('@')<1 || email.indexOf('.')<0) return falhar('Confira o e-mail: parece incompleto.');
    btn.disabled=true; var antes=btn.textContent; btn.textContent='Enviando…';
    try{
      var r=await fetch(SB,{ method:'POST', headers:{
        'apikey':KEY, 'Authorization':'Bearer '+KEY, 'Content-Type':'application/json',
        'Content-Profile':'elifoot_v3', 'Prefer':'return=minimal' },
        body: JSON.stringify({ nome: contato || empresa, empresa: empresa, email: email,
          telefone: val('mk-tel') || null, objetivo: esc(val('mk-formato')),
          verba: esc(val('mk-verba')), observacao: val('mk-msg') || null,
          origem:'media-kit' }) });
      if(!r.ok) throw new Error('HTTP '+r.status);
      kit.hidden=true; precos.hidden=false; window.scrollTo({top:0,behavior:'auto'});
    }catch(e){
      btn.disabled=false; btn.textContent=antes;
      falhar('Não deu para enviar agora. Tente de novo, ou escreva direto para ${CONTATO}.');
    }
  });
})();`;

/* A MENSAGEM JA' VAI ESCRITA. Quem chega aqui acabou de ver a tabela de midia, e o comercial
   precisa de saber isso de partida — sem o texto, chega um "oi" sem contexto e a conversa
   comeca do zero. */
const ZAP_TEXTO = encodeURIComponent('Olá! Vi o media kit do RetroFoot e quero falar sobre anunciar no jogo.');
const zap = WHATSAPP
  ? `<a class="mk-b amarelo" href="https://wa.me/${WHATSAPP}?text=${ZAP_TEXTO}" target="_blank" rel="noopener">💬 Falar no WhatsApp</a>`
  : `<a class="mk-b amarelo" href="mailto:${CONTATO}?subject=Media%20kit%20RetroFoot">✉ Falar com o comercial</a>`;

/* ---- a página ---------------------------------------------------------- */

export const mediaKit = [{
  slug: 'media-kit', ready: true, soMiolo: true, priority: 0.6, lastmod: '2026-09-05',
  schemaType: 'WebPage',
  title: 'Media Kit — anuncie no RetroFoot',
  description: 'Os espaços publicitários do RetroFoot: leaderboard de topo, laterais, placas do campo e a vitrine da barra lateral, com as capturas reais, as medidas de arte e a tabela de mídia.',
  h1: 'Sua marca foi convocada',
  keywords: 'anunciar no retrofoot, media kit retrofoot, patrocínio jogo de futebol, publicidade em game brasileiro, tabela de mídia',
  script,
  head: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">`,

  body: `
<div id="mk-kit">

  <!-- ============================== HERO ============================== -->
  <section class="mk-s mk-hero">
    <div class="mk-w mk-2col">
      <div class="mk-col">
        <span class="mk-pill">MEDIA KIT</span>
        <h1 class="mk-h1">Sua marca<br>foi convocada.</h1>
        <p class="mk-lead">No RetroFoot, a sua marca entra em campo de verdade: visibilidade em
          momentos decisivos, presença ao longo da jornada do jogador e conexão com uma comunidade
          apaixonada por futebol.</p>
        <div class="mk-bls">
          ${bullet('◎', 'Visibilidade que joga junto', 'a sua marca aparece onde a atenção do jogador está.')}
          ${bullet('👕', 'Presença ao longo da temporada', 'do primeiro clique ao apito final, a exposição acompanha a jornada.')}
          ${bullet('🏆', 'Conexão com quem ama o jogo', 'futebol, gestão e nostalgia numa comunidade engajada.')}
        </div>
        <div class="mk-btns">
          ${btn('Fale com o comercial →', 'amarelo', 'mk-falar')}
          ${btn('⚽ Ver os formatos', 'branco-g', 'mk-formatos')}
        </div>
        <span class="mk-nota">A tabela de preços é liberada na hora, depois do formulário.</span>
      </div>
      <div class="mk-col">
        <div class="mk-cart sombra">
          ${capa('O espaço de topo no jogo a correr', '970 × 90')}
          ${shot('topo.jpg', 'O jogo aberto com a faixa de topo destacada em amarelo', 1600, 1055, true)}
        </div>
      </div>
    </div>
  </section>

  <!-- ===================== ONDE A MARCA ENTRA EM CAMPO ================= -->
  <section class="mk-s mk-pt0">
    <div class="mk-w mk-pilha">
      <h2 class="mk-h2">Onde a sua marca entra em campo.</h2>
      <p class="mk-p mk-p-larga mk-mb8">Do primeiro clique ao apito final, o RetroFoot distribui a
        sua marca por toda a experiência do jogador.</p>
      <div class="mk-3col">
        <div class="mk-cart mk-num"><span class="mk-num-i am" aria-hidden="true">◎</span>
          <span class="mk-num-n">8</span><span class="mk-num-t">posições publicitárias</span>
          <span class="mk-num-d">Espalhadas por toda a jornada do jogador.</span></div>
        <div class="mk-cart mk-num"><span class="mk-num-i am" aria-hidden="true">★</span>
          <span class="mk-num-n">1</span><span class="mk-num-t">cota exclusiva</span>
          <span class="mk-num-d">No Modo Resenha.</span></div>
        <div class="mk-cart mk-num"><span class="mk-num-i" aria-hidden="true">🏆</span>
          <span class="mk-num-n">100%</span><span class="mk-num-t">integrada</span>
          <span class="mk-num-d">À experiência do jogo.</span></div>
      </div>
    </div>
  </section>

  <!-- ======================= POSIÇÕES ESTRATÉGICAS ===================== -->
  <section class="mk-s escura">
    <div class="mk-w mk-pilha">
      <h3 class="mk-h2 clara mk-mb12">Posições estratégicas para a sua marca.</h3>
      <div class="mk-3col">
        <div class="mk-vidro">${rotulo('TITULARES')}<span class="mk-vidro-d">Topo das telas e pontos de maior atenção.</span></div>
        <div class="mk-vidro">${rotulo('MEIO-CAMPO')}<span class="mk-vidro-d">Regiões centrais e fluxos principais.</span></div>
        <div class="mk-vidro">${rotulo('GRAMADO')}<span class="mk-vidro-d">Espaços nativos dentro do jogo.</span></div>
        <div class="mk-vidro">${rotulo('BOLA PARADA')}<span class="mk-vidro-d">Pausas, gols e decisões-chave.</span></div>
        <div class="mk-vidro">${rotulo('RESENHA')}<span class="mk-vidro-d">Espaço exclusivo para marcas em destaque.</span></div>
        <div class="mk-vidro">${rotulo('LATERAIS')}<span class="mk-vidro-d">Barras de apoio constante.</span></div>
      </div>
      <div class="mk-faixa-am">
        <span class="mk-faixa-i" aria-hidden="true">👟</span>
        <span>Monte a sua estratégia. Escale a sua marca. <b>Entre em campo.</b></span>
      </div>
    </div>
  </section>

  <!-- ============================ CENTROAVANTE ========================= -->
  <section class="mk-s" id="mk-formatos">
    <div class="mk-w mk-2col mk-2col-b">
      <div class="mk-col">
        ${rotulo('SEMPRE NA CARA DO GOL')}
        <h2 class="mk-h2">Feito para decidir</h2>
        <p class="mk-p">O formato de topo acompanha o treinador nas principais telas do jogo.</p>
        <span class="mk-tec"><b>Nome técnico:</b> Leaderboard de topo</span>
        <h3 class="mk-h3">Centroavante</h3>
        <p class="mk-p mk-p-sm">Posicionado no alto da interface, este espaço aparece nas principais
          páginas do RetroFoot. Ideal para máxima visibilidade e construção de marca.</p>
        <div class="mk-tks"><span class="mk-tks-t">Por que jogar nesta posição?</span>
          ${tick('Alta frequência')}${tick('Presença recorrente')}${tick('Posição de destaque')}${tick('Cobertura ampla')}</div>
        <div class="mk-btns mk-pt6">${btn('Fale com o comercial →', 'contorno', 'mk-falar')}</div>
      </div>
      <div class="mk-col mk-g10">
        <div class="mk-duo">
          <div class="mk-duo-a">
            <span class="mk-cap">DESKTOP · 970 × 90</span>
            <div class="mk-cart sombra">${shot('topo.jpg', 'A faixa de topo destacada na versão desktop do jogo', 1600, 1055)}</div>
          </div>
          <div class="mk-duo-b">
            <span class="mk-cap">MOBILE · 320 × 100</span>
            <div class="mk-cart sombra r16">${shot('topo-mobile.jpg', 'A faixa de topo destacada na versão de telefone', 692, 1500)}</div>
          </div>
        </div>
        <span class="mk-legenda">O espaço destacado no jogo a correr. A mesma compra cobre as duas versões.</span>
        <div class="mk-2cx">${caixa('FORMATOS', 'JPG · PNG · WEBP')}${caixa('APARECE EM', 'páginas principais')}</div>
      </div>
    </div>
  </section>

  <!-- ====================== PELOS CORREDORES DO CAMPO ================== -->
  <section class="mk-s mk-pt0">
    <div class="mk-w mk-pilha">
      ${rotulo('NOVENTA MINUTOS DE ATENÇÃO')}
      <h2 class="mk-h2">Pelos corredores do campo</h2>
      <p class="mk-p mk-p-larga mk-mb10">Durante a partida, a sua marca acompanha o torcedor do
        primeiro ao último lance.</p>
      <div class="mk-2col mk-par">
        <div class="mk-cart mk-lat">
          <h3 class="mk-h4">Lateral esquerda</h3>
          <span class="mk-tec"><b>Nome técnico:</b> Skyscraper esquerdo</span>
          <div class="mk-moldura">${shot('trilho-esq.jpg', 'A rodada ao vivo com o trilho esquerdo destacado em amarelo', 1600, 1055)}</div>
          <span class="mk-lat-d">Domine o corredor esquerdo da experiência ao vivo, com visibilidade
            contínua e alto impacto.</span>
          <div class="mk-tks compacto">${tick('Visibilidade contínua')}${tick('Alto impacto')}${tick('Ambiente premium')}</div>
          <div class="mk-pe">${mono('DESKTOP', '160 × 600')}${mono('FORMATOS', 'JPG · PNG · WEBP')}</div>
        </div>
        <div class="mk-cart mk-lat">
          <h3 class="mk-h4">Lateral direita</h3>
          <span class="mk-tec"><b>Nome técnico:</b> Skyscraper direito</span>
          <div class="mk-moldura">${shot('trilho-dir.jpg', 'A rodada ao vivo com o trilho direito destacado em amarelo', 1600, 1055)}</div>
          <span class="mk-lat-d">Acompanhe o torcedor do outro lado da transmissão, com presença
            constante durante o jogo.</span>
          <div class="mk-tks compacto">${tick('Visibilidade contínua')}${tick('Alto impacto')}${tick('Ambiente premium')}</div>
          <div class="mk-pe">${mono('DESKTOP', '160 × 600')}${mono('FORMATOS', 'JPG · PNG · WEBP')}</div>
        </div>
      </div>
      <div class="mk-azul">
        ${rotulo('PACOTE RECOMENDADO · ESQUERDA + DIREITA')}
        <span class="mk-azul-n">Domínio das laterais</span>
        <span class="mk-azul-d">As duas laterais, um só resultado: a sua marca presente do primeiro
          ao último minuto.</span>
        <div class="mk-3col mk-pt14">
          <span class="mk-ben"><b>◉ Presença total</b><span>A sua marca em todos os momentos do jogo.</span></span>
          <span class="mk-ben"><b>◈ Maior lembrança</b><span>Mais exposição, mais lembrança.</span></span>
          <span class="mk-ben"><b>🏆 Impacto premium</b><span>Ambiente nobre e altamente qualificado.</span></span>
        </div>
      </div>
    </div>
  </section>

  <!-- ============================ PLACAS DO CAMPO ====================== -->
  <section class="mk-s escura">
    <div class="mk-w mk-pilha">
      ${rotulo('A SUA MARCA CERCANDO O JOGO')}
      <h2 class="mk-h2 clara">Patrocínio que veste o jogo</h2>
      <p class="mk-p clara mk-p-larga">Soluções integradas para posicionar a sua marca ao redor do
        gramado e nos momentos de maior conversa.</p>
      <h3 class="mk-h3 clara mk-mt10">À beira do gramado</h3>
      <span class="mk-tec escuro"><b>Nome técnico:</b> Placa do campo</span>
      <p class="mk-p clara mk-p-sm mk-p-larga">As placas contornam o campo e ampliam a presença da
        sua marca durante o jogo.</p>
      <div class="mk-cart sombra-forte">${shot('placas.jpg', 'A tela do jogo com as placas do campo destacadas, cada uma marcada com ANUNCIE AQUI', 1600, 1111)}</div>
      <div class="mk-3col mk-pt4">
        <div class="mk-vidro">
          <span class="mk-vidro-n">Linha de fundo</span>
          <span class="mk-vidro-d cresce">Três placas deitadas, cada uma com arte e link próprios.
            O trio aparece acima <b>e</b> abaixo do campo — como o anel de placas dá a volta a um
            estádio de verdade.</span>
          <div class="mk-pe escuro">${mono('ARTE', '340 × 44')}${mono('PLACAS', '3')}${mono('APARIÇÕES', '6')}</div>
        </div>
        <div class="mk-vidro">
          <span class="mk-vidro-n">Corredor do gramado</span>
          <span class="mk-vidro-d cresce">Três placas verticais, independentes entre si. O trio
            aparece de cada lado do campo.</span>
          <div class="mk-pe escuro">${mono('ARTE', '40 × 384')}${mono('PLACAS', '3')}${mono('APARIÇÕES', '6')}</div>
        </div>
        <div class="mk-vidro dourado">
          <span class="mk-vidro-n am">Takeover completo</span>
          <span class="mk-vidro-d claro cresce">As duas famílias, só suas: o anel inteiro de placas
            do campo com a sua marca.</span>
          <div class="mk-pe escuro">${mono('ARTE', '340×44 + 40×384')}${mono('PLACAS', '6')}${mono('APARIÇÕES', '12')}</div>
        </div>
      </div>
    </div>
  </section>

  <!-- =========================== PULMÃO DO TIME ======================== -->
  <section class="mk-s">
    <div class="mk-w mk-2col mk-2col-b">
      <div class="mk-col">
        ${rotulo('PULMÃO DO TIME')}
        <h2 class="mk-h2">Onde a bola mais passa</h2>
        <p class="mk-p">No centro do jogo, a sua marca acompanha as decisões e a navegação.</p>
        <span class="mk-tec"><b>Nome técnico:</b> Vitrine da barra lateral</span>
        <h3 class="mk-h3">Volante</h3>
        <p class="mk-p mk-p-sm">Este espaço aparece nas áreas centrais das páginas do jogo,
          acompanhando elenco, competições e decisões do treinador. Ideal para presença recorrente
          e lembrança de marca.</p>
        <div class="mk-tks"><span class="mk-tks-t">Por que jogar nesta posição?</span>
          ${tick('Presença recorrente')}${tick('Acompanha a navegação')}${tick('Alta lembrança da marca')}</div>
        <div class="mk-btns mk-pt6">${btn('Fale com o comercial →', 'contorno', 'mk-falar')}</div>
      </div>
      <div class="mk-col mk-g10">
        <div class="mk-cart sombra">${shot('vitrine.jpg', 'O jogo aberto com a vitrine da barra lateral destacada em amarelo', 1600, 1055)}</div>
        <span class="mk-legenda">O espaço destacado no jogo a correr.</span>
        <div class="mk-3col mk-g8">${caixa('DESKTOP', '300 × 300')}${caixa('FORMATOS', 'JPG · PNG · WEBP')}${caixa('APARECE EM', 'páginas principais')}</div>
      </div>
    </div>
  </section>

  <!-- ============================= FORMULÁRIO ========================== -->
  <section class="mk-s escura" id="mk-falar">
    <div class="mk-w mk-2col mk-2col-f">
      <div class="mk-col">
        ${rotulo('VAMOS CONVERSAR?')}
        <h2 class="mk-h2 clara">A sua marca também pode fazer parte <i>desta história</i></h2>
        <p class="mk-p clara">Preencha o formulário e a nossa equipe entra em contato para
          apresentar todas as oportunidades de mídia no RetroFoot. A tabela de preços aparece
          assim que você enviar.</p>
        <div class="mk-tks claro mk-pt6">
          <div class="mk-tk grande"><span class="am" aria-hidden="true">◎</span><span>Posições estratégicas</span></div>
          <div class="mk-tk grande"><span aria-hidden="true">📊</span><span>Alto engajamento</span></div>
          <div class="mk-tk grande"><span aria-hidden="true">👥</span><span>Comunidade apaixonada</span></div>
        </div>
        <span class="mk-alt">Prefere e-mail? <a href="mailto:${CONTATO}">${CONTATO}</a></span>
      </div>
      <div class="mk-col">${formulario}</div>
    </div>
  </section>

  <!-- ============================= FECHAMENTO ========================== -->
  <section class="mk-s">
    <div class="mk-w mk-pilha mk-centro">
      <h2 class="mk-h2 mk-estreito">Marque um golaço com a gente!</h2>
      <p class="mk-p mk-estreito-p">Escolha a posição, mande o contato e a gente monta o pacote
        junto com você.</p>
      <div class="mk-btns mk-pt10">${btn('Fale com o comercial →', 'azul', 'mk-falar')}</div>
    </div>
  </section>

</div>

<!-- ==================== ESTADO 2 — TABELA DE PREÇOS ==================== -->
<div id="mk-precos" hidden>

  <section class="mk-s mk-pb0">
    <div class="mk-w mk-pilha mk-centro">
      <span class="mk-selo" aria-hidden="true">✓</span>
      ${rotulo('CONTATO ENVIADO')}
      <h2 class="mk-h1 mk-estreito">Obrigado! Aqui está a tabela de mídia.</h2>
      <p class="mk-p mk-estreito-p">A nossa equipe entra em contato para apresentar as oportunidades
        e montar o seu pacote. Enquanto isso, os valores de veiculação mensal de cada espaço estão
        abaixo.</p>
    </div>
  </section>

  <section class="mk-s mk-pt36 mk-pb0">
    <div class="mk-w">
      <div class="mk-cart sombra">
        ${capa('Tabela de mídia — temporada 2026', 'VALORES MENSAIS')}
        <div class="mk-tab">
          <div class="mk-tl cabeca">
            <span class="mk-tl-h">ESPAÇO</span>
            <span class="mk-tl-h val">VALOR/MÊS</span>
          </div>
          ${LINHAS.map(linhaTabela).join('')}
          <div class="mk-tl total">
            <span class="mk-tl-n forte">Inventário completo</span>
            <span class="mk-tl-v grande">R$ 5.000</span>
          </div>
          <span class="mk-tab-nota">Valores mensais por espaço. O inventário completo cobre todos
            os espaços da tabela. Números de audiência e relatórios de veiculação
            <b>sob consulta</b> com o comercial.</span>
        </div>
      </div>
    </div>
  </section>

  <section class="mk-s mk-pt24 mk-pb0">
    <div class="mk-w mk-pilha">
      ${rotulo('PACOTES COM DESCONTO')}
      <div class="mk-3col">
        ${pacote('Domínio das laterais', 'Skyscraper esquerdo + direito, as duas laterais do jogo ao vivo.', 'R$ 920', 'R$ 1.020', 10, false)}
        ${pacote('Takeover das placas', 'O anel inteiro de placas do campo — linha de fundo mais corredor do gramado.', 'R$ 970', 'R$ 1.080', 10, false)}
        ${pacote('Patrocinador da temporada', 'O inventário inteiro, exclusivo: todos os espaços e a cota do Modo Resenha.', 'R$ 4.250', 'R$ 5.000', 15, true)}
      </div>
    </div>
  </section>

  <section class="mk-s mk-pt40">
    <div class="mk-w">
      <div class="mk-fecho">
        <h2 class="mk-h2 clara mk-estreito">Marque um golaço com a gente!</h2>
        <p class="mk-p clara mk-estreito-p">Quer fechar agora ou montar um pacote sob medida?
          Chama a gente e resolvemos na conversa.</p>
        <div class="mk-btns mk-pt8 mk-centro">${zap}</div>
        <div class="mk-aviso">
          <span aria-hidden="true">⚠</span>
          <span>Tabela válida até <b>${VALIDADE}</b>. Valores mensais, sujeitos a disponibilidade
            do espaço no momento da contratação.</span>
        </div>
      </div>
    </div>
  </section>

  <section class="mk-s mk-pt0 mk-pb48">
    <div class="mk-w mk-centro">
      <button type="button" class="mk-b branco-g" data-mk-voltar>↩ Voltar ao media kit</button>
    </div>
  </section>

</div>`,

  css: `
/* ===== MEDIA KIT ======================================================
   Tokens do handoff: fundo #eef0ee, tinta #12201a, corpo #3a473f, azul #17458F
   (escuro #0e2f66), amarelo #F2B90C, bordas #dde7db/#d8e2d6, seccoes escuras
   #12201a com texto #c3d3ec. Space Grotesk para tudo, IBM Plex Mono para
   numeros, medidas e rotulos de caixa-alta.
   O ficheiro de desktop quebra a 900px; o artboard de telefone e' o @media de
   560px — mesma pagina, nao uma segunda. */
:root{ --mk-az:#17458F; --mk-az2:#0e2f66; --mk-am:#F2B90C; --mk-tinta:#12201a;
  --mk-corpo:#3a473f; --mk-bd:#dde7db; --mk-bd2:#d8e2d6; --mk-fundo:#eef0ee;
  --mk-claro:#c3d3ec; --mk-mudo:#8fa896; --mk-cinza:#78877c; --mk-cinza2:#8b978d;
  --mk-vd:#1a8f3c; --mk-mono:'IBM Plex Mono',ui-monospace,monospace }
body{background:var(--mk-fundo);font-family:'Space Grotesk',system-ui,-apple-system,sans-serif;
  color:var(--mk-corpo)}
main{max-width:none;margin:0;padding:0}
main a{color:var(--mk-az)}
main a:hover{color:var(--mk-az2)}

/* estrutura */
.mk-s{padding:56px 0}
.mk-s.escura{background:var(--mk-tinta)}
.mk-hero{padding:56px 0 48px}
.mk-pt0{padding-top:0}.mk-pb0{padding-bottom:0}
.mk-pt24{padding-top:24px}.mk-pt36{padding-top:36px}.mk-pt40{padding-top:40px}
.mk-pb48{padding-bottom:48px}
.mk-w{max-width:1180px;margin:0 auto;padding:0 24px}
.mk-pilha{display:flex;flex-direction:column;gap:14px}
.mk-2col{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:48px;align-items:center}
.mk-2col-b{grid-template-columns:minmax(0,1fr) minmax(0,1.1fr)}
.mk-2col-f{grid-template-columns:minmax(0,.85fr) minmax(0,1fr);align-items:start}
.mk-2col.mk-par{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:stretch}
.mk-3col{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.mk-3col.mk-g8{gap:8px}
.mk-2cx{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding-top:2px}
.mk-col{display:flex;flex-direction:column;gap:14px;min-width:0}
.mk-col.mk-g10{gap:10px}
.mk-centro{text-align:center;align-items:center;justify-content:center}
.mk-pt4{padding-top:4px}.mk-pt6{padding-top:6px}.mk-pt8{padding-top:8px}
.mk-pt10{padding-top:10px}.mk-pt14{padding-top:14px}
.mk-mb8{margin-bottom:8px}.mk-mb10{margin-bottom:10px}.mk-mb12{margin-bottom:12px}
.mk-mt10{margin-top:10px}

/* tipos */
/* OS TITULOS DESTA PAGINA NAO SAO OS DO ARTIGO. A casca da's paginas de conteudo poe um filete
   por cima de cada H2 e um respiro grande antes dos H3; sem zerar aqui, a manchete da tela de
   obrigado nascia com uma risca por cima e os subtitulos ganhavam espaco a mais. */
.mk-h1,.mk-h2,.mk-h3,.mk-h4{border:0;padding:0}
.mk-h1{margin:0;font-size:46px;font-weight:700;color:var(--mk-tinta);letter-spacing:-.03em;
  line-height:1.08;text-wrap:pretty}
.mk-h2{margin:0;font-size:34px;font-weight:700;color:var(--mk-tinta);letter-spacing:-.02em;
  line-height:1.15;text-wrap:pretty;border:0;padding:0}
.mk-h2.clara,.mk-h3.clara{color:#fff}
.mk-h2 i{font-style:italic;color:var(--mk-am)}
.mk-h3{margin:8px 0 0;font-size:20px;font-weight:700;color:var(--mk-tinta)}
.mk-h4{margin:0;font-size:19px;font-weight:700;color:var(--mk-tinta)}
.mk-lead{margin:0;font-size:16px;line-height:1.6;color:var(--mk-corpo);max-width:520px;text-wrap:pretty}
.mk-p{margin:0;font-size:16px;line-height:1.6;color:var(--mk-corpo);text-wrap:pretty}
.mk-p.clara{color:var(--mk-claro)}
.mk-p.mk-p-sm{font-size:15px}
.mk-p-larga{max-width:720px}
.mk-estreito{max-width:620px}
.mk-estreito-p{max-width:560px}
.mk-nota{font-size:13px;color:var(--mk-cinza)}
.mk-legenda{font-size:13px;color:var(--mk-cinza);font-style:italic}
.mk-rot{font-family:var(--mk-mono);font-size:11px;font-weight:600;color:var(--mk-az);letter-spacing:.14em}
.escura .mk-rot{color:var(--mk-am)}
.mk-pill{display:inline-flex;align-items:center;align-self:flex-start;font-family:var(--mk-mono);
  font-size:11px;font-weight:600;color:var(--mk-az);background:#e9eff8;border:1px solid #d6e1f1;
  border-radius:99px;padding:7px 14px;letter-spacing:.14em;white-space:nowrap}
.mk-tec{font-family:var(--mk-mono);font-size:12px;color:var(--mk-cinza)}
.mk-tec b{color:var(--mk-corpo)}
.mk-tec.escuro{color:var(--mk-mudo)}
.mk-tec.escuro b{color:var(--mk-claro)}
.mk-alt{font-size:14px;color:var(--mk-mudo);padding-top:8px}
.mk-alt a{font-family:var(--mk-mono);color:var(--mk-am)}
.mk-alt a:hover{color:#ffcb2e}

/* botões */
.mk-btns{display:flex;gap:10px;flex-wrap:wrap;padding-top:6px}
.mk-b{height:50px;padding:0 22px;border:none;border-radius:14px;font-family:inherit;font-size:15px;
  font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;
  gap:9px;white-space:nowrap;text-decoration:none;transition:background .15s,color .15s}
.mk-b.amarelo{background:var(--mk-am);color:var(--mk-az)}
.mk-b.amarelo:hover{background:#ffcb2e;color:var(--mk-az)}
.mk-b.azul{background:var(--mk-az);color:#fff}
.mk-b.azul:hover{background:var(--mk-az2);color:#fff}
.mk-b.branco-g{border:1px solid var(--mk-bd2);background:#fff;color:var(--mk-corpo);font-weight:600}
.mk-b.branco-g:hover{background:#f2f7f1;color:var(--mk-corpo)}
.mk-b.contorno{height:46px;padding:0 20px;border:1px solid var(--mk-bd2);border-radius:13px;
  background:#fff;color:var(--mk-az);font-size:14px}
.mk-b.contorno:hover{background:#f2f7f1;color:var(--mk-az)}
.mk-b.largo{width:100%;height:52px}
.mk-b:disabled{opacity:.65;cursor:progress}

/* cartões */
.mk-cart{background:#fff;border:1px solid var(--mk-bd);border-radius:20px;overflow:hidden}
.mk-cart.sombra{box-shadow:0 20px 50px -30px rgba(20,33,26,.5)}
.mk-cart.sombra-forte{box-shadow:0 24px 60px -34px rgba(0,0,0,.7)}
.mk-cart.r16{border-radius:16px;box-shadow:0 14px 34px -24px rgba(20,33,26,.5)}
.mk-img{display:block;width:100%;height:auto}
.mk-moldura{border:1px solid var(--mk-bd);border-radius:14px;overflow:hidden}
/* TODA CAPA AZUL LEVA A BARRA AMARELA na borda esquerda — regra do handoff. */
.mk-capa{display:flex;align-items:center;gap:10px;
  background:linear-gradient(100deg,var(--mk-az2),var(--mk-az) 62%);
  padding:11px 16px;position:relative;overflow:hidden}
.mk-capa::before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--mk-am)}
.mk-capa-t{margin-left:5px;font-size:13px;font-weight:700;color:#fff}
.mk-capa-d{margin-left:auto;font-family:var(--mk-mono);font-size:10px;color:var(--mk-claro);white-space:nowrap}

/* números do inventário */
.mk-num{border-radius:18px;padding:24px;display:flex;flex-direction:column;gap:6px;min-width:0}
.mk-num-i{font-size:17px}
.mk-num-i.am{color:var(--mk-am)}
.mk-num-n{font-family:var(--mk-mono);font-size:38px;font-weight:600;color:var(--mk-az);line-height:1}
.mk-num-t{font-size:15px;font-weight:700;color:var(--mk-tinta)}
.mk-num-d{font-size:14px;color:var(--mk-corpo);line-height:1.5}

/* cartões de vidro (sobre o escuro) */
.mk-vidro{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;
  padding:20px;display:flex;flex-direction:column;gap:8px;min-width:0}
.mk-vidro.dourado{background:rgba(242,185,12,.12);border-color:rgba(242,185,12,.45)}
.mk-vidro-n{font-size:15px;font-weight:700;color:#fff}
.mk-vidro-n.am{color:var(--mk-am)}
.mk-vidro-d{font-size:13px;color:var(--mk-mudo);line-height:1.55}
.mk-vidro-d.claro{color:var(--mk-claro)}
.mk-vidro-d.cresce{flex:1}
.mk-vidro-d b{color:var(--mk-claro)}
.mk-faixa-am{display:flex;align-items:center;gap:12px;background:rgba(242,185,12,.1);
  border:1px solid rgba(242,185,12,.4);border-radius:16px;padding:18px 22px;margin-top:6px;
  font-size:17px;font-weight:600;color:#fff;line-height:1.4;text-wrap:pretty}
.mk-faixa-am b{color:var(--mk-am)}
.mk-faixa-i{flex:0 0 auto;font-size:22px}

/* medidas */
.mk-med{display:flex;flex-direction:column;gap:2px;min-width:0}
.mk-med-r{font-size:10px;font-weight:700;color:var(--mk-cinza2);letter-spacing:.12em}
.mk-med-v{font-family:var(--mk-mono);font-size:13px;font-weight:600;color:var(--mk-tinta)}
.mk-cx{display:flex;flex-direction:column;background:#fff;border:1px solid var(--mk-bd2);
  border-radius:12px;padding:10px 14px;min-width:0}
.mk-pe{display:flex;gap:22px;border-top:1px solid var(--mk-fundo);margin-top:2px;padding-top:12px}
.mk-pe.escuro{border-top-color:rgba(255,255,255,.12);gap:18px}
.mk-pe.escuro .mk-med-r{color:var(--mk-mudo)}
.mk-pe.escuro .mk-med-v{color:#fff}
.mk-cap{font-size:10px;font-weight:700;color:var(--mk-cinza2);letter-spacing:.12em}

/* listas de marcadores */
.mk-bls{display:flex;flex-direction:column;gap:12px;padding-top:2px}
.mk-bl{display:flex;align-items:flex-start;gap:11px;font-size:14px;color:var(--mk-corpo);line-height:1.55}
.mk-bl b{color:var(--mk-tinta)}
.mk-bl-i{flex:0 0 auto;font-size:15px;margin-top:1px;color:var(--mk-am)}
.mk-tks{display:flex;flex-direction:column;gap:8px;padding-top:4px}
.mk-tks.compacto{gap:6px;padding-top:0}
.mk-tks-t{font-size:13px;font-weight:700;color:var(--mk-tinta)}
.mk-tk{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--mk-corpo);line-height:1.5}
.mk-tk>span:first-child{flex:0 0 auto;color:var(--mk-vd);font-size:13px;margin-top:2px}
.mk-tks.claro{gap:10px}
.mk-tk.grande{align-items:center;font-size:14px;font-weight:600;color:#fff}
.mk-tk.grande>span:first-child{font-size:16px;color:inherit;margin-top:0}
.mk-tk.grande>span:first-child.am{color:var(--mk-am)}

/* laterais */
.mk-lat{padding:22px;display:flex;flex-direction:column;gap:12px;border-radius:20px}
.mk-lat-d{font-size:14px;color:var(--mk-corpo);line-height:1.55;flex:1}
.mk-duo{display:flex;gap:14px;align-items:flex-start}
.mk-duo-a{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}
.mk-duo-b{width:158px;flex:0 0 auto;display:flex;flex-direction:column;gap:7px}

/* bloco azul do pacote */
.mk-azul{background:linear-gradient(100deg,var(--mk-az2),var(--mk-az) 62%);border-radius:20px;
  padding:28px 32px;position:relative;overflow:hidden;display:flex;flex-direction:column;gap:8px}
.mk-azul::before{content:'';position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--mk-am)}
.mk-azul .mk-rot{color:var(--mk-am)}
.mk-azul-n{font-size:24px;font-weight:700;color:#fff;letter-spacing:-.02em}
.mk-azul-d{font-size:15px;color:var(--mk-claro);line-height:1.6;max-width:620px;text-wrap:pretty}
.mk-ben{display:flex;flex-direction:column;gap:3px;min-width:0}
.mk-ben b{font-size:14px;font-weight:700;color:#fff}
.mk-ben span{font-size:13px;color:var(--mk-mudo);line-height:1.5}

/* formulário */
.mk-form-cx{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 24px 60px -34px rgba(0,0,0,.7)}
.mk-form-cx .mk-capa{padding:13px 20px}
.mk-form-cx .mk-capa-t{font-size:14px}
.mk-form{padding:24px;display:flex;flex-direction:column;gap:14px}
.mk-form-sub{font-size:13px;color:var(--mk-cinza);line-height:1.5}
.mk-form-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.mk-lb{display:flex;flex-direction:column;gap:6px;min-width:0}
.mk-lb-t{font-size:12px;font-weight:600;color:var(--mk-corpo)}
.mk-lb-t i{font-style:normal;color:#c0392b}
.mk-in{height:44px;padding:0 13px;border:1px solid var(--mk-bd2);border-radius:12px;background:#fff;
  font-family:inherit;font-size:14px;color:var(--mk-tinta);box-sizing:border-box;width:100%}
.mk-in::placeholder{color:#9aa79e}
.mk-in:focus{border-color:var(--mk-az);outline:2px solid rgba(23,69,143,.18);outline-offset:0}
select.mk-in{padding:0 11px}
.mk-ta{height:auto;padding:11px 13px;resize:vertical;line-height:1.5;min-height:84px}
.mk-erro{background:#fdecea;border:1px solid #f5c6c0;color:#93261a;border-radius:12px;
  padding:11px 14px;font-size:14px}
.mk-fine{font-size:12px;color:#9aa79e;text-align:center;line-height:1.5}

/* tabela de mídia */
.mk-tab{padding:8px 14px 18px}
.mk-tl{display:grid;grid-template-columns:minmax(0,1fr) 130px;gap:0 12px;
  align-items:center;padding:13px 10px;border-radius:10px}
.mk-tl.zebra{background:#f6f8f5}
.mk-tl.cabeca{padding:12px 10px 8px;border-bottom:1px solid var(--mk-bd);border-radius:0;background:none}
.mk-tl.total{padding:16px 10px 6px;margin-top:6px;border-top:2px solid var(--mk-tinta);
  border-radius:0;background:none}
.mk-tl-h{font-size:10px;font-weight:700;color:var(--mk-cinza2);letter-spacing:.12em}
.mk-tl-h.val{text-align:right}
.mk-tl-id{min-width:0;display:flex;flex-direction:column;gap:2px}
.mk-tl-n{font-size:14px;font-weight:600;color:var(--mk-tinta)}
.mk-tl-n.forte{font-weight:700}
.mk-tl-a{font-family:var(--mk-mono);font-size:11px;color:var(--mk-cinza)}
.mk-tl-v{font-family:var(--mk-mono);font-size:15px;font-weight:600;color:var(--mk-tinta);
  text-align:right;white-space:nowrap}
.mk-tl-v.grande{font-size:18px;color:var(--mk-az)}
.mk-tab-nota{display:block;padding:2px 10px 0;font-size:12px;color:var(--mk-cinza);line-height:1.5}
.mk-so-mob{display:none}

/* pacotes */
.mk-pac{background:#fff;border:1px solid var(--mk-bd);border-radius:18px;padding:22px;
  display:flex;flex-direction:column;gap:8px;min-width:0}
.mk-pac.azul{background:linear-gradient(100deg,var(--mk-az2),var(--mk-az) 62%);border:0;
  position:relative;overflow:hidden}
.mk-pac.azul::before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--mk-am)}
.mk-pac-n{font-size:16px;font-weight:700;color:var(--mk-tinta)}
.mk-pac.azul .mk-pac-n{color:#fff}
.mk-pac-d{font-size:13px;color:var(--mk-corpo);line-height:1.5;flex:1}
.mk-pac.azul .mk-pac-d{color:var(--mk-claro)}
.mk-pac-p{display:flex;align-items:baseline;gap:9px;border-top:1px solid var(--mk-fundo);
  padding-top:12px;flex-wrap:wrap}
.mk-pac.azul .mk-pac-p{border-top-color:rgba(255,255,255,.18)}
.mk-pac-p b{font-family:var(--mk-mono);font-size:20px;font-weight:600;color:var(--mk-az)}
.mk-pac.azul .mk-pac-p b{color:var(--mk-am)}
.mk-pac-p s{font-family:var(--mk-mono);font-size:12px;color:#9aa79e}
.mk-pac.azul .mk-pac-p s{color:var(--mk-mudo)}
.mk-off{font-size:11px;font-weight:700;color:var(--mk-vd);background:#e8f7ee;border-radius:99px;padding:3px 9px}
.mk-pac.azul .mk-off{color:var(--mk-az);background:var(--mk-am)}

/* fecho da tabela */
.mk-selo{width:56px;height:56px;border-radius:99px;background:#e8f7ee;border:1px solid #bfe6cd;
  display:flex;align-items:center;justify-content:center;font-size:24px;color:var(--mk-vd)}
.mk-fecho{background:var(--mk-tinta);border-radius:24px;padding:40px;position:relative;
  overflow:hidden;display:flex;flex-direction:column;gap:14px;align-items:center;text-align:center}
.mk-fecho::before{content:'';position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--mk-am)}
.mk-aviso{display:flex;align-items:flex-start;gap:9px;max-width:520px;background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:12px 16px;margin-top:8px;
  font-size:13px;color:var(--mk-claro);line-height:1.5;text-align:left}
.mk-aviso b{color:#fff}

/* ---- uma coluna (o corte do proprio ficheiro de desktop) ---- */
@media (max-width:900px){
  .mk-2col,.mk-2col-b,.mk-2col-f,.mk-2col.mk-par{grid-template-columns:minmax(0,1fr);gap:26px}
  .mk-3col{grid-template-columns:minmax(0,1fr)}
  .mk-h1{font-size:34px}
  .mk-h2{font-size:27px}
  .mk-tl{grid-template-columns:minmax(0,1fr) 106px}
  .mk-so-desk{display:none}
  .mk-so-mob{display:inline}
}
/* ---- telefone (o artboard de 390px) ---- */
@media (max-width:560px){
  .mk-s{padding:32px 0}
  .mk-hero{padding:28px 0 32px}
  .mk-w{padding:0 16px}
  .mk-h1{font-size:32px}
  .mk-h2{font-size:26px}
  .mk-btns{flex-direction:column;align-items:stretch}
  .mk-b{width:100%;height:52px}
  .mk-b.branco-g,.mk-b.contorno{height:48px}
  .mk-form-g{grid-template-columns:minmax(0,1fr)}
  .mk-form,.mk-lat{padding:18px}
  .mk-azul{padding:22px 20px}
  .mk-fecho{padding:28px 20px}
  /* AS DUAS CAPTURAS DO TOPO FICAM LADO A LADO TAMBEM NO TELEFONE — pedido do prompt:
     e' a comparacao entre as duas medidas que faz o formato entender-se. */
  .mk-duo{gap:10px}
  .mk-duo-b{width:104px}
  .mk-faixa-am{font-size:15px;padding:16px 18px}
  .mk-azul-n{font-size:21px}
  .mk-tab{padding:6px 8px 16px}
  .mk-tl{padding:12px 8px}
}`,
}];
