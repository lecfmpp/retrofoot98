/* =====================================================================
   RetroFoot — LANDING (rebranding 2026)
   Portada de docs/rebranding-2026/telas/Landing - Home.html.

   O texto é o da tela, verbatim: é peça de marketing escrita, não conteúdo
   derivado do save. Onde a tela mostra número (500 vagas, 318 na fila,
   18 de 20 na sala), o número da referência fica — a ligação com o dado
   real vem depois, sem mexer no desenho.

   A página tem seis blocos, na ordem da tela:
     nav · hero · carreira solo · Modo Resenha · mercado/leilão ·
     Ligas Oficiais · lista de espera · rodapé escuro
   ===================================================================== */

/* ===== CADA ITEM TEM DOIS ROTULOS =====
   O segundo rotulo e' a forma curta do mesmo destino, e quem escolhe entre os dois e' o CSS, por
   largura de ecra (ver .rf-lp-link-l / .rf-lp-link-c). Nada e' escondido: o rotulo encolhe.

   POR QUE ISTO EXISTE: com oito itens os rotulos por extenso somavam 773px, e o cabecalho so'
   tem ~1200px depois da marca e das accoes — abaixo de 1280px a caixa dos links comecava a
   ROLAR, com a barra escondida por CSS, e os ultimos itens simplesmente deixavam de existir
   para quem nao soubesse arrastar. Item de menu que ninguem ve nao e' menu.

   AGORA SAO CINCO (pedido do dono, 20/09/2026). Sairam "Momentos", "Ganhar com a resenha" e
   "Embaixadores": o menu do topo passa a levar so' ao que explica o JOGO — o que ele e', como e'
   por dentro, o Modo Resenha, o seu jogador e os planos. AS SECOES CONTINUAM NA PAGINA e com os
   mesmos `id`, entao quem rola chega nelas e todo link `#rf-lp-momentos`, `#rf-lp-grana` ou
   `#rf-lp-ligas` que ja exista por ai (campanha, e-mail, post) continua a funcionar — o que saiu
   foi a porta do topo, nao o conteudo. Para religar, basta devolver a linha aqui. */
const RF_LP_NAV=[
  ['jogo','O jogo','O jogo'],['telas','Por dentro','Por dentro'],['resenha','Modo Resenha','Resenha'],
  ['planos','Planos','Planos'],
];

/* ===== A CONTA VIVE NO CABEÇALHO, EM TODA A TELA =====
   Sair da conta estava só dentro de Configurações — ou seja, só depois de
   entrar num save. Quem ficasse preso no assistente (conta errada, convite
   para a sala de outra pessoa) não tinha por onde sair. Agora o cabeçalho
   público, que é o MESMO da landing e de todas as telas do assistente,
   carrega sempre o estado da conta: nome + Sair quando há sessão, Entrar
   quando não há. */
/* ===== É PRO? =====
   Agora tem fonte de verdade: elifoot_v3.user_plans, lida pela funcao my_plan()
   do banco, que JA resolve o prazo — um `until` no passado deixa de ser PRO
   sozinho, sem ninguem ter de rebaixar a conta a mao. O adaptador guarda o
   resultado em cache por sessao (netCarregarPlano) porque isto e perguntado a
   cada redesenho do cabecalho.

   Continua a ser o UNICO sitio onde a interface decide se e PRO. */
function rfContaEhPro(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  return st.pro===true;
}
/* ===== O PLANO E OS SEUS LIMITES =====
   Mesma regra do rfContaEhPro acima, um degrau mais fino: com tres planos
   (Peladeiro / Resenha / Embaixador — ver RF_PLANOS mais abaixo) nao chega
   saber se e' pago, e preciso saber QUAL, porque o que os separa sao numeros.

   OS NUMEROS NAO ESTAO AQUI DE PROPOSITO. Vem do banco, por my_plan(), que e'
   a mesma funcao que o servidor consulta para RECUSAR (o trigger de solo_saves,
   o create_game, o claim_seat). Escrever "3" e "10" tambem no navegador criaria
   uma segunda tabela de limites, e um dia uma das duas ficava por atualizar.

   E QUANDO NAO SE SABE, NAO SE TRANCA. Sem sessao, com o banco fora do ar, ou
   na bancada de testes (harness-adapter devolve authStatus sem plano), os
   campos chegam null — e null aqui quer dizer "liberado". Trancar por falta de
   resposta e' trancar quem pagou; deixar passar um clique a mais nao custa
   nada, porque a trava que vale e' a do servidor. */
function rfPlanoAtual(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  return st.plan || 'free';
}
/* O plano gratis chama-se 'free' no banco e 'gratis' na pagina (a chave em RF_PLANOS); os
   pagos — 'pro' e os antigos 'resenha'/'embaixador' — sao todos 'pro' na pagina. */
function rfPlanoCartao(plano){
  const k=plano||rfPlanoAtual();
  /* os pagos antigos (Resenha, Embaixador) valem como Pro desde 25/09 */
  return (k==='resenha'||k==='embaixador'||k==='pro') ? 'pro' : 'gratis';
}
function rfSavesTeto(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  const t=st.savesMax;
  return (t===null||t===undefined) ? Infinity : Number(t);
}
/* ===== A COTA E' DE CRIACOES NO MES, NAO DE SAVES VIVOS =====
   Contava-se quantos saves EXISTEM, e isso deixava a porta aberta ao vaivem:
   criar, apagar, criar outro, sem fim — o teto de 3 era, na pratica, saves
   infinitos desde que so' 3 vivessem ao mesmo tempo.

   Agora conta-se quantos foram CRIADOS no mes, e o numero vem do banco (o livro
   solo_save_criacoes, via my_plan), nao da lista local: apagar um save encolhe a
   lista e NAO devolve a vaga, entao contar a lista daria a resposta errada
   exactamente no caso que esta regra existe para cobrir. */
function rfSavesUsados(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  return Number(st.savesNoMes||0);
}
function rfSavesRenovaEm(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  if(!st.savesRenovaEm) return null;
  try{ return new Date(st.savesRenovaEm).toLocaleDateString('pt-BR',{day:'2-digit',month:'long'}); }
  catch(e){ return null; }
}
/* Ainda cabe uma carreira nova neste mes? Sem resposta do banco (savesNoMes
   null) diz que sim — a recusa que vale e' a do servidor, e trancar por falta de
   resposta e' trancar quem tem direito. */
function rfPodeSalvarNovo(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  if(st.savesNoMes==null) return true;
  return rfSavesUsados() < rfSavesTeto();
}
function rfPodeHospedar(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  return st.podeHospedar !== false;
}
/* QUANTAS PESSOAS CABEM NUMA SALA — que não é o mesmo que quantos assentos ela
   tem (a Série D tem 20 clubes; o plano é que limita as pessoas, ver rfSalaTeto
   em rf26-resenha-entrada).

   O número certo é o do ANFITRIÃO, e um convidado não vê o plano de outra
   pessoa. Mas só o Embaixador abre sala, logo toda sala existente tem o teto
   dele — é o que RF_SALA_HUMANOS serve, e só quando não dá para perguntar. A
   autoridade continua a ser sala_max, no banco, que é o número por que o
   claim_seat recusa. */
/* reserva para quando o plano ainda nao chegou do servidor — tem de acompanhar o `sala_max`
   de elifoot_v3.plano_limites (10 no Beta), senao a tela promete um numero e o assento nega */
const RF_SALA_HUMANOS = 10;
function rfTetoHumanos(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  return Number(st.salaMax||0) || RF_SALA_HUMANOS;
}
function rfPodeAvatarIA(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  return st.avatarIA !== false;
}
/* ===== OS 7 DIAS DE RESENHA DO PELADEIRO =====
   Contam da criacao da conta, nao da primeira sala: quem so' quer provar o modo
   nao precisa de o descobrir para o relogio comecar. Plano pago nao tem prazo.

   Aqui, como nas outras, `false` explicito e' que tranca — `null` (o banco nao
   respondeu, ou e' uma versao sem o campo) deixa passar. Trancar por falta de
   resposta e' trancar quem tem direito. A recusa que vale acontece no servidor,
   no claim_seat. */
function rfPodeResenha(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  return st.podeResenha !== false;
}
/* quantos dias ainda faltam, para a tela poder dizer "faltam 3 dias" em vez de
   uma data seca. Devolve null para quem nao tem prazo nenhum. */
function rfResenhaDiasRestantes(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  if(!st.resenhaAte) return null;
  const ms=new Date(st.resenhaAte).getTime()-Date.now();
  return ms<=0 ? 0 : Math.ceil(ms/86400000);
}

/* ===== O CADEADO EXPLICA-SE =====
   Uma trava que so' diz "nao" perde a pessoa. Cada uma delas abre esta janela:
   o motivo em primeiro (o que ela tentou fazer agora mesmo), e so' depois o
   plano que destranca — com o preco e os itens lidos de RF_PLANOS, para nao
   nascer aqui uma segunda lista de precos.

   O botao chama rfPlanoCta(), que ja e' o caminho de sempre: enquanto nao ha
   checkout, leva a' lista de espera. A origem vai carimbada com a trava que
   trouxe a pessoa ate' aqui ("jogo · saves · Resenha"), que e' o que depois
   diz qual das travas de facto converte. */
