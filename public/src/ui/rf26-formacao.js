/* =====================================================================
   RetroFoot98 — FORMAÇÃO: os dois blocos que faltavam
   Portado de telas/Hub do Time - Sidebar Recolhida.html (pacote v2).

   NOTAS DO PLANTEL (à esquerda do Adversário) — Artilheiro do clube,
   Destaque da rodada e Em baixa. Três linhas com rótulo, nome, uma frase
   de contexto e o número grande à direita.

   ADVERSÁRIO — cartão azul-marinho com o selo do rival, o mando e a
   rodada, e a MINI-TABELA comparando os dois clubes (J·V·D·GM:GS·P),
   com o botão Jogar pulsando. Antes esta caixa chamava panAdversario(),
   que é a do skin antigo — daí não parecer nada com a tela.
   ===================================================================== */

/* ---- notas: quem está bem e quem não está ---- */
function rfNotasHTML(){
  const sq=squad(CL.clubId);
  if(!sq.length) return '';
  const golsDe=p=>(S.scorers&&S.scorers[p.n])||0;
  const notaDe=p=>{ const r=(p.stats&&p.stats.r3)||[]; return r.length?r[r.length-1]:null; };
  const artilheiro=sq.slice().sort((a,b)=>golsDe(b)-golsDe(a))[0];
  const gols=artilheiro?golsDe(artilheiro):0;
  const comNota=sq.filter(p=>notaDe(p)!=null);
  const destaque=comNota.slice().sort((a,b)=>notaDe(b)-notaDe(a))[0];
  const baixa=sq.slice().sort((a,b)=>(a.energy!=null?a.energy:100)-(b.energy!=null?b.energy:100))[0];
  const linha=(rot,nome,sub,valor)=>`<div class="rf-nota">
    <div class="rf-nota-id">
      <span class="rf-nota-r">${escC(rot)}</span>
      <span class="rf-nota-n">${escC(nome)}</span>
      <span class="rf-nota-s">${escC(sub)}</span>
    </div>
    <span class="rf-nota-v">${escC(String(valor))}</span>
  </div>`;
  const jogos=(S.round||0);
  const assist=(artilheiro&&artilheiro.stats&&artilheiro.stats.assists)||0;
  return `<div class="rf-card rf-notas">
    ${gols
      ? linha('Artilheiro do clube', artilheiro.n,
          'gols em '+jogos+(jogos===1?' jogo':' jogos')+(assist?' · '+assist+' assistências':''), gols)
      : linha('Artilheiro do clube','—','ninguém marcou ainda','0')}
    ${destaque
      ? linha('Destaque da rodada', destaque.n, 'nota do último jogo',
          String(notaDe(destaque)).replace('.',','))
      : linha('Destaque da rodada','—','a primeira rodada ainda não foi jogada','—')}
    ${baixa
      ? linha('Em baixa', baixa.n,
          (baixa.injuredMatches>0?'lesionado':baixa.suspended>0?'suspenso':'energia baixa'),
          Math.round(baixa.energy!=null?baixa.energy:100)+'%')
      : ''}
  </div>`;
}

