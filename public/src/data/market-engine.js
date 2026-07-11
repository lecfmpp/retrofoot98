/* ============================================================================
   MOTOR DE MERCADO — camada pura (precificação, orçamento, valorização, moeda)
   ----------------------------------------------------------------------------
   Especificação Técnica v2.0 (Força, Finanças e Valorização do Jogador).

   MODELO HÍBRIDO (decisão de design):
   - Jogadores com dado REAL (Transfermarkt: a Série A brasileira e, no futuro, as
     ligas europeias importadas) mantêm o seu valor de mercado real como âncora.
     O MVL da liga só entra como RAZÃO no gatilho de vitrine (transferência entre
     ligas) e o fator idade na virada de temporada.
   - Jogadores PROCEDURAIS/novos (Séries B/C/D, adversários gerados, repositores de
     aposentadoria) são precificados pela tabela-âncora do spec: preço nasce coerente
     com OVR × MVL da liga × fator idade.

   MOEDA: todo o motor do jogo roda em R$ (Reais). A tabela-âncora do spec está em €,
   convertida por FX_BRL_PER_EUR. A moeda de EXIBIÇÃO (Reais/Dólares/Euros) é só uma
   camada de apresentação — nunca muda o valor guardado no estado.
   ============================================================================ */
(function(){
  'use strict';

  /* câmbio de referência usado pra converter as âncoras do spec (€) pro R$ interno
     do jogo. Calibrado pelo dado existente: Vitor Roque vale ~€38M no Transfermarkt
     e mv:235.600.000 no jogo → 235,6/38 ≈ 6,2. */
  const FX_BRL_PER_EUR = 6.2;

  /* fração do valor de mercado do elenco que vira orçamento anual de compras (spec §3.B).
     O motor legado usava rnd(0.10–0.18); centramos no 0.20 do spec. */
  const BUDGET_RATIO = 0.20;

  /* ---- LIGAS: Multiplicador de Vitrine (MVL) + faixas de OVR (spec §2) ----
     mvl é relativo (Premier=2.00 … Série D=0.08); usado como razão entre ligas.
     A engine interna usa os códigos de divisão brasileira 'A'/'B'/'C'/'D' — o mapa
     divisionToLeague() abaixo liga um ao outro. */
  const LEAGUES = {
    'ENG-1': { name:'Premier League',        mvl:2.00, ovrCommon:[78,88], ovrCap:95 },
    'ESP-1': { name:'La Liga',               mvl:1.85, ovrCommon:[76,86], ovrCap:95 },
    'ITA-1': { name:'Serie A',               mvl:1.60, ovrCommon:[75,85], ovrCap:92 },
    'GER-1': { name:'Bundesliga',            mvl:1.55, ovrCommon:[74,84], ovrCap:92 },
    'POR-1': { name:'Liga Portugal',         mvl:1.15, ovrCommon:[68,78], ovrCap:85 },
    'BRA-A': { name:'Brasileirão Série A',   mvl:0.90, ovrCommon:[72,79], ovrCap:85 },
    'ENG-2': { name:'Championship',          mvl:0.80, ovrCommon:[65,74], ovrCap:78 },
    'BRA-B': { name:'Brasileirão Série B',   mvl:0.45, ovrCommon:[64,70], ovrCap:75 },
    'BRA-C': { name:'Brasileirão Série C',   mvl:0.20, ovrCommon:[56,63], ovrCap:68 },
    'BRA-D': { name:'Brasileirão Série D',   mvl:0.08, ovrCommon:[45,55], ovrCap:60 },
  };
  /* MVL de fallback pra ligas ainda não modeladas (ex.: rivais CONMEBOL gerados na
     Libertadores/Sul-Americana) — entre a Série A e a Série B brasileiras. */
  const DEFAULT_MVL = 0.55;

  /* código de liga interno das 4 divisões brasileiras jogáveis */
  function divisionToLeague(division){ return 'BRA-'+division; }

  function leagueInfo(code){ return LEAGUES[code] || null; }
  function mvlOf(code){ const l=LEAGUES[code]; return l ? l.mvl : DEFAULT_MVL; }
  /* liga de um jogador: campo explícito p.lg quando existe (procedural/intl/europeu);
     senão assume Série A brasileira, que é o universo real padrão do jogo. */
  function leagueOfPlayer(p){ return (p && p.lg) || 'BRA-A'; }

  /* ---- ÂNCORA DE VALOR-BASE POR OVR (spec §3.A.I), em € ----
     Interpolação linear entre as bordas de cada faixa. Ex.: OVR 76 → €6,0M (borda
     inferior da faixa 76-80), OVR 80 → €14,0M, OVR 78 ≈ €10,0M. */
  const BASE_ANCHORS = [
    [45,     20000], [54,     80000],
    [55,    100000], [59,    300000],
    [60,    400000], [65,    900000],
    [66,   1000000], [70,   2200000],
    [71,   2500000], [75,   5500000],
    [76,   6000000], [80,  14000000],
    [81,  16000000], [85,  35000000],
    [86,  40000000], [89,  75000000],
    [90,  85000000], [95, 150000000],
  ];
  /* valor-base em € pra um OVR (0-100), interpolado e com clamp nas pontas */
  function baseValueEUR(ovr){
    const a = BASE_ANCHORS;
    if(ovr <= a[0][0]) return a[0][1];
    if(ovr >= a[a.length-1][0]) return a[a.length-1][1];
    for(let i=0;i<a.length-1;i++){
      const [x0,y0]=a[i], [x1,y1]=a[i+1];
      if(ovr>=x0 && ovr<=x1){
        const t=(x1===x0)?0:(ovr-x0)/(x1-x0);
        return y0 + t*(y1-y0);
      }
    }
    return a[a.length-1][1];
  }
  /* mesmo valor-base já convertido pra R$ interno do jogo */
  function baseValueBRL(ovr){ return baseValueEUR(ovr) * FX_BRL_PER_EUR; }

  /* ---- FATOR IDADE (spec §3.A.II) ---- */
  function ageFactor(age){
    const a = age||26;
    if(a <= 21) return 1.35;  // 17-21 promessa (bônus de especulação/revenda)
    if(a <= 27) return 1.00;  // 22-27 auge financeiro
    if(a <= 31) return 0.80;  // 28-31 maturidade (início da depreciação)
    if(a <= 35) return 0.50;  // 32-35 veterano
    return 0.25;              // 36+ fim de carreira
  }

  /* ---- VALOR DE MERCADO (spec §3.A) ----
     MV = ValorBase(OVR) × MVL(liga) × FatorIdade. Retorna em R$ (game-units).
     Usado pra precificar jogadores procedurais/novos e como base pra imports. */
  function marketValue(ovr, age, leagueCode){
    return Math.round(baseValueBRL(ovr) * mvlOf(leagueCode) * ageFactor(age));
  }

  /* ---- ORÇAMENTO DE TRANSFERÊNCIAS DO CLUBE (spec §3.B) ----
     soma do valor de mercado do elenco × BUDGET_RATIO. squad = array de {mv}. */
  function clubTransferBudget(squad, ratio){
    const sum = (squad||[]).reduce((s,p)=>s+(p.mv||0),0);
    return Math.round(sum * (ratio!=null ? ratio : BUDGET_RATIO));
  }

  /* ---- GATILHO DE VITRINE (spec §4) ----
     No momento em que a transferência fecha, o valor do passe é recalculado pelo MVL
     do novo clube — SEM mexer em atributo técnico. Reancoramos mv0 junto pra a
     valorização por força (evolvePlayer) seguir coerente. Muta o jogador in-place. */
  function revalueOnTransfer(p, newLeague){
    const oldLeague = leagueOfPlayer(p);
    const oldMvl = mvlOf(oldLeague), newMvl = mvlOf(newLeague);
    if(oldMvl && newMvl && oldMvl!==newMvl){
      const ratio = newMvl/oldMvl;
      p.mv  = Math.round((p.mv  || 0) * ratio);
      if(p.mv0!=null) p.mv0 = Math.round(p.mv0 * ratio);
    }
    p.lg = newLeague;
    return p;
  }

  /* razão de valorização entre duas ligas (destino/origem) — quanto o passe multiplica
     ao migrar de fromLeague pra toLeague. */
  function leagueValuationRatio(fromLeague, toLeague){
    return mvlOf(toLeague)/mvlOf(fromLeague);
  }

  /* ---- IA DE TRANSFERÊNCIAS (spec §5) ---- */
  /* Taxa de Prata da Casa: comprador de liga mais rica paga +20% sobre o valor de
     mercado ao clube vendedor de liga mais pobre. Retorna o multiplicador (1.20 ou 1.00). */
  function crossLeaguePremium(buyerLeague, sellerLeague){
    return mvlOf(buyerLeague) > mvlOf(sellerLeague) ? 1.20 : 1.00;
  }
  /* Regra da Incompatibilidade por Divisão: clube de liga inferior aceita vender se a
     oferta cobre o valor de mercado (com a taxa de prata aplicada quando cabível). */
  function acceptsCrossLeagueOffer(offer, player, buyerLeague){
    const sellerLeague = leagueOfPlayer(player);
    const floor = (player.mv||0) * crossLeaguePremium(buyerLeague, sellerLeague);
    return offer >= floor;
  }
  /* Rota de Trampolim (Portugal): interesse extra de clubes portugueses por atletas
     jovens (≤24) de OVR 72-78 nas Séries A/B do Brasil, como ponte de revenda. */
  function isTrampolineTarget(player, buyerLeague){
    if(buyerLeague!=='POR-1') return false;
    const sellerLeague = leagueOfPlayer(player);
    if(sellerLeague!=='BRA-A' && sellerLeague!=='BRA-B') return false;
    return (player.f>=72 && player.f<=78 && (player.age||30)<=24);
  }

  /* ---- MOEDA DE EXIBIÇÃO (camada de apresentação) ----
     rate = quantas unidades da moeda equivalem a 1 R$. O motor sempre guarda R$. */
  const CURRENCIES = {
    'Reais':   { sym:'R$',  iso:'BRL', rate:1 },
    'Dólares': { sym:'US$', iso:'USD', rate:1/5.4 },   // US$1 ≈ R$5,40
    'Euros':   { sym:'€',   iso:'EUR', rate:1/FX_BRL_PER_EUR },
  };
  function currencyInfo(name){ return CURRENCIES[name] || CURRENCIES['Reais']; }
  /* converte um valor em R$ (interno) pra unidade da moeda escolhida */
  function toDisplay(brl, name){ return (brl||0) * currencyInfo(name).rate; }
  /* converte um valor digitado na moeda escolhida de volta pra R$ interno */
  function toBRL(display, name){ return Math.round((display||0) / currencyInfo(name).rate); }

  /* ---- export global (script clássico, mesmo padrão de window.GAME_DATA) ---- */
  window.MARKET = {
    FX_BRL_PER_EUR, BUDGET_RATIO, DEFAULT_MVL, LEAGUES, CURRENCIES,
    divisionToLeague, leagueInfo, mvlOf, leagueOfPlayer,
    baseValueEUR, baseValueBRL, ageFactor, marketValue,
    clubTransferBudget, revalueOnTransfer, leagueValuationRatio,
    crossLeaguePremium, acceptsCrossLeagueOffer, isTrampolineTarget,
    currencyInfo, toDisplay, toBRL,
  };
})();
