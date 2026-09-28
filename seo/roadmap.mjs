// ============================================================================
// ROADMAP PÚBLICO — /roadmap/ (27/09/2026)
// ----------------------------------------------------------------------------
// O que vem na Versão 2 do RetroFoot, num quadro kanban com votos. Referências: os roadmaps
// públicos do Canny (Ahrefs), Featurebase e Productboard (Loom): colunas por estágio, voto no
// próprio cartão com a contagem, ranking dos mais votados, filtro por área e descrição de
// verdade em cada item (não só um título).
//
// DADOS: elifoot_v3.roadmap_itens / roadmap_votos (scripts/sql/roadmap_publico.sql). Leitura
// pela função rf_roadmap() (anon); voto por rf_roadmap_votar() — SÓ com conta, 1 por conta por
// item, clicar de novo tira. O voto exige login para não ser inflado e porque puxa cadastro.
//
// SESSÃO: a página carrega o mesmo supabase-js do jogo (2.38.0) com a configuração padrão, então
// lê e RENOVA a mesma sessão que o jogo guardou no localStorage (mesmo domínio, mesma chave) —
// sem copiar token à mão, o que quebraria a rotação do refresh token.
// Sem conta: o voto fica pendente em rf98:roadmap_voto, a pessoa vai ao jogo entrar/criar conta,
// e ao voltar aqui já logada o voto é aplicado sozinho.
//
// ATENÇÃO — o script abaixo vive num template literal: nada de crase, ${ } ou barra invertida
// dentro dele (a barra some no HTML final; ver memória do media kit).
// ============================================================================

const SB_URL = 'https://alxwgqvjmetjbbqtjkhx.supabase.co';
const SB_KEY = 'sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';

