/* =====================================================================
   RetroFoot98 — LEVA 4: entre rodadas e competições
   Portado de telas/Fim de Temporada · Competicao - Visao Geral ·
   Copa - Classificacao da Fase · Imprensa · Adversario - Ver Time.

   TROFÉU É ARTE REAL. Nunca o escudo do clube, nunca emoji. As imagens
   vivem em public/img/trofeus/ e chegam por trophyImg()/TROPHIES — 104 a
   112px nas telas de competição e fim de temporada, ~64px no card de
   resumo. Onde a arte daquele troféu não existir, o espaço fica vazio em
   vez de receber um substituto errado.
   ===================================================================== */

/* troféu grande, com o tamanho que a tela pede */
function rfTrofeuHTML(key, size){
  size=size||104;
  const img=(typeof trophyImg==='function')?trophyImg(key,size):'';
  return `<span class="rf-trofeu-arte" style="--s:${size}px">${img}</span>`;
}

/* =====================================================================
   1 · FIM DE TEMPORADA
   Placeholder de vídeo 16:9 com as SEIS situações como pílulas — cada uma
   aponta pra um vídeo diferente, e o selo mostra o desfecho corrente.
   ===================================================================== */
const RF_DESFECHOS=[
  {k:'titulo',   l:'Título',         selo:'Campeão'},
  {k:'acesso',   l:'Acesso',         selo:'Acesso garantido'},
  {k:'playoff',  l:'Playoff',        selo:'Playoff do acesso'},
  {k:'meio',     l:'Meio de tabela', selo:'Objetivo parcial'},
  {k:'rebaixado',l:'Rebaixado',      selo:'Rebaixamento'},
  {k:'demitido', l:'Demitido',       selo:'Fim de ciclo'},
];
/* o desfecho sai da posição final e das faixas da divisão — a mesma conta
   que decide a virada de temporada, pra a tela não prometer um acesso que
   o motor não vai cumprir */
function rfDesfecho(sum){
  if(CL.unemployed) return 'demitido';
  const pos=sum?sum.myPos:rfMinhaPosicao();
  const total=sum?(sum.myTable||[]).length:Object.keys(S.table||{}).length;
  if(!pos) return 'meio';
  const promo=(typeof DIVISION_PROMO!=='undefined'&&DIVISION_PROMO[S.division])||0;
  const releg=(typeof DIVISION_RELEG!=='undefined'&&DIVISION_RELEG[S.division])||0;
  if(pos===1) return 'titulo';
  if(promo&&pos<=promo) return 'acesso';
  if(promo&&pos<=promo*2) return 'playoff';
  if(releg&&pos>total-releg) return 'rebaixado';
  return 'meio';
}
function rfFimTemporadaHTML(sum){
  const cl=clubOf(CL.clubId)||{short:'—'};
  const d=rfDesfecho(sum);
  const info=RF_DESFECHOS.find(x=>x.k===d)||RF_DESFECHOS[3];
  const linhas = sum ? (sum.myTable||[]) : ((typeof sortedTable==='function')?sortedTable():[]);
  const total=linhas.length;
  const pos = sum ? sum.myPos : rfMinhaPosicao();
  const artilheiro=Object.entries(S.scorers||{}).sort((a,b)=>b[1]-a[1])[0];
  const pz = sum || S._seasonPrizes || null;
  const premio = pz && pz.total ? pz.total : 0;
  const titulo={titulo:'O '+cl.short+' é campeão.',
    acesso:'O '+cl.short+' subiu de série.',
    playoff:'O '+cl.short+' vai disputar o playoff do acesso',
    meio:'O '+cl.short+' fecha no meio da tabela.',
    rebaixado:'O '+cl.short+' foi rebaixado.',
    demitido:'Fim de ciclo no '+cl.short+'.'}[d];

  return rfStage({
    w:1080, comp:S.division,
    contexto:`${classifDivName(S.division)} ${S.season||''} · temporada encerrada`,
    titulo:'Fim da temporada',
    corpo:`<div class="rf-ft-cols">
      <div class="rf-card rf-ft-esq">
        <div class="rf-ft-video">
          <span class="rf-ft-claquete">🎬</span>
          <span class="rf-ft-vt">Vídeo do fim de temporada</span>
          <span class="rf-ft-selo">${escC(info.selo)}</span>
          <span class="rf-ft-vs">1280×720 · até 12s · um vídeo por desfecho</span>
          ${rfTrofeuHTML('serie'+(S.division||'D'), 52)}
        </div>
        <div class="rf-ft-pills">${RF_DESFECHOS.map(x=>
          `<span class="rf-chip ${d===x.k?'on':''}">${escC(x.l)}</span>`).join('')}</div>
        <span class="rf-ft-h">${escC(titulo)}</span>
        <p class="rf-ft-p">${escC(rfFimTexto(d,pos,total))}</p>
        <span class="rf-ft-objetivo ${d==='rebaixado'||d==='demitido'?'ruim':''}">${
          d==='rebaixado'||d==='demitido'?'Objetivo não cumprido':'Objetivo cumprido'}</span>
      </div>
      <div class="rf-ft-dir">
        <div class="rf-card">
          <span class="rf-label-t">Como terminou o grupo</span>
          ${linhas.slice(0,6).map((t,i)=>{
            const c=anyClubOf(t.id)||{short:t.id}, eu=t.id===CL.clubId;
            const z=rfZonaTabela(i+1,total);
            return `<div class="rf-ft-lin ${eu?'me':''}">
              <span class="rf-ft-pos">${i+1}º</span>
              <span class="rf-ft-crest">${rfCrest(c,22)}</span>
              <span class="rf-ft-n">${escC(c.short)}</span>
              <div class="rf-sp"></div>
              ${z?`<span class="rf-ft-tag ${z}">${z==='promo'?'Acesso à '+divisionLabelOf(rfDivAcima()):z==='drop'?'Rebaixado':'Playoff'}</span>`:''}
            </div>`;
          }).join('')}
        </div>
        <div class="rf-card">
          <span class="rf-label-t">Premiação e balanço</span>
          <div class="rf-ft-grid">
            <div class="rf-ft-b"><span class="rf-ov-res-t">Prêmio da campanha</span>
              <span class="rf-ft-bv">${escC(fmt(premio))}</span>
              <span class="rf-pr-ms">depositado</span></div>
            <div class="rf-ft-b"><span class="rf-ov-res-t">Caixa após fechar</span>
              <span class="rf-ft-bv">${escC(fmt(S.budget||0))}</span>
              <span class="rf-pr-ms">no ano</span></div>
            <div class="rf-ft-b"><span class="rf-ov-res-t">Artilheiro</span>
              <span class="rf-ft-bv sm">${escC(artilheiro?artilheiro[0]:'—')}</span>
              <span class="rf-pr-ms">${artilheiro?artilheiro[1]+' gols':''}</span></div>
            <div class="rf-ft-b"><span class="rf-ov-res-t">Melhor nota</span>
              <span class="rf-ft-bv sm">${escC(rfMelhorNota())}</span>
              <span class="rf-pr-ms">do plantel</span></div>
          </div>
        </div>
        <div class="rf-card">
          <span class="rf-label-t">O que vem agora</span>
          ${rfFimProximos(d).map(x=>`<div class="rf-ft-prox">
            <span class="rf-ft-pi">${x.i}</span>
            <span class="rf-ft-pid"><span class="rf-ft-pt">${escC(x.t)}</span>
              <span class="rf-ft-ps">${escC(x.s)}</span></span>
          </div>`).join('')}
        </div>
      </div>
    </div>`,
    acoes:`<button type="button" class="rf-ov-b2" onclick="rfSetTabIr('campeonatos','calendario')">${rfIcone('calendario',16)} Ver o calendário</button>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="${sum?'clOnlineSeasonContinue()':'clAdvanceSeason()'}">Começar a próxima temporada</button>
      ${sum?'<span class="rf-im-auto">avança sozinho em <span id="cl-season-count">15</span>s</span>':''}`
  });
}
function rfDivAcima(){
  const i=(typeof DIV_ORDER!=='undefined')?DIV_ORDER.indexOf(S.division):-1;
  return (i>0)?DIV_ORDER[i-1]:S.division;
}
function rfMelhorNota(){
  const sq=squad(CL.clubId).filter(p=>typeof playerNota==='function'&&playerNota(p)!=null);
  if(!sq.length) return '—';
  return sq.sort((a,b)=>playerNota(b)-playerNota(a))[0].n;
}
function rfFimTexto(d,pos,total){
  const cl=(clubOf(CL.clubId)||{short:'o clube'}).short;
  return {
    titulo:`Campeão da ${classifDivName(S.division)}. A cidade não dormiu.`,
    acesso:`${pos}º lugar e vaga garantida. Ano que vem é ${divisionLabelOf(rfDivAcima())}.`,
    playoff:`${pos}º lugar e uma vaga no mata-mata. A diretoria pedia o playoff — está entregue.`,
    meio:`${pos}º de ${total}. Temporada sem sustos, e sem festa.`,
    rebaixado:`${pos}º de ${total}. O ${cl} cai de série e recomeça mais abaixo.`,
    demitido:`A diretoria decidiu mudar. O seu ciclo no ${cl} termina aqui.`
  }[d]||'';
}
function rfFimProximos(d){
  const out=[];
  if(d==='playoff') out.push({i:rfIcone('trofeu',16)+'',t:'Playoff do acesso',s:'Mata-mata pela vaga'});
  if(d==='acesso'||d==='titulo') out.push({i:rfIcone('seta-cima',16)+'',t:'Nova divisão',s:'Elenco vai precisar de reforço'});
  if(d==='rebaixado') out.push({i:rfIcone('seta-baixo',16)+'',t:'Divisão de baixo',s:'Reconstrução de elenco'});
  out.push({i:rfIcone('mercado',16)+'',t:'Janela de transferências',s:'Abre no começo da pré-temporada'});
  out.push({i:rfIcone('treinador',16)+'',t:'Renovação de contrato',s:'A diretoria quer conversar'});
  return out;
}
function rfSetTabIr(page,tab){ clCloseOverlay(); rfState().page=page; rfState().tab[page]=tab; CL.screen='main'; cdraw(); }

