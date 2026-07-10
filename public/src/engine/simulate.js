/* ===== deterministic RNG (M0: seeded engine for multiplayer replay) =====
   The match sim + round resolution consume ONLY seeded streams, so the same
   seed reproduces the exact same result on every client and on the server. */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashSeed(){ // FNV-1a over the mixed args -> uint32 seed
  let h=2166136261>>>0; const s=Array.prototype.join.call(arguments,'|');
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
  return h>>>0;
}
function makeRng(seed){
  const r=mulberry32(seed>>>0);
  return {
    random:r,
    rnd:(a,b)=>a+r()*(b-a),
    gauss:(mu,sd)=>{let u=0,v=0;while(!u)u=r();while(!v)v=r();return mu+sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);},
    int:(n)=>Math.floor(r()*n),
    pick:(arr)=>arr[Math.floor(r()*arr.length)],
  };
}
/* per-match seed derived from the save seed + round + clubs */
function matchSeed(homeId,awayId){ return hashSeed(S.seed, S.round, homeId, awayId); }

/* ====================== MATCH ENGINE (Random Walk) ====================== */
/* S_t in [-1,1]; +1 => home goal, -1 => away goal                         */
const TACTIC_BETA={retranca:-0.09, equilibrado:0, ofensivo:0.10};
const ENG={rev:0.82, sd:0.33, danger:0.58, shot:0.28, conv:0.52, penaltyChance:0.085};
/* ---- pênalti: escolhe o batedor padrão (pondera força + leve preferência por ATT/MID)
   e calcula a chance de conversão de forma justa — depende da força e moral do batedor
   E da força do goleiro adversário, sempre com uma margem de sorte (nunca é garantido). ---- */
function pickPenaltyTaker(pool, R){
  const eligible=pool.filter(p=>p.s!=='GK');
  const list=eligible.length?eligible:pool; if(!list.length) return null;
  const weights=list.map(p=>Math.max(1,p.f)*(p.s==='ATT'?1.3:p.s==='MID'?1.1:1));
  let tot=weights.reduce((a,b)=>a+b,0), r=R.random()*tot;
  for(let i=0;i<list.length;i++){ r-=weights[i]; if(r<=0) return list[i]; }
  return list[list.length-1];
}
function penaltyConvChance(taker, gk){
  if(!taker) return 0.75;
  const base=0.76;
  const takerBonus=((taker.f||65)-70)/100*0.35;      // batedor mais forte que a média converte mais
  const posBonus = taker.s==='ATT'?0.05:taker.s==='MID'?0.02:taker.s==='DEF'?-0.02:-0.08; // GK batendo é raríssimo/pior
  const gkPenalty = gk ? (((gk.f||65)-65)/100)*0.22 : 0; // goleiro bom defende mais
  const moralAdj = ((taker.moral||70)-70)/100*0.12;
  return clamp(base+takerBonus+posBonus-gkPenalty+moralAdj, 0.42, 0.93); // nunca abaixo de 42% nem acima de 93% — sempre emoção
}

