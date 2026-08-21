
/* ==================================================================
   resolve-round — resolvedor de rodada server-authoritative.
   Único produtor de games.shared_state pra rodada da divisão dos jogadores.
   Usa o MESMO motor de partida do cliente (MATCH_ENGINE, colado acima) ->
   paridade por construção. Partidas humanas = resultado submetido (game_seats.
   last_result, mandante-autoritativo); CPU = motor. Idempotente por state_version.
   COBERTO: liga + outras divisões (com override humano em qualquer divisão) +
   energia/moral + evolução + Copa do Brasil + VIRADA DE TEMPORADA (promoção/
   rebaixamento + envelhecimento/regen + reconstrução, quando a liga termina).
   AINDA CONGELADO: mercado de CPU, finanças/prêmios por-humano, copas de grupo
   (Libertadores/Sul-Americana — só Série A).
   ================================================================== */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/* ===== MOTOR DE PARTIDA COMPARTILHADO (colado de public/src/engine/match-engine.js — fonte única) ===== */
/* ===================================================================
   MOTOR DE PARTIDA PURO — fonte ÚNICA compartilhada cliente ⇄ servidor.
   Espelha simulate.js (simulateMatch), mas SEM globais: recebe os inputs
   explicitamente e devolve {hg,ag,scorers,events,perf}. O cliente e a edge
   function `resolve-round` usam ESTE mesmo código, garantindo paridade por
   construção (o jogador vê ao vivo exatamente o que o servidor grava).
   NÃO usar S/DATA/CL aqui — só o que vier nos argumentos.
   =================================================================== */
(function(root){
  'use strict';
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function hashSeed(){ let h=2166136261>>>0; const s=Array.prototype.join.call(arguments,'|');
    for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function makeRng(seed){ const r=mulberry32(seed>>>0);
    return { random:r, rnd:(a,b)=>a+r()*(b-a),
      gauss:(mu,sd)=>{let u=0,v=0;while(!u)u=r();while(!v)v=r();return mu+sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);},
      int:(n)=>Math.floor(r()*n), pick:(arr)=>arr[Math.floor(r()*arr.length)] }; }

  const TACTIC_BETA={retranca:-0.09, equilibrado:0, ofensivo:0.10};
  const ENG={rev:0.82, sd:0.33, danger:0.58, shot:0.28, conv:0.52, penaltyChance:0.025}; // era 0.055
  const ENG2={ alphaAtk:0.08, alphaMid:0.05, alphaMidCount:0.018, convDiff:0.004 };
  const BEHAVIOR_CARD_MULT={ 'Casca-Grossa':3.2, 'Brigão':2.4, 'Encrenqueiro':1.7, 'Discreto':1.0, 'Manso':0.75, 'Exemplar':0.4 };
  const BEHAVIOR_INJURY_MULT={ 'Discreto':1.6, 'Manso':0.55, 'Exemplar':0.85, 'Encrenqueiro':1.0, 'Brigão':1.05, 'Casca-Grossa':1.1 };
  const RIVALRIES=[
    ['Flamengo','Fluminense'],['Flamengo','Vasco'],['Flamengo','Botafogo'],['Fluminense','Vasco'],['Botafogo','Vasco'],
    ['Corinthians','Palmeiras'],['Corinthians','São Paulo'],['Corinthians','Santos'],['Palmeiras','São Paulo'],['Palmeiras','Santos'],['São Paulo','Santos'],
    ['Grêmio','Internacional'],['Atlético','Cruzeiro'],['Bahia','Vitória'],
    ['Liverpool','Everton'],['Liverpool','Manchester Unite'],['Manchester Unite','Manchester City'],['Arsenal','Tottenham'],['Arsenal','Chelsea'],['Chelsea','Tottenham'],
    ['Real Madrid','Barcelona'],['Real Madrid','Atlético de Madr'],['Barcelona','Espanyol'],['Sevilla','Real Betis Balom'],
    ['Inter Milan','Milan'],['Juventus','Inter Milan'],['Juventus','Milan'],['Roma','Lazio'],['Napoli','Roma'],
    ['Bayern Munich','Borussia Dortmun'],['Benfica','Porto'],['Benfica','Sporting CP'],['Porto','Sporting CP'],
  ];
  function isDerby(aShort,bShort){ return RIVALRIES.some(function(p){return (p[0]===aShort&&p[1]===bShort)||(p[0]===bShort&&p[1]===aShort);}); }
  function atkIndex(os,ms){ return 0.55*os + 0.45*ms; }
  function defIndex(ds,ms){ return 0.72*ds + 0.28*ms; }
  function matchMu(H,A,betaH,betaA,ctx){ ctx=ctx||{};
    const atkH=atkIndex(H.OS,H.MS), atkA=atkIndex(A.OS,A.MS);
    const defH=defIndex(H.DS,H.MS), defA=defIndex(A.DS,A.MS);
    const threat = ENG2.alphaAtk*((atkH/defA)-(atkA/defH));
    const midDom = ENG2.alphaMid*((H.MS-A.MS)/(((H.MS+A.MS)/2)||1));
    const midCount = ENG2.alphaMidCount*((ctx.nMidH||0)-(ctx.nMidA||0));
    return threat + midDom + midCount + (betaH-betaA) + (ctx.homeAdv||0.06); }
  function shotConv(atkIdx,defIdx,finisherMoral){
    let conv=ENG.conv*(atkIdx/(((atkIdx+defIdx)/2)||1));
    conv += clamp(atkIdx-defIdx,-25,25)*ENG2.convDiff;
    if((finisherMoral||70)<40) conv*=0.5;
    return clamp(conv,0.08,0.85); }
  /* mando pela capacidade do estádio já RESOLVIDA pelo chamador (faixa [0.007,0.016]) */
  function homeAdvantageFromCap(cap){ if(cap==null) cap=8000; const t=clamp((cap-8000)/(75000-8000),0,1); return 0.007 + t*0.009; }
  function formationEmphasis(players){
    const n=function(s){return players.filter(function(p){return p.s===s;}).length;};
    const nDEF=n('DEF'), nATT=n('ATT'), nMID=n('MID');
    return { OS: 1 + (nATT-3)*0.045 - (nDEF-4)*0.010, MS: 1 + (nMID-3)*0.005, DS: 1 + (nDEF-4)*0.010 - (nATT-3)*0.040, nMID:nMID }; }
  function pickPenaltyTaker(pool, R){
    const eligible=pool.filter(function(p){return p.s!=='GK';});
    const list=eligible.length?eligible:pool; if(!list.length) return null;
    const weights=list.map(function(p){return Math.max(1,p.f)*(p.s==='ATT'?1.3:p.s==='MID'?1.1:1);});
    let tot=weights.reduce(function(a,b){return a+b;},0), r=R.random()*tot;
    for(let i=0;i<list.length;i++){ r-=weights[i]; if(r<=0) return list[i]; }
    return list[list.length-1]; }
  function penaltyConvChance(taker, gk){ if(!taker) return 0.75;
    const base=0.76;
    const takerBonus=((taker.f||65)-70)/100*0.35;
    const posBonus = taker.s==='ATT'?0.05:taker.s==='MID'?0.02:taker.s==='DEF'?-0.02:-0.08;
    const gkPenalty = gk ? (((gk.f||65)-65)/100)*0.22 : 0;
    const moralAdj = ((taker.moral||70)-70)/100*0.12;
    return clamp(base+takerBonus+posBonus-gkPenalty+moralAdj, 0.42, 0.93); }

  /* ===== a PARTIDA (espelho fiel de simulateMatch/simEventsC) =====
     side H/A: { rat:{OS,MS,DS,mor}, xi:[{n,f,s,energy,moral,behavior}], tactic, cap, short }
     seed: uint32 já derivado (matchSeed). opts:{importance,extraTime}
     retorna { hg, ag, scorers:[{id,name,min}], events:[...], perf:{H,A} } */
  function simMatchPure(homeId, awayId, home, away, seed, opts){
    opts=opts||{};
    const R=makeRng((seed>>>0));
    const hp=home.xi||[], ap=away.xi||[];
    const emH=formationEmphasis(hp), emA=formationEmphasis(ap);
    const H={OS:home.rat.OS*emH.OS, MS:home.rat.MS*emH.MS, DS:home.rat.DS*emH.DS, mor:home.rat.mor};
    const A={OS:away.rat.OS*emA.OS, MS:away.rat.MS*emA.MS, DS:away.rat.DS*emA.DS, mor:away.rat.mor};
    const betaH=TACTIC_BETA[home.tactic||'equilibrado'], betaA=TACTIC_BETA[away.tactic||'equilibrado'];
    const homeAdv=homeAdvantageFromCap(home.cap);
    const derby=isDerby(home.short, away.short);
    const sd=ENG.sd*(derby?1.18:1)*(opts.importance?1.12:1);
    const ctxMid={ nMidH:emH.nMID, nMidA:emA.nMID, homeAdv:homeAdv };
    let pos=0, minute=0, hg=0, ag=0; const scorers=[];
    const perf={H:{poss:0,shots:0,chances:0,big:0,goals:0}, A:{poss:0,shots:0,chances:0,big:0,goals:0}};
    const cardState={H:new Map(),A:new Map()}, offField={H:new Set(),A:new Set()}, menOnField={H:11,A:11};
    const events=[];
    function activePool(side){ const players=side==='H'?hp:ap; const off=offField[side]; const a=players.filter(function(p){return !off.has(p.n);}); return a.length?a:players; }
    function teamPenalty(side){ const n=menOnField[side]; return n>=11?1:n===10?0.90:n===9?0.78:0.65; }
    function effRat(side){ const b=side==='H'?H:A; const tp=teamPenalty(side); return {OS:b.OS*tp, MS:b.MS*tp, DS:b.DS*tp}; }
    function currentMu(){ return matchMu(effRat('H'), effRat('A'), betaH, betaA, ctxMid); }
    function scorerFrom(id,players){ const atk=players.filter(function(p){return p.s==='ATT'||p.s==='MID';});
      const pool=atk.length?atk:players; let tot=pool.reduce(function(s,p){return s+p.f;},0), r=R.random()*tot;
      for(const p of pool){r-=p.f;if(r<=0)return p;} return pool[0]; }
    function pickFoulPlayer(side){ const pool=activePool(side).filter(function(p){return p.s!=='GK';});
      const list=pool.length?pool:activePool(side); if(!list.length) return null;
      const w=function(p){return (110-p.f)*(BEHAVIOR_CARD_MULT[p.behavior]||1);};
      let tot=list.reduce(function(s,p){return s+w(p);},0), r=R.random()*tot;
      for(const p of list){ r-=w(p); if(r<=0) return p; } return list[list.length-1]; }
    /* SÚMULA DE PARTICIPAÇÃO: quantos minutos cada jogador passou em campo. Contada minuto a
       minuto sobre quem NÃO está em offField, então expulsão e lesão já entram sozinhas (aqui
       não há substituição — a sessão ao vivo do cliente é que tem, e conta do mesmo jeito).
       É o que permite a nota/energia/moral tratarem quem saiu no meio do jogo com fidelidade,
       em vez de olharem só o onze do fim. Creditado no INÍCIO do minuto: quem é expulso aos 60'
       jogou o minuto 60. */
    const capMin={H:new Map(), A:new Map()};
    function keyOf(p){ return p.pid!=null?p.pid:p.n; }
    function creditMinute(){
      ['H','A'].forEach(function(side){
        const players=side==='H'?hp:ap, off=offField[side], m=capMin[side];
        players.forEach(function(p){ if(!off.has(p.n)){ const k=keyOf(p); m.set(k,(m.get(k)||0)+1); } });
      });
    }
    function capsFor(side){ const players=side==='H'?hp:ap, m=capMin[side];
      return players.map(function(p){ return {pid:p.pid, n:p.n, mins:m.get(keyOf(p))||0}; })
        .filter(function(c){ return c.mins>0; }); }
    function tickMinute(stoppage){
      minute++;
      creditMinute();
      const mu=currentMu();
      pos = clamp(pos*ENG.rev + R.gauss(mu,sd), -1.15, 1.15);
      perf[pos>0?'H':'A'].poss++;
      let ev=null;
      const home2 = pos>0; const hSide=home2?'H':'A';
      if(Math.abs(pos)>=ENG.danger && R.random() < ENG.shot*((Math.abs(pos)-ENG.danger)/(1.15-ENG.danger)+0.15)){
        const atkId=home2?homeId:awayId;
        const eA=effRat(hSide), eD=effRat(home2?'A':'H');
        const atkIdx=atkIndex(eA.OS,eA.MS), defIdx=defIndex(eD.DS,eD.MS);
        const atkPool=activePool(hSide);
        perf[hSide].shots++;
        if(R.random()<ENG.penaltyChance){
          const defSide=home2?'A':'H'; const defPool=activePool(defSide);
          const gk=defPool.find(function(p){return p.s==='GK';})||null;
          const taker=pickPenaltyTaker(atkPool,R);
          const pConv=penaltyConvChance(taker,gk);
          const scored=R.random()<pConv;
          perf[hSide].big++;
          if(scored){ if(home2){hg++;} else {ag++;} perf[hSide].goals++; scorers.push({id:atkId,name:taker.n,min:minute}); pos=home2?-0.15:0.15; }
          ev={type:'penalti',side:hSide,min:minute,team:atkId,scorer:taker?taker.n:null,gk:gk?gk.n:null,scored:scored,stoppage:stoppage};
        } else {
          const sc=scorerFrom(atkId, atkPool);
          const conv=shotConv(atkIdx,defIdx,sc.moral);
          if(conv>=0.5) perf[hSide].big++;
          if(R.random()<conv){
            if(home2){hg++;} else {ag++;} perf[hSide].goals++;
            scorers.push({id:atkId,name:sc.n,min:minute}); pos=home2?-0.15:0.15;
            ev={type:'gol',side:hSide,min:minute,scorer:sc.n,team:atkId,stoppage:stoppage};
          } else { perf[hSide].chances++; ev={type:'chance',side:hSide,min:minute,scorer:sc.n,team:atkId,pos:pos}; }
        }
      } else if(R.random()<0.022){ // calibrado pra ~2-3 cartões/partida (era 0.026)
        const foulSide=home2?'A':'H'; const foulTeam=foulSide==='H'?homeId:awayId;
        const p=pickFoulPlayer(foulSide);
        if(p){
          if(R.random()<0.035){ offField[foulSide].add(p.n); menOnField[foulSide]=Math.max(6,menOnField[foulSide]-1); // era 10% -> expulsão bem mais rara
            ev={type:'cartao',side:foulSide,min:minute,team:foulTeam,player:p.n,pos:p.s,cardType:'vermelho',reason:'direto'}; }
          else if(cardState[foulSide].get(p.n)==='amarelo'){ cardState[foulSide].set(p.n,'vermelho');
            offField[foulSide].add(p.n); menOnField[foulSide]=Math.max(6,menOnField[foulSide]-1);
            ev={type:'cartao',side:foulSide,min:minute,team:foulTeam,player:p.n,pos:p.s,cardType:'vermelho',reason:'segundo amarelo'}; }
          else { cardState[foulSide].set(p.n,'amarelo'); ev={type:'cartao',side:foulSide,min:minute,team:foulTeam,player:p.n,pos:p.s,cardType:'amarelo',reason:null}; }
        }
      } else if(R.random()<0.0026){ // calibrado pra ~1 lesão a cada 4-5 partidas (era 0.011)
        const side=R.random()<0.5?'H':'A'; const team=side==='H'?homeId:awayId;
        const pool=activePool(side);
        if(pool.length){
          const wInj=function(p){return BEHAVIOR_INJURY_MULT[p.behavior]||1;};
          let tot=pool.reduce(function(s,p){return s+wInj(p);},0), r=R.random()*tot, p=pool[pool.length-1];
          for(const cand of pool){ r-=wInj(cand); if(r<=0){ p=cand; break; } }
          const grave=R.random()<0.30;
          const outMatches=grave?Math.floor(R.rnd(2,5)):(R.random()<0.5?1:0);
          offField[side].add(p.n); menOnField[side]=Math.max(6,menOnField[side]-1);
          ev={type:'lesao',side:side,min:minute,team:team,player:p.n,pos:p.s,severity:grave?'grave':'leve',outMatches:outMatches};
        }
      }
      if(ev) events.push(ev);
      return ev;
    }
    const regularMinutes = opts.extraTime ? 30 : 90;
    while(minute<regularMinutes){ tickMinute(false); }
    const add=opts.extraTime ? Math.floor(R.rnd(1,4)) : Math.floor(R.rnd(1,5));
    while(minute<regularMinutes+add){ tickMinute(true); }
    return { hg:hg, ag:ag, scorers:scorers, events:events, perf:perf,
             caps:{H:capsFor('H'), A:capsFor('A')}, matchMinutes:minute };
  }

  /* ===== NOTA DA PARTIDA — fonte ÚNICA cliente ⇄ servidor =====
     Antes existiam três cópias desta conta (simulate.js no solo, mpRate no fallback local do
     online e ratePlayersS na edge function), e elas já tinham divergido: a do fallback não
     descontava cartão nem lesão. Agora as três chamam ESTA função.

     Duas regras separam o que é do JOGADOR do que é do TIME:
     - individual (gol, cartão, lesão, força) conta INTEIRO — um gol aos 88' é um gol;
     - coletivo (vitória/derrota, dominância, jogo sem sofrer gol) entra proporcional aos
       MINUTOS em campo, porque quem entrou aos 85' não conduziu aquele resultado.
     Assim todo mundo que pisou em campo recebe nota — inclusive quem saiu no intervalo, que
     antes não recebia nada (a conta lia só o onze do fim da partida). */
  function domAdjust(myPerf, oppPerf){
    if(!myPerf||!oppPerf) return 0;
    const mp=myPerf.poss||0, op=oppPerf.poss||0;
    const possShare=(mp+op)? mp/(mp+op) : 0.5;
    const chanceEdge=((myPerf.chances||0)+(myPerf.big||0)+(myPerf.goals||0))-((oppPerf.chances||0)+(oppPerf.big||0)+(oppPerf.goals||0));
    return clamp((possShare-0.5)*1.4 + clamp(chanceEdge,-8,8)*0.05, -0.6, 0.6);
  }
  /* input: { players:[{pid,n,s,f,mins}], matchMinutes, gf, ga, clubId, scorers, incidents, R }
     incidents = mapa nome -> {cardType,injured} da rodada (o mesmo S._roundIncidents).
     devolve [{pid,n,mins,share,r,goals,cs}] — quem chama é que escreve em p.stats. */
  function rateAppearances(input){
    input=input||{};
    const players=input.players||[], R=input.R;
    const total=Math.max(1, input.matchMinutes||90);
    const gf=input.gf||0, ga=input.ga||0;
    const won=gf>ga, lost=gf<ga, cs=ga===0;
    const dom=domAdjust(input.myPerf, input.oppPerf);
    const inc=input.incidents||{};
    const scorers=input.scorers||[];
    return players.map(function(p){
      const share=clamp((p.mins||0)/total, 0, 1);
      const goals=scorers.filter(function(s){ return s.id===input.clubId && s.name===p.n; }).length;
      const back=(p.s==='GK'||p.s==='DEF');
      let r=6.0+((p.f||65)-65)*0.045+R.gauss(0,0.75);
      if(won) r+=0.5*share; else if(lost) r-=0.5*share;
      r+=dom*share;
      r+=goals*1.3;
      if(cs&&back) r+=0.6*share;
      const myInc=inc[p.n];
      if(myInc){
        if(myInc.cardType==='vermelho') r-=1.4; else if(myInc.cardType==='amarelo') r-=0.15;
        if(myInc.injured) r-=0.8;
      }
      // o CONTADOR de jogos sem sofrer gol (p.stats.cs) exige ter jogado a maior parte da
      // partida — diferente do bônus na nota, que é contínuo. Goleiro que entrou aos 80' num
      // 0x0 leva o bônus proporcional, mas não fica com a estatística inteira no Historial.
      return { pid:p.pid, n:p.n, mins:p.mins||0, share:share, goals:goals,
               cs:!!(cs&&back&&share>=0.5), r:+clamp(r,3,10).toFixed(1) };
    });
  }

  /* ===== coleta de INPUTS pura (espelho de ratings()/availableXI()/autoXI()) =====
     O servidor precisa montar rat/xi IGUAL ao cliente. Tudo determinístico a partir do elenco. */
  function engForce(f){ if(typeof f!=='number' || !isFinite(f)) return 40; return f<=49 ? f : 49 + (f-49)*0.33; }
  function isAvail(p){ return !(p.suspended>0) && !(p.injuredMatches>0); }
  function best11(avail){ return avail.slice().sort(function(a,b){return b.f-a.f;}).slice(0,11); }
  /* ratings de um clube. players = elenco COMPLETO [{n,f,s,energy,moral,suspended,injuredMatches}].
     xiNames = nomes da escalação escolhida (humano) ou null (CPU -> melhores 11). */
  function computeRatings(players, xiNames){
    const avail=(players||[]).filter(isAvail);
    let used;
    if(xiNames && xiNames.length){ const set=new Set(xiNames); const xiAvail=avail.filter(function(p){return set.has(p.pid)||set.has(p.n);});
      used = xiAvail.length ? xiAvail : best11(avail); }
    else { used = best11(avail); }
    const bySec=function(s){return used.filter(function(p){return p.s===s;});};
    const avg=function(a){return a.length?a.reduce(function(s,p){return s+engForce(p.f)*(0.6+0.4*p.energy/100);},0)/a.length:28;};
    let OS=avg(bySec('ATT')), MS=avg(bySec('MID')), DS=(avg(bySec('GK'))*0.35+avg(bySec('DEF'))*0.65);
    const mor= used.length ? used.reduce(function(s,p){return s+(p.moral!=null?p.moral:70);},0)/used.length : 70;
    if(mor<50){ OS*=0.85; MS*=0.85; DS*=0.85; }
    return {OS:OS,MS:MS,DS:DS,mor:mor};
  }
  /* XI que entra em campo (11): escala escolhida (filtrada por disponíveis) completada por força. */
  function resolveXI(players, xiNames){
    const avail=(players||[]).filter(isAvail);
    let chosen=[];
    if(xiNames && xiNames.length){ const set=new Set(xiNames); chosen=avail.filter(function(p){return set.has(p.pid)||set.has(p.n);}); }
    if(chosen.length<11){ const have=new Set(chosen.map(function(p){return p.pid;}));
      const extra=avail.filter(function(p){return !have.has(p.pid);}).sort(function(a,b){return b.f-a.f;});
      chosen=chosen.concat(extra); }
    return chosen.slice(0,11);
  }
  /* autoXI (nomes) — fallback pra clube humano sem escalação submetida. Espelha autoXI() do cliente. */
  function autoXINames(players){
    const sq=(players||[]).filter(isAvail).sort(function(a,b){return b.f-a.f;});
    const pick=function(sec,n){return sq.filter(function(p){return p.s===sec;}).slice(0,n);};
    let xi=pick('GK',1).concat(pick('DEF',4)).concat(pick('MID',3)).concat(pick('ATT',3));
    if(xi.length<11){ const have=new Set(xi.map(function(p){return p.pid;}));
      const add=function(p){ if(xi.length<11 && !have.has(p.pid)){ xi.push(p); have.add(p.pid); } };
      for(const p of sq){ if(p.s!=='GK') add(p); } for(const p of sq){ add(p); } }
    return xi.slice(0,11).map(function(p){return p.pid;});
  }
  /* capacidade de estádio pelo overall do clube (proxy) — usada pro mando no ONLINE (consistente em
     todos os clientes; sem depender do S.stadium de um usuário só). Espelha o ramo "proxy" de homeAdvantage. */
  function capFromOverall(overall){ const ov=overall||70; return 8000 + Math.max(0,ov-55)*2100; }

  const API={ simMatchPure:simMatchPure, penaltyConvChance:penaltyConvChance, pickPenaltyTaker:pickPenaltyTaker,
    rateAppearances:rateAppearances, domAdjust:domAdjust,
    makeRng:makeRng, hashSeed:hashSeed, clamp:clamp,
    computeRatings:computeRatings, resolveXI:resolveXI, autoXINames:autoXINames, capFromOverall:capFromOverall, engForce:engForce };
  if(typeof module!=='undefined' && module.exports){ module.exports=API; }
  root.MATCH_ENGINE=API;
})(typeof globalThis!=='undefined'?globalThis:this);


const ME = (globalThis as any).MATCH_ENGINE;

/* A FOLHA DE SLOTS. Vem ANTES do WORLD_RULES porque buildDayPlan e buildCupSchedule a leem. */
/* <<< CALENDARIOS:INICIO — gerado por scripts/sync-world-rules.mjs, NÃO editar aqui >>> */
/* ===================================================================
   CALENDÁRIOS POR PAÍS — a folha de SLOTS.

   POR QUE ISTO EXISTE. O calendário era uma tabela de datas reais (CAL_2026, em world-rules.js) e
   a temporada era montada a partir dela. Isso produziu o pior bug do jogo: existiam DUAS
   coordenadas — a jornada, que a ancoragem espremia para caber na temporada, e a data, que vinha
   da folha e não se movia junto. O plano de dias era ordenado por data, então a FINAL, que não
   tem data na folha e herdava um dia sintético, era marcada ANTES da própria semifinal. Medido
   nas três salas com day_plan de agosto/2026.

   AQUI SÓ EXISTE UMA COORDENADA: `(slot, janela)`.
     · SLOT é a semana da temporada, 1..slotsTotal.
     · JANELA é o momento dentro da semana: MIDWEEK_1 (ter/qua), MIDWEEK_2 (qui), WEEKEND.
   A ordem da temporada é `slot` e, dentro dele, a ordem das janelas. A DATA passou a ser
   RÓTULO derivado — ela aparece na tela e não decide nada. Duas coordenadas não podem discordar
   quando só existe uma.

   A JANELA É O DESEMPATE QUE FALTAVA. A ordenação era por data justamente porque duas
   competições caem na mesma semana e é preciso saber qual joga primeiro. Com slots isso é
   explícito — a final ocupa um slot PRÓPRIO, e a ordem dentro da semana é a das janelas.

   O QUE MUDA PARA QUEM JOGA. No calendário antigo havia 11 semanas com mais de uma copa, três
   delas com as três juntas — e metade da temporada sem copa nenhuma. Aqui cada copa tem a sua
   janela e nenhuma semana tem duas copas.

   ONDE MORAM AS FINAIS (regra do dono do jogo, 18/08/2026). Cada final tem a sua semana, sem
   jogo de liga, e todas elas vêm ANTES da última rodada do campeonato — que fecha a temporada.
   A folha chegou a pôr as finais DEPOIS do fim da liga, por ser o que a vida real faz; o efeito
   dentro do jogo era o oposto do pretendido: o campeonato acabava na rodada 38, a temporada
   dava-se por encerrada, e as três decisões viravam dias soltos no fim que o jogador atravessava
   sem as ver. Duas ou três semanas sem campeonato não incomodam ninguém; uma final que não
   acontece, incomoda.

   COMO ACRESCENTAR UM PAÍS: copiar um bloco e trocar os slots. Não há regra a mexer — é dado.
   `scripts/teste-calendario.mjs` confere as invariantes de todos os países declarados aqui.

   Regra de ouro (a mesma do world-rules.js): dado, não algoritmo. Nada de S, CL ou DOM.
   Injetada no resolve-round por scripts/sync-world-rules.mjs.
   =================================================================== */