/* =====================================================================
   2 · COMPETIÇÃO — VISÃO GERAL (substitui scCupView)
   ===================================================================== */
/* Fiel a telas/Competicao - Visao Geral.html: 1080px, barra de abas com as
   competições do clube, coluna esquerda com o TROFÉU REAL a 112px + ficha de
   4 blocos, coluna direita com "o seu caminho" e "quem segue na copa". */
/* ===== A CHAVE DE UMA COPA TEM DUAS FORMAS =====
   Copa com fase de grupos (Libertadores, Sul-Americana) guarda `{group, bracket}`.
   Copa que e mata-mata do principio ao fim (Copa do Brasil) E o proprio objeto
   da chave -- tem `round`, `ties`, `history` e `champion` a nascenca, e nao tem
   `.bracket` nenhum. Todo o ecra da competicao lia so `c.bracket`: para a Copa
   do Brasil isso dava sempre null, e dai vinha a tela vazia (sem caminho, sem
   quem segue, sem chave). `cupBracketStageHTML` ja sabia distinguir as duas; o
   resto do ecra passa a saber tambem. */
function rfCompChave(c){
  if(!c) return null;
  if(c.champion!==undefined) return c;      // a copa E a chave (mata-mata puro)
  return c.bracket||null;                   // a chave vive dentro da copa
}
function rfCompAbas(key){
  const abas=[{k:'__div', l:divisionLabel()}];
  ((typeof allCupKeys==='function')?allCupKeys():[]).forEach(k=>{
    if(S.compToggle && S.compToggle[k]===false) return;
    if(!(S.cups&&S.cups[k])) return;
    abas.push({k, l:((typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{}).name||k});
  });
  return `<div class="rf-cp-abas">${abas.map(x=>
    `<button type="button" class="rf-chip ${x.k===key?'on':''}" onclick="rfCompVer('${x.k}')">${escC(x.l)}</button>`
  ).join('')}</div>`;
}
function rfCompVer(k){
  if(k==='__div'){ clCloseOverlay(); clClassif(); return; }
  CL._cupKey=k; CL.screen='cupview'; cdraw();
}
/* a coluna da fase tem 64px, como na referência (lá os rótulos são curtos:
   "1ª FASE", "2ª FASE"). cupPhaseLabel devolve "Oitavas de final", que não
   cabe — então aqui vale a forma curta, não um corte com reticências. */
function rfFaseCurta(f){
  return String(f||'')
    .replace(/ de final$/i,'')
    .replace(/^Semifinal$/i,'Semi')
    .replace(/^Fase de grupos.*$/i,'Grupos');
}
/* uma linha do "seu caminho": fase, adversário, placar, casa/fora */
function rfCpEtapa(fase, advId, placar, mando, estado){
  const a=advId?(anyClubOf(advId)||{short:advId}):null;
  return `<div class="rf-cp-et ${estado||''}">
    <span class="rf-cp-etf"><i class="rf-cp-dot"></i><span>${escC(rfFaseCurta(fase))}</span></span>
    <span class="rf-cp-eta">${escC(a?a.short:'a sortear')}</span>
    <span class="rf-cp-etp">${escC(placar||'—')}</span>
    <span class="rf-cp-etm">${escC(mando||'—')}</span>
  </div>`;
}
function rfCompeticaoHTML(key){
  key=key||CL._cupKey;
  const c=(S.cups&&S.cups[key])||{};
  const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[key])||{};
  const meu=CL.clubId;
  const br=rfCompChave(c);
  const gobj=(c.group&&c.group.groups)||null;
  const letras=gobj?Object.keys(gobj).sort():[];
  const meuGrupo=letras.find(L=>(gobj[L].teams||[]).includes(meu));
  const tab=gobj&&meuGrupo?gobj[meuGrupo]:null;
  const ordenado=tab?Object.values(tab.table||{}).sort((a,b)=>(b.Pts-a.Pts)||((b.GF-b.GA)-(a.GF-a.GA))):[];
  // com chave montada, a fase é a da chave — cupCompetitionRoundLabel só serve
  // enquanto a competição ainda está no formato de grupos
  /* ANTES DO SORTEIO A TELA MENTIA DUAS VEZES: dizia "Oitavas de final" no
     titulo do bloco (cupCompetitionRoundLabel devolve a fase teorica em que a
     competicao entra, mesmo sem chave montada) e "Fase de grupos em andamento"
     na linha de baixo -- numa copa que nem grupos tem. E as quatro fichas
     ficavam a tracejado sem dizer porque. Agora, enquanto o sorteio nao sair, a
     tela diz isso: "Sorteio pendente". */
  const sorteada = !!((br && ((br.ties||[]).length || (br.history||[]).length)) || gobj);
  const fase = br ? cupPhaseLabel(br.round, br.roundsTotal)
    : (gobj ? ((typeof cupCompetitionRoundLabel==='function'&&cupCompetitionRoundLabel(c,key))||'—')
            : 'Sorteio pendente');
  /* quem ja esta dentro da competicao, mesmo antes de haver chave: e a lista de
     qualificados que o motor guarda quando a temporada e montada. */
  const inscritos=(S.qualification&&Array.isArray(S.qualification[key]))?S.qualification[key]:[];
  // PREMIAÇÃO: a cota real da fase corrente, do mesmo PRIZES que credita o caixa —
  // nada de número decorativo que o motor não vai pagar
  const cota = (br && typeof PRIZES!=='undefined' && PRIZES.copaBrasilPhaseCash && key==='copaBrasil')
    ? PRIZES.copaBrasilPhaseCash(br.round, br.roundsTotal, true) : 0;

  /* O SEU CAMINHO: b.history guarda cada fase já resolvida ({round,ties,advanced}),
     e b.ties é a fase corrente. Percorrer as duas na ordem é o caminho de verdade —
     não dá pra inventar as fases anteriores a partir só da fase atual. */
  const caminho=[];
  if(br){
    (br.history||[]).forEach(h=>{
      (h.ties||[]).forEach(t=>{
        if(t.h!==meu && t.a!==meu) return;
        const emCasa=t.h===meu, adv=emCasa?t.a:t.h;
        const pl=(t.hg!=null&&t.ag!=null)?(emCasa?t.hg+'–'+t.ag:t.ag+'–'+t.hg):'—';
        caminho.push({f:cupPhaseLabel(h.round,br.roundsTotal), adv, pl,
          m:emCasa?'casa':'fora', e:t.winner?(t.winner===meu?'ok':'no'):''});
      });
    });
    (br.ties||[]).forEach(t=>{
      if(t.h!==meu && t.a!==meu) return;
      const emCasa=t.h===meu, adv=emCasa?t.a:t.h;
      const pl=(t.hg!=null&&t.ag!=null)?(emCasa?t.hg+'–'+t.ag:t.ag+'–'+t.hg):'—';
      caminho.push({f:cupPhaseLabel(br.round,br.roundsTotal), adv, pl, m:emCasa?'casa':'fora',
        e:t.winner?(t.winner===meu?'ok':'no'):'agora'});
    });
    if(!(br.ties||[]).some(t=>t.h===meu||t.a===meu) && (typeof cupCompetitionTeamAlive==='function') && cupCompetitionTeamAlive(c,meu))
      caminho.push({f:cupPhaseLabel(br.round,br.roundsTotal), adv:null, pl:'—', m:'—', e:''});
  }
  /* QUEM SEGUE: quem ainda está vivo na fase corrente + quem passou direto */
  const vivos=br?Array.from(new Set([].concat(
    (br.ties||[]).flatMap(t=>[t.h,t.a]), br.pendingByes||[]).filter(Boolean))):[];
  const campeao=(typeof cupCompetitionChampion==='function')?cupCompetitionChampion(c):null;
  const jogos=caminho.length;

  /* A CHAVE VOLTOU, no desenho novo (ver rfChaveVistaHTML): so quando o
     mata-mata esta a ser jogado. Antes disso a competicao mostra grupos ou o
     estado do sorteio, e uma moldura vazia com a taca ao centro prometeria uma
     fase que ainda nao comecou. */
  const chave=(br && ((br.ties||[]).length || (br.history||[]).length))
    ? `<div class="rf-card rf-cp-chave">
         <div class="rf-label"><span class="rf-label-t">${escC(String(def.name||key).toUpperCase())} · MATA-MATA ${escC(String(S.season||''))}</span>
           <span class="rf-label-r">${escC(fase)}</span></div>
         ${rfChaveVistaHTML(key)}
       </div>`
    : '';
  /* ===== (o palco antigo saiu daqui em 17/08/2026) =====
   Eu tinha trazido para esta tela a chave espelhada da pele antiga
   (cupBracketStageHTML): ela e desenhada num palco de tamanho fixo que um
   script redimensiona a cada quadro (cupFitStage), e dentro do cartao novo isso
   tomava a tela inteira e prendia a visualizacao -- nao dava para sair.

   Ela volta quando chegar o desenho novo, e volta como OPCAO DE VISTA desta
   tela (ao lado da classificacao da fase), nao como bloco fixo por cima dela.
   Ate la nao ha chave nenhuma aqui: `cupBracketStageHTML` continua a existir e
   a servir a tela antiga, sem nada dependente deste ecra. */

  return rfStage({
    w:1080, comp:key,
    contexto:`Minhas competições · ${S.season||''}`,
    titulo:def.name||key,
    corpo:`${rfCompAbas(key)}
    ${chave}
    <div class="rf-cp-cols">
      <div class="rf-card rf-cp-esq">
        ${rfTrofeuHTML(key,112)}
        <span class="rf-cp-nome">${escC(tab?('Grupo '+meuGrupo):fase)}</span>
        <span class="rf-cp-fase">${escC(
          br ? `${(vivos.length||0)} clubes seguem na disputa.`
          : gobj ? 'Fase de grupos em andamento.'
          : (inscritos.length
              ? `${inscritos.length} clubes inscritos — o sorteio ainda não saiu.`
              : (def.drawSub||def.sub||'O sorteio ainda não saiu.')))}</span>
        <div class="rf-cp-ficha">
          <div class="rf-ft-b"><span class="rf-ov-res-t">Campeão atual</span>
            <span class="rf-ft-bv sm">${escC(rfCampeaoAtual(key))}</span></div>
          <div class="rf-ft-b"><span class="rf-ov-res-t">Premiação</span>
            <span class="rf-ft-bv sm">${cota?escC(fmt(cota)):'—'}</span></div>
          <div class="rf-ft-b"><span class="rf-ov-res-t">Sua campanha</span>
            <span class="rf-ft-bv sm">${jogos?jogos+(jogos===1?' jogo':' jogos'):'—'}</span></div>
          <div class="rf-ft-b"><span class="rf-ov-res-t">Situação</span>
            <span class="rf-ft-bv sm">${campeao===meu?'Campeão'
              :((typeof cupCompetitionTeamAlive==='function'&&cupCompetitionTeamAlive(c,meu))?'Na disputa'
                :(!sorteada&&inscritos.indexOf(meu)>=0?'Inscrito':'Fora'))}</span></div>
        </div>
      </div>
      <div class="rf-cp-dir">
        <div class="rf-card">
          <div class="rf-label"><span class="rf-label-t">O seu caminho</span>
            <span class="rf-label-r">${escC(tab?('Grupo '+meuGrupo):(jogos?jogos+(jogos===1?' jogo':' jogos'):''))}</span></div>
          ${tab
            ? (ordenado.length?ordenado.map((t,i)=>{
                const cc=anyClubOf(t.id)||{short:t.id}, eu=t.id===meu;
                return `<div class="rf-cp-lin ${eu?'me':''}">
                  <span class="rf-cp-pos">${i+1}º</span>
                  <span class="rf-ft-crest">${rfCrest(cc,20)}</span>
                  <span class="rf-ft-n">${escC(cc.short)}</span>
                  <div class="rf-sp"></div>
                  <span class="rf-cp-j">${t.P||0}j</span>
                  <span class="rf-cp-p">${t.Pts||0}</span>
                </div>`;}).join(''):'<span class="rf-note">A fase começa depois do sorteio.</span>')
            : (caminho.length?caminho.map(x=>rfCpEtapa(x.f,x.adv,x.pl,x.m,x.e)).join('')
               :`<span class="rf-note">${sorteada?'O seu clube não entrou nesta fase.'
                 :(inscritos.indexOf(meu)>=0?'O seu clube está inscrito. Os confrontos saem no sorteio.'
                   :'O seu caminho aparece quando o sorteio sair.')}</span>`)}
        </div>
        <div class="rf-card">
          <div class="rf-label"><span class="rf-label-t">${escC(tab?'Como estão os grupos':'Quem segue na copa')}</span>
            <span class="rf-label-r">${tab?letras.length+' grupos':(vivos.length?vivos.length+' clubes':(inscritos.length?inscritos.length+' inscritos':''))}</span></div>
          <div class="rf-cp-segue">${
            tab
              ? (letras.slice(0,8).map(L=>{
                  const g=gobj[L]; const lider=(Object.values(g.table||{}).sort((a,b)=>b.Pts-a.Pts)[0])||null;
                  const c2=lider?(anyClubOf(lider.id)||{short:'—'}):null;
                  return `<div class="rf-cp-g"><span class="rf-cp-gl">${escC(L)}</span>
                    <span class="rf-ft-n">${escC(c2?c2.short:'—')}</span></div>`;}).join(''))
              : (vivos.length?vivos.slice(0,12).map(id=>{
                  const c2=anyClubOf(id)||{short:id};
                  return `<div class="rf-cp-g ${id===meu?'me':''}"><span class="rf-ft-crest">${rfCrest(c2,20)}</span>
                    <span class="rf-ft-n">${escC(c2.short)}</span></div>`;}).join('')
                 : (inscritos.length
                     ? inscritos.slice(0,12).map(id=>{
                         const c2=anyClubOf(id)||{short:id};
                         return `<div class="rf-cp-g ${id===meu?'me':''}"><span class="rf-ft-crest">${rfCrest(c2,20)}</span>
                           <span class="rf-ft-n">${escC(c2.short)}</span></div>`;}).join('')
                     : '<span class="rf-note">Ainda não há clubes classificados.</span>'))
          }</div>
        </div>
      </div>
    </div>`,
    acoes:`<button type="button" class="rf-ov-b2" onclick="rfSetTabIr('campeonatos','calendario')"><span>${rfIcone('calendario',16)}</span> Calendário</button>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="clCupViewBack()">Voltar ao hub</button>`
  });
}
function rfCampeaoAtual(key){
  const h=(S.history||[]).slice().reverse().find(x=>x.cups&&x.cups[key]);
  return (h&&h.cups[key])||'—';
}

