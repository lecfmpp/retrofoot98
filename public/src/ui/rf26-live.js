/* =====================================================================
   RetroFoot98 — PARTIDA AO VIVO (rebranding 2026)
   Portado de docs/rebranding-2026/telas/PartidaAoVivo.html.

   A tela é a RODADA inteira acontecendo ao mesmo tempo: uma faixa de
   estado no topo, um card por divisão e, dentro dele, uma linha por jogo.

   A LINHA DO JOGO TEM 56px DE ALTURA E NÃO CRESCE. Essa é a regra dura da
   referência, e a razão é concreta: num 4 a 3 os fatos empilhavam e a
   lista inteira dançava debaixo do olho de quem estava tentando ler o
   placar. Os fatos entram como pastilhas na coluna do time; o que não
   couber vira "+N".

   Grade da linha (da referência):
     64px · CASA (1fr) · PLACAR 92px · VISITANTE (1fr) · MIN 46px
   ===================================================================== */

/* ---- pastilha de fato: ⚽ nome 31' ---- */
function rfLvFatoHTML(f){
  const ic={gol:'⚽',cartao:'🟨',vermelho:'🟥',lesao:'✚',sub:'🔄',penperdido:'❌'}[f.kind]||'⚽';
  return `<span class="rf-lv-fato">
    <span class="rf-lv-fi">${ic}</span>
    <span class="rf-lv-fn">${escC(f.nome||'')}</span>
    <span class="rf-lv-fm">${f.min!=null?f.min+"'":''}</span>
  </span>`;
}
/* os fatos de um lado: cabe UM por extenso; o resto vira contador */
function rfLvFatosHTML(fatos, lado){
  fatos=fatos||[];
  if(!fatos.length) return `<span class="rf-lv-fatos ${lado}"></span>`;
  const ultimo=fatos[fatos.length-1];
  const extras=fatos.length-1;
  const mais=extras>0?`<span class="rf-lv-mais" title="${extras} fato(s) antes">+${extras}</span>`:'';
  return `<span class="rf-lv-fatos ${lado}">${lado==='esq'?mais+rfLvFatoHTML(ultimo):rfLvFatoHTML(ultimo)+mais}</span>`;
}
/* o ingresso desenhado em CSS (a referência não usa emoji aqui) */
function rfLvTicketHTML(){
  return `<span class="rf-lv-ticket" aria-hidden="true"><i class="a"></i><i class="b"></i><i class="c"></i></span>`;
}
/* placar: painel escuro com dígitos amarelos */
function rfLvPlacarHTML(gh,ga,ativo){
  return `<span class="rf-lv-placar ${ativo?'ao-vivo':''}"><span class="rf-lv-g">${gh}</span><span class="rf-lv-d">:</span><span class="rf-lv-g">${ga}</span></span>`;
}

/* ---- uma linha de jogo ---- */
function rfLvLinhaHTML(m,i){
  const hc=anyClubOf(m.h)||{short:'—'}, ac=anyClubOf(m.a)||{short:'—'};
  const meu=(m.h===CL.clubId||m.a===CL.clubId);
  // O LADO VEM EM MAIÚSCULA. O motor grava side:'H'/'A' (ver o laço de
  // incidentes em main.js); comparar com 'h' minúsculo não casava com nada
  // e a linha ficava sempre sem fatos — era por isso que a tela parecia
  // vazia mesmo com gols e cartões acontecendo.
  const inc=m.incidents||[];
  const lado=x=>String(x.side||'').toUpperCase();
  const fh=inc.filter(x=>lado(x)==='H').map(rfLvIncToFato);
  const fa=inc.filter(x=>lado(x)==='A').map(rfLvIncToFato);
  const gh=m.hg!=null?m.hg:(m.gh||0), ga=m.ag!=null?m.ag:(m.ga||0);
  return `<div class="rf-lv-linha ${meu?'meu':''}" onclick="liveRowClick(${i})">
    <span class="rf-lv-pub">${rfLvTicketHTML()}${grp(m.att||0)}</span>
    <!-- os dois recipientes de fatos levam id porque quem os actualiza a cada
         tique e o updateLive(), e ele so mexe em nos com id. Ver a nota la. -->
    <span class="rf-lv-lado casa">
      <span id="rf-lv-fh-${i}" class="rf-lv-fatos-slot">${rfLvFatosHTML(fh,'esq')}</span>
      <span class="rf-lv-n ${gh>ga?'frente':''}">${escC(hc.short)}</span>
      <span class="rf-lv-crest">${rfCrest(hc,30)}</span>
    </span>
    <span id="cl-lm-${i}">${rfLvPlacarHTML(gh,ga,true)}</span>
    <span class="rf-lv-lado fora">
      <span class="rf-lv-crest">${rfCrest(ac,30)}</span>
      <span class="rf-lv-n ${ga>gh?'frente':''}">${escC(ac.short)}</span>
      <span id="rf-lv-fa-${i}" class="rf-lv-fatos-slot">${rfLvFatosHTML(fa,'dir')}</span>
    </span>
    <span class="rf-lv-min" id="cl-lg-${i}">${(m.done||((typeof liveJogoEncerrado==='function')&&liveJogoEncerrado(m,CL.live)))
      ?'FIM':((m.min!=null?m.min:((CL.live&&(CL.live.minute||CL.live.min))||0))+"'")}</span>
  </div>`;
}
/* o motor não tem um tipo "vermelho": manda type:'cartao' com
   cardType:'vermelho'. E pênalti é gol quando entra, cartão perdido
   quando não. Sem esta tradução o vermelho saía como amarelo. */