const css = `
:root{ --rm-az:#17458F; --rm-az2:#0e2f66; --rm-am:#F2B90C; --rm-tinta:#12201a; --rm-corpo:#3a473f;
  --rm-bd:#dde7db; --rm-fundo:#eef0ee; --rm-cinza:#78877c; --rm-vd:#1a8f3c; --rm-mono:'IBM Plex Mono',ui-monospace,monospace }
/* a casca do site limita <main> a 820px (artigo); o quadro de 4 colunas precisa da largura toda */
main{max-width:none;margin:0;padding:0}
main a.rm-b{text-decoration:none}
body{background:var(--rm-fundo);font-family:'Space Grotesk',system-ui,-apple-system,sans-serif;color:var(--rm-corpo)}
.rm-w{max-width:1240px;margin:0 auto;padding:0 24px}
.rm-hero{padding:30px 0 14px}
.rm-topo{display:flex;align-items:center;justify-content:space-between;gap:12px 24px;flex-wrap:wrap}
.rm-pill{display:inline-flex;font-family:var(--rm-mono);font-size:11px;font-weight:600;letter-spacing:.14em;
  color:var(--rm-az);background:#dfe8f6;border-radius:99px;padding:6px 12px}
.rm-h1{margin:10px 0 6px;font-size:34px;line-height:1.1;font-weight:700;color:var(--rm-tinta);letter-spacing:-.03em}
.rm-lead{margin:0;max-width:680px;font-size:15.5px;line-height:1.55}
/* os avisos são ETIQUETAS, não cartões: o destaque da página é o quadro (pedido do dono, 27/09) */
.rm-labels{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.rm-label{display:inline-flex;align-items:center;gap:6px;border-radius:99px;padding:6px 12px;font-size:13px;font-weight:600;line-height:1.3}
.rm-label.data{background:#dfe8f6;color:var(--rm-az)}
.rm-label.v1{background:#fff1c2;color:#6b4e00}
.rm-acoes{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.rm-b{height:46px;padding:0 18px;border-radius:13px;border:1px solid transparent;font:inherit;font-size:15px;font-weight:700;
  cursor:pointer;display:inline-flex;align-items:center;gap:8px;text-decoration:none;white-space:nowrap}
.rm-b.am{background:var(--rm-am);color:var(--rm-az)} .rm-b.am:hover{background:#ffcb2e}
.rm-b.az{background:var(--rm-az);color:#fff} .rm-b.az:hover{background:var(--rm-az2)}
.rm-b.br{background:#fff;border-color:var(--rm-bd);color:var(--rm-corpo)} .rm-b.br:hover{background:#f4f8f3}
.rm-sec{padding:18px 0}
.rm-h2{margin:0 0 4px;font-size:24px;font-weight:700;color:var(--rm-tinta);letter-spacing:-.02em}
.rm-sub{margin:0 0 14px;font-size:14px;color:var(--rm-cinza)}
/* mais votados: lista simples numerada, sem cartões */
.rm-top{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px;max-width:760px}
.rm-top li{display:flex;align-items:baseline;gap:12px;padding:8px 0;border-bottom:1px solid var(--rm-bd)}
.rm-top .pos{font-family:var(--rm-mono);font-size:13px;font-weight:700;color:var(--rm-az);min-width:28px}
.rm-top a{flex:1;color:var(--rm-tinta);font-weight:600;text-decoration:none}
.rm-top a:hover{color:var(--rm-az)}
.rm-barra{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0 14px}
.rm-chip{border:1px solid var(--rm-bd);background:#fff;border-radius:99px;padding:7px 13px;font:inherit;font-size:13px;font-weight:600;color:var(--rm-corpo);cursor:pointer}
.rm-chip.on{background:var(--rm-az);border-color:var(--rm-az);color:#fff}
.rm-ord{margin-left:auto;display:flex;gap:6px;align-items:center;font-size:13px}
.rm-quem{font-size:13px;color:var(--rm-cinza);margin:0 0 12px}
.rm-quem b{color:var(--rm-tinta)}
.rm-quadro{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:start}
.rm-col{background:#e4e9e3;border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:10px;min-width:0}
.rm-col-h{display:flex;align-items:center;gap:8px;padding:2px 4px 4px;font-weight:700;color:var(--rm-tinta);font-size:15px}
.rm-col-h i{width:10px;height:10px;border-radius:99px;display:block}
.rm-col-h small{margin-left:auto;font-family:var(--rm-mono);font-size:12px;color:var(--rm-cinza);font-weight:600}
.rm-col-d{font-size:12px;color:var(--rm-cinza);margin:-4px 4px 2px;line-height:1.4}
.rm-card{background:#fff;border:1px solid var(--rm-bd);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-margin-top:90px}
.rm-card.alvo{box-shadow:0 0 0 3px var(--rm-am)}
.rm-card h3{margin:0 0 5px;font-size:15px;line-height:1.3;color:var(--rm-tinta)}
.rm-card p{margin:0;font-size:13px;line-height:1.5}
.rm-pe{display:flex;align-items:flex-end;justify-content:space-between;gap:10px}
.rm-tags{display:flex;flex-wrap:wrap;gap:6px;min-width:0}
.rm-tag{font-family:var(--rm-mono);font-size:10.5px;font-weight:600;letter-spacing:.04em;border-radius:6px;padding:3px 7px;background:#eef2ee;color:var(--rm-corpo)}
.rm-tag.v1{background:#fff4cf;color:#7a5a00}
.rm-tag.ok{background:#dff3e5;color:var(--rm-vd)}
/* O VOTO É O DESTAQUE DO CARTÃO. A cor diz o peso: cinza sem votos, verde cada vez mais forte
   conforme o item se aproxima do mais votado (n0..n3, calculado no script pelo máximo da página). */
.rm-voto{flex:0 0 auto;display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 14px;border:2px solid transparent;
  border-radius:12px;font:inherit;cursor:pointer;transition:transform .08s}
.rm-voto:hover{transform:translateY(-1px)}
.rm-voto .s{font-size:14px;line-height:1}
.rm-voto b{font-family:var(--rm-mono);font-size:16px}
.rm-voto small{font-size:12px;font-weight:700}
.rm-voto.n0{background:#eceeec;color:#6f7a72}
.rm-voto.n1{background:#dcf2e3;color:#1a7a37}
.rm-voto.n2{background:#8fd4a4;color:#0c4d20}
.rm-voto.n3{background:#1a8f3c;color:#fff}
.rm-voto.on{border-color:var(--rm-az);box-shadow:0 0 0 2px #fff inset}
.rm-voto:disabled{opacity:.6;cursor:progress}
.rm-vazio{font-size:13px;color:var(--rm-cinza);padding:8px 4px}
.rm-montando{grid-column:1/-1;flex:1 0 100%;background:#fff;border:1px dashed #b9c7bb;border-radius:18px;padding:28px 24px;
  text-align:center;line-height:1.6;font-size:15px;color:var(--rm-corpo)}
.rm-montando b{display:block;font-size:19px;color:var(--rm-tinta);margin-bottom:6px}
.rm-montando span{display:block;margin-top:8px;font-size:13.5px;color:var(--rm-cinza)}
[hidden]{display:none !important}
.rm-como{max-width:760px;font-size:14.5px;line-height:1.65}
.rm-como h3{margin:14px 0 2px;font-size:15px;color:var(--rm-tinta)}
.rm-como p{margin:0}
.rm-ideia{margin:10px 0 48px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:14.5px}
.rm-ideia b{color:var(--rm-tinta)}
.rm-modal{position:fixed;inset:0;background:rgba(10,20,15,.55);display:flex;align-items:center;justify-content:center;z-index:100;padding:16px}
.rm-modal[hidden]{display:none}
.rm-md{background:#fff;border-radius:20px;max-width:420px;width:100%;padding:22px;display:flex;flex-direction:column;gap:12px;color:var(--rm-corpo)}
.rm-md h3{margin:0;font-size:20px;color:var(--rm-tinta)}
.rm-md p{margin:0;line-height:1.55;font-size:14.5px}
.rm-md .linha{display:flex;gap:8px;flex-wrap:wrap}
.rm-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:var(--rm-tinta);color:#fff;border-radius:99px;padding:10px 18px;font-size:14px;z-index:110}
.rm-toast[hidden]{display:none}

/* abaixo de 1100px as 4 colunas ficam estreitas demais: viram faixa com rolagem lateral e encaixe */
@media (max-width:1100px){
  .rm-quadro{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;padding-bottom:8px;margin:0 -24px;padding-left:24px;padding-right:24px}
  .rm-col{flex:0 0 min(340px,82%);scroll-snap-align:start}
}
@media (max-width:560px){
  .rm-w{padding:0 16px}
  .rm-quadro{margin:0 -16px;padding-left:16px;padding-right:16px}
  .rm-hero{padding:30px 0 18px}
  .rm-h1{font-size:27px}
  .rm-lead{font-size:14.5px}
  .rm-topo .rm-share-btn{width:100%;justify-content:center}
  .rm-ord{margin-left:0;width:100%}
}
`;

