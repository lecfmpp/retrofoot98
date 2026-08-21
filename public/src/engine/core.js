
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
    text:`Clube europeu prepara proposta de ${fmt(liveMV(p)*1.4)} por ${p.n}. O jogador está com a cabeça na Europa.`,
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
/* UM VALOR SÓ, E É O QUE ESTÁ NA TELA.
   Havia dois "valores de mercado" a correr em paralelo. A interface mostra
   sempre `computeVM(p)` — o valor VIVO, que é o `p.mv` de base multiplicado
   pela idade (1,5x até aos 19; 0,7x a partir dos 31) e pela fase (1,25x em
   fase). O motor, por outro lado, precificava tudo em cima do `p.mv` cru.

   Nos jogadores de 1,0x — a maioria — os dois batiam e ninguém notava. Num
   jogador de 31 anos não batiam nada: a proposta recebida saía entre 1,0 e
   1,7 do `p.mv`, e a tela ao lado dizia que ele valia 0,7 disso. A oferta
   aparecia com até 2,4 vezes o "valor de mercado" impresso na mesma linha.

   Pior: o teto do comprador (`maxFee`) nasce do mesmo `fee`. Quem contrapunha
   ancorado no número da tela pedia acima de um teto calculado noutra escala, e
   levava um "não pago mais do que isso" com um número bem abaixo do que a
   própria tela chamava de valor de mercado.

   Daqui para a frente há um nome só para esse número, e é ele que o motor usa
   em toda a precificação: proposta recebida, mercado da CPU, leilão, cláusula
   e assédio europeu. O `p.mv` continua a ser a base guardada; ninguém volta a
   precificar por ela diretamente. */
function liveMV(p){
  if(!p) return 1e6;
  const v=(typeof computeVM==='function')?computeVM(p):0;
  return Math.max(1, v || p.mv || 1e6);
}
/* asking price = live VM (idade+desempenho) + seller momentum ("luvas") */
function playerAsk(p, sellerId){
  let ask=computeVM(p)*1.15;
  const pos=sellerId?tablePos(sellerId):10;
  if(pos>=17)ask*=1.40;        // clube no Z-4 exige luvas p/ liberar
  else if(pos<=6)ask*=1.20;    // clube grande segura o atleta
  /* O PEDIDO E UM NUMERO REDONDO, ao milhar. As telas mostram o dinheiro
     abreviado ("R$ 24,35 mi"), e com um pedido de 24.354.321 quem oferecia
     exatamente o que estava escrito ficava abaixo do pedido -- a proposta com o
     "valor exato" era respondida com contraproposta, como se nao cobrisse. Um
     clube tambem nao pede 24.354.321: pede 24,35 milhoes. */
  return Math.round(ask/1000)*1000;
}

/* ---- TRAVA DE NEGOCIAÇÃO: jogador comprado fica bloqueado pro resto da TEMPORADA em que a
   compra aconteceu — sem isso dava pra comprar e revender (pra CPU, leilão, oferta recebida etc.)
   na sequência, num ciclo sem sentido de "flipar" jogadores. Guarda só a temporada (não a rodada):
   expira sozinho na virada de temporada, sem precisar de limpeza explícita em newSeasonReset(). */
function applyTradeLock(p){ if(p) p._tradeLockSeason=S.season; }
function isTradeLocked(p){ return !!(p && p._tradeLockSeason===S.season); }
/* ================= PISO DE ELENCO POR POSIÇÃO (goleiro) =================
   O jogo deixava um clube ficar SEM goleiro nenhum: nenhum dos caminhos de saída de jogador
   (Vender, aceitar proposta recebida, multa rescisória europeia, mercado da CPU, leilão)
   olhava a POSIÇÃO — só o tamanho do elenco, e nem sempre. Um elenco sem goleiro trava o
   próprio jogo: xiGKCount()===0 bloqueia o botão Jogar (ver clSelecao), e não havia como
   voltar atrás no meio da temporada fora da janela.
   Agora vale um piso: todo clube mantém no mínimo 2 goleiros. Não é só uma trava na hora de
   aceitar — os geradores (proposta da CPU, leilão, mercado de fundo) já nem MIRAM o jogador
   que quebraria o piso, pra não oferecer o que não dá pra vender.
   Aposentadoria não passa por aqui de propósito: ela substitui o jogador na mesma posição
   (makeRegen(p.s) no resolve-round / endSeason), então nunca some um goleiro por ali. */
const SQUAD_FLOOR={ GK:2 };
const POS_NOME={GK:'goleiro', DEF:'zagueiro', MID:'meia', ATT:'atacante'};
function countPos(clubId, pos){ return ((S.squads&&S.squads[clubId])||[]).filter(x=>x&&x.s===pos).length; }
/* trava única: pode tirar este jogador deste clube? Usada por TODOS os caminhos de saída. */
function canReleaseFromSquad(clubId, p){
  const min=SQUAD_FLOOR[(p&&p.s)||'']; if(!min) return {ok:true};
  if(countPos(clubId, p.s) > min) return {ok:true};
  const nome=POS_NOME[p.s]||'jogador';
  return {ok:false, msg:`O elenco precisa de pelo menos ${min} ${nome}${min>1?'s':''}. Contrate outro ${nome} antes de liberar ${p.n||'este jogador'}.`};
}
/* ================= TREINO ESPECIAL =================
   Feature nova (não existia nenhum rastro no código: "treino"/"treinar" só apareciam em textos
   sem relação, tipo "onde vai treinar" = escolher clube). Limite de 3 jogadores em treino ao
   mesmo tempo por clube (S.trainingByClub, escopado como toda lista compartilhada — ver #1.1);
   quem está em treino ganha uma chance EXTRA de evolução por rodada (evolvePlayer, index.html),
   somada ao que já ganhava jogando/descansando jovem. "Estrelinha" (destaque/potencial) acelera
   ainda mais — como não existia esse conceito, é derivado de forma estável (determinística) do
   próprio jogador via hasEstrelinha(), sem precisar mexer em todo canto que cria jogador. */
const TRAINING_MAX_SLOTS=3;
function hasEstrelinha(p){ if(!p) return false; return (hashSeed(p.pid!=null?p.pid:0, p.n||'','estrelinha')>>>0)%100 < 15; }
function myTrainingList(){ return (S.trainingByClub && S.trainingByClub[S.clubId])||[]; }
function startTraining(pid){
  S.trainingByClub=S.trainingByClub||{};
  const mine=S.trainingByClub[S.clubId]=S.trainingByClub[S.clubId]||[];
  if(mine.includes(pid)) return {ok:false,msg:'Esse jogador já está em treino.'};
  if(mine.length>=TRAINING_MAX_SLOTS) return {ok:false,msg:`Máximo de ${TRAINING_MAX_SLOTS} jogadores em treino ao mesmo tempo.`};
  const p=(S.squads[S.clubId]||[]).find(x=>x.pid===pid); if(!p) return {ok:false,msg:'Jogador não encontrado.'};
  mine.push(pid); p._training=true; save();
  return {ok:true,msg:`${p.n} entrou em treino especial.`};
}
function stopTraining(pid){
  S.trainingByClub=S.trainingByClub||{};
  S.trainingByClub[S.clubId]=(S.trainingByClub[S.clubId]||[]).filter(x=>x!==pid);
  const p=(S.squads[S.clubId]||[]).find(x=>x.pid===pid); if(p) delete p._training;
  save();
  return {ok:true};
}
/* FONTE ÚNICA do treino = S.trainingByClub. O flag p._training (que evolvePlayer lê) mora no
   OBJETO do jogador, dentro de S.squads — e S.squads é justamente o que é substituído inteiro
   quando um estado é adotado (carregar save, adotar a rodada do servidor na Resenha). Sem esta
   reconciliação o cone continuava aparecendo no elenco (o menu lê trainingByClub) enquanto o
   bônus de evolução tinha sumido junto com o flag. Chamado em todo ponto de adoção de estado. */
function syncTrainingFlags(){
  if(typeof S==='undefined' || !S || !S.squads) return;
  const map=S.trainingByClub||{};
  Object.keys(S.squads).forEach(cid=>{
    const lista=map[cid]; const sq=S.squads[cid]; if(!Array.isArray(sq)) return;
    if(!lista || !lista.length){ sq.forEach(p=>{ if(p && p._training) delete p._training; }); return; }
    const set=new Set(lista.map(String));
    sq.forEach(p=>{ if(!p) return; if(set.has(String(p.pid))) p._training=true; else delete p._training; });
  });
}
/* ================= RAIO-X DA EVOLUÇÃO (o "porquê" que a tela mostra) =================
   O usuário via o jogador subir de força sem entender a velocidade nem por que um cresce mais que
   o outro. Isto NÃO é uma nova mecânica: é o MESMO cálculo de evolvePlayer (index.html /
   resolve-round), lido de fora, pra a tela poder dizer em números o que já acontece.

   Como a evolução funciona, em uma frase: o jogador não ganha "força" direto — ele ganha PONTO DE
   ATRIBUTO (finalização, passe, reflexos...), e a Força é a média ponderada dos atributos do perfil
   da posição, remapeada pela curva da divisão. Daí os dois efeitos que confundem:
     • às vezes ele joga bem e a Força não muda (o ponto ganho não foi suficiente pra virar 1 na
       escala exibida);
     • às vezes ele "dá um salto" de 2-4 de uma vez (a curva por divisão é bem mais íngreme na
       faixa alta — ver BANDS em rebalance.js: na Série D, 1 ponto de força bruta chega a valer
       +3 de Força exibida, contra +0,6 na Série A).

   Fontes de ganho e perda POR RODADA (idênticas a evolvePlayer):
     JOGAR BEM  2 sorteios, chance = potencial(idade) × ((nota−6,8)/2,2 + bônus de gol) × currículo
     TREINO     1 sorteio de 5% (9% com ⭐)
     JOVEM ≤20  1 sorteio de potencial×12% mesmo sem jogar
     IDADE ≥29  3 sorteios de queda nos atributos físicos (atenuados por boa fase)
     BANCO 4+   1 sorteio de queda física (isento: jovem ≤20 e quem está em treino)            */
const GROWTH_BY_AGE=[[20,1.0],[23,0.7],[27,0.35],[30,0.10]];
function growthFactor(age){ for(const [lim,v] of GROWTH_BY_AGE) if(age<=lim) return v; return 0; }
function declineFactor(age){ return age>=33?0.55 : age>=31?0.32 : age>=29?0.12 : 0; }
/* quanto 1 ponto de atributo vale em FORÇA pra este jogador, aqui e agora. O sorteio escolhe um
   atributo qualquer do perfil da posição, então o ganho médio de nível é 1/(nº de atributos do
   perfil) — por isso goleiro (6 atributos, sendo reflexos+mãos 64% do peso) evolui bem mais rápido
   que meia (11 atributos). Depois o nível vira força bruta e a força bruta passa pela curva da
   divisão, cuja inclinação é medida aqui no ponto em que o jogador está. */
function forcePerAttrPoint(p){
  const prof=(typeof POS_PROFILE!=='undefined'&&(POS_PROFILE[p.s]||POS_PROFILE.MID))||null; if(!prof) return 0;
  const nKeys=Object.keys(prof).length; if(!nKeys) return 0;
  const rawF=(p.rawF!=null?p.rawF:p.f)||60, div=p._div||(S&&S.division)||'A';
  const dRaw=(1/nKeys)*(46/13);                                   // 1 ponto de atributo -> força BRUTA
  const inclinacao=(REBAL.force(rawF+3,div)-REBAL.force(rawF-3,div))/6; // força EXIBIDA por ponto bruto, na faixa atual
  return dRaw*inclinacao;
}
/* devolve o raio-x completo: cada fonte com a chance real por rodada, o saldo em pontos de
   atributo e a tradução pra Força/temporada. `played` é opcional (default: está no XI atual). */
function growthProfileOf(p, played){
  if(!p) return null;
  const age=p.age||26, growth=growthFactor(age), decline=declineFactor(age);
  const st=p.stats||{};
  const form=(st.r3&&st.r3.length)?st.r3.reduce((x,y)=>x+y,0)/st.r3.length:6.5;
  const goals3=(st.g3&&st.g3.length)?st.g3.reduce((x,y)=>x+y,0):0;
  const titular=(played!=null)?played:((S.xi||[]).indexOf(p.pid)>=0);
  const treino=!!p._training;
  const star=(typeof hasEstrelinha==='function')&&hasEstrelinha(p);
  const benchStreak=(p.contract?p.contract.benchStreak:p.benchStreak)||0;
  const fontes=[];
  if(titular && form>=6.8 && growth>0){
    const careerBonus=1+Math.min(0.5,((p.career&&p.career.titles)||0)*0.08+((p.career&&p.career.seasonsTopDiv)||0)*0.02);
    const golBonus=Math.min(0.08, goals3*0.03);
    const chance=Math.min(1, growth*((form-6.8)/2.2+golBonus)*careerBonus);
    fontes.push({ tipo:'jogar', sinal:+1, pontos:2*chance, chance,
      label:'Jogando bem (nota '+(Math.round(form*10)/10).toString().replace('.',',')+')' });
  }
  if(treino) fontes.push({ tipo:'treino', sinal:+1, pontos:0.05*(star?1.8:1), chance:0.05*(star?1.8:1),
    label:'Treino especial'+(star?' + ⭐ destaque':'') });
  if(!titular && age<=20 && growth>0) fontes.push({ tipo:'jovem', sinal:+1, pontos:growth*0.12, chance:growth*0.12,
    label:'Formação (≤20 anos, mesmo sem jogar)' });
  if(decline>0){
    const formMult=Math.max(0.62, 1-Math.max(0,form-6.5)*0.15);
    fontes.push({ tipo:'idade', sinal:-1, pontos:3*decline*0.22*formMult, chance:decline*0.22*formMult,
      label:'Desgaste da idade ('+age+' anos)' });
  }
  if(benchStreak>=4 && age>20 && !treino){
    const chance=Math.min(0.25,(benchStreak-3)*0.05);
    fontes.push({ tipo:'banco', sinal:-1, pontos:chance, chance, label:'Perda de ritmo ('+benchStreak+' rodadas fora do time)' });
  }
  const saldoPontos=fontes.reduce((s,f)=>s+f.sinal*f.pontos,0);
  const porPonto=forcePerAttrPoint(p);
  const forcaPorRodada=saldoPontos*porPonto;
  return { age, growth, decline, form, goals3, titular, treino, star, benchStreak, fontes,
           saldoPontos, forcaPorRodada, forcaPorTemporada:forcaPorRodada*38, porPonto };
}
/* ---- HISTÓRICO DE TRANSFERÊNCIAS por jogador — antes só existia um log rolante (máx. 50) pras
   ligas de fundo (S.bgLeagues[...].transferLog), nada persistente pro usuário: o jogo só
   "lembrava" a primeira troca de clube porque nada gravava as seguintes. p.transferHistory vive
   no PRÓPRIO objeto do jogador (como p.career/p.careerStats) — sobrevive a newSeasonReset() até
   ele se aposentar. ATENÇÃO: isso NÃO vale pra p.stats — esse newSeasonReset() zera por
   completo a cada temporada (é o "placar" da temporada em curso); quem acumula pro Historial
   entre temporadas é p.careerStats (ver endSeason(), alimentado ANTES do reset). Chamado em
   TODO ponto que move um jogador entre clubes de verdade (compra/venda/leilão/proposta humana). */
function recordTransferHistory(p, fromId, toId, fee){
  if(!p) return;
  p.transferHistory=p.transferHistory||[];
  p.transferHistory.push({ season:S.season, round:S.round, from:fromId||null, to:toId||null, fee:Math.round(fee||0) });
  if(p.transferHistory.length>30) p.transferHistory.shift(); // teto de sanidade (carreira de 30 trocas já é MUITO)
}
/* ---- rigorous 3-day negotiation cycle ----
   Dia 1 (fee): clube decide a taxa. Dia 2 (terms): empresário avalia salário.
   Dia 3 (verdict): jogador aceita/recusa a contraproposta.                 */
function startNego(sellerId,playerName,offerFee){
  if(!canNegotiate()) return -1; // janela fechada: nem inicia negociação
  if(typeof CL!=='undefined' && CL.online && CL.humans && CL.humans[sellerId]) return -1; // clube de humano: usa sendHumanOffer (proposta de verdade), não a negociação algorítmica (CPU)
  const p=findP(playerName,sellerId);
  if(isTradeLocked(p)) return -1; // comprado nesta temporada — travado pra não ser revendido em seguida
  S.negos.push({ sellerId, player:playerName, stage:'fee', status:'aberta',
    offerFee, clubCounter:null, feeAgreed:false,
    salary:REBAL.wage(p.f), role:'Titular Regular',
    clauses:{gol:true, europa:false, europaValue:Math.round(liveMV(p)*2)},
    agentCounter:null, interest:0, day:S.day });
  save();
  return S.negos.length-1;
}
/* O QUE ESTA ESCRITO NA TELA E O QUE VALE. As telas mostram dinheiro abreviado a
   duas casas ("R$ 24,35 mi") e ha ainda a conversao de moeda pelo meio: um
   pedido cru de 24.354.321 nunca era coberto por quem digitava o valor que lia.
   Alem de o pedido passar a ser redondo (playerAsk), qualquer comparacao de
   dinheiro nesta negociacao aceita meio por cento de folga -- a diferenca de
   arredondamento, nunca uma pechincha: meio por cento de 24 milhoes sao 120 mil,
   e ninguem perde um negocio por isso. */
const NEGO_FOLGA=0.995;
function cobre(oferta, pedido){ return (oferta||0) >= Math.round((pedido||0)*NEGO_FOLGA); }
function clubRespond(n){ // Dia 1
  const p=findP(n.player,n.sellerId); const ask=playerAsk(p,n.sellerId);
  // se já houve contraproposta, cobrir o valor pedido FECHA o acordo (antes re-comparava
  // com o pedido original e gerava contrapropostas infinitas — oferta "igual" nunca era aceita)
  if(n.clubCounter && cobre(n.offerFee,n.clubCounter)){ n.feeAgreed=true; n.stage='terms'; return {ok:true,msg:'Clube aceitou a taxa! Negocie os termos pessoais (Dia 2).'}; }
  if(cobre(n.offerFee,ask)){ n.feeAgreed=true; n.stage='terms'; return {ok:true,msg:'Clube aceitou a taxa! Negocie os termos pessoais (Dia 2).'}; }
  if(n.offerFee>=ask*0.82){ n.clubCounter=Math.round((ask+n.offerFee)/2/1000)*1000; n.stage='counterFee'; return {ok:false,counter:n.clubCounter,msg:`Clube pediu ${fmt(n.clubCounter)} pela taxa.`}; }
  n.status='recusada'; n.stage='done'; return {ok:false,msg:'Clube recusou de imediato.'};
}
function agentInterest(n){ // Dia 2 satisfaction %
  const p=findP(n.player,n.sellerId); if(!p)return 0;
  const expSal=Math.round(REBAL.wage(p.f)*1.1);
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
  if(n.interest>=45){ n.agentCounter=Math.round(REBAL.wage(p.f)*1.15/100)*100; n.stage='verdict'; return {ok:false,counter:n.agentCounter,msg:`Empresário pede ${fmt(n.agentCounter)}/sem.`}; }
  return {ok:false,msg:'Empresário sem interesse nas condições.'};
}

/* ====================== JANELA DE TRANSFERÊNCIAS ======================
   Decisão do usuário (não datas reais da CBF): duas janelas de 10 rodadas cada, com 10 fechadas
   no meio e 10 fechadas no fim:
     0-9   ABERTA
     10-19 FECHADA
     20-29 ABERTA
     30-38 FECHADA (reta final da temporada). */
const TRANSFER_WINDOWS=[[0,9],[20,29]]; // [rodada inicial, rodada final], inclusive
const PRE_WINDOW_ROUNDS=0; // pré-janela desligada — ver inPreWindow()
function inTransferWindow(){ return TRANSFER_WINDOWS.some(([lo,hi])=>S.round>=lo && S.round<=hi); }
function nextWindowRound(){ for(const [lo] of TRANSFER_WINDOWS){ if(S.round<lo) return lo; } return null; }
/* PRÉ-JANELA DESLIGADA (decisão do dono do jogo): negociar antes da janela abrir, com o jogador
   só trocando de clube depois, deixava a regra confusa (duas datas por transferência, elenco com
   jogador "já vendido" em campo, proposta que expira antes de executar) sem ganho real. A regra
   agora é uma só: transferência SÓ com a janela aberta.
   inPreWindow() fica devolvendo null de propósito, em vez de sumir: os ramos de pré-acordo
   (finalizeTransfer/acceptIncomingOffer/executePendingTransfers) continuam no código pra
   executar/limpar pré-acordos que já existam em saves antigos — só não nascem mais. */
function inPreWindow(){ return null; }
/* negociação liberada? (só com a janela ABERTA) */
function canNegotiate(){ return inTransferWindow(); }
function transferWindowStatus(){
  if(inTransferWindow()){
    const w=TRANSFER_WINDOWS.find(([lo,hi])=>S.round>=lo&&S.round<=hi);
    // "fecha em" = rodadas que faltam pro fim DESTA janela (limitado ao fim do calendário por segurança).
    const lastRound=(Array.isArray(S.sched)?S.sched.length:38)-1;
    const hi=Math.min(w[1], lastRound);
    return {open:true, closesIn:Math.max(0, hi-S.round)};
  }
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
      // buyerId: o clube que FECHOU o acordo (gravado em finalizeTransfer) — NÃO pode ser
      // S.clubId aqui, porque quem roda isto é sempre quem executa playRound() (no Resenha, o
      // ANFITRIÃO no fallback), que pode ser um clube diferente do que realmente comprou.
      const buyerId=t.buyerId!=null ? t.buyerId : S.clubId; // fallback pra saves antigos sem o campo
      const p=(S.squads[t.sellerId]||[]).find(x=>x.n===t.playerName);
      if(!p){
        // o jogador já não está mais no vendedor — foi negociado por outro caminho (CPU, outro
        // humano) enquanto o pré-acordo esperava a janela abrir. CANCELA e REEMBOLSA quem
        // comprou (o valor já tinha sido debitado na hora do acordo, em finalizeTransfer) — antes
        // disso, o "snapshot" antigo do jogador era empurrado pro comprador mesmo já pertencendo a
        // outro clube, duplicando o jogador em dois elencos ao mesmo tempo.
        if(buyerId===S.clubId){
          S.budget+=t.fee; commitBudget();
          S.roundNews.push(`↩️ Acordo por ${t.playerName} cancelado — ele já tinha sido negociado antes da janela abrir. ${fmt(t.fee)} devolvidos.`);
        }
        return;
      }
      S.squads[t.sellerId]=S.squads[t.sellerId].filter(x=>x.n!==t.playerName);
      p.contract=t.contract; p.moral=75; applyTradeLock(p); recordTransferHistory(p, t.sellerId, buyerId, t.fee);
      MARKET.revalueOnTransfer(p, MARKET.divisionToLeague(S.division)); // gatilho de vitrine na chegada
      S.squads[buyerId]=S.squads[buyerId]||[]; S.squads[buyerId].push(p);
      recordNetTransfer(t.sellerId, buyerId, t.playerName, t.contract, t.fee, p&&p.pid); // online: avisa o servidor
      if(buyerId===S.clubId) S.roundNews.push(`✍️ ${t.playerName} se apresentou ao ${clubOf(buyerId).short} (transferência acordada, agora com a janela aberta).`);
    } else if(t.kind==='sell'){
      // sellerId: o clube que fechou a venda (gravado em clSellConfirm/acceptIncomingOffer) —
      // mesma razão do buyerId acima: S.clubId na hora da EXECUÇÃO pode não ser quem vendeu.
      const sellerId=t.sellerId!=null ? t.sellerId : S.clubId; // fallback pra saves antigos
      const p=(S.squads[sellerId]||[]).find(x=>x.n===t.playerName);
      if(!p){ return; } // já saiu por outro caminho
      S.squads[sellerId]=S.squads[sellerId].filter(x=>x.n!==t.playerName);
      if(sellerId===S.clubId){ S.budget+=t.fee; commitBudget(); } // publica: senão o crédito é revertido na próxima rodada
      if(t.buyerCountry) ensureBgClubMaterialized(t.buyerId);
      delete p.contract; delete p._pendingSale;
      recordTransferHistory(p, sellerId, t.buyerCountry?null:t.buyerId, t.fee);
      if(S.squads[t.buyerId]) S.squads[t.buyerId].push(p);
      // comprador estrangeiro (background/CONMEBOL) NÃO existe no mundo do servidor -> registra como
      // SAÍDA DO MUNDO (to:null): o servidor remove o jogador do vendedor de vez (senão a venda era
      // rejeitada, o jogador voltava e dava pra revender infinitamente). O dinheiro já foi via commitBudget.
      recordNetTransfer(sellerId, t.buyerCountry?null:t.buyerId, t.playerName, null, t.fee, p&&p.pid); // online: avisa o servidor (venda)
      if(sellerId===S.clubId){
        S.roundNews.push(`💰 ${t.playerName} deixou o clube rumo ao ${t.buyerName} por ${fmt(t.fee)} (transferência acordada).`);
        pushFinanceEntry({playerSales:t.fee, log:[`💰 ${t.playerName} vendido ao ${t.buyerName} por ${fmt(t.fee)}.`]});
      }
    }
  });
  S.pendingTransfers=stay;
}


/* ---- Dia 3 (verdict): fecha a negociação de verdade — move o jogador,
   desconta o caixa, cria o contrato. Chamado pela UI quando o usuário aceita. ---- */
/* ===== RESENHA (online): transferências precisam chegar ao SERVIDOR =====
   O resolve-round é o único produtor do games.shared_state. Qualquer troca de elenco feita só no
   cliente (compra/venda) é DESFEITA na rodada seguinte, quando o cliente adota o estado do servidor
   — era exatamente por isso que o jogador comprado sumia do plantel depois da tela de pós-rodada.
   Aqui só REGISTRO a transferência; ela viaja junto do resultado da rodada (netPublishResult ->
   last_result.transfers) e o servidor aplica no mundo (applyHumanTransfers, idempotente lá).
   Fica no buffer até o servidor confirmar (ver pruneAppliedNetTransfers) — se um envio se perder,
   o próximo reenvia. No solo é no-op: lá o próprio cliente é a autoridade.
   toId nulo = o jogador SAI do mundo (multa rescisória paga por clube europeu que não existe
   como clube jogável) — o servidor só o remove do elenco de origem.
   fee = a taxa da transação. Ela existe aqui porque o dinheiro precisa andar JUNTO do jogador:
   o servidor move o caixa do lado NÃO-humano (ver applyHumanTransfers). O lado humano continua
   vindo de game_seats.budget — mexer nos dois seria contar duas vezes. */
function recordNetTransfer(fromId, toId, playerName, contract, fee, pid){
  if(typeof CL==='undefined' || !CL.online) return;
  if(!fromId || !playerName) return;
  S._netTransfers = S._netTransfers || [];
  // pid = identidade por ID (move o homônimo CERTO no servidor); nome fica como fallback
  S._netTransfers.push({ p:playerName, pid:pid||null, from:fromId, to:toId||null, contract:contract||null, fee:Math.round(fee||0) });
}
/* ===== SUBIR JOGADOR DA BASE (item 5) — uma vez por TURNO do campeonato =====
   Gera um jovem das categorias de base (16-19 anos) no nível da divisão do time, na posição mais
   CARENTE do elenco, e o adiciona. A força é aleatória dentro da faixa da divisão (≈ média do time).
   No ONLINE, viaja pro servidor como uma "transferência" de origem BASE (carrega o jogador inteiro);
   o servidor ADICIONA o jogador ao clube (senão a mutação local seria desfeita no adopt). */
function currentTurno(){ const half=Math.floor((Array.isArray(S.sched)?S.sched.length:38)/2); return (S.round||0) < half ? 1 : 2; }
/* índice da janela de transferências ATUAL (0 = [0,9], 1 = [20,29]); -1 fora dela (10-19 e 30-38).
   A base sobe no MÁXIMO 1 jogador POR JANELA (2 por temporada, uma em cada janela). */
function currentWindowIndex(){
  if(typeof TRANSFER_WINDOWS==='undefined') return 0;
  for(let i=0;i<TRANSFER_WINDOWS.length;i++){ const w=TRANSFER_WINDOWS[i]; if((S.round||0)>=w[0] && (S.round||0)<=w[1]) return i; }
  return -1;
}
/* quantos jovens ESTE clube já subiu NESTA janela desta temporada — DERIVADO do próprio elenco
   (cada jovem carrega _youthSeason + _youthWindow) MAIS o buffer de transferências pendentes.
   É autoritativo: o jogador viaja pro servidor (from:'BASE') e volta no shared_state, então a
   contagem sobrevive aos adopts do online e é naturalmente por-clube — sem contador solto em S
   que vazaria entre humanos ou resetaria pro convidado.
   O buffer TEM que entrar na conta (ONLINE): as transferências viajam de carona no resultado da
   partida (netPublishResult), então uma promoção feita DEPOIS de jogar a rodada — justamente
   quando o jogador volta pra tela do time enquanto espera os outros — só é enviada na rodada
   seguinte. Ao adotar o estado do servidor, S.squads é substituído inteiro e o jovem ainda-não-
   aplicado SOME do elenco local: contando só o elenco, a vaga da janela "voltava" a cada rodada
   e dava pra subir um jovem por rodada — todos aplicados de uma vez quando o buffer enfim subia.
   Dedupe por pid porque, na rodada em que o servidor aplica, o mesmo jovem está nos dois lugares
   (elenco adotado + buffer, que só é limpo no pruneAppliedNetTransfers seguinte). */
function youthCountThisWindow(){ const w=currentWindowIndex();
  const daJanela=p=>!!p && p._youthSeason===S.season && p._youthWindow===w;
  const noElenco=(squad(S.clubId)||[]).filter(daJanela);
  const jaContados=new Set(noElenco.map(p=>p.pid));
  const pendentes=(S._netTransfers||[]).filter(t=>t && t.from==='BASE' && t.to===S.clubId
    && daJanela(t.player) && !jaContados.has(t.player.pid));
  return noElenco.length+pendentes.length; }
function youthWindowOpen(){ return currentWindowIndex()>=0; }
function youthAvailable(){
  if(!S || !S.clubId) return false;
  return youthWindowOpen() && youthCountThisWindow()<1 && (squad(S.clubId)||[]).length<40;
}
function youthUnavailableMsg(){
  const cheio=(squad(S.clubId)||[]).length>=40;
  const limite=youthWindowOpen() && youthCountThisWindow()>=1;
  return cheio?'Elenco cheio (40 jogadores).'
    : limite?('Você já subiu um jogador da base nesta janela. Espere a próxima janela de transferências.')
    : 'A base só sobe jogador com a janela de transferências aberta.';
}
/* sorteia um NOVO lote de 3 candidatos e guarda em S._youthCandidates/_youthCandidatesRound —
   como as 3 opções já aparecem juntas no modal, não existe "escolher outro" (seria redundante);
   em vez disso o lote fica FIXO até a rodada avançar de verdade (jogar a rodada), pra não virar
   um reroll de graça só reabrindo o menu. Guardado em S (não em CL) pra sobreviver a um reload
   e ficar coerente entre solo/Resenha. */
function rollYouthCandidatesForRound(){
  const usedPos=[], cands=[];
  for(let i=0;i<3;i++){ const c=generateYouthCandidate(usedPos); if(!c) break; usedPos.push(c.youth.s); cands.push(c); }
  S._youthCandidates=cands; S._youthCandidatesRound=S.round;
  return cands;
}
/* gera UM candidato completo (nome/atributos/comportamento/idade/força/contrato-prévia) SEM
   adicionar ao elenco nem consumir a vaga da janela — puramente pra preview no modal de
   promoção (ver rollYouthCandidatesForRound acima). O comportamento (Brigão, Calmo...) já sai
   definitivo aqui via attachAttrs->assignBehavior; confirmYouthPromotion() reaproveita este
   MESMO objeto (não regenera nada), então o que o usuário vê no card é exatamente o que o
   jogador promovido vai ter — sem risco de divergência entre preview e resultado real. */
function generateYouthCandidate(usedPositionsThisBatch){
  if(!youthAvailable()) return null;
  const div=S.division, sq=squad(S.clubId);
  const cnt={GK:0,DEF:0,MID:0,ATT:0}; sq.forEach(p=>{ if(cnt[p.s]!=null) cnt[p.s]++; });
  // penaliza (sem proibir) repetir a mesma posição dentro do MESMO lote de 3 candidatos — as 3
  // opções do modal de promoção ficam mais úteis/variadas em vez de sempre a mesma posição.
  (usedPositionsThisBatch||[]).forEach(p=>{ if(cnt[p]!=null) cnt[p]+=2; });
  // reforça a posição de LINHA mais carente. Goleiro fica de fora: já há 3 garantidos e só 1 joga,
  // então um 4º GK seria desperdício — só entra se por algum motivo faltar goleiro.
  const pos = cnt.GK<3 ? 'GK' : ['DEF','MID','ATT'].sort((a,b)=>cnt[a]-cnt[b])[0];
  const idx=(S._youthCounter=(S._youthCounter||0)+1);
  const raw=makeRawPlayer(div, pos, 'youth_'+S.clubId+'_'+S.season, idx); // força na faixa da divisão (≈ nível do time)
  const R=makeRng(hashSeed(S.seed,S.season,'youthage',idx,S.clubId));
  raw.age=16+Math.floor(R.random()*4); raw.ag='Base'; raw.moral=75; raw.mv=REBAL.value(raw.f, raw.age);
  const youth=attachAttrs(initStats(raw), div);   // ganha pid + atributos + comportamento
  // jovem recém-promovido é muito inexperiente pra cobrar salário de mercado — 40% do valor
  // que defaultContract() daria pra um jogador comum com essa força (piso de 1000, igual defaultContract).
  const contract=defaultContract(youth);
  contract.salary=Math.max(1000, Math.round(contract.salary*0.4));
  const posNome={GK:'Goleiro',DEF:'Defensor',MID:'Meia',ATT:'Atacante'}[pos]||pos;
  return {youth, posNome, contract};
}
/* efetiva a promoção do candidato ESCOLHIDO (ver generateYouthCandidate) — só aqui o jogador
   entra de fato no elenco e consome a vaga da janela. Os outros candidatos do lote são
   simplesmente descartados (nunca foram registrados em lugar nenhum). */
function confirmYouthPromotion(candidate){
  const {youth, posNome, contract}=candidate;
  const sq=squad(S.clubId);
  youth.contract=contract;
  youth._youthSeason=S.season; youth._youthWindow=currentWindowIndex(); // temporada+janela (base do teto de 1/janela)
  sq.push(youth);
  if(typeof CL!=='undefined' && CL.online){ // manda o jogador NOVO pro servidor adicionar (from BASE)
    S._netTransfers=S._netTransfers||[]; S._netTransfers.push({ from:'BASE', to:S.clubId, p:youth.n, pid:youth.pid, player:youth, fee:0 });
  }
  S.roundNews=S.roundNews||[]; S.roundNews.push(`🌱 ${youth.n} (${posNome}, ${youth.age} anos, força ${youth.f}) subiu das categorias de base.`);
  S._youthCandidates=null; S._youthCandidatesRound=null; // vaga da janela consumida -> lote atual não faz mais sentido
  /* LOCAL ANTES DA NUVEM. `saveV3()` sozinho não escreve o localStorage — ele sai
     cedo sem ligação — e em solo o garoto promovido desaparecia no recarregamento
     seguinte. Todo o resto do motor grava com `save()`; esta linha era a exceção. */
  save(); saveV3();
}
/* ===== CAIXA: toda mudança fora do fechamento de rodada TEM que ser publicada =====
   S.budget é só a cópia local. A autoridade do caixa de um humano é game_seats.budget: o
   resolve-round lê essa coluna e a escreve no mundo (S.budgets[clube]), e ao adotar a rodada o
   cliente faz S.budget = S.budgets[meuClube] (applyViewerDivision).
   Consequência: um débito/crédito que não passe por aqui é SILENCIOSAMENTE REVERTIDO na rodada
   seguinte — o assento ainda tem o valor pré-transação, e é ele que vence. Foi exatamente esse o
   bug do "comprei o jogador, ele ficou, mas o dinheiro voltou pro meu caixa": o jogador viajava
   por _netTransfers e persistia, o dinheiro não viajava por lugar nenhum.
   Publica SEMPRE, sem tentar economizar escrita comparando com o último valor enviado: o caixa
   pode voltar a um número já publicado depois de uma adoção do servidor, e aí um cache diria
   "não mudou" enquanto o assento está defasado. É um upsert de uma coluna — correção vale mais. */
function commitBudget(){
  if(!S) return;
  const id=(typeof CL!=='undefined' && CL.clubId) || S.clubId;
  if(S.budgets && id) S.budgets[id]=S.budget;
  if(typeof CL==='undefined' || !CL.online) return;
  if(typeof NET!=='undefined' && NET.publishBudget) NET.publishBudget(S.budget);
}
/* mesma ideia do commitBudget acima, mas pro estádio do usuário (S.clubStadiumCap[id]) — sem
   isso, uma bancada construída na Resenha some na rodada seguinte (Object.assign(S, saved.S)
   substitui o mapa inteiro pelo estado do servidor, que nunca soube da obra). */
function commitStadium(){
  if(!S) return;
  const id=(typeof CL!=='undefined' && CL.clubId) || S.clubId;
  if(typeof CL==='undefined' || !CL.online) return;
  if(S.clubStadiumCap && id && typeof NET!=='undefined' && NET.publishStadium) NET.publishStadium(S.clubStadiumCap[id]);
}
/* descarta do buffer as transferências que o servidor JÁ aplicou (jogador está no destino no
   estado autoritativo). Chamado depois de adotar a rodada — o que sobrar é reenviado. */
/* garante contrato em TODO jogador de TODO clube do mundo atual. attachAttrs já faz isso na
   criação, mas salas/saves criados ANTES disso têm elencos sem contract nenhum — na Resenha,
   só o clube do anfitrião ganhava contrato em newGame, então o time de qualquer outro humano
   aparecia com "0k/sem" em todos os jogadores e a folha salarial dele nunca era descontada.
   defaultContract é função pura de força/idade, então o preenchimento é determinístico: todo
   cliente chega ao MESMO salário pro mesmo jogador, mesmo sendo uma correção local aplicada
   depois de adotar o estado do servidor (que não carrega contrato de clube de CPU). */
function ensureSquadContracts(){
  if(!S || !S.squads) return;
  for(const id in S.squads){ const sq=S.squads[id]; if(!Array.isArray(sq)) continue;
    sq.forEach(p=>{ if(p && !p.contract) p.contract=defaultContract(p); }); }
}
/* descarta do buffer as propostas que o servidor JÁ aplicou (já estão na fila do vendedor no
   estado autoritativo) ou que expiraram. Espelha pruneAppliedNetTransfers; chamado nos mesmos
   pontos, depois de adotar a rodada. */
function pruneAppliedNetOffers(){
  if(!S || !S._netOffers || !S._netOffers.length) return;
  S._netOffers=S._netOffers.filter(o=>{
    if(!o || o.expiresRound<=S.round) return false;                       // expirou -> não reenvia
    const fila=(S.incomingOffersByClub && S.incomingOffersByClub[o.to])||[];
    return !fila.some(x=>x && x.id===o.id);                               // já aplicada -> solta
  });
}
/* ===== O QUE EU JA NEGOCIEI VALE POR CIMA DO ESTADO ADOTADO =====
   Entre o aceite e a proxima resolucao do servidor existe uma rodada inteira em que o estado
   adotado ainda TEM o jogador vendido: ele reaparecia no elenco (dava ate para escala-lo) e so
   sumia quando o buffer viajava na publicacao seguinte. Depois de cada adopt, o buffer pendente
   e reaplicado ao estado local: venda para fora do mundo (ou destino inexistente) remove o
   jogador de novo; compra/venda entre clubes do mundo move de novo. Idempotente — usa o mesmo
   match do prune — e nunca toca no que o servidor ja aplicou (o prune roda antes e ja soltou). */
function reaplicarMinhasTransferencias(){
  if(typeof CL==='undefined' || !CL.online || !S) return;
  if(!S._netTransfers || !S._netTransfers.length) return;
  const match=(x,t)=> (t.pid!=null && x.pid===t.pid) || x.n===t.p;
  S._netTransfers.forEach(t=>{
    if(!t || t.from==='BASE') return;   // o jovem da base e ADICAO, o servidor cuida
    const src=(S.squads && S.squads[t.from])||null; if(!src) return;
    const i=src.findIndex(x=>match(x,t)); if(i<0) return;   // ja fora da origem: nada a refazer
    const dst=(t.to && S.squads && S.squads[t.to])||null;
    const p=src.splice(i,1)[0];
    if(dst && !dst.some(x=>match(x,t))){ if(t.contract) p.contract=t.contract; else delete p.contract; dst.push(p); }
    // destino fora do mundo (to:null ou liga nao materializada): removido e pronto
  });
}
function pruneAppliedNetTransfers(){
  if(!S) return;
  // moral da coletiva: o servidor aplica UMA vez, na rodada em que ela chega. Como já
  // adotamos essa rodada, zera o pendente — senão somaria de novo a cada rodada seguinte.
  if(S._netMorale) S._netMorale=0;
  if(!S._netTransfers || !S._netTransfers.length) return;
  // casa por pid (identidade) OU nome. NÃO pode ser "pid quando existe, SENÃO nome": se o pid
  // divergir entre cliente e servidor (re-materialização de elenco, pid nulo/colidido), o match
  // exclusivo por pid falhava pra sempre — a venda nunca era considerada aplicada, ficava presa no
  // buffer e o jogador voltava rodada após rodada (dava pra vender o mesmo jogador várias vezes).
  const match=(x,t)=> (t.pid!=null && x.pid===t.pid) || x.n===t.p;
  S._netTransfers = S._netTransfers.filter(t=>{
    // destino nulo (saída do mundo por multa rescisória): aplicada quando o jogador não está
    // MAIS na origem. Sem este ramo a saída ficava presa no buffer e era reenviada pra sempre.
    if(!t.to){ const src=(S.squads && S.squads[t.from]) || []; return src.some(x=>match(x,t)); }
    const dst=(S.squads && S.squads[t.to]) || [];
    return !dst.some(x=>match(x,t));
  });
}
function finalizeTransfer(negoIdx){
  const preOpen=inPreWindow();
  if(!inTransferWindow() && !preOpen) return {ok:false,msg:'A janela de transferências está fechada.'};
  const n=S.negos[negoIdx]; if(!n || n.stage!=='verdict' || n.status!=='aberta') return {ok:false,msg:'Negociação inválida.'};
  const p=findP(n.player,n.sellerId); if(!p) return {ok:false,msg:'Jogador não encontrado.'};
  const fq=checkForeignQuota(p); if(!fq.ok) return {ok:false,msg:fq.msg}; // cota de estrangeiros da liga
  /* O SALARIO PEDIDO PELO EMPRESARIO NAO ERA VERIFICADO EM LADO NENHUM.
     Quando o interesse passa de 45, agentRespond() poe n.agentCounter E manda a
     negociacao direto para 'verdict' (ver acima). O ecra do veredito mostrava
     "Salario combinado: n.salary" — o valor ANTIGO, mais baixo — e daqui saia
     o contrato com esse valor. Ou seja: o empresario pedia mais, e a
     transferencia fechava por menos, sem ninguem recusar nada.
     A tela ja foi corrigida para trazer o pedido no campo; esta e a trava do
     motor, para o caso valer por qualquer caminho e nao so por aquele ecra. */
  if(n.agentCounter && !cobre(n.salary,n.agentCounter)){
    return {ok:false, msg:'O empresário pede '+fmt(n.agentCounter)+'/sem — a sua oferta está abaixo disso.'};
  }
  const totalCost=n.offerFee;
  if(totalCost>S.budget) return {ok:false,msg:'Caixa insuficiente pra fechar a taxa combinada.'};
  S.budget-=totalCost; commitBudget();                 // publica: senão o débito é revertido e o jogador sai de graça
  const contract={ salary:n.salary, role:n.role, gotMatchesBonus:false, benchStreak:0,
    releaseClause: n.clauses.europa? n.clauses.europaValue : null };
  n.status='fechada'; n.stage='done';
  S.roundNews=S.roundNews||[];
  if(inTransferWindow()){
    // janela aberta: o jogador troca de clube AGORA
    S.squads[n.sellerId]=S.squads[n.sellerId].filter(x=>x.n!==p.n);
    p.contract=contract; p.moral=75; applyTradeLock(p); recordTransferHistory(p, n.sellerId, S.clubId, totalCost);
    MARKET.revalueOnTransfer(p, MARKET.divisionToLeague(S.division)); // gatilho de vitrine
    S.squads[S.clubId]=S.squads[S.clubId]||[]; S.squads[S.clubId].push(p);
    recordNetTransfer(n.sellerId, S.clubId, p.n, contract, totalCost, p.pid); // online: avisa o servidor (senão a contratação é desfeita)
    S.roundNews.push(`✍️ ${p.n} contratado do ${clubOf(n.sellerId).short} por ${fmt(totalCost)}.`);
    pushFinanceEntry({playerPurchases:totalCost, log:[`✍️ ${p.n} contratado do ${clubOf(n.sellerId).short} por ${fmt(totalCost)}.`]});
    save();
    return {ok:true,msg:`${p.n} agora joga pelo ${clubOf(S.clubId).short}!`};
  }
  // PRÉ-ACORDO (pré-janela): fecha o negócio agora, mas o jogador só chega na abertura da janela.
  // RESENHA: o pre-acordo nao sobrevive ao adopt (ver acceptIncomingOffer) — o jogador chega AGORA.
  if(typeof CL!=='undefined' && CL.online){
    S.squads[n.sellerId]=S.squads[n.sellerId].filter(x=>x.n!==p.n);
    p.contract=contract; p.moral=75; applyTradeLock(p); recordTransferHistory(p, n.sellerId, S.clubId, totalCost);
    MARKET.revalueOnTransfer(p, MARKET.divisionToLeague(S.division));
    S.squads[S.clubId]=S.squads[S.clubId]||[]; S.squads[S.clubId].push(p);
    recordNetTransfer(n.sellerId, S.clubId, p.n, contract, totalCost, p.pid);
    S.roundNews.push(`✍️ ${p.n} contratado do ${clubOf(n.sellerId).short} por ${fmt(totalCost)}.`);
    pushFinanceEntry({playerPurchases:totalCost, log:[`✍️ ${p.n} contratado do ${clubOf(n.sellerId).short} por ${fmt(totalCost)}.`]});
    save();
    return {ok:true,msg:`${p.n} agora joga pelo ${clubOf(S.clubId).short}!`};
  }
  S.pendingTransfers=S.pendingTransfers||[];
  S.pendingTransfers.push({ kind:'buy', sellerId:n.sellerId, buyerId:S.clubId, playerName:p.n,
    contract, fee:totalCost, executeRound:preOpen });
  S.roundNews.push(`🤝 Acordo fechado: ${p.n} chega do ${clubOf(n.sellerId).short} na abertura da janela (rodada ${preOpen+1}). Pago ${fmt(totalCost)}.`);
  pushFinanceEntry({playerPurchases:totalCost, log:[`🤝 ${p.n} pré-contratado do ${clubOf(n.sellerId).short} por ${fmt(totalCost)}.`]});
  save();
  return {ok:true,msg:`Acordo fechado! ${p.n} chega na abertura da janela (rodada ${preOpen+1}).`};
}
/* ---- transferências entre CPUs, 100% em segundo plano — dão vida ao mercado
   mesmo se o usuário nunca comprar/vender nada (essencial no modo solo). ---- */
/* clube "intocável" pelo mercado CPU (não pode ser comprado/vendido/leiloado pela máquina):
   o clube do próprio usuário SEMPRE; e no ONLINE (Resenha), o clube de TODO humano da sala — cada
   um gerencia o seu, a CPU não mexe. Sem isso, o anfitrião (único que simula) trataria os clubes
   dos convidados como CPU e negociaria os jogadores deles. */
function isCpuMarketProtected(cid){
  if(cid===S.clubId) return true;
  if(typeof CL!=='undefined' && CL.online && CL.humans && CL.humans[cid]) return true;
  return false;
}
function cpuBackgroundTransfers(R){
  if(!inTransferWindow()) return; // CPUs também só negociam dentro da janela — mercado realista
  R=R||makeRng(hashSeed(S.seed,S.round,'cpumkt'));
  const cpuClubs=DATA.clubs.filter(c=>!isCpuMarketProtected(c.id));
  if(cpuClubs.length<2) return;
  // A REGRA MORA EM world-rules.js (folha única cliente⇄servidor). Antes ela só existia aqui, e
  // como o cliente não comita mais rodada na Resenha, o mercado da CPU não acontecia no
  // multiplayer. Daqui só saem os DADOS do jogo: quem pode negociar, quem pode sair do elenco e
  // quanto vale o jogador. O dinheiro agora sai de um caixa e entra no outro (ver WORLD_RULES.cpuMarket).
  const feitas=WORLD_RULES.cpuMarket(S, R, {
    clubes: cpuClubs.map(c=>({id:c.id, short:c.short})),
    podeSair: (clubId,p)=>canReleaseFromSquad(clubId,p).ok,
    valor: p=>liveMV(p),
    n: 2+Math.floor(R.rnd(0,3))                 // 2-4 por rodada — a liga do usuário é o mercado mais ativo
  });
  if(!feitas.length) return;
  S.roundNews=S.roundNews||[];
  feitas.forEach(t=>{
    const de=(clubOf(t.from)||{}).short||t.from, para=(clubOf(t.to)||{}).short||t.to;
    S.roundNews.push(`🔄 ${t.player} foi negociado do ${de} pro ${para} por ${fmt(t.fee)}.`);
  });
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
      const pool=sorted.slice(Math.ceil(sorted.length*0.5)).filter(x=>canReleaseFromSquad(sellerId,x).ok); // metade mais fraca, respeitando o piso de elenco
      if(!pool.length) continue;
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
      const fee=Math.round(liveMV(p)*(0.6+R.random()*0.6));
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
/* Propostas são escopadas por clube (S.incomingOffersByClub[clubId]) — S é um blob único
   compartilhado com TODOS os treinadores da sala (ver netSaveGame/onlineAdoptServerRound), então
   um array plano aqui vazava a proposta recebida por um clube pra tela de "Propostas recebidas"
   de todo mundo. myIncomingOffers() é a fatia da PRÓPRIA perspectiva (S.clubId). */
/* FONTE ÚNICA: o elenco. Uma proposta só vale enquanto o jogador ESTÁ no clube — sem esta
   checagem continuavam chegando propostas por jogador já vendido (a lista guarda o nome e só
   era limpa por validade, então o vendido seguia rendendo proposta por até 3 rodadas, aparecia
   no menu, no e-mail, e só dava erro na hora de aceitar). Filtra na LEITURA, não só no prune de
   rodada, pra sumir na hora em que a venda acontece — inclusive na Resenha, onde a lista vem
   pronta do servidor e a rodada pode demorar a virar. */
function offersForClub(clubId){
  const list=(S.incomingOffersByClub&&S.incomingOffersByClub[clubId])||[];
  const sq=(S.squads&&S.squads[clubId])||[];
  if(!list.length) return list;
  return list.filter(o=>o && sq.some(p=>p && p.n===o.playerName));
}
function myIncomingOffers(){ return offersForClub(S.clubId); }
function pruneIncomingOffers(){
  S.incomingOffersByClub=S.incomingOffersByClub||{};
  Object.keys(S.incomingOffersByClub).forEach(cid=>{
    const sq=(S.squads&&S.squads[cid])||[];
    S.incomingOffersByClub[cid]=(S.incomingOffersByClub[cid]||[])
      .filter(o=>o && o.expiresRound>S.round && sq.some(p=>p && p.n===o.playerName)); // validade + jogador ainda no elenco
  });
}
/* ---- QUEM PODE COMPRAR ESTE JOGADOR (regra única, espelhada no resolve-round) ----
   A regra antiga era só `overall do clube >= força do jogador - 12`. Como o overall do clube e a
   força do jogador estão na MESMA escala nova (ambos já remapeados por divisão — ver REBAL.force
   e recomputeClubOverall), essa comparação só barrava clube MAIS FRACO que o jogador: um clube da
   Série A (overall ~45) passava no teste pra qualquer jogador de Série D (força ~10). Na Resenha,
   onde o sorteio do comprador varre S.squads (os 80 clubes das 4 divisões), o resultado prático era
   o usuário da Série D receber proposta do Flamengo pelo lateral reserva quase toda janela.
   Agora o teto também existe: um clube só sonda quem se aproxima do nível do PRÓPRIO elenco. Fica
   uma faixa de ~1 divisão pra cada lado, que é o passo realista — e o craque da Série D (força bem
   acima da média da divisão) continua sendo cobiçado por clube grande, que é o caso que a mecânica
   quer preservar. */
const SIGN_BELOW=10;  // clube não compra quem está muito ABAIXO do nível do elenco dele
const SIGN_ABOVE=12;  // clube não compra quem está muito ACIMA (não teria como pagar/atrair)
function clubWouldSign(clubOverall, playerF){
  const ov=(typeof clubOverall==='number'&&isFinite(clubOverall))?clubOverall:70;
  const f=(typeof playerF==='number'&&isFinite(playerF))?playerF:40;
  return f>=ov-SIGN_BELOW && ov>=f-SIGN_ABOVE;
}
function generateIncomingOffers(R){
  pruneIncomingOffers(); pruneCounterOffers();
  if(!canNegotiate()) return; // proposta só chega com a janela aberta (pré-janela desligada)
  R=R||makeRng(hashSeed(S.seed,S.round,'incoming'));
  S.incomingOffersByClub=S.incomingOffersByClub||{};
  S._offerToastsByClub=S._offerToastsByClub||{};
  // No Modo Resenha, esta função roda no aparelho do anfitrião (fallback local — ver
  // _commitLeagueRound); CL.humans lista TODOS os clubes humanos da sala, não só o do anfitrião.
  const targetClubIds=(typeof CL!=='undefined' && CL.online && CL.humans) ? Object.keys(CL.humans) : [S.clubId];
  targetClubIds.forEach(myClubId=>{
    const myOffers=S.incomingOffersByClub[myClubId]=S.incomingOffersByClub[myClubId]||[];
    /* MAIS PROPOSTAS A CHEGAR. Com teto de 4 e meia rodada de hipotese, uma
       janela inteira dava duas ou tres ofertas -- vender um jogador dependia de
       sorte. Teto de 6 e dois tercos das rodadas: continua a nao ser todas as
       rodadas, e o teto continua a existir para a caixa de entrada nao virar
       lista de spam. */
    if(myOffers.length>=6) return;   // no máximo 6 propostas pendentes
    if(R.random()>0.66) return;                      // nem toda rodada de janela gera proposta
    const mySquad=S.squads[myClubId]||[]; if(mySquad.length<=16) return;
    const pending=new Set(myOffers.map(o=>o.playerName));
    // clubes miram preferencialmente os melhores do elenco (que ainda não têm proposta).
    // canReleaseFromSquad: não adianta oferecer pelo 2º goleiro de um elenco com 2 — a venda
    // seria recusada na hora de aceitar (piso de elenco), então a proposta nem nasce.
    const targets=mySquad.filter(p=>!pending.has(p.n)&&!p._pendingSale&&canReleaseFromSquad(myClubId,p).ok)
      .sort((a,b)=>b.f-a.f).slice(0, Math.max(3,Math.ceil(mySquad.length*0.4)));
    if(!targets.length) return;
    const p=targets[Math.floor(R.random()*targets.length)];
    // candidatos a comprador: liga do usuário + ligas de background (entre países)
    const cand=[];
    DATA.clubs.filter(c=>c.id!==myClubId).forEach(c=>cand.push({id:c.id,name:c.short,country:null,overall:c.overall||70}));
    Object.keys(S.bgLeagues||{}).forEach(country=>Object.keys(S.bgLeagues[country].divs).forEach(d=>
      (S.bgLeagues[country].divs[d].clubIds||[]).forEach(id=>{ const c=intlClubById(id); if(c) cand.push({id,name:c.short,country,overall:c.overall||70}); })));
    if(!cand.length) return;
    const eligible=cand.filter(c=>clubWouldSign(c.overall, p.f));
    if(!eligible.length) return;
    const buyer=eligible[Math.floor(R.random()*eligible.length)];
    const fee=Math.round(liveMV(p)*(1.0+R.random()*0.7)); // 1.0-1.7x do valor QUE A TELA MOSTRA
    // teto do comprador pra regatear: acima da 1ª oferta, maior se o jogador está em fase
    // (mais valorizado) — é até onde ele topa subir numa contraproposta sua.
    const maxFee=Math.round(fee*(1.15 + (isHot(p)?0.2:0) + R.random()*0.15));
    myOffers.push({ id:(hashSeed(S.seed,S.round,p.n,buyer.id,myClubId)>>>0), buyerId:buyer.id, buyerName:buyer.name,
      buyerCountry:buyer.country, playerName:p.n, playerForce:p.f, fee, maxFee, negRound:0, lastMsg:null, expiresRound:S.round+3 });
    if(myClubId===S.clubId){
      S.roundNews=S.roundNews||[];
      S.roundNews.push(`📩 ${buyer.name}${buyer.country?' ('+buyer.country+')':''} ofereceu ${fmt(fee)} por ${p.n}. Veja em Jogador → Propostas recebidas.`);
    }
    // fila de toasts de proposta (mostrados ao voltar pra tela principal — ver liveDone), também
    // escopada por clube: senão o anfitrião via toast de proposta de OUTRO treinador.
    /* O AVISO VIAJA COM O ID DA PROPOSTA. A fila so e esvaziada ao voltar de uma partida
       (liveDone); se o jogador passa varias jornadas sem entrar em campo, ela acumula — e
       depois dispara tudo de uma vez, inclusive avisos de propostas que ja EXPIRARAM
       (expiresRound = rodada+3) e que ele nao encontra em Propostas. Guardando o id, quem
       mostra confere se a proposta ainda existe antes de avisar. */
    S._offerToastsByClub[myClubId]=S._offerToastsByClub[myClubId]||[];
    const _oid=myOffers[myOffers.length-1].id;
    S._offerToastsByClub[myClubId].push({ id:_oid, round:S.round,
      msg:`💰 ${buyer.name} fez uma oferta por ${p.n}` });
    if(S._offerToastsByClub[myClubId].length>6) S._offerToastsByClub[myClubId].splice(0, S._offerToastsByClub[myClubId].length-6);
  });
}
function acceptIncomingOffer(id){
  const o=myIncomingOffers().find(x=>x.id===id); if(!o) return {ok:false,msg:'Proposta não existe mais.'};
  const p=(S.squads[S.clubId]||[]).find(x=>x.n===o.playerName); if(!p) return {ok:false,msg:'Jogador não está mais no elenco.'};
  if((S.squads[S.clubId]||[]).length<=15) return {ok:false,msg:'Elenco pequeno demais pra vender.'};
  const floor=canReleaseFromSquad(S.clubId,p); if(!floor.ok) return {ok:false,msg:floor.msg};
  if(isTradeLocked(p)) return {ok:false,msg:`${p.n} foi comprado nesta temporada e ainda não pode ser negociado de novo.`};
  const preOpen=inPreWindow();
  dropIncomingOffer(S.clubId, id);                       // baixa que também viaja pro servidor
  S.roundNews=S.roundNews||[];
  /* ===== NA RESENHA O ACORDO VALE NA HORA =====
     O pre-acordo mora em S.pendingTransfers, que NAO viaja para o servidor nem esta em
     CAREER_KEYS: na Resenha o proximo adopt apagava o acordo — dinheiro que nunca vinha,
     jogador que nunca saia (e o executor, executePendingTransfers, so roda no playRound do
     solo). Relatado a 20/08: "aceitei a proposta do time ingles, recebi o dinheiro e o
     jogador ficou". Online nao ha pre-acordo: aceita, recebe e o jogador sai agora — para
     QUALQUER destino, inclusive liga de fundo nao materializada (saida do mundo, to:null). */
  if(!inTransferWindow() && preOpen && !(typeof CL!=='undefined' && CL.online)){
    // PRÉ-ACORDO: aceita agora, mas o jogador só sai na abertura da janela (segue jogando até lá)
    p._pendingSale=true;
    S.pendingTransfers=S.pendingTransfers||[];
    S.pendingTransfers.push({ kind:'sell', sellerId:S.clubId, playerName:o.playerName, buyerId:o.buyerId, buyerName:o.buyerName,
      buyerCountry:o.buyerCountry, fee:o.fee, executeRound:preOpen });
    S.roundNews.push(`🤝 Acordo fechado: ${o.playerName} vai pro ${o.buyerName} na abertura da janela (rodada ${preOpen+1}) por ${fmt(o.fee)}.`);
    save();
    return {ok:true, msg:`Acordo fechado! ${o.playerName} sai na abertura da janela.`};
  }
  // janela aberta: sai agora
  S.squads[S.clubId]=S.squads[S.clubId].filter(x=>x.n!==o.playerName);
  S.budget+=o.fee; commitBudget();                     // publica: senão o crédito é revertido na próxima rodada
  if(o.buyerCountry) ensureBgClubMaterialized(o.buyerId);
  recordTransferHistory(p, S.clubId, o.buyerCountry?null:o.buyerId, o.fee);
  if(S.squads[o.buyerId]){
    if(o.buyerIsHuman){ p.contract={ salary:REBAL.wage(p.f), role:'Rotação', gotMatchesBonus:false, benchStreak:0, releaseClause:null }; applyTradeLock(p); }
    else delete p.contract;
    S.squads[o.buyerId].push(p);
  } // vai pro clube comprador
  // comprador estrangeiro não existe no mundo do servidor -> saída do mundo (to:null), senão o
  // jogador era rejeitado e voltava pro vendedor (revenda infinita). Ver acceptIncomingOffer/#1.
  recordNetTransfer(S.clubId, o.buyerCountry?null:o.buyerId, o.playerName, null, o.fee, p&&p.pid); // online: avisa o servidor (venda)
  S.roundNews.push(`💰 ${o.playerName} vendido ao ${o.buyerName} por ${fmt(o.fee)}.`);
  pushFinanceEntry({playerSales:o.fee, log:[`💰 ${o.playerName} vendido ao ${o.buyerName} por ${fmt(o.fee)}.`]});
  save();
  return {ok:true, msg:`${o.playerName} vendido por ${fmt(o.fee)}!`};
}
/* dá BAIXA numa proposta da fila de um clube. Em Resenha isto TEM que viajar: aceitar, recusar
   ou contrapropor só apagava a proposta no S local, e o estado autoritativo (do servidor) seguia
   com ela — no adopt seguinte a proposta voltava. Era isso que fazia o aceite da contraproposta
   esbarrar em "você já tem uma proposta pendente por esse jogador": a original, já recusada,
   continuava viva no servidor. Buffer reenviado até o servidor aplicar (ver applyHumanOfferDrops). */
function dropIncomingOffer(clubId, id){
  S.incomingOffersByClub=S.incomingOffersByClub||{};
  S.incomingOffersByClub[clubId]=((S.incomingOffersByClub[clubId])||[]).filter(x=>x && x.id!==id);
  if(typeof CL!=='undefined' && CL.online){
    S._netOfferDrops=S._netOfferDrops||[];
    if(!S._netOfferDrops.some(d=>d && d.id===id)) S._netOfferDrops.push({club:clubId, id, expiresRound:S.round+8});
  }
  if(S._netOffers) S._netOffers=S._netOffers.filter(o=>o && o.id!==id); // nem adianta reenviar o que foi dado baixa
}
function pruneAppliedNetOfferDrops(){
  if(!S || !S._netOfferDrops || !S._netOfferDrops.length) return;
  S._netOfferDrops=S._netOfferDrops.filter(d=>{
    if(!d || d.expiresRound<=S.round) return false;                       // teto de segurança
    const fila=(S.incomingOffersByClub && S.incomingOffersByClub[d.club])||[];
    return fila.some(x=>x && x.id===d.id);                                // ainda lá -> reenvia
  });
}
function rejectIncomingOffer(id){ dropIncomingOffer(S.clubId, id); save(); return {ok:true}; }
/* ================= NEGOCIAÇÃO ENTRE HUMANOS =================
   Antes, transferência humano<->humano era instantânea e algorítmica (sem chance de recusa pro
   vendedor). Agora: EU (comprador) mando uma proposta que entra na MESMA fila de "propostas
   recebidas" do vendedor (S.incomingOffersByClub — já escopada por clube, ver #1.1), só marcada
   buyerIsHuman:true. syncInbox() já lê myIncomingOffers() genericamente, então a proposta aparece
   sozinha no e-mail do vendedor. Ele decide: aceitar (acceptIncomingOffer já trata buyerIsHuman
   dando contrato e travando o jogador — ver ali), recusar, ou negociar (counterHumanOffer). */
function sendHumanOffer(targetSellerId, playerName, fee){
  if(!CL.online || !CL.humans || !CL.humans[targetSellerId]) return {ok:false,msg:'Esse clube não é de um treinador humano.'};
  if(String(targetSellerId)===String(S.clubId)) return {ok:false,msg:'Você não pode propor pelo seu próprio jogador.'};
  if(!canNegotiate()) return {ok:false,msg:'A janela de transferências está fechada.'};
  const p=findP(playerName,targetSellerId); if(!p) return {ok:false,msg:'Jogador não encontrado.'};
  if(isTradeLocked(p)) return {ok:false,msg:`${p.n} foi negociado recentemente e ainda não pode ser negociado de novo.`};
  fee=Math.round(fee||0); if(fee<=0) return {ok:false,msg:'Informe um valor de proposta.'};
  if(fee>S.budget) return {ok:false,msg:'Caixa insuficiente pra essa proposta.'};
  S.incomingOffersByClub=S.incomingOffersByClub||{};
  const sellerOffers=S.incomingOffersByClub[targetSellerId]=S.incomingOffersByClub[targetSellerId]||[];
  if(sellerOffers.some(o=>o.playerName===p.n && String(o.buyerId)===String(S.clubId))) return {ok:false,msg:'Você já tem uma proposta pendente por esse jogador.'};
  const myHumanName=(CL.humans&&CL.humans[S.clubId])||'Um treinador';
  const id=(hashSeed(S.seed,S.round,p.n,S.clubId,targetSellerId,nowMs())>>>0);
  sellerOffers.push({ id, buyerId:S.clubId, buyerName:(clubOf(S.clubId)||{}).short||S.clubId, buyerHumanName:myHumanName,
    buyerIsHuman:true, playerName:p.n, playerForce:p.f, fee, negRound:0, lastMsg:null, expiresRound:S.round+6 });
  S.outgoingOffersByClub=S.outgoingOffersByClub||{};
  (S.outgoingOffersByClub[S.clubId]=S.outgoingOffersByClub[S.clubId]||[]).push({ id, sellerId:targetSellerId, playerName:p.n, fee, expiresRound:S.round+6 });
  // ONLINE: a linha acima é só a cópia LOCAL — o vendedor está em outro aparelho e S vem do
  // servidor a cada rodada, então uma proposta escrita só aqui era apagada no adopt seguinte e
  // NUNCA chegava a ele. Vai pelo mesmo canal por-assento das transferências (last_result.offers,
  // ver netPublishResult/applyHumanOffers), com buffer reenviado até o servidor aplicar.
  if(typeof CL!=='undefined' && CL.online){
    S._netOffers=S._netOffers||[];
    S._netOffers.push(Object.assign({ to:targetSellerId }, sellerOffers[sellerOffers.length-1]));
  }
  save();
  return {ok:true, msg:`Proposta de ${fmt(fee)} enviada por ${p.n}. O outro treinador vai ver no e-mail dele.`};
}
/* recusa uma proposta humana sinalizando um valor que você aceitaria — não é uma contraproposta
   "de verdade" (não volta sozinha pro comprador decidir, como as da CPU): o comprador precisa
   mandar uma NOVA proposta (sendHumanOffer) nesse valor se topar. Simples e honesto: dois humanos
   numa Resenha já têm chat/voz pra combinar o valor; isto só formaliza a recusa + o número. */
function counterHumanOffer(id, askFee){
  const o=myIncomingOffers().find(x=>x.id===id); if(!o) return {ok:false,msg:'Proposta não existe mais.'};
  if(!o.buyerIsHuman) return {ok:false,msg:'Essa proposta não é de um treinador humano.'};
  askFee=Math.round(askFee)||0; if(askFee<=0) return {ok:false,msg:'Informe um valor válido.'};
  dropIncomingOffer(S.clubId, id);                       // recusada NAQUELE valor (baixa viaja)
  // A contraproposta agora VIAJA: vira um pedido registrado na fila do comprador, que recebe
  // e-mail e decide (aceitar cria a proposta nova no valor pedido, ver acceptCounterOffer).
  // Antes isto só recusava e escrevia um aviso na MINHA tela — do outro lado não chegava nada,
  // então pro comprador a negociação simplesmente morria sem explicação.
  const cid=(hashSeed(S.seed,S.round,o.playerName,S.clubId,o.buyerId,'counter',nowMs())>>>0);
  const counter={ id:cid, sellerId:S.clubId, sellerName:(clubOf(S.clubId)||{}).short||S.clubId,
    sellerHumanName:(typeof CL!=='undefined'&&CL.humans&&CL.humans[S.clubId])||'O treinador',
    playerName:o.playerName, playerForce:o.playerForce, offeredFee:o.fee, askFee, expiresRound:S.round+6 };
  S.counterOffersByClub=S.counterOffersByClub||{};
  (S.counterOffersByClub[o.buyerId]=S.counterOffersByClub[o.buyerId]||[]).push(counter);
  if(typeof CL!=='undefined' && CL.online){ S._netCounters=S._netCounters||[]; S._netCounters.push(Object.assign({to:o.buyerId}, counter)); }
  S.roundNews=S.roundNews||[];
  S.roundNews.push(`✋ Você recusou a proposta por ${o.playerName} e pediu ${fmt(askFee)}.`);
  save();
  return {ok:true, msg:`Contraproposta enviada: você pediu ${fmt(askFee)} por ${o.playerName}. ${o.buyerHumanName||o.buyerName} vai receber no e-mail dele.`};
}
/* ===== CONTRAPROPOSTAS RECEBIDAS (eu comprador) =====
   Mesma fonte única das propostas: só vale enquanto o jogador ainda está no elenco de QUEM
   pediu (se ele vendeu pra outro no meio tempo, não há mais o que negociar) e dentro da validade. */
function myCounterOffers(){
  const list=(S.counterOffersByClub&&S.counterOffersByClub[S.clubId])||[];
  if(!list.length) return list;
  return list.filter(c=>{
    if(!c || c.expiresRound<=S.round) return false;
    const sq=(S.squads&&S.squads[c.sellerId])||[];
    return sq.some(p=>p && p.n===c.playerName);
  });
}
function pruneCounterOffers(){
  S.counterOffersByClub=S.counterOffersByClub||{};
  Object.keys(S.counterOffersByClub).forEach(cid=>{
    S.counterOffersByClub[cid]=(S.counterOffersByClub[cid]||[]).filter(c=>{
      if(!c || c.expiresRound<=S.round) return false;
      const sq=(S.squads&&S.squads[c.sellerId])||[];
      return sq.some(p=>p && p.n===c.playerName);
    });
  });
}
/* aceitar = mandar uma proposta NOVA no valor pedido (sendHumanOffer faz as validações de
   janela/caixa/cota e já usa o canal que chega no vendedor) — sem caminho paralelo de compra. */
function acceptCounterOffer(id){
  const c=myCounterOffers().find(x=>x.id===id); if(!c) return {ok:false,msg:'Contraproposta não existe mais.'};
  // a proposta ANTIGA (a que foi recusada) pode ainda estar na fila do vendedor no estado
  // autoritativo — sem tirar ela daqui, sendHumanOffer recusaria a nova por "já existe uma
  // proposta pendente por esse jogador", travando justamente o aceite da contraproposta.
  ((S.incomingOffersByClub&&S.incomingOffersByClub[c.sellerId])||[])
    .filter(o=>o && o.playerName===c.playerName && String(o.buyerId)===String(S.clubId))
    .forEach(o=>dropIncomingOffer(c.sellerId, o.id));
  const r=sendHumanOffer(c.sellerId, c.playerName, c.askFee);
  if(r.ok) dropCounterOffer(id);
  return r;
}
function rejectCounterOffer(id){ dropCounterOffer(id); return {ok:true,msg:'Contraproposta recusada.'}; }
function dropCounterOffer(id){
  S.counterOffersByClub=S.counterOffersByClub||{};
  S.counterOffersByClub[S.clubId]=((S.counterOffersByClub[S.clubId])||[]).filter(x=>x.id!==id);
  if(S._netCounters) S._netCounters=S._netCounters.filter(x=>x.id!==id);
  save();
}
/* espelho de pruneAppliedNetOffers pro buffer de contrapropostas */
function pruneAppliedNetCounters(){
  if(!S || !S._netCounters || !S._netCounters.length) return;
  S._netCounters=S._netCounters.filter(c=>{
    if(!c || c.expiresRound<=S.round) return false;
    const fila=(S.counterOffersByClub && S.counterOffersByClub[c.to])||[];
    return !fila.some(x=>x && x.id===c.id);
  });
}
/* roda a cada reconcile/adopt (ver onlineAdoptServerRound/onlineReconcileIfBehind): confere se
   alguma proposta MINHA (S.outgoingOffersByClub) já foi aceita — sinal: o jogador já está no MEU
   elenco (o vendedor moveu-o ao aceitar, via recordNetTransfer -> aplicado no mundo por todos).
   Só ENTÃO debito o MEU caixa: na regra humano<->humano ninguém mais mexe no meu caixa por mim
   (mesmo princípio de commitBudget/applyOwnPendingFinances) — o vendedor já creditou o dele ao
   aceitar (acceptIncomingOffer). Se expirou sem o jogador chegar, foi recusada/ignorada: só some
   da lista, sem debitar nada. */
function settleMyOutgoingOffers(){
  const mine=(S.outgoingOffersByClub && S.outgoingOffersByClub[S.clubId])||[];
  if(!mine.length) return;
  const stay=[];
  mine.forEach(o=>{
    const arrived=(S.squads[S.clubId]||[]).some(p=>p.n===o.playerName);
    if(arrived){
      // JÁ PAGUEI por esta proposta? A lista de propostas enviadas mora no S (compartilhado),
      // então o adopt a traz de volta e esta função — que roda a cada adopt — debitava outra vez,
      // com e-mail e lançamento repetidos rodada após rodada. O carimbo é por-cliente (ver
      // offerAlreadySettled/markOfferSettled), único jeito de sobreviver ao adopt.
      if(typeof offerAlreadySettled==='function' && offerAlreadySettled(o.id)) return;
      if(typeof markOfferSettled==='function') markOfferSettled(o.id);
      S.budget-=o.fee; commitBudget();
      S.roundNews=S.roundNews||[]; S.roundNews.push(`✍️ Proposta aceita: ${o.playerName} chegou por ${fmt(o.fee)}.`);
      // LANÇA nas finanças. Contratação vinda de OUTRO HUMANO é fechada no cliente do vendedor
      // (acceptIncomingOffer), e do lado do comprador só o caixa era debitado aqui — a compra não
      // aparecia em "transações recentes" nem virava e-mail, ao contrário de toda outra compra
      // (negociação com CPU, leilão), que grava a sua entrada.
      const vendedor=(clubOf(o.sellerId)||{}).short||'outro clube';
      pushFinanceEntry({playerPurchases:o.fee, log:[`✍️ ${o.playerName} contratado do ${vendedor} por ${fmt(o.fee)}.`]});
      return;
    }
    if(S.round>o.expiresRound) return; // recusada/ignorada -> só sai da lista
    stay.push(o);
  });
  S.outgoingOffersByClub=S.outgoingOffersByClub||{};
  S.outgoingOffersByClub[S.clubId]=stay;
}
/* CONTRAPROPOSTA numa proposta recebida: você pede um valor maior; o comprador responde
   conforme o teto que ele topa pagar (maxFee — que já pesa valor de mercado + fase do jogador).
   - pedido <= oferta atual: aceita na hora (você abriu mão) -> o.state 'agreed'
   - pedido <= teto: o comprador topa esse valor -> o.state 'agreed' (é só confirmar)
   - pedido acima do teto: sobe um meio-termo (até o teto) e devolve; após 3 rodadas ou
     ganância grande (>1.3x teto), dá a palavra final (não passa do teto). */
function counterIncomingOffer(id, askFee){
  const o=myIncomingOffers().find(x=>x.id===id); if(!o) return {ok:false,msg:'Proposta não existe mais.'};
  if(o.state==='final'){ return {ok:false, msg:`${o.buyerName} já deu a palavra final: ${fmt(o.fee)}. Aceite ou recuse.`, final:true}; }
  askFee=Math.round(askFee)||0;
  o.ask=askFee;    // fica guardado: o campo "Seu pedido" reabre com o que EU pedi, não com um palpite
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
/* ============ LEILÃO COMPETITIVO (disputa contra clubes da CPU) ============
   Cada jogador em leilão tem 2..20 clubes da CPU interessados (mais cobiçado = mais clubes e
   TETO de preço maior). O lote fica ABERTO por até 3 rodadas; a cada rodada a CPU COBRE o lance
   do usuário rumo ao teto. Pra LEVAR, o usuário precisa dar um lance ACIMA do teto (senão é
   coberto na rodada seguinte). Tudo DETERMINÍSTICO por seed -> lotes/comportamento da CPU são
   idênticos em todos os clientes da Resenha; o lance do usuário é local (como as transferências
   de hoje — humano-vs-humano fica pra um passo futuro). */
const AUCTION_ROUNDS=3, AUCTION_TARGET_LOTS=8;
function auctionEligible(){ return ((S.config&&S.config.profile&&S.config.profile.auctionMode)||'todos')!=='nenhum'; }
function auctionDesirability(p){
  const f=p.f||60;
  const forceScore=Math.max(0, Math.min(1, (f-45)/45));              // f45->0, f90->1
  const ageScore=p.age? Math.max(0, Math.min(1, (32-p.age)/16)) : 0.5; // mais novo = mais cobiçado
  return Math.max(0, Math.min(1, forceScore*0.75 + ageScore*0.25));
}
function auctionInterest(p, R){ // 2..20 clubes disputando, crescendo com a desirabilidade
  const n=Math.round(2 + auctionDesirability(p)*18 + (R.random()-0.5)*3);
  return Math.max(2, Math.min(20, n));
}
function auctionCeiling(p, interest, R){ // teto que a CPU paga: mais concorrência = maior
  const base=liveMV(p);
  return Math.round(base*(1 + (interest/20)*1.4 + R.random()*0.25)); // 2 clubes ~1.15x, 20 ~2.6x
}
function makeAuctionLot(club, p, R){
  const interest=auctionInterest(p, R);
  const vm=liveMV(p);
  return { id:club.id+'|'+p.n, sellerId:club.id, player:p.n, base:vm,
    interest, ceiling:auctionCeiling(p, interest, R),
    bid:Math.round(vm*(0.6+R.random()*0.15)), leader:'cpu', myBid:0,
    roundsLeft:AUCTION_ROUNDS, status:'open' };
}
function openAuctionLots(R, want){
  if(want<=0 || !auctionEligible() || !inTransferWindow()) return;
  S.auctions=S.auctions||{round:S.round, lots:[]};
  const mode=(S.config&&S.config.profile&&S.config.profile.auctionMode)||'todos';
  const mySquad=S.squads[S.clubId]||[]; const myAvg=mySquad.length? mySquad.reduce((s,p)=>s+p.f,0)/mySquad.length : 65;
  const have=new Set(S.auctions.lots.map(l=>l.id));
  const cpuClubs=DATA.clubs.filter(c=>!isCpuMarketProtected(c.id)); if(!cpuClubs.length) return;
  let tries=0, added=0;
  while(added<want && tries<want*8){
    tries++;
    const club=cpuClubs[Math.floor(R.random()*cpuClubs.length)];
    const sq=club&&S.squads[club.id]; if(!sq || sq.length<=16) continue;
    const p=sq[Math.floor(R.random()*sq.length)]; const id=club.id+'|'+p.n;
    if(have.has(id)) continue;
    if(!canReleaseFromSquad(club.id,p).ok) continue; // piso de elenco: o clube não leiloa o último goleiro
    if(mode==='sem_fracos' && p.f < myAvg*0.85) continue; // preferência do Perfil
    S.auctions.lots.push(makeAuctionLot(club, p, R)); have.add(id); added++;
  }
}
/* SINCRONIZAÇÃO DE LANCES (Modo Resenha): lot.leader passou de binário 'me'/'cpu' pra 'cpu' OU o
   clubId do humano que está na frente — sem isso, cada treinador via A SI MESMO como líder
   (leader:'me' era relativo a quem estava olhando) e a resolução (que só roda no fallback local do
   ANFITRIÃO — ver _commitLeagueRound) sempre creditava o jogador pro clube do anfitrião, nunca pro
   humano que realmente venceu. lot.bids{clubId:{amount,ts}} guarda o histórico de lances humanos
   conhecidos (o meu + os publicados pelos outros via game_seats.last_bids/NET._claimed) só pra
   podermos atribuir corretamente quem venceu; lot.bid continua sendo o valor único "a bater" —
   agora podendo vir de qualquer um dos dois lados. */
function mergeAuctionBidsFromSeats(){
  if(typeof CL==='undefined' || !CL.online || typeof NET==='undefined' || !NET._claimed || !S.auctions) return;
  const lotsById={}; (S.auctions.lots||[]).forEach(l=>{ lotsById[l.id]=l; });
  Object.keys(NET._claimed).forEach(uid=>{
    const c=NET._claimed[uid]; if(!c || !c.clubId || !c.last_bids) return;
    Object.keys(c.last_bids).forEach(lotId=>{
      const lot=lotsById[lotId]; const b=c.last_bids[lotId];
      if(!lot || lot.status!=='open' || !b || b.amount==null) return;
      lot.bids=lot.bids||{};
      const prev=lot.bids[c.clubId];
      if(!prev || (b.ts||0)>=(prev.ts||0)) lot.bids[c.clubId]={amount:b.amount, ts:b.ts||0}; // guarda o lance MAIS RECENTE desse clube
    });
  });
  (S.auctions.lots||[]).forEach(l=>{ if(l.status==='open') applyAuctionLead(l); });
}
/* recalcula lot.bid/lot.leader vendo todos os lances humanos conhecidos (lot.bids) contra o valor
   atual — o maior manda; empate exato desempata por quem lançou primeiro (timestamp menor). Se
   ninguém supera o valor atual, leader/bid ficam como estavam (podem já ser 'cpu' de uma cobertura). */
function applyAuctionLead(lot){
  const bids=lot.bids||{};
  let bestClub=null, bestAmt=lot.bid, bestTs=Infinity;
  Object.keys(bids).forEach(cid=>{
    const b=bids[cid]; if(!b || b.amount==null) return;
    if(b.amount>bestAmt || (b.amount===bestAmt && (b.ts||0)<bestTs)){ bestClub=cid; bestAmt=b.amount; bestTs=(b.ts||0); }
  });
  if(bestClub!=null){ lot.bid=bestAmt; lot.leader=bestClub; }
}
/* chamado no fim de cada rodada (playRound): CPU dá lances, resolve lotes vencidos, repõe o pool */
function advanceAuctions(R){
  R=R||makeRng(hashSeed(S.seed,S.round,'auction'));
  if(!inTransferWindow() || !auctionEligible()){ S.auctions={round:S.round, lots:[]}; return; }
  S.auctions=S.auctions||{round:S.round, lots:[]};
  mergeAuctionBidsFromSeats(); // traz os lances de TODOS os humanos da sala antes de decidir a cobertura
  const still=[];
  S.auctions.lots.forEach(l=>{
    if(l.status!=='open') return;
    if(l.leader && l.leader!=='cpu'){
      const leadAmt=(l.bids&&l.bids[l.leader]&&l.bids[l.leader].amount)||l.bid;
      if(leadAmt < l.ceiling){ // humano líder mas abaixo do teto -> CPU cobre
        const incr=Math.max(50000, Math.round(l.ceiling*0.06));
        l.bid=Math.min(l.ceiling, leadAmt+incr); l.leader='cpu';
      } // senão: bateu acima do teto -> segue firme na frente
    } else { // CPU liderando -> sobe rumo ao teto
      const incr=Math.max(50000, Math.round(l.ceiling*0.08));
      l.bid=Math.min(l.ceiling, l.bid+incr);
    }
    l.roundsLeft--;
    if(l.roundsLeft<=0) resolveAuctionLot(l); else still.push(l);
  });
  S.auctions.lots=still;
  openAuctionLots(R, AUCTION_TARGET_LOTS - S.auctions.lots.length);
  S.auctions.round=S.round;
}
function resolveAuctionLot(l){
  if(!l.leader || l.leader==='cpu'){ l.status='lost'; return; } // um clube da CPU levou
  const winnerClubId=l.leader; // clubId do humano vencedor — pode não ser S.clubId (quem resolve é sempre o ANFITRIÃO no fallback)
  const p=findP(l.player, l.sellerId); if(!p){ l.status='lost'; return; }
  const price=(l.bids&&l.bids[winnerClubId]&&l.bids[winnerClubId].amount)||l.bid;
  const isMe=String(winnerClubId)===String(S.clubId);
  S.roundNews=S.roundNews||[];
  // caixa/cota só são MINHA autoridade (S.budget, cota da MINHA divisão) — pra outro humano vencer,
  // o crédito do jogador acontece igual (elenco é estado do mundo), mas o caixa dele é autoritativo
  // no PRÓPRIO assento (commitBudget) e reconcilia sozinho quando ele adotar este resultado.
  if(isMe){
    if(price>S.budget){ l.status='lost'; S.roundNews.push(`❌ ${l.player}: caixa insuficiente pra pagar o lance vencedor no leilão.`); return; }
    const fq=checkForeignQuota(p); if(!fq.ok){ l.status='lost'; S.roundNews.push(`❌ ${l.player}: ${fq.msg}`); return; }
  }
  if(isMe){ S.budget-=price; commitBudget(); }                // publica: senão o débito do leilão é revertido
  S.squads[l.sellerId]=(S.squads[l.sellerId]||[]).filter(x=>x.n!==p.n);
  p.contract={ salary:REBAL.wage(p.f), role:'Rotação', gotMatchesBonus:false, benchStreak:0, releaseClause:null };
  p.moral=75; applyTradeLock(p); recordTransferHistory(p, l.sellerId, winnerClubId, price);
  if(typeof MARKET!=='undefined' && MARKET.revalueOnTransfer) MARKET.revalueOnTransfer(p, MARKET.divisionToLeague(S.division));
  S.squads[winnerClubId]=S.squads[winnerClubId]||[]; S.squads[winnerClubId].push(p);
  recordNetTransfer(l.sellerId, winnerClubId, p.n, p.contract, price, p.pid); // online: sem isto o arremate é desfeito
  l.status='won';
  if(isMe){
    S.roundNews.push(`🔨 ${p.n} arrematado no leilão por ${fmt(price)} — você cobriu a concorrência!`);
    pushFinanceEntry({playerPurchases:price, log:[`🔨 ${p.n} arrematado no leilão por ${fmt(price)}.`]});
  } else {
    /* LEILÃO GANHO POR OUTRO CLUBE. Antes isto não gerava aviso nenhum: só o
       arremate do PRÓPRIO utilizador virava notícia, e um jogador que ele estava
       a acompanhar sumia do mercado sem explicação. Guarda uma FOTOGRAFIA do
       jogador (o objeto muda de clube logo a seguir) para a tela poder mostrar a
       ficha do pacote — ver o diálogo `mkt-leilao-outro`. */
    S.auctionSales=S.auctionSales||[];
    S.auctionSales.push({
      nome:p.n, pos:p.s, forca:p.f, idade:p.age||null,
      salario:(p.contract&&p.contract.salary)||0, base:l.base||0,
      gols:(S.scorers&&S.scorers[p.n])||0,
      vendedor:l.sellerId, comprador:winnerClubId, preco:price, round:S.round
    });
    if(S.auctionSales.length>12) S.auctionSales=S.auctionSales.slice(-12);
    S.roundNews.push(`🔨 ${p.n} foi arrematado por ${fmt(price)}.`);
  }
}
/* usuário dá/aumenta o lance num lote (durante a gestão). Só valida — NÃO debita (o débito é na
   resolução). Pra garantir a compra é preciso superar o teto (senão a CPU cobre na próxima rodada). */
function placeAuctionBid(lotId, amount){
  if(!inTransferWindow()) return {ok:false,msg:'A janela de transferências está fechada.'};
  if(!auctionEligible()) return {ok:false,msg:'Você desligou compras em leilão no seu Perfil (Treinador > Perfil).'};
  mergeAuctionBidsFromSeats(); // valida contra o lance mais recente conhecido, mesmo de outro humano
  const lot=((S.auctions&&S.auctions.lots)||[]).find(l=>l.id===lotId && l.status==='open');
  if(!lot) return {ok:false,msg:'Esse lote não está mais disponível.'};
  amount=Math.round(amount||0);
  if(amount<=lot.bid) return {ok:false,msg:`O lance precisa ser maior que ${fmt(lot.bid)}.`};
  if(amount>S.budget) return {ok:false,msg:'Caixa insuficiente pra esse lance.'};
  const p=findP(lot.player, lot.sellerId); if(!p) return {ok:false,msg:'Jogador não encontrado.'};
  const fq=checkForeignQuota(p); if(!fq.ok) return {ok:false,msg:fq.msg};
  const ts=(typeof nowMs==='function')?nowMs():0;
  lot.bids=lot.bids||{}; lot.bids[S.clubId]={amount, ts};
  lot.bid=amount; lot.leader=S.clubId;
  if(typeof NET!=='undefined' && NET.publishBids) NET.publishBids(lotId, amount, ts);
  const covered = amount < lot.ceiling; // não revela o teto — só sinaliza risco
  return {ok:true, covered, msg: covered ? `Lance de ${fmt(amount)} registrado — mas a concorrência ainda pode cobrir.` : `Lance de ${fmt(amount)} — você está firme na frente!` };
}


/* ====================== COMPETIÇÕES (Copa do Brasil, Libertadores, Sul-Americana) ======================
   Adaptação: o universo do jogo tem só os 20 clubes da Série A (sem as divisões de
   acesso nem os ~106 clubes estaduais que entram na Copa do Brasil real de 126 times).
   Por isso a Copa do Brasil aqui é um mata-mata entre os 20 clubes da Série A —
   mesmo formato de eliminação, escala adaptada ao nosso universo de dados.
   Classificação pra Libertadores/Sul-Americana segue a REGRA REAL 2026 (simplificada,
   sem "vaga deslocada" por acúmulo de títulos): G6 do Brasileirão -> Libertadores
   (4 direto à fase de grupos + 2 na fase preliminar); 7º ao 12º -> Sul-Americana.  */
const COMP_DEFS = window.COMPETICOES;   // ver src/data/competicoes.js (compartilhado com o painel)
/* ===== O CAMPEÃO DA COPA DO BRASIL TEM VAGA NA LIBERTADORES (regra do dono, 20-21/08) =====
   Só o CAMPEÃO — o vice não leva vaga (ajuste de 21/08). A copa nacional da temporada que
   FECHOU vive em S._prevSeason.copaBrasil (carimbada no endSeason / resolveSeasonTurnover
   antes de qualquer reset). Só vale no Brasil: universo sem Copa do Brasil devolve lista
   vazia e nada muda. */
function nationalCupFinalists(){
  try{
    if(typeof copaNacionalDoUniverso==='function' && copaNacionalDoUniverso()!=='copaBrasil') return [];
    const b=S&&S._prevSeason&&S._prevSeason.copaBrasil;
    return (b&&b.champion)?[b.champion]:[];
  }catch(e){ return []; }
}
/* calcula quem se classifica pras copas continentais + Copa do Brasil, a partir
   da tabela final (ordenada, posição 0 = campeão) da Série A da temporada ANTERIOR.
   Campeão e vice da Copa do Brasil entram NA FRENTE nas vagas da Libertadores; a
   tabela completa o resto, e a Sul-Americana fica com os melhores que sobraram. */
function computeQualification(finalTableSorted){
  const ids=finalTableSorted.map(r=>r.id);
  const lib=Array.from(new Set(nationalCupFinalists().concat(ids))).slice(0,6);
  const naLib=new Set(lib);
  return {
    libertadores: lib,                                    // finalistas da CdB + o topo do Brasileirão
    sulamericana: ids.filter(id=>!naLib.has(id)).slice(0,6)
  };
}
/* ================= BANDEIRAS COMO IMAGEM =================
   Emoji de bandeira não renderiza em vários sistemas (no Windows viram as letras do país,
   e a Inglaterra 🏴 aparece como quadrado preto). Então usamos IMAGENS de bandeira (flagcdn.com,
   SVG) via um helper único. Mapa nome-de-país (PT ou EN) -> código ISO (Inglaterra = gb-eng). */
const FLAG_ISO={
  // países jogáveis (pt + en)
  brasil:'br', brazil:'br', argentina:'ar', chile:'cl', 'colômbia':'co', colombia:'co',
  peru:'pe', uruguai:'uy', uruguay:'uy', paraguai:'py', paraguay:'py', equador:'ec', ecuador:'ec',
  venezuela:'ve', 'bolívia':'bo', bolivia:'bo', alemanha:'de', germany:'de', espanha:'es', spain:'es',
  'frança':'fr', france:'fr', 'itália':'it', italy:'it', portugal:'pt', inglaterra:'gb-eng', england:'gb-eng',
  // demais nacionalidades reais dos elencos (nomes em inglês, como vêm dos dados; ISO flagcdn)
  albania:'al', algeria:'dz', andorra:'ad', angola:'ao', armenia:'am', australia:'au', austria:'at',
  azerbaijan:'az', barbados:'bb', belarus:'by', belgium:'be', benin:'bj', 'bosnia-herzegovina':'ba',
  bulgaria:'bg', 'burkina faso':'bf', cameroon:'cm', canada:'ca', 'cape verde':'cv', comoros:'km',
  congo:'cg', 'costa rica':'cr', "cote d'ivoire":'ci', croatia:'hr', cuba:'cu', curacao:'cw', cyprus:'cy',
  'czech republic':'cz', 'dr congo':'cd', denmark:'dk', 'dominican republic':'do', egypt:'eg',
  'equatorial guinea':'gq', eritrea:'er', estonia:'ee', 'faroe islands':'fo', finland:'fi', gabon:'ga',
  georgia:'ge', ghana:'gh', greece:'gr', guadeloupe:'gp', guinea:'gn', 'guinea-bissau':'gw', haiti:'ht',
  honduras:'hn', hungary:'hu', iceland:'is', indonesia:'id', iran:'ir', iraq:'iq', ireland:'ie',
  israel:'il', jamaica:'jm', japan:'jp', jordan:'jo', kenya:'ke', 'korea, south':'kr', kosovo:'xk',
  latvia:'lv', lebanon:'lb', libya:'ly', lithuania:'lt', luxembourg:'lu', madagascar:'mg', malawi:'mw',
  malaysia:'my', mali:'ml', malta:'mt', martinique:'mq', mauritania:'mr', mauritius:'mu', mexico:'mx',
  moldova:'md', montenegro:'me', morocco:'ma', mozambique:'mz', namibia:'na', netherlands:'nl',
  'new zealand':'nz', niger:'ne', nigeria:'ng', 'north macedonia':'mk', 'northern ireland':'gb-nir',
  norway:'no', palestine:'ps', panama:'pa', philippines:'ph', poland:'pl', 'puerto rico':'pr',
  romania:'ro', russia:'ru', scotland:'gb-sct', senegal:'sn', serbia:'rs', 'sierra leone':'sl',
  slovakia:'sk', slovenia:'si', 'south africa':'za', 'st. lucia':'lc', suriname:'sr', sweden:'se',
  switzerland:'ch', syria:'sy', thailand:'th', 'the gambia':'gm', togo:'tg', 'trinidad and tobago':'tt',
  tunisia:'tn', 'türkiye':'tr', turkiye:'tr', uganda:'ug', ukraine:'ua', 'united states':'us',
  uzbekistan:'uz', wales:'gb-wls', zambia:'zm', zimbabwe:'zw'
};
function flagIso(key){ if(!key) return null; return FLAG_ISO[String(key).toLowerCase()]||null; }
function flagImgIso(iso){
  if(!iso) return '<span class="cl-flagimg-none">🏳</span>';
  // bandeira embutida (base64, instantânea, sem rede); CDN só como fallback se faltar
  const src=(typeof window!=='undefined' && window.FLAG_PNG && window.FLAG_PNG[iso]) || ('https://flagcdn.com/'+iso+'.svg');
  return '<img class="cl-flagimg" src="'+src+'" alt="">';
}
function flagImg(country){ return flagImgIso(flagIso(country)); }

/* ================= PAÍSES/BANDEIRAS (clubes da CONMEBOL) =================
   Todo o resto do universo (Séries A/B/C/D) é brasileiro; clubes estrangeiros (Libertadores/
   Sul-Americana) carregam seu país real, pra aparecer com bandeira certa em qualquer tela que
   mostre nacionalidade do clube (visualizar time, ficha de jogador etc.), igual já acontece
   pros clubes brasileiros. */
const CONMEBOL_COUNTRIES={
  BRA:{flag:flagImgIso('br'),name:'Brasil'}, ARG:{flag:flagImgIso('ar'),name:'Argentina'}, CHI:{flag:flagImgIso('cl'),name:'Chile'},
  COL:{flag:flagImgIso('co'),name:'Colômbia'}, PER:{flag:flagImgIso('pe'),name:'Peru'}, URU:{flag:flagImgIso('uy'),name:'Uruguai'},
  PAR:{flag:flagImgIso('py'),name:'Paraguai'}, ECU:{flag:flagImgIso('ec'),name:'Equador'}, VEN:{flag:flagImgIso('ve'),name:'Venezuela'},
  BOL:{flag:flagImgIso('bo'),name:'Bolívia'}
};
/* país (bandeira+nome) do clube, na ordem: (1) .country próprio (clubes CONMEBOL da
   Libertadores/Sul-Americana); (2) derivado do código de liga lg (clubes das ligas
   europeias — jogáveis OU de background); (3) universo ativo (fallback: Brasil). */
function clubCountry(c){
  if(c && c.country) return c.country;
  const m=(c && c.lg)?lgToUniDiv(c.lg):null;
  if(m) return universeCountryInfo(m.uni);
  return universeCountryInfo();
}

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

/* ===== CLUBES CONMEBOL REAIS (Transfermarkt, ver leagues-conmebol.js) =====
   Quando existe elenco real pro clube da copa, ele SUBSTITUI o procedural. Casa o nome do
   grupo (ex.: 'Boca','CCP','BSC') com o nome real via alias + normalização + "contém". */
const CONMEBOL_CLUB_ALIAS = {
  // nome-do-grupo (normalizado) -> nome-real (normalizado), pros que não casam por "contém".
  bsc:'barcelonascguayaquil',        // BSC -> Barcelona SC Guayaquil (ECU)
  ccp:'clubcerroporteno',            // CCP -> Club Cerro Porteño (PAR)
  olimpiaasuncion:'clubolimpia'      // Olimpia Asunción -> Club Olimpia (PAR)
};
let _conmebolIndex=null;
function normNameKey(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,''); }
function conmebolIndex(){
  if(_conmebolIndex) return _conmebolIndex;
  _conmebolIndex={};
  const L=(typeof window!=='undefined')?window.CONMEBOL_LEAGUES:null;
  if(L){ for(const country in L){ (L[country]||[]).forEach(cl=>{ _conmebolIndex[cl.cc+'|'+(cl.nameKey||normNameKey(cl.name))]=cl; }); } }
  return _conmebolIndex;
}
function realConmebolClub(name, countryCode){
  const idx=conmebolIndex(); if(!Object.keys(idx).length) return null;
  let key=normNameKey(name); key=CONMEBOL_CLUB_ALIAS[key]||key;
  let cl=idx[countryCode+'|'+key];
  if(!cl){ // casa por "contém" dentro do mesmo país (ex.: 'nacional' ~ 'clubnacional')
    const pref=countryCode+'|';
    const hit=Object.keys(idx).filter(k=>k.startsWith(pref)).find(k=>{ const nk=k.slice(pref.length); return nk.includes(key)||key.includes(nk); });
    if(hit) cl=idx[hit];
  }
  if(!cl) return null;
  const id=intlClubId(name);
  const country=CONMEBOL_COUNTRIES[countryCode]||CONMEBOL_COUNTRIES.ARG;
  const squad=cl.squad.map(p=>({...p})); // f RAW; attachAttrs remapeia depois (via ensureIntlClub)
  const nf=squad.map(p=>Math.min(REBAL.force(p.f,'A'),99));
  const novr=Math.round(nf.reduce((s,f)=>s+f,0)/(nf.length||1));
  return { id, tk:cl.id, name:cl.name, short:cl.short, color:cl.color, color2:cl.color2||'#FFFFFF',
    crest:cl.crest||null, OS:novr, MS:novr, DS:novr, overall:novr, _rbOv:1, squad, country };
}
function makeIntlClub(name, countryCode){
  const real=realConmebolClub(name, countryCode); // clube real do Transfermarkt, se houver
  if(real) return real;
  const id=intlClubId(name);
  const R=makeRng(hashSeed('intlclub',name));
  const country=CONMEBOL_COUNTRIES[countryCode]||CONMEBOL_COUNTRIES.ARG;
  const overall=Math.round(64+R.random()*20); // 64-84: nível competitivo de fase de grupos
  const squad=[];
  const posPlan=[['GK',MIN_POS.GK],['DEF',MIN_POS.DEF],['MID',MIN_POS.MID],['ATT',MIN_POS.ATT]]; // mínimos por posição
  posPlan.forEach(([pos,cnt])=>{ for(let k=0;k<cnt;k++){
    const rawF=Math.max(45,Math.min(92,Math.round(overall-8+R.random()*16)));
    const f=REBAL.force(rawF,'A'); // item 4: rival de copa CONMEBOL ~ nível de 1ª divisão
    const age=Math.round(19+R.random()*15);
    // liga = código do país CONMEBOL (fora do mapa de ligas modeladas → MVL de fallback)
    squad.push({n:pickIntlPlayerName(R), p:pos, s:pos, f, rawF, _rb:1, _div:'A', age, lg:countryCode,
      mv:REBAL.value(f,age), ft:R.random()<0.75?'R':'L', num:String(Math.floor(R.random()*40)+1), nat:country.name, ag:'—', moral:70, energy:100}); } });
  const _novr=Math.round(squad.reduce((s,p)=>s+p.f,0)/squad.length); // overall na escala nova (do elenco remapeado)
  return { id, tk:id, name, short:name.length>14?name.slice(0,14):name,
    color:'#'+Math.floor(R.random()*16777215).toString(16).padStart(6,'0'), color2:'#FFFFFF', crest:null,
    OS:_novr,MS:_novr,DS:_novr,overall:_novr, _rbOv:1, squad, country };
}
/* garante elenco carregado (S.squads) e registro (S.intlClubs) pra um clube estrangeiro */
function ensureIntlClub(name, countryCode){
  const id=intlClubId(name);
  S.intlClubs=S.intlClubs||{};
  if(!S.intlClubs[id]){
    const c=makeIntlClub(name, countryCode);
    S.intlClubs[id]=c;
    S.squads[id]=gkSquad(c).map(p=>attachAttrs(initStats({...p}),'A')); // 1a divisão estrangeira -> banda A, não a divisão do usuário
  }
  return id;
}
/* uma entrada de grupo é o id brasileiro (string numérica, já existe em DATA/clubPool) ou
   [nome, código do país] pra um clube estrangeiro.

   O CLUBE DA COPA TEM DE SER O MESMO CLUBE DA LIGA, quando os dois existem.
   `ensureIntlClub` fabrica sempre um id próprio — `intl_river_plate` — a partir
   do nome. Mas num save argentino o River Plate já existe no mundo com o id do
   bundle, `cmb_209`, e é esse que o utilizador comanda. O grupo ficava com uma
   CÓPIA: dois River Plate no mesmo save, e o do utilizador nunca aparecia na
   Libertadores. Era isto que punha o jogador a assistir a uma competição em que
   o clube dele participa — `pendingUserCupMatches` procura o `CL.clubId` nos
   grupos e não o encontrava, porque lá estava o sósia.

   `realConmebolClub` já sabe casar o nome do grupo com o clube real do bundle e
   guarda o id verdadeiro em `tk`. Se esse clube já existe neste save, é ele que
   entra no grupo. Se não existe — um save brasileiro, onde os argentinos são só
   adversários de copa — segue o caminho de sempre e nada muda. */
function grupoIdLocal(nome, cc){
  if(typeof S==='undefined' || !S) return null;
  if(typeof realConmebolClub!=='function') return null;
  let real=null; try{ real=realConmebolClub(nome, cc); }catch(e){ return null; }
  const id=real&&real.tk;
  if(!id) return null;
  const existe=(S.clubPool&&S.clubPool[id]) || (S.squads&&S.squads[id])
            || (S.clubPool&&Object.keys(S.clubPool).length===0 && false);
  return existe ? id : null;
}
function resolveGroupEntry(e){
  if(typeof e==='string') return e;
  return grupoIdLocal(e[0], e[1]) || ensureIntlClub(e[0], e[1]);
}
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
  /* ===== OS ISENTOS TAMBEM SAO SORTEADOS =====
     Os confrontos ja mudavam de ano para ano (a semente traz a temporada), mas os ISENTOS eram
     sempre os mesmos: `ranked.slice(0, nByes)`, ou seja, os N mais fortes, na mesma ordem, todas
     as temporadas. Era isso que fazia o sorteio parecer o mesmo de sempre — os grandes nunca
     jogavam a primeira fase, e nunca mudava quem.
     Agora eles saem de um POTE: os mais fortes continuam a ter a vantagem (o pote e so a metade
     de cima da fila, o que preserva a ideia de cabeca-de-chave), mas quem dele sai isento e
     sorteado com a semente da temporada. Clube na fronteira do pote ora escapa a primeira fase,
     ora nao — que e o que torna o ano diferente do anterior. */
  const garantidos=Math.floor(nByes/2);              // os cabeças de verdade: passam sempre
  const sorteados=nByes-garantidos;
  /* o pote é a faixa logo abaixo dos garantidos, com folga — é dela que sai a metade sorteada.
     Sem a folga o pote teria exatamente o tamanho da vaga e não haveria sorteio nenhum. */
  const fim=Math.min(ranked.length, garantidos+Math.max(sorteados, Math.round(sorteados*1.8)));
  const fronteira=ranked.slice(garantidos, fim);
  for(let i=fronteira.length-1;i>0;i--){ const j=Math.floor(R.random()*(i+1)); [fronteira[i],fronteira[j]]=[fronteira[j],fronteira[i]]; }
  const byeTeams=ranked.slice(0,garantidos).concat(fronteira.slice(0,sorteados));
  const isento=new Set(byeTeams);
  const playTeams=ranked.filter(id=>!isento.has(id));
  for(let i=playTeams.length-1;i>0;i--){ const j=Math.floor(R.random()*(i+1)); [playTeams[i],playTeams[j]]=[playTeams[j],playTeams[i]]; }
  const ties=[]; for(let i=0;i<playTeams.length;i+=2){ ties.push({h:playTeams[i],a:playTeams[i+1],hg:null,ag:null,winner:null,events:[]}); }
  return { round:1, roundsTotal:Math.log2(size), byeTeams:byeTeams.slice(), ties, pendingByes:byeTeams.slice(), champion:null, eliminated:{}, history:[] };
}
function cupIsFinished(b){ return !!b.champion; }
function cupTeamAlive(b,id){ if(!b) return false; if(b.champion===id) return true; if(b.eliminated[id]) return false;
  return b.ties.some(t=>t.h===id||t.a===id) || (b.pendingByes||[]).includes(id) || (b.round>1 && !b.eliminated[id] && b.history.some(h=>h.advanced&&h.advanced.includes(id))) ; }
/* resolve TODAS as partidas pendentes da rodada atual de um mata-mata (quick-sim
   completo, com cartões/lesões/suspensões aplicados igual às partidas de liga) */
/* ===== A PARTIDA DE COPA DE OUTRO HUMANO NAO E MINHA PARA SIMULAR =====
   advanceCupBracket/advanceGroupStageRound rodam em cada cliente, e ate aqui simulavam QUALQUER
   confronto sem vencedor -- inclusive o que outro humano da sala estava jogando AO VIVO naquele
   instante. O humano via o resultado da sessao interativa dele; os outros calculavam outro
   placar (a sessao tem decisoes -- substituicao, penalti -- que a simulacao cega nao tem). Foi a
   final com um placar para quem jogou e outro para quem assistiu, relatada duas vezes.
   O servidor ja resolve isto ha muito: le last_cup_result do assento e aplica na chave ANTES de
   simular o resto (mandante-autoritativo). O cliente passa a fazer o mesmo: confronto de outro
   humano so entra com o resultado PUBLICADO por ele; sem resultado publicado ainda, o avanco
   inteiro espera (devolve false, nada e tocado) -- o estado do servidor chega logo depois e
   preenche. Solo e confrontos so-CPU nao mudam em nada. */
function clubeDeOutroHumano(id){
  return !!(typeof CL!=='undefined' && CL.online && CL.humans && CL.humans[id]
            && String(id)!==String(CL.clubId));
}
function cupResultadoPublicado(key, h, a){
  if(typeof CL==='undefined' || !CL.online || typeof NET==='undefined' || !NET._claimed) return null;
  for(const uid in NET._claimed){
    const c=NET._claimed[uid]; if(!c || (c.clubId!==h && c.clubId!==a)) continue;
    if(c.last_cup_round!==(S.round||0) || !c.last_cup_result) continue;
    const lista=(Array.isArray(c.last_cup_result.results) && c.last_cup_result.results.length)
      ? c.last_cup_result.results : [c.last_cup_result];
    const e=lista.find(x=>x && x.h===h && x.a===a && (!x.key || !key || x.key===key));
    if(e) return e;
  }
  return null;
}
function advanceCupBracket(b, roundLabel, comp){
  if(!b || cupIsFinished(b)) return;
  /* pre-scan ANTES de tocar em qualquer coisa: se falta o resultado publicado de um confronto
     de outro humano, o avanco inteiro espera -- avancar pela metade corromperia a chave. */
  if((b.ties||[]).some(t=>!t.winner
      && (clubeDeOutroHumano(t.h)||clubeDeOutroHumano(t.a))
      && !(cupResultadoPublicado(comp,t.h,t.a)||{}).winner)) return false;
  /* ===== TODA A GENTE TEM DE CHEGAR AO MESMO PLACAR =====
     Esta funcao roda em CADA cliente, por conta propria, sobre a mesma chave e com a mesma
     semente. Para o resultado bater, os TIMES tambem tem de bater — e nao batiam: no cliente do
     dono de um clube humano a escalacao lida era a local (`S.xi`), nos outros era a publicada.
     Foi a final da Libertadores com 4x0 num e 6x0 noutro. Aqui a conta passa a ser a do servidor:
     escalacao publicada para todos, inclusive a minha. */
  const _simCompartilhada=(typeof simEscalacaoPublicada==='function');
  if(_simCompartilhada) simEscalacaoPublicada(true);
  try{
  const winners=[];
  b.ties.forEach(t=>{
    if(t.winner) { winners.push(t.winner); return; }
    const seed=hashSeed(S.seed,'cup',roundLabel,t.h,t.a);
    if(clubeDeOutroHumano(t.h)||clubeDeOutroHumano(t.a)){
      // o placar que ELE viu e o que vale -- o mesmo payload que o servidor aplica
      const pub=cupResultadoPublicado(comp,t.h,t.a);   // o pre-scan garante pub.winner
      t.hg=pub.hg; t.ag=pub.ag; t.events=pub.events||[];
      applyMatchIncidents(t.events);
      recordScorers(pub.scorers||[], comp);
      const Rp=makeRng(hashSeed(seed,'rate'));
      ratePlayers(t.h,pub.hg,pub.ag,pub.scorers||[],Rp,pub.perf&&pub.perf.H,pub.perf&&pub.perf.A,pub.caps&&pub.caps.H,pub.matchMinutes||90);
      ratePlayers(t.a,pub.ag,pub.hg,pub.scorers||[],Rp,pub.perf&&pub.perf.A,pub.perf&&pub.perf.H,pub.caps&&pub.caps.A,pub.matchMinutes||90);
      t.winner=pub.winner; t.pens=pub.pens||null; winners.push(t.winner);
      t.jornada=S.round;
      awardCupPhasePrize(_cupKeyOf(roundLabel), b, t);
      const loser=t.winner===t.h?t.a:t.h; b.eliminated[loser]=true;
      return;
    }
    const evs=[]; let fin=null;
    const sim=simulateMatch(t.h,t.a,false,(tk)=>{ if(tk.ev) evs.push(tk.ev); },(r)=>fin=r,seed);
    let g=0; while(!fin&&g++<600) sim.step();
    t.hg=fin.hg; t.ag=fin.ag; t.events=evs;
    applyResult1off(t.h,t.a,fin.hg,fin.ag);
    const Rm=makeRng(hashSeed(seed,'rate'));
    applyMatchIncidents(evs);
    recordScorers(fin.scorers, comp); // sem isso, gol de copa não entrava em S.scorers -> "Gols nesta temporada" (só liga) ficava dessincronizado do Historial (soma liga+copa via ratePlayers)
    ratePlayers(t.h,fin.hg,fin.ag,fin.scorers,Rm,fin.perf&&fin.perf.H,fin.perf&&fin.perf.A,fin.caps&&fin.caps.H,fin.matchMinutes); ratePlayers(t.a,fin.ag,fin.hg,fin.scorers,Rm,fin.perf&&fin.perf.A,fin.perf&&fin.perf.H,fin.caps&&fin.caps.A,fin.matchMinutes);
    // empate no tempo normal: prorrogação + pênaltis de verdade (ver resolveDrawnKnockoutTie
    // em simulate.js) — nada de sorteio 50/50, e a MESMA seed de sempre garante que bate com
    // o que a partida ao vivo/espectador já mostrou, se for o caso.
    const res=resolveDrawnKnockoutTie(t.h,t.a,seed,fin.hg,fin.ag);
    t.winner=res.winner; t.pens=res.pens||null; winners.push(res.winner);
    t.jornada=S.round; // jornada de liga em que este confronto foi jogado — o Calendário precisa dela pra listar o resultado (ver userCupCalendarRows)
    awardCupPhasePrize(_cupKeyOf(roundLabel), b, t); // cota da fase (Copa do Brasil), no caixa de quem venceu
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
  } finally { if(_simCompartilhada) simEscalacaoPublicada(false); }
  return true;
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
/* ===== A COPA NACIONAL DO PAÍS ATIVO, NÃO "A COPA DO BRASIL" =====
   O jogo não pode depender da estrutura brasileira: o calendário é universal e cada país traz as
   suas competições. O servidor já lê isto da folha desde 18/08 (COPA_NACIONAL_KEY no
   resolve-round); o cliente continuava a escrever 'copaBrasil' à mão nos mesmos lugares — o
   total de rodadas, o avanço da chave e a cota de fase. País sem copa nacional devolve null, e
   quem chama simplesmente pula o bloco em vez de inventar uma Copa do Brasil. */
function copaNacionalDoUniverso(){
  if(typeof WORLD_CONFIG==='undefined' || !WORLD_CONFIG.COPA_NACIONAL) return 'copaBrasil';
  return WORLD_CONFIG.COPA_NACIONAL[activeUniverseKey()] || null;
}
/* copas do universo ativo. Brasil: Copa do Brasil + Libertadores + Sul-Americana.
   Internacional: Champions League + Europa League (só as continentais de grupos+mata-mata).
   groupCupKeys = as que têm fase de grupos; allCupKeys = todas (inclui mata-mata puro). */
/* Quais copas cada país disputa saiu daqui e foi para engine/world-config.js — a MESMA folha que
   o servidor lê desde que `rebuildContinentalCups` deixou de assumir Libertadores/Sul-Americana.
   O resultado é idêntico ao que estava escrito nestas duas linhas, para os 15 países
   (scripts/teste-universos.mjs confere um a um). O fallback mantém o jogo de pé se a folha não
   tiver carregado. */
function groupCupKeys(){
  if(typeof WORLD_CONFIG!=='undefined' && WORLD_CONFIG.copasContinentaisDe) return WORLD_CONFIG.copasContinentaisDe(activeUniverseKey());
  return (isIntlUniverse()&&!isConmebolUniverse()) ? ['championsLeague','europaLeague'] : ['libertadores','sulamericana'];
}
function allCupKeys(){
  if(typeof WORLD_CONFIG!=='undefined' && WORLD_CONFIG.copasDe) return WORLD_CONFIG.copasDe(activeUniverseKey());
  if(isConmebolUniverse()) return ['libertadores','sulamericana'];
  return isIntlUniverse() ? ['championsLeague','europaLeague'] : ['copaBrasil','libertadores','sulamericana'];
}
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
  return Object.values(g.table).sort((a,b)=>b.Pts-a.Pts||(b.GF-b.GA)-(a.GF-a.GA)||b.GF-a.GF||String(a.id).localeCompare(String(b.id)));
}
/* atalho pra UI/compat: standings do grupo único quando só existe um (Sul-Americana) */
function groupStageStandings(mg){
  const only=Object.values(mg.groups)[0];
  return only ? groupTableStandings(only) : [];
}
/* ---- "EU JÁ CUMPRI A COPA DESTA JORNADA" — fato do MEU assento, chaveado pela JORNADA ----
   Duas gerações de bug até chegar aqui:
   1. mg._userRoundDone morava no ESTADO COMPARTILHADO: um humano jogava e o marcador viajava pra
      todos (a barreira do dia de copa soltava pra quem nem tinha entrado em campo).
   2. A troca por um marcador local POR RODADA DO GRUPO herdou o defeito de origem: quando
      resolveCupRoundRest avança mg.round logo após a minha partida, a chave muda junto — e a
      MESMA jornada volta a acusar pendência (a fixture da rodada seguinte do grupo, que pertence
      a outra jornada!). Medido no harness: o participante ficava preso jogando rodadas de grupo
      em cadeia, a quarta nunca fechava e o reopen ciclava — o "repete o mesmo jogo várias vezes".
   A verdade que o jogo promete é por JORNADA: cumpri a competição X na jornada J -> nada mais de
   X pende em J, avance o grupo o quanto for. */
function myCupTurnKey(key){ return key+':'+((typeof S!=='undefined'&&S&&S.season)||1)+':'+((typeof S!=='undefined'&&S&&S.round)||0); }
function markMyCupTurnDone(key){
  if(typeof CL==='undefined') return;
  CL._myCupTurn=CL._myCupTurn||{}; CL._myCupTurn[myCupTurnKey(key)]=true;
}
function myCupTurnDone(key){
  return !!(typeof CL!=='undefined' && CL._myCupTurn && CL._myCupTurn[myCupTurnKey(key)]);
}
function advanceGroupStageRound(mg, roundLabel, comp){
  if(!mg || mg.finished) return;
  /* mesma regra do bracket (ver advanceCupBracket): partida de OUTRO humano so entra com o
     resultado publicado por ele; faltando um, a rodada inteira do grupo espera (false). */
  const _jaGravada=(g,h,a)=>(g.results||[]).some(r=>r && r.r===mg.round && r.h===h && r.a===a);
  if(Object.values(mg.groups).some(g=>((g.sched[mg.round])||[]).some(([h,a])=>{
    if(h==null||a==null) return false;
    if(_jaGravada(g,h,a)) return false;
    if(!(clubeDeOutroHumano(h)||clubeDeOutroHumano(a))) return false;
    return !cupResultadoPublicado(comp,h,a);
  }))) return false;
  /* mesma regra da chave (ver advanceCupBracket): resolucao que cada cliente faz por conta
     propria tem de usar a escalacao PUBLICADA, senao o dono de um clube humano calcula um
     resultado e os outros calculam outro. */
  const _simCompartilhada=(typeof simEscalacaoPublicada==='function');
  if(_simCompartilhada) simEscalacaoPublicada(true);
  try{
  Object.values(mg.groups).forEach(g=>{
    const fx=(g.sched[mg.round])||[];
    fx.forEach(([h,a])=>{
      if(h==null||a==null) return; // bye (número ímpar de times no grupo)
      // resultado JÁ GRAVADO nesta rodada do grupo (partida ao vivo, minha ou adotada) — dado
      // real, não marcador; nunca se aplica duas vezes, de quem quer que seja
      if(_jaGravada(g,h,a)) return;
      const seed=hashSeed(S.seed,roundLabel,g.label,h,a);
      if(clubeDeOutroHumano(h)||clubeDeOutroHumano(a)){
        // o placar publicado por quem jogou (o pre-scan garante que existe)
        const pub=cupResultadoPublicado(comp,h,a);
        applyMatchIncidents(pub.events||[]);
        const Rp=makeRng(hashSeed(seed,'rate'));
        recordScorers(pub.scorers||[], comp);
        ratePlayers(h,pub.hg,pub.ag,pub.scorers||[],Rp,pub.perf&&pub.perf.H,pub.perf&&pub.perf.A,pub.caps&&pub.caps.H,pub.matchMinutes||90);
        ratePlayers(a,pub.ag,pub.hg,pub.scorers||[],Rp,pub.perf&&pub.perf.A,pub.perf&&pub.perf.H,pub.caps&&pub.caps.A,pub.matchMinutes||90);
        const T=g.table;
        g.results=g.results||[]; g.results.push({r:mg.round, h, a, hg:pub.hg, ag:pub.ag, jornada:S.round});
        T[h].P++; T[a].P++; T[h].GF+=pub.hg; T[h].GA+=pub.ag; T[a].GF+=pub.ag; T[a].GA+=pub.hg;
        if(pub.hg>pub.ag){ T[h].W++; T[a].L++; T[h].Pts+=3; }
        else if(pub.hg<pub.ag){ T[a].W++; T[h].L++; T[a].Pts+=3; }
        else { T[h].D++; T[a].D++; T[h].Pts++; T[a].Pts++; }
        return;
      }
      const evs=[]; let fin=null;
      const sim=simulateMatch(h,a,false,(tk)=>{ if(tk.ev) evs.push(tk.ev); },(r)=>fin=r,seed);
      let steps=0; while(!fin&&steps++<600) sim.step();
      applyMatchIncidents(evs);
      const Rm=makeRng(hashSeed(seed,'rate'));
      recordScorers(fin.scorers, comp); // idem ao bracket de mata-mata: gol de copa (aqui, fase de grupos) tem que contar em S.scorers
      ratePlayers(h,fin.hg,fin.ag,fin.scorers,Rm,fin.perf&&fin.perf.H,fin.perf&&fin.perf.A,fin.caps&&fin.caps.H,fin.matchMinutes); ratePlayers(a,fin.ag,fin.hg,fin.scorers,Rm,fin.perf&&fin.perf.A,fin.perf&&fin.perf.H,fin.caps&&fin.caps.A,fin.matchMinutes);
      const T=g.table;
      // placar da partida: a tabela só acumula o agregado, então sem isto o resultado de uma
      // partida de grupo era impossível de recuperar depois (Calendário ficava só com os jogos
      // FUTUROS da competição, enquanto a liga mostrava todos os resultados).
      g.results=g.results||[]; g.results.push({r:mg.round, h, a, hg:fin.hg, ag:fin.ag, jornada:S.round});
      T[h].P++; T[a].P++; T[h].GF+=fin.hg; T[h].GA+=fin.ag; T[a].GF+=fin.ag; T[a].GA+=fin.hg;
      if(fin.hg>fin.ag){ T[h].W++; T[a].L++; T[h].Pts+=3; }
      else if(fin.hg<fin.ag){ T[a].W++; T[h].L++; T[a].Pts+=3; }
      else { T[h].D++; T[a].D++; T[h].Pts++; T[a].Pts++; }
    });
  });
  mg.round++;
  if(mg.round>=mg.roundsTotal) mg.finished=true;
  } finally { if(_simCompartilhada) simEscalacaoPublicada(false); }
  return true;
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
  // JANELA ENTRE O FIM DOS GRUPOS E O SORTEIO DAS OITAVAS. O mata-mata só é criado quando a data
  // real do sorteio chega (COMP_R16_DRAW_2026: 29/mai nas continentais, ver advancePendingCups), e
  // até lá c.bracket é null. A conta antiga caía direto no `return c.bracket ? ... : false` e
  // respondia FALSE pra todo mundo — inclusive pro líder do grupo. Na tela isso virava
  // "Eliminado" para clubes que tinham acabado de se classificar em primeiro, por semanas.
  // Nesta janela quem está vivo é quem CLASSIFICOU; quem não classificou está de fato eliminado.
  if(c.group && c.group.finished && !c.bracket){
    return (typeof groupStageAdvancers==='function') && groupStageAdvancers(c.group).indexOf(id)>=0;
  }
  return c.bracket ? cupTeamAlive(c.bracket,id) : false; }
/* está classificado e só esperando o sorteio do mata-mata? (a UI mostra isso em vez de uma fase) */
function cupAwaitingKnockoutDraw(c,id){
  return !!(c && c.group && c.group.finished && !c.bracket && typeof groupStageAdvancers==='function'
            && groupStageAdvancers(c.group).indexOf(id)>=0);
}
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
/* ===== COTA POR FASE DA COPA DO BRASIL =====
   Paga na hora em que o confronto é decidido, ao VENCEDOR da fase (e ao vice, na final),
   pra TODOS os clubes — não só o do usuário. Ver PRIZES.copaBrasilPhaseCash pros valores.
   Idempotência: o pagamento fica carimbado no próprio confronto (t.prize), que mora no estado
   compartilhado — se a mesma chave for varrida de novo (adopt do online, re-render), ninguém
   recebe duas vezes.
   Caixa: clube do PRÓPRIO usuário entra por S.budget + commitBudget() (a autoridade do caixa
   humano é o assento, ver commitBudget) e vira linha na aba Finanças; qualquer outro clube
   entra em S.budgets, que é o caixa por-clube do mundo. */
function _cupKeyOf(roundLabel){ return String(roundLabel||'').split('-')[0]; }
function awardCupPhasePrize(key, b, t){
  if(key!==copaNacionalDoUniverso() || !t || !t.winner || t.prize) return;
  if(typeof PRIZES==='undefined' || !PRIZES.copaBrasilPhaseCash) return;
  const loser=t.winner===t.h?t.a:t.h;
  const isFinal=(b.roundsTotal-b.round)<=0;
  const pagar=[[t.winner, PRIZES.copaBrasilPhaseCash(b.round, b.roundsTotal, true), isFinal?'Campeão':cupPhaseLabel(b.round,b.roundsTotal)]];
  if(isFinal) pagar.push([loser, PRIZES.copaBrasilPhaseCash(b.round, b.roundsTotal, false), 'Vice-campeão']);
  t.prize={ round:b.round, pagos:pagar.map(([id,amt])=>({id,amt})) }; // carimbo (idempotência)
  pagar.forEach(([id,amt,fase])=>{
    if(!id || !amt) return;
    if(id===S.clubId){
      S.budget=(S.budget||0)+amt; commitBudget();
      pushFinanceEntry({income:amt, log:['🏆 Copa do Brasil — '+fase+': +'+(typeof fmt==='function'?fmt(amt):amt)]});
      S.roundNews=S.roundNews||[]; S.roundNews.push(`🏆 Cota da Copa do Brasil (${fase}): +${typeof fmt==='function'?fmt(amt):amt} no caixa.`);
    } else {
      S.budgets=S.budgets||{}; S.budgets[id]=Math.round((S.budgets[id]||0)+amt);
    }
  });
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
/* ============ CALENDÁRIO OFICIAL DA TEMPORADA (DADO, não algoritmo) ============
   A tabela abaixo É o calendário do jogo: cada data de cada competição, escrita à mão. Ela
   substitui o gerador que existia aqui (faixas mod 3 + espalhamento das fases finais + dia da
   semana fixo por competição) — três camadas de aritmética que erravam de formas diferentes
   (jornadas repetidas, rodadas descartadas, duas competições no mesmo dia). Calendário é dado:
   pra mudar uma data, edite a linha; não há regra pra reajustar.
   Formato 'MM-DD'. A ORDEM de cada lista é a ordem das rodadas daquela competição. */
const SEASON_START_2026=(typeof WORLD_RULES!=='undefined')?WORLD_RULES.seasonStart():[2026,2,1];
/* O CALENDÁRIO E AS REGRAS DE AVANÇO VIVEM EM engine/world-rules.js — folha ÚNICA usada também
   pelo servidor (ver o bloco WORLD_RULES dentro do resolve-round, injetado por
   scripts/sync-world-rules.mjs). Aqui só ficam os invólucros que ligam essas regras ao estado do
   jogo (S). Antes o calendário era escrito duas vezes, e as duas cópias divergiram — foi o que
   pôs dois jogos da mesma competição no mesmo dia. */
function seasonCal(){ return WORLD_RULES.calendar(); }
function calDay(mmdd){ return WORLD_RULES.calDay(mmdd, seasonEpoch()); }
function jornadaOfCalDate(mmdd){ return WORLD_RULES.jornadaOfCalDate(mmdd, seasonEpoch()); }
const SEASON_EPOCH_2026=SEASON_START_2026; // Brasil: 1º de março de 2026 — abertura da temporada
const SEASON_EPOCH_INTL=[2026,7,15]; // Europa: ~15 de agosto de 2026 — abertura da temporada europeia 2026-27
/* epoch (dia 1) do calendário conforme o universo: o Brasileirão roda jan-dez; as ligas
   europeias rodam ago-mai. Assim as datas reais de sorteio das copas (grupos ~ago, oitavas
   ~dez pra Champions/Europa; ~mai pra Libertadores/Sul-Americana) caem no lugar certo. */
/* O EPOCH SAI DO ESTADO COMPARTILHADO, não do universo ativo do cliente. ACTIVE_UNI é local: na
   Resenha, um treinador que aceitou emprego noutro país (applyManagerJobChange -> setUniverse)
   passava a ler o calendário inteiro a partir de 15/ago em vez de 18/jan — sete meses de
   diferença nas MESMAS jornadas, e cada humano via o jogo dele num dia diferente. O calendário é
   do mundo, então tem que sair do mundo (S.intlUniverse viaja no shared_state). Fora do jogo
   (assistente/sorteio, S ainda null) vale o universo ativo, que ali é o único dado que existe. */
function seasonEpoch(){
  const uni = (typeof S!=='undefined' && S && S.intlUniverse!==undefined)
    ? (S.intlUniverse && S.intlUniverse!=='brasil')
    : (typeof isIntlUniverse==='function' && isIntlUniverse());
  return uni ? SEASON_EPOCH_INTL : SEASON_EPOCH_2026;
}
/* ==================== DIA DA SEMANA DE CADA COMPETIÇÃO ====================
   REGRA DO JOGO, igual pra humano e pra CPU, em qualquer país: cada competição tem o SEU dia da
   semana, e é o mesmo dia pra todos os clubes que a disputam. Assim dois clubes da mesma
   competição nunca jogam a mesma rodada em dias diferentes, e um clube nunca tem duas partidas
   no mesmo dia (os dias são disjuntos).
     liga .............. segunda / quarta / sábado (uma rodada por semana; o dia gira entre os três)
     Sul-Americana ..... terça          | Champions (universo europeu) ..... terça
     Libertadores ...... quinta         | Europa League (universo europeu) . quinta
     Copa do Brasil .... sexta
   O deslocamento é medido da DATA REAL, nunca assumido: o Brasil abre a temporada num domingo
   (18/jan/2026) e a Europa num sábado (15/ago/2026), então "quarta-feira da semana N" não é o
   mesmo offset nos dois universos. */
const COMP_WEEKDAY={ sulamericana:2, championsLeague:2, libertadores:4, europaLeague:4, copaBrasil:5 };
const LEAGUE_WEEKDAY_CYCLE=[6,3,1];   // sáb, qua, seg — gira por jornada, nunca bate com dia de copa
function leagueWeekdayFor(round){ return LEAGUE_WEEKDAY_CYCLE[((round||0)%LEAGUE_WEEKDAY_CYCLE.length+LEAGUE_WEEKDAY_CYCLE.length)%LEAGUE_WEEKDAY_CYCLE.length]; }
/* dia (1-based) da semana `week` que cai no dia-da-semana `weekday` (0=dom … 6=sáb) */
function dayInWeek(week, weekday){
  const base=1+Math.max(0,week||0)*7;
  const wd0=realDateForDay(base).getDay();
  return base + (((weekday-wd0)%7)+7)%7;
}
/* DIA DE CADA JOGO — sai do CALENDÁRIO, não de aritmética de semana. O dayInWeek continua como
   rede pra estado fora da tabela (jornada além das 38, universo europeu). */
function leagueMatchDay(round){ return WORLD_RULES.leagueMatchDay(round, seasonEpoch(), activeUniverseKey()); }
/* a data da copa é a da RODADA dela: traduz jornada -> índice de rodada pela tabela gravada em
   S.cupCalendar (que veio das mesmas datas), e pergunta o dia à folha única. */
function cupMatchDay(key, jornada){
  const cal=(typeof S!=='undefined'&&S)?S.cupCalendar:null;
  const i=WORLD_RULES.cupRoundIndexAt(cal, key, jornada);
  /* a data sai do SLOT da jornada, não do índice da rodada na folha de datas: eram duas
     coordenadas, e é a discordância entre elas que marcava a final antes da semifinal. */
  const d=(i>=0)?WORLD_RULES.cupMatchDayAt(key, jornada, seasonEpoch(), activeUniverseKey()):null;
  if(d!=null) return d;
  const wd=COMP_WEEKDAY[key];
  return dayInWeek(jornada, wd==null?3:wd);        // rede: copa fora da tabela (universo europeu)
}function realDateForDay(day){
  const e=seasonEpoch();
  const d=new Date(e[0],e[1],e[2]);
  d.setDate(d.getDate()+((day||1)-1));
  return d;
}
const PT_MONTHS_ABBR=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

/* ====================== A DATA DE UMA JORNADA — FONTE ÚNICA ======================
   Havia TRÊS contas diferentes de "que dia é" espalhadas pelo jogo, e a mesma
   jornada dava três datas: a faixa do clube mostrava `S.day` cru (1/mar — o
   INÍCIO da semana), o calendário da liga fazia `1+i*7+6` (7/mar) e o de copa
   `1+i*7+3` (4/mar). Quem olhava para o elenco e depois para o calendário via
   dois dias diferentes para o mesmo jogo.

   E TODAS AS COPAS USAVAM O MESMO +3. No calendário de um save real há 11
   jornadas com mais de uma copa — três delas com AS TRÊS —, e como a conta
   ignorava qual era a competição, saíam todas no mesmo dia. No futebol de
   verdade essas partidas dividem-se pela semana: por isso cada competição tem
   agora o seu dia dentro da jornada.

   Uma jornada é uma SEMANA (S.day += 7 por rodada, ver playRound). O dia 0 da
   semana i é `1 + i*7`; o deslocamento abaixo escolhe o dia dentro dela. */
const DIA_DA_COMPETICAO = { liga:6, copaBrasil:2, libertadores:3, sulamericana:4, _copa:3 };
function diaDaJornada(i, comp){
  const off = (comp && DIA_DA_COMPETICAO[comp]!=null) ? DIA_DA_COMPETICAO[comp]
            : (comp ? DIA_DA_COMPETICAO._copa : DIA_DA_COMPETICAO.liga);
  return 1 + (i||0)*7 + off;
}
/* a data real (Date) da jornada i de uma competição — 'liga' quando omitida */
function dataDaJornada(i, comp){
  if(typeof realDateForDay!=='function') return null;
  try{ return realDateForDay(diaDaJornada(i, comp)); }catch(e){ return null; }
}
/* "7/mar" — o formato curto que o calendário, o mercado e a faixa usam */
function dataCurtaDaJornada(i, comp){
  const d=dataDaJornada(i, comp);
  return d ? (d.getDate()+'/'+PT_MONTHS_ABBR[d.getMonth()]) : '';
}
function fmtRealDate(d){ return `${d.getDate()} de ${PT_MONTHS_ABBR[d.getMonth()]}`; }
/* data real do sorteio do MATA-MATA (oitavas) por competição, na temporada 2026:
   CONMEBOL sorteou as oitavas em 29/mai; UEFA (Champions/Europa) sorteia as oitavas em
   meados de dezembro — só então a fase de grupos vira mata-mata no jogo (ver advancePendingCups). */
const COMP_R16_DRAW_2026={
  libertadores:new Date(2026,4,29), sulamericana:new Date(2026,4,29),
  championsLeague:new Date(2026,11,15), europaLeague:new Date(2026,11,16)
};
/* data real do sorteio da FASE DE GRUPOS (só Champions/Europa têm cerimônia de grupos) —
   ~fim de agosto, batendo com o sorteio real da UEFA. */
const COMP_GROUP_DRAW_2026={ championsLeague:new Date(2026,7,28), europaLeague:new Date(2026,7,29) };
/* inverso de realDateForDay: em qual jornada de liga (aproximada) cai uma data real —
   usado pra colocar a data de sorteio no lugar certo do Calendário, intercalada com o
   resto (ver userCupCalendarRows/clCalendar em main.js). */
/* dia (1-based) do calendário do jogo correspondente a uma data real — inverso de realDateForDay.
   É o que permite ordenar TODAS as linhas do Calendário (liga, copa, sorteio, folga) pelo dia de
   verdade: com um dia da semana próprio por competição, "copa antes da liga" deixou de valer como
   critério (a Libertadores é quinta, a liga da mesma semana pode ser segunda). */
function dayForRealDate(d){
  const e=seasonEpoch(); const epoch=new Date(e[0],e[1],e[2]);
  return Math.round((d-epoch)/86400000)+1;
}
function jornadaForRealDate(d){
  const e=seasonEpoch(); const epoch=new Date(e[0],e[1],e[2]);
  const dayOffset=Math.round((d-epoch)/86400000)+1;
  return Math.max(1, Math.floor((dayOffset-1)/7)+1);
}

/* cada competição de copa avança numa rodada de liga DIFERENTE (defasada por 1 rodada =
   7 dias no calendário do jogo, bem acima do mínimo de 2 dias) — antes as três avançavam
   sempre na MESMA rodada%3===0, o que fazia Copa do Brasil e Libertadores parecerem jogar
   no mesmo dia no Calendário, o que clubes de verdade nunca fazem. */
const CUP_TICK_OFFSET={copaBrasil:0, libertadores:1, sulamericana:2, championsLeague:1, europaLeague:2};
/* ==================== CALENDÁRIO DE COPA (S.cupCalendar) ====================
   O PROBLEMA. A liga tem um relógio de DATAS (cada jornada avança 7 dias a partir de
   SEASON_EPOCH_2026), e as copas tinham um relógio MODULAR: `round % 3 === offset`, que não sabe
   que datas existem. Como cada copa batia a cada 3 jornadas e parava quando acabava, elas
   terminavam todas no meio da temporada — medido: final da Copa do Brasil em 14/jun com 16
   jornadas de liga ainda por jogar, Libertadores em 2/ago e Sul-Americana em 9/ago. O último
   terço do campeonato ficava sem copa nenhuma, e as finais aconteciam meses antes do que
   qualquer calendário real.

   A REGRA NOVA. As "faixas" mod 3 continuam (é o que garante que duas copas nunca caem na mesma
   jornada — um clube pode estar na Copa do Brasil e numa continental ao mesmo tempo), mas o passo
   ESTICA: a fase de grupos / as fases iniciais mantêm o ritmo cheio de hoje, e as quatro últimas
   rodadas (oitavas, quartas, semi, final) se espalham pelas jornadas que sobram da faixa, até um
   teto que reserva o fim da temporada pra decisão da liga. Resultado medido: finais em 6/set,
   13/set e 20/set, com 2 a 4 jornadas de liga ainda por jogar.

   POR QUE FICA GRAVADO NO ESTADO. O servidor (resolve-round) também avança copas, então cliente e
   servidor PRECISAM concordar sobre em que jornada cada rodada acontece. Em vez de manter o mesmo
   algoritmo espelhado dos dois lados (e torcer pra não divergirem), o calendário é calculado uma
   vez e guardado em S.cupCalendar — que viaja no shared_state. Os dois lados só LEEM. O cálculo é
   determinístico (depende só do tamanho da competição e do tamanho do calendário), então mesmo
   quando alguém precisa reconstruí-lo o resultado é idêntico.
   Save antigo, sem S.cupCalendar: cai no `% 3` de sempre — nada quebra no meio de uma temporada. */
const CUP_KO_SPREAD=4;     // as N últimas rodadas (oitavas, quartas, semi, final) são as que se espalham
const CUP_LEAGUE_TAIL=2;   // jornadas finais reservadas pra decisão da liga (sem final de copa em cima)
/* quantas rodadas esta competição vai ter na temporada inteira. Na Copa do Brasil é direto
   (roundsTotal da chave). Nas continentais o mata-mata só é criado quando a fase de grupos acaba,
   então o total é PREVISTO: rodadas de grupo + as rodadas que o mata-mata terá com os
   classificados (nº de grupos × quantos avançam por grupo). */
/* quantas rodadas esta copa precisa — a partir de um OBJETO de copas qualquer, não só do S.cups
   da âncora. É o que permite calcular o calendário do segundo país (S.mundos[pais].cups) com a
   mesma conta, em vez de duas versões da mesma regra. `nacKey` é a copa nacional daquele país. */
function cupTotalRoundsDe(cups, key, nacKey){
  const c=cups&&cups[key]; if(!c) return 0;
  if(key===nacKey) return c.roundsTotal||0;                     // copa nacional: é o próprio bracket
  if(c.group){
    const nG=Object.keys(c.group.groups||{}).length, adv=c.group.advancePerGroup||2;
    const ko=Math.max(1, Math.ceil(Math.log2(Math.max(2, nG*adv))));
    return (c.group.roundsTotal||0) + 1 + ko;                   // +1 = o tique do sorteio (ver abaixo)
  }
  return (c.bracket&&c.bracket.roundsTotal)||0;
}
function cupTotalRounds(key){
  const c=S.cups&&S.cups[key]; if(!c) return 0;
  if(key===copaNacionalDoUniverso()) return c.roundsTotal||0;   // copa nacional: é o próprio bracket
  if(c.group){
    const nG=Object.keys(c.group.groups||{}).length, adv=c.group.advancePerGroup||2;
    const ko=Math.max(1, Math.ceil(Math.log2(Math.max(2, nG*adv))));
    // +1 pelo TIQUE DE TRANSIÇÃO. Quando a fase de grupos acaba mas a data real do sorteio das
    // oitavas ainda não chegou (COMP_R16_DRAW_2026 — na Libertadores 2026 o grupo termina em
    // 10/mai e o sorteio é 29/mai), advancePendingCups gasta um tique só pra criar o mata-mata,
    // sem jogar rodada nenhuma. Sem essa vaga a mais o calendário terminava uma rodada curto e a
    // FINAL simplesmente não acontecia — medido: a temporada fechava com as duas continentais
    // paradas em "rodada 4/4" e sem campeão. Vaga sobrando é inofensiva (a competição só termina
    // um tique antes); vaga faltando mata a final, então o erro é sempre para mais.
    return (c.group.roundsTotal||0) + 1 + ko;
  }
  return (c.bracket&&c.bracket.roundsTotal)||0;
}
/* a lista de jornadas em que cada rodada desta copa acontece (índice 0 = 1ª rodada da copa).
   TRÊS INVARIANTES, e as três já foram quebradas uma vez cada:
   1. TODA jornada da lista está na FAIXA da competição (resto certo na divisão por 3, ver
      CUP_TICK_OFFSET). É a faixa que garante que duas competições NUNCA caem na mesma jornada —
      sem ela, Libertadores e Sul-Americana rodam na mesma jornada e dois humanos ficam em
      competições diferentes ao mesmo tempo (medido: jornadas 16, 31 e 35 com duas ou três copas).
   2. ESTRITAMENTE CRESCENTE: a mesma competição nunca tem duas rodadas na mesma jornada (era o
      "dois jogos de Sul-Americana no mesmo dia" — o gerador antigo arredondava duas posições
      para a mesma vaga).
   3. NENHUMA rodada descartada: a lista tem sempre `total` jornadas. O gerador antigo cortava o
      excedente em silêncio e a competição nunca chegava à final.
   Quando a competição não cabe na temporada, a faixa é ESTENDIDA além do teto — a final atrasa,
   mas ninguém sai da faixa nem perde rodada. Apertar o passo (o que eu tinha feito antes) resolve
   o tamanho e quebra a invariante 1, que é a pior das três. */
function buildCupSchedule(key, total, _epoch, pais){ return WORLD_RULES.buildCupSchedule(key, total, seasonEpoch(), pais||activeUniverseKey()); }
/* (re)constrói S.cupCalendar. Idempotente: não recalcula o que já existe pra esta temporada. */
/* NENHUMA RODADA DE COPA PODE CAIR FORA DA TEMPORADA. As datas das copas vêm do calendário real
   de 2026 (ver buildCupSchedule) e são traduzidas em jornadas — só que a temporada tem um fim
   fixo: a última jornada da liga. As finais das continentais caíam na jornada 39 num calendário
   que acaba na 37, então elas simplesmente NUNCA eram jogadas: a temporada encerrava com o
   usuário classificado para uma final que não existia.
   Aqui o calendário é ancorado: o que passa do fim é puxado para as últimas jornadas livres,
   preservando a ORDEM das rodadas e sem empilhar duas rodadas da mesma copa na mesma jornada.
   Nunca se perde uma rodada — no pior caso ela chega mais cedo. */
/* ====================== A COPA NÃO É ESPREMIDA DENTRO DA LIGA ======================
   Isto ACHATAVA as datas reais das copas para caberem até à última jornada da
   liga, em três passagens: puxava para trás o que estourasse o fim, forçava
   ordem crescente, e comprimia outra vez se a segunda passagem estourasse.

   O problema é que o calendário de 2026 é REAL, e nele a final da Copa do
   Brasil é a 06/dez — DEPOIS do fim da liga, a 03/dez. Isso não é um erro de
   dados: é assim no futebol. A compressão empurrava a final para dentro da
   liga e, quando não cabia, ela perdia-se — a temporada virava sem a final ser
   jogada, que foi exatamente o que o utilizador relatou.

   Agora as rodadas de copa ficam ONDE A DATA MANDA, mesmo além do fim da liga.
   Quem cobre o excedente é prorrogarSeFaltaCopa(), que já existe e já sabe
   empurrar jornadas extra (S.sched.push([])) para as copas devedoras — em vez
   de espremer a final para trás, a temporada estica para a alcançar.

   Fica só a garantia de ordem crescente: duas rodadas da MESMA copa não podem
   cair na mesma jornada (a fase seguinte precisa do resultado da anterior).
   `folga` continua a afastar as finais de competições diferentes. */
function ancorarCalendarioCopa(rodadas, last, folga){
  if(!Array.isArray(rodadas) || !rodadas.length) return rodadas||[];
  const out=rodadas.slice().map(r=>Math.max(0, r|0));
  // ordem crescente estrita — sem isto duas rodadas da mesma copa colidiriam
  for(let i=1;i<out.length;i++) if(out[i]<=out[i-1]) out[i]=out[i-1]+1;
  // a folga afasta a FINAL de cada competição, para quem chega a três finais
  // não as jogar todas na mesma jornada
  if(folga){ const ult=out.length-1; out[ult]=out[ult]+folga; }
  return out;
}
/* sobe sempre que a FORMA do calendário mudar — ver ensureCupCalendar */
const CAL_VERSAO=3;   // 2 = folha de slots; 3 = finais ANTES da última rodada da liga (18/08/2026)
function ensureCupCalendar(force){
  if(typeof S==='undefined' || !S || !S.cups) return;
  const last=(Array.isArray(S.sched)&&S.sched.length?S.sched.length:38)-1;
  /* VERSÃO DA FOLHA. O calendário de copa é gravado no save e só era remontado quando a TEMPORADA
     mudava — então um save começado antes de a folha de slots existir seguia a temporada inteira
     com o calendário velho, aquele em que a final podia não ter dia nenhum. Quem continuou um
     save no dia da publicação não viu diferença: o conserto estava no código e o save não o
     alcançava. Subir CAL_VERSAO faz cada save remontar UMA vez, na primeira vez que abre.
     Subir de novo sempre que a forma do calendário mudar. */
  if(!force && S.cupCalendar && S.cupCalendar._season===S.season
     && S.cupCalendar._v===CAL_VERSAO) return;
  const cal={ _season:S.season, _v:CAL_VERSAO };
  // ordem fixa (copaBrasil, libertadores, sulamericana...) pra a folga ser sempre a mesma no
  // mesmo save — calendário não pode mudar de forma entre dois carregamentos
  const chaves=Object.keys(S.cups).filter(k=>S.cups[k]).sort();
  /* SEM ANCORAGEM. `ancorarCalendarioCopa` existia para duas coisas que a folha de slots já
     garante: jornadas estritamente crescentes (os slots são) e finais em jornadas diferentes
     (cada copa tem a sua janela e nenhum slot tem duas copas). Mantê-la deslocava a final em uma
     jornada e o calendário do SOLO deixava de bater com o plano de dias da sala — dois
     calendários outra vez, que é a forma exata do bug que os slots vieram resolver.
     O `last` deixou de ser usado aqui: a final mora depois do fim da liga de propósito, e quem
     estica a temporada para alcançá-la é prorrogarSeFaltaCopa. */
  chaves.forEach((key)=>{ cal[key]=buildCupSchedule(key, cupTotalRounds(key), null, activeUniverseKey()); });
  S.cupCalendar=cal;

  /* A FOLHA VIAJA COM A SALA. O servidor não lê `pack_edits` — e passar a ler seria uma consulta
     por rodada e uma segunda porta para o mesmo dado. Em vez disso a folha do país (já com o
     pacote do painel aplicado, se houver) fica no estado compartilhado, como o day_plan:
     calculada uma vez por quem monta a temporada, lida por todos. Sem isto, um país criado no
     painel valeria no cliente e não no servidor — a divergência exata que este projeto combate. */
  if(typeof CALENDARIOS_API!=='undefined' && CALENDARIOS_API.calendarioDe){
    S.calFolha={ pais:activeUniverseKey(), folha:CALENDARIOS_API.calendarioDe(activeUniverseKey()) };
  }

  /* CONFERE A FOLHA ANTES DE A TEMPORADA COMEÇAR — e AVISA, nunca trava.
     A falta de dia para uma rodada só aparecia em dezembro, quando a final não acontecia. Agora
     aparece no momento em que o calendário é montado, que é o único em que ainda dá para
     corrigir. O motor segue jogando com o que tem (slotsDaCompeticao completa o que falta); o
     aviso existe para o erro ser CORRIGIDO na folha em vez de remendado todo ano. */
  if(typeof CALENDARIOS_API!=='undefined' && CALENDARIOS_API.validarCalendario){
    const totaisV={}; chaves.forEach(k=>{ try{ totaisV[k]=cupTotalRounds(k); }catch(e){} });
    const uni=(typeof UNI_CONFIGS!=='undefined' && UNI_CONFIGS[activeUniverseKey()]) || null;
    const problemas=CALENDARIOS_API.validarCalendario(activeUniverseKey(), { totais:totaisV, divisoes:uni&&uni.size });
    const erros=problemas.filter(x=>x.nivel==='erro');
    if(erros.length){
      console.warn('calendário de '+activeUniverseKey()+': '+erros.length+' problema(s) na folha de slots');
      erros.forEach(x=>console.warn('  · '+(x.comp||'')+' — '+x.texto));
      S.roundNews=S.roundNews||[];
      S.roundNews.push('📅 O calendário da temporada tem '+erros.length+' problema(s) — o jogo completou o que faltava.');
    }
  }

  /* ===== AS RODADAS DA LIGA MORAM NOS SLOTS DA FOLHA, NÃO EM FILA CORRIDA =====
     `makeSchedule` devolve as 38 rodadas do returno umas atrás das outras, e a jornada era o
     índice dessa fila: jornada 0 = rodada 1, jornada 37 = rodada 38, fim. A folha, porém, diz
     em que SEMANA cada rodada se joga — e agora ela reserva as semanas das finais (39, 40 e 41
     no Brasil) sem jogo de campeonato, com a última rodada da liga a fechar o ano no slot 42.
     Sem este encaixe as duas coisas discordavam outra vez: a liga acabava na jornada 37 e as
     finais ficavam depois dela. É a mesma família de bug que os slots vieram acabar — duas
     coordenadas a dizer coisas diferentes sobre o mesmo dia.
     A conta é a mesma dos dois lados: `slotsDaLiga` é a folha partilhada com o servidor (ver
     world-rules.js), e é ela que também monta o plano de dias. Uma divisão que jogue menos
     rodadas do que a folha declara recebe os slots espalhados, e acaba na mesma semana.
     Carimbado por temporada: reencaixar um calendário já encaixado embaralharia os jogos. */
  if(Array.isArray(S.sched) && S._schedEmSlots!==(S.season||1)){
    try{
      const folha=(typeof CALENDARIOS_API!=='undefined'&&CALENDARIOS_API.calendarioDe)
        ? CALENDARIOS_API.calendarioDe(activeUniverseKey()) : null;
      const declarados=folha&&folha.competicoes&&folha.competicoes.liga ? folha.competicoes.liga.slots : null;
      if(declarados&&declarados.length&&typeof WORLD_RULES!=='undefined'&&WORLD_RULES.slotsDaLiga){
        const rodadas=S.sched.filter(fx=>fx&&fx.length);      // só as que têm jogo — as vazias renascem abaixo
        const ligaSlots=WORLD_RULES.slotsDaLiga(declarados, rodadas.length);
        const ultimo=ligaSlots.length?ligaSlots[ligaSlots.length-1]:0;
        const total=Math.max(folha.slotsTotal||0, ultimo);
        const novo=[]; for(let i=0;i<total;i++) novo.push([]);
        rodadas.forEach((fx,r)=>{
          const sl=ligaSlots[r]!=null ? ligaSlots[r] : (ultimo+(r-ligaSlots.length+1));
          if(sl>=1&&sl<=novo.length) novo[sl-1]=fx; else novo.push(fx);
        });
        S.sched=novo; S._schedEmSlots=(S.season||1);
      }
    }catch(e){ console.warn('encaixe da liga nos slots:', e&&e.message); }
  }
  /* REDE: nenhuma rodada de copa pode ficar sem jornada. Com o encaixe acima a temporada já
     nasce do tamanho da folha, então isto quase nunca tem o que fazer — mas uma copa que precise
     de mais rodadas do que a folha declara ainda ganha os dias de que precisa (ver
     slotsDaCompeticao, que estende), e `prorrogarSeFaltaCopa` continua como última rede. */
  if(Array.isArray(S.sched)){
    let maior=-1;
    chaves.forEach(k=>(cal[k]||[]).forEach(j=>{ if(j>maior) maior=j; }));
    let criadas=0;
    while(S.sched.length<=maior && criadas<24){ S.sched.push([]); criadas++; }
    if(criadas) S._jornadasExtras=(S._jornadasExtras||0)+criadas;
  }
}
/* ==================== DATA DO SORTEIO DE CADA COPA ====================
   TODOS OS SORTEIOS DE ABERTURA ACONTECEM NO COMEÇO DO JOGO, logo depois das boas-vindas ao
   clube — e é a partir deles que o calendário da temporada é montado, pra todos os clubes do
   save. Antes cada cerimônia tinha a sua data ao longo da temporada (dois dias antes da estreia
   da competição), o que significava jogar semanas sem saber contra quem se ia jogar na copa e,
   pior, um calendário que só ficava completo aos poucos.
   O sorteio do MATA-MATA das continentais continua no meio da temporada, na data real dele
   (COMP_R16_DRAW_2026): não há como sortear oitavas antes de saber quem se classificou. As
   DATAS dessas rodadas, essas sim, já ficam reservadas no calendário desde o dia 1. */
function cupFirstPlayRoundReal(key){
  const cal=(typeof S!=='undefined'&&S&&S.cupCalendar)?S.cupCalendar[key]:null;
  if(cal && cal.length) return cal[0];
  return cupFirstPlayRound(key);
}
/* dia em que a rodada `round` desta copa é jogada — o dia da semana é fixo por competição
   (ver COMP_WEEKDAY). Assinatura antiga (round só) mantida pros chamadores que não sabem a copa. */
function cupRoundMatchDay(round, key){ return key ? cupMatchDay(key, round||0) : dayInWeek(round||0, 3); }
/* A DATA DE CADA SORTEIO vem do calendário (02/03 Libertadores, 11/03 Sul-Americana, 21/03 Copa
   do Brasil) — cada uma antes da estreia da própria competição. Competição fora da tabela sorteia
   no dia 1, que é o comportamento seguro (nunca há jogo antes do sorteio). */
function cupSeasonDrawDays(){
  if(typeof S==='undefined' || !S || !S.cups) return {};
  const out={};
  Object.keys(S.cups).forEach(k=>{ if(S.cups[k]) out[k]=WORLD_RULES.cupDrawDay(k, seasonEpoch(), activeUniverseKey()); });
  return out;
}
/* a data do sorteio desta copa já chegou? Com as cerimônias todas no dia 1, isto é verdade desde
   o começo do save — a função fica porque o resto do fluxo pergunta ("não há jogo antes do
   sorteio da competição") e porque save antigo, no meio de uma temporada, ainda tem data velha. */
function cupDrawReleased(key, round){
  const dia=cupSeasonDrawDays()[key];
  if(dia==null) return true;
  return dia<=cupRoundMatchDay(round!=null?round:(S.round||0), key);
}
/* enfileira as cerimônias cuja data chegou (uma vez por temporada). Devolve quantas entraram —
   quem chama usa isso pra mostrar o sorteio ANTES das partidas da rodada (ver clJogar). */
/* ===== QUE COMPETICOES TEM CERIMONIA DE SORTEIO =====
   A cerimonia -- as bolas a sair uma a uma -- existe para dizer QUEM cai COM
   QUEM quando isso ainda nao se sabe: os grupos das continentais. Na Copa do
   Brasil ela nao acrescenta nada: sao 80 clubes e 16 confrontos de uma vez, o
   utilizador nao conhece metade dos nomes e a chave logo a seguir mostra tudo
   outra vez. Decisao do dono do jogo (17/08): a Copa do Brasil deixa de a ter.
   Quem quiser desligar outra e so acrescentar aqui.

   REVERTIDO em 18/08/2026, a pedido do mesmo dono: sem a cerimonia, a Copa do Brasil passou a
   comecar sem nada a dizer que ela comecou — o jogador abria a chave sem nunca ter visto o
   sorteio. Fica LIGADA. Para desligar de novo, e so repor `copaBrasil:true` aqui. */
const CUP_SEM_CERIMONIA={};
function cupTemCerimonia(key){ return !CUP_SEM_CERIMONIA[key]; }
/* ===== A CERIMONIA E DO MEU PAIS =====
   Quem foi treinar noutro pais a meio da temporada carrega as copas do Brasil no estado ate a
   virada (S.cups nao e reconstruido na troca) — e as cerimonias iteravam S.cups sem perguntar de
   quem sao: o tecnico do Manchester City ficava vendo o sorteio da Copa do Brasil (relatado a
   20/08). A pergunta e a folha do pais (WORLD_CONFIG.copasDe): copa que nao pertence ao MEU
   universo nao me deve cerimonia. Brasil responde true para tudo — caminho de sempre. */
function cupDoMeuUniverso(key){
  try{
    const uni=(typeof activeUniverseKey==='function')?activeUniverseKey():'brasil';
    if(uni==='brasil') return true;
    const lista=(typeof WORLD_CONFIG!=='undefined'&&WORLD_CONFIG.copasDe)?WORLD_CONFIG.copasDe(uni):null;
    return !lista || lista.indexOf(key)>=0;
  }catch(e){ return true; }
}
/* ===== HA SORTEIO A VER? — PERGUNTA SEM EFEITO COLATERAL =====
   queueDueCupDraws() ENFILEIRA enquanto responde, entao nao serve para um rotulo de botao (o
   desenho da tela passaria a mexer no estado do save). Esta e a mesma conta, sem escrever nada. */
/* ===== A CERIMONIA E DE CADA UM, ENTAO A MARCA TAMBEM TEM DE SER =====
   "Ja enfileirei este sorteio nesta temporada" vivia em `S._cupDrawQueued` — o estado
   COMPARTILHADO. Numa sala isso quer dizer que o primeiro cliente a passar por aqui carimba a
   marca, ela viaja para todos no estado, e mais ninguem ve a cerimonia. Foi o relatado a
   19/08/2026: ninguem viu o sorteio da Copa do Brasil na Resenha.

   Ha um segundo caminho para o mesmo estrago, e explica por que NINGUEM viu (e nao "so um viu"):
   enquanto a Copa do Brasil esteve sem cerimonia (CUP_SEM_CERIMONIA, ligado a 17/08 e revertido a
   18/08), este codigo carimbava a marca SEM enfileirar nada. O carimbo ficou no save, e a
   cerimonia nunca mais teve como aparecer naquela temporada.

   A cerimonia e UI: cada humano tem de a ver. A marca passa para o registo POR CLIENTE que ja
   existe — `drawAlreadySeen`/`rememberDrawSeen`, gravado por sala+temporada em localStorage, o
   mesmo que faz o sorteio nao repetir quando alguem recarrega a pagina. Nada disto viaja no
   mundo, que e o ponto.

   O carimbo continua a ser posto ao ENFILEIRAR, e nao ao mostrar: sem isso, uma cerimonia que
   nao chegue a renderizar (dados da chave ainda por montar) faria o botao dizer "Ver o sorteio"
   para sempre. */
function sorteioJaVistoPorMim(mark){
  if((CL._cupDrawQueued||{})[mark]) return true;
  return (typeof drawAlreadySeen==='function') && drawAlreadySeen(mark);
}
function marcarSorteioVistoPorMim(mark){
  CL._cupDrawQueued=CL._cupDrawQueued||{}; CL._cupDrawQueued[mark]=true;
  if(typeof rememberDrawSeen==='function') rememberDrawSeen(mark);
}
function haSorteioPendente(){
  try{
    if(typeof S==='undefined' || !S || !S.cups) return false;
    /* A FILA E COMPARTILHADA; O "JA VI" E MEU. S._pendingDrawShows viaja no shared_state (o host
       salva ANTES de consumir), entao uma entrada que EU ja assisti continua na minha copia da
       fila ate a proxima adocao. Contar essa entrada fazia o botao dizer "Ver o sorteio" para
       sempre -- e o clique, que dispensa entradas ja vistas (checkPendingCupDraws), nao abria
       nada: era o botao de acao falsa relatado a 19/08. O filtro e o MESMO do consumo: a marca
       por cliente key:stage:season (CL._drawPlayedSeason / drawAlreadySeen). */
    const _vi=x=>{
      const key=(x&&x.key)||x, stage=(x&&x.stage)||'bracket';
      if(typeof cupDoMeuUniverso==='function' && !cupDoMeuUniverso(key)) return true;   // copa de outro pais: nao me deve nada
      if(typeof cupTemCerimonia==='function' && !cupTemCerimonia(key)) return true;
      const mark=key+':'+stage+':'+(S.season||1);
      if(typeof CL!=='undefined' && (CL._drawPlayedSeason||{})[mark]) return true;
      return (typeof drawAlreadySeen==='function') && drawAlreadySeen(mark);
    };
    if((S._pendingDrawShows||[]).some(x=>!_vi(x))) return true;
    const season=S.season||1;
    return Object.keys(cupSeasonDrawDays()).some(key=>{
      if(!S.cups[key]) return false;
      if(!cupDoMeuUniverso(key)) return false;
      if(!cupDrawReleased(key)) return false;
      if(sorteioJaVistoPorMim(key+':'+season)) return false;
      return (typeof cupTemCerimonia!=='function') || cupTemCerimonia(key);
    });
  }catch(e){ return false; }
}
function queueDueCupDraws(){
  if(typeof S==='undefined' || !S || !S.cups) return 0;
  if(typeof queueDrawShow!=='function') return 0;
  const season=S.season||1; let n=0;
  Object.keys(cupSeasonDrawDays()).forEach(key=>{
    if(!S.cups[key]) return;
    if(!cupDoMeuUniverso(key)) return;   // copa de outro pais: cerimonia nao e minha
    if(!cupDrawReleased(key)) return;
    const mark=key+':'+season; if(sorteioJaVistoPorMim(mark)) return;
    if(!cupTemCerimonia(key)){ marcarSorteioVistoPorMim(mark); return; }
    // só a cerimônia de ABERTURA da competição (grupo, ou chave na Copa do Brasil); o sorteio
    // do mata-mata das continentais continua saindo em advancePendingCups, na data real dele.
    const c=S.cups[key];
    const stage=(c && c.group && !c.bracket)?'group':'bracket';
    marcarSorteioVistoPorMim(mark); queueDrawShow(key, stage); n++;
  });
  return n;
}
function cupTickMatchesRound(key, round){ return WORLD_RULES.cupTickMatchesRound((typeof S!=='undefined'&&S)?S.cupCalendar:null, key, round); }
/* a cada 3 rodadas de liga, avança a rodada pendente de cada copa ativa (uma competição
   por rodada, ver CUP_TICK_OFFSET) — roda inteiramente em segundo plano (quick-sim), sem
   bloquear o usuário */
/* ===== FASE 3 — EU AINDA DEVO ESTA COMPETICAO HOJE? =====
   Uma competicao esta por cumprir quando eu tenho partida nela nesta jornada, ou quando ha
   rodada dela a decorrer e eu nao entro em campo (nao disputo, fui eliminado, ou peguei bye)
   — e, nos dois casos, eu ainda nao a joguei nem assisti. E a pergunta que a tela usa para
   dizer o que falta hoje e para o botao nunca passar por cima de um jogo.

   NAO SERVE PARA TRAVAR O AVANCO EM SEGUNDO PLANO. Tentei: advancePendingCups adiava a
   competicao que eu ainda devia. Medido, a temporada nunca fechava — a resposta depende de
   marcadores do cliente (cupDayDone, myCupTurnDone) e basta um deles nao chegar para a
   competicao ser adiada para sempre. Quem garante a ordem e o clJogar, que poe as copas
   ANTES da liga; esta funcao so informa. */
function humanoDeveCompeticao(key){
  try{
    if(typeof CL==='undefined' || !CL || !CL.clubId) return false;
    if(typeof cupDayDone==='function' && cupDayDone(key)) return false;   // ja joguei ou ja assisti hoje
    if(typeof pendingUserCupMatches==='function' && pendingUserCupMatches().some(p=>p.key===key)) return true;
    if(typeof cupRoundsUserSitsOut==='function' && cupRoundsUserSitsOut().some(c=>c.key===key)) return true;
    return false;
  }catch(e){ return false; }
}
/* ===== UMA RODADA DE COPA NUNCA DEVE SER RESOLVIDA SEM TER SIDO VISTA =====
   Regra do jogo (18/08/2026): o espectador segue sempre o calendário e mostra as partidas ao
   vivo, o usuário participe da competição ou não. Quando uma rodada é resolvida aqui, em segundo
   plano, sem que a competição tenha sido cumprida por quem está jogando, essa regra foi quebrada
   — e o defeito era invisível: a competição simplesmente aparecia decidida mais tarde, e o
   jogador só dava pela falta em dezembro, quando a final "não aconteceu".

   Isto não trava nada (travar transforma defeito em jogo que não abre — ver
   prorrogarPorCopasPendentes). Só torna a falha VISÍVEL: no console, com nome e jornada, e uma
   vez por temporada nos relatórios. É a rede que substitui o condutor automático de teste, que
   se mostrou pouco fiável — ele força telas e chega a conclusões erradas. Aqui quem observa é o
   jogo a correr de verdade. */
function avisarCopaNaoAssistida(key){
  try{
    if(typeof myCupTurnDone==='function' && myCupTurnDone(key)) return;   // foi cumprida: tudo certo
    if(typeof cupRoundFixtures==='function' && !cupRoundFixtures(key,
        (S.cups[key] && S.cups[key].group && !S.cups[key].group.finished) ? 'group' : 'bracket').length) return; // nada para ver
    const nome=(typeof COMP_DEFS!=='undefined' && COMP_DEFS[key] && COMP_DEFS[key].short) || key;
    console.warn('espectador: rodada da '+nome+' resolvida em segundo plano sem ter sido assistida (jornada '+S.round+')');
    S._copaNaoAssistida=S._copaNaoAssistida||{};
    const marca=key+':'+(S.season||1);
    if(!S._copaNaoAssistida[marca]){
      S._copaNaoAssistida[marca]=S.round;
      S.roundNews=S.roundNews||[];
      S.roundNews.push('⚠️ Uma rodada da '+nome+' foi resolvida sem você assistir.');
    }
  }catch(e){}
}
function advancePendingCups(){
  if(!S.cups) return;
  // a copa cuja rodada JÁ foi resolvida na quarta (o usuário jogou ao vivo e resolveCupRoundRest
  // fechou o resto dos confrontos na hora) não avança de novo aqui no sábado
  const jaResolvida=k=>WORLD_RULES.cupAlreadyResolved(S._cupResolvedRound, k, S.round);   // folha única
  const nacKey=copaNacionalDoUniverso();
  if(nacKey && cupTickMatchesRound(nacKey,S.round) && cupDrawReleased(nacKey) && !jaResolvida(nacKey)){
    const cb=S.cups[nacKey];
    if(cb && !cupIsFinished(cb) && cb.ties.length){
      avisarCopaNaoAssistida(nacKey);
      advanceCupBracket(cb, nacKey+'-r'+cb.round, nacKey);
    }
  }
  groupCupKeys().forEach(key=>{
    if(!cupTickMatchesRound(key,S.round)) return;
    if(!cupDrawReleased(key)) return;   // nenhuma partida antes do sorteio daquela competição
    if(jaResolvida(key)) return;
    const c=S.cups[key]; if(!c) return;
    if(c.group && !c.bracket){
      if(!c.group.finished){ avisarCopaNaoAssistida(key); advanceGroupStageRound(c.group, key+'-grupo-r'+c.group.round, key); }
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
      avisarCopaNaoAssistida(key);
      advanceCupBracket(c.bracket, key+'-r'+c.bracket.round, key);
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
    if(!S.squads[id]){ const c=S.clubPool[id]||byId[id]; if(c) S.squads[id]=gkSquad(c).map(p=>attachAttrs(initStats({...p}),'A')); } // clubes de topo (intlTopDivisionClubs) -> banda A
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
/* ============ COPAS CONTINENTAIS CONMEBOL (Libertadores/Sul-Americana) ============
   Espelha initIntlCups, sourced dos 9 países de window.CONMEBOL_LEAGUES. Vagas por país
   (Argentina/Colômbia levam mais), 32 clubes por copa; o clube do usuário entra pela
   classificação doméstica (1º-2º -> Libertadores; 3º-6º -> Sul-Americana). */
function conmebolTopDivisionClubs(){
  const src=(typeof window!=='undefined'&&window.CONMEBOL_LEAGUES)||{};
  const out=[]; Object.keys(src).forEach(co=>src[co].forEach(c=>out.push(c)));
  return out;
}
/* ===== CLASSIFICAÇÃO CONTINENTAL UNIFICADA (Brasil + 9 CONMEBOL) =====
   Usada tanto no universo Brasil (temporadas 2+) quanto nos universos CONMEBOL, pra a
   Libertadores/Sul-Americana SEMPRE reunirem clubes reais de TODOS os países sul-americanos
   (não só o do usuário). Vagas por país ~ realidade (Brasil/Argentina levam mais); 32 por copa.
   Clubes brasileiros vêm de DATA.clubsSerieA (real), os demais de window.CONMEBOL_LEAGUES. */
const LIB_SLOTS_UNI={ 'Brasil':6,'Argentina':6,'Colômbia':4,'Chile':3,'Uruguai':3,'Peru':3,'Equador':2,'Paraguai':2,'Venezuela':2,'Bolívia':1 };
const SUL_SLOTS_UNI={ 'Brasil':6,'Argentina':5,'Colômbia':4,'Chile':3,'Uruguai':3,'Peru':3,'Equador':2,'Paraguai':2,'Venezuela':2,'Bolívia':2 };
/* Pool de classificados por país: quem ocupa as vagas continentais da próxima temporada.
   ANTES o Brasil saía de DATA.clubsSerieA ORDENADO POR FORÇA (overall) — uma lista congelada no
   boot (public/index.html) que nunca acompanha acesso/rebaixamento. Consequência: as vagas eram
   decididas por elenco, não por campanha. Um clube que o usuário rebaixou continuava ocupando
   vaga de Libertadores; o campeão da temporada, se tivesse overall baixo, ficava de fora — e as
   tags "Lib"/"Sul" do ranking (qualificationZone, main.js) viravam ficção pros outros 19 clubes.
   Agora vale a CLASSIFICAÇÃO REAL da divisão de topo da temporada que fechou
   (S._topFinalStandings, carimbada em newSeasonReset antes do swap de divisões).
   O fallback por overall só sobra pra 1ª temporada, quando ainda não existe tabela nenhuma. */
function topDivisionStandingsIds(){
  const ids=(S && S._topFinalStandings) || [];
  return ids.length ? ids.slice() : null;
}
function unifiedContinentalPool(){
  const pool={};
  /* `S._topFinalStandings` e a tabela final da divisao de topo DO UNIVERSO ATIVO —
     num save argentino ela e a Liga Profesional, nao o Brasileirao. Entregar
     essa lista ao Brasil punha clubes argentinos nas seis vagas brasileiras (e
     de novo nas argentinas, logo abaixo): o mesmo clube duas vezes na mesma
     copa, e o Brasil representado por quem nunca jogou o Brasileirao.
     A tabela real vale para o pais que o utilizador esta a jogar. Os outros
     seguem a liga de fundo, se existir, ou a ordem do bundle. */
  const primario=(typeof primaryCountry==='function')?primaryCountry():'Brasil';
  const realStandings=topDivisionStandingsIds();
  pool['Brasil'] = (primario==='Brasil' && realStandings)
    ? realStandings.map(id=>({id}))
    : ((typeof DATA!=='undefined'&&DATA.clubsSerieA)||[]).slice().sort((a,b)=>(b.overall||0)-(a.overall||0));
  const CLG=(typeof window!=='undefined'&&window.CONMEBOL_LEAGUES)||{};
  ['Argentina','Colômbia','Chile','Uruguai','Peru','Equador','Paraguai','Venezuela','Bolívia'].forEach(co=>{
    // o pais que o utilizador joga tem campanha de verdade: a vaga sai da tabela dele
    if(co===primario && realStandings){ pool[co]=realStandings.map(id=>({id})); return; }
    // país rodando como liga de fundo (o usuário o selecionou): a campanha dele existe de verdade,
    // então a vaga sai da tabela dele também. Sem liga de fundo não há campanha pra respeitar —
    // segue a ordem do bundle (dado real do Transfermarkt), como sempre foi.
    const cfg=(typeof UNI_CONFIGS!=='undefined') && UNI_CONFIGS[co];
    const topDiv=cfg && cfg.order && cfg.order[0];
    const bg = topDiv && (typeof bgStandings==='function') ? bgStandings(co, topDiv) : [];
    pool[co] = (bg && bg.length) ? bg.map(t=>({id:t.id})) : (CLG[co]||[]).slice();
  });
  return pool;
}
function unifiedContinentalQualification(userFinish){
  const pool=unifiedContinentalPool();
  /* o campeão da Libertadores que fechou defende a vaga no ano seguinte (regra do dono,
     20/08). O campeão da edição encerrada vive no arquivo permanente (ver archiveSeason). */
  const champLib=(()=>{ try{
    const arr=(S&&S.archive)||[]; const a=arr[arr.length-1];
    return (a&&a.cups&&a.cups.libertadores&&a.cups.libertadores.champion)||null;
  }catch(e){ return null; } })();
  let lib=[], sul=[];
  Object.keys(LIB_SLOTS_UNI).forEach(co=>{ const clubs=(pool[co]||[]).map(c=>c.id); const nl=LIB_SLOTS_UNI[co], ns=SUL_SLOTS_UNI[co]||2;
    let liberta=clubs.slice(0,nl), sula=clubs.slice(nl,nl+ns);
    /* no Brasil, o campeão da Libertadores (se for brasileiro) e o campeão e o vice da
       Copa do Brasil entram na frente das vagas de Libertadores (ver nationalCupFinalists)
       — a tabela completa as 6, e a Sul-Americana fica com os melhores que sobraram */
    if(co==='Brasil'){
      const prio=(champLib&&clubs.indexOf(champLib)>=0?[champLib]:[]).concat(nationalCupFinalists());
      if(prio.length){
        liberta=Array.from(new Set(prio.concat(clubs))).slice(0,nl);
        const naLib=new Set(liberta);
        sula=clubs.filter(id=>!naLib.has(id)).slice(0,ns);
      }
    }
    lib.push(...liberta); sul.push(...sula); });
  /* campeão de outro país: garante a vaga dele mesmo que a cota do país o deixasse de fora */
  if(champLib && lib.indexOf(champLib)<0) lib.unshift(champLib);
  const uid=S.clubId;
  if(uid){
    const already=lib.indexOf(uid)>=0?'lib':(sul.indexOf(uid)>=0?'sul':null);
    lib=lib.filter(id=>id!==uid); sul=sul.filter(id=>id!==uid);
    // vaga do PRÓPRIO clube usa a MESMA contagem de vagas por país que já vale pro resto do
    // pool (LIB_SLOTS_UNI/SUL_SLOTS_UNI, linhas acima) — antes era um corte fixo "1º-2º
    // Libertadores, 3º-6º Sul-Americana" copiado do padrão europeu Champions/Europa (4+2), que
    // pro Brasil (6 vagas de Libertadores) jogava o 3º-6º colocado pra Sul-Americana mesmo com
    // o troféu da tabela mostrando "Libertadores" pra eles (ver qualificationZone, main.js) —
    // exatamente a troca de competição que foi reportada.
    const country=(typeof primaryCountry==='function')?primaryCountry():'Brasil';
    const nl=LIB_SLOTS_UNI[country]||6, ns=SUL_SLOTS_UNI[country]||6;
    if(userFinish>=1 && userFinish<=nl) lib.unshift(uid);
    else if(userFinish>nl && userFinish<=nl+ns) sul.unshift(uid);
    else if(already==='lib') lib.unshift(uid);
    else if(already==='sul') sul.unshift(uid);
  }
  return { libertadores:lib.slice(0,32), sulamericana:sul.slice(0,32) };
}
/* materializa elenco dos clubes de copa (Brasil Série A + CONMEBOL) que não estão na liga do usuário */
function ensureContinentalCupClubs(ids){
  S.clubPool=S.clubPool||{}; S.squads=S.squads||{};
  const brById={}; ((typeof DATA!=='undefined'&&DATA.clubsSerieA)||[]).forEach(c=>brById[c.id]=c);
  const cmbById={}; conmebolTopDivisionClubs().forEach(c=>cmbById[c.id]=c);
  ids.forEach(id=>{
    const c=S.clubPool[id]||brById[id]||cmbById[id]; if(!c) return;
    // rotula o clube brasileiro como Brasil (senão clubCountry cai no universo ativo, ex.: Argentina)
    if(brById[id] && !c.country) c.country=CONMEBOL_COUNTRIES.BRA;
    if(!S.clubPool[id]) S.clubPool[id]=c;
    if(!S.squads[id]) S.squads[id]=gkSquad(c).map(p=>attachAttrs(initStats({...p}),'A'));
  });
}
function initConmebolCups(){
  /* EM 2026 VALEM OS GRUPOS REAIS, TAMBEM AQUI.
     Este ramo montava a fase de grupos sorteando o pool por vagas de pais, e
     ignorava LIBERTADORES_GROUPS_2026 / SULAMERICANA_GROUPS_2026 — que o ramo
     brasileiro usa. O efeito era o relatado: a jogar a Liga Profesional, os
     argentinos que estao MESMO na Libertadores de 2026 (Boca, Estudiantes,
     Platense, Lanus, Central, Independiente Rivadavia) so entravam no sorteio
     se calhassem no top-6 da ordem do bundle, e o utilizador ficava a assistir
     a uma copa em que o clube dele participa na vida real.
     Os grupos reais sao os mesmos nos dois universos — e sao uma lista de
     clubes por nome e pais, sem nada de brasileiro no meio que os torne
     exclusivos do Brasil. */
  const real=(S.season===2026 && typeof real2026Qualification==='function')?real2026Qualification():null;
  let qual, libGroups, sulGroups;
  if(real && real.libertadoresGroups){
    libGroups=makeGroupStage(real.libertadoresGroups, 2);
    sulGroups=makeGroupStage(real.sulamericanaGroups, 2);
    qual={ libertadores:Object.values(real.libertadoresGroups).flat(),
           sulamericana:Object.values(real.sulamericanaGroups).flat() };
    ensureContinentalCupClubs(qual.libertadores.concat(qual.sulamericana));
  }else{
    qual=unifiedContinentalQualification(S._intlUserFinish||0);
    ensureContinentalCupClubs(qual.libertadores.concat(qual.sulamericana));
    libGroups=makeGroupStage(splitIntoGroups(qual.libertadores, hashSeed(S.seed,'libgroups',S.season)), 2);
    sulGroups=makeGroupStage(splitIntoGroups(qual.sulamericana, hashSeed(S.seed,'sulgroups',S.season)), 2);
  }
  S.qualification={...qual};
  S.cups={ libertadores:{group:libGroups, bracket:null}, sulamericana:{group:sulGroups, bracket:null} };
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
  [(typeof window!=='undefined'&&window.INTL_LEAGUES)||{}, (typeof window!=='undefined'&&window.CONMEBOL_LEAGUES)||{}].forEach(src=>{
    Object.keys(src).forEach(country=>src[country].forEach(c=>{ INTL_CLUB_INDEX[c.id]=c; }));
  });
  return INTL_CLUB_INDEX;
}
function intlClubById(id){ return intlClubIndex()[id]||null; }
/* nome de país -> chave de universo (UNI_CONFIGS usa 'brasil' minúsculo; intl usa o próprio nome) */
function uniKeyOf(country){ return (country==='Brasil'||country==='brasil')?'brasil':country; }
/* clubes de uma divisão de um universo qualquer (sem depender do universo ATIVO).
   FASE 4: agora inclui o Brasil como liga de fundo (topo = Série A real; B/C/D = procedurais,
   os MESMOS clubes que o jogo primário geraria, por serem determinísticos pela seed). */
function bgClubsForDivision(country, divKey){
  const uniKey=uniKeyOf(country); const cfg=UNI_CONFIGS[uniKey]; if(!cfg) return [];
  if(uniKey==='brasil'){
    if(divKey===cfg.order[0]) return (DATA.clubsSerieA||DATA.clubs||[]).slice(0, cfg.size[divKey]||20);
    return proceduralDivisionClubs(divKey, cfg.size[divKey]||20);
  }
  const all=uniLeagueClubs(cfg);
  const lgCode=cfg.lg&&cfg.lg[divKey];
  const clubs=lgCode?all.filter(c=>c.lg===lgCode):all.slice();
  return clubs.slice(0, cfg.size[divKey]||clubs.length);
}
/* resolve um clube de liga de fundo por id: intl pelo índice real; Brasil pelo índice
   procedural/Série A (reconstruído sob demanda, determinístico pela seed — não infla o save). */
let BG_BRAZIL_INDEX=null, BG_BRAZIL_SEED=null;
function bgBrazilIndex(){
  const seed=(S&&S.seed)||1;
  if(BG_BRAZIL_INDEX && BG_BRAZIL_SEED===seed) return BG_BRAZIL_INDEX;
  const idx={}; const cfg=UNI_CONFIGS.brasil;
  cfg.order.forEach(d=>{ bgClubsForDivision('Brasil',d).forEach(c=>{ idx[c.id]=c; }); });
  BG_BRAZIL_INDEX=idx; BG_BRAZIL_SEED=seed; return idx;
}
function bgClubById(id){ const i=intlClubById(id); let c=i||bgBrazilIndex()[id]||null;
  // item 4: normaliza overall pra escala nova (mesma lógica de clubOf; intl/procedurais já vêm com _rbOv)
  if(c && !c._rbOv && typeof c.overall==='number'){ c.overall=REBAL.force(c.overall); c._rbOv=1; }
  return c; }
function initBgLeagues(){
  S.bgLeagues={};
  (S.bgCountries||[]).forEach(country=>{
    const cfg=UNI_CONFIGS[uniKeyOf(country)]; if(!cfg) return;
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
  const ho=(bgClubById(homeId)||{}).overall||70, ao=(bgClubById(awayId)||{}).overall||70;
  const hExp=Math.max(0.2, 1.35+(ho-ao)*0.05), aExp=Math.max(0.2, 1.05+(ao-ho)*0.05);
  const pois=(lam)=>{ const L=Math.exp(-lam); let k=0,p=1; do{ k++; p*=R.random(); }while(p>L); return k-1; };
  return { hg:Math.min(7,pois(hExp)), ag:Math.min(7,pois(aExp)) };
}
/* atribui N gols a jogadores do clube (ponderado por força, atacantes/meias primeiro) */
function bgAttributeGoals(L, clubId, n){
  if(n<=0) return;
  // usa o elenco materializado se já existe (reflete transferências); senão o dado real
  const squad=(S.squads&&S.squads[clubId]) || (bgClubById(clubId)||{}).squad;
  if(!squad||!squad.length) return;
  const cand=squad.filter(p=>p.s==='ATT'||p.s==='MID'); const pool=cand.length?cand:squad;
  for(let i=0;i<n;i++){
    let best=pool[0], bestW=-1;
    pool.forEach(p=>{ const w=(p.f||50)*(p.s==='ATT'?1.6:0.7)*Math.random(); if(w>bestW){bestW=w;best=p;} });
    if(best){ L.scorers[best.n]=(L.scorers[best.n]||0)+1; L.allTimeScorers[best.n]=(L.allTimeScorers[best.n]||0)+1; }
  }
}
/* avança UMA rodada de cada liga de background (chamado junto do avanço de rodada do usuário) */
function advanceBgLeagues(humanResults, roundIdx){
  if(!S.bgLeagues) return;
  humanResults=humanResults||{};
  const rIdx=(roundIdx==null)?S.round:roundIdx;
  Object.keys(S.bgLeagues).forEach(country=>{
    const L=S.bgLeagues[country];
    Object.keys(L.divs).forEach(divKey=>{
      const d=L.divs[divKey]; if(!d.sched.length) return;
      const fx=d.sched[rIdx % d.sched.length]||[];
      fx.forEach(pair=>{
        const hId=pair[0], aId=pair[1]; if(hId==null||aId==null) return;
        const T=d.table; if(!T[hId]||!T[aId]) return;
        // FASE 2: se um humano (hotseat) jogou esta partida ao vivo, usa o placar real dele (com artilheiros nomeados)
        const hr=humanResults[hId+'-'+aId];
        let hg,ag;
        if(hr){ hg=hr.hg; ag=hr.ag; }
        else { const r=bgQuickSim(hId,aId,hashSeed(S.seed,'bg',country,divKey,rIdx,hId,aId)); hg=r.hg; ag=r.ag; }
        T[hId].P++; T[aId].P++; T[hId].GF+=hg; T[hId].GA+=ag; T[aId].GF+=ag; T[aId].GA+=hg;
        if(hg>ag){T[hId].W++;T[aId].L++;T[hId].Pts+=3;}
        else if(hg<ag){T[aId].W++;T[hId].L++;T[aId].Pts+=3;}
        else {T[hId].D++;T[aId].D++;T[hId].Pts++;T[aId].Pts++;}
        if(hr){ // artilheiros reais da partida ao vivo (por nome), em vez da atribuição ponderada
          (hr.scorers||[]).forEach(s=>{ if(!s||!s.name) return; L.scorers[s.name]=(L.scorers[s.name]||0)+1; L.allTimeScorers[s.name]=(L.allTimeScorers[s.name]||0)+1; });
        } else { bgAttributeGoals(L,hId,hg); bgAttributeGoals(L,aId,ag); }
      });
    });
  });
}
/* standings ordenados de uma divisão de background */
function bgStandings(country, divKey){
  const L=S.bgLeagues&&S.bgLeagues[country]; if(!L||!L.divs[divKey]) return [];
  return Object.values(L.divs[divKey].table).sort((a,b)=>b.Pts-a.Pts||(b.GF-b.GA)-(a.GF-a.GA)||b.GF-a.GF||String(a.id).localeCompare(String(b.id)));
}
/* fim de temporada das ligas de background: registra campeão/histórico, promove-rebaixa entre
   divisões (mesma regra do universo daquele país) e zera as tabelas/artilheiros da temporada. */
function rollBgLeaguesSeason(){
  if(!S.bgLeagues) return;
  Object.keys(S.bgLeagues).forEach(country=>{
    const L=S.bgLeagues[country]; const cfg=UNI_CONFIGS[uniKeyOf(country)]; if(!cfg) return;
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
  if(isConmebolUniverse()){ initConmebolCups(); // universo sul-americano: Libertadores + Sul-Americana
    ensureCupCalendar(true);   // as cerimônias entram na fila na DATA de cada uma (ver queueDueCupDraws)
    return; }
  if(isIntlUniverse()){ initIntlCups(); // universo europeu: Champions + Europa
    ensureCupCalendar(true);   // as cerimônias entram na fila na DATA de cada uma (ver queueDueCupDraws)
    return; }
  compToggle = compToggle || (S.compToggle) || {libertadores:true, copaBrasil:true, sulamericana:true};
  const cbQual=copaBrasilQualification(); // sempre as 4 divisões, independente da divisão do usuário
  // temporadas 2+ (sem grupos reais 2026): materializa os clubes continentais REAIS (Brasil +
  // CONMEBOL) da classificação unificada, pra Libertadores/Sul-Americana reunirem todos os países.
  if(!qual.libertadoresGroups && ((qual.libertadores&&qual.libertadores.length)||(qual.sulamericana&&qual.sulamericana.length))){
    ensureContinentalCupClubs((qual.libertadores||[]).concat(qual.sulamericana||[]));
  }
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
  // SORTEIO ANTES DA PRIMEIRA PARTIDA, NA ORDEM DO CALENDÁRIO.
  // Antes só a Copa do Brasil era enfileirada aqui — e ela é justamente a ÚLTIMA a entrar em campo
  // (1ª partida na rodada 2, ver cupTickMatchesRound). Libertadores (rodada 0) e Sul-Americana
  // (rodada 1) jogavam primeiro e não tinham cerimônia nenhuma no início da temporada: no solo o
  // sorteio delas simplesmente nunca aparecia, e na Resenha ele só era enfileirado depois, por
  // queueSeasonCupDrawsIfNew (ui/main.js), na primeira adoção de estado — ou seja, DEPOIS de a
  // fase de grupos já ter começado. Era isso que produzia o absurdo de sortear uma competição
  // cuja rodada já tinha acontecido.
  // Os universos CONMEBOL e europeu (acima) sempre fizeram isso certo; só o brasileiro não fazia.
  // calendário da temporada nova primeiro: é dele que sai a data de sorteio de cada copa.
  // As cerimônias NÃO são mais enfileiradas todas aqui (era o que fazia o save abrir com dois
  // ou três sorteios seguidos) — cada uma entra na fila quando a data dela chega, dois dias
  // antes da estreia da competição. Ver cupSeasonDrawDays/queueDueCupDraws.
  ensureCupCalendar(true);
  /* `S._cupDrawQueued` deixou de existir: a marca de "já vi este sorteio" é de cada cliente, não
     do mundo (ver sorteioJaVistoPorMim). As marcas trazem a temporada na chave, então a virada
     não precisa de limpar nada. */
}
/* ORDEM DAS CERIMÔNIAS = ordem em que as competições ENTRAM EM CAMPO.
   As copas se revezam a cada 3 rodadas (CUP_TICK_OFFSET) e pendingUserCupMatches olha a rodada
   SEGUINTE, então a primeira partida de cada uma cai numa rodada diferente. Ordenar por ela faz a
   sequência de sorteios seguir o calendário — quem joga antes, sorteia antes — em vez de uma ordem
   fixa escrita à mão que não tinha relação com o calendário. */
function cupFirstPlayRound(key){
  const off=CUP_TICK_OFFSET[key]; if(off==null) return 99;
  for(let r=0;r<3;r++) if((r+1)%3===off) return r;
  return 99;
}
function cupDrawOrder(){
  return [['copaBrasil','bracket'],['libertadores','group'],['sulamericana','group'],
          ['championsLeague','group'],['europaLeague','group']]
    .sort((a,b)=>cupFirstPlayRound(a[0])-cupFirstPlayRound(b[0]));
}
/* partidas de copa do clube do usuário pendentes de jogar AO VIVO — só dispara na véspera
   do avanço em segundo plano (mesma cadência de advancePendingCups/playRound, ver linha
   "S.round%3===0"), pra o resultado ao vivo já estar escrito a tempo do avanço em segundo
   plano PULAR essa partida específica (ver o guard em advanceCupBracket, linha ~1841, e o
   novo guard em advanceGroupStageRound). Pode haver mais de uma no mesmo momento (ex: Copa
   do Brasil + Libertadores na mesma semana de avanço) — clJogar() enfileira todas antes de
   liberar o jogo de liga da rodada. */
/* MESMA PERGUNTA, PARA QUALQUER CLUBE: ele ainda deve uma partida de copa nesta semana?
   pendingUserCupMatches só sabia responder sobre o clube do próprio usuário (CL.clubId). A
   barreira do dia de copa (ver onlineCupDayPending, local-transport) precisa da resposta sobre os
   OUTROS humanos da sala — é o que permite segurar a rodada de liga até todo mundo ter cumprido a
   copa da semana, em vez de cada um entrar na liga na hora que terminar a sua. */
/* QUAIS competições este clube ainda deve nesta jornada — lista, não sim/não.
   A jornada pode ter MAIS DE UMA competição (no calendário oficial a 3ª tem Libertadores,
   Sul-Americana e Copa do Brasil), e a barreira do dia de copa precisa saber exatamente quais
   faltam — senão terminar a primeira parecia terminar todas. */
function cupsOwedThisWeek(clubId){
  if(!S.cups || !clubId) return [];
  const out=[];
  const cb=S.cups.copaBrasil;
  if(cupTickMatchesRound('copaBrasil',S.round) && cb && !cupIsFinished(cb)
     && (cb.ties||[]).some(t=>!t.winner && (t.h===clubId||t.a===clubId))) out.push('copaBrasil');
  groupCupKeys().forEach(key=>{
    if(!cupTickMatchesRound(key,S.round)) return;
    const c=S.cups[key]; if(!c) return;
    if(c.group && !c.bracket && !c.group.finished){
      const mg=c.group;
      Object.values(mg.groups).forEach(g=>{
        if(out.indexOf(key)>=0 || !g.teams.includes(clubId)) return;
        if(!(g.sched[mg.round]||[]).some(([h,a])=>h===clubId||a===clubId)) return;
        // este clube já jogou a rodada de grupo? a resposta sai de um dado DELE: o resultado gravado
        if((g.results||[]).some(r=>r && r.r===mg.round && (r.h===clubId||r.a===clubId))) return;
        out.push(key);
      });
    } else if(c.bracket && !cupIsFinished(c.bracket)){
      if((c.bracket.ties||[]).some(t=>!t.winner && (t.h===clubId||t.a===clubId))) out.push(key);
    }
  });
  return out;
}
function clubOwesCupThisWeek(clubId){ return cupsOwedThisWeek(clubId).length>0; }
function pendingUserCupMatches(){
  if(!S.cups || !CL.clubId) return [];
  const out=[];
  const cb=S.cups.copaBrasil;
  // UMA OBRIGAÇÃO POR COMPETIÇÃO POR JORNADA (myCupTurnDone): depois que eu jogo a minha partida,
  // resolveCupRoundRest avança a rodada da competição na hora — e sem este filtro a fixture da
  // RODADA SEGUINTE (que pertence a outra jornada) renascia como pendência da jornada atual. Era o
  // participante preso jogando rodadas de grupo em cadeia, com a quarta que nunca fechava.
  // nenhuma partida antes do sorteio da própria competição (ver cupSeasonDrawDays)
  if(cupTickMatchesRound('copaBrasil',S.round) && cupDrawReleased('copaBrasil') && cb && !cupIsFinished(cb) && !myCupTurnDone('copaBrasil')){
    const tie=(cb.ties||[]).find(t=>!t.winner && (t.h===CL.clubId||t.a===CL.clubId));
    if(tie) out.push({key:'copaBrasil', stage:'bracket', bracket:cb, tie, h:tie.h, a:tie.a});
  }
  groupCupKeys().forEach(key=>{
    if(!cupTickMatchesRound(key,S.round)) return;
    if(!cupDrawReleased(key)) return;
    if(myCupTurnDone(key)) return;
    const c=S.cups[key]; if(!c) return;
    if(c.group && !c.bracket && !c.group.finished){
      const mg=c.group;
      Object.values(mg.groups).forEach(g=>{
        if(!g.teams.includes(CL.clubId)) return;
        const fx=(g.sched[mg.round]||[]).find(([h,a])=>h===CL.clubId||a===CL.clubId);
        if(fx) out.push({key, stage:'group', group:mg, groupLabel:g.label, h:fx[0], a:fx[1]});
      });
    } else if(c.bracket && !cupIsFinished(c.bracket)){
      const tie=(c.bracket.ties||[]).find(t=>!t.winner && (t.h===CL.clubId||t.a===CL.clubId));
      if(tie) out.push({key, stage:'bracket', bracket:c.bracket, tie, h:tie.h, a:tie.a});
    }
  });
  // Resenha (online) — FASE 3C: confronto de copa contra outro humano agora É jogável ao vivo,
  // com a mesma mecânica de transmissão da liga (Fase 3B): o MANDANTE roda a única simulação e
  // transmite; o VISITANTE assiste ao mesmo jogo e decide os lances dele remotamente (pênalti,
  // lesão, expulsão, substituição e cobranças da disputa de pênaltis). A escolha de papel é do
  // buildLiveMatchObject (mandante presente -> visitante em streamRemote; ausente -> visitante
  // vira o autoritativo). Antes esses confrontos eram excluídos e resolvidos em segundo plano.
  return out;
}
/* RODADAS DE COPA DESTA JORNADA EM QUE O CLUBE DO USUÁRIO NÃO ENTRA EM CAMPO — porque não
   disputa a competição, porque já foi eliminado, ou porque pegou bye. O jogador passa por elas do
   mesmo jeito: vê a rodada ao vivo e depois a classificação, igual a quem joga (ver clJogar e
   queueRoundCupClassifs em main.js). Puramente de exibição — não escreve nada no estado, então
   vale nos dois modos; quem resolve de verdade continua sendo o avanço em segundo plano.
   NÃO HÁ MAIS FILTRO POR "TEM HUMANO VIVO NA COMPETIÇÃO". A regra é a rodada aparecer pra todo
   mundo, e o filtro fazia o oposto: bastava o último humano ser eliminado da Libertadores pra que
   a competição sumisse da tela de todos, cada um voltando a um fluxo diferente. */
function cupRoundsUserSitsOut(){
  if(!S.cups || !CL.clubId) return [];
  const out=[];
  const cb=S.cups.copaBrasil;
  if(cupTickMatchesRound('copaBrasil',S.round) && cb && !cupIsFinished(cb) && cb.ties.length && !cb.ties.some(t=>!t.winner&&(t.h===CL.clubId||t.a===CL.clubId)) && !myCupTurnDone('copaBrasil')){
    out.push({key:'copaBrasil', stage:'bracket'});
  }
  groupCupKeys().forEach(key=>{
    if(!cupTickMatchesRound(key,S.round)) return;
    if(myCupTurnDone(key)) return;   // já cumpri esta competição nesta jornada (joguei ou assisti)
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
const UNI_CONFIGS = window.UNIVERSOS;          // ver src/data/universos.js (compartilhado com o painel)
/* código ISO da bandeira de cada universo (UNI_CONFIGS só guarda o nome do país) */
const UNI_COUNTRY_FLAG = window.UNIVERSO_BANDEIRA;
/* CONMEBOL (Argentina, Uruguai, Colômbia, Chile, Peru, Equador, Paraguai, Venezuela, Bolívia): o
   bundle só traz o elenco real de cada clube, sem overall/OS/MS/DS — diferente do INTL_LEAGUES
   (Europa), que já vem com isso pronto. Sem essa conta, todo consumidor que lê `c.overall` direto
   (bgClubById, uniLeagueClubs, conmebolTopDivisionClubs, unifiedContinentalPool) via undefined,
   e o mercado de transferências mostrava "força 0" pro clube inteiro mesmo com o elenco real
   completo (jogadores com `.f` de verdade). Deriva do elenco — mesma fórmula de
   recomputeClubOverall — UMA VEZ, direto nos objetos do bundle (window.CONMEBOL_LEAGUES), aqui no
   topo do módulo: roda antes de qualquer código de jogo, então não importa qual função toca o
   clube primeiro, o valor já está certo (mesma referência de objeto em todo lugar). */
(function ensureConmebolClubOverall(){
  const src=(typeof window!=='undefined'&&window.CONMEBOL_LEAGUES)||{};
  Object.keys(src).forEach(country=>{
    (src[country]||[]).forEach(c=>{
      if(typeof c.overall==='number' || !c.squad || !c.squad.length) return;
      const sq=c.squad;
      const bySec=s=>sq.filter(p=>p.s===s);
      const avg=a=>a.length?a.reduce((s,p)=>s+(p.f||0),0)/a.length:55;
      c.OS=avg(bySec('ATT')); c.MS=avg(bySec('MID'));
      c.DS=avg(bySec('GK'))*0.35+avg(bySec('DEF'))*0.65;
      c.overall=Math.round(sq.reduce((s,p)=>s+(p.f||0),0)/sq.length);
    });
  });
})();
/* fonte de clubes de um universo: CONMEBOL (src:'conmebol') ou europeu (INTL_LEAGUES). Ambos
   são keyed por nome de país (cfg.country). */
function uniLeagueClubs(cfg){
  if(!cfg) return [];
  const src=(cfg.src==='conmebol') ? (typeof window!=='undefined'&&window.CONMEBOL_LEAGUES) : (typeof window!=='undefined'&&window.INTL_LEAGUES);
  return (src && src[cfg.country]) || [];
}
function isConmebolUniverse(){ const cfg=UNI_CONFIGS[ACTIVE_UNI]; return !!(cfg && cfg.src==='conmebol'); }
/* mapa reverso código-de-liga -> {universo, divisão}. Ex.: 'GER-1' -> {uni:'Alemanha',div:'DE'};
   'ENG-2' -> {uni:'Inglaterra',div:'CH'}. Construído sob demanda (memoizado) a partir de UNI_CONFIGS.lg. */
let _LG_TO_UNIDIV=null;
function lgToUniDiv(lg){
  if(!_LG_TO_UNIDIV){ _LG_TO_UNIDIV={};
    Object.keys(UNI_CONFIGS).forEach(uni=>{ const cfg=UNI_CONFIGS[uni];
      if(cfg.lg) Object.keys(cfg.lg).forEach(dk=>{ _LG_TO_UNIDIV[cfg.lg[dk]]={uni,div:dk}; }); });
  }
  return lg?(_LG_TO_UNIDIV[lg]||null):null;
}
/* chave do universo ATIVO (fonte única de verdade): o save guarda em S.intlUniverse
   (país ou false=Brasil); ACTIVE_UNI é o espelho em memória mantido por setUniverse. */
function activeUniverseKey(){
  if(typeof S!=='undefined' && S && S.intlUniverse) return S.intlUniverse;
  return (typeof ACTIVE_UNI!=='undefined' && ACTIVE_UNI) || 'brasil';
}
/* {flag,name} de um universo (mesmo formato de CONMEBOL_COUNTRIES, pra usar em qualquer lugar) */
function universeCountryInfo(key){
  const k=key||activeUniverseKey();
  if(!k || k==='brasil') return CONMEBOL_COUNTRIES.BRA;
  const cfg=UNI_CONFIGS[k];
  return { flag: flagImgIso(UNI_COUNTRY_FLAG[k]), name:(cfg&&cfg.country)||k };
}
/* rótulo da liga do clube (ex.: 'Bundesliga', 'La Liga') a partir do código lg — vazio se desconhecido */
function clubLeagueLabel(c){
  const m=(c&&c.lg)?lgToUniDiv(c.lg):null;
  return m?((UNI_CONFIGS[m.uni].label||{})[m.div]||''):'';
}
/* divisão REAL de um clube, pelo registro persistente (S.divisionClubs), não a de quem está
   jogando. Sem isto a tela de outro clube rotulava tudo com a divisão do usuário — um save na
   Série D mostrava "Corinthians · Série D". Devolve null quando o clube não está em nenhuma
   divisão do universo ativo (clube estrangeiro de copa, liga de fundo). */
function clubDivisionOf(clubId){
  if(!clubId || !S || !S.divisionClubs) return null;
  for(const d in S.divisionClubs){ if((S.divisionClubs[d]||[]).indexOf(clubId)>=0) return d; }
  return null;
}
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
  // bgClubById (não intlClubById) pra cobrir também o BRASIL como liga de background — os
  // clubes brasileiros ficam no bgBrazilIndex, fora do índice intl (por isso "sem jogadores"
  // ao buscar brasileiros jogando num universo europeu).
  const club=bgClubById(clubId); if(!club||!club.squad) return false;
  S.clubPool=S.clubPool||{}; S.clubPool[clubId]=club;
  // divisão do clube na liga de background -> remapeia a força na faixa certa (item 4)
  let dv=null; const bg=S.bgLeagues||{};
  for(const co in bg){ for(const d in bg[co].divs){ if((bg[co].divs[d].clubIds||[]).indexOf(clubId)>=0){ dv=d; break; } } if(dv) break; }
  S.squads[clubId]=gkSquad(club).map(p=>attachAttrs(initStats({...p}), dv||undefined));
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
  /* FAIXA DE FORÇA E CAP TAMBÉM MUDAM DE PAÍS. Ficavam de fora, escritas em A/B/C/D, e num save
     internacional a busca por 'PL' falhava e caía na faixa da Série D. Saem da mesma folha que o
     servidor lê (engine/world-config.js), indexadas pelo NÍVEL na pirâmide. */
  if(typeof WORLD_CONFIG!=='undefined' && WORLD_CONFIG.tabelasDoUniverso){
    const t=WORLD_CONFIG.tabelasDoUniverso(ACTIVE_UNI);
    DIVISION_FORCE_RANGE=t.forca; DIV_FORCE_CAP=t.cap;
  }
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
/* nomes brasileiros reais pra jogadores procedurais/regens (antes eram "Oeste A", "Leste B"...
   — cidade+letra, que ficava horrível). nome + sobrenome; em colisão, acrescenta 2º sobrenome. */
/* As listas de nomes vivem em engine/world-config.js — a folha que o servidor também lê. Eram
   idênticas nos dois lados (conferidas antes de mover), então nada muda para quem já joga; o que
   deixa de existir é a segunda cópia. Lidas em tempo de chamada, com fallback mínimo para o caso
   de a folha não ter carregado. */
function _poolNomes(uniKey){
  if(typeof WORLD_CONFIG!=='undefined' && WORLD_CONFIG.nomesDoPais) return WORLD_CONFIG.nomesDoPais(uniKey||'brasil');
  return { first:['Gabriel','Lucas','Matheus'], last:['Silva','Santos','Oliveira'] };
}
function pickProcPlayerName(R){
  let nm, tries=0;
  do{
    const P=_poolNomes(activeUniverseKey());
    const fn=P.first[Math.floor(R.random()*P.first.length)];
    const ln=P.last[Math.floor(R.random()*P.last.length)];
    const ln2 = tries<1 ? '' : ' '+P.last[Math.floor(R.random()*P.last.length)]; // colisão -> 2º sobrenome
    nm = fn+' '+ln+ln2;
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
/* FAIXA DE FORÇA POR DIVISÃO. Deixou de ser constante brasileira: `setUniverse()` remonta esta
   tabela e a de cap a partir de engine/world-config.js, com as LETRAS do país ativo. Antes disto,
   num save internacional `DIVISION_FORCE_RANGE['PL']` era undefined e caía no `||...D` logo
   abaixo — um jogador criado na Premier League nascia com a faixa de força da Série D. Os valores
   do Brasil são exatamente os que estavam escritos aqui. */
let DIVISION_FORCE_RANGE={A:[58,88],B:[58,80],C:[52,74],D:[48,68]};
/* teto de força (escala NOVA) por divisão pra jogadores GERADOS (procedurais/regens): a faixa
   de força-bruta remapeia acima da categoria no topo, então travamos no teto da divisão pra
   não nascer "craque" na Série D. Só divisões inferiores brasileiras — A e ligas intl não têm
   teto (podem ter estrelas reais). */
let DIV_FORCE_CAP={B:37,C:24,D:12};
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
/* ---- MÍNIMO DE JOGADORES POR POSIÇÃO ----
   Os dados reais das Séries C/D vêm curtos (D tem média 1,5 goleiro; vários clubes com 1 só;
   e o elenco todo é pequeno). Se falta jogador numa posição, o time joga desfalcado — no gol
   é o pior caso (autoXI/pickXIByFormation nunca põem um 2º GK na linha e só a aposentadoria
   repõe, não a lesão). Aqui garantimos um mínimo POR POSIÇÃO em TODO clube (decisão do usuário:
   3 GK · 6 DEF · 6 MID · 4 ATT = 19), completando com jovens da base quando faltar.
   Opera nos DADOS BRUTOS do clube (club.squad), UMA vez por clube (flag _posTopped), ANTES da
   materialização — como todos os ~10 pontos que montam S.squads leem club.squad do mesmo objeto,
   todos herdam o reforço, e o regen de aposentadoria repõe a MESMA posição 1-por-1 (então os
   mínimos se mantêm nas temporadas seguintes). */
const MIN_POS={ GK:3, DEF:6, MID:6, ATT:4 };
const POS_LABEL={ GK:'GOL', DEF:'ZAG', MID:'MEI', ATT:'ATA' };
function makeRawPlayer(division, pos, clubKey, idx){
  const R=makeRng(hashSeed('pos-topup', String(clubKey||'x'), pos, idx));
  /* A FAIXA NUNCA PODE SAIR UNDEFINED. setUniverse reescreve DIVISION_FORCE_RANGE com as chaves
     do pais novo ({PL,CH}); um clube com _div do Brasil ('D') materializado depois da troca caia
     fora da tabela E do fallback .D — e rollAgedForce explodia NO MEIO da troca de pais, deixando
     o save com rotulo da Premier e mundo do Brasil (o relatado a 20/08). Piso duro no fim. */
  const range=DIVISION_FORCE_RANGE[division]||DIVISION_FORCE_RANGE.D||[48,68];
  const age=Math.round(19+R.random()*5);                         // reserva jovem, 19-24
  const rawF=rollAgedForce(R,range,age); const f=Math.min(REBAL.force(rawF,division), DIV_FORCE_CAP[division]||99);
  const lg=(typeof MARKET!=='undefined' && MARKET.divisionToLeague)?MARKET.divisionToLeague(division):('BRA-'+division);
  return { n:pickProcPlayerName(R), p:POS_LABEL[pos]||pos, s:pos, f, rawF, _rb:1, _div:division, age, lg,
    mv:REBAL.value(f,age), ft:R.random()<0.5?'R':'L', num:String(30+idx), nat:'Brasil', ag:'—', moral:70, energy:100 };
}
function ensureClubPositions(club){
  if(!club || club._posTopped) return;
  club._posTopped=true;
  const sq=club.squad||(club.squad=[]);
  const div=(sq.find(p=>p&&p._div)||{})._div || 'D';           // infere a divisão pelos jogadores reais do clube
  let idx=0;
  ['GK','DEF','MID','ATT'].forEach(pos=>{
    let n=sq.filter(p=>p&&p.s===pos).length;
    while(n<MIN_POS[pos]){ sq.push(makeRawPlayer(div, pos, club.id||club.short, idx++)); n++; }
  });
}
/* usado no lugar de `club.squad` nos pontos de materialização — garante os mínimos por posição antes de mapear */
function gkSquad(club){ ensureClubPositions(club); return club.squad; }
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
    const posPlan=[['GK',MIN_POS.GK],['DEF',MIN_POS.DEF],['MID',MIN_POS.MID],['ATT',MIN_POS.ATT]]; // mínimos por posição
    posPlan.forEach(([pos,cnt])=>{ for(let k=0;k<cnt;k++){
      const age=Math.round(18+R.random()*17);
      const rawF=rollAgedForce(R,range,age); const f=Math.min(REBAL.force(rawF,division), DIV_FORCE_CAP[division]||99); // item 4 + trava de cap por divisão
      const lg=MARKET.divisionToLeague(division);
      squad.push({n:pickProcPlayerName(R),
        p:pos,s:pos,f,rawF,_rb:1,_div:division,age,lg,mv:REBAL.value(f,age),ft:R.random()<0.8?'R':'L',
        num:String(Math.floor(R.random()*40)+1),nat:'Brasil',ag:'—',moral:70,energy:100}); } });
    const overall=Math.round(squad.reduce((s,p)=>s+p.f,0)/squad.length);
    clubs.push({id,tk:id,name,short:real?real.short:name.split(' ')[0].slice(0,12),
      color:real?real.color:'#'+Math.floor(R.random()*16777215).toString(16).padStart(6,'0'),
      color2:real?real.color2:null,
      crest:null,OS:overall,MS:overall,DS:overall,overall,_rbOv:1,squad});
  }
  return clubs;
}
/* ================= 2ªS DIVISÕES EUROPEIAS (Série B por país) =================
   Mesma abordagem das Séries B/C/D do Brasil: nomes/cores OFICIAIS dos clubes reais,
   com elencos gerados proceduralmente (não temos dado de jogador dessas divisões).
   A 1ª divisão de cada país continua 100% real (Transfermarkt). Cada país europeu passa
   a ter 2 divisões (A + B), padronizando com o Brasil e dando pra onde subir/cair. */
const INTL_LOWER_DIVISION_CLUBS={
  Espanha:{ ES2:[
    {name:'Real Zaragoza',short:'Zaragoza',color:'#0067B1',color2:'#FFFFFF'},
    {name:'Sporting Gijón',short:'Sporting Gijón',color:'#E30613',color2:'#FFFFFF'},
    {name:'Deportivo La Coruña',short:'Deportivo',color:'#009FE3',color2:'#FFFFFF'},
    {name:'Racing Santander',short:'Racing',color:'#00843D',color2:'#FFFFFF'},
    {name:'Almería',short:'Almería',color:'#EE2523',color2:'#FFFFFF'},
    {name:'Granada',short:'Granada',color:'#C4122E',color2:'#FFFFFF'},
    {name:'Cádiz',short:'Cádiz',color:'#FFE500',color2:'#0067B1'},
    {name:'Eibar',short:'Eibar',color:'#0761AF',color2:'#E30613'},
    {name:'Málaga',short:'Málaga',color:'#003DA5',color2:'#FFFFFF'},
    {name:'Real Oviedo',short:'Oviedo',color:'#004B9B',color2:'#FFFFFF'},
    {name:'SD Huesca',short:'Huesca',color:'#0067B1',color2:'#E30613'},
    {name:'Mirandés',short:'Mirandés',color:'#E30613',color2:'#000000'},
    {name:'Burgos CF',short:'Burgos',color:'#0A2A66',color2:'#FFFFFF'},
    {name:'Albacete',short:'Albacete',color:'#FFFFFF',color2:'#0067B1'},
    {name:'Racing Ferrol',short:'Racing Ferrol',color:'#00843D',color2:'#FFFFFF'},
    {name:'CD Tenerife',short:'Tenerife',color:'#004B9B',color2:'#FFFFFF'},
    {name:'Córdoba',short:'Córdoba',color:'#00843D',color2:'#FFFFFF'},
    {name:'CD Castellón',short:'Castellón',color:'#000000',color2:'#F58220'},
    {name:'FC Cartagena',short:'Cartagena',color:'#000000',color2:'#FFFFFF'},
    {name:'CD Eldense',short:'Eldense',color:'#0067B1',color2:'#FFFFFF'},
  ]},
  'Itália':{ IT2:[
    {name:'Sampdoria',short:'Sampdoria',color:'#1B5497',color2:'#FFFFFF'},
    {name:'Palermo',short:'Palermo',color:'#F19FBD',color2:'#000000'},
    {name:'Bari',short:'Bari',color:'#C8102E',color2:'#FFFFFF'},
    {name:'Cremonese',short:'Cremonese',color:'#A6192E',color2:'#808080'},
    {name:'Spezia',short:'Spezia',color:'#FFFFFF',color2:'#000000'},
    {name:'Cesena',short:'Cesena',color:'#FFFFFF',color2:'#000000'},
    {name:'Modena',short:'Modena',color:'#FFD100',color2:'#003DA5'},
    {name:'Reggiana',short:'Reggiana',color:'#E30613',color2:'#FFFFFF'},
    {name:'Brescia',short:'Brescia',color:'#004B87',color2:'#FFFFFF'},
    {name:'Cosenza',short:'Cosenza',color:'#E30613',color2:'#003DA5'},
    {name:'Frosinone',short:'Frosinone',color:'#FFCB05',color2:'#003DA5'},
    {name:'Catanzaro',short:'Catanzaro',color:'#FFCB05',color2:'#E30613'},
    {name:'Südtirol',short:'Südtirol',color:'#FFFFFF',color2:'#E30613'},
    {name:'Pisa',short:'Pisa',color:'#000000',color2:'#003DA5'},
    {name:'Salernitana',short:'Salernitana',color:'#6E1E32',color2:'#FFFFFF'},
    {name:'Juve Stabia',short:'Juve Stabia',color:'#FFD100',color2:'#003DA5'},
    {name:'Carrarese',short:'Carrarese',color:'#FFD100',color2:'#003DA5'},
    {name:'Mantova',short:'Mantova',color:'#E30613',color2:'#FFFFFF'},
    {name:'Cittadella',short:'Cittadella',color:'#6E1E32',color2:'#FFFFFF'},
    {name:'Sassuolo',short:'Sassuolo',color:'#00A752',color2:'#000000'},
  ]},
  Alemanha:{ DE2:[
    {name:'Schalke 04',short:'Schalke 04',color:'#004D9D',color2:'#FFFFFF'},
    {name:'Hamburger SV',short:'Hamburger SV',color:'#003087',color2:'#FFFFFF'},
    {name:'Hertha BSC',short:'Hertha BSC',color:'#005CA9',color2:'#FFFFFF'},
    {name:'Fortuna Düsseldorf',short:'Düsseldorf',color:'#E2001A',color2:'#FFFFFF'},
    {name:'Hannover 96',short:'Hannover 96',color:'#E30613',color2:'#000000'},
    {name:'Kaiserslautern',short:'Kaiserslautern',color:'#E1000F',color2:'#FFFFFF'},
    {name:'1. FC Nürnberg',short:'Nürnberg',color:'#AD1732',color2:'#FFFFFF'},
    {name:'Karlsruher SC',short:'Karlsruher SC',color:'#0055A5',color2:'#FFFFFF'},
    {name:'SC Paderborn',short:'Paderborn',color:'#0055A5',color2:'#000000'},
    {name:'1. FC Magdeburg',short:'Magdeburg',color:'#164193',color2:'#FFFFFF'},
    {name:'Eintracht Braunschweig',short:'Braunschweig',color:'#F7B500',color2:'#003DA5'},
    {name:'Greuther Fürth',short:'Greuther Fürth',color:'#009E3D',color2:'#FFFFFF'},
    {name:'Darmstadt 98',short:'Darmstadt',color:'#005CA9',color2:'#FFFFFF'},
    {name:'SV Elversberg',short:'Elversberg',color:'#000000',color2:'#E2001A'},
    {name:'Preußen Münster',short:'Münster',color:'#007A33',color2:'#FFFFFF'},
    {name:'SSV Ulm',short:'Ulm',color:'#FFFFFF',color2:'#000000'},
    {name:'Jahn Regensburg',short:'Regensburg',color:'#E2001A',color2:'#FFFFFF'},
    {name:'Holstein Kiel',short:'Holstein Kiel',color:'#0057B8',color2:'#E2001A'},
    {name:'VfL Bochum',short:'Bochum',color:'#005CA9',color2:'#FFFFFF'},
    {name:'1. FC Köln',short:'Köln',color:'#ED1C24',color2:'#FFFFFF'},
  ]},
  Portugal:{ PT2:[
    {name:'GD Chaves',short:'Chaves',color:'#003DA5',color2:'#E2001A'},
    {name:'CD Feirense',short:'Feirense',color:'#003DA5',color2:'#FFFFFF'},
    {name:'CD Tondela',short:'Tondela',color:'#FFD200',color2:'#00843D'},
    {name:'CS Marítimo',short:'Marítimo',color:'#007A33',color2:'#E2001A'},
    {name:'FC Penafiel',short:'Penafiel',color:'#E2001A',color2:'#FFFFFF'},
    {name:'Leixões SC',short:'Leixões',color:'#E2001A',color2:'#FFFFFF'},
    {name:'Académico de Viseu',short:'Ac. Viseu',color:'#00843D',color2:'#FFFFFF'},
    {name:'UD Oliveirense',short:'Oliveirense',color:'#003DA5',color2:'#FFFFFF'},
    {name:'FC Vizela',short:'Vizela',color:'#00843D',color2:'#FFFFFF'},
    {name:'Portimonense',short:'Portimonense',color:'#000000',color2:'#FFFFFF'},
    {name:'Paços de Ferreira',short:'Paços',color:'#FFD200',color2:'#00843D'},
    {name:'União de Leiria',short:'U. Leiria',color:'#003DA5',color2:'#E2001A'},
    {name:'SC Mafra',short:'Mafra',color:'#00843D',color2:'#FFFFFF'},
    {name:'Torreense',short:'Torreense',color:'#000000',color2:'#00843D'},
    {name:'Benfica B',short:'Benfica B',color:'#E30613',color2:'#FFFFFF'},
    {name:'FC Porto B',short:'Porto B',color:'#003DA5',color2:'#FFFFFF'},
    {name:'Sporting CP B',short:'Sporting B',color:'#007A33',color2:'#FFFFFF'},
    {name:'CD Nacional',short:'Nacional',color:'#000000',color2:'#FFFFFF'},
    {name:'SC Farense',short:'Farense',color:'#FFFFFF',color2:'#000000'},
    {name:'AVS',short:'AVS',color:'#E2001A',color2:'#000000'},
  ]},
};
/* faixa de força por 2ª divisão europeia (equilibrada com o MVL/ovrCommon de market-engine) */
const INTL_LOWER_FORCE_RANGE={ 'ESP-2':[60,74], 'GER-2':[59,73], 'ITA-2':[59,73], 'POR-2':[54,68] };
/* nomes de jogador por país (primeiro + sobrenome) — só pra os elencos procedurais das 2ªs
   divisões parecerem locais (não "Norte A" à brasileira). Únicos no jogo todo via PROC_USED_NAMES. */
/* INTL_NAME_POOL mudou-se para engine/world-config.js (NAME_POOLS), junto com o do Brasil e com
   o da Inglaterra, que não existia. `intlPlayerName` lê de lá. */
function intlPlayerName(R, country){
  const W=(typeof WORLD_CONFIG!=='undefined') && WORLD_CONFIG.NAME_POOLS;
  const pool=W ? W[country] : null; if(!pool) return pickProcPlayerName(R);
  let nm, tries=0;
  do{ const f=pool.first[Math.floor(R.random()*pool.first.length)];
      const l=pool.last[Math.floor(R.random()*pool.last.length)];
      nm=f+' '+l+(tries>=40?(' '+(Math.floor(tries/40)+1)):''); tries++;
  }while(PROC_USED_NAMES.has(nm) && tries<400);
  PROC_USED_NAMES.add(nm); return nm;
}
/* normaliza nome de clube pra casar real (scrape TM) x curado (ex.: '1.FC Kaiserslautern'
   x 'Kaiserslautern', 'SL Benfica B' x 'Benfica B') — tira acentos, tokens de futebol e
   pontuação, e compara só o núcleo. Usado no dedup do padding das 2ªs divisões. */
function normClubName(s){
  return String(s||'').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z ]+/g,' ')  // tira dígitos e pontuação (ex.: "1.FC", "Schalke 04")
    .replace(/\b(fc|cf|sc|ac|as|ss|ssc|ssd|sg|cd|ud|rc|sd|sad|us|usd|uc|lr|ad|afc|calcio|futebol|sport|club|bsc|vfb|vfl|tsg|sv|spvgg|gd|cs|sl|ec|de|do|da)\b/g,'')
    .replace(/[^a-z]/g,'');
}
/* gera os clubes de uma 2ª divisão europeia (nomes reais + elencos procedurais locais), já
   marcados com o código de liga (ex.: 'GER-2') e a nacionalidade doméstica do país. */
function intlLowerDivisionClubs(country, divKey, lgCode, n, nat){
  const roster=(INTL_LOWER_DIVISION_CLUBS[country]||{})[divKey]||[];
  const range=INTL_LOWER_FORCE_RANGE[lgCode]||[56,72];
  const R=makeRng(hashSeed('intldiv',country,divKey,(S&&S.seed)||1));
  const clubs=[];
  const size=n||roster.length||20;
  for(let i=0;i<size;i++){
    const real=roster[i%roster.length]||{name:country+' B '+(i+1)};
    const id='intl_'+lgCode+'_'+i;
    const squad=[];
    [['GK',2],['DEF',6],['MID',6],['ATT',4]].forEach(([pos,cnt])=>{ for(let k=0;k<cnt;k++){
      const age=Math.round(18+R.random()*17);
      const rawF=rollAgedForce(R,range,age); const f=REBAL.force(rawF, /-2$/.test(lgCode)?'B':'A'); // item 4: remap por tier da liga
      squad.push({ n:intlPlayerName(R,country), p:pos, s:pos, f, rawF, _rb:1, _div:(/-2$/.test(lgCode)?'B':'A'), age, lg:lgCode,
        mv:REBAL.value(f,age), ft:R.random()<0.8?'R':'L',
        num:String(Math.floor(R.random()*40)+1), nat:(nat&&nat[0])||country, ag:'—', moral:70, energy:100 }); } });
    const overall=Math.round(squad.reduce((s,p)=>s+p.f,0)/squad.length);
    clubs.push({ id, tk:id, name:real.name, short:real.short||real.name, color:real.color||'#888888',
      color2:real.color2||null, crest:null, lg:lgCode, OS:overall, MS:overall, DS:overall, overall, _rbOv:1, squad });
  }
  return clubs;
}
/* normaliza uma linha vinda de elifoot_v3.division_clubs (dados reais) pro formato DATA.clubs */
/* divisão intl (chave do universo) -> código de liga (lg). Reverso do cfg.lg de UNI_CONFIGS.
   Usado pra reconstruir clubes europeus vindos do Supabase IGUAIS aos do bundle (id/lg). */
const INTL_DIV_LG={ PL:'ENG-1',CH:'ENG-2',ES:'ESP-1',ES2:'ESP-2',IT:'ITA-1',IT2:'ITA-2',DE:'GER-1',DE2:'GER-2',PT:'POR-1',PT2:'POR-2' };
function normalizeDivisionClubRow(row){
  const sq=row.squad||[];
  const bySec=s=>sq.filter(p=>p.s===s);
  const avg=a=>a.length?a.reduce((s,p)=>s+p.f,0)/a.length:55;
  const base={ tk:row.club_id, name:row.name, short:row.short,
    color:row.color||'#888888', color2:row.color2||null, crest:row.crest||null,
    OS:avg(bySec('ATT')), MS:avg(bySec('MID')), DS:(avg(bySec('GK'))*0.35+avg(bySec('DEF'))*0.65),
    overall:row.overall||55, squad:sq.map(p=>({...p})) };
  const intlLg=INTL_DIV_LG[row.division];
  // Europa: id='intl_'+tk e lg do país — IDÊNTICO ao window.INTL_LEAGUES (senão copas/bg-leagues
  // que referenciam clubes por id quebrariam ao misturar Supabase x bundle).
  if(intlLg) return Object.assign({ id:'intl_'+row.club_id, lg:intlLg }, base);
  return Object.assign({ id:'real_'+row.division+'_'+row.club_id }, base); // Brasil B/C/D
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
    const all=uniLeagueClubs(cfg); // INTL_LEAGUES (Europa) ou CONMEBOL_LEAGUES (América do Sul)
    const lgCode=cfg.lg && cfg.lg[division];
    const size = DIVISION_SIZE[division] || 20;
    // FONTE ÚNICA: Supabase (division_clubs) tem prioridade se já foi carregado nesta sessão;
    // senão, fallback pro bundle window.INTL_LEAGUES (offline / ainda não subido). Mesmo id/lg.
    const cached=REAL_DIVISION_CACHE[division];
    let clubs = (cached && cached.length) ? cached.slice() : (lgCode ? all.filter(c=>c.lg===lgCode) : all.slice());
    // 2ª divisão: usa os clubes REAIS scrapeados (elencos reais) e, se vierem incompletos
    // (o Transfermarkt nem sempre cobre a divisão inteira), completa com os clubes curados
    // restantes (nomes reais + elenco procedural), sem duplicar quem já veio real.
    if(clubs.length < size && lgCode && INTL_LOWER_DIVISION_CLUBS[cfg.country] && INTL_LOWER_DIVISION_CLUBS[cfg.country][division]){
      // dedup contra TODOS os clubes reais do país (todas as divisões), não só esta —
      // senão um clube que já está na 1ª divisão (ex.: Schalke) reaparece na 2ª (duplicado).
      const have=new Set(all.map(c=>normClubName(c.name)));
      const fill=intlLowerDivisionClubs(cfg.country, division, lgCode, size, cfg.nat).filter(c=>!have.has(normClubName(c.name)));
      clubs = clubs.concat(fill).slice(0, size);
    }
    return clubs.slice(0, size);
  }
  if(division==='A') return DATA.clubsSerieA || DATA.clubs;
  // Séries B/C/D REAIS empacotadas (B=Transfermarkt; C/D=escalações reais) — PRIORIDADE sobre
  // Supabase/procedural, pra nunca cair em jogador inventado nas divisões inferiores.
  const bundled=(typeof window!=='undefined'&&window.BRASIL_LOWER&&window.BRASIL_LOWER[division])||null;
  if(bundled && bundled.length) return bundled.slice(0, DIVISION_SIZE[division]);
  const real=REAL_DIVISION_CACHE[division];
  if(real && real.length) return real.slice(0, DIVISION_SIZE[division]);
  return proceduralDivisionClubs(division, DIVISION_SIZE[division]);
}
/* Resenha (multiplayer): SEMPRE começa na ÚLTIMA divisão do Brasil (Série D) — a graça do jogo é
   o desafio de subir da base até a Série A e ganhar títulos. Fonte: bundle real BRASIL_LOWER['D']
   (independe do universo em que o host esteja no momento).
   `div` (opcional) sobrescreve a divisão — só usado pelo MODO TESTE (TESTING_FREE_DIVISION_PICK,
   ui/main.js): o anfitrião escolhe a divisão inicial da sala em scSalaHost antes de abrir. Sem
   override, o comportamento é idêntico ao de sempre (RESENHA_START_DIV, sempre 'D'). */
const RESENHA_START_DIV = 'D';
function resenhaStartClubs(div){
  const d=div||RESENHA_START_DIV;
  if(d==='A') return (typeof DATA!=='undefined'&&(DATA.clubsSerieA||DATA.clubs))||[];
  const bundled=(typeof window!=='undefined'&&window.BRASIL_LOWER&&window.BRASIL_LOWER[d])||null;
  if(bundled && bundled.length) return bundled.slice(0, (typeof DIVISION_SIZE!=='undefined'&&DIVISION_SIZE[d])||20);
  return (typeof DATA!=='undefined'&&(DATA.clubsSerieA||DATA.clubs))||[];
}
/* MODO TESTE (ver acima): descobre em qual divisão do Brasil um clube da Resenha está, a partir
   só do id — sem precisar guardar a divisão escolhida em lugar nenhum do banco/sala. Usado pra
   todo cliente (anfitrião OU convidado) abrir newGame() na divisão CERTA mesmo quando o anfitrião
   escolheu uma diferente da D (ver resolveRoomDivision, net/local-transport.js). */
function divisionOfResenhaClub(clubId){
  if((typeof DATA!=='undefined') && DATA.clubsSerieA && DATA.clubsSerieA.some(c=>c.id===clubId)) return 'A';
  if(typeof BRASIL_LOWER!=='undefined'){
    for(const d of ['B','C','D']){ if((BRASIL_LOWER[d]||[]).some(c=>c.id===clubId)) return d; }
  }
  return RESENHA_START_DIV;
}
/* ===== O GATILHO: UM PAÍS DEIXA DE SER FUNDO E GANHA MUNDO PRÓPRIO =====
   Quando um treinador aceita comandar um clube de outro país, aquele país não pode continuar a
   ser resolvido por simulação de fundo: a regra é que ele assiste a TODAS as partidas das
   competições do país do clube dele, e não se assiste ao que uma quick-sim decidiu.

   Este é o momento em que o mundo daquele país nasce — divisões de verdade, com elencos
   materializados, calendário próprio e tabela própria. `S.mundos[pais]` tem a MESMA forma que a
   pirâmide âncora ({division, sched, table, otherDivs}), e é por isso que o resolvedor consegue
   iterar sobre eles sem saber qual é qual (ver resolverPiramideDoPais no resolve-round).

   O QUE NÃO ENTRA NO MUNDO: elencos, caixa, propostas. Isso é do jogo inteiro e continua em S,
   partilhado — um jogador que vai do Fluminense para o Chelsea é o mesmo objeto nos dois lados.

   O PAÍS ANTIGO NÃO MORRE. Ele continua na lista de países vivos e continua a ser resolvido: os
   outros treinadores da sala seguem lá, e a carreira de um não pode apagar o campeonato dos
   outros. É a correção que o dono do jogo apanhou em 18/08.

   Custo medido: ~1 MB no shared_state por país com elencos. Por isso o mundo nasce QUANDO alguém
   vai jogar nele, e não no arranque da sala. */
function criarMundoDoPais(uniKey, divisaoDoTreinador){
  if(typeof S==='undefined' || !S || !uniKey) return null;
  const cfg=(typeof UNI_CONFIGS!=='undefined')?UNI_CONFIGS[uniKey]:null;
  if(!cfg || !cfg.order || !cfg.order.length) return null;
  S.mundos=S.mundos||{};
  if(S.mundos[uniKey]) return S.mundos[uniKey];          // já existe: não se recria (apagaria a temporada em curso)

  const nomePais=cfg.country||uniKey;
  const L=(S.bgLeagues||{})[nomePais]||null;
  const tabelaVazia=(ids)=>{ const t={}; ids.forEach(id=>t[id]={id,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0}); return t; };
  const porDivisao={};
  cfg.order.forEach(d=>{
    /* os clubes vêm da liga de fundo quando ela já existe — assim a tabela em curso NÃO se perde,
       que é o que aconteceria se o mundo nascesse do zero no meio da temporada. Só quando não há
       fundo nenhum é que se monta da folha do país. */
    let ids=(L && L.divs && L.divs[d] && (L.divs[d].clubIds||[]).slice()) || [];
    if(!ids.length && typeof clubesDoUniverso==='function') ids=clubesDoUniverso(uniKey,d).map(c=>c.id);
    ids=ids.filter(Boolean);
    if(!ids.length) return;
    /* ELENCOS DE VERDADE. Sem isto o país teria tabela mas não teria jogo: o motor não consegue
       simular nem transmitir uma partida de clubes sem elenco. */
    if(typeof ensureBgClubMaterialized==='function') ids.forEach(id=>ensureBgClubMaterialized(id));
    const anterior=(L && L.divs && L.divs[d]) || null;
    porDivisao[d]={ clubs: ids.map(id=>({id})),
      sched: (anterior && anterior.sched && anterior.sched.length) ? anterior.sched
             : ((typeof makeSchedule==='function') ? makeSchedule(ids.slice()) : []),
      table: (anterior && anterior.table) ? anterior.table : tabelaVazia(ids) };
  });
  const ordem=cfg.order.filter(d=>porDivisao[d]);
  if(!ordem.length) return null;
  const topo=(divisaoDoTreinador && porDivisao[divisaoDoTreinador]) ? divisaoDoTreinador : ordem[0];
  const outras={};
  ordem.forEach(d=>{ if(d!==topo) outras[d]=porDivisao[d]; });
  S.mundos[uniKey]={ pais:uniKey, division:topo,
    sched:porDivisao[topo].sched, table:porDivisao[topo].table, otherDivs:outras };

  /* o país entra na lista de vivos — e o antigo FICA. Plural de propósito (ver paisesVivos). */
  const vivos=new Set(Array.isArray(S.paisesVivos)?S.paisesVivos:[]);
  vivos.add(uniKey);
  if(typeof activeUniverseKey==='function') vivos.add(activeUniverseKey());
  S.paisesVivos=[...vivos];

  /* o calendário daquele país passa a existir na sala, para os dias dele entrarem na fila */
  if(typeof CALENDARIOS_API!=='undefined' && CALENDARIOS_API.calendarioDe){
    S.calFolhas=S.calFolhas||{};
    S.calFolhas[uniKey]=CALENDARIOS_API.calendarioDe(uniKey);
  }
  console.log('mundo criado para '+uniKey+': '+ordem.length+' divisão(ões), topo '+topo);
  return S.mundos[uniKey];
}

/* ===== DE QUE PAÍS É ESTE CLUBE — a peça-base do multi-país na Resenha =====
   Mesmo truque de `divisionOfResenhaClub`, e pela mesma razão: a sala NÃO precisa guardar o país
   em lugar nenhum. Cada cliente recebe o id do próprio clube (do sorteio) e deduz daí em que
   universo a temporada corre. Sem coluna nova, sem migração, e sem a possibilidade de o país
   guardado divergir do clube realmente sorteado — que seria mais uma coordenada a discordar de
   outra, o padrão que custou caro no calendário.

   Devolve a CHAVE do universo (o que setUniverse espera: 'brasil', 'Inglaterra', …), não o nome
   do país. Clube desconhecido cai em 'brasil', que é o comportamento de sempre. */
function universoDoClube(clubId){
  if(!clubId) return 'brasil';
  // Brasil: Série A vem de DATA.clubsSerieA, as outras três de BRASIL_LOWER
  if(typeof DATA!=='undefined' && DATA.clubsSerieA && DATA.clubsSerieA.some(c=>c.id===clubId)) return 'brasil';
  if(typeof BRASIL_LOWER!=='undefined'){
    for(const d of ['B','C','D']) if((BRASIL_LOWER[d]||[]).some(c=>c.id===clubId)) return 'brasil';
  }
  // demais países: as listas são por NOME de país; UNIVERSOS traduz nome -> chave de universo
  const porNome={};
  if(typeof UNI_CONFIGS!=='undefined') Object.keys(UNI_CONFIGS).forEach(k=>{
    const nome=(UNI_CONFIGS[k]&&UNI_CONFIGS[k].country)||(k==='brasil'?'Brasil':k);
    porNome[nome]=k;
  });
  const fontes=[(typeof INTL_LEAGUES!=='undefined')?INTL_LEAGUES:null,
                (typeof CONMEBOL_LEAGUES!=='undefined')?CONMEBOL_LEAGUES:null];
  for(const fonte of fontes){
    if(!fonte) continue;
    for(const nome in fonte){
      if((fonte[nome]||[]).some(c=>c && c.id===clubId)) return porNome[nome] || 'brasil';
    }
  }
  return 'brasil';
}
/* todos os clubes de um universo, na divisão pedida — o que a sala oferece no sorteio quando o
   país deixa de ser sempre o Brasil. Para o Brasil mantém exatamente o caminho antigo
   (resenhaStartClubs); para os outros vem da lista do país, cortada no tamanho da divisão. */
function clubesDoUniverso(uniKey, div){
  if(!uniKey || uniKey==='brasil') return resenhaStartClubs(div);
  const cfg=(typeof UNI_CONFIGS!=='undefined')?UNI_CONFIGS[uniKey]:null;
  if(!cfg) return resenhaStartClubs(div);
  const nome=cfg.country||uniKey;
  const fonte=(cfg.src==='conmebol' && typeof CONMEBOL_LEAGUES!=='undefined') ? CONMEBOL_LEAGUES
            : ((typeof INTL_LEAGUES!=='undefined') ? INTL_LEAGUES : null);
  const todos=(fonte && fonte[nome]) || [];
  const alvo=div || (cfg.order && cfg.order[cfg.order.length-1]);
  const codigo=(cfg.lg && cfg.lg[alvo]) || null;
  // as listas trazem 1ª e 2ª divisões juntas; o campo `lg` de cada clube ('ENG-1'/'ENG-2') separa
  const daDivisao=codigo ? todos.filter(c=>c && c.lg===codigo) : todos;
  const tamanho=(cfg.size && cfg.size[alvo]) || 20;
  return (daDivisao.length?daDivisao:todos).slice(0, tamanho);
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
  // roda em TODOS os pontos onde um estado é adotado (load do save solo, load da sala, reconcile
  // do convidado, virada de temporada online) — é o gancho natural pra normalizar o que veio de
  // fora. Fica ANTES dos early-returns abaixo: elenco sem contrato precisa ser corrigido mesmo
  // num estado que não tenha divisionClubs. Ver ensureSquadContracts.
  ensureSquadContracts();
  syncTrainingFlags();   // p._training vem de S.trainingByClub (o elenco adotado veio sem o flag)
  // rede de segurança do calendário de copa: se o estado adotado não trouxer S.cupCalendar (save
  // de antes desta versão, ou virada de temporada resolvida por um caminho que não passou pelo
  // initSeasonCups), reconstrói. O cálculo é determinístico — todo cliente chega no mesmo array.
  if(typeof ensureCupCalendar==='function') ensureCupCalendar();
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
  const squads={}; DATA.clubs.forEach(c=>{ squads[c.id] = c.id===S.clubId ? myPlayers : (S.squads[c.id] || gkSquad(c).map(p=>attachAttrs(initStats({...p}), newDivision))); }); // banda = divisão nova (ver buildOtherDivisions)
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
      // banda de força da divisão DELE (o `d` do laço), não a do usuário: attachAttrs cai em
      // S.division quando não recebe divisão, então os clubes de dados REAIS (Série A, que não
      // trazem _div/_rb prontos como os procedurais) eram remapeados com a faixa de quem está
      // jogando — num save da Série D o elenco do Corinthians saía com reserva em força 5 e
      // craque em 81 (a curva da D extrapolada), em vez dos 26-77 da faixa A.
      if(!S.squads[c.id]) S.squads[c.id] = gkSquad(c).map(p=>attachAttrs(initStats({...p}), d));
      if(S.budgets && S.budgets[c.id]==null) S.budgets[c.id] = REBAL.budget(d, makeRng(hashSeed(S.seed,'budget',c.id))); // F3.3: caixa por-clube
      if(S.clubStadiumCap && S.clubStadiumCap[c.id]==null) S.clubStadiumCap[c.id] = {
        capacity:(typeof realCapFor==='function'&&realCapFor(c))||(typeof REBAL!=='undefined'&&REBAL.stadiumCap?REBAL.stadiumCap(c.overall):20000),
        builtThisSeason:0 }; // mesma semente de newGame() (index.html), primeira vez que o clube aparece
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
  if(typeof CL!=='undefined' && CL.unemployed) return; // sem clube: a régua fica parada até assumir outro
  if(S.jobSecurity==null) S.jobSecurity=60;
  const pos=tablePos(S.clubId), total=DATA.clubs.length;
  const posScore = total>1 ? 100-((pos-1)/(total-1))*100 : 60;          // 1º=100, lanterna=0 (RESULTADOS)
  const sq=squad(S.clubId)||[];
  const moraleScore = sq.length ? clamp(sq.reduce((s,p)=>s+(p.moral||70),0)/sq.length, 0, 100) : 70; // MORAL do elenco
  const target = 0.7*posScore + 0.3*moraleScore;                        // 70% resultados + 30% moral (decisão do usuário)
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
/* =====================================================================
   SONDAGEM DO EXTERIOR — UMA REGRA SÓ, PARA OS DOIS MODOS
   ---------------------------------------------------------------------
   Solo e Resenha tinham réguas diferentes para a MESMA decisão de carreira, e a diferença não era
   escolha de desenho — era o solo e a Resenha terem sido escritos em momentos diferentes:

     · o solo só deixava ser sondado quem estava na 1ª divisão; a Resenha, qualquer divisão;
     · o solo pedia segurança no cargo 85; a Resenha, 80;
     · o solo dava PRIORIDADE ao convite estrangeiro (vinha antes do doméstico, e em 40% das
       vezes que rolava); a Resenha punha-o em 15%, atrás dos dois domésticos;
     · a Resenha travava a próxima mudança por duas temporadas; o solo não travava nada, e um
       treinador podia trocar de clube todos os anos.
     · e o solo escolhia o clube de fora entre a METADE MAIS FORTE da 1ª divisão daquele país,
       sem olhar para o clube que o treinador comanda — um técnico do meio da tabela podia ser
       chamado pelo maior clube da Europa.

   Agora a régua é esta, e vale igual nos dois modos. Ela é a da Resenha nos pontos em que a
   Resenha era a mais realista (o degrau limitado, o descanso entre mudanças, o convite de fora
   como o mais raro dos três) e mais frouxa que o solo onde o solo era arbitrário (a 1ª divisão
   deixa de ser exigência: quem está a ganhar a segunda divisão TEM currículo).

   O que a torna realista, em três traços:
     · quem observa o mercado olha o TOPO da pirâmide, não a base (dois níveis, não um);
     · o clube que chama é melhor que o atual, mas nunca um salto absurdo — é promoção, não sorte;
     · quem acabou de mudar não muda outra vez no ano seguinte.
   ===================================================================== */
/* =====================================================================
   PESO REAL DE CADA COMPETICAO — a regua unica do prestigio
   ---------------------------------------------------------------------
   Inspirada na tabela historica que pontua clubes por titulo (Libertadores 20,
   Brasileirao 15, Copa do Brasil 12, Serie B 3, C 1, D 0,5), adaptada ao mundo
   do jogo: cada pais tem um INDICE (o "tamanho" da liga), a 1ª divisao vale o
   indice, as divisoes de baixo caem como no Brasil, e as copas continentais
   tem valor fixo. E a MESMA regua que alimenta o Ranking de Treinadores, a
   moral/seguranca pos-titulo e a frequencia de sondagem do exterior — uma
   conta so, para as tres coisas nunca discordarem. */
const INDICE_PAIS={ brasil:15, Inglaterra:18, Espanha:18, 'Itália':16, Alemanha:16,
  'França':15, Portugal:12, 'Países Baixos':12, Argentina:12, Uruguai:8, 'Colômbia':8,
  Chile:8, Peru:7, Equador:7, Paraguai:7, Venezuela:6, 'Bolívia':6, 'México':10 };
function indiceDoPais(uni){ const v=INDICE_PAIS[uni]; return v!=null?v:8; }
const PONTOS_TITULO_FIXO={ libertadores:20, championsLeague:20, sulamericana:10,
  europaLeague:10, copaBrasil:12 };
/* pontos por NIVEL de liga, escalados pelo indice do pais (Brasil: 15/3/1/0,5) */
function pontosDeLigaPorNivel(indice, nivel){
  if(nivel<=0) return indice;
  if(nivel===1) return Math.max(2, Math.round(indice/5));
  if(nivel===2) return 1;
  return 0.5;
}
/* o peso de UM titulo. `comp` e a chave gravada no historico/titlesByClub
   ('serieA'..'serieD', 'premier', 'liga:PAIS:DIV', ou chave de copa). */
function pontosDeTitulo(comp, uni, div){
  if(comp==null) return 0;
  if(PONTOS_TITULO_FIXO[comp]!=null) return PONTOS_TITULO_FIXO[comp];
  let pais=uni||'brasil', d=div||null;
  if(comp==='serieA'){pais='brasil';d='A';} else if(comp==='serieB'){pais='brasil';d='B';}
  else if(comp==='serieC'){pais='brasil';d='C';} else if(comp==='serieD'){pais='brasil';d='D';}
  else if(comp==='premier'){pais='Inglaterra';d='PL';}
  else if(/^liga:/.test(String(comp))){ const par=String(comp).split(':'); pais=par[1]; d=par[2]; }
  else if(typeof COMP_DEFS!=='undefined' && COMP_DEFS[comp])
    return Math.max(1, Math.round(indiceDoPais(pais)*0.8));   // copa nacional de outro pais: ~80% da liga
  const idx=indiceDoPais(pais);
  let nivel=0;
  try{ if(d && typeof WORLD_CONFIG!=='undefined' && WORLD_CONFIG.nivelDaDivisao) nivel=WORLD_CONFIG.nivelDaDivisao(pais,d)||0; }catch(e){}
  return pontosDeLigaPorNivel(idx, nivel);
}
/* pontos de titulo da MINHA carreira (a estante da Sala de Trofeus, pesada) */
function coachTitlePoints(){
  return (S && S.coachHistory||[]).filter(h=>h && h.type==='campeao')
    .reduce((soma,h)=>soma+pontosDeTitulo(h.comp,h.uni,h.div),0);
}
/* pontos de titulo de um CLUBE do ranking (S.titlesByClub: comp -> contagem) */
function clubTitlePoints(clubId){
  const t=(S && S.titlesByClub && S.titlesByClub[clubId])||{};
  return Object.keys(t).reduce((soma,k)=>soma+(t[k]||0)*pontosDeTitulo(k),0);
}
/* ===== A PONTUACAO DO RANKING DE TREINADORES =====
   pontos de jogo somados (todas as temporadas + a atual) + titulos com o PESO REAL da
   competicao. O multiplicador 25 poe as duas moedas na mesma escala: um Brasileirao
   (15 pts de titulo) vale ~375 — na casa de 4-5 temporadas de meio de tabela — entao
   titulo manda no topo do ranking, mas campanha consistente continua subindo degraus. */
const PESO_TITULO_NO_RANKING=25;
function coachRankingScore(clubId, ptsTabelaAtual){
  const car=(S && S.coachCareerStats && S.coachCareerStats[clubId])||{pts:0,titles:0};
  const jogo=(car.pts||0)+(ptsTabelaAtual||0);
  const titulo=clubTitlePoints(clubId);
  return { jogo, tituloPts:titulo, titles:car.titles||0,
           total: Math.round(jogo + titulo*PESO_TITULO_NO_RANKING) };
}
/* ===== TITULO MEXE NO VESTIARIO E NA CADEIRA =====
   Conquistar taca sobe a moral do plantel e a seguranca no cargo, proporcional ao PESO da
   conquista (Serie D nao e Libertadores). Na Resenha a moral viaja pela mesma via da coletiva
   de imprensa (S._netMorale), senao o servidor desfazia o ganho no proximo adopt. */
function aplicarEfeitosDeTitulo(pontos){
  if(!pontos || !S) return;
  const moral=Math.min(12, 3+Math.round(pontos/3));       // Serie D +3 ... Libertadores +10
  const cadeira=Math.min(25, 6+Math.round(pontos));       // e a diretoria agradece
  S.jobSecurity=Math.min(95,(S.jobSecurity!=null?S.jobSecurity:60)+cadeira);
  (squad(S.clubId)||[]).forEach(pl=>{ pl.moral=Math.min(100,(pl.moral!=null?pl.moral:70)+moral); });
  if(typeof CL!=='undefined' && CL.online) S._netMorale=(S._netMorale||0)+moral;
}
const SONDAGEM_EXTERIOR={
  nivelMaximo:1,          // níveis do topo da pirâmide que o exterior observa (0 = 1ª divisão)
  seguranca:82,           // a régua de "está a ir muito bem" (era 85 no solo, 80 na Resenha)
  degrauMin:2,            // o clube de fora tem de ser melhor que o meu...
  degrauMax:18,           // ...e não um salto absurdo
  fatia:0.15,             // 15% das sondagens vêm de fora: mudar de país é a decisão mais pesada
  descansoTemporadas:2,   // uma mudança VOLUNTÁRIA a cada duas temporadas
};
/* DESCANSO ENTRE MUDANÇAS. Só vale para mudança voluntária: quem foi DEMITIDO tem de poder
   assumir o convite seguinte, senão ficaria duas temporadas sem clube. */
function podeMudarDeClube(){
  if(S.lastClubChangeSeason==null) return true;
  return ((S.season||1) - S.lastClubChangeSeason) >= SONDAGEM_EXTERIOR.descansoTemporadas;
}
function resenhaCanMoveClub(){ return podeMudarDeClube(); }   // nome antigo, mesmo comportamento
/* TENHO CURRÍCULO PARA SER OBSERVADO DE FORA? Nível na pirâmide + régua no cargo + descanso.
   O nível é lido por ÍNDICE (order.indexOf), não pela letra da divisão — é o que faz a regra
   valer num país de divisão única (Argentina: índice 0, elegível) sem escrever exceção. */
function curriculoDeExportacao(){
  const nivel=DIV_ORDER.indexOf(S.division);
  if(nivel<0 || nivel>SONDAGEM_EXTERIOR.nivelMaximo) return false;
  /* TITULO ABRE PORTA: cada ponto de titulo desconta da regua de seguranca exigida —
     um campeao da Libertadores (20 pts) e observado mesmo num momento morno do cargo. */
  const exigida=Math.max(60, SONDAGEM_EXTERIOR.seguranca - Math.min(22, coachTitlePoints()));
  if((S.jobSecurity||0) < exigida) return false;
  return podeMudarDeClube();
}
/* a fatia de sondagens que vem de FORA cresce com a estante de trofeus:
   sem titulo 15%; um Brasileirao (15 pts) ~45%; Libertadores (20) ~55%; teto 60%. */
function fatiaExterior(){
  return Math.min(0.6, SONDAGEM_EXTERIOR.fatia + coachTitlePoints()*0.02);
}
/* que paises chamam este treinador: liga grande (indice alto) exige estante — sem titulo o
   convite da Premier League e raro; com uma Libertadores ele vira o mais provavel. */
function pesoDoPaisParaOferta(pais){
  const idx=indiceDoPais(pais), t=coachTitlePoints();
  if(idx<=12) return 1;
  return 0.2 + Math.min(1.3, t/15);
}
function escolherClubeDoExterior(R){
  const fora=clubesDoExterior(); if(!fora.length) return null;
  const w=fora.map(f=>pesoDoPaisParaOferta(f.country));
  const tot=w.reduce((a,b)=>a+b,0); if(!(tot>0)) return fora[0];
  let r=R.random()*tot;
  for(let i=0;i<fora.length;i++){ r-=w[i]; if(r<=0) return fora[i]; }
  return fora[fora.length-1];
}
/* CLUBES DE FORA DENTRO DO DEGRAU. Lê as ligas dos outros países da sala/save (S.bgLeagues) e
   devolve só os que são um passo realista acima do clube atual. Assento de humano fica fora: não
   está disponível. Ordenado do menor degrau para o maior, para o sorteio não puxar sempre o topo. */
function clubesDoExterior(){
  const fora=[], bg=S.bgLeagues||{};
  const humanos=new Set(Object.keys((typeof CL!=='undefined'&&CL.humans)||{}));
  if(S.clubId) humanos.add(S.clubId);
  const meu=anyClubOverall(S.clubId);
  Object.keys(bg).forEach(pais=>{
    const divs=(bg[pais]&&bg[pais].divs)||{};
    Object.keys(divs).forEach(d=>{
      (divs[d].clubIds||[]).forEach(id=>{
        if(humanos.has(id)) return;
        const c=(typeof bgClubById==='function')?bgClubById(id):null; if(!c) return;
        const ov=anyClubOverall(id,c);
        if(ov>meu+SONDAGEM_EXTERIOR.degrauMin && ov<=meu+SONDAGEM_EXTERIOR.degrauMax)
          fora.push({clubId:id, division:d, ov, country:pais});
      });
    });
  });
  fora.sort((a,b)=>a.ov-b.ov);
  return fora.slice(0,6);
}
/* sondagem de clube de OUTRO país no modo solo — mesma régua da Resenha (ver acima) */
function maybeForeignJobOffer(){
  if(!curriculoDeExportacao()) return null;
  const R=makeRng(hashSeed(S.seed,S.season,S.round,'foreignjob'));
  if(R.random()>=fatiaExterior()) return null;   // titulos deixam o convite de fora bem mais frequente
  const pick=escolherClubeDoExterior(R); if(!pick) return null;
  return { clubId:pick.clubId, division:pick.division, country:pick.country, foreign:true,
           salary:proposedCoachSalary(pick.clubId, S.clubId) };
}
function generateJobOffer(){
  // verificar critérios de sucesso do treinador
  const avgMoral = squad(S.clubId).reduce((s,p)=>s+(p.moral||70),0) / (squad(S.clubId).length||1);
  const titles = (S.coachHistory||[]).filter(h=>h.type==='campeao').length;
  const trophyDisputes = (S.coachHistory||[]).filter(h=>h.type==='campeao' || (h.text && h.text.includes('Final'))).length;

  // critério mínimo: media de moral aceitavel, ou algum título/final disputada
  if(avgMoral<65 && titles===0 && trophyDisputes===0) return null;

  // FASE 4: às vezes a proposta vem de fora do país (liga de fundo) — tem prioridade quando aparece
  const foreign=maybeForeignJobOffer(); if(foreign) return foreign;

  const divIdx=DIV_ORDER.indexOf(S.division);
  const curOverall=clubOverall(S.clubId);
  const sameDivPool=DATA.clubs.filter(c=>c.id!==S.clubId && c.overall>curOverall+2 && c.overall<=curOverall+14);
  const upDivPool = divIdx>0 ? ensureDivisionClubs(DIV_ORDER[divIdx-1]).slice().sort((a,b)=>a.overall-b.overall).slice(0,6) : [];
  const R=makeRng(hashSeed(S.seed,S.season,S.round,'joboffer'));
  const useUpDiv = upDivPool.length>0 && R.random()<0.25;
  // fromUp = o clube escolhido veio da divisão DE CIMA — seja porque sorteamos "subir de divisão"
  // (useUpDiv), seja porque não havia ninguém elegível na mesma divisão (sameDivPool vazio, ex.: o
  // usuário é dos mais fortes da sua série) e caímos no upDivPool. A divisão do convite TEM que
  // seguir de onde o clube realmente veio — senão um clube da Série C (ex.: Amazonas) aparecia
  // rotulado com a divisão do usuário (Série D).
  const fromUp = useUpDiv || sameDivPool.length===0;
  const pool = fromUp ? upDivPool : sameDivPool;
  if(!pool.length) return null;
  const pick=pool[Math.floor(R.random()*pool.length)];

  // calcular salário proposto: baseado no salário atual + bonus para clube melhor
  const clubOffer = clubOf(pick.id);
  const clubOfferOverall = clubOffer?clubOffer.overall:55;
  // Salário de referência: quem ainda está no PRIMEIRO clube nunca negociou salário — o save
  // nasce com coachSalary 0 (index.html) e só applyManagerJobChange define um valor. Sem esta
  // base a conta abaixo virava 0*algo = 0 e TODA primeira proposta da carreira vinha com salário
  // R$ 0. Passava despercebido porque o modal antigo só mostrava o salário se ele fosse != 0;
  // a tela nova de proposta põe o número em destaque (ver showJobProposal). Mesma fórmula de
  // base que applyManagerJobChange usa — é o que ele ganharia hoje no clube atual.
  const proposedSalary = proposedCoachSalary(pick.id, S.clubId, curOverall);

  return { clubId:pick.id, division: fromUp?DIV_ORDER[divIdx-1]:S.division, salary:proposedSalary };
}
/* SALÁRIO PROPOSTO POR UM CLUBE — régua única pros dois caminhos (carreira solo e Resenha).
   Existe como função separada porque a Resenha passou a usar a MESMA mesa de jantar do solo
   (showJobProposal), e aquela tela põe o salário em destaque: a oferta da Resenha só carregava
   {clubId, division}, então a proposta apareceria como "R$ 0/sem".
   Base: o que o treinador ganha hoje — ou o que ganharia no clube atual, pra quem nunca
   negociou (o save nasce com coachSalary 0). Mais 10%, e mais 2% por ponto de overall de
   diferença entre quem convida e o clube atual. */
function proposedCoachSalary(targetClubId, fromClubId, fromOverall){
  const base = (fromOverall!=null) ? fromOverall
             : (fromClubId!=null ? anyClubOverall(fromClubId) : 55);   // sem clube (demitido): piso
  const alvo = anyClubOverall(targetClubId);
  const salarioAtual = S.coachSalary || Math.round(100000 + base*5000);
  return salarioAtual + Math.round(salarioAtual * (0.1 + (alvo-base)*0.02));
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
  S.pendingJobOffers = (S.pendingJobOffers||[]).filter(o=>(o.roundOfferred||0)+PRAZO_OFERTA>=S.round);

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
  } else if(S.jobSecurity>=80 && podeMudarDeClube()){
    /* O DESCANSO ENTRE MUDANÇAS VALE NOS DOIS MODOS (ver SONDAGEM_EXTERIOR). A Resenha travava a
       próxima troca por duas temporadas e o solo não travava nada: um treinador solo podia mudar
       de clube todos os anos, o que é a forma mais rápida de subir quatro divisões em quatro
       temporadas sem nunca ganhar nada. Demissão não conta — quem foi despedido escolhe na hora. */
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
          S.roundNews.push(`🤝 ${offer.foreign?'Proposta do exterior ('+offer.country+') — ':'Nova oferta de contratação do '}${(clubOf(offer.clubId)||bgClubById(offer.clubId)||{short:'?'}).short}!`);
          return {kind:'offer', offer}; // retornar para mostrar modal imediato
        }
      }
    }
  }
  return null;
}
/* ===== A CARREIRA É DO CLIENTE, NÃO DO MUNDO =====
   Na Resenha S é o estado COMPARTILHADO: adopt/reconcile fazem Object.assign(S, estadoDoServidor),
   e esse estado carrega os campos de carreira de QUEM o gravou (o anfitrião). Sem proteger, a cada
   rodada o convidado herdava a Segurança no cargo, o salário e o histórico do anfitrião — o
   tickJobSecurity então só puxava 18% por rodada na direção certa, PARTINDO do número do outro.
   Era isso que deixava a barra "Segurança no cargo" sem relação nenhuma com a campanha do próprio
   clube (e travava demissão/convite, que dependem dela). Estes campos são de cada treinador:
   sobrevivem ao Object.assign e nunca vêm do servidor. */
/* playerGrowth/_growthKey entram aqui porque a evolução que EU acompanho é a do MEU elenco: na
   Resenha o S vem do save do ANFITRIÃO (Object.assign em onlineReconcileIfBehind), e sem estar
   nesta lista o histórico do convidado seria substituído pelo do host a cada rodada. */
/* trainingByClub entra aqui pelo mesmo motivo do playerGrowth: é um mapa por clubId que vive no S
   COMPARTILHADO. Na Resenha o Object.assign do adopt troca o mapa INTEIRO pelo do anfitrião — que
   não tem a chave do convidado — e o convidado perdia a lista de quem pôs em treino a cada rodada. */
/* history/titlesByClub/financeHistory entram aqui pelo mesmo motivo do coachHistory: são o
   registro do MEU treinador (Historial do clube, Sala de Troféus, resumo financeiro por
   temporada). Na Resenha o S vem do save do ANFITRIÃO, e sem esta lista o convidado herdaria a
   estante de troféus do host — ou, mais provável, uma vazia. _titlesRegisteredSeason é o carimbo
   de "já registrei esta virada" e precisa sobreviver ao mesmo Object.assign. */
/* coachCareerStats/_coachCareerSeason: o Ranking de Treinadores (pontos somados + títulos por
   clube). Vivia em CL e sumia a cada recarga — o acumulado só é somado na virada de temporada e
   S._prevSeason é consumido ali, então não havia como recomputar. Ver accrueCareerStats. */
const CAREER_KEYS=['jobSecurity','roundsSinceFired','pendingJobOffers','coachHistory','coachSalary','lastClubChangeSeason','playerGrowth','_growthKey','trainingByClub','criseVista','history','titlesByClub','financeHistory','_titlesRegisteredSeason','coachCareerStats','_coachCareerSeason','coachSpells'];
/* ---- EVOLUÇÃO DO ELENCO (o que o treino de fato fez) ----
   O ícone 🔺 dizia "está em treino", mas não dizia se rendeu alguma coisa. Aqui fica o histórico
   de FORÇA do meu elenco: uma entrada por MUDANÇA (não por rodada), então uma temporada inteira
   cabe em pouquíssimos números.

   O registro é feito por OBSERVAÇÃO, não dentro do evolvePlayer, de propósito: a força pode mudar
   por caminhos diferentes (evolução local no solo, resolve-round no servidor, espelhamento do save
   do anfitrião). Comparar o que eu via antes com o que vejo agora funciona em todos eles, sem
   precisar instrumentar cada caminho — e sem inchar o estado dos 430 clubes, já que só o MEU
   elenco é acompanhado. */
const GROWTH_MAX=14;
function trackMyForces(){
  if(typeof S==='undefined' || !S || !S.squads) return;
  const cid=(typeof CL!=='undefined' && CL.clubId) || S.clubId; if(!cid) return;
  const key=(S.season||1)+'-'+(S.round||0)+'-'+cid;   // inclui o clube: trocar de time recomeça a régua
  if(S._growthKey===key) return;
  S._growthKey=key;
  S.playerGrowth=S.playerGrowth||{};
  (S.squads[cid]||[]).forEach(p=>{
    if(!p || p.pid==null || typeof p.f!=='number') return;
    const h=S.playerGrowth[p.pid]||(S.playerGrowth[p.pid]=[]);
    const last=h[h.length-1];
    if(!last || last.f!==p.f){ h.push({r:S.round||0, f:p.f}); if(h.length>GROWTH_MAX) h.shift(); }
  });
}
/* histórico do jogador: {atual, anterior, delta, desdeR} — anterior é a força ANTES da última
   mudança; sem mudança nenhuma ainda, anterior === atual e delta 0. */
function growthOf(p){
  const h=(S && S.playerGrowth && p && S.playerGrowth[p.pid]) || [];
  const atual=(p&&p.f)||0;
  if(h.length<2) return {atual, anterior:atual, delta:0, desdeR:h.length?h[0].r:null, hist:h};
  const prev=h[h.length-2];
  return {atual, anterior:prev.f, delta:atual-prev.f, desdeR:h[h.length-1].r, hist:h};
}
function snapshotCareer(){ if(typeof S==='undefined'||!S) return null;
  const o={}; CAREER_KEYS.forEach(k=>{ if(S[k]!==undefined) o[k]=S[k]; }); return o; }
function restoreCareer(snap){ if(!snap||typeof S==='undefined'||!S) return;
  CAREER_KEYS.forEach(k=>{ if(snap[k]!==undefined) S[k]=snap[k]; }); }
/* GRAVA a carreira no MEU assento (game_seats.career). CAREER_KEYS protegia estes campos do
   Object.assign do adopt, mas só na memória: o save da sala é o do ANFITRIÃO, então nada disso
   sobrevivia a um logout. Sair e voltar na mesma Resenha devolvia a estante de troféus vazia.
   Chamado depois de toda mudança de carreira (fim de rodada, virada de temporada, contratação,
   demissão). Silencioso e best-effort: falhar aqui nunca pode atrapalhar o jogo. */
function persistCareer(){
  if(typeof CL==='undefined' || !CL.online) return;            // solo já grava tudo no save do jogo
  if(typeof NET==='undefined' || !NET.saveCareer) return;
  const snap=snapshotCareer(); if(!snap) return;
  try{ Promise.resolve(NET.saveCareer(snap)).catch(()=>{}); }catch(e){}
}
/* ===== CARREIRA NA RESENHA (Fase 2): demissão -> desempregado -> convite -> assume =====
   Diferente do solo (que oferece clubes na hora): na Resenha o treinador é DEMITIDO, fica
   assistindo as rodadas sem interagir e só depois recebe convite de um clube LIVRE da CPU.
   A troca de assento acontece no servidor (NET.setMyClub). Orquestrado por tickResenhaCareer,
   chamado a cada rodada adotada. */
/* clubes SEM humano (livres/CPU) na divisão do usuário e ABAIXO — nunca acima (demitido não sobe) */
function resenhaFreeClubs(){
  const humans=new Set(Object.keys((typeof CL!=='undefined'&&CL.humans)||{}));
  if(S.clubId) humans.add(S.clubId);
  const myIdx=DIV_ORDER.indexOf(S.division), out=[];
  DIV_ORDER.forEach((d,i)=>{
    if(i<myIdx) return; // só divisão atual ou abaixo
    const clubs = d===S.division ? DATA.clubs : ((S.otherDivs&&S.otherDivs[d]&&S.otherDivs[d].clubs)||[]);
    (clubs||[]).forEach(c=>{ if(c&&c.id && !humans.has(c.id)) out.push({clubId:c.id, division:d}); });
  });
  return out;
}
/* overall de um clube que pode estar fora de DATA.clubs (outra divisão) */
function anyClubOverall(id, fallbackObj){
  const c=clubOf(id)||fallbackObj; return (c&&c.overall)||55;
}
/* clubes SEM humano que podem SONDAR um treinador EMPREGADO que vai bem — espelho do
   generateJobOffer do solo, adaptado à Resenha (só clube livre/CPU, porque o assento de outro
   humano não está disponível). Sempre um degrau realista: um clube um pouco mais forte na MESMA
   divisão ou, mais raro, um dos mais fracos da divisão IMEDIATAMENTE acima. Nunca dois degraus —
   é o que impede a subida relâmpago até a primeira divisão. */
function resenhaOfferClubs(){
  const humans=new Set(Object.keys((typeof CL!=='undefined'&&CL.humans)||{}));
  if(S.clubId) humans.add(S.clubId);
  const myIdx=DIV_ORDER.indexOf(S.division), cur=anyClubOverall(S.clubId);
  const livres=(clubs,d)=>(clubs||[]).filter(c=>c&&c.id&&!humans.has(c.id))
    .map(c=>({clubId:c.id, division:d, ov:anyClubOverall(c.id,c)}));
  const same=livres(DATA.clubs, S.division).filter(c=>c.ov>cur+2 && c.ov<=cur+14);
  const upDiv = myIdx>0 ? DIV_ORDER[myIdx-1] : null;
  const up = upDiv ? livres((S.otherDivs&&S.otherDivs[upDiv]&&S.otherDivs[upDiv].clubs)||[], upDiv)
    .sort((a,b)=>a.ov-b.ov).slice(0,6) : [];
  /* ===== CONVITE DE FORA DO PAÍS =====
     Esta lista só olhava o país primário — DATA.clubs (a minha divisão) e S.otherDivs. Numa sala
     com países misturados isso quer dizer que um treinador brasileiro nunca seria sondado por um
     clube inglês, por melhor que fosse a campanha dele: o mundo existia e as propostas não.
     Agora entram também os clubes das ligas dos OUTROS países da sala (S.bgLeagues), com o mesmo
     critério de sempre — melhores que o meu, mas não absurdamente melhores.
     A troca em si já é resolvida por applyManagerJobChange, que sabe mudar de universo no meio da
     temporada (o país antigo vira liga de fundo e o novo sai dela). */
  /* A LISTA DE FORA É A MESMA DO SOLO — ver clubesDoExterior e SONDAGEM_EXTERIOR. Esta função
     tinha o degrau escrito à mão (cur+2..cur+18), e era com esses dois números que a régua da
     Resenha divergia do solo sem ninguém decidir que devia divergir. */
  const fora = curriculoDeExportacao() ? clubesDoExterior() : [];
  return {same, up, fora};
}
/* quantas jornadas um convite fica de pe. E o mesmo prazo do solo (ver checkManagerJobEvent),
   agora com nome — o numero estava escrito a mao nos dois sitios. */
const PRAZO_OFERTA=5;
function tickResenhaCareer(){
  if(typeof CL==='undefined' || !CL.online || !S) return null;
  /* CADUCAR TAMBEM VALE NA SALA. A limpeza morava no `checkManagerJobEvent`, que sai logo
     quando `CL.online` — na Resenha os convites nunca expiravam. */
  if(Array.isArray(S.pendingJobOffers))
    S.pendingJobOffers=S.pendingJobOffers.filter(o=>((o&&o.roundOfferred)||0)+PRAZO_OFERTA>=(S.round||0));
  if((S.round||0)<5 && !CL.unemployed) return null;   // dá um tempo antes de qualquer demissão
  if(CL.unemployed){
    CL._unempRounds=(CL._unempRounds||0)+1;            // conta rodadas assistindo
    if(CL._unempRounds>=3 && !CL._pendingResenhaOffer){ // convite após ~3 rodadas
      const free=resenhaFreeClubs(); if(!free.length) return null;
      const R=makeRng(hashSeed(S.seed,S.season,S.round,'resenha-offer'));
      // demitido recebe convite de clube MODESTO (por overall) — não de gigante
      const ranked=free.map(f=>({ ...f, ov:clubOverall(f.clubId) })).sort((a,b)=>a.ov-b.ov);
      const pool=ranked.slice(0, Math.max(3, Math.ceil(ranked.length*0.4)));
      const pick=pool[Math.floor(R.random()*pool.length)];
      // salário na oferta: a mesa do jantar (showJobProposal) mostra o número em destaque —
      // sem isto a proposta da Resenha aparecia como "R$ 0/sem". Demitido não tem clube atual.
      pick.salary=proposedCoachSalary(pick.clubId, null);
      /* O CONVITE DO DEMITIDO TAMBEM FICA EM CIMA DA MESA. So o da sondagem (empregado) entrava
         na caixa de ofertas; o do demitido vivia apenas em memoria — fechar a janela apagava o
         unico caminho de volta ao emprego. Mesmos carimbos do outro: roundOfferred (para caducar
         por PRAZO_OFERTA) e _resenha (para aceitar pela mecanica da sala). */
      pick.roundOfferred=S.round; pick._resenha=true;
      S.pendingJobOffers=S.pendingJobOffers||[];
      if(!S.pendingJobOffers.some(x=>x && x.clubId===pick.clubId)) S.pendingJobOffers.push(pick);
      if(typeof persistCareer==='function') persistCareer();
      CL._pendingResenhaOffer=pick;
      return {kind:'offer', offer:pick};
    }
    return null;
  }
  // EMPREGADO: risco real de demissão quando a régua (resultados+moral) está muito baixa
  if((S.jobSecurity||60)<=12){
    const R=makeRng(hashSeed(S.seed,S.season,S.round,'resenha-fire',S.clubId));
    const chance=(12-(S.jobSecurity||0))/12*0.30;     // até 30%/rodada com a régua em 0
    if(R.random()<chance) return {kind:'fired'};
  }
  // EMPREGADO indo MUITO bem: sondagem de outro clube — mesma régua do solo (jobSecurity>=80,
  // 6%/rodada, +2% acima de 90), só que limitada a clube LIVRE e ao cooldown de 2 temporadas.
  if((S.jobSecurity||60)>=80 && !CL._pendingResenhaOffer && resenhaCanMoveClub()){
    const R=makeRng(hashSeed(S.seed,S.season,S.round,'resenha-joboffer',S.clubId));
    const extra=(S.jobSecurity>=90)?0.02:0;
    if(R.random()<(0.06+extra)){
      const {same,up,fora}=resenhaOfferClubs();
      /* 25% das vezes a sondagem vem da divisão de cima (quando existe); se não há ninguém
         elegível na mesma divisão, o convite de cima é o único caminho.
         E 15% vem de FORA DO PAÍS, quando há sala com mais de um país — é o convite internacional
         a um treinador humano. Fica atrás dos outros dois de propósito: mudar de país é a decisão
         mais pesada da carreira, e não deve ser a mais frequente. */
      const deFora=(fora&&fora.length && R.random()<fatiaExterior()) ? fora : null;
      const pool = deFora || ((up.length && (R.random()<0.25 || !same.length)) ? up : same);
      if(pool.length){
        const pick = deFora ? (escolherClubeDoExterior(R)||pool[0]) : pool[Math.floor(R.random()*pool.length)];
        const offer={clubId:pick.clubId, division:pick.division, country:pick.country||null,
          salary:proposedCoachSalary(pick.clubId, S.clubId),    // ver proposedCoachSalary
          roundOfferred:S.round, _resenha:true};
        CL._pendingResenhaOffer=offer;
        /* ===== O CONVITE FICA EM CIMA DA MESA =====
           Ele vivia so em `CL._pendingResenhaOffer`, em memoria: fechar a janela ou recarregar a
           pagina apagava-o, e o treinador ficava sem forma de voltar a ele. Agora entra na CAIXA
           DE OFERTAS (`S.pendingJobOffers`), que e por assento — esta em CAREER_KEYS e viaja em
           `game_seats.career` —, aparece na pagina Treinador > Ofertas, e sobrevive ao fecho da
           janela e a recarga. Continua a caducar: PRAZO_OFERTA rodadas depois de chegar. */
        S.pendingJobOffers=S.pendingJobOffers||[];
        if(!S.pendingJobOffers.some(x=>x && x.clubId===offer.clubId))
          S.pendingJobOffers.push(offer);
        S.roundNews=S.roundNews||[];
        const nomeClube=((typeof clubOf==='function'&&clubOf(pick.clubId))||(typeof bgClubById==='function'&&bgClubById(pick.clubId))||{short:'outro clube'}).short;
        S.roundNews.push(pick.country
          ? `🌍 Sondagem do ${nomeClube} (${pick.country}): querem você para treinar lá fora.`
          : `🤝 Sondagem do ${nomeClube}: eles querem você como treinador.`);
        return {kind:'offer', offer};
      }
    }
  }
  return null;
}
/* aplica a troca de clube do treinador (demissão aceita ou proposta aceita) — o clube antigo
   segue existindo normalmente, agora controlado só pela própria simulação (como qualquer CPU) */
/* =====================================================================
   PASSAGENS DO TREINADOR (S.coachSpells)
   S.history so e escrito no FIM da temporada, e com o clube em que o treinador estava naquele
   instante. Quem saiu do Fluminense para o Flamengo a meio da primeira temporada nunca teve o
   Fluminense registado em lado nenhum: a Carreira listava um clube so, e a Historia tambem.
   Aqui fica o registo do que aconteceu QUANDO aconteceu — uma passagem por clube, aberta ao ser
   contratado e fechada ao sair, com os numeros do periodo e os titulos ganhos nele.

   OS NUMEROS SAO EXATOS SEM PRECISAR DE GANCHO POR RODADA: a tabela da temporada e cumulativa,
   entao guarda-se a marca no momento em que a passagem abre e o que conta e a DIFERENCA ate
   agora. Na virada de temporada o acumulado da temporada e somado ao total e a marca zera.
   ===================================================================== */
function _spellTabelaDe(clubId){
  const t=(S && S.table && S.table[clubId]) || null;
  return { P:(t&&t.P)||0, W:(t&&t.W)||0, D:(t&&t.D)||0, L:(t&&t.L)||0,
           GF:(t&&t.GF)||0, GA:(t&&t.GA)||0, Pts:(t&&t.Pts)||0 };
}
function coachSpellAtual(){
  const l=(S&&S.coachSpells)||[];
  for(let i=l.length-1;i>=0;i--) if(l[i] && l[i].fim==null) return l[i];
  return null;
}
function coachSpellAbrir(clubId, motivo){
  if(!S) return null;
  S.coachSpells=S.coachSpells||[];
  const c=(typeof anyClubOf==='function'&&anyClubOf(clubId))||(typeof clubOf==='function'&&clubOf(clubId))||{};
  const sp={ clubId, curto:(c.short||c.name||String(clubId)), divisao:S.division,
    inicio:{season:S.season||1, round:S.round||0}, fim:null, motivo:motivo||'contratado',
    tot:{P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0}, marca:_spellTabelaDe(clubId), titulos:[] };
  S.coachSpells.push(sp);
  return sp;
}
/* soma ao total da passagem o que ela rendeu desde a marca, e re-marca no ponto atual */
function coachSpellAcumular(sp){
  sp=sp||coachSpellAtual(); if(!sp) return;
  /* UMA VEZ POR TEMPORADA. endSeason pode correr mais do que uma vez no mesmo ano (fecho normal,
     virada da Resenha, retomar um save fechado) e sem esta trava a passagem contava os mesmos
     jogos outra vez -- o aproveitamento subia sozinho a cada recarga. */
  if(sp._accSeason===(S.season||1)) return;
  sp._accSeason=(S.season||1);
  const ag=_spellTabelaDe(sp.clubId), m=sp.marca||{};
  ['P','W','D','L','GF','GA','Pts'].forEach(k=>{
    sp.tot[k]=(sp.tot[k]||0)+Math.max(0,(ag[k]||0)-(m[k]||0));
  });
  sp.marca={P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0};   // temporada nova comeca do zero
}
function coachSpellFechar(motivo){
  const sp=coachSpellAtual(); if(!sp) return null;
  const ag=_spellTabelaDe(sp.clubId), m=sp.marca||{};
  ['P','W','D','L','GF','GA','Pts'].forEach(k=>{
    sp.tot[k]=(sp.tot[k]||0)+Math.max(0,(ag[k]||0)-(m[k]||0));
  });
  sp.fim={season:S.season||1, round:S.round||0};
  sp.desfecho=motivo||'saiu';
  return sp;
}
/* TITULO CARIMBADO NA HORA, nao so no fim da temporada. Uma taca de copa ganha em maio ficava
   invisivel ate a temporada fechar — a Sala, a Carreira e a Historia so soubessem dela meses
   depois. `comp` e a chave da competicao ou a divisao. */
/* ===== "VICE-CAMPEAO" CONTEM "CAMPEAO" =====
   Quem perde a final recebe de cupEliminationPhrase a frase 'Vice-campeao', e o teste que
   decidia se havia titulo era `/campe/i.test(v)` -- que da VERDADE para 'Vice-campeao'. Cinco
   sitios usavam essa regra: a Sala de Trofeus, a contagem de tacas, os clubes treinados, o
   arquivo da temporada e -- o pior -- o fecho da temporada, que GRAVA o titulo na passagem do
   treinador. Foi assim que uma Libertadores perdida na final virou taca na estante.
   O motor so escreve uma palavra para quem ganha, e e esta. Qualquer outra coisa -- vice,
   eliminado, fase de grupos -- nao e titulo. */
function foiCampeao(v){
  const t=String(v==null?'':v).trim().toLowerCase();
  if(!t || t.indexOf('vice')>=0) return false;
  return t==='campeão' || t==='campeao';
}
function coachSpellTitulo(comp){
  const sp=coachSpellAtual(); if(!sp || !comp) return false;
  sp.titulos=sp.titulos||[];
  const ja=sp.titulos.some(t=>t.comp===comp && t.season===(S.season||1));
  if(ja) return false;
  sp.titulos.push({comp, season:S.season||1});
  return true;
}
/* saves anteriores a este registo: reconstroi o que da a partir de S.history (uma passagem por
   clube, do primeiro ao ultimo ano em que ele aparece). Passagem que acabou a meio de uma
   temporada nao esta la e nao ha como inventar — mas a partir daqui fica tudo registado. */
/* ===== TIRA DA ESTANTE O QUE NUNCA FOI GANHO =====
   O fecho da temporada ja gravou titulos a mais nos saves existentes (ver foiCampeao), e isso
   fica no disco: nao adianta so corrigir o teste daqui para a frente. Esta passagem re-julga
   cada titulo gravado contra o que a temporada de facto registou -- `myCups` daquele ano para
   as copas, `myPos===1` para a divisao -- e apaga o que nao se sustenta. So apaga o que
   consegue DESMENTIR: titulo sem registo daquele ano fica onde esta, porque nao ha como saber.
   Corre uma vez por save (carimbo em S._vicesLimpos). */
function coachSpellsLimparVices(){
  if(!S || S._vicesLimpos) return;
  S._vicesLimpos=1;
  const hist=Array.isArray(S.history)?S.history:[];
  const doAno=(season,clubId)=>hist.filter(h=>h && String(h.season)===String(season)
      && (clubId==null || h.clubId==null || String(h.clubId)===String(clubId))).pop()||null;
  let tirados=0;
  (Array.isArray(S.coachSpells)?S.coachSpells:[]).forEach(sp=>{
    if(!sp || !Array.isArray(sp.titulos)) return;
    sp.titulos=sp.titulos.filter(t=>{
      if(!t || !t.comp) return true;
      const h=doAno(t.season, sp.clubId);
      if(!h) return true;                                   // sem registo do ano: nao da para desmentir
      if(/^serie/i.test(t.comp)) return h.myPos===1 || h.myPos==null;
      const v=(h.myCups||{})[t.comp];
      if(v==null) return true;                              // a copa nao ficou registada nesse ano
      const ok=foiCampeao(v);
      if(!ok) tirados++;
      return ok;
    });
  });
  if(tirados) console.warn('sala de troféus: '+tirados+' título(s) removido(s) — eram vice-campeonatos.');
}
function coachSpellsMigrar(){
  if(!S) return;
  coachSpellsLimparVices();
  if(Array.isArray(S.coachSpells) && S.coachSpells.length) return;
  S.coachSpells=[];
  const porClube={};
  ((S.history)||[]).forEach(h=>{
    if(!h || h.clubId==null) return;
    const k=String(h.clubId);
    porClube[k]=porClube[k]||{clubId:h.clubId, anos:[], tot:{P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0}, titulos:[]};
    porClube[k].anos.push(h.season);
    if(h.myPos===1 && h.division) porClube[k].titulos.push({comp:'serie'+h.division, season:h.season});
    Object.entries(h.myCups||{}).forEach(([c,v])=>{ if(foiCampeao(v)) porClube[k].titulos.push({comp:c, season:h.season}); });
  });
  Object.values(porClube).forEach(x=>{
    const c=(typeof anyClubOf==='function'&&anyClubOf(x.clubId))||{};
    const de=Math.min.apply(null,x.anos), ate=Math.max.apply(null,x.anos);
    S.coachSpells.push({ clubId:x.clubId, curto:(c.short||c.name||String(x.clubId)), divisao:null,
      inicio:{season:de,round:0}, fim:(String(x.clubId)===String(S.clubId))?null:{season:ate,round:0},
      motivo:'contratado', desfecho:(String(x.clubId)===String(S.clubId))?null:'saiu',
      tot:x.tot, marca:_spellTabelaDe(x.clubId), titulos:x.titulos, reconstruida:true });
  });
  if(!coachSpellAtual() && S.clubId!=null) coachSpellAbrir(S.clubId,'contratado');
}
function applyManagerJobChange(newClubId, newDivision, newCountry){
  // FASE 4: troca de PAÍS — o universo primário passa a ser o do novo clube; o país antigo
  // vira liga de fundo (e o novo país sai do fundo). Materializa o novo clube no primário.
  const oldCountry = S.intlUniverse || 'Brasil';
  const crossCountry = !!newCountry && newCountry!==oldCountry;
  // o marcador de humano acompanha o treinador pro novo clube (o clube antigo volta a ser CPU)
  const oldClubId=S.clubId, mgrName=(CL.humans&&CL.humans[oldClubId])||CL.mgr;
  /* a passagem que termina aqui fica registada com os numeros dela — ver coachSpells acima */
  /* O DESFECHO DA PASSAGEM DIZ COMO ELA ACABOU. Era sempre 'saiu' — a Carreira mostrava
     "encerrado" mesmo quando o treinador tinha sido posto na rua. Quem sabe a diferença é quem
     chama (ver clAcceptJob e enterResenhaUnemployment), e diz-lo por este sinalizador. */
  const _motivoSaida = S._saidaPorDemissao ? 'demitido' : 'saiu';
  S._saidaPorDemissao=false;
  try{ coachSpellsMigrar(); coachSpellFechar(_motivoSaida); }catch(e){ console.warn('passagem:', e&&e.message); }
  if(CL.humans && oldClubId!=null){ delete CL.humans[oldClubId]; if(mgrName) CL.humans[newClubId]=mgrName; }
  if(crossCountry){
    setUniverse(uniKeyOf(newCountry));
    S.intlUniverse = uniKeyOf(newCountry)==='brasil' ? false : newCountry;
    const nc = clubOf(newClubId) || bgClubById(newClubId);
    if(nc){ S.clubPool=S.clubPool||{}; S.clubPool[newClubId]=nc;
      if(!S.squads[newClubId]) S.squads[newClubId]=gkSquad(nc).map(p=>attachAttrs(initStats({...p}))); }
    const set=new Set((S.bgCountries||[]).filter(c=>c!==newCountry)); set.add(oldCountry);
    S.bgCountries=[...set];
  }
  const sameDivision = !crossCountry && newDivision===S.division;
  S.clubId=newClubId; CL.clubId=newClubId;
  try{ coachSpellAbrir(newClubId,'contratado'); }catch(e){ console.warn('passagem nova:', e&&e.message); }
  if(!sameDivision){
    // A divisão de destino JÁ EXISTE e está em andamento — S.otherDivs a simula em segundo plano
    // com tabela e calendário próprios. Adotá-la preserva a rodada e a classificação.
    // Antes este caminho recriava calendário e tabela do zero e fazia S.round=0: trocar de clube
    // no MEIO da temporada zerava o campeonato inteiro na tela do jogador (a "temporada zerando").
    // Mesma troca que o applyViewerDivision faz no online; só a troca de PAÍS continua recriando
    // o universo, porque ali as divisões são realmente outras.
    const od=(S.otherDivs||{})[newDivision];
    const podeAdotar = !crossCountry && od && od.table && od.table[newClubId] && od.sched && od.sched.length;
    if(podeAdotar){
      S.otherDivs[S.division]={ clubs:Object.keys(S.table||{}).map(id=>({id})), sched:S.sched, table:S.table };
      S.division=newDivision;
      const allClubs=ensureDivisionClubs(newDivision);
      const ids=Object.keys(od.table);
      DATA.clubs=ids.map(id=>(allClubs||[]).find(c=>c.id===id)||clubOf(id)||bgClubById(id)).filter(Boolean);
      DATA.clubs.forEach(c=>{ if(!S.squads[c.id]) S.squads[c.id]=gkSquad(c).map(p=>attachAttrs(initStats({...p}))); });
      S.table=od.table; S.sched=od.sched;      // campeonato em andamento, intacto (S.round preservado)
      delete S.otherDivs[newDivision];
      S._promoRelegNews=null;
      if(typeof syncDivisionClubsFromTables==='function') syncDivisionClubsFromTables();
    } else {
      S.division=newDivision;
      const allClubs=ensureDivisionClubs(newDivision);
      const others=allClubs.filter(c=>c.id!==newClubId).slice(0,DIVISION_SIZE[newDivision]-1);
      DATA.clubs=[clubOf(newClubId)||bgClubById(newClubId), ...others].filter(Boolean);
      DATA.clubs.forEach(c=>{ if(!S.squads[c.id]) S.squads[c.id]=gkSquad(c).map(p=>attachAttrs(initStats({...p}))); });
      const ids=DATA.clubs.map(c=>c.id);
      S.sched=makeSchedule(ids); S.round=0;
      S.table={}; DATA.clubs.forEach(c=>S.table[c.id]={id:c.id,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0});
      S._promoRelegNews=null;
      buildOtherDivisions();
      if(crossCountry) initBgLeagues(); // recria as ligas de fundo (país antigo entra, novo sai)
    }
  }
  squad(newClubId).forEach(p=>{ if(!p.contract) p.contract=defaultContract(p); });
  S.xi=autoXI(newClubId);
  // caixa ao trocar de clube = faixa da nova divisão (item 4)
  S.budget=REBAL.budget(S.division, makeRng(hashSeed(S.seed,'budget',newClubId,S.season)));
  // inicializa salário do treinador baseado no overall do clube
  const clubOverallVal=clubOverall(newClubId);
  S.coachSalary=Math.round(100000 + clubOverallVal*5000); // salário base + bonus por força do clube
  S.roundsSinceFired=null; // resetar contador de rodadas desde demissão
  S.pendingJobOffers=[]; // limpar ofertas anteriores
  S.negos=[]; S.auctions={round:S.round,lots:[]};
  // novo clube, novas contas — sem isso a aba Finanças ia misturar salário/receita do
  // clube antigo com o novo (mesmo bug de sincronização, outro gatilho: troca de clube
  // no meio da temporada por demissão/proposta, não só virada de temporada).
  S.finances=[]; S.seasonTotals={income:0,salaries:0,bonuses:0,opex:0,playerSales:0,playerPurchases:0,stadium:0};
  S.jobSecurity=60;
  CL.tacticChosen=false; CL.formation=null; CL.selPlayer=squad(newClubId)[0]?.pid||null; // pid (não nome): CL.selPlayer é comparado com p.pid em todo lugar
  advanceAuctions();
}
/* ===== REPARO DO SAVE QUIMERA =====
   A troca de pais que explodia no meio (ver makeRawPlayer, 20/08) deixou saves com o rotulo de
   um pais e o mundo de outro: S.division='PL', intlUniverse='Inglaterra', e a tabela/calendario
   ainda do Brasil — o treinador do Manchester City vendo o mundo brasileiro para sempre. O
   diagnostico e um so: O MEU CLUBE NAO ESTA EM LUGAR NENHUM DO MUNDO (nem na ancora, nem nas
   outras divisoes). Nesse estado o reparo reconstrui a temporada na liga do clube — o mesmo
   caminho da troca de pais que deveria ter completado (a tabela recomeca; a que existia era a
   do Brasil, que nunca foi dele). Roda no carregar do save, solo apenas, e so quando doente. */
function repararMundoQuimera(){
  try{
    if(typeof CL!=='undefined' && CL.online) return false;
    if(!S || !S.clubId) return false;
    if(S.table && S.table[S.clubId]) return false;               // o mundo contem o meu clube: são
    const od=S.otherDivs||{};
    for(const d in od){ if(od[d]&&od[d].table&&od[d].table[S.clubId]) return false; } // applyViewerDivision resolve
    const uni=(typeof universoDoClube==='function')?universoDoClube(S.clubId):'brasil';
    if(typeof setUniverse==='function') setUniverse(uni);
    S.intlUniverse = uni==='brasil' ? false
      : ((typeof UNI_CONFIGS!=='undefined'&&UNI_CONFIGS[uni]&&UNI_CONFIGS[uni].country)||uni);
    const div = (S.division && DIV_ORDER.indexOf(S.division)>=0) ? S.division : DIV_ORDER[0];
    S.division=div;
    const allClubs=ensureDivisionClubs(div);
    const others=allClubs.filter(c=>c.id!==S.clubId).slice(0,DIVISION_SIZE[div]-1);
    DATA.clubs=[clubOf(S.clubId)||bgClubById(S.clubId), ...others].filter(Boolean);
    DATA.clubs.forEach(c=>{ if(!S.squads[c.id]) S.squads[c.id]=gkSquad(c).map(p=>attachAttrs(initStats({...p}))); });
    const ids=DATA.clubs.map(c=>c.id);
    S.sched=makeSchedule(ids); S.round=0;
    S.table={}; DATA.clubs.forEach(c=>S.table[c.id]={id:c.id,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0});
    S._promoRelegNews=null;
    /* os RESULTADOS do mundo antigo ficam para tras: a temporada recomecou, e a rodada 0 velha
       do Brasil empatava com a rodada 0 nova da liga do clube na tela de pos-rodada. A
       artilharia da temporada tambem — era a da liga que ja nao e a dele. */
    S.results=[]; S.scorers={};
    buildOtherDivisions();
    initBgLeagues();
    S.xi=(typeof autoXI==='function')?autoXI(S.clubId):S.xi;
    console.warn('mundo quimera reparado: temporada reconstruida em '+uni+' ('+div+')');
    return true;
  }catch(e){ console.warn('reparo quimera:', e&&e.message); return false; }
}
let DIV_LABEL_FULL={A:'Série A',B:'Série B',C:'Série C',D:'Série D'}; // reatribuído por setUniverse()
/* ===== DEMITIDO: ESCOLHER CLUBE NAO E OPCIONAL =====
   Este modal era um modal comum, com as tres saidas de sempre (X, clique fora, Esc). Fechado sem
   escolher, o treinador continuava no clube que o acabara de despedir e o jogo seguia como se
   nada fosse — a demissao virava um aviso que se podia ignorar. Foi o relatado a 18/08.
   Duas travas, porque uma sozinha nao chega:
     · `obrigatorio` fecha as tres saidas (ver overlayC em ui/main.js);
     · a lista fica no SAVE. Recarregar a pagina esvazia o CL e levava a demissao com ela — F5
       era a quarta saida, e a mais silenciosa de todas. Com a lista no save, ela volta a aparecer
       (ver checkPendingManagerEvents). A escolha e que a apaga.
   Trocar de clube aqui NAO recomeca a temporada: applyManagerJobChange adota a divisao de destino
   em andamento e preserva S.round — o treinador cai na mesma jornada, no clube novo. */
function showFiredModal(options){
  const rows=options.map((o,i)=>{ const c=clubOf(o.clubId);
    return `<div class="cl-jobopt" onclick="clAcceptJob(${i})">
      <span class="cl-jobopt-club" style="${clubStripe(c)}">${escC(c.short)}</span>
      <span class="cl-jobopt-div">${DIV_LABEL_FULL[o.division]}</span>
    </div>`; }).join('');
  CL._jobOptions=options;
  S._demissaoPendente=options.map(o=>({clubId:o.clubId, division:o.division}));
  overlayC(dlg('Você foi demitido!', `<div class="cl-jobmodal">
    <div class="cl-jobmodal-msg">Os resultados recentes custaram seu cargo.
      <b>Escolha o seu próximo clube para continuar</b> — você assume ainda nesta jornada.</div>
    <div class="cl-joboptlist">${rows}</div>
  </div>`, {w:560,bodyClass:'cl-body-red',obrigatorio:true}), {obrigatorio:true});
}
function clAcceptJob(idx){
  const opt=(CL._jobOptions||S._demissaoPendente||[])[idx]; if(!opt) return;
  /* ===== SER DEMITIDO FAZ PARTE DA CARREIRA =====
     Este caminho registava só a contratação seguinte: a Carreira do treinador mostrava uma
     sequência de clubes como se cada mudança tivesse sido escolha dele, e a demissão — que é o
     acontecimento que ele lembra — não estava em lado nenhum. Só a Resenha a escrevia (ver
     enterResenhaUnemployment), então o mesmo facto existia num modo e não no outro.
     Duas coisas ficam registadas, e as duas já têm lugar na tela: a linha no histórico (o ícone
     🚪 de COACH_HIST_ICON existe desde sempre, sem ninguém que o produzisse no solo) e o desfecho
     da PASSAGEM pelo clube, que passa a fechar como 'demitido' em vez de 'saiu'. */
  const _saiDe=clubOf(S.clubId);
  S.coachHistory=S.coachHistory||[];
  S.coachHistory.push({season:S.season, type:'demissao',
    text:`Demitido pelo ${String((_saiDe&&_saiDe.short)||'clube').toUpperCase()}`});
  S._saidaPorDemissao=true;                      // consumido por applyManagerJobChange
  applyManagerJobChange(opt.clubId, opt.division);
  S.coachHistory.push({season:S.season, type:'contratado', text:`Contratado pelo ${clubOf(opt.clubId).short.toUpperCase()}`});
  CL._jobOptions=null; S._demissaoPendente=null;
  clCloseOverlay(); saveV3(); cdraw();
}
/* O convite de outro clube virou um fluxo de 3 etapas (jantar -> proposta -> boas-vindas), que
   mora na UI junto da tela de boas-vindas que ele reaproveita — ver showJobInvite em
   ui/main.js. Aqui fica só a porta de entrada, pra não duplicar o caminho: quem chamava este
   modal (checkPendingManagerEvents, abaixo) continua chamando a mesma função. */
function showJobOfferModal(offer){
  if(typeof showJobInvite==='function') return showJobInvite(offer);
  CL._jobOffer=offer; // rede de segurança: se a UI não carregou, ao menos não perde a oferta
}
function checkPendingManagerEvents(){
  /* DEMISSAO POR RESOLVER VEM ANTES DE TUDO — e sobrevive ao recarregar da pagina, porque a lista
     mora no save e nao no CL (ver showFiredModal). */
  if(Array.isArray(S._demissaoPendente) && S._demissaoPendente.length && !CL._jobOptions){
    showFiredModal(S._demissaoPendente); return;
  }
  if(CL._pendingManagerEvent){
    const ev=CL._pendingManagerEvent; CL._pendingManagerEvent=null;
    if(ev.kind==='fired') showFiredModal(ev.options); else showJobOfferModal(ev.offer);
    return;   // demitido ou sondado tem precedência: o aviso de crise não faz sentido por cima
  }
  // CLUBE EM CRISE: aviso quando a Segurança no cargo cai na faixa de risco. Entra pela mesma
  // fila dos outros momentos, então nunca aparece por cima de outro modal.
  if(typeof enfileirarMomentoCrise==='function'){
    enfileirarMomentoCrise();
    if(typeof momentoSeguinte==='function' && typeof MOMENTO_FILA!=='undefined' && MOMENTO_FILA.length) momentoSeguinte();
  }
}

function sortTableRows(table){
  return Object.values(table||{}).sort((a,b)=> b.Pts-a.Pts || (b.GF-b.GA)-(a.GF-a.GA) || b.GF-a.GF || String(a.id).localeCompare(String(b.id)) );
}
function sortedTable(){ return sortTableRows(S.table); }
function tablePos(id){return sortedTable().findIndex(t=>t.id===id)+1;}
function applyResult(h,a,hg,ag){
  const T=S.table; T[h].P++;T[a].P++;T[h].GF+=hg;T[h].GA+=ag;T[a].GF+=ag;T[a].GA+=hg;
  if(hg>ag){T[h].W++;T[a].L++;T[h].Pts+=3;}
  else if(hg<ag){T[a].W++;T[h].L++;T[a].Pts+=3;}
  else{T[h].D++;T[a].D++;T[h].Pts++;T[a].Pts++;}
}
/* ===== ARTILHARIA POR COMPETICAO =====
   S.scorers e UM pote so: gol de liga e gol de copa caem no mesmo balde desde sempre (e tem de
   continuar a cair, porque o "Gols nesta temporada" da ficha soma tudo). Isso torna impossivel
   dizer quem foi o artilheiro DA Libertadores ou DA Copa do Brasil — a pergunta nao tinha
   resposta no estado.
   Agora cada gol tambem e carimbado na competicao em que caiu, num mapa a parte. O pote antigo
   nao muda; este e um segundo livro, so para leitura. `comp` e a chave da competicao
   (copaBrasil, libertadores...) ou a divisao ('A'..'D') quando e jogo de liga.
   Save antigo nao tem o mapa: quem le trata a ausencia como "nao sei", nunca como zero. */
function recordScorers(scorers, comp){
  scorers.forEach(s=>{S.scorers[s.name]=(S.scorers[s.name]||0)+1;});
  if(!comp) return;
  S.scorersByComp=S.scorersByComp||{};
  const m=S.scorersByComp[comp]=S.scorersByComp[comp]||{};
  scorers.forEach(s=>{ m[s.name]=(m[s.name]||0)+1; });
}
/* artilheiro de UMA competicao: [nome, gols] ou null quando nao ha registo (save antigo,
   competicao que ainda nao teve gol) */
function topScorerOf(comp){
  const m=(S.scorersByComp&&S.scorersByComp[comp])||null;
  if(!m) return null;
  const e=Object.entries(m).sort((a,b)=>b[1]-a[1])[0];
  return e||null;
}
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
    const sq=gkSquad(c).map(p=>attachAttrs({...p,moral:70,energy:100,stats:{r3:[],g3:[],apps:0,goals:0,cs:0},contract:defaultContract(p)}));
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
/* Nota no fallback local da rodada online (quando a edge function não responde). Até 2026-08-06
   esta cópia tinha DIVERGIDO da do solo: não descontava cartão nem lesão, então a mesma partida
   dava nota diferente conforme o servidor estivesse de pé ou não. Agora chama a mesma conta
   compartilhada (ME.rateAppearances) que o solo e o servidor usam.
   caps = súmula de minutos da partida; sem ela, o XI inteiro com o jogo cheio (comportamento
   antigo, que aqui é o certo — este caminho não tem substituição em jogo). */
function mpRate(xi,gf,ga,scorers,cid,R,myPerf,oppPerf,caps,matchMinutes){
  const ME=(typeof MATCH_ENGINE!=='undefined')?MATCH_ENGINE:null; if(!ME) return;
  const total=matchMinutes||90;
  const byKey=new Map((caps||[]).map(c=>[(c.pid!=null?c.pid:c.n), c.mins]));
  const lista=xi.map(p=>({p, mins: byKey.size ? (byKey.get(p.pid!=null?p.pid:p.n)||0) : total}))
                .filter(x=>x.mins>0);
  const notas=ME.rateAppearances({
    players:lista.map(x=>({pid:x.p.pid, n:x.p.n, s:x.p.s, f:x.p.f, mins:x.mins})),
    matchMinutes:total, gf, ga, clubId:cid, scorers:scorers||[],
    incidents:(typeof S!=='undefined'&&S&&S._roundIncidents)||{}, myPerf, oppPerf, R });
  notas.forEach((nota,i)=>{
    const p=lista[i].p;
    const st=p.stats||(p.stats={r3:[],g3:[],apps:0,goals:0,cs:0});
    st.r3.push(nota.r);if(st.r3.length>3)st.r3.shift();
    st.g3.push(nota.goals);if(st.g3.length>3)st.g3.shift();
    st.apps++;st.goals+=nota.goals;if(nota.cs)st.cs++;
  });
}
function mpFinances(state,cid,xi,gf,ga,scorers){
  const cl=DATA.clubs.find(c=>c.id===cid);const won=gf>ga,draw=gf===ga;
  const base=Math.round(baseIncome(cl.overall));
  const income=base+Math.round(base*(won?REBAL.WIN_BONUS:draw?REBAL.DRAW_BONUS:0)); // mesmas constantes de processFinances
  let salaries=0,bonuses=0;const started=new Set(xi.map(p=>p.pid));
  state.squads[cid].forEach(p=>{
    if(!p.contract)return;const c=p.contract;salaries+=c.salary;
    if(c.bonusGoal){const g=scorers.filter(s=>s.id===cid&&s.name===p.n).length;
      const csb=(ga===0&&(p.s==='GK'||p.s==='DEF')&&started.has(p.pid))?1:0;bonuses+=(g+csb)*Math.max(1000,Math.round(c.salary));}
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
function mpSortTable(state){return Object.values(state.table).sort((a,b)=>b.Pts-a.Pts||(b.GF-b.GA)-(a.GF-a.GA)||b.GF-a.GF||String(a.id).localeCompare(String(b.id)));}

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

function playRound(userResult, humanResults){
  humanResults=humanResults||{}; // FASE 2: {fxKey: {hg,ag,scorers,perf,events}} — partidas jogadas ao vivo por OUTROS humanos (hotseat), aplicadas em vez de simuladas
  const bgRoundIdx=S.round; // FASE 2: índice da rodada SENDO jogada (antes do S.round++) — as ligas de fundo têm que usar o MESMO índice que buildHumanQueue usou, senão o resultado do humano não bate com a partida
  if(S.seed==null) S.seed=(Math.random()*0x7fffffff)>>>0; // legacy-save guard
  // COPA ANTES DA LIGA, NA MESMA SEMANA. Isto rodava LÁ EMBAIXO, depois do S.round++ — ou seja, a
  // copa da semana N era resolvida como efeito colateral da rodada de liga da semana N-1, e o
  // tique ficava numerado uma semana à frente de onde o jogador de fato jogava a partida
  // (pendingUserCupMatches olhava S.round+1 pra compensar). Era essa defasagem que fazia o
  // Calendário anunciar a copa numa jornada e ela acontecer noutra — e é ela que impedia o dia de
  // virar unidade de sincronia: não dava pra datar os dois jogos da semana sem inverter a ordem.
  // Agora a semana tem ordem própria (quarta = copa, fim de semana = liga): o avanço da copa da
  // semana N acontece aqui, no começo da rodada N, ANTES da partida de liga — que é a ordem em que
  // o jogador já joga (clJogar enfileira a copa antes de liberar a liga). A partida que ele jogou
  // ao vivo já está gravada no confronto e é PULADA aqui (ver advanceCupBracket).
  /* AS NOTÍCIAS DA RODADA ZERAM ANTES DO AVANÇO DAS COPAS, não depois.
     Estavam a ser zeradas DEPOIS de advancePendingCups(), então tudo o que o avanço de copa
     escrevesse em S.roundNews era apagado na linha seguinte, sem deixar rasto. Foi encontrado ao
     ligar o aviso de "rodada de copa resolvida sem ter sido assistida": o console mostrava, os
     relatórios não. Vale para qualquer notícia gerada ali, não só para esta. */
  S.roundNews=[];
  advancePendingCups();
  const uf=userFixture();
  const Rr=makeRng(hashSeed(S.seed,S.round,'post')); // deterministic post-match stream
  // capture who started THIS round before energy changes (for finances/enforcement)
  const startedNames = new Set(playedXI(S.clubId).map(p=>p.pid)); // pids
  /* SÚMULA DA RODADA: clubId -> [{pid,n,mins}] de quem entrou em campo, e quantos minutos teve a
     partida. Alimenta nota, energia, moral e o flag "jogou" da evolução — os quatro liam o onze
     do FIM da partida e, com isso, ignoravam quem saiu no meio e davam crédito cheio a quem
     entrou faltando pouco. Uma partida por clube por rodada, então o mapa não colide. */
  const roundCaps={}, roundMins={};
  const noteCaps=(h,a,r)=>{ const c=r&&r.caps; const t=(r&&r.matchMinutes)||90;
    if(c){ if(c.H) roundCaps[h]=c.H; if(c.A) roundCaps[a]=c.A; }
    roundMins[h]=t; roundMins[a]=t; };
  const capsOf=cid=>roundCaps[cid]||null;
  if(uf&&userResult){ const [h,a]=uf; const uev=(typeof simEvents==='function')?simEvents(h,a,matchSeed(h,a)).events:undefined; applyResult(h,a,userResult.hg,userResult.ag); recordScorers(userResult.scorers, S.division);
    noteCaps(h,a,userResult);
    const Rm=makeRng(hashSeed(matchSeed(h,a),'rate'));
    const mm=userResult.matchMinutes||90;
    ratePlayers(h,userResult.hg,userResult.ag,userResult.scorers,Rm,userResult.perf&&userResult.perf.H,userResult.perf&&userResult.perf.A,capsOf(h),mm); ratePlayers(a,userResult.ag,userResult.hg,userResult.scorers,Rm,userResult.perf&&userResult.perf.A,userResult.perf&&userResult.perf.H,capsOf(a),mm);
    S.results.push({round:S.round,h,a,hg:userResult.hg,ag:userResult.ag,user:true,scorers:userResult.scorers||[],events:uev}); postMatchMorale(userResult,h,a,capsOf(S.clubId)); }
  currentFixtures().forEach(([h,a])=>{
    if(uf&&(h===uf[0]&&a===uf[1]))return;
    // FASE 2: se OUTRO humano (hotseat) jogou esta partida ao vivo, aplica o resultado dele em vez de simular
    const hr=humanResults[h+'-'+a];
    if(hr){ applyResult(h,a,hr.hg,hr.ag); recordScorers(hr.scorers||[], S.division);
      noteCaps(h,a,hr);
      const Rmh=makeRng(hashSeed(matchSeed(h,a),'rate'));
      const mmh=hr.matchMinutes||90;
      ratePlayers(h,hr.hg,hr.ag,hr.scorers,Rmh,hr.perf&&hr.perf.H,hr.perf&&hr.perf.A,capsOf(h),mmh); ratePlayers(a,hr.ag,hr.hg,hr.scorers,Rmh,hr.perf&&hr.perf.A,hr.perf&&hr.perf.H,capsOf(a),mmh);
      S.results.push({round:S.round,h,a,hg:hr.hg,ag:hr.ag,scorers:hr.scorers||[],events:hr.events,human:true});
      return; }
    const ms=matchSeed(h,a);
    const r=(typeof simEvents==='function')?simEvents(h,a,ms):quickSim(h,a,ms); applyResult(h,a,r.hg,r.ag); recordScorers(r.scorers, S.division);
    noteCaps(h,a,r);
    const Rm=makeRng(hashSeed(ms,'rate'));
    const mm=r.matchMinutes||90;
    ratePlayers(h,r.hg,r.ag,r.scorers,Rm,r.perf&&r.perf.H,r.perf&&r.perf.A,capsOf(h),mm); ratePlayers(a,r.ag,r.hg,r.scorers,Rm,r.perf&&r.perf.A,r.perf&&r.perf.H,capsOf(a),mm);
    S.results.push({round:S.round,h,a,hg:r.hg,ag:r.ag,scorers:r.scorers||[],events:r.events});
  });
  processFinances(userResult,uf,startedNames);
  enforceRoles(startedNames);
  europeRaids(Rr);
  // recover energy, drift morale toward 70
  Object.values(S.squads).flat().forEach(p=>{p.energy=clamp(p.energy+Rr.rnd(6,16),0,100);p.moral=clamp(p.moral+(70-p.moral)*0.08,0,100);});
  /* CANSAÇO proporcional aos minutos: quem saiu no intervalo gasta metade do que gastaria em 90.
     Antes isto lia xiPlayers(S.clubId) — o onze do FIM —, então o titular substituído não
     cansava nada e o reserva que entrou aos 85' cansava como se tivesse jogado tudo. */
  capsDrain(S.clubId, capsOf(S.clubId), roundMins[S.clubId]||90, Rr);
  // player development / decline (deterministic)
  const Rd=makeRng(hashSeed(S.seed,S.round,'dev'));
  Object.keys(S.squads).forEach(cid=>{
    /* "jogou" pra evolução = entrou em campo, não "estava no onze do fim". Sem isto o titular
       substituído no intervalo levava benchStreak++ (perda de ritmo por ficar no banco) numa
       rodada em que jogou 45 minutos, e o reserva que entrou não ganhava o caminho de evolução
       por jogar. Usa a súmula quando existe; senão, o fallback de sempre. */
    const caps=capsOf(cid);
    const played=new Set(caps && caps.length
      ? caps.map(c=>c.n)
      : (cid===S.clubId?xiPlayers(cid):squad(cid).slice().sort((a,b)=>b.f-a.f).slice(0,11)).map(p=>p.n));
    S.squads[cid].forEach(p=>evolvePlayer(p,Rd,played.has(p.n)));
  });
  S.round++; S.week++; S.day+=7;
  advanceNegos();
  executePendingTransfers(); // pré-acordos entram em vigor quando a janela abre
  applyCpuRoundCash();        // caixa dos rivais anda TODA rodada — o mercado abaixo depende dele
  cpuBackgroundTransfers(Rr); // mercado entre CPUs — dá vida ao jogo mesmo sem o usuário negociar
  bgCpuTransfers(Rr); // clubes das ligas de background negociam entre si (compra/venda)
  generateIncomingOffers(Rr); // clubes fazem propostas de compra pelos jogadores do usuário
  advanceAuctions(Rr); // leilão competitivo: CPU dá lances, resolve lotes vencidos e repõe o pool
  rollStory(Rr);
  advanceBgLeagues(humanResults, bgRoundIdx); // ligas dos outros países selecionados rodam junto, no background (humanos hotseat entram aqui) — mesmo índice de rodada do primário
  /* A TEMPORADA ESPERA AS FINAIS. A liga acabou — mas se alguma copa ficou devendo rodada, a
     temporada ganha jornadas extras pra essas rodadas serem jogadas, em vez de virar por cima
     delas (ver prorrogarPorCopasPendentes em world-rules.js). Não é trava: se o teto de
     prorrogação estourar, a temporada vira assim mesmo, com aviso — jogo parado é pior que
     final perdida. */
  if(S.round>=S.sched.length){
    const extras=prorrogarSeFaltaCopa();
    if(!extras) endSeason();
  }
  S._roundIncidents={};
  save();
}
/* pay wages, goal/CS bonuses, 50%-matches bonus; collect matchday income.
   gateOverride (F3.3): bilheteria já capturada (quando CL.live não existe mais, ex.: aplicar as
   finanças ao ADOTAR a rodada resolvida pelo servidor). Se null, lê de CL.live como antes. */
function processFinances(userResult,uf,startedNames,gateOverride){
  const cl=clubOf(S.clubId);
  let gf=0,ga=0,won=false,draw=false;
  if(uf&&userResult){ const home=uf[0]===S.clubId; gf=home?userResult.hg:userResult.ag; ga=home?userResult.ag:userResult.hg; won=gf>ga; draw=gf===ga; }
  // bônus de vitória PROPORCIONAL à receita-base do clube. Era R$500k fixo pra todo mundo, o que
  // significava 9% da receita de um clube da Série A e 40% da de um da Série D — uma vitória na D
  // pagava 8x a folha semanal inteira, e era esse o combustível do caixa infinito nas divisões
  // de baixo (ver REBAL.income).
  const base=Math.round(baseIncome(cl.overall));
  const winBonus=Math.round(base*(won?REBAL.WIN_BONUS:draw?REBAL.DRAW_BONUS:0));
  // bilheteria: quando o usuário joga em casa nesta rodada, a renda de bilheteria de VERDADE
  // (público × preço, calculada em attendanceFor/buildLiveMatchObject — sensível à capacidade
  // do estádio expandido) é a receita da rodada, em vez da fórmula-base por força do elenco.
  // Antes essas duas rendas eram somadas separadamente (bilheteria ia direto pro S.budget, fora
  // do ledger de Finanças) — resultado: expandir o estádio não aparecia na aba Finanças, e a
  // renda mostrada lá nunca batia com o total real de caixa.
  let gate=null;
  if(gateOverride!=null) gate=gateOverride;                        // F3.3: bilheteria já capturada (fluxo server-adopt)
  else if(uf && uf[0]===S.clubId && CL.live && CL.live.matches){
    const um=CL.live.matches.find(m=>m.h===uf[0]&&m.a===uf[1]);
    if(um) gate=um.att*um.price;
  }
  // item 4: receita = base (TV/patrocínio, por overall, SEMPRE) + bilheteria REAL quando joga em
  // casa + bônus de vitória. Antes a bilheteria SUBSTITUÍA a base em casa, o que deixava as rodadas
  // em casa mais pobres que as de fora (bilheteria << base) e inviabilizava os clubes grandes.
  const income=base + (gate!=null?gate:0) + winBonus;
  let salaries=0,bonuses=0,log=[];
  squad(S.clubId).forEach(p=>{
    if(!p.contract)return; const c=p.contract; salaries+=c.salary;
    if(c.bonusGoal){
      // bônus de gol/clean sheet = 1 semana de salário do jogador. Antes era R$50k fixo — outra
      // constante cega à divisão: na Série D, um gol pagava quase a folha inteira do clube.
      const unit=Math.max(1000, Math.round(c.salary));
      const g=userResult?userResult.scorers.filter(s=>s.id===S.clubId&&s.name===p.n).length:0;
      const cs=(userResult&&ga===0&&(p.s==='GK'||p.s==='DEF')&&startedNames.has(p.pid))?1:0;
      if(g){bonuses+=g*unit;log.push(`⚽ Bônus gol ${p.n}: ${fmt(g*unit)}`);}
      if(cs){bonuses+=unit;log.push(`🧤 Clean sheet ${p.n}: ${fmt(unit)}`);}
    }
    if(!c.gotMatchesBonus && p.stats && p.stats.apps>=Math.ceil(S.sched.length*0.5)){
      const mb=c.salary*2; bonuses+=mb; c.gotMatchesBonus=true; log.push(`🎯 Meta 50% jogos ${p.n}: ${fmt(mb)}`);
    }
  });
  // custo operacional (estrutura, logística, manutenção). Até aqui o salário era a ÚNICA despesa
  // do jogo, então cada centavo que entrava virava caixa — parte de por que o lucro crescia sem
  // limite. Escala com a receita-base, então acompanha o porte do clube.
  const opex=Math.round(base*REBAL.OPEX);
  const net=income-salaries-bonuses-opex; S.budget+=net;
  pushFinanceEntry({income,salaries,bonuses,opex,log});
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
  S.seasonTotals=S.seasonTotals||{income:0,salaries:0,bonuses:0,opex:0,playerSales:0,playerPurchases:0,stadium:0};
  if(S.seasonTotals.opex==null) S.seasonTotals.opex=0;                 // saves antigos, salvos antes do custo operacional existir
  /* O DIA DO SAVE VAI NO LANCAMENTO. So o `round` nao chega para dizer QUANDO:
     desde o calendario por dia, uma jornada tem sete dias e ha movimentacao que
     acontece fora do fecho da rodada (compra, venda, obra). Com o dia carimbado
     o extrato mostra a data real; saves antigos, sem ele, caem na data da
     jornada (ver rfFiExtratoHTML). */
  const entry=Object.assign({round:S.round+1,day:S.day,income:0,salaries:0,bonuses:0,opex:0,playerSales:0,playerPurchases:0,stadium:0,net:0,log:[]},patch);
  entry.net=(entry.income||0)+(entry.playerSales||0)-(entry.salaries||0)-(entry.bonuses||0)-(entry.opex||0)-(entry.playerPurchases||0)-(entry.stadium||0);
  S.finances.unshift(entry);
  if(S.finances.length>12) S.finances.pop();
  S.seasonTotals.income+=entry.income||0;
  S.seasonTotals.salaries+=entry.salaries||0;
  S.seasonTotals.bonuses+=entry.bonuses||0;
  S.seasonTotals.opex+=entry.opex||0;
  S.seasonTotals.playerSales+=entry.playerSales||0;
  S.seasonTotals.playerPurchases+=entry.playerPurchases||0;
  S.seasonTotals.stadium+=entry.stadium||0;
  if(typeof saveMyFinances==='function') saveMyFinances(); // online: o log é meu, não do anfitrião
}
/* promised-status enforcement: benched key players lose morale */
function enforceRoles(startedNames){
  squad(S.clubId).forEach(p=>{
    if(!p.contract)return; const c=p.contract;
    if(c.role==='Jogador Chave' && !startedNames.has(p.pid)){ p.moral=clamp(p.moral-8,0,100); c.benchStreak=(c.benchStreak||0)+1;
      S.roundNews.push(`⭐ ${p.n} (Jogador Chave) ficou fora e está insatisfeito (moral ${Math.round(p.moral)}).`); }
    else if(c.role==='Titular Regular' && !startedNames.has(p.pid)){ p.moral=clamp(p.moral-4,0,100); c.benchStreak=(c.benchStreak||0)+1; }
    else c.benchStreak=0;
  });
}
/* European clubs trigger release clauses on your young/in-form players */
function europeRaids(R){
  R=R||makeRng(hashSeed(S.seed,S.round,'europe'));
  squad(S.clubId).slice().forEach(p=>{
    if(!p.contract||!p.contract.releaseClause)return;
    if(!canReleaseFromSquad(S.clubId,p).ok) return; // piso de elenco: nem a multa leva o último goleiro
    if(((p.age<=23)||isHot(p)) && R.random()<0.012){
      const clause=p.contract.releaseClause; S.budget+=clause; commitBudget(); // publica: senão a multa some
      S.squads[S.clubId]=S.squads[S.clubId].filter(x=>x.n!==p.n);
      // destino nulo: o clube europeu não existe como clube jogável, então o jogador sai do mundo.
      // Sem avisar o servidor, ele reaparecia no elenco na rodada seguinte (e a multa era paga de novo).
      recordNetTransfer(S.clubId, null, p.n, null, 0, p.pid);
      S.negos=S.negos.filter(n=>n.player!==p.n);
      S.xi=S.xi.filter(x=>x!==p.pid);   // S.xi = pids
      S.roundNews.push(`🌍 Um clube europeu acionou a multa de ${fmt(clause)} por ${p.n}. Você recebeu o valor, mas perdeu o atleta.`);
    }
  });
  if(S.xi.length<11) S.xi=autoXI(S.clubId);
}
/* jogadores do elenco que entraram em campo, a partir da súmula de minutos (caps). Sem súmula,
   cai no onze do fim — o comportamento antigo. Ver roundCaps em playRound. */
function capsSquad(clubId, caps){
  const sq=squad(clubId)||[];
  if(Array.isArray(caps) && caps.length){
    const out=[];
    caps.forEach(c=>{ const p=sq.find(x=>(c.pid!=null&&x.pid===c.pid)||x.n===c.n); if(p) out.push({p, mins:c.mins}); });
    if(out.length) return out;
  }
  return (clubId===S.clubId?xiPlayers(clubId):[]).map(p=>({p, mins:90}));
}
/* CANSAÇO da rodada, proporcional aos minutos jogados (mesma faixa de sempre pra quem fez 90). */
function capsDrain(clubId, caps, matchMinutes, Rr){
  const total=Math.max(1, matchMinutes||90);
  capsSquad(clubId, caps).forEach(({p,mins})=>{
    const share=clamp((mins||total)/total, 0, 1);
    p.energy=clamp(p.energy-Rr.rnd(12,22)*share, 20, 100);
  });
}
/* MORAL pós-jogo: quem entrou em campo sente o resultado. NÃO é proporcional aos minutos de
   propósito — moral é humor de vestiário, não desgaste; quem entrou aos 80' na derrota sai
   cabisbaixo igual. O que mudou é só QUEM recebe: antes era o onze do fim, agora é todo mundo
   que jogou (o substituído no intervalo ficava de fora). */
function postMatchMorale(res,h,a,caps){
  const meHome=h===S.clubId; const gf=meHome?res.hg:res.ag, ga=meHome?res.ag:res.hg;
  const d= gf>ga? +8 : gf<ga? -8 : +1;
  capsSquad(S.clubId, caps).forEach(({p})=>{ p.moral=clamp(p.moral+d,0,100); });
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
/* PREMIAÇÕES da temporada: credita o caixa do USUÁRIO por posição na liga + fase alcançada
   em cada copa + prêmio de artilheiro, valoriza o artilheiro (se materializado) e guarda o
   resumo em S._seasonPrizes pro modal de celebração (seasonEndDialog). Idempotente por
   temporada. Ver escalas/racional em prizes.js. */
function awardSeasonPrizes(tbl, myCups){
  if(typeof PRIZES==='undefined' || !tbl) return;
  if(S._seasonPrizes && S._seasonPrizes.season===S.season) return; // já creditado nesta temporada
  const div=S.division, n=tbl.length, pos=tbl.findIndex(t=>t.id===S.clubId)+1;
  const divLbl=(typeof divisionLabel==='function')?divisionLabel():('Série '+div);
  const lines=[]; let total=0;
  // Liga (posição final)
  if(pos>0){
    const amt=PRIZES.leaguePrize(div, pos, n);
    if(amt>0){ lines.push({icon:pos===1?'🏆':'📊', comp:divLbl, place:pos===1?'Campeão!':(pos+'º lugar'), amount:amt}); total+=amt; }
  }
  // Copas (fase alcançada / título)
  allCupKeys().forEach(k=>{
    const outcome=PRIZES.cupResultOutcome(myCups && myCups[k]);
    if(!outcome) return;
    const amt=PRIZES.cupPrize(k, outcome);
    if(amt<=0) return;
    lines.push({icon:outcome==='campeao'?'🏆':'🎖️', comp:(COMP_DEFS[k]&&COMP_DEFS[k].short)||k, place:myCups[k], amount:amt});
    total+=amt;
  });
  // Artilheiro da divisão: valoriza o jogador (qualquer clube) + caixa se for do usuário
  let art=null;
  const arty=topScorers(1)[0];
  if(arty && arty[0]){
    const name=arty[0], goals=arty[1];
    let owner=null, pObj=null;
    Object.keys(S.squads||{}).forEach(cid=>{ const p=S.squads[cid].find(x=>x.n===name); if(p){owner=cid;pObj=p;} });
    if(pObj){
      const before=pObj.mv||((typeof REBAL!=='undefined')?REBAL.value(pObj.f,pObj.age):0);
      pObj.mvBoost=Math.min(PRIZES.ART_VALUE_CAP, (pObj.mvBoost||1)*PRIZES.ART_VALUE_MULT);
      pObj.career=pObj.career||{titles:0,seasonsTopDiv:0,bestFinish:99};
      pObj.career.topScorer=(pObj.career.topScorer||0)+1;
      // valoriza sobre o valor ATUAL (preserva o multiplicador de comportamento embutido);
      // o p.mvBoost persiste o prêmio quando evolvePlayer recalcula o valor pela força.
      pObj.mv=Math.round(before*PRIZES.ART_VALUE_MULT);
      art={name, goals, valFrom:before, valTo:pObj.mv, mine:owner===S.clubId, cash:0};
      if(owner===S.clubId){
        const cash=PRIZES.artilheiroCash(div); art.cash=cash; total+=cash;
        lines.push({icon:'👟', comp:'Artilheiro — '+divLbl, place:`${name} (${goals} gols)`, amount:cash});
      }
    }
  }
  if(total>0){
    S.budget=(S.budget||0)+total;
    S.seasonTotals=S.seasonTotals||{income:0,salaries:0,bonuses:0,opex:0,playerSales:0,playerPurchases:0,stadium:0};
    S.seasonTotals.income+=total;
  }
  S._seasonPrizes={ lines, total, art, season:S.season };
}
/* fase alcançada por um clube num BRACKET de mata-mata já resolvido (recebe o bracket direto,
   ao contrário de cupResultForClub que lê S.cups ao vivo) — usado pela premiação online, que lê
   o bracket da Copa do Brasil capturado em S._prevSeason. Devolve a MESMA família de strings. */
function cupBracketResultForClub(b, clubId){
  if(!b) return null;
  if(b.champion===clubId) return 'Campeão';
  let lastRound=null;
  (b.history||[]).forEach(h=>{ if((h.ties||[]).some(t=>t.h===clubId||t.a===clubId)) lastRound=h.round; });
  if((b.ties||[]).some(t=>t.h===clubId||t.a===clubId)) lastRound=b.round;
  if(lastRound==null) return null; // o clube nem disputou essa copa nesta temporada
  return cupEliminationPhrase(lastRound, b.roundsTotal);
}
/* RESENHA (online, server-authoritative): premiação da temporada que ACABOU, do PRÓPRIO clube.
   Lê S._prevSeason (tabelas finais por divisão + artilharia + Copa do Brasil, capturado pelo
   SERVIDOR na virada ANTES de zerar tudo — ver resolve-round/resolveSeasonTurnover). Acha a
   divisão/posição final do MEU clube por clubId e calcula prêmio de liga + copa. Diferente de
   awardSeasonPrizes (que lê o S ao vivo e serve o solo), aqui o estado ao vivo já é a temporada
   NOVA, então cada humano lê o snapshot e vê o SEU resumo (não o do anfitrião). Não credita nada
   — ver applyMyPrevSeasonPrizes. */
function computeMyPrevSeasonPrizes(){
  const pv=S._prevSeason; if(!pv || typeof PRIZES==='undefined' || !CL.clubId) return null;
  const cfg=(typeof UNI_CONFIGS!=='undefined' && UNI_CONFIGS[ACTIVE_UNI]) || (typeof UNI_CONFIGS!=='undefined'&&UNI_CONFIGS.brasil) || {order:['A','B','C','D'],label:{A:'Série A',B:'Série B',C:'Série C',D:'Série D'}};
  const order=cfg.order||['A','B','C','D'];
  let myDiv=null, myPos=0, myTable=null;
  order.forEach(d=>{ const rows=pv.tables&&pv.tables[d]; if(!rows) return; const i=rows.findIndex(r=>r.id===CL.clubId); if(i>=0){ myDiv=d; myPos=i+1; myTable=rows; } });
  if(!myDiv || !myTable) return null;
  const n=myTable.length, divLbl=(cfg.label&&cfg.label[myDiv])||('Série '+myDiv);
  const lines=[]; let total=0;
  const lamt=PRIZES.leaguePrize(myDiv, myPos, n);
  if(lamt>0){ lines.push({icon:myPos===1?'🏆':'📊', comp:divLbl, place:myPos===1?'Campeão!':(myPos+'º lugar'), amount:lamt}); total+=lamt; }
  if(pv.copaBrasil){
    const res=cupBracketResultForClub(pv.copaBrasil, CL.clubId);
    const outcome=PRIZES.cupResultOutcome(res);
    if(outcome){ const camt=PRIZES.cupPrize('copaBrasil', outcome);
      if(camt>0){ lines.push({icon:outcome==='campeao'?'🏆':'🎖️', comp:(COMP_DEFS.copaBrasil&&COMP_DEFS.copaBrasil.short)||'Copa do Brasil', place:res, amount:camt}); total+=camt; } }
  }
  const champId=(myTable[0]&&myTable[0].id)||null;
  // aposentadorias do MEU clube nesta virada (item 5 — sabor). Servidor tagueia motivo em _prevSeason.
  const retirements=(pv.retirements||[]).filter(r=>r && r.club===CL.clubId);
  return { season:pv.season, myDiv, myPos, myTable, divLbl, lines, total, champId, retirements };
}
/* ================= SALA DE IMPRENSA (fim de temporada) =================
   Monta o "briefing" da coletiva a partir do S._prevSeason que o SERVIDOR gravou na virada
   (tabelas finais das 4 divisões + artilharia + Copa do Brasil + aposentadorias com motivo).
   Tudo derivado do snapshot autoritativo — nada é recalculado no cliente, então os dois
   jogadores veem os mesmos fatos. Devolve null se não houver snapshot (saves antigos). */
function buildPressBriefing(){
  const pv=S._prevSeason; if(!pv || !pv.tables) return null;
  const shortOf=id=>{ const c=(typeof clubOf==='function')?clubOf(id):null; return (c&&c.short)||id; };
  const order=(typeof DIV_ORDER!=='undefined'&&DIV_ORDER.length)?DIV_ORDER:['A','B','C','D'];
  const lbl=d=>(typeof DIV_LABEL_FULL!=='undefined'&&DIV_LABEL_FULL[d])||('Série '+d);
  const divs=[];
  order.forEach(d=>{
    const rows=pv.tables[d]; if(!rows||!rows.length) return;
    let promoN=(typeof DIVISION_PROMO!=='undefined'&&DIVISION_PROMO[d])||0;
    let relegN=(typeof DIVISION_RELEG!=='undefined'&&DIVISION_RELEG[d])||0;
    // guarda: numa divisão com menos clubes que sobem+descem (só acontece em dado
    // incompleto/teste), os dois cortes se sobrepõem e o MESMO clube apareceria subindo
    // e caindo. Encolhe as faixas pra nunca se cruzarem.
    if(promoN+relegN > rows.length){ const sobra=Math.max(0,rows.length-promoN); relegN=Math.min(relegN,sobra); promoN=Math.min(promoN,rows.length); }
    divs.push({
      div:d, label:lbl(d),
      campeao: shortOf(rows[0].id), campeaoPts: rows[0].Pts,
      promovidos: promoN? rows.slice(0,promoN).map(r=>shortOf(r.id)) : [],
      rebaixados: relegN? rows.slice(-relegN).map(r=>shortOf(r.id)) : [],
    });
  });
  // artilheiro da temporada (S.scorers do snapshot: {nome: gols})
  let art=null;
  const sc=Object.entries(pv.scorers||{}).sort((a,b)=>b[1]-a[1])[0];
  if(sc && sc[1]>0) art={ nome:sc[0], gols:sc[1] };
  // campeão da Copa do Brasil
  const copa = (pv.copaBrasil && pv.copaBrasil.champion) ? shortOf(pv.copaBrasil.champion) : null;
  // ranking dos TREINADORES humanos da sala: divisão (tier) primeiro, depois posição
  const humanos=[];
  const humans=(typeof CL!=='undefined'&&CL.humans)?CL.humans:{};
  Object.keys(humans).forEach(cid=>{
    order.forEach((d,tier)=>{
      const rows=pv.tables[d]; if(!rows) return;
      const i=rows.findIndex(r=>r.id===cid);
      if(i>=0) humanos.push({ clubId:cid, nome:humans[cid], clube:shortOf(cid), div:d, divLabel:lbl(d), tier, pos:i+1, pts:rows[i].Pts });
    });
  });
  humanos.sort((a,b)=> a.tier-b.tier || a.pos-b.pos);
  return { season:pv.season, divs, art, copa, humanos,
           retirements:(pv.retirements||[]).filter(r=>r&&r.club===CL.clubId) };
}
/* Perguntas da coletiva. 5 fixas, 3 respostas cada + "não responder" (sempre permitido).
   Cada resposta mexe na MORAL do elenco de forma SUTIL (±2 a 5; teto de ~±15 na soma) —
   elogio público motiva, cobrança pública desmotiva, promessa alta empolga mas pressiona.
   `m` = delta de moral; `h` = manchete que o jornal publica. */
const PRESS_QUESTIONS=[
  { q:'Sobre a campanha da temporada passada, qual a sua avaliação?', opts:[
    { t:'O mérito é dos jogadores. Time entregou o que podia.', m:+4, h:'Técnico exalta elenco: "o mérito é deles"' },
    { t:'Faltou entrega de alguns. Vou cobrar internamente.',     m:-4, h:'Cobrança pública: técnico critica postura do elenco' },
    { t:'A responsabilidade é minha, não dos atletas.',           m:+2, h:'Treinador assume a culpa e protege o grupo' } ] },
  { q:'Qual a meta do clube para esta temporada?', opts:[
    { t:'Vamos brigar pelo título, sem rodeios.',                 m:+3, h:'Promessa ousada: "vamos brigar pelo título"' },
    { t:'Uma partida de cada vez. Sem promessa vazia.',           m:+1, h:'Discurso pé no chão na apresentação' },
    { t:'Sendo realista, o objetivo é não cair.',                 m:-3, h:'Meta modesta esfria o ambiente no vestiário' } ] },
  { q:'O elenco atual é suficiente ou precisa de reforços?', opts:[
    { t:'Confio plenamente em quem está aqui.',                   m:+4, h:'Voto de confiança: "confio em quem está aqui"' },
    { t:'Do jeito que está, não dá. Preciso de reforços.',        m:-3, h:'Técnico expõe elenco e pede reforços urgentes' },
    { t:'Vamos avaliar com calma, sem atropelo.',                 m: 0, h:'Diretoria e comissão avaliam o elenco' } ] },
  { q:'Um recado para a torcida?', opts:[
    { t:'A torcida é o nosso décimo segundo jogador.',            m:+3, h:'Aceno à arquibancada: "vocês são o 12º jogador"' },
    { t:'A cobrança excessiva às vezes atrapalha o time.',        m:-4, h:'Polêmica: técnico reclama da cobrança da torcida' },
    { t:'Peço paciência. O trabalho vai dar resultado.',          m:+1, h:'Treinador pede paciência à torcida' } ] },
  { q:'Como vê os adversários na disputa?', opts:[
    { t:'Respeitamos todos, mas não tememos ninguém.',            m:+3, h:'Postura firme: "não tememos ninguém"' },
    { t:'Somos azarões. Os favoritos são os outros.',             m:-2, h:'Técnico coloca o time na condição de azarão' },
    { t:'Não comento adversário. Foco no nosso trabalho.',        m: 0, h:'Treinador desconversa sobre rivais' } ] },
];
/* credita (UMA vez por temporada) o caixa da premiação anterior no meu clube — igual às finanças
   por-humano: o servidor não credita, cada humano soma o seu e publica no assento. Só é chamado
   no evento de virada (isTurnover), então recarregar a página no meio da temporada nova não
   re-credita (isTurnover=false). Devolve o resumo pro modal (mesmo quando total=0). */
function applyMyPrevSeasonPrizes(){
  const pv=S._prevSeason; if(!pv) return null;
  const sum=computeMyPrevSeasonPrizes(); if(!sum) return null;
  if(S._prevPrizesCreditedSeason!==pv.season){
    S._prevPrizesCreditedSeason=pv.season;
    if(sum.total>0){
      S.budget=(S.budget||0)+sum.total;
      commitBudget();                  // write-back no mundo local + persiste no assento (caminho único)
      // vira linha nas Finanças: é dinheiro do MEU clube e antes não deixava rastro nenhum lá.
      pushFinanceEntry({income:sum.total, log:['🏆 Premiação da temporada '+(pv.season||'')+': +'+fmt(sum.total)]});
    }
    if(typeof saveMyFinances==='function') saveMyFinances(); // carimba "já recebi" no MEU cliente
  }
  return sum;
}
/* ================= TÍTULOS DA TEMPORADA QUE FECHOU (RESENHA) =================
   Na Resenha quem vira a temporada é o SERVIDOR (resolveSeasonTurnover), e o endSeason() do
   cliente — que é onde o jogo SEMPRE registrou título — nunca roda. Resultado: no multijogador
   nenhum título jamais foi registrado. O campeão levantava a taça na tela da classificação e
   depois não achava nada: Sala de Troféus vazia, Historial do clube vazio, ranking de treinadores
   sem taça. Era o "o troféu do brasileirão não foi atribuído a mim".

   Esta função é o endSeason() que faltava, montado a partir do único material que sobrevive à
   virada: S._prevSeason (tabelas finais das 4 divisões + artilharia + chaves das copas, gravado
   pelo servidor ANTES de zerar tudo). Roda em CADA cliente, sobre o SEU clube — títulos são de
   treinador, não da sala.

   Ela também repara o passado: quem já virou de temporada antes desta correção ainda tem o
   _prevSeason da última virada no estado, então o título perdido é registrado assim que o jogo
   abrir. Uma vez por temporada, pelo carimbo _titlesRegisteredSeason.

   O que NÃO dá pra recuperar: o placar da decisão da LIGA (S.results é zerado na virada) e o
   resumo financeiro da temporada (S.seasonTotals idem). O título entra sem esses cartões — a
   Sala de Troféus já trata a ausência deles, porque títulos antigos também não os tinham. */
function prevSeasonCupBrackets(){
  const pv=(S&&S._prevSeason)||{};
  const out={};
  if(pv.cups) Object.keys(pv.cups).forEach(k=>{ if(pv.cups[k]) out[k]=pv.cups[k]; });
  if(!out.copaBrasil && pv.copaBrasil) out.copaBrasil=pv.copaBrasil;   // snapshots antigos só tinham a Copa do Brasil
  return out;
}
function registerPrevSeasonTitles(){
  const pv=S&&S._prevSeason;
  if(!pv || !pv.tables || !CL || !CL.clubId) return null;
  const temporada=pv.season||0;
  if(S._titlesRegisteredSeason===temporada) return null;      // esta virada já foi registrada
  const order=(typeof DIV_ORDER!=='undefined'&&DIV_ORDER.length)?DIV_ORDER:['A','B','C','D'];
  let myDiv=null, myPos=0, myTable=null;
  order.forEach(d=>{ const rows=pv.tables[d]; if(!rows||!rows.length) return;
    const i=rows.findIndex(r=>r.id===CL.clubId); if(i>=0){ myDiv=d; myPos=i+1; myTable=rows; } });
  if(!myDiv) return null;                                     // não achei meu clube: não invento histórico
  S._titlesRegisteredSeason=temporada;
  const brackets=prevSeasonCupBrackets();
  const shortOf=id=>{ const c=clubOf(id); return (c&&c.short)||id; };
  const campeoesCopa={};                                      // chave da copa -> clubId campeão
  Object.keys(brackets).forEach(k=>{ const ch=cupCompetitionChampion(brackets[k]); if(ch) campeoesCopa[k]=ch; });
  const cups={}, myCups={};
  Object.keys(brackets).forEach(k=>{
    cups[k]=campeoesCopa[k]?shortOf(campeoesCopa[k]):null;
    myCups[k]=cupBracketResultForClub(brackets[k], CL.clubId);
  });
  const arty=Object.entries(pv.scorers||{}).sort((a,b)=>b[1]-a[1])[0];
  const relegN=(typeof DIVISION_RELEG!=='undefined'&&DIVISION_RELEG[myDiv])||0;
  /* a mesma foto completa que o endSeason grava no solo (filtro por temporada lê daqui):
     campeão de CADA divisão (da tabela final) e artilheiro de CADA competição (do livro
     por competição que o servidor passou a mandar em pv.scorersByComp; snapshot antigo
     não o tem — aí os campos ficam vazios em vez de inventados) */
  const divChamps={};
  order.forEach(d=>{ const rows=pv.tables[d]; if(rows&&rows.length) divChamps[d]=rows[0].id; });
  const artPorComp={};
  Object.keys(pv.scorersByComp||{}).forEach(k=>{
    const e=Object.entries(pv.scorersByComp[k]||{}).sort((a,b)=>b[1]-a[1])[0];
    if(e) artPorComp[k]={nome:e[0], gols:e[1]};
  });
  S.history=S.history||[];
  S.history.push({ season:temporada, division:myDiv, clubId:CL.clubId,
    champ:shortOf(myTable[0].id), divChamps, artPorComp,
    top3:myTable.slice(0,3).map(t=>shortOf(t.id)),
    relegated:relegN?myTable.slice(-relegN).map(t=>shortOf(t.id)):[],
    artilheiro:(arty&&arty[1]>0)?(arty[0]+' ('+arty[1]+')'):'—',
    myPos, myClubShort:shortOf(CL.clubId), cups, myCups, qualifiedFor:[] });
  // taças do MEU treinador — o que a Sala de Troféus lê
  S.coachHistory=S.coachHistory||[];
  const meuShort=shortOf(CL.clubId);
  if(myTable[0].id===CL.clubId){
    const divLbl=(typeof DIV_LABEL_FULL!=='undefined'&&DIV_LABEL_FULL[myDiv])||('Série '+myDiv);
    S.coachHistory.push({ season:temporada, type:'campeao', comp:divisionCompKeyFor(myDiv), kind:'liga',
      label:divLbl, uni:ACTIVE_UNI, div:myDiv, clubId:CL.clubId, clubShort:meuShort,
      pts:(myTable[0].Pts||0), final:null,
      text:'Campeão da '+divLbl+' pelo '+meuShort.toUpperCase() });
  }
  Object.keys(brackets).forEach(k=>{
    if(campeoesCopa[k]!==CL.clubId) return;
    const lbl=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k]&&COMP_DEFS[k].short)||k;
    S.coachHistory.push({ season:temporada, type:'campeao', comp:k, kind:'copa',
      label:lbl, uni:ACTIVE_UNI, clubId:CL.clubId, clubShort:meuShort,
      final:cupFinalFromBracket(brackets[k], CL.clubId),
      text:'Campeão da '+lbl+' pelo '+meuShort.toUpperCase() });
  });
  // títulos por clube (aba Resenha da Sala de Troféus): TODO MUNDO, não só eu
  S.titlesByClub=S.titlesByClub||{};
  const add=(clubId,comp)=>{ if(!clubId||!comp) return;
    const t=S.titlesByClub[clubId]=S.titlesByClub[clubId]||{}; t[comp]=(t[comp]||0)+1; };
  order.forEach(d=>{ const rows=pv.tables[d]; if(rows&&rows.length) add(rows[0].id, divisionCompKeyFor(d)); });
  Object.keys(campeoesCopa).forEach(k=>add(campeoesCopa[k], k));
  /* os MEUS titulos desta virada mexem no vestiario e na cadeira, pelo peso de cada um */
  { let pts=0;
    if(myTable[0].id===CL.clubId) pts+=pontosDeTitulo(divisionCompKeyFor(myDiv), ACTIVE_UNI, myDiv);
    Object.keys(campeoesCopa).forEach(k=>{ if(campeoesCopa[k]===CL.clubId) pts+=pontosDeTitulo(k); });
    aplicarEfeitosDeTitulo(pts); }
  return { season:temporada, campeaoLiga:myTable[0].id===CL.clubId, copas:Object.keys(campeoesCopa).filter(k=>campeoesCopa[k]===CL.clubId) };
}
/* CAMINHO LOCAL (solo, ou fallback do anfitrião quando resolve-round falha — ver
   onlineHostCloseRound/_commitLeagueRound): monta o MESMO snapshot que o servidor grava em
   S._prevSeason (resolveSeasonTurnover, resolve-round/index.ts), com as tabelas finais AINDA
   intactas (antes de newSeasonReset() zerá-las). Sem isso, S._prevSeason só existia quando o
   servidor resolvia a virada; se o fallback local rodasse (edge function fora do ar), o convidado
   nunca via S._prevSeason, computeMyPrevSeasonPrizes() retornava null pra sempre, e a premiação
   da temporada se perdia silenciosamente pra ele — mesmo a tabela de posições estando correta.
   Retirements ficam vazios aqui (só o servidor computa isso na mesma passada; é só "sabor" no
   press-room, não afeta a premiação). */
/* ===== COMO O TÍTULO FOI GANHO (fonte do painel CAMPANHA da Sala de Troféus) =====
   O jogo nunca guardou isso: S.cups e S.results são zerados a cada virada (newSeasonReset), então
   depois do fim da temporada não há mais como reconstruir o placar da decisão. As funções abaixo
   extraem o essencial DENTRO de endSeason(), enquanto o dado ainda existe, e o título já nasce
   com a decisão dentro. Nada aqui altera o jogo — é só registro. */

/* chave de competição do título de divisão. Brasil mantém as chaves de sempre (serieA/B/C/D, as
   mesmas que trophyImg usa); Inglaterra/PL casa com a arte de Premier League que temos em
   public/img/trofeus/. Qualquer outra liga (La Liga, Bundesliga, os países da CONMEBOL...) vira
   'liga:<universo>:<divisão>': a Sala de Troféus monta um card avulso com o nome da liga e o 🏆
   genérico, em vez de sumir com o título só porque não desenhamos aquela taça. */
function divisionCompKeyFor(div){
  if(!isIntlUniverse()) return ({A:'serieA',B:'serieB',C:'serieC',D:'serieD'})[div] || ('liga:brasil:'+div);
  if(ACTIVE_UNI==='Inglaterra' && div==='PL') return 'premier';
  return 'liga:'+ACTIVE_UNI+':'+div;
}
function divisionTitleCompKey(){ return divisionCompKeyFor(S.division); }
/* Final da copa: o chaveamento guarda uma entrada de history por fase, e a ÚLTIMA é a decisão.
   hg/ag são o tempo normal (é o que o resto da UI mostra); pênaltis vêm à parte, como no
   Calendário. Devolve null se a copa não chegou ao fim — aí o card sai sem placar. */
function cupFinalFromBracket(b, clubId){
  if(!b||!b.history||!b.history.length) return null;
  const last=b.history[b.history.length-1];
  const tie=(last.ties||[]).find(t=>t.h===clubId||t.a===clubId);
  if(!tie || tie.hg==null) return null;
  return { home:clubOf(tie.h).short, away:clubOf(tie.a).short, hg:tie.hg, ag:tie.ag,
           pens: tie.pens ? (tie.pens.h+' × '+tie.pens.a) : null };
}
function cupTitleFinal(key){
  const c=S.cups&&S.cups[key]; if(!c) return null;
  return cupFinalFromBracket((c.champion!==undefined)?c:c.bracket, S.clubId);
}
/* Liga não tem final: a "decisão do título" é o último jogo do campeão na temporada. */
function leagueTitleDecider(){
  const mine=(S.results||[]).filter(r=>r.h===S.clubId||r.a===S.clubId);
  const m=mine[mine.length-1]; if(!m) return null;
  return { home:clubOf(m.h).short, away:clubOf(m.a).short, hg:m.hg, ag:m.ag, round:m.round };
}
/* Títulos por CLUBE e por competição — de TODO MUNDO, não só do jogador. É o que a aba Resenha
   da Sala de Troféus usa pra montar a fila de taças de cada treinador; antes só existia a
   contagem agregada de CL.careerStats (pontos + nº de títulos), que não diz QUAL taça foi.
   prevTables já vem com as quatro divisões ordenadas (o campeão de cada uma é a linha 0).
   Guarda por temporada porque endSeason pode ser reexecutado na virada online (fallback local
   quando a edge function não responde) e o acumulado não pode contar duas vezes. */
function accrueTitlesByClub(prevTables){
  if(S._titlesAccruedSeason===S.season) return;
  S._titlesAccruedSeason=S.season;
  S.titlesByClub=S.titlesByClub||{};
  const add=(clubId,comp)=>{ if(!clubId||!comp) return;
    const t=S.titlesByClub[clubId]=S.titlesByClub[clubId]||{}; t[comp]=(t[comp]||0)+1; };
  DIV_ORDER.forEach(d=>{ const rows=prevTables&&prevTables[d]; if(rows&&rows.length) add(rows[0].id, divisionCompKeyFor(d)); });
  if(S.cups) allCupKeys().forEach(k=>add(cupCompetitionChampion(S.cups[k]), k));
}
/* quantas rodadas cada copa ainda deve. Uma copa sem campeão ainda deve pelo menos uma rodada;
   quantas exatamente sai da diferença entre o total de rodadas dela e o número de dias que o
   calendário reservou — que é justamente onde o erro nasceu (10 datas pra 11 rodadas). */
/* ===== FASE 3 — QUANTAS RODADAS ESTA COPA AINDA TEM DE JOGAR =====
   Conta o que FALTA, não o tamanho da competição: rodadas do mata-mata que ainda não
   aconteceram, ou o que resta da fase de grupos mais o tique de transição do sorteio mais
   o mata-mata inteiro. É a conta que a prorrogação precisa para saber quantas jornadas
   acrescentar — a antiga (`total - vagas no calendário`) contava também as vagas JÁ GASTAS
   e chegava a zero com a final por jogar. */
function cupRodadasQueFaltam(key){
  const c=S.cups&&S.cups[key]; if(!c) return 0;
  const b=(c.champion!==undefined)?c:c.bracket;
  if(b){
    if(cupIsFinished(b)) return 0;
    /* MATA-MATA SEM CONFRONTO ABERTO E SEM CAMPEAO = EMPERRADO, NAO DEVEDOR.
       advanceCupBracket monta os confrontos da fase seguinte no fim de cada rodada, entao
       `ties` vazio sem campeao e um estado que nao anda sozinho. Contar isso como divida
       punha a temporada a criar jornadas vazias para uma competicao que nunca ia avancar —
       o jogador clicava "Avancar" dezenas de vezes sem nada em campo. */
    if(!(b.ties||[]).length) return 0;
    return Math.max(1, (b.roundsTotal||0)-(b.round||0));
  }
  if(c.group){
    const faltamGrupo=Math.max(0, (c.group.roundsTotal||0)-(c.group.round||0));
    const nG=Object.keys(c.group.groups||{}).length, adv=c.group.advancePerGroup||2;
    const ko=Math.max(1, Math.ceil(Math.log2(Math.max(2, nG*adv))));
    return faltamGrupo + 1 + ko;    // +1 = o tique que só cria o mata-mata (ver cupTotalRounds)
  }
  return 1;
}
/* ===== FASE 3 — A TEMPORADA SÓ ACABA DEPOIS DE TODAS AS COMPETIÇÕES =====
   `criar` é o número que interessa: rodadas devidas MENOS os dias já marcados no calendário
   DAQUI PARA A FRENTE. Antes o desconto usava o calendário inteiro, incluindo as jornadas
   que já passaram — uma competição que perdeu tiques pelo caminho (o tique gasto só para
   sortear as oitavas, uma jornada anterior ao sorteio, uma rodada resolvida ao vivo) chegava
   ao fim da temporada devendo a FINAL com o calendário aparentemente cheio. A prorrogação
   não criava jornada nenhuma, `extras` vinha 0, e endSeason() fechava a temporada com copa
   por decidir: sem final, sem cerimônia, sem taça — exatamente o relatado. */
function copasPendentes(){
  if(!S.cups) return [];
  const agora=S.round||0;
  return allCupKeys().map(key=>{
    const c=S.cups[key]; if(!c) return null;
    const faltam=cupRodadasQueFaltam(key);
    if(!faltam) return null;
    const marcadas=(((S.cupCalendar&&S.cupCalendar[key])||[]).filter(j=>j>=agora)).length;
    return { key, faltam, marcadas, criar: Math.max(0, faltam-marcadas) };
  }).filter(Boolean);
}
function prorrogarSeFaltaCopa(){
  const pend=copasPendentes();
  if(!pend.length) return 0;
  const extras=(typeof WORLD_RULES!=='undefined' && WORLD_RULES.prorrogarPorCopasPendentes)
    ? WORLD_RULES.prorrogarPorCopasPendentes(S, pend, 24) : 0;
  const lista=pend.map(p=>((COMP_DEFS[p.key]&&COMP_DEFS[p.key].short)||p.key)+' ('+p.faltam+')').join(', ');
  if(extras){
    console.log('temporada prorrogada em '+extras+' jornada(s): faltava jogar '+lista);
    S.roundNews=S.roundNews||[];
    S.roundNews.push('📅 A temporada foi estendida: ainda falta decidir '+lista+'.');
  } else {
    console.warn('temporada encerrada com competição por decidir: '+lista+' (teto de prorrogação atingido)');
    S.roundNews=S.roundNews||[];
    S.roundNews.push('⚠️ A temporada terminou com competição por decidir: '+lista+'.');
  }
  return extras;
}
/* ===== O ARQUIVO PERMANENTE DA TEMPORADA (S.archive) =====
   Gêmeo do archiveSeasonT do servidor (resolve-round) — no solo quem fecha a temporada é o
   cliente, então o arquivo é escrito aqui. Append-only, nunca tocado por reset: uma entrada
   por temporada, com as tabelas finais de todas as divisões, a artilharia (top 25) e cada
   copa compacta (campeão, grupos e mata-mata, sem os `events` de narração). Na Resenha o
   servidor é quem escreve; o cliente só lê o que vem no shared_state. */
function archiveCup(c){
  if(!c) return null;
  const br=(c.champion!==undefined)?c:(c.bracket||null);
  const out={champion:(br&&br.champion)||null};
  if(c.group&&c.group.groups){
    out.groups={};
    Object.keys(c.group.groups).forEach(g=>{
      out.groups[g]=mpSortTable({table:((c.group.groups[g]||{}).table)||{}})
        .map(x=>({id:x.id,P:x.P,W:x.W,D:x.D,L:x.L,GF:x.GF,GA:x.GA,Pts:x.Pts}));
    });
  }
  if(br){
    const limpa=ties=>(ties||[]).map(t=>({h:t.h,a:t.a,hg:t.hg,ag:t.ag,winner:t.winner||null,pens:t.pens||null}));
    const porRodada={};
    (br.history||[]).forEach(h=>{ porRodada[h.round]=limpa(h.ties); });
    if(br.ties&&br.ties.length&&!porRodada[br.round]) porRodada[br.round]=limpa(br.ties);
    out.rounds=Object.keys(porRodada).map(Number).sort((a,b)=>a-b).map(r=>({round:r,ties:porRodada[r]}));
  }
  return out;
}
/* o artilheiro de cada competição, tirado do livro por competição: {comp:{nome,gols}} */
function topPorComp(scorersByComp){
  const out={};
  Object.keys(scorersByComp||{}).forEach(k=>{
    const e=Object.entries(scorersByComp[k]||{}).sort((a,b)=>b[1]-a[1])[0];
    if(e) out[k]={nome:e[0], gols:e[1]};
  });
  return out;
}
function archiveSeason(tables){
  S.archive=S.archive||[];
  const season=S.season||1;
  if(S.archive.some(a=>a&&a.season===season)) return;   // idempotente
  const scorers=Object.entries(S.scorers||{}).sort((a,b)=>b[1]-a[1]).slice(0,25);
  const cups={};
  Object.keys(S.cups||{}).forEach(k=>{ const a=archiveCup(S.cups[k]); if(a) cups[k]=a; });
  S.archive.push({season, tables, scorers, cups, artPorComp:topPorComp(S.scorersByComp)});
}
/* RESGATE: save que virou a temporada antes do archive existir ainda tem o _prevSeason da
   temporada recém-fechada — a próxima virada o sobrescreveria. Roda no carregar do save solo
   (idempotente). O _prevSeason do solo não fotografa as copas continentais, então dele entram
   as tabelas de liga, a artilharia e a copa nacional. */
function archiveBackfill(){
  const ps=S&&S._prevSeason; if(!ps||ps.season==null) return;
  S.archive=S.archive||[];
  if(S.archive.some(a=>a&&a.season===ps.season)) return;
  const scorers=Object.entries(ps.scorers||{}).sort((a,b)=>b[1]-a[1]).slice(0,25);
  const cups={};
  if(ps.copaBrasil){ const a=archiveCup(ps.copaBrasil); if(a) cups[(typeof copaNacionalDoUniverso==='function'&&copaNacionalDoUniverso())||'copaBrasil']=a; }
  Object.keys(ps.cups||{}).forEach(k=>{ if(cups[k]) return; const a=archiveCup(ps.cups[k]); if(a) cups[k]=a; });
  S.archive.push({season:ps.season, tables:ps.tables||{}, scorers, cups, artPorComp:topPorComp(ps.scorersByComp)});
}
function endSeason(){
  const tbl=sortedTable();
  const _prevTables={};
  DIV_ORDER.forEach(d=>{ const t=(d===S.division) ? S.table : ((S.otherDivs&&S.otherDivs[d])||{}).table;
    _prevTables[d]= t ? mpSortTable({table:t}).map(x=>({id:x.id,P:x.P,W:x.W,D:x.D,L:x.L,GF:x.GF,GA:x.GA,Pts:x.Pts})) : []; });
  S._prevSeason={ season:S.season||1, tables:_prevTables, scorers:S.scorers||{}, scorersByComp:S.scorersByComp||{}, copaBrasil:(S.cups&&S.cups.copaBrasil)||null, retirements:[] };
  // arquivo permanente da temporada que fecha — antes de qualquer reset (ver archiveSeason)
  try{ archiveSeason(_prevTables); }catch(e){ console.warn('archive da temporada:', e&&e.message); }
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
  // PREMIAÇÕES: credita caixa do usuário + valoriza artilheiro + guarda resumo pro modal
  try{ awardSeasonPrizes(tbl, myCups); }catch(e){ console.warn('premiação falhou:', e); }
  const qual=(S.division==='A')?computeQualification(tbl):null;
  const qualifiedFor=[];
  if(qual){
    if(qual.libertadores.includes(S.clubId)) qualifiedFor.push('libertadores');
    else if(qual.sulamericana.includes(S.clubId)) qualifiedFor.push('sulamericana');
  }
  try{ coachSpellsMigrar();
       if(tablePos(S.clubId)===1) coachSpellTitulo('serie'+S.division);
       Object.entries(myCups||{}).forEach(([k,v])=>{ if(foiCampeao(v)) coachSpellTitulo(k); });
       coachSpellAcumular(); }catch(e){ console.warn('passagem no fecho:', e&&e.message); }
  /* ===== O QUE A TEMPORADA DEIXA PARA TRAS =====
     O filtro por temporada le daqui. Faltavam duas coisas para a foto ficar completa: o campeao
     de CADA divisao (so ficava o da minha) e o artilheiro de CADA competicao (S.scorersByComp e
     da temporada corrente e zera na virada). Ficam gravados agora, enquanto o dado ainda existe. */
  const divChamps={};
  try{
    DIV_ORDER.forEach(d=>{
      const linhas=(S._prevSeason&&S._prevSeason.tables&&S._prevSeason.tables[d])||[];
      if(linhas.length) divChamps[d]=linhas[0].id;
    });
  }catch(e){ console.warn('campeoes por divisao:', e&&e.message); }
  const artPorComp={};
  try{
    Object.keys(S.scorersByComp||{}).forEach(k=>{
      const e=Object.entries(S.scorersByComp[k]||{}).sort((a,b)=>b[1]-a[1])[0];
      if(e) artPorComp[k]={nome:e[0], gols:e[1]};
    });
  }catch(e){}
  S.history.push({season:S.season,division:S.division,clubId:S.clubId,champ,divChamps,artPorComp,
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
  const st=S.seasonTotals||{income:0,salaries:0,bonuses:0,opex:0,playerSales:0,playerPurchases:0,stadium:0};
  (S.financeHistory[S.clubId]=S.financeHistory[S.clubId]||[]).push({season:S.season, ...st,
    net:(st.income+st.playerSales)-(st.salaries+st.bonuses+(st.opex||0)+st.playerPurchases+st.stadium)});
  // acumula artilharia histórica (nunca é apagada entre temporadas do mesmo save)
  S.allTimeScorers=S.allTimeScorers||{};
  Object.entries(S.scorers||{}).forEach(([n,g])=>{ S.allTimeScorers[n]=(S.allTimeScorers[n]||0)+g; });
  // registra títulos conquistados pelo treinador na carreira (persiste com o save).
  // Além do que já existia (temporada + competição + frase), cada título agora carrega o CLUBE e
  // a DECISÃO (placar da final, nas copas; último jogo + pontos, nas ligas) — é o que a Sala de
  // Troféus mostra no painel CAMPANHA. Títulos gravados antes desta mudança seguem válidos: a
  // sala trata a ausência desses campos e mostra o título sem o cartão da decisão.
  S.coachHistory=S.coachHistory||[];
  const myShort=clubOf(S.clubId).short;
  if(tbl[0].id===S.clubId){
    const divLbl=DIV_LABEL_FULL[S.division]||('Série '+S.division);
    S.coachHistory.push({season:S.season, type:'campeao', comp:divisionTitleCompKey(), kind:'liga',
      label:divLbl, uni:ACTIVE_UNI, div:S.division, clubId:S.clubId, clubShort:myShort,
      pts:(tbl[0].Pts||0), final:leagueTitleDecider(), text:`Campeão da ${divLbl} pelo ${myShort.toUpperCase()}`});
  }
  if(S.cups){ allCupKeys().forEach(k=>{
    if(cupCompetitionChampion(S.cups[k])===S.clubId) S.coachHistory.push({season:S.season, type:'campeao', comp:k, kind:'copa',
      label:COMP_DEFS[k].short, uni:ACTIVE_UNI, clubId:S.clubId, clubShort:myShort,
      final:cupTitleFinal(k), text:`Campeão da ${COMP_DEFS[k].short} pelo ${myShort.toUpperCase()}`});
  }); }
  /* titulo conquistado NESTA temporada mexe no vestiario e na cadeira, pelo PESO da conquista */
  { const meusAgora=(S.coachHistory||[]).filter(h=>h&&h.type==='campeao'&&h.season===S.season)
      .reduce((soma,h)=>soma+pontosDeTitulo(h.comp,h.uni,h.div),0);
    aplicarEfeitosDeTitulo(meusAgora); }
  accrueTitlesByClub(_prevTables);
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
      // acumula o Historial (jogos/cartões/lesões) pra sobreviver a newSeasonReset(), que
      // zera p.stats por completo pra começar a próxima temporada do zero — igual ao p.career
      // acima e ao S.allTimeScorers (gols já é sincronizado com a artilharia por outro caminho,
      // ver panJogador: soma S.allTimeScorers+S.scorers em vez de duplicar aqui). SEM isso o
      // card "Historial" só mostrava os números da temporada atual, perdendo tudo a cada virada.
      p.careerStats=p.careerStats||{apps:0,cs:0,yellows:0,reds:0,injuries:0};
      const st=p.stats||{};
      p.careerStats.apps+=st.apps||0; p.careerStats.cs+=st.cs||0;
      p.careerStats.yellows+=st.yellows||0; p.careerStats.reds+=st.reds||0; p.careerStats.injuries+=st.injuries||0;
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
  club._rbOv=1; // já na escala nova (calculado do elenco remapeado) — clubOf não deve remapear de novo
}
/* aposentadoria: degrau de chance a partir dos 32 anos, calibrado por simulação de Monte
   Carlo pra idade média de aposentadoria ficar perto de 34; a partir dos 40, é certa —
   ninguém joga pra sempre. Ver relatorios/Sugestoes_Mecanica_ParaDepois.md pro contexto. */
const RETIRE_CHANCE_BY_AGE={32:0.11,33:0.24,34:0.40,35:0.56,36:0.71,37:0.83,38:0.92,39:0.97};
/* motivo da aposentadoria (sabor) — espelho de pickRetireReason no resolve-round: os dois lados
   precisam falar a mesma língua, senão o texto muda dependendo de quem resolveu a temporada. */
const RETIRE_REASONS={ idade:'pendurou as chuteiras — a idade pesou',
  rico:'aposentou milionário, não precisava mais jogar',
  tv:'largou os gramados pra virar comentarista esportivo na TV',
  lesao:'parou por causa das lesões e foi curtir a família',
  negocios:'saiu do futebol pra cuidar dos negócios fora dos gramados' };
function pickRetireReason(R,p){
  const age=p.age||35, mv=p.mv||0, r=R.random();
  if(age>=39) return r<0.7?RETIRE_REASONS.idade:RETIRE_REASONS.tv;
  if(mv>=20e6) return r<0.55?RETIRE_REASONS.rico:(r<0.8?RETIRE_REASONS.tv:RETIRE_REASONS.idade);
  const pool=[RETIRE_REASONS.idade,RETIRE_REASONS.lesao,RETIRE_REASONS.negocios,RETIRE_REASONS.tv,RETIRE_REASONS.rico];
  return pool[Math.floor(r*pool.length)];
}
/* quem está PERTO de pendurar as chuteiras: chance de se aposentar no fim DESTA temporada
   (retireChance usa a idade que ele terá na virada). Serve pro aviso antecipado no e-mail —
   dá tempo de vender ou buscar substituto enquanto a janela está aberta. */
function retirementRisk(clubId){
  return ((S.squads&&S.squads[clubId])||[])
    .map(p=>({p, chance:retireChance((p.age||26)+1)}))
    .filter(x=>x.chance>=0.24)                       // 33 anos pra cima (ver RETIRE_CHANCE_BY_AGE)
    .sort((a,b)=>b.chance-a.chance || b.p.f-a.p.f);
}
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
  const range=DIVISION_FORCE_RANGE[division]||DIVISION_FORCE_RANGE.D||[48,68];   // ver makeRawPlayer
  const R=makeRng(hashSeed('retire-repl',(S&&S.seed)||1,S.season,division,position,seedExtra));
  const age=Math.round(18+R.random()*4);
  const rawF=rollAgedForce(R,range,age); const f=Math.min(REBAL.force(rawF,division), DIV_FORCE_CAP[division]||99); // item 4 + trava de cap por divisão
  const lg=MARKET.divisionToLeague(division);
  return { n:pickProcPlayerName(R), p:position, s:position, f, rawF, _rb:1, _div:division, age, lg, mv:REBAL.value(f,age),
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
        // REGISTRA a aposentadoria (nome, idade, motivo, substituto). Só o servidor gravava isso
        // (S._prevSeason.retirements), então no SOLO a sala de imprensa e o e-mail de fim de
        // temporada ficavam sem a lista — o fato acontecia e não sobrava rastro nenhum.
        S._prevSeason=S._prevSeason||{}; S._prevSeason.retirements=S._prevSeason.retirements||[];
        S._prevSeason.retirements.push({ name:p.n, club:cid, clubShort:(clubOf(cid)||{}).short||cid,
          age:p.age, pos:p.s, f:p.f, reason:pickRetireReason(R,p), replacement:repl.n, replacementAge:repl.age });
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
/* ---- FINANÇAS DOS CLUBES DA CPU (uma vez por temporada, no fechamento) ----
   Até aqui SÓ o clube do usuário tinha vida financeira: processFinances rodava a cada rodada
   pra ele, e os 79 outros recebiam um caixa inicial em createSave/buildOtherDivisions e nunca
   mais mudavam. O efeito medido era pior que o do caixa inflacionado: o humano saía de R$1,8M
   pra R$105M em cinco temporadas enquanto TODO rival ficava parado no valor inicial — depois
   de duas ou três temporadas ninguém mais conseguia disputar uma contratação com ele.

   Agora cada clube da CPU fecha o ano com o mesmo modelo do usuário (receita-base × 38 rodadas
   + bilheteria dos 19 jogos em casa + bônus por aproveitamento real na tabela − folha − custo
   operacional + premiação da posição final). É uma passada só, ~80 clubes de aritmética, em vez
   de simular finanças rodada a rodada pra todo mundo.

   Chamada no INÍCIO de newSeasonReset, antes de computeDivisionSwap trocar a composição das
   divisões — as tabelas e os elencos aqui ainda são os da temporada que acabou. */
function applyCpuSeasonFinances(){
  if(!S || !S.budgets) return;
  const humans=new Set();
  if(S.clubId) humans.add(S.clubId);
  if(typeof CL!=='undefined' && CL.humans) Object.keys(CL.humans).forEach(id=>humans.add(id));

  // posição final + divisão de cada clube, pras premiações (a divisão do usuário e as outras 3)
  const meta={};
  const reg=(div,tbl)=>{
    const rows=Object.values(tbl||{}).sort((a,b)=> b.Pts-a.Pts || (b.GF-b.GA)-(a.GF-a.GA) || b.GF-a.GF || String(a.id).localeCompare(String(b.id)));
    rows.forEach((r,i)=>{ meta[r.id]={div,pos:i+1,n:rows.length,row:r}; });
  };
  reg(S.division, S.table);
  DIV_ORDER.forEach(d=>{ const od=S.otherDivs&&S.otherDivs[d]; if(od&&od.table) reg(d,od.table); });

  const ROUNDS=38, HOME=19;
  Object.keys(S.budgets).forEach(id=>{
    if(humans.has(id)) return;                                   // humano já paga/recebe por rodada
    const c=clubOf(id); if(!c) return;
    const ov=c.overall, base=baseIncome(ov);
    let payroll=0;
    (S.squads[id]||[]).forEach(p=>{ payroll += (p.contract && p.contract.salary) || REBAL.wage(p.f); });

    const m=meta[id];
    const rounds=(m&&m.row&&m.row.P)?m.row.P:ROUNDS;             // jogos de verdade, quando a tabela existe
    // aproveitamento real vira bônus: quem ganhou mais, arrecadou mais (mesma regra do usuário)
    const w=(m&&m.row)?m.row.W:Math.round(rounds*0.35), d=(m&&m.row)?m.row.D:Math.round(rounds*0.27);
    const bonus=Math.round(base*(w*REBAL.WIN_BONUS + d*REBAL.DRAW_BONUS));
    // capacidade persistida do clube (S.clubStadiumCap — já reflete crescimento de temporadas
    // anteriores, ver applyCpuStadiumGrowth logo abaixo) tem prioridade; sem isso o crescimento
    // ficaria guardado mas nunca apareceria na bilheteria. Clube estrangeiro com dado real do
    // Transfermarkt (realCapFor) só entra se ainda não foi semeado nesse save; senão, sintética.
    const cap=(S.clubStadiumCap && S.clubStadiumCap[id]) ? S.clubStadiumCap[id].capacity
      : ((typeof realCapFor==='function' && realCapFor(c)) || ((typeof REBAL.stadiumCap==='function')?REBAL.stadiumCap(ov):20000));
    // preço fixo por divisão (ticketPriceForDivision, main.js) — mesma tabela que o usuário usa.
    const price=(typeof ticketPriceForDivision==='function')?ticketPriceForDivision((m&&m.div)||S.division):10;
    const homeGames=Math.round(rounds/2) || HOME;
    const gate=Math.round(cap*0.55)*price*homeGames;             // ocupação média ~55%, igual à calibração

    let prize=0;
    if(m && typeof PRIZES!=='undefined'){ try{ prize=PRIZES.leaguePrize(m.div,m.pos,m.n)||0; }catch(e){} }

    // SÓ O DINHEIRO DE DESEMPENHO FICA AQUI (bônus por vitória + premiação). Receita base,
    // bilheteria, folha e custo fixo passaram a entrar TODA RODADA (applyCpuRoundCash) — antes o
    // ano inteiro caía de uma vez na virada e o caixa dos rivais ficava congelado durante a
    // temporada, que é justamente quando a janela de transferências abre e o mercado da CPU
    // precisa de caixa de verdade. A soma do ano é a mesma; somar os dois aqui contaria duas vezes.
    // `gate` continua calculado acima porque a bilheteria por rodada deriva dele.
    void gate;
    // piso: um clube da CPU não some do mercado por dívida — fica raspando o caixa, como no
    // save do usuário, que também só recebe um aviso quando fica negativo.
    S.budgets[id]=Math.max(-base*4, Math.round((S.budgets[id]||0) + bonus + prize));
  });
}
/* CAIXA DA CPU POR RODADA (solo/hotseat) — a regra mora em world-rules.js e é a MESMA que o
   servidor roda na Resenha (cpuRoundCash no resolve-round). Ver applyCpuSeasonFinances acima:
   o que é operação entra aqui, rodada a rodada; o que é desempenho fica na virada. */
function applyCpuRoundCash(){
  if(!S || !S.budgets) return;
  if(typeof CL!=='undefined' && CL.online) return;   // na Resenha quem faz esta conta é o servidor
  const humans=new Set();
  if(S.clubId) humans.add(S.clubId);
  if(typeof CL!=='undefined' && CL.humans) Object.keys(CL.humans).forEach(id=>humans.add(id));
  WORLD_RULES.cpuCaixaRodada(S, {
    humanos:humans,
    renda:baseIncome,
    folha:p=>(p.contract && p.contract.salary) || REBAL.wage(p.f),
    capacidade:ov=>(typeof REBAL.stadiumCap==='function')?REBAL.stadiumCap(ov):20000,
    overall:id=>{ const c=clubOf(id); return c?c.overall:null; },
    OPEX:REBAL.OPEX
  });
}
/* crescimento AUTOMÁTICO do estádio dos clubes da CPU — mesma decisão que o usuário toma na mão
   via clBuildStand() (main.js), só que rodando uma vez por virada de temporada pra cada clube:
   constrói bancada de STAND_SEATS enquanto tiver caixa (S.budgets, já atualizado por
   applyCpuSeasonFinances logo acima) e respeitar o teto de porte + a cota da temporada — os
   MESMOS 3 limites que o usuário já enfrenta, sem sorteio nem heurística nova. Só solo/offline:
   na Resenha o cálculo autoritativo é do servidor (resolve-round), que ainda não tem essa lógica
   — sem essa trava cada cliente calcularia um crescimento diferente e os estádios divergiriam
   entre os jogadores da sala (etapa futura, fora desta entrega). */
function applyCpuStadiumGrowth(){
  if(!S || !S.budgets || !S.clubStadiumCap) return;
  if(typeof CL!=='undefined' && CL.online) return;   // na Resenha quem calcula é o servidor (folha única)
  if(typeof standCostFor!=='function' || typeof stadiumMaxCapacityFor!=='function') return;
  const humans=new Set();
  if(S.clubId) humans.add(S.clubId);
  if(typeof CL!=='undefined' && CL.humans) Object.keys(CL.humans).forEach(id=>humans.add(id));
  // A REGRA está em world-rules.js — a mesma que o resolve-round roda na Resenha. Daqui saem só
  // os limites (cota, custo e teto de porte vivem no main.js) e o overall de cada clube.
  WORLD_RULES.cpuCrescerEstadio(S, {
    humanos:humans,
    overall:id=>{ const c=clubOf(id); return c?c.overall:null; },
    custo:standCostFor,
    teto:stadiumMaxCapacityFor,
    capInicial:(id,ov)=>{ const c=clubOf(id);
      return (typeof realCapFor==='function' && c && realCapFor(c))
        || ((typeof REBAL.stadiumCap==='function')?REBAL.stadiumCap(ov):20000); },
    lugares:STAND_SEATS,
    cota:SEASON_BUILD_LIMIT
  });
}
function newSeasonReset(){
  applyCpuSeasonFinances();          // ANTES do swap de divisões: tabelas/elencos ainda são os do ano que fechou
  applyCpuStadiumGrowth();           // idem — usa o caixa (S.budgets) já atualizado pelo passo acima
  const finalPos=tablePos(S.clubId);
  const totalClubs=DATA.clubs.length;
  const prevDivision=S.division;
  // A posição doméstica só vale como classificação continental se o usuário DISPUTOU a divisão de
  // topo. Quem acabou de subir não jogou a Série A no ano anterior, então não tem posição nela —
  // e como promoção é sempre 1º-4º, essa posição caía dentro das 6 vagas de Libertadores
  // (unifiedContinentalQualification, acima) e TODO promovido entrava direto na Libertadores.
  // 0 = "sem posição na divisão de topo": lá o clube só mantém vaga se já tinha uma.
  const topDivision=(typeof DIV_ORDER!=='undefined' && DIV_ORDER.length) ? DIV_ORDER[0] : 'A';
  const playedTopDivision = prevDivision===topDivision;
  S._intlUserFinish = playedTopDivision ? finalPos : 0; // -> vaga na Champions/Europa/Libertadores da próxima temporada
  // CLASSIFICAÇÃO FINAL DA DIVISÃO DE TOPO — é ELA que dá as vagas continentais da próxima
  // temporada (ver unifiedContinentalPool). Capturada AQUI, antes de computeDivisionSwap/
  // switchToDivision zerarem as tabelas logo abaixo. Quando o usuário disputa a própria divisão
  // de topo é S.table; quando ele está numa divisão inferior, a de topo roda em segundo plano
  // (S.otherDivs) e a tabela dela vale igual.
  S._topFinalStandings = (playedTopDivision ? sortedTable()
    : sortTableRows((S.otherDivs && S.otherDivs[topDivision] && S.otherDivs[topDivision].table) || {})
  ).map(t=>t.id);
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
    DATA.clubs.forEach(c=>{ if(!S.squads[c.id]) S.squads[c.id]=gkSquad(c).map(p=>attachAttrs(initStats({...p}))); });
    const ids=DATA.clubs.map(c=>c.id);
    S.sched=makeSchedule(ids); S.round=0;
    S.table={}; DATA.clubs.forEach(c=>S.table[c.id]={id:c.id,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0});
    S._promoRelegNews=null;
    buildOtherDivisions();
  }
  S.week=1; S.day=1; S.season++;
  S.results=[]; S.scorers={}; S.scorersByComp={}; S.negos=[]; S.finished=false; S.pendingEvent=null;
  S.finances=[]; S.roundNews=[];
  S.seasonTotals={income:0,salaries:0,bonuses:0,opex:0,playerSales:0,playerPurchases:0,stadium:0}; // zera pra temporada nova
  // libera a cota de obras da nova temporada pro estádio do usuário (crescimento lento) — CPU já
  // reseta a dela em applyCpuStadiumGrowth, mas essa função pula humanos de propósito (ver acima).
  { const myId=(typeof CL!=='undefined' && CL.clubId) || S.clubId;
    if(S.clubStadiumCap && myId && S.clubStadiumCap[myId]) S.clubStadiumCap[myId].builtThisSeason=0; }
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
  // As continentais existem no MUNDO, não só quando o usuário está na Série A: quem as disputa
  // são os clubes classificados pela tabela final da Série A (S._topFinalStandings, ver
  // unifiedContinentalPool) — humanos ou CPU, com o usuário jogando a divisão que for. Antes isto
  // era condicionado à divisão DELE, então num save de Série B/C/D a Libertadores simplesmente
  // deixava de existir no mundo, e ao subir pra elite ele chegava sem competição montada.
  // Copa do Brasil segue rodando pra qualquer divisão, com clubes de A/B/C/D (copaBrasilQualification).
  // playedTopDivision: ver acima — recém-promovido entra com 0 (sem vaga pela posição doméstica),
  // senão a colocação dele na Série B valeria como se fosse colocação na Série A.
  initSeasonCups(unifiedContinentalQualification(playedTopDivision ? finalPos : 0));
  rollBgLeaguesSeason(); // vira a temporada das ligas de background (campeão/histórico/promoção)
  save();
}

/* toast */
function toast(msg){const box=$('#toast');const t=el('div','toast',msg);box.appendChild(t);vibrate(5);setTimeout(()=>t.remove(),2600);}

window.GAME={newGame,playRound,save,loadRaw,wipe,newSeasonReset,S:()=>S,setS:s=>S=s,
  COMP_DEFS,computeQualification,makeBracket,advanceCupBracket,advancePendingCups,cupTeamAlive,cupIsFinished,
  pendingDivisionChange,loadRealDivisionClubs,DIV_ORDER,
  startNego,clubRespond,agentRespond,finalizeTransfer,playerAsk,cpuBackgroundTransfers,advanceAuctions,placeAuctionBid,
  inTransferWindow,transferWindowStatus,nextWindowRound,TRANSFER_WINDOWS,
  pickPenaltyTaker,penaltyConvChance,initSeasonCups,computeQualification,buildOtherDivisions,autoManageSalaries,
  assignBehavior,BEHAVIOR_CARD_MULT,BEHAVIOR_INJURY_MULT,BEHAVIOR_MV_MULT,BEHAVIOR_DIST,attachAttrs};