/* ---- adversário: o cartão escuro com a mini-tabela e o Jogar ---- */
function rfAdversarioCardHTML(){
  const nm=(typeof nextUserMatch==='function')?nextUserMatch():null;
  /* ===== SEM JOGO NAO E SEM BOTAO =====
     Este cartao virou o UNICO ponto de avanco da tela (as Formacoes cederam o Jogar para ele,
     20/08) — e a versao vazia nao tinha botao nenhum: numa rodada em que o clube nao entra em
     campo (parada do calendario, semana de finais, eliminado das copas) o usuario ficava sem
     como avancar. O cartao vazio continua a dizer que nao ha jogo, mas o botao fica — e o
     rotulo desce a escada de sempre (rfJogarLabel): "Avançar" no solo, "Quase pronto"/"Pronto"
     na Resenha, "Ver o sorteio"/"Ver classificação" quando e isso que se deve. */
  if(!nm||!nm.oppId){
    return `<div class="rf-adv rf-adv-semjogo">
      <div class="rf-adv-hd">
        <span class="rf-adv-l">Esta semana</span>
        <span class="rf-adv-d">${S.season||''}</span>
      </div>
      <span class="rf-adv-livre">O seu clube não entra em campo nesta rodada.</span>
      <button type="button" class="rf-adv-jogar" onclick="${rfJogarAcao()}">${rfJogarLabel()}</button>
    </div>`;
  }
  const opp=anyClubOf(nm.oppId)||{short:'—'};
  const eu=clubOf(CL.clubId)||{short:'—'};
  const data=(typeof shortMatchDate==='function')?shortMatchDate(nm):'';
  const linhaTab=(c,destaque)=>{
    const t=(S.table&&S.table[c.id])||{P:0,W:0,L:0,GF:0,GA:0,Pts:0};
    return `<div class="rf-adv-lin ${destaque?'me':''}">
      <span class="rf-adv-n">${escC(c.short||'—')}</span>
      <span>${t.P||0}</span><span>${t.W||0}</span><span>${t.L||0}</span>
      <span>${(t.GF||0)}:${(t.GA||0)}</span><span class="rf-adv-p">${t.Pts||0}</span>
    </div>`;
  };
  const xi=xiPlayers(CL.clubId);
  const pronto = xi.length>=11 && CL.tacticChosen && (typeof xiGKCount!=='function'||xiGKCount(xi)===1);
  return `<div class="rf-adv">
    <div class="rf-adv-hd">
      <span class="rf-adv-l">Adversário</span>
      <span class="rf-adv-d">${escC(data||'')}${S.season?' · '+S.season:''}</span>
    </div>
    <div class="rf-adv-clube">
      <span class="rf-adv-selo">${rfCrest(opp,36)}</span>
      <span class="rf-adv-id">
        <span class="rf-adv-nome">${escC(opp.short||'')}</span>
        <span class="rf-adv-sub">${nm.home?'CASA':'FORA'} · ${escC(nm.comp||divisionLabel())} · ${escC(nm.fase||(((S.round||0)+1)+'ª Rodada'))}</span>
      </span>
    </div>
    <div class="rf-adv-tab">
      <div class="rf-adv-lin cab"><span></span><span>J</span><span>V</span><span>D</span><span>GM:GS</span><span>P</span></div>
      ${linhaTab(eu,true)}
      ${linhaTab(opp,false)}
    </div>
    <!-- CLASSIFICACAO PENDENTE NAO PODE FICAR TRANCADA ATRAS DO ONZE. Este botao desliga com o
         onze incompleto, o que esta certo para entrar em campo -- mas ver uma tabela nao e
         entrar em campo, e clJogar resolve a fila antes de olhar para a escalacao. Trancado,
         o jogador ficava sem caminho nenhum para a classificacao que o jogo lhe devia. -->
    <button type="button" class="rf-adv-jogar ${pronto&&!rfClassifPendente()?'pulsa':''}" onclick="${rfJogarAcao()}"
      ${(pronto||rfClassifPendente())?'':'disabled'}>${rfJogarLabel()}</button>
    ${pronto?'':'<span class="rf-adv-falta">Complete o onze e escolha a formação para entrar em campo.</span>'}
  </div>`;
}

/* =====================================================================
   CAMPO E BANCO  (telas/Hub do Time.html do pacote "Hub do time v2")
   Tres peças que a pele antiga ainda desenhava do jeito de 1998:
   a marca d'agua do escudo no gramado, a linha de dados debaixo da
   camisa e a barra de suplentes.
   ===================================================================== */

/* Escudo gigante atras dos jogadores: 190px, 10% de opacidade e achatado
   pra branco (brightness(0) invert(1)) — o escudo colorido brigaria com as
   camisas. So sai quando o clube tem escudo de verdade; o crachá de
   iniciais nao vira marca d'agua (ficaria uma mancha de texto). */