(function(root){
  'use strict';

  /* A ordem das janelas DENTRO de um slot. É esta lista que resolve o caso da final da Copa do
     Brasil, e é por ela que o plano de dias é ordenado. */
  const JANELAS=['MIDWEEK_1','MIDWEEK_2','WEEKEND'];
  function ordemDaJanela(j){ const i=JANELAS.indexOf(j); return i<0 ? JANELAS.length : i; }
  /* chave ordenável de um dia — estritamente monótona, e a ÚNICA usada para ordenar */
  function chaveDoDia(slot, janela){ return (slot|0)*JANELAS.length + ordemDaJanela(janela); }

  function serie(de, ate){ const a=[]; for(let i=de;i<=ate;i++) a.push(i); return a; }

  /* ===================== O EIXO É DO MUNDO, NÃO DE UM PAÍS =====================
     O slot 40 tem de ser a MESMA semana para toda a gente. É isso que permite uma sala com
     brasileiro e inglês andar junta — e é isso que vai permitir, mais à frente, uma competição
     MUNDIAL (um Mundial de Clubes) em que clubes de países diferentes se enfrentam: ela ocupa um
     slot do mundo, e os dois calendários nacionais já sabem que aquela semana está tomada.

     Duas condições, e as duas são verificadas (validarCalendario):
       · todo país começa a temporada no MESMO dia (`inicio`) — se um começasse uma semana depois,
         o slot 40 dele seria outra semana e a fila da sala juntaria dias que não são simultâneos;
       · nenhum país passa de SLOTS_DO_MUNDO — é o tamanho do ano, e o teto comum.

     `slotsTotal` de cada país NÃO é o eixo: é onde a temporada daquele país acaba (o Brasil fecha
     na 42, a Inglaterra na 50). O eixo é este: */
  const SLOTS_DO_MUNDO=52;                 // as semanas do ano — o calendário é mundial
  const INICIO_DO_MUNDO=[2026,2,1];        // 1º de março: todo país começa aqui

  const CALENDARIOS={};

  /* ---------------- BRASIL ----------------
     Liga aos fins de semana, 38 rodadas espalhadas pelos 42 slots. As três copas em janelas de
     meio de semana, espaçadas, e nenhuma dividindo slot com outra: Libertadores na MIDWEEK_1;
     Sul-Americana e Copa do Brasil dividem a MIDWEEK_2, em slots disjuntos.

     AS SEMANAS 39, 40 E 41 SÃO AS DAS FINAIS, e não têm jogo de liga. A regra do dono do jogo
     (18/08/2026) é esta: a temporada NÃO acaba na última rodada do Brasileirão com as decisões
     ainda por jogar — as finais entram ANTES dela, e o campeonato fecha o ano no slot 42.
     Antes era o contrário (finais nos slots 40-42, depois do fim da liga) e o efeito para quem
     jogava era o pior possível: a liga acabava na rodada 38, o jogo dava a temporada por
     encerrada e as três finais viravam dias soltos no fim, atropelados pelo botão "Avançar".
     A quarta semana sem liga é a do slot 21 — a parada do meio do ano, que a folha ganha de
     graça por sobrar um slot depois de reservar as três das finais.

     ISTO É O PADRÃO PARA TODO PAÍS: reservar as semanas das decisões ANTES da última rodada da
     liga, mesmo que isso deixe duas ou três semanas sem jogo de campeonato. O salto não faz mal;
     a final não acontecer, faz. */
  CALENDARIOS.brasil={
    pais:'brasil', slotsTotal:42, inicio:[2026,2,1],
    competicoes:{
      liga:        { janela:'WEEKEND',   slots:serie(1,20).concat(serie(22,38), [42]) },
      libertadores:{ janela:'MIDWEEK_1', slots:[2,5,8,11,14,17,20,24,28,32,36,39] },
      sulamericana:{ janela:'MIDWEEK_2', slots:[3,6,9,12,15,18,21,25,29,33,37,40] },
      copaBrasil:  { janela:'MIDWEEK_2', slots:[4,10,16,23,30,35,41] },
    },
    /* datas reais dos jogos de liga, na ordem dos slots — RÓTULO, não ordenação. As de copa são
       derivadas: a MIDWEEK_1 cai 4 dias antes do jogo de liga daquele slot e a MIDWEEK_2, 3.
       A ÚLTIMA data não é a real (03/12): a última rodada do campeonato passou a fechar o ano
       DEPOIS das três finais, e mantê-la a 03/12 punha o rótulo a andar para trás — as finais
       eram datadas a partir do jogo de liga anterior (01/12) e caíam depois do fecho. O valor é o
       passo semanal a partir de 01/12 até ao slot 42, que é onde a rodada agora mora — assim
       nenhuma data derivada das semanas 39-41 ultrapassa a do fecho. A data é rótulo e segue o
       slot; quem manda é a ordem das semanas. */
    datasLiga:['03-01','03-07','03-30','04-10','04-16','05-06','05-11','05-15','06-01','06-07',
               '06-11','06-22','07-05','07-11','07-22','07-25','08-05','08-18','08-23','08-30',
               '09-14','09-20','09-24','09-28','10-01','10-05','10-10','10-18','10-21','10-24',
               '10-27','10-30','11-03','11-07','11-11','11-18','12-01','12-29'],
  };

  /* ---------------- INGLATERRA ----------------
     Existe para provar a forma com uma pirâmide diferente, e porque é o país que o levantamento
     de julho apontou como o mais caro: a Championship tem 24 clubes, logo 46 rodadas, contra as
     38 da Premier League. Com slots isso deixa de ser problema — a lista de slots de liga cobre a
     divisão MAIS LONGA, e quem joga numa divisão mais curta usa apenas os primeiros.
     Sem copa nacional (a FA Cup não existe no motor); Champions e Europa nas janelas de meio de
     semana, como as continentais do Brasil. */
  CALENDARIOS.Inglaterra={
    pais:'Inglaterra', slotsTotal:50, inicio:[2026,2,1],
    competicoes:{
      /* mesmo padrão do Brasil: as semanas 47 e 48 são as das finais, a 49 fica de folga e a
         liga fecha o ano no slot 50. A Premier League, que joga 38 e não 46 rodadas, usa estes
         mesmos slots espalhados (ver slotsDaLiga em world-rules.js) — também ela acaba no 50,
         depois das finais, em vez de terminar no meio da folha. */
      liga:           { janela:'WEEKEND',   slots:serie(1,24).concat(serie(26,46), [50]) },
      championsLeague:{ janela:'MIDWEEK_1', slots:[2,5,8,11,14,17,20,25,30,35,40,47] },
      europaLeague:   { janela:'MIDWEEK_2', slots:[3,6,9,12,15,18,21,26,31,36,41,48] },
    },
    datasLiga:null,          // sem folha de datas reais: os rótulos saem do passo semanal
  };

  /* ===================== O VALIDADOR =====================
     Uma folha de slots é DADO ESCRITO À MÃO, e dado escrito à mão erra. Estas são as regras que,
     se quebradas, produzem os bugs que já aconteceram — cada uma tem um nome e uma história:

       · POUCOS SLOTS: a competição precisa de mais rodadas do que a folha declara. Era assim que
         a final desaparecia — as continentais tinham 10 datas para 11 rodadas, e a que sobrava
         era sempre a última. O motor completa sozinho (slotsDaCompeticao estende), mas isso é
         conserto todo ano em vez de o dado estar certo desde o começo.
       · SLOT REPETIDO ou FORA DE ORDEM: duas rodadas da mesma copa no mesmo dia, ou a final
         antes da semifinal.
       · DIA PARTILHADO: duas competições no mesmo (slot, janela) — a sala inteira em duas telas
         ao mesmo tempo.
       · LIGA CURTA: a folha tem menos slots de liga do que a divisão mais longa do país joga
         (uma Championship de 24 clubes joga 46 rodadas, não 38).
       · FINAL DEPOIS DO FIM DA LIGA: a decisão fica para semanas em que já não há campeonato.
         Não é erro de motor — é escolha de calendário —, mas é a que faz o jogo parecer acabado
         na última rodada da liga, com as finais viradas em dias soltos no fim. A regra da casa
         é a inversa: a final vem ANTES da última rodada da liga, custe duas ou três semanas sem
         campeonato.

     AVISA, NUNCA TRAVA. Uma folha com problema tem de deixar o jogo abrir: travar já transformou
     erro de dado em sala morta (ver prorrogarPorCopasPendentes). Quem chama decide o que fazer
     com a lista — o painel pinta de vermelho, o teste reprova, o motor regista nos relatórios.

     `totais` é quantas rodadas cada competição precisa nesta temporada (cupTotalRounds no core);
     sem ele, a regra dos poucos slots não é verificável e é saltada.
     `divisoes` é o tamanho de cada divisão do país (UNIVERSOS[pais].size); sem ele, idem. */
  function validarCalendario(pais, opts){
    opts=opts||{};
    const cal=CALENDARIOS[pais];
    const out=[];
    const erro=(comp,texto)=>out.push({ nivel:'erro', comp, texto });
    const aviso=(comp,texto)=>out.push({ nivel:'aviso', comp, texto });
    if(!cal){ erro(null, 'não existe folha de calendário para "'+pais+'" — o jogo cai no calendário do Brasil'); return out; }

    const ocupadas={};
    Object.keys(cal.competicoes).forEach(key=>{
      const c=cal.competicoes[key];
      if(!c.slots || !c.slots.length){ erro(key, 'sem slots'); return; }
      if(JANELAS.indexOf(c.janela)<0) erro(key, 'janela desconhecida: "'+c.janela+'"');
      for(let i=1;i<c.slots.length;i++){
        if(c.slots[i]===c.slots[i-1]) erro(key, 'slot '+c.slots[i]+' repetido — duas rodadas no mesmo dia');
        else if(c.slots[i]<c.slots[i-1]) erro(key, 'slots fora de ordem ('+c.slots[i-1]+' depois de '+c.slots[i]+') — a final viria antes da semifinal');
      }
      c.slots.forEach(sl=>{
        if(sl<1 || sl>cal.slotsTotal) erro(key, 'slot '+sl+' fora do intervalo 1..'+cal.slotsTotal);
        const chave=sl+':'+c.janela;
        if(ocupadas[chave]) erro(key, 'divide o dia '+sl+'/'+c.janela+' com '+ocupadas[chave]+' — a sala ficaria em duas telas');
        else ocupadas[chave]=key;
      });
      const total=opts.totais && opts.totais[key];
      if(total && total>c.slots.length)
        erro(key, 'precisa de '+total+' rodadas e a folha declara '+c.slots.length+' slots — faltam '+(total-c.slots.length)+' (o motor completa, mas a folha fica errada)');
    });

    /* O EIXO COMUM. Um país que comece noutro dia, ou que passe do tamanho do ano, quebra a
       simultaneidade da sala: o slot deixaria de ser a mesma semana para toda a gente. */
    if(cal.slotsTotal>SLOTS_DO_MUNDO)
      erro(null, 'a temporada usa '+cal.slotsTotal+' slots e o ano tem '+SLOTS_DO_MUNDO);
    const ini=cal.inicio||INICIO_DO_MUNDO;
    if(ini.join('-')!==INICIO_DO_MUNDO.join('-'))
      erro(null, 'começa em '+ini.join('-')+' e o mundo começa em '+INICIO_DO_MUNDO.join('-')+
                 ' — o slot deixaria de ser a mesma semana para todos');

    const liga=cal.competicoes.liga;
    if(!liga) erro('liga', 'a folha não declara a liga');
    else if(opts.divisoes){
      let maior=0;
      Object.keys(opts.divisoes).forEach(d=>{ const n=2*((opts.divisoes[d]||0)-1); if(n>maior) maior=n; });
      if(maior>liga.slots.length)
        erro('liga', 'a divisão mais longa joga '+maior+' rodadas e a folha declara '+liga.slots.length+' slots de liga');
    }
    if(liga && liga.slots.length){
      const fim=liga.slots[liga.slots.length-1];
      Object.keys(cal.competicoes).forEach(key=>{
        if(key==='liga') return;
        const c=cal.competicoes[key], total=(opts.totais && opts.totais[key]) || c.slots.length;
        const usados=(total<=c.slots.length) ? c.slots.slice(c.slots.length-total) : c.slots;
        const finalEm=usados[usados.length-1];
        if(finalEm>fim) aviso(key, 'a final cai no slot '+finalEm+', depois de a liga já ter acabado no '+fim+
                                   ' — a temporada parece encerrada antes da decisão');
      });
    }
    return out;
  }

  /* ===================== FOLHA VINDA DO PACOTE =====================
     É isto que torna "acrescentar um país" trabalho de tela em vez de código: o painel admin grava
     uma folha em `pack_edits` e o jogo instala-a por cima da que vem no repositório. O servidor lê
     a mesma linha, pelo mesmo caminho — se só o cliente lesse, cliente e servidor jogariam
     calendários diferentes, que é a família de bug que este arquivo inteiro existe para acabar.

     REGRA DE ENTRADA: folha com ERRO não entra. Um calendário torto vindo do banco pode deixar
     uma sala sem final ou com duas competições no mesmo dia, e ninguém repara até dezembro.
     Aviso não bloqueia (é escolha de calendário, não defeito); erro bloqueia e a folha do
     repositório continua a valer. Devolve o que aconteceu, para quem chamou poder registar. */
  function instalarCalendario(pais, folha, opts){
    if(!pais || !folha || !folha.competicoes) return { ok:false, motivo:'folha vazia', problemas:[] };
    const anterior=CALENDARIOS[pais];
    CALENDARIOS[pais]=folha;
    const problemas=validarCalendario(pais, opts||{});
    const erros=problemas.filter(x=>x.nivel==='erro');
    if(erros.length){
      if(anterior) CALENDARIOS[pais]=anterior; else delete CALENDARIOS[pais];
      return { ok:false, motivo:'folha recusada: '+erros.length+' erro(s)', problemas };
    }
    return { ok:true, motivo:anterior?'folha substituída':'país novo', problemas };
  }

  function calendarioDe(pais){ return CALENDARIOS[pais] || CALENDARIOS.brasil; }
  function temCalendario(pais){ return !!CALENDARIOS[pais]; }
  function paisesComCalendario(){ return Object.keys(CALENDARIOS); }

  const API={ JANELAS, ordemDaJanela, chaveDoDia, CALENDARIOS, calendarioDe, temCalendario,
    SLOTS_DO_MUNDO, INICIO_DO_MUNDO,
    paisesComCalendario, validarCalendario, instalarCalendario };
  root.CALENDARIOS_API=API;
  if(typeof module!=='undefined' && module.exports){ module.exports=API; }
})(typeof globalThis!=='undefined'?globalThis:this);
/* <<< CALENDARIOS:FIM >>> */
/* <<< WORLD_RULES:INICIO — gerado por scripts/sync-world-rules.mjs, NÃO editar aqui >>> */
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
    /* FALTAM SLOTS: a competição cresce PARA TRÁS, nunca para a frente.
       Estender depois do último slot declarado empurrava a final para além do fim da liga — o
       exato defeito que a folha nova existe para evitar. E é fácil acontecer: basta um formato
       com mais rodadas do que a folha previu (uma chave maior, um grupo a mais). O último slot é
       onde a folha decidiu que a decisão mora, e essa escolha não se mexe; o que se mexe é a
       ESTREIA, que passa a ser mais cedo. Se não houver semana livre antes do slot 1, aí sim
       acrescenta-se no fim — melhor uma final fora de sítio do que uma rodada sem dia. */
    const passo=Math.max(1, Math.round((base[base.length-1]-base[0])/Math.max(1,base.length-1)));
    /* a semana anterior só serve se estiver LIVRE nesta janela. Duas competições partilham a
       MIDWEEK_2 (Sul-Americana e Copa do Brasil, em slots disjuntos) — crescer para trás sem
       olhar punha as duas no mesmo dia, que é a sala inteira em duas telas. */
    const ocupados={};
    Object.keys(cal.competicoes).forEach(k2=>{
      if(k2===key) return; const o=cal.competicoes[k2];
      if(o.janela!==c.janela) return;
      (o.slots||[]).forEach(sl=>{ ocupados[sl]=true; });
    });
    while(base.length<total){
      const alvo=base[0]-passo;
      if(alvo<1 || ocupados[alvo]) break;      // sem semana livre antes da estreia: cresce no fim
      base.unshift(alvo);
    }
    let f=base[base.length-1];
    while(base.length<total){ f+=passo; base.push(f); }
    return { janela:c.janela, slots:base };
  }
  /* RÓTULO de data. Deriva do slot: o jogo de liga daquele slot é a data real da folha (quando o
     país tem uma), e as janelas de meio de semana caem 4 e 3 dias antes. Nada disto ordena coisa
     nenhuma — quem ordena é a chave do slot.

     SEMANA SEM LIGA: ancora na ÚLTIMA semana de liga ANTES dela e anda sete dias por slot. A
     regra antiga ancorava sempre na última data da folha inteira, o que só estava certo enquanto
     os buracos ficavam todos no FIM da temporada. Desde que as finais passaram a morar em
     semanas próprias no meio-fim do calendário (e a parada do meio do ano ficou sem jogo), o
     slot 21 era datado a partir de dezembro e recuado 21 semanas — o rótulo saltava meio ano
     para trás. A data nunca pode andar para trás: é regra da casa, e é o que o teste cobre. */
  function ancoraDeLiga(cal, slot){
    const S=cal.competicoes.liga.slots||[], L=cal.datasLiga;
    const n=L ? Math.min(L.length, S.length) : 0;
    let i=-1;
    for(let k=0;k<n;k++){ if(S[k]<=slot) i=k; else break; }
    return i;                        // índice na folha de datas, ou -1 se o slot vem antes de tudo
  }
  function dataDoDia(cal, slot, janela, epoch){
    const L=cal.datasLiga, e=epoch||cal.inicio||SEASON_START_2026;
    const slotsLiga=cal.competicoes.liga.slots||[];
    const iLiga=slotsLiga.indexOf(slot);
    let base;
    if(L && iLiga>=0 && L[iLiga]!=null) base=calDay(L[iLiga], e);
    else if(L && L.length){
      const iAnc=ancoraDeLiga(cal, slot);
      if(iAnc>=0) base=calDay(L[iAnc], e) + (slot-slotsLiga[iAnc])*7;
      else base=calDay(L[0], e) - (slotsLiga[0]-slot)*7;
    } else base=(slot-1)*7+1;
    if(janela==='WEEKEND') return base;
    const recuo=(janela==='MIDWEEK_1')?4:3;
    /* O RÓTULO NUNCA ANDA PARA TRÁS. As datas reais da liga não são igualmente espaçadas — entre
       24/10 e 27/10 há três dias —, então recuar 4 punha o meio de semana ANTES do jogo do slot
       anterior. A ordem não dependia disso (quem ordena é o slot), mas a tela mostrava 27/10 e
       logo a seguir 26/10, que é a espécie de coisa que faz o jogador desconfiar do calendário.
       Aqui o dia é empurrado para depois do jogo anterior quando o recuo o levaria longe demais. */
    /* o jogo de liga anterior é o da última semana de liga ANTES desta — com buracos no meio do
       calendário isso já não é `iLiga-1`, que só existe quando este slot é ele próprio de liga. */
    const iAnterior=(iLiga>0) ? iLiga-1 : ancoraDeLiga(cal, slot-1);
    const anterior=(L && iAnterior>=0 && L[iAnterior]!=null) ? calDay(L[iAnterior], e) : null;
    const alvo=base-recuo;
    return (anterior!=null && alvo<=anterior) ? anterior+1 : alvo;
  }
  /* ===================== OS SLOTS DA LIGA DE UMA DIVISAO =====================
     A folha declara os slots de liga da divisao MAIS LONGA do pais (a Championship joga 46
     rodadas, a Premier 38). Quem joga menos rodadas usava os PRIMEIROS slots e acabava a
     temporada no meio da folha -- e como as finais das copas moram nos ultimos slots, a liga
     acabava antes delas. Era esse o "a temporada acaba na rodada 38": o campeonato fechava e o
     que sobrava eram semanas soltas de copa.
     Agora os slots sao ESPALHADOS: a divisao mais curta comeca no primeiro slot de liga e acaba
     no ULTIMO, com as folgas distribuidas pelo meio. A ultima rodada da liga volta a ser o
     ultimo dia da temporada em qualquer divisao de qualquer pais, que e a regra que a folha
     escreve e esta funcao faz valer.
     Passo maior que 1 (a lista e maior que n), entao os indices sao estritamente crescentes e
     nenhum slot se repete. */
  function slotsDaLiga(ligaSlots, n){
    const base=(ligaSlots||[]).slice();
    if(!base.length || !n || n>=base.length) return base;
    if(n===1) return [base[base.length-1]];
    const out=[];
    for(let i=0;i<n;i++) out.push(base[Math.round(i*(base.length-1)/(n-1))]);
    return out;
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
    const ligaSlots=slotsDaLiga(cal.competicoes.liga.slots, nLiga);
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

     Cada dia carrega o `pais` a que pertence. REGRA (dono do jogo, 18/08): cada treinador assiste
     e joga apenas as competições do país do CLUBE DELE. Quem se mudou para o Chelsea passa a
     viver o calendário inglês e deixa de acompanhar o brasileiro — senão seriam times e
     competições a mais para assistir, e a sessão viraria uma maratona.

     O ponteiro, esse, anda pela fila INTEIRA: é isso que mantém a sala junta. Um dia que não é do
     meu país eu não jogo, mas ele existe e passa — como um dia de folga no meu calendário. */
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

  /* os dias que ESTE treinador vive, dado o país do clube dele. O resto da fila passa por ele
     sem lhe pedir nada. */
  function diasDoPais(plano, pais){
    if(!Array.isArray(plano)) return [];
    const alvo=pais||'brasil';
    return plano.filter(d=>(d.pais||'brasil')===alvo);
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

  const API={ calendar, seasonStart, calDay, jornadaOfCalDate, leagueMatchDay, cupMatchDayByRound, slotsDaLiga,
    diaDoSlot, diaParaMMDD, janelaDaCompeticao, cupMatchDayAt,
    buildDayPlan, buildDayPlanMulti, diasDoPais, DAY_MOMENTS, prorrogarPorCopasPendentes,
    cupDrawDay, buildCupSchedule, cupTickMatchesRound, cupRoundIndexAt,
    cupAlreadyResolved, markCupResolved, CUP_FIRST_ROUND,
    cpuMarket, cpuCaixaRodada, cpuCrescerEstadio };
  root.WORLD_RULES=API;
  if(typeof module!=='undefined' && module.exports){ module.exports=API; }
})(typeof globalThis!=='undefined'?globalThis:this);
/* <<< WORLD_RULES:FIM >>> */

/* AS OUTRAS DUAS FOLHAS COMPARTILHADAS. `UNIVERSOS` descreve os 15 países (divisões, tamanho,
   acesso, rebaixamento) e `WORLD_CONFIG` deriva delas as tabelas por NÍVEL da pirâmide. Antes
   deste bloco o servidor tinha a pirâmide brasileira congelada em quatro constantes, com o
   comentário "Resenha = sempre Brasil"; agora lê o mesmo dado que o cliente. Injetadas, nunca
   editadas aqui — ver scripts/sync-world-rules.mjs. */
/* <<< UNIVERSOS:INICIO — gerado por scripts/sync-world-rules.mjs, NÃO editar aqui >>> */
/* ===================================================================
   UNIVERSOS — que países são jogáveis e quais divisões cada um tem.
   -------------------------------------------------------------------
   Isto era um `const` no meio do core.js. Saiu para cá porque o PAINEL também
   precisa da lista (para o editor perguntar em que país e em que divisão um
   clube novo entra), e o painel não carrega o core.js. Copiar a lista para lá
   criaria duas versões da mesma regra — exatamente o que world-rules.js
   descreve como a causa dos bugs de calendário.

   Consumido por engine/core.js (window.UNIVERSOS), por admin/admin.js e — desde que o
   resolve-round deixou de ter a pirâmide brasileira congelada — pelo SERVIDOR, por injeção
   (scripts/sync-world-rules.mjs). É por isso que o arquivo passou a atribuir em `globalThis` e
   não em `window`: no Deno da edge function `window` não existe, e no navegador
   `globalThis === window`, então nada muda para quem já lia.

   Regra de ouro: dado, não algoritmo. Nada de S, CL ou DOM aqui.
   =================================================================== */