function simulateMatch(homeId, awayId, isUser, onTick, onEnd, seed){
  const R=makeRng((seed!=null?seed:matchSeed(homeId,awayId))>>>0);
  const H=ratings(homeId, isUser&&homeId===S.clubId), A=ratings(awayId, isUser&&awayId===S.clubId);
  const alpha=0.11, gammaHome=0.06;
  const betaH=TACTIC_BETA[homeId===S.clubId?S.tactic:'equilibrado'];
  const betaA=TACTIC_BETA[awayId===S.clubId?S.tactic:'equilibrado'];
  let pos=0, minute=0, hg=0, ag=0, scorers=[];
  const hp=xiOrTop(homeId), ap=xiOrTop(awayId);
  // disciplina/lesões — só durante ESTA partida (não persiste; aplicação persistente é externa)
  const cardState={H:new Map(),A:new Map()}, offField={H:new Set(),A:new Set()}, menOnField={H:11,A:11};
  function activePool(side){ const players=side==='H'?hp:ap; const off=offField[side]; const a=players.filter(p=>!off.has(p.n)); return a.length?a:players; }
  function teamPenalty(side){ const n=menOnField[side]; return n>=11?1:n===10?0.90:n===9?0.78:0.65; }
  function effOS(side){ return (side==='H'?H.OS:A.OS)*teamPenalty(side); }
  function effDS(side){ return (side==='H'?H.DS:A.DS)*teamPenalty(side); }
  function currentMu(){ return alpha*((effOS('H')/effDS('A'))-(effOS('A')/effDS('H'))) + (betaH-betaA) + gammaHome; }
  function scorerFrom(id,players){
    const atk=players.filter(p=>p.s==='ATT'||p.s==='MID');
    const pool=atk.length?atk:players;
    let tot=pool.reduce((s,p)=>s+p.f,0), r=R.random()*tot;
    for(const p of pool){r-=p.f;if(r<=0)return p;}
    return pool[0];
  }
  function pickFoulPlayer(side){
    const pool=activePool(side).filter(p=>p.s!=='GK');
    const list=pool.length?pool:activePool(side); if(!list.length) return null;
    const w=p=>(110-p.f)*(BEHAVIOR_CARD_MULT[p.behavior]||1);
    let tot=list.reduce((s,p)=>s+w(p),0), r=R.random()*tot;
    for(const p of list){ r-=w(p); if(r<=0) return p; }
    return list[list.length-1];
  }
  // one simulated minute -> returns event or null
  function tickMinute(stoppage){
    minute++;
    const mu=currentMu();
    pos = clamp(pos*ENG.rev + R.gauss(mu,ENG.sd), -1.15, 1.15);
    let ev=null;
    const home = pos>0; const hSide=home?'H':'A';
    if(Math.abs(pos)>=ENG.danger && R.random() < ENG.shot*((Math.abs(pos)-ENG.danger)/(1.15-ENG.danger)+0.15)){
      const atkId=home?homeId:awayId;
      const atkR=effOS(hSide), defR=effDS(home?'A':'H');
      const atkPool=activePool(hSide);
      if(R.random()<ENG.penaltyChance){
        // PÊNALTI: batedor padrão escolhido por peso (força + posição); resultado calculado já aqui
        // pra rodar sozinho em partidas simuladas em segundo plano. Quando o usuário está assistindo
        // ao vivo E é o pênalti do PRÓPRIO time, a UI intercepta e deixa escolher outro batedor
        // (ver liveTick/resolvePenalty em uiClassic.js) — o valor abaixo vira só um "padrão".
        const defSide=home?'A':'H'; const defPool=activePool(defSide);
        const gk=defPool.find(p=>p.s==='GK')||null;
        const taker=pickPenaltyTaker(atkPool,R);
        const pConv=penaltyConvChance(taker,gk);
        const scored=R.random()<pConv;
        if(scored){ if(home){hg++;} else {ag++;} scorers.push({id:atkId,name:taker.n,min:minute}); pos=home?-0.15:0.15; }
        ev={type:'penalti',side:hSide,min:minute,team:atkId,scorer:taker?taker.n:null,gk:gk?gk.n:null,scored,stoppage};
      } else {
      const sc=scorerFrom(atkId, atkPool);
      // conversion scaled by attack/defence balance + finisher composure (low moral halves it)
      let conv=ENG.conv*(atkR/((atkR+defR)/2));
      if(sc.moral<40) conv*=0.5;
      if(R.random()<conv){
        if(home){hg++;} else {ag++;}
        scorers.push({id:atkId,name:sc.n,min:minute}); pos=home?-0.15:0.15;
        ev={type:'gol',side:hSide,min:minute,scorer:sc.n,team:atkId,stoppage};
      } else {
        ev={type:'chance',side:hSide,min:minute,scorer:sc.n,team:atkId,pos};
      }
      }
    } else if(R.random()<0.026){
      // cartão: o time SEM a posse comete a falta
      const foulSide=home?'A':'H'; const foulTeam=foulSide==='H'?homeId:awayId;
      const p=pickFoulPlayer(foulSide);
      if(p){
        if(R.random()<0.10){ // ~10% dos cartões são vermelho direto
          offField[foulSide].add(p.n); menOnField[foulSide]=Math.max(6,menOnField[foulSide]-1);
          ev={type:'cartao',side:foulSide,min:minute,team:foulTeam,player:p.n,pos:p.s,cardType:'vermelho',reason:'direto'};
        } else if(cardState[foulSide].get(p.n)==='amarelo'){ // segundo amarelo = vermelho
          cardState[foulSide].set(p.n,'vermelho');
          offField[foulSide].add(p.n); menOnField[foulSide]=Math.max(6,menOnField[foulSide]-1);
          ev={type:'cartao',side:foulSide,min:minute,team:foulTeam,player:p.n,pos:p.s,cardType:'vermelho',reason:'segundo amarelo'};
        } else {
          cardState[foulSide].set(p.n,'amarelo');
          ev={type:'cartao',side:foulSide,min:minute,team:foulTeam,player:p.n,pos:p.s,cardType:'amarelo',reason:null};
        }
      }
    } else if(R.random()<0.011){
      // lesão: qualquer jogador em campo, de qualquer time — pondera por propensão real (Cavalheiro se machuca mais)
      const side=R.random()<0.5?'H':'A'; const team=side==='H'?homeId:awayId;
      const pool=activePool(side);
      if(pool.length){
        const wInj=p=>BEHAVIOR_INJURY_MULT[p.behavior]||1;
        let tot=pool.reduce((s,p)=>s+wInj(p),0), r=R.random()*tot, p=pool[pool.length-1];
        for(const cand of pool){ r-=wInj(cand); if(r<=0){ p=cand; break; } }
        const grave=R.random()<0.30;
        const outMatches=grave?Math.floor(R.rnd(2,5)):(R.random()<0.5?1:0);
        offField[side].add(p.n); menOnField[side]=Math.max(6,menOnField[side]-1);
        ev={type:'lesao',side,min:minute,team,player:p.n,pos:p.s,severity:grave?'grave':'leve',outMatches};
      }
    }
    return ev;
  }
  const step=()=>{
    const ev=tickMinute(false);
    if(onTick) onTick({minute,pos,hg,ag,ev,mu:currentMu()});
    if(minute>=90){ finish(); }
  };
  function finish(){
    const add=Math.floor(R.rnd(1,5)); let m0=minute;
    (function extra(){
      if(minute>=90+add){ if(onEnd)onEnd({hg,ag,scorers}); return; }
      const ev=tickMinute(true);
      if(onTick)onTick({minute,pos,hg,ag,ev,mu:currentMu(),stoppage:true});
      if(!onTick)extra(); else if(typeof SIM_SYNC!=='undefined'&&SIM_SYNC)extra(); else setTimeout(extra, MATCH.speed);
    })();
  }
  return {step, isUser};
  function xiOrTop(id){ return availableXI(id); }
}
/* quem realmente entra em campo: NUNCA inclui suspenso/lesionado, e SEMPRE completa 11
   (o XI escolhido pelo usuário, filtrando indisponíveis, e repondo com o banco disponível).
   No modo Resenha (online), o clube de OUTRO treinador humano (id !== S.clubId, do ponto
   de vista deste cliente) não tem "S.xi" — cada cliente só enxerga a própria escalação.
   Pra esses casos, usa a ÚLTIMA escalação conhecida daquele clube (S.clubXI[id], guardada
   quando o dono daquele clube inicia a própria rodada — ver startLiveRound), e só cai pro
   automático (autoXI) se nunca tivermos visto uma escalação dele (ex: primeira rodada dele,
   ou ele nunca chegou a confirmar a tempo). Clubes de CPU continuam com "melhores 11". */
