/* =====================================================================
   RetroFoot98 — TREINADOR, as seis abas completas
   Marcação de telas-v3/Treinador - Abas.dc.html, coluna por coluna.

   Carreira · História · Sala de Troféus · Ranking · Ofertas · Perfil.

   As seis abas empilham cartões de LARGURA CHEIA — nenhuma usa a grade de
   duas colunas da página. Onde há peças lado a lado (os números da carreira,
   as marcas pessoais, os cinco troféus, os campos do perfil), a grade é
   INTERNA ao cartão.

   A linha de tabela é a mesma peça do Elenco e de Campeonatos
   (.rf-el-head/.rf-el-row, grade vinda de --el-cols), e o bloco de número
   grande é o mesmo rfElStat. Uma peça só, repetida — é isso que faz navegar
   entre páginas parecer a mesma casa.

   A SALA DE TROFÉUS mostra os troféus do save COM A ARTE REAL, apagados
   quando não conquistados: é o único jeito de a sala dizer alguma coisa
   antes do primeiro título.
   ===================================================================== */

/* =====================================================================
   1 · CARREIRA
   ===================================================================== */
function rfTrCabecalhoHTML(){
  const cl=clubOf(CL.clubId)||{short:'—'};
  const nome=rfTreinadorNome();
  const temps=(S.coachHistory||[]).length || 1;
  const rep=Math.round(S.coachRep!=null?S.coachRep:50);
  const estrelas=Math.max(1,Math.min(5,Math.round(rep/20)));
  const desde=(S.coachClubSince!=null)?S.coachClubSince:(S.season||'');
  return `<div class="rf-card rf-tr-hd">
    <span class="rf-tr-av">${escC(nome.slice(0,1).toUpperCase())}</span>
    <div class="rf-tr-id">
      <span class="rf-tr-n">${escC(nome)}</span>
      <span class="rf-tr-s">${(typeof universeFlag==='function')?universeFlag():''} ${escC((typeof universeCountryName==='function')?universeCountryName():'')} · ${temps}ª temporada como treinador · ${escC(cl.short)} desde ${escC(String(desde))}</span>
    </div>
    <div class="rf-sp"></div>
    <span class="rf-tr-rep">REPUTAÇÃO ${estrelas} DE 5</span>
  </div>`;
}
const RF_TR_CLUBES_COLS='22px minmax(0,1.2fr) minmax(0,1fr) 92px 62px 74px';
function rfTrCarreiraHTML(){
  if(typeof migrateCoachCareerStats==='function'){ try{ migrateCoachCareerStats(); }catch(e){} }
  const car=(S.coachCareerStats&&S.coachCareerStats[CL.clubId])||{};
  const t=(S.table&&S.table[CL.clubId])||{P:0,W:0,D:0,L:0,Pts:0,GF:0,GA:0};
  const jogos=(car.games||0)+(t.P||0);
  const vit=(car.wins||0)+(t.W||0);
  const emp=(car.draws||0)+(t.D||0);
  const der=(car.losses||0)+(t.L||0);
  const gp=(car.gf||0)+(t.GF||0), gc=(car.ga||0)+(t.GA||0);
  const aprov=jogos?Math.round(((car.pts||0)+(t.Pts||0))/(jogos*3)*100):0;
  const pct=n=>jogos?Math.round(n/jogos*100)+'%':'';
  const seg=(S.jobSecurity!=null)?S.jobSecurity:60;
  /* ===== CADA PASSAGEM, INCLUSIVE A QUE ACABOU A MEIO DA TEMPORADA =====
     Isto lia S.history, que so e escrito no FIM da temporada e com o clube em que o treinador
     estava naquele instante: sair do Fluminense para o Flamengo em maio nao deixava rasto nenhum
     — o Fluminense simplesmente nao existia nesta lista. Agora a fonte e S.coachSpells, escrito
     QUANDO a coisa acontece (ver coachSpellAbrir/Fechar no core). */
  if(typeof coachSpellsMigrar==='function'){ try{ coachSpellsMigrar(); }catch(e){} }
  const spells=((S&&S.coachSpells)||[]).slice().reverse();
  const linhas=spells.map(sp=>{
    const c=anyClubOf(sp.clubId)||{short:sp.curto||sp.clubId};
    const aberta=!sp.fim;
    /* passagem aberta: o total ja fechado mais o que corre desde a marca */
    const m=sp.marca||{}, ag=aberta?((S.table&&S.table[sp.clubId])||{}):{};
    const j=(sp.tot&&sp.tot.P||0)+(aberta?Math.max(0,(ag.P||0)-(m.P||0)):0);
    const p=(sp.tot&&sp.tot.Pts||0)+(aberta?Math.max(0,(ag.Pts||0)-(m.Pts||0)):0);
    const de=(sp.inicio&&sp.inicio.season)||'—';
    const ate=aberta?'hoje':((sp.fim&&sp.fim.season)||'—');
    const tit=(sp.titulos||[]).length;
    return `<div class="rf-el-row ${aberta?'sel':''}">
      ${rfCrest(c,20)}
      <span class="rf-tr-clube">${escC(c.short||c.name||'—')}${tit?' <b class="rf-tr-tit">'+tit+'🏆</b>':''}</span>
      <span class="rf-tr-periodo">${escC(String(de))} — ${escC(String(ate))}</span>
      <span class="rf-tr-num">${j||'—'}</span>
      <span class="rf-tr-num forte">${j?Math.round(p/(j*3)*100)+'%':'—'}</span>
      <span class="rf-tr-desf">${aberta?'em curso':escC(sp.desfecho==='demitido'?'demitido':'encerrado')}</span>
    </div>`;
  }).join('');
  const clubes=spells;
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_TR_CLUBES_COLS}">
    <span></span><span>CLUBE</span><span>PERÍODO</span>
    <span class="dir">JOGOS</span><span class="dir">APROV.</span><span class="dir">DESFECHO</span>
  </div>`;
  const humor = seg>=70 ? 'A diretoria está tranquila com a campanha'
    : seg>=40 ? 'A diretoria está satisfeita com a campanha'
    : 'A diretoria já perdeu a paciência com a campanha';
  return rfTrCabecalhoHTML() + `
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">NÚMEROS DA CARREIRA</span></div>
      <div class="rf-el-stats">
        ${rfElStat('JOGOS', jogos)}
        ${rfElStat('VITÓRIAS', vit, pct(vit))}
        ${rfElStat('EMPATES', emp, pct(emp))}
        ${rfElStat('DERROTAS', der, pct(der))}
      </div>
      <div class="rf-el-stats">
        ${rfElStat('GOLS PRÓ', gp)}
        ${rfElStat('GOLS CONTRA', gc)}
        ${rfElStat('APROVEITAMENTO', aprov+'%')}
        ${rfElStat('TÍTULOS', rfTitulosDoTreinador().length)}
      </div>
    </div>
    <div class="rf-card rf-el-tbl" style="--el-cols:${RF_TR_CLUBES_COLS}">
      <div class="rf-label"><span class="rf-label-t">CLUBES TREINADOS</span>
        <span class="rf-label-r">${clubes.length}</span></div>
      ${cab}
      ${linhas}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">SEGURANÇA NO CARGO</span></div>
      <div class="rf-tr-seg">
        <div class="rf-tr-seg-top">
          <span class="rf-tr-seg-t">${escC(humor)}</span>
          <span class="rf-tr-seg-v">${seg}%</span>
        </div>
        <div class="rf-tr-seg-trilho"><i style="width:${seg}%;background:${
          seg>=70?'var(--ok)':seg>=40?'var(--club-secondary)':'var(--danger)'}"></i></div>
        <span class="rf-tr-seg-n">A conta é 70% posição na tabela e 30% moral do elenco. Ela move devagar: uma rodada ruim não derruba.</span>
      </div>
    </div>`;
}

/* =====================================================================
   2 · HISTÓRIA — linha do tempo + marcas pessoais
   ===================================================================== */
function rfTrHistoriaHTML(){
  /* ===== A LINHA DO TEMPO SEGUE AS PASSAGENS, NAO SO O CLUBE DE AGORA =====
     Isto filtrava S.history por `clubId===CL.clubId`: o clube anterior desaparecia da historia
     assim que o treinador saia, e uma passagem terminada a meio da temporada nunca chegava a
     entrar (S.history so e escrito no fecho). Agora a espinha e S.coachSpells — cada passagem
     rende as temporadas que ela cobre, e a que ainda corre aparece como "em curso". */
  if(typeof coachSpellsMigrar==='function'){ try{ coachSpellsMigrar(); }catch(e){} }
  const hist=(S.history||[]);
  const spells=((S&&S.coachSpells)||[]).slice();
  const todas=[];
  spells.forEach(sp=>{
    const de=(sp.inicio&&sp.inicio.season)||S.season, ate=sp.fim?((sp.fim.season)||de):(S.season||de);
    const fechadas=hist.filter(x=>String(x.clubId)===String(sp.clubId)
      && x.season>=de && x.season<=ate);
    fechadas.forEach(x=>todas.push(Object.assign({},x,{titulos:sp.titulos})));
    /* a temporada corrente so entra se ainda nao houver o registo fechado dela — senao apareciam
       duas linhas do mesmo ano, uma "em curso" e a fechada logo abaixo */
    const aberta=!sp.fim;
    const jaFechada=fechadas.some(x=>String(x.season)===String(S.season));
    if(aberta && !jaFechada) todas.push({season:S.season, clubId:sp.clubId, division:S.division,
      myPos:rfMinhaPosicao(), emCurso:true, titulos:sp.titulos});
    /* passagem fechada sem temporada registada (saiu no meio do ano): a linha existe do mesmo
       jeito, dizendo o periodo — e o caso que nao aparecia em lado nenhum */
    if(!aberta && !fechadas.length) todas.push({season:de, clubId:sp.clubId, division:sp.divisao||S.division,
      myPos:null, parcial:true, titulos:sp.titulos});
  });
  todas.reverse();
  const h=hist.filter(x=>String(x.clubId)===String(CL.clubId)).slice().reverse();
  const linha=todas.map((e,i)=>{
    const c=anyClubOf(e.clubId)||{short:'—'};
    const titulo=e.myPos===1;
    return `<div class="rf-tl">
      <span class="rf-tl-ano ${i===0?'agora':''}">${escC(String(e.season||''))}</span>
      <span class="rf-tl-p ${titulo?'ouro':(i===0?'agora':'')}"></span>
      <div class="rf-tl-id">
        <span class="rf-tl-t">${escC(c.short)} · ${escC((typeof divisionLabelOf==='function')?divisionLabelOf(e.division):('Série '+e.division))}</span>
        <!-- "no grupo" era heranca do desenho: uma liga de pontos corridos nao tem grupo. -->
        <span class="rf-tl-s">${e.myPos?(e.myPos+'º'+(e.emCurso?'':' na tabela')):(e.parcial?'passagem encerrada durante a temporada':'—')}${e.emCurso?' · em curso':''}</span>
        <span class="rf-tl-c">${escC(e.emCurso?'—':rfCpDesfecho(e))}</span>
      </div>
    </div>`;
  }).join('');
  /* MARCAS PESSOAIS: maior vitória e maior derrota saem dos resultados do
     save; sequência e melhor campanha, do histórico. Onde não há jogo ainda,
     entra traço — o bloco existe do mesmo jeito. */
  const meus=(S.results||[]).filter(r=>r.h===CL.clubId||r.a===CL.clubId).map(r=>{
    const casa=r.h===CL.clubId;
    return {gm:casa?r.hg:r.ag, gc:casa?r.ag:r.hg, adv:anyClubOf(casa?r.a:r.h)||{short:'—'}};
  });
  const maiorV=meus.filter(x=>x.gm>x.gc).sort((a,b)=>(b.gm-b.gc)-(a.gm-a.gc))[0];
  const maiorD=meus.filter(x=>x.gm<x.gc).sort((a,b)=>(a.gm-a.gc)-(b.gm-b.gc))[0];
  let seq=0, melhor=0;
  meus.forEach(x=>{ if(x.gm>=x.gc){ seq++; melhor=Math.max(melhor,seq); } else seq=0; });
  const camp=h.slice().sort((a,b)=>(a.myPos||99)-(b.myPos||99))[0];
  return `<div class="rf-card rf-tr-tl">
      <div class="rf-label"><span class="rf-label-t">LINHA DO TEMPO</span>
        <span class="rf-label-r">${todas.length} ${todas.length===1?'temporada':'temporadas'}</span></div>
      ${linha}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">MARCAS PESSOAIS</span></div>
      <div class="rf-el-stats">
        ${rfElStat('MAIOR VITÓRIA', maiorV?(maiorV.gm+'–'+maiorV.gc):'—',
          maiorV?('vs '+maiorV.adv.short+', '+(S.season||'')):'ainda sem vitória')}
        ${rfElStat('MAIOR DERROTA', maiorD?(maiorD.gm+'–'+maiorD.gc):'—',
          maiorD?('vs '+maiorD.adv.short+', '+(S.season||'')):'ainda sem derrota')}
        ${rfElStat('MAIOR SEQUÊNCIA', melhor?(melhor+' jogo'+(melhor>1?'s':'')):'—',
          melhor?('sem perder, '+(S.season||'')):'—')}
        ${rfElStat('MELHOR CAMPANHA', camp?(camp.myPos+'º'):'—', camp?String(camp.season):'primeira em curso')}
      </div>
    </div>`;
}

/* =====================================================================
   3 · SALA DE TROFÉUS — os cinco ladrilhos, apagados quando não conquistados
   ===================================================================== */
/* ===== A ESTANTE MOSTRA QUANTAS, NAO SO SE =====
   O ladrilho dizia apenas "conquistado" — cinco titulos da Serie A e um so ficavam iguais. Agora
   a taca aparece repetida (a do meio maior, as das pontas menores) e a contagem vem num selo.
   A arte vem dos .webp de public/img/trofeus, que tem alfa: o `trophyImg` de data/trophies.js e
   achatado e trazia o retangulo preto atras de cada taca. */
function rfTrPilhaHTML(k, n){
  const chave=/^serie[A-D]$/.test(k)?k.replace('serie',''):k;
  const info=(typeof rfCompInfo==='function')?rfCompInfo(chave):null;
  const taca=(sz)=>(info&&info.trofeu&&typeof rfCompTrofeuHTML==='function')
    ? rfCompTrofeuHTML(info,sz)
    : rfTrofeuHTML(k,sz);
  if(!n) return `<span class="rf-tr-pilha vazia">${taca(52)}</span>`;
  if(n===1) return `<span class="rf-tr-pilha">${taca(60)}</span>`;
  /* tres posicoes no maximo: a do meio grande, uma em cada ponta menor. Acima de tres, quem
     conta e o selo — empilhar sete tacas de 20px nao diz mais do que "7x". */
  return `<span class="rf-tr-pilha">
    <i class="rf-tr-lado">${taca(40)}</i>
    <i class="rf-tr-meio">${taca(62)}</i>
    <i class="rf-tr-lado">${taca(40)}</i>
  </span>`;
}
function rfTrTrofeusHTML(){
  const meus=rfTitulosDoTreinador();
  /* CONTA, nao so verifica: cada titulo daquela competicao soma um */
  const quantos=k=>meus.filter(t=>String(t.comp||'')===String(k)).length;
  const lista=[];
  ((typeof DIV_ORDER!=='undefined')?DIV_ORDER:['A','B','C','D']).slice().reverse().forEach(d=>{
    lista.push({ k:'serie'+d, nome:(typeof divisionLabelOf==='function')?divisionLabelOf(d):('Série '+d),
      n:quantos('serie'+d) });
  });
  ((typeof allCupKeys==='function')?allCupKeys():[]).forEach(k=>{
    const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    lista.push({ k, nome:def.short||def.name||k, n:quantos(k) });
  });
  /* ===== NENHUM TÍTULO FICA FORA DA ESTANTE (regra do dono, 21/08) =====
     Os ladrilhos acima são os do universo ATIVO — as metas deste save. Mas a carreira do
     treinador pode ter taças de outro país ou de outra liga (chaves 'premier',
     'liga:<país>:<div>', copas de outro universo): tudo o que ele já ganhou e não tem
     ladrilho ganha um agora, com o rótulo carimbado no título. Tudo na mesma página. */
  const chaves=new Set(lista.map(x=>x.k));
  meus.forEach(t=>{
    const k=String(t.comp||''); if(!k||chaves.has(k)) return; chaves.add(k);
    lista.push({ k, nome:t.label||((typeof rfCompLabel==='function')?rfCompLabel(k):k), n:quantos(k) });
  });
  lista.forEach(x=>{ x.tem=x.n>0; });
  const n=lista.filter(x=>x.tem).length;
  const total=lista.reduce((s,x)=>s+x.n,0);
  const falta=lista.filter(x=>!x.tem)[0];
  return `<div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">SALA DE TROFÉUS</span>
        <span class="rf-label-r">${n} de ${lista.length}${total>n?(' · '+total+' taças'):''}</span></div>
      <div class="rf-tr-sala">${lista.map(x=>`
        <div class="rf-tr-tro ${x.tem?'tem':''}">
          ${x.n>1?`<b class="rf-tr-vezes">${x.n}x</b>`:''}
          ${rfTrPilhaHTML(x.k,x.n)}
          <span class="rf-tr-tro-n">${escC(x.nome)}</span>
          <span class="rf-tr-tro-s">${x.tem?(x.n===1?'conquistado':(x.n+' vezes campeão')):'não conquistado'}</span>
        </div>`).join('')}</div>
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">${n?'O QUE AINDA FALTA':'O QUE FALTA PARA O PRIMEIRO'}</span></div>
      <span class="rf-tr-texto">${falta
        ? escC('O troféu da '+falta.nome+' sai para quem vencer a final. Subir de divisão é a porta, não o título — o título é a final.')
        : 'A estante está completa. Não há mais o que ganhar neste save.'}</span>
    </div>`;
}

/* =====================================================================
   4 · RANKING
   Grade: 26 / treinador / 22 / clube / 62 / 62 / 52
   ===================================================================== */
const RF_TR_RANK_COLS='26px minmax(0,1.1fr) 22px minmax(0,1fr) 62px 62px 52px';
function rfTrRankingHTML(){
  if(typeof migrateCoachCareerStats==='function'){ try{ migrateCoachCareerStats(); }catch(e){} }
  /* PONTUACAO COM O PESO REAL DAS CONQUISTAS (ver coachRankingScore no core): pontos de jogo
     somados + titulos pesados pela competicao (Libertadores 20, Brasileirao 15, ... Serie D 0,5),
     em vez do bonus chapado de 50 por titulo que valia igual para Serie D e Libertadores. */
  const rows=(DATA.clubs||[]).map((c,i)=>{
    const t=(S.table&&S.table[c.id])||{Pts:0,P:0};
    const sc=(typeof coachRankingScore==='function')?coachRankingScore(c.id, t.Pts||0)
      :{jogo:(t.Pts||0), tituloPts:0, titles:0, total:(t.Pts||0)};
    const car=(S.coachCareerStats&&S.coachCareerStats[c.id])||{pts:0,titles:0};
    const jogos=(car.games||0)+(t.P||0);
    return { clubId:c.id, nome:(typeof coachName==='function')?coachName(c.id,i):'—',
      pts:sc.total, titles:sc.titles, aprov: jogos?Math.round(sc.jogo/(jogos*3)*100):0,
      eu:!!(CL.humans&&CL.humans[c.id]) || c.id===CL.clubId };
  }).sort((a,b)=>b.pts-a.pts);
  const linhas=rows.map((r,i)=>{
    const c=anyClubOf(r.clubId)||{short:r.clubId};
    return `<div class="rf-el-row ${r.eu?'sel':''}">
      <span class="rf-tr-rank">${i+1}</span>
      <span class="rf-tr-tec">${escC(r.nome)}</span>
      ${rfCrest(c,20)}
      <span class="rf-tr-clube fraco">${escC(c.short||c.name||'—')}</span>
      <span class="rf-tr-div">${escC(divisionLabel())}</span>
      <span class="rf-tr-num forte">${r.aprov}%</span>
      <span class="rf-tr-num">${r.pts}</span>
    </div>`;
  });
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_TR_RANK_COLS}">
    <span></span><span>TREINADOR</span><span></span><span>CLUBE</span><span>DIVISÃO</span>
    <span class="dir">APROV.</span><span class="dir">PONTOS</span>
  </div>`;
  return `<div class="rf-card rf-el-tbl" style="--el-cols:${RF_TR_RANK_COLS}">
      <div class="rf-label"><span class="rf-label-t">RANKING DE TREINADORES</span>
        <span class="rf-label-r">${escC(divisionLabel())}</span></div>
      ${cab}
      ${rfLista('ranking', linhas, 'Sem ranking ainda.')}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">COMO O RANKING É CALCULADO</span></div>
      <span class="rf-tr-texto">Os pontos de toda a carreira somados aos da temporada em curso, com
        ${BONUS} de bônus por título — ganhar pesa mais do que somar. O aproveitamento é informativo:
        quem tem menos jogos não sobe por isso.</span>
    </div>`;
}

