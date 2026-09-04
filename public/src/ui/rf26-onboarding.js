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
/* DUAS TRILHAS, porque os dois modos têm caminhos diferentes: no Solo o
   treinador configura país e divisão e o clube sai no sorteio (5 passos); na
   Resenha ele abre a sala e chama a turma antes disso (6 passos). Uma trilha
   só obrigava a chamar de "Configurar" tanto escolher país quanto montar sala,
   e o número de passos mentia num dos dois. */
/* A TRILHA É UMA SÓ, de sete passos, igual nos dois modos — é o que o desenho
   mostra ("MODO SOLO · PASSO 2 DE 7" sobre a mesma régua que a Resenha usa).
   Eu tinha inventado duas trilhas curtas e diferentes; o resultado é que a
   pessoa via um caminho no Solo e outro na Resenha, e o número do passo não
   batia com o cabeçalho. */
/* UMA RÉGUA SÓ NO JOGO INTEIRO: RF_TRILHAS, em main.js. Havia duas listas de
   rótulos — esta e a de lá — e elas divergiam (item 6 era 'Clube' aqui e
   'Sorteio' lá), enquanto o funil da Resenha desenhava a de lá cortada a 5.
   O jogador via a régua mudar de tamanho e de nome no mesmo caminho.
   Aqui ficou só o apontador; quem manda é main.js. */
const RF_WIZ_TRILHAS=RF_TRILHAS;
/* a trilha vem do modo escolhido, mas pode ser forçada por quem desenha */
function rfWizPassos(trilha){ return rfTrilhaDe(trilha); }
const RF_WIZ_PASSOS=RF_TRILHAS.solo;

/* ---- envelope: CABEÇALHO PÚBLICO + [ trilha · card · ação ] + RODAPÉ ----
   As telas de fora da área logada usam o mesmo cabeçalho e o mesmo rodapé das
   páginas públicas — quem chega pela landing e entra no assistente não deve
   sentir que trocou de site no meio do caminho. O cabeçalho aceita o botão
   próprio de cada passo ("‹ Voltar ao modo") no canto direito.
   A BARRA DE AÇÃO É O TERCEIRO FILHO DA CAIXA VERDE, não uma faixa solta
   embaixo dela. Estava por fora, e a nota e o botão flutuavam sobre o fundo
   da página em vez de assentarem na mesa junto com o card — a tela perdia o
   contorno que o pacote desenha.
   O CABEÇALHO É DESENHADO DUAS VEZES, de propósito. No desktop ele mora
   dentro do card branco, centrado; no telefone o pacote o move pra dentro da
   faixa azul, junto da marca e da barra de progresso. Como CSS não move nó de
   um contêiner pro outro, os dois saem do mesmo texto e o CSS esconde o que
   não é daquela largura. */
/* O NÚMERO DO PASSO SAI DA RÉGUA, NÃO DA MÃO DE QUEM ESCREVE A TELA.
   Cada tela trazia o seu "Passo N de M" escrito à mão, e eles contradiziam-se:
   três totais diferentes no mesmo fluxo (5, 6 e 7), duas telas seguidas a dizer
   ambas "3 de 6", e a régua desenhada por cima com sete itens. O jogador não
   tinha como saber onde estava.

   O pacote também não ajuda — tem três réguas diferentes entre os seus próprios
   ficheiros (3, 6 e 7 passos) e metade das telas sem número nenhum. Como não há
   uma versão do pacote a seguir, vale a regra que se pode confiar: a régua é a
   fonte, e o rótulo é calculado a partir dela. Nenhuma tela volta a escrever um
   número.

   Quem quiser acrescentar contexto passa `contexto` ("MODO SOLO"), que entra
   depois do passo: "PASSO 2 DE 7 · MODO SOLO". */
function rfWizSobre(passo, trilha, contexto){
  const total=rfWizPassos(trilha).length;
  const n=Math.max(1,Math.min(total, passo||1));
  return 'PASSO '+n+' DE '+total+(contexto?' · '+String(contexto).toUpperCase():'');
}
function rfWiz(o){
  o=o||{};
  const passos=rfWizPassos(o.trilha);
  const passo=o.passo||1, total=passos.length;
  /* sem `sobre` explícito e com um passo, o rótulo nasce da régua */
  const sobre=o.sobre || (o.passo && !o.semTrilha ? rfWizSobre(o.passo,o.trilha,o.contexto) : '');
  const cabeca=(o.titulo||sobre||o.sub)
    ? rfWizHead(sobre,o.titulo,o.sub) : '';
  /* CABEÇALHO MÍNIMO, não o menu público. O pacote do Modo Solo mostra só a
     marca à esquerda e o botão do passo à direita — sem links de navegação e
     sem rodapé. Eu tinha envolvido o assistente no cabeçalho/rodapé públicos;
     dentro de um fluxo de sete passos isso é saída de emergência em cada linha,
     que é exatamente o que um assistente não deve oferecer. */
  /* O VOLTAR DESCEU PARA A BARRA DE ACAO, ao lado do avancar. Estava sozinho no
     canto superior direito, a um ecra de distancia do botao que leva para a
     frente: a cada passo o utilizador saltava do rodape (avancar) para o topo
     (voltar). Agora os dois vivem no mesmo canto, em todas as telas dos dois
     modos, e o topo fica livre para o cabecalho.
     `topoDir` continua a existir para quem precise mesmo de algo no topo. */
  /* NO TELEMOVEL O ROTULO ENCURTA, a barra nunca. Os dois botoes dividem a
     largura do ecra ao meio: em 360px cabe pouco mais do que uma palavra, e
     "‹ Voltar aos treinadores" cortava a meio. O rotulo longo fica no desktop,
     onde ha espaco; no telemovel entra o curto (por omissao, "‹ Voltar" — o
     passo anterior ja se sabe qual e, acabou-se de sair dele). */
  const rotuloDuplo=(longo,curto)=> (curto && curto!==longo)
    ? `<span class="rf-so-desktop">${longo}</span><span class="rf-so-mobile">${curto}</span>`
    : longo;
  const voltarLongo=o.voltarLabel||'‹ Voltar';
  const bVoltar = o.voltar
    ? `<button type="button" class="rf-wiz-b2" onclick="${o.voltar}">${
        rotuloDuplo(voltarLongo, o.voltarCurto||'‹ Voltar')}</button>`
    : '';
  /* CABECALHO E RODAPE PUBLICOS EM TODO O ASSISTENTE, por decisao do utilizador
     (16/ago). Eu tinha-os retirado de proposito — dentro de um fluxo de sete
     passos, links de navegacao sao saida de emergencia em cada linha. Ficou a
     escolha dele; o que mantive foi tirar os CTAs "Entrar"/"Entrar na lista" do
     nav (extra:''), que dentro do assistente apontariam para o proprio sitio
     de onde a pessoa ja veio. */
  /* CABECALHO MINIMO NO ASSISTENTE: so' a marca e a conta (ver rfLpNavHTML). Os oito links da
     home eram oito saidas a competir com o passo em que a pessoa esta'. */
  const topo = (typeof rfLpNavHTML==='function') ? rfLpNavHTML(o.topoDir||'', true) : '';
  const rodape = (typeof rfLpRodapeHTML==='function') ? rfLpRodapeHTML() : '';
  return `<div class="rf-wiz">
    ${topo}
    <div class="rf-wiz-in">
      ${o.semTrilha?'':`<div class="rf-wiz-fita">
        <div class="rf-wiz-fita-l">
          <!-- A ASSINATURA E' DESENHADA, e por isso NAO tem "98". Aqui era o simbolo mais
     a palavra escrita ao lado, com o 98 num <span> proprio; a marca nova tem um
     lockup unico e nao leva numero. Ver img/marca.svg. -->
          <img class="rf-marca-svg" src="img/marca-clara.svg" alt="Retrofoot.com.br" height="20">
          <div class="rf-sp"></div>
          <span class="rf-wiz-fita-c">${passo} de ${total}</span>
        </div>
        <div class="rf-wiz-fita-b">${passos.map((_,i)=>
          `<i class="${i<passo?'on':''}"></i>`).join('')}</div>
        ${cabeca?`<div class="rf-wiz-fita-t">
          <span class="rf-wiz-fita-h">${escC(o.titulo||'')}</span>
          ${o.sub?`<span class="rf-wiz-fita-s">${escC(o.sub)}</span>`:''}
        </div>`:''}
      </div>`}
      <div class="rf-wiz-shell">
        ${o.semTrilha?'':rfWizTrilhaHTML(passo,o.trilha)}
        <div class="rf-wiz-card">${cabeca}${o.corpo||''}</div>
        <!-- TELA SEM ACAO NAO TEM BARRA. No telemovel a barra e a ultima linha
             da moldura, com borda e sombra proprias: desenhada vazia (a tela de
             carregamento, que avanca sozinha) ficava uma faixa branca de 76px a
             ocupar o pe do ecra sem nada dentro. -->
        ${(o.cta||o.voltar||o.nota)?`<div class="rf-wiz-acao">
          ${o.nota?`<span class="rf-wiz-nota">${escC(o.nota)}</span>`:''}
          <div class="rf-sp"></div>
          ${bVoltar}
          <!-- SEM escC no rótulo: desde que os ícones viraram SVG, o rótulo pode
               trazer marcação (rfIcone(...) + texto). Escapando, o botão exibia
               o código do <svg> como texto e esticava a página para 6000px.
               Os rótulos são literais do código, nunca entrada do utilizador. -->
          ${o.cta?`<button type="button" class="rf-wiz-cta" ${o.ctaOff?'disabled':''} onclick="${o.ctaOn||''}">${
            rotuloDuplo(o.cta, o.ctaCurto)}</button>`:''}
        </div>`:''}
      </div>
    </div>
    ${rodape}
    <!-- os diálogos de ação: ver a nota em rfWizDialogos() -->
    ${rfWizDialogos()}
  </div>`;
}
/* OS DIALOGOS DE ACAO PRECISAM DE QUEM OS DESENHE AQUI TAMBEM.
   rfAcaoHTML() so era chamado dentro do envelope do jogo (rf26.js). Fora dele
   — assistente e landing — rfAcAbrir() punha CL.acao e redesenhava, e nada
   aparecia: o "Sair" do cabecalho ficava sem efeito nenhum. Todo shell que
   mostre um botao capaz de abrir dialogo tem de o desenhar.

   E FICA NUMA FUNCAO, nao inline: escrito dentro de um template literal, um
   bloco de comentario deixa de ser comentario — vira TEXTO, e foi impresso no
   rodape do assistente para o utilizador ver. */
