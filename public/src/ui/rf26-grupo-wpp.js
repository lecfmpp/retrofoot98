/* =====================================================================
   GRUPO DO WHATSAPP — o convite para a resenha fora do jogo (23/09/2026)
   ---------------------------------------------------------------------
   Pacote do designer: "pacote-whatsapp" (LEIA-ME + telas/Grupo WhatsApp.dc.html).
   Três peças, todas apontando para o MESMO link (RF_WHATSAPP_URL):

   1a · MODAL PÓS-CADASTRO — uma vez só, logo depois de a conta ser criada
        (Solo: clLoginSignup em main.js; Resenha: clAuthDoSignup em
        net/local-transport.js). SÓ UM BOTÃO (23/09): o ✕ saiu; fecha no Esc e no clique fora.
        Desktop: cartão centrado. Abaixo de 760px: bottom sheet.
   1b · ABA DAS PÁGINAS PÚBLICAS — a home (CL.screen 'abertura') e as páginas
        estáticas de SEO (scripts/build-seo.mjs carrega ESTE ficheiro). Pílula no
        canto inferior direito, no desktop e no telefone; o clique abre o grupo.
   1c · ÁREA LOGADA — desktop: botão no pé da barra lateral (rfSidebarHTML chama
        rfWppSidebarHTML): um cartão só, que abre o grupo direto. Telefone: lingueta na borda
        direita, acima da barra do Jogar.

   QUATRO REGRAS QUE MANDAM NO DESENHO:

   1. UM FICHEIRO SÓ, SEM DEPENDÊNCIAS. As páginas de SEO não carregam nada do
      jogo; por isso o CSS vem injetado daqui, e tudo o que se usa do jogo (CL,
      isPhone, cdraw) é testado antes. Fora do jogo o módulo está em "modo
      público" e só existe a peça 1b.
   2. SEM LINK, NADA APARECE. RF_WHATSAPP_URL vazio = nenhuma das três peças é
      desenhada. Em localhost há um link de bancada para o layout poder ser visto.
   3. NUNCA POR CIMA DE UMA DECISÃO. As abas ficam em z-index 45 (o mesmo da
      Opinião: abaixo da barra do telefone, do chat, do Camarote, dos overlays de
      partida e dos modais), e além disso SOMEM enquanto houver modal, leilão,
      pênaltis ou partida ao vivo. Os modais que abrem sem cdraw() (overlayC,
      planos, pagamento) são apanhados por um MutationObserver no <body>.
   4. A TREMIDA É DE 10 EM 10 SEGUNDOS, e só nas peças recolhidas e visíveis.
      Quem já clicou em "Entrar" (rf_wpp_entrou) não é mais chamado: na área
      logada a peça encolhe para o ícone e para de tremer nas sessões seguintes.
   ===================================================================== */
