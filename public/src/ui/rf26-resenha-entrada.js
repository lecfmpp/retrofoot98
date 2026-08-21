/* =====================================================================
   RetroFoot98 — A ENTRADA DA RESENHA
   Portado de "Resenha - Entrar com Codigo" e "Resenha - Minhas Salas"
   (desktop e mobile — o pacote traz os dois, com o MESMO markup; o que
   muda é a régua sumir e a linha da sala empilhar abaixo de 900px, e
   isso é CSS, não um segundo desenho).

   Estas duas telas viviam em src/net/local-transport.js — um módulo de
   REDE — desenhadas pelo wizShell() de 98. É por isso que nenhuma
   varredura de tela as tinha tocado.

   O QUE O DESENHO PEDE E O SAVE NÃO TEM (nada inventado):
   · "3 de 4 jogaram" / "à espera dos treinadores 2/4" — a contagem de
     assentos por sala exigiria uma consulta a mais por linha; o texto
     entra sem o número.
   · o escudo sai de clubOf(clubId), e clubId só existe depois de a
     pessoa ter assento. Antes disso a linha mostra o nome da SALA, que
     é o que existe.
   ===================================================================== */

/* ---------- leitura de uma sala: um só lugar ----------
   Os dois ecrãs mostram a mesma sala com detalhe diferente; se cada um
   derivasse o estado por conta própria, um diria "a correr" e o outro
   "à espera" para a mesma linha. */
const RF_SALA_SELO={
  espera:  {t:'À ESPERA',  c:'espera'},
  comecar: {t:'A COMEÇAR', c:'comecar'},
  correr:  {t:'A CORRER',  c:'correr'},
  fim:     {t:'ENCERRADA', c:'fim'},
};
function rfSalaEstado(r){
  r=r||{};
  const cl=r.clubId && typeof clubOf==='function' ? clubOf(r.clubId) : null;
  const nome=(cl && (cl.short||cl.name)) || r.name || r.code || '—';
  const papel=r.isHost ? 'anfitrião' : 'convidado';
  const jornada=r.round ? (r.round+'ª rodada') : '';
  let selo, onde, chama=false;
  if(r.pending){ selo='espera'; onde='convite pendente'; chama=true; }
  else if(r.phase==='finished'){ selo='fim'; onde='sala encerrada'; }
  else if(r.phase==='running'){
    /* `pronto` vem do is_ready do MEU assento (ver netListMyRooms). Falso = a
       rodada está parada à minha espera, e é isso que a pessoa precisa ver. */
    if(r.pronto===false){ selo='espera'; onde=(jornada?rodada+' · ':'')+'a sua vez'; chama=true; }
    else { selo='correr'; onde=rodada||'a correr'; }
  }
  else if(r.phase==='ready'){ selo='comecar'; onde='a começar · escolha do clube'; }
  else { selo='espera'; onde='à espera dos treinadores'; chama=true; }   // lobby
  /* `curto` = o estado SEM a rodada, para as telas que ja mostram a rodada
     numa coluna propria (ver "Resenha - Comecar"): la, "2a rodada · a sua vez"
     ao lado de "2a rodada" dizia a mesma coisa duas vezes. */
  const curto = chama ? (r.pending?'convite pendente'
                       : (r.phase==='running'?'à espera de você':'à espera dos treinadores'))
                      : '';
  return { clube:nome, temClube:!!cl, curto,
           escudo:(cl&&typeof clubCrestUrl==='function')?clubCrestUrl(cl):null,
           papel, onde, selo:RF_SALA_SELO[selo], chama };
}
function rfSalasOrdenadas(){
  /* quem chama primeiro: as que esperam por si. Dentro de cada grupo, a mais nova. */
  return (CL.net&&CL.net.myRooms||[]).slice().sort((a,b)=>{
    const ca=rfSalaEstado(a).chama?0:1, cb=rfSalaEstado(b).chama?0:1;
    if(ca!==cb) return ca-cb;
    return new Date(b.createdAt||0) - new Date(a.createdAt||0);
  });
}
function rfSalaEscudoHTML(e){
  return e.escudo
    ? `<img class="rf-rs-escudo" src="${escC(e.escudo)}" alt="" width="26" height="26">`
    : `<span class="rf-rs-escudo vazio" aria-hidden="true">${escC(String(e.clube||'?').slice(0,1))}</span>`;
}