function rfLvIncToFato(x){
  let kind=x.kind||x.type||'gol';
  if(kind==='cartao' && String(x.cardType||'').toLowerCase().indexOf('verm')===0) kind='vermelho';
  if(kind==='penalti') kind=x.scored?'gol':'penperdido';
  return {kind, nome:x.player||x.name||x.n||'', min:x.min};
}

/* Os fatos de uma partida, prontos para os dois lados. Chamado no desenho e a
   cada tique (updateLive), para os dois caminhos darem exactamente o mesmo
   HTML — era a divergencia entre eles que punha os fatos fora do card. */
function rfLvFatosDeJogo(m){
  const inc=m.incidents||[];
  const lado=x=>String(x.side||'').toUpperCase();
  return { casa:inc.filter(x=>lado(x)==='H').map(rfLvIncToFato),
           fora:inc.filter(x=>lado(x)==='A').map(rfLvIncToFato) };
}

/* A identidade da competicao (tema, trofeu, nome, linha) vive em rf26.js:
   e usada pela rodada ao vivo, pelo Camarote, pelos Campeonatos e por todas
   as telas de palco de competicao. */

/* ---- o trilho de competições ----
   Uma pastilha por competição EM JOGO nesta rodada, na mesma ordem dos
   cards. A ativa manda na paleta do cabeçalho; tocar noutra troca o
   cabeçalho e leva ao card dela. Com uma competição só não há escolha a
   fazer, e o trilho não aparece. */
function rfLvOrdem(RL){
  const vistas=[];
  ((RL&&RL.matches)||[]).forEach(m=>{ const d=m.div||S.division; if(vistas.indexOf(d)<0) vistas.push(d); });
  const preferida=(typeof divOrderUserFirst==='function')?divOrderUserFirst():[];
  const primeiro=preferida.filter(d=>vistas.indexOf(d)>=0);
  return primeiro.concat(vistas.filter(d=>primeiro.indexOf(d)<0));
}
function rfLvCompAtiva(RL){
  const ids=rfLvOrdem(RL);
  if(CL.lvComp && ids.indexOf(CL.lvComp)>=0) return CL.lvComp;
  const meu=((RL&&RL.matches)||[]).find(m=>m.user);
  return (meu&&(meu.div||S.division)) || ids[0] || S.division;
}
/* a pastilha guarda a paleta DELA, não a do cabeçalho: é assim que o
   trilho mostra de relance que a Libertadores é dourada e a Copa do
   Brasil é verde mesmo enquanto se vê a Série D. */
function rfTrilhoHTML(RL){
  const ids=rfLvOrdem(RL);
  if(ids.length<2) return '';
  const ativo=rfLvCompAtiva(RL);
  return `<div class="rf-trilho">${ids.map(d=>{
    const info=rfCompInfo(d), on=(d===ativo), meta=rfCompMeta(info);
    return `<button type="button" class="rf-tema rf-trilho-chip${on?' on':''}" data-tema="${info.tema}"
      onclick="rfLvComp('${escC(d)}')"${on?' aria-current="true"':''}>
      <span class="rf-trilho-bar"></span>
      ${rfCompTrofeuHTML(info,26)}
      <span class="rf-trilho-txt">
        <span class="rf-trilho-n">${escC(info.curto)}</span>
        ${meta?`<span class="rf-trilho-m">${escC(meta)}</span>`:''}
      </span>
    </button>`;
  }).join('')}</div>`;
}
/* trocar de competição no trilho: repinta o cabeçalho e leva ao card dela.
   Vindo do Camarote, sai do Camarote primeiro — a rodada é que tem os
   cards, e a nota da faixa promete que ela continua a rolar ao fundo. */
function rfLvComp(d){
  CL.lvComp=d;
  const noCam=!!document.querySelector('.rf-cam');
  if(noCam && typeof camToggle==='function') camToggle(); else cdraw();
  setTimeout(()=>{ const el=document.getElementById('rf-lv-c-'+d);
    if(el&&el.scrollIntoView) el.scrollIntoView({behavior:'smooth',block:'start'}); },60);
}

