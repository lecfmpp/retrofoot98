/* ===== TIME DO CORAÇÃO NO CADASTRO (27/09/2026) =====
   Pergunta obrigatória (um toque) nos dois formulários de conta — Solo (rfOb1, rf26-onboarding.js) e
   Resenha (scConta, net/local-transport.js) —, logo depois do WhatsApp. Serve para contar torcidas
   depois (Sócio Torcedor e outras estratégias).

   NOME E ESCUDO REAIS, por decisão do dono (27/09): a lista vem de data/times-coracao.js, gerada dos
   dados de FÁBRICA (scripts/build-times-coracao.mjs). O jogo em si continua com os nomes fictícios do
   pacote oficial — isto aqui é só "para quem você torce". Os escudos são do Transfermarkt; se a imagem
   não carregar, entra um selo com as cores do clube.

   O QUE VAI PARA O BANCO (auth.users.raw_user_meta_data, junto do WhatsApp):
     time_coracao       id do clube no catálogo (ex.: '614'), ou 'outro' / 'nenhum'
     time_coracao_nome  nome real (ou o que a pessoa escreveu em "Outro time")
     time_coracao_serie A/B/C/D (vazio em outro/nenhum)
   O painel lê em admin_rf98.usuarios.

   Nada de cdraw() por tecla (ver nota do cdraw por tecla em ui/rf26.js): a busca filtra a lista no
   próprio DOM; só a ESCOLHA redesenha. */
(function(){
  if(document.getElementById('rf-tc-css')) return;
  const st = document.createElement('style'); st.id = 'rf-tc-css';
  st.textContent = `
.rf-tc{position:relative}
.rf-tc-btn{width:100%;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;font:inherit}
.rf-tc-btn .rf-tc-seta{margin-left:auto;opacity:.6}
.rf-tc-btn.vazio{color:#8a958d}
.rf-tc-esc{width:26px;height:26px;flex:0 0 26px;object-fit:contain;display:block}
.rf-tc-dot{width:22px;height:22px;flex:0 0 22px;border-radius:99px;border:2px solid rgba(0,0,0,.15);display:block}
.rf-tc-pop{margin-top:6px;border:1px solid rgba(0,0,0,.14);border-radius:12px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.18);overflow:hidden}
.rf-tc-pop[hidden]{display:none}
.rf-tc-busca{width:100%;border:0;border-bottom:1px solid rgba(0,0,0,.1);padding:11px 12px;font:inherit;font-size:14px;outline:none;box-sizing:border-box}
.rf-tc-lista{max-height:260px;overflow:auto;-webkit-overflow-scrolling:touch}
.rf-tc-grupo{padding:8px 12px 4px;font-size:11px;font-weight:700;letter-spacing:.06em;color:#8a958d;text-transform:uppercase}
.rf-tc-op{display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;font-size:14px;color:#1c2a22}
.rf-tc-op:hover,.rf-tc-op.on{background:#eef5ef}
.rf-tc-op small{margin-left:auto;font-size:11px;color:#8a958d}
.rf-tc-outro{margin-top:8px}
.rf-tc-nada{padding:12px;font-size:13px;color:#8a958d}
.rf-tc-outro[hidden]{display:none}
.rf-tc [hidden]{display:none !important}`;
  document.head.appendChild(st);
})();

