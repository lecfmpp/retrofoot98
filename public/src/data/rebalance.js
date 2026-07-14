/* ============================================================================
   REBALANCE (item 4) — reestrutura força, valor, salário, caixa e estádio pra
   "nivelar mais as divisões e deixar as competições mais reais".

   IDEIA CENTRAL — dupla representação de força:
     • p.rawF  (escala ANTIGA ~40-95): dirige a GERAÇÃO DE ATRIBUTOS (genAttrs) e o
       recálculo por crescimento (levelToForce/forceToLevel). Fica intocada — o
       sistema de atributos é provado e calibrado nessa escala.
     • p.f     (escala NOVA 1-99): dirige o MOTOR de partida (ratings), a exibição,
       o valor de mercado e o salário. É REBAL.force(p.rawF).

   As divisões já têm distribuições de força reais SEPARADAS (Série A ~72-79,
   B ~64-70, C ~56-63, D ~45-55; ligas europeias mais altas), então UMA única
   função monotônica remapeia todas as faixas de uma vez, preservando a ordem
   relativa (jogador melhor continua melhor) e mapeando por QUALIDADE — um craque
   numa divisão baixa sobe de faixa, como na vida real. O motor é baseado em
   RAZÕES (atk/def, diferença de meio), então comprimir a escala apenas NIVELA
   mais as partidas, sem quebrar o equilíbrio.

   Categorias de força (referência do usuário):
     Série A 38-49 · B 25-37 · C 13-24 · D 3-12
     Estrela 50-69 · Craque Nacional 70-89 · Craque Mundial 90-99 · Sem divisão 1-2
   ============================================================================ */
(function(){
  'use strict';

  /* interpolação linear em âncoras [[x,y],...] ordenadas por x; extrapola nas pontas */
  function interp(anchors, x){
    const n=anchors.length;
    if(x<=anchors[0][0]){
      const [x0,y0]=anchors[0],[x1,y1]=anchors[1];
      return y0 + (x-x0)/(x1-x0)*(y1-y0);
    }
    if(x>=anchors[n-1][0]){
      const [x0,y0]=anchors[n-2],[x1,y1]=anchors[n-1];
      return y0 + (x-x0)/(x1-x0)*(y1-y0);
    }
    for(let i=0;i<n-1;i++){
      const [x0,y0]=anchors[i],[x1,y1]=anchors[i+1];
      if(x>=x0 && x<=x1){ const t=(x1===x0)?0:(x-x0)/(x1-x0); return y0+t*(y1-y0); }
    }
    return anchors[n-1][1];
  }

  /* ---- 1. REMAP DE FORÇA POR DIVISÃO: raw (40-95) -> escala NOVA (1-99) ----
     As divisões têm faixas de força reais que SE SOBREPÕEM (Série A fraca ~ Série C forte),
     então um remap global esmagaria os fracos e abriria goleadas. O remap POR DIVISÃO
     comprime cada divisão na sua faixa — é o que "nivela" as partidas dentro da divisão.
     Cada divisão: janela de força-bruta do jogador REGULAR -> faixa da categoria; jogadores
     abaixo/acima extrapolam linearmente (reservas abaixo, craques acima, na faixa Estrela+).
       src[rawLo,rawHi] -> dst[bandLo,bandHi] */
  const BANDS={
    A:[64,82, 38,49],  // Série A / topo intl: regular raw 64-82 -> 38-49; craque raw90 -> ~54
    B:[58,74, 25,37],  // Série B / 2ª divisão intl
    C:[52,66, 13,24],  // Série C
    D:[44,58,  3,12],  // Série D
  };
  // intl usa chaves de divisão próprias (PL/CH/ES/ES2/...) — mapeia por tier pras faixas A/B
  const BAND_BY_DIV={ A:'A',B:'B',C:'C',D:'D',
    PL:'A',ES:'A',IT:'A',DE:'A',PT:'A', CH:'B',ES2:'B',IT2:'B',DE2:'B',PT2:'B' };
  function bandKey(div){ return BAND_BY_DIV[div] || 'A'; }
  function force(rawF, division){
    const rf=(typeof rawF==='number' && isFinite(rawF))?rawF:60;
    const b=BANDS[bandKey(division)]||BANDS.A;
    const f=b[2] + (rf-b[0])/(b[1]-b[0])*(b[3]-b[2]); // linear; extrapola nas pontas
    return Math.max(1, Math.min(99, Math.round(f)));
  }

  /* ---- 2. VALOR DE MERCADO por força NOVA (R$), × fator idade ---- */
  const V_ANCHORS=[
    [5,80e3],[10,200e3],[15,450e3],[20,700e3],[25,1e6],[30,1.6e6],[35,2.5e6],
    [40,4e6],[45,6e6],[50,9e6],[60,18e6],[70,35e6],[80,70e6],[90,150e6],[99,260e6]
  ];
  function valueBase(f){ return interp(V_ANCHORS, f); }
  function value(f, age){
    const af=(typeof window!=='undefined' && window.MARKET)?window.MARKET.ageFactor(age):1;
    return Math.max(30000, Math.round(valueBase(f) * af));
  }

  /* ---- 3. SALÁRIO semanal por força NOVA (R$) ---- */
  const S_ANCHORS=[
    [5,1e3],[10,3e3],[15,6e3],[20,10e3],[25,15e3],[30,22e3],[35,31e3],
    [40,43e3],[45,58e3],[50,78e3],[60,130e3],[70,220e3],[80,420e3],[90,800e3],[99,1.3e6]
  ];
  function salary(f){ return Math.max(500, Math.round(interp(S_ANCHORS, f))); }

  /* ---- 4. CAIXA INICIAL por divisão ---- */
  const BUDGET={ A:[10e6,20e6], B:[6.5e6,9.5e6], C:[3e6,5e6], D:[1e6,2.5e6] };
  function budget(division, rng){
    const b=BUDGET[bandKey(division)]||BUDGET.C; // mapeia chaves intl (PL/CH/...) pras faixas A/B
    const r=(rng && typeof rng.rnd==='function')?rng.rnd(b[0],b[1]):(b[0]+b[1])/2;
    return Math.round(r);
  }

  /* ---- 5. CAPACIDADE INICIAL DE ESTÁDIO por overall (escala NOVA) ----
     Alvos por divisão: A 75k · B 50k · C 25k · D 10k. Overall típico por divisão
     na escala nova ~ A 44 · B 31 · C 19 · D 8. Clubes-estrela vão um pouco além. */
  const CAP_ANCHORS=[[3,10000],[8,10000],[19,25000],[31,50000],[44,75000],[55,82000],[70,88000]];
  function stadiumCap(overall){
    const ov=(typeof overall==='number' && isFinite(overall))?overall:30;
    return Math.round(Math.max(10000, Math.min(90000, interp(CAP_ANCHORS, ov)))/1000)*1000;
  }

  window.REBAL={ force, value, valueBase, salary, budget, stadiumCap, BUDGET, BANDS };
})();
