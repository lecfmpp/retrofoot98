/* =====================================================================
   RetroFoot98 — CAMPEONATOS, as cinco abas completas
   Marcação de telas-v3/Campeonatos - Abas.dc.html, coluna por coluna.

   Minhas competições · Calendário · Artilharia · História · Ligas
   internacionais.

   As cinco abas empilham cartões de LARGURA CHEIA — nenhuma usa a grade de
   duas colunas da página. Onde o pacote põe duas peças lado a lado (os dois
   cards de competição, os dois blocos de artilharia, as duas copas
   continentais), a grade é INTERNA ao cartão, não da página.

   A linha de tabela é a mesma peça do Elenco (.rf-el-head/.rf-el-row, com a
   grade vindo de --el-cols): mesma altura, mesmo raio, mesmo realce. Ter
   duas tabelas diferentes no mesmo produto era o que fazia navegar parecer
   trocar de site.

   TROFÉU É ARTE REAL nos cards de competição (rfTrofeuHTML), nunca escudo
   nem emoji — a mesma regra da leva 4.
   ===================================================================== */

/* clube com escudo de 20px, do jeito que o pacote desenha em três tabelas */
function rfCpClube(id){
  const c=anyClubOf(id)||{short:'—'};
  return `<span class="rf-cp-clube">${rfCrest(c,20)}<span>${escC(c.short||c.name||'—')}</span></span>`;
}
/* selo de resultado: V verde, E amarelo, D vermelho, jogo por vir em cinza */
function rfCpResultado(r){
  return `<span class="rf-cp-res ${r?('r'+r):'vazio'}">${escC(r||'')}</span>`;
}

/* =====================================================================
   1 · MINHAS COMPETIÇÕES
   Dois cards lado a lado (troféu + identidade + rodapé com selo e Abrir),
   e embaixo a lista das competições que o clube não disputa.
   ===================================================================== */
function rfCpCards(){
  const cards=[];
  const pos=rfMinhaPosicao(), total=Object.keys(S.table||{}).length;
  const t=(S.table&&S.table[CL.clubId])||{Pts:0,P:0};
  cards.push({ trofeu:'serie'+(S.division||'D'),
    nome:classifDivName(S.division),
    linha1: pos? (pos+'º de '+total) : 'a começar',
    linha2: (t.Pts||0)+' pontos em '+(t.P||0)+' jogos',
    selo: rfCpSeloDivisao(pos,total), tom:'ouro',
    acao:"rfSetTab('campeonatos','calendario')" });
  ((typeof allCupKeys==='function')?allCupKeys():[]).forEach(k=>{
    if(S.compToggle && S.compToggle[k]===false) return;
    const c=S.cups&&S.cups[k]; if(!c) return;
    const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    const vivo=(typeof cupCompetitionTeamAlive==='function')&&cupCompetitionTeamAlive(c,CL.clubId);
    const campeao=(typeof cupCompetitionChampion==='function')?cupCompetitionChampion(c):null;
    cards.push({ trofeu:k, nome:def.name||k,
      linha1:(typeof cupCompetitionRoundLabel==='function'&&cupCompetitionRoundLabel(c,k))||'—',
      linha2: campeao===CL.clubId ? 'campeão' : (vivo?'na disputa':'fora da competição'),
      selo: campeao===CL.clubId?'CAMPEÃO':(vivo?'NA DISPUTA':'ELIMINADO'),
      tom: campeao===CL.clubId?'ouro':(vivo?'verde':'cinza'),
      acao:`clCupView('${k}')` });
  });
  return cards;
}
function rfCpSeloDivisao(pos,total){
  if(!pos) return '';
  const promo=(typeof DIVISION_PROMO!=='undefined'&&DIVISION_PROMO[S.division])||0;
  const releg=(typeof DIVISION_RELEG!=='undefined'&&DIVISION_RELEG[S.division])||0;
  if(promo&&pos<=promo) return 'ZONA DE ACESSO';
  if(releg&&pos>total-releg) return 'ZONA DE QUEDA';
  return 'MEIO DE TABELA';
}
function rfCpMinhasHTML(){
  const cards=rfCpCards();
  const fora=((typeof allCupKeys==='function')?allCupKeys():[]).filter(k=>{
    if(S.compToggle && S.compToggle[k]===false) return true;
    return !(S.cups&&S.cups[k]);
  });
  const grade=`<div class="rf-cp-cards">${cards.map(c=>`
    <div class="rf-card rf-cp-card">
      <div class="rf-cp-card-hd">
        ${rfTrofeuHTML(c.trofeu,64)}
        <div class="rf-cp-card-id">
          <span class="rf-cp-card-n">${escC(c.nome)}</span>
          <span class="rf-cp-card-1">${escC(c.linha1)}</span>
          <span class="rf-cp-card-2">${escC(c.linha2)}</span>
        </div>
      </div>
      <div class="rf-cp-card-ft">
        ${c.selo?`<span class="rf-cp-selo ${c.tom||''}">${escC(c.selo)}</span>`:''}
        <div class="rf-sp"></div>
        <button type="button" class="rf-btn rf-btn-secondary" onclick="${c.acao}">Abrir</button>
      </div>
    </div>`).join('')}</div>`;
  const lista = fora.length
    ? fora.map(k=>{
        const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
        const desligada=S.compToggle&&S.compToggle[k]===false;
        return `<div class="rf-cp-fora">
          ${rfTrofeuHTML(k,34)}
          <span class="rf-cp-fora-n">${escC(def.name||k)}</span>
          <span class="rf-cp-fora-v">${escC(desligada?'desligada neste save':(def.vaga||'ainda não sorteada'))}</span>
        </div>`; }).join('')
    : '<span class="rf-note">Você está em todas as competições deste save.</span>';
  return `${grade}
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">COMPETIÇÕES QUE VOCÊ NÃO DISPUTA</span>
        <span class="rf-label-r">${escC(String(S.season||''))}</span></div>
      ${lista}
    </div>`;
}