const script = `
(function(){
  var SB_URL='${SB_URL}', SB_KEY='${SB_KEY}';
  var PEND='rf98:roadmap_voto';
  var COLS=[
    ['analise','Em análise','#8b978d','Ideias que estamos estudando. Seu voto pesa aqui.'],
    ['planejado','Planejado','#17458F','Aprovado para a Versão 2.'],
    ['desenvolvimento','Em desenvolvimento','#F2B90C','Sendo feito agora.'],
    ['lancado','Lançado','#1a8f3c','Já está no jogo.']
  ];
  var itens=[], area='', ordem='votos', sb=null, logado=null, votando={};
  function el(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function ev(n,p){ try{ if(typeof gtag==='function') gtag('event',n,p||{}); }catch(e){} }
  function toast(t){ var x=el('rm-toast'); x.textContent=t; x.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(function(){ x.hidden=true; },2600); }
  function dataBR(d){ if(!d) return ''; var p=String(d).split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }

  var maxVotos=0;
  function nivel(v){ if(!v || !maxVotos) return 'n0'; var t=v/maxVotos; return t>=0.67?'n3':(t>=0.34?'n2':'n1'); }
  function cartao(i){
    var lanc=i.status==='lancado';
    var tags='<span class="rm-tag">'+esc(i.area||'Geral')+'</span>';
    if(!lanc && i.versao==='v1_extra') tags+='<span class="rm-tag v1" title="Dependendo da complexidade e do tempo, pode entrar como extra ainda na Versão 1">Pode chegar na V1</span>';
    if(lanc) tags+='<span class="rm-tag ok">✓ Lançado'+(i.lancado_em?' em '+dataBR(i.lancado_em):'')+'</span>';
    var voto=lanc ? '' : '<button class="rm-voto '+nivel(i.votos)+(i.meu_voto?' on':'')+'" data-votar="'+i.id+'" aria-pressed="'+(i.meu_voto?'true':'false')+'" title="'+(i.meu_voto?'Tirar meu voto':'Votar')+'"'+(votando[i.id]?' disabled':'')+'>'
      +'<span class="s">'+(i.meu_voto?'✓':'▲')+'</span><b>'+i.votos+'</b><small>'+(i.meu_voto?'votado':(i.votos===1?'voto':'votos'))+'</small></button>';
    return '<article class="rm-card" id="item-'+i.id+'"><div><h3>'+esc(i.titulo)+'</h3>'+(i.descricao?'<p>'+esc(i.descricao)+'</p>':'')+'</div>'
      +'<div class="rm-pe"><div class="rm-tags">'+tags+'</div>'+voto+'</div></article>';
  }
  function desenhar(){
    /* ROADMAP VAZIO (27/09/2026): os sócios estão aprovando os itens de novo. Sem nenhum item, a
       página não mostra quatro colunas vazias nem o ranking — mostra que o quadro está sendo montado. */
    var vazio=!itens.length;
    el('rm-sec-top').hidden=vazio; el('rm-barra-wrap').hidden=vazio;
    if(vazio){
      el('rm-quadro').innerHTML='<div class="rm-montando"><b>O roadmap da Versão 2 está sendo montado.</b>'
        +'Os sócios estão escolhendo o que entra. Assim que os primeiros itens forem aprovados, eles aparecem aqui para você votar.'
        +'<span>Quer dar uma ideia enquanto isso? Conta no grupo da Resenha — é de lá que sai boa parte deste quadro.</span></div>';
      return;
    }
    maxVotos=0; itens.forEach(function(i){ if(i.status!=='lancado' && i.votos>maxVotos) maxVotos=i.votos; });
    var vis=itens.filter(function(i){ return !area || i.area===area; });
    var ord=function(a,b){ return ordem==='votos' ? (b.votos-a.votos) || (a.ord-b.ord) : (a.ord-b.ord); };
    el('rm-quadro').innerHTML=COLS.map(function(c){
      var l=vis.filter(function(i){ return i.status===c[0]; }).sort(c[0]==='lancado' ? function(a,b){ return String(b.lancado_em||'').localeCompare(String(a.lancado_em||'')); } : ord);
      return '<section class="rm-col" aria-label="'+c[1]+'"><div class="rm-col-h"><i style="background:'+c[2]+'"></i>'+c[1]+'<small>'+l.length+'</small></div>'
        +'<div class="rm-col-d">'+c[3]+'</div>'+(l.length ? l.map(cartao).join('') : '<div class="rm-vazio">Nada aqui por enquanto.</div>')+'</section>';
    }).join('');
    var top=itens.filter(function(i){ return i.status!=='lancado'; }).sort(function(a,b){ return (b.votos-a.votos)||(a.ord-b.ord); }).slice(0,5);
    el('rm-top').innerHTML=top.map(function(i,n){
      return '<li><span class="pos">#'+(n+1)+'</span><a href="#item-'+i.id+'" data-ir="'+i.id+'">'+esc(i.titulo)+'</a>'
        +'<span class="rm-voto '+nivel(i.votos)+'" style="height:30px;padding:0 10px;cursor:default"><span class="s">▲</span><b style="font-size:13px">'+i.votos+'</b></span></li>';
    }).join('');
    var areas=[]; itens.forEach(function(i){ if(i.area && areas.indexOf(i.area)<0) areas.push(i.area); });
    el('rm-areas').innerHTML=['<button class="rm-chip'+(area?'':' on')+'" data-area="">Todas as áreas</button>'].concat(areas.sort().map(function(a){
      return '<button class="rm-chip'+(a===area?' on':'')+'" data-area="'+esc(a)+'">'+esc(a)+'</button>'; })).join('');
    el('rm-ord-votos').classList.toggle('on', ordem==='votos'); el('rm-ord-plano').classList.toggle('on', ordem!=='votos');
    el('rm-quem').innerHTML = logado ? 'Votando como <b>'+esc(logado)+'</b> · clique de novo para tirar o voto.'
      : 'Para votar, entre na sua conta do RetroFoot (é grátis). 1 voto por conta em cada item.';
  }
  async function carregar(){
    try{
      var r = sb ? await sb.rpc('rf_roadmap') : null;
      if(r && !r.error){ itens=r.data||[]; }
      else {
        var f=await fetch(SB_URL+'/rest/v1/rpc/rf_roadmap',{ method:'POST', headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY,
          'Content-Type':'application/json','Content-Profile':'elifoot_v3' }, body:'{}' });
        itens=await f.json();
      }
      if(!Array.isArray(itens)) itens=[];
      desenhar();
    }catch(e){ el('rm-quadro').innerHTML='<div class="rm-vazio">Não deu para carregar o roadmap agora. Tente de novo em instantes.</div>'; }
  }
  async function votar(id){
    var i=itens.filter(function(x){ return x.id===id; })[0]; if(!i || votando[id]) return;
    if(!logado){
      try{ localStorage.setItem(PEND,id); }catch(e){}
      el('rm-login').hidden=false; ev('roadmap_voto_sem_conta',{ item:i.titulo }); return;
    }
    votando[id]=true; var antes={ v:i.votos, m:i.meu_voto };
    i.meu_voto=!i.meu_voto; i.votos+= i.meu_voto?1:-1; desenhar();
    var r=await sb.rpc('rf_roadmap_votar',{ p_item:id });
    votando[id]=false;
    if(r.error){ i.votos=antes.v; i.meu_voto=antes.m; desenhar(); toast('Não deu para registrar o voto. Tente de novo.'); return; }
    i.votos=r.data.votos; i.meu_voto=r.data.votou; desenhar();
    toast(i.meu_voto?'Voto registrado. Obrigado!':'Voto retirado.');
    ev(i.meu_voto?'roadmap_voto':'roadmap_voto_retirado',{ item:i.titulo });
  }
  async function compartilhar(){
    var url=location.origin+'/roadmap/';
    var texto='Olha o que vem por aí no RetroFoot — dá para votar nas próximas novidades:';
    ev('roadmap_compartilhar');
    if(navigator.share){ try{ await navigator.share({ title:'Roadmap do RetroFoot', text:texto, url:url }); return; }catch(e){ if(e && e.name==='AbortError') return; } }
    el('rm-share').hidden=false;
    el('rm-share-wpp').href='https://wa.me/?text='+encodeURIComponent(texto+' '+url);
    el('rm-share-url').value=url;
  }

  document.addEventListener('click', function(e){
    var t=e.target.closest('[data-votar],[data-area],[data-ir],[data-fechar],#rm-ord-votos,#rm-ord-plano,.rm-share-btn,#rm-copiar,#rm-ideia-btn');
    if(!t) return;
    if(t.hasAttribute('data-votar')) return votar(t.getAttribute('data-votar'));
    if(t.hasAttribute('data-area')){ area=t.getAttribute('data-area'); desenhar(); return; }
    if(t.hasAttribute('data-fechar')){ el('rm-login').hidden=true; el('rm-share').hidden=true; return; }
    if(t.id==='rm-ord-votos'){ ordem='votos'; desenhar(); return; }
    if(t.id==='rm-ord-plano'){ ordem='plano'; desenhar(); return; }
    if(t.classList.contains('rm-share-btn')) return compartilhar();
    if(t.id==='rm-copiar'){ var u=el('rm-share-url'); u.select();
      (navigator.clipboard ? navigator.clipboard.writeText(u.value) : Promise.reject()).then(function(){ toast('Link copiado!'); }, function(){ document.execCommand('copy'); toast('Link copiado!'); }); return; }
    if(t.id==='rm-ideia-btn'){ var w=window.RF_WHATSAPP_URL; if(w){ window.open(w,'_blank','noopener'); ev('roadmap_ideia_grupo'); } else location.href='/'; return; }
    if(t.hasAttribute('data-ir')){ e.preventDefault(); area=''; desenhar(); var c=el('item-'+t.getAttribute('data-ir'));
      if(c){ c.scrollIntoView({ behavior:'smooth', block:'center' }); c.classList.add('alvo'); setTimeout(function(){ c.classList.remove('alvo'); },1800); } }
  });
  document.querySelectorAll('.rm-modal').forEach(function(m){ m.addEventListener('click', function(e){ if(e.target===m) m.hidden=true; }); });

  (async function(){
    try{
      if(window.supabase){
        sb=window.supabase.createClient(SB_URL, SB_KEY, { db:{ schema:'elifoot_v3' }, auth:{ persistSession:true, autoRefreshToken:true } });
        var s=(await sb.auth.getSession()).data.session;
        if(s && s.user && !s.user.is_anonymous){
          var m=s.user.user_metadata||{}; logado=m.name||m.nome||s.user.email||'sua conta';
        }
      }
    }catch(e){ sb=null; }
    await carregar();
    var pend=null; try{ pend=localStorage.getItem(PEND); }catch(e){}
    if(pend && logado){
      try{ localStorage.removeItem(PEND); }catch(e){}
      var i=itens.filter(function(x){ return x.id===pend; })[0];
      if(i && !i.meu_voto){ await votar(pend); var c=el('item-'+pend); if(c) c.scrollIntoView({ block:'center' }); }
    }
    if(location.hash && location.hash.indexOf('#item-')===0){ var c2=document.querySelector(location.hash); if(c2) c2.scrollIntoView({ block:'center' }); }
  })();
})();`;

