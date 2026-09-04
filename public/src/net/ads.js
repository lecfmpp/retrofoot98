/* ============================================================================
   ADS — entrega dos espaços publicitários no jogo
   ----------------------------------------------------------------------------
   O painel dos sócios (admin.retrofoot98.com.br) publica um criativo por CHAVE;
   aqui o jogo lê o que está no ar e desenha. As chaves são o contrato entre os
   dois lados e estão em elifoot_v3.ad_spaces — nunca renomear de um lado só:

     rf98.top.970x90     · faixa 970×90 no topo de todas as páginas
     rf98.anchor.bottom  · APOSENTADO em 18/08/2026 — era a faixa fixa no rodapé, e saiu por
                           comer a base da tela em todas as páginas. Nada renderiza este espaço
                           hoje (ver rfAncoraHTML em ui/rf26.js e anchorAdHTML em ui/main.js).
     rf98.hub.sidebar    · retângulo 300×250 na coluna do hub
     rf98.match.halftime · modal do intervalo da partida
     rf98.copa.sponsor   · cabeçalho dos modais de copa
     rf98.auction.footer · faixa do modal de leilão
     rf98.loading.splash · tela de carregamento do jogo
     rf98.live.inline    · faixa 468×60 na rodada ao vivo
     rf98.resenha.invite · cartão do convite da Resenha
     rf98.rail.esq/dir   · trilhos 160×600 da rodada ao vivo e do Camarote
     rf98.camarote.logo1..5 · os cinco lugares da banda do Camarote. Cada criativo
                           leva o SEU botão (cta_texto/cta_bg/cta_fg), e o botão à direita da
                           banda é o do lugar em destaque — o destaque gira com o relógio.
     rf98.sidebar.vitrine · caixa quadrada na barra lateral, abaixo do menu. Sem criativo
                           publicado, o lugar mostra a vitrine da Moda EC (criativo de casa,
                           ver rfSbAnuncioHTML em ui/rf26.js).
     rf98.pausa.barra    · patrocínio de apresentação (pausa da Resenha e rodada de copa).
                           No Camarote ele cobre o 1º lugar enquanto logo1 estiver vazio.

   POR QUE FETCH CRU E NÃO O SDK: este arquivo é um <script> clássico que roda
   ANTES do SDK do Supabase estar pronto (ele carrega com async). Uma leitura
   pública de uma tabela com RLS de leitura aberta não precisa de SDK — é um GET
   com a chave publicável, igual ao que o SDK faria.

   O ESPAÇO É SEMPRE VISÍVEL (desde ago/2026). A regra era o contrário — espaço
   sem criativo não era desenhado — e o efeito era que oito das dez chaves não
   existiam na tela: não dava para ver o inventário nem conferir se ele cabia no
   desenho. Quem desenha o lugar vazio é rfAdEspaco (ui/rf26.js), com a medida
   EXATA do anúncio; publicar não mexe no layout, só troca o conteúdo do lugar
   que já estava reservado. `html()` aqui continua a devolver '' sem criativo —
   é o chamador que decide o que pôr no lugar.
   ============================================================================ */