const RF_TRAVAS={
  saves:{ tier:'pro', titulo:'O Peladeiro tem uma carreira',
    texto:()=>'No <b>Peladeiro</b> você joga <b>uma carreira</b> no Modo Solo, com a 1ª temporada inteira. Carreiras e temporadas ilimitadas são do <b>Pro</b>.',
    saida:'A carreira que você já tem continua inteira.' },
  hospedar:{ tier:'pro', titulo:'O Modo Resenha é do Pro',
    texto:()=>'<b>Abrir a sua sala</b> — ser o anfitrião, chamar a turma pelo código e mandar no ritmo da liga — é <b>exclusivo do Pro</b> quando lançarmos a versão Beta do Modo Resenha.',
    saida:'O Modo Solo continua seu: a sua carreira contra a máquina está intacta.' },
  resenha:{ tier:'pro', titulo:'O Modo Resenha é do Pro',
    texto:()=>'Jogar a mesma semana com a turma, na sala de um amigo ou na sua, é <b>exclusivo do Pro</b> quando lançarmos a versão Beta do Modo Resenha.',
    saida:'O Modo Solo continua seu: a sua carreira contra a máquina está intacta.' },
  velocidade:{ tier:'pro', titulo:'O ritmo Ultrassônico é do Pro',
    texto:()=>'No <b>Ultrassônico</b> a partida inteira passa em cerca de dez segundos — é o ritmo de quem quer atravessar a temporada sem perder o jogo de vista. No Peladeiro, a semana ao vivo corre em Curto, Médio ou Longo.',
    saida:'Curto já é rápido: a partida dá pouco mais de meio minuto, e você continua vendo tudo — inclusive o Modo Camarote.' },
  /* O AVATAR POR IA SAIU DO PLANO (25/09): vira item avulso, com venda própria. Enquanto ela
     não existe, a trava explica e não oferece plano nenhum — o Pro não traz o avatar. */
  avatar:{ tier:null, titulo:'O retrato por IA vem aí',
    texto:()=>'Pôr a <b>sua cara</b> dentro do jogo — retrato gerado a partir de uma foto sua, na beira do campo e na ficha de treinador — vai ser um item à parte, e chega em breve.',
    saida:'As caras prontas continuam à sua disposição, de graça.' },
};
function rfTrava(chave){
  /* anfitriao, cota de carreiras e fim dos 7 dias abrem o popup novo dos dois planos
     (rf26-planos.js); velocidade e avatar continuam nesta janela */
  if(typeof rfUpTrava==='function' && rfUpTrava(chave)) return;
  /* A trava de saves aponta para o plano SEGUINTE ao de quem bateu no teto:
     quem esta no Peladeiro sobe para o Resenha, quem ja esta no Resenha so'
     resolve com o Embaixador. Oferecer a alguem o plano que ele ja tem e' o
     jeito mais rapido de perder a venda. */
  const t=RF_TRAVAS[chave]; if(!t) return;
  const p=RF_PLANOS.find(x=>x.key===t.tier)||{};
  const semPlano=!t.tier;
  /* O PRECO SAI DA MESMA FUNCAO DOS CARTOES. Ele era lido de `p.preco`, campo
     que deixou de existir quando os precos viraram centavos para o seletor
     mensal/anual — a janela passou a abrir com o lugar do preco em branco, que
     e' o pior sitio possivel para faltar um numero. */
  const q=semPlano?{}:rfPlanoPrecoPartes(p, RF_LP_CICLO);
  const itens=(p.itens||[]).map(i=>`<li><span class="rf-lp-tick">✓</span>${escC(i)}</li>`).join('');
  const corpo=`<div class="rf-trava ${p.destaque?'ouro':''}">
    ${/* TETO INFINITO OU DESCONHECIDO NAO VIRA NUMERO NA FRASE. Sem esta guarda a
          janela dizia "ate' Infinity carreiras por mes" — o que acontecia a quem
          nao tem sessao, porque sem plano lido o teto e' Infinity. */''}
    <p class="rf-trava-p">${t.texto(Number.isFinite(rfSavesTeto())?rfSavesTeto():null)}</p>
    ${semPlano?'':`<div class="rf-trava-plano ${p.destaque?'ouro':''}">
      <div class="rf-trava-hd">
        <span class="rf-trava-n">${p.destaque?'<i class="rf-trava-coroa">👑</i>':''}${escC(p.nome||'')}</span>
        <span class="rf-trava-v">${q.cheio?`<s class="rf-trava-cheio">${escC(q.cheio)}</s>`:''}${escC(q.v)}<i>${escC(q.c)}</i></span>
      </div>
      <ul class="rf-trava-l">${itens}</ul>
      <span class="rf-trava-a">${escC(q.nota)}</span>
    </div>`}
    <span class="rf-trava-saida">${escC(typeof t.saida==='function'?t.saida():t.saida)}</span>
    <div class="rf-trava-bts">
      <button type="button" class="rf-trava-bt-2" onclick="clCloseOverlay()">${semPlano?'Entendi':'Agora não'}</button>
      ${semPlano?'':`<button type="button" class="rf-trava-bt" onclick="clCloseOverlay();rfPlanoCta('${t.tier}','${chave}')">${escC(p.cta||'Quero assinar')}</button>`}
    </div>
  </div>`;
  if(typeof overlayC==='function' && typeof dlg==='function')
    overlayC(dlg(t.titulo, corpo, {w:520, tone:'marca', glyph:'🔒'}));
  else if(typeof toastC==='function') toastC(t.titulo);
}
/* FASE LISTA DE ESPERA — DESLIGADA em 2026-09-04, quando o pagamento entrou no ar.
   Com a flag ligada, quem NÃO tinha sessão não via o "Entrar": a única porta era a lista de
   espera, porque não havia como assinar. Agora há — o Stripe está ligado e os botões dos
   planos abrem o checkout —, e manter a lista seria pedir o e-mail a quem já podia pagar.
   A flag fica (não se apaga uma porta que se pode precisar de reabrir num lançamento
   futuro), e com ela ficam os dois caminhos: `true` volta tudo à lista. */
const RF_SO_LISTA = false;
/* PORTA DE TESTE dos admins: abrir /?acesso=embaixador98 UMA vez libera o
   "Entrar" neste navegador (fica no localStorage). É trava de fase, não
   segurança — serve para o público não ver porta de cadastro; quem tem o
   link testa normalmente. Revogar = trocar o código aqui. */
(function(){
  try{
    if(new URLSearchParams(location.search).get('acesso') === 'embaixador98')
      localStorage.setItem('rf_acesso_teste', '1');
  }catch(e){}
})();
function rfSoLista(){
  if(!RF_SO_LISTA) return false;
  try{ return localStorage.getItem('rf_acesso_teste') !== '1'; }catch(e){ return true; }
}
function rfContaChipHTML(minimo){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};
  if(!st.loggedIn){
    if(rfSoLista()) return '';
    /* 'login' e nao 'solo': o modo vai direto para `CL.auth.mode`, e qualquer valor que nao
       seja 'login' abre a aba CRIAR CONTA (ver rfOb1). Um botao que diz "Entrar" e abre o
       cadastro manda quem ja tem conta preencher nome e senha nova. */
    return `<button type="button" class="rf-lp-entrar" onclick="clGoModo('login')">${rfIcone('chave',16)} Entrar</button>`;
  }
  const nome=st.name||(st.email||'').split('@')[0]||'treinador';
  const pro=rfContaEhPro();
  /* ===== O CRACHA E' DE TODOS OS PLANOS, NAO SO' DO DE CIMA =====
     Ele dizia o plano apenas a quem paga; quem esta' no gratis via um botao neutro, sem nome
     nenhum. Isso escondia justamente o que o cabecalho pode dizer de mais util a quem ainda
     nao assinou: em que plano voce esta'. Agora os tres tem cracha, cada um com a sua cor —
     Peladeiro no amarelo da marca, Resenha em prateado com o chopp (o mesmo simbolo do modo,
     na barra lateral), Embaixador no dourado com a coroa, como sempre foi.
     O nome sai de RF_PLANOS, a mesma lista que a pagina de precos usa: um plano novo entra
     aqui sozinho, e so' a cor precisa de uma linha de CSS. */
  const chave=rfPlanoCartao();                       // 'gratis' | 'pro'
  const selo=(RF_PLANOS.find(p=>p.key===chave)||{}).nome||'Peladeiro';
  const glifo={ pro:'👑' }[chave]||'';
  /* O NOME E O BOTAO DE JOGAR. Com sessao aberta o cabecalho ficava sem
     nenhuma porta de entrada: o "Entrar" some (ja esta dentro) e sobrava um
     cracha passivo com o nome. */
  return `<button type="button" class="rf-lp-conta ${pro?'pro':''} plano-${escC(chave)}" onclick="rfIrParaModo()"
      title="Jogar como ${escC(st.email||nome)} · plano ${escC(selo)}">
      ${glifo?`<span class="rf-lp-coroa" aria-hidden="true">${glifo}</span>`:rfIcone('jogar',16)}
      <span class="rf-lp-conta-n">${escC(nome)}</span>
      <span class="rf-lp-pro">${escC(selo)}</span>
    </button>
    <button type="button" class="rf-lp-sair" onclick="rfAcSairConta()">Sair</button>
    ${/* O BURGER FICA MESMO NO MODO MINIMO — e' onde o "Sair" vive no telemovel (a media query
         esconde-o do cabecalho). Tirar o menu tiraria o logout do telefone; o que ele mostra e'
         que encolhe (ver rfLpMenu). */''}
    <button type="button" class="rf-lp-burger" onclick="rfLpMenu(${minimo?1:0})" aria-label="Menu">
      ${rfIcone('menu',18)}
    </button>`;
}
/* ===== O MENU DO TELEMOVEL =====
   O cabecalho publico escondia os proprios links abaixo de 900px e nao tinha
   hamburguer nenhum — por isso "Entrar na lista" desaparecia no telefone e o
   "Sair" tinha de ficar a vista, apertado ao lado do nome. Agora tudo o que
   nao cabe vive aqui, e no cabecalho fica so o nome. */
function rfLpMenu(minimo){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};
  const links=minimo?'':RF_LP_NAV.map(([k,l])=>
    `<button type="button" class="rf-sheet-i" onclick="clCloseOverlay();rfLpIr('${k}')">
      <span class="rf-nav-l">${escC(l)}</span></button>`).join('');
  /* na fase da lista este era o item em destaque do menu; com o pagamento no ar o destaque
     passa a ser o que a pessoa vem fazer — ver os planos e assinar. */
  const lista=minimo ? '' : (RF_SO_LISTA
    ? `<button type="button" class="rf-sheet-i destaque" onclick="clCloseOverlay();rfLpIr('lista')">
      <span class="rf-nav-l">Entrar na lista</span></button>`
    : `<button type="button" class="rf-sheet-i destaque" onclick="clCloseOverlay();rfLpIr('planos')">
      <span class="rf-nav-l">${RF_LP_CTA_TXT}</span></button>`);
  const conta = st.loggedIn ? `<div class="rf-sheet-sep"></div>
      <div class="rf-sheet-conta">
        <span class="rf-sheet-conta-ic" aria-hidden="true">👤</span>
        <span class="rf-sheet-conta-id">
          <span class="rf-sheet-conta-n">${escC(st.name||'treinador')}</span>
          <span class="rf-sheet-conta-e">${escC(st.email||'')}</span>
        </span>
      </div>
      <button type="button" class="rf-sheet-i sair" onclick="clCloseOverlay();rfAcSairConta()">
        <span class="rf-nav-l">Sair da conta</span></button>`
    : (rfSoLista() ? '' : `<div class="rf-sheet-sep"></div>
      <button type="button" class="rf-sheet-i" onclick="clCloseOverlay();clGoModo('login')">
        <span class="rf-nav-l">Entrar na minha conta</span></button>`);
  if(typeof rfSheet==='function') rfSheet('Menu', `<div class="rf-sheet-list">${links}${lista}${conta}</div>`);
}
/* `extra` é o encaixe da DIREITA do cabeçalho: dentro do assistente é ali que
   mora o "‹ Voltar ao modo" do desenho, no lugar dos botões de entrar. Nas
   páginas públicas ele vem vazio e o cabeçalho é o de sempre.
   A CONTA VEM SEMPRE DEPOIS do extra — nunca é substituída por ele. */
/* ===== DENTRO DO ASSISTENTE O CABECALHO ENCOLHE =====
   O assistente usava o cabecalho publico inteiro: oito links de seccao da home, o botao dos
   planos e o menu. No meio de um fluxo de sete passos, cada um deles e' uma porta para fora —
   e as portas estavam mais visiveis do que o passo. Fica o que serve a quem esta' a meio: a
   marca (que leva a' home, para quem quer mesmo sair) e a conta (entrar ou sair).
   `minimo` NAO desliga a zona dos links: ela fica vazia. A barra e' uma grelha de tres zonas
   (1fr auto 1fr) e sem o meio a marca deixaria de estar na esquerda. */
function rfLpNavHTML(extra, minimo){
  return `<nav class="rf-lp-nav ${minimo?'minima':''}">
    <!-- A ASSINATURA E DESENHADA, nao montada. Era o simbolo mais a palavra escrita
         em texto ao lado; a marca nova tem um lockup proprio, com o espacamento e o
         peso da palavra definidos por quem a desenhou. Montar a mao nunca bate. -->
    <a class="rf-lp-marca" href="/" aria-label="Retrofoot.com.br">
      <img class="marca" src="img/marca.svg" alt="Retrofoot.com.br" height="26">
    </a>
    ${/* ===== TRES ZONAS, NAO UMA FILA =====
         Era tudo a seguir ao logotipo, encostado a' esquerda, com um espacador a empurrar as
         accoes para a direita — o menu ficava colado a' marca e o cabecalho lia-se como uma
         lista, nao como uma barra. Agora sao tres zonas numa grelha `1fr auto 1fr`: a marca a'
         esquerda, os links CENTRADOS (centrados de verdade — a grelha nao deixa o lado mais
         largo puxar o meio) e as accoes a' direita. E' o mesmo esqueleto das barras de dentro
         do jogo, e por isso o cabecalho passa a parecer parte da mesma peca. */''}
    <div class="rf-lp-links">
      ${minimo?'':RF_LP_NAV.map(([k,l,c])=>`<button type="button" class="rf-lp-link" onclick="rfLpIr('${k}')" title="${escC(l)}"><span class="rf-lp-link-l">${escC(l)}</span><span class="rf-lp-link-c">${escC(c||l)}</span></button>`).join('')}
    </div>
    <div class="rf-lp-acoes">
      ${extra||''}
      ${(!minimo && extra==null) ? `<button type="button" class="rf-lp-btlista" onclick="${rfLpComecarOn()}">${RF_SO_LISTA?'Entrar na lista':RF_LP_CTA_TXT}</button>` : ''}
      ${rfContaChipHTML(minimo)}
    </div>
  </nav>`;
}
/* o cabecalho leva DIRETO ao modo: quem clica aqui ja esta logado e o passo 1
   nao teria nada a perguntar (ver rfOb1Logado, que e a porta de quem chega
   pelo "Entrar" da landing sem sessao aberta na cabeca). */
