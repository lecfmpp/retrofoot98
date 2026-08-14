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
    <span class="rf-lv-lado casa">
      ${rfLvFatosHTML(fh,'esq')}
      <span class="rf-lv-n ${gh>ga?'frente':''}">${escC(hc.short)}</span>
      <span class="rf-lv-crest">${rfCrest(hc,30)}</span>
    </span>
    <span id="cl-lm-${i}">${rfLvPlacarHTML(gh,ga,true)}</span>
    <span class="rf-lv-lado fora">
      <span class="rf-lv-crest">${rfCrest(ac,30)}</span>
      <span class="rf-lv-n ${ga>gh?'frente':''}">${escC(ac.short)}</span>
      ${rfLvFatosHTML(fa,'dir')}
    </span>
    <span class="rf-lv-min" id="cl-lg-${i}">${m.min!=null?m.min+"'":''}</span>
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

/* ---- faixa de estado no topo ---- */
function rfLvFaixaHTML(RL){
  const meu=(RL.matches||[]).find(m=>m.user);
  const min=RL.minute||RL.min||0;
  const periodo=min>45?'2º tempo':'1º tempo';
  const pct=(typeof liveClockPct==='function')?liveClockPct(RL):Math.min(100,Math.round(100*min/90));
  const camOk=meu && (typeof camSpeedOk!=='function' || camSpeedOk());
  return `<div class="rf-lv-faixa">
    <div class="rf-band-filete"></div>
    <div class="rf-lv-faixa-id">
      <span class="rf-lv-faixa-t">Rodada ao vivo</span>
      <span class="rf-lv-faixa-s">${escC(classifDivName(S.division))} · ${RL.jornada||((S.round||0)+1)}ª rodada · ${escC(String(S.season||''))}</span>
    </div>
    <span class="rf-lv-aovivo">● Ao vivo</span>
    <div class="rf-sp"></div>
    <div class="rf-lv-stat">
      <span class="rf-lv-sl">Jogos em andamento</span>
      <span class="rf-lv-sv">${(RL.matches||[]).length}</span>
    </div>
    <div class="rf-lv-relogio" style="--pct:${pct}"><span>${min}'</span></div>
    <div class="rf-lv-stat end">
      <span class="rf-lv-sl">${escC(periodo)}</span>
      <span class="rf-lv-sh">${meu?('seu jogo: '+(meu.gh||0)+' × '+(meu.ga||0)):'sem jogo seu'}</span>
    </div>
    ${camOk?`<button type="button" class="rf-lv-cam" onclick="camToggle()">🎥 Modo Camarote</button>`:''}
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
  const ordem=(typeof divOrderUserFirst==='function')?divOrderUserFirst():Object.keys(porDiv);
  const cards=ordem.filter(d=>porDiv[d]&&porDiv[d].length).map(d=>`
    <div class="rf-lv-card">
      <div class="rf-lv-chd">
        <span class="rf-label-t">${escC(classifDivName(d))}</span>
        <span class="rf-label-r">${porDiv[d].length} jogo${porDiv[d].length>1?'s':''}</span>
      </div>
      <div class="rf-lv-head">
        <span>Público</span><span>Casa</span><span>Placar</span><span>Visitante</span><span>Min</span>
      </div>
      ${porDiv[d].map(x=>rfLvLinhaHTML(x.m,x.i)).join('')}
    </div>`).join('');
  return `<div class="rf-lv">
    <div class="rf-lv-env">
      ${rfRail('left')}
      <div class="rf-lv-mid">
        ${rfTopAd()}
        ${rfLvFaixaHTML(RL)}
        ${cards}
      </div>
      ${rfRail('right')}
    </div>
    ${camAberto?rfCamHTML(RL):''}
  </div>`;
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
  return `<div class="rf-cam" onclick="camBackdrop(event)">
    <div class="rf-cam-env">
      ${rfRail('left')}
      <div class="rf-cam-mid">
        ${rfTopAd()}
        <div class="rf-cam-shell">
          <div class="rf-cam-faixa">
            <div class="rf-band-filete"></div>
            <span class="rf-cam-ic">🎥</span>
            <span class="rf-cam-t">Camarote</span>
            <span class="rf-cam-aovivo" id="rf-cam-onair" ${camMatchOver(m)?'hidden':''}><i>●</i> AO VIVO</span>
            <div class="rf-sp"></div>
            <span class="rf-cam-nota">os outros jogos seguem rolando ao fundo</span>
            <button type="button" class="rf-cam-x" onclick="camToggle()" title="Voltar à rodada (Esc)">✖ Voltar à rodada</button>
          </div>
          <div id="rf-cam-dyn" data-tab="${escC(CL.camTab||'panorama')}">${camDynHTML(m)}</div>
          ${rfCamPatroHTML()}
          <div class="rf-cam-rodape">
            <span>Esc ou ✖ para voltar à rodada</span>
            <span>O Camarote mostra só o seu jogo — a rodada inteira continua ao fundo</span>
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
  const eleSub=`${RL.jornada||((S.round||0)+1)}ª rodada`;
  const pct=(typeof liveClockPct==='function')?liveClockPct(RL):0;
  return `<div class="rf-cam-board"${foto?` style="background-image:url('${escC(foto)}')"`:''}>
    <span class="rf-cam-veu"></span>
    <div class="rf-cam-lado">
      <span class="rf-cam-onde">EM CASA</span>
      <span class="rf-cam-time">${escC(hc.short||hc.name||'—')}</span>
      <span class="rf-cam-sub">${euEmCasa?meuSub:eleSub}</span>
    </div>
    <span class="rf-cam-crest">${rfCrest(hc,52)}</span>
    <div class="rf-cam-placar">
      <span class="rf-cam-matriz"></span>
      <span class="rf-cam-g" id="rf-cam-hg">${m.hg}</span>
      <span class="rf-cam-d">:</span>
      <span class="rf-cam-g" id="rf-cam-ag">${m.ag}</span>
    </div>
    <span class="rf-cam-crest">${rfCrest(ac,52)}</span>
    <div class="rf-cam-lado fim">
      <span class="rf-cam-onde">VISITANTE</span>
      <span class="rf-cam-time">${escC(ac.short||ac.name||'—')}</span>
      <span class="rf-cam-sub">${euEmCasa?eleSub:meuSub}</span>
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
  let possLbl='Domínio em campo', ph, pa;
  if(live && ((live.H.poss+live.A.poss)>0)){ possLbl='Posse de bola';
    const t=live.H.poss+live.A.poss; ph=Math.round(100*live.H.poss/t); pa=100-ph; }
  else { const t=(m.domH+m.domA)||1; ph=Math.round(100*m.domH/t); pa=100-ph; }
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

/* BANDA DE PATROCÍNIO — mesmo inventário AD_SPONSORS da pausa e da faixa de copa.
   A marca em destaque gira com o relógio (camAdIdx) e camUpdate acompanha. */
function rfCamPatroHTML(){
  if(typeof AD_SPONSORS==='undefined' || !AD_SPONSORS.length) return '';
  const i=camAdIdx(), s=AD_SPONSORS[i];
  return `<div class="rf-cam-patro">
    <span class="rf-cam-patro-l">CAMAROTE APRESENTADO POR</span>
    <div class="rf-cam-patro-marcas">${AD_SPONSORS.map((x,k)=>
      `<img class="rf-cam-ad ${k===i?'on':''}" src="${escC(x.src)}" alt="${escC(x.nome)}">`).join('')}</div>
    <button type="button" class="rf-cam-cta" id="rf-cam-cta" style="${camCtaStyle(i)}" onclick="camAdClick()">${escC(s.cta)}</button>
  </div>`;
}
