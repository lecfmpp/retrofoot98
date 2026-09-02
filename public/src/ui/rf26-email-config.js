/* =====================================================================
   RetroFoot98 — E-MAIL (2 abas) e CONFIGURAÇÕES (3 abas)
   Portado de telas/E-mail - Abas.html e telas/Configuracoes - Abas.html.

   ARQUIVADAS são as JÁ LIDAS. O motor não tem pasta de arquivo: CL.inbox é
   uma lista só, com `read` por mensagem, e apagar é definitivo
   (CL.inboxDeleted). Então a aba mostra o que já foi lido — que é o
   histórico que a referência desenha — em vez de inventar um arquivo que
   o jogo não sabe manter.
   ===================================================================== */

/* =====================================================================
   E-MAIL · 1 · CAIXA DE ENTRADA
   Duas colunas: a lista à esquerda, a leitura à direita. É a ÚNICA página
   do jogo que usa a grade de duas colunas — nas outras o pacote empilha
   cartões de largura cheia.
   ===================================================================== */
function rfEmCaixaHTML(){
  const todas=rfInbox();
  const naoLidas=todas.filter(e=>!e.read).length;
  return rfCol(
    `<div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">CAIXA DE ENTRADA</span>
        <span class="rf-label-r">${naoLidas? (naoLidas+' não lida'+(naoLidas===1?'':'s')) : 'tudo lido'}</span></div>
      ${rfLista('inbox', todas.map(rfEmLinha), 'Caixa de entrada vazia.')}
    </div>`
  ) + rfCol(rfEmLeituraHTML());
}
/* A LINHA: ícone à esquerda, assunto e remetente empilhados, hora à direita.
   O ponto de não lida é um PSEUDO-ELEMENTO sobre o ícone — no pacote ele
   flutua sobre o canto, e pôr o "●" dentro do texto (como estava) empurrava
   o assunto e desalinhava a coluna inteira. */
function rfEmLinha(e){
  return `<div class="rf-mail ${e.read?'':'novo'} ${CL.inboxOpen===e.key?'aberto':''}"
       onclick="clOpenEmail('${escC(e.key)}')">
    <span class="rf-mail-i">${(typeof inboxIcon==='function'?inboxIcon(e.kind):rfIcone('email',16)+'')}</span>
    <div class="rf-mail-id">
      <div class="rf-mail-top">
        <span class="rf-mail-a">${escC(e.subject||'')}</span>
        <span class="rf-mail-q">${escC(rfQuandoHTML(e))}</span>
      </div>
      <span class="rf-mail-p">${escC(String(e.from||e.preview||'').slice(0,72))}</span>
    </div>
  </div>`;
}

/* =====================================================================
   O QUE CADA E-MAIL É, ONDE SE EXECUTA, E O QUE SE PODE RESPONDER

   O PROBLEMA. Todo e-mail que não fosse premiação abria o MESMO diálogo — o
   "resposta à diretoria", com três opções sobre ACEITAR UMA META. Chegava
   uma proposta de dez milhões por um titular e as respostas eram "Assumo a
   meta / Peço mais tempo / Discordo da meta"; nenhuma delas dizia respeito à
   mensagem, e nenhuma fazia coisa alguma (a escolha era guardada no e-mail e
   mais nada). E o botão que devia levar ao sítio onde a coisa se resolve não
   existia: o `action.go` que o motor escrevia falava a linguagem das abas
   antigas (CL.tab="financas"), que o envelope de 2026 não usa.

   A CORREÇÃO, em três peças:
     · rfEmailTipo   — o que a mensagem é, com o detalhe que o `kind` não dá
                       (risco de aposentadoria ≠ aposentadoria consumada;
                       caixa no vermelho ≠ transferência fechada).
     · rfEmailIr     — o BOTÃO QUE LEVA AO LUGAR CERTO, pela navegação nova
                       (rfGo(página, aba)), com o e-mail marcado como lido.
     · RF_EMAIL_RESP — a resposta REAL de cada tipo: opções escritas sobre os
                       fatos daquela mensagem, e efeito de verdade na moral do
                       elenco, na segurança no cargo e na reputação — os mesmos
                       três números da assessoria de imprensa.
   ===================================================================== */
function rfEmailTipo(e){
  if(!e) return '';
  const k=String(e.key||'');
  if(k.indexOf('risco-')===0) return 'risco';
  if(k.indexOf('caixa-')===0) return 'caixa';
  return e.kind||'';
}
/* DESTINO PADRÃO POR TIPO. O e-mail pode trazer o seu (`nav`, escrito em
   syncInbox); esta tabela é a rede para os que ficaram guardados antes disso —
   uma caixa de entrada sobrevive ao save, e mensagem velha não pode ficar sem
   botão. */
const RF_EMAIL_DEST = {
  offer:   { label:'Ver a proposta',           page:'mercado',     tab:'propostas' },
  counter: { label:'Ver a contraproposta',     page:'mercado',     tab:'contra' },
  job:     { label:'Ver o convite',            page:'treinador',   tab:'ofertas' },
  warn:    { label:'Ver a classificação',      page:'campeonatos', tab:'classificacao' },
  retire:  { label:'Ver o elenco',             page:'elenco',      tab:'elenco' },
  risco:   { label:'Ver quem pode sair',       page:'mercado',     tab:'vender' },
  money:   { label:'Ver o extrato',            page:'financas',    tab:'extrato' },
  caixa:   { label:'Ver as finanças',          page:'financas',    tab:'resumo' },
  prize:   { label:'Ver o resumo financeiro',  page:'financas',    tab:'resumo' },
};
function rfEmailDestino(e){
  if(!e) return null;
  const n=e.nav;
  if(n && n.page) return { label:n.label||'Abrir', page:n.page, tab:n.tab||'' };
  return RF_EMAIL_DEST[rfEmailTipo(e)]||null;
}
function rfEmailIr(key){
  const e=(CL.inbox||[]).find(x=>x.key===key);
  const d=rfEmailDestino(e);
  if(!d){ toastC('Esta mensagem não pede nenhuma ação.'); return; }
  if(e && !e.read){ e.read=true; if(typeof saveInbox==='function') saveInbox(); }
  if(typeof rfAcFechar==='function' && CL.acao) CL.acao=null;
  rfGo(d.page, d.tab||undefined);
}

/* AS RESPOSTAS QUE VALEM ALGUMA COISA.
   `m` moral do elenco · `c` segurança no cargo · `r` reputação do treinador.
   Os números são pequenos de propósito — um e-mail inclina a temporada, não a
   decide —, e cada opção diz o seu preço ANTES do clique.
   `efeito` é o gancho para o que muda no jogo além dos números (hoje só o
   convite recusado, que sai mesmo da mesa). */
