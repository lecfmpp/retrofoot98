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
const ENG={rev:0.82, sd:0.33, danger:0.58, shot:0.28, conv:0.52, penaltyChance:0.025}; // era 0.055 -> muito mais pênaltis por partida do que o futebol de verdade
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
  // Formação é uma TROCA de estilo, não um botão de vitória. Referência: 4-3-3 (neutro).
  // Mais atacantes => +ataque E -defesa (o time todo empurra e fica exposto atrás); mais
  // zagueiros => +defesa E -ataque. Assim, com times iguais, a taxa de vitória fica parecida
  // entre as formações — o que muda é o PERFIL do placar (ofensiva = jogo aberto/mais gols dos
  // dois lados; defensiva = jogo fechado/menos gols). Ver rebalance de formações.
  return {
    OS: 1 + (nATT-3)*0.045 - (nDEF-4)*0.010,  // atacante sobe o ataque; menos zagueiro também
    MS: 1 + (nMID-3)*0.005,
    DS: 1 + (nDEF-4)*0.010 - (nATT-3)*0.040,  // zagueiro a mais defende pouco; ATACANTE a mais expõe muito
    nMID
  };
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

/* tática usada por um clube na simulação: o clube do usuário usa S.tactic; na Resenha, um clube
   de OUTRO humano usa a tática da ÚLTIMA rodada dele (S.clubTactic[id], guardada em startLiveRound)
   — assim, se ele não confirmar a tempo, o jogo dele é simulado com a tática que ele já vinha
   usando, em vez de cair no 'equilibrado' padrão. Fora isso (CPU), 'equilibrado'. */
