/* =====================================================================
   RetroFoot98 — LANDING (rebranding 2026)
   Portada de docs/rebranding-2026/telas/Landing - Home.html.

   O texto é o da tela, verbatim: é peça de marketing escrita, não conteúdo
   derivado do save. Onde a tela mostra número (500 vagas, 318 na fila,
   18 de 20 na sala), o número da referência fica — a ligação com o dado
   real vem depois, sem mexer no desenho.

   A página tem seis blocos, na ordem da tela:
     nav · hero · carreira solo · Modo Resenha · mercado/leilão ·
     Ligas Oficiais · lista de espera · rodapé escuro
   ===================================================================== */

const RF_LP_NAV=[
  ['jogo','O jogo'],['telas','Por dentro'],['resenha','Modo Resenha'],
  ['momentos','Momentos'],['oficial','Seu jogador'],['grana','Ganhar com a resenha'],
  ['planos','Planos'],['ligas','Embaixadores'],
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
/* O plano gratis chama-se 'free' no banco e 'peladeiro' na pagina (a chave em
   RF_PLANOS). Os dois pagos tem o mesmo nome dos dois lados. Esta ponte existe
   para nao haver um `plan==='peladeiro'` nunca verdadeiro escondido algures. */
function rfPlanoCartao(plano){
  const k=plano||rfPlanoAtual();
  return (k==='free') ? 'peladeiro' : k;
}
function rfSavesTeto(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  const t=st.savesMax;
  return (t===null||t===undefined) ? Infinity : Number(t);
}
function rfSavesUsados(){
  return ((typeof CL!=='undefined'&&CL.soloSaves)||[]).length;
}
/* Falta ainda espaco para mais uma carreira? Enquanto a lista nao carregou
   (CL.soloSaves === null) responde que sim: o cartao nao pode nascer trancado
   so' porque a rede esta lenta. */
function rfPodeSalvarNovo(){
  if(typeof CL==='undefined' || CL.soloSaves==null) return true;
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
const RF_SALA_HUMANOS = 8;
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
  saves:{ tier:'resenha', titulo:'Os seus saves estão no limite',
    texto:(n)=>`O plano Peladeiro guarda até <b>${n}</b> carreiras ao mesmo tempo. Para começar mais uma agora, apague uma que já acabou — ou suba de plano e leve todas.`,
    saida:'Nenhuma carreira sua se perde: as que já existem continuam na nuvem, do jeito que estão.' },
  savesResenha:{ tier:'embaixador', titulo:'Os seus saves estão no limite',
    texto:(n)=>`O plano Resenha guarda até <b>${n}</b> carreiras ao mesmo tempo. Para começar mais uma agora, apague uma que já acabou — ou suba para o Embaixador e jogue sem conta.`,
    saida:'Nenhuma carreira sua se perde: as que já existem continuam na nuvem, do jeito que estão.' },
  hospedar:{ tier:'embaixador', titulo:'Abrir a sala é do Embaixador',
    texto:()=>'Entrar na resenha dos outros dá em qualquer plano, inclusive no grátis. <b>Abrir a sua</b> — ser o anfitrião, chamar a turma pelo código e mandar no ritmo da liga — é do plano Embaixador.',
    saida:'Já tem o código de alguém? Volte e entre na sala dele: isso não custa nada.' },
  resenha:{ tier:'resenha', titulo:'Os seus 7 dias de Resenha acabaram',
    texto:()=>'O Peladeiro joga o Modo Resenha por <b>7 dias</b>, para provar como é jogar a mesma semana com a turma. O seu prazo terminou — e com ele o seu lugar nas salas.',
    saida:'O Modo Solo continua seu, sem prazo: as suas carreiras contra a máquina estão intactas.' },
  avatar:{ tier:'embaixador', titulo:'O retrato por IA é do Embaixador',
    texto:()=>'O Embaixador põe a sua cara dentro do jogo: retrato gerado a partir de uma foto sua, na beira do campo e na ficha de treinador.',
    saida:'As caras prontas continuam à sua disposição, de graça.' },
};
function rfTrava(chave){
  /* A trava de saves aponta para o plano SEGUINTE ao de quem bateu no teto:
     quem esta no Peladeiro sobe para o Resenha, quem ja esta no Resenha so'
     resolve com o Embaixador. Oferecer a alguem o plano que ele ja tem e' o
     jeito mais rapido de perder a venda. */
  if(chave==='saves' && rfPlanoAtual()==='resenha') chave='savesResenha';
  const t=RF_TRAVAS[chave]; if(!t) return;
  const p=RF_PLANOS.find(x=>x.key===t.tier)||{};
  /* O PRECO SAI DA MESMA FUNCAO DOS CARTOES. Ele era lido de `p.preco`, campo
     que deixou de existir quando os precos viraram centavos para o seletor
     mensal/anual — a janela passou a abrir com o lugar do preco em branco, que
     e' o pior sitio possivel para faltar um numero. */
  const q=rfPlanoPrecoPartes(p, RF_LP_CICLO);
  const itens=(p.itens||[]).map(i=>`<li><span class="rf-lp-tick">✓</span>${escC(i)}</li>`).join('');
  const corpo=`<div class="rf-trava ${p.destaque?'ouro':''}">
    <p class="rf-trava-p">${t.texto(rfSavesTeto())}</p>
    <div class="rf-trava-plano ${p.destaque?'ouro':''}">
      <div class="rf-trava-hd">
        <span class="rf-trava-n">${p.destaque?'<i class="rf-trava-coroa">👑</i>':''}${escC(p.nome||'')}</span>
        <span class="rf-trava-v">${escC(q.v)}<i>${escC(q.c)}</i></span>
      </div>
      <ul class="rf-trava-l">${itens}</ul>
      <span class="rf-trava-a">${escC(q.nota)}</span>
    </div>
    <span class="rf-trava-saida">${escC(t.saida)}</span>
    <div class="rf-trava-bts">
      <button type="button" class="rf-trava-bt-2" onclick="clCloseOverlay()">Agora não</button>
      <button type="button" class="rf-trava-bt" onclick="clCloseOverlay();rfPlanoCta('${t.tier}','${chave}')">${escC(p.cta||'Quero assinar')}</button>
    </div>
  </div>`;
  if(typeof overlayC==='function' && typeof dlg==='function')
    overlayC(dlg(t.titulo, corpo, {w:520, tone:'marca', glyph:'🔒'}));
  else if(typeof toastC==='function') toastC(t.titulo);
}
/* FASE LISTA DE ESPERA: com a flag ligada, quem NÃO tem sessão não vê o
   "Entrar" — a única porta é a lista de espera. Quem já tem conta (sessão
   aberta) continua entrando normalmente. Desligar = voltar o login. */
const RF_SO_LISTA = true;
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
function rfContaChipHTML(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};
  if(!st.loggedIn){
    if(rfSoLista()) return '';
    return `<button type="button" class="rf-lp-entrar" onclick="clGoModo('solo')">${rfIcone('chave',16)} Entrar</button>`;
  }
  const nome=st.name||(st.email||'').split('@')[0]||'treinador';
  const pro=rfContaEhPro();
  /* O CRACHA DIZ O PLANO, NAO "Pro". Havia um plano pago so', e o cracha dizia
     o nome dele; agora ha dois, e "Pro" nao distingue um Resenha de um
     Embaixador — logo nao diz nada a quem paga o de cima. O nome sai de
     RF_PLANOS, a mesma lista que a pagina de precos usa. */
  const selo=pro?((RF_PLANOS.find(p=>p.key===rfPlanoCartao())||{}).nome||'Pro'):'';
  /* O NOME E O BOTAO DE JOGAR. Com sessao aberta o cabecalho ficava sem
     nenhuma porta de entrada: o "Entrar" some (ja esta dentro) e sobrava um
     cracha passivo com o nome. */
  return `<button type="button" class="rf-lp-conta ${pro?'pro':''}" onclick="rfIrParaModo()"
      title="Jogar como ${escC(st.email||nome)}">
      ${pro?'<span class="rf-lp-coroa" aria-hidden="true">👑</span>':rfIcone('jogar',16)}
      <span class="rf-lp-conta-n">${escC(nome)}</span>
      ${pro?`<span class="rf-lp-pro">${escC(selo)}</span>`:''}
    </button>
    <button type="button" class="rf-lp-sair" onclick="rfAcSairConta()">Sair</button>
    <button type="button" class="rf-lp-burger" onclick="rfLpMenu()" aria-label="Menu">
      ${rfIcone('menu',18)}
    </button>`;
}
/* ===== O MENU DO TELEMOVEL =====
   O cabecalho publico escondia os proprios links abaixo de 900px e nao tinha
   hamburguer nenhum — por isso "Entrar na lista" desaparecia no telefone e o
   "Sair" tinha de ficar a vista, apertado ao lado do nome. Agora tudo o que
   nao cabe vive aqui, e no cabecalho fica so o nome. */
