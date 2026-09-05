// ============================================================================
// MEDIA KIT — a página comercial dos espaços publicitários
// ----------------------------------------------------------------------------
// Portada do desenho do Bruno (Drive, "Media Kite - Possível Site", 7 telas de
// 1366×768, 04/09/2026). Sai pelo mesmo gerador das outras páginas estáticas
// (scripts/build-seo.mjs), mas com `semCabecalho` e `css` próprio: o desenho tem
// a sua própria abertura, com a marca lá dentro — a barra branca do site por
// cima dela poria dois logos na mesma dobra.
//
// AS IMAGENS SAO CAPTURAS REAIS DO JOGO A CORRER, nao mockups: saem de
// `node scripts/capture-ads.mjs`, que abre o jogo, navega ate' cada espaco,
// destaca-o a amarelo e escurece o resto. E' por isso que as medidas escritas
// aqui sao as da tela publicada. A vitrine da barra lateral faltava na lista do
// script (o espaco nasceu depois dele) e foi acrescentada agora.
//
// O FORMULARIO GRAVA A SERIO, em elifoot_v3.retrofoot_media_kit — a tabela ja'
// existia e ja' aceitava envio anonimo. O que faltava era poder LER: nao havia
// politica de SELECT nenhuma, entao um pedido comercial entrava e ficava
// invisivel para toda a gente. A politica media_kit_admin_sel foi criada com
// esta pagina; a tela no painel ainda esta' por fazer (ler pelo Supabase, para ja').
//
// O QUE NAO E' FIEL AO DESENHO, e porque:
//  · o desenho tem uma fotografia de estadio com bandeira de escanteio na
//    abertura. Nao temos essa imagem, e nao se inventa foto de banco de imagens
//    que ninguem licenciou: a abertura e' um gradiente com o campo desenhado em
//    SVG e a marca sobre a bandeira. Trocar por uma foto real e' um ficheiro.
//  · "8 posicoes publicitarias" e' o numero do desenho. Hoje ha' 14 espacos
//    ligados em elifoot_v3.ad_spaces. O numero ficou como o dono aprovou — nao
//    e' promessa a mais, e' promessa a menos; ver o relatorio da sessao.
//  · AS PLACAS DO CAMPO NAO SAO 6 POR FAMILIA. O desenho vende "Unidades 6" em
//    cada uma, mas ad_spaces.placas = 3: sao TRES placas independentes, cada uma
//    com arte e link proprios, e o trio e' desenhado duas vezes (acima e abaixo
//    do campo; de cada lado). Vender 6 faria o anunciante esperar seis artes
//    diferentes e receber tres. A pagina diz "Placas 3 · Aparicoes 6".
//    O desenho tambem trocava as duas familias de sitio (dava 340x44, que e'
//    deitada, como "placas verticais"); aqui cada medida esta' com a sua.
// ============================================================================

const CONTATO = 'suporte@retrofoot.com.br';

/* ---- peças reutilizáveis ---------------------------------------------- */

const marca = (cor) => `<svg class="mk-marca" viewBox="0 0 40 40" aria-hidden="true">
  <rect x="1" y="1" width="38" height="38" rx="9" fill="${cor === 'clara' ? '#fff' : '#17458F'}"/>
  ${[[20, 10], [20, 30], [11.5, 15], [28.5, 15], [11.5, 25], [28.5, 25], [20, 20]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="${cor === 'clara' ? '#17458F' : '#F2B90C'}"/>`).join('')}
</svg>`;

const check = itens => `<ul class="mk-check">${itens
  .map(t => `<li><span class="mk-tick" aria-hidden="true">✓</span>${t}</li>`).join('')}</ul>`;

const cta = (rotulo = 'Fale com o comercial') =>
  `<a class="mk-cta" href="#falar"><span>${rotulo}</span><span class="mk-seta" aria-hidden="true">→</span></a>`;

/* a barra de especificação no pé de cada formato: medida, formatos, onde aparece */
const specs = itens => `<div class="mk-specs">${itens.map(([rot, val]) =>
  `<div class="mk-spec"><span class="mk-spec-r">${rot}</span><b class="mk-spec-v">${val}</b></div>`).join('')}</div>`;

/* ---- o campo do mapa de posições, desenhado (não é foto) --------------- */
const campoSvg = `<svg class="mk-campo" viewBox="0 0 300 380" role="img"
  aria-label="Desenho de um campo de futebol com as seis famílias de espaço publicitário marcadas à volta">
  <rect x="4" y="4" width="292" height="372" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
  <line x1="4" y1="190" x2="296" y2="190" stroke="currentColor" stroke-width="2"/>
  <circle cx="150" cy="190" r="42" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="150" cy="190" r="3" fill="currentColor"/>
  <rect x="80" y="4" width="140" height="58" fill="none" stroke="currentColor" stroke-width="2"/>
  <rect x="115" y="4" width="70" height="24" fill="none" stroke="currentColor" stroke-width="2"/>
  <rect x="80" y="318" width="140" height="58" fill="none" stroke="currentColor" stroke-width="2"/>
  <rect x="115" y="352" width="70" height="24" fill="none" stroke="currentColor" stroke-width="2"/>
