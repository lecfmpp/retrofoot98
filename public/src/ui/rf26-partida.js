/* =====================================================================
   RetroFoot98 — LEVA 2: sobreposições de partida e pós-rodada
   Portado de docs/rebranding-2026/telas/:
     Modal - Substituicao · Modal - Lesao · Modal - Cartao Vermelho
     Pos-Rodada - Classificacao · Resenha - Lobby da Sala

   DOIS ENVELOPES NOVOS, que o pacote da leva 1 não tinha:

   · rfOverlay()  — o que acontece DURANTE a partida. O fundo é o gramado
                    escurecido (radial-gradient + as faixas horizontais), e
                    a janela branca de raio 24 fica centrada por cima. É o
                    envelope da substituição, da lesão e da expulsão.

   · rfStage()    — o que acontece ENTRE as partidas. Faixa do clube no
                    topo, corpo na mesa verde-clara e cards brancos. É o
                    envelope da classificação pós-rodada e do lobby.

   No telefone a janela do overlay vira tela cheia (sem raio) e o rodapé de
   ações fica grudado embaixo — decisão da referência, e a certa: numa lista
   de reservas longa o botão de confirmar sumia da tela.
   ===================================================================== */

/* ---- envelope 1: sobreposição sobre o gramado ---- */
/* `comp` PINTA A TELA COM A COR DA COMPETICAO. Sem ele o cabecalho e o degrade
   do CLUBE, o que esta certo para uma tela do clube (substituicao, lesao) e
   errado para uma tela da COMPETICAO: a Libertadores tinha de ser dourada em
   todo lado, e nao azul aqui e dourada na rodada ao vivo. Ver rfCompInfo. */
function rfOverlay(o){
  o=o||{};
  const tema=o.comp?` rf-tema" data-tema="${escC(rfCompTemaDe(o.comp))}`:'';
  const trofeu=o.comp&&typeof rfCompTrofeuHTML==='function'
    ? rfCompTrofeuHTML(rfCompInfo(o.comp),34) : '';
  return `<div class="rf-ov ${o.cls||''}${tema}">
    <div class="rf-ov-faixas" aria-hidden="true"></div>
    <div class="rf-ov-win" style="${o.w?`width:${o.w}px`:''}" onclick="event.stopPropagation()">
      <div class="rf-ov-hd">
        <div class="rf-band-filete"></div>
        ${trofeu}
        <div class="rf-ov-ttl">
          <span class="rf-ov-eyebrow">${escC(o.contexto||'')}</span>
          <span class="rf-ov-t">${escC(o.titulo||'')}</span>
        </div>
        <div class="rf-sp"></div>
        ${o.hdDir||''}
        ${o.semX?'':`<button type="button" class="rf-ov-x" title="Fechar (Esc)" aria-label="Fechar"
          onclick="${o.fechar||'rfOvFecharPadrao()'}">✕</button>`}
      </div>
      <div class="rf-ov-body">${o.corpo||''}</div>
      ${o.acoes?`<div class="rf-ov-foot">${o.acoes}</div>`:''}
    </div>
  </div>`;
}
/* ===== TODO MODAL TEM SAIDA =====
   O X nao pode ser so "esconder": estes modais param a partida a espera de uma
   decisao, e fechar sem decidir deixaria o jogo em pausa para sempre -- que e o
   mesmo beco de onde vinha o bug da lesao. Entao o X aplica a decisao mais
   conservadora: seguir com dez na lesao, manter a formacao na expulsao, deixar
   o capitao bater no penalti. Fora de partida, fecha a sobreposicao. */
function rfOvFecharPadrao(){
  const RL=(typeof CL!=='undefined')?CL.live:null;
  if(RL){
    if(RL.injEvent && typeof rfInjSeguir==='function') return rfInjSeguir();
    if(RL.redEvent && typeof rfRedManter==='function') return rfRedManter();
    if(RL.penEvent && typeof resolvePenalty==='function') return resolvePenalty(CL.penSel||null);
    if(RL.pensPicking && typeof resolveShootoutKick==='function') return resolveShootoutKick(CL.penSel);
  }
  if(typeof clCloseOverlay==='function') return clCloseOverlay();
  CL.acao=null; if(typeof cdraw==='function') cdraw();
}
/* contexto do cabeçalho: "2º TEMPO · 63' · XV 1 × 1 CIANORTE" */
function rfCtxPartida(m){
  const RL=CL.live||{}; const min=RL.minute||RL.min||0;
  const hc=anyClubOf(m&&m.h)||{short:''}, ac=anyClubOf(m&&m.a)||{short:''};
  return `${min>45?'2º tempo':'1º tempo'} · ${min}′ · ${hc.short} ${m?(m.hg||0):0} × ${m?(m.ag||0):0} ${ac.short}`;
}
/* as três pílulas de substituição no canto do cabeçalho */
function rfSubsPillsHTML(usadas,total){
  total=total||3;
  return `<div class="rf-ov-subs">
    <span class="rf-ov-subs-l">Substituições</span>
    <div class="rf-ov-pills">${Array.from({length:total},(_,i)=>
      `<span class="rf-ov-pill ${i<usadas?'on':''}"></span>`).join('')}</div>
    <span class="rf-ov-subs-n">${usadas} de ${total} usadas</span>
  </div>`;
}

/* ---- envelope 2: página cheia entre partidas ---- */
function rfStage(o){
  o=o||{};
  const cl=clubOf(CL.clubId)||{short:'—'};
  /* mesma regra do rfOverlay: tela DA COMPETICAO usa a cor e o trofeu dela, e
     o escudo do clube sai do cabecalho -- quem manda ali e o torneio. */
  const tema=o.comp?` rf-tema" data-tema="${escC(rfCompTemaDe(o.comp))}`:'';
  const marca=o.comp
    ? (typeof rfCompTrofeuHTML==='function'?rfCompTrofeuHTML(rfCompInfo(o.comp),40):'')
    : (o.semEscudo?'':`<span class="rf-stg-crest">${rfCrest(o.crest||cl,38)}</span>`);
  return `<div class="rf-stg${tema}">
    <div class="rf-stg-in" style="${o.w?`width:${o.w}px`:''}">
      <div class="rf-stg-hd">
        <div class="rf-band-filete"></div>
        ${marca}
        <div class="rf-ov-ttl">
          <span class="rf-ov-eyebrow">${escC(o.contexto||'')}</span>
          <span class="rf-stg-t">${escC(o.titulo||'')}</span>
        </div>
        <div class="rf-sp"></div>
        ${o.hdDir||''}
      </div>
      <div class="rf-stg-shell">${o.corpo||''}</div>
      ${o.acoes?`<div class="rf-stg-foot">${o.acoes}</div>`:''}
    </div>
    ${/* MODAL DE AÇÃO DENTRO DA TELA CHEIA: rfAcAbrir só guarda o estado e
         redesenha — sem esta chamada, um "Fazer proposta" aberto a partir da
         visita a outro clube (ou de qualquer rf-stg) não desenhava nada. */
      (typeof rfAcaoHTML==='function') ? rfAcaoHTML() : ''}
  </div>`;
}

/* =====================================================================
   LINHA DE JOGADOR das sobreposições
   Grade da referência: 38 · nome (1fr) · POS 34 · ENERGIA 60 · FOR 34
   ===================================================================== */
function rfPlLinhaHTML(p, opts){
  opts=opts||{};
  const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};
  const en=Math.round(p.energy!=null?p.energy:100);
  return `<div class="rf-pl ${opts.sel?'sel':''} ${opts.off?'off':''} ${opts.marca?'trocou '+opts.marca:''}"
      ${opts.on?`onclick="${opts.on}"`:''}>
    ${(function(){ const n=nums[p.pid]||p.num||'';
        const f=(typeof rfFotoDe==='function')?rfFotoDe(p, CL.clubId):null;
        /* mesma miniatura padrão das outras telas (foto + número dentro);
           sem foto, o crachá numérico de sempre */
        return (f && typeof rfFotoNumHTML==='function')
          ? rfFotoNumHTML(f, n, '')
          : `<span class="rf-pl-num">${escC(String(n))}</span>`; })()}
    <span class="rf-pl-id">
      <span class="rf-pl-n">${escC(p.n)}</span>
      ${opts.marca?`<span class="rf-pl-marca">${
        (typeof isPhone==='function'&&isPhone())
          ? (opts.marca==='entrou'?'▲ entrou':'▼ saiu')
          : (opts.marca==='entrou'?'▲ entrou agora':'▼ saiu agora')}</span>`
        :(opts.sub?`<span class="rf-pl-s">${opts.sub}</span>`:'')}
    </span>
    <span class="rf-pl-pos">${escC(posLetter(p.s))}</span>
    <span class="rf-pl-en"><i class="rf-ener" style="--v:${en};--c:${rfEnergiaCor(en)}"></i></span>
    <span class="rf-pl-for">${p.f}</span>
  </div>`;
}