function rfWizDialogos(){
  return (typeof rfAcaoHTML==='function') ? rfAcaoHTML() : '';
}
function rfWizTrilhaHTML(passo, trilha){
  const passos=rfWizPassos(trilha);
  return `<div class="rf-wiz-trilha"
      role="progressbar" aria-valuenow="${passo}" aria-valuemin="1" aria-valuemax="${passos.length}"
      aria-label="Passo ${passo} de ${passos.length}: ${escC(passos[passo-1]||'')}">${passos.map((l,i)=>{
    const n=i+1, feito=n<passo, atual=n===passo;
    /* ===== O DEGRAU DO EMBAIXADOR E' DOURADO =====
       'Seu jogador' nao e' um passo como os outros: e' o beneficio de um plano pago, e so'
       aparece na regua de quem o tem (ver rfTrilhaDe). Vestido igual aos outros, ele lia-se
       como mais uma burocracia do assistente. O chip dourado com a coroa diz de quem ele e'
       antes de a pessoa ler o rotulo. */
    const doPlano = l==='Seu jogador';
    return `${i?'<span class="rf-wiz-liga"></span>':''}
      <span class="rf-wiz-p ${feito?'feito':''} ${atual?'atual':''} ${doPlano?'ouro':''}">
        <span class="rf-wiz-n">${doPlano?'👑':(feito?rfIcone('ok',14):n)}</span>
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
function rfCampo(rotulo, input, extra){
  /* `extra` é o encaixe à direita do rótulo — hoje só o "Esqueci minha senha",
     que precisa ficar colado no campo de senha, e não solto no rodapé. */
  const l = extra
    ? `<span class="rf-campo-hd"><span class="rf-campo-l">${escC(rotulo)}</span>${extra}</span>`
    : `<span class="rf-campo-l">${escC(rotulo)}</span>`;
  return `<label class="rf-campo">${l}${input}</label>`;
}
function rfInput(id, ph, valor, tipo, oninput){
  return `<input class="rf-campo-c" id="${id}" type="${tipo||'text'}" placeholder="${escC(ph||'')}"
    value="${escC(valor||'')}" ${oninput?`oninput="${oninput}"`:''}>`;
}

/* =====================================================================
   1 · ENTRAR
   ===================================================================== */
function rfOb1(){
  /* JA LOGADO: o passo 1 nao desaparece, muda de conteudo.
     `clGoModo` saltava direto para "escolher modo" quando havia sessao, entao
     quem ja estava logado nunca via em que conta estava — e nao tinha por onde
     trocar sem ir a Configuracoes, que so existe dentro de um save. A Resenha
     ja tinha esta tela (scConta, pele de 98); o Solo nao tinha nenhuma. */
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};
  if(st.loggedIn && !(CL.auth&&CL.auth.trocando)) return rfOb1Logado(st);
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
        ${rfCampo('Senha', rfInput('rf-ob-s','mínimo 8 caracteres',a.password,'password',"rfObSet('password',this.value)"),
            criando ? '' : `<span class="rf-campo-link" onclick="event.preventDefault();clForgotPassword()">Esqueci minha senha</span>`)}
        ${criando?`<div class="rf-check" onclick="rfObSet('aviso',!(CL.auth.aviso))">
          <span class="rf-check-b ${a.aviso!==false?'on':''}">${a.aviso!==false?rfIcone('ok',14):''}</span>
          <span class="rf-check-t">Quero receber aviso quando abrir vaga nas Ligas Oficiais.</span>
        </div>`:''}
      </div>
    </div>`;
  return rfWiz({passo:rfPasso('Entrar'), corpo,
    sobre:'Bem-vindo, treinador', titulo:'Crie sua conta e entre no jogo.',
    sub:'Seus saves ficam na nuvem — dá para começar no computador e continuar no telefone.',
    nota:'A gente só usa seu e-mail para o save e para avisar da vaga.',
    /* TODO PASSO TEM SAIDA PARA TRAS. Este era o unico degrau do assistente sem botao de
       voltar: quem abrisse o formulario de conta ficava sem caminho de regresso a' abertura
       a nao ser recarregando a pagina. */
    voltar:'clGoAbertura()', voltarLabel:'‹ Voltar ao início',
    cta: criando?'Criar conta e continuar':'Entrar e continuar',
    ctaOff:!pronto, ctaOn: criando?'clLoginSignup()':'clLoginDo()'});
}
/* o passo 1 com sessao: quem esta, e as duas saidas — seguir ou trocar */
function rfOb1Logado(st){
  const nome=st.name||(st.email||'').split('@')[0]||'treinador';
  const corpo=`
    <div class="rf-wiz-mid">
      <div class="rf-ob-sessao">
        <span class="rf-ob-sessao-ic" aria-hidden="true">${rfIcone('ok',20)||'✓'}</span>
        <span class="rf-ob-sessao-id">
          <span class="rf-ob-sessao-t">Você já está logado</span>
          <span class="rf-ob-sessao-e">${escC(st.email||nome)}</span>
        </span>
      </div>
      <button type="button" class="rf-ob-trocar" onclick="rfObTrocarConta()">
        Não é você? <b>Entrar com outra conta</b>
      </button>
    </div>`;
  return rfWiz({passo:rfPasso('Entrar'), corpo,
    sobre:'Bem-vindo de volta', titulo:'Continuar como '+nome+'.',
    sub:'Seus saves ficam na nuvem — dá para começar no computador e continuar no telefone.',
    nota:'Dá para trocar de conta a qualquer momento pelo cabeçalho.',
    voltar:'clGoAbertura()', voltarLabel:'‹ Voltar ao início',
    cta:'Continuar', ctaOn:"CL.screen='modo';cdraw()"});
}
/* NAO desloga: so devolve o formulario, para quem se enganou nao perder a
   sessao antes de ter a outra em maos. O logout real e o botao Sair do
   cabecalho (rfAcSairConta). */
function rfObTrocarConta(){
  CL.auth={mode:'login',name:'',email:'',password:'',trocando:true};
  cdraw();
}
function rfObAuthMode(m){ CL.auth=CL.auth||{}; CL.auth.mode=m; cdraw(); }
function rfObSet(k,v){ CL.auth=CL.auth||{}; CL.auth[k]=v; if(k==='aviso') cdraw(); else rfObSyncCta(); }
/* o CTA liga/desliga sem redesenhar: redesenhar a cada tecla tira o foco do campo */
function rfObSyncCta(){
  const b=document.querySelector('.rf-wiz-cta'); if(!b) return;
  const a=CL.auth||{}; const criando=a.mode!=='login';
  b.disabled=!(a.email&&a.password&&(!criando||a.name));
}

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
          <!-- Dois selos que dizem O QUE O MODO E, em vez de "Recomendado" —
               que e opiniao, nao informacao, e nao ajuda a escolher. Vao num
               contentor porque .rf-modo-tag e absoluto: soltos, empilhavam-se
               um por cima do outro no mesmo canto. -->
          <span class="rf-modo-tags">
            <span class="rf-modo-tag rec">Online</span>
            <span class="rf-modo-tag">Single-player</span>
          </span>
          <span class="rf-modo-t">Modo Solo</span>
          <span class="rf-modo-d">Pega um clube da Série D e sobe até a elite no seu ritmo. Mercado, finanças e o calendário completo de copas — sem depender de ninguém entrar na sala.</span>
          <button type="button" class="rf-modo-cta" onclick="event.stopPropagation();clPickSolo()">${rfIcone('jogar',16)} Jogar sozinho</button>
        </div>
      </div>
      <!-- o ramo do "em breve" chamava rfObAvisar(), que nao existe: se alguem
           voltasse a ligar o RESENHA_EM_BREVE, o botao da lista de espera seria um
           clique morto. Aponta para clWaitlistOpen, que e quem abre a lista. -->
      ${/* O CARTAO NASCE TRANCADO PARA QUEM JA' GASTOU OS 7 DIAS. Antes ele
            estava aceso e o "nao" so' chegava depois de escolher sala e clube.
            Agora a tela ja' diz — e o clique continua a abrir a janela que
            explica, em vez de nao fazer nada: cartao morto nao vende plano. */''}
      <div class="rf-modo resenha ${(RESENHA_EM_BREVE||!rfPodeResenha())?'off':''}" ${RESENHA_EM_BREVE?'':'onclick="clPickResenha()"'}>
        <img class="rf-modo-bg" src="img/modos/modo-resenha.webp" alt="" aria-hidden="true" loading="lazy">
        <div class="rf-modo-veu"></div>
        <div class="rf-modo-txt">
          <span class="rf-modo-tags">
            <span class="rf-modo-tag rec">Online</span>
            <span class="rf-modo-tag">Multi-player</span>
          </span>
          <span class="rf-modo-t">Modo Resenha</span>
          <span class="rf-modo-d">${(!RESENHA_EM_BREVE&&!rfPodeResenha())
            ? 'Os seus 7 dias de Resenha no plano Peladeiro terminaram. O Modo Solo continua seu, sem prazo — o Resenha volta com qualquer plano pago.'
            : `Monte a liga do grupo do trabalho ou da comunidade. Até ${rfTetoHumanos()} treinadores jogam a mesma semana ao vivo, com tabela, mercado e zoeira no chat.`}</span>
          <button type="button" class="rf-modo-cta" onclick="event.stopPropagation();${RESENHA_EM_BREVE?"clWaitlistOpen('onboarding')":'clPickResenha()'}">${
            RESENHA_EM_BREVE ? rfIcone('coroa',16)+' Entrar na lista de espera'
            : (!rfPodeResenha() ? '🔒 Ver os planos'
            : rfIcone('chat',16)+' Jogar com a galera')}</button>
        </div>
      </div>
    </div>
`;
  /* DUAS ACOES E MAIS NADA. A tela tinha quatro caminhos para a mesma decisao:
     os dois cartoes, um CTA no rodape que repetia o Solo, e o acordeao de
     saves — que ainda por cima e a tela SEGUINTE do Solo (passo 3), aqui
     antecipada. Quatro portas para escolher entre duas coisas.
     Ficam os dois cartoes, cada um com o seu botao. O rodape nao leva CTA:
     nao ha "continuar" possivel antes de escolher o modo, e a nota "toque num
     cartao" era legenda de uma coisa que os proprios botoes ja dizem.
     rfObSavesHTML() continua a existir — e usada noutro sitio. */
  return rfWiz({passo:rfPasso('Modo'), corpo,
    sobre:'Como você quer jogar', titulo:'Como você quer jogar?',
    sub:RESENHA_EM_BREVE
      ? 'O Modo Resenha, para jogar com a turma, chega em novembro. Na beta, o Solo já está completo.'
      : 'Você pode mudar de modo depois, a qualquer momento.',
    voltar:'clGoAbertura()', voltarLabel:'‹ Voltar'});
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
  /* O CORPO SEMPRE EXISTE QUANDO ABERTO. Antes ele só era desenhado com
     `aberto && saves.length` — enquanto a nuvem respondia, o cabeçalho já dizia
     "Esconder" e embaixo não vinha nada. Quem clicava via um acordeão aberto e
     vazio e concluía, com razão, que os saves não apareciam. Agora o estado de
     carregamento tem linha própria. */
  const corpo = !aberto ? '' : (carregando
    ? '<div class="rf-obsv-vazio">Procurando os seus saves na nuvem</div>'
    : `<div class="rf-obsv-head">
        <span></span><span>SAVE</span><span>RODADA</span><span>GRAVADO</span><span></span></div>
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
      <button type="button" class="rf-obsv-ger" onclick="clPickSolo()">Gerenciar saves na nuvem</button>`);
  /* O CONTROLE É UM BOTÃO, não um texto. Azul, com a seta amarela: para baixo
     abre, para cima fecha. O `aria-expanded` é o que conta o estado para quem
     usa leitor de tela — o desenho da seta é só para quem vê. */
  const seta=aberto?'seta-cima':'seta-baixo';
  return `<div class="rf-obsv">
    <div class="rf-obsv-hd" onclick="rfObSaves()" role="button" tabindex="0"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();rfObSaves();}">
      <span class="rf-obsv-id">
        <span class="rf-obsv-t">Continuar um jogo salvo</span>
        <span class="rf-obsv-s">${carregando?'Procurando os seus saves'
          :`Você tem ${n} jogo${n>1?'s':''} salvo${n>1?'s':''} na nuvem.`}</span>
      </span>
      <button type="button" class="rf-obsv-tg" aria-expanded="${aberto?'true':'false'}"
        title="${aberto?'Esconder os saves':'Ver os saves'}"
        onclick="event.stopPropagation();rfObSaves()">${rfIcone(seta,18)}</button>
    </div>
    ${corpo}
  </div>`;
}
function rfObSaves(){ CL.obSavesOpen=(CL.obSavesOpen===false); cdraw(); }
/* O QUE O SAVE SABE DE SI. A listagem da nuvem devolve nome e updated_at; o
   clube, a divisão e a rodada só existem se o registro tiver o resumo. Sem
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
  return r!=null?((r+1)+'ª semana'):'—';
}

/* =====================================================================
   3 · PAÍS E LIGAS
   Três blocos: país PRINCIPAL (um só — é onde você treina), divisão de
   entrada e ligas de FUNDO (várias — rodam em segundo plano e abrem o
   mercado). São dois estados diferentes no jogo (CL.playCountry e
   CL.countries) que antes esta tela juntava num grid só.
   ===================================================================== */
