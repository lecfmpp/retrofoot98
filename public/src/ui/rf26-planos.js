/* =====================================================================
   PLANOS E POPUPS DE UPGRADE (pacote "planos e popups", 16/09)
   ---------------------------------------------------------------------
   Tres pecas, um modulo:

   · rfUpPaginaHTML()          -> a vitrine dos planos, dentro da pagina "Modo Resenha"
   · rfUpPopupPlano(key)       -> o popup horizontal de UM plano (Resenha ou Embaixador)
   · rfUpPopupDois(motivo)     -> o popup dos dois planos, nascido de um gatilho (trava) ou
                                  de um dos quatro marcos da temporada (rfUpMarcoRodada)

   NENHUM PRECO E' DIGITADO AQUI. Nome, centavos, beneficios e a copia de venda saem de
   RF_PLANOS; o desconto sai de RF_BETA e das mesmas funcoes da landing (rfBetaVale,
   rfBetaCent, rfBRL). Os centavos sao os do Stripe — uma segunda lista seria a versao que
   um dia discorda da cobranca.

   O ANUAL SEGUE A LANDING, NAO A MAQUETE. A maquete mostrava o anual sem desconto de Beta; a
   landing (a pagina de vendas que esta no ar, e que bate com o cupom) da' o desconto tambem no
   primeiro ano. As duas telas nao podem prometer coisas diferentes, e a que manda e' a que ja'
   vende.

   PAGAR: tudo termina em rfPlanoCta(key, trava, ciclo, forma) — o mesmo caminho da landing,
   com a escolha cartao/Pix ja' feita aqui dentro (linha "PAGAR COM" dos popups).
   ===================================================================== */

/* dois degraus desde 25/09 (Grátis × Pro) */
const RF_UP_ORDEM = ['gratis','pro'];
/* a arte dos popups ainda nao existe: quando chegar, o endereco entra aqui e a caixa (mesma
   altura, raio 14) passa a mostra-la. Vazio = placeholder. */
const RF_UP_ARTE = { pro:'' };
const RF_UP = { ciclo:'mes', forma:'cartao', aberto:null };

function rfUpDef(key){ return (typeof RF_PLANOS!=='undefined' && RF_PLANOS.find(p=>p.key===key)) || null; }

/* o plano da conta, na lingua dos degraus: `free` (e qualquer coisa desconhecida) e' o Grátis;
   `pro` e os antigos pagos `resenha`/`embaixador` sao o Pro. */
function rfUpPlanoAtual(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  const p=st.plan||st.plano;
  return (p==='pro'||p==='resenha'||p==='embaixador') ? 'pro' : 'gratis';
}
function rfUpIdx(key){ return Math.max(0, RF_UP_ORDEM.indexOf(key)); }

/* ===== O PRECO DE UM PLANO NUM CICLO =====
   Devolve o que as tres telas precisam: o valor final, a legenda, o cheio riscado com o chip de
   desconto (quando ha'), e a nota de baixo. No anual o riscado e' contra os 12 meses cheios. */