/* =====================================================================
   1 · SUBSTITUIÇÃO — substitui subPanelHTML()
   ===================================================================== */
function rfSubHTML(m){
  const id=CL.clubId;
  const xiSet=new Set(S.xi||[]);
  const xi=squad(id).filter(p=>xiSet.has(p.pid)).sort(bySquadOrder);
  const banco=squad(id).filter(p=>!xiSet.has(p.pid)&&!(p.suspended>0)&&!(p.injuredMatches>0)).sort(bySquadOrder);
  const usadas=CL.subsUsed||0, max=3;
  /* A TROCA TEM DE SER VISTA. Confirmar mandava a substituicao para o motor e
     chamava updateLive(), que so mexe no placar — as duas listas continuavam com
     a escalacao velha, com o substituido ainda "em campo". Agora o painel e
     redesenhado a partir do S.xi novo (os dois jogadores realmente trocam de
     cartao, um sobe para Em campo e o outro desce para o banco) e cada um leva
     uma marca por alguns segundos, para o olho acompanhar o salto. */
  const tr=(CL._subTroca && (Date.now()-CL._subTroca.ts)<6000)?CL._subTroca:null;
  const marcaDe=(pid)=>!tr?'':(tr.entrou===pid?'entrou':(tr.saiu===pid?'saiu':''));
  const sai=CL.subOut?xi.find(p=>p.pid===CL.subOut):null;
  const entra=CL.subIn?banco.find(p=>p.pid===CL.subIn):null;
  const pronto=!!(sai&&entra);

  // efeito na força do SETOR de quem sai — é o que a referência mostra
  const setor=sai?sai.s:null;
  const forcaSetor=(lista)=>{ const l=lista.filter(p=>p.s===setor); return l.length?Math.round(l.reduce((s,p)=>s+p.f,0)/l.length):0; };
  const antes=setor?forcaSetor(xi):0;
  const depois=(setor&&pronto)?forcaSetor(xi.filter(p=>p.pid!==sai.pid).concat([entra])):antes;

  const corpo=`
    <div class="rf-ov-cols">
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">Em campo</span>
          <span class="rf-label-r">toque para sair</span></div>
        <div class="rf-pl-head"><span></span><span></span><span>POS</span><span>ENERGIA</span><span>FOR</span></div>
        ${xi.map(p=>rfPlLinhaHTML(p,{sel:CL.subOut===p.pid, on:`rfSubPick('out','${escC(p.pid)}')`,
          marca:marcaDe(p.pid), sub:(p.energy!=null&&p.energy<45)?'cansado':''})).join('')}
      </div>
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">No banco</span>
          <span class="rf-label-r">toque para entrar</span></div>
        <div class="rf-pl-head"><span></span><span></span><span>POS</span><span>ENERGIA</span><span>FOR</span></div>
        ${banco.length?banco.map(p=>rfPlLinhaHTML(p,{sel:CL.subIn===p.pid, on:`rfSubPick('in','${escC(p.pid)}')`,
          marca:marcaDe(p.pid)})).join('')
          :'<div class="rf-empty">Ninguém disponível no banco.</div>'}
      </div>
    </div>
    ${pronto?`<div class="rf-ov-resumo">
      <span class="rf-ov-res-l"><span class="rf-ov-res-t">Sai</span>
        <span class="rf-pl-num">${escC(String((clubShirtNumbers(id)||{})[sai.pid]||''))}</span>
        <b>${escC(sai.n)}</b></span>
      <span class="rf-ov-res-seta">→</span>
      <span class="rf-ov-res-l"><span class="rf-ov-res-t">Entra</span>
        <span class="rf-pl-num">${escC(String((clubShirtNumbers(id)||{})[entra.pid]||''))}</span>
        <b>${escC(entra.n)}</b></span>
      <div class="rf-sp"></div>
      <span class="rf-ov-res-forca">
        <span class="rf-ov-res-t">Força do ${escC(rfSetorNome(setor))}</span>
        <span class="rf-ov-res-n ${depois>=antes?'sobe':'cai'}">${antes} → ${depois}</span>
      </span>
    </div>`:''}
    <span class="rf-note">
      <span class="rf-so-desktop">Toque primeiro num titular para substituir. Máximo de ${max} substituições por jogo.</span>
      <span class="rf-so-mobile">Toque num titular e depois num reserva · ${usadas}/${max}</span></span>`;

  return rfOverlay({
    w:900, contexto:rfCtxPartida(m), titulo:'Substituição', fechar:'rfSubFechar()',
    hdDir:rfSubsPillsHTML(usadas,max), corpo,
    /* No desktop os rotulos vao por extenso. No telemovel encurtam para os dois
       caberem na MESMA linha: empilhados, a barra levava 121px dos 812 do ecra
       -- espaco que falta as duas listas. Encurta-se o rotulo, nunca a barra. */
    /* ===== VOLTAR AO JOGO E A ACAO PRINCIPAL, NAO A SAIDA DE EMERGENCIA =====
       O rodape tinha "Voltar ao jogo" a esquerda, discreto, e "Fazer substituicao" a
       direita, em amarelo. So que a maior parte das visitas a esta tela acaba SEM troca — o
       treinador vem ver energia e forca e volta ao jogo. O botao amarelo estava na acao rara.
       Agora "Continuar para o jogo" e o amarelo, na direita, e "Fazer substituicao" fica ao
       lado dele, em branco: quem quer trocar carrega no branco primeiro; quem so veio olhar
       carrega no amarelo e volta. */
    acoes:`<div class="rf-sp"></div>
      <button type="button" class="rf-ov-b2" ${pronto?'':'disabled'} onclick="rfSubConfirmar()">
        <span class="rf-so-desktop">Fazer substituição</span><span class="rf-so-mobile">Substituir</span></button>
      <button type="button" class="rf-ov-cta" onclick="rfSubFechar()">
        <span class="rf-so-desktop">Continuar para o jogo</span><span class="rf-so-mobile">Continuar</span></button>`
  });
}
/* Leva as duas linhas marcadas para dentro da vista. Sem isto, nas listas de 11
   e de 20 as marcas caem quase sempre fora do que se ve, e a troca "acontece"
   fora do ecra — que era exatamente a queixa. */
function rfSubCentrarTroca(){
  const m=[...document.querySelectorAll('.rf-ov-cols .rf-pl.trocou')];
  if(!m.length) return;
  /* Cada linha rola DENTRO do seu proprio rolador. No computador as duas listas
     sao dois roladores separados, entao as duas marcas podem ser centradas ao
     mesmo tempo sem uma desfazer a outra. */
  const rolador=(el)=>{ let p=el.parentElement;
    while(p && p!==document.body){
      const st=getComputedStyle(p);
      if(/(auto|scroll)/.test(st.overflowY) && p.scrollHeight>p.clientHeight+1) return p;
      p=p.parentElement; }
    return null; };
  const naJanela=[];
  m.forEach(function(el){
    const box=rolador(el);
    if(box){ const r=el.getBoundingClientRect(), b=box.getBoundingClientRect();
      box.scrollTop=Math.max(0,box.scrollTop+(r.top-b.top)-(box.clientHeight-r.height)/2); }
    else naJanela.push(el);
  });
  /* Sobrou quem divide a rolagem da pagina — no telefone as duas listas estao
     empilhadas nela. Ai e um pedido so, para o ponto medio entre as duas: dois
     pedidos na mesma pagina e o segundo desfaz o primeiro. E o alvo nao e o meio
     da JANELA, e o meio da FAIXA LIVRE, porque o cabecalho e a barra de acoes
     sao fixos e comem topo e base. */
  if(!naJanela.length) return;
  const cx=naJanela.map(el=>{const r=el.getBoundingClientRect(); return r.top+r.height/2;});
  const meio=(Math.min(...cx)+Math.max(...cx))/2;
  const hd=document.querySelector('.rf-ov-hd'), ft=document.querySelector('.rf-ov-foot');
  const topo=hd?hd.getBoundingClientRect().height:0;
  const base=ft?ft.getBoundingClientRect().height:0;
  const doc=document.scrollingElement||document.documentElement;
  doc.scrollTop=Math.max(0,doc.scrollTop+meio-(topo+(window.innerHeight-topo-base)/2));
}
const RF_SETOR_NOME={GK:'gol',DEF:'defesa',MID:'meio',ATT:'ataque'};
function rfSetorNome(s){ return RF_SETOR_NOME[s]||'time'; }
function rfSubPick(lado,pid){
  if(lado==='out') CL.subOut=(CL.subOut===pid)?null:pid;
  else CL.subIn=(CL.subIn===pid)?null:pid;
  cdraw();
}
/* ESTAS DUAS FUNÇÕES SÓ DELEGAM — e é esse o ponto.
   Elas tinham lógica própria, e as duas estavam erradas:

   · Confirmar chamava um `doSubstitution` que NÃO EXISTE, então caía no ramo
     de reserva, que só mexia em `S.xi`. Mas a partida em curso mantém a escalação
     dentro da própria sessão do motor (`cur[side]` em simulate.js) — mudar `S.xi`
     no meio do jogo não troca ninguém em campo. A substituição "acontecia" na tela
     e não acontecia no jogo. O caminho certo é `liveDoSub()`, que entra no motor
     por `applyDecision({tipo:'sub'})`, retransmite a decisão na Resenha, respeita o
     limite de 3 e a regra de trocar goleiro só por goleiro.

   · Fechar só apagava `CL.subOpen`. Mas no INTERVALO o painel é aberto por
     `RL.paused`, não por `CL.subOpen` (ver rfLvSobreposicaoHTML) — então ele
     reabria no mesmo instante e prendia o utilizador num laço. Quem realmente
     tira do intervalo é `liveContinue()`, que zera o cronómetro, despausa e
     religa o tique. */
