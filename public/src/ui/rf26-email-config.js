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
      ${todas.length
        ? todas.slice(0,30).map(rfEmLinha).join('')
        : '<div class="rf-empty">Caixa de entrada vazia.</div>'}
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
    <span class="rf-mail-i">${(typeof inboxIcon==='function'?inboxIcon(e.kind):'✉️')}</span>
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
    ${lidas.length
      ? lidas.slice(0,60).map(rfEmLinha).join('')
      : '<div class="rf-empty">Nada arquivado ainda. Uma mensagem entra aqui depois de lida.</div>'}
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
    <button type="button" class="rf-btn rf-btn-secondary" onclick="rfAcGravar()">💾 Gravar</button>
    <button type="button" class="rf-btn rf-btn-cta" onclick="rfEmLerTudo()">✉️ Marcar como lidas</button>
  </div>`;
}
function rfEmLerTudo(){
  (CL.inbox||[]).forEach(e=>{ e.read=true; });
  if(typeof toastC==='function') toastC('Tudo marcado como lido.');
  cdraw();
}

/* =====================================================================
   CONFIG · 1 · OPÇÕES
   ===================================================================== */
function rfCfOpcoesHTML(){
  const tempo=(typeof tempoLabelAtual==='function')?tempoLabelAtual():'—';
  const moeda=(typeof curSym==='function')?curSym():'R$';
  const opt=(k,d)=>!!(CL.options&&CL.options[k])===!!d;
  const sw=(k,rot,desc,padrao)=>`<div class="rf-cf-lin">
    <span class="rf-cf-id"><span class="rf-cf-l">${escC(rot)}</span>
      <span class="rf-cf-d">${escC(desc)}</span></span>
    <button type="button" class="rf-switch ${opt(k,true)||(CL.options&&CL.options[k]==null&&padrao)?'on':''}"
      onclick="rfTogglePref('${k}')" aria-pressed="${opt(k,true)?'true':'false'}"><i></i></button>
  </div>`;
  return rfCol(
    rfCard('Preferências', `
      <div class="rf-cf-lin">
        <span class="rf-cf-id"><span class="rf-cf-l">Moeda</span>
          <span class="rf-cf-d">Símbolo usado em todo valor da tela</span></span>
        <button type="button" class="rf-opt-c" onclick="clOptions()">${escC(moeda)}</button>
      </div>
      <div class="rf-cf-lin">
        <span class="rf-cf-id"><span class="rf-cf-l">Tempo de jogo</span>
          <span class="rf-cf-d">Velocidade da rodada ao vivo — o Camarote trava no Usain Bolt</span></span>
        <button type="button" class="rf-opt-c" onclick="clOptions()">${escC(tempo)}</button>
      </div>
      <div class="rf-cf-lin">
        <span class="rf-cf-id"><span class="rf-cf-l">Modo</span>
          <span class="rf-cf-d">Solo joga contra a máquina; Resenha é a liga com a turma</span></span>
        <span class="rf-opt-c leitura">${CL.online?'Resenha':'Solo'}</span>
      </div>`)
  ) + rfCol(
    rfCard('Avisos', `
      ${sw('autoSalary','Salários automáticos','Renova contrato no valor de mercado sem perguntar',false)}
      ${sw('avisoOfertas','Avisar sobre propostas','Toast quando um clube faz proposta pelo seu jogador',true)}
      ${sw('avisoLesao','Avisar sobre lesões','Toast quando alguém sai machucado da rodada',true)}`)
    + rfCard('Conta', `
      <div class="rf-acoes">
        <button type="button" class="rf-acao" onclick="rfAcAbrir('conta-senha',{})">🔒 Trocar a senha</button>
        <button type="button" class="rf-acao" onclick="clOptions()">⚙️ Abrir opções do jogo</button>
        <button type="button" class="rf-acao perigo" onclick="rfAcAbrir('conta-apagar',{})">⚠ Apagar a conta</button>
      </div>`)
  );
}

/* =====================================================================
   CONFIG · 2 · JOGO
   ===================================================================== */
function rfCfJogoHTML(){
  const cl=clubOf(CL.clubId)||{short:'—'};
  const t=CL._lastSaveAt?new Date(CL._lastSaveAt):null;
  const saves=(CL.soloSaves||[]).slice()
    .sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
  return rfCol(
    rfCard('Save atual', `
      <div class="rf-cf-save">
        ${rfCrest(cl,40)}
        <span class="rf-cf-save-id">
          <span class="rf-cf-save-n">${escC(cl.short)} · ${escC(divisionLabel())} ${escC(String(S.season||''))}</span>
          <span class="rf-cf-save-s">${(S.round||0)+1}ª JORNADA${t?' · GRAVADO ÀS '+String(t.getHours()).padStart(2,'0')+'H'+String(t.getMinutes()).padStart(2,'0'):' · GRAVAÇÃO AUTOMÁTICA'}</span>
        </span>
      </div>
      <div class="rf-kpis">
        ${rfKpiHTML('Elenco', String(squad(CL.clubId).length), 'jogadores')}
        ${rfKpiHTML('Caixa', fmt(S.budget||0), 'agora')}
        ${rfKpiHTML('Temporada', String(S.season||'—'), (S.round||0)+' jornadas jogadas')}
      </div>
      <div class="rf-acoes">
        <button type="button" class="rf-acao primaria" onclick="rfAcGravar()">💾 Gravar agora</button>
      </div>
      <span class="rf-note">O jogo grava sozinho a cada rodada. "Gravar agora" força a gravação e
        mostra os saves guardados.</span>`)
  ) + rfCol(
    rfCard('Outros saves',
      saves.length
        ? saves.slice(0,6).map(sv=>`<div class="rf-linha">
            <span class="rf-linha-t">${escC(sv.name)}</span>
            <span class="rf-linha-v">${escC((typeof rfSaveQuando==='function')?rfSaveQuando(sv):'')}</span></div>`).join('')
        : '<span class="rf-note">Nenhum outro save na nuvem.</span>',
      {right: saves.length?saves.length+' na nuvem':''})
    + rfCard('Sair do save', `
      <span class="rf-note">Sair não apaga nada: o save fica na nuvem e você volta nele quando quiser.</span>
      <div class="rf-acoes">
        <button type="button" class="rf-acao" onclick="rfAcSairSave()">↩ Voltar aos saves</button>
        <button type="button" class="rf-acao perigo" onclick="rfAcApagarSave()">🗑 Apagar este save</button>
      </div>`)
  );
}

/* =====================================================================
   CONFIG · 3 · MODO RESENHA
   ===================================================================== */
function rfCfResenhaHTML(){
  if(!CL.online) return rfCol(rfCard('Modo Resenha',
    `<div class="rf-empty">Você está no <b>Modo Solo</b>.<br>
      <small>O Modo Resenha é o campeonato com a sua turma, todo mundo na mesma rodada.</small></div>`));
  const room=(typeof NET!=='undefined')?NET.room:null;
  const codigo=(room&&room.code)||(typeof NET!=='undefined'&&NET.code)||'——————';
  const assentos=(typeof rfSalaAssentos==='function')?rfSalaAssentos():[];
  const anfitriao=(typeof NET!=='undefined')&&NET.isHost;
  const pend=(CL.pendingJoins&&CL.pendingJoins.length)||0;
  return rfCol(
    `<div class="rf-ob-escuro">
      <span class="rf-ob-esc-l">Código da sala</span>
      <span class="rf-ob-codigo">${escC(codigo)}</span>
      <span class="rf-ob-esc-p">Quem tiver esse código entra direto na sua liga.</span>
      <button type="button" class="rf-ob-esc-b" onclick="clInviteResenha()">📤 Copiar convite</button>
    </div>`
    + rfCard('Treinadores',
      assentos.length
        ? assentos.map(a=>`<div class="rf-linha ${a.eu?'me':''}">
            <span class="rf-linha-t">${escC(a.nome)}${a.eu?' <i class="rf-el-sub">você</i>':''}</span>
            <span class="rf-linha-v">${escC(a.clube.short||'')}</span></div>`).join('')
        : '<span class="rf-note">Ninguém mais na sala ainda.</span>',
      {right: assentos.length? assentos.length+' na sala':''})
  ) + rfCol(
    rfCard('Regras da sala', `
      <div class="rf-linha"><span class="rf-linha-t">Ritmo</span>
        <span class="rf-linha-v">${escC(typeof tempoLabelAtual==='function'?tempoLabelAtual():'—')}</span></div>
      <div class="rf-linha"><span class="rf-linha-t">Divisão</span>
        <span class="rf-linha-v">${escC(divisionLabel())}</span></div>
      <div class="rf-linha"><span class="rf-linha-t">Você é</span>
        <span class="rf-linha-v">${anfitriao?'anfitrião':'convidado'}</span></div>`)
    + rfCard('Sincronização', `
      <div class="rf-acoes">
        ${anfitriao?`<button type="button" class="rf-acao" onclick="clJoinRequestsPanel()">
          ✅ Aprovar entradas${pend?' ('+pend+')':''}</button>`:''}
        <button type="button" class="rf-acao primaria" onclick="rfAcSincronizar()">🔄 Sincronizar com a sala</button>
        <button type="button" class="rf-acao perigo" onclick="rfAcSairSala()">🚪 Sair da sala</button>
        <button type="button" class="rf-acao" onclick="rfChatToggle()">💬 Abrir o chat</button>
      </div>
      <span class="rf-note">A rodada fecha quando todos publicarem o resultado. Sincronizar puxa o
        estado do servidor sem esperar o próximo tique.</span>`)
  );
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
