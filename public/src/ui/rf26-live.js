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
  const ic={gol:'⚽',cartao:'🟨',vermelho:'🟥',lesao:'✚',sub:'🔄'}[f.kind]||'⚽';
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
  return `<span class="rf-lv-placar ${ativo?'ao-vivo':''}">
    <span class="rf-lv-g">${gh}</span><span class="rf-lv-d">:</span><span class="rf-lv-g">${ga}</span>
  </span>`;
}

/* ---- uma linha de jogo ---- */
function rfLvLinhaHTML(m,i){
  const hc=anyClubOf(m.h)||{short:'—'}, ac=anyClubOf(m.a)||{short:'—'};
  const meu=(m.h===CL.clubId||m.a===CL.clubId);
  const inc=m.incidents||[];
  const fh=inc.filter(x=>x.side==='h'||x.club===m.h).map(rfLvIncToFato);
  const fa=inc.filter(x=>x.side==='a'||x.club===m.a).map(rfLvIncToFato);
  return `<div class="rf-lv-linha ${meu?'meu':''}" onclick="liveRowClick(${i})">
    <span class="rf-lv-pub">${rfLvTicketHTML()}${grp(m.att||0)}</span>
    <span class="rf-lv-lado casa">
      ${rfLvFatosHTML(fh,'esq')}
      <span class="rf-lv-n">${escC(hc.short)}</span>
      <span class="rf-lv-crest">${rfCrest(hc,30)}</span>
    </span>
    <span id="cl-lm-${i}">${rfLvPlacarHTML(m.hg||m.gh||0,m.ag||m.ga||0,true)}</span>
    <span class="rf-lv-lado fora">
      <span class="rf-lv-crest">${rfCrest(ac,30)}</span>
      <span class="rf-lv-n">${escC(ac.short)}</span>
      ${rfLvFatosHTML(fa,'dir')}
    </span>
    <span class="rf-lv-min" id="cl-lg-${i}">${m.min!=null?m.min+"'":''}</span>
  </div>`;
}
function rfLvIncToFato(x){
  return {kind:x.kind||x.type||'gol', nome:x.player||x.name||x.n||'', min:x.min};
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
    ${camOk?`<button type="button" class="rf-lv-cam" onclick="camToggle&&camToggle()">🎥 Modo Camarote</button>`:''}
  </div>`;
}

/* ---- a tela inteira ---- */
function rfLiveHTML(RL){
  if(!RL) return '';
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
    ${rfTopAd()}
    <div class="rf-lv-env">
      ${rfRail('left')}
      <div class="rf-lv-mid">
        ${rfLvFaixaHTML(RL)}
        ${cards}
      </div>
      ${rfRail('right')}
    </div>
  </div>`;
}

/* =====================================================================
   MODO CAMAROTE — portado de telas/Modo Camarote.html
   Sobreposição em tela cheia: banner, trilhos de anúncio, e um shell com
   a faixa do Camarote, o placar de estádio, a barra de pressão e um corpo
   de duas colunas (narração 1fr · estatísticas 320px).
   ===================================================================== */