function rfIrParaModo(){ CL.screen='modo'; cdraw(); }
/* onclick de qualquer CTA que leva ao jogo: na fase de lista de espera ele
   vira um atalho para a lista, para o botão não prometer o que não cumpre. */
function rfLpEntrarOn(chamada){
  return rfSoLista() ? "rfLpIr('lista')" : chamada;
}
/* ===== UM SO' BOTAO, UM SO' DESTINO =====
   Os CTAs da home diziam tres coisas diferentes — "Jogar de graca", "Comecar uma carreira",
   "Ver o mercado" — e os tres saltavam DIRETO para o assistente, passando por cima da tabela de
   precos. Quem clicava nunca via que ha planos; quem queria assinar tinha de descobrir a seccao
   sozinho. Agora todos dizem a mesma coisa e levam ao mesmo sitio: a seccao de planos, onde a
   pessoa escolhe com que plano comeca. O Peladeiro nao passa pelo Stripe — vai direto para o
   cadastro (ver rfPlanoEscolher).
   A trava da lista de espera continua a valer por cima de tudo: enquanto o jogo nao abriu, o
   destino e a lista, e e por isso que isto e uma funcao e nao um `onclick` escrito a mao. */
const RF_LP_CTA_TXT='Começar carreira';
function rfLpComecarOn(){ return rfSoLista() ? "rfLpIr('lista')" : "rfLpIr('planos')"; }
function rfLpIr(k){
  const el=document.getElementById('rf-lp-'+k);
  if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
}

/* ---- bloco de seção: sobrancelha, título, prosa, marcadores e CTA ---- */
function rfLpSecaoHTML(o){
  return `<div class="rf-lp-sec-txt">
    <span class="rf-lp-eyebrow">${escC(o.eyebrow)}</span>
    <h2 class="rf-lp-h2">${escC(o.titulo)}</h2>
    <p class="rf-lp-p">${escC(o.prosa)}</p>
    ${o.itens?`<ul class="rf-lp-itens">${o.itens.map(i=>`<li><span class="rf-lp-losango">◆</span>${escC(i)}</li>`).join('')}</ul>`:''}
    <!-- SEM escC no rótulo: desde que os ícones viraram SVG, o rótulo traz marcação
         (rfIcone(...) + texto). Escapado, o botão exibia o código do <svg> como
         TEXTO e esticava a landing para mais de 7000px de largura. Mesmo defeito
         que já tinha acontecido nos botões do assistente. Os rótulos são literais
         do código, nunca entrada do utilizador. -->
    ${o.cta?`<button type="button" class="rf-lp-cta2" onclick="${o.ctaOn||''}">${o.cta}</button>`:''}
  </div>`;
}

/* ---- as maquetes: telas do jogo desenhadas dentro da landing ---- */
/* As duas maquetes do hero (semana ao vivo e camarote desenhados a mao) sairam
   em 28/08: o hero passou a levar o video de apresentacao, e as telas de
   verdade — fotografadas do jogo — vivem agora na seccao "Por dentro do jogo".
   Maquete desenhada ao lado de foto real so serviria para lembrar que uma
   delas e mentira. As tres que restam (tabela, chat e leilao) continuam a
   ilustrar as seccoes de texto. */
/* ---- as telas do jogo, fotografadas (ver scripts/capture-home.mjs) ----
   AS MAQUETES MORRERAM AQUI. Classificação, chat e leilão eram HTML escrito à
   mão dentro desta página: números inventados, colunas que foram saindo do
   lugar conforme o jogo mudava, e um leilão que já não parecia o leilão. Uma
   página que vende um produto não pode desenhar o produto — mostra ele. */
function rfLpFotoHTML(src, alt, cls){
  return `<figure class="rf-lp-foto ${cls||''}">
    <img src="${escC(src)}" alt="${escC(alt)}" loading="lazy" width="1600" height="1000">
  </figure>`;
}


/* =====================================================================
   O VÍDEO DE APRESENTAÇÃO — o palco está montado, o filme ainda não
   ---------------------------------------------------------------------
   Enquanto o vídeo de divulgação não existe, o hero mostra o LUGAR dele:
   moldura 16:9, botão de play e o recado de que está a caminho. Quando o
   arquivo chegar, é UMA linha a mudar — troque RF_LP_HERO_VIDEO por
   'video/apresentacao.mp4' e o mesmo espaço vira o player, sem mexer em
   mais nada. Placeholder sem essa saída vira placeholder eterno.
   ===================================================================== */
const RF_LP_HERO_VIDEO = null;         // ex.: 'video/apresentacao.mp4'
const RF_LP_HERO_POSTER = 'img/home/camarote.webp';
/* ===== O FILME CHEGOU, E VEIO DO YOUTUBE =====
   O placeholder previa um mp4 nosso; o vídeo que existe é o da primeira Resenha, no canal.
   Guardamos só o ID — a moldura, o play e o cartaz continuam sendo os desta página.

   NÃO CARREGA O PLAYER DE ENTRADA. Um <iframe> do YouTube no topo da home custa centenas de
   kB e cookies de terceiros a TODA visita, mesmo a de quem nunca aperta o play. O que se vê
   é o cartaz do próprio vídeo com o botão desta casa; o player só nasce no clique — e aí já
   entra tocando, que é o que quem clicou pediu. */
const RF_LP_HERO_YT = 'Nj43fxhQ4pY';

function rfLpVideoTocar(el){
  if(!el || el.dataset.tocando) return;
  el.dataset.tocando='1';
  el.classList.remove('vazio');   // 'yt' fica: e' ela que da' o fundo escuro por tras do player
  el.innerHTML=`<iframe class="rf-lp-video-el" src="https://www.youtube-nocookie.com/embed/${escC(RF_LP_HERO_YT)}?autoplay=1&rel=0&modestbranding=1"
    title="Vídeo de apresentação do RetroFoot" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture"
    allowfullscreen></iframe>`;
}
function rfLpHeroVideoHTML(){
  if(RF_LP_HERO_YT){
    /* maxres não existe para todo vídeo; o hq existe sempre — daí a rede no onerror */
    const cartaz=`https://i.ytimg.com/vi/${RF_LP_HERO_YT}/maxresdefault.jpg`;
    const reserva=`https://i.ytimg.com/vi/${RF_LP_HERO_YT}/hqdefault.jpg`;
    return `<div class="rf-lp-video yt" role="button" tabindex="0"
        aria-label="Tocar o vídeo de apresentação do RetroFoot"
        onclick="rfLpVideoTocar(this)"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();rfLpVideoTocar(this)}">
      <img class="rf-lp-video-cartaz" src="${escC(cartaz)}" alt="" loading="lazy"
        onerror="this.onerror=null;this.src='${escC(reserva)}'">
      <span class="rf-lp-video-veu"></span>
      <span class="rf-lp-video-play">▶</span>
      <span class="rf-lp-video-tag">Assista</span>
    </div>`;
  }
  if(RF_LP_HERO_VIDEO){
    return `<div class="rf-lp-video">
      <video class="rf-lp-video-el" controls preload="metadata"
        poster="${escC(RF_LP_HERO_POSTER)}" playsinline>
        <source src="${escC(RF_LP_HERO_VIDEO)}" type="video/mp4">
      </video>
    </div>`;
  }
  return `<div class="rf-lp-video vazio" aria-hidden="true">
    <div class="rf-lp-video-in">
      <span class="rf-lp-video-play">▶</span>
      <span class="rf-lp-video-t">O trailer está no forno</span>
      <span class="rf-lp-video-s">Aqui vai rodar o vídeo de apresentação do RetroFoot.</span>
    </div>
    <span class="rf-lp-video-tag">Em breve</span>
  </div>`;
}

/* =====================================================================
   POR DENTRO DO JOGO — as telas de VERDADE, não maquete
   ---------------------------------------------------------------------
   As imagens saem de scripts/capture-home.mjs, que dirige o jogo rodando
   em localhost e fotografa cada tela na pele atual. Quando a interface
   mudar, rode o script outra vez em vez de retocar imagem à mão — é por
   isso que ele existe.

   A TROCA DE ABA NÃO PASSA POR cdraw(). Redesenhar a landing inteira a
   cada clique jogaria a rolagem de volta para o topo, e o visitante que
   está no meio da página seria cuspido para fora dela. Aqui só se acende
   e apaga classe, com o DOM que já está na tela.
   ===================================================================== */
const RF_LP_TELAS=[
  ['formacao','Formação','Escale o time, escolha a tática e veja o campo se montar. É aqui que a semana começa.','img/home/formacao.webp'],
  ['elenco','Elenco','Vinte e poucos nomes, energia, moral, salário e valor de mercado — tudo numa tela só.','img/home/elenco.webp'],
  ['ficha','Ficha do jogador','Cada atleta tem características, pontos fortes, fracos e uma cara. Dá pra saber quem decide.','img/home/ficha-jogador.webp'],
  ['rodada','Rodada ao vivo','Os 10 jogos da divisão rolando ao mesmo tempo, com gol saindo na tela ao lado.','img/home/rodada-ao-vivo.webp'],
  ['camarote','Modo Camarote','Só o seu jogo, em tela cheia, com narração lance a lance e as estatísticas do confronto.','img/home/camarote.webp'],
  ['penalti','Pênalti','Pênalti a favor: você escolhe quem bate e pra que canto. E aí a torcida cala a boca.','img/home/penalti.webp'],
];
function rfLpTela(k){
  document.querySelectorAll('[data-tela]').forEach(el=>{
    el.classList.toggle('on', el.getAttribute('data-tela')===k);
  });
  document.querySelectorAll('[data-telafoto]').forEach(el=>{
    el.classList.toggle('on', el.getAttribute('data-telafoto')===k);
  });
}
function rfLpTelasHTML(){
  const abas=RF_LP_TELAS.map(([k,l],i)=>
    `<button type="button" class="rf-lp-tela-ab ${i===0?'on':''}" data-tela="${k}"
      onclick="rfLpTela('${k}')">${escC(l)}</button>`).join('');
  const fotos=RF_LP_TELAS.map(([k,l,d,img],i)=>
    `<figure class="rf-lp-tela-foto ${i===0?'on':''}" data-telafoto="${k}">
      <img src="${escC(img)}" alt="${escC(l)} — tela do RetroFoot" loading="lazy" width="1600" height="1000">
      <figcaption>${escC(d)}</figcaption>
    </figure>`).join('');
  return `<section class="rf-lp-telas rf-lp-f-branco" id="rf-lp-telas">
    <div class="rf-lp-telas-in">
      <span class="rf-lp-eyebrow">Por dentro do jogo</span>
      <h2 class="rf-lp-h2">Isto aqui não é maquete. É o jogo rodando.</h2>
      <p class="rf-lp-p">Nenhuma dessas telas foi desenhada pra propaganda: são fotos do RetroFoot aberto, no meio de uma temporada da Série D.</p>
      <div class="rf-lp-tela-abas">${abas}</div>
      <div class="rf-lp-tela-palco">${fotos}</div>
    </div>
  </section>`;
}

