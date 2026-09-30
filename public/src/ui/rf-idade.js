/* ===== IDADE NO CADASTRO (29/09/2026) =====
   Pergunta obrigatória nos dois formulários de conta — Solo (rfOb1, rf26-onboarding.js) e Resenha
   (scConta, net/local-transport.js) —, junto do time do coração. Serve para o painel conhecer o
   público (faixa etária) e filtrar a lista de usuários.

   O QUE VAI PARA O BANCO (auth.users.raw_user_meta_data, junto do WhatsApp):
     idade   número inteiro (RF_IDADE_MIN..RF_IDADE_MAX)
   O painel lê em admin_rf98.usuarios ('idade').

   Sem cdraw() por tecla (ver nota em ui/rf26.js): o campo só atualiza o estado e o botão do passo. */
const RF_IDADE_MIN = 5, RF_IDADE_MAX = 99;
function rfIdadeNum(v){ const n = parseInt(String(v == null ? '' : v).replace(/\D/g, ''), 10); return isFinite(n) ? n : null; }
function rfIdadeOk(estado){
  const n = rfIdadeNum(estado && estado.idade);
  return n != null && n >= RF_IDADE_MIN && n <= RF_IDADE_MAX;
}
function rfIdadeCampoHTML(alvo, estado, aoMudar){
  const v = estado && estado.idade != null ? estado.idade : '';
  return `<div class="rf-campo">
    <span class="rf-campo-l">Sua idade</span>
    <input class="rf-campo-c" type="text" inputmode="numeric" maxlength="2" autocomplete="off" placeholder="Ex.: 28"
      value="${escC(v)}"
      oninput="var d=this.value.replace(/\\D/g,'').slice(0,2);if(d!==this.value)this.value=d;${alvo}.idade=d;${aoMudar}()">
  </div>`;
}
function rfIdadeMeta(estado){
  return rfIdadeOk(estado) ? { idade: rfIdadeNum(estado.idade) } : {};
}

/* ===== JOGOS DE FUTEBOL QUE JÁ JOGOU (29/09/2026) =====
   Pergunta obrigatória de múltipla escolha, logo depois da idade. "Outros" abre um campo livre.
   Vai para raw_user_meta_data:
     jogos_ja_jogou  lista de ids: 'cm' | 'fm' | 'brasfoot' | 'elifoot' | 'outros'
     jogos_outro     texto do "Outros" (até 60 caracteres) ou null
   O painel lê em admin_rf98.usuarios ('jogos', 'jogos_outro') e mostra no detalhe da conta.
   Marcar e desmarcar não redesenha a tela (ver rfJogosPintar); digitar em "Outros" só atualiza o estado. */
const RF_JOGOS = [['cm','Championship Manager'], ['fm','Football Manager'], ['brasfoot','Brasfoot'], ['elifoot','Elifoot'], ['outros','Outros']];
function rfJogosOk(estado){ return !!(estado && estado.jogos && estado.jogos.length); }
function rfJogosCampoHTML(alvo, estado, aoMudar){
  const sel = (estado && estado.jogos) || [];
  const chips = RF_JOGOS.map(([id, nome]) =>
    `<button type="button" class="rf-jg-chip${sel.includes(id)?' on':''}" aria-pressed="${sel.includes(id)}"
       onclick="var a=${alvo}.jogos=(${alvo}.jogos||[]).slice(),i=a.indexOf('${id}');i<0?a.push('${id}'):a.splice(i,1);${aoMudar}();rfJogosPintar(this,'${id}',i<0)">${escC(nome)}</button>`).join('');
  return `<div class="rf-campo rf-jg">
    <span class="rf-campo-l">Quais jogos de gerente de futebol você já jogou? <i class="rf-wa-opc">(pode marcar vários)</i></span>
    <div class="rf-jg-chips">${chips}</div>
    <input class="rf-campo-c rf-jg-outro" maxlength="60" placeholder="Quais outros jogos?"${sel.includes('outros')?'':' hidden'}
        value="${escC((estado && estado.jogosOutro) || '')}" oninput="${alvo}.jogosOutro=this.value;${aoMudar}()">
  </div>`;
}
/* MARCAR NÃO REDESENHA A TELA (30/09/2026): o cdraw() por escolha recriava o formulário inteiro e a página
   pulava para o topo a cada clique. O estado já foi atualizado no onclick; aqui só se pinta o botão e se
   mostra/esconde o campo do "Outros" — a rolagem e o foco ficam onde estão. */
function rfJogosPintar(btn, id, ligado){
  btn.classList.toggle('on', !!ligado); btn.setAttribute('aria-pressed', ligado ? 'true' : 'false');
  if(id==='outros'){
    const campo=btn.closest('.rf-jg') && btn.closest('.rf-jg').querySelector('.rf-jg-outro');
    if(campo){ campo.hidden=!ligado; if(ligado){ try{ campo.focus({preventScroll:true}); }catch(e){} } }
  }
}
function rfJogosMeta(estado){
  if(!rfJogosOk(estado)) return {};
  const ids = RF_JOGOS.map(x => x[0]).filter(id => estado.jogos.includes(id));
  return { jogos_ja_jogou: ids, jogos_outro: ids.includes('outros') ? ((estado.jogosOutro||'').trim().slice(0,60) || null) : null };
}
(function(){
  if(document.getElementById('rf-jg-css')) return;
  const st = document.createElement('style'); st.id = 'rf-jg-css';
  st.textContent = `
/* o rótulo é comprido e o .rf-campo-l é nowrap: no celular o "(pode marcar vários)" saía da tela */
.rf-jg .rf-campo-l{white-space:normal;line-height:1.35}
.rf-jg .rf-campo-l .rf-wa-opc{display:block;margin-top:2px}
.rf-jg-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.rf-jg-chip{cursor:pointer;font:inherit;font-size:14px;padding:9px 14px;border-radius:99px;border:1px solid rgba(0,0,0,.18);background:#fff;color:#1c2a22}
.rf-jg-chip.on{background:#1f7a3f;border-color:#1f7a3f;color:#fff;font-weight:700}
.rf-jg-outro{margin-top:8px}
.rf-jg-outro[hidden]{display:none}`;
  document.head.appendChild(st);
})();