(function(root){
'use strict';
root.UNIVERSOS = {
  brasil:    { order:['A','B','C','D'], size:{A:20,B:20,C:20,D:20}, promo:{A:0,B:4,C:4,D:4}, releg:{A:4,B:4,C:4,D:0},
               label:{A:'Série A',B:'Série B',C:'Série C',D:'Série D'}, nat:['Brasil','Brazil'], foreignMax:8 },
  Inglaterra:{ order:['PL','CH'], size:{PL:20,CH:24}, promo:{PL:0,CH:3}, releg:{PL:3,CH:0},
               label:{PL:'Premier League',CH:'Championship'}, lg:{PL:'ENG-1',CH:'ENG-2'}, country:'Inglaterra',
               nat:['England','Wales','Scotland','Northern Ireland'], foreignMax:22 },
  Espanha:   { order:['ES','ES2'], size:{ES:20,ES2:18}, promo:{ES:0,ES2:3}, releg:{ES:3,ES2:0},
               label:{ES:'La Liga',ES2:'La Liga 2'}, lg:{ES:'ESP-1',ES2:'ESP-2'}, country:'Espanha',
               nat:['Spain'], foreignMax:15 },
  'Itália':  { order:['IT','IT2'], size:{IT:20,IT2:18}, promo:{IT:0,IT2:3}, releg:{IT:3,IT2:0},
               label:{IT:'Serie A',IT2:'Serie B'}, lg:{IT:'ITA-1',IT2:'ITA-2'}, country:'Itália',
               nat:['Italy'], foreignMax:16 },
  Alemanha:  { order:['DE','DE2'], size:{DE:18,DE2:18}, promo:{DE:0,DE2:3}, releg:{DE:3,DE2:0},
               label:{DE:'Bundesliga',DE2:'2. Bundesliga'}, lg:{DE:'GER-1',DE2:'GER-2'}, country:'Alemanha',
               nat:['Germany'], foreignMax:17 },
  Portugal:  { order:['PT','PT2'], size:{PT:18,PT2:18}, promo:{PT:0,PT2:3}, releg:{PT:3,PT2:0},
               label:{PT:'Primeira Liga',PT2:'Liga Portugal 2'}, lg:{PT:'POR-1',PT2:'POR-2'}, country:'Portugal',
               nat:['Portugal'], foreignMax:18 },
  /* CONMEBOL: divisão ÚNICA (só 1ª divisão real, sem pirâmide -> sem acesso/rebaixamento);
     clubes reais em window.CONMEBOL_LEAGUES (src:'conmebol'). Classificam pra Libertadores/
     Sul-Americana. size = nº real de clubes raspados (Argentina cortada em 20 p/ temporada padrão). */
  Argentina: { order:['ARG'], size:{ARG:30}, promo:{ARG:0}, releg:{ARG:0}, label:{ARG:'Liga Profesional'}, lg:{ARG:'ARG-1'}, country:'Argentina', nat:['Argentina'], foreignMax:6, src:'conmebol' },
  Uruguai:   { order:['URU'], size:{URU:16}, promo:{URU:0}, releg:{URU:0}, label:{URU:'Primera División'}, lg:{URU:'URU-1'}, country:'Uruguai', nat:['Uruguay'], foreignMax:6, src:'conmebol' },
  'Colômbia':{ order:['COL'], size:{COL:20}, promo:{COL:0}, releg:{COL:0}, label:{COL:'Categoría Primera A'}, lg:{COL:'COL-1'}, country:'Colômbia', nat:['Colombia'], foreignMax:5, src:'conmebol' },
  Chile:     { order:['CHI'], size:{CHI:16}, promo:{CHI:0}, releg:{CHI:0}, label:{CHI:'Primera División'}, lg:{CHI:'CHI-1'}, country:'Chile', nat:['Chile'], foreignMax:6, src:'conmebol' },
  Peru:      { order:['PER'], size:{PER:18}, promo:{PER:0}, releg:{PER:0}, label:{PER:'Liga 1'}, lg:{PER:'PER-1'}, country:'Peru', nat:['Peru'], foreignMax:5, src:'conmebol' },
  Equador:   { order:['ECU'], size:{ECU:16}, promo:{ECU:0}, releg:{ECU:0}, label:{ECU:'LigaPro Serie A'}, lg:{ECU:'ECU-1'}, country:'Equador', nat:['Ecuador'], foreignMax:5, src:'conmebol' },
  Paraguai:  { order:['PAR'], size:{PAR:12},  promo:{PAR:0}, releg:{PAR:0}, label:{PAR:'División Profesional'}, lg:{PAR:'PAR-1'}, country:'Paraguai', nat:['Paraguay'], foreignMax:6, src:'conmebol' },
  Venezuela: { order:['VEN'], size:{VEN:14}, promo:{VEN:0}, releg:{VEN:0}, label:{VEN:'Liga FUTVE'}, lg:{VEN:'VEN-1'}, country:'Venezuela', nat:['Venezuela'], foreignMax:6, src:'conmebol' },
  'Bolívia': { order:['BOL'], size:{BOL:16}, promo:{BOL:0}, releg:{BOL:0}, label:{BOL:'División Profesional'}, lg:{BOL:'BOL-1'}, country:'Bolívia', nat:['Bolivia'], foreignMax:6, src:'conmebol' },
};

/* código ISO da bandeira de cada universo (UNIVERSOS só guarda o nome do país) */
root.UNIVERSO_BANDEIRA = {brasil:'br',Inglaterra:'gb-eng',Espanha:'es','Itália':'it',Alemanha:'de',Portugal:'pt',
  Argentina:'ar',Uruguai:'uy','Colômbia':'co',Chile:'cl',Peru:'pe',Equador:'ec',Paraguai:'py',Venezuela:'ve','Bolívia':'bo'};

if(typeof module!=='undefined' && module.exports){ module.exports={ UNIVERSOS:root.UNIVERSOS, UNIVERSO_BANDEIRA:root.UNIVERSO_BANDEIRA }; }
})(typeof globalThis!=='undefined'?globalThis:this);
/* <<< UNIVERSOS:FIM >>> */
/* <<< WORLD_CONFIG:INICIO — gerado por scripts/sync-world-rules.mjs, NÃO editar aqui >>> */
/* ===================================================================
   CONFIGURAÇÃO DE MUNDO — a segunda folha ÚNICA compartilhada cliente ⇄ servidor.

   POR QUE ISTO EXISTE. O `world-rules.js` acabou com as duas versões das regras de CALENDÁRIO.
   Faltava o mesmo para as regras de PAÍS. Hoje elas estão escritas em três lugares:

     · `data/universos.js` descreve os 15 países (divisões, tamanho, acesso, rebaixamento) e o
       cliente já os usa por `setUniverse()`;
     · `resolve-round` tem DIV_ORDER / DIVISION_SIZE / DIVISION_PROMO / DIVISION_RELEG congelados
       no Brasil, com o comentário "Config brasileira (Resenha = sempre Brasil)";
     · `data/rebalance.js` e o `resolve-round` têm, CADA UM, um `BAND_BY_DIV` escrito à mão que
       traduz PL/CH/ES/ES2/... para as faixas A/B — e que só cobre seis países.

   Três cópias da mesma regra é exatamente o padrão que o cabeçalho do `world-rules.js` descreve
   como a causa dos bugs de calendário. Esta folha é o lugar único.

   A IDEIA CENTRAL: INDEXAR POR NÍVEL, NÃO PELA LETRA DA DIVISÃO.
   `A/B/C/D` são nomes brasileiros. O que a regra realmente quer saber é a PROFUNDIDADE na
   pirâmide — 1ª divisão, 2ª, 3ª. `UNIVERSOS[pais].order` já é essa lista, em ordem. Então:

       nivel = order.indexOf(divisao)        brasil: A=0 B=1 C=2 D=3   ·   Inglaterra: PL=0 CH=1

   Com isso o mapa escrito à mão desaparece e QUALQUER país novo — inclusive um criado no painel
   admin — funciona sem tocar em código. Para o Brasil o resultado é idêntico ao de hoje, e é
   isso que `scripts/teste-universos.mjs` prova.

   REGRA DE OURO (a mesma do world-rules.js): nada de S, CL, DATA, DOM ou qualquer global do
   jogo. `UNIVERSOS` é lido PREGUIÇOSAMENTE, dentro das funções — o painel admin carrega os
   arquivos em paralelo, e ler no topo criaria dependência de ordem de carga.

   PROPAGAÇÃO É AUTOMÁTICA: scripts/sync-world-rules.mjs injeta esta folha dentro do
   resolve-round entre marcadores, no build e no CI. Não há porte manual.
   =================================================================== */