const botaoShare = `<button class="rm-b az rm-share-btn" type="button">↗ Compartilhar com um amigo</button>`;

export const roadmap = [{
  slug: 'roadmap', ready: true, soMiolo: true, priority: 0.6, lastmod: '2026-09-27',
  schemaType: 'WebPage',
  title: 'Roadmap do RetroFoot — o que vem na Versão 2',
  description: 'As próximas novidades do RetroFoot num quadro público: o que está em análise, planejado, em desenvolvimento e já lançado. Vote nas funcionalidades que você quer ver primeiro na Versão 2.',
  h1: 'O que vem por aí no RetroFoot',
  keywords: 'roadmap retrofoot, versão 2 retrofoot, novidades retrofoot, próximas funcionalidades jogo de treinador, votar funcionalidades',
  script,
  css,
  head: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0"></script>`,
  body: `
<div class="rm-w">
  <section class="rm-hero">
    <span class="rm-pill">ROADMAP PÚBLICO</span>
    <div class="rm-topo">
      <h1 class="rm-h1">O que vem por aí no RetroFoot</h1>
      ${botaoShare}
    </div>
    <p class="rm-lead">O quadro do que estamos preparando para a Versão 2. Vote no que você quer primeiro —
      os mais votados sobem na fila.</p>
    <div class="rm-labels">
      <span class="rm-label data">Versão 2 prevista para dezembro de 2026 · a confirmar</span>
      <span class="rm-label v1">Algumas melhorias podem chegar antes, ainda na Versão 1</span>
    </div>
  </section>

  <section class="rm-sec" style="padding-top:4px">
    <div id="rm-barra-wrap"><div class="rm-barra">
      <div id="rm-areas" style="display:contents"></div>
      <div class="rm-ord">Ordenar:
        <button class="rm-chip" id="rm-ord-votos" type="button">Mais votados</button>
        <button class="rm-chip" id="rm-ord-plano" type="button">Ordem do roadmap</button>
      </div>
    </div>
    <p class="rm-quem" id="rm-quem"></p></div>
    <div class="rm-quadro" id="rm-quadro"><div class="rm-vazio">Carregando o roadmap…</div></div>
  </section>

  <section class="rm-sec" id="rm-sec-top">
    <h2 class="rm-h2">Mais votados</h2>
    <p class="rm-sub">O que a comunidade mais quer ver no jogo agora.</p>
    <ol class="rm-top" id="rm-top"></ol>
  </section>

  <section class="rm-sec">
    <h2 class="rm-h2">Como funciona</h2>
    <div class="rm-como">
      <h3>Vote no que importa</h3>
      <p>Cada conta tem 1 voto por item e pode tirar o voto quando quiser. A cor do voto mostra o peso:
        cinza sem votos, verde cada vez mais forte nos mais pedidos.</p>
      <h3>Os estágios</h3>
      <p>Em análise: estamos estudando. Planejado: aprovado para a Versão 2. Em desenvolvimento: sendo feito
        agora. Lançado: já está no jogo.</p>
      <h3>Quando chega</h3>
      <p>A Versão 2 está prevista para dezembro de 2026, ainda a confirmar. Dependendo da complexidade e do
        tempo de implementação, alguns itens entram antes, como extra da Versão 1 — esses levam a etiqueta
        <span class="rm-tag v1">Pode chegar na V1</span>.</p>
    </div>
  </section>

  <section class="rm-ideia">
    <span><b>Tem uma ideia que não está aqui?</b> Conta pra gente no grupo da Resenha no WhatsApp.</span>
    <button class="rm-b am" id="rm-ideia-btn" type="button">Sugerir no grupo</button>
    ${botaoShare.replace('rm-b az', 'rm-b br')}
  </section>
</div>

<div class="rm-modal" id="rm-login" hidden role="dialog" aria-modal="true" aria-labelledby="rm-login-t">
  <div class="rm-md">
    <h3 id="rm-login-t">Entre para votar</h3>
    <p>Os votos são de quem joga: 1 por conta em cada item. Entre na sua conta do RetroFoot — ou crie uma,
      é grátis — e volte aqui. <b>Seu voto fica guardado</b> e entra sozinho quando você voltar.</p>
    <div class="linha">
      <a class="rm-b am" href="/">Entrar ou criar conta grátis</a>
      <button class="rm-b br" type="button" data-fechar>Agora não</button>
    </div>
  </div>
</div>

<div class="rm-modal" id="rm-share" hidden role="dialog" aria-modal="true" aria-labelledby="rm-share-t">
  <div class="rm-md">
    <h3 id="rm-share-t">Compartilhar o roadmap</h3>
    <p>Mande para a sua turma votar também.</p>
    <div class="linha">
      <a class="rm-b am" id="rm-share-wpp" target="_blank" rel="noopener" href="#">Enviar no WhatsApp</a>
    </div>
    <div class="linha"><input id="rm-share-url" readonly style="flex:1;min-width:0;height:44px;border:1px solid var(--rm-bd);border-radius:12px;padding:0 12px;font:inherit">
      <button class="rm-b br" id="rm-copiar" type="button">Copiar link</button></div>
    <button class="rm-b br" type="button" data-fechar>Fechar</button>
  </div>
</div>
<div class="rm-toast" id="rm-toast" hidden></div>
<script src="/src/ui/rf26-grupo-wpp.js" defer></script>
`,
}];
