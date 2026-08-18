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
     Curva POR PARTES (âncoras raw->nova), por divisão. Duas metas ao mesmo tempo:
       (a) o jogador REGULAR de cada divisão cai na faixa da categoria (A 38-49, B 25-37,
           C 13-24, D 3-12) — o que "nivela" as partidas dentro da divisão; e
       (b) os jogadores excepcionais SOBEM para as faixas de craque (Estrela 50-69, Craque
           Nacional 70-89, Craque Mundial 90-99), que na versão linear anterior ficavam
           inalcançáveis (o topo bruto ~90 mapeava só pra ~54).
     Calibrado pela distribuição real dos dados (raw 64-79 = regulares; 80-84 = Estrela;
     85-89 = Craque Nacional; 90-91 = Craque Mundial, raríssimo — 1-3 por liga). Só as
     divisões de topo (A / 1ª intl) têm força bruta alta o bastante pra chegar nos craques;
     divisões inferiores raramente passam de Estrela — como na vida real. */
  const BANDS={
    // Série A / 1ª divisão intl — regular 38-49; topo estica pras faixas de craque (Estrela
    // 50-69, Craque Nacional 70-89, Craque Mundial 90-99). Estas são as forças EXIBIDAS /
    // de valor / salário. O MOTOR de partida usa engForce() (comprime o topo) pra não virar
    // goleada — ver engForce abaixo e ratings().
    A:[[48,28],[64,38],[79,49],[82,58],[85,70],[88,81],[90,90],[94,98]],
    // Série B / 2ª divisão intl
    B:[[46,18],[58,26],[74,37],[77,46],[81,60],[85,74],[90,90]],
    // Série C
    C:[[42,8],[52,14],[66,24],[70,32],[76,48],[82,66]],
    // Série D
    D:[[38,2],[44,4],[58,12],[63,23],[70,40]],
  };
  /* A BANDA DE UMA DIVISÃO SAI DO NÍVEL DELA NA PIRÂMIDE (engine/world-config.js), não de um
     mapa de letras escrito à mão. O mapa antigo — {A:'A',...,PL:'A',CH:'B',ES2:'B',...} — cobria
     seis países, e um país novo (inclusive um criado no painel admin) cairia calado na banda 'A'.
     Para as letras que ele cobria o resultado é o mesmo: PL é 1ª divisão, logo nível 0, logo 'A'.
     Lido em tempo de chamada porque este arquivo carrega antes das folhas; o fallback mantém o
     rebalanceamento de pé se a folha faltar. */
  const BAND_FALLBACK={ A:'A',B:'B',C:'C',D:'D',
    PL:'A',ES:'A',IT:'A',DE:'A',PT:'A', CH:'B',ES2:'B',IT2:'B',DE2:'B',PT2:'B' };
  function bandKey(div){
    const W=(typeof globalThis!=='undefined') && globalThis.WORLD_CONFIG;
    if(W && W.bandaDaDivisaoSemPais) return W.bandaDaDivisaoSemPais(div);
    return BAND_FALLBACK[div] || 'A';
  }
  function force(rawF, division){
    const rf=(typeof rawF==='number' && isFinite(rawF))?rawF:60;
    const b=BANDS[bandKey(division)]||BANDS.A;
    return Math.max(1, Math.min(99, Math.round(interp(b, rf)))); // curva por partes (interp extrapola nas pontas)
  }

  /* FORÇA PARA O MOTOR: a força EXIBIDA (com Estrela/Craque/Craque Mundial) infla demais o
     top-11 e viraria goleada, porque o motor mede o time pela MÉDIA dos titulares — um clube
     recheado de craques ficaria imbatível. Aqui comprimimos a parte acima do jogador regular
     (>49): o craque continua o MELHOR do elenco (ordem preservada) e ganha vantagem REAL, mas
     moderada — mantém as partidas competitivas (calibração das Fases 1-4) enquanto a UI, o
     valor e o salário mostram as faixas cheias. Usado só em ratings() (motor). */
  function engForce(f){
    if(typeof f!=='number' || !isFinite(f)) return 40;
    return f<=49 ? f : 49 + (f-49)*0.33; // f60->52.6, f70->55.9, f82->59.9, f90->62.5, f99->65.5
  }
  /* GOLEIRO: compressão mais leve — só 1 em campo, então o motivo de comprimir (evitar time
     empilhado de craques imbatível) não se aplica; um goleiro Craque Mundial deve pesar de
     verdade no DS. f60->55.6, f70->61.5, f82->68.5, f90->73.2, f99->78.5 (era 52.6/55.9/59.9/62.5/65.5). */
  function engForceGK(f){
    if(typeof f!=='number' || !isFinite(f)) return 40;
    return f<=49 ? f : 49 + (f-49)*0.59;
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
  /* SALÁRIO efetivo (folha) = a tabela EXATA na força do jogador (sem compressão). Um Craque
     Mundial f90 ganha os 800k/sem da tabela. A receita (core.js) é escalada pra sustentar essa
     folha — ver income() lá. */
  function wage(f){
    if(typeof f!=='number' || !isFinite(f)) return salary(40);
    return salary(f);
  }

  /* ---- 3b. RECEITA-BASE por rodada (TV/patrocínio) por overall NOVO ----
     Antes era uma fórmula solta do porte do clube: ov*36000 + kicker quadrático acima de ov42.
     O termo linear valia o MESMO em qualquer divisão, mas a folha desaba muito mais rápido que
     ele quando se desce de série — resultado medido nos dados reais: a folha consumia 67% da
     receita na A, 50% na B, 19% na C e só 10% na D. Times da Série C lucravam MAIS que 14 dos 20
     da Série A, e um clube da D multiplicava o caixa por 58 em cinco temporadas.

     Agora a receita é uma TABELA ancorada no overall, calibrada de trás pra frente a partir da
     folha real de cada um dos 80 clubes brasileiros, com uma meta de folha/receita que CRESCE com
     o porte (60% na D → 79% na elite). Isso é o que acontece no futebol de verdade: clube grande
     disputa talento e gasta proporcionalmente mais do que fatura; clube pequeno roda enxuto. O
     efeito é que a margem some no topo sem sufocar quem está embaixo, e subir de divisão vale
     muito (2,4x a 3,5x de receita por promoção). Ver harness de calibração. */
  const INCOME_ANCHORS=[
    [3,25e3],[8,60e3],[11,100e3],[15,150e3],[21,240e3],[25,480e3],[30,860e3],
    [34,1.09e6],[40,1.25e6],[45,1.75e6],[48,2.05e6],[52,2.60e6],[58,3.90e6],[70,7.2e6]
  ];
  function income(overall){
    const ov=(typeof overall==='number' && isFinite(overall))?overall:30;
    return Math.max(20000, Math.round(interp(INCOME_ANCHORS, ov)));
  }
  /* Bônus de vitória/empate como FRAÇÃO da receita-base, não valor fixo. O antigo R$500k fixo
     valia 9% da receita de um clube da Série A e 40% da de um da Série D — uma vitória na D
     pagava 8x a folha semanal inteira. */
  const WIN_BONUS=0.12, DRAW_BONUS=0.04;
  /* Custo operacional por rodada (estrutura, logística, manutenção) — o jogo só tinha salário
     como despesa, então tudo que entrava virava caixa. */
  const OPEX=0.08;

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
  /* Capacidade INICIAL por DIVISÃO (spec do usuário, exato): A 75k · B 50k · C 25k · D 10k.
     Mapeia chaves intl (PL/ES/CH/...) pras faixas A/B via bandKey. */
  const DIV_CAP={ A:75000, B:50000, C:25000, D:10000 };
  function stadiumCapForDivision(division){ return DIV_CAP[bandKey(division)] || 25000; }

  window.REBAL={ force, engForce, engForceGK, value, valueBase, salary, wage, budget, income, stadiumCap, stadiumCapForDivision,
                 BUDGET, BANDS, WIN_BONUS, DRAW_BONUS, OPEX };
})();
