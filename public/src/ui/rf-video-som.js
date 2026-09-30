/* =====================================================================
   BOTÃO DE SOM NOS VÍDEOS (30/09/2026)
   ---------------------------------------------------------------------
   Todos os vídeos do jogo (celebrações, boas-vindas do sorteio, convites, momentos) nascem MUDOS e em
   laço — é o único jeito de o navegador deixar tocar sozinho. Agora cada um ganha um botão no canto
   para ligar e desligar o som. O botão também serve de "toque para tocar" quando o navegador bloqueia o
   autoplay (iPhone em economia de bateria): sem ele a pessoa via só o cartaz de fundo.

   Como funciona: um MutationObserver enxerga todo <video autoplay> que entra na página (o jogo os monta por
   innerHTML, em vários lugares) e põe o botão dentro do elemento que o contém — nenhuma tela precisou mudar.
   A escolha fica guardada (localStorage rf98:videoSom): quem ligou o som vê os próximos vídeos com som,
   quando o navegador deixar; se ele recusar, o vídeo volta a tocar mudo e o botão mostra o estado real.
   Sem som por padrão: quem nunca tocou no botão não ouve nada, como sempre foi. */
(function(){
  if(window.__rfVideoSom) return; window.__rfVideoSom=true;
  const KEY='rf98:videoSom';
  const querSom=()=>{ try{ return localStorage.getItem(KEY)==='1'; }catch(e){ return false; } };
  const guardar=v=>{ try{ localStorage.setItem(KEY, v?'1':'0'); }catch(e){} };

  const st=document.createElement('style');
  st.textContent=`
.rf-vid-som{position:absolute;right:10px;bottom:10px;z-index:6;width:38px;height:38px;border-radius:99px;border:1.5px solid rgba(255,255,255,.55);
  background:rgba(6,17,43,.62);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;
  -webkit-tap-highlight-color:transparent;backdrop-filter:blur(3px);transition:background .15s,transform .1s}
.rf-vid-som:hover{background:rgba(6,17,43,.8)}
.rf-vid-som:active{transform:scale(.94)}
.rf-vid-som:focus-visible{outline:2px solid #F2B90C;outline-offset:2px}
.rf-vid-som svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.rf-vid-som.on{background:#F2B90C;border-color:#F2B90C;color:#17458F}
.rf-vid-som[hidden]{display:none}
@media (max-width:760px){.rf-vid-som{width:44px;height:44px;right:8px;bottom:8px}}`;
  document.head.appendChild(st);

  const ICONE_OFF='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6M21 9l-5 6"/></svg>';
  const ICONE_ON ='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

  function pintar(v){
    const b=v.__rfSomBtn; if(!b) return;
    const som=!v.muted && !v.paused;
    b.classList.toggle('on', !v.muted);
    b.innerHTML=v.muted?ICONE_OFF:ICONE_ON;
    const rot=v.paused ? 'Tocar o vídeo' : (v.muted ? 'Ligar o som do vídeo' : 'Desligar o som do vídeo');
    b.title=rot; b.setAttribute('aria-label',rot); b.setAttribute('aria-pressed', v.muted?'false':'true');
  }
  function tocar(v){ try{ const p=v.play(); if(p&&p.catch) return p; }catch(e){} return Promise.resolve(); }
  function ligar(v, som){
    v.muted=!som; v.volume=som?1:0;
    return tocar(v).then(()=>pintar(v), ()=>{        // o navegador recusou (som sem toque, economia de bateria)
      if(som){ v.muted=true; v.volume=0; return tocar(v).then(()=>pintar(v),()=>pintar(v)); }
      pintar(v);
    });
  }
  function cobrir(v){
    if(v.__rfSomBtn || v.hasAttribute('controls')) return;       // com controles nativos (landing) não precisa
    const pai=v.parentElement; if(!pai) return;
    if(getComputedStyle(pai).position==='static') pai.style.position='relative';
    const b=document.createElement('button'); b.type='button'; b.className='rf-vid-som';
    b.addEventListener('click', ev=>{
      ev.stopPropagation(); ev.preventDefault();
      if(v.paused && v.muted===false){ ligar(v,true); return; }
      const querLigar=v.muted;
      guardar(querLigar);
      // vale para todos os vídeos que estão na tela
      document.querySelectorAll('video').forEach(o=>{ if(o.__rfSomBtn) ligar(o, querLigar); });
      if(!v.__rfSomBtn) ligar(v, querLigar);
    });
    pai.appendChild(b); v.__rfSomBtn=b;
    ['play','pause','volumechange'].forEach(e=>v.addEventListener(e,()=>pintar(v)));
    v.addEventListener('error',()=>{ b.hidden=true; });          // o jogo esconde o vídeo com defeito: o botão vai junto
    pintar(v);
    if(querSom() && v.muted) ligar(v,true);                       // preferência: tenta com som; se recusar, volta a mudo
  }
  function varrer(){ document.querySelectorAll('video[autoplay], video[loop]').forEach(cobrir); }
  let agendado=false;
  new MutationObserver(()=>{ if(agendado) return; agendado=true; requestAnimationFrame(()=>{ agendado=false; varrer(); }); })
    .observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState!=='loading') varrer(); else document.addEventListener('DOMContentLoaded',varrer);
})();
