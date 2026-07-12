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
const ENG={rev:0.82, sd:0.33, danger:0.58, shot:0.28, conv:0.52, penaltyChance:0.055};
/* ===== MOTOR 2.0: meio-campo central + índices ofensivo/defensivo + contexto =====
   Toda a matemática que decide o jogo mora aqui (helpers compartilhados), pra os DOIS
   motores (simulateMatch solo/ao-vivo e mpSim multiplayer) rodarem idêntico e determinístico.
   Calibrado por harness em massa (ver relatorios / scratchpad) pra placares realistas. */
const ENG2={ alphaAtk:0.08, alphaMid:0.05, alphaMidCount:0.018, convDiff:0.004 };
/* índice ofensivo: ataque alimentado pelo meio-campo; defensivo: defesa + ajuda do meio (docx) */
function atkIndex(os,ms){ return 0.55*os + 0.45*ms; }
function defIndex(ds,ms){ return 0.72*ds + 0.28*ms; }
/* drift de posse por minuto: ameaça (índices atq/def) + DOMÍNIO de meio-campo + tática + mando.
   H/A = {OS,MS,DS} já com fadiga/moral/formação/expulsões aplicados. ctx = fatores de contexto. */
function matchMu(H,A,betaH,betaA,ctx){
  ctx=ctx||{};
  const atkH=atkIndex(H.OS,H.MS), atkA=atkIndex(A.OS,A.MS);
  const defH=defIndex(H.DS,H.MS), defA=defIndex(A.DS,A.MS);
  const threat = ENG2.alphaAtk*((atkH/defA)-(atkA/defH));
  const midDom = ENG2.alphaMid*((H.MS-A.MS)/(((H.MS+A.MS)/2)||1)); // meio forte controla o jogo
  const midCount = ENG2.alphaMidCount*((ctx.nMidH||0)-(ctx.nMidA||0)); // povoar o meio dá posse
  return threat + midDom + midCount + (betaH-betaA) + (ctx.homeAdv||0.06);
}
/* conversão de uma finalização: equilíbrio ataque/defesa (via índices) + bônus pela diferença
   (docx) + moral baixa do finalizador corta pela metade. Sempre com teto/piso. */
function shotConv(atkIdx,defIdx,finisherMoral){
  let conv=ENG.conv*(atkIdx/(((atkIdx+defIdx)/2)||1));
  conv += clamp(atkIdx-defIdx,-25,25)*ENG2.convDiff;
  if((finisherMoral||70)<40) conv*=0.5;
  return clamp(conv,0.08,0.85);
}
/* mando de campo por clube: capacidade real do estádio do usuário; proxy pelo overall pros
   demais (clube maior => torcida maior => mando maior). Faixa [0.03, 0.10]. */
function homeAdvantage(homeId){
  let cap=null;
  if(homeId===S.clubId && S.stadium && S.stadium.capacity) cap=S.stadium.capacity;
  if(cap==null){ const c=(typeof clubOf==='function')?clubOf(homeId):null; const ov=(c&&c.overall)||70;
    cap = 8000 + Math.max(0,ov-55)*2100; } // ov 55->8k ... 88->~77k
  const t=clamp((cap-8000)/(75000-8000),0,1);
  return 0.007 + t*0.009; // mando modesto e realista (clube maior/estádio maior = um pouco mais)
}
/* emphasis por formação a partir da contagem de setores no XI: mais zaga = mais defensivo,
   mais ataque = mais ofensivo (sutil, pra não virar meta degenerada). Retorna multiplicadores. */
function formationEmphasis(players){
  const n=s=>players.filter(p=>p.s===s).length;
  const nDEF=n('DEF'), nATT=n('ATT'), nMID=n('MID');
  return { OS:1+(nATT-2)*0.025, MS:1+(nMID-3)*0.015, DS:1+(nDEF-4)*0.02, nMID };
}
/* tabela curada de clássicos/rivais (por nome curto) — só aumenta a VARIÂNCIA do jogo
   (imprevisibilidade), não a força. Pares em qualquer ordem. */