/* =====================================================================
   FASE DE GRUPOS, NO DESENHO NOVO
   ---------------------------------------------------------------------
   Eu tinha reaproveitado a grade da pele antiga (cupGroupGridHTML). Ela foi
   desenhada para viver num palco de ALTURA DEFINIDA: la dentro o cartao do
   grupo reparte essa altura e cada linha da tabela tambem (`flex:1 1 0`).
   Dentro do cartao novo nao ha altura para repartir, e flex sobre contentor sem
   altura faz as linhas sobreporem-se -- escudo por cima de nome, nome por cima
   dos pontos, tudo cortado. Era o que se via.

   Esta versao usa so pecas do desenho novo: um cartao por grupo, a linha do
   confronto e a tabela em grade fixa. Nada aqui depende de altura herdada.
   ===================================================================== */
function rfCopaGruposHTML(c,key){
  const g=c&&c.group; if(!g||!g.groups) return '<div class="rf-empty">A fase de grupos ainda não começou.</div>';
  const meu=CL.clubId;
  const letras=Object.keys(g.groups).sort();
  const rodada=(g.round||0)+1, total=(g.rounds||6);
  const cartoes=letras.map(L=>{
    const grp=g.groups[L];
    const meuGrupo=(grp.teams||[]).indexOf(meu)>=0;
    const ordem=Object.values(grp.table||{})
      .sort((a,b)=>(b.Pts-a.Pts)||((b.GF-b.GA)-(a.GF-a.GA))||(b.GF-a.GF));
    const linhas=ordem.map((t,i)=>{
      const cl=anyClubOf(t.id)||{short:t.id};
      const passa=i<2;   // dois por grupo, como em toda a Conmebol
      return `<div class="rf-cg-lin ${t.id===meu?'meu':''} ${passa?'passa':''}">
        <span class="rf-cg-pos">${i+1}</span>
        <span class="rf-ft-crest">${rfCrest(cl,18)}</span>
        <span class="rf-cg-n">${escC(cl.short||t.id)}</span>
        <span class="rf-cg-x">${t.P||0}</span>
        <span class="rf-cg-x">${((t.GF||0)-(t.GA||0))>0?'+':''}${(t.GF||0)-(t.GA||0)}</span>
        <span class="rf-cg-p">${t.Pts||0}</span>
      </div>`;
    }).join('');
    return `<div class="rf-card rf-cg ${meuGrupo?'meu':''}">
      <div class="rf-label">
        <span class="rf-label-t">Grupo ${escC(L)}</span>
        <span class="rf-label-r">${rodada} de ${total}</span>
      </div>
      <div class="rf-cg-head"><span></span><span></span><span></span>
        <span>J</span><span>SG</span><span>P</span></div>
      ${linhas||'<span class="rf-note">O grupo aparece depois do sorteio.</span>'}
    </div>`;
  }).join('');
  return `<div class="rf-cg-grade">${cartoes}</div>`;
}
/* =====================================================================
   CHAVE DA COPA — pacote "chaves copas (campeonatos e pos-rodada)"
   ---------------------------------------------------------------------
   O DADO, PRIMEIRO. O motor nao guarda arvore: a cada fase ele re-sorteia os
   vencedores (advanceCupBracket ordena por forca e emparelha de novo). A
   arvore e reconstruida de tras para a frente, seguindo quem venceu -- e isso
   ja existia em cupTiesOfRound/cupSourceTie/cupBuildTree, que aqui sao usados
   so como FONTE DE DADOS. O desenho e outro: colunas em flex com
   `justify-content:space-around` e conectores feitos de borda, sem palco de
   tamanho fixo, sem transform:scale, sem SVG. Foi o palco escalado que tomou a
   tela e prendeu a visualizacao na primeira tentativa.
   ===================================================================== */