function rfLpMenu(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};
  const links=RF_LP_NAV.map(([k,l])=>
    `<button type="button" class="rf-sheet-i" onclick="clCloseOverlay();rfLpIr('${k}')">
      <span class="rf-nav-l">${escC(l)}</span></button>`).join('');
  const lista=`<button type="button" class="rf-sheet-i destaque" onclick="clCloseOverlay();rfLpIr('lista')">
      <span class="rf-nav-l">Entrar na lista</span></button>`;
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
      <button type="button" class="rf-sheet-i" onclick="clCloseOverlay();clGoModo('solo')">
        <span class="rf-nav-l">Entrar na minha conta</span></button>`);
  if(typeof rfSheet==='function') rfSheet('Menu', `<div class="rf-sheet-list">${links}${lista}${conta}</div>`);
}
/* `extra` é o encaixe da DIREITA do cabeçalho: dentro do assistente é ali que
   mora o "‹ Voltar ao modo" do desenho, no lugar dos botões de entrar. Nas
   páginas públicas ele vem vazio e o cabeçalho é o de sempre.
   A CONTA VEM SEMPRE DEPOIS do extra — nunca é substituída por ele. */
function rfLpNavHTML(extra){
  return `<nav class="rf-lp-nav">
    <!-- A ASSINATURA E DESENHADA, nao montada. Era o simbolo mais a palavra escrita
         em texto ao lado; a marca nova tem um lockup proprio, com o espacamento e o
         peso da palavra definidos por quem a desenhou. Montar a mao nunca bate. -->
    <a class="rf-lp-marca" href="/" aria-label="Retrofoot.com.br">
      <img class="marca" src="img/marca.svg" alt="Retrofoot.com.br" height="26">
    </a>
    <div class="rf-lp-links">
      ${RF_LP_NAV.map(([k,l])=>`<button type="button" class="rf-lp-link" onclick="rfLpIr('${k}')">${escC(l)}</button>`).join('')}
    </div>
    <div class="rf-sp"></div>
    ${extra||''}
    ${extra==null ? `<button type="button" class="rf-lp-btlista" onclick="rfLpIr('lista')">Entrar na lista</button>` : ''}
    ${rfContaChipHTML()}
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

