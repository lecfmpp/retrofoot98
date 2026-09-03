/* =====================================================================
   RetroFoot98 — RANKING DOS TREINADORES
   Portado de "ranking pages e top bar" (03/09/2026): a faixa fixa do topo,
   a página de ranking (desktop + mobile) e o item no menu lateral.

   DE ONDE VÊM OS DADOS. O livro de títulos vive no servidor
   (elifoot_v3.coach_titles) e o ranking sai da RPC `rf_ranking('resenha')` —
   público, só a Resenha, por decisão do dono: no Solo o save é escrito pelo
   cliente e um placar que qualquer um pode escrever não é placar.

   O QUE O DESENHO PEDE E O LIVRO AINDA NÃO TEM: `delta` (posições ganhas na
   semana), `foto` do treinador, e o escudo/clube/modo do último save. Estes
   campos existem na tela como estrutura e chegam vazios — a tela desenha o
   caso "sem foto" (iniciais) e "sem variação" (—), que são estados legítimos
   e não buracos. Ligar cada um é um passo à parte, e o sítio é um só:
   rfRankLinhas().
   ===================================================================== */

/* ---------- estado ---------- */
function rfRankEstado(){
  CL._rank = CL._rank || { escopo:0, periodo:1, aberto:20, dados:null, carregando:false };
  return CL._rank;
}
const RF_RANK_ESCOPOS=['Global','Amigos','Minhas resenhas'];
const RF_RANK_PERIODOS=['Semana','Temporada','Sempre'];
function rfRankSet(k,v){ const e=rfRankEstado(); e[k]=v; cdraw(); }

/* ---------- dados ----------
   Uma leitura por visita: a RPC é pública e barata, mas redesenhar a página
   (um clique num filtro) não pode ser uma ida à rede. `null` = ainda não
   perguntei; `[]` = perguntei e não há ninguém. A tela diz coisas diferentes
   para os dois — vazio não pode ler como "a carregar". */
function rfRankCarregar(){
  const e=rfRankEstado();
  if(e.dados!==null || e.carregando) return e.dados;
  e.carregando=true;
  const pronto=(linhas)=>{ e.dados=linhas||[]; e.carregando=false; cdraw(); };
  if(typeof NET!=='undefined' && NET.ranking){
    Promise.resolve(NET.ranking('resenha',100)).then(pronto).catch(()=>pronto([]));
  } else pronto([]);
  return null;
}
/* as INICIAIS: primeiras letras de até duas palavras com mais de 2 caracteres
   ("Kaká do Grau" -> "KG"), como o handoff especifica. */
function rfRankIniciais(nome){
  const p=String(nome||'').trim().split(/\s+/).filter(x=>x.length>2).slice(0,2);
  return (p.length?p:String(nome||'—').trim().split(/\s+/).slice(0,2)).map(x=>x.charAt(0).toUpperCase()).join('')||'—';
}
function rfRankNum(n){ return Number(n||0).toLocaleString('pt-BR'); }
/* quem sou eu na lista: o ranking devolve NOME (nunca user_id — ver rf_ranking),
   então a comparação é pelo nome do treinador deste cliente. */
function rfRankSouEu(nome){
  const meu=(typeof rfTreinadorNome==='function')?rfTreinadorNome():(CL.mgr||'');
  return !!meu && String(nome||'').toLowerCase()===String(meu).toLowerCase();
}
function rfRankLinhas(){
  const d=rfRankCarregar();
  if(!d) return null;
  return d.map(r=>({
    pos:r.pos, treinador:r.treinador, pts:Number(r.pontos||0), titulos:Number(r.titulos||0),
    temporadas:Number(r.carreiras||0),
    /* ainda sem fonte — ver o cabeçalho do ficheiro */
    delta:0, foto:null, clube:null, escudo:null, modo:'Resenha',
    souEu:rfRankSouEu(r.treinador), semPeso:Number(r.sem_peso||0)
  }));
}

