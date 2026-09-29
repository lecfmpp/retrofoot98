/* =====================================================================
   PATROCÍNIO MASTER (29/09/2026) — receita extra, pagamento único
   ---------------------------------------------------------------------
   O marketing do clube fecha, de última hora, um patrocinador master: R$ 2,5 mi no fim da
   1ª temporada da carreira e R$ 3,5 mi no fim da 2ª. Da 3ª em diante não existe. O valor é o
   mesmo para todos. Pacote de design: dinheiro-extra-patrocinio-temp1e2.zip.

   QUANDO: na PENÚLTIMA rodada do campeonato (S.round >= sched.length-2), UMA vez por temporada,
   antes de qualquer lembrete de plano / aviso de trava (rfUpMarcoRodada só corre depois do aceite).
   Só abre com a tela do clube livre (rfUpTelaLivre) — nunca por cima de partida, coletiva, momento.

   O QUE FICA GRAVADO: S.patroMaster = { t1:{ msg, empresa, feito, valor, season }, t2:{...} }.
   'patroMaster' está em CAREER_KEYS (engine/core.js): na Resenha viaja no assento, e cada treinador
   recebe o seu, no seu clube. `msg` (0..7) é sorteada uma vez e não muda ao recarregar.

   O DINHEIRO: uma fonte só. S.budget += valor, commitBudget() (publica na Resenha) e um
   lançamento no extrato (pushFinanceEntry, parcela `patrocinioMaster`), que é de onde Finanças
   lê "Patrocínio Master · empresa". O cabeçalho (rfBandHTML) lê S.budget — nada de mexer só no
   texto: a contagem animada parte do valor antigo e termina no S.budget.

   A "TEMPORADA DA CARREIRA" é a mesma conta do paywall: rfPwIniciadas() (rf26-paywall.js).
   ===================================================================== */
const RF_PM_VALOR = { 1:2500000, 2:3500000 };
const RF_PM_EMPRESAS = {
  et:{ nome:'Esporte Total', logo:'img/patrocinio-master/esporte-total.webp' },
  sf:{ nome:'SuperFootball', logo:'img/patrocinio-master/superfootball.webp' }
};
const RF_PM_MSGS = [
  { e:'et', historia:'O time de marketing fechou com a Esporte Total nesta semana. A loja queria uma camisa que aparecesse na reta final do campeonato e viu o clube subir na tabela rodada após rodada.',
    contador:'Reforce o elenco na próxima janela. Dois bons titulares no meio-campo resolvem mais do que dez reservas.',
    citacao:'Queremos a nossa marca no peito de quem joga com raça. Que seja o começo de muitos anos de sucesso e de taça levantada juntos.',
    exec:'Ricardo Almeida', cargo:'Presidente da Esporte Total' },
  { e:'sf', historia:'A SuperFootball procurava um clube com torcida barulhenta nas redes. Os jogos do clube bateram recorde de audiência na transmissão e o acordo saiu em 48 horas.',
    contador:'Renove agora o contrato dos jogadores-chave, antes que o mercado abra e os rivais venham buscar.',
    citacao:'A nossa comunidade vive futebol o ano inteiro. Estar na camisa deste clube é falar com quem mais torce. Esperamos muitos anos de sucesso nessa parceria.',
    exec:'Marina Coutinho', cargo:'CEO da SuperFootball' },
  { e:'et', historia:'Um patrocinador desistiu em cima da hora e o marketing ligou pra Esporte Total no mesmo dia. Em uma reunião o espaço master da camisa estava vendido.',
    contador:'Invista no estádio. Mais lugares nas arquibancadas aumentam a bilheteria já na próxima temporada.',
    citacao:'Quando o marketing do clube nos procurou, não pensamos duas vezes. Queremos a Esporte Total em cada gol, em cada foto, por muitas temporadas.',
    exec:'Paulo Menezes', cargo:'Diretor de Marketing da Esporte Total' },
  { e:'sf', historia:'O marketing levou o clube a um evento de e-sports e apresentou a torcida jovem que acompanha os jogos pelo celular. A SuperFootball fechou o acordo no fim do evento.',
    contador:'Aposte nas categorias de base. Revelar um jogador em casa sai bem mais barato do que contratar.',
    citacao:'Os nossos jogadores já torciam por este clube antes de nós chegarmos. Queremos crescer juntos, dentro e fora de campo, por muitos anos.',
    exec:'Felipe Kawashima', cargo:'Gerente de Marketing da SuperFootball' },
  { e:'et', historia:'Tudo começou com a camisa comemorativa que o marketing lançou com a Esporte Total. Esgotou em um fim de semana e a empresa pediu para ficar com o espaço master.',
    contador:'Se houver dívida, quite primeiro. Sair do vermelho antes de gastar dá fôlego para a temporada inteira.',
    citacao:'A torcida mostrou que veste a camisa de verdade. É com essa gente que a Esporte Total quer estar, e esperamos anos de muito sucesso.',
    exec:'Helena Barros', cargo:'CEO da Esporte Total' },
  { e:'sf', historia:'O presidente da SuperFootball assistiu a um jogo no estádio a convite do marketing. Saiu do camarote com o contrato de patrocínio acertado.',
    contador:'Guarde uma parte como reserva. A folha dos primeiros meses fica garantida mesmo se a bilheteria cair.',
    citacao:'Vi o estádio cantar do primeiro ao último minuto. Uma marca precisa estar onde existe paixão, e aqui sobra. Que venham muitos anos de parceria.',
    exec:'Augusto Ferraz', cargo:'Presidente da SuperFootball' },
  { e:'et', historia:'O marketing apresentou à Esporte Total os números de público e de vendas de camisa desta temporada. A empresa decidiu fechar antes do fim do campeonato.',
    contador:'Contrate um atacante de qualidade. Foram os gols que faltaram para ganhar os jogos apertados.',
    citacao:'Os números do clube falaram por si. A Esporte Total chega para ficar, e esperamos muitas temporadas de sucesso lado a lado.',
    exec:'Carla Nogueira', cargo:'Gerente de Marketing da Esporte Total' },
  { e:'sf', historia:'Um lance do clube viralizou nas redes e a SuperFootball pediu uma reunião no dia seguinte. O marketing fechou o espaço master da camisa em poucas horas.',
    contador:'Melhore o centro de treinamento. Jogador bem cuidado se machuca menos e rende mais na temporada.',
    citacao:'Aquele lance rodou o país inteiro. Queremos a SuperFootball junto de um clube que faz o torcedor levantar da cadeira, por muitos e muitos anos.',
    exec:'Rafael Lins', cargo:'Diretor de Marketing da SuperFootball' }
];

