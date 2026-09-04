/* =====================================================================
   PAGAMENTO CONFIRMADO — a festa, depois de o dinheiro entrar
   ---------------------------------------------------------------------
   UM COMPONENTE, DOIS PLANOS (regra do handoff). Resenha e Embaixador sao o mesmo modal com um
   objeto de conteudo diferente; nada aqui e' duplicado por plano a nao ser o texto e a cor.

   ELE SO' ABRE DEPOIS DA CONFIRMACAO DE VERDADE, nunca no clique de pagar. O Stripe devolve o
   jogador com `?assinatura=ok`, mas ESSE PARAMETRO NAO E' PROVA: quem escreve o plano e' o
   webhook, e ele pode chegar segundos depois — ou nao chegar. Entao a tela abre em
   "Confirmando o pagamento…", pergunta o plano ao servidor de dois em dois segundos e so'
   festeja quando o plano pago aparece de facto. Se nao aparecer, diz isso com todas as letras
   em vez de festejar por engano.

   O QUE NAO INVENTAMOS. O desenho previa meio de pagamento (cartao/PIX) e um botao "Ver o
   recibo" — os dois vem do gateway, e o cliente nao os tem. Em vez de encher a tela com um
   cartao final falso e um botao morto, dizemos onde o comprovante caiu (o e-mail da conta, que
   e' verdade) e ficamos por ai. E' a mesma regra do resto do jogo: onde o dado nao existe, a
   tela nao finge.

   OS BENEFICIOS SAO OS DA HOME, lidos de RF_PLANOS. O handoff avisa que os textos mudaram
   depois do desenho — e mudaram mesmo (a lista do prototipo fala de "ligas oficiais fechadas",
   que nao existe). Puxar da mesma lista dos precos garante que a pagina de vendas e a tela de
   confirmacao nunca discordem sobre o que foi comprado.
   ===================================================================== */

const RF_PG_CONTEUDO = {
  resenha: {
    kicker:'PAGAMENTO CONFIRMADO',
    titulo:'A resenha é sua agora, treinador.',
    sub:'Chame a turma, escolha os times e brigue por uma taça com quem senta do seu lado no sofá.',
    emoji:'🍺',
    cta:'Criar a primeira sala',
    acao:()=>{ if(typeof clGoModo==='function') clGoModo('resenha');
               else if(typeof clPickResenha==='function') clPickResenha(); },
    legal:'Cobrança recorrente. Cancele quando quiser em Configurações › Conta.',
  },
  embaixador: {
    kicker:'BEM-VINDO AO CONSELHO',
    titulo:'Você virou Embaixador RetroFoot.',
    sub:'Abra a liga da sua turma, ponha o seu nome num jogador da base oficial e leve o selo no perfil.',
    emoji:'🏅',
    cta:'Escolher o meu jogador',
    /* leva ao que o plano acabou de destrancar e ninguem mais tem — e' a melhor primeira coisa
       a fazer depois de assinar (ver ui/rf26-meujogador.js) */
    acao:()=>{ if(typeof rfSetTab==='function'){ rfState().page='treinador'; rfSetTab('treinador','meujogador'); }
               else if(typeof clGoModo==='function') clGoModo('solo'); },
    legal:'Cobrança recorrente. Cancele quando quiser em Configurações › Conta.',
  },
};

/* ===== O CONFETE =====
   CSS puro, sem biblioteca e sem canvas: N spans absolutos com uma queda propria cada.
   SEQUENCIA DETERMINISTICA, nao Math.random(): os tres parametros saem de (k*37+11)%100 e
   companhia. A festa fica identica em toda abertura — bom para o teste e para gravar video — e
   nao ha' re-sorteio a cada redesenho. Cai uma vez (`forwards`) e nao repete. */
