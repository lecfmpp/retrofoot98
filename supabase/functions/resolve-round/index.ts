
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
   (startLiveRound + applyOtherDivResults). F3.1: aplica override de resultado HUMANO na partida
   dele, caso um treinador humano esteja numa dessas divisões (após promoção/rebaixamento) —
   mesma regra mandante-autoritativa da divisão principal. Partida do humano = resultado submetido;
   as outras = motor. Os incidentes (cartão/lesão) do humano já foram aplicados globalmente no
   resolveLeagueRound (a partir de humanResultByFx), então aqui só o placar/tabela. */
function advanceOtherDivs(S: any, humanResultByFx: any, humanClubs: Set<string>, humanXI: any, humanTactic: any) {
  if (!S.otherDivs) return; const round = S.round, season = S.season;
  humanResultByFx = humanResultByFx || {};
  for (const d in S.otherDivs) {
    const od = S.otherDivs[d]; if (!od.sched || !od.sched.length) continue;
    const oFx = od.sched[round % od.sched.length] || []; const base = hashC("rnd" + season + "-" + round + "-" + d);
    oFx.forEach((fx: any) => {
      const h = fx[0], a = fx[1]; if (h == null || a == null || !od.table[h] || !od.table[a]) return;
      let hg: number, ag: number;
      const sub = humanResultByFx[h + "-" + a];
      if (sub) { hg = sub.hg; ag = sub.ag; }                       // humano nesta divisão -> resultado submetido
      else {
        const seed = (base + hashC(h) + hashC(a)) >>> 0;
        const r = ME.simMatchPure(h, a, sideInputs(S, h, humanClubs.has(h), humanXI, humanTactic), sideInputs(S, a, humanClubs.has(a), humanXI, humanTactic), seed, {});
        hg = r.hg; ag = r.ag;
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
function cupTickMatchesRound(key: string, round: number) { return round % 3 === CUP_TICK_OFFSET[key]; }
function cupIsFinished(b: any) { return !!b.champion; }
function cupSide(S: any, id: string) { return { rat: ME.computeRatings(S.squads[id], null), xi: ME.resolveXI(S.squads[id], null), tactic: 'equilibrado', cap: ME.capFromOverall((S.clubOverall || {})[id] || 70), short: (S.clubShort || {})[id] || id }; }
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
function advanceCupBracket(S: any, b: any, roundLabel: string, cupResultByFx: any) {
  if (!b || cupIsFinished(b)) return;
  const winners: string[] = [];
  b.ties.forEach((t: any) => {
    if (t.winner) { winners.push(t.winner); return; }
    const k = t.h + '-' + t.a; const sub = cupResultByFx && cupResultByFx[k];
    if (sub && sub.winner) { // resultado submetido por um humano (mandante-autoritativo)
      t.hg = sub.hg; t.ag = sub.ag; t.events = sub.events || []; t.winner = sub.winner; t.pens = sub.pens || null;
      applyMatchIncidents(S, sub.events || []); const loser = sub.winner === t.h ? t.a : t.h; b.eliminated[loser] = true; winners.push(sub.winner); return;
    }
    const seed = ME.hashSeed(S.seed, 'cup', roundLabel, t.h, t.a);
    const r = ME.simMatchPure(t.h, t.a, cupSide(S, t.h), cupSide(S, t.a), seed, {});
    t.hg = r.hg; t.ag = r.ag; t.events = r.events;
    applyMatchIncidents(S, r.events);
    const res = resolveDrawnKnockoutTie(S, t.h, t.a, seed, r.hg, r.ag);
    t.winner = res.winner; t.pens = res.pens || null; winners.push(res.winner);
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
function advancePendingCups(S: any, cupResultByFx: any) {
  if (!S.cups) return;
  if (cupTickMatchesRound('copaBrasil', S.round)) {
    const cb = S.cups.copaBrasil;
    if (cb && !cupIsFinished(cb) && cb.ties && cb.ties.length) advanceCupBracket(S, cb, 'copaBrasil-r' + cb.round, cupResultByFx);
  }
  // Libertadores/Sul-Americana (fase de grupos) são só Série A — portadas numa fase futura.
}
/* ===== VIRADA DE TEMPORADA (F3.2) — promoção/rebaixamento + envelhecimento/regen + reconstrução.
   Viewer-independente (não depende de S.clubId): opera no MUNDO. Todas as 4 divisões já são
   materializadas em S.squads, então a troca só remaneja quais clubes ficam em cada divisão
   (computeDivisionSwap, provado byte-idêntico ao cliente). Servidor = autoridade: os detalhes
   cosméticos do regen (atributos) são gerados de forma simples e determinística, sem precisar
   bater com o genAttrs do cliente. Config brasileira (Resenha = sempre Brasil). ===== */
const DIV_ORDER = ['A', 'B', 'C', 'D'];
const DIVISION_SIZE: any = { A: 20, B: 20, C: 20, D: 20 };
const DIVISION_PROMO: any = { A: 0, B: 4, C: 4, D: 4 };
const DIVISION_RELEG: any = { A: 4, B: 4, C: 4, D: 0 };
const DIVISION_FORCE_RANGE: any = { A: [58, 88], B: [58, 80], C: [52, 74], D: [48, 68] };
const DIV_FORCE_CAP: any = { B: 37, C: 24, D: 12 };
const RETIRE_CHANCE_BY_AGE: any = { 32: 0.11, 33: 0.24, 34: 0.40, 35: 0.56, 36: 0.71, 37: 0.83, 38: 0.92, 39: 0.97 };
const BR_FIRST = ['Gabriel', 'Lucas', 'Matheus', 'Rafael', 'Bruno', 'Léo', 'Vitor', 'João', 'Pedro', 'Gustavo', 'Felipe', 'Diego', 'Rodrigo', 'Thiago', 'Wesley', 'Éverton', 'Caio', 'Igor', 'Vinícius', 'Douglas', 'Renato', 'Marcos', 'André', 'Fábio', 'Danilo', 'Kaio', 'Yuri', 'Alan', 'Juninho', 'Guilherme', 'Paulinho', 'Rennan', 'Éder', 'Wellington', 'Luan', 'Nathan', 'Richard', 'Kevin', 'Wanderson', 'Jonathan', 'Ronaldo', 'Ricardo', 'Fernando', 'Cristian', 'Emerson', 'Robson', 'Adriano', 'Cléber', 'Maicon', 'Otávio'];
const BR_LAST = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Lima', 'Costa', 'Ferreira', 'Almeida', 'Ribeiro', 'Rodrigues', 'Gomes', 'Martins', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Araújo', 'Cardoso', 'Teixeira', 'Moreira', 'Carvalho', 'Cavalcante', 'Mendes', 'Freitas', 'Vieira', 'Monteiro', 'Nunes', 'Correia', 'Machado', 'Fernandes', 'Ramos', 'Azevedo', 'Campos', 'Pinto', 'Cunha', 'Moraes', 'Farias', 'Batista', 'Andrade'];
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
function pickProcName(R: any, used: Set<string>) { let nm = '', tr = 0; do { const fn = BR_FIRST[Math.floor(R.random() * BR_FIRST.length)], ln = BR_LAST[Math.floor(R.random() * BR_LAST.length)]; nm = fn + ' ' + ln + (tr < 1 ? '' : ' ' + BR_LAST[Math.floor(R.random() * BR_LAST.length)]); tr++; } while (used.has(nm) && tr < 400); used.add(nm); return nm; }
function makeRegen(S: any, pos: string, div: string, seedExtra: string, used: Set<string>) {
  const range = DIVISION_FORCE_RANGE[div] || DIVISION_FORCE_RANGE.D; const R = ME.makeRng(ME.hashSeed('retire-repl', (S.seed || 1), S.season, div, pos, seedExtra));
  const age = Math.round(18 + R.random() * 4); const rawF = rollAgedForce(R, range, age); const f = Math.min(rbForce(rawF, div), DIV_FORCE_CAP[div] || 99);
  const L = Math.max(1, Math.min(20, Math.round(6 + (rawF - 45) * 13 / 46))); const attr: any = {}; REGEN_ATTR_KEYS.forEach((k) => attr[k] = L);
  const mv = rbValue(f, age);
  return { n: pickProcName(R, used), p: pos, s: pos, f, rawF, _rb: 1, _div: div, age, lg: 'BRA-' + div, mv, ft: R.random() < 0.8 ? 'R' : 'L', num: String(Math.floor(R.random() * 40) + 1), nat: 'Brasil', ag: '—', moral: 70, energy: 100, attr, f0: rawF, mv0: mv, stats: { r3: [], g3: [], apps: 0, goals: 0, cs: 0 } };
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
function resolveSeasonTurnover(S: any) {
  const newDiv = computeDivisionSwap(S);                          // 1) promoção/rebaixamento (provado)
  const divOfClub: any = {}; DIV_ORDER.forEach((d) => newDiv[d].forEach((id: string) => divOfClub[id] = d));
  // RESUMO DA TEMPORADA QUE ACABOU (pré-reset): tabelas finais por divisão + artilharia + copa.
  // O servidor NÃO credita caixa/prêmio (igual finanças) — cada humano monta a SUA premiação no
  // cliente a partir daqui (acha a própria divisão/posição por clubId). Ver computeMyPrevSeasonPrizes.
  const _prevTables: any = {};
  DIV_ORDER.forEach((d) => { const t = (d === S.division) ? S.table : ((S.otherDivs[d] || {}).table || {}); _prevTables[d] = sortTblT(t).map((x: any) => ({ id: x.id, P: x.P, W: x.W, D: x.D, L: x.L, GF: x.GF, GA: x.GA, Pts: x.Pts })); });
  S._prevSeason = { season: (S.season || 1), tables: _prevTables, scorers: S.scorers || {}, copaBrasil: (S.cups && S.cups.copaBrasil) || null };
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
  S.cups = S.cups || {}; S.cups.copaBrasil = makeBracketT(cbClubs, ME.hashSeed(S.seed, 'copaBrasil', S.season), S.clubOverall); // 5) copa nova
  S.round = 0; S.week = 1; S.day = 1; S.results = []; S.scorers = {}; S.negos = []; S.finished = false; // 6) reset de temporada
  Object.keys(S.squads).forEach((cid) => S.squads[cid].forEach((p: any) => { p.moral = 70; p.energy = 100; p.suspended = 0; p.injuredMatches = 0; p.stats = { r3: [], g3: [], apps: 0, goals: 0, cs: 0 }; }));
  S._roundIncidents = {};
}
/* resolve UMA rodada da liga no estado S (mutando-o). humanResultByFx: {"h-a":{hg,ag,scorers,events}} */
/* TRANSFERÊNCIAS dos humanos (compra/venda). Chegam junto do resultado da rodada
   (last_result.transfers) porque é o único canal por-assento que o convidado escreve toda rodada.
   Sem isto, o servidor — único produtor do shared_state — desfazia a contratação na rodada
   seguinte (o jogador voltava pro clube vendedor). IDEMPOTENTE: se o jogador já está no destino,
   ignora — o cliente reenvia até confirmar, então aplicar duas vezes não duplica ninguém. */
function applyHumanTransfers(S: any, transfers: any[]) {
  (transfers || []).forEach((t: any) => {
    if (!t || !t.p || !t.from || !t.to || t.from === t.to) return;
    const src = S.squads[t.from], dst = S.squads[t.to];
    if (!Array.isArray(src) || !Array.isArray(dst)) return;
    if (dst.some((x: any) => x.n === t.p)) return;                // já aplicada
    const i = src.findIndex((x: any) => x.n === t.p); if (i < 0) return; // não está mais no vendedor
    const p = src.splice(i, 1)[0];
    if (t.contract) p.contract = t.contract; else delete p.contract;
    dst.push(p);
    [t.from, t.to].forEach((cid: string) => { const sq = S.squads[cid]; if (sq && sq.length) S.clubOverall[cid] = Math.round(sq.reduce((s: number, x: any) => s + x.f, 0) / sq.length); });
  });
}
function resolveLeagueRound(S: any, humanResultByFx: any, humanClubs: Set<string>, humanXI: any, humanTactic: any, cupResultByFx: any, humanTransfers?: any[]) {
  const seed = S.seed, round = S.round;
  applyHumanTransfers(S, humanTransfers || []);                   // 0) contratações/vendas do humano ANTES de escalar/jogar
  const fixtures = (S.sched[round] || []);
  advancePlayerAvailability(S);                                   // 1) cumpre suspensões/lesões
  const humanEvents: any[] = [];                                  // F3.1: incidentes de TODAS as partidas humanas (qualquer divisão), não só a principal
  Object.keys(humanResultByFx).forEach((k: string) => { humanEvents.push(...((humanResultByFx[k] || {}).events || [])); });
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
  advanceOtherDivs(S, humanResultByFx, humanClubs, humanXI, humanTactic); // 4c) outras divisões (CPU + override humano onde houver)
  S.round++; S.week = (S.week || 1) + 1; S.day = (S.day || 1) + 7; // 5) avança a rodada
  advancePendingCups(S, cupResultByFx || {});                     // 6) copas (Copa do Brasil) — usa a rodada NOVA
  S._roundIncidents = {};
  // 7) fim de temporada? liga terminou -> virada (promoção/rebaixamento + regen + nova temporada)
  if (Array.isArray(S.sched) && S.round >= S.sched.length) resolveSeasonTurnover(S);
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
    const { data: seats } = await admin.from("game_seats").select("user_id, club_id, last_xi, last_tactic, last_result, last_result_round, last_cup_result, last_cup_round, budget").eq("game_id", gameId);
    const humanClubs = new Set<string>(); const humanXI: any = {}; const humanTactic: any = {}; const humanResultByFx: any = {}; const cupResultByFx: any = {}; const humanTransfers: any[] = [];
    (seats || []).forEach((s: any) => {
      if (!s.user_id || !s.club_id) return; humanClubs.add(s.club_id);
      if (s.last_xi) humanXI[s.club_id] = s.last_xi; if (s.last_tactic) humanTactic[s.club_id] = s.last_tactic;
      if (s.budget != null) { S.budgets = S.budgets || {}; S.budgets[s.club_id] = Number(s.budget); } // F3.3: caixa por-humano no mundo
      const r = s.last_result;
      if (r && s.last_result_round === round && r.h && r.a) { const k = r.h + "-" + r.a; if (!humanResultByFx[k] || s.club_id === r.h) humanResultByFx[k] = { hg: r.hg, ag: r.ag, scorers: r.scorers || [], events: r.events || [] }; }
      // trocas de elenco publicadas por este humano (compra/venda) — aplicadas no mundo antes da rodada
      if (r && s.last_result_round === round && Array.isArray(r.transfers) && r.transfers.length) humanTransfers.push(...r.transfers);
      // resultado de COPA submetido pra ESTA rodada (aplicado na chave; mandante-autoritativo)
      const cr = s.last_cup_result;
      if (cr && s.last_cup_round === round && cr.h && cr.a && cr.winner) { const ck = cr.h + "-" + cr.a; if (!cupResultByFx[ck] || s.club_id === cr.h) cupResultByFx[ck] = { hg: cr.hg, ag: cr.ag, winner: cr.winner, pens: cr.pens || null, events: cr.events || [] }; }
    });

    resolveLeagueRound(S, humanResultByFx, humanClubs, humanXI, humanTactic, cupResultByFx, humanTransfers);
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