(function(){
'use strict';

const SB_URL = 'https://alxwgqvjmetjbbqtjkhx.supabase.co';
const SB_KEY = 'sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';
const REST   = SB_URL + '/rest/v1/';
const CACHE_KEY = 'rf98:ads:v1';
const REFRESH_MS = 5*60*1000;   // o painel publica a qualquer hora; 5 min é o atraso máximo

let porChave = {};              // chave -> criativo no ar
let desligados = {};            // chave -> true, para os espacos que o painel desligou
let carregado = false;

/* cache local: a primeira pintura da sessão não espera a rede (e uma queda de
   rede não apaga o anúncio de quem já o tinha visto) */
try{
  const c = JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
  if(c && c.t && (Date.now()-c.t) < 24*3600*1000){ porChave = c.v||{}; desligados = c.off||{}; }
}catch(e){}

async function carregar(){
  try{
    /* `no_ar_de` VEM JUNTO, e não é detalhe: o painel só mostra como no ar o
       criativo cuja janela já começou (ver admin_rf98.publicidade), e o jogo
       lia apenas a data de FIM. Uma campanha marcada para o mês seguinte
       entrava no ar no dia em que era carregada — queimando voo que o
       patrocinador comprou para outra data, e divergindo do que o painel
       mostrava a quem a vendeu. */
    const url = REST + 'ad_creatives?select=id,chave_espaco,ficheiro_url,link_destino,mime,no_ar_de,no_ar_ate'
              /* cta_*: o botao do patrocinador na banda do Camarote — texto e cores viajam
                 com o criativo, e a URL do botao e' o mesmo link_destino do logo */
              + ',cta_texto,cta_bg,cta_fg'
              /* a arte do telemovel do MESMO criativo: um espaco com duas medidas tem
                 dois ficheiros, e quem escolhe entre eles e' o browser (ver html()) */
              + ',ficheiro_url_mob,mime_mob'
              /* posicao: qual PLACA do espaco o criativo ocupa. Nulo em todos os espacos
                 normais -- so' as placas do campo a usam (ver get() e ads.js abaixo) */
              + ',posicao'
              + '&ativo=eq.true&order=criado_em.desc';
    const r = await fetch(url, { headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY,
      'Accept-Profile':'elifoot_v3' } });
    if(!r.ok) throw new Error('HTTP '+r.status);
    const linhas = await r.json();
    const novo = {};
    const agora = Date.now();
    linhas.forEach(c => {
      if(c.no_ar_de  && new Date(c.no_ar_de ).getTime() > agora) return;   // ainda não começou
      if(c.no_ar_ate && new Date(c.no_ar_ate).getTime() < agora) return;   // já terminou
      /* UM ESPACO PODE TER VARIAS PLACAS. A chave sozinha deixou de bastar: as placas
         do campo guardam um criativo POR POSICAO, cada uma com o seu link. A posicao
         entra na chave do mapa (`chave#2`) em vez de um segundo mapa -- assim o cache
         local, o `order by` e o "o mais recente vence" continuam a valer tal e qual
         para os dois casos. Espaco normal continua a ser `chave` e mais nada. */
      const k = (c.posicao==null) ? c.chave_espaco : (c.chave_espaco+'#'+c.posicao);
      if(!novo[k]) novo[k] = c;   // o mais recente vence (order desc)
    });
    porChave = novo;

    /* OS ESPACOS DESLIGADOS VEM NUMA SEGUNDA LEITURA, e so' eles: `ligado=eq.false`
       devolve tipicamente ZERO linhas, que e' o custo certo para o caso normal. O
       espaco desligado nao e' "sem criativo" -- e' um lugar que o jogo nao desenha
       de todo, nem com o marcador, nem com o criativo de casa. Quem trata disso e'
       rfAdEspaco (ui/rf26.js) e os poucos sitios que embrulham o espaco num
       contentor proprio, que tem de sair junto para nao ficar buraco. */
    try{
      const ro = await fetch(REST + 'ad_spaces?select=chave&ligado=eq.false',
        { headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY, 'Accept-Profile':'elifoot_v3' } });
      if(ro.ok){ const off = {}; (await ro.json()).forEach(e => { off[e.chave] = true; }); desligados = off; }
    }catch(e){}

    carregado = true;
    try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ t:Date.now(), v:novo, off:desligados })); }catch(e){}
    // redesenha só se já havia tela montada (a primeira carga acontece antes disso)
    if(typeof cdraw==='function' && typeof CL!=='undefined' && CL && CL.screen) cdraw();
  }catch(e){
    // sem rede/sem inventário: fica com o cache (ou vazio) e tenta de novo no próximo ciclo
    carregado = true;
  }
}
carregar();
setInterval(carregar, REFRESH_MS);

/* O ESPACO ESTA LIGADO? Desconhecido conta como ligado, de proposito: uma chave
   que ainda nao esta no inventario (ou uma leitura que falhou) tem de continuar a
   desenhar como sempre. So' o "nao" explicito do painel apaga um lugar. */
function ligado(chave){ return !desligados[chave]; }
/* `pos` so' e' passada pelos espacos de placas; sem ela, o comportamento de sempre.
   Espaco desligado nao devolve criativo nenhum -- assim nem os pontos de desenho
   que nao passam por rfAdEspaco (as placas do campo, a banda do Camarote) precisam
   de perguntar duas vezes. */