</svg>`;

const posicoes = [
  ['Titulares', 'topo das telas e pontos de maior atenção'],
  ['Meio-campo', 'regiões centrais e fluxos principais'],
  ['Gramado', 'espaços nativos dentro do jogo'],
  ['Bola parada', 'pausas, gols e decisões-chave'],
  ['Resenha', 'espaço exclusivo para marcas em destaque'],
  ['Laterais', 'barras de apoio constante'],
];

const colunaPos = (de, ate, lado) => `<div class="mk-poscol ${lado}">
  ${posicoes.slice(de, ate).map(([t, d]) => `<div class="mk-pos">
    <span class="mk-pos-b" aria-hidden="true"></span>
    <span class="mk-pos-t"><b>${t}</b><span>${d}</span></span>
  </div>`).join('')}
</div>`;

/* ---- formulário -------------------------------------------------------- */
const formulario = `<form class="mk-form" id="mk-form" novalidate>
  <div class="mk-form-hd">
    <span class="mk-form-ic" aria-hidden="true">✉</span>
    <span class="mk-form-hdt"><b>Fale com a gente</b><span>Preencha os dados abaixo e entraremos em contato.</span></span>
  </div>
  <label class="mk-campo-l" for="mk-empresa">Nome da empresa <i>*</i></label>
  <input class="mk-in" id="mk-empresa" name="empresa" type="text" autocomplete="organization"
    placeholder="Digite o nome da sua empresa" required>
  <label class="mk-campo-l" for="mk-email">E-mail <i>*</i></label>
  <input class="mk-in" id="mk-email" name="email" type="email" autocomplete="email"
    placeholder="Digite o seu melhor e-mail" required>
  <label class="mk-campo-l" for="mk-formato">Formato de interesse</label>
  <select class="mk-in" id="mk-formato" name="formato">
    <option value="">Selecione o formato</option>
    <option>Leaderboard de topo — Centroavante</option>
    <option>Laterais — Skyscrapers</option>
    <option>Placas do campo</option>
    <option>Vitrine da barra lateral — Volante</option>
    <option>Modo Resenha — cota exclusiva</option>
    <option>Ainda não sei — quero conhecer tudo</option>
  </select>
  <label class="mk-campo-l" for="mk-msg">Mensagem (opcional)</label>
  <textarea class="mk-in mk-ta" id="mk-msg" name="mensagem" rows="3"
    placeholder="Conte um pouco mais sobre sua ideia"></textarea>
  <div class="mk-erro" id="mk-erro" hidden></div>
  <button class="mk-enviar" id="mk-enviar" type="submit">
    <span>Enviar contato</span><span class="mk-seta" aria-hidden="true">→</span></button>
  <p class="mk-fine"><span aria-hidden="true">🔒</span> Seus dados estão seguros. Usaremos apenas
    para contato comercial — veja a <a href="/privacidade/">Política de Privacidade</a>.</p>
</form>
<div class="mk-obrigado" id="mk-obrigado" hidden>
  <span class="mk-obrigado-ic" aria-hidden="true">✓</span>
  <b>Contato enviado.</b>
  <span>A nossa equipe responde no e-mail que você deixou. Se preferir adiantar,
    escreva para <a href="mailto:${CONTATO}">${CONTATO}</a>.</span>
</div>`;

/* O ENVIO VAI DIRETO AO SUPABASE, como o resto do site faz (ver public/src/net/ads.js): a chave
   publicavel + a RLS da tabela sao a autorizacao, e nao ha' servidor proprio no meio. A tabela
   exige `nome` nao vazio e um `@` no email — a validacao daqui e' a mesma, para o visitante ler
   o erro em portugues em vez de um 401 do Postgres.
   O formulario nao pede o nome da PESSOA, so' o da empresa (e' o desenho aprovado), entao
   `nome` recebe a empresa: preencher com um nome inventado seria pior do que repetir. */
const script = `
(function(){
  var SB='https://alxwgqvjmetjbbqtjkhx.supabase.co/rest/v1/retrofoot_media_kit';
  var KEY='sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';
  var f=document.getElementById('mk-form'), erro=document.getElementById('mk-erro'),
      btn=document.getElementById('mk-enviar'), ok=document.getElementById('mk-obrigado');
  if(!f) return;
  function falhar(m){ erro.textContent=m; erro.hidden=false; }
  f.addEventListener('submit', async function(ev){
    ev.preventDefault(); erro.hidden=true;
    var empresa=f.empresa.value.trim(), email=f.email.value.trim();
    if(!empresa) return falhar('Escreva o nome da sua empresa.');
    if(email.indexOf('@')<1 || email.indexOf('.')<0) return falhar('Confira o e-mail: parece incompleto.');
    btn.disabled=true; btn.classList.add('enviando');
    try{
      var r=await fetch(SB,{ method:'POST', headers:{
        'apikey':KEY, 'Authorization':'Bearer '+KEY, 'Content-Type':'application/json',
        'Content-Profile':'elifoot_v3', 'Prefer':'return=minimal' },
        body: JSON.stringify({ nome:empresa, empresa:empresa, email:email,
          objetivo: f.formato.value || null, observacao: f.mensagem.value.trim() || null,
          origem:'media-kit' }) });
      if(!r.ok) throw new Error('HTTP '+r.status);
      f.hidden=true; ok.hidden=false; ok.scrollIntoView({behavior:'smooth',block:'center'});
    }catch(e){
      btn.disabled=false; btn.classList.remove('enviando');
      falhar('Não deu para enviar agora. Tente de novo, ou escreva direto para ${CONTATO}.');
    }
  });
})();`;

/* ---- a página ---------------------------------------------------------- */

export const mediaKit = [{
  slug: 'media-kit', ready: true, semCabecalho: true, priority: 0.6, lastmod: '2026-09-05',
  schemaType: 'WebPage',
  title: 'Media Kit — anuncie no RetroFoot98',
  description: 'Os espaços publicitários do RetroFoot98: leaderboard de topo, laterais, placas do campo e a vitrine da barra lateral, com medidas, formatos e onde cada um aparece no jogo.',
  h1: 'Sua marca foi convocada',
  keywords: 'anunciar no retrofoot, media kit retrofoot98, patrocínio jogo de futebol, publicidade em game brasileiro',
  script,
  body: `