const RF_PG_PALETA = {
  resenha:    ['#F2B90C','#ffffff','#5fd98b','#8fabd6','#ff9b8f'],
  embaixador: ['#F2B90C','#ffe07a','#ffffff','#c9971a','#8fd4a0'],
};
function rfPgConfeteHTML(plano, movel){
  const cores=RF_PG_PALETA[plano]||RF_PG_PALETA.embaixador;
  const n = movel ? 30 : 38;
  const derivaMax = movel ? 55 : 80;
  let out='';
  for(let k=0;k<n;k++){
    const a=(k*37+11)%100, b=(k*53+29)%100, c=(k*71+17)%100;
    const larg = 5 + (a%4);                       /* 5–8px */
    const alt  = Math.round(larg * (k%3===0 ? 2.2 : 1));   /* fitas e quadradinhos misturados */
    const dx   = Math.round((b/100)*derivaMax*2 - derivaMax);
    const rot  = 540 + Math.round((c/100)*594);   /* 540–1134deg */
    const dur  = (2.4 + (a/100)*1.6).toFixed(2);
    const atraso=((c/100)*1.5).toFixed(2);
    const raio = (k%5===0) ? '99px' : '1px';
    out += `<span style="left:${a}%;width:${larg}px;height:${alt}px;border-radius:${raio};`
         + `background:${cores[k%cores.length]};--dx:${dx}px;--rot:${rot}deg;`
         + `animation:rfPgCai ${dur}s linear ${atraso}s 1 forwards"></span>`;
  }
  return `<span class="rf-pg-confete" data-confete aria-hidden="true">${out}</span>`;
}

/* o ciclo sai da DISTANCIA ate' a renovacao: o cliente nao sabe qual preco foi vendido, mas
   sabe quando ele renova — e um ano nao se confunde com um mes */