/* =====================================================================
   MOMENTOS — os vídeos que o jogo solta sozinho
   ---------------------------------------------------------------------
   Os cinco arquivos já existem em public/video/ e o jogo os usa nos modais
   de convite, título, artilharia e crise. O cartaz de cada um é um quadro
   extraído do próprio vídeo (ffmpeg), então nunca vai divergir do filme.

   O play NÃO troca a página: injeta o <video> dentro do próprio cartão e
   toca ali. Pelo mesmo motivo das abas acima — quem está no meio da
   landing continua no meio dela.
   ===================================================================== */
const RF_LP_VIDEOS=[
  ['convite-jantar','Convite pro jantar','O presidente chama pra jantar. Pode ser elogio, pode ser cilada.'],
  ['convite-assinatura','Outro clube te quer','Chegou proposta de fora. Fica no projeto ou pula pra grana?'],
  ['momento-campeao','Campeão','Taça na mão, confete caindo. O motivo de tudo isso.'],
  ['momento-artilheiro','Artilheiro','O seu camisa 9 termina a temporada como o cara que mais fez gol.'],
  ['momento-crise','Time em crise','Sequência ruim, torcida na bronca e a diretoria de olho na sua cadeira.'],
];
function rfLpTocar(k, botao){
  const cx=botao&&botao.closest?botao.closest('.rf-lp-mom'):null;
  const palco=cx?cx.querySelector('.rf-lp-mom-media'):null;
  if(!palco) return;
  palco.innerHTML=`<video class="rf-lp-mom-video" controls autoplay playsinline
    preload="metadata" poster="img/home/posters/${k}.webp">
    <source src="video/${k}.mp4" type="video/mp4">
  </video>`;
}
function rfLpMomentosHTML(){
  const cartoes=RF_LP_VIDEOS.map(([k,t,d])=>`<div class="rf-lp-mom">
    <div class="rf-lp-mom-media">
      <img src="img/home/posters/${k}.webp" alt="${escC(t)}" loading="lazy" width="720" height="405">
      <button type="button" class="rf-lp-mom-play" onclick="rfLpTocar('${k}',this)"
        aria-label="Assistir: ${escC(t)}">▶</button>
    </div>
    <span class="rf-lp-mom-t">${escC(t)}</span>
    <span class="rf-lp-mom-d">${escC(d)}</span>
  </div>`).join('');
  return `<section class="rf-lp-momentos rf-lp-f-navy" id="rf-lp-momentos">
    <div class="rf-lp-momentos-in">
      <span class="rf-lp-eyebrow">Momentos</span>
      <h2 class="rf-lp-h2">O jogo te procura. E às vezes é pra dar notícia ruim.</h2>
      <p class="rf-lp-p">Não é só tabela e planilha: o presidente liga, o rival assedia, a torcida comemora e a diretoria cobra. Dá play e veja o que aparece na sua tela.</p>
      <div class="rf-lp-mom-grade">${cartoes}</div>
    </div>
  </section>`;
}

/* =====================================================================
   OS PLANOS
   ---------------------------------------------------------------------
   Fonte única dos preços e do que cada plano dá. Mexeu aqui, mudou na
   página — não há segunda lista de preço espalhada pela landing, e é
   assim que tem de continuar: preço em dois sítios é preço errado num
   deles mais cedo ou mais tarde.

   O Embaixador leva o MESMO dourado do botão Pro do cabeçalho (a coroa e o
   degradê de .rf-lp-conta.pro). Não é enfeite: quem paga o plano de cima
   já vê essa cor no próprio nome depois de entrar, e a página promete
   exatamente o que o jogo entrega.
   ===================================================================== */
/* ===== GRÁTIS × PRO (25/09, docs/plano-gratis-pro.md) =====
   Eram três (Peladeiro, Resenha, Embaixador) com cotas mensais e prazos que ninguém entendia.
   Agora são dois: o Grátis joga a carreira inteira da 1ª temporada; o Pro continua a carreira
   para sempre. As chaves antigas `resenha` e `embaixador` continuam a existir no banco (quem as
   pagou) e contam como Pro — ver rfPlanoCartao. */
const RF_PLANOS=[
  /* O GRÁTIS CHAMA-SE PELADEIRO (pedido do dono, 25/09): o nome é a graça do plano — a pelada
     de fim de semana, sem compromisso — e vende melhor que "Grátis". A chave continua 'gratis'. */
  { key:'gratis', nome:'Peladeiro', icone:'⚽', mes:0, ano:0, ciclo:'pra sempre',
    resumo:'A pelada de fim de semana: pega um clube, escala o time e joga a temporada inteira — sem pagar nada.',
    itens:['Modo Solo completo: Séries A, B, C e D, com os elencos de verdade',
           'Uma temporada inteira, do apito inicial à última rodada',
           'Mercado, táticas, copas e finanças — tudo liberado',
           'Direto no navegador: sem instalar, sem cartão'],
    falta:['Da 2ª temporada em diante, só no Pro'],
    cta:'Bater a primeira pelada' },

  { key:'pro', nome:'Pro', icone:'👑', mes:1990, ano:17880,
    destaque:true, selo:'Mais popular',
    resumo:'Pra quem quer subir de divisão, construir uma dinastia e nunca perder um save.',
    /* a ordem importa: o popup de dois planos mostra só os 4 primeiros (rfUpItensHTML) */
    itens:['Tudo o que está no Peladeiro',
           'Temporadas ilimitadas: jogue quantos anos quiser',
           'Acesso exclusivo ao Modo Resenha quando lançarmos a versão Beta',
           'Carreiras ilimitadas no Modo Solo',
           'Sua carreira salva na nuvem, de qualquer aparelho',
           'Velocidade Ultrassônico e Selo Pro no seu perfil'],
    cta:'Assinar o Pro',
    /* ===== A VENDA DO POPUP (ver rf26-planos.js) =====
       Quatro benefícios de UMA linha de título + uma de texto: o popup tem altura travada. */
    venda:{ titulo:'A carreira não para na 1ª temporada',
      frase:'Suba de divisão, defenda o título e monte uma dinastia — temporada após temporada, com o save guardado na nuvem. E acesso exclusivo ao Modo Resenha no lançamento do Beta.',
      beneficios:[
        {icone:'♾️', titulo:'Temporadas e carreiras ilimitadas', texto:'Jogue quantos anos quiser, com quantos clubes quiser.'},
        {icone:'☁️', titulo:'Save na nuvem', texto:'Continue de onde parou, no PC ou no celular.'},
        {icone:'🍺', titulo:'Acesso exclusivo ao Modo Resenha', texto:'Quando lançarmos a versão Beta, só quem é Pro joga com os amigos.'},
        {icone:'⚡', titulo:'Ultrassônico e Selo Pro', texto:'A partida em dez segundos e o selo no seu perfil.'} ] } },
];

/* ===== O PRECO EM CENTAVOS, E O RESTO CALCULADO =====
   Os valores eram frases ('R$ 19,90', 'ou R$ 199 por ano — dá R$ 16,58/mês').
   Com o seletor mensal/anual isso deixou de servir: a economia tem de ser
   CONTADA, senão nasce uma quarta e uma quinta frase para alguém esquecer de
   atualizar no dia do reajuste. Agora só existem dois números por plano, e
   mensalidade equivalente, desconto e economia saem deles.

   Os centavos são os MESMOS do Stripe (metadata plano+ciclo) — 1990, 19900,
   4990, 39900. Se um dia divergirem, o site mente sobre o que a cobrança faz. */
/* ===== A FASE BETA E O DESCONTO =====
   Um objeto só manda no desconto inteiro: o número grande dos cartões, o preço
   cheio riscado, a etiqueta da secção, o texto dos botões e a janela das travas
   saem todos daqui. Desligar o beta é `on:false` — e nada mais.

   `pct` e `meses` TÊM de bater com o cupom do Stripe (ver criar-checkout: o
   cupom é procurado por metadata `beta`). Se divergirem, a página promete um
   desconto que a cobrança não faz — e é a mesma regra que já vale para os
   centavos dos preços, logo abaixo. */
/* DESLIGADO em 25/09 com o Grátis × Pro: o Pro nasceu sem desconto de Beta, e o cupom do Stripe
   é arquivado no dia do lançamento. */
const RF_BETA = { on:false, pct:50, meses:3 };
function rfBetaVale(p){ return !!(RF_BETA.on && p && p.mes); }   // o grátis não entra
function rfBetaCent(cent){ return Math.round(cent * (100-RF_BETA.pct) / 100); }
function rfBRL(cent, comCentavos){
  const v = cent/100;
  return 'R$ ' + v.toLocaleString('pt-BR', {
    minimumFractionDigits: (comCentavos===false && v%1===0) ? 0 : 2,
    maximumFractionDigits: 2 });
}
function rfPlanoEconomia(p){
  if(!p.mes || !p.ano) return null;
  const cheio = p.mes*12, poupa = cheio - p.ano;
  if(poupa <= 0) return null;
  return { poupa, pct: Math.round(poupa*100/cheio), porMes: Math.round(p.ano/12) };
}
/* o maior desconto entre os planos pagos — é o número que a etiqueta do
   seletor mostra, e ele também deixa de ser digitado à mão */
function rfEconomiaMaxima(){
  return RF_PLANOS.reduce((m,p)=>{ const e=rfPlanoEconomia(p); return e&&e.pct>m ? e.pct : m; }, 0);
}
let RF_LP_CICLO = 'mes';
/* O que cada cartão mostra no ciclo escolhido: número grande, legenda e a linha
   de baixo. Uma função só, usada no desenho inicial E na troca — desenhar de um
   jeito e atualizar de outro é como as duas versões passam a discordar. */
function rfPlanoPrecoPartes(p, ciclo){
  /* A LINHA DE BAIXO DO GRATIS mudou com os 7 dias. "sem cartão, sem pegadinha"
     era verdade quando o Peladeiro não tinha prazo nenhum; com o Resenha
     limitado, essa frase passa a esconder justamente a pegadinha que ela nega.
     O Solo é que é para sempre, e é isso que ela diz agora. */
  if(!p.mes) return { v:'R$ 0', c:p.ciclo||'pra sempre', cheio:null,
                      nota:'A temporada inteira de graça · sem cartão' };
  const e = rfPlanoEconomia(p);
  /* NO BETA, O NÚMERO GRANDE É O QUE SE PAGA. O preço cheio não desaparece — vai
     ao lado, riscado, porque é ele que dá tamanho ao desconto. Mostrar só o
     valor com desconto esconde a oferta; mostrar só o cheio mente sobre a
     cobrança. Os dois, e a nota diz por quanto tempo. */
  const beta = rfBetaVale(p);
  if(ciclo === 'ano' && e){
    const anoCheio=p.ano, anoPaga=beta?rfBetaCent(anoCheio):anoCheio;
    const porMes=Math.round(anoPaga/12);
    return { v:rfBRL(porMes), c:'por mês',
             cheio: beta ? rfBRL(e.porMes) : null,
             nota: beta
               ? `${rfBRL(anoPaga,false)} no primeiro ano em vez de ${rfBRL(anoCheio,false)} · preço de Beta`
               : `${rfBRL(anoCheio,false)} cobrados uma vez por ano · você economiza ${rfBRL(e.poupa)}` };
  }
  const mesPaga = beta ? rfBetaCent(p.mes) : p.mes;
  return { v:rfBRL(mesPaga), c:'por mês',
           cheio: beta ? rfBRL(p.mes) : null,
           nota: beta
             ? `${RF_BETA.pct}% de desconto nos ${RF_BETA.meses} primeiros meses · depois ${rfBRL(p.mes)}/mês`
             : (e ? `no anual sai ${rfBRL(e.porMes)}/mês — ${e.pct}% mais barato` : 'sem fidelidade') };
}
/* ===== O BOTÃO DE ASSINAR =====
   Tem DOIS destinos, e o certo é escolhido na hora:

   · com sessão aberta e Stripe ligado -> abre o checkout de verdade;
   · sem uma coisa ou outra -> lista de espera, com o plano carimbado na origem.

   A LISTA CONTINUA A SER O CHÃO, e não é provisório por preguiça: o Peladeiro
   não tem o que comprar, quem não entrou ainda não tem conta para assinar, e
   enquanto as chaves do Stripe não estiverem postas no projeto a função
   responde `sem_chave`. Em qualquer um desses casos o botão tem de levar a
   ALGUM lugar — botão que não faz nada é pior do que botão que pede o e-mail.

   O ciclo entra como parâmetro (mês/ano) para o dia em que a landing ganhar o
   seletor anual: a canalização já leva, só falta quem o mostre. */
