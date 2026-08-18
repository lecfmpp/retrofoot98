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

  /* ---------- AS DATAS, DERIVADAS DOS SLOTS ----------
     `slot = jornada + 1`, sempre. Com isso toda data do jogo é uma função de (slot, janela), e a
     folha de datas deixa de ser uma segunda fonte de verdade — passa a ser o rótulo do slot.
     CAL_2026 continua abaixo apenas como a lista de datas reais do Brasil, que o calendário de
     slots consome (calendars.js: datasLiga). */
  function janelaDaCompeticao(key, pais){
    const CAL=(typeof root!=='undefined' && root.CALENDARIOS_API) ? root.CALENDARIOS_API : null;
    if(!CAL) return 'WEEKEND';
    const c=(CAL.calendarioDe(pais).competicoes||{})[key];
    return c ? c.janela : 'MIDWEEK_1';
  }
  /* o dia (1-based na temporada) de um slot+janela — é por aqui que toda data passa agora */
  function diaDoSlot(slot, janela, epoch, pais){
    const CAL=(typeof root!=='undefined' && root.CALENDARIOS_API) ? root.CALENDARIOS_API : null;
    if(!CAL) return Math.max(1,(slot-1)*7+1);
    return dataDoDia(CAL.calendarioDe(pais), slot, janela||'WEEKEND', epoch);
  }
  /* 'MM-DD' de um dia da temporada — o inverso de calDay, para quem mostra data na tela */
  function diaParaMMDD(dia, epoch){
    const e=epoch||SEASON_START_2026;
    const d=new Date(e[0], e[1], e[2]);
    d.setDate(d.getDate()+(dia-1));
    const mm=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
    return mm+'-'+dd;
  }
  /* A FOLHA DE DATAS COMO O PAINEL A LÊ — derivada dos slots, não uma tabela paralela. Enquanto
     isto devolvia CAL_2026 diretamente, o painel mostrava um calendário e o jogo jogava outro. */
  function calendar(pais, epoch){
    const CAL=(typeof root!=='undefined' && root.CALENDARIOS_API) ? root.CALENDARIOS_API : null;
    if(!CAL) return CAL_2026;
    const cal=CAL.calendarioDe(pais), out={ draws:{} };
    Object.keys(cal.competicoes).forEach(k=>{
      const c=cal.competicoes[k];
      const chave=(k==='liga')?'league':k;
      out[chave]=c.slots.map(sl=>diaParaMMDD(diaDoSlot(sl, c.janela, epoch, pais), epoch));
      if(k!=='liga') out.draws[k]=diaParaMMDD(Math.max(1, diaDoSlot(c.slots[0], c.janela, epoch, pais)-2), epoch);
    });
    return out;
  }
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
  /* dia do jogo da jornada `round` da liga — jornada+1 é o slot */
  function leagueMatchDay(round, epoch, pais){
    return diaDoSlot(Math.max(0, round||0)+1, 'WEEKEND', epoch, pais);
  }
  /* dia do jogo de uma copa numa jornada — mesma conta, com a janela da competição */
  function cupMatchDayAt(key, jornada, epoch, pais){
    return diaDoSlot(Math.max(0, jornada||0)+1, janelaDaCompeticao(key, pais), epoch, pais);
  }
  /* dia do jogo da rodada `idx` (0-based) de uma copa */
  function cupMatchDayByRound(key, idx, epoch){
    const datas=CAL_2026[key];
    if(datas && datas[idx]!=null) return calDay(datas[idx], epoch);
    return null;
  }
  /* sorteio: dois dias antes da estreia da competição. Competição que a folha do país não
     declara sorteia no dia 1 — nunca há jogo antes, que é o comportamento seguro. */
  function cupDrawDay(key, epoch, pais){
    const CAL=(typeof root!=='undefined' && root.CALENDARIOS_API) ? root.CALENDARIOS_API : null;
    const c=CAL ? (CAL.calendarioDe(pais).competicoes||{})[key] : null;
    if(!c || !c.slots.length) return 1;
    return Math.max(1, diaDoSlot(c.slots[0], c.janela, epoch, pais)-2);
  }

  /* ---------- CRONOGRAMA: em que JORNADA cada rodada de cada copa acontece ----------
     Estritamente crescente por construção: as datas são crescentes e jornadaOfCalDate é
     monotônica; duas rodadas que caíssem na mesma jornada empurram a seguinte, porque uma
     competição nunca joga duas rodadas no mesmo bloco de semana. */
  /* ---------- EM QUE JORNADA CADA RODADA DE CADA COPA ACONTECE ----------
     Sai dos SLOTS, como o plano de dias: jornada = slot - 1. É o que mantém o jogo SOLO e a
     Resenha no mesmo calendário — enquanto isto lia a folha de datas e o plano de dias lia os
     slots, existiam dois calendários, que é a forma exata do bug que os slots vieram resolver.

     As jornadas de uma copa são estritamente crescentes porque os slots são, e a final pode cair
     numa jornada além do fim da liga de propósito: é lá que ela acontece na vida real. Quem
     estica a temporada para alcançá-la é prorrogarPorCopasPendentes, que já fazia exatamente
     isso — só que a consertar um erro, e agora a cumprir um desenho. */
  function buildCupSchedule(key, total, epoch, pais){
    if(!total || total<1) return [];
    const CAL=(typeof root!=='undefined' && root.CALENDARIOS_API) ? root.CALENDARIOS_API : null;
    if(!CAL) return [];
    const cal=CAL.calendarioDe(pais);
    const c=slotsDaCompeticao(cal, key, total);
    if(c) return c.slots.map(s=>Math.max(0, s-1));
    /* competição que a folha do país não declara (um universo sem aquela copa): mantém o
       escalonamento antigo de 3 em 3 jornadas, que é o que existia antes de haver folha. */
    const first=CUP_FIRST_ROUND[key]; if(first==null) return [];
    const out=[]; for(let i=0;i<total;i++) out.push(first+i*3);
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
  /* ===================== O PLANO DE DIAS, SOBRE SLOTS =====================
     A temporada é uma fila de dias. Cada dia é `(slot, janela)` — a semana e o momento dentro
     dela —, e essa é a ÚNICA coordenada. A jornada e a data saem DELA; antes eram fontes
     independentes que podiam discordar, e discordavam: a final marcada antes da semifinal.

     `opts.pais` escolhe a folha (engine/calendars.js); `opts.jornadasLiga` diz quantas rodadas a
     liga daquele save tem de verdade — uma Championship de 24 clubes tem 46, uma Bundesliga de 18
     tem 34, e a folha do país declara slots para a mais longa. Sem o dado, usa o tamanho da folha.

     `totais` é quantas rodadas cada copa precisa NESTA temporada (cupTotalRounds no core), que não
     é o número de slots declarados: o formato varia com o número de grupos, e as continentais
     gastam uma rodada só no sorteio do mata-mata. Quando faltam slots, a competição ganha os que
     faltarem depois do fim da temporada, no mesmo passo que já vinha usando — a final atrasa, mas
     NUNCA se perde. Quem confere isso antes de a temporada começar é scripts/teste-calendario.mjs. */
  function slotsDaCompeticao(cal, key, total){
    const c=(cal.competicoes||{})[key]; if(!c) return null;
    const base=c.slots.slice();
    /* SOBRAM SLOTS: fica com os ÚLTIMOS, não com os primeiros. A final tem de morar no último
       slot declarado — é ele que a folha escolheu para ficar depois do fim da liga. Cortando pela
       frente, uma copa com menos rodadas que o previsto decidia no meio da temporada, com o
       campeonato ainda a rolar. A competição apenas começa mais tarde, que é o comportamento
       certo para um mata-mata mais curto. */
    if(!total || total<=base.length) return { janela:c.janela, slots:total ? base.slice(base.length-total) : base };
    // faltam slots: estende mantendo o passo médio da competição (mínimo 1), depois do último
    const passo=Math.max(1, Math.round((base[base.length-1]-base[0])/Math.max(1,base.length-1)));
    let s=base[base.length-1];
    while(base.length<total){ s+=passo; base.push(s); }
    return { janela:c.janela, slots:base };
  }
  /* RÓTULO de data. Deriva do slot: o jogo de liga daquele slot é a data real da folha (quando o
     país tem uma), e as janelas de meio de semana caem 4 e 3 dias antes. Slot sem data de liga
     (os do fim da temporada, e os países sem folha) anda uma semana por slot a partir da última
     conhecida. Nada disto ordena coisa nenhuma — quem ordena é a chave do slot. */
  function dataDoDia(cal, slot, janela, epoch){
    const L=cal.datasLiga, e=epoch||cal.inicio||SEASON_START_2026;
    const iLiga=(cal.competicoes.liga.slots||[]).indexOf(slot);
    let base;
    if(L && iLiga>=0 && L[iLiga]!=null) base=calDay(L[iLiga], e);
    else if(L && L.length){
      const ultimo=cal.competicoes.liga.slots[Math.min(L.length,cal.competicoes.liga.slots.length)-1];
      base=calDay(L[L.length-1], e) + (slot-ultimo)*7;
    } else base=(slot-1)*7+1;
    if(janela==='WEEKEND') return base;
    const recuo=(janela==='MIDWEEK_1')?4:3;
    /* O RÓTULO NUNCA ANDA PARA TRÁS. As datas reais da liga não são igualmente espaçadas — entre
       24/10 e 27/10 há três dias —, então recuar 4 punha o meio de semana ANTES do jogo do slot
       anterior. A ordem não dependia disso (quem ordena é o slot), mas a tela mostrava 27/10 e
       logo a seguir 26/10, que é a espécie de coisa que faz o jogador desconfiar do calendário.
       Aqui o dia é empurrado para depois do jogo anterior quando o recuo o levaria longe demais. */
    const iAnterior=iLiga>0 ? iLiga-1 : -1;
    const anterior=(L && iAnterior>=0 && L[iAnterior]!=null) ? calDay(L[iAnterior], e) : null;
    const alvo=base-recuo;
    return (anterior!=null && alvo<=anterior) ? anterior+1 : alvo;
  }
  function buildDayPlan(cups, epoch, totais, opts){
    opts=opts||{};
    const CAL=(typeof root!=='undefined' && root.CALENDARIOS_API) ? root.CALENDARIOS_API : null;
    if(!CAL) return [];
    const cal=CAL.calendarioDe(opts.pais);
    const nLiga=opts.jornadasLiga || cal.competicoes.liga.slots.length;
    const ativas=(cups&&cups.length) ? cups.slice() : Object.keys(cal.competicoes).filter(k=>k!=='liga');
    const dias=[];
    /* A JORNADA É DERIVADA DO SLOT (slot 1 = jornada 0). Não é clampada ao fim da liga de
       propósito: as finais moram em slots depois do último jogo de liga, e clampá-las traria as
       três de volta para a mesma jornada — exatamente o amontoado que os slots existem para
       acabar. A temporada ganha essas jornadas sem jogo de liga pelo caminho que já existe
       (prorrogarPorCopasPendentes, logo abaixo). */
    const jornadaDoSlot=(slot)=>Math.max(0, slot-1);
    const ligaSlots=cal.competicoes.liga.slots;
    for(let r=0;r<nLiga;r++){
      const slot=ligaSlots[r]!=null ? ligaSlots[r] : (ligaSlots[ligaSlots.length-1]+(r-ligaSlots.length+1));
      dias.push({ r:jornadaDoSlot(slot), comp:'liga', idx:r, slot:slot, janela:'WEEKEND',
                  dia:dataDoDia(cal, slot, 'WEEKEND', epoch) });
    }
    ativas.forEach(key=>{
      const total=(totais && totais[key]) ? totais[key] : null;
      const c=slotsDaCompeticao(cal, key, total);
      if(!c) return;
      c.slots.forEach((slot,i)=>{
        dias.push({ r:jornadaDoSlot(slot), comp:key, idx:i, slot:slot, janela:c.janela,
                    dia:dataDoDia(cal, slot, c.janela, epoch) });
      });
    });
    /* UMA COORDENADA, UMA ORDEM. chaveDoDia é estritamente monótona em (slot, janela), e os slots
       de cada competição são crescentes por construção — então uma rodada nunca pode aparecer
       antes da anterior. É a invariante que o modelo antigo não conseguia garantir. */
    dias.sort((a,b)=>CAL.chaveDoDia(a.slot,a.janela)-CAL.chaveDoDia(b.slot,b.janela));
    return dias;
  }
  /* ===================== A SALA COM VÁRIOS PAÍSES =====================
     Regra do dono do jogo (18/08/2026): havendo um humano num país, esse país deixa de ser
     "fundo" e passa a ser jogável por inteiro — o jogador assiste a TODAS as partidas de TODAS as
     competições do país dele, como o brasileiro assiste às dele.

     É a fila de semanas que torna isso possível, e é por isso que os slots vieram antes: o SLOT é
     compartilhado pela sala inteira, e o que muda por país é qual competição entra em campo nele.
     No slot 5, janela do meio de semana, o brasileiro vê a Libertadores e o inglês vê a Champions
     — ao mesmo tempo, na mesma fila, sem ninguém esperar por ninguém.

     Daí uma consequência que o validador precisa saber: duas competições NÃO podem dividir o
     mesmo `(slot, janela)` DENTRO de um país — seria a mesma pessoa em duas telas. Entre países
     diferentes, dividir é o normal e é o objetivo.

     Cada dia carrega o `pais` a que pertence. Quem desenha a tela mostra só os dias do próprio
     país; o ponteiro anda pela fila inteira, que é o que mantém a sala junta. */
  function buildDayPlanMulti(paises, epoch, totaisPorPais, opts){
    opts=opts||{};
    const CAL=(typeof root!=='undefined' && root.CALENDARIOS_API) ? root.CALENDARIOS_API : null;
    if(!CAL) return [];
    const lista=(paises && paises.length) ? paises.slice() : ['brasil'];
    const jornadasPorPais=opts.jornadasLiga || {};
    const dias=[];
    lista.forEach(pais=>{
      const totais=(totaisPorPais && totaisPorPais[pais]) || null;
      const cal=CAL.calendarioDe(pais);
      const cups=(opts.cups && opts.cups[pais])
        || Object.keys(cal.competicoes).filter(k=>k!=='liga');
      const doPais=buildDayPlan(cups, epoch, totais, { pais, jornadasLiga:jornadasPorPais[pais] });
      doPais.forEach(d=>{ d.pais=pais; dias.push(d); });
    });
    /* MESMA CHAVE, MESMA ORDEM. A fila é uma só; o país é um rótulo do dia, não uma fila à parte.
       Empate entre países no mesmo (slot, janela) resolve-se pela ordem em que foram pedidos —
       determinístico, e sem consequência: são dias simultâneos para pessoas diferentes. */
    const ordem={}; lista.forEach((p,i)=>ordem[p]=i);
    dias.sort((a,b)=> (CAL.chaveDoDia(a.slot,a.janela)-CAL.chaveDoDia(b.slot,b.janela))
                   || ((ordem[a.pais]||0)-(ordem[b.pais]||0)) );
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
    const teto=(maximo!=null)?maximo:60;
    const jaExtras=S._jornadasExtras||0;
    if(jaExtras>=teto) return 0;
    S.cupCalendar=S.cupCalendar||{};
    const cals=()=>Object.keys(S.cupCalendar).filter(k=>k!=='_season' && Array.isArray(S.cupCalendar[k]));
    let criadas=0, agendadas=0;

    /* 1) A LIGA ESTICA ATE ALCANCAR O QUE A COPA JA TEM MARCADO.
       As copas deixaram de ser espremidas dentro da liga: a final da Libertadores cai na
       jornada 40 de um calendario de 38, porque a data real dela e depois do fim da liga.
       Acrescentar jornada nova por cima disso produzia `...,36,40,38` — a final jogada ANTES
       da meia-final. Primeiro estica, depois inventa. */
    const maiorMarcada=cals().reduce((m,k)=>Math.max(m, ...S.cupCalendar[k]), -1);
    while(S.sched.length<=maiorMarcada && (jaExtras+criadas)<teto){ S.sched.push([]); criadas++; }

    /* 2) CADA RODADA DEVIDA SEM DIA MARCADO GANHA UMA JORNADA SO DELA.
       `p.criar` ja vem descontado dos tiques FUTUROS que a competicao tem (ver copasPendentes
       no core) — aqui so se cria o que falta mesmo. Duas invariantes a respeitar:
       - FAIXA: toda jornada de uma competicao tem o mesmo resto na divisao por 3 (ver
         CUP_TICK_OFFSET). E a faixa que garante que duas copas nunca caem na mesma jornada,
         que era o "cada humano numa competicao diferente no mesmo dia".
       - UMA POR JORNADA: nem sequer duas competicoes diferentes partilham a jornada, para a
         sala inteira estar sempre na mesma tela. */
    const ocupadas=new Set();
    cals().forEach(k=>S.cupCalendar[k].forEach(j=>ocupadas.add(j)));
    const faixaDe=(key)=>{
      const cal=S.cupCalendar[key]||[];
      if(cal.length) return ((cal[cal.length-1]%3)+3)%3;
      const f=CUP_FIRST_ROUND[key];
      return f!=null ? ((f%3)+3)%3 : 0;
    };
    pendentes.forEach(p=>{
      let criar=Math.max(0, (p.criar!=null?p.criar:p.faltam)|0);
      if(!criar) return;
      const cal=(S.cupCalendar[p.key]||[]).slice();
      const faixa=faixaDe(p.key);
      let j=Math.max(S.sched.length, (cal.length?cal[cal.length-1]:(S.round||0))+1);
      while(((j%3)+3)%3!==faixa) j++;
      let voltas=0;
      while(criar>0 && (jaExtras+criadas)<teto && voltas++<400){
        if(!ocupadas.has(j)){
          cal.push(j); ocupadas.add(j); agendadas++; criar--;
          while(S.sched.length<=j && (jaExtras+criadas)<teto){ S.sched.push([]); criadas++; }
        }
        j+=3;
      }
      cal.sort((a,b)=>a-b);
      S.cupCalendar[p.key]=cal;
    });
    S._jornadasExtras=jaExtras+criadas;
    /* Devolve TUDO o que foi arrumado, nao so as jornadas criadas. Quando a copa devedora ja
       tinha jornada no calendario (a liga so precisou esticar), `criadas` podia vir 0 e quem
       chama lia isso como "nao ha nada a fazer" e fechava a temporada na mesma. */
    return criadas+agendadas;
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
    diaDoSlot, diaParaMMDD, janelaDaCompeticao, cupMatchDayAt,
    buildDayPlan, buildDayPlanMulti, DAY_MOMENTS, prorrogarPorCopasPendentes,
    cupDrawDay, buildCupSchedule, cupTickMatchesRound, cupRoundIndexAt,
    cupAlreadyResolved, markCupResolved, CUP_FIRST_ROUND,
    cpuMarket, cpuCaixaRodada, cpuCrescerEstadio };
  root.WORLD_RULES=API;
  if(typeof module!=='undefined' && module.exports){ module.exports=API; }
})(typeof globalThis!=='undefined'?globalThis:this);