(function(root){
  'use strict';

  const PADRAO='brasil';
  function universos(){ return root.UNIVERSOS || {}; }
  function uniCfg(key){ const U=universos(); return U[key] || U[PADRAO] || null; }
  /* ===== O UNIVERSO DA PIRÂMIDE ÂNCORA — não "o país da sala" =====
     `S.intlUniverse` diz de que país é a pirâmide que mora em S.table/S.otherDivs: a que o
     servidor resolve a cada rodada. NÃO descreve os jogadores. Num mundo com humanos em países
     diferentes não existe "o país da sala" — o país de cada um sai do clube do assento dele.
     Ausente = Brasil, que é o que toda sala criada até agosto/2026 é. */
  function uniDoEstado(S){ return (S && S.intlUniverse) || PADRAO; }
  /* Os países que existem por inteiro neste mundo. Plural de propósito: um humano ir treinar no
     Chelsea acrescenta a Inglaterra e NÃO tira o Brasil — os outros treinadores continuam lá.
     Saves antigos não têm a lista; nesse caso o mundo tem um país só, o da âncora. */
  function paisesVivos(S){
    const lista=(S && Array.isArray(S.paisesVivos) && S.paisesVivos.length) ? S.paisesVivos.slice() : [uniDoEstado(S)];
    const set=new Set(lista); set.add(uniDoEstado(S));      // a âncora está sempre viva
    return [...set];
  }

  /* ---------- NÍVEL NA PIRÂMIDE ---------- */
  function nivelDaDivisao(uniKey, div){
    const c=uniCfg(uniKey); if(!c || !c.order) return 0;
    const i=c.order.indexOf(div);
    return i<0 ? 0 : i;                       // divisão desconhecida conta como 1ª (nunca negativa)
  }
  function divisoesDe(uniKey){ const c=uniCfg(uniKey); return (c && c.order) ? c.order.slice() : ['A','B','C','D']; }
  function tamanhoDaDivisao(uniKey, div){ const c=uniCfg(uniKey); return (c && c.size && c.size[div]) || 20; }
  function sobemDaDivisao(uniKey, div){ const c=uniCfg(uniKey); return (c && c.promo && c.promo[div]) || 0; }
  function descemDaDivisao(uniKey, div){ const c=uniCfg(uniKey); return (c && c.releg && c.releg[div]) || 0; }

  /* ---------- TABELAS POR NÍVEL ----------
     Os valores são EXATAMENTE os que estavam escritos por letra: para o Brasil, nível 0 = 'A',
     1 = 'B', 2 = 'C', 3 = 'D'. Uma pirâmide mais funda que a tabela usa o último nível. */
  const BANDA_POR_NIVEL=['A','B','C','D'];
  const FORCA_POR_NIVEL=[[58,88],[58,80],[52,74],[48,68]];
  const CAP_POR_NIVEL=[99,37,24,12];
  function _porNivel(tab, n){ return tab[Math.max(0, Math.min(n, tab.length-1))]; }

  function bandaDaDivisao(uniKey, div){ return _porNivel(BANDA_POR_NIVEL, nivelDaDivisao(uniKey, div)); }
  function forcaDaDivisao(uniKey, div){ return _porNivel(FORCA_POR_NIVEL, nivelDaDivisao(uniKey, div)).slice(); }
  function capDaDivisao(uniKey, div){ return _porNivel(CAP_POR_NIVEL, nivelDaDivisao(uniKey, div)); }

  /* Tabelas prontas, com as LETRAS daquele país como chave. É o formato que o cliente e o
     servidor já consomem (`DIVISION_FORCE_RANGE[division]`), então ligar a folha não exige
     reescrever quem lê — só trocar de onde a tabela vem. */
  function tabelasDoUniverso(uniKey){
    const ordem=divisoesDe(uniKey);
    const size={}, promo={}, releg={}, forca={}, cap={}, banda={};
    ordem.forEach(d=>{
      size[d]=tamanhoDaDivisao(uniKey,d); promo[d]=sobemDaDivisao(uniKey,d); releg[d]=descemDaDivisao(uniKey,d);
      forca[d]=forcaDaDivisao(uniKey,d);  cap[d]=capDaDivisao(uniKey,d);     banda[d]=bandaDaDivisao(uniKey,d);
    });
    return { ordem, size, promo, releg, forca, cap, banda };
  }
  /* A banda de uma divisão SEM saber o país — é o que `rebalance.force(rawF, division)` tem em
     mãos. Procura a letra em todos os universos; se dois países usarem a mesma letra, o nível é o
     mesmo nos dois (é o que 'A'/'B' significam), então a ambiguidade não muda o resultado. */
  function bandaDaDivisaoSemPais(div){
    const U=universos();
    for(const k in U){ const o=U[k] && U[k].order; if(o && o.indexOf(div)>=0) return _porNivel(BANDA_POR_NIVEL, o.indexOf(div)); }
    return BANDA_POR_NIVEL[0];
  }

  /* ---------- CONFEDERAÇÃO E COPAS DE CADA PAÍS ----------
     Quais copas um país disputa era decidido por três funções do cliente (isConmebolUniverse,
     isIntlUniverse, allCupKeys em core.js) e o servidor não sabia nada disso: `rebuildContinental
     Cups` assumia Libertadores/Sul-Americana e que `topStandings` era a Série A brasileira.

     Aqui vira dado. `conf` sai do universo: `src:'conmebol'` e o Brasil são CONMEBOL, o resto é
     UEFA — a mesma regra que o cliente aplicava, agora escrita uma vez. `copaNacional` é a copa
     de país (só o Brasil tem uma modelada hoje).

     As VAGAS são as tabelas que o cliente já tinha (LIB_SLOTS_UNI/SUL_SLOTS_UNI, core.js), aqui
     chaveadas pelo NOME do país (`cfg.country`), como lá. O servidor usava 6 e 6 fixos. */
  const CONFEDERACOES={
    CONMEBOL:{ copas:['libertadores','sulamericana'],
      vagas:{ 'Brasil':[6,6],'Argentina':[6,5],'Colômbia':[4,4],'Chile':[3,3],'Uruguai':[3,3],
              'Peru':[3,3],'Equador':[2,2],'Paraguai':[2,2],'Venezuela':[2,2],'Bolívia':[1,2] } },
    UEFA:{ copas:['championsLeague','europaLeague'],
      vagas:{ 'Inglaterra':[4,2],'Espanha':[4,2],'Itália':[4,2],'Alemanha':[4,2],'Portugal':[2,2] } },
  };
  const COPA_NACIONAL={ brasil:'copaBrasil' };

  function nomeDoPais(uniKey){ const c=uniCfg(uniKey); return (c && c.country) || (uniKey===PADRAO ? 'Brasil' : uniKey); }
  function confederacaoDe(uniKey){
    const c=uniCfg(uniKey);
    if(uniKey===PADRAO || (c && c.src==='conmebol')) return 'CONMEBOL';
    return 'UEFA';
  }
  function copasContinentaisDe(uniKey){ return (CONFEDERACOES[confederacaoDe(uniKey)]||{}).copas.slice(); }
  /* TODAS as copas do país, na ordem que o cliente já usava em allCupKeys(): a nacional primeiro
     (quando existe), depois as duas continentais. */
  function copasDe(uniKey){
    const nac=COPA_NACIONAL[uniKey];
    return (nac ? [nac] : []).concat(copasContinentaisDe(uniKey));
  }
  /* [vagas na 1ª continental, vagas na 2ª]. País sem entrada na tabela cai em [4,2], que é o
     padrão europeu — nunca zero, senão o país simplesmente não teria representantes. */
  function vagasContinentais(uniKey){
    const conf=CONFEDERACOES[confederacaoDe(uniKey)]||{};
    const v=(conf.vagas||{})[nomeDoPais(uniKey)];
    return v ? v.slice() : [4,2];
  }

  /* ---------- NOMES DE JOGADOR POR PAÍS ----------
     O servidor gerava TODO regen com nomes brasileiros: `pickProcName` só conhecia BR_FIRST/
     BR_LAST, então a virada de temporada de um save inglês devolvia "Gabriel Silva" na Premier
     League. O cliente já tinha os pools de Espanha, Itália, Alemanha e Portugal (INTL_NAME_POOL)
     e um genérico hispânico (INTL_FIRST/INTL_LAST) para a CONMEBOL — mas só do lado dele.

     As listas do Brasil são as MESMAS que estavam nos dois arquivos (conferidas idênticas antes
     de mover), então nada muda para quem já joga. `Inglaterra` é nova: não existia em lugar
     nenhum. `_hispano` é o fallback dos países CONMEBOL, como o cliente já fazia.
     `nomesDoPais` nunca devolve vazio — sem pool, cai no hispânico para não gerar nome nulo. */
  const NAME_POOLS={
    brasil:{ first:[
      'Gabriel','Lucas','Matheus','Rafael','Bruno','Léo','Vitor','João','Pedro','Gustavo','Felipe','Diego',
      'Rodrigo','Thiago','Wesley','Éverton','Caio','Igor','Vinícius','Douglas','Renato','Marcos','André',
      'Fábio','Danilo','Kaio','Yuri','Alan','Juninho','Guilherme','Paulinho','Rennan','Éder','Wellington',
      'Luan','Nathan','Richard','Kevin','Wanderson','Jonathan','Ronaldo','Ricardo','Fernando','Cristian',
      'Emerson','Robson','Adriano','Cléber','Maicon','Otávio'],
      last:[
      'Silva','Santos','Oliveira','Souza','Pereira','Lima','Costa','Ferreira','Almeida','Ribeiro','Rodrigues',
      'Gomes','Martins','Barbosa','Rocha','Dias','Nascimento','Araújo','Cardoso','Teixeira','Moreira',
      'Carvalho','Cavalcante','Mendes','Freitas','Vieira','Monteiro','Nunes','Correia','Machado','Fernandes',
      'Ramos','Azevedo','Campos','Pinto','Cunha','Moraes','Farias','Batista','Andrade'] },
    Espanha:{ first:[
      'Álvaro','Sergio','Javier','Carlos','Pablo','Rubén','Iker','Marcos','Adrián','Diego','Jorge','Raúl',
      'Óscar','Iván','Mario','Hugo','Dani','Nacho'],
      last:[
      'García','Fernández','Martínez','López','Sánchez','Gómez','Ruiz','Torres','Navarro','Molina','Ortega',
      'Serrano','Castro','Vidal','Herrera','Cano','Rubio','Marín','Peña','Vega','Bravo','Nieto','Gallardo',
      'Reyes'] },
    Itália:{ first:[
      'Marco','Luca','Andrea','Matteo','Alessandro','Federico','Davide','Simone','Giacomo','Nicolò','Lorenzo',
      'Riccardo','Antonio','Gabriele','Stefano','Fabio','Emanuele','Christian'],
      last:[
      'Rossi','Bianchi','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Mancini',
      'Costa','Giordano','Rizzo','Lombardi','Moretti','Barbieri','Fontana','Caruso','Ferrara','Longo',
      'Marchetti','Villa'] },
    Alemanha:{ first:[
      'Lukas','Jonas','Leon','Finn','Tim','Niklas','Maximilian','Felix','Paul','Julian','Moritz','Jan','Tobias',
      'Marvin','Philipp','Nico','Kevin','Sven'],
      last:[
      'Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Hoffmann','Schäfer','Koch',
      'Bauer','Richter','Klein','Wolf','Neumann','Schwarz','Zimmermann','Braun','Krüger','Hofmann','Lange',
      'Werner','Krause'] },
    Portugal:{ first:[
      'João','Miguel','Rui','Pedro','Tiago','André','Bruno','Diogo','Ricardo','Nuno','Gonçalo','Fábio','Rafael',
      'Hélder','Vítor','Luís','Daniel','Sérgio'],
      last:[
      'Silva','Santos','Ferreira','Pereira','Oliveira','Costa','Rodrigues','Martins','Sousa','Fonseca','Gomes',
      'Lopes','Marques','Almeida','Ribeiro','Pinto','Carvalho','Teixeira','Moreira','Cardoso','Nunes','Correia',
      'Machado','Tavares'] },
    Inglaterra:{ first:[
      'Jack','Harry','Oliver','Charlie','George','Jacob','Alfie','Freddie','Archie','Thomas','Callum','Reece',
      'Kieran','Declan','Mason','Ollie','Josh','Lewis'],
      last:[
      'Smith','Jones','Taylor','Brown','Wilson','Davies','Evans','Thomas','Roberts','Walker','Wright',
      'Robinson','Thompson','White','Hughes','Edwards','Green','Hall','Wood','Harris','Clarke','Baker','Turner',
      'Hill'] },
    _hispano:{ first:[
      'Martín','Diego','Franco','Nicolás','Iván','Bruno','Gonzalo','Sebastián','Rodrigo','Emiliano','Cristian',
      'Federico','Agustín','Maximiliano','Ezequiel','Leandro','Matías','Joaquín','Tomás','Julián','Rafael',
      'Andrés','Carlos','Luis','Pedro'],
      last:[
      'Gómez','Fernández','Rodríguez','Sosa','Díaz','Romero','Torres','Núñez','Silva','Acosta','Ramírez','Vega',
      'Cabrera','Godoy','Molina','Ortiz','Benítez','Aguirre','Suárez','Ibáñez','Herrera','Castro','Flores',
      'Rojas','Medina'] },
  };
  function nomesDoPais(uniKey){
    const c=uniCfg(uniKey);
    return NAME_POOLS[uniKey] || NAME_POOLS[(c&&c.country)] || NAME_POOLS._hispano;
  }

  /* ---------- IDENTIDADE DE UM JOGADOR CRIADO DO ZERO ----------
     O regen do servidor nascia sempre com `nat:'Brasil'` e `lg:'BRA-'+divisao`, mesmo num save
     inglês. `nat` é o que decide se o jogador conta na cota de estrangeiros (playerIsForeign,
     core.js), então um regen inglês contava como estrangeiro no próprio país. Os valores do
     Brasil são exatamente os que estavam escritos: nat[0] de `brasil` é 'Brasil', e o Brasil não
     tem tabela `lg`, então continua a cair em 'BRA-'+divisao. */
  function nacionalidadeDe(uniKey){ const c=uniCfg(uniKey); return (c && c.nat && c.nat[0]) || 'Brasil'; }
  function codigoDaLiga(uniKey, div){ const c=uniCfg(uniKey); return (c && c.lg && c.lg[div]) || ('BRA-'+div); }

  const API={ PADRAO, uniCfg, uniDoEstado, paisesVivos, nivelDaDivisao, divisoesDe,
    tamanhoDaDivisao, sobemDaDivisao, descemDaDivisao,
    BANDA_POR_NIVEL, FORCA_POR_NIVEL, CAP_POR_NIVEL,
    bandaDaDivisao, forcaDaDivisao, capDaDivisao, bandaDaDivisaoSemPais, tabelasDoUniverso,
    CONFEDERACOES, COPA_NACIONAL, nomeDoPais, confederacaoDe, copasContinentaisDe, copasDe,
    vagasContinentais, NAME_POOLS, nomesDoPais, nacionalidadeDe, codigoDaLiga };
  root.WORLD_CONFIG=API;
  if(typeof module!=='undefined' && module.exports){ module.exports=API; }
})(typeof globalThis!=='undefined'?globalThis:this);
/* <<< WORLD_CONFIG:FIM >>> */
const WR = (globalThis as any).WORLD_RULES;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } }); }
function clampN(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

/* ---- porte fiel das funções de rodada do core.js (operando no S do estado) ---- */
function applyResultT(T: any, h: string, a: string, hg: number, ag: number) {
  T[h].P++; T[a].P++; T[h].GF += hg; T[h].GA += ag; T[a].GF += ag; T[a].GA += hg;
  if (hg > ag) { T[h].W++; T[a].L++; T[h].Pts += 3; }
  else if (hg < ag) { T[a].W++; T[h].L++; T[a].Pts += 3; }
  else { T[h].D++; T[a].D++; T[h].Pts++; T[a].Pts++; }
}
/* gol na artilharia geral e, quando `comp` vem, também no livro por competição — o gêmeo do
   recordScorers do cliente (core.js). `comp` é a chave da copa (copaBrasil, libertadores...)
   ou a divisão ('A'..'D') no jogo de liga. É o que alimenta o artilheiro POR COMPETIÇÃO da
   virada (S._prevSeason.scorersByComp) — sem isto ele nunca existia na Resenha. */
function recordScorers(S: any, scorers: any[], comp?: string) {
  (scorers || []).forEach((s: any) => { S.scorers[s.name] = (S.scorers[s.name] || 0) + 1; });
  if (!comp) return;
  S.scorersByComp = S.scorersByComp || {};
  const m = S.scorersByComp[comp] = S.scorersByComp[comp] || {};
  (scorers || []).forEach((s: any) => { m[s.name] = (m[s.name] || 0) + 1; });
}
function findPlayerByName(S: any, clubId: string, name: string) { const sq = S.squads[clubId]; return sq && sq.find((p: any) => p.n === name); }
function advancePlayerAvailability(S: any) {
  Object.values(S.squads).forEach((sq: any) => sq.forEach((p: any) => { if (p.suspended > 0) p.suspended--; if (p.injuredMatches > 0) p.injuredMatches--; }));
}
function applyMatchIncidents(S: any, events: any[]) {
  S._roundIncidents = S._roundIncidents || {};
  (events || []).forEach((e: any) => {
    if (e.type === "cartao") {
      const p = findPlayerByName(S, e.team, e.player); if (!p) return;
      p.stats = p.stats || { r3: [], g3: [], apps: 0, goals: 0, cs: 0 };
      if (e.cardType === "vermelho") { p.suspended = 1; p.stats.reds = (p.stats.reds || 0) + 1; if (e.reason === "segundo amarelo") p.stats.yellows = (p.stats.yellows || 0) + 1; p.moral = clampN(p.moral - 8, 0, 100); S._roundIncidents[p.n] = { cardType: "vermelho" }; }
      else { p.stats.yellows = (p.stats.yellows || 0) + 1; S._roundIncidents[p.n] = { cardType: "amarelo" }; }
    } else if (e.type === "lesao") {
      const p = findPlayerByName(S, e.team, e.player); if (!p) return;
      p.stats = p.stats || { r3: [], g3: [], apps: 0, goals: 0, cs: 0 };
      p.injuredMatches = Math.max(p.injuredMatches || 0, e.outMatches || 0);
      p.stats.injuries = (p.stats.injuries || 0) + 1; p.moral = clampN(p.moral - 5, 0, 100);
      const cur = S._roundIncidents[p.n] || {}; cur.injured = true; S._roundIncidents[p.n] = cur;
    }
  });
}
/* ===== NOTAS + HISTORIAL (porte fiel de domAdjust/ratePlayers do cliente — simulate.js) =====
   Sem isto o servidor gravava GOL (S.scorers) mas nunca JOGO: p.stats.apps ficava em 0 pra
   sempre na Resenha, e o card "Historial (carreira)" mostrava "Jogos 0 / Gols 3". Como o
   cliente ADOTA o estado do servidor a cada rodada, contar do lado dele não adianta — quem
   joga a rodada é esta função, então é aqui que a súmula tem que ser escriturada. */
/* SÚMULA DE MINUTOS -> lista de jogadores. caps = [{pid,n,mins}] da partida (do motor, ou
   submetida pelo cliente numa partida humana, que é quem tem as substituições). Sem caps, cai no
   XI com o jogo inteiro — o comportamento anterior. */
function capsListS(xi: any[], caps: any[], matchMinutes: number) {
  const base = Array.isArray(xi) ? xi : [];
  if (Array.isArray(caps) && caps.length) {
    const out: any[] = [];
    caps.forEach((c: any) => {
      const p = base.find((x: any) => (c.pid != null && x.pid === c.pid) || x.n === c.n);
      if (p) out.push({ p, mins: c.mins });
    });
    if (out.length) return out;
  }
  return base.map((p: any) => ({ p, mins: matchMinutes || 90 }));
}
/* A conta da nota mora no motor compartilhado (ME.rateAppearances) — a MESMA que o cliente usa
   no solo e no fallback local. Aqui só montamos a entrada e escrevemos em p.stats. */
function ratePlayersS(S: any, id: string, xi: any[], gf: number, ga: number, scorers: any[], R: any, myPerf: any, oppPerf: any, caps?: any[], matchMinutes?: number) {
  if (!Array.isArray(xi) || !xi.length) return;
  const total = matchMinutes || 90;
  const lista = capsListS(xi, caps as any[], total);
  const notas = ME.rateAppearances({
    players: lista.map((x: any) => ({ pid: x.p.pid, n: x.p.n, s: x.p.s, f: x.p.f, mins: x.mins })),
    matchMinutes: total, gf: gf, ga: ga, clubId: id, scorers: scorers || [],
    incidents: S._roundIncidents || {}, myPerf: myPerf, oppPerf: oppPerf, R: R,
  });
  notas.forEach((nota: any, i: number) => {
    const p = lista[i].p;
    const st = p.stats || (p.stats = { r3: [], g3: [], apps: 0, goals: 0, cs: 0 });
    st.r3 = st.r3 || []; st.g3 = st.g3 || [];
    st.r3.push(nota.r); if (st.r3.length > 3) st.r3.shift();
    st.g3.push(nota.goals); if (st.g3.length > 3) st.g3.shift();
    st.apps = (st.apps || 0) + 1; st.goals = (st.goals || 0) + nota.goals;
    if (nota.cs) st.cs = (st.cs || 0) + 1;
  });
}
/* MORAL pós-jogo (porte de postMatchMorale do cliente): vitória +8, derrota -8, empate +1 pros
   que jogaram, +6 extra pra quem marcou. Só pros clubes HUMANOS — é exatamente o alcance do solo
   (lá só o clube do usuário recebe). Sem isto a moral do elenco na Resenha só fazia drift pro 70
   a cada rodada, então a barra "Moral do Time" (e os 30% dela na Segurança no cargo) não tinha
   relação nenhuma com a campanha do clube. */
function postMatchMoraleS(S: any, id: string, xi: any[], gf: number, ga: number, scorers: any[], caps?: any[], matchMinutes?: number) {
  if (!Array.isArray(xi) || !xi.length) return;
  const d = gf > ga ? 8 : gf < ga ? -8 : 1;
  // quem ENTROU EM CAMPO (não o onze do fim): o substituído no intervalo também sente o resultado.
  // Não é proporcional aos minutos de propósito — moral é humor de vestiário, não desgaste.
  capsListS(xi, caps as any[], matchMinutes || 90).forEach((x: any) => {
    x.p.moral = clampN((x.p.moral != null ? x.p.moral : 70) + d, 0, 100);
  });
  (scorers || []).filter((s: any) => s.id === id).forEach((s: any) => {
    const p = findPlayerByName(S, id, s.name); if (p) p.moral = clampN((p.moral != null ? p.moral : 70) + 6, 0, 100);
  });
}
/* capacidade do estádio pro mando de campo: prefere a persistida por-clube (S.clubStadiumCap —
   reconciliada do assento de cada humano, ver merge no SELECT de game_seats abaixo; CPU vem
   semeada do cliente em S), cai pra curva sintética por força quando ainda não existe. */
function capFor(S: any, id: string) {
  const st = (S.clubStadiumCap || {})[id];
  return (st && st.capacity) ? st.capacity : ME.capFromOverall((S.clubOverall || {})[id] || 70);
}
/* inputs de um clube pro motor (humano usa XI/tática submetida; CPU melhores 11 / equilibrado) */
function sideInputs(S: any, id: string, isHuman: boolean, humanXI: any, humanTactic: any) {
  const xiNames = isHuman ? (humanXI[id] || ME.autoXINames(S.squads[id])) : null;
  return {
    rat: ME.computeRatings(S.squads[id], xiNames),
    xi: ME.resolveXI(S.squads[id], xiNames),
    tactic: isHuman ? (humanTactic[id] || "equilibrado") : "equilibrado",
    cap: capFor(S, id),
    short: (S.clubShort || {})[id] || id,
  };
}

/* ===== EVOLUÇÃO de jogadores (porte fiel de evolvePlayer + REBAL.force/value do cliente) ===== */
const POS_PROFILE: any = {
  ATT:{fin:22,dri:15,vel:13,com:10,pos:8,pas:8,cab:7,agi:7,fis:5,res:5},
  MID:{pas:20,vis:16,pos:11,des:10,dri:9,res:8,com:7,fin:6,vel:5,fis:4,cru:4},
  DEF:{des:22,pos:16,cab:14,fis:12,vel:9,pas:8,com:7,agi:6,res:6},
  GK :{ref:34,mao:30,pos:14,agi:10,pas:6,fis:6},
};
function attrLevel(a: any, s: string) { const prof = POS_PROFILE[s] || POS_PROFILE.MID; let sw = 0, acc = 0; for (const k in prof) { sw += prof[k]; acc += prof[k] * (a[k] || 1); } return acc / sw; }
function levelToForce(L: number) { return Math.max(40, Math.min(95, Math.round((L - 6) / 13 * 46 + 45))); }
function interp(anchors: any[], x: number) { const n = anchors.length;
  if (x <= anchors[0][0]) { const [x0, y0] = anchors[0], [x1, y1] = anchors[1]; return y0 + (x - x0) / (x1 - x0) * (y1 - y0); }
  if (x >= anchors[n - 1][0]) { const [x0, y0] = anchors[n - 2], [x1, y1] = anchors[n - 1]; return y0 + (x - x0) / (x1 - x0) * (y1 - y0); }
  for (let i = 0; i < n - 1; i++) { const [x0, y0] = anchors[i], [x1, y1] = anchors[i + 1]; if (x >= x0 && x <= x1) { const t = (x1 === x0) ? 0 : (x - x0) / (x1 - x0); return y0 + t * (y1 - y0); } }
  return anchors[n - 1][1]; }
const BANDS: any = { A:[[48,28],[64,38],[79,49],[82,58],[85,70],[88,81],[90,90],[94,98]], B:[[46,18],[58,26],[74,37],[77,46],[81,60],[85,74],[90,90]], C:[[42,8],[52,14],[66,24],[70,32],[76,48],[82,66]], D:[[38,2],[44,4],[58,12],[63,23],[70,40]] };
/* A BANDA DE FORCA DE UMA DIVISAO — pelo NIVEL na piramide do pais, nao por um mapa de letras.
   Era `{A:'A',...,PL:'A',CH:'B',ES2:'B',...}`, escrito a mao e limitado a seis paises: um pais
   novo criado no painel cairia silenciosamente na banda 'A'. WORLD_CONFIG deriva a banda de
   UNIVERSOS[pais].order, entao qualquer piramide funciona — e para as letras que ja estavam no
   mapa o resultado e o mesmo (PL e 1a divisao => nivel 0 => banda 'A'). */
function bandKeyDiv(division: string) { return WORLD_CONFIG.bandaDaDivisao(UNI_ATIVO, division); }
function rbForce(rawF: number, division: string) { const rf = (typeof rawF === 'number' && isFinite(rawF)) ? rawF : 60; const b = BANDS[bandKeyDiv(division)] || BANDS.A; return Math.max(1, Math.min(99, Math.round(interp(b, rf)))); }
const V_ANCHORS = [[5,80e3],[10,200e3],[15,450e3],[20,700e3],[25,1e6],[30,1.6e6],[35,2.5e6],[40,4e6],[45,6e6],[50,9e6],[60,18e6],[70,35e6],[80,70e6],[90,150e6],[99,260e6]];
function ageFactor(age: number) { const a = age || 26; if (a <= 21) return 1.35; if (a <= 27) return 1.00; if (a <= 31) return 0.80; if (a <= 35) return 0.50; return 0.25; }
function rbValue(f: number, age: number) { return Math.max(30000, Math.round(interp(V_ANCHORS as any, f) * ageFactor(age))); }
/* ===== ECONOMIA (porte fiel de REBAL.income/wage/stadiumCap + PRIZES.leaguePrize do cliente) =====
   Usado só pelas finanças de fim de temporada dos clubes da CPU (ver cpuSeasonFinances). Estas
   quatro tabelas são calibradas UMA contra a outra no cliente (rebalance.js) — qualquer mexida
   lá precisa ser refletida aqui, senão o caixa da CPU diverge do do humano. */
const S_ANCHORS = [[5,1e3],[10,3e3],[15,6e3],[20,10e3],[25,15e3],[30,22e3],[35,31e3],[40,43e3],[45,58e3],[50,78e3],[60,130e3],[70,220e3],[80,420e3],[90,800e3],[99,1.3e6]];
const INCOME_ANCHORS = [[3,25e3],[8,60e3],[11,100e3],[15,150e3],[21,240e3],[25,480e3],[30,860e3],[34,1.09e6],[40,1.25e6],[45,1.75e6],[48,2.05e6],[52,2.60e6],[58,3.90e6],[70,7.2e6]];
const CAP_ANCHORS = [[3,10000],[8,10000],[19,25000],[31,50000],[44,75000],[55,82000],[70,88000]];
const WIN_BONUS = 0.12, DRAW_BONUS = 0.04, OPEX = 0.08;
function rbWage(f: number) { return Math.max(500, Math.round(interp(S_ANCHORS as any, (typeof f === 'number' && isFinite(f)) ? f : 40))); }
function rbIncome(ov: number) { return Math.max(20000, Math.round(interp(INCOME_ANCHORS as any, (typeof ov === 'number' && isFinite(ov)) ? ov : 30))); }
function rbStadiumCap(ov: number) { return Math.round(Math.max(10000, Math.min(90000, interp(CAP_ANCHORS as any, (typeof ov === 'number' && isFinite(ov)) ? ov : 30))) / 1000) * 1000; }
const LEAGUE_PRIZE: any = {
  A:{champ:20e6,vice:14e6,top4:10e6,upper:6e6,mid:3.5e6,lower:2e6},
  B:{champ:9e6,vice:6e6,top4:4e6,upper:2.5e6,mid:1.5e6,lower:0.9e6},
  C:{champ:4e6,vice:2.7e6,top4:1.8e6,upper:1.1e6,mid:0.7e6,lower:0.4e6},
  D:{champ:2e6,vice:1.3e6,top4:0.9e6,upper:0.55e6,mid:0.35e6,lower:0.2e6},
};
function leaguePrizeT(div: string, pos: number, n: number) {
  const t = LEAGUE_PRIZE[bandKeyDiv(div)] || LEAGUE_PRIZE.A; n = n || 20;
  if (pos === 1) return t.champ; if (pos === 2) return t.vice; if (pos <= 4) return t.top4;
  if (pos <= Math.ceil(n * 0.35)) return t.upper;
  if (pos <= Math.ceil(n * 0.70)) return t.mid;
  return t.lower;
}
/* FINANÇAS DE FIM DE TEMPORADA DOS CLUBES DA CPU — espelho de applyCpuSeasonFinances (core.js).
   O servidor é o único produtor do shared_state, então S.budgets dos clubes NÃO-humanos só pode
   crescer aqui: qualquer atualização que um cliente fizesse seria desfeita no próximo adopt.
   Os humanos ficam de fora — o caixa deles é autoritativo em game_seats.budget (ver linha ~642).
   Sem isto os rivais congelavam no caixa inicial e o humano dominava o mercado em 2-3 temporadas. */
function cpuSeasonFinances(S: any, humans: Set<string>) {
  if (!S || !S.budgets) return;
  const meta: any = {};
  const reg = (div: string, tbl: any) => {
    sortTblT(tbl || {}).forEach((r: any, i: number) => { meta[r.id] = { div, pos: i + 1, n: Object.keys(tbl || {}).length, row: r }; });
  };
  reg(S.division, S.table);
  DIV_ORDER.forEach((d) => { const od = S.otherDivs && S.otherDivs[d]; if (od && od.table) reg(d, od.table); });
  Object.keys(S.budgets).forEach((id) => {
    if (humans.has(id)) return;
    const ov = (S.clubOverall && S.clubOverall[id]) || 30;
    const base = rbIncome(ov);
    let payroll = 0;
    (S.squads[id] || []).forEach((p: any) => { payroll += (p.contract && p.contract.salary) || rbWage(p.f); });
    const m = meta[id];
    const rounds = (m && m.row && m.row.P) ? m.row.P : 38;
    const w = (m && m.row) ? m.row.W : Math.round(rounds * 0.35), d = (m && m.row) ? m.row.D : Math.round(rounds * 0.27);
    const bonus = Math.round(base * (w * WIN_BONUS + d * DRAW_BONUS));
    const prize = m ? (leaguePrizeT(m.div, m.pos, m.n) || 0) : 0;
    // SÓ O DINHEIRO DE DESEMPENHO FICA AQUI. Receita base, bilheteria, folha e custo fixo passaram
    // a entrar TODA RODADA (cpuRoundCash -> WR.cpuCaixaRodada): antes o ano inteiro era aplicado
    // de uma vez na virada, então durante a temporada o caixa dos rivais ficava congelado — e é
    // durante a temporada que a janela de transferências abre. A soma do ano continua a mesma;
    // manter as duas coisas aqui contaria a operação duas vezes.
    S.budgets[id] = Math.max(-base * 4, Math.round((S.budgets[id] || 0) + bonus + prize));
  });
}
/* porte fiel de hasEstrelinha() do cliente (core.js) — precisa do mesmo hash determinístico
   pro treino especial valorizar "estrelinhas" igual nos dois lados. */
function hasEstrelinha(p: any) { if (!p) return false; return (ME.hashSeed(p.pid != null ? p.pid : 0, p.n || '', 'estrelinha') >>> 0) % 100 < 15; }
function evolvePlayer(p: any, R: any, played: boolean, sDivision: string) {
  if (!p.attr) return; // sem atributos não há como evoluir (saves válidos já têm p.attr)
  const a = p.attr, age = p.age || 26;
  const fBefore = p.f;
  const form = (p.stats && p.stats.r3 && p.stats.r3.length) ? p.stats.r3.reduce((x: number, y: number) => x + y, 0) / p.stats.r3.length : 6.5;
  const goals3 = (p.stats && p.stats.g3) ? p.stats.g3.reduce((x: number, y: number) => x + y, 0) : 0;
  const growth = age <= 20 ? 1.0 : age <= 23 ? 0.7 : age <= 27 ? 0.35 : age <= 30 ? 0.10 : 0;
  const decline = age >= 33 ? 0.55 : age >= 31 ? 0.32 : age >= 29 ? 0.12 : 0;
  const prof = POS_PROFILE[p.s] || POS_PROFILE.MID, keys = Object.keys(prof); let changed = false;
  const bsBefore = (p.contract ? p.contract.benchStreak : p.benchStreak) || 0;
  const benchStreak = played ? 0 : bsBefore + 1;
  if (p.contract) p.contract.benchStreak = benchStreak; else p.benchStreak = benchStreak;
  if (played && form >= 6.8 && growth > 0) {
    const careerBonus = 1 + Math.min(0.5, ((p.career && p.career.titles) || 0) * 0.08 + ((p.career && p.career.seasonsTopDiv) || 0) * 0.02);
    const golBonus = Math.min(0.08, goals3 * 0.03);
    const chance = growth * ((form - 6.8) / 2.2 + golBonus) * careerBonus;
    for (let i = 0; i < 2; i++) { const k = keys[R.int(keys.length)]; if (a[k] < 20 && R.random() < chance) { a[k]++; changed = true; } }
  }
  // TREINO ESPECIAL — porte fiel do cliente (index.html evolvePlayer): faltava aqui, então
  // jogadores em treino especial no host nunca ganhavam o bônus na Resenha.
  if (p._training) {
    const star = hasEstrelinha(p);
    const trainChance = 0.05 * (star ? 1.8 : 1);
    const k = keys[R.int(keys.length)]; if (a[k] < 20 && R.random() < trainChance) { a[k]++; changed = true; }
  }
  // JOVEM (<=20) descansando cresce devagar mesmo sem jogar — porte fiel do cliente, faltava aqui.
  if (!played && age <= 20 && growth > 0) {
    const chance = growth * 0.12;
    const k = keys[R.int(keys.length)]; if (a[k] < 20 && R.random() < chance) { a[k]++; changed = true; }
  }
  if (decline > 0) {
    // boa performance recente atenua (não zera) a queda de veteranos — mesmo formMult do cliente.
    const formMult = Math.max(0.62, 1 - Math.max(0, form - 6.5) * 0.15);
    for (const k of ['vel', 'agi', 'res']) { if (a[k] > 1 && R.random() < decline * 0.22 * formMult) { a[k]--; changed = true; } }
  }
  // 4+ rodadas fora do XI: só decai atributo FÍSICO (vel/agi/res), igual ao cliente — antes
  // sorteava de TODO o perfil da posição (técnico+mental+físico), divergindo do cliente.
  if (benchStreak >= 4 && !(age <= 20) && !p._training) {
    const chance = Math.min(0.25, (benchStreak - 3) * 0.05);
    const physKeys = ['vel', 'agi', 'res'].filter((k) => a[k] != null);
    if (physKeys.length) { const k = physKeys[R.int(physKeys.length)]; if (a[k] > 1 && R.random() < chance) { a[k]--; changed = true; } }
  }
  if (changed) { p.rawF = levelToForce(attrLevel(a, p.s)); p.f = rbForce(p.rawF, p._div || sDivision || 'A'); p.mv = Math.round(rbValue(p.f, p.age) * (p.mvBoost || 1)); }
  p._trend = !changed ? null : p.f > fBefore ? 'up' : p.f < fBefore ? 'down' : null;
}
/* TREINO ESPECIAL na Resenha: o flag p._training vive no objeto do jogador, dentro de S.squads —
   que é exatamente o que o cliente perde a cada adopt (o estado autoritativo vem do servidor). O
   cliente publica a LISTA de pids em treino no assento dele toda rodada (netPublishResult) e aqui
   ela é reaplicada ao elenco antes de evoluir. Sobrescreve (não acumula): tirar do treino no
   cliente tem que apagar o flag aqui também, senão o jogador treinaria pra sempre.
   Só mexe nos clubes que publicaram lista — clube de CPU nunca tem treino especial. */
function applyTrainingFlags(S: any, trainingByClub: any) {
  Object.keys(trainingByClub || {}).forEach((cid: string) => {
    const sq = S.squads && S.squads[cid]; if (!Array.isArray(sq)) return;
    const emTreino = new Set((trainingByClub[cid] || []).map(String));
    sq.forEach((p: any) => { if (emTreino.has(String(p.pid))) p._training = true; else delete p._training; });
  });
}
/* evolução da rodada — humano usa a escalação submetida; CPU os 11 mais fortes (mesma regra do cliente) */
function advanceDevelopment(S: any, humanClubs: Set<string>, humanXI: any, capsByClub?: any) {
  const Rd = ME.makeRng(ME.hashSeed(S.seed, S.round, 'dev'));
  for (const cid in S.squads) {
    const sq = S.squads[cid];
    let playedNames: Set<string>;
    // "jogou" = ENTROU EM CAMPO, pela súmula quando existe. Sem isto o titular substituído
    // levava benchStreak++ (perda de ritmo por ficar no banco) numa rodada em que jogou 45
    // minutos, e quem entrou do banco não abria o caminho de evolução por jogar.
    const caps = capsByClub && capsByClub[cid];
    if (caps && caps.length) { playedNames = new Set(caps.map((c: any) => c.n)); }
    else if (humanClubs.has(cid)) { playedNames = new Set(ME.resolveXI(sq, humanXI[cid] || ME.autoXINames(sq)).map((p: any) => p.n)); }
    else { playedNames = new Set(sq.slice().sort((a: any, b: any) => b.f - a.f).slice(0, 11).map((p: any) => p.n)); }
    sq.forEach((p: any) => evolvePlayer(p, Rd, playedNames.has(p.n), S.division));
  }
}
/* hash do cliente (main.js hashC) — usado no seed das OUTRAS divisões */
function hashC(s: any) { s = String(s); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
/* avança as OUTRAS divisões (Séries A/B/C) — CPU determinístico, mesmo seed/lógica do cliente
   (startLiveRound + applyOtherDivResults). F3.1: aplica override de resultado HUMANO na partida
   dele, caso um treinador humano esteja numa dessas divisões (após promoção/rebaixamento) —
   mesma regra mandante-autoritativa da divisão principal. Partida do humano = resultado submetido;
   as outras = motor. Os incidentes (cartão/lesão) do humano já foram aplicados globalmente no
   resolveLeagueRound (a partir de humanResultByFx), então aqui só o placar/tabela. */
/* `M` e o MUNDO do pais (ver resolverPiramideDoPais). As divisoes de baixo sao do pais; a rodada,
   a temporada, a semente e os elencos sao do jogo inteiro. Sem M, o mundo e a propria ancora --
   e o comportamento de sempre. Enquanto isto rodava uma vez so, a Championship ficava parada
   enquanto a Premier jogava, e ninguem reparava ate a virada de temporada. */
function advanceOtherDivs(S: any, humanResultByFx: any, humanClubs: Set<string>, humanXI: any, humanTactic: any, preMatches?: any, M?: any) {
  const mundo = M || S;
  if (!mundo.otherDivs) return; const round = S.round, season = S.season;
  humanResultByFx = humanResultByFx || {};
  for (const d in mundo.otherDivs) {
    const od = mundo.otherDivs[d]; if (!od.sched || !od.sched.length) continue;
    const oFx = od.sched[round % od.sched.length] || []; const base = hashC("rnd" + season + "-" + round + "-" + d);
    oFx.forEach((fx: any) => {
      const h = fx[0], a = fx[1]; if (h == null || a == null || !od.table[h] || !od.table[a]) return;
      let hg: number, ag: number; let scorers: any[] = []; let perf: any = null;
      const sub = humanResultByFx[h + "-" + a];
      const pc = (!sub && preMatches) ? preMatches[h + "-" + a] : null; // FASE 2: stream do apito (mesma precedência da divisão principal)
      let caps: any = null, matchMinutes = 90;                       // súmula de minutos (ver ratePlayersS)
      if (sub) { hg = sub.hg; ag = sub.ag; scorers = sub.scorers || []; perf = sub.perf || null; caps = sub.caps || null; matchMinutes = sub.matchMinutes || 90; } // humano nesta divisão -> resultado submetido
      else if (pc) { hg = pc.hg; ag = pc.ag; scorers = pc.scorers || []; perf = pc.perf || null; caps = pc.caps || null; matchMinutes = pc.matchMinutes || 90; }
      else {
        const seed = (base + hashC(h) + hashC(a)) >>> 0;
        const r = ME.simMatchPure(h, a, sideInputs(S, h, humanClubs.has(h), humanXI, humanTactic), sideInputs(S, a, humanClubs.has(a), humanXI, humanTactic), seed, {});
        hg = r.hg; ag = r.ag; scorers = r.scorers || []; perf = r.perf || null; caps = r.caps || null; matchMinutes = r.matchMinutes || 90;
      }
      // súmula/moral desta partida — as 4 divisões são materializadas em S.squads no servidor,
      // então JOGO/nota valem aqui igual à divisão âncora (é o que faz o Historial continuar
      // contando quando um treinador humano é rebaixado ou promovido de divisão)
      if (S.squads[h] || S.squads[a]) {
        const rr = ME.makeRng(ME.hashSeed(S.seed, round, d, h, a, "rate"));
        const capsH = (caps && caps.H) || null, capsA = (caps && caps.A) || null;
        const xiH = S.squads[h] ? (capsH ? S.squads[h] : ME.resolveXI(S.squads[h], humanClubs.has(h) ? (humanXI[h] || ME.autoXINames(S.squads[h])) : null)) : null;
        const xiA = S.squads[a] ? (capsA ? S.squads[a] : ME.resolveXI(S.squads[a], humanClubs.has(a) ? (humanXI[a] || ME.autoXINames(S.squads[a])) : null)) : null;
        ratePlayersS(S, h, xiH, hg, ag, scorers, rr, perf && perf.H, perf && perf.A, capsH, matchMinutes);
        ratePlayersS(S, a, xiA, ag, hg, scorers, rr, perf && perf.A, perf && perf.H, capsA, matchMinutes);
        if (humanClubs.has(h)) postMatchMoraleS(S, h, xiH, hg, ag, scorers, capsH, matchMinutes);
        if (humanClubs.has(a)) postMatchMoraleS(S, a, xiA, ag, hg, scorers, capsA, matchMinutes);
      }
      const th = od.table[h], ta = od.table[a];
      th.P++; ta.P++; th.GF += hg; th.GA += ag; ta.GF += ag; ta.GA += hg;
      if (hg > ag) { th.W++; th.Pts += 3; ta.L++; } else if (hg < ag) { ta.W++; ta.Pts += 3; th.L++; } else { th.D++; ta.D++; th.Pts++; ta.Pts++; }
    });
  }
}
/* ===== COPAS — Copa do Brasil (mata-mata puro; espelho de advanceCupBracket + resolveDrawnKnockoutTie).
   Grupo (Libertadores/Sul-Americana) é só Série A -> fase futura. cupResultByFx = resultados de copa
   submetidos pelos humanos (mandante-autoritativo), aplicados na chave antes de simular o resto. ===== */
const CUP_TICK_OFFSET: any = { copaBrasil: 0, libertadores: 1, sulamericana: 2, championsLeague: 1, europaLeague: 2 };
/* CALENDÁRIO DE COPA — em que jornada de liga cada rodada de cada copa acontece.
   A tabela é um DADO DO MUNDO (S.cupCalendar, viaja no shared_state), não uma regra recalculada
   dos dois lados a cada consulta: no caminho normal o cliente a constrói uma vez por temporada
   (ensureCupCalendar/core.js) e aqui só se LÊ. O construtor abaixo existe pelo único caminho em
   que o servidor cria as copas sozinho — a virada de temporada (resolveSeasonTurnover) —, e é
   porte fiel do core.js; se mexer em um, mexer no outro.
   Sem a tabela (save de antes desta versão), cai no `% 3` de sempre. */
/* delega pra folha única (WORLD_RULES) — mesma função que o cliente chama */
function cupTickMatchesRound(S: any, key: string, round: number) {
  return WR.cupTickMatchesRound(S && S.cupCalendar, key, round);
}
const CUP_KO_SPREAD = 4, CUP_LEAGUE_TAIL = 2;
function cupTotalRoundsS(S: any, key: string) {
  const c = S.cups && S.cups[key]; if (!c) return 0;
  if (key === COPA_NACIONAL_KEY()) return c.roundsTotal || 0;   // copa nacional: e o proprio bracket
  if (c.group) {
    const nG = Object.keys(c.group.groups || {}).length, adv = c.group.advancePerGroup || 2;
    const ko = Math.max(1, Math.ceil(Math.log2(Math.max(2, nG * adv))));
    return (c.group.roundsTotal || 0) + 1 + ko;   // +1 = tique de transição (grupo acaba, sorteio das oitavas) — ver core.js
  }
  return (c.bracket && c.bracket.roundsTotal) || 0;
}
/* CALENDÁRIO OFICIAL — porte fiel de CAL_2026/buildCupSchedule do core.js. As jornadas de cada
   copa saem das DATAS, não de aritmética de faixa. Se mexer em um, mexer no outro. */
function buildCupScheduleS(key: string, total: number, _lastLeagueRound: number) {
  return WR.buildCupSchedule(key, total, SEASON_EPOCH_2026, UNI_ATIVO);   // folha unica (slots do pais)
}
function nextRoundStage(S: any) {
  const nac = COPA_NACIONAL_KEY();
  const keys = (nac ? [nac] : []).concat(GRUPO_KEYS());
  const temCopa = keys.some((k) => S.cups && S.cups[k] && cupTickMatchesRound(S, k, S.round));
  return temCopa ? 'cup' : 'league';
}
function buildCupCalendarS(S: any) {
  if (!S || !S.cups) return;
  const last = (Array.isArray(S.sched) && S.sched.length ? S.sched.length : 38) - 1;
  const cal: any = { _season: S.season };
  Object.keys(S.cups).forEach((key) => { if (S.cups[key]) cal[key] = buildCupScheduleS(key, cupTotalRoundsS(S, key), last); });
  S.cupCalendar = cal;
}
function cupIsFinished(b: any) { return !!b.champion; }
function cupSide(S: any, id: string) { return { rat: ME.computeRatings(S.squads[id], null), xi: ME.resolveXI(S.squads[id], null), tactic: 'equilibrado', cap: capFor(S, id), short: (S.clubShort || {})[id] || id }; }
function resolveDrawnKnockoutTie(S: any, homeId: string, awayId: string, seed: number, hg: number, ag: number) {
  if (hg !== ag) return { hg, ag, winner: hg > ag ? homeId : awayId, pens: null };
  const R = ME.makeRng(ME.hashSeed(seed, 'extra'));
  const H = ME.computeRatings(S.squads[homeId], null), A = ME.computeRatings(S.squads[awayId], null);
  const bias = (H.OS + H.MS - H.DS * 0.3) - (A.OS + A.MS - A.DS * 0.3);
  const pHome = clampN(0.5 + bias / 500, 0.18, 0.55), pAway = clampN(0.5 - bias / 500, 0.18, 0.55);
  const ehg = R.random() < pHome ? 1 : 0, eag = R.random() < pAway ? 1 : 0;
  if (ehg !== eag) return { hg: hg + ehg, ag: ag + eag, winner: ehg > eag ? homeId : awayId, pens: null };
  const hxi = ME.resolveXI(S.squads[homeId], null), axi = ME.resolveXI(S.squads[awayId], null);
  const hp = hxi.filter((p: any) => p.s !== 'GK'), ap = axi.filter((p: any) => p.s !== 'GK');
  const gkH = hxi.find((p: any) => p.s === 'GK') || null, gkA = axi.find((p: any) => p.s === 'GK') || null;
  const kick = (taker: any, gk: any) => taker && R.random() < ME.penaltyConvChance(taker, gk);
  let pH = 0, pA = 0;
  for (let i = 0; i < 5; i++) { if (kick(hp.length ? hp[i % hp.length] : null, gkA)) pH++; if (kick(ap.length ? ap[i % ap.length] : null, gkH)) pA++; }
  let rr = 5;
  while (pH === pA && rr < 20) { if (kick(hp.length ? hp[rr % hp.length] : null, gkA)) pH++; if (kick(ap.length ? ap[rr % ap.length] : null, gkH)) pA++; rr++; }
  const winner = pH !== pA ? (pH > pA ? homeId : awayId) : (R.random() < 0.5 ? homeId : awayId);
  return { hg, ag, winner, pens: { h: pH, a: pA } };
}
/* COTA POR FASE DA COPA DO BRASIL — espelho de PRIZES.copaBrasilPhaseCash + awardCupPhasePrize
   (public/src/data/prizes.js e core.js). Os dois lados TÊM que usar a mesma tabela: o servidor é o
   dono do caixa dos clubes NÃO-humanos (S.budgets), enquanto o caixa de um humano vive no assento
   (game_seats.budget) e é o cliente dele quem credita — por isso aqui só pagamos a quem não é
   humano, e o carimbo t.prize (que viaja no shared_state) evita pagamento duplo dos dois lados. */
const CB_PHASE: any = { final: 28e6, vice: 14e6, semi: 9e6, quartas: 4e6, oitavas: 2e6, dezesseis: 1.5e6, f2: 0.8e6, f1: 0.4e6 };
function copaBrasilPhaseCash(round: number, roundsTotal: number, isChampion?: boolean) {
  const dist = (roundsTotal || 0) - (round || 0);
  if (dist <= 0) return isChampion === false ? CB_PHASE.vice : CB_PHASE.final;
  if (dist === 1) return CB_PHASE.semi;
  if (dist === 2) return CB_PHASE.quartas;
  if (dist === 3) return CB_PHASE.oitavas;
  if (dist === 4) return CB_PHASE.dezesseis;
  return round <= 1 ? CB_PHASE.f1 : CB_PHASE.f2;
}
function awardCupPhasePrize(S: any, key: string, b: any, t: any, humans?: Set<string>) {
  if (key !== COPA_NACIONAL_KEY() || !t || !t.winner || t.prize) return;   // cota de fase e da copa nacional
  const loser = t.winner === t.h ? t.a : t.h;
  const isFinal = (b.roundsTotal - b.round) <= 0;
  const pagar: any[] = [[t.winner, copaBrasilPhaseCash(b.round, b.roundsTotal, true)]];
  if (isFinal) pagar.push([loser, copaBrasilPhaseCash(b.round, b.roundsTotal, false)]);
  t.prize = { round: b.round, pagos: pagar.map(([id, amt]: any) => ({ id, amt })) };
  S.budgets = S.budgets || {};
  pagar.forEach(([id, amt]: any) => {
    if (!id || !amt) return;
    if (humans && humans.has(id)) return; // caixa de humano é do assento — o cliente dele credita
    S.budgets[id] = Math.round((S.budgets[id] || 0) + amt);
  });
}
/* súmula de uma partida de COPA: gol na artilharia + JOGO/nota no historial dos dois elencos.
   O cliente já fazia isso localmente em finishCupLiveMatch(), mas o adopt da rodada seguinte
   sobrescreve o S local pelo do servidor — então o gol de copa sumia da artilharia e o jogo
   nunca entrava no Historial. Aqui é o único lugar que sobrevive. */
function cupSumula(S: any, h: string, a: string, hg: number, ag: number, scorers: any[], perf: any, roundLabel: string, caps?: any, matchMinutes?: number) {
  recordScorers(S, scorers || [], (roundLabel || '').split('-')[0]);   // a competição é o prefixo do label (idem advanceCupBracket)
  const R = ME.makeRng(ME.hashSeed(S.seed, 'cuprate', roundLabel, S.round, h, a));
  const capsH = (caps && caps.H) || null, capsA = (caps && caps.A) || null;
  const mm = matchMinutes || 90;
  const xiH = S.squads[h] ? (capsH ? S.squads[h] : ME.resolveXI(S.squads[h], null)) : null;
  const xiA = S.squads[a] ? (capsA ? S.squads[a] : ME.resolveXI(S.squads[a], null)) : null;
  ratePlayersS(S, h, xiH, hg, ag, scorers || [], R, perf && perf.H, perf && perf.A, capsH, mm);
  ratePlayersS(S, a, xiA, ag, hg, scorers || [], R, perf && perf.A, perf && perf.H, capsA, mm);
}
function advanceCupBracket(S: any, b: any, roundLabel: string, cupResultByFx: any, humans?: Set<string>) {
  if (!b || cupIsFinished(b)) return;
  const winners: string[] = [];
  b.ties.forEach((t: any) => {
    if (t.winner) { winners.push(t.winner); return; }
    // a competição faz parte da chave: sem ela, um resultado da Sul-Americana entre os mesmos dois
    // clubes era consumido pela chave da Copa do Brasil da mesma jornada (e vice-versa)
    const k = t.h + '-' + t.a; const cupKey = roundLabel.split('-')[0];
    const sub = cupResultByFx && (cupResultByFx[cupKey + '|' + k] || cupResultByFx[k]);
    if (sub && sub.winner) { // resultado submetido por um humano (mandante-autoritativo)
      t.hg = sub.hg; t.ag = sub.ag; t.events = sub.events || []; t.winner = sub.winner; t.pens = sub.pens || null;
      applyMatchIncidents(S, sub.events || []);
      cupSumula(S, t.h, t.a, sub.hg, sub.ag, sub.scorers || [], sub.perf || null, roundLabel, sub.caps || null, sub.matchMinutes || 90);
      const loser = sub.winner === t.h ? t.a : t.h; b.eliminated[loser] = true; winners.push(sub.winner);
      t.jornada = S.round; awardCupPhasePrize(S, roundLabel.split('-')[0], b, t, humans); return;
    }
    const seed = ME.hashSeed(S.seed, 'cup', roundLabel, t.h, t.a);
    const r = ME.simMatchPure(t.h, t.a, cupSide(S, t.h), cupSide(S, t.a), seed, {});
    t.hg = r.hg; t.ag = r.ag; t.events = r.events;
    applyMatchIncidents(S, r.events);
    cupSumula(S, t.h, t.a, r.hg, r.ag, r.scorers || [], r.perf || null, roundLabel, r.caps || null, r.matchMinutes || 90);
    const res = resolveDrawnKnockoutTie(S, t.h, t.a, seed, r.hg, r.ag);
    t.winner = res.winner; t.pens = res.pens || null; winners.push(res.winner);
    t.jornada = S.round;                                   // Calendário do cliente lê este carimbo
    awardCupPhasePrize(S, roundLabel.split('-')[0], b, t, humans);
    const loser = res.winner === t.h ? t.a : t.h; b.eliminated[loser] = true;
  });
  const advancing = winners.concat(b.pendingByes || []);
  b.history.push({ round: b.round, ties: b.ties.slice(), advanced: advancing.slice() });
  if (advancing.length <= 1) { b.champion = advancing[0] || null; b.ties = []; b.pendingByes = []; return; }
  b.round++;
  let size = 1; while (size < advancing.length) size *= 2;
  const nByes = size - advancing.length;
  const ranked = advancing.slice().sort((x: string, y: string) => ((S.clubOverall || {})[y] || 70) - ((S.clubOverall || {})[x] || 70));
  b.pendingByes = ranked.slice(0, nByes);
  const rest = ranked.slice(nByes);
  b.ties = []; for (let i = 0; i < rest.length; i += 2) b.ties.push({ h: rest[i], a: rest[i + 1], hg: null, ag: null, winner: null, events: [] });
}
/* ===== COPAS DE GRUPO (Libertadores / Sul-Americana) =====
   Porte fiel de advanceGroupStageRound + a transição grupo->mata-mata de advancePendingCups
   (public/src/engine/core.js). ANTES o servidor só avançava a Copa do Brasil e deixava as
   continentais PARADAS ("portadas numa fase futura") — e como o cliente adota o estado do
   servidor a cada rodada (Object.assign(S, sState) no reconcile), o índice da rodada de grupo
   voltava atrás toda vez: o jogador reencontrava o MESMO adversário em toda semana de copa e a
   tabela do grupo ficava travada em zero. Agora o grupo avança aqui, que é o único lugar cujo
   resultado sobrevive ao adopt. ===== */
const SEASON_EPOCH_2026 = [2026, 2, 1];   // 1º/mar/2026 — mesma âncora do cliente (SEASON_START_2026)
function realDateForDayS(day: number) {
  const d = new Date(SEASON_EPOCH_2026[0], SEASON_EPOCH_2026[1], SEASON_EPOCH_2026[2]);
  d.setDate(d.getDate() + ((day || 1) - 1));
  return d;
}
// CONMEBOL sorteou as oitavas em 29/mai/2026 — até lá a fase de grupos encerrada fica
// "aguardando sorteio", igual à vida real (mesma tabela do cliente).
const COMP_R16_DRAW_2026: any = { libertadores: new Date(2026, 4, 29), sulamericana: new Date(2026, 4, 29) };
/* AS COPAS DO PAIS, NAO AS DO BRASIL. Era uma lista fixa com o comentario "Resenha e sempre
   Brasil". Agora sai da folha: CONMEBOL -> Libertadores/Sul-Americana, UEFA -> Champions/Europa.
   Funcoes (nao constantes) porque UNI_ATIVO so e conhecido depois de ler o shared_state. */
function GRUPO_KEYS(): string[] { return WORLD_CONFIG.copasContinentaisDe(UNI_ATIVO); }
/* A copa nacional: 'copaBrasil' no Brasil, e NENHUMA nos outros paises modelados hoje. Onde
   estava o literal 'copaBrasil' passa a estar isto — e quem nao tem copa nacional simplesmente
   pula o bloco em vez de ganhar uma Copa do Brasil de presente. */
function COPA_NACIONAL_KEY(): string | null { return WORLD_CONFIG.COPA_NACIONAL[UNI_ATIVO] || null; }
function groupTableStandingsS(g: any) {
  return Object.values(g.table || {}).sort((a: any, b: any) =>
    b.Pts - a.Pts || (b.GF - b.GA) - (a.GF - a.GA) || b.GF - a.GF || String(a.id).localeCompare(String(b.id)));
}
function groupStageAdvancersS(mg: any) {
  const out: string[] = [];
  Object.values(mg.groups || {}).forEach((g: any) => {
    groupTableStandingsS(g).slice(0, mg.advancePerGroup || 2).forEach((t: any) => out.push(t.id));
  });
  return out;
}
function advanceGroupStageRoundS(S: any, mg: any, roundLabel: string, cupResultByFx: any) {
  if (!mg || mg.finished) return;
  Object.values(mg.groups || {}).forEach((g: any) => {
    const fx = (g.sched || [])[mg.round] || [];
    fx.forEach((pair: any) => {
      const h = pair && pair[0], a = pair && pair[1];
      if (h == null || a == null) return;               // bye (grupo com número ímpar de times)
      if (!S.squads || !S.squads[h] || !S.squads[a]) return;  // clube não materializado neste save
      const T = g.table; if (!T || !T[h] || !T[a]) return;
      let hg: number, ag: number, scorers: any[], perf: any;
      let gcaps: any = null, gmins = 90;                      // súmula de minutos (ver ratePlayersS)
      // partida jogada AO VIVO por um humano: usa o resultado que ELE viu, em vez de re-simular
      // (senão o placar da tela dele seria sobrescrito por outro no adopt seguinte).
      const gCupKey = roundLabel.split('-')[0];   // idem advanceCupBracket: a competição entra na chave
      const sub = cupResultByFx && (cupResultByFx[gCupKey + '|' + h + '-' + a] || cupResultByFx[h + '-' + a]);
      if (sub && sub.stage === 'group') {
        hg = sub.hg; ag = sub.ag; scorers = sub.scorers || []; perf = sub.perf || null; gcaps = sub.caps || null; gmins = sub.matchMinutes || 90;
        applyMatchIncidents(S, sub.events || []);
      } else {
        const seed = ME.hashSeed(S.seed, roundLabel, g.label, h, a);
        const r = ME.simMatchPure(h, a, cupSide(S, h), cupSide(S, a), seed, {});
        hg = r.hg; ag = r.ag; scorers = r.scorers || []; perf = r.perf || null; gcaps = r.caps || null; gmins = r.matchMinutes || 90;
        applyMatchIncidents(S, r.events);
      }
      cupSumula(S, h, a, hg, ag, scorers, perf, roundLabel, gcaps, gmins);   // artilharia + Historial dos dois elencos
      g.results = g.results || [];
      g.results.push({ r: mg.round, h, a, hg, ag, jornada: S.round });   // Calendário do cliente lê isto
      T[h].P++; T[a].P++; T[h].GF += hg; T[h].GA += ag; T[a].GF += ag; T[a].GA += hg;
      if (hg > ag) { T[h].W++; T[a].L++; T[h].Pts += 3; }
      else if (hg < ag) { T[a].W++; T[h].L++; T[a].Pts += 3; }
      else { T[h].D++; T[a].D++; T[h].Pts++; T[a].Pts++; }
    });
  });
  mg.round++;
  if (mg.round >= mg.roundsTotal) mg.finished = true;
}
/* UMA RODADA POR COMPETIÇÃO POR JORNADA. O cliente já tinha esta trava (`jaResolvida` no
   advancePendingCups do core.js): quando o humano joga a partida de copa ao vivo, o
   resolveCupRoundRest resolve o RESTO daquela rodada na hora e carimba S._cupResolvedRound[key].
   O servidor não olhava esse carimbo — então, ao fechar a quarta, ele avançava a competição DE
   NOVO na mesma jornada. Resultado no Calendário do jogador: dois jogos da mesma competição no
   mesmo dia (medido: duas rodadas de grupo da Libertadores em 04/mar, e Copa do Brasil com 2ª
   fase e 16 avos juntas). O carimbo viaja no shared_state, então basta lê-lo — e escrevê-lo,
   pra uma segunda chamada do próprio servidor também ser inócua. */
/* `M` e o MUNDO do pais: as copas e o calendario de copa sao DELE. O resto -- semente, rodada,
   dia, forca dos clubes -- e do jogo inteiro. Sem M, opera na ancora, como sempre operou.
   Enquanto isto rodava uma vez so, a Champions do treinador ingles simplesmente nao avancava. */
function advancePendingCups(S: any, cupResultByFx: any, humans?: Set<string>, M?: any) {
  const mundoC = M || S;
  const uniC = (M && M.pais) || UNI_ATIVO;          // as copas sao do PAIS deste mundo
  if (!mundoC.cups) return;
  /* trava "uma rodada por competicao por jornada" — MESMAS funcoes que o cliente usa (folha unica).
     A trava e por MUNDO: a Copa do Brasil e a Champions podem cair na mesma jornada sem uma
     carimbar pela outra, porque cada pais tem a sua marca. */
  const marcaDe = (k: string) => (M && M.pais) ? (M.pais + ':' + k) : k;
  const jaResolvida = (k: string) => WR.cupAlreadyResolved(S._cupResolvedRound, marcaDe(k), S.round);
  const marcar = (k: string) => { S._cupResolvedRound = WR.markCupResolved(S._cupResolvedRound, marcaDe(k), S.round); };
  const tique = (k: string) => WR.cupTickMatchesRound(mundoC.cupCalendar, k, S.round);
  const nacKey = WORLD_CONFIG.COPA_NACIONAL[uniC] || null;
  if (nacKey && tique(nacKey) && !jaResolvida(nacKey)) {
    const cb = mundoC.cups[nacKey];
    if (cb && !cupIsFinished(cb) && cb.ties && cb.ties.length) {
      advanceCupBracket(S, cb, nacKey + '-r' + cb.round, cupResultByFx, humans); marcar(nacKey);
    }
  }
  WORLD_CONFIG.copasContinentaisDe(uniC).forEach((key: string) => {
    if (!tique(key)) return;
    if (jaResolvida(key)) return;
    const c = mundoC.cups[key]; if (!c) return;
    if (c.group && !c.bracket) {
      if (!c.group.finished) { advanceGroupStageRoundS(S, c.group, key + '-grupo-r' + c.group.round, cupResultByFx); marcar(key); }
      if (c.group.finished) {
        const drawDate = (S.season === 2026) ? COMP_R16_DRAW_2026[key] : null;
        if (!drawDate || realDateForDayS(S.day) >= drawDate) {
          c.bracket = makeBracketT(groupStageAdvancersS(c.group), ME.hashSeed(S.seed, key, 'mata-mata', S.season), S.clubOverall || {});
        }
      }
    } else if (c.bracket && !cupIsFinished(c.bracket) && c.bracket.ties && c.bracket.ties.length) {
      advanceCupBracket(S, c.bracket, key + '-r' + c.bracket.round, cupResultByFx, humans); marcar(key);
    }
  });
}
/* ===== COPAS CONTINENTAIS NA VIRADA DE TEMPORADA =====
   O cliente monta Libertadores/Sul-Americana em newSeasonReset (initSeasonCups), mas na Resenha a
   virada é 100% do servidor e o cliente só adota o resultado — então sem isto as continentais da
   temporada NOVA nunca eram criadas: o estado seguia carregando a edição do ano anterior, já
   encerrada, e ninguém tinha Libertadores na temporada 2+.
   As 6+6 vagas brasileiras saem da CLASSIFICAÇÃO FINAL da Série A — mesma regra do cliente e das
   tags "Lib"/"Sul" do ranking. Os representantes CONMEBOL são os mesmos da edição anterior: o
   servidor não simula as ligas sul-americanas, então não existe campanha nova pra respeitar, e
   reaproveitar quem já está no estado (com elenco materializado) mantém o formato de 32 clubes
   sem inventar resultado que ninguém jogou. ===== */
/* As vagas saiam daqui, fixas em 6 e 6 — os numeros do Brasil. Agora vem da folha
   (WORLD_CONFIG.vagasContinentais), que ja tinha a tabela por pais do lado do cliente
   (LIB_SLOTS_UNI/SUL_SLOTS_UNI em core.js): Argentina 6+5, Colombia 4+4, Portugal 2+2... */
function prevCupTeamIds(S: any, key: string) {
  const c = S.cups && S.cups[key]; const out: string[] = [];
  if (c && c.group && c.group.groups) Object.keys(c.group.groups).forEach((k) => ((c.group.groups[k] || {}).teams || []).forEach((id: string) => out.push(id)));
  if (c && c.bracket) {   // fase de grupos já virou mata-mata: os participantes vivem na chave
    (c.bracket.ties || []).forEach((t: any) => { if (t.h) out.push(t.h); if (t.a) out.push(t.a); });
    (c.bracket.pendingByes || []).forEach((id: string) => out.push(id));
    (c.bracket.history || []).forEach((h: any) => (h.ties || []).forEach((t: any) => { if (t.h) out.push(t.h); if (t.a) out.push(t.a); }));
  }
  return Array.from(new Set(out));
}
function splitIntoGroupsT(ids: string[], seedNum: number) {
  const R = ME.makeRng(seedNum >>> 0); const sh = ids.slice();
  for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(R.random() * (i + 1)); const t = sh[i]; sh[i] = sh[j]; sh[j] = t; }
  const groups: any = {}; const letters = 'ABCDEFGH';
  for (let i = 0; i < sh.length; i += 4) { const label = letters[Math.floor(i / 4)] || String(Math.floor(i / 4) + 1); groups[label] = sh.slice(i, i + 4); }
  return groups;
}
function makeGroupStageT(groupsMap: any, advancePerGroup: number) {
  const groups: any = {};
  Object.keys(groupsMap).forEach((label) => {
    const ids: string[] = groupsMap[label];
    const table: any = {}; ids.forEach((id) => table[id] = { id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 });
    groups[label] = { label, teams: ids.slice(), table, sched: makeScheduleT(ids.slice()) };
  });
  const lens = Object.keys(groups).map((k) => groups[k].sched.length);
  return { groups, round: 0, roundsTotal: Math.max(1, ...lens), finished: false, advancePerGroup: advancePerGroup || 2 };
}
/* ===== O CAMPEÃO DA COPA DO BRASIL TEM VAGA NA LIBERTADORES (regra do dono, 20-21/08) =====
   Gêmeo do nationalCupFinalists do cliente (core.js). Só o CAMPEÃO — o vice não leva vaga
   (ajuste de 21/08). A copa nacional que FECHOU vive em S._prevSeason.copaBrasil. Só o
   Brasil tem copa nacional materializada — outro universo devolve []. */
function nationalCupFinalistsT(S: any) {
  try {
    if (UNI_ATIVO !== 'brasil') return [];
    const b = S._prevSeason && S._prevSeason.copaBrasil;
    return (b && b.champion) ? [b.champion] : [];
  } catch (_e) { return []; }
}
function rebuildContinentalCups(S: any, topStandings: string[]) {
  if (!topStandings || !topStandings.length) return;
  /* QUAIS SAO AS DUAS CONTINENTAIS DEPENDE DA CONFEDERACAO DO PAIS. Estava escrito
     'libertadores'/'sulamericana' em seis lugares: um save ingles remontava a Libertadores em vez
     da Champions. A folha responde pelas duas coisas — quais copas e quantas vagas. */
  const copas = WORLD_CONFIG.copasContinentaisDe(UNI_ATIVO);
  const vagas = WORLD_CONFIG.vagasContinentais(UNI_ATIVO);
  const prev = copas.map((k: string) => prevCupTeamIds(S, k));
  if (!prev.some((l: string[]) => l.length)) return;   // save nunca teve continental (ex.: comecou na D) — nada a remontar
  /* O campeão da primeira continental (Libertadores/Champions) DEFENDE a vaga no ano
     seguinte, e o campeão e o vice da copa nacional entram NA FRENTE das vagas dela; a
     tabela completa o resto e a segunda copa fica com os melhores que sobraram. `usados`
     garante que ninguém ocupa vaga nas duas — é a mesma alocação sequencial do corte antigo.
     Campeão de fora do país não consome vaga local: ele volta pela reciclagem dos
     participantes (prevCupTeamIds), que já o inclui. */
  const champCont = (() => { try {
    const c = S._prevSeason && S._prevSeason.cups && S._prevSeason.cups[copas[0]];
    return (c && c.champion) || null;
  } catch (_e) { return null; } })();
  const finalistas = (champCont && topStandings.indexOf(champCont) >= 0 ? [champCont] : []).concat(nationalCupFinalistsT(S));
  const daCasa = new Set(topStandings.concat(finalistas));  // id do pais (tabela ou final da copa); o resto e estrangeiro
  const usados = new Set<string>();
  const locaisDe = (n: number, prioridade: string[]) => {
    const out: string[] = [];
    prioridade.concat(topStandings).forEach((id) => { if (out.length < n && !usados.has(id)) { usados.add(id); out.push(id); } });
    return out;
  };
  const build = (key: string, locais: string[], estrangeiros: string[]) => {
    const ids = locais.concat(estrangeiros).filter((id) => S.squads && S.squads[id]);   // sem elenco no save, nao entra
    let uniq = Array.from(new Set(ids)).slice(0, 32);
    /* ===== NADA DE GRUPO DE 3 (checklist da virada, item 2) =====
       A edicao real de 2026 da Sul-Americana tem 7 brasileiros e a cota e 6: a remontagem
       recicla 25 estrangeiros + 6 da tabela = 31, e o fatiador de 4 em 4 deixava o grupo H
       com 3 — para sempre, porque 31 vira 31 de novo no ano seguinte. O total agora fecha
       em multiplo de 4: completa com o PROXIMO da tabela do pais que ainda nao tem vaga
       (o 13o, no caso) e, so se nao houver mais ninguem, apara os ultimos reciclados. */
    for (const id of topStandings) {
      if (uniq.length % 4 === 0 || uniq.length >= 32) break;
      if (usados.has(id) || uniq.indexOf(id) >= 0 || !(S.squads && S.squads[id])) continue;
      usados.add(id); uniq.push(id);
    }
    if (uniq.length % 4 !== 0) uniq = uniq.slice(0, uniq.length - (uniq.length % 4));
    if (uniq.length < 4) return;
    S.cups[key] = { group: makeGroupStageT(splitIntoGroupsT(uniq, ME.hashSeed(S.seed, key + 'groups', S.season)), 2), bracket: null };
  };
  copas.forEach((key: string, i: number) => {
    build(key, locaisDe(vagas[i] || 0, i === 0 ? finalistas : []), (prev[i] || []).filter((id: string) => !daCasa.has(id)));
  });
}
/* ===== VIRADA DE TEMPORADA (F3.2) — promoção/rebaixamento + envelhecimento/regen + reconstrução.
   Viewer-independente (não depende de S.clubId): opera no MUNDO. Todas as 4 divisões já são
   materializadas em S.squads, então a troca só remaneja quais clubes ficam em cada divisão
   (computeDivisionSwap, provado byte-idêntico ao cliente). Servidor = autoridade: os detalhes
   cosméticos do regen (atributos) são gerados de forma simples e determinística, sem precisar
   bater com o genAttrs do cliente. A configuração do país (pirâmide, copas, nomes) sai de
   UNIVERSOS/WORLD_CONFIG a partir de `S.intlUniverse` — ver aplicarUniverso. ===== */
/* ===== A PIRAMIDE DO PAIS, NAO A DO BRASIL =====
   Estas seis tabelas eram constantes congeladas no Brasil. Agora vêm de UNIVERSOS/WORLD_CONFIG,
   a mesma folha que o cliente lê — exatamente o que `setUniverse()` (core.js) já faz do outro
   lado. `aplicarUniverso(S)` é chamada uma vez por pedido, logo depois de ler o shared_state.

   Para o Brasil o resultado é IDÊNTICO ao que estava escrito aqui, e é isso que
   scripts/teste-universos.mjs prova — a generalização não pode mexer no que já está no ar. */
let UNI_ATIVO = 'brasil';
let DIV_ORDER: string[] = ['A', 'B', 'C', 'D'];
let DIVISION_SIZE: any = { A: 20, B: 20, C: 20, D: 20 };
let DIVISION_PROMO: any = { A: 0, B: 4, C: 4, D: 4 };
let DIVISION_RELEG: any = { A: 4, B: 4, C: 4, D: 0 };
let DIVISION_FORCE_RANGE: any = { A: [58, 88], B: [58, 80], C: [52, 74], D: [48, 68] };
let DIV_FORCE_CAP: any = { B: 37, C: 24, D: 12 };
/* ===== O SERVIDOR RESOLVE A PIRAMIDE ANCORA =====
   `aplicarUniverso` monta as tabelas do pais da ANCORA -- a piramide que vive em S.table/
   S.otherDivs e que este resolvedor faz andar. NAO e "o pais da sala": num mundo com humanos em
   paises diferentes essa frase nao existe, e o pais de cada jogador sai do clube do assento dele.

   O QUE AINDA FALTA, e esta escrito aqui para nao se perder: quando houver humano num segundo
   pais, esse pais precisa da PROPRIA piramide resolvida -- hoje ele vive em S.bgLeagues, que so
   tem tabela e calendario, sem elencos nem virada de temporada propria. `WORLD_CONFIG.paisesVivos(S)`
   ja devolve a lista certa; falta o resolvedor iterar sobre ela. Enquanto nao itera, um segundo
   pais vivo roda como fundo -- e isso contraria a regra do espectador, que manda o humano
   assistir a tudo do pais dele. E o passo seguinte da Fase 5. */
function aplicarUniverso(S: any) {
  const chave = WORLD_CONFIG.uniDoEstado(S);
  /* A FOLHA DE CALENDARIO DA SALA. Vem no shared_state, carimbada por quem montou a temporada
     (core.js: ensureCupCalendar) ja com o pacote do painel aplicado. E assim que um pais criado
     no painel admin vale tambem no servidor, sem o servidor ter de ler pack_edits -- que seria
     uma consulta por rodada e uma segunda porta para o mesmo dado.
     Folha recusada pelo validador nao entra: fica a do repositorio, que e a que o cliente
     tambem usaria (instalarCalendario aplica o mesmo criterio nos dois lados). */
  if (S && S.calFolha && S.calFolha.pais === chave && S.calFolha.folha) {
    const r = CALENDARIOS_API.instalarCalendario(chave, S.calFolha.folha, {});
    if (!r.ok) console.warn('calendario da sala recusado (' + chave + '): ' + r.motivo);
  }
  const t = WORLD_CONFIG.tabelasDoUniverso(chave);
  UNI_ATIVO = chave;
  DIV_ORDER = t.ordem; DIVISION_SIZE = t.size; DIVISION_PROMO = t.promo; DIVISION_RELEG = t.releg;
  DIVISION_FORCE_RANGE = t.forca; DIV_FORCE_CAP = t.cap;
  return chave;
}
const RETIRE_CHANCE_BY_AGE: any = { 32: 0.11, 33: 0.24, 34: 0.40, 35: 0.56, 36: 0.71, 37: 0.83, 38: 0.92, 39: 0.97 };
/* Os nomes de regen saem da folha (WORLD_CONFIG.NAME_POOLS), por pais. As listas do Brasil que
   estavam aqui eram identicas as do cliente -- conferidas antes de mover -- entao nada muda para
   quem ja joga; o que muda e que um regen ingles deixa de se chamar "Gabriel Silva". */
const REGEN_ATTR_KEYS = ['fin', 'dri', 'vel', 'com', 'pos', 'pas', 'cab', 'agi', 'fis', 'res', 'vis', 'des', 'cru', 'ref', 'mao'];
function sortTblT(t: any) { return Object.values(t || {}).sort((a: any, b: any) => b.Pts - a.Pts || (b.GF - b.GA) - (a.GF - a.GA) || b.GF - a.GF || String(a.id).localeCompare(String(b.id))); }
function makeScheduleT(ids: string[]) {
  const teams: any[] = ids.slice(); if (teams.length % 2) teams.push(null);
  const n = teams.length, rounds: any[] = []; let arr = teams.slice();
  for (let r = 0; r < n - 1; r++) { const rr: any[] = []; for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; if (a && b) rr.push(r % 2 ? [b, a] : [a, b]); } rounds.push(rr); arr.splice(1, 0, arr.pop()); }
  return rounds.concat(rounds.map((rr: any) => rr.map(([a, b]: any) => [b, a])));
}
function computeDivisionSwap(S: any) {
  const finalIds: any = {};
  DIV_ORDER.forEach((d) => { const t = (d === S.division) ? S.table : ((S.otherDivs[d] || {}).table || {}); finalIds[d] = sortTblT(t).map((x: any) => x.id); });
  const promoted: any = {}, relegated: any = {}, stayed: any = {};
  DIV_ORDER.forEach((d) => { const ids = finalIds[d] || [], rN = DIVISION_RELEG[d] || 0, pN = DIVISION_PROMO[d] || 0; promoted[d] = pN > 0 ? ids.slice(0, pN) : []; relegated[d] = rN > 0 ? ids.slice(Math.max(0, ids.length - rN)) : []; stayed[d] = ids.slice(pN, Math.max(pN, ids.length - rN)); });
  const nd: any = {};
  DIV_ORDER.forEach((d, i) => { const ab = DIV_ORDER[i - 1], be = DIV_ORDER[i + 1]; let l = stayed[d].slice(); if (ab) l = l.concat(relegated[ab]); if (be) l = l.concat(promoted[be]); nd[d] = l; });
  const seen = new Set<string>();
  DIV_ORDER.forEach((d) => { nd[d] = (nd[d] || []).filter((id: string) => { if (seen.has(id)) return false; seen.add(id); return true; }); });
  const un = Object.keys(S.clubPool || {}).filter((id) => !seen.has(id));
  DIV_ORDER.forEach((d) => { const need = DIVISION_SIZE[d] - nd[d].length; if (need > 0) { const f = un.splice(0, need); nd[d] = nd[d].concat(f); f.forEach((id: string) => seen.add(id)); } else if (need < 0) nd[d] = nd[d].slice(0, DIVISION_SIZE[d]); });
  return nd;
}
function ageForceFraction(a: number) { return a <= 22 ? 0.30 : a <= 29 ? 0.65 : a <= 32 ? 0.50 : 0.35; }
function rollAgedForce(R: any, range: number[], age: number) { const t = Math.max(0, Math.min(1, ageForceFraction(age) + (R.random() * 2 - 1) * 0.28)); return Math.round(range[0] + t * (range[1] - range[0])); }
function pickProcName(R: any, used: Set<string>) {
  const pool = WORLD_CONFIG.nomesDoPais(UNI_ATIVO); const PN = pool.first, SN = pool.last;
  let nm = '', tr = 0;
  do { const fn = PN[Math.floor(R.random() * PN.length)], ln = SN[Math.floor(R.random() * SN.length)];
       nm = fn + ' ' + ln + (tr < 1 ? '' : ' ' + SN[Math.floor(R.random() * SN.length)]); tr++;
  } while (used.has(nm) && tr < 400);
  used.add(nm); return nm;
}
function makeRegen(S: any, pos: string, div: string, seedExtra: string, used: Set<string>) {
  const range = DIVISION_FORCE_RANGE[div] || DIVISION_FORCE_RANGE.D; const R = ME.makeRng(ME.hashSeed('retire-repl', (S.seed || 1), S.season, div, pos, seedExtra));
  const age = Math.round(18 + R.random() * 4); const rawF = rollAgedForce(R, range, age); const f = Math.min(rbForce(rawF, div), DIV_FORCE_CAP[div] || 99);
  const L = Math.max(1, Math.min(20, Math.round(6 + (rawF - 45) * 13 / 46))); const attr: any = {}; REGEN_ATTR_KEYS.forEach((k) => attr[k] = L);
  const mv = rbValue(f, age);
  S._pidSeq = (S._pidSeq || 0) + 1;   // pid único (identidade por ID): continua a sequência do save
  return { n: pickProcName(R, used), pid: 'p' + S._pidSeq, p: pos, s: pos, f, rawF, _rb: 1, _div: div, age, lg: WORLD_CONFIG.codigoDaLiga(UNI_ATIVO, div), mv, ft: R.random() < 0.8 ? 'R' : 'L', num: String(Math.floor(R.random() * 40) + 1), nat: WORLD_CONFIG.nacionalidadeDe(UNI_ATIVO), ag: '—', moral: 70, energy: 100, attr, f0: rawF, mv0: mv, stats: { r3: [], g3: [], apps: 0, goals: 0, cs: 0 } };
}
/* motivos de aposentadoria (item 5) — sabor. Cada aposentadoria escolhe um motivo determinístico
   (mesma seed do sorteio de aposentar), com peso por idade/valor: velho tende à idade; craque rico
   tende ao "já ganhou dinheiro"; carismático vira comentarista; os demais, lesão/família/negócios. */