/* =====================================================================
   1 · ENTRAR COM CÓDIGO
   ===================================================================== */
/* O CONVIDADO TEM RÉGUA PRÓPRIA. Quem entra por código não escolhe país nem
   convida ninguém — o anfitrião já fez isso. O caminho dele é Entrar · Modo ·
   Código · Sala, e é isso que o pacote desenha ("PASSO 3 DE 4 · CONVIDADO").
   Fica em RF_TRILHAS junto das outras duas (ver main.js). */
const RF_CODIGO_TAM=5;                 // os códigos do jogo têm cinco caracteres

function rfCodigoCaixasHTML(codigo){
  const c=String(codigo||'').toUpperCase();
  let caixas='';
  for(let i=0;i<RF_CODIGO_TAM;i++){
    const ch=c[i]||'';
    caixas+=`<span class="rf-cod-cx ${ch?'cheia':''}" aria-hidden="true">${escC(ch)}</span>`;
  }
  /* Um <input> REAL por baixo das cinco caixas, transparente e a ocupar tudo:
     as caixas são só pintura. Cinco inputs separados obrigariam a gerir foco,
     colagem e apagar entre campos — e quebrariam o preenchimento automático
     do link de convite, que escreve o código inteiro de uma vez. */
  return `<label class="rf-cod-campo">
    <span class="rf-cod-l">CÓDIGO DA RESENHA</span>
    <span class="rf-cod-caixas">
      ${caixas}
      <input id="cl-focus" class="rf-cod-in" type="text" inputmode="latin" autocomplete="off"
        autocapitalize="characters" spellcheck="false" maxlength="${RF_CODIGO_TAM}"
        aria-label="Código da Resenha" value="${escC(c)}"
        oninput="rfCodigoDigita(this)" onkeydown="if(event.key==='Enter')clJoinCodeGo()">
    </span>
    <span class="rf-cod-d">Cinco caracteres. O anfitrião te passa por WhatsApp ou pelo link do convite.</span>
  </label>`;
}
/* NÃO redesenha a tela a cada tecla: cdraw() reconstrói o <input> e o cursor
   salta para o início (ver docs — é o erro que já apareceu noutros campos).
   Aqui só as caixas e o rodapé são repintados, e o input fica onde está. */
function rfCodigoDigita(el){
  const v=rfCodigoLimpa(el.value);
  el.value=v;
  CL.net=CL.net||{}; CL.net.code=v;
  /* mexeu no codigo: o aviso da tentativa anterior deixa de valer. Sem cdraw aqui -- o campo
     que se redesenha a cada tecla perde o cursor (ver rfCodigoCaixasHTML). */
  if(CL.net.erro){ CL.net.erro=null; const b=document.querySelector('.rf-rs-erro'); if(b) b.remove(); }
  document.querySelectorAll('.rf-cod-cx').forEach((cx,i)=>{
    cx.textContent=v[i]||''; cx.classList.toggle('cheia', !!v[i]);
  });
  const falta=RF_CODIGO_TAM-v.length;
  const nota=document.querySelector('.rf-wiz-nota');
  if(nota) nota.textContent = falta>0
    ? ('Falta'+(falta===1?'':'m')+' '+falta+' caracter'+(falta===1?'':'es')+'.')
    : 'Código completo.';
  const cta=document.querySelector('.rf-wiz-cta');
  if(cta) cta.disabled = v.length<RF_CODIGO_TAM;
}