function rfSubFechar(){
  CL.subOut=null; CL.subIn=null; CL.subOpen=false;
  if(typeof liveContinue==='function') liveContinue(); else cdraw();
}
function rfSubConfirmar(){
  if(!CL.subOut||!CL.subIn) return;
  const saiu=CL.subOut, entrou=CL.subIn;
  if(typeof liveDoSub==='function') liveDoSub();
  else { S.xi=(S.xi||[]).map(x=>x===saiu?entrou:x); CL.subsUsed=(CL.subsUsed||0)+1;
         CL.subOut=null; CL.subIn=null; }
  /* So marca se a troca REALMENTE passou: liveDoSub recusa em silencio quando ja
     ha 3 substituicoes ou quando se tenta trocar goleiro por jogador de linha.
     O S.xi novo e a unica prova de que aconteceu. */
  const entrouMesmo=(S.xi||[]).indexOf(entrou)>=0 && (S.xi||[]).indexOf(saiu)<0;
  CL._subTroca = entrouMesmo ? {entrou:entrou, saiu:saiu, ts:Date.now()} : null;
  cdraw();   // updateLive() so mexe no placar; quem redesenha as duas listas e o cdraw
  if(entrouMesmo){
    /* NAO BASTA MARCAR: nas listas de 11 e de 20, as duas linhas marcadas caem
       quase sempre fora da vista, e o utilizador ve o painel piscar sem ver
       troca nenhuma.
       Um scrollIntoView por linha nao serve: sao dois pedidos na MESMA pagina,
       e o segundo desfaz o primeiro — foi o que aconteceu no primeiro teste, com
       a linha de quem entrou empurrada para fora por cima. Rolamos uma vez so,
       para o PONTO MEDIO entre as duas, que e onde as duas cabem juntas quando
       cabem, e o melhor meio-termo quando nao cabem. */
    /* A centragem nao se pede daqui: quem a aplica e o fim de cada desenho
       (devolveRolagem), enquanto a janela de 900ms de CL._subTroca durar. Um
       setTimeout daqui perdia sempre a corrida contra o tique da partida, que
       redesenha as listas e repoe o deslocamento logo a seguir. */
    /* APAGAR A MARCA NAO PODE REDESENHAR. Um cdraw() aqui refaz o innerHTML das
       duas listas, e a rolagem volta ao topo sozinha seis segundos depois da
       troca — o painel dava um salto sem que ninguem tivesse tocado nele.
       Tirar as classes a mao deixa a lista exatamente onde o utilizador a poisou. */
    clearTimeout(CL._subTrocaT);
    CL._subTrocaT=setTimeout(function(){
      CL._subTroca=null;
      document.querySelectorAll('.rf-pl.trocou').forEach(function(el){
        el.classList.remove('trocou','entrou','saiu');
        const mk=el.querySelector('.rf-pl-marca'); if(mk) mk.remove();
      });
    },6000);
  }
}

/* =====================================================================
   2 · LESÃO — substitui injurySubHTML()
   ===================================================================== */
function rfLesaoHTML(m,e){
  const id=CL.clubId;
  const ferido=squad(id).find(p=>p.pid===(e&&e.pid))||squad(id)[0];
  const xiSet=new Set(S.xi||[]);
  const banco=squad(id).filter(p=>!xiSet.has(p.pid)&&!(p.suspended>0)&&!(p.injuredMatches>0));
  // ordenado por posição: primeiro quem joga na MESMA do ferido
  const ord=banco.slice().sort((a,b)=>{
    const pa=a.s===ferido.s?0:1, pb=b.s===ferido.s?0:1;
    return pa-pb || (b.f||0)-(a.f||0);
  });
  const escolhido=CL.injSel||(ord[0]&&ord[0].pid);
  const alvo=ord.find(p=>p.pid===escolhido);
  const corpo=`
    <div class="rf-ov-alerta">
      <span class="rf-pl-num">${escC(String((clubShirtNumbers(id)||{})[ferido.pid]||''))}</span>
      <div class="rf-ov-al-id">
        <span class="rf-ov-al-n">${escC(ferido.n)}</span>
        <span class="rf-ov-al-s">${escC(rfSetorLongo(ferido.s))} · sentiu a coxa e não tem condição de seguir</span>
      </div>
      <div class="rf-sp"></div>
      <div class="rf-ov-al-t">
        <span class="rf-ov-res-t">Fora por</span>
        <span class="rf-ov-al-n2">${(e&&e.games)||2} jogos</span>
      </div>
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">Quem entra no lugar</span>
        <span class="rf-label-r">${escC(rfSetorLongo(ferido.s).toLowerCase())} primeiro</span></div>
      <div class="rf-pl-head"><span></span><span></span><span>POS</span><span>ENERGIA</span><span>FOR</span></div>
      ${ord.length?ord.map(p=>rfPlLinhaHTML(p,{sel:escolhido===p.pid, on:`rfInjPick('${escC(p.pid)}')`,
        sub:rfForaDePosicao(p,ferido)})).join('')
        :'<div class="rf-empty">Ninguém disponível no banco.</div>'}
    </div>
    <span class="rf-note">A substituição por lesão não consome uma das suas 3 trocas.</span>`;
  return rfOverlay({
    w:760, cls:'rf-ov-grave', contexto:rfCtxPartida(m), titulo:'Lesão em campo',
    hdDir:'<span class="rf-ov-glyph">🩹</span>', corpo,
    acoes:`<button type="button" class="rf-ov-b2" onclick="rfInjSeguir()">Seguir com 10</button>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" ${alvo?'':'disabled'} onclick="rfInjConfirmar()">Colocar ${escC(alvo?alvo.n.split(' ')[0]:'')}</button>`
  });
}
/* 'Defesa', 'Meio' e 'Ataque' sao setores do CAMPO e nao mudam com quem joga; so' o goleiro e'
   pessoa, e so' ele vira goleira. */
function rfSetorLongo(s){
  const t=(typeof RF_GENERO!=='undefined') ? RF_GENERO.t('Goleiro') : 'Goleiro';
  return ({GK:t,DEF:'Defesa',MID:'Meio',ATT:'Ataque'})[s]||'Meio';
}
/* a penalidade de jogar fora de posição, dita por extenso — é o que a
   referência mostra ("meio · fora de posição −4") */
function rfForaDePosicao(p, ferido){
  if(p.s===ferido.s) return rfSetorLongo(p.s).toLowerCase()+' · pronto';
  const dist=Math.abs(posRank(p.s)-posRank(ferido.s));
  return rfSetorLongo(p.s).toLowerCase()+' · fora de posição −'+(dist*4);
}
function rfInjPick(pid){ CL.injSel=pid; cdraw(); }
/* ===== OS DOIS BOTOES DA LESAO CHAMAVAM FUNCOES QUE NAO EXISTEM =====
   `injuryConfirm` e `injurySkip` nunca existiram em lado nenhum -- o `typeof
   ... === 'function'` engolia o engano em silencio e o clique caia num
   `cdraw()`, que redesenha o MESMO modal. O jogo ficava preso: a partida em
   pausa, o modal aberto, e nenhum dos botoes com efeito. As funcoes de verdade
   sao `resolveInjurySub(pid)` e `resolveInjuryNoSub()`, as mesmas que o modal
   antigo usava. */
function rfInjConfirmar(){
  if(!CL.injSel){ toastC('Escolha quem entra no lugar.'); return; }
  if(typeof resolveInjurySub==='function') resolveInjurySub(CL.injSel);
  else if(typeof resolveInjuryNoSub==='function') resolveInjuryNoSub();
}
function rfInjSeguir(){
  if(typeof resolveInjuryNoSub==='function') resolveInjuryNoSub();
}

/* =====================================================================
   3 · EXPULSÃO — substitui redCardHTML()
   ===================================================================== */