/* ===== A PIRAMIDE — O DEGRAU DE ENTRADA NAO SE ESCOLHE =====
   Durante os testes com os socios as quatro divisoes eram botoes (ver TESTING_FREE_DIVISION_PICK,
   ui/main.js), para se poder provar a Serie A e as copas continentais sem subir a pe'. Isso era
   bancada, nunca o jogo: no RetroFoot toda a gente comeca em baixo e sobe jogando, e uma escolha
   que o jogo nao pretende honrar so' ensina que ela existe.
   Entao o bloco deixa de ser escolha e passa a ser PROMESSA: a piramide inteira, de cima a baixo,
   com o degrau de entrada aceso e os de cima por conquistar. Nada aqui e' clicavel — de proposito.
   Serve aos dois modos (Solo e Resenha), que e' o que garante que contam a mesma historia. */
/* o nome de uma competicao como o JOGO a chama (o pacote oficial renomeia COMP_DEFS; ver
   aplicarCompeticoes em net/dados.js). O segundo argumento e' o que ha' hoje no pacote — serve
   de rede para o caso de o pacote ainda nao ter chegado quando a tela desenha. */
function rfNomeComp(key, seFaltar){
  try{
    /* `name` e nao `short`: o curto e' a etiqueta de tabela ("Clubes da América", "Série A") e
       numa frase corrida sai torto — "a Clubes da América". O nome inteiro e' o que se diz. */
    const d=(typeof COMP_DEFS!=='undefined')?COMP_DEFS[key]:null;
    if(d && (d.name||d.short)) return d.name||d.short;
  }catch(e){}
  return seFaltar||key;
}
/* ===== OS PAISES QUE VEM A SEGUIR =====
   Cartoes DESLIGADOS, de proposito: dizer "em breve" e deixar clicar seria prometer duas vezes.
   O nome da liga sai do pacote (as ligas ja' estao renomeadas la': Crown League, Liga Lusitana,
   Liga Hispanica, Lega Suprema, Meisterliga, Liga Albiceleste) — assim a lista nao inventa nomes
   que a tela do jogo depois desmente. */