function rfEntrarCodigoHTML(){
  CL.net=CL.net||{};
  const codigo=String(CL.net.code||'').toUpperCase();
  const falta=RF_CODIGO_TAM-codigo.length;
  const salas=rfSalasOrdenadas();
  const mostra=salas.slice(0,2);

  const lista = salas.length ? `
    <div class="rf-rs-jajoga">
      <span class="rf-cod-l">SALAS QUE VOCÊ JÁ JOGA</span>
      ${mostra.map(r=>{ const e=rfSalaEstado(r); return `
        <button type="button" class="rf-rs-mini" onclick="clJoinMyRoom('${escC(r.code)}',${r.pending?'true':'false'})">
          ${rfSalaEscudoHTML(e)}
          <span class="rf-rs-mini-id">
            <span class="rf-rs-mini-n">${escC(e.clube)}</span>
            <span class="rf-rs-mini-s ${e.chama?'chama':''}">${escC(e.onde)}</span>
          </span>
          <span class="rf-rs-cod">${escC(r.code)}</span>
        </button>`; }).join('')}
      ${salas.length>mostra.length
        ? `<button type="button" class="rf-rs-ver" onclick="CL.net.step='minhassalas';cdraw()">Ver as ${salas.length} salas…</button>`
        : ''}
    </div>` : '';

  /* o motivo de a ultima tentativa ter falhado fica AQUI, escrito, ate a pessoa mexer no
     codigo (ver clRequestOrJoin) -- antes era so um toast que sumia em tres segundos */
  const erro = CL.net.erro ? `<div class="rf-rs-erro">
      <span class="rf-rs-erro-i" aria-hidden="true">⚠</span>
      <span class="rf-rs-erro-t">${escC(CL.net.erro)}</span>
    </div>` : '';

  const corpo=`
    ${rfCodigoCaixasHTML(codigo)}
    ${erro}
    <div class="rf-rs-dica">
      <span class="rf-rs-dica-i" aria-hidden="true">🔗</span>
      <span class="rf-rs-dica-t">Recebeu um link? Abra que o código entra sozinho.</span>
    </div>
    ${lista}`;

  return rfWiz({
    trilha:'convidado', passo:rfPasso('Código','convidado'), contexto:'Convidado',
    titulo:'Entrar numa Resenha',
    sub:'Quem define país, divisão e ritmo é o anfitrião. Você entra direto na sala.',
    corpo,
    voltar:'clResenhaBackChoice()', voltarLabel:'‹ Voltar ao modo',
    nota: falta>0 ? ('Falta'+(falta===1?'':'m')+' '+falta+' caracter'+(falta===1?'':'es')+'.') : 'Código completo.',
    cta:'✔ Entrar na sala', ctaOn:'clJoinCodeGo()',
    ctaOff: codigo.length<RF_CODIGO_TAM });
}

/* =====================================================================
   2 · MINHAS SALAS
   ===================================================================== */
/* SEM RÉGUA, COM PASTILHA. O pacote tira a régua daqui: esta tela não é um
   passo do caminho, é uma gaveta a que se volta de qualquer ponto. A pastilha
   ("7 SALAS · 3 COMO ANFITRIÃO") diz o tamanho da coisa. */
const RF_SALAS_FILTROS=[
  {k:'todas',   l:'Todas'},
  {k:'espera',  l:'À espera de você'},
  {k:'correr',  l:'A correr'},
  {k:'fim',     l:'Encerradas'},
];
function rfSalasFiltro(k){ CL.net=CL.net||{}; CL.net.filtro=k; cdraw(); }
function rfSalasPassaFiltro(r, k){
  if(!k || k==='todas') return true;
  const e=rfSalaEstado(r);
  if(k==='espera') return e.chama;
  if(k==='correr') return e.selo===RF_SALA_SELO.correr || e.selo===RF_SALA_SELO.comecar;
  if(k==='fim')    return e.selo===RF_SALA_SELO.fim;
  return true;
}