function rfChaveDados(key){
  const c=(S.cups&&S.cups[key])||null;
  const b=(typeof rfCompChave==='function')?rfCompChave(c):(c&&(c.champion!==undefined?c:c.bracket));
  if(!b || !b.roundsTotal) return null;
  const meu=CL.clubId;
  const info=(typeof rfCompInfo==='function')?rfCompInfo(key):{nome:key,trofeu:''};
  /* quem esta vivo do meu lado: o caminho do clube do utilizador pinta-se de
     dourado da primeira fase que ele jogou ate onde chegou */
  const fases=[];
  for(let r=1;r<=b.roundsTotal;r++){
    const ties=(typeof cupTiesOfRound==='function')?cupTiesOfRound(b,r):null;
    const rot=(typeof cupPhaseLabel==='function')?cupPhaseLabel(r,b.roundsTotal):('Fase '+r);
    fases.push({ round:r, key:'f'+r, label:String(rot||'').toUpperCase(),
      atual: !b.champion && b.round===r,
      encerrada: !!(ties && ties.length && ties.every(t=>t.winner!=null)),
      confrontos:(ties||[]).map((t,i)=>rfChaveConfronto(t,i,meu)) });
  }
  const campeao=b.champion?(anyClubOf(b.champion)||{short:String(b.champion)}):null;
  return { chave:key, competicao:info.nome, temporada:S.season||'', trofeu:info.trofeu,
    roundsTotal:b.roundsTotal, campeao, meuClube:(clubOf(meu)||{}).short||'',
    faseAtual:b.round, fases,
    premio:(typeof PRIZES!=='undefined'&&PRIZES.copaBrasilPhaseCash&&key==='copaBrasil')
      ? PRIZES.copaBrasilPhaseCash(b.roundsTotal,b.roundsTotal,true) : 0 };
}
/* um confronto no formato que a tela desenha */
function rfChaveConfronto(t,i,meu){
  const lado=(id)=>{
    const cl=id!=null?(anyClubOf(id)||{short:String(id)}):null;
    return { id, nome:cl?(cl.short||cl.name||String(id)):null,
      cor:(typeof clubTheme==='function'&&cl)?((clubTheme(id)||{}).col||'#5d6c62'):'#5d6c62',
      eu:id!=null&&id===meu };
  };
  const h=lado(t.h), a=lado(t.a);
  const jogado=(t.hg!=null&&t.ag!=null);
  return { n:i+1,
    estado: t.winner!=null?'decidido':(h.id!=null&&a.id!=null?'marcado':'indefinido'),
    meu: h.eu||a.eu,
    pen: t.pens?((t.pens.h!=null&&t.pens.a!=null)?(t.pens.h+'–'+t.pens.a):''):'',
    lados:[ {...h, placar:jogado?t.hg:null, venceu:t.winner!=null&&t.winner===t.h},
            {...a, placar:jogado?t.ag:null, venceu:t.winner!=null&&t.winner===t.a} ] };
}
/* ---- uma linha do cartao (cor do clube, nome, placar) ---- */
function rfChaveLinhaHTML(l){
  const perdeu=l.venceu===false && l.placar!=null;
  return `<span class="rf-ch-l ${l.venceu?'ok':''} ${perdeu?'out':''}">
    <i class="rf-ch-cor" style="background:${escC(l.cor||'#5d6c62')}"></i>
    <span class="rf-ch-n">${escC(l.nome||'a definir')}</span>
    <span class="rf-ch-p">${l.placar!=null?l.placar:'—'}</span>
  </span>`;
}
function rfChaveCartaoHTML(cf){
  if(!cf) return `<span class="rf-ch-c vazio"><span class="rf-ch-l"><i class="rf-ch-cor"></i>
    <span class="rf-ch-n">a definir</span><span class="rf-ch-p">—</span></span>
    <span class="rf-ch-l"><i class="rf-ch-cor"></i><span class="rf-ch-n">a definir</span>
    <span class="rf-ch-p">—</span></span></span>`;
  return `<span class="rf-ch-c ${cf.meu?'meu':''} ${cf.estado==='indefinido'?'vazio':''}">
    ${rfChaveLinhaHTML(cf.lados[0])}${rfChaveLinhaHTML(cf.lados[1])}
    ${cf.pen?`<span class="rf-ch-pen">${escC(cf.pen)} nos pênaltis</span>`:''}
  </span>`;
}