const RF_PAISES_EM_BREVE=[
  ['Inglaterra','🏴󠁧󠁢󠁥󠁮󠁧󠁿','premier','Crown League'],
  ['Portugal','🇵🇹','liga:Portugal:PT','Liga Lusitana'],
  ['Espanha','🇪🇸','liga:Espanha:ES','Liga Hispânica'],
  ['Itália','🇮🇹','liga:Itália:IT','Lega Suprema'],
  ['Alemanha','🇩🇪','liga:Alemanha:DE','Meisterliga'],
  ['Argentina','🇦🇷','liga:Argentina:ARG','Liga Albiceleste'],
];
function rfPaisesEmBreveHTML(){
  const cartoes=RF_PAISES_EM_BREVE.map(([pais,bandeira,chave,liga])=>`
    <div class="rf-pais-breve" aria-disabled="true">
      <span class="rf-pais-breve-f">${bandeira}</span>
      <span class="rf-pais-breve-id">
        <span class="rf-pais-breve-n">${escC(pais)}</span>
        <span class="rf-pais-breve-l">${escC(rfNomeComp(chave, liga))}</span>
      </span>
      <span class="rf-pais-breve-selo">EM BREVE</span>
    </div>`).join('');
  return `<div class="rf-pais-breve-g">${cartoes}</div>
    <span class="rf-note">Estas ligas já existem no mundo do jogo — dá para comprar e vender nelas,
      e elas podem te sondar como treinador. Sentar no banco delas é o próximo passo.</span>`;
}
function rfPiramideHTML(uniCfg, entrada){
  const cfg=uniCfg||null;
  const ordem=(cfg&&cfg.order)?cfg.order.slice():['A','B','C','D'];
  /* de cima (a 1a divisao) para baixo: a piramide le-se como se sobe, e o degrau de entrada
     fica no fundo, que e' onde ele esta' na vida real */
  /* O NOME QUE O JOGO USA, NAO O ROTULO CURTO. "Série A" e' a etiqueta da divisao; a competicao
     chama-se Liga Soberana — e' esse o nome que o jogador vai ver na tabela, na taca e na
     carreira. Sai de COMP_DEFS, que o pacote oficial renomeia (ver aplicarCompeticoes em
     net/dados.js), entao trocar o nome no painel troca-o aqui sem tocar em codigo. */
  const uniKey=(cfg&&cfg.key)||((typeof activeUniverseKey==='function')?activeUniverseKey():'brasil');
  const nomeDaDivisao=(d)=>{
    try{
      const k=(typeof COMP_CHAVE_DIVISAO==='function')?COMP_CHAVE_DIVISAO(uniKey,d):null;
      const def=(k && typeof COMP_DEFS!=='undefined')?COMP_DEFS[k]:null;
      if(def && def.name) return def.name;
    }catch(e){}
    return (cfg&&cfg.label&&cfg.label[d])||('Série '+d);
  };
  const linhas=ordem.map((d,i)=>{
    const nome=nomeDaDivisao(d);
    const lbl=(cfg&&cfg.label&&cfg.label[d])||('Série '+d);
    const qtd=(cfg&&cfg.size&&cfg.size[d])||0;
    const aqui=(d===entrada);
    /* a largura desenha a piramide: a 1a divisao e' a mais estreita porque e' onde cabe menos
       gente — nao e' enfeite, e' a propria ideia da coisa */
    const larg=58+i*14;
    return `<div class="rf-pir-l ${aqui?'aqui':''}" style="--w:${larg}%">
      <span class="rf-pir-c">
        <span class="rf-pir-t">${(typeof rfTrofeuHTML==='function')?rfTrofeuHTML('serie'+d,aqui?60:48):''}</span>
        <span class="rf-pir-id">
          <span class="rf-pir-n">${escC(nome)}</span>
          <span class="rf-pir-q">${escC(lbl)}${qtd?' · '+qtd+' clubes':''}</span>
        </span>
      </span>
      ${aqui?'<span class="rf-pir-selo">VOCÊ COMEÇA AQUI</span>':''}
    </div>`;
  }).join('');
  return `<div class="rf-pir">
    ${linhas}
    <div class="rf-pir-recado">
      <b>Ninguém começa em cima.</b>
      <span>Suba divisão por divisão até a ${escC(nomeDaDivisao(ordem[0]))},
        ganhe o país, e aí o continente vem atrás. O mundo é o último degrau — e ele não cai no sorteio,
        cai no trabalho.</span>
    </div>
  </div>`;
}
function rfOb3(){
  const lista=(typeof COUNTRY_LIST==='function')?COUNTRY_LIST():[];
  /* O UNIVERSO FEMININO SO' TEM O BRASIL. Mostrar os outros 14 daria uma escolha que a tela
     seguinte nao consegue honrar: nao ha' elenco feminino para eles, e o pote de clubes sairia
     vazio. Some tambem o bloco de ligas de fundo, que e' a mesma escolha por outro nome. */
  /* DUAS RAZOES PARA MOSTRAR SO' O BRASIL, e elas nao sao a mesma coisa:
       · no FEMININO, porque nao ha' elenco feminino para os outros paises — o pote sairia vazio;
       · com RF_SO_BRASIL ligado, porque o pais jogavel da 1a versao publica e' um so'. Esta vale
         para as duas modalidades.
     A tela e' a mesma nos dois casos; so' a frase de baixo muda, porque o motivo e' outro.

     O QUE ESTA TRAVA JA' NAO QUER DIZER: que os estrangeiros estao fora de alcance. Ela era, ate'
     ao lancamento, tambem a trava do MERCADO — e o motivo escrito aqui era o nome REAL dos
     jogadores de fora. Esse motivo caiu (renomearEstrangeiros, net/dados.js), o mercado ganhou
     flag propria (RF_MERCADO_MUNDIAL) e hoje compra-se e vende-se com os quinze paises. O que
     esta trava decide e' apenas onde se SENTA. Ver o bloco das tres travas em universos.js. */
  /* O FEMININO DEIXOU DE SER SO' O BRASIL (etapa 3): os catorze gemeos existem, com os mesmos
     clubes, a mesma piramide e elenco feminino nomeado pelo pool do proprio pais. A trava que
     resta e' a outra — RF_SO_BRASIL — e ela vale para as DUAS modalidades. Enquanto estiver
     ligada nao ha' diferenca visivel; quando cair, o feminino abre junto com o masculino. */
  const soFem=(typeof rfFemLigado==='function' && rfFemLigado()) && CL.modalidade==='fem'
              && !(typeof UNI_CONFIGS!=='undefined' && UNI_CONFIGS.InglaterraFem);
  const soTrava=(typeof globalThis!=='undefined') && globalThis.RF_SO_BRASIL===true;
  const soBrasil=soFem||soTrava;
  const jogaveis=lista.filter(c=>c.on && (!soBrasil || c.n==='Brasil'));
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
            ${on?`<span class="rf-ob3-ok">${rfIcone('ok',16)}</span>`:''}
          </button>`;}).join('')}</div>
      </div>
      <div class="rf-ob3-bloco">
        <span class="rf-label-t">Onde você entra na pirâmide</span>
        ${rfPiramideHTML(cfg, entrada)}
      </div>
      ${soBrasil ? `
      <div class="rf-ob3-bloco">
        <span class="rf-label-t">Outros países</span>
        ${/* AS COMPETICOES CHAMAM-SE PELO NOME DO JOGO. Esta frase dizia "a Copa do Brasil, a
             Libertadores e a Sul-Americana" — os nomes REAIS, que o jogo nao usa em lado nenhum:
             no pacote oficial elas sao a Copa da Federacao, a Liberta Cup e a Copa de Clubes da
             America. Sai de COMP_DEFS, que o pacote renomeia, entao a frase acompanha o painel. */''}
        <span class="rf-note">${soFem
          ? `O futebol feminino começa pelo Brasil, com as quatro divisões, a ${escC(rfNomeComp('copaBrasil','Copa da Federação'))} e a ${escC(rfNomeComp('libertadores','Liberta Cup'))}. Os outros países chegam depois.`
          : `Por agora o jogo é só no Brasil — as quatro divisões, a ${escC(rfNomeComp('copaBrasil','Copa da Federação'))}, a ${escC(rfNomeComp('libertadores','Liberta Cup'))} e a ${escC(rfNomeComp('sulamericana','Copa de Clubes da América'))}.`}</span>
        ${rfPaisesEmBreveHTML()}
      </div>` : `
      <div class="rf-ob3-bloco">
        <span class="rf-label-t">Ligas de fundo <i class="rf-ob3-leve">— aparecem em Campeonatos e no mercado</i></span>
        <div class="rf-ob3-pills">${jogaveis.filter(c=>c.n!==principal).map(c=>`
          <button type="button" class="rf-chip ${fundo.has(c.n)?'on':''}"
            onclick="clToggleCountry('${escC(c.n)}')">${c.f} ${escC(c.n)}</button>`).join('')}</div>
      </div>`}
    </div>`;
  const qtdEntrada=(cfg&&cfg.size&&cfg.size[entrada])||0;
  const lblEntrada=(cfg&&cfg.label&&cfg.label[entrada])||('Série '+entrada);
  return rfWiz({passo:rfPasso('País e liga','solo'), trilha:'solo', corpo,
    sobre:'Onde você vai treinar', titulo:'Escolha o país. O clube é sempre sorteado.',
    /* O SUBTITULO PROMETIA A ESCOLHA QUE SAIU. Dizia "voce escolhe o pais e a divisao em que
       quer comecar" — com a piramide no lugar dos botoes, isso passou a ser mentira na mesma
       tela que a desmente. O que se escolhe e' o pais; o degrau e a camisa vem do jogo. */
    sub:'Você escolhe o país; o degrau é sempre o de baixo e o clube sai no sorteio — é assim para todo mundo, inclusive na resenha.',
    nota:`Clube sorteado: ${lblEntrada} · ${principal}${qtdEntrada?' · '+qtdEntrada+' clubes no pote':''}`,
    voltar:soBrasil||((typeof rfFemLigado==='function')&&rfFemLigado())?'clPaisesBack()':'clGoModo()',
    voltarLabel:((typeof rfFemLigado==='function')&&rfFemLigado())?'‹ Modalidade':'‹ Modo',
    cta:'Sortear meu clube', ctaOn:'clPaisesOk()'});
}
function rfObPais(n){
  CL.playCountry=n;
  CL.countries=CL.countries||new Set();
  CL.countries.add(n);        // o país principal está sempre no save
  cdraw();
}
function rfObDivisao(d){ CL.testStartDiv=CL.testStartDiv||{}; CL.testStartDiv.brasil=d; cdraw(); }
/* LIGAS JOGÁVEIS DO MUNDO desta sala. NÃO é onde cada um começa: todos começam juntos no país
   inicial, e sair para outro é decisão de carreira, por convite. Marcar um país aqui quer dizer
   "esta liga existe por inteiro" — simulada, assistível, com mercado e calendário próprios —, e é
   de onde podem vir convites para treinar lá fora.
   O país inicial está sempre dentro e não se desliga. */
