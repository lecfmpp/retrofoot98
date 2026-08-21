/* =====================================================================
   RetroFoot98 — LEVA 4: MODO RESENHA
   Portado de telas/Resenha - Pausa Patrocinada · A Espera da Rodada ·
   Passe o Aparelho · Classificacao do Assento · Entrega do Aparelho.

   O CTA DO PATROCINADOR É SÓ TEXTO. O logo entra nos ladrilhos brancos
   do trilho; sobre o fundo da marca ele some (o logo da Betano é vermelho
   escuro e o fundo dela é #cc0000). Quem quiser mudar isso, olhe o
   camCtaStyle() antes.
   ===================================================================== */

/* ---------------------------------------------------------------------
   ENVELOPE DO APARELHO — fundo verde radial com listras, cartão branco de
   640px centrado. É o envelope das duas telas de troca de mãos, onde a
   tela inteira é a mensagem e não há nada do jogo por baixo.
   ------------------------------------------------------------------- */
function rfGate(o){
  o=o||{};
  return `<div class="rf-gate">
    <div class="rf-gate-listras"></div>
    <div class="rf-gate-card" style="${o.w?`width:${o.w}px`:''}">
      <div class="rf-gate-hd">
        <div class="rf-band-filete"></div>
        <div class="rf-ov-ttl">
          <span class="rf-ov-eyebrow">${escC(o.contexto||'')}</span>
          <span class="rf-stg-t">${escC(o.titulo||'')}</span>
        </div>
        <div class="rf-sp"></div>
      </div>
      <div class="rf-gate-body">${o.corpo||''}</div>
      ${o.acoes?`<div class="rf-stg-foot">${o.acoes}</div>`:''}
    </div>
  </div>`;
}

/* ---------------------------------------------------------------------
   OS ASSENTOS DA SALA, com estado de verdade.
   Online: NET._claimed é a tabela de assentos (clube, nome, último
   resultado publicado, último heartbeat). Hotseat: CL.humans, e quem já
   jogou sai da fila (CL._hotseat.queue) pra playedSeats.
   Sem sala nenhuma, devolve lista vazia — a tela some em vez de inventar
   treinadores que não existem.
   ------------------------------------------------------------------- */
function rfSalaAssentos(){
  const out=[];
  if(CL.online && typeof NET!=='undefined' && NET._claimed){
    const agora=Date.now();
    /* ===== O CHIP LE O CARIMBO DO SERVIDOR, NAO O MEU PALPITE =====
       "Jogou" era `last_result_round===S.round` -- comparado com o S.round LOCAL, que durante a
       pausa esta um numero diferente em cada cliente (quem ja adotou a rodada nova ve todo mundo
       "sem jogar"; quem ainda nao adotou ve o contrario). Cada humano via um conjunto de chips
       diferente na MESMA sala -- o relatado a 19/08.
       O fato que e igual para todos e o carimbo do dia no assento (game_seats.day_ack, texto
       "idx:momento", limpo pelo servidor quando o momento vira): quem ja carimbou o momento
       atual cumpriu a sua parte, quem nao carimbou e por quem a sala espera. E a MESMA conta do
       day_status que o proprio servidor usa para virar o dia. Sala sem ponteiro (save antigo)
       fica na regra velha. */
    const d=NET.room && NET.room.day;
    const chave=d ? (d.idx+':'+d.moment) : null;
    for(const uid in NET._claimed){
      const c=NET._claimed[uid]; if(!c || !c.clubId) continue;
      const cl=anyClubOf(c.clubId)||{short:String(c.clubId)};
      out.push({ clubId:c.clubId, clube:cl, nome:c.name||'(sem nome)',
        jogou: chave ? (c.day_ack===chave)
                     : !!(c.last_result && c.last_result_round===S.round),
        presente: !!(c.last_seen && (agora-new Date(c.last_seen).getTime())<45000),
        eu: c.clubId===CL.clubId });
    }
    return out;
  }
  const H=CL._hotseat;
  const naFila=new Set(((H&&H.queue)||[]).map(q=>q.seat&&q.seat.clubId));
  const atual=(CL._seatContext&&CL._seatContext.seat&&CL._seatContext.seat.clubId)||null;
  for(const id in (CL.humans||{})){
    const cl=anyClubOf(id)||{short:String(id)};
    out.push({ clubId:id, clube:cl, nome:CL.humans[id],
      jogou: H ? (!naFila.has(id) && id!==atual) : true,
      presente:true, eu:String(id)===String(CL.clubId) });
  }
  return out;
}

