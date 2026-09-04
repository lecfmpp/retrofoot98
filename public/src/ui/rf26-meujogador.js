/* =====================================================================
   SEU JOGADOR OFICIAL — passo de Embaixador no assistente
   ---------------------------------------------------------------------
   O Embaixador poe o nome e a cara dele num jogador de verdade da base: quatro vagas por clube,
   nos 80 clubes das quatro divisoes, nas duas modalidades — 640 no total. Escolhe divisao,
   clube e uma das quatro vagas, manda a foto, gera o avatar e escreve o nome da camisa.

   NAO CONFUNDIR COM O AVATAR DO TREINADOR. Aquele e' a foto de perfil de QUALQUER pessoa, e
   aparece no ranking e na ficha do treinador (ver coach_profiles / rf26-fluxo.js). Este e' outra
   coisa: e' um JOGADOR dentro do jogo dos outros — por isso e' so' do Embaixador, e por isso
   passa por moderacao antes de existir.

   PASSO CONDICIONAL: so' entra na trilha de quem tem Embaixador e ainda nao usou a vaga. Para
   todos os outros o assistente segue direto do avatar para o sorteio, e a regua encolhe sozinha
   (ver rfTrilhaDe, ui/main.js).

   TRES COISAS QUE ESTA TELA NAO DECIDE, e e' de proposito:
     · quem pode      — a RPC `vaga_pedir` confere o plano no servidor. Esconder o botao aqui
                        seria uma sugestao; a recusa que vale e' a de la'.
     · se esta' livre — entre ver a lista e carregar no botao, alguem pode ter levado a vaga. O
                        erro vem do servidor e a lista recarrega.
     · se e' aprovada — nunca aqui. Nome e foto entram na base de TODOS os treinadores.

   O QUE ELA PROMETE E' O QUE O JOGO FAZ: o jogador aprovado aparece nos saves NOVOS. Um save em
   curso tem o elenco congelado dentro dele (S.squads), entao la' o nome antigo continua ate' a
   proxima carreira — e a tela diz isso, em vez de deixar a pessoa descobrir.
   ===================================================================== */

const RF_MJ_DIVS = ['A','B','C','D'];
/* 16, o mesmo do desenho e o mesmo da RPC (elifoot_v3.vaga_nome_max). E' o que cabe na camisa,
   na ficha, na artilharia e na escalacao sem cortar. */
const RF_MJ_NOME_MAX = 16;
const RF_MJ_POS = {
  GK: { nome:'Goleiro',  cor:'#2f8f4a', letra:'G', num:1, nota:'Debaixo das traves, com a braçadeira à vista.' },
  DEF:{ nome:'Zagueiro', cor:'#17458F', letra:'Z', num:4, nota:'O último homem — e o primeiro a subir no escanteio.' },
  MID:{ nome:'Meia',     cor:'#8a6a00', letra:'M', num:8, nota:'Quem conduz o time e distribui o jogo.' },
  ATT:{ nome:'Atacante', cor:'#c0392b', letra:'A', num:9, nota:'A vaga de quem quer o nome na artilharia.' },
};
const RF_MJ_ORDEM = ['GK','DEF','MID','ATT'];

function rfMjEstado(){
  return CL.mj || (CL.mj = { divisao:'A', clubId:null, playerId:null, nome:'', foto:null,
                             avatar:0,      /* 0 sem foto · 1 gerando · 2 pronto */
                             clubes:[], vagas:[], carregando:false, minha:null, erro:null });
}
function rfMjModalidade(){ return (typeof CL!=='undefined' && CL.modalidade==='fem') ? 'fem' : 'mas'; }
function rfMjEhEmbaixador(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  return (st.plan||st.plano)==='embaixador';
}
/* o passo so' existe para quem pode usa-lo: Embaixador que ainda nao tem vaga nesta modalidade */
function rfMjPassoVale(){ return rfMjEhEmbaixador() && !(CL.mj && CL.mj.minha); }