const RIVALRIES=[
  ['Flamengo','Fluminense'],['Flamengo','Vasco'],['Flamengo','Botafogo'],['Fluminense','Vasco'],['Botafogo','Vasco'],
  ['Corinthians','Palmeiras'],['Corinthians','São Paulo'],['Corinthians','Santos'],['Palmeiras','São Paulo'],['Palmeiras','Santos'],['São Paulo','Santos'],
  ['Grêmio','Internacional'],['Atlético','Cruzeiro'],['Bahia','Vitória'],
  ['Liverpool','Everton'],['Liverpool','Manchester Unite'],['Manchester Unite','Manchester City'],['Arsenal','Tottenham'],['Arsenal','Chelsea'],['Chelsea','Tottenham'],
  ['Real Madrid','Barcelona'],['Real Madrid','Atlético de Madr'],['Barcelona','Espanyol'],['Sevilla','Real Betis Balom'],
  ['Inter Milan','Milan'],['Juventus','Inter Milan'],['Juventus','Milan'],['Roma','Lazio'],['Napoli','Roma'],
  ['Bayern Munich','Borussia Dortmun'],['Benfica','Porto'],['Benfica','Sporting CP'],['Porto','Sporting CP'],
];
function isDerby(aShort,bShort){ return RIVALRIES.some(([x,y])=>(x===aShort&&y===bShort)||(x===bShort&&y===aShort)); }
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