function tacticForClub(id){
  if(id===S.clubId) return S.tactic||'equilibrado';
  if(typeof CL!=='undefined' && CL.online && S.clubTactic && S.clubTactic[id]) return S.clubTactic[id];
  return 'equilibrado';
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
  const betaH=TACTIC_BETA[tacticForClub(homeId)];
  const betaA=TACTIC_BETA[tacticForClub(awayId)];
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
  /* SÚMULA DE PARTICIPAÇÃO (minutos em campo por jogador) — ver rateAppearances no
     match-engine.js. Contada minuto a minuto sobre quem não está em offField, então expulsão e
     lesão entram sozinhas. Aqui não há substituição (isso é da sessão ao vivo, logo abaixo). */
  const capMin={H:new Map(), A:new Map()};
  const capKey=p=>(p.pid!=null?p.pid:p.n);
  function creditMinute(){
    ['H','A'].forEach(side=>{ const players=side==='H'?hp:ap, off=offField[side], m=capMin[side];
      players.forEach(p=>{ if(!off.has(p.n)){ const k=capKey(p); m.set(k,(m.get(k)||0)+1); } }); });
  }
  function capsFor(side){ const players=side==='H'?hp:ap, m=capMin[side];
    return players.map(p=>({pid:p.pid,n:p.n,mins:m.get(capKey(p))||0})).filter(c=>c.mins>0); }
  // one simulated minute -> returns event or null
  function tickMinute(stoppage){
    minute++;
    creditMinute();
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
        if(scored){ if(home){hg++;} else {ag++;} perf[hSide].goals++; scorers.push({id:atkId,name:taker.n,pid:taker.pid,min:minute}); pos=home?-0.15:0.15; }
        ev={type:'penalti',side:hSide,min:minute,team:atkId,scorer:taker?taker.n:null,scorerPid:taker?taker.pid:null,gk:gk?gk.n:null,scored,stoppage};
      } else {
      const sc=scorerFrom(atkId, atkPool);
      // conversão via índices ataque/defesa (com meio-campo) + moral do finalizador
      const conv=shotConv(atkIdx,defIdx,sc.moral);
      if(conv>=0.5) perf[hSide].big++; // grande chance
      if(R.random()<conv){
        if(home){hg++;} else {ag++;} perf[hSide].goals++;
        scorers.push({id:atkId,name:sc.n,pid:sc.pid,min:minute}); pos=home?-0.15:0.15;
        ev={type:'gol',side:hSide,min:minute,scorer:sc.n,scorerPid:sc.pid,team:atkId,stoppage};
      } else {
        perf[hSide].chances++;
        ev={type:'chance',side:hSide,min:minute,scorer:sc.n,scorerPid:sc.pid,team:atkId,pos};
      }
      }
    } else if(R.random()<0.022){ // calibrado pra ~2-3 cartões/partida (era 0.026 — muitos jogos tinham 2-3 EXPULSÕES, não só cartões)
      // cartão: o time SEM a posse comete a falta
      const foulSide=home?'A':'H'; const foulTeam=foulSide==='H'?homeId:awayId;
      const p=pickFoulPlayer(foulSide);
      if(p){
        if(R.random()<0.035){ // ~3.5% dos cartões viram vermelho direto (era 10% — expulsão deve ser rara, não quase todo jogo)
          offField[foulSide].add(p.n); menOnField[foulSide]=Math.max(6,menOnField[foulSide]-1);
          ev={type:'cartao',side:foulSide,min:minute,team:foulTeam,player:p.n,pid:p.pid,pos:p.s,cardType:'vermelho',reason:'direto'};
        } else if(cardState[foulSide].get(p.n)==='amarelo'){ // segundo amarelo = vermelho
          cardState[foulSide].set(p.n,'vermelho');
          offField[foulSide].add(p.n); menOnField[foulSide]=Math.max(6,menOnField[foulSide]-1);
          ev={type:'cartao',side:foulSide,min:minute,team:foulTeam,player:p.n,pid:p.pid,pos:p.s,cardType:'vermelho',reason:'segundo amarelo'};
        } else {
          cardState[foulSide].set(p.n,'amarelo');
          ev={type:'cartao',side:foulSide,min:minute,team:foulTeam,player:p.n,pid:p.pid,pos:p.s,cardType:'amarelo',reason:null};
        }
      }
    } else if(R.random()<0.0026){ // calibrado pra ~1 lesão a cada 4-5 partidas (era 0.011 -> ~1 lesão POR partida, demais)
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
        ev={type:'lesao',side,min:minute,team,player:p.n,pid:p.pid,pos:p.s,severity:grave?'grave':'leve',outMatches};
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
      if(minute>=regularMinutes+add){ if(onEnd)onEnd({hg,ag,scorers,perf,caps:{H:capsFor('H'),A:capsFor('A')},matchMinutes:minute}); return; }
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
    const ids=new Set(S.xi||[]); chosen=avail.filter(p=>ids.has(p.pid));   // S.xi = pids
  } else if(CL.online && CL.humans && CL.humans[id]){
    const stored=(S.clubXI&&S.clubXI[id])||null;
    const ids=new Set((stored&&stored.length)?stored:autoXI(id));
    chosen=avail.filter(p=>ids.has(p.pid));
  }
  if(chosen.length<11){ const have=new Set(chosen.map(p=>p.pid));
    const extra=avail.filter(p=>!have.has(p.pid)).sort((a,b)=>b.f-a.f);
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

/* ===================================================================
   SESSÃO INTERATIVA (Fase 3A) — a partida do PRÓPRIO usuário simulada
   minuto a minuto AO VIVO, com decisões que alteram o jogo DE VERDADE:
   - lesão -> substituto devolve o 11º em campo e recalcula a força do time;
   - expulsão -> segue com 10, mas dá pra reorganizar (troca um jogador de
     linha por um do banco, gastando uma substituição) e a força recalcula;
   - substituição tática -> ratings recalculados com a energia de quem entra;
   - pênalti -> como sempre (batedor escolhido decide o resultado, RNG
     determinística hashSeed(seed, rodada, 'pen', min, batedor)).
   O placar/os eventos dos minutos seguintes derivam do estado ATUAL do time
   (efeito borboleta desejado). Tudo fica registrado em `decisions` (log
   pequeno, publicado junto do resultado — base da Fase 3B pra replay/
   auditoria). Log vazio ≈ motor clássico: o stream pré-computado da Fase 2
   segue sendo o fallback correto pra partida NÃO jogada.
   Partidas em segundo plano continuam com simulateMatch/simEventsC — esta
   sessão só roda pra partida que o usuário joga (é autoritativa: o resultado
   publicado dela vence no servidor, então não precisa de paridade com nada).
   =================================================================== */
/* ratings a partir dos jogadores EM CAMPO — espelha ratings() (index.html):
   engForce comprimido + energia + moral baixa derruba o time todo. */
function sessionRatingsFromPlayers(players){
  const eF=(typeof REBAL!=='undefined'&&REBAL.engForce)?REBAL.engForce:(f=>f);
  const eFG=(typeof REBAL!=='undefined'&&REBAL.engForceGK)?REBAL.engForceGK:eF;
  const bySec=s=>players.filter(p=>p.s===s);
  const avg=a=>a.length?a.reduce((s,p)=>s+eF(p.f)*(0.6+0.4*(p.energy!=null?p.energy:100)/100),0)/a.length:28;
  const avgGK=a=>a.length?a.reduce((s,p)=>s+eFG(p.f)*(0.6+0.4*(p.energy!=null?p.energy:100)/100),0)/a.length:28;
  let OS=avg(bySec('ATT')), MS=avg(bySec('MID')), DS=(avgGK(bySec('GK'))*0.35+avg(bySec('DEF'))*0.65);
  const mor=players.length?players.reduce((s,p)=>s+(p.moral!=null?p.moral:70),0)/players.length:70;
  if(mor<50){OS*=0.85;MS*=0.85;DS*=0.85;}
  return {OS,MS,DS,mor};
}
function liveMatchSession(homeId, awayId, seed, opts){
  opts=opts||{};
  let R=makeRng((seed!=null?seed:matchSeed(homeId,awayId))>>>0);
  const userClubId=opts.userClubId||S.clubId;
  const userSide = homeId===userClubId?'H' : awayId===userClubId?'A' : null;
  // FASE 3B: quais lados PAUSAM pra decisão. Padrão: só o do usuário. Numa partida humano×humano
  // transmitida, o cliente do MANDANTE roda a sessão com AMBOS os lados interativos — as decisões
  // do visitante chegam pela rede (applyDecision com d.side) e as dele pelo modal local.
  const interactive={}; (opts.interactiveSides || (userSide?[userSide]:[])).forEach(s=>{interactive[s]=true;});
  // quem está EM CAMPO agora (mutável — substituições mexem aqui de verdade)
  const cur={H:availableXI(homeId).slice(), A:availableXI(awayId).slice()};
  const clubIdOf={H:homeId, A:awayId};
  const betaH=TACTIC_BETA[tacticForClub(homeId)], betaA=TACTIC_BETA[tacticForClub(awayId)];
  const homeAdv=homeAdvantage(homeId);
  const derby=(typeof clubOf==='function') && isDerby((clubOf(homeId)||{}).short,(clubOf(awayId)||{}).short);
  const sd=ENG.sd*(derby?1.18:1)*(opts.importance?1.12:1);
  // ratings BASE recalculados a cada mudança de elenco em campo (aqui as decisões "entram" no motor)
  const rat={H:null,A:null}, nMid={H:0,A:0};
  function recompute(side){
    const em=formationEmphasis(cur[side]);
    const r0=sessionRatingsFromPlayers(cur[side]);
    rat[side]={OS:r0.OS*em.OS, MS:r0.MS*em.MS, DS:r0.DS*em.DS, mor:r0.mor};
    nMid[side]=em.nMID;
  }
  recompute('H'); recompute('A');
  const cardState={H:new Map(),A:new Map()}, menOnField={H:11,A:11};
  const subsUsed={H:0,A:0};
  let pos=0, hg=0, ag=0, extraBase=null, regularEnd=null;
  const scorers=[], events=[], decisions=[];
  const perf={H:{poss:0,shots:0,chances:0,big:0,goals:0}, A:{poss:0,shots:0,chances:0,big:0,goals:0}};
  // perf é exposto POR REFERÊNCIA (o objeto é mutado a cada minuto): a tela do Modo Camarote
  // lê posse/finalizações AO VIVO daqui, sem esperar o fim da partida.
  const session={ minute:0, done:false, pending:null, totalMinutes:null, events, decisions, result:null, perf,
    subsLeft:(side)=>Math.max(0,3-subsUsed[side||userSide||'H']),
    onField:(side)=>cur[side].slice(), userSide };
  // minuto de RELÓGIO (o mesmo que vai nos eventos): na prorrogação, 90+x em vez do contador
  // cru. É o que o Modo Camarote mostra no placar — sem isso o relógio da tela discordaria
  // dos minutos das próprias linhas de narração.
  session.dispMin=function(){ return dispMin(); };
  function teamPenalty(side){ const n=menOnField[side]; return n>=11?1:n===10?0.90:n===9?0.78:0.65; }
  function effRat(side){ const b=rat[side]; const tp=teamPenalty(side); return {OS:b.OS*tp, MS:b.MS*tp, DS:b.DS*tp}; }
  function currentMu(){ return matchMu(effRat('H'), effRat('A'), betaH, betaA, {nMidH:nMid.H, nMidA:nMid.A, homeAdv}); }
  function dispMin(){ return extraBase!=null ? 90+(session.minute-extraBase) : session.minute; }
  function scorerFrom(id,players){ const atk=players.filter(p=>p.s==='ATT'||p.s==='MID');
    const pool=atk.length?atk:players; let tot=pool.reduce((s,p)=>s+p.f,0), r=R.random()*tot;
    for(const p of pool){r-=p.f;if(r<=0)return p;} return pool[0]; }
  function pickFoulPlayer(side){ const pool=cur[side].filter(p=>p.s!=='GK');
    const list=pool.length?pool:cur[side]; if(!list.length) return null;
    const w=p=>(110-p.f)*(BEHAVIOR_CARD_MULT[p.behavior]||1);
    let tot=list.reduce((s,p)=>s+w(p),0), r=R.random()*tot;
    for(const p of list){ r-=w(p); if(r<=0) return p; } return list[list.length-1]; }
  function removeFromField(side,p){ const i=cur[side].findIndex(x=>x.pid===p.pid||x.n===p.n); if(i>=0) cur[side].splice(i,1); }
  /* SÚMULA DE PARTICIPAÇÃO — aqui cur[side] muda de verdade (substituição, expulsão, lesão),
     então contar minuto a minuto sobre quem está em campo cobre os três casos de uma vez, sem
     instrumentar cada ponto de mutação. capInfo guarda quem JÁ passou por campo, pra súmula
     não perder o jogador que saiu no intervalo (ele não está mais em cur, mas jogou 45). */
  const capMin={H:new Map(), A:new Map()}, capInfo=new Map();
  const capKey=p=>(p.pid!=null?p.pid:p.n);
  function creditMinute(){
    ['H','A'].forEach(side=>{ const m=capMin[side];
      cur[side].forEach(p=>{ const k=capKey(p); capInfo.set(k,p); m.set(k,(m.get(k)||0)+1); }); });
  }
  function capsFor(side){ const out=[];
    capMin[side].forEach((mins,k)=>{ const p=capInfo.get(k); if(p&&mins>0) out.push({pid:p.pid,n:p.n,mins}); });
    return out; }
  session.capsOf=capsFor;
  function benchOf(side){ // elenco disponível que ainda não entrou em campo nesta partida
    const usedIds=new Set(events.filter(e=>e._enteredPid).map(e=>e._enteredPid));
    const onIds=new Set(cur[side].map(p=>p.pid));
    return squad(clubIdOf[side]).filter(p=>!onIds.has(p.pid) && !usedIds.has(p.pid) && !(p.suspended>0) && !(p.injuredMatches>0) && !events.some(e=>(e.type==='lesao'||e.cardType==='vermelho') && e.pid===p.pid));
  }
  session.benchOf=benchOf;
  function pushEv(ev){ ev._resolved = ev._resolved!==false; events.push(ev); return ev; }
  function tickMinute(stoppage){
    session.minute++;
    creditMinute();
    const mu=currentMu();
    pos=clamp(pos*ENG.rev + R.gauss(mu,sd), -1.15, 1.15);
    perf[pos>0?'H':'A'].poss++;
    let ev=null;
    const home=pos>0; const hSide=home?'H':'A';
    if(Math.abs(pos)>=ENG.danger && R.random() < ENG.shot*((Math.abs(pos)-ENG.danger)/(1.15-ENG.danger)+0.15)){
      const atkId=home?homeId:awayId;
      const eA=effRat(hSide), eD=effRat(home?'A':'H');
      const atkIdx=atkIndex(eA.OS,eA.MS), defIdx=defIndex(eD.DS,eD.MS);
      const atkPool=cur[hSide];
      perf[hSide].shots++;
      if(R.random()<ENG.penaltyChance){
        perf[hSide].big++;
        const defSide=home?'A':'H'; const gk=cur[defSide].find(p=>p.s==='GK')||null;
        if(interactive[hSide]){
          // PÊNALTI DE LADO INTERATIVO: fica PENDENTE — o batedor escolhido (modal local ou decisão
          // remota do visitante, Fase 3B) decide o resultado (applyDecision). A sessão não avança
          // até a decisão chegar (ou o timeout do lado autoritativo aplicar a padrão).
          ev=pushEv({type:'penalti',side:hSide,min:dispMin(),team:atkId,scorer:null,gk:gk?gk.n:null,scored:null,stoppage,_resolved:false});
          session.pending={kind:'penalti',ev,gk};
        } else {
          const taker=pickPenaltyTaker(atkPool,R);
          const pConv=penaltyConvChance(taker,gk);
          const scored=R.random()<pConv;
          if(scored){ if(home){hg++;}else{ag++;} perf[hSide].goals++; scorers.push({id:atkId,name:taker.n,pid:taker.pid,min:dispMin()}); pos=home?-0.15:0.15; }
          ev=pushEv({type:'penalti',side:hSide,min:dispMin(),team:atkId,scorer:taker?taker.n:null,scorerPid:taker?taker.pid:null,gk:gk?gk.n:null,scored,stoppage});
        }
      } else {
        const sc=scorerFrom(atkId, atkPool);
        const conv=shotConv(atkIdx,defIdx,sc.moral);
        if(conv>=0.5) perf[hSide].big++;
        if(R.random()<conv){
          if(home){hg++;}else{ag++;} perf[hSide].goals++;
          scorers.push({id:atkId,name:sc.n,pid:sc.pid,min:dispMin()}); pos=home?-0.15:0.15;
          ev=pushEv({type:'gol',side:hSide,min:dispMin(),scorer:sc.n,scorerPid:sc.pid,team:atkId,stoppage});
        } else { perf[hSide].chances++; ev=pushEv({type:'chance',side:hSide,min:dispMin(),scorer:sc.n,scorerPid:sc.pid,team:atkId,pos}); }
      }
    } else if(R.random()<0.022){
      const foulSide=home?'A':'H'; const foulTeam=foulSide==='H'?homeId:awayId;
      const p=pickFoulPlayer(foulSide);
      if(p){
        const direct=R.random()<0.035;
        const second=!direct && cardState[foulSide].get(p.n)==='amarelo';
        if(direct||second){
          // EXPULSÃO: o jogador SAI DE CAMPO DE VERDADE (o time recalcula sem ele e joga com 10).
          // Se for do usuário, pausa pro modal de reorganização (applyDecision decide).
          if(second) cardState[foulSide].set(p.n,'vermelho');
          removeFromField(foulSide,p); menOnField[foulSide]=Math.max(6,menOnField[foulSide]-1); recompute(foulSide);
          const isUser=!!interactive[foulSide];
          ev=pushEv({type:'cartao',side:foulSide,min:dispMin(),team:foulTeam,player:p.n,pid:p.pid,pos:p.s,cardType:'vermelho',reason:direct?'direto':'segundo amarelo',_resolved:!isUser});
          if(isUser) session.pending={kind:'vermelho',ev,player:p};
        } else {
          cardState[foulSide].set(p.n,'amarelo');
          ev=pushEv({type:'cartao',side:foulSide,min:dispMin(),team:foulTeam,player:p.n,pid:p.pid,pos:p.s,cardType:'amarelo',reason:null});
        }
      }
    } else if(R.random()<0.0026){
      const side=R.random()<0.5?'H':'A'; const team=side==='H'?homeId:awayId;
      const pool=cur[side];
      if(pool.length){
        const wInj=p=>BEHAVIOR_INJURY_MULT[p.behavior]||1;
        let tot=pool.reduce((s,p)=>s+wInj(p),0), r=R.random()*tot, p=pool[pool.length-1];
        for(const cand of pool){ r-=wInj(cand); if(r<=0){ p=cand; break; } }
        const grave=R.random()<0.30;
        const outMatches=grave?Math.floor(R.rnd(2,5)):(R.random()<0.5?1:0);
        // LESÃO: sai de campo de verdade; usuário escolhe quem entra (devolve o 11º + recalcula).
        removeFromField(side,p); menOnField[side]=Math.max(6,menOnField[side]-1); recompute(side);
        const isUser=!!interactive[side];
        ev=pushEv({type:'lesao',side,min:dispMin(),team,player:p.n,pid:p.pid,pos:p.s,severity:grave?'grave':'leve',outMatches,_resolved:!isUser});
        if(isUser) session.pending={kind:'lesao',ev,player:p};
      }
    }
    return ev;
  }
  session.step=function(){
    if(session.done || session.pending) return null;
    const regular = extraBase!=null ? extraBase+30 : 90;
    const stoppage = regularEnd!=null;
    const ev=tickMinute(stoppage);
    if(regularEnd==null && session.minute>=regular){
      const add=Math.floor(R.rnd(1, extraBase!=null?4:5));
      regularEnd=regular; session.totalMinutes=regular+add;
    }
    if(session.totalMinutes!=null && session.minute>=session.totalMinutes && !session.pending){
      session.done=true;
      session.result={hg,ag,scorers,perf,events,decisions,
        caps:{H:capsFor('H'),A:capsFor('A')}, matchMinutes:session.minute};
    }
    return ev;
  };
  /* prorrogação AO VIVO na MESMA sessão: mantém elenco em campo, cartões e substituições usadas
     (mais correto que o modelo antigo, que re-escalava do zero). RNG nova ('extra') pra manter a
     mesma família de seeds do desempate em segundo plano. */
  session.beginExtraTime=function(){
    R=makeRng(hashSeed(seed,'extra'));
    extraBase=session.minute; regularEnd=null; session.totalMinutes=null;
    session.done=false; session.result=null;
  };
  /* DECISÕES — cada uma entra no log e muda o estado do motor dali em diante. d.side permite a
     decisão REMOTA do visitante (Fase 3B) na sessão do mandante; sem d.side, é o lado do usuário. */
  session.applyDecision=function(d){
    d=d||{};
    const side=d.side||(session.pending&&session.pending.ev&&session.pending.ev.side)||userSide||'H';
    const findBench=pid=>squad(clubIdOf[side]).find(p=>p.pid===pid)||null;
    let out=null;
    if(d.tipo==='penalti'){
      const p=session.pending; if(!p||p.kind!=='penalti') return null;
      // GUARDA: só quem está EM CAMPO pode bater. O fallback antigo procurava o nome no ELENCO
      // inteiro, então um batedor expulso/substituído (escolha de um cliente desatualizado, ou
      // decisão remota da Resenha chegando depois da expulsão) ainda cobrava. Agora, nome que não
      // está em campo cai no melhor jogador de linha que sobrou.
      const taker=cur[side].find(x=>x.n===d.batedor)
        || cur[side].filter(x=>x.s!=='GK').slice().sort((a,b)=>b.f-a.f)[0]
        || cur[side][0] || null;
      const R2=makeRng(hashSeed(S.seed,S.round,'pen',p.ev.min,d.batedor));
      const scored=R2.random()<penaltyConvChance(taker,p.gk);
      p.ev.scored=scored; p.ev.scorer=taker?taker.n:d.batedor; p.ev.scorerPid=taker?taker.pid:null;
      if(scored){ if(side==='H'){hg++;}else{ag++;} perf[side].goals++; scorers.push({id:clubIdOf[side],name:p.ev.scorer,pid:p.ev.scorerPid,min:p.ev.min}); pos=side==='H'?-0.15:0.15; }
      out=scored;
    } else if(d.tipo==='lesao-sub'){
      const p=session.pending; if(!p||p.kind!=='lesao') return null;
      const rep=findBench(d.entraPid);
      if(rep){ cur[side].push(rep); menOnField[side]=Math.min(11,menOnField[side]+1); subsUsed[side]++; recompute(side);
        p.ev._enteredPid=rep.pid; out=true; }
    } else if(d.tipo==='expulsao-reorg'){
      const p=session.pending; if(!p||p.kind!=='vermelho') return null;
      const sai=cur[side].find(x=>x.pid===d.saiPid), entra=findBench(d.entraPid);
      if(sai&&entra){ removeFromField(side,sai); cur[side].push(entra); subsUsed[side]++; recompute(side);
        p.ev._enteredPid=entra.pid; out=true; }
    } else if(d.tipo==='sub'){
      // substituição tática (a qualquer momento / intervalo): energia e setor de quem entra
      // passam a valer JÁ no próximo minuto
      const sai=cur[side].find(x=>x.pid===d.saiPid), entra=findBench(d.entraPid);
      if(!sai||!entra||session.subsLeft(side)<=0) return null;
      removeFromField(side,sai); cur[side].push(entra); subsUsed[side]++; recompute(side);
      pushEv({type:'sub',side,min:dispMin(),team:clubIdOf[side],player:entra.n,pid:entra.pid,out:sai.n,_enteredPid:entra.pid});
      out=true;
    } else if(d.tipo==='lesao-sem-sub'||d.tipo==='expulsao-segue'){ out=true; }
    // 'lesao-sem-sub' e 'expulsao-segue': só destravam (o time segue com um a menos)
    decisions.push({min:(session.pending&&session.pending.ev)?session.pending.ev.min:dispMin(), tipo:d.tipo, side,
      batedor:d.batedor||null, saiPid:d.saiPid||null, entraPid:d.entraPid||null, scored:(d.tipo==='penalti')?out:null});
    if(session.pending && d.tipo!=='sub'){ session.pending.ev._resolved=true; session.pending=null; }
    return out;
  };
  /* decisão PADRÃO pra pendência atual — usada no timeout do lado remoto (Fase 3B): o autoritativo
     nunca fica travado esperando um visitante que caiu. Mesmos padrões dos modais locais. */
  session.defaultDecision=function(){
    const p=session.pending; if(!p) return null;
    const side=p.ev.side;
    if(p.kind==='penalti'){
      const pool=cur[side].filter(x=>x.s!=='GK'); const best=(pool.length?pool:cur[side]).slice().sort((a,b)=>b.f-a.f)[0];
      return {tipo:'penalti', side, batedor:best?best.n:''};
    }
    if(p.kind==='lesao'){
      if(session.subsLeft(side)<=0) return {tipo:'lesao-sem-sub', side};
      let b=benchOf(side);
      if(p.ev.pos==='GK'){ const g=b.filter(x=>x.s==='GK'); if(g.length) b=g; } else b=b.filter(x=>x.s!=='GK');
      const same=b.filter(x=>x.s===p.ev.pos); const pick=same[0]||b[0];
      return pick ? {tipo:'lesao-sub', side, entraPid:pick.pid} : {tipo:'lesao-sem-sub', side};
    }
    return {tipo:'expulsao-segue', side};
  };
  /* foto serializável da partida pra TRANSMISSÃO (Fase 3B): eventos cumulativos + pendência atual.
     Idempotente e auto-suficiente — quem recebe reconstrói a partida inteira a partir da última. */
  session.snapshot=function(){
    return { minute:session.minute, hg, ag, done:session.done, totalMinutes:session.totalMinutes,
      pending: session.pending ? { kind:session.pending.kind, side:session.pending.ev.side,
        ev:{min:session.pending.ev.min, type:session.pending.ev.type, side:session.pending.ev.side,
            player:session.pending.ev.player||null, pid:session.pending.ev.pid||null,
            pos:session.pending.ev.pos||null, reason:session.pending.ev.reason||null, team:session.pending.ev.team} } : null,
      events: events.map(e=>({...e})), result: session.result,
      // posse/finalizações parciais: o visitante (Fase 3B) só assiste ao stream, então sem isso
      // o Modo Camarote dele não teria estatística ao vivo nenhuma.
      perf: {H:{...perf.H}, A:{...perf.A}} };
  };
  return session;
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
/* SÚMULA -> jogadores do elenco. caps = [{pid,n,mins}] vindo da partida. Sem caps (resultado
   antigo, ou caminho que ainda não passa a súmula), cai no onze disponível com 90 minutos —
   é exatamente o comportamento anterior, então nada quebra. */
function capsPlayers(clubId, caps, matchMinutes){
  const sq=squad(clubId)||[];
  if(Array.isArray(caps) && caps.length){
    const out=[];
    caps.forEach(c=>{ const p=sq.find(x=>(c.pid!=null&&x.pid===c.pid)||x.n===c.n); if(p) out.push({p, mins:c.mins}); });
    if(out.length) return out;
  }
  return playedXI(clubId).map(p=>({p, mins:matchMinutes||90}));
}
/* Nota da partida de TODOS que entraram em campo. A conta em si mora no motor compartilhado
   (ME.rateAppearances, match-engine.js) — a mesma que a edge function usa —, aqui só montamos a
   entrada e escrevemos o resultado no elenco. Ver lá a regra de individual-inteiro /
   coletivo-por-minuto. */
function ratePlayers(id, gf, ga, scorers, R, myPerf, oppPerf, caps, matchMinutes){
  R=R||makeRng(hashSeed(S.seed,S.round,'rate',id));
  const ME=(typeof MATCH_ENGINE!=='undefined')?MATCH_ENGINE:null; if(!ME) return;
  const lista=capsPlayers(id, caps, matchMinutes);
  const notas=ME.rateAppearances({
    players:lista.map(x=>({pid:x.p.pid, n:x.p.n, s:x.p.s, f:x.p.f, mins:x.mins})),
    matchMinutes:matchMinutes||90, gf, ga, clubId:id, scorers:scorers||[],
    incidents:S._roundIncidents||{}, myPerf, oppPerf, R });
  notas.forEach((nota,i)=>{
    const p=lista[i].p;
    const st=p.stats||(p.stats={r3:[],g3:[],apps:0,goals:0,cs:0});
    st.r3.push(nota.r); if(st.r3.length>3)st.r3.shift();
    st.g3.push(nota.goals); if(st.g3.length>3)st.g3.shift();
    st.apps++; st.goals+=nota.goals; if(nota.cs)st.cs++;
  });
}