const RETIRE_REASONS = {
  idade: 'pendurou as chuteiras — a idade pesou',
  rico: 'aposentou milionário, não precisava mais jogar',
  tv: 'largou os gramados pra virar comentarista esportivo na TV',
  lesao: 'parou por causa das lesões e foi curtir a família',
  negocios: 'saiu do futebol pra cuidar dos negócios fora dos gramados',
};
function pickRetireReason(R: any, p: any) {
  const age = p.age || 35, mv = p.mv || 0, r = R.random();
  if (age >= 39) return r < 0.7 ? RETIRE_REASONS.idade : RETIRE_REASONS.tv;
  if (mv >= 20e6) return r < 0.55 ? RETIRE_REASONS.rico : (r < 0.8 ? RETIRE_REASONS.tv : RETIRE_REASONS.idade);
  const pool = [RETIRE_REASONS.idade, RETIRE_REASONS.lesao, RETIRE_REASONS.negocios, RETIRE_REASONS.tv, RETIRE_REASONS.rico];
  return pool[Math.floor(r * pool.length)];
}
function ageAndRetire(S: any, divOfClub: any, used: Set<string>, retirements?: any[]) {
  let regens = 0;
  Object.keys(S.squads).forEach((cid) => {
    const sq = S.squads[cid];
    for (let i = sq.length - 1; i >= 0; i--) {
      const p = sq[i]; p.age = (p.age || 26) + 1; p.f0 = p.f; p.mv0 = (p.mv || 1e6); p.benchStreak = 0; if (p.contract) p.contract.benchStreak = 0;
      const R = ME.makeRng(ME.hashSeed('retire-roll', (S.seed || 1), S.season, cid, i, p.n));
      const ch = p.age < 32 ? 0 : p.age >= 40 ? 1 : (RETIRE_CHANCE_BY_AGE[p.age] ?? 0.11);
      if (R.random() < ch) {
        if (retirements) retirements.push({ name: p.n, club: cid, clubShort: (S.clubShort || {})[cid] || cid, age: p.age, pos: p.s, f: p.f, reason: pickRetireReason(R, p) });
        sq[i] = makeRegen(S, p.s, divOfClub[cid] || S.division, cid + '_' + i, used); regens++;
      }
    }
    S.clubOverall[cid] = Math.round(sq.reduce((s: number, p: any) => s + p.f, 0) / (sq.length || 1));
  });
  return regens;
}
function makeBracketT(ids: string[], seedNum: number, clubOverall: any) {
  const R = ME.makeRng(seedNum >>> 0); const ranked = ids.slice().sort((a, b) => ((clubOverall[b] || 70) - (clubOverall[a] || 70)));
  let size = 1; while (size < ranked.length) size *= 2; const nB = size - ranked.length; const byeTeams = ranked.slice(0, nB); const play = ranked.slice(nB);
  for (let i = play.length - 1; i > 0; i--) { const j = Math.floor(R.random() * (i + 1)); const tmp = play[i]; play[i] = play[j]; play[j] = tmp; }
  const ties: any[] = []; for (let i = 0; i < play.length; i += 2) ties.push({ h: play[i], a: play[i + 1], hg: null, ag: null, winner: null, events: [] });
  return { round: 1, roundsTotal: Math.log2(size), byeTeams: byeTeams.slice(), ties, pendingByes: byeTeams.slice(), champion: null, eliminated: {}, history: [] };
}
/* ===== O ARQUIVO PERMANENTE DA TEMPORADA (S.archive) =====
   O _prevSeason é um buffer de UMA temporada — a virada seguinte o sobrescreve, e da
   temporada N em N+2 já não sobrava classificação nenhuma. O archive é append-only e
   nunca é tocado por reset algum: uma entrada por temporada fechada, com as tabelas
   finais de todas as divisões, a artilharia (top 25) e cada copa em forma compacta
   (campeão, tabelas finais dos grupos e os confrontos do mata-mata, SEM os `events`
   de narração — é neles que mora o peso). Viaja no shared_state, então todo assento
   da sala lê o mesmo arquivo. O cliente tem o gêmeo em core.js (archiveSeason). */