function rfLpHeroVideoHTML(){
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
      <span class="rf-lp-video-s">Aqui vai rodar o vídeo de apresentação do RetroFoot98.</span>
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
      <img src="${escC(img)}" alt="${escC(l)} — tela do RetroFoot98" loading="lazy" width="1600" height="1000">
      <figcaption>${escC(d)}</figcaption>
    </figure>`).join('');
  return `<section class="rf-lp-telas rf-lp-f-branco" id="rf-lp-telas">
    <div class="rf-lp-telas-in">
      <span class="rf-lp-eyebrow">Por dentro do jogo</span>
      <h2 class="rf-lp-h2">Isto aqui não é maquete. É o jogo rodando.</h2>
      <p class="rf-lp-p">Nenhuma dessas telas foi desenhada pra propaganda: são fotos do RetroFoot98 aberto, no meio de uma temporada da Série D.</p>
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
const RF_PLANOS=[
  { key:'peladeiro', nome:'Peladeiro', mes:0, ano:0, ciclo:'pra sempre',
    resumo:'Pra sentir o gostinho e entender por que ninguém larga isso.',
    itens:['Até 3 saves no modo solo','Séries A, B, C e D com elencos reais','Modo Resenha por 7 dias, nas salas dos outros'],
    falta:['Depois dos 7 dias, o Resenha sai','Não abre sala como anfitrião'],
    cta:'Começar de graça' },

  { key:'resenha', nome:'Resenha', mes:1990, ano:19900,
    resumo:'Pra quem joga direto com a turma e quer o nome no ranking.',
    itens:['Até 10 saves no modo solo','Entra em qualquer sala do Modo Resenha','Seu nome no ranking oficial de treinadores RetroFoot'],
    falta:['Não abre sala como anfitrião'],
    cta:'Assinar o Resenha' },

  { key:'embaixador', nome:'Embaixador', mes:4990, ano:39900,
    destaque:true, selo:'O mais completo',
    resumo:'Pra quem monta a liga, chama a galera e quer a cara dentro do jogo.',
    itens:['Você é o anfitrião: abre salas de 3 a 8 treinadores',
           'Saves ilimitados no solo e no Resenha',
           'Seu jogador na base de dados oficial, com avatar na sua cara',
           'Seu nome no ranking oficial de treinadores',
           'Selo de Embaixador no seu perfil',
           'Código pra passar aos seus seguidores — e monetizar com ele'],
    cta:'Quero ser Embaixador' },
];

/* ===== O PRECO EM CENTAVOS, E O RESTO CALCULADO =====
   Os valores eram frases ('R$ 19,90', 'ou R$ 199 por ano — dá R$ 16,58/mês').
   Com o seletor mensal/anual isso deixou de servir: a economia tem de ser
   CONTADA, senão nasce uma quarta e uma quinta frase para alguém esquecer de
   atualizar no dia do reajuste. Agora só existem dois números por plano, e
   mensalidade equivalente, desconto e economia saem deles.

   Os centavos são os MESMOS do Stripe (metadata plano+ciclo) — 1990, 19900,
   4990, 39900. Se um dia divergirem, o site mente sobre o que a cobrança faz. */
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
  if(!p.mes) return { v:'R$ 0', c:p.ciclo||'pra sempre',
                      nota:'Solo pra sempre · Resenha por 7 dias · sem cartão' };
  const e = rfPlanoEconomia(p);
  if(ciclo === 'ano' && e){
    return { v:rfBRL(e.porMes), c:'por mês',
             nota:`${rfBRL(p.ano,false)} cobrados uma vez por ano · você economiza ${rfBRL(e.poupa)}` };
  }
  return { v:rfBRL(p.mes), c:'por mês',
           nota: e ? `no anual sai ${rfBRL(e.porMes)}/mês — ${e.pct}% mais barato` : 'sem fidelidade' };
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
function rfPlanoCta(key, trava, ciclo){
  const nome=(RF_PLANOS.find(p=>p.key===key)||{}).nome||key;
  /* De onde veio o lead. Da landing e' o botao do cartao do plano; de dentro do
     jogo e' um cadeado, e ai o nome da trava vai junto — e' assim que se sabe
     qual delas de facto empurra alguem para a lista. */
  const origem = trava ? ('jogo · '+trava+' · plano '+nome) : ('landing · plano '+nome);
  const paraLista = () => {
    if(typeof clWaitlistOpen==='function') return clWaitlistOpen(origem);
    rfLpIr('lista');
  };

  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};
  if(key==='peladeiro' || !st.loggedIn || !(typeof NET!=='undefined'&&NET.criarCheckout))
    return paraLista();

  if(typeof toastC==='function') toastC('Abrindo o pagamento…');
  NET.criarCheckout(key, ciclo||'mes').then(r=>{
    if(r && r.url){ location.href = r.url; return; }
    /* sem_chave / sem_sessao / falhou: o caminho de sempre, sem alarde. O que
       NÃO se faz aqui é mostrar erro técnico a quem só queria assinar. */
    console.warn('checkout indisponível:', r && r.erro);
    paraLista();
  }).catch(e=>{ console.warn('checkout:', e); paraLista(); });
}
function rfLpPlanosHTML(){
  const cartoes=RF_PLANOS.map(p=>{
    const itens=(p.itens||[]).map(i=>`<li><span class="rf-lp-tick">✓</span>${escC(i)}</li>`).join('');
    const falta=(p.falta||[]).map(i=>`<li class="nao"><span class="rf-lp-tick">—</span>${escC(i)}</li>`).join('');
    const q=rfPlanoPrecoPartes(p, RF_LP_CICLO);
    return `<div class="rf-lp-plano ${p.destaque?'ouro':''}" data-plano="${p.key}">
      ${p.selo?`<span class="rf-lp-plano-selo">👑 ${escC(p.selo)}</span>`:''}
      <span class="rf-lp-plano-n">${escC(p.nome)}</span>
      <span class="rf-lp-plano-r">${escC(p.resumo)}</span>
      <div class="rf-lp-plano-preco">
        <span class="rf-lp-plano-v">${escC(q.v)}</span>
        <span class="rf-lp-plano-c">${escC(q.c)}</span>
      </div>
      <span class="rf-lp-plano-a">${escC(q.nota)}</span>
      <ul class="rf-lp-plano-l">${itens}${falta}</ul>
      <button type="button" class="rf-lp-plano-bt" onclick="rfPlanoCta('${p.key}',null,RF_LP_CICLO)">${escC(p.cta)}</button>
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
      <p class="rf-lp-p">O Modo Solo é de graça pra sempre. Os planos pagos existem pra quem quer manter o Modo Resenha depois dos 7 dias, abrir a liga da turma, guardar mais carreiras e aparecer no ranking oficial.</p>
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
      <span class="rf-lp-nota">Cancele quando quiser. Seus saves continuam seus — o Modo Solo não tem prazo em nenhum plano.</span>
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
    if(v){ v.textContent=q.v; v.classList.remove('troca'); void v.offsetWidth; v.classList.add('troca'); }
    if(l) l.textContent=q.c;
    if(n) n.textContent=q.nota;
  });
  /* o botão de ouro lá embaixo repete o preço do Embaixador */
  const ouro=document.querySelector('.rf-lp-bt-ouro');
  if(ouro) ouro.innerHTML='👑 Ser Embaixador — '+escC(rfPlanoPreco('embaixador'));
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

      ${rfLpFotoHTML('img/home/sorteio-resenha.webp','Cerimônia do sorteio com oito treinadores e seus clubes','grande')}

      <div class="rf-lp-passos">
        ${passo(1,'Abre a sala','Dá um nome e pronto. Salas de 3 a 8 treinadores.')}
        ${passo(2,'Manda o link','No grupo do WhatsApp, por e-mail ou pelo nome de quem já tem conta.')}
        ${passo(3,'Sorteia os clubes','A cerimônia roda pra todo mundo ao mesmo tempo. Choro é grátis.')}
        ${passo(4,'Joga a semana','Rodada ao vivo, tabela única e o chat da sala rolando junto.')}
      </div>

      <div class="rf-lp-resenha-par">
        <figure class="rf-lp-foto">
          <img src="img/home/sala-resenha.webp" alt="Sala do Modo Resenha com oito treinadores dentro"
            loading="lazy" width="1600" height="1000">
          <figcaption>A sala enchendo: link, convite por WhatsApp e quem já está dentro.</figcaption>
        </figure>
        <figure class="rf-lp-foto retrato">
          <img src="img/home/chat-resenha.webp" alt="Chat da sala do Modo Resenha"
            loading="lazy" width="600" height="682">
          <figcaption>O chat da sala fica no canto e cala a boca sozinho durante a partida.</figcaption>
        </figure>
      </div>

      <span class="rf-lp-nota">Entrar na sala dos outros dá em qualquer plano — no grátis, por 7 dias. <b>Abrir a sua</b> é do Embaixador.</span>
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
      <h2 class="rf-lp-h2">Você não virou jogador. Mas ainda dá tempo.</h2>
      <p class="rf-lp-p">O Embaixador entra na base de dados oficial do RetroFoot98 como jogador — nome seu, rosto seu, ficha sua. Ele nasce nos elencos, é escalado, leva cartão, faz gol e aparece na artilharia dos outros treinadores. Enquanto você jogar, ele joga.</p>

      <div class="rf-lp-album">
        <figure class="rf-lp-album-q antes">
          <div class="rf-lp-album-media">${antes}</div>
          <figcaption>Você, quando ainda ia ser jogador</figcaption>
        </figure>
        <span class="rf-lp-album-seta" aria-hidden="true">→</span>
        <figure class="rf-lp-album-q depois">
          <div class="rf-lp-album-media">
            <img src="img/home/retrato-jogador.webp" alt="Retrato de um jogador na ficha do RetroFoot98"
              loading="lazy" width="400" height="828">
          </div>
          <figcaption>Você, na ficha, com força 11 e a torcida no seu nome</figcaption>
        </figure>
      </div>

      <ul class="rf-lp-oficial-l">
        <li><span class="rf-lp-tick">✓</span>Seu nome e o seu rosto na base oficial, para todos os treinadores</li>
        <li><span class="rf-lp-tick">✓</span>Ficha completa: características, ponto forte, ponto fraco e valor de mercado</li>
        <li><span class="rf-lp-tick">✓</span>Pode ser comprado, vendido e disputado no leilão como qualquer outro</li>
        <li><span class="rf-lp-tick">✓</span>Fica no jogo enquanto você for Embaixador</li>
      </ul>

      ${rfLpFotoHTML('img/home/ficha-jogador.webp','Ficha do jogador dentro do RetroFoot98','grande')}

    </div>
  </section>`;
}

/* =====================================================================
   O EMBAIXADOR PODE GANHAR DINHEIRO COM ISSO
   ---------------------------------------------------------------------
   O plano dá um CÓDIGO para o Embaixador passar aos seguidores. Esta seção
   é sobre isso e só sobre isso — sem número de comissão, porque nenhum
   número foi definido. Percentagem inventada numa página de vendas é
   promessa que alguém vai cobrar depois.
   ===================================================================== */
function rfLpGranaHTML(){
  const quem=(ic,t,d)=>`<div class="rf-lp-quem">
    <span class="rf-lp-quem-ic" aria-hidden="true">${ic}</span>
    <span class="rf-lp-quem-t">${escC(t)}</span>
    <span class="rf-lp-quem-d">${escC(d)}</span></div>`;
  return `<section class="rf-lp-grana rf-lp-f-creme" id="rf-lp-grana">
    <div class="rf-lp-grana-in">
      <span class="rf-lp-selo-emb">👑 Só no Embaixador</span>
      <h2 class="rf-lp-h2">Monte a sua resenha. E ganhe com ela.</h2>
      <p class="rf-lp-p">Todo Embaixador recebe um código próprio pra passar pra galera dele. Quem entrar pelo seu código conta como seu — e isso vira dinheiro no seu bolso, não só audiência.</p>

      <div class="rf-lp-quem-grade">
        ${quem('🎥','Criador de conteúdo','Transmite a semana ao vivo no Modo Camarote e joga a liga com a audiência.')}
        ${quem('📣','Influencer','O código vai na bio. Quem entrar por ele entra na sua liga — e conta pra você.')}
        ${quem('🍻','O cara que junta a galera','Não precisa ter canal. Precisa ter gente querendo jogar com você.')}
      </div>

      <div class="rf-lp-grana-como">
        <div class="rf-lp-grana-p"><span class="rf-lp-passo-n">1</span>
          <span>Você vira Embaixador e recebe o seu código.</span></div>
        <div class="rf-lp-grana-p"><span class="rf-lp-passo-n">2</span>
          <span>Passa o código pra sua galera, pro canal, pro grupo.</span></div>
        <div class="rf-lp-grana-p"><span class="rf-lp-passo-n">3</span>
          <span>Abre a sala, joga com eles e acompanha quem entrou pelo seu código.</span></div>
      </div>

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
const RF_LP_EMBAIXADOR=[
  ['👑','Você é o anfitrião','Abre salas de 3 a 8 treinadores e chama quem quiser. Nos outros planos você só entra na sala dos outros.'],
  ['♾️','Saves ilimitados','Quantas carreiras você quiser, no solo e no Resenha. Sem ter de apagar uma pra começar outra.'],
  ['🧍','Seu jogador no jogo','Nome seu, rosto seu, ficha sua — dentro da base oficial, para todo mundo escalar.'],
  ['🏅','Selo de Embaixador','No seu perfil e ao lado do seu nome. Quem joga com você sabe quem você é.'],
  ['📊','Ranking oficial','Sua campanha entra no ranking de treinadores do RetroFoot98.'],
  ['💰','Código pra monetizar','Um código só seu pra passar aos seus seguidores — e ganhar com quem entrar por ele.'],
];
/* o preço sai de RF_PLANOS — digitado outra vez aqui, um dia os dois discordam */
function rfPlanoPreco(key){
  const p=RF_PLANOS.find(x=>x.key===key); if(!p) return '';
  const q=rfPlanoPrecoPartes(p, RF_LP_CICLO);
  return q.v+'/'+q.c.replace('por ','');
}
function rfLpLigasHTML(){
  const cartoes=RF_LP_EMBAIXADOR.map(([ic,t,d])=>`<div class="rf-lp-embc">
    <span class="rf-lp-embc-ic" aria-hidden="true">${ic}</span>
    <span class="rf-lp-embc-t">${escC(t)}</span>
    <span class="rf-lp-embc-d">${escC(d)}</span>
  </div>`).join('');
  return `<section class="rf-lp-ligas rf-lp-f-creme" id="rf-lp-ligas">
    <div class="rf-lp-ligas-in">
      <span class="rf-lp-selo-emb">👑 Plano Embaixador</span>
      <h2 class="rf-lp-h2">Tudo o que vem junto com a coroa.</h2>
      <p class="rf-lp-p">Seis coisas que só existem no plano de cima — e nenhuma delas é enfeite.</p>
      <div class="rf-lp-embc-grade">${cartoes}</div>
      <button type="button" class="rf-lp-bt-ouro" onclick="rfPlanoCta('embaixador',null,RF_LP_CICLO)">
        👑 Ser Embaixador — ${escC(rfPlanoPreco('embaixador'))}</button>
    </div>
  </section>`;
}


/* ---- a página ---- */
function rfLandingHTML(){
  return `<div class="rf-lp">
    ${rfLpNavHTML()}

    <header class="rf-lp-hero" id="rf-lp-jogo">
      <div class="rf-lp-hero-txt">
        <span class="rf-lp-pill">● 100% online — nada pra instalar</span>
        <h1 class="rf-lp-h1">O clássico da sua infância,<br>agora online e com os amigos.</h1>
        <p class="rf-lp-p">Você é o técnico. Escala o time, negocia jogadores, cuida do caixa e briga por acesso da Série D ao topo — sozinho contra a máquina ou na resenha com a turma toda na mesma liga.</p>
        <div class="rf-lp-ctas">
          <button type="button" class="rf-wiz-cta" onclick="rfLpIr('planos')">👑 Ver os planos</button>
          <button type="button" class="rf-wiz-b2" onclick="${rfLpEntrarOn("clGoModo('solo')")}">⚽ Jogar de graça</button>
        </div>
        <span class="rf-lp-nota">Tem plano <b>Peladeiro grátis</b>: Modo Solo pra sempre e 7 dias de Resenha. Sem instalar nada, sem cartão.</span>
      </div>
      <div class="rf-lp-hero-art">
        ${rfLpHeroVideoHTML()}
      </div>
    </header>

    <section class="rf-lp-sec">
      ${rfLpSecaoHTML({eyebrow:'Jogue do seu jeito', titulo:'Da Série D ao topo, no seu ritmo.',
        prosa:'Pega um clube pequeno e sobe até a elite. Mercado de transferências, finanças do clube e o calendário completo de copas — sem depender de ninguém entrar na sala.',
        itens:['Séries A, B, C e D com elencos reais','Copa do Brasil, Libertadores e Sul-Americana','Partida ao vivo com narração lance a lance'],
        cta:rfIcone('jogar',16)+' Começar uma carreira', ctaOn:rfLpEntrarOn("clGoModo('solo')")})}
      ${rfLpFotoHTML('img/home/classificacao.webp','Classificação da Série D dentro do RetroFoot98')}
    </section>

    ${rfLpTelasHTML()}

    ${rfLpResenhaHTML()}

    <section class="rf-lp-sec">
      ${rfLpSecaoHTML({eyebrow:'Mercado global', titulo:'O leilão é onde a liga se decide.',
        prosa:'Cada jogador tem vários clubes disputando. Para levar, cubra a maior oferta antes das semanas acabarem — se o seu lance ficar abaixo, a concorrência cobre na semana seguinte.',
        itens:['Leilão aberto a todos os clubes da liga','Propostas e contrapropostas por jogador','Finanças de verdade: folha, bilheteria e sócios'],
        cta:rfIcone('leilao',16)+' Ver o mercado', ctaOn:rfLpEntrarOn("clGoModo('solo')")})}
      ${rfLpFotoHTML('img/home/leilao.webp','Leilão de jogadores dentro do RetroFoot98')}
    </section>

    ${rfLpMomentosHTML()}

    ${rfLpJogadorOficialHTML()}

    ${rfLpGranaHTML()}

    ${rfLpPlanosHTML()}

    ${rfLpLigasHTML()}

    ${rfLpListaHTML()}

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
function rfLpRodapeHTML(){
  const col=(t,itens)=>`<div class="rf-lp-fcol"><span class="rf-lp-ft">${escC(t)}</span>
    ${itens.map(i=>Array.isArray(i)
      ? `<a class="rf-lp-fl" href="${i[1]}">${escC(i[0])}</a>`
      : `<span class="rf-lp-fl">${escC(i)}</span>`).join('')}</div>`;
  const paginas=(typeof LANDING_PAGINAS!=='undefined'?LANDING_PAGINAS:[]).map(([slug,label])=>[label,'/'+slug+'/']);
  return `<footer class="rf-lp-rodape">
    <div class="rf-lp-fgrid">
      <div class="rf-lp-fmarca">
        <!-- no rodape o fundo e escuro: a versao de palavra clara -->
        <a class="rf-lp-marca" href="/" aria-label="Retrofoot.com.br">
          <img class="marca" src="img/marca-clara.svg" alt="Retrofoot.com.br" height="26"></a>
        <p class="rf-lp-fp">O jogo de gerenciamento de futebol que você jogava na escola — agora online, com os amigos e no navegador.</p>
      </div>
      ${col('O jogo',['Jogar agora','Modo Resenha','Ranking','Ligas Oficiais'])}
      ${col('Para marcas',['Cotas de patrocínio','Media kit','Parceria de canal'])}
      ${col('Conteúdo',['Blog','Guia do jogo','Canais oficiais'])}
      ${col('Páginas',paginas)}
    </div>
    <div class="rf-lp-fbase">
      <span>© 2026 RetroFoot98 · Termos · Privacidade</span>
      <div class="rf-sp"></div>
      <span class="rf-lp-fv">v2026.01 — feito por quem cresceu jogando Elifoot.</span>
    </div>
  </footer>`;
}