/* ---- faixa de estado no topo ---- */
function rfLvFaixaHTML(RL){
  const meu=(RL.matches||[]).find(m=>m.user);
  const min=RL.minute||RL.min||0;
  /* A FAIXA TEM DE DIZER QUE O MEU JOGO ACABOU. Ela so sabia dizer "1º tempo"/"2º tempo", entao
     aos 92, com o meu jogo ja apitado e a rodada a correr para os outros, continuava a anunciar
     "2º tempo" -- e o relogio ao lado parecia parado sem motivo. Mesmo vocabulario do Camarote. */
  const periodo = RL.pens ? 'Pênaltis'
    : RL.extraStartMinute!=null ? 'Prorrogação'
    : (meu && typeof liveJogoEncerrado==='function' && liveJogoEncerrado(meu,RL)) ? 'Seu jogo encerrado'
    : min<=45 ? '1º tempo' : min<=90 ? '2º tempo' : 'Acréscimos';
  const pct=(typeof liveClockPct==='function')?liveClockPct(RL):Math.min(100,Math.round(100*min/90));
  /* O INTERRUPTOR DO CAMAROTE NUNCA SOME. No Foguete/Usain Bolt a velocidade tranca o modo
     (camSpeedOk) e este botao simplesmente desaparecia — parecia que o Camarote tinha sido
     removido do jogo. O desenho de sempre (camSwitchHTML, pele antiga) mantem o controle na
     tela, apagado e com a explicacao; aqui passa a ser igual: o clique no estado trancado
     mostra o aviso (camToggle ja faz isso). */
  const camOk=meu && (typeof camSpeedOk!=='function' || camSpeedOk());
  const info=rfCompInfo(rfLvCompAtiva(RL));
  const hc=meu?(anyClubOf(meu.h)||{}):null, ac=meu?(anyClubOf(meu.a)||{}):null;
  return `<div class="rf-tema rf-lv-faixa" data-tema="${info.tema}">
    <div class="rf-band-filete"></div>
    ${rfCompTrofeuHTML(info,52)}
    <div class="rf-lv-faixa-id">
      <div class="rf-lv-faixa-l1">
        <span class="rf-lv-faixa-t">${escC(info.nome)}</span>
        <span class="rf-lv-aovivo"><i>●</i> Ao vivo</span>
      </div>
      <span class="rf-lv-faixa-s">${escC(rfCompLinha(info,RL))}</span>
    </div>
    <div class="rf-sp"></div>
    <div class="rf-lv-stat">
      <span class="rf-lv-sl">Jogos em andamento</span>
      <span class="rf-lv-sv">${(RL.matches||[]).length}</span>
    </div>
    <!-- ids para o updateLive remendar sem redesenhar a faixa toda: quem so
         ASSISTE nao tinha relogio nenhum a andar (ver updateLive) -->
    <div class="rf-lv-jogo">
      <div class="rf-lv-relogio" id="rf-lv-anel" style="--pct:${pct}"><span id="rf-lv-min">${min}'</span></div>
      <div class="rf-lv-stat end">
        <span class="rf-lv-sl${meu?' tem-jogo':''}">${escC(periodo)}</span>
        ${meu?`<span class="rf-lv-sh rf-so-desktop">seu jogo: ${meu.hg||0} × ${meu.ag||0}</span>
              <span class="rf-lv-sh rf-so-mobile">${escC(hc.short||hc.name||'—')} ${meu.hg||0} × ${meu.ag||0} ${escC(ac.short||ac.name||'—')}</span>`
             :`<span class="rf-lv-sh">sem jogo seu</span>`}
      </div>
      ${meu?`<button type="button" class="rf-lv-cam ${camOk?'':'dis'}" onclick="camToggle()"
        title="${camOk?'':escC((typeof camSpeedHint==='function')?camSpeedHint():'')}">${rfIcone('camarote',16)}
        <b class="rf-so-desktop">Modo Camarote</b><b class="rf-so-mobile">Camarote</b></button>`:''}
    </div>
  </div>`;
}

