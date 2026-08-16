/* =====================================================================
   RetroFoot98 — LANDING (rebranding 2026)
   Portada de docs/rebranding-2026/telas/Landing - Home.html.

   O texto é o da tela, verbatim: é peça de marketing escrita, não conteúdo
   derivado do save. Onde a tela mostra número (500 vagas, 318 na fila,
   18 de 20 na sala), o número da referência fica — a ligação com o dado
   real vem depois, sem mexer no desenho.

   A página tem seis blocos, na ordem da tela:
     nav · hero · carreira solo · Modo Resenha · mercado/leilão ·
     Ligas Oficiais · lista de espera · rodapé escuro
   ===================================================================== */

const RF_LP_NAV=[
  ['jogo','O jogo'],['resenha','Modo Resenha'],['ranking','Ranking'],
  ['ligas','Ligas Oficiais'],['canais','Para canais'],['blog','Blog'],['apoie','Apoie o projeto'],
];

/* `extra` é o encaixe da DIREITA do cabeçalho: dentro do assistente é ali que
   mora o "‹ Voltar ao modo" do desenho, no lugar dos botões de entrar. Nas
   páginas públicas ele vem vazio e o cabeçalho é o de sempre. */
function rfLpNavHTML(extra){
  return `<nav class="rf-lp-nav">
    <a class="rf-lp-marca" href="/" aria-label="RetroFoot98">
      <img src="img/logo.webp" width="32" height="32" alt="">
      <span>RetroFoot<span class="rf-wiz-marca-98">98</span></span>
    </a>
    <div class="rf-lp-links">
      ${RF_LP_NAV.map(([k,l])=>`<button type="button" class="rf-lp-link" onclick="rfLpIr('${k}')">${escC(l)}</button>`).join('')}
    </div>
    <div class="rf-sp"></div>
    ${extra ? extra : `<button type="button" class="rf-lp-entrar" onclick="clGoModo('solo')">${rfIcone('chave',16)} Entrar</button>
    <button type="button" class="rf-lp-btlista" onclick="rfLpIr('lista')">Entrar na lista</button>`}
  </nav>`;
}
function rfLpIr(k){
  const el=document.getElementById('rf-lp-'+k);
  if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
}

/* ---- bloco de seção: sobrancelha, título, prosa, marcadores e CTA ---- */
function rfLpSecaoHTML(o){
  return `<div class="rf-lp-sec-txt">
    <span class="rf-lp-eyebrow">${escC(o.eyebrow)}</span>
    <h2 class="rf-lp-h2">${escC(o.titulo)}</h2>
    <p class="rf-lp-p">${escC(o.prosa)}</p>
    ${o.itens?`<ul class="rf-lp-itens">${o.itens.map(i=>`<li><span class="rf-lp-losango">◆</span>${escC(i)}</li>`).join('')}</ul>`:''}
    <!-- SEM escC no rótulo: desde que os ícones viraram SVG, o rótulo traz marcação
         (rfIcone(...) + texto). Escapado, o botão exibia o código do <svg> como
         TEXTO e esticava a landing para mais de 7000px de largura. Mesmo defeito
         que já tinha acontecido nos botões do assistente. Os rótulos são literais
         do código, nunca entrada do utilizador. -->
    ${o.cta?`<button type="button" class="rf-lp-cta2" onclick="${o.ctaOn||''}">${o.cta}</button>`:''}
  </div>`;
}