function get(chave, pos){
  if(desligados[chave]) return null;
  return porChave[pos==null?chave:(chave+'#'+pos)] || null;
}
/* quantas placas daquele espaco tem arte publicada — o jogo usa para saber se
   desenha as placas de casa ou as vendidas */
function temPlaca(chave, pos){ return !!get(chave, pos); }

function evento(chave, criativoId, tipo){
  try{
    fetch(REST + 'rpc/rf_ad_event', {
      method:'POST', keepalive:true,
      headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY,
                'Content-Type':'application/json', 'Content-Profile':'elifoot_v3' },
      body: JSON.stringify({ p_chave:chave, p_criativo:criativoId||null, p_tipo:tipo })
    });
  }catch(e){}
}

/* IMPRESSÃO AO ENTRAR NO VIEWPORT (não ao desenhar): o jogo remonta a tela
   inteira a cada cdraw(), então contar no render inflaria tudo. Uma impressão
   por chave a cada 30 s por sessão — é o que separa "apareceu" de "ficou
   piscando enquanto o usuário mexia no elenco". */
const ultimaImp = {};
const observador = ('IntersectionObserver' in window) ? new IntersectionObserver(entradas => {
  entradas.forEach(en => {
    if(!en.isIntersecting) return;
    const chave = en.target.getAttribute('data-ad-chave');
    const id = en.target.getAttribute('data-ad-id');
    if(!chave) return;
    const t = Date.now();
    if(ultimaImp[chave] && t-ultimaImp[chave] < 30000) return;
    ultimaImp[chave] = t;
    evento(chave, id, 'impressao');
    try{ if(typeof gtag==='function') gtag('event','ad_impression',{ slot:chave }); }catch(e){}
  });
}, { threshold: 0.5 }) : null;

/* chamado depois de cada cdraw() — liga o observador aos blocos recém-criados e avisa o
   CSS quando a faixa âncora está no ar (ela é `fixed`: sem reservar espaço no fim da
   página, taparia o rodapé e a última linha de qualquer tabela). */
function scan(){
  document.body.classList.toggle('rf-tem-anchor', !!document.querySelector('.rf-anchor'));
  if(!observador) return;
  document.querySelectorAll('[data-ad-chave]:not([data-ad-obs])').forEach(n => {
    n.setAttribute('data-ad-obs','1'); observador.observe(n);
  });
}

function clique(chave, pos){
  const c = get(chave, pos); if(!c) return;
  /* O EVENTO VAI NA CHAVE DO ESPACO, sem a posicao: e' por chave que o painel soma
     impressoes e cliques, e partir a soma em tres linhas novas mudaria o historico
     do espaco a meio. Quem quiser o numero de UMA placa tem o id do criativo, que
     vai gravado no mesmo evento. */
  evento(chave, c.id, 'clique');
  try{ if(typeof gtag==='function') gtag('event','ad_click',{ slot:chave }); }catch(e){}
  if(!c.link_destino) return;
  window.open(c.link_destino, '_blank', 'noopener,noreferrer');
}

function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, ch =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

/* HTML do criativo — imagem ou vídeo curto, com o rótulo "PUBLICIDADE" que o
   CSS já usa nos slots do jogo. Devolve '' quando o espaço está vazio, e é
   isso que faz o espaço simplesmente não existir. */
/* QUEM ESCOLHE ENTRE A ARTE DE DESKTOP E A DO TELEMOVEL E' O BROWSER, não o JS.
   Um espaço vende duas medidas (ex.: 970×90 e 320×100) e o criativo pode trazer
   as duas artes. Com `<picture>` + `<source media>`, a troca acontece no ponto de
   corte do CSS e volta a acontecer se a janela mudar de tamanho — um `if` sobre
   window.innerWidth no momento do desenho ficaria preso à largura de quando a
   tela foi montada, e o jogo redesenha muito mais do que redimensiona.

   760px é o MESMO ponto de corte do CSS (ver as media queries de rf26.css). Os
   dois têm de andar juntos: se a arte troca em 760 e a caixa troca de proporção
   noutro número, existe uma faixa de larguras em que a arte não cabe na caixa.

   `tem-mob` avisa o CSS de que existe arte de telemóvel, e é por ela que a caixa
   assume a proporção da medida móvel. Sem arte móvel a caixa segue a da arte de
   desktop, que é a única que há. */
