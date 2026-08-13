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