/* ---- A CHAVE ESPELHADA (desktop) ----
   Cada fase e uma coluna de altura FIXA com `justify-content:space-around`: e
   isso, e so isso, que faz o centro de cada confronto da fase seguinte cair no
   meio do par anterior. Entre duas colunas vao o conector (caixa com borda em
   tres lados, o "]" ) e um stub de 8px. Nada aqui depende da largura da janela;
   quando nao cabe, o contentor rola na horizontal. */
/* QUANTAS FASES CABEM NA CHAVE ESPELHADA. A Copa do Brasil comeca com 80 clubes
   e SETE fases: desenhar as sete daria 64 cartoes na coluna de fora, ilegiveis
   em qualquer tela. A chave mostra as ultimas quatro (oitavas -> final), que e o
   recorte que interessa a quem esta a ver quanto falta para o titulo; as fases
   anteriores continuam inteiras na vista por fases (telemovel) e no "seu
   caminho", ao lado. Competicao pequena -- playoff de oito, quartas em diante --
   usa a mesma estrutura com menos colunas, sem nada a esconder. */
const RF_CH_MAX_FASES=4;
function rfChaveHTML(d){
  if(!d) return '<div class="rf-empty">O mata-mata ainda não começou.</div>';
  const todas=d.fases;
  const fases=todas.length>RF_CH_MAX_FASES?todas.slice(-RF_CH_MAX_FASES):todas;
  const cortou=todas.length-fases.length;
  const final=fases[fases.length-1];
  const antes=fases.slice(0,-1);
  const meia=(cfs,lado)=>{
    const n=cfs.length, meio=Math.ceil(n/2);
    return lado==='E'?cfs.slice(0,meio):cfs.slice(meio);
  };
  /* QUANTOS SLOTS TEM CADA COLUNA, POR LADO. A chave e uma arvore: a coluna
     colada a final tem 1 confronto de cada lado, a anterior 2, a anterior 4.
     Isto NAO pode sair do que o motor ja produziu -- as fases futuras ainda nao
     existem, e uma coluna com um unico cartao "a definir" fazia o conector medir
     a altura toda e apontar para o vazio. Os slots vazios sao desenhados como
     cartao tracejado, que e o estado "a definir" do pacote. */
  const slots=(idx)=>Math.pow(2, antes.length-1-idx);
  const preenche=(lista,n)=>{ const out=lista.slice(0,n); while(out.length<n) out.push(null); return out; };
  /* o lado do clube do utilizador e sempre o esquerdo */
  const colunas=(lado)=>antes.map((f,idx)=>{
    const n=slots(idx);
    const cfs=preenche(meia(f.confrontos,lado), n);
    const alvo=idx+1<antes.length?slots(idx+1):1;
    const col=`<div class="rf-ch-col">
      <span class="rf-ch-fase">${escC(f.label)}</span>
      <div class="rf-ch-slots">${cfs.map(rfChaveCartaoHTML).join('')}</div>
    </div>`;
    /* A ALTURA DO CONECTOR E A DISTANCIA ENTRE OS DOIS CENTROS QUE ELE LIGA.
       Com `space-around`, uma coluna de N confrontos poe os centros a cada H/N --
       entao o "]" tem exatamente H/N de altura, e isso muda a cada fase (4
       confrontos: H/4; 2 confrontos: H/2). */
    const h=`calc(var(--rf-ch-h,480px)/${n})`;
    const ouro=i=>((cfs[i*2]&&cfs[i*2].meu)||(cfs[i*2+1]&&cfs[i*2+1].meu))?'ouro':'';
    /* UM SO CONFRONTO NAO PRECISA DE CHAVETA: da semifinal para a final nao ha
       par a juntar, ha uma linha. Desenhar o "]" ali dava uma chaveta da altura
       da coluna inteira a apontar para o nada. */
    const linha = n===1 && alvo===1;
    const lig=`<div class="rf-ch-lig ${lado==='E'?'e':'d'} ${linha?'reta':''}">${
      Array.from({length:alvo},(_,i)=>`<i class="${ouro(i)}" ${linha?'':`style="height:${h}"`}></i>`).join('')}</div>
      <div class="rf-ch-stub ${lado==='E'?'e':'d'}">${
      Array.from({length:alvo},(_,i)=>`<i class="${ouro(i)}"></i>`).join('')}</div>`;
    return lado==='E'?(col+lig):(lig+col);
  });
  const camp=d.campeao;
  const centro=`<div class="rf-ch-col final">
    <span class="rf-ch-fase">${escC(final?final.label:'FINAL')}</span>
    <div class="rf-ch-taca">
      ${d.trofeu?`<img src="img/trofeus/${escC(d.trofeu)}.webp" alt="" class="${camp?'':'cinza'}">`:''}
      <span class="rf-ch-taca-l">CAMPEÃO</span>
      <span class="rf-ch-camp ${camp?'ok':''}">${escC(camp?(camp.short||camp.name):'a definir')}</span>
      ${d.premio?`<span class="rf-ch-premio"><b>${escC(fmt(d.premio))}</b><i>AO CAMPEÃO</i></span>`:''}
      ${final&&final.confrontos.length?`<div class="rf-ch-slots uma">${rfChaveCartaoHTML(final.confrontos[0])}</div>`:''}
    </div>
  </div>`;
  return `<div class="rf-ch-rolo">
    <div class="rf-ch">${colunas('E').join('')}${centro}${colunas('D').reverse().join('')}</div>
  </div>
  <div class="rf-ch-legenda">
    <span><i class="rf-ch-lg ouro"></i>caminho do ${escC(d.meuClube||'seu clube')}</span>
    <span><i class="rf-ch-lg tracejado"></i>confronto a definir</span>
    ${cortou?`<span>as ${cortou} fases anteriores estão no seu caminho, ao lado</span>`:''}
  </div>`;
}
/* ---- MOBILE: uma fase de cada vez ----
   A chave espelhada nao cabe em 375px sem zoom, e zoom e o que o pacote proibe.
   Aqui as fases viram pilhas: uma fita de pastilhas em cima (com o estado no
   proprio rotulo) e os confrontos daquela fase como cartoes de largura cheia. */