function rfUpPreco(p, ciclo){
  if(!p || !p.mes) return { cent:0, final:'R$ 0', legenda:'pra sempre', cheio:'', desconto:'',
    nota:'Sem cartão, sem pegadinha.', notaTom:'' };
  const beta = (typeof rfBetaVale==='function') && rfBetaVale(p);
  const corte = c => beta ? rfBetaCent(c) : c;
  if(ciclo==='ano'){
    const final=corte(p.ano), cheio=p.mes*12;
    const pct=Math.round((cheio-final)*100/cheio);
    return { cent:final, final:rfBRL(final,false), legenda:'por ano',
      cheio: pct>0 ? rfBRL(cheio,false) : '', desconto: pct>0 ? '−'+pct+'%' : '',
      nota: beta ? `No primeiro ano. Depois, ${rfBRL(p.ano,false)} por ano.`
                 : `Dá ${rfBRL(Math.round(p.ano/12))} por mês.`,
      notaTom: beta ? 'beta' : 'ok' };
  }
  const final=corte(p.mes);
  return { cent:final, final:rfBRL(final), legenda:'por mês',
    cheio: beta ? rfBRL(p.mes) : '', desconto: beta ? '−'+RF_BETA.pct+'%' : '',
    nota: beta ? `Nos ${RF_BETA.meses} primeiros meses. Depois, ${rfBRL(p.mes)} por mês.`
               : `Ou ${rfBRL(p.ano,false)} por ano.`,
    notaTom: beta ? 'beta' : '' };
}
function rfUpBetaTexto(){
  return (typeof RF_BETA!=='undefined' && RF_BETA.on)
    ? `Beta: ${RF_BETA.pct}% de desconto nos ${RF_BETA.meses} primeiros meses`
    : 'Preços de tabela';
}
function rfUpCicloHTML(onFn){
  return `<div class="rf-up-ciclo" role="tablist">${[['mes','Mensal'],['ano','Anual']].map(([k,l])=>
    `<button type="button" role="tab" aria-selected="${RF_UP.ciclo===k}" class="${RF_UP.ciclo===k?'on':''}"
      onclick="${onFn}('${k}')">${l}</button>`).join('')}</div>`;
}
function rfUpItensHTML(p, max){
  /* `max` corta a lista no popup de dois planos, que precisa do botao a' vista; a vitrine mostra
     a lista inteira. O "Tudo do plano X" fica sempre, e e' o primeiro a ser lido. */
  return (p.itens||[]).slice(0, max||99).map(t=>`<div class="rf-up-item"><span class="rf-up-tick">✓</span><span>${escC(t)}</span></div>`).join('')
    + (p.falta||[]).map(t=>`<div class="rf-up-item nao"><span class="rf-up-tick">✕</span><span>${escC(t)}</span></div>`).join('');
}

/* =====================================================================
   A VITRINE — faixa do plano atual, ciclo, tres cartoes
   ===================================================================== */
const RF_UP_RESUMO = {
  gratis:'Você joga uma carreira no Modo Solo, com a 1ª temporada inteira de graça.',
  pro:'Tudo liberado: temporadas e carreiras ilimitadas, save na nuvem e acesso exclusivo ao Modo Resenha no lançamento do Beta.',
};
const RF_UP_SUB = {
  gratis:'Você está no Peladeiro, o plano grátis. Veja o que muda com o Pro.',
  pro:'Você é Pro. Nada a fazer aqui — só jogar.',
};