/* trilho de patrocinadores: ladrilhos brancos com o logo, duplicados pra
   a animação emendar sem salto. Mesmo inventário AD_SPONSORS do Camarote. */
/* ===== A BARRA DE PATROCINIO TAMBEM E VENDAVEL =====
   O trilho de logos e o botao da marca vinham de AD_SPONSORS, a lista fixa dentro do jogo:
   ninguem conseguia comprar este lugar. Com criativo publicado em rf98.pausa.barra, a barra
   passa a ser DAQUELA marca -- um logo, o botao com o link dela -- que e o que uma compra de
   patrocinio deve parecer. Sem criativo, as marcas de casa continuam a girar como antes. */
function rfPatroCompradoHTML(rotulo, direita){
  if(typeof ADS==='undefined' || !window.ADS) return '';
  const c=ADS.get('rf98.pausa.barra');
  if(!c || !c.ficheiro_url) return '';
  return `<div class="rf-card rf-spon" data-ad-chave="rf98.pausa.barra" data-ad-id="${escC(c.id)}">
    <div class="rf-label"><span class="rf-label-t">${escC(rotulo)}</span>
      <span class="rf-label-r">${escC(direita)}</span></div>
    <div class="rf-spon-unico"><img src="${escC(c.ficheiro_url)}" alt="Patrocinador"></div>
    ${c.link_destino?`<button type="button" class="rf-spon-cta rf-spon-cta-marca"
      onclick="ADS.clique('rf98.pausa.barra')">
      <span class="rf-spon-ctat">Conhecer o patrocinador</span><span class="rf-spon-seta">→</span>
    </button>`:''}
  </div>`;
}
function rfSponsorHTML(){
  const comprado=rfPatroCompradoHTML('Patrocínio oficial','Quem banca a resenha');
  if(comprado) return comprado;
  if(typeof AD_SPONSORS==='undefined') return '';
  const tiles=()=>AD_SPONSORS.map(s=>
    `<span class="rf-spon-tile"><img src="${escC(s.src)}" alt="${escC(s.nome)}"></span>`).join('');
  const i=Math.abs((S.round||0))%AD_SPONSORS.length;
  const s=AD_SPONSORS[i];
  return `<div class="rf-card rf-spon">
    <div class="rf-label"><span class="rf-label-t">Patrocínio oficial</span>
      <span class="rf-label-r">Quem banca a resenha</span></div>
    <div class="rf-spon-trilho"><div class="rf-spon-run">${tiles()}${tiles()}</div></div>
    <button type="button" class="rf-spon-cta" style="background:${s.bg};color:${s.fg}"
      onclick="adSlotClick('resenha-pausa',${i})">
      <span class="rf-spon-ctat">${escC(s.cta)}</span><span class="rf-spon-seta">→</span>
    </button>
  </div>`;
}

/* =====================================================================
   0 · SALA EM ESPERA — o diálogo curto de "quem falta"
   Portado de telas/Modal - Sala em Espera (+ Mobile).

   ESTA TELA JÁ EXISTIA E JÁ ESTAVA LIGADA — só que na pele antiga
   (`cl-esp-*`, dentro de showResenhaWaiting). É o padrão que se repete
   neste porte: a rota está certa, o destino é que ficou velho. Aqui só
   se troca o destino; quem chama, quando chama e o que os botões fazem
   continua exatamente igual.

   O que o pacote acrescenta ao que havia: a barra "JÁ JOGARAM · 2 de 4",
   que dá a dimensão da espera. Sem ela, "faltam 2" não diz se a sala tem
   três pessoas ou dez.
   ===================================================================== */