/* ---------- peças ---------- */
function rfRankPill(d, escuro){
  const cls = d>0?'sobe' : d<0?'desce' : 'igual';
  const txt = d===0 ? '—' : ((d>0?'▲ ':'▼ ')+Math.abs(d));
  return `<span class="rf-rk-pill ${cls} ${escuro?'esc':''}">${txt}</span>`;
}
function rfRankAvatar(l, tam, cls){
  const est = `width:${tam}px;height:${tam}px`;
  return l.foto
    ? `<span class="rf-rk-av ${cls||''}" style="${est}"><img src="${escC(l.foto)}" alt=""></span>`
    : `<span class="rf-rk-av ${cls||''}" style="${est}">${escC(rfRankIniciais(l.treinador))}</span>`;
}
function rfRankEscudo(l, tam){
  if(l.escudo) return `<span class="rf-rk-crest" style="width:${tam}px;height:${tam}px;background-image:url('${escC(l.escudo)}')"></span>`;
  return `<span class="rf-rk-crest vazio" style="width:${tam}px;height:${tam}px"></span>`;
}

/* ---------- o pódio ---------- */
function rfRankPodioHTML(linhas){
  const tres=linhas.slice(0,3);
  if(!tres.length) return '';
  /* a ORDEM VISUAL é 2º · 1º · 3º no desktop (o degrau), e 1º · 2º · 3º no
     mobile — quem troca é o CSS (`order`), para o HTML ficar na ordem real da
     classificação e um leitor de ecrã lê a lista certa. */
  return `<div class="rf-rk-podio">
    <div class="rf-rk-podio-hd">
      <span class="rf-rk-podio-t">🏆 O PÓDIO</span>
      <span class="rf-rk-podio-q">${escC(RF_RANK_PERIODOS[rfRankEstado().periodo].toUpperCase())}</span>
    </div>
    <div class="rf-rk-podio-g">${tres.map((l,i)=>{
      const p = i===0;
      return `<div class="rf-rk-p rf-rk-p${i+1} ${p?'ouro':''} ${l.souEu?'eu':''}">
        <div class="rf-rk-p-top">
          <span class="rf-rk-med">${i+1}º</span>
          ${rfRankPill(l.delta,true)}
        </div>
        <div class="rf-rk-p-fig">
          ${rfRankAvatar(l, p?96:76, 'med'+(i+1))}
          <span class="rf-rk-badge ${l.escudo?'':'vazio'}" ${l.escudo?`style="background-image:url('${escC(l.escudo)}')"`:''}></span>
        </div>
        <div class="rf-rk-p-id">
          <span class="rf-rk-p-n">${escC(l.treinador)}</span>
          <span class="rf-rk-p-c">${escC([l.clube, l.modo].filter(Boolean).join(' · ').toUpperCase())}</span>
          <span class="rf-rk-p-pts">${rfRankNum(l.pts)} pts</span>
        </div>
        <span class="rf-rk-p-nota">${escC(
          l.souEu && !l.foto ? 'Este é você. Envie uma foto em Configurações › Perfil para aparecer aqui.'
          : (l.titulos===1 ? '1 título conquistado.' : l.titulos+' títulos conquistados.'))}</span>
      </div>`;
    }).join('')}</div>
  </div>`;
}

/* ---------- o convite (só sem foto) ---------- */
function rfRankConviteHTML(linhas){
  const eu=linhas.find(l=>l.souEu);
  if(!eu || eu.foto) return '';
  return `<div class="rf-rk-convite">
    <span class="rf-rk-convite-ic">🖼</span>
    <span class="rf-rk-convite-id">
      <b>Você está no ranking — coloque a sua cara nele</b>
      <span>A foto fica em Configurações › Perfil e vale para o ranking, a Resenha e o chat. Sem foto, entram as suas iniciais.</span>
    </span>
    <button type="button" class="rf-rk-bt cta" onclick="rfGo('config')">📤 Enviar foto</button>
  </div>`;
}

