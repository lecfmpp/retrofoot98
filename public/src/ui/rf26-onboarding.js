/* =====================================================================
   RetroFoot98 — ONBOARDING (rebranding 2026)
   Portado da marcação de docs/rebranding-2026/telas/Onboarding 1..7.

   POR QUE ESTE ARQUIVO EXISTE, EM VEZ DE MAIS CSS EM CIMA DO wizShell():
   a primeira tentativa repelou o shell antigo e manteve a estrutura dele
   (barra de título do Windows, navbar de páginas institucionais, rodapé
   escuro de SEO, contador "N / 7"). A tela de referência não tem nada
   disso: tem marca à esquerda, uma TRILHA DE CINCO PASSOS num card branco,
   um card de conteúdo e uma barra de ação embaixo. Repelar não chegava lá —
   a estrutura tinha que ser outra.

   A TRILHA TEM CINCO PASSOS, não sete: Entrar · Modo · Configurar ·
   Sorteio · Jogar. As sete TELAS do pacote se distribuem nesses cinco
   marcos (as três de configuração — país/ligas, criar sala, convites —
   dividem o passo 3). É o que a referência mostra em todas elas.
   ===================================================================== */

const RF_WIZ_PASSOS=['Entrar','Modo','Configurar','Sorteio','Jogar'];

/* ---- envelope: marca + trilha + card + barra de ação ---- */
function rfWiz(o){
  o=o||{};
  return `<div class="rf-wiz">
    <div class="rf-wiz-in">
      <div class="rf-wiz-marca">
        <img src="img/logo.webp" width="32" height="32" alt="RetroFoot98">
        <span class="rf-wiz-marca-t">RetroFoot<span class="rf-wiz-marca-98">98</span></span>
        <div class="rf-sp"></div>
        ${o.topoDir||''}
      </div>
      <div class="rf-wiz-shell">
        ${rfWizTrilhaHTML(o.passo||1)}
        <div class="rf-wiz-card">${o.corpo||''}</div>
      </div>
      <div class="rf-wiz-acao">
        ${o.nota?`<span class="rf-wiz-nota">${escC(o.nota)}</span>`:''}
        <div class="rf-sp"></div>
        ${o.voltar?`<button type="button" class="rf-wiz-b2" onclick="${o.voltar}">${escC(o.voltarLabel||'Voltar')}</button>`:''}
        ${o.cta?`<button type="button" class="rf-wiz-cta" ${o.ctaOff?'disabled':''} onclick="${o.ctaOn||''}">${escC(o.cta)}</button>`:''}
      </div>
    </div>
  </div>`;
}
function rfWizTrilhaHTML(passo){
  // a mesma peça serve os dois formatos: no desktop ela é a trilha numerada;
  // no telefone o CSS esconde os passos e usa --rf-wiz-pct como fita de progresso
  const pct=Math.round(100*passo/RF_WIZ_PASSOS.length);
  return `<div class="rf-wiz-trilha" style="--rf-wiz-pct:${pct}"
      role="progressbar" aria-valuenow="${passo}" aria-valuemin="1" aria-valuemax="${RF_WIZ_PASSOS.length}"
      aria-label="Passo ${passo} de ${RF_WIZ_PASSOS.length}: ${escC(RF_WIZ_PASSOS[passo-1]||'')}">${RF_WIZ_PASSOS.map((l,i)=>{
    const n=i+1, feito=n<passo, atual=n===passo;
    return `${i?'<span class="rf-wiz-liga"></span>':''}
      <span class="rf-wiz-p ${feito?'feito':''} ${atual?'atual':''}">
        <span class="rf-wiz-n">${feito?'✓':n}</span>
        <span class="rf-wiz-l">${escC(l)}</span>
      </span>`;
  }).join('')}</div>`;
}
/* cabeçalho do card: sobrancelha em mono, título grande, subtítulo */
function rfWizHead(sobre, titulo, sub){
  return `<div class="rf-wiz-head">
    ${sobre?`<span class="rf-wiz-eyebrow">${escC(sobre)}</span>`:''}
    <span class="rf-wiz-h">${escC(titulo)}</span>
    ${sub?`<span class="rf-wiz-sub">${escC(sub)}</span>`:''}
  </div>`;
}
/* campo de formulário: rótulo em cima, controle de 44px embaixo */
function rfCampo(rotulo, input){
  return `<label class="rf-campo"><span class="rf-campo-l">${escC(rotulo)}</span>${input}</label>`;
}
function rfInput(id, ph, valor, tipo, oninput){
  return `<input class="rf-campo-c" id="${id}" type="${tipo||'text'}" placeholder="${escC(ph||'')}"
    value="${escC(valor||'')}" ${oninput?`oninput="${oninput}"`:''}>`;
}