const RF_EMAIL_RESP = {
  offer: {
    kicker:'E-MAIL · RESPOSTA AO DIRETOR DE FUTEBOL',
    intro:d=>`O ${escC(d.clube||'clube interessado')} ofereceu <b>${escC(rfDin(d.valor||0))}</b> por <b>${escC(d.jogador||'um jogador seu')}</b>. O diretor quer saber a sua posição antes de responder.`,
    ops:[
      { t:'Esse jogador não está à venda',        s:'o elenco vê que você segura o time · a diretoria queria o dinheiro', m:+4, c:-3, r:+1, fala:'cravou que não vende o titular' },
      { t:'Escuto se cobrirem o valor de mercado',s:'sem promessa a ninguém; nada muda no vestiário',                     m: 0, c: 0, r:+1, fala:'deixou a negociação em aberto' },
      { t:'Pode negociar, o caixa precisa',       s:'a diretoria aprova · o vestiário estranha',                          m:-3, c:+4, r: 0, fala:'liberou a venda para reforçar o caixa' } ],
    nota:'A venda em si é decidida no Mercado, em <b>Propostas</b> — isto é a sua posição pública sobre ela.' },

  job: {
    kicker:'E-MAIL · RESPOSTA AO PRESIDENTE',
    intro:d=>`O ${escC(d.clube||'clube')} ofereceu <b>${escC(rfDin(d.salario||0))}</b> de salário${d.verba?` e <b>${escC(rfDin(d.verba))}</b> de verba`:''}. O seu clube atual está a ver o que você responde.`,
    ops:[
      { t:'Estou feliz aqui. Não vou conversar',  s:'tira o convite da mesa · o elenco e a diretoria valorizam a lealdade', m:+3, c:+5, r:+1, fala:'recusou publicamente o convite', efeito:'recusarConvite' },
      { t:'Não comento propostas',                s:'o convite continua na mesa; ninguém se ofende',                       m: 0, c: 0, r:+1, fala:'não quis comentar o convite' },
      { t:'Vou ouvir o que eles têm a dizer',     s:'o convite continua na mesa · aqui dentro ninguém gosta',              m:-4, c:-6, r:+2, fala:'admitiu ouvir outro clube' } ],
    nota:'Aceitar de verdade é em <b>Treinador · Ofertas</b>, onde estão os termos completos.' },

  warn: {
    kicker:'E-MAIL · RESPOSTA À DIRETORIA',
    intro:d=>`A segurança no cargo está em <b>${d.cargo!=null?d.cargo:'—'}/100</b>${d.posicao?` e o time é o <b>${d.posicao}º</b> colocado`:''}. O presidente quer uma resposta, não um relatório.`,
    ops:[
      { t:'Assumo a responsabilidade. O problema é meu', s:'a diretoria gosta da postura · o elenco se sente protegido', m:+5, c:+4, r:+1, fala:'assumiu a responsabilidade pela crise' },
      { t:'O elenco precisa render mais',                s:'a diretoria concorda · o vestiário escuta a cobrança',       m:-6, c:+2, r: 0, fala:'cobrou publicamente o elenco' },
      { t:'Me deem tempo. O trabalho é de médio prazo',  s:'sem promessa; a diretoria anota o pedido',                   m:+1, c:-3, r: 0, fala:'pediu tempo à diretoria' } ],
    nota:'Abaixo de 15 na segurança no cargo, a demissão passa a ser sorteada a cada rodada.' },

  retire: {
    kicker:'E-MAIL · RESPOSTA AO DIRETOR DE FUTEBOL',
    intro:d=>`${d.quantos===1?'Um jogador pendurou':(d.quantos||'Alguns')+' jogadores penduraram'} as chuteiras${(d.nomes&&d.nomes.length)?': <b>'+escC(d.nomes.slice(0,4).join(', '))+'</b>':''}. O clube pergunta como marcar a saída.`,
    ops:[
      { t:'Homenagem no próximo jogo em casa',    s:'o vestiário inteiro sente o gesto',                     m:+4, c: 0, r:+1, fala:'anunciou homenagem aos que se aposentaram' },
      { t:'Agradecer nos bastidores e seguir',    s:'discreto; nada muda',                                   m: 0, c: 0, r: 0, fala:'agradeceu discretamente' },
      { t:'Renovar o elenco agora é a prioridade',s:'a diretoria aprova · o grupo entende como recado',      m:-2, c:+3, r: 0, fala:'colocou a renovação do elenco à frente' } ],
    nota:'As vagas abertas na folha aparecem no Mercado ainda nesta janela.' },

  caixa: {
    kicker:'E-MAIL · RESPOSTA AO PRESIDENTE',
    intro:d=>`O caixa fechou a semana em <b>${escC(rfDin(d.caixa||0))}</b>${d.folha?` com uma folha de <b>${escC(rfDin(d.folha))}</b>/mês`:''}. O presidente quer saber o seu plano.`,
    ops:[
      { t:'Vou vender quem estiver sobrando',     s:'a diretoria aprova · o elenco fica em alerta',          m:-3, c:+5, r: 0, fala:'prometeu vendas para equilibrar o caixa' },
      { t:'Corto custos sem mexer no elenco',     s:'ninguém se assusta; a conta continua apertada',         m:+1, c:+1, r: 0, fala:'prometeu cortar custos sem vender ninguém' },
      { t:'Preciso de aporte da diretoria',       s:'o grupo aprova · a diretoria não gostou do recado',     m:+3, c:-5, r: 0, fala:'pediu aporte à diretoria em público' } ],
    nota:'O jogo não deixa o caixa financiar compras no vermelho — vender é o caminho mais rápido.' },
};

/* A LEITURA: assunto em serifa, bloco do remetente com escudo, corpo, e a
   fila de botões separada por filete.
   OS BOTÕES SEGUEM A MENSAGEM. O primeiro é o que ela PEDE (ir ao sítio onde
   se executa); o segundo, quando existe, é a RESPOSTA daquele assunto. Uma
   mensagem que não pede nada — uma venda concluída, um extrato — não ganha
   botão nenhum inventado. */
