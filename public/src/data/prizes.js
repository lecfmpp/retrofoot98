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
(function(root){
  'use strict';

  /* divisão -> faixa (mesma lógica de bandKey do REBAL: intl PL/ES/... = topo A) */
  const DIV_TIER={ A:'A',B:'B',C:'C',D:'D',
    PL:'A',ES:'A',IT:'A',DE:'A',PT:'A', CH:'B',ES2:'B',IT2:'B',DE2:'B',PT2:'B' };
  function tierOf(div){ return DIV_TIER[div] || 'A'; }

  /* ---- LIGA: prêmio por posição final, por faixa. Todo mundo leva algo (piso de
     participação); cai suave do campeão pro rebaixado. n = nº de clubes na divisão. ---- */
  /* REAJUSTE DE 1,3x (2026-09) — os valores abaixo são os antigos multiplicados por 1,3, já
     baked no literal porque a UI lê estas tabelas direto (ver rfCupPrizeTopo em main.js). A
     receita-base por rodada subiu ~1,2-1,5x no rebalanceamento de REBAL.income; sem este
     reajuste os prêmios encolheriam em relação à renda semanal e um título passaria a pesar
     menos do que pesa hoje. O fator mantém o peso relativo que eles sempre tiveram. */
  const LEAGUE={
    A:{champ:26e6,  vice:18.2e6, top4:13e6,  upper:7.8e6,  mid:4.55e6, lower:2.6e6 },
    B:{champ:11.7e6,vice:7.8e6,  top4:5.2e6, upper:3.25e6, mid:1.95e6, lower:1.17e6},
    C:{champ:5.2e6, vice:3.51e6, top4:2.34e6,upper:1.43e6, mid:0.91e6, lower:0.52e6},
    D:{champ:2.6e6, vice:1.69e6, top4:1.17e6,upper:0.715e6,mid:0.455e6,lower:0.26e6},
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

  /* ---- INGRESSO: preço fixo por divisão (valores reais informados) — A 25 · B 20 · C 15 · D 10.
     Mora aqui, e não em main.js, porque o SERVIDOR também precisa dele: a bilheteria dos clubes da
     CPU na Resenha é calculada lá (cpuCaixaRodada), e uma segunda tabela do outro lado seria a
     mesma armadilha que as tabelas de economia acabaram de sair. `tierOf` já mapeia qualquer
     divisão (Brasil A-D, ligas estrangeiras PL/CH/ES/ES2/...) numa das quatro faixas. ---- */
  const TICKET={ A:25, B:20, C:15, D:10 };
  function ticketPrice(div){ return TICKET[tierOf(div)] || TICKET.D; }

  /* ---- ACESSO: bônus pago UMA VEZ ao subir de divisão. ----
     Não existia: um clube promovido enfrentava de uma hora para outra os custos da divisão nova
     (salários mais caros para não cair de novo, manutenção, elenco a repor) sem nenhuma almofada
     — exatamente quando a receita-base dele ainda reflete o overall da divisão anterior. Sem
     nada nesse buraco, subir podia ser um castigo financeiro.

     Calibrado em ~2 a 3 semanas da receita-base média da divisão de DESTINO, que é o que dá
     fôlego real sem competir com o prêmio de campeão. A chave é o tier de DESTINO: entrar na C
     paga 750k, na B 2M, na A 4M. Não há bônus para "entrar na D" — ninguém sobe para lá.

     OS TRÊS FICAM ABAIXO DO PRÊMIO DE CAMPEÃO DA DIVISÃO DE ORIGEM (D 2,6M · C 5,2M · B 11,7M),
     então subir continua valendo menos que ser campeão — só que agora com uma rede de segurança
     para não quebrar no primeiro mês na série nova. */
  const ACCESS={ C:750e3, B:2e6, A:4e6 };
  /* `divDestino` é a divisão em que o clube VAI JOGAR na temporada nova. Devolve 0 para quem
     ficou, para quem caiu e para a divisão de base — então o chamador não precisa saber se houve
     acesso: basta comparar a divisão de antes com a de agora e passar a de agora. */
  function accessPrize(divDestino, divOrigem){
    if(!divDestino || !divOrigem) return 0;
    const dest=tierOf(divDestino), orig=tierOf(divOrigem);
    if(dest===orig) return 0;
    const ORDEM=['A','B','C','D'];
    if(ORDEM.indexOf(dest) >= ORDEM.indexOf(orig)) return 0;   // ficou igual ou caiu
    return ACCESS[dest]||0;
  }

  /* ---- COPAS: prêmio por fase alcançada. Libertadores e Sul-Americana têm tabela PRÓPRIA
     (valores oficiais informados pelo dono do jogo — ver histórico do commit); Champions/Europa
     continuam nas tabelas genéricas cont1/cont2 de antes, sem mudança. Copa do Brasil paga por
     fase durante a temporada (ver copaBrasilPhaseCash), não aqui. */
  const CUP_CAT={ copaBrasil:'nat', libertadores:'libertadores', sulamericana:'sulamericana',
                  championsLeague:'cont1', europaLeague:'cont2' };
  const CUP={   /* mesmo reajuste de 1,3x da LEAGUE acima */
    nat:  {campeao:19.5e6, vice:10.4e6, semi:5.2e6,  quartas:3.25e6, oitavas:1.95e6, part:1.04e6},
    cont1:{campeao:28.6e6, vice:16.9e6, semi:10.4e6, quartas:6.5e6,  oitavas:3.9e6,  part:2.6e6},
    cont2:{campeao:15.6e6, vice:9.1e6,  semi:5.2e6,  quartas:3.25e6, oitavas:1.95e6, part:1.3e6},
    libertadores:{campeao:31.2e6, vice:15.6e6, semi:9.1e6,  quartas:6.5e6,  oitavas:3.9e6,  part:1.95e6},
    sulamericana:{campeao:15.6e6, vice:7.8e6,  semi:4.55e6, quartas:3.25e6, oitavas:1.95e6, part:0.91e6},
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
  const ART_CASH={ A:3.9e6, B:1.95e6, C:0.91e6, D:0.52e6 };   /* mesmo reajuste de 1,3x */
  function artilheiroCash(div){ return ART_CASH[tierOf(div)] || 1e6; }
  const ART_VALUE_MULT=1.20, ART_VALUE_CAP=1.60;

  /* ---- COPA DO BRASIL: cota POR FASE VENCIDA, paga na hora (não no fim da temporada).
     Diferente de cupPrize() acima, que paga uma vez só, no fechamento, pela fase ALCANÇADA:
     aqui cada vitória de fase pinga o dinheiro no caixa do clube durante a temporada, como
     acontece de verdade — e vale pra TODOS os clubes, não só o do usuário. Valores definidos
     pelo dono do jogo (ver copaBrasilPhaseCash). Quem perde a final leva a cota de vice.
     Como esta cota substitui a premiação de fim de temporada da Copa do Brasil, cupPrize()
     devolve 0 pra ela (senão o clube receberia duas vezes pelo mesmo caminho). ---- */
  /* mesmo reajuste de 1,3x. FICA O REGISTRO, sem mudança: a final da Copa do Brasil (36,4M) paga
     mais que o título da Série A (26M). Pode ser proposital ("a Copa vale mais que o Brasileirão"
     é escolha de design válida) — a proporção entre as duas é a mesma de antes do reajuste. */
  const CB_PHASE={ final:36.4e6, vice:18.2e6, semi:11.7e6, quartas:5.2e6, oitavas:2.6e6, dezesseis:1.95e6, f2:1.04e6, f1:0.52e6 };
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
  root.PRIZES={ tierOf, leaguePrize, cupCategory, cupResultOutcome, cupPrize,
                copaBrasilPhaseCash, CB_PHASE, accessPrize, ACCESS, ticketPrice, TICKET,
                artilheiroCash, ART_VALUE_MULT, ART_VALUE_CAP, LEAGUE, CUP };
  if(typeof module!=='undefined' && module.exports){ module.exports={ PRIZES:root.PRIZES }; }
})(typeof globalThis!=='undefined'?globalThis:this);