/* =====================================================================
   1 · ENTRAR
   ===================================================================== */
function rfOb1(){
  const a=CL.auth||(CL.auth={mode:'signup',name:CL.mgr||'',email:'',password:''});
  const criando=a.mode!=='login';
  const pronto=!!(a.email&&a.password&&(!criando||a.name));
  const corpo=`
    ${rfWizHead('Bem-vindo, treinador','Crie sua conta e entre no jogo.',
      'Seus saves ficam na nuvem — dá para começar no computador e continuar no telefone.')}
    <div class="rf-wiz-mid">
      <div class="rf-wiz-form">
        <div class="rf-seg">
          <button type="button" class="rf-seg-b ${criando?'on':''}" onclick="rfObAuthMode('signup')">Criar conta</button>
          <button type="button" class="rf-seg-b ${criando?'':'on'}" onclick="rfObAuthMode('login')">Entrar</button>
        </div>
        ${criando?rfCampo('Nome do treinador', rfInput('rf-ob-n','como te chamam',a.name,'text',"rfObSet('name',this.value)")):''}
        ${rfCampo('E-mail', rfInput('rf-ob-e','voce@email.com',a.email,'email',"rfObSet('email',this.value)"))}
        ${rfCampo('Senha', rfInput('rf-ob-s','mínimo 8 caracteres',a.password,'password',"rfObSet('password',this.value)"))}
        ${criando?`<div class="rf-check" onclick="rfObSet('aviso',!(CL.auth.aviso))">
          <span class="rf-check-b ${a.aviso!==false?'on':''}">${a.aviso!==false?'✓':''}</span>
          <span class="rf-check-t">Quero receber aviso quando abrir vaga nas Ligas Oficiais.</span>
        </div>`:''}
        <div class="rf-ou"><i></i><span>ou entre com</span><i></i></div>
        <div class="rf-social">
          <button type="button" class="rf-social-b" onclick="rfObSocial('google')">Google</button>
          <button type="button" class="rf-social-b" onclick="rfObSocial('discord')">Discord</button>
        </div>
      </div>
    </div>`;
  return rfWiz({passo:1, corpo,
    nota:'A gente só usa seu e-mail para o save e para avisar da vaga.',
    cta: criando?'Criar conta e continuar':'Entrar e continuar',
    ctaOff:!pronto, ctaOn: criando?'clLoginSignup()':'clLoginDo()'});
}
function rfObAuthMode(m){ CL.auth=CL.auth||{}; CL.auth.mode=m; cdraw(); }
function rfObSet(k,v){ CL.auth=CL.auth||{}; CL.auth[k]=v; if(k==='aviso') cdraw(); else rfObSyncCta(); }
/* o CTA liga/desliga sem redesenhar: redesenhar a cada tecla tira o foco do campo */
function rfObSyncCta(){
  const b=document.querySelector('.rf-wiz-cta'); if(!b) return;
  const a=CL.auth||{}; const criando=a.mode!=='login';
  b.disabled=!(a.email&&a.password&&(!criando||a.name));
}
function rfObSocial(qual){ toastC('Entrar com '+qual+' — em breve.','info'); }

/* =====================================================================
   2 · MODO
   ===================================================================== */
function rfOb2(){
  const corpo=`
    ${rfWizHead('Como você quer jogar','Comece a sua carreira contra a máquina.',
      RESENHA_EM_BREVE
        ? 'O Modo Resenha, para jogar com a turma, chega em breve. Na beta, o Solo já está completo.'
        : 'Você pode mudar de modo depois, a qualquer momento.')}
    <div class="rf-modos">
      <div class="rf-modo rec" onclick="clPickSolo()">
        <span class="rf-modo-tag rec">Recomendado</span>
        <span class="rf-modo-ic">🛋️</span>
        <span class="rf-modo-t">Modo Solo</span>
        <span class="rf-modo-d">Pega um clube da Série D e sobe até a elite no seu ritmo. Mercado, finanças e o calendário completo de copas — sem depender de ninguém entrar na sala.</span>
      </div>
      <div class="rf-modo ${RESENHA_EM_BREVE?'off':''}" ${RESENHA_EM_BREVE?'':'onclick="clPickResenha()"'}>
        <span class="rf-modo-tag">${RESENHA_EM_BREVE?'Em breve':'Online'}</span>
        <span class="rf-modo-ic">🍺</span>
        <span class="rf-modo-t">Modo Resenha</span>
        <span class="rf-modo-d">Monte a liga do grupo do trabalho ou da comunidade. Até 20 treinadores jogam a mesma rodada ao vivo, com tabela, mercado e zoeira no chat.</span>
        ${RESENHA_EM_BREVE?`<div class="rf-modo-lock">🔒 Não disponível na versão beta — previsão de lançamento em <b>novembro</b>.</div>
          <button type="button" class="rf-modo-avisar" onclick="rfObAvisar()">Avise-me no lançamento</button>`:''}
      </div>
    </div>`;
  return rfWiz({passo:2, corpo, nota:'Toque num cartão para continuar.',
    voltar:'clGoAbertura()', voltarLabel:'Voltar'});
}
function rfObAvisar(){ toastC('Beleza — a gente te avisa quando o Modo Resenha abrir.','success'); }

