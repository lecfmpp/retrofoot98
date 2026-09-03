/* =====================================================================
   RetroFoot98 — RANKING DOS TREINADORES
   Portado de "ranking pages e top bar" (03/09/2026): a faixa fixa do topo,
   a página de ranking (desktop + mobile) e o item no menu lateral.

   DE ONDE VÊM OS DADOS. O livro de títulos vive no servidor
   (elifoot_v3.coach_titles) e o ranking sai da RPC `rf_ranking('resenha')` —
   público, só a Resenha, por decisão do dono: no Solo o save é escrito pelo
   cliente e um placar que qualquer um pode escrever não é placar.

   TUDO O QUE O DESENHO PEDE JÁ TEM FONTE. A `foto` sai do perfil (bucket
   `perfil` + coach_profiles); o clube e o escudo saem do save MAIS RECENTE — o
   servidor manda o `club_id` e quem resolve a arte é este cliente, com o mesmo
   `clubCrestUrl` do resto do jogo; e a `delta` vem da fotografia tirada toda
   segunda-feira (rf_fechar_semana), positiva quando a pessoa subiu.

   O QUE AINDA CHEGA VAZIO É ESTADO LEGÍTIMO, não buraco: sem foto entram as
   iniciais, e quem não estava na fotografia da semana vem com 0, que a tela
   desenha como "—" em vez de inventar uma subida que não aconteceu.
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
/* ===== O ESCUDO DO ULTIMO SAVE =====
   O servidor manda o `club_id` e nao a arte: ele nao conhece escudo nenhum, e uma
   tabela de escudos no banco seria a segunda verdade sobre o mesmo dado. Quem
   resolve e' o MESMO caminho que desenha os escudos no resto do jogo
   (anyClubOf -> clubCrestUrl), entao o ranking mostra exactamente o que o jogo
   mostra — inclusive um escudo trocado pelo painel.

   O NOME TAMBEM SE RESOLVE AQUI. Do Solo vem `clubShort` gravado no save, mas da
   Resenha vem so' o id (game_seats nao guarda nome). Preferir o clube resolvido
   faz as duas origens desenharem igual; o que veio do servidor fica como recuo
   para um clube que este cliente nao conhece (outro universo, outro pacote). */