/* RENOMEADA: chamava-se rfObPais e SOBRESCREVIA a homonima logo acima (a do pais do solo) —
   duas funcoes distintas dividindo o mesmo nome por acidente. */
function rfObPaisSala(uni){
  const n=CL.net||(CL.net={});
  const atual=new Set(n.paises&&n.paises.length?n.paises:['brasil']);
  if(uni==='brasil') return;                       // âncora da sala
  if(atual.has(uni)) atual.delete(uni); else atual.add(uni);
  atual.add('brasil');
  n.paises=[...atual];
  cdraw();
}

/* =====================================================================
   4 · CRIAR SALA (só Resenha) — substitui scSalaHost()
   ===================================================================== */
/* RF_RITMOS saiu: era uma lista de ritmos que ninguem lia (nenhum consumidor em todo o repo) e
   que nomeava o 'Usain Bolt', agora fora do seletor. Deixa'-la seria um segundo catalogo de
   velocidades a discordar do de main.js no dia em que alguem a ligasse. */
const RF_ENTRADAS=[['convite','Só com convite'],['codigo','Qualquer um com o código'],['aprovar','Aprovar cada entrada']];
function rfOb4(){
  const n=CL.net||(CL.net={});
  const sala=CL.sala||(CL.sala={});
  const codigo=(typeof NET!=='undefined'&&NET.code)||n.code||'——————';
  const pais=CL.playCountry||'Brasil';
  const uk=(typeof countryUniverseKey==='function')?countryUniverseKey(pais):null;
  const cfg=(typeof UNI_CONFIGS!=='undefined'&&uk)?UNI_CONFIGS[uk]:null;
  /* o degrau de entrada vem da regra, nao de uma escolha: com TESTING_FREE_DIVISION_PICK
     desligado, computeStartDivision devolve sempre o ultimo da ordem do pais */
  const escolhida=(typeof computeStartDivision==='function')?computeStartDivision()
                  :(((cfg&&cfg.order)||['A','B','C','D']).slice(-1)[0]);
  const nome=n.roomName||'';
  const MAX=24;
  /* A DIVISAO DA SALA DEIXOU DE SER ESCOLHA (ver rfPiramideHTML). Eram quatro cartoes
     clicaveis, tres deles com etiqueta TESTE — bancada dos socios, nao jogo. A sala comeca
     sempre no degrau de baixo, como o Solo, e a piramide diz porque. */
  const corpo=`
    <div class="rf-sl">
      <label class="rf-sl-campo">
        <span class="rf-sl-l">NOME DA SALA</span>
        <span class="rf-sl-in">
          <input class="rf-sl-input" maxlength="${MAX}" placeholder="Resenha da firma"
            value="${escC(nome)}" oninput="CL.net.roomName=this.value;rfOb4Sync()">
          <span class="rf-sl-cont">${nome.length}/${MAX}</span>
        </span>
        <span class="rf-sl-nota">É o nome que os convidados veem. Dá para trocar depois.</span>
      </label>

      <div class="rf-sl-bloco">
        <div class="rf-sl-hd">
          <span class="rf-sl-l">ONDE A RESENHA COMEÇA</span>
          <span class="rf-sl-hd-s">Todos entram no mesmo degrau</span>
        </div>
        ${rfPiramideHTML(cfg, escolhida)}
      </div>

      ${(function(){
        const API=(typeof CALENDARIOS_API!=='undefined')?CALENDARIOS_API:null;
        if(!API) return '';
        const disponiveis=API.paisesComCalendario();
        if(disponiveis.length<2) return '';        // só há um país com calendário: nada a escolher
        const sel=new Set((n.paises&&n.paises.length)?n.paises:['brasil']); sel.add('brasil');
        const nomeDe=(k)=>k==='brasil'?'Brasil'
          :(((typeof UNI_CONFIGS!=='undefined'&&UNI_CONFIGS[k]&&UNI_CONFIGS[k].country))||k);
        const cartoes=disponiveis.map(k=>{
          const u=(typeof UNI_CONFIGS!=='undefined')?UNI_CONFIGS[k]:null;
          const divs=(u&&u.order)||[];
          const clubes=divs.reduce((t,d)=>t+((u&&u.size&&u.size[d])||0),0);
          const ancora=(k==='brasil');
          return `<button type="button" class="rf-sl-div ${sel.has(k)?'on':''} ${ancora?'':'teste'}"
              onclick="rfObPaisSala('${escC(k)}')" ${ancora?'title="O Brasil é a âncora da sala"':''}>
            <span class="rf-sl-div-id">
              <span class="rf-sl-div-n">${escC(nomeDe(k))}</span>
              <span class="rf-sl-div-s">${divs.length} ${divs.length>1?'divisões':'divisão'} · ${clubes} clubes</span>
            </span>
            <span class="rf-sl-selo ${ancora?'padrao':'teste'}">${ancora?'SEMPRE':(sel.has(k)?'NA SALA':'FORA')}</span>
          </button>`;
        }).join('');
        const extras=[...sel].filter(k=>k!=='brasil').length;
        return `<div class="rf-sl-bloco">
          <div class="rf-sl-hd">
            <span class="rf-sl-l">LIGAS JOGÁVEIS</span>
            <span class="rf-sl-hd-s">Todos começam no Brasil · as outras existem no mundo e podem convidar você</span>
          </div>
          <div class="rf-sl-divs">${cartoes}</div>
          ${extras?`<div class="rf-sl-aviso">
            ${rfIcone('aviso',16)}
            <span>Estas ligas rodam por inteiro no mundo da sala e podem sondar você como treinador.
              Um país só ganha elencos completos quando alguém for treinar lá — aí custa cerca de
              <b>1 MB</b> no estado da sala, lido e gravado a cada semana.</span>
          </div>`:''}
        </div>`;
      })()}

      <div class="rf-sl-faixa">
        <div class="rf-sl-fx"><span class="rf-sl-l">CÓDIGO</span><span class="rf-sl-fx-v mono">${escC(codigo)}</span></div>
        <span class="rf-sl-fx-sep"></span>
        <div class="rf-sl-fx"><span class="rf-sl-l">TREINADORES</span><span class="rf-sl-fx-v">até ${rfTetoHumanos()}</span></div>
        <span class="rf-sl-fx-sep"></span>
        <div class="rf-sl-fx"><span class="rf-sl-l">CLUBES</span><span class="rf-sl-fx-v">por sorteio</span></div>
      </div>
    </div>`;
  return rfWiz({trilha:'resenha', passo:rfPasso('Sala','resenha'), contexto:'Modo Resenha',
    titulo:'Abrir a sua sala',
    sub:'Dê um nome à sala. Todos entram no mesmo degrau da pirâmide, com clube sorteado — o anfitrião manda no ritmo, não no atalho.',
    corpo, nota:'A sala fica aberta por 7 dias sem ninguém entrar.',
    voltar:'clBackConta()', cta:'Abrir a sala', ctaOff:!n.roomName, ctaOn:'clOpenRoom()'});
}
function rfOb4Sync(){ const b=document.querySelector('.rf-wiz-cta'); if(b) b.disabled=!CL.net.roomName;
  const c=document.querySelector('.rf-sl-cont'); if(c) c.textContent=(CL.net.roomName||'').length+'/24'; }

