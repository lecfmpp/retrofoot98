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
(function(root){
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
    const af=(root.MARKET)?root.MARKET.ageFactor(age):1;
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
  function wage(f, uni){
    const base=(typeof f!=='number' || !isFinite(f)) ? salary(40) : salary(f);
    return Math.max(500, Math.round(base * modFator(uni)));
  }

  /* ---- 3b. RECEITA-BASE por rodada (TV + patrocínio) por overall NOVO ----
     A tabela anterior tinha um DEGRAU: entre overall 21 e 25 a receita DOBRAVA de uma vez (240k
     -> 480k), enquanto o salário subia suave no mesmo intervalo (15k -> 22k por jogador). Os 20
     clubes da Série C vivem na faixa 19-22 — todos presos do lado ruim do degrau: pagavam salário
     pela força real do elenco e recebiam a receita "antiga". Medido nos 80 clubes reais, a razão
     folha/receita variava de 61% a 108% (Botafogo gastava 108,4% da própria receita-base só em
     salário) sem nenhuma lógica ao longo da escala.

     A tabela nova foi calculada de trás pra frente a partir da folha real dos 80 clubes, mirando
     folha/receita ~58% em TODA a escala — o que deixa ~34% de sobra depois do OPEX de 8%, antes
     de qualquer bônus de vitória. Os multiplicadores sobre a tabela velha são de PROPÓSITO
     desiguais (1,20x a 1,56x): o 1,56x em ov21 é exatamente o que absorve o degrau, em vez de um
     fator único que deixaria alguma faixa ainda desalinhada. Overall 70 não existe em nenhum
     clube hoje (o teto real é 58, no Palmeiras) — está aqui para o dia em que um elenco chegar lá.

     NOTA DE HISTÓRICO: a calibração anterior mirava uma folha/receita que CRESCIA com o porte
     (60% na D -> 79% na elite), para que clube grande gastasse proporcionalmente mais do que
     fatura. Essa meta foi revista pelo dono do jogo em favor da margem uniforme acima. */
  const INCOME_ANCHORS=[
    [3,30e3],[8,75e3],[11,130e3],[15,200e3],[21,375e3],[25,600e3],[30,1.05e6],
    [34,1.35e6],[40,2.45e6],[45,3.37e6],[48,4.10e6],[52,5.30e6],[58,7.5e6],[70,14e6]
  ];
  /* AS ÂNCORAS DE 40 PARA CIMA LEVARAM UM 1,32x A MAIS que a tabela do relatório, e o motivo é uma
     premissa dele que não se confirma nos dados do jogo. O relatório calculou a Série A com o
     overall DECLARADO de cada clube, remapeado (Palmeiras 58, Botafogo 48). O jogo não usa esse
     número: recomputeClubOverall (core.js) sobrescreve club.overall pela MÉDIA DO ELENCO logo na
     abertura do save, e aí Palmeiras é 51 e Botafogo é 44. Overall menor com a mesma folha =
     receita real bem abaixo da que o relatório supôs.

     Medido nos 80 clubes reais deste repositório: com a tabela do relatório sem retoque, B/C/D
     chegavam aos ~57% pretendidos mas a Série A parava em 75,5% (Palmeiras em 104%). O 1,32x
     cobre exatamente a faixa de overall 40-51, que é onde só a Série A vive (B vai até 35), e leva
     a elite a 57,8% sem mexer em nenhuma das outras três: B 53,7% · C 58,5% · D 56,9%.
     Os valores estão arredondados — é a calibração aferida, não um fator aplicado às cegas. */
  /* a curva crua, por overall — sem split de TV e sem modalidade. É o tijolo das duas metades. */
  function incomeTabela(overall){
    const ov=(typeof overall==='number' && isFinite(overall))?overall:30;
    return Math.max(20000, Math.round(interp(INCOME_ANCHORS, ov)));
  }

  /* COTA DE TV FIXA — a única parte da receita que NÃO depende de como o clube está jogando.
     Antes a receita-base inteira saía do overall do próprio clube, então uma fase ruim derrubava
     TUDO no exato momento em que o clube mais precisava de estabilidade: joga mal -> recebe menos
     -> paga a folha com mais dificuldade -> joga pior ainda. Como no futebol de verdade, agora a
     receita-base se divide em três:
       · Patrocínio    50%  — pelo overall do PRÓPRIO clube ("prêmio por ser bom")
       · TV por mérito 25%  — idem
       · TV fixa       25%  — pelo overall MÉDIO DA DIVISÃO, travado no início da temporada
     Ou seja 75% pelo clube + 25% pela divisão. Um clube em má fase ainda perde receita (a parte
     por mérito cai), mas não perde tudo de uma vez — o quarto fixo segue garantido até a próxima
     definição de quem está em cada divisão. É essa metade que quebra o ciclo vicioso.
     Sem o overall médio (chamador antigo, save velho), cai em 100% pelo clube — idêntico ao de
     antes, então nenhum chamador quebra. */
  const TV_MERITO=0.75, TV_FIXA=0.25;

  /* ---- 3c. O EIXO DE MODALIDADE (masculino / feminino) ----
     O universo feminino (brasilFem) usa OS MESMOS clubes e o MESMO objeto de jogador do masculino
     com o nome trocado — então a economia sai idêntica por construção, e não havia um só ponto da
     camada financeira que soubesse qual modalidade estava rodando. Aqui está esse ponto, e é um
     só: calibrar o feminino passa a ser mudar um número nesta tabela, não caçar código.

     Lido em tempo de chamada, como bandKey lê WORLD_CONFIG: `RF_FEM` mora numa folha que só
     existe onde o universo feminino existe. Sem ela, modalidade() nunca é consultada, o fallback
     devolve 'masc' e nada muda — que é exatamente o comportamento desejado. */
  const MOD_FATOR={ masc:1.00, fem:1.00 };
  function modFator(uni){
    const F=root.RF_FEM;
    let k=uni;
    if(k==null && typeof root.activeUniverseKey==='function'){ try{ k=root.activeUniverseKey(); }catch(e){} }
    const mod=(F && typeof F.modalidade==='function') ? F.modalidade(k||'brasil') : 'masc';
    return MOD_FATOR[mod]!=null ? MOD_FATOR[mod] : 1;
  }

  /* RECEITA-BASE final = (75% pelo clube + 25% pela divisão) x fator da modalidade.
     `ovMedioDivisao` é o overall médio da divisão do clube, travado na temporada (ver
     divOverallAvg em core.js). `uni` é opcional: sem ele, o universo ativo é resolvido sozinho. */
  function income(overall, ovMedioDivisao, uni){
    const proprio=incomeTabela(overall);
    const medio=(typeof ovMedioDivisao==='number' && isFinite(ovMedioDivisao))
      ? incomeTabela(ovMedioDivisao) : proprio;
    return Math.max(20000, Math.round((TV_MERITO*proprio + TV_FIXA*medio) * modFator(uni)));
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
  function budget(division, rng, uni){
    const b=BUDGET[bandKey(division)]||BUDGET.C; // mapeia chaves intl (PL/CH/...) pras faixas A/B
    const r=(rng && typeof rng.rnd==='function')?rng.rnd(b[0],b[1]):(b[0]+b[1])/2;
    return Math.round(r * modFator(uni));
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

  root.REBAL={ force, engForce, engForceGK, value, valueBase, salary, wage, budget,
               income, incomeTabela, modFator, stadiumCap, stadiumCapForDivision,
               BUDGET, BANDS, MOD_FATOR, TV_MERITO, TV_FIXA, WIN_BONUS, DRAW_BONUS, OPEX };
  if(typeof module!=='undefined' && module.exports){ module.exports={ REBAL:root.REBAL }; }
})(typeof globalThis!=='undefined'?globalThis:this);
