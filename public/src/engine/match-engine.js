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

  /* ===== TÁTICA É TROCA, NÃO BOTÃO DE VITÓRIA (rebalance 21/08, ver simulate.js/arena) ===== */
  const TACTIC_BETA={retranca:-0.008, equilibrado:0, ofensivo:0.016};
  const TACTIC_EMPHASIS={ retranca:{OS:0.93,DS:1.20}, equilibrado:{OS:1,DS:1}, ofensivo:{OS:1.04,DS:0.80} };
  const ENG={rev:0.82, sd:0.33, danger:0.58, shot:0.28, conv:0.52, penaltyChance:0.025}; // era 0.055
  const ENG2={ alphaAtk:0.08, alphaMid:0.05, alphaMidCount:0.004, convDiff:0.004 }; // alphaMidCount era 0.018: fazia do 4-5-1 o meta silencioso
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
  /* espelho do de simulate.js, incluindo o `opts.humano` (ver la o porque) */
  function penaltyConvChance(taker, gk, opts){ if(!taker) return (opts&&opts.humano)?0.78:0.75;
    const base=0.76;
    const takerBonus=((taker.f||65)-70)/100*0.35;
    const posBonus = taker.s==='ATT'?0.05:taker.s==='MID'?0.02:taker.s==='DEF'?-0.02:-0.08;
    const gkPenalty = gk ? (((gk.f||65)-65)/100)*0.22 : 0;
    const moralAdj = ((taker.moral||70)-70)/100*0.12;
    const bruto=base+takerBonus+posBonus-gkPenalty+moralAdj;
    if(opts&&opts.humano) return clamp(bruto+(opts.canto!=null?0.06:0), 0.72, 0.95);
    return clamp(bruto, 0.42, 0.93); }

  /* ===== a PARTIDA (espelho fiel de simulateMatch/simEventsC) =====
     side H/A: { rat:{OS,MS,DS,mor}, xi:[{n,f,s,energy,moral,behavior}], tactic, cap, short }
     seed: uint32 já derivado (matchSeed). opts:{importance,extraTime}
     retorna { hg, ag, scorers:[{id,name,min}], events:[...], perf:{H,A} } */
  function simMatchPure(homeId, awayId, home, away, seed, opts){
    opts=opts||{};
    const R=makeRng((seed>>>0));
    const hp=home.xi||[], ap=away.xi||[];
    const emH=formationEmphasis(hp), emA=formationEmphasis(ap);
    const teH=TACTIC_EMPHASIS[home.tactic||'equilibrado']||TACTIC_EMPHASIS.equilibrado;
    const teA=TACTIC_EMPHASIS[away.tactic||'equilibrado']||TACTIC_EMPHASIS.equilibrado;
    const H={OS:home.rat.OS*emH.OS*teH.OS, MS:home.rat.MS*emH.MS, DS:home.rat.DS*emH.DS*teH.DS, mor:home.rat.mor};
    const A={OS:away.rat.OS*emA.OS*teA.OS, MS:away.rat.MS*emA.MS, DS:away.rat.DS*emA.DS*teA.DS, mor:away.rat.mor};
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
      const pool=atk.length?atk:players;
      const w=function(p){return p.f*attrFactor(p,['fin'],0.82,1.28);};
      let tot=pool.reduce(function(s,p){return s+w(p);},0), r=R.random()*tot;
      for(const p of pool){r-=w(p);if(r<=0)return p;} return pool[0]; }
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
  // goleiro: compressão leve (só 1 em campo — ver ratings() do cliente/rebalance.js)
  function engForceGK(f){ if(typeof f!=='number' || !isFinite(f)) return 40; return f<=49 ? f : 49 + (f-49)*0.59; }
  /* ===== ATRIBUTOS DE VERDADE NO RESULTADO (21/08) =====
     Até aqui p.attr (fin/pas/dri/... — ver genAttrs em index.html) só influenciava o jogo
     DEVAGAR, via evolvePlayer reescrevendo p.f a cada rodada; dentro da própria partida os
     atributos individuais nunca eram lidos — dois jogadores da MESMA força decidiam o
     resultado de forma idêntica. attrFactor lê o(s) atributo(s) relevante(s) do jogador
     RELATIVO ao seu próprio nível médio (não à força do time): um artilheiro nato (fin acima
     do seu nível) finaliza melhor que um "faz-tudo" da mesma força, um goleiro-reflexo
     (ref/mao acima do seu nível) defende mais que um goleiro-linha da mesma força. Clamp
     [lo,hi] mantém isso como TEMPERO, não substituto de f — ela ainda decide o grosso do jogo.
     Puramente numérico: nenhuma tela lê p.attr hoje (ver ATTR_LABEL/ATTR_GROUP, index.html) —
     é o dado pronto pra quando decidirmos mostrar isso ao usuário. */
  function forceToLevel(f){ return Math.max(1,Math.min(20,Math.round((f-45)/46*13+6))); }
  function attrFactor(p,keys,lo,hi,vies){
    const a=p&&p.attr; if(!a) return 1;
    let sv=0,n=0; for(const k of keys){ if(a[k]!=null){ sv+=a[k]; n++; } }
    if(!n) return 1;
    /* `vies` desconta a elevação que o perfil da posição já dá ao atributo em
       genAttrs — sem ele o fator nasceria ~1,04 para todo mundo (inflação, não
       diferenciação). Ver comentário longo em index.html. */
    const rel=sv/n, base=forceToLevel(p.rawF!=null?p.rawF:p.f)+(vies||0);
    return clamp(1+(rel-base)/22, lo, hi);
  }
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
    /* ATRIBUTOS DE LINHA NA NOTA DO SETOR (26/08) — mesmo padrão que o goleiro já usava:
       drible puxa o ataque, passe+visão o meio, desarme+posicionamento a defesa. Faixa
       0,90–1,10 (mais estreita que fin 0,82–1,28 e goleiro 0,85–1,15) porque aqui o fator
       incide sobre a média do SETOR INTEIRO, não sobre um jogador. O 4º argumento desconta
       o viés do perfil — sem ele isto seria inflação geral, não diferenciação. */
    const avg=function(a,fx){return a.length?a.reduce(function(s,p){return s+engForce(p.f)*(0.6+0.4*p.energy/100)*(fx?fx(p):1);},0)/a.length:28;};
    const fxATT=function(p){return attrFactor(p,['dri'],0.90,1.10,0.92);};
    const fxMID=function(p){return attrFactor(p,['pas','vis'],0.96,1.04,0.94);};
    const fxDEF=function(p){return attrFactor(p,['des','pos'],0.90,1.10,0.86);};
    /* goleiro comprime com a curva LEVE (engForceGK), como o ratings() do cliente: só há um em
       campo, então o motivo da compressão (empilhar craques) não se aplica — sem isto o goleiro
       craque valia menos nas partidas resolvidas aqui do que nas ao vivo (divergência achada na
       validação de 21/08). */
    const avgGK=function(a){return a.length?a.reduce(function(s,p){return s+engForceGK(p.f)*(0.6+0.4*p.energy/100)*attrFactor(p,['ref','mao'],0.85,1.15);},0)/a.length:28;};
    let OS=avg(bySec('ATT'),fxATT), MS=avg(bySec('MID'),fxMID), DS=(avgGK(bySec('GK'))*0.35+avg(bySec('DEF'),fxDEF)*0.65);
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