function rfEmLeituraHTML(){
  const box=rfInbox();
  const e=CL.inboxOpen? box.find(x=>x.key===CL.inboxOpen) : box[0];
  if(!e) return `<div class="rf-card">
    <div class="rf-label"><span class="rf-label-t">MENSAGEM ABERTA</span></div>
    <div class="rf-empty">Escolha um e-mail na lista ao lado.</div></div>`;
  const cl=clubOf(CL.clubId)||{short:'—'};
  const de=e.from||('Diretoria do '+(cl.short||''));
  /* A RESPOSTA JÁ DADA FICA NO PRÓPRIO E-MAIL. O motor não tem um "histórico da
     direção" separado — o e-mail é o registo, e sem isto o jogador respondia e
     nada na tela dizia o que tinha dito. */
  const resposta=e.reply?`<div class="rf-ml-resp">
      <span class="rf-label-t">A SUA RESPOSTA</span>
      <p class="rf-ml-resp-t">“${escC(e.reply.opcao||'—')}”</p>
      ${e.reply.nota?`<p class="rf-ml-resp-n">${escC(e.reply.nota)}</p>`:''}
      ${e.reply.efeitoTxt?`<span class="rf-ml-resp-e">${escC(e.reply.efeitoTxt)}</span>`:''}
    </div>`:'';
  return `<div class="rf-card">
    <div class="rf-label"><span class="rf-label-t">MENSAGEM ABERTA</span>
      <span class="rf-label-r">${escC(String(e.from||'').split('·')[0].trim()||'—')} · ${escC(rfQuandoHTML(e))}</span></div>
    <div class="rf-ml">
      <!-- FAIXA DO TOPO DO E-MAIL (rf98.email.topo). Fica DENTRO da mensagem, acima
           do assunto: quem chega aqui esta a LER, e nao a passar os olhos por uma
           lista. Toda proposta por jogador, convite de clube, aviso da diretoria e
           premiacao passa por este ecra. Desligavel pelo painel como os outros. -->
      ${(typeof rfAdEspaco==='function')?rfAdEspaco('rf98.email.topo',{cls:'rf-ad-email',formato:'728×90'}):''}
      <span class="rf-ml-subj">${escC(e.subject||'')}</span>
      <div class="rf-ml-de">
        ${rfCrest(cl,30)}
        <span class="rf-ml-de-id">
          <span class="rf-ml-de-n">${escC(de)}</span>
          <span class="rf-ml-de-s">para ${escC(rfTreinadorNome())} · ${escC(rfQuandoHTML(e))}</span>
        </span>
      </div>
      <div class="rf-ml-corpo">${e.body||''}</div>
      ${resposta}
      <div class="rf-ml-acts">${rfEmailBotoesHTML(e)}</div>
    </div>
  </div>`;
}

/* =====================================================================
   E-MAIL · 2 · ARQUIVADAS (as já lidas)
   Cartão único de largura cheia — sem painel de leitura ao lado, como o
   pacote desenha.
   ===================================================================== */
function rfEmArquivadasHTML(){
  const lidas=rfInbox().filter(e=>e.read);
  return `<div class="rf-card">
    <div class="rf-label"><span class="rf-label-t">ARQUIVADAS</span>
      <span class="rf-label-r">${lidas.length} ${lidas.length===1?'mensagem':'mensagens'}</span></div>
    ${rfLista('arquivadas', lidas.map(rfEmLinha), 'Nada arquivado ainda. Uma mensagem entra aqui depois de lida.')}
  </div>`;
}

/* `transferWindowStatus()` devolve {open,closesIn} ou {open:false,pre,opensIn} —
   números, não frase. A frase é montada aqui, não lá dentro. */
function rfResenhaJanela(){
  if(typeof transferWindowStatus!=='function') return '—';
  const w=transferWindowStatus()||{};
  const r=n=>n+' semana'+(n===1?'':'s');
  if(w.open) return w.closesIn>0 ? ('aberta · fecha em '+r(w.closesIn)) : 'aberta · fecha nesta semana';
  if(w.opensIn!=null) return (w.pre?'pré-acordos · ':'')+'abre em '+r(w.opensIn);
  return 'fechada';
}

/* "Última sincronização há 3 minutos". Sem carimbo nenhum ainda, diz isso em
   vez de inventar um tempo. */
function rfResenhaDesdeSync(){
  const t=CL._roundSyncedAt||0;
  if(!t) return 'Ainda não sincronizou nesta semana';
  const min=Math.floor((Date.now()-t)/60000);
  if(min<1) return 'Última sincronização agora mesmo';
  if(min<60) return 'Última sincronização há '+min+' minuto'+(min===1?'':'s');
  const h=Math.floor(min/60);
  return 'Última sincronização há '+h+' hora'+(h===1?'':'s');
}

/* ---- cabeçalho da página ---- */
function rfEmSubHTML(){
  const box=rfInbox();
  const n=box.filter(e=>!e.read).length;
  return `${box.length} ${box.length===1?'mensagem':'mensagens'} · ${n} não lida${n===1?'':'s'}`;
}
function rfEmAcoesHTML(){
  return `<div class="rf-mk-acoes">
    <button type="button" class="rf-btn rf-btn-secondary" onclick="rfAcGravar()">${rfIcone('gravar',16)} Gravar</button>
    <button type="button" class="rf-btn rf-btn-cta" onclick="rfEmLerTudo()">${rfIcone('email',16)} Marcar como lidas</button>
  </div>`;
}
function rfEmLerTudo(){
  (CL.inbox||[]).forEach(e=>{ e.read=true; });
  if(typeof toastC==='function') toastC('Tudo marcado como lido.');
  cdraw();
}

/* =====================================================================
   CONFIG · 1 · OPÇÕES
   Duas colunas internas — preferências à esquerda, avisos à direita — e a
   fila da conta ocupando a largura toda embaixo.
   ===================================================================== */
/* campo de leitura com cara de seletor: rótulo em cima, caixa embaixo */
function rfCfCampo(rot, valor, acao){
  return `<label class="rf-cf-campo">
    <span class="rf-cf-campo-l">${escC(rot)}</span>
    <button type="button" class="rf-cf-campo-v" onclick="${acao||'clOptions()'}">
      <span>${escC(valor)}</span><i>▾</i>
    </button>
  </label>`;
}
/* GRAVA NO SAVE, como o resto das preferencias — S.config e' o que vai para o
   disco. O numero na tela acompanha o arraste; a AMOSTRA so' toca ao soltar,
   senao arrastar dispararia um audio por pixel. */
function rfCfVolume(v){
  if(typeof S==='undefined' || !S) return;
  S.config=S.config||{};
  S.config.somVol=Math.max(0,Math.min(1,Number(v)/100));
  const alvo=document.getElementById('rf-cf-vol-v');
  if(alvo) alvo.textContent=Math.round(S.config.somVol*100)+'%';
  /* rfGravar e' o mesmo caminho de gravacao dos outros interruptores desta
     pagina — preferencia que nao sobrevive ao F5 nao e' preferencia. */
  if(typeof rfGravar==='function'){ try{ rfGravar(); }catch(e){} }
}
function rfCfVolumeTeste(){
  if(typeof rfSomTocar==='function') rfSomTocar('fimVitoria', true);
}

