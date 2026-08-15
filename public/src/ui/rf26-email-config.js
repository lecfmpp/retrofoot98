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
       onclick="clInboxOpen('${escC(e.key)}')">
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

/* A LEITURA: assunto em serifa, bloco do remetente com escudo, corpo, e a
   fila de botões separada por filete. */
function rfEmLeituraHTML(){
  const box=rfInbox();
  const e=CL.inboxOpen? box.find(x=>x.key===CL.inboxOpen) : box[0];
  if(!e) return `<div class="rf-card">
    <div class="rf-label"><span class="rf-label-t">MENSAGEM ABERTA</span></div>
    <div class="rf-empty">Escolha um e-mail na lista ao lado.</div></div>`;
  const cl=clubOf(CL.clubId)||{short:'—'};
  const de=e.from||('Diretoria do '+(cl.short||''));
  return `<div class="rf-card">
    <div class="rf-label"><span class="rf-label-t">MENSAGEM ABERTA</span>
      <span class="rf-label-r">${escC(String(e.from||'').split('·')[0].trim()||'—')} · ${escC(rfQuandoHTML(e))}</span></div>
    <div class="rf-ml">
      <span class="rf-ml-subj">${escC(e.subject||'')}</span>
      <div class="rf-ml-de">
        ${rfCrest(cl,30)}
        <span class="rf-ml-de-id">
          <span class="rf-ml-de-n">${escC(de)}</span>
          <span class="rf-ml-de-s">para ${escC(rfTreinadorNome())} · ${escC(rfQuandoHTML(e))}</span>
        </span>
      </div>
      <div class="rf-ml-corpo">${e.body||''}</div>
      <div class="rf-ml-acts">
        <button type="button" class="rf-btn rf-btn-secondary"
          onclick="rfAcAbrir('mail-arquivar',{key:'${escC(e.key)}',assunto:'${escC(e.subject||'')}'})">Arquivar</button>
        <button type="button" class="rf-btn rf-btn-cta"
          onclick="rfAcAbrir('mail-responder',{key:'${escC(e.key)}',assunto:'${escC(e.subject||'')}'})">Responder</button>
      </div>
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
function rfCfSwitch(k, rot, padrao){
  const v=(CL.options&&CL.options[k]!=null)?!!CL.options[k]:!!padrao;
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
        ${rfCfSwitch('som','Som da partida',true)}
        ${rfCfSwitch('avisoOfertas','Aviso de proposta recebida',true)}
        ${rfCfSwitch('avisoLesao','Aviso de lesão',true)}
        ${rfCfSwitch('chatNaPartida','Chat da Resenha durante o jogo',false)}
        ${rfCfSwitch('confirmarGravar','Confirmar antes de gravar',false)}
      </div>
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">CONTA</span></div>
      <div class="rf-cf-fila">
        <button type="button" class="rf-btn rf-btn-cta" onclick="clOptions()">${rfIcone('config',16)} Abrir opções do jogo</button>
        <button type="button" class="rf-btn rf-btn-secondary" onclick="rfAcAbrir('conta-senha',{})">Trocar a senha</button>
        <!-- "Sair da conta" saiu daqui: virou a página Sair, a última da barra
             lateral. Aqui ficou só o que é AJUSTE de conta; sair é outra coisa. -->
        <button type="button" class="rf-btn rf-btn-recusar" onclick="rfAcAbrir('conta-apagar',{})">Apagar a conta</button>
      </div>
    </div>`;
}

/* =====================================================================
   CONFIG · 2 · JOGO
   ===================================================================== */