function rfChaveFase(){ return CL._chaveFase||null; }
function rfChaveIrFase(k){ CL._chaveFase=k; cdraw(); }
function rfChaveMobileHTML(d){
  if(!d) return '<div class="rf-empty">O mata-mata ainda não começou.</div>';
  const atual=d.fases.find(f=>f.atual)||d.fases[d.fases.length-1];
  const sel=d.fases.find(f=>f.key===rfChaveFase())||atual;
  const pastilhas=d.fases.map(f=>{
    const marca=f.encerrada?'✓':(f.atual?'•':'—');
    const meu=f.confrontos.some(c=>c.meu);
    return `<button type="button" class="rf-chm-p ${f.key===sel.key?'on':''} ${meu?'meu':''}"
      ${f.key===sel.key?'data-rf-centrar="1"':''}
      onclick="rfChaveIrFase('${escC(f.key)}')">${escC(f.label)} ${marca}</button>`;
  }).join('');
  const cfs=sel.confrontos.slice().sort((a,b)=>(b.meu?1:0)-(a.meu?1:0));
  const cartoes=cfs.length?cfs.map(cf=>`<div class="rf-card rf-chm-c ${cf.meu?'meu':''}">
      <div class="rf-label"><span class="rf-label-t">${escC(sel.label)} · jogo ${cf.n}</span>
        ${cf.meu?'<span class="rf-label-r ouro">SEU JOGO</span>':''}</div>
      ${cf.lados.map(rfChaveLinhaHTML).join('')}
      ${cf.pen?`<span class="rf-note">${escC(cf.pen)} nos pênaltis</span>`:''}
    </div>`).join('')
    :'<div class="rf-empty">Os confrontos desta fase saem no sorteio.</div>';
  const camp=d.campeao;
  const taca=(sel.key==='f'+d.roundsTotal)
    ? `<div class="rf-card rf-chm-taca">
         ${d.trofeu?`<img src="img/trofeus/${escC(d.trofeu)}.webp" alt="" class="${camp?'':'cinza'}">`:''}
         <span class="rf-ch-taca-l">CAMPEÃO</span>
         <span class="rf-ch-camp ${camp?'ok':''}">${escC(camp?(camp.short||camp.name):'a definir')}</span>
         ${d.premio?`<span class="rf-ch-premio"><b>${escC(fmt(d.premio))}</b><i>AO CAMPEÃO</i></span>`:''}
       </div>` : '';
  return `<div class="rf-chm-fitas">${pastilhas}</div>${taca}${cartoes}`;
}
/* a tela escolhe sozinha: no telemovel, fases; no resto, a chave espelhada */
function rfChaveVistaHTML(key){
  const d=rfChaveDados(key);
  if(!d) return '';
  const curto=(typeof isPhone==='function')&&isPhone();
  return curto?rfChaveMobileHTML(d):rfChaveHTML(d);
}

/* =====================================================================
   3 · COPA — CLASSIFICAÇÃO DA FASE (substitui scCupClassif)
   ===================================================================== */
function rfCopaFaseHTML(key){
  key=key||CL._cupClassifKey||CL._cupClassifKey||CL._cupKey;
  const c=(S.cups&&S.cups[key])||{};
  const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[key])||{};
  const br=rfCompChave(c)||{};
  const meu=CL.clubId;
  const fechada=(br.history||[]).length?br.history[br.history.length-1]:null;
  const confrontos=(fechada&&fechada.ties)||br.ties||[];

  /* ===== "QUEM PASSOU DE FASE" SO DEPOIS DE ALGUEM PASSAR =====
     Numa copa com os dois formatos, esta tela aparecia a cada jornada da FASE DE
     GRUPOS -- com o titulo a falar de passagem de fase, a chave vazia e nada por
     baixo, porque ainda nao ha confronto eliminatorio nenhum. Enquanto a
     competicao estiver nos grupos, o que ha para mostrar sao os grupos, e e isso
     que ela mostra. A tela de fase encerrada volta quando a chave existe. */
  if(!rfCompChave(c) && c.group){
    return rfStage({
      w:1020, comp:key,
      contexto:`${escC(def.name||key)} ${escC(String(S.season||''))} · fase de grupos`,
      titulo:'Como estão os grupos',
      corpo:rfCopaGruposHTML(c,key),
      acoes:`<button type="button" class="rf-ov-b2" onclick="rfSetTabIr('campeonatos','calendario')">${rfIcone('calendario',16)} Calendário</button>
        <div class="rf-sp"></div>
        <button type="button" class="rf-ov-cta" onclick="cupClassifContinue()">Continuar</button>`
    });
  }
  const rodadaFechada=fechada?fechada.round:br.round;
  const fase=(typeof cupPhaseLabel==='function'&&br.roundsTotal)
    ? cupPhaseLabel(rodadaFechada, br.roundsTotal) : 'Mata-mata';
  const proxima=(br.roundsTotal&&rodadaFechada<br.roundsTotal)
    ? cupPhaseLabel(rodadaFechada+1, br.roundsTotal) : null;
  const minha=confrontos.find(t=>t.h===meu||t.a===meu);
  const passou=minha&&minha.winner===meu;
  const vagas=confrontos.length;

  /* uma LINHA POR CLUBE, como na referência — o mesmo confronto rende duas
     linhas (quem passou e quem caiu), cada uma com o placar do seu lado */
  const linhas=[];
  confrontos.forEach(t=>{
    [t.h,t.a].forEach(id=>{
      if(!id) return;
      const cc=anyClubOf(id)||{short:id};
      const emCasa=id===t.h;
      const pl=(t.hg!=null&&t.ag!=null)?(emCasa?`${t.hg}–${t.ag}`:`${t.ag}–${t.hg}`):'—';
      const pen=t.pens?` · ${emCasa?t.pens.h+'–'+t.pens.a:t.pens.a+'–'+t.pens.h} pên`:'';
      linhas.push({id, nome:cc.short, cc, pl:pl+pen,
        ok:t.winner?t.winner===id:null, eu:id===meu});
    });
  });
  linhas.sort((x,y)=>(y.ok===true)-(x.ok===true));

  /* prêmio: a mesma conta que o motor paga, nada decorativo */
  const cotaProx=(typeof PRIZES!=='undefined'&&PRIZES.copaBrasilPhaseCash&&key==='copaBrasil'&&proxima)
    ? PRIZES.copaBrasilPhaseCash(rodadaFechada+1, br.roundsTotal, true) : 0;
  let acumulado=0, jogos=0, gp=0, gc=0;
  (br.history||[]).forEach(h=>(h.ties||[]).forEach(t=>{
    if(t.h!==meu && t.a!==meu) return;
    jogos++;
    const emCasa=t.h===meu;
    if(t.hg!=null&&t.ag!=null){ gp+=emCasa?t.hg:t.ag; gc+=emCasa?t.ag:t.hg; }
    (t.prize&&t.prize.pagos||[]).forEach(pg=>{ if(pg.id===meu) acumulado+=pg.amt||0; });
  }));
  /* possíveis adversários: quem também passou e não é o meu clube */
  const adiante=linhas.filter(l=>l.ok===true && l.id!==meu);
  /* ===== DEPOIS DA FINAL NAO HA "PROXIMA FASE" =====
     Esta tela e a de fim de FASE, e a final e uma fase como as outras -- so que
     depois dela nao ha adversario a sortear, nem vaga, nem "quem passou". Com o
     campeao decidido ela dizia "Quem passou de fase", listava "possiveis
     adversarios" (o proprio campeao) e mostrava a campanha de um clube que
     muitas vezes nem disputou a competicao. Agora a final tem a sua leitura: o
     campeao, e mais nada. */
  const campeao=(typeof cupCompetitionChampion==='function')?cupCompetitionChampion(c):(br.champion||null);
  const ehFinal=!!campeao || (br.roundsTotal && rodadaFechada>=br.roundsTotal);
  const clCampeao=campeao?(anyClubOf(campeao)||{short:campeao}):null;
  const souEu=campeao && String(campeao)===String(meu);
  /* o clube do utilizador tem alguma coisa a ver com esta competicao? sem isso,
     "O que o Avai levou ate aqui" aparecia numa copa em que o Avai nao entrou */
  const euEntrei=jogos>0 || linhas.some(l=>l.eu);

  return rfStage({
    w:1020, comp:key,
    contexto:`${escC(def.name||key)} ${escC(String(S.season||''))} · ${ehFinal?'final encerrada':escC(fase)+' encerrada'}`,
    titulo: ehFinal
      ? (clCampeao?`${escC(clCampeao.short||clCampeao.name)} é campeão`:'Campeão decidido')
      : (proxima?`Quem passou para a ${escC(proxima.toLowerCase())}`:'Quem passou de fase'),
    corpo:`<div class="rf-cf-cols">
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">Resultado dos confrontos</span>
          <span class="rf-label-r">${vagas?vagas+(vagas===1?' vaga':' vagas'):''}</span></div>
        ${linhas.length?linhas.map(l=>`<div class="rf-cf-lin ${l.eu?'meu':''}">
          <span class="rf-ft-crest">${rfCrest(l.cc,22)}</span>
          <span class="rf-cf-t">${escC(l.nome)}</span>
          <span class="rf-cf-p">${escC(l.pl)}</span>
          ${l.ok===null?'<span class="rf-cf-tag em">em disputa</span>'
            :`<span class="rf-cf-tag ${l.ok?'ok':'no'}">${l.ok?'classificado':'eliminado'}</span>`}
        </div>`).join(''):'<span class="rf-note">Os confrontos aparecem quando a fase fechar.</span>'}
      </div>
      <div class="rf-cf-dir">
        <div class="rf-card rf-cf-selo">
          ${(typeof rfCompTrofeuHTML==='function')?rfCompTrofeuHTML(rfCompInfo(key),56):rfTrofeuHTML(key,56)}
          <div class="rf-cf-selod">
            <span class="rf-cf-selot">${ehFinal
              ? (souEu?'A taça é nossa'
                 :(clCampeao?`${escC(clCampeao.short||clCampeao.name)} levanta a taça`:'Campeão decidido'))
              : (minha
                 ? (passou?`${escC(proxima||'Próxima fase')} garantida`:`Eliminado ${escC(fase.toLowerCase())}`)
                 : 'O seu clube não está nesta competição')}</span>
            <span class="rf-cf-selos">${ehFinal
              ? `${escC(def.name||key)} ${escC(String(S.season||''))} · competição encerrada`
              : (passou&&cotaProx
                 ? `Sorteio da próxima fase · ${escC(fmt(cotaProx))} por passar`
                 : (minha?'A campanha na copa termina aqui.':'Acompanhando de fora.'))}</span>
          </div>
        </div>
        ${euEntrei?`<div class="rf-card">
          <span class="rf-label-t">O que o ${escC((clubOf(meu)||{short:'clube'}).short)} levou até aqui</span>
          <div class="rf-ft-grid">
            <div class="rf-ft-b"><span class="rf-ov-res-t">Prêmio acumulado</span>
              <span class="rf-ft-bv">${escC(acumulado?fmt(acumulado):'—')}</span></div>
            <div class="rf-ft-b"><span class="rf-ov-res-t">Jogos</span>
              <span class="rf-ft-bv">${jogos||'—'}</span></div>
            <div class="rf-ft-b"><span class="rf-ov-res-t">Saldo</span>
              <span class="rf-ft-bv">${jogos?gp+'–'+gc:'—'}</span></div>
            <div class="rf-ft-b"><span class="rf-ov-res-t">Próximo prêmio</span>
              <span class="rf-ft-bv">${cotaProx?escC(fmt(cotaProx)):'—'}</span></div>
          </div>
        </div>`:''}
        ${ehFinal?'':`<div class="rf-card">
          <div class="rf-label"><span class="rf-label-t">Possíveis adversários</span>
            <span class="rf-label-r">${proxima?escC(proxima.toLowerCase()):''}</span></div>
          ${adiante.length?adiante.slice(0,6).map(l=>`<div class="rf-cf-adv">
            <span class="rf-ft-crest">${rfCrest(l.cc,22)}</span>
            <span class="rf-ft-n">${escC(l.nome)}</span>
            <div class="rf-sp"></div>
            <span class="rf-cf-advd">${(l.cc.div||l.cc.division)?escC(divisionLabelOf(l.cc.div||l.cc.division)):''}</span>
          </div>`).join(''):'<span class="rf-note">O sorteio da próxima fase define o confronto.</span>'}
        </div>`}
      </div>
    </div>`,
    acoes:`${CL.online?'<span class="rf-im-auto">avança sozinho em alguns segundos</span>':''}
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="cupClassifContinue()">Continuar</button>`
  });
}

