
/* ==================================================================
   resolve-round — resolvedor de rodada de LIGA server-authoritative (Fase 1).
   Único produtor de games.shared_state pra rodada da divisão dos jogadores.
   Usa o MESMO motor de partida do cliente (MATCH_ENGINE, colado acima) ->
   paridade por construção. Partidas humanas = resultado submetido (game_seats.
   last_result, mandante-autoritativo); CPU = motor. Idempotente por state_version.
   CONGELADO nesta fase (não mexe): copas, mercado, evolução, outras divisões,
   finanças, virada de temporada. Entram nas próximas fases.
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
  const ENG={rev:0.82, sd:0.33, danger:0.58, shot:0.28, conv:0.52, penaltyChance:0.055};
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
    function tickMinute(stoppage){
      minute++;
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
      } else if(R.random()<0.026){
        const foulSide=home2?'A':'H'; const foulTeam=foulSide==='H'?homeId:awayId;
        const p=pickFoulPlayer(foulSide);
        if(p){
          if(R.random()<0.10){ offField[foulSide].add(p.n); menOnField[foulSide]=Math.max(6,menOnField[foulSide]-1);
            ev={type:'cartao',side:foulSide,min:minute,team:foulTeam,player:p.n,pos:p.s,cardType:'vermelho',reason:'direto'}; }
          else if(cardState[foulSide].get(p.n)==='amarelo'){ cardState[foulSide].set(p.n,'vermelho');
            offField[foulSide].add(p.n); menOnField[foulSide]=Math.max(6,menOnField[foulSide]-1);
            ev={type:'cartao',side:foulSide,min:minute,team:foulTeam,player:p.n,pos:p.s,cardType:'vermelho',reason:'segundo amarelo'}; }
          else { cardState[foulSide].set(p.n,'amarelo'); ev={type:'cartao',side:foulSide,min:minute,team:foulTeam,player:p.n,pos:p.s,cardType:'amarelo',reason:null}; }
        }
      } else if(R.random()<0.011){
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
    return { hg:hg, ag:ag, scorers:scorers, events:events, perf:perf };
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
    if(xiNames && xiNames.length){ const set=new Set(xiNames); const xiAvail=avail.filter(function(p){return set.has(p.n);});
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
    if(xiNames && xiNames.length){ const set=new Set(xiNames); chosen=avail.filter(function(p){return set.has(p.n);}); }
    if(chosen.length<11){ const have=new Set(chosen.map(function(p){return p.n;}));
      const extra=avail.filter(function(p){return !have.has(p.n);}).sort(function(a,b){return b.f-a.f;});
      chosen=chosen.concat(extra); }
    return chosen.slice(0,11);
  }
  /* autoXI (nomes) — fallback pra clube humano sem escalação submetida. Espelha autoXI() do cliente. */
  function autoXINames(players){
    const sq=(players||[]).filter(isAvail).sort(function(a,b){return b.f-a.f;});
    const pick=function(sec,n){return sq.filter(function(p){return p.s===sec;}).slice(0,n);};
    let xi=pick('GK',1).concat(pick('DEF',4)).concat(pick('MID',3)).concat(pick('ATT',3));
    if(xi.length<11){ const have=new Set(xi.map(function(p){return p.n;}));
      const add=function(p){ if(xi.length<11 && !have.has(p.n)){ xi.push(p); have.add(p.n); } };
      for(const p of sq){ if(p.s!=='GK') add(p); } for(const p of sq){ add(p); } }
    return xi.slice(0,11).map(function(p){return p.n;});
  }
  /* capacidade de estádio pelo overall do clube (proxy) — usada pro mando no ONLINE (consistente em
     todos os clientes; sem depender do S.stadium de um usuário só). Espelha o ramo "proxy" de homeAdvantage. */
  function capFromOverall(overall){ const ov=overall||70; return 8000 + Math.max(0,ov-55)*2100; }

  const API={ simMatchPure:simMatchPure, penaltyConvChance:penaltyConvChance, pickPenaltyTaker:pickPenaltyTaker,
    makeRng:makeRng, hashSeed:hashSeed, clamp:clamp,
    computeRatings:computeRatings, resolveXI:resolveXI, autoXINames:autoXINames, capFromOverall:capFromOverall, engForce:engForce };
  if(typeof module!=='undefined' && module.exports){ module.exports=API; }
  root.MATCH_ENGINE=API;
})(typeof globalThis!=='undefined'?globalThis:this);