/* ---- a tela inteira ---- */
function rfLiveHTML(RL){
  if(!RL) return '';
  // O Camarote é a VISÃO PADRÃO (camOn devolve true enquanto ninguém desligar) e
  // só existe quando há partida DO USUÁRIO nesta rodada — no modo espectador de
  // copa não há jogo dele pra assistir de camarote.
  const camAberto = (RL.matches||[]).some(m=>m.user)
    && typeof camOn==='function' && camOn();
  const porDiv={};
  (RL.matches||[]).forEach((m,i)=>{ const d=m.div||S.division; (porDiv[d]=porDiv[d]||[]).push({m,i}); });
  /* A ORDEM NÃO PODE DESCARTAR GRUPO NENHUM. `divOrderUserFirst()` devolve só as
     quatro divisões da liga; numa rodada de COPA os jogos vêm marcados com a
     chave da competição (libertadores, copa do brasil…), que não está nessa
     lista — e o filtro logo abaixo apagava TODOS os cartões. O resultado era a
     tela ao vivo com a faixa azul dizendo "16 jogos em andamento" e nada por
     baixo, justamente quando o utilizador é espectador e a tela é tudo o que ele
     tem. Agora a ordem preferida vem primeiro e o que sobrar entra atrás, em vez
     de sumir. */
  const ordem=rfLvOrdem(RL);
  /* Cada faixa de divisao abre com o trofeu e o nome da competicao: sem
     isso, quatro cards brancos seguidos nao diziam onde e que cada jogo
     estava a acontecer. */
  const cards=ordem.filter(d=>porDiv[d]&&porDiv[d].length).map(d=>{
    const info=rfCompInfo(d);
    const kicker=info.copa?rfCompFase(info)
      :((typeof classifDivName==='function')?classifDivName(d):'');
    return `
    <div class="rf-lv-card" id="rf-lv-c-${escC(d)}">
      <div class="rf-lv-chd">
        <span class="rf-lv-chd-id">
          ${rfCompTrofeuHTML(info,24)}
          <span class="rf-lv-chd-t">${escC(info.nome)}</span>
          ${kicker?`<span class="rf-lv-chd-k">${escC(kicker)}</span>`:''}
        </span>
        <span class="rf-label-r">${porDiv[d].length} jogo${porDiv[d].length>1?'s':''}</span>
      </div>
      <div class="rf-lv-head">
        <span>Público</span><span>Casa</span><span>Placar</span><span>Visitante</span><span>Min</span>
      </div>
      ${porDiv[d].map(x=>rfLvLinhaHTML(x.m,x.i)).join('')}
    </div>`;}).join('');
  return `<div class="rf-lv">
    <div class="rf-lv-env">
      ${rfRail('left')}
      <div class="rf-lv-mid">
        ${rfLvFaixaHTML(RL)}
        ${rfTrilhoHTML(RL)}
        ${(typeof rfAdEspaco==='function')?rfAdEspaco('rf98.live.inline',{cls:'rf-ad-inline',formato:'970×90'}):''}
        ${cards}
      </div>
      ${rfRail('right')}
    </div>
    ${camAberto?rfCamHTML(RL):''}
    ${rfLvSobreposicaoHTML(RL)}
  </div>`;
}

/* =====================================================================
   AS SOBREPOSIÇÕES DA PARTIDA — substituição, lesão, expulsão, pênalti e
   disputa de pênaltis.
   ELAS NÃO APARECIAM. O motor abria cada uma direitinho (openInjuryModal,
   openRedCardModal, RL.penEvent…), mas quem as desenhava era `liveModalHTML`,
   chamado só no trecho de `scLive` que vem DEPOIS do `return rfLiveHTML(RL)` —
   ou seja, código morto desde que a tela nova assumiu. Mesma história do
   Camarote. Aqui a tela nova chama as telas do pacote diretamente; o invólucro
   antigo (título, ficha do árbitro, banner) fica de fora de propósito, porque
   cada uma dessas telas já traz o próprio envelope de tela cheia.
   ===================================================================== */
function rfLvSobreposicaoHTML(RL){
  const m=(RL.matches||[]).find(x=>x.user); if(!m) return '';
  /* A DISPUTA FICA NA TELA DO INICIO AO FIM. O gatilho era `RL.pensPicking`, que so e
     verdadeiro enquanto uma cobranca esta a decorrer -- entre uma cobranca e a seguinte
     (o respiro de 1,2s de recordShootoutKick) ele volta a falso e a tela da disputa
     DESAPARECIA, deixando ver a rodada por tras. Piscava a cada cobranca. Agora basta
     existir disputa: e a propria tela que muda de corpo conforme a fase. */
  if(RL.pens && !RL.done) return (typeof shootoutPickerHTML==='function')?shootoutPickerHTML():'';
  if(RL.penEvent && RL.penMatch===m) return (typeof penaltyPickerHTML==='function')?penaltyPickerHTML():'';
  if(RL.injEvent && RL.injMatch===m) return (typeof rfLesaoHTML==='function')?rfLesaoHTML(m,RL.injEvent):'';
  if(RL.redEvent && RL.redMatch===m) return (typeof rfExpulsaoHTML==='function')?rfExpulsaoHTML(m,RL.redEvent):'';
  // SUBSTITUIÇÃO SÓ NO INTERVALO — a regra do jogo. `RL.paused` é a pausa do
  // MOTOR (intervalo); a pausa do utilizador no Camarote é `RL.userPaused` e
  // não abre painel nenhum.
  const intervalo = RL.paused && !RL.pens && !m.replay;
  if(CL.subOpen || intervalo) return (typeof rfSubHTML==='function')?rfSubHTML(m):'';
  return '';
}

/* =====================================================================
   MODO CAMAROTE — telas-v3/Modo Camarote.dc.html
   Sobreposição em tela cheia sobre a rodada, que continua rolando ao fundo.
   Aqui mora só o DESENHO; o motor é o de sempre (main.js): camMinuteNow dá o
   relógio, camShare dá a pressão, m.camStats dá a estatística e m.narr dá a
   narração. Os ids (#rf-cam-dyn, #rf-cam-hg, #rf-cam-min, #rf-cam-presh,
   #rf-cam-lines…) são CONTRATO com camUpdate/camPatchBoard/camPatchFeed, que
   atualizam no lugar em vez de redesenhar — mexer neles apaga a animação da
   narração e faz a barra de pressão pular em vez de deslizar.
   ===================================================================== */
