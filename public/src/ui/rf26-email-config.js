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
   ===================================================================== */
function rfEmCaixaHTML(){
  const box=rfInbox().filter(e=>!e.read);
  const todas=rfInbox();
  const lista=(box.length?box:todas);
  return rfCol(
    rfCard('Caixa de entrada',
      lista.length
        ? `<div class="rf-mails">${lista.slice(0,20).map(rfEmLinha).join('')}</div>`
        : '<span class="rf-note">Caixa de entrada vazia.</span>',
      {right: box.length? box.length+' não lida'+(box.length===1?'':'s') : 'tudo lido'})
  ) + rfCol(
    rfCard('Mensagem aberta', rfLeituraHTML())
  );
}
function rfEmLinha(e){
  return `<div class="rf-mail ${e.read?'':'novo'} ${CL.inboxOpen===e.key?'aberto':''}"
       onclick="clInboxOpen('${escC(e.key)}')">
    <span class="rf-mail-i">${(typeof inboxIcon==='function'?inboxIcon(e.kind):'✉️')}</span>
    <div class="rf-mail-id">
      <div class="rf-mail-top">
        <span class="rf-mail-a">${e.read?'':'● '}${escC(e.subject||'')}</span>
        <span class="rf-mail-q">${escC(rfQuandoHTML(e))}</span>
      </div>
      <span class="rf-mail-p">${escC(String(e.from||e.preview||'').slice(0,72))}</span>
    </div>
  </div>`;
}

/* =====================================================================
   E-MAIL · 2 · ARQUIVADAS (as já lidas)
   ===================================================================== */
function rfEmArquivadasHTML(){
  const lidas=rfInbox().filter(e=>e.read);
  return rfCol(
    rfCard('Arquivadas',
      lidas.length
        ? `<div class="rf-mails">${lidas.slice(0,40).map(rfEmLinha).join('')}</div>`
        : '<span class="rf-note">Nada arquivado ainda. Uma mensagem entra aqui depois de lida.</span>',
      {right: lidas.length+(lidas.length===1?' mensagem':' mensagens')})
  ) + rfCol(
    rfCard('Mensagem aberta', rfLeituraHTML())
  );
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
        <button type="button" class="rf-acao" onclick="clOptions()">⚙️ Abrir opções do jogo</button>
        <button type="button" class="rf-acao perigo" onclick="clExit()">↩ Sair para o menu</button>
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
        <button type="button" class="rf-acao primaria" onclick="clSaveMenu()">💾 Gravar agora</button>
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
        <button type="button" class="rf-acao perigo" onclick="clExit()">↩ Sair para o menu</button>
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
        <button type="button" class="rf-acao primaria" onclick="clResenhaSync()">🔄 Sincronizar com a sala</button>
        <button type="button" class="rf-acao" onclick="rfChatToggle()">💬 Abrir o chat</button>
      </div>
      <span class="rf-note">A rodada fecha quando todos publicarem o resultado. Sincronizar puxa o
        estado do servidor sem esperar o próximo tique.</span>`)
  );
}