function rfMinhasSalasHTML(){
  CL.net=CL.net||{};
  const todas=rfSalasOrdenadas();
  const filtro=CL.net.filtro||'todas';
  const salas=todas.filter(r=>rfSalasPassaFiltro(r,filtro));
  const anfitriao=todas.filter(r=>r.isHost).length;
  const chamam=todas.filter(r=>rfSalaEstado(r).chama);
  const primeira=chamam[0];

  const cabecalho=`<div class="rf-rs-tab-h">
    <span></span><span>CLUBE</span><span>ONDE ESTÁ</span><span></span>
    <span class="dir">CÓDIGO</span><span></span></div>`;

  const linhas = salas.length ? salas.map(r=>{ const e=rfSalaEstado(r); return `
    <div class="rf-rs-lin" role="button" tabindex="0"
      onclick="clJoinMyRoom('${escC(r.code)}',${r.pending?'true':'false'})"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();clJoinMyRoom('${escC(r.code)}',${r.pending?'true':'false'})}">
      ${rfSalaEscudoHTML(e)}
      <span class="rf-rs-id">
        <span class="rf-rs-n">${escC(e.clube)}</span>
        <span class="rf-rs-p">${escC(e.papel)}</span>
      </span>
      <span class="rf-rs-onde">${escC(e.onde)}</span>
      <span class="rf-rs-selo ${e.selo.c}">${escC(e.selo.t)}</span>
      <span class="rf-rs-cod">${escC(r.code)}</span>
      <button type="button" class="rf-rs-lixo" title="${r.isHost?'Apagar sala':'Sair da sala'}"
        onclick="event.stopPropagation();clDeleteRoom('${escC(r.code)}',${r.isHost?'true':'false'})">${rfIcone('apagar',14)}</button>
    </div>`; }).join('')
    : `<div class="rf-rs-vazio">Nenhuma sala neste filtro.</div>`;

  const corpo=`
    <div class="rf-rs-filtros">${RF_SALAS_FILTROS.map(f=>
      `<button type="button" class="rf-rs-f ${f.k===filtro?'on':''}" onclick="rfSalasFiltro('${f.k}')">${escC(f.l)}</button>`).join('')}</div>
    ${cabecalho}
    <div class="rf-rs-lista">${linhas}</div>
    <button type="button" class="rf-rs-nova" onclick="clGoNovaSala()">
      <span class="rf-rs-nova-i" aria-hidden="true">＋</span>
      <span class="rf-rs-nova-id">
        <span class="rf-rs-nova-t">Criar uma sala nova</span>
        <span class="rf-rs-nova-s">Você vira o anfitrião e convida os amigos</span>
      </span>
    </button>`;

  return rfWiz({
    semTrilha:true,
    sobre: todas.length+' SALA'+(todas.length===1?'':'S')+(anfitriao?(' · '+anfitriao+' COMO ANFITRIÃO'):''),
    titulo:'Minhas salas',
    sub:'As resenhas em que você joga ou foi convidado. Toque numa para continuar.',
    corpo,
    voltar:'clResenhaBackChoice()', voltarLabel:'‹ Voltar',
    nota: chamam.length
      ? (chamam.length+' sala'+(chamam.length===1?'':'s')+' espera'+(chamam.length===1?'':'m')+' por você.')
      : 'Nenhuma sala à sua espera agora.',
    /* "Entrar na do Vasco" e a frase do pacote, e so funciona com nome de CLUBE.
       Sem assento reivindicado o nome que existe e o da SALA, e o "do" produzia
       "Entrar na do Resenha da firma". */
    cta: primeira
      ? (rfSalaEstado(primeira).temClube
          ? ('Entrar na do '+rfSalaEstado(primeira).clube)
          : ('Entrar na '+rfSalaEstado(primeira).clube))
      : 'Criar uma sala nova',
    ctaCurto: primeira ? 'Entrar' : 'Criar sala',
    ctaOn: primeira
      ? `clJoinMyRoom('${primeira.code}',${primeira.pending?'true':'false'})`
      : 'clGoNovaSala()' });
}

/* =====================================================================
   3 · COMEÇAR NO MODO RESENHA  ("Onboarding 2c - Resenha Comecar")
   A tela que abre quando se escolhe Modo Resenha: três caminhos (criar,
   entrar por código, voltar a uma sala), mais os dois atalhos — colar o
   código sem sair daqui, e a lista das salas ativas com "Voltar".

   TETO REAL: 20, não 8. O pacote desenha o selo "ATÉ 8 TREINADORES" e o
   motor aceita 20 participantes por sala (ver `teto` em rfOb5). Imprimir
   8 seria anunciar um limite que não existe, então o selo diz 20.

   "3/4 jogaram" do pacote não entra: a contagem de assentos por sala
   exigiria uma consulta por linha. O que entra é o que se sabe — "à
   espera de você" quando a rodada está parada no seu assento.
   ===================================================================== */