function rfUpPaginaHTML(){
  if(typeof RF_PLANOS==='undefined') return '';
  const atual=rfUpPlanoAtual(), iA=rfUpIdx(atual), defA=rfUpDef(atual)||{};
  const proximo=RF_UP_ORDEM[iA+1]||null;
  const ciclo=RF_UP.ciclo;

  const escada=RF_UP_ORDEM.map((k,i)=>{
    const d=rfUpDef(k)||{}, eu=i===iA, antes=i<iA;
    const leg = eu?'VOCÊ ESTÁ AQUI':(antes?'JÁ INCLUÍDO':(i===iA+1?'PRÓXIMO DEGRAU':'O TOPO'));
    const curta = eu?'AQUI':(antes?'INCLUÍDO':(i===iA+1?'PRÓXIMO':'TOPO'));
    return `<div class="rf-up-degrau${eu?' eu':''}">
        <span class="rf-up-ponto">${eu?'●':(antes?'✓':i+1)}</span>
        <span class="rf-up-degrau-t"><b>${escC(d.nome||k)}</b>
          <span class="rf-up-mono" data-longa>${leg}</span><span class="rf-up-mono" data-curta>${curta}</span></span>
      </div>${i<RF_UP_ORDEM.length-1?'<span class="rf-up-seta" aria-hidden="true">→</span>':''}`;
  }).join('');

  const cartoes=RF_UP_ORDEM.map((k,i)=>{
    const p=rfUpDef(k); if(!p) return '';
    const eu=i===iA, abaixo=i<iA;
    const q=rfUpPreco(p, ciclo);
    let btn, btnNota, btnCls, acao='';
    if(eu){
      btn='✓ Seu plano atual'; btnCls='atual';
      btnNota = p.mes ? `Renova ${ciclo==='ano'?'todo ano':'todo mês'}. Cancela quando quiser.` : 'Sem prazo para acabar.';
    } else if(abaixo){
      btn='Plano abaixo do seu'; btnCls='abaixo'; btnNota='Você já tem tudo isso.';
    } else {
      btn=p.cta; btnCls='upgrade'; acao=`rfUpPopupPlano('${k}')`;
      btnNota = k===proximo ? 'O degrau seguinte ao seu.' : 'Pula direto para o topo.';
    }
    const selo = eu ? `<span class="rf-up-selo verde">SEU PLANO</span>`
      : (k===proximo ? `<span class="rf-up-selo ouro" data-so-movel>RECOMENDADO</span>` : '')
        + (p.selo && !eu ? `<span class="rf-up-selo ouro" data-so-desk>${escC(p.selo.toUpperCase())}</span>` : '');
    /* ordem no telemovel: o degrau recomendado primeiro, os outros upgrades, o atual e os de
       baixo no fim. No desktop a ordem e' fixa (CSS ignora --ordem ali). */
    const ordem = k===proximo ? 0 : (i>iA ? 1 : (eu ? 3 : 2));
    const botao = acao
      ? `<button type="button" class="rf-up-btn ${btnCls}" onclick="${acao}">${escC(btn)}</button>`
      : `<span class="rf-up-btn ${btnCls}" aria-disabled="true">${escC(btn)}</span>`;
    return `<div class="rf-up-card plano-${k}${eu?' eu':''}${k===proximo?' prox':''}${p.destaque?' destaque':''}" style="--ordem:${ordem}">
      ${p.mes?'<span class="rf-up-brilho" aria-hidden="true"></span>':''}
      <div class="rf-up-card-hd"><span class="rf-up-ico">${p.icone||''}</span><b>${escC(p.nome)}</b><span class="rf-sp"></span>${selo}</div>
      <span class="rf-up-resumo">${escC(p.resumo||'')}</span>
      <div class="rf-up-preco">
        ${q.cheio?`<span class="rf-up-cheio"><s>${escC(q.cheio)}</s><span class="rf-up-desc">${escC(q.desconto)}</span></span>`:''}
        <span class="rf-up-final"><b>${escC(q.final)}</b><span>${escC(q.legenda)}</span></span>
        <span class="rf-up-nota ${q.notaTom}">${escC(q.nota)}</span>
      </div>
      <div class="rf-up-acao">${botao}<span class="rf-up-btn-nota">${escC(btnNota)}</span></div>
      <div class="rf-up-lista">
        <span class="rf-up-mono rf-up-lista-t">${eu||abaixo?'O QUE VOCÊ JÁ TEM':'O QUE VOCÊ GANHA'}</span>
        ${rfUpItensHTML(p)}
        ${p.nota?`<span class="rf-up-letra">${escC(p.nota)}</span>`:''}
      </div>
    </div>`;
  }).join('');

  const pProx=proximo?rfUpDef(proximo):null, qProx=pProx?rfUpPreco(pProx,ciclo):null;
  const barra = pProx ? `<div class="rf-up-barra">
      <span class="rf-up-barra-t"><b>${escC(pProx.nome)} · o próximo degrau</b>
        <span>${escC(qProx.final)} ${escC(qProx.legenda)}${qProx.cheio?' · Beta':''}</span></span>
      <button type="button" class="rf-up-btn upgrade" onclick="rfUpPopupPlano('${proximo}')">Assinar</button>
    </div>` : '';

  return `<div class="rf-up-pagina" data-up-pagina>
    <div class="rf-up-titulo"><b>Planos</b><span>${escC(RF_UP_SUB[atual])}</span></div>
    <div class="rf-up-faixa">
      <div class="rf-up-faixa-hd">
        <span class="rf-up-faixa-ico">${defA.icone||''}</span>
        <span class="rf-up-faixa-id"><span class="rf-up-mono">SEU PLANO ATUAL</span><b>${escC(defA.nome||'')}</b></span>
        <span class="rf-up-faixa-r">${escC(RF_UP_RESUMO[atual])}</span>
        ${rfContaEhPro()?`<button type="button" class="rf-up-btn gerir" onclick="rfUpGerirAssinatura(this)">Gerir assinatura</button>`:''}
      </div>
      <div class="rf-up-escada">${escada}</div>
    </div>
    <div class="rf-up-ciclo-linha">
      ${rfUpCicloHTML('rfUpPaginaCiclo')}
      ${(typeof RF_BETA!=='undefined'&&RF_BETA.on)?`<span class="rf-up-beta"><span class="rf-up-emo">🔨</span><span>${escC(rfUpBetaTexto())}</span></span>`:''}
      <span class="rf-sp"></span>
      <span class="rf-up-cobranca"><span class="rf-up-emo">🔒</span><span>Cobrança pelo Stripe, no cartão ou no Pix. Cancela quando quiser.</span></span>
    </div>
    <div class="rf-up-cards">${cartoes}</div>
    ${barra}
  </div>`;
}
/* "Gerir assinatura": abre o portal do Stripe noutra aba (como o checkout dentro do jogo, para o
   save seguir aberto aqui). Quem tem plano por cortesia da equipe não tem nada no Stripe. */