function rfCfSwitch(k, rot, padrao){
  const v=(typeof rfPrefDef==='function')?rfPrefDef(k,padrao):!!padrao;
  return `<div class="rf-cf-sw">
    <span class="rf-cf-sw-l">${escC(rot)}</span>
    <button type="button" class="rf-switch ${v?'on':''}" onclick="rfTogglePref('${k}')"
      aria-pressed="${v?'true':'false'}"><i></i></button>
  </div>`;
}
function rfCfOpcoesHTML(){
  const tempo=(typeof tempoLabelAtual==='function')?tempoLabelAtual():'—';
  /* o desenho escreve "Real (R$)", não só o símbolo — RF_MOEDAS já tem o nome */
  const moedaK=CL.currency||'Reais';
  const mo=(typeof RF_MOEDAS!=='undefined')?RF_MOEDAS.find(m=>m.k===moedaK):null;
  const simb=(typeof curSym==='function')?curSym():'R$';
  const moeda=mo?`${mo.t} (${mo.simb})`:simb;
  const hoje=new Date();
  const data=String(hoje.getDate()).padStart(2,'0')+'/'+
    ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][hoje.getMonth()]+
    '/'+(S.season||hoje.getFullYear());
  return `<div class="rf-cf-duo">
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">PREFERÊNCIAS</span></div>
        ${rfCfCampo('Moeda', moeda)}
        ${rfCfCampo('Idioma', 'Português do Brasil')}
        ${rfCfCampo('Velocidade da partida', tempo)}
        ${rfCfCampo('Formato de data', data)}
      </div>
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">AVISOS E SOM</span></div>
        <!-- SAIRAM DAQUI (27/08): "Aviso de proposta recebida", "Aviso de lesao", "Chat da
             Resenha durante o jogo" e "Confirmar antes de gravar". Os quatro gravavam em
             S.config.ui e NINGUEM os lia — o interruptor mudava na tela e o jogo seguia igual.
             Sobra o Som, que e o unico que o motor le (S.config.sound). -->
        ${rfCfSwitch('som','Som da partida',true)}
        <!-- VOLUME: desliza, toca a amostra na hora e grava no save. A amostra
             ignora a trava do Camarote de proposito: aqui o utilizador esta'
             justamente a regular o volume, e exigir que esteja assistindo a uma
             partida para ouvir seria absurdo. -->
        <label class="rf-cf-vol">
          <span class="rf-cf-vol-t">Volume dos sons</span>
          <input type="range" min="0" max="100" step="5" value="${Math.round(rfSomVolume()*100)}"
                 oninput="rfCfVolume(this.value)" onchange="rfCfVolumeTeste()"
                 aria-label="Volume dos sons da partida">
          <b class="rf-cf-vol-v" id="rf-cf-vol-v">${Math.round(rfSomVolume()*100)}%</b>
        </label>
        <p class="rf-cf-nota">Os sons tocam no <b>Modo Camarote</b>: cartão amarelo, pênalti defendido,
          jogador marcando de novo, goleada e o apito final. Solte o controle para ouvir uma amostra.</p>
      </div>
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">CONTA</span></div>
      <div class="rf-cf-fila">
        <button type="button" class="rf-btn rf-btn-cta" onclick="clOptions()">${rfIcone('config',16)} Abrir opções do jogo</button>
        <button type="button" class="rf-btn rf-btn-secondary" onclick="rfAcAbrir('conta-senha',{email:((typeof NET!=='undefined'&&NET.authStatus)?(NET.authStatus().email||''):'')})">Trocar a senha</button>
        <!-- "Sair da conta" saiu daqui: virou a página Sair, a última da barra
             lateral. Aqui ficou só o que é AJUSTE de conta; sair é outra coisa. -->
        <button type="button" class="rf-btn rf-btn-recusar" onclick="rfAcAbrir('conta-apagar',{})">Apagar a conta</button>
      </div>
    </div>`;
}

/* =====================================================================
   CONFIG · 2 · JOGO
   ===================================================================== */
/* `rfCfJogoHTML` foi removida: era a página "Sair do jogo" desenhada uma
   segunda vez dentro de Configurações — SAVE ATUAL repetido, OUTROS SAVES e
   SAIR DO SAVE. O conteúdo que valia mudou-se para a página certa; o resto era
   duplicado, e três dos seus botões chamavam todos o mesmo `rfAcSairSave()`. */
function rfCfBaixarSave(){
  try{
    const a=document.createElement('a');
    a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(S));
    a.download='save-'+((clubOf(CL.clubId)||{short:'rf98'}).short)+'-'+(S.season||'')+'.json'; a.click();
    toastC('Save baixado.');
  }catch(e){ toastC('Não deu pra baixar aqui.'); }
}

/* =====================================================================
   CONFIG · 3 · MODO RESENHA
   Grade dos treinadores: 22 / treinador / clube / 62 / 96
   ===================================================================== */