/* ---------- a regra: qual temporada da carreira, e se já é a hora ---------- */
function rfPmNumero(){
  try{ return (typeof rfPwIniciadas==='function') ? rfPwIniciadas() : 0; }catch(e){ return 0; }
}
function rfPmReg(n){ return (typeof S!=='undefined' && S && S.patroMaster && S.patroMaster['t'+n]) || null; }
/* o número da temporada (1 ou 2) se o patrocínio está devido agora e ainda não foi aceito; senão 0 */
function rfPmPendente(){
  if(typeof S==='undefined' || !S || typeof CL==='undefined' || CL.screen!=='main') return 0;
  const len=(S.sched&&S.sched.length)||0;
  if(len<4 || S.finished) return 0;
  if((S.round||0) < len-2) return 0;                 // penúltima rodada em diante
  const n=rfPmNumero();
  if(!RF_PM_VALOR[n]) return 0;                      // 3ª temporada em diante: não existe
  const r=rfPmReg(n);
  return (r && r.feito) ? 0 : n;
}
/* a mensagem sorteada da temporada, gravada no save para não mudar ao recarregar */
function rfPmMensagem(n){
  S.patroMaster=S.patroMaster||{};
  let r=S.patroMaster['t'+n];
  if(!r || typeof r.msg!=='number' || !RF_PM_MSGS[r.msg]){
    const msg=Math.floor(Math.random()*RF_PM_MSGS.length);
    r=S.patroMaster['t'+n]=Object.assign(r||{}, { msg, empresa:RF_PM_EMPRESAS[RF_PM_MSGS[msg].e].nome, feito:false, season:S.season });
    try{ if(typeof CL!=='undefined' && CL.online){ if(typeof persistCareer==='function') persistCareer(); } else if(typeof rfGravar==='function') rfGravar(); }catch(e){}
  }
  return RF_PM_MSGS[r.msg];
}
/* a empresa do último patrocínio aceito — o rótulo da linha em Finanças (rf26-financas.js) */
function rfPmEmpresa(){
  const pm=(typeof S!=='undefined' && S && S.patroMaster) || {};
  const r=pm.t2&&pm.t2.feito ? pm.t2 : pm.t1&&pm.t1.feito ? pm.t1 : null;
  return (r && r.empresa) || '';
}