function rfUpGerirAssinatura(btn){
  if(!(typeof NET!=='undefined' && NET.abrirPortal)) return;
  const aba=window.open('', '_blank');
  if(btn){ btn.disabled=true; btn.textContent='Abrindo…'; }
  NET.abrirPortal().then(r=>{
    if(r && r.url){ if(aba) aba.location.href=r.url; else location.href=r.url; return; }
    if(aba) aba.close();
    toastC(r && r.erro==='sem_assinatura'
      ? 'Seu plano não tem cobrança no Stripe — não há assinatura para gerir.'
      : 'Não foi possível abrir a sua assinatura agora. Tente de novo em instantes.');
  }).finally(()=>{ if(btn){ btn.disabled=false; btn.textContent='Gerir assinatura'; } });
}
/* o subtitulo da pagina Minha Conta fora de uma sala: o e-mail e o plano */
function rfUpContaSub(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  if(!st.loggedIn) return 'Entre na sua conta para ver o seu plano';
  const d=rfUpDef(rfUpPlanoAtual())||{};
  return `${escC(st.email||'')} · Plano ${escC(d.nome||'')}`;
}
function rfUpPaginaCiclo(k){
  RF_UP.ciclo = k==='ano' ? 'ano' : 'mes';
  document.querySelectorAll('[data-up-pagina]').forEach(el=>{ el.outerHTML=rfUpPaginaHTML(); });
}

/* =====================================================================
   OS POPUPS — invólucro comum
   Fundo do jogo DESFOCADO (backdrop-filter sobre a tela real, nao uma imitacao), altura
   travada: o invólucro ocupa a janela e o cartao tem max-height:100%, entao o documento nunca
   rola e o CTA nunca sai da tela. Esc, o ✕, "Agora nao" e o clique no fundo fecham.
   ===================================================================== */
function rfUpFechar(){
  const f=document.querySelector('.rf-up-fundo');
  if(f) f.remove();
  RF_UP.aberto=null;
  document.removeEventListener('keydown', rfUpEsc, true);
}
function rfUpEsc(ev){ if(ev.key==='Escape'){ ev.stopPropagation(); rfUpFechar(); } }
function rfUpMostrar(html, cls){
  let f=document.querySelector('.rf-up-fundo');
  if(!f){
    f=document.createElement('div');
    f.className='rf-up-fundo';
    f.addEventListener('click', ev=>{ if(ev.target===f) rfUpFechar(); });
    document.body.appendChild(f);
    document.addEventListener('keydown', rfUpEsc, true);
  }
  f.innerHTML=`<div class="rf-up-pop ${cls||''}" role="dialog" aria-modal="true">${html}</div>`;
}
/* redesenha o popup aberto (troca de ciclo ou de forma) sem perder o contexto */
function rfUpRedesenhar(){
  const a=RF_UP.aberto; if(!a) return;
  if(a.tipo==='plano') rfUpPopupPlano(a.key, a.trava);
  else rfUpPopupDois(a.motivo);
}
function rfUpCicloPop(k){ RF_UP.ciclo = k==='ano'?'ano':'mes'; rfUpRedesenhar(); }
function rfUpForma(k){ RF_UP.forma = k==='pix'?'pix':'cartao'; rfUpRedesenhar(); }
function rfUpPagar(key, trava){
  rfUpFechar();
  if(typeof rfPlanoCta==='function') rfPlanoCta(key, trava||'upgrade', RF_UP.ciclo, RF_UP.forma);
}
function rfUpArteHTML(key){
  const src=RF_UP_ARTE[key];
  /* sem arte: a caixa fica com o degradê de placeholder e o <img> vazio, pronto a receber */
  return `<div class="rf-up-arte">${src?`<img src="${escC(src)}" alt="">`:'<img alt="" hidden>'}</div>`;
}