const RF_CF_SALA_COLS='22px minmax(0,1.1fr) minmax(0,1fr) 62px 96px';
function rfCfResenhaHTML(){
  if(!CL.online) return `<div class="rf-card">
    <div class="rf-label"><span class="rf-label-t">MODO RESENHA</span></div>
    <div class="rf-empty">Você está no <b>Modo Solo</b>.<br>
      <small>O Modo Resenha é o campeonato com a sua turma, todo mundo na mesma semana.</small></div>
  </div>`;
  const room=(typeof NET!=='undefined')?NET.room:null;
  const codigo=(room&&room.code)||(typeof NET!=='undefined'&&NET.code)||'——————';
  const assentos=(typeof rfSalaAssentos==='function')?rfSalaAssentos():[];
  const anfitriao=(typeof NET!=='undefined')&&NET.isHost;
  const pend=(CL.pendingJoins&&CL.pendingJoins.length)||0;
  const estadoDe=a=>{
    if(a.jogou) return {t:'JOGOU', c:'ok'};
    if(a.emPartida) return {t:'EM PARTIDA', c:'ouro'};
    return {t:'NÃO ENTROU', c:'ouro'};
  };
  const linhas=assentos.map(a=>{
    const e=estadoDe(a);
    return `<div class="rf-el-row ${a.eu?'sel':''}">
      ${rfCrest(a.clube||{},22)}
      <span class="rf-cf-tec">${escC(a.nome)}${a.eu?' (você)':''}</span>
      <span class="rf-cf-clu">${escC((a.clube&&a.clube.short)||'—')}</span>
      <span class="rf-cf-rod">${(S.round||0)+1}ª</span>
      <span class="rf-cf-estado ${e.c}">${e.t}</span>
    </div>`;
  }).join('');
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_CF_SALA_COLS}">
    <span></span><span>TREINADOR</span><span>CLUBE</span>
    <span class="dir">RODADA</span><span class="dir">ESTADO</span>
  </div>`;
  return `<div class="rf-card rf-cf-codigo">
      <div class="rf-cf-codigo-id">
        <span class="rf-label-t">CÓDIGO DA SALA</span>
        <span class="rf-cf-codigo-v">${escC(codigo)}</span>
      </div>
      <div class="rf-sp"></div>
      <div class="rf-cf-fila">
        <button type="button" class="rf-btn rf-btn-secondary" onclick="clInviteResenha()">${rfIcone('copiar',16)} Copiar convite</button>
        <button type="button" class="rf-btn rf-btn-cta" onclick="rfChatToggle()">${rfIcone('chat',16)} Abrir o chat</button>
      </div>
    </div>
    <div class="rf-card rf-el-tbl" data-el="sala" style="--el-cols:${RF_CF_SALA_COLS}">
      <div class="rf-label"><span class="rf-label-t">TREINADORES</span>
        <span class="rf-label-r">${assentos.length} na sala</span></div>
      ${cab}
      ${linhas || '<div class="rf-empty">Ninguém mais na sala ainda.</div>'}
    </div>
    <div class="rf-cf-duo">
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">REGRAS DA SALA</span></div>
        <div class="rf-cf-reg"><span>Ritmo</span><b>${escC(typeof tempoLabelAtual==='function'?tempoLabelAtual():'—')}</b></div>
        <!-- o pacote pede "Janela de mercado" nesta linha; a divisão fica logo
             abaixo porque numa sala ela é informação que ninguém deduz -->
        <div class="rf-cf-reg"><span>Janela de mercado</span><b>${escC(rfResenhaJanela())}</b></div>
        <div class="rf-cf-reg"><span>Divisão</span><b>${escC(divisionLabel())}</b></div>
        <div class="rf-cf-reg"><span>Quem pode entrar</span><b>só por convite</b></div>
        <div class="rf-cf-reg"><span>Anfitrião</span><b>${anfitriao?escC(rfTreinadorNome()):'outro treinador'}</b></div>
      </div>
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">SINCRONIZAÇÃO</span></div>
        <div class="rf-cf-sinc-top">
          <!-- o código já está impresso em letras grandes no cartão de cima;
               aqui o pacote diz há quanto tempo foi a última sincronização -->
          <span class="rf-cf-sinc-t">${escC(rfResenhaDesdeSync())}</span>
          <span class="rf-cf-sinc-v">em dia</span>
        </div>
        <div class="rf-cf-sinc-barra"><i style="width:100%"></i></div>
        <div class="rf-cf-fila">
          ${anfitriao?`<button type="button" class="rf-btn rf-btn-secondary"
            onclick="clJoinRequestsPanel()">${rfIcone('aprovar',16)} Aprovar entradas${pend?' ('+pend+')':''}</button>`:''}
          <button type="button" class="rf-btn rf-btn-secondary" onclick="rfAcSincronizar()">${rfIcone('sincronizar',16)} Sincronizar agora</button>
          <button type="button" class="rf-btn rf-btn-recusar" onclick="rfAcSairSala()">Sair da sala</button>
        </div>
      </div>
    </div>
    ${rfResenhaChatHTML()}`;
}

/* CHAT DA SALA — o pacote põe um cartão de chat nesta página, e o jogo só tinha
   a bolha flutuante. As mensagens são as mesmas (`chatMsgsHTML`), então isto é
   uma segunda porta para o mesmo chat, não um chat paralelo: escrever aqui
   passa pelo mesmo `rfChatEnviar`, e o campo tem id próprio para os dois não
   disputarem o mesmo `#rf-chat-in`. */
function rfResenhaChatHTML(){
  if(!CL.online || typeof chatMsgsHTML!=='function') return '';
  let msgs=''; try{ msgs=chatMsgsHTML()||''; }catch(e){ msgs=''; }
  const n=((typeof NET!=='undefined'&&NET.chat&&NET.chat.length)||0);
  return `<div class="rf-card rf-cf-chat">
    <div class="rf-label"><span class="rf-label-t">CHAT DA SALA</span>
      <span class="rf-label-r">${n} mensage${n===1?'m':'ns'}</span></div>
    <div class="rf-chat-msgs rf-cf-chat-msgs" id="rf-cf-chat-msgs">${
      msgs || '<span class="rf-note">Ninguém falou nada ainda.</span>'}</div>
    <div class="rf-chat-in">
      <input id="rf-cf-chat-in" class="rf-chat-input" placeholder="Manda a braba"
        onkeydown="if(event.key==='Enter')rfChatEnviar('rf-cf-chat-in')">
      <button type="button" class="rf-chat-send" onclick="rfChatEnviar('rf-cf-chat-in')" aria-label="Enviar">➤</button>
    </div>
  </div>`;
}

/* ---- cabeçalho da página ---- */
function rfCfSubHTML(){
  const t=CL._lastSaveAt?new Date(CL._lastSaveAt):null;
  const quando=t?('Save gravado às '+String(t.getHours()).padStart(2,'0')+'h'+String(t.getMinutes()).padStart(2,'0'))
    :'Gravação automática ligada';
  const room=(typeof NET!=='undefined')?NET.room:null;
  const codigo=(room&&room.code)||null;
  return quando + (CL.online&&codigo? (' · sala '+codigo+' em dia') : ' · Modo Solo');
}
function rfCfAcoesHTML(){
  return `<div class="rf-mk-acoes">
    <button type="button" class="rf-btn rf-btn-secondary" onclick="rfGo('hub')">${rfIcone('voltar',16)} Voltar ao hub</button>
    <button type="button" class="rf-btn rf-btn-cta" onclick="rfAcGravar()">${rfIcone('gravar',16)} Gravar agora</button>
  </div>`;
}

/* =====================================================================
   AS AÇÕES DE SISTEMA E CONTA
   Cada uma junta o dado que o diálogo mostra e abre o envelope. Nenhuma
   chama mais dlg()/overlayC — quem desenha é rfAcao().
   ===================================================================== */
/* O CÓDIGO DA SALA TINHA DUAS FONTES. O cartão da página lia `NET.room.code` e
   o subtítulo lia `S.room`/`CL.roomCode` — que no Resenha ficam vazios. Dava a
   tela a dizer "Sala —" com o código impresso em letras grandes logo abaixo.
   Uma função só, que tenta as três pela ordem em que são preenchidas. */
