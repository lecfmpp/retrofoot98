/* =====================================================================
   RetroFoot — FORMAÇÃO: os dois blocos que faltavam
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
  /* a foto entra GRANDE aqui: é um cartão de destaque, não uma tabela — e o
     nome/foto levam ao perfil do jogador, como no resto do jogo */
  const linha=(rot,nome,sub,valor,p)=>{
    const foto=(p&&typeof rfFotoDe==='function')?rfFotoDe(p, CL.clubId):null;
    const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};
    const retrato=(foto&&typeof rfFotoNumHTML==='function')
      ? `<span class="rf-nota-foto">${rfFotoNumHTML(foto, (p&&(nums[p.pid]||p.num))||'', 'nota')}</span>` : '';
    const nomeHTML=(p&&typeof rfLinkJogador==='function') ? rfLinkJogador(p.n, CL.clubId, escC(nome)) : escC(nome);
    return `<div class="rf-nota${foto?' com-foto':''}">
      ${retrato}
      <div class="rf-nota-id">
        <span class="rf-nota-r">${escC(rot)}</span>
        <span class="rf-nota-n">${nomeHTML}</span>
        <span class="rf-nota-s">${escC(sub)}</span>
      </div>
      <span class="rf-nota-v">${escC(String(valor))}</span>
    </div>`;
  };
  const jogos=(S.round||0);
  const assist=(artilheiro&&artilheiro.stats&&artilheiro.stats.assists)||0;
  return `<div class="rf-card rf-notas">
    ${gols
      ? linha((typeof RF_GENERO!=='undefined'?RF_GENERO:{t:x=>x}).t('Artilheiro')+' do clube', artilheiro.n,
          'gols em '+jogos+(jogos===1?' jogo':' jogos')+(assist?' · '+assist+' assistências':''), gols, artilheiro)
      : linha((typeof RF_GENERO!=='undefined'?RF_GENERO:{t:x=>x}).t('Artilheiro')+' do clube','—','ninguém marcou ainda','0')}
    ${destaque
      ? linha('Destaque da semana', destaque.n, 'nota do último jogo',
          String(notaDe(destaque)).replace('.',','), destaque)
      : linha('Destaque da semana','—','a primeira semana ainda não foi jogada','—')}
    ${baixa
      ? linha('Em baixa', baixa.n,
          (baixa.injuredMatches>0?(typeof RF_GENERO!=='undefined'?RF_GENERO:{t:x=>x}).t('lesionado'):baixa.suspended>0?(typeof RF_GENERO!=='undefined'?RF_GENERO:{t:x=>x}).t('suspenso'):'energia baixa'),
          Math.round(baixa.energy!=null?baixa.energy:100)+'%', baixa)
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
      <span class="rf-adv-livre">O seu clube não entra em campo nesta semana.</span>
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
        <span class="rf-adv-sub">${nm.home?'CASA':'FORA'} · ${escC(nm.comp||divisionLabel())} · ${escC(nm.fase||(((S.round||0)+1)+'ª Semana'))}</span>
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

/* =====================================================================
   FORÇA EM CÍRCULO, ENERGIA COM O VALOR DENTRO
   (pacote "banco de reservas (desktop e mobile)", 08/09)
   ---------------------------------------------------------------------
   A força deixou de ser barra e de ser número solto: é um número dentro
   de um círculo colorido por nível, do mesmo tamanho em qualquer lugar da
   tela — na manga direita da camisa em campo, na ponta do cartão no banco.
   Cinco níveis, escolhidos para se ler de relance quem é quem:
     1–20 branco · 21–30 azul · 31–50 bronze · 51–70 prateado · 71+ dourado
   A energia continua na escala canônica do jogo (rfEnergiaCor, limites
   80/70/55/40); o que muda é ONDE o número aparece: dentro da pílula, e
   não ao lado dela. A tinta do número segue o nível, para manter contraste
   sobre as cinco cores (ver .rf-en-pil no CSS).
   ===================================================================== */
function rfForcaNivel(f){ f=+f||0; return f<=20?'n1':f<=30?'n2':f<=50?'n3':f<=70?'n4':'n5'; }
function rfForcaCirculoHTML(f, cls){
  f=Math.round(+f||0);
  return `<span class="rf-forca-c ${rfForcaNivel(f)}${f>=100?' tres':''} ${cls||''}" aria-label="força ${f}">${f}</span>`;
}
function rfEnergiaNivel(en){ return en>=80?'e100':en>=70?'e80':en>=55?'e60':en>=40?'e40':'e20'; }
function rfEnergiaPilulaHTML(en, cls){
  en=Math.max(0, Math.min(100, Math.round(en!=null?en:100)));
  return `<span class="rf-en-pil ${rfEnergiaNivel(en)} ${cls||''}" aria-label="energia ${en}%">
    <i style="width:${en}%"></i><b>${en}</b></span>`;
}
/* A legenda dos níveis, debaixo do campo (só no desktop, o CSS esconde no resto). No
   telefone a escala vive dentro dos botões de ordenação, que é onde cabe. */
function rfForcaLegendaHTML(){
  const niv=[['n1',14,'1–20'],['n2',26,'21–30'],['n3',44,'31–50'],['n4',63,'51–70'],['n5',88,'71–100']];
  return `<div class="rf-banco-legenda" aria-hidden="true">
    <span class="rf-banco-legenda-l">FORÇA</span>
    ${niv.map(([n,ex,r])=>`<span class="rf-banco-legenda-i"><span class="rf-forca-c ${n} peq">${ex}</span><span>${r}</span></span>`).join('')}
    <span class="rf-banco-legenda-i"><span class="rf-banco-legenda-l">ENERGIA</span>
      <span class="rf-en-sw" style="background:var(--energy-20)"></span><span class="rf-en-sw" style="background:var(--energy-40)"></span>
      <span class="rf-en-sw" style="background:var(--energy-60)"></span><span class="rf-en-sw" style="background:var(--energy-80)"></span>
      <span class="rf-en-sw" style="background:var(--energy-100)"></span></span>
  </div>`;
}

/* A camisa em campo ganha o círculo da força na manga direita. A camisa em si continua a
   ser a de sempre (shirtHTML, main.js) — o invólucro só existe para dar ao círculo um
   ponto de referência do tamanho exato da camisa. */
function rfPitchCamisaHTML(p, th, num){
  return `<span class="rf-pp-camisa">${shirtHTML(p,th,num)}${rfForcaCirculoHTML(p.f,'rf-pp-fc')}</span>`;
}
/* Debaixo do nome só a energia, com o valor dentro. A letra da posição e o número da
   força saíram desta linha: a força já está na manga, e a posição é o lugar no campo. */
function rfPitchMetaHTML(p){
  return `<span class="rf-pp-meta">${rfEnergiaPilulaHTML(p.energy,'rf-pp-en')}</span>`;
}

/* =====================================================================
   BANCO — o mesmo DOM em três modos, quem muda é o CSS
   ---------------------------------------------------------------------
   · desktop (cartão da tática): FAIXA DOCADA debaixo do campo, dentro do
     mesmo cartão. Cabeçalho com BANCO + contagem + filtros de posição;
     cartões do tamanho do conteúdo que se reorganizam em linhas; a faixa
     rola por dentro (~3 linhas), a página nunca.
   · palco (campo em tela cheia): TRILHO LATERAL de 236px à direita do
     campo, filtro de posição no topo, uma linha por jogador.
   · telefone: banco ancorado no pé do cartão, uma aba por posição (44px),
     TRILHO HORIZONTAL com setas de 44px mostrando dois cartões de 126px
     por vez, indicador "1–2 de N" e pontinhos de página.

   SUBSTITUIR É TOCAR EM DOIS. Tocar num titular (no campo) marca-o e o
   banco entra no estado de troca: a faixa diz quem sai, a aba da posição
   dele é selecionada, cada candidato mostra a diferença de força, e um
   toque conclui. A marca é a mesma da lista do elenco (CL.subA /
   rfSubToque, rf26.js) — não há uma segunda regra de troca: tudo desemboca
   em clTrocarPorPid, onde vivem as travas e o "Desfazer".

   ESTADO que sobrevive ao cdraw(): CL.bancoTab ('all' ou setor),
   CL.bancoPag (página do trilho), CL.bancoOrd ('f' força, 'en' energia).
   ===================================================================== */
function rfBancoGrupos(){ return [['GK',(typeof RF_GENERO!=='undefined'?RF_GENERO:{t:x=>x}).t('Goleiros').toUpperCase()],['DEF','DEFESA'],['MID','MEIO'],['ATT','ATAQUE']]; }
/* rótulos curtos das abas/pílulas — os do próprio jogo (G/D/M/A), abertos a três letras.
   Neutros de gênero de propósito: no feminino o grupo chama-se "Goleiras" e a sigla serve. */
const RF_BANCO_CURTO={ GK:'GOL', DEF:'DEF', MID:'MEI', ATT:'ATA' };
const RF_BANCO_SETOR={ GK:'gol', DEF:'defesa', MID:'meio', ATT:'ataque' };
const RF_BANCO_POR_PAG=2;   /* cartões por página no trilho do telefone */

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
function rfBancoFiltrar(sec){ CL.bancoTab=sec; CL.bancoPag=0; cdraw(); }
function rfBancoPag(passo){ CL.bancoPag=Math.max(0,(CL.bancoPag||0)+passo); cdraw(); }
function rfBancoOrdenar(k){ CL.bancoOrd=k; CL.bancoPag=0; cdraw(); }
function rfBancoIrElenco(){
  if(typeof rfCampoFechar==='function') rfCampoFechar();
  if(typeof rfNavegar==='function') rfNavegar('elenco'); else if(typeof rfGo==='function') rfGo('elenco');
}
/* O TOQUE (sem arraste) num jogador do campo ou do banco. Passa pela mesma marca da lista
   (rfSubToque); o que este invólucro acrescenta é levar o banco à posição de quem vai
   sair, para os candidatos aparecerem sem mais um toque. */
function rfBancoToque(pid){
  const p=pById(pid,CL.clubId);
  if(!p || typeof rfSubToque!=='function' || typeof rfSubPode!=='function' || !rfSubPode()){ clSelPlayer(pid); return; }
  const xi=new Set(S.xi||[]);
  const marcado=CL.subA;
  const vaiMarcar = !marcado || (marcado!==pid && !rfSubAlvo(pById(marcado,CL.clubId), p));
  if(vaiMarcar && xi.has(pid)){ CL.bancoTab=p.s; CL.bancoPag=0; }
  rfSubToque(pid);
}
function rfBancoHTML(th, nums){
  const xiSet=new Set(S.xi||[]);
  const banco=squad(CL.clubId).filter(p=>!xiSet.has(p.pid));
  const enDe=p=>Math.max(0,Math.min(100,Math.round(p.energy!=null?p.energy:100)));
  const ord=CL.bancoOrd==='en'?'en':'f';
  const ordenar=l=>l.slice().sort((a,b)=>ord==='en'?(enDe(b)-enDe(a))||(b.f-a.f):(b.f-a.f)||(enDe(b)-enDe(a)));
  const grupos=rfBancoGrupos();
  const contagem={}; grupos.forEach(([sec])=>{ contagem[sec]=banco.filter(p=>p.s===sec).length; });

  /* quem está marcado para trocar (a mesma marca da lista do elenco) */
  const pode=(typeof rfSubPode==='function')&&rfSubPode();
  const pMarcado=(pode&&CL.subA)?pById(CL.subA,CL.clubId):null;
  const saiTitular=!!(pMarcado&&xiSet.has(pMarcado.pid));

  /* filtro: 'all' ou um setor com gente; um setor vazio cai em 'all' */
  let aba=CL.bancoTab||'all';
  if(aba!=='all' && !contagem[aba]) aba='all';
  const lista=ordenar(aba==='all'?banco:banco.filter(p=>p.s===aba));

  /* páginas do trilho do telefone (o desktop ignora, ver CSS) */
  const pags=Math.max(1,Math.ceil(lista.length/RF_BANCO_POR_PAG));
  const pag=Math.min(Math.max(0,CL.bancoPag||0),pags-1);
  CL.bancoPag=pag;
  const ini=pag*RF_BANCO_POR_PAG, fim=Math.min(lista.length,ini+RF_BANCO_POR_PAG);

  const cartoes=lista.map(p=>{
    const selc   = CL.selPlayer===p.pid;
    const unavail= p.suspended>0||p.injuredMatches>0;
    const en=enDe(p);
    const sobrenome=p.n.split(' ').slice(-1)[0]||p.n;
    const marcado = !!pMarcado && pMarcado.pid===p.pid;
    const alvo    = !!pMarcado && !marcado && rfSubAlvo(pMarcado,p);
    const fora    = !!pMarcado && !marcado && !alvo;
    /* a diferença de força só faz sentido contra um titular que vai sair */
    const d = (alvo && saiTitular) ? (p.f-pMarcado.f) : null;
    const delta = d==null ? '' : `<span class="rf-bp-delta ${d>=0?'pos':'neg'}">${d>0?'+':''}${d}</span>`;
    const dica = marcado ? ' — marcado para trocar (toque de novo para largar)'
               : alvo ? ' — toque para trocar com '+pMarcado.n.split(' ').slice(-1)[0]
               : unavail ? '' : ' — toque para marcar, ou arraste pro campo';
    return `<button type="button" class="rf-bp cl-bp ${selc?'sel':''} ${unavail?'unavail':''}${marcado?' trocar-mk':''}${alvo?' trocar-alvo':''}${fora?' trocar-fora':''}"
      data-pid="${escC(p.pid)}" data-sec="${p.s}"
      onpointerdown="clDragStart(event,'${escC(p.pid)}')" onkeydown="if(event.key==='Enter'||event.key===' ')rfBancoToque('${escC(p.pid)}')"
      title="${escC(p.n)} — ${escC(SETOR_FORCA[p.s]||'')} · força ${p.f} · energia ${en}%${escC(dica)}">
      <span class="rf-bp-l1">
        ${rfBancoJerseyHTML(th, nums[p.pid])}
        <span class="rf-bp-n"><span class="rf-bp-link" role="link" tabindex="0"
          title="Ver a ficha de ${escC(p.n)}"
          onpointerdown="event.stopPropagation()"
          onclick="event.stopPropagation();rfSelPlayer('${escC(p.pid)}')"
          onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();rfSelPlayer('${escC(p.pid)}')}"
          >${escC(sobrenome)}</span>${unavail?(p.suspended>0?' 🟥':' ✚'):''}</span>
      </span>
      <span class="rf-bp-l2">
        ${rfEnergiaPilulaHTML(en,'rf-bp-en')}
        <span class="rf-bp-fim">${delta}${rfForcaCirculoHTML(p.f,'rf-bp-fc')}</span>
      </span>
    </button>`;
  }).join('');

  /* filtros de posição: pílulas no desktop, abas de 44px no telefone (mesmo DOM). Uma aba
     sem ninguém fica desativada — aba vazia é uma promessa de que há alguém ali. */
  const filtros=`<div class="rf-banco-filtros" role="tablist">
    <button type="button" class="rf-banco-aba ${aba==='all'?'on':''}" role="tab" aria-selected="${aba==='all'}"
      onclick="rfBancoFiltrar('all')">TODOS</button>
    ${grupos.map(([sec,rot])=>{
      const n=contagem[sec];
      return `<button type="button" class="rf-banco-aba ${sec===aba?'on':''}" role="tab" aria-selected="${sec===aba}"
        ${n?'':'disabled'} title="${escC(rot)} — ${n} no banco" onclick="rfBancoFiltrar('${sec}')"
        >${RF_BANCO_CURTO[sec]}<span class="rf-banco-aba-n">${n}</span></button>`;
    }).join('')}
  </div>`;

  /* a faixa da troca: quem sai (titular marcado) ou quem entra (reserva marcado primeiro) */
  let faixa='';
  if(pMarcado){
    const thSai=saiTitular?Object.assign({},th,{col:'#d1541f'}):th;
    const candidatos=banco.filter(q=>rfSubAlvo(pMarcado,q)).length;
    const titulares=xiPlayers(CL.clubId).filter(q=>rfSubAlvo(pMarcado,q)).length;
    const sub = saiTitular
      ? `${RF_BANCO_SETOR[pMarcado.s]||''} · força ${pMarcado.f} · energia ${enDe(pMarcado)}${candidatos?'':' · ninguém do banco pode entrar'}`
      : `${RF_BANCO_SETOR[pMarcado.s]||''} · força ${pMarcado.f} · ${titulares?'toque no titular que sai':'ninguém em campo pode sair por ele'}`;
    faixa=`<div class="rf-banco-sai ${saiTitular?'':'entra'}">
      ${rfBancoJerseyHTML(thSai, nums[pMarcado.pid])}
      <span class="rf-banco-sai-id">
        <span class="rf-banco-sai-n">${saiTitular?'Sai':'Entra'} ${escC(pMarcado.n.split(' ').slice(-1)[0]||pMarcado.n)}</span>
        <span class="rf-banco-sai-s">${escC(sub)}</span>
      </span>
      <button type="button" class="rf-banco-sai-x" aria-label="Cancelar a substituição" title="Cancelar"
        onclick="event.stopPropagation();rfSubCancelar()">✕</button>
    </div>`;
  }

  const rotAba = aba==='all' ? '' : (grupos.find(g=>g[0]===aba)||[])[1];
  const indicador = lista.length
    ? `${rotAba?rotAba.toLowerCase()+' · ':''}${ini+1}–${fim} de ${lista.length}`
    : (aba==='all'?'banco vazio':'ninguém nesta posição');
  const pontos = pags>1 ? `<span class="rf-banco-pts" aria-hidden="true">${
      Array.from({length:pags},(_,i)=>`<i class="${i===pag?'on':''}"></i>`).join('')}</span>` : '';

  return `<div class="cl-bench rf-banco ${pMarcado?'em-troca':''}" style="--pag:${pag}">
    ${rfForcaLegendaHTML()}
    <div class="rf-banco-hd">
      <span class="rf-banco-l">BANCO</span>
      <span class="rf-banco-n">${banco.length}</span>
      <span class="rf-banco-dica">${pMarcado?(saiTitular?'toque em quem entra':'toque em quem sai'):'toque num titular pra trocar'}</span>
      ${filtros}
    </div>
    ${faixa}
    <div class="rf-banco-pista">
      <button type="button" class="rf-banco-seta ${pag<=0?'off':''}" aria-label="Página anterior"
        ${pag<=0?'disabled':''} onclick="rfBancoPag(-1)">‹</button>
      <div class="rf-banco-vp"><div class="rf-banco-lista">${cartoes||'<div class="cl-bench-vazio">—</div>'}</div></div>
      <button type="button" class="rf-banco-seta ${pag>=pags-1?'off':''}" aria-label="Próxima página"
        ${pag>=pags-1?'disabled':''} onclick="rfBancoPag(1)">›</button>
    </div>
    <div class="rf-banco-pe">
      <span class="rf-banco-ind">${escC(indicador)}</span>
      ${pontos}
    </div>
    <div class="rf-banco-ord">
      <span class="rf-banco-ord-l">ORDENAR</span>
      <button type="button" class="rf-banco-ord-b ${ord==='f'?'on':''}" onclick="rfBancoOrdenar('f')">
        <span>FORÇA ↓</span>
        <span class="rf-banco-ord-esc"><i class="rf-forca-c n1"></i><i class="rf-forca-c n2"></i><i class="rf-forca-c n3"></i><i class="rf-forca-c n4"></i><i class="rf-forca-c n5"></i></span>
      </button>
      <button type="button" class="rf-banco-ord-b ${ord==='en'?'on':''}" onclick="rfBancoOrdenar('en')">
        <span>ENERGIA${ord==='en'?' ↓':''}</span>
        <span class="rf-banco-ord-esc"><i style="background:var(--energy-20)"></i><i style="background:var(--energy-40)"></i><i style="background:var(--energy-60)"></i><i style="background:var(--energy-80)"></i><i style="background:var(--energy-100)"></i></span>
      </button>
    </div>
    <button type="button" class="rf-banco-elenco" onclick="rfBancoIrElenco()">Ver elenco inteiro…</button>
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