/* ---------- quando olhar: depois de cada rodada e a cada redesenho da tela do clube ---------- */
let RF_PM_TIMER=null, RF_PM_ABERTO=false;
function rfPmAgendar(tentativa){
  if(RF_PM_ABERTO) return;
  if(RF_PM_TIMER){ clearTimeout(RF_PM_TIMER); RF_PM_TIMER=null; }
  tentativa=tentativa||0;
  RF_PM_TIMER=setTimeout(()=>{
    RF_PM_TIMER=null;
    try{
      const n=rfPmPendente(); if(!n || RF_PM_ABERTO) return;
      if(typeof rfUpTelaLivre==='function' && !rfUpTelaLivre()){
        if(tentativa<60) rfPmAgendar(tentativa+1);   // ~3 min de paciência; o próximo redesenho tenta de novo
        return;
      }
      rfPmAbrir(n);
    }catch(e){ console.warn('patrocínio master:', e); }
  }, tentativa ? 3000 : 1200);
}
/* barato: chamado por todo cdraw da tela do clube; só agenda se houver algo devido */
function rfPmTick(){
  if(RF_PM_ABERTO || RF_PM_TIMER) return;
  if(rfPmPendente()) rfPmAgendar(0);
}

/* ---------- o popup ---------- */
function rfPmMi(v,casas){ return 'R$ '+(v/1e6).toFixed(casas).replace('.',','); }
function rfPmCheio(v){ return 'R$ '+Math.round(v).toLocaleString('pt-BR'); }
function rfPmCSS(){
  if(document.getElementById('rf-pm-css')) return;
  const st=document.createElement('style'); st.id='rf-pm-css';
  st.textContent=`
@keyframes rfPmFundo{from{opacity:0}to{opacity:1}}
@keyframes rfPmSobe{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:none}}
.rf-pm-fundo{position:fixed;inset:0;z-index:9000;background:rgba(6,17,43,.62);display:flex;align-items:center;justify-content:center;
  padding:20px;box-sizing:border-box;overflow:auto;animation:rfPmFundo .2s ease}
.rf-pm{width:600px;max-width:100%;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 40px 80px -30px rgba(0,0,0,.7);
  animation:rfPmSobe .3s ease;display:flex;flex-direction:column;margin:auto;font-family:var(--font-sans,'Space Grotesk',system-ui,sans-serif);text-align:left}
.rf-pm-topo{background:linear-gradient(120deg,#06112b,#0e2f66 52%,#17458F);padding:18px 24px 16px;display:flex;flex-direction:column;gap:6px;position:relative}
.rf-pm-topo::before{content:'';position:absolute;left:0;top:0;bottom:0;width:6px;background:#F2B90C}
.rf-pm-kicker{font:700 10.5px var(--font-mono,'IBM Plex Mono',monospace);letter-spacing:.18em;color:#F2B90C}
.rf-pm-tit{font-size:24px;font-weight:700;color:#fff;letter-spacing:-.02em;line-height:1.15;text-wrap:balance}
.rf-pm-lockup{display:flex;align-items:center;justify-content:center;gap:28px;padding:22px 24px 6px}
.rf-pm-escudo{width:104px;height:104px;flex:0 0 auto;display:flex;align-items:center;justify-content:center}
.rf-pm-escudo>*{max-width:100%;max-height:100%}
.rf-pm-escudo img{width:104px;height:104px;object-fit:contain}
.rf-pm-linha{width:1px;height:84px;background:#4a5058;opacity:.45;flex:0 0 auto}
.rf-pm-logo{width:120px;height:110px;object-fit:contain;flex:0 0 auto}
.rf-pm-corpo{display:flex;flex-direction:column;gap:14px;padding:12px 24px 22px}
.rf-pm-hist{font-size:14.5px;color:#3a473f;line-height:1.55;text-wrap:pretty;text-align:center}
.rf-pm-valor{display:flex;align-items:center;gap:14px;background:#f6f8f5;border:1px solid #e6ece4;border-radius:16px;padding:14px 16px;flex-wrap:wrap}
.rf-pm-valor-t{flex:1;min-width:160px;display:flex;flex-direction:column;gap:2px}
.rf-pm-valor-t b{font:700 10px var(--font-mono,'IBM Plex Mono',monospace);letter-spacing:.12em;color:#8b978d;white-space:nowrap}
.rf-pm-valor-t span{font-size:12px;color:#78877c;line-height:1.4}
.rf-pm-valor-n{font:700 28px var(--font-mono,'IBM Plex Mono',monospace);color:#12201a;white-space:nowrap}
.rf-pm-cit{display:flex;flex-direction:column;gap:10px;border:1px solid #eef1ee;border-radius:16px;padding:14px 16px}
.rf-pm-cit q{font:italic 15px/1.5 Georgia,serif;color:#12201a;text-wrap:pretty;quotes:none}
.rf-pm-cit-n{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rf-pm-cit-n b{font-size:13px;color:#12201a;white-space:nowrap}
.rf-pm-cit-n i{width:3px;height:3px;border-radius:99px;background:#c3ccc4}
.rf-pm-cit-n span{font-size:12px;color:#78877c}
.rf-pm-cont{display:flex;align-items:flex-start;gap:10px;background:#fff8e0;border-radius:14px;padding:12px 14px}
.rf-pm-cont>span:first-child{font-size:16px;line-height:1.3;flex:0 0 auto}
.rf-pm-cont div{display:flex;flex-direction:column;gap:2px;min-width:0}
.rf-pm-cont b{font:700 10px var(--font-mono,'IBM Plex Mono',monospace);letter-spacing:.12em;color:#8a6a00;white-space:nowrap}
.rf-pm-cont span{font-size:13px;color:#4a3c00;line-height:1.5;text-wrap:pretty}
.rf-pm-cta{height:48px;border:0;border-radius:12px;background:#F2B90C;color:#17458F;font:700 15px var(--font-sans,'Space Grotesk',system-ui,sans-serif);
  display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;box-shadow:0 10px 22px -12px rgba(18,32,26,.6)}
.rf-pm-cta:hover{background:#ffcb2e}
.rf-pm-cta:disabled{opacity:.7;cursor:default}
.rf-moeda-voo{position:fixed;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:99px;z-index:9100;pointer-events:none;
  display:flex;align-items:center;justify-content:center;font:700 13px var(--font-mono,'IBM Plex Mono',monospace);color:#6b5000;opacity:0;
  background:radial-gradient(circle at 35% 30%,#fff1a8,#F2B90C 55%,#c9971a);border:2px solid #a37800;box-sizing:border-box;box-shadow:0 6px 12px -4px rgba(0,0,0,.45)}
@media (max-width:560px){
  .rf-pm-fundo{padding:12px}
  .rf-pm-lockup{gap:16px;padding:18px 16px 4px}
  .rf-pm-escudo,.rf-pm-escudo img{width:84px;height:84px}
  .rf-pm-logo{width:96px;height:88px}
  .rf-pm-linha{height:68px}
  .rf-pm-tit{font-size:20px}
  .rf-pm-topo{padding:16px 18px 14px}
  .rf-pm-corpo{padding:10px 16px 18px}
  .rf-pm-valor-n{font-size:24px}
}`;
  document.head.appendChild(st);
}
function rfPmAbrir(n){
  if(RF_PM_ABERTO) return;
  rfPmCSS();
  const m=rfPmMensagem(n), emp=RF_PM_EMPRESAS[m.e], valor=RF_PM_VALOR[n];
  const cl=(typeof clubOf==='function' && clubOf(CL.clubId)) || {short:'seu time'};
  RF_PM_ABERTO=true;
  const f=document.createElement('div');
  f.className='rf-pm-fundo'; f.id='rf-pm-fundo';
  f.setAttribute('role','dialog'); f.setAttribute('aria-modal','true');
  f.innerHTML=`<div class="rf-pm">
    <div class="rf-pm-topo">
      <span class="rf-pm-kicker">PATROCÍNIO MASTER · RECEITA EXTRA</span>
      <span class="rf-pm-tit">O marketing fechou um patrocinador master para ${escC(String((S.season||0)+1))}</span>
    </div>
    <div class="rf-pm-lockup">
      <span class="rf-pm-escudo">${rfCrest(cl,104)}</span>
      <span class="rf-pm-linha"></span>
      <img class="rf-pm-logo" src="${emp.logo}" alt="${escC(emp.nome)}">
    </div>
    <div class="rf-pm-corpo">
      <span class="rf-pm-hist">${escC(m.historia)}</span>
      <div class="rf-pm-valor">
        <span class="rf-pm-valor-t"><b>PAGAMENTO ÚNICO · ${escC(emp.nome.toUpperCase())}</b><span>Entra no caixa assim que você aceitar.</span></span>
        <span class="rf-pm-valor-n" id="rf-pm-valor">${rfPmCheio(valor)}</span>
      </div>
      <div class="rf-pm-cit">
        <q>${escC(m.citacao)}</q>
        <span class="rf-pm-cit-n"><b>${escC(m.exec)}</b><i></i><span>${escC(m.cargo)}</span></span>
      </div>
      <div class="rf-pm-cont"><span>💼</span><div><b>SUGESTÃO DO CONTADOR</b><span>${escC(m.contador)}</span></div></div>
      <button type="button" class="rf-pm-cta" id="rf-pm-cta" onclick="rfPmAceitar(${n})">✓ Aceitar patrocínio</button>
    </div>
  </div>`;
  document.body.appendChild(f);
  try{ document.getElementById('rf-pm-cta').focus({preventScroll:true}); }catch(e){}
}

