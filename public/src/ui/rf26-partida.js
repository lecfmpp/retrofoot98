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
function rfOverlay(o){
  o=o||{};
  return `<div class="rf-ov ${o.cls||''}">
    <div class="rf-ov-faixas" aria-hidden="true"></div>
    <div class="rf-ov-win" style="${o.w?`width:${o.w}px`:''}" onclick="event.stopPropagation()">
      <div class="rf-ov-hd">
        <div class="rf-band-filete"></div>
        <div class="rf-ov-ttl">
          <span class="rf-ov-eyebrow">${escC(o.contexto||'')}</span>
          <span class="rf-ov-t">${escC(o.titulo||'')}</span>
        </div>
        <div class="rf-sp"></div>
        ${o.hdDir||''}
      </div>
      <div class="rf-ov-body">${o.corpo||''}</div>
      ${o.acoes?`<div class="rf-ov-foot">${o.acoes}</div>`:''}
    </div>
  </div>`;
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
  return `<div class="rf-stg">
    <div class="rf-stg-in" style="${o.w?`width:${o.w}px`:''}">
      <div class="rf-stg-hd">
        <div class="rf-band-filete"></div>
        ${o.semEscudo?'':`<span class="rf-stg-crest">${rfCrest(o.crest||cl,38)}</span>`}
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
  return `<div class="rf-pl ${opts.sel?'sel':''} ${opts.off?'off':''}"
      ${opts.on?`onclick="${opts.on}"`:''}>
    <span class="rf-pl-num">${escC(String(nums[p.pid]||''))}</span>
    <span class="rf-pl-id">
      <span class="rf-pl-n">${escC(p.n)}</span>
      ${opts.sub?`<span class="rf-pl-s">${opts.sub}</span>`:''}
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
          sub:(p.energy!=null&&p.energy<45)?'cansado':''})).join('')}
      </div>
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">No banco</span>
          <span class="rf-label-r">toque para entrar</span></div>
        <div class="rf-pl-head"><span></span><span></span><span>POS</span><span>ENERGIA</span><span>FOR</span></div>
        ${banco.length?banco.map(p=>rfPlLinhaHTML(p,{sel:CL.subIn===p.pid, on:`rfSubPick('in','${escC(p.pid)}')`})).join('')
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
    <span class="rf-note">Toque primeiro num titular para substituir. Máximo de ${max} substituições por jogo.</span>`;

  return rfOverlay({
    w:900, contexto:rfCtxPartida(m), titulo:'Substituição',
    hdDir:rfSubsPillsHTML(usadas,max), corpo,
    acoes:`<button type="button" class="rf-ov-b2" onclick="rfSubFechar()">↩ Voltar ao jogo</button>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" ${pronto?'':'disabled'} onclick="rfSubConfirmar()">Confirmar substituição</button>`
  });
}
const RF_SETOR_NOME={GK:'gol',DEF:'defesa',MID:'meio',ATT:'ataque'};
function rfSetorNome(s){ return RF_SETOR_NOME[s]||'time'; }
function rfSubPick(lado,pid){
  if(lado==='out') CL.subOut=(CL.subOut===pid)?null:pid;
  else CL.subIn=(CL.subIn===pid)?null:pid;
  cdraw();
}
function rfSubFechar(){ CL.subOut=null; CL.subIn=null; CL.subOpen=false; cdraw(); }
function rfSubConfirmar(){
  if(!CL.subOut||!CL.subIn) return;
  // a troca em si continua sendo a do jogo (mesmo invariante de posição e
  // de contagem); aqui só entregamos os dois escolhidos
  if(typeof doSubstitution==='function') doSubstitution(CL.subOut, CL.subIn);
  else { S.xi=(S.xi||[]).map(x=>x===CL.subOut?CL.subIn:x); CL.subsUsed=(CL.subsUsed||0)+1; }
  CL.subOut=null; CL.subIn=null; CL.subOpen=false; cdraw();
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
const RF_SETOR_LONGO={GK:'Goleiro',DEF:'Defesa',MID:'Meio',ATT:'Ataque'};
function rfSetorLongo(s){ return RF_SETOR_LONGO[s]||'Meio'; }
/* a penalidade de jogar fora de posição, dita por extenso — é o que a
   referência mostra ("meio · fora de posição −4") */
function rfForaDePosicao(p, ferido){
  if(p.s===ferido.s) return rfSetorLongo(p.s).toLowerCase()+' · pronto';
  const dist=Math.abs(posRank(p.s)-posRank(ferido.s));
  return rfSetorLongo(p.s).toLowerCase()+' · fora de posição −'+(dist*4);
}
function rfInjPick(pid){ CL.injSel=pid; cdraw(); }
function rfInjConfirmar(){ if(typeof injuryConfirm==='function') injuryConfirm(); else cdraw(); }
function rfInjSeguir(){ if(typeof injurySkip==='function') injurySkip(); else cdraw(); }

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
function rfRedAplicar(){
  const f=CL.redForm||'3-3-3';
  if(typeof clSelFormation==='function' && FORMATIONS[f]) clSelFormation(f);
  if(typeof redCardConfirm==='function') redCardConfirm(); else cdraw();
}
function rfRedManter(){ if(typeof redCardConfirm==='function') redCardConfirm(); else cdraw(); }

/* =====================================================================
   4 · PÓS-RODADA · CLASSIFICAÇÃO — substitui scClassif()
   Grade 1.15fr / 1fr: tabela à esquerda, resultados e "o que mudou para
   você" à direita. As faixas de zona ficam, com legenda no pé do card —
   e vêm das mesmas constantes que decidem a virada de temporada.
   ===================================================================== */
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
  const res=(S.results||[]).filter(r=>r.round===rod).slice(0,8);
  const resultados=res.length?res.map(r=>{
    const h=anyClubOf(r.h)||{short:'—'}, a=anyClubOf(r.a)||{short:'—'};
    const meu=(r.h===CL.clubId||r.a===CL.clubId);
    return `<div class="rf-pr-jogo ${meu?'meu':''}">
      <span class="rf-pr-pub">${rfLvTicketHTML()}${grp(r.att||0)}</span>
      <span class="rf-pr-lado dir"><span class="rf-pr-jn">${escC(h.short)}</span>${rfCrest(h,18)}</span>
      <span class="rf-pr-placar">${r.gh}–${r.ga}</span>
      <span class="rf-pr-lado">${rfCrest(a,18)}<span class="rf-pr-jn">${escC(a.short)}</span></span>
    </div>`;
  }).join(''):'<span class="rf-note">Os resultados aparecem quando a rodada fechar.</span>';

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

  return rfStage({
    w:1080,
    contexto:`${(S.round||0)}ª jornada encerrada · ${classifDivName(S.division)} ${S.season||''}`,
    titulo:'Como ficou a tabela',
    corpo:`<div class="rf-pr-cols">
      <div class="rf-card"><div class="rf-label">
        <span class="rf-label-t">${escC(classifDivName(S.division))}</span>
        <span class="rf-label-r">${minha?minha+'º de '+total:''}</span></div>${tabela}</div>
      <div class="rf-pr-dir">
        <div class="rf-card"><div class="rf-label">
          <span class="rf-label-t">Resultados da rodada</span>
          <span class="rf-label-r">${res.length} jogo${res.length===1?'':'s'}</span></div>${resultados}</div>
        <div class="rf-card"><span class="rf-label-t">O que mudou para você</span>${mudou}</div>
      </div>
    </div>`,
    acoes:`<button type="button" class="rf-ov-b2" onclick="rfPrTodas()">🏆 Ver todas as divisões</button>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="rfPrContinuar()">Continuar</button>`
  });
}
function rfPrTodas(){ if(typeof clClassifTodas==='function') clClassifTodas(); else toastC('Todas as divisões — em breve.','info'); }
function rfPrContinuar(){ CL.screen='main'; cdraw(); }
/* a zona de playoff é a faixa entre acesso e permanência; nas divisões que
   não têm playoff ela simplesmente não aparece */