const RF_REORG=[
  {f:'3-2-4', d:'Perde o meio, mantém o ataque', efeito:'−6 no meio'},
  {f:'3-3-3', d:'Equilibra, tira um atacante',   efeito:'−4 no ataque', rec:true},
  {f:'4-3-2', d:'Fecha atrás e segura o empate', efeito:'−8 no ataque'},
];
function rfExpulsaoHTML(m,e){
  const id=CL.clubId;
  const p=squad(id).find(x=>x.pid===(e&&e.pid))||squad(id)[0];
  const emCampo=(S.xi||[]).length-1;
  const sel=CL.redForm||(RF_REORG.find(r=>r.rec)||RF_REORG[1]).f;
  const corpo=`
    <div class="rf-ov-alerta">
      <span class="rf-pl-num">${escC(String((clubShirtNumbers(id)||{})[p.pid]||''))}</span>
      <div class="rf-ov-al-id">
        <span class="rf-ov-al-n">${escC(p.n)}</span>
        <span class="rf-ov-al-s">${escC(rfSetorLongo(p.s))} · segundo amarelo por reclamação</span>
      </div>
      <div class="rf-sp"></div>
      <div class="rf-ov-al-t">
        <span class="rf-ov-res-t">Suspenso</span>
        <span class="rf-ov-al-n2">1 jogo</span>
      </div>
    </div>
    <div class="rf-ov-cols">
      <div class="rf-card">
        <span class="rf-label-t">Em campo agora</span>
        <div class="rf-ov-dez"><b>${emCampo}</b><span>jogadores</span></div>
        <span class="rf-note">O ${escC(rfSetorNome(p.s))} ficou desfalcado. Recue uma linha para não abrir espaço.</span>
      </div>
      <div class="rf-card">
        <span class="rf-label-t">Como se reorganizar</span>
        ${RF_REORG.map(r=>`<div class="rf-reorg ${sel===r.f?'sel':''}" onclick="rfRedForm('${r.f}')">
          <span class="rf-reorg-f">${escC(r.f)}</span>
          <span class="rf-reorg-d">${escC(r.d)}</span>
          <div class="rf-sp"></div>
          ${r.rec?'<span class="rf-reorg-rec">recomendado</span>':`<span class="rf-reorg-e">${escC(r.efeito)}</span>`}
        </div>`).join('')}
      </div>
    </div>`;
  return rfOverlay({
    w:760, cls:'rf-ov-grave', contexto:rfCtxPartida(m), titulo:'Expulsão',
    hdDir:'<span class="rf-ov-vermelho" aria-label="cartão vermelho"></span>', corpo,
    acoes:`<button type="button" class="rf-ov-b2" onclick="rfRedManter()">Manter a formação</button>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="rfRedAplicar()">Aplicar ${escC(sel)}</button>`
  });
}
function rfRedForm(f){ CL.redForm=f; cdraw(); }
/* MESMO ENGANO DA LESAO: `redCardConfirm` nao existe, e os dois botoes da
   expulsao so redesenhavam o modal. A decisao que o motor espera aqui e
   "segue com um a menos" (`resolveRedSkip`) -- a outra, 'expulsao-reorg',
   pede um par sai/entra que esta tela nao recolhe: ela escolhe FORMACAO.
   Entao aplicar a formacao e destravar sao duas coisas, nesta ordem. */
function rfRedAplicar(){
  const f=CL.redForm||'3-3-3';
  if(typeof clSelFormation==='function' && FORMATIONS[f]) clSelFormation(f);
  if(typeof resolveRedSkip==='function') resolveRedSkip();
}
function rfRedManter(){ if(typeof resolveRedSkip==='function') resolveRedSkip(); }

/* =====================================================================
   4 · PÓS-RODADA · CLASSIFICAÇÃO — substitui scClassif()
   Grade 1.15fr / 1fr: tabela à esquerda, resultados e "o que mudou para
   você" à direita. As faixas de zona ficam, com legenda no pé do card —
   e vêm das mesmas constantes que decidem a virada de temporada.
   ===================================================================== */
/* PÚBLICO DE UM JOGO JÁ ENCERRADO.
   O resultado gravado (S.results) não guarda o público — quem sabe calculá-lo é
   `attendanceFor(mandante, rnd)`, que devolve {att, price, cap} e espera uma
   FUNÇÃO aleatória. Passar `r.round` ali estourava ("rnd is not a function") e
   ler `r.att`, que nunca existiu, mostrava a bilheteria zerada.
   O sorteio é DETERMINÍSTICO, derivado da própria partida: o mesmo jogo devolve
   sempre o mesmo público, senão o número dançaria a cada redesenho da tela. */