function rfObSala(k,v){ CL.sala=CL.sala||{}; CL.sala[k]=v; cdraw(); }
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
  const papel=(typeof rfPapelResenha==='function')?rfPapelResenha():'resenha';
  if(!room) return rfWiz({trilha:papel, passo:rfPasso('Sala',papel), contexto:papel==='convidado'?'Convidado':'Modo Resenha',
    corpo:'<span class="rf-note">A ligar à sala</span>',
    titulo:'Sala', voltar:'clLobbyExit()', voltarLabel:'Sair da sala'});
  const anfitriao=NET.isHost;
  if(anfitriao && typeof clStartHostReqPoll==='function') clStartHostReqPoll();
  else if(typeof clStartLobbyPoll==='function') clStartLobbyPoll();
  const parts=room.participants||[];
  const dentro=parts.filter(p=>p.confirmed).length;
  const convidados=parts.length-dentro;
  /* AS VAGAS SAO DE PESSOAS, NAO DE CLUBES. Eram os assentos da sala (20 na
     Serie D) — mas quem entra e' gente, e o plano do anfitriao limita as
     pessoas em 8. Mostrar 18 vagas numa sala que recusa a nona pessoa e'
     prometer o que o claim_seat vai negar (ver rfTetoHumanos). */
  const teto=rfTetoHumanos(), vagas=Math.max(0,teto-parts.length);
  const link=(typeof NET.inviteLink==='function')?NET.inviteLink():'';
  const codigo=room.code||'';
  // mesma armadilha do lobby: aqui `S` ainda é null (ver rfDivisaoSala)
  const divLbl=(typeof rfDivisaoSala==='function')?rfDivisaoSala(room):'';

  /* O LINK É O BLOCO PRINCIPAL. No desenho antigo ele fechava a tela em texto
     pequeno, sendo o canal mais usado — agora abre, em azul, com o Copiar em
     amarelo. WhatsApp e e-mail viram dois cards iguais logo abaixo, e a busca
     de quem já tem conta desce para um campo simples. */
  /* ===== OS PEDIDOS DE ENTRADA TÊM DE APARECER AQUI =====
     Quem entra pelo CÓDIGO ou pelo LINK não entra direto: cria um pedido pendente e fica
     numa tela de espera até o anfitrião aprovar (ver netRequestJoin). O painel de aprovação
     existia só no lobby antigo; esta tela chamava `clStartHostReqPoll()` — portanto os
     pedidos até chegavam a `CL.pendingJoins` — e depois não desenhava nenhum deles. Do lado
     do anfitrião não havia sinal nenhum de que alguém tinha pedido para entrar, e do lado de
     quem pediu a espera não acabava nunca. Medido numa sala real: pedido gravado em
     join_requests com status 'pending', RLS a deixar o anfitrião ler e decidir, e a tela
     dele sem uma linha sequer sobre isso.
     Fica em PRIMEIRO na coluna de propósito: é o único bloco desta tela que segura outra
     pessoa do lado de fora. */
  const pedidos=(anfitriao && CL.pendingJoins)?CL.pendingJoins:[];
  const pedidosHTML = (anfitriao && pedidos.length) ? `
      <div class="rf-sa-ped">
        <div class="rf-sa-lista-hd">
          <span class="rf-sa-l">PEDIRAM PARA ENTRAR</span>
          <span class="rf-sa-lista-c">${pedidos.length} aguardando você</span>
        </div>
        ${pedidos.map(r=>`<div class="rf-sa-ped-lin">
          <span class="rf-sa-ped-ic">${rfIcone('aprovar',16)}</span>
          <span class="rf-sa-id">
            <span class="rf-sa-n">${escC(r.name||'Treinador')}</span>
            <span class="rf-sa-p">entrou pelo código · esperando o seu OK</span>
          </span>
          <div class="rf-sp"></div>
          <button type="button" class="rf-sa-ped-nao" onclick="clRejectJoin('${escC(r.user_id)}')">Recusar</button>
          <button type="button" class="rf-sa-ped-sim" onclick="clApproveJoin('${escC(r.user_id)}')">Aprovar</button>
        </div>`).join('')}
      </div>` : '';

  const corpo=`
    <div class="rf-sa">
      ${pedidosHTML}
      <div class="rf-sa-link">
        <span class="rf-sa-link-id">
          <span class="rf-sa-l">LINK DA SALA · O JEITO MAIS RÁPIDO</span>
          <span class="rf-sa-link-v">${escC(link||('código '+codigo))}</span>
        </span>
        <div class="rf-sp"></div>
        <button type="button" class="rf-sa-copiar" onclick="rfObCopiar('${escC(link||codigo)}')">
          ${rfIcone('copiar',16)} Copiar link</button>
      </div>

      <div class="rf-sa-canais">
        <div class="rf-sa-canal">
          <span class="rf-sa-canal-hd">${rfIcone('chat',16)} <b>WhatsApp</b></span>
          <span class="rf-sa-linha">
            <span class="rf-sa-ddi">+55</span>
            <input class="rf-sa-input" inputmode="numeric" placeholder="DDD + número"
              value="${escC((CL.net&&CL.net.phone)||'')}"
              oninput="CL.net.phone=this.value.replace(/\D/g,'');this.value=CL.net.phone">
            <button type="button" class="rf-sa-bt" onclick="clWaInvite()">Enviar</button>
          </span>
        </div>
        <div class="rf-sa-canal">
          <span class="rf-sa-canal-hd">${rfIcone('email',16)} <b>E-mail</b></span>
          <span class="rf-sa-linha">
            <input class="rf-sa-input" type="email" placeholder="email@exemplo.com"
              value="${escC((CL.net&&CL.net.inviteEmail)||'')}"
              oninput="CL.net.inviteEmail=this.value">
            <button type="button" class="rf-sa-bt" onclick="clEmailInvite()">Enviar</button>
          </span>
        </div>
      </div>

      <label class="rf-sa-busca">
        <span class="rf-sa-l">QUEM JÁ TEM CONTA</span>
        <span class="rf-sa-busca-in">
          ${rfIcone('buscar',16)}
          <input id="cl-usersearch-input" class="rf-sa-input"
            placeholder="Buscar por nome ou e-mail (mín. 3 letras)" oninput="clUserSearch(this.value)">
        </span>
        <div id="cl-usersearch-results" class="cl-usersearch-results"></div>
      </label>

      <div class="rf-sa-lista">
        <div class="rf-sa-lista-hd">
          <span class="rf-sa-l">TREINADORES NA SALA</span>
          <span class="rf-sa-lista-c">${dentro} dentro · ${convidados} convidado${convidados===1?'':'s'} · ${vagas} vaga${vagas===1?'':'s'}</span>
        </div>
        ${parts.map(p=>{
          const eu=p.id===NET.self.id;
          const papel=p.host?('anfitrião'+(eu?' · você':'')):(eu?'você':'convidado');
          return `<div class="rf-sa-lin">
            <span class="rf-sa-ponto ${p.confirmed?'on':''}"></span>
            <span class="rf-sa-id">
              <span class="rf-sa-n">${escC(p.name||'—')}</span>
              <span class="rf-sa-p">${escC(papel)}</span>
            </span>
            <span class="rf-sa-st ${p.confirmed?'ok':''}">${p.confirmed?'● na sala':'convite enviado'}</span>
            ${anfitriao&&!eu?`<button type="button" class="rf-sa-x"
              onclick="clKick('${escC(p.id)}','${escC(p.clubId||'')}')">Remover</button>`:'<span></span>'}
          </div>`;}).join('')}
        ${vagas?`<div class="rf-sa-vagas">
          <span class="rf-sa-mais">＋</span>
          <span>${vagas} vaga${vagas===1?' livre':'s livres'} — mande o código <b>${escC(codigo)}</b> ou o link acima</span>
        </div>`:''}
      </div>

      <div class="rf-sa-nota">
        ${rfIcone('sorteio',16)}
        <span>Ao começar, os clubes ${divLbl?('da '+escC(divLbl)+' '):''}são sorteados entre os treinadores
          que estiverem <b>na sala</b>. Quem não tiver entrado fica de fora e o clube vai para a máquina.</span>
      </div>
    </div>`;
  const podeComecar=anfitriao && dentro>=2;
  return rfWiz({trilha:papel, passo:(papel==='convidado')?rfPasso('Sala','convidado'):rfPasso('Convites','resenha'),
    contexto:divLbl||'',
    corpo,
    titulo: room.name||'Sala aberta',
    sub:'Chame os treinadores. Quando você começar, cada um recebe um clube por sorteio — ninguém escolhe.',
    nota: anfitriao
      ? (podeComecar?`${dentro} de ${parts.length} treinadores na sala`
                    :'Precisa de pelo menos 2 treinadores na sala para começar.')
      : 'À espera do anfitrião — toque em Sincronizar se ele já começou.',
    voltar:'clLobbyExit()', voltarLabel:rfIcone('fechar',16)+' Fechar a sala',
    cta: anfitriao?'Começar (sortear times)':'Sincronizar',
    ctaCurto: anfitriao?'Começar':'Sincronizar',
    ctaOff: anfitriao&&!podeComecar,
    ctaOn: anfitriao?'clLobbyStart()':'clSyncResenha()'});
}