function rfCamHTML(RL){
  RL=RL||CL.live; if(!RL) return '';
  const m=(RL.matches||[]).find(x=>x.user); if(!m) return '';
  camEnsure(m);
  const info=rfCompInfo(m.div||S.division);
  return `<div class="rf-cam rf-tema" data-tema="${info.tema}" onclick="camBackdrop(event)">
    <div class="rf-cam-env">
      ${rfRail('left')}
      <div class="rf-cam-mid">
        <div class="rf-cam-shell">
          <div class="rf-cam-faixa">
            <div class="rf-band-filete"></div>
            ${rfCompTrofeuHTML(info,44)}
            <div class="rf-cam-id">
              <div class="rf-cam-l1">
                <span class="rf-cam-ic">🎥</span>
                <span class="rf-cam-t">Camarote</span>
                <span class="rf-cam-aovivo" id="rf-cam-onair" ${camMatchOver(m)?'hidden':''}><i>●</i> AO VIVO</span>
              </div>
              <span class="rf-cam-comp">${escC([info.nome,rfCompLinha(info)].filter(Boolean).join(' · '))}</span>
            </div>
            <div class="rf-sp"></div>
            <span class="rf-cam-nota">os outros jogos seguem rolando ao fundo</span>
            <button type="button" class="rf-cam-x" onclick="camToggle()" title="Voltar à semana (Esc)">
              <b class="rf-so-desktop">✖ Voltar à semana</b><b class="rf-so-mobile">✖</b></button>
          </div>
          <!-- O TRILHO DE COMPETICOES NAO ENTRA AQUI. Ele existe para escolher QUAL
               competicao se esta a ver, e no Camarote nao ha essa escolha: a tela
               inteira e uma partida so', a sua. As pastilhas prometiam uma troca
               que este ecra nao faz -- levavam ao card de outra competicao, que
               nem sequer esta visivel daqui dentro. Elas ficam na rodada ao vivo
               (ver rfLiveHTML), que e onde se veem todos os jogos e a escolha
               significa alguma coisa. -->
          <!-- A BANDA DE PATROCINIO SOBE PARA CIMA DO CONTEUDO. Estava entre o
               miolo dinamico e o rodape, ou seja, no fundo: quem entra no
               Camarote para VER O JOGO nunca rolava ate la, e o espaco vendido
               ficava sem audiencia. Aqui em cima ela e vista sem rolar, e nao
               empurra o jogo para fora da dobra porque tem 60px de altura. -->
          ${rfCamPatroHTML()}
          <div id="rf-cam-dyn" data-tab="${escC(CL.camTab||'panorama')}">${camDynHTML(m)}</div>
          <div class="rf-cam-rodape">
            <span>Esc ou ✖ para voltar à semana</span>
            <span>O Camarote mostra só o seu jogo — a semana inteira continua ao fundo</span>
          </div>
        </div>
      </div>
      ${rfRail('right')}
    </div>
  </div>`;
}

/* o miolo que muda a cada minuto — vive dentro de #rf-cam-dyn e é o único
   pedaço que camUpdate redesenha inteiro (só na troca de aba). */
function rfCamDynHTML(m){
  const RL=CL.live||{};
  const tab=CL.camTab||'panorama';
  const mn=camMinuteNow(m,RL), fim=camMatchOver(m);
  const periodo = RL.pens ? 'PÊNALTIS'
    : RL.extraStartMinute!=null ? 'PRORROGAÇÃO'
    : fim ? ((m.streamRemote && m.streamDead && !m.streamDone) ? 'SEM SINAL' : 'ENCERRADO')
    : mn<=45 ? '1º TEMPO' : mn<=90 ? '2º TEMPO' : 'ACRÉSCIMOS';
  const verNarra = tab!=='estatisticas', verStats = tab!=='comentarios';
  const aba=(k,l)=>`<button type="button" class="rf-cam-aba ${tab===k?'on':''}" onclick="camTab('${k}')">${l}</button>`;
  // no Resenha o ritmo é do anfitrião: não há o que pausar aqui.
  const play = CL.online
    ? `<span class="rf-cam-ritmo" title="No Resenha o ritmo é o do anfitrião">⏱ ritmo da sala</span>`
    : `<button type="button" class="rf-cam-pausar" onclick="camTogglePlay()" ${fim?'disabled':''}>${fim?'Fim':(RL.userPaused?'▶ Jogar':'⏸ Pausar')}</button>`;
  return rfCamBoardHTML(m,mn,periodo)
    + rfCamPressaoHTML(m)
    + `<div class="rf-cam-abas">${aba('panorama','Panorama do Jogo')}${aba('comentarios','Comentários')}${aba('estatisticas','Estatísticas')}<div class="rf-sp"></div>${play}</div>`
    + `<div class="rf-cam-body${(verNarra&&verStats)?'':' unica'}">${verNarra?rfCamFeedHTML(m):''}${verStats?rfCamStatsHTML(m):''}</div>`;
}