/* =====================================================================
   3 · PAÍS E LIGAS
   ===================================================================== */
function rfOb3(){
  const paises=(typeof COUNTRY_LIST==='function')?COUNTRY_LIST():[];
  const sel=CL.countries||new Set();
  const corpo=`
    ${rfWizHead('Onde você vai treinar','Escolha o país e a divisão de entrada.',
      'Dá para acompanhar mais de um país — as ligas extras rodam em segundo plano e abrem o mercado.')}
    <div class="rf-paises">${paises.map(p=>`
      <div class="rf-pais ${sel.has(p.n)?'on':''} ${p.on?'':'off'}"
           ${p.on?`onclick="clToggleCountry('${escC(p.n)}')"`:''}>
        <span class="rf-pais-f">${p.f}</span>
        <span class="rf-pais-n">${escC(p.n)}</span>
        <span class="rf-pais-q">${p.on?(p.teams+' clubes'):'em breve'}</span>
      </div>`).join('')}</div>
    <div class="rf-sep"></div>
    <span class="rf-label-t">Divisão de entrada</span>
    <div class="rf-divs">${['A','B','C','D'].map(d=>`
      <button type="button" class="rf-div ${computeStartDivision()===d?'on':''}" onclick="clToggleDivision('${d}')">
        <span class="rf-div-n">${escC(divisionLabelOf(d))}</span>
        <span class="rf-div-s">${d==='D'?'começo de carreira':d==='A'?'a elite':'meio do caminho'}</span>
      </button>`).join('')}</div>`;
  return rfWiz({passo:3, corpo, nota:'Você pode mudar de país num save novo.',
    voltar:'clGoModo()', cta:'Continuar', ctaOn:'clPaisesOk()',
    ctaOff:!(sel && sel.size)});
}

/* =====================================================================
   4 · CRIAR SALA (só Resenha)
   ===================================================================== */
function rfOb4(){
  const sala=CL.sala||(CL.sala={nome:'',ritmo:'Ultrassônico',quem:'codigo'});
  const corpo=`
    ${rfWizHead('Sua sala','Monte a sala da sua turma.',
      'O código é o convite: quem tiver ele entra. Você pode trocar o ritmo depois, no meio da temporada.')}
    <div class="rf-wiz-mid"><div class="rf-wiz-form">
      ${rfCampo('Nome da sala', rfInput('rf-sala-n','Resenha da firma',sala.nome,'text',"rfObSala('nome',this.value)"))}
      ${rfCampo('Código', `<span class="rf-codigo">${escC((typeof NET!=='undefined'&&NET.code)||'——————')}</span>`)}
      <span class="rf-label-t">Ritmo da rodada</span>
      <div class="rf-ritmos">${['Curto','Médio','Longo','Ultrassônico'].map(r=>`
        <button type="button" class="rf-chip ${sala.ritmo===r?'on':''}" onclick="rfObSala('ritmo','${r}')">${escC(r)}</button>`).join('')}</div>
      <span class="rf-label-t">Quem pode entrar</span>
      <div class="rf-ritmos">
        <button type="button" class="rf-chip ${sala.quem==='codigo'?'on':''}" onclick="rfObSala('quem','codigo')">Quem tiver o código</button>
        <button type="button" class="rf-chip ${sala.quem==='aprovar'?'on':''}" onclick="rfObSala('quem','aprovar')">Só quem eu aprovar</button>
      </div>
    </div></div>`;
  return rfWiz({passo:3, corpo, nota:'A sala fica aberta até você começar a temporada.',
    voltar:'clGoModo()', cta:'Criar sala', ctaOn:'clCriarSala&&clCriarSala()'});
}
function rfObSala(k,v){ CL.sala=CL.sala||{}; CL.sala[k]=v; cdraw(); }

/* =====================================================================
   5 · CONVITES (só Resenha)
   ===================================================================== */