/* =====================================================================
   2 · CALENDÁRIO — a liga num cartão, cada copa no seu
   Grade da liga: 44 / 22 / adversário / 62 / 62 / 30
   ===================================================================== */
const RF_CP_CAL_COLS='52px 22px minmax(0,1.4fr) minmax(62px,.5fr) minmax(62px,.5fr) 34px';
function rfCpCalendarioHTML(){
  const sched=S.sched||[];
  // o calendário do motor é [[casaId, foraId], …] por jornada, e o placar mora
  // em S.results com gh/ga (não hg/ag — essa é a pegadinha do lado da liga)
  const jogos=sched.map((j,i)=>{
    const p=(j||[]).find(m=>m[0]===CL.clubId||m[1]===CL.clubId);
    if(!p) return '';
    const casa=p[0]===CL.clubId, outro=anyClubOf(casa?p[1]:p[0])||{short:'—'};
    const res=(S.results||[]).find(r=>r.round===i && r.h===p[0] && r.a===p[1]);
    const feito=!!res;
    const gm=feito?(casa?res.hg:res.ag):null, gc=feito?(casa?res.ag:res.hg):null;
    const letra=feito?(gm>gc?'V':gm===gc?'E':'D'):'';
    const proximo=!feito && (i===(S.round||0));
    return `<div class="rf-el-row ${proximo?'sel':''} ${feito?'':'porvir'}">
      <span class="rf-cp-jor">${i+1}ª</span>
      ${rfCrest(outro,20)}
      <span class="rf-el-nome">${escC(outro.short||outro.name||'—')}</span>
      <span class="rf-cp-local">${casa?'casa':'fora'}</span>
      <span class="rf-cp-placar">${feito?(gm+'–'+gc):'—'}</span>
      ${rfCpResultado(letra)}
    </div>`;
  }).filter(Boolean);
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_CP_CAL_COLS}">
    <span>JORNADA</span><span></span><span>ADVERSÁRIO</span><span>LOCAL</span>
    <span class="dir">PLACAR</span><span></span>
  </div>`;
  const grupo=(typeof myGroupLabel==='function')?myGroupLabel():'';
  return `<div class="rf-card rf-el-tbl" style="--el-cols:${RF_CP_CAL_COLS}">
      <div class="rf-label">
        <span class="rf-label-t">${escC(classifDivName(S.division))}${grupo?' · '+escC(grupo):''}</span>
        <span class="rf-label-r">${(S.round||0)} de ${sched.length||14} jornadas</span></div>
      ${cab}
      ${rfLista('cal-liga', jogos, 'O calendário ainda não foi sorteado.')}
    </div>
    ${rfCpCopasCalendarioHTML()}`;
}
/* uma copa por cartão, com FASE no lugar de JORNADA */
const RF_CP_COPA_COLS='78px 22px minmax(0,1.4fr) minmax(62px,.5fr) minmax(62px,.5fr) 34px';
function rfCpCopasCalendarioHTML(){
  const out=[];
  ((typeof allCupKeys==='function')?allCupKeys():[]).forEach(k=>{
    const c=S.cups&&S.cups[k]; if(!c) return;
    const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    const linhas=[];
    ((c.bracket&&c.bracket.ties)||[]).forEach(t=>{
      if(t.h!==CL.clubId && t.a!==CL.clubId) return;
      const casa=t.h===CL.clubId, outro=anyClubOf(casa?t.a:t.h)||{short:'a sortear'};
      const feito=(t.hg!=null&&t.ag!=null);
      const gm=feito?(casa?t.hg:t.ag):null, gc=feito?(casa?t.ag:t.hg):null;
      const letra=feito?(gm>gc?'V':gm===gc?'E':'D'):'';
      linhas.push(`<div class="rf-el-row ${feito?'':'porvir'}">
        <span class="rf-cp-jor">${escC(t.fase||(typeof cupCompetitionRoundLabel==='function'&&cupCompetitionRoundLabel(c,k))||'—')}</span>
        ${rfCrest(outro,20)}
        <span class="rf-el-nome">${escC(outro.short||outro.name||'a sortear')}</span>
        <span class="rf-cp-local">${feito?(casa?'casa':'fora'):'—'}</span>
        <span class="rf-cp-placar">${feito?(gm+'–'+gc):'—'}</span>
        ${rfCpResultado(letra)}
      </div>`);
    });
    out.push(`<div class="rf-card rf-el-tbl" style="--el-cols:${RF_CP_COPA_COLS}">
      <div class="rf-label"><span class="rf-label-t">${escC(def.name||k)}</span></div>
      <div class="rf-el-head" style="--el-cols:${RF_CP_COPA_COLS}">
        <span>FASE</span><span></span><span>ADVERSÁRIO</span><span>LOCAL</span>
        <span class="dir">PLACAR</span><span></span>
      </div>
      ${linhas.join('') || '<div class="rf-empty">Sem jogos seus nesta copa ainda.</div>'}
    </div>`);
  });
  return out.join('');
}

/* =====================================================================
   3 · ARTILHARIA
   Grade: 26 / jogador / clube / 28 / 40 / 56
   ===================================================================== */
const RF_CP_ART_COLS='30px minmax(0,1.2fr) minmax(0,1fr) 34px 44px minmax(56px,.5fr)';
function rfCpArtilhariaHTML(){
  const jogos=Math.max(1,(S.round||0));
  const arr=Object.entries(S.scorers||{}).map(([n,g])=>({n,g})).sort((a,b)=>b.g-a.g).slice(0,20);
  const meu=squad(CL.clubId);
  const meuNome=new Set(meu.map(p=>p.n));
  const posDe=n=>{ const p=meu.find(x=>x.n===n); return p?rfPosInicial(p.s):'—'; };
  const linhas=arr.map((s,i)=>{
    const cid=(typeof findPlayerClub==='function')?findPlayerClub(s.n):null;
    return `<div class="rf-el-row sel">
      <span class="rf-cp-rank">${i+1}</span>
      <span class="rf-cp-art-n">${escC(s.n)}</span>
      ${cid?rfCpClube(cid):'<span class="rf-cp-clube">—</span>'}
      <span class="rf-el-c">${escC(posDe(s.n))}</span>
      <span class="rf-cp-gols">${s.g}</span>
      <span class="rf-el-d">${(s.g/jogos).toFixed(2).replace('.',',')}</span>
    </div>`;
  });
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_CP_ART_COLS}">
    <span></span><span>JOGADOR</span><span>CLUBE</span><span>POS</span>
    <span class="dir">GOLS</span><span class="dir">G/JOGO</span>
  </div>`;
  const meusGols=Object.entries(S.scorers||{}).filter(([n])=>meuNome.has(n)).sort((a,b)=>b[1]-a[1]);
  /* DEFESAS MENOS VAZADAS sai da tabela (GA), o mesmo dado da classificação —
     o motor não tem estatística de goleiro à parte. */
  const defesas=(typeof sortedTable==='function'?sortedTable():[]).slice()
    .sort((a,b)=>(a.GA||0)-(b.GA||0)).slice(0,5);
  const marcadores = meusGols.length
    ? meusGols.map(([n,g])=>`<div class="rf-cp-mini m3">
        <span class="rf-cp-mini-n">${escC(n)}</span>
        <span class="rf-el-c">${escC(posDe(n))}</span>
        <span class="rf-cp-mini-v">${g}</span></div>`).join('')
    : '<span class="rf-note">Ninguém do seu elenco marcou ainda.</span>';
  const vazadas = defesas.length
    ? defesas.map(t=>{ const c=anyClubOf(t.id)||{short:t.id};
        return `<div class="rf-cp-mini m3c ${t.id===CL.clubId?'meu':''}">
          ${rfCrest(c,20)}
          <span class="rf-cp-mini-n">${escC(c.short||c.name||'—')}</span>
          <span class="rf-cp-mini-v">${t.GA||0}</span></div>`; }).join('')
    : '<span class="rf-note">A tabela ainda não tem jogos.</span>';
  return `<div class="rf-card rf-el-tbl" style="--el-cols:${RF_CP_ART_COLS}">
      <div class="rf-label"><span class="rf-label-t">ARTILHARIA DA ${escC(String(divisionLabel()).toUpperCase())}</span>
        <span class="rf-label-r">todos os grupos</span></div>
      ${cab}
      ${rfLista('artilharia', linhas, 'Sem gols marcados ainda nesta temporada.')}
    </div>
    <div class="rf-cp-duo">
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">SEUS MARCADORES</span></div>
        ${marcadores}
      </div>
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">DEFESAS MENOS VAZADAS</span></div>
        ${vazadas}
      </div>
    </div>`;
}