/* =====================================================================
   6 · SORTEIO DO CLUBE
   ===================================================================== */
function rfOb6(){
  const d=CL.soloDraw||null;
  const lista=(d&&d.list)||((CL.draw||[]).map(x=>({name:x.name,clubId:x.clubId})));
  return rfCerimoniaSorteio({ lista, feitos:d?d.idx:lista.length, poolById:(d&&d.poolById)||{},
    meuIdx:0, trilha:'solo',
    cta:{ fim:'Iniciar temporada', fimCurto:'Começar', fimOn:'rfObIniciarTemporada()',
          andando:rfIcone('raio',16)+' Acelerar', andandoOn:'rfObAcelerar()' } });
}
/* ===== A CERIMONIA E UMA SO, SOLO E RESENHA =====
   O comentario desta tela sempre disse "e a mesma cerimonia no solo e na resenha" — mas a
   Resenha nunca foi ligada nela: scResenhaDraw continuava desenhando a versao da pele antiga
   (cl-rdraw). Agora as duas trilhas entram AQUI; o que muda por modo e so quem sou eu na lista
   (meuIdx), a regua (trilha) e os botoes. */
function rfCerimoniaSorteio(o){
  const lista=o.lista||[];
  const feitos=o.feitos||0;
  const total=lista.length||1;
  const poolById=o.poolById||{};
  const doPool=id=>poolById[id]||(typeof anyClubOf==='function'?anyClubOf(id):null);
  const meuIdx=(o.meuIdx!=null && o.meuIdx>=0)?o.meuIdx:0;
  const meuSaiu=meuIdx<feitos;
  const meu=(meuSaiu&&lista[meuIdx])?doPool(lista[meuIdx].clubId):null;
  /* A CERIMÔNIA RODA ANTES DE newGame() — `S` ainda é null aqui (o próprio
     startSoloDraw diz isso). `squad()` lê `S.squads`, então chamá-lo neste
     ponto ESTOURA o desenho inteiro: o cdraw morria, o soloDrawTick que vinha
     logo atrás nunca corria, e "Começar a temporada" parecia não fazer nada —
     a temporada nunca começava. Tudo que depende de `S` fica opcional; o que
     dá para mostrar sai do pool do sorteio, que já está montado. */
  const temS=(typeof S!=='undefined')&&!!S;
  const sq=(temS&&meu&&typeof squad==='function')?squad(lista[0].clubId)
          :((meu&&Array.isArray(meu.squad))?meu.squad:[]);
  const temporada=temS?(S.season||''):'';
  const caixa=temS?S.budget:null;
  const estadio=(temS&&typeof myStadium==='function')?((myStadium()||{}).capacity||0):0;
  const divLbl=(temS&&typeof divisionLabel==='function')?divisionLabel()
              :((meu&&typeof rfDivDoClube==='function')?rfDivDoClube(meu):'');
  const uk=(typeof universeCountryName==='function')?universeCountryName():'';
  const corpo=`
    <div class="rf-ob6">
      <div class="rf-ob6-l">
        <span class="rf-label-t">Clubes sorteados</span>
        ${lista.map((x,i)=>{
          const saiu=i<feitos, c=saiu?doPool(x.clubId):null;
          return `<div class="rf-ob6-lin ${i===meuIdx&&saiu?'meu':''} ${saiu?'':'espera'}">
            <span class="rf-ob6-nb ${saiu?'on':''}">${i+1}</span>
            <span class="rf-ob6-t">${escC(x.name||'Treinador')}${saiu&&c?' — '+escC(c.short||c.name||''):' — sorteando'}</span>
            ${saiu&&c?`<span class="rf-ob6-crest">${rfCrest(c,24)}</span>`:`<span class="rf-ob6-bola">${rfIcone('jogar',16)}</span>`}
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
            <span class="rf-ob6-d">${escC([divLbl,temporada].filter(Boolean).join(' · '))}</span>
            <div class="rf-ob-esc-h"></div>
            ${sq.length?`<div class="rf-ob-esc-lin"><span>Elenco</span><b>${sq.length} jogadores</b></div>`:''}
            ${caixa!=null?`<div class="rf-ob-esc-lin"><span>Caixa</span><b>${escC(fmt(caixa))}</b></div>`:''}
            ${estadio?`<div class="rf-ob-esc-lin"><span>Estádio</span><b>${grp(estadio)} lug.</b></div>`:''}`
          :`<span class="rf-ob6-bolag">${rfIcone('jogar',16)}</span>
            <span class="rf-ob6-n">Sorteando</span>
            <span class="rf-ob6-d">Boa sorte, treinador.</span>`}
        </div>
        <span class="rf-note rf-ob6-nota">A cerimônia acelera se você tocar em ⏩ — mas a bola é a mesma.</span>
      </div>
    </div>`;
  const fim=feitos>=total;
  const cta=o.cta||{};
  /* CLUBE é o passo 6 da régua. Estava em 4 — a régua acendia "Sala" durante o
     sorteio do clube, dois passos atrás de onde o jogador estava. */
  return rfWiz({passo:rfPasso('Clube', o.trilha), trilha:o.trilha, corpo,
    contexto:(o.trilha==='resenha')?'Modo Resenha':((o.trilha==='convidado')?'Convidado':undefined),
    sobre:'Cerimônia do sorteio',
    titulo: fim?'Times sorteados!':'Sorteando os clubes, boa sorte!',
    sub:'Cada treinador escolheu o país; o clube sai no sorteio. É a mesma cerimônia no solo e na resenha.',
    nota: fim?(cta.fimNota||'Pronto — pode entrar no clube.'):'Aguarde o sorteio',
    cta: fim?cta.fim:cta.andando,
    ctaCurto: fim?(cta.fimCurto||cta.fim):cta.andando,
    ctaOn: fim?cta.fimOn:cta.andandoOn,
    ctaOff: fim?!cta.fimOn:!cta.andandoOn});
}
/* O BOTÃO TEM DE ENTRAR PELA MESMA PORTA QUE O RELÓGIO.
   Este CTA chamava clEntrar() DIRETO e pulava clConfirmarClubes(), que é quem
   preenche CL.draw (e escolhe o universo, o país e as ligas de fundo). Quem
   clicava em vez de esperar o lançamento automático de 1,6s caía num
   "Cannot read properties of undefined (reading 'clubId')" na primeira linha
   de clEntrar, e o jogo não começava.

   Aqui não se lança nada à mão: faz-se exatamente o que o temporizador faria,
   só que agora. Uma porta só — duas davam dois comportamentos. */