function archiveCupT(c: any) {
  if (!c) return null;
  const br = (c.champion !== undefined) ? c : (c.bracket || null);
  const out: any = { champion: (br && br.champion) || null };
  if (c.group && c.group.groups) {
    out.groups = {};
    Object.keys(c.group.groups).forEach((g) => {
      out.groups[g] = sortTblT(((c.group.groups[g] || {}).table) || {}).map((x: any) => ({ id: x.id, P: x.P, W: x.W, D: x.D, L: x.L, GF: x.GF, GA: x.GA, Pts: x.Pts }));
    });
  }
  if (br) {
    const limpa = (ties: any[]) => (ties || []).map((t: any) => ({ h: t.h, a: t.a, hg: t.hg, ag: t.ag, winner: t.winner || null, pens: t.pens || null }));
    // uma entrada por rodada, sem duplicar a que ainda vive em br.ties quando ela já foi pro history
    const porRodada: any = {};
    (br.history || []).forEach((h: any) => { porRodada[h.round] = limpa(h.ties); });
    if (br.ties && br.ties.length && !porRodada[br.round]) porRodada[br.round] = limpa(br.ties);
    out.rounds = Object.keys(porRodada).map(Number).sort((a, b) => a - b).map((r) => ({ round: r, ties: porRodada[r] }));
  }
  return out;
}
/* o artilheiro de cada competição, tirado do livro por competição: {comp:{nome,gols}} */
function topPorCompT(scorersByComp: any) {
  const out: any = {};
  Object.keys(scorersByComp || {}).forEach((k) => {
    const e = Object.entries(scorersByComp[k] || {}).sort((a: any, b: any) => (b[1] as number) - (a[1] as number))[0];
    if (e) out[k] = { nome: e[0], gols: e[1] };
  });
  return out;
}
function archiveSeasonT(S: any, tables: any) {
  S.archive = S.archive || [];
  const season = S.season || 1;
  if (S.archive.some((a: any) => a && a.season === season)) return;   // idempotente
  const scorers = Object.entries(S.scorers || {}).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).slice(0, 25);
  const cups: any = {};
  Object.keys(S.cups || {}).forEach((k) => { const a = archiveCupT(S.cups[k]); if (a) cups[k] = a; });
  S.archive.push({ season, tables, scorers, cups, artPorComp: topPorCompT(S.scorersByComp) });
}
/* RESGATE: sala que virou a temporada ANTES do archive existir ainda tem o _prevSeason
   da temporada recém-fechada — a próxima virada o sobrescreveria e aí sim o dado morre.
   Roda a cada pedido (idempotente): se o ano do _prevSeason não está no archive, entra
   agora. Só os grupos das continentais não são recuperáveis (o _prevSeason guarda apenas
   o mata-mata delas); tabelas de liga, artilharia e copa nacional entram inteiros. */