function rfSalaEsperaHTML(st){
  const nomes=(st.nomes_faltando||[]).filter(Boolean);
  const n=nomes.length||st.faltam||0;
  const ehLiga=(st.competicao==='liga');
  const comp = ehLiga ? 'Brasileirão'
    : ((typeof COMP_DEFS!=='undefined' && COMP_DEFS[st.competicao] && COMP_DEFS[st.competicao].short) || 'Copa');
  const oQue = ESPERA_MOMENTO[st.momento] || st.momento || '';
  const manchete = n===1 ? 'Falta 1 treinador' : 'Faltam '+n+' treinadores';
  const inicial = t => (String(t||'?').trim()[0]||'?').toUpperCase();

  /* O TOTAL VEM DA SALA, não da conta de quem falta: `faltam` sozinho não
     diz de quantos. Se a lista de assentos ainda não carregou, a barra
     simplesmente não aparece — melhor do que uma barra a mentir. */
  const total=(typeof rfSalaAssentos==='function')?rfSalaAssentos().length:0;
  const jogaram=Math.max(0,total-n);
  const pct=total?Math.round(jogaram/total*100):0;

  const lista=(nomes.length?nomes:Array.from({length:n},()=>'Treinador')).map(nome=>`
    <div class="rf-esp-quem">
      <span class="rf-esp-av">${escC(inicial(nome))}</span>
      <span class="rf-esp-id"><span class="rf-esp-nome">${escC(nome)}</span></span>
      <span class="rf-esp-st">${escC(oQue)}${oQue?'…':''}</span>
    </div>`).join('');

  return `<div class="rf-esp">
    <div class="rf-esp-top">
      <span class="rf-label-t">Sala em espera</span>
      <span class="rf-esp-manchete">${escC(manchete)}</span>
      <span class="rf-esp-ctx">Rodada ${escC(String((st.jornada!=null?st.jornada:0)+1))} · ${escC(comp)}</span>
    </div>
    <div class="rf-esp-lista">${lista}</div>
    ${total?`<div class="rf-esp-prog">
      <div class="rf-esp-prog-l">
        <span class="rf-esp-prog-t">JÁ JOGARAM</span>
        <span class="rf-esp-prog-n">${jogaram} de ${total}</span>
      </div>
      <div class="rf-esp-barra"><i style="width:${pct}%"></i></div>
    </div>`:''}
    <span class="rf-note">A rodada não começa sem eles — e ninguém é pulado enquanto você espera.
      Todos continuam exatamente no mesmo ponto do jogo.</span>
  </div>`;
}

/* =====================================================================
   1 · PAUSA PATROCINADA — a rodada está a fechar no servidor
   ===================================================================== */
/* ===== OS PASSOS SAO LIDOS DE NOVO A CADA SEGUNDO =====
   Estavam escritos direto no corpo da tela, logo ficavam congelados no estado do primeiro
   segundo -- "a processar" para sempre, mesmo com o servidor ja tendo fechado a rodada. Agora
   sao uma funcao propria, e o tique da pausa (ensureSyncFunTicker, em main.js) reescreve o
   bloco #rf-passos a cada segundo. Mesma fonte de verdade do checklist antigo. */
