/* =====================================================================
   RetroFoot98 — TREINADOR, as seis abas completas
   Portado de telas/Treinador - Abas.html.

   Carreira · História · Sala de Troféus · Ranking · Ofertas · Perfil.

   A SALA DE TROFÉUS mostra os cinco troféus do save COM A ARTE REAL,
   em cinza quando não conquistados — é o que a referência pede, e é o
   único jeito de a sala dizer alguma coisa antes do primeiro título.
   ===================================================================== */

function rfTrCabecalhoHTML(){
  const cl=clubOf(CL.clubId)||{short:'—'};
  const nome=rfTreinadorNome();
  const temps=(S.coachHistory||[]).length || 1;
  const rep=Math.round(S.coachRep!=null?S.coachRep:50);
  const estrelas=Math.max(1,Math.min(5,Math.round(rep/20)));
  return `<div class="rf-card rf-tr-hd">
    <span class="rf-tr-av">${escC(nome.slice(0,1).toUpperCase())}</span>
    <div class="rf-tr-id">
      <span class="rf-tr-n">${escC(nome)}</span>
      <span class="rf-tr-s">${(typeof universeFlag==='function')?universeFlag():''}
        ${escC((typeof universeCountryName==='function')?universeCountryName():'')} ·
        ${temps}ª temporada · ${escC(cl.short)} na ${escC(divisionLabel())}</span>
    </div>
    <div class="rf-sp"></div>
    <span class="rf-tr-rep">REPUTAÇÃO ${estrelas} DE 5</span>
  </div>`;
}

/* =====================================================================
   1 · CARREIRA
   ===================================================================== */
function rfTrCarreiraHTML(){
  if(typeof migrateCoachCareerStats==='function'){ try{ migrateCoachCareerStats(); }catch(e){} }
  const car=(S.coachCareerStats&&S.coachCareerStats[CL.clubId])||{pts:0,titles:0};
  const t=(S.table&&S.table[CL.clubId])||{P:0,W:0,D:0,L:0,Pts:0};
  const jogos=(car.games||0)+(t.P||0);
  const vit=(car.wins||0)+(t.W||0);
  const aprov=jogos?Math.round(((car.pts||0)+(t.Pts||0))/(jogos*3)*100):0;
  const seg=(S.jobSecurity!=null)?S.jobSecurity:60;
  const clubes=[...new Set((S.history||[]).filter(h=>h.clubId).map(h=>h.clubId))];
  if(!clubes.includes(CL.clubId)) clubes.push(CL.clubId);
  return rfTrCabecalhoHTML() + rfCol(
    rfCard('Números da carreira', `
      <div class="rf-kpis">
        ${rfKpiHTML('Jogos', String(jogos), 'como treinador')}
        ${rfKpiHTML('Vitórias', String(vit), jogos?Math.round(vit/jogos*100)+'% dos jogos':'')}
        ${rfKpiHTML('Aproveitamento', aprov+'%', 'dos pontos disputados')}
        ${rfKpiHTML('Títulos', String(car.titles||rfTitulosDoTreinador().length), 'na estante')}
      </div>`)
    + rfCard('Clubes treinados',
        clubes.map(id=>{ const c=anyClubOf(id)||{short:id};
          const h=(S.history||[]).filter(x=>x.clubId===id);
          return `<div class="rf-linha ${id===CL.clubId?'me':''}">
            <span class="rf-linha-t">${escC(c.short)}${id===CL.clubId?' <i class="rf-el-sub">agora</i>':''}</span>
            <span class="rf-linha-v">${h.length||1} temporada${(h.length||1)===1?'':'s'}</span></div>`;
        }).join(''))
  ) + rfCol(
    rfCard('Segurança no cargo', `
      <div class="rf-pz-barra">
        <div class="rf-label"><span class="rf-label-t">${seg>=70?'Confortável':seg>=40?'Sob observação':'Em risco'}</span>
          <span class="rf-pz-pct">${seg}%</span></div>
        <div class="rf-pz-trilho"><div class="rf-pz-fill" style="width:${seg}%;
          background:${seg>=70?'var(--ok)':seg>=40?'var(--club-secondary)':'var(--danger)'}"></div></div>
      </div>
      <span class="rf-note">A conta é 70% posição na tabela e 30% moral do elenco. Ela move devagar:
        uma rodada ruim não derruba, e uma sequência ruim não se conserta num jogo.</span>`)
  );
}