function rfCfJogoHTML(){
  const cl=clubOf(CL.clubId)||{short:'—'};
  const t=CL._lastSaveAt?new Date(CL._lastSaveAt):null;
  const saves=(CL.soloSaves||[]).slice()
    .sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
  const quando=t
    ? ('GRAVADO ÀS '+String(t.getHours()).padStart(2,'0')+'H'+String(t.getMinutes()).padStart(2,'0'))
    : 'GRAVAÇÃO AUTOMÁTICA';
  /* TEMPO DE JOGO e GRAVAÇÕES o motor não conta — o save guarda a jornada,
     não o relógio da sessão nem quantas vezes gravou. Entram como traço. */
  return `<div class="rf-cf-duo">
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">SAVE ATUAL</span></div>
        <div class="rf-cf-save">
          ${rfCrest(cl,40)}
          <span class="rf-cf-save-id">
            <span class="rf-cf-save-n">${escC(cl.short)} · ${escC(divisionLabel())} ${escC(String(S.season||''))}</span>
            <span class="rf-cf-save-s">${(S.round||0)+1}ª JORNADA · ${escC(quando)}</span>
          </span>
        </div>
        <div class="rf-el-stats dois">
          ${rfElStat('JORNADAS JOGADAS', S.round||0)}
          ${rfElStat('TEMPO DE JOGO', '—')}
          ${rfElStat('GRAVAÇÕES', '—')}
          ${rfElStat('NA NUVEM', CL.save?'sim':'não')}
        </div>
        <div class="rf-cf-fila comfilete">
          <button type="button" class="rf-btn rf-btn-cta" onclick="rfAcGravar()">${rfIcone('gravar',16)} Gravar agora</button>
          <button type="button" class="rf-btn rf-btn-secondary" onclick="rfCfBaixarSave()">${rfIcone('baixar',16)} Baixar o save</button>
        </div>
      </div>
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">OUTROS SAVES</span>
          <span class="rf-label-r">${saves.length} na nuvem</span></div>
        ${saves.length
          ? saves.slice(0,8).map(sv=>{
              const c=anyClubOf(sv.clubId)||{short:sv.name||'—'};
              return `<div class="rf-cf-save-lin">
                ${rfCrest(c,24)}
                <span class="rf-cf-save-ln">${escC(sv.name||c.short||'—')}</span>
                <span class="rf-cf-save-lv">${escC((typeof rfSaveQuando==='function')?rfSaveQuando(sv):'')}</span>
                <button type="button" class="rf-btn rf-btn-secondary rf-btn-mini"
                  onclick="rfAcSairSave()">Abrir</button>
              </div>`; }).join('')
          : '<div class="rf-empty">Nenhum outro save na nuvem.</div>'}
      </div>
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">SAIR DO SAVE</span></div>
      <span class="rf-cf-texto">Sair grava a temporada no ponto atual. Você volta para a escolha de
        save e nada é perdido.</span>
      <div class="rf-cf-fila">
        <button type="button" class="rf-btn rf-btn-secondary" onclick="rfAcSairSave()">${rfIcone('voltar',16)} Voltar aos saves</button>
        <button type="button" class="rf-btn rf-btn-secondary" onclick="rfAcSairSave()">Começar outro save</button>
        <button type="button" class="rf-btn rf-btn-recusar" onclick="rfAcApagarSave()">Apagar este save</button>
      </div>
    </div>`;
}
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
      <small>O Modo Resenha é o campeonato com a sua turma, todo mundo na mesma rodada.</small></div>
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
    <div class="rf-card rf-el-tbl" style="--el-cols:${RF_CF_SALA_COLS}">
      <div class="rf-label"><span class="rf-label-t">TREINADORES</span>
        <span class="rf-label-r">${assentos.length} na sala</span></div>
      ${cab}
      ${linhas || '<div class="rf-empty">Ninguém mais na sala ainda.</div>'}
    </div>
    <div class="rf-cf-duo">
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">REGRAS DA SALA</span></div>
        <div class="rf-cf-reg"><span>Ritmo</span><b>${escC(typeof tempoLabelAtual==='function'?tempoLabelAtual():'—')}</b></div>
        <div class="rf-cf-reg"><span>Divisão</span><b>${escC(divisionLabel())}</b></div>
        <div class="rf-cf-reg"><span>Quem pode entrar</span><b>só por convite</b></div>
        <div class="rf-cf-reg"><span>Anfitrião</span><b>${anfitriao?escC(rfTreinadorNome()):'outro treinador'}</b></div>
      </div>
      <div class="rf-card">
        <div class="rf-label"><span class="rf-label-t">SINCRONIZAÇÃO</span></div>
        <div class="rf-cf-sinc-top">
          <span class="rf-cf-sinc-t">Sala ${escC(codigo)}</span>
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
function rfAcSala(){ return (S.room&&(S.room.code||S.room.id))||(CL.roomCode||'—'); }
function rfAcGravar(){
  if(typeof saveV3==='function'){ try{ saveV3(); }catch(e){} }
  const t=CL._lastSaveAt?new Date(CL._lastSaveAt):new Date();
  rfAcAbrir('sys-gravado', {quando:'às '+String(t.getHours()).padStart(2,'0')+'h'+String(t.getMinutes()).padStart(2,'0')});
}
function rfAcSairSave(){
  const cl=clubOf(CL.clubId)||{short:'—'};
  rfAcAbrir('sys-sair-save', {clube:cl.short, jornada:((S.round||0)+1)+'ª de '+((S.sched||[]).length||'—')});
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
  return `Sala ${escC(sala)} · ${n} treinador${n===1?'':'es'}`;
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
      <span class="rf-note">O save é gravado antes de sair e volta a aparecer na lista de saves. Nada se perde.</span>
      <div class="rf-cf-fila">
        <button type="button" class="rf-btn rf-btn-cta" onclick="rfAcSairSave()">${rfIcone('salvar',16)} Gravar e sair do save</button>
        <button type="button" class="rf-btn rf-btn-secondary" onclick="clSoloNew()">Começar outro save</button>
      </div>
    </div>

    ${naSala?`<div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">SALA DA RESENHA</span></div>
      <span class="rf-note">Sair da sala não apaga o seu save — mas o seu clube fica sem treinador nas próximas rodadas.</span>
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

/* grava o que dá, encerra a sessão e volta para a abertura */
async function rfSairContaGo(){
  rfAcFechar();
  try{ if(typeof clSaveGame==='function') await clSaveGame(); }catch(e){}
  try{ if(typeof netAuthSignOut==='function') await netAuthSignOut(); }catch(e){}
  CL.soloSaves=null; CL.online=false; CL.net=null;
  CL.screen='abertura'; cdraw();
  toastC('Você saiu da conta.','success');
}
function rfAcSairConta(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  rfAcAbrir('conta-sair',{email:st.email||''});
}