function rfRankClube(id, nomeDoServidor){
  const c=(id!=null && typeof anyClubOf==='function') ? anyClubOf(id) : null;
  const nome=(c && (c.short||c.name)) || (nomeDoServidor && String(nomeDoServidor)!==String(id) ? nomeDoServidor : null);
  const escudo=(c && typeof clubCrestUrl==='function') ? clubCrestUrl(c) : null;
  return { clube:nome, escudo:escudo };
}
function rfRankLinhas(){
  const d=rfRankCarregar();
  if(!d) return null;
  return d.map(r=>({
    pos:r.pos, treinador:r.treinador,
    /* TRÊS NÚMEROS, não um: `pts` é o TOTAL (o que ordena), e as duas parcelas
       vão ao lado para a tabela poder mostrar de onde ele veio. */
    pts:Number(r.pontos||0),
    titulos:Number(r.titulos||0), ptsTitulos:Number(r.pts_titulos||0),
    temporadas:Number(r.temporadas||0), ptsCampanha:Number(r.pts_campanha||0),
    carreiras:Number(r.carreiras||0),
    foto:r.foto||null,
    /* POSITIVO = SUBIU. O servidor ja' devolve a conta feita contra a fotografia
       da segunda-feira (rf_fechar_semana); quem nao estava na foto vem 0, e a
       tela desenha "—" — nao "subiu do nada". */
    delta:Number(r.delta||0),
    ...rfRankClube(r.club_id, r.clube), modo:r.modo_save||'Resenha',
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
      <span>ÚLTIMO SAVE</span><span class="dir">TÍTULOS</span><span class="dir">CAMPANHA</span><span class="dir">TOTAL</span>
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
      <span class="rf-rk-col dir" title="${l.titulos} título(s) · ${rfRankNum(l.ptsTitulos)} pontos">
        <b>${l.titulos}</b><i>${rfRankNum(l.ptsTitulos)} pts</i></span>
      <span class="rf-rk-col dir" title="${l.temporadas} temporada(s) concluída(s)">
        <b>${l.temporadas}</b><i>${rfRankNum(l.ptsCampanha)} pts</i></span>
      <span class="rf-rk-pts dir">${rfRankNum(l.pts)}</span>
    </div>`).join('')}
    <div class="rf-rk-ft">
      ${linhas.length>e.aberto?`<button type="button" class="rf-rk-bt" onclick="rfRankSet('aberto',${e.aberto+20})">Ver mais 20</button>`:''}
      ${linhas.some(l=>l.souEu)?`<button type="button" class="rf-rk-bt" onclick="rfRankIrParaMim()">Ir para a minha posição</button>`:''}
      <span class="rf-rk-nota">O total soma os <b>títulos</b> (com o peso de cada competição) e a <b>campanha</b> (os pontos que o time fez, pesados pela divisão). O ranking é do Modo Resenha.</span>
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
/* a barra quando ainda não há 4º colocado: o pódio ocupa a largura e o ticker não
   existe. Melhor uma barra curta e verdadeira do que uma a fingir movimento com
   os mesmos nomes. */
function rfFitaSemTicker(tres, eu){
  return `<div class="rf-fita curta" onclick="rfGo('ranking')" role="button" tabindex="0"
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
    <div class="rf-fita-mid"></div>
    ${eu?`<div class="rf-fita-eu">
      <span class="rf-fita-eu-id">
        <span class="rf-fita-eu-r">A SUA POSIÇÃO</span>
        <span class="rf-fita-eu-l"><b>#${eu.pos}</b>${rfRankPill(eu.delta,false)}</span>
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
function rfFitaHTML(){
  const l=rfRankLinhas();
  if(!l || !l.length) return '';                 // sem ranking não há faixa
  const tres=l.slice(0,3), resto=l.slice(3);
  const eu=l.find(x=>x.souEu);
  const item=(t)=>`<span class="rf-fita-i ${t.souEu?'eu':''}">
      <span class="rf-fita-p ${t.pos<=3?('m'+t.pos):''}">${t.pos}º</span>
      ${rfRankEscudo(t,22)}
      <span class="rf-fita-n">${escC(t.treinador)}</span>
      <span class="rf-fita-v">${rfRankNum(t.pts)}</span>
      ${t.souEu?'<span class="rf-fita-tag">VOCÊ</span>':''}
    </span>`;
  /* ===== O TICKER É DO 4º PARA BAIXO, E SÓ EXISTE SE HOUVER 4º =====
     Duas coisas davam nomes repetidos na barra, e as duas apareciam juntas
     quando o ranking é pequeno:
       · sem `resto`, o código caía na lista INTEIRA — e aí os mesmos três do
         pódio ancorado voltavam a correr ao lado dele;
       · a lista vai duplicada de propósito (o trilho anda de 0 a -50%, e é o que
         faz o laço não ter emenda), o que com poucos nomes lê-se como "o jogo
         está a repetir gente".
     Com o ranking a nascer — dois treinadores — o efeito era ver GRINGO e
     CHIANELLI quatro vezes na mesma barra. Agora: sem 4º não há ticker (o pódio
     já mostra toda a gente), e a cópia só entra quando há nomes que cheguem para
     o laço ser laço em vez de repetição visível. */
  if(!resto.length) return rfFitaSemTicker(tres, eu);
  const trilho = (resto.length>=6)
    ? resto.map(item).join('')+resto.map(item).join('')
    : resto.map(item).join('');
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
    <div class="rf-fita-mid"><div class="rf-fita-trilho ${resto.length>=6?'':'parado'}">${trilho}</div><span class="rf-fita-mask"></span></div>
    ${eu?`<div class="rf-fita-eu">
      <span class="rf-fita-eu-id">
        <span class="rf-fita-eu-r">A SUA POSIÇÃO</span>
        <span class="rf-fita-eu-l"><b>#${eu.pos}</b>${rfRankPill(eu.delta,false)}</span>
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