/* PLACAR DE ESTÁDIO — a foto do estádio do mandante entra como fundo, com um
   véu navy por cima pra o texto continuar legível em qualquer arte. Clube sem
   foto no acervo cai no navy chapado, que é o mesmo fundo do véu. */
function rfCamBoardHTML(m,mn,periodo){
  const RL=CL.live||{};
  const hc=clubOf(m.h)||{}, ac=clubOf(m.a)||{};
  const foto=(window.STADIUM_IMG||{})[m.h];
  const euEmCasa = m.h===CL.clubId;
  const onze=(typeof xiPlayers==='function')?xiPlayers(CL.clubId).length:11;
  const meuSub=`${escC(CL.formation||'—')} · onze ${onze}/11`;
  const eleSub=`${RL.jornada||((S.round||0)+1)}ª semana`;
  const pct=(typeof liveClockPct==='function')?liveClockPct(RL):0;
  return `<div class="rf-cam-board"${foto?` style="background-image:url('${escC(foto)}')"`:''}>
    <span class="rf-cam-veu"></span>
    <div class="rf-cam-lado">
      <div class="rf-cam-lado-txt">
        <span class="rf-cam-onde">EM CASA</span>
        <span class="rf-cam-time">${escC(hc.short||hc.name||'—')}</span>
        <span class="rf-cam-sub">${euEmCasa?meuSub:eleSub}</span>
      </div>
      <span class="rf-cam-crest">${rfCrest(hc,52)}</span>
    </div>
    <div class="rf-cam-placar">
      <span class="rf-cam-matriz"></span>
      <span class="rf-cam-g" id="rf-cam-hg">${m.hg}</span>
      <span class="rf-cam-d">:</span>
      <span class="rf-cam-g" id="rf-cam-ag">${m.ag}</span>
    </div>
    <div class="rf-cam-lado fim">
      <span class="rf-cam-crest">${rfCrest(ac,52)}</span>
      <div class="rf-cam-lado-txt">
        <span class="rf-cam-onde">VISITANTE</span>
        <span class="rf-cam-time">${escC(ac.short||ac.name||'—')}</span>
        <span class="rf-cam-sub">${euEmCasa?eleSub:meuSub}</span>
      </div>
    </div>
    <div class="rf-cam-relogio">
      <span class="rf-cam-anel" id="rf-cam-anel" style="--pct:${pct}"><b id="rf-cam-min">${mn}'</b></span>
      <span class="rf-cam-per" id="rf-cam-period">${periodo}</span>
    </div>
  </div>`;
}

/* BARRA DE PRESSÃO — quem manda no jogo AGORA. As cores saem de camBarColors,
   que já resolve o caso de dois clubes de cor parecida. */
function rfCamPressaoHTML(m){
  const hc=clubOf(m.h)||{}, ac=clubOf(m.a)||{};
  const sh=camShare(m);
  const cores=camBarColors(hc,ac);
  const tag = sh>=64 ? (hc.short||'')+' PRESSIONA' : sh<=36 ? (ac.short||'')+' PRESSIONA' : 'JOGO EQUILIBRADO';
  return `<div class="rf-cam-pressao">
    <span class="rf-cam-pressao-l">PRESSÃO</span>
    <span class="rf-cam-bar">
      <i id="rf-cam-presh" style="width:${sh}%;background:${cores.colH}"></i>
      <i id="rf-cam-presa" style="width:${100-sh}%;background:${cores.colA}"></i>
      <b class="rf-cam-meio"></b>
    </span>
    <span class="rf-cam-tag" id="rf-cam-prestag">${escC(tag)}</span>
  </div>`;
}

/* NARRAÇÃO — mais recente no topo. As linhas moram num container próprio
   (#rf-cam-lines) porque camPatchFeed só ACRESCENTA as novas: redesenhar o
   feed inteiro fazia todas re-animarem juntas e o texto piscava sem parar. */
function rfCamFeedHTML(m){
  const hc=clubOf(m.h)||{};
  const linhas=(m.narr||[]).slice().reverse().map(rfCamLinhaHTML).join('');
  return `<div class="rf-card rf-cam-feed">
    <div class="rf-label">
      <span class="rf-label-t">NARRAÇÃO AO VIVO</span>
      <span class="rf-label-r">Casa do ${escC(hc.short||'')} · ${grp(m.att||0)} pagantes</span>
    </div>
    <div class="rf-cam-narra" id="rf-cam-lines" data-n="${(m.narr||[]).length}">${
      linhas||'<span class="rf-cam-vazio">O árbitro já vai apitar</span>'}</div>
  </div>`;
}
/* o desenho novo separa o gol DELE do gol CONTRA — um pinta de azul, o outro de
   vermelho. O motor só manda o tipo do lance, então camOnEvent passou a guardar
   também o lado (side) na linha; sem ele, tudo cai no azul. */
