/* ============================================================================
   PREMIAÇÕES (item novo) — dinheiro por título/posição/copa/artilharia, em TODOS os
   países. Escalado à economia do jogo (caixa A 10-20M, faturamento ~100M/temporada),
   NÃO aos valores reais: um título continental real paga ~R$120M (dobraria o caixa de
   um grande e desequilibraria tudo). Aqui a ORDEM é realista (continental > copa nacional
   > liga; ligas de topo pagam mais), mas os valores são MODESTOS — um título rende ~1
   contratação, ajuda sem virar bola de neve. Clubes rebaixados ganham um piso (colchão)
   que suaviza a queda e reduz o desequilíbrio entre divisões.

   Prêmios são creditados ao clube do USUÁRIO em endSeason() (ver core.js), e um modal de
   celebração mostra o detalhamento (ver seasonEndDialog em main.js).
   ============================================================================ */
(function(){
  'use strict';

  /* divisão -> faixa (mesma lógica de bandKey do REBAL: intl PL/ES/... = topo A) */
  const DIV_TIER={ A:'A',B:'B',C:'C',D:'D',
    PL:'A',ES:'A',IT:'A',DE:'A',PT:'A', CH:'B',ES2:'B',IT2:'B',DE2:'B',PT2:'B' };
  function tierOf(div){ return DIV_TIER[div] || 'A'; }

  /* ---- LIGA: prêmio por posição final, por faixa. Todo mundo leva algo (piso de
     participação); cai suave do campeão pro rebaixado. n = nº de clubes na divisão. ---- */
  const LEAGUE={
    A:{champ:20e6, vice:14e6, top4:10e6,  upper:6e6,   mid:3.5e6, lower:2e6 },
    B:{champ:9e6,  vice:6e6,  top4:4e6,   upper:2.5e6, mid:1.5e6, lower:0.9e6},
    C:{champ:4e6,  vice:2.7e6,top4:1.8e6, upper:1.1e6, mid:0.7e6, lower:0.4e6},
    D:{champ:2e6,  vice:1.3e6,top4:0.9e6, upper:0.55e6,mid:0.35e6,lower:0.2e6},
  };
  function leaguePrize(div, pos, n){
    const t=LEAGUE[tierOf(div)]||LEAGUE.A;
    n=n||20;
    if(pos===1) return t.champ;
    if(pos===2) return t.vice;
    if(pos<=4) return t.top4;
    if(pos<=Math.ceil(n*0.35)) return t.upper;
    if(pos<=Math.ceil(n*0.70)) return t.mid;
    return t.lower;
  }

  /* ---- COPAS: prêmio por fase alcançada. Libertadores e Sul-Americana têm tabela PRÓPRIA
     (valores oficiais informados pelo dono do jogo — ver histórico do commit); Champions/Europa
     continuam nas tabelas genéricas cont1/cont2 de antes, sem mudança. Copa do Brasil paga por
     fase durante a temporada (ver copaBrasilPhaseCash), não aqui. */
  const CUP_CAT={ copaBrasil:'nat', libertadores:'libertadores', sulamericana:'sulamericana',
                  championsLeague:'cont1', europaLeague:'cont2' };
  const CUP={
    nat:  {campeao:15e6, vice:8e6,  semi:4e6, quartas:2.5e6, oitavas:1.5e6, part:0.8e6},
    cont1:{campeao:22e6, vice:13e6, semi:8e6, quartas:5e6,   oitavas:3e6,   part:2e6},
    cont2:{campeao:12e6, vice:7e6,  semi:4e6, quartas:2.5e6, oitavas:1.5e6, part:1e6},
    libertadores:{campeao:24e6, vice:12e6, semi:7e6, quartas:5e6, oitavas:3e6,   part:1.5e6},
    sulamericana:{campeao:12e6, vice:6e6,  semi:3.5e6,quartas:2.5e6,oitavas:1.5e6,part:0.7e6},
  };
  function cupCategory(cupKey){ return CUP_CAT[cupKey] || 'nat'; }
  /* mapeia a STRING que cupResultForClub() devolve pra uma chave de prêmio */
  function cupResultOutcome(resultStr){
    if(!resultStr) return null;
    const s=String(resultStr).toLowerCase();
    if(s.indexOf('campeão')>=0 && s.indexOf('vice')<0) return 'campeao';
    if(s.indexOf('vice')>=0) return 'vice';
    if(s.indexOf('semi')>=0) return 'semi';
    if(s.indexOf('quartas')>=0) return 'quartas';
    if(s.indexOf('oitavas')>=0) return 'oitavas';
    return 'part'; // fase de grupos / 16 avos / Nª fase / 1ª fase
  }
  function cupPrize(cupKey, outcome){
    if(!outcome) return 0;
    // Copa do Brasil paga POR FASE, durante a temporada (ver copaBrasilPhaseCash) — pagar de
    // novo aqui, no fechamento, seria dobrar a mesma premiação.
    if(cupKey==='copaBrasil') return 0;
    const t=CUP[cupCategory(cupKey)]||CUP.nat;
    return t[outcome]||0;
  }

  /* ---- ARTILHEIRO da divisão: prêmio em caixa (ao clube dele) + valorização do jogador.
     Ganhar a artilharia sobe o valor de mercado ~20% (permanente, acumulável até +60%),
     como na vida real — reputação de goleador. ---- */
  const ART_CASH={ A:3e6, B:1.5e6, C:0.7e6, D:0.4e6 };
  function artilheiroCash(div){ return ART_CASH[tierOf(div)] || 1e6; }
  const ART_VALUE_MULT=1.20, ART_VALUE_CAP=1.60;

  /* ---- COPA DO BRASIL: cota POR FASE VENCIDA, paga na hora (não no fim da temporada).
     Diferente de cupPrize() acima, que paga uma vez só, no fechamento, pela fase ALCANÇADA:
     aqui cada vitória de fase pinga o dinheiro no caixa do clube durante a temporada, como
     acontece de verdade — e vale pra TODOS os clubes, não só o do usuário. Valores definidos
     pelo dono do jogo (ver copaBrasilPhaseCash). Quem perde a final leva a cota de vice.
     Como esta cota substitui a premiação de fim de temporada da Copa do Brasil, cupPrize()
     devolve 0 pra ela (senão o clube receberia duas vezes pelo mesmo caminho). ---- */
  const CB_PHASE={ final:28e6, vice:14e6, semi:9e6, quartas:4e6, oitavas:2e6, dezesseis:1.5e6, f2:0.8e6, f1:0.4e6 };
  /* mesma conta de cupPhaseLabel (core.js): dist = rodadas até a final. round é 1-based. */
  function copaBrasilPhaseCash(round, roundsTotal, isChampion){
    const dist=(roundsTotal||0)-(round||0);
    if(dist<=0) return isChampion===false ? CB_PHASE.vice : CB_PHASE.final;
    if(dist===1) return CB_PHASE.semi;
    if(dist===2) return CB_PHASE.quartas;
    if(dist===3) return CB_PHASE.oitavas;
    if(dist===4) return CB_PHASE.dezesseis;
    return round<=1 ? CB_PHASE.f1 : CB_PHASE.f2;   // fases iniciais de chaveamento grande
  }
  window.PRIZES={ tierOf, leaguePrize, cupCategory, cupResultOutcome, cupPrize,
                  copaBrasilPhaseCash, CB_PHASE,
                  artilheiroCash, ART_VALUE_MULT, ART_VALUE_CAP, LEAGUE, CUP };
})();