/* ---- carregamentos ---- */
function rfMjCarregarMinha(cb){
  if(typeof NET==='undefined' || !NET.vagaMinha) { if(cb) cb(null); return; }
  NET.vagaMinha(rfMjModalidade()).then(v=>{ rfMjEstado().minha=v||null; if(cb) cb(v); cdraw(); })
    .catch(()=>{ if(cb) cb(null); });
}
function rfMjSetDivisao(d){
  const e=rfMjEstado();
  /* trocar a divisao reseta clube e vaga: a vaga escolhida pertencia a um clube que ja' nao
     esta' na lista, e deixa-la marcada seria um envio para um sitio que a pessoa nao ve' */
  e.divisao=d; e.clubId=null; e.playerId=null; e.clubes=[]; e.vagas=[]; e.carregando=true; cdraw();
  NET.vagasPorClube(rfMjModalidade(), d).then(cs=>{ e.clubes=cs; e.carregando=false; cdraw(); })
    .catch(()=>{ e.carregando=false; cdraw(); });
}
function rfMjSetClube(id){
  const e=rfMjEstado();
  if(!id){ e.clubId=null; e.playerId=null; e.vagas=[]; cdraw(); return; }
  const c=(e.clubes||[]).find(x=>x.club_id===id);
  if(c && !c.livres) return;                       /* clube lotado nao seleciona */
  e.clubId=id; e.playerId=null; e.vagas=[]; e.carregando=true; cdraw();
  NET.vagasDoClube(rfMjModalidade(), id).then(vs=>{ e.vagas=vs; e.carregando=false; cdraw(); })
    .catch(()=>{ e.carregando=false; cdraw(); });
}
function rfMjSetJogador(pid){
  const e=rfMjEstado();
  const v=(e.vagas||[]).find(x=>x.player_id===pid);
  if(!v || v.status!=='livre') return;
  e.playerId=pid; cdraw();
}
function rfMjSetNome(v){
  rfMjEstado().nome=String(v||'').slice(0,RF_MJ_NOME_MAX);
  /* SO' O QUE MUDA E' REDESENHADO: um cdraw() por tecla recria o input por innerHTML, o cursor
     volta ao inicio e o texto sai invertido para quem escreve depressa (ja' aconteceu no nome do
     treinador — ver a memoria do projeto). Aqui so' o contador, a figurinha e o CTA reagem. */
  const c=document.querySelector('[data-mj-conta]'); if(c) c.textContent=rfMjEstado().nome.length+'/'+RF_MJ_NOME_MAX;
  const n=document.querySelector('[data-mj-camisa-nome]'); if(n) n.textContent=rfMjEstado().nome||'SEU NOME';
  rfMjSyncRodape();
}
/* o rodape (linha de estado + CTA) muda com tudo: sai daqui para os dois desenhos usarem o mesmo */
function rfMjSyncRodape(){
  const e=rfMjEstado();
  const b=document.querySelector('[data-mj-cta]');
  const s=document.querySelector('[data-mj-estado]');
  if(s) s.textContent=rfMjFalta();
  if(b){
    const ok=rfMjPronto();
    b.disabled=!ok; b.classList.toggle('travado', !ok);
    b.textContent = e.enviando ? 'Enviando…' : (ok ? 'Criar meu jogador' : 'Complete os passos');
  }
}
function rfMjPronto(){
  const e=rfMjEstado();
  return !!(e.playerId && (e.nome||'').trim().length>=2 && e.avatar===2 && !e.enviando);
}
/* a linha de estado diz O QUE FALTA, na ordem em que se faz — nao "preencha os campos" */
function rfMjFalta(){
  const e=rfMjEstado();
  if(!e.clubId) return 'Escolha o clube para continuar.';
  if(!e.playerId) return 'Escolha a vaga no elenco para continuar.';
  if(e.avatar!==2) return 'Envie a foto e gere o avatar para liberar o envio.';
  if((e.nome||'').trim().length<2) return 'Escreva o nome que vai na camisa.';
  const v=(e.vagas||[]).find(x=>x.player_id===e.playerId)||{};
  return `${e.nome.trim()} · ${rfMjNomeClube(v.club_id, v.clube_nome)} · ${(RF_MJ_POS[v.posicao]||{}).nome||''} — pronto para enviar.`;
}

