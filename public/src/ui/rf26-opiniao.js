/* =====================================================================
   ABA DE OPINIÃO — o recado do treinador, de dentro do jogo
   ---------------------------------------------------------------------
   Uma aba `position:fixed` na borda direita que abre um painel (desktop)
   ou uma gaveta (telefone) para o jogador mandar recado sem sair da tela
   em que está. O recado cai em elifoot_v3.user_opinions e aparece no
   painel dos sócios, na página Funcionalidades, na seção "Opinião de
   usuários".

   TRÊS REGRAS QUE MANDAM NO DESENHO DESTE ARQUIVO:

   1. ELE VIVE FORA DO #c-root. `cdraw()` recria a tela inteira por
      innerHTML várias vezes por segundo durante uma partida — um
      <textarea> pendurado lá dentro perderia o cursor a cada letra (o
      mesmo defeito já visto no campo de nome do save). O host é um <div>
      próprio no <body>, igual ao do chat da Resenha, e NUNCA é reescrito
      enquanto o painel está aberto.

   2. ELE FICA POR BAIXO DE TUDO O QUE É DECISÃO. z-index 45: abaixo da
      barra inferior do telefone (50), do chat (55), do Camarote (60), dos
      overlays de partida (65), dos modais (120) e dos avisos (950). Não é
      detalhe de pintura — é o que garante que a aba nunca fica por cima de
      um pênalti a ser cobrado nem de um diálogo à espera de resposta.

   3. O CONTEXTO É CAPTURADO, NÃO DIGITADO. Quem escreve já está a fazer
      um favor; perguntar "em que tela?" e "qual versão?" é empurrar para
      ele o trabalho que o programa faz sozinho.
   ===================================================================== */