/* =====================================================================
   5 · OFERTAS
   O cartão da oferta tem filete amarelo à esquerda — é a peça que o pacote
   destaca, e a única da tela com borda colorida.
   ===================================================================== */
const RF_TR_SOND_COLS='22px minmax(0,1.2fr) minmax(0,.9fr) 92px minmax(0,1fr)';
/* ACEITAR E RECUSAR NÃO FAZIAM NADA.
   Os dois botões chamavam `clAcceptJobOffer && clAcceptJobOffer(i)` e o par
   dele — funções que NÃO EXISTEM. O `&&` engolia o clique em silêncio: a
   proposta ficava na mesa e nada acontecia, nos dois botões.

   O motor tem o caminho pronto, e é o mesmo do convite que chega sozinho:
   jantar → proposta → boas-vindas. Aceitar aqui entra por esse fluxo em vez de
   trocar de clube na hora — senão a mesma decisão teria duas experiências
   diferentes conforme a porta por onde se chega, e por aqui o treinador nem
   veria os termos antes de confirmar. */
function rfTrAceitarOferta(i){
  const of=(typeof rfOfertas==='function')?rfOfertas():[];
  const o=of[i]; if(!o){ toastC('Essa proposta não está mais na mesa.'); cdraw(); return; }
  if(typeof clAcceptPendingOffer==='function') clAcceptPendingOffer(i);
  else if(typeof showJobInvite==='function') showJobInvite(o);
  else toastC('Não foi possível abrir a proposta.');
}
function rfTrRecusarOferta(i){
  const of=(typeof rfOfertas==='function')?rfOfertas():[];
  const o=of[i]; if(!o){ cdraw(); return; }
  const c=(typeof jobOfferClub==='function')?jobOfferClub(o):{short:'o clube'};
  (S.pendingJobOffers||[]).splice(i,1);
  if(typeof rfGravar==='function') rfGravar();
  toastC('Você recusou o convite do '+((c&&c.short)||'clube')+'.');
  cdraw();
}
function rfTrOfertasHTML(){
  const of=(typeof rfOfertas==='function')?rfOfertas():((S&&S.pendingJobOffers)||[]);
  const salAtual=(S.coachSalary!=null)?S.coachSalary:0;
  const verbaAtual=S.budget||0;
  const cards=of.map((o,i)=>{
    const c=(typeof jobOfferClub==='function')?jobOfferClub(o):{short:'?'};
    const dif=salAtual?(o.salary||0)-salAtual:0;
    const verba=o.budget||0;
    const vezes=verbaAtual?(verba/verbaAtual):0;
    return `<div class="rf-card rf-tr-oferta">
      <div class="rf-tr-of-hd">
        ${rfCrest(c,44)}
        <div class="rf-tr-of-id">
          <span class="rf-tr-of-t">${escC(c.short)} quer conversar</span>
          <span class="rf-tr-of-s">${escC((typeof jobOfferDivLabel==='function'?jobOfferDivLabel(o):'')||'')} · convite para jantar · resposta nesta rodada</span>
        </div>
        <div class="rf-sp"></div>
        <div class="rf-tr-of-acts">
          <button type="button" class="rf-btn rf-btn-recusar" onclick="rfTrRecusarOferta(${i})">Recusar</button>
          <button type="button" class="rf-btn rf-btn-cta" onclick="rfTrAceitarOferta(${i})">Aceitar o jantar</button>
        </div>
      </div>
      <div class="rf-el-stats">
        ${rfElStat('SALÁRIO OFERECIDO', o.salary?fmt(o.salary):'—',
          dif?((dif>0?'+':'')+fmt(dif)):'')}
        ${rfElStat('VERBA DE REFORÇOS', verba?fmt(verba):'—',
          vezes?(vezes.toFixed(1).replace('.',',')+'× a sua'):'')}
        ${rfElStat('OBJETIVO', escC(o.goal||'—'), o.goal?'pressão maior':'')}
        ${rfElStat('CONTRATO', o.years?(o.years+' ano'+(o.years>1?'s':'')):'—')}
      </div>
    </div>`;
  }).join('');
  const sond=(S.coachHistory||[]).filter(h=>h.type==='sondagem').slice(-8).reverse();
  const linhas=sond.map(h=>{
    const c=anyClubOf(h.clubId)||{short:h.clubShort||'—'};
    return `<div class="rf-el-row">
      ${rfCrest(c,20)}
      <span class="rf-tr-clube">${escC(c.short||h.clubShort||'—')}</span>
      <span class="rf-tr-div">${escC(h.divLabel||'—')}</span>
      <span class="rf-tr-num">${h.salary?fmt(h.salary):'—'}</span>
      <span class="rf-tr-desf">${escC(h.outcome||h.text||'—')}</span>
    </div>`;
  }).join('');
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_TR_SOND_COLS}">
    <span></span><span>CLUBE</span><span>DIVISÃO</span>
    <span class="dir">SALÁRIO</span><span class="dir">DESFECHO</span>
  </div>`;
  const cl=clubOf(CL.clubId)||{short:'o clube'};
  return `${cards || `<div class="rf-card"><div class="rf-label"><span class="rf-label-t">OFERTAS</span></div>
      <div class="rf-empty">Nenhuma oferta na mesa agora.<br>
        <small>Clubes sondam quem está com a segurança no cargo bem alta.</small></div></div>`}
    <div class="rf-card rf-el-tbl" style="--el-cols:${RF_TR_SOND_COLS}">
      <div class="rf-label"><span class="rf-label-t">CLUBES QUE JÁ SONDARAM</span>
        <span class="rf-label-r">histórico</span></div>
      ${cab}
      ${linhas || '<div class="rf-empty">Ninguém sondou ainda neste save.</div>'}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">O QUE ACONTECE SE VOCÊ SAIR</span></div>
      <span class="rf-tr-texto">O save continua no clube novo, com o elenco e o caixa dele. A campanha
        do ${escC(cl.short)} fica registrada na sua carreira e o clube passa a ser treinado pela máquina.</span>
    </div>`;
}

/* =====================================================================
   6 · PERFIL
   ===================================================================== */
function rfTrCampo(rot, valor){
  return `<label class="rf-tr-campo">
    <span class="rf-tr-campo-l">${escC(rot)}</span>
    <span class="rf-tr-campo-v">${valor}</span>
  </label>`;
}
function rfTrPerfilHTML(){
  const nome=rfTreinadorNome();
  const rep=Math.round(S.coachRep!=null?S.coachRep:50);
  const temps=(S.coachHistory||[]).length||1;
  const inicio=(S.season||0)-(temps-1);
  /* A IDADE E ESCOLHIDA NO ASSISTENTE e envelhece com as temporadas (S.coachAge0).
     Saves gravados antes disso nao a tem: la continua a conta antiga, que
     comecava aos 36. A ESPECIALIDADE o motor continua a nao guardar -- sai do
     que a campanha mostra. */
  const idade=(S.coachAge0||36)+(temps-1);
  const especial = rep>=70 ? 'montar elenco caro' : (S.youthPromotedSeason?'desenvolver a base':'segurar time pequeno');
  const chips=[];
  const tat=(typeof CAM_TATICA!=='undefined'&&CAM_TATICA[S.tactic])||S.tactic||'';
  if(tat) chips.push(String(tat).toLowerCase());
  if(S.youthPromotedSeason) chips.push('aposta na base');
  chips.push(rep>=70?'nome respeitado':rep>=40?'calmo na derrota':'ainda desconhecido');
  if((S.budget||0)<500000) chips.push('pouco caixa');
  if(CL.formation) chips.push('fiel ao '+CL.formation);
  return `<div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">DADOS DO TREINADOR</span></div>
      <div class="rf-tr-campos">
        ${rfTrCampo('Nome', escC(nome))}
        ${rfTrCampo('Nacionalidade', ((typeof universeFlag==='function')?universeFlag():'')+' '+escC((typeof universeCountryName==='function')?universeCountryName():'—'))}
        ${rfTrCampo('Idade', idade+' anos')}
        ${rfTrCampo('Início da carreira', escC(String(inicio)))}
        ${rfTrCampo('Estilo preferido', escC((CL.formation?CL.formation+' ':'')+String(tat).toLowerCase()))}
        ${rfTrCampo('Especialidade', escC(especial))}
      </div>
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">COMO A IMPRENSA TE DESCREVE</span></div>
      <div class="rf-tr-chips">${chips.map(c=>`<span class="rf-tr-chip">${escC(c)}</span>`).join('')}</div>
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">AJUSTES</span></div>
      <div class="rf-tr-ajustes">
        <button type="button" class="rf-btn rf-btn-secondary" onclick="rfGo('config','opcoes')">Trocar o nome</button>
        <button type="button" class="rf-btn rf-btn-secondary" onclick="rfSetTab('treinador','historia')">Ver histórico completo</button>
        <button type="button" class="rf-btn rf-btn-recusar" onclick="rfAcEncerrar()">Encerrar a carreira</button>
      </div>
    </div>`;
}

/* ---- cabeçalho da página ---- */
function rfTrSubHTML(){
  if(typeof migrateCoachCareerStats==='function'){ try{ migrateCoachCareerStats(); }catch(e){} }
  const car=(S.coachCareerStats&&S.coachCareerStats[CL.clubId])||{};
  const t=(S.table&&S.table[CL.clubId])||{P:0};
  const jogos=(car.games||0)+(t.P||0);
  const temps=(S.coachHistory||[]).length||1;
  const seg=(S.jobSecurity!=null)?S.jobSecurity:60;
  return `${rfTreinadorNome()} · ${temps}ª temporada · ${jogos} jogos · segurança no cargo ${seg}%`;
}
function rfTrAcoesHTML(){
  return `<div class="rf-mk-acoes">
    <button type="button" class="rf-btn rf-btn-secondary" onclick="rfTrExportar()">${rfIcone('exportar',16)} Exportar carreira</button>
    <button type="button" class="rf-btn rf-btn-cta" onclick="rfSetTab('treinador','ofertas')">${rfIcone('email',16)} Ver ofertas</button>
  </div>`;
}
function rfTrExportar(){
  const h=(S.history||[]).filter(x=>x.clubId===CL.clubId);
  const linhas=h.map(e=>[e.season,(anyClubOf(e.clubId)||{short:''}).short,
    'Série '+e.division, e.myPos||'', rfCpDesfecho(e)].join(';'));
  const txt='temporada;clube;divisao;posicao;desfecho\n'+linhas.join('\n');
  try{
    const a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(txt);
    a.download='carreira-'+rfTreinadorNome()+'.csv'; a.click();
    toastC('Carreira exportada.');
  }catch(e){ toastC('Não deu pra exportar aqui.'); }
}

/* Encerrar a carreira — o diálogo do pacote "Ações Internas". Junta o que
   ele mostra (temporadas e títulos) e abre o envelope; nada de popup. */
function rfAcEncerrar(){
  const hist=S.history||[];
  const titulos=hist.filter(h=>h && (h.champion===CL.clubId || h.title)).length;
  rfAcAbrir('sys-encerrar', {nome:rfTreinadorNome(), temporadas:hist.length||1, titulos});
}