/* ===== POPUP DE UM PLANO (horizontal) ===== */
function rfUpPopupPlano(key, trava){
  const p=rfUpDef(key); if(!p || !p.mes || !p.venda) return;
  RF_UP.aberto={tipo:'plano', key, trava:trava||null};
  const beta=(typeof rfBetaVale==='function') && rfBetaVale(p);
  const qM=rfUpPreco(p,'mes'), qA=rfUpPreco(p,'ano');
  const economia=Math.round((p.mes*12-p.ano)*100/(p.mes*12));
  const opcoes=[
    { k:'mes', t:'Mensal', nota: beta?`${RF_BETA.pct}% nos ${RF_BETA.meses} primeiros meses`:'cobrado todo mês',
      tom: beta?'beta':'', preco:qM.final, sub: beta?rfBRL(p.mes):'por mês', risca:beta, selo:'' },
    { k:'ano', t:'Anual', nota:`dá ${rfBRL(Math.round(qA.cent/12))} por mês`, tom:'',
      preco:qA.final, sub:'por ano', risca:false, selo: economia>0?'−'+economia+'%':'' },
  ];
  const q = RF_UP.ciclo==='ano' ? qA : qM;
  const pix = RF_UP.forma==='pix';
  const cta = `${key==='pro'?'<span class="rf-up-emo">👑</span>':''}<span>${escC(p.cta)} — ${escC(q.final)}/${RF_UP.ciclo==='ano'?'ano':'mês'}</span>`;
  const periodo = RF_UP.ciclo==='ano' ? 'um ano' : 'um mês';
  const ctaNota = pix
    ? `Um Pix de ${q.final}, vale por ${periodo}. Sem renovação automática.`
    : (RF_UP.ciclo==='ano'
        ? (beta ? `Um pagamento de ${q.final} no primeiro ano. Depois, ${rfBRL(p.ano,false)}.`
                : `Um pagamento de ${q.final}. Renova daqui a um ano.`)
        : (beta ? `Paga ${q.final} nos ${RF_BETA.meses} primeiros meses, depois ${rfBRL(p.mes)}.`
                : 'Renova todo mês. Cancela quando quiser.'));

  rfUpMostrar(`
    <div class="rf-up-venda">
      <div class="rf-up-venda-hd">
        <span class="rf-up-venda-ico">${p.icone}</span>
        <span class="rf-up-venda-id"><span class="rf-up-mono">PLANO ${escC(p.nome.toUpperCase())}</span>
          <b>${escC(p.venda.titulo)}</b></span>
      </div>
      <span class="rf-up-venda-frase">${escC(p.venda.frase)}</span>
      ${rfUpArteHTML(key)}
      <div class="rf-up-bens">${p.venda.beneficios.map(b=>`
        <div class="rf-up-bem"><span class="rf-up-bem-ico">${b.icone}</span>
          <span class="rf-up-bem-t"><b>${escC(b.titulo)}</b><span>${escC(b.texto)}</span></span></div>`).join('')}</div>
    </div>
    <div class="rf-up-decisao">
      <button type="button" class="rf-up-x" aria-label="Fechar" onclick="rfUpFechar()">✕</button>
      <div class="rf-up-opcoes">
        <span class="rf-up-mono rf-up-rot">COMO VOCÊ QUER PAGAR</span>
        ${opcoes.map(o=>`
        <button type="button" role="radio" aria-checked="${RF_UP.ciclo===o.k}" class="rf-up-opcao${RF_UP.ciclo===o.k?' on':''}" onclick="rfUpCicloPop('${o.k}')">
          <span class="rf-up-radio"></span>
          <span class="rf-up-opcao-t"><span><b>${o.t}</b>${o.selo?`<span class="rf-up-eco">${o.selo}</span>`:''}</span>
            <span class="rf-up-opcao-n ${o.tom}">${escC(o.nota)}</span></span>
          <span class="rf-up-opcao-p"><b>${escC(o.preco)}</b><span class="${o.risca?'risca':''}">${escC(o.sub)}</span></span>
        </button>`).join('')}
        <div class="rf-up-forma" role="radiogroup" aria-label="Pagar com">
          <span class="rf-up-mono">PAGAR COM</span>
          <button type="button" role="radio" aria-checked="${!pix}" class="${!pix?'on':''}" onclick="rfUpForma('cartao')">
            <span class="rf-up-emo">💳</span><span>Cartão</span></button>
          <button type="button" role="radio" aria-checked="${pix}" class="${pix?'on':''}" onclick="rfUpForma('pix')">
            <span class="rf-up-emo">⚡</span><span>Pix</span></button>
        </div>
      </div>
      <div class="rf-up-pe">
        <button type="button" class="rf-up-cta" onclick="rfUpPagar('${key}', ${trava?`'${escC(trava)}'`:'null'})">${cta}</button>
        <span class="rf-up-cta-nota">${escC(ctaNota)}</span>
        <div class="rf-up-rodape">
          <span class="rf-up-cobranca"><span class="rf-up-emo">🔒</span><span>Stripe · ${pix?'pagamento único':'cancela quando quiser'}</span></span>
          <span class="rf-sp"></span>
          <button type="button" class="rf-up-agora" onclick="rfUpFechar()">Agora não</button>
        </div>
      </div>
    </div>`, 'rf-up-horiz');
}