/* ---- a foto e o avatar ---- */
function rfMjSubirFoto(){
  const e=rfMjEstado();
  const inp=document.createElement('input');
  inp.type='file'; inp.accept='image/jpeg,image/png,image/webp';
  inp.onchange=()=>{
    const f=inp.files&&inp.files[0]; if(!f) return;
    e.enviandoFoto=true; e.erro=null; cdraw();
    Promise.resolve(NET.vagaFoto(f)).then(r=>{
      e.enviandoFoto=false;
      if(r&&r.error){ e.erro=r.error; }
      else if(r&&r.url){ e.foto=r.url; e.avatar=0; }   /* foto nova pede avatar novo */
      cdraw();
    }).catch(err=>{ e.enviandoFoto=false; e.erro=(err&&err.message)||'Não consegui enviar.'; cdraw(); });
  };
  inp.click();
}
/* O AVATAR E' GERADO PELO MESMO SERVICO DO RETRATO DO TREINADOR — mesma cota, mesmos termos,
   mesmo tratamento de erro. Abrir um segundo gerador so' para esta tela seria uma segunda cota
   para controlar e uma segunda forma de falhar. Enquanto ele nao existir para o jogador, a foto
   enviada VALE como avatar: e' melhor deixar entrar a foto real do que travar a etapa. */
function rfMjGerar(){
  const e=rfMjEstado();
  if(!e.foto){ e.erro='Mande uma foto primeiro — é dela que sai o avatar.'; cdraw(); return; }
  e.avatar=1; e.erro=null; cdraw();
  /* o retrato por IA vive no dialogo que ja' existe; quando ele devolve, CL.coachFoto muda */
  const antes=CL.coachFoto;
  if(typeof rfAvatarIA==='function'){
    rfAvatarIA();
    const t=setInterval(()=>{
      if(CL.coachFoto && CL.coachFoto!==antes){ clearInterval(t); e.foto=CL.coachFoto; e.avatar=2; cdraw(); }
    }, 700);
    /* teto: se a pessoa fechar o dialogo sem gerar, a foto que ela ja' mandou fica valendo */
    setTimeout(()=>{ clearInterval(t); if(e.avatar===1){ e.avatar=2; cdraw(); } }, 60000);
    return;
  }
  setTimeout(()=>{ e.avatar=2; cdraw(); }, 900);
}

/* ---- enviar ---- */
function rfMjEnviar(){
  const e=rfMjEstado();
  if(!rfMjPronto()) return;
  e.enviando=true; e.erro=null; cdraw();
  NET.vagaPedir(rfMjModalidade(), e.clubId, e.playerId, e.nome.trim(), e.foto).then(r=>{
    e.enviando=false;
    if(r&&r.error){
      e.erro=r.error;
      if(/livre/i.test(r.error)) rfMjSetClube(e.clubId);   /* a lista envelheceu */
      cdraw(); return;
    }
    e.minha=r.vaga||null;
    rfMjPopupHTML(e.minha);
  }).catch(err=>{ e.enviando=false; e.erro=(err&&err.message)||'Não consegui enviar.'; cdraw(); });
}
function rfMjLargar(){
  const e=rfMjEstado();
  if(!confirm('Largar a vaga? O jogador volta ao nome de base e ela fica livre para outro Embaixador.')) return;
  NET.vagaLargar(rfMjModalidade()).then(()=>{ e.minha=null; e.playerId=null; rfMjSetClube(e.clubId); cdraw(); });
}
/* SEM CONFETE AQUI, de proposito (regra do handoff): a festa e' do pagamento. Isto ainda depende
   de aprovacao, e por isso a confirmacao e' sobria. */