/* ===== O TETO DA SALA SAI DO MOTOR, NAO DO DESENHO =====
   A sala tem UM ASSENTO POR CLUBE DA DIVISAO — e por isso o teto e o tamanho
   da divisao, nao um numero fixo. Hoje as quatro Series do Brasil tem 20, mas
   a Championship tem 24 e a Bundesliga 18 (ver UNI_CONFIGS.size); escrever 20
   a mao seria repetir noutro numero o erro do "ate 8" que o pacote trazia.
   Confirmado no banco: o maximo real de assentos por sala e 20, igual ao
   tamanho da Serie D, que e onde a Resenha comeca (RESENHA_START_DIV). */
function rfSalaTeto(room){
  room = room || (typeof NET!=='undefined' && NET.room) || null;
  /* 1) sala montada: o numero de assentos e o proprio pool de clubes */
  const assentos = room && (room.seatCount
    || (Array.isArray(room.seats) && room.seats.length)
    || (Array.isArray(room.clubs) && room.clubs.length));
  if(assentos) return assentos;
  /* 2) antes de existir sala: o tamanho da divisao onde ela vai comecar */
  const div = (room && (room.division || room.div))
    || (typeof RESENHA_START_DIV!=='undefined' ? RESENHA_START_DIV : 'D');
  return (typeof DIVISION_SIZE!=='undefined' && DIVISION_SIZE[div]) || 20;
}

/* ===== O ALFABETO DO CODIGO TAMBEM =====
   generate_room_code() no banco sorteia de ABCDEFGHJKLMNPQRSTUVWXYZ23456789:
   SEM I, O, 0 e 1, tirados por serem confundiveis entre si. O filtro aceitava
   [A-Z0-9], ou seja, deixava digitar quatro caracteres que nenhum codigo real
   pode conter. */
const RF_CODIGO_ALFA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RF_CODIGO_RE=new RegExp('[^'+RF_CODIGO_ALFA+']','g');
function rfCodigoLimpa(v){
  return String(v||'').toUpperCase().replace(RF_CODIGO_RE,'').slice(0,RF_CODIGO_TAM);
}