/* =====================================================================
   2 · HISTÓRIA — linha do tempo
   ===================================================================== */
function rfTrHistoriaHTML(){
  const h=(S.history||[]).filter(x=>x.clubId===CL.clubId).slice().reverse();
  const linha=h.map(e=>{
    const c=anyClubOf(e.clubId)||{short:'—'};
    const titulo=e.myPos===1;
    return `<div class="rf-tl">
      <span class="rf-tl-ano">${escC(String(e.season||''))}</span>
      <span class="rf-tl-p ${titulo?'ouro':''}"></span>
      <div class="rf-tl-id">
        <span class="rf-tl-t">${escC(c.short)} · ${escC((typeof divisionLabelOf==='function')?divisionLabelOf(e.division):('Série '+e.division))}</span>
        <span class="rf-tl-s">${e.myPos?e.myPos+'º':'—'} · ${escC(rfCpDesfecho(e))}</span>
        <span class="rf-tl-c">${escC(e.artilheiro||'—')}</span>
      </div>
    </div>`;
  }).join('');
  const marcas=[];
  if(h.length){
    const melhor=h.slice().sort((a,b)=>(a.myPos||99)-(b.myPos||99))[0];
    marcas.push(['Melhor campanha', melhor.myPos+'º em '+melhor.season]);
    marcas.push(['Temporadas', String(h.length)]);
  }
  marcas.push(['Títulos', String(rfTitulosDoTreinador().length)]);
  return rfCol(
    rfCard('Linha do tempo',
      linha || '<span class="rf-note">A carreira começa agora. A primeira temporada entra aqui quando fechar.</span>',
      {right: h.length+(h.length===1?' temporada':' temporadas')})
  ) + rfCol(
    rfCard('Marcas pessoais',
      marcas.map(([k,v])=>`<div class="rf-linha">
        <span class="rf-linha-t">${escC(k)}</span><span class="rf-linha-v">${escC(v)}</span></div>`).join(''))
  );
}

/* =====================================================================
   3 · SALA DE TROFÉUS — os cinco, cinza quando não conquistados
   ===================================================================== */
function rfTrTrofeusHTML(){
  const meus=rfTitulosDoTreinador();
  const ganhou=k=>meus.some(t=>t.comp===k || String(t.comp||'').includes(k));
  const lista=[];
  ((typeof DIV_ORDER!=='undefined')?DIV_ORDER:['A','B','C','D']).slice().reverse().forEach(d=>{
    lista.push({ k:'serie'+d, nome:(typeof divisionLabelOf==='function')?divisionLabelOf(d):('Série '+d),
      tem:meus.some(t=>String(t.comp||'').indexOf('serie'+d)>=0 || String(t.label||'').indexOf('Série '+d)>=0) });
  });
  ((typeof allCupKeys==='function')?allCupKeys():[]).forEach(k=>{
    const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    lista.push({ k, nome:def.short||def.name||k, tem:ganhou(k) });
  });
  const n=lista.filter(x=>x.tem).length;
  return rfCol(
    rfCard('Sala de Troféus', `<div class="rf-tr-sala">${lista.map(x=>`
      <div class="rf-tr-tro ${x.tem?'tem':''}">
        ${rfTrofeuHTML(x.k,64)}
        <span class="rf-tr-tro-n">${escC(x.nome)}</span>
        <span class="rf-tr-tro-s">${x.tem?'conquistado':'não conquistado'}</span>
      </div>`).join('')}</div>`, {right:n+' de '+lista.length})
  ) + rfCol(
    rfCard(n?'O que ainda falta':'O que falta para o primeiro',
      lista.filter(x=>!x.tem).slice(0,6).map(x=>`<div class="rf-linha">
        <span class="rf-linha-t">${escC(x.nome)}</span>
        <span class="rf-linha-v">—</span></div>`).join('')
      || '<span class="rf-note">A estante está completa. Não há mais o que ganhar neste save.</span>')
  );
}

/* =====================================================================
   4 · RANKING
   ===================================================================== */