/* ---------- a tabela ---------- */
function rfRankTabelaHTML(linhas){
  const e=rfRankEstado();
  const vis=linhas.slice(0, e.aberto);
  return `<div class="rf-rk-card">
    <div class="rf-rk-card-hd">
      <span class="rf-rk-rot">CLASSIFICAÇÃO GERAL</span>
      <span class="rf-rk-tot">${rfRankNum(linhas.length)} ${linhas.length===1?'TREINADOR':'TREINADORES'}</span>
    </div>
    <div class="rf-rk-th">
      <span>POS</span><span>SEMANA</span><span>TREINADOR</span>
      <span>ÚLTIMO SAVE</span><span class="dir">CARREIRAS</span><span class="dir">PONTOS</span>
    </div>
    ${vis.map(l=>`<div class="rf-rk-tr ${l.souEu?'eu':''}" id="${l.souEu?'rf-rk-eu':''}">
      <span class="rf-rk-pos ${l.pos<=3?'top':''}">${l.pos}º</span>
      <span>${rfRankPill(l.delta,false)}</span>
      <span class="rf-rk-nome-c">
        ${rfRankAvatar(l,30,'mini')}
        <span class="rf-rk-nome">${escC(l.treinador)}</span>
        ${l.souEu?'<span class="rf-rk-voce">VOCÊ</span>':''}
      </span>
      <span class="rf-rk-save">
        ${rfRankEscudo(l,24)}
        <span class="rf-rk-save-id">
          <span class="rf-rk-save-c">${escC(l.clube||'—')}</span>
          <span class="rf-rk-save-m">${escC(l.modo||'')}</span>
        </span>
      </span>
      <span class="rf-rk-temp dir">${l.temporadas}</span>
      <span class="rf-rk-pts dir">${rfRankNum(l.pts)}</span>
    </div>`).join('')}
    <div class="rf-rk-ft">
      ${linhas.length>e.aberto?`<button type="button" class="rf-rk-bt" onclick="rfRankSet('aberto',${e.aberto+20})">Ver mais 20</button>`:''}
      ${linhas.some(l=>l.souEu)?`<button type="button" class="rf-rk-bt" onclick="rfRankIrParaMim()">Ir para a minha posição</button>`:''}
      <span class="rf-rk-nota">Pontos por título, com o peso de cada competição. O ranking é do Modo Resenha.</span>
    </div>
  </div>`;
}
function rfRankIrParaMim(){
  const el=document.getElementById('rf-rk-eu');
  if(el && el.scrollIntoView) el.scrollIntoView({behavior:'smooth', block:'center'});
}

/* ---------- a página ---------- */
function rfRankSubHTML(){
  const e=rfRankEstado(); const l=rfRankLinhas();
  const eu=(l||[]).find(x=>x.souEu);
  const base=RF_RANK_ESCOPOS[e.escopo]+' · '+RF_RANK_PERIODOS[e.periodo];
  if(!l) return base+' · a carregar…';
  if(!l.length) return base+' · ninguém pontuou ainda';
  return base + (eu ? (' · você em '+eu.pos+'º com '+rfRankNum(eu.pts)+' pontos') : ' · você ainda não pontuou');
}
function rfRankAcoesHTML(){
  const e=rfRankEstado();
  const seg=(lista,chave,val)=>`<span class="rf-rk-seg">${lista.map((o,i)=>
    `<button type="button" class="rf-rk-sg ${i===val?'on':''}" onclick="rfRankSet('${chave}',${i})">${escC(o)}</button>`).join('')}</span>`;
  return `<div class="rf-rk-filtros">${seg(RF_RANK_ESCOPOS,'escopo',e.escopo)}${seg(RF_RANK_PERIODOS,'periodo',e.periodo)}</div>`;
}
function rfRankHTML(){
  const l=rfRankLinhas();
  if(l===null) return `<div class="rf-rk"><div class="rf-rk-card"><span class="rf-rk-nota">A carregar o ranking…</span></div></div>`;
  if(!l.length) return `<div class="rf-rk"><div class="rf-rk-card">
      <span class="rf-rk-rot">CLASSIFICAÇÃO GERAL</span>
      <span class="rf-rk-nota" style="padding-top:10px">Ninguém pontuou ainda. O ranking é do <b>Modo Resenha</b>: o primeiro título numa sala abre a lista.</span>
    </div></div>`;
  return `<div class="rf-rk">
    ${rfRankPodioHTML(l)}
    ${rfRankConviteHTML(l)}
    ${rfRankTabelaHTML(l)}
  </div>`;
}