function rfAcSala(){
  const net=(typeof NET!=='undefined')?NET:null;
  return (net&&net.room&&net.room.code)||(net&&net.code)
      ||(S&&S.room&&(S.room.code||S.room.id))||(CL.roomCode)||'—';
}
function rfAcGravar(){
  rfGravar();
  const t=CL._lastSaveAt?new Date(CL._lastSaveAt):new Date();
  rfAcAbrir('sys-gravado', {quando:'às '+String(t.getHours()).padStart(2,'0')+'h'+String(t.getMinutes()).padStart(2,'0')});
}
function rfAcSairSave(){
  const cl=clubOf(CL.clubId)||{short:'—'};
  rfAcAbrir('sys-sair-save', {clube:cl.short, rodada:((S.round||0)+1)+'ª de '+((S.sched||[]).length||'—')});
}
function rfAcApagarSave(){
  const cl=clubOf(CL.clubId)||{short:'—'};
  rfAcAbrir('sys-apagar-save', {clube:cl.short});
}
function rfAcSairSala(){
  rfAcAbrir('sys-sair-sala', {sala:rfAcSala(), n:(S.seats&&S.seats.length)||(CL.humans?Object.keys(CL.humans).length:'—')});
}
function rfAcSincronizar(){
  const assentos=(S.seats&&S.seats.length)||(CL.humans?Object.keys(CL.humans).length:0);
  const prontos=(typeof seatsDone==='function')?seatsDone():Math.max(0,assentos-1);
  rfAcAbrir('sys-sincronizar', {sala:rfAcSala(), prontos, total:assentos});
}

/* =====================================================================
   PÁGINA · MODO RESENHA  (era a terceira aba de Configurações)
   ===================================================================== */
function rfResenhaSubHTML(){
  if(!CL.online) return 'Você está no Modo Solo';
  const sala=(typeof rfAcSala==='function')?rfAcSala():'—';
  const n=(S.seats&&S.seats.length)||(CL.humans?Object.keys(CL.humans).length:0);
  // "Sala 7KP2M · 4 treinadores · 9ª semana" — a rodada faltava
  return `Sala ${escC(sala)} · ${n} treinador${n===1?'':'es'} · ${(S.round||0)+1}ª semana`;
}

/* as duas ações do cabeçalho da página, como no pacote: sincronizar e convidar */
function rfResenhaAcoesHTML(){
  if(!CL.online) return '';
  return `<div class="rf-mk-acoes">
    <button type="button" class="rf-btn rf-btn-secondary" onclick="clInviteResenha()">${rfIcone('copiar',16)} Copiar convite</button>
    <button type="button" class="rf-btn rf-btn-cta" onclick="rfAcSincronizar()">${rfIcone('sincronizar',16)} Sincronizar</button>
  </div>`;
}

/* =====================================================================
   PÁGINA · SAIR  (era o botão "Sair da conta" no pé da aba Opções, que
   abria o modal "Sair deste save?")
   O modal servia para uma decisão de UM clique. Aqui há TRÊS saídas
   diferentes — largar o save, trocar de conta, e (na resenha) deixar a
   sala — e cada uma perde ou guarda coisas distintas. Numa página cabe
   dizer isso antes do clique, o que um modal de 460px não comportava.
   ===================================================================== */
function rfSairSubHTML(){
  const t=CL._lastSaveAt?new Date(CL._lastSaveAt):null;
  return t?('Save gravado '+rfSaveQuando({updated_at:t.toISOString()})):'Nada é perdido ao sair';
}
/* OUTROS SAVES ESTAVA NA PÁGINA ERRADA.
   O pacote desenha esta lista na tela de "Sair do jogo", que é onde o jogador
   a procura — e a própria tela prometia que o save "volta a aparecer na lista
   de saves" sem mostrar lista nenhuma. Ela vivia escondida numa aba "Jogo" de
   Configurações, junto com um SAVE ATUAL duplicado do que já estava aqui.

   E os botões não faziam o que diziam: "Abrir" (de cada save), "Voltar aos
   saves" e "Começar outro save" chamavam TODOS o mesmo `rfAcSairSave()` — abrir
   um save específico não o abria, só oferecia sair do atual. Agora "Abrir"
   carrega aquele save pelo `clLoadSave`, que é quem sabe fazê-lo. */
function rfSairOutrosSavesHTML(){
  const atual=CL.save||null;
  const saves=(CL.soloSaves||[]).filter(sv=>sv && sv.name!==atual);
  const carregando=CL.soloSaves==null;
  return `<div class="rf-card">
    <div class="rf-label"><span class="rf-label-t">OUTROS SAVES</span>
      <span class="rf-label-r">${carregando?'procurando':saves.length+' na nuvem'}</span></div>
    ${carregando ? '<div class="rf-empty">Procurando os seus saves na nuvem.</div>'
      : (saves.length
        ? saves.slice(0,8).map(sv=>{
            const c=anyClubOf(sv.clubId)||{short:sv.name||'—'};
            return `<div class="rf-cf-save-lin">
              ${rfCrest(c,24)}
              <span class="rf-cf-save-ln">${escC(sv.name||c.short||'—')}</span>
              <span class="rf-cf-save-lv">${escC((typeof rfSaveQuando==='function')?rfSaveQuando(sv):'')}</span>
              <button type="button" class="rf-btn rf-btn-secondary rf-btn-mini"
                onclick="clLoadSave('${escC(sv.name)}')">Abrir</button>
            </div>`; }).join('')
        : '<div class="rf-empty">Este é o seu único save na nuvem.</div>')}
  </div>`;
}
function rfSairHTML(){
  const cl=clubOf(CL.clubId)||{short:'—'};
  const jornada=((S&&S.round)||0)+1;
  const total=(S&&S.sched&&S.sched.length)||'—';
  const naSala=!!CL.online;
  return `
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">SAVE ATUAL</span></div>
      <div class="rf-sair-save">
        <span class="rf-sair-crest">${rfCrest(cl,34)}</span>
        <span class="rf-sair-id">
          <span class="rf-sair-n">${escC(cl.short||'—')}</span>
          <span class="rf-sair-s">${escC((typeof divisionLabel==='function'&&S)?divisionLabel():'')} · ${jornada}ª de ${total}</span>
        </span>
      </div>
      <span class="rf-note">O save é gravado antes de sair e volta a aparecer na lista abaixo. Nada se perde.</span>
      <div class="rf-cf-fila">
        <button type="button" class="rf-btn rf-btn-cta" onclick="rfAcSairSave()">${rfIcone('salvar',16)} Gravar e sair do save</button>
        <button type="button" class="rf-btn rf-btn-secondary" onclick="clSoloNew()">Começar outro save</button>
        <button type="button" class="rf-btn rf-btn-secondary" onclick="rfCfBaixarSave()">${rfIcone('baixar',16)} Baixar o save</button>
      </div>
    </div>

    ${rfSairOutrosSavesHTML()}

    ${naSala?`<div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">SALA DA RESENHA</span></div>
      <span class="rf-note">Sair da sala não apaga o seu save — mas o seu clube fica sem treinador nas próximas semanas.</span>
      <div class="rf-cf-fila">
        <button type="button" class="rf-btn rf-btn-secondary" onclick="rfAcSairSala()">${rfIcone('sair',16)} Sair da sala</button>
      </div>
    </div>`:''}

    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">CONTA</span></div>
      <span class="rf-note">Os seus saves ficam na nuvem. Entrando de novo com a mesma conta, eles voltam.</span>
      <div class="rf-cf-fila">
        <button type="button" class="rf-btn rf-btn-secondary" onclick="rfAcSairConta()">${rfIcone('sair',16)} Sair da conta</button>
        <button type="button" class="rf-btn rf-btn-recusar" onclick="rfAcApagarSave()">Apagar este save</button>
      </div>
    </div>`;
}