<!-- ============================ 1 · ABERTURA ============================ -->
<section class="mk-hero">
  <div class="mk-hero-in">
    <div class="mk-hero-txt">
      <a class="mk-logo" href="/">${marca()}<span>Retrofoot<i>.com.br</i></span></a>
      <span class="mk-eyebrow">Media kit<span class="mk-rule"></span></span>
      <h1 class="mk-h1">Sua marca<br>foi convocada.</h1>
      <p class="mk-lead">No RetroFoot, a sua marca entra em campo de verdade: visibilidade em
        momentos decisivos, presença ao longo da jornada do jogador e conexão com uma comunidade
        apaixonada por futebol.</p>
      <div class="mk-pilares">
        <div class="mk-pilar"><span class="mk-pilar-ic" aria-hidden="true">◎</span>
          <b>Visibilidade que joga junto</b>
          <span>A sua marca aparece onde a atenção do jogador está.</span></div>
        <div class="mk-pilar"><span class="mk-pilar-ic" aria-hidden="true">👕</span>
          <b>Presença ao longo da temporada</b>
          <span>Do primeiro clique ao apito final, a exposição acompanha a jornada.</span></div>
        <div class="mk-pilar"><span class="mk-pilar-ic" aria-hidden="true">🏆</span>
          <b>Conexão com quem ama o jogo</b>
          <span>Futebol, gestão e nostalgia numa comunidade engajada.</span></div>
      </div>
      ${cta()}
    </div>
    <div class="mk-hero-arte" aria-hidden="true">
      <div class="mk-bandeira">
        <span class="mk-mastro"></span>
        <span class="mk-pano">${marca()}<b>Retrofoot<i>.com.br</i></b></span>
      </div>
      <span class="mk-linha-campo"></span>
    </div>
  </div>
</section>

<!-- ========================= 2 · MAPA DE POSIÇÕES ======================== -->
<section class="mk-sec mk-mapa">
  <h2 class="mk-h2">Onde a sua marca entra em campo.</h2>
  <p class="mk-sub">Do primeiro clique ao apito final, o RetroFoot distribui a sua marca por toda
    a experiência do jogador.</p>
  <span class="mk-rule mk-rule-b"></span>
  <div class="mk-nums">
    <div class="mk-num"><span class="mk-num-ic" aria-hidden="true">◎</span>
      <b>8</b><span class="mk-num-t">posições publicitárias</span>
      <span class="mk-num-d">espalhadas por toda a jornada do jogador.</span></div>
    <div class="mk-num"><span class="mk-num-ic" aria-hidden="true">★</span>
      <b>1</b><span class="mk-num-t">cota exclusiva</span>
      <span class="mk-num-d">no Modo Resenha.</span></div>
    <div class="mk-num"><span class="mk-num-ic" aria-hidden="true">🏆</span>
      <b>100<small>%</small></b><span class="mk-num-t">integrada</span>
      <span class="mk-num-d">à experiência do jogo.</span></div>
  </div>
  <h3 class="mk-h3">Posições estratégicas para a sua marca.</h3>
  <div class="mk-mapa-cx">
    ${colunaPos(0, 3, 'esq')}
    ${campoSvg}
    ${colunaPos(3, 6, 'dir')}
  </div>
  <p class="mk-assinatura"><span aria-hidden="true">👟</span> Monte a sua estratégia.
    Escale a sua marca. <b>Entre em campo.</b></p>
</section>

<!-- ======================= 3 · LEADERBOARD DE TOPO ====================== -->
<section class="mk-sec mk-formato">
  <div class="mk-fm-txt">
    <span class="mk-eyebrow amarelo">Sempre na cara do gol<span class="mk-rule"></span></span>
    <h2 class="mk-h2 italico">Feito para decidir</h2>
    <p class="mk-sub">O formato de topo acompanha o treinador nas principais telas do jogo.</p>
    <span class="mk-chip"><b>Nome técnico:</b> Leaderboard de topo</span>
    <h3 class="mk-apelido">Centroavante</h3>
    <p class="mk-p">Posicionado no alto da interface, este espaço aparece nas principais páginas do
      RetroFoot. Ideal para máxima visibilidade e construção de marca.</p>
    <p class="mk-porque">Por que jogar nesta posição?</p>
    ${check(['Alta frequência', 'Presença recorrente', 'Posição de destaque', 'Cobertura ampla'])}
    ${cta()}
  </div>
  <div class="mk-fm-arte">
    <figure class="mk-shot"><img src="/img/mediakit/topo.jpg" width="1600" height="1055"
      alt="O jogo aberto na tela de Formação, com a faixa de topo destacada em amarelo" loading="lazy" decoding="async">
      <figcaption>O espaço destacado no jogo a correr.</figcaption></figure>
    ${specs([['Desktop', '970 × 90'], ['Mobile', '320 × 100'], ['Formatos', 'JPG · PNG · WEBP'], ['Aparece em', 'páginas principais']])}
  </div>