function rfMjPopupHTML(v){
  v=v||{};
  const pos=(RF_MJ_POS[v.posicao]||{});
  const html=`<div class="rf-mjp-topo">
      <span class="rf-mjp-selo" aria-hidden="true">⚽</span>
      <span class="rf-mjp-kicker">JOGADOR CRIADO</span>
      <h2 class="rf-mjp-tit">${escC(v.nome||'O seu jogador')} está a caminho do pack.</h2>
      <p class="rf-mjp-sub">A gente revisa o nome e a foto em até <b>48 horas</b>. Assim que
        aprovar, ele entra no pack oficial e passa a aparecer para todos os treinadores.</p>
    </div>
    <div class="rf-mjp-corpo">
      <div class="rf-mjp-resumo">
        <span class="rf-mjp-num">${escC(String(rfMjCamisa(v)))}</span>
        <span class="rf-mjp-id">
          <b>${escC(v.nome||'')}</b>
          <span class="rf-mjp-mono">${escC(rfMjNomeClube(v.club_id, v.clube_nome).toUpperCase())} · SÉRIE ${escC(v.divisao||'')} · PACK OFICIAL</span>
        </span>
        <span class="rf-mjp-pill">EM ANÁLISE</span>
      </div>
      <span class="rf-mjp-nota">O aviso sai por e-mail. Se algo não passar, a vaga volta para a
        fila e você pode tentar de novo.</span>
      <button type="button" class="rf-mjp-cta" onclick="rfMjPopupFechar()">Continuar para o sorteio</button>
    </div>`;
  let f=document.querySelector('.rf-mjp-fundo');
  if(!f){ f=document.createElement('div'); f.className='rf-mjp-fundo'; document.body.appendChild(f); }
  f.innerHTML=`<div class="rf-mjp-modal" role="dialog" aria-modal="true">${html}</div>`;
}
function rfMjPopupFechar(){
  const f=document.querySelector('.rf-mjp-fundo'); if(f) f.remove();
  rfMjDepois();
}
/* segue o assistente — e' o mesmo destino do "Fazer isso depois" */
function rfMjDepois(){
  if(typeof clEscolherClubes==='function') clEscolherClubes();
  else { CL.screen='main'; cdraw(); }
}

/* ---- pecas do desenho ---- */
function rfMjCamisa(v){
  /* o numero da camisa e' o do jogador na base; sem ele, o padrao da posicao */
  try{
    const c=(typeof anyClubOf==='function')?anyClubOf(v.club_id):null;
    const p=c && (c.squad||[]).find(x=>x.id===v.player_id);
    if(p && p.num) return p.num;
  }catch(e){}
  return (RF_MJ_POS[v.posicao]||{}).num || 9;
}
/* ===== O NOME DO CLUBE VEM DO JOGO, EM TEMPO DE DESENHO =====
   A coluna `clube_nome` da vaga e' util para o painel (que nao carrega os pacotes do jogo), mas
   aqui dentro ela e' a segunda melhor fonte: o pacote oficial renomeia os clubes no arranque, e
   quem sabe o nome de agora e' o proprio catalogo. Preferir o catalogo evita a tela mostrar
   "Bahia" ao lado de jogadores chamados "Wesley Peixoto" — foi exatamente o que aconteceu
   quando a coluna, semeada do ficheiro-fonte, ficou com os nomes reais. */