function rfPublicoDoJogo(r){
  if(typeof attendanceFor!=='function') return 0;
  let semente=0;
  const chave=String(r.round)+'|'+String(r.h)+'|'+String(r.a);
  for(let i=0;i<chave.length;i++) semente=(semente*31+chave.charCodeAt(i))>>>0;
  const rnd=()=>{ semente=(semente*1664525+1013904223)>>>0; return semente/4294967296; };
  try{ return (attendanceFor(r.h,rnd)||{}).att||0; }catch(e){ return 0; }
}
function rfPosRodadaHTML(){
  const linhas=(typeof sortedTable==='function')?sortedTable():[];
  const total=linhas.length;
  const minha=rfMinhaPosicao();
  const tabela=`
    <div class="rf-pr-head"><span></span><span></span><span></span>
      <span>J</span><span>V</span><span>E</span><span>D</span><span>GM:GS</span><span>P</span></div>
    <div class="rf-pr-list">${linhas.map((t,i)=>{
      const eu=t.id===CL.clubId, c=anyClubOf(t.id)||{short:t.id};
      return `<div class="rf-pr-row ${eu?'me':''}">
        <span class="rf-pr-z"><i class="rf-zona ${rfZonaTabela(i+1,total)}"></i></span>
        <span class="rf-pr-p">${i+1}</span>
        <span class="rf-pr-c">${rfCrest(c,18)}<span class="rf-pr-n">${escC(c.short)}</span></span>
        <span class="rf-tb-x">${t.P}</span><span class="rf-tb-x">${t.W}</span>
        <span class="rf-tb-x">${t.D}</span><span class="rf-tb-x">${t.L}</span>
        <span class="rf-tb-x">${t.GF}:${t.GA}</span><span class="rf-tb-p">${t.Pts}</span>
      </div>`;
    }).join('')}</div>
    <div class="rf-pr-legenda">
      <span><i class="rf-zona promo"></i>Acesso direto</span>
      <span><i class="rf-zona playoff"></i>Playoff</span>
      <span><i class="rf-zona drop"></i>Rebaixamento</span>
    </div>`;

  // resultados da rodada: público em mono à esquerda, como no original
  const rod=S.round>0?S.round-1:0;
  /* SO OS JOGOS DA MINHA LIGA. O filtro era apenas o numero da rodada — num save reparado da
     troca de pais, os resultados VELHOS do Brasil (rodada 0 da temporada antiga) empatavam com a
     rodada 0 nova da Premier e enchiam a lista com jogos brasileiros (relatado a 20/08). O jogo
     e da rodada da MINHA liga quando os dois clubes estao na tabela ancora. */
  const naMinhaLiga=r=>!!(S.table && S.table[r.h] && S.table[r.a]);
  const res=(S.results||[]).filter(r=>r.round===rod && naMinhaLiga(r)).slice(0,8);
  const resultados=res.length?res.map(r=>{
    const h=anyClubOf(r.h)||{short:'—'}, a=anyClubOf(r.a)||{short:'—'};
    const meu=(r.h===CL.clubId||r.a===CL.clubId);
    /* OS NOMES DOS CAMPOS SÃO `hg`/`ag`, não `gh`/`ga` — é assim que o motor grava
       (ver S.results.push em engine/core.js). Trocados, o placar saía
       "undefined–undefined" em toda a lista de resultados da rodada.
       O PÚBLICO não é guardado no resultado: quem sabe calculá-lo é
       attendanceFor(mandante, rodada). Lendo `r.att`, que nunca existiu, a
       bilheteria aparecia zerada em todos os jogos. */
    const pub=rfPublicoDoJogo(r);
    return `<div class="rf-pr-jogo ${meu?'meu':''}">
      <span class="rf-pr-pub">${rfLvTicketHTML()}${grp(pub||0)}</span>
      <span class="rf-pr-lado dir"><span class="rf-pr-jn">${escC(h.short)}</span>${rfCrest(h,18)}</span>
      <span class="rf-pr-placar">${r.hg}–${r.ag}</span>
      <span class="rf-pr-lado">${rfCrest(a,18)}<span class="rf-pr-jn">${escC(a.short)}</span></span>
    </div>`;
  }).join(''):'<span class="rf-note">Os resultados aparecem quando a semana fechar.</span>';

  // o que mudou para você
  const antes=CL._posAntes!=null?CL._posAntes:minha;
  const delta=(antes!=null&&minha!=null)?antes-minha:0;
  const meuT=(S.table&&S.table[CL.clubId])||{Pts:0};
  const nm=(typeof nextUserMatch==='function')?nextUserMatch():null;
  const opp=nm?(anyClubOf(nm.oppId)||{short:'—'}):null;
  const promo=(typeof DIVISION_PROMO!=='undefined'&&DIVISION_PROMO[S.division])||0;
  const alvo=promo&&minha>promo?linhas[promo-1]:null;
  const mudou=`
    <div class="rf-pr-mudou">
      <div class="rf-pr-m"><span class="rf-ov-res-t">Posição</span>
        <span class="rf-pr-mv">${minha||'—'}º</span>
        <span class="rf-pr-ms">${delta>0?'subiu '+delta:delta<0?'caiu '+(-delta):'manteve'}</span></div>
      <div class="rf-pr-m"><span class="rf-ov-res-t">Pontos</span>
        <span class="rf-pr-mv">${meuT.Pts||0}</span>
        <span class="rf-pr-ms">${CL._ptsGanhos!=null?(CL._ptsGanhos>0?'+'+CL._ptsGanhos:'0'):''}</span></div>
      <div class="rf-pr-m"><span class="rf-ov-res-t">Para o acesso</span>
        <span class="rf-pr-mv">${alvo?Math.max(0,(alvo.Pts||0)-(meuT.Pts||0))+' pt':'na zona'}</span>
        <span class="rf-pr-ms">${alvo?('do '+escC((anyClubOf(alvo.id)||{short:''}).short)):'acesso direto'}</span></div>
      <div class="rf-pr-m"><span class="rf-ov-res-t">Próximo</span>
        <span class="rf-pr-mv sm">${escC(opp?opp.short:'—')}</span>
        <span class="rf-pr-ms">${nm?(nm.home?'em casa':'fora'):''}</span></div>
    </div>`;

  /* ===== A CHAVE DA COPA COMO ABA, AO LADO DA TABELA =====
     O cartao da esquerda passa a ter abas quando o clube esta vivo no mata-mata
     de alguma copa: a tabela da liga (padrao) e uma aba por copa. Se a rodada
     que acabou de ser processada foi de copa, e a aba da copa que abre -- e ali
     a chave mostra da fase corrente em diante, porque isto e recibo do que
     acabou de acontecer, nao o historico da competicao. Sem copa no mata-mata a
     tela fica exatamente como estava, sem abas. */
  const copas=(typeof rfPrCopasComChave==='function')?rfPrCopasComChave():[];
  const daCopa=(CL._cupResultKeysThisRound||[]).find(k=>copas.indexOf(k)>=0)||null;
  const abaAtual=(rfPrAba()&&(rfPrAba()==='tabela'||copas.indexOf(rfPrAba())>=0))?rfPrAba():(daCopa||'tabela');
  const abas=copas.length?`<div class="rf-pr-abas">
      <button type="button" class="rf-pr-aba ${abaAtual==='tabela'?'on':''}" onclick="rfPrIrAba('tabela')">Tabela do grupo</button>
      ${copas.map(k=>{const nome=((typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{}).short||k;
        return `<button type="button" class="rf-pr-aba ${abaAtual===k?'on':''}" onclick="rfPrIrAba('${escC(k)}')">${escC(nome)} · chaves</button>`;}).join('')}
    </div>`:'';
  const esquerda = abaAtual==='tabela'
    ? `<div class="rf-label">
        <span class="rf-label-t">${escC(classifDivName(S.division))}</span>
        <span class="rf-label-r">${minha?minha+'º de '+total:''}</span></div>${tabela}`
    : rfPrChaveHTML(abaAtual);

  return rfStage({
    w:1080, comp:abaAtual==='tabela'?S.division:abaAtual,
    contexto:`${(S.round||0)}ª semana encerrada · ${classifDivName(S.division)} ${S.season||''}`,
    titulo:'Como ficou a tabela',
    corpo:`<div class="rf-pr-cols ${abaAtual==='tabela'?'':'chave'}">
      <div class="rf-card">${abas}${esquerda}</div>
      <div class="rf-pr-dir">
        <div class="rf-card"><div class="rf-label">
          <span class="rf-label-t">Resultados da semana</span>
          <span class="rf-label-r">${res.length} jogo${res.length===1?'':'s'}</span></div>${resultados}</div>
        <div class="rf-card"><span class="rf-label-t">O que mudou para você</span>${mudou}</div>
      </div>
    </div>`,
    /* No telemovel o rotulo encurta para os dois botoes caberem NA MESMA LINHA:
       "Ver todas as divisoes" ao lado de "Continuar" empilhava a barra em duas
       linhas e ela passava a comer 200px do ecra (regra do pacote da barra
       fixa: encurta-se o rotulo, nunca a barra). */
    acoes:`<button type="button" class="rf-ov-b2" onclick="rfPrTodas()">${rfIcone('trofeu',16)}
        <span class="rf-so-desktop">Ver todas as divisões</span><span class="rf-so-mobile">Divisões</span></button>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="rfPrContinuar()">Continuar</button>`
  });
}
function rfPrTodas(){ if(typeof clClassifTodas==='function') clClassifTodas(); else toastC('Todas as divisões — em breve.','info'); }
function rfPrContinuar(){
  CL.screen='main'; cdraw();
  /* leilões que fecharam para OUTROS clubes viram aviso aqui, ao voltar da
     rodada — antes sumiam em silêncio (ver a resolução do lote no core) */
  if(typeof rfMkLeilaoOutroPendente==='function') setTimeout(rfMkLeilaoOutroPendente,350);
}
/* a zona de playoff é a faixa entre acesso e permanência; nas divisões que
   não têm playoff ela simplesmente não aparece */
function rfZonaTabelaPR(pos,total){ return rfZonaTabela(pos,total); }

/* =====================================================================
   5 · LOBBY DA SALA — substitui renderOnline()
   Grade 1.25fr / 1fr: código + treinadores + como a sala roda à esquerda,
   chat à direita.
   ===================================================================== */
/* A DIVISÃO DA SALA SEM DEPENDER DE `S`. A sala existe ANTES do jogo — `S` é
   null no lobby — e `divisionLabel()` lê `S.division` direto. Chamá-lo aqui
   derrubava o desenho inteiro, e era por isso que "iniciar uma resenha" não
   funcionava: a tela estourava antes de aparecer. A Resenha é sempre Brasil
   Série A (ver clPickResenha), então esse é o padrão quando ninguém informou. */
function rfDivisaoSala(room){
  const d=(room&&(room.division||room.div))
        ||((typeof S!=='undefined'&&S)?S.division:null);
  if(!d) return 'Série A';
  return (typeof divisionLabelOf==='function')?divisionLabelOf(d):('Série '+d);
}
function rfLobbyHTML(){
  const room=(typeof NET!=='undefined'&&NET.room)||{};
  const parts=room.participants||[];
  /* `room.capacity` e `room.max` NUNCA sao escritos pelo adaptador, entao isto
     caia sempre no 4 — a sala mostrava "x de 4" quando o teto real e o numero
     de assentos (20 na Serie D). Ver rfSalaTeto. */
  const cap=room.capacity||room.max||rfSalaTeto(room);
  const prontos=parts.filter(p=>p.ready).length;
  const codigo=(typeof NET!=='undefined'&&NET.code)||room.code||'——————';
  const euId=(typeof NET!=='undefined'&&NET.self&&NET.self.id)||null;

  const treinadores=parts.map(p=>{
    const eu=p.id===euId;
    // O CLUBE DO HUMANO USA SEMPRE O PRÓPRIO ESCUDO — nunca um genérico.
    const c=p.clubId?(anyClubOf(p.clubId)||null):null;
    return `<div class="rf-lb-t ${eu?'eu':''}">
      <span class="rf-lb-crest">${c?rfCrest(c,26):'<span class="rf-lb-vazio"></span>'}</span>
      <span class="rf-lb-id">
        <span class="rf-lb-n">${escC(p.name||'')}${eu?' (você)':''}</span>
        <span class="rf-lb-s">${eu?'anfitrião':(p.ready?'pronto':'a escolher tática')}</span>
      </span>
      <span class="rf-lb-clube">
        <span class="rf-lb-cn">${escC(c?c.short:'a sortear')}</span>
        <span class="rf-lb-cd">${escC(c?rfDivisaoSala(room):'')}</span>
      </span>
      <span class="rf-lb-estado ${p.ready?'pronto':'aguarda'}">${p.ready?'✓ Pronto':'⏳ Aguarda'}</span>
    </div>`;
  }).join('');
  const vagas=Math.max(0,cap-parts.length);

  const chat=`<div class="rf-lb-chat">
    <div class="rf-label"><span class="rf-label-t">Chat da sala</span>
      <span class="rf-label-r">${((room.chat||[]).length)} mensagens</span></div>
    <div class="rf-lb-msgs" id="cl-chat-msgs-lobby">${(typeof chatMsgsHTML==='function')?chatMsgsHTML():''}</div>
    <div class="rf-chat-in">
      <input id="cl-chat-input-lobby" class="rf-chat-input" placeholder="Escreva pra resenha"
        onkeydown="clChatKey(event,'cl-chat-input-lobby')">
      <button type="button" class="rf-chat-send" onclick="clChatSend('cl-chat-input-lobby')">➤</button>
    </div>
  </div>`;

  return rfStage({
    w:1080, semEscudo:false,
    contexto:'Modo Resenha · sala privada',
    titulo:room.name||'Sala da Resenha',
    corpo:`<div class="rf-lb-cols">
      <div class="rf-lb-esq">
        <div class="rf-card rf-lb-codigo">
          <div class="rf-lb-cod-id">
            <span class="rf-label-t">Código da sala</span>
            <span class="rf-lb-cod">${escC(codigo)}</span>
          </div>
          <div class="rf-sp"></div>
          <button type="button" class="rf-ov-b2" onclick="clInviteResenha()">🔗 Copiar convite</button>
          <button type="button" class="rf-ov-b2" onclick="clInviteResenha()">💬 Chamar pra Resenha</button>
        </div>
        <div class="rf-card">
          <div class="rf-label"><span class="rf-label-t">Treinadores</span>
            <span class="rf-label-r">${prontos}/${parts.length} prontos</span></div>
          ${treinadores||'<span class="rf-note">Ninguém entrou ainda.</span>'}
          ${vagas>0?`<div class="rf-lb-vaga">＋ ${vagas} vaga${vagas>1?'s':''} livre${vagas>1?'s':''} — envie o código ${escC(codigo)}</div>`:''}
        </div>
        <div class="rf-card">
          <span class="rf-label-t">Como a sala vai rodar</span>
          <div class="rf-lb-regras">
            <div class="rf-lb-r"><span class="rf-ov-res-t">Ritmo</span>
              <span class="rf-lb-rv">${escC((typeof tempoLabelAtual==='function')?tempoLabelAtual():'—')}</span></div>
            <div class="rf-lb-r"><span class="rf-ov-res-t">Divisão</span>
              <span class="rf-lb-rv">${escC(rfDivisaoSala(room))}</span></div>
            <div class="rf-lb-r"><span class="rf-ov-res-t">Janela</span>
              <span class="rf-lb-rv">a cada 10 semanas</span></div>
          </div>
        </div>
      </div>
      <div class="rf-card">${chat}</div>
    </div>`,
    acoes:`<span class="rf-note">À espera dos treinadores ${prontos}/${parts.length}</span>
      <div class="rf-sp"></div>
      <!-- clSairDaSala/clComecarTemporada NUNCA EXISTIRAM: escritos na forma
           protegida "fn && fn()", os dois botões falhavam em silêncio. Quem faz o
           serviço é o par clLobbyExit/clLobbyStart (net/local-transport.js), o
           mesmo que a sala do assistente já usa. -->
      <button type="button" class="rf-ov-b2" onclick="clLobbyExit()">Sair da sala</button>
      <button type="button" class="rf-ov-cta" onclick="clLobbyStart()">${rfIcone('jogar',16)} Começar a temporada</button>`
  });
}