/* =====================================================================
   A FAIXA FIXA DO TOPO
   Pódio ancorado + ticker + a sua posição (desktop); ticker corrido de ponta a
   ponta com uma pílula à direita (mobile). A troca é por CSS — o HTML é um só,
   pela mesma razão da tela de Opções.
   ===================================================================== */
function rfFitaHTML(){
  const l=rfRankLinhas();
  if(!l || !l.length) return '';                 // sem ranking não há faixa
  const tres=l.slice(0,3), resto=l.slice(3);
  const eu=l.find(x=>x.souEu);
  const item=(t)=>`<span class="rf-fita-i ${t.souEu?'eu':''}">
      <span class="rf-fita-p ${t.pos<=3?('m'+t.pos):''}">${t.pos}º</span>
      ${rfRankEscudo(t,20)}
      <span class="rf-fita-n">${escC(t.treinador)}</span>
      <span class="rf-fita-v">${rfRankNum(t.pts)}</span>
      ${t.souEu?'<span class="rf-fita-tag">VOCÊ</span>':''}
    </span>`;
  /* a lista vai DUPLICADA e o trilho anda de 0 a -50%: é o que faz o laço não
     ter emenda. Sem a cópia, o fim da lista deixaria um vazio a atravessar. */
  const corrida=(resto.length?resto:l);
  const trilho=corrida.map(item).join('')+corrida.map(item).join('');
  return `<div class="rf-fita" onclick="rfGo('ranking')" role="button" tabindex="0"
      onkeydown="if(event.key==='Enter')rfGo('ranking')" title="Abrir o ranking dos treinadores">
    <div class="rf-fita-podio">${tres.map((t,i)=>`
      <span class="rf-fita-c c${i+1}">
        <span class="rf-fita-med m${i+1}">${i+1}º</span>
        ${rfRankEscudo(t,30)}
        <span class="rf-fita-cid">
          <span class="rf-fita-cn">${escC(t.treinador)}</span>
          <span class="rf-fita-cp">${rfRankNum(t.pts)} pts</span>
        </span>
      </span>`).join('')}</div>
    <div class="rf-fita-mid"><div class="rf-fita-trilho">${trilho}</div><span class="rf-fita-mask"></span></div>
    ${eu?`<div class="rf-fita-eu">
      <span class="rf-fita-eu-id">
        <span class="rf-fita-eu-r">A SUA POSIÇÃO</span>
        <span class="rf-fita-eu-l"><b>${eu.pos}º</b>${rfRankPill(eu.delta,false)}</span>
      </span>
      <span class="rf-fita-eu-div"></span>
      ${rfRankEscudo(eu,26)}
      <span class="rf-fita-eu-id2">
        <span class="rf-fita-eu-n">${escC(eu.treinador)}</span>
        <span class="rf-fita-eu-p">${rfRankNum(eu.pts)} PTS</span>
      </span>
    </div>`:''}
    ${eu?`<span class="rf-fita-pilula">#${eu.pos}${eu.delta?(' '+(eu.delta>0?'▲':'▼')+Math.abs(eu.delta)):''}</span>`:''}
  </div>`;
}
