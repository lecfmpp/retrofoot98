/* RASTRO — EVENTOS DO FUNIL (29/09/2026)
   Só as etapas do funil do painel (Analytics → Visitas e funil), para o Rastro montar o mesmo
   funil por sessão gravada:  visita → conta → jogou → trava → pro.
   Toda chamada passa por RF_FUNIL(nome, props): acrescenta `etapa`, nunca deixa erro subir para o
   jogo e, com `umaVez`, dispara no máximo uma vez por navegador+conta.
   Privacidade: só ids, nomes de tela e rótulos; nunca e-mail, nome, WhatsApp nem texto digitado. */
(function(){
  var ETAPA = {
    landing_cta_click:'visita', site_para_jogo:'visita',
    cadastro_inicio:'conta', cadastro_concluido:'conta', login_ok:'conta', login_erro:'conta',
    onboarding_passo:'jogou', clube_escolhido:'jogou', primeiro_jogo_concluido:'jogou', temporada_concluida:'jogou',
    paywall_exibido:'trava', paywall_fechou:'trava', paywall_seguiu_gratis:'trava',
    paywall_abriu_depoimento:'trava', paywall_depoimento_enviado:'trava',
    paywall_abriu_post:'trava', paywall_post_enviado:'trava',
    paywall_clicou_pro:'pro', checkout_iniciado:'pro', pro_ativado:'pro'
  };
  function uma(nome){
    var k = 'rf98:funil:' + nome + ':' + (window.__rastroId || 'anon');
    try{ if(localStorage.getItem(k)) return false; localStorage.setItem(k, '1'); }catch(e){}
    return true;
  }
  window.RF_FUNIL = function(nome, props, umaVez){
    try{
      if(typeof window.rastro !== 'function') return;
      if(umaVez && !uma(nome)) return;
      var p = { etapa: ETAPA[nome] || null };
      if(props) for(var k in props) if(Object.prototype.hasOwnProperty.call(props,k)) p[k] = props[k];
      window.rastro('track', nome, p);
    }catch(e){}
  };

  /* Telas do jogo: chamada no começo de cdraw() (ui/main.js). Só age quando a tela MUDA. */
  var PASSOS = { modo:1, modalidade:1, paises:1, sorteio:1, escolhaclubes:1, boasvindas:1 };
  var ultima = null;
  window.RF_FUNIL_TELA = function(){
    try{
      if(typeof CL === 'undefined' || !CL) return;
      var t = CL.screen;
      if(t === ultima) return;
      ultima = t;
      if(t === 'login' && CL.auth && CL.auth.mode === 'signup') RF_FUNIL('cadastro_inicio');
      else if(PASSOS[t]) RF_FUNIL('onboarding_passo', { passo:t });
      else if(t === 'main' && typeof S !== 'undefined' && S && S.table && S.clubId && S.table[S.clubId] && S.table[S.clubId].P > 0)
        RF_FUNIL('primeiro_jogo_concluido', { modo: CL.online ? 'resenha' : 'solo' }, true);
    }catch(e){}
  };
})();