</section>

<!-- ============================ 4 · LATERAIS ============================ -->
<section class="mk-sec mk-laterais">
  <span class="mk-eyebrow amarelo">Noventa minutos de atenção<span class="mk-rule"></span></span>
  <h2 class="mk-h2 italico">Pelos corredores do campo</h2>
  <p class="mk-sub">Durante a partida, a sua marca acompanha o torcedor do primeiro ao último lance.</p>
  <div class="mk-lat-grid">
    <div class="mk-lat">
      <h3 class="mk-apelido pequeno">Lateral esquerda</h3>
      <span class="mk-chip"><b>Nome técnico:</b> Skyscraper esquerdo</span>
      <p class="mk-p">Domine o corredor esquerdo da experiência ao vivo, com visibilidade contínua
        e alto impacto.</p>
      ${check(['Visibilidade contínua', 'Alto impacto', 'Ambiente premium'])}
      ${specs([['Desktop', '160 × 600'], ['Formatos', 'JPG · PNG · WEBP']])}
      <figure class="mk-shot"><img src="/img/mediakit/lateral-esq.jpg" width="1600" height="1055"
        alt="A rodada ao vivo com o trilho esquerdo destacado em amarelo" loading="lazy" decoding="async"></figure>
    </div>
    <div class="mk-lat">
      <h3 class="mk-apelido pequeno">Lateral direita</h3>
      <span class="mk-chip"><b>Nome técnico:</b> Skyscraper direito</span>
      <p class="mk-p">Acompanhe o torcedor do outro lado da transmissão, com presença constante
        durante o jogo.</p>
      ${check(['Visibilidade contínua', 'Alto impacto', 'Ambiente premium'])}
      ${specs([['Desktop', '160 × 600'], ['Formatos', 'JPG · PNG · WEBP']])}
      <figure class="mk-shot"><img src="/img/mediakit/lateral-dir.jpg" width="1600" height="1055"
        alt="A rodada ao vivo com o trilho direito destacado em amarelo" loading="lazy" decoding="async"></figure>
    </div>
  </div>
  <div class="mk-pacote">
    <div class="mk-pacote-id">
      <span class="mk-pacote-selo">Pacote recomendado</span>
      <b class="mk-pacote-n">Domínio das laterais</b>
      <span class="mk-pacote-d">Esquerda + direita. As duas laterais, um só resultado: a sua marca
        presente do primeiro ao último minuto.</span>
    </div>
    <div class="mk-pacote-bs">
      <div class="mk-pacote-b"><span aria-hidden="true">◉</span><b>Presença total</b>
        <span>A sua marca em todos os momentos do jogo.</span></div>
      <div class="mk-pacote-b"><span aria-hidden="true">◈</span><b>Maior lembrança</b>
        <span>Mais exposição, mais lembrança.</span></div>
      <div class="mk-pacote-b"><span aria-hidden="true">🏆</span><b>Impacto premium</b>
        <span>Ambiente nobre e altamente qualificado.</span></div>
    </div>
  </div>
</section>

<!-- ========================= 5 · PLACAS DO CAMPO ======================== -->
<section class="mk-sec mk-placas">
  <span class="mk-eyebrow amarelo">A sua marca cercando o jogo<span class="mk-rule"></span></span>
  <h2 class="mk-h2 italico">Patrocínio que veste o jogo</h2>
  <p class="mk-sub">Soluções integradas para posicionar a sua marca ao redor do gramado e nos
    momentos de maior conversa.</p>
  <div class="mk-pl-grid">
    <div class="mk-pl-txt">
      <h3 class="mk-apelido">À beira do gramado</h3>
      <span class="mk-chip"><b>Nome técnico:</b> Placa do campo</span>
      <p class="mk-p">As placas contornam o campo e ampliam a presença da sua marca durante o jogo.</p>
      ${cta()}
    </div>
    <figure class="mk-shot mk-shot-campo"><img src="/img/mediakit/placas.jpg" width="1600" height="1111"
      alt="A tela de Formação com as placas do campo destacadas, cada uma marcada com ANUNCIE AQUI"
      loading="lazy" decoding="async"></figure>
    <div class="mk-pl-cards">
      <div class="mk-pl-card"><b>Linha de fundo</b><span>Três placas deitadas, cada uma com arte e
        link próprios. O trio aparece acima <b>e</b> abaixo do campo — como o anel de placas dá a
        volta a um estádio de verdade.</span>
        ${specs([['Arte enviada', '340 × 44 px'], ['Placas', '3'], ['Aparições', '6']])}</div>
      <div class="mk-pl-card"><b>Corredor do gramado</b><span>Três placas verticais, independentes
        entre si. O trio aparece de cada lado do campo.</span>
        ${specs([['Arte enviada', '40 × 384 px'], ['Placas', '3'], ['Aparições', '6']])}</div>
      <div class="mk-pl-card destaque"><b>Takeover completo</b><span>As duas famílias, só suas: o
        anel inteiro de placas do campo com a sua marca.</span>
        ${specs([['Arte enviada', '340 × 44 + 40 × 384 px'], ['Placas', '6'], ['Aparições', '12']])}</div>
    </div>
  </div>