/* =====================================================================
   OS BOTÕES DE CONFIRMAR QUE NÃO CONFIRMAVAM NADA

   `rfAcao` desenha cada ação com `onclick="${a.on||'rfAcFechar()'}"` — uma ação
   sem `on:` apenas FECHA o diálogo. Doze diálogos estavam assim, e sete deles
   têm um botão que devia agir: gravar e sair, apagar o save, encerrar a
   carreira, sair da resenha, arquivar e responder e-mail, pular a espera.
   Clicar em qualquer um deles não fazia absolutamente nada — e nada avisava.

   As cinco restantes ("Continuar", "Entendi", "Fechar") são informativas e
   fechar É o que elas devem fazer; essas ficam como estão.
   ===================================================================== */

/* Gravar e sair: guarda local e nuvem, larga o save e volta à abertura. A conta
   continua ligada — quem quer sair da conta usa o outro caminho. */
async function rfSairSaveGo(){
  rfAcFechar();
  try{ if(typeof rfGravar==='function') rfGravar(); }catch(e){}
  CL.online=false; CL.live=null; CL.screen='abertura'; CL.landingView='home';
  cdraw();
  toastC('Jogo gravado. Até a próxima.','success');
}

/* Apagar o save: o diálogo pede o nome do clube escrito à mão, e é essa a
   trava — sem ela seria um clique a separar o jogador de perder a carreira. */
function rfApagarSaveGo(){
  const campo=document.querySelector('#rf-ac-conf');
  const escrito=((campo&&campo.value)||'').trim().toLowerCase();
  const clube=((clubOf(CL.clubId)||{}).short||'').trim().toLowerCase();
  if(!escrito || escrito!==clube){
    toastC('Escreva o nome do clube exatamente como está no campo para confirmar.');
    return;
  }
  const nome=CL.save||CL.mgr||'SAVE';
  rfAcFechar();
  try{ if(typeof wipe==='function') wipe(); }catch(e){}
  if(typeof clDeleteSaveGo==='function'){ clDeleteSaveGo(nome); }
  CL.online=false; CL.live=null; CL.screen='abertura'; CL.landingView='home';
  cdraw();
}

/* Encerrar a carreira: o diálogo promete que "não apaga nada — o histórico
   continua na sala de troféus", então é exatamente isso que faz. Carimba o
   fim no save, grava, e devolve à abertura. O save continua na lista, para
   consulta, como está escrito. */
function rfEncerrarCarreiraGo(){
  rfAcFechar();
  S.careerClosed={ season:S.season, round:S.round, at:Date.now(),
    clubId:CL.clubId, mgr:(typeof rfTreinadorNome==='function')?rfTreinadorNome():CL.mgr };
  S.roundNews=S.roundNews||[];
  S.roundNews.push('🎓 Carreira encerrada em '+(S.season||'')+'.');
  try{ if(typeof rfGravar==='function') rfGravar(); }catch(e){}
  CL.online=false; CL.live=null; CL.screen='abertura'; CL.landingView='home';
  cdraw();
  toastC('Carreira encerrada. O histórico fica guardado no save.','success');
}

/* Sair da resenha: reaproveita o caminho que já existia no menu de salas
   (clDeleteRoomGo), que é quem fala com o servidor. */
function rfSairSalaGo(){
  rfAcFechar();
  const code=(typeof rfAcSala==='function')?rfAcSala():null;
  const anfitriao=(typeof NET!=='undefined')&&NET.isHost;
  if(!code || code==='—' || typeof clDeleteRoomGo!=='function'){
    toastC('Não foi possível identificar a sala.'); return;
  }
  clDeleteRoomGo(code, !!anfitriao);
  CL.online=false; CL.live=null; CL.screen='abertura'; CL.landingView='home';
  cdraw();
}

/* Arquivar: neste jogo "arquivadas" são as JÁ LIDAS (ver a nota no topo do
   ficheiro) — o motor não tem pasta de arquivo. Arquivar é marcar como lida,
   e é isso que tira a mensagem da caixa de entrada. */
function rfMailArquivarGo(key){
  const e=(CL.inbox||[]).find(x=>x.key===key);
  if(!e){ toastC('Essa mensagem não está mais na caixa.'); rfAcFechar(); return; }
  e.read=true;
  if(typeof saveInbox==='function') saveInbox();
  rfAcFechar();
  toastC('Mensagem arquivada.');
}

/* ===== A COLETIVA MEXE NO JOGO =====
   Aplica a fala escolhida: moral de TODO o elenco e segurança no cargo. Uma vez por prêmio —
   o botão "Responder" continua lá depois, e sem esta trava dava para reabrir e somar moral
   sem limite. O que aconteceu fica escrito no e-mail e nas notícias da rodada. */