function rfOb5(){
  const parts=((typeof NET!=='undefined'&&NET.room&&NET.room.participants)||[]);
  const corpo=`
    ${rfWizHead('Chame a turma','Convide os treinadores.',
      'Cada um escolhe o clube no sorteio. A temporada começa quando você mandar.')}
    <div class="rf-conv">
      <div class="rf-conv-l">
        <span class="rf-label-t">Na sala · ${parts.length}</span>
        <div class="rf-conv-list">${parts.length?parts.map(p=>`
          <div class="rf-conv-i">
            <span class="rf-conv-av">${escC(String(p.name||'?').slice(0,1).toUpperCase())}</span>
            <span class="rf-conv-n">${escC(p.name||'')}</span>
            <span class="rf-conv-s">${p.ready?'pronto':'à espera'}</span>
          </div>`).join(''):'<span class="rf-note">Ninguém entrou ainda. Manda o código.</span>'}</div>
      </div>
      <div class="rf-conv-r">
        <span class="rf-label-t">Convidar</span>
        <div class="rf-acoes">
          <button type="button" class="rf-acao primaria" onclick="clInviteResenha()">🔗 Copiar convite</button>
          <button type="button" class="rf-acao" onclick="clInviteResenha()">💬 WhatsApp</button>
        </div>
        <div class="rf-sep"></div>
        <span class="rf-label-t">Chat da sala</span>
        <div class="rf-conv-chat">${(typeof chatMsgsHTML==='function')?chatMsgsHTML():''}</div>
      </div>
    </div>`;
  return rfWiz({passo:3, corpo, nota:'Dá para começar com quem já entrou.',
    voltar:'clGoModo()', cta:'Começar temporada', ctaOn:'clComecarTemporada&&clComecarTemporada()'});
}

/* =====================================================================
   6 · SORTEIO DO CLUBE
   ===================================================================== */
function rfOb6(){
  const d=(CL.draw||[])[0];
  const cl=d?clubOf(d.clubId):null;
  const sq=cl?squad(d.clubId):[];
  const forca=sq.length?Math.round(sq.reduce((s,p)=>s+(p.f||0),0)/sq.length):0;
  const corpo=`
    ${rfWizHead('O sorteio decidiu', cl?('Você é o '+cl.short+'.'):'Sorteando o seu clube…',
      cl?'É com ele que a sua carreira começa. Elenco, caixa e calendário já estão de pé.':'Um instante.')}
    ${cl?`<div class="rf-sorteio">
      <div class="rf-sorteio-crest">${rfCrest(cl,88)}</div>
      <div class="rf-sorteio-id">
        <span class="rf-sorteio-n">${escC(cl.short)}</span>
        <span class="rf-sorteio-s">${universeFlag()} ${escC(universeCountryName())} · ${escC(divisionLabel())}</span>
      </div>
      <div class="rf-sorteio-kpis">
        ${rfKpiHTML('Elenco', String(sq.length), 'jogadores')}
        ${rfKpiHTML('Força média', String(forca), 'do plantel')}
        ${rfKpiHTML('Em caixa', fmt(S.budget||0), 'para a temporada')}
      </div>
    </div>`:''}`;
  return rfWiz({passo:4, corpo, nota:'O clube é sorteado uma vez por save.',
    cta:'Conhecer o clube', ctaOn:'clEntrar()'});
}

/* =====================================================================
   7 · BOAS-VINDAS
   ===================================================================== */
function rfOb7(){
  const cl=clubOf(CL.clubId)||{short:'—'};
  const sq=squad(CL.clubId);
  const forca=sq.length?Math.round(sq.reduce((s,p)=>s+(p.f||0),0)/sq.length):0;
  const st=(typeof myStadium==='function')?myStadium():null;
  const cap=(st&&st.capacity)||(typeof STAND_START!=='undefined'?STAND_START:0);
  const corpo=`
    ${rfWizHead('A diretoria fala','Bem-vindo ao '+cl.short+', treinador.',
      'O contrato está assinado. A torcida quer subir de série — o resto é com você.')}
    <div class="rf-bv">
      <div class="rf-bv-estadio">${rfCrest(cl,64)}</div>
      <div class="rf-bv-kpis">
        ${rfKpiHTML('Elenco', String(sq.length), 'jogadores')}
        ${rfKpiHTML('Força média', String(forca), 'do plantel')}
        ${rfKpiHTML('Estádio', grp(cap), 'lugares')}
        ${rfKpiHTML('Em caixa', fmt(S.budget||0), 'para a temporada')}
      </div>
      <div class="rf-bv-recado">
        <span class="rf-label-t">Recado da diretoria</span>
        <p class="rf-bv-p">Time montado, caixa no azul e calendário fechado. O objetivo da temporada é o acesso — e a gente sabe que a Série D não perdoa. Boa sorte.</p>
      </div>
    </div>`;
  return rfWiz({passo:5, corpo, nota:'Você pode rever isso em Equipa.',
    cta:'⚽ Entrar no jogo', ctaOn:'clBoasVindasContinuar()'});
}