function rfTrRankingHTML(){
  if(typeof migrateCoachCareerStats==='function'){ try{ migrateCoachCareerStats(); }catch(e){} }
  const BONUS=50;
  const rows=(DATA.clubs||[]).map((c,i)=>{
    const t=(S.table&&S.table[c.id])||{Pts:0,P:0};
    const car=(S.coachCareerStats&&S.coachCareerStats[c.id])||{pts:0,titles:0};
    const pts=car.pts+(t.Pts||0);
    const jogos=(car.games||0)+(t.P||0);
    return { clubId:c.id, nome:(typeof coachName==='function')?coachName(c.id,i):'—',
      pts, titles:car.titles||0, aprov: jogos?Math.round(pts/(jogos*3)*100):0,
      eu:!!(CL.humans&&CL.humans[c.id]) || c.id===CL.clubId };
  }).sort((a,b)=>(b.pts+b.titles*BONUS)-(a.pts+a.titles*BONUS)||b.pts-a.pts);
  const linhas=rows.slice(0,20).map((r,i)=>{
    const c=anyClubOf(r.clubId)||{short:r.clubId};
    return `<div class="rf-tbl-row ${r.eu?'me':''}">
      <span class="rf-tbl-x">${i+1}</span>
      <span class="rf-tbl-n">${escC(r.nome)}</span>
      ${rfMkClube(r.clubId)}
      <span class="rf-tbl-v">${r.aprov}%</span>
      <span class="rf-tbl-f">${r.pts}</span>
    </div>`;
  }).join('');
  const cabecalho=`<span></span><span>TREINADOR</span><span>CLUBE</span>
    <span class="dir">APROV.</span><span class="dir">PONTOS</span>`;
  return rfCol(
    rfCard('Ranking de treinadores',
      rfMkTabela('28px minmax(0,1fr) minmax(0,140px) 64px 64px', cabecalho, linhas, 'Sem ranking ainda.'),
      {right: escC(divisionLabel())})
  ) + rfCol(
    rfCard('Como o ranking é calculado', `
      <div class="rf-passos">
        <div class="rf-passo"><span class="rf-passo-n">1</span>
          <span class="rf-passo-t">Soma os pontos que o treinador fez em toda a carreira, mais os da temporada em curso.</span></div>
        <div class="rf-passo"><span class="rf-passo-n">2</span>
          <span class="rf-passo-t">Cada título vale ${BONUS} pontos de bônus — ganhar pesa mais que somar.</span></div>
        <div class="rf-passo"><span class="rf-passo-n">3</span>
          <span class="rf-passo-t">O aproveitamento é informativo: quem tem menos jogos não sobe por isso.</span></div>
      </div>`)
  );
}

/* =====================================================================
   5 · OFERTAS
   ===================================================================== */
function rfTrOfertasHTML(){
  const of=(S.jobOffers||[]);
  const salAtual=(S.coachSalary!=null)?S.coachSalary:0;
  const cards=of.map((o,i)=>{
    const c=(typeof jobOfferClub==='function')?jobOfferClub(o):{short:'?'};
    const dif=salAtual?(o.salary||0)-salAtual:0;
    return `<div class="rf-card rf-prop2">
      <div class="rf-prop2-hd">
        ${rfCrest(c,34)}
        <div class="rf-prop2-id">
          <span class="rf-prop2-t">${escC(c.short)} quer conversar</span>
          <span class="rf-prop2-s">${escC((typeof jobOfferDivLabel==='function'?jobOfferDivLabel(o):''))} · resposta nesta rodada</span>
        </div>
        <div class="rf-sp"></div>
        <div class="rf-prop2-acts">
          <button type="button" class="rf-btn rf-btn-secondary" onclick="clRejectJobOffer&&clRejectJobOffer(${i})">Recusar</button>
          <button type="button" class="rf-btn rf-btn-primary" onclick="clAcceptJobOffer&&clAcceptJobOffer(${i})">Aceitar</button>
        </div>
      </div>
      <div class="rf-prop2-nums">
        ${rfKpiHTML('Salário oferecido', o.salary?fmt(o.salary):'—',
          dif?(dif>0?'+'+fmt(dif):fmt(dif)):'')}
        ${rfKpiHTML('Divisão', (typeof jobOfferDivLabel==='function'?jobOfferDivLabel(o):'—'), '')}
        ${rfKpiHTML('Clube', c.short||'—', c.overall?('força '+c.overall):'')}
      </div>
    </div>`;
  }).join('');
  const sondagens=(S.coachHistory||[]).filter(h=>h.type==='sondagem').slice(-5).reverse();
  return rfCol(
    cards || rfCard('Ofertas', `<div class="rf-empty">Nenhuma oferta na mesa agora.<br>
      <small>Clubes sondam quem está com a segurança no cargo bem alta.</small></div>`)
  ) + rfCol(
    rfCard('Clubes que já sondaram',
      sondagens.length
        ? sondagens.map(h=>`<div class="rf-linha">
            <span class="rf-linha-t">${escC(h.text||h.clubShort||'')}</span>
            <span class="rf-linha-v">${escC(String(h.season||''))}</span></div>`).join('')
        : '<span class="rf-note">Ninguém sondou ainda neste save.</span>')
    + rfCard('O que acontece se você sair', `
      <span class="rf-note">Trocar de clube zera a campanha na tabela atual, mas a carreira continua:
        pontos, títulos e ranking viajam com você. O elenco fica.</span>`)
  );
}