/* =====================================================================
   4 · HISTÓRIA
   Grade: 50 / competição / posição / desfecho / copas
   ===================================================================== */
const RF_CP_HIST_COLS='50px minmax(0,.9fr) minmax(0,.9fr) minmax(0,1.1fr) minmax(0,1.1fr)';
function rfCpHistoriaHTML(){
  const minhas=(S.history||[]).filter(h=>h.clubId===CL.clubId).slice().reverse();
  const linhas=minhas.map((h,i)=>{
    const cups=Object.entries(h.myCups||{}).map(([k,v])=>{
      const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
      return (def.short||def.name||k)+' · '+v; }).join(', ');
    return `<div class="rf-el-row ${i===0?'sel':''}">
      <span class="rf-cp-ano">${escC(String(h.season))}</span>
      <span class="rf-cp-hist-c">${escC((typeof divisionLabelOf==='function')?divisionLabelOf(h.division):('Série '+h.division))}</span>
      <span class="rf-cp-hist-v">${h.myPos?(h.myPos+'º'):'—'}</span>
      <span class="rf-cp-hist-s">${escC(rfCpDesfecho(h))}</span>
      <span class="rf-cp-hist-s">${escC(cups||'—')}</span>
    </div>`;
  }).join('');
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_CP_HIST_COLS}">
    <span>ANO</span><span>COMPETIÇÃO</span><span>POSIÇÃO</span><span>DESFECHO</span><span>COPAS</span>
  </div>`;
  const titulos=(typeof rfTitulosDoTreinador==='function')?rfTitulosDoTreinador():[];
  const estante = titulos.length
    ? titulos.map(t=>`<div class="rf-cp-mini m2">
        <span class="rf-cp-mini-n">${escC(t.label||t.text||'')}</span>
        <span class="rf-cp-mini-v">${escC(String(t.season||''))}</span></div>`).join('')
    : `<div class="rf-cp-vazio">
        <span class="rf-cp-vazio-i">🏆</span>
        <span class="rf-cp-vazio-t">Nenhum título ainda. A estante enche a partir do primeiro.</span>
      </div>`;
  return `<div class="rf-card rf-el-tbl" style="--el-cols:${RF_CP_HIST_COLS}">
      <div class="rf-label"><span class="rf-label-t">HISTÓRICO DO CLUBE</span>
        <span class="rf-label-r">${minhas.length} ${minhas.length===1?'temporada':'temporadas'}</span></div>
      ${cab}
      ${linhas || '<div class="rf-empty">Nenhuma temporada concluída neste save.</div>'}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">TÍTULOS DO CLUBE</span>
        <span class="rf-label-r">na sua gestão</span></div>
      ${estante}
    </div>`;
}
function rfCpDesfecho(h){
  const promo=(typeof DIVISION_PROMO!=='undefined'&&DIVISION_PROMO[h.division])||0;
  const releg=(typeof DIVISION_RELEG!=='undefined'&&DIVISION_RELEG[h.division])||0;
  if(!h.myPos) return '—';
  if(h.myPos===1) return 'campeão';
  if(promo&&h.myPos<=promo) return 'acesso';
  if(releg&&h.relegated&&h.relegated.includes(h.myClubShort)) return 'rebaixado';
  return 'meio de tabela';
}

/* =====================================================================
   5 · LIGAS INTERNACIONAIS
   Grade: 28 / liga / líder / 56 / vice / 56
   ===================================================================== */
const RF_CP_INTL_COLS='28px minmax(0,1fr) minmax(0,1.1fr) 56px minmax(0,1.1fr) 56px';
function rfCpIntlHTML(){
  const paises=Object.keys((S&&S.bgLeagues)||{});
  const linhas=paises.map(pais=>{
    const cfg=(typeof UNI_CONFIGS!=='undefined')?UNI_CONFIGS[(typeof uniKeyOf==='function')?uniKeyOf(pais):pais]:null;
    const topo=(cfg&&cfg.order&&cfg.order[0])||null; if(!topo) return '';
    const tab=(typeof bgStandings==='function')?bgStandings(pais,topo):[];
    const lider=tab[0], vice=tab[1];
    const nomeDe=t=>{ if(!t) return '—';
      const c=(typeof bgClubById==='function')?bgClubById(t.id):null; return (c&&c.short)||String(t.id); };
    return `<div class="rf-el-row">
      <span class="rf-cp-bandeira">${(typeof flagImg==='function')?flagImg(pais):''}</span>
      <span class="rf-cp-liga">${escC((cfg.label&&cfg.label[topo])||pais)}</span>
      <span class="rf-cp-time">${escC(nomeDe(lider))}</span>
      <span class="rf-cp-pts">${lider?lider.Pts:'—'} pts</span>
      <span class="rf-cp-time fraco">${escC(nomeDe(vice))}</span>
      <span class="rf-cp-pts fraco">${vice?vice.Pts:'—'} pts</span>
    </div>`;
  }).join('');
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_CP_INTL_COLS}">
    <span></span><span>LIGA</span><span>LÍDER</span><span class="dir">PTS</span>
    <span class="dir">VICE</span><span class="dir">PTS</span>
  </div>`;
  const copas=((typeof allCupKeys==='function')?allCupKeys():[]).filter(k=>k!=='copaBrasil').map(k=>{
    const c=S.cups&&S.cups[k]; const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    const fase=c?((typeof cupCompetitionRoundLabel==='function'&&cupCompetitionRoundLabel(c,k))||'em andamento'):'não sorteada';
    const lider=(c&&typeof cupCompetitionLeader==='function')?cupCompetitionLeader(c):null;
    return `<div class="rf-cp-tile">
      ${rfTrofeuHTML(k,44)}
      <div class="rf-cp-tile-id">
        <span class="rf-cp-tile-n">${escC(def.name||k)}</span>
        <span class="rf-cp-tile-1">${escC(fase)}</span>
        <span class="rf-cp-tile-2">${escC(lider||'—')}</span>
      </div>
    </div>`;
  }).join('');
  return `<div class="rf-card rf-el-tbl" style="--el-cols:${RF_CP_INTL_COLS}">
      <div class="rf-label"><span class="rf-label-t">LIGAS DO MUNDO</span>
        <span class="rf-label-r">líderes da rodada</span></div>
      ${cab}
      ${linhas || '<div class="rf-empty">Nenhuma liga de fundo neste save.</div>'}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">COPAS CONTINENTAIS</span></div>
      ${copas ? `<div class="rf-cp-tiles">${copas}</div>`
              : '<span class="rf-note">Sem copas continentais neste save.</span>'}
    </div>`;
}

/* ---- cabeçalho da página ---- */
function rfCpSubHTML(){
  const comps=[classifDivName(S.division)];
  ((typeof allCupKeys==='function')?allCupKeys():[]).forEach(k=>{
    if(!(S.cups&&S.cups[k])) return;
    const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    comps.push(def.name||k);
  });
  return comps.join(' · ')+' · '+(S.round||0)+'ª jornada disputada';
}
function rfCpAcoesHTML(){
  return `<div class="rf-mk-acoes">
    <button type="button" class="rf-btn rf-btn-secondary"
      onclick="rfSetTab('campeonatos','calendario')">${rfIcone('calendario',16)} Calendário completo</button>
    <button type="button" class="rf-btn rf-btn-cta"
      onclick="rfSetTab('campeonatos','minhas')">${rfIcone('trofeu',16)} Ver classificação</button>
  </div>`;
}