/* ===== CARTAO OU PIX: A ESCOLHA VEM ANTES DO STRIPE =====
   Uma pagina de pagamento do Stripe nao mistura as duas coisas: o cartao e' ASSINATURA (renova
   sozinho), o Pix e' pagamento AVULSO do periodo (o Stripe nao faz Pix recorrente para conta
   brasileira). Por isso a pergunta e' feita aqui, e cada botao diz com todas as letras o que
   acontece no mes seguinte. O clique no botao e' o gesto do utilizador que o `window.open` do
   jogo precisa — por isso ele chama rfPlanoCta de novo, ja' com a forma. */
function rfPlanoEscolherForma(key, trava, ciclo){
  const p=RF_PLANOS.find(x=>x.key===key)||{};
  const ano = ciclo==='ano';
  const cent = ano ? p.ano : p.mes;
  const pago = (cent && rfBetaVale(p)) ? rfBetaCent(cent) : cent;
  const valor = cent ? rfBRL(pago) : '';
  const periodo = ano ? '1 ano' : '1 mês';
  const arg = (v)=>`'${escC(String(v||''))}'`;
  const chamar = (forma)=>`rfPgFechar();rfPlanoCta(${arg(key)},${trava?arg(trava):'null'},${arg(ciclo||'mes')},'${forma}')`;
  const html = `
    <div class="rf-pg-topo plano-${escC(key)}">
      <span class="rf-pg-halo" aria-hidden="true"></span>
      <div class="rf-pg-topo-in">
        <span class="rf-pg-kicker">PLANO ${escC((p.nome||key).toUpperCase())} · ${ano?'ANUAL':'MENSAL'}</span>
        <h2 class="rf-pg-tit">Como você quer pagar?</h2>
      </div>
    </div>
    <div class="rf-pg-corpo">
      <button type="button" class="rf-pg-forma" onclick="${chamar('cartao')}">
        <span class="rf-pg-tile">💳</span>
        <span class="rf-pg-resumo-id"><b>Cartão de crédito</b>
          <span class="rf-pg-forma-d">Renova sozinho ${ano?'todo ano':'todo mês'}. Cancele quando quiser.</span></span>
        ${valor?`<span class="rf-pg-valor"><b>${escC(valor)}</b></span>`:''}
      </button>
      <button type="button" class="rf-pg-forma" onclick="${chamar('pix')}">
        <span class="rf-pg-tile">⚡</span>
        <span class="rf-pg-resumo-id"><b>Pix</b>
          <span class="rf-pg-forma-d">Paga ${periodo} de uma vez, sem renovação automática. Quando vencer, é só pagar outro Pix.</span></span>
        ${valor?`<span class="rf-pg-valor"><b>${escC(valor)}</b></span>`:''}
      </button>
    </div>`;
  rfPgDesenhar(html);
  const m=document.querySelector('.rf-pg-modal'); if(m) m.classList.add('rf-pg-escolha');
}

function rfPlanoCta(key, trava, ciclo, forma){
  const nome=(RF_PLANOS.find(p=>p.key===key)||{}).nome||key;
  /* De onde veio o lead. Da landing e' o botao do cartao do plano; de dentro do
     jogo e' um cadeado, e ai o nome da trava vai junto — e' assim que se sabe
     qual delas de facto empurra alguem para a lista. */
  const origem = trava ? ('jogo · '+trava+' · plano '+nome) : ('landing · plano '+nome);
  /* O CHÃO DEIXOU DE SER A LISTA. Enquanto não havia como pagar, todo botão acabava a pedir
     o e-mail — era o único destino honesto. Com o Stripe no ar o chão passa a ser a CONTA:
     quem não tem sessão entra primeiro (é preciso uma conta para haver assinatura), e volta
     à mesma decisão com o plano guardado. Guardar a intenção importa: sem isso a pessoa
     escolhe o plano, cria a conta e cai na tela do jogo sem nunca ter chegado ao pagamento. */
  const paraLista = () => {
    if(RF_SO_LISTA && typeof clWaitlistOpen==='function') return clWaitlistOpen(origem);
    if(RF_SO_LISTA) return rfLpIr('lista');
    rfLpIr('planos');
  };

  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};

  /* ===== O PELADEIRO NAO PASSA PELO STRIPE =====
     Ele e o plano de entrada e nao tem o que cobrar: escolher o Peladeiro leva DIRETO ao
     cadastro. `'signup'` e nao `'solo'`: o valor vai parar em `CL.auth.mode` e e' ele que
     decide a aba (ver rfOb1) — 'solo' calhava de abrir o cadastro por nao ser 'login', o que
     e' o resultado certo pela razao errada. Quem ja tem sessao cai na mesma tela, que com
     sessao mostra a conta e o caminho para dentro do jogo (rfOb1Logado). */
  if(key==='gratis'){
    if(typeof clGoModo==='function') return clGoModo('signup');
    return paraLista();
  }

  if(!st.loggedIn){
    /* a intenção sobrevive ao login: rfPlanoIntencaoRetomar() a consome quando a sessão abre */
    try{ sessionStorage.setItem('rf98:planoIntencao', JSON.stringify({key, ciclo:ciclo||'mes'})); }catch(e){}
    if(typeof toastC==='function') toastC('Crie a sua conta (ou entre) para assinar o '+nome+'.');
    if(typeof clGoModo==='function') return clGoModo('signup');
    return paraLista();
  }

  if(!(typeof NET!=='undefined' && NET.criarCheckout)){
    if(typeof toastC==='function') toastC('O pagamento não carregou nesta aba. Recarregue a página e tente de novo.','warn');
    return;
  }

  if(forma!=='cartao' && forma!=='pix' && typeof rfPgDesenhar==='function')
    return rfPlanoEscolherForma(key, trava, ciclo||'mes');

  if(typeof toastC==='function') toastC('Abrindo o pagamento…');
  /* ===== DE DENTRO DO JOGO, O STRIPE ABRE NOUTRA JANELA =====
     Da landing, trocar a pagina e' natural — a pessoa veio ler sobre planos e vai pagar. De
     DENTRO do jogo (a aba do Treinador, uma trava de plano) nao e': o checkout comia a partida
     e o unico caminho de volta era o botao do navegador.

     A JANELA ABRE-SE AGORA, NAO DEPOIS. `window.open` fora do gesto do utilizador — e o
     endereco do checkout so' chega umas centenas de ms mais tarde — e' exactamente o que os
     bloqueadores de pop-up matam. Entao abre-se uma aba VAZIA no clique e so' se lhe da' o
     endereco quando ele chega. Se mesmo assim vier bloqueada (`null`), cai no caminho de
     sempre: melhor trocar de pagina do que nao pagar. */
  const noJogo = (typeof CL!=='undefined') && !!CL.clubId && CL.screen!=='landing';
  const aba = noJogo ? window.open('', '_blank') : null;
  NET.criarCheckout(key, ciclo||'mes', forma).then(r=>{
    if(r && r.url){
      if(aba && !aba.closed){ aba.location.href = r.url; aba.focus(); }
      else location.href = r.url;
      return;
    }
    if(aba && !aba.closed) aba.close();   // sem endereco, nao se deixa uma aba branca aberta
    /* AGORA O ERRO DIZ-SE. Antes qualquer falha caia na lista de espera, calada: quem tinha
       conta e queria pagar era mandado pedir uma vaga que já tinha. Se o pagamento não abre,
       isso é uma avaria e a pessoa tem de o saber para voltar a tentar. */
    console.warn('checkout indisponível:', r && r.erro);
    if(r && r.erro==='pix_indisponivel'){
      if(typeof toastC==='function')
        toastC('O Pix ainda não está disponível. Por enquanto, assine com o cartão.','warn');
      return;
    }
    if(r && r.erro==='ja_assina_cartao'){
      if(typeof toastC==='function')
        toastC('Você já tem uma assinatura ativa no cartão. O Pix fica para depois que ela acabar.','warn');
      return;
    }
    if(typeof toastC==='function')
      toastC('Não consegui abrir o pagamento agora. Tente de novo em instantes.','warn');
  }).catch(e=>{
    console.warn('checkout:', e);
    if(aba && !aba.closed) aba.close();
    if(typeof toastC==='function') toastC('Não consegui abrir o pagamento agora. Tente de novo em instantes.','warn');
  });
}
/* A INTENÇÃO GUARDADA ANTES DO LOGIN. Chamado quando a sessão abre (ver netAuthStatus):
   quem clicou em "Assinar o Resenha" sem conta volta ao checkout desse plano, em vez de ficar
   na tela do jogo a perguntar-se o que aconteceu ao botão que carregou. */
function rfPlanoIntencaoRetomar(){
  let alvo=null;
  try{ const raw=sessionStorage.getItem('rf98:planoIntencao');
       if(raw){ alvo=JSON.parse(raw); sessionStorage.removeItem('rf98:planoIntencao'); } }catch(e){}
  if(!alvo || !alvo.key) return false;
  setTimeout(()=>{ try{ rfPlanoCta(alvo.key, null, alvo.ciclo||'mes'); }catch(e){} }, 400);
  return true;
}
function rfLpPlanosHTML(){
  const cartoes=RF_PLANOS.map(p=>{
    const itens=(p.itens||[]).map(i=>`<li><span class="rf-lp-tick">✓</span>${escC(i)}</li>`).join('');
    /* o que NAO vem no plano leva um X, nao um travessao: o travessao lia-se como "nao se
       aplica", e a lista de precos precisa dizer "isto voce nao tem" (ver .rf-lp-tick.nao) */
    const falta=(p.falta||[]).map(i=>`<li class="nao"><span class="rf-lp-tick nao">✕</span>${escC(i)}</li>`).join('');
    const q=rfPlanoPrecoPartes(p, RF_LP_CICLO);
    return `<div class="rf-lp-plano ${p.destaque?'ouro':''}" data-plano="${p.key}">
      ${p.selo?`<span class="rf-lp-plano-selo">👑 ${escC(p.selo)}</span>`:''}
      <span class="rf-lp-plano-n">${escC(p.nome)}</span>
      <span class="rf-lp-plano-r">${escC(p.resumo)}</span>
      <div class="rf-lp-plano-preco">
        <span class="rf-lp-plano-cheio"${q.cheio?'':' hidden'}>${escC(q.cheio||'')}</span>
        <span class="rf-lp-plano-v">${escC(q.v)}</span>
        <span class="rf-lp-plano-c">${escC(q.c)}</span>
      </div>
      <span class="rf-lp-plano-a">${escC(q.nota)}</span>
      <ul class="rf-lp-plano-l">${itens}${falta}</ul>
      ${p.nota?`<span class="rf-lp-plano-nota">${escC(p.nota)}</span>`:''}
      <button type="button" class="rf-lp-plano-bt" onclick="rfPlanoCta('${p.key}',null,RF_LP_CICLO)">${escC(p.cta)}${
        rfBetaVale(p)?`<i class="rf-lp-plano-bt-off">−${RF_BETA.pct}% no Beta</i>`:''}</button>
    </div>`;
  }).join('');
  const pct=rfEconomiaMaxima();
  /* ===== O SELETOR MENSAL / ANUAL =====
     Dois botões de verdade num `role="radiogroup"`, não um checkbox estilizado:
     quem chega pelo teclado troca com as setas e ouve "Anual, economize 33%",
     que é a informação que faz a escolha — escondê-la num enfeite visual seria
     esconder o desconto de quem mais precisa dele.

     A pastilha que desliza é UM elemento, movido por transform. Animar
     `left`/`width` obriga o browser a refazer o layout a cada quadro e engasga
     no telemóvel; transform anda na composição e sai liso. */
  return `<section class="rf-lp-planos rf-lp-f-branco" id="rf-lp-planos">
    <div class="rf-lp-planos-in">
      <span class="rf-lp-eyebrow">Planos</span>
      <h2 class="rf-lp-h2">Escolha o seu banco de reservas.</h2>
      ${RF_BETA.on?`<div class="rf-lp-beta"><b>Fase Beta</b><span>${RF_BETA.pct}% de desconto em todos os planos pagos, nos ${RF_BETA.meses} primeiros meses</span></div>`:''}
      <p class="rf-lp-p">Todo treinador começa no <b>Peladeiro</b>: a 1ª temporada inteira de graça — tática, mercado, copas e finanças. Pegou gosto? O <b>Pro</b> continua a sua carreira por quantas temporadas você quiser.</p>
      <div class="rf-lp-ciclo" role="radiogroup" aria-label="Como você quer pagar"
           data-ciclo="${RF_LP_CICLO}">
        <span class="rf-lp-ciclo-pilula" aria-hidden="true"></span>
        <button type="button" class="rf-lp-ciclo-b" role="radio" data-c="mes"
          aria-checked="${RF_LP_CICLO==='mes'}" onclick="rfCicloTrocar('mes')">Mensal</button>
        <button type="button" class="rf-lp-ciclo-b" role="radio" data-c="ano"
          aria-checked="${RF_LP_CICLO==='ano'}" onclick="rfCicloTrocar('ano')">Anual
          <span class="rf-lp-ciclo-selo">economize ${pct}%</span></button>
      </div>
      <div class="rf-lp-plano-grade">${cartoes}</div>
      <span class="rf-lp-nota">Cancele quando quiser, direto em Minha Conta. Cobrança pelo Stripe, no cartão ou no Pix.</span>
    </div>
  </section>`;
}

