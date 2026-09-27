/* ===== DE ONDE A PESSOA VEIO (origem do cadastro, 27/09/2026) =====
   O GA diz quantos vieram de cada canal, mas não QUEM. Este ficheiro anota, no navegador, o que
   trouxe a pessoa ao site (UTM, clique de anúncio, referrer, link de parceiro, convite da
   Resenha) e o cadastro leva isso para os metadados da conta (netAuthSignUp → options.data.origem).
   O painel lê de lá em admin_rf98.usuarios, e é o SQL (admin_rf98.origem_canal) que classifica
   em canal — aqui só se guarda o dado cru.

   Roda cedo e SÍNCRONO no <head> do jogo e das páginas de SEO (mesmo domínio = mesmo
   localStorage), porque o jogo limpa a query da barra de endereço logo ao abrir (main.js) e as
   UTMs se perderiam.

   Dois toques:
     · primeiro — a primeira visita com sinal; nunca é sobrescrito (mesma regra do ?ref=);
     · ultimo   — a visita com sinal mais recente antes do cadastro.
   "Sinal" = UTM, gclid/fbclid, ?ref=, ?sala= ou referrer de OUTRO site. Navegar entre páginas
   do próprio site ou voltar direto não apaga a campanha que trouxe a pessoa. Sem sinal nenhum
   e sem nada guardado, fica registado um toque "direto". */
(function(){
  var KEY = 'rf98:origem';
  var corta = function(v, n){ v = v == null ? '' : String(v).trim(); return v ? v.slice(0, n || 100) : null; };
  var q; try{ q = new URLSearchParams(location.search); }catch(e){ return; }
  var ref = '';
  try{
    if(document.referrer){
      var r = new URL(document.referrer);
      if(r.hostname && r.hostname !== location.hostname) ref = (r.hostname + r.pathname).slice(0, 150);
    }
  }catch(e){}
  var toque = {
    source:   corta(q.get('utm_source')),
    medium:   corta(q.get('utm_medium')),
    campaign: corta(q.get('utm_campaign')),
    content:  corta(q.get('utm_content')),
    term:     corta(q.get('utm_term')),
    gclid:    corta(q.get('gclid') || q.get('gbraid') || q.get('wbraid')),
    fbclid:   corta(q.get('fbclid')),
    ref:      corta(q.get('ref'), 32),
    sala:     (q.get('sala') || /^\/convite\//.test(location.pathname)) ? 1 : null,
    referrer: ref || null,
    pagina:   corta(location.pathname, 120),
    em:       new Date().toISOString()
  };
  var temSinal = !!(toque.source || toque.medium || toque.campaign || toque.gclid || toque.fbclid
                    || toque.ref || toque.sala || toque.referrer);
  Object.keys(toque).forEach(function(k){ if(toque[k] == null) delete toque[k]; });

  var g = null;
  try{ g = JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){}
  if(!g || typeof g !== 'object') g = {};
  var mudou = false;
  if(!g.primeiro){ g.primeiro = toque; mudou = true; }
  if(temSinal || !g.ultimo){ g.ultimo = toque; mudou = true; }
  if(mudou){ try{ localStorage.setItem(KEY, JSON.stringify(g)); }catch(e){} }

  /* O que vai para o cadastro. O client id do GA (cookie _ga) vai junto para cruzar a conta
     com o Analytics se um dia for preciso. */
  window.RF_ORIGEM = function(){
    var o = null;
    try{ o = JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){}
    if(!o || typeof o !== 'object') return null;
    try{
      var m = /(?:^|;\s*)_ga=GA\d\.\d\.([^;]+)/.exec(document.cookie);
      if(m) o.ga = m[1].slice(0, 40);
    }catch(e){}
    return o;
  };
})();