(function(){
'use strict';

const SB_URL = 'https://alxwgqvjmetjbbqtjkhx.supabase.co';
const SB_KEY = 'sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';
const RASCUNHO = 'rf98:opiniao:rascunho';

/* as telas do jogo onde a aba existe. Fora daqui — home, login, os sete
   passos do onboarding, sorteio — ela não aparece: quem ainda não entrou
   não tem o que opinar, e aquelas telas são um funil que não se atravanca. */
const TELAS = {
  main:'', live:'Rodada ao vivo', classif:'Classificação', cupclassif:'Classificação da copa',
  cupview:'Chave da copa', imprensa:'Imprensa', teamview:'Elenco de outro clube',
  waitround:'Espera da rodada', online:'Sala da Resenha', seatturn:'', seatclassif:'Classificação',
  entrega:'Passagem de vez'
};
const TIPOS = [['melhoria','💡','Melhoria'],['problema','🐞','Problema'],['elogio','⚽','Elogio']];

let aberto=false, tipo='melhoria', enviando=false;

function podeAparecer(){
  if(typeof CL==='undefined' || !CL) return false;
  if(!(CL.screen in TELAS)) return false;
  return !!(typeof S!=='undefined' && S && S.clubId);
}
function noTelefone(){ return (typeof isPhone==='function') ? isPhone() : (window.innerWidth<=760); }

/* ONDE ACABA A TELA E COMECA O RODAPE DO JOGO.
   A gaveta e a aba assentam ACIMA de qualquer barra fixa no fundo — a barra e' a
   navegacao, e tapa-la seria trocar um caminho por outro. A altura e' MEDIDA em
   vez de escrita a mao porque ela muda: o `env(safe-area-inset-bottom)` do iPhone
   entra nela, e ha' telas (rodada ao vivo, sorteio) onde a barra nem existe. */
const RODAPES='.rf-bottomnav,.rf-srt-foot,.rf-pg-cta,.rf-ad-anchor,.rf-adph.rf-anchor';
function piso(){
  let alto=0;
  try{
    document.querySelectorAll(RODAPES).forEach(el=>{
      const r=el.getBoundingClientRect();
      if(r.height>0 && r.bottom>=window.innerHeight-2) alto=Math.max(alto, r.height);
    });
  }catch(e){}
  return alto;
}
/* a medida vai para o <html> e nao para o host: o aviso de enviado mora no
   <body>, fora do host, e le' o mesmo valor para nao cair por cima da barra. */
function medirPiso(){ try{ document.documentElement.style.setProperty('--rf-opi-piso', piso()+'px'); }catch(e){} }

/* ---- o que a etiqueta 📍 vai dizer: tela · competição · versão ---- */
function nomeDaTela(){
  const fixo=TELAS[CL.screen];
  if(fixo) return fixo;
  /* 'main' e 'seatturn' desenham a mesma casa com muitas páginas dentro —
     quem sabe em qual delas o jogador está é o RF_PAGES.
     O `label` VEM ANTES DO `titulo` de propósito: em algumas páginas o titulo é
     uma FUNÇÃO (o do Elenco muda com o clube que se está a visitar), e ela caía
     na etiqueta como texto — o jogador via o código-fonte da função no lugar do
     nome da tela. O label é sempre uma string curta, que é o que a etiqueta
     quer; o titulo fica de reserva, e resolvido se for função. */
  try{
    const pg=(typeof rfState==='function') ? rfState().page : null;
    if(pg && typeof RF_PAGES!=='undefined'){
      const def=RF_PAGES.find(p=>p.key===pg);
      if(def){
        if(def.label) return def.label;
        const t=(typeof def.titulo==='function') ? def.titulo() : def.titulo;
        if(typeof t==='string' && t) return t;
      }
    }
    if(pg) return pg;
  }catch(e){}
  return 'Jogo';
}
function nomeDaCompeticao(){
  try{
    const d=(CL.live && CL.live.matches && (CL.live.matches.find(m=>m.user)||{}).div) || (S&&S.division);
    if(!d) return null;
    if(typeof rfCompInfo==='function'){ const i=rfCompInfo(d); if(i && i.curto) return i.curto; }
    return String(d);
  }catch(e){ return null; }
}
function versao(){ try{ return (typeof RF_MOTOR_VER!=='undefined') ? RF_MOTOR_VER.slice(0,8) : null; }catch(e){ return null; } }
function contexto(){
  let clube=null, tecnico=null;
  try{ clube=(typeof clubOf==='function' && CL.clubId) ? (clubOf(CL.clubId).short||clubOf(CL.clubId).name) : null; }catch(e){}
  try{ tecnico=CL.mgr||null; }catch(e){}
  return { tela:nomeDaTela(), competicao:nomeDaCompeticao(), versao:versao(), clube, tecnico,
           plataforma: noTelefone()?'mobile':'desktop' };
}
function etiqueta(c){ return [c.tela, c.competicao, c.versao?('v'+c.versao):null].filter(Boolean).join(' · '); }

/* ---- rascunho: o texto sobrevive a um fechamento acidental ---- */
function lerRascunho(){ try{ return localStorage.getItem(RASCUNHO)||''; }catch(e){ return ''; } }
function gravarRascunho(t){ try{ t?localStorage.setItem(RASCUNHO,t):localStorage.removeItem(RASCUNHO); }catch(e){} }

/* ---- HTML ---- */
function esc(s){ return (typeof escC==='function') ? escC(s) : String(s==null?'':s); }
function abaHTML(){
  const tel=noTelefone();
  return `<button type="button" class="rf-opi-aba" id="rf-opi-aba"
    aria-expanded="${aberto?'true':'false'}" aria-controls="rf-opi-painel"
    aria-label="Dar opinião" title="Mandar um recado pra equipe" onclick="rfOpiniaoAlternar(event)">
    ${aberto && !tel ? `<span class="rf-opi-puxador" aria-hidden="true">›</span>`
      : `<span class="rf-opi-bal" aria-hidden="true">💬</span>
         <span class="rf-opi-rot">${tel?'OPINIÃO':'DAR OPINIÃO'}</span>`}
  </button>`;
}
function painelHTML(){
  const tel=noTelefone(), c=contexto(), texto=lerRascunho();
  return `<div class="rf-opi-painel" id="rf-opi-painel" role="dialog" aria-label="Dar opinião">
    <div class="rf-opi-hd">
      ${tel?'<span class="rf-opi-alca" aria-hidden="true"></span>':''}
      <span class="rf-opi-tit">Dar opinião</span>
      <span class="rf-sp"></span>
      <button type="button" class="rf-opi-x" aria-label="Fechar" onclick="rfOpiniaoFechar()">✕</button>
    </div>
    ${tel?'':'<span class="rf-opi-sub">O que você quer nos contar?</span>'}
    <div class="rf-opi-tipos">
      ${TIPOS.map(([k,ic,l])=>`<button type="button" class="rf-opi-tipo ${tipo===k?'on':''}"
        data-tipo="${k}" aria-pressed="${tipo===k}" onclick="rfOpiniaoTipo('${k}')">${ic} ${l}</button>`).join('')}
    </div>
    <textarea id="rf-opi-txt" class="rf-opi-txt" maxlength="2000"
      placeholder="${tel?'Escreva do seu jeito.':'Escreva do seu jeito. Quanto mais direto, melhor.'}"
      oninput="rfOpiniaoDigitou(this)">${esc(texto)}</textarea>
    <div class="rf-opi-ctx"><span aria-hidden="true">📍</span><span>${esc(etiqueta(c))}</span></div>
    <div class="rf-opi-erro" id="rf-opi-erro" hidden>⚠ Não deu pra enviar. Tenta de novo.</div>
    <div class="rf-opi-acts">
      <button type="button" class="rf-opi-cta" id="rf-opi-enviar" ${texto.trim()?'':'disabled'}
        onclick="rfOpiniaoEnviar()">Enviar recado</button>
      ${tel?'':'<button type="button" class="rf-opi-alt" onclick="rfOpiniaoFechar()">Cancelar</button>'}
    </div>
  </div>`;
}

/* ---- desenho ----
   REDESENHA SÓ O QUE MUDA DE ESTADO, nunca por gosto: com o painel aberto,
   um innerHTML novo apagaria o que a pessoa está a escrever. Quem chama isto
   a cada cdraw() é o jogo inteiro — por isso a primeira linha é uma saída. */
function render(){
  if(typeof document==='undefined') return;
  let host=document.getElementById('rf-opi-host');
  if(!podeAparecer()){ if(host){ host.remove(); aberto=false; } return; }
  if(!host){ host=document.createElement('div'); host.id='rf-opi-host'; document.body.appendChild(host); }
  else if(aberto) return;                       // painel aberto: não se toca (ver o cabeçalho)
  const assinatura=(noTelefone()?'m':'d')+'|'+(aberto?'1':'0');
  if(host.dataset.sig===assinatura && !aberto) return;
  host.dataset.sig=assinatura;
  host.className=(noTelefone()?'tel':'desk')+(aberto?' aberto':'');
  medirPiso();
  host.innerHTML=(aberto?painelHTML():'')+abaHTML();
}
function abrir(){
  if(aberto) return;
  aberto=true;
  const host=document.getElementById('rf-opi-host'); if(!host) return;
  host.className=(noTelefone()?'tel':'desk')+' aberto';
  medirPiso();
  host.dataset.sig=(noTelefone()?'m':'d')+'|1';
  host.innerHTML=painelHTML()+abaHTML();
  const t=document.getElementById('rf-opi-txt');
  if(t && !noTelefone()){ t.focus(); t.setSelectionRange(t.value.length,t.value.length); }
}
function fechar(){
  if(!aberto) return;
  const t=document.getElementById('rf-opi-txt'); if(t) gravarRascunho(t.value);
  aberto=false; enviando=false;
  const host=document.getElementById('rf-opi-host'); if(!host) return;
  host.className=noTelefone()?'tel':'desk';
  medirPiso();
  host.dataset.sig=(noTelefone()?'m':'d')+'|0';
  host.innerHTML=abaHTML();
}

/* ---- aviso de enviado ----
   É O TOAST DO JOGO, não um aviso próprio. O pacote pedia uma peça escura e
   centrada embaixo, e ela saiu ILEGÍVEL: o <span> da frase caía numa regra
   global que pinta span solto (computava #5c4a00, castanho sobre o quase-preto
   do fundo). Além disso o jogo já tinha decidido, e por escrito, que o toast
   escuro #12201a se confundia com o fundo das páginas — ver a nota do .rf-toast
   no rf26.css. Aviso do sistema tem uma voz só: a mesma peça clara, a mesma
   posição, a mesma saída, e no telefone o mesmo desvio para cima da barra. */
function aviso(){
  if(typeof toastC==='function') toastC('✓ Recado enviado. Valeu!', 'success', {ms:3000});
}

/* ---- envio ----
   Fetch cru com a chave publicável, igual ao ads.js: a RPC é a única porta de
   escrita da tabela e vale deslogado — a opinião de quem ainda não fez conta
   conta tanto como a dos outros. */
async function enviar(){
  if(enviando) return;
  const t=document.getElementById('rf-opi-txt'); if(!t) return;
  const texto=(t.value||'').trim(); if(!texto) return;
  const erro=document.getElementById('rf-opi-erro');
  const bt=document.getElementById('rf-opi-enviar');
  enviando=true; if(bt){ bt.disabled=true; bt.textContent='Enviando…'; }
  if(erro) erro.hidden=true;
  const c=contexto();
  try{
    const r=await fetch(SB_URL+'/rest/v1/rpc/rf_opiniao', {
      method:'POST', keepalive:true,
      headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY,
                'Content-Type':'application/json', 'Content-Profile':'elifoot_v3' },
      body: JSON.stringify({ p_tipo:tipo, p_texto:texto, p_tela:c.tela, p_competicao:c.competicao,
        p_versao:c.versao, p_clube:c.clube, p_tecnico:c.tecnico, p_plataforma:c.plataforma,
        p_ua:(navigator.userAgent||'').slice(0,300) })
    });
    if(!r.ok) throw new Error('HTTP '+r.status);
    /* o campo esvazia ANTES do fechar: e' o fechar que grava o rascunho, entao
       limpar so' o localStorage devolvia o texto ja' enviado no proximo abrir. */
    t.value=''; gravarRascunho('');
    tipo='melhoria';
    fechar();
    aviso();
  }catch(e){
    /* o texto FICA. Perder o recado por causa de uma queda de rede é a única
       coisa pior do que não ter para onde mandá-lo. */
    enviando=false;
    if(bt){ bt.disabled=false; bt.textContent='Enviar recado'; }
    if(erro) erro.hidden=false;
  }
}

/* ---- ganchos globais (onclick do HTML acima) ---- */
window.rfOpiniaoAlternar=function(ev){ if(ev){ ev.stopPropagation(); } aberto?fechar():abrir(); };
window.rfOpiniaoFechar=fechar;
window.rfOpiniaoTipo=function(k){
  tipo=k;
  document.querySelectorAll('#rf-opi-painel .rf-opi-tipo').forEach(b=>{
    const on=b.dataset.tipo===k;
    b.classList.toggle('on',on); b.setAttribute('aria-pressed',on?'true':'false');
  });
};
window.rfOpiniaoDigitou=function(el){
  gravarRascunho(el.value);
  const bt=document.getElementById('rf-opi-enviar');
  if(bt && !enviando) bt.disabled=!el.value.trim();
};
window.rfOpiniaoEnviar=enviar;
window.rfOpiniaoRender=render;

/* Esc fecha (desktop e telefone), e um toque FORA fecha sem perder o texto.
   O clique de dentro não sobe até aqui porque o teste é de contenção — e o da
   própria aba já vem com stopPropagation, senão abrir e fechar seriam o mesmo
   gesto. */
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && aberto) fechar(); });
document.addEventListener('mousedown',e=>{
  if(!aberto) return;
  const host=document.getElementById('rf-opi-host');
  if(host && !host.contains(e.target)) fechar();
});
document.addEventListener('touchstart',e=>{
  if(!aberto) return;
  const host=document.getElementById('rf-opi-host');
  if(host && !host.contains(e.target)) fechar();
}, {passive:true});
/* girar o aparelho troca a aba pela gaveta (e vice-versa) */
window.addEventListener('resize',()=>{ if(!aberto) render(); });
})();