/* ---- as maquetes: telas do jogo desenhadas dentro da landing ---- */
function rfLpMaqueteAoVivoHTML(){
  const linha=(pub,h,gh,ga,a,min)=>`<div class="rf-lpm-linha">
    <span class="rf-lpm-pub">${rfLvTicketHTML()}${pub}</span>
    <span class="rf-lpm-casa">${escC(h)}</span>
    <span class="rf-lv-placar"><span>${gh}</span><span class="rf-lv-d">:</span><span>${ga}</span></span>
    <span class="rf-lpm-fora">${escC(a)}</span>
    <span class="rf-lpm-min">${min}'</span>
  </div>`;
  return `<div class="rf-lpm rf-lpm-live">
    <div class="rf-lpm-hd"><span class="rf-lpm-t">Rodada ao vivo</span>
      <span class="rf-lv-aovivo">● Ao vivo</span><div class="rf-sp"></div>
      <span class="rf-lpm-s">Séries A–D</span></div>
    <div class="rf-lpm-body">
      <span class="rf-label-t">1ª Divisão · Série A</span>
      ${linha('55.744','Corinthians',1,0,'Palmeiras',78)}
      ${linha('55.744','Flamengo',2,2,'Vasco da Gama',63)}
      <span class="rf-label-t">2ª Divisão · Série B</span>
      ${linha('55.744','Atlético-MG',0,1,'Cruzeiro',71)}
    </div>
  </div>`;
}
function rfLpMaqueteCamaroteHTML(){
  return `<div class="rf-lpm rf-lpm-cam">
    <div class="rf-lpm-hd"><span class="rf-lpm-t">🎥 Camarote</span>
      <span class="rf-lv-aovivo">● Ao vivo</span></div>
    <div class="rf-lpm-placar">
      <span class="rf-lpm-time">XV Piracicaba</span>
      <span class="rf-lv-placar"><span>1</span><span class="rf-lv-d">:</span><span>1</span></span>
      <span class="rf-lpm-time">Cianorte</span>
    </div>
    <div class="rf-lpm-pressao">
      <span class="rf-label-t">Pressão</span>
      <span class="rf-lpm-bar"><i style="width:62%"></i></span>
    </div>
    <div class="rf-lpm-narra"><span class="rf-lpm-min">56'</span>
      <span>⚽ <b>GOL DO XV!</b> Carlos Miguel empurrou pro fundo.</span></div>
  </div>`;
}
function rfLpMaqueteTabelaHTML(){
  const l=(p,n,j,v,e,d,g,pt,me,zona)=>`<div class="rf-tb-row ${me?'me':''}">
    <span class="rf-tb-pos"><i class="rf-zona ${zona||''}"></i><b>${p}</b></span>
    <span class="rf-tb-n">${escC(n)}</span>
    <span class="rf-tb-x">${j}</span><span class="rf-tb-x">${v}</span>
    <span class="rf-tb-x">${e}</span><span class="rf-tb-x">${d}</span>
    <span class="rf-tb-x">${g}</span><span class="rf-tb-p">${pt}</span></div>`;
  return `<div class="rf-lpm rf-lpm-tabela">
    <div class="rf-lpm-hd"><span class="rf-lpm-t">🏆 Classificação — Série D</span></div>
    <div class="rf-lpm-body">
      <div class="rf-label"><span class="rf-label-t">Classificação · Série D</span>
        <span class="rf-label-r">4º de 64</span></div>
      <!-- MAQUETE, NÃO CONTROLO. Estas abas e o botão do leilão mais abaixo são
           o retrato do jogo dentro da página de apresentação: ninguém os pode
           clicar, porque não há jogo nenhum por trás. Eram <button> de verdade,
           e quem navegasse a landing pelo teclado batia em quatro paragens que
           recebiam foco e não faziam nada. Viram <span>, com a aparência
           intacta e escondidos do leitor de tela. -->
      <div class="rf-tabs" aria-hidden="true">
        <span class="rf-tab on">Série D</span>
        <span class="rf-tab">Copa do Brasil</span>
        <span class="rf-tab">Libertadores</span>
      </div>
      <div class="rf-tb-head"><span></span><span></span><span>J</span><span>V</span>
        <span>E</span><span>D</span><span>GM:GS</span><span>P</span></div>
      ${l(1,'Nacional-PR',7,5,1,1,'13:5',16,false,'promo')}
      ${l(2,'Cascavel',7,4,3,0,'10:4',15,false,'promo')}
      ${l(3,'Cianorte',7,4,2,1,'11:6',14,false,'promo')}
      ${l(4,'XV Piracicaba',7,3,2,2,'9:7',11,true,'promo')}
      ${l(5,'Aimoré',7,3,2,2,'8:8',11)}
      ${l(6,'Azuriz',7,2,3,2,'7:8',9)}
      ${l(7,'Rio Branco-PR',7,1,3,3,'5:10',6,false,'drop')}
      <div class="rf-lpm-legenda">
        <span><i class="rf-zona promo"></i>acesso</span>
        <span><i class="rf-zona drop"></i>rebaixamento</span>
      </div>
    </div>
  </div>`;
}
function rfLpMaqueteChatHTML(){
  const m=(q,t)=>`<div class="cl-chat-msg"><span class="cl-chat-who">${escC(q)}:</span>
    <span class="cl-chat-txt">${escC(t)}</span></div>`;
  return `<div class="rf-lpm rf-lpm-chat">
    <div class="rf-lpm-hd"><span class="rf-lpm-t">💬 Resenha — sala do canal</span></div>
    <div class="rf-lpm-body">
      <div class="rf-chat-msgs">
        ${m('lucão','contratei o camisa 10 no leilão 🔨')}
        ${m('tiu','tomou 4 do meu time reserva kkk')}
        ${m('marreco','sobe logo essa Série D, treinador')}
      </div>
      <div class="rf-chat-in">
        <span class="rf-chat-input rf-lpm-ph">Manda a braba na resenha</span>
        <span class="rf-chat-send">➤</span>
      </div>
      <div class="rf-lpm-sala">
        <span>🟢 18 de 20 treinadores na sala</span><div class="rf-sp"></div>
        <span class="rf-label-r">Sala #RF-7742</span>
      </div>
    </div>
  </div>`;
}
function rfLpMaqueteLeilaoHTML(){
  const l=(n,p,i,v)=>`<div class="rf-lpm-lote">
    <span class="rf-lpm-ln">${escC(n)}</span>
    <span class="rf-lpm-lp">${escC(p)} · ${i}</span>
    <span class="rf-lpm-lv">${escC(v)}</span></div>`;
  return `<div class="rf-lpm rf-lpm-leilao">
    <div class="rf-lpm-hd"><span class="rf-lpm-t">🔨 Leilão de jogadores</span></div>
    <div class="rf-lpm-body">
      ${l('Kauã Patrick','MEI',22,'R$ 240k')}
      ${l('Fidel Rocha','ATA',24,'R$ 230k')}
      ${l('Bruno Limão','ZAG',26,'R$ 120k')}
      <span class="rf-lp-cta2" aria-hidden="true">🔨 Cobrir lance</span>
    </div>
  </div>`;
}

