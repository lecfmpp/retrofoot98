
/* ====================== WEB AUDIO ====================== */
const Audio_={ctx:null,crowd:null,gain:null,filter:null,started:false};
function audioInit(){
  if(Audio_.started||!S.config.sound)return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext; const ctx=new AC();
    // brown-ish noise buffer = crowd
    const len=ctx.sampleRate*2, buf=ctx.createBuffer(1,len,ctx.sampleRate), d=buf.getChannelData(0);
    let last=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+0.02*w)/1.02;d[i]=last*3.5;}
    const src=ctx.createBufferSource();src.buffer=buf;src.loop=true;
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1400;
    const gain=ctx.createGain();gain.gain.value=0.0;
    src.connect(filter);filter.connect(gain);gain.connect(ctx.destination);src.start();
    Object.assign(Audio_,{ctx,crowd:src,gain,filter,started:true});
  }catch(e){}
}
function crowdTension(absS){ if(!Audio_.gain)return; const v=0.12+absS*0.55; Audio_.gain.gain.setTargetAtTime(clamp(v,0,0.7),Audio_.ctx.currentTime,0.15); }
function crowdBoo(on){ if(!Audio_.filter)return; Audio_.filter.frequency.setTargetAtTime(on?450:1400,Audio_.ctx.currentTime,0.3); }
function sfx(type){
  if(!Audio_.ctx||!S.config.sound)return; const ctx=Audio_.ctx,t=ctx.currentTime;
  if(type==='gol'){
    // celebratory swell
    const g=ctx.createGain();g.gain.value=0.0001;g.connect(ctx.destination);
    g.gain.exponentialRampToValueAtTime(0.5,t+0.05);g.gain.exponentialRampToValueAtTime(0.0001,t+1.4);
    [440,554,659,880].forEach((f,i)=>{const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(g);o.start(t+i*0.04);o.stop(t+1.3);});
  }else if(type==='chance'){ // "uhhh"
    const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(160,t+0.5);
    g.gain.setValueAtTime(0.25,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.6);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+0.6);
  }else if(type==='whistle'){
    const o=ctx.createOscillator(),g=ctx.createGain();o.type='square';o.frequency.value=2100;g.gain.value=0.12;o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+0.3);
  }else if(type==='penalti'){
    // "pan" seco e curto pra chamar atenção — bem diferente dos outros sons (percussivo, sem sustain)
    const o=ctx.createOscillator(),g=ctx.createGain();o.type='square';o.frequency.setValueAtTime(880,t);o.frequency.exponentialRampToValueAtTime(220,t+0.09);
    g.gain.setValueAtTime(0.5,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.11);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+0.12);
    // segundo "pan" logo em seguida — reforça o alerta (tipo "PAN-PAN!")
    const o2=ctx.createOscillator(),g2=ctx.createGain();o2.type='square';o2.frequency.setValueAtTime(880,t+0.18);o2.frequency.exponentialRampToValueAtTime(220,t+0.27);
    g2.gain.setValueAtTime(0.5,t+0.18);g2.gain.exponentialRampToValueAtTime(0.001,t+0.29);o2.connect(g2);g2.connect(ctx.destination);o2.start(t+0.18);o2.stop(t+0.30);
  }else if(type==='penaltiGol'){
    const g=ctx.createGain();g.gain.value=0.0001;g.connect(ctx.destination);
    g.gain.exponentialRampToValueAtTime(0.5,t+0.05);g.gain.exponentialRampToValueAtTime(0.0001,t+1.1);
    [523,659,784].forEach((f,i)=>{const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(g);o.start(t+i*0.05);o.stop(t+1.0);});
  }else if(type==='penaltiPerdido'){
    const o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(90,t+0.7);
    g.gain.setValueAtTime(0.3,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.8);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+0.8);
  }else if(type==='lesao'){
    // aviso curto e grave — bem diferente do "pan" do pênalti, tom descendente sério
    const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(140,t+0.35);
    g.gain.setValueAtTime(0.3,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.45);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+0.45);
  }
}

/* ====================== COMMENTARY (personas) ====================== */
const NARR={
  galvao:{name:'Galvão Bueno',
    gol:(p,t)=>`Olha o que ele fez! É GOOOOL! É do ${clubOf(t).short}! ${p}! Haja coração, amigos!`,
    chance:(p)=>`Uhh! Quase, ${p} carimbou a trave! Que perigo!`,
    start:(h,a)=>`Amigos da rede, bola rolando: ${clubOf(h).short} x ${clubOf(a).short}!`},
  casa:{name:'Casagrande',
    gol:(p,t)=>`Gol do ${clubOf(t).short}. A marcação adversária foi amadora, faltou combatividade. ${p} soube aproveitar.`,
    chance:(p)=>`${p} tinha que ter feito. Faltou capricho na hora de decidir.`,
    start:(h,a)=>`${clubOf(h).short} contra ${clubOf(a).short}. Vamos ver quem tem mais intensidade.`},
  caze:{name:'Casimiro',
    gol:(p,t)=>`CARA, PELO AMOR DE DEUS! Que golaço do ${clubOf(t).short}! O ${p} foi muito frio, meu parceiro! ABSURDO!`,
    chance:(p)=>`AÍ NÃO, ${p}! Como que perde essa, mano?!`,
    start:(h,a)=>`Salve salve a resenha! ${clubOf(h).short} x ${clubOf(a).short}, bora?`},
};
function narrate(kind,ev){ const n=NARR[S.config.commentator]||NARR.galvao;
  if(kind==='gol')return n.gol(ev.scorer,ev.team);
  if(kind==='chance')return n.chance(ev.scorer);
  if(kind==='start')return n.start(ev.h,ev.a);
  return ''; }