/* =====================================================================
   POPUP DOS DOIS PLANOS — o problema antes do preco
   Os tres gatilhos sao travas (o jogador acabou de bater numa parede); os quatro marcos sao o
   lembrete periodico da temporada, e nao tem parede nenhuma — por isso nao dizem "resolve o
   seu caso", dizem qual e' o proximo degrau.
   ===================================================================== */
const RF_UP_MOTIVOS = {
  anfitriao:{ trava:true, alvo:'pro', selo:'O MODO RESENHA É DO PRO',
    titulo:'Pra chamar a turma, você precisa ser Pro.',
    sub:'O Modo Resenha — abrir a sala, escolher os clubes e jogar a mesma semana com os amigos — é exclusivo do Pro quando lançarmos a versão Beta. E o Pro já traz temporadas e carreiras ilimitadas no Modo Solo.' },
  saves:{ trava:true, alvo:'pro', selo:'O PELADEIRO TEM UMA CARREIRA',
    titulo:'Quer começar outra carreira?',
    sub:'No Peladeiro você joga uma carreira, com a 1ª temporada inteira. No Pro são quantas carreiras e temporadas você quiser.' },
  prazo:{ trava:true, alvo:'pro', selo:'O MODO RESENHA É DO PRO',
    titulo:'Jogar com a turma é do Pro.',
    sub:'O Modo Solo continua seu. O Modo Resenha — entrar na sala dos amigos ou abrir a sua — é exclusivo do Pro quando lançarmos a versão Beta.' },
  inicio:{ selo:'TEMPORADA NOVA', icone:'🏁',
    titulo:'Essa temporada pode ser só o começo.',
    sub:'No Pro a carreira não para: temporadas ilimitadas, save na nuvem e acesso exclusivo ao Modo Resenha quando lançarmos a versão Beta.' },
  turno:{ selo:'VIRADA DO TURNO', icone:'🔄',
    titulo:'Metade do campeonato já foi.',
    sub:'No Peladeiro a carreira termina no fim desta temporada. Com o Pro você segue para a próxima — e para quantas quiser.' },
  reta:{ selo:'RETA FINAL', icone:'🏆',
    titulo:'A reta final decide o ano.',
    sub:'Subiu, ficou ou caiu: com o Pro você disputa a próxima temporada com o mesmo clube e o mesmo elenco.' },
};
function rfUpPopupDois(motivo){
  const m=RF_UP_MOTIVOS[motivo]||RF_UP_MOTIVOS.anfitriao;
  RF_UP.aberto={tipo:'dois', motivo};
  const atual=rfUpPlanoAtual(), iA=rfUpIdx(atual);
  /* o destaque: numa trava, o plano que resolve; num marco, o proximo degrau */
  /* quem ja' tem o plano que "resolve" (um Resenha sem cota) so' sai pelo degrau de cima */
  const alvo='pro';
  const sub=m.sub, selo=m.selo;
  const planos=RF_UP_ORDEM.map(k=>{
    const p=rfUpDef(k); if(!p) return '';
    const q=rfUpPreco(p, RF_UP.ciclo);
    const eAlvo=k===alvo, jaTem=rfUpIdx(k)<=iA;
    const seloP = eAlvo ? `<span class="rf-up-selo ouro">${m.trava?'RESOLVE O SEU CASO':'PRÓXIMO DEGRAU'}</span>` : '';
    const btn = jaTem
      ? `<span class="rf-up-btn atual" aria-disabled="true">${k===atual?'✓ Seu plano atual':'Você já tem tudo isso'}</span>`
      : `<button type="button" class="rf-up-btn ${eAlvo?'alvo':'neutro'}" onclick="rfUpPopupPlano('${k}'${m.trava?`,'${motivo}'`:''})">${escC(p.cta)}</button>`;
    return `<div class="rf-up-dplano${eAlvo?' alvo':''}">
      <div class="rf-up-card-hd"><span class="rf-up-ico">${p.icone}</span><b>${escC(p.nome)}</b><span class="rf-sp"></span>${seloP}</div>
      <span class="rf-up-resumo">${escC(p.resumo)}</span>
      <div class="rf-up-preco">
        <span class="rf-up-final"><b>${escC(q.final)}</b><span>${escC(q.legenda)}</span>${q.cheio?`<s>${escC(q.cheio)}</s>`:''}</span>
        <span class="rf-up-nota ${q.notaTom}">${escC(q.nota)}</span>
      </div>
      <div class="rf-up-lista">
        <span class="rf-up-mono rf-up-lista-t">${eAlvo&&m.trava?'O QUE VOCÊ DESTRAVA':'O QUE VEM NO PLANO'}</span>
        ${rfUpItensHTML(p, 4)}
      </div>
      ${btn}
    </div>`;
  }).join('');
  const fica = atual==='gratis' ? 'Continuar no Peladeiro' : 'Agora não';
  rfUpMostrar(`
    <div class="rf-up-dtopo">
      <button type="button" class="rf-up-x claro" aria-label="Fechar" onclick="rfUpFechar()">✕</button>
      <span class="rf-up-motivo"><span>${m.trava?'🔒':(m.icone||'⭐')}</span><span class="rf-up-mono">${escC(selo)}</span></span>
      <b class="rf-up-dtit">${escC(m.titulo)}</b>
      <span class="rf-up-dsub">${escC(sub)}</span>
    </div>
    <div class="rf-up-dbarra">
      ${rfUpCicloHTML('rfUpCicloPop')}
      ${(typeof RF_BETA!=='undefined'&&RF_BETA.on)?`<span class="rf-up-beta"><span class="rf-up-emo">🔨</span><span>${escC(rfUpBetaTexto())}</span></span>`:''}
    </div>
    <div class="rf-up-dplanos">${planos}</div>
    <div class="rf-up-dpe">
      <span>Cobrança pelo Stripe, no cartão ou no Pix. Cancela quando quiser.</span>
      <span class="rf-sp"></span>
      <button type="button" class="rf-up-agora" onclick="rfUpFechar()">${fica}</button>
    </div>`, 'rf-up-dois');
}

