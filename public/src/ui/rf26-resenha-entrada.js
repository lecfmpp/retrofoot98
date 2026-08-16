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
  const jornada=r.round ? (r.round+'ª jornada') : '';
  let selo, onde, chama=false;
  if(r.pending){ selo='espera'; onde='convite pendente'; chama=true; }
  else if(r.phase==='finished'){ selo='fim'; onde='sala encerrada'; }
  else if(r.phase==='running'){
    /* `pronto` vem do is_ready do MEU assento (ver netListMyRooms). Falso = a
       rodada está parada à minha espera, e é isso que a pessoa precisa ver. */
    if(r.pronto===false){ selo='espera'; onde=(jornada?jornada+' · ':'')+'a sua vez'; chama=true; }
    else { selo='correr'; onde=jornada||'a correr'; }
  }
  else if(r.phase==='ready'){ selo='comecar'; onde='a começar · escolha do clube'; }
  else { selo='espera'; onde='à espera dos treinadores'; chama=true; }   // lobby
  return { clube:nome, temClube:!!cl,
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
  const v=String(el.value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,RF_CODIGO_TAM);
  el.value=v;
  CL.net=CL.net||{}; CL.net.code=v;
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

  const corpo=`
    ${rfCodigoCaixasHTML(codigo)}
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
    ctaOn: primeira
      ? `clJoinMyRoom('${primeira.code}',${primeira.pending?'true':'false'})`
      : 'clGoNovaSala()' });
}