function rfImprensaGo(key){
  const e=(CL.inbox||[]).find(x=>x.key===key);
  if(e && e.reply){ toastC('Você já falou sobre esta premiação.'); rfAcFechar(); return; }
  const d=(typeof rfAcD==='function')?rfAcD():{};
  const i=(d.resp!=null)?d.resp:0;
  const f=(typeof RF_IMPRENSA!=='undefined' && RF_IMPRENSA[i])||null;
  if(!f){ toastC('Escolha o que dizer.'); return; }
  const lim=(v)=>Math.max(0,Math.min(100,v));
  let n=0;
  try{ (squad(CL.clubId)||[]).forEach(p=>{ p.moral=lim((p.moral==null?70:p.moral)+f.moral); n++; }); }catch(err){ console.warn('moral:', err&&err.message); }
  S.jobSecurity=lim((S.jobSecurity==null?60:S.jobSecurity)+f.cargo);
  if(e){ e.reply={ opcao:f.t, nota:'', at:Date.now() }; e.read=true; if(typeof saveInbox==='function') saveInbox(); }
  S.roundNews=S.roundNews||[];
  S.roundNews.push('🎙️ Na coletiva da premiação, você '+f.fala+'. '
    + (f.moral>=0?('Moral do elenco +'+f.moral):('Moral do elenco '+f.moral))
    + ' · segurança no cargo '+(f.cargo>=0?'+':'')+f.cargo+' (agora '+S.jobSecurity+'/100).');
  try{ if(typeof rfGravar==='function') rfGravar(); else if(typeof save==='function') save(); }catch(err){}
  rfAcFechar();
  toastC('Coletiva dada — moral '+(f.moral>=0?'+':'')+f.moral+' em '+n+' jogadores, cargo '+(f.cargo>=0?'+':'')+f.cargo+'.');
}
/* ===== RESPONDER A UM E-MAIL MEXE NO JOGO =====
   A resposta antiga lia o texto do botão selecionado no DOM, guardava-o no
   e-mail e acabava aí: escolher "Assumo a meta" ou "Discordo da meta" dava
   exactamente no mesmo. Aqui a opção vem da TABELA do tipo daquela mensagem
   (RF_EMAIL_RESP), e o que ela promete é o que acontece: moral de todo o
   elenco, segurança no cargo e reputação do treinador — os mesmos três números
   da coletiva de imprensa, aplicados com os mesmos tetos.
   Uma vez por mensagem: o botão continua lá depois (para reler o que se disse),
   e sem esta trava dava para reabrir e somar moral sem limite. */
function rfMailResponderGo(key){
  const e=(CL.inbox||[]).find(x=>x.key===key);
  if(!e){ toastC('Essa mensagem não está mais na caixa.'); rfAcFechar(); return; }
  if(e.reply){ toastC('Você já respondeu a esta mensagem.'); rfAcFechar(); return; }
  const def=RF_EMAIL_RESP[rfEmailTipo(e)];
  if(!def){ rfAcFechar(); return; }
  const d=(typeof rfAcD==='function')?rfAcD():{};
  const i=(d.resp!=null)?d.resp:0;
  const o=def.ops[i];
  if(!o){ toastC('Escolha o que responder.'); return; }

  const lim=(v,a,b)=>Math.max(a,Math.min(b,v));
  const dMoral=o.m||0, dCargo=o.c||0, dRep=o.r||0;
  let n=0;
  if(dMoral){
    try{ (squad(CL.clubId)||[]).forEach(p=>{ p.moral=lim((p.moral==null?70:p.moral)+dMoral,0,100); n++; }); }
    catch(err){ console.warn('moral:', err&&err.message); }
    /* na Resenha a moral só sobrevive se for publicada: aplicar no cliente seria
       desfeito na adoção da rodada seguinte (mesma regra da coletiva). */
    if(CL.online) S._netMorale=(S._netMorale||0)+dMoral;
  }
  if(dCargo) S.jobSecurity=lim((S.jobSecurity==null?60:S.jobSecurity)+dCargo,0,100);
  if(dRep)   S.coachRep   =lim((S.coachRep==null?50:S.coachRep)+dRep,0,100);
  if(o.efeito==='recusarConvite') rfEmailRecusarConvite(e);

  const partes=[];
  if(dMoral) partes.push('moral do elenco '+(dMoral>0?'+':'')+dMoral);
  if(dCargo) partes.push('cargo '+(dCargo>0?'+':'')+dCargo+' (agora '+S.jobSecurity+'/100)');
  if(dRep)   partes.push('reputação '+(dRep>0?'+':'')+dRep+' (agora '+S.coachRep+'/100)');
  const efeitoTxt=partes.length?partes.join(' · '):'sem efeito';

  const txt=document.querySelector('#rf-ac-msg');
  e.reply={ opcao:o.t, nota:((txt&&txt.value)||'').slice(0,140), at:Date.now(), efeitoTxt };
  e.read=true;
  if(typeof saveInbox==='function') saveInbox();

  S.roundNews=S.roundNews||[];
  S.roundNews.push('✉️ '+(o.fala?('Você '+o.fala):('Você respondeu a "'+(e.subject||'')+'"'))
    + (partes.length?(' — '+efeitoTxt+'.'):'.'));
  try{ if(typeof persistCareer==='function') persistCareer(); }catch(err){}
  try{ if(typeof rfGravar==='function') rfGravar(); else if(typeof saveV3==='function') saveV3(); }catch(err){}
  rfAcFechar();
  toastC(partes.length?('Resposta enviada — '+efeitoTxt+'.'):'Resposta enviada.');
}
/* "Não vou conversar" TIRA O CONVITE DA MESA — senão o treinador recusava em
   público e a proposta continuava a piscar em Treinador · Ofertas. Tirado o
   convite, o próprio syncInbox faz a faxina do e-mail (ver a lista `vivos`). */
function rfEmailRecusarConvite(e){
  const dd=e.dados||{};
  if(String(e.key||'').indexOf('rjob-')===0){ CL._pendingResenhaOffer=null; return true; }
  const arr=S.pendingJobOffers||[];
  const i=arr.findIndex(o=>String(o.clubId)===String(dd.clubeId));
  if(i>=0){ arr.splice(i,1); return true; }
  return false;
}

/* Pular a espera: é o mesmo "aguardar mais um pouco" do painel da sala — adia
   a consulta e devolve o jogador à tela, em vez de o prender no diálogo. */
function rfPularEsperaGo(){
  rfAcFechar();
  if(typeof clWaitMore==='function') clWaitMore();
  else { CL._waitSnoozeUntil=Date.now()+10000; cdraw(); }
  toastC('Seguindo. A semana fecha assim que todos jogarem.');
}

/* Trocar a senha: manda o link de recuperação para o e-mail da conta — o
   mesmo caminho do "esqueci a senha" do login, que é o único que o adaptador
   suporta (netUpdatePassword só vale dentro da sessão temporária do link). */
function rfTrocarSenhaGo(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  const email=(st&&st.email)||'';
  if(!email){ toastC('Entre na conta primeiro.'); rfAcFechar(); return; }
  rfAcFechar();
  CL._resetEmail=email;
  if(typeof clSendResetLink==='function') clSendResetLink();
  else toastC('Não foi possível enviar o link agora.');
}

/* grava o que dá, encerra a sessão e volta para a abertura */
async function rfSairContaGo(){
  rfAcFechar();
  try{ if(typeof rfGravar==='function') rfGravar(); }catch(e){}
  try{ if(typeof netAuthSignOut==='function') await netAuthSignOut(); }catch(e){}
  CL.soloSaves=null; CL.online=false; CL.net=null;
  CL.screen='abertura'; cdraw();
  toastC('Você saiu da conta.','success');
}
function rfAcSairConta(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  rfAcAbrir('conta-sair',{email:st.email||''});
}