/* =====================================================================
   4 · IMPRENSA (substitui scImprensa)
   ===================================================================== */
/* Fiel a telas/Imprensa.html: 1020px, grid 1.4fr/1fr. Esquerda = manchetes
   (chip de editoria + fonte·quando, título em Georgia). Direita = medidores
   "Como a imprensa te vê" + "A sua resposta". Rodapé: recusar / declarar.
   O fluxo real tem 3 passos (news, qa, fim) — os três usam este mesmo layout,
   trocando só o que entra na coluna da direita. */
function rfImMedidor(rot, pct, cor){
  const v=Math.max(0,Math.min(100,Math.round(pct)));
  return `<div class="rf-im-med">
    <div class="rf-im-medtop"><span class="rf-im-medr">${escC(rot)}</span><span class="rf-im-medv">${v}%</span></div>
    <div class="rf-im-medb"><i style="width:${v}%;background:${cor}"></i></div>
  </div>`;
}
function rfImMedidoresHTML(){
  const seg = (typeof S!=='undefined' && S.jobSecurity!=null) ? S.jobSecurity : 60;
  let posSc=60;
  try{
    const pos=tablePos(S.clubId), total=(DATA.clubs||[]).length;
    if(total>1) posSc=100-((pos-1)/(total-1))*100;
  }catch(e){}
  const pressao=Math.max(0,100-Math.round((seg+posSc)/2));
  return `<div class="rf-card">
    <span class="rf-label-t">Como a imprensa te vê</span>
    <div class="rf-im-meds">
      ${rfImMedidor('Confiança da diretoria', seg, seg>=60?'var(--ok)':seg>=35?'var(--club-secondary)':'var(--danger)')}
      ${rfImMedidor('Apoio da torcida', posSc, '#8cc63f')}
      ${rfImMedidor('Pressão da imprensa', pressao, 'var(--club-secondary)')}
    </div>
  </div>`;
}
function rfImNoticia(editoria, fonte, titulo, texto, destaque){
  return `<div class="rf-card ${destaque?'rf-im-dest':''}">
    <div class="rf-im-nt">
      <span class="rf-im-ed">${escC(editoria)}</span>
      <div class="rf-sp"></div>
      <span class="rf-im-fonte">${escC(fonte)}</span>
    </div>
    <span class="rf-im-h ${destaque?'g':''}">${titulo}</span>
    <span class="rf-im-d">${texto}</span>
  </div>`;
}
/* manchetes a partir do balanço real da temporada (P.b), na ordem do jornal */
function rfImManchetesHTML(b){
  if(!b) return '';
  const meu=(typeof clubOf==='function')?clubOf(CL.clubId):null;
  const jornal=meu&&meu.n ? 'Diário de '+meu.n : 'Diário do Clube';
  const out=[];
  const my=(b.divs||[]).find(d=>d.div===S.division)||(b.divs||[])[0];
  if(my) out.push(rfImNoticia('Título', jornal+' · hoje',
    escC(my.campeao)+' é campeão da '+escC(my.label),
    my.campeaoPts+' pontos na temporada '+b.season+'.', true));
  if(b.copa) out.push(rfImNoticia('Copa','Lance Regional · hoje',
    'Copa do Brasil: '+escC(b.copa), 'Levantou a taça nacional.'));
  if(b.art) out.push(rfImNoticia('Artilharia','Rádio Esportiva · ontem',
    'Artilheiro: '+escC(b.art.nome), b.art.gols+' gols na temporada.'));
  (b.divs||[]).forEach(d=>{
    if(!d.promovidos.length && !d.rebaixados.length) return;
    const sobe=d.promovidos.length?('<b>Sobem:</b> '+d.promovidos.map(escC).join(', ')):'';
    const cai=d.rebaixados.length?('<b>Caem:</b> '+d.rebaixados.map(escC).join(', ')):'';
    out.push(rfImNoticia('Divisões','Boletim da Federação · ontem', escC(d.label),
      [sobe,cai].filter(Boolean).join(' · ')));
  });
  if((b.retirements||[]).length) out.push(rfImNoticia('Elenco', jornal+' · ontem',
    'Aposentadorias no seu elenco',
    b.retirements.map(r=>escC(r.name)+' <span class="rf-im-par">('+escC(r.reason||'')+')</span>').join('<br>')));
  if((b.humanos||[]).length>1) out.push(rfImNoticia('Resenha','Mesa Redonda · hoje',
    'Classificação dos treinadores',
    b.humanos.map((h,i)=>`${i+1}º ${escC(h.nome)} <span class="rf-im-par">(${escC(h.clube)} · ${escC(h.divLabel)}, ${h.pos}º)</span>`).join('<br>')));
  return out.join('');
}
function rfImEfeito(m){
  if(m>0) return 'moral do elenco +'+m;
  if(m<0) return 'moral do elenco −'+Math.abs(m);
  return 'sem efeito, sem risco';
}
function rfImprensaHTML(P){
  P=P||(typeof CL!=='undefined'?CL._press:null);
  if(!P) return '';
  const seg=Math.max(0,CL._pressLeft!=null?CL._pressLeft:25);
  const total=(typeof PRESS_QUESTIONS!=='undefined')?PRESS_QUESTIONS.length:0;
  let contexto, titulo, direita, acoes;

  if(P.step==='news'){
    contexto=`Temporada ${(P.b&&P.b.season)||S.season||''} · o que rolou`;
    titulo='Imprensa';
    direita=rfImMedidoresHTML();
    acoes=`<span class="rf-im-auto">avança sozinho em ${seg}s</span><div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="pressGoQA()">Ir para a coletiva</button>`;
  } else if(P.step==='qa'){
    const q=PRESS_QUESTIONS[P.qIdx]||{opts:[]};
    contexto=`Coletiva de imprensa · pergunta ${P.qIdx+1} de ${total}`;
    titulo='Imprensa';
    direita=rfImMedidoresHTML()+`<div class="rf-card">
      <div class="rf-im-nt"><span class="rf-label-t">A sua resposta</span><div class="rf-sp"></div>
        <span class="rf-im-oe">pergunta ${P.qIdx+1} de ${total}</span></div>
      <p class="rf-im-perg">${escC(q.q||'')}</p>
      ${(q.opts||[]).map((o,i)=>`<div class="rf-im-op ${CL.pressSel===i?'sel':''}" onclick="rfImSel(${i})">
        <span class="rf-im-ot">${escC(o.t)}</span>
        <span class="rf-im-oe">${escC(rfImEfeito(o.m||0))}</span>
      </div>`).join('')}
    </div>`;
    acoes=`<span class="rf-im-auto">avança sozinho em ${seg}s</span><div class="rf-sp"></div>
      <button type="button" class="rf-ov-b2" onclick="pressAnswer(-1)">Não declarar nada</button>
      <button type="button" class="rf-ov-cta" onclick="rfImResponder()">Dar a entrevista</button>`;
  } else {
    const d=Math.max(-15,Math.min(15,P.morale||0));
    const tom = d>0?'sobe':d<0?'cai':'estável';
    const moralTxt = d===0 ? 'A moral do elenco segue estável.'
      : `A moral do elenco <b>${tom}</b> ${d>0?'+':'−'}${Math.abs(d)} ponto${Math.abs(d)===1?'':'s'} para o início da temporada.`;
    contexto='O que saiu nos jornais';
    titulo='Repercussão da coletiva';
    direita=rfImMedidoresHTML()+`<div class="rf-card">
      <span class="rf-label-t">Vestiário</span>
      <p class="rf-im-p">${moralTxt}</p>
    </div>`;
    acoes=`<span class="rf-im-auto">avança sozinho em ${seg}s</span><div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="pressFinish()">Começar a temporada</button>`;
  }

  const esquerda = P.step==='fim'
    ? ((P.answers||[]).filter(a=>a.h).map(a=>rfImNoticia('Declaração','Coletiva · agora há pouco', escC(a.h), escC(a.t))).join('')
       || rfImNoticia('Silêncio','Coletiva · agora há pouco','Sem declarações','Você preferiu não falar com a imprensa.'))
    : (rfImManchetesHTML(P.b) || rfImNoticia('Bastidores','Sala de imprensa · agora',
        'Os jornalistas já estão na sala',
        'A coletiva começa assim que você entrar. Cada resposta pesa na moral do elenco.'));

  return rfStage({
    w:1020, contexto, titulo,
    corpo:`<div class="rf-im-cols">
      <div class="rf-im-esq">${esquerda}</div>
      <div class="rf-im-dir">${direita}</div>
    </div>`,
    acoes
  });
}
function rfImSel(i){ CL.pressSel=i; cdraw(); }
function rfImResponder(){ pressAnswer(CL.pressSel!=null?CL.pressSel:0); CL.pressSel=null; }