function rfZonaTabelaPR(pos,total){ return rfZonaTabela(pos,total); }

/* =====================================================================
   5 · LOBBY DA SALA — substitui renderOnline()
   Grade 1.25fr / 1fr: código + treinadores + como a sala roda à esquerda,
   chat à direita.
   ===================================================================== */
function rfLobbyHTML(){
  const room=(typeof NET!=='undefined'&&NET.room)||{};
  const parts=room.participants||[];
  const cap=room.capacity||room.max||4;
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
        <span class="rf-lb-cd">${escC(c?divisionLabel():'')}</span>
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
              <span class="rf-lb-rv">${escC(divisionLabel())}</span></div>
            <div class="rf-lb-r"><span class="rf-ov-res-t">Janela</span>
              <span class="rf-lb-rv">a cada 10 rodadas</span></div>
          </div>
        </div>
      </div>
      <div class="rf-card">${chat}</div>
    </div>`,
    acoes:`<span class="rf-note">À espera dos treinadores ${prontos}/${parts.length}</span>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-b2" onclick="clSairDaSala&&clSairDaSala()">Sair da sala</button>
      <button type="button" class="rf-ov-cta" onclick="clComecarTemporada&&clComecarTemporada()">⚽ Começar a temporada</button>`
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
    <span class="rf-gol-txt">${escC(opts.txt||'Escolha o canto')}</span>
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
    w:800, contexto:rfCtxPartida(m), titulo:'A bola no ponto',
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
  const gol=!!CL.penScored;
  return rfOverlay({
    w:800, cls:gol?'':'rf-ov-grave', contexto:rfCtxPartida(m),
    titulo:gol?'Gol!':'Perdeu!',
    hdDir:`<span class="rf-ov-bola" aria-hidden="true">${gol?'⚽':'🧤'}</span>`,
    corpo:`${extra||''}
      ${rfGolHTML(CL.penCanto,{txt:gol?'no fundo da rede':'o goleiro pegou'})}
      <div class="rf-pen-res ${gol?'gol':'perdeu'}">
        <span class="rf-pen-res-t">${gol?'⚽ Gol de '+escC(CL.penSel||''):'🧤 '+escC(CL.penSel||'')+' parou no goleiro'}</span>
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
    const v=lista[i];
    return `<span class="rf-so-b ${v===true?'ok':v===false?'no':''}">${v===true?'●':v===false?'✖':''}</span>`;
  }).join('')}</div>`;
}
function rfDisputaHTML(RL){
  RL=RL||CL.live||{};
  const pens=RL.pens||{h:[],a:[]};
  const m=RL.penMatch||(RL.matches&&RL.matches[0])||{};
  const hc=anyClubOf(m.h)||{short:'—'}, ac=anyClubOf(m.a)||{short:'—'};
  const gh=pens.h.filter(Boolean).length, ga=pens.a.filter(Boolean).length;
  const eu=(m.h===CL.clubId);
  const takers=(typeof penaltyTakerPool==='function')?penaltyTakerPool(m,CL.clubId):[];
  const bate=takers.find(p=>p.n===CL.penSel)||takers[0];
  const nCob=Math.max(pens.h.length,pens.a.length)+1;
  const linha=(c,gols,lista,meu)=>`<div class="rf-so-time ${meu?'meu':''}">
    <span class="rf-so-crest">${rfCrest(c,22)}</span>
    <span class="rf-so-n">${escC(c.short)}</span>
    <div class="rf-sp"></div>
    <span class="rf-so-g">${gols}</span>
    ${rfShootoutBolasHTML(lista)}
  </div>`;
  return rfOverlay({
    w:760,
    contexto:`${escC(m.comp||'Mata-mata')} · ${(m.hg||0)} × ${(m.ag||0)} no tempo normal`,
    titulo:'Disputa de pênaltis',
    hdDir:`<span class="rf-so-cob">${nCob}ª cobrança</span>`,
    corpo:`
      <div class="rf-card">
        ${linha(hc,gh,pens.h,eu)}
        ${linha(ac,ga,pens.a,!eu)}
      </div>
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
        <span class="rf-label-t">Como está a série</span>
        <div class="rf-so-info">
          <div class="rf-so-i"><span class="rf-ov-res-t">Situação</span>
            <span class="rf-so-iv">${escC(rfSoVantagem(gh,ga,hc,ac))}</span>
            <span class="rf-pr-ms">${escC(rfSoSubtexto(gh,ga))}</span></div>
          <div class="rf-so-i"><span class="rf-ov-res-t">Defendidos</span>
            <span class="rf-so-iv">${pens.h.filter(v=>v===false).length} × ${pens.a.filter(v=>v===false).length}</span>
            <span class="rf-pr-ms">quem parou mais</span></div>
          <div class="rf-so-i"><span class="rf-ov-res-t">Reserva</span>
            <span class="rf-so-iv">${escC(takers[1]?takers[1].n.split(' ')[0]:'—')}</span>
            <span class="rf-pr-ms">fora da série</span></div>
        </div>
      </div>`,
    acoes:`<button type="button" class="rf-ov-b2" onclick="rfSoSimular()">⏩ Simular o resto</button>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="resolveShootoutKick(CL.penSel)">Bater</button>`
  });
}
function rfSoVantagem(gh,ga,hc,ac){
  if(gh>ga) return 'Vantagem '+hc.short;
  if(ga>gh) return 'Vantagem '+ac.short;
  return 'Empatado';
}
function rfSoSubtexto(gh,ga){ return gh===ga?'quem errar primeiro decide':'converta e acaba'; }
function rfSoSituacao(gh,ga,eu){
  const meu=eu?gh:ga, dele=eu?ga:gh;
  if(meu>dele) return 'Se converter, fica muito perto';
  if(meu<dele) return 'Precisa converter para seguir vivo';
  return 'Cobrança para manter a série';
}
function rfSoSimular(){ if(typeof shootoutSkip==='function') shootoutSkip(); else { CL.penFast=true; cdraw(); } }

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
    titulo:'Vamos para a prorrogação',
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