/* =====================================================================
   OS QUATRO MARCOS DA TEMPORADA
   Inicio, virada do turno, reta final e fim. Cada marco aparece UMA vez por temporada por
   partida: recarregar a pagina nao repete (ver rfUpVistos).
   Quem ja' e' Embaixador nunca ve. Quem e' Resenha ve o popup do Embaixador; o Peladeiro ve os
   dois planos. Sem sessao nao ha' a quem vender (nem conta para assinar).

   ONDE DISPARA: inicio/turno/reta na volta ao clube depois de cada rodada (liveDone, Solo e
   Resenha); fim no botao de avancar a temporada (clAdvanceSeason / clOnlineSeasonContinue).
   Nunca por cima de outra coisa: a coletiva, um momento, a tela de fim de temporada ou outro
   modal seguram o popup, que tenta de novo daqui a pouco — e desiste se nao houver folga.
   ===================================================================== */
function rfUpMarcoChave(marco, temporada){ return `${temporada}:${marco}`; }
/* O CARIMBO MORA NO NAVEGADOR, por partida. Numa resenha online o S vem do servidor a cada
   rodada e apagaria um carimbo guardado nele — o popup voltaria a cada carregamento. A chave e'
   a mesma identidade de partida usada no resto do jogo (a sala online, ou o save solo). */