function rfMjNomeClube(clubId, doBanco){
  try{
    const c=(typeof anyClubOf==='function')?anyClubOf(clubId):null;
    if(c && (c.short||c.name)) return c.short||c.name;
  }catch(e){}
  return doBanco||clubId||'';
}
function rfMjCrest(clubId){
  try{
    const c=(typeof anyClubOf==='function')?anyClubOf(clubId):null;
    if(c && typeof rfCrest==='function') return rfCrest(c,26);
  }catch(e){}
  return '';
}
function rfMjFigurinhaHTML(){
  const e=rfMjEstado();
  const v=(e.vagas||[]).find(x=>x.player_id===e.playerId)||{};
  const pos=(RF_MJ_POS[v.posicao]||{});
  const estado = e.avatar===2 ? 'AVATAR PRONTO' : (e.avatar===1 ? 'PROCESSANDO' : (e.foto?'FALTA GERAR':'FALTA A FOTO'));
  return `<div class="rf-mj-fig">
    <div class="rf-mj-fig-hd">
      <span class="rf-mj-rot">A SUA FIGURINHA</span>
      <span class="rf-mj-mono">${escC(estado)}</span>
    </div>
    <div class="rf-mj-prev">
      ${e.foto?`<img src="${escC(e.foto)}" alt="">`:'<span class="rf-mj-prev-vazio">📷</span>'}
      <span class="rf-mj-veu"></span>
      ${e.avatar===1?`<span class="rf-mj-proc"><i class="rf-mj-spin"></i>GERANDO O AVATAR…</span>`:''}
      <span class="rf-mj-prev-in">
        <span class="rf-mj-num">${escC(String(e.playerId?rfMjCamisa(v):'—'))}</span>
        <span class="rf-mj-mono ouro">${escC((pos.nome||'POSIÇÃO').toUpperCase())}</span>
        <span class="rf-mj-camisa" data-mj-camisa-nome>${escC(e.nome||'SEU NOME')}</span>
        <span class="rf-mj-mono">${escC(((e.playerId?rfMjNomeClube(v.club_id, v.clube_nome):'CLUBE')+' · SÉRIE '+(v.divisao||e.divisao)+' · PACK OFICIAL').toUpperCase())}</span>
      </span>
    </div>
    <div class="rf-mj-fig-bts">
      <button type="button" class="rf-mj-bt-ia" ${e.avatar===1?'disabled':''} onclick="rfMjGerar()">
        ${e.avatar===1?'Gerando…':(e.avatar===2?'↻ Gerar de novo':'✨ Gerar avatar com IA')}</button>
      <button type="button" class="rf-mj-bt-br" onclick="rfMjSubirFoto()">
        ${e.enviandoFoto?'Enviando…':(e.foto?'Trocar a foto':'Enviar a foto')}</button>
    </div>
    <div class="rf-mj-nome-bl">
      <span class="rf-mj-rot">NOME NA CAMISA</span>
      <input class="rf-mj-nome" maxlength="${RF_MJ_NOME_MAX}" placeholder="Seu nome"
        value="${escC(e.nome||'')}" oninput="rfMjSetNome(this.value)">
      <span class="rf-mj-nome-r">
        <span>Vale apelido, mas nada de ofensa — a moderação reprova e a vaga volta para a fila.</span>
        <span class="rf-mj-mono" data-mj-conta>${(e.nome||'').length}/${RF_MJ_NOME_MAX}</span>
      </span>
    </div>
    ${/* O AVISO TEM DE DIZER A REGRA QUE O JOGO CUMPRE. O prototipo dizia "a vaga fica travada
         ate' o fim da temporada" — e isso nao e' verdade aqui: quem manda e' a assinatura. O
         webhook liberta a vaga assim que o plano deixa de ser Embaixador (ver stripe-webhook),
         e quem reassina depois entra na fila e escolhe outra. E' isto que se escreve. */''}
    <div class="rf-mj-aviso">⚠ <span>Ele entra no <b>pack oficial</b> e passa a aparecer para todos
      os treinadores — e continua lá <b>enquanto você for Embaixador</b>. Se o plano acabar, ele
      volta ao nome de base e a vaga fica livre para outra pessoa.</span></div>
  </div>`;
}
function rfMjEscolhasHTML(){
  const e=rfMjEstado();
  const cfg=(typeof UNI_CONFIGS!=='undefined')?UNI_CONFIGS.brasil:null;
  const divs=RF_MJ_DIVS.map(d=>{
    const rot=(cfg&&cfg.label&&cfg.label[d])||('Série '+d);
    const q=(cfg&&cfg.size&&cfg.size[d])||0;
    return `<button type="button" class="rf-mj-divc ${e.divisao===d?'on':''}" onclick="rfMjSetDivisao('${d}')">
      <span class="rf-mj-divc-n">${escC(rot)}</span>
      <span class="rf-mj-mono">${q} clubes</span></button>`;
  }).join('');

  const clubes=(e.clubes||[]).map(c=>{
    const cheio=!c.livres;
    return `<button type="button" class="rf-mj-clube ${e.clubId===c.club_id?'on':''} ${cheio?'off':''}"
        ${cheio?'disabled':`onclick="rfMjSetClube('${escC(c.club_id)}')"`}>
      <span class="rf-mj-clube-e">${rfMjCrest(c.club_id)}</span>
      <span class="rf-mj-clube-n">${escC(rfMjNomeClube(c.club_id, c.clube_nome))}</span>
      <span class="rf-mj-mono ${cheio?'ruim':'bom'}">${cheio?'sem vaga':(c.livres+(c.livres>1?' vagas':' vaga'))}</span>
    </button>`;
  }).join('');

  const porPos={}; (e.vagas||[]).forEach(v=>{ porPos[v.posicao]=v; });
  const livres=(e.vagas||[]).filter(v=>v.status==='livre').length;
  const vagas=RF_MJ_ORDEM.map(k=>{
    const v=porPos[k]; const P=RF_MJ_POS[k];
    if(!v) return '';
    const livre=v.status==='livre', sel=e.playerId===v.player_id;
    return `<button type="button" class="rf-mj-linha ${sel?'on':''} ${livre?'':'off'}"
        ${livre?`onclick="rfMjSetJogador('${escC(v.player_id)}')"`:'disabled'}>
      <span class="rf-mj-radio ${sel?'on':''}"></span>
      <span class="rf-mj-quad" style="background:${P.cor}">${P.letra}</span>
      <span class="rf-mj-linha-id">
        <span class="rf-mj-linha-t">${escC(P.nome)}</span>
        <span class="rf-mj-linha-s">${escC(livre?P.nota:('ocupada por '+(v.nome||'outro embaixador')))}</span>
      </span>
      <span class="rf-mj-pill ${livre?'':'ocupada'}">${livre?('#'+rfMjCamisa(v)):'OCUPADA'}</span>
    </button>`;
  }).join('');

  const cfgLbl=(cfg&&cfg.label&&cfg.label[e.divisao])||('Série '+e.divisao);
  return `<div class="rf-mj-col">
    <div class="rf-mj-bloco">
      <span class="rf-mj-rot">DIVISÃO</span>
      <div class="rf-mj-divs">${divs}</div>
    </div>
    <div class="rf-mj-bloco">
      <div class="rf-mj-bloco-hd">
        <span class="rf-mj-rot">CLUBE</span>
        <span class="rf-mj-mono">${escC(cfgLbl.toUpperCase())} · SÓ CLUBES COM VAGA</span>
      </div>
      ${clubes?`<div class="rf-mj-clubes">${clubes}</div>`
        :`<span class="rf-note">${e.carregando?'Carregando os clubes…':'Escolha uma divisão.'}</span>`}
    </div>
    ${e.clubId?`<div class="rf-mj-bloco">
      <div class="rf-mj-bloco-hd">
        <span class="rf-mj-rot">VAGA NO ELENCO</span>
        <span class="rf-mj-mono">4 POR CLUBE · ${livres} ${livres===1?'LIVRE':'LIVRES'}</span>
      </div>
      ${vagas?`<div class="rf-mj-linhas">${vagas}</div>`
        :`<span class="rf-note">${e.carregando?'Carregando…':'Sem vagas neste clube.'}</span>`}
    </div>`:''}
  </div>`;
}