function rfCamLinhaHTML(l){
  const m=camMatch();
  const meu = m ? (m.h===CL.clubId?'H':'A') : 'H';
  let t=l.kind||'n';
  if(t==='gol' && l.side && l.side!==meu) t='gol-contra';
  return `<div class="rf-cam-linha k-${escC(t)}">
    <span class="rf-cam-lmin">${l.min}'</span>
    <span class="rf-cam-lic">${l.icon||''}</span>
    <span class="rf-cam-ltx">${escC(l.text||'')}</span>
  </div>`;
}

/* ESTATÍSTICAS + FICHA — a coluna da direita inteira. Sai embrulhada em
   .rf-cam-stats porque é ESSE nó que camUpdate troca a cada minuto.
   Posse vem do motor quando a partida roda/transmite aqui; no replay de um
   resultado já publicado pelo adversário não há posse minuto a minuto — aí a
   linha vira "Domínio em campo", medido pela própria barra de pressão. */
function rfCamStatsHTML(m){
  const hc=clubOf(m.h)||{}, ac=clubOf(m.a)||{};
  const cores=camBarColors(hc,ac);
  const live=(m.sim&&m.sim.perf)||m.livePerf||null;
  /* O NUMERO E' O MESMO DA BARRA DE PRESSAO LA' EM CIMA (camEquilibrio, ui/main.js):
     uma conta so', em vez de duas iguais que podem divergir na proxima mudanca. O
     rotulo continua a dizer QUAL das duas fontes esta a ser usada. */
  const possLbl=(live && ((live.H.poss+live.A.poss)>0)) ? 'Posse de bola' : 'Domínio em campo';
  const ph=(typeof camEquilibrio==='function')?camEquilibrio(m)
    :(live&&(live.H.poss+live.A.poss)>0?Math.round(100*live.H.poss/(live.H.poss+live.A.poss))
      :Math.round(100*(m.domH||0)/((m.domH+m.domA)||1)));
  const pa=100-ph;
  const H=m.camStats.H, A=m.camStats.A;
  // as duas barras são ESPELHADAS e normalizadas pelo maior dos dois, não pela
  // soma: 11×7 tem que ler como 11 contra 7, não como 61% contra 39%.
  const linha=(lbl,a,b,va,vb)=>{ const mx=Math.max(va,vb,1);
    return `<div class="rf-cam-st">
      <div class="rf-cam-st-top"><span>${a}</span><span class="rf-cam-st-l">${escC(lbl)}</span><span>${b}</span></div>
      <div class="rf-cam-st-bars">
        <span class="rf-cam-st-b esq"><i style="width:${Math.round(100*va/mx)}%;background:${cores.colH}"></i></span>
        <span class="rf-cam-st-b dir"><i style="width:${Math.round(100*vb/mx)}%;background:${cores.colA}"></i></span>
      </div></div>`; };
  const cart=s=>(s.yellow+s.red);
  const cartTxt=s=>`${s.yellow}🟨${s.red?' '+s.red+'🟥':''}`;
  const usadas=CL.subsUsed||0;
  const bolinhas=[0,1,2].map(i=>`<i class="${i<usadas?'on':''}"></i>`).join('');
  return `<div class="rf-cam-stats">
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">ESTATÍSTICAS</span>
        <span class="rf-label-r">${escC(hc.short||'')} · ${escC(ac.short||'')}</span></div>
      ${linha(possLbl,ph+'%',pa+'%',ph,pa)}
      ${linha('Finalizações',H.shots,A.shots,H.shots,A.shots)}
      ${linha('No alvo',H.onTarget,A.onTarget,H.onTarget,A.onTarget)}
      ${linha('Defesas',H.saves,A.saves,H.saves,A.saves)}
      ${linha('Cartões',cartTxt(H),cartTxt(A),cart(H),cart(A))}
      ${linha('Substituições',H.subs,A.subs,H.subs,A.subs)}
    </div>
    <div class="rf-card">
      <span class="rf-label-t">FICHA</span>
      <div class="rf-cam-fl"><span>Árbitro</span><b>${escC(m.ref||'—')}</b></div>
      <div class="rf-cam-fl"><span>Público</span><b class="mono">${grp(m.att||0)}</b></div>
      ${m.price?`<div class="rf-cam-fl"><span>Ingresso</span><b class="mono">${grp(m.price)}</b></div>`:''}
      <div class="rf-cam-fl"><span>Sua tática</span><b>${escC((CL.formation?CL.formation+' ':'')+(CAM_TATICA[S.tactic]||S.tactic||'—'))}</b></div>
      <div class="rf-cam-hr"></div>
      <div class="rf-cam-fl"><span>Substituições</span>
        <span class="rf-cam-subs"><span class="rf-cam-bolinhas">${bolinhas}</span><b class="mono">${usadas} de 3</b></span></div>
    </div>
  </div>`;
}