/* ---- a página ---- */
function rfLandingHTML(){
  return `<div class="rf-lp">
    ${rfLpNavHTML()}

    <header class="rf-lp-hero" id="rf-lp-jogo">
      <div class="rf-lp-hero-txt">
        <span class="rf-lp-pill">● 100% online — nada pra instalar</span>
        <h1 class="rf-lp-h1">O clássico da sua infância,<br>agora online e com os amigos.</h1>
        <p class="rf-lp-p">Você é o técnico. Escala o time, negocia jogadores, cuida do caixa e briga por acesso da Série D ao topo — sozinho contra a máquina ou na resenha com até 20 treinadores na mesma liga.</p>
        <div class="rf-lp-ctas">
          <button type="button" class="rf-wiz-cta" onclick="rfLpIr('lista')">👑 Entrar na lista de espera</button>
          <button type="button" class="rf-wiz-b2" onclick="clGoModo('solo')">⚽ Jogar agora</button>
        </div>
        <span class="rf-lp-nota">Primeira versão liberada para apenas <b>500 treinadores</b>.</span>
      </div>
      <div class="rf-lp-hero-art">
        ${rfLpMaqueteAoVivoHTML()}
        ${rfLpMaqueteCamaroteHTML()}
      </div>
    </header>

    <section class="rf-lp-sec">
      ${rfLpSecaoHTML({eyebrow:'Jogue do seu jeito', titulo:'Da Série D ao topo, no seu ritmo.',
        prosa:'Pega um clube pequeno e sobe até a elite. Mercado de transferências, finanças do clube e o calendário completo de copas — sem depender de ninguém entrar na sala.',
        itens:['Séries A, B, C e D com elencos reais','Copa do Brasil, Libertadores e Sul-Americana','Partida ao vivo com narração lance a lance'],
        cta:rfIcone('jogar',16)+' Começar uma carreira', ctaOn:"clGoModo('solo')"})}
      ${rfLpMaqueteTabelaHTML()}
    </section>

    <section class="rf-lp-sec invertida" id="rf-lp-resenha">
      ${rfLpMaqueteChatHTML()}
      ${rfLpSecaoHTML({eyebrow:'Modo Resenha', titulo:'Um campeonato com a sua turma, na mesma rodada.',
        prosa:'Monte a liga do grupo do trabalho, da turma da faculdade ou da comunidade inteira. Todo mundo joga a mesma rodada ao vivo, com tabela, mercado e a zoeira rolando junto.',
        itens:['Até 20 treinadores na mesma liga','Rodada ao vivo para todo mundo ao mesmo tempo','Chat da sala durante os jogos'],
        cta:rfIcone('chat',16)+' Criar a minha sala', ctaOn:"clGoModo('resenha')"})}
    </section>

    <section class="rf-lp-sec">
      ${rfLpSecaoHTML({eyebrow:'Mercado global', titulo:'O leilão é onde a liga se decide.',
        prosa:'Cada jogador tem vários clubes disputando. Para levar, cubra a maior oferta antes das rodadas acabarem — se o seu lance ficar abaixo, a concorrência cobre na rodada seguinte.',
        itens:['Leilão aberto a todos os clubes da liga','Propostas e contrapropostas por jogador','Finanças de verdade: folha, bilheteria e sócios'],
        cta:rfIcone('leilao',16)+' Ver o mercado', ctaOn:"clGoModo('solo')"})}
      ${rfLpMaqueteLeilaoHTML()}
    </section>

    <section class="rf-lp-ligas" id="rf-lp-ligas">
      <span class="rf-lp-eyebrow">Ligas Oficiais RetroFoot</span>
      <h2 class="rf-lp-h2">Seja um dos Embaixadores RetroFoot</h2>
      <p class="rf-lp-p">Teste novos recursos antes de todo mundo e concorra a prêmios reais. Os treinadores mais bem colocados no ranking recebem convite para as Ligas Oficiais — competições fechadas, disputadas só entre embaixadores.</p>
      <div class="rf-lp-tres">
        <div class="rf-card"><span class="rf-lp-ic">🎟</span>
          <span class="rf-lp-ct">Acesso antecipado</span>
          <span class="rf-lp-cd">Recursos novos chegam primeiro para quem está no topo do ranking.</span></div>
        <div class="rf-card"><span class="rf-lp-ic">🏅</span>
          <span class="rf-lp-ct">Ligas fechadas</span>
          <span class="rf-lp-cd">Competições só entre embaixadores, com tabela e premiação própria.</span></div>
        <div class="rf-card"><span class="rf-lp-ic">💰</span>
          <span class="rf-lp-ct">Premiação real</span>
          <span class="rf-lp-cd">As competições valem prêmios em dinheiro, produtos e patrocínio da temporada.</span></div>
      </div>
    </section>

    ${rfLpListaHTML()}

    ${rfLpRodapeHTML()}
  </div>`;
}
/* A BARRA DE VAGAS LÊ O NÚMERO DE VERDADE. O 318/500 da tela de referência é
   texto de maquete; aqui ele vem de retrofoot_waitlist_count (clWaitlistCount),
   e enquanto a contagem não chega a barra fica sem número em vez de mostrar um
   inventado — número errado numa barra de escassez é pior do que número nenhum. */