/* TROCA SEM REDESENHAR A PÁGINA. Um cdraw() aqui refaria a landing inteira: a
   secção saltaria sob o dedo de quem tocou e o vídeo dos Momentos recomeçaria.
   Aqui só três nós por cartão mudam de texto, e a pastilha desliza sozinha pelo
   atributo data-ciclo. */
function rfCicloTrocar(c){
  if(c!==RF_LP_CICLO) RF_LP_CICLO=c;
  const cx=document.querySelector('.rf-lp-ciclo');
  if(cx){
    cx.setAttribute('data-ciclo', c);
    cx.querySelectorAll('.rf-lp-ciclo-b').forEach(b=>
      b.setAttribute('aria-checked', String(b.dataset.c===c)));
  }
  document.querySelectorAll('.rf-lp-plano[data-plano]').forEach(cartao=>{
    const p=RF_PLANOS.find(x=>x.key===cartao.dataset.plano); if(!p) return;
    const q=rfPlanoPrecoPartes(p, c);
    const v=cartao.querySelector('.rf-lp-plano-v');
    const l=cartao.querySelector('.rf-lp-plano-c');
    const n=cartao.querySelector('.rf-lp-plano-a');
    const ch=cartao.querySelector('.rf-lp-plano-cheio');
    if(v){ v.textContent=q.v; v.classList.remove('troca'); void v.offsetWidth; v.classList.add('troca'); }
    if(l) l.textContent=q.c;
    if(n) n.textContent=q.nota;
    /* o preço cheio riscado troca junto — deixá-lo para trás mostraria o valor
       mensal riscado ao lado do anual, que é a comparação errada */
    if(ch){ ch.textContent=q.cheio||''; ch.hidden=!q.cheio; }
  });
  /* o botão de ouro lá embaixo repete o preço do Pro */
  const ouro=document.querySelector('.rf-lp-bt-ouro');
  if(ouro) ouro.innerHTML='👑 Assinar o Pro — '+escC(rfPlanoPreco('pro'));
}



/* =====================================================================
   MODO RESENHA — a seção grande
   ---------------------------------------------------------------------
   O Resenha era duas frases ao lado de um chat desenhado à mão. É o motivo
   pelo qual alguém paga o plano de cima, então ganhou seção própria: a
   cerimônia do sorteio com a turma inteira (a foto que mais explica o modo
   em um segundo), a sala sendo montada e o chat de verdade.

   OITO, NÃO VINTE. A sala do jogo comporta 20 assentos, mas o plano
   Embaixador dá salas de 3 a 8 — e a página tem de prometer o que o plano
   entrega. A foto do sorteio é tirada com 8 treinadores pelo mesmo motivo
   (ver RF_TURMA em scripts/capture-home.mjs).
   ===================================================================== */
/* ===== AS FOTOS DA RESENHA, LADO A LADO NO TEMPO =====
   Eram tres: o sorteio a toda a largura, e por baixo a sala e o CHAT. O chat saiu — a tela
   existe no jogo, mas a foto prometia um chat que a versao publica ainda nao mostra assim, e
   pagina de vendas nao mostra o que nao ha'.
   As duas que ficam contam a mesma historia em dois momentos (a sala a encher, o sorteio a
   correr), e por isso passam a alternar no mesmo lugar em vez de competirem por espaco. */
const RF_LP_RESENHA_FOTOS=[
  ['img/home/sorteio-resenha.webp','Cerimônia do sorteio com oito treinadores e seus clubes',
   'O sorteio roda para todo mundo ao mesmo tempo — ninguém escolhe clube.'],
  ['img/home/sala-resenha.webp','Sala do Modo Resenha com oito treinadores dentro',
   'A sala enchendo: link, convite por WhatsApp e quem já está dentro.'],
];
/* ===== UM CARROSSEL, DOIS SITIOS =====
   A seccao da Resenha ja' tinha um; a do jogador oficial precisava do mesmo. Duas copias da
   mesma peca divergem na primeira correccao — entao ela e' uma so', identificada por `id`, e
   cada seccao passa as suas fotos.
   Troca SEM redesenhar a pagina, como as abas de "Por dentro do jogo": um cdraw() aqui
   reconstruiria a landing inteira e levaria a rolagem junto. */
function rfLpCarrossel(id, passo){
  const figs=[...document.querySelectorAll(`[data-carfoto="${id}"]`)];
  if(!figs.length) return;
  const i=Math.max(0, figs.findIndex(f=>f.classList.contains('on')));
  const n=((i+passo)%figs.length+figs.length)%figs.length;
  figs.forEach((f,k)=>f.classList.toggle('on', k===n));
  document.querySelectorAll(`[data-cardot="${id}"]`).forEach((d,k)=>d.classList.toggle('on', k===n));
}
function rfLpCarrosselHTML(id, fotos){
  const figs=fotos.map(([src,alt,leg],i)=>
    `<figure class="rf-lp-carfoto ${i===0?'on':''}" data-carfoto="${escC(id)}">
      <img src="${escC(src)}" alt="${escC(alt)}" loading="lazy" width="1600" height="1000">
      ${leg?`<figcaption>${escC(leg)}</figcaption>`:''}
    </figure>`).join('');
  const bolas=fotos.map((_x,i)=>
    `<i class="rf-lp-cardot ${i===0?'on':''}" data-cardot="${escC(id)}"></i>`).join('');
  const setas=fotos.length>1
    ? `<button type="button" class="rf-lp-carseta esq" onclick="rfLpCarrossel('${escC(id)}',-1)"
         aria-label="Foto anterior">‹</button>
       <button type="button" class="rf-lp-carseta dir" onclick="rfLpCarrossel('${escC(id)}',1)"
         aria-label="Próxima foto">›</button>
       <span class="rf-lp-cardots">${bolas}</span>` : '';
  return `<div class="rf-lp-carrossel">${figs}${setas}</div>`;
}
function rfLpResenhaHTML(){
  const passo=(n,t,d)=>`<div class="rf-lp-passo">
    <span class="rf-lp-passo-n">${n}</span>
    <span class="rf-lp-passo-t">${escC(t)}</span>
    <span class="rf-lp-passo-d">${escC(d)}</span></div>`;
  return `<section class="rf-lp-resenha rf-lp-f-creme" id="rf-lp-resenha">
    <div class="rf-lp-resenha-in">
      <span class="rf-lp-eyebrow">Modo Resenha</span>
      <h2 class="rf-lp-h2">A liga é sua. A zoeira é do grupo.</h2>
      <p class="rf-lp-p">Você abre a sala, manda o link no grupo e cada um pega um clube no sorteio — ninguém escolhe, ninguém reclama. Daí em diante todo mundo joga a mesma semana, na mesma tabela, com o mesmo mercado.</p>

      ${/* ===== DUAS COLUNAS: A FOTO MANDA, OS PASSOS ACOMPANHAM =====
           Era tudo empilhado ao centro — foto larga, quatro passos em fila, mais duas fotos —
           e a seccao lia-se como tres blocos sem relacao. A esquerda fica a imagem, grande, a
           alternar; a' direita os quatro passos um debaixo do outro, que e' como se le' uma
           sequencia. */''}
      <div class="rf-lp-resenha-cols">
        ${rfLpCarrosselHTML('resenha', RF_LP_RESENHA_FOTOS)}
        <div class="rf-lp-passos coluna">
          ${passo(1,'Abre a sala','Dá um nome e pronto. Salas de 3 a 8 treinadores.')}
          ${passo(2,'Manda o link','No grupo do WhatsApp, por e-mail ou pelo nome de quem já tem conta.')}
          ${passo(3,'Sorteia os clubes','A cerimônia roda pra todo mundo ao mesmo tempo. Choro é grátis.')}
          ${passo(4,'Joga a semana','Rodada ao vivo, tabela única e o chat da sala rolando junto.')}
        </div>
      </div>

      <span class="rf-lp-nota">Quando lançarmos a versão Beta, o Modo Resenha é <b>exclusivo do Pro</b>: entre na sala dos amigos ou abra a sua.</span>
    </div>
  </section>`;
}

/* =====================================================================
   SEJA UM JOGADOR OFICIAL — o benefício que só o Embaixador tem
   ---------------------------------------------------------------------
   O "antes" é uma MOLDURA VAZIA de propósito, e não um retrato genérico
   tirado de banco de imagens: a graça é a pessoa se ver ali. Quando houver
   a foto de exemplo (autorizada por quem aparece nela), é trocar
   RF_LP_ALBUM_ANTES pelo caminho dela e a moldura vira retrato. Enquanto
   não houver, a moldura assume ser moldura em vez de fingir.
   ===================================================================== */
const RF_LP_ALBUM_ANTES = null;   // ex.: 'img/home/album-crianca.webp'

/* ===== A FICHA DA JOGADORA, MONTADA COM DADOS REAIS =====
   Mesma moldura do card de modalidade (rf-mod-frame, ui/rf26-modalidade.js) — a diferenca e' o
   que entra nela: la' o card ILUSTRA a modalidade e por isso leva a marca no canto; aqui a ficha
   e' de uma jogadora concreta do jogo, e por isso leva o ESCUDO e as cores do clube dela.
   Tudo o que esta' aqui sai da base: Aline Lima e' o nome dela no universo feminino (o masculino
   no mesmo lugar e' o Kevin Viveros), o clube e' o Furacao do Sul da divisao A, e a foto e' a
   mesma que a ficha dela mostra dentro do jogo. Nada inventado para a pagina de vendas. */