/* ---- o passo do assistente ---- */
function rfObMeuJogador(){
  const e=rfMjEstado();
  if(!e.clubes.length && !e.carregando) rfMjSetDivisao(e.divisao);
  const corpo=`
    <div class="rf-mj-wrap">
      ${rfMjEscolhasHTML()}
      ${rfMjFigurinhaHTML()}
    </div>
    ${e.erro?`<div class="rf-mj-erro">${escC(e.erro)}</div>`:''}
    <div class="rf-mj-pe">
      <span class="rf-mj-pe-estado" data-mj-estado>${escC(rfMjFalta())}</span>
      <button type="button" class="rf-mj-bt-br" onclick="rfMjDepois()">Fazer isso depois</button>
      <button type="button" class="rf-mj-bt-cta ${rfMjPronto()?'':'travado'}" data-mj-cta
        ${rfMjPronto()?'':'disabled'} onclick="rfMjEnviar()">
        ${rfMjPronto()?'Criar meu jogador':'Complete os passos'}</button>
    </div>`;
  return rfWiz({
    trilha:'solo', passo:rfPasso('Seu jogador','solo'),
    topoDir:'<span class="rf-mj-emb">🏅 EMBAIXADOR</span>',
    sobre:'BENEFÍCIO DE EMBAIXADOR',
    titulo:'Coloque o seu nome no pack oficial do jogo.',
    sub:'Escolha o clube e a vaga no elenco, mande a sua foto e escreva o nome que vai na camisa. Depois da nossa revisão, ele entra no jogo de todo mundo.',
    corpo, semAcao:true });
}