/* =====================================================================
   5 · ADVERSÁRIO — VER TIME (substitui scTeamView)
   ===================================================================== */
function rfVerTimeHTML(clubId){
  clubId=clubId||CL.viewClubId||CL.clubId;
  const c=anyClubOf(clubId)||{short:'—'};
  const sq=squad(clubId)||[];
  const forca=sq.length?Math.round(sq.reduce((s,p)=>s+(p.f||0),0)/sq.length):0;
  const perigo=sq.slice().sort((a,b)=>(b.f||0)-(a.f||0)).slice(0,3);
  const t=(S.table&&S.table[clubId])||null;
  /* CONTRA VOCÊ é histórico de verdade: S.results guarda cada jogo da temporada,
     então o confronto direto sai de lá em vez de virar posição/pontos genéricos. */
  const meu=CL.clubId;
  const h2h=(S.results||[]).filter(r=>(r.h===clubId&&r.a===meu)||(r.a===clubId&&r.h===meu))
    .slice().reverse().slice(0,4).map(r=>{
      const emCasa=r.h===meu;
      return {j:(r.round!=null?(r.round+1)+'ª jornada':'—'),
        p:emCasa?`${r.hg}–${r.ag}`:`${r.ag}–${r.hg}`, m:emCasa?'casa':'fora'};
    });
  return rfStage({
    w:1020, crest:c,
    contexto:`${escC(divisionLabel())}${t?' · '+rfPosDe(clubId)+'º colocado':''}`,
    titulo:c.short,
    corpo:`<div class="rf-vt-cols">
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">Elenco</span>
          <span class="rf-label-r">${sq.length} jogadores · força média ${forca}</span></div>
        <div class="rf-pl-head"><span></span><span></span><span>POS</span><span>FORMA</span><span>FOR</span></div>
        <div class="rf-vt-lista">${sq.slice().sort(bySquadOrder).map(p=>{
          const en=Math.round(p.energy!=null?p.energy:100);
          return `<div class="rf-pl" style="cursor:default">
            <span class="rf-pl-num">${escC(String(p.num!=null?p.num:'—'))}</span>
            <span class="rf-pl-id"><span class="rf-pl-n">${escC(p.n)}</span></span>
            <span class="rf-pl-pos">${escC(posLetter(p.s))}</span>
            <span class="rf-pl-en"><i class="rf-ener" style="--v:${en};--c:${rfEnergiaCor(en)}"></i></span>
            <span class="rf-pl-for">${p.f}</span>
          </div>`;
        }).join('')}</div>
      </div>
      <div class="rf-vt-dir">
        <div class="rf-card">
          <span class="rf-label-t">Quem pode te machucar</span>
          ${perigo.map(p=>{
            const gols=(S.scorers&&S.scorers[p.n])||0;
            return `<div class="rf-vt-p2">
              <span class="rf-vt-pn">${escC(p.n)}</span>
              <span class="rf-vt-ps">${escC(posLetter(p.s))} · força ${p.f}${gols?' · '+gols+(gols===1?' gol':' gols'):''}</span>
            </div>`;}).join('')}
        </div>
        <div class="rf-card">
          <div class="rf-label"><span class="rf-label-t">Contra você</span>
            <span class="rf-label-r">histórico</span></div>
          ${h2h.length?h2h.map(x=>`<div class="rf-vt-h2h">
            <span class="rf-vt-hj">${escC(x.j)}</span>
            <span class="rf-vt-hp">${escC(x.p)}</span>
            <span class="rf-vt-hm">${escC(x.m)}</span>
          </div>`).join(''):'<span class="rf-note">Vocês ainda não se enfrentaram nesta temporada.</span>'}
        </div>
      </div>
    </div>`,
    acoes:`<button type="button" class="rf-ov-b2" onclick="clCloseOverlay();rfGo('mercado')"><span>${rfIcone('mercado',16)}</span> Fazer uma proposta</button>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="CL.viewClubId=null;CL.screen='main';cdraw()">Voltar</button>`
  });
}
function rfPosDe(id){
  const ord=(typeof sortedTable==='function')?sortedTable():[];
  const i=ord.findIndex(t=>t.id===id);
  return i<0?'—':i+1;
}