function rfLpListaHTML(){
  const vagas=(typeof WAITLIST_VAGAS!=='undefined')?WAITLIST_VAGAS:500;
  const n=(typeof CL!=='undefined'&&CL.waitlistCount!=null)?CL.waitlistCount:null;
  const pct=(n!=null&&vagas)?Math.min(100,Math.round(n/vagas*1000)/10):0;
  if(typeof CL!=='undefined' && CL.waitlistCount==null && typeof clWaitlistCount==='function'){
    CL.waitlistCount=-1;                       // pede uma vez só, não a cada desenho
    setTimeout(()=>{ CL.waitlistCount=null; clWaitlistCount(); },0);
  }
  return `<section class="rf-lp-lista" id="rf-lp-lista">
    <div class="rf-lp-lista-in">
      <span class="rf-lp-eyebrow">Lista de espera</span>
      <h2 class="rf-lp-h2">Só ${vagas} treinadores entram na primeira versão.</h2>
      <p class="rf-lp-p">Entre na lista, responda uma pergunta rápida e indique os amigos que você quer na sua liga. Quem indica sobe na fila.</p>
      <div class="rf-lp-vagas">
        <div class="rf-label"><span class="rf-label-t">Vagas preenchidas</span>
          <span class="rf-label-r">${n!=null&&n>=0?n+' / '+vagas:'—'}</span></div>
        <div class="rf-fb"><i style="width:${pct}%;background:var(--club-secondary)"></i></div>
      </div>
      <button type="button" class="rf-wiz-cta" onclick="clWaitlistOpen('landing · lista de espera')">
        <span>⚽</span> Garantir minha vaga</button>
      <span class="rf-lp-nota">Leva menos de um minuto. A gente avisa por e-mail quando a sua vaga abrir.</span>
    </div>
  </section>`;
}
function rfLpRodapeHTML(){
  const col=(t,itens)=>`<div class="rf-lp-fcol"><span class="rf-lp-ft">${escC(t)}</span>
    ${itens.map(i=>Array.isArray(i)
      ? `<a class="rf-lp-fl" href="${i[1]}">${escC(i[0])}</a>`
      : `<span class="rf-lp-fl">${escC(i)}</span>`).join('')}</div>`;
  const paginas=(typeof LANDING_PAGINAS!=='undefined'?LANDING_PAGINAS:[]).map(([slug,label])=>[label,'/'+slug+'/']);
  return `<footer class="rf-lp-rodape">
    <div class="rf-lp-fgrid">
      <div class="rf-lp-fmarca">
        <a class="rf-lp-marca" href="/"><img src="img/logo.webp" width="32" height="32" alt="">
          <span>RetroFoot<span class="rf-wiz-marca-98">98</span></span></a>
        <p class="rf-lp-fp">O jogo de gerenciamento de futebol que você jogava na escola — agora online, com os amigos e no navegador.</p>
      </div>
      ${col('O jogo',['Jogar agora','Modo Resenha','Ranking','Ligas Oficiais'])}
      ${col('Para marcas',['Cotas de patrocínio','Media kit','Parceria de canal'])}
      ${col('Conteúdo',['Blog','Guia do jogo','Canais oficiais'])}
      ${col('Páginas',paginas)}
    </div>
    <div class="rf-lp-fbase">
      <span>© 2026 RetroFoot98 · Termos · Privacidade</span>
      <div class="rf-sp"></div>
      <span class="rf-lp-fv">v2026.01 — feito por quem cresceu jogando Elifoot.</span>
    </div>
  </footer>`;
}