const RF_LP_JOGADORA = {
  /* idade e forca saem da ficha dela no catalogo (jm001780, Serie D): o cartao do lado mostra
     "11 DE FORCA" para o jogador, e o dela nao mostrava nada — dois cartoes a dizer coisas
     diferentes sobre o mesmo tipo de jogador. */
  nome:'Aline Lima', pos:'Atacante', age:29, forca:11,
  clube:'Furacão do Sul',
  cor:'#D62828', cor2:'#14171a',
  foto:'https://alxwgqvjmetjbbqtjkhx.supabase.co/storage/v1/object/public/jogadores/brasil/divisao-a/furacaodosul/jogadores/alinelima-cartao-1788453766060-19dc73.webp',
  crest:'https://alxwgqvjmetjbbqtjkhx.supabase.co/storage/v1/object/public/escudos/brasil/divisao-a/athleticopr/escudo-semfundo-1787709223709.webp',
};
function rfLpFichaJogadoraHTML(){
  const j=RF_LP_JOGADORA;
  const linha=[j.pos, j.age?j.age+' anos':''].filter(Boolean).join(' · ');
  return `<span class="rf-mod-frame" style="--lst-a:${escC(j.cor)};--lst-b:${escC(j.cor2)}">
    <span class="rf-mod-listras"></span>
    <img class="rf-mod-foto" src="${escC(j.foto)}" alt="Ficha de ${escC(j.nome)}, do ${escC(j.clube)}" loading="lazy">
    <span class="rf-mod-veu"></span>
    ${/* O ESCUDO E' IRMAO DA FICHA, NAO FILHO. No cartao do jogador ao lado
         (img/home/retrato-jogador.webp) ele mora pequeno no ALTO A' DIREITA, e o
         canto de baixo e' so' do texto — posicao, nome e forca. Para ir para la'
         ele tem de ser posicionado contra a MOLDURA, e dentro da ficha
         (`position:relative`) ele ancorava na ficha. */''}
    <img class="rf-mod-crest" src="${escC(j.crest)}" alt="${escC(j.clube)}" loading="lazy">
    <span class="rf-mod-ficha">
      <span class="rf-mod-pos">${escC(linha)}</span>
      <span class="rf-mod-nome">${escC(j.nome)}</span>
      ${j.forca?`<span class="rf-mod-forca"><b>${escC(String(j.forca))}</b> de força</span>`:''}
    </span>
  </span>`;
}
/* as telas onde o jogador do Embaixador aparece depois de aprovado — e' o que prova a promessa
   da seccao: ele nao e' um cartaz, e' uma linha do elenco e uma ficha como as outras */
const RF_LP_OFICIAL_FOTOS=[
  ['img/home/ficha-jogador.webp','Ficha do jogador dentro do RetroFoot',
   'A ficha dele, igual à de qualquer outro: características, ponto forte e valor de mercado.'],
  ['img/home/elenco.webp','Elenco do clube dentro do RetroFoot',
   'E no elenco, entre os outros — escalado, com energia, moral e salário.'],
];
function rfLpJogadorOficialHTML(){
  const antes = RF_LP_ALBUM_ANTES
    ? `<img src="${escC(RF_LP_ALBUM_ANTES)}" alt="Foto de infância" loading="lazy">`
    : `<span class="rf-lp-album-vazio">
         <span class="rf-lp-album-ic" aria-hidden="true">📷</span>
         <span class="rf-lp-album-t">a sua foto</span>
         <span class="rf-lp-album-s">aquela de criança, com a camisa do time</span>
       </span>`;
  return `<section class="rf-lp-oficial rf-lp-f-branco" id="rf-lp-oficial">
    <div class="rf-lp-oficial-in">
      <span class="rf-lp-selo-emb">👑 Só no Embaixador</span>
      <h2 class="rf-lp-h2">Você não virou jogador — nem jogadora. Mas ainda dá tempo.</h2>
      <p class="rf-lp-p">O Embaixador entra na base de dados oficial do RetroFoot como <b>jogador</b> ou <b>jogadora</b> — nome seu, rosto seu, ficha sua, no universo que você escolher. Ele nasce nos elencos, é escalado, leva cartão, faz gol e aparece na artilharia dos outros treinadores. Enquanto você jogar, ele joga.</p>

      ${/* ===== DUAS COLUNAS, COMO A SECCAO DA RESENHA =====
           Era tudo empilhado ao centro: as tres polaroides, a lista de quatro itens e, por
           baixo, uma captura de tela larga. Tres blocos sem relacao, e a captura — que e' a
           PROVA da promessa — ficava tao longe do texto que ninguem ligava uma coisa a' outra.
           A' esquerda as telas do jogo, a alternar; a' direita as polaroides e o que elas
           significam. E' o mesmo esqueleto do Modo Resenha, e a pagina passa a ter um so'
           jeito de mostrar "veja com os seus olhos". */''}
      <div class="rf-lp-oficial-cols">
        ${rfLpCarrosselHTML('oficial', RF_LP_OFICIAL_FOTOS)}

        <div class="rf-lp-oficial-dir">
          <div class="rf-lp-album">
            <figure class="rf-lp-album-q antes">
              <div class="rf-lp-album-media">${antes}</div>
              <figcaption>Você, quando ainda ia ser jogador</figcaption>
            </figure>
            <span class="rf-lp-album-seta" aria-hidden="true">→</span>
            <figure class="rf-lp-album-q depois">
              <div class="rf-lp-album-media">
                <img src="img/home/retrato-jogador.webp" alt="Retrato de um jogador na ficha do RetroFoot"
                  loading="lazy" width="400" height="828">
              </div>
              <figcaption>Você, na ficha — como <b>jogador</b></figcaption>
            </figure>
            <figure class="rf-lp-album-q depois jogadora">
              <div class="rf-lp-album-media">${rfLpFichaJogadoraHTML()}</div>
              <figcaption>E você, na ficha — como <b>jogadora</b></figcaption>
            </figure>
          </div>

          <ul class="rf-lp-oficial-l">
            <li><span class="rf-lp-tick">✓</span>Seu nome e o seu rosto na base oficial, para todos os treinadores — no universo masculino ou no feminino</li>
            <li><span class="rf-lp-tick">✓</span>Ficha completa: características, ponto forte, ponto fraco e valor de mercado</li>
            <li><span class="rf-lp-tick">✓</span>Pode ser comprado, vendido e disputado no leilão como qualquer outro</li>
            <li><span class="rf-lp-tick">✓</span>Fica no jogo enquanto você for Embaixador</li>
          </ul>
        </div>
      </div>
    </div>
  </section>`;
}

function rfLpGranaHTML(){
  const quem=(ic,t,d)=>`<div class="rf-lp-quem">
    <span class="rf-lp-quem-ic" aria-hidden="true">${ic}</span>
    <span class="rf-lp-quem-t">${escC(t)}</span>
    <span class="rf-lp-quem-d">${escC(d)}</span></div>`;
  /* ===== UM FORMATO SO', E O CONTEUDO CABE NELE =====
     A seccao tinha TRES formatos a disputar o mesmo assunto: uma caixa branca com o aviso, uma
     grelha de tres cartoes e uma lista numerada de tres passos — e os tres diziam a mesma coisa
     por outras palavras. "Passa o codigo pra sua galera" (passo 2) e' o cartao do Influencer;
     "abre a sala e acompanha quem entrou" (passo 3) e' a frase de abertura. O e-mail aparecia
     duas vezes, no botao e no rodape.

     Fica o CARTAO, que e' o formato que o resto da pagina ja' usa (ver a seccao da coroa), e o
     conteudo foi ajustado a ele:
       · o aviso de "ainda nao existe" vira uma etiqueta debaixo do titulo — uma linha, nao uma
         caixa: e' um ESTADO, e estado nao merece a mesma moldura que o conteudo;
       · a mecanica cabe num paragrafo, no futuro, com os 10 links dentro;
       · os tres cartoes ficam — sao a unica parte que diz algo que as outras nao dizem;
       · uma accao so' no fim, e o e-mail vive nela. */
  return `<section class="rf-lp-grana rf-lp-f-creme" id="rf-lp-grana">
    <div class="rf-lp-grana-in">
      <span class="rf-lp-selo-emb">👑 Só no Embaixador</span>
      <h2 class="rf-lp-h2">Monte a sua resenha. E ganhe com ela.</h2>
      <span class="rf-lp-chip-neutro">🚧 Em desenvolvimento — ainda não no Beta</span>
      <p class="rf-lp-p">Cada Embaixador vai receber um código próprio pra passar pra galera dele: quem entrar por ele conta como seu, e isso vira dinheiro no seu bolso — não só audiência. <b>No primeiro lançamento serão apenas 10 links.</b></p>

      <div class="rf-lp-quem-grade">
        ${quem('🎥','Criador de conteúdo','Transmite a semana ao vivo no Modo Camarote e joga a liga com a audiência.')}
        ${quem('📣','Influencer','O código vai na bio. Quem entrar por ele entra na sua liga — e conta pra você.')}
        ${quem('🍻','O cara que junta a galera','Não precisa ter canal. Precisa ter gente querendo jogar com você.')}
      </div>

      ${/* WHATSAPP, e nao e-mail: sao 10 vagas e a conversa e' de ida e volta — quem chega por
           aqui quer resposta hoje, nao um assunto na caixa de entrada. A mensagem vai pronta,
           entao a pessoa so' carrega em enviar. */''}
      <a class="rf-lp-cta2" target="_blank" rel="noopener"
        href="https://wa.me/16478623292?text=${encodeURIComponent('Olá! Vi no site do RetroFoot que serão liberados 10 links de Embaixador no primeiro lançamento. Quero um deles — como faço?')}">Falar com o time</a>
      <span class="rf-lp-nota">As regras de repasse são combinadas com cada Embaixador na entrada.</span>
    </div>
  </section>`;
}

/* =====================================================================
   A SEÇÃO DOS EMBAIXADORES — os cartões
   ---------------------------------------------------------------------
   Antes eram três cartões genéricos (acesso antecipado, ligas fechadas,
   "prêmios em dinheiro, produtos e patrocínio"). O último não estava em
   lado nenhum do plano — página de vendas não pode inventar contrapartida,
   porque alguém cobra depois. Agora cada cartão é UM item do plano
   Embaixador, palavra por palavra do que RF_PLANOS promete.
   ===================================================================== */
/* Desde 25/09 a secção é do PRO — o que ele dá, item por item de RF_PLANOS. (O nome da
   constante e o id #rf-lp-ligas ficam: links antigos continuam a cair aqui.) */
const RF_LP_EMBAIXADOR=[
  ['♾️','Temporadas ilimitadas','Suba de divisão, defenda o título e monte uma dinastia. A carreira não para na 1ª temporada.'],
  ['🗂️','Carreiras ilimitadas','Quantos clubes você quiser no Modo Solo, cada um com a sua história.'],
  ['☁️','Save na nuvem','Continue de onde parou, no PC ou no celular. Sua carreira nunca se perde.'],
  ['🍺','Acesso exclusivo ao Modo Resenha','Quando lançarmos a versão Beta, só quem é Pro entra: a turma inteira na mesma liga, até 10 treinadores.'],
  ['⚡','Velocidade Ultrassônico','A partida inteira em dez segundos, pra atravessar a temporada sem perder o jogo de vista.'],
  ['🏅','Selo Pro','A coroa dourada ao lado do seu nome, no perfil de treinador.'],
];
/* o preço sai de RF_PLANOS — digitado outra vez aqui, um dia os dois discordam */
function rfPlanoPreco(key){
  const p=RF_PLANOS.find(x=>x.key===key); if(!p) return '';
  const q=rfPlanoPrecoPartes(p, RF_LP_CICLO);
  return q.v+'/'+q.c.replace('por ','');
}
function rfLpLigasHTML(){
  const cartoes=RF_LP_EMBAIXADOR.map(([ic,t,d,breve])=>`<div class="rf-lp-embc ${breve?'breve':''}">
    ${breve?`<span class="rf-lp-chip-neutro rf-lp-embc-breve">${escC(breve)}</span>`:''}
    <span class="rf-lp-embc-ic" aria-hidden="true">${ic}</span>
    <span class="rf-lp-embc-t">${escC(t)}</span>
    <span class="rf-lp-embc-d">${escC(d)}</span>
  </div>`).join('');
  return `<section class="rf-lp-ligas rf-lp-f-creme" id="rf-lp-ligas">
    <div class="rf-lp-ligas-in">
      <span class="rf-lp-selo-emb">👑 Plano Pro</span>
      <h2 class="rf-lp-h2">Tudo o que vem junto com a coroa.</h2>
      <p class="rf-lp-p">R$ 19,90 por mês — ou R$ 14,90 por mês no anual. Cancele quando quiser.</p>
      <div class="rf-lp-embc-grade">${cartoes}</div>
      <button type="button" class="rf-lp-bt-ouro" onclick="rfPlanoCta('pro',null,RF_LP_CICLO)">
        👑 Assinar o Pro — ${escC(rfPlanoPreco('pro'))}</button>
    </div>
  </section>`;
}