/* ---- a versao de dentro do jogo (Treinador > Meu jogador) ---- */
function rfMjHTML(){
  const e=rfMjEstado();
  if(!rfMjEhEmbaixador()){
    return rfCol(rfCard('O seu jogador na base oficial', `
      <div class="rf-empty">Pôr o seu nome e a sua cara num jogador da base é do plano
        <b>Embaixador</b>. Ele nasce nos elencos, é escalado, leva cartão e faz gol nos jogos
        de todos os outros treinadores.</div>
      <div class="rf-mj-pe"><button type="button" class="rf-mj-bt-cta"
        onclick="rfPlanoCta('embaixador',null,'mes')">Quero ser Embaixador</button></div>`));
  }
  if(e.minha===undefined || (e.minha===null && !e._perguntou)){ e._perguntou=true; rfMjCarregarMinha(); }
  if(e.minha){
    const m=e.minha;
    const st={ pendente:['Em análise','A gente revisa o nome e a foto antes de entrarem na base de todo mundo — em até 48 horas.'],
               aprovado:['Aprovado','Ele já está no pack oficial: aparece nos saves novos, de todos os treinadores.'],
               rejeitado:['Recusado', m.motivo||'Sem motivo registado.'] }[m.status]||['—',''];
    return rfCol(rfCard('O seu jogador na base oficial', `
      <div class="rf-mj-minha">
        <div class="rf-mj-minha-foto">${m.foto_url?`<img src="${escC(m.foto_url)}" alt="">`:'👤'}</div>
        <div class="rf-mj-minha-id">
          <span class="rf-mj-minha-n">${escC(m.nome||m.nome_base||'')}</span>
          <span class="rf-mj-minha-c">${escC(rfMjNomeClube(m.club_id, m.clube_nome))} · ${escC((RF_MJ_POS[m.posicao]||{}).nome||'')} · força ${m.forca}</span>
          <span class="rf-mj-selo ${escC(m.status)}">${escC(st[0])}</span>
        </div>
      </div>
      <span class="rf-note">${escC(st[1])}</span>
      <span class="rf-note">Ele entra nos saves <b>novos</b>. Um save já em andamento tem o elenco
        congelado dentro dele, então lá o nome antigo continua até a próxima carreira.</span>
      <div class="rf-mj-pe">
        <button type="button" class="rf-mj-bt-br" onclick="rfMjLargar()">Largar a vaga</button>
      </div>`));
  }
  if(!e.clubes.length && !e.carregando) rfMjSetDivisao(e.divisao);
  return rfCol(rfCard('O seu jogador na base oficial', `
    <div class="rf-mj-wrap">${rfMjEscolhasHTML()}${rfMjFigurinhaHTML()}</div>
    ${e.erro?`<div class="rf-mj-erro">${escC(e.erro)}</div>`:''}
    <div class="rf-mj-pe">
      <span class="rf-mj-pe-estado" data-mj-estado>${escC(rfMjFalta())}</span>
      <button type="button" class="rf-mj-bt-cta ${rfMjPronto()?'':'travado'}" data-mj-cta
        ${rfMjPronto()?'':'disabled'} onclick="rfMjEnviar()">
        ${rfMjPronto()?'Criar meu jogador':'Complete os passos'}</button>
    </div>`));
}