/* ---------- aceitar: dinheiro (uma fonte só), extrato, gravação, animação, e só então o resto ---------- */
function rfPmAceitar(n){
  const btn=document.getElementById('rf-pm-cta');
  if(!btn || btn.disabled) return;
  btn.disabled=true;
  const r=rfPmReg(n); if(r && r.feito){ rfPmFechar(); return; }
  const valor=RF_PM_VALOR[n]; if(!valor){ rfPmFechar(); return; }
  const antes=S.budget||0;
  const origem=document.getElementById('rf-pm-valor');
  const emp=(r && r.empresa) || RF_PM_EMPRESAS[RF_PM_MSGS[(r&&r.msg)||0].e].nome;
  /* 1) o caixa — a fonte de verdade que o cabeçalho e Finanças leem */
  S.budget=antes+valor;
  S.patroMaster=S.patroMaster||{};
  S.patroMaster['t'+n]=Object.assign(S.patroMaster['t'+n]||{}, { feito:true, valor, empresa:emp, season:S.season });
  /* 2) o extrato: aparece em Finanças › Receitas como "Patrocínio Master · empresa" */
  try{ pushFinanceEntry({ income:valor, patrocinioMaster:valor, log:['🤝 Patrocínio Master · '+emp+': '+(typeof fmt==='function'?fmt(valor):rfPmCheio(valor))] }); }catch(e){ console.warn(e); }
  try{ commitBudget(); }catch(e){}
  CL._pmDelta={ round:S.round, valor };                  // o "+R$ 2,5 mi" verde no cabeçalho até a rodada seguinte
  /* 3) grava (solo: save local + nuvem; Resenha: assento) */
  try{ if(CL.online){ if(typeof persistCareer==='function') persistCareer(); } else if(typeof rfGravar==='function') rfGravar(true); }catch(e){}
  /* 4) animação: precisa das coordenadas do valor, então é chamada ANTES de esconder o modal */
  const depois=()=>{
    RF_PM_ABERTO=false;
    try{ toastC('✓ '+rfPmMi(valor,1)+' mi no caixa. Finanças atualizadas.','success'); }catch(e){}
    try{ cdraw(); }catch(e){}
    /* 5) só agora o que vinha depois: lembrete de plano / aviso das travas */
    try{ if(typeof rfUpMarcoRodada==='function') setTimeout(rfUpMarcoRodada, 800); }catch(e){}
  };
  rfPmAnimar(origem, valor, antes, ()=>{ rfPmFechar(); depois(); });
  const f=document.getElementById('rf-pm-fundo'); if(f){ f.style.transition='opacity .2s'; f.style.opacity='0'; }   // some, mas segue bloqueando cliques até o fim da animação
}
function rfPmFechar(){ const f=document.getElementById('rf-pm-fundo'); if(f) f.remove(); RF_PM_ABERTO=false; }

