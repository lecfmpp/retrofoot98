/* ===================================================================
   REGRAS DE MUNDO — fonte ÚNICA compartilhada cliente ⇄ servidor.

   POR QUE ISTO EXISTE. As regras de calendário e de avanço de competição estavam escritas DUAS
   vezes: uma em engine/core.js (cliente) e outra em supabase/functions/resolve-round (servidor),
   com um comentário pedindo "se mexer em um, mexer no outro". Esse contrato falhou toda vez:
     · o gerador de calendário foi portado à mão duas vezes e divergiu nas duas;
     · a trava "esta competição já avançou nesta jornada" existia só no cliente — e o servidor
       avançava a Libertadores de novo, o que punha DOIS jogos da mesma competição no mesmo dia
       no calendário do jogador;
     · a tabela de datas foi copiada manualmente.
   Nenhum desses foi erro de cálculo: foram duas versões da mesma regra.

   O MESMO TRUQUE DO MOTOR DE PARTIDA. engine/match-engine.js já é uma folha só usada pelos dois
   lados, e por isso o placar que o jogador vê ao vivo é exatamente o que fica gravado — essa
   classe de bug nunca aconteceu com partidas. Aqui é o mesmo padrão para as regras de mundo.

   REGRA DE OURO DESTE ARQUIVO: nada de S, CL, DATA ou qualquer global do jogo. Tudo entra por
   argumento e sai por retorno. É o que permite o servidor rodar exatamente este código.

   PROPAGAÇÃO É AUTOMÁTICA: scripts/sync-world-rules.mjs injeta este arquivo dentro do
   resolve-round entre marcadores, no build e no CI. Não há porte manual.
   =================================================================== */