function rfPausaPassosHTML(){
  const sincronizou=!!CL._roundSyncedAt;
  let outros=true;
  if(CL.online && typeof NET!=='undefined' && NET.allHumanResultsIn && typeof S!=='undefined' && S){
    try{ outros=!!NET.allHumanResultsIn(S.round); }catch(e){ outros=true; }
  }
  const passo=(est,txt,rot)=>`<div class="rf-pz-lin">
    <span class="rf-pz-i ${est}">${est==='ok'?'✓':est==='agora'?'⏳':'·'}</span>
    <span class="rf-pz-t">${escC(txt)}</span>
    <div class="rf-sp"></div>
    <span class="rf-pz-e">${escC(rot)}</span></div>`;
  return passo('ok','A sua partida','feito')
    /* fechada a rodada no servidor, os resultados dos outros ENTRARAM por definicao -- sem este
       `sincronizou||` a linha ficava em "a processar" com as duas de baixo ja em "feito" */
    + passo((sincronizou||outros)?'ok':'agora','Rodada dos outros treinadores',(sincronizou||outros)?'feito':'a processar')
    + passo(sincronizou?'ok':(outros?'agora':''),'Fechamento da rodada no servidor',sincronizou?'feito':(outros?'a processar':'na fila'))
    + passo(sincronizou?'ok':'','Tabela, finanças e propostas',sincronizou?'feito':'na fila');
}
/* ===== A TV DA PAUSA =====
   Ela ja existia -- e o quadro de sala + televisao + GIF dos anos 90 que segurava a espera na
   pele antiga --, mas a tela portada nao a desenhava. Sem ela a pausa era um cartao branco
   parado, e (pior) o tique que atualiza a barra de progresso morria a procura do #rf-gif.
   Os ids sao CONTRATO com ensureSyncFunTicker: rf-gif, rf-gifbg, rf-gifcap, rf-gifnum, rf-joke. */
function rfPausaTvHTML(){
  if(typeof PAUSA_GIFS==='undefined' || !PAUSA_GIFS.length) return '';
  const g=pausaGif(), n=(CL._pausaI||0)%PAUSA_GIFS.length;
  return `<div class="rf-card rf-pz-tvcard">
    <div class="rf-label"><span class="rf-label-t">Enquanto a rodada fecha</span>
      <span class="rf-label-r">resenha dos anos 90</span></div>
    <div class="rf-pz-tvbox">
      <div class="rf-gifbox">
        <span class="rf-room"></span><span class="rf-roomtint"></span>
        <div class="rf-tv">
          <div class="rf-tvscreen">
            <img class="rf-gifbg" id="rf-gifbg" src="${g.src}" alt="" aria-hidden="true">
            <img class="rf-gif" id="rf-gif" src="${g.src}" alt="">
            <span class="rf-tvglass"></span>
          </div>
          <img class="rf-tvimg" src="img/sync/tv.webp" alt="">
        </div>
      </div>
      <div class="rf-gifcap">
        <span class="rf-gifnum" id="rf-gifnum">${n+1}/${PAUSA_GIFS.length}</span>
        <span id="rf-gifcap">${escC(g.cap)}</span>
      </div>
    </div>
    <p class="rf-pz-joke" id="rf-joke">${escC((typeof pausaJoke==='function')?pausaJoke():'')}</p>
  </div>`;
}
function rfPausaHTML(){
  const pct=(typeof pausaPct==='function')?pausaPct():0;
  const assentos=rfSalaAssentos();
  const jogaram=assentos.filter(a=>a.jogou).length;

  return rfStage({
    w:1020,
    contexto:'Modo Resenha · a sincronizar a rodada',
    titulo:'Pausa patrocinada',
    corpo:`<div class="rf-card">
      <div class="rf-pz-barra">
        <div class="rf-label"><span class="rf-label-t">A preparar a próxima rodada</span>
          <span class="rf-pz-pct" id="rf-pct">${(typeof pausaOvertime==='function'&&pausaOvertime())?'⏳':pct+'%'}</span></div>
        <div class="rf-pz-trilho"><div class="rf-pz-fill" id="rf-fill" style="width:${pct}%"></div></div>
      </div>
    </div>
    ${rfSponsorHTML()}
    <div class="rf-pz-cols">
      <div class="rf-pz-esq">
      ${rfPausaTvHTML()}
      <!-- O ESPACO 16:9 DO PATROCINADOR SAIU DA PAUSA (pedido do dono, 20/08). Ele ocupava a
           coluna inteira por baixo da TV e a pausa passou a ser mais anuncio do que espera. A
           chave 'rf98.pausa.video' continua a existir no painel; se um dia voltar, e este bloco
           que se repoe -- ver rfAdEspaco. -->
      </div>
      <div class="rf-pz-dir">
        <div class="rf-card">
          <span class="rf-label-t">O que está acontecendo</span>
          <div id="rf-passos">${rfPausaPassosHTML()}</div>
        </div>
        ${assentos.length?`<div class="rf-card">
          <div class="rf-label"><span class="rf-label-t">Treinadores na sala</span>
            <span class="rf-label-r">${jogaram}/${assentos.length}</span></div>
          <div class="rf-pz-gente">${assentos.map(a=>`<span class="rf-pz-p ${a.jogou?'ok':''}">
            <i class="rf-pz-dot"></i>${escC(a.nome)}</span>`).join('')}</div>
          <span class="rf-note">${jogaram>=assentos.length
            ? 'Todos já jogaram. Assim que a tabela fechar, a próxima rodada abre.'
            : 'A rodada abre quando todos publicarem o resultado.'}</span>
        </div>`:''}
      </div>
    </div>`,
    acoes:`<span class="rf-im-auto" id="rf-proglabel">${escC((typeof pausaWaitLabel==='function')?pausaWaitLabel():'')}</span>
      <div class="rf-sp"></div>
      <button type="button" id="cl-wait-escape" class="rf-ov-b2" onclick="clResenhaSync()"
        style="display:${(typeof pausaStuck==='function'&&pausaStuck())?'':'none'}"><span>🔄</span> Sincronizar a Resenha</button>
      <button type="button" id="cl-ad-skip" class="rf-ov-cta" onclick="clAdSkip()"
        style="display:${CL._adCont?'':'none'}"><span>⏩</span> Pular anúncio</button>`
  });
}