function rfPitchMarcaHTML(){
  const c = (typeof anyClubOf==='function') ? anyClubOf(CL.clubId) : null;
  const url = (typeof clubCrestUrl==='function') ? clubCrestUrl(c||{}) : '';
  if(!url) return '';
  return `<img class="rf-pitch-marca" src="${escC(url)}" alt="" aria-hidden="true">`;
}

/* Linha de dados do titular: LETRA DA POSIÇÃO · barra de energia · força.
   Substitui o par forca+pilha da pele antiga — no gramado o que decide a
   escalação é ver, de relance, quem esta gasto. */
function rfPitchMetaHTML(p){
  const en = Math.max(0, Math.min(100, Math.round(p.energy!=null?p.energy:100)));
  const cor = en>=70 ? 'var(--ok)' : en>=40 ? 'var(--warn)' : 'var(--danger)';
  return `<span class="rf-pp-meta">
    <span class="rf-pp-pos">${escC(posLetter(p.s))}</span>
    <span class="rf-pp-bar"><i style="width:${en}%;background:${cor}"></i></span>
    <span class="rf-pp-f">${p.f}</span>
  </span>`;
}

/* BANCO — uma linha por reserva, agrupada por setor:
   camisa 30x28 com colete | nome + barra de energia | força.
   O colete (o retangulo da cor secundaria por cima do corpo) é o que
   diferencia, de relance, quem esta no banco de quem esta em campo. */
const RF_BANCO_GRUPOS = [['GK','GOLEIROS'],['DEF','DEFESA'],['MID','MEIO'],['ATT','ATAQUE']];
function rfBancoJerseyHTML(th, num){
  const c1=th.col||'#17458F', c2=th.col2||'#F2B90C';
  // O COLETE NÃO É COR DE CLUBE. Colete de verdade é uma peça avulsa, viva,
  // pra dar pra ver de longe quem está no banco — e é justamente isso que ele
  // faz aqui: com a secundaria do clube, Palmeiras daria verde sobre verde e o
  // colete sumia. Fica sempre o amarelo da marca, como na referencia.
  return `<span class="rf-bj" aria-hidden="true">
    <i class="rf-bj-sl l" style="background:${c2}"></i><i class="rf-bj-sl r" style="background:${c2}"></i>
    <i class="rf-bj-body" style="background:${c1}"></i>
    <i class="rf-bj-colete" style="box-shadow:inset 0 0 0 1px ${c1}"></i>
    <b class="rf-bj-n">${escC(String(num||''))}</b>
  </span>`;
}
function rfBancoHTML(th, nums){
  const xiSet=new Set(S.xi||[]);
  const banco=squad(CL.clubId).filter(p=>!xiSet.has(p.pid));
  const grupos = RF_BANCO_GRUPOS.map(([sec,rot])=>{
    const list=banco.filter(p=>p.s===sec).slice().sort((a,b)=>b.f-a.f);
    if(!list.length) return '';
    const linhas=list.map(p=>{
      const selc   = CL.selPlayer===p.pid;
      const unavail= p.suspended>0||p.injuredMatches>0;
      const en = Math.max(0, Math.min(100, Math.round(p.energy!=null?p.energy:100)));
      const cor = en>=70 ? 'var(--ok)' : en>=40 ? 'var(--warn)' : 'var(--danger)';
      const sobrenome = p.n.split(' ').slice(-1)[0]||p.n;
      return `<button type="button" class="rf-bp cl-bp ${selc?'sel':''} ${unavail?'unavail':''}"
        data-pid="${escC(p.pid)}" data-sec="${p.s}"
        onpointerdown="clDragStart(event,'${escC(p.pid)}')" onkeydown="if(event.key==='Enter'||event.key===' ')clSelPlayer('${escC(p.pid)}')"
        title="${escC(p.n)} — ${escC(SETOR_FORCA[p.s]||'')} · força ${p.f} · energia ${en}%${unavail?'':' · arraste pro campo pra escalar'}">
        ${rfBancoJerseyHTML(th, nums[p.pid])}
        <span class="rf-bp-mid">
          <span class="rf-bp-n">${escC(sobrenome)}${unavail?(p.suspended>0?' 🟥':' ✚'):''}</span>
          <span class="rf-bp-bar"><i style="width:${en}%;background:${cor}"></i></span>
        </span>
        <span class="rf-bp-f">${p.f}</span>
      </button>`;
    }).join('');
    return `<div class="rf-bgrupo"><span class="rf-bgrupo-t">${rot}</span>${linhas}</div>`;
  }).join('');
  /* SEM EXPANDIR/COLAPSAR. O banco vivia atrás de um botão que recolhia a lista
     para alargar o campo; com o campo em tamanho fixo isso deixou de valer, e o
     que sobrava era um clique a mais entre o treinador e os seus reservas — no
     telefone, ainda por cima, escondia a única forma de ver quem está no banco.
     O cabeçalho continua, mas como RÓTULO, não como interruptor. */
  return `<div class="cl-bench rf-banco">
    <div class="cl-bench-hd" role="presentation">
      <span class="cl-bench-hd-txt">SUPLENTES</span>
      <span class="cl-bench-hd-n">${banco.length}</span>
    </div>
    <div class="rf-banco-lista">${grupos||'<div class="cl-bench-vazio">—</div>'}</div>
  </div>`;
}