</section>

<!-- ====================== 6 · VITRINE DA BARRA LATERAL =================== -->
<section class="mk-sec mk-formato invertido">
  <div class="mk-fm-txt">
    <span class="mk-eyebrow amarelo">Pulmão do time<span class="mk-rule"></span></span>
    <h2 class="mk-h2 italico">Onde a bola mais passa</h2>
    <p class="mk-sub">No centro do jogo, a sua marca acompanha as decisões e a navegação.</p>
    <span class="mk-chip"><b>Nome técnico:</b> Vitrine da barra lateral</span>
    <h3 class="mk-apelido">Volante</h3>
    <p class="mk-p">Este espaço aparece nas áreas centrais das páginas do jogo, acompanhando elenco,
      competições e decisões do treinador. Ideal para presença recorrente e lembrança de marca.</p>
    <p class="mk-porque">Por que jogar nesta posição?</p>
    ${check(['Presença recorrente', 'Acompanha a navegação', 'Alta lembrança da marca'])}
    ${cta()}
  </div>
  <div class="mk-fm-arte">
    <figure class="mk-shot"><img src="/img/mediakit/vitrine.jpg" width="1600" height="1055"
      alt="O jogo aberto com a vitrine da barra lateral destacada em amarelo, abaixo do menu"
      loading="lazy" decoding="async">
      <figcaption>O espaço destacado no jogo a correr.</figcaption></figure>
    ${specs([['Desktop', '300 × 300'], ['Formatos', 'JPG · PNG · WEBP'], ['Aparece em', 'páginas principais']])}
  </div>
</section>

<!-- ============================= 7 · CONTATO ============================ -->
<section class="mk-sec mk-contato" id="falar">
  <div class="mk-ct-grid">
    <div class="mk-ct-txt">
      <span class="mk-eyebrow verde">Vamos conversar?<span class="mk-rule"></span></span>
      <h2 class="mk-h2">A sua marca também pode fazer parte <em>desta história</em></h2>
      <p class="mk-sub">Preencha o formulário e a nossa equipe entra em contato para apresentar
        todas as oportunidades de mídia no RetroFoot.</p>
      <div class="mk-ct-pilares">
        <div><span aria-hidden="true">◎</span><b>Posições estratégicas</b></div>
        <div><span aria-hidden="true">📊</span><b>Alto engajamento</b></div>
        <div><span aria-hidden="true">👥</span><b>Comunidade apaixonada</b></div>
      </div>
      <p class="mk-ct-email">Prefere e-mail? <a href="mailto:${CONTATO}">${CONTATO}</a></p>
    </div>
    <div class="mk-ct-form">${formulario}</div>
  </div>
  <p class="mk-golaco">Marque um golaço com a gente!</p>
</section>`,

  css: `
/* ===== MEDIA KIT =====================================================
   Desenho proprio: esta pagina nao herda a casca de artigo das outras (o
   miolo estreito de 760px, os H2 com filete). E' uma pagina comercial de
   largura inteira, com seccoes que alternam fundo.
   As medidas seguem o desenho a 1366px e descem para uma coluna a 900px. */