/* =====================================================================
   2 · À ESPERA DA RODADA — eu já joguei, faltam os outros
   ===================================================================== */
function rfEsperaHTML(){
  const assentos=rfSalaAssentos();
  const jogaram=assentos.filter(a=>a.jogou).length;
  const pct=assentos.length?Math.round(jogaram/assentos.length*100):0;
  /* O MEU RESULTADO: o último jogo desta rodada em que o meu clube entrou.
     Vem de S.results — placar e marcadores de verdade, não um resumo à parte. */
  const meu=(S.results||[]).slice().reverse()
    .find(r=>(r.h===CL.clubId||r.a===CL.clubId) && r.round===S.round);
  const emCasa=meu&&meu.h===CL.clubId;
  const advId=meu?(emCasa?meu.a:meu.h):null;
  const adv=advId?(anyClubOf(advId)||{short:'—'}):null;
  const eu=clubOf(CL.clubId)||{short:'—'};
  const gols=meu?(meu.scorers||[]).filter(s=>s.id===CL.clubId||s.team===CL.clubId).map(s=>s.name||s):[];
  const golsTxt=gols.length?rfContaGols(gols):'—';

  return rfStage({
    w:1020,
    contexto:`Modo Resenha · ${(S.round||0)+1}ª rodada`,
    titulo:'À espera dos treinadores',
    corpo:`<div class="rf-card">
      <div class="rf-pz-barra">
        <div class="rf-label"><span class="rf-label-t">Já jogaram</span>
          <span class="rf-pz-pct">${jogaram}/${assentos.length||'—'}</span></div>
        <div class="rf-pz-trilho"><div class="rf-pz-fill" style="width:${pct}%"></div></div>
      </div>
    </div>
    <div class="rf-pz-cols">
      <div class="rf-card">
        <span class="rf-label-t">Treinadores da sala</span>
        ${assentos.length?assentos.map(a=>`<div class="rf-es-lin ${a.eu?'me':''}">
          <span class="rf-ft-crest">${rfCrest(a.clube,26)}</span>
          <span class="rf-es-id"><span class="rf-es-n">${escC(a.nome)}${a.eu?' (você)':''}</span>
            <span class="rf-es-c">${escC(a.clube.short||'')}</span></span>
          <div class="rf-sp"></div>
          <span class="rf-es-st ${a.jogou?'ok':''}">${a.jogou?'✓ jogou'
            :(a.presente?'⏳ em partida':'⏳ ainda não entrou')}</span>
        </div>`).join(''):'<span class="rf-note">Nenhum outro treinador nesta sala.</span>'}
      </div>
      <div class="rf-pz-dir">
        <div class="rf-card">
          <div class="rf-label"><span class="rf-label-t">O seu resultado</span>
            <span class="rf-label-r">${(S.round||0)+1}ª rodada</span></div>
          ${meu?`<div class="rf-es-placar">
            <span class="rf-es-lado"><span class="rf-es-sig">${escC(eu.short)}</span>${rfCrest(eu,30)}</span>
            <span class="rf-es-sc">${emCasa?meu.hg:meu.ag} – ${emCasa?meu.ag:meu.hg}</span>
            <span class="rf-es-lado dir">${rfCrest(adv,30)}<span class="rf-es-sig">${escC(adv.short)}</span></span>
          </div>
          <div class="rf-ft-grid">
            <div class="rf-ft-b"><span class="rf-ov-res-t">Gols</span>
              <span class="rf-ft-bv sm">${escC(golsTxt)}</span></div>
            <div class="rf-ft-b"><span class="rf-ov-res-t">Público</span>
              <span class="rf-ft-bv">${CL.lastAtt?grp(CL.lastAtt):'—'}</span></div>
            <div class="rf-ft-b"><span class="rf-ov-res-t">Bilheteria</span>
              <span class="rf-ft-bv">${CL.lastGate?fmt(CL.lastGate):'—'}</span></div>
            <div class="rf-ft-b"><span class="rf-ov-res-t">Mando</span>
              <span class="rf-ft-bv sm">${emCasa?'em casa':'fora'}</span></div>
          </div>`:'<span class="rf-note">Você não teve jogo nesta rodada.</span>'}
        </div>
      </div>
    </div>`,
    acoes:`<span class="rf-im-auto">A rodada fecha quando todos jogarem.</span>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-b2" onclick="clResenhaSync()"><span>🔄</span> Sincronizar a Resenha</button>
      ${CL.online?`<button type="button" class="rf-ov-cta" onclick="rfChatToggle()"><span>${rfIcone('chat',16)}</span> Abrir o chat</button>`:''}`
  });
}
/* "Carlos Miguel (2), Jefté" — agrupa o mesmo marcador em vez de repetir o nome */
function rfContaGols(nomes){
  const c={}; nomes.forEach(n=>{ c[n]=(c[n]||0)+1; });
  return Object.keys(c).map(n=>c[n]>1?`${n} (${c[n]})`:n).join(', ');
}