function rfCamHTML(RL){
  const m=(RL.matches||[]).find(x=>x.user)||(RL.matches||[])[0];
  if(!m) return '';
  const hc=anyClubOf(m.h)||{short:'—'}, ac=anyClubOf(m.a)||{short:'—'};
  const min=RL.minute||RL.min||0;
  const periodo=min>45?'2º tempo':'1º tempo';
  const pressao=(typeof camPressure==='function')?camPressure(m):50;
  return `<div class="rf-cam">
    <div class="rf-cam-env">
      ${rfRail('left')}
      <div class="rf-cam-mid">
        ${rfTopAd()}
        <div class="rf-cam-shell">
          <div class="rf-cam-faixa">
            <div class="rf-band-filete"></div>
            <span class="rf-cam-ic">🎥</span>
            <span class="rf-cam-t">Camarote</span>
            <span class="rf-lv-aovivo">● Ao vivo</span>
            <span class="rf-cam-nota">os outros jogos seguem rolando ao fundo</span>
            <div class="rf-sp"></div>
            <button type="button" class="rf-cam-x" onclick="camToggle&&camToggle()">✖ Voltar</button>
          </div>

          <div class="rf-cam-board">
            <div class="rf-cam-lado">
              <span class="rf-cam-onde">Em casa</span>
              <span class="rf-cam-time">${escC(hc.short)}</span>
              <span class="rf-cam-sub">onze ${xiPlayers(CL.clubId).length}/11</span>
            </div>
            <span class="rf-cam-crest">${rfCrest(hc,44)}</span>
            <div class="rf-cam-placar">
              <span class="rf-cam-g">${m.hg||0}</span>
              <span class="rf-cam-d">:</span>
              <span class="rf-cam-g">${m.ag||0}</span>
            </div>
            <span class="rf-cam-crest">${rfCrest(ac,44)}</span>
            <div class="rf-cam-lado fim">
              <span class="rf-cam-onde">Visitante</span>
              <span class="rf-cam-time">${escC(ac.short)}</span>
              <span class="rf-cam-sub">${escC(CL.formation||'')}</span>
            </div>
            <div class="rf-cam-relogio"><span class="rf-cam-min">${min}'</span>
              <span class="rf-cam-per">${escC(periodo)}</span></div>
          </div>

          <div class="rf-cam-pressao">
            <span class="rf-label-t">Pressão</span>
            <span class="rf-cam-bar">
              <i class="casa" style="width:${pressao}%"></i>
              <i class="fora" style="width:${100-pressao}%"></i>
              <b class="rf-cam-meio"></b>
            </span>
            <span class="rf-cam-tag">${pressao>=55?escC(hc.short)+' pressiona':pressao<=45?escC(ac.short)+' pressiona':'jogo equilibrado'}</span>
          </div>

          <div class="rf-cam-abas">
            <button type="button" class="rf-tabp on">Panorama do Jogo</button>
            <button type="button" class="rf-tabp">Comentários</button>
            <button type="button" class="rf-tabp">Estatísticas</button>
            <div class="rf-sp"></div>
            <button type="button" class="rf-cam-pausar" onclick="camPause&&camPause()">⏸ Pausar</button>
          </div>

          <div class="rf-cam-body">
            <div class="rf-card">
              <div class="rf-label"><span class="rf-label-t">Narração ao vivo</span>
                <span class="rf-label-r">Casa do ${escC(hc.short)} · ${grp(m.att||0)} pagantes</span></div>
              <div class="rf-cam-narra">${rfCamNarraHTML(m)}</div>
            </div>
            <div class="rf-cam-dir">
              <div class="rf-card">
                <div class="rf-label"><span class="rf-label-t">Estatísticas</span>
                  <span class="rf-label-r">${escC(hc.short)} · ${escC(ac.short)}</span></div>
                ${rfCamStatsHTML(m)}
              </div>
              <div class="rf-card">
                <span class="rf-label-t">Ficha</span>
                <div class="rf-linha"><span class="rf-linha-t">Árbitro</span>
                  <span class="rf-linha-v">${escC(m.ref||'—')}</span></div>
                <div class="rf-linha"><span class="rf-linha-t">Público</span>
                  <span class="rf-linha-v">${grp(m.att||0)}</span></div>
                <div class="rf-linha"><span class="rf-linha-t">Sua tática</span>
                  <span class="rf-linha-v">${escC(CL.formation||'—')}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${rfRail('right')}
    </div>
  </div>`;
}
function rfCamNarraHTML(m){
  const narr=(m.narr||[]).slice().reverse().slice(0,14);
  if(!narr.length) return '<span class="rf-note">O árbitro já vai apitar…</span>';
  return narr.map(l=>`<div class="rf-cam-linha k-${escC(l.kind||'')}">
    <span class="rf-cam-lmin">${l.min}'</span>
    <span class="rf-cam-lic">${l.icon||''}</span>
    <span class="rf-cam-ltx">${escC(l.text||'')}</span>
  </div>`).join('');
}
function rfCamStatsHTML(m){
  const st=m.stats||{};
  const par=(l,a,b,pct)=>`<div class="rf-cam-st">
    <span class="rf-cam-sa">${a}</span><span class="rf-cam-sl">${escC(l)}</span><span class="rf-cam-sb">${b}</span>
    <span class="rf-cam-sbar"><i style="width:${pct}%"></i></span></div>`;
  const pb=st.possH!=null?st.possH:50;
  return par('Posse de bola',pb+'%',(100-pb)+'%',pb)
    + par('Finalizações',st.shotsH||0,st.shotsA||0, rfPct(st.shotsH,st.shotsA))
    + par('No alvo',st.onH||0,st.onA||0, rfPct(st.onH,st.onA))
    + par('Defesas',st.savesH||0,st.savesA||0, rfPct(st.savesH,st.savesA))
    + par('Cartões',st.cardsH||0,st.cardsA||0, rfPct(st.cardsH,st.cardsA));
}
function rfPct(a,b){ a=a||0;b=b||0; return (a+b)?Math.round(100*a/(a+b)):50; }