const RF_AD_CORTE_MOB = '(max-width:760px)';
function html(chave, opts){
  const c = get(chave); if(!c) return '';
  opts = opts || {};
  const video = /video|mp4/i.test(c.mime||'');
  const mob = c.ficheiro_url_mob || '';
  const videoMob = /video|mp4/i.test(c.mime_mob||'');
  let arte;
  if(video || (mob && videoMob)){
    /* vídeo não entra em <picture>: a troca por media query é do <source> de imagem.
       Com arte de telemóvel em vídeo o par continua a ser servido pelo desktop — o
       inventário de vídeo hoje é um espaço só (o intervalo), e ele não vende medida
       móvel diferente. */
    arte = `<video class="rf-ad-art" src="${esc(c.ficheiro_url)}" autoplay muted loop playsinline></video>`;
  } else if(mob){
    arte = `<picture><source media="${RF_AD_CORTE_MOB}" srcset="${esc(mob)}">`
         + `<img class="rf-ad-art" src="${esc(c.ficheiro_url)}" alt="Publicidade" loading="lazy"></picture>`;
  } else {
    arte = `<img class="rf-ad-art" src="${esc(c.ficheiro_url)}" alt="Publicidade" loading="lazy">`;
  }
  const clicavel = c.link_destino ? ` role="link" tabindex="0" style="cursor:pointer"` : '';
  return `<div class="rf-ad ${opts.cls||''}${mob?' tem-mob':''}" data-ad-chave="${esc(chave)}" data-ad-id="${esc(c.id)}"
    ${clicavel} onclick="ADS.clique('${esc(chave)}')">${arte}</div>`;
}

/* ===== REFERRAL DE PARCEIRO (?ref=CODIGO) =====
   Mesma mecânica dos anúncios — GET/POST cru com a chave publicável, porque isto roda
   deslogado, antes de o SDK existir. A VISITA é contada uma vez por código por dia (o
   mesmo link aberto cinco vezes é uma pessoa, não cinco). O código fica guardado até a
   pessoa criar conta, que pode ser dias depois — é o cadastro que interessa ao parceiro,
   e ele quase nunca acontece na primeira visita. Quem atribui a conta é o jogo, depois
   do cadastro (ver netAuthSignUp). */
const REF_KEY = 'rf98:ref';
(function referral(){
  let cod = null;
  try{ cod = new URLSearchParams(location.search).get('ref'); }catch(e){}
  if(!cod) return;
  cod = String(cod).trim().toUpperCase().slice(0,32);
  if(!cod) return;
  let guardado = null;
  try{ guardado = JSON.parse(localStorage.getItem(REF_KEY)||'null'); }catch(e){}
  // PRIMEIRO LINK VENCE: quem trouxe a pessoa foi o primeiro, não o último clicado
  if(!guardado || !guardado.cod){
    try{ localStorage.setItem(REF_KEY, JSON.stringify({ cod, t:Date.now() })); }catch(e){}
  }
  const hoje = new Date().toISOString().slice(0,10);
  const marca = 'rf98:refhit:'+cod+':'+hoje;
  try{ if(localStorage.getItem(marca)) return; localStorage.setItem(marca,'1'); }catch(e){}
  try{
    fetch(REST + 'rpc/rf_ref_hit', { method:'POST', keepalive:true,
      headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY,
                'Content-Type':'application/json', 'Content-Profile':'elifoot_v3' },
      body: JSON.stringify({ p_codigo: cod }) });
  }catch(e){}
})();
function refGuardado(){
  try{ const g = JSON.parse(localStorage.getItem(REF_KEY)||'null'); return (g && g.cod) || null; }catch(e){ return null; }
}

window.ADS = { get, ligado, temPlaca, html, clique, scan, evento, refGuardado, get carregado(){ return carregado; } };
})();