/* =====================================================================
   CAMPO EM TELA CHEIA — a "visão de teatro"
   ---------------------------------------------------------------------
   No cartão do Hub o gramado divide a largura com o resto da página: as
   camisas ficam pequenas, as placas de publicidade ficam menores ainda, e
   arrastar um jogador para o banco é mira fina. Aqui o campo ocupa quase o
   ecrã inteiro, o resto da página escurece e desfoca, e os dois botões que
   importam — entrar em campo e trocar de formação — ficam à vista.

   UM CAMPO DE CADA VEZ, e esta é a regra que faz tudo funcionar. O arraste
   procura os alvos por selector GLOBAL (`document.querySelectorAll('.cl-pp,
   .cl-bp')`, ver clDragStart em ui/main.js): com dois gramados no DOM haveria
   dois botões com o mesmo `data-pid` e a zona de solte apanharia o gramado
   errado. Por isso o cartão CEDE o campo enquanto o teatro está aberto, em
   vez de o duplicar.

   E vive dentro do desenho da página, não num overlay: `cdraw()` recria a tela
   inteira por innerHTML a cada troca de jogador, e um overlay montado à parte
   ficaria com o onze de antes.
   ===================================================================== */
/* ===== O PALCO NAO EXISTE NO TELEFONE =====
   Decisao do dono do jogo. E faz sentido: no telefone a pagina JA e o campo — o Hub tem abas e a
   aba Formacao mostra o gramado sozinho, sem coluna ao lado a disputar largura. O ganho que o
   palco da no desktop (o dobro da area, porque la o campo divide a tela com a lista) ali era de
   1,2x, e em troca vinha uma folha por cima da tela toda para fazer o que a tela ja fazia.
   A pergunta e feita por `isPhone()` (max-width:760px), a mesma que o resto do jogo usa — e e
   feita AQUI, no leitor do estado, para que redimensionar a janela para o tamanho de telefone
   feche o palco sozinho no desenho seguinte, sem ninguem ter de o vigiar. */