/* =====================================================================
   LEVA 4 · PÊNALTIS E PRORROGAÇÃO
   Portado de telas/Modal - Penalti Batedor · Suspense · Resultado ·
   Disputa de Penaltis · Prorrogacao.

   O GOL É A PRÓPRIA GRADE DE ESCOLHA: 290×112 dentro das traves, dividido
   em 8 quadrados — 4 ALTO em cima, 4 RASTEIRO embaixo. É desenhado em CSS
   (rede em repeating-linear-gradient), não em SVG: o design system fecha a
   porta pra SVG novo, e a rede é padrão, não ilustração.
   ===================================================================== */

/* o gramado com o gol e os oito cantos */
/* A BALIZA. `opts.on` liga os quadrantes (cobrança minha); sem ele a baliza é só ilustração e
   fica `data-off`. `opts.txt` aceita STRING VAZIA — antes um `''` caía no `||` e a baliza dizia
   "Escolha o canto" mesmo na fase de suspense e na cobrança do adversário, convidando a um clique
   que não fazia nada. Quem quer o texto padrão simplesmente não passa `txt`. */
function rfGolHTML(cantoSel, opts){
  opts=opts||{};
  return `<div class="rf-gol-campo">
    <div class="rf-gol" ${opts.on?'':'data-off'}>
      ${Array.from({length:8},(_,i)=>
        `<span class="rf-gol-q ${cantoSel===i?'sel':''}"
          ${opts.on?`onclick="${opts.on}(${i})"`:''}
          title="${i<4?'alto':'rasteiro'} ${['esquerda','meio-esquerda','meio-direita','direita'][i%4]}"></span>`).join('')}
    </div>
    <span class="rf-gol-alto">Alto</span>
    <span class="rf-gol-rasteiro">Rasteiro</span>
    <span class="rf-gol-marca"></span>
    <span class="rf-gol-txt">${escC(opts.txt!=null?opts.txt:'Escolha o canto')}</span>
  </div>`;
}
/* frieza: quanto o jogador aguenta a pressão. Cai com o cansaço e com quem
   acabou de entrar — é o que a tela explica no rodapé. */
function rfFrieza(p){
  const en=p.energy!=null?p.energy:100;
  return Math.max(1,Math.min(99, Math.round((p.f||50)*0.7 + en*0.3)));
}
function rfFriezaTom(v){ return v>=75?'boa':v>=55?'media':'ruim'; }
function rfBatedorLinhaHTML(p, sel, on, nota){
  const fr=rfFrieza(p);
  return `<div class="rf-bat ${sel?'sel':''}" onclick="${on}">
    <span class="rf-pl-num">${escC(String((clubShirtNumbers(CL.clubId)||{})[p.pid]||''))}</span>
    <span class="rf-pl-id">
      <span class="rf-pl-n">${escC(p.n)}</span>
      <span class="rf-pl-s">${escC(nota||rfBatedorNota(p))}</span>
    </span>
    <span class="rf-pl-pos">${escC(posLetter(p.s))}</span>
    <span class="rf-bat-fr">
      <span class="rf-ov-res-t">Frieza</span>
      <span class="rf-bat-frn ${rfFriezaTom(fr)}">${fr}</span>
    </span>
  </div>`;
}
function rfBatedorNota(p){
  const gols=(S.scorers&&S.scorers[p.n])||0;
  const en=p.energy!=null?p.energy:100;
  if(en<45) return 'entrou agora, frio';
  if(gols>0) return gols+' gol'+(gols>1?'s':'')+' na temporada';
  return 'cobrador reserva';
}

/* ---- 1 · PÊNALTI: escolher batedor ---- */
function rfPenaltiBatedorHTML(){
  const m=(CL.live&&CL.live.penMatch)||null;
  const takers=(typeof penaltyTakerPool==='function')?penaltyTakerPool(m,CL.clubId):[];
  const sel=CL.penSel||(takers[0]&&takers[0].n);
  const alvo=takers.find(p=>p.n===sel)||takers[0];
  return rfOverlay({
    w:800, contexto:rfCtxPartida(m), titulo:'Pênalti a favor',
    hdDir:'<span class="rf-ov-bola" aria-hidden="true">⚽</span>',
    corpo:`
      ${rfGolHTML(CL.penCanto, {on:'rfPenCanto', txt:'Escolha o canto'})}
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">Quem bate</span>
          <span class="rf-label-r">toque para escolher</span></div>
        <div class="rf-bat-lista">${takers.map(p=>rfBatedorLinhaHTML(p, sel===p.n, `penaltySelect('${escC(p.n)}')`)).join('')}</div>
      </div>
      <span class="rf-note">A frieza cai quando o jogador está cansado ou entrou há pouco tempo.</span>`,
    acoes:`<button type="button" class="rf-ov-b2" onclick="resolvePenalty(null)">Deixar o capitão bater</button>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="resolvePenalty(CL.penSel)">Bater com ${escC(alvo?alvo.n.split(' ')[0]:'')}</button>`
  });
}
function rfPenCanto(i){ CL.penCanto=i; cdraw(); }

/* ---- 2 · PÊNALTI: suspense ---- */
function rfPenaltiSuspenseHTML(extra){
  const m=(CL.live&&CL.live.penMatch)||null;
  return rfOverlay({
    w:800, semX:true, contexto:rfCtxPartida(m), titulo:'A bola no ponto',
    hdDir:'<span class="rf-ov-bola" aria-hidden="true">⚽</span>',
    corpo:`${extra||''}
      ${rfGolHTML(CL.penCanto,{txt:''})}
      <div class="rf-pen-susp">
        <span class="rf-pen-susp-n">${escC(CL.penSel||'')}</span>
        <span class="rf-pen-susp-s">ajeita a bola, recua e espera o apito</span>
      </div>`
  });
}