/* ---- a página ---- */
function rfLandingHTML(){
  return `<div class="rf-lp">
    ${rfLpNavHTML()}

    <header class="rf-lp-hero" id="rf-lp-jogo">
      <div class="rf-lp-hero-txt">
        <span class="rf-lp-pill"><i class="rf-lp-pill-dot" aria-hidden="true"></i>100% online — nada pra instalar</span>
        <h1 class="rf-lp-h1">O clássico da sua infância,<br>agora online e com os amigos.</h1>
        <p class="rf-lp-p">Você é o técnico. Escala o time, negocia jogadores, cuida do caixa e briga por acesso da Série D ao topo — sozinho contra a máquina ou na resenha com a turma toda na mesma liga.</p>
        ${/* ===== UM BOTAO SO' NO HERO =====
             Eram dois lado a lado — "Ver os planos" e "Jogar de graça" — e disputavam a mesma
             atencao no primeiro ecra. Quem chega aqui ainda nao sabe o que e' o jogo; mandar
             escolher entre a tabela de precos e o jogo, antes de ver qualquer coisa, e' pedir
             uma decisao que ninguem tem como tomar. Fica o que nao custa nada: jogar. Os planos
             continuam a um toque no cabecalho e ganham a seccao inteira mais abaixo. */''}
        <div class="rf-lp-ctas">
          <button type="button" class="rf-wiz-cta" onclick="${rfLpComecarOn()}">${rfIcone('jogar',16)} ${RF_LP_CTA_TXT}</button>
        </div>
        <span class="rf-lp-nota">Comece no <b>Peladeiro</b>: a 1ª temporada inteira de graça, com o Modo Solo completo. Sem instalar nada, sem cartão.</span>
      </div>
      <div class="rf-lp-hero-art">
        ${rfLpHeroVideoHTML()}
      </div>
    </header>

    <section class="rf-lp-sec">
      ${rfLpSecaoHTML({eyebrow:'Jogue do seu jeito', titulo:'Da Série D ao topo, no seu ritmo.',
        prosa:'Pega um clube pequeno e sobe até a elite. Mercado de transferências, finanças do clube e o calendário completo de copas — sem depender de ninguém entrar na sala.',
        itens:['Séries A, B, C e D, com elenco completo em cada clube',
               /* OS NOMES SAEM DO PACOTE, nao daqui: `rfNomeComp` le' COMPETICOES, que o pacote
                  oficial renomeia no arranque. Escritos a mao, a pagina e o jogo divergiam no
                  dia seguinte a qualquer renomeacao — foi assim que a home ficou a prometer
                  "Copa do Brasil" enquanto o jogo ja' dizia outra coisa. */
               `${rfNomeComp('copaBrasil','Copa Nacional')}, ${rfNomeComp('libertadores','Liberta Cup')} e ${rfNomeComp('sulamericana','Sula Cup')}`,
               'Masculino e feminino, nas mesmas divisões e nas mesmas copas',
               'Partida ao vivo com narração lance a lance'],
        cta:rfIcone('jogar',16)+' '+RF_LP_CTA_TXT, ctaOn:rfLpComecarOn()})}
      ${rfLpFotoHTML('img/home/classificacao.webp','Classificação da Série D dentro do RetroFoot')}
    </section>

    ${rfLpTelasHTML()}

    ${rfLpResenhaHTML()}

    <section class="rf-lp-sec">
      ${rfLpSecaoHTML({eyebrow:'Mercado global', titulo:'O leilão é onde a liga se decide.',
        prosa:'Cada jogador tem vários clubes disputando. Para levar, cubra a maior oferta antes das semanas acabarem — se o seu lance ficar abaixo, a concorrência cobre na semana seguinte.',
        itens:['Leilão aberto a todos os clubes da liga','Propostas e contrapropostas por jogador','Finanças de verdade: folha, bilheteria, TV e patrocínio'],
        cta:rfIcone('jogar',16)+' '+RF_LP_CTA_TXT, ctaOn:rfLpComecarOn()})}
      ${rfLpFotoHTML('img/home/leilao.webp','Leilão de jogadores dentro do RetroFoot')}
    </section>

    ${rfLpMomentosHTML()}

    ${/* JOGADOR OFICIAL E CÓDIGO DE MONETIZAÇÃO eram do Embaixador e saíram da vitrine em 25/09
         (Grátis × Pro). Quem já os tem mantém; as secções ficam escritas para voltarem quando
         virarem item avulso. */''}

    ${rfLpPlanosHTML()}

    ${rfLpLigasHTML()}

    ${/* A LISTA DE ESPERA SAI DA PAGINA COM A FASE. O bloco continua escrito (RF_SO_LISTA=true
         repoe-o inteiro, contador de vagas incluido), mas com o pagamento no ar ele nao pode
         ficar la': pedir o e-mail a quem ja' pode assinar e' mandar a pessoa esperar por uma
         coisa que ja' aconteceu. */''}
    ${RF_SO_LISTA ? rfLpListaHTML() : ''}

    ${rfLpRodapeHTML()}
    ${typeof rfAcaoHTML==='function'?rfAcaoHTML():''}
  </div>`;
}
/* A BARRA DE VAGAS LÊ O NÚMERO DE VERDADE. O 318/500 da tela de referência é
   texto de maquete; aqui ele vem de retrofoot_waitlist_count (clWaitlistCount),
   e enquanto a contagem não chega a barra fica sem número em vez de mostrar um
   inventado — número errado numa barra de escassez é pior do que número nenhum. */
function rfLpListaHTML(){
  const vagas=(typeof WAITLIST_VAGAS!=='undefined')?WAITLIST_VAGAS:500;
  const n=(typeof CL!=='undefined'&&CL.waitlistCount!=null)?CL.waitlistCount:null;
  const pct=(n!=null&&vagas)?Math.min(100,Math.round(n/vagas*1000)/10):0;
  if(typeof CL!=='undefined' && CL.waitlistCount==null && typeof clWaitlistCount==='function'){
    CL.waitlistCount=-1;                       // pede uma vez só, não a cada desenho
    setTimeout(()=>{ CL.waitlistCount=null; clWaitlistCount(); },0);
  }
  return `<section class="rf-lp-lista rf-lp-f-navy" id="rf-lp-lista">
    <div class="rf-lp-lista-in">
      <span class="rf-lp-eyebrow">Lista de espera</span>
      <h2 class="rf-lp-h2">Só ${vagas} treinadores entram na primeira versão.</h2>
      <p class="rf-lp-p">Entre na lista, responda uma pergunta rápida e indique os amigos que você quer na sua liga. Quem indica sobe na fila.</p>
      <div class="rf-lp-vagas">
        <div class="rf-label"><span class="rf-label-t">Vagas preenchidas</span>
          <span class="rf-label-r">${n!=null&&n>=0?n+' / '+vagas:'—'}</span></div>
        <div class="rf-fb"><i style="width:${pct}%;background:var(--club-secondary)"></i></div>
      </div>
      <button type="button" class="rf-wiz-cta" onclick="clWaitlistOpen('landing · lista de espera')">
        <span>⚽</span> Garantir minha vaga</button>
      <span class="rf-lp-nota">Leva menos de um minuto. A gente avisa por e-mail quando a sua vaga abrir.</span>
    </div>
  </section>`;
}
/* ===== O RODAPE SO' MOSTRA O QUE LEVA A ALGUM SITIO (05/09/2026) =====
   Metade dos itens daqui eram `<span>`: texto com cara de link que nao clicava em lado nenhum.
   "Blog", "Canais oficiais", "Cotas de patrocinio", "Parceria de canal" e "Media kit" nao tinham
   pagina, ancora nem URL — nunca tiveram. E a base dizia "© 2026 RetroFoot · Termos ·
   Privacidade" como TEXTO CORRIDO, o que e' pior do que nao ter: um rodape que anuncia termos e
   nao os entrega.
   Agora todo item e' um destino de verdade — ancora da propria landing (rfLpIr) ou pagina —, e a
   forma de `<span>` some junto com o ultimo item morto que a usava. Item novo aqui so' entra com
   destino: e' essa a regra que faltava.
   A coluna "Para marcas" tinha tres itens mortos ("Cotas de patrocinio", "Media kit", "Parceria
   de canal") e chegou a sair inteira; voltou em 05/09 com a pagina /media-kit/ a existir de
   verdade. Nao ha' coluna "Conteudo" porque seria a duplicata das tres primeiras de "Paginas",
   que ja' lista as dez. */
function rfLpRodapeHTML(){
  /* destino que parece CHAMADA de funcao vira botao; o resto e' href. A regex tem de aceitar
     maiuscula: `rfLpIr(` nao passava por `^[a-z]+\(` e os cinco itens da coluna saiam como
     <a href="rfLpIr('jogo')"> — link para um endereco que nao existe, que e' exatamente o
     defeito que este rodape veio corrigir. */
  const col=(t,itens)=>`<div class="rf-lp-fcol"><span class="rf-lp-ft">${escC(t)}</span>
    ${itens.map(([label,destino])=>/^[A-Za-z_$][\w$]*\(/.test(destino)
      ? `<button type="button" class="rf-lp-fl" onclick="${destino}">${escC(label)}</button>`
      : `<a class="rf-lp-fl" href="${destino}">${escC(label)}</a>`).join('')}</div>`;
  const paginas=(typeof LANDING_PAGINAS!=='undefined'?LANDING_PAGINAS:[]).map(([slug,label])=>[label,'/'+slug+'/']);
  const legais=(typeof LANDING_LEGAIS!=='undefined'?LANDING_LEGAIS:[])
    .map(([slug,label])=>`<a class="rf-lp-fbl" href="/${slug}/">${escC(label)}</a>`).join('<span class="rf-lp-fbsep">·</span>');
  return `<footer class="rf-lp-rodape">
    <div class="rf-lp-fgrid">
      <div class="rf-lp-fmarca">
        <!-- no rodape o fundo e escuro: a versao de palavra clara -->
        <a class="rf-lp-marca" href="/" aria-label="Retrofoot.com.br">
          <img class="marca" src="img/marca-clara.svg" alt="Retrofoot.com.br" height="26"></a>
        <p class="rf-lp-fp">O jogo de gerenciamento de futebol que você jogava na escola — agora online, com os amigos e no navegador.</p>
      </div>
      ${col('O jogo',[
        ['Jogar agora',"rfLpIr('jogo')"],
        ['Modo Resenha',"rfLpIr('resenha')"],
        ['Por dentro do jogo',"rfLpIr('telas')"],
        ['Planos',"rfLpIr('planos')"],
        ['Plano Pro',"rfLpIr('ligas')"],
      ])}
      ${col('Para marcas',[
        ['Media kit','/media-kit/'],
        ['Falar com o comercial','/media-kit/#falar'],
      ])}
      ${col('Páginas',paginas)}
    </div>
    <div class="rf-lp-fbase">
      <span>© 2026 RetroFoot</span>
      <span class="rf-lp-fbleg">${legais}</span>
      <div class="rf-sp"></div>
      <span class="rf-lp-fv">v2026.01 — feito por quem cresceu jogando Elifoot.</span>
    </div>
  </footer>`;
}