function availableXI(id){
  const avail=squad(id).filter(p=>!(p.suspended>0)&&!(p.injuredMatches>0));
  let chosen=[];
  if(id===S.clubId){
    const names=new Set(S.xi||[]); chosen=avail.filter(p=>names.has(p.n));
  } else if(CL.online && CL.humans && CL.humans[id]){
    const stored=(S.clubXI&&S.clubXI[id])||null;
    const names=new Set((stored&&stored.length)?stored:autoXI(id));
    chosen=avail.filter(p=>names.has(p.n));
  }
  if(chosen.length<11){ const have=new Set(chosen.map(p=>p.n));
    const extra=avail.filter(p=>!have.has(p.n)).sort((a,b)=>b.f-a.f);
    chosen=chosen.concat(extra); }
  return chosen.slice(0,11);
}

/* simulate a full CPU match instantly */
function quickSim(homeId,awayId,seed){
  let res=null;
  const m=simulateMatch(homeId,awayId,false,null,r=>res=r,seed);
  while(!res){m.step();}
  return res;
}

/* who actually played (user = chosen XI, CPU = best 11) */
function playedXI(id){ return availableXI(id); }
/* assign match ratings + roll form stats for the players who played */
function ratePlayers(id, gf, ga, scorers, R){
  R=R||makeRng(hashSeed(S.seed,S.round,'rate',id));
  const played=playedXI(id); const won=gf>ga, lost=gf<ga, cs=ga===0;
  const inc=S._roundIncidents||{};
  played.forEach(p=>{
    let r=6.0+(p.f-65)*0.045+R.gauss(0,0.75);
    if(won)r+=0.5; else if(lost)r-=0.5;
    const myG=scorers.filter(s=>s.id===id && s.name===p.n).length;
    r+=myG*1.3;
    if(cs&&(p.s==='GK'||p.s==='DEF'))r+=0.6;
    const myInc=inc[p.n];
    if(myInc){
      if(myInc.cardType==='vermelho') r-=1.4;
      else if(myInc.cardType==='amarelo') r-=0.15;
      if(myInc.injured) r-=0.8;
    }
    r=clamp(r,3,10);
    const st=p.stats||(p.stats={r3:[],g3:[],apps:0,goals:0,cs:0});
    st.r3.push(+r.toFixed(1)); if(st.r3.length>3)st.r3.shift();
    st.g3.push(myG); if(st.g3.length>3)st.g3.shift();
    st.apps++; st.goals+=myG; if(cs&&(p.s==='GK'||p.s==='DEF'))st.cs++;
  });
}