/* =====================================================================
   3 · PASSE O APARELHO — antes do assento assumir (substitui scHandoff)
   ===================================================================== */
function rfPasseHTML(item){
  item=item||CL._handoff; if(!item) return '';
  const seat=item.seat, fx=item.fx;
  const c=anyClubOf(seat.clubId)||{short:'—'};
  const assentos=rfSalaAssentos();
  const total=assentos.length||((CL._hotseat&&CL._hotseat.queue.length)||0)+1;
  const idx=assentos.findIndex(a=>String(a.clubId)===String(seat.clubId));
  const div=(typeof seatDivLabel==='function')?seatDivLabel(seat,fx):divisionLabel();
  return rfGate({
    w:640,
    contexto:'Modo Resenha · mesmo aparelho',
    titulo:`Passe para ${escC(seat.name)}`,
    corpo:`<div class="rf-card rf-pa-alvo">
      ${rfCrest(c,72)}
      <span class="rf-pa-n">${escC(seat.name)}</span>
      <span class="rf-pa-c">${escC(c.short||'')} · ${escC(div)}</span>
      ${idx>=0?`<span class="rf-pa-selo">Assento ${idx+1} de ${total}</span>`:''}
      <span class="rf-pa-aviso">Entregue o aparelho e não olhe a tela.
        As decisões do ${escC(c.short||'clube')} são só ${escC(rfDeleDela(seat.name))}.</span>
    </div>
    ${assentos.length?`<div class="rf-card">
      <span class="rf-label-t">Quem já jogou nesta rodada</span>
      <div class="rf-pz-gente">${assentos.map(a=>`<span class="rf-pz-p ${a.jogou?'ok':''}">
        <i class="rf-pz-i2">${a.jogou?'✓':'⏳'}</i>${escC(a.nome)}</span>`).join('')}</div>
    </div>`:''}`,
    acoes:`<div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="clPlayHotseatMatch()">Estou com o aparelho</button>`
  });
}
/* sem saber o pronome de quem senta no assento, "dele/dela" seria um chute:
   fica no neutro, que serve pra qualquer treinador da sala */