/* ElevenLabs (optional, big moments only) */
async function speak(text){
  const k=S.config.elevenKey; if(!S.config.voice||!k)return;
  const ids={galvao:'JBFqnCBsd6RMkjVDRZzb',casa:'pms86vyvH8uLksY2Pz',caze:'9vvH8uLksY2Pzs86p'};
  const vid=ids[S.config.commentator]||ids.galvao;
  try{
    const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}/stream`,{
      method:'POST',headers:{'xi-api-key':k,'Content-Type':'application/json'},
      body:JSON.stringify({text,model_id:'eleven_flash_v2_5',output_format:'mp3_44100_128',
        voice_settings:{stability:0.35,similarity_boost:0.85}})});
    if(!r.ok)return; const blob=await r.blob(); const a=new Audio(URL.createObjectURL(blob)); a.play();
  }catch(e){}
}

/* ====================== STORY / MORAL ENGINE ====================== */
const STORY_EVENTS=[
  {id:'boate',t:'Indisciplina',w:3,gen:()=>{const p=randPlayer(S.clubId);return {
    title:'💃 Bastidores',
    text:`${p.n} foi visto numa boate na madrugada anterior ao clássico.`,
    player:p.n,
    options:[
      {label:'Punir e multar',eff:()=>{adjMoral(p.n,-15);adjTeamMoral(S.clubId,+4);toast('Grupo mais disciplinado (+moral coletivo).');}},
      {label:'Passar a mão na cabeça',eff:()=>{setMoral(p.n,100);adjTeamMoral(S.clubId,-10,p.n);toast(`${p.n} feliz, mas o elenco não gostou.`);}},
    ]};}},
  {id:'europa',t:'Especulação',w:2,gen:()=>{const p=youngGem(S.clubId);return {
    title:'🌍 Mercado Europeu',
    text:`Clube europeu prepara proposta de ${fmt(p.mv*1.4)} por ${p.n}. O jogador está com a cabeça na Europa.`,
    player:p.n,
    options:[
      {label:'Conversar e acalmar',eff:()=>{adjMoral(p.n,+8);toast(`${p.n} focado no clube.`);}},
      {label:'Ignorar',eff:()=>{adjMoral(p.n,-12);toast(`${p.n} disperso nos treinos.`);}},
    ]};}},
  {id:'lesao',t:'Superação',w:2,gen:()=>{const p=randPlayer(S.clubId);return {
    title:'🏥 Departamento Médico',
    text:`Fisioterapia acelera o tratamento e ${p.n} treina com bola antes do previsto.`,
    player:p.n,
    options:[
      {label:'Comemorar com o grupo',eff:()=>{adjTeamMoral(S.clubId,+6);toast('Moral do elenco em alta!');}},
    ]};}},
  {id:'imprensa',t:'Imprensa',w:2,gen:()=>({
    title:'📰 Coletiva',
    text:`A imprensa questiona a sequência do ${clubOf(S.clubId).short}. Como responder?`,
    options:[
      {label:'Peitar a crítica',eff:()=>{adjTeamMoral(S.clubId,+5);toast('Elenco abraçou o discurso.');}},
      {label:'Ser cauteloso',eff:()=>{adjTeamMoral(S.clubId,+1);toast('Resposta morna.');}},
    ]}) },
];
let _srng=null; // story rng (set during rollStory so events are reproducible)
function srand(){ return _srng?_srng.random():Math.random(); }
function randPlayer(id){const sq=squad(id);return sq[Math.floor(srand()*sq.length)];}
function youngGem(id){const sq=squad(id).filter(p=>p.age<=21);return sq.length?sq[Math.floor(srand()*sq.length)]:randPlayer(id);}
function findP(name,id){return squad(id||S.clubId).find(p=>p.n===name);}
function setMoral(name,v){const p=findP(name);if(p)p.moral=clamp(v,0,100);}
function adjMoral(name,d){const p=findP(name);if(p)p.moral=clamp(p.moral+d,0,100);}
function adjTeamMoral(id,d,except){squad(id).forEach(p=>{if(p.n!==except)p.moral=clamp(p.moral+d,0,100);});}
function rollStory(R){
  _srng=R||null;
  const tot=STORY_EVENTS.reduce((s,e)=>s+e.w,0);let r=srand()*tot;
  for(const e of STORY_EVENTS){r-=e.w;if(r<=0){S.pendingEvent=e.gen();S.pendingEvent.eid=e.id;break;}}
  _srng=null;
}

/* ====================== TRANSFER MARKET ====================== */
/* asking price = live VM (idade+desempenho) + seller momentum ("luvas") */
function playerAsk(p, sellerId){
  let ask=computeVM(p)*1.15;
  const pos=sellerId?tablePos(sellerId):10;
  if(pos>=17)ask*=1.40;        // clube no Z-4 exige luvas p/ liberar
  else if(pos<=6)ask*=1.20;    // clube grande segura o atleta
  return Math.round(ask);
}

/* ---- rigorous 3-day negotiation cycle ----
   Dia 1 (fee): clube decide a taxa. Dia 2 (terms): empresário avalia salário.
   Dia 3 (verdict): jogador aceita/recusa a contraproposta.                 */
function startNego(sellerId,playerName,offerFee){
  if(!canNegotiate()) return -1; // fora da janela E da pré-janela: nem inicia negociação
  const p=findP(playerName,sellerId);
  S.negos.push({ sellerId, player:playerName, stage:'fee', status:'aberta',
    offerFee, clubCounter:null, feeAgreed:false,
    salary:Math.round((p.mv||1e6)*SAL_RATE), role:'Titular Regular',
    clauses:{gol:true, europa:false, europaValue:Math.round((p.mv||1e6)*2)},
    agentCounter:null, interest:0, day:S.day });
  save();
  return S.negos.length-1;
}
function clubRespond(n){ // Dia 1
  const p=findP(n.player,n.sellerId); const ask=playerAsk(p,n.sellerId);
  // se já houve contraproposta, cobrir o valor pedido FECHA o acordo (antes re-comparava
  // com o pedido original e gerava contrapropostas infinitas — oferta "igual" nunca era aceita)
  if(n.clubCounter && n.offerFee>=n.clubCounter){ n.feeAgreed=true; n.stage='terms'; return {ok:true,msg:'Clube aceitou a taxa! Negocie os termos pessoais (Dia 2).'}; }
  if(n.offerFee>=ask){ n.feeAgreed=true; n.stage='terms'; return {ok:true,msg:'Clube aceitou a taxa! Negocie os termos pessoais (Dia 2).'}; }
  if(n.offerFee>=ask*0.82){ n.clubCounter=Math.round((ask+n.offerFee)/2); n.stage='counterFee'; return {ok:false,counter:n.clubCounter,msg:`Clube pediu ${fmt(n.clubCounter)} pela taxa.`}; }
  n.status='recusada'; n.stage='done'; return {ok:false,msg:'Clube recusou de imediato.'};
}
function agentInterest(n){ // Dia 2 satisfaction %
  const p=findP(n.player,n.sellerId); if(!p)return 0;
  const expSal=Math.round((p.mv||1e6)*SAL_RATE*1.1);
  let i=45;
  i += n.salary>=expSal?22 : n.salary>=expSal*0.85?8 : -18;
  i += (n.role==='Jogador Chave'?14:n.role==='Titular Regular'?7:n.role==='Rotação'?0:-4);
  i += (p.age<=21 && n.role==='Jovem da Base')?6:0;
  i += (n.clauses.gol?4:0)+(n.clauses.europa?8:0);
  const pos=tablePos(S.clubId);
  i += (pos<=6?12: pos>=17?-14:0);
  if(isHot(p)) i-=8; // em fase => mais exigente
  return clamp(Math.round(i),0,99);
}
function agentRespond(n){ // Dia 2 -> Dia 3
  n.interest=agentInterest(n);
  const p=findP(n.player,n.sellerId);
  if(n.interest>=70){ n.stage='verdict'; return {ok:true,msg:'Empresário topou. Feche no Dia 3!'}; }
  if(n.interest>=45){ n.agentCounter=Math.round((p.mv||1e6)*SAL_RATE*1.15); n.stage='verdict'; return {ok:false,counter:n.agentCounter,msg:`Empresário pede ${fmt(n.agentCounter)}/sem.`}; }
  return {ok:false,msg:'Empresário sem interesse nas condições.'};
}

/* ====================== JANELA DE TRANSFERÊNCIAS ======================
   Datas reais da CBF pra 2026: 1ª janela 05/jan–27/mar (temporada começa
   28/jan), 2ª janela 20/jul–11/set. Mapeado pra número de rodada: nosso
   campeonato tem 38 rodadas (20 clubes, turno e returno) cobrindo
   28/jan a 02/dez — usamos a posição proporcional de cada janela real
   dentro desse intervalo pra calcular em que rodada ela abre/fecha.  */
const TRANSFER_WINDOWS=[[0,3],[19,24]]; // [rodada inicial, rodada final], inclusive — pré-temporada e meio de ano
const PRE_WINDOW_ROUNDS=3; // quantas rodadas ANTES da janela já dá pra pré-acordar (nunca muito longe)
function inTransferWindow(){ return TRANSFER_WINDOWS.some(([lo,hi])=>S.round>=lo && S.round<=hi); }
function nextWindowRound(){ for(const [lo] of TRANSFER_WINDOWS){ if(S.round<lo) return lo; } return null; }
/* pré-janela: dá pra NEGOCIAR (pré-acordar) até PRE_WINDOW_ROUNDS rodadas antes da abertura,
   mas o jogador só troca de clube quando a janela abre de fato. Retorna a rodada de abertura
   da próxima janela (o "executeRound" do pré-acordo) se estivermos na pré-janela; senão null. */
function inPreWindow(){
  if(inTransferWindow()) return null;
  const nw=nextWindowRound();
  return (nw!=null && nw-S.round>0 && nw-S.round<=PRE_WINDOW_ROUNDS) ? nw : null;
}
/* negociação liberada? (janela aberta OU pré-janela) */
function canNegotiate(){ return inTransferWindow() || !!inPreWindow(); }
function transferWindowStatus(){
  if(inTransferWindow()){ const w=TRANSFER_WINDOWS.find(([lo,hi])=>S.round>=lo&&S.round<=hi); return {open:true, closesIn:w[1]-S.round}; }
  const nxt=nextWindowRound();
  const pre=inPreWindow();
  return {open:false, pre:!!pre, opensIn: nxt!=null ? nxt-S.round : null};
}
/* executa os pré-acordos cuja rodada de abertura de janela chegou (chamado no avanço de rodada) */
function executePendingTransfers(){
  if(!S.pendingTransfers || !S.pendingTransfers.length) return;
  const stay=[];
  S.pendingTransfers.forEach(t=>{
    if(S.round < t.executeRound){ stay.push(t); return; } // ainda não abriu a janela
    S.roundNews=S.roundNews||[];
    if(t.kind==='buy'){
      // tira do vendedor (se ainda estiver lá), senão usa o snapshot guardado no acordo
      let p=(S.squads[t.sellerId]||[]).find(x=>x.n===t.playerName);
      if(p){ S.squads[t.sellerId]=S.squads[t.sellerId].filter(x=>x.n!==t.playerName); }
      else { p=t.snapshot; }
      if(!p) return;
      p.contract=t.contract; p.moral=75;
      MARKET.revalueOnTransfer(p, MARKET.divisionToLeague(S.division)); // gatilho de vitrine na chegada
      S.squads[S.clubId]=S.squads[S.clubId]||[]; S.squads[S.clubId].push(p);
      S.roundNews.push(`✍️ ${t.playerName} se apresentou ao ${clubOf(S.clubId).short} (transferência acordada, agora com a janela aberta).`);
    } else if(t.kind==='sell'){
      const p=(S.squads[S.clubId]||[]).find(x=>x.n===t.playerName);
      if(!p){ return; } // já saiu por outro caminho
      S.squads[S.clubId]=S.squads[S.clubId].filter(x=>x.n!==t.playerName);
      S.budget+=t.fee;
      if(t.buyerCountry) ensureBgClubMaterialized(t.buyerId);
      delete p.contract; delete p._pendingSale;
      if(S.squads[t.buyerId]) S.squads[t.buyerId].push(p);
      S.roundNews.push(`💰 ${t.playerName} deixou o clube rumo ao ${t.buyerName} por ${fmt(t.fee)} (transferência acordada).`);
      pushFinanceEntry({playerSales:t.fee, log:[`💰 ${t.playerName} vendido ao ${t.buyerName} por ${fmt(t.fee)}.`]});
    }
  });
  S.pendingTransfers=stay;
}


/* ---- Dia 3 (verdict): fecha a negociação de verdade — move o jogador,
   desconta o caixa, cria o contrato. Chamado pela UI quando o usuário aceita. ---- */
function finalizeTransfer(negoIdx){
  const preOpen=inPreWindow();
  if(!inTransferWindow() && !preOpen) return {ok:false,msg:'A janela de transferências está fechada.'};
  const n=S.negos[negoIdx]; if(!n || n.stage!=='verdict' || n.status!=='aberta') return {ok:false,msg:'Negociação inválida.'};
  const p=findP(n.player,n.sellerId); if(!p) return {ok:false,msg:'Jogador não encontrado.'};
  const fq=checkForeignQuota(p); if(!fq.ok) return {ok:false,msg:fq.msg}; // cota de estrangeiros da liga
  const totalCost=n.offerFee;
  if(totalCost>S.budget) return {ok:false,msg:'Caixa insuficiente pra fechar a taxa combinada.'};
  S.budget-=totalCost;
  const contract={ salary:n.salary, role:n.role, gotMatchesBonus:false, benchStreak:0,
    releaseClause: n.clauses.europa? n.clauses.europaValue : null };
  n.status='fechada'; n.stage='done';
  S.roundNews=S.roundNews||[];
  if(inTransferWindow()){
    // janela aberta: o jogador troca de clube AGORA
    S.squads[n.sellerId]=S.squads[n.sellerId].filter(x=>x.n!==p.n);
    p.contract=contract; p.moral=75;
    MARKET.revalueOnTransfer(p, MARKET.divisionToLeague(S.division)); // gatilho de vitrine
    S.squads[S.clubId]=S.squads[S.clubId]||[]; S.squads[S.clubId].push(p);
    S.roundNews.push(`✍️ ${p.n} contratado do ${clubOf(n.sellerId).short} por ${fmt(totalCost)}.`);
    pushFinanceEntry({playerPurchases:totalCost, log:[`✍️ ${p.n} contratado do ${clubOf(n.sellerId).short} por ${fmt(totalCost)}.`]});
    save();
    return {ok:true,msg:`${p.n} agora joga pelo ${clubOf(S.clubId).short}!`};
  }
  // PRÉ-ACORDO (pré-janela): fecha o negócio agora, mas o jogador só chega na abertura da janela.
  S.pendingTransfers=S.pendingTransfers||[];
  S.pendingTransfers.push({ kind:'buy', sellerId:n.sellerId, playerName:p.n, snapshot:p,
    contract, fee:totalCost, executeRound:preOpen });
  S.roundNews.push(`🤝 Acordo fechado: ${p.n} chega do ${clubOf(n.sellerId).short} na abertura da janela (rodada ${preOpen+1}). Pago ${fmt(totalCost)}.`);
  pushFinanceEntry({playerPurchases:totalCost, log:[`🤝 ${p.n} pré-contratado do ${clubOf(n.sellerId).short} por ${fmt(totalCost)}.`]});
  save();
  return {ok:true,msg:`Acordo fechado! ${p.n} chega na abertura da janela (rodada ${preOpen+1}).`};
}
/* ---- transferências entre CPUs, 100% em segundo plano — dão vida ao mercado
   mesmo se o usuário nunca comprar/vender nada (essencial no modo solo). ---- */
function cpuBackgroundTransfers(R){
  if(!inTransferWindow()) return; // CPUs também só negociam dentro da janela — mercado realista
  R=R||makeRng(hashSeed(S.seed,S.round,'cpumkt'));
  const cpuClubs=DATA.clubs.filter(c=>c.id!==S.clubId);
  if(cpuClubs.length<2) return;
  const nTransfers=2+Math.floor(R.rnd(0,3)); // 2-4 por rodada — liga do usuário é o mercado mais ativo/real
  for(let i=0;i<nTransfers;i++){
    const seller=cpuClubs[Math.floor(R.random()*cpuClubs.length)];
    const sellerSquad=S.squads[seller.id]; if(!sellerSquad || sellerSquad.length<=16) continue; // não deixa o elenco vazio
    // vende preferencialmente banco (não titular óbvio): pega entre os 40% mais fracos do elenco
    const sorted=sellerSquad.slice().sort((a,b)=>b.f-a.f);
    const pool=sorted.slice(Math.ceil(sorted.length*0.5));
    if(!pool.length) continue;
    const p=pool[Math.floor(R.random()*pool.length)];
    const buyers=cpuClubs.filter(c=>c.id!==seller.id);
    const buyer=buyers[Math.floor(R.random()*buyers.length)];
    if(!buyer) continue;
    const fee=Math.round((p.mv||1e6)*(0.6+R.random()*0.6));
    S.squads[seller.id]=sellerSquad.filter(x=>x.n!==p.n);
    S.squads[buyer.id]=S.squads[buyer.id]||[]; S.squads[buyer.id].push(p);
    S.roundNews=S.roundNews||[];
    S.roundNews.push(`🔄 ${p.n} foi negociado do ${seller.short} pro ${buyer.short} por ${fmt(fee)}.`);
  }
}
/* ---- mercado das LIGAS DE BACKGROUND: os clubes estrangeiros negociam entre si (compra e
   venda), dando vida às ligas que rodam sozinhas. Mesma cadência do mercado da liga do
   usuário (0-2 por país/rodada, só na janela). Materializa os clubes envolvidos sob demanda.
   As trocas ficam dentro de cada país (não misturamos elencos entre ligas). ---- */
function bgCpuTransfers(R){
  if(!S.bgLeagues || !inTransferWindow()) return;
  R=R||makeRng(hashSeed(S.seed,S.round,'bgcpumkt'));
  const countries=Object.keys(S.bgLeagues);
  // clubes de cada país (todas as divisões)
  const clubsByCountry={};
  countries.forEach(c=>{ const ids=[]; Object.keys(S.bgLeagues[c].divs).forEach(d=>ids.push(...(S.bgLeagues[c].divs[d].clubIds||[]))); clubsByCountry[c]=ids; });
  countries.forEach(country=>{
    const sellers=clubsByCountry[country]; if(sellers.length<2) return;
    // mais LENTO/RARO que a liga do usuário: na maioria das rodadas de janela, 0; às vezes 1.
    if(R.random()>0.45) return;               // ~55% das rodadas de janela: nenhuma transferência
    const nT=R.random()<0.2?2:1;              // quase sempre 1, raramente 2
    for(let i=0;i<nT;i++){
      const sellerId=sellers[Math.floor(R.random()*sellers.length)];
      if(!ensureBgClubMaterialized(sellerId)) continue;
      const sq=S.squads[sellerId]; if(!sq || sq.length<=18) continue; // não esvazia o elenco
      const sorted=sq.slice().sort((a,b)=>b.f-a.f);
      const pool=sorted.slice(Math.ceil(sorted.length*0.5)); if(!pool.length) continue; // vende metade mais fraca
      const p=pool[Math.floor(R.random()*pool.length)];
      // comprador: às vezes de OUTRO país (transferência entre países), como na vida real
      let buyerCountry=country, buyerLog=S.bgLeagues[country];
      if(countries.length>1 && R.random()<0.4){ // ~40%: cross-país
        buyerCountry=countries[Math.floor(R.random()*countries.length)];
        buyerLog=S.bgLeagues[buyerCountry];
      }
      const buyers=clubsByCountry[buyerCountry];
      const buyerId=buyers[Math.floor(R.random()*buyers.length)];
      if(buyerId===sellerId || !ensureBgClubMaterialized(buyerId)) continue;
      const fee=Math.round((p.mv||1e6)*(0.6+R.random()*0.6));
      S.squads[sellerId]=sq.filter(x=>x.n!==p.n);
      S.squads[buyerId]=S.squads[buyerId]||[]; S.squads[buyerId].push(p);
      const fromShort=(intlClubById(sellerId)||{}).short||sellerId, toShort=(intlClubById(buyerId)||{}).short||buyerId;
      // registra a transferência nos DOIS países envolvidos (origem e destino)
      const entry={ player:p.n, from:fromShort, to:toShort, fee, season:S.season, cross:buyerCountry!==country };
      [S.bgLeagues[country], buyerLog].forEach(LG=>{ if(!LG) return; LG.transferLog=LG.transferLog||[]; LG.transferLog.unshift(entry); if(LG.transferLog.length>50) LG.transferLog.pop(); });
    }
  });
}
/* ---- PROPOSTAS DE COMPRA recebidas: clubes (da liga do usuário OU das ligas de background,
   inclusive de outros países) fazem ofertas em dinheiro pelos jogadores do usuário, que pode
   aceitar (vende) ou recusar. Dá o outro lado do mercado — não só o usuário compra/vende, o
   mundo também vem atrás das suas estrelas. Gerado nas janelas de transferência. ---- */
function pruneIncomingOffers(){ S.incomingOffers=(S.incomingOffers||[]).filter(o=>o.expiresRound>S.round); }
function generateIncomingOffers(R){
  pruneIncomingOffers();
  if(!canNegotiate()) return; // propostas chegam na janela E na pré-janela
  R=R||makeRng(hashSeed(S.seed,S.round,'incoming'));
  if((S.incomingOffers||[]).length>=4) return;   // no máximo 4 propostas pendentes
  if(R.random()>0.5) return;                       // nem toda rodada de janela gera proposta
  const mySquad=S.squads[S.clubId]||[]; if(mySquad.length<=16) return;
  const pending=new Set((S.incomingOffers||[]).map(o=>o.playerName));
  // clubes miram preferencialmente os melhores do elenco (que ainda não têm proposta)
  const targets=mySquad.filter(p=>!pending.has(p.n)&&!p._pendingSale).sort((a,b)=>b.f-a.f).slice(0, Math.max(3,Math.ceil(mySquad.length*0.4)));
  if(!targets.length) return;
  const p=targets[Math.floor(R.random()*targets.length)];
  // candidatos a comprador: liga do usuário + ligas de background (entre países)
  const cand=[];
  DATA.clubs.filter(c=>c.id!==S.clubId).forEach(c=>cand.push({id:c.id,name:c.short,country:null,overall:c.overall||70}));
  Object.keys(S.bgLeagues||{}).forEach(country=>Object.keys(S.bgLeagues[country].divs).forEach(d=>
    (S.bgLeagues[country].divs[d].clubIds||[]).forEach(id=>{ const c=intlClubById(id); if(c) cand.push({id,name:c.short,country,overall:c.overall||70}); })));
  if(!cand.length) return;
  // só clubes de nível compatível miram o jogador (overall de elenco ~80 no topo vs força
  // individual até ~92, então usamos uma folga maior). Sem clube compatível => sem proposta
  // (realista: ninguém "fraco" oferece pela sua estrela).
  const eligible=cand.filter(c=>c.overall>=p.f-12);
  if(!eligible.length) return;
  const buyer=eligible[Math.floor(R.random()*eligible.length)];
  const fee=Math.round((p.mv||1e6)*(1.0+R.random()*0.7)); // 1.0-1.7x (proposta cheia, às vezes acima)
  // teto do comprador pra regatear: acima da 1ª oferta, maior se o jogador está em fase
  // (mais valorizado) — é até onde ele topa subir numa contraproposta sua.
  const maxFee=Math.round(fee*(1.15 + (isHot(p)?0.2:0) + R.random()*0.15));
  S.incomingOffers=S.incomingOffers||[];
  S.incomingOffers.push({ id:(hashSeed(S.seed,S.round,p.n,buyer.id)>>>0), buyerId:buyer.id, buyerName:buyer.name,
    buyerCountry:buyer.country, playerName:p.n, playerForce:p.f, fee, maxFee, negRound:0, lastMsg:null, expiresRound:S.round+3 });
  S.roundNews=S.roundNews||[];
  S.roundNews.push(`📩 ${buyer.name}${buyer.country?' ('+buyer.country+')':''} ofereceu ${fmt(fee)} por ${p.n}. Veja em Jogador → Propostas recebidas.`);
}
function acceptIncomingOffer(id){
  const o=(S.incomingOffers||[]).find(x=>x.id===id); if(!o) return {ok:false,msg:'Proposta não existe mais.'};
  const p=(S.squads[S.clubId]||[]).find(x=>x.n===o.playerName); if(!p) return {ok:false,msg:'Jogador não está mais no elenco.'};
  if((S.squads[S.clubId]||[]).length<=15) return {ok:false,msg:'Elenco pequeno demais pra vender.'};
  const preOpen=inPreWindow();
  S.incomingOffers=(S.incomingOffers||[]).filter(x=>x.id!==id);
  S.roundNews=S.roundNews||[];
  if(!inTransferWindow() && preOpen){
    // PRÉ-ACORDO: aceita agora, mas o jogador só sai na abertura da janela (segue jogando até lá)
    p._pendingSale=true;
    S.pendingTransfers=S.pendingTransfers||[];
    S.pendingTransfers.push({ kind:'sell', playerName:o.playerName, buyerId:o.buyerId, buyerName:o.buyerName,
      buyerCountry:o.buyerCountry, fee:o.fee, executeRound:preOpen });
    S.roundNews.push(`🤝 Acordo fechado: ${o.playerName} vai pro ${o.buyerName} na abertura da janela (rodada ${preOpen+1}) por ${fmt(o.fee)}.`);
    save();
    return {ok:true, msg:`Acordo fechado! ${o.playerName} sai na abertura da janela.`};
  }
  // janela aberta: sai agora
  S.squads[S.clubId]=S.squads[S.clubId].filter(x=>x.n!==o.playerName);
  S.budget+=o.fee;
  if(o.buyerCountry) ensureBgClubMaterialized(o.buyerId);
  if(S.squads[o.buyerId]){ delete p.contract; S.squads[o.buyerId].push(p); } // vai pro clube comprador
  S.roundNews.push(`💰 ${o.playerName} vendido ao ${o.buyerName} por ${fmt(o.fee)}.`);
  pushFinanceEntry({playerSales:o.fee, log:[`💰 ${o.playerName} vendido ao ${o.buyerName} por ${fmt(o.fee)}.`]});
  save();
  return {ok:true, msg:`${o.playerName} vendido por ${fmt(o.fee)}!`};
}
function rejectIncomingOffer(id){ S.incomingOffers=(S.incomingOffers||[]).filter(x=>x.id!==id); save(); return {ok:true}; }
/* CONTRAPROPOSTA numa proposta recebida: você pede um valor maior; o comprador responde
   conforme o teto que ele topa pagar (maxFee — que já pesa valor de mercado + fase do jogador).
   - pedido <= oferta atual: aceita na hora (você abriu mão) -> o.state 'agreed'
   - pedido <= teto: o comprador topa esse valor -> o.state 'agreed' (é só confirmar)
   - pedido acima do teto: sobe um meio-termo (até o teto) e devolve; após 3 rodadas ou
     ganância grande (>1.3x teto), dá a palavra final (não passa do teto). */
function counterIncomingOffer(id, askFee){
  const o=(S.incomingOffers||[]).find(x=>x.id===id); if(!o) return {ok:false,msg:'Proposta não existe mais.'};
  if(o.state==='final'){ return {ok:false, msg:`${o.buyerName} já deu a palavra final: ${fmt(o.fee)}. Aceite ou recuse.`, final:true}; }
  askFee=Math.round(askFee)||0;
  o.negRound=(o.negRound||0)+1;
  if(askFee<=o.fee){ o.lastMsg=`Seu pedido ficou abaixo da oferta — segue valendo ${fmt(o.fee)}.`; save(); return {ok:true, agreed:true, msg:o.lastMsg}; }
  if(askFee<=o.maxFee){
    o.fee=askFee; o.state='agreed'; o.lastMsg=`${o.buyerName} topou ${fmt(askFee)}! Confirme a venda.`;
    save(); return {ok:true, agreed:true, msg:o.lastMsg};
  }
  if(o.negRound>=3 || askFee>o.maxFee*1.3){
    o.fee=o.maxFee; o.state='final'; o.lastMsg=`${o.buyerName} não passa de ${fmt(o.maxFee)} (proposta final).`;
    save(); return {ok:false, final:true, msg:o.lastMsg};
  }
  o.fee=Math.min(o.maxFee, Math.round((o.fee+askFee)/2)); o.lastMsg=`${o.buyerName} subiu pra ${fmt(o.fee)}. Aceite ou peça mais.`;
  save(); return {ok:false, countered:true, msg:o.lastMsg};
}
/* ---- pool de leilão: uma seleção rotativa de jogadores de OUTROS clubes,
   compra direta (sem regatear) — "Leilão de jogadores" pedido pelo sócio ---- */
function refreshAuctionPool(R){
  if(!inTransferWindow()){ S.auctionPool={round:S.round,picks:[]}; return; } // sem leilão fora da janela
  const profile=(S.config&&S.config.profile)||{}; const mode=profile.auctionMode||'todos';
  if(mode==='nenhum'){ S.auctionPool={round:S.round,picks:[]}; return; } // preferência do treinador: não comprar em leilão
  R=R||makeRng(hashSeed(S.seed,S.round,'auction'));
  const cpuClubs=DATA.clubs.filter(c=>c.id!==S.clubId);
  const mySquad=S.squads[S.clubId]||[];
  const myAvgForce=mySquad.length? mySquad.reduce((s,p)=>s+p.f,0)/mySquad.length : 65;
  const picks=[];
  const tries=Math.min(8, cpuClubs.length);
  for(let i=0;i<tries;i++){
    const club=cpuClubs[Math.floor(R.random()*cpuClubs.length)];
    const sq=S.squads[club.id]; if(!sq || sq.length<=16) continue;
    const p=sq[Math.floor(R.random()*sq.length)];
    if(picks.some(x=>x.player===p.n)) continue;
    // "não quero fazer ofertas aos jogadores mais fracos": pula quem está bem abaixo da força média do seu elenco
    if(mode==='sem_fracos' && p.f < myAvgForce*0.85) continue;
    picks.push({ sellerId:club.id, player:p.n, price:Math.round((p.mv||1e6)*(0.85+R.random()*0.5)) });
  }
  S.auctionPool={ round:S.round, picks };
}
function buyFromAuction(sellerId, playerName){
  if(!inTransferWindow()) return {ok:false,msg:'A janela de transferências está fechada.'};
  if(((S.config&&S.config.profile&&S.config.profile.auctionMode)||'todos')==='nenhum')
    return {ok:false,msg:'Você desligou compras em leilão no seu Perfil (Treinador > Perfil).'};
  const pool=(S.auctionPool&&S.auctionPool.picks)||[];
  const pick=pool.find(x=>x.sellerId===sellerId && x.player===playerName);
  if(!pick) return {ok:false,msg:'Esse jogador não está mais disponível no leilão.'};
  const p=findP(playerName, sellerId); if(!p) return {ok:false,msg:'Jogador não encontrado.'};
  const fq=checkForeignQuota(p); if(!fq.ok) return {ok:false,msg:fq.msg}; // cota de estrangeiros da liga
  if(pick.price>S.budget) return {ok:false,msg:'Caixa insuficiente.'};
  S.budget-=pick.price;
  S.squads[sellerId]=S.squads[sellerId].filter(x=>x.n!==p.n);
  p.contract={ salary:Math.round((p.mv||1e6)*SAL_RATE), role:'Rotação', gotMatchesBonus:false, benchStreak:0, releaseClause:null };
  p.moral=75;
  MARKET.revalueOnTransfer(p, MARKET.divisionToLeague(S.division)); // gatilho de vitrine (spec §4)
  S.squads[S.clubId].push(p);
  S.auctionPool.picks=S.auctionPool.picks.filter(x=>x!==pick);
  S.roundNews=S.roundNews||[]; S.roundNews.push(`🔨 ${p.n} arrematado no leilão por ${fmt(pick.price)}.`);
  pushFinanceEntry({playerPurchases:pick.price, log:[`🔨 ${p.n} arrematado no leilão por ${fmt(pick.price)}.`]});
  save();
  return {ok:true,msg:`${p.n} comprado no leilão!`};
}


/* ====================== COMPETIÇÕES (Copa do Brasil, Libertadores, Sul-Americana) ======================
   Adaptação: o universo do jogo tem só os 20 clubes da Série A (sem as divisões de
   acesso nem os ~106 clubes estaduais que entram na Copa do Brasil real de 126 times).
   Por isso a Copa do Brasil aqui é um mata-mata entre os 20 clubes da Série A —
   mesmo formato de eliminação, escala adaptada ao nosso universo de dados.
   Classificação pra Libertadores/Sul-Americana segue a REGRA REAL 2026 (simplificada,
   sem "vaga deslocada" por acúmulo de títulos): G6 do Brasileirão -> Libertadores
   (4 direto à fase de grupos + 2 na fase preliminar); 7º ao 12º -> Sul-Americana.  */
const COMP_DEFS={
  serieA:{id:'serieA',name:'Brasileirão Série A',short:'Série A',type:'liga'},
  copaBrasil:{id:'copaBrasil',name:'Copa do Brasil',short:'Copa do Brasil',type:'mata-mata'},
  libertadores:{id:'libertadores',name:'Copa Libertadores',short:'Libertadores',type:'mata-mata'},
  sulamericana:{id:'sulamericana',name:'Copa Sul-Americana',short:'Sul-Americana',type:'mata-mata'},
  championsLeague:{id:'championsLeague',name:'UEFA Champions League',short:'Champions League',type:'mata-mata'},
  europaLeague:{id:'europaLeague',name:'UEFA Europa League',short:'Europa League',type:'mata-mata'}
};
/* calcula quem se classifica pras copas continentais + Copa do Brasil, a partir
   da tabela final (ordenada, posição 0 = campeão) da Série A da temporada ANTERIOR */
function computeQualification(finalTableSorted){
  const ids=finalTableSorted.map(r=>r.id);
  return {
    libertadores: ids.slice(0,6),     // G6: 4 fase de grupos + 2 pré-Libertadores (só Série A, como na vida real)
    sulamericana: ids.slice(6,12)     // 7º ao 12º colocado
  };
}
/* ================= PAÍSES/BANDEIRAS (clubes da CONMEBOL) =================
   Todo o resto do universo (Séries A/B/C/D) é brasileiro; clubes estrangeiros (Libertadores/
   Sul-Americana) carregam seu país real, pra aparecer com bandeira certa em qualquer tela que
   mostre nacionalidade do clube (visualizar time, ficha de jogador etc.), igual já acontece
   pros clubes brasileiros. */
const CONMEBOL_COUNTRIES={
  BRA:{flag:'🇧🇷',name:'Brasil'}, ARG:{flag:'🇦🇷',name:'Argentina'}, CHI:{flag:'🇨🇱',name:'Chile'},
  COL:{flag:'🇨🇴',name:'Colômbia'}, PER:{flag:'🇵🇪',name:'Peru'}, URU:{flag:'🇺🇾',name:'Uruguai'},
  PAR:{flag:'🇵🇾',name:'Paraguai'}, ECU:{flag:'🇪🇨',name:'Equador'}, VEN:{flag:'🇻🇪',name:'Venezuela'},
  BOL:{flag:'🇧🇴',name:'Bolívia'}
};
function clubCountry(c){ return (c&&c.country) || CONMEBOL_COUNTRIES.BRA; }

/* ================= CLASSIFICAÇÃO REAL PRA LIBERTADORES/SUL-AMERICANA 2026 =================
   A 1ª temporada do jogo (2026) não tem uma "Série A do ano anterior" simulada de verdade —
   por isso, em vez de usar um proxy (força/overall), usamos os GRUPOS REAIS do sorteio
   CONMEBOL 2026 (checado jul/2026), pra o calendário 2026 já nascer batendo com a vida real —
   se o time do usuário estiver mesmo classificado este ano, ele já entra jogando a copa.
   A partir da 2ª temporada em diante, a classificação volta a ser 100% dinâmica (baseada no
   que realmente aconteceu na Série A simulada do jogo — ver computeQualification acima).
   Botafogo (7º colocado do Brasileirão 2025) perdeu a fase preliminar da Libertadores e caiu
   pra Sul-Americana (grupo E) — por isso não aparece em nenhum grupo da Libertadores abaixo. */

/* ================= CLUBES ESTRANGEIROS (grupos reais 2026) =================
   Nosso universo só tem elenco de verdade pros clubes brasileiros; os adversários estrangeiros
   recebem um elenco GERADO (nomes hispano-americanos + força competitiva de fase de grupos),
   já que não temos os elencos reais deles — mas o NOME, o PAÍS e o GRUPO de cada um são os
   reais (sorteio oficial CONMEBOL Libertadores/Sul-Americana 2026, checado jul/2026). */
const INTL_FIRST=['Martín','Diego','Franco','Nicolás','Iván','Bruno','Gonzalo','Sebastián','Rodrigo','Emiliano','Cristian','Federico','Agustín','Maximiliano','Ezequiel','Leandro','Matías','Joaquín','Tomás','Julián','Rafael','Andrés','Carlos','Luis','Pedro'];
const INTL_LAST=['Gómez','Fernández','Rodríguez','Sosa','Díaz','Romero','Torres','Núñez','Silva','Acosta','Ramírez','Vega','Cabrera','Godoy','Molina','Ortiz','Benítez','Aguirre','Suárez','Ibáñez','Herrera','Castro','Flores','Rojas','Medina'];
function pickIntlPlayerName(R){
  let nm,tries=0;
  do{ nm=INTL_FIRST[Math.floor(R.random()*INTL_FIRST.length)]+' '+INTL_LAST[Math.floor(R.random()*INTL_LAST.length)]; tries++; }
  while(PROC_USED_NAMES.has(nm) && tries<300);
  PROC_USED_NAMES.add(nm);
  return nm;
}
function intlClubId(name){ return 'intl_'+name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_'); }
function makeIntlClub(name, countryCode){
  const id=intlClubId(name);
  const R=makeRng(hashSeed('intlclub',name));
  const country=CONMEBOL_COUNTRIES[countryCode]||CONMEBOL_COUNTRIES.ARG;
  const overall=Math.round(64+R.random()*20); // 64-84: nível competitivo de fase de grupos
  const squad=[];
  const posPlan=[['GK',2],['DEF',6],['MID',6],['ATT',4]];
  posPlan.forEach(([pos,cnt])=>{ for(let k=0;k<cnt;k++){
    const f=Math.max(45,Math.min(92,Math.round(overall-8+R.random()*16)));
    const age=Math.round(19+R.random()*15);
    // liga = código do país CONMEBOL (fora do mapa de ligas modeladas → MVL de fallback)
    squad.push({n:pickIntlPlayerName(R), p:pos, s:pos, f, age, lg:countryCode,
      mv:MARKET.marketValue(f,age,countryCode), ft:R.random()<0.75?'R':'L', num:String(Math.floor(R.random()*40)+1), nat:country.name, ag:'—', moral:70, energy:100}); } });
  return { id, tk:id, name, short:name.length>14?name.slice(0,14):name,
    color:'#'+Math.floor(R.random()*16777215).toString(16).padStart(6,'0'), color2:'#FFFFFF', crest:null,
    OS:overall,MS:overall,DS:overall,overall, squad, country };
}
/* garante elenco carregado (S.squads) e registro (S.intlClubs) pra um clube estrangeiro */
function ensureIntlClub(name, countryCode){
  const id=intlClubId(name);
  S.intlClubs=S.intlClubs||{};
  if(!S.intlClubs[id]){
    const c=makeIntlClub(name, countryCode);
    S.intlClubs[id]=c;
    S.squads[id]=c.squad.map(p=>attachAttrs(initStats({...p})));
  }
  return id;
}
/* uma entrada de grupo é o id brasileiro (string numérica, já existe em DATA/clubPool) ou
   [nome, código do país] pra um clube estrangeiro (gerado sob demanda) */
function resolveGroupEntry(e){ return typeof e==='string' ? e : ensureIntlClub(e[0], e[1]); }
function buildRealGroups(defs){
  const groups={};
  Object.entries(defs).forEach(([label,entries])=>{ groups[label]=entries.map(resolveGroupEntry); });
  return groups;
}
/* grupos oficiais da fase de grupos da Libertadores 2026 (sorteio CONMEBOL, checado jul/2026)
   — cada grupo tem 1 brasileiro (exceto B e H, só estrangeiros) + 3 estrangeiros. */
const LIBERTADORES_GROUPS_2026={
  A:['614',['Estudiantes','ARG'],['Independiente Medellín','COL'],['Cusco','PER']],
  B:[['Coquimbo','CHI'],['Tolima','COL'],['Nacional','URU'],['Universitario','PER']],
  C:[['Independiente Rivadavia','ARG'],'2462',['Bolívar','BOL'],['Deportivo La Guaira','VEN']],
  D:[['Universidad Católica','CHI'],'609',['Boca','ARG'],['BSC','ECU']],
  E:['199',['Platense','ARG'],['Santa Fe','COL'],['Peñarol','URU']],
  F:[['CCP','PAR'],'1023',['Sporting Cristal','PER'],['Junior','COL']],
  G:[['LDU Quito','ECU'],'3876',['Lanús','ARG'],['Always Ready','BOL']],
  H:[['Independiente del Valle','ECU'],['Central','ARG'],['Universidad Central','VEN'],['Libertad','PAR']]
};
/* grupos oficiais da fase de grupos da Sul-Americana 2026 (sorteio CONMEBOL, checado jul/2026)
   — 7 brasileiros: Atlético-MG(B), São Paulo(C), Santos(D), Botafogo(E), Grêmio(F), Vasco(G),
   Red Bull Bragantino(H). Bahia NÃO está classificado pra nenhuma copa continental em 2026. */
const SULAMERICANA_GROUPS_2026={
  A:[['Macará','ECU'],['Tigre','ARG'],['América de Cali','COL'],['Alianza Atlético','PER']],
  B:['330',['Cienciano','PER'],['Juventud','URU'],['Puerto Cabello','VEN']],
  C:['585',['O’Higgins','CHI'],['Millonarios','COL'],['Boston River','URU']],
  D:[['Recoleta','PAR'],'221',['San Lorenzo','ARG'],['Deportivo Cuenca','ECU']],
  E:['537',['Caracas','VEN'],['Racing Club','ARG'],['Independiente','ARG']],
  F:[['Montevideo City','URU'],'210',['Deportivo Riestra','ARG'],['Palestino','CHI']],
  G:[['Olimpia Asunción','PAR'],'978',['Audax Italiano','CHI'],['Barracas Central','ARG']],
  H:[['River Plate','ARG'],'8793',['Carabobo','VEN'],['Blooming','BOL']]
};
function real2026Qualification(){
  return {
    libertadoresGroups: buildRealGroups(LIBERTADORES_GROUPS_2026), // grupos reais A-H, só na temporada 2026
    sulamericanaGroups: buildRealGroups(SULAMERICANA_GROUPS_2026)
  };
}
/* Copa do Brasil reúne clubes das QUATRO divisões (A/B/C/D), como na competição real —
   não é uma copa só de Série A. makeBracket já dá bye pros clubes mais fortes (por overall)
   quando o total não é potência de 2, então os grandes da Série A começam mais à frente,
   igual ao formato real, sem precisar de fases separadas por divisão. */
function copaBrasilQualification(){
  const all=new Set();
  DIV_ORDER.forEach(d=>{ ensureDivisionClubs(d).forEach(c=>all.add(c.id)); });
  return Array.from(all);
}
/* monta chaveamento de mata-mata determinístico: melhores clubes (por overall) recebem
   bye se o número de participantes não for potência de 2; demais são sorteados (seed fixa) */
function makeBracket(teamIds, seedNum){
  const R=makeRng(seedNum>>>0);
  const ranked=teamIds.slice().sort((a,b)=>clubOf(b).overall-clubOf(a).overall);
  let size=1; while(size<ranked.length) size*=2;
  const nByes=size-ranked.length;
  const byeTeams=ranked.slice(0,nByes);
  const playTeams=ranked.slice(nByes);
  for(let i=playTeams.length-1;i>0;i--){ const j=Math.floor(R.random()*(i+1)); [playTeams[i],playTeams[j]]=[playTeams[j],playTeams[i]]; }
  const ties=[]; for(let i=0;i<playTeams.length;i+=2){ ties.push({h:playTeams[i],a:playTeams[i+1],hg:null,ag:null,winner:null,events:[]}); }
  return { round:1, roundsTotal:Math.log2(size), byeTeams:byeTeams.slice(), ties, pendingByes:byeTeams.slice(), champion:null, eliminated:{}, history:[] };
}
function cupIsFinished(b){ return !!b.champion; }
function cupTeamAlive(b,id){ if(!b) return false; if(b.champion===id) return true; if(b.eliminated[id]) return false;
  return b.ties.some(t=>t.h===id||t.a===id) || (b.pendingByes||[]).includes(id) || (b.round>1 && !b.eliminated[id] && b.history.some(h=>h.advanced&&h.advanced.includes(id))) ; }
/* resolve TODAS as partidas pendentes da rodada atual de um mata-mata (quick-sim
   completo, com cartões/lesões/suspensões aplicados igual às partidas de liga) */
function advanceCupBracket(b, roundLabel){
  if(!b || cupIsFinished(b)) return;
  const winners=[];
  b.ties.forEach(t=>{
    if(t.winner) { winners.push(t.winner); return; }
    const seed=hashSeed(S.seed,'cup',roundLabel,t.h,t.a);
    const evs=[]; let fin=null;
    const sim=simulateMatch(t.h,t.a,false,(tk)=>{ if(tk.ev) evs.push(tk.ev); },(r)=>fin=r,seed);
    let g=0; while(!fin&&g++<600) sim.step();
    t.hg=fin.hg; t.ag=fin.ag; t.events=evs;
    applyResult1off(t.h,t.a,fin.hg,fin.ag);
    const Rm=makeRng(hashSeed(seed,'rate'));
    applyMatchIncidents(evs);
    ratePlayers(t.h,fin.hg,fin.ag,fin.scorers,Rm,fin.perf&&fin.perf.H,fin.perf&&fin.perf.A); ratePlayers(t.a,fin.ag,fin.hg,fin.scorers,Rm,fin.perf&&fin.perf.A,fin.perf&&fin.perf.H);
    // empate no tempo normal: prorrogação + pênaltis de verdade (ver resolveDrawnKnockoutTie
    // em simulate.js) — nada de sorteio 50/50, e a MESMA seed de sempre garante que bate com
    // o que a partida ao vivo/espectador já mostrou, se for o caso.
    const res=resolveDrawnKnockoutTie(t.h,t.a,seed,fin.hg,fin.ag);
    t.winner=res.winner; t.pens=res.pens||null; winners.push(res.winner);
    const loser=res.winner===t.h?t.a:t.h; b.eliminated[loser]=true;
  });
  const advancing=winners.concat(b.pendingByes||[]);
  b.history.push({round:b.round,ties:b.ties.slice(),advanced:advancing.slice()});
  if(advancing.length<=1){ b.champion=advancing[0]||null; b.ties=[]; b.pendingByes=[]; return; }
  b.round++;
  let size=1; while(size<advancing.length) size*=2;
  const nByes=size-advancing.length;
  const ranked=advancing.slice().sort((x,y)=>clubOf(y).overall-clubOf(x).overall);
  b.pendingByes=ranked.slice(0,nByes);
  const rest=ranked.slice(nByes);
  b.ties=[]; for(let i=0;i<rest.length;i+=2){ b.ties.push({h:rest[i],a:rest[i+1],hg:null,ag:null,winner:null,events:[]}); }
}
/* aplica resultado de UMA partida avulsa (copas) sem mexer na tabela da liga */
function applyResult1off(h,a,hg,ag){ /* copas não têm tabela de pontos corridos; placar já fica no objeto da chave */ }

/* ================= FASE DE GRUPOS (Libertadores/Sul-Americana) =================
   Copa do Brasil é só mata-mata, igual à vida real (COMP_HAS_GROUP não a inclui).
   Libertadores/Sul-Americana têm fase de grupos de verdade, com um ou mais grupos
   nomeados (turno-e-returno dentro de cada grupo, mesmo motor da liga) — os melhores
   colocados de cada grupo avançam pro mata-mata (playoff/chaveamento), igual ao formato
   real. Na temporada 2026 a Libertadores usa os 8 grupos reais (A-H, com adversários
   estrangeiros — ver LIBERTADORES_GROUPS_2026); Sul-Americana e temporadas seguintes (sem
   um sorteio real conhecido) usam um grupo único com todos os classificados brasileiros. */
const COMP_HAS_GROUP={copaBrasil:false, libertadores:true, sulamericana:true, championsLeague:true, europaLeague:true};
/* copas do universo ativo. Brasil: Copa do Brasil + Libertadores + Sul-Americana.
   Internacional: Champions League + Europa League (só as continentais de grupos+mata-mata).
   groupCupKeys = as que têm fase de grupos; allCupKeys = todas (inclui mata-mata puro). */
function groupCupKeys(){ return isIntlUniverse() ? ['championsLeague','europaLeague'] : ['libertadores','sulamericana']; }
function allCupKeys(){ return isIntlUniverse() ? ['championsLeague','europaLeague'] : ['copaBrasil','libertadores','sulamericana']; }
function makeGroupStage(groupsMap, advancePerGroup){
  const groups={};
  Object.entries(groupsMap).forEach(([label,ids])=>{
    const table={}; ids.forEach(id=>table[id]={id,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0});
    groups[label]={label, teams:ids.slice(), table, sched:makeSchedule(ids.slice())};
  });
  const roundsTotal=Math.max(1,...Object.values(groups).map(g=>g.sched.length));
  return { groups, round:0, roundsTotal, finished:false, advancePerGroup: advancePerGroup||2 };
}
function groupTableStandings(g){
  return Object.values(g.table).sort((a,b)=>b.Pts-a.Pts||(b.GF-b.GA)-(a.GF-a.GA)||b.GF-a.GF);
}
/* atalho pra UI/compat: standings do grupo único quando só existe um (Sul-Americana) */
function groupStageStandings(mg){
  const only=Object.values(mg.groups)[0];
  return only ? groupTableStandings(only) : [];
}
function advanceGroupStageRound(mg, roundLabel){
  if(!mg || mg.finished) return;
  Object.values(mg.groups).forEach(g=>{
    const fx=(g.sched[mg.round])||[];
    fx.forEach(([h,a])=>{
      if(h==null||a==null) return; // bye (número ímpar de times no grupo)
      // partida do usuário já jogada ao vivo nesta rodada (ver finishCupLiveMatch) — pula
      // só ela, o resto do grupo simula normalmente.
      if((h===CL.clubId||a===CL.clubId) && mg._userRoundDone===mg.round) return;
      const seed=hashSeed(S.seed,roundLabel,g.label,h,a);
      const evs=[]; let fin=null;
      const sim=simulateMatch(h,a,false,(tk)=>{ if(tk.ev) evs.push(tk.ev); },(r)=>fin=r,seed);
      let steps=0; while(!fin&&steps++<600) sim.step();
      applyMatchIncidents(evs);
      const Rm=makeRng(hashSeed(seed,'rate'));
      ratePlayers(h,fin.hg,fin.ag,fin.scorers,Rm,fin.perf&&fin.perf.H,fin.perf&&fin.perf.A); ratePlayers(a,fin.ag,fin.hg,fin.scorers,Rm,fin.perf&&fin.perf.A,fin.perf&&fin.perf.H);
      const T=g.table;
      T[h].P++; T[a].P++; T[h].GF+=fin.hg; T[h].GA+=fin.ag; T[a].GF+=fin.ag; T[a].GA+=fin.hg;
      if(fin.hg>fin.ag){ T[h].W++; T[a].L++; T[h].Pts+=3; }
      else if(fin.hg<fin.ag){ T[a].W++; T[h].L++; T[a].Pts+=3; }
      else { T[h].D++; T[a].D++; T[h].Pts++; T[a].Pts++; }
    });
  });
  mg.round++;
  if(mg.round>=mg.roundsTotal) mg.finished=true;
}
/* melhores colocados de CADA grupo (advancePerGroup por grupo) — quem avança pro mata-mata */
function groupStageAdvancers(mg){
  const out=[];
  Object.values(mg.groups).forEach(g=>{ out.push(...groupTableStandings(g).slice(0,mg.advancePerGroup).map(t=>t.id)); });
  return out;
}
/* status genérico de uma competição, seja ela mata-mata puro (Copa do Brasil, formato
   antigo: o objeto É o bracket) ou grupo+mata-mata (Libertadores/Sul-Americana: o objeto
   é {group,bracket}) — usado pela UI (clCompList/clCupView) sem precisar saber o formato. */
function cupCompetitionFinished(c){ if(!c) return false;
  return c.champion!==undefined ? cupIsFinished(c) : !!(c.bracket && cupIsFinished(c.bracket)); }
function cupCompetitionChampion(c){ if(!c) return null;
  return c.champion!==undefined ? c.champion : (c.bracket ? c.bracket.champion : null); }
function cupCompetitionTeamAlive(c,id){ if(!c) return false;
  if(c.champion!==undefined) return cupTeamAlive(c,id);
  if(c.group && !c.group.finished) return Object.values(c.group.groups).some(g=>g.teams.includes(id));
  return c.bracket ? cupTeamAlive(c.bracket,id) : false; }
/* nome da fase do mata-mata a partir da distância até a final — dá pro usuário a real
   sensação de progresso ("oitavas", "quartas"...) em vez de um número de rodada cru.
   roundsTotal varia por competição/temporada (Copa do Brasil parte de ~80 clubes, um
   chaveamento bem maior que os 16 times de Libertadores/Sul-Americana 2026), então "16
   avos de final" só aparece quando o chaveamento é grande o suficiente pra ter essa fase
   de verdade — nunca é inventada pras copas continentais do formato atual. */
function cupPhaseLabel(round, roundsTotal){
  const dist=roundsTotal-round; // 0 = já é a rodada final
  if(dist<=0) return 'Final';
  if(dist===1) return 'Semifinal';
  if(dist===2) return 'Quartas de final';
  if(dist===3) return 'Oitavas de final';
  if(dist===4) return '16 avos de final';
  return `${round}ª fase`; // rodadas bem no início de chaveamentos grandes, sem nome padrão
}
function cupEliminationPhrase(round, roundsTotal){
  const label=cupPhaseLabel(round, roundsTotal);
  if(label==='Final') return 'Vice-campeão';
  const singular = label==='Semifinal' || /ª fase$/.test(label);
  return `Eliminado ${singular?'na':'nas'} ${label.charAt(0).toLowerCase()+label.slice(1)}`;
}
function cupCompetitionRoundLabel(c,key){ if(!c) return '';
  if(c.champion!==undefined) return cupPhaseLabel(c.round, c.roundsTotal);
  if(c.group && !c.group.finished) return `Fase de grupos — rodada ${c.group.round+1}/${c.group.roundsTotal}`;
  if(c.bracket) return `Mata-mata — ${cupPhaseLabel(c.bracket.round, c.bracket.roundsTotal)}`;
  const drawDate=key && S.season===2026 ? COMP_R16_DRAW_2026[key] : null;
  return drawDate ? `Aguardando sorteio das oitavas (${fmtRealDate(drawDate)})` : 'Aguardando fase de grupos'; }

/* ================= CALENDÁRIO REAL 2026 (datas de sorteio do mata-mata) =================
   O sorteio das oitavas de final de Libertadores/Sul-Americana 2026 aconteceu de verdade em
   29/mai (CONMEBOL, checado jul/2026) — então a virada fase de grupos -> mata-mata só
   acontece a partir dessa data no jogo (mesmo que a fase de grupos simulada termine antes),
   pra seguir o calendário real. Só vale pra temporada 2026; temporadas seguintes não têm
   sorteio real conhecido, então a virada é imediata assim que a fase de grupos termina. */
const SEASON_EPOCH_2026=[2026,0,18]; // 18 de janeiro de 2026 — abertura real do Brasileirão
function realDateForDay(day){
  const d=new Date(SEASON_EPOCH_2026[0],SEASON_EPOCH_2026[1],SEASON_EPOCH_2026[2]);
  d.setDate(d.getDate()+((day||1)-1));
  return d;
}
const PT_MONTHS_ABBR=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function fmtRealDate(d){ return `${d.getDate()} de ${PT_MONTHS_ABBR[d.getMonth()]}`; }
const COMP_R16_DRAW_2026={ libertadores:new Date(2026,4,29), sulamericana:new Date(2026,4,29) };
/* inverso de realDateForDay: em qual jornada de liga (aproximada) cai uma data real —
   usado pra colocar a data de sorteio no lugar certo do Calendário, intercalada com o
   resto (ver userCupCalendarRows/clCalendar em main.js). */
function jornadaForRealDate(d){
  const epoch=new Date(SEASON_EPOCH_2026[0],SEASON_EPOCH_2026[1],SEASON_EPOCH_2026[2]);
  const dayOffset=Math.round((d-epoch)/86400000)+1;
  return Math.max(1, Math.floor((dayOffset-1)/7)+1);
}

/* cada competição de copa avança numa rodada de liga DIFERENTE (defasada por 1 rodada =
   7 dias no calendário do jogo, bem acima do mínimo de 2 dias) — antes as três avançavam
   sempre na MESMA rodada%3===0, o que fazia Copa do Brasil e Libertadores parecerem jogar
   no mesmo dia no Calendário, o que clubes de verdade nunca fazem. */
const CUP_TICK_OFFSET={copaBrasil:0, libertadores:1, sulamericana:2, championsLeague:1, europaLeague:2};
function cupTickMatchesRound(key, round){ return round%3===CUP_TICK_OFFSET[key]; }
/* a cada 3 rodadas de liga, avança a rodada pendente de cada copa ativa (uma competição
   por rodada, ver CUP_TICK_OFFSET) — roda inteiramente em segundo plano (quick-sim), sem
   bloquear o usuário */
function advancePendingCups(){
  if(!S.cups) return;
  if(cupTickMatchesRound('copaBrasil',S.round)){
    const cb=S.cups.copaBrasil;
    if(cb && !cupIsFinished(cb) && cb.ties.length) advanceCupBracket(cb, 'copaBrasil-r'+cb.round);
  }
  groupCupKeys().forEach(key=>{
    if(!cupTickMatchesRound(key,S.round)) return;
    const c=S.cups[key]; if(!c) return;
    if(c.group && !c.bracket){
      if(!c.group.finished) advanceGroupStageRound(c.group, key+'-grupo-r'+c.group.round);
      if(c.group.finished){
        // fase de grupos encerrada: só sorteia o mata-mata quando a data real do sorteio
        // já tiver passado no calendário do jogo (ver COMP_R16_DRAW_2026) — enquanto isso,
        // fica "aguardando sorteio" mesmo com a fase de grupos pronta, igual à vida real.
        const drawDate=(S.season===2026)?COMP_R16_DRAW_2026[key]:null;
        if(!drawDate || realDateForDay(S.day)>=drawDate){
          const advancing=groupStageAdvancers(c.group);
          c.bracket = makeBracket(advancing, hashSeed(S.seed,key,'mata-mata',S.season));
          queueDrawShow(key);
        }
      }
    } else if(c.bracket && !cupIsFinished(c.bracket) && c.bracket.ties.length){
      advanceCupBracket(c.bracket, key+'-r'+c.bracket.round);
    }
  });
}
/* divide uma lista de clubes em grupos de até 4 (nomeados A, B, C...), embaralhados de
   forma determinística — usado nas temporadas SEM sorteio real conhecido (só 2026 tem os
   grupos oficiais da CONMEBOL, ver LIBERTADORES_GROUPS_2026/SULAMERICANA_GROUPS_2026).
   Antes disso as temporadas seguintes jogavam TODOS os classificados (6: G6 da Libertadores,
   7º-12º da Sul-Americana) num "grupo único", o que também fazia todo mundo avançar de
   graça (advancePerGroup acabava igual ao tamanho do grupo). Agora fica no mesmo formato
   de grupos de 4 da vida real, só que com nomes gerados (6 times -> grupo A de 4 + grupo B
   de 2, já que o pool de classificados aqui é menor que os 32 times da Libertadores real). */
function splitIntoGroups(teamIds, seedNum){
  const R=makeRng(seedNum>>>0);
  const shuffled=teamIds.slice();
  for(let i=shuffled.length-1;i>0;i--){ const j=R.int(i+1); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
  const groups={}; const letters='ABCDEFGH';
  for(let i=0;i<shuffled.length;i+=4){
    const label=letters[Math.floor(i/4)]||String(Math.floor(i/4)+1);
    groups[label]=shuffled.slice(i,i+4);
  }
  return groups;
}
/* ================= COPAS CONTINENTAIS EUROPEIAS (Champions League + Europa League) =================
   Espelham Libertadores/Sul-Americana (fase de grupos: 8 grupos de 4, top 2 avança; depois
   mata-mata). Diferença: os adversários são os melhores clubes REAIS das 5 ligas europeias
   raspadas (INTL_LEAGUES), mesmo que o usuário tenha carregado só um país — igual à Champions
   de verdade, que reúne clubes de vários países. */
/* clubes da 1ª divisão das 5 ligas europeias (elegíveis pras copas continentais) */
function intlTopDivisionClubs(){
  const TOP=['ENG-1','ESP-1','ITA-1','GER-1','POR-1'];
  const src=(typeof window!=='undefined'&&window.INTL_LEAGUES)||{};
  const out=[];
  Object.keys(src).forEach(country=>src[country].forEach(c=>{ if(TOP.indexOf(c.lg)>=0) out.push(c); }));
  return out;
}
/* registra e materializa o elenco dos clubes de copa que não estão na liga do usuário
   (ex.: Real Madrid/Bayern quando o usuário joga a Premier) — sem isso simulateMatch não roda. */
function ensureCupClubsMaterialized(ids){
  S.clubPool=S.clubPool||{}; S.squads=S.squads||{};
  const byId={}; intlTopDivisionClubs().forEach(c=>byId[c.id]=c);
  ids.forEach(id=>{
    if(!S.clubPool[id] && byId[id]) S.clubPool[id]=byId[id];
    if(!S.squads[id]){ const c=S.clubPool[id]||byId[id]; if(c) S.squads[id]=c.squad.map(p=>attachAttrs(initStats({...p}))); }
  });
}
/* qualificação continental: 32 pra Champions + 32 pra Europa (melhores clubes reais das 5
   ligas por overall), garantindo a vaga do clube do usuário pela classificação doméstica
   (1º-4º -> Champions; 5º-6º -> Europa). Na 1ª temporada (sem tabela anterior) entra por overall. */
function intlContinentalQualification(userFinish){
  // vagas por liga (como a UEFA na vida real), não um ranking global por overall — senão a
  // Premier (mais rica) dominaria as duas copas. 7+7+6+6+6 = 32 pra cada competição.
  const CL_SLOTS={'ENG-1':7,'ESP-1':7,'ITA-1':6,'GER-1':6,'POR-1':6};
  const byLg={};
  intlTopDivisionClubs().forEach(c=>{ (byLg[c.lg]=byLg[c.lg]||[]).push(c); });
  Object.keys(byLg).forEach(lg=>byLg[lg].sort((a,b)=>(b.overall||0)-(a.overall||0)));
  let cl=[], el=[];
  Object.keys(CL_SLOTS).forEach(lg=>{
    const clubs=byLg[lg]||[]; const n=CL_SLOTS[lg];
    cl.push(...clubs.slice(0, n).map(c=>c.id));       // top N -> Champions
    el.push(...clubs.slice(n, n+n).map(c=>c.id));     // próximos N -> Europa
  });
  const uid=S.clubId;
  if(uid){
    // garante a vaga do usuário conforme classificação doméstica (1º-4º Champions; 5º-6º Europa);
    // na 1ª temporada (userFinish 0) mantém a vaga já obtida por overall, se houver.
    const already = cl.indexOf(uid)>=0 ? 'cl' : (el.indexOf(uid)>=0 ? 'el' : null);
    cl=cl.filter(id=>id!==uid); el=el.filter(id=>id!==uid);
    if(userFinish>=1 && userFinish<=4){ cl.unshift(uid); }
    else if(userFinish>=5 && userFinish<=6){ el.unshift(uid); }
    else if(already==='cl'){ cl.unshift(uid); }
    else if(already==='el'){ el.unshift(uid); }
  }
  return { championsLeague:cl.slice(0,32), europaLeague:el.slice(0,32) };
}
/* monta Champions + Europa (fase de grupos). Chamado por initSeasonCups no universo intl. */
function initIntlCups(){
  const qual=intlContinentalQualification(S._intlUserFinish||0);
  ensureCupClubsMaterialized(qual.championsLeague.concat(qual.europaLeague));
  const clGroups=makeGroupStage(splitIntoGroups(qual.championsLeague, hashSeed(S.seed,'clgroups',S.season)), 2);
  const elGroups=makeGroupStage(splitIntoGroups(qual.europaLeague, hashSeed(S.seed,'elgroups',S.season)), 2);
  S.qualification={...qual};
  S.cups={ championsLeague:{group:clGroups, bracket:null}, europaLeague:{group:elGroups, bracket:null} };
}
/* ================= LIGAS DE BACKGROUND (outros países selecionados) =================
   Cada país selecionado que NÃO é o jogável roda a sua liga sozinho: resultados simulados
   por rodada (quick-sim por overall do clube), tabela, artilheiros e artilheiros de sempre,
   com promoção/rebaixamento entre divisões e histórico por temporada. Visível no menu
   Campeonatos e disponível pro mercado. Nunca mistura com o universo do usuário nem entre
   países — cada liga é 100% do seu próprio país. */
let INTL_CLUB_INDEX=null;
function intlClubIndex(){
  if(INTL_CLUB_INDEX) return INTL_CLUB_INDEX;
  INTL_CLUB_INDEX={};
  const src=(typeof window!=='undefined'&&window.INTL_LEAGUES)||{};
  Object.keys(src).forEach(country=>src[country].forEach(c=>{ INTL_CLUB_INDEX[c.id]=c; }));
  return INTL_CLUB_INDEX;
}
function intlClubById(id){ return intlClubIndex()[id]||null; }
/* clubes de uma divisão de um universo qualquer (sem depender do universo ATIVO) */
function bgClubsForDivision(uniKey, divKey){
  const cfg=UNI_CONFIGS[uniKey]; if(!cfg||uniKey==='brasil') return [];
  const all=(typeof window!=='undefined'&&window.INTL_LEAGUES&&window.INTL_LEAGUES[cfg.country])||[];
  const lgCode=cfg.lg&&cfg.lg[divKey];
  const clubs=lgCode?all.filter(c=>c.lg===lgCode):all.slice();
  return clubs.slice(0, cfg.size[divKey]||clubs.length);
}
function initBgLeagues(){
  S.bgLeagues={};
  (S.bgCountries||[]).forEach(country=>{
    const cfg=UNI_CONFIGS[country]; if(!cfg) return;
    const divs={};
    cfg.order.forEach(divKey=>{
      const ids=bgClubsForDivision(country,divKey).map(c=>c.id);
      const table={}; ids.forEach(id=>table[id]={id,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0});
      divs[divKey]={clubIds:ids, sched:makeSchedule(ids.slice()), table};
    });
    S.bgLeagues[country]={universe:country, divs, scorers:{}, allTimeScorers:{}, history:[], season:S.season};
  });
}
/* quick-sim leve de uma partida de background (só placar, por overall + fator casa) */
function bgQuickSim(homeId, awayId, seed){
  const R=makeRng(seed>>>0);
  const ho=(intlClubById(homeId)||{}).overall||70, ao=(intlClubById(awayId)||{}).overall||70;
  const hExp=Math.max(0.2, 1.35+(ho-ao)*0.05), aExp=Math.max(0.2, 1.05+(ao-ho)*0.05);
  const pois=(lam)=>{ const L=Math.exp(-lam); let k=0,p=1; do{ k++; p*=R.random(); }while(p>L); return k-1; };
  return { hg:Math.min(7,pois(hExp)), ag:Math.min(7,pois(aExp)) };
}
/* atribui N gols a jogadores do clube (ponderado por força, atacantes/meias primeiro) */
function bgAttributeGoals(L, clubId, n){
  if(n<=0) return;
  // usa o elenco materializado se já existe (reflete transferências); senão o dado real
  const squad=(S.squads&&S.squads[clubId]) || (intlClubById(clubId)||{}).squad;
  if(!squad||!squad.length) return;
  const cand=squad.filter(p=>p.s==='ATT'||p.s==='MID'); const pool=cand.length?cand:squad;
  for(let i=0;i<n;i++){
    let best=pool[0], bestW=-1;
    pool.forEach(p=>{ const w=(p.f||50)*(p.s==='ATT'?1.6:0.7)*Math.random(); if(w>bestW){bestW=w;best=p;} });
    if(best){ L.scorers[best.n]=(L.scorers[best.n]||0)+1; L.allTimeScorers[best.n]=(L.allTimeScorers[best.n]||0)+1; }
  }
}
/* avança UMA rodada de cada liga de background (chamado junto do avanço de rodada do usuário) */
function advanceBgLeagues(){
  if(!S.bgLeagues) return;
  Object.keys(S.bgLeagues).forEach(country=>{
    const L=S.bgLeagues[country];
    Object.keys(L.divs).forEach(divKey=>{
      const d=L.divs[divKey]; if(!d.sched.length) return;
      const fx=d.sched[S.round % d.sched.length]||[];
      fx.forEach(pair=>{
        const hId=pair[0], aId=pair[1]; if(hId==null||aId==null) return;
        const r=bgQuickSim(hId,aId,hashSeed(S.seed,'bg',country,divKey,S.round,hId,aId));
        const T=d.table; if(!T[hId]||!T[aId]) return;
        T[hId].P++; T[aId].P++; T[hId].GF+=r.hg; T[hId].GA+=r.ag; T[aId].GF+=r.ag; T[aId].GA+=r.hg;
        if(r.hg>r.ag){T[hId].W++;T[aId].L++;T[hId].Pts+=3;}
        else if(r.hg<r.ag){T[aId].W++;T[hId].L++;T[aId].Pts+=3;}
        else {T[hId].D++;T[aId].D++;T[hId].Pts++;T[aId].Pts++;}
        bgAttributeGoals(L,hId,r.hg); bgAttributeGoals(L,aId,r.ag);
      });
    });
  });
}
/* standings ordenados de uma divisão de background */
function bgStandings(country, divKey){
  const L=S.bgLeagues&&S.bgLeagues[country]; if(!L||!L.divs[divKey]) return [];
  return Object.values(L.divs[divKey].table).sort((a,b)=>b.Pts-a.Pts||(b.GF-b.GA)-(a.GF-a.GA)||b.GF-a.GF);
}
/* fim de temporada das ligas de background: registra campeão/histórico, promove-rebaixa entre
   divisões (mesma regra do universo daquele país) e zera as tabelas/artilheiros da temporada. */
function rollBgLeaguesSeason(){
  if(!S.bgLeagues) return;
  Object.keys(S.bgLeagues).forEach(country=>{
    const L=S.bgLeagues[country]; const cfg=UNI_CONFIGS[country]; if(!cfg) return;
    // histórico (campeão da divisão de topo + artilheiro)
    const topDiv=cfg.order[0]; const champ=bgStandings(country,topDiv)[0];
    const arty=Object.entries(L.scorers).sort((a,b)=>b[1]-a[1])[0];
    L.history.push({ season:L.season,
      champ: champ?(intlClubById(champ.id)||{}).short:'—',
      artilheiro: arty?`${arty[0]} (${arty[1]})`:'—' });
    // promoção/rebaixamento entre divisões (só se houver mais de uma)
    if(cfg.order.length>1){
      const finalIds={}; cfg.order.forEach(d=>finalIds[d]=bgStandings(country,d).map(t=>t.id));
      const promoted={}, relegated={}, stayed={};
      cfg.order.forEach(d=>{ const ids=finalIds[d]; const rN=cfg.releg[d]||0, pN=cfg.promo[d]||0;
        promoted[d]=pN>0?ids.slice(0,pN):[]; relegated[d]=rN>0?ids.slice(ids.length-rN):[]; stayed[d]=ids.slice(pN,Math.max(pN,ids.length-rN)); });
      cfg.order.forEach((d,i)=>{ const above=cfg.order[i-1], below=cfg.order[i+1];
        let list=stayed[d].slice(); if(above)list=list.concat(relegated[above]); if(below)list=list.concat(promoted[below]);
        const ids=list.slice(0,cfg.size[d]); const table={}; ids.forEach(id=>table[id]={id,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0});
        L.divs[d]={clubIds:ids, sched:makeSchedule(ids.slice()), table}; });
    } else {
      const d=topDiv; const ids=L.divs[d].clubIds; const table={}; ids.forEach(id=>table[id]={id,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0});
      L.divs[d].table=table; L.divs[d].sched=makeSchedule(ids.slice());
    }
    L.scorers={}; L.season=S.season+1;
  });
}
function initSeasonCups(qual, compToggle){
  if(isIntlUniverse()){ initIntlCups(); return; } // universo europeu: Champions + Europa
  compToggle = compToggle || (S.compToggle) || {libertadores:true, copaBrasil:true, sulamericana:true};
  const cbQual=copaBrasilQualification(); // sempre as 4 divisões, independente da divisão do usuário
  let libGroup=null;
  if(compToggle.libertadores!==false){
    if(qual.libertadoresGroups){ // 2026: grupos reais A-H, top 2 de cada grupo avança (32 -> 16)
      libGroup=makeGroupStage(qual.libertadoresGroups, 2);
      qual={...qual, libertadores:Object.values(qual.libertadoresGroups).flat()};
    } else if(qual.libertadores && qual.libertadores.length){ // temporadas seguintes: grupos de 4 simulados
      libGroup=makeGroupStage(splitIntoGroups(qual.libertadores, hashSeed(S.seed,'libgroups',S.season)), 2);
    }
  }
  let sulGroup=null;
  if(compToggle.sulamericana!==false){
    if(qual.sulamericanaGroups){ // 2026: grupos reais A-H, top 2 de cada grupo avança (32 -> 16)
      sulGroup=makeGroupStage(qual.sulamericanaGroups, 2);
      qual={...qual, sulamericana:Object.values(qual.sulamericanaGroups).flat()};
    } else if(qual.sulamericana && qual.sulamericana.length){ // temporadas seguintes: grupos de 4 simulados
      sulGroup=makeGroupStage(splitIntoGroups(qual.sulamericana, hashSeed(S.seed,'sulgroups',S.season)), 2);
    }
  }
  S.qualification={...qual, copaBrasil:cbQual};
  S.cups={
    copaBrasil: (compToggle.copaBrasil!==false && cbQual.length)? makeBracket(cbQual, hashSeed(S.seed,'copaBrasil',S.season)) : null,
    libertadores: libGroup ? {group:libGroup, bracket:null} : null,
    sulamericana: sulGroup ? {group:sulGroup, bracket:null} : null
  };
  if(S.cups.copaBrasil) queueDrawShow('copaBrasil');
}
/* partidas de copa do clube do usuário pendentes de jogar AO VIVO — só dispara na véspera
   do avanço em segundo plano (mesma cadência de advancePendingCups/playRound, ver linha
   "S.round%3===0"), pra o resultado ao vivo já estar escrito a tempo do avanço em segundo
   plano PULAR essa partida específica (ver o guard em advanceCupBracket, linha ~1841, e o
   novo guard em advanceGroupStageRound). Pode haver mais de uma no mesmo momento (ex: Copa
   do Brasil + Libertadores na mesma semana de avanço) — clJogar() enfileira todas antes de
   liberar o jogo de liga da rodada. */
function pendingUserCupMatches(){
  if(!S.cups || !CL.clubId) return [];
  const out=[];
  const cb=S.cups.copaBrasil;
  if(cupTickMatchesRound('copaBrasil',S.round+1) && cb && !cupIsFinished(cb)){
    const tie=(cb.ties||[]).find(t=>!t.winner && (t.h===CL.clubId||t.a===CL.clubId));
    if(tie) out.push({key:'copaBrasil', stage:'bracket', bracket:cb, tie, h:tie.h, a:tie.a});
  }
  groupCupKeys().forEach(key=>{
    if(!cupTickMatchesRound(key,S.round+1)) return;
    const c=S.cups[key]; if(!c) return;
    if(c.group && !c.bracket && !c.group.finished){
      const mg=c.group;
      Object.values(mg.groups).forEach(g=>{
        if(!g.teams.includes(CL.clubId)) return;
        const fx=(g.sched[mg.round]||[]).find(([h,a])=>h===CL.clubId||a===CL.clubId);
        if(fx && mg._userRoundDone!==mg.round) out.push({key, stage:'group', group:mg, groupLabel:g.label, h:fx[0], a:fx[1]});
      });
    } else if(c.bracket && !cupIsFinished(c.bracket)){
      const tie=(c.bracket.ties||[]).find(t=>!t.winner && (t.h===CL.clubId||t.a===CL.clubId));
      if(tie) out.push({key, stage:'bracket', bracket:c.bracket, tie, h:tie.h, a:tie.a});
    }
  });
  // Resenha (online): confronto contra outro clube humano da MESMA sala fica de fora —
  // cada cliente calcula a rodada localmente, e deixar os dois lados abrirem a partida
  // ao vivo cada um por conta própria arriscaria pênaltis/eventos re-sorteados diferentes
  // pros dois (ver pesquisa de arquitetura online). Continua resolvendo em segundo plano,
  // igual hoje — só o confronto humano x CPU (a imensa maioria) fica jogável ao vivo.
  if(CL.online && CL.humans){
    return out.filter(pc=>{ const opp=pc.h===CL.clubId?pc.a:pc.h; return !CL.humans[opp]; });
  }
  return out;
}
/* rodadas de copa acontecendo nesta mesma leva (mesma véspera de advancePendingCups)
   em que o clube do usuário NÃO tem partida jogável — candidatas a "modo espectador"
   (ver clSpectateYes/startCupSpectate em main.js): o jogador pode assistir de fora,
   sem interagir, uma rodada de uma competição da qual não participa (ou já foi
   eliminado, ou simplesmente não pegou jogo nesta rodada específica — ex: fez bye
   no mata-mata). Puramente de exibição — não escreve nada no estado, então é seguro
   mesmo no modo online (cada cliente só assiste, quem resolve de verdade continua
   sendo o avanço em segundo plano de sempre). */
function cupSpectateCandidates(){
  if(!S.cups || !CL.clubId) return [];
  const out=[];
  const cb=S.cups.copaBrasil;
  if(cupTickMatchesRound('copaBrasil',S.round+1) && cb && !cupIsFinished(cb) && cb.ties.length && !cb.ties.some(t=>!t.winner&&(t.h===CL.clubId||t.a===CL.clubId))){
    out.push({key:'copaBrasil', stage:'bracket'});
  }
  groupCupKeys().forEach(key=>{
    if(!cupTickMatchesRound(key,S.round+1)) return;
    const c=S.cups[key]; if(!c) return;
    if(c.group && !c.bracket && !c.group.finished){
      const mg=c.group;
      const userHasFixtureNow=Object.values(mg.groups).some(g=>(g.sched[mg.round]||[]).some(([h,a])=>h===CL.clubId||a===CL.clubId));
      const roundHasFixtures=Object.values(mg.groups).some(g=>(g.sched[mg.round]||[]).some(([h,a])=>h!=null&&a!=null));
      if(!userHasFixtureNow && roundHasFixtures) out.push({key, stage:'group'});
    } else if(c.bracket && !cupIsFinished(c.bracket) && c.bracket.ties.length){
      if(!c.bracket.ties.some(t=>!t.winner&&(t.h===CL.clubId||t.a===CL.clubId))) out.push({key, stage:'bracket'});
    }
  });
  return out;
}

/* ====================== SISTEMA DE DIVISÕES (Série A/B/C/D) ======================
   S.division = 'A'|'B'|'C'|'D' — divisão em que o usuário está jogando AGORA.
   Só simulamos de verdade a divisão do usuário (as outras 3 não rodam em paralelo —
   custo computacional proibitivo pra um app 100% client-side). Promoção/rebaixamento
   troca o CONJUNTO de clubes (DATA.clubs) mantendo o elenco do usuário intacto.       */
/* ====================== UNIVERSOS (Brasil + ligas internacionais) ======================
   O sistema de divisões é genérico (mesma maquinaria de swap/promoção/rebaixamento). Cada
   "universo" define suas divisões: ordem (topo->base), tamanho, quantos sobem/descem e o
   código de liga (lg) que liga a divisão aos clubes reais em window.INTL_LEAGUES.
   - brasil: pirâmide A/B/C/D (dado real da Série A + procedural nas demais).
   - Inglaterra: Premier(PL) ↔ Championship(CH), com acesso/rebaixamento real (3 e 3).
   - demais países europeus: divisão única (sem pirâmide) — classificam pra copas continentais. */
/* nat = nacionalidades "domésticas" (p.nat vem em inglês do Transfermarkt); foreignMax =
   cota SIMPLIFICADA de estrangeiros no elenco (regra real varia muito por liga — números
   abaixo refletem a abertura relativa de cada país e são facilmente ajustáveis). */
const UNI_CONFIGS={
  brasil:    { order:['A','B','C','D'], size:{A:20,B:20,C:20,D:20}, promo:{A:0,B:4,C:4,D:4}, releg:{A:4,B:4,C:4,D:0},
               label:{A:'Série A',B:'Série B',C:'Série C',D:'Série D'}, nat:['Brasil','Brazil'], foreignMax:8 },
  Inglaterra:{ order:['PL','CH'], size:{PL:20,CH:24}, promo:{PL:0,CH:3}, releg:{PL:3,CH:0},
               label:{PL:'Premier League',CH:'Championship'}, lg:{PL:'ENG-1',CH:'ENG-2'}, country:'Inglaterra',
               nat:['England','Wales','Scotland','Northern Ireland'], foreignMax:22 },
  Espanha:   { order:['ES'], size:{ES:20}, promo:{ES:0}, releg:{ES:0}, label:{ES:'La Liga'},        lg:{ES:'ESP-1'}, country:'Espanha',
               nat:['Spain'], foreignMax:15 },
  'Itália':  { order:['IT'], size:{IT:20}, promo:{IT:0}, releg:{IT:0}, label:{IT:'Serie A'},         lg:{IT:'ITA-1'}, country:'Itália',
               nat:['Italy'], foreignMax:16 },
  Alemanha:  { order:['DE'], size:{DE:18}, promo:{DE:0}, releg:{DE:0}, label:{DE:'Bundesliga'},      lg:{DE:'GER-1'}, country:'Alemanha',
               nat:['Germany'], foreignMax:17 },
  Portugal:  { order:['PT'], size:{PT:18}, promo:{PT:0}, releg:{PT:0}, label:{PT:'Primeira Liga'},   lg:{PT:'POR-1'}, country:'Portugal',
               nat:['Portugal'], foreignMax:18 },
};
/* jogador é estrangeiro no universo de um país? (nat doméstico definido em UNI_CONFIGS) */
function playerIsForeign(p, uniKey){
  const cfg=UNI_CONFIGS[uniKey||ACTIVE_UNI]; if(!cfg||!cfg.nat) return false;
  return cfg.nat.indexOf(p&&p.nat)<0;
}
function squadForeignCount(clubId, uniKey){
  return (S.squads[clubId]||[]).filter(p=>playerIsForeign(p, uniKey)).length;
}
/* verifica a cota de estrangeiros ao contratar p pro clube do usuário. Retorna {ok, msg}. */
function checkForeignQuota(p){
  const cfg=activeUniCfg(); if(!cfg||!cfg.foreignMax) return {ok:true};
  if(!playerIsForeign(p, ACTIVE_UNI)) return {ok:true}; // doméstico nunca conta cota
  const cur=squadForeignCount(S.clubId, ACTIVE_UNI);
  if(cur>=cfg.foreignMax) return {ok:false, msg:`Cota de estrangeiros cheia (máx. ${cfg.foreignMax} na ${cfg.label[DIV_ORDER[0]]||'liga'}). Venda/dispense um estrangeiro ou contrate um nacional.`};
  return {ok:true};
}
/* materializa o elenco de um clube de background sob demanda (pra ver/negociar no mercado) */
function ensureBgClubMaterialized(clubId){
  if(S.squads[clubId]) return true;
  const club=intlClubById(clubId); if(!club||!club.squad) return false;
  S.clubPool=S.clubPool||{}; S.clubPool[clubId]=club;
  S.squads[clubId]=club.squad.map(p=>attachAttrs(initStats({...p})));
  return true;
}
/* config do universo ativo — reatribuída por setUniverse(); os bindings abaixo são 'let'
   justamente pra que todo o código que já lê DIV_ORDER/DIVISION_* passe a enxergar o
   universo corrente sem precisar mudar as ~40 chamadas existentes. */
let ACTIVE_UNI='brasil';
let DIVISION_SIZE={A:20,B:20,C:20,D:20};
let DIVISION_PROMO={A:0,B:4,C:4,D:4};
let DIVISION_RELEG={A:4,B:4,C:4,D:0};
let DIV_ORDER=['A','B','C','D'];
/* aplica a config de um universo (chamado em newGame/clEntrar/clLoadSave). Universo
   desconhecido cai em 'brasil' (retrocompatível com saves antigos, que não têm S.universe). */
function setUniverse(key){
  const cfg=UNI_CONFIGS[key]||UNI_CONFIGS.brasil;
  ACTIVE_UNI = UNI_CONFIGS[key] ? key : 'brasil';
  DIVISION_SIZE=cfg.size; DIVISION_PROMO=cfg.promo; DIVISION_RELEG=cfg.releg; DIV_ORDER=cfg.order.slice();
  DIV_LABEL_FULL=cfg.label;
  return ACTIVE_UNI;
}
function activeUniCfg(){ return UNI_CONFIGS[ACTIVE_UNI]||UNI_CONFIGS.brasil; }
function isIntlUniverse(){ return ACTIVE_UNI!=='brasil'; }
/* nomes/cidades pra gerar clubes de fallback OFFLINE quando não há Supabase/cache real
   nem entrada correspondente em REAL_LOWER_DIVISION_CLUBS ---- */
const PROC_CITY=['Norte','Sul','Vale','Serra','Litoral','Central','Oeste','Leste','União','Palmares','Bela Vista','Rio Claro','Boa Esperança','Alto Paraná','Campo Verde','Porto Novo','Santa Fé','Monte Azul','Vitória','Progresso'];
const PROC_SUFFIX=['FC','EC','AC','SC','Atlético','Esporte Clube','Futebol Clube'];
/* nomes de jogador procedural (city+letra) precisam ser ÚNICOS NO JOGO INTEIRO, não só
   dentro de um elenco — o motor identifica jogador pelo nome, não por ID (findP, S.scorers,
   S.xi...), e com só 20 cidades x 26 letras (520 combinações) pra até ~80 clubes de B/C/D,
   nomes repetidos entre clubes diferentes eram praticamente garantidos. Resetado a cada
   novo jogo (newGame) pra não vazar entre saves. */
let PROC_USED_NAMES=new Set();
function pickProcPlayerName(R){
  let nm, tries=0;
  do{
    const city=PROC_CITY[Math.floor(R.random()*PROC_CITY.length)];
    const letter=String.fromCharCode(65+Math.floor(R.random()*26));
    const suf = tries<26 ? '' : ' '+(Math.floor(tries/26)+1); // esgotou cidade+letra simples -> acrescenta número
    nm = city+' '+letter+suf;
    tries++;
  }while(PROC_USED_NAMES.has(nm) && tries<400);
  PROC_USED_NAMES.add(nm);
  return nm;
}
/* nomes e cores OFICIAIS dos 20 clubes de cada divisão (Séries B/C/D 2026).
   color = uniforme principal (usado no tema visual do clube hoje); color2 = secundária
   (guardada pra uso futuro — escudo/segundo uniforme). O elenco continua gerado
   proceduralmente: não temos dados reais de jogadores destas divisões, só clube/cor. */
const REAL_LOWER_DIVISION_CLUBS={
  B:[
    {name:'América-MG',short:'América-MG',color:'#00843D',color2:'#000000'},
    {name:'Athletic Club',short:'Athletic Club',color:'#FFFFFF',color2:'#000000'},
    {name:'Atlético-GO',short:'Atlético-GO',color:'#D71920',color2:'#000000'},
    {name:'Avaí',short:'Avaí',color:'#0057B8',color2:'#FFFFFF'},
    {name:'Botafogo-SP',short:'Botafogo-SP',color:'#FFFFFF',color2:'#000000'},
    {name:'Ceará',short:'Ceará',color:'#000000',color2:'#FFFFFF'},
    {name:'CRB',short:'CRB',color:'#D71920',color2:'#FFFFFF'},
    {name:'Criciúma',short:'Criciúma',color:'#F4C300',color2:'#000000'},
    {name:'Cuiabá',short:'Cuiabá',color:'#008C45',color2:'#FFD100'},
    {name:'Fortaleza',short:'Fortaleza',color:'#0054A6',color2:'#E31B23'},
    {name:'Goiás',short:'Goiás',color:'#007A33',color2:'#FFFFFF'},
    {name:'Juventude',short:'Juventude',color:'#0B7A3E',color2:'#FFFFFF'},
    {name:'Londrina',short:'Londrina',color:'#0072CE',color2:'#FFFFFF'},
    {name:'Náutico',short:'Náutico',color:'#D71920',color2:'#FFFFFF'},
    {name:'Novorizontino',short:'Novorizontino',color:'#F4C300',color2:'#000000'},
    {name:'Operário-PR',short:'Operário-PR',color:'#000000',color2:'#FFFFFF'},
    {name:'Ponte Preta',short:'Ponte Preta',color:'#FFFFFF',color2:'#000000'},
    {name:'São Bernardo',short:'São Bernardo',color:'#F4C300',color2:'#000000'},
    {name:'Sport',short:'Sport',color:'#D71920',color2:'#000000'},
    {name:'Vila Nova',short:'Vila Nova',color:'#D71920',color2:'#FFFFFF'},
  ],
  C:[
    {name:'Amazonas',short:'Amazonas',color:'#F4C300',color2:'#000000'},
    {name:'Anápolis GO',short:'Anápolis GO',color:'#000000',color2:'#FFFFFF'},
    {name:'Barra',short:'Barra',color:'#0057B8',color2:'#FFD100'},
    {name:'Botafogo PB',short:'Botafogo PB',color:'#FFFFFF',color2:'#000000'},
    {name:'Brusque',short:'Brusque',color:'#FFD100',color2:'#00843D'},
    {name:'Caxias do Sul',short:'Caxias do Sul',color:'#7A263A',color2:'#0057B8'},
    {name:'Confiança',short:'Confiança',color:'#0057B8',color2:'#FFFFFF'},
    {name:'Ferroviária',short:'Ferroviária',color:'#7A263A',color2:'#FFFFFF'},
    {name:'Figueirense',short:'Figueirense',color:'#000000',color2:'#FFFFFF'},
    {name:'Floresta',short:'Floresta',color:'#00843D',color2:'#FFFFFF'},
    {name:'Guarani',short:'Guarani',color:'#00843D',color2:'#FFFFFF'},
    {name:'Inter de Limeira',short:'Inter de Limeira',color:'#000000',color2:'#FFFFFF'},
    {name:'Itabaiana',short:'Itabaiana',color:'#0057B8',color2:'#FFFFFF'},
    {name:'Ituano',short:'Ituano',color:'#D71920',color2:'#000000'},
    {name:'Maranhão',short:'Maranhão',color:'#0057B8',color2:'#D71920'},
    {name:'Maringá',short:'Maringá',color:'#000000',color2:'#00843D'},
    {name:'Paysandu',short:'Paysandu',color:'#0057B8',color2:'#FFFFFF'},
    {name:'Santa Cruz',short:'Santa Cruz',color:'#D71920',color2:'#000000'},
    {name:'Volta Redonda',short:'Volta Redonda',color:'#FFD100',color2:'#000000'},
    {name:'Ypiranga',short:'Ypiranga',color:'#00843D',color2:'#FFD100'},
  ],
  D:[
    {name:'Portuguesa de Desportos',short:'Portuguesa de Desportos',color:'#D71920',color2:'#00843D'},
    {name:'Marcílio Dias',short:'Marcílio Dias',color:'#C8102E',color2:'#0057B8'},
    {name:'XV de Piracicaba',short:'XV de Piracicaba',color:'#000000',color2:'#FFFFFF'},
    {name:'Cianorte',short:'Cianorte',color:'#0057B8',color2:'#FFFFFF'},
    {name:'Velo Clube',short:'Velo Clube',color:'#D71920',color2:'#FFFFFF'},
    {name:'ABC',short:'ABC',color:'#000000',color2:'#FFFFFF'},
    {name:'Águia de Marabá',short:'Águia de Marabá',color:'#0057B8',color2:'#FFD100'},
    {name:'Gama',short:'Gama',color:'#00843D',color2:'#FFFFFF'},
    {name:'Uberlândia',short:'Uberlândia',color:'#00843D',color2:'#FFFFFF'},
    {name:'Portuguesa Carioca',short:'Portuguesa Carioca',color:'#00843D',color2:'#FFFFFF'},
    {name:'São José',short:'São José',color:'#0057B8',color2:'#FFFFFF'},
    {name:'Capital',short:'Capital',color:'#FFD100',color2:'#000000'},
    {name:'Nacional',short:'Nacional',color:'#0057B8',color2:'#FFFFFF'},
    {name:'Ferroviário',short:'Ferroviário',color:'#D71920',color2:'#FFFFFF'},
    {name:'Treze',short:'Treze',color:'#000000',color2:'#FFFFFF'},
    {name:'CRAC',short:'CRAC',color:'#0057B8',color2:'#FFFFFF'},
    {name:'Asa',short:'Asa',color:'#000000',color2:'#FFFFFF'},
    {name:'Luverdense',short:'Luverdense',color:'#00843D',color2:'#FFFFFF'},
    {name:'CSA',short:'CSA',color:'#0057B8',color2:'#FFFFFF'},
    {name:'América RN',short:'América RN',color:'#D71920',color2:'#FFFFFF'},
  ],
};
/* faixa de força por divisão (jogadores B/C/D são procedurais; Série A usa dado real do
   Transfermarkt e nunca é gerada por aqui — a entrada 'A' só serve de referência pra
   gerar um jovem repositor quando um jogador real se aposenta, ver retirementReplacement). */
const DIVISION_FORCE_RANGE={A:[58,88],B:[58,80],C:[52,74],D:[48,68]};
/* força-base por idade dentro da faixa da divisão: em vez de sortear uniformemente,
   um jovem (18-22) tende à metade inferior (potencial, ainda não é o pico), o auge
   (23-29) tende à metade superior, e o veterano (30-35) recua um pouco — mesma lógica
   usada pra repor jogador aposentado (ver retirementReplacement). Sempre fica dentro
   de [range0,range1]; só desloca onde o sorteio tende a cair. */
function ageForceFraction(age){
  if(age<=22) return 0.30;
  if(age<=29) return 0.65;
  if(age<=32) return 0.50;
  return 0.35;
}
function rollAgedForce(R,range,age){
  const t=Math.max(0,Math.min(1, ageForceFraction(age)+(R.random()*2-1)*0.28));
  return Math.round(range[0]+t*(range[1]-range[0]));
}
function proceduralDivisionClubs(division, n){
  const range=DIVISION_FORCE_RANGE[division]||[55,75];
  const R=makeRng(hashSeed('procdiv',division,(S&&S.seed)||1));
  const roster=REAL_LOWER_DIVISION_CLUBS[division];
  const clubs=[];
  for(let i=0;i<n;i++){
    const real=roster && roster[i%roster.length];
    let name;
    if(real){ name=real.name; }
    else { const city=PROC_CITY[i%PROC_CITY.length]+(i>=PROC_CITY.length?' '+(Math.floor(i/PROC_CITY.length)+1):'');
      const suf=PROC_SUFFIX[Math.floor(R.random()*PROC_SUFFIX.length)]; name=city+' '+suf; }
    const id='proc_'+division+'_'+i;
    const squad=[];
    const posPlan=[['GK',2],['DEF',6],['MID',6],['ATT',4]];
    posPlan.forEach(([pos,cnt])=>{ for(let k=0;k<cnt;k++){
      const age=Math.round(18+R.random()*17);
      const f=rollAgedForce(R,range,age);
      const lg=MARKET.divisionToLeague(division);
      squad.push({n:pickProcPlayerName(R),
        p:pos,s:pos,f,age,lg,mv:MARKET.marketValue(f,age,lg),ft:R.random()<0.8?'R':'L',
        num:String(Math.floor(R.random()*40)+1),nat:'Brasil',ag:'—',moral:70,energy:100}); } });
    const overall=Math.round(squad.reduce((s,p)=>s+p.f,0)/squad.length);
    clubs.push({id,tk:id,name,short:real?real.short:name.split(' ')[0].slice(0,12),
      color:real?real.color:'#'+Math.floor(R.random()*16777215).toString(16).padStart(6,'0'),
      color2:real?real.color2:null,
      crest:null,OS:overall,MS:overall,DS:overall,overall,squad});
  }
  return clubs;
}
/* normaliza uma linha vinda de elifoot_v3.division_clubs (dados reais) pro formato DATA.clubs */
function normalizeDivisionClubRow(row){
  const sq=row.squad||[];
  const bySec=s=>sq.filter(p=>p.s===s);
  const avg=a=>a.length?a.reduce((s,p)=>s+p.f,0)/a.length:55;
  return { id:'real_'+row.division+'_'+row.club_id, tk:row.club_id, name:row.name, short:row.short,
    color:row.color||'#888888', color2:row.color2||null, crest:row.crest||null,
    OS:avg(bySec('ATT')), MS:avg(bySec('MID')), DS:(avg(bySec('GK'))*0.35+avg(bySec('DEF'))*0.65),
    overall:row.overall||55, squad:sq.map(p=>({...p})) };
}
/* pool de clubes reais em cache (client-side), preenchido via loadRealDivisionClubs() quando online */
const REAL_DIVISION_CACHE={};
async function loadRealDivisionClubs(division){
  if(REAL_DIVISION_CACHE[division]) return REAL_DIVISION_CACHE[division];
  if(typeof NET==='undefined' || !NET.getDivisionClubs) return null;
  try {
    const rows=await NET.getDivisionClubs(division);
    if(!rows || !rows.length) return null;
    const clubs=rows.map(normalizeDivisionClubRow);
    REAL_DIVISION_CACHE[division]=clubs;
    return clubs;
  } catch(e){ console.warn('loadRealDivisionClubs erro:',e); return null; }
}
/* monta o conjunto de clubes de uma divisão: usa dados reais em cache se já tiver
   sido buscado nesta sessão; senão gera fallback procedural (sempre funciona offline) */
function clubsForDivision(division){
  // universo internacional: cada divisão vem dos clubes reais daquele país/liga (INTL_LEAGUES),
  // filtrados pelo código de liga da divisão (ex.: PL->ENG-1, CH->ENG-2).
  if(isIntlUniverse()){
    const cfg=activeUniCfg();
    const all=(typeof window!=='undefined' && window.INTL_LEAGUES && window.INTL_LEAGUES[cfg.country]) || [];
    const lgCode=cfg.lg && cfg.lg[division];
    const clubs = lgCode ? all.filter(c=>c.lg===lgCode) : all.slice();
    return clubs.slice(0, DIVISION_SIZE[division]||clubs.length);
  }
  if(division==='A') return DATA.clubsSerieA || DATA.clubs;
  const real=REAL_DIVISION_CACHE[division];
  if(real && real.length) return real.slice(0, DIVISION_SIZE[division]);
  return proceduralDivisionClubs(division, DIVISION_SIZE[division]);
}
/* ================= REGISTRO PERSISTENTE DE CLUBES POR DIVISÃO =================
   Antes, as 3 divisões que o usuário não joga eram regeneradas do zero (mesma seed)
   a cada troca de temporada — por isso a promoção/rebaixamento delas nunca "pegava"
   de verdade (o restante das divisões nunca trocava) e um clube podia acabar
   duplicado (a versão antiga ainda "presa" numa divisão + uma nova gerada do zero).
   Agora cada clube é registrado uma única vez em S.clubPool (por id) e a composição
   de cada divisão fica em S.divisionClubs — atualizada de verdade a cada fim de
   temporada por computeDivisionSwap(), com o mesmo clube nunca aparecendo em duas
   divisões ao mesmo tempo. */
function registerClubs(division, clubs){
  S.clubPool=S.clubPool||{}; S.divisionClubs=S.divisionClubs||{};
  clubs.forEach(c=>{ S.clubPool[c.id]=c; });
  S.divisionClubs[division]=clubs.map(c=>c.id);
}
function ensureDivisionClubs(division){
  S.clubPool=S.clubPool||{}; S.divisionClubs=S.divisionClubs||{};
  if(!S.divisionClubs[division] || !S.divisionClubs[division].length){
    registerClubs(division, clubsForDivision(division));
  }
  return S.divisionClubs[division].map(id=>S.clubPool[id]).filter(Boolean);
}
/* DATA.clubs é um array "ativo" só em memória (nunca é salvo com o jogo) — depois de
   carregar um save (clLoadSave) ele ficava preso na composição da PÁGINA (a Série A
   inicial), mesmo que o save esteja noutra divisão, escondendo os outros 19 clubes de
   CPU da divisão real e quebrando qualquer tela/regra que leia DATA.clubs (ranking,
   convites/demissões de treinador, "Chamar pra Resenha"...). Chamado sempre que S é
   substituído inteiro (carregar save, entrar numa sala online) pra realinhar DATA.clubs
   com a divisão de verdade do save carregado — os CPUs seguem as mesmíssimas regras
   dos clubes humanos, então precisam sempre estar presentes e corretos. */
function syncDataClubsFromState(){
  if(!S || !S.division || !S.divisionClubs) return;
  const ids=S.divisionClubs[S.division]; if(!ids || !ids.length) return;
  const pool=S.clubPool||{};
  const myClub=pool[S.clubId] || DATA.clubs.find(c=>c.id===S.clubId);
  const others=ids.map(id=>pool[id]).filter(c=>c && c.id!==S.clubId);
  if(myClub) DATA.clubs=[myClub, ...others];
  else if(others.length) DATA.clubs=others;
}
/* fim de temporada: promove/rebaixa as 4 divisões de verdade (não só a do usuário),
   a partir da tabela final de cada uma — mesmas regras de DIVISION_PROMO/DIVISION_RELEG.
   Devolve o novo mapeamento divisão -> ids de clube pra próxima temporada. */
function computeDivisionSwap(){
  const finalIds={};
  DIV_ORDER.forEach(d=>{
    if(d===S.division){ finalIds[d]=sortedTable().map(t=>t.id); return; }
    const od=S.otherDivs&&S.otherDivs[d];
    finalIds[d]= od ? sortedTableOf(od.table).map(t=>t.id) : ensureDivisionClubs(d).map(c=>c.id);
  });
  const promoted={}, relegated={}, stayed={};
  DIV_ORDER.forEach(d=>{
    const ids=finalIds[d]||[]; const relegN=DIVISION_RELEG[d]||0, promoN=DIVISION_PROMO[d]||0;
    promoted[d]= promoN>0 ? ids.slice(0,promoN) : [];
    relegated[d]= relegN>0 ? ids.slice(Math.max(0,ids.length-relegN)) : [];
    stayed[d]= ids.slice(promoN, Math.max(promoN,ids.length-relegN));
  });
  const newDiv={};
  DIV_ORDER.forEach((d,i)=>{
    const above=DIV_ORDER[i-1], below=DIV_ORDER[i+1];
    let list=stayed[d].slice();
    if(above) list=list.concat(relegated[above]);
    if(below) list=list.concat(promoted[below]);
    newDiv[d]=list;
  });
  return repairDivisionSwap(newDiv);
}
/* rede de segurança: garante que cada clube apareça em EXATAMENTE uma divisão e que
   toda divisão termine com exatamente DIVISION_SIZE clubes únicos — protege contra
   qualquer id duplicado/perdido no cálculo acima (ex: tabelas com muitos empates 0x0
   entre clubes de CPU, cujo desempate pode colidir) virar clube "fantasma" (duplicado
   numa divisão, sumido de outra) na temporada seguinte. */
function repairDivisionSwap(newDiv){
  const seen=new Set();
  DIV_ORDER.forEach(d=>{
    newDiv[d]=(newDiv[d]||[]).filter(id=>{ if(seen.has(id)) return false; seen.add(id); return true; });
  });
  const unassigned=Object.keys(S.clubPool||{}).filter(id=>!seen.has(id));
  DIV_ORDER.forEach(d=>{
    const need=DIVISION_SIZE[d]-newDiv[d].length;
    if(need>0){
      const fill=unassigned.splice(0,need);
      newDiv[d]=newDiv[d].concat(fill);
      fill.forEach(id=>seen.add(id));
    } else if(need<0){
      newDiv[d]=newDiv[d].slice(0,DIVISION_SIZE[d]); // sobrou (não deveria) -> corta o excesso
    }
  });
  return newDiv;
}
/* troca o universo de clubes ativo (DATA.clubs) pra uma nova divisão, preservando
   o elenco/contrato do próprio usuário — usado em promoção/rebaixamento */
function switchToDivision(newDivision, promotedOrRelegated){
  const myClub = DATA.clubs.find(c=>c.id===S.clubId);
  const myPlayers = S.squads[S.clubId];
  let newClubs = ensureDivisionClubs(newDivision).filter(c=>c.id!==S.clubId).slice(0, DIVISION_SIZE[newDivision]-1);
  // mantém a identidade do clube do usuário (nome/cor/escudo reais), só troca o elenco de adversários
  DATA.clubs = [myClub, ...newClubs];
  S.division = newDivision;
  const squads={}; DATA.clubs.forEach(c=>{ squads[c.id] = c.id===S.clubId ? myPlayers : (S.squads[c.id] || c.squad.map(p=>attachAttrs(initStats({...p})))); });
  S.squads = squads;
  const ids = DATA.clubs.map(c=>c.id);
  S.sched = makeSchedule(ids);
  S.table = {}; DATA.clubs.forEach(c=>S.table[c.id]={id:c.id,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0});
  S.round=0;
  S.xi = autoXI(S.clubId).length ? S.xi : autoXI(S.clubId);
  S._promoRelegNews = promotedOrRelegated; // 'promoted' | 'relegated' | null — pra UI mostrar aviso
  buildOtherDivisions();
}
/* ---- monta as 3 divisões que o usuário NÃO está jogando, pra rodarem em paralelo
   na tela de partida ao vivo (as 4 divisões ao mesmo tempo, igual ao clássico).
   A composição vem do registro persistente (S.divisionClubs) — promoção/rebaixamento
   dessas divisões acontece de verdade a cada fim de temporada, via computeDivisionSwap(). ---- */
function buildOtherDivisions(){
  S.otherDivs = {};
  DIV_ORDER.forEach(d=>{
    if(d===S.division) return;
    const clubs = ensureDivisionClubs(d);
    const table = {};
    clubs.forEach(c=>{
      table[c.id] = {id:c.id,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0};
      if(!S.squads[c.id]) S.squads[c.id] = c.squad.map(p=>attachAttrs(initStats({...p})));
    });
    S.otherDivs[d] = { clubs, sched: makeSchedule(clubs.map(c=>c.id)), table };
  });
}
/* decide, a partir da posição final na tabela, se o usuário sobe/desce/mantém a divisão */
function decidePromotionRelegation(finalPos, totalClubs){
  const relegN=DIVISION_RELEG[S.division]||0, promoN=DIVISION_PROMO[S.division]||0;
  const idx=DIV_ORDER.indexOf(S.division);
  if(relegN>0 && finalPos>totalClubs-relegN && idx<DIV_ORDER.length-1) return DIV_ORDER[idx+1]; // desce
  if(promoN>0 && finalPos<=promoN && idx>0) return DIV_ORDER[idx-1]; // sobe
  return S.division; // mantém
}

/* ================= SEGURANÇA NO CARGO: DEMISSÃO E PROPOSTAS DE OUTROS CLUBES =================
   Mecânica de carreira do treinador, à parte da promoção/rebaixamento do CLUBE: aqui é sobre
   o TREINADOR ficar ou não no emprego, baseado no desempenho recente.
   - S.jobSecurity (0-100) converge a cada rodada pra um "alvo" definido pela posição atual na
     tabela (1º lugar => alvo 100; lanterna => alvo 0), suavizado — assim uma rodada ruim isolada
     não decide nada, mas uma campanha ruim de verdade (várias rodadas na parte de baixo da
     tabela) derruba a segurança de forma consistente, e uma campanha boa a mantém alta.
   - Segurança muito baixa por tempo suficiente => risco real (não garantido) de demissão a
     cada rodada. Ao ser demitido, o usuário escolhe o próximo desafio entre 2-3 clubes da MESMA
     divisão ou uma divisão ABAIXO (rebaixado na carreira, nunca sobe sendo demitido).
   - Segurança muito alta por tempo suficiente => chance pequena de receber convite de outro
     clube — sempre um passo realista: um clube um pouco melhor (por overall) na MESMA divisão,
     ou (mais raro) um clube fraco de UMA divisão acima — nunca um salto gigante de carreira.
   Só roda no modo solo (Resenha é sessão compartilhada; trocar de clube no meio quebraria o
   fluxo dos outros jogadores humanos). */
function tickJobSecurity(){
  if(S.jobSecurity==null) S.jobSecurity=60;
  const pos=tablePos(S.clubId), total=DATA.clubs.length;
  const target = total>1 ? 100-((pos-1)/(total-1))*100 : 60;
  S.jobSecurity = clamp(Math.round(S.jobSecurity + (target-S.jobSecurity)*0.18), 0, 100);
}
function clubOverall(id){ const c=clubOf(id); return c?(c.overall||55):55; }
/* clubes candidatos quando o treinador é demitido: mesma divisão (excluindo o atual) ou uma
   divisão abaixo — nunca um passo pra cima ao ser demitido */
function generateFiringOptions(){
  const divIdx=DIV_ORDER.indexOf(S.division);
  const sameDiv=DATA.clubs.filter(c=>c.id!==S.clubId).map(c=>({clubId:c.id, division:S.division}));
  const downDiv = divIdx<DIV_ORDER.length-1 ? ensureDivisionClubs(DIV_ORDER[divIdx+1]).map(c=>({clubId:c.id, division:DIV_ORDER[divIdx+1]})) : [];
  const pool=[...sameDiv, ...downDiv];
  const R=makeRng(hashSeed(S.seed,S.season,S.round,'firingjob'));
  const picks=[], used=new Set();
  while(picks.length<3 && used.size<pool.length){
    const cand=pool[Math.floor(R.random()*pool.length)];
    if(used.has(cand.clubId)) continue; used.add(cand.clubId);
    picks.push(cand);
  }
  return picks;
}
/* proposta de outro clube quando o treinador está indo bem: prioriza um clube um pouco melhor
   (por overall) na MESMA divisão; só raramente oferece um clube (fraco) da divisão de cima
   Critérios de sucesso: títulos, gestão financeira, moral do time */
function generateJobOffer(){
  // verificar critérios de sucesso do treinador
  const avgMoral = squad(S.clubId).reduce((s,p)=>s+(p.moral||70),0) / (squad(S.clubId).length||1);
  const titles = (S.coachHistory||[]).filter(h=>h.type==='campeao').length;
  const trophyDisputes = (S.coachHistory||[]).filter(h=>h.type==='campeao' || (h.text && h.text.includes('Final'))).length;

  // critério mínimo: media de moral aceitavel, ou algum título/final disputada
  if(avgMoral<65 && titles===0 && trophyDisputes===0) return null;

  const divIdx=DIV_ORDER.indexOf(S.division);
  const curOverall=clubOverall(S.clubId);
  const sameDivPool=DATA.clubs.filter(c=>c.id!==S.clubId && c.overall>curOverall+2 && c.overall<=curOverall+14);
  const upDivPool = divIdx>0 ? ensureDivisionClubs(DIV_ORDER[divIdx-1]).slice().sort((a,b)=>a.overall-b.overall).slice(0,6) : [];
  const R=makeRng(hashSeed(S.seed,S.season,S.round,'joboffer'));
  const useUpDiv = upDivPool.length>0 && R.random()<0.25;
  const pool = useUpDiv ? upDivPool : (sameDivPool.length?sameDivPool:upDivPool);
  if(!pool.length) return null;
  const pick=pool[Math.floor(R.random()*pool.length)];

  // calcular salário proposto: baseado no salário atual + bonus para clube melhor
  const clubOffer = clubOf(pick.id);
  const clubOfferOverall = clubOffer?clubOffer.overall:55;
  const salaryBump = Math.round(S.coachSalary * (0.1 + (clubOfferOverall-curOverall)*0.02)); // 10% base + 2% por ponto de overall
  const proposedSalary = S.coachSalary + salaryBump;

  return { clubId:pick.id, division: useUpDiv?DIV_ORDER[divIdx-1]:S.division, salary:proposedSalary };
}
/* decide se algo acontece nesta rodada (demissão OU múltiplas ofertas pendentes) — chamada 1x por rodada,
   depois de tickJobSecurity(); precisa de pelo menos 5 rodadas na divisão atual (evita eventos
   nos primeiríssimos jogos, quando a tabela ainda não diz nada de verdade) */
function checkManagerJobEvent(){
  if(CL.online) return null; // Resenha: não mexe no clube de ninguém no meio da sessão
  if(S.round<5) return null;
  // incrementar contador de rodadas desde demissão
  if(S.roundsSinceFired!==null) S.roundsSinceFired++;
  // remover ofertas expiradas (>5 rodadas)
  S.pendingJobOffers = (S.pendingJobOffers||[]).filter(o=>(o.roundOfferred||0)+5>=S.round);

  const R=makeRng(hashSeed(S.seed,S.season,S.round,'jobevent-roll'));
  if(S.jobSecurity<=15){
    const chance=(15-S.jobSecurity)/15*0.30; // até 30%/rodada com segurança em 0
    if(R.random()<chance){
      const options=generateFiringOptions();
      if(options.length){
        S.roundsSinceFired=0; // resetar contador quando demitido
        return {kind:'fired', options};
      }
    }
  } else if(S.jobSecurity>=80){
    // só considerar ofertas se passaram pelo menos 4 rodadas desde demissão (ou nunca foi demitido)
    const minRoundsSinceFired = S.roundsSinceFired===null ? 0 : 4;
    if(S.roundsSinceFired===null || S.roundsSinceFired>=minRoundsSinceFired){
      // chance de receber oferta: 6% base + 2% extra se muito bem (jobSecurity>=90)
      const extraChance = S.jobSecurity>=90 ? 0.02 : 0;
      if(R.random()<(0.06+extraChance)){
        const offer=generateJobOffer();
        if(offer){
          offer.roundOfferred=S.round;
          S.pendingJobOffers.push(offer);
          // mostrar notificação de nova oferta
          S.roundNews=S.roundNews||[];
          S.roundNews.push(`🤝 Nova oferta de contratação do ${clubOf(offer.clubId).short}!`);
          return {kind:'offer', offer}; // retornar para mostrar modal imediato
        }
      }
    }
  }
  return null;
}
/* aplica a troca de clube do treinador (demissão aceita ou proposta aceita) — o clube antigo
   segue existindo normalmente, agora controlado só pela própria simulação (como qualquer CPU) */
function applyManagerJobChange(newClubId, newDivision){
  const sameDivision = newDivision===S.division;
  S.clubId=newClubId; CL.clubId=newClubId;
  if(!sameDivision){
    S.division=newDivision;
    const allClubs=ensureDivisionClubs(newDivision);
    const others=allClubs.filter(c=>c.id!==newClubId).slice(0,DIVISION_SIZE[newDivision]-1);
    DATA.clubs=[clubOf(newClubId), ...others];
    DATA.clubs.forEach(c=>{ if(!S.squads[c.id]) S.squads[c.id]=c.squad.map(p=>attachAttrs(initStats({...p}))); });
    const ids=DATA.clubs.map(c=>c.id);
    S.sched=makeSchedule(ids); S.round=0;
    S.table={}; DATA.clubs.forEach(c=>S.table[c.id]={id:c.id,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0});
    S._promoRelegNews=null;
    buildOtherDivisions();
  }
  squad(newClubId).forEach(p=>{ if(!p.contract) p.contract=defaultContract(p); });
  S.xi=autoXI(newClubId);
  const squadValue=squad(newClubId).reduce((s,p)=>s+(p.mv||1e6),0);
  // orçamento = valor do elenco × ~0.20 (spec §3.B), com leve variação por clube/temporada
  S.budget=Math.round(squadValue*makeRng(hashSeed(S.seed,'budget',newClubId,S.season)).rnd(0.18,0.22));
  // inicializa salário do treinador baseado no overall do clube
  const clubOverallVal=clubOverall(newClubId);
  S.coachSalary=Math.round(100000 + clubOverallVal*5000); // salário base + bonus por força do clube
  S.roundsSinceFired=null; // resetar contador de rodadas desde demissão
  S.pendingJobOffers=[]; // limpar ofertas anteriores
  S.negos=[]; S.auctionPool={round:S.round,picks:[]};
  // novo clube, novas contas — sem isso a aba Finanças ia misturar salário/receita do
  // clube antigo com o novo (mesmo bug de sincronização, outro gatilho: troca de clube
  // no meio da temporada por demissão/proposta, não só virada de temporada).
  S.finances=[]; S.seasonTotals={income:0,salaries:0,bonuses:0,playerSales:0,playerPurchases:0,stadium:0};
  S.jobSecurity=60;
  CL.tacticChosen=false; CL.formation=null; CL.selPlayer=squad(newClubId)[0]?.n||null;
  refreshAuctionPool();
}
let DIV_LABEL_FULL={A:'Série A',B:'Série B',C:'Série C',D:'Série D'}; // reatribuído por setUniverse()
function showFiredModal(options){
  const rows=options.map((o,i)=>{ const c=clubOf(o.clubId);
    return `<div class="cl-jobopt" onclick="clAcceptJob(${i})">
      <span class="cl-jobopt-club" style="${clubStripe(c)}">${escC(c.short)}</span>
      <span class="cl-jobopt-div">${DIV_LABEL_FULL[o.division]}</span>
    </div>`; }).join('');
  CL._jobOptions=options;
  overlayC(dlg('Você foi demitido!', `<div class="cl-jobmodal">
    <div class="cl-jobmodal-msg">Os resultados recentes custaram seu cargo. Escolha seu próximo desafio:</div>
    <div class="cl-joboptlist">${rows}</div>
  </div>`, {w:560,bodyClass:'cl-body-red'}));
}
function clAcceptJob(idx){
  const opt=CL._jobOptions[idx]; if(!opt) return;
  applyManagerJobChange(opt.clubId, opt.division);
  S.coachHistory=S.coachHistory||[];
  S.coachHistory.push({season:S.season, type:'contratado', text:`Contratado pelo ${clubOf(opt.clubId).short.toUpperCase()}`});
  CL._jobOptions=null;
  clCloseOverlay(); saveV3(); cdraw();
}
function showJobOfferModal(offer){
  const c=clubOf(offer.clubId);
  CL._jobOffer=offer;
  const salaryInfo = offer.salary ? `<div class="cl-jobopt-info"><span>Salário proposto:</span><b>${fmt(offer.salary)}/sem</b></div>` : '';
  overlayC(dlg('Proposta de outro clube', `<div class="cl-jobmodal">
    <div class="cl-jobmodal-msg">O <b style="${clubStripe(c)};padding:2px 6px;border-radius:3px">${escC(c.short)}</b> (${DIV_LABEL_FULL[offer.division]}) gostou do seu trabalho e quer te contratar.</div>
    ${salaryInfo}
    <div class="cl-jog-actions">${btn('Aceitar','clAcceptJobOffer()',{icon:'✔',cls:'cl-btn-ok'})}${btn('Recusar','clDeclineJobOffer()',{icon:'✖',cls:'cl-btn-cancel'})}</div>
  </div>`, {w:520,bodyClass:'cl-body-green'}));
}
function clAcceptJobOffer(){
  const o=CL._jobOffer; if(!o) return;
  S.coachHistory=S.coachHistory||[];
  S.coachHistory.push({season:S.season, type:'contratado', text:`Contratado pelo ${clubOf(o.clubId).short.toUpperCase()}`});
  applyManagerJobChange(o.clubId,o.division);
  if(o.salary) S.coachSalary=o.salary; // atualizar salário se houver proposta
  CL._jobOffer=null; clCloseOverlay(); saveV3(); cdraw();
}
function clDeclineJobOffer(){ CL._jobOffer=null; clCloseOverlay(); }
function checkPendingManagerEvents(){
  if(CL._pendingManagerEvent){
    const ev=CL._pendingManagerEvent; CL._pendingManagerEvent=null;
    if(ev.kind==='fired') showFiredModal(ev.options); else showJobOfferModal(ev.offer);
  }
}

function sortedTable(){
  return Object.values(S.table).sort((a,b)=> b.Pts-a.Pts || (b.GF-b.GA)-(a.GF-a.GA) || b.GF-a.GF );
}
function tablePos(id){return sortedTable().findIndex(t=>t.id===id)+1;}
function applyResult(h,a,hg,ag){
  const T=S.table; T[h].P++;T[a].P++;T[h].GF+=hg;T[h].GA+=ag;T[a].GF+=ag;T[a].GA+=hg;
  if(hg>ag){T[h].W++;T[a].L++;T[h].Pts+=3;}
  else if(hg<ag){T[a].W++;T[h].L++;T[a].Pts+=3;}
  else{T[h].D++;T[a].D++;T[h].Pts++;T[a].Pts++;}
}
function recordScorers(scorers){scorers.forEach(s=>{S.scorers[s.name]=(S.scorers[s.name]||0)+1;});}
function topScorers(n=10){return Object.entries(S.scorers).sort((a,b)=>b[1]-a[1]).slice(0,n);}

/* ============ MULTIPLAYER — pure round resolver (host-authority) ============
   Operates on an explicit shared `state` (never the global S). Deterministic:
   same seed + same submitted lineups => identical result on every client.     */
function mpBuildInitialState(clubs, seed){
  seed=(seed>>>0)||((Math.random()*0x7fffffff)>>>0);
  const ids=clubs.map(c=>c.id);
  const sched=makeSchedule(ids);
  const table={},squads={},budgets={},finances={};
  clubs.forEach(c=>{
    table[c.id]={id:c.id,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0};
    const sq=c.squad.map(p=>attachAttrs({...p,moral:70,energy:100,stats:{r3:[],g3:[],apps:0,goals:0,cs:0},contract:defaultContract(p)}));
    squads[c.id]=sq;
    const sv=sq.reduce((s,p)=>s+(p.mv||1e6),0);
    // orçamento = valor do elenco × ~0.20 (spec §3.B), com leve variação por clube
    budgets[c.id]=Math.round(sv*makeRng(hashSeed(seed,'budget',c.id)).rnd(0.18,0.22));
    finances[c.id]=[];
  });
  return {seed,season:2026,round:0,sched,table,squads,budgets,scorers:{},results:[],finances};
}
function mpXI(sq,lineupNames){
  if(lineupNames&&lineupNames.length>=11){
    const set=new Set(lineupNames);const xi=sq.filter(p=>set.has(p.n));
    if(xi.length>=11)return xi.slice(0,11);
  }
  const s=sq.slice().sort((a,b)=>b.f-a.f);
  const pick=(sec,n)=>s.filter(p=>p.s===sec).slice(0,n);
  let xi=[...pick('GK',1),...pick('DEF',4),...pick('MID',3),...pick('ATT',3)];
  if(xi.length<11){const have=new Set(xi.map(p=>p.n));for(const p of s){if(xi.length>=11)break;if(!have.has(p.n))xi.push(p);}}
  return xi.slice(0,11);
}
function mpRatings(players){
  const bySec=s=>players.filter(p=>p.s===s);
  const avg=a=>a.length?a.reduce((s,p)=>s+p.f*(0.6+0.4*p.energy/100),0)/a.length:55;
  let OS=avg(bySec('ATT')),MS=avg(bySec('MID')),DS=(avg(bySec('GK'))*0.35+avg(bySec('DEF'))*0.65);
  const mor=players.length?players.reduce((s,p)=>s+p.moral,0)/players.length:70;
  if(mor<50){OS*=0.85;MS*=0.85;DS*=0.85;}
  return {OS,MS,DS,mor};
}
function mpSim(homeId,home,awayId,away,seed,log){
  const R=makeRng(seed>>>0);
  const betaH=TACTIC_BETA[home.tactic||'equilibrado'],betaA=TACTIC_BETA[away.tactic||'equilibrado'];
  // mesma matemática do motor solo (helpers compartilhados): formação + meio-campo + mando + índices
  const emH=formationEmphasis(home.players), emA=formationEmphasis(away.players);
  const H={OS:home.OS*emH.OS, MS:home.MS*emH.MS, DS:home.DS*emH.DS};
  const A={OS:away.OS*emA.OS, MS:away.MS*emA.MS, DS:away.DS*emA.DS};
  const homeAdv=homeAdvantage(homeId);
  const derby=(typeof clubOf==='function') && isDerby((clubOf(homeId)||{}).short,(clubOf(awayId)||{}).short);
  const sd=ENG.sd*(derby?1.18:1);
  const mu=matchMu(H,A,betaH,betaA,{nMidH:emH.nMID,nMidA:emA.nMID,homeAdv});
  let pos=0,minute=0,hg=0,ag=0;const scorers=[];
  const perf={H:{poss:0,shots:0,chances:0,big:0,goals:0}, A:{poss:0,shots:0,chances:0,big:0,goals:0}};
  const scorerFrom=(players)=>{const atk=players.filter(p=>p.s==='ATT'||p.s==='MID');const pool=atk.length?atk:players;let tot=pool.reduce((s,p)=>s+p.f,0),r=R.random()*tot;for(const p of pool){r-=p.f;if(r<=0)return p;}return pool[0];};
  const tick=()=>{minute++;pos=clamp(pos*ENG.rev+R.gauss(mu,sd),-1.15,1.15);const isH=pos>0;perf[isH?'H':'A'].poss++;
    if(Math.abs(pos)>=ENG.danger && R.random()<ENG.shot*((Math.abs(pos)-ENG.danger)/(1.15-ENG.danger)+0.15)){
      const atkId=isH?homeId:awayId; const hSide=isH?'H':'A'; perf[hSide].shots++;
      const atkIdx=atkIndex(isH?H.OS:A.OS, isH?H.MS:A.MS), defIdx=defIndex(isH?A.DS:H.DS, isH?A.MS:H.MS);
      const sc=scorerFrom(isH?home.players:away.players); const conv=shotConv(atkIdx,defIdx,sc.moral);
      if(conv>=0.5) perf[hSide].big++;
      if(R.random()<conv){if(isH)hg++;else ag++;perf[hSide].goals++;scorers.push({id:atkId,name:sc.n,min:minute});pos=isH?-0.15:0.15;if(log)log.push({min:minute,type:'gol',side:hSide,team:atkId,scorer:sc.n});}
      else {perf[hSide].chances++;if(log)log.push({min:minute,type:'chance',side:hSide,team:atkId,scorer:sc.n});}
    } else if(R.random()<0.028){if(log)log.push({min:minute,type:'card',side:isH?'A':'H',team:isH?awayId:homeId});}
  };
  for(let i=0;i<90;i++)tick();const add=Math.floor(R.rnd(1,5));while(minute<90+add)tick();
  return {hg,ag,scorers,perf};
}
function mpApply(T,h,a,hg,ag){T[h].P++;T[a].P++;T[h].GF+=hg;T[h].GA+=ag;T[a].GF+=ag;T[a].GA+=hg;
  if(hg>ag){T[h].W++;T[a].L++;T[h].Pts+=3;}else if(hg<ag){T[a].W++;T[h].L++;T[a].Pts+=3;}else{T[h].D++;T[a].D++;T[h].Pts++;T[a].Pts++;}}
function mpRate(xi,gf,ga,scorers,cid,R,myPerf,oppPerf){
  const won=gf>ga,lost=gf<ga,cs=ga===0;
  const dom=(typeof domAdjust==='function')?domAdjust(myPerf,oppPerf):0;
  xi.forEach(p=>{
    let r=6.0+(p.f-65)*0.045+R.gauss(0,0.75);
    if(won)r+=0.5;else if(lost)r-=0.5;
    r+=dom;
    const myG=scorers.filter(s=>s.id===cid&&s.name===p.n).length;r+=myG*1.3;
    if(cs&&(p.s==='GK'||p.s==='DEF'))r+=0.6;r=clamp(r,3,10);
    const st=p.stats||(p.stats={r3:[],g3:[],apps:0,goals:0,cs:0});
    st.r3.push(+r.toFixed(1));if(st.r3.length>3)st.r3.shift();
    st.g3.push(myG);if(st.g3.length>3)st.g3.shift();
    st.apps++;st.goals+=myG;if(cs&&(p.s==='GK'||p.s==='DEF'))st.cs++;
  });
}
function mpFinances(state,cid,xi,gf,ga,scorers){
  const cl=DATA.clubs.find(c=>c.id===cid);const won=gf>ga,draw=gf===ga;
  const income=Math.round(cl.overall*INCOME_BASE+(won?500000:draw?150000:0));
  let salaries=0,bonuses=0;const started=new Set(xi.map(p=>p.n));
  state.squads[cid].forEach(p=>{
    if(!p.contract)return;const c=p.contract;salaries+=c.salary;
    if(c.bonusGoal){const g=scorers.filter(s=>s.id===cid&&s.name===p.n).length;
      const csb=(ga===0&&(p.s==='GK'||p.s==='DEF')&&started.has(p.n))?1:0;bonuses+=(g+csb)*50000;}
    if(!c.gotMatchesBonus&&p.stats&&p.stats.apps>=Math.ceil(state.sched.length*0.5)){const mb=c.salary*4;bonuses+=mb;c.gotMatchesBonus=true;}
  });
  state.budgets[cid]=(state.budgets[cid]||0)+income-salaries-bonuses;
}
/* resolve one round. subs = {clubId:{lineup:[names],tactic}} for human seats. */
function resolveRoundMP(state, subs){
  subs=subs||{};
  const round=state.round, fixtures=state.sched[round]||[];
  const Rr=makeRng(hashSeed(state.seed,round,'post'));
  const roundResults=[];
  fixtures.forEach(([h,a])=>{
    const hsub=subs[h]||{},asub=subs[a]||{};
    const hXI=mpXI(state.squads[h],hsub.lineup), aXI=mpXI(state.squads[a],asub.lineup);
    const home={...mpRatings(hXI),tactic:hsub.tactic||'equilibrado',players:hXI};
    const away={...mpRatings(aXI),tactic:asub.tactic||'equilibrado',players:aXI};
    const ms=hashSeed(state.seed,round,h,a);
    const log=[];                             // captura eventos de TODAS as partidas (lastRound é sobrescrito por rodada, cabe no estado)
    const r=mpSim(h,home,a,away,ms,log);
    mpApply(state.table,h,a,r.hg,r.ag);
    r.scorers.forEach(s=>state.scorers[s.name]=(state.scorers[s.name]||0)+1);
    const Rm=makeRng(hashSeed(ms,'rate'));
    mpRate(hXI,r.hg,r.ag,r.scorers,h,Rm,r.perf&&r.perf.H,r.perf&&r.perf.A); mpRate(aXI,r.ag,r.hg,r.scorers,a,Rm,r.perf&&r.perf.A,r.perf&&r.perf.H);
    mpFinances(state,h,hXI,r.hg,r.ag,r.scorers); mpFinances(state,a,aXI,r.ag,r.hg,r.scorers);
    state.results.push({round,h,a,hg:r.hg,ag:r.ag});
    roundResults.push({round,h,a,hg:r.hg,ag:r.ag,scorers:r.scorers,seed:ms,events:log});
  });
  // energy recovery + morale drift for everyone, then fatigue those who played
  Object.keys(state.squads).forEach(cid=>{
    state.squads[cid].forEach(p=>{p.energy=clamp(p.energy+Rr.rnd(6,16),0,100);p.moral=clamp(p.moral+(70-p.moral)*0.08,0,100);});
  });
  fixtures.forEach(([h,a])=>{[h,a].forEach(cid=>{
    const sub=subs[cid]||{};const names=new Set(mpXI(state.squads[cid],sub.lineup).map(p=>p.n));
    state.squads[cid].forEach(p=>{if(names.has(p.n))p.energy=clamp(p.energy-Rr.rnd(12,22),20,100);});
  });});
  // player development / decline (deterministic)
  const Rd=makeRng(hashSeed(state.seed,round,'dev'));
  Object.keys(state.squads).forEach(cid=>{
    const sub=subs[cid]||{};const played=new Set(mpXI(state.squads[cid],sub.lineup).map(p=>p.n));
    state.squads[cid].forEach(p=>evolvePlayer(p,Rd,played.has(p.n)));
  });
  state.round=round+1;
  return {state, roundResults};
}
function mpSortTable(state){return Object.values(state.table).sort((a,b)=>b.Pts-a.Pts||(b.GF-b.GA)-(a.GF-a.GA)||b.GF-a.GF);}

/* ====================== ROUND ADVANCE ====================== */
function currentFixtures(){return S.sched[S.round]||[];}
function userFixture(){return currentFixtures().find(([h,a])=>h===S.clubId||a===S.clubId);}
/* ---- disciplina/lesões: aplicação PERSISTENTE dos incidentes de uma rodada ---- */
function findPlayerByName(clubId,name){ const sq=S.squads[clubId]; return sq&&sq.find(p=>p.n===name); }
function advancePlayerAvailability(){
  // uma rodada "cumprida" reduz suspensão/lesão em 1 — chamar ANTES de aplicar os
  // incidentes NOVOS da rodada que está sendo resolvida agora
  Object.values(S.squads).flat().forEach(p=>{
    if(p.suspended>0) p.suspended--;
    if(p.injuredMatches>0) p.injuredMatches--;
  });
}
function applyMatchIncidents(events){
  // events: eventos brutos (cartao/lesao) de TODAS as partidas da rodada recém-jogada
  S._roundIncidents=S._roundIncidents||{};
  (events||[]).forEach(e=>{
    if(e.type==='cartao'){
      const p=findPlayerByName(e.team,e.player); if(!p) return;
      p.stats=p.stats||{r3:[],g3:[],apps:0,goals:0,cs:0};
      if(e.cardType==='vermelho'){
        p.suspended=1; p.stats.reds=(p.stats.reds||0)+1;
        if(e.reason==='segundo amarelo') p.stats.yellows=(p.stats.yellows||0)+1;
        p.moral=clamp(p.moral-8,0,100);
        S._roundIncidents[p.n]={cardType:'vermelho'};
      } else {
        p.stats.yellows=(p.stats.yellows||0)+1;
        S._roundIncidents[p.n]={cardType:'amarelo'};
      }
    } else if(e.type==='lesao'){
      const p=findPlayerByName(e.team,e.player); if(!p) return;
      p.stats=p.stats||{r3:[],g3:[],apps:0,goals:0,cs:0};
      p.injuredMatches=Math.max(p.injuredMatches||0, e.outMatches||0);
      p.stats.injuries=(p.stats.injuries||0)+1;
      p.moral=clamp(p.moral-5,0,100);
      const cur=S._roundIncidents[p.n]||{}; cur.injured=true; S._roundIncidents[p.n]=cur;
    }
  });
}

function playRound(userResult){
  if(S.seed==null) S.seed=(Math.random()*0x7fffffff)>>>0; // legacy-save guard
  const uf=userFixture();
  S.roundNews=[];
  const Rr=makeRng(hashSeed(S.seed,S.round,'post')); // deterministic post-match stream
  // capture who started THIS round before energy changes (for finances/enforcement)
  const startedNames = new Set(playedXI(S.clubId).map(p=>p.n));
  if(uf&&userResult){ const [h,a]=uf; const uev=(typeof simEvents==='function')?simEvents(h,a,matchSeed(h,a)).events:undefined; applyResult(h,a,userResult.hg,userResult.ag); recordScorers(userResult.scorers);
    const Rm=makeRng(hashSeed(matchSeed(h,a),'rate'));
    ratePlayers(h,userResult.hg,userResult.ag,userResult.scorers,Rm,userResult.perf&&userResult.perf.H,userResult.perf&&userResult.perf.A); ratePlayers(a,userResult.ag,userResult.hg,userResult.scorers,Rm,userResult.perf&&userResult.perf.A,userResult.perf&&userResult.perf.H);
    S.results.push({round:S.round,h,a,hg:userResult.hg,ag:userResult.ag,user:true,scorers:userResult.scorers||[],events:uev}); postMatchMorale(userResult,h,a); }
  currentFixtures().forEach(([h,a])=>{
    if(uf&&(h===uf[0]&&a===uf[1]))return;
    const ms=matchSeed(h,a);
    const r=(typeof simEvents==='function')?simEvents(h,a,ms):quickSim(h,a,ms); applyResult(h,a,r.hg,r.ag); recordScorers(r.scorers);
    const Rm=makeRng(hashSeed(ms,'rate'));
    ratePlayers(h,r.hg,r.ag,r.scorers,Rm,r.perf&&r.perf.H,r.perf&&r.perf.A); ratePlayers(a,r.ag,r.hg,r.scorers,Rm,r.perf&&r.perf.A,r.perf&&r.perf.H);
    S.results.push({round:S.round,h,a,hg:r.hg,ag:r.ag,scorers:r.scorers||[],events:r.events});
  });
  processFinances(userResult,uf,startedNames);
  enforceRoles(startedNames);
  europeRaids(Rr);
  // recover energy, drift morale toward 70
  Object.values(S.squads).flat().forEach(p=>{p.energy=clamp(p.energy+Rr.rnd(6,16),0,100);p.moral=clamp(p.moral+(70-p.moral)*0.08,0,100);});
  xiPlayers(S.clubId).forEach(p=>p.energy=clamp(p.energy-Rr.rnd(12,22),20,100));
  // player development / decline (deterministic)
  const Rd=makeRng(hashSeed(S.seed,S.round,'dev'));
  Object.keys(S.squads).forEach(cid=>{
    const played=new Set((cid===S.clubId?xiPlayers(cid):squad(cid).slice().sort((a,b)=>b.f-a.f).slice(0,11)).map(p=>p.n));
    S.squads[cid].forEach(p=>evolvePlayer(p,Rd,played.has(p.n)));
  });
  S.round++; S.week++; S.day+=7;
  advanceNegos();
  executePendingTransfers(); // pré-acordos entram em vigor quando a janela abre
  cpuBackgroundTransfers(Rr); // mercado entre CPUs — dá vida ao jogo mesmo sem o usuário negociar
  bgCpuTransfers(Rr); // clubes das ligas de background negociam entre si (compra/venda)
  generateIncomingOffers(Rr); // clubes fazem propostas de compra pelos jogadores do usuário
  if(S.round%2===0) refreshAuctionPool(Rr); // leilão gira a cada 2 rodadas
  rollStory(Rr);
  advancePendingCups(); // cada copa avança na sua própria rodada — ver CUP_TICK_OFFSET
  advanceBgLeagues(); // ligas dos outros países selecionados rodam junto, no background
  if(S.round>=S.sched.length){ endSeason(); }
  S._roundIncidents={};
  save();
}
/* pay wages, goal/CS bonuses, 50%-matches bonus; collect matchday income */
function processFinances(userResult,uf,startedNames){
  const cl=clubOf(S.clubId);
  let gf=0,ga=0,won=false,draw=false;
  if(uf&&userResult){ const home=uf[0]===S.clubId; gf=home?userResult.hg:userResult.ag; ga=home?userResult.ag:userResult.hg; won=gf>ga; draw=gf===ga; }
  const winBonus=won?500000:draw?150000:0;
  // bilheteria: quando o usuário joga em casa nesta rodada, a renda de bilheteria de VERDADE
  // (público × preço, calculada em attendanceFor/buildLiveMatchObject — sensível à capacidade
  // do estádio expandido) é a receita da rodada, em vez da fórmula-base por força do elenco.
  // Antes essas duas rendas eram somadas separadamente (bilheteria ia direto pro S.budget, fora
  // do ledger de Finanças) — resultado: expandir o estádio não aparecia na aba Finanças, e a
  // renda mostrada lá nunca batia com o total real de caixa.
  let gate=null;
  if(uf && uf[0]===S.clubId && CL.live && CL.live.matches){
    const um=CL.live.matches.find(m=>m.h===uf[0]&&m.a===uf[1]);
    if(um) gate=um.att*um.price;
  }
  const income=gate!=null ? (gate+winBonus) : Math.round(cl.overall*INCOME_BASE+winBonus);
  let salaries=0,bonuses=0,log=[];
  squad(S.clubId).forEach(p=>{
    if(!p.contract)return; const c=p.contract; salaries+=c.salary;
    if(c.bonusGoal){
      const g=userResult?userResult.scorers.filter(s=>s.id===S.clubId&&s.name===p.n).length:0;
      const cs=(userResult&&ga===0&&(p.s==='GK'||p.s==='DEF')&&startedNames.has(p.n))?1:0;
      if(g){bonuses+=g*50000;log.push(`⚽ Bônus gol ${p.n}: ${fmt(g*50000)}`);}
      if(cs){bonuses+=50000;log.push(`🧤 Clean sheet ${p.n}: ${fmt(50000)}`);}
    }
    if(!c.gotMatchesBonus && p.stats && p.stats.apps>=Math.ceil(S.sched.length*0.5)){
      const mb=c.salary*4; bonuses+=mb; c.gotMatchesBonus=true; log.push(`🎯 Meta 50% jogos ${p.n}: ${fmt(mb)}`);
    }
  });
  const net=income-salaries-bonuses; S.budget+=net;
  pushFinanceEntry({income,salaries,bonuses,log});
  if(S.budget<0) S.roundNews.push(`⚠️ Caixa negativo (${fmt(S.budget)}). Folha salarial pressionando as contas.`);
}
/* registra QUALQUER movimentação financeira — tanto o fechamento de cada rodada (bilheteria/
   salários/bônus, via processFinances) quanto compra/venda de jogador fora do ciclo normal —
   como uma entrada no mesmo ledger que a aba Finanças lê. Duas coisas acontecem aqui:
   1) S.finances (capado em 12) guarda só as transações mais RECENTES, pro log da aba;
   2) S.seasonTotals acumula tudo, SEM cap, pro total "da temporada até agora" da aba Finanças —
      antes esse total vinha de somar o próprio S.finances capado, então depois da 12ª rodada
      as rodadas mais antigas silenciosamente saíam da conta (salário/bônus "sumindo"). */
function pushFinanceEntry(patch){
  S.finances=S.finances||[];
  S.seasonTotals=S.seasonTotals||{income:0,salaries:0,bonuses:0,playerSales:0,playerPurchases:0,stadium:0};
  const entry=Object.assign({round:S.round+1,income:0,salaries:0,bonuses:0,playerSales:0,playerPurchases:0,stadium:0,net:0,log:[]},patch);
  entry.net=(entry.income||0)+(entry.playerSales||0)-(entry.salaries||0)-(entry.bonuses||0)-(entry.playerPurchases||0)-(entry.stadium||0);
  S.finances.unshift(entry);
  if(S.finances.length>12) S.finances.pop();
  S.seasonTotals.income+=entry.income||0;
  S.seasonTotals.salaries+=entry.salaries||0;
  S.seasonTotals.bonuses+=entry.bonuses||0;
  S.seasonTotals.playerSales+=entry.playerSales||0;
  S.seasonTotals.playerPurchases+=entry.playerPurchases||0;
  S.seasonTotals.stadium+=entry.stadium||0;
}
/* promised-status enforcement: benched key players lose morale */
function enforceRoles(startedNames){
  squad(S.clubId).forEach(p=>{
    if(!p.contract)return; const c=p.contract;
    if(c.role==='Jogador Chave' && !startedNames.has(p.n)){ p.moral=clamp(p.moral-8,0,100); c.benchStreak=(c.benchStreak||0)+1;
      S.roundNews.push(`⭐ ${p.n} (Jogador Chave) ficou fora e está insatisfeito (moral ${Math.round(p.moral)}).`); }
    else if(c.role==='Titular Regular' && !startedNames.has(p.n)){ p.moral=clamp(p.moral-4,0,100); c.benchStreak=(c.benchStreak||0)+1; }
    else c.benchStreak=0;
  });
}
/* European clubs trigger release clauses on your young/in-form players */
function europeRaids(R){
  R=R||makeRng(hashSeed(S.seed,S.round,'europe'));
  squad(S.clubId).slice().forEach(p=>{
    if(!p.contract||!p.contract.releaseClause)return;
    if(((p.age<=23)||isHot(p)) && R.random()<0.012){
      const clause=p.contract.releaseClause; S.budget+=clause;
      S.squads[S.clubId]=S.squads[S.clubId].filter(x=>x.n!==p.n);
      S.negos=S.negos.filter(n=>n.player!==p.n);
      S.xi=S.xi.filter(x=>x!==p.n);
      S.roundNews.push(`🌍 Um clube europeu acionou a multa de ${fmt(clause)} por ${p.n}. Você recebeu o valor, mas perdeu o atleta.`);
    }
  });
  if(S.xi.length<11) S.xi=autoXI(S.clubId);
}
function postMatchMorale(res,h,a){
  const meHome=h===S.clubId; const gf=meHome?res.hg:res.ag, ga=meHome?res.ag:res.hg;
  const d= gf>ga? +8 : gf<ga? -8 : +1;
  xiPlayers(S.clubId).forEach(p=>p.moral=clamp(p.moral+d,0,100));
  res.scorers.filter(s=>s.id===S.clubId).forEach(s=>adjMoral(s.name,+6));
}
function advanceNegos(){
  S.negos.forEach(n=>{ if(n.status==='aberta' && n.stage!=='done' && n.stage!=='verdict' && n.day+3 < S.day){ n.status='expirada'; n.stage='done'; } });
}

/* ====================== END SEASON (History Scars) ====================== */
/* fase que o CLUBE alcançou numa copa nesta temporada — pro histórico de clube/treinador
   (ver S.history/clCoachHistory/clClubHistory). Não é só "campeão sim/não" (isso já existe
   em `cups` acima); aqui é o rótulo de até onde foi (fase de grupos, oitavas, semifinal...). */
function cupResultForClub(key, clubId){
  const c=S.cups && S.cups[key]; if(!c) return null;
  const champion=cupCompetitionChampion(c);
  if(champion===clubId) return 'Campeão';
  const bracketOnly = c.champion!==undefined;
  if(!bracketOnly && c.group){
    const inGroup=Object.values(c.group.groups).some(g=>g.teams.includes(clubId));
    if(!inGroup) return null; // não se classificou pra essa copa nesta temporada
  }
  const b = bracketOnly ? c : c.bracket;
  if(!b) return 'Fase de grupos'; // fase de grupos disputada, mata-mata ainda nem sorteado
  let lastRound=null;
  (b.history||[]).forEach(h=>{ if(h.ties.some(t=>t.h===clubId||t.a===clubId)) lastRound=h.round; });
  if((b.ties||[]).some(t=>t.h===clubId||t.a===clubId)) lastRound=b.round;
  if(lastRound==null) return bracketOnly ? 'Eliminado na 1ª fase' : 'Fase de grupos';
  return cupEliminationPhrase(lastRound, b.roundsTotal);
}
function endSeason(){
  const tbl=sortedTable();
  const champ=clubOf(tbl[0].id).short;
  const arty=topScorers(1)[0];
  const cups={};
  if(S.cups){ allCupKeys().forEach(k=>{
    const champ=cupCompetitionChampion(S.cups[k]); cups[k]=champ?clubOf(champ).short:null;
  }); }
  // resultado do MEU clube em cada copa nesta temporada (fase alcançada, não só campeão) —
  // e classificação conquistada pra temporada QUE VEM (mesma regra que newSeasonReset vai
  // usar de verdade pra montar as copas) — alimenta o histórico de clube/treinador.
  const myCups={};
  allCupKeys().forEach(k=>{ myCups[k]=cupResultForClub(k,S.clubId); });
  const qual=(S.division==='A')?computeQualification(tbl):null;
  const qualifiedFor=[];
  if(qual){
    if(qual.libertadores.includes(S.clubId)) qualifiedFor.push('libertadores');
    else if(qual.sulamericana.includes(S.clubId)) qualifiedFor.push('sulamericana');
  }
  S.history.push({season:S.season,division:S.division,clubId:S.clubId,champ,
    top3:tbl.slice(0,3).map(t=>clubOf(t.id).short),
    relegated:tbl.slice(-4).map(t=>clubOf(t.id).short),
    artilheiro:arty?`${arty[0]} (${arty[1]})`:'—',
    myPos:tablePos(S.clubId),
    myClubShort:clubOf(S.clubId).short,
    cups, myCups, qualifiedFor});
  // resumo financeiro da temporada, acumulado POR CLUBE (não zera nunca) — pro treinador
  // ver o histórico resumido de um clube que já comandou, mesmo depois de assumir outro
  // (ver panFinancas). Precisa capturar ANTES de newSeasonReset() zerar S.seasonTotals.
  S.financeHistory=S.financeHistory||{};
  const st=S.seasonTotals||{income:0,salaries:0,bonuses:0,playerSales:0,playerPurchases:0,stadium:0};
  (S.financeHistory[S.clubId]=S.financeHistory[S.clubId]||[]).push({season:S.season, ...st,
    net:(st.income+st.playerSales)-(st.salaries+st.bonuses+st.playerPurchases+st.stadium)});
  // acumula artilharia histórica (nunca é apagada entre temporadas do mesmo save)
  S.allTimeScorers=S.allTimeScorers||{};
  Object.entries(S.scorers||{}).forEach(([n,g])=>{ S.allTimeScorers[n]=(S.allTimeScorers[n]||0)+g; });
  // registra títulos conquistados pelo treinador na carreira (persiste com o save)
  S.coachHistory=S.coachHistory||[];
  if(tbl[0].id===S.clubId){
    const divTrophy={A:'serieA',B:'serieB',C:'serieC',D:'serieD'}[S.division];
    S.coachHistory.push({season:S.season, type:'campeao', comp:divTrophy, text:`Campeão da Série ${S.division} pelo ${clubOf(S.clubId).short.toUpperCase()}`});
  }
  if(S.cups){ allCupKeys().forEach(k=>{
    if(cupCompetitionChampion(S.cups[k])===S.clubId) S.coachHistory.push({season:S.season, type:'campeao', comp:k, text:`Campeão da ${COMP_DEFS[k].short} pelo ${clubOf(S.clubId).short.toUpperCase()}`});
  }); }
  /* histórico de carreira POR JOGADOR (títulos, temporadas na elite, melhor posição) —
     diferente de S.coachHistory (só do treinador) e S.allTimeScorers (só artilharia).
     Só cobre S.squads: é a única estrutura com elenco individual materializado (as
     outras 3 divisões em segundo plano só têm overall agregado, ver S.otherDivs).
     Consumido por evolvePlayer (bônus de crescimento pra quem já tem taça/rodagem
     na elite) e, na aposentadoria, pela geração do jovem repositor. */
  Object.keys(S.squads).forEach(cid=>{
    const pos=tbl.findIndex(t=>t.id===cid)+1; // 1-based; 0 se o clube não estava nesta tabela
    const wonDivision = tbl[0] && tbl[0].id===cid;
    const wonCup = S.cups && allCupKeys().some(k=>cupCompetitionChampion(S.cups[k])===cid);
    S.squads[cid].forEach(p=>{
      p.career=p.career||{titles:0,seasonsTopDiv:0,bestFinish:99};
      if(wonDivision||wonCup) p.career.titles++;
      if(S.division==='A') p.career.seasonsTopDiv++;
      if(pos>0) p.career.bestFinish=Math.min(p.career.bestFinish,pos);
    });
  });
  // purge detailed cache -> new season
  S.finished=true;
  save();
}
/* recalcula OS/MS/DS/overall do clube a partir do elenco atual — sem isso esses números
   ficam congelados no valor da criação mesmo depois dos jogadores evoluírem/aposentarem
   (ranking de força de clube e ofertas de emprego da CPU liam um dado cada vez mais velho). */
function recomputeClubOverall(clubId){
  const club=DATA.clubs.find(c=>c.id===clubId), sq=S.squads[clubId];
  if(!club || !sq || !sq.length) return;
  const bySec=s=>sq.filter(p=>p.s===s);
  const avg=a=>a.length?a.reduce((s,p)=>s+p.f,0)/a.length:(club.overall||55);
  club.OS=avg(bySec('ATT')); club.MS=avg(bySec('MID'));
  club.DS=avg(bySec('GK'))*0.35+avg(bySec('DEF'))*0.65;
  club.overall=Math.round(sq.reduce((s,p)=>s+p.f,0)/sq.length);
}
/* aposentadoria: degrau de chance a partir dos 32 anos, calibrado por simulação de Monte
   Carlo pra idade média de aposentadoria ficar perto de 34; a partir dos 40, é certa —
   ninguém joga pra sempre. Ver relatorios/Sugestoes_Mecanica_ParaDepois.md pro contexto. */
const RETIRE_CHANCE_BY_AGE={32:0.11,33:0.24,34:0.40,35:0.56,36:0.71,37:0.83,38:0.92,39:0.97};
function retireChance(age){
  if(age<32) return 0;
  if(age>=40) return 1;
  return RETIRE_CHANCE_BY_AGE[age] ?? 0.11;
}
/* gera o jovem que assume a vaga de quem se aposentou — sempre 18-22 anos (entra pra
   crescer, não pra já ser referência), na faixa de força da divisão do clube (mesma
   tabela usada em proceduralDivisionClubs; Série A usa a faixa de referência A, ver
   DIVISION_FORCE_RANGE, já que dado real não existe pra um jogador que acabou de estrear). */
function retirementReplacement(position, division, seedExtra){
  const range=DIVISION_FORCE_RANGE[division]||DIVISION_FORCE_RANGE.D;
  const R=makeRng(hashSeed('retire-repl',(S&&S.seed)||1,S.season,division,position,seedExtra));
  const age=Math.round(18+R.random()*4);
  const f=rollAgedForce(R,range,age);
  const lg=MARKET.divisionToLeague(division);
  return { n:pickProcPlayerName(R), p:position, s:position, f, age, lg, mv:MARKET.marketValue(f,age,lg),
    ft:R.random()<0.8?'R':'L', num:String(Math.floor(R.random()*40)+1), nat:'Brasil', ag:'—',
    moral:70, energy:100 };
}
/* envelhecimento + aposentadoria + reancoragem de valorização — uma vez por temporada,
   pra cada clube com elenco materializado (S.squads = a divisão atual do usuário; as
   outras 3 rodam só por overall agregado, sem jogador individual pra aposentar). */
function applySeasonAgingAndRetirement(){
  Object.keys(S.squads).forEach(cid=>{
    const sq=S.squads[cid];
    for(let i=sq.length-1;i>=0;i--){
      const p=sq[i];
      p.age=(p.age||26)+1;
      // reancora f0/mv0 no início da temporada — sem isso a razão mv0/f0 usada em
      // evolvePlayer fica presa numa referência cada vez mais velha e trava no teto de 3x.
      p.f0=p.f; p.mv0=(p.mv||1e6);
      p.benchStreak=0;
      if(p.contract) p.contract.benchStreak=0;
      const R=makeRng(hashSeed('retire-roll',(S&&S.seed)||1,S.season,cid,i,p.n));
      if(R.random()<retireChance(p.age)){
        const repl=attachAttrs(initStats(retirementReplacement(p.s, S.division, cid+'_'+i)));
        sq[i]=repl;
        if(cid===S.clubId){
          S.roundNews=S.roundNews||[];
          S.roundNews.push(`👋 ${p.n} encerrou a carreira aos ${p.age} anos. ${repl.n} (${repl.age} anos) chega pra disputar a vaga.`);
        }
      }
    }
    recomputeClubOverall(cid);
  });
}
/* calcula (sem aplicar) pra qual divisão o usuário iria na próxima temporada —
   permite à UI pré-carregar dados reais ANTES de chamar newSeasonReset() */
function pendingDivisionChange(){
  return decidePromotionRelegation(tablePos(S.clubId), DATA.clubs.length);
}
function newSeasonReset(){
  const finalTable=sortedTable();
  const finalPos=tablePos(S.clubId);
  S._intlUserFinish=finalPos; // classificação doméstica -> vaga na Champions/Europa da próxima temporada
  const totalClubs=DATA.clubs.length;
  const prevDivision=S.division;
  const newDivision=decidePromotionRelegation(finalPos, totalClubs);
  const changingDivision = newDivision!==prevDivision;
  const outcome = !changingDivision ? null : (DIV_ORDER.indexOf(newDivision)<DIV_ORDER.indexOf(prevDivision) ? 'promoted' : 'relegated');

  // promove/rebaixa as 4 divisões de verdade (não só a do usuário) a partir da tabela
  // final de cada uma, ANTES de trocar DATA.clubs — assim switchToDivision()/o "senão"
  // abaixo já leem a composição correta pra próxima temporada (ver computeDivisionSwap).
  S.divisionClubs = computeDivisionSwap();

  if(changingDivision){
    switchToDivision(newDivision, outcome); // troca DATA.clubs/S.squads/S.table/S.sched/S.round/S.division
    S.coachHistory=S.coachHistory||[];
    S.coachHistory.push({season:S.season+1, type:outcome==='promoted'?'acesso':'rebaixamento',
      text:`${outcome==='promoted'?'Acesso à':'Rebaixado para'} ${DIV_LABEL_FULL[newDivision]||('Série '+newDivision)}`});
  } else {
    // mesmo sem o usuário mudar de divisão, ela pode ter trocado até 4 clubes (quem
    // desceu da de cima / quem subiu da de baixo) — recompõe DATA.clubs de verdade.
    const myClub = DATA.clubs.find(c=>c.id===S.clubId);
    const newClubs = ensureDivisionClubs(S.division).filter(c=>c.id!==S.clubId).slice(0, DIVISION_SIZE[S.division]-1);
    DATA.clubs = [myClub, ...newClubs];
    DATA.clubs.forEach(c=>{ if(!S.squads[c.id]) S.squads[c.id]=c.squad.map(p=>attachAttrs(initStats({...p}))); });
    const ids=DATA.clubs.map(c=>c.id);
    S.sched=makeSchedule(ids); S.round=0;
    S.table={}; DATA.clubs.forEach(c=>S.table[c.id]={id:c.id,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0});
    S._promoRelegNews=null;
    buildOtherDivisions();
  }
  S.week=1; S.day=1; S.season++;
  S.results=[]; S.scorers={}; S.negos=[]; S.finished=false; S.pendingEvent=null;
  S.finances=[]; S.roundNews=[];
  S.seasonTotals={income:0,salaries:0,bonuses:0,playerSales:0,playerPurchases:0,stadium:0}; // zera pra temporada nova
  if(S.stadium) S.stadium.builtThisSeason=0; // libera a cota de obras da nova temporada (crescimento lento)
  // renovação automática do salário do treinador a cada temporada (se não foi demitido)
  if(S.coachSalary && S.roundsSinceFired===null){
    S.coachSalary = Math.round(S.coachSalary * 1.05); // aumento de 5% ao ano
  }
  S.roundsSinceFired=null; // limpar contador de rodadas desde demissão na nova temporada
  S.pendingJobOffers=[]; // limpar ofertas pendentes
  Object.values(S.squads).flat().forEach(p=>{p.moral=70;p.energy=100;p.suspended=0;p.injuredMatches=0;p.stats={r3:[],g3:[],apps:0,goals:0,cs:0,yellows:0,reds:0,injuries:0};});
  squad(S.clubId).forEach(p=>{ if(p.contract){p.contract.gotMatchesBonus=false;p.contract.benchStreak=0;} });
  applySeasonAgingAndRetirement(); // envelhece, aposenta quem for a hora, reancora f0/mv0, resincroniza overall
  autoManageSalaries();
  S.xi=autoXI(S.clubId);
  // copas continentais só existem pra quem está na Série A (só ela classifica pra elas);
  // Copa do Brasil roda pra QUALQUER divisão do usuário, com clubes das 4 divisões (ver
  // copaBrasilQualification). Se o usuário estava na Série A na temporada anterior, a tabela
  // final dela vale pra classificação real das copas continentais; se ele acabou de ser
  // promovido (vinha de B/C/D), não existe uma "tabela da Série A anterior" pros clubes
  // novos — usa força (overall) como proxy, igual à 1ª temporada.
  const qualTable = (S.division==='A') ? ((prevDivision==='A') ? finalTable : DATA.clubs.slice().sort((a,b)=>b.overall-a.overall).map(c=>({id:c.id}))) : null;
  initSeasonCups(qualTable ? computeQualification(qualTable) : {libertadores:[],sulamericana:[]});
  rollBgLeaguesSeason(); // vira a temporada das ligas de background (campeão/histórico/promoção)
  save();
}

/* toast */
function toast(msg){const box=$('#toast');const t=el('div','toast',msg);box.appendChild(t);vibrate(5);setTimeout(()=>t.remove(),2600);}

window.GAME={newGame,playRound,save,loadRaw,wipe,newSeasonReset,S:()=>S,setS:s=>S=s,
  COMP_DEFS,computeQualification,makeBracket,advanceCupBracket,advancePendingCups,cupTeamAlive,cupIsFinished,
  pendingDivisionChange,loadRealDivisionClubs,DIV_ORDER,
  startNego,clubRespond,agentRespond,finalizeTransfer,playerAsk,cpuBackgroundTransfers,refreshAuctionPool,buyFromAuction,
  inTransferWindow,transferWindowStatus,nextWindowRound,TRANSFER_WINDOWS,
  pickPenaltyTaker,penaltyConvChance,initSeasonCups,computeQualification,buildOtherDivisions,autoManageSalaries,
  assignBehavior,BEHAVIOR_CARD_MULT,BEHAVIOR_INJURY_MULT,BEHAVIOR_MV_MULT,BEHAVIOR_DIST,attachAttrs};