function backfillArchiveT(S: any) {
  const ps = S._prevSeason; if (!ps || ps.season == null) return;
  S.archive = S.archive || [];
  if (S.archive.some((a: any) => a && a.season === ps.season)) return;
  const scorers = Object.entries(ps.scorers || {}).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).slice(0, 25);
  const cups: any = {};
  const nac = COPA_NACIONAL_KEY();
  if (nac && ps.copaBrasil) { const a = archiveCupT(ps.copaBrasil); if (a) cups[nac as string] = a; }
  Object.keys(ps.cups || {}).forEach((k) => { if (cups[k]) return; const a = archiveCupT(ps.cups[k]); if (a) cups[k] = a; });
  S.archive.push({ season: ps.season, tables: ps.tables || {}, scorers, cups, artPorComp: topPorCompT(ps.scorersByComp) });
}
function resolveSeasonTurnover(S: any, humans?: Set<string>) {
  // 0) caixa dos clubes da CPU — ANTES do swap de divisões, com as tabelas/elencos do ano que fechou
  cpuSeasonFinances(S, humans || new Set<string>());
  cpuStadiumGrowth(S, humans || new Set<string>());   // 0b) obra do estádio, com o caixa já atualizado acima
  const newDiv = computeDivisionSwap(S);                          // 1) promoção/rebaixamento (provado)
  const divOfClub: any = {}; DIV_ORDER.forEach((d) => newDiv[d].forEach((id: string) => divOfClub[id] = d));
  // RESUMO DA TEMPORADA QUE ACABOU (pré-reset): tabelas finais por divisão + artilharia + copa.
  // O servidor NÃO credita caixa/prêmio (igual finanças) — cada humano monta a SUA premiação no
  // cliente a partir daqui (acha a própria divisão/posição por clubId). Ver computeMyPrevSeasonPrizes.
  const _prevTables: any = {};
  DIV_ORDER.forEach((d) => { const t = (d === S.division) ? S.table : ((S.otherDivs[d] || {}).table || {}); _prevTables[d] = sortTblT(t).map((x: any) => ({ id: x.id, P: x.P, W: x.W, D: x.D, L: x.L, GF: x.GF, GA: x.GA, Pts: x.Pts })); });
  S._prevSeason = { season: (S.season || 1), tables: _prevTables, scorers: S.scorers || {}, copaBrasil: (S.cups && COPA_NACIONAL_KEY() && S.cups[COPA_NACIONAL_KEY() as string]) || null };
  // AS COPAS CONTINENTAIS TAMBÉM PRECISAM SOBREVIVER À VIRADA. Só a Copa do Brasil era fotografada
  // aqui, então quem era campeão da Libertadores ou da Sul-Americana perdia a taça na virada: o
  // cliente registra os títulos a partir deste snapshot (registerPrevSeasonTitles, core.js) e
  // rebuildContinentalCups logo abaixo já apagou as chaves da temporada velha.
  // Vai SEM os `events` de cada confronto (narração jogada a jogada): é o que faz o peso do
  // snapshot, e nada do que lê o _prevSeason usa isso — só campeão, fases e placar da final.
  const semEventos = (b: any) => { if (!b) return null;
    const limpaTies = (ties: any[]) => (ties || []).map((t: any) => { const { events, ...resto } = t; return resto; });
    return { ...b, ties: limpaTies(b.ties), history: (b.history || []).map((h: any) => ({ ...h, ties: limpaTies(h.ties) })) }; };
  S._prevSeason.cups = {};
  GRUPO_KEYS().forEach((k) => {
    const c = S.cups && S.cups[k]; if (!c) return;
    S._prevSeason.cups[k] = semEventos((c.champion !== undefined) ? c : c.bracket);
  });
  // o livro de gols POR COMPETIÇÃO viaja na foto da virada — é dele que o cliente tira o
  // artilheiro de cada competição (artPorComp) no registerPrevSeasonTitles
  S._prevSeason.scorersByComp = S.scorersByComp || {};
  // arquivo permanente da temporada que fecha — antes de qualquer reset (ver archiveSeasonT)
  archiveSeasonT(S, _prevTables);
  // acumula artilharia histórica + Historial de carreira ANTES do reset — porte fiel do
  // mesmo trecho em endSeason() (core.js). Sem isto, "melhores marcadores de sempre" e o
  // Historial (jogos/cartões/lesões) do jogador perdiam TUDO a cada virada de temporada na
  // Resenha (o servidor é quem faz a virada aqui; o endSeason() do cliente nunca roda pra isso).
  S.allTimeScorers = S.allTimeScorers || {};
  Object.entries(S.scorers || {}).forEach(([n, g]: [string, any]) => { S.allTimeScorers[n] = (S.allTimeScorers[n] || 0) + g; });
  // p.career (títulos/temporadas na elite/melhor posição) — porte fiel do mesmo trecho em
  // endSeason() (core.js). Sem isto, o bônus de crescimento de "jogador consagrado"
  // (evolvePlayer -> careerBonus) nunca se aplicava na Resenha: p.career ficava congelado no
  // valor inicial pra sempre, já que só quem faz a virada de temporada aqui é o servidor.
  // wonCup só cobre a Copa do Brasil (única copa materializada com bracket no servidor —
  // Libertadores/Sul-Americana são só overall agregado em background, sem chave própria aqui).
  const tblDiv = _prevTables[S.division] || [];
  const nacW = COPA_NACIONAL_KEY();
  const wonCup = (cid: string) => !!(nacW && S.cups && S.cups[nacW] && S.cups[nacW].champion === cid);
  Object.keys(S.squads).forEach((cid) => {
    const pos = tblDiv.findIndex((t: any) => t.id === cid) + 1; // 1-based; 0 se o clube não estava nesta tabela
    const wonDivision = tblDiv[0] && tblDiv[0].id === cid;
    (S.squads[cid] || []).forEach((p: any) => {
      p.careerStats = p.careerStats || { apps: 0, cs: 0, yellows: 0, reds: 0, injuries: 0 };
      const st = p.stats || {};
      p.careerStats.apps += st.apps || 0; p.careerStats.cs += st.cs || 0;
      p.careerStats.yellows += st.yellows || 0; p.careerStats.reds += st.reds || 0; p.careerStats.injuries += st.injuries || 0;
      p.career = p.career || { titles: 0, seasonsTopDiv: 0, bestFinish: 99 };
      if (wonDivision || wonCup(cid)) p.career.titles++;
      if (S.division === 'A') p.career.seasonsTopDiv++;
      if (pos > 0) p.career.bestFinish = Math.min(p.career.bestFinish, pos);
    });
  });
  S.season = (S.season || 1) + 1;                                 // 2) nova temporada (regen usa o novo season no seed)
  const used = new Set<string>(); Object.keys(S.squads).forEach((cid) => S.squads[cid].forEach((p: any) => used.add(p.n)));
  const retirements: any[] = [];
  ageAndRetire(S, divOfClub, used, retirements);                 // 3) envelhece + aposenta (com motivo) + regen + recomputa overall
  S._prevSeason.retirements = retirements;                       // sabor (item 5): quem se aposentou e por quê
  DIV_ORDER.forEach((d) => newDiv[d].forEach((id: string) => (S.squads[id] || []).forEach((p: any) => p._div = d))); // _div nova (progressão)
  const anchor = S.division;                                     // 4) reconstrói tabelas + calendários (âncora mantida)
  const mkTable = (ids: string[]) => { const t: any = {}; ids.forEach((id) => t[id] = { id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 }); return t; };
  S.table = mkTable(newDiv[anchor]); S.sched = makeScheduleT(newDiv[anchor]);
  S.otherDivs = {}; DIV_ORDER.forEach((d) => { if (d === anchor) return; S.otherDivs[d] = { clubs: newDiv[d].map((id: string) => ({ id })), sched: makeScheduleT(newDiv[d]), table: mkTable(newDiv[d]) }; });
  // Copa do Brasil = SÓ as 4 divisões brasileiras (newDiv), NÃO Object.keys(S.squads) — este último
  // acumula clubes continentais/de background materializados ao longo das temporadas (Libertadores/
  // Sul-Americana, mercado), que não disputam a Copa do Brasil e poluíam a chave.
  const cbClubs = DIV_ORDER.reduce((acc: string[], d) => acc.concat(newDiv[d]), [] as string[]);
  S.cups = S.cups || {};
  const nacNova = COPA_NACIONAL_KEY();   // pais sem copa nacional nao ganha uma de presente
  if (nacNova) S.cups[nacNova] = makeBracketT(cbClubs, ME.hashSeed(S.seed, nacNova, S.season), S.clubOverall); // 5) copa nova
  // continentais da temporada nova: vagas brasileiras pela CLASSIFICAÇÃO FINAL da Série A que
  // acabou (_prevTables, capturado acima antes do reset das tabelas) — ver rebuildContinentalCups.
  rebuildContinentalCups(S, (_prevTables[DIV_ORDER[0]] || []).map((x: any) => x.id));
  S.round = 0; S.week = 1; S.day = 1; S.results = []; S.scorers = {}; S.scorersByComp = {}; S.negos = []; S.finished = false; // 6) reset de temporada
  buildCupCalendarS(S);   // 6b) calendário de copa da temporada NOVA (as copas acima são outras)
  Object.keys(S.squads).forEach((cid) => S.squads[cid].forEach((p: any) => { p.moral = 70; p.energy = 100; p.suspended = 0; p.injuredMatches = 0; p.stats = { r3: [], g3: [], apps: 0, goals: 0, cs: 0, yellows: 0, reds: 0, injuries: 0 }; }));
  S._roundIncidents = {};
}
/* resolve UMA rodada da liga no estado S (mutando-o). humanResultByFx: {"h-a":{hg,ag,scorers,events}} */
/* TRANSFERÊNCIAS dos humanos (compra/venda). Chegam junto do resultado da rodada
   (last_result.transfers) porque é o único canal por-assento que o convidado escreve toda rodada.
   Sem isto, o servidor — único produtor do shared_state — desfazia a contratação na rodada
   seguinte (o jogador voltava pro clube vendedor). IDEMPOTENTE: se o jogador já está no destino,
   ignora — o cliente reenvia até confirmar, então aplicar duas vezes não duplica ninguém.

   t.to nulo = o jogador SAI do mundo (multa rescisória acionada por clube europeu, que não existe
   como clube jogável aqui) — só remove do elenco de origem.

   DINHEIRO (t.fee): move o caixa APENAS do lado NÃO-humano. O caixa de um humano é autoritativo em
   game_seats.budget, já copiado pro mundo antes desta função rodar; debitar/creditar aqui também
   contaria a transação duas vezes. Então numa negociação humano↔humano nada acontece aqui (cada
   cliente publica o próprio caixa), e numa humano↔CPU só o lado da CPU se mexe. Sem isto o dinheiro
   pago a um clube da CPU simplesmente evaporava do jogo — o que passou a importar de verdade agora
   que a CPU acumula caixa (ver cpuSeasonFinances). Fica dentro do mesmo guard de idempotência: se a
   transferência já foi aplicada, o dinheiro não anda de novo. */
function applyHumanTransfers(S: any, transfers: any[], humans?: Set<string>) {
  const isHuman = (id: string) => !!(humans && humans.has(id));
  // casa por pid (identidade) OU nome. NÃO pode ser "pid quando existe, SENÃO nome": se o pid do
  // cliente divergir do pid no elenco autoritativo (re-materialização, pid nulo/colidido), o match
  // exclusivo por pid falhava pra sempre — a venda nunca aplicava, o jogador voltava e dava pra
  // revender (o caixa do humano é por-assento, então o dinheiro ficava). pid OU nome, escopo de 1 clube.
  const match = (x: any, t: any) => (t.pid != null && x.pid === t.pid) || x.n === t.p;
  (transfers || []).forEach((t: any) => {
    if (!t || !t.p || !t.from || t.from === t.to) return;
    // JOGADOR DA BASE (item 5): from 'BASE' + player embutido -> ADICIONA o jovem ao clube destino
    // (jogador NOVO, não existe em nenhum elenco). Idempotente por pid. O caixa não muda (sem taxa).
    if (t.from === 'BASE') {
      const dstB = S.squads[t.to]; if (!Array.isArray(dstB) || !t.player) return;
      if (dstB.some((x: any) => x.pid === t.player.pid || x.n === t.player.n)) return; // já adicionado
      dstB.push(t.player);
      if (dstB.length) S.clubOverall[t.to] = Math.round(dstB.reduce((s: number, x: any) => s + x.f, 0) / dstB.length);
      return;
    }
    const src = S.squads[t.from];
    if (!Array.isArray(src)) return;
    const fee = Math.round(Number(t.fee) || 0);

    if (!t.to) {                                                  // saída do mundo (multa rescisória)
      const j = src.findIndex((x: any) => match(x, t)); if (j < 0) return; // já saiu -> idempotente
      src.splice(j, 1);
      if (src.length) S.clubOverall[t.from] = Math.round(src.reduce((s: number, x: any) => s + x.f, 0) / src.length);
      return;
    }

    const dst = S.squads[t.to];
    if (!Array.isArray(dst)) {
      // clube comprador NÃO existe no mundo (background/CONMEBOL não materializado): trata como
      // SAÍDA DO MUNDO — remove do vendedor de vez, senão o jogador voltava e dava pra revender
      // infinitamente (o caixa já andou no cliente via game_seats.budget). Ver #1 do playtest.
      const j = src.findIndex((x: any) => match(x, t)); if (j < 0) return;
      src.splice(j, 1);
      if (src.length) S.clubOverall[t.from] = Math.round(src.reduce((s: number, x: any) => s + x.f, 0) / src.length);
      return;
    }
    if (dst.some((x: any) => match(x, t))) return;                // já aplicada
    const i = src.findIndex((x: any) => match(x, t)); if (i < 0) return; // não está mais no vendedor
    const p = src.splice(i, 1)[0];
    if (t.contract) p.contract = t.contract; else delete p.contract;
    dst.push(p);
    if (fee > 0) {
      S.budgets = S.budgets || {};
      if (!isHuman(t.from)) S.budgets[t.from] = Math.round((S.budgets[t.from] || 0) + fee); // vendedor CPU recebe
      if (!isHuman(t.to))   S.budgets[t.to]   = Math.round((S.budgets[t.to]   || 0) - fee); // comprador CPU paga
    }
    [t.from, t.to].forEach((cid: string) => { const sq = S.squads[cid]; if (sq && sq.length) S.clubOverall[cid] = Math.round(sq.reduce((s: number, x: any) => s + x.f, 0) / sq.length); });
  });
}
/* ===== PROPOSTAS RECEBIDAS (S.incomingOffersByClub) =====
   Espelho de generateIncomingOffers/pruneIncomingOffers/sendHumanOffer (core.js). PRECISA morar
   aqui: o servidor é o único produtor do shared_state, então proposta criada no cliente era
   apagada no adopt seguinte. Consequência no ar: na Resenha NENHUM humano recebia proposta da
   CPU (o e-mail simplesmente não chegava), e proposta de um humano pro clube de outro nunca
   saía do aparelho de quem mandou. ===== */
const TRANSFER_WINDOWS = [[0, 9], [20, 29]];
/* pré-janela DESLIGADA no cliente (ver inPreWindow/canNegotiate em core.js) — aqui tem que
   valer a mesma regra, senão o servidor geraria proposta numa rodada em que o usuário não
   consegue negociar nada. */
function canNegotiateR(round: number) { return TRANSFER_WINDOWS.some(([lo, hi]) => round >= lo && round <= hi); }
function pruneIncomingOffers(S: any) {
  S.incomingOffersByClub = S.incomingOffersByClub || {};
  Object.keys(S.incomingOffersByClub).forEach((cid) => {
    const sq = (S.squads && S.squads[cid]) || [];
    // validade + FONTE ÚNICA (o elenco): proposta por jogador que já saiu do clube não sobrevive
    // no estado autoritativo — senão voltava pro cliente a cada adopt (ver offersForClub no core).
    S.incomingOffersByClub[cid] = (S.incomingOffersByClub[cid] || [])
      .filter((o: any) => o && o.expiresRound > S.round && sq.some((p: any) => p && p.n === o.playerName));
  });
}
/* propostas que um humano mandou pro clube de OUTRO humano, publicadas em last_result.offers.
   Idempotente por id — o cliente reenvia até ver a proposta no estado autoritativo. */
function applyHumanOffers(S: any, offers: any[]) {
  if (!offers || !offers.length) return;
  S.incomingOffersByClub = S.incomingOffersByClub || {};
  offers.forEach((o: any) => {
    if (!o || !o.to || !o.id) return;
    const fila = S.incomingOffersByClub[o.to] = S.incomingOffersByClub[o.to] || [];
    if (fila.some((x: any) => x && x.id === o.id)) return;
    const { to, ...oferta } = o;
    fila.push(oferta);
  });
}
/* CONTRAPROPOSTAS (vendedor humano -> comprador humano), publicadas em last_result.counters.
   Mesmo desenho das propostas: idempotente por id, e some quando expira ou quando o jogador
   não está mais no elenco de quem pediu. */
function applyHumanCounters(S: any, counters: any[]) {
  if (!counters || !counters.length) return;
  S.counterOffersByClub = S.counterOffersByClub || {};
  counters.forEach((c: any) => {
    if (!c || !c.to || !c.id) return;
    const fila = S.counterOffersByClub[c.to] = S.counterOffersByClub[c.to] || [];
    if (fila.some((x: any) => x && x.id === c.id)) return;
    const { to, ...contra } = c;
    fila.push(contra);
  });
}
/* BAIXAS de proposta (aceita/recusada/contraposta no cliente de quem recebeu). Sem isto o
   estado autoritativo seguia com a proposta e ela voltava pro cliente no adopt seguinte —
   inclusive travando o aceite de uma contraproposta ("já existe proposta pendente"). */
function applyHumanOfferDrops(S: any, drops: any[]) {
  if (!drops || !drops.length) return;
  S.incomingOffersByClub = S.incomingOffersByClub || {};
  drops.forEach((d: any) => {
    if (!d || !d.club || d.id == null) return;
    const fila = S.incomingOffersByClub[d.club]; if (!Array.isArray(fila)) return;
    S.incomingOffersByClub[d.club] = fila.filter((o: any) => !o || o.id !== d.id);
  });
}
function pruneCounterOffers(S: any) {
  S.counterOffersByClub = S.counterOffersByClub || {};
  Object.keys(S.counterOffersByClub).forEach((cid) => {
    S.counterOffersByClub[cid] = (S.counterOffersByClub[cid] || []).filter((c: any) => {
      if (!c || c.expiresRound <= S.round) return false;
      const sq = (S.squads && S.squads[c.sellerId]) || [];
      return sq.some((p: any) => p && p.n === c.playerName);
    });
  });
}
function isHotP(p: any) { const st = p && p.stats; if (!st || !st.r3 || st.r3.length < 3) return false;
  return (st.g3 || []).reduce((a: number, b: number) => a + b, 0) >= 1 || st.r3.every((x: number) => x > 8); }
/* QUEM PODE COMPRAR ESTE JOGADOR — espelho de clubWouldSign (core.js). O gate antigo era só
   `overall do clube >= força do jogador - 12`, e como o sorteio do comprador aqui varre TODOS os
   clubes de S.squads (as 4 divisões inteiras + adversários de copa), qualquer clube da Série A
   passava no teste pra qualquer jogador de Série D — daí o usuário da Série D receber proposta de
   clube da elite quase toda janela. Agora vale a faixa nos dois sentidos (~1 divisão pra cada
   lado), preservando o caso legítimo: o craque da Série D (força bem acima da média da divisão)
   continua sendo cobiçado por clube grande. */
const SIGN_BELOW = 10, SIGN_ABOVE = 12;
function clubWouldSign(clubOverall: number, playerF: number) {
  const ov = (typeof clubOverall === 'number' && isFinite(clubOverall)) ? clubOverall : 70;
  const f = (typeof playerF === 'number' && isFinite(playerF)) ? playerF : 40;
  return f >= ov - SIGN_BELOW && ov >= f - SIGN_ABOVE;
}
/* PISO DE ELENCO (goleiro) — espelho de canReleaseFromSquad (core.js): não gera proposta por um
   jogador cuja saída deixaria o clube abaixo do mínimo da posição, porque o cliente vai recusar
   a venda de qualquer jeito. */
const SQUAD_FLOOR_R: any = { GK: 2 };
function canReleaseFromSquadR(sq: any[], p: any) {
  const min = SQUAD_FLOOR_R[(p && p.s) || '']; if (!min) return true;
  return (sq || []).filter((x: any) => x && x.s === p.s).length > min;
}
/* CPU faz proposta pelos jogadores dos clubes HUMANOS (mesma regra do core.js: no máx. 4
   pendentes, ~50% de chance por rodada de janela, mira os melhores do elenco, comprador de
   nível compatível, taxa 1.0-1.7x o valor de mercado). */
function generateIncomingOffers(S: any, humanClubs: Set<string>) {
  pruneIncomingOffers(S);
  if (!canNegotiateR(S.round)) return;
  const R = ME.makeRng(ME.hashSeed(S.seed, S.round, 'incoming'));
  S.incomingOffersByClub = S.incomingOffersByClub || {};
  const todosClubes = Object.keys(S.squads || {});
  humanClubs.forEach((myClubId) => {
    const myOffers = S.incomingOffersByClub[myClubId] = S.incomingOffersByClub[myClubId] || [];
    if (myOffers.length >= 4) return;
    if (R.random() > 0.5) return;
    const mySquad = S.squads[myClubId] || []; if (mySquad.length <= 16) return;
    const pending = new Set(myOffers.map((o: any) => o.playerName));
    const targets = mySquad.filter((p: any) => !pending.has(p.n) && !p._pendingSale && canReleaseFromSquadR(mySquad, p))
      .sort((a: any, b: any) => b.f - a.f).slice(0, Math.max(3, Math.ceil(mySquad.length * 0.4)));
    if (!targets.length) return;
    const p = targets[Math.floor(R.random() * targets.length)];
    const eligible = todosClubes.filter((id) => id !== myClubId && clubWouldSign((S.clubOverall || {})[id] || 70, p.f));
    if (!eligible.length) return;
    const buyerId = eligible[Math.floor(R.random() * eligible.length)];
    const fee = Math.round((p.mv || 1e6) * (1.0 + R.random() * 0.7));
    const maxFee = Math.round(fee * (1.15 + (isHotP(p) ? 0.2 : 0) + R.random() * 0.15));
    myOffers.push({ id: (ME.hashSeed(S.seed, S.round, p.n, buyerId, myClubId) >>> 0),
      buyerId, buyerName: (S.clubShort || {})[buyerId] || buyerId, buyerCountry: null,
      playerName: p.n, playerForce: p.f, fee, maxFee, negRound: 0, lastMsg: null, expiresRound: S.round + 3 });
  });
}
/* MORAL da coletiva de imprensa (sala de imprensa de fim de temporada): delta por clube
   humano, publicado em last_result.morale. Aplicado UMA vez, na rodada em que chega —
   depois o cliente zera o pendente. Limitado a ±15 por segurança. */
function applyHumanMorale(S: any, moraleByClub: any) {
  Object.keys(moraleByClub || {}).forEach((cid: string) => {
    const d = Math.max(-15, Math.min(15, Number(moraleByClub[cid]) || 0));
    const sq = S.squads[cid]; if (!d || !Array.isArray(sq)) return;
    sq.forEach((p: any) => { p.moral = clampN((p.moral != null ? p.moral : 70) + d, 0, 100); });
  });
}
/* ===== MERCADO E CAIXA DA CPU NO SERVIDOR =====
   A REGRA está em world-rules.js (injetada acima pelo sync) — aqui só entram os DADOS que o
   servidor tem. Antes isto não existia: cpuBackgroundTransfers só rodava no playRound do cliente,
   e como o cliente não comita mais rodada na Resenha, os elencos da CPU ficavam parados a
   temporada inteira e o caixa dos rivais só mexia na virada de temporada. */
function cpuClubIdsForMarket(S: any, humans: Set<string>) {
  const ids: string[] = [];
  Object.keys(S.squads || {}).forEach((id) => {
    if (humans.has(id)) return;                       // clube de humano tem dono: não é mercado de CPU
    if (!S.budgets || S.budgets[id] == null) return;  // sem caixa no mundo, fica de fora
    ids.push(id);
  });
  return ids;
}
function cpuMarketRound(S: any, humans: Set<string>) {
  if (!canNegotiateR(S.round)) return;               // mesma janela do humano
  const ids = cpuClubIdsForMarket(S, humans);
  if (ids.length < 2) return;
  const R = ME.makeRng(ME.hashSeed(S.seed, S.round, "cpumkt"));
  const feitas = WR.cpuMarket(S, R, {
    clubes: ids.map((id: string) => ({ id })),
    // piso de elenco e goleiro: o servidor não tem canReleaseFromSquad, então aplica a mesma
    // intenção — nunca deixar um clube sem goleiro (era assim que a CPU ficava sem GK ao longo
    // de várias temporadas) nem abaixo do piso, que o próprio WR.cpuMarket já garante.
    podeSair: (clubId: string, p: any) => {
      if (p.s !== "GK") return true;
      return ((S.squads[clubId] || []).filter((x: any) => x.s === "GK").length) > 1;
    },
    valor: (p: any) => p.mv || 1e6,
    n: 2 + Math.floor(R.random() * 3),
  });
  if (!feitas.length) return;
  S.roundNews = S.roundNews || [];
  feitas.forEach((t: any) => {
    S.roundNews.push(`🔄 ${t.player} foi negociado do ${t.from} pro ${t.to} por ${t.fee}.`);
  });
}
/* CRESCIMENTO DO ESTÁDIO DA CPU NO SERVIDOR — regra em world-rules (WR.cpuCrescerEstadio); aqui
   só os três limites, que são os MESMOS números do cliente (main.js): bancada de 5.000 lugares,
   cota de 10.000 por temporada, custo escalando com o tamanho atual e teto por porte do clube.
   Antes isto era exclusivo do solo, com uma trava explícita: na Resenha cada cliente calcularia um
   crescimento diferente e os estádios divergiriam entre os jogadores. Agora o número é um só. */
const STAND_SEATS_S = 5000, STAND_PRICE_S = 4000000, STAND_START_S = 20000, SEASON_BUILD_LIMIT_S = 10000;
function standCostS(cap: number) { return Math.round(STAND_PRICE_S * (0.7 + (cap || STAND_START_S) / 50000)); }
function stadiumMaxCapS(ov: number, cur: number) {
  const byLevel = rbStadiumCap(ov || 30) + 15000;
  return Math.round(Math.max(cur || STAND_START_S, Math.min(90000, byLevel)) / 1000) * 1000;
}
function cpuStadiumGrowth(S: any, humans: Set<string>) {
  const feitas = WR.cpuCrescerEstadio(S, {
    humanos: humans,
    overall: (id: string) => (S.clubOverall && S.clubOverall[id] != null) ? S.clubOverall[id] : null,
    custo: standCostS,
    teto: stadiumMaxCapS,
    capInicial: (_id: string, ov: number) => rbStadiumCap(ov),
    lugares: STAND_SEATS_S,
    cota: SEASON_BUILD_LIMIT_S,
  });
  if (!feitas || !feitas.length) return;
  S.roundNews = S.roundNews || [];
  feitas.forEach((o: any) => { S.roundNews.push(`🏟️ ${o.club} ampliou o estádio: ${o.de} → ${o.para} lugares.`); });
}
function cpuRoundCash(S: any, humans: Set<string>) {
  WR.cpuCaixaRodada(S, {
    humanos: humans,
    renda: rbIncome,
    folha: (p: any) => (p.contract && p.contract.salary) || rbWage(p.f),
    capacidade: rbStadiumCap,
    overall: (id: string) => (S.clubOverall && S.clubOverall[id] != null) ? S.clubOverall[id] : null,
    OPEX,
  });
}
/* ===== A PIRAMIDE DE UM PAIS, RESOLVIDA =====
   Extraido de resolveLeagueRound sem mudar uma virgula do que faz: e o passo 3 (as partidas da
   divisao do jogador e o que elas escrevem na tabela). O que muda e de ONDE vem a tabela e o
   calendario -- do MUNDO daquele pais, nao de S.

   PORQUE ISTO EXISTE. Num mundo com humanos em paises diferentes, cada pais tem a sua piramide e
   as partidas dele TEM de acontecer de verdade: a regra do espectador manda o treinador assistir
   a tudo do pais dele, e nao da para assistir ao que foi resolvido por uma simulacao de fundo.
   Com um pais vivo so -- que e toda sala existente -- o comportamento e identico ao de antes:
   o mundo da ancora E o proprio S.

   O que e do JOGO INTEIRO continua em S e continua partilhado: elencos, caixa, propostas. Um
   jogador transferido do Fluminense para o Chelsea e o mesmo objeto nos dois mundos -- e por isso
   que `squads` nunca entra no mundo. */