function rfTcLista(){ return (window.RF_TIMES_CORACAO || []); }
function rfTcTime(id){ return rfTcLista().find(t => t.id === String(id)); }
function rfTcEscudoHTML(t){
  if(!t) return '';
  const dot = (oculto) => `<i class="rf-tc-dot"${oculto?' hidden':''} style="background:${escC(t.cor||'#ccc')};border-color:${escC(t.cor2||'rgba(0,0,0,.15)')}"></i>`;
  if(!t.escudo) return dot(false);
  // sem referrer: o servidor de imagens do Transfermarkt pode recusar hotlink com referrer de outro site.
  // Se a imagem falhar, some e o selo de cores (irmão logo depois) aparece.
  return `<img class="rf-tc-esc" src="${escC(t.escudo)}" alt="" loading="lazy" referrerpolicy="no-referrer"
    onerror="this.hidden=true;if(this.nextElementSibling)this.nextElementSibling.hidden=false">${dot(true)}`;
}
function rfTimeCampoHTML(alvo, estado, aoMudar){
  const id = estado && estado.timeCoracao, t = id && rfTcTime(id);
  const rotulo = t ? `${rfTcEscudoHTML(t)}<span>${escC(t.nome)}</span>`
    : id === 'outro' ? '<span>Outro time</span>' : id === 'nenhum' ? '<span>Não torço para nenhum time</span>'
    : '<span>Escolha o seu time</span>';
  const SERIES = { A:'Série A', B:'Série B', C:'Série C', D:'Série D' };
  let grupos = '';
  for(const s of ['A','B','C','D']){
    const ts = rfTcLista().filter(x => x.serie === s);
    if(!ts.length) continue;
    grupos += `<div class="rf-tc-grupo" data-tc-grupo>${SERIES[s]}</div>` + ts.map(x =>
      `<div class="rf-tc-op${x.id===id?' on':''}" data-tc-nome="${escC((x.nome+' '+x.completo).toLowerCase())}"
         onclick="${alvo}.timeCoracao='${escC(x.id)}';${alvo}.timeCoracaoOutro='';${aoMudar}();rfTcPintar(this)">
         ${rfTcEscudoHTML(x)}<span>${escC(x.nome)}</span></div>`).join('');
  }
  grupos += `<div class="rf-tc-grupo" data-tc-grupo>Outros</div>
    <div class="rf-tc-op${id==='outro'?' on':''}" data-tc-nome="outro time" onclick="${alvo}.timeCoracao='outro';${aoMudar}();rfTcPintar(this)"><span>Outro time</span></div>
    <div class="rf-tc-op${id==='nenhum'?' on':''}" data-tc-nome="nao torco nenhum" onclick="${alvo}.timeCoracao='nenhum';${alvo}.timeCoracaoOutro='';${aoMudar}();rfTcPintar(this)"><span>Não torço para nenhum time</span></div>`;
  return `<div class="rf-campo rf-tc">
    <span class="rf-campo-l">Seu time do coração</span>
    <button type="button" class="rf-campo-c rf-tc-btn${id?'':' vazio'}" onclick="rfTcAbrir(this)">${rotulo}<span class="rf-tc-seta">▾</span></button>
    <div class="rf-tc-pop" hidden>
      <input class="rf-tc-busca" type="search" placeholder="Buscar time" autocomplete="off" oninput="rfTcFiltrar(this)">
      <div class="rf-tc-lista">${grupos}<div class="rf-tc-nada" hidden>Nenhum time com esse nome — escolha "Outro time".</div></div>
    </div>
    <input class="rf-campo-c rf-tc-outro" maxlength="40" placeholder="Qual time?"${id === 'outro' ? '' : ' hidden'}
        value="${escC((estado && estado.timeCoracaoOutro) || '')}" oninput="${alvo}.timeCoracaoOutro=this.value;${aoMudar}()">
  </div>`;
}
/* ESCOLHER O TIME NÃO REDESENHA A TELA (30/09/2026): o cdraw() recriava o formulário inteiro e a página
   pulava para o topo a cada escolha (mesmo defeito dos jogos jogados). O estado já foi gravado no onclick;
   aqui só se troca o rótulo do botão, a opção marcada, o fecho da lista e o campo do "Outro time". */
function rfTcPintar(op){
  const raiz=op.closest('.rf-tc'); if(!raiz) return;
  const btn=raiz.querySelector('.rf-tc-btn'), pop=raiz.querySelector('.rf-tc-pop'), outro=raiz.querySelector('.rf-tc-outro');
  raiz.querySelectorAll('.rf-tc-op').forEach(o=>o.classList.toggle('on', o===op));
  if(btn){ btn.innerHTML=op.innerHTML+'<span class="rf-tc-seta">▾</span>'; btn.classList.remove('vazio'); }
  if(pop) pop.hidden=true;
  const ehOutro=op.getAttribute('data-tc-nome')==='outro time';
  if(outro){
    outro.hidden=!ehOutro;
    if(!ehOutro) outro.value='';
    else { try{ outro.focus({preventScroll:true}); }catch(e){} }
  }
}
function rfTcAbrir(btn){
  const pop = btn.parentNode.querySelector('.rf-tc-pop');
  pop.hidden = !pop.hidden;
  if(!pop.hidden){ const b = pop.querySelector('.rf-tc-busca'); b.value = ''; rfTcFiltrar(b); b.focus(); }
}
function rfTcFiltrar(inp){
  const q = inp.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const lista = inp.parentNode.querySelector('.rf-tc-lista');
  let algum = false;
  lista.querySelectorAll('.rf-tc-op').forEach(op => {
    const n = op.getAttribute('data-tc-nome').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const ok = !q || n.includes(q); op.hidden = !ok; if(ok) algum = true;
  });
  lista.querySelectorAll('[data-tc-grupo]').forEach(g => { g.hidden = !!q; });
  lista.querySelector('.rf-tc-nada').hidden = algum;
}
/* obrigatório: escolher um time, "Outro time" (o nome é opcional) ou "Não torço" */
function rfTimeOk(estado){ return !!(estado && estado.timeCoracao); }
function rfTimeMeta(estado){
  const id = estado && estado.timeCoracao; if(!id) return {};
  if(id === 'nenhum') return { time_coracao:'nenhum', time_coracao_nome:null, time_coracao_serie:null };
  if(id === 'outro') return { time_coracao:'outro', time_coracao_nome:((estado.timeCoracaoOutro||'').trim().slice(0,40)) || null, time_coracao_serie:null };
  const t = rfTcTime(id);
  return { time_coracao:id, time_coracao_nome:t ? t.nome : null, time_coracao_serie:t ? t.serie : null };
}