/* =====================================================================
   6 · PERFIL
   ===================================================================== */
function rfTrPerfilHTML(){
  const nome=rfTreinadorNome();
  const rep=Math.round(S.coachRep!=null?S.coachRep:50);
  const seg=(S.jobSecurity!=null)?S.jobSecurity:60;
  const auto=!!(CL.options&&CL.options.autoSalary);
  const imprensa = rep>=70 ? 'Nome respeitado no meio. A imprensa cobra por resultado, não por currículo.'
    : rep>=40 ? 'Treinador em construção. A imprensa dá crédito, mas cobra sequência.'
    : 'Ainda desconhecido fora do clube. Uma boa campanha muda isso rápido.';
  return rfCol(
    rfCard('Dados do treinador', `
      <div class="rf-tr-dados">
        <div class="rf-linha"><span class="rf-linha-t">Nome</span>
          <span class="rf-linha-v">${escC(nome)}</span></div>
        <div class="rf-linha"><span class="rf-linha-t">País</span>
          <span class="rf-linha-v">${escC((typeof universeCountryName==='function')?universeCountryName():'—')}</span></div>
        <div class="rf-linha"><span class="rf-linha-t">Clube</span>
          <span class="rf-linha-v">${escC((clubOf(CL.clubId)||{short:'—'}).short)}</span></div>
        <div class="rf-linha"><span class="rf-linha-t">Temporada</span>
          <span class="rf-linha-v">${escC(String(S.season||''))}</span></div>
        <div class="rf-linha"><span class="rf-linha-t">Reputação</span>
          <span class="rf-linha-v">${rep} de 100</span></div>
        <div class="rf-linha"><span class="rf-linha-t">Segurança no cargo</span>
          <span class="rf-linha-v">${seg}%</span></div>
      </div>`)
  ) + rfCol(
    rfCard('Como a imprensa te descreve', `<p class="rf-in-p">${escC(imprensa)}</p>`)
    + rfCard('Ajustes', `
      <div class="rf-pref"><span class="rf-pref-l">Salários automáticos</span>
        <button type="button" class="rf-switch ${auto?'on':''}" onclick="rfTogglePref('autoSalary')"
          aria-pressed="${auto?'true':'false'}"><i></i></button></div>
      <div class="rf-linha"><span class="rf-linha-t">Ritmo de jogo</span>
        <span class="rf-linha-v">${escC(typeof tempoLabelAtual==='function'?tempoLabelAtual():'—')}</span></div>
      <div class="rf-acts"><button type="button" class="rf-btn rf-btn-secondary"
        onclick="rfGo('config','opcoes')">Abrir as opções</button></div>`)
    + rfCard('Fim de linha', `
      <span class="rf-note">Encerrar manda a carreira para o hall. O save continua para consulta,
        mas não avança mais.</span>
      <div class="rf-acts"><button type="button" class="rf-btn rf-btn-recusar"
        onclick="rfAcEncerrar()">🎓 Encerrar a carreira</button></div>`)
  );
}


/* Encerrar a carreira — o diálogo do pacote "Ações Internas". Junta o que
   ele mostra (temporadas e títulos) e abre o envelope; nada de popup. */
function rfAcEncerrar(){
  const hist=S.history||[];
  const titulos=hist.filter(h=>h && (h.champion===CL.clubId || h.title)).length;
  rfAcAbrir('sys-encerrar', {nome:rfTreinadorNome(), temporadas:hist.length||1, titulos});
}
