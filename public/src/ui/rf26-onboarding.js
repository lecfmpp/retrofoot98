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

   A trilha e o porquê dos cinco passos estão no comentário do
   RF_WIZ_PASSOS, logo abaixo.
   ===================================================================== */

/* A TRILHA TEM CINCO PASSOS: Entrar · Modo · Configurar · Sorteio · Jogar.
   Foi de cinco pra seis quando as telas do fluxo de entrada (leva 4) chegaram
   com a trilha aberta, e voltou pra cinco quando o pacote do onboarding
   completo mostrou as SETE telas do assistente — todas com estes cinco marcos,
   e o contador do telefone dizendo "2 de 5". As telas de moeda, carregamento,
   nº de treinadores e escolha dos clubes caem dentro de "Configurar", que é o
   que a ordem do LEIA-ME descreve (1 → 2 → 3 → moeda → carregando → 6 → 7). */
const RF_WIZ_PASSOS=['Entrar','Modo','Configurar','Sorteio','Jogar'];

/* ---- envelope: marca + trilha + card + barra de ação ----
   O CABEÇALHO É DESENHADO DUAS VEZES, de propósito. No desktop ele mora
   dentro do card branco, centrado; no telefone o pacote o move pra dentro da
   faixa azul, junto da marca e da barra de progresso. Como CSS não move nó de
   um contêiner pro outro, os dois saem do mesmo texto e o CSS esconde o que
   não é daquela largura. */