function resolverPiramideDoPais(S: any, M: any, ctx: any) {
  const round = ctx.round, seed = ctx.seed;
  const humanResultByFx = ctx.humanResultByFx, humanClubs = ctx.humanClubs;
  const humanXI = ctx.humanXI, humanTactic = ctx.humanTactic, preMatches = ctx.preMatches;
  const rateR = ctx.rateR, capsByClub = ctx.capsByClub, minsByClub = ctx.minsByClub;
  /* AS COPAS DESTE PAIS, ANTES DAS PARTIDAS DELE -- mesma ordem da ancora (copa na quarta, liga
     no fim de semana). Enquanto isto rodava so na ancora, a Champions do treinador ingles nunca
     avancava: ele veria a liga andar e a copa dele parada para sempre. */
  if (ctx.avancarCopas) advancePendingCups(S, ctx.cupResultByFx || {}, humanClubs, M);
  const fixtures = (M.sched && M.sched[round]) || [];
  fixtures.forEach((fx: any) => {                                 // 3) resultados: humano=submetido, CPU=motor
    const h = fx[0], a = fx[1]; if (h == null || a == null) return; const k = h + "-" + a;
    let hg: number, ag: number, scorers: any[]; let perf: any = null;
    const sub = humanResultByFx[k];
    // FASE 2: precedência resultado submetido (humano jogou ao vivo) > stream pré-computado do
    // apito (round_events — o que TODOS assistiram na tela ao vivo) > simular agora (fallback).
    // Consumir o pré-computado importa porque transferências/moral de humanos são aplicadas ACIMA,
    // mutando elencos DEPOIS do apito — re-simular aqui gravaria um placar diferente do assistido.
    const pc = (!sub && preMatches) ? preMatches[k] : null;
    /* SÚMULA DE MINUTOS da partida. Numa partida humana quem tem essa informação é o CLIENTE
       (é ele que roda a sessão ao vivo, com as substituições), então ela viaja no last_result;
       nas de CPU, o próprio motor devolve (expulsão e lesão já entram). Sem ela, cai no XI
       inteiro — que é o que o servidor fazia até 2026-08-06 pra todo mundo. */
    let caps: any = null, matchMinutes = 90;
    if (sub) { hg = sub.hg; ag = sub.ag; scorers = sub.scorers || []; perf = sub.perf || null; caps = sub.caps || null; matchMinutes = sub.matchMinutes || 90; }
    else if (pc) { hg = pc.hg; ag = pc.ag; scorers = pc.scorers || []; perf = pc.perf || null; caps = pc.caps || null; matchMinutes = pc.matchMinutes || 90; }
    else {
      const mseed = ME.hashSeed(seed, round, h, a);
      const res = ME.simMatchPure(h, a, sideInputs(S, h, humanClubs.has(h), humanXI, humanTactic), sideInputs(S, a, humanClubs.has(a), humanXI, humanTactic), mseed, {});
      hg = res.hg; ag = res.ag; scorers = res.scorers || []; perf = res.perf || null; caps = res.caps || null; matchMinutes = res.matchMinutes || 90;
    }
    capsByClub[h] = (caps && caps.H) || null; capsByClub[a] = (caps && caps.A) || null;
    minsByClub[h] = matchMinutes; minsByClub[a] = matchMinutes;
    applyResultT(M.table, h, a, hg, ag); recordScorers(S, scorers, (M.division || S.division));
    // 3b) súmula: nota + JOGO/gol/clean sheet de quem entrou em campo, dos dois lados (ver ratePlayersS)
    const xiH = S.squads[h] ? ME.resolveXI(S.squads[h], humanClubs.has(h) ? (humanXI[h] || ME.autoXINames(S.squads[h])) : null) : null;
    const xiA = S.squads[a] ? ME.resolveXI(S.squads[a], humanClubs.has(a) ? (humanXI[a] || ME.autoXINames(S.squads[a])) : null) : null;
    // quem entrou do banco não está no XI resolvido — junta o elenco pra súmula achar todo mundo
    const poolH = S.squads[h] || xiH, poolA = S.squads[a] || xiA;
    ratePlayersS(S, h, capsByClub[h] ? poolH : xiH, hg, ag, scorers, rateR, perf && perf.H, perf && perf.A, capsByClub[h], matchMinutes);
    ratePlayersS(S, a, capsByClub[a] ? poolA : xiA, ag, hg, scorers, rateR, perf && perf.A, perf && perf.H, capsByClub[a], matchMinutes);
    // 3c) moral pós-jogo — só clube humano (mesmo alcance do solo, ver postMatchMoraleS)
    if (humanClubs.has(h)) postMatchMoraleS(S, h, capsByClub[h] ? poolH : xiH, hg, ag, scorers, capsByClub[h], matchMinutes);
    if (humanClubs.has(a)) postMatchMoraleS(S, a, capsByClub[a] ? poolA : xiA, ag, hg, scorers, capsByClub[a], matchMinutes);
    S.results.push({ round: round, h: h, a: a, hg: hg, ag: ag, scorers: scorers, pais: M.pais });
  });
  /* AS DIVISOES DE BAIXO DESTE PAIS. Rodava uma vez so, sobre a ancora -- a Championship ficava
     parada enquanto a Premier jogava, e so se daria por isso na virada de temporada, quando ela
     subisse e descesse clubes com uma tabela de zeros. */
  advanceOtherDivs(S, humanResultByFx, humanClubs, humanXI, humanTactic, preMatches, M);
}

function resolveLeagueRound(S: any, humanResultByFx: any, humanClubs: Set<string>, humanXI: any, humanTactic: any, cupResultByFx: any, humanTransfers?: any[], moraleByClub?: any, humanOffers?: any[], humanCounters?: any[], humanOfferDrops?: any[], preMatches?: any) {
  const seed = S.seed, round = S.round;
  applyHumanTransfers(S, humanTransfers || [], humanClubs);       // 0) contratações/vendas do humano ANTES de escalar/jogar
  applyHumanOffers(S, humanOffers || []);                         // 0c) propostas humano->humano publicadas nos assentos
  applyHumanCounters(S, humanCounters || []);                     // 0d) contrapropostas (vendedor -> comprador)
  applyHumanOfferDrops(S, humanOfferDrops || []);                 // 0e) baixas: proposta aceita/recusada/contraposta some do mundo
  // 0f) COPA ANTES DA LIGA, NA MESMA SEMANA — porte fiel do core.js (ver playRound). Isto rodava
  //     depois do S.round++, então a copa da semana N era resolvida junto da rodada de liga da
  //     semana N-1 e o tique ficava numerado uma semana à frente de onde a partida era jogada.
  //     Agora avança aqui, com a semana CORRENTE, antes das partidas de liga. Cliente e servidor
  //     precisam concordar nesta ordem: é ela que decide qual rodada de copa pertence a qual semana.
  //     SEMANA EM DOIS ESTÁGIOS: a quarta tem resolução própria, então aqui as copas normalmente já
  //     foram avançadas e este passo vira no-op. A condição é "a quarta NÃO rodou", não "não existe
  //     estágio": roundStage==='cup' significa que a quarta ficou pendente (cliente antigo, valve de
  //     segurança do cliente, host que caiu antes de fechá-la) — nesse caso a liga avança as copas
  //     igual sempre, e a semana se resolve de qualquer jeito. É o que impede a divisão em dois
  //     estágios de virar um caminho onde a copa simplesmente não acontece.
  /* AS COPAS PASSARAM A SER POR PAIS (ver resolverPiramideDoPais). Aqui fica so a DECISAO de se
     elas avancam nesta chamada -- a mesma de sempre: a quarta dedicada ja as avancou, ou nao. */
  const avancarCopas = (S.roundStage == null || S.roundStage === 'cup');
  applyHumanMorale(S, moraleByClub || {});                        // 0b) efeito da coletiva na moral do elenco
  const fixtures = (S.sched[round] || []);
  advancePlayerAvailability(S);                                   // 1) cumpre suspensões/lesões
  const humanEvents: any[] = [];                                  // F3.1: incidentes de TODAS as partidas humanas (qualquer divisão), não só a principal
  Object.keys(humanResultByFx).forEach((k: string) => { humanEvents.push(...((humanResultByFx[k] || {}).events || [])); });
  applyMatchIncidents(S, humanEvents);                            // 2) incidentes NOVOS (só partidas humanas jogadas ao vivo)
  const rateR = ME.makeRng(ME.hashSeed(seed, round, "rate"));     // RNG única das notas da rodada (determinística)
  // súmula da rodada por clube: quem entrou em campo e por quantos minutos (uma partida por
  // clube por rodada). Alimenta nota, moral, energia e o "jogou" da evolução.
  const capsByClub: Record<string, any> = {}, minsByClub: Record<string, number> = {};
  /* ===== UM MUNDO POR PAIS VIVO =====
     `paisesVivos(S)` da os paises que existem por inteiro. O da ANCORA e o proprio S (a piramide
     que sempre esteve aqui); os outros vivem em `S.mundos[pais]`, com a mesma forma
     {division, sched, table, otherDivs}. Enquanto ninguem cria S.mundos -- que e o caso de toda
     sala existente -- este laco da exatamente uma volta, no proprio S, e o resultado e
     byte-identico ao de antes. E essa a rede: a capacidade de iterar entra agora, sem mexer no
     que ja esta no ar. */
  const ctxPais = { round, seed, humanResultByFx, humanClubs, humanXI, humanTactic, preMatches, rateR, capsByClub, minsByClub, avancarCopas, cupResultByFx };
  const ancora = WORLD_CONFIG.uniDoEstado(S);
  WORLD_CONFIG.paisesVivos(S).forEach((pais: string) => {
    if (pais === ancora) { resolverPiramideDoPais(S, { pais, sched: S.sched, table: S.table, division: S.division, otherDivs: S.otherDivs, cups: S.cups, cupCalendar: S.cupCalendar }, ctxPais); return; }
    const m = S.mundos && S.mundos[pais];
    if (!m || !m.sched) { console.warn('pais vivo sem mundo proprio (' + pais + '): roda como fundo nesta rodada'); return; }
    /* ATENCAO ao proximo passo: aqui resolve-se a DIVISAO DE TOPO deste pais. As outras divisoes
       dele ainda nao andam -- `advanceOtherDivs` roda uma vez so, sobre a ancora (passo 4c). Quem
       for ligar o segundo mundo tem de tratar disso, senao a Championship fica parada enquanto a
       Premier joga, e ninguem repara ate a virada de temporada. */
    resolverPiramideDoPais(S, Object.assign({ pais }, m), ctxPais);
  });
  const Rr = ME.makeRng(ME.hashSeed(seed, round, "post"));        // 4) energia/moral
  for (const cid in S.squads) for (const p of S.squads[cid]) { p.energy = clampN((p.energy || 100) + Rr.rnd(6, 16), 0, 100); p.moral = clampN((p.moral || 70) + (70 - (p.moral || 70)) * 0.08, 0, 100); }
  // CANSAÇO proporcional aos minutos em campo (quem saiu no intervalo gasta metade)
  humanClubs.forEach((cid) => {
    const base = capsByClub[cid] ? (S.squads[cid] || []) : ME.resolveXI(S.squads[cid], humanXI[cid] || ME.autoXINames(S.squads[cid]));
    const total = minsByClub[cid] || 90;
    capsListS(base, capsByClub[cid], total).forEach((x: any) => {
      const share = clampN((x.mins || total) / total, 0, 1);
      x.p.energy = clampN(x.p.energy - Rr.rnd(12, 22) * share, 20, 100);
    });
  });
  advanceDevelopment(S, humanClubs, humanXI, capsByClub);        // 4b) evolução/declínio dos jogadores
  // 4c) as outras divisões passaram a ser resolvidas DENTRO do passo de cada país
  S.round++; S.week = (S.week || 1) + 1; S.day = (S.day || 1) + 7; // 5) avança a rodada
  cpuRoundCash(S, humanClubs);                                    // 6) caixa dos rivais anda TODA rodada (ver WR.cpuCaixaRodada)
  cpuMarketRound(S, humanClubs);                                  // 6a) mercado entre clubes da CPU (ver WR.cpuMarket)
  pruneIncomingOffers(S); pruneCounterOffers(S);                  // 6b) limpa proposta/contraproposta vencida ou por jogador que já saiu
  generateIncomingOffers(S, humanClubs);                          // 6c) CPU faz propostas pelos jogadores dos humanos (chega como e-mail no cliente)
  S._roundIncidents = {};
  // 7) fim de temporada? liga terminou -> virada (promoção/rebaixamento + regen + nova temporada)
  /* A TEMPORADA ESPERA AS FINAIS (mesma regra do cliente, ver prorrogarSeFaltaCopa em core.js).
     Se a liga acabou mas alguma copa ficou devendo rodada, a temporada ganha jornadas extras em
     vez de virar por cima da final. Não é trava: estourado o teto, a temporada vira assim mesmo,
     com aviso — jogo parado é pior que final perdida. Os dias dessas jornadas entram no plano
     junto com a gravação do estado, senão o ponteiro chegaria ao fim do plano com a temporada
     ainda correndo (foi exatamente assim que a final da Copa do Brasil ficou sem dia). */
  if (Array.isArray(S.sched) && S.round >= S.sched.length) {
    /* MESMA CONTA DO CLIENTE (ver cupRodadasQueFaltam/copasPendentes em core.js). A antiga era
       `total da competição − vagas no calendário`, com as vagas contadas desde o começo da
       temporada — ou seja, contava também as JÁ GASTAS. Uma copa que perdeu tiques pelo caminho
       chegava ao fim devendo a FINAL com o calendário aparentemente cheio: `faltam` dava 0/1, a
       prorrogação não criava dia nenhum e a temporada virava sem campeão, sem final e sem
       cerimônia. Agora conta as rodadas que ainda NÃO foram jogadas e desconta só os dias
       marcados DAQUI PARA A FRENTE. */
    const agora = S.round || 0;
    const pendentes = Object.keys(S.cups || {}).map((key) => {
      const c = S.cups[key]; if (!c) return null;
      const b = (c.champion !== undefined) ? c : c.bracket;
      let faltam = 0;
      if (b) {
        if (cupIsFinished(b)) return null;
        if (!((b.ties || []).length)) return null;   // mata-mata emperrado não é dívida (ver core.js)
        faltam = Math.max(1, (b.roundsTotal || 0) - (b.round || 0));
      } else if (c.group) {
        const faltamGrupo = Math.max(0, (c.group.roundsTotal || 0) - (c.group.round || 0));
        const nG = Object.keys(c.group.groups || {}).length, adv = c.group.advancePerGroup || 2;
        const ko = Math.max(1, Math.ceil(Math.log2(Math.max(2, nG * adv))));
        faltam = faltamGrupo + 1 + ko;
      } else faltam = 1;
      const marcadas = (((S.cupCalendar && S.cupCalendar[key]) || []) as number[]).filter((j) => j >= agora).length;
      return { key, faltam, marcadas, criar: Math.max(0, faltam - marcadas) };
    }).filter(Boolean) as any[];
    const antes = S.sched.length;
    const extras = pendentes.length ? WR.prorrogarPorCopasPendentes(S, pendentes, 24) : 0;
    if (extras) {
      console.log('temporada prorrogada: faltava ' + pendentes.map((p: any) => p.key).join(', '));
      /* Os dias extras saem do CALENDÁRIO, não de um contador. `extras` passou a somar também os
         tiques marcados em jornadas que já existiam (a liga só precisou esticar), então usá-lo
         como "quantas jornadas novas" inventava dias que não existem e perdia os que existem. */
      for (let jornada = antes; jornada < S.sched.length; jornada++) {
        const key = Object.keys(S.cupCalendar || {}).find((k) => k !== '_season' && (S.cupCalendar[k] || []).includes(jornada));
        if (key) S._diasExtras = (S._diasExtras || []).concat([{ r: jornada, comp: key, idx: (S.cupCalendar[key] || []).indexOf(jornada) }]);
      }
    } else {
      if (pendentes.length) console.warn('temporada encerrada com competição por decidir: ' + pendentes.map((p: any) => p.key).join(', '));
      resolveSeasonTurnover(S, new Set(humanClubs));
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "não autenticado" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { db: { schema: "elifoot_v3" }, global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "sessão inválida" }, 401);

    const body = await req.json();
    const gameId = body?.gameId; const expectedRound = body?.round;
    // ESTÁGIO DA SEMANA. 'cup' resolve SÓ a quarta-feira (avança as copas e para); 'league'/ausente
    // resolve o sábado, que é a rodada completa como sempre foi. Um estado sem S.roundStage (save
    // de antes desta versão) é tratado como semana de um estágio só — nada muda pra ele.
    const wantStage = (body?.stage === 'cup') ? 'cup' : 'league';
    if (!gameId) return json({ error: "gameId ausente" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { db: { schema: "elifoot_v3" } });
    // só membro da sala (tem assento OU é host) pode disparar
    const { data: seat } = await admin.from("game_seats").select("user_id").eq("game_id", gameId).eq("user_id", user.id).maybeSingle();
    const { data: gameHost } = await admin.from("games").select("host_id, shared_state, state_version, round, kickoff_lineups, day_plan").eq("id", gameId).maybeSingle();
    if (!gameHost) return json({ error: "sala não encontrada" }, 404);
    if (!seat && gameHost.host_id !== user.id) return json({ error: "não é membro da sala" }, 403);

    const stateObj = gameHost.shared_state;
    if (!stateObj || !stateObj.S) return json({ error: "sem estado salvo ainda" }, 409);
    const S = stateObj.S; const curVer = gameHost.state_version || 0;
    /* O PAIS DA SALA MANDA, a partir daqui. Sala criada antes disto nao tem `intlUniverse` no
       estado e cai em 'brasil' — que e o que ela e. Tem de vir ANTES de qualquer coisa que leia
       DIV_ORDER, forca de divisao ou premiacao. */
    aplicarUniverso(S);
    // resgata pro archive a temporada fechada antes do archive existir (idempotente; ver backfillArchiveT)
    backfillArchiveT(S);
    // idempotência: se a rodada esperada não é a atual, alguém já resolveu -> devolve o estado atual
    if (expectedRound != null && S.round !== expectedRound) return json({ ok: true, already: true, round: S.round, version: curVer });
    // IDEMPOTÊNCIA POR ESTÁGIO: se a quarta já foi resolvida (roundStage já virou 'league'), um
    // segundo pedido de 'cup' não pode avançar as copas de novo. Vale o mesmo padrão do
    // expectedRound: devolve o estado atual em vez de refazer.
    if (wantStage === 'cup' && S.roundStage !== 'cup') {
      return json({ ok: true, already: true, round: S.round, stage: S.roundStage || 'league', version: curVer });
    }

    const round = S.round;
    const { data: seats } = await admin.from("game_seats").select("user_id, club_id, last_xi, last_tactic, last_result, last_result_round, last_cup_result, last_cup_round, budget, stadium").eq("game_id", gameId);
    const humanClubs = new Set<string>(); const humanXI: any = {}; const humanTactic: any = {}; const humanResultByFx: any = {}; const cupResultByFx: any = {}; const humanTransfers: any[] = []; const moraleByClub: any = {}; const humanOffers: any[] = []; const humanCounters: any[] = []; const humanOfferDrops: any[] = []; const trainingByClub: any = {};
    (seats || []).forEach((s: any) => {
      if (!s.user_id || !s.club_id) return; humanClubs.add(s.club_id);
      if (s.last_xi) humanXI[s.club_id] = s.last_xi; if (s.last_tactic) humanTactic[s.club_id] = s.last_tactic;
      if (s.budget != null) { S.budgets = S.budgets || {}; S.budgets[s.club_id] = Number(s.budget); } // F3.3: caixa por-humano no mundo
      if (s.stadium) { S.clubStadiumCap = S.clubStadiumCap || {}; S.clubStadiumCap[s.club_id] = s.stadium; } // estádio por-humano no mundo (mesmo mecanismo do caixa acima)
      const r = s.last_result;
      if (r && s.last_result_round === round && r.h && r.a) { const k = r.h + "-" + r.a; if (!humanResultByFx[k] || s.club_id === r.h) humanResultByFx[k] = { hg: r.hg, ag: r.ag, scorers: r.scorers || [], events: r.events || [], perf: r.perf || null }; }
      // trocas de elenco publicadas por este humano (compra/venda) — aplicadas no mundo antes da rodada
      if (r && s.last_result_round === round && Array.isArray(r.transfers) && r.transfers.length) humanTransfers.push(...r.transfers);
      // propostas que este humano mandou pro clube de outro humano (ver sendHumanOffer no cliente)
      if (r && s.last_result_round === round && Array.isArray(r.offers) && r.offers.length) humanOffers.push(...r.offers);
      if (r && s.last_result_round === round && Array.isArray(r.counters) && r.counters.length) humanCounters.push(...r.counters);
      if (r && s.last_result_round === round && Array.isArray(r.offerDrops) && r.offerDrops.length) humanOfferDrops.push(...r.offerDrops);
      if (r && s.last_result_round === round && r.morale) moraleByClub[s.club_id] = Number(r.morale) || 0;
      // TREINO ESPECIAL: pids que este humano pôs em treino (ver netPublishResult). Chega toda
      // rodada — é estado corrente, não evento, então sobrescreve em vez de acumular.
      if (r && s.last_result_round === round && Array.isArray(r.training)) trainingByClub[s.club_id] = r.training;
      // resultados de COPA submetidos pra ESTA rodada (aplicados na chave; mandante-autoritativo).
      // UM ASSENTO PODE TER JOGADO MAIS DE UMA COPA NA MESMA JORNADA — o calendário oficial põe
      // Libertadores, Sul-Americana e Copa do Brasil juntas. Antes só o campo do topo era lido, e
      // como o cliente sobrescrevia a coluna a cada publicação, ficava só a ÚLTIMA: a partida da
      // Copa do Brasil que o humano tinha acabado de ganhar ao vivo era re-simulada aqui e ele
      // saía eliminado com outro placar. `results` (ver cupResultsList no cliente) traz uma
      // entrada por competição; um cliente antigo manda só o topo e continua funcionando.
      const cr = s.last_cup_result;
      if (cr && s.last_cup_round === round) {
        const entradas = Array.isArray(cr.results) && cr.results.length ? cr.results : [cr];
        entradas.forEach((e: any) => {
          // `winner` só existe no mata-mata; confronto de FASE DE GRUPOS (stage:'group') não tem —
          // sem esta exceção o resultado de grupo do humano era descartado e advanceGroupStageRoundS
          // re-simulava a partida que ele acabou de jogar ao vivo, trocando o placar que ele viu.
          if (!e || !e.h || !e.a || !(e.winner || e.stage === 'group')) return;
          const valor = { stage: e.stage || 'bracket', hg: e.hg, ag: e.ag, winner: e.winner || null, pens: e.pens || null, events: e.events || [], scorers: e.scorers || [], perf: e.perf || null, caps: e.caps || null, matchMinutes: e.matchMinutes || null };
          const fx = e.h + "-" + e.a;
          // chave COM competição é a que vale; a sem competição fica como reserva pro cliente antigo
          if (e.key) { const ck = e.key + "|" + fx; if (!cupResultByFx[ck] || s.club_id === e.h) cupResultByFx[ck] = valor; }
          if (!cupResultByFx[fx] || s.club_id === e.h) cupResultByFx[fx] = valor;
        });
      }
    });

    // FASE 1: snapshot do APITO (games.kickoff_lineups, carimbado na virada ready->running) tem
    // prioridade sobre o last_xi/last_tactic atual dos assentos — o servidor simula clube humano
    // ausente com EXATAMENTE os mesmos inputs que todos os clientes usaram na tela ao vivo
    // (o assento pode ter sido atualizado DEPOIS do apito; o snapshot é a foto oficial da rodada).
    const kickSnap = (gameHost as any).kickoff_lineups || null;
    if (kickSnap) Object.keys(kickSnap).forEach((cid: string) => {
      const e = kickSnap[cid] || {};
      if (!humanClubs.has(cid)) return;
      if (Array.isArray(e.xi) && e.xi.length) humanXI[cid] = e.xi;
      if (e.tactic) humanTactic[cid] = e.tactic;
    });

    // FASE 2: streams pré-computados do apito (kickoff-round -> round_events). É o que todos os
    // clientes assistiram; consumir aqui garante que o resultado GRAVADO é o assistido (sem isso,
    // as transferências/moral aplicadas acima mudariam a re-simulação). Ausente -> simula (fallback).
    const { data: preRow } = await admin.from("round_events").select("payload").eq("game_id", gameId).eq("round", round).maybeSingle();
    const preMatches = (preRow && preRow.payload && preRow.payload.matches) || null;

    applyTrainingFlags(S, trainingByClub);   // treino especial dos humanos -> p._training (ver evolvePlayer)
    if (wantStage === 'cup') {
      // QUARTA-FEIRA: resolve SÓ as copas da semana e para. Não toca em rodada, tabela, energia,
      // evolução, finanças nem virada de temporada — isso tudo é contabilidade do sábado. O
      // resultado ao vivo de cada humano já está gravado no confronto (cupResultByFx) e é pulado
      // aqui, igual sempre. Ao terminar, a semana passa pro estágio de liga.
      advancePendingCups(S, cupResultByFx || {}, humanClubs);
      S.roundStage = 'league';
    } else {
      resolveLeagueRound(S, humanResultByFx, humanClubs, humanXI, humanTactic, cupResultByFx, humanTransfers, moraleByClub, humanOffers, humanCounters, humanOfferDrops, preMatches);
      S.roundStage = nextRoundStage(S);   // a semana nova começa na quarta se tiver copa; senão, direto no sábado
    }
    stateObj.round = S.round;

    // dias das jornadas de prorrogação entram no plano na MESMA escrita do estado: um plano que
    // acabasse antes da temporada deixaria o ponteiro sem dia pra apontar.
    const patchJogo: any = { shared_state: stateObj, state_version: curVer + 1, round: S.round };
    if (S._diasExtras && S._diasExtras.length && gameHost.day_plan && gameHost.day_plan.length) {
      const ultimo = gameHost.day_plan[gameHost.day_plan.length - 1].dia || 0;
      patchJogo.day_plan = gameHost.day_plan.concat(S._diasExtras.map((d: any, i: number) => ({ ...d, dia: ultimo + 3 * (i + 1) })));
      delete S._diasExtras;
    }
    const { data: upd, error: upErr } = await admin.from("games").update(patchJogo).eq("id", gameId).eq("state_version", curVer).select("state_version");
    if (upErr) throw upErr;
    if (!upd || !upd.length) { // outro resolvedor ganhou a corrida — devolve o estado atual
      const { data: g2 } = await admin.from("games").select("state_version, round").eq("id", gameId).maybeSingle();
      return json({ ok: true, raced: true, round: g2?.round, version: g2?.state_version });
    }
    // higiene: streams de rodadas ANTERIORES à recém-resolvida já não servem pra ninguém
    // (a atual fica até a próxima resolução, pra retardatários ainda em replay)
    try { await admin.from("round_events").delete().eq("game_id", gameId).lt("round", round); } catch (_e) { /* best-effort */ }
    return json({ ok: true, round: S.round, version: curVer + 1 });
  } catch (e) { return json({ error: e instanceof Error ? e.message : String(e) }, 500); }
});