const ME = (globalThis as any).MATCH_ENGINE;
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
function recordScorers(S: any, scorers: any[]) { (scorers || []).forEach((s: any) => { S.scorers[s.name] = (S.scorers[s.name] || 0) + 1; }); }
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
/* inputs de um clube pro motor (humano usa XI/tática submetida; CPU melhores 11 / equilibrado) */
function sideInputs(S: any, id: string, isHuman: boolean, humanXI: any, humanTactic: any) {
  const xiNames = isHuman ? (humanXI[id] || ME.autoXINames(S.squads[id])) : null;
  return {
    rat: ME.computeRatings(S.squads[id], xiNames),
    xi: ME.resolveXI(S.squads[id], xiNames),
    tactic: isHuman ? (humanTactic[id] || "equilibrado") : "equilibrado",
    cap: ME.capFromOverall((S.clubOverall || {})[id] || 70),
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
const BAND_BY_DIV: any = { A:'A',B:'B',C:'C',D:'D', PL:'A',ES:'A',IT:'A',DE:'A',PT:'A', CH:'B',ES2:'B',IT2:'B',DE2:'B',PT2:'B' };
function rbForce(rawF: number, division: string) { const rf = (typeof rawF === 'number' && isFinite(rawF)) ? rawF : 60; const b = BANDS[BAND_BY_DIV[division] || 'A'] || BANDS.A; return Math.max(1, Math.min(99, Math.round(interp(b, rf)))); }
const V_ANCHORS = [[5,80e3],[10,200e3],[15,450e3],[20,700e3],[25,1e6],[30,1.6e6],[35,2.5e6],[40,4e6],[45,6e6],[50,9e6],[60,18e6],[70,35e6],[80,70e6],[90,150e6],[99,260e6]];
function ageFactor(age: number) { const a = age || 26; if (a <= 21) return 1.35; if (a <= 27) return 1.00; if (a <= 31) return 0.80; if (a <= 35) return 0.50; return 0.25; }
function rbValue(f: number, age: number) { return Math.max(30000, Math.round(interp(V_ANCHORS as any, f) * ageFactor(age))); }
function evolvePlayer(p: any, R: any, played: boolean, sDivision: string) {
  if (!p.attr) return; // sem atributos não há como evoluir (saves válidos já têm p.attr)
  const a = p.attr, age = p.age || 26;
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
  if (decline > 0) { for (const k of ['vel', 'agi', 'res']) { if (a[k] > 1 && R.random() < decline * 0.22) { a[k]--; changed = true; } } }
  if (benchStreak >= 4) { const chance = Math.min(0.25, (benchStreak - 3) * 0.05); const k = keys[R.int(keys.length)]; if (a[k] > 1 && R.random() < chance) { a[k]--; changed = true; } }
  if (changed) { p.rawF = levelToForce(attrLevel(a, p.s)); p.f = rbForce(p.rawF, p._div || sDivision || 'A'); p.mv = Math.round(rbValue(p.f, p.age) * (p.mvBoost || 1)); }
}
/* evolução da rodada — humano usa a escalação submetida; CPU os 11 mais fortes (mesma regra do cliente) */
function advanceDevelopment(S: any, humanClubs: Set<string>, humanXI: any) {
  const Rd = ME.makeRng(ME.hashSeed(S.seed, S.round, 'dev'));
  for (const cid in S.squads) {
    const sq = S.squads[cid];
    let playedNames: Set<string>;
    if (humanClubs.has(cid)) { playedNames = new Set(ME.resolveXI(sq, humanXI[cid] || ME.autoXINames(sq)).map((p: any) => p.n)); }
    else { playedNames = new Set(sq.slice().sort((a: any, b: any) => b.f - a.f).slice(0, 11).map((p: any) => p.n)); }
    sq.forEach((p: any) => evolvePlayer(p, Rd, playedNames.has(p.n), S.division));
  }
}
/* hash do cliente (main.js hashC) — usado no seed das OUTRAS divisões */
function hashC(s: any) { s = String(s); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
/* avança as OUTRAS divisões (Séries A/B/C) — CPU determinístico, mesmo seed/lógica do cliente
   (startLiveRound + applyOtherDivResults). Só tabela (sem incidentes), igual ao cliente. */
function advanceOtherDivs(S: any) {
  if (!S.otherDivs) return; const round = S.round, season = S.season;
  for (const d in S.otherDivs) {
    const od = S.otherDivs[d]; if (!od.sched || !od.sched.length) continue;
    const oFx = od.sched[round % od.sched.length] || []; const base = hashC("rnd" + season + "-" + round + "-" + d);
    oFx.forEach((fx: any) => {
      const h = fx[0], a = fx[1]; if (h == null || a == null || !od.table[h] || !od.table[a]) return;
      const seed = (base + hashC(h) + hashC(a)) >>> 0;
      const r = ME.simMatchPure(h, a, sideInputs(S, h, false, {}, {}), sideInputs(S, a, false, {}, {}), seed, {});
      const th = od.table[h], ta = od.table[a];
      th.P++; ta.P++; th.GF += r.hg; th.GA += r.ag; ta.GF += r.ag; ta.GA += r.hg;
      if (r.hg > r.ag) { th.W++; th.Pts += 3; ta.L++; } else if (r.hg < r.ag) { ta.W++; ta.Pts += 3; th.L++; } else { th.D++; ta.D++; th.Pts++; ta.Pts++; }
    });
  }
}
/* resolve UMA rodada da liga no estado S (mutando-o). humanResultByFx: {"h-a":{hg,ag,scorers,events}} */
function resolveLeagueRound(S: any, humanResultByFx: any, humanClubs: Set<string>, humanXI: any, humanTactic: any) {
  const seed = S.seed, round = S.round;
  const fixtures = (S.sched[round] || []);
  advancePlayerAvailability(S);                                   // 1) cumpre suspensões/lesões
  const humanEvents: any[] = [];
  fixtures.forEach((fx: any) => { const k = fx[0] + "-" + fx[1]; const r = humanResultByFx[k]; if (r) humanEvents.push(...(r.events || [])); });
  applyMatchIncidents(S, humanEvents);                            // 2) incidentes NOVOS (só partidas humanas jogadas ao vivo)
  fixtures.forEach((fx: any) => {                                 // 3) resultados: humano=submetido, CPU=motor
    const h = fx[0], a = fx[1]; if (h == null || a == null) return; const k = h + "-" + a;
    let hg: number, ag: number, scorers: any[];
    const sub = humanResultByFx[k];
    if (sub) { hg = sub.hg; ag = sub.ag; scorers = sub.scorers || []; }
    else {
      const mseed = ME.hashSeed(seed, round, h, a);
      const res = ME.simMatchPure(h, a, sideInputs(S, h, humanClubs.has(h), humanXI, humanTactic), sideInputs(S, a, humanClubs.has(a), humanXI, humanTactic), mseed, {});
      hg = res.hg; ag = res.ag; scorers = res.scorers || [];
    }
    applyResultT(S.table, h, a, hg, ag); recordScorers(S, scorers);
    S.results.push({ round: round, h: h, a: a, hg: hg, ag: ag, scorers: scorers });
  });
  const Rr = ME.makeRng(ME.hashSeed(seed, round, "post"));        // 4) energia/moral
  for (const cid in S.squads) for (const p of S.squads[cid]) { p.energy = clampN((p.energy || 100) + Rr.rnd(6, 16), 0, 100); p.moral = clampN((p.moral || 70) + (70 - (p.moral || 70)) * 0.08, 0, 100); }
  humanClubs.forEach((cid) => { const xi = ME.resolveXI(S.squads[cid], humanXI[cid] || ME.autoXINames(S.squads[cid])); for (const p of xi) p.energy = clampN(p.energy - Rr.rnd(12, 22), 20, 100); });
  advanceDevelopment(S, humanClubs, humanXI);                    // 4b) evolução/declínio dos jogadores
  advanceOtherDivs(S);                                            // 4c) outras divisões (CPU determinístico)
  S.round++; S.week = (S.week || 1) + 1; S.day = (S.day || 1) + 7; // 5) avança a rodada
  S._roundIncidents = {};
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
    if (!gameId) return json({ error: "gameId ausente" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { db: { schema: "elifoot_v3" } });
    // só membro da sala (tem assento OU é host) pode disparar
    const { data: seat } = await admin.from("game_seats").select("user_id").eq("game_id", gameId).eq("user_id", user.id).maybeSingle();
    const { data: gameHost } = await admin.from("games").select("host_id, shared_state, state_version, round").eq("id", gameId).maybeSingle();
    if (!gameHost) return json({ error: "sala não encontrada" }, 404);
    if (!seat && gameHost.host_id !== user.id) return json({ error: "não é membro da sala" }, 403);

    const stateObj = gameHost.shared_state;
    if (!stateObj || !stateObj.S) return json({ error: "sem estado salvo ainda" }, 409);
    const S = stateObj.S; const curVer = gameHost.state_version || 0;
    // idempotência: se a rodada esperada não é a atual, alguém já resolveu -> devolve o estado atual
    if (expectedRound != null && S.round !== expectedRound) return json({ ok: true, already: true, round: S.round, version: curVer });

    const round = S.round;
    const { data: seats } = await admin.from("game_seats").select("user_id, club_id, last_xi, last_tactic, last_result, last_result_round").eq("game_id", gameId);
    const humanClubs = new Set<string>(); const humanXI: any = {}; const humanTactic: any = {}; const humanResultByFx: any = {};
    (seats || []).forEach((s: any) => {
      if (!s.user_id || !s.club_id) return; humanClubs.add(s.club_id);
      if (s.last_xi) humanXI[s.club_id] = s.last_xi; if (s.last_tactic) humanTactic[s.club_id] = s.last_tactic;
      const r = s.last_result;
      if (r && s.last_result_round === round && r.h && r.a) { const k = r.h + "-" + r.a; if (!humanResultByFx[k] || s.club_id === r.h) humanResultByFx[k] = { hg: r.hg, ag: r.ag, scorers: r.scorers || [], events: r.events || [] }; }
    });

    resolveLeagueRound(S, humanResultByFx, humanClubs, humanXI, humanTactic);
    stateObj.round = S.round;

    const { data: upd, error: upErr } = await admin.from("games").update({ shared_state: stateObj, state_version: curVer + 1, round: S.round }).eq("id", gameId).eq("state_version", curVer).select("state_version");
    if (upErr) throw upErr;
    if (!upd || !upd.length) { // outro resolvedor ganhou a corrida — devolve o estado atual
      const { data: g2 } = await admin.from("games").select("state_version, round").eq("id", gameId).maybeSingle();
      return json({ ok: true, raced: true, round: g2?.round, version: g2?.state_version });
    }
    return json({ ok: true, round: S.round, version: curVer + 1 });
  } catch (e) { return json({ error: e instanceof Error ? e.message : String(e) }, 500); }
});