function rfObIniciarTemporada(){
  if(CL._soloDrawTimer){ clearTimeout(CL._soloDrawTimer); CL._soloDrawTimer=null; }
  CL.soloDraw=null;
  CL._pendingLaunch=clConfirmarClubes;
  CL.screen='loading'; cdraw();
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
  const videoBv=(typeof clubWelcomeVideo==='function')?clubWelcomeVideo(CL.clubId)
               :(window.WELCOME_VIDEO_DEFAULT||'');
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
        <!-- O ESPAÇO 16:9 DO PACOTE É PARA O VÍDEO DE VERDADE — o do presidente
             entregando a camisa, o mesmo que a versão atual mostra aqui depois do
             sorteio, no Solo e na Resenha (ver clubWelcomeVideo). Ficou como
             maquete no port. O cartaz continua desenhado ATRÁS: se o ficheiro
             faltar, o onerror esconde o vídeo e o cartaz reaparece, em vez de
             deixar um retângulo preto. Sem som e em laço, como no jogo atual. -->
        <div class="rf-bv-play">
          <span class="rf-bv-pb">${rfIcone('jogar',19)}</span>
          <span class="rf-bv-pt">Vídeo do treinador contratado</span>
          <span class="rf-bv-ps">${escC(cl.short||'')}</span>
        </div>
        ${videoBv?`<video class="rf-bv-vid" src="${escC(videoBv)}" autoplay muted loop playsinline
          onerror="this.style.display='none'"></video>`:''}
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
        <span class="rf-bv-ks">${folha?'folha '+fmt(folha)+'/rodada':''}</span></div>
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
    </div>
    ${/* A ENTRADA NO CLUBE É O MOMENTO MAIS VISTO DE TODO O FUNIL: toda carreira
         nova passa por aqui, uma vez, com a atenção inteira na tela — e era o
         único momento grande do jogo sem espaço de inventário. Fica DEPOIS dos
         números e ANTES do botão de entrar: quem lê o elenco e o objetivo passa
         por ele a caminho do clique, sem que nada seja empurrado para baixo da
         dobra. Sem criativo publicado, rfAdEspaco desenha o lugar vazio com a
         medida exata — publicar não mexe no layout. */''}
    ${(typeof rfAdEspaco==='function')?rfAdEspaco('rf98.entrada.sorteio',
        {cls:'rf-ad-entrada',formato:'970×250'}):''}`;
  /* JOGAR é o passo 7, o último. Estava em 5 ("Convites"). */
  return rfWiz({passo:rfPasso('Jogar'), corpo,
    sobre:'Você é o novo treinador', titulo:'Bem-vindo ao '+(cl.short||'clube')+'.',
    sub:'A diretoria confia. A torcida quer acesso.',
    nota:'Daqui você cai direto na tela de Formação.',
    cta:rfIcone('jogar',16)+' Entrar no clube', ctaCurto:rfIcone('jogar',16)+' Entrar', ctaOn:'clBoasVindasContinuar()'});
}
/* O SAVE NÃO GUARDA O NOME DO ESTÁDIO — S.clubStadiumCap[id] só tem capacidade
   e o quanto foi construído na temporada. Então a linha diz "Casa do <clube>"
   em vez de inventar um nome próprio que o jogo não tem. A tela de referência
   escreve "Barão de Serra Negra"; quando o dado existir, entra aqui. */
/* O ESTADIO TEM NOME. O save guarda so capacidade e foto, e todas as telas
   diziam "Casa do Palmeiras" -- generico para clubes que tem nome proprio e
   conhecido. A tabela esta em data/estadios.js, com ~80 estadios brasileiros;
   quem nao estiver la continua no generico honesto, que e melhor do que um
   nome inventado para um clube real. */
function rfObEstadioNome(cl,st){
  if(st&&st.name) return st.name;
  if(typeof estadioNomeDe==='function') return estadioNomeDe(cl);
  return 'Casa do '+((cl&&cl.short)||'clube');
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
