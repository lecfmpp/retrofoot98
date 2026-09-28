/* ===== LINK DIRETO DO PRO (28/09/2026) =====
   retrofoot.com.br/?pro  (ou ?pro=ano, que já abre no anual) — o botão dos e-mails de conversão.
   Assim que a sessão é conhecida, abre a oferta do Pro (rfUpPopupPlano):
   · quem JÁ é Pro recebe só um aviso;
   · quem está logado escolhe mensal/anual e cartão/Pix e vai ao Stripe pelo checkout DA PRÓPRIA
     CONTA (criar-checkout). Nada de link de pagamento solto do Stripe: esse não sabe quem pagou,
     e o plano não cairia na conta;
   · quem NÃO está logado vê a oferta e, ao clicar em assinar, o rfPlanoCta manda entrar/criar a
     conta primeiro e retoma o checkout sozinho depois (rf98:planoIntencao → rfPlanoIntencaoRetomar).
   Só o parâmetro `pro` sai do endereço: os utm_* ficam (o rastreamento de origem ainda os lê). */
(function(){
  let ciclo = 'mes';
  try{
    const u = new URL(location.href);
    if(!u.searchParams.has('pro')) return;
    if(u.searchParams.get('pro') === 'ano') ciclo = 'ano';
    u.searchParams.delete('pro');
    history.replaceState({}, '', u.pathname + u.search + u.hash);
  }catch(e){ return; }

  document.addEventListener('DOMContentLoaded', async ()=>{
    try{ if(typeof netInitSupabase === 'function') await netInitSupabase(); }catch(e){}
    /* o netInitSupabase devolve na hora se outra chamada já criou o client — a sessão e o plano
       ainda podem estar a chegar. Um respiro, e o plano pedido de novo para não vender o Pro a
       quem já o tem. */
    await new Promise(r => setTimeout(r, 1200));
    const st = (typeof NET !== 'undefined' && NET.authStatus) ? NET.authStatus() : { loggedIn:false };
    if(st.loggedIn && typeof netCarregarPlano === 'function'){ try{ await netCarregarPlano(); }catch(e){} }
    if(typeof rfUpPlanoAtual === 'function' && rfUpPlanoAtual() === 'pro'){
      if(typeof toastC === 'function') toastC('Você já é Pro. Bom jogo!');
      return;
    }
    if(typeof RF_UP !== 'undefined') RF_UP.ciclo = ciclo;
    /* 'email' é a "trava" de origem: aparece como "jogo · email · plano Pro" no lead/checkout */
    if(typeof rfUpPopupPlano === 'function') rfUpPopupPlano('pro', 'email');
  });
})();