function rfResenhaComecarHTML(){
  CL.net=CL.net||{};
  const todas=rfSalasOrdenadas();
  const ativas=todas.filter(r=>r.phase!=='finished');
  const codigo=String(CL.net.code||'').toUpperCase();

  const cartao=(o)=>`
    <button type="button" class="rf-rc-card ${o.destaque?'on':''}" onclick="${o.on}">
      <span class="rf-rc-ic" aria-hidden="true">${o.ic}</span>
      <span class="rf-rc-t">${escC(o.t)}</span>
      <span class="rf-rc-d">${escC(o.d)}</span>
      <span class="rf-rc-selo ${o.destaque?'forte':''}">${escC(o.selo)}</span>
    </button>`;

  const cartoes=[
    cartao({ic:'🍺', t:'Criar uma sala', on:'clResenhaCreate()', destaque:true,
      d:'Você é o anfitrião: escolhe divisão, ritmo e quem entra.',
      selo:'ATÉ '+rfSalaTeto()+' TREINADORES'}),
    cartao({ic:'🔑', t:'Entrar com código', on:'clResenhaJoinPrompt()',
      d:'Alguém te passou um código de '+RF_CODIGO_TAM+' caracteres. Cole e entre direto.',
      selo:'ENTRADA IMEDIATA'}),
  ];
  /* o terceiro cartão só existe se houver a que voltar */
  if(ativas.length) cartoes.push(cartao({ic:'📂', t:'Voltar a uma sala',
    on:"CL.net.step='minhassalas';cdraw()",
    d:'Continue numa resenha que você já joga.',
    selo:ativas.length+' SALA'+(ativas.length===1?'':'S')+' ATIVA'+(ativas.length===1?'':'S')}));

  const colar=`
    <div class="rf-rc-colar">
      <span class="rf-rc-l">TEM UM CÓDIGO? COLE AQUI</span>
      <div class="rf-rc-colar-lin">
        <input class="rf-rc-in" type="text" inputmode="latin" autocomplete="off"
          autocapitalize="characters" spellcheck="false" maxlength="${RF_CODIGO_TAM}"
          aria-label="Código da Resenha" placeholder="7KP2M" value="${escC(codigo)}"
          oninput="rfComecarColar(this)" onkeydown="if(event.key==='Enter')rfComecarEntrar()">
        <button type="button" class="rf-rc-bt" onclick="rfComecarEntrar()"
          ${codigo.length<RF_CODIGO_TAM?'disabled':''}>Entrar na sala</button>
      </div>
    </div>`;

  const lista = ativas.length ? `
    <div class="rf-rc-salas">
      <div class="rf-rc-salas-h">
        <span class="rf-rc-l">AS SUAS SALAS ATIVAS</span>
        <span class="rf-rc-conta">${ativas.length} sala${ativas.length===1?'':'s'}</span>
      </div>
      ${ativas.map((r,i)=>{ const e=rfSalaEstado(r); return `
        <div class="rf-rc-lin ${i===0?'on':''}" role="button" tabindex="0"
          onclick="clJoinMyRoom('${escC(r.code)}',${r.pending?'true':'false'})"
          onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();clJoinMyRoom('${escC(r.code)}',${r.pending?'true':'false'})}">
          ${rfSalaEscudoHTML(e)}
          <span class="rf-rc-id">
            <span class="rf-rc-n">${escC(r.name||e.clube)}</span>
            <span class="rf-rc-sub">${escC(r.code)}${e.temClube?(' · '+escC(e.clube)):''}<span class="rf-rc-sub-jor">${escC(r.round?(' · '+r.round+'ª rodada'):'')}</span></span>
          </span>
          <span class="rf-rc-jor">${escC(r.round?(r.round+'ª rodada'):'')}</span>
          <span class="rf-rc-est ${e.chama?'chama':''}">${escC(e.curto)}</span>
          <span class="rf-rc-volta ${i===0?'forte':''}">Voltar</span>
        </div>`; }).join('')}
    </div>` : '';

  const total=rfTrilhaDe('resenha').length;
  return rfWiz({
    trilha:'resenha', passo:rfPasso('Modo','resenha'),
    /* o pacote põe o contexto ANTES do passo ("MODO RESENHA · PASSO 2 DE 7");
       o número continua a sair da régua, não da mão. */
    sobre:'MODO RESENHA · PASSO '+rfPasso('Modo','resenha')+' DE '+total,
    titulo:'Criar ou entrar numa sala?',
    sub:'Monte a sua resenha ou entre na de um amigo com o código dele.',
    corpo:`<div class="rf-rc-cards">${cartoes.join('')}</div>
      <div class="rf-rc-baixo">${colar}${lista}</div>`,
    voltar:'clGoModo()', voltarLabel:'‹ Voltar ao modo',
    nota:'A sala fica aberta até a temporada acabar — dá para sair e voltar.',
    cta:'Criar a minha sala', ctaCurto:'Criar sala', ctaOn:'clResenhaCreate()' });
}
/* como no campo das cinco caixas: sem cdraw() por tecla, senão o cursor salta */
function rfComecarColar(el){
  const v=rfCodigoLimpa(el.value);
  el.value=v;
  CL.net=CL.net||{}; CL.net.code=v;
  /* mexeu no codigo: o aviso da tentativa anterior deixa de valer. Sem cdraw aqui -- o campo
     que se redesenha a cada tecla perde o cursor (ver rfCodigoCaixasHTML). */
  if(CL.net.erro){ CL.net.erro=null; const b=document.querySelector('.rf-rs-erro'); if(b) b.remove(); }
  const bt=document.querySelector('.rf-rc-bt'); if(bt) bt.disabled=v.length<RF_CODIGO_TAM;
}
function rfComecarEntrar(){
  const c=String((CL.net&&CL.net.code)||'');
  if(c.length<RF_CODIGO_TAM) return;
  CL.net.intent='join';
  if(typeof clJoinCodeGo==='function') clJoinCodeGo();
}