/* BANDA DE PATROCÍNIO — CINCO LUGARES, CADA UM COM O SEU BOTÃO
   ---------------------------------------------------------------------
   A banda tem cinco pastilhas de logo e UM botão, à direita. O destaque gira
   com o relógio da partida (um lugar a cada 8 minutos, em camUpdate) e o botão
   acompanha: ele é sempre o do patrocinador em destaque.

   O QUE ESTÁ NO BOTÃO VEM DO PAINEL, não do código. Texto, cor de fundo e cor
   do texto viajam com o criativo (ad_creatives.cta_texto/cta_bg/cta_fg) e a
   URL é o mesmo link_destino do logo — o anunciante compra um destino, não
   dois. Antes isto vinha de AD_SPONSORS, a lista de marcas de casa embutida no
   jogo: para trocar a chamada de um patrocinador era preciso publicar o jogo.

   SEM TEXTO NÃO HÁ BOTÃO. É assim que um patrocinador que só quer o logo fica
   só com o logo, sem precisar de outra chave.

   O 1º LUGAR TEM UM SUPLENTE. rf98.pausa.barra é o patrocínio de apresentação
   e cobre as outras faixas de "apresentado por" do jogo; enquanto
   rf98.camarote.logo1 estiver vazio, é ele que aparece ali — quem já comprou a
   apresentação continua a ser entregue no Camarote.

   AS CHAVES SÃO CONTRATO com elifoot_v3.ad_spaces (ver
   scripts/sql/ad_botao_por_patrocinador.sql) — não renomear de um lado só. */
const RF_CAM_LOGOS=['rf98.camarote.logo1','rf98.camarote.logo2','rf98.camarote.logo3',
                    'rf98.camarote.logo4','rf98.camarote.logo5'];
const RF_CAM_LOGO1_ALT='rf98.pausa.barra';
/* cor do botão do patrocinador; sem cor publicada, a da marca do jogo */
function rfCamCtaCores(c){
  const cor=v=>(/^#[0-9a-f]{3,8}$/i.test(String(v||'').trim())?String(v).trim():null);
  return { bg: cor(c&&c.cta_bg) || 'var(--brand-secondary,#F2B90C)',
           fg: cor(c&&c.cta_fg) || 'var(--brand-primary,#17458F)' };
}
/* o criativo de um lugar da banda (com o suplente do 1º lugar) */
function rfCamLogo(k){
  const pega=c=>(typeof ADS!=='undefined'&&window.ADS)?ADS.get(c):null;
  const c=pega(RF_CAM_LOGOS[k]);
  if(c&&c.ficheiro_url) return { chave:RF_CAM_LOGOS[k], c };
  if(k===0){ const alt=pega(RF_CAM_LOGO1_ALT); if(alt&&alt.ficheiro_url) return { chave:RF_CAM_LOGO1_ALT, c:alt }; }
  return { chave:RF_CAM_LOGOS[k], c:null };
}
/* o botão do lugar em destaque — devolve '' quando aquele patrocinador não pediu botão */
function rfCamCtaHTML(k){
  const { chave, c } = rfCamLogo(k);
  const txt=(c&&c.cta_texto||'').trim();
  if(!c || !txt || !c.link_destino) return '';
  const cor=rfCamCtaCores(c);
  return `<button type="button" class="rf-cam-cta" id="rf-cam-cta" data-ad-cta="${escC(chave)}"
    style="background:${escC(cor.bg)};color:${escC(cor.fg)}"
    onclick="ADS.clique('${escC(chave)}')">${escC(txt)}</button>`;
}
/* lugar desligado no painel nao entra na banda; com os cinco desligados a banda
   inteira sai, e o pe' do Camarote fecha sem faixa nenhuma em vez de mostrar uma
   moldura vazia com um rotulo dentro */
function rfCamLugarLigado(k){
  if(!(window.ADS && ADS.ligado)) return true;
  return ADS.ligado(RF_CAM_LOGOS[k]) || (k===0 && ADS.ligado(RF_CAM_LOGO1_ALT));
}
/* os lugares que de facto estao na banda, na ordem em que aparecem */
function rfCamLugares(){ return RF_CAM_LOGOS.map((_,k)=>k).filter(rfCamLugarLigado); }
function rfCamPatroHTML(){
  const lugares=rfCamLugares();
  if(!lugares.length) return '';
  /* o destaque inicial é o do primeiro lugar ligado; camUpdate assume a partir daí */
  const pecas=lugares.map((k,i)=>{
    const { chave, c } = rfCamLogo(k);
    if(c) return `<img class="rf-cam-ad${i===0?' on':''}" src="${escC(c.ficheiro_url)}" alt="Patrocinador"
      data-ad-chave="${escC(chave)}" data-ad-id="${escC(c.id)}"
      ${c.link_destino?`style="cursor:pointer" onclick="ADS.clique('${escC(chave)}')"`:''}>`;
    return `<span class="rf-cam-ad rf-cam-ad-vazio" data-ad-vazio="${escC(chave)}">240×80</span>`;
  }).join('');
  const temAlgum=lugares.some(k=>!!rfCamLogo(k).c);
  return `<div class="rf-cam-patro">
    <span class="rf-cam-patro-l">${temAlgum?'CAMAROTE APRESENTADO POR':'PATROCINADORES DO CAMAROTE'}</span>
    <div class="rf-cam-patro-marcas">${pecas}</div>
    ${rfCamCtaHTML(lugares[0])}
  </div>`;
}