(function(){
'use strict';

/* ===== O LINK DO GRUPO =====
   Colar aqui o convite (https://chat.whatsapp.com/...). Vazio = widget desligado
   em produção. É o único lugar: o jogo e as páginas de SEO leem este ficheiro. */
const RF_WHATSAPP_URL = 'https://chat.whatsapp.com/H1AuqFrKDqn4Dd2BicnXqV?mode=gi_t';
window.RF_WHATSAPP_URL = window.RF_WHATSAPP_URL || RF_WHATSAPP_URL;

const K_VISTO  = 'rf_wpp_modal_visto';
const K_ENTROU = 'rf_wpp_entrou';
const TREMIDA_MS = 10000;
const NO_JOGO = (typeof CL !== 'undefined');

function bancada(){ try{ return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); }catch(e){ return false; } }
function link(){
  const u = String(window.RF_WHATSAPP_URL || '').trim();
  if(u) return u;
  return bancada() ? 'https://chat.whatsapp.com/' : '';
}
function ler(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function gravar(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
/* "nas sessões seguintes": o estado é lido UMA vez, ao carregar. Clicar agora não
   faz a peça sumir debaixo do dedo — ela encolhe na próxima visita. */
const ENTROU_ANTES = ler(K_ENTROU) === '1';

function ev(nome, origem){ try{ if(typeof gtag==='function') gtag('event', nome, origem?{origem}:{}); }catch(e){} }
function noTelefone(){
  if(typeof isPhone==='function'){ try{ return isPhone(); }catch(e){} }
  try{ return window.matchMedia('(max-width:760px)').matches; }catch(e){ return window.innerWidth<=760; }
}
function escA(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

const ICONE = '<svg class="rf-wpp-ic" viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';
const CTA = 'Entrar no Whatsapp da Resenha';
function aLink(origem, cls, dentro){
  return `<a class="${cls}" href="${escA(link())}" target="_blank" rel="noopener" onclick="rfWppEntrou('${origem}')">${dentro}</a>`;
}

/* ===================== CSS (injetado: as páginas de SEO não têm o rf26.css) ===================== */
const CSS = `
.rf-wpp-ic{display:block;flex:0 0 auto}
#rf-wpp-pub,#rf-wpp-log,#rf-wpp-modal{font-family:'Space Grotesk',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  -webkit-font-smoothing:antialiased;box-sizing:border-box}
#rf-wpp-pub *,#rf-wpp-log *,#rf-wpp-modal *,.rf-wpp-sb *{box-sizing:border-box}
#rf-wpp-pub a,#rf-wpp-log a,#rf-wpp-modal a,.rf-wpp-sb a{text-decoration:none}
html.rf-wpp-oculto #rf-wpp-pub,html.rf-wpp-oculto #rf-wpp-log,html.rf-wpp-oculto .rf-wpp-sb{visibility:hidden}

/* ---- a tremida ---- */
/* SUTIL (pedido do dono, 23/09): metade da amplitude de antes — ±2° e 1px no ícone,
   2px na aba vertical — e um pouco mais curta. Chama o olho sem parecer defeito. */
@keyframes rf-wpp-treme{0%,100%{transform:translate(0,0) rotate(0)}15%{transform:translate(-1px,0) rotate(-2deg)}
  30%{transform:translate(1px,0) rotate(2deg)}45%{transform:translate(-1px,0) rotate(-1.5deg)}
  60%{transform:translate(0,0) rotate(1deg)}75%{transform:rotate(-.5deg)}}
@keyframes rf-wpp-treme-x{0%,100%{transform:translateX(0)}15%{transform:translateX(-2px)}30%{transform:translateX(2px)}
  45%{transform:translateX(-1.5px)}60%{transform:translateX(1px)}75%{transform:translateX(-.5px)}}
.rf-wpp-treme.tremendo{animation:rf-wpp-treme .6s ease-in-out both}
@media (prefers-reduced-motion:reduce){.rf-wpp-treme.tremendo{animation:none}}

/* ===== 1b · aba das páginas públicas ===== */
#rf-wpp-pub{position:fixed;z-index:45}
/* SÓ A PÍLULA, NO DESKTOP E NO TELEFONE (23/09): a aba vertical com painel no hover
   saiu — um elemento só, e o clique já abre o grupo. No desktop ela ganha mais margem. */
.rf-wpp-pub-tel{display:flex;position:fixed;right:24px;bottom:24px;z-index:45;
  align-items:center;gap:9px;height:50px;padding:0 18px 0 8px;border-radius:25px;background:#25D366;color:#0b2e17;
  font-size:14px;font-weight:700;box-shadow:0 14px 30px -12px rgba(8,18,12,.7)}
.rf-wpp-pub-tel:hover{background:#1fc05b}
.rf-wpp-bola{width:36px;height:36px;border-radius:50%;background:#12321f;color:#fff;display:flex;align-items:center;
  justify-content:center;font-size:17px;flex:0 0 auto}
@media (max-width:760px){.rf-wpp-pub-tel{right:14px;bottom:calc(18px + env(safe-area-inset-bottom,0px))}}

/* ===== 1c · área logada: pé da barra lateral (desktop) ===== */
/* STICKY: a barra lateral já rola (o card do patrocinador é alto) — sem isto o botão
   ficava abaixo da dobra num ecrã de 800px. Preso ao pé, está sempre à vista. */
.rf-wpp-sb{flex:0 0 auto;display:flex;flex-direction:column;gap:8px;position:sticky;bottom:0;z-index:2;
  background:var(--surface-card,#fff);padding-top:8px;margin-top:-8px;box-shadow:0 -10px 12px -8px var(--surface-card,#fff)}
.rf-wpp-sb-card{display:flex;background:#1b4a2d;border:1px solid rgba(37,211,102,.45);border-radius:14px;padding:14px;
  flex-direction:column;gap:12px;cursor:pointer}
.rf-wpp-sb-card:hover{background:#1f5534}
.rf-wpp-sb-card.tremendo{animation-name:rf-wpp-treme-x}
.rf-wpp-sb-hd{display:flex;align-items:center;gap:10px}
.rf-wpp-sb-tit{flex:1;min-width:0;font-size:14px;font-weight:700;line-height:1.25;color:#fff;text-wrap:pretty}
.rf-wpp-sb-cta{display:flex;align-items:center;justify-content:center;min-height:38px;padding:8px 10px;text-align:center;
  line-height:1.2;border-radius:10px;background:#25D366;color:#0b2e17;font-size:13px;font-weight:700}
.rf-wpp-sb-card:hover .rf-wpp-sb-cta{background:#1fc05b}
.rf-wpp-sb-quad{flex:0 0 auto;width:34px;height:34px;border-radius:10px;background:#25D366;color:#fff;display:flex;
  align-items:center;justify-content:center;font-size:16px}
/* recolhida (68px) ou "já entrou": só o ícone, e o clique leva direto ao grupo */
.rf-wpp-sb-mini{display:flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:12px;
  border:1px solid rgba(37,211,102,.5);background:rgba(37,211,102,.14)}
.rf-wpp-sb-mini:hover{background:rgba(37,211,102,.24)}
.rf-app.collapsed .rf-wpp-sb{align-items:center}
.rf-app.collapsed .rf-wpp-sb-card{display:none}
.rf-wpp-sb .rf-wpp-sb-mini{display:none}
.rf-app.collapsed .rf-wpp-sb .rf-wpp-sb-mini,.rf-wpp-sb.compacto .rf-wpp-sb-mini{display:flex}
@media (max-width:760px){.rf-wpp-sb{display:none}}

/* ===== 1c · área logada: lingueta do telefone ===== */
/* assenta ACIMA do rodapé do jogo (medido). Ocupa o canto que era do selo da
   Opinião — a aba de Opinião saiu em 23/09 (o grupo faz esse trabalho). */
#rf-wpp-log{position:fixed;right:0;bottom:calc(var(--rf-wpp-piso,0px) + 12px);z-index:45;display:flex;align-items:stretch}
.rf-wpp-lg-aba{width:44px;min-height:56px;border:0;border-radius:14px 0 0 14px;background:#25D366;color:#fff;display:flex;
  align-items:center;justify-content:center;font-size:20px;cursor:pointer;padding:0;box-shadow:0 12px 26px -12px rgba(8,18,12,.8)}
#rf-wpp-log.compacto .rf-wpp-lg-aba{min-height:44px}
@media (min-width:761px){#rf-wpp-log{display:none}}

/* ===== 1a · modal pós-cadastro ===== */
#rf-wpp-modal{position:fixed;inset:0;z-index:9050;display:flex;align-items:center;justify-content:center;padding:20px;
  background:rgba(8,20,13,.58);animation:rf-wpp-fade .18s ease}
@keyframes rf-wpp-fade{from{opacity:0}to{opacity:1}}
@keyframes rf-wpp-sobe{from{transform:translateY(100%)}to{transform:translateY(0)}}
.rf-wpp-md{position:relative;width:100%;max-width:440px;background:#fff;border-radius:22px;overflow:hidden;
  box-shadow:0 40px 90px -40px rgba(8,18,12,.8)}
.rf-wpp-md-topo{position:relative;background:#12321f;padding:30px 28px 26px;display:flex;flex-direction:column;gap:14px}
.rf-wpp-md-alca{display:none;position:absolute;top:8px;left:50%;margin-left:-18px;width:36px;height:4px;border-radius:2px;
  background:rgba(255,255,255,.25)}
.rf-wpp-selo{align-self:flex-start;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.12em;
  color:#12321f;background:#F2B90C;padding:4px 8px;border-radius:5px}
.rf-wpp-md-id{display:flex;align-items:center;gap:14px}
.rf-wpp-md-quad{flex:0 0 auto;width:58px;height:58px;border-radius:17px;background:#25D366;color:#fff;display:flex;
  align-items:center;justify-content:center;font-size:28px;box-shadow:0 10px 24px -10px rgba(37,211,102,.8)}
.rf-wpp-md-tit{font-size:25px;font-weight:700;line-height:1.12;letter-spacing:-.02em;color:#fff;text-wrap:pretty;margin:0}
.rf-wpp-md-sub{font-size:14px;line-height:1.5;color:#cfe3d4;text-wrap:pretty}
.rf-wpp-md-corpo{padding:22px 28px 26px;display:flex;flex-direction:column;gap:16px}
.rf-wpp-bens{display:flex;flex-direction:column;gap:11px}
.rf-wpp-bem{display:flex;gap:11px;align-items:flex-start}
.rf-wpp-bem-ic{flex:0 0 auto;width:24px;height:24px;border-radius:7px;background:#e4efe4;display:flex;align-items:center;
  justify-content:center;font-size:12px}
.rf-wpp-bem-t{font-size:13.5px;line-height:1.45;color:#2a3d31}
.rf-wpp-md-cta{display:flex;align-items:center;justify-content:center;gap:10px;height:54px;border-radius:14px;background:#25D366;
  color:#0b2e17;font-size:16px;font-weight:700;letter-spacing:-.01em;box-shadow:0 14px 30px -14px rgba(37,211,102,.9)}
.rf-wpp-md-cta:hover{background:#1fc05b;color:#0b2e17}
.rf-wpp-md-cta .rf-wpp-ic{font-size:19px;color:#fff}
.rf-wpp-md-leg{text-align:center;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:.06em;color:#6a7f71}
.rf-wpp-tel-so{display:none}
@media (max-width:760px){
  #rf-wpp-modal{align-items:flex-end;padding:0}
  .rf-wpp-md{max-width:none;border-radius:22px 22px 0 0;animation:rf-wpp-sobe .22s ease}
  .rf-wpp-md-alca{display:block}
  .rf-wpp-md-topo{padding:24px 20px 20px;gap:12px}
  .rf-wpp-md-id{gap:12px}
  .rf-wpp-md-quad{width:50px;height:50px;border-radius:15px;font-size:24px;box-shadow:none}
  .rf-wpp-md-tit{font-size:21px;line-height:1.14}
  .rf-wpp-md-sub{font-size:13.5px}
  .rf-wpp-md-corpo{padding:18px 20px calc(26px + env(safe-area-inset-bottom,0px));gap:14px}
  .rf-wpp-bens{gap:10px}
  .rf-wpp-bem{gap:10px;align-items:center}
  .rf-wpp-bem-t{font-size:13px}
  .rf-wpp-md-leg{display:none}
  .rf-wpp-desk-so{display:none}
  .rf-wpp-tel-so{display:inline}
}
`;
function injetarCSS(){
  if(document.getElementById('rf-wpp-css')) return;
  const st=document.createElement('style'); st.id='rf-wpp-css'; st.textContent=CSS;
  (document.head||document.documentElement).appendChild(st);
}

/* ===================== 1a · MODAL PÓS-CADASTRO ===================== */
/* a copy do telefone é mais curta (é a do pacote): as duas vão no HTML e o CSS escolhe */
function copy(desk, tel){ return `<span class="rf-wpp-desk-so">${desk}</span><span class="rf-wpp-tel-so">${tel}</span>`; }
function modalHTML(){
  const bem=(ic,d,t)=>`<div class="rf-wpp-bem"><span class="rf-wpp-bem-ic" aria-hidden="true">${ic}</span><span class="rf-wpp-bem-t">${copy(d,t)}</span></div>`;
  return `<div class="rf-wpp-md" role="dialog" aria-modal="true" aria-labelledby="rf-wpp-md-tit" onclick="event.stopPropagation()">
    <div class="rf-wpp-md-topo">
      <span class="rf-wpp-md-alca" aria-hidden="true"></span>
      <span class="rf-wpp-selo">✓ CONTA CRIADA!</span>
      <div class="rf-wpp-md-id">
        <span class="rf-wpp-md-quad">${ICONE}</span>
        <h2 class="rf-wpp-md-tit" id="rf-wpp-md-tit">Agora entra pro grupo da resenha</h2>
      </div>
      <span class="rf-wpp-md-sub">${copy(
        'É lá que a comunidade do RetroFoot se encontra: treinador procurando turma pra liga, novidade do jogo em primeira mão e papo de futebol o dia todo.',
        'Treinador procurando turma pra liga, novidade do jogo em primeira mão e papo de futebol o dia todo.')}</span>
    </div>
    <div class="rf-wpp-md-corpo">
      <div class="rf-wpp-bens">
        ${bem('👥','<strong>Ache adversário</strong> pra montar sua sala no Modo Resenha.','<strong>Ache adversário</strong> pro Modo Resenha')}
        ${bem('📣','<strong>Saiba antes</strong> de atualização, campeonato novo e evento.','<strong>Saiba antes</strong> das novidades')}
        ${bem('⚽','<strong>Fale direto</strong> com quem faz o jogo.','<strong>Fale direto</strong> com quem faz o jogo')}
      </div>
      ${aLink('modal','rf-wpp-md-cta',`${ICONE}<span>${CTA}</span>`)}
      <span class="rf-wpp-md-leg">GRÁTIS · ABRE NO WHATSAPP</span>
    </div>
  </div>`;
}
function abrirModal(){
  if(!link() || document.getElementById('rf-wpp-modal')) return;
  injetarCSS();
  const m=document.createElement('div');
  m.id='rf-wpp-modal';
  m.onclick=()=>fecharModal();           // clique no véu
  m.innerHTML=modalHTML();
  document.body.appendChild(m);
  gravar(K_VISTO,'1');
  ev('wpp_modal_view','modal');
  try{ m.querySelector('.rf-wpp-md-cta').focus({preventScroll:true}); }catch(e){}
  agendar();
}
function fecharModal(porClique){
  const m=document.getElementById('rf-wpp-modal'); if(!m) return;
  m.remove();
  if(!porClique) ev('wpp_modal_close','modal');
  agendar();
}
/* chamado pelos dois fluxos de cadastro, logo depois de a conta existir. O atraso deixa
   o cdraw() da tela seguinte assentar e o toast "Conta criada!" aparecer primeiro. */
window.rfWppPosCadastro=function(){
  if(!link() || ler(K_VISTO)==='1') return;
  setTimeout(abrirModal, 450);
};
window.rfWppFecharModal=()=>fecharModal();
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape') return;
  if(document.getElementById('rf-wpp-modal')){ fecharModal(); return; }
});

/* ===================== clique em qualquer "Entrar" ===================== */
window.rfWppEntrou=function(origem){
  gravar(K_ENTROU,'1');
  ev('wpp_click', origem);
  if(origem==='modal') setTimeout(()=>fecharModal(true), 0);
};

/* ===================== 1b · PÁGINAS PÚBLICAS ===================== */
function pubHTML(){
  return aLink('publica','rf-wpp-pub-tel rf-wpp-treme',`<span class="rf-wpp-bola">${ICONE}</span><span>Grupo da resenha</span>`);
}

/* ===================== 1c · ÁREA LOGADA ===================== */
/* desktop: vai DENTRO da barra lateral (rfSidebarHTML).
   UM ELEMENTO SÓ, E UM PASSO SÓ (pedido do dono, 23/09): era um botão "Grupo do
   WhatsApp" que abria um mini-card por cima — dois elementos na tela ao mesmo tempo e
   um clique a mais. Agora é só o cartão verde-escuro, sempre à vista, com o ícone para
   ser reconhecido de relance; o cartão INTEIRO é o link e abre o grupo direto. */
window.rfWppSidebarHTML=function(){
  if(!link()) return '';
  const mini=aLink('logada','rf-wpp-sb-mini rf-wpp-treme',`<span class="rf-wpp-sb-quad">${ICONE}</span>`)
    .replace('<a ','<a title="Grupo do WhatsApp" aria-label="Grupo do WhatsApp" ');
  if(ENTROU_ANTES) return `<div class="rf-wpp-sb compacto">${mini.replace(' rf-wpp-treme','')}</div>`;
  return `<div class="rf-wpp-sb">
    ${aLink('logada','rf-wpp-sb-card rf-wpp-treme',`
      <span class="rf-wpp-sb-hd">
        <span class="rf-wpp-sb-quad">${ICONE}</span>
        <span class="rf-wpp-sb-tit">Resenha rola no grupo entre as rodadas</span>
      </span>
      <span class="rf-wpp-sb-cta">${CTA}</span>`)}
    ${mini}
  </div>`;
};

/* telefone: lingueta própria, fora do #c-root */
/* UM ELEMENTO SÓ, E UM PASSO SÓ (23/09, igual à barra lateral do desktop): a lingueta
   era um botão que abria um painel com outro botão dentro. Agora ela É o link. */
function logHTML(){
  return aLink('logada','rf-wpp-lg-aba'+(ENTROU_ANTES?'':' rf-wpp-treme'),ICONE)
    .replace('<a ','<a aria-label="Grupo do WhatsApp" title="Grupo do WhatsApp" ');
}

/* ONDE ACABA A TELA E COMEÇA O RODAPÉ DO JOGO (mesma medida da Opinião) */
const RODAPES='.rf-bottomnav,.rf-srt-foot,.rf-pg-cta,.rf-ad-anchor,.rf-adph.rf-anchor';
function medirPiso(){
  let alto=0;
  try{
    document.querySelectorAll(RODAPES).forEach(el=>{
      const r=el.getBoundingClientRect();
      if(r.height>0 && r.bottom>=window.innerHeight-2) alto=Math.max(alto,r.height);
    });
    document.documentElement.style.setProperty('--rf-wpp-piso',alto+'px');
  }catch(e){}
}

/* ===================== QUANDO ESCONDER ===================== */
/* tudo o que é decisão ou modal. #c-overlay abre por display:flex, sem cdraw(). */
const MODAIS='.rf-ac-fundo,.rf-up-fundo,.rf-pg-fundo,.rf-mjp-fundo,.rf-cmp-fundo,.rf-av-lb,.cl-syncover,.rf-ov,.cl-pen-overlay,.rf-cam,#rf-wpp-modal,#rf-opi-host.aberto';
function haModal(){
  try{
    const ov=document.getElementById('c-overlay');
    if(ov && ov.style.display==='flex') return true;
    const m=document.querySelector(MODAIS);
    return !!(m && m.getClientRects().length);
  }catch(e){ return false; }
}
function ocupadoNoJogo(){
  if(!NO_JOGO) return false;
  try{
    if(CL.screen==='live' || CL.acao || CL.penPhase) return true;
  }catch(e){}
  return false;
}
function onde(){
  if(!NO_JOGO) return 'publica';
  try{
    if(CL.screen==='abertura') return 'publica';
    if(CL.screen==='main' || CL.screen==='seatturn') return 'logada';
  }catch(e){}
  return '';
}

/* ===================== DESENHO ===================== */
function render(forcar){
  if(!document.body) return;
  injetarCSS();
  const u=link(), lugar=u?onde():'';
  document.documentElement.classList.toggle('rf-wpp-oculto', haModal()||ocupadoNoJogo());

  /* 1b */
  let pub=document.getElementById('rf-wpp-pub');
  if(lugar==='publica'){
    if(!pub){ pub=document.createElement('div'); pub.id='rf-wpp-pub'; document.body.appendChild(pub); }
    if(pub.dataset.u!==u){ pub.dataset.u=u; pub.innerHTML=pubHTML(); }
  } else if(pub) pub.remove();

  /* 1c telefone (o desktop vive na barra lateral) */
  let log=document.getElementById('rf-wpp-log');
  if(lugar==='logada' && noTelefone()){
    medirPiso();
    if(!log){ log=document.createElement('div'); log.id='rf-wpp-log'; document.body.appendChild(log); forcar=true; }
    const sig=u+'|'+(ENTROU_ANTES?1:0);
    if(forcar || log.dataset.sig!==sig){
      log.dataset.sig=sig;
      log.className=ENTROU_ANTES?'compacto':'';
      log.innerHTML=logHTML();
    }
  } else if(log) log.remove();
}
window.rfWppRender=()=>render(false);

/* ===================== A TREMIDA ===================== */
function tremer(){
  if(document.hidden || ENTROU_ANTES) return;
  if(document.documentElement.classList.contains('rf-wpp-oculto')) return;
  document.querySelectorAll('.rf-wpp-treme').forEach(el=>{
    if(!el.getClientRects().length) return;          // escondida pelo CSS (desk/tel)
    if(el.closest('.aberto')) return;                // painel aberto: já tem a atenção
    el.classList.remove('tremendo'); void el.offsetWidth;
    el.classList.add('tremendo');
    setTimeout(()=>el.classList.remove('tremendo'), 900);
  });
}
setInterval(tremer, TREMIDA_MS);

/* ===================== OBSERVADORES ===================== */
/* modais pendurados no <body> (planos, pagamento, overlayC) não passam pelo cdraw() */
let agendado=false;
function agendar(){
  if(agendado) return; agendado=true;
  (window.requestAnimationFrame||setTimeout)(()=>{ agendado=false; render(false); });
}
function observar(){
  try{
    new MutationObserver(agendar).observe(document.body,{childList:true});
    const ov=document.getElementById('c-overlay');
    if(ov) new MutationObserver(agendar).observe(ov,{attributes:true,attributeFilter:['style']});
    else {
      /* o #c-overlay só nasce no primeiro overlayC(); quando nascer, passa a ser vigiado */
      const mo=new MutationObserver(()=>{ const o=document.getElementById('c-overlay');
        if(o){ mo.disconnect(); new MutationObserver(agendar).observe(o,{attributes:true,attributeFilter:['style']}); agendar(); } });
      mo.observe(document.body,{childList:true});
    }
  }catch(e){}
}
window.addEventListener('resize',()=>render(true));
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{ observar(); render(false); });
else { observar(); render(false); }
})();