function rfUpChavePartida(){
  const online = CL.online && typeof NET!=='undefined' && NET.gameId;
  return 'rf98:upMarcos:' + (online ? NET.gameId : ('solo_'+(CL.save||'')+'_'+((S&&S.seed)||'x')));
}
function rfUpVistos(){
  let v=[];
  try{ v=JSON.parse(localStorage.getItem(rfUpChavePartida())||'[]'); }catch(e){}
  return Array.isArray(v) ? v : [];
}
function rfUpCarimbar(marco, temporada){
  const v=rfUpVistos(), k=rfUpMarcoChave(marco, temporada);
  if(!v.includes(k)) v.push(k);
  while(v.length>16) v.shift();   // so' as ultimas temporadas importam
  try{ localStorage.setItem(rfUpChavePartida(), JSON.stringify(v)); }catch(e){}
}
function rfUpPodeVender(){
  if(typeof S==='undefined' || !S) return false;
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  return !!st.loggedIn && rfUpPlanoAtual()!=='pro';
}
/* a tela esta' livre? — so' o clube parado, sem nada aberto por cima */
function rfUpTelaLivre(){
  if(typeof CL==='undefined' || CL.screen!=='main' || CL.live || CL.acao) return false;
  if(typeof MOMENTO_FILA!=='undefined' && MOMENTO_FILA.length) return false;
  const ov=document.querySelector('#c-overlay');
  if(ov && ov.style.display!=='none' && ov.innerHTML) return false;
  if(document.querySelector('.rf-up-fundo, .rf-pg-fundo, .rf-ac-fundo, .rf-teatro')) return false;
  return true;
}
function rfUpMostrarMarco(marco){ rfUpPopupDois(marco); }
/* qual marco esta' devido agora, pela rodada. So' o mais adiantado aparece: quem abre um save
   no meio da temporada ve a virada do turno, e o inicio fica carimbado sem ser mostrado. */
function rfUpMarcoDaRodada(){
  const len=(S.sched&&S.sched.length)||0, r=S.round||0;
  if(!len || S.finished) return null;
  const ordem=[
    ['inicio', r>=1],
    ['turno',  r>=Math.ceil(len/2)],
    ['reta',   r>=Math.max(Math.ceil(len*0.8), len-5)],
  ].filter(x=>x[1]).map(x=>x[0]);
  return ordem.length ? ordem : null;
}
let RF_UP_TIMER=null;
function rfUpAgendar(marco, temporada, tentativa){
  if(RF_UP_TIMER){ clearTimeout(RF_UP_TIMER); RF_UP_TIMER=null; }
  tentativa=tentativa||0;
  RF_UP_TIMER=setTimeout(()=>{
    RF_UP_TIMER=null;
    try{
      if(!rfUpPodeVender()) return;
      if(rfUpVistos().includes(rfUpMarcoChave(marco, temporada))) return;
      if(!rfUpTelaLivre()){
        if(tentativa<20) rfUpAgendar(marco, temporada, tentativa+1);   // ~1 minuto de paciencia
        return;
      }
      rfUpCarimbar(marco, temporada);
      rfUpMostrarMarco(marco);
    }catch(e){ console.warn('marco de planos:', e); }
  }, tentativa ? 3000 : 1500);
}
/* chamado por liveDone, depois de cada rodada */
function rfUpMarcoRodada(){
  try{
    if(!rfUpPodeVender()) return;
    const devidos=rfUpMarcoDaRodada(); if(!devidos) return;
    const temporada=S.season||0;
    const ultimo=devidos[devidos.length-1];
    devidos.slice(0,-1).forEach(m=>rfUpCarimbar(m, temporada));
    if(!rfUpVistos().includes(rfUpMarcoChave(ultimo, temporada))) rfUpAgendar(ultimo, temporada);
  }catch(e){ console.warn('marco de planos:', e); }
}
/* chamado quando o jogador avanca para a temporada nova: `temporada` e' a que acabou */
/* O FIM DE TEMPORADA SAIU DOS MARCOS (25/09): quem não é Pro já passa pelo paywall de
   temporada (rf26-paywall.js) antes de virar — um segundo popup logo depois seria repetir. */
function rfUpMarcoFim(temporada){}

/* =====================================================================
   AS TRAVAS: o popup de gatilho substitui a janela antiga em tres delas
   ===================================================================== */
const RF_UP_TRAVA_MOTIVO = { hospedar:'anfitriao', saves:'saves', resenha:'prazo' };
function rfUpTrava(chave){
  const m=RF_UP_TRAVA_MOTIVO[chave];
  if(!m) return false;
  if(typeof clCloseOverlay==='function') clCloseOverlay();
  rfUpPopupDois(m);
  return true;
}