function rfPgCiclo(until){
  if(!until) return null;
  const dias = (new Date(until) - Date.now())/86400000;
  if(!isFinite(dias)) return null;
  return dias > 200 ? 'ano' : 'mes';
}
function rfPgData(until){
  try{ return new Date(until).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'}); }
  catch(e){ return null; }
}

function rfPgCorpoHTML(plano, st){
  const c = RF_PG_CONTEUDO[plano] || RF_PG_CONTEUDO.embaixador;
  const def = (typeof RF_PLANOS!=='undefined' && RF_PLANOS.find(p=>p.key===plano)) || {};
  const ciclo = rfPgCiclo(st && st.until);
  const cent = ciclo==='ano' ? def.ano : def.mes;
  const beta = (typeof rfBetaVale==='function') && rfBetaVale(def);
  const pago = (beta && typeof rfBetaCent==='function' && cent) ? rfBetaCent(cent) : cent;
  const valor = (cent && typeof rfBRL==='function') ? rfBRL(pago) : '';
  const renova = rfPgData(st && st.until);
  const itens = (def.itens||[]).slice(0,4);
  const email = (st && st.email) || '';

  return `
    <div class="rf-pg-topo plano-${escC(plano)}">
      ${rfPgConfeteHTML(plano, window.innerWidth<=760)}
      <span class="rf-pg-halo" aria-hidden="true"></span>
      <div class="rf-pg-topo-in">
        <span class="rf-pg-selo" aria-hidden="true">${c.emoji}</span>
        <span class="rf-pg-kicker">${escC(c.kicker)}</span>
        <h2 class="rf-pg-tit">${escC(c.titulo)}</h2>
        <p class="rf-pg-sub">${escC(c.sub)}</p>
      </div>
    </div>
    <div class="rf-pg-corpo">
      <div class="rf-pg-resumo">
        <span class="rf-pg-tile">${c.emoji}</span>
        <span class="rf-pg-resumo-id">
          <b>Plano ${escC(def.nome||plano)}</b>
          <span class="rf-pg-mono">${ciclo==='ano'?'ANUAL':'MENSAL'}${renova?' · RENOVA EM '+escC(renova.toUpperCase()):''}</span>
        </span>
        ${valor?`<span class="rf-pg-valor"><b>${escC(valor)}</b>
          <span class="rf-pg-mono">${ciclo==='ano'?'/ano':'/mês'}</span></span>`:''}
      </div>

      <span class="rf-pg-rot">${plano==='embaixador'?'A SUA CADEIRA CATIVA INCLUI':'O QUE ABRIU PARA VOCÊ'}</span>
      <div class="rf-pg-bens">${itens.map(i=>`
        <div class="rf-pg-bem"><span class="rf-pg-tick">✓</span><span>${escC(i)}</span></div>`).join('')}</div>

      <div class="rf-pg-rodape">
        <span class="rf-pg-recibo">
          <span class="rf-pg-mono">RECIBO</span>
          <span>${email?`O comprovante foi para <b>${escC(email)}</b>.`:'O comprovante foi para o e-mail da sua conta.'}</span>
        </span>
        <button type="button" class="rf-pg-cta plano-${escC(plano)}" onclick="rfPgSeguir('${escC(plano)}')">
          ${escC(c.cta)}</button>
      </div>
      <span class="rf-pg-legal">${escC(c.legal)}</span>
    </div>`;
}

/* ---- abrir, fechar, seguir ---- */
function rfPgFechar(){
  const el=document.querySelector('.rf-pg-fundo');
  if(el) el.remove();
  document.removeEventListener('keydown', rfPgEsc, true);
}
function rfPgEsc(ev){ if(ev.key==='Escape'){ ev.stopPropagation(); rfPgFechar(); } }
function rfPgSeguir(plano){
  const c=RF_PG_CONTEUDO[plano]||RF_PG_CONTEUDO.embaixador;
  rfPgFechar();
  try{ c.acao(); }catch(e){}
  if(typeof cdraw==='function') cdraw();
}
function rfPgDesenhar(html){
  let f=document.querySelector('.rf-pg-fundo');
  if(!f){
    f=document.createElement('div');
    f.className='rf-pg-fundo';
    /* clique no fundo fecha — no proprio modal nao, senao arrastar para ler fechava a tela */
    f.addEventListener('click', ev=>{ if(ev.target===f) rfPgFechar(); });
    document.body.appendChild(f);
    document.addEventListener('keydown', rfPgEsc, true);
  }
  f.innerHTML=`<div class="rf-pg-modal" role="dialog" aria-modal="true">${html}</div>`;
}
function rfPgEsperandoHTML(){
  return `<div class="rf-pg-topo plano-esperando">
      <div class="rf-pg-topo-in">
        <span class="rf-pg-selo" aria-hidden="true">⏳</span>
        <span class="rf-pg-kicker">UM SEGUNDO</span>
        <h2 class="rf-pg-tit">Confirmando o pagamento…</h2>
        <p class="rf-pg-sub">O banco já respondeu ao Stripe; estamos só esperando ele nos avisar.</p>
      </div>
    </div>`;
}
function rfPgNaoConfirmouHTML(){
  return `<div class="rf-pg-topo plano-esperando">
      <div class="rf-pg-topo-in">
        <span class="rf-pg-selo" aria-hidden="true">✉️</span>
        <span class="rf-pg-kicker">QUASE LÁ</span>
        <h2 class="rf-pg-tit">O pagamento está sendo confirmado.</h2>
        <p class="rf-pg-sub">Isso costuma levar segundos, mas pode demorar um pouco mais. Assim que
          confirmar, o plano aparece sozinho aqui e você recebe o comprovante por e-mail.</p>
      </div>
    </div>
    <div class="rf-pg-corpo">
      <div class="rf-pg-rodape">
        <span class="rf-pg-recibo"><span>Se em alguns minutos nada mudar, fale com a gente —
          nenhuma cobrança se perde.</span></span>
        <button type="button" class="rf-pg-cta plano-resenha" onclick="rfPgFechar()">Entendi</button>
      </div>
    </div>`;
}

/* ===== O PORTAO: SO' FESTEJA COM O PLANO NA MAO =====
   `?assinatura=ok` diz apenas que o jogador voltou do Stripe. Quem concede o plano e' o webhook,
   e ele e' assincrono. Perguntamos ao servidor ate' 15 vezes, de 2 em 2 segundos — 30 segundos,
   que e' muito mais do que o webhook costuma levar e ainda assim um tempo que se espera olhando
   para a tela. Passado isso, a tela diz a verdade em vez de fingir festa ou fingir erro. */
let RF_PG_TENTATIVAS = 0;
function rfPgVerificar(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  const plano = st.plan || st.plano;
  if(plano==='resenha' || plano==='embaixador'){
    rfPgDesenhar(rfPgCorpoHTML(plano, st));
    return;
  }
  if(++RF_PG_TENTATIVAS > 15){ rfPgDesenhar(rfPgNaoConfirmouHTML()); return; }
  if(typeof NET!=='undefined' && NET.carregarPlano) { try{ NET.carregarPlano(); }catch(e){} }
  setTimeout(rfPgVerificar, 2000);
}
function rfPgAbrir(){
  RF_PG_TENTATIVAS=0;
  rfPgDesenhar(rfPgEsperandoHTML());
  rfPgVerificar();
}
/* chamado no arranque (ver index.html): so' com `?assinatura=ok` na volta do Stripe. O parametro
   e' limpo do endereco para um F5 nao repetir a festa. */
function rfPgVoltaDoStripe(){
  let ok=false;
  try{ ok = new URLSearchParams(location.search).get('assinatura')==='ok'; }catch(e){}
  if(!ok) return false;
  try{
    const u=new URL(location.href); u.searchParams.delete('assinatura');
    history.replaceState({}, '', u.pathname + (u.search||'') + (u.hash||''));
  }catch(e){}
  setTimeout(rfPgAbrir, 400);   // deixa a tela do jogo desenhar por baixo antes da festa
  return true;
}