function simulateMatch(homeId, awayId, isUser, onTick, onEnd, seed, opts){
  opts=opts||{};
  const R=makeRng((seed!=null?seed:matchSeed(homeId,awayId))>>>0);
  const hp=xiOrTop(homeId), ap=xiOrTop(awayId);
  const H0=ratings(homeId, isUser&&homeId===S.clubId), A0=ratings(awayId, isUser&&awayId===S.clubId);
  // emphasis por formação (contagem de setores no XI) — 3-5-2 domina meio, 5-3-2 defende, etc.
  const emH=formationEmphasis(hp), emA=formationEmphasis(ap);
  const H={OS:H0.OS*emH.OS, MS:H0.MS*emH.MS, DS:H0.DS*emH.DS, mor:H0.mor};
  const A={OS:A0.OS*emA.OS, MS:A0.MS*emA.MS, DS:A0.DS*emA.DS, mor:A0.mor};
  const betaH=TACTIC_BETA[homeId===S.clubId?S.tactic:'equilibrado'];
  const betaA=TACTIC_BETA[awayId===S.clubId?S.tactic:'equilibrado'];
  // contexto: mando por estádio + variância extra em clássico/decisão (imprevisibilidade)
  const homeAdv=homeAdvantage(homeId);
  const derby=(typeof clubOf==='function') && isDerby((clubOf(homeId)||{}).short,(clubOf(awayId)||{}).short);
  const sd=ENG.sd*(derby?1.18:1)*(opts.importance?1.12:1);
  const ctxMid={ nMidH:emH.nMID, nMidA:emA.nMID, homeAdv };
  let pos=0, minute=0, hg=0, ag=0, scorers=[];
  // desempenho acumulado (separado do placar): posse (minutos de controle), finalizações, chances, grandes chances
  const perf={H:{poss:0,shots:0,chances:0,big:0,goals:0}, A:{poss:0,shots:0,chances:0,big:0,goals:0}};
  // disciplina/lesões — só durante ESTA partida (não persiste; aplicação persistente é externa)
  const cardState={H:new Map(),A:new Map()}, offField={H:new Set(),A:new Set()}, menOnField={H:11,A:11};
  function activePool(side){ const players=side==='H'?hp:ap; const off=offField[side]; const a=players.filter(p=>!off.has(p.n)); return a.length?a:players; }
  function teamPenalty(side){ const n=menOnField[side]; return n>=11?1:n===10?0.90:n===9?0.78:0.65; }
  function effRat(side){ const b=side==='H'?H:A; const tp=teamPenalty(side); return {OS:b.OS*tp, MS:b.MS*tp, DS:b.DS*tp}; }
  function currentMu(){ return matchMu(effRat('H'), effRat('A'), betaH, betaA, ctxMid); }
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
    pos = clamp(pos*ENG.rev + R.gauss(mu,sd), -1.15, 1.15);
    perf[pos>0?'H':'A'].poss++; // minuto de controle territorial (posse aproximada)
    let ev=null;
    const home = pos>0; const hSide=home?'H':'A';
    if(Math.abs(pos)>=ENG.danger && R.random() < ENG.shot*((Math.abs(pos)-ENG.danger)/(1.15-ENG.danger)+0.15)){
      const atkId=home?homeId:awayId;
      const eA=effRat(hSide), eD=effRat(home?'A':'H');
      const atkIdx=atkIndex(eA.OS,eA.MS), defIdx=defIndex(eD.DS,eD.MS);
      const atkPool=activePool(hSide);
      perf[hSide].shots++;
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
        perf[hSide].big++;
        if(scored){ if(home){hg++;} else {ag++;} perf[hSide].goals++; scorers.push({id:atkId,name:taker.n,min:minute}); pos=home?-0.15:0.15; }
        ev={type:'penalti',side:hSide,min:minute,team:atkId,scorer:taker?taker.n:null,gk:gk?gk.n:null,scored,stoppage};
      } else {
      const sc=scorerFrom(atkId, atkPool);
      // conversão via índices ataque/defesa (com meio-campo) + moral do finalizador
      const conv=shotConv(atkIdx,defIdx,sc.moral);
      if(conv>=0.5) perf[hSide].big++; // grande chance
      if(R.random()<conv){
        if(home){hg++;} else {ag++;} perf[hSide].goals++;
        scorers.push({id:atkId,name:sc.n,min:minute}); pos=home?-0.15:0.15;
        ev={type:'gol',side:hSide,min:minute,scorer:sc.n,team:atkId,stoppage};
      } else {
        perf[hSide].chances++;
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
  // prorrogação (opts.extraTime): mesmo motor, só 30min de tempo regulamentar em vez de 90
  // (e acréscimo um pouco menor) — usado por startExtraTime() quando um mata-mata empata
  // no tempo normal, pra jogar a prorrogação AO VIVO igual ao resto da partida, não
  // resolvida instantaneamente. `minute`/os eventos ficam relativos (1-30ish); quem chama
  // desloca pro +90 antes de acrescentar na timeline principal da partida.
  const regularMinutes = opts.extraTime ? 30 : 90;
  const step=()=>{
    const ev=tickMinute(false);
    if(onTick) onTick({minute,pos,hg,ag,ev,mu:currentMu()});
    if(minute>=regularMinutes){ finish(); }
  };
  function finish(){
    const add=opts.extraTime ? Math.floor(R.rnd(1,4)) : Math.floor(R.rnd(1,5));
    (function extra(){
      if(minute>=regularMinutes+add){ if(onEnd)onEnd({hg,ag,scorers,perf}); return; }
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

/* ===== mata-mata empatado: prorrogação + pênaltis de verdade =====
   NENHUMA copa aqui é jogo de ida-e-volta (motor sempre simula uma partida única
   eliminatória, por design) — então um empate no tempo normal precisa de um
   desempate de verdade, igual a qualquer mata-mata de jogo único na vida real:
   30min de prorrogação (mais chance de sair um gol decisivo, força líquida dita
   quem leva vantagem) e, se persistir, pênaltis alternados de verdade — cada
   cobrador pesado por força/posição (igual pickPenaltyTaker) e a conversão real
   depende do goleiro adversário (igual penaltyConvChance), nunca é sorteio 50/50.
   Usado por TODAS as competições de mata-mata (Copa do Brasil, e a fase eliminatória
   de Libertadores/Sul-Americana depois da fase de grupos) — mesma seed que o
   avanço em segundo plano usa pra essa mesma partida, pro resultado bater sempre,
   seja jogada ao vivo, assistida no modo espectador, ou resolvida sozinha. */
function resolveDrawnKnockoutTie(homeId,awayId,seed,hg,ag){
  if(hg!==ag) return {hg,ag,winner:hg>ag?homeId:awayId,wentToExtra:false,wentToPens:false,pens:null};
  const R=makeRng(hashSeed(seed,'extra'));
  const H=ratings(homeId,false), A=ratings(awayId,false);
  const bias=(H.OS+H.MS-H.DS*0.3)-(A.OS+A.MS-A.DS*0.3); // vantagem líquida na prorrogação
  const pHome=clamp(0.5+bias/500,0.18,0.55), pAway=clamp(0.5-bias/500,0.18,0.55);
  const ehg=R.random()<pHome?1:0, eag=R.random()<pAway?1:0;
  if(ehg!==eag) return {hg:hg+ehg,ag:ag+eag,winner:ehg>eag?homeId:awayId,wentToExtra:true,wentToPens:false,pens:null};
  // pênaltis: 5 cobranças alternadas por time, cobradores escolhidos por peso de força/
  // posição (não repete cobrador enquanto houver opção); se seguir empatado, morte súbita
  // (1 cobrança cada por rodada) até decidir — teto de segurança em 20 rodadas.
  const hp=availableXI(homeId).filter(p=>p.s!=='GK'), ap=availableXI(awayId).filter(p=>p.s!=='GK');
  const gkH=availableXI(homeId).find(p=>p.s==='GK')||null, gkA=availableXI(awayId).find(p=>p.s==='GK')||null;
  const kick=(taker,gk)=>taker && R.random()<penaltyConvChance(taker,gk);
  let pH=0,pA=0;
  for(let i=0;i<5;i++){
    if(kick(hp.length?hp[i%hp.length]:null,gkA)) pH++;
    if(kick(ap.length?ap[i%ap.length]:null,gkH)) pA++;
  }
  let round=5;
  while(pH===pA && round<20){
    if(kick(hp.length?hp[round%hp.length]:null,gkA)) pH++;
    if(kick(ap.length?ap[round%ap.length]:null,gkH)) pA++;
    round++;
  }
  const winner = pH!==pA ? (pH>pA?homeId:awayId) : (R.random()<0.5?homeId:awayId); // segurança extrema (teto batido)
  return {hg,ag,winner,wentToExtra:true,wentToPens:true,pens:{h:pH,a:pA}};
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
/* nota da partida: base por força + resultado + gols + clean sheet + cartões/lesões, MAIS um
   ajuste por DESEMPENHO (dominância) separado do placar — quem dominou e não venceu leva nota
   melhor; quem venceu sofrendo, um pouco menos. myPerf/oppPerf = {poss,shots,chances,big,goals}. */
function domAdjust(myPerf, oppPerf){
  if(!myPerf||!oppPerf) return 0;
  const mp=myPerf.poss||0, op=oppPerf.poss||0;
  const possShare=(mp+op)? mp/(mp+op) : 0.5;
  const chanceEdge=((myPerf.chances||0)+(myPerf.big||0)+(myPerf.goals||0))-((oppPerf.chances||0)+(oppPerf.big||0)+(oppPerf.goals||0));
  return clamp((possShare-0.5)*1.4 + clamp(chanceEdge,-8,8)*0.05, -0.6, 0.6);
}
function ratePlayers(id, gf, ga, scorers, R, myPerf, oppPerf){
  R=R||makeRng(hashSeed(S.seed,S.round,'rate',id));
  const played=playedXI(id); const won=gf>ga, lost=gf<ga, cs=ga===0;
  const inc=S._roundIncidents||{};
  const dom=domAdjust(myPerf,oppPerf); // dominância coletiva (atuação, não resultado)
  played.forEach(p=>{
    let r=6.0+(p.f-65)*0.045+R.gauss(0,0.75);
    if(won)r+=0.5; else if(lost)r-=0.5;
    r+=dom;
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