/* ---- 3 · PÊNALTI: resultado ---- */
function rfPenaltiResultadoHTML(extra){
  const m=(CL.live&&CL.live.penMatch)||null;
  /* ===== A TELA DIZIA SEMPRE QUE O GOLEIRO PEGOU =====
     Aqui lia-se `CL.penScored`, que nao existe em lado nenhum -- quem guarda o
     resultado da cobranca e `CL.penResultScored` (ver resolvePenalty e
     resolveShootoutKick). `undefined` e falso, entao o modal anunciava defesa em
     100% dos penaltis, enquanto o toast e a narracao -- que leem o valor certo --
     diziam gol. Era essa a dessincronia relatada: o placar mudava e a tela
     dizia que nao. */
  const gol=!!CL.penResultScored;
  return rfOverlay({
    w:800, semX:true, cls:gol?'':'rf-ov-grave', contexto:rfCtxPartida(m),
    titulo:gol?'Gol!':'Perdeu!',
    hdDir:`<span class="rf-ov-bola" aria-hidden="true">${gol?rfIcone('jogar',16):'🧤'}</span>`,
    corpo:`${extra||''}
      ${rfGolHTML(CL.penCanto,{txt:gol?'no fundo da rede':'o goleiro pegou'})}
      <div class="rf-pen-res ${gol?'gol':'perdeu'}">
        <span class="rf-pen-res-t">${gol?rfIcone('jogar',16)+' Gol de '+escC(CL.penSel||''):'🧤 '+escC(CL.penSel||'')+' parou no goleiro'}</span>
        <span class="rf-pen-res-s">${gol?'A torcida foi ao delírio.':'Ainda dá tempo de virar.'}</span>
      </div>`,
    acoes:`<div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="clCloseOverlay();cdraw()">Seguir o jogo</button>`
  });
}

/* ---- 4 · DISPUTA DE PÊNALTIS ---- */
/* cada cobrança é uma bolinha: verde convertida, vermelha perdida, cinza
   ainda por bater. O placar da série fica no topo, os dois times lado a lado. */
function rfShootoutBolasHTML(lista, total){
  total=total||5;
  return `<div class="rf-so-bolas">${Array.from({length:Math.max(total,lista.length)},(_,i)=>{
    /* cada item e a COBRANCA do motor -- {name,scored} --, nao um booleano. A comparacao
       era `v===true`, que num objeto nunca da certo: as bolinhas ficavam todas cinzentas
       do inicio ao fim da disputa, mesmo com a serie ja decidida. */
    const k=lista[i];
    const ok=!!(k&&k.scored), errou=!!(k&&!k.scored);
    return `<span class="rf-so-b ${ok?'ok':errou?'no':''}" title="${k?escC((k.name||'')+(ok?' converteu':' perdeu')):''}">${ok?'●':errou?rfIcone('fechar',16):''}</span>`;
  }).join('')}</div>`;
}
/* ===== A DISPUTA INTEIRA NUMA TELA SO =====
   Antes esta tela era o "placar" e era EMBUTIDA dentro das outras: o modal de escolha do
   batedor, o de suspense e o de resultado punham-na no corpo deles como `extra`. So que
   ela e um rfOverlay -- ecra inteiro, fundo proprio -- entao ficava POR CIMA dos tres e
   era a unica coisa que se via, sempre igual, em todas as fases. Dai o relato "bati o
   primeiro penalti e travou tudo": a serie continuava por baixo, mas na tela nada mudava
   e o botao "Bater" so respondia numa fresta (na vez do adversario e durante a revelacao
   ele e barrado de proposito, em resolveShootoutKick/shootoutRevelar).
   Por cima disso, as bolinhas e o placar liam `pens.h` como se fosse uma lista de
   booleanos, e o motor guarda {name,scored}: um objeto e sempre truthy, entao o placar
   contava COBRANCAS em vez de GOLS (um penalti perdido somava ponto) e nenhuma bolinha
   chegava a pintar -- ficavam as cinco cinzentas do inicio ao fim.
   Agora e uma tela unica que muda de corpo conforme a fase (escolher / suspense /
   resultado), le {name,scored} e so mostra o botao quando a cobranca e mesmo minha. */