function rfCampoAmpliado(){
  if(typeof isPhone==='function' && isPhone()) return false;
  return !!(typeof CL!=='undefined' && CL.campoAmpliado);
}
/* o gramado deitado existe SÓ no palco: no cartão do Hub a leitura é a de sempre, em pé */
function rfCampoDeitado(){ return rfCampoAmpliado(); }
function rfCampoAmpliar(){
  if(typeof isPhone==='function' && isPhone()) return;
  CL.campoAmpliado=true;
  /* o banco tem de estar aberto: é para onde se arrasta quem sai, e é metade da razão de
     ampliar. Guarda-se o estado anterior para o devolver ao fechar. */
  CL._campoBancoAntes=CL.benchOpen;
  CL.benchOpen=true;
  cdraw();
}
function rfCampoFechar(){
  if(!CL.campoAmpliado) return;
  CL.campoAmpliado=false;
  if(CL._campoBancoAntes!==undefined){ CL.benchOpen=CL._campoBancoAntes; CL._campoBancoAntes=undefined; }
  cdraw();
}
function rfCampoTeatroHTML(){
  if(!rfCampoAmpliado()) return '';
  const xi=(typeof xiPlayers==='function')?xiPlayers(CL.clubId):[];
  const cl=(typeof clubOf==='function'&&clubOf(CL.clubId))||{short:'—'};
  const pronto=xi.length>=11 && CL.tacticChosen && (typeof xiGKCount==='function'?xiGKCount(xi)===1:true);
  return `<div class="rf-teatro" role="dialog" aria-modal="true" aria-label="Campo em tela cheia"
      onclick="if(event.target===this)rfCampoFechar()">
    <div class="rf-teatro-cx">
      <div class="rf-teatro-hd">
        <span class="rf-teatro-id">
          ${(typeof rfCrest==='function')?rfCrest(cl,26):''}
          <span class="rf-teatro-n">${escC(cl.short||'')}</span>
          <span class="rf-teatro-f">Tática ${escC(CL.formation||'—')} · onze ${xi.length}/11</span>
        </span>
        <div class="rf-sp"></div>
        <button type="button" class="rf-teatro-x" title="Fechar (Esc)" aria-label="Fechar"
          onclick="rfCampoFechar()">✕</button>
      </div>
      <div class="rf-teatro-campo">${(typeof pitchHTML==='function')?pitchHTML():''}</div>
      <div class="rf-teatro-pe">
        <span class="rf-teatro-dica">Arraste um titular para o banco para o substituir.</span>
        <button type="button" class="rf-btn rf-btn-secondary" onclick="rfCampoFechar();rfIrEscolherTatica()">
          ${rfIcone('estrategia',16)} Escolher formação</button>
        <button type="button" class="rf-btn rf-btn-primary rf-teatro-jogar ${(typeof rfJogarClasse==='function')?rfJogarClasse():''} ${pronto?'rf-btn-pulse':''}"
          onclick="rfCampoJogar()">${rfJogarLabel()}</button>
      </div>
    </div>
  </div>`;
}
/* Esc fecha — o mesmo caminho dos modais do jogo, e sem apanhar o overlay deles (este layer não
   é o #c-overlay; a tecla só age quando não há modal aberto por cima). */
document.addEventListener('keydown', e=>{
  if(e.key!=='Escape' || !rfCampoAmpliado()) return;
  const o=document.querySelector('#c-overlay');
  if(o && o.style.display!=='none' && o.innerHTML) return;   // há modal por cima: é dele a tecla
  rfCampoFechar();
});

/* ===== DAQUI VAI-SE DIRETO PARA O JOGO =====
   O botão fazia `rfCampoFechar()` e só depois a ação — e fechar chama `cdraw()`, ou seja, a tela
   era redesenhada uma vez só para ser substituída a seguir pela partida. Aqui a bandeira baixa
   sem redesenho e a ação segue: quem entra em campo vê a partida, não o Hub a piscar pelo meio.
   E baixar a bandeira é preciso: sem isso, ao voltar da partida o jogador caía outra vez no palco
   em tela cheia, que não é onde ele estava. */
function rfCampoJogar(){
  CL.campoAmpliado=false;
  if(CL._campoBancoAntes!==undefined){ CL.benchOpen=CL._campoBancoAntes; CL._campoBancoAntes=undefined; }
  if(typeof rfProximaAcao==='function' && rfProximaAcao().k==='tatica'){
    if(typeof rfIrEscolherTatica==='function') rfIrEscolherTatica();
    return;
  }
  if(typeof rfJogar==='function') rfJogar(); else if(typeof clJogar==='function') clJogar();
}