function rfWiz(o){
  o=o||{};
  const passo=o.passo||1, total=RF_WIZ_PASSOS.length;
  const cabeca=(o.titulo||o.sobre||o.sub)
    ? rfWizHead(o.sobre,o.titulo,o.sub) : '';
  return `<div class="rf-wiz">
    <div class="rf-wiz-in">
      <div class="rf-wiz-marca">
        <img src="img/logo.webp" width="32" height="32" alt="RetroFoot98">
        <span class="rf-wiz-marca-t">RetroFoot<span class="rf-wiz-marca-98">98</span></span>
        <div class="rf-sp"></div>
        ${o.topoDir||''}
      </div>
      ${o.semTrilha?'':`<div class="rf-wiz-fita">
        <div class="rf-wiz-fita-l">
          <img src="img/logo.webp" width="28" height="28" alt="">
          <span class="rf-wiz-fita-m">RetroFoot<span class="rf-wiz-fita-98">98</span></span>
          <div class="rf-sp"></div>
          <span class="rf-wiz-fita-c">${passo} de ${total}</span>
        </div>
        <div class="rf-wiz-fita-b">${RF_WIZ_PASSOS.map((_,i)=>
          `<i class="${i<passo?'on':''}"></i>`).join('')}</div>
        ${cabeca?`<div class="rf-wiz-fita-t">
          <span class="rf-wiz-fita-h">${escC(o.titulo||'')}</span>
          ${o.sub?`<span class="rf-wiz-fita-s">${escC(o.sub)}</span>`:''}
        </div>`:''}
      </div>`}
      <div class="rf-wiz-shell">
        ${o.semTrilha?'':rfWizTrilhaHTML(passo)}
        <div class="rf-wiz-card">${cabeca}${o.corpo||''}</div>
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
  return `<div class="rf-wiz-trilha"
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
    <div class="rf-wiz-mid">
      <div class="rf-wiz-form">
        <div class="rf-seg">
          <button type="button" class="rf-seg-b ${criando?'on':''}" onclick="rfObAuthMode('signup')">Criar conta</button>
          <button type="button" class="rf-seg-b ${criando?'':'on'}" onclick="rfObAuthMode('login')">Entrar</button>
        </div>
        ${criando?rfCampo('Nome do treinador', rfInput('rf-ob-n','Gringo',a.name,'text',"rfObSet('name',this.value)")):''}
        ${rfCampo('E-mail', rfInput('rf-ob-e','voce@email.com',a.email,'email',"rfObSet('email',this.value)"))}
        ${rfCampo('Senha', rfInput('rf-ob-s','mínimo 8 caracteres',a.password,'password',"rfObSet('password',this.value)"))}
        ${criando?`<div class="rf-check" onclick="rfObSet('aviso',!(CL.auth.aviso))">
          <span class="rf-check-b ${a.aviso!==false?'on':''}">${a.aviso!==false?'✓':''}</span>
          <span class="rf-check-t">Quero receber aviso quando abrir vaga nas Ligas Oficiais.</span>
        </div>`:''}
        <div class="rf-ou"><i></i><span>ou entre com</span><i></i></div>
        <div class="rf-social">
          <button type="button" class="rf-social-b" onclick="rfObSocial('Google')">Google</button>
          <button type="button" class="rf-social-b" onclick="rfObSocial('Discord')">Discord</button>
        </div>
      </div>
    </div>`;
  return rfWiz({passo:1, corpo,
    sobre:'Bem-vindo, treinador', titulo:'Crie sua conta e entre no jogo.',
    sub:'Seus saves ficam na nuvem — dá para começar no computador e continuar no telefone.',
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
   Os dois cartões são FOTO com véu (ver .rf-modo em rf26.css) — é a única
   coisa desta tela que não sai da referência, por decisão do usuário.
   O resto é o do pacote, incluindo o acordeão dos saves na nuvem.
   ===================================================================== */
function rfOb2(){
  const corpo=`
    <div class="rf-modos">
      <div class="rf-modo solo rec" onclick="clPickSolo()">
        <img class="rf-modo-bg" src="img/modos/modo-solo.webp" alt="" aria-hidden="true" loading="lazy">
        <div class="rf-modo-veu"></div>
        <div class="rf-modo-txt">
          <span class="rf-modo-tag rec">Recomendado</span>
          <span class="rf-modo-t">Modo Solo</span>
          <span class="rf-modo-d">Pega um clube da Série D e sobe até a elite no seu ritmo. Mercado, finanças e o calendário completo de copas — sem depender de ninguém entrar na sala.</span>
          <button type="button" class="rf-modo-cta" onclick="event.stopPropagation();clPickSolo()">⚽ Começar agora</button>
        </div>
      </div>
      <div class="rf-modo resenha ${RESENHA_EM_BREVE?'off':''}" ${RESENHA_EM_BREVE?'':'onclick="clPickResenha()"'}>
        <img class="rf-modo-bg" src="img/modos/modo-resenha.webp" alt="" aria-hidden="true" loading="lazy">
        <div class="rf-modo-veu"></div>
        <div class="rf-modo-txt">
          <span class="rf-modo-tag">${RESENHA_EM_BREVE?'Em novembro':'Online'}</span>
          <span class="rf-modo-t">Modo Resenha</span>
          <span class="rf-modo-d">Monte a liga do grupo do trabalho ou da comunidade. Até 20 treinadores jogam a mesma rodada ao vivo, com tabela, mercado e zoeira no chat.</span>
          <button type="button" class="rf-modo-cta" onclick="event.stopPropagation();${RESENHA_EM_BREVE?'rfObAvisar()':'clPickResenha()'}">${RESENHA_EM_BREVE?'👑 Entrar na lista de espera':'🍺 Criar a sala'}</button>
        </div>
      </div>
    </div>
    ${rfObSavesHTML()}`;
  return rfWiz({passo:2, corpo,
    sobre:'Como você quer jogar', titulo:'Comece a sua carreira contra a máquina.',
    sub:RESENHA_EM_BREVE
      ? 'O Modo Resenha, para jogar com a turma, chega em novembro. Na beta, o Solo já está completo.'
      : 'Você pode mudar de modo depois, a qualquer momento.',
    nota:'Toque num cartão para continuar.',
    voltar:'clGoAbertura()', voltarLabel:'Voltar',
    cta:'Continuar no Modo Solo', ctaOn:'clPickSolo()'});
}
/* ACORDEÃO DOS SAVES NA NUVEM. A lista chega assíncrona (NET.listSoloSaves),
   então enquanto CL.soloSaves for null o bloco diz que está carregando em vez
   de sumir e reaparecer. Aberto/fechado mora em CL.obSavesOpen. */
function rfObSavesHTML(){
  const carregando=CL.soloSaves==null;
  const saves=(CL.soloSaves||[]).slice()
    .sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
  if(!carregando && !saves.length) return '';
  const aberto=CL.obSavesOpen!==false;
  const n=saves.length;
  return `<div class="rf-obsv">
    <div class="rf-obsv-hd" onclick="rfObSaves()" role="button" tabindex="0">
      <span class="rf-obsv-i">📁</span>
      <span class="rf-obsv-id">
        <span class="rf-obsv-t">Continuar um jogo salvo</span>
        <span class="rf-obsv-s">${carregando?'Procurando os seus saves…'
          :`Você tem ${n} jogo${n>1?'s':''} salvo${n>1?'s':''} na nuvem.`}</span>
      </span>
      <span class="rf-obsv-ver">${aberto?'Esconder':'Ver saves'} <i>${aberto?'▴':'▾'}</i></span>
    </div>
    ${aberto&&saves.length?`<div class="rf-obsv-head">
        <span></span><span>SAVE</span><span>JORNADA</span><span>GRAVADO</span><span></span></div>
      ${saves.map(sv=>{
        const c=rfObSaveClube(sv);
        return `<div class="rf-obsv-lin">
          ${c?`<span class="rf-obsv-crest">${rfCrest(c,26)}</span>`:'<span class="rf-obsv-crest"></span>'}
          <span class="rf-obsv-nid">
            <span class="rf-obsv-n">${escC(sv.name)}</span>
            <span class="rf-obsv-c">${escC(rfObSaveOnde(sv))}</span></span>
          <span class="rf-obsv-j">${escC(rfObSaveJornada(sv))}</span>
          <span class="rf-obsv-q">${escC(rfSaveQuando(sv))}</span>
          <button type="button" class="rf-obsv-b" onclick="event.stopPropagation();clLoadSave('${escC(sv.name)}')">Continuar</button>
        </div>`;}).join('')}
      <button type="button" class="rf-obsv-ger" onclick="clSoloContinue()">Gerenciar saves na nuvem</button>`:''}
  </div>`;
}
function rfObSaves(){ CL.obSavesOpen=(CL.obSavesOpen===false); cdraw(); }
/* O QUE O SAVE SABE DE SI. A listagem da nuvem devolve nome e updated_at; o
   clube, a divisão e a jornada só existem se o registro tiver o resumo. Sem
   ele, a linha mostra o que tem e cala o resto — nada de clube inventado. */
function rfObSaveClube(sv){
  const id=sv.clubId||sv.club_id||(sv.meta&&sv.meta.clubId);
  return id?(anyClubOf(id)||null):null;
}
function rfObSaveOnde(sv){
  const c=rfObSaveClube(sv);
  const div=sv.division||sv.div||(sv.meta&&sv.meta.division);
  const partes=[c&&c.short, div&&((typeof divisionLabelOf==='function')?divisionLabelOf(div):('Série '+div))];
  return partes.filter(Boolean).join(' · ')||'save na nuvem';
}
function rfObSaveJornada(sv){
  const r=sv.round!=null?sv.round:(sv.meta&&sv.meta.round);
  return r!=null?((r+1)+'ª jornada'):'—';
}

/* =====================================================================
   3 · PAÍS E LIGAS
   Três blocos: país PRINCIPAL (um só — é onde você treina), divisão de
   entrada e ligas de FUNDO (várias — rodam em segundo plano e abrem o
   mercado). São dois estados diferentes no jogo (CL.playCountry e
   CL.countries) que antes esta tela juntava num grid só.
   ===================================================================== */
function rfOb3(){
  const lista=(typeof COUNTRY_LIST==='function')?COUNTRY_LIST():[];
  const jogaveis=lista.filter(c=>c.on);
  const principal=CL.playCountry||'Brasil';
  const fundo=CL.countries||(CL.countries=new Set([principal]));
  const uk=(typeof countryUniverseKey==='function')?countryUniverseKey(principal):null;
  const cfg=(typeof UNI_CONFIGS!=='undefined'&&uk)?UNI_CONFIGS[uk]:null;
  const divs=(cfg&&cfg.order)||['A','B','C','D'];
  const entrada=(typeof computeStartDivision==='function')?computeStartDivision():'D';
  /* a divisão de entrada é travada no clássico (todo mundo começa embaixo);
     só o modo de teste libera a escolha — ver computeStartDivision */
  const livre=(typeof TESTING_FREE_DIVISION_PICK!=='undefined')&&TESTING_FREE_DIVISION_PICK;
  const corpo=`
    <div class="rf-ob3">
      <div class="rf-ob3-bloco">
        <span class="rf-label-t">País principal</span>
        <div class="rf-ob3-paises">${jogaveis.map(c=>{
          const on=principal===c.n;
          return `<button type="button" class="rf-ob3-pais ${on?'on':''}" onclick="rfObPais('${escC(c.n)}')">
            <span class="rf-ob3-f">${c.f}</span>
            <span class="rf-ob3-n">${escC(c.n)}</span>
            ${on?'<span class="rf-ob3-ok">✓</span>':''}
          </button>`;}).join('')}</div>
      </div>
      <div class="rf-ob3-bloco">
        <span class="rf-label-t">Divisão em que você começa</span>
        <div class="rf-ob3-divs">${divs.map(d=>{
          const on=entrada===d, lbl=(cfg&&cfg.label&&cfg.label[d])||('Série '+d);
          const qtd=(cfg&&cfg.size&&cfg.size[d])||0;
          return `<button type="button" class="rf-ob3-div ${on?'on':''} ${livre?'':'travada'}"
            ${livre?`onclick="rfObDivisao('${d}')"`:'disabled'}>
            <span class="rf-ob3-dn">${escC(lbl)}</span>
            <span class="rf-ob3-dq">${qtd?qtd+' clubes':''}</span>
          </button>`;}).join('')}</div>
        ${livre?'':'<span class="rf-note">No clássico todo mundo começa embaixo e sobe jogando.</span>'}
      </div>
      <div class="rf-ob3-bloco">
        <span class="rf-label-t">Ligas de fundo <i class="rf-ob3-leve">— aparecem em Campeonatos e no mercado</i></span>
        <div class="rf-ob3-pills">${jogaveis.filter(c=>c.n!==principal).map(c=>`
          <button type="button" class="rf-chip ${fundo.has(c.n)?'on':''}"
            onclick="clToggleCountry('${escC(c.n)}')">${c.f} ${escC(c.n)}</button>`).join('')}</div>
      </div>
    </div>`;
  const qtdEntrada=(cfg&&cfg.size&&cfg.size[entrada])||0;
  const lblEntrada=(cfg&&cfg.label&&cfg.label[entrada])||('Série '+entrada);
  return rfWiz({passo:3, corpo,
    sobre:'Onde você vai treinar', titulo:'Escolha o país. O clube é sempre sorteado.',
    sub:'Você escolhe o país e a divisão em que quer começar; o clube sai no sorteio — é assim para todo mundo, inclusive na resenha.',
    nota:`Clube sorteado: ${lblEntrada} · ${principal}${qtdEntrada?' · '+qtdEntrada+' clubes no pote':''}`,
    voltar:'clGoModo()', cta:'Sortear meu clube', ctaOn:'clPaisesOk()'});
}
function rfObPais(n){
  CL.playCountry=n;
  CL.countries=CL.countries||new Set();
  CL.countries.add(n);        // o país principal está sempre no save
  cdraw();
}
function rfObDivisao(d){ CL.testStartDiv=CL.testStartDiv||{}; CL.testStartDiv.brasil=d; cdraw(); }

/* =====================================================================
   4 · CRIAR SALA (só Resenha) — substitui scSalaHost()
   ===================================================================== */
const RF_RITMOS=['Calmo','Normal','Ultrassônico','Usain Bolt'];
const RF_ENTRADAS=[['convite','Só com convite'],['codigo','Qualquer um com o código'],['aprovar','Aprovar cada entrada']];
function rfOb4(){
  const n=CL.net||(CL.net={});
  const sala=CL.sala||(CL.sala={ritmo:'Ultrassônico',quem:'codigo'});
  const codigo=(typeof NET!=='undefined'&&NET.code)||n.code||'——————';
  const pais=CL.playCountry||'Brasil';
  const uk=(typeof countryUniverseKey==='function')?countryUniverseKey(pais):null;
  const cfg=(typeof UNI_CONFIGS!=='undefined'&&uk)?UNI_CONFIGS[uk]:null;
  const d=(typeof computeStartDivision==='function')?computeStartDivision():'D';
  const divLbl=((cfg&&cfg.label&&cfg.label[d])||('Série '+d))
    +(((cfg&&cfg.size&&cfg.size[d])||0)?' · '+cfg.size[d]+' clubes':'');
  const bandeira=(typeof flagImg==='function')?flagImg(pais):'';
  const vagas=((typeof NET!=='undefined'&&NET.room&&NET.room.participants)||[]).length||1;
  const teto=20;
  const corpo=`
    <div class="rf-ob4">
      <div class="rf-ob4-form">
        ${rfCampo('Nome da sala',
          `<input class="rf-campo-c" id="cl-focus" maxlength="18" placeholder="Resenha do trampo"
             value="${escC(n.roomName||'')}" oninput="CL.net.roomName=this.value;rfOb4Sync()"
             onkeydown="if(event.key==='Enter')clOpenRoom()">`)}
        <div class="rf-ob4-2">
          ${rfCampo('País', `<span class="rf-campo-c leitura">${bandeira} ${escC(pais)}</span>`)}
          ${rfCampo('Divisão', `<span class="rf-campo-c leitura">${escC(divLbl)}</span>`)}
        </div>
        <div class="rf-ob4-bloco">
          <span class="rf-campo-l">Tempo de jogo <i class="rf-ob3-leve">— o Camarote trava no Usain Bolt</i></span>
          <div class="rf-ob3-pills">${RF_RITMOS.map(r=>`
            <button type="button" class="rf-chip ${sala.ritmo===r?'on':''}" onclick="rfObSala('ritmo','${r}')">${escC(r)}</button>`).join('')}</div>
        </div>
        <div class="rf-ob4-bloco">
          <span class="rf-campo-l">Quem pode entrar</span>
          <div class="rf-ob3-pills">${RF_ENTRADAS.map(([k,l])=>`
            <button type="button" class="rf-chip ${sala.quem===k?'on':''}" onclick="rfObSala('quem','${k}')">${escC(l)}</button>`).join('')}</div>
        </div>
        <!-- salaTestDivRow() ficou de fora: é marcação do skin antigo e só existe
             no modo de teste, onde o passo 3 já traz o mesmo seletor de divisão. -->
      </div>
      <div class="rf-ob-escuro">
        <span class="rf-ob-esc-l">Código da sala</span>
        <span class="rf-ob-codigo">${escC(codigo)}</span>
        <span class="rf-ob-esc-p">Quem tiver esse código entra direto na sua liga.</span>
        <div class="rf-ob-esc-h"></div>
        <div class="rf-ob-esc-lin"><span>Vagas</span><b>${vagas} / ${teto}</b></div>
        <div class="rf-ob-esc-bar"><i style="width:${Math.round(vagas/teto*100)}%"></i></div>
        <button type="button" class="rf-ob-esc-b" onclick="rfObCopiar('${escC(codigo)}')">📋 Copiar código</button>
      </div>
    </div>`;
  return rfWiz({passo:3, corpo,
    sobre:'Modo Resenha', titulo:'Monte a sua sala.',
    sub:'Você é o anfitrião: define o país, o ritmo da rodada e quem entra. Todo mundo joga a mesma rodada ao vivo.',
    nota:'Você pode mudar tudo isso antes de a primeira rodada começar.',
    voltar:'clBackConta()', cta:'Criar sala e convidar', ctaOff:!n.roomName, ctaOn:'clOpenRoom()'});
}
function rfObSala(k,v){ CL.sala=CL.sala||{}; CL.sala[k]=v; cdraw(); }
function rfOb4Sync(){ const b=document.querySelector('.rf-wiz-cta'); if(b) b.disabled=!CL.net.roomName; }
function rfObCopiar(txt){
  try{ navigator.clipboard.writeText(txt); toastC('Copiado: '+txt,'success'); }
  catch(e){ toastC('Copie à mão: '+txt,'info'); }
}

/* =====================================================================
   5 · CONVITES (só Resenha) — substitui scLobby()
   A referência desenha a lista, os dois botões de convite, o cartão do
   link e o chat. O lobby de verdade tem MAIS do que isso — busca por
   usuário, pedidos de entrada para aprovar e remoção de treinador — e
   nada disso foi cortado: entra nesta mesma coluna, na ordem em que a
   pessoa precisa (pedidos primeiro, porque seguram a sala).
   ===================================================================== */
function rfOb5(){
  const room=(typeof NET!=='undefined')?NET.room:null;
  if(!room) return rfWiz({passo:3, corpo:'<span class="rf-note">A ligar à sala…</span>',
    sobre:'Modo Resenha', titulo:'Sala', voltar:'clLobbyExit()', voltarLabel:'Sair da sala'});
  const anfitriao=NET.isHost;
  if(anfitriao && typeof clStartHostReqPoll==='function') clStartHostReqPoll();
  else if(typeof clStartLobbyPoll==='function') clStartLobbyPoll();
  const parts=room.participants||[];
  const prontos=parts.filter(p=>p.confirmed).length;
  const pedidos=(CL.pendingJoins&&CL.pendingJoins.length)||0;
  const link=(typeof NET.inviteLink==='function')?NET.inviteLink():'';
  const corpo=`
    <div class="rf-ob5">
      <div class="rf-ob5-l">
        ${anfitriao&&pedidos?`<div class="rf-ob5-pedidos">
          <div class="rf-label"><span class="rf-label-t">Pedidos de entrada</span>
            <span class="rf-ob5-badge">${pedidos}</span></div>
          ${(typeof clReqRowsHTML==='function')?clReqRowsHTML():''}
        </div>`:''}
        <div class="rf-label"><span class="rf-label-t">Treinadores na sala</span>
          <span class="rf-label-r">${parts.length} / 20</span></div>
        ${parts.map(p=>{
          const eu=p.id===NET.self.id;
          return `<div class="rf-ob5-lin ${p.host?'anf':''}">
            <span class="rf-ob5-av">${escC(String(p.name||'?').slice(0,1).toUpperCase())}</span>
            <span class="rf-ob5-id">
              <span class="rf-ob5-n">${escC(p.name||'—')}${p.host?' <i class="rf-ob5-selo">ANFITRIÃO</i>':''}${eu&&!p.host?' <i>(você)</i>':''}</span>
              <span class="rf-ob5-c">🎲 clube sorteado na próxima tela</span></span>
            <span class="rf-ob5-st ${p.confirmed?'ok':''}">${p.confirmed?'● na sala':'○ a entrar…'}</span>
            ${anfitriao&&!eu?`<button type="button" class="rf-ob5-x" onclick="clKick('${escC(p.id)}','${escC(p.clubId||'')}')">Remover</button>`:'<span></span>'}
          </div>`;}).join('')}
        ${anfitriao?`<div class="rf-ob5-conv">
          <div class="rf-ob5-cv">
            <span class="rf-campo-l">✉ Por e-mail</span>
            <div class="rf-ob5-cvl">
              <input class="rf-campo-c" type="email" placeholder="email@exemplo.com"
                value="${escC(CL.net.inviteEmail||'')}" oninput="CL.net.inviteEmail=this.value">
              <button type="button" class="rf-btn rf-btn-secondary" onclick="clEmailInvite()">Enviar</button>
            </div>
          </div>
          <div class="rf-ob5-cv">
            <span class="rf-campo-l">🟢 Por WhatsApp</span>
            <div class="rf-ob5-cvl">
              <span class="rf-ob5-ddi">+55</span>
              <input class="rf-campo-c" inputmode="numeric" placeholder="DDD + número"
                value="${escC(CL.net.phone||'')}"
                oninput="CL.net.phone=this.value.replace(/\D/g,'');this.value=CL.net.phone">
              <button type="button" class="rf-ob5-zap" onclick="clWaInvite()">Chamar</button>
            </div>
          </div>
          <div class="rf-ob5-cv">
            <span class="rf-campo-l">🔍 Quem já tem conta</span>
            <input id="cl-usersearch-input" class="rf-campo-c" placeholder="Buscar por nome ou e-mail (mín. 3 letras)"
              oninput="clUserSearch(this.value)">
            <div id="cl-usersearch-results" class="cl-usersearch-results"></div>
          </div>
        </div>`:''}
      </div>
      <div class="rf-ob5-r">
        <div class="rf-ob-escuro">
          <span class="rf-ob-esc-l">Link da sala</span>
          <span class="rf-ob-esc-link">${escC(link||('código '+(room.code||'')))}</span>
          <button type="button" class="rf-ob-esc-b" onclick="rfObCopiar('${escC(link||room.code||'')}')">📋 Copiar link</button>
        </div>
        ${CHAT_ATIVO?`<div class="rf-ob5-chat">
          <span class="rf-label-t">Chat da sala</span>
          <div class="rf-ob5-msgs" id="cl-chat-msgs-lobby">${(typeof chatMsgsHTML==='function'&&chatMsgsHTML())||'<span class="rf-note">Nenhuma mensagem ainda. Diga oi! 👋</span>'}</div>
          <input id="cl-chat-input-lobby" class="rf-campo-c" placeholder="Manda a braba…"
            onkeydown="clChatKey(event,'cl-chat-input-lobby')">
        </div>`:''}
      </div>
    </div>`;
  const podeComecar=anfitriao && parts.length>=2;
  return rfWiz({passo:3, corpo,
    sobre:`Sala ${escC(room.code||'')}${room.name?' · '+escC(room.name):''}`,
    titulo:'Chama a galera.',
    sub:'A rodada só começa quando todo mundo estiver pronto. Cada treinador escolhe o país; o clube é sorteado na hora.',
    nota: anfitriao
      ? (podeComecar?`${prontos} de ${parts.length} treinadores na sala · o sorteio é na próxima tela`
                    :'Convide pelo menos mais 1 treinador pra começar.')
      : 'À espera do anfitrião — toque em Sincronizar se ele já começou.',
    voltar:'clLobbyExit()', voltarLabel:'Sair da sala',
    cta: anfitriao?'⚽ Começar a temporada':'🔄 Sincronizar',
    ctaOff: anfitriao&&!podeComecar,
    ctaOn: anfitriao?'clLobbyStart()':'clSyncResenha()'});
}

/* =====================================================================
   6 · SORTEIO DO CLUBE
   ===================================================================== */
function rfOb6(){
  const d=CL.soloDraw||null;
  const lista=(d&&d.list)||((CL.draw||[]).map(x=>({name:x.name,clubId:x.clubId})));
  const feitos=d?d.idx:lista.length;
  const total=lista.length||1;
  const poolById=(d&&d.poolById)||{};
  const doPool=id=>poolById[id]||(typeof anyClubOf==='function'?anyClubOf(id):null);
  const meu=lista[0]?doPool(lista[0].clubId):null;
  const sq=meu&&typeof squad==='function'?squad(lista[0].clubId):[];
  const uk=(typeof universeCountryName==='function')?universeCountryName():'';
  const corpo=`
    <div class="rf-ob6">
      <div class="rf-ob6-l">
        <span class="rf-label-t">Clubes sorteados</span>
        ${lista.map((x,i)=>{
          const saiu=i<feitos, c=saiu?doPool(x.clubId):null;
          return `<div class="rf-ob6-lin ${i===0&&saiu?'meu':''} ${saiu?'':'espera'}">
            <span class="rf-ob6-nb ${saiu?'on':''}">${i+1}</span>
            <span class="rf-ob6-t">${escC(x.name||'Treinador')}${saiu&&c?' — '+escC(c.short||c.name||''):' — sorteando…'}</span>
            ${saiu&&c?`<span class="rf-ob6-crest">${rfCrest(c,24)}</span>`:'<span class="rf-ob6-bola">⚽</span>'}
          </div>`;}).join('')}
        <div class="rf-ob6-prog">
          <div class="rf-pz-trilho"><div class="rf-pz-fill" style="width:${Math.round(feitos/total*100)}%"></div></div>
          <span class="rf-ob6-pc">${feitos} / ${total}</span>
        </div>
      </div>
      <div class="rf-ob6-r">
        <div class="rf-ob-escuro centro">
          <span class="rf-ob-esc-l">O seu clube</span>
          ${meu?`<span class="rf-ob6-crestg">${rfCrest(meu,70)}</span>
            <span class="rf-ob6-n">${escC(meu.short||meu.name||'')}</span>
            <span class="rf-ob6-d">${escC(((typeof divisionLabel==='function')?divisionLabel():'')+' · '+(S.season||''))}</span>
            <div class="rf-ob-esc-h"></div>
            <div class="rf-ob-esc-lin"><span>Elenco</span><b>${sq.length} jogadores</b></div>
            <div class="rf-ob-esc-lin"><span>Caixa</span><b>${escC(fmt(S.budget||0))}</b></div>
            <div class="rf-ob-esc-lin"><span>País</span><b>${escC(uk)}</b></div>`
          :`<span class="rf-ob6-bolag">⚽</span>
            <span class="rf-ob6-n">Sorteando…</span>
            <span class="rf-ob6-d">Boa sorte, treinador.</span>`}
        </div>
        <span class="rf-note rf-ob6-nota">A cerimônia acelera se você tocar em ⏩ — mas a bola é a mesma.</span>
      </div>
    </div>`;
  const fim=feitos>=total;
  return rfWiz({passo:4, corpo,
    sobre:'Cerimônia do sorteio',
    titulo: fim?'Times sorteados!':'Sorteando os clubes… boa sorte!',
    sub:'Cada treinador escolheu o país; o clube sai no sorteio. É a mesma cerimônia no solo e na resenha.',
    nota: fim?'Pronto — pode entrar no clube.':'Aguarde o sorteio…',
    cta: fim?'Conhecer o clube':'⏩ Acelerar',
    ctaOn: fim?'clEntrar()':'rfObAcelerar()'});
}
/* ⏩ não pula o sorteio: só encurta a espera entre uma revelação e outra */
function rfObAcelerar(){
  if(CL._soloDrawTimer){ clearTimeout(CL._soloDrawTimer); CL._soloDrawTimer=null; }
  if(typeof soloDrawTick==='function') soloDrawTick();
}

/* =====================================================================
   7 · BOAS-VINDAS
   ===================================================================== */
function rfOb7(){
  const cl=clubOf(CL.clubId)||{short:'—'};
  const sq=squad(CL.clubId)||[];
  const forca=sq.length?(sq.reduce((s,p)=>s+(p.f||0),0)/sq.length):0;
  const st=(typeof myStadium==='function')?myStadium():null;
  const cap=(st&&st.capacity)||0;
  const folha=sq.reduce((t,p)=>t+(p.salary||p.wage||0),0);
  const nm=(typeof nextUserMatch==='function')?nextUserMatch():null;
  const adv=nm&&nm.oppId?(anyClubOf(nm.oppId)||{short:'—'}):null;
  const art=sq.slice().sort((a,b)=>((S.scorers&&S.scorers[b.n])||0)-((S.scorers&&S.scorers[a.n])||0))[0];
  const artGols=art?((S.scorers&&S.scorers[art.n])||0):0;
  const vencendo=sq.filter(p=>(p.contract||9)<=1).length;
  const foto=(typeof stadiumPhotoFor==='function')?stadiumPhotoFor(CL.clubId):'';
  const seg=(S.jobSecurity!=null)?S.jobSecurity:60;
  const corpo=`
    <div class="rf-bv-media">
      <div class="rf-bv-casa">
        ${foto?`<img class="rf-bv-foto" src="${escC(foto)}" alt="Estádio do ${escC(cl.short||'')}">`:''}
        <div class="rf-bv-veu"></div>
        <span class="rf-bv-eyebrow">A sua casa</span>
        <div class="rf-bv-casa-id">
          ${rfCrest(cl,36)}
          <span class="rf-bv-casa-t">
            <span class="rf-bv-casa-n">${escC(rfObEstadioNome(cl,st))}</span>
            <span class="rf-bv-casa-s">${cap?grp(cap)+' LUGARES':''}</span>
          </span>
        </div>
      </div>
      <div class="rf-bv-video">
        <span class="rf-bv-eyebrow claro">Apresentação</span>
        <div class="rf-bv-play">
          <span class="rf-bv-pb">▶</span>
          <span class="rf-bv-pt">Vídeo do treinador contratado</span>
          <span class="rf-bv-ps">ESPAÇO RESERVADO · 16:9</span>
        </div>
      </div>
    </div>
    <div class="rf-bv-kpis">
      <div class="rf-bv-k"><span class="rf-ov-res-t">Divisão</span>
        <span class="rf-bv-kv azul">${escC((typeof divisionLabel==='function')?divisionLabel():'—')}</span>
        <span class="rf-bv-ks">${(typeof DATA!=='undefined'&&DATA.clubs)?DATA.clubs.length+' clubes no grupo':''}</span></div>
      <div class="rf-bv-k"><span class="rf-ov-res-t">Elenco</span>
        <span class="rf-bv-kv">${sq.length}</span>
        <span class="rf-bv-ks">força média ${forca?forca.toFixed(1).replace('.',','):'—'}</span></div>
      <div class="rf-bv-k"><span class="rf-ov-res-t">Caixa</span>
        <span class="rf-bv-kv">${escC(fmt(S.budget||0))}</span>
        <span class="rf-bv-ks">${folha?'folha '+fmt(folha)+'/mês':''}</span></div>
      <div class="rf-bv-k"><span class="rf-ov-res-t">Objetivo</span>
        <span class="rf-bv-kv ouro">${escC(rfObObjetivo())}</span>
        <span class="rf-bv-ks">cobrado pela diretoria</span></div>
    </div>
    <div class="rf-bv-baixo">
      <div class="rf-bv-ficha">
        <div class="rf-bv-f destaque"><span>Primeiro jogo</span>
          <b>${adv?escC(adv.short)+' · '+(nm.home?'casa':'fora'):'a definir'}</b></div>
        <div class="rf-bv-f"><span>Estádio</span>
          <b>${escC(rfObEstadioNome(cl,st))}${cap?' · '+grp(cap):''}</b></div>
        <div class="rf-bv-f"><span>Artilheiro do elenco</span>
          <b>${art?escC(art.n)+(artGols?' · '+artGols+' gols':''):'—'}</b></div>
        <div class="rf-bv-f"><span>Contratos vencendo</span>
          <b>${vencendo} jogador${vencendo===1?'':'es'}</b></div>
      </div>
      <div class="rf-ob-escuro">
        <span class="rf-ob-esc-l">Recado da diretoria</span>
        <span class="rf-bv-fala">“${escC(rfObRecado(cl))}”</span>
        <span class="rf-bv-assina">— O PRESIDENTE</span>
        <div class="rf-ob-esc-h"></div>
        <div class="rf-ob-esc-lin"><span>Paciência da diretoria</span>
          <b>${seg>=70?'alta':seg>=40?'média':'curta'}</b></div>
        <div class="rf-ob-esc-bar"><i style="width:${Math.max(0,Math.min(100,seg))}%"></i></div>
      </div>
    </div>`;
  return rfWiz({passo:5, corpo,
    sobre:'Você é o novo treinador', titulo:'Bem-vindo ao '+(cl.short||'clube')+'.',
    sub:'A diretoria confia. A torcida quer acesso.',
    nota:'Daqui você cai direto na tela de Formação.',
    cta:'⚽ Entrar no clube', ctaOn:'clBoasVindasContinuar()'});
}
/* O SAVE NÃO GUARDA O NOME DO ESTÁDIO — S.clubStadiumCap[id] só tem capacidade
   e o quanto foi construído na temporada. Então a linha diz "Casa do <clube>"
   em vez de inventar um nome próprio que o jogo não tem. A tela de referência
   escreve "Barão de Serra Negra"; quando o dado existir, entra aqui. */
function rfObEstadioNome(cl,st){
  return (st&&st.name) || ('Casa do '+(cl.short||'clube'));
}
/* o objetivo é o que a divisão realmente cobra, não um texto fixo */
function rfObObjetivo(){
  const promo=(typeof DIVISION_PROMO!=='undefined'&&DIVISION_PROMO[S.division])||0;
  if(!promo) return 'Título';
  return 'Top '+promo;
}
function rfObRecado(cl){
  return 'A gente enche o estádio do mesmo jeito, treinador. Só não deixe o '
    +(cl.short||'clube')+' baixar a cabeça.';
}