function rfDisputaHTML(RL){
  RL=RL||CL.live||{};
  const pens=RL.pens||{h:[],a:[],turn:'H'};
  const m=(RL.matches&&RL.matches[0])||RL.penMatch||{};
  const hc=anyClubOf(m.h)||{short:'—'}, ac=anyClubOf(m.a)||{short:'—'};
  const gols=l=>l.filter(k=>k&&k.scored).length;
  /* A BOLINHA TEM DE ACENDER NA REVELACAO. A cobranca so e REGISTADA em
     recordShootoutKick, 1,8s depois -- de proposito, para o placar nao se adiantar ao
     suspense. Mas isso fazia a tela anunciar "Perdeu!" com as cinco bolinhas ainda
     cinzentas e o placar em 0: a bolinha acendia sozinha um segundo e meio mais tarde,
     ja com a tela noutra fase. Aqui a cobranca em revelacao entra ANTECIPADA so no
     desenho -- e exatamente a mesma que sera registada a seguir. */
  const emRevelacao=(CL.penPhase==='result')
    ? {name:CL.penResultScorer, scored:!!CL.penResultScored} : null;
  const lh=(emRevelacao && pens.turn==='H') ? pens.h.concat([emRevelacao]) : pens.h;
  const la=(emRevelacao && pens.turn==='A') ? pens.a.concat([emRevelacao]) : pens.a;
  const gh=gols(lh), ga=gols(la);
  const eu=(m.h===CL.clubId);
  const fase=CL.penPhase||null;                       // null | 'suspense' | 'result'
  const minhaVez=!!m.user && ((pens.turn==='H')===eu);
  const escolhendo=(fase===null && minhaVez && !!RL.pensPicking);
  const total=Math.max(5,lh.length,la.length);
  const nCob=Math.max(pens.h.length,pens.a.length)+1;
  const morteSubita=(pens.h.length>=5 && pens.a.length>=5);

  const pool=(typeof penaltyTakerPool==='function')?penaltyTakerPool(m,CL.clubId):[];
  const jaBateram=new Set((eu?pens.h:pens.a).map(k=>k.name));
  const livres=(typeof shootoutEligibleTakers==='function')?shootoutEligibleTakers(pool,jaBateram):pool;
  const cicloReabriu=(livres.length===pool.length);
  const bate=pool.find(p=>p.n===CL.penSel)||livres[0]||pool[0];

  const linha=(c,g,lista,meu)=>`<div class="rf-so-time ${meu?'meu':''}">
    <span class="rf-so-crest">${rfCrest(c,22)}</span>
    <span class="rf-so-n">${escC(c.short)}</span>
    <div class="rf-sp"></div>
    <span class="rf-so-g">${g}</span>
    ${rfShootoutBolasHTML(lista,total)}
  </div>`;
  const placar=`<div class="rf-card">
    ${linha(hc,gh,lh,eu)}
    ${linha(ac,ga,la,!eu)}
  </div>`;

  /* quem esta na marca AGORA: na revelacao e sempre quem o motor mandou bater
     (CL.penResultScorer), inclusive do lado do adversario -- e por isso que a
     cobranca deles tambem se ve. */
  const nomeNaMarca = fase ? (CL.penResultScorer||'') : (minhaVez ? ((bate&&bate.n)||'') : '');
  /* o canto desta cobrança sobrevive ao suspense e à revelação: `CL.penCanto` só é zerado quando
     a PRÓXIMA cobrança abre (openShootoutPickerModal). */
  const cantoDaVez = CL.penCanto;
  const ladoDaVez = pens.turn==='H' ? hc : ac;

  let corpo, acoes='', titulo, cls='rf-ov-disputa';
  if(fase==='result'){
    const gol=!!CL.penResultScored;
    titulo = gol?'Gol!':'Perdeu!';
    cls += gol?'':' rf-ov-grave';
    /* A BALIZA TAMBÉM NA DISPUTA. Ela existia só na cobrança do meio de jogo
       (rfPenaltiBatedorHTML); aqui o jogador batia às cegas, apesar de resolveShootoutKick já
       passar `canto` para penaltyConvChance. O canto só se mostra quando a cobrança é MINHA —
       na do adversário eu não escolhi canto nenhum, e marcar um seria mentir sobre o lance. */
    corpo=`${placar}
      ${rfGolHTML(minhaVez?cantoDaVez:null, {txt: minhaVez?(gol?'no fundo da rede':'o goleiro pegou'):(gol?'no fundo da nossa rede':'nosso goleiro pegou')})}
      <div class="rf-pen-res ${gol?'gol':'perdeu'}">
        <span class="rf-pen-res-t">${gol
          ? rfIcone('jogar',16)+' Gol de '+escC(nomeNaMarca)
          : '🧤 '+escC(nomeNaMarca)+' parou no goleiro'}</span>
        <span class="rf-pen-res-s">${escC(rfSoDepoisDoChute(gh,ga,eu,gol,minhaVez))}</span>
      </div>`;
  } else if(fase==='suspense'){
    titulo='A bola no ponto';
    corpo=`${placar}
      ${rfGolHTML(minhaVez?cantoDaVez:null, {txt: minhaVez?'':'cobrança do '+escC(ladoDaVez.short||'adversário')})}
      <div class="rf-pen-susp">
        <span class="rf-pen-susp-n">${escC(nomeNaMarca)}</span>
        <span class="rf-pen-susp-s">${escC(ladoDaVez.short||'')} · ajeita a bola, recua e espera o apito</span>
      </div>`;
  } else if(escolhendo){
    titulo='Sua cobrança';
    const segs=Math.max(0,Math.ceil(((CL.penDeadline||0)-Date.now())/1000));
    corpo=`${placar}
      ${rfGolHTML(CL.penCanto, {on:'rfPenCanto', txt:'Escolha o canto'})}
      ${bate?`<div class="rf-ov-alerta rf-so-agora">
        <span class="rf-pl-num">${escC(String((clubShirtNumbers(CL.clubId)||{})[bate.pid]||''))}</span>
        <div class="rf-ov-al-id">
          <span class="rf-ov-al-n">${escC(bate.n)}</span>
          <span class="rf-ov-al-s">${escC(rfSoSituacao(gh,ga,eu))}</span>
        </div>
        <div class="rf-sp"></div>
        <div class="rf-ov-al-t"><span class="rf-ov-res-t">Frieza</span>
          <span class="rf-bat-frn ${rfFriezaTom(rfFrieza(bate))}">${rfFrieza(bate)}</span></div>
      </div>`:''}
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">Quem bate a ${nCob}ª</span>
          <span class="rf-label-r">bate sozinho em <b id="cl-pen-count">${segs}s</b></span></div>
        <div class="rf-bat-lista">${pool.map(p=>{
          const bloq=!cicloReabriu && jaBateram.has(p.n);
          return rfBatedorLinhaHTML(p, CL.penSel===p.n && !bloq,
            bloq?'':`penaltySelect('${escC(p.n)}')`,
            bloq?'já bateu nesta disputa':null);
        }).join('')}</div>
      </div>
      ${serieHTML()}`;
    acoes=`<button type="button" class="rf-ov-b2" onclick="rfSoSimular()">⏩ Simular o resto</button>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="resolveShootoutKick(CL.penSel)">Bater com ${escC(bate?bate.n.split(' ')[0]:'')}</button>`;
  } else {
    // vez do adversario (ou o respiro entre duas cobrancas): nada a decidir, e por isso
    // NAO ha botao -- o que havia antes era um "Bater" que nao fazia nada quando clicado.
    titulo=morteSubita?'Morte súbita':'Disputa de pênaltis';
    corpo=`${placar}
      <div class="rf-pen-susp">
        <span class="rf-pen-susp-n">${escC(minhaVez?'Prepare a cobrança':(ladoDaVez.short||'')+' vai bater')}</span>
        <span class="rf-pen-susp-s">${escC(rfSoSituacao(gh,ga,eu))}</span>
      </div>
      ${serieHTML()}`;
  }

  function serieHTML(){
    return `<div class="rf-card">
      <span class="rf-label-t">Como está a série</span>
      <div class="rf-so-info">
        <div class="rf-so-i"><span class="rf-ov-res-t">Situação</span>
          <span class="rf-so-iv">${escC(rfSoVantagem(gh,ga,hc,ac))}</span>
          <span class="rf-pr-ms">${escC(rfSoSubtexto(gh,ga,morteSubita))}</span></div>
        <div class="rf-so-i"><span class="rf-ov-res-t">Perdidos</span>
          <span class="rf-so-iv">${lh.filter(k=>k&&!k.scored).length} × ${la.filter(k=>k&&!k.scored).length}</span>
          <span class="rf-pr-ms">quem desperdiçou mais</span></div>
        <div class="rf-so-i"><span class="rf-ov-res-t">Fase</span>
          <span class="rf-so-iv">${morteSubita?'Morte súbita':'Melhor de 5'}</span>
          <span class="rf-pr-ms">${morteSubita?'uma cada, quem errar sozinho perde':'cinco cobranças por lado'}</span></div>
      </div>
    </div>`;
  }

  return rfOverlay({
    w:760, semX:true, cls,       // sem X: a disputa nao tem como ser fechada no meio
    contexto:`${escC(m.comp||'Mata-mata')} · ${(m.hg||0)} × ${(m.ag||0)} no tempo normal`,
    titulo,
    hdDir:`<span class="rf-so-cob">${nCob}ª cobrança</span>`,
    corpo, acoes
  });
}
/* frase curta logo depois do chute -- muda conforme foi meu ou deles */
function rfSoDepoisDoChute(gh,ga,eu,gol,minhaVez){
  if(minhaVez) return gol?'A torcida foi ao delírio.':'Ainda dá tempo de virar.';
  return gol?'Agora a pressão volta pro seu lado.':'O goleiro salvou — a série vira a seu favor.';
}
function rfSoVantagem(gh,ga,hc,ac){
  if(gh>ga) return 'Vantagem '+hc.short;
  if(ga>gh) return 'Vantagem '+ac.short;
  return 'Empatado';
}
function rfSoSubtexto(gh,ga,morteSubita){
  if(morteSubita) return gh===ga?'quem errar sozinho perde':'basta o outro errar';
  return gh===ga?'quem errar primeiro decide':'converta e acaba';
}
function rfSoSituacao(gh,ga,eu){
  const meu=eu?gh:ga, dele=eu?ga:gh;
  if(meu>dele) return 'Se converter, fica muito perto';
  if(meu<dele) return 'Precisa converter para seguir vivo';
  return 'Cobrança para manter a série';
}
/* "SIMULAR O RESTO" TAMBEM NAO FAZIA NADA: `shootoutSkip` nunca existiu e o
   fallback punha uma bandeira (`CL.penFast`) que ninguem lia. Agora liga o modo
   automatico -- daqui para a frente cada cobranca sai com o batedor
   pre-escolhido, sem esperar pelos dez segundos -- e bate a desta vez. */
function rfSoSimular(){
  CL.penAuto=true;
  if(typeof resolveShootoutKick==='function') resolveShootoutKick(CL.penSel);
}

/* ---- 5 · PRORROGAÇÃO ---- */
/* a QUARTA pílula aparece em verde: é a troca extra que só a prorrogação
   libera, e a tela existe justamente pra avisar disso antes do apito. */
function rfProrrogacaoHTML(RL){
  RL=RL||CL.live||{};
  const m=RL.penMatch||(RL.matches&&RL.matches.find(x=>x.user))||(RL.matches&&RL.matches[0])||{};
  const usadas=CL.subsUsed||0;
  const restantes=Math.max(0,4-usadas);
  const xi=xiPlayers(CL.clubId).slice().sort((a,b)=>(a.energy||100)-(b.energy||100)).slice(0,4);
  const estado=en=>en<35?'exausto':en<55?'pesado':en<75?'aguenta':'inteiro';
  return rfOverlay({
    w:760, contexto:`${escC(m.comp||'Mata-mata')} · fim dos 90'`,
    titulo:'Vamos para a prorrogação', fechar:'rfPrrComecar()',
    hdDir:`<span class="rf-prr-placar">${(m.hg||0)} – ${(m.ag||0)}</span>`,
    corpo:`
      <div class="rf-card rf-prr-tempos">
        <div class="rf-prr-t"><span class="rf-ov-res-t">1º tempo extra</span><span class="rf-prr-tv">15′</span></div>
        <div class="rf-prr-t"><span class="rf-ov-res-t">2º tempo extra</span><span class="rf-prr-tv">15′</span></div>
        <div class="rf-prr-t"><span class="rf-ov-res-t">Se empatar</span><span class="rf-prr-tv sm">Pênaltis</span></div>
      </div>
      <div class="rf-ov-cols">
        <div class="rf-card">
          <span class="rf-label-t">Como o elenco está</span>
          ${xi.map(p=>{ const en=Math.round(p.energy!=null?p.energy:100);
            return `<div class="rf-prr-j">
              <span class="rf-prr-jn">${escC(p.n)}</span>
              <span class="rf-prr-jb"><i class="rf-ener" style="--v:${en};--c:${rfEnergiaCor(en)}"></i></span>
              <span class="rf-prr-je">${escC(estado(en))}</span>
            </div>`; }).join('')}
        </div>
        <div class="rf-card">
          <span class="rf-label-t">Trocas restantes</span>
          <div class="rf-prr-tr"><b>${restantes}</b><span>de 4</span></div>
          <span class="rf-note">A prorrogação libera uma troca extra. Use nos pernas cansadas antes dos pênaltis.</span>
          ${rfSubsPillsHTML(usadas,4)}
        </div>
      </div>
      <span class="rf-note">A quarta pílula é a troca extra da prorrogação.</span>`,
    acoes:`<button type="button" class="rf-ov-b2" onclick="rfPrrSubstituir()">Fazer uma substituição</button>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="rfPrrComecar()">Começar a prorrogação</button>`
  });
}
function rfPrrSubstituir(){ CL.subOpen=true; CL._prrPendente=true; cdraw(); }
function rfPrrComecar(){ CL._prrPendente=false; if(typeof startExtraTimeGo==='function') startExtraTimeGo(); else { clCloseOverlay(); cdraw(); } }