/* ---------- animação de moedas + contagem no cabeçalho + som ---------- */
let RF_PM_CTX=null;
function rfPmSomLigado(){ return !!(typeof S!=='undefined' && S && S.config && S.config.sound); }
function rfPmAudio(){
  try{ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null;
    RF_PM_CTX=RF_PM_CTX||new AC(); if(RF_PM_CTX.state==='suspended') RF_PM_CTX.resume(); return RF_PM_CTX; }catch(e){ return null; }
}
function rfPmPlim(ctx,t,forte){
  const g=ctx.createGain(); g.connect(ctx.destination);
  g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(forte?.22:.12,t+.008);
  g.gain.exponentialRampToValueAtTime(.0001,t+(forte?.6:.28));
  [[988,0],[1319,.055]].forEach(([fr,d])=>{
    const o=ctx.createOscillator(), lp=ctx.createBiquadFilter();
    o.type='square'; o.frequency.setValueAtTime(fr*(forte?1.335:1),t+d);
    lp.type='lowpass'; lp.frequency.value=3200;
    o.connect(lp); lp.connect(g); o.start(t+d); o.stop(t+(forte?.62:.3));
  });
}
function rfPmAnimar(origemEl, valor, antes, onFim){
  const alvoEl=document.getElementById('hdr-caixa');
  const valorTxt=alvoEl && alvoEl.querySelector('.hdr-caixa__valor');
  const reduz=window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtV=(typeof rfDin==='function') ? rfDin : (v=>rfPmMi(v,2)+' mi');
  if(!alvoEl || !valorTxt){ setTimeout(onFim, 200); return; }   // sem cabeçalho na tela: só segue
  /* o cabeçalho pode estar fora da tela (celular): sobe antes de medir */
  const dst0=alvoEl.getBoundingClientRect();
  if(dst0.top<0 || dst0.bottom>window.innerHeight){ try{ window.scrollTo({top:0,behavior:'auto'}); }catch(e){} }
  const src=origemEl.getBoundingClientRect(), dst=alvoEl.getBoundingClientRect();
  const N=reduz?0:16, DUR=820, PASSO=70, INI=120+DUR;
  const FIM=INI+Math.max(0,N-1)*PASSO+200;
  const ctx=rfPmSomLigado()?rfPmAudio():null;
  const x0=src.left+src.width/2, y0=src.top+src.height/2, x1=dst.left+38, y1=dst.top+dst.height/2;
  valorTxt.textContent=fmtV(antes);                       // parte do valor antigo
  for(let i=0;i<N;i++){
    const m=document.createElement('div');
    m.className='rf-moeda-voo'; m.textContent='$';
    document.body.appendChild(m);
    const sx=x0+Math.sin(i*2.3)*70, sy=y0+Math.cos(i*1.7)*18;
    const mx=(sx+x1)/2+Math.sin(i*1.3)*90, my=Math.min(sy,y1)-120-(i%4)*25;
    const a=m.animate([
      {transform:`translate(${sx}px,${sy}px) scale(.4) rotate(0deg)`,opacity:0},
      {transform:`translate(${sx}px,${sy-30}px) scale(1.1) rotate(90deg)`,opacity:1,offset:.15},
      {transform:`translate(${mx}px,${my}px) scale(1) rotate(260deg)`,opacity:1,offset:.55},
      {transform:`translate(${x1}px,${y1}px) scale(.55) rotate(420deg)`,opacity:.9}
    ],{duration:DUR,delay:120+i*PASSO,easing:'cubic-bezier(.45,0,.3,1)',fill:'both'});
    a.onfinish=()=>{ m.remove(); alvoEl.classList.remove('is-bate'); void alvoEl.offsetWidth; alvoEl.classList.add('is-bate'); };
    if(ctx) rfPmPlim(ctx, ctx.currentTime+(120+i*PASSO+DUR)/1000, false);
  }
  if(ctx) rfPmPlim(ctx, ctx.currentTime+FIM/1000, true);   // "cha-ching" final
  setTimeout(()=>{
    alvoEl.classList.add('is-recebendo');
    const t0=performance.now(), T=FIM-INI;
    (function tick(now){
      const k=Math.min(1,(now-t0)/T), e=1-Math.pow(1-k,3);
      valorTxt.textContent=fmtV(antes+valor*e);
      if(k<1) requestAnimationFrame(tick);
    })(t0);
  }, INI);
  setTimeout(()=>{
    valorTxt.textContent=fmtV(antes+valor);
    alvoEl.classList.remove('is-recebendo','is-bate');
    const d=alvoEl.querySelector('.hdr-caixa__delta');
    if(d){ d.textContent='+'+String(fmtV(valor)).replace(/,(\d)0 /,',$1 '); d.hidden=false; }
    onFim&&onFim();
  }, FIM);
}