function rfDeleDela(){ return 'dessa pessoa'; }

/* =====================================================================
   4 · ENTREGA DO APARELHO — a vez do assento acabou
   ===================================================================== */
function rfEntregaHTML(){
  const e=CL._entrega; if(!e) return '';
  const dono=(CL.humans&&CL._hotseat&&CL._hotseat._prev)
    ? (CL.humans[CL._hotseat._prev.clubId]||'quem organiza a sala') : (CL.mgr||'quem organiza a sala');
  return rfGate({
    w:640,
    contexto:'Modo Resenha · rodada concluída',
    titulo:'Acabou a sua vez',
    corpo:`<div class="rf-card rf-pa-alvo">
      <span class="rf-en-ico">🤝</span>
      <span class="rf-pa-n">Devolva o aparelho a ${escC(dono)}</span>
      <span class="rf-pa-aviso">A rodada de ${escC(e.nome)} está gravada.
        Quem organiza a sala continua daqui.</span>
    </div>
    <div class="rf-card">
      <span class="rf-label-t">O que aconteceu na sua vez</span>
      <div class="rf-ft-grid">
        <div class="rf-ft-b"><span class="rf-ov-res-t">Resultado</span>
          <span class="rf-ft-bv">${escC(e.placar)}</span></div>
        <div class="rf-ft-b"><span class="rf-ov-res-t">Adversário</span>
          <span class="rf-ft-bv sm">${escC(e.adv)}</span></div>
        <div class="rf-ft-b"><span class="rf-ov-res-t">Público</span>
          <span class="rf-ft-bv">${e.att?grp(e.att):'—'}</span></div>
        <div class="rf-ft-b"><span class="rf-ov-res-t">${e.pos?'Posição':'Mando'}</span>
          <span class="rf-ft-bv sm">${escC(e.pos||e.mando)}</span></div>
      </div>
    </div>
    <span class="rf-note rf-en-nota">Jogo gravado${CL.online?' na nuvem':''}.</span>`,
    acoes:`<div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="rfEntregaOk()">Entreguei o aparelho</button>`
  });
}
function rfEntregaOk(){ CL._entrega=null; startNextHotseatMatch(); }

/* =====================================================================
   5 · CLASSIFICAÇÃO DO ASSENTO — a rodada fechou, como está a resenha
   ===================================================================== */