:root{ --mk-navy:#12276B; --mk-navy-2:#1B3C9E; --mk-am:#F2B90C; --mk-vd:#2E9E52;
  --mk-tinta:#14210f; --mk-cinza:#5a6b58; --mk-linha:#dde3dd; --mk-fundo:#f4f6f5 }
body{background:#fff}
main{max-width:none;margin:0;padding:0}
.mk-sec{max-width:1180px;margin:0 auto;padding:72px 24px}
/* DUAS LINHAS, como no desenho: o <br> parte depois de "SUA MARCA" e o resto tem de caber.
   Sem a largura minima a coluna encolhia ao ponto de "FOI CONVOCADA." partir tambem. */
.mk-h1{font-size:clamp(34px,5.4vw,70px);line-height:.98;letter-spacing:-.025em;color:var(--mk-navy);
  font-weight:900;margin:.18em 0 .4em;text-transform:uppercase;text-wrap:balance}
.mk-h2{font-size:clamp(27px,4.4vw,50px);line-height:1.06;letter-spacing:-.015em;color:var(--mk-navy);
  font-weight:900;margin:0 0 .3em;border:0;padding:0}
.mk-h2.italico{font-style:italic}
.mk-h2 em{font-style:normal;color:var(--mk-navy-2)}
.mk-h3{font-size:clamp(19px,2.4vw,28px);color:var(--mk-navy);font-weight:800;font-style:italic;
  margin:44px 0 16px}
.mk-sub{font-size:clamp(15px,1.5vw,17.5px);color:#33422f;margin:0 0 6px;max-width:62ch;line-height:1.55}
.mk-p{font-size:16px;line-height:1.6;color:#33422f;margin:.7em 0;max-width:46ch}
.mk-eyebrow{display:flex;align-items:center;gap:14px;font-size:13px;font-weight:900;
  letter-spacing:.14em;text-transform:uppercase;color:var(--mk-am);margin-bottom:6px}
.mk-eyebrow.verde{color:var(--mk-vd)}
.mk-rule{display:block;width:96px;height:3px;background:currentColor;border-radius:2px;flex:0 0 auto}
.mk-rule-b{display:block;width:120px;height:4px;background:var(--mk-am);border-radius:2px;margin:14px 0 0;color:var(--mk-am)}

/* ---- abertura ---- */
.mk-hero{background:linear-gradient(160deg,#fbfcfb 0%,#eef3f6 46%,#dfe9f2 100%);overflow:hidden;
  border-bottom:1px solid var(--mk-linha)}
.mk-hero-in{max-width:1180px;margin:0 auto;padding:30px 24px 64px;display:grid;
  grid-template-columns:minmax(520px,1.15fr) minmax(0,.8fr);gap:32px;align-items:center}
.mk-logo{display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--mk-navy);
  font-weight:900;font-size:21px;margin-bottom:34px}
.mk-logo i{font-style:normal;font-weight:600;color:#4a5a72}
.mk-marca{width:38px;height:38px;flex:0 0 auto}
.mk-lead{font-size:clamp(15.5px,1.6vw,18px);line-height:1.6;color:#2c3a45;max-width:52ch;margin:0 0 34px}
.mk-pilares{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-bottom:36px}
.mk-pilar{display:flex;flex-direction:column;gap:5px}
.mk-pilar-ic{width:34px;height:34px;display:grid;place-items:center;border:2px solid var(--mk-vd);
  border-radius:50%;color:var(--mk-vd);font-size:15px;margin-bottom:5px}
.mk-pilar b{font-size:13.5px;color:var(--mk-navy);line-height:1.25}
.mk-pilar span:last-child{font-size:13px;color:#4b5a52;line-height:1.45}
.mk-cta{display:inline-flex;align-items:center;gap:14px;background:var(--mk-navy);color:#fff;
  text-decoration:none;font-weight:800;font-size:14.5px;letter-spacing:.06em;text-transform:uppercase;
  padding:17px 28px;border-radius:6px;transition:background .15s,transform .15s;width:fit-content}
.mk-cta:hover{background:var(--mk-navy-2);transform:translateY(-1px)}
.mk-seta{font-size:17px;line-height:1}
/* a bandeira de escanteio, desenhada — ver a nota no topo deste ficheiro */
.mk-hero-arte{position:relative;min-height:340px;display:grid;place-items:center}
.mk-bandeira{position:relative;display:flex;align-items:flex-start;filter:drop-shadow(0 14px 30px rgba(18,39,107,.18))}
.mk-mastro{width:7px;height:290px;border-radius:4px;
  background:linear-gradient(180deg,#f2f5f7,#c3ccd6);flex:0 0 auto}
.mk-pano{margin-top:14px;margin-left:-2px;background:#fff;border-radius:3px;padding:26px 34px 30px;
  display:flex;flex-direction:column;gap:12px;transform:skewY(-4deg);
  box-shadow:0 8px 22px rgba(18,39,107,.13)}
.mk-pano b{font-size:24px;font-weight:900;color:var(--mk-navy);line-height:1}
.mk-pano i{font-style:normal;font-weight:600;color:#4a5a72}
.mk-pano .mk-marca{width:52px;height:52px}
.mk-linha-campo{position:absolute;left:-10%;right:-10%;bottom:8%;height:3px;background:#fff;
  opacity:.85;transform:rotate(-3deg)}

/* ---- mapa de posições ---- */
.mk-mapa{background:#fff}
.mk-nums{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:34px 0 0}
.mk-num{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto auto auto;
  column-gap:16px;align-items:center;border:1px solid #cfe3d3;border-radius:14px;padding:20px 22px;
  background:#fbfdfb}
.mk-num-ic{grid-row:1/4;width:52px;height:52px;display:grid;place-items:center;border:2px solid var(--mk-vd);
  border-radius:50%;color:var(--mk-vd);font-size:22px}
.mk-num b{font-size:34px;font-weight:900;color:var(--mk-navy);line-height:1}
.mk-num b small{font-size:20px}
.mk-num-t{font-size:14px;font-weight:800;color:var(--mk-tinta)}
.mk-num-d{font-size:12.5px;color:var(--mk-cinza);line-height:1.4}
.mk-mapa-cx{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:26px;
  align-items:center;border:1px solid #cfe3d3;border-radius:16px;padding:26px;background:#fbfdfb}
.mk-campo{width:230px;height:auto;color:#9db3a3;flex:0 0 auto}
.mk-poscol{display:flex;flex-direction:column;gap:26px}
.mk-poscol.dir{text-align:right}
.mk-pos{display:flex;align-items:flex-start;gap:12px}
.mk-poscol.dir .mk-pos{flex-direction:row-reverse}
.mk-pos-b{width:13px;height:13px;border-radius:50%;border:3px solid var(--mk-vd);flex:0 0 auto;margin-top:3px}
.mk-pos-t{display:flex;flex-direction:column;gap:3px;min-width:0}
.mk-pos-t b{font-size:14px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--mk-navy)}
.mk-pos-t span{font-size:13px;color:var(--mk-cinza);line-height:1.45}
.mk-assinatura{display:flex;align-items:center;justify-content:center;gap:10px;margin:34px 0 0;
  font-size:clamp(16px,2vw,21px);font-style:italic;font-weight:800;color:var(--mk-navy);text-align:center}
.mk-assinatura b{color:var(--mk-vd)}

/* ---- um formato ---- */
.mk-formato{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:44px;align-items:center}
.mk-formato.invertido .mk-fm-txt{order:2}
.mk-formato:nth-of-type(even){background:var(--mk-fundo)}
.mk-chip{display:inline-block;border:1.5px solid var(--mk-navy);border-radius:8px;padding:7px 14px;
  font-size:13px;color:#33422f;margin:14px 0 4px}
.mk-chip b{color:var(--mk-navy)}
.mk-apelido{font-size:clamp(26px,3.4vw,40px);font-style:italic;font-weight:900;color:var(--mk-navy);
  margin:.15em 0 .25em;letter-spacing:-.01em}
.mk-apelido.pequeno{font-size:clamp(20px,2.4vw,26px);margin-bottom:.3em}
.mk-porque{font-size:17px;font-weight:800;color:var(--mk-navy);margin:22px 0 10px}
.mk-check{list-style:none;margin:0 0 26px;padding:0;display:flex;flex-direction:column;gap:9px}
.mk-check li{display:flex;align-items:center;gap:11px;font-size:15.5px;color:#33422f;margin:0}
.mk-tick{width:21px;height:21px;flex:0 0 auto;display:grid;place-items:center;border-radius:50%;
  border:2px solid var(--mk-vd);color:var(--mk-vd);font-size:11px;font-weight:900}
.mk-shot{margin:0;background:#fff;border:1px solid var(--mk-linha);border-radius:12px;padding:8px;
  box-shadow:0 6px 20px rgba(18,39,107,.07)}
.mk-shot img{border-radius:7px;display:block;width:100%;height:auto}
.mk-shot figcaption{font-size:12.5px;color:var(--mk-cinza);text-align:center;margin-top:8px}
.mk-specs{display:flex;flex-wrap:wrap;gap:0;margin-top:14px;background:#fff;border:1px solid var(--mk-linha);
  border-radius:12px;overflow:hidden}
.mk-spec{flex:1 1 auto;min-width:120px;padding:13px 18px;display:flex;flex-direction:column;gap:3px;
  border-right:1px solid var(--mk-linha)}
.mk-spec:last-child{border-right:0}
.mk-spec-r{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mk-cinza);font-weight:700}
.mk-spec-v{font-size:14px;color:var(--mk-navy);font-weight:800}

/* ---- laterais ---- */
.mk-laterais{background:var(--mk-fundo)}
.mk-lat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px;margin-top:30px}
.mk-lat{background:#fff;border:1px solid var(--mk-linha);border-radius:16px;padding:26px}
.mk-lat .mk-specs{background:#fbfdfb}
.mk-lat .mk-shot{margin-top:16px;box-shadow:none}
.mk-pacote{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.4fr);gap:30px;align-items:center;
  margin-top:26px;border:1.5px solid #cfe3d3;border-radius:16px;padding:26px 28px;background:#fbfdfb}
.mk-pacote-selo{display:block;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;
  color:var(--mk-vd);margin-bottom:6px}
.mk-pacote-n{display:block;font-size:clamp(21px,2.6vw,28px);font-style:italic;font-weight:900;
  color:var(--mk-navy);margin-bottom:8px}
.mk-pacote-d{font-size:14px;color:#33422f;line-height:1.5}
.mk-pacote-bs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;
  border-left:1px solid var(--mk-linha);padding-left:30px}
.mk-pacote-b{display:flex;flex-direction:column;gap:4px;text-align:center;align-items:center}
.mk-pacote-b>span:first-child{width:44px;height:44px;display:grid;place-items:center;border-radius:50%;
  border:2px solid var(--mk-vd);color:var(--mk-vd);font-size:19px;margin-bottom:4px}
.mk-pacote-b b{font-size:14px;color:var(--mk-vd)}
.mk-pacote-b span:last-child{font-size:12.5px;color:var(--mk-cinza);line-height:1.45}

/* ---- placas ---- */
.mk-pl-grid{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1fr) minmax(0,.9fr);
  gap:26px;align-items:start;margin-top:30px}
.mk-pl-cards{display:flex;flex-direction:column;gap:14px}
.mk-pl-card{background:#fff;border:1px solid var(--mk-linha);border-radius:14px;padding:18px 20px}
.mk-pl-card.destaque{border-color:var(--mk-am);box-shadow:0 0 0 3px rgba(242,185,12,.14)}
.mk-pl-card b{display:block;font-size:15.5px;color:var(--mk-navy);margin-bottom:3px}
.mk-pl-card>span{display:block;font-size:13.5px;color:var(--mk-cinza);line-height:1.45}
.mk-pl-card .mk-specs{margin-top:12px;background:#fbfdfb}
.mk-shot-campo img{max-height:560px;object-fit:contain;background:#0d1a12}

/* ---- contato ---- */
.mk-contato{background:linear-gradient(170deg,#eef3f6,#dfe9f2)}
.mk-ct-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.95fr);gap:44px;align-items:center}
.mk-ct-txt .mk-h2{text-transform:uppercase;font-size:clamp(26px,3.8vw,44px)}
.mk-ct-pilares{display:flex;flex-wrap:wrap;gap:0;margin:28px 0 18px}
.mk-ct-pilares>div{flex:1 1 130px;display:flex;flex-direction:column;align-items:center;gap:7px;
  text-align:center;padding:0 14px;border-right:1px solid #c8d5df}
.mk-ct-pilares>div:last-child{border-right:0}
.mk-ct-pilares>div>span{width:44px;height:44px;display:grid;place-items:center;border-radius:50%;
  background:#dff0e4;color:var(--mk-vd);font-size:19px}
.mk-ct-pilares b{font-size:13.5px;color:var(--mk-navy);line-height:1.3}
.mk-ct-email{font-size:14px;color:#33422f}
.mk-form,.mk-obrigado{background:#fff;border-radius:18px;padding:28px 30px;
  box-shadow:0 14px 40px rgba(18,39,107,.12)}
.mk-form-hd{display:flex;align-items:center;gap:14px;margin-bottom:20px}
.mk-form-ic{width:46px;height:46px;flex:0 0 auto;display:grid;place-items:center;border-radius:50%;
  background:var(--mk-navy);color:#fff;font-size:20px}
.mk-form-hdt{display:flex;flex-direction:column;gap:2px}
.mk-form-hdt b{font-size:19px;font-weight:900;letter-spacing:.03em;text-transform:uppercase;color:var(--mk-navy)}
.mk-form-hdt span{font-size:13px;color:var(--mk-cinza)}
.mk-campo-l{display:block;font-size:13.5px;font-weight:700;color:#33422f;margin:14px 0 6px}
.mk-campo-l i{font-style:normal;color:#c0392b}
.mk-in{width:100%;font:inherit;font-size:15px;color:var(--mk-tinta);background:#fff;
  border:1px solid #cdd6cd;border-radius:9px;padding:12px 14px}
.mk-in::placeholder{color:#9aa79e}
.mk-in:focus{outline:2px solid var(--mk-navy-2);outline-offset:1px;border-color:transparent}
.mk-ta{resize:vertical;min-height:88px}
.mk-enviar{width:100%;margin-top:20px;display:inline-flex;align-items:center;justify-content:center;gap:12px;
  background:var(--mk-navy);color:#fff;font:inherit;font-weight:800;font-size:15px;letter-spacing:.06em;
  text-transform:uppercase;border:0;border-radius:9px;padding:16px 20px;cursor:pointer;transition:background .15s}
.mk-enviar:hover{background:var(--mk-navy-2)}
.mk-enviar:disabled{opacity:.6;cursor:progress}
.mk-enviar .mk-seta{color:var(--mk-am)}
.mk-erro{margin-top:14px;background:#fdecea;border:1px solid #f5c6c0;color:#93261a;border-radius:9px;
  padding:11px 14px;font-size:14px}
.mk-fine{font-size:12px;color:var(--mk-cinza);text-align:center;margin:14px 0 0;line-height:1.5}
.mk-obrigado{display:flex;flex-direction:column;align-items:center;gap:9px;text-align:center;padding:44px 30px}
/* O ATRIBUTO hidden PERDE PARA O display. A regra .mk-obrigado{display:flex} vencia o
   [hidden]{display:none} do browser, e o cartao de "contato enviado" aparecia por baixo do
   formulario desde o primeiro carregamento — a pagina dizia que a mensagem tinha sido enviada
   antes de alguem escrever nada. Vale para todo bloco desta pagina que troca de display. */
.mk-obrigado[hidden],.mk-form[hidden],.mk-erro[hidden]{display:none}
.mk-obrigado-ic{width:54px;height:54px;display:grid;place-items:center;border-radius:50%;
  background:#dff0e4;color:var(--mk-vd);font-size:26px;font-weight:900}
.mk-obrigado b{font-size:20px;color:var(--mk-navy)}
.mk-obrigado span:last-child{font-size:14.5px;color:#33422f;line-height:1.55;max-width:40ch}
.mk-golaco{margin:40px 0 0;text-align:center;font-size:clamp(18px,2.4vw,26px);font-style:italic;
  font-weight:900;color:var(--mk-navy)}

/* ---- uma coluna ---- */
@media (max-width:900px){
  .mk-sec{padding:52px 18px}
  .mk-hero-in{grid-template-columns:minmax(0,1fr);padding:24px 18px 44px}
  .mk-hero-arte{display:none}
  .mk-pilares{grid-template-columns:minmax(0,1fr);gap:16px}
  .mk-nums,.mk-lat-grid,.mk-pacote-bs{grid-template-columns:minmax(0,1fr)}
  .mk-mapa-cx{grid-template-columns:minmax(0,1fr);justify-items:center}
  .mk-poscol.dir{text-align:left}
  .mk-poscol.dir .mk-pos{flex-direction:row}
  .mk-campo{order:-1;width:190px}
  .mk-formato,.mk-pl-grid,.mk-ct-grid,.mk-pacote{grid-template-columns:minmax(0,1fr)}
  .mk-formato.invertido .mk-fm-txt{order:0}
  .mk-pacote-bs{border-left:0;border-top:1px solid var(--mk-linha);padding-left:0;padding-top:22px}
  .mk-cta,.mk-check{width:100%}
  .mk-spec{min-width:50%}
}`,
}];
