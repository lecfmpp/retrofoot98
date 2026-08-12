/* ============================================================================
   ADS — entrega dos espaços publicitários no jogo
   ----------------------------------------------------------------------------
   O painel dos sócios (admin.retrofoot98.com.br) publica um criativo por CHAVE;
   aqui o jogo lê o que está no ar e desenha. As chaves são o contrato entre os
   dois lados e estão em elifoot_v3.ad_spaces — nunca renomear de um lado só:

     rf98.anchor.bottom  · faixa fixa no rodapé (abertura + hub)
     rf98.hub.sidebar    · retângulo 300×250 na coluna direita do hub
     rf98.match.halftime · modal do intervalo da partida
     rf98.copa.sponsor   · cabeçalho dos modais de copa
     rf98.auction.footer · faixa do modal de leilão
     rf98.loading.splash · tela de carregamento do jogo
     rf98.live.inline    · faixa entre divisões na partida ao vivo
     rf98.resenha.invite · cartão do convite da Resenha

   POR QUE FETCH CRU E NÃO O SDK: este arquivo é um <script> clássico que roda
   ANTES do SDK do Supabase estar pronto (ele carrega com async). Uma leitura
   pública de uma tabela com RLS de leitura aberta não precisa de SDK — é um GET
   com a chave publicável, igual ao que o SDK faria.

   REGRA DE OURO: espaço sem criativo NÃO é desenhado. Enquanto os sócios não
   publicarem nada, o jogo fica exatamente como estava.
   ============================================================================ */
(function(){
'use strict';

const SB_URL = 'https://alxwgqvjmetjbbqtjkhx.supabase.co';
const SB_KEY = 'sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';
const REST   = SB_URL + '/rest/v1/';
const CACHE_KEY = 'rf98:ads:v1';
const REFRESH_MS = 5*60*1000;   // o painel publica a qualquer hora; 5 min é o atraso máximo

let porChave = {};              // chave -> criativo no ar
let carregado = false;

/* cache local: a primeira pintura da sessão não espera a rede (e uma queda de
   rede não apaga o anúncio de quem já o tinha visto) */
try{
  const c = JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
  if(c && c.t && (Date.now()-c.t) < 24*3600*1000) porChave = c.v||{};
}catch(e){}

async function carregar(){
  try{
    const url = REST + 'ad_creatives?select=id,chave_espaco,ficheiro_url,link_destino,mime,no_ar_ate'
              + '&ativo=eq.true&order=criado_em.desc';
    const r = await fetch(url, { headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY,
      'Accept-Profile':'elifoot_v3' } });
    if(!r.ok) throw new Error('HTTP '+r.status);
    const linhas = await r.json();
    const novo = {};
    const agora = Date.now();
    linhas.forEach(c => {
      if(c.no_ar_ate && new Date(c.no_ar_ate).getTime() < agora) return;
      if(!novo[c.chave_espaco]) novo[c.chave_espaco] = c;   // o mais recente vence (order desc)
    });
    porChave = novo; carregado = true;
    try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ t:Date.now(), v:novo })); }catch(e){}
    // redesenha só se já havia tela montada (a primeira carga acontece antes disso)
    if(typeof cdraw==='function' && typeof CL!=='undefined' && CL && CL.screen) cdraw();
  }catch(e){
    // sem rede/sem inventário: fica com o cache (ou vazio) e tenta de novo no próximo ciclo
    carregado = true;
  }
}
carregar();
setInterval(carregar, REFRESH_MS);

function get(chave){ return porChave[chave] || null; }

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

function clique(chave){
  const c = get(chave); if(!c) return;
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
function html(chave, opts){
  const c = get(chave); if(!c) return '';
  opts = opts || {};
  const video = /video|mp4/i.test(c.mime||'');
  const arte = video
    ? `<video class="rf-ad-art" src="${esc(c.ficheiro_url)}" autoplay muted loop playsinline></video>`
    : `<img class="rf-ad-art" src="${esc(c.ficheiro_url)}" alt="Publicidade" loading="lazy">`;
  const clicavel = c.link_destino ? ` role="link" tabindex="0" style="cursor:pointer"` : '';
  return `<div class="rf-ad ${opts.cls||''}" data-ad-chave="${esc(chave)}" data-ad-id="${esc(c.id)}"
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

window.ADS = { get, html, clique, scan, evento, refGuardado, get carregado(){ return carregado; } };
})();