function rfAssentoClassifHTML(seat){
  seat=seat||CL._classifSeat; if(!seat) return '';
  const assentos=rfSalaAssentos();
  /* a classificação dos TREINADORES é a tabela da divisão filtrada pelos
     clubes com dono — mais as máquinas logo abaixo, como na referência */
  const tbl=(typeof sortedTable==='function')?sortedTable():[];
  const donoDe=id=>{ const a=assentos.find(x=>String(x.clubId)===String(id)); return a?a.nome:null; };
  const linhas=tbl.map((t,i)=>({ ...t, pos:i+1, dono:donoDe(t.id) }));
  const humanos=linhas.filter(l=>l.dono);
  const maquinas=linhas.filter(l=>!l.dono).slice(0,2);
  const lista=humanos.concat(maquinas);

  const prox=rfProximaJornada(assentos);
  return rfStage({
    w:1020,
    contexto:`Modo Resenha · ${Math.max(1,S.round||0)}ª rodada fechada`,
    titulo:'Como está a resenha',
    corpo:`<div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">Classificação dos treinadores</span>
        <span class="rf-label-r">${humanos.length} ${humanos.length===1?'humano':'humanos'}</span></div>
      <div class="rf-ac-head"><span></span><span></span><span>CLUBE</span><span>TREINADOR</span><span>P</span></div>
      ${lista.map(l=>{
        const c=anyClubOf(l.id)||{short:String(l.id)};
        const eu=String(l.id)===String(seat.clubId);
        return `<div class="rf-ac-lin ${eu?'me':''}">
          <span class="rf-ac-pos"><i class="rf-ac-dot ${l.dono?'h':''}"></i>${l.pos}</span>
          <span class="rf-ft-crest">${rfCrest(c,24)}</span>
          <span class="rf-ac-c">${escC(c.short||'')}</span>
          <span class="rf-ac-t ${l.dono?'':'cpu'}">${escC(l.dono||'máquina')}</span>
          <span class="rf-ac-p">${l.Pts}</span>
        </div>`;}).join('')}
    </div>
    <div class="rf-pz-cols">
      <div class="rf-card">
        <span class="rf-label-t">A resenha da rodada</span>
        ${(rfResenhaDaRodada(assentos)||[]).map(x=>`<div class="rf-ac-nota">
          <span class="rf-ac-nn">${escC(x.n)}</span>
          <span class="rf-ac-nt">${escC(x.t)}</span></div>`).join('')
          ||'<span class="rf-note">A rodada ainda não rendeu história.</span>'}
      </div>
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">Próxima rodada</span>
          <span class="rf-label-r">${(S.round||0)+1}ª</span></div>
        ${prox.length?prox.map(p=>`<div class="rf-ac-prox">
          <span class="rf-ac-px">${escC(p.t)}</span>
          ${p.tag?`<span class="rf-ac-ptag">${escC(p.tag)}</span>`:''}
        </div>`).join(''):'<span class="rf-note">O calendário da próxima rodada ainda não saiu.</span>'}
      </div>
    </div>`,
    acoes:`<div class="rf-sp"></div>
      ${CL.online?`<button type="button" class="rf-ov-b2" onclick="rfChatToggle()"><span>${rfIcone('chat',16)}</span> Chat da sala</button>`:''}
      <button type="button" class="rf-ov-cta" onclick="clClassifContinue()">Continuar</button>`
  });
}
/* o que cada humano fez nesta rodada, lido do placar de verdade */
function rfResenhaDaRodada(assentos){
  const rod=(S.results||[]).filter(r=>r.round===S.round);
  const out=[];
  assentos.forEach(a=>{
    const r=rod.find(x=>String(x.h)===String(a.clubId)||String(x.a)===String(a.clubId));
    if(!r) return;
    const casa=String(r.h)===String(a.clubId);
    const gp=casa?r.hg:r.ag, gc=casa?r.ag:r.hg;
    const outroId=casa?r.a:r.h; const outro=(anyClubOf(outroId)||{short:'—'}).short;
    const onde=casa?'em casa':'fora';
    out.push({ n:a.nome, t: gp>gc?`venceu o ${outro} por ${gp}–${gc} ${onde}`
      : gp<gc?`perdeu pro ${outro} por ${gc}–${gp} ${onde}`
      : `empatou ${gp}–${gc} com o ${outro} ${onde}` });
  });
  return out;
}
/* confrontos da rodada que vem, com os jogos entre humanos marcados */
function rfProximaJornada(assentos){
  const prox=(S.sched&&S.sched[(S.round||0)])||[];
  const donos=new Set(assentos.map(a=>String(a.clubId)));
  return prox.slice(0,6).map(([h,a])=>{
    const ch=anyClubOf(h)||{short:String(h)}, ca=anyClubOf(a)||{short:String(a)};
    const classico=donos.has(String(h))&&donos.has(String(a));
    return { t:`${ch.short} × ${ca.short}`, tag:classico?'clássico da sala':'' };
  });
}