(function(root){
  'use strict';

  /* ---------- CALENDÁRIO OFICIAL DA TEMPORADA (dado, não algoritmo) ----------
     Cada data de cada competição, escrita à mão. A ORDEM de cada lista é a ordem das rodadas
     daquela competição. Formato 'MM-DD'. Para mudar uma data, edita-se a linha — não há regra
     de reajuste, e é por isso que o calendário parou de errar. */
  const SEASON_START_2026=[2026,2,1];              // 1º de março — 1º jogo da liga
  const CAL_2026={
    league:['03-01','03-07','03-30','04-10','04-16','05-06','05-11','05-15','06-01','06-07',
            '06-11','06-22','07-05','07-11','07-22','07-25','08-05','08-18','08-23','08-30',
            '09-14','09-20','09-24','09-28','10-01','10-05','10-10','10-18','10-21','10-24',
            '10-27','10-30','11-03','11-07','11-11','11-18','12-01','12-03'],
    libertadores:['03-04','04-01','04-21','05-21','06-16','07-15','08-11','09-08','10-13','11-28'],
    sulamericana:['03-14','04-02','04-27','05-28','06-17','07-18','08-13','09-09','10-14','11-21'],
    copaBrasil:['03-26','04-04','05-01','08-19','09-03','11-08','12-06'],
    draws:{ libertadores:'03-02', sulamericana:'03-11', copaBrasil:'03-21' }
  };
  /* estreia de cada copa quando ela NÃO está na tabela (universo europeu) — mantém o
     escalonamento antigo pra que duas competições não estreiem na mesma jornada */
  const CUP_FIRST_ROUND={ copaBrasil:3, libertadores:1, sulamericana:2, championsLeague:1, europaLeague:2 };

  function calendar(){ return CAL_2026; }
  function seasonStart(){ return SEASON_START_2026.slice(); }

  /* 'MM-DD' -> dia (1-based) da temporada, contado do epoch */
  function calDay(mmdd, epoch){
    if(!mmdd) return null;
    const e=epoch||SEASON_START_2026, p=String(mmdd).split('-');
    const alvo=new Date(e[0], Number(p[0])-1, Number(p[1]));
    const base=new Date(e[0], e[1], e[2]);
    return Math.round((alvo-base)/86400000)+1;
  }
  /* jornada de liga em que uma data de copa acontece: a PRIMEIRA jornada cuja data é >= a dela.
     Mantém a ordem da semana (o dia de copa vem antes do jogo de liga daquele bloco) sem que copa
     e liga precisem compartilhar unidade. Data depois do último jogo de liga (a final da Copa do
     Brasil, 06/12) fica na última jornada. */
  function jornadaOfCalDate(mmdd, epoch){
    const L=CAL_2026.league, d=calDay(mmdd, epoch);
    for(let i=0;i<L.length;i++){ if(calDay(L[i], epoch)>=d) return i; }
    return L.length-1;
  }
  /* dia do jogo da jornada `round` da liga */
  function leagueMatchDay(round, epoch){
    const L=CAL_2026.league, i=Math.max(0, round||0);
    if(L[i]!=null) return calDay(L[i], epoch);
    return calDay(L[L.length-1], epoch) + (i-(L.length-1))*7;   // além da tabela: mantém o passo
  }
  /* dia do jogo da rodada `idx` (0-based) de uma copa */
  function cupMatchDayByRound(key, idx, epoch){
    const datas=CAL_2026[key];
    if(datas && datas[idx]!=null) return calDay(datas[idx], epoch);
    return null;
  }
  function cupDrawDay(key, epoch){
    const d=(CAL_2026.draws||{})[key];
    return d ? calDay(d, epoch) : 1;    // competição fora da tabela: sorteia no dia 1 (nunca há jogo antes)
  }

  /* ---------- CRONOGRAMA: em que JORNADA cada rodada de cada copa acontece ----------
     Estritamente crescente por construção: as datas são crescentes e jornadaOfCalDate é
     monotônica; duas rodadas que caíssem na mesma jornada empurram a seguinte, porque uma
     competição nunca joga duas rodadas no mesmo bloco de semana. */
  function buildCupSchedule(key, total, epoch){
    if(!total || total<1) return [];
    const datas=CAL_2026[key];
    const out=[]; let prev=-1;
    if(datas && datas.length){
      for(let i=0;i<total;i++){
        let j = (datas[i]!=null) ? jornadaOfCalDate(datas[i], epoch)
                                 : (out.length?out[out.length-1]+3:0);
        if(j<=prev) j=prev+1;
        prev=j; out.push(j);
      }
      return out;
    }
    const first=CUP_FIRST_ROUND[key]; if(first==null) return [];
    for(let i=0;i<total;i++) out.push(first+i*3);
    return out;
  }
  /* esta copa entra em campo nesta jornada? */
  function cupTickMatchesRound(cupCalendar, key, round){
    const cal=cupCalendar ? cupCalendar[key] : null;
    if(cal && cal.length) return cal.indexOf(round)>=0;
    const first=CUP_FIRST_ROUND[key];
    return first!=null && round>=first && ((round-first)%3===0);
  }
  /* índice (0-based) da rodada desta copa que acontece nesta jornada — -1 se nenhuma */
  function cupRoundIndexAt(cupCalendar, key, round){
    const cal=cupCalendar ? cupCalendar[key] : null;
    return cal ? cal.indexOf(round) : -1;
  }

  /* ---------- A TRAVA QUE FALTAVA NO SERVIDOR ----------
     UMA rodada por competição por jornada. Quando o humano joga a partida de copa ao vivo, o
     cliente fecha o RESTO daquela rodada na hora e carimba a competição como resolvida nesta
     jornada. O servidor não lia esse carimbo e avançava a competição DE NOVO — dois jogos da
     mesma competição no mesmo dia. O carimbo viaja no estado compartilhado; agora os dois lados
     leem e escrevem pelas MESMAS funções. */
  function cupAlreadyResolved(resolvedMap, key, round){ return !!resolvedMap && resolvedMap[key]===round; }
  function markCupResolved(resolvedMap, key, round){ const m=resolvedMap||{}; m[key]=round; return m; }

  /* ---------- A SEQUÊNCIA DE DIAS DA TEMPORADA ----------
     É a espinha do PONTEIRO DE DIA: a temporada inteira como uma lista ordenada de dias, cada um
     com a competição que entra em campo naquele dia. O servidor guarda esta lista e um índice;
     o cliente só DESENHA o dia apontado, sem decidir nada.
     Por que nasce aqui e não em SQL: o calendário mora nesta folha. Recalcular a ordem no banco
     seria uma TERCEIRA cópia das mesmas datas — exatamente o que causou dois jogos no mesmo dia.
     O banco guarda o resultado e anda com o índice; a regra continua num lugar só.
     `cups` = competições que existem neste save (as continentais não existem em todo universo). */
  /* puxa pra dentro da temporada o que a data real jogou pra fora, preservando a ordem das
     rodadas e sem empilhar duas rodadas da mesma copa na mesma jornada. Mesma regra do calendário
     do solo (ver ancorarCalendarioCopa em core.js) — as duas leem a mesma folha de datas. */
  function ancorarNaTemporada(rodadas, ultima, folga){
    if(!Array.isArray(rodadas) || !rodadas.length) return rodadas||[];
    const out=rodadas.slice();
    const teto0=Math.max(0, ultima-(folga||0));
    for(let i=out.length-1, teto=teto0; i>=0; i--, teto--) if(out[i]>teto) out[i]=teto;
    for(let i=1;i<out.length;i++) if(out[i]<=out[i-1]) out[i]=out[i-1]+1;
    for(let i=out.length-1, teto=ultima; i>=0; i--, teto--) if(out[i]>teto) out[i]=teto;
    return out.map(r=>Math.max(0,r));
  }
  function buildDayPlan(cups, epoch, totais){
    const ativas=(cups&&cups.length)?cups:['copaBrasil','libertadores','sulamericana'];
    const L=CAL_2026.league, dias=[];
    /* QUANTAS RODADAS A COPA TEM ≠ QUANTAS DATAS ESTÃO NA TABELA. O plano usava d.length (as datas
       de CAL_2026) como total — e as continentais têm 10 datas para 11 rodadas. A rodada que
       sobrava era a ÚLTIMA: a FINAL nunca ganhava um dia no plano da sala, então ela não era
       jogada e a temporada virava sem ela. Quem chama passa o total de verdade (cupTotalRounds);
       sem ele, cai no comportamento antigo. buildCupSchedule já sabe estender as datas que
       faltam (+3 jornadas a partir da última conhecida). */
    const agenda={};
    // NENHUMA RODADA DE COPA PODE FICAR FORA DO PLANO. O laço abaixo só caminha pelas jornadas da
    // LIGA (0..L.length-1): rodada de copa marcada pra uma jornada além disso simplesmente não
    // entrava no plano — e era assim que a final da Libertadores e a da Sul-Americana (jornada 39
    // num calendário que acaba na 37) desapareciam da sala. Ancoro cada agenda dentro da
    // temporada, com uma jornada de folga por competição pra as finais não caírem no mesmo dia.
    const ultima=L.length-1;
    ativas.slice().sort().forEach((k,i)=>{ const d=CAL_2026[k]; if(!(d&&d.length)) return;
      const total=(totais && totais[k]) ? totais[k] : d.length;
      agenda[k]=ancorarNaTemporada(buildCupSchedule(k, total, epoch), ultima, i); });
    for(let r=0;r<L.length;r++){
      const doDia=[];
      Object.keys(agenda).forEach(k=>{
        const i=agenda[k].indexOf(r);
        if(i<0) return;
        // rodada que a folha de datas não cobre (a final das continentais é uma delas) cai no dia
        // seguinte ao jogo de liga da mesma jornada: sem data o dia sairia null e a ORDENAÇÃO do
        // plano — que é por data — ficaria indefinida justamente no fim da temporada.
        const dia=cupMatchDayByRound(k,i,epoch);
        doDia.push({ r:r, comp:k, idx:i, dia:(dia!=null?dia:leagueMatchDay(r,epoch)+1) });
      });
      doDia.forEach(d=>dias.push(d));
      dias.push({ r:r, comp:'liga', idx:r, dia:leagueMatchDay(r, epoch) });
    }
    // A ORDEM É A DAS DATAS, não a das jornadas. Agrupar por jornada e pôr as copas antes da liga
    // funciona quase sempre e erra no fim: a final da Copa do Brasil é 06/12 e o último jogo da
    // liga é 03/12 — pela jornada ela vinha antes, pelo calendário vem depois. O ponteiro anda no
    // tempo, então quem manda é a data.
    dias.sort((a,b)=>a.dia-b.dia);
    return dias;
  }
  /* ===================== PRORROGAÇÃO: A TEMPORADA ESPERA AS FINAIS =====================
     A temporada acabava quando a LIGA acabava (S.round >= S.sched.length), sem perguntar se as
     copas tinham terminado. Quando o calendário de copa não coube dentro da liga — foi o que
     aconteceu com as folhas de datas da Libertadores e da Sul-Americana, que tinham 10 datas
     para 11 rodadas —, a final simplesmente não era jogada e a temporada virava por cima dela.

     A resposta aqui NÃO é travar. Travar transforma um erro de dado num jogo que não abre mais
     (foi o que aconteceu com a barreira do ponteiro de dia, que segurou corretamente e deixou a
     sala morta). A resposta é CONSERTAR: acrescentar ao fim da temporada tantas jornadas quantas
     forem as rodadas de copa que ficaram devendo, e registrar cada uma no calendário da copa
     dona daquela rodada. A temporada segue andando pra frente; só demora um pouco mais.

     Uma jornada acrescentada não tem jogo de liga (a liga acabou de verdade) — ela existe pra
     dar dia à rodada de copa. Por isso cada uma recebe EXATAMENTE uma competição: sem isso, uma
     jornada acrescentada poderia ficar vazia e o jogador clicaria "Jogar" sem nada em campo.

     E há um teto. Se depois de `maximo` jornadas extras ainda faltar coisa, a temporada vira
     assim mesmo: perder uma final é ruim, ficar presa pra sempre é pior. Quem chama avisa.

     pendentes: [{key, faltam}] — quantas rodadas cada copa ainda deve. Devolve quantas jornadas
     foram acrescentadas (0 = nada a fazer, ou teto atingido). */
  function prorrogarPorCopasPendentes(S, pendentes, maximo){
    if(!S || !Array.isArray(S.sched) || !Array.isArray(pendentes) || !pendentes.length) return 0;
    const teto=(maximo!=null)?maximo:10;
    const jaExtras=S._jornadasExtras||0;
    if(jaExtras>=teto) return 0;
    // uma jornada por rodada devedora, intercalando as competições: se a Libertadores deve 2 e a
    // Copa do Brasil deve 1, a ordem é Lib, Copa, Lib — nunca duas finais no mesmo dia.
    const fila=[];
    const restante=pendentes.map(p=>({ key:p.key, faltam:Math.max(0, p.faltam|0) }));
    let sobrou=true;
    while(sobrou){
      sobrou=false;
      restante.forEach(p=>{ if(p.faltam>0){ fila.push(p.key); p.faltam--; sobrou=true; } });
    }
    if(!fila.length) return 0;
    S.cupCalendar=S.cupCalendar||{};
    /* A COPA JA SABE QUANDO JOGA — a temporada e que tem de a alcancar.
       Antes isto EMPURRAVA uma jornada nova e escrevia o indice dela no fim do
       calendario da copa. Desde que as copas deixaram de ser espremidas dentro
       da liga (ver ancorarCalendarioCopa), elas ja tem rodadas marcadas ALEM do
       fim da liga — a final da Libertadores cai na jornada 40 de um calendario
       de 38, porque a data real dela e 28/nov e a liga acaba a 03/dez... e a da
       Copa do Brasil e 06/dez, depois do fim.
       Acrescentar por cima disso produzia `...,36,40,38`: fora de ordem, e a
       final passava a ser jogada ANTES da meia-final. Agora a liga ESTICA ate
       cobrir o que a copa ja tem marcado, e so inventa jornada nova para o que
       nao tiver data nenhuma. */
    const maiorMarcada=Object.keys(S.cupCalendar||{})
      .filter(k=>k!=='_season' && Array.isArray(S.cupCalendar[k]))
      .reduce((m,k)=>Math.max(m, ...S.cupCalendar[k]), -1);
    let criadas=0;
    // 1) estica a liga ate a maior jornada JA marcada por alguma copa
    while(S.sched.length<=maiorMarcada && (jaExtras+criadas)<teto){
      S.sched.push([]);                                   // jornada sem jogo de liga
      criadas++;
    }
    // 2) o que ainda deve rodada e nao tem data marcada ganha jornada nova
    const semData=fila.filter(k=>{
      const a=S.cupCalendar[k]||[];
      return !a.some(j=>j>=S.sched.length-criadas);
    });
    const cabe=Math.min(semData.length, teto-(jaExtras+criadas));
    for(let i=0;i<cabe;i++){
      const jornada=S.sched.length;
      S.sched.push([]);
      const key=semData[i];
      S.cupCalendar[key]=(S.cupCalendar[key]||[]).concat([jornada]);
      criadas++;
    }
    S._jornadasExtras=jaExtras+criadas;
    return criadas;
  }
  /* ---------- MERCADO E CAIXA DOS CLUBES DA CPU ----------
     POR QUE ESTÁ AQUI. O mercado da CPU só existia no cliente (cpuBackgroundTransfers, core.js),
     dentro do playRound(). Na Resenha o cliente parou de comitar rodada localmente (o servidor é
     autoridade única desde o F3.5), então o mercado da CPU simplesmente NÃO ACONTECIA no
     multiplayer: os elencos dos rivais ficavam parados a temporada inteira. Escrito aqui, o
     sync-world-rules injeta no resolve-round e os dois lados rodam o MESMO código.

     E O DINHEIRO. A transferência entre dois clubes da CPU calculava uma taxa, anunciava na
     notícia e não debitava nem creditava ninguém — dinheiro que aparecia do nada e sumia no nada.
     O comprador também era sorteado sem olhar o caixa: um clube da Série D "comprava" um craque
     de 20 milhões. Agora a taxa sai do caixa de quem compra e entra no de quem vende, e quem não
     tem caixa VENDE ANTES DE COMPRAR (uma venda por negócio — o suficiente pra dar movimento em
     cadeia sem virar leilão infinito).

     Tudo o que depende do jogo (quem é clube elegível, se um jogador pode sair do elenco, o valor
     de mercado) entra por `opts` — a regra de ouro deste arquivo é não tocar em global nenhum. */
  function cpuMarket(S, R, opts){
    opts=opts||{};
    const clubes=opts.clubes||[];                       // [{id, short}] — já filtrados por quem pode negociar
    const podeSair=opts.podeSair||function(){ return true; };
    const valor=opts.valor||function(p){ return (p&&p.mv)||1e6; };
    const pisoElenco=opts.pisoElenco!=null?opts.pisoElenco:16;
    const tetoElenco=opts.tetoElenco!=null?opts.tetoElenco:32;
    const n=opts.n!=null?opts.n:2;
    if(!S || !S.squads || clubes.length<2) return [];
    S.budgets=S.budgets||{};
    const caixa=function(id){ return S.budgets[id]||0; };
    const feitas=[];

    /* tira um jogador vendável do elenco: metade mais fraca, respeitando o piso e o cadeado
       de quem não pode sair (goleiro único, contrato travado — quem sabe disso é o chamador) */
    function vendavel(clubId){
      const sq=S.squads[clubId]; if(!sq || sq.length<=pisoElenco) return null;
      const ord=sq.slice().sort(function(a,b){ return b.f-a.f; });
      const pool=ord.slice(Math.ceil(ord.length*0.5)).filter(function(x){ return podeSair(clubId,x); });
      return pool.length ? pool[Math.floor(R.random()*pool.length)] : null;
    }
    function mover(deId, paraId, p, taxa){
      S.squads[deId]=S.squads[deId].filter(function(x){ return x.pid!=null ? x.pid!==p.pid : x.n!==p.n; });
      S.squads[paraId]=S.squads[paraId]||[]; S.squads[paraId].push(p);
      S.budgets[deId]=Math.round(caixa(deId)+taxa);      // o dinheiro sai de um caixa e entra no outro
      S.budgets[paraId]=Math.round(caixa(paraId)-taxa);
      feitas.push({ player:p.n, from:deId, to:paraId, fee:taxa });
    }

    for(let i=0;i<n;i++){
      const vendedor=clubes[Math.floor(R.random()*clubes.length)];
      const p=vendavel(vendedor.id); if(!p) continue;
      const taxa=Math.round(valor(p)*(0.6+R.random()*0.6));

      // compradores plausíveis: não é o vendedor, tem espaço no elenco. Quem já pode pagar entra
      // na frente; quem não pode ainda tem a chance de levantar o dinheiro vendendo alguém.
      const cand=clubes.filter(function(c){
        return c.id!==vendedor.id && (S.squads[c.id]||[]).length<tetoElenco;
      });
      if(!cand.length) continue;
      const podem=cand.filter(function(c){ return caixa(c.id)>=taxa; });
      let comprador=null;
      if(podem.length){ comprador=podem[Math.floor(R.random()*podem.length)]; }
      else {
        // VENDE ANTES DE COMPRAR: um candidato tenta levantar caixa com uma venda própria.
        const tentante=cand[Math.floor(R.random()*cand.length)];
        const sai=vendavel(tentante.id);
        if(sai){
          const taxaSaida=Math.round(valor(sai)*(0.6+R.random()*0.6));
          const quemPaga=clubes.filter(function(c){
            return c.id!==tentante.id && c.id!==vendedor.id
              && caixa(c.id)>=taxaSaida && (S.squads[c.id]||[]).length<tetoElenco;
          });
          if(quemPaga.length){
            mover(tentante.id, quemPaga[Math.floor(R.random()*quemPaga.length)].id, sai, taxaSaida);
            if(caixa(tentante.id)>=taxa) comprador=tentante;   // agora dá
          }
        }
      }
      if(!comprador) continue;                                  // sem caixa e sem como levantar: não compra
      mover(vendedor.id, comprador.id, p, taxa);
    }
    return feitas;
  }
  /* CAIXA DA CPU POR RODADA — a parte de OPERAÇÃO do ano (receita base, bilheteria média, folha e
     custo fixo), dividida pelas rodadas. Antes tudo isso era aplicado de uma vez na virada de
     temporada: durante o ano o caixa dos rivais ficava CONGELADO — e a janela de transferências
     acontece justamente durante o ano, então o mercado da CPU negociava com um caixa que não
     refletia nada. O que é de DESEMPENHO (bônus por vitória e premiação) continua no fim da
     temporada, que é quando de fato se recebe. A soma do ano é a mesma de antes. */
  function cpuCaixaRodada(S, opts){
    opts=opts||{};
    const humanos=opts.humanos||new Set();
    const renda=opts.renda, folha=opts.folha, capacidade=opts.capacidade, overall=opts.overall;
    if(!S || !S.budgets || !renda || !folha || !capacidade || !overall) return;
    const OPEX=opts.OPEX!=null?opts.OPEX:0.08;
    Object.keys(S.budgets).forEach(function(id){
      if(humanos.has(id)) return;                       // humano paga/recebe pelo próprio caminho
      const ov=overall(id); if(ov==null) return;
      const base=renda(ov);
      let salarios=0;
      (S.squads[id]||[]).forEach(function(p){ salarios+=folha(p); });
      const preco=Math.round(Math.max(6, Math.min(16, 6+Math.max(0,ov-20)*0.32)));
      // CAPACIDADE CONSTRUÍDA MANDA. Sem isto a bilheteria saía sempre da capacidade sintética do
      // overall e a bancada nova não rendia UM centavo a mais — o clube gastava pra construir e o
      // estádio virava enfeite. É este ponto que liga o crescimento (cpuCrescerEstadio) ao caixa.
      const persistida=(S.clubStadiumCap && S.clubStadiumCap[id] && S.clubStadiumCap[id].capacity)||null;
      const bilheteriaEmCasa=Math.round((persistida||capacidade(ov))*0.55)*preco;
      const porRodada=base + Math.round(bilheteriaEmCasa/2) - salarios - Math.round(base*OPEX);
      S.budgets[id]=Math.max(-base*4, Math.round((S.budgets[id]||0)+porRodada));
    });
  }
  /* CRESCIMENTO DO ESTÁDIO DOS CLUBES DA CPU — a mesma decisão que o usuário toma na mão, uma vez
     por virada de temporada: constrói bancadas enquanto couber no teto de porte, na cota da
     temporada e no caixa. Vivia só no cliente (applyCpuStadiumGrowth) e tinha uma trava explícita
     de "só solo": na Resenha cada cliente calcularia um crescimento diferente e os estádios
     divergiriam entre os jogadores da sala. Escrito aqui, quem calcula é o servidor — um número
     só pra todo mundo — e o cliente offline roda exatamente o mesmo código.
     Os três limites entram por `opts` porque são regra de UI/rebalanceamento (main.js). */
  function cpuCrescerEstadio(S, opts){
    opts=opts||{};
    const humanos=opts.humanos||new Set();
    const overall=opts.overall, custo=opts.custo, teto=opts.teto, capInicial=opts.capInicial;
    if(!S || !S.budgets || !overall || !custo || !teto) return [];
    S.clubStadiumCap=S.clubStadiumCap||{};
    const LUGARES=opts.lugares!=null?opts.lugares:5000;
    const COTA=opts.cota!=null?opts.cota:10000;
    const feitas=[];
    Object.keys(S.budgets).forEach(function(id){
      if(humanos.has(id)) return;                       // o estádio do humano é decisão dele
      const ov=overall(id); if(ov==null) return;
      if(!S.clubStadiumCap[id]) S.clubStadiumCap[id]={ capacity:(capInicial?capInicial(id,ov):20000), builtThisSeason:0 };
      const st=S.clubStadiumCap[id];
      st.builtThisSeason=0;                             // roda 1x por virada: o reset da cota é aqui
      let guarda=0, antes=st.capacity;
      while(guarda++<10){                               // teto defensivo; a cota já limita a 2 bancadas
        const preco=custo(st.capacity);
        if(st.capacity+LUGARES > teto(ov, st.capacity)) break;          // teto de porte do clube
        if((st.builtThisSeason+LUGARES) > COTA) break;                  // cota da temporada
        if((S.budgets[id]||0) < preco) break;                           // caixa insuficiente
        S.budgets[id]-=preco;
        st.capacity+=LUGARES;
        st.builtThisSeason+=LUGARES;
      }
      if(st.capacity!==antes) feitas.push({ club:id, de:antes, para:st.capacity });
    });
    return feitas;
  }
  /* os três momentos de cada dia, na ordem em que o jogador os vive */
  const DAY_MOMENTS=['escalando','jogando','classificacao'];

  const API={ calendar, seasonStart, calDay, jornadaOfCalDate, leagueMatchDay, cupMatchDayByRound,
    buildDayPlan, DAY_MOMENTS, prorrogarPorCopasPendentes,
    cupDrawDay, buildCupSchedule, cupTickMatchesRound, cupRoundIndexAt,
    cupAlreadyResolved, markCupResolved, CUP_FIRST_ROUND,
    cpuMarket, cpuCaixaRodada, cpuCrescerEstadio };
  root.WORLD_RULES=API;
  if(typeof module!=='undefined' && module.exports){ module.exports=API; }
})(typeof globalThis!=='undefined'?globalThis:this);
