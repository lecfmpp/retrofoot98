/* ================================================================
   ELIFOOT MODERNO v3 — pele "Clássico" sobre o motor v2 (app.js)
   Recria a estética/fluxo do RetroFoot98 com assets e textos próprios.
   Telas na ordem: 01 abertura · 02 modo · 03 países · 04 moeda ·
   05 loading · 06 jogadores · 07 sorteio · 08-13 tela principal.
   ================================================================ */
const $c = s => document.querySelector(s);
const CL = { screen:'abertura', landingView:'home', save:'', currency:'Reais', countries:new Set(), names:['','','','','',''],
             draw:[], clubId:null, tab:'jogo', selPlayer:null, menu:null, ticket:8, mgr:'', mobMenuOpen:false,
             divisionToggle:{A:true,B:true,C:true,D:true}, compToggle:{libertadores:true, copaBrasil:true, sulamericana:true},
             testStartDiv:{} };
/* MODO TESTE (temporário, a pedido do usuário em 2026-08-03): libera escolher a divisão inicial
   do Brasil no Modo Solo (countryCompSection) e no Modo Resenha (scSalaHost, net/local-transport.js),
   pra dar pra testar tudo (Série A, copas continentais, promoção/rebaixamento...) antes do
   lançamento sem precisar subir manualmente da Série D. Depois do lançamento, voltar esta flag
   pra false — computeStartDivision() e o seletor da Resenha voltam a ignorar CL.testStartDiv e
   sempre começar na Série D, a regra de sempre (todo mundo começa embaixo e sobe). */
const TESTING_FREE_DIVISION_PICK = true;
function clSetTestStartDiv(uniKey, d){
  CL.testStartDiv = CL.testStartDiv || {};
  CL.testStartDiv[uniKey] = d;
  cdraw();
}
/* ---- troféu (imagem) das competições — usado na seleção de país e em qualquer
   tela que mostre o nome de uma competição, pra dar mais identidade visual ---- */
function trophyImg(key,size){ const src=(typeof TROPHIES!=='undefined')&&TROPHIES[key];
  if(!src) return ''; size=size||28;
  return `<img src="${src}" alt="" class="cl-trophy-img" style="width:${size}px;height:${size}px" draggable="false">`; }
/* resolve o troféu certo por divisão (A/B/C/D) — cai pro emoji 🏆 se ainda não tivermos a imagem daquela divisão */
function divisionTrophyImg(division,size){
  const key=({A:'serieA',B:'serieB',C:'serieC',D:'serieD'})[division];
  return trophyImg(key,size);
}

/* ---- helpers de dinheiro / texto ---- */
function grp(n){ return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,' '); }
/* reformata um <input> de dinheiro EM TEMPO REAL (agrupado por milhar, ver grp) preservando a
   posição do cursor — sem isto, reatribuir input.value a cada tecla (única forma de manter o
   agrupamento enquanto digita) sempre jogava o cursor pro FINAL do campo, então apagar um dígito
   no MEIO do número (ou selecionar tudo e apagar) ficava difícil/errático. Conta quantos dígitos
   existiam ANTES do cursor no valor antigo e recoloca o cursor depois da mesma quantidade de
   dígitos no valor novo formatado. Retorna o número digitado (na moeda de EXIBIÇÃO — quem chama
   converte pra R$ interno com curParse se precisar). */
function clMoneyInputReformat(input){
  const raw=input.value;
  const caret=input.selectionStart==null?raw.length:input.selectionStart;
  const digitsBeforeCaret=raw.slice(0,caret).replace(/\D/g,'').length;
  const t=parseInt(raw.replace(/\D/g,''))||0;
  const formatted=t?grp(t):'';
  input.value=formatted;
  if(t){
    let pos=formatted.length;
    if(digitsBeforeCaret<=0){ pos=0; }
    else{ let count=0;
      for(let i=0;i<formatted.length;i++){ if(/[0-9]/.test(formatted[i])){ count++; if(count===digitsBeforeCaret){ pos=i+1; break; } } }
    }
    try{ input.setSelectionRange(pos,pos); }catch(e){}
  }
  return t;
}
/* número de dinheiro agrupado JÁ convertido pra moeda de exibição (curConv/curSym vêm do
   index.html). O motor guarda tudo em R$; isto só apresenta na moeda escolhida. */
function moneyDisp(n){ return grp(Math.round(curConv(n))); }
function spellMoney(n){ n=Math.round(curConv(n));
  // opera no valor ABSOLUTO e prefixa o sinal uma única vez no final — Math.floor arredonda pra
  // -Infinity em número negativo, então fazer as contas direto em `n` negativo dava magnitude
  // errada (ex.: -1 milhão virava "-1 milhões", e valores não-redondos saíam com milhões/mil
  // completamente errados, não só o sinal).
  // Também inclui o RESTO abaixo de mil: antes ele era descartado (Math.floor jogava fora
  // qualquer coisa que não fosse milhão/milhar), então "Dinheiro em caixa" na tela principal
  // (spellMoney) e o valor exato em Finanças (moneyDisp) pareciam dois números DIFERENTES pro
  // mesmo caixa — eram o mesmo valor, só que um arredondado pra baixo silenciosamente.
  const neg=n<0, abs=Math.abs(n);
  const mi=Math.floor(abs/1e6), mil=Math.floor((abs%1e6)/1e3), rest=Math.round(abs%1e3); const p=[];
  if(mi) p.push(mi+(mi===1?' milhão':' milhões')); if(mil) p.push(mil+' mil');
  if(rest || !p.length) p.push(String(rest));
  const word={BRL:'reais',USD:'dólares',EUR:'euros'}[curInfo().iso]||'reais';
  const joined = p.length>1 ? p.slice(0,-1).join(', ')+' e '+p[p.length-1] : p[0];
  return (neg?'-':'')+joined+' '+word; }
/* UMA CASA DECIMAL SEMPRE, ACIMA DE 10M TAMBEM. Arredondar para inteiro a partir de 10M fazia
   a mesma quantia aparecer com dois numeros diferentes no mesmo cartao: a proposta dizia
   "R$ 10,60 mi" (rfDin) e a mensagem do clube, logo abaixo, "R$ 11M" — lido como se o clube
   tivesse oferecido outra coisa. */
function mvShort(mv){ mv=curConv(mv||0); return mv>=1e6? (mv/1e6).toFixed(1).replace(/\.0$/,'').replace('.',',')+'M' : Math.round(mv/1e3)+'k'; }
function posLetter(s){ return ({GK:'G',DEF:'D',MID:'M',ATT:'A'})[s]||'M'; }
/* ordena por posição (G, D, M, A) e depois por força — usado em listas de escalação/troca
   pra que jogador comprado apareça na posição certa, não no fim da lista */
function posRank(s){ return ({GK:0,DEF:1,MID:2,ATT:3})[s]!=null?({GK:0,DEF:1,MID:2,ATT:3})[s]:2; }
function bySquadOrder(a,b){ return posRank(a.s)-posRank(b.s) || (b.f||0)-(a.f||0); }
/* ---- atalhos universais: nome de clube/jogador em QUALQUER tela leva à
   ação correspondente — clube abre o elenco (do usuário ou de outro time
   pro mercado), jogador abre a ficha (venda, se for seu; oferta, se não). ---- */
function clubLink(clubId, label){
  if(!clubId || !clubOf(clubId)) return escC(label||'');
  const txt = label!=null ? label : clubOf(clubId).short;
  const action = clubId===CL.clubId ? `clGoSquad()` : `clViewTeam('${clubId}')`;
  return `<span class="cl-link" onclick="event.stopPropagation();${action}">${escC(txt)}</span>`;
}
function playerLink(playerName, clubId, label){
  if(!playerName) return '';
  const txt = label!=null ? label : playerName;
  if(!clubId) return escC(txt); // clube desconhecido (ex: jogador vendido/aposentado) — sem link quebrado
  const action = clubId===CL.clubId
    ? `clGoSquad('${escC(playerName)}')`
    : `clMarketPlayer('${clubId}','${escC(playerName)}')`;
  return `<span class="cl-link" onclick="event.stopPropagation();${action}">${escC(txt)}</span>`;
}
/* leva o usuário direto pro PRÓPRIO clube, opcionalmente já com um jogador selecionado.
   Com jogador: abre a aba JOGADOR (a ficha dele), que é o que o clique num nome promete —
   antes caía na aba Jogo e, pior, gravava o NOME em CL.selPlayer, enquanto todo o resto
   compara CL.selPlayer com p.pid: a seleção nunca casava e a ficha mostrava o 1º do elenco. */
function clGoSquad(playerName){ CL.menu=null; CL.rightMode=null; CL.screen='main';
  const p = playerName ? squad(CL.clubId).find(x=>x.n===playerName) : null;
  if(p){ CL.selPlayer=p.pid; CL.tab='jogador'; } else CL.tab='jogo';
  clCloseOverlay(); cdraw(); }
function shade(hex,amt){ hex=(hex||'#12224a').replace('#',''); if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');
  let r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
  const f=amt<0?0:255, t=Math.abs(amt); r=Math.round(r+(f-r)*t); g=Math.round(g+(f-g)*t); b=Math.round(b+(f-b)*t);
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join(''); }
function lumin(hex){ hex=(hex||'#000').replace('#',''); if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');
  const r=parseInt(hex.slice(0,2),16)/255,g=parseInt(hex.slice(2,4),16)/255,b=parseInt(hex.slice(4,6),16)/255; return 0.299*r+0.587*g+0.114*b; }
/* ---- identidade visual do clube (as DUAS cores oficiais) ----
   col = uniforme principal · col2 = secundária (clubes sem cor2 cadastrada,
   como os da Série A, ganham uma secundária derivada automaticamente). ---- */
function clubColors(club){ const col=(club&&club.color)||'#12224a'; const col2=(club&&club.color2)||shade(col,-0.35); return {col,col2}; }
/* cor de texto legível sobre o fundo `bg`: usa a cor secundária do clube se ela
   tiver contraste suficiente com o fundo; se as duas forem parecidas demais,
   cai pra preto ou branco (o que contrastar melhor). */
function barTextColor(bg, sec){
  const Lbg=lumin(bg);
  if(sec && Math.abs(Lbg - lumin(sec)) >= 0.45) return sec;
  return Lbg>0.58 ? '#111' : '#fff';
}
/* barra do clube: FUNDO = cor primária, TEXTO = cor secundária (com contraste
   garantido). O mesmo badge aparece igual em qualquer tela/tabela que mostra o
   nome do time numa barra (ao vivo, resultado, classificação, lobby, sorteio...) */
function clubStripe(club){ const {col,col2}=clubColors(club);
  return `background:${col};color:${barTextColor(col,col2)}`; }
/* acento de duas cores pra borda esquerda de linhas de lista (mercado, entrar na sala) */
function clubEdge(club){ const {col,col2}=clubColors(club); return `border-left-color:${col2};box-shadow:inset 4px 0 0 0 ${col}`; }
/* ===== REBRANDING 2026 · AS DUAS VARIÁVEIS QUE MUDAM POR CLUBE =====
   Todo o resto do cromo (--surface-*, --line-*, --text-*) é FIXO e igual para
   todos os times — foi decisão explícita do design system: o cromo não segue o
   clube, só o conteúdo do clube segue. Aqui escrevemos no elemento raiz apenas
   --club-primary/--club-secondary e as quatro derivadas que o CSS precisa, lidas
   de color/color2 do banco de clubes (as mesmas que clubColors() já usa).
   Roda a cada cdraw() porque o clube do usuário muda (sorteio, troca de emprego,
   assento no Modo Resenha) e o custo é escrever seis propriedades num nó só. */
function applyClubTokens(id){
  const el=document.documentElement; if(!el) return;
  const cl=(typeof clubOf==='function')?clubOf(id):null;
  // sem clube (home, login, onboarding antes do sorteio) o padrão do token vale:
  // XV Piracicaba, que é o clube em que o design foi desenhado e aprovado.
  if(!cl){ el.removeAttribute('data-club-tokens'); ['--club-primary','--club-primary-deep','--club-primary-soft','--club-primary-line','--club-secondary','--club-secondary-hover','--club-on-primary','--club-on-secondary'].forEach(k=>el.style.removeProperty(k)); return; }
  const {col,col2}=clubColors(cl);
  el.style.setProperty('--club-primary',col);
  el.style.setProperty('--club-primary-deep',shade(col,-0.35));   // topo da faixa do clube
  el.style.setProperty('--club-primary-soft',shade(col,0.90));    // fundo de chip/linha ativa
  el.style.setProperty('--club-primary-line',shade(col,0.78));    // hairline tingida
  el.style.setProperty('--club-secondary',col2);
  el.style.setProperty('--club-secondary-hover',shade(col2,0.18));
  // A secundária É A COR DO CLUBE, e em muitos times ela é quase igual à primária
  // (Palmeiras: verde escuro e verde). Sobre a faixa do clube — que é a primária —
  // ela sumiria. Este token é a MESMA regra de contraste que clubStripe() já usava
  // pro badge do time: usa a secundária quando ela contrasta, e cai pra branco/preto
  // quando as duas cores do clube são vizinhas demais.
  el.style.setProperty('--club-secondary-on-primary', barTextColor(col,col2));
  // FUNDO do botão Jogar. Pela mesma razão acima: em clube cujas duas cores são
  // vizinhas (Palmeiras, Vasco), um botão pintado com a secundária desaparece
  // dentro do card azul/verde do clube. Quando não há contraste, o CTA cai no
  // amarelo do design system — que é justamente o "botão de jogar" que o jogo
  // sempre teve, e continua sendo a ação mais visível da tela.
  const contrasta = Math.abs(lumin(col)-lumin(col2))>=0.45;
  el.style.setProperty('--club-cta-bg', contrasta?col2:'#F2B90C');
  el.style.setProperty('--club-cta-fg', contrasta?(lumin(col2)>0.58?'#12201a':'#ffffff'):'#12201a');
  // texto POR CIMA de cada uma das duas — mesma regra de contraste do clubStripe()
  el.style.setProperty('--club-on-primary',lumin(col)>0.58?'#12201a':'#ffffff');
  el.style.setProperty('--club-on-secondary',lumin(col2)>0.58?'#12201a':'#ffffff');
  el.setAttribute('data-club-tokens',cl.short||'');
}
function clubTheme(id){ const cl=clubOf(id); const {col,col2}=clubColors(cl); return { col, col2, bg:shade(col,-0.6), bg2:shade(col,-0.42),
  txt:lumin(col)>0.62?shade(col,-0.45):col, hdr:lumin(col)>0.62?'#111':'#fff' }; }
/* formações: G-D-M-A */
const FORMATIONS={ '3-3-4':[1,3,3,4],'3-4-3':[1,3,4,3],'4-2-4':[1,4,2,4],'4-3-3':[1,4,3,3],'4-4-2':[1,4,4,2],'4-5-1':[1,4,5,1] };
const FKEY={ '3-3-4':'F1','3-4-3':'F2','4-2-4':'F3','4-3-3':'F4','4-4-2':'F5','4-5-1':'F6' };
// preço propositalmente alto (aprox. o orçamento inicial inteiro de um clube recém-criado):
// expandir estádio de verdade é obra pesada, não dá pra sair comprando bancada toda hora —
// ver clBuildStand/pushFinanceEntry (aba Finanças) pra onde essa despesa é registrada.
const STAND_SEATS=5000, STAND_PRICE=4000000, STAND_START=20000;
const SEASON_BUILD_LIMIT=10000; // no máx. 2 bancadas (10 mil lugares) por temporada — obra é lenta, cresce por anos
/* capacidade INICIAL realista por porte do clube (proxy pelo overall — não temos capacidade
   real de estádio nos dados). Clube grande já nasce com estádio grande; pequeno, modesto. */
function realStadiumCapacity(overall){
  // item 4: capacidade por divisão (overall na escala NOVA) — A 75k · B 50k · C 25k · D 10k
  return (typeof REBAL!=='undefined') ? REBAL.stadiumCap(overall) : Math.round(clamp(6000 + Math.max(0,(overall||30)-50)*1350, 10000, 68000)/1000)*1000;
}
/* capacidade REAL de estádio (Transfermarkt) pros 352 clubes estrangeiros, quando existe — ver
   public/src/data/stadiums-intl.js (window.STADIUM_CAP, id do clube -> lugares) e
   scripts/build-stadiums.mjs. Clube sem dado real (raspagem não achou, clube novo, doméstico
   brasileiro) retorna null e quem chamar cai no fallback sintético de sempre — nenhum caso
   especial extra em lugar nenhum. */
function realCapFor(club){
  const v=(typeof STADIUM_CAP!=='undefined' && club) ? STADIUM_CAP[club.id] : null;
  return (typeof v==='number') ? v : null;
}
/* TETO de expansão por porte do clube: maior que a inicial, mas realista — um clube pequeno
   nunca constrói um estádio gigante. Nunca abaixo da capacidade atual (não "encolhe").
   Versão parametrizada (overall/capacidade por fora) pra dar pra usar tanto pro estádio do
   usuário quanto pro crescimento automático da CPU (applyCpuStadiumGrowth, core.js) sem
   duplicar a fórmula — stadiumMaxCapacity() abaixo é só um wrapper fino em cima. */
function stadiumMaxCapacityFor(overall, currentCap){
  // teto de expansão = capacidade inicial da divisão + folga (item 4, escala nova de overall)
  const byLevel = realStadiumCapacity(overall||30) + 15000;
  return Math.round(clamp(byLevel, currentCap||STAND_START, 90000)/1000)*1000;
}
/* estádio do PRÓPRIO usuário: S.clubStadiumCap[CL.clubId], o MESMO mapa por clube que a CPU usa
   (ver core.js) — não um campo à parte (S.stadium foi aposentado; era um campo único, sem dono,
   que não fazia sentido na Resenha com vários humanos dividindo o mesmo S — ver commitStadium). */
function myStadium(){ return (S.clubStadiumCap && S.clubStadiumCap[CL.clubId]) || null; }
function stadiumMaxCapacity(){
  const c=(typeof clubOf==='function')?clubOf(S.clubId):null; const st=myStadium();
  return stadiumMaxCapacityFor((c&&c.overall)||30, (st&&st.capacity)||STAND_START);
}
/* custo de UMA bancada — escala com o tamanho atual (estádio grande é mais caro de expandir).
   Mesma ideia: standCostFor(cap) parametrizada, standCost() é o wrapper do usuário. */
function standCostFor(cap){ return Math.round(STAND_PRICE*(0.7+(cap||STAND_START)/50000)); }
function standCost(){ const st=myStadium(); return standCostFor((st&&st.capacity)||STAND_START); }
/* preço de ingresso FIXO por divisão (valores reais informados) — A 25 / B 20 / C 15 / D 10.
   PRIZES.tierOf já mapeia QUALQUER divisão (Brasil A-D, ligas estrangeiras PL/CH/ES/ES2/etc.)
   pra uma dessas 4 faixas — mesmo mapa que os prêmios de liga já usam, sem inventar outro.
   Substitui levelTicketPrice(overall), que dava um número contínuo (6-16) por força do elenco. */
const TICKET_PRICE_BY_TIER={A:25, B:20, C:15, D:10};
function ticketPriceForDivision(div){
  const tier=(typeof PRIZES!=='undefined' && PRIZES.tierOf) ? PRIZES.tierOf(div) : 'A';
  return TICKET_PRICE_BY_TIER[tier] || TICKET_PRICE_BY_TIER.D;
}
function tacticPosture(f){ const a=(FORMATIONS[f]||[1,4,3,3])[3]; return a>=4?'ofensivo':a<=1?'retranca':'equilibrado'; }
/* quando o elenco não tem jogadores suficientes numa posição pra formação escolhida
   (ex: 4-5-1 sem 5 meio-campos), pickXIByFormation preenche com quem sobrar de outra
   posição — mas o resultado real de defesas/meios/ataques deixa de bater com a
   formação escolhida. Aqui a gente acha, entre as formações existentes, a mais
   parecida que o elenco realmente comporta, pra manter o botão marcado e a tática
   coerentes com o onze que vai a campo. */
function squadPositionCounts(id){ const c={GK:0,DEF:0,MID:0,ATT:0}; squad(id).forEach(p=>{ if(c[p.s]!=null) c[p.s]++; }); return c; }
function formationFits(f,counts){ const need=FORMATIONS[f]; return need && counts.DEF>=need[1] && counts.MID>=need[2] && counts.ATT>=need[3]; }
function coherentFormation(id,preferred){
  const counts=squadPositionCounts(id);
  if(formationFits(preferred,counts)) return preferred;
  const need0=FORMATIONS[preferred]; let best=null,bestScore=Infinity;
  Object.keys(FORMATIONS).forEach(k=>{ if(!formationFits(k,counts)) return;
    const n=FORMATIONS[k]; const score=Math.abs(n[1]-need0[1])+Math.abs(n[2]-need0[2])+Math.abs(n[3]-need0[3]);
    if(score<bestScore){ bestScore=score; best=k; } });
  return best || preferred;
}
/* "MELHORES" É O MELHOR DE CADA POSIÇÃO, NÃO OS 11 MAIS FORTES.
   Antes esta opção ordenava o elenco inteiro por força e cortava nos 11 primeiros, sem olhar
   posição nenhuma: se o goleiro não estivesse entre os 11 mais fortes do elenco, o time entrava
   em campo SEM GOLEIRO — e podia entrar sem zagueiro também, pelo mesmo motivo.
   O que "melhores" quer dizer de verdade é: entre as formações que o jogo tem, aquela cujo onze
   soma mais força, com cada setor preenchido pelos mais fortes daquele setor. Assim o goleiro é
   sempre o melhor goleiro (nunca um ausente), e a escolha continua sendo "o time mais forte
   possível" — só que um time que existe. Devolve null se nenhuma formação couber no elenco. */
function bestFormationForSquad(id){
  // só quem pode jogar entra na conta (ver squadEscalavel): senão a formação era escolhida contando
  // com um zagueiro machucado e o onze montado depois não tinha como preencher aquele setor
  const sq=squadEscalavel(id).slice().sort((a,b)=>b.f-a.f);
  const porSetor={GK:[],DEF:[],MID:[],ATT:[]};
  sq.forEach(p=>{ if(porSetor[p.s]) porSetor[p.s].push(p); });
  const secs=['GK','DEF','MID','ATT'];
  // desempate: num elenco de forças parecidas, várias formações somam o MESMO total e a escolha
  // cairia sempre na primeira da lista (3-3-4) — o time viraria ofensivo por acidente de ordem.
  // Empatou, fica a forma mais próxima do 4-4-2, que é a neutra.
  const distanciaDoNeutro=f=>{ const n=FORMATIONS[f]; return Math.abs(n[1]-4)+Math.abs(n[2]-4)+Math.abs(n[3]-2); };
  let melhor=null, melhorForca=-1;
  Object.keys(FORMATIONS).forEach(f=>{
    const need=FORMATIONS[f]; let forca=0, incompleta=false;
    secs.forEach((sec,i)=>{
      const tem=porSetor[sec].slice(0,need[i]);
      if(tem.length<need[i]) incompleta=true;
      tem.forEach(p=>forca+=p.f);
    });
    if(incompleta) return;                       // o elenco não comporta esta formação
    if(forca>melhorForca || (forca===melhorForca && melhor && distanciaDoNeutro(f)<distanciaDoNeutro(melhor))){
      melhorForca=forca; melhor=f;
    }
  });
  return melhor;
}
/* QUEM PODE SER ESCALADO: sem lesão e sem suspensão — a MESMA régua do motor (isAvail em
   match-engine.js, availableXI em simulate.js). Os dois seletores abaixo montavam o onze a partir
   do elenco inteiro, então escalavam machucado e suspenso; na hora do jogo o motor filtrava de
   novo e o time entrava em campo DESFALCADO, sem o usuário entender por quê.
   No "Seleccionar descansados" era pior ainda e sistemático: quem está machucado não joga, não
   gasta energia e por isso aparecia no TOPO da ordenação por energia — o botão de descansar
   praticamente escolhia os lesionados. */
function squadEscalavel(id){ return squad(id).filter(p=>!(p.suspended>0)&&!(p.injuredMatches>0)); }
/* preenche o que faltar do onze, primeiro com quem está apto e só no fim com o resto do elenco
   (elenco muito desfalcado: 11 com um machucado ainda é melhor que entrar com 9) */
function completaXI(id,xi,sq){
  if(xi.length>=11) return xi;
  const have=new Set(xi);
  const add=pid=>{ if(xi.length<11 && !have.has(pid)){ xi.push(pid); have.add(pid); } };
  for(const p of sq){ if(p.s!=='GK') add(p.pid); }  // jogadores de linha primeiro
  for(const p of sq){ add(p.pid); }                  // 2º goleiro só se não sobrar mais ninguém
  if(xi.length<11) for(const p of squad(id)) add(p.pid);   // último recurso: evita XI < 11
  return xi;
}
function pickXIByFormation(id,f){ const need=FORMATIONS[f]||FORMATIONS['4-3-3']; const secs=['GK','DEF','MID','ATT'];
  const sq=squadEscalavel(id).slice().sort((a,b)=>b.f-a.f); const xi=[];   // xi = lista de PIDs
  secs.forEach((sec,i)=>{ sq.filter(p=>p.s===sec).slice(0,need[i]).forEach(p=>xi.push(p.pid)); });
  return completaXI(id,xi,sq).slice(0,11); }
/* mesma lógica de pickXIByFormation, mas ordenando por energia (menos cansados primeiro)
   em vez de força — usada pelo botão "Seleccionar descansados" */
function pickXIByFormationRested(id,f){ const need=FORMATIONS[f]||FORMATIONS['4-3-3']; const secs=['GK','DEF','MID','ATT'];
  const nrg=p=>(p&&p.energy!=null)?p.energy:100;
  const sq=squadEscalavel(id).slice().sort((a,b)=>nrg(b)-nrg(a)||b.f-a.f); const xi=[];   // xi = lista de PIDs
  secs.forEach((sec,i)=>{ sq.filter(p=>p.s===sec).slice(0,need[i]).forEach(p=>xi.push(p.pid)); });
  return completaXI(id,xi,sq).slice(0,11); }
/* simula uma partida completa capturando eventos (determinístico; usa SIM_SYNC do motor) */
function simEventsC(h,a,seed,opts){ const evs=[]; let fin=null; const isU=(h===S.clubId||a===S.clubId);
  const prev=(typeof SIM_SYNC!=='undefined')?SIM_SYNC:false; if(typeof SIM_SYNC!=='undefined')SIM_SYNC=true;
  try{ const s=simulateMatch(h,a,isU,(t)=>{ if(t.ev) evs.push({min:t.minute,type:t.ev.type,team:t.ev.team,side:t.ev.side,scorer:t.ev.scorer,
      player:t.ev.player,pos:t.ev.pos,cardType:t.ev.cardType,reason:t.ev.reason,severity:t.ev.severity,outMatches:t.ev.outMatches}); },(res)=>{fin=res;}, seed, opts);
    let g=0; while(!fin && g++<600){ s.step(); } }
  finally{ if(typeof SIM_SYNC!=='undefined')SIM_SYNC=prev; }
  return {hg:fin.hg,ag:fin.ag,scorers:fin.scorers,events:evs,perf:fin.perf,caps:fin.caps,matchMinutes:fin.matchMinutes}; }
function escC(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function rngFrom(seed){ let x=(seed>>>0)||1; return ()=>{ x^=x<<13; x^=x>>>17; x^=x<<5; return ((x>>>0)/0xffffffff); }; }
const REFS_C=['Anderson Daronco','Wilton Sampaio','Raphael Claus','Bráulio da Silva','Ramon Abatti','Flávio Rodrigues','Ferreira Rodrigues'];
const COACHES_C=['Arnaldo Lira','Renato Bianchi','Vanderlei Souza','Paulo Meira','Zé Carlos','Ademir Fonseca','Cuca Ramires'];

/* ---- chrome Win3.1 ---- */
function deskWrap(inner,opts){ opts=opts||{};
  const logoImg=`<img class="cl-desk-logo" src="img/logo.webp" width="500" height="500" alt="RetroFoot98" draggable="false">`;
  const logo=opts.logo?(opts.linkHome?`<a class="cl-logo-link" href="https://retrofoot98.com.br/" aria-label="RetroFoot98 — página inicial">${logoImg}</a>`:logoImg):'';
  return `<div class="cl-desk">${logo}${inner}</div>`; }
function topbarAuth(){
  if(typeof NET==='undefined' || !NET.authStatus) return '';
  const st=NET.authStatus(); if(!st.loggedIn) return '';
  const label=st.name||(st.email||'').split('@')[0]||'Conta';
  return `<div class="cl-topbar-auth" title="${escC(st.email||'')}">
    <span class="cl-topbar-auth-name">👤 ${escC(label)}</span>
    <button class="cl-topbar-auth-out" onclick="clAuthLogout()">Sair</button>
  </div>`;
}
async function clAuthLogout(){
  try{ if(typeof NET!=='undefined' && NET.authSignOut) await NET.authSignOut(); }catch(e){ console.warn('Logout erro:', e); }
  CL.screen='abertura'; CL.landingView='home'; cdraw();
  if(typeof toastC==='function') toastC('Sessão encerrada.');
}
/* opts.phoneHide: some no telefone. Só nas telas que têm a gaveta lateral (main/seatturn) —
   lá o "Sair" da conta reaparece como último item do menu (ver menuSairHTML), então a faixa
   cinza vira só ruído em cima da janela do clube. */
function titleBarTop(t,opts){ opts=opts||{};
  const logoImg=`<img class="cl-topbar-logo" src="img/logo.webp" width="500" height="500" alt="">`;
  const logo=opts.logo?(opts.linkHome?`<a class="cl-logo-link" href="https://retrofoot98.com.br/" aria-label="RetroFoot98 — página inicial">${logoImg}</a>`:logoImg):'';
  return `<div class="cl-topbar${opts.phoneHide?' cl-topbar-nophone':''}">${logo}${escC(t)}${topbarAuth()}</div>`; }
/* "Sair" (da CONTA, mesmo clAuthLogout da barra cinza) como último item da gaveta no telefone.
   Só aparece logado — deslogado a barra cinza também não mostrava nada. */
function menuSairHTML(){
  if(typeof NET==='undefined' || !NET.authStatus) return '';
  const st=NET.authStatus(); if(!st.loggedIn) return '';
  return `<span class="cl-menu-i cl-menu-sair" onclick="clMenuPick();clAuthLogout()">Sair da conta</span>`;
}
/* MODAL DE MENU PADRÃO (handoff "Padronização de modais do menu"): opts.std liga a anatomia
   única — 640px, corpo cinza, ✕ na barra de título, área de conteúdo que rola sozinha entre
   título e rodapé FIXOS, e o rodapé como slot (opts.footer) com os botões numa linha à direita.
   É OPT-IN de propósito: os modais narrativos (pênalti, lesão, sorteio, fim de temporada) têm
   moldura e cor próprias por decisão do próprio handoff, e os demais só migram quando forem
   convertidos um a um. Sem opts.std, dlg() se comporta exatamente como antes. */
/* ===== SLOT DE PUBLICIDADE (handoff "Novos Modais design update") =====
   UM slot por janela, no rodapé do corpo e logo acima da barra de ação. A moldura de bisel
   invertido + o rótulo "PUBLICIDADE" (que vem do CSS, não do HTML) fazem o bloco ler como área
   reservada do jogo, e não como arte solta colada por cima.
   A "arte" vem do MESMO inventário de patrocinadores que a faixa do Camarote e a pausa já usam
   (AD_SPONSORS): logo, chamada e cores por marca, num lugar só. Sem entrega de anunciante, o
   slot cai no anúncio-casa — que é a própria marca do jogo, não um cartaz inventado.
   `slot` é a chave do espaço no ad server: nunca repetir o mesmo id em telas diferentes.

   ENTREGA REAL (painel dos sócios): quando existe criativo publicado para esta chave
   (ver public/src/net/ads.js e a tabela elifoot_v3.ad_spaces), é ELE que aparece — a
   arte enviada pelo anunciante, com o link dele. O anúncio-casa abaixo continua sendo
   o que preenche o espaço enquanto ninguém comprou aquela chave. */
function adSlotHTML(slot, opts){
  opts = typeof opts==='string' ? {cls:opts} : (opts||{});
  // espaco desligado no painel: a janela fecha sem a faixa, e sem sobra de margem
  if(window.ADS && ADS.ligado && !ADS.ligado(slot)) return '';
  if(window.ADS){ const real=ADS.html(slot, {cls:'cl-ad '+(opts.cls||'')}); if(real) return real; }
  /* espaco de venda (chave rf98.*) sem criativo: mostra o LUGAR, nao o anuncio-casa — e o
     inventario que o painel vende, e ele tem de ser visivel para se poder conferir */
  if(/^rf98\./.test(String(slot||'')) && typeof rfAdEspaco==='function')
    return rfAdEspaco(slot, {cls:'cl-ad '+(opts.cls||''), formato:opts.formato||'728×90'});
  const i=Math.abs(hashC(String(slot||'')))%AD_SPONSORS.length;
  const s=AD_SPONSORS[i];
  return `<div class="cl-ad ${opts.cls||''}" data-ad-slot="${escC(slot||'')}">
    <div class="cl-ad-in" style="background:${s.bg};color:${s.fg}">
      <img class="cl-ad-logo" src="${s.src}" alt="${escC(s.nome)}">
      <span class="cl-ad-txt">${escC(s.cta)}</span>
      <button type="button" class="cl-ad-cta" style="${camCtaStyle(i)}" onclick="adSlotClick('${escC(slot||'')}',${i})">SAIBA MAIS</button>
    </div>
  </div>`;
}
/* mesma mecânica do botão do Camarote (camAdClick) e da faixa de copa: abre em aba nova, sem
   handle da janela do jogo, e registra o clique por marca — aqui com o id do slot. */
function adSlotClick(slot, i){
  const s=AD_SPONSORS[i]; if(!s) return;
  try{ if(typeof gtag==='function') gtag('event','sponsor_click',{sponsor:s.nome, placement:slot||'modal'}); }catch(e){}
  if(!s.url){ toastC('Link do patrocinador ainda não configurado ('+s.nome+').'); return; }
  window.open(s.url,'_blank','noopener,noreferrer');
}
/* ===== DIALOG (rebranding 2026, telas/Popups e Toasts.html) =====
   Uma peça só pra todo popup do jogo. A anatomia é a da referência:
   cabeçalho na cor do clube com filete de 6px, glifo, título, subtítulo e
   ✖; corpo em card branco; rodapé com as ações à direita.

   Reescrever aqui converte TODOS os popups de uma vez — são ~90 chamadas de
   dlg() espalhadas pelo main.js, e nenhuma precisou mudar: a assinatura
   (title, body, opts) é a mesma, e `opts` só ganhou campos opcionais.

   opts.glyph    emoji do cabeçalho (o único sistema de ícones do projeto)
   opts.sub      subtítulo, abaixo do título
   opts.badge    pílula à direita — aceita o formato antigo {icon,label}
   opts.footer   ações; sem ele, o corpo entra inteiro (as telas antigas
                 desenham o próprio bloco de botões dentro do body)
   opts.tone     'light' força cabeçalho claro; o padrão é a cor do clube */
function dlg(title,body,opts){
  opts=opts||{};
  const w=opts.w||(opts.std?640:620);
  const claro=opts.tone==='light';
  const badgeTxt = opts.badge ? (typeof opts.badge==='string'?opts.badge:(opts.badge.label||'')) : '';
  const badgeIco = (opts.badge&&opts.badge.icon)||'';
  const glyph = opts.glyph||badgeIco||'';
  /* tone:'marca' -> cabecalho no azul/amarelo do JOGO, nao do clube. Serve as
     telas que nao sao do seu clube: a sala em espera e da SALA, e num clube de
     segunda cor branca o filete do cabecalho desaparecia (mesmo caso ja
     corrigido na faixa do clube). */
  const tom = claro ? '' : (opts.tone==='marca' ? 'rf-dlg-marca' : 'rf-dlg-club');
  return `<div class="rf-dlg ${tom}" style="width:${w}px">
    <div class="rf-dlg-hd">
      ${claro?'':'<div class="rf-dlg-filete"></div>'}
      ${glyph?`<span class="rf-dlg-glyph">${glyph}</span>`:''}
      <div class="rf-dlg-ttl">
        <span class="rf-dlg-t">${escC(title)}</span>
        ${opts.sub?`<span class="rf-dlg-sub">${escC(opts.sub)}</span>`:''}
      </div>
      <div class="rf-dlg-sp"></div>
      ${badgeTxt?`<span class="rf-dlg-badge">${escC(badgeTxt)}</span>`:''}
      ${opts.obrigatorio?'':'<button class="rf-dlg-x" type="button" title="Fechar" aria-label="Fechar" onclick="clCloseOverlay()">✖</button>'}
    </div>
    <div class="rf-dlg-body">${opts.ad?dlgBodyComAd(body,opts.ad):body}</div>
    ${opts.footer?`<div class="rf-dlg-foot">${opts.footer}</div>`:''}
  </div>`;
}
/* blocos de número do popup de celebração (CAMPANHA · PREMIAÇÃO na referência) */
function rfStatBlocks(pares){
  return `<div class="rf-dlg-stats">${pares.map(([l,v])=>`<div class="rf-dlg-stat">
    <span class="rf-label-t">${escC(l)}</span>
    <span class="rf-dlg-stat-v">${escC(v)}</span></div>`).join('')}</div>`;
}
/* O SLOT FICA ACIMA DA BARRA DE AÇÃO (regra do handoff). Nas janelas simples os botões moram
   DENTRO do corpo (bloco .cl-cal-ok), então grudar o anúncio no fim jogaria ele embaixo do OK —
   o usuário passaria por cima do botão pra ver o anúncio. Aqui ele entra logo antes desse bloco;
   se a janela não tem barra de ação, vai pro fim mesmo. */
function dlgBodyComAd(body, slot){
  const ad=adSlotHTML(slot);
  const i=String(body).lastIndexOf('<div class="cl-cal-ok"');
  return i<0 ? body+ad : body.slice(0,i)+ad+body.slice(i);
}
function btn(label,onclick,opts){ opts=opts||{}; return `<button class="cl-btn ${opts.cls||''}" ${opts.dis?'disabled':''}${opts.title?` title="${escC(opts.title)}"`:''} onclick="${onclick}">${opts.icon?`<span class="cl-btn-ic">${opts.icon}</span>`:''}<span>${escC(label)}</span></button>`; }

/* ================= RENDER RAIZ ================= */
/* overlay de carregamento full-screen pra virada de rodada online — evita mostrar uma tela
   principal DESATUALIZADA (rodada anterior) por uma fração de segundo antes da classificação
   aparecer. Sem isso: rodada termina -> tela principal (ainda com dados velhos) -> classificação
   -> tela principal (agora atualizada) — o usuário via a mesma tela duas vezes, a primeira errada.
   Com isso: rodada termina -> loading -> classificação (uma vez) -> tela principal (uma vez, já
   atualizada). Não usa overlayC() de propósito (aquele é clicável/fechável — este não pode ser
   dispensado no meio da sincronização). */
/* ===== PAUSA PATROCINADA (handoff "Pausa Patrocinada.dc.html") =====
   Tela que cobre o intervalo entre o fim da rodada e a classificação, no lugar de mostrar a tela
   principal DESATUALIZADA (a rodada só avança quando o servidor fecha). Layout do handoff:
   cabeçalho de etapa com relógio, palco com a TV de tubo tocando o GIF, coluna de piadas +
   checklist do que está sincronizando, barra de progresso e faixa de patrocinadores em marquee.
   Os assets (GIFs, TV, sala, logos) são servidos pelo hosting — todo jogador baixa da nuvem. */
const PAUSA_GIFS=[
  { src:'img/sync/sync1.gif', cap:'ROMÁRIO — O ELÁSTICO QUE PAROU O MARACANÃ' },
  { src:'img/sync/sync2.gif', cap:'ROMÁRIO — O BAIXINHO PEDINDO A BOLA NA ÁREA' },
  { src:'img/sync/sync3.gif', cap:'EDMUNDO — O ANIMAL COMEMORANDO NA GERAL' },
  { src:'img/sync/sync4.gif', cap:'CAMISA 10 DO VASCO — CLÁSSICO DE SÃO JANUÁRIO' },
  { src:'img/sync/sync5.gif', cap:'EDÍLSON CAPETINHA — EMBAIXADINHA NO CLÁSSICO' },
  { src:'img/sync/sync6.gif', cap:'VAMPETA E RONALDO — RESENHA NA SELEÇÃO' },
  { src:'img/sync/sync7.gif', cap:'RENATO GAÚCHO — O GOL DE BARRIGA' },
];
/* máx. ~72 caracteres por frase — cabe em 2 linhas sem apertar (regra do handoff) */
const PAUSA_JOKES=[
  'Nos anos 90, o VAR era o bandeirinha com dor nas costas.',
  'Camisa 10 daquela época não corria. Decidia andando.',
  'Pênalti só era pênalti se o juiz visse. E ele nunca via.',
  'Travou? Alguém subia no telhado pra mexer na antena.',
  'O meio-campo era pelado. Ninguém reclamava: era tática.',
  'Contratação saía no jornal de domingo. Chegava na quarta.',
];
/* ---- PATROCINADORES ----
   Fonte ÚNICA: logo, chamada e cores do botão de cada marca. A faixa do Modo Camarote destaca uma
   marca por vez e mostra O BOTÃO DELA ao lado (é o clique que vale pro patrocinador — ver
   camAdClick); o marquee da pausa usa só os logos.

   `url` está VAZIO de propósito: não invento link de patrocinador. Preencha aqui com a URL real
   (ou de afiliado) de cada marca e o botão passa a abrir sozinho — enquanto estiver vazio ele
   avisa no toast em vez de abrir uma página quebrada. */
const AD_SPONSORS=[
  { nome:'Betano', src:'img/sponsors/betano.png', url:'',
    cta:'Faça a sua primeira aposta e ganhe R$ 30 de volta',
    bg:'#cc0000', fg:'#ffffff', bevel:'#ff6b6b #6a0000 #6a0000 #ff6b6b' },
  { nome:'CazéTV', src:'img/sponsors/cazetv.webp', url:'',
    cta:'Assista à Premier League de graça',
    bg:'#000080', fg:'#ffff00', bevel:'#4040c0 #000030 #000030 #4040c0' },
  { nome:'iFood', src:'img/sponsors/ifood.svg', url:'',
    cta:'Pegue o cupom RetroFoot98 de 30%',
    bg:'#0b7a2f', fg:'#eaffea', bevel:'#3fcf6a #063d18 #063d18 #3fcf6a' },
];
const AD_LOGOS=AD_SPONSORS.map(s=>s.src);
/* Piso da pausa técnica — a ÚNICA espera que sobrou por opção, não por proteção: é a janela em
   que o patrocinador aparece (ver .rf-sponsor em scWaitRound) e em que o clipe/piada giram (a
   cada 5s, ou seja, uma troca por pausa). Tudo o mais no fechamento da rodada foi cortado pro
   mínimo; este número é decisão de produto. Para tirar a janela por completo, basta 0 aqui — a
   sincronia não depende dela em nada. */
const AD_MIN_MS=10000;
function pausaGif(){ return PAUSA_GIFS[(CL._pausaI||0)%PAUSA_GIFS.length]; }
function pausaJoke(){ return PAUSA_JOKES[(CL._pausaI||0)%PAUSA_JOKES.length]; }
/* quanto falta da janela de 10s, em segundos e em % (é o que o relógio e a barra mostram:
   progresso REAL da pausa, não um número decorativo). */
function pausaLeft(){ return Math.max(0, Math.ceil((AD_MIN_MS-(nowMs()-(CL._waitSince||nowMs())))/1000)); }
/* a pausa passou MUITO do previsto (a janela normal é de 10s) -> algo travou no fechamento da
   rodada; libera a saída de emergência da tela (ver scWaitRound). */
// 15s: a pausa normal são 10s, então 15s já é claramente fora do padrão — dá 5s do aviso "ainda
// sincronizando" antes de oferecer a sincronia. Foi 30s e depois 18s; 30s era tempo demais parado
// olhando pra uma tela que não explica nada (o jogador recarregava a página antes de descobrir
// que havia saída). É o MESMO limite do modal automático (ver onlineTimerLoop): o botão na barra
// e a oferta automática aparecem juntos, não em momentos diferentes.
/* Só governa o BOTÃO "Sincronizar a Resenha" dentro da tela de pausa — um botão discreto, que o
   jogador usa se quiser. Era 15s, quando esperar significava travamento; hoje a sala espera de
   propósito pelo carimbo de alguém, e 15s é menos do que outro humano leva para escalar. 45s deixa
   a saída à mão sem sugerir que algo quebrou. A oferta AUTOMÁTICA saiu (ver onlineTimerLoop). */
const WAIT_ESCAPE_MS=45000;
function pausaStuck(){ return (nowMs()-(CL._waitSince||nowMs())) >= WAIT_ESCAPE_MS; }
/* barra em DEGRAUS de 10%: com a janela de 10s e o tique de 1s, cada segundo é exatamente um
   degrau — o jogador lê o avanço em vez de ver um número arbitrário (a conta contínua mostrava
   16%, 41%... conforme o instante do desenho). Math.floor pra nunca marcar 100% antes da hora. */
function pausaPct(){
  const frac=(nowMs()-(CL._waitSince||nowMs()))/AD_MIN_MS;
  return Math.max(0, Math.min(100, Math.floor(frac*10)*10));
}
/* a janela de 10s estourou e a rodada AINDA não sincronizou: o relógio e a barra não podem
   fingir que acabou (00:00 + 100% parado lia como "travou") — viram estado de espera explícito */
function pausaOvertime(){ return !CL._roundSyncedAt && (nowMs()-(CL._waitSince||nowMs()))>=AD_MIN_MS; }
/* checklist honesto: só o MEU resultado está garantido quando eu caio aqui — a tabela, as
   finanças e as propostas dependem do fechamento da rodada no servidor (todos os resultados),
   que é exatamente o que esta tela espera (ver adGate). ✓ antes disso era mentira: o item
   "Tabela" aparecia pronto com a rodada ainda aberta, e o usuário lia o resto como travado. */
/* rótulo da barra: enquanto a janela corre, a mensagem de sempre; estourada, diz o que de fato
   falta — gente publicando ou o servidor fechando. Era um texto fixo culpando "os outros
   treinadores" mesmo quando todos já tinham publicado e a espera era do servidor. */
function pausaWaitLabel(){
  if(!pausaOvertime()) return 'Todos os treinadores voltam a jogar ao mesmo tempo. Segura aí';
  let outros=true;
  if(CL.online && typeof NET!=='undefined' && NET.allHumanResultsIn && typeof S!=='undefined' && S){
    try{ outros=!!NET.allHumanResultsIn(S.round); }catch(e){ outros=true; }
  }
  return outros ? 'Ainda sincronizando — o servidor está fechando a semana'
                : 'Ainda sincronizando — esperando os resultados dos outros treinadores';
}
function pausaChecklist(){
  const it=(st,txt)=>`<div class="rf-srow"><span class="${st==='ok'?'rf-sdone':st==='wait'?'rf-swait':'rf-sdim'}">${st==='ok'?'✓':st==='wait'?'⏳':'·'}</span><span class="${st==='dim'?'rf-sdim':''}">${txt}</span></div>`;
  // sincronizado = o servidor fechou a rodada E este cliente já adotou o estado novo (ver adGate)
  const sincronizou=!!CL._roundSyncedAt;
  // faltam resultados de outros treinadores? Estado REAL, lido dos assentos da sala — é o que
  // distingue "esperando gente" de "esperando o servidor", as duas únicas causas de espera aqui.
  let outros=true;
  if(CL.online && typeof NET!=='undefined' && NET.allHumanResultsIn && typeof S!=='undefined' && S){
    try{ outros=!!NET.allHumanResultsIn(S.round); }catch(e){ outros=true; }
  }
  return it('ok','Sua partida')
    +it((sincronizou||outros)?'ok':'wait','Resultados dos outros treinadores')
    +it(sincronizou?'ok':'wait','Fechamento da semana no servidor')
    +it(sincronizou?'ok':'dim','Tabela, finanças e propostas');
}
function adTilesHTML(){        // 6 ladrilhos (3 marcas repetidas) — marquee do handoff
  const seq=[0,1,2,0,1,2];
  return seq.map(i=>`<span class="rf-tile"><img src="${AD_LOGOS[i]}" alt="patrocinador"></span>`).join('');
}
/* GATE DE PUBLICIDADE: quando a rodada sincroniza, a continuação (classificação -> time novo)
   NÃO roda na hora — fica presa aqui até (a) completar os 10s da pausa, que aí segue sozinha, ou
   (b) o usuário clicar em "Pular publicidade", botão que SÓ aparece quando a sincronia de fato
   terminou (antes disso não há pra onde pular). Fora da pausa, passa direto. */
function adGate(fn){
  // MARCA A SINCRONIA ANTES DE QUALQUER SAÍDA: chegar aqui significa que o servidor fechou a
  // rodada e o cliente adotou o estado — é o sinal de backend que o checklist mostra. Ficava
  // pendurado no _adCont, que só existe quando a rodada fecha DENTRO da janela de 10s; fechando
  // depois (justamente o caso lento que o jogador fica olhando), os ✓ nunca apareciam mesmo com
  // o trabalho pronto. E o _adCont volta a null assim que o portão libera, apagando os ✓.
  CL._roundSyncedAt=nowMs();
  if(CL.screen!=='waitround'){ fn(); return; }
  const elapsed=nowMs()-(CL._waitSince||0);
  if(elapsed>=AD_MIN_MS){ fn(); return; }
  CL._adCont=fn;
  const sk=$c('#cl-ad-skip'); if(sk) sk.style.display='';
  if(CL._adT) clearTimeout(CL._adT);
  CL._adT=setTimeout(clAdSkip, AD_MIN_MS-elapsed);
}
function clAdSkip(){
  if(CL._adT){ clearTimeout(CL._adT); CL._adT=null; }
  const fn=CL._adCont; CL._adCont=null;
  if(fn){ try{ fn(); }catch(e){ console.warn('ad gate:', e); } }
}
/* ticker único da pausa: gira GIF+piada a cada 5s e atualiza relógio/barra/checklist a cada
   segundo. Morre sozinho quando a tela sai de cena. */
function ensureSyncFunTicker(){
  if(CL._syncFunT) return;
  CL._syncFunT=setInterval(()=>{
    /* ===== O TIQUE MATAVA-SE A SI PROPRIO NA TELA NOVA =====
       A condicao de vida era "existe #rf-gif". Esse elemento e a TV da pausa ANTIGA; a tela
       portada (rfPausaHTML) nao a desenhava, entao logo no primeiro segundo o intervalo nao
       encontrava a TV, limpava-se e ia embora -- levando com ele a barra de progresso, a
       percentagem, o rotulo e o checklist do que o servidor esta a fazer. Era por isso que a
       Pausa Patrocinada ficava simplesmente PARADA: nao havia nada por tras a mexer nela.
       Quem manda na vida do tique e a TELA, nao um elemento dela. */
    if(CL.screen!=='waitround'){ clearInterval(CL._syncFunT); CL._syncFunT=null; return; }
    const stage=$c('#rf-gif');
    CL._pausaTick=(CL._pausaTick||0)+1;
    if(CL._pausaTick%5===0){                                  // 5s: próximo GIF + próxima piada
      CL._pausaI=((CL._pausaI||0)+1)%Math.max(PAUSA_GIFS.length,PAUSA_JOKES.length);
      const g=pausaGif();
      if(stage) stage.src=g.src;
      const bg=$c('#rf-gifbg'); if(bg) bg.src=g.src;   // fundo desfocado acompanha o clipe
      const cap=$c('#rf-gifcap'), num=$c('#rf-gifnum'), jk=$c('#rf-joke');
      if(cap) cap.textContent=g.cap;
      if(num) num.textContent=((CL._pausaI%PAUSA_GIFS.length)+1)+'/'+PAUSA_GIFS.length;
      if(jk) jk.textContent=pausaJoke();
    }
    const clk=$c('#rf-clock'), pct=$c('#rf-pct'), fill=$c('#rf-fill'), chk=$c('#rf-check'), lbl=$c('#rf-proglabel');
    const over=pausaOvertime();
    if(clk) clk.textContent = over ? '⏳' : '00:'+String(pausaLeft()).padStart(2,'0');
    const p=pausaPct();
    if(pct) pct.textContent = over ? '⏳' : p+'%';
    if(fill) fill.style.width=p+'%';
    if(lbl) lbl.textContent = pausaWaitLabel();
    if(chk) chk.innerHTML=pausaChecklist();
    /* os passos da tela portada ("O que está acontecendo") são o mesmo dado do checklist,
       noutro desenho — sem isto ficavam congelados no estado do primeiro segundo */
    const pss=$c('#rf-passos');
    if(pss && typeof rfPausaPassosHTML==='function') pss.innerHTML=rfPausaPassosHTML();
    const sk=$c('#cl-ad-skip'); if(sk && CL._adCont) sk.style.display='';   // sobrevive a um cdraw
    const esc=$c('#cl-wait-escape'); if(esc && pausaStuck()) esc.style.display=''; // destrava quem ficou preso
  }, 1000);
}
function showSyncLoading(msg){
  // Na tela de Pausa Patrocinada NÃO mostra nada: ela já é a tela de sincronização, e o overlay
  // por cima era o resquício do modelo anterior (um GIF solto num quadro, duplicando o que a TV
  // já toca). Aqui o overlay serve só pra quem está em OUTRA tela (ex.: convidado mexendo no
  // time quando a rodada fecha) — faixa discreta, sem GIF, na identidade da pausa.
  if(CL.screen==='waitround'){ if(CL._syncLoadingTimer) clearTimeout(CL._syncLoadingTimer); return; }
  let el=$c('#c-syncload');
  if(!el){ el=document.createElement('div'); el.id='c-syncload'; document.body.appendChild(el); }
  el.className='cl-syncover';
  el.innerHTML=`<div class="cl-syncover-box">
    <div class="cl-syncover-tt">⏸ ${escC(msg||'Pausa técnica')}</div>
    <div class="cl-syncover-sub">Sincronizando a semana com todos os treinadores</div>
    <div class="cl-syncover-bar"><i></i></div>
  </div>`;
  // rede de segurança: nunca deixa o usuário PRESO atrás do overlay se algo no meio do
  // adopt/reconcile falhar silenciosamente antes de chamar hideSyncLoading().
  if(CL._syncLoadingTimer) clearTimeout(CL._syncLoadingTimer);
  CL._syncLoadingTimer=setTimeout(hideSyncLoading, 8000);
}
function hideSyncLoading(){ if(CL._syncLoadingTimer){ clearTimeout(CL._syncLoadingTimer); CL._syncLoadingTimer=null; } const el=$c('#c-syncload'); if(el) el.remove(); }
/* A LISTA NÃO VOLTA PARA O TOPO A CADA REDESENHO.
   Toda ação da interface passa por cdraw(), que reescreve a tela inteira (innerHTML) — e um
   elemento recriado nasce com a rolagem no zero. Nas telas curtas isso não aparece; no elenco, sim,
   e de forma irritante: trocar um titular por um reserva mandava a lista para o topo, e o jogador
   perdia de vista exatamente o que acabou de mexer. Guardar a rolagem antes e devolvê-la depois
   resolve para todas as ações de uma vez, em vez de remendar caso a caso.
   Só devolve se o número de listas for o mesmo antes e depois: se a tela mudou, a rolagem velha
   não tem a que pertencer. */
/* ROLAGEM ATRAVÉS DO REDESENHO.
   Clicar num chip de filtro dentro de um bloco chama cdraw(), que remonta a
   página inteira — e a rolagem voltava ao topo. Quem estava lendo a
   Classificação lá embaixo era jogado para o começo da página só por ter
   trocado a competição: o conteúdo do bloco muda, o ponto de leitura não pode
   mudar junto.
   `.rf-main` é o rolo da página no painel novo e `.rf-lista` é o de cada
   lista longa; as duas primeiras são do skin antigo, que ainda tem telas
   vivas. */
const CDRAW_ROLAGENS=['.cl-roster','.cl-mkt-squad','.rf-lista','.rf-sq-list','.rf-cam-narra',
  /* as duas listas do painel de substituicao: a partida continua a correr por
     baixo e cada tique redesenha a tela, entao sem isto quem tinha descido ate
     ao lateral-esquerdo era atirado de volta ao topo duas vezes por segundo. */
  '.rf-ov-cols .rf-card'];
/* O ROLO DA PÁGINA é caso à parte: restaurar sempre faria NAVEGAR de uma
   página para outra herdar o deslocamento da anterior — aí sim o utilizador
   cairia no meio de uma tela que nunca abriu. Só volta ao lugar quando a
   página E a aba continuam as mesmas. */
function rfContextoRolagem(){
  try{
    const st=(typeof rfState==='function')?rfState():null;
    const pg=st?st.page:'';
    const ab=(st&&st.tab&&pg)?(st.tab[pg]||''):'';
    /* O SUB-PASSO DO ASSISTENTE CONTA COMO MUDANCA DE TELA. No onboarding o
       CL.screen muitas vezes NAO muda entre um passo e o seguinte — o funil da
       Resenha inteiro vive em screen='online' e so CL.net.step anda, e o Solo
       usa CL.soloStep. Sem isto o contexto ficava igual, o cdraw() concluia
       "mesma tela" e nao levava a leitura ao topo: quem carregava em
       "Continuar" chegava ao passo seguinte a meio da pagina. (E o mesmo
       contexto que suprime a animacao de entrada, entao os dois passam a
       tratar o avanco do assistente como o que ele e: uma tela nova.) */
    const passo=(CL.net&&CL.net.step)||CL.soloStep||'';
    return String(CL.screen||'')+'|'+pg+'|'+ab+'|'+passo;
  }catch(e){ return String(CL.screen||''); }
}
/* O contexto do que está NA TELA, não o que está sendo desenhado.
   rfGo()/rfSetTab() mudam o estado ANTES de chamar cdraw(), então perguntar
   "qual é a página?" no início do desenho já devolve o DESTINO — origem e
   destino batiam sempre e a rolagem era restaurada até ao navegar. Este
   guarda o contexto do último desenho concluído, que é com quem comparar. */
let RF_CTX_DESENHADO='';
let RF_IR_AO_TOPO=false;

/* =====================================================================
   ONDE O UTILIZADOR ESTAVA — sobrevive ao recarregar
   `CL` e estado de sessao e nunca foi gravado: CL.screen nasce em 'abertura',
   entao QUALQUER recarregar mandava a pessoa para a home, mesmo a meio de um
   save. Aqui fica so a POSICAO (que save, que pagina) — nao o jogo, que
   continua a vir da nuvem por clLoadSave.

   SO A TELA PRINCIPAL se restaura. Partida ao vivo, sorteio, sala da Resenha e
   afins tem estado que nao esta neste registo; reentrar neles a frio daria um
   ecra meio montado. Nesses casos volta-se ao hub do clube, que e sempre
   valido. A Resenha tem o seu proprio caminho de reentrada (ver o resync em
   index.html) e por isso nem se grava. */
const RF_POS_CHAVE='rf98:pos';
function rfPosGravar(){
  try{
    if(CL.online) return;
    if(CL.screen!=='main' || !CL.save) return;
    const st=(typeof rfState==='function')?rfState():null;
    localStorage.setItem(RF_POS_CHAVE, JSON.stringify({
      save:CL.save, page:(st&&st.page)||'', quando:Date.now() }));
  }catch(e){}
}
function rfPosLer(){
  try{ return JSON.parse(localStorage.getItem(RF_POS_CHAVE)||'null'); }catch(e){ return null; }
}
function rfPosLimpar(){ try{ localStorage.removeItem(RF_POS_CHAVE); }catch(e){} }
/* devolve true se assumiu o arranque */
function rfPosRestaurar(){
  const pos=rfPosLer();
  if(!pos || !pos.save || typeof clLoadSave!=='function') return false;
  CL._posPagina=pos.page||'';   // aplicada por clLoadSave quando o save chega
  clLoadSave(pos.save);
  return true;
}
function capturaRolagem(){
  const m={_ctx:RF_CTX_DESENHADO};
  try{ CDRAW_ROLAGENS.forEach(sel=>{ m[sel]=Array.from(document.querySelectorAll(sel)).map(el=>el.scrollTop); }); }catch(e){}
  try{ const main=document.querySelector('.rf-main'); m._main=main?main.scrollTop:0; }catch(e){}
  return m;
}
function devolveRolagem(m){
  /* A FASE ABERTA TEM DE ESTAR A VISTA. A fita de fases da chave (telemovel) rola
     na horizontal e a fase corrente costuma ser das ultimas: sem isto, a tela
     abria mostrando "1a FASE" enquanto os cartoes por baixo eram das oitavas. */
  try{
    const alvo=document.querySelector('[data-rf-centrar]');
    if(alvo && alvo.scrollIntoView) alvo.scrollIntoView({block:'nearest',inline:'center'});
  }catch(e){}
  try{ CDRAW_ROLAGENS.forEach(sel=>{
    const els=document.querySelectorAll(sel), vals=m[sel]||[];
    if(!els.length || els.length!==vals.length) return;
    els.forEach((el,i)=>{ if(vals[i]>0) el.scrollTop=vals[i]; });
  }); }catch(e){}
  try{
    const main=document.querySelector('.rf-main');
    if(main){
      // mesma página e mesma aba: o utilizador continua onde estava.
      // Página ou aba diferente: começa do topo, SEMPRE e explicitamente —
      // sem isto, o navegador deixava um resto de deslocamento e a tela nova
      // abria no meio.
      main.scrollTop = (m._ctx===rfContextoRolagem()) ? (m._main||0) : 0;
      /* PEDIDO EXPLÍCITO DE ROLAGEM (CL.rolarPara). Quem quer levar o utilizador
         a um bloco — o "Escolher tática" da barra lateral, por exemplo — não pode
         simplesmente rolar depois de chamar cdraw(): qualquer redesenho seguinte
         recria o `.rf-main` e a linha acima repõe o deslocamento, desfazendo tudo.
         A intenção fica no estado e é consumida AQUI, no fim do desenho, uma vez. */
      if(CL.rolarPara){
        /* A intenção vale por uma JANELA, não por um desenho só. Consumida no
           primeiro, ela era desfeita pelo redesenho seguinte (o `.rf-main` é
           recriado e a linha acima repõe o deslocamento), e o utilizador
           continuava a ver o topo da página. Reaplicar enquanto a janela dura
           resolve; o posicionamento é instantâneo de propósito, porque uma
           rolagem suave é interrompida por esse mesmo redesenho. */
        if(Date.now()>(CL.rolarAte||0)) CL.rolarPara=null;
        else {
          const alvo=document.getElementById(CL.rolarPara);
          if(alvo){
            /* QUEM ROLA MUDA COM A LARGURA: no desktop é o `.rf-main`; no
               telefone a barra lateral some, o painel deixa de ter altura fixa
               e quem rola passa a ser o DOCUMENTO. Mirar sempre no `.rf-main`
               fazia o "Formação" trocar de aba e não sair do lugar. */
            /* A busca para no BODY de propósito: em modo padrão quem rola a
               página é o `document.scrollingElement` (o <html>), e escrever em
               `body.scrollTop` não move nada. Sem esta parada, o laço elegia o
               body como "rolador" e a rolagem sumia no telefone. */
            let cx=alvo.parentElement, rolador=null;
            while(cx && cx!==document.body && cx!==document.documentElement){
              const cs=getComputedStyle(cx);
              if(/(auto|scroll)/.test(cs.overflowY) && cx.scrollHeight>cx.clientHeight+4){ rolador=cx; break; }
              cx=cx.parentElement;
            }
            if(rolador){
              const y=rolador.scrollTop + alvo.getBoundingClientRect().top - rolador.getBoundingClientRect().top
                    - Math.max(0,(rolador.clientHeight-alvo.offsetHeight)/2);
              rolador.scrollTop=Math.max(0,y);
            }else{
              const doc=document.scrollingElement||document.documentElement;
              const y=doc.scrollTop + alvo.getBoundingClientRect().top
                    - Math.max(0,(doc.clientHeight-alvo.offsetHeight)/2);
              doc.scrollTop=Math.max(0,y);
            }
          }
        }
      }
    }
  }catch(e){}
  /* A SUBSTITUICAO TEM DE SER VISTA. Quem acabou de trocar leva as duas listas
     ate as linhas marcadas — e isso nao pode ser feito com um setTimeout depois
     do cdraw(), porque a partida redesenha a tela varias vezes por segundo e a
     restauracao acima repoe o deslocamento logo a seguir. Como o `rolarPara`, a
     intencao vive no estado e e reaplicada AQUI, no fim de cada desenho, durante
     uma janela curta; e instantanea de proposito, que uma rolagem suave nao
     sobrevive ao redesenho seguinte. */
  try{
    if(CL._subTroca && (Date.now()-CL._subTroca.ts)<900 && typeof rfSubCentrarTroca==='function')
      rfSubCentrarTroca();
  }catch(e){}
  try{ RF_CTX_DESENHADO=rfContextoRolagem(); }catch(e){}
}
function cdraw(){ const r=$c('#c-root'); if(!r)return;
  /* O PISCA-PISCA A CADA CLIQUE. Todo cdraw() recria a tela por innerHTML, e os
     blocos com `animation: ds-fade-up` (painel de aba, grades, diálogos) tocam a
     entrada DE NOVO — a cada clique de botão, filtro ou aba, a página parecia
     recarregar. A animação existe para a chegada a uma tela nova, não para um
     redesenho da mesma tela: quando o contexto (tela|página|aba) é o mesmo do
     desenho anterior, ela é suprimida por `.rf-sem-anim` (ver rf26.css). */
  try{
    const mesmo = RF_CTX_DESENHADO && (RF_CTX_DESENHADO===rfContextoRolagem());
    document.documentElement.classList.toggle('rf-sem-anim', !!mesmo);
    /* MUDOU DE TELA/PAGINA/ABA -> a leitura recomeca do TOPO. Sem isto, quem
       estava a meio de uma lista longa e clicava noutra pagina caia no meio da
       pagina nova: a rolagem da janela nao se mexe sozinha quando o conteudo e
       trocado por innerHTML. Vale tambem para os links da home que levam a
       outras paginas. Redesenho da MESMA tela nao mexe na rolagem — senao um
       clique num filtro atirava a pagina para cima. */
    RF_IR_AO_TOPO = !mesmo;
  }catch(e){}
  const _rolagem=capturaRolagem();
  // registra a força do meu elenco uma vez por rodada (no-op se nada mudou) — ver trackMyForces
  if(typeof trackMyForces==='function'){ try{ trackMyForces(); }catch(e){} }
  applyClubTokens(CL.clubId);   // ver applyClubTokens: --club-primary/--club-secondary do time do usuário
  let html='';
  switch(CL.screen){
    // LANDING PORTADA (telas/Landing - Home). Só a home; as páginas
    // institucionais (sobre, ajuda, contato, termos) seguem no caminho de
    // sempre até virem as telas delas.
    // LANDING PORTADA: a home é rfLandingHTML; as páginas institucionais são
    // telas/Landing - Paginas Institucionais (ver rf26-fluxo.js).
    case 'abertura':  html=(CL.landingView&&CL.landingView!=='home')
      ? rfInstitucionalHTML(CL.landingView) : rfLandingHTML(); break;
    // ONBOARDING PORTADO (ver src/ui/rf26-onboarding.js): as sete telas do
    // pacote, com a marcação da referência. O wizShell() antigo continua
    // atendendo as telas que ainda não têm equivalente no pacote (moeda,
    // país jogável, carregamento) — essas o pacote não traz.
    case 'login':     html=rfOb1(); break;
    case 'resetpassword': html=scResetPassword(); break;
    case 'recuperarsenha': html=rfRecuperarSenhaHTML(); break;
    case 'modo':      html=rfOb2(); break;
    /* MODO SOLO. A tela antiga perguntava "novo jogo ou continuar?" em dois
       cartões; o pacote (Fluxo - Continuar Save) elimina a bifurcação e mostra
       os saves direto, com "começar um save novo" como última linha da lista —
       menos um passo para quem só quer voltar ao jogo. O roteador ainda
       apontava para a antiga, e por isso ela continuava aparecendo.
       O passo 'novo' (dar nome ao save) segue na tela antiga: o pacote não
       trouxe equivalente para ele. */
    /* UMA tela só (rfObSoloHTML): os dois cartões e os saves recentes juntos.
       Antes isto caía em scSoloNovo() — o "EX: SAVE01" da pele antiga, desenhado
       com o assistente velho por dentro do assistente novo. */
    case 'modosolo':  html=rfObSoloHTML(); break;
    case 'paises':    html=rfOb3(); break;
    case 'paisJogavel': html=scPaisJogavel(); break;
    case 'moeda':     html=scMoeda(); break;
    case 'loading':   html=scLoading(); break;
    case 'jogadores': html=scJogadores(); break;
    case 'escolhaclubes': html=scEscolhaClubes(); break;
    case 'sorteio':   html=rfOb6(); break;   // 6 · sorteio do clube
    case 'boasvindas':html=rfOb7(); break;
    // REBRANDING 2026: a tela principal virou o ENVELOPE (sidebar + faixa do clube +
    // área de duas colunas) e é ele que roteia as sete páginas — ver src/ui/rf26.js.
    // A barra de título cinza do Windows não existe mais aqui: a identidade do save
    // agora mora na faixa do clube, dentro do próprio envelope.
    case 'main':      html=rfScreenHTML(); break;
    case 'waitround': html=scWaitRound(); break;
    case 'imprensa':  html=scImprensa(); break;
    case 'teamview':  html=scTeamView(); break;
    case 'handoff':   html=scHandoff(); break;
    case 'entrega':   html=rfEntregaHTML(); break;
    // o assento joga no MESMO envelope do manager 1 — trocar de cadeira não pode
    // trocar o desenho do jogo (ver enterSeatContext, que já troca o contexto)
    case 'seatturn':  html=rfScreenHTML(); break;
    case 'seatclassif': html=scSeatClassif(); break;
    case 'live':      html=scLive(); break;
    case 'classif':   html=scClassif(); break;
    case 'cupclassif':html=scCupClassif(); break;
    case 'cupview':   html=scCupView(); break;
    case 'cupdraw':   html=scCupDraw(); break;
    case 'online':    html=renderOnline(); break;
  }
  r.innerHTML=html;
  devolveRolagem(_rolagem);   // ver capturaRolagem: a lista fica onde estava
  // o palco do chaveamento tem proporção fixa (1080×520) e é escalado pra caber no painel —
  // precisa medir DEPOIS do innerHTML, e de novo a cada resize (ver cupFitStage).
  if(CL.screen==='cupclassif'||CL.screen==='cupview'||CL.screen==='cupdraw') requestAnimationFrame(cupFitStage);
  if(typeof renderChatDock==='function') renderChatDock(); // doca do chat em TODAS as telas online (inclusive ao vivo)
  // impressão de anúncio é contada quando o bloco ENTRA no viewport, não aqui: a tela
  // é remontada inteira a cada cdraw() e contar no desenho inflaria tudo (ver ads.js).
  if(window.ADS) ADS.scan();
  if(typeof patchPickerFill==='function') patchPickerFill();
  /* ===== VIDEO INJETADO POR innerHTML NAO ARRANCA SOZINHO =====
     O atributo `muted` e ignorado por alguns navegadores quando o <video> entra no DOM por
     innerHTML — e sem `muted` reconhecido, o telefone bloqueia o autoplay e fica so o cartaz de
     tras, pequeno no meio da moldura. Era o caso do video de boas-vindas. As duas telas que ja
     tinham video (momento e campeao) resolviam isto a mao, cada uma na sua funcao; aqui vale
     para qualquer video da tela, incluindo os que vierem depois. */
  try{
    r.querySelectorAll('video[autoplay]').forEach(v=>{
      v.muted=true; v.volume=0; v.setAttribute('playsinline','');
      const p=v.play(); if(p&&p.catch) p.catch(()=>{});
    });
  }catch(e){}
  if(CL.screen==='loading') runLoading();
  const f=$c('#cl-focus'); if(f) f.focus();
  if(RF_IR_AO_TOPO){ RF_IR_AO_TOPO=false;
    try{ window.scrollTo(0,0); }catch(e){}
    /* o envelope do jogo rola por DENTRO (.rf-content), nao na janela */
    try{ document.querySelectorAll('.rf-content,.rf-lv,.rf-stg,.rf-wiz,.rf-wiz-in,.cl-wiz-body').forEach(el=>{ el.scrollTop=0; }); }catch(e){}
  }
  rfPosGravar();
}

/* ================= 01 · ABERTURA (Home) =================
   Redesenho do handoff de design (templates/home/Home.dc.html do pacote entregue):
   janela com barra de título + navbar de páginas institucionais (Início/Sobre nós/Como
   jogar/Contato) + corpo com UM CTA dominante (Jogar agora) + rodapé (Sobre/Contato/
   Termos/Privacidade). O protótipo original usa um canvas de tamanho fixo (1100×632)
   escalado por JS — truque específico da ferramenta de design pra caber num iframe de
   preview. Aqui adaptado pro padrão responsivo real do resto do app: 100vh fluido,
   único breakpoint em 760px (ver .cl-home-* no CSS), igual todo o resto do RetroFoot98. */
const LANDING_NAV=[['home','Início'],['sobre','Sobre nós'],['ajuda','Como jogar'],['contato','Contato']];
const LANDING_FOOT=[['sobre','Sobre nós'],['contato','Contato'],['termos','Termos'],['priv','Privacidade']];
/* ===== AS PÁGINAS DE CONTEÚDO NO RODAPÉ =====
   Existem dez páginas reais em produção (geradas por scripts/build-seo.mjs a partir de
   seo/pages.mjs) — guia, ranking, história do Elifoot, comparativos. Elas respondem 200, têm HTML
   indexável e linkam uma para a outra... e NENHUMA porta do jogo levava a elas. Eram páginas
   órfãs: só chegava quem viesse do Google. Duas consequências, e a segunda é a pior — quem já está
   no site nunca as encontra, e o buscador vê conteúdo sem nenhum link interno apontando, que é um
   dos sinais mais fortes que existem.
   Aqui elas entram como link DE VERDADE (<a href>), não como onclick: onclick não é link para
   robô nenhum, não abre em nova aba e não aparece no "copiar endereço". Os rótulos são curtos de
   propósito — o título de SEO é longo por natureza e não cabe num rodapé.
   Se uma página nova entrar em seo/pages.mjs sem entrar aqui, o build avisa (ver build-seo.mjs). */
const LANDING_PAGINAS=[
  ['guia','Guia do jogo','Formações por divisão, como fazer dinheiro no mercado e subir de série.'],
  ['ranking','Ranking de treinadores','Como funcionam os pontos de carreira e os troféus.'],
  ['historia-do-elifoot','História do Elifoot','Do disquete de 1994 à resenha online — a trajetória do clássico.'],
  ['elifoot-online','Elifoot online','Jogue no navegador, de graça, sem instalar nada.'],
  ['jogar-com-amigos','Jogar com amigos','O Modo Resenha: um campeonato com a sua turma, na mesma semana.'],
  ['manager-futebol-brasileiro','Futebol brasileiro','Séries A, B, C e D, Copa do Brasil, Libertadores e Sul-Americana.'],
  ['jogo-treinador-futebol-online','Jogo de treinador','Elencos reais, tática, mercado e partida ao vivo.'],
  ['melhores-jogos-treinador-futebol','Melhores jogos de treinador','O que existe hoje, grátis e online, e onde cada um se sai melhor.'],
  ['jogos-parecidos-com-elifoot','Jogos parecidos com o Elifoot','Alternativas para quem procura aquela mesma pegada.'],
  ['elifoot-vs-brasfoot','Elifoot vs Brasfoot','Um comparativo honesto entre os dois clássicos.'],
];
function rodapePaginasHTML(){
  return LANDING_PAGINAS.map(([slug,label])=>`<a class="cl-home-foot" href="/${slug}/">${escC(label)}</a>`).join('');
}
/* O MESMO BLOCO DA HOME ESTÁTICA (ver index.html), agora na home que o jogo desenha. Sem isto, as
   dez páginas apareciam antes de o jogo carregar e SUMIAM quando ele assumia a tela — o visitante
   via um site completo virar um site sem conteúdo. O mesmo texto nos dois lugares, de propósito:
   a troca não pode ser perceptível. */
function landingPaginasHTML(){
  const cards=LANDING_PAGINAS.map(([slug,titulo,desc])=>`
      <a class="cl-pg-card" href="/${slug}/">
        <span class="cl-pg-t">${escC(titulo)}</span>
        <span class="cl-pg-d">${escC(desc)}</span>
      </a>`).join('');
  return `<section class="cl-pg-sec">
      <h2 class="cl-pg-h">Conheça o RetroFoot98</h2>
      <div class="cl-pg-grid">${cards}</div>
    </section>`;
}
/* navbar da Home/wizard: links à esquerda + ações à direita. No mobile os links colapsam
   num menu hambúrguer (☰) em vez de rolar horizontalmente. navItems = [[label,onclick,ativo]]. */
function homeNavbar(navItems, rightHTML){
  const open=CL.navMenuOpen?'open':'';
  const links=navItems.map(([label,onclick,active])=>`<button class="cl-home-nav ${active?'on':''}" onclick="${onclick}">${escC(label)}</button>`).join('');
  return `<div class="cl-home-navbar">
    <button class="cl-home-burger" onclick="clToggleNavMenu(event)" aria-label="Menu">☰</button>
    <div class="cl-home-navlinks ${open}">${links}</div>
    <div class="cl-home-navsp"></div>
    ${rightHTML}
  </div>`;
}
function clToggleNavMenu(e){ if(e&&e.stopPropagation) e.stopPropagation(); CL.navMenuOpen=!CL.navMenuOpen; cdraw(); }
/* ÁREAS DE ANÚNCIO (AdSense) removidas em 2026-07-21: o site ainda não foi aprovado no
   programa, então não há o que servir. A implementação (blocos fixos na landing e nas
   páginas institucionais, tag no <head>, CSS .cl-ad*) está no commit a0c283f — quando a
   aprovação sair, é só reverter. A regra que valia continua valendo: anúncio só onde o
   redraw é disparado por clique (landing/institucionais), NUNCA na partida ao vivo, no
   mercado, na premiação ou entre rodadas — cdraw() troca o innerHTML inteiro, e um <ins>
   ali seria recriado a cada redraw, pedindo anúncio novo sem parar. */
/* ================= HOME DE VENDAS (handoff "Retrofoot homepage de vendas") =================
   A home deixou de ser um cartão de visitas com um botão e virou uma PÁGINA DE VENDA: herói com
   vídeo, carrossel das telas reais do jogo, uma seção por motivo (Resenha, Solo, chat, copas,
   elencos, 100% online), ranking com prêmio, Ligas Oficiais, criadores, lista de espera,
   patrocínio e canais.

   O CABEÇALHO TEM UMA PORTA SÓ: "Entrar na lista" (a campanha da primeira versão) e, ao lado, o
   "Entrar" de quem já tem conta. O "Jogar agora" saiu do topo — a página é de venda, e dois CTAs
   verdes competindo no mesmo canto diluíam a campanha. Quem quer jogar agora continua com o
   botão no herói, logo abaixo do CTA principal, e com o "Entrar" no topo em qualquer tela.

   O visual segue o resto do jogo: bisel de 2px, quadrado, Tahoma pro texto e Georgia itálico nos
   títulos. O cabeçalho branco e os cartões são do handoff. */
const WAITLIST_VAGAS=100;
/* id do vídeo do YouTube do herói. Vazio = moldura com o espaço reservado (não invento vídeo). */
const LANDING_VIDEO_ID='';
const LANDING_SECOES=[
  { id:'resenha', kicker:'MODO RESENHA', dir:'esq',
    h:'A liga da galera, até 20 treinadores na mesma competição.',
    p:'Monte a liga do grupo do trabalho, da turma da faculdade ou da sua comunidade inteira. Todo mundo joga a mesma semana ao vivo, com tabela, mercado e a zoeira rolando junto.',
    badge:'img/badge-liga.webp', chip:'até 20 treinadores', chipCls:'navy',
    janela:'Sala do Modo Resenha', img:'hub' },
  { id:'solo', kicker:'MODO SOLO', dir:'dir',
    h:'Você contra a máquina, temporada após temporada.',
    p:'Pega um clube da Série D e sobe até a elite no seu ritmo. Mercado de transferências, finanças do clube e o calendário completo de copas — sem depender de ninguém entrar na sala.',
    badge:'img/badge-clubes.webp', chip:'no seu ritmo', chipCls:'verde',
    janela:'Formação e escalação — Modo Solo', img:'formacao' },
  { id:'chat', kicker:'CHAT AO VIVO', dir:'esq',
    h:'A zoeira faz parte do jogo.',
    p:'Chat em tempo real durante a semana: os gols pingam na tela e todo mundo comenta ao mesmo tempo. É a resenha do grupo, dentro do jogo.',
    badge:'img/badge-chat.webp', chip:'tempo real', chipCls:'ouro',
    janela:'Partida ao vivo', img:'partida' },
  { id:'copas', kicker:'CAMPEONATOS', dir:'dir',
    h:'Quatro divisões e todas as taças.',
    p:'Série A, B, C e D, Copa do Brasil, Libertadores e Sul-Americana. Tabela, sorteio das chaves, mata-mata e a taça esperando no fim da linha.',
    trofeus:['img/trofeus/serie-a.webp','img/trofeus/libertadores.webp','img/trofeus/copa-do-brasil.webp'],
    chip:'7 competições', chipCls:'navy',
    janela:'Fase de grupos — Libertadores', img:'copa' },
  { id:'elencos', kicker:'JOGADORES REAIS NO MUNDO TODO', dir:'esq',
    h:'Elencos de verdade, clubes do mundo todo.',
    p:'Você negocia nomes que conhece, de clubes de vários países — e enfrenta técnicos de carne e osso em qualquer fuso horário.',
    emoji:'🌎', chip:'mercado global', chipCls:'verde',
    janela:'Leilão de jogadores', img:'leilao' },
  { id:'online', kicker:'100% ONLINE', dir:'dir',
    h:'Abre o navegador e joga. Nada pra instalar.',
    p:'Funciona no celular, no tablet e no PC. O jogo fica gravado na nuvem, então você continua de onde parou — na fila do banco ou no computador de casa.',
    emoji:'💾', chip:'jogo gravado na nuvem', chipCls:'navy',
    janela:'Classificação da Série D', img:'classificacao' },
];
const LANDING_TELAS=[
  ['hub','Hub do time'], ['formacao','Formação e escalação'], ['classificacao','Classificação'],
  ['leilao','Leilão de jogadores'], ['copa','Copa — fase de grupos'], ['partida','Partida ao vivo'],
];
/* url vazia = ainda não temos o endereço do perfil. Mesma regra dos patrocinadores: não invento
   link. Sem url o cartão vira texto (não vira link quebrado). */
const LANDING_CANAIS=[
  { ic:'▶️', nome:'YouTube',   d:'Bastidores, ligas e tutoriais',    arroba:'@retrofoot98', url:'' },
  { ic:'📸', nome:'Instagram', d:'Novidades e recortes das semanas', arroba:'@retrofoot98', url:'' },
  { ic:'🎵', nome:'TikTok',    d:'Os melhores momentos da resenha',  arroba:'@retrofoot98', url:'' },
];
const LANDING_COTAS=[
  ['Cota Master','Marca na tela de partida e no Ranking Global.','sob consulta'],
  ['Cota Liga Oficial','Naming de uma competição entre embaixadores.','sob consulta'],
  ['Cota Apoiador','Presença no rodapé do jogo e nos canais.','sob consulta'],
];
const LANDING_MENU=[
  ['recursos','Recursos'], ['telas','Telas'], ['ranking','Ranking'],
  ['ligas','Ligas Oficiais'], ['criadores','Criadores'],
];
function scAbertura(){
  const v=CL.landingView||'home';
  const bodyFns={sobre:landingSobreHTML, ajuda:landingAjudaHTML, contato:landingContatoHTML,
                 termos:landingTermosHTML, priv:landingPrivHTML, apoie:landingApoieHTML};
  const body=(bodyFns[v]||landingHomeHTML)();
  const menu=LANDING_MENU.map(([id,label])=>`<button class="cl-lp-nav" onclick="clLpIr('${id}')">${escC(label)}</button>`).join('')
    +`<button class="cl-lp-nav ${v==='apoie'?'on':''}" onclick="clLandingGo('apoie')">Apoie o projeto</button>`;
  return `<div class="cl-lp-page">
    <header class="cl-lp-hdr">
      <div class="cl-lp-hdr-in">
        <button class="cl-lp-logo" onclick="clLandingGo('home')">
          <!-- A ASSINATURA E' DESENHADA, e por isso NAO tem "98". Aqui era o simbolo mais
     a palavra escrita ao lado, com o 98 num <span> proprio; a marca nova tem um
     lockup unico e nao leva numero. Ver img/marca.svg. -->
          <img class="rf-marca-svg" src="img/marca.svg" alt="Retrofoot.com.br" height="26">
        </button>
        <nav class="cl-lp-navlinks ${CL.navMenuOpen?'open':''}">${menu}</nav>
        <div class="cl-lp-hdr-r">
          <button class="cl-lp-burger" onclick="clToggleNavMenu(event)" aria-label="Menu">☰</button>
          <button class="cl-lp-btn" onclick="clGoModo('login')" title="Entrar no jogo"><span>🔑</span><span class="cl-lp-so-lg">Entrar</span></button>
          <button class="cl-lp-cta" onclick="clWaitlistOpen()">Entrar na lista</button>
        </div>
      </div>
    </header>
    <main class="cl-lp-main">${body}</main>
    ${landingRodapeHTML()}
    ${anchorAdHTML()}
    ${CL.mkOpen?mediaKitModalHTML():''}
    ${CL.lpZoom!=null?lpZoomHTML():''}
  </div>`;
}
function landingRodapeHTML(){
  const col=(titulo,itens)=>`<div><div class="cl-lp-foot-h">${escC(titulo)}</div>
    <div class="cl-lp-foot-l">${itens}</div></div>`;
  const bt=(label,acao)=>`<button class="cl-lp-foot-a" onclick="${acao}">${escC(label)}</button>`;
  const lk=(label,href)=>`<a class="cl-lp-foot-a" href="${href}">${escC(label)}</a>`;
  return `<footer class="cl-lp-foot">
    <div class="cl-lp-wrap">
      <div class="cl-lp-foot-cols">
        <div>
          <div class="cl-lp-foot-marca"><img class="rf-marca-svg" src="img/marca-clara.svg" alt="Retrofoot.com.br" height="24"></div>
          <p class="cl-lp-foot-sobre">O jogo de gerenciamento de futebol que você jogava na escola — agora online, com os amigos e no navegador.</p>
        </div>
        ${col('O JOGO', bt('Recursos',"clLpIr('recursos')")+bt('Telas do jogo',"clLpIr('telas')")
          +bt('Modo Resenha',"clLpIr('resenha')")+bt('Modo Solo',"clLpIr('solo')")
          +bt('Ranking Global',"clLpIr('ranking')")+bt('Ligas Oficiais',"clLpIr('ligas')"))}
        ${col('COMUNIDADE', bt('Para criadores',"clLpIr('criadores')")+bt('Lista de espera','clWaitlistOpen()')
          +bt('Como jogar',"clLandingGo('ajuda')")+bt('Sobre nós',"clLandingGo('sobre')")+bt('Contato',"clLandingGo('contato')"))}
        ${col('PROJETO', bt('Apoie o projeto',"clLandingGo('apoie')")
          +lk('Contato','mailto:contato@retrofoot98.com')
          +bt('Termos de uso',"clLandingGo('termos')")+bt('Privacidade',"clLandingGo('priv')"))}
      </div>
      <div class="cl-lp-foot-paginas">${rodapePaginasHTML()}</div>
      <div class="cl-lp-foot-fim">
        <span>© 2026 RetroFoot98. Todos os direitos reservados.</span>
        <span class="cl-lp-mono">v2026.01 — feito por quem cresceu jogando Elifoot.</span>
      </div>
    </div>
  </footer>`;
}
/* ===== LISTA DE ESPERA =====
   O formulário GRAVA de verdade (tabela retrofoot_waitlist no Supabase): sem isso a pessoa
   preenche, vê "pronto!" e o lead se perde. A tabela só aceita INSERT pela chave anônima — não
   existe policy de leitura, então ninguém lê a lista de volta pelo navegador. O número da barra
   de vagas vem de uma função que devolve só a contagem (retrofoot_waitlist_count). */
function clWaitlistOpen(origem){
  CL.waitlistOpen=true; CL.waitlistSent=false; CL.waitlistErr=''; CL.navMenuOpen=false;
  CL.waitlistMin=false; CL.waitlistMax=false; CL.waitlistAmigosOk=false;
  // de onde veio o lead: a lista é chamada da landing E do cartão do Modo
  // Resenha no onboarding, e sem isto os dois chegavam ao banco iguais
  CL.waitlistOrigem=origem||'landing';
  /* `paga1990`/`paga3990` nascem UNDEFINED, nao false: a diferenca entre "disse
     que nao" e "nao respondeu" e' o que faz a pergunta valer alguma coisa. */
  CL.waitlist=CL.waitlist||{nome:'',email:'',tel:'',resposta:'',clube:'',amigos:[''],zap:''};
  CL.waitlistClubeOpen=false;
  // o formulário é um modal do desenho novo (ver rfWaitlistHTML), desenhado no
  // overlay — não mais um pedaço do HTML da landing
  rfWaitlistDraw(); clWaitlistCount();
}
function clWaitlistClose(){ CL.waitlistOpen=false; clCloseOverlay(); }
function clWaitlistSet(campo,val){ CL.waitlist=CL.waitlist||{}; CL.waitlist[campo]=val; }
function clWaitlistAmigo(i,val){ const w=CL.waitlist; if(w&&w.amigos) w.amigos[i]=val; }
function clWaitlistAddAmigo(){ const w=CL.waitlist; if(!w) return;
  if((w.amigos||[]).length>=20){ toastC('Dá pra indicar até 20 amigos.'); return; }
  w.amigos=(w.amigos||[]).concat(['']); rfWaitlistDraw(); }
function clWaitlistRmAmigo(i){ const w=CL.waitlist; if(!w) return;
  w.amigos=(w.amigos||[]).filter((_,k)=>k!==i); if(!w.amigos.length) w.amigos=['']; rfWaitlistDraw(); }
/* o cliente do Supabase é o MESMO do jogo (supabase-adapter.js), inclusive o schema — a tabela
   da lista mora no elifoot_v3 por causa disso. Na home ele ainda não foi criado, então garante. */
async function lpSupabase(){
  try{ if(typeof netInitSupabase==='function') await netInitSupabase(); }catch(e){ return null; }
  return (typeof sb!=='undefined' && sb) ? sb : null;
}
async function clWaitlistCount(){
  try{
    const cli=await lpSupabase(); if(!cli) return;
    const {data,error}=await cli.rpc('retrofoot_waitlist_count');
    if(!error && typeof data==='number'){
      CL.waitlistCount=data;
      // dois lugares mostram o número: a barra da landing (na página) e a do
      // formulário (no overlay). Redesenha o que estiver na tela.
      if(CL.waitlistOpen) rfWaitlistDraw();
      else if(CL.screen==='abertura') cdraw();
    }
  }catch(e){ /* sem número é melhor que número errado: a barra fica com "—" */ }
}
/* ===== RESPONDER NAO PODE REDESENHAR O FORMULARIO =====
   `rfWaitlistDraw()` reconstroi o modal inteiro: os campos sao recriados, o
   foco perde-se, a rolagem volta ao topo e a tela pisca — num formulario a
   meio de ser preenchido isso e' o pior momento possivel para acontecer. E' o
   mesmo cuidado que a busca do time de coracao ja' tinha (ver RF_CLUBES_BR).
   Aqui muda UMA classe em dois botoes, entao e' isso que se faz: acha o par
   pelo `data-p` e troca a marca. O redesenho fica so' como rede, para o caso
   improvavel de o par nao estar na tela.
   Clicar na mesma resposta desmarca — ver rfWlPerguntasHTML. */
function clWaitlistPreco(chave, valor){
  CL.waitlist=CL.waitlist||{};
  const novo = (CL.waitlist[chave]===valor) ? undefined : valor;
  CL.waitlist[chave]=novo;
  const par=document.querySelector('.rf-wl-sn[data-p="'+chave+'"]');
  if(!par){ rfWaitlistDraw(); return; }
  par.querySelectorAll('button').forEach(b=>{
    const on = novo===(b.dataset.v==='1');
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on?'true':'false');
  });
}
async function clWaitlistSubmit(){
  const w=CL.waitlist||{};
  const nome=(w.nome||'').trim(), email=(w.email||'').trim();
  if(nome.length<2){ CL.waitlistErr='Diz como te chamam na resenha.'; rfWaitlistDraw(); return; }
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)){ CL.waitlistErr='Confere o e-mail — é por ele que a gente avisa da vaga.'; rfWaitlistDraw(); return; }
  CL.waitlistErr=''; CL.waitlistBusy=true; rfWaitlistDraw();
  try{
    const cli=await lpSupabase();
    if(!cli) throw new Error('sem conexão');
    const {error}=await cli.from('retrofoot_waitlist').insert({
      nome, email, telefone:(w.tel||'').trim()||null, resposta:(w.resposta||'').trim()||null,
      // time de coração: não existe tabela de perfil do RetroFoot (o schema é o
      // elifoot_v3; a public.profiles é do Investbola) e quem preenche isto nem
      // está logado — a linha da waitlist É o registro da pessoa
      time_coracao:(w.clube||'').trim()||null,
      /* `?? null` e nao `||null`: com `||`, um "nao pagaria" (false) viraria
         null e ficaria indistinguivel de quem nao respondeu. */
      paga_1990: w.paga1990 ?? null,
      paga_3990: w.paga3990 ?? null,
      origem:(CL.waitlistOrigem||'landing')+' · '+((location&&location.pathname)||'/'),
      user_agent:(navigator&&navigator.userAgent||'').slice(0,400)
    });
    if(error){
      // e-mail repetido não é erro pro visitante: ele já está na lista, e dizer isso é melhor
      // do que mandar tentar de novo uma coisa que já deu certo.
      if(String(error.code)==='23505' || /duplicate|unique/i.test(error.message||'')){ CL.waitlistSent=true; }
      else throw error;
    } else CL.waitlistSent=true;
  }catch(e){
    console.warn('lista de espera:', e&&e.message);
    CL.waitlistErr='Não deu pra gravar agora. Tenta de novo em instantes ou manda um e-mail pra contato@retrofoot98.com.';
  }
  CL.waitlistBusy=false; rfWaitlistDraw(); clWaitlistCount();
}
function waitlistZapHref(){
  const num=String((CL.waitlist&&CL.waitlist.zap)||'').replace(/\D/g,'');
  const msg=encodeURIComponent('Bora montar nossa liga no RetroFoot98? Entra na lista de espera — só '+WAITLIST_VAGAS+' treinadores na primeira versão: https://retrofoot98.com.br');
  return num ? 'https://wa.me/'+(num.length>11?num:'55'+num)+'?text='+msg : 'https://wa.me/?text='+msg;
}
/* ===== O FORMULÁRIO EM DOIS PASSOS =====
   Numa janela só ele tinha nome, e-mail, telefone, uma pergunta aberta, a lista de amigos e o
   convite por WhatsApp: passava de qualquer tela de notebook e obrigava a rolar por dentro do
   modal pra achar o botão de enviar — o pior lugar pra esconder um botão de conversão.
   Agora o PASSO 1 pede só o que garante a vaga (nome, e-mail, telefone e a pergunta rápida) e
   cabe inteiro na tela. As INDICAÇÕES viraram o PASSO 2, depois de gravar: quem abandona ali já
   está na lista, e convidar amigos é uma decisão de quem JÁ entrou — não um pedágio antes. */
/* ===== QUIZ DO MEDIA KIT =====
   "Baixar media kit" num link solto entrega o PDF e não deixa nada pra trás: a gente não sabe
   quem baixou, de que ramo é, nem quanto pretende investir — e não tem como voltar a falar.
   Aqui o material é o fim de uma conversa curta: quatro perguntas sobre o negócio (uma por tela,
   com resposta de um toque) e só então o contato. Cada pergunta é fechada de propósito — quem
   está avaliando patrocínio responde em segundos, e a resposta já qualifica o lead.
   No fim, além do "entraremos em contato", tem o atalho de WhatsApp com a mensagem pronta:
   quem quer falar agora fala agora, e a mensagem já chega dizendo do que se trata. */
const MK_ZAP='16478623292';
const MK_PERGUNTAS=[
  { id:'segmento', q:'Qual é o ramo da sua marca?',
    ops:['Apostas e cassino','Bebidas e alimentos','Moda e artigos esportivos','Tecnologia e apps','Serviços financeiros','Outro'] },
  { id:'publico', q:'Quem você quer alcançar?',
    ops:['Torcedor de futebol em geral','Homens 18-34','Público de games','Comunidades e criadores','Ainda estou definindo'] },
  { id:'objetivo', q:'O que você espera do patrocínio?',
    ops:['Marca na tela (awareness)','Cliques e cadastros','Ativação com criadores','Naming de uma competição','Quero entender as opções'] },
  { id:'verba', q:'Qual a verba prevista para a temporada?',
    ops:['Até R$ 5 mil','R$ 5 mil a R$ 20 mil','R$ 20 mil a R$ 50 mil','Acima de R$ 50 mil','Prefiro conversar antes'] },
];
function clMediaKitOpen(){
  CL.mk={ passo:0, respostas:{}, empresa:'', nome:'', email:'', tel:'', obs:'' };
  CL.mkOpen=true; CL.mkSent=false; CL.mkErr=''; CL.navMenuOpen=false; cdraw();
}
function clMediaKitClose(){ CL.mkOpen=false; cdraw(); }
function clMediaKitMin(){ CL.mkMin=!CL.mkMin; cdraw(); }
function clMediaKitResponde(id, valor){
  CL.mk.respostas[id]=valor;
  CL.mk.passo=Math.min(CL.mk.passo+1, MK_PERGUNTAS.length);
  cdraw();
}
function clMediaKitVolta(){ if(CL.mk.passo>0){ CL.mk.passo--; cdraw(); } }
function clMediaKitSet(campo,val){ CL.mk[campo]=val; }
async function clMediaKitEnviar(){
  const m=CL.mk||{};
  const nome=(m.nome||'').trim(), email=(m.email||'').trim();
  if(nome.length<2){ CL.mkErr='Diz o seu nome, pra gente saber com quem falar.'; cdraw(); return; }
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)){ CL.mkErr='Confere o e-mail — é por ele que o media kit chega.'; cdraw(); return; }
  CL.mkErr=''; CL.mkBusy=true; cdraw();
  try{
    const cli=await lpSupabase();
    if(!cli) throw new Error('sem conexão');
    const r=m.respostas||{};
    const {error}=await cli.from('retrofoot_media_kit').insert({
      empresa:(m.empresa||'').trim()||null, segmento:r.segmento||null, publico:r.publico||null,
      objetivo:r.objetivo||null, verba:r.verba||null, nome, email,
      telefone:(m.tel||'').trim()||null, observacao:(m.obs||'').trim()||null,
      origem:(location&&location.pathname)||'/'
    });
    if(error) throw error;
    CL.mkSent=true;
  }catch(e){
    console.warn('media kit:', e&&e.message);
    CL.mkErr='Não deu pra enviar agora. Tenta de novo ou chama no WhatsApp aqui embaixo.';
  }
  CL.mkBusy=false; cdraw();
}
/* mensagem pronta do WhatsApp: chega já dizendo que é patrocínio e com o que a marca respondeu,
   pra a conversa começar do meio e não do "oi" */
function mkZapHref(){
  const m=CL.mk||{}, r=m.respostas||{};
  const linhas=['Olá! Tenho interesse em patrocinar o RetroFoot98.'];
  if((m.empresa||'').trim()) linhas.push('Empresa: '+m.empresa.trim());
  if(r.segmento) linhas.push('Ramo: '+r.segmento);
  if(r.publico)  linhas.push('Público: '+r.publico);
  if(r.objetivo) linhas.push('Objetivo: '+r.objetivo);
  if(r.verba)    linhas.push('Verba prevista: '+r.verba);
  if((m.nome||'').trim()) linhas.push('Falo por: '+m.nome.trim());
  linhas.push('Pode me mandar o media kit?');
  return 'https://wa.me/'+MK_ZAP+'?text='+encodeURIComponent(linhas.join('\n'));
}
function mediaKitModalHTML(){
  const m=CL.mk||{passo:0,respostas:{}};
  const acoes={min:'clMediaKitMin()', max:'clMediaKitMin()', close:'clMediaKitClose()', minimizada:CL.mkMin};
  const total=MK_PERGUNTAS.length+1;
  const nPasso=Math.min(m.passo+1,total);
  const barra=`<div class="cl-mk-prog"><div class="cl-mk-prog-in" style="width:${Math.round(nPasso/total*100)}%"></div></div>
    <div class="cl-mk-prog-lbl">Passo ${nPasso} de ${total}</div>`;
  let corpo;
  if(CL.mkSent){
    corpo=`<div class="cl-lp-form">
      <div class="cl-lp-form-rola">
        <div class="cl-lp-ok-topo"><span class="cl-lp-ok-ic">✓</span>
          <div><div class="cl-lp-ok-t">Recebemos o seu pedido.</div>
            <p>A gente entra em contato pelo e-mail <b>${escC((m.email||'').trim())}</b> com o media kit completo — números da comunidade, formatos de anúncio dentro do jogo e as cotas da temporada.</p></div></div>
        <div class="cl-mk-zap">
          <div class="cl-mk-zap-t">Quer falar agora?</div>
          <p>Manda a mensagem pronta no WhatsApp e a gente já sabe do que se trata.</p>
          <a class="cl-lp-cta" href="${mkZapHref()}" target="_blank" rel="noopener">💬 Falar no WhatsApp</a>
        </div>
      </div>
      <div class="cl-lp-form-acts"><button class="cl-lp-btn" onclick="clMediaKitClose()">Fechar</button></div>
    </div>`;
  } else if(m.passo<MK_PERGUNTAS.length){
    const p=MK_PERGUNTAS[m.passo];
    const ops=p.ops.map(o=>`<button type="button" class="cl-mk-op ${m.respostas[p.id]===o?'on':''}"
        onclick="clMediaKitResponde('${p.id}',${JSON.stringify(o).replace(/"/g,'&quot;')})">${escC(o)}</button>`).join('');
    corpo=`<div class="cl-lp-form">
      <div class="cl-lp-form-rola">
        ${barra}
        <div class="cl-mk-q">${escC(p.q)}</div>
        <div class="cl-mk-ops">${ops}</div>
      </div>
      <div class="cl-lp-form-acts">
        ${m.passo>0?`<button class="cl-lp-btn" onclick="clMediaKitVolta()">‹ Voltar</button>`:''}
        <span class="cl-lp-form-nota">Uma resposta e a gente segue.</span>
      </div>
    </div>`;
  } else {
    corpo=`<div class="cl-lp-form">
      <div class="cl-lp-form-rola">
        ${barra}
        ${CL.mkErr?`<div class="cl-lp-erro">${escC(CL.mkErr)}</div>`:''}
        <div class="cl-mk-q">Pra onde mandamos o media kit?</div>
        <label class="cl-lp-lbl"><span>Empresa <i>(opcional)</i></span>
          <input type="text" value="${escC(m.empresa||'')}" placeholder="Nome da marca" autocomplete="organization" oninput="clMediaKitSet('empresa',this.value)"></label>
        <label class="cl-lp-lbl"><span>Seu nome</span>
          <input type="text" value="${escC(m.nome||'')}" placeholder="Quem fala pela marca" autocomplete="name" oninput="clMediaKitSet('nome',this.value)"></label>
        <div class="cl-lp-2in">
          <label class="cl-lp-lbl"><span>E-mail</span>
            <input type="email" value="${escC(m.email||'')}" placeholder="voce@empresa.com" autocomplete="email" inputmode="email" oninput="clMediaKitSet('email',this.value)"></label>
          <label class="cl-lp-lbl"><span>Telefone <i>(opcional)</i></span>
            <input type="tel" value="${escC(m.tel||'')}" placeholder="(11) 99999-0000" autocomplete="tel" inputmode="tel" oninput="clMediaKitSet('tel',this.value)"></label>
        </div>
      </div>
      <div class="cl-lp-form-acts">
        <button class="cl-lp-btn" onclick="clMediaKitVolta()">‹ Voltar</button>
        <button class="cl-lp-cta" onclick="clMediaKitEnviar()" ${CL.mkBusy?'disabled':''}>${CL.mkBusy?'Enviando':'Pedir o media kit'}</button>
      </div>
    </div>`;
  }
  return `<div class="cl-lp-modal" onclick="if(event.target===this)clMediaKitClose()">
    ${janelaHTML('📈 Media kit — RetroFoot98', corpo, 'cl-lp-win-modal', acoes)}
  </div>`;
}
/* MORTAS com a portagem do formulário (ver rfWaitlistHTML em rf26-fluxo.js):
   eram a janela do Windows 98 e os dois botões dela. */
function waitlistModalHTMLLegado(){
  const w=CL.waitlist||{};
  const acoes={min:'clWaitlistMin()', max:'clWaitlistMax()', close:'clWaitlistClose()', minimizada:CL.waitlistMin};
  const cls='cl-lp-win-modal'+(CL.waitlistMax?' larga':'');
  const corpo = CL.waitlistSent ? waitlistPasso2HTMLLegado(w) : waitlistPasso1HTMLLegado(w);
  return `<div class="cl-lp-modal" onclick="if(event.target===this)clWaitlistClose()">
    ${janelaHTML('📋 Lista de espera — RetroFoot98', corpo, cls, acoes)}
  </div>`;
}
function waitlistPasso1HTMLLegado(w){
  return `<div class="cl-lp-form">
    <div class="cl-lp-form-rola">
      <div class="cl-lp-aviso"><b>⚠ Vagas limitadas:</b> a primeira versão libera o jogo para <b>${WAITLIST_VAGAS} treinadores</b>. Quem indicar amigos sobe na fila.</div>
      ${CL.waitlistErr?`<div class="cl-lp-erro">${escC(CL.waitlistErr)}</div>`:''}
      <label class="cl-lp-lbl"><span>Nome do treinador</span>
        <input type="text" value="${escC(w.nome||'')}" placeholder="Como te chamam na resenha"
          autocomplete="name" oninput="clWaitlistSet('nome',this.value)"></label>
      <div class="cl-lp-2in">
        <label class="cl-lp-lbl"><span>E-mail</span>
          <input type="email" value="${escC(w.email||'')}" placeholder="voce@email.com"
            autocomplete="email" inputmode="email" oninput="clWaitlistSet('email',this.value)"></label>
        <label class="cl-lp-lbl"><span>WhatsApp <i>(opcional)</i></span>
          <input type="tel" value="${escC(w.tel||'')}" placeholder="(11) 99999-0000"
            autocomplete="tel" inputmode="tel" oninput="clWaitlistSet('tel',this.value)"></label>
      </div>
      <label class="cl-lp-lbl"><span>O que não pode faltar no RetroFoot? <i>(opcional)</i></span>
        <input type="text" value="${escC(w.resposta||'')}" placeholder="Fala o recurso que você quer ver no jogo"
          oninput="clWaitlistSet('resposta',this.value)"></label>
    </div>
    <div class="cl-lp-form-acts">
      <button class="cl-lp-cta" onclick="clWaitlistSubmit()" ${CL.waitlistBusy?'disabled':''}>${CL.waitlistBusy?'Gravando':'Garantir minha vaga'}</button>
      <span class="cl-lp-form-nota">A gente só usa seus dados pra avisar da vaga.</span>
    </div>
  </div>`;
}
function waitlistPasso2HTMLLegado(w){
  const amigos=(w.amigos||['']).map((a,i)=>`<div class="cl-lp-amigo">
      <input type="email" value="${escC(a||'')}" placeholder="email do amigo" inputmode="email"
        autocomplete="off" oninput="clWaitlistAmigo(${i},this.value)">
      <button class="cl-lp-btn cl-lp-btn-sq" onclick="clWaitlistRmAmigo(${i})" aria-label="Remover">✕</button>
    </div>`).join('');
  const guardado = CL.waitlistAmigosOk ? `<div class="cl-lp-ok-linha">✓ Indicações guardadas.</div>` : '';
  return `<div class="cl-lp-form">
    <div class="cl-lp-form-rola">
      <div class="cl-lp-ok-topo">
        <span class="cl-lp-ok-ic">✓</span>
        <div><div class="cl-lp-ok-t">Você está na lista.</div>
          <p>A gente avisa por e-mail quando a sua vaga entre os ${WAITLIST_VAGAS} primeiros for liberada.</p></div>
      </div>
      ${guardado}
      <div class="cl-lp-fs-d">Agora chama a galera: <b>cada amigo indicado sobe você na fila</b> — dá pra montar a liga inteira antes do lançamento.</div>
      ${amigos}
      <button class="cl-lp-btn" onclick="clWaitlistAddAmigo()">+ Adicionar outro e-mail</button>
      <div class="cl-lp-zap">
        <div class="cl-lp-zap-t">Ou chama direto no WhatsApp</div>
        <div class="cl-lp-zap-row">
          <input type="tel" value="${escC(w.zap||'')}" placeholder="DDD + número" inputmode="tel" oninput="clWaitlistSet('zap',this.value)">
          <a class="cl-lp-btn" href="${waitlistZapHref()}" target="_blank" rel="noopener">💬 Convidar</a>
        </div>
      </div>
    </div>
    <div class="cl-lp-form-acts">
      <button class="cl-lp-cta" onclick="clWaitlistIndicar()" ${CL.waitlistBusy?'disabled':''}>${CL.waitlistBusy?'Gravando':'Enviar indicações'}</button>
      <button class="cl-lp-btn" onclick="clWaitlistClose()">Fechar</button>
    </div>
  </div>`;
}
/* passo 2: anexa as indicações ao lead que acabou de entrar (ver retrofoot_waitlist_indicar) */
async function clWaitlistIndicar(){
  const w=CL.waitlist||{};
  const amigos=(w.amigos||[]).map(a=>(a||'').trim()).filter(a=>/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(a));
  if(!amigos.length){ clWaitlistClose(); return; }
  CL.waitlistBusy=true; rfWaitlistDraw();
  try{
    const cli=await lpSupabase();
    if(cli){ await cli.rpc('retrofoot_waitlist_indicar', {p_email:(w.email||'').trim(), p_amigos:amigos}); }
    CL.waitlistAmigosOk=true; CL.waitlist.amigos=[''];
  }catch(e){ console.warn('indicações:', e&&e.message); }
  CL.waitlistBusy=false; rfWaitlistDraw();
}
function janelaHTML(titulo, inner, extra, acoes){
  // sem `acoes` os três selos são enfeite (é uma moldura, não uma janela de verdade). Com elas,
  // viram botão: minimizar recolhe pra barra de título, maximizar alterna a largura e ✕ fecha.
  const btns = acoes
    ? `<button type="button" onclick="${acoes.min||''}" title="Minimizar" aria-label="Minimizar">_</button>
       <button type="button" onclick="${acoes.max||''}" title="Maximizar" aria-label="Maximizar">□</button>
       <button type="button" onclick="${acoes.close||''}" title="Fechar" aria-label="Fechar">✕</button>`
    : `<i>_</i><i>□</i><i>✕</i>`;
  return `<div class="cl-lp-win ${extra||''}">
    <div class="cl-lp-win-bar ${acoes?'viva':''}"><span>${escC(titulo)}</span>
      <span class="cl-lp-win-btns">${btns}</span></div>
    ${acoes&&acoes.minimizada?'':`<div class="cl-lp-win-body">${inner}</div>`}
  </div>`;
}
function clWaitlistMin(){ CL.waitlistMin=!CL.waitlistMin; cdraw(); }
function clWaitlistMax(){ CL.waitlistMin=false; CL.waitlistMax=!CL.waitlistMax; cdraw(); }
/* CLICOU, ABRE GRANDE. As capturas do carrossel e das seções aparecem em 300-400px de largura:
   dá pra sentir o clima da tela, mas não pra LER a tabela, o placar ou a escalação — que é
   justamente o que a pessoa quer conferir antes de entrar no jogo. O clique abre a mesma imagem
   em tela cheia, e de lá dá pra navegar pelas outras com as setas (ou o teclado). */
function lpTelaHTML(arq, alt){
  return `<button type="button" class="cl-lp-shot-b" onclick="clLpZoom('${escC(arq)}')"
      title="Abrir em tela cheia" aria-label="Abrir ${escC(alt)} em tela cheia">
    <img class="cl-lp-shot" src="img/telas/${escC(arq)}.webp" alt="${escC(alt)}" loading="lazy" decoding="async">
    <span class="cl-lp-shot-lupa" aria-hidden="true">⛶</span>
  </button>`;
}
function clLpZoom(arq){
  const i=LANDING_TELAS.findIndex(t=>t[0]===arq);
  CL.lpZoom = i>=0 ? i : 0;
  document.addEventListener('keydown', clLpZoomTecla);
  cdraw();
}
function clLpZoomFecha(){ CL.lpZoom=null; document.removeEventListener('keydown', clLpZoomTecla); cdraw(); }
function clLpZoomIr(d){
  if(CL.lpZoom==null) return;
  const n=LANDING_TELAS.length;
  CL.lpZoom=(CL.lpZoom+d+n)%n; cdraw();
}
function clLpZoomTecla(e){
  if(CL.lpZoom==null) return;
  if(e.key==='Escape'){ e.preventDefault(); clLpZoomFecha(); }
  else if(e.key==='ArrowRight'){ e.preventDefault(); clLpZoomIr(1); }
  else if(e.key==='ArrowLeft'){ e.preventDefault(); clLpZoomIr(-1); }
}
function lpZoomHTML(){
  const i=CL.lpZoom; if(i==null) return '';
  const [arq,label]=LANDING_TELAS[i]||LANDING_TELAS[0];
  return `<div class="cl-lp-zoom" onclick="if(event.target===this)clLpZoomFecha()">
    <div class="cl-lp-zoom-cx">
      <div class="cl-lp-zoom-bar">
        <span>${escC(label)}</span>
        <span class="cl-lp-zoom-cont">${i+1}/${LANDING_TELAS.length}</span>
        <button class="cl-lp-zoom-x" onclick="clLpZoomFecha()" aria-label="Fechar">✕</button>
      </div>
      <img class="cl-lp-zoom-img" src="img/telas/${escC(arq)}.webp" alt="${escC(label)}">
      <button class="cl-lp-zoom-nav esq" onclick="clLpZoomIr(-1)" aria-label="Tela anterior">◀</button>
      <button class="cl-lp-zoom-nav dir" onclick="clLpZoomIr(1)" aria-label="Próxima tela">▶</button>
    </div>
  </div>`;
}
function landingHeroHTML(){
  const vid=LANDING_VIDEO_ID||'';
  const video = vid
    ? `<iframe src="https://www.youtube-nocookie.com/embed/${escC(vid)}" title="Vídeo de lançamento RetroFoot98"
         allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`
    : `<div class="cl-lp-video-vazio">
         <div class="cl-lp-play">▶</div>
         <div class="cl-lp-video-t">Espaço reservado para o vídeo de lançamento</div>
         <div class="cl-lp-video-d">Configure o ID do YouTube em LANDING_VIDEO_ID</div>
       </div>`;
  return `<section class="cl-lp-hero-sec">
    <div class="cl-lp-wrap cl-lp-hero">
      <div>
        <span class="cl-lp-pill"><span class="cl-lp-dot"></span>100% online — nada pra instalar</span>
        <h1 class="cl-lp-h1">O clássico da sua infância,<br>agora online e com os amigos.</h1>
        <p class="cl-lp-lead">Você é o técnico. Escala o time, negocia jogadores, cuida do caixa e briga por acesso da Série D ao topo — sozinho contra a máquina ou na resenha com até 20 treinadores na mesma liga.</p>
        <div class="cl-lp-hero-cta">
          <button class="cl-lp-cta cl-lp-cta-lg" onclick="clWaitlistOpen()"><span>👑</span>Entrar na lista de espera</button>
          <button class="cl-lp-btn cl-lp-btn-lg" onclick="clGoModo()"><span>⚽</span>Jogar agora</button>
        </div>
        <div class="cl-lp-hero-nota">Primeira versão liberada para apenas <b>${WAITLIST_VAGAS} treinadores</b>.</div>
      </div>
      ${janelaHTML('▶ Vídeo de lançamento', `<div class="cl-lp-video">${video}</div>`, 'cl-lp-win-video')}
    </div>
  </section>`;
}
function landingTelasHTML(){
  const slides=LANDING_TELAS.map(([arq,label])=>`<div class="cl-lp-slide">
      ${janelaHTML(label, lpTelaHTML(arq,label))}
    </div>`).join('');
  return `<section class="cl-lp-wrap cl-lp-sec" id="lp-telas">
    <div class="cl-lp-kicker">TELAS DO JOGO</div>
    <h2 class="cl-lp-h2">Veja por dentro antes de entrar.</h2>
    <p class="cl-lp-p">Janelinha, placar em mono e tabela na tela — do jeito que você lembra. Estas são as telas que você vai usar em cada semana.</p>
    <div class="cl-lp-track-nav">
      <button class="cl-lp-btn cl-lp-btn-sq" onclick="clLpTrack(-1)" aria-label="Tela anterior">◀</button>
      <button class="cl-lp-btn cl-lp-btn-sq" onclick="clLpTrack(1)" aria-label="Próxima tela">▶</button>
    </div>
    <div class="cl-lp-track" id="cl-lp-track">${slides}</div>
  </section>`;
}
function landingSecaoHTML(sec, faixa){
  const selo = sec.trofeus ? `<span class="cl-lp-trofeus">${sec.trofeus.map(t=>`<img src="${t}" alt="" loading="lazy">`).join('')}</span>`
             : sec.badge   ? `<img class="cl-lp-badge" src="${sec.badge}" width="500" height="500" alt="" loading="lazy">`
             : `<span class="cl-lp-emoji">${sec.emoji||''}</span>`;
  const texto=`<div class="cl-lp-col-txt">
      <div class="cl-lp-kicker">${escC(sec.kicker)}</div>
      <h3 class="cl-lp-h3">${escC(sec.h)}</h3>
      <p class="cl-lp-p">${escC(sec.p)}</p>
      <div class="cl-lp-selo">${selo}<span class="cl-lp-chip ${sec.chipCls||''}">${escC(sec.chip)}</span></div>
    </div>`;
  const janela=`<div class="cl-lp-col-img">${janelaHTML(sec.janela, lpTelaHTML(sec.img, sec.janela))}</div>`;
  return `<section class="cl-lp-band ${faixa?'escura':''}" id="lp-${sec.id}">
    <div class="cl-lp-wrap cl-lp-2col ${sec.dir==='dir'?'invertida':''}">${texto}${janela}</div>
  </section>`;
}
function landingRankingHTML(){
  const linhas=[
    ['1','Campanha da temporada','pontos por título, acesso e campanha'],
    ['2','Histórico público','cada clube que você comandou fica registrado'],
    ['3','Prêmio no fim','os melhores da temporada levam prêmio de verdade'],
  ].map(([n,t,d])=>`<div class="cl-lp-rank-r"><span class="cl-lp-rank-p">${n}</span>
      <span class="cl-lp-rank-n">${escC(t)}</span><span class="cl-lp-rank-d">${escC(d)}</span></div>`).join('');
  return `<section class="cl-lp-band escura" id="lp-ranking">
    <div class="cl-lp-wrap cl-lp-2col">
      <div class="cl-lp-col-txt">
        <div class="cl-lp-kicker">RANKING GLOBAL DE TREINADORES</div>
        <h2 class="cl-lp-h2">Todo mundo na mesma tabela. Com prêmio de verdade no fim.</h2>
        <p class="cl-lp-p">Cada título, acesso e campanha rende pontos no ranking mundial de técnicos. A temporada fecha, a tabela congela e os melhores levam prêmios reais — não moeda de jogo.</p>
        <ul class="cl-lp-ul">
          <li>Pontuação por temporada, com histórico público do seu clube.</li>
          <li>Premiação em dinheiro e produtos para o top da temporada.</li>
          <li>Quem sobe no ranking desbloqueia as Ligas Oficiais.</li>
        </ul>
        <div class="cl-lp-hero-cta">
          <button class="cl-lp-cta" onclick="clWaitlistOpen()">Quero disputar o ranking</button>
          <a class="cl-lp-btn" href="/ranking/">Como funciona o ranking</a>
        </div>
      </div>
      <div class="cl-lp-col-img">
        ${janelaHTML('🏆 Ranking Global — como pontua', `<div class="cl-lp-rank">${linhas}
          <div class="cl-lp-rank-foot"><span>Prêmio do 1º lugar da temporada</span><b>a definir</b></div>
        </div>`)}
      </div>
    </div>
  </section>`;
}
function landingLigasHTML(){
  const cards=[
    ['🥇','Vaga por mérito','Não se compra convite. Fique no topo do Ranking Global da temporada e a vaga chega até você.'],
    ['🧪','Recursos em primeira mão','Embaixador joga a versão beta antes do lançamento e opina direto com quem desenvolve o jogo.'],
    ['💰','Premiação real','As competições entre embaixadores valem prêmios em dinheiro, produtos e patrocínio da temporada.'],
  ].map(([ic,t,d])=>`<div class="cl-lp-card"><div class="cl-lp-card-ic">${ic}</div>
      <div class="cl-lp-card-t">${escC(t)}</div><p>${escC(d)}</p></div>`).join('');
  return `<section class="cl-lp-wrap cl-lp-sec" id="lp-ligas">
    <div class="cl-lp-kicker">LIGAS OFICIAIS RETROFOOT</div>
    <h2 class="cl-lp-h2">Seja um dos Embaixadores RetroFoot</h2>
    <p class="cl-lp-p cl-lp-p-larga">Teste novos recursos antes de todo mundo e concorra a prêmios reais. Os treinadores mais bem colocados no ranking recebem convite para as Ligas Oficiais — competições fechadas, disputadas só entre embaixadores.</p>
    <div class="cl-lp-3col">${cards}</div>
  </section>`;
}
function landingCriadoresHTML(){
  const passos=[
    ['1','Abra a sala','e compartilhe o código com a live.'],
    ['2','Até 20 inscritos','entram como técnicos na sua liga.'],
    ['3','Rode a temporada','episódio a episódio, com tabela e chat na tela.'],
  ].map(([n,b,d])=>`<div class="cl-lp-passo"><span class="cl-lp-passo-n">${n}</span>
      <span><b>${escC(b)}</b> ${escC(d)}</span></div>`).join('');
  const chat=[
    ['lucão:','contratei o camisa 10 no leilão 🔨'],
    ['bia_tec:','meu goleiro tá com moral no chão, socorro'],
    ['canal:','semana começa em 2 min, escala aí galera'],
    ['rafa:','se eu ganhar hoje subo pra Série B 🟢'],
  ].map(([u,t])=>`<div class="cl-lp-chat-l"><span>${escC(u)}</span><span>${escC(t)}</span></div>`).join('');
  return `<section class="cl-lp-band escura" id="lp-criadores">
    <div class="cl-lp-wrap cl-lp-2col">
      <div class="cl-lp-col-txt">
        <div class="cl-lp-kicker">PARA CANAIS E COMUNIDADES</div>
        <h2 class="cl-lp-h2">Jogue ao vivo com a sua audiência.</h2>
        <p class="cl-lp-p">Se você tem canal no YouTube ou live na Twitch, o RetroFoot98 é feito pra isso: abre a sala, chama a comunidade e roda a liga inteira ao vivo, com o chat comentando cada rodada.</p>
        <div class="cl-lp-passos">${passos}</div>
        <button class="cl-lp-btn" onclick="clLandingGo('apoie')">Falar sobre parceria de canal</button>
      </div>
      <div class="cl-lp-col-img">
        ${janelaHTML('💬 Resenha — sala do canal', `<div class="cl-lp-chat">${chat}
          <div class="cl-lp-chat-in">Manda a braba na resenha</div>
          <div class="cl-lp-chat-foot"><span>🟢 18 de 20 treinadores na sala</span><b>SALA #RF-7742</b></div>
        </div>`, 'cl-lp-win-claro')}
      </div>
    </div>
  </section>`;
}
function landingListaHTML(){
  // busca a contagem UMA vez por sessão: a barra precisa do número antes de alguém abrir o modal
  if(CL.waitlistCount==null && !CL._waitlistCountPedido){ CL._waitlistCountPedido=true; setTimeout(clWaitlistCount,80); }
  const n=(CL.waitlistCount!=null)?CL.waitlistCount:null;
  const pct=n==null?0:Math.max(2,Math.min(100,Math.round(n/WAITLIST_VAGAS*100)));
  return `<section class="cl-lp-wrap cl-lp-sec" id="lp-lista">
    ${janelaHTML('📋 Lista de espera — primeira versão', `<div class="cl-lp-lista">
      <h2 class="cl-lp-h2">Só ${WAITLIST_VAGAS} treinadores entram na primeira versão.</h2>
      <p class="cl-lp-p">A primeira versão do RetroFoot98 abre para ${WAITLIST_VAGAS} pessoas testarem o jogo online e os recursos beta. Entre na lista, responda uma pergunta rápida e indique os amigos que você quer na sua liga.</p>
      <div class="cl-lp-barra-wrap">
        <div class="cl-lp-barra-lbl"><span>Vagas preenchidas</span><b>${n==null?'—':n} / ${WAITLIST_VAGAS}</b></div>
        <div class="cl-lp-barra"><div class="cl-lp-barra-in" style="width:${pct}%"></div></div>
      </div>
      <button class="cl-lp-cta cl-lp-cta-lg" onclick="clWaitlistOpen()"><span>⚽</span>Garantir minha vaga</button>
      <div class="cl-lp-lista-nota">Leva menos de um minuto. A gente avisa por e-mail quando a sua vaga abrir.</div>
    </div>`, 'cl-lp-win-amarelo')}
  </section>`;
}
/* ONDE A MARCA APARECE, mostrado em vez de descrito. O quadro com quatro retângulos "sua marca
   aqui" pedia imaginação: o anunciante tinha que adivinhar como o espaço aparece no jogo. Agora
   é um slider com as telas de verdade e a legenda dizendo qual é o espaço em cada uma. */
const LANDING_ESPACOS=[
  ['formacao','Placas do campo','Faixas ao redor do gramado, à vista em toda escalação.'],
  ['partida','Rodada ao vivo','Faixa na janela da partida, quando a atenção está no placar.'],
  ['copa','Telas de copa','Rodapé do sorteio e da fase de grupos das continentais.'],
  ['classificacao','Janelas do jogo','Espaço no pé de cada janela: calendário, elenco, mercado.'],
  ['leilao','Leilão e mercado','A tela em que o jogador está decidindo onde gastar.'],
];
function landingPatrocinioHTML(){
  const slots=LANDING_ESPACOS.map(([arq,t,d])=>`<div class="cl-lp-eslide">
      ${janelaHTML(t, lpTelaHTML(arq,t))}
      <div class="cl-lp-eslide-d">${escC(d)}</div>
    </div>`).join('');
  return `<section class="cl-lp-band escura">
    <div class="cl-lp-wrap cl-lp-2col">
      <div class="cl-lp-col-txt">
        <div class="cl-lp-kicker">PATROCINADORES</div>
        <h2 class="cl-lp-h2">Sua marca dentro do jogo que a galera não larga.</h2>
        <p class="cl-lp-p">Placa de patrocínio nas telas de partida, presença nas Ligas Oficiais e premiação das temporadas. Um público de futebol engajado, com sessões longas e retorno diário.</p>
        <div class="cl-lp-hero-cta">
          <button class="cl-lp-cta" onclick="clMediaKitOpen()">📈 Pedir o media kit</button>
          <button class="cl-lp-btn" onclick="clLandingGo('apoie')">Ver as cotas</button>
        </div>
      </div>
      <div class="cl-lp-col-img">
        <div class="cl-lp-slots">
          <div class="cl-lp-slots-h">
            <span>ESPAÇOS DISPONÍVEIS</span>
            <span class="cl-lp-slots-nav">
              <button class="cl-lp-btn cl-lp-btn-sq" onclick="clLpEspacos(-1)" aria-label="Anterior">◀</button>
              <button class="cl-lp-btn cl-lp-btn-sq" onclick="clLpEspacos(1)" aria-label="Próximo">▶</button>
            </span>
          </div>
          <div class="cl-lp-etrack" id="cl-lp-etrack">${slots}</div>
        </div>
      </div>
    </div>
  </section>`;
}
function landingCanaisHTML(){
  const cards=LANDING_CANAIS.map(c=>{
    const inner=`<span class="cl-lp-canal-ic">${c.ic}</span><span class="cl-lp-canal-n">${escC(c.nome)}</span>
      <span class="cl-lp-canal-d">${escC(c.d)}</span><span class="cl-lp-canal-a">${escC(c.arroba)}</span>`;
    return c.url ? `<a class="cl-lp-canal" href="${escC(c.url)}" target="_blank" rel="noopener">${inner}</a>`
                 : `<div class="cl-lp-canal">${inner}</div>`;
  }).join('');
  return `<section class="cl-lp-wrap cl-lp-sec cl-lp-centro">
    <div class="cl-lp-kicker">NOSSOS CANAIS</div>
    <h2 class="cl-lp-h2">Acompanhe o jogo sendo feito.</h2>
    <div class="cl-lp-3col cl-lp-3col-estreita">${cards}</div>
  </section>`;
}
function landingHomeHTML(){
  return `<div class="cl-lp">
    ${landingHeroHTML()}
    ${landingTelasHTML()}
    <div id="lp-recursos"></div>
    ${LANDING_SECOES.map((sec,i)=>landingSecaoHTML(sec, i%2===0)).join('')}
    ${landingRankingHTML()}
    ${landingLigasHTML()}
    ${landingCriadoresHTML()}
    ${landingListaHTML()}
    ${landingPatrocinioHTML()}
    ${landingCanaisHTML()}
    ${landingPaginasHTML()}
  </div>`;
}
function landingApoieHTML(){
  const cotas=LANDING_COTAS.map(([n,d,v])=>`<div class="cl-lp-cota">
      <div><div class="cl-lp-cota-n">${escC(n)}</div><div class="cl-lp-cota-d">${escC(d)}</div></div>
      <div class="cl-lp-cota-v">${escC(v)}</div></div>`).join('');
  return `<div class="cl-lp">
    <section class="cl-lp-wrap cl-lp-sec">
      <button class="cl-lp-btn" onclick="clLandingGo('home')">↩ Voltar ao início</button>
      <div class="cl-lp-kicker" style="margin-top:20px">APOIE O RETROFOOT98</div>
      <h1 class="cl-lp-h2">Um projeto independente, tocado por quem cresceu jogando.</h1>
      <p class="cl-lp-p cl-lp-p-larga">O RetroFoot98 é gratuito para jogar e vive de apoio: patrocínio de marcas, parceria com canais e a torcida da comunidade. Se você quer colocar a sua marca no jogo ou apoiar o desenvolvimento, o material está aqui embaixo.</p>
      <div class="cl-lp-2col cl-lp-2col-igual">
        ${janelaHTML('Cotas de patrocínio', `<div class="cl-lp-cotas">${cotas}
          <p class="cl-lp-cotas-nota">Cotas anuais, com contrapartida dentro do jogo, nas Ligas Oficiais e nos canais.</p></div>`)}
        ${janelaHTML('Media kit', `<div class="cl-lp-media">
          <p>Números da comunidade, perfil do público, formatos de anúncio dentro do jogo, logos e capturas em alta resolução.</p>
          <ul class="cl-lp-ul"><li>Audiência e engajamento por temporada</li>
            <li>Espaços de marca: partida, ranking e ligas</li>
            <li>Pacote de logos e screenshots</li></ul>
          <button class="cl-lp-cta" onclick="clMediaKitOpen()">📈 Pedir o media kit</button>
        </div>`, 'cl-lp-win-amarelo')}
      </div>
      <div class="cl-lp-card cl-lp-card-larga">
        <div class="cl-lp-card-t">Quer apoiar sem ser patrocinador?</div>
        <p>Entre na lista de espera, chame os amigos pra sua liga e siga os canais. Comunidade cheia é o que mantém o projeto de pé.</p>
      </div>
    </section>
  </div>`;
}
/* rola até a seção; usada pelo menu do topo e pelo rodapé */
function clLpIr(id){
  CL.navMenuOpen=false;
  if((CL.landingView||'home')!=='home'){ CL.landingView='home'; cdraw(); }
  setTimeout(()=>{ const el=document.getElementById('lp-'+id);
    if(el) window.scrollTo({top:Math.max(0, el.getBoundingClientRect().top+(window.scrollY||0)-84), behavior:'smooth'}); }, 60);
}
function clLpEspacos(dir){
  const t=document.getElementById('cl-lp-etrack'); if(!t) return;
  t.scrollBy({left:dir*(t.clientWidth+14), behavior:'smooth'});
}
function clLpTrack(dir){
  const t=document.getElementById('cl-lp-track'); if(!t) return;
  t.scrollBy({left:dir*(t.clientWidth/3+16), behavior:'smooth'});
}
function landingPageHTML(title, bodyHTML, opts){ opts=opts||{};
  return `<div class="cl-home-page">
    <div class="cl-home-pagebox" style="${opts.w?`width:${opts.w}px`:''}">
      <div class="cl-home-pagebox-h">${escC(title)}</div>
      <div class="cl-home-pagebox-b ${opts.bodyClass||''}">${bodyHTML}</div>
    </div>
  </div>`;
}
function landingSobreHTML(){
  return landingPageHTML('Sobre nós', `
    <div class="cl-home-h2">Feito por quem cresceu jogando Elifoot.</div>
    <p>O RetroFoot98 é o jogo de gerenciamento de futebol que você jogava na escola — a mesma pegada raiz de janelinha e placar em mono — só que agora online e com os amigos. Você comanda o clube: escolhe a tática, negocia jogadores, cuida do caixa e briga por acesso da Série D até o topo.</p>
    <p class="cl-home-p2">É um projeto independente, tocado por gente apaixonada por futebol e pelos clássicos de PC. Sem tela de energia, sem pay-to-win: só o jogo que a gente sempre quis ter de volta.</p>
    <button class="cl-home-mini cl-home-back" onclick="clLandingGo('home')">↩ Voltar ao início</button>
  `, {w:620});
}
function landingAjudaHTML(){
  const steps=[
    ['1','Escolha o modo.','Solo contra a máquina ou Modo Resenha, com a liga da galera.'],
    ['2','Pegue um clube.','Elencos reais das quatro divisões. Comece de onde quiser.'],
    ['3','Monte a tática e jogue.','Escale os titulares, ajuste a Formação e mande ver na rodada.']
  ];
  const rows=steps.map(([n,t,d])=>`<div class="cl-home-step">
      <span class="cl-home-step-n">${n}</span>
      <div><b>${escC(t)}</b><span>${escC(d)}</span></div>
    </div>`).join('');
  return landingPageHTML('Como jogar', `
    <div class="cl-home-steps">${rows}</div>
    <div class="cl-home-ajuda-actions">
      ${btn('Jogar agora','clGoModo()',{icon:'⚽',cls:'cl-btn-ok'})}
      <button class="cl-home-mini cl-home-back" onclick="clLandingGo('home')">↩ Voltar</button>
    </div>
  `, {w:640});
}
function landingContatoHTML(){
  return landingPageHTML('Contato', `
    <p>Achou um bug, tem uma ideia ou quer chamar pra resenha? Fala com a gente:</p>
    <div class="cl-home-contact-list">
      <div class="cl-home-contact-row"><span>✉️</span><span class="cl-home-mono">contato@retrofoot98.com</span></div>
      <div class="cl-home-contact-row"><span>🐦</span><b>@retrofoot98</b><span class="cl-home-muted">&nbsp;— novidades e updates</span></div>
    </div>
    <button class="cl-home-mini cl-home-back" onclick="clLandingGo('home')">↩ Voltar ao início</button>
  `, {w:560, bodyClass:'cl-home-pagebox-b-gray'});
}
function landingTermosHTML(){
  return landingPageHTML('Termos de uso', `
    <p><b>1. O jogo.</b> O RetroFoot98 é gratuito para jogar. Você é responsável pela sua conta e pelo que faz nas ligas em que entra.</p>
    <p><b>2. Fair play.</b> Nada de trapaça, bots ou ofensa na resenha. Contas fora da linha podem ser suspensas.</p>
    <p><b>3. Marcas.</b> Nomes de clubes e jogadores pertencem aos seus donos e são usados apenas para fins de simulação.</p>
    <p class="cl-home-fine">Versão v2026.01 — última atualização em julho de 2026.</p>
    <button class="cl-home-mini cl-home-back" onclick="clLandingGo('home')">↩ Voltar ao início</button>
  `, {w:620, bodyClass:'cl-home-pagebox-b-gray'});
}
function landingPrivHTML(){
  return landingPageHTML('Privacidade', `
    <p><b>O que guardamos.</b> Só o essencial pra você jogar: e-mail, apelido de treinador e o progresso do seu clube, gravado na nuvem.</p>
    <p><b>O que não fazemos.</b> A gente não vende seus dados. Sem rastreio pra fora do jogo.</p>
    <p><b>Seus direitos.</b> Você pode pedir seus dados ou apagar sua conta a qualquer momento, é só falar com a gente no Contato.</p>
    <p class="cl-home-fine">Versão v2026.01 — última atualização em julho de 2026.</p>
    <button class="cl-home-mini cl-home-back" onclick="clLandingGo('home')">↩ Voltar ao início</button>
  `, {w:620, bodyClass:'cl-home-pagebox-b-gray'});
}
function clNoop(){}
/* 'Entrar' na abertura: login é OBRIGATÓRIO (vale p/ Solo e Resenha). Se já houver
   sessão salva, vai direto pra escolha de modo; senão mostra a tela de login. */
function clGoModo(mode){
  CL.navMenuOpen=false;
  /* FASE DE LISTA DE ESPERA: enquanto o jogo não abriu ao público, nenhuma
     porta leva ao login — todas levam à lista. A trava mora AQUI, na única
     entrada, e não em cada botão: proteger botão por botão foi justamente o
     que deixou quatro CTAs passarem batido. Quem tem a chave de teste
     (?acesso=…) faz rfSoLista() virar false e entra normalmente. */
  if(typeof rfSoLista==='function' && rfSoLista()){
    if(typeof rfLpIr==='function') rfLpIr('lista');
    return;
  }
  toastC('Conectando...');
  (async ()=>{
    await netInitSupabase();
    const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};
    /* O PASSO 1 NAO SE SALTA. Com sessao isto ia direto para 'modo', e quem ja
       estava logado nunca via em que conta estava nem tinha por onde trocar.
       Agora cai sempre em 'login', que com sessao mostra quem esta e oferece
       as duas saidas (ver rfOb1Logado). */
    if(st.loggedIn){ CL.mgr=CL.mgr||st.name; CL.auth=null; CL.screen='login'; }
    else { CL.auth={mode:mode||'login',name:CL.mgr||'',email:'',password:''}; CL.screen='login'; }
    cdraw();
  })();
}
/* páginas institucionais da Home (Sobre nós/Como jogar/Contato/Termos/Privacidade) —
   trocam só o corpo da mesma página (mesmo header/footer), sem sair da tela 'abertura'. */
function clLandingGo(view){ CL.landingView=view; CL.navMenuOpen=false; cdraw(); }
/* ================= LOGIN (abertura) — obrigatório, vale p/ os dois modos ================= */
function scLogin(){ const a=CL.auth||(CL.auth={mode:'login',name:'',email:'',password:''});
  const isSignup=a.mode==='signup';
  const disabled=!(a.email&&a.password&&(!isSignup||a.name));
  const body=`
    <div class="cl-wiz-authcard">
      <div class="cl-conta-tabs">
        <div class="cl-conta-tab ${!isSignup?'on':''}" onclick="CL.auth.mode='login';cdraw()">Já tenho conta</div>
        <div class="cl-conta-tab ${isSignup?'on':''}" onclick="CL.auth.mode='signup';cdraw()">Criar conta nova</div>
      </div>
      <div class="cl-wiz-authsub">${isSignup?'Crie sua conta pra salvar seus jogos na nuvem e continuar em qualquer aparelho.':'Entre pra acessar seus jogos salvos na nuvem.'}</div>
      <div class="cl-authform">
        ${isSignup?`<div class="cl-authfield"><label>Nome de treinador</label><input id="cl-focus" class="maiuscula" maxlength="14" placeholder="Como quer ser chamado" value="${escC(a.name)}" oninput="CL.auth.name=this.value.toUpperCase();clLoginSync()"></div>`:''}
        <div class="cl-authfield"><label>E-mail</label><input ${isSignup?'':'id="cl-focus"'} type="email" inputmode="email" autocomplete="email" placeholder="voce@exemplo.com" value="${escC(a.email)}" oninput="CL.auth.email=this.value;clLoginSync()"></div>
        <div class="cl-authfield">
          <div class="cl-wiz-fieldhd2"><label>Senha</label>${isSignup?'':'<span class="cl-forgot-link" onclick="clForgotPassword()">Esqueci minha senha</span>'}</div>
          <input type="password" autocomplete="${isSignup?'new-password':'current-password'}" minlength="6" placeholder="••••••••" value="${escC(a.password||'')}" oninput="CL.auth.password=this.value;clLoginSync()" onkeydown="if(event.key==='Enter')${isSignup?'clLoginSignup':'clLoginDo'}()"></div>
        ${isSignup?`<div class="cl-authhint">Pelo menos 6 caracteres. Evite senhas óbvias (ex.: 123456, sua data de nascimento).</div>`:''}
      </div>
    </div>`;
  return wizShell({
    public:true, title:isSignup?'Criar conta':'Sua conta',
    back:'clGoAbertura()', backLabel:'Voltar ao início',
    contentCls:'cl-wiz-authcenter', body,
    actionCls:'cl-wiz-action-e',
    action: btn(isSignup?'Criar conta':'Entrar', isSignup?'clLoginSignup()':'clLoginDo()', {icon:'✔',cls:'cl-wiz-cta',dis:disabled})
  });
}
function clLoginSync(){ const b=document.querySelector('.cl-wiz-cta, .cl-btn-ok'); if(!b) return; const a=CL.auth||{}; const isSignup=a.mode==='signup'; b.disabled=!(a.email&&a.password&&(!isSignup||a.name)); }
function clLoginAfter(name){ CL.mgr=name||CL.mgr; CL.auth=null; CL.screen='modo'; cdraw(); }
function clLoginDo(){ const a=CL.auth; if(!a||!(a.email&&a.password)) return; toastC('Entrando...');
  (async ()=>{ try {
    const user=await NET.authSignIn(a.email, a.password);
    clLoginAfter(user.user_metadata?.name || a.email.split('@')[0]); toastC('Login feito!');
  } catch(e){ toastC('⚠ '+e.message); } })();
}
function clLoginSignup(){ const a=CL.auth; if(!a||!(a.email&&a.password&&a.name)) return; toastC('Criando conta...');
  (async ()=>{ try {
    await NET.authSignUp(a.email, a.password, a.name);
    clLoginAfter(a.name); toastC('Conta criada!');
  } catch(e){
    if(e.code==='DUPLICATE_ACCOUNT'){ CL.auth.mode='login'; cdraw(); }
    toastC('⚠ '+e.message);
  } })();
}

/* ---- Esqueci minha senha: modal simples pedindo o e-mail (pré-preenchido se
   já tiver algo digitado na tela de login), manda o link de recuperação. ---- */
function clForgotPassword(){
  // TELA PORTADA (telas/Conta - Recuperar Senha): era um modal por cima do
  // login; o pacote a desenha como tela inteira, com a mesma marca e a mesma
  // barra de ação das outras do fluxo.
  CL._resetEmail=(CL.auth&&CL.auth.email)||'';
  CL.screen='recuperarsenha'; cdraw();
}

function clSendResetLink(){
  const email=(CL._resetEmail||'').trim();
  if(!email||!email.includes('@')){ toastC('⚠ Informe um e-mail válido.'); return; }
  toastC('Enviando...');
  (async ()=>{ try {
    await NET.authResetPassword(email);
    clCloseOverlay();
    toastC('✓ Link enviado! Confira seu e-mail (e a caixa de spam).');
  } catch(e){ toastC('⚠ '+(e&&e.message||'Erro ao enviar o link.')); } })();
}

/* ---- Nova senha: só chega aqui via link de recuperação (evento PASSWORD_RECOVERY,
   ver netInitSupabase) — a sessão temporária do link já autentica o updateUser. ---- */
function scResetPassword(){
  // TELA PORTADA: a outra ponta do caminho de telas/Conta - Recuperar Senha
  return rfNovaSenhaHTML();
}

/* SENHA SAINDO DE TRÁS PRA FRENTE: o oninput chamava cdraw(), que reescreve o innerHTML da tela
   inteira e RECRIA o <input>; o refoco por #cl-focus devolvia o cursor pra posição 0, então cada
   tecla nova entrava na FRENTE da anterior ("1234" virava "4321"). Digitar senha assim é quase
   impossível — e num campo `type="password"` o usuário nem enxerga o que está acontecendo.
   Agora a tecla só atualiza o estado; o aviso de divergência e o botão (as duas únicas coisas que
   dependiam do valor) são mexidos no lugar, sem recriar nada. */
function clResetPwInput(el, field){
  const st=CL.resetPw||(CL.resetPw={password:'',confirm:'',focus:'password'});
  st[field]=el.value;
  const ok=st.password.length>=6 && st.password===st.confirm;
  const mismatch=st.confirm.length>0 && st.password!==st.confirm;
  const w=$c('#cl-pwwarn'); if(w) w.style.display = mismatch ? '' : 'none';
  const b=$c('#cl-pwsave button'); if(b) b.disabled = !ok;
}
function clDoUpdatePassword(){
  const st=CL.resetPw; if(!st||st.password.length<6||st.password!==st.confirm) return;
  toastC('Salvando...');
  (async ()=>{ try {
    await NET.updatePassword(st.password);
    CL.resetPw=null;
    // limpa o hash/query de recuperação da URL sem recarregar a página
    try{ history.replaceState(null,'',window.location.pathname); }catch(e){}
    toastC('✓ Senha alterada! Entrando...');
    clLoginAfter(SB_AUTH_USER && (SB_AUTH_USER.user_metadata?.name || (SB_AUTH_USER.email||'').split('@')[0]));
  } catch(e){ toastC('⚠ '+(e&&e.message||'Erro ao salvar a senha.')); } })();
}

/* ================= FLUXO "NOVO JOGO" — wizard de 4 passos =================
   Redesign do handoff (design_handoff_novo_jogo): shell fixo igual à Home (barra de
   título + navbar logada + footer), cabeçalho de etapa (‹ Voltar + título + pill N/4) e
   barra de ação inferior. Só markup/estilo/navegação — a lógica (handlers) é a mesma.
   Passos: 1 Escolher modo · 2 Modo Solo · 3 Novo jogo (nome) · 4 Selecção de Países. */
function clWizHome(view){ CL.screen='abertura'; CL.landingView=view||'home'; CL.navMenuOpen=false; cdraw(); }
/* ação inline (botão principal logo abaixo do formulário) — automática nas telas de formulário
   (CTA único à direita, actionCls 'cl-wiz-action-e') ou quando o.actionInline for pedido. As
   telas de escolha (action-c), o lobby e a Selecção de Países mantêm a barra de ação inferior. */
function _wizInline(o){ return !!(o.actionInline || (o.actionCls && String(o.actionCls).indexOf('cl-wiz-action-e')>=0)); }
function wizShell(o){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};
  const user=st.name||CL.mgr||'jogador';
  /* O VOLTAR VIVE NA BARRA DE ACAO, junto do avancar — o mesmo canto nos dois
     assistentes (ver rfWiz). Estava no cabecalho do passo, longe do botao que
     leva para a frente. Aqui devolve string vazia quando nao ha para onde
     voltar, para nao abrir uma barra de acao so com um espacador dentro. */
  const back = o.back
    ? `<button class="cl-wiz-back" onclick="${o.back}">‹ ${escC(o.backLabel||'Voltar')}</button>`
    : '';
  // navbar à direita: público (login/criar conta) mostra "Entrar"; logado mostra chip + usuário + Sair
  const navRight = o.public
    ? `<button class="cl-home-entrar" onclick="clGoAbertura()"><span>🔑</span>Entrar</button>`
    : `<span class="cl-home-online"><span class="cl-home-online-dot"></span>100% Online</span>
       <span class="cl-wiz-user">👤 ${escC(user)}</span>
       <button class="cl-topbar-auth-out cl-wiz-sair" onclick="clAuthLogout()">Sair</button>`;
  // pill à direita do cabeçalho de etapa: customizado (o.pill, ex.: código da sala), ou passo N/4, ou vazio
  // O CONTADOR DIZ O TAMANHO DO CAMINHO. Era "N / 4" fixo em todas as telas, com o N reiniciando
  // no meio (Países era 4/4 e a tela seguinte voltava pra 1/4) — o contador prometia um fim que
  // não era o fim. Agora cada fluxo declara o próprio total (ver WIZ_PASSOS): Solo tem seis
  // etapas, Resenha tem cinco, e a tela de escolha do modo — que é a bifurcação — só diz "Passo 1".
  const totalDoModo = rfTrilhaDe(o.modo).length;
  const pill = o.pill!=null ? `<span class="cl-wiz-steppill">${o.pill}</span>`
    : (o.step ? `<span class="cl-wiz-steppill">${o.step} / ${totalDoModo}</span>`
              : `<span class="cl-wiz-back-sp"></span>`);
  // REBRANDING 2026: no desktop o passo vira uma TRILHA NUMERADA (o caminho inteiro
  // à vista, com o que já ficou pra trás marcado); no telefone, a mesma informação
  // vira barra de progresso no cabeçalho. O pill "N / 7" continua existindo como
  // fallback pras telas que não declaram passo (sala, convites com código próprio).
  const trilha = o.step ? rfTrilhaHTML(o.step, o.modo) : '';
  return `<div class="cl-home cl-wiz ${o.rootCls||''}">
    <div class="cl-home-titlebar">
      <div class="cl-home-tb-l"><img src="img/logo.webp" width="500" height="500" alt="">RetroFoot98</div>
      <div class="cl-home-tb-r"><span>_</span><span>□</span><span>✕</span></div>
    </div>
    ${homeNavbar(
      [['Início',"clWizHome('home')"],['Sobre nós',"clWizHome('sobre')"],['Como jogar',"clWizHome('ajuda')"],['Contato',"clWizHome('contato')"]],
      navRight)}
    <div class="cl-home-body cl-wiz-body">
      ${trilha}
      ${o.noHeader?'':`<div class="cl-wiz-stephead">
        ${o.headLeft!=null?o.headLeft:'<span class="cl-wiz-back-sp"></span>'}
        <span class="cl-wiz-steptitle">${escC(o.title)}</span>
        ${pill}
      </div>`}
      <div class="cl-wiz-content ${o.contentCls||''}">${o.body}${(_wizInline(o) && o.action!=null)?`<div class="cl-wiz-inlineaction ${o.actionCls||''}">${back}${o.action}</div>`:''}</div>
      ${(!_wizInline(o) && (o.action!=null || back))?`<div class="cl-wiz-actionbar ${o.actionCls||''}">${back}${o.action||''}</div>`:''}
    </div>
    ${typeof rfAcaoHTML==='function'?rfAcaoHTML():''}
    <div class="cl-home-footer">
      <div class="cl-home-foot-paginas">${rodapePaginasHTML()}</div>
      <div class="cl-home-foot-linha">
        <div class="cl-home-foot-l"><span class="cl-home-ver">v2026.01</span><span>© 2026 RetroFoot98</span></div>
        <div class="cl-home-foot-r">
          <a class="cl-home-foot" onclick="clWizHome('sobre')">Sobre nós</a>
          <a class="cl-home-foot" onclick="clWizHome('contato')">Contato</a>
          <a class="cl-home-foot" onclick="clWizHome('termos')">Termos</a>
          <a class="cl-home-foot" onclick="clWizHome('priv')">Privacidade</a>
        </div>
      </div>
    </div>
  </div>`;
}

/* ================= 02a · PASSO 1 — ESCOLHER MODO (Solo / Resenha) ================= */
/* ===== A RÉGUA DO ASSISTENTE — UMA POR MODO =====
   Havia UMA lista de rótulos ('Entrar..Jogar', 7 itens) e um mapa de totais
   ({solo:7, resenha:5}) que a CORTAVA. Duas consequências, ambas no ar:

   · O Solo carregava 'Sala' e 'Convites', que ele não tem — por isso a tela do
     nº de treinadores acendia "Sala".
   · A Resenha era truncada a 5, perdendo justamente 'Sorteio' e 'Jogar' — o
     modo que TEM sorteio de clube era o que não o mostrava. E como a régua
     encurtava a meio do caminho, o jogador via 5 itens no funil de entrada e
     7 depois, no mesmo fluxo.

   Agora cada modo declara o SEU caminho. Os dois compartilham o começo
   (Entrar · Modo) e o fim (Clube · Jogar); o meio é o que realmente difere:
   o Solo escolhe save e país, a Resenha abre sala e convida.

   E O NÚMERO NUNCA MAIS É ESCRITO À MÃO: cada tela diz o NOME do seu passo
   (ver rfPasso), e o número cai da régua do modo ativo. É por isso que os
   números divergiam — vinham escritos em 4 ficheiros diferentes, e telas
   partilhadas pelos dois modos (sorteio, boas-vindas) só podiam acertar num.
   No telefone o CSS troca a régua por barra de progresso (ver .rf-trilha). */
const RF_TRILHAS={
  solo:     ['Entrar','Modo','Save','País e liga','Clube','Jogar'],
  /* "País e liga" no 3: quem cria a sala escolhe país e divisão nela (ver rfOb4).
     Eu tinha posto "Resenha" aqui; o pacote ("Onboarding 2c - Resenha Comecar")
     desenha a régua com "País e liga", e é a régua do desenho que manda. */
  resenha:  ['Entrar','Modo','País e liga','Sala','Convites','Clube','Jogar'],
  /* QUEM ENTRA POR CÓDIGO tem caminho próprio, e curto: não escolhe país nem
     convida ninguém — o anfitrião já fez isso. É a régua que o pacote desenha
     em "Resenha - Entrar com Codigo" ("PASSO 3 DE 4 · CONVIDADO"). */
  convidado:['Entrar','Modo','Código','Sala'],
};
/* o modo ativo, quando quem desenha a tela não o diz */
function rfModoAtual(){ return (typeof CL!=='undefined' && CL.online) ? 'resenha' : 'solo'; }
function rfTrilhaDe(modo){ return RF_TRILHAS[modo] || RF_TRILHAS[rfModoAtual()] || RF_TRILHAS.solo; }
/* O PASSO PELO NOME. Devolve a posição 1-based do passo na régua do modo, ou 0
   quando aquele modo não tem esse passo (Solo não tem 'Convites') — 0 apaga a
   régua em vez de acender o item errado. */
function rfPasso(nome, modo){
  const t=rfTrilhaDe(modo); const i=t.indexOf(nome);
  return i<0 ? 0 : i+1;
}
const RF_TRILHA=RF_TRILHAS.solo;   // compat: quem ainda lê a lista solta
function rfTrilhaHTML(passo, modo){
  const rotulos=rfTrilhaDe(modo), n=rotulos.length;
  if(!passo || passo<1 || passo>n) return '';   // passo que nao existe neste modo: sem regua
  const itens=[];
  for(let i=1;i<=n;i++){
    const feito=i<passo, atual=i===passo;
    itens.push(`<span class="rf-trilha-i ${feito?'feito':''} ${atual?'atual':''}">
      <span class="rf-trilha-n">${feito?'✓':i}</span>
      <span class="rf-trilha-l">${escC(rotulos[i-1]||('Passo '+i))}</span>
    </span>`);
  }
  return `<nav class="rf-trilha" aria-label="Passo ${passo} de ${n}"
    style="--rf-trilha-pct:${Math.round(100*passo/n)}%">
    <span class="rf-trilha-mob">Passo <b>${passo}</b> de <b>${n}</b> · ${escC(rotulos[passo-1]||'')}
      <span class="rf-trilha-bar"><i></i></span></span>
    ${itens.join('<span class="rf-trilha-sep"></span>')}
  </nav>`;
}
/* NA BETA O MODO RESENHA É "EM BREVE" (regra do rebranding). O cartão continua
   na tela, com a descrição inteira — esconder o modo seria esconder metade do que
   o jogo é. O que muda é que ele não é clicável e diz por quê. Trocar esta
   constante pra false devolve o clique, sem mexer em mais nada. */
/* LIBERADO PARA TESTE INTERNO (2026-08-14). Enquanto era `true`, o cartão do
   Modo Resenha aparecia travado com "Em breve" e o botão levava à lista de
   espera. Com `false`, o cartão abre o fluxo de 6 passos — Abrir Sala, Sala
   Aberta, sorteio e lobby — que já está implementado.
   Para voltar a esconder da beta pública, basta trocar de novo para `true`:
   é a ÚNICA chave, e as duas peles (rf26-onboarding e o main antigo) leem
   daqui. */
const RESENHA_EM_BREVE=false;
function scModoChoice(){
  return wizShell({ step:rfPasso('Modo','solo'), modo:'solo', title:'Escolher modo', back:'clGoAbertura()', backLabel:'Voltar ao início',
    contentCls:'cl-wiz-center', actionCls:'cl-wiz-action-c',
    action:`<span class="cl-wiz-hint">Toque num cartão para continuar.</span>`,
    body:`
      <div class="cl-wiz-h">Comece a sua carreira contra a máquina.</div>
      <div class="cl-wiz-sub">${RESENHA_EM_BREVE
        ? 'O Modo Resenha, para jogar com a turma, chega em breve. Na beta, o Solo já está completo.'
        : 'Você pode mudar de modo depois, a qualquer momento.'}</div>
      <div class="cl-wiz-cards">
        <div class="cl-mc-card rec" onclick="clPickSolo()">
          <span class="rf-tag-rec">Recomendado</span>
          <div class="cl-mc-ic">🛋️</div>
          <div class="cl-mc-t">Modo Solo</div>
          <div class="cl-mc-d">Pega um clube da Série D e sobe até a elite no seu ritmo. Mercado, finanças e o calendário completo de copas — sem depender de ninguém entrar na sala.</div>
        </div>
        <div class="cl-mc-card ${(RESENHA_EM_BREVE||!rfPodeResenha())?'embreve':''}" ${RESENHA_EM_BREVE?'':'onclick="clPickResenha()"'}>
          <span class="${RESENHA_EM_BREVE?'rf-tag-soon':'rf-tag-rec'}">${RESENHA_EM_BREVE?'Em breve':'Online'}</span>
          <div class="cl-mc-ic">🍺</div>
          <div class="cl-mc-t">Modo Resenha</div>
          <div class="cl-mc-d">Monte a liga do grupo do trabalho ou da comunidade. Até 20 treinadores jogam a mesma semana ao vivo, com tabela, mercado e zoeira no chat.</div>
          ${RESENHA_EM_BREVE?`<div class="rf-mc-lock">🔒 Não disponível na versão beta.</div>`
            :(!rfPodeResenha()?`<div class="rf-mc-lock">🔒 Os seus 7 dias de Resenha acabaram — toque para ver os planos.</div>`:'')}
        </div>
      </div>`
  });
}
function clPickSolo(){ CL.screen='modosolo'; CL.soloStep='choice'; CL.soloSaves=null; CL.mode=null; CL.contSel=null; CL.save=''; cdraw();
  (async ()=>{ CL.soloSaves = (typeof NET!=='undefined'&&NET.listSoloSaves)?await NET.listSoloSaves():[]; if(CL.screen==='modosolo') cdraw(); })(); }
function clPickResenha(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{loggedIn:false};
  if(!st.loggedIn){ clOnlineStart(); return; } // fallback: o gate da abertura normalmente já garante login
  /* OS 7 DIAS DO PELADEIRO. Explica antes de deixar entrar no fluxo: quem já
     passou do prazo ia escolher sala, escolher clube e só levar o "não" do
     servidor no claim_seat, depois de investir a escolha. A recusa que vale
     continua a ser a do banco — esta aqui é para não desperdiçar o caminho. */
  if(typeof rfPodeResenha==='function' && !rfPodeResenha()){
    if(typeof rfTrava==='function') rfTrava('resenha');
    return;
  }
  // Resenha é sempre Brasil Série A — limpa qualquer resíduo de um solo anterior (universo intl,
  // divisão baixa) pra que a sala criada use os clubes certos e newGame não quebre depois.
  if(typeof setUniverse==='function') setUniverse('brasil');
  if(DATA.clubsSerieA) DATA.clubs=DATA.clubsSerieA.slice();
  CL.intlUniverse=false; CL.bgCountries=[]; CL.playCountry='Brasil';
  CL.screen='online';
  CL.net={ step:'escolha', intent:'host', authMode:'login', name:CL.mgr||st.name||'', email:st.email||'', roomName:'', phone:'', code:'', myRooms:null };
  wireNet(); cdraw();
  // busca em segundo plano as salas que o usuário já participa (pra oferecer reentrar)
  (async ()=>{ try{ CL.net.myRooms = await NET.listMyRooms(); if(CL.net&&CL.net.step==='escolha') cdraw(); }catch(e){} })();
}

/* ================= PASSO 2 · MODO SOLO — novo / continuar (saves na NUVEM) ================= */
function scModoSolo(){
  const step=CL.soloStep||'choice';
  if(step==='novo') return scSoloNovo();
  const loading=CL.soloSaves==null; const n=(CL.soloSaves||[]).length;
  const travado = (typeof rfPodeSalvarNovo==='function') && !rfPodeSalvarNovo();
  const contDesc = loading?'Carregando seus jogos salvos' : (n?`Você tem <b>${n}</b> jogo${n>1?'s':''} salvo${n>1?'s':''} na nuvem.`:'Nenhum jogo salvo ainda.');
  return wizShell({ step:rfPasso('Save','solo'), modo:'solo', title:'Modo Solo', back:'clGoModo()',
    contentCls:'cl-wiz-center', actionCls:'cl-wiz-action-c',
    action:`<span class="cl-wiz-hint">Toque num cartão para continuar.</span>`,
    body:`
      <div class="cl-wiz-h">Como você quer começar?</div>
      <div class="cl-wiz-sub">Comece do zero ou retome um dos seus saves na nuvem.</div>
      <div class="cl-wiz-cards">
        <div class="cl-mc-card sel ${travado?'rf-travado':''}" onclick="${travado?`rfTrava('saves')`:'clSoloNew()'}">
          ${travado?'<span class="rf-selo-plano">🔒 Plano</span>':'<span class="cl-mc-badge">NEW</span>'}
          <div class="cl-mc-t">Novo jogo</div>
          <div class="cl-mc-d">${travado
            ? `Você já tem ${n} carreiras salvas — o máximo do seu plano. Apague uma para abrir espaço, ou suba de plano.`
            : 'Comece uma carreira nova do zero, contra a máquina.'}</div>
        </div>
        <div class="cl-mc-card" onclick="clPickSolo()">
          <div class="cl-mc-ic">📁</div>
          <div class="cl-mc-t">Continuar</div>
          <div class="cl-mc-d">${contDesc}</div>
        </div>
      </div>`
  });
}
/* ================= PASSO 3 · NOVO JOGO — nome do save ================= */
function scSoloNovo(){
  const val=CL.save||''; const ok=val.trim().length>0;
  return wizShell({ step:rfPasso('Save','solo'), modo:'solo', title:'Novo jogo', back:'clSoloBackChoice()',
    contentCls:'cl-wiz-top', actionCls:'cl-wiz-action-e',
    action:`${btn('Começar','clModoOk()',{icon:'✔',cls:'cl-btn-ok cl-wiz-cta',dis:!ok})}`,
    body:`
      <div class="cl-wiz-form">
        <p class="cl-wiz-p">Dê um nome pra este jogo (até 8 letras/números). Ele fica salvo na sua conta, na nuvem.</p>
        <div class="cl-wiz-fieldhd">
          <label class="cl-wiz-label">Nome do jogo</label>
          <span class="cl-wiz-count">${val.length}/8</span>
        </div>
        <input id="cl-focus" class="cl-wiz-field" type="text" maxlength="8" placeholder="EX: SAVE01" value="${escC(val)}"
          oninput="CL.save=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'');this.value=CL.save;clSyncOk();clSyncCount()"
          onkeydown="if(event.key==='Enter')clModoOk()">
        <div class="cl-wiz-note">Só letras e números, sem espaços.</div>
        ${patchPickerHTML()}
      </div>`
  });
}
function clSyncCount(){ const el=document.querySelector('.cl-wiz-count'); if(el) el.textContent=(CL.save||'').length+'/8'; }
/* scSoloCont() e clSoloContinue() foram removidas: eram o "passo 2 variante
   Continuar", e o roteador ('modosolo') nunca leu CL.soloStep — clicar em
   Continuar mudava o estado e redesenhava a MESMA tela. Hoje a lista de saves
   e a propria tela (rfObSoloHTML), sem bifurcacao. */

/* apagar um jogo salvo (solo) — confirmação + delete na nuvem */
function clDeleteSave(name){
  overlayC(dlg('Apagar jogo?', `<div class="cl-res">
    <div class="cl-res-verd" style="text-align:center">Apagar o jogo salvo <b>${escC(name)}</b>? Esta ação não pode ser desfeita.</div>
    <div class="cl-cal-ok" style="display:flex;gap:10px;justify-content:center;margin-top:14px">
      ${btn('Cancelar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}
      ${btn('Apagar',`clDeleteSaveGo('${escC(name)}')`,{icon:'🗑',cls:'cl-btn-ok'})}
    </div></div>`,{w:440}));
}
function clDeleteSaveGo(name){
  clCloseOverlay(); toastC('Apagando jogo...');
  (async ()=>{
    const ok=(typeof NET!=='undefined'&&NET.deleteSoloSave)?await NET.deleteSoloSave(name):false;
    if(ok){ CL.soloSaves=(CL.soloSaves||[]).filter(s=>s.name!==name); toastC('Jogo apagado.'); cdraw(); }
    else toastC('⚠ Não foi possível apagar o jogo. Tente de novo.');
  })();
}
/* O desenho novo NÃO tem passo pra nomear o save — a trilha vai direto de "Modo"
   pra "País e liga". O nome então nasce aqui, no mesmo padrão que o campo antigo
   sugeria no placeholder (SAVE01, SAVE02…), pulando os que já existem na conta.
   `clModoOk()` continua exigindo CL.save preenchido, e é ele que decide seguir. */
function clSaveNomeLivre(){
  const usados=new Set((CL.soloSaves||[]).map(s=>String(s.name||s.save_name||'').toUpperCase()));
  for(let i=1;i<100;i++){
    const n='SAVE'+String(i).padStart(2,'0');
    if(!usados.has(n)) return n;
  }
  return 'SAVE'+Date.now().toString(36).slice(-4).toUpperCase();
}
function clSoloNew(){ CL.save=clSaveNomeLivre(); CL.soloStep='novo'; clModoOk(); }
function clSoloBackChoice(){ CL.soloStep='choice'; cdraw(); }
function clSyncOk(){ const b=document.querySelector('.cl-wiz-cta, .cl-btn-ok'); if(b) b.disabled = !((CL.save||'').trim().length>0); }
function clGoAbertura(){ CL.screen='abertura'; cdraw(); }
function clModoOk(){
  if(CL.mode==='cont'&&CL.contSel){ clLoadSave(CL.contSel); return; }
  /* TETO DE SAVES DO PLANO. Este e' o funil de TODA carreira nova — clSoloNew,
     os cartoes da pele nova e o atalho das configuracoes passam todos por aqui
     —, entao a trava mora num sitio so'. Quem ja tem save nenhum perde: a
     lista continua inteira e jogavel, so' o "mais um" e' que para (ver
     rfPodeSalvarNovo / RF_TRAVAS.saves, em ui/rf26-landing.js).
     O servidor recusa na mesma, por trigger em solo_saves — isto aqui e' a
     explicacao, nao a fechadura. */
  if(typeof rfPodeSalvarNovo==='function' && !rfPodeSalvarNovo()){
    if(typeof rfTrava==='function') rfTrava('saves');
    return;
  }
  // patch escolhido pelo jogador entra AQUI, antes de o universo ser montado (o wizard
  // ainda tem telas pela frente, então a busca na rede não segura ninguém)
  if(typeof aplicarPatchEscolhido==='function') aplicarPatchEscolhido();
  if((CL.save||'').trim().length>0){ CL.mode='novo'; CL.compToggle={libertadores:true,copaBrasil:true,sulamericana:true};
    if(!CL.countries.size) CL.countries.add('Brasil'); // Brasil pré-selecionado (default)
    CL.screen='paises'; cdraw(); }
}

/* ================= 03 · SELECÇÃO DE PAÍSES ================= */
/* nº TOTAL de clubes jogáveis de um país = soma de todas as divisões do universo (1ª real +
   2ª criada), pra a tela mostrar o tamanho de verdade e o botão de iniciar liberar (mín. 20).
   País europeu só conta se os dados reais da 1ª divisão estiverem carregados (INTL_LEAGUES). */
function intlTeams(country){
  const uniKey = country==='Brasil' ? 'brasil' : country;
  const cfg=(typeof UNI_CONFIGS!=='undefined') && UNI_CONFIGS[uniKey];
  const total = (cfg&&cfg.size&&cfg.order) ? cfg.order.reduce((s,d)=>s+(cfg.size[d]||0),0) : 0;
  if(country==='Brasil') return total||80;
  const l=((typeof window!=='undefined'&&window.INTL_LEAGUES||{})[country]) || ((typeof window!=='undefined'&&window.CONMEBOL_LEAGUES||{})[country]);
  if(!l || !l.length) return 0; // sem dados reais carregados -> país não jogável
  return total || l.length;
}
/* lista de países da tela — Brasil sempre jogável; europeus ficam clicáveis quando têm
   clubes reais carregados. Função (não const) pra refletir os dados carregados. */
function COUNTRY_LIST(){ const row=n=>({f:flagImg(n),n,teams:intlTeams(n),on:intlTeams(n)>0}); return [
  {f:flagImg('Brasil'),n:'Brasil',teams:intlTeams('Brasil'),on:true},
  // CONMEBOL (América do Sul) — ligas reais jogáveis
  row('Argentina'), row('Uruguai'), row('Colômbia'), row('Chile'), row('Peru'),
  row('Equador'), row('Paraguai'), row('Venezuela'), row('Bolívia'),
  // Europa
  row('Alemanha'), row('Espanha'), {f:flagImg('França'),n:'França',teams:intlTeams('França'),on:intlTeams('França')>0},
  row('Itália'), row('Portugal'), row('Inglaterra'),
]; }
function scPaises(){
  const rows=COUNTRY_LIST().map(c=>{const sel=CL.countries.has(c.n);
    return `<div class="cl-ctry ${sel?'sel':''} ${c.on?'':'off'}" ${c.on?`onclick="clToggleCountry('${c.n}')"`:''}>
      <span class="cl-flag">${c.f}</span><span class="cl-ctry-n">${c.n}</span>
      <span class="cl-ctry-t">${c.teams} ${c.teams===1?'clube':'clubes'}</span></div>`;}).join('');
  const teamsSel=[...CL.countries].reduce((s,n)=>{const c=COUNTRY_LIST().find(x=>x.n===n);return s+(c?c.teams:0);},0);
  const okDis=teamsSel<8; // uma liga viável (a menor CONMEBOL, Paraguai, tem 9 clubes)
  const totalTeams=COUNTRY_LIST().reduce((s,c)=>s+c.teams,0);
  // uma seção de competições por país SELECIONADO (ligas + copas), no estilo do Brasil
  const selCountries = COUNTRY_LIST().filter(c=>CL.countries.has(c.n)).map(c=>c.n);
  const compCol = selCountries.map(countryCompSection).join('');
  const compHelp = selCountries.length
    ? '<div class="cl-wiz-comphelp">Todas as ligas e copas de cada país selecionado entram no seu save.</div>'
    : '<div class="cl-wiz-comphelp">Selecione países à esquerda para ver as competições disponíveis.</div>';
  return wizShell({ step:rfPasso('País e liga','solo'), modo:'solo', title:'Selecção de Países', back:'clPaisesBack()',
    contentCls:'cl-wiz-paises', actionCls:'',
    action:`
      ${btn('Todas','clAllCountries()',{icon:'▤',cls:'cl-btn-row'})}
      <div class="cl-wiz-action-e">
        ${btn('Cancelar','clPaisesBack()',{icon:'✖',cls:'cl-btn-cancel cl-btn-row'})}
        ${btn('OK','clPaisesOk()',{icon:'✔',cls:'cl-btn-ok cl-wiz-cta',dis:okDis})}
      </div>`,
    body:`
      <div class="cl-wiz-chips">
        <span class="cl-wiz-chip on"><span>Clubes</span><b>${teamsSel}</b><span class="cl-wiz-chip-tot">de ${totalTeams}</span></span>
        <span class="cl-wiz-chip on"><span>Países</span><b>${CL.countries.size}</b><span class="cl-wiz-chip-tot">de ${COUNTRY_LIST().length}</span></span>
        <span class="cl-wiz-chips-note">Totalize pelo menos 8 clubes.</span>
      </div>
      <div class="cl-wiz-paisescols">
        <div class="cl-wiz-col cl-wiz-col-paises">
          <div class="cl-wiz-collabel">Países</div>
          <div class="cl-ctry-list cl-wiz-clist">${rows}</div>
        </div>
        <div class="cl-wiz-col cl-wiz-col-comp">
          <div class="cl-wiz-collabel">Competições</div>
          ${compCol}
          ${compHelp}
        </div>
      </div>`
  });
}
function clPaisesBack(){ CL.screen='modosolo'; CL.soloStep='novo'; cdraw(); }
/* competições de UM país selecionado (divisões + copas), no mesmo visual do Brasil.
   Brasil: Séries A–D + Copa do Brasil/Libertadores/Sul-Americana (ligáveis por CL.compToggle).
   Países europeus: 1ª/2ª divisão + Champions League/Europa League (inclusas com o país).
   'início' vai na divisão de baixo (onde a rodada começa se você jogar esse país). */
function countryCompSection(country){
  const uniKey = country==='Brasil' ? 'brasil' : country;
  const cfg = (typeof UNI_CONFIGS!=='undefined') && UNI_CONFIGS[uniKey];
  if(!cfg || !cfg.order) return '';
  const isBr = country==='Brasil';
  const order = cfg.order, lowestDiv = order[order.length-1];
  // MODO TESTE (ver TESTING_FREE_DIVISION_PICK, topo do arquivo): só no Brasil por enquanto —
  // deixa escolher em qual divisão o save começa, clicando no badge dela. Fora do modo teste
  // (ou fora do Brasil), 'início' fica sempre na mais baixa, a regra de sempre.
  const testPickable = TESTING_FREE_DIVISION_PICK && isBr;
  const startDiv = (testPickable && CL.testStartDiv && CL.testStartDiv[uniKey]) || lowestDiv;
  const openKey = 'compOpen_'+uniKey.replace(/[^a-z0-9]/gi,'');
  const open = CL[openKey]!==false;
  const divBadges = order.map(d=>{
    const label=(cfg.label&&cfg.label[d])||d;
    const ic = (isBr && divisionTrophyImg(d,26)) || '<span class="cl-divopt-ic">🏆</span>';
    const start = d===startDiv;
    const clickAttr = (testPickable && !start) ? `onclick="clSetTestStartDiv('${uniKey}','${d}')" style="cursor:pointer"` : 'style="cursor:default"';
    return `<div class="cl-comp-toggle on ${start?'start':''}" ${clickAttr}>${ic}<b>${escC(label)}</b>${start?'<span class="cl-comp-start-tag">início</span>':''}</div>`;
  }).join('');
  const testHint = testPickable ? `<div class="cl-comp-testhint">🧪 Modo teste: clique numa divisão pra começar nela.</div>` : '';
  // toda competição do país entra sempre no save — badges informativos (✔), sem liga/desliga
  const cupBadge=(label,tk)=>`<div class="cl-comp-toggle on" style="cursor:default">${(tk&&trophyImg(tk,26))||'<span class="cl-divopt-ic">🏆</span>'}<b>${escC(label)}</b><span class="cl-comp-check">✔</span></div>`;
  const cupBadges = isBr
    ? cupBadge('Libertadores','libertadores')+cupBadge('Sul-Americana','sulamericana')+cupBadge('Copa do Brasil','copaBrasil')
    : cfg.src==='conmebol'
      ? cupBadge('Libertadores','libertadores')+cupBadge('Sul-Americana','sulamericana')
      : cupBadge('Champions League')+cupBadge('Europa League');
  return `<div class="cl-paises-divisao">
    <div class="cl-paises-sec-title cl-acc-hd" onclick="clToggleAcc('${openKey}')">
      <span class="cl-comp-country">${flagImg(country)} ${escC(country)}</span>
      <span class="cl-acc-arrow ${open?'':'closed'}">▾</span></div>
    <div class="cl-acc-body ${open?'':'closed'}">
      <div class="cl-comp-grouplbl">Ligas</div>
      <div class="cl-divopt-row">${divBadges}</div>
      ${testHint}
      <div class="cl-comp-grouplbl">Copas e continentais</div>
      <div class="cl-divopt-row">${cupBadges}</div>
    </div>
  </div>`;
}
/* multi-seleção: qual(is) divisões do Brasil entram nesse save. Não deixa desmarcar
   a última (precisa sobrar pelo menos uma pra começar o jogo). */
function clToggleDivision(d){
  const checkedCount=Object.values(CL.divisionToggle).filter(Boolean).length;
  if(CL.divisionToggle[d] && checkedCount<=1){ toastC('Precisa deixar pelo menos uma divisão marcada.'); return; }
  CL.divisionToggle[d]=!CL.divisionToggle[d]; cdraw();
}
/* divisão em que o save realmente começa: a mais alta marcada (A > B > C > D) */
function computeStartDivision(){
  // no clássico, todo mundo começa na Série D e vai subindo — não é mais escolha do usuário
  // MODO TESTE (ver TESTING_FREE_DIVISION_PICK acima): libera escolher via CL.testStartDiv.brasil
  if(TESTING_FREE_DIVISION_PICK && CL.testStartDiv && CL.testStartDiv.brasil) return CL.testStartDiv.brasil;
  return 'D';
}
function divisionShortLabel(d){ return (typeof DIV_LABEL_FULL!=='undefined'&&DIV_LABEL_FULL[d]) || ({A:'Série A',B:'Série B',C:'Série C',D:'Série D'})[d] || 'Série A'; }
/* flag + nome do país do universo ativo (Brasil/Inglaterra/Espanha...) — usado no cabeçalho */
/* bandeira/nome do universo ATIVO no cabeçalho do clube do usuário. Fonte de verdade:
   universeCountryInfo()/activeUniverseKey() (core.js), que leem S.intlUniverse — NÃO o
   antigo S.universe, que nunca era gravado e deixava tudo como Brasil. */
function universeFlag(){ return (typeof universeCountryInfo==='function'?universeCountryInfo():{flag:flagImg('Brasil')}).flag; }
function universeCountryName(){ return (typeof universeCountryInfo==='function'?universeCountryInfo():{name:'Brasil'}).name; }
function clToggleComp(key){ CL.compToggle[key]=!CL.compToggle[key]; cdraw(); }
function clToggleCountry(n){ if(CL.countries.has(n))CL.countries.delete(n); else CL.countries.add(n); cdraw(); }
function clAllCountries(){ COUNTRY_LIST().forEach(c=>{ if(c.on)CL.countries.add(c.n); }); cdraw(); }
/* chave de universo de um país selecionável (Brasil = pirâmide A/B/C/D; europeus = UNI_CONFIGS) */
function countryUniverseKey(country){ if(country==='Brasil') return 'brasil'; return (typeof UNI_CONFIGS!=='undefined'&&UNI_CONFIGS[country])?country:null; }
/* países selecionados que têm liga jogável de verdade (têm clubes carregados) */
function selectedPlayableCountries(){ return [...CL.countries].filter(c=>countryUniverseKey(c) && (c==='Brasil'||intlTeams(c)>0)); }
function clPaisesOk(){
  const playable=selectedPlayableCountries();
  if(playable.length>1){
    // 2+ países: usuário precisa escolher em qual terá time jogável (os outros rodam no background)
    if(!CL.playCountry || playable.indexOf(CL.playCountry)<0) CL.playCountry=playable[0];
    CL.screen='paisJogavel';
  } else {
    CL.playCountry=playable[0]||'Brasil';
    CL.screen='moeda';
  }
  cdraw();
}
/* ================= 03b · PAÍS JOGÁVEL (só quando 2+ países selecionados) ================= */
const COUNTRY_FLAG={Brasil:flagImg('Brasil'),Argentina:flagImg('Argentina'),Uruguai:flagImg('Uruguai'),'Colômbia':flagImg('Colômbia'),Chile:flagImg('Chile'),Peru:flagImg('Peru'),Equador:flagImg('Equador'),Paraguai:flagImg('Paraguai'),Venezuela:flagImg('Venezuela'),'Bolívia':flagImg('Bolívia'),Alemanha:flagImg('Alemanha'),Espanha:flagImg('Espanha'),'França':flagImg('França'),'Itália':flagImg('Itália'),Portugal:flagImg('Portugal'),Inglaterra:flagImg('Inglaterra')};
function scPaisJogavel(){
  // TELA PORTADA (telas/Fluxo - Pais Jogavel)
  return rfPaisHTML();
}

function clGoPaises(){ CL.screen='paises'; cdraw(); }
function clPaisJogavelOk(){ CL.screen='moeda'; cdraw(); }

/* ================= SETUP DO JOGO (redesign handoff_setup_jogo) — wizShell 1/4..4/4 =================
   Dinheiro (1/4) → Jogadores (2/4) → Escolha os clubes (3/4) → A iniciar o jogo (loading).
   Só markup/estilo/navegação; a lógica (nomes, moeda, sorteio, montagem do jogo) é a mesma. */
/* ---- 1/4 · DINHEIRO (moeda) ---- */
function scMoeda(){
  // TELA PORTADA (telas/Fluxo - Escolha de Moeda)
  return rfMoedaHTML();
}

function clMoedaBack(){ CL.screen = selectedPlayableCountries().length>1 ? 'paisJogavel' : 'paises'; cdraw(); }
function clMoedaOk(){ CL.screen='jogadores'; cdraw(); }
function clGoMoeda(){ CL.screen='moeda'; cdraw(); }

/* ---- 4/4 · A INICIAR O JOGO (loading + barra de progresso) ---- */
function scLoading(){
  // TELA PORTADA (telas/Fluxo - Carregando)
  return rfCarregandoHTML();
}

/* A ESPERA DA ENTRADA E' DE 10 SEGUNDOS, DE PROPOSITO.
   A barra era um sorteio (8 a 21 por tique de 180ms): chegava a 100% em pouco
   mais de um segundo e meio, e o splash do patrocinador (rf98.loading.splash)
   passava rapido demais para ser visto -- um espaco de tela cheia entregue em
   piscar de olhos. Agora ela e' cronometrada: a barra anda pelo RELOGIO, do
   inicio ao fim de RF_LOAD_MS, e as quatro etapas acompanham.

   ISTO NAO ESTA A ESPERAR TRABALHO NENHUM: a montagem do save acontece dentro
   de CL._pendingLaunch, que so' corre no fim. A espera e' o produto -- e' o voo
   que o espaco vende. Para mudar a duracao, e' este numero e mais nada. */
const RF_LOAD_MS=10000;
function runLoading(){
  /* cdraw() chama isto A CADA DESENHO enquanto a tela e' a de carregamento: sem
     esta trava, dois relogios corriam ao mesmo tempo e a barra saltava ao dobro
     da velocidade -- que era exactamente a forma de a espera encolher sozinha. */
  if(CL._loadT) return;
  const inicio=Date.now();
  CL._loadPct=0;
  CL._loadT=setInterval(()=>{
    // saiu da tela de carregamento (ou outro fluxo assumiu): o relogio morre com ela
    if(CL.screen!=='loading'){ clearInterval(CL._loadT); CL._loadT=null; return; }
    const p=Math.min(100, Math.round((Date.now()-inicio)/RF_LOAD_MS*100));
    // a barra E a lista de etapas: sem CL._loadPct, os quatro itens da tela portada
    // ficariam parados em "na fila" enquanto a barra corre (ver rfCarregandoHTML)
    CL._loadPct=p;
    const f=$c('#cl-load-fill'), pc=$c('#cl-load-pct'); if(f)f.style.width=p+'%'; if(pc)pc.textContent=p+'%';
    if(typeof rfCarregandoEtapas==='function') rfCarregandoEtapas(p);
    if(p>=100){ clearInterval(CL._loadT); CL._loadT=null; setTimeout(()=>{
      if(CL._pendingLaunch){ const fn=CL._pendingLaunch; CL._pendingLaunch=null; fn(); } // clubes -> loading -> lança o jogo
      else { CL.screen='jogadores'; cdraw(); }
    },350); }
  }, 180);
}

/* ---- 2/4 · JOGADORES (nomes) ---- */
/* Multiplayer local (hotseat — vários treinadores humanos passando o mesmo aparelho, um save só)
   desabilitado da UI por enquanto: esta tela chegou a aceitar até 6 nomes (Jogador 1..6), e
   qualquer slot além do 0 preenchido já ligava o hotseat sozinho (CL.humans com >1 entrada em
   clEntrar(), ver scSeatTurn/enterSeatContext/CL._hotseat). A MÁQUINA continua toda no lugar —
   só a entrada pela UI foi removida — pra não perder o trabalho se decidirmos religar depois.
   Quem quer jogar com mais gente é direcionado pro Modo Resenha (online) em vez disso. */
function scJogadores(){
  // TELA PORTADA (telas/Fluxo - Numero de Treinadores)
  return rfTreinadoresHTML();
}

/* clubes reais dos países europeus selecionados (união de todas as ligas escolhidas) */
function intlSelectedClubs(){
  const out=[]; const seen=new Set();
  [...CL.countries].forEach(country=>{
    const clubs=(typeof window!=='undefined'&&window.INTL_LEAGUES||{})[country];
    if(clubs) clubs.forEach(c=>{ if(!seen.has(c.id)){ seen.add(c.id); out.push(c); } });
  });
  return out;
}
/* algum país europeu (com dado real) selecionado? */
function hasIntlSelection(){
  return [...CL.countries].some(n=>n!=='Brasil' && intlTeams(n)>0);
}
/* país europeu ÚNICO selecionado que tem sistema de divisões próprio (UNI_CONFIGS).
   Só nesse caso ligamos o universo com pirâmide/promoção (ex.: Inglaterra PL/CH) ou
   divisão única com classificação continental (Espanha/Itália/Alemanha/Portugal). */
function intlSingleUniverseCountry(){
  const sel=[...CL.countries];
  if(sel.length!==1) return null;
  const c=sel[0];
  if(c==='Brasil') return null;
  return (typeof UNI_CONFIGS!=='undefined' && UNI_CONFIGS[c] && intlTeams(c)>0) ? c : null;
}
function clSortear(){
  const names=CL.names.map(n=>(n||'').trim()).filter(Boolean);
  if(!names.length){ CL.names[0]='JOGADOR'; return cdraw(); }
  // universo jogável = país escolhido (CL.playCountry). NUNCA misturamos países numa liga:
  // os demais países selecionados rodam sozinhos no background (ver S.bgCountries).
  const uni = CL.playCountry || (selectedPlayableCountries()[0]) || 'Brasil';
  (async ()=>{
    if(uni==='Brasil'){
      setUniverse('brasil'); CL.intlUniverse=false;
      const startDivision=computeStartDivision();
      if(startDivision!=='A'){
        if(typeof NET!=='undefined' && NET.getDivisionClubs && NET.authStatus && NET.authStatus().loggedIn){
          toastC('Carregando times da Série '+startDivision+'...');
          try{ await loadRealDivisionClubs(startDivision); }catch(e){ console.warn('divisão real indisponível, usando fallback procedural:',e); }
        }
        DATA.clubs = clubsForDivision(startDivision);
      } else {
        DATA.clubs = DATA.clubsSerieA || DATA.clubs;
      }
    } else {
      // universo europeu: liga própria; começa na ÚLTIMA divisão (começa embaixo e sobe).
      setUniverse(uni); CL.intlUniverse=uni;
      const startDiv=DIV_ORDER[DIV_ORDER.length-1];
      // fonte única: tenta o Supabase (division_clubs) igual ao Brasil; fallback = bundle INTL_LEAGUES
      if(typeof NET!=='undefined' && NET.getDivisionClubs && NET.authStatus && NET.authStatus().loggedIn){
        try{ await loadRealDivisionClubs(startDiv); }catch(e){ console.warn('liga real indisponível, usando bundle:',e); }
      }
      DATA.clubs = clubsForDivision(startDiv).slice();
    }
    // demais países selecionados = ligas de background (visíveis em Campeonatos, mercado)
    CL.bgCountries = selectedPlayableCountries().filter(c=>c!==uni);
    const pool=DATA.clubs.map(c=>c.id); const seed=(Math.random()*1e9)>>>0; const rnd=rngFrom(seed);
    // embaralha e distribui clubes distintos
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    CL.draw=names.map((nm,i)=>({name:nm, clubId:pool[i]}));
    CL.screen='sorteio'; cdraw();
  })().catch(err=>{
    console.error('Erro no sorteio:', err);
    toastC('⚠ Erro ao preparar o sorteio: '+(err&&err.message||'desconhecido'));
  });
}

/* ================= 07 · SORTEIO (nomes + clubes em cores) ================= */
/* cerimônia do sorteio no solo — mesmo desenho da Resenha (ver scResenhaDraw) */
function scSorteio(){
  const d=CL.soloDraw||{list:[],idx:0};
  const poolById=d.poolById||{};
  const rows=(d.list||[]).map((p,i)=>{
    const revelado=i<d.idx;
    if(!revelado) return `<div class="cl-rdraw-row pending"><span class="cl-rdraw-num">${i+1}</span><span class="cl-rdraw-name muted">${escC(p.name||'Treinador')}</span><span class="cl-rdraw-arrow">→</span><span class="cl-rdraw-team q">🎲</span></div>`;
    const c=clubOf(p.clubId)||poolById[p.clubId];   // ver startSoloDraw: S/DATA.clubs ainda não valem aqui
    const ultimo=(i===d.idx-1)&&!d.done;
    return `<div class="cl-rdraw-row revealed${ultimo?' pop':''}">
      <span class="cl-rdraw-num">${i+1}</span>
      <span class="cl-rdraw-name">${escC(p.name||'Treinador')}</span>
      <span class="cl-rdraw-arrow">→</span>
      <span class="cl-rdraw-team" style="${c?clubStripe(c):''}">${c?escC(c.short||c.name):'—'}</span>
    </div>`;
  }).join('');
  const sub=d.done?'Sorteio concluído! Preparando a temporada ⚽':'Sorteando os clubes, boa sorte!';
  // SEM "PULAR": não há o que pular aqui — o clube ainda está sendo sorteado, e o botão só
  // convidava a sair da cerimônia antes de saber qual time saiu. A tela segue sozinha.
  const action=`<span class="cl-wiz-hint">${d.done?'Preparando a temporada':'Aguarde o sorteio'}</span>`;
  return wizShell({ step:rfPasso('Clube','solo'), modo:'solo', title:'Sorteio dos clubes', contentCls:'cl-wiz-center',
    body:`<div class="cl-rdraw"><div class="cl-rdraw-sub">${sub}</div><div class="cl-rdraw-list">${rows}</div></div>`,
    action });
}
function clEntrar(){
  /* REDE DE SEGURANÇA: CL.draw é montado por clConfirmarClubes. Se alguém
     chegar aqui sem ele, o erro antigo era um TypeError cru na linha de baixo
     — sem pista nenhuma de que faltava um passo. Agora entra pela porta certa;
     se nem CL.pick estiver completo, clConfirmarClubes desiste sozinho e a
     tela fica onde está, em vez de o jogo morrer. */
  if(!(CL.draw||[]).length){
    console.warn('clEntrar sem CL.draw — passando por clConfirmarClubes');
    if(typeof clConfirmarClubes==='function') clConfirmarClubes();
    return;
  }
  CL.clubId=CL.draw[0].clubId; CL.mgr=CL.draw[0].name;
  // universo: país europeu = liga própria (começa na ÚLTIMA divisão, ex.: Championship);
  // false = Brasil. Copas brasileiras só no universo Brasil.
  const isIntl = !!CL.intlUniverse;
  const startDiv = isIntl ? DIV_ORDER[DIV_ORDER.length-1] : computeStartDivision();
  const comps = isIntl ? {libertadores:false,copaBrasil:false,sulamericana:false} : CL.compToggle;
  newGame(CL.clubId, startDiv, comps); S.xi=autoXI(CL.clubId);
  S.intlUniverse = CL.intlUniverse; // false | país (ex.: 'Inglaterra')
  S.bgCountries = (CL.bgCountries||[]).slice(); // outros países selecionados: ligas de background
  initBgLeagues(); // materializa as ligas de background pra simular/visualizar/negociar
  // estádio do próprio usuário: newGame() já semeou S.clubStadiumCap[CL.clubId] junto com o
  // resto do elenco de DATA.clubs (mesmo mapa por clube que a CPU usa — ver core.js) — não
  // precisa de semente separada aqui. S.stadium (campo único, um só por save) foi aposentado:
  // não fazia sentido na Resenha, onde vários humanos dividem o mesmo S (ver ticketPriceForDivision
  // logo abaixo pro preço do ingresso, que substitui levelTicketPrice).
  CL.ticket=ticketPriceForDivision(S.division);
  CL.formation=null; CL.tacticChosen=false;   // precisa escolher tática no menu p/ liberar "Jogar"
  S.coachHistory=[{season:S.season, type:'contratado', text:`Contratado pelo ${clubOf(CL.clubId).short.toUpperCase()}`}];
  try{ if(typeof coachSpellAbrir==='function'){ S.coachSpells=[]; coachSpellAbrir(CL.clubId,'contratado'); } }catch(e){}
  /* IDADE DE PARTIDA DO TREINADOR, escolhida no assistente (ver rfIdadeTreinador).
     Antes a ficha mostrava sempre "36 anos" porque o dado nao existia -- era uma
     conta fixa. Fica gravada uma vez; a partir dai ele envelhece uma temporada
     de cada vez, como toda a gente. */
  S.coachAge0=(typeof rfIdadeTreinadorValida==='function')?rfIdadeTreinadorValida():36;
  /* QUEM E' O TREINADOR NA FOTO. Escolhido no mesmo passo do nome e da idade.
     Pular e' permitido de proposito ("a gente escolhe uma por voce"), entao o
     que falta vira sorteio aqui — nunca um save sem cara. coachAvatar guarda
     ou uma chave de face padrao (m1..f5, resolvida em RF_TREINADORES) ou a URL
     do retrato gerado por IA; rfCoachAvatarUrl() trata os dois. */
  S.coachGender=(CL.coachGender==='f')?'f':'m';
  S.coachAvatar=CL.coachAvatar
    || ((typeof rfAvatarSorteado==='function')?rfAvatarSorteado():null);
  CL.speedMult=1;  // 1.0x, 1.5x, 2x, 3x (só anfitrião no modo Resenha pode mudar)
  // modo solo de verdade: garante que nada do modo online "vaza" pra cá (ex: se o usuário
  // tinha entrado numa sala online antes, na mesma aba, CL.online ficava travado em true e
  // liveDone() chamava NET.start() sozinho, avançando a rodada seguinte sem o usuário pedir)
  CL.online=false;
  if(typeof NET!=='undefined'){ NET.isHost=false; NET.gameId=null; NET.onState=null; }
  CL.humans={}; CL.draw.forEach(d=>CL.humans[d.clubId]=d.name);
  CL.tab='jogo'; CL.selPlayer=squad(CL.clubId)[0]?.pid||null;
  saveV3();
  // BOAS-VINDAS -> SORTEIOS -> TELA DO CLUBE. Todos os sorteios de abertura acontecem aqui, no
  // começo do jogo, um depois do outro (ver cupSeasonDrawDays: todos no dia 1) — é a partir deles
  // que o calendário da temporada inteira está montado, pra todos os clubes do save. Antes cada
  // cerimônia aparecia semanas adentro, na véspera da estreia da própria competição.
  showBoasVindas(()=>startSeasonOpeningDraws());
}

/* ================= BOAS-VINDAS AO CLUBE (pós-sorteio, Solo e Resenha) =================
   Tela intermediária mostrada uma vez, logo depois do sorteio do clube e ANTES da tela
   principal — tanto no Modo Solo (clEntrar acima) quanto no Modo Resenha online
   (onlineBeginSeason, net/local-transport.js, que chama showBoasVindas do mesmo jeito).
   Roda DEPOIS de newGame(): S/CL.clubId já existem, então usa dado real do save (orçamento,
   estádio, divisão) em vez de reconstruir tudo na mão. `onContinue` é o que cada chamador
   quer rodar ao entrar de fato — nos dois modos, os SORTEIOS DE ABERTURA de todas as
   competições (ver startSeasonOpeningDraws). */
/* ---- SORTEIOS DE ABERTURA, TODOS NO COMEÇO DO JOGO ----
   Uma cerimônia depois da outra, na ordem de estreia das competições (cupDrawOrder), logo depois
   das boas-vindas ao clube. Só a ABERTURA: chave da Copa do Brasil e fase de grupos das
   continentais. O sorteio do mata-mata continua no meio da temporada, na data real dele — não há
   como sortear oitavas antes de saber quem se classificou —, mas as DATAS dessas rodadas já estão
   reservadas no calendário desde agora (ver ensureCupCalendar/buildCupSchedule). */
/* A FILA DESTA CERIMÔNIA É LOCAL (CL), NUNCA S._pendingDrawShows. Motivo medido: aquela fila mora
   no ESTADO COMPARTILHADO, e a barreira de fechamento de rodada (onlineClosingRound, ver
   local-transport) trata "fila de sorteio por abrir" como jogador ocupado. Enfileirar os três
   sorteios de abertura logo na entrada punha a sala inteira em ocupado na rodada 0 — e o
   onlineBeginSeason ainda dá um `Object.assign(S, savedState.S)` assíncrono logo depois das
   boas-vindas, que ressuscitava a fila já consumida. O resultado era exatamente o travamento
   relatado: "fila de sorteio parada há 20s", "rodada 0 aberta há 6s sem fechar" e o estágio de
   quarta estourando os 75s. A cerimônia é UI por cliente sobre uma chave que o estado já contém,
   então não tem por que viajar no mundo. O que continua indo pro estado é só o marcador de
   "já enfileirada nesta temporada", pra o queueDueCupDraws do clJogar não repetir a cerimônia. */
function startSeasonOpeningDraws(onDone){
  onDone=onDone||function(){};
  let fila=[];
  try{
    const defs=(typeof cupDrawOrder==='function') ? cupDrawOrder()
      : [['copaBrasil','bracket'],['libertadores','group'],['sulamericana','group'],['championsLeague','group'],['europaLeague','group']];
    const season=(S&&S.season)||1;
    defs.forEach(([key,stage])=>{
      const c=S.cups&&S.cups[key]; if(!c) return;
      // competição sem cerimônia (Copa do Brasil — ver CUP_SEM_CERIMONIA no core)
      if(typeof cupTemCerimonia==='function' && !cupTemCerimonia(key)) return;
      // SÓ OS SORTEIOS CUJA DATA JÁ CHEGOU. O calendário oficial dá uma data a cada cerimônia
      // (02/03 Libertadores, 11/03 Sul-Americana, 21/03 Copa do Brasil), sempre antes da estreia
      // da própria competição — não é mais "todos no dia 1". Os que ainda não venceram entram
      // pelo queueDueCupDraws do clJogar, na rodada em que a data chega.
      if(typeof cupDrawReleased==='function' && !cupDrawReleased(key)) return;
      const st=(c.group && !c.bracket) ? 'group' : (stage||'bracket');
      const visto=key+':'+st+':'+season;
      if((CL._drawPlayedSeason||{})[visto] || (typeof drawAlreadySeen==='function' && drawAlreadySeen(visto))) return;
      fila.push({key, stage:st});
    });
    if(typeof ensureCupCalendar==='function') ensureCupCalendar(true);   // calendário montado a partir do sorteio
  }catch(e){ console.warn('sorteios de abertura:', e&&e.message); fila=[]; }
  CL._openingDraws=fila;
  runNextOpeningDraw(onDone);
}
/* O CARIMBO "JÁ ENFILEIRADA NESTA TEMPORADA" É DO MUNDO — então ele só pode ser escrito quando a
   cerimônia DE FATO começa. Ele era escrito ao montar a fila, antes de qualquer coisa rolar: se a
   cerimônia não chegasse a acontecer naquele cliente (dados da chave ainda não montados, tela
   trocada por cima, adoção de estado no meio), o mundo inteiro ficava marcado como "essa já foi" e
   o queueDueCupDraws — que é quem a traria de volta para TODOS na data certa — nunca mais a
   enfileirava. Um cliente perdia a cerimônia e, de quebra, tirava dela a única chance de voltar:
   era o sorteio da Copa do Brasil aparecendo para o convidado e não para o anfitrião. */
function runNextOpeningDraw(onDone){
  const fila=CL._openingDraws||[];
  if(!fila.length){ CL._openingDraws=null; if(onDone) onDone(); return; }
  const item=fila.shift();
  if(typeof startCupDrawReplay!=='function'){ CL._openingDraws=null; if(onDone) onDone(); return; }
  if(!startCupDrawReplay(item.key, item.stage, ()=>runNextOpeningDraw(onDone))){
    console.warn('sorteio de abertura da '+item.key+' sem dados prontos — não marco no mundo, ele volta pelo queueDueCupDraws');
    return runNextOpeningDraw(onDone);      // segue a fila; a cerimônia continua devendo, para todos
  }
  /* começou de verdade: agora sim. A marca é MINHA, não do mundo — no mundo ela impedia os
     outros treinadores de verem a mesma cerimónia (ver sorteioJaVistoPorMim, no core). */
  if(typeof marcarSorteioVistoPorMim==='function')
    marcarSorteioVistoPorMim(item.key+':'+((S&&S.season)||1));
}
/* `opts.midSeason` = cheguei a este clube TROCANDO de time no meio da temporada (aceitei o
   convite de outro clube — ver showJobInvite). Muda só o texto: em vez de "a temporada começa
   agora", a tela reconhece que o campeonato já está rolando e que o treinador assume a partir da
   próxima rodada. `opts.fromClub` = de onde ele veio, pra citar na despedida. */
function showBoasVindas(onContinue, opts){
  CL._welcomeThen = onContinue || null;
  CL._welcomeOpts = opts || null;
  CL.screen='boasvindas';
  cdraw();
}
function clBoasVindasContinuar(tab){
  CL.tab = tab || CL.tab || 'jogo';
  const then=CL._welcomeThen; CL._welcomeThen=null; CL._welcomeOpts=null;
  CL.screen='main';
  cdraw();
  if(then) then();
}
/* escudo do clube: real (Transfermarkt) quando existe — via club.crest (Série A e clubes
   estrangeiros/CONMEBOL) ou, pros clubes reais das Séries B/C/D do Brasil (que não vêm com
   crest no bundle original), via CLUB_CREST_BRASIL_LOWER (id do jogo -> URL do escudo,
   capturado do Transfermarkt por scripts/build-crests-brasil-lower.mjs). Sem nenhum dos dois
   (raríssimo — só clube sem match confiável na captura), cai num badge circular nas duas cores
   oficiais do clube com as iniciais — mesma identidade visual que clubStripe já usa em todo o
   resto do jogo. onerror também cai pro badge (link quebrado do Transfermarkt não deixa o
   escudo em branco). */
/* O ID DO CLUBE JA CARREGA O ID DO TRANSFERMARKT — falta so montar o endereco.
   Os 160 clubes da America do Sul (CONMEBOL_LEAGUES) vinham sem `crest` nenhum e nao estao no
   mapa das Series B/C/D: TODOS caiam no badge de iniciais, em todas as telas. Mas o id deles e
   `cmb_<n>` e esse `n` E o id do clube no Transfermarkt (River Plate 209, Boca 189, Penarol
   861...), o mesmo numero que o mapa do Brasil ja usa no fim da URL. Medido: os cinco testados
   devolvem a imagem de 180px.
   So se deriva quando o sufixo e SO digitos — id procedural (br_D_abc) nao vira URL invalida,
   continua a cair no mapa e, se nao houver, no badge. */
function crestFromTmId(id){
  const m=/^(?:cmb|intl|br_[A-D])_(\d+)$/.exec(String(id||''));
  return m ? 'https://tmssl.akamaized.net/images/wappen/big/'+m[1]+'.png' : null;
}
/* ===== O ID VERDADEIRO PODE ESTAR EM `tk`, NAO EM `id` =====
   O clube que entra numa copa continental nao e o objeto do bundle: realConmebolClub fabrica um
   id proprio a partir do NOME (`intl_estudiantes`, `intl_cusco`) e guarda o id de origem em
   `tk`. Dai a tabela da Libertadores e da Sul-Americana ficar sem escudo nenhum enquanto o
   bundle tinha os 160: o escudo era procurado por um id inventado, que nao esta em mapa nenhum
   e nao tem numero de Transfermarkt para derivar. O numero estava ali ao lado, no `tk`, desde
   sempre. */
function clubCrestUrl(club){
  if(!club) return null;
  if(club.crest) return club.crest;
  const M=(typeof CLUB_CREST_BRASIL_LOWER!=='undefined')?CLUB_CREST_BRASIL_LOWER:null;
  return (M && (M[club.id] || M[club.tk]))
      || crestFromTmId(club.id)
      || crestFromTmId(club.tk)
      || null;
}
function clubCrestHTML(club){
  const {col,col2}=clubColors(club);
  const txt=barTextColor(col,col2);
  const initials=escC((club.short||club.name||'?').replace(/[^\p{L}\p{N}]/gu,'').slice(0,3).toUpperCase());
  const fallback=`<span class="cl-welc-crest-fallback" style="background:${col};color:${txt}">${initials}</span>`;
  const crest=clubCrestUrl(club);
  if(!crest) return fallback;
  return `<span style="position:relative;display:inline-block;width:34px;height:41px">
    <img class="cl-welc-crest" src="${escC(crest)}" alt="Escudo do ${escC(club.short||'')}"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <span class="cl-welc-crest-fallback" style="display:none;position:absolute;inset:0;background:${col};color:${txt}">${initials}</span>
  </span>`;
}
function scBoasVindas(){
  const club=clubOf(CL.clubId); if(!club) return dlg('Início de temporada','',{w:900});
  const st=myStadium(); const cap=(st&&st.capacity)||STAND_START;
  const photo=stadiumPhotoFor(CL.clubId);
  const country=S.intlUniverse||'Brasil';
  const divLabel=classifDivName(S.division, S.intlUniverse);
  const video=(typeof clubWelcomeVideo==='function')?clubWelcomeVideo(CL.clubId):(window.WELCOME_VIDEO_DEFAULT||'');
  // troca de clube no meio da temporada (aceitei convite de outro clube): o campeonato já está
  // rolando, então "a temporada começa agora" seria mentira — o texto reconhece a rodada em que
  // ele assume e de onde veio.
  const mid=CL._welcomeOpts&&CL._welcomeOpts.midSeason ? CL._welcomeOpts : null;
  const titulo = mid ? `Novo desafio — ${club.short}` : `Início de temporada — ${club.short}`;
  const h1 = mid ? `Contrato assinado. Bem-vindo ao ${escC(club.short)}.`
                 : `Bem-vindo ao ${escC(club.short)}, treinador.`;
  const sub = mid
    ? `A temporada já está em andamento. Você assume o comando a partir da <span style="font-family:var(--mono);font-weight:700">${(S.round||0)+1}ª</span> rodada${mid.fromClub?`, deixando o ${escC(mid.fromClub)} para trás`:''}.`
    : `A temporada <span style="font-family:var(--mono);font-weight:700">${S.season||2026}</span> começa agora. O comando é seu.`;
  return dlg(titulo, `
    <div class="cl-welc">
      <div class="cl-welc-hd">
        <div>
          <div class="cl-welc-h1">${h1}</div>
          <div class="cl-welc-sub">${sub}</div>
        </div>
        <div class="cl-welc-badge">
          ${clubCrestHTML(club)}
          <span class="cl-welc-stripe" style="${clubStripe(club)}">${escC(club.short)}</span>
        </div>
      </div>

      <div class="cl-welc-media">
        <div>
          <div class="cl-welc-frame">
            <video src="${escC(video)}" autoplay muted loop playsinline></video>
          </div>
          <div class="cl-welc-cap">O presidente entrega a camisa ao novo treinador do ${escC(club.short)}.</div>
        </div>
        <div>
          <div class="cl-welc-frame cl-welc-stadium">
            ${photo?`<img src="${escC(photo)}" alt="Estádio do ${escC(club.short)}">`:standSVG(cap)}
          </div>
          <div class="cl-welc-cap"><strong style="color:#fff">${escC(typeof estadioNomeDe==='function'?estadioNomeDe(club):('Casa do '+club.short))}</strong> — ${grp(cap)} lugares.</div>
        </div>
      </div>

      <fieldset class="cl-welc-facts"><legend>Ficha do clube</legend>
        <div class="cl-welc-facts-grid">
          <div>País: <b>${escC(country)}</b></div>
          <div>Divisão: <b>${escC(divLabel)}</b></div>
          <div>Caixa disponível: <b>${fmt(S.budget||0)}</b></div>
          <div>Estádio: <b>${grp(cap)} lugares</b></div>
        </div>
      </fieldset>

      <div class="cl-welc-quotes">
        <div class="cl-welc-quote">
          <div class="cl-welc-quote-lbl">💬 O PRESIDENTE</div>
          <div class="cl-welc-quote-txt">${mid
            ? `"Cumprimos o que foi combinado no jantar: verba, tempo e liberdade. Agora é com você — pegue o ${escC(club.short)} onde ele está e leve mais longe."`
            : `"Essa camisa é sua agora, treinador. Monte o time do seu jeito, cuide do caixa e devolva ao ${escC(club.short)} os títulos que a torcida merece."`}</div>
        </div>
        <div class="cl-welc-quote">
          <div class="cl-welc-quote-lbl">📣 A TORCIDA</div>
          <div class="cl-welc-quote-txt">${mid
            ? `"Você chegou no meio do caminho, treinador. A gente enche o estádio do mesmo jeito. Só não deixe o ${escC(club.short)} baixar a cabeça."`
            : `"Chuva ou sol, a gente tá com o ${escC(club.short)}. Bem-vindo, treinador — só pedimos raça, o resto a gente empurra."`}</div>
        </div>
      </div>

      <div class="cl-welc-actions">
        <div class="cl-welc-hint">${mid?'Reveja a tática no menu':'Escolha a tática no menu'} <strong style="color:#fff">Formação</strong> antes ${mid?'da próxima rodada':'do primeiro jogo'}.</div>
        ${btn(mid?'Assumir o comando':'Iniciar temporada','clBoasVindasContinuar(\'jogo\')',{icon:'✔',cls:'cl-btn-ok'})}
      </div>
    </div>`, {w:900, bodyClass:'cl-body-green', min:true});
}

/* ================= CONVITE DE OUTRO CLUBE (3 etapas) =================
   Substitui o antigo modal único de "proposta de outro clube" (um Aceitar/Recusar seco, ver
   showJobOfferModal no core.js, que agora só delega pra cá). A troca de clube no meio da
   temporada é a decisão mais pesada da carreira, e passava numa caixinha de dois botões.
   Agora são três telas encadeadas:
     1) CONVITE  — o empresário avisa do convite pra jantar. Mostra a tabela em volta da sua
        posição, que é o que chamou a atenção do outro clube. Aceitar aqui NÃO é aceitar o
        emprego: é só um jantar, e é o gatilho pra próxima etapa.
     2) PROPOSTA — a conversa vira contrato na mesa do restaurante. É AQUI que ele decide de
        verdade: os termos (salário, verba, objetivo) ficam à vista antes do sim.
     3) BOAS-VINDAS — a mesma tela de boas-vindas do clube, na variante de meio de temporada
        (ver showBoasVindas/midSeason), já com o clube novo aplicado.
   Recusar em qualquer etapa cai numa confirmação curta e volta pro jogo, sem mexer em nada. */
function jobOfferClub(o){ return clubOf(o.clubId) || (typeof bgClubById==='function'&&bgClubById(o.clubId)) || {short:'?'}; }
function jobOfferDivLabel(o){
  return o.foreign
    ? (((typeof UNI_CONFIGS!=='undefined'&&UNI_CONFIGS[uniKeyOf(o.country)])||{}).label||{})[o.division] || o.division
    : (typeof DIV_LABEL_FULL!=='undefined' ? DIV_LABEL_FULL[o.division] : o.division);
}
/* O objetivo do contrato sai da REGRA REAL da divisão que ele vai disputar, não de um texto
   fixo: na divisão de topo o alvo é vaga continental (mesmas 6 vagas de qualificationZone);
   nas de baixo, o acesso (DIVISION_PROMO). Assim a promessa do presidente é a mesma coisa que
   o jogo vai cobrar depois. */
function jobOfferObjective(o){
  const topDiv=(typeof DIV_ORDER!=='undefined'&&DIV_ORDER.length)?DIV_ORDER[0]:'A';
  if(o.division===topDiv) return 'Terminar entre os seis primeiros e garantir vaga na Libertadores.';
  const promo=(typeof DIVISION_PROMO!=='undefined'&&DIVISION_PROMO[o.division])||4;
  return `Terminar entre os ${promo} primeiros e conquistar o acesso.`;
}
/* recorte da tabela em volta da posição do usuário — é a campanha DELE que motivou o convite,
   então a tela mostra exatamente isso, com as mesmas faixas de zona do ranking. */
function jobInviteTableHTML(){
  const tbl=sortedTable(); const myPos=tablePos(CL.clubId);
  if(!tbl.length || !myPos) return '';
  const ini=Math.max(0, Math.min(myPos-4, tbl.length-6));
  const linhas=tbl.slice(ini, ini+6).map((t,i)=>{
    const pos=ini+i+1, c=clubOf(t.id)||{short:t.id}, eu=t.id===CL.clubId;
    const zona=(typeof qualificationZone==='function')?qualificationZone(S.division,pos):null;
    const borda = zona==='lib' ? '#0e7a3c' : zona==='sul' ? '#b8860b' : 'transparent';
    return `<div class="cl-jobinv-row ${eu?'me':''}" style="border-left-color:${borda}">
      <span class="cl-jobinv-pos">${pos}</span><span class="cl-jobinv-club">${escC(c.short)}</span>
      <span class="cl-jobinv-n">${t.Pts}</span><span class="cl-jobinv-n">${t.P}</span></div>`;
  }).join('');
  return `<div class="cl-jobinv-head"><span>#</span><span>CLUBE</span><span>P</span><span>J</span></div>${linhas}`;
}
function showJobInvite(offer){
  CL._jobOffer=offer;
  // MODAL PORTADO (telas/Modal - Convite para Jantar). O desenho antigo não
  // é mais alcançável — a tela nova cobre o caso do treinador empregado e o
  // do demitido, e é ela que vale.
  overlayC(rfModalConviteHTML(offer)); return;
  const c=jobOfferClub(offer), me=clubOf(CL.clubId)||{short:'?'};
  const flag=offer.foreign && typeof flagImg==='function' ? flagImg(offer.country)+' ' : '';
  // SEM CLUBE (demitido na Resenha, esperando convite): a tela toda partia do princípio de que
  // existe um clube atual — mostrava a tabela em volta da "minha" posição e dizia que eu sigo no
  // meu clube até decidir. Pro demitido isso é a posição do clube que acabou de demiti-lo.
  const semClube = !!(typeof CL!=='undefined' && CL.unemployed);
  const myPos=semClube?0:tablePos(CL.clubId);
  const exterior = offer.foreign
    ? `<div style="margin-top:8px">✈️ É um convite pra dirigir <strong style="color:#fff">fora do país</strong>, na ${flag}<strong style="color:#fff">${escC(offer.country)}</strong>. Sua liga atual passa a rodar em segundo plano.</div>` : '';
  overlayC(dlg(`Convite — ${c.short}`, `
    <div class="cl-jobinv">
      <div class="cl-jobinv-hd">
        <span class="cl-welc-stripe" style="${clubStripe(c)}">${escC(c.short)}</span>
        <div class="cl-jobinv-h1">Um convite para jantar.</div>
      </div>

      <div class="cl-jobinv-media">
        <div>
          <div class="cl-welc-frame cl-jobinv-video">
            <video src="video/convite-jantar.mp4" autoplay muted loop playsinline></video>
            <div class="cl-jobinv-vshade"></div>
            <div class="cl-jobinv-vcap">Mesa reservada para as <span style="font-family:var(--mono);font-weight:700">20h30</span> — sexta-feira.</div>
          </div>
          <div class="cl-welc-cap">O presidente do ${escC(c.short)} espera você para conversar.</div>
        </div>
        ${semClube
          ? `<fieldset class="cl-welc-facts cl-jobinv-tabela"><legend>Sua situação</legend>
              <div class="cl-jobinv-note" style="margin-top:0">Você está <strong style="color:var(--yellow)">sem clube</strong> desde a demissão do ${escC((clubOf(CL._firedFrom)||{}).short||'seu último clube')}.<br><br>
              O ${escC(c.short)} tem a vaga aberta na ${escC(jobOfferDivLabel(offer))} e procurou você para a próxima temporada.</div>
            </fieldset>`
          : `<fieldset class="cl-welc-facts cl-jobinv-tabela"><legend>${escC(classifDivName(S.division,S.intlUniverse))} — ${(S.round||0)}ª semana</legend>
              <div class="cl-jobinv-grid">${jobInviteTableHTML()}</div>
              <div class="cl-jobinv-note">${myPos?`Você é <strong style="color:var(--yellow)">${myPos}º</strong> — é essa campanha que chamou a atenção do ${escC(c.short)}.`:''}</div>
            </fieldset>`}
      </div>

      <fieldset class="cl-welc-facts"><legend>Recado do seu empresário</legend>
        <div class="cl-jobinv-recado">
          <div>O presidente do <strong style="color:#fff">${escC(c.name||c.short)}</strong> (${flag}${escC(jobOfferDivLabel(offer))}) pediu para falar com você pessoalmente. ${semClube?'Ele acompanhou o seu trabalho e quer conversar num jantar, sem compromisso.':`Ele acompanha o seu trabalho no ${escC(me.short)} e quer conversar num jantar, sem compromisso.`}</div>
          <div>Não há proposta na mesa — por enquanto é só uma conversa. Aceitar o convite não obriga você a nada.</div>
          ${exterior}
        </div>
      </fieldset>

      <div class="cl-welc-actions">
        <div class="cl-welc-hint">${semClube?'Recusar mantém você sem clube, esperando outro convite.':`Você segue como treinador do ${escC(me.short)} até decidir.`}</div>
        ${btn('Aceitar o jantar','clJobInviteAccept()',{icon:'🍽',cls:'cl-btn-ok'})}
        ${btn('Recusar convite','clJobInviteDecline()',{icon:'✖',cls:'cl-btn-cancel'})}
      </div>
    </div>`, {w:900, bodyClass:'cl-body-green'}));
}
function clJobInviteAccept(){
  /* guarda a oferta em mesa: o fluxo tem duas telas (jantar -> proposta) e o `CL._jobOffer` e
     limpo pelo caminho. Ver clAcceptResenhaOffer, que a usa como rede. */
  CL._ofertaEmMesa=CL._jobOffer||CL._ofertaEmMesa||null;
  clCloseOverlay(); showJobProposal();
}
function clJobInviteDecline(){ showJobDeclined('Você agradeceu o convite e seguiu em frente.'); }
function showJobProposal(){
  /* a mesa e a rede: entre as duas telas qualquer redesenho/sincronia pode limpar CL._jobOffer */
  const o=CL._jobOffer||CL._ofertaEmMesa||CL._pendingResenhaOffer; if(!o) return;
  CL._jobOffer=o;
  // MODAL PORTADO (telas/Modal - Jantar e Proposta)
  overlayC(rfModalPropostaHTML(o)); return;
  const c=jobOfferClub(o), me=clubOf(CL.clubId)||{short:'?'};
  const semClube = !!(typeof CL!=='undefined' && CL.unemployed);   // ver showJobInvite
  // Termos REAIS do save onde existem: o salário é o que a oferta carrega e o que passa a valer
  // ao aceitar (S.coachSalary), e a verba é o caixa de verdade do clube que está contratando
  // (S.budgets). Sem inventar número que o jogo não vá honrar depois.
  const verba=(S.budgets&&S.budgets[o.clubId])||0;
  const premio=Math.round((o.salary||0)*6);   // prêmio por objetivo ~ 6 semanas de salário
  overlayC(dlg(`Jantar com a diretoria — ${c.short}`, `
    <div class="cl-jobinv">
      <div class="cl-welc-hd">
        <div>
          <div class="cl-welc-h1">A conversa virou proposta.</div>
          <div class="cl-welc-sub">Entre a cerveja e a sobremesa, o contrato apareceu na mesa.</div>
        </div>
        <div class="cl-welc-badge">${clubCrestHTML(c)}<span class="cl-welc-stripe" style="${clubStripe(c)}">${escC(c.short)}</span></div>
      </div>

      <div class="cl-jobinv-media">
        <div>
          <div class="cl-welc-frame cl-jobinv-video">
            <video src="video/convite-assinatura.mp4" autoplay muted loop playsinline></video>
          </div>
          <div class="cl-welc-cap">Presidente e treinador lendo o contrato no restaurante.</div>
        </div>
        <fieldset class="cl-welc-facts"><legend>Os termos</legend>
          <div class="cl-jobterm"><span>Salário</span><b class="cl-jobterm-hl">${fmt(o.salary||0)}/sem</b></div>
          ${S.coachSalary ? `<div class="cl-jobterm"><span>Hoje você ganha</span><b>${fmt(S.coachSalary)}/sem</b></div>` : ''}
          <div class="cl-jobterm"><span>Prêmio por objetivo</span><b class="cl-jobterm-hl">${fmt(premio)}</b></div>
          ${verba>0?`<div class="cl-jobterm"><span>Caixa do clube</span><b>${fmt(verba)}</b></div>`:''}
          <div class="cl-jobterm"><span>Divisão</span><b>${escC(jobOfferDivLabel(o))}</b></div>
          <div class="cl-jobobj">
            <div class="cl-jobobj-lbl">🎯 OBJETIVO PRINCIPAL</div>
            <div class="cl-jobobj-txt">${escC(jobOfferObjective(o))}</div>
          </div>
        </fieldset>
      </div>

      <div class="cl-welc-quote">
        <div class="cl-welc-quote-lbl">💬 O PRESIDENTE DO ${escC(String(c.short).toUpperCase())}</div>
        <div class="cl-welc-quote-txt">${semClube
          ? '"Sei que a sua saída não foi por falta de trabalho. Aqui você tem estrutura, torcida e uma diretoria que não muda de treinador a cada três jogos. Leia com calma, mas responda hoje."'
          : `"Vi o que você fez no ${escC(me.short)} com o elenco que tinha. Aqui você tem estrutura, torcida e uma diretoria que não muda de treinador a cada três jogos. Leia com calma, mas responda hoje."`}</div>
      </div>

      <div class="cl-welc-actions">
        <div class="cl-welc-hint">${semClube
          ? 'Recusar encerra a conversa e você continua sem clube.'
          : (o._resenha
             ? `Aceitar significa deixar o ${escC(me.short)} agora — a próxima troca de clube só depois de duas temporadas.`
             : `Recusar encerra a conversa. O ${escC(me.short)} continua com você.`)}</div>
        ${btn('Aceitar oferta','clJobProposalAccept()',{icon:'✔',cls:'cl-btn-ok'})}
        ${btn('Recusar oferta','clJobProposalDecline()',{icon:'✖',cls:'cl-btn-cancel'})}
      </div>
    </div>`, {w:900, bodyClass:'cl-body-green'}));
}
function clJobProposalDecline(){ showJobDeclined('Você agradeceu, recusou a proposta e voltou para o vestiário.'); }
function showJobDeclined(msg){
  const o=CL._jobOffer; const c=o?jobOfferClub(o):{short:'o clube'};
  const me=clubOf(CL.clubId)||{short:'seu clube'};
  const semClube = !!(typeof CL!=='undefined' && CL.unemployed);
  CL._jobOffer=null;
  // Resenha: recusar também limpa a pendência da sala (e o demitido volta pra fila de convites)
  if(o && o._resenha){ CL._pendingResenhaOffer=null; if(CL.unemployed) CL._unempRounds=0; }
  CL._ofertaEmMesa=null;   // recusou: a mesa fica limpa (ver clAcceptResenhaOffer)
  /* recusar tira o convite da caixa: ele nao pode ficar na pagina Treinador depois de recusado */
  if(o && o.clubId && Array.isArray(S.pendingJobOffers))
    S.pendingJobOffers=S.pendingJobOffers.filter(x=>x.clubId!==o.clubId);
  if(typeof persistCareer==='function') persistCareer();
  overlayC(dlg('Convite recusado', `<div class="cl-res">
    <div class="cl-res-verd" style="text-align:left">✓ ${escC(msg)} O ${escC(c.short)} foi informado${semClube?' e você segue sem clube, esperando outro convite.':` e você continua no comando do ${escC(me.short)}.`}</div>
    <div class="cl-cal-ok">${btn('Voltar ao jogo','clCloseOverlay()',{icon:'↩',cls:'cl-btn-ok'})}</div>
  </div>`, {w:460, bodyClass:'cl-body-gray'}));
}
/* aceitou de verdade: troca o clube e cai na tela de boas-vindas em variante de meio de
   temporada. Mesmo efeito do antigo clAcceptJobOffer — o que muda é só o caminho até aqui. */
function clJobProposalAccept(){
  /* ===== ASSINAR NUNCA MORRE EM SILENCIO =====
     `CL._jobOffer` vive so em memoria e qualquer redesenho entre o jantar e a assinatura pode
     limpa-lo; o clique entao devolvia NADA — o modal ficava aberto e "o aceitar nao funcionava"
     (relatado a 20/08). A mesa e a pendencia da sala servem de rede; sem nenhuma das tres, o
     jogador ouve o que houve em vez do silencio. */
  const o=CL._jobOffer||CL._ofertaEmMesa||CL._pendingResenhaOffer;
  if(!o){ toastC('Esse convite expirou. Ele continua na página Treinador enquanto valer.','warn'); clCloseOverlay(); return; }
  // RESENHA: assumir o clube é uma troca de ASSENTO no servidor (NET.setMyClub), não a troca
  // local do solo — applyManagerJobChange aqui deixaria o cliente com um clube que a sala não
  // reconhece. clAcceptResenhaOffer já faz tudo (assento, humanos, XI, carreira, cooldown).
  if(o._resenha){ CL._jobOffer=null; clAcceptResenhaOffer(); return; }
  const c=jobOfferClub(o), deOnde=(clubOf(CL.clubId)||{short:''}).short;
  S.coachHistory=S.coachHistory||[];
  S.coachHistory.push({season:S.season, type:'contratado',
    text:`Contratado pelo ${String(c.short).toUpperCase()}${o.foreign?' ('+o.country+')':''}`});
  applyManagerJobChange(o.clubId, o.division, o.country); // country presente => troca de universo
  if(o.salary) S.coachSalary=o.salary;
  /* O DESCANSO ENTRE MUDANÇAS É O MESMO DA RESENHA (ver SONDAGEM_EXTERIOR, no core). Estava
     carimbado só no caminho da sala, então no solo a trava nunca chegava a engatar. Demissão não
     carimba: quem foi despedido escolhe clube na hora e não pode ficar de fora do mercado. */
  S.lastClubChangeSeason=S.season;
  // some da caixa de ofertas pendentes: aceitar por aqui resolve a mesma oferta que está lá
  if(Array.isArray(S.pendingJobOffers)) S.pendingJobOffers=S.pendingJobOffers.filter(x=>x.clubId!==o.clubId);
  CL._jobOffer=null;
  clCloseOverlay(); saveV3();
  showBoasVindas(null, { midSeason:true, fromClub:deOnde });
}

/* ================= FASE 1 · ESCOLHA DE CLUBES POR MANAGER (multi-país) =================
   Cada manager escolhe país + clube (livre). O clube do manager 1 é o que VOCÊ comanda
   ao vivo (universo primário) hoje; os demais ficam registrados como humanos nas suas
   ligas. A Fase 2 torna cada um jogável de verdade a cada rodada sincronizada. */
function startClubsForCountry(country){
  const uniKey = country==='Brasil' ? 'brasil' : country;
  setUniverse(uniKey);
  const div = country==='Brasil' ? computeStartDivision() : DIV_ORDER[DIV_ORDER.length-1];
  return clubsForDivision(div).slice();
}
function buildPickPool(){
  const pool={};
  // as cores viajam junto: a cerimônia do sorteio (scSorteio) pinta a faixa do clube revelado a
  // partir DESTE pool — DATA.clubs ainda é o bundle da Série A quando o sorteio roda.
  /* O ESCUDO TAMBEM VIAJA. Este `map` copiava cinco campos e deixava `crest` para tras, e a
     cerimonia do sorteio desenha o clube SO a partir daqui (DATA.clubs ainda e o bundle da
     Serie A quando ela roda). Sem o campo, clubCrestUrl caia no mapa de escudos da Serie A,
     que nao tem os clubes das divisoes de baixo: no lugar do escudo aparecia a caixa de
     iniciais. O clube da Serie D vinha do Supabase COM escudo — perdia-se aqui, a um passo
     de ser desenhado. */
  selectedPlayableCountries().forEach(c=>{ pool[c]=startClubsForCountry(c).map(x=>({id:x.id,short:x.short,name:x.name,color:x.color,color2:x.color2,crest:x.crest})); });
  setUniverse('brasil'); // reset — clConfirmarClubes/clEntrar seta o universo certo depois
  return pool;
}
function clEscolherClubes(){
  const names=CL.names.map(n=>(n||'').trim()).filter(Boolean);
  if(!names.length){ CL.names[0]='JOGADOR'; return cdraw(); }
  toastC('Carregando clubes...');
  (async ()=>{
    // pré-carrega do Supabase a divisão inicial de CADA país jogável (Brasil B/C/D E Europa),
    // pra o pick pool já usar os clubes reais; fallback = bundle/procedural.
    if(typeof NET!=='undefined' && NET.getDivisionClubs && NET.authStatus && NET.authStatus().loggedIn){
      for(const c of selectedPlayableCountries()){
        const uk=c==='Brasil'?'brasil':c; const cfg=UNI_CONFIGS[uk]; if(!cfg) continue;
        const sd = c==='Brasil' ? computeStartDivision() : cfg.order[cfg.order.length-1];
        if(c==='Brasil' && sd==='A') continue; // Série A vem do bundle
        try{ await loadRealDivisionClubs(sd); }catch(e){}
      }
    }
    CL._pickPool = buildPickPool();
    const countries = selectedPlayableCountries();
    CL.pick = names.map(nm=>({ name:nm, country:countries[0]||'Brasil', clubId:null }));
    CL.screen='escolhaclubes'; cdraw();
  })().catch(err=>{ console.error(err); toastC('⚠ Erro ao carregar clubes.'); });
}
/* ---- 3/4 · ESCOLHA OS CLUBES ---- */
function scEscolhaClubes(){
  // TELA PORTADA (telas/Fluxo - Escolha dos Clubes)
  return rfClubesHTML();
}

/* atribui aleatoriamente um clube livre a cada manager (respeita o país escolhido) */
function _assignRandomClubs(){
  const taken=new Set();
  (CL.pick||[]).forEach(p=>{ const pool=((CL._pickPool||{})[p.country]||[]).filter(c=>!taken.has(c.id));
    if(pool.length){ const pk=pool[Math.floor(Math.random()*pool.length)]; p.clubId=pk.id; taken.add(pk.id); } });
}
function clSortearPick(){ _assignRandomClubs(); cdraw(); }
/* ===== MODO TESTE (só quem entrou por /?acesso=...) =====
   O testador ESCOLHE o próprio clube e pula o sorteio: o clube escolhido vai
   para o manager 1, os demais managers recebem clube aleatório, e o jogo parte
   direto para o loading — sem cerimônia. Jogador comum nunca vê esta porta. */
function rfTesteAcesso(){ try{ return localStorage.getItem('rf_acesso_teste')==='1'; }catch(e){ return false; } }
function rfTesteComecar(){
  if(!rfTesteAcesso()) return;
  const alvo=CL.pickTeste;
  if(!alvo){ toastC('Escolha o clube de teste primeiro.'); return; }
  /* o <select> devolve STRING; o mundo compara ids com o tipo original (número
     para os clubes do bundle). Resolve o clube no pool e usa o id NATIVO —
     senão o newGame não acha o clube e o sorteio "vence" de novo. */
  const pool0=((CL._pickPool||{})[(CL.pick&&CL.pick[0]&&CL.pick[0].country)||'Brasil']||[]);
  const clubeAlvo=pool0.find(c=>String(c.id)===String(alvo));
  if(!clubeAlvo){ toastC('Clube de teste não encontrado no pote — sorteie normalmente.'); return; }
  const idAlvo=clubeAlvo.id;
  const taken=new Set([String(idAlvo)]);
  (CL.pick||[]).forEach((p,i)=>{
    if(i===0){ p.clubId=idAlvo; return; }
    const pool=((CL._pickPool||{})[p.country]||[]).filter(c=>!taken.has(String(c.id)));
    if(pool.length){ const pk=pool[Math.floor(Math.random()*pool.length)]; p.clubId=pk.id; taken.add(String(pk.id)); }
  });
  clStartGame();
}
/* clubes -> loading (4/4) -> lança o jogo. Começar (1 jogador, clubes escolhidos) */
function clStartGame(){ if(!(CL.pick||[]).length || !CL.pick.every(p=>p.clubId)) return; CL._pendingLaunch=clConfirmarClubes; CL.screen='loading'; cdraw(); }
/* multi-jogador: sorteia os times, MOSTRA o sorteio e só então começa */
function clSortearStart(){ _assignRandomClubs(); startSoloDraw(); }
/* ===== SORTEIO DOS CLUBES NO SOLO =====
   O modo solo pulava direto do "Sortear e começar" pras boas-vindas: o clube simplesmente
   aparecia, sem o momento de descobrir qual saiu. A Resenha já tinha essa cerimônia
   (startResenhaDraw/scResenhaDraw em net/local-transport.js) e ela é metade da graça do sorteio.
   Aqui é a mesma cerimônia, com o mesmo desenho e o mesmo ritmo, sobre o estado local (CL.pick).
   No fim segue o caminho de sempre: loading -> clConfirmarClubes -> boas-vindas com vídeo. */
function startSoloDraw(){
  const list=(CL.pick||[]).filter(p=>p&&p.clubId).map(p=>({name:p.name||'Treinador', clubId:p.clubId}));
  if(!list.length){ CL._pendingLaunch=clConfirmarClubes; CL.screen='loading'; cdraw(); return; }
  if(CL._soloDrawTimer){ clearTimeout(CL._soloDrawTimer); CL._soloDrawTimer=null; }
  // DE ONDE SAI O CLUBE REVELADO. A cerimônia roda ANTES de newGame(): S ainda é null e
  // DATA.clubs ainda é o bundle da Série A, então clubOf() não acha quem foi sorteado numa
  // divisão de baixo ou noutro país. O pool do sorteio (CL._pickPool, montado por país em
  // buildPickPool) é a fonte certa — mesma solução da cerimônia da Resenha, que já leva o
  // poolById dela. Sem isto o desenho estourava na PRIMEIRA revelação e a cerimônia congelava
  // em "Sorteando os clubes…" pra sempre.
  const poolById={};
  Object.values(CL._pickPool||{}).forEach(arr=>(arr||[]).forEach(c=>{ poolById[c.id]=c; }));
  CL.soloDraw={ list, idx:0, done:false, poolById };
  CL.screen='sorteio'; cdraw();
  CL._soloDrawTimer=setTimeout(soloDrawTick, 700);   // respiro antes do primeiro nome
}
function soloDrawTick(){
  const d=CL.soloDraw; if(!d) return;
  // O PRÓXIMO PASSO É ARMADO ANTES DO DESENHO: se a linha de um clube falhar ao renderizar, a
  // cerimônia segue em frente em vez de congelar (era o que travava o sorteio do solo — o
  // cdraw() estourava e levava junto o setTimeout que vinha depois dele).
  if(d.idx>=d.list.length){
    d.done=true;
    CL._soloDrawTimer=setTimeout(()=>{ CL.soloDraw=null; CL._pendingLaunch=clConfirmarClubes; CL.screen='loading'; cdraw(); }, 1600);
    cdraw();
    return;
  }
  d.idx++;
  CL._soloDrawTimer=setTimeout(soloDrawTick, 2000);
  cdraw();
}
function clPickCountry(i,c){ if(!CL.pick[i])return; CL.pick[i].country=c; CL.pick[i].clubId=null; cdraw(); }
function clPickClub(i,id){ if(!CL.pick[i])return; CL.pick[i].clubId=id||null; cdraw(); }
function clGoJogadores(){ CL.screen='jogadores'; cdraw(); }
function clConfirmarClubes(){
  if(!(CL.pick||[]).length || !CL.pick.every(p=>p.clubId)) return;
  CL.draw=CL.pick.map(p=>({name:p.name, clubId:p.clubId, country:p.country}));
  // FASE 2: o assento PRIMÁRIO (universo completo, com copas) tem que ser um manager do Brasil
  // se houver algum — o Brasil não é suportado como liga de background, então precisa ser o
  // universo-base; os demais países viram ligas de fundo (já suportadas). Cobre o caso
  // "Flamengo + Inter + Bayern + City": Flamengo comanda o universo, o resto joga no fundo.
  const bi=CL.draw.findIndex(d=>d.country==='Brasil');
  if(bi>0){ const [b]=CL.draw.splice(bi,1); CL.draw.unshift(b); }
  const uni=CL.draw[0].country;
  CL.playCountry=uni;
  if(uni==='Brasil'){ setUniverse('brasil'); CL.intlUniverse=false; DATA.clubs=clubsForDivision(computeStartDivision()); }
  else { setUniverse(uni); CL.intlUniverse=uni; DATA.clubs=clubsForDivision(DIV_ORDER[DIV_ORDER.length-1]).slice(); }
  CL.bgCountries=selectedPlayableCountries().filter(c=>c!==uni);
  clEntrar();
}

/* ================= FASE 2 · HOTSEAT MULTI-HUMANO (rodadas sincronizadas 1 a 1) =================
   Cada humano (além do manager 1) joga a SUA partida ao vivo a cada rodada, passando o
   aparelho. Humanos no país primário jogam na divisão do usuário; humanos de outros países
   jogam na liga de fundo daquele país (clube materializado com elenco real). Os resultados
   entram nas tabelas certas via playRound()/advanceBgLeagues(). Nada disso roda quando só
   existe 1 humano — o caminho de 1 país fica idêntico. */
function primaryCountry(){ return S.intlUniverse || 'Brasil'; }
/* país (universo) onde o clube de um assento joga: primário (tabela do usuário / outras
   divisões do universo) ou uma liga de background. */
function seatCountryOfClub(cid){
  if(S.table && S.table[cid]) return primaryCountry();
  if(S.otherDivs){ for(const d in S.otherDivs){ const od=S.otherDivs[d]; if(od.clubs && od.clubs.find(x=>x.id===cid)) return primaryCountry(); } }
  const bg=S.bgLeagues||{}; for(const c in bg){ for(const d in bg[c].divs){ if((bg[c].divs[d].clubIds||[]).indexOf(cid)>=0) return c; } }
  return primaryCountry();
}
/* assentos humanos que NÃO são o manager 1 (o que este aparelho comanda por padrão) */
function secondaryHumanSeats(){
  const out=[]; const H=CL.humans||{};
  Object.keys(H).forEach(cid=>{ if(cid===String(CL.clubId)) return;
    out.push({ clubId:cid, name:H[cid], country:seatCountryOfClub(cid) }); });
  return out;
}
function hasSecondaryHumans(){ return !CL.online && secondaryHumanSeats().length>0; }
/* localiza a partida de um assento humano NESTA rodada. Retorna {kind,country,div,home,away,seed}
   ou null (folga / divisão não hand-jogável nesta fase). */
function secondaryHumanFixtureThisRound(cid){
  const country=seatCountryOfClub(cid);
  if(country===primaryCountry()){
    if(S.table && S.table[cid]){ // divisão do usuário
      const fx=(S.sched[S.round]||[]).find(([h,a])=>h===cid||a===cid);
      if(!fx || fx[0]==null || fx[1]==null) return null;
      return { kind:'primary', country, div:S.division, home:fx[0], away:fx[1], seed:matchSeed(fx[0],fx[1]) };
    }
    return null; // humano numa OUTRA divisão do universo primário: auto nesta fase (raro; só após temporadas)
  }
  const L=(S.bgLeagues||{})[country]; if(!L) return null;
  for(const d in L.divs){ const dd=L.divs[d]; if((dd.clubIds||[]).indexOf(cid)<0) continue;
    if(!dd.sched.length) return null;
    const fx=(dd.sched[S.round % dd.sched.length]||[]).find(p=>p[0]===cid||p[1]===cid);
    if(!fx || fx[0]==null || fx[1]==null) return null; // folga
    return { kind:'bg', country, div:d, home:fx[0], away:fx[1], seed:hashSeed(S.seed,'bghuman',country,d,S.round,fx[0],fx[1]) };
  }
  return null;
}
/* fila de partidas hotseat desta rodada (dedup: uma mesma partida entre dois humanos, ou a
   do manager 1, entra só uma vez). */
function buildHumanQueue(uf){
  const seen={}; if(uf) seen[uf[0]+'-'+uf[1]]=1;
  const q=[];
  secondaryHumanSeats().forEach(seat=>{
    const fx=secondaryHumanFixtureThisRound(seat.clubId); if(!fx) return;
    const k=fx.home+'-'+fx.away; if(seen[k]) return; seen[k]=1;
    q.push({ seat, fx });
  });
  return q;
}
/* mostra a tela de "passe o aparelho" pro próximo humano, ou commita a rodada se a fila acabou */
function startNextHotseatMatch(){
  const H=CL._hotseat; if(!H) return;
  if(!H.queue.length){
    CL._postRoundSeats=(H.playedSeats||[]).slice(); // rotação de classificação de pós-jogo
    _commitLeagueRound(H.primaryRL, H.userResult, H.humanResults, H.allEvents, H.audit);
    CL._hotseat=null; CL._handoff=null;
    return;
  }
  CL._handoff=H.queue[0];
  CL.screen='handoff'; cdraw();
}
/* do handoff "Continuar": entra no contexto do assento e mostra a TELA DO TIME dele
   (elenco + tática + classificação), igual ao manager 1 — daí ele escolhe a tática e joga. */
function clPlayHotseatMatch(){
  const H=CL._hotseat, item=CL._handoff; if(!H||!item) return;
  H.queue=H.queue.slice(1); CL._handoff=null;
  H.playedSeats=(H.playedSeats||[]).concat(item.seat); // pra rotação de classificação pós-rodada
  enterSeatContext(item.seat, item.fx);
  CL.screen='seatturn'; cdraw();
}
/* troca o contexto de "quem eu comando" (engine+UI) pro clube do assento — assim rosterHTML/
   panSeleccao/clJogar/clSelFormation e a partida ao vivo operam sobre o assento. Guarda o
   contexto do manager 1 pra restaurar depois (exitSeatContext). A escolha de tática de cada
   assento persiste entre rodadas em CL.seatStore (igual à do manager, que persiste em S). */
function enterSeatContext(seat, fx){
  const H=CL._hotseat;
  ensureBgClubMaterialized(fx.home); ensureBgClubMaterialized(fx.away);
  H._prev={ clubId:S.clubId, xi:(S.xi||[]).slice(), tactic:S.tactic, formation:CL.formation,
    tacticChosen:CL.tacticChosen, selPlayer:CL.selPlayer, tab:CL.tab };
  CL._seatContext={ seat, fx };
  const st=(CL.seatStore&&CL.seatStore[seat.clubId])||null;
  S.clubId=seat.clubId; CL.clubId=seat.clubId;
  if(st){ S.xi=(st.xi||[]).slice(); CL.formation=st.formation; S.tactic=st.tactic||'equilibrado'; CL.tacticChosen=true; }
  else { S.xi=autoXI(seat.clubId); CL.formation=null; S.tactic='equilibrado'; CL.tacticChosen=false; }
  fixUserXIAvailability();
  CL.selPlayer=squad(seat.clubId)[0]?.pid||null; CL.tab='seleccao';
  CL.subsUsed=0; CL.liveDivOpen=null;
}
function exitSeatContext(){
  const H=CL._hotseat, seat=CL._seatContext&&CL._seatContext.seat;
  if(seat){ CL.seatStore=CL.seatStore||{}; CL.seatStore[seat.clubId]={ xi:(S.xi||[]).slice(), formation:CL.formation, tactic:S.tactic }; }
  const p=H&&H._prev;
  if(p){ S.clubId=p.clubId; CL.clubId=p.clubId; S.xi=p.xi; S.tactic=p.tactic; CL.formation=p.formation;
    CL.tacticChosen=p.tacticChosen; CL.selPlayer=p.selPlayer; CL.tab=p.tab; }
  CL._seatContext=null;
}
/* "Jogar partida" na tela do assento -> inicia a partida ao vivo dele (contexto já é o do assento) */
function clSeatPlay(){
  const c=CL._seatContext; if(!c) return;
  const xi=xiPlayers(CL.clubId); if(!(xi.length>=11 && CL.tacticChosen)){ toastC('Escolha a tática primeiro.'); return; }
  const fx=c.fx;
  CL.subsUsed=0; CL.liveDivOpen=null;
  const m=buildLiveMatchObject(fx.home,fx.away,fx.seed,{user:true, div:fx.div});
  const RL={ jornada:S.round+1, minute:0, half:1, done:false, sel:null, subOpen:false, matches:[m], humanSeat:{seat:c.seat,fx} };
  RL.maxMin=Math.max(94, m.events.length?m.events[m.events.length-1].min:90);
  CL.live=RL; camKickoffLine(RL); CL.screen='live'; cdraw(); CL._liveTimer=setTimeout(liveTick,650);
}
function finishHotseatMatch(){
  const RL=CL.live, m=RL.matches[0], H=CL._hotseat;
  const scorers=m.events.filter(e=>e.type==='gol'||(e.type==='penalti'&&e.scored)).map(e=>({name:e.scorer,id:e.team}));
  if(H){ H.humanResults[m.h+'-'+m.a]={hg:m.hg,ag:m.ag,perf:m.perf,scorers,events:m.events,
    caps:{H:liveCaps(m,'H'),A:liveCaps(m,'A')}, matchMinutes:liveMatchMinutes(m)};
    H.allEvents=(H.allEvents||[]).concat(m.events||[]); }
  CL.live=null; CL.subsUsed=0;
  // TELA PORTADA (telas/Resenha - Entrega do Aparelho): antes de chamar o próximo
  // assento, quem acabou de jogar vê o que aconteceu na vez dele e devolve o
  // aparelho. Sem isso a tela pulava direto pro "passe para o próximo", e o
  // jogador saía da partida sem ler o próprio resultado.
  const seat=CL._seatContext&&CL._seatContext.seat;
  if(seat){
    const emCasa=m.h===seat.clubId;
    const outro=(anyClubOf(emCasa?m.a:m.h)||{short:'—'}).short;
    /* O pacote pede POSIÇÃO no quarto bloco, e é a informação que interessa a
       quem acabou de jogar. Mas `tablePos` lê a tabela da divisão do UTILIZADOR
       (S.table): num assento de outro país ou de outra divisão ela não diz nada
       sobre este clube. Só entra quando o clube está mesmo nessa tabela; senão
       fica o mando, que é sempre verdade. */
    let pos=null;
    try{ if(typeof tablePos==='function' && (S.table||[]).some(t=>t.id===seat.clubId)){
      const k=tablePos(seat.clubId); if(k>0) pos=k+'º'; } }catch(err){}
    CL._entrega={ nome:seat.name, adv:outro, mando:emCasa?'em casa':'fora', pos:pos,
      placar:(emCasa?m.hg:m.ag)+'–'+(emCasa?m.ag:m.hg), att:emCasa?m.att:0 };
  }
  exitSeatContext(); // restaura o manager 1 (persistindo a tática do assento)
  if(CL._entrega){ CL.screen='entrega'; cdraw(); return; }
  startNextHotseatMatch();
}
/* rótulo da divisão do assento (no universo do país dele) */
function seatDivLabel(seat, fx){ const cfg=UNI_CONFIGS[uniKeyOf(seat.country)]||{}; return (cfg.label&&cfg.label[fx.div])||fx.div; }
/* divisão da liga do assento que contém o clube dele (fundo OU primária) */
function seatDivOfClub(seat){
  const country=seat.country;
  if(S.bgLeagues&&S.bgLeagues[country]){ const divs=S.bgLeagues[country].divs;
    for(const d in divs){ if((divs[d].clubIds||[]).indexOf(seat.clubId)>=0) return d; } return Object.keys(divs)[0]; }
  if(S.table&&S.table[seat.clubId]) return S.division;
  if(S.otherDivs){ for(const d in S.otherDivs){ const od=S.otherDivs[d]; if(od.clubs&&od.clubs.find(x=>x.id===seat.clubId)) return d; } }
  return S.division;
}
/* ---------- PÓS-JOGO AO VIVO (rotação de classificação por humano) ----------
   Ao fim da rodada, o manager 1 vê a classificação (scClassif) e, em seguida, CADA outro
   humano vê a SUA (a mesma tela de pós-jogo, com a liga dele). Igual pra todos. */
function startPostRoundClassifs(seats){
  CL._classifQueue=(seats||[]).slice(); // humanos secundários, mostrados DEPOIS do manager 1
  CL.clsDivOpen=null; showLiveClassif(); // manager 1 primeiro (screen='classif')
}
function postRoundClassifNext(){
  if(CL._classifTimer){ clearTimeout(CL._classifTimer); CL._classifTimer=null; }
  const q=CL._classifQueue;
  if(!q || !q.length){ CL._classifQueue=null; CL._classifSeat=null; liveDone(); return; }
  CL._classifSeat=q[0]; CL._classifQueue=q.slice(1);
  CL.clsDivOpen=null; CL.screen='seatclassif'; cdraw(); armClassifTimer();
}
/* "Continuar"/auto-avanço da tela de classificação: se há rotação ativa, vai pro próximo
   humano; senão, volta pra tela principal do manager 1 (comportamento original). */
function clClassifContinue(){
  if(CL._classifQueue!=null){ postRoundClassifNext(); return; }
  liveDone();
}
/* classificação de pós-jogo de um HUMANO secundário — mesma tela do manager 1 (scClassif),
   só que com a liga do assento (fundo OU divisão primária, se mesmo país) e o clube dele em destaque. */
function scSeatClassif(){
  // TELA PORTADA (telas/Resenha - Classificacao do Assento)
  return rfAssentoClassifHTML(CL._classifSeat);
}

/* TELA DO TIME do assento (hotseat): mesma pegada da tela principal — elenco à esquerda,
   tática + classificação + Jogar à direita. Reusa rosterHTML()/panSeleccao() com o contexto
   já trocado pro assento (clJogar detecta o contexto e chama clSeatPlay).
   MESMO menu (☰) e MESMAS abas de scMain() — antes só dava pra escalar e jogar aqui; qualquer
   outra função (mercado, finanças, e-mail, estádio, copas etc.) ficava travada pro manager 1,
   que é o único que passa por scMain(). Todo assento tem os mesmos direitos durante a própria
   vez — enterSeatContext() já troca S.clubId/CL.clubId pro clube do assento, então os mesmos
   painéis/menus de scMain() funcionam aqui sem mudança nenhuma neles. */
/* MORTO desde que 'seatturn' passou a desenhar o mesmo envelope do manager 1
   (ver o switch de cdraw). Fica só como referência do que a tela mostrava. */
function scSeatTurnLegado(){
  const c=CL._seatContext; if(!c) return deskWrap('');
  const seat=c.seat, fx=c.fx; const cl=clubOf(seat.clubId)||bgClubById(seat.clubId)||{};
  const oppId=fx.home===seat.clubId?fx.away:fx.home; const opp=clubOf(oppId)||bgClubById(oppId)||{};
  const home=fx.home===seat.clubId; const flag=(typeof flagImg==='function')?flagImg(seat.country):'';
  const th=clubTheme(seat.clubId);
  const menuNames=['RetroFoot98','Formação','Equipa','Jogador','Campeonatos','Treinador'];
  const hamburger=`<div class="cl-hamburger ${CL.mobMenuOpen?'open':''}" onclick="clToggleMobMenu(event)" role="button" aria-expanded="${CL.mobMenuOpen?'true':'false'}">
    <span class="cl-ham-ico" aria-hidden="true">${CL.mobMenuOpen?'✕':'☰'}</span>
    <span class="cl-ham-t">${CL.mobMenuOpen?'Fechar':'Menu'}</span></div>`;
  // no telefone o menu é uma GAVETA que entra pela esquerda: o véu escurece o conteúdo (e fecha
  // ao toque, via handler global) e o clique dentro da gaveta não borbulha, pra tocar em espaço
  // vazio dela não fechar. No desktop nada disso aparece — segue a barra horizontal de sempre.
  const menu=`${CL.mobMenuOpen?'<div class="cl-menu-scrim"></div>':''}<div class="cl-menu ${CL.mobMenuOpen?'mob-open':''}" id="cl-menubar" onclick="event.stopPropagation()">
    <div class="cl-menu-hd"><span class="cl-menu-hd-t">Menu</span><button class="cl-menu-x" type="button" onclick="closeMobMenu()" aria-label="Fechar menu">✕</button></div>
    ${menuNames.map(mm=>`<span class="cl-menu-i ${CL.menu===mm?'open':''}" onclick="clMenu('${mm}',event)">${mm}${CL.menu===mm?menuDropdown(mm):''}</span>`).join('')}
    ${menuSairHTML()}
  </div>`;
  if(typeof syncInbox==='function') syncInbox();
  const unread=(typeof inboxUnread==='function')?inboxUnread():0;
  const mailBadge=unread>0?`<span class="cl-count-badge">${unread>9?'9+':unread}</span>`:'';
  const tabs=['jogo','elenco','jogador','financas','seleccao','correio','adversario'];
  const tabLbl={jogo:'Jogo',elenco:'Elenco',jogador:'Jogador',financas:'Finanças',seleccao:'Formação',correio:'E-mail',adversario:'Adversário'};
  const tabIco={jogo:'📅',elenco:'👥',jogador:'👤',financas:'💰',seleccao:'📋',correio:'✉️',adversario:'🆚'};
  const tabBar=`<div class="cl-tabs">${tabs.map(t=>`<span class="cl-tab cl-tab-${t} ${CL.tab===t?'on':''}" onclick="clTab('${t}')" title="${escC(tabLbl[t])}" aria-label="${escC(tabLbl[t])}"><span class="cl-tab-ico" aria-hidden="true">${tabIco[t]}</span><span class="cl-tab-lbl">${tabLbl[t]}</span>${t==='correio'?mailBadge:''}</span>`).join('')
    +`<span class="cl-tab cl-tab-play" onclick="clTabJogar()" title="Jogar" aria-label="Jogar"><span class="cl-tab-ico" aria-hidden="true">⚽</span><span class="cl-tab-lbl">Jogar</span></span>`}</div>`;
  const ufArr=[fx.home,fx.away];   // panJogo espera [homeId,awayId], igual ao formato de userFixture()
  let panel='';
  if(CL.tab==='jogo') panel=panJogo(oppId,home,ufArr);
  else if(CL.tab==='jogador') panel=panJogador();
  else if(CL.tab==='financas') panel=panFinancas();
  else if(CL.tab==='seleccao') panel=panSeleccao();
  else if(CL.tab==='correio') panel=panCorreio();
  else panel=panAdversario(oppId);
  return `<div class="cl-main" style="border-color:${th.col}">
    <div class="cl-main-top">${flag} ${escC(seat.name)} · ${escC(cl.short||'')}</div>
    <div class="cl-mobmenu-wrap">${hamburger}${menu}</div>
    <div class="cl-main-body" style="background:${th.bg}">
      <div class="cl-main-left" style="background:${th.bg}">
        <div class="cl-hdr"><div class="cl-mgr">${escC(seat.name)}</div>
          <div class="cl-hdr-sub"><span class="cl-flag2">${flag}</span> ${escC(seat.country)} <span class="cl-div">${escC(seatDivLabel(seat,fx))}</span></div></div>
        <div class="cl-roster-hd cl-acc-hd"><span>Elenco</span></div>
        <div class="cl-roster cl-acc-body">${rosterHTML()}</div>
      </div>
      <div class="cl-main-right ${ADV_HDR_TABS[CL.tab]?'':'sem-adv'}" style="background:${th.bg}">
        ${advHeaderHTML({nome:opp.short||'—', home, comp:divisionLabel(), fase:((S.round||0)+1)+'ª Semana', season:S.season, chip:th.bg2})}
        <div class="cl-panel">${panel}</div>
        ${tabBar}
      </div>
    </div>
  </div>`;
}
/* tela de passagem de aparelho (hotseat) entre os treinadores humanos */
function scHandoff(){
  // TELA PORTADA (telas/Resenha - Passe o Aparelho)
  return rfPasseHTML(CL._handoff);
}


/* ================= SAVE / LOAD (Modo Solo — só nuvem via Supabase) =================
   Salva/carrega por nome, vinculado ao usuário logado. O estado do jogo NUNCA fica
   no localStorage — sempre no Supabase (tabela elifoot_v3.solo_saves).
   `explicit=true` mostra a barra de "Gravando..." e o toast de resultado (usado no
   menu "Gravar jogo"); os auto-saves de fim de rodada continuam totalmente silenciosos
   (nem toast, nem barra — só tentam gravar em segundo plano, sem incomodar o jogador).
   Em modo online (Resenha) o save é o da sala (NET.saveGame), então aqui é no-op.
   Antes disso era "fire and forget" (nunca esperado por quem chamava) — o menu fechava
   e redesenhava a tela na hora, sem mostrar NADA enquanto a gravação de verdade ainda
   estava em andamento, e o erro real (sessão expirada, timeout de rede num save grande,
   etc.) era engolido num console.warn — o jogador só via um aviso genérico sem saber
   por quê. Agora é de verdade assíncrono/esperado, mostra progresso real (indeterminado,
   já que não dá pra saber % de upload) e tenta dar uma pista honesta do motivo do erro. */
async function saveV3(explicit){
  if(CL._seatContext) return; // hotseat: contexto trocado pro assento — NÃO persistir (seria salvo com o clube errado como primário)
  if(CL.online) return; // online usa o save da sala (host-autoritativo), não o solo
  const name = CL.save||CL.mgr||'SAVE';
  // identidade do clube junto do save: é o que a lista de saves mostra sem baixar o estado
  // inteiro (clubShort/clubCrest via state->>, ver netListSoloSaves)
  const _c=(typeof clubOf==='function'&&clubOf(CL.clubId))||{};
  const payload = { ts:Date.now(), mgr:CL.mgr, clubId:CL.clubId,
    clubShort:_c.short||_c.name||null,
    clubCrest:(typeof clubCrestUrl==='function'?clubCrestUrl(_c):null)||null,
    currency:CL.currency, ticket:CL.ticket, humans:CL.humans, S };
  if(typeof NET==='undefined' || !NET.saveSoloGame){ if(explicit&&typeof toastC==='function') toastC('⚠ Sem conexão pra gravar.'); return; }
  let finishSavingOverlay=null;
  if(explicit) finishSavingOverlay=showSavingOverlay();
  try{
    await NET.saveSoloGame(name, payload);
    if(explicit){
      finishSavingOverlay();
      await new Promise(r=>setTimeout(r,350));
      clCloseOverlay(); toastC('✓ Jogo gravado na nuvem.');
    }
  } catch(e){
    console.warn('saveSolo erro:', e);
    /* TETO DE SAVES — ESTE ERRO NAO PODE SER SILENCIOSO. O trigger do banco
       (PLANO_SAVES) recusa a carreira que passa do teto do plano, e os
       auto-saves de fim de rodada sao mudos de proposito: sem este desvio, a
       pessoa jogaria uma temporada inteira sem nada estar a ser gravado e so'
       daria por isso ao voltar no dia seguinte. Aqui a janela abre mesmo sem
       ser um "Gravar" explicito. */
    if(/PLANO_SAVES/.test((e&&e.message)||'') && typeof rfTrava==='function'){
      if(explicit) clCloseOverlay();
      rfTrava('saves'); return;
    }
    if(explicit){
      clCloseOverlay();
      const msg=(e&&e.message)?String(e.message):'';
      const authIssue=/jwt|auth|session|401|403/i.test(msg);
      toastC(authIssue
        ? '⚠ Sessão expirada — faça login novamente pra gravar na nuvem.'
        : '⚠ Não foi possível gravar na nuvem'+(msg?' ('+msg+')':'.')+'.');
    }
  }
}
/* barra de "Gravando..." — visual e animação IDÊNTICOS à barra usada ao criar um save novo
   (scLoading/runLoading: preenchimento sólido crescendo + porcentagem, não a barrinha
   deslizante indeterminada de antes). Como aqui é uma operação de rede de verdade (duração
   desconhecida), a barra sobe do mesmo jeito até travar em 90% — só pula pra 100% quando
   NET.saveSoloGame() realmente terminar (ver finishSavingOverlay), nunca fingindo estar
   pronta antes da hora. */
function showSavingOverlay(){
  overlayC(dlg('', `<div class="cl-loadbar"><div class="cl-loadbar-title">Gravando na nuvem...</div>
    <div class="cl-loadbar-track"><div id="cl-save-fill" class="cl-loadbar-fill" style="width:0%"><span id="cl-save-pct">0%</span></div></div></div>`,
    {w:460,bodyClass:'cl-body-gray',min:true}));
  let p=0;
  const t=setInterval(()=>{ p=Math.min(90, p+Math.floor(8+Math.random()*14));
    const f=$c('#cl-save-fill'), pc=$c('#cl-save-pct'); if(f)f.style.width=p+'%'; if(pc)pc.textContent=p+'%';
    if(p>=90) clearInterval(t); }, 180);
  return function finishSavingOverlay(){
    clearInterval(t);
    const f=$c('#cl-save-fill'), pc=$c('#cl-save-pct'); if(f)f.style.width='100%'; if(pc)pc.textContent='100%';
  };
}
function clLoadSave(name){
  toastC('Carregando jogo','progress');
  (async ()=>{ try {
    const g = (typeof NET!=='undefined'&&NET.loadSoloSave)?await NET.loadSoloSave(name):null;
    if(!g){ toastC('⚠ Save não encontrado.'); return; }
    S=g.S; CL.clubId=g.clubId; CL.mgr=g.mgr; CL.currency=g.currency||'Reais'; CL.ticket=g.ticket||8; CL.humans=g.humans||{};
    CL.save=name; CL.online=false; // jogo solo — nunca herda estado de sala online
    // save de antes da unificação do estádio: migra o valor único S.stadium (aposentado) pro
    // mapa por clube S.clubStadiumCap[clubId] uma única vez, sem perder o progresso de quem já
    // construiu bancadas. Depois desta migração, S.stadium não é mais lido em lugar nenhum.
    if(S.stadium && !(S.clubStadiumCap && S.clubStadiumCap[CL.clubId])){
      S.clubStadiumCap = S.clubStadiumCap || {};
      S.clubStadiumCap[CL.clubId] = {capacity:S.stadium.capacity||STAND_START, builtThisSeason:S.stadium.builtThisSeason||0};
    }
    CL.ticket = ticketPriceForDivision(S.division);
    if(typeof NET!=='undefined'){ NET.isHost=false; NET.gameId=null; NET.onState=null; }
    setUniverse(S.intlUniverse||'brasil'); // restaura a config de divisões do universo do save (Brasil/Inglaterra/...)
    CL.intlUniverse = S.intlUniverse||false;
    /* save quimera (a troca de pais que morreu no meio, ver repararMundoQuimera): reconstrui a
       temporada na liga do clube do treinador antes de desenhar qualquer coisa */
    if(typeof repararMundoQuimera==='function' && repararMundoQuimera()){
      CL.intlUniverse=S.intlUniverse||false;
      toastC('⚠ O save foi reparado: a temporada recomeça na liga do seu clube.');
      if(typeof saveV3==='function') saveV3();
    }
    // temporada fechada antes do S.archive existir: entra pro arquivo agora (idempotente)
    if(typeof archiveBackfill==='function'){ try{ archiveBackfill(); }catch(e){} }
    // save de antes das ligas de fundo cobrirem TODOS os países (item 4): completa agora
    if(typeof ensureBgLeaguesCompletas==='function'){ try{ ensureBgLeaguesCompletas(); }catch(e){} }
    syncDataClubsFromState(); // realinha DATA.clubs com a divisão real do save carregado
    CL.screen='main'; CL.tab='jogo'; CL.selPlayer=squad(CL.clubId)[0]?.pid||null;
    /* ABRIR UM SAVE SEMPRE VOLTA PRA FORMAÇÃO. CL.rf.page (o roteador novo) só muda quando
       CL.tab de fato MUDA de valor (ver rfSyncFromLegacyTab) — e CL.tab já era 'jogo' na
       maioria dos casos, então a linha acima não disparava nada. Quem abria outro save pela
       tela "Sair do jogo" (que lista "Outros saves") ficava PRESO nessa mesma tela depois do
       load, em vez de ir pra Formação (relato do dono, 21/08). rfGo('hub') força a página
       certa sempre, incondicional — CL._posPagina (abaixo) ainda tem a palavra final quando
       existe (é o caminho de reload de página, que deve voltar pra onde a pessoa estava). */
    if(typeof rfGo==='function') rfGo('hub');
    /* volta a pagina onde a pessoa estava antes de recarregar (ver rfPosRestaurar).
       Consumida na hora: so vale para ESTE arranque. */
    if(CL._posPagina){ try{ if(typeof rfGo==='function') rfGo(CL._posPagina); else CL.page=CL._posPagina; }catch(e){} CL._posPagina=''; }
    cdraw();
    // sorteio de copa pode ter ficado pendente de uma sessão anterior (fila em
    // S._pendingDrawShows, ver initSeasonCups/advancePendingCups) — sem isso aqui, o
    // usuário só via o sorteio depois de terminar a PRÓXIMA rodada ao vivo (via
    // finishLiveRound), o que em muitas divisões passava despercebido por rodadas.
    checkPendingCupDraws(()=>{});
  } catch(e){ toastC('⚠ '+(e.message||'erro ao carregar')); } })();
}

/* ================= 08-13 · TELA PRINCIPAL ================= */
function divisionLabelOf(d){ return (typeof DIV_LABEL_FULL!=='undefined'&&DIV_LABEL_FULL[d]) || ({A:'Série A',B:'Série B',C:'Série C',D:'Série D'})[d] || 'Série A'; }
function divisionLabel(){ return divisionLabelOf(S.division); }
/* resolve um clube por id venha de onde vier: divisão do usuário, outra divisão, liga de fundo
   ou clube continental criado sob demanda (adversário de copa pode ser qualquer um destes). */
function anyClubOf(id){
  if(id==null) return null;
  // S é null nas telas ANTES do jogo começar (assistente do solo, cerimônia do sorteio) — sem
  // esta guarda, qualquer tela de pré-jogo que caísse aqui estourava e parava o desenho no meio.
  return clubOf(id)
    || (typeof bgClubById==='function' && bgClubById(id))
    || (S && S.intlClubs && S.intlClubs[id])
    || (S && S.clubPool && S.clubPool[id])
    || null;
}
/* ---- QUAL É O MEU PRÓXIMO JOGO (fonte ÚNICA) ----
   A tela principal lia só userFixture() — a rodada de LIGA — enquanto clJogar dá prioridade à
   partida de COPA pendente. Numa semana de copa o jogador escalava o time olhando o adversário
   do campeonato e o botão Jogar abria outro jogo, contra outro clube, em outra competição.
   Agora a tela e o botão perguntam à MESMA função, então não têm como discordar. */
function nextUserMatch(){
  if(typeof pendingUserCupMatches==='function'){
    const fila=pendingUserCupMatches().filter(c=>typeof cupWasSeen!=='function' || !cupWasSeen(c.key));
    if(fila.length){
      const p=fila[0], home=p.h===CL.clubId;
      const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[p.key])||{short:p.key};
      return { kind:'cup', h:p.h, a:p.a, oppId:home?p.a:p.h, home, cupKey:p.key,
        comp:def.short, fase:(typeof cupPhaseLabelFor==='function')?cupPhaseLabelFor(p):'', pending:p };
    }
  }
  const uf=(typeof userFixture==='function')?userFixture():null;
  if(!uf) return null;
  const home=uf[0]===CL.clubId;
  return { kind:'league', h:uf[0], a:uf[1], oppId:home?uf[1]:uf[0], home, uf,
    comp:(typeof divisionLabel==='function')?divisionLabel():'', fase:`${(S.round||0)+1}ª Semana` };
}
function scMain(){
  const cl=clubOf(CL.clubId);
  const nm=nextUserMatch();
  const uf=(nm&&nm.kind==='league')?nm.uf:null;
  const oppId=nm?nm.oppId:null; const home=nm?nm.home:true;
  const menuNames=['RetroFoot98','Formação','Equipa','Jogador','Campeonatos','Treinador']; if(CL.online) menuNames.push('Modo Resenha');
  const hamburger=`<div class="cl-hamburger ${CL.mobMenuOpen?'open':''}" onclick="clToggleMobMenu(event)" role="button" aria-expanded="${CL.mobMenuOpen?'true':'false'}">
    <span class="cl-ham-ico" aria-hidden="true">${CL.mobMenuOpen?'✕':'☰'}</span>
    <span class="cl-ham-t">${CL.mobMenuOpen?'Fechar':'Menu'}</span></div>`;
  // badge numérico ÚNICO pra todas as notificações da UI (ofertas, e-mails, pedidos de entrada):
  // nada de emoji, só o número (9+ acima de 9). Mesmo padrão em aba e menu.
  const numBadge=n=>(n>0)?`<span class="cl-count-badge">${n>9?'9+':n}</span>`:'';
  const resenhaBadge=(CL.online && typeof NET!=='undefined' && NET.isHost && CL.pendingJoins)?numBadge(CL.pendingJoins.length):''; // pedidos de entrada pendentes
  // o badge de proposta fica SÓ na aba "Jogador" da tela principal — no menu do topo era repetido.
  // no telefone o menu é uma GAVETA que entra pela esquerda: o véu escurece o conteúdo (e fecha
  // ao toque, via handler global) e o clique dentro da gaveta não borbulha, pra tocar em espaço
  // vazio dela não fechar. No desktop nada disso aparece — segue a barra horizontal de sempre.
  const menu=`${CL.mobMenuOpen?'<div class="cl-menu-scrim"></div>':''}<div class="cl-menu ${CL.mobMenuOpen?'mob-open':''}" id="cl-menubar" onclick="event.stopPropagation()">
    <div class="cl-menu-hd"><span class="cl-menu-hd-t">Menu</span><button class="cl-menu-x" type="button" onclick="closeMobMenu()" aria-label="Fechar menu">✕</button></div>
    ${menuNames.map(mm=>`<span class="cl-menu-i ${CL.menu===mm?'open':''}" onclick="clMenu('${mm}',event)">${mm}${mm==='Modo Resenha'?resenhaBadge:''}${CL.menu===mm?menuDropdown(mm):''}</span>`).join('')}
    ${menuSairHTML()}
  </div>`;
  if(typeof syncInbox==='function') syncInbox();           // atualiza a caixa antes de desenhar o badge
  const unread=(typeof inboxUnread==='function')?inboxUnread():0;
  const mailBadge=numBadge(unread);
  // aba "Jogador" NÃO tem mais badge de propostas: a proposta chega como e-mail e o badge da aba
  // E-mail já avisa — dois contadores pra mesma coisa só poluíam a barra de abas.
  const tabs=['jogo','elenco','jogador','financas','seleccao','correio','adversario'];
  const tabLbl={jogo:'Jogo',elenco:'Elenco',jogador:'Jogador',financas:'Finanças',seleccao:'Formação',correio:'E-mail',adversario:'Adversário'};
  /* ÍCONE POR ABA: no telefone esta barra vira uma barra de app FIXA no rodapé, só com ícones.
     Antes ela ficava no fim de uma coluna empilhada — ou seja, fora da tela: pra trocar de aba
     era preciso rolar a página inteira ou abrir o menu. No desktop nada muda (o ícone fica
     oculto e o rótulo continua como sempre). */
  const tabIco={jogo:'📅',elenco:'👥',jogador:'👤',financas:'💰',seleccao:'📋',correio:'✉️',adversario:'🆚'};
  // rótulo e ícone/badge são filhos flex do .cl-tab (align-items:center) — sempre em UMA linha e
  // verticalmente alinhados; o badge deixou de ser absoluto (flutuava acima do texto).
  const tabBar=`<div class="cl-tabs">${tabs.map(t=>`<span class="cl-tab cl-tab-${t} ${CL.tab===t?'on':''}" onclick="clTab('${t}')" title="${escC(tabLbl[t])}" aria-label="${escC(tabLbl[t])}"><span class="cl-tab-ico" aria-hidden="true">${tabIco[t]}</span><span class="cl-tab-lbl">${tabLbl[t]}</span>${t==='correio'?mailBadge:''}</span>`).join('')
    +`<span class="cl-tab cl-tab-play" onclick="clTabJogar()" title="Jogar" aria-label="Jogar"><span class="cl-tab-ico" aria-hidden="true">⚽</span><span class="cl-tab-lbl">Jogar</span></span>`}</div>`;
  let panel='';
  if(CL.tab==='jogo'||CL.tab==='elenco') panel=panJogo(oppId,home,uf,nm);   // 'elenco' é aba só do telefone (lá o painel fica oculto); no desktop cai no Jogo
  else if(CL.tab==='jogador') panel=panJogador();
  else if(CL.tab==='financas') panel=panFinancas();
  else if(CL.tab==='seleccao') panel=panSeleccao();
  else if(CL.tab==='correio') panel=panCorreio();
  else panel=panAdversario(oppId);
  const jornada=(S.round||0)+1;
  const th=clubTheme(CL.clubId);
  return `<div class="cl-main tab-${CL.tab} ${CL.online?'cl-main-online':''}" style="border-color:${th.col}">
    <div class="cl-main-top">${escC(cl.short)}</div>
    <div class="cl-mobmenu-wrap">${hamburger}${menu}</div>
    ${CL.online?onlineStatusSidebar():''}
    <div class="cl-main-body" style="background:${th.bg}">
      <div class="cl-main-left" style="background:${th.bg}">
        <div class="cl-hdr">
          <div class="cl-mgr">${escC(CL.mgr||'TREINADOR')}<span class="cl-share-wrap cl-noshot"><button class="cl-share-btn" onclick="clShareMenu(event)" title="Compartilhar meu time" aria-label="Compartilhar meu time">📤</button>${shareMenuHTML()}</span></div>
          <div class="cl-hdr-sub"><span class="cl-flag2">${universeFlag()}</span> ${escC(universeCountryName())} <span class="cl-div">${divisionTrophyImg(S.division,16)||''} ${divisionLabel()}</span> ${windowBadge()}</div>
        </div>
        <div class="cl-roster-hd cl-acc-hd" onclick="clToggleRoster()">
          <span>Elenco</span><span class="cl-acc-arrow ${CL.rosterOpen===false?'closed':''}">▾</span>
        </div>
        <div class="cl-roster cl-acc-body ${CL.rosterOpen===false?'closed':''}">${rosterHTML()}</div>
      </div>
      <div class="cl-main-right ${ADV_HDR_TABS[CL.tab]?'':'sem-adv'}" style="background:${th.bg}">
        ${advHeaderHTML({nome:oppId?((anyClubOf(oppId)||{short:'—'}).short):'—', home:nm?nm.home:null,
          comp:nm?nm.comp:'', fase:nm?nm.fase:'', cup:!!(nm&&nm.kind==='cup'),
          trofeu:(nm&&nm.kind==='cup')?(trophyImg(nm.cupKey,13)||'🏆'):'',
          dia:(nm&&shortMatchDate(nm))||'', season:S.season, chip:th.bg2})}
        <div class="cl-panel">${panel}</div>
        <!-- o retangulo 300x250 saiu daqui pelo mesmo motivo da pele nova (ver rfHubHTML):
             esta e a tela de escalar, e o quadrado ficava no meio da decisao -->
        ${tabBar}
      </div>
    </div>
    ${anchorAdHTML()}
  </div>`;
}
/* A FAIXA FIXA DO RODAPÉ SAIU (18/08/2026) — ver rfAncoraHTML em ui/rf26.js. Era o único
   espaço `position:fixed`, por cima do conteúdo, em todas as páginas. Fica como função vazia
   para o ponto de entrada continuar a existir num lugar só. */
function anchorAdHTML(){ return ''; }
/* cabeçalho fixo das colunas do elenco — precisa ficar em sincronia com o grid-template-columns
   de .cl-rrow (main.css): T/R · Pos · Nome · Idade · Força · Salário. Sem isto o usuário via 6
   colunas de números/letras sem saber o que cada uma significava, principalmente depois que
   Idade virou coluna própria. */
function rosterHeadHTML(){
  // rótulos curtos no telefone (mesmo par cl-lbl-lg/cl-lbl-sm da Energia): com a coluna Nota a
  // mais, "Força" e "Salário" não cabiam e invadiam a coluna vizinha
  return `<div class="cl-rrow head">
    <span class="cl-rmark"></span><span class="cl-rpos"><b class="cl-lbl-lg">Pos</b><b class="cl-lbl-sm">P</b></span><span class="cl-rname">Nome</span>
    <span class="cl-rage">Id.</span><span class="cl-rf"><b class="cl-lbl-lg">Força</b><b class="cl-lbl-sm">Fç</b></span><span class="cl-rnota" title="Nota do último jogo"><b class="cl-lbl-lg">Nota</b><b class="cl-lbl-sm">Nt</b></span><span class="cl-rbatt"><b class="cl-lbl-lg">Energia</b><b class="cl-lbl-sm">En.</b></span><span class="cl-rv" title="Salário semanal"><b class="cl-lbl-lg">Salário</b><b class="cl-lbl-sm">Sal.</b></span><span class="cl-rmv"><b class="cl-lbl-lg">Valor</b><b class="cl-lbl-sm">Val.</b></span></div>`;
}
/* barra fixa que SUBSTITUI o cabeçalho de colunas enquanto o modo de escalação está ligado —
   fica grudada no topo da lista (mesma posição sticky do cabeçalho normal) e diz sempre quem
   está marcado, mesmo depois de rolar a lista pra achar o reserva no fim da posição. Sem isso,
   no celular (onde o elenco é uma lista curta e rolável, .cl-roster) o usuário marcava um
   titular lá em cima, rolava pra baixo atrás do reserva e perdia de vista quem tinha marcado. */
/* salário SEMANAL exibido de um jogador, de qualquer clube. Sem contrato explícito cai no mesmo
   salário-tabela por força que o motor já usa pra folha dos clubes de CPU (ver cpuSeasonFinances),
   em vez de mostrar "0k" — que era o que aparecia no elenco de quem não tinha contract. */
function playerSalary(p){ return (p&&p.contract&&p.contract.salary) || (p?REBAL.wage(p.f):0); }
/* jogador em treino especial (Jogador > Treino especial). Lê a MESMA fonte do menu
   (S.trainingByClub[clube] — ver startTraining/myTrainingList no core), não o flag _training
   solto no jogador, que não sobrevive a um adopt do estado do servidor. */
function isInTraining(clubId, pid){ return ((S.trainingByClub && S.trainingByClub[clubId])||[]).indexOf(pid)>=0; }
/* ícone ao lado da força de quem está treinando — dá pra acompanhar a evolução direto na lista,
   sem abrir o menu de treino. ⭐ já significa outra coisa aqui (evolui mais rápido), por isso o
   cone (não existe emoji nativo de cone de trânsito — usa a imagem). */
function trainingConeImg(px){ px=px||12; return `<img class="cl-cone-ic" src="img/treino-especial-cone.webp" width="${px}" height="${px}" alt="Em treino especial">`; }
/* PILHA DE ENERGIA: energia entra no motor de partida como `força × (0,6 + 0,4 × energia)`
   (ver computeRatings no match-engine) — ou seja, um titular esgotado vale até 40% menos em
   campo. Merecia estar visível na lista, não só escondida no perfil. A cor sai do próprio nível
   (hsl 0=vermelho -> 120=verde), e o desenho de pilha vem do ::after (o polo) no CSS. */
function energyCell(p){
  const e=Math.max(0, Math.min(100, Math.round((p&&p.energy!=null)?p.energy:100)));
  const hue=Math.round(e*1.2);
  return `<span class="cl-batt ${e<=25?'low':''}" title="Energia ${e}% — jogador cansado rende menos em campo">`
    +`<i style="width:${e}%;background:linear-gradient(90deg,hsl(${Math.max(0,hue-25)},75%,42%),hsl(${hue},72%,45%))"></i></span>`;
}
function trainingIcon(clubId, p){
  if(!isInTraining(clubId, p&&p.pid)) return '';
  // o ícone dizia só "está em treino"; agora diz o que RENDEU (e o clique no nome abre o detalhe
  // completo na aba Jogador — ver forcaBlocoHTML).
  let extra='';
  if(clubId===CL.clubId && typeof growthOf==='function'){
    const g=growthOf(p);
    extra = g.hist && g.hist.length>1
      ? ` · desde que entrei em treino: ${g.hist[0].f} → ${g.atual}${g.atual>g.hist[0].f?' ▲':g.atual<g.hist[0].f?' ▼':' (estável)'}`
      : ' · ainda sem variação registrada';
  }
  return `<span class="cl-rtrain" title="Em treino especial — chance extra de evolução a cada rodada${extra}">${trainingConeImg(11)}</span>`;
}
/* MESMA tabela de elenco pra QUALQUER clube (o meu e o dos outros, humano ou CPU): mesmo grid
   (.cl-rrow), mesmo cabeçalho, mesmas colunas e os mesmos valores. Antes cada tela tinha a sua
   lista: a de "Ver elenco" desenhava só 5 células num grid de SEIS colunas (sem idade), então a
   força caía na coluna da idade e o valor na da força; e a de "Comprar jogador..." era outra
   lista à parte, sem cabeçalho nenhum. Uma função só evita as três divergirem de novo.
   opts.onclick(p) -> string de handler; opts.selPid -> pid destacado. */
/* ===== NOTA DO JOGADOR =====
   O motor dá nota a cada partida (ver ratePlayers/rateAppearances) e guarda as três últimas em
   p.stats.r3 — mas isso nunca aparecia na tela: o jogador jogava a temporada inteira sem saber
   como cada um foi. "Nota" aqui é a MAIS RECENTE; a média das três é a FORMA, que é o que abre
   a evolução (≥ 6,8) e por isso vai junto como contexto. */
function playerNota(p){ const r=(p&&p.stats&&p.stats.r3)||[]; return r.length?r[r.length-1]:null; }
function playerForma(p){ const r=(p&&p.stats&&p.stats.r3)||[]; return r.length?r.reduce((a,b)=>a+b,0)/r.length:null; }
function notaTxt(n){ return n==null?'—':String(Math.round(n*10)/10).replace('.',','); }
/* faixas: acima de 7,5 atuação de destaque; 6,8 é o portão da evolução; abaixo de 6 foi mal */
function notaCls(n){ return n==null?'na':n>=7.5?'otima':n>=6.8?'boa':n>=6?'ok':'ruim'; }
/* chip compacto — usado no elenco e nas listas de escolha durante a partida */
function notaChip(p){ const n=playerNota(p);
  return `<span class="cl-nota ${notaCls(n)}" title="${n==null?'Ainda não jogou nesta temporada':'Nota do último jogo'}">${notaTxt(n)}</span>`; }
function squadTableHTML(clubId, opts){
  opts=opts||{};
  const sq=(squad(clubId)||[]).slice();
  if(!sq.length) return '<div class="cl-savempty">— sem elenco —</div>';
  let html=rosterHeadHTML();
  ['GK','DEF','MID','ATT'].forEach(sec=>{ const list=sq.filter(p=>p.s===sec).sort((a,b)=>b.f-a.f);
    if(!list.length) return;
    html+=`<div class="cl-rgroup">`+list.map(p=>{
      const onclick=opts.onclick?` onclick="${opts.onclick(p)}"`:'';
      const selc=opts.selPid && opts.selPid===p.pid;
      const unavail=p.suspended>0||p.injuredMatches>0;
      const badge=p.suspended>0?'🟥':(p.injuredMatches>0?'✚'+p.injuredMatches:'');
      return `<div class="cl-rrow ${selc?'sel':''} ${unavail?'unavail':''}"${onclick}>
        <span class="cl-rmark"></span>
        <span class="cl-rpos">${posLetter(p.s)}</span><span class="cl-rname" title="${escC(p.n)}">${escC(p.n)}${(p.age&&p.age<=20)?'*':''}${badge?' '+badge:''}</span>
        <span class="cl-rage">${p.age||'-'}</span>
        <span class="cl-rf">${p.f}${trainingIcon(clubId,p)}</span><span class="cl-rnota">${notaChip(p)}</span><span class="cl-rbatt">${energyCell(p)}</span><span class="cl-rv">${fmt(playerSalary(p))}<span class="cl-rv-per">/sem</span></span><span class="cl-rmv">${fmt((typeof computeVM==='function')?computeVM(p):(p.mv||0))}</span></div>`;
    }).join('')+`</div>`;
  });
  return html;
}
function rosterHTML(){
  const groups=[['GK','G'],['DEF','D'],['MID','M'],['ATT','A']];
  const sq=squad(CL.clubId); const th=clubTheme(CL.clubId);
  // T/R sempre visível no elenco, não só na aba Formação: S.xi já vem preenchido (autoXI) desde
  // o início de jogo, então a marca é sempre válida — e saber quem está escalado é útil em
  // qualquer aba (Jogo, Jogador etc.), não só na hora de mexer na escalação.
  const xiSet=new Set(S.xi||[]); const showMarks=xiSet.size>0;
  let html=rosterHeadHTML();
  groups.forEach(([sec])=>{ const list=sq.filter(p=>p.s===sec);
    html+=`<div class="cl-rgroup">`+list.map(p=>{const starter=xiSet.has(p.pid);   // identidade por pid, não nome
      const selc=CL.selPlayer===p.pid;
      const unavail=p.suspended>0||p.injuredMatches>0;
      const badge=p.suspended>0?'🟥':(p.injuredMatches>0?'✚'+p.injuredMatches:'');
      const onclickFn=`clSelPlayer('${escC(p.pid)}')`;
      // salário real do contrato (não mais uma estimativa a partir do valor de mercado) — com
      // moeda abreviada (fmt: k/M) e periodicidade explícita, pro usuário nunca confundir
      // "10 mil" com "10 milhões" nem esquecer que o débito é SEMANAL.
      const salary=playerSalary(p);
      return `<div class="cl-rrow ${selc?'sel':''} ${unavail?'unavail':''}" style="${selc?'':`color:${th.txt}`}" onclick="${onclickFn}">
        <span class="cl-rmark ${showMarks?(starter?'t':'r'):''}">${showMarks?(starter?'T':'R'):''}</span>
        <span class="cl-rpos">${posLetter(p.s)}</span><span class="cl-rname" title="${escC(p.n)}">${escC(p.n)}${(p.age&&p.age<=20)?'*':''}${badge?' '+badge:''}</span>
        <span class="cl-rage">${p.age||'-'}</span>
        <span class="cl-rf">${p.f}${p._trend==='up'?'<span class="cl-rtrend up">▲</span>':p._trend==='down'?'<span class="cl-rtrend down">▼</span>':''}${trainingIcon(CL.clubId,p)}</span><span class="cl-rnota">${notaChip(p)}</span><span class="cl-rbatt">${energyCell(p)}</span><span class="cl-rv">${fmt(salary)}<span class="cl-rv-per">/sem</span></span><span class="cl-rmv">${fmt((typeof computeVM==='function')?computeVM(p):(p.mv||0))}</span></div>`;}).join('')+`</div>`;
  });
  return html;
}
/* ===== CABEÇALHO DO ADVERSÁRIO — bloco único, duas fontes =====
   Eram seis elementos com seis tratamentos: rótulo 15px, ano 18px absoluto no canto, nome 16px,
   local 15px, data em mono 10.5px amarelo e competição 12px — cada um num ponto diferente e sem
   ritmo entre as linhas. Agora é um bloco com três faixas fixas (rótulo+temporada · nome ·
   contexto+data) e só DUAS fontes, que é o sistema que o resto do jogo já usa: sans pra texto,
   mono pra número e data. Os três lugares que mostram este cabeçalho passam por aqui. */
/* data curta pro cabeçalho: "24/jan" em vez de "sáb 24 de jan" — ela dividiu a linha com a
   temporada, então precisa ser um carimbo, não uma frase */
function shortMatchDate(nm){
  if(!nm || typeof realDateForDay!=='function') return '';
  try{ const dia=1+((S.round||0))*7+(nm.kind==='cup'?3:6);
    const d=realDateForDay(dia);
    return d.getDate()+'/'+PT_MONTHS_ABBR[d.getMonth()];
  }catch(e){ return ''; }
}
function advHeaderHTML(o){
  o=o||{};
  const nome=o.nome||'—';
  const mando=o.home==null?'':(o.home?'CASA':'FORA');
  const meta=[];
  if(mando) meta.push(`<span class="cl-advh-mando ${o.home?'casa':'fora'}">${mando}</span>`);
  if(o.comp) meta.push(`<span>${escC(o.comp)}</span>`);
  if(o.fase) meta.push(`<span class="cl-advh-fase ${o.cup?'cup':''}">${o.cup&&o.trofeu?o.trofeu+' ':''}${escC(o.fase)}</span>`);
  return `<div class="cl-right-hdr">
    <div class="cl-advh-top"><span class="cl-advh-lbl">Próximo jogo</span>
      <span class="cl-advh-quando">${o.dia?`<span class="cl-advh-data">${escC(o.dia)}</span>`:''}${o.season?`<span class="cl-advh-ano">${o.season}</span>`:''}</span></div>
    <div class="cl-adv-name" style="${o.chip?`background:${o.chip}`:''}">${escC(nome)}</div>
    ${meta.length?`<div class="cl-advh-meta">${meta.join('')}</div>`:''}
  </div>`;
}
function clSelPlayer(n){ CL.selPlayer=n;
  // na aba Selecção o clique NÃO tira o usuário da aba — assim o botão "Alterar
  // Escalação" continua acessível até ele clicar em Jogar. Nas outras abas, abre o Jogador.
  if(CL.tab!=='jogador' && CL.tab!=='seleccao') CL.tab='jogador';
  cdraw(); }
function clTab(t){ CL.tab=t; if(t==='correio'){ CL.inboxOpen=null; markInboxSeen(); }
  // TELEFONE: a barra de abas é fixa no rodapé, mas o conteúdo dela vinha DEPOIS do elenco
  // aberto — clicar num ícone não mostrava nada sem rolar a página inteira. Aqui o acordeão do
  // elenco fecha e a tela sobe até o painel, então a aba escolhida aparece na primeira dobra.
  if(t==='elenco') CL.rosterOpen=true;   // a aba É o elenco: nunca chega recolhida
  if(isPhone()){ if(t!=='elenco') CL.rosterOpen=false; CL.mobMenuOpen=false; CL.menu=null; }
  cdraw();
  if(isPhone()) scrollToPanel();
}
function isPhone(){ return typeof matchMedia==='function' && matchMedia('(max-width:760px)').matches; }
/* leva o painel da aba pro topo da tela (descontando a barra de título do jogo, que é fixa) */
function scrollToPanel(){
  requestAnimationFrame(()=>{
    const el=$c('.cl-main-right'); if(!el) return;
    const topo=el.getBoundingClientRect().top + (window.scrollY||window.pageYOffset||0) - 6;
    window.scrollTo({top:Math.max(0,topo), behavior:'smooth'});
  });
}
/* ⚽ JOGAR da barra de abas: é a ação mais importante do jogo, então tem lugar próprio no rodapé.
   Abre a aba Formação — onde estão as formações e o próprio botão Jogar — em vez de entrar em
   campo direto: a escalação é a decisão que antecede a partida. */
function clTabJogar(){ clTab('seleccao'); }

/* ================= CAIXA DE ENTRADA (E-MAIL DO TREINADOR) =================
   Comunicados chegam aqui: propostas por jogadores, convites de outros clubes, avisos da
   diretoria sobre o cargo, premiações. Client-local (CL.inbox) e DERIVADO do estado (S) —
   assim sobrevive aos adopts do servidor no online. Cada e-mail tem uma chave única; syncInbox
   só ADICIONA os novos (não duplica) e preserva o lido/não-lido. Mensagens curtas, sempre
   assinadas por alguém coerente, e com um botão de ação quando há algo a fazer. */
/* O DIRETOR E O PRESIDENTE TEM O NOME DO PAIS DO SAVE, e nao um nome brasileiro
   fixo. Esta funcao chamava BR_FIRST/BR_LAST, duas listas que sairam do motor em
   18/08/2026 (commit b358785, "O regen deixa de nascer brasileiro em qualquer
   pais") quando os nomes passaram a vir por pais de WORLD_CONFIG.nomesDoPais.
   Ninguem reparou que a caixa de entrada tambem as usava: desde esse dia
   syncInbox() rebentava com `ReferenceError: BR_FIRST is not defined` LOGO NA
   PRIMEIRA proposta a assinar, e como o erro sobe, a caixa inteira deixava de ser
   construida -- sem propostas, sem convites de outros clubes, sem avisos da
   diretoria, sem premiacao. O treinador ficou quinze dias sem receber nada.
   `_poolNomes` e' a mesma fonte que o motor usa, com o mesmo fallback. */
function inboxSigner(role, clubId){ // nome determinístico por clube+cargo (dá cara de pessoa)
  const R=makeRng(hashSeed('signer', String(clubId||'x'), role||''));
  const P=(typeof _poolNomes==='function')
    ? _poolNomes(typeof activeUniverseKey==='function'?activeUniverseKey():'brasil')
    : { first:['Gabriel','Lucas','Matheus'], last:['Silva','Santos','Oliveira'] };
  return P.first[Math.floor(R.random()*P.first.length)]+' '+P.last[Math.floor(R.random()*P.last.length)];
}
/* ===== COMPONENTES DO CORPO DO E-MAIL =====
   Ver .rf-ml-tab / .rf-ml-kv no CSS para o porquê. A regra de uso é simples:
   dado de jogador vai em TABELA, número solto vai em par rótulo/valor, e texto
   corrido continua texto — tabela de uma linha só é enfeite, não organização. */
function mailTab(colunas, linhas){
  if(!linhas || !linhas.length) return '';
  const th = colunas.map(c=>`<th${c.m?' style="text-align:right"':''}>${escC(c.t)}</th>`).join('');
  const tr = linhas.map(l=>'<tr>'+l.map((v,i)=>
      `<td class="${colunas[i]&&colunas[i].m?'m':(i===0?'n':'')}">${v}</td>`).join('')+'</tr>').join('');
  return `<table class="rf-ml-tab"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}
function mailKV(pares){
  const p=(pares||[]).filter(x=>x&&x[0]);
  if(!p.length) return '';
  return `<div class="rf-ml-kv">${p.map(([k,v])=>
    `<div><span>${escC(k)}</span><b>${v}</b></div>`).join('')}</div>`;
}
function mailNota(txt){ return txt?`<span class="rf-ml-nota">${txt}</span>`:''; }

function addInboxEmail(e){
  CL.inbox=CL.inbox||[]; CL.inboxDeleted=CL.inboxDeleted||{};
  if(CL.inboxDeleted[e.key]) return;                    // usuário apagou -> não ressuscita
  if(CL.inbox.some(x=>x.key===e.key)) return;           // já existe -> não duplica
  CL.inbox.unshift(Object.assign({read:false, round:S.round, season:S.season}, e));
  if(CL.inbox.length>60) CL.inbox.length=60;            // teto: guarda as 60 mais recentes
  saveInbox();
}
/* ================= FINANÇAS SÃO INDIVIDUAIS =================
   S.finances (log de transações) e S.seasonTotals (acumulado do ano) moram no S — que na Resenha
   é o estado COMPARTILHADO, produzido pelo anfitrião. Resultado no ar: o convidado adotava a
   rodada e passava a ver as transações e os totais DO ANFITRIÃO em "transações recentes",
   perdendo os próprios. Dinheiro é por-clube: cada humano guarda o SEU log no próprio cliente
   (mesma ideia da caixa de entrada) e o reimpõe sobre o que veio do servidor, a cada adoção.
   O caixa em si já era individual (game_seats.budget, ver commitBudget) — o que faltava era o
   histórico. _prevPrizesCreditedSeason entra junto: é o carimbo de "já recebi a premiação da
   temporada X"; vindo do anfitrião, fazia o convidado achar que já tinha recebido a dele. */
function myFinKey(){
  const g = (CL.online && typeof NET!=='undefined' && NET.gameId) ? NET.gameId : ('solo_'+(CL.save||'')+'_'+((S&&S.seed)||'x'));
  return 'ef_fin_'+g+'_'+(CL.clubId||'');
}
function saveMyFinances(){
  if(!CL.online || !S) return;                       // solo: o log já é meu e vai junto no save
  CL._myFin=CL._myFin||{};
  // o extrato tem teto no assento: 200 lançamentos bastam pra tela e o jsonb não cresce sem fim
  CL._myFin.finances=(S.finances||[]).slice(-200); CL._myFin.seasonTotals=S.seasonTotals||null;
  CL._myFin.prizeSeason=S._prevPrizesCreditedSeason||null;
  CL._myFin.settled=CL._myFin.settled||{};
  CL._myFinKey=myFinKey();                           // marca de qual sala+clube é o store em memória
  /* FONTE ÚNICA É O SERVIDOR (regra do dono, 21/08): o blob viaja no assento via CAREER_KEYS
     (game_seats.career._myFin) — sobrevive a troca de aparelho e a limpeza de navegador.
     O localStorage continua como cache/migração, mas quem manda é o assento. */
  S._myFin=CL._myFin;
  if(typeof persistCareer==='function') persistCareer();
  try{ localStorage.setItem(myFinKey(), JSON.stringify(CL._myFin)); }catch(e){}
}
/* PROPOSTA MINHA JÁ LIQUIDADA (o jogador chegou e eu paguei). O registro é do CLIENTE, não do S:
   S.outgoingOffersByClub mora no estado compartilhado, então tirar a proposta de lá é uma
   mutação local que o adopt seguinte desfaz — e settleMyOutgoingOffers, que roda a cada adopt,
   pagava DE NOVO pelo mesmo jogador (com débito e e-mail repetidos a cada rodada). Aqui o
   carimbo sobrevive ao adopt e ao reload (vai junto no store de finanças, por sala+clube). */
function offerAlreadySettled(id){
  if(!CL.online) return false;
  if(!CL._myFin || CL._myFinKey!==myFinKey()) restoreMyFinances();
  return !!(CL._myFin && CL._myFin.settled && CL._myFin.settled[id]);
}
function markOfferSettled(id){
  if(!CL.online) return;
  CL._myFin=CL._myFin||{}; CL._myFin.settled=CL._myFin.settled||{};
  CL._myFin.settled[id]=true; saveMyFinances();
}
function restoreMyFinances(){
  if(!CL.online || !S) return;
  /* A FONTE É O ASSENTO (game_seats.career._myFin), restaurado pelo restoreCareer que roda
     ANTES desta função em todos os caminhos de adoção. O localStorage é só migração: quem
     gravou por lá antes desta mudança sobe o blob pro assento na primeira passada. */
  let doAssento = (S._myFin && typeof S._myFin==='object') ? S._myFin : null;
  if(!doAssento){
    try{ const raw=localStorage.getItem(myFinKey()); if(raw) doAssento=JSON.parse(raw); }catch(e){}
    if(doAssento){ S._myFin=doAssento; if(typeof persistCareer==='function') persistCareer(); } // migra pro servidor
  }
  CL._myFinKey=myFinKey();
  if(!doAssento){
    // NADA guardado ainda (sala que já estava rolando quando isto entrou, ou primeiro acesso).
    // Quem é ANFITRIÃO tem no S o próprio histórico — é dele mesmo, então vira a base do store.
    // Quem é CONVIDADO tem no S o histórico do anfitrião — esse não é dele: começa limpo, e o
    // extrato passa a contar a partir daqui (o que havia antes nem era dele pra perder).
    if(!(typeof NET!=='undefined' && NET.isHost)){
      S.finances=[]; S.seasonTotals={income:0,salaries:0,bonuses:0,opex:0,playerSales:0,playerPurchases:0,stadium:0};
      S._prevPrizesCreditedSeason=null;
    }
    CL._myFin=null;
    saveMyFinances(); return;
  }
  CL._myFin=doAssento;
  S.finances=CL._myFin.finances||[];
  if(CL._myFin.seasonTotals) S.seasonTotals=CL._myFin.seasonTotals;
  S._prevPrizesCreditedSeason=CL._myFin.prizeSeason||null;
  CL._myFin.settled=CL._myFin.settled||{};
}
/* ---- PERSISTÊNCIA do inbox: localStorage SEMPRE (solo + reload) + game_seats no online
   (durável/cross-device). Chave por save/sala + clube. ---- */
/* a chave TEM que identificar o save/sala + o clube. No solo entram nome do save E seed: dois
   saves diferentes podem nascer com o mesmo nome (o usuário reaproveita) ou, em tese, com a
   mesma seed — juntos os dois não colidem. */
function inboxKey(){
  const g = (CL.online && typeof NET!=='undefined' && NET.gameId) ? NET.gameId : ('solo_'+(CL.save||'')+'_'+((S&&S.seed)||'x'));
  return 'ef_inbox_'+g+'_'+(CL.clubId||'');
}
function saveInbox(){
  const payload={ inbox:CL.inbox||[], deleted:CL.inboxDeleted||{} };
  try{ localStorage.setItem(inboxKey(), JSON.stringify(payload)); }catch(e){}
  if(CL.online && typeof NET!=='undefined' && NET.saveInbox){   // debounce: escrita no assento
    clearTimeout(CL._inboxSaveT); CL._inboxSaveT=setTimeout(()=>{ NET.saveInbox(payload); }, 900);
  }
}
function mergeInbox(other){
  if(!other) return;
  CL.inbox=CL.inbox||[]; CL.inboxDeleted=Object.assign({}, other.deleted||{}, CL.inboxDeleted||{});
  const byKey={}; CL.inbox.forEach(x=>byKey[x.key]=x);
  (other.inbox||[]).forEach(e=>{ if(!byKey[e.key]){ CL.inbox.push(e); byKey[e.key]=e; } else if(e.read){ byKey[e.key].read=true; } });
  CL.inbox=CL.inbox.filter(x=>!CL.inboxDeleted[x.key]);        // some com os apagados
}
function loadInbox(){
  // ZERA antes de ler: CL.inbox é memória do cliente e sobrevive à troca de save. Sem isto, abrir
  // um save cuja caixa ainda não existe no storage mantinha em tela os e-mails do save ANTERIOR
  // (o `CL.inbox=CL.inbox||[]` de antes preservava o array velho quando não havia nada gravado).
  CL.inbox=[]; CL.inboxDeleted={}; CL.inboxOpen=null;
  try{ const raw=localStorage.getItem(inboxKey()); if(raw){ const s=JSON.parse(raw); CL.inbox=s.inbox||[]; CL.inboxDeleted=s.deleted||{}; } }catch(e){}
  if(CL.online && typeof NET!=='undefined' && NET.loadInbox){   // mescla com o assento (cross-device)
    NET.loadInbox().then(db=>{ if(db){ mergeInbox(db); if(typeof cdraw==='function') cdraw(); } }).catch(()=>{});
  }
}
function syncInbox(){
  if(!S || !S.clubId) return;
  const k=inboxKey();
  if(CL._inboxLoadedKey!==k){ CL._inboxLoadedKey=k; loadInbox(); } // carrega do storage/assento 1x por jogo+clube
  const myShort=(clubOf(S.clubId)||{}).short||'clube';
  // 0) FAXINA: e-mail de proposta/convite só faz sentido enquanto a proposta existe. Quando a
  // transferência é FECHADA (aceita), recusada, expirada ou o convite some, o objeto de origem
  // sai de S — e o e-mail ficava pra sempre na caixa, apontando pra uma negociação que não
  // existe mais. Como cada humano roda isto no próprio cliente, sobre a PRÓPRIA fatia
  // (myIncomingOffers = S.incomingOffersByClub[meu clube]), vale pra todo mundo na Resenha.
  const vivos=new Set(myIncomingOffers().map(o=>'offer-'+o.id));
  if(typeof myCounterOffers==='function') myCounterOffers().forEach(c=>vivos.add('counter-'+c.id));
  (S.pendingJobOffers||[]).forEach(o=>vivos.add('job-'+o.clubId+'-'+(o.roundOfferred||0)));
  if(CL.online && CL._pendingResenhaOffer) vivos.add('rjob-'+CL._pendingResenhaOffer.clubId+'-'+(S.season||0));
  const antes=(CL.inbox||[]).length;
  CL.inbox=(CL.inbox||[]).filter(e=>(e.kind!=='offer' && e.kind!=='job' && e.kind!=='counter') || vivos.has(e.key));
  if(CL.inbox.length!==antes){
    if(CL.inboxOpen && !CL.inbox.some(e=>e.key===CL.inboxOpen)) CL.inboxOpen=null; // estava lendo o que sumiu
    saveInbox();
  }
  // 1) PROPOSTAS por jogadores meus
  myIncomingOffers().forEach(o=>{
    addInboxEmail({ key:'offer-'+o.id, kind:'offer', from:inboxSigner('dir',S.clubId), role:'Diretor de Futebol · '+myShort,
      subject:'Proposta por '+o.playerName,
      body:`O ${escC((clubOf(o.buyerId)||bgClubById?.(o.buyerId)||{short:o.buyerName||'um clube'}).short||o.buyerName||'um clube')} ofereceu ${fmt(o.fee)} pelo ${escC(o.playerName)}. Quer avaliar?`,
      action:{label:'Ver proposta', go:'CL.tab="jogo";clCloseOverlay();clIncomingOffers()'} });
  });
  // 1b) CONTRAPROPOSTAS que EU recebi (sou o comprador): o vendedor humano recusou meu valor e
  // pediu outro. Antes isso não saía do aparelho dele — a negociação morria em silêncio do meu lado.
  if(typeof myCounterOffers==='function') myCounterOffers().forEach(c=>{
    addInboxEmail({ key:'counter-'+c.id, kind:'counter', from:inboxSigner('dir',c.sellerId),
      role:'Diretor de Futebol · '+escC(c.sellerName||''),
      subject:'Contraproposta por '+c.playerName,
      body:`Recusamos sua proposta de <b>${fmt(c.offeredFee)}</b> por <b>${escC(c.playerName)}</b>.`
        +` Liberamos a negociação por <b>${fmt(c.askFee)}</b>.`
        +`<br><br><span style="opacity:.8">— ${escC(c.sellerHumanName||'o treinador')} (${escC(c.sellerName||'')})</span>`,
      action:{label:'Responder', go:'clCloseOverlay();clCounterOffers()'} });
  });
  // 2) CONVITES pra treinar outro clube (solo)
  (S.pendingJobOffers||[]).forEach(o=>{
    const c=clubOf(o.clubId)||bgClubById?.(o.clubId)||{short:'um clube'};
    addInboxEmail({ key:'job-'+o.clubId+'-'+(o.roundOfferred||0), kind:'job', from:inboxSigner('pres',o.clubId), role:'Presidente · '+(c.short||''),
      subject:'Convite para treinar o '+(c.short||'clube'),
      body:`Gostaríamos de você no comando do ${escC(c.short||'clube')}${o.foreign?' ('+escC(o.country||'')+')':''}. Salário: ${fmt(o.salary||0)}/sem.`,
      action:{label:'Ver oferta', go:'clCloseOverlay();clJobOffers()'} });
  });
  // 3) CONVITE da Resenha (Fase 2) — clube livre da CPU
  if(CL.online && CL._pendingResenhaOffer){ const o=CL._pendingResenhaOffer; const c=clubOf(o.clubId)||{short:'um clube'};
    addInboxEmail({ key:'rjob-'+o.clubId+'-'+(S.season||0), kind:'job', from:inboxSigner('pres',o.clubId), role:'Presidente · '+(c.short||''),
      subject:'Proposta para assumir o '+(c.short||'clube'),
      body:`Estamos sem treinador e queremos você. Topa assumir o ${escC(c.short||'clube')}?`,
      action:{label:'Ver proposta', go:'clCloseOverlay();showResenhaOffer(CL._pendingResenhaOffer)'} });
  }
  // 4) AVISO DA DIRETORIA sobre o cargo (uma vez por episódio de risco na temporada)
  const js=S.jobSecurity!=null?S.jobSecurity:60;
  if(js<30 && !CL.unemployed){
    addInboxEmail({ key:'warn-'+(S.season||0), kind:'warn', from:inboxSigner('pres',S.clubId), role:'Presidente · '+myShort,
      subject:'Conversa séria sobre o seu trabalho',
      body:`Os resultados e o clima do elenco preocupam a diretoria. Precisamos de uma reação nas próximas rodadas para você seguir no ${escC(myShort)}.`,
      action:{label:'Ver classificação', go:'clCloseOverlay();clClassif()'} });
  }
  // 5) APOSENTADORIAS do MEU elenco na virada de temporada (S._prevSeason.retirements — o mesmo
  // registro que a sala de imprensa usa). Fato relevante que antes só passava como uma linha de
  // notícia da rodada e sumia.
  const pvR=S._prevSeason;
  if(pvR && Array.isArray(pvR.retirements)){
    const meus=pvR.retirements.filter(r=>r && r.club===S.clubId);
    if(meus.length){
      addInboxEmail({ key:'retire-'+(pvR.season||0), kind:'retire', from:inboxSigner('dir',S.clubId), role:'Diretor de Futebol · '+myShort,
        subject:meus.length===1?('Fim de carreira: '+meus[0].name):(meus.length+' jogadores penduraram as chuteiras'),
        body:`<p>${meus.length===1?'Um jogador pendurou as chuteiras':'Estes jogadores penduraram as chuteiras'} no fim da temporada. Quem subiu da base no lugar já está no elenco:</p>`
          +mailTab([{t:'Jogador'},{t:'Idade',m:1},{t:'Pos'},{t:'Motivo'},{t:'Substituto'}],
            meus.map(r=>[ escC(r.name), r.age, posLetter(r.pos),
                          escC(r.reason||'encerrou a carreira'),
                          r.replacement ? escC(r.replacement)+(r.replacementAge?' <span style="opacity:.6">('+r.replacementAge+')</span>':'') : '—' ]))
          +mailNota('Cada saída abre uma vaga na folha — e a base só entrega um por temporada.'),
        action:{label:'Ver elenco', go:'clCloseOverlay();CL.tab="jogador";cdraw()'} });
    }
  }
  // 6) AVISO ANTECIPADO: quem corre risco real de se aposentar no fim DESTA temporada. Chega uma
  // vez por temporada, pra dar tempo de vender ou buscar substituto com a janela ainda aberta.
  if(typeof retirementRisk==='function'){
    const risco=retirementRisk(S.clubId);
    if(risco.length){
      addInboxEmail({ key:'risco-'+(S.season||0), kind:'retire', from:inboxSigner('dir',S.clubId), role:'Diretor de Futebol · '+myShort,
        subject:'Elenco envelhecendo — '+risco.length+' jogador'+(risco.length>1?'es':'')+' perto da aposentadoria',
        body:`<p>Estes jogadores podem pendurar as chuteiras na virada da temporada. Vale avaliar uma venda enquanto ainda valem alguma coisa, ou já buscar substituto:</p>`
          +mailTab([{t:'Jogador'},{t:'Idade',m:1},{t:'Pos'},{t:'Força',m:1},{t:'Risco',m:1},{t:'Vale',m:1}],
            risco.slice(0,8).map(x=>[ escC(x.p.n), x.p.age, posLetter(x.p.s), x.p.f,
                                      Math.round(x.chance*100)+'%', fmt(x.p.mv||0) ]))
          +mailNota(risco.length>8 ? `E mais ${risco.length-8} na mesma faixa de idade.` 
                                   : 'A janela ainda está aberta — depois da virada, não vale mais nada.'),
        action:{label:'Ver elenco', go:'clCloseOverlay();CL.tab="jogador";cdraw()'} });
    }
  }
  // 7) DINHEIRO: transferências fechadas e alerta de caixa. As entradas de finanças (S.finances)
  // são o registro durável por rodada do MEU clube — cada compra/venda vira um e-mail com o
  // mesmo texto que aparece na aba Finanças.
  (S.finances||[]).forEach(f=>{
    if(!f) return;
    const compra=(f.playerPurchases||0)>0, venda=(f.playerSales||0)>0;
    if(!compra && !venda) return;                     // entrada de rodada (receita/salários) não vira e-mail
    // O QUE define compra/venda são os CAMPOS da entrada, não o texto: cada negócio grava a sua
    // própria entrada (ver pushFinanceEntry nas chamadas de finalizeTransfer/leilão/venda), e
    // filtrar por palavra deixava de fora o que não usasse o verbo esperado — era o caso do
    // leilão ("arrematado"), que passava batido e nunca virava e-mail.
    (f.log||[]).forEach((linha,i)=>{
      if(!linha) return;
      addInboxEmail({ key:'mov-'+(f.round||0)+'-'+i+'-'+hashC(linha), kind:'money', from:inboxSigner('dir',S.clubId), role:'Diretor de Futebol · '+myShort,
        subject:(compra&&venda)?'Movimentação no elenco':(compra?'Contratação concluída':'Venda concluída'),
        body:`<p>${escC(linha)}</p>`+mailKV([['Caixa depois do negócio', fmt(S.budget||0)]]),
        action:{label:'Ver finanças', go:'clCloseOverlay();CL.tab="financas";cdraw()'} });
    });
  });
  if((S.budget||0)<0){
    addInboxEmail({ key:'caixa-'+(S.season||0), kind:'money', from:inboxSigner('pres',S.clubId), role:'Presidente · '+myShort,
      subject:'Caixa no vermelho',
      body:`O clube fechou a rodada com <b>${fmt(S.budget||0)}</b> em caixa. Precisamos cortar folha ou vender alguém antes que isso vire problema com a diretoria.`,
      action:{label:'Ver finanças', go:'clCloseOverlay();CL.tab="financas";cdraw()'} });
  }
  // 8) PREMIAÇÃO da temporada anterior (fim de temporada)
  const pv=S._prevSeason;
  if(pv && !(CL.inbox||[]).some(e=>e.key==='prize-'+pv.season) && typeof computeMyPrevSeasonPrizes==='function'){ const sum=computeMyPrevSeasonPrizes();
    if(sum && sum.total>0){
      addInboxEmail({ key:'prize-'+pv.season, kind:'prize', from:'CBF', role:'Confederação Brasileira de Futebol',
        subject:'Premiação da temporada '+pv.season,
        body:`<p>Parabéns! O ${escC(myShort)} recebeu a premiação da temporada ${pv.season}.</p>`
          +mailKV([['Total recebido', fmt(sum.total)], ['Temporada', pv.season]])
          +mailNota('O valor já entrou no caixa do clube.'),
        action:null });
    }
  }
}
function inboxUnread(){ return (CL.inbox||[]).filter(e=>!e.read).length; }
function markInboxSeen(){ /* abrir a aba NÃO marca tudo como lido — só ao abrir cada e-mail */ }
function clOpenEmail(key){ const e=(CL.inbox||[]).find(x=>x.key===key); if(e){ e.read=true; CL.inboxOpen=key; saveInbox(); } cdraw(); }
function clInboxBack(){ CL.inboxOpen=null; cdraw(); }
function clInboxAction(){ const e=(CL.inbox||[]).find(x=>x.key===CL.inboxOpen); if(e&&e.action&&e.action.go){ try{ (new Function(e.action.go))(); }catch(err){ console.warn('ação do e-mail:', err); } } }
function clInboxDelete(key){ CL.inboxDeleted=CL.inboxDeleted||{}; CL.inboxDeleted[key]=true; CL.inbox=(CL.inbox||[]).filter(x=>x.key!==key); CL.inboxOpen=null; saveInbox(); cdraw(); }
/* esvazia a caixa de uma vez. Marca cada uma em CL.inboxDeleted (mesmo caminho da lixeira
   individual) — senão syncInbox() recriaria na hora as que ainda têm proposta viva por trás. */
function clInboxClearAll(){
  CL.inboxDeleted=CL.inboxDeleted||{};
  (CL.inbox||[]).forEach(e=>{ CL.inboxDeleted[e.key]=true; });
  CL.inbox=[]; CL.inboxOpen=null; saveInbox(); cdraw();
}
/* ÍCONE DA MENSAGEM. Devolve SVG do Iconoir, não emoji: esta função alimenta
   a lista da Caixa de entrada, onde o emoji colorido brigava com o resto. */
function inboxIcon(kind){
  const n={offer:'financas', job:'acordo', warn:'aviso', prize:'trofeu',
           retire:'jogador', money:'moedas', counter:'voltar'}[kind]||'email';
  return (typeof rfIcone==='function')?rfIcone(n,15):'';
}
function panCorreio(){
  syncInbox();
  const box=CL.inbox||[];
  // LEITURA de um e-mail específico
  if(CL.inboxOpen){ const e=box.find(x=>x.key===CL.inboxOpen);
    if(!e){ CL.inboxOpen=null; return panCorreio(); }
    return `<div class="cl-mail">
      <div class="cl-mail-toolbar">
        ${btn('‹ Voltar','clInboxBack()',{cls:'cl-btn-mini'})}
        <span class="cl-mail-when">Rodada ${(e.round||0)+1}${e.season?(' · '+e.season):''}</span>
        <button class="cl-mail-del" onclick="clInboxDelete('${escC(e.key)}')" title="Apagar">🗑</button>
      </div>
      <div class="cl-mail-open">
        <div class="cl-mail-subj">${inboxIcon(e.kind)} ${escC(e.subject)}</div>
        <div class="cl-mail-body">${e.body}</div>
        <div class="cl-mail-sign">— ${escC(e.from)}${e.role?('<br><span class="cl-mail-role">'+escC(e.role)+'</span>'):''}</div>
        ${e.action?`<div class="cl-mail-actions">${btn(e.action.label,'clInboxAction()',{icon:'➡',cls:'cl-btn-ok'})}</div>`:''}
      </div>
    </div>`;
  }
  // LISTA
  if(!box.length) return `<div class="cl-mail"><div class="cl-mail-empty">📭 Nenhuma mensagem por enquanto.<br><span>Propostas, convites e avisos da diretoria chegam aqui.</span></div></div>`;
  // a lixeira fica DENTRO da linha (stopPropagation): apagar sem precisar abrir a mensagem.
  const rows=box.map(e=>`<div class="cl-mail-row ${e.read?'':'unread'}" onclick="clOpenEmail('${escC(e.key)}')">
    <span class="cl-mail-dot">${e.read?'':'●'}</span>
    <span class="cl-mail-ic">${inboxIcon(e.kind)}</span>
    <span class="cl-mail-txt"><b>${escC(e.subject)}</b><br><span class="cl-mail-prev">${escC(e.from)}</span></span>
    <span class="cl-mail-when2">${(e.round||0)+1}ª</span>
    <button class="cl-mail-del" title="Apagar" onclick="event.stopPropagation();clInboxDelete('${escC(e.key)}')">🗑</button>
  </div>`).join('');
  const limparTudo=box.length>1?btn('Limpar tudo','clInboxClearAll()',{icon:'🗑',cls:'cl-btn-cancel cl-btn-mini'}):'';
  return `<div class="cl-mail"><div class="cl-mail-list">${rows}</div>${limparTudo?`<div class="cl-mail-foot">${limparTudo}</div>`:''}</div>`;
}

/* ================= VISUALIZAR TIME (view-only) =================
   Usado quando o usuário clica no nome de um clube que NÃO é o dele (ex: na
   Classificação de "Minhas competições", ou em "Ver elenco" do adversário).
   Mostra a mesma tela principal (elenco, próximo jogo, jogador, adversário),
   só que 100% de LEITURA — sem comprar, vender, renovar, escalar ou jogar,
   já que essas ações só fazem sentido pro dono do time. ---- */
function clViewTeam(clubId){
  clCloseOverlay();
  CL.viewClubId=clubId; CL.viewTab='jogo'; CL.viewSelPlayer=null;
  /* VISITA DENTRO DO JOGO: a página Elenco & Base atende o clube visitado
     (sem financeiro, sem Base/Treino) — o usuário não sai da estrutura de
     menu para uma tela solta. O rf26 é a pele em produção; sem ela, cai na
     tela antiga. */
  if(typeof rfGo==='function' && typeof rfSetTab==='function'){
    CL.screen='main'; rfGo('elenco'); rfSetTab('elenco','elenco'); return;
  }
  CL.screen='teamview'; cdraw();
}
// hotseat: "voltar" durante a vez de um assento tem que devolver pra scSeatTurn, não pra
// scMain do manager 1 (senão o clique arrancava o assento no meio da própria vez).
function clViewTeamBack(){ clCloseOverlay(); CL.viewClubId=null; CL.screen=CL._seatContext?'seatturn':'main'; cdraw(); }
function clViewTab(t){ CL.viewTab=t;
  // mesmo comportamento da tela do próprio clube (ver clTab): no telefone só a aba escolhida
  // aparece, o elenco recolhe fora da aba dele e a tela sobe até o painel
  if(t==='elenco') CL.rosterOpen=true;
  if(isPhone()){ if(t!=='elenco') CL.rosterOpen=false; CL.mobMenuOpen=false; CL.menu=null; }
  cdraw();
  if(isPhone()) scrollToPanel();
}
function clViewSelPlayer(n){ CL.viewSelPlayer=n; CL.viewTab='jogador'; cdraw(); }
function fixtureFor(clubId){ return currentFixtures().find(([h,a])=>h===clubId||a===clubId); }
function scTeamView(){
  // TELA PORTADA (telas/Adversario - Ver Time)
  return rfVerTimeHTML(CL.viewClubId);
}
function scTeamViewLegado(){
  const vid=CL.viewClubId; const c=clubOf(vid);
  if(!c){ CL.viewClubId=null; CL.screen='main'; return scMain(); }
  const th=clubTheme(vid);
  const uf=fixtureFor(vid); const oppId=uf?(uf[0]===vid?uf[1]:uf[0]):null; const home=uf?uf[0]===vid:true;
  const tabs=['jogo','elenco','jogador','adversario'];
  const tabLbl={jogo:'Jogo',elenco:'Elenco',jogador:'Jogador',adversario:'Adversário'};
  const tabIco={jogo:'📅',elenco:'👥',jogador:'👤',adversario:'🆚'};
  // sem ▶ Jogar aqui de propósito: no modo espectador não se entra em campo
  const tabBar=`<div class="cl-tabs">${tabs.map(t=>`<span class="cl-tab cl-tab-${t} ${CL.viewTab===t?'on':''}" onclick="clViewTab('${t}')" title="${escC(tabLbl[t])}" aria-label="${escC(tabLbl[t])}"><span class="cl-tab-ico" aria-hidden="true">${tabIco[t]}</span><span class="cl-tab-lbl">${tabLbl[t]}</span></span>`).join('')}</div>`;
  let panel='';
  if(CL.viewTab==='jogador') panel=panViewJogador(vid);
  else if(CL.viewTab==='adversario') panel=panViewAdversario(oppId);
  else panel=panViewJogo(vid,oppId,uf);
  const jornada=(S.round||0)+1;
  return `<div class="cl-main tab-${CL.viewTab||'jogo'}" style="border-color:${th.col}">
    <div class="cl-main-top">${escC(c.short)} <span class="cl-view-tag">👁 Visualização</span></div>
    <div class="cl-mobmenu-wrap">${btn('← Voltar','clViewTeamBack()',{cls:'cl-btn-mini'})}</div>
    <div class="cl-main-body" style="background:${th.bg}">
      <div class="cl-main-left" style="background:${th.bg}">
        <div class="cl-hdr">
          <div class="cl-mgr">${escC(c.name)}</div>
          <div class="cl-hdr-sub"><span class="cl-flag2">${clubCountry(c).flag}</span> ${escC(clubCountry(c).name)} ${(function(){ const lg=clubLeagueLabel(c); if(lg) return `<span class="cl-div">${escC(lg)}</span>`;
            // divisão DESTE clube (clubDivisionOf), não a de quem está jogando — antes um save na
            // Série D rotulava qualquer clube visitado como "Série D", inclusive um da Série A.
            const d=(typeof clubDivisionOf==='function'&&clubDivisionOf(vid))||null;
            return (!c.country&&d)?`<span class="cl-div">${divisionTrophyImg(d,16)||''} ${divisionLabelOf(d)}</span>`:''; })()}</div>
        </div>
        <div class="cl-roster-hd cl-acc-hd" onclick="clToggleRoster()">
          <span>Elenco</span><span class="cl-acc-arrow ${CL.rosterOpen===false?'closed':''}">▾</span>
        </div>
        <div class="cl-roster cl-acc-body ${CL.rosterOpen===false?'closed':''}">${viewRosterHTML(vid)}</div>
      </div>
      <div class="cl-main-right ${ADV_HDR_TABS[CL.viewTab||'jogo']?'':'sem-adv'}" style="background:${th.bg}">
        ${advHeaderHTML({nome:oppId?clubOf(oppId).short:'—', home:uf?home:null,
          fase:uf?(jornada+'ª Semana'):'', season:S.season, chip:th.bg2})}
        <div class="cl-panel">${panel}</div>
        ${tabBar}
      </div>
    </div>
  </div>`;
}
function viewRosterHTML(clubId){
  return squadTableHTML(clubId, {selPid:CL.viewSelPlayer, onclick:p=>`clViewSelPlayer('${escC(p.pid)}')`});
}
function panViewJogo(vid,oppId,uf){
  const me=tableRow(vid), op=oppId?tableRow(oppId):null;
  const rnd=rngFrom(uf?(hashC(uf[0])+hashC(uf[1])):hashC(vid));
  const ref=REFS_C[Math.floor(rnd()*REFS_C.length)];
  const sq=squad(vid)||[];
  const moral=sq.length?Math.round(sq.reduce((s,p)=>s+(p.moral||70),0)/sq.length):70;
  const line=(id,t,blue)=>`<div class="cl-grow ${blue?'blue':''}"><span class="cl-gname">${escC(clubOf(id).short)}</span>
     <span class="cl-gnums"><b>${t.P}</b><b>${t.W}</b><b>${t.D}</b><b>${t.GF}:${t.GA}</b><b>${t.Pts}</b></span></div>`;
  return `<div class="cl-jogo">
    ${uf?line(vid,me,false):''}
    ${oppId?line(oppId,op,true):''}
    ${uf?`<div class="cl-blk"><div class="cl-blk-l">Árbitro</div><div class="cl-blk-v cl-strong">${escC(ref)}</div></div>`:'<div class="cl-jogo-empty">Sem jogo marcado nesta rodada.</div>'}
    <div class="cl-blk"><div class="cl-blk-l">Moral do elenco</div><div class="cl-bar cl-bar-moral" style="--val:${moral}"><div class="cl-bar-fill" style="width:${moral}%"></div></div></div>
  </div>`;
}
function panViewJogador(vid){
  const sq=squad(vid)||[];
  const p=sq.find(x=>x.pid===CL.viewSelPlayer)||sq[0]; if(!p) return '<div class="cl-jgd">Sem jogadores.</div>';
  const hist=careerHistTotals(p);
  const statusBar = p.suspended>0 ? `<div class="cl-jgd-status susp">🟥 Suspenso — falta o próximo jogo</div>`
    : p.injuredMatches>0 ? `<div class="cl-jgd-status hurt">✚ Lesionado — fora por ${p.injuredMatches} jogo${p.injuredMatches>1?'s':''}</div>` : '';
  const ctry=clubCountry(clubOf(vid));
  return `<div class="cl-jgd">
    <div class="cl-jgd-name">${escC(p.n)}</div>
    <div class="cl-jgd-nat"><span class="cl-flag2">${flagImg(p.nat||ctry.name)}</span> ${escC(p.nat||ctry.name)}</div>
    ${statusBar}
    <div class="cl-jgd-row"><span>Posição</span><b>${posLetter(p.s)}</b></div>
    <div class="cl-jgd-row"><span>Força</span><b>${p.f}</b></div>
    <div class="cl-jgd-row"><span>Idade</span><b>${p.age||'-'} anos</b></div>
    <div class="cl-jgd-row"><span>Comportamento</span><b>${playerBehaviorLabel(p)}</b></div>
    <div class="cl-jgd-row"><span>Gols nesta temporada</span><b>${(S.scorers&&S.scorers[p.n])||0}</b></div>
    <div class="cl-jgd-row"><span>Salário</span><b>${fmt(playerSalary(p))}/sem</b></div>
    <div class="cl-jgd-row"><span>Valor de mercado</span><b>${curSym()} ${moneyDisp(p.mv)}</b></div>
    <fieldset class="cl-hist"><legend>Historial (carreira)</legend>
      <div class="cl-hist-row"><span>Jogos</span><b>${hist.apps}</b></div>
      <div class="cl-hist-row"><span>Gols</span><b>${hist.goals}</b></div>
      <div class="cl-hist-row"><span>Cartões amarelos</span><b>${hist.yellows}</b></div>
      <div class="cl-hist-row"><span>Cartões vermelhos</span><b>${hist.reds}</b></div>
      <div class="cl-hist-row"><span>Lesões</span><b>${hist.injuries}</b></div>
      <div class="cl-hist-row"><span>Notas recentes</span><b class="cl-hist-notas">${
        ((p.stats&&p.stats.r3)||[]).length
          ? (p.stats.r3.map(n=>`<span class="cl-nota ${notaCls(n)}">${notaTxt(n)}</span>`).join(''))
          : '—'}</b></div>
    </fieldset>
  </div>`;
}
function panViewAdversario(oppId){
  if(!oppId) return `<div class="cl-adv">Sem adversário nesta rodada.</div>`;
  const r=ratings(oppId,false); const forca=Math.max(6,Math.min(100,Math.round((r.OS+r.DS)/2)));
  const rnd=rngFrom(hashC(oppId)); const coach=COACHES_C[Math.floor(rnd()*COACHES_C.length)];
  return `<div class="cl-adv">
    <div class="cl-adv-big"><span class="cl-link" onclick="clViewTeam('${oppId}')">${escC(clubOf(oppId).short)}</span></div>
    <div class="cl-bar cl-bar-lg"><div class="cl-bar-fill" style="width:${forca}%"></div></div>
    <div class="cl-adv-coach"><span>Treinador</span><b>${escC(coach)}</b></div>
  </div>`;
}

/* ---- painel: JOGO ---- */
function tableRow(id){ const t=(S.table&&S.table[id])||{P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0}; return t; }
function panJogo(oppId,home,uf,nm){
  const me=tableRow(CL.clubId), op=oppId?tableRow(oppId):null;
  const rnd=rngFrom(uf?(hashC(uf[0])+hashC(uf[1])):(nm?hashC(nm.h)+hashC(nm.a):12345));
  const ref=REFS_C[Math.floor(rnd()*REFS_C.length)];
  const moral=Math.round(squad(CL.clubId).reduce((s,p)=>s+(p.moral||70),0)/Math.max(1,squad(CL.clubId).length));
  const line=(id,t,blue)=>`<div class="cl-grow ${blue?'blue':''}"><span class="cl-gname">${escC((anyClubOf(id)||{short:String(id)}).short)}</span>
     <span class="cl-gnums"><b>${t.P}</b><b>${t.W}</b><b>${t.D}</b><b>${t.GF}:${t.GA}</b><b>${t.Pts}</b></span></div>`;
  // Numa semana de COPA a linha de tabela da liga não diz nada sobre o confronto (o adversário
  // pode nem estar na tabela do usuário — é de outra divisão ou de outro país, e sairia tudo
  // zerado). Nesse caso o painel abre com o confronto e a fase da competição.
  const cupHead = (nm && nm.kind==='cup') ? `<div class="cl-jogo-cup">
      <div class="cl-jogo-cup-comp">${trophyImg(nm.cupKey,20)||'🏆'} ${escC(nm.comp)}</div>
      <div class="cl-jogo-cup-fase">${escC(nm.fase)}</div>
      <div class="cl-jogo-cup-vs"><span>${escC((anyClubOf(nm.h)||{short:''}).short)}</span><i>×</i><span>${escC((anyClubOf(nm.a)||{short:''}).short)}</span></div>
      <div class="cl-jogo-cup-loc">Você joga ${nm.home?'em casa':'fora de casa'}${nextMatchDayLabel(nm)?` · <b>${escC(nextMatchDayLabel(nm))}</b>`:''}</div>
    </div>` : '';
  return `<div class="cl-jogo">
    ${cupHead}
    ${uf?line(CL.clubId,me,false):''}
    ${uf&&oppId?line(oppId,op,true):''}
    <div class="cl-blk"><div class="cl-blk-l">Árbitro</div><div class="cl-blk-v cl-strong">${escC(ref)}</div></div>
    <div class="cl-blk"><div class="cl-blk-l">Dinheiro em caixa</div><div class="cl-blk-v">${spellMoney(S.budget)}</div></div>
    <div class="cl-blk"><div class="cl-blk-l"><span class="cl-tip-label" title="${escC(moralTipText())}">Moral do Time</span>${moral<40?' <span class="cl-risk-flag">⚠️ baixa</span>':''}</div><div class="cl-bar cl-bar-moral" style="--val:${moral}"><div class="cl-bar-fill" style="width:${moral}%"></div></div></div>
    <div class="cl-blk">${jobSecurityBarHTML({dark:true})}</div>
  </div>`;
}
function moralTipText(){ return 'Moral baixa (elenco abaixo de 50 em média) reduz o desempenho do time em até 15% nas partidas, e também pesa negativamente na Segurança no cargo.'; }
function hashC(s){ s=String(s); let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h; }

/* ---- painel: JOGADOR ---- */
/* comportamento é um traço FIXO do jogador (Casca-Grossa, Brigão, Encrenqueiro,
   Discreto, Manso, Exemplar) — sorteado uma vez na criação
   e nunca muda; afeta cartão, lesão e valor de mercado de verdade (ver app.js). */
function playerBehaviorLabel(p){ return p.behavior || 'Exemplar'; }
/* Historial (carreira) — soma o que já foi acumulado em temporadas passadas (p.careerStats,
   ver endSeason() em core.js) com a temporada em curso (p.stats), pra sobreviver a
   newSeasonReset() sem perder dado nenhum de uma temporada pra outra. Gols usa a MESMA fonte
   da Artilharia (S.allTimeScorers + S.scorers, ambas por nome) em vez de um contador próprio —
   garante que o Historial NUNCA diverge de "Melhores marcadores de sempre"/"da temporada". */
function careerHistTotals(p){
  const cs=p.careerStats||{}, st=p.stats||{};
  return {
    apps:(cs.apps||0)+(st.apps||0),
    goals:((S.allTimeScorers&&S.allTimeScorers[p.n])||0)+((S.scorers&&S.scorers[p.n])||0),
    yellows:(cs.yellows||0)+(st.yellows||0),
    reds:(cs.reds||0)+(st.reds||0),
    injuries:(cs.injuries||0)+(st.injuries||0)
  };
}
/* ---- O QUE A FORÇA FAZ NA PARTIDA (texto do tooltip) ----
   Números REAIS do motor, não uma explicação genérica: a escala de exibição é comprimida por
   engForce antes de entrar na conta (senão time forte viraria goleada), a energia multiplica por
   0.6+0.4*energia/100 (ver sessionRatingsFromPlayers), e o resultado alimenta o setor da posição.
   O goleiro tem curva própria (engForceGK, bem menos comprimida). */
const SETOR_FORCA={GK:'Defesa (com a zaga)', DEF:'Defesa', MID:'Meio-campo', ATT:'Ataque'};
function forcaImpactoTexto(p){
  if(!p || typeof p.f!=='number') return '';
  const R=(typeof REBAL!=='undefined')?REBAL:null;
  const eF=(p.s==='GK') ? (R&&R.engForceGK) : (R&&R.engForce);
  if(!eF) return '';
  const base=eF(p.f), en=(p.energy!=null?p.energy:100);
  const comEnergia=base*(0.6+0.4*en/100);
  const n=x=>String(Math.round(x*10)/10).replace('.',',');
  const setor=SETOR_FORCA[p.s]||'time';
  // a compressão só existe acima de 49 — mencioná-la num jogador de Série D (força ~10) seria ruído
  const comprime = p.f>49
    ? ` (a escala comprime acima de 49 pra time forte não virar goleada${p.s==='GK'?'; goleiro comprime menos':''})`
    : '';
  return `Força ${p.f} vale ${n(base)} no motor${comprime}.`
    + ` Com ${Math.round(en)}% de energia, entra como ${n(comEnergia)} na média do ${setor}.`
    + ` É a média do setor — não a força de um jogador — que decide quem cria mais chance na partida.`;
}
/* ---- FORÇA: atual, de onde veio, e o que o treino rendeu ----
   O cone do elenco só dizia "está em treino". Aqui dá pra ver se rendeu: a força de agora, a de
   antes da última mudança, e a variação desde que o acompanhamento começou. */
function forcaBlocoHTML(p){
  const g=(typeof growthOf==='function')?growthOf(p):{atual:p.f,anterior:p.f,delta:0,hist:[]};
  const treino=(typeof isInTraining==='function') && isInTraining(CL.clubId,p.pid);
  const seta=g.delta>0?'<span class="cl-rtrend up">▲</span>':g.delta<0?'<span class="cl-rtrend down">▼</span>':'';
  const dl = g.delta>0?`+${g.delta}`:g.delta<0?String(g.delta):'—';
  const desde = g.hist.length ? g.hist[0].f : g.atual;          // força na 1ª leitura registrada
  const total = g.atual-desde;
  const totalTxt = total>0?`+${total}`:total<0?String(total):'estável';
  const linhaMudanca = g.delta!==0
    ? `<div class="cl-forca-sub">Antes <b>${g.anterior}</b> → agora <b>${g.atual}</b> ${seta} <i>(mudou na ${(g.desdeR!=null?g.desdeR+1:'?')}ª semana)</i></div>`
    : `<div class="cl-forca-sub">Sem mudança desde a última leitura.</div>`;
  const linhaTotal = g.hist.length>1
    ? `<div class="cl-forca-sub">Desde que passei a acompanhar: <b>${desde}</b> → <b>${g.atual}</b> (<b>${totalTxt}</b>)</div>`
    : `<div class="cl-forca-sub"><i>Acompanhamento começa agora — a próxima rodada já mostra a variação.</i></div>`;
  const linhaTreino = treino
    ? `<div class="cl-forca-treino">${trainingConeImg(13)} Em treino especial — chance extra de evolução a cada rodada</div>` : '';
  /* PAINEL DE MÉTRICAS: Força e Nota lado a lado, no mesmo peso — são os dois números que
     resumem o jogador, e até aqui a nota não aparecia em lugar nenhum. Abaixo de cada um, em
     letra pequena, o contexto: quando a força mudou pela última vez e a forma das últimas
     partidas. Todo o "porquê" (histórico, gráfico e ritmo de evolução) desceu pra um <details>
     FECHADO por padrão — ele ocupava a tela inteira antes de qualquer outro dado do jogador. */
  const nota=playerNota(p), forma=playerForma(p);
  const notaSub = nota==null
    ? 'Ainda não entrou em campo nesta temporada'
    : `Forma (últimas ${(p.stats.r3||[]).length}): <b>${notaTxt(forma)}</b>${forma>=6.8?' — evoluindo':''}`;
  const forcaSub = g.delta!==0
    ? `Mudou na ${(g.desdeR!=null?g.desdeR+1:'?')}ª semana: <b>${g.anterior}</b> → <b>${g.atual}</b>`
    : 'Sem mudança desde a última leitura';
  const detalhesAbertos=!!CL.jgdDetOpen;
  return `<div class="cl-forca" title="${escC(forcaImpactoTexto(p))}">
    <div class="cl-metricas">
      <div class="cl-metrica">
        <div class="cl-metrica-lbl">Força</div>
        <div class="cl-metrica-n">${p.f}<span class="cl-forca-d ${g.delta>0?'up':g.delta<0?'down':''}">${dl}</span></div>
        <div class="cl-metrica-sub">${forcaSub}</div>
      </div>
      <div class="cl-metrica">
        <div class="cl-metrica-lbl">Nota</div>
        <div class="cl-metrica-n ${notaCls(nota)}">${notaTxt(nota)}</div>
        <div class="cl-metrica-sub">${notaSub}</div>
      </div>
    </div>
    ${linhaTreino}
    <details class="cl-jgd-det" ${detalhesAbertos?'open':''} ontoggle="CL.jgdDetOpen=this.open">
      <summary class="cl-jgd-det-h"><span>Como a força evolui</span><i>${detalhesAbertos?'fechar':'abrir'}</i></summary>
      <div class="cl-jgd-det-b">
        ${linhaMudanca}${linhaTotal}
        ${growthSparkHTML(g)}
        ${ritmoBlocoHTML(p)}
      </div>
    </details>
  </div>`;
}
/* ---- RITMO DE EVOLUÇÃO: o "porquê" ao lado do "quanto" ----
   O histórico acima diz que a força mudou; este bloco diz por quê e a que velocidade, com os
   mesmos números que o motor usa (growthProfileOf no core = leitura de evolvePlayer). Sem isso o
   usuário só via o resultado — inclusive o salto de 2-3 pontos de uma vez, que vem da curva da
   divisão e não de nada que ele fez. */
function ritmoBlocoHTML(p){
  const g=(typeof growthProfileOf==='function')?growthProfileOf(p):null; if(!g) return '';
  const r=ritmoLabel(g.forcaPorTemporada);
  const linhas=g.fontes.map(f=>
    `<div class="cl-ritmo-l ${f.sinal>0?'up':'down'}"><span>${f.sinal>0?'▲':'▼'} ${escC(f.label)}</span><b>${ritmoPct(f.chance)}/rodada</b></div>`).join('');
  const vazio=`<div class="cl-ritmo-l flat"><span>${p.age>=31?'Fora da faixa de crescimento pela idade':'Precisa jogar bem (nota ≥ 6,8) ou entrar em treino especial'}</span></div>`;
  // quanto vale 1 ponto de atributo em força AQUI — é o número que explica o "salto"
  // ≥0,9 = um único ponto de atributo já mexe a Força inteira: é aí que o crescimento deixa de ser
  // suave e vira degrau (na Série D isso começa em força bruta 58 — ver BANDS em rebalance.js).
  const salto=Math.round(g.porPonto*10)/10;
  const notaSalto=salto>=0.9
    ? `<div class="cl-ritmo-nota">Nesta faixa da escala, cada ponto de atributo vale ~<b>${String(salto).replace('.',',')}</b> de Força — por isso ele sobe em saltos, não de 1 em 1.</div>`
    : '';
  return `<div class="cl-ritmo">
    <div class="cl-ritmo-top">Ritmo de evolução <b class="cl-ritmo-${r.cls}">${r.txt}</b>
      <i>${ritmoNum(g.forcaPorTemporada)} de força / temporada no ritmo de agora</i></div>
    ${linhas||vazio}${notaSalto}
  </div>`;
}
/* mini-gráfico das mudanças — barras em ordem CRONOLÓGICA (esquerda = mais antiga). Os rótulos
   das pontas são a primeira e a força atual, não mín/máx: com mín/máx eles sugeriam um eixo
   crescente da esquerda pra direita, que não é o que as barras mostram. */
function growthSparkHTML(g){
  const h=g.hist||[]; if(h.length<2) return '';
  const vals=h.map(x=>x.f), min=Math.min(...vals), max=Math.max(...vals), span=(max-min)||1;
  const barras=h.map((x,i)=>{
    const pct=8+Math.round(92*(x.f-min)/span);
    const quando=(x.r!=null?(x.r+1)+'ª semana':'início');
    return `<span class="cl-spark-b ${i===h.length-1?'now':''}" title="${quando} · força ${x.f}"><i style="height:${pct}%"></i></span>`;
  }).join('');
  return `<div class="cl-spark">
    <span class="cl-spark-lbl">${h[0].f}</span>
    <span class="cl-spark-bars">${barras}</span>
    <span class="cl-spark-lbl now">${h[h.length-1].f}</span>
  </div>`;
}
function panJogador(){
  const p=squad(CL.clubId).find(x=>x.pid===CL.selPlayer)||squad(CL.clubId)[0]; if(!p) return '';
  if(CL.rightMode==='renovar') return renewPanel(p);
  if(CL.rightMode==='vender') return venderPanel(p);
  const hist=careerHistTotals(p);
  const statusBar = p.suspended>0 ? `<div class="cl-jgd-status susp">🟥 Suspenso — falta o próximo jogo</div>`
    : p.injuredMatches>0 ? `<div class="cl-jgd-status hurt">✚ Lesionado — fora por ${p.injuredMatches} jogo${p.injuredMatches>1?'s':''}</div>` : '';
  return `<div class="cl-jgd cl-pan">
    <div class="cl-pan-scroll">
    <div class="cl-jgd-name">${escC(p.n)}</div>
    <div class="cl-jgd-nat"><span class="cl-flag2">${flagImg(p.nat||'Brasil')}</span> ${escC(p.nat||'Brasil')}</div>
    ${statusBar}
    ${forcaBlocoHTML(p)}
    <div class="cl-jgd-row"><span>Idade</span><b>${p.age||'-'} anos</b></div>
    <div class="cl-jgd-row"><span>Comportamento</span><b>${playerBehaviorLabel(p)}</b></div>
    <div class="cl-jgd-row"><span>Gols nesta temporada</span><b>${(S.scorers&&S.scorers[p.n])||0}</b></div>
    <div class="cl-jgd-row"><span>Salário</span><b>${fmt(playerSalary(p))}/sem</b></div>
    <div class="cl-jgd-row"><span>Valor de mercado</span><b>${curSym()} ${moneyDisp(p.mv)}</b></div>
    <fieldset class="cl-hist"><legend>Historial (carreira)</legend>
      <div class="cl-hist-row"><span>Jogos</span><b>${hist.apps}</b></div>
      <div class="cl-hist-row"><span>Gols</span><b>${hist.goals}</b></div>
      <div class="cl-hist-row"><span>Cartões amarelos</span><b>${hist.yellows}</b></div>
      <div class="cl-hist-row"><span>Cartões vermelhos</span><b>${hist.reds}</b></div>
      <div class="cl-hist-row"><span>Lesões</span><b>${hist.injuries}</b></div>
      <div class="cl-hist-row"><span>Notas recentes</span><b class="cl-hist-notas">${
        ((p.stats&&p.stats.r3)||[]).length
          ? (p.stats.r3.map(n=>`<span class="cl-nota ${notaCls(n)}">${notaTxt(n)}</span>`).join(''))
          : '—'}</b></div>
    </fieldset>
    </div>
    <div class="cl-pan-foot">${btn('Renovar contrato','clRenew()',{icon:'🔄',cls:'cl-btn-ok'})}${btn('Vender','clSell()',{icon:'💰',cls:'cl-btn-cancel'})}</div>
  </div>`;
}
function renewPanel(p){
  const currentSalary = (p.contract && p.contract.salary) || 0;
  const currentYears = (p.contract && p.contract.years) || 0;
  const newYears = 3;
  const weeksPerYear = S.sched.length||38; // 1 rodada = 1 semana de débito real (ver processFinances) — a temporada
  const totalCost = CL.newSalary * newYears * weeksPerYear; // tem 38 rodadas, não 52 semanas fixas
  const currentBudget = S.budget;
  const budgetAfterRenew = currentBudget - totalCost;
  const budgetWarning = budgetAfterRenew < 0 ? ' ⚠️' : '';
  return `<div class="cl-renew cl-pan">
  <div class="cl-pan-scroll">
  <div class="cl-renew-title">Renovar contrato</div>
  <div style="color:#fff;font-size:13px;margin-bottom:24px;padding:12px;background:#1a3a1a;border-radius:4px">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Salário atual <span style="opacity:.7">(semanal)</span>:</span><b>${fmt(currentSalary)}/sem</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Tempo restante:</span><b>${currentYears} ano(s)</b></div>
    <div style="display:flex;justify-content:space-between;border-top:1px solid #2a4a2a;padding-top:8px;margin-top:8px"><span>Novo salário <span style="opacity:.7">(semanal)</span>:</span><b>${fmt(CL.newSalary)}/sem</b></div>
  </div>
  <div class="cl-renew-row"><span>Novo salário (semanal):</span>
    <span class="cl-spin"><span id="cl-sal" class="cl-spin-v">${grp(CL.newSalary)}</span>
      <span class="cl-spin-btns"><button onclick="clSalaryStep(1)">▲</button><button onclick="clSalaryStep(-1)">▼</button></span></span></div>
  <div style="color:#fff;font-size:13px;margin-bottom:20px;padding:12px;background:#2a3a2a;border-radius:4px">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Duração do contrato:</span><b>${newYears} ano(s) · ${weeksPerYear} rodadas/ano</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Custo total do contrato:</span><b>${fmt(totalCost)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Caixa atual:</span><b>${curSym()} ${moneyDisp(currentBudget)}</b></div>
    <div style="display:flex;justify-content:space-between;border-top:1px solid #3a4a3a;padding-top:8px;margin-top:8px"><span>Caixa após renovação:</span><b>${curSym()} ${moneyDisp(budgetAfterRenew)}${budgetWarning}</b></div>
  </div>
  </div>
  <div class="cl-pan-foot">${btn('Propôr','clRenewPropose()',{icon:'🔄',cls:'cl-btn-ok'})}${btn('Cancelar','clCancelRight()',{icon:'✖',cls:'cl-btn-cancel'})}</div>
</div>`; }
/* piso de venda: 70% do valor de mercado, arredondado. Abaixo disso é subvalorizar o
   jogador (queima de ativo) — a janela avisa em vermelho. */
function sellMinPrice(mv){ return Math.round((mv||0)*0.7/10000)*10000; }
function venderPanel(p){
  const askingPrice = CL.sellPrice ? parseInt(CL.sellPrice) : 0;
  const mv = p.mv || 0;
  const minPrice = sellMinPrice(mv);
  const diff = askingPrice - mv;
  const diffPct = mv > 0 ? Math.round((diff / mv) * 100) : 0;
  const diffLabel = diff > 0 ? `+${moneyDisp(diff)} (+${diffPct}%)` : diff < 0 ? `${moneyDisp(diff)} (${diffPct}%)` : 'Preço igual';
  const belowMin = askingPrice > 0 && askingPrice < minPrice;
  // PISO DE ELENCO: o clube não pode ficar sem goleiro (ver canReleaseFromSquad no core). Avisa
  // ANTES, aqui na tela, em vez de deixar o usuário digitar o preço e só então recusar.
  const floor=(typeof canReleaseFromSquad==='function')?canReleaseFromSquad(CL.clubId,p):{ok:true};
  if(!floor.ok) return `<div class="cl-vender cl-pan">
  <div class="cl-pan-scroll">
  <div class="cl-vender-title">Vender</div>
  <div class="cl-sell-warn" style="margin-bottom:16px">🧤 ${escC(floor.msg)}</div>
  </div>
  <div class="cl-pan-foot">${btn('Voltar','clCancelRight()',{icon:'✖',cls:'cl-btn-cancel'})}</div>
</div>`;
  return `<div class="cl-vender cl-pan">
  <div class="cl-pan-scroll">
  <div class="cl-vender-title">Vender</div>
  <div style="color:#fff;font-size:13px;margin-bottom:20px;padding:12px;background:#3a2a2a;border-radius:4px">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Valor de mercado <span style="opacity:.7">(preço sugerido)</span>:</span><b>${moneyDisp(mv)}</b></div>
    <div class="cl-sell-min"><span>Preço mínimo:</span><b>${moneyDisp(minPrice)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-top:8px"><span>Preço pedido:</span><b id="cl-sellprice-asked">${askingPrice > 0 ? moneyDisp(askingPrice) : '-'}</b></div>
  </div>
  <div class="cl-vender-lbl">Preço de venda pedido<br><span id="cl-sellprice-diff" style="font-size:12px;opacity:.8;color:#aaa">${diffLabel}</span></div>
  <div id="cl-sellprice-warn" class="cl-sell-warn" style="${belowMin?'':'display:none'}">⚠ Abaixo do preço mínimo — você está subvalorizando o jogador.</div>
  <div class="cl-money-field">
    <span class="cl-money-cur">${curSym()}</span>
    <input id="cl-sellprice" class="cl-money-in" inputmode="numeric" placeholder="${grp(mv)}" value="${CL.sellPrice?moneyDisp(CL.sellPrice):''}" oninput="clSellPriceInput(this)">
  </div>
  </div>
  <div class="cl-pan-foot">${btn('Vender','clSellConfirm()',{icon:'💰',cls:'cl-btn-ok'})}${btn('Cancelar','clCancelRight()',{icon:'✖',cls:'cl-btn-cancel'})}</div>
</div>`; }

/* ---- Jogador > Comprar jogador: primeiro escolhe a DIVISÃO, depois o clube dela ---- */
const MKT_DIV_LEGEND={A:'Série A — 1ª Divisão',B:'Série B — 2ª Divisão',C:'Série C — 3ª Divisão',D:'Série D — 4ª Divisão'};
/* legenda de divisão universo-consciente: usa o nome brasileiro quando é o universo Brasil,
   senão o rótulo da divisão do universo ativo (Premier League, Championship, La Liga...). */
function divLegend(d){ return MKT_DIV_LEGEND[d] || (typeof DIV_LABEL_FULL!=='undefined'&&DIV_LABEL_FULL[d]) || d; }
function clMarketClubs(){ CL.menu=null;
  if(!canNegotiate()){ toastC(windowClosedMsg()); return; }
  CL.market={step:'divisions'};
  // divisões do universo do usuário
  let rows=DIV_ORDER.map(d=>{
    const isOwn=d===S.division;
    const count=isOwn ? DATA.clubs.length : ((S.otherDivs&&S.otherDivs[d])?S.otherDivs[d].clubs.length:0);
    return `<div class="cl-mkt-club" onclick="clMarketDivision('${d}')">
      ${divisionTrophyImg(d,28)||'<span class="cl-divopt-ic">🏆</span>'}
      <span class="cl-mkt-club-n">${escC(divLegend(d))}${isOwn?' <b>(sua divisão)</b>':''}</span>
      <span class="cl-mkt-club-ov">${count} clubes</span>
    </div>`;
  }).join('');
  // + ligas de background (outros países): dá pra buscar/comprar jogadores delas também
  const bg=S.bgLeagues||{};
  Object.keys(bg).forEach(country=>{
    Object.keys(bg[country].divs).forEach(d=>{
      const count=(bg[country].divs[d].clubIds||[]).length;
      rows += `<div class="cl-mkt-club" onclick="clMarketDivision('${d}','${country}')">
        <span class="cl-divopt-ic">${flagImg(country)}</span>
        <span class="cl-mkt-club-n">${escC(country)} — ${escC(bgDivLabel(country,d))}</span>
        <span class="cl-mkt-club-ov">${count} clubes</span></div>`;
    });
  });
  overlayC(dlg('Comprar jogador — escolha a liga', `<div class="cl-mkt-clublist">${rows}</div>
    <div class="cl-cal-ok">${btn('Fechar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}</div>`,
    {w:560,bodyClass:'cl-body-gray',min:true}));
}
/* ---- clubes daquela divisão específica (country = país de background, se houver) ---- */
function clMarketDivision(division,country){
  CL.market={step:'clubs',division,country};
  let clubs;
  if(country){ // liga de background: clubes vêm de S.bgLeagues (bgClubById cobre intl E Brasil-bg)
    const L=S.bgLeagues&&S.bgLeagues[country];
    clubs=(L&&L.divs[division]?L.divs[division].clubIds:[]).map(id=>bgClubById(id)).filter(Boolean);
  } else {
    const isOwn=division===S.division;
    // outras divisões: S.otherDivs[d].clubs pode ser STUB {id} (a virada server-side grava só o id;
    // metadados ficam em S.clubPool) — resolve cada um pelo registro completo, senão a lista aparece
    // "vazia"/sem nome. Mesmo motivo do clubOf. clubOf cai pro S.clubPool quando o clube é stub.
    clubs=isOwn ? DATA.clubs.filter(c=>c.id!==CL.clubId)
      : ((S.otherDivs&&S.otherDivs[division]) ? (S.otherDivs[division].clubs||[]).map(c=>clubOf(c.id)||c).filter(Boolean) : []);
  }
  const cq=country?`,'${country}'`:'';
  const rows=clubs.map(c=>`<div class="cl-mkt-club" onclick="clMarketSquad('${c.id}'${cq})" style="${clubEdge(c)}">
      <span class="cl-mkt-club-n">${escC(c.short)}</span><span class="cl-mkt-club-ov">força ${c.overall||Math.round(((c.OS||0)+(c.MS||0)+(c.DS||0))/3)}</span>
    </div>`).join('') || '<div class="cl-mkt-counter">Sem clubes disponíveis nessa liga ainda.</div>';
  const title=country?`${escC(country)} — ${escC(bgDivLabel(country,division))}`:escC(divLegend(division));
  overlayC(dlg('Comprar jogador — '+title, `<div class="cl-mkt-clublist">${rows}</div>
    <div class="cl-cal-ok">${btn('Voltar','clMarketClubs()',{icon:'↩',cls:'cl-btn-cancel'})}</div>`,
    {w:560,bodyClass:'cl-body-gray',min:true}));
}
/* ---- elenco do clube escolhido ---- */
function clMarketSquad(clubId,country){
  const division=(CL.market&&CL.market.division)||S.division;
  if(country) ensureBgClubMaterialized(clubId); // materializa o elenco real do clube de background
  CL.market={step:'squad',clubId,division,country};
  // MESMA tabela do meu elenco (squadTableHTML): cabeçalho visível e as mesmas colunas/valores,
  // em vez da lista própria que existia aqui. O valor de mercado do jogador aparece ao clicar
  // nele (tela da proposta), que é onde ele importa pra negociação.
  const rows=squadTableHTML(clubId, {onclick:p=>`clMarketPlayer('${clubId}','${escC(p.n)}')`});
  const backArg=country?`'${division}','${country}'`:`'${division}'`;
  overlayC(dlg('Elenco — '+clubOf(clubId).short, `<div class="cl-roster cl-mkt-roster">${rows}</div>
    <div class="cl-cal-ok">${btn('Voltar','clMarketDivision('+backArg+')',{icon:'↩',cls:'cl-btn-cancel'})}</div>`,
    {w:640,bodyClass:'cl-body-gray',min:true}));
}
/* ---- detalhe do jogador + início da proposta (Dia 1: taxa) ---- */
function clMarketPlayer(clubId,name){
  const p=findP(name,clubId); if(!p) return;
  if(typeof isTradeLocked==='function' && isTradeLocked(p)){ toastC(`${p.n} foi negociado nesta temporada e ainda não pode ser negociado de novo.`); return; }
  const ask=playerAsk(p,clubId);
  CL.market={step:'offer',clubId,player:name,offer:Math.round(ask/1000)*1000,negoIdx:null};
  renderMarketOffer();
}
/* clube humano: nada de negociação algorítmica (fee/terms/verdict é feito pra responder à CPU) —
   manda uma PROPOSTA REAL, que o outro treinador aceita/recusa/negocia no e-mail dele (ver
   sendHumanOffer/acceptIncomingOffer/counterHumanOffer em core.js). */
function renderMarketOfferHuman(){
  const M=CL.market; const p=findP(M.player,M.clubId); if(!p){ clCloseOverlay(); return; }
  const humanName=(CL.humans&&CL.humans[M.clubId])||'';
  const body=`<div class="cl-mkt-offer">
    <div class="cl-mkt-offer-hd">${escC(p.n)} <span>(${escC(clubOf(M.clubId).short)}${humanName?' · '+escC(humanName):''})</span></div>
    <div class="cl-mkt-offer-row"><span>Força</span><b>${p.f}</b></div>
    <div class="cl-mkt-offer-row"><span>Valor de mercado</span><b>${curSym()} ${moneyDisp(p.mv)}</b></div>
    <div class="cl-mkt-counter">Este jogador é de outro treinador humano. Sua proposta vai direto pro e-mail dele — ele decide aceitar, recusar ou negociar.</div>
    <div class="cl-mkt-offer-row"><span>Sua proposta</span>
      <span class="cl-money-field"><span class="cl-money-cur">${curSym()}</span>
        <input class="cl-money-in" id="cl-mkt-fee" inputmode="numeric" placeholder="0" value="${M.offer?moneyDisp(M.offer):''}" oninput="CL.market.offer=curParse(clMoneyInputReformat(this))"></span></div>
    ${btn('Enviar proposta','clMarketSendHumanOffer()',{cls:'cl-btn-mini'})}
  </div>`;
  overlayC(dlg('Fazer proposta', body+`<div class="cl-cal-ok">${btn('Voltar','clMarketSquad(\''+M.clubId+'\')',{icon:'↩',cls:'cl-btn-cancel'})}</div>`,
    {w:560,bodyClass:'cl-body-gray',min:true}));
}
function clMarketSendHumanOffer(){
  const M=CL.market;
  const r=sendHumanOffer(M.clubId, M.player, M.offer);
  toastC(r.msg);
  if(r.ok){ saveV3(); clCloseOverlay(); cdraw(); } else renderMarketOfferHuman();
}
function renderMarketOffer(){
  const M=CL.market; const p=findP(M.player,M.clubId); if(!p){ clCloseOverlay(); return; }
  if(CL.online && CL.humans && CL.humans[M.clubId]){ renderMarketOfferHuman(); return; }
  const nego = M.negoIdx!=null ? S.negos[M.negoIdx] : null;
  let body;
  if(!nego || nego.stage==='fee' || nego.stage==='counterFee'){
    // "Igualar pedido": um clique põe o valor pedido pelo clube no campo E propõe. Sem isto o
    // usuário tinha que ler o número, apagar o campo e redigitar a mesma quantia pra seguir a
    // negociação — o caminho de longe mais comum depois de uma contraproposta.
    const hint = nego && nego.stage==='counterFee' ? `<div class="cl-mkt-counter">O clube pediu um valor a partir de ${curSym()} ${moneyDisp(nego.clubCounter)}. Ofereça esse valor (ou mais) ou desista.
        <div class="cl-mkt-match">${btn('Igualar pedido ('+fmt(nego.clubCounter)+')','clMarketMatchCounter()',{icon:'=',cls:'cl-btn-ok cl-btn-mini'})}</div>
      </div>` : '';
    body = `<div class="cl-mkt-offer">
      <div class="cl-mkt-offer-hd">${escC(p.n)} <span>(${escC(clubOf(M.clubId).short)})</span></div>
      <div class="cl-mkt-offer-row"><span>Força</span><b>${p.f}</b></div>
      <div class="cl-mkt-offer-row"><span>Valor de mercado</span><b>${curSym()} ${moneyDisp(p.mv)}</b></div>
      ${hint}
      <div class="cl-mkt-offer-row"><span>Sua proposta (taxa)</span>
        <span class="cl-money-field"><span class="cl-money-cur">${curSym()}</span>
          <input class="cl-money-in" id="cl-mkt-fee" inputmode="numeric" placeholder="0" value="${M.offer?moneyDisp(M.offer):''}" oninput="CL.market.offer=curParse(clMoneyInputReformat(this))"></span></div>
      ${btn('Propor','clMarketProposeFee()',{cls:'cl-btn-mini'})}
    </div>`;
  } else if(nego.stage==='terms'){
    body = `<div class="cl-mkt-offer">
      <div class="cl-mkt-offer-hd">${escC(p.n)} — taxa acertada em ${fmt(nego.offerFee)}</div>
      <div class="cl-mkt-offer-row"><span>Salário semanal oferecido</span>
        <span class="cl-money-field"><span class="cl-money-cur">${curSym()}</span>
          <input class="cl-money-in" id="cl-mkt-sal" inputmode="numeric" placeholder="0" value="${nego.salary?moneyDisp(nego.salary):''}" oninput="S.negos[${M.negoIdx}].salary=curParse(clMoneyInputReformat(this))"></span></div>
      <div class="cl-mkt-offer-row"><span>Papel no elenco</span>
        <select class="cl-mkt-sel" onchange="S.negos[${M.negoIdx}].role=this.value">
          ${['Jogador Chave','Titular Regular','Rotação','Jovem da Base'].map(r=>`<option ${nego.role===r?'selected':''}>${r}</option>`).join('')}
        </select></div>
      ${btn('Negociar termos','clMarketProposeTerms()',{cls:'cl-btn-mini'})}
    </div>`;
  } else if(nego.stage==='verdict'){
    const counterMsg = nego.agentCounter ? `<div class="cl-mkt-counter">Empresário pede ${fmt(nego.agentCounter)}/sem pra fechar.</div>
      ${btn('Aceitar contraproposta','clMarketAcceptCounter()',{cls:'cl-btn-mini'})}` : '';
    body = `<div class="cl-mkt-offer">
      <div class="cl-mkt-offer-hd">${escC(p.n)} — pronto pra fechar!</div>
      <div class="cl-mkt-offer-row"><span>Taxa</span><b>${fmt(nego.offerFee)}</b></div>
      <div class="cl-mkt-offer-row"><span>Salário</span><b>${fmt(nego.salary)}/sem</b></div>
      ${counterMsg}
      ${btn('Fechar negócio','clMarketFinalize()',{cls:'cl-btn-ok'})}
    </div>`;
  } else {
    body = `<div class="cl-mkt-offer"><div class="cl-mkt-offer-hd">${escC(p.n)}</div><div class="cl-mkt-counter">${escC(nego.status==='recusada'?'Negociação recusada.':'Negociação encerrada.')}</div></div>`;
  }
  overlayC(dlg('Fazer proposta', body+`<div class="cl-cal-ok">${btn('Voltar','clMarketSquad(\''+M.clubId+'\')',{icon:'↩',cls:'cl-btn-cancel'})}</div>`,
    {w:560,bodyClass:'cl-body-gray',min:true}));
}
/* iguala a contraproposta do clube e já propõe (ver o hint de counterFee em renderMarketOffer).
   Passa pelo MESMO clMarketProposeFee, então a resposta do clube segue a regra normal. */
function clMarketMatchCounter(){
  const M=CL.market; const nego = M.negoIdx!=null ? S.negos[M.negoIdx] : null;
  if(!nego || !nego.clubCounter){ toastC('Nada pra igualar aqui.'); return; }
  if(nego.clubCounter>S.budget){ toastC('Caixa insuficiente pra igualar esse pedido.'); return; }
  M.offer=nego.clubCounter;
  clMarketProposeFee();
}
function clMarketProposeFee(){ const M=CL.market;
  if(M.negoIdx==null) M.negoIdx=startNego(M.clubId,M.player,M.offer);
  else S.negos[M.negoIdx].offerFee=M.offer;
  const r=clubRespond(S.negos[M.negoIdx]);
  toastC(r.msg); renderMarketOffer();
}
function clMarketProposeTerms(){ const M=CL.market;
  const r=agentRespond(S.negos[M.negoIdx]); toastC(r.msg); renderMarketOffer();
}
function clMarketAcceptCounter(){ const M=CL.market; const n=S.negos[M.negoIdx];
  if(n.agentCounter) n.salary=n.agentCounter; renderMarketOffer();
}
function clMarketFinalize(){ const M=CL.market;
  const r=finalizeTransfer(M.negoIdx);
  toastC(r.msg);
  if(r.ok){ saveV3(); clCloseOverlay(); cdraw(); } else renderMarketOffer();
}

/* ---- Jogador > Leilão de jogadores (compra direta, sem regatear) ---- */
function clAuctionScreen(){ CL.menu=null;
  const st=transferWindowStatus();
  if(!st.open){ toastC(windowClosedMsg()); return; }
  if(typeof mergeAuctionBidsFromSeats==='function') mergeAuctionBidsFromSeats(); // traz os lances mais recentes dos outros humanos da sala antes de desenhar
  const lots=((S.auctions&&S.auctions.lots)||[]).filter(l=>l.status==='open');
  const rows=lots.map(l=>{ const p=findP(l.player,l.sellerId); if(!p) return ''; const c=clubOf(l.sellerId);
    const mine=l.leader===S.clubId;
    const otherHuman=!mine && l.leader && l.leader!=='cpu';
    const leadLabel = mine?'✅ Você na frente' : otherHuman?`🧑 ${escC((CL.humans&&CL.humans[l.leader])||'outro treinador')} na frente` : '🔨 CPU na frente';
    return `<div class="cl-auc-row ${mine?'me':''}">
      <div class="cl-auc-r1">
        <span class="cl-auc-club" style="${clubStripe(c)}">${clubLink(l.sellerId,c.short)}</span>
        <span class="cl-auc-p-pos">${posLetter(p.s)}</span><span class="cl-auc-p-n">${escC(p.n)}</span>
        <span class="cl-auc-p-f">${p.f}</span>
        <span class="cl-auc-price">${moneyDisp(l.bid)}</span>
      </div>
      <div class="cl-auc-r2">
        <span class="cl-auc-lead ${mine?'me':otherHuman?'human':'cpu'}">${leadLabel}</span>
        <span class="cl-auc-disp" title="clubes disputando">👥 ${l.interest}</span>
        <span class="cl-auc-rounds" title="rodadas restantes">⏳ ${l.roundsLeft}</span>
        ${btn(mine?'Aumentar lance':'Cobrir',`clAuctionBidPrompt('${l.sellerId}','${escC(l.player)}')`,{cls:'cl-btn-mini'})}
      </div>
    </div>`; }).join('') || '<div class="cl-mkt-counter">Sem jogadores em leilão agora — volta em breve.</div>';
  overlayC(dlg('Leilão de jogadores', `<div class="cl-auc-head">Cada jogador tem vários clubes disputando. Para levar, <b>cubra a maior oferta</b> antes das rodadas acabarem — se seu lance ficar abaixo do que a concorrência topa pagar, ela cobre na rodada seguinte.</div><div class="cl-auc">${rows}</div>
    <div class="cl-cal-ok">${btn('Fechar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}</div>`,
    {ad:'rf98.auction.footer',w:700,bodyClass:'cl-body-gray',min:true}));
}
/* dá/aumenta o lance num lote — abre um input de valor (precisa superar o maior lance atual) */
function clAuctionBidPrompt(sellerId,player){
  if(typeof mergeAuctionBidsFromSeats==='function') mergeAuctionBidsFromSeats(); // lance sugerido/validação com o valor mais recente conhecido
  const id=sellerId+'|'+player;
  const lot=((S.auctions&&S.auctions.lots)||[]).find(l=>l.id===id && l.status==='open');
  const p=findP(player,sellerId); if(!lot||!p){ toastC('Esse lote não está mais disponível.'); return; }
  const c=clubOf(sellerId);
  const suggest=Math.round(lot.bid + Math.max(50000, lot.bid*0.08));
  overlayC(dlg('Dar lance', `<div class="cl-jobmodal">
    <div class="cl-jobmodal-msg">Lance por <b>${escC(p.n)}</b> (${posLetter(p.s)}, força ${p.f}) do <b style="${clubStripe(c)};padding:2px 6px;border-radius:3px">${escC(c.short)}</b>.<br>
      Maior lance atual: <b>${curSym()} ${moneyDisp(lot.bid)}</b> ${lot.leader===S.clubId?'(seu)':(lot.leader&&lot.leader!=='cpu')?'(de '+escC((CL.humans&&CL.humans[lot.leader])||'outro treinador')+')':'(concorrência)'} · 👥 ${lot.interest} clubes · ⏳ ${lot.roundsLeft} rodada(s)<br>
      Seu caixa: <b>${curSym()} ${moneyDisp(S.budget)}</b></div>
    <div class="cl-auc-bidrow"><span class="cl-auc-cur">${curSym()}</span><input id="cl-auc-bid-in" class="cl-input cl-auc-bid-in" inputmode="numeric" value="${grp(suggest)}" oninput="clMoneyInputReformat(this)" onkeydown="if(event.key==='Enter')clAuctionBidGo('${sellerId}','${escC(player)}')"></div>
    <div class="cl-auc-bidhint">Precisa ser maior que ${moneyDisp(lot.bid)}. Para <b>garantir</b>, ofereça acima do que a concorrência topa pagar.</div>
    <div class="cl-jog-actions">${btn('Confirmar lance',`clAuctionBidGo('${sellerId}','${escC(player)}')`,{icon:'🔨',cls:'cl-btn-ok'})}${btn('Cancelar','clAuctionScreen()',{icon:'✖',cls:'cl-btn-cancel'})}</div>
  </div>`, {w:480,bodyClass:'cl-body-gray',min:true}));
}
function clAuctionBidGo(sellerId,player){
  const el=document.querySelector('#cl-auc-bid-in');
  const amount=el? parseInt((el.value||'').replace(/\D/g,''),10)||0 : 0;
  const r=placeAuctionBid(sellerId+'|'+player, amount);
  toastC(r.msg);
  if(r.ok){ saveV3(); clAuctionScreen(); } // volta pra lista já com o lance atualizado
}

/* ============================ MOMENTOS DA TEMPORADA ============================
   Oito modais de marco (título, acesso, queda, artilharia, abertura e final de copa), todos com a
   MESMA estrutura: vídeo com kicker/manchete por cima, faixa do clube, três cartões de número e
   rodapé com duas ações. Um mecanismo só — abrirMomento(id, dados) — em vez de oito marcações
   repetidas; o que muda por momento fica em MOMENTO_DEFS e nos dados que vêm do estado do jogo.

   VÍDEO: o caminho de cada momento fica no mapa abaixo, fácil de trocar quando os arquivos
   chegarem. Arquivo ausente NÃO quebra nada: a área fica preta e o modal abre igual (o <video> só
   é inserido quando há caminho, então não há request falhando nem erro no console).

   FILA: dois marcos podem cair no mesmo instante (campeão + artilheiro; acesso + artilheiro).
   Empilhar modal sobre modal esconde o de baixo, então eles entram numa fila e saem um por vez —
   ver enfileirarMomento/momentoSeguinte. */
/* COMO LIGAR O VÍDEO DE CADA MOMENTO: ponha o arquivo em public/video/ e troque o null pelo
   caminho ao lado. É a única mudança necessária — o modal já está pronto pra recebê-lo.
   Está null (e não com o caminho) de propósito: um caminho apontando pra arquivo inexistente faz
   o navegador pedir e falhar, sujando o console com 404 a cada abertura. Com null, o <video> nem
   é inserido: a área fica preta, que é exatamente o estado "sem vídeo ainda" pedido. */
/* `var` e não `const`, e no window: o painel publica vídeo novo e net/dados.js
   escreve neste mapa ao carregar (ver buscarMomentos). Com `const` de módulo o
   objeto ficava fora do alcance e a publicação não chegava ao jogo. */
window.VIDEOS_MOMENTO = {
  // MESMO vídeo de taça pros dois títulos, e de propósito: a cerimônia de campeão é a mesma
  // seja Série A, Série D ou uma copa continental de outro país. Os modais já se adaptam sozinhos
  // ao contexto — o troféu vem da divisão ou da competição, e o título/manchete do estado do jogo.
  'campeao-liga'  : 'video/momento-campeao.mp4',
  'campeao-copa'  : 'video/momento-campeao.mp4',
  // MESMO vídeo de artilheiro para liga e copa, e de propósito: a cena é a mesma seja o artilheiro
  // da Série D ou o da Libertadores. O que identifica a competição no modal é o kicker, o nome no
  // cabeçalho e o troféu — não o vídeo (ver rfArtilheiroHTML).
  'marcador-liga' : 'video/momento-artilheiro.mp4',
  'marcador-copa' : 'video/momento-artilheiro.mp4',
  'promovido'     : null,   // video/momento-promovido.mp4
  'rebaixado'     : null,   // video/momento-rebaixado.mp4
  'abertura-copa' : null,   // video/momento-abertura-copa.mp4
  'final-copa'    : null,   // video/momento-final-copa.mp4
  'crise'         : 'video/momento-crise.mp4',
};
/* corpo: tom da janela (yellow/green/gray). A regra de contraste da referência vem junto: em
   amarelo e cinza a linha de contexto é preta e o rodapé cinza-escuro; só no verde valem os tons
   claros do jogo. */
const MOMENTO_DEFS = {
  'campeao-liga' : { corpo:'yellow', kicker:'CAMPEÃO BRASILEIRO',        btnPri:'Comemorar',        btnSec:'Ver a tabela',      acao:'clClassif' },
  'campeao-copa' : { corpo:'yellow', kicker:'CAMPEÃO DA COPA DO BRASIL', btnPri:'Comemorar',        btnSec:'Ver o caminho',     acao:'cup' },
  'marcador-liga': { corpo:'green',  kicker:'ARTILHEIRO DA LIGA',        btnPri:'Fechado',          btnSec:'Ver o jogador',     acao:'jogador' },
  'marcador-copa': { corpo:'green',  kicker:'ARTILHEIRO DA COPA',        btnPri:'Fechado',          btnSec:'Ver o jogador',     acao:'jogador' },
  'promovido'    : { corpo:'yellow', kicker:'ACESSO CONQUISTADO',        btnPri:'Comemorar',        btnSec:'Ver o elenco',      acao:'elenco' },
  'rebaixado'    : { corpo:'gray',   kicker:'REBAIXAMENTO',              btnPri:'Seguir em frente', btnSec:'Ver a tabela',      acao:'clClassif' },
  'abertura-copa': { corpo:'green',  kicker:'A COPA COMEÇA HOJE',        btnPri:'Preparar o time',  btnSec:'Ver a escalação',   acao:'seleccao' },
  'final-copa'   : { corpo:'yellow', kicker:'FINAL DA COPA',             btnPri:'Entrar em campo',  btnSec:'Ver a escalação',   acao:'seleccao' },
  'crise'        : { corpo:'gray',   kicker:'CLIMA PESADO NO CLUBE',     btnPri:'Assumir a responsa', btnSec:'Ver a tabela',    acao:'clClassif' },
};
let MOMENTO_FILA=[];
function enfileirarMomento(id, dados){ if(!MOMENTO_DEFS[id]) return; MOMENTO_FILA.push({id,dados:dados||{}}); }
/* mostra o próximo da fila; nada na fila -> executa o `depois` (o fluxo que estava esperando) */
function momentoSeguinte(depois){
  const it=MOMENTO_FILA.shift();
  if(!it){ if(typeof depois==='function') depois(); return false; }
  abrirMomento(it.id, it.dados, ()=>momentoSeguinte(depois));
  return true;
}
function momentoAcao(acao){
  try{
    if(acao==='clClassif' && typeof clClassif==='function') return clClassif();
    if(acao==='cup' && typeof clCupView==='function') return clCupView('copaBrasil');
    if(acao==='jogador'){ CL.tab='jogador'; CL.screen='main'; return cdraw(); }
    if(acao==='elenco'){ CL.tab='equipa'; CL.screen='main'; return cdraw(); }
    if(acao==='seleccao'){ CL.tab='seleccao'; CL.screen='main'; return cdraw(); }
  }catch(e){ console.warn('ação do momento:', e&&e.message); }
}
/* ABRE UM MOMENTO. `dados` traz o que varia: manchete, linha de contexto, os três cartões
   ({k,v}), a nota do rodapé, a chave do troféu e o clube da faixa. Tudo opcional — o que faltar
   simplesmente não é desenhado, em vez de aparecer vazio. */
function abrirMomento(id, dados, aoFechar){
  const def=MOMENTO_DEFS[id]; if(!def) return;
  /* ===== O QUE O PAINEL DECIDE SOBRE ESTE MOMENTO =====
     Três perguntas, nesta ordem, e todas com a mesma regra de segurança: só
     um valor EXPLÍCITO tranca. Tabela que não respondeu deixa passar, como em
     todo o resto do jogo — celebração que some por causa de rede é pior do que
     celebração a mais.

     · ligado?            tira do ar um vídeo que saiu errado, sem publicar nada
     · passou na chance?  o botão que tira o ar de roteiro (ver a coluna chance)
     · cabe na temporada? teto de aparições, para o que pode repetir

     A CONTAGEM É LOCAL (CL), não vai para S: em sala de Resenha o S é estado
     partilhado, e um contador de modal do MEU clube não tem que viajar para os
     outros — nem a sorteada da chance pode divergir entre clientes e mexer no
     que é partilhado. É o mesmo sítio onde CL._momCopaVista já vive. */
  const cfg=(window.RF_MOMENTOS||{})[id];
  if(cfg){
    if(cfg.ativo === false){ if(typeof aoFechar==='function') aoFechar(); return; }
    const ch=(cfg.chance==null?100:cfg.chance);
    if(ch<100 && Math.random()*100 >= ch){ if(typeof aoFechar==='function') aoFechar(); return; }
    const teto=cfg.maxTemporada;
    if(teto!=null && teto>0){
      CL._momConta=CL._momConta||{};
      const marca=id+':'+(S.season||1);
      const n=CL._momConta[marca]||0;
      if(n>=teto){ if(typeof aoFechar==='function') aoFechar(); return; }
      CL._momConta[marca]=n+1;
    }
  }
  dados=dados||{};
  /* ===== O TITULO TEM TELA PROPRIA (pacote "modal celebracao copas/ligas") =====
     Copa e liga passam pelo modal de campeao, que monta o resultado da final, a premiacao e a
     campanha a partir do estado — em vez dos tres cartoes genericos deste momento. `dados.trofeu`
     ja e a chave certa nos dois casos: a competicao (copaBrasil, libertadores...) ou a divisao
     (A..D). Se por alguma razao nao houver campeao para montar, cai no momento de sempre. */
  if((id==='campeao-copa'||id==='campeao-liga') && dados.trofeu && typeof rfCampeaoAbrir==='function'){
    CL._momentoAtual={id, aoFechar:aoFechar||null};
    if(rfCampeaoAbrir(dados.trofeu, aoFechar)) return;
  }
  /* A ARTILHARIA TEM TELA PROPRIA, como o titulo — e entra logo a seguir a ele na fila (ver
     enfileirarMomentosCopa/FimDeTemporada). Traz o podio dos tres e veste a identidade da
     competicao: cor, nome e trofeu saem da chave que os dados carregam. */
  if((id==='marcador-copa'||id==='marcador-liga') && dados.podio && typeof rfArtilheiroAbrir==='function'){
    CL._momentoAtual={id, aoFechar:aoFechar||null};
    if(rfArtilheiroAbrir(dados, aoFechar)) return;
  }
  /* A CRISE TEM TELA PROPRIA (pacote "modal moderno", 21/08) — o cl-mom genérico abaixo é o
     desenho antigo (botões cl-btn-*, publicidade no rodapé), e o "Assumir a responsa" não fazia
     nada além de fechar o modal. rfCriseAbrir usa a MESMA família visual dos modais de convite
     (.rf-of), sem anúncio, e troca o botão sem efeito por duas perguntas da diretoria que mexem
     de verdade na moral do elenco — ver CRISE_PERGUNTAS. */
  if(id==='crise' && typeof rfCriseAbrir==='function'){
    CL._momentoAtual={id, aoFechar:aoFechar||null};
    if(rfCriseAbrir(dados, aoFechar)) return;
  }
  CL._momentoAtual={id, aoFechar:aoFechar||null};
  const clube=clubOf(dados.clubId!=null?dados.clubId:CL.clubId)||{short:'—'};
  const claro = def.corpo==='green';
  // override do painel de admin (por país/divisão/competição) vence; sem ele, o arquivo de sempre
  let vid=VIDEOS_MOMENTO[id];
  if(typeof MOMENTO_VIDEOS!=='undefined'){
    const ov=MOMENTO_VIDEOS.url(id, MOMENTO_VIDEOS.ctxDeTrofeu(dados.trofeu));
    if(ov) vid=ov;
  }
  // o troféu pode ser de COMPETIÇÃO (copaBrasil, libertadores…) ou de DIVISÃO (A, B, C, D) — são
  // dois catálogos diferentes no jogo. Resolve nos dois, na ordem, e some se não houver arte.
  let trof='';
  if(dados.trofeu){
    /* a arte com alfa primeiro (img/trofeus): a embutida em trophies.js e
       achatada e aparece como quadrado preto sobre o video -- ver rfCompTrofeuHTML */
    if(typeof rfCompTrofeuHTML==='function' && typeof rfCompInfo==='function'){
      const info=rfCompInfo(dados.trofeu);
      if(info && info.trofeu) trof=rfCompTrofeuHTML(info,72);
    }
    if(!trof) trof=(typeof trophyImg==='function' && trophyImg(dados.trofeu,72))||'';
    if(!trof && typeof divisionTrophyImg==='function') trof=divisionTrophyImg(dados.trofeu,72)||'';
  }
  const cards=(dados.stats||[]).slice(0,3).map(s=>
    `<div class="cl-mom-card"><div class="cl-mom-card-k">${escC(s.k)}</div><div class="cl-mom-card-v">${escC(s.v)}</div></div>`).join('');
  const html=`<div class="cl-mom">
    <div class="cl-mom-video">
      ${vid?`<video src="${escC(vid)}" autoplay muted loop playsinline class="cl-mom-vid" onerror="this.style.display='none'"></video>`:''}
      <div class="cl-mom-shade"></div>
      <div class="cl-mom-over">
        <div class="cl-mom-txt">
          <div class="cl-mom-kicker">${escC(dados.kicker||def.kicker)}</div>
          <div class="cl-mom-manchete">${escC(dados.manchete||'')}</div>
        </div>
        ${trof?`<div class="cl-mom-trofeu">${trof}</div>`:''}
      </div>
    </div>
    <div class="cl-mom-clube">
      ${clubCrestHTML(clube)}
      <span class="cl-welc-stripe" style="${clubStripe(clube)}">${escC(clube.short)}</span>
      <div class="cl-mom-linha ${claro?'claro':''}">${escC(dados.linha||'')}</div>
    </div>
    ${cards?`<div class="cl-mom-cards">${cards}</div>`:''}
    <div class="cl-mom-foot">
      <div class="cl-mom-nota ${claro?'claro':''}">${escC(dados.rodape||'')}</div>
      ${btn(def.btnSec,`clMomentoSec('${escC(def.acao)}')`,{icon:'⏩',cls:'cl-btn-cancel'})}
      ${btn(def.btnPri,'clMomentoOk()',{icon:'✔',cls:'cl-btn-ok'})}
    </div>
  </div>`;
  // slot da janela: a abertura/final de copa é o "pré-jogo" do inventário; os outros momentos
  // (título, rebaixamento, virada de temporada) usam o id do próprio momento.
  const adId = (id==='abertura-copa'||id==='final-copa') ? 'tela-copa-prejogo-728x90' : 'momento-'+id+'-728x90';
  overlayC(dlg(dados.titulo||'', html, {ad:adId, w:720, bodyClass:'cl-body-'+(def.corpo==='yellow'?'yellow':def.corpo==='gray'?'gray':'green')}));
  // ÁUDIO SEMPRE DESLIGADO: o atributo `muted` é ignorado por alguns navegadores quando o <video>
  // é reinjetado no DOM (que é o caso aqui — o modal é montado por innerHTML).
  try{ const v=document.querySelector('#c-overlay .cl-mom-vid'); if(v){ v.muted=true; v.volume=0; const p=v.play(); if(p&&p.catch) p.catch(()=>{}); } }catch(e){}
}
function clMomentoOk(){
  const at=CL._momentoAtual; CL._momentoAtual=null;
  clCloseOverlay();
  if(at && typeof at.aoFechar==='function') at.aoFechar();
}
function clMomentoSec(acao){
  const at=CL._momentoAtual; CL._momentoAtual=null;
  clCloseOverlay();
  momentoAcao(acao);
  if(at && typeof at.aoFechar==='function') at.aoFechar();
}

/* ---- CONSTRUTORES DE DADOS: tudo sai do estado do jogo, nada é fixo ----
   Cada um devolve os dados de um momento ou null quando ele não se aplica (não fui campeão, o
   artilheiro não é meu, etc). É o que garante que o modal só aparece quando é verdade. */
function momentoClassif(){ return (typeof sortedTable==='function')?sortedTable():[]; }
function momentoCampanha(t){ return t?`${t.W}V ${t.D}E ${t.L}D`:''; }
/* A TABELA FINAL DE VERDADE É A DE ONTEM, NÃO A DE HOJE. Estas três funções rodam DEPOIS do
   adopt da virada (enfileirarMomentosFimDeTemporada, chamada de dentro de
   onlineAdoptServerRound/newSeasonReset) — a essa altura S.table já é a tabela ZERADA da
   temporada NOVA (e S.division já é a divisão nova, pra quem subiu/desceu). Ler sortedTable()/
   S.table aqui é ler zero a zero: numa tabela toda 0x0, o desempate por id (sortTableRows)
   "elege" campeão quem quer que ordene primeiro alfabeticamente — sem relação nenhuma com a
   campanha real. Foi assim que um clube REBAIXADO viu "A taça é nossa" com premiação de
   campeão (relato do dono, 21/08: Bahia rebaixado, comemoração de campeão da própria Série B
   pra onde ele caiu). A fonte certa, que já existe e já é usada em computeMyPrevSeasonPrizes/
   registerPrevSeasonTitles/buildPressBriefing, é S._prevSeason.tables — o retrato que o
   SERVIDOR tira da tabela final ANTES de zerar. Nunca trocar de volta pra sortedTable()/S.table
   nestas três funções. */
function momentoPrevSeasonPos(){
  const pv=S._prevSeason; if(!pv || !pv.tables || !CL.clubId) return null;
  const order=(typeof DIV_ORDER!=='undefined'&&DIV_ORDER.length)?DIV_ORDER:['A','B','C','D'];
  let div=null, pos=0, table=null;
  order.forEach(d=>{ const rows=pv.tables[d]; if(!rows||!rows.length) return;
    const i=rows.findIndex(r=>r.id===CL.clubId); if(i>=0){ div=d; pos=i+1; table=rows; } });
  if(!div) return null;
  return { div, pos, t:table[pos-1], total:table.length };
}
/* PROMOVIDO/REBAIXADO, DA MESMA FOTO QUE A POSIÇÃO EXIBIDA — nunca de S._promoRelegNews.
   Esse campo só nasce dentro de switchToDivision() (core.js), chamada por newSeasonReset() —
   e newSeasonReset() só roda quando o jogador clica em "continuar" na tela de resumo, BEM
   DEPOIS de enfileirarMomentosFimDeTemporada() (chamada logo após endSeason(), pra montar o
   modal). Nesse intervalo, S._promoRelegNews ainda tinha o veredito da ÚLTIMA virada — um
   clube que subiu ano passado e caiu pro Z-4 agora via "Subimos de divisão" de novo, com a
   posição (17º) certa e o veredito da temporada ERRADO (relato do dono, 22/08). Na Resenha o
   problema era pior: switchToDivision nunca roda no cliente (quem vira é o servidor), então
   S._promoRelegNews podia nem existir. Calculando aqui, direto da MESMA leitura de
   momentoPrevSeasonPos() que decide a posição exibida, os dois nunca mais podem discordar. */
function momentoPromoRelegOutcome(){
  const m=momentoPrevSeasonPos(); if(!m) return null;
  const promoN=(typeof DIVISION_PROMO!=='undefined'&&DIVISION_PROMO[m.div])||0;
  const relegN=(typeof DIVISION_RELEG!=='undefined'&&DIVISION_RELEG[m.div])||0;
  if(promoN>0 && m.pos<=promoN) return 'promoted';
  if(relegN>0 && m.pos>m.total-relegN) return 'relegated';
  return null;
}
function dadosCampeaoLiga(){
  const m=momentoPrevSeasonPos(); if(!m || m.pos!==1) return null;
  const nome=(clubOf(CL.clubId)||{}).short||'O clube';
  return { titulo:'Fim de temporada — '+(typeof classifDivName==='function'?classifDivName(m.div,S.intlUniverse):'Liga'),
    manchete:`${nome} é campeão.`, trofeu:m.div,
    linha:`Título conquistado na ${S.sched?S.sched.length:38}ª semana da competição.`,
    stats:[{k:'PONTOS',v:String(m.t.Pts)},{k:'CAMPANHA',v:momentoCampanha(m.t)},{k:'SALDO',v:String((m.t.GF||0)-(m.t.GA||0))}],
    rodape:'A vaga continental está garantida.' };
}
function dadosPromovido(){
  const m=momentoPrevSeasonPos(); if(!m) return null;
  return { titulo:'Fim de temporada — '+(typeof classifDivName==='function'?classifDivName(m.div,S.intlUniverse):'Liga'),
    manchete:'Subimos de divisão.', trofeu:m.div,
    linha:`${m.pos}º lugar. Ano que vem o clube joga a divisão de cima.`,
    stats:[{k:'POSIÇÃO',v:m.pos+'º'},{k:'PONTOS',v:m.t?String(m.t.Pts):'—'},{k:'CAMPANHA',v:momentoCampanha(m.t)}],
    rodape:'A verba de reforços foi reajustada.' };
}
function dadosRebaixado(){
  const m=momentoPrevSeasonPos(); if(!m) return null;
  return { titulo:'Fim de temporada — '+(typeof classifDivName==='function'?classifDivName(m.div,S.intlUniverse):'Liga'),
    manchete:'A queda foi confirmada.', trofeu:null,
    linha:`${m.pos}º lugar. O clube disputa a divisão de baixo na próxima temporada.`,
    stats:[{k:'POSIÇÃO',v:m.pos+'º'},{k:'PONTOS',v:m.t?String(m.t.Pts):'—'},{k:'CAMPANHA',v:momentoCampanha(m.t)}],
    rodape:'A diretoria quer conversar sobre o seu contrato.' };
}
/* ARTILHEIRO: só vira modal se for jogador DO USUÁRIO — é o que o pedido especifica. */
/* ===== A ARTILHARIA E DE UMA COMPETICAO, E NAO E SO A MINHA =====
   Esta funcao tinha dois defeitos, e os dois faziam o modal quase nunca aparecer certo:

     · LIA O POTE UNICO. `S.scorers` junta TODOS os gols da temporada — liga e as tres copas
       misturadas. O argumento que ela recebia so trocava a palavra do titulo, entao a Copa do
       Brasil, a Libertadores e a Sul-Americana mostrariam o MESMO jogador com o MESMO numero, e
       esse numero era o total do ano, nao o da competicao. O motor ja carimbava cada gol na
       competicao onde caiu (`S.scorersByComp`, ver recordScorers) — faltava ler.
     · SO ABRIA SE O ARTILHEIRO FOSSE MEU. Havia um `return null` com o comentario "nao e meu:
       sem modal". Como o artilheiro de um campeonato raramente e do meu clube, o modal
       simplesmente nao abria na maioria das temporadas. E o mesmo defeito que ja tinha sido
       corrigido no modal de CAMPEAO de copa (ver dadosCampeaoCopa, logo abaixo): a historia da
       competicao fecha-se mesmo quando quem a fecha e outro.

   Devolve o PODIO — os tres primeiros —, porque e isso que o modal mostra. */
function dadosArtilheiro(comp){
  const chave=comp||'liga';
  const mapa=(S.scorersByComp&&S.scorersByComp[chave])||null;
  /* save antigo, ou competicao sem gol ainda: sem mapa nao ha artilharia daquela competicao, e
     inventar com o pote geral era exatamente o defeito. Melhor nao abrir modal nenhum. */
  if(!mapa) return null;
  const ord=Object.entries(mapa).sort((a,b)=>b[1]-a[1]).slice(0,3);
  if(!ord.length) return null;
  const POS={GK:'goleiro',DEF:'zagueiro',MID:'meia',ATT:'atacante'};
  const doNome=n=>{
    const cid=(typeof findPlayerClub==='function')?findPlayerClub(n):null;
    const p=cid?((S.squads&&S.squads[cid])||[]).find(x=>x.n===n):null;
    return { cid, clube:(cid&&(typeof anyClubOf==='function')&&anyClubOf(cid))||null, p };
  };
  const podio=ord.map(([nome,gols],i)=>{
    const d=doNome(nome);
    return { pos:i+1, nome, gols, clubId:d.cid,
      clube:(d.clube&&(d.clube.short||d.clube.name))||'—',
      idade:d.p?d.p.age:null, setor:d.p?(POS[d.p.s]||'jogador'):null,
      jogos:(d.p&&d.p.stats&&d.p.stats.apps)||0 };
  });
  const primeiro=podio[0];
  const media=primeiro.jogos?(primeiro.gols/primeiro.jogos).toFixed(2).replace('.',','):'—';
  const ehLiga=(chave==='liga');
  const nomeComp = ehLiga
    ? ((typeof classifDivName==='function')?classifDivName(S.division,S.intlUniverse):'Liga')
    : (((typeof COMP_DEFS!=='undefined'&&COMP_DEFS[chave])||{}).name||chave);
  return { comp:chave, ehLiga, nomeComp, podio,
    titulo:'Artilharia — '+nomeComp,
    kicker:'ARTILHEIRO '+(ehLiga?'DA ':'DA ')+String(nomeComp).toUpperCase(),
    manchete:'Ele bateu todo mundo.',
    trofeu: ehLiga ? S.division : chave,
    linha:`${primeiro.nome}, ${primeiro.idade!=null?primeiro.idade+' anos, ':''}${primeiro.setor||'jogador'} — artilheiro da competição.`,
    stats:[{k:'GOLS',v:String(primeiro.gols)},{k:'JOGOS',v:String(primeiro.jogos)},{k:'MÉDIA',v:media}],
    rodape: (String(primeiro.clubId)===String(CL.clubId))
      ? 'Renove o contrato antes que apareça proposta.'
      : 'O artilheiro da competição jogou contra você nesta temporada.' };
}
/* ===== A FINAL DE CADA COPA TEM CERIMONIA, SEJA QUEM FOR O CAMPEAO =====
   Isto so devolvia dados quando o campeao era o clube do utilizador; nas outras
   vezes nao havia modal nenhum, e o que ficava na tela era a de fim de fase --
   com "possiveis adversarios" depois da final e a campanha de um clube que
   muitas vezes nem disputou a competicao. A taca a levantar-se e o fecho da
   historia da competicao, mesmo quando quem a levanta e outro: e assim que o
   jogador sabe que aquilo acabou. O video e o mesmo; muda o texto. */
function dadosCampeaoCopa(key){
  const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[key])||{name:'Copa',short:'Copa'};
  const c=S.cups&&S.cups[key]; const b=(c&&c.champion!==undefined)?c:(c&&c.bracket);
  if(!b || b.champion==null) return null;
  const souEu=String(b.champion)===String(CL.clubId);
  const camp=(typeof anyClubOf==='function'&&anyClubOf(b.champion))||clubOf(b.champion)||{short:String(b.champion)};
  /* o placar da FINAL: a decisao e o ultimo confronto resolvido -- ora esta em
     `ties` (a fase corrente, que ja fechou), ora no ultimo bloco do historico */
  const ultimaFase=(b.history||[]).length?b.history[b.history.length-1]:null;
  const fin=(b.ties||[]).find(t=>t.winner!=null && t.hg!=null)
    || ((ultimaFase&&ultimaFase.ties)||[]).find(t=>t.winner!=null && t.hg!=null)
    || (b.ties||[]).find(t=>t.winner!=null) || null;
  const placar=fin&&fin.hg!=null?`${fin.hg} × ${fin.ag}`:'—';
  return { titulo:'Final — '+def.name, trofeu:key,
    clubId: b.champion,                       // o modal mostra o escudo de quem venceu
    kicker: souEu ? undefined : ('CAMPEÃO DA '+String(def.short||def.name).toUpperCase()),
    manchete: souEu?'A taça é nossa.':`${camp.short||camp.name} é campeão.`,
    linha: souEu?`Título da ${def.short} conquistado na decisão.`
                :`${camp.short||camp.name} levanta a ${def.short} de ${S.season}.`,
    stats:[{k:'FINAL',v:placar},{k:'FASES',v:String(b.roundsTotal||'—')},{k:'TEMPORADA',v:String(S.season)}],
    rodape: souEu?'O clube entra na competição continental do ano que vem.'
                 :'A competição está encerrada nesta temporada.' };
}
function dadosCopaJogo(pending, ehFinal){
  const key=pending.key, def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[key])||{name:'Copa',short:'Copa'};
  const meHome=pending.h===CL.clubId, oppId=meHome?pending.a:pending.h;
  const opp=(clubOf(oppId)||(typeof bgClubById==='function'&&bgClubById(oppId))||{short:'?'});
  const fase=(typeof cupPhaseLabelFor==='function')?cupPhaseLabelFor(pending):'';
  const dia=(typeof nextMatchDayLabel==='function')?nextMatchDayLabel({kind:'cup'}):'';
  return { titulo:def.name+' — '+fase, trofeu:key,
    kicker: ehFinal?('FINAL DA '+String(def.short).toUpperCase()):undefined,
    manchete: ehFinal?'Noventa minutos por uma taça.':'Bola sorteada, jogo marcado.',
    linha:`${(clubOf(CL.clubId)||{}).short||''} × ${opp.short}, ${meHome?'em casa':'fora de casa'}${dia?', '+dia:''}.`,
    stats:[{k:'FASE',v:fase||'—'},{k:'MANDO',v:meHome?'Casa':'Fora'},{k:'DIA',v:dia||'—'}],
    rodape: ehFinal?'Empate no tempo normal leva a decisão aos pênaltis.':'Escolha a tática no menu Selecção antes do jogo.' };
}
/* CRISE NO CLUBE: a barra de Segurança no cargo caiu ao ponto em que a diretoria já está
   preocupada. Reusa o MESMO limiar do e-mail "Conversa séria sobre o seu trabalho" (js<30) em vez
   de inventar um terceiro número — a régua do jogo é uma só, e o modal e o e-mail passam a falar
   da mesma coisa. Abaixo de 15 a demissão já é sorteada a cada rodada (ver checkManagerJobEvent),
   então a faixa 15-30 é exatamente o aviso que ainda dá pra reagir.
   UMA VEZ POR TEMPORADA E POR CLUBE: quem cai em crise fica nela por várias rodadas, e repetir a
   cerimônia toda semana transformaria um momento dramático em ruído. A marca é por
   clube+temporada, e vive nas chaves de CARREIRA (não vem do estado do anfitrião na Resenha). */
const CRISE_LIMIAR=30;
function dadosCrise(){
  const js=(S.jobSecurity!=null)?S.jobSecurity:60;
  const pos=(typeof tablePos==='function')?tablePos(CL.clubId):0;
  const t=(typeof sortedTable==='function')?sortedTable()[pos-1]:null;
  const sq=squad(CL.clubId)||[];
  const moral=sq.length?Math.round(sq.reduce((a,p)=>a+(p.moral||70),0)/sq.length):70;
  const nome=(clubOf(CL.clubId)||{}).short||'o clube';
  return { titulo:'A diretoria quer falar com você',
    manchete:'O clima azedou.', trofeu:null,
    linha:`${pos}º lugar e vestiário em baixa. A diretoria do ${nome} está de olho nas próximas rodadas.`,
    stats:[{k:'Segurança no cargo',v:js+'%'},{k:'Posição',v:pos?pos+'º':'—'},{k:'Moral do elenco',v:moral+'%'}],
    rodape:'Abaixo de 15% de segurança, a demissão entra em sorteio a cada rodada.' };
}
/* enfileira o momento de crise se ele se aplica AGORA e ainda não apareceu nesta temporada */
function enfileirarMomentoCrise(){
  try{
    if(!CL.clubId || (typeof CL!=='undefined' && CL.unemployed)) return;
    const js=(S.jobSecurity!=null)?S.jobSecurity:60;
    if(js>=CRISE_LIMIAR) return;
    S.criseVista=S.criseVista||{};
    const marca=CL.clubId+':'+(S.season||1);
    if(S.criseVista[marca]) return;
    S.criseVista[marca]=true;
    enfileirarMomento('crise', dadosCrise());
  }catch(e){ console.warn('momento de crise:', e&&e.message); }
}
/* ---- GATILHOS ----
   Fim de temporada: campeão da liga -> artilheiro -> acesso/queda, um após o outro (fila).
   Chamado de endSeason (solo) e da virada online. */
function enfileirarMomentosFimDeTemporada(){
  try{
    const camp=dadosCampeaoLiga(); if(camp) enfileirarMomento('campeao-liga', camp);
    const art=dadosArtilheiro('liga'); if(art) enfileirarMomento('marcador-liga', art);
    const pr=momentoPromoRelegOutcome();
    if(pr==='promoted') enfileirarMomento('promovido', dadosPromovido());
    else if(pr==='relegated') enfileirarMomento('rebaixado', dadosRebaixado());
  }catch(e){ console.warn('momentos de fim de temporada:', e&&e.message); }
}
/* Copa decidida: campeão -> artilheiro da copa. Uma vez por competição/temporada. */
function enfileirarMomentosCopa(key){
  try{
    CL._momCopaVista=CL._momCopaVista||{};
    const marca=key+':'+(S.season||1); if(CL._momCopaVista[marca]) return; 
    const d=dadosCampeaoCopa(key); if(!d) return;
    CL._momCopaVista[marca]=true;
    enfileirarMomento('campeao-copa', d);
    /* A CHAVE DA COPA VAI JUNTO. Passava-se a palavra 'copa', que nao identifica competicao
       nenhuma — as tres copas do save mostrariam a mesma artilharia. */
    const art=dadosArtilheiro(key); if(art) enfileirarMomento('marcador-copa', art);
  }catch(e){ console.warn('momentos de copa:', e&&e.message); }
}

/* ---- Jogador > Treino especial: até 3 jogadores em treino ao mesmo tempo, ganhando chance
   extra de evolução por rodada (ver evolvePlayer/hasEstrelinha).

   A tela antiga era uma lista de nomes com um botão "Treinar" e uma frase genérica ("chance extra
   de evolução"). Não dava pra responder as perguntas óbvias: quanto meu jogador cresce por
   temporada? por que aquele cresce mais que este? o treino está fazendo alguma diferença? Agora
   cada linha mostra o RITMO real (o mesmo cálculo de evolvePlayer, lido por growthProfileOf) e o
   porquê — e o cabeçalho explica de onde vem o "salto" de força que confundia. ---- */
const RITMO_FAIXAS=[
  [12, 'muito rápido', 'vfast'], [6, 'rápido', 'fast'], [2, 'moderado', 'ok'], [0.4, 'lento', 'slow'],
];
function ritmoLabel(porTemporada){
  if(porTemporada < -0.4) return {txt:'em queda', cls:'down'};
  for(const [lim,txt,cls] of RITMO_FAIXAS) if(porTemporada>=lim) return {txt, cls};
  return {txt:'estagnado', cls:'flat'};
}
function ritmoPct(x){ return Math.round(x*100)+'%'; }
function ritmoNum(x){ const n=Math.round(x*10)/10; return (n>0?'+':'')+String(n).replace('.',','); }
/* rótulo CURTO de cada fonte de evolução, pro chip caber numa coluna de tabela: "Jogando bem
   (nota 7,2)" vira "7,2", "Treino especial + ⭐ destaque" vira "Treino", e assim por diante. O
   texto inteiro continua acessível no title do chip. */
function trnFonteCurta(f){
  switch(f.tipo){
    case 'jogar': { const m=/nota ([\d,]+)/.exec(f.label||''); return m?m[1]:'Jogando bem'; }
    case 'treino': return 'Treino';
    case 'jovem':  return 'Formação';
    case 'idade':  return 'Idade';
    case 'banco':  return 'Banco';
    default: return (f.label||'').split(' (')[0];
  }
}
/* A coluna Bônus tem ~90px: dois chips lado a lado sempre cortavam o segundo pela metade. Com
   dois ou mais, mostra o primeiro e um "+N" — o texto completo de todos fica no title. */
function trnBonus(fontes){
  if(!fontes || !fontes.length) return '';
  if(fontes.length===1) return trnChip(fontes[0]);
  const resumo=fontes.map(f=>f.label+' ('+ritmoPct(f.chance)+'/rodada)').join(' · ');
  const outros=fontes.length-1;
  return trnChip(fontes[0])+`<span class="cl-trn-mais" title="${escC(resumo)}">+${outros}</span>`;
}
function trnChip(f){
  if(!f) return '';
  return `<span class="cl-trn-chip ${f.sinal>0?'up':'down'}" title="${escC(f.label)} — ${ritmoPct(f.chance)} por rodada">`
    +`${f.sinal>0?'▲':'▼'} ${escC(trnFonteCurta(f))} <i>${ritmoPct(f.chance)}</i></span>`;
}
/* uma linha do jogador na tela de treino, no padrão de tabela do handoff: uma coluna por dado.
   As fontes de evolução ocupam duas células — "Jogo" (a nota, que é de longe o maior fator) e
   "Bônus" (treino, formação, ou o que estiver puxando pra baixo). A idade saiu da tabela. */
function trainingRowHTML(p, inTraining, cheio){
  const g=(typeof growthProfileOf==='function')?growthProfileOf(p):null;
  const star=(typeof hasEstrelinha==='function')&&hasEstrelinha(p);
  const r=g?ritmoLabel(g.forcaPorTemporada):{txt:'—',cls:'flat'};
  const porTemp=g?ritmoNum(g.forcaPorTemporada):'—';
  const fontes=(g&&g.fontes)||[];
  // coluna "Jogo" = só a nota (o maior fator de todos); tudo o mais — treino, formação, idade,
  // banco — vai pra "Bônus", que é a coluna larga. Sem essa separação, "Formação (12%)" caía na
  // célula de 78px e saía cortado.
  const jogo=fontes.find(f=>f.tipo==='jogar')||null;
  const resto=fontes.filter(f=>f!==jogo);
  const semNada = !fontes.length
    ? `<span class="cl-trn-chip" title="${escC(p.age>=31?'Idade fora da faixa de crescimento':'Precisa jogar bem (nota ≥ 6,8) ou entrar em treino')}">sem ganho</span>`
    : '<span class="cl-trn-vazio">—</span>';
  const acao = inTraining
    ? btn('Tirar', "clStopTraining('"+p.pid+"')", {cls:'cl-btn-mini cl-trn-btn'})
    : (cheio ? `<span class="cl-trn-full">lotado</span>` : btn('Treinar', "clStartTraining('"+p.pid+"')", {cls:'cl-btn-mini cl-trn-btn'}));
  return `<div class="cl-trn-row ${inTraining?'on':''}">
    <span class="cl-trn-pos">${posLetter(p.s)}</span>
    <span class="cl-trn-n">${escC(p.n)}${star?'<span class="cl-trn-star" title="Destaque: evolui mais rápido no treino"> ⭐</span>':''}</span>
    <span class="cl-trn-fontes"><span class="cl-trn-jogo">${trnChip(jogo)||semNada}</span><span class="cl-trn-bonus">${trnBonus(resto)}</span></span>
    <span class="cl-trn-f">${p.f}</span>
    <span class="cl-trn-ritmo ${r.cls}">${r.txt}</span>
    <span class="cl-trn-delta ${r.cls}">${porTemp}</span>
    <span class="cl-trn-acao">${acao}</span>
  </div>`;
}
function clTrainingScreen(){ CL.menu=null;
  const training=new Set(myTrainingList());
  const cheio=training.size>=TRAINING_MAX_SLOTS;
  const sq=squad(CL.clubId).slice().sort((a,b)=>{
    const ga=(typeof growthProfileOf==='function')?growthProfileOf(a):null, gb=(typeof growthProfileOf==='function')?growthProfileOf(b):null;
    return ((gb&&gb.forcaPorTemporada)||0)-((ga&&ga.forcaPorTemporada)||0); // quem mais cresce primeiro
  });
  const rows=sq.map(p=>trainingRowHTML(p, training.has(p.pid), cheio)).join('');
  // o explicador vira <details> RECOLHIDO por padrão: ele ocupava quase metade da janela antes
  // de qualquer dado. CL.trnHelpOpen guarda o estado pra não fechar sozinho a cada re-render
  // (clStartTraining/clStopTraining redesenham a tela inteira).
  const helpOpen=!!CL.trnHelpOpen;
  overlayC(dlg('Treino especial', `
    <details class="cl-trn-intro" ${helpOpen?'open':''} ontoggle="CL.trnHelpOpen=this.open">
      <summary class="cl-trn-intro-h"><span>Como o jogador evolui</span><i>${helpOpen?'fechar':'abrir'}</i></summary>
      <div class="cl-trn-intro-b">
      <p>Ninguém ganha "força" direto. A cada rodada o jogador pode ganhar um <b>ponto de atributo</b>
      (finalização, passe, reflexos), e a <b>Força</b> é a média desses atributos convertida pela escala da
      sua divisão. Por isso ele às vezes joga bem e a Força não mexe — e às vezes <b>salta 2 ou 3 de uma vez</b>:
      nas divisões de baixo a escala é bem mais íngreme, então o mesmo ponto ganho vale muito mais Força.</p>
      <p>O que decide a velocidade, em ordem de peso:
      <b>1) jogar bem</b> (nota ≥ 6,8; acima disso quanto maior a nota, mais rápido — é de longe o maior fator),
      <b>2) idade</b> (até 20 anos cresce no talo, 24-27 já cai pra um terço, dos 29 em diante começa a perder físico),
      <b>3) posição</b> (goleiro concentra o peso em 2 atributos e por isso sobe mais rápido que meia),
      <b>4) treino especial</b> (+5% por rodada, 9% com ⭐) e
      <b>5) currículo</b> (títulos e temporadas na elite dão até +50%).</p>
      <p class="cl-trn-intro-tip">💡 O treino rende pouco em quem já é titular e vai bem — o ganho grande é no
      <b>reserva</b>: fora do time ele <i>perde</i> físico a partir de 4 rodadas no banco, e o treino cancela essa perda.</p>
      </div>
    </details>
    <div class="cl-trn-vagas">${training.size}/${TRAINING_MAX_SLOTS} em treino${cheio?' — tire alguém pra abrir vaga':''}. Ordenado por quem mais cresce agora.</div>
    <div class="cl-trn-list">
      <div class="cl-trn-head"><span>Pos</span><span>Jogador</span>
        <span class="cl-trn-fontes"><span>Jogo</span><span>Bônus</span></span>
        <span class="r">Força</span><span class="r">Ritmo</span>
        <span class="r" title="Ganho projetado de força por temporada">Δ/temp</span><span class="c">Treino</span></div>
      ${rows}
    </div>`,{ad:'modal-treino-728x90',std:true, footer:btn('Fechar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}));
}
function clStartTraining(pid){ const r=startTraining(pid); toastC(r.msg); clTrainingScreen(); }
function clStopTraining(pid){ stopTraining(pid); clTrainingScreen(); }

/* ---- Jogador > Últimas transferências: histórico real por jogador (p.transferHistory), não
   mais um stub "em breve". Lista os jogadores do MEU elenco que já trocaram de clube alguma vez,
   mais recente primeiro — cobre todas as trocas de cada um, não só a primeira (ver
   recordTransferHistory em core.js). Jogadores que já SAÍRAM do meu elenco não aparecem aqui
   (o histórico deles viaja junto do jogador pro elenco novo, não fica registrado no meu). ---- */
function clTransferHistory(){ CL.menu=null;
  const shortOf=id=>{ if(!id) return 'fora do mundo'; const c=clubOf(id)||(typeof bgClubById==='function'&&bgClubById(id))||(typeof intlClubById==='function'&&intlClubById(id)); return (c&&c.short)||id; };
  const entries=[];
  squad(CL.clubId).forEach(p=>{ (p.transferHistory||[]).forEach(h=>entries.push({p, h})); });
  entries.sort((a,b)=> (b.h.season-a.h.season) || (b.h.round-a.h.round));
  const rows=entries.length?entries.map(({p,h})=>`<div style="padding:8px 12px;border-bottom:1px solid rgba(0,0,0,.1);display:flex;justify-content:space-between;gap:10px;align-items:center">
      <span style="flex:1;min-width:0"><b>${escC(p.n)}</b><br><small style="color:#888">${escC(shortOf(h.from))} → ${escC(shortOf(h.to))} · temporada ${h.season}, rodada ${h.round+1}</small></span>
      <span style="white-space:nowrap;font-weight:700">${fmt(h.fee)}</span>
    </div>`).join('') : '<div style="padding:16px;text-align:center;color:#888">Nenhuma transferência registrada no seu elenco ainda.</div>';
  overlayC(dlg('Últimas transferências', `<div class="cl-cal">${rows}</div><div class="cl-cal-ok">${btn('Fechar','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:560,bodyClass:'cl-body-gray',min:true}));
}


function panFinancas(){
  const sq=squad(CL.clubId);
  const totalSalaryPerWeek = sq.reduce((s,p)=>s+(p.contract?.salary||0),0);
  const seasonWeeks = S.sched.length||38; // 1 rodada = 1 semana de débito real — a temporada tem 38 rodadas, não 52 semanas fixas
  const totalSalaryPerSeason = totalSalaryPerWeek * seasonWeeks;

  // totais da temporada "até agora" vêm de S.seasonTotals — um acumulador SEM cap (ver
  // pushFinanceEntry). Importante: NÃO somar isso a partir de S.finances, que é só um log
  // das últimas 12 transações pro histórico recente — somar por ali fazia o total "esquecer"
  // salário/bônus/receita de qualquer rodada mais antiga que a 12ª mais recente.
  const st=S.seasonTotals||{income:0,salaries:0,bonuses:0,opex:0,playerSales:0,playerPurchases:0,stadium:0};
  const totalGate=st.income, totalSalaries=st.salaries, totalBonuses=st.bonuses, totalOpex=st.opex||0,
        totalPlayerSales=st.playerSales, totalPlayerPurchases=st.playerPurchases, totalStadium=st.stadium||0;
  const financesLog = [];
  (S.finances||[]).forEach(f=>{ if(f.log) financesLog.push(...f.log); });

  const totalIncome = totalGate + totalPlayerSales;
  const totalExpenses = totalSalaries + totalBonuses + totalOpex + totalPlayerPurchases + totalStadium;
  const currentBalance = totalIncome - totalExpenses;

  const R=(l,v)=>`<div class="cl-fin-row"><span>${l}</span><b>${grp(v)}</b></div>`;

  // renderizar histórico de transações recentes
  const recentLogs = financesLog.slice(0,8).map(log=>`<div class="cl-fin-log-item">${escC(log)}</div>`).join('');

  return `<div class="cl-fin">
    <div class="cl-fin-row cl-fin-h"><span>Temporada</span><b>${S.season}</b><span style="font-size:12px;color:#aaa">Rodada ${S.round}/${S.sched.length}</span></div>
    <div class="cl-fin-sec">Receitas (até agora)</div>
    ${R('Bilhetes',totalGate)}${R('Jogadores vendidos',totalPlayerSales)}${R('Prémios',0)}
    <div class="cl-fin-sec">Despesas (até agora)</div>
    ${R('Salários',totalSalaries)}${R('Bônus jogadores',totalBonuses)}${R('Custo operacional',totalOpex)}${R('Jogadores comprados',totalPlayerPurchases)}${R('Bancadas',totalStadium)}${R('Juros',0)}
    <div class="cl-fin-tot">${R('Total de receitas',totalIncome)}${R('Total de despesas',totalExpenses)}${R('Saldo até agora',currentBalance)}</div>
    <div class="cl-fin-foot">
      <div class="cl-fin-row big"><span>Salários <span style="opacity:.7">(por semana)</span></span><b>${fmt(totalSalaryPerWeek)}/sem</b></div>
      <div class="cl-fin-row big"><span>Salários <span style="opacity:.7">(temporada, ${seasonWeeks} rodadas)</span></span><b>${fmt(totalSalaryPerSeason)}</b></div>
      <div class="cl-fin-row big2"><span>Dinheiro em caixa</span><b>${curSym()} ${moneyDisp(S.budget)}</b></div>
      <div class="cl-fin-row"><span>Preço dos bilhetes</span><b>${CL.ticket} reais</b></div>
      ${recentLogs ? `<div style="margin-top:20px;border-top:1px solid #2a4a2a;padding-top:12px"><div style="font-size:13px;color:#aaa;margin-bottom:8px">Transações recentes:</div>${recentLogs}</div>` : ''}
      ${(S.financeHistory&&S.financeHistory[CL.clubId]&&S.financeHistory[CL.clubId].length) ? `<div style="margin-top:20px;border-top:1px solid #2a4a2a;padding-top:12px">
        <div style="font-size:13px;color:#aaa;margin-bottom:8px">Histórico de temporadas encerradas:</div>
        ${btn('Ver histórico completo','clFinanceHistory()',{cls:'cl-btn-mini'})}
      </div>` : ''}
    </div>
  </div>`;
}
/* ---- Finanças > histórico por temporada — resumo de receita/despesa/lucro de cada
   temporada ENCERRADA do clube atual, gravado em S.financeHistory (ver endSeason() em
   core.js), pra o treinador poder consultar mesmo depois de assumir outro clube (basta
   trocar o clubId — por padrão mostra o clube atual). Reaproveita o grid de
   .cl-seasonhist-* já usado pelo histórico de temporadas do Treinador/Equipa. ---- */
function clFinanceHistory(clubId){
  clubId = clubId || CL.clubId;
  const c=clubOf(clubId);
  const entries=((S.financeHistory&&S.financeHistory[clubId])||[]).slice().reverse();
  const head=`<div class="cl-seasonhist-row cl-seasonhist-head" style="grid-template-columns:48px 1fr 1fr 1fr 1fr">
    <span>Ano</span><span>Receita</span><span>Despesa</span><span>Lucro</span><span></span></div>`;
  const rows=entries.map(f=>{
    const income=f.income+f.playerSales, expense=f.salaries+f.bonuses+(f.opex||0)+f.playerPurchases+(f.stadium||0);
    return `<div class="cl-seasonhist-row" style="grid-template-columns:48px 1fr 1fr 1fr 1fr">
      <span class="cl-seasonhist-season">${f.season}</span>
      <span>${moneyDisp(income)}</span><span>${moneyDisp(expense)}</span>
      <span style="color:${f.net>=0?'#1e9e3f':'#c0392b'};font-weight:800">${moneyDisp(f.net)}</span><span></span></div>`;
  }).join('');
  const body = entries.length ? head+rows : '<div class="cl-cup-hint">Nenhuma temporada encerrada ainda pra este clube.</div>';
  overlayC(dlg('Histórico financeiro — '+(c?c.short:'clube'), `<div class="cl-seasonhist-wrap">${body}</div>
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:600,bodyClass:'cl-body-gray',min:true}));
}
function panFinancasLog(){
  const R=(l,v)=>`<div class="cl-fin-row"><span>${l}</span><b>${grp(v)}</b></div>`;
  return (S.finances||[]).slice(0,12).map((f,i)=>{
    const log=f.log||[];
    return `<div style="margin-bottom:16px;padding:12px;background:#1a3a1a;border-radius:4px">
      <div style="color:#aaa;font-size:12px;margin-bottom:8px">Rodada ${f.round}</div>
      <div class="cl-fin-row"><span>Receita</span><b style="color:#4a9">+${moneyDisp(f.income||0)}</b></div>
      ${f.playerSales?`<div class="cl-fin-row"><span>Venda de jogador</span><b style="color:#4a9">+${grp(f.playerSales)}</b></div>`:''}
      <div class="cl-fin-row"><span>Salários</span><b style="color:#a44">-${moneyDisp(f.salaries||0)}</b></div>
      <div class="cl-fin-row"><span>Bônus</span><b style="color:#a44">-${moneyDisp(f.bonuses||0)}</b></div>
      ${f.playerPurchases?`<div class="cl-fin-row"><span>Compra de jogador</span><b style="color:#a44">-${grp(f.playerPurchases)}</b></div>`:''}
      ${f.stadium?`<div class="cl-fin-row"><span>Bancada construída</span><b style="color:#a44">-${grp(f.stadium)}</b></div>`:''}
      <div class="cl-fin-row" style="border-top:1px solid #2a4a2a;padding-top:8px;margin-top:8px"><span>Saldo</span><b style="color:${f.net>=0?'#4a9':'#a44'}">${f.net>=0?'+':''}${moneyDisp(f.net||0)}</b></div>
      ${log.length ? `<div style="font-size:12px;color:#aaa;margin-top:8px">${log.map(l=>'• '+escC(l)).join('<br>')}</div>` : ''}
    </div>`;
  }).join('');
}

/* ---- painel: SELECÇÃO (+ Jogar) ---- */
/* exige exatamente 1 goleiro titular — antes só era mantido por convenção (pickXIByFormation/
   autoXI/clTrocarPorPid sempre preservavam isso), sem checagem explícita no botão Jogar: se o
   elenco ficasse sem nenhum goleiro de verdade (raro, mas possível), o jogo escalava 11 de linha
   silenciosamente em vez de avisar. */
function xiGKCount(xi){ return xi.filter(p=>p.s==='GK').length; }

/* ===== O CAMPO DA ABA FORMAÇÃO =====
   A escalação só existia como texto: uma lista à esquerda com T/R e uma grade de formações à
   direita. Quem escala olha pro DESENHO — quantos na frente, quem está aberto na ponta, quem
   sobrou no meio —, e isso nenhuma lista entrega. O campo abaixo é a mesma escalação (S.xi),
   só que vista de cima: quatro faixas (ataque, meio, defesa, goleiro) com a camisa, o número
   e a energia de cada titular.
   O clique no campo NÃO tem lógica própria: chama exatamente as mesmas funções da lista
   (clSelPlayer): tocar num jogador no campo acende a linha dele no elenco — campo e lista são
   duas janelas pro mesmo estado, nunca dois caminhos que podem divergir. A TROCA é o arraste
   entre campo e banco (ver clDragStart). */
/* placas de publicidade: o inventário fica aqui num lugar só. Trocar por patrocinador de
   verdade depois é mexer só nesta lista (ver pasta patrocinadores/). */
const PITCH_ADS=[
  {t:'ANUNCIE AQUI', c:'laranja'},
  {t:'SUA MARCA',    c:'azul'},
  {t:'PATROCÍNIO',   c:'verde'},
];
/* ===== CADA PLACA E' UM ANUNCIANTE =====
   Eram texto fixo da lista acima -- nao havia como um anunciante entrar nelas. Depois
   passaram a inventario, mas com UMA arte por feitio: quem comprasse as deitadas via a
   sua marca repetida nas seis, e nao havia como vender a placa do meio a outra pessoa.

   Agora cada FEITIO tem TRES placas independentes (ad_spaces.placas), cada uma com arte
   e link proprios: rf98.campo.deitada posicoes 1..3 e rf98.campo.empe 1..3. O trio de
   deitadas aparece em cima E em baixo, e o de em pe' de cada lado -- o mesmo anel de
   placas a dar a volta ao campo, como num estadio de verdade.

   O `off` de cada lado DEIXOU DE RODAR AS PLACAS VENDIDAS. Ele existia para os rotulos
   de casa nao ficarem iguais nos quatro lados; aplicado a inventario vendido, punha a
   placa 1 de um anunciante no lugar da 3 de outro consoante o lado. Ele continua a valer
   para os rotulos de casa, e nao toca em quem pagou.

   Placa sem criativo cai no rotulo de casa daquela posicao -- as vendidas e as livres
   convivem no mesmo anel. */
function pitchAdArte(chave, pos){
  if(typeof ADS==='undefined' || !window.ADS) return '';
  const c = ADS.get(chave, pos);
  if(!c || !c.ficheiro_url) return '';
  return `<div class="cl-pitch-ad arte" data-ad-chave="${escC(chave)}" data-ad-id="${escC(c.id)}"
    onclick="ADS.clique('${escC(chave)}',${pos})" style="cursor:${c.link_destino?'pointer':'default'}"
    ><img src="${escC(c.ficheiro_url)}" alt="Publicidade"></div>`;
}
function pitchAdsHTML(lado, n, off){
  const chave = (lado==='left'||lado==='right') ? 'rf98.campo.empe' : 'rf98.campo.deitada';
  /* AS PLACAS DESLIGADAS VOLTAM AO ROTULO DE CASA, e nao desaparecem. Aqui elas
     nao sao um bloco solto na pagina: sao a moldura do campo, tres de cada lado.
     Tirar as seis colapsaria o desenho do estadio -- desligar o ESPACO significa
     "nao vendo isto agora", nao "apaga a placa". Quem desliga ve' o campo como ele
     era antes de as placas entrarem no inventario. */
  const vendavel = !(window.ADS && ADS.ligado && !ADS.ligado(chave));
  let out='';
  for(let i=0;i<n;i++){
    const arte=vendavel ? pitchAdArte(chave, i+1) : '';   // posicoes 1..3, como o painel as mostra
    if(arte){ out+=arte; continue; }
    const a=PITCH_ADS[(i+(off||0))%PITCH_ADS.length];
    out+=`<div class="cl-pitch-ad ${a.c}"><span>${escC(a.t)}</span></div>`; }
  return `<div class="cl-pitch-ads ${lado}">${out}</div>`;
}
/* NÚMERO DA CAMISA — o gerador de elenco escreve p.num aleatório (1-40, com repetição) e nada
   no jogo mostrava esse número, então ele nunca precisou fazer sentido. No campo ele aparece
   grande, em onze camisas ao mesmo tempo: dois "17" em campo saltam aos olhos. Aqui o clube
   inteiro recebe uma numeração clássica por setor (1 no gol, 2-6 na zaga, 5/8/10 no meio,
   7/9/11 na frente), única e estável — depende só da ordem do elenco, não da escalação, então
   o número de um jogador não muda quando ele sai do time. */
const SHIRT_POOL={ GK:[1,12,22,31,32], DEF:[2,3,4,6,13,14,15,16,24,25,26],
                   MID:[5,8,10,17,18,19,20,27,28], ATT:[7,9,11,21,23,29,30,33,34] };
function clubShirtNumbers(clubId){
  const map={}; const used=new Set(); let extra=35;
  ['GK','DEF','MID','ATT'].forEach(sec=>{
    const pool=SHIRT_POOL[sec]||[]; let k=0;
    // por força dentro do setor: o melhor goleiro é o 1, o melhor zagueiro o 2 — como todo
    // clube numera. A ordem crua do elenco daria o 1 pro terceiro goleiro.
    // mesmo critério (e mesmo desempate, pela ordem do elenco) que o autoXI usa pra escolher
    // os titulares: assim o 1 fica com o goleiro que realmente começa jogando
    squad(clubId).filter(p=>p.s===sec).slice().sort((a,b)=>b.f-a.f).forEach(p=>{
      let n=null;
      while(k<pool.length && n==null){ if(!used.has(pool[k])) n=pool[k]; k++; }
      if(n==null){ while(used.has(extra)) extra++; n=extra; }
      used.add(n); map[p.pid]=n;
    });
  });
  return map;
}
/* ===== QUADRANTES DO CAMPO =====
   O campo é lido em faixas (ataque, meio, defesa, gol) x colunas. As COLUNAS saem da própria
   formação: uma linha de 4 zagueiros ocupa quatro corredores, uma de 3 ocupa três — por isso
   trocar de formação reposiciona o time de verdade, não só o número de camisas por faixa.
   PITCH_LANES[n] = os n corredores (em % da largura) de uma linha com n jogadores. */
const PITCH_LANES={
  1:[50], 2:[34,66], 3:[22,50,78], 4:[15,38,62,85],
  5:[11,30.5,50,69.5,89], 6:[10,26,42,58,74,90],
};
/* PITCH_BANDS[formação] = altura (em % do gramado) das faixas ATT, MID, DEF, GK. O goleiro
   fica colado na pequena área; as outras faixas sobem ou descem conforme o desenho: um 4-2-4
   deixa o meio mais recuado (só dois), um 4-5-1 adianta o meio e isola o centroavante. */
/* MEIO NO CÍRCULO CENTRAL, DISTÂNCIAS IGUAIS. O elemento do jogador tem 12% da
   altura do gramado, então o CENTRO dele é `top + 6`. Para o meio-campo cair
   sobre o círculo (50%), a faixa dele é 44. O goleiro fica onde estava (centro
   ~92, dentro da pequena área) e as outras duas se distribuem igualmente entre
   os dois: centros em 29 · 50 · 71 · 92, ou seja 21 de distância entre cada par.
   As diferenças por formação que existiam aqui (meio recuado no 4-2-4, adiantado
   no 4-5-1) foram achatadas de propósito — o pedido é espaçamento igual. */
/* NO TELEFONE A REGUA E OUTRA, e a razao esta no proprio comentario acima: ela
   foi calibrada para "o elemento do jogador tem 12% da altura do gramado". A
   caixa do jogador, porem, tem 70px FIXOS (camisa 40 + nome 13 + meta 12 + as
   margens). No campo do desktop 70px sao mesmo ~12%; no campo do telefone, que
   tem 327px de altura, sao 21,4% — quase o dobro. Com faixas de 21 em 21 as
   caixas passam a encostar-se, e a de tras invadia o goleiro, que e ancorado
   pela BASE e por isso nao desce junto.

   Aqui as tres faixas de linha sobem em bloco (mantendo o espacamento igual
   entre elas) para abrir os ~70px que o goleiro ocupa em baixo:
   ATT 33..99 · MID 101..167 · DEF 170..236 · GK 254..320. */
const PITCH_BANDS_MOBILE=[10,31,52,82];
const PITCH_BANDS={
  _        :[23,44,65,82],
  '3-3-4'  :[23,44,65,82],
  '3-4-3'  :[23,44,65,82],
  '4-2-4'  :[23,44,65,82],
  '4-3-3'  :[23,44,65,82],
  '4-4-2'  :[23,44,65,82],
  '4-5-1'  :[23,44,65,82],
};
/* A LINHA DE BAIXO DA CAMISA: força em destaque + a seta de tendência, e a energia vira a
   mesma barrinha da lista de elenco. Antes era o percentual de energia em texto — número que
   só dizia algo depois de comparar com os outros dez. A força é o que decide quem joga; a
   energia, lida de relance, é melhor como barra do que como "76%". */
function chipMetaHTML(p, pos){
  const tr = p._trend==='up'   ? '<span class="cl-rtrend up">▲</span>'
           : p._trend==='down' ? '<span class="cl-rtrend down">▼</span>' : '';
  return `<span class="cl-pp-forca">${pos?escC(pos)+' · ':''}<b>${p.f}</b>${tr}</span>`
       + `<span class="cl-pp-bat">${energyCell(p)}</span>`;
}
/* a camisa (desenho + número) é a mesma peça no gramado e no banco — só muda o tamanho, que
   vem do CSS (.cl-bp .cl-pp-shirt é 60% da camisa do titular). */
function shirtHTML(p, th, num){
  // A camisa do gramado é a MESMA peça da ficha do jogador (rf-jersey): mangas
  // inclinadas, corpo com o numero e gola. As cores vem inline porque esta funcao
  // tambem roda fora do hub, onde as variaveis --club-* podem nao estar montadas.
  const c1=th.col||'#17458F', c2=th.col2||'#F2B90C';
  // o numero usa a secundaria SÓ quando ela se le sobre a primaria (Palmeiras tem
  // verde sobre verde); senao cai pro preto/branco que barTextColor garante.
  const cn=barTextColor(c1,c2);
  // MINIATURA DO ESTÚDIO: quando o clube tem a camisa gerada no painel (transparente,
  // pintada nas cores), ela substitui o desenho CSS — mesmo tamanho, número por cima.
  const uni=(window.RF_UNIFORMES||{})[String(CL.clubId)];
  if(uni && uni.miniatura){
    return `<span class="cl-pp-shirt rf-jersey rf-jersey-img" aria-hidden="true">
      <img src="${escC(uni.miniatura)}" alt="" loading="lazy" draggable="false">
      <b>${num||''}</b>
    </span>`;
  }
  return `<span class="cl-pp-shirt rf-jersey" aria-hidden="true">
    <i class="rf-j-sl l" style="background:${c2}"></i><i class="rf-j-sl r" style="background:${c2}"></i>
    <i class="rf-j-body" style="background:${c1}"><b style="color:${cn}">${num||''}</b></i>
    <i class="rf-j-collar" style="background:${c2}"></i>
  </span>`;
}
/* BANCO (duas colunas à direita do campo) — o resto do elenco, na mesma linguagem do gramado.
   Duas colunas em vez de uma: o banco de um elenco típico tem 10-16 nomes, e numa fila só o
   usuário rolava pra cima e pra baixo pra achar o reserva da posição que queria.
   Vale a mesma regra do campo: o toque chama a função da LISTA (clSelPlayer), então tocar
   num reserva acende a linha dele no elenco. A troca é o ARRASTE (ver clDragStart). */
function benchHTML(th, nums){
  if(typeof rfBancoHTML==='function') return rfBancoHTML(th, nums);
  const xiSet=new Set(S.xi||[]);
  const ordem={GK:0,DEF:1,MID:2,ATT:3};
  const banco=squad(CL.clubId).filter(p=>!xiSet.has(p.pid))
    .slice().sort((a,b)=>(ordem[a.s]-ordem[b.s])||(b.f-a.f));
  const itens = banco.map(p=>{
    const selc   = CL.selPlayer===p.pid;
    const unavail= p.suspended>0||p.injuredMatches>0;
    const en = Math.round(p.energy!=null?p.energy:100);
    const sobrenome = p.n.split(' ').slice(-1)[0]||p.n;
    return `<button type="button" class="cl-bp ${selc?'sel':''} ${unavail?'unavail':''}"
      data-pid="${escC(p.pid)}" data-sec="${p.s}"
      onpointerdown="clDragStart(event,'${escC(p.pid)}')" onkeydown="if(event.key==='Enter'||event.key===' ')clSelPlayer('${escC(p.pid)}')"
      title="${escC(p.n)} — ${escC(SETOR_FORCA[p.s]||'')} · força ${p.f} · energia ${en}%${unavail?'':' · arraste pro campo pra escalar'}">
      ${shirtHTML(p,th,nums[p.pid])}
      <span class="cl-pp-name">${escC(sobrenome)}${unavail?(p.suspended>0?' 🟥':' ✚'):''}</span>
      ${chipMetaHTML(p, posLetter(p.s))}
    </button>`;
  }).join('');
  // RECOLHÍVEL: o campo é o que o usuário veio ver. Fechado, o banco vira uma faixa estreita
  // (que continua sendo alvo de arraste: soltar um titular ali chama o melhor reserva da
  // posição), e todo o espaço devolvido vira gramado.
  const aberto = CL.benchOpen!==false;
  return `<div class="cl-bench ${aberto?'':'fechado'}">
    <button type="button" class="cl-bench-hd" onclick="clToggleBench()"
      title="${aberto?'Recolher o banco e aumentar o campo':'Mostrar os suplentes'}">
      <span class="cl-bench-hd-txt">SUPLENTES</span>
      <span class="cl-bench-hd-n">${banco.length}</span>
      <span class="cl-bench-hd-seta">${aberto?'▸':'◂'}</span>
    </button>
    ${aberto?`<div class="cl-bench-list">${itens||'<div class="cl-bench-vazio">—</div>'}</div>`:''}
  </div>`;
}
function clToggleBench(){ CL.benchOpen = CL.benchOpen===false; cdraw(); }
function pitchHTML(){
  /* CAMPO DEITADO: só existe no palco (ver rfCampoDeitado em rf26-formacao.js). O ecrã é mais
     largo do que alto, e o gramado em pé é mais alto do que largo — deitado ele usa o espaço que
     sobra em vez de o desperdiçar. No cartão do Hub continua em pé, que é a leitura de sempre. */
  const deitado=(typeof rfCampoDeitado==='function') && rfCampoDeitado();
  const xi=xiPlayers(CL.clubId);
  const th=clubTheme(CL.clubId);
  const nums=clubShirtNumbers(CL.clubId);
  // faixas de cima pra baixo: ataque, meio, defesa, goleiro (o gol do time fica embaixo)
  const bandas=(typeof isPhone==='function'&&isPhone())
    ? PITCH_BANDS_MOBILE
    : (PITCH_BANDS[CL.formation]||PITCH_BANDS._);
  const linhas=[['ATT',bandas[0]],['MID',bandas[1]],['DEF',bandas[2]],['GK',bandas[3]]];
  const nodes=linhas.map(([sec,top])=>{
    const list=xi.filter(p=>p.s===sec);
    const lanes=PITCH_LANES[list.length]||PITCH_LANES[5];
    const dense=list.length>=5?' dense':'';
    return list.map((p,i)=>{
      const left = lanes[i]!=null?lanes[i]:(7+((i+0.5)/list.length)*86);
      const selc   = CL.selPlayer===p.pid;
      const unavail= p.suspended>0||p.injuredMatches>0;
      // linha cheia (3+ na mesma faixa) só cabe um nome: usa o último, que é como o jogador
      // é chamado na escalação ("Richard Almeida" vira "Almeida")
      const partes = p.n.split(' ');
      const nome = list.length>=3 ? (partes.slice(-1)[0]||p.n)
                 : (p.n.length>15 ? partes[0]+' '+(partes.slice(-1)[0]||'') : p.n);
      const en = Math.round(p.energy!=null?p.energy:100);
      // o goleiro é ancorado pela BASE (e com o nome acima da camisa, ver .cl-pp.gk): assim ele
      // encosta na pequena área, como no jogo, sem o nome vazar pra fora do gramado
      /* ===== O MESMO ONZE, DEITADO =====
         No campo em pé a FAIXA (ataque/meio/defesa/gol) é vertical e a PISTA é horizontal. Deitado
         os dois eixos trocam: a faixa passa a ser a distância da esquerda e a pista, a altura.
         `100-top` é o que põe o ataque à DIREITA — no campo em pé a faixa conta do topo (ataque),
         e deitado a leitura natural é atacar para a direita, com o próprio gol atrás. */
      const pos = deitado
        ? (sec==='GK' ? `left:4%` : `left:${(100-top).toFixed(2)}%`)
        : (sec==='GK' ? `bottom:2%` : `top:${top}%`);
      const eixo = deitado ? `top:${left.toFixed(2)}%` : `left:${left.toFixed(2)}%`;
      return `<button type="button" class="cl-pp${dense}${sec==='GK'?' gk':''} ${selc?'sel':''} ${unavail?'unavail':''}"
        style="${eixo};${pos}" data-pid="${escC(p.pid)}" data-sec="${p.s}"
        onpointerdown="clDragStart(event,'${escC(p.pid)}')" onkeydown="if(event.key==='Enter'||event.key===' ')clSelPlayer('${escC(p.pid)}')"
        title="${escC(p.n)} — ${escC(SETOR_FORCA[p.s]||'')} · força ${p.f} · energia ${en}% · arraste pro banco pra tirar">
        ${shirtHTML(p,th,nums[p.pid])}
        <span class="cl-pp-name">${escC(nome)}${unavail?(p.suspended>0?' 🟥':' ✚'):''}</span>
        ${typeof rfPitchMetaHTML==='function'?rfPitchMetaHTML(p):chipMetaHTML(p)}
      </button>`;
    }).join('');
  }).join('');

  /* ===== AS LINHAS SÃO O MESMO DESENHO, RODADO =====
     O campo é desenhado à mão num espaço 100×118 (em pé). Manter um segundo SVG para o deitado
     seria manter dois desenhos em sincronia para sempre — e o segundo ia ficar para trás no dia
     em que alguém mexesse numa linha. Em vez disso o espaço passa a 118×100 e o conteúdo roda
     90°: `translate(118,0) rotate(90)` leva (x,y) para (118−y, x), ou seja, o topo do campo (o
     ataque) vai parar à direita, que é a leitura natural de um campo deitado. */
  const vb   = deitado ? '0 0 118 100' : '0 0 100 118';
  const gAbre= deitado ? '<g transform="translate(118,0) rotate(90)">' : '';
  const gFecha= deitado ? '</g>' : '';
  return `<div class="cl-pitch-block ${CL.benchOpen===false?'banco-fechado':''}">
  <div class="cl-pitch-wrap">
    ${pitchAdsHTML('top',3,0)}
    <div class="cl-pitch-mid">
      ${pitchAdsHTML('left',3,1)}
      <div class="cl-pitch ${deitado?'deitado':''}">
        ${typeof rfPitchMarcaHTML==='function'?rfPitchMarcaHTML():''}
        <svg class="cl-pitch-lines" viewBox="${vb}" preserveAspectRatio="none" aria-hidden="true">${gAbre}
          ${[0,1,2,3,4,5,6,7,8,9].map(i=>`<rect x="0" y="${i*11.8}" width="100" height="11.8" fill="${i%2?'#2f7d34':'#35883a'}"/>`).join('')}
        ${gFecha}</svg>
        <!-- guia de setores: os quadrantes que a formação usa pra posicionar o time. Fica bem
             discreto (é orientação, não marcação de campo de verdade). -->
        <svg class="cl-pitch-lines" viewBox="${vb}" preserveAspectRatio="none" aria-hidden="true"
             fill="none" stroke="rgba(255,255,255,.13)" stroke-width=".6" stroke-dasharray="2 3">${gAbre}
          <path d="M3 24h94M3 54h94M3 84h94"/><path d="M36 3v112M67 3v112"/>
        ${gFecha}</svg>
        <svg class="cl-pitch-lines" viewBox="${vb}" preserveAspectRatio="none" aria-hidden="true"
             fill="none" stroke="rgba(255,255,255,.8)" stroke-width=".7">${gAbre}
          <rect x="3" y="3" width="94" height="112"/>
          <path d="M3 59h94"/>
          <circle cx="50" cy="59" r="12"/><circle cx="50" cy="59" r="1" fill="rgba(255,255,255,.8)" stroke="none"/>
          <rect x="24" y="3" width="52" height="17"/><rect x="38" y="3" width="24" height="6"/>
          <rect x="24" y="98" width="52" height="17"/><rect x="38" y="109" width="24" height="6"/>
          <circle cx="50" cy="13" r="1" fill="rgba(255,255,255,.8)" stroke="none"/>
          <circle cx="50" cy="105" r="1" fill="rgba(255,255,255,.8)" stroke="none"/>
          <path d="M39 20a12 12 0 0 0 22 0"/><path d="M39 98a12 12 0 0 1 22 0"/>
          <path d="M3 8a5 5 0 0 0 5-5"/><path d="M97 8a5 5 0 0 1-5-5"/>
          <path d="M3 110a5 5 0 0 1 5 5"/><path d="M97 110a5 5 0 0 0-5 5"/>
          <rect x="42" y="0" width="16" height="3" stroke-width=".9" fill="rgba(255,255,255,.18)"/>
          <rect x="42" y="115" width="16" height="3" stroke-width=".9" fill="rgba(255,255,255,.18)"/>
        ${gFecha}</svg>
        ${nodes}
      </div>
      ${pitchAdsHTML('right',3,2)}
    </div>
    ${pitchAdsHTML('bottom',3,1)}
  </div>
  ${benchHTML(th,nums)}
</div>`;
}

function panSeleccao(){
  if(typeof ensureMyXIResolves==='function') ensureMyXIResolves(); // nunca deixa o botão Jogar cinza por S.xi dessincronizado (online)
  const xi=xiPlayers(CL.clubId); const gkCount=xiGKCount(xi);
  const ok=xi.length>=11 && CL.tacticChosen && gkCount===1;
  const gkWarn = (CL.tacticChosen && xi.length>=11 && gkCount!==1)
    ? `<div class="cl-sel-note" style="color:#b00">⚠ ${gkCount===0?'Nenhum goleiro escalado.':'Mais de um goleiro escalado ('+gkCount+').'} Ajuste em "Substituir" pra liberar o Jogar.</div>` : '';
  // "Seleccionar descansados": só aparece depois que uma formação foi escolhida (mesmo gate
  // usado pelo botão Substituir logo abaixo). Reescala os mesmos setores da formação atual,
  // mas priorizando energia (menos cansados) em vez de força.
  // formações disponíveis com atalhos — estilo vintage RetroFoot98. Além das 6 formações,
  // inclui os modos rápidos "Automático" e "Melhores" no mesmo grid (4 colunas, quadrados
  // menores pra alinhar 8 opções em 2 linhas).
  const formKeys = Object.keys(FORMATIONS);
  const formOpts = formKeys.map(f=>({sel:!CL.xiModo && CL.formation===f, on:`clSelFormation('${f}');cdraw()`, main:f, sub:FKEY[f], title:'Tecla '+FKEY[f]}))
    .concat([
      {sel:CL.xiModo==='auto', on:"clSelFormation('auto');cdraw()", main:'Auto', sub:'A', title:'Escalação automática'},
      {sel:CL.xiModo==='best', on:"clSelFormation('best');cdraw()", main:'11+',  sub:'Melhores', title:'O melhor de cada posição'},
    ]);
  const formationsBlock = `<div class="cl-sel-formations">
    <div class="cl-formgrid">
      ${formOpts.map(o=>{
        const btnStyle = o.sel
          ? 'border:2px solid;border-color:#fff #111 #111 #fff;background:#2f8f2f;color:#fff;font-weight:700'
          : 'border:2px solid;border-color:#999 #333 #333 #999;background:#ccc;color:#000;font-weight:700';
        return `<button style="padding:5px 3px;text-align:center;font-size:11.5px;cursor:pointer;${btnStyle}" onclick="${o.on}" title="${escC(o.title)}">${escC(o.main)}<br><small style="font-size:9px;opacity:.7">${escC(o.sub)}</small></button>`;
      }).join('')}
    </div>
  </div>`;

  // O CAMPO ROLA, O RODAPÉ NÃO. Formações, "Seleccionar descansados" e "Jogar" são as decisões
  // da aba — ficam ancoradas na base, do mesmo tamanho e alinhadas, enquanto o campo e o banco
  // ocupam o espaço que sobra.
  return `<div class="cl-sel">
    ${CL.tacticChosen?'':'<div class="cl-sel-note">Escolha a tática para liberar o <b>Jogar</b>.</div>'}
    ${gkWarn}
    <div class="cl-sel-top">
      ${pitchHTML()}
    </div>
    <div class="cl-sel-foot">
      ${formationsBlock}
      <div class="cl-sel-acts">
        ${btn('Seleccionar descansados','clSelectRested()',{icon:'🔋',cls:'cl-btn-ok',dis:!CL.tacticChosen,title:'Reescala o onze priorizando quem está com mais energia, dentro da mesma formação'})}
        ${jogarBtnHTML(ok)}
      </div>
    </div>
  </div>`;
}
/* ===== TROCA POR ARRASTE (campo ⇄ banco) =====
   Antes a troca vivia atrás de um botão de modo ("Substituir"): entrava-se num estado, tocava-se
   em dois jogadores e saía-se. Um modo é uma pergunta a mais ("estou dentro ou fora?") pra uma
   ação que o gesto já explica sozinho — arrastar a camisa de quem entra por cima de quem sai.
   Sem modo, o toque simples volta a significar só uma coisa: mostrar o jogador na lista.

   É Pointer Events, não HTML5 drag-and-drop, porque o segundo não existe no toque — e trocar
   jogador no telefone é justamente onde isso mais importa. O mesmo código serve mouse e dedo.

   Três destinos válidos ao soltar:
     · em cima de outro jogador  -> troca os dois (mesma posição, um em campo e outro no banco)
     · no banco, fora de qualquer jogador -> o titular sai e entra o melhor reserva da posição
     · no gramado, fora de qualquer jogador -> o reserva entra no lugar do pior titular da posição
   A regra de MESMA POSIÇÃO é a mesma de sempre: ela garante de graça o invariante de um goleiro
   só em campo, e mantém o desenho da formação de pé. */
const DRAG={ pid:null, sec:null, el:null, ghost:null, moved:false, x0:0, y0:0 };
function clDragStart(ev,pid){
  if(ev.button!=null && ev.button!==0) return;   // só o botão principal
  const p=pById(pid,CL.clubId); if(!p) return;
  // sem preventDefault, o mousedown DÁ FOCO ao botão e o navegador rola o container pra
  // trazê-lo à vista: o campo inteiro pulava debaixo do cursor no meio do arraste, e o solte
  // caía noutro lugar. Sem foco também não há seleção de texto arrastando junto.
  ev.preventDefault();
  DRAG.pid=pid; DRAG.sec=p.s; DRAG.el=ev.currentTarget; DRAG.moved=false;
  DRAG.x0=ev.clientX; DRAG.y0=ev.clientY;
  window.addEventListener('pointermove',clDragMove,{passive:false});
  window.addEventListener('pointerup',clDragEnd);
  window.addEventListener('pointercancel',clDragAbort);
}
function clDragMove(ev){
  if(!DRAG.pid) return;
  if(!DRAG.moved){
    if(Math.abs(ev.clientX-DRAG.x0)+Math.abs(ev.clientY-DRAG.y0) < 6) return;   // ainda é um toque
    DRAG.moved=true;
    /* O fantasma que segue o cursor precisa achar a camisa do ORIGEM. A pele
       antiga desenha `.cl-pp-shirt`; o banco novo (rf26-formacao) desenha
       `.rf-bj`. Como aqui só se procurava a antiga, arrastar do banco criava um
       fantasma VAZIO: a substituição acontecia, mas nada seguia o mouse. */
    const camisa=DRAG.el.querySelector('.cl-pp-shirt, .rf-bj');
    const doBanco=!!camisa && camisa.classList.contains('rf-bj');
    /* CAMISA DE IMAGEM entra INTEIRA. O clube com uniforme do Estúdio desenha
       `.rf-jersey-img`, cujo miolo é um <img> de 1024px posicionado pelo
       PRÓPRIO invólucro. Copiando só o miolo, o <img> ficava solto no fantasma
       — e `.cl-dnd-ghost svg` dimensiona svg, não imagem — então ele estourava
       em tamanho natural na tela e sumia ao soltar. Com o invólucro junto, ele
       leva o tamanho consigo. */
    const deImagem=!!camisa && camisa.classList.contains('rf-jersey-img');
    DRAG.ghost=document.createElement('div');
    DRAG.ghost.className='cl-dnd-ghost'+(doBanco?' de-banco':'');
    DRAG.ghost.innerHTML = !camisa ? '' : ((doBanco||deImagem) ? camisa.outerHTML : camisa.innerHTML);
    document.body.appendChild(DRAG.ghost);
    DRAG.el.classList.add('dragging');
    // acende só quem pode receber: mesma posição, e um dos dois tem que estar em campo
    const xiSet=new Set(S.xi||[]); const souTitular=xiSet.has(DRAG.pid);
    document.querySelectorAll('.cl-pp,.cl-bp').forEach(el=>{
      const alvo=pById(el.getAttribute('data-pid'),CL.clubId); if(!alvo) return;
      if(alvo.pid!==DRAG.pid && alvo.s===DRAG.sec && xiSet.has(alvo.pid)!==souTitular
         && !(souTitular && (alvo.suspended>0||alvo.injuredMatches>0))) el.classList.add('alvo');
    });
    const zona=document.querySelector(souTitular?'.cl-bench':'.cl-pitch');
    if(zona) zona.classList.add('alvo-zona');
  }
  ev.preventDefault();
  DRAG.ghost.style.left=ev.clientX+'px';
  DRAG.ghost.style.top =ev.clientY+'px';
}
function clDragLimpa(){
  if(DRAG.ghost) DRAG.ghost.remove();
  if(DRAG.el) DRAG.el.classList.remove('dragging');
  document.querySelectorAll('.alvo').forEach(el=>el.classList.remove('alvo'));
  document.querySelectorAll('.alvo-zona').forEach(el=>el.classList.remove('alvo-zona'));
  window.removeEventListener('pointermove',clDragMove);
  window.removeEventListener('pointerup',clDragEnd);
  window.removeEventListener('pointercancel',clDragAbort);
  DRAG.pid=null; DRAG.el=null; DRAG.ghost=null;
}
function clDragAbort(){ clDragLimpa(); }
function clDragEnd(ev){
  const pid=DRAG.pid, moveu=DRAG.moved;
  if(moveu && DRAG.ghost) DRAG.ghost.style.display='none';   // pra não ser ele o elemento sob o dedo
  const sob = moveu ? document.elementFromPoint(ev.clientX,ev.clientY) : null;
  clDragLimpa();
  if(!moveu || !pid){ if(pid) clSelPlayer(pid); return; }      // foi toque, não arraste: só seleciona
  // arrastou: o clique que vem logo atrás do pointerup não deve selecionar ninguém
  window.addEventListener('click',e=>{ e.stopPropagation(); e.preventDefault(); },{capture:true,once:true});
  if(!sob) return;
  const chip=sob.closest && sob.closest('.cl-pp,.cl-bp');
  if(chip){ clTrocarPorPid(pid, chip.getAttribute('data-pid')); return; }
  const xiSet=new Set(S.xi||[]); const souTitular=xiSet.has(pid);
  const p=pById(pid,CL.clubId); if(!p) return;
  if(souTitular && sob.closest && sob.closest('.cl-bench')){
    // titular solto no banco: entra o melhor reserva disponível da mesma posição
    const entra=squad(CL.clubId).filter(q=>!xiSet.has(q.pid) && q.s===p.s && !(q.suspended>0) && !(q.injuredMatches>0))
      .sort((a,b)=>b.f-a.f)[0];
    if(!entra){ toastC('Não há reserva de '+posLetter(p.s)+' disponível pra entrar.'); return; }
    clTrocarPorPid(pid, entra.pid); return;
  }
  if(!souTitular && sob.closest && sob.closest('.cl-pitch')){
    // reserva solto no gramado: sai o titular mais fraco da mesma posição
    const sai=xiPlayers(CL.clubId).filter(q=>q.s===p.s).sort((a,b)=>a.f-b.f)[0];
    if(!sai){ toastC('Não há ninguém de '+posLetter(p.s)+' em campo pra sair.'); return; }
    clTrocarPorPid(pid, sai.pid); return;
  }
}
/* a troca em si — um titular sai, um reserva entra. Único caminho que mexe em S.xi na aba
   Formação, então as travas (mesma posição, jogador disponível) moram todas aqui. */
function clTrocarPorPid(aPid,bPid){
  const a=pById(aPid,CL.clubId), b=pById(bPid,CL.clubId);
  if(!a||!b||a.pid===b.pid) return;
  if(a.s!==b.s){ toastC('Só dá pra trocar jogadores da mesma posição ('+posLetter(a.s)+').'); return; }
  const xiSet=new Set(S.xi||[]);
  const aTit=xiSet.has(a.pid), bTit=xiSet.has(b.pid);
  if(aTit===bTit){ toastC(aTit?'Os dois já estão em campo.':'Os dois estão no banco.'); return; }
  const outP=aTit?a:b, inP=aTit?b:a;
  if(inP.suspended>0||inP.injuredMatches>0){ toastC('Esse jogador não está disponível.'); return; }
  S.xi=(S.xi||[]).map(x=>x===outP.pid?inP.pid:x);
  toastC(inP.n.split(' ').slice(-1)[0]+' entrou no lugar de '+outP.n.split(' ').slice(-1)[0]+' na escalação.');
  saveV3(); republicarEscalacao(); cdraw();
}
/* ---- PORTÃO DE LARGADA DA RESENHA (o mesmo pra liga e pra copa) ----
   A LIGA sempre teve largada coordenada: clicar em "Jogar" marca PRONTO e espera; o servidor vira
   a fase pra 'running' quando todos estão prontos (ou o cronômetro zera) e, no mesmo update,
   congela o snapshot de escalações (start_running/kickoff_lineups). Aí a rede de segurança
   (onlineRunRound) põe todo mundo em campo no mesmo tique, simulando os mesmos jogos com os
   mesmos inputs.
   A COPA não passava por nada disso: o clique entrava direto na partida. Dois humanos da mesma
   competição começavam com a diferença de tempo entre os cliques deles, e a partida de um chegava
   ao outro como simulação local em vez de transmissão ao vivo — não se transmite um jogo que já
   acabou. Era a origem de "as telas da Sul-Americana e da Libertadores não aparecem juntas".
   Agora as duas competições passam pelo mesmo portão. Devolve true quando ainda não é hora de
   entrar (marquei pronto e estou esperando); false quando pode entrar em campo agora — porque a
   fase já é 'running' (retardatário se juntando à rodada que começou) ou porque é modo solo. */
function onlineJogarGate(){
  if(!CL.online) return false;
  if(typeof onlinePhaseRunning==='function' && onlinePhaseRunning()) return false;
  if(typeof onlineMarkReady==='function') onlineMarkReady();
  return true;
}
function clJogar(){
  /* ===== UMA PARTIDA DE CADA VEZ =====
     `clJogar` reentra: a cerimônia de sorteio chama-o de volta no fim (`checkPendingCupDraws(
     ()=>clJogar())`), e o onDone dispara mais de uma vez. Sem esta porta, a primeira volta abria
     a partida da COPA e a segunda — encontrando a copa já carimbada — seguia para a liga e
     escrevia por cima de `CL.live`. Medido em 18/08/2026 numa rodada 4: a Libertadores abria,
     ficava marcada como vista, e o que aparecia na tela eram os 40 jogos da Série D. A copa
     nunca era assistida e era resolvida em segundo plano — exatamente o "não vejo as finais".
     Se já há partida em campo, não se começa outra. Quem termina uma partida chama o fim dela
     (finishCupSpectate/finishCupLiveMatch/finishLiveRound), nunca este botão.

     MAS A TRAVA NUNCA PODE MATAR O BOTÃO. `if(CL.live) return` era absoluto: bastava um `CL.live`
     ficar para trás — partida encerrada cujo objeto não foi limpo, ou tela abandonada por outro
     caminho — para Jogar / Assistir / Ver classificação deixarem de responder PARA SEMPRE, e o
     save ficava sem saída. Foi o relatado a 18/08 ("parou de funcionar depois de uma rodada").
     Então a trava vale só enquanto a partida está MESMO a decorrer e na tela dela; um objeto
     órfão é limpo aqui e o jogo segue. Botão morto é pior que partida repetida. */
  if(CL.live){
    if(!CL.live.done && CL.screen==='live') return;      // em campo, a sério: nada entra por cima
    console.warn('partida órfã em CL.live (done='+!!CL.live.done+', tela='+CL.screen+') — limpa para o botão voltar a responder');
    CL.live=null;
  }
  if(CL._seatContext){ clSeatPlay(); return; } // hotseat: "Jogar" na tela do assento inicia a partida dele
  // CLASSIFICAÇÃO DE COPA PENDENTE: numa rodada com mais de uma competição, a fila para na tela
  // do clube entre uma e outra (ver cupClassifContinue). O próximo "Jogar" retoma dela — antes de
  // qualquer partida, porque ela é da rodada que acabou de ser resolvida.
  if(CL._cupClassifQueue && CL._cupClassifQueue.length){
    showCupClassif(CL._cupClassifQueue.shift(), CL._cupClassifRound); return;
  }
  /* RODADA SEM CAMPO NAO PEDE FORMACAO — o mesmo desvio do rotulo (ver rfProximaAcao):
     tatica e goleiro sao condicoes para entrar em campo, e numa rodada em que o clube nao
     joga o clique e "Avançar". Sem isto o botao dizia Avançar e o clique respondia com o
     toast da tatica. */
  const _semCampo = !CL.online && typeof rfNadaParaJogar==='function' && rfNadaParaJogar();
  if(!_semCampo && !CL.tacticChosen){ toastC('Escolha a tática no menu Formação primeiro.'); CL.tab='seleccao'; cdraw(); return; }
  /* SORTEIO ANTES DE ENTRAR EM CAMPO. Cada copa tem a sua data de sorteio (ver cupSeasonDrawDays
     no core: dois dias antes da própria estreia, nunca no dia 1 e nunca a menos de 2 dias do
     sorteio de outra). Aqui, no começo da rodada, entram na fila os sorteios cuja data já chegou —
     e a cerimônia roda ANTES de qualquer partida, que é a garantia de "só há jogo depois do
     sorteio daquela copa". Se enfileirou alguma coisa, mostra e volta pra cá quando terminar. */
  {
    const novos=(typeof queueDueCupDraws==='function')?queueDueCupDraws():0;
    /* A FILA COMPARTILHADA TAMBEM CONTA. S._pendingDrawShows viaja no shared_state, entao ela
       pode chegar aqui JA CHEIA sem que queueDueCupDraws enfileire nada de novo -- e o clique
       caia direto nas portas da sala, sem abrir sorteio nenhum: era o "Ver o sorteio" que nunca
       ia ao sorteio. checkPendingCupDraws ja sabe dispensar entrada que eu ja vi, entao drenar
       aqui ou mostra a cerimonia devida ou limpa a fila velha e segue. */
    const fila=(typeof S!=='undefined' && S && S._pendingDrawShows && S._pendingDrawShows.length)||0;
    if((novos||fila) && typeof checkPendingCupDraws==='function'){
      checkPendingCupDraws(()=>clJogar()); return;
    }
  }
  if(!_semCampo){ const gkc=xiGKCount(xiPlayers(CL.clubId));
    if(gkc!==1){ toastC(gkc===0?'Escale um goleiro antes de jogar.':'Só pode ter 1 goleiro escalado.'); CL.tab='seleccao'; cdraw(); return; } }
  // semana de avanço de copa com partida do clube pendente: joga a copa primeiro, só
  // depois libera a rodada — ver pendingUserCupMatches/clCupResultContinue. Se houver
  // mais de uma competição pendente na mesma semana (ex: Copa do Brasil + Libertadores),
  // jogamos só a PRIMEIRA agora — ao voltar pra tela principal, pendingUserCupMatches()
  // já não vai mais incluir essa (foi resolvida), e o próximo clique em "Jogar" pega a
  // seguinte. Isso garante que o jogador sempre passa pela tela de escalação de novo
  // antes de cada partida, mesmo dentro da mesma rodada/semana — nunca encadeamos duas
  // partidas ao vivo direto uma atrás da outra. Vale pros dois modos: online já vem
  // filtrado (pendingUserCupMatches exclui confronto humano x humano da mesma sala,
  // resolvido em segundo plano igual sempre foi).
  // MESMA fonte que a tela principal usa pra anunciar o próximo jogo (nextUserMatch) — é o que
  // garante que o confronto escalado é o confronto jogado.
  /* ===== A COMPETIÇÃO DO DIA MANDA TAMBÉM AQUI, NO BOTÃO "JOGAR" =====
     Esta era a última porta que ainda decidia sozinha. A rede de segurança automática
     (onlineRunRound) já filtrava tudo pela competição do dia, mas o clique do jogador não: ele
     pegava a PRIMEIRA partida pendente da SUA lista. Como cada humano tem confrontos diferentes, a
     lista de cada um começava por uma competição diferente — o anfitrião entrava na Sul-Americana
     enquanto o outro entrava na Copa do Brasil, cada um assistindo à do outro depois, fora de
     ordem. Foi o relatado, e é a causa direta de "cada um numa tela".
     Com o dia mandando, só existe uma pergunta: o que está em campo HOJE? Se eu tenho confronto
     nessa competição, eu jogo; se não tenho, eu assisto; se o dia é de liga, nenhuma copa entra. */
  const dia=(typeof roomDay==='function')?roomDay():null;
  if(dia && dia.hold){ toastC('⏳ A sala está acertando a rodada — um instante.'); return; }
  /* PASSO 1: O MOMENTO MANDA NA TELA. Enquanto a sala está em 'escalando', "Jogar" quer dizer
     "ESTOU PRONTO" — e mais nada. A partida só entra em campo quando o servidor disser que o
     último assento chegou (momento 'jogando'), e aí ela entra para todos ao mesmo tempo. Era
     exatamente aqui que a sala se partia: quem clicava primeiro começava a jogar enquanto o outro
     ainda escolhia o time, e a "mesma tela para todos" virava sorte. */
  if(dia && dia.moment==='escalando'){
    if(CL.online && typeof onlineMarkReady==='function'){
      if(CL._readyForStage===onlineStageKey()) toastC('⏳ Pronto! Esperando os outros treinadores.');
      else onlineMarkReady();
    }
    return;
  }
  if(dia && dia.moment==='classificacao'){ toastC('⏳ A rodada está fechando — um instante.'); return; }
  const copaDoDia=(dia && dia.comp!=='liga') ? dia.comp : null;   // null = dia de liga, ou sala sem ponteiro
  const diaDeLiga=!!(dia && dia.comp==='liga');
  const prox=nextUserMatch();
  if(prox && prox.kind==='cup' && !diaDeLiga && (!copaDoDia || (prox.pending&&prox.pending.key)===copaDoDia)){
    // A COPA ENTRA EM CAMPO PELO MESMO PORTÃO DA LIGA (ver onlineJogarGate).
    if(onlineJogarGate()) return;
    showCupIntro(prox.pending); return;
  }
  // nenhuma partida de copa pra JOGAR nesta rodada — mas pode ter rodada de copa rolando de
  // competições das quais o usuário não participa (ou já foi eliminado, ou pegou bye). Ele passa
  // por ela do mesmo jeito, uma competição de cada vez, antes de liberar a rodada de liga.
  // Assistir não escreve nada no estado, então cupWasSeen/cupMarkSeen é que lembram o que já foi
  // cumprido NESTA rodada — sem isso a mesma competição reapareceria a cada clique em "Jogar"
  // (o marcador é por temporada+rodada, ver cupRoundKeyNow).
  // RODADA COLETIVA — VALE PROS DOIS MODOS. Quem não disputa a competição (ou já foi eliminado,
  // ou pegou bye) vê a MESMA rodada ao vivo que quem joga, e depois a mesma classificação. Não é
  // mais uma oferta ("quer assistir?") nem um aviso de que hoje não tem jogo pra ele: é a tela da
  // rodada, igual pra todo mundo. É isso que mantém a sala inteira na mesma tela no mesmo momento
  // — a origem das travadas de sincronia era justamente cada um cumprir a sua obrigação numa hora
  // diferente. Assistir é seguro: a partida de outro humano vem do resultado publicado ou da
  // transmissão ao vivo dele, não de uma simulação local (ver buildLiveMatchObject/isCup).
  // ASSISTIR TAMBÉM SEGUE O DIA: a competição em campo é a do ponteiro, nunca a primeira da minha
  // lista. Quem não tem confronto hoje assiste EXATAMENTE a mesma competição que quem tem.
  const idle=cupRoundsUserSitsOut()
    .filter(c=>!cupWasSeen(c.key))
    .filter(c=>!diaDeLiga && (!copaDoDia || c.key===copaDoDia));
  if(idle.length){
    if(onlineJogarGate()) return;    // mesmo portão: quem assiste entra JUNTO com quem joga
    const cand=idle[0];
    CL._pendingCupIdleQueue=idle.slice(1);
    /* FASE 3: O CARIMBO SO DEPOIS DE A TELA ABRIR.
       cupMarkSeen era escrito ANTES de startCupRound. Se a rodada nao chegasse a entrar em
       campo (estado inesperado, erro no meio, o jogador a sair da tela), a competicao ficava
       marcada como vista sem nunca ter sido mostrada — e o avanco em segundo plano resolvia-a
       em silencio. Uma competicao inteira desaparecia da rodada. */
    /* O CARIMBO É O FIM DA PARTIDA, NÃO O COMEÇO. Ele era escrito aqui, assim que a tela abria —
       e "abriu" não é "foi assistida": bastava a partida ser substituída no mesmo clique para a
       competição ficar dada como cumprida sem ninguém ter visto nada. Quem carimba agora é
       finishCupSpectate, ao terminar. A porta acima (`if(CL.live) return`) é que garante que a
       competição não reaparece enquanto está a ser vista.
       No caminho de baixo o carimbo FICA: aí não há confronto nenhum para mostrar, e sem ele a
       competição voltaria a cada clique. */
    if(startCupRound(cand.key, cand.stage, null)) return;
    cupMarkSeen(cand.key);
    showCupIdleMessage(cand); return;   // sem confrontos pra mostrar: mantém o aviso antigo
  }
  if(CL.online){ onlineMarkReady(); return; }
  /* REDE DE SEGURANCA: RODADA SEM NADA PARA JOGAR.
     startLiveRound() monta a rodada a partir de S.sched[S.round]. Numa rodada
     sem jogo de liga E sem copa pendente ele nao faz NADA — sem erro, sem
     aviso, sem partida: o botao "Jogar" fica mudo e a temporada nunca fecha.
     Medido: CL.live continua nulo, 0 jogos, a tela nao muda.

     A rodada vazia e legitima e existe de proposito — prorrogarPorCopasPendentes
     empurra `S.sched.push([])` para as copas devedoras jogarem. O problema e o
     caso em que essa rodada tambem nao tem copa: por teto de prorrogacao, por
     copa resolvida noutro caminho, ou por qualquer desvio de estado. Ai nao ha
     o que jogar, e o certo e FECHAR a temporada em vez de ficar parado.
     Melhor uma temporada que fecha do que um jogo que nao anda. */
  if(typeof rfNadaParaJogar==='function' && rfNadaParaJogar()){ clAvancarDia(); return; }
  startLiveRound();
}
/* ===== PASSAR O DIA (fase 2 do calendario) =====
   Rodada sem jogo de liga e sem copa. Desde que as copas deixaram de ser
   espremidas dentro da liga, isto acontece de propria: entre o fim da liga e a
   final da Libertadores ha semanas sem nada em campo, e a temporada precisa de
   as atravessar. Antes o botao dizia "Jogar" e nao fazia NADA — medido: sem
   partida, sem tela nova, sem erro. Agora ele diz "Avancar" e avanca.

   E se ja nao ha mais rodada nenhuma, a temporada FECHA aqui. Melhor uma
   temporada que termina do que um jogo que nao anda. */
function clAvancarDia(){
  if(CL.online) return;                        // na Resenha quem manda no dia e o servidor
  /* ===== FASE 3: NUNCA PASSAR POR CIMA DE UM JOGO =====
     Este botao so devia aparecer em rodada vazia, mas ele tambem e o caminho por onde
     clJogar fecha a temporada — e uma rodada com jogo de liga ou com copa por ver nao pode
     ser saltada nem fechar temporada nenhuma. Se ainda ha o que jogar hoje, o clique vale
     como "Jogar". */
  if(typeof rfNadaParaJogar==='function' && !rfNadaParaJogar()){ clJogar(); return; }
  /* ===== FASE 3: A TEMPORADA SO ACABA DEPOIS DE TODAS AS COMPETICOES =====
     Antes de olhar para o fim do calendario, toda competicao que ainda deve rodada ganha dia
     marcado (ver copasPendentes/prorrogarPorCopasPendentes). E barato e so cria o que falta:
     competicao com dias suficientes ja marcados nao mexe em nada. Sem isto, o "Avancar" da
     ultima rodada encerrava a temporada com a final da Copa do Brasil e da Sul-Americana por
     jogar — sem partida, sem cerimonia e sem campeao. Era o relatado. */
  if(!S.finished && typeof prorrogarSeFaltaCopa==='function'){
    try{ prorrogarSeFaltaCopa(); }catch(e){ console.warn('prorrogar:', e&&e.message); }
  }
  const total=(S.sched||[]).length;
  /* ===== O "AVANCAR" DEPOIS DA ULTIMA RODADA NAO PODIA MORRER AQUI =====
     Ele fechava a temporada (endSeason) e redesenhava a MESMA tela: nem o dia
     passava nem aparecia nada -- o botao parecia morto, e clicar de novo so
     repetia o fecho em silencio. Quem mostra o fim de temporada e
     seasonEndDialog(), e e por la que se avanca para a temporada seguinte.
     A temporada tambem pode ja estar fechada (o proprio playRound fecha-a na
     ultima rodada): nesse caso nao se fecha outra vez, so se abre a tela. */
  if(S.round>=total-1 || S.finished){
    if(!S.finished && typeof endSeason==='function'){ try{ endSeason(); }catch(e){ console.warn('fim de temporada:', e&&e.message); } }
    if(typeof seasonEndDialog==='function'){ seasonEndDialog(); return; }
    cdraw(); return;
  }
  S.round++; S.week++; S.day+=7;
  /* ===== O DIA NOVO PODE TER FINAL. QUEM DECIDE E A ARQUIBANCADA, NAO ESTE BOTAO. =====
     Aqui estava o "nao vejo as finais" na sua forma final. O guarda la em cima pergunta se ha
     jogo HOJE; passava, o dia virava, e a linha seguinte resolvia em segundo plano as copas do
     dia NOVO -- que ninguem tinha visto ainda. Depois da rodada 38 a liga acaba e todos os
     dias passam a ser dias de copa: um clique em "Avancar" atropelava a final da Libertadores,
     a da Sul-Americana e a da Copa do Brasil de uma vez, e o que aparecia eram tres cerimonias
     de campeao seguidas. Foi exatamente o relato.
     O dia avanca e para. Se o dia novo tem copa para jogar ou para assistir, o botao passa a
     dizer "Jogar" ou "Assistir a rodada" (ver rfJogarLabel) e a partida entra em campo pelo
     caminho normal, com o jogador a ve-la. So um dia genuinamente sem nada para o humano e que
     segue para o avanco em segundo plano. */
  /* ===== A TACA DO DIA QUE ACABOU DE PASSAR VEM ANTES DE TUDO =====
     Esta saida antecipada — a que impede o "Avancar" de atropelar a final do dia novo — foi posta
     ANTES do `celebrarCopasDecididas` que ja existia mais abaixo. O efeito: cada dia de final era
     um dia em que se saia por aqui, e a cerimonia nunca corria. As tacas ficavam guardadas e
     saiam TODAS JUNTAS no fim da temporada, quando enfim aparecia um dia sem nada a cumprir.
     Era o relato: "no solo, todas as telas de celebracao aparecem juntas no fim".
     A regra e simples: uma copa decidida celebra-se assim que o dia dela passa, aconteca o que
     acontecer com o dia seguinte. */
  if(typeof celebrarCopasDecididas==='function' && celebrarCopasDecididas() && MOMENTO_FILA.length){
    try{ if(typeof save==='function') save(); }catch(e){}
    momentoSeguinte(()=>{ toastC('Dia passado — '+((typeof dataCurtaDaJornada==='function')?dataCurtaDaJornada(S.round,'liga'):'')); cdraw(); });
    return;
  }
  if(typeof rfNadaParaJogar==='function' && !rfNadaParaJogar()){
    try{ if(typeof save==='function') save(); }catch(e){}
    toastC('Dia passado — '+((typeof dataCurtaDaJornada==='function')?dataCurtaDaJornada(S.round,'liga'):''));
    cdraw(); return;
  }
  /* as copas correm na virada da rodada como em qualquer rodada — sem isto,
     passar o dia saltaria por cima de uma rodada de copa devida */
  try{ if(typeof advancePendingCups==='function') advancePendingCups(); }catch(e){ console.warn('copas ao passar o dia:', e); }
  /* se alguma final foi decidida neste avanco, a taca aparece agora — passar o
     dia nao pode engolir a cerimonia (ver celebrarCopasDecididas) */
  if(typeof celebrarCopasDecididas==='function' && celebrarCopasDecididas() && MOMENTO_FILA.length){
    try{ if(typeof save==='function') save(); }catch(e){}
    momentoSeguinte(()=>{ toastC('Dia passado — '+((typeof dataCurtaDaJornada==='function')?dataCurtaDaJornada(S.round,'liga'):'')); cdraw(); });
    return;
  }
  try{ if(typeof save==='function') save(); }catch(e){}
  toastC('Dia passado — '+((typeof dataCurtaDaJornada==='function')?dataCurtaDaJornada(S.round,'liga'):''));
  cdraw();
}
/* ---- MARCADOR DE COPA JÁ VISTA NESTA RODADA ----
   Antes eram dois arrays (_spectatedKeysThisRound no solo, _cupIdleShownThisRound na Resenha)
   zerados assim que a fila esvaziava — ou seja, no clJogar SEGUINTE. Só que a rodada de copa
   continua "acontecendo" até a rodada de LIGA avançar: com o marcador já apagado, qualquer novo
   clique em Jogar reexibia a MESMA rodada de copa, do zero. Era a reprise (a mesma rodada várias
   vezes na temporada). Agora o marcador é amarrado a (temporada, rodada): não se apaga por fluxo,
   só deixa de valer quando a rodada de fato muda. */
function cupRoundKeyNow(){ return (S.season||1)+'-'+(S.round||0); }
/* ===== "CUMPRI A COMPETIÇÃO DE HOJE" — MARCADO NO FIM, NUNCA NO COMEÇO =====
   cupWasSeen/cupMarkSeen marcam no INÍCIO: eles existem para o próximo clique em "Jogar" não
   reoferecer a mesma competição. Usar aquele marcador como carimbo do momento 'jogando' faria o
   dia virar com gente ainda em campo — o dia acabaria no apito de quem começou primeiro.
   Este aqui é o outro fato, e é o que o ponteiro precisa: eu terminei, seja jogando (a partida
   acabou e o resultado foi publicado) ou assistindo (a rodada da competição acabou na minha tela). */
function cupDayMarkDone(key){
  const rk=cupRoundKeyNow();
  if(!CL._cupDone || CL._cupDone.rk!==rk) CL._cupDone={ rk, keys:[] };
  if(!CL._cupDone.keys.includes(key)) CL._cupDone.keys.push(key);
}
function cupDayDone(key){
  const rk=cupRoundKeyNow();
  return !!(CL._cupDone && CL._cupDone.rk===rk && CL._cupDone.keys.includes(key));
}
function cupMarkSeen(key){
  const rk=cupRoundKeyNow();
  if(!CL._cupSeen || CL._cupSeen.rk!==rk) CL._cupSeen={ rk, keys:[] };
  if(!CL._cupSeen.keys.includes(key)) CL._cupSeen.keys.push(key);
}
function cupWasSeen(key){
  const rk=cupRoundKeyNow();
  return !!(CL._cupSeen && CL._cupSeen.rk===rk && CL._cupSeen.keys.includes(key));
}
/* ---- APRESENTAÇÃO DA RODADA DE COPA (antes de entrar em campo) ----
   Sem isto, clicar em "Jogar" numa semana de copa jogava o usuário DIRETO na tela ao vivo, com
   16 partidas de uma competição que ele não esperava — ele levava um susto e não entendia por
   que não era a rodada do Brasileirão. Agora toda partida de copa passa por esta tela primeiro:
   qual competição, qual fase, contra quem e onde. Vale pras duas modalidades (a rodada de liga
   continua entrando direto — o usuário sempre sabe que é a rodada da liga que ele pediu). */
function cupPhaseLabelFor(pending){
  if(pending.stage==='group'){
    const mg=pending.group;
    const tot=(mg&&mg.roundsTotal)||6;
    return `Fase de grupos · ${(mg?mg.round:0)+1}ª semana de ${tot}`;
  }
  const b=pending.bracket;
  return b ? cupPhaseLabel(b.round, b.roundsTotal) : 'Mata-mata';
}
/* `auto`: entra em campo sozinho depois de alguns segundos. Só usado na rede de segurança da
   Resenha (onlineRunRound, net/local-transport.js), que puxa o jogador pra copa porque a fase da
   rodada já virou 'running' — lá o cronômetro de 60s da sala está correndo e uma tela que espera
   clique travaria a rodada dos outros. No fluxo normal (clique em "Jogar") não tem timer: o
   jogador entra quando quiser. */
/* ENTRAR EM CAMPO DEIXOU DE TER UM MODAL NO CAMINHO.
   A apresentação existia por um motivo que acabou: quando a rodada podia começar SOZINHA (o
   cronômetro de 60s), o jogador caía direto numa tela ao vivo de uma competição que não esperava e
   levava um susto. Hoje ele não pode ser surpreendido — a partida só começa quando ele mesmo
   clicou em "Jogar" e todos os outros também; a competição do dia está no ponteiro, na barra de
   status e no próprio botão que ele apertou. O que sobrava era uma tela a mais e 6 segundos de
   espera por dia, multiplicados por cada humano da sala.
   O QUE NÃO SAIU: a cerimônia de abertura de fase eliminatória e a de FINAL de copa. Aquilo é
   jogo, não sincronia — aparece uma vez por confronto e continua aparecendo, encadeando direto na
   partida ao fechar. */
/* ===== A ANTECAMARA DA PARTIDA DE COPA SAIU (17/08/2026) =====
   Antes de cada confronto eliminatorio abria-se um momento -- "A COPA COMECA
   HOJE / Bola sorteada, jogo marcado" -- com area de video preta (nunca houve
   ficheiro para 'abertura-copa' nem para 'final-copa'), o trofeu achatado e uma
   faixa de publicidade. Ou seja: uma tela a mais entre o clique e o jogo, sem
   dizer nada que a propria partida nao diga a seguir. Decisao do dono do jogo:
   fora. Vai-se direto para a partida.

   Os momentos que FICAM sao os que fecham historia: campeao da copa (com o
   video de comemoracao), campeao da liga, artilheiro, acesso e queda. As
   entradas 'abertura-copa'/'final-copa' continuam definidas em MOMENTO_DEFS
   porque nada custa e um dia pode haver video; simplesmente ja ninguem as
   chama. */
function showCupIntro(pending, auto){
  CL._momPreCopa=false;
  startCupLiveMatch(pending);
}
/* A rodada de liga também entra direto (ver showCupIntro). */
function showLeagueIntro(){ CL._liveBusy=true; startLiveRound(); }
/* ---- MODO ESPECTADOR: assistir a uma rodada de copa de fora, sem participar —
   pergunta antes (Sim/Pular), e se aceitar mostra a partida (ou partidas, se for
   fase de grupos com vários jogos na mesma rodada) exatamente como um participante
   veria, só que nenhuma das duas equipes é controlada pelo usuário: motor roda
   sozinho, sem pênalti/lesão/substituição interativos (ver liveTick — só pausa pra
   modal quando `m.user` é verdadeiro, nunca é o caso aqui). Não escreve NADA no
   estado — quem resolve de verdade a partida continua sendo o avanço em segundo
   plano (advanceCupBracket/advanceGroupStageRound), que roda pouco depois; a seed
   usada aqui é EXATAMENTE a mesma que ele vai usar, então o placar assistido bate
   com o que fica gravado de verdade. */
/* A OFERTA "QUER ASSISTIR?" DEIXOU DE EXISTIR. A rodada de uma competição é do mundo: acontece no
   mesmo dia pra todo mundo e todo humano passa por ela, dispute ou não (e depois pela mesma
   classificação — ver queueRoundCupClassifs). Perguntar abria a porta pra um jogador pular a
   rodada e ficar numa tela diferente da dos outros, que é a origem das dessincronias. O clJogar
   entra direto em startCupRound; o que sobrou aqui é só o marcador de "esta competição já foi
   cumprida nesta rodada". */
function markSpectateHandled(key){
  cupMarkSeen(key);
}
/* ---- ÚLTIMO RECURSO: dia de copa SEM NENHUM CONFRONTO pra mostrar ----
   Só entra quando startCupRound não achou partida nenhuma naquela rodada da competição (raro:
   chave vazia entre fases). No caminho normal quem não disputa a competição VÊ a rodada ao vivo,
   como todo mundo — ver clJogar. Uma competição de cada vez; sempre volta pra tela principal e
   exige um novo "Jogar" antes de seguir (cupWasSeen lembra o que já foi cumprido nesta rodada). */
function showCupIdleMessage(cand){
  CL._cupIdleCand=cand;
  const nome=(COMP_DEFS[cand.key]&&COMP_DEFS[cand.key].name)||'copa';
  overlayC(dlg(nome, `
    <div class="cl-res"><div class="cl-live-cup-top" style="margin:-4px -4px 14px">${trophyImg(cand.key,48)}
      <div class="cl-live-cup-name">${escC(nome)}</div></div>
    <div class="cl-res-verd">Hoje é dia de ${escC(nome)}, mas você não participa dessa rodada.<br>
      Aproveite para preparar o seu time para o seu próximo jogo.</div>
    <div class="cl-cal-ok">${btn('Entendi','clCupIdleOk()',{icon:'✔',cls:'cl-btn-ok'})}</div></div>`,
    {w:480,bodyClass:'cl-body-green'}));
}
function clCupIdleOk(){
  clCloseOverlay();
  const cand=CL._cupIdleCand; CL._cupIdleCand=null;
  if(cand) cupMarkSeen(cand.key);
  const q=CL._pendingCupIdleQueue||[];
  if(q.length){ CL._pendingCupIdleQueue=q.slice(1); showCupIdleMessage(q[0]); return; }
  CL._pendingCupIdleQueue=null;
  CL.screen='main'; cdraw(); // volta pra tela principal; o próximo "Jogar" libera a rodada de liga
}
/* monta a(s) partida(s) da rodada ATUAL da competição indicada, todas com user:false
   (motor roda sozinho, sem pausar pra modal nenhum) — usa a MESMA fórmula de seed que
   advanceCupBracket/advanceGroupStageRound vão usar pra resolver de verdade essa
   mesma rodada em segundo plano (ver advancePendingCups), pro placar assistido bater
   exatamente com o que fica gravado. */
/* confrontos de uma rodada de copa, com as seeds AUTORITATIVAS — as MESMAS que o servidor usa
   (advanceCupBracket / advanceGroupStageRound), pra o que se assiste bater com o que fica gravado */
function cupRoundFixtures(key, stage){
  const c=S.cups[key]; const fixtures=[];
  if(!c) return fixtures;
  if(stage==='bracket'){
    const b = key==='copaBrasil' ? c : c.bracket; if(!b) return fixtures;
    const roundLabel = key==='copaBrasil' ? ('copaBrasil-r'+b.round) : (key+'-r'+b.round);
    (b.ties||[]).forEach(t=>{ fixtures.push({h:t.h,a:t.a,seed:hashSeed(S.seed,'cup',roundLabel,t.h,t.a)}); });
  } else {
    const mg=c.group; if(!mg) return fixtures;
    const roundLabel=key+'-grupo-r'+mg.round;
    Object.values(mg.groups).forEach(g=>{
      (g.sched[mg.round]||[]).forEach(([h,a])=>{
        if(h==null||a==null) return;
        fixtures.push({h,a,seed:hashSeed(S.seed,roundLabel,g.label,h,a)});
      });
    });
  }
  return fixtures;
}
/* ---- RODADA DE COPA COLETIVA: todo mundo assiste a TODOS os jogos, igual à rodada de liga ----
   Antes cada jogador via só a PRÓPRIA partida de copa, e quem não jogava recebia um aviso e ficava
   parado. Isso serializava a semana de copa (cada um cumpria a sua obrigação num momento diferente)
   e foi a origem de todas as travadas de pausa técnica: a barreira esperava jogador por jogador.
   Agora a copa é uma rodada como a da liga — a minha partida é a interativa (matches[0]) e as
   demais rolam junto na mesma tela. `pending` nulo = não tenho jogo nesta rodada: assisto tudo. */
function startCupRound(key, stage, pending){
  // mesma porta física da liga (ver startLiveRound): fora do momento 'jogando', nada entra em campo
  if(CL.online && typeof roomAllowsMatch==='function' && !roomAllowsMatch()){
    console.log('entrada na '+key+' barrada: a sala está em "'+roomMoment()+'", não em "jogando"');
    return false;
  }
  const fixtures=cupRoundFixtures(key, stage);
  if(!fixtures.length){
    // COMPETIÇÃO SEM NENHUM CONFRONTO HOJE (chave vazia entre fases): não há o que assistir, e isso
    // vale para todo mundo. Marcar cumprido aqui é o que impede o dia de copa de ficar esperando
    // por uma partida que não existe — a lista de "assisto" ainda inclui a competição, então o
    // "nada a cumprir" sozinho não cobriria este caso e a sala congelaria.
    if(!pending){ markSpectateHandled(key); cupDayMarkDone(key); }
    return false;                                            // quem chamou decide o que fazer (ver clJogar)
  }
  // a MINHA partida vem primeiro: finishCupLiveMatch, prorrogação e pênaltis leem RL.matches[0]
  const isMine=f=>pending && f.h===pending.h && f.a===pending.a;
  const ordered = pending ? fixtures.filter(isMine).concat(fixtures.filter(f=>!isMine(f))) : fixtures;
  const matches=ordered.map((f,i)=>buildLiveMatchObject(f.h,f.a,f.seed,
    { user:(pending && i===0) ? true : false, div:key, cupKey:key }));
  const RL={ jornada:S.round+1, minute:0, half:1, done:false,
    sel:(matches.length===1?0:null), subOpen:false, matches,
    cup: pending ? pending : {key, stage, spectate:true} };
  RL.maxMin=Math.max(94,...matches.map(m=>m.events.length?m.events[m.events.length-1].min:90));
  CL.live=RL; camKickoffLine(RL); CL.screen='live'; cdraw(); CL._liveTimer=setTimeout(liveTick,650);
  return true;
}
function startCupSpectate(cand){ startCupRound(cand.key, cand.stage, null); }
/* fim da rodada de copa de quem NÃO disputa a competição. Mesmo encadeamento nos dois modos (a
   fila é a _pendingCupIdleQueue, montada no clJogar): próxima competição da semana, e no fim de
   volta pra tela do clube. A classificação da competição vem depois, no fechamento da rodada —
   é o mesmo momento em que quem jogou também a vê (ver queueRoundCupClassifs). */
function finishCupSpectate(){
  const RL=CL.live;
  toastC('Rodada da '+COMP_DEFS[RL.cup.key].short+' assistida!');
  /* QUEM ASSISTE TAMBÉM FECHA A CHAVE, no mesmo instante de quem joga. Isto só existia no
     finishCupLiveMatch (quem tinha confronto): o espectador via as partidas ao vivo e ficava com a
     chave da competição por resolver até o servidor mandar o mundo novo. Enquanto a classificação
     vinha do fechamento da rodada, isso não aparecia; agora que cada dia de copa termina na sua
     própria tabela, o espectador abriria uma tabela ainda por preencher. É determinístico (mesmas
     sementes) e idempotente (S._cupResolvedRound), e o estado do servidor sobrescreve tudo no
     fechamento — então os dois veem a mesma chave, na mesma hora. */
  if(typeof resolveCupRoundRest==='function') resolveCupRoundRest(RL.cup.key);
  cupDayMarkDone(RL.cup.key);          // terminei de assistir: é ISTO que o ponteiro espera
  markSpectateHandled(RL.cup.key);
  CL.live=null; CL.screen='main'; cdraw();
  const q=CL._pendingCupIdleQueue||[];
  if(q.length){ const nx=q[0]; CL._pendingCupIdleQueue=q.slice(1);
    /* mesma regra da primeira: carimbar ao abrir daria a competição por vista sem ela ter sido.
       Quem carimba é esta mesma função, quando ESTA partida terminar. */
    if(startCupRound(nx.key, nx.stage, null)) return;
    cupMarkSeen(nx.key); }
  CL._pendingCupIdleQueue=null;
  /* ===== SOLO: A TACA SAI NO APITO FINAL, NAO NA PROXIMA TELA =====
     Assistir a final resolve a chave e cria o campeao — mas nada celebrava ali. A cerimonia
     ficava a espera do proximo caminho que chamasse `celebrarCopasDecididas`, e numa semana de
     finais (que nao tem rodada de liga) esse caminho so aparecia dias depois. O pedido do dono do
     jogo e que cada copa celebre logo apos a ULTIMA RODADA dela, como ja acontece na Resenha.
     SO NO SOLO, de proposito: na Resenha quem enfileira a cerimonia e o fechamento da rodada
     (queueRoundCupClassifs), que ja funciona e nao se toca. */
  if(!CL.online && typeof celebrarCopasDecididas==='function'
     && celebrarCopasDecididas() && MOMENTO_FILA.length){
    momentoSeguinte(()=>{ CL.screen='main'; CL.tab='jogo'; cdraw(); });
    return;
  }
  // se a fase virou 'running' enquanto eu assistia (borda perdida pelo guard CL.screen==='live'),
  // destrava a rodada de liga ao terminar de assistir.
  if(CL.online && typeof onlineRecoverRunRound==='function') onlineRecoverRunRound();
}
/* ---------- PARTIDA AO VIVO (estilo RetroFoot98: placar por divisões) ---------- */
function attendanceFor(homeId,rnd){
  const homeClub=(typeof clubOf==='function')?clubOf(homeId):null; const homeOv=(homeClub&&homeClub.overall)||70;
  // Capacidade: MESMO caminho pra qualquer clube, meu ou de outro humano ou da CPU — prioridade
  // é a capacidade persistida (S.clubStadiumCap, por clube — cresce por decisão do dono, humano
  // ou CPU, ver clBuildStand/applyCpuStadiumGrowth) > dado real do Transfermarkt (clube ainda
  // não semeado nesse save, ex. liga de fundo) > curva sintética.
  const cap=(S.clubStadiumCap && S.clubStadiumCap[homeId]) ? S.clubStadiumCap[homeId].capacity
    : (realCapFor(homeClub)||realStadiumCapacity(homeOv));
  // Preço: fixo por divisão (ticketPriceForDivision) — mesmo pra qualquer clube da mesma série.
  const homeDiv=(typeof clubDivisionOf==='function' ? clubDivisionOf(homeId) : null) || (homeClub&&homeClub.lg) || S.division;
  const price=ticketPriceForDivision(homeDiv);
  const tbl=S.table[homeId]||{Pts:0,P:0}; const form=(tbl.P?tbl.Pts/(tbl.P*3):0.5);       // momento do time (0..1)
  const priceFactor=Math.max(0.28, Math.min(1, 1.25 - price/22));                            // ingresso alto => menos gente
  const momFactor=0.6+form*0.7;                                                              // time em alta => mais gente
  const fill=Math.max(0.12, Math.min(0.99, (0.45*priceFactor + 0.35*momFactor + rnd()*0.2)));
  return { att:Math.round(cap*fill), price, cap };
}
/* monta um objeto de partida pra RL.matches — extraído de dentro de startLiveRound() pra
   poder ser reusado por uma partida avulsa de copa (ver startCupLiveMatch), sem duplicar
   a lógica de gerar eventos/público/árbitro. */
/* [h,a] é mesmo o confronto de LIGA desta rodada (minha divisão ou alguma das outras 3 rodando em
   paralelo)? netPublishResult/last_result_round só cobrem rodada de liga — copas usam
   last_cup_result/last_cup_round à parte — então sem essa checagem uma partida de copa entre os
   dois mesmos clubes (raro, mas possível) poderia colidir e "herdar" o placar errado por engano. */
function isLeagueFixtureNow(h,a){
  if(Array.isArray(S.sched) && (S.sched[S.round]||[]).some(([fh,fa])=>fh===h&&fa===a)) return true;
  if(S.otherDivs){ for(const d in S.otherDivs){ const od=S.otherDivs[d]; const fx=od.sched[S.round % od.sched.length]||[];
    if(fx.some(([fh,fa])=>fh===h&&fa===a)) return true; } }
  return false;
}
/* FASE 1 (Resenha determinística): aplica o snapshot congelado do APITO (games.kickoff_lineups,
   carimbado pelo servidor na virada ready->running) em S.clubXI/S.clubTactic dos OUTROS clubes
   humanos. É a foto oficial dos inputs da rodada: todo cliente simula as mesmas partidas com as
   mesmas escalações/táticas -> mesmos eventos, mesmos placares em todas as telas (a ponte assíncrona
   via game_seats/_claimed vira só fallback). O MEU clube fica de fora: a minha partida usa o meu
   S.xi local (autoritativa — eu publico o resultado real no fim). Idempotente e barato: chamada a
   cada buildLiveMatchObject cobre liga, outras divisões, copa ao vivo e modo espectador. */
function applyKickoffSnapshot(){
  if(!CL.online || typeof NET==='undefined' || !NET.room || !NET.room.kickoffLineups) return;
  if(typeof S==='undefined' || !S) return;
  const snap=NET.room.kickoffLineups;
  S.clubXI=S.clubXI||{}; S.clubTactic=S.clubTactic||{};
  Object.keys(snap).forEach(cid=>{
    if(String(cid)===String(CL.clubId)) return;
    const e=snap[cid]||{};
    if(Array.isArray(e.xi)&&e.xi.length) S.clubXI[cid]=e.xi.slice();
    if(e.tactic) S.clubTactic[cid]=e.tactic;
  });
}
/* FASE 3C: quem é o cliente AUTORITATIVO de um confronto — o que roda a sessão interativa e
   transmite ('mlive'). Mesma regra de precedência da Fase 3B: mandante humano presente manda;
   se ele está ausente, o visitante humano assume; sem humano presente dos dois lados, ninguém
   transmite (a partida é do motor, e o stream do apito já é a verdade). */
function liveBroadcasterOf(h,a){
  if(!CL.online || !CL.humans) return null;
  const on=id=>!!(CL.humans[id] && typeof NET!=='undefined' && NET.clubOnline && NET.clubOnline(id));
  if(on(h)) return h;
  if(on(a)) return a;
  return null;
}
/* FASE 3C: espectador cai de volta pro stream PRÉ-COMPUTADO do apito (o mesmo fallback que o
   servidor usa quando o humano não publica). Só vale enquanto nada foi transmitido ainda —
   misturar meio stream com meio replay daria um placar que não existe em lugar nenhum. */
function fallbackSpectateToPre(m){
  m.streamRemote=false; m.spectate=false; m.replay=true;
  const pre=m._pre;
  if(pre){ m.events=(pre.events||[]).map(e=>({...e,_resolved:true})); m.fhg=pre.hg; m.fag=pre.ag; m.perf=pre.perf||null; }
  else { const ev=simEventsC(m.h,m.a,m.seed); m.events=ev.events; m.fhg=ev.hg; m.fag=ev.ag; m.perf=ev.perf; }
  m.idx=0; m.hg=0; m.ag=0; m.goals=[]; m.incidents=[];
}
function buildLiveMatchObject(h,a,seed,opts){
  opts=opts||{};
  applyKickoffSnapshot(); // Fase 1: inputs congelados do apito antes de simular (ver acima)
  const rnd=rngFrom(seed);
  // se o adversário humano JÁ publicou o resultado real desta partida+rodada, REPRODUZ os mesmos
  // eventos em vez de simular de novo — sem isso, os dois lados de um confronto humano×humano
  // podiam assistir partidas diferentes (mesmo seed, mas ratings calculados com escalação ainda
  // não sincronizada). Ver netHumanResultFor. Todo evento entra "resolvido": é replay do que já
  // aconteceu, não uma decisão minha — senão eu poderia escolher um batedor de pênalti diferente
  // do que já decidiu o placar oficial.
  const isLeague=CL.online && isLeagueFixtureNow(h,a);
  // COPA COLETIVA: a partida de copa agora entra na MESMA máquina de rede da liga. Sem isto, cada
  // cliente simulava localmente a copa dos outros — e num confronto humano×humano o dono joga
  // interativo e publica um placar DIFERENTE, então os espectadores viam um jogo que nunca
  // existiu. Com isto, copa segue a mesma precedência da liga: publicado > transmissão > simulação
  // (a simulação local usa a seed AUTORITATIVA, a mesma do advanceCupBracket no servidor).
  const isCup=CL.online && !isLeague && !!opts.cupKey;
  const netLive=isLeague||isCup;
  // A COMPETIÇÃO ENTRA NA CHAVE DA TRANSMISSÃO. Antes era só 'cp:'+mandante+'-'+visitante, e o
  // calendário oficial põe Copa do Brasil e Sul-Americana na MESMA rodada: quando o mesmo par de
  // clubes se encontrava nas duas, as duas partidas nasciam com a MESMA streamKey. O onNetMatchLive
  // casa o stream pela chave (`find`), então os eventos de uma partida entravam na outra — e qual
  // das duas era "a primeira da lista" mudava de cliente pra cliente, que é exatamente o relato de
  // placares diferentes pro mesmo jogo. Ver também cupResultsList no supabase-adapter.
  const skPrefix=isCup?('cp:'+(opts.cupKey||'?')+':'):'lg:';
  const pub=(netLive && typeof NET!=='undefined')
    ? (isCup ? (NET.humanCupResultFor?NET.humanCupResultFor(h,a,S.round,opts.cupKey):null)
             : (NET.humanResultFor?NET.humanResultFor(h,a,S.round):null))
    : null;
  // FASE 2: stream PRÉ-COMPUTADO pelo servidor no apito (kickoff-round -> CL._roundStreams).
  // Precedência: resultado real publicado (pub) > stream do servidor (pre) > simulação local.
  // A MINHA partida fica de fora do pre (jogo ao vivo, interativa — pênalti/substituição); todas
  // as outras partidas de liga viram REPLAY do mesmo filme que os demais clientes assistem —
  // nenhuma simulação local, nenhuma chance de divergência de inputs ou de fórmula de seed.
  const mine=(h===CL.clubId||a===CL.clubId);
  const rkey=(S.season||1)+'-'+(S.round||0);
  const pre=(!pub && !mine && isLeague && CL._roundStreams && CL._roundStreams.key===rkey) ? (CL._roundStreams.matches[h+'-'+a]||null) : null;
  const src=pub||pre;
  // FASE 3A: a partida do PRÓPRIO usuário roda numa SESSÃO INTERATIVA (liveMatchSession) — minuto
  // a minuto, com as decisões (pênalti, lesão, expulsão, substituição) alterando o motor de
  // verdade. Sem resultado pré-sorteado: fhg/fag só existem quando a sessão termina. Partidas de
  // fundo/replay seguem como antes. (Se um resultado já foi PUBLICADO pelo adversário — pub — o
  // replay dele vence, igual sempre: a partida já é oficial.)
  const gate=attendanceFor(h,rnd);
  // FASE 3C: partida de OUTRO humano que está PRESENTE -> assisto à TRANSMISSÃO dele ('mlive'),
  // não ao stream do apito. O stream do apito é uma simulação de reserva; quem joga ao vivo decide
  // pênalti/substituição/expulsão e publica um resultado DIFERENTE — e é o publicado que o servidor
  // grava (humanResultByFx vence preMatches no resolve-round). Reproduzir o apito fazia a tela ao
  // vivo mostrar um placar que nunca existiu: eram exatamente as partidas de humanos que não batiam
  // com a classificação depois. _pre fica de reserva (ver fallbackSpectateToPre): silêncio total =
  // o dono não está jogando de verdade, e aí o apito volta a ser a verdade — igual ao servidor.
  if(!pub && !mine && netLive && liveBroadcasterOf(h,a)){
    return { h,a,hg:0,ag:0,idx:0,events:[],att:gate.att,price:gate.price,cap:gate.cap,
      ref:REFS_C[Math.floor(rnd()*REFS_C.length)], goals:[], incidents:[], fhg:null, fag:null, perf:null,
      user:false, div:opts.div, replay:false, sim:null,
      streamRemote:true, spectate:true, streamKey:skPrefix+h+'-'+a, _pre:pre, seed, _builtAt:nowMs() };
  }
  if(!src && mine && opts.user!==false && typeof liveMatchSession==='function'){
    // FASE 3B (humano×humano na liga): UMA partida só, transmitida. O cliente do MANDANTE roda a
    // sessão autoritativa com os DOIS lados interativos (as decisões do visitante chegam via
    // broadcast 'mdec'); o VISITANTE não simula — assiste ao stream ('mlive') e decide nos modais
    // dele remotamente. Se o mandante humano não está presente, o visitante volta a ser o
    // autoritativo (comportamento 3A). Fallback de silêncio total: liveTick converte pra sessão
    // local depois de ~10s sem stream.
    const oppId = h===CL.clubId ? a : h;
    const iAmHome = h===CL.clubId;
    const hxh = CL.online && netLive && CL.humans && CL.humans[oppId];
    const oppOnline = hxh && typeof NET!=='undefined' && NET.clubOnline && NET.clubOnline(oppId);
    const streamKey = skPrefix+h+'-'+a;
    if(hxh && oppOnline && !iAmHome){
      return { h,a,hg:0,ag:0,idx:0,events:[],att:gate.att,price:gate.price,cap:gate.cap,
        ref:REFS_C[Math.floor(rnd()*REFS_C.length)], goals:[], incidents:[], fhg:null, fag:null, perf:null,
        user:true, div:opts.div, replay:false, sim:null, streamRemote:true, streamKey, seed, _builtAt:nowMs() };
    }
    const sim=liveMatchSession(h,a,seed,{importance:opts.importance,
      interactiveSides:(hxh && oppOnline && iAmHome)?['H','A']:undefined});
    return { h,a,hg:0,ag:0,idx:0,events:sim.events,att:gate.att,price:gate.price,cap:gate.cap,
      ref:REFS_C[Math.floor(rnd()*REFS_C.length)], goals:[], incidents:[], fhg:null, fag:null, perf:null,
      user:opts.user!==undefined?opts.user:true, div:opts.div, replay:false, sim,
      streamKey, streamCast:(CL.online && netLive) };
  }
  const ev = src
    ? { events:(src.events||[]).map(e=>({...e,_resolved:true})), hg:src.hg, ag:src.ag, perf:src.perf||null,
        matchMinutes:src.matchMinutes||null }
    : simEventsC(h,a,seed);
  return { h,a,hg:0,ag:0,idx:0,events:ev.events,att:gate.att,price:gate.price,cap:gate.cap,
    ref:REFS_C[Math.floor(rnd()*REFS_C.length)], goals:[], incidents:[], fhg:ev.hg, fag:ev.ag, perf:ev.perf,
    /* O APITO DESTA PARTIDA. `simEventsC` sempre devolveu `matchMinutes` (90 + o acrescimo
       sorteado para ELA) e este objeto deitava fora. Sem ele, o fim de cada jogo era um palpite
       de tabela; ver liveFimDaPartida. */
    fimMin:ev.matchMinutes||null,
    user:opts.user!==undefined?opts.user:(h===CL.clubId||a===CL.clubId), div:opts.div, replay:!!src };
}
function startLiveRound(){
  /* A PORTA DE ENTRADA EM CAMPO, PARA QUALQUER CAMINHO. Os gates ficam espalhados (clJogar, a rede
     de segurança, o cronômetro, a recuperação pós-sorteio) e basta UM deles esquecer a regra para
     um humano começar a jogar sozinho. Aqui é a porta física: fora do momento 'jogando' da sala,
     nenhuma partida entra na tela, tenha vindo de onde tiver vindo. */
  if(CL.online && typeof roomAllowsMatch==='function' && !roomAllowsMatch()){
    CL._liveBusy=false;
    console.log('entrada em campo barrada: a sala está em "'+roomMoment()+'", não em "jogando"');
    return;
  }
  // segurança (online): rodada além do fim do calendário -> a virada de temporada não completou;
  // NÃO joga uma rodada fantasma (apareceria como "Rodada 39"). Completa a virada pelo servidor.
  if(CL.online && Array.isArray(S.sched) && (S.round||0) >= S.sched.length){
    CL._liveBusy=false;
    if(typeof onlineCompleteSeasonTurnover==='function') onlineCompleteSeasonTurnover();
    return;
  }
  /* MESMA GUARDA NO SOLO — faltava, e era por isso que "Jogar" às vezes abria uma
     tela ao vivo VAZIA, só com a faixa azul do topo. Sem rodada em `S.sched`
     (temporada terminada, ou o diálogo de fim de temporada fechado e o botão
     clicado de novo), `fxRaw` saía vazio, `RL.matches` também, e a tela desenhava
     a barra e nada mais — sem erro no console e sem saída, porque o tique da
     transmissão não tem em que pegar. Agora a rodada fantasma não chega a nascer. */
  if(!CL.online && Array.isArray(S.sched) && (S.round||0) >= S.sched.length){
    CL._liveBusy=false;
    if(S.finished && typeof seasonEndDialog==='function') seasonEndDialog();
    else toastC('A temporada acabou. Avance para a próxima.','info');
    return;
  }
  fixUserXIAvailability(); // segunda camada de proteção: nunca deixa suspenso/lesionado marcado como titular
  // Resenha (online): guarda a escalação que EU de fato uso nesta rodada pro meu clube —
  // é o que outros clientes vão enxergar como "última escalação conhecida" desse clube
  // (ver availableXI) caso eu não confirme a tempo numa rodada futura e ela expire sozinha.
  if(CL.online && CL.humans && CL.humans[CL.clubId]){ S.clubXI=S.clubXI||{}; S.clubXI[CL.clubId]=(S.xi||[]).slice(); S.clubTactic=S.clubTactic||{}; S.clubTactic[CL.clubId]=S.tactic||"equilibrado";
    if(typeof NET!=='undefined' && NET.publishLineup) NET.publishLineup(S.clubXI[CL.clubId], S.clubTactic[CL.clubId]); } // publica minha escalação pros outros clientes (sim. de ausente)
  CL.subsUsed=0; CL.liveDivOpen=null; // accordion reabre na divisão do usuário a cada rodada
  const fxRaw=(S.sched[S.round])||[]; const seedBase=hashC('rnd'+S.season+'-'+S.round);
  // a partida do PRÓPRIO clube vem PRIMEIRO (RL.matches[0]) — várias partes da tela ao vivo usam
  // RL.matches[0] como "a minha partida" (pausa, substituição, pênalti). Sem isso, quem não estava
  // no primeiro confronto do calendário via a partida de OUTRO clube na linha principal (bug do
  // anfitrião: só via a própria se o clube dele calhasse de ser o 1º do sorteio da rodada).
  const mine=fxRaw.filter(([h,a])=>h===CL.clubId||a===CL.clubId);
  const rest=fxRaw.filter(([h,a])=>!(h===CL.clubId||a===CL.clubId));
  const fx=mine.concat(rest);
  const RL={ jornada:S.round+1, minute:0, half:1, done:false, sel:null, subOpen:false, matches:[] };
  fx.forEach(([h,a],i)=>{ const seed=(seedBase+hashC(h)+hashC(a))>>>0;
    RL.matches.push(buildLiveMatchObject(h,a,matchSeed(h,a),{div:S.division})); });
  // as outras 3 divisões rodam junto, em segundo plano, igual ao clássico (as 4 divisões
  // ao mesmo tempo na mesma tela) — mesmo motor de simulação, só sem pausa interativa
  // (nunca é o time do usuário, então pênalti/lesão nessas partidas resolvem sozinhos).
  if(S.otherDivs){ Object.keys(S.otherDivs).forEach(d=>{
    const od=S.otherDivs[d]; const oFx=od.sched[S.round % od.sched.length]||[];
    const oSeedBase=hashC('rnd'+S.season+'-'+S.round+'-'+d);
    oFx.forEach(([h,a])=>{ const seed=(oSeedBase+hashC(h)+hashC(a))>>>0;
      RL.matches.push(buildLiveMatchObject(h,a,seed,{user:false,div:d})); }); }); }
  /* REDE DE SEGURANÇA. Mesmo com a guarda acima, qualquer caminho que chegue aqui
     sem uma única partida produziria a tela vazia. Melhor recusar a entrada e
     dizer o que houve do que deixar o utilizador preso numa tela morta. */
  if(!RL.matches.length){
    CL._liveBusy=false;
    console.warn('rodada sem partidas: S.round='+S.round+' de '+((S.sched||[]).length)+' — entrada em campo cancelada');
    toastC('Não há jogo para esta rodada.','warn');
    return;
  }
  RL.maxMin=Math.max(94,...RL.matches.map(m=>m.events.length?m.events[m.events.length-1].min:90));
  // FASE 1: alinha o INÍCIO da transmissão ao apito oficial do servidor (kickoff_at) — quem recebe
  // o evento de fase com um pouco de latência entra já no minuto em que os outros estão, em vez de
  // assistir do zero uma rodada que os demais estão terminando. Só pra atrasos pequenos (até 8s):
  // atraso grande = motivo legítimo (jogou copa antes / reconectou) e mantém a linha do tempo
  // própria. Nunca pula além do minuto 44 (ninguém perde o próprio 2º tempo); eventos até o minuto
  // alinhado entram na primeira batida do liveTick (pênalti/lesão do usuário ainda pausam no modal).
  if(CL.online && typeof NET!=='undefined' && NET.room && NET.room.kickoffAt){
    // MESMA fórmula do liveTick (ritmo do anfitrião + piso de transmissão) — se divergir, o pulo
    // de alinhamento ao apito erra o minuto e o cliente entra fora de sincronia com os outros.
    const msPerMin=Math.max(onlineTickFloorMs(RL), TEMPO_MS['Usain Bolt']/roundSpeedMult());
    const lagMs=nowMs()-NET.room.kickoffAt;
    if(lagMs>0 && lagMs<=8000) RL.minute=Math.min(Math.floor(lagMs/msPerMin),44);
  }
  CL.live=RL; camKickoffLine(RL); CL.screen='live'; cdraw(); CL._liveTimer=setTimeout(liveTick,650);
}
/* ---- PARTIDA DE COPA AO VIVO — mesma maquinaria de startLiveRound/liveTick/scLive/
   liveModalHTML (pênalti, lesão, substituições), só que pra UMA partida avulsa, fora do
   calendário de liga. Começa com sel:null (modal fechado) — a tela ao vivo já mostra a
   única linha do jogo + relógio sem precisar do modal aberto; toca na linha (liveRowClick)
   pra abrir. Ver finishCupLiveMatch pro fechamento, que NÃO passa por finishLiveRound/
   playRound (aquilo é só pra liga). ---- */
function startCupLiveMatch(pending){
  fixUserXIAvailability();
  // Resenha (online): grava a escalação que EU de fato uso nesta partida pro meu clube,
  // igual startLiveRound() já faz pra rodada de liga — é o que outros clientes vão
  // enxergar como "última escalação conhecida" (ver availableXI) se meu clube precisar
  // ser simulado em segundo plano antes de eu jogar a próxima partida de liga.
  if(CL.online && CL.humans && CL.humans[CL.clubId]){ S.clubXI=S.clubXI||{}; S.clubXI[CL.clubId]=(S.xi||[]).slice(); S.clubTactic=S.clubTactic||{}; S.clubTactic[CL.clubId]=S.tactic||"equilibrado";
    if(typeof NET!=='undefined' && NET.publishLineup) NET.publishLineup(S.clubXI[CL.clubId], S.clubTactic[CL.clubId]); }
  CL.subsUsed=0;
  // rodada de copa INTEIRA (a minha partida + as dos outros), igual à rodada de liga — ver
  // startCupRound. Se por algum motivo o confronto não estiver na lista da rodada (estado
  // inconsistente), cai no modo antigo de partida avulsa pra não deixar o jogador sem jogo.
  if(startCupRound(pending.key, pending.stage, pending)) return;
  const seed=hashSeed(S.seed,'cupmatch',pending.key,pending.stage,S.round,pending.h,pending.a);
  const m=buildLiveMatchObject(pending.h,pending.a,seed,{user:true,div:pending.key,cupKey:pending.key});
  const RL={ jornada:S.round+1, minute:0, half:1, done:false, sel:null, subOpen:false, matches:[m], cup:pending };
  RL.maxMin=Math.max(94, m.events.length?m.events[m.events.length-1].min:90);
  CL.live=RL; camKickoffLine(RL); CL.screen='live'; cdraw(); CL._liveTimer=setTimeout(liveTick,650);
}
/* ===== FASE 3B: transmissão ao vivo da partida autoritativa =====
   O cliente que RODA a sessão (mandante no humano×humano; qualquer humano vs CPU) emite snapshots
   cumulativos ('mlive') pro canal da sala: heartbeat ~900ms + envio imediato quando muda algo
   importante (evento novo, pendência abre/fecha, fim). O visitante reconstrói a partida a partir
   deles e responde decisões ('mdec'). Espectadores recebem os mesmos snapshots (upgrade futuro). */
function maybeBroadcastMatch(m,force){
  if(!m || !m.sim || !m.streamCast || !CL.online || typeof NET==='undefined' || !NET.broadcastMatch) return;
  const now=nowMs();
  m._cast=m._cast||{ts:0,n:-1,p:false,d:null};
  const pend=!!m.sim.pending, evN=m.sim.events.length, done=m.sim.done;
  const changed = evN!==m._cast.n || pend!==m._cast.p || done!==m._cast.d;
  if(!force && !changed && (now-m._cast.ts)<900) return;
  m._cast={ts:now,n:evN,p:pend,d:done};
  NET.broadcastMatch({ k:m.streamKey, ...m.sim.snapshot() });
}
/* O RESULTADO QUE O DONO DA PARTIDA PUBLICOU NO ASSENTO — para a rodada corrente e exatamente
   este confronto. E o registo do apito que NAO viaja por broadcast (colunas de game_seats via
   realtime), entao sobrevive a perda de qualquer snapshot. Liga usa last_result; dia de copa usa
   last_cup_result (ver cupResultadoPublicado, no core). */
function liveResultadoPublicadoDe(m){
  if(!CL.online || typeof NET==='undefined' || !NET._claimed) return null;
  const RL=CL.live;
  if(RL && RL.cup) return (typeof cupResultadoPublicado==='function')
    ? cupResultadoPublicado(RL.cup.key, m.h, m.a) : null;
  for(const uid in NET._claimed){
    const c=NET._claimed[uid]; if(!c || (c.clubId!==m.h && c.clubId!==m.a)) continue;
    if(c.last_result_round!==(S.round||0) || !c.last_result) continue;
    const r=c.last_result;
    if(r && r.h===m.h && r.a===m.a && r.hg!=null) return r;
  }
  return null;
}
/* ===== O APITO FINAL E REENVIADO DEPOIS DA RODADA FECHAR =====
   O transmissor rebatia o snapshot final "enquanto a rodada nao fecha" -- so que a rodada DELE
   fecha quase instantaneamente depois do proprio apito (piso de 12ms sem espectador a segurar), e
   sobravam um punhado de envios num canal sem historico. Snapshot final perdido = quem assiste
   espera o detetor de 20s. Aqui o final continua a ser batido por ~7s DEPOIS de a rodada fechar,
   fora do liveTick (que ja morreu) -- barato, idempotente do lado de quem recebe (cumulativo), e
   com o caminho do resultado publicado como segunda rede. */
function liveAgendarReenvioFinal(RL){
  if(!CL.online || typeof NET==='undefined' || !NET.broadcastMatch) return;
  const finais=(RL.matches||[])
    .filter(m=>m.sim && m.sim.done && m.streamCast)
    .map(m=>({k:m.streamKey, snap:m.sim.snapshot()}));
  if(!finais.length) return;
  let n=0;
  const t=setInterval(()=>{
    if(++n>8){ clearInterval(t); return; }
    finais.forEach(f=>{ try{ NET.broadcastMatch({k:f.k, ...f.snap}); }catch(e){} });
  }, 900);
}
/* snapshot recebido: atualiza o cache e, se for a MINHA partida assistida (visitante), anexa os
   eventos novos e abre/fecha o modal de decisão remota conforme a pendência. */
function onNetMatchLive(p){
  CL._liveStreams=CL._liveStreams||{};
  CL._liveStreams[p.k]={ts:nowMs(),snap:p};
  const RL=CL.live; if(!RL) return;
  const m=RL.matches.find(x=>x.streamRemote && x.streamKey===p.k); if(!m) return;
  (p.events||[]).slice(m.events.length).forEach(e=>m.events.push({...e,_resolved:true})); // cumulativo: só o que falta
  if(p.perf) m.livePerf=p.perf; // posse/finalizações parciais pro Modo Camarote de quem só assiste
  if(p.done){ m.streamDone=true; m.fhg=p.hg; m.fag=p.ag; m.perf=(p.result&&p.result.perf)||null; m.streamResult=p.result||null; }
  if(m.spectate) return; // FASE 3C: partida de terceiros — eu só assisto, nenhum lado é meu pra decidir
  const mySide=m.h===CL.clubId?'H':'A';
  if(p.pending && p.pending.side===mySide){
    if(!CL._remoteDecision && !RL.penEvent && !RL.injEvent && !RL.redEvent) openRemoteDecision(m, p.pending);
  } else if(CL._remoteDecision && CL._remoteDecision.k===p.k){
    closeRemoteDecision(m, p); // pendência resolvida do outro lado (minha decisão chegou, ou o timeout do mandante aplicou a padrão)
  }
}
/* decisão remota recebida (lado autoritativo): valida clube×lado e aplica na sessão */
function onNetMatchDecision(p){
  const RL=CL.live; if(!RL || !p || !p.decision) return;
  const m=RL.matches.find(x=>x.sim && x.streamKey===p.k); if(!m) return;
  const sideClub = p.side==='H' ? m.h : m.a;
  if(String(sideClub)!==String(p.clubId)) return; // decisão de quem não é dono daquele lado: ignora
  const d=p.decision;
  if(d.tipo==='sub'){
    if(!m.sim.pending) m.sim.applyDecision({tipo:'sub', side:p.side, saiPid:d.saiPid, entraPid:d.entraPid});
  } else {
    if(!m.sim.pending || m.sim.pending.ev.side!==p.side) return; // já resolvida (timeout) ou não é dele
    m.sim.applyDecision({...d, side:p.side});
    m.sim._remoteDeadline=null;
  }
  maybeBroadcastMatch(m,true);
}
/* abre o modal de decisão pro VISITANTE a partir da pendência transmitida — reusa os modais
   normais com um evento marcado _remote (os resolvedores mandam 'mdec' em vez de aplicar local). */
function openRemoteDecision(m,pending){
  const RL=CL.live; if(!RL) return;
  const ev={...(pending.ev||{}), _remote:true, _resolved:false};
  CL._remoteDecision={k:m.streamKey, kind:pending.kind, min:ev.min};
  if(pending.kind==='penalti') openPenaltyModal(m,ev);
  else if(pending.kind==='lesao') openInjuryModal(m,ev);
  else openRedCardModal(m,ev);
}
/* fecha o modal remoto quando o stream confirma a resolução (revela o pênalti com o drama de sempre) */
function closeRemoteDecision(m,p){
  const rd=CL._remoteDecision; if(!rd) return;
  CL._remoteDecision=null;
  const RL=CL.live; if(!RL) return;
  if(rd.kind==='penalti' && RL.penEvent){
    const ev=(p.events||[]).filter(e=>e.type==='penalti'&&e.min===rd.min).pop();
    if(CL._penRevealTimer){ clearTimeout(CL._penRevealTimer); CL._penRevealTimer=null; }
    CL.penResultScored=!!(ev&&ev.scored); CL.penResultScorer=(ev&&ev.scorer)||CL.penResultScorer;
    penaltyReveal(CL.penResultScored, CL.penResultScorer);
    return;
  }
  if(RL.injEvent){ clearInjuryTimer(); RL.paused=false; RL.injMatch=null; RL.injEvent=null; CL.injSel=null; cdraw(); CL._liveTimer=setTimeout(liveTick,320); }
  if(RL.redEvent){ clearRedTimer(); RL.paused=false; RL.redMatch=null; RL.redEvent=null; CL.redIn=null; CL.redOut=null; cdraw(); CL._liveTimer=setTimeout(liveTick,320); }
}
/* ================= BARREIRA DE ENTRADA EM CAMPO (humano × humano) =================
   O PROBLEMA MEDIDO EM PRODUÇÃO: num confronto entre dois humanos, quem clicava "Jogar" primeiro
   esperava 10s em silêncio, concluía que o adversário tinha caído, jogava a partida INTEIRA
   sozinho e publicava o resultado. Quando o outro entrava, buildLiveMatchObject via esse
   resultado já publicado (`pub`) e montava um REPLAY: eventos todos marcados _resolved, sim:null,
   painel de substituição escondido. Ou seja — quem entrasse depois assistia a um filme, e nada do
   que fizesse (substituição, pênalti, tática) mudava o placar. Era exatamente o relato: "não
   importa o que o humano faça, o resultado é o mesmo".
   A máquina de decisão remota (mlive/mdec) sempre existiu e funciona; o que faltava era garantir
   que os dois estivessem em campo AO MESMO TEMPO.
   A REGRA AGORA: quem chega primeiro espera, com aviso na tela, e o relógio da partida só começa
   quando o adversário entra — ou quando o cronômetro da sala zera, que é o que força todo mundo
   pra dentro da rodada (a mesma contagem que já governa o início da rodada, sem inventar outra). */
function kickoffPartnerOf(m){
  if(!CL.online || !m || !CL.humans) return null;
  const opp = m.h===CL.clubId ? m.a : (m.a===CL.clubId ? m.h : null);
  if(!opp || !CL.humans[opp]) return null;                      // adversário não é humano: sem barreira
  if(typeof NET==='undefined' || !NET.clubOnline || !NET.clubOnline(opp)) return null; // offline: não espera
  return opp;
}
/* recebe o "entrei em campo" do adversário (broadcast 'mready') */
function onNetMatchReady(p){
  CL._kickReady=CL._kickReady||{};
  CL._kickReady[p.k]=nowMs();
  const RL=CL.live; if(RL && (RL.matches||[]).some(m=>m.streamKey===p.k)) cdraw();
}
/* o cronômetro da sala já zerou? é ele que força a entrada de todos. Sem cronômetro armado
   (deadline 0), a barreira usa um teto próprio pra nunca prender ninguém pra sempre. */
const KICKOFF_MAX_WAIT_MS=45000;
function kickoffDeadlinePassed(RL){
  const room=(typeof NET!=='undefined')?NET.room:null;
  const dl=(room && room.deadline)||0;
  if(dl>0) return Date.now()>=dl;
  return nowMs()-(RL._kickSince||nowMs()) > KICKOFF_MAX_WAIT_MS;
}
/* devolve o confronto que está segurando o apito, ou null se pode começar */
function kickoffWaitingMatch(RL){
  if(!CL.online || !RL || RL._kickDone) return null;
  const m=(RL.matches||[])[0]; if(!m || !m.user) return null;
  if(!m.sim || !m.streamCast) return null;            // só o lado AUTORITATIVO segura o relógio
  if(!kickoffPartnerOf(m)) return null;
  const pronto=(CL._kickReady||{})[m.streamKey];
  if(pronto) return null;
  return m;
}
/* ATE ONDE AS FONTES VIVAS CHEGARAM. Duas fontes mandam no relogio de uma rodada: a sessao
   local (a minha partida) e as transmissoes que eu assisto. Devolve o minuto mais adiantado
   entre elas, ou null quando nao ha nenhuma viva -- caso das rodadas em que todas as partidas
   ja vem com os eventos prontos, em que o relogio pode correr a vontade. */
function liveFonteMax(RL){
  let mx=null;
  (RL&&RL.matches||[]).forEach(m=>{
    if(m.sim && !m.sim.done){ mx=Math.max(mx||0, m.sim.minute||0); return; }
    if(m.streamRemote && !m.streamDone && !m.streamDead){
      const st=CL._liveStreams && CL._liveStreams[m.streamKey];
      /* SO SEGURA SE ELA ESTIVER MESMO A CHEGAR. Segurar o relogio por uma transmissao que
         nunca chega (ou que emudeceu) troca o relogio em fuga por uma rodada parada para
         sempre -- medido: 1' durante um minuto inteiro, sem apito. Transmissao viva e a que
         mandou snapshot ha menos de STREAM_MUDO_MS; passando disso ela deixa de mandar no
         relogio e a rodada segue ate ao fim da partida (ver liveTetoMin). */
      if(st && st.snap && (nowMs()-st.ts)<STREAM_MUDO_MS) mx=Math.max(mx||0, st.snap.minute||0);
    }
  });
  return mx;
}
/* silencio a partir do qual uma transmissao deixa de contar: nem segura o relogio, nem
   segura a rodada (ver o detetor de stream morto no laco das partidas) */
const STREAM_MUDO_MS=20000;
/* ===== CADA PARTIDA TEM O SEU APITO =====
   90 mais o acrescimo sorteado para ELA, entre 1 e 4 (ver `session.step` no motor): 91, 92, 93
   ou 94, e cada jogo sorteia o seu. Devolve null enquanto esse numero ainda nao existe -- a
   sessao so o sorteia ao chegar aos 90, e um snapshot pode ainda nao o ter trazido. */
function liveFimDaPartida(m){
  if(!m) return null;
  if(m.fimMin) return m.fimMin;   // pre-computada, ou adotado do resultado publicado (ver liveResultadoPublicadoDe)
  if(m.sim) return m.sim.totalMinutes || null;
  if(m.streamRemote && !m.streamDead){
    const st=CL._liveStreams && CL._liveStreams[m.streamKey];
    return (st && st.snap && st.snap.totalMinutes) || null;
  }
  return null;
}
/* essa partida ja apitou? */
function liveJogoEncerrado(m, RL){
  if(!m) return false;
  if(m.done) return true;
  if(m.sim) return !!m.sim.done;
  if(m.streamRemote){
    const st=CL._liveStreams && CL._liveStreams[m.streamKey];
    return !!(m.streamDone || m.streamDead || (st && st.snap && st.snap.done));
  }
  const fim=liveFimDaPartida(m);
  return fim!=null && !!RL && RL.minute>=fim && m.idx>=(m.events||[]).length;
}
/* ===== O RELOGIO DA RODADA PARA QUANDO O ULTIMO JOGO APITA =====
   O teto era `Math.max(96, ...)` -- um piso fixo que nao pertence a partida nenhuma. Medido numa
   rodada de 40 jogos: o jogo do utilizador apitava aos 92 e a rodada continuava ate 94, com
   quatro a cinco lances de outros jogos a entrar DEPOIS do apito dele. E o mesmo desencontro de
   sempre, duas coordenadas a discordar: o fim da minha partida sai do acrescimo sorteado para
   ela, e o fim da rodada saia de um numero de tabela.
   Agora ha uma coordenada so. A rodada acaba no ULTIMO apito de verdade -- o maior entre os fins
   conhecidos de cada jogo (e nunca antes do ultimo lance ja escrito na timeline). O piso de
   96/130 fica apenas enquanto algum jogo ainda nao revelou o proprio fim: sem isso a rodada
   podia fechar antes de um jogo que ainda nem chegou aos 90. */
function liveTetoMin(RL){
  const piso = (RL && RL.extraStartMinute!=null) ? 130 : 96;   // 90+acrescimos / 120+acrescimos
  const jogos = (RL&&RL.matches) || [];
  let mx=0, algumSemApito=false;
  jogos.forEach(m=>{
    const fim=liveFimDaPartida(m);
    if(fim==null && !liveJogoEncerrado(m,RL)) algumSemApito=true;
    if(fim!=null) mx=Math.max(mx, fim);
    const evs=m.events||[]; if(evs.length) mx=Math.max(mx, evs[evs.length-1].min);
  });
  if(algumSemApito || !mx) return piso;
  return mx;
}
function liveTick(){ const RL=CL.live; if(!RL) return;
  /* carimbo ANTES das saidas: e' o sinal de vida que o cao de guarda le'. Fica
     aqui em cima de proposito — se ficasse depois das saidas por pausa, o cao
     acharia a cadeia morta a cada intervalo. */
  RL._tickAt=nowMs();
  if(!CL._liveWD) liveWatchdog();
  if(RL.done||RL.paused||RL.userPaused) return;
  // BARREIRA: seguro o minuto 0 até o adversário humano entrar em campo (ou o cronômetro zerar).
  {
    const esperando=kickoffWaitingMatch(RL);
    if(esperando){
      if(!RL._kickSince) RL._kickSince=nowMs();
      // reanuncio a cada tique: broadcast não tem histórico, então quem entrar depois de mim
      // precisa receber o aviso mesmo tendo perdido o primeiro envio.
      if(typeof NET!=='undefined' && NET.broadcastKickoff) NET.broadcastKickoff(esperando.streamKey);
      if(!kickoffDeadlinePassed(RL)){
        cdraw();
        CL._liveTimer=setTimeout(liveTick, 600);
        return;
      }
      RL._kickDone=true;   // cronômetro zerou: entra em campo de qualquer jeito
    } else if(RL.minute===0 && typeof NET!=='undefined' && NET.broadcastKickoff){
      // não estou segurando nada, mas anuncio que entrei — é o que destrava o outro lado.
      const m0=(RL.matches||[])[0]; if(m0 && m0.streamKey) NET.broadcastKickoff(m0.streamKey);
    }
  }
  /* ===== A BOLA ROLA DEPOIS DO APITO, NAO ANTES =====
     O apito inicial vivia num marco da narracao (camMinuteTick), que so' e'
     avaliado quando ja' ha' minuto para mostrar — ou seja, com o jogo a
     andar. Soava depois do pontape de saida, que e' o contrario do que
     acontece em campo.
     Agora ele e' a PRIMEIRA coisa da rodada: soa, o estadio abre, e so' a
     seguir o relogio comeca a contar. E' o unico tique em que a rodada nao
     avanca nenhum minuto — e vem depois da barreira de pontape acima, para
     nao apitar enquanto ainda se espera pelo adversario humano. */
  if(!RL._apitoIni){
    RL._apitoIni = 1;
    if(typeof rfVitoriaParar==='function') rfVitoriaParar();   // a festa da rodada passada nao entra nesta
    if(typeof rfSomPreCarregar==='function') rfSomPreCarregar();
    if(typeof rfSomLigado==='function' && rfSomLigado()){
      if(typeof rfTorcidaLigar==='function') rfTorcidaLigar();   // o estadio ja' esta' la'
      if(typeof rfApito==='function') rfApito(1);
      cdraw();
      CL._liveTimer=setTimeout(liveTick, LIVE_APITO_INI_MS);
      return;
    }
  }
  /* ===== O RELOGIO SEGUE A PARTIDA, NAO O RELOGIO DE PAREDE =====
     Ele era incrementado a cada tique, aconteca o que acontecer com a simulacao. So que a
     sessao PARA quando fica a espera de uma decisao (session.step devolve logo se houver
     `pending`): se por qualquer motivo essa decisao nao for resolvida -- e o modal nao estiver
     aberto, que e o unico caso em que o tique nem chega aqui --, a partida congela e o relogio
     continua a correr sozinho. Foi isso que se viu numa liga: 90, 100, 135 minutos, sem ser
     prorrogacao, e sem apito final. Agora, com uma partida travada a espera de decisao, o
     relogio da rodada espera com ela. */
  const travadaEmDecisao=(RL.matches||[]).some(m=>m.sim && !m.sim.done && m.sim.pending);
  /* ===== E TAMBEM NAO PASSA A FRENTE DE QUEM ESTA A TRANSMITIR =====
     A correcao acima cobriu a sessao local. Faltava a outra fonte: as partidas que eu ASSISTO
     (streamRemote). Nessas o relogio nao vem de mim, vem dos snapshots de quem joga -- e o
     codigo empurrava o teto com `RL.minute+2` enquanto esperava, ou seja, outra escada
     infinita. Quando o transmissor sai da tela ao vivo, o detetor de stream morto so age aos
     20 SEGUNDOS de silencio; com o ritmo 'Foguete' (12ms por tique) esses 20 segundos sao
     ~1600 minutos de relogio. Foi o 1399' visto numa rodada em que o utilizador nem jogava.
     A regra passa a ser uma so, para as duas fontes: o relogio da rodada nunca vai alem do
     ponto a que as fontes vivas de facto chegaram. Sem fonte viva (rodada toda pre-calculada)
     ele corre livre, como sempre. */
  const fonte=liveFonteMax(RL);
  if(!travadaEmDecisao && (fonte==null || RL.minute<=fonte)) RL.minute+=1;
  // FASE 3A: sessão interativa gera os eventos AO VIVO, minuto a minuto — avança até o minuto do
  // relógio (ou até uma decisão pendente travar). Enquanto a sessão não termina, o relógio da
  // rodada se estende junto (o acréscimo só é sorteado aos 90'). Eventos entram em m.events
  // (mesma referência) e são consumidos pelo laço normal abaixo — modais pausam igual sempre.
  RL.matches.forEach(m=>{ if(m.sim && !m.sim.done){
    while(!m.sim.pending && !m.sim.done && m.sim.minute<RL.minute){ m.sim.step(); }
    /* TETO DO RELOGIO VEM DA PARTIDA. Era `RL.minute+2` -- o relogio a alimentar-se de si
       proprio: enquanto a sessao nao anunciava o total (so o faz ao chegar aos 90), cada tique
       empurrava o teto dois minutos a frente do proprio tique, para sempre. Com a sessao
       parada numa decisao isso e uma escada infinita. `m.sim.minute` e ate onde o jogo de
       facto chegou, e e esse que manda. */
    if(!m.sim.done) RL.maxMin=Math.max(RL.maxMin, m.sim.totalMinutes || (m.sim.minute+2));
    if(m.sim.done && m.sim.result){ m.fhg=m.sim.result.hg; m.fag=m.sim.result.ag; m.perf=m.sim.result.perf; }
    // FASE 3B: pendência do lado REMOTO (visitante humano) — espera a decisão dele via 'mdec'
    // por até 15s; sem resposta, aplica a padrão (o autoritativo nunca trava esperando quem caiu).
    if(m.sim.pending){
      const myS=m.h===CL.clubId?'H':'A';
      if(m.sim.pending.ev.side!==myS){
        if(!m.sim._remoteDeadline) m.sim._remoteDeadline=nowMs()+15000;
        if(nowMs()>m.sim._remoteDeadline){ const d=m.sim.defaultDecision(); if(d) m.sim.applyDecision(d); m.sim._remoteDeadline=null; }
      } else {
        /* PENDENCIA MINHA SEM MODAL ABERTO -- o beco de onde a partida nao sai sozinha.
           Quando o modal abre, ele poe RL.paused e o tique nem chega aqui; se estamos a
           passar por esta linha, a decisao e minha, nao ha modal, e ninguem a vai resolver.
           Acontece quando o evento pendente nao chega a ser lido (o laco de eventos para no
           primeiro por resolver, entao um evento do outro lado ainda em aberto segura a fila
           inteira). Vinte segundos e aplica-se a mesma decisao padrao do lado remoto -- a
           partida tem sempre de acabar. */
        if(!m.sim._localDeadline) m.sim._localDeadline=nowMs()+20000;
        if(nowMs()>m.sim._localDeadline){
          const d=m.sim.defaultDecision();
          if(d){ m.sim.applyDecision(d); console.warn('decisão pendente sem modal — aplicada a padrão:', d.tipo); }
          m.sim._localDeadline=null;
        }
      }
    } else { m.sim._remoteDeadline=null; m.sim._localDeadline=null; }
    maybeBroadcastMatch(m); // transmite o snapshot pra sala (visitante + espectadores)
  } else if(m.sim && m.sim.done){
    // FASE 3C: continua batendo o snapshot FINAL enquanto a rodada não fecha. Sem isso o apito
    // final ia num único envio — se ele se perdesse, quem assiste ficava esperando os 20s do
    // detector de stream morto e a partida terminava sem placar na tela dele.
    maybeBroadcastMatch(m);
  } else if(m.streamRemote){
    // FASE 3B (visitante) / 3C (espectador): assisto ao stream do autoritativo — o relógio da
    // rodada espera o fim dele.
    const st=CL._liveStreams && CL._liveStreams[m.streamKey];
    if(!m.streamDone && !m.streamDead){
      /* ===== O RESULTADO PUBLICADO ENCERRA A TRANSMISSAO NA HORA =====
         Quando o transmissor apita, a rodada DELE fecha em milissegundos (o piso de ritmo cai
         para 12ms sem espectador a segurar) e ele para de emitir. Se o snapshot final se perde,
         quem assiste ficava pendurado no detetor de stream morto -- VINTE SEGUNDOS parado na
         tela ao vivo, e depois a rodada "voltava sozinha". Era a trava relatada a 19/08.
         So que o apito dele tem um registo que nao se perde: o resultado PUBLICADO no assento
         (last_result/last_cup_result), que chega por realtime em ~1s. Stream em silencio curto
         + resultado publicado do confronto = a partida acabou de verdade: adota os eventos
         oficiais e libera o relogio, sem toast e sem espera. */
      const _mudoMs = st ? (nowMs()-st.ts) : (nowMs()-(m._builtAt||0));
      if(_mudoMs>2500 && typeof liveResultadoPublicadoDe==='function'){
        const pub=liveResultadoPublicadoDe(m);
        if(pub){
          (pub.events||[]).slice(m.events.length).forEach(e=>m.events.push({...e,_resolved:true}));
          m.streamDone=true; m.fhg=pub.hg; m.fag=pub.ag;
          if(pub.perf) m.perf=pub.perf;
          if(pub.matchMinutes) m.fimMin=pub.matchMinutes;
          return;   // nada de anunciar kickoff nem de detetor de morte: ela terminou
        }
      }
      /* teto vindo do PROPRIO stream, nao do relogio da rodada (ver liveFonteMax) */
      RL.maxMin=Math.max(RL.maxMin, ((st&&st.snap&&st.snap.minute)||0)+2);
      // ANUNCIO QUE ESTOU EM CAMPO enquanto espero: é isto que destrava o mandante, que está
      // segurando o apito à minha espera (ver kickoffWaitingMatch).
      if(!m.spectate && typeof NET!=='undefined' && NET.broadcastKickoff) NET.broadcastKickoff(m.streamKey);
      if(!m.spectate && !RL._kickSince) RL._kickSince=nowMs();   // base do teto de espera (ver kickoffDeadlinePassed)
      // ASSUMIR A PARTIDA SOZINHO é o último recurso, não o primeiro. Eram 10s de silêncio — tempo
      // que o adversário leva só pra olhar a escalação. Quem assumia jogava tudo sozinho e
      // publicava o resultado; o outro, ao entrar, recebia um replay e não conseguia mais
      // influenciar nada (era a origem do "minhas substituições não mudam o jogo"). Agora a espera
      // é governada pelo CRONÔMETRO DA SALA — a mesma contagem que força a entrada de todos — e só
      // quando ela zera é que eu assumo.
      const desistir = m.spectate ? (nowMs()-(m._builtAt||0)>10000) : kickoffDeadlinePassed(RL);
      if(!st && m.events.length===0 && desistir){
        if(m.spectate){
          // silêncio TOTAL numa partida de terceiros: o dono não está jogando ao vivo de verdade.
          // Volto pro stream do apito — que é exatamente o que o servidor vai gravar nesse caso.
          fallbackSpectateToPre(m);
        } else if(typeof liveMatchSession==='function'){
          // silêncio TOTAL desde o apito: mandante deve ter caído antes de transmitir — assumo a
          // partida localmente (3A) e passo a transmitir eu (vira o autoritativo de fato).
          m.streamRemote=false; m.sim=liveMatchSession(m.h,m.a,m.seed,{}); m.events=m.sim.events; m.streamCast=true;
          toastC('⚠ Transmissão do mandante não chegou — assumindo a partida localmente.');
        }
      } else if((st && nowMs()-st.ts>STREAM_MUDO_MS)
             || (!st && (nowMs()-(m._builtAt||0))>STREAM_MUDO_MS)){
        /* O `!st` FALTAVA. O detetor so olhava para transmissoes que ja tinham chegado ALGUMA
           vez; a que nunca chega caia fora dos dois ramos (o de cima exige `events.length===0`)
           e ficava viva para sempre, segurando a rodada. Agora o silencio total conta igual. */
        m.streamDead=true; // stream morreu no meio: solta o relógio (o resultado oficial sai na classificação)
        if(m.spectate){ if(!m.events.length) fallbackSpectateToPre(m); } // partida de terceiros: sem toast (não é o jogo dele)
        else toastC('⚠ Transmissão interrompida — o resultado oficial sai na classificação.');
      }
    }
  } });
  // MODO CAMAROTE: as falas de marco (apito inicial, intervalo, recomeço, acréscimos) entram
  // ANTES dos eventos do minuto — senão "Times de volta pro segundo tempo" apareceria depois
  // do primeiro lance do 2º tempo. O apito FINAL fica pra depois do laço (camEndCheck).
  { const um=RL.matches.find(m=>m.user); if(um) camMinuteTick(um,RL); }
  let pendingPenalty=null, pendingInjury=null, pendingRed=null;
  RL.matches.forEach(m=>{ while(m.idx<m.events.length && m.events[m.idx].min<=RL.minute){ const e=m.events[m.idx];
    const isUserSide = m.user && ((e.side==='H'&&m.h===CL.clubId)||(e.side==='A'&&m.a===CL.clubId));
    if(e.type==='penalti' && isUserSide && !e._resolved){ pendingPenalty={m,e}; break; } // não consome ainda — pausa antes, resolve pelo modal
    if(e.type==='lesao' && isUserSide && !e._resolved){ pendingInjury={m,e}; break; } // idem — precisa escolher quem entra
    if(e.type==='cartao' && e.cardType==='vermelho' && isUserSide && !e._resolved && m.sim){ pendingRed={m,e}; break; } // expulsão do usuário: modal de reorganização (Fase 3A)
    // FASE 3B: evento de decisão do lado REMOTO ainda não resolvido (sessão autoritativa esperando
    // o 'mdec' do visitante) — NÃO consome (o placar dele depende da decisão); overlay avisa.
    if(m.sim && !e._resolved && (e.type==='penalti'||e.type==='lesao'||(e.type==='cartao'&&e.cardType==='vermelho'))){ break; }
    m.idx++;
    if(e.type==='gol'){ if(e.side==='H')m.hg++; else m.ag++; m.goals.push({min:e.min,side:e.side,scorer:e.scorer,team:e.team});
      m.incidents.push({min:e.min,type:'gol',side:e.side,player:e.scorer}); }
    else if(e.type==='penalti'){ if(e.scored){ if(e.side==='H')m.hg++; else m.ag++; m.goals.push({min:e.min,side:e.side,scorer:e.scorer,team:e.team}); }
      m.incidents.push({min:e.min,type:'penalti',side:e.side,player:e.scorer,scored:e.scored}); }
    else if(e.type==='cartao'){ m.incidents.push({min:e.min,type:'cartao',side:e.side,player:e.player,cardType:e.cardType,reason:e.reason}); }
    else if(e.type==='lesao'){ m.incidents.push({min:e.min,type:'lesao',side:e.side,player:e.player,severity:e.severity}); }
    else if(e.type==='sub'){ m.incidents.push({min:e.min,type:'sub',side:e.side,player:e.player,out:e.out}); }
    // MODO CAMAROTE: o MESMO evento que acabou de mexer no placar/súmula vira linha de narração,
    // estatística e empurrão na barra de pressão (ver camOnEvent). Só pra partida do usuário.
    if(m.user) camOnEvent(m,e);
  } });
  { const teto=liveTetoMin(RL); if(RL.maxMin>teto) RL.maxMin=teto; }   // ver liveTetoMin
  { const um=RL.matches.find(m=>m.user); if(um) camEndCheck(um,RL); }
  updateLive();
  if(pendingPenalty){ openPenaltyModal(pendingPenalty.m, pendingPenalty.e); return; }
  if(pendingInjury){ openInjuryModal(pendingInjury.m, pendingInjury.e); return; }
  if(pendingRed){ openRedCardModal(pendingRed.m, pendingRed.e); return; }
  if(RL.minute>=45 && !RL.halftimeDone){ RL.halftimeDone=true;
    /* APITO DO INTERVALO, antes de tudo o resto: e' este o instante em que o
       primeiro tempo acaba, e daqui ele nunca sai atrasado (ver camMinuteTick). */
    if(typeof rfApito==='function') rfApito(2);   // sem `camOn()`: quem só assiste também ouve os três apitos
    const ui=RL.matches.findIndex(m=>m.user);
    if(ui>=0 && clOpcoes().subsIntervalo!=='Não'){ RL.paused=true; RL.sel=ui;
      if(CL.online) startHalftimeCountdown(); // Resenha: intervalo dura no máximo 10s (mantém todos sincronizados)
      cdraw(); return; } }
  if(RL.minute>=RL.maxMin){
    // mata-mata empatado, jogado ao vivo pelo próprio usuário: prorrogação e pênaltis
    // acontecem AO VIVO na tela dele (não são resolvidos instantaneamente por trás) —
    // só se aplica à partida que ele mesmo está jogando (RL.cup, sem spectate); partidas
    // de fundo/espectador continuam resolvendo em segundo plano, sem essa pausa dramática.
    if(RL.cup && RL.cup.stage==='bracket' && !RL.cup.spectate){
      const m=RL.matches[0];
      if(m.hg===m.ag){
        if(!RL.cup.wentExtra){ startExtraTime(m); return; }
        if(!RL.cup.wentPens){ startPenaltyShootout(m); return; }
        // disputa de pênaltis ainda rolando (RL.pens existe mas finalH/finalA só são
        // calculados em finishPenaltyShootout, quando de fato decide) — nunca finaliza
        // a partida no meio, mesmo que algum tick perdido chegue até aqui.
        if(RL.pens && RL.pens.finalH==null) return;
      }
    }
    { const um=RL.matches.find(m=>m.user); if(um) camFinal(um); } // apito final na narração do Camarote
    /* sem `camOn()` de proposito: quem so' assiste nao tem Camarote, e era
       exactamente esse o caso que ficava sem apito nenhum. */
    liveApitoFinal(RL);
    /* A TELA SEGURA, O RELOGIO NAO. Um tique de espera para o apito soar com
       o jogo ainda a' vista — sem isto ele era cortado pela troca de ecra. */
    if(!RL._fimEspera){ RL._fimEspera=1; cdraw(); CL._liveTimer=setTimeout(liveTick, LIVE_FIM_ESPERA_MS); return; }
    if(typeof liveAgendarReenvioFinal==='function') liveAgendarReenvioFinal(RL);   // o apito final continua no ar por ~7s
    RL.done=true; if(RL.cup&&RL.cup.spectate) finishCupSpectate(); else if(RL.cup) finishCupLiveMatch(); else if(RL.humanSeat) finishHotseatMatch(); else finishLiveRound(); return;
  }
  // Online: o ritmo é o do ANFITRIÃO (games.speed_mult, sincronizado — ver clSetTempo/wireNet),
  // não a preferência local de cada convidado. Solo: cada um usa a própria opção "Tempo de jogo".
  CL._liveTimer=setTimeout(liveTick, liveRitmoMs(RL));
}
/* Quanto dura UM minuto de jogo, em milissegundos de relogio de parede. Era
   uma conta solta no fim do tique; virou funcao porque o apito final precisa
   da mesma resposta para saber quanto tempo REAL falta ate' ao fim. */
function liveRitmoMs(RL){
  // Online o ritmo e' o do ANFITRIAO (games.speed_mult, sincronizado — ver clSetTempo/wireNet),
  // nao a preferencia local de cada convidado. Solo: cada um usa a propria opcao "Tempo de jogo".
  const spd = CL.online ? TEMPO_MS['Usain Bolt'] : (TEMPO_MS[tempoLabelAtual()]||TEMPO_MS[TEMPO_DEFAULT]);
  let ms = Math.max(onlineTickFloorMs(RL), spd / roundSpeedMult());
  if(camLentoAtivo()) ms *= CAM_LENTO_MULT;   // camera lenta na festa do gol dele
  return ms;
}
/* ===== O APITO FINAL E' DA RODADA, NAO DA PARTIDA DELE =====
   Ele so' existia dentro do `camFinal`, que corre para a partida com `m.user`.
   Quem esta' a ver a rodada sem jogar — "vendo todos os jogos", ou um dia em
   que ele nao entra em campo — nunca tinha `m.user`, e a rodada acabava em
   silencio. Agora quem apita e' a rodada, e a partida dele so' chega primeiro
   quando acaba antes (91' num teto de 94').

   E NAO SE ANTECIPA. A primeira tentativa disparava quando faltavam ~2,5
   SEGUNDOS de relogio de parede, para o apito nao ser cortado pela troca de
   ecra. So' que segundos de parede sao minutos de JOGO a uma taxa que muda
   com o ritmo: no Ultrassonico (110ms por minuto) 2,5s sao vinte e tres
   minutos, e a rodada apitava aos 71'. Nao ha' antecipacao que sirva para os
   dois extremos.
   A resposta certa e' a outra ponta: o apito soa NO fim, no minuto certo, e
   quem espera e' o ENCERRAMENTO — a tela segura-se um instante antes de
   fechar a rodada, o que da' ao apito o mesmo espaco sem mentir no relogio. */
const LIVE_FIM_ESPERA_MS = 1600;   // a tela segura, o relogio nao
const LIVE_APITO_INI_MS = 1200;    // o sopro inteiro cabe aqui antes do 1' entrar
/* ===== A COMEMORACAO DA VITORIA =====
   Entra a seguir ao apito, nao por cima dele: os tres sopros longos ocupam
   ~1,6s. E' torcida, nao narracao — nao espera pelo ritmo lento, como o gol e
   os apitos. */
const RF_VITORIA_SRC = 'audio/torcida-vitoria.mp3';
/* NAO DA' PARA TIRAR OS QUATRO SEGUNDOS PEDIDOS: depois do corte a metade e
   dos tres segundos seguintes, o aplauso tinha 4,7s de ponta a ponta, e menos
   quatro deixava 0,7s — que nao chega para uma rampa de entrada, quanto mais
   para se ouvir aplauso nenhum. Foi ao MINIMO que ainda e' um aplauso com as
   duas rampas: 1,9s. Somando a espera do apito, sao 3,6s desde o fim do jogo,
   contra os 6,4s de antes. */
/* Repartido dentro dos mesmos 1,9s: com 500 de entrada e 400 de patamar o
   aplauso comecava a sair antes de ter chegado la' em cima — medido, so'
   alcancava 0,365 de um alvo de 0,57. A entrada encurta e o patamar cresce. */
/* ===== O CORTE FOI FEITO NO FICHEIRO, NAO EM CODIGO =====
   Medida a gravacao original meio segundo a meio segundo: ela ABRIA FRACA
   (RMS 8) e so' chegava ao pico aos 3,0s (RMS 19), assentando depois em 11-12
   pelos restantes dezassete segundos. Tocar os primeiros dois segundos era
   usar justamente a subida — que nunca chegava a lado nenhum, e por isso
   parecia longa por muito curta que fosse.
   A primeira tentativa foi saltar para o pico em tempo de execucao com
   `currentTime`, e isso trouxe uma fila de problemas que nao valiam o preco:
   a procura precisa de metadados, os metadados de um pedido, o pedido de
   esperar por `canplay` — e com tres caminhos a poder arrancar o som (canplay,
   seeked, rede de seguranca) o arranque acontecia duas vezes, com o relogio de
   saida orfao da primeira a matar a rampa da segunda. Sintoma medido: o
   aplauso a tocar com volume 0,023 do principio ao fim.
   O ficheiro passou a ser o pedaco que interessa — 1,9s a partir dos 2,4s, com
   as rampas ja' gravadas nele (ffmpeg, afade). Sem procura, sem espera, sem
   caminhos a competir: cria, toca, acabou. De 400 KB para 39 KB, ainda por
   cima. */
const RF_VITORIA_ESPERA = 1000;   // deixa passar o apito, que dura ~1,6s
let RF_VITORIA = null;
function rfVitoriaSom(){
  if(!rfSomLigado()) return;
  if(rfSomVolume() <= 0) return;
  setTimeout(() => {
    if(!rfSomLigado()) return;
    try{
      rfVitoriaParar();
      const a = new Audio(RF_VITORIA_SRC);
      a.volume = Math.min(1, 0.95*rfSomVolume());
      const pr = a.play(); if(pr && pr.catch) pr.catch(()=>{});
      RF_VITORIA = a;
    }catch(err){}
  }, RF_VITORIA_ESPERA);
}

/* ---- rampa de volume num <audio> ----
   `HTMLMediaElement.volume` nao tem rampa propria (isso e' da Web Audio), entao
   e' feita a mao. Passo de 50ms: abaixo disto o navegador engasga, acima ouve-se
   a escada. A curva e' quadratica de proposito — o ouvido le' volume em escala
   logaritmica, e uma rampa linear soa a saltar no fim.
   As duas rampas do fundo (esta e a do gol) escrevem no mesmo volume: quem
   comeca cancela a outra, senao brigam de 50 em 60ms. */
function rfFade(a, de, para, ms, aoFim){
  if(!a) return;
  clearInterval(a._rfFade); clearInterval(a._rfRampa);
  const passo = 50, n = Math.max(1, Math.round(ms/passo));
  let i = 0;
  try{ a.volume = Math.max(0, Math.min(1, de)); }catch(e){ return; }
  a._rfFade = setInterval(() => {
    i++;
    const k = i/n, curva = de < para ? k*k : 1-(1-k)*(1-k);
    try{ a.volume = Math.max(0, Math.min(1, de + (para-de)*curva)); }catch(e){ clearInterval(a._rfFade); return; }
    if(i >= n){ clearInterval(a._rfFade); if(aoFim) aoFim(); }
  }, passo);
}
/* ===== A DISPUTA DE PENALTIS TEM SOM COBRANCA A COBRANCA =====
   Ela decide classificacao e titulo e corria muda: so' o `sfx` de interface,
   dois bips iguais para converter e para perder. Cada batida passa a ter o
   som do que aconteceu — a rede quando entra, o "perdeu" quando nao entra.
   O INTERVALO e' obrigatorio aqui: a revelacao tem ritmo proprio (1,2s de
   suspense, 1,8s de resultado) mas o modo "⏩ Simular o resto" corta isso para
   200ms, e sem trava as cinco cobrancas sairiam praticamente juntas. */
const RF_PEN_INTERVALO = 900;
let RF_PEN_EM = 0;
function rfPenaltiSom(scored){
  if(!rfSomLigado()) return;
  if(Date.now() - RF_PEN_EM < RF_PEN_INTERVALO) return;
  RF_PEN_EM = Date.now();
  const vol = rfSomVolume(); if(vol <= 0) return;
  try{
    const a = new Audio(scored ? RF_GOL_REDE : RF_SONS.penaltiPerdido);
    a.volume = Math.min(1, 0.9*vol);
    const pr = a.play(); if(pr && pr.catch) pr.catch(()=>{});
  }catch(err){}
}
/* Qual dos dois lados e' "o utilizador" para efeito de comemoracao.
   Fora do hotseat e' simples: o clube dele. No HOTSEAT sao dois humanos no
   mesmo ecra, e a pergunta nao tem resposta unica — a regra combinada e' que
   o DONO DA CASA prevalece. */
function rfLadoDoUtilizador(m){
  const RL = CL.live;
  if(RL && RL.humanSeat) return 'H';
  return (m.h===CL.clubId) ? 'H' : (m.a===CL.clubId ? 'A' : null);
}

/* ===== O PRIMEIRO DE CADA SESSAO CHEGA ATRASADO =====
   Medido: a primeira vitoria de uma sessao so' comecava a soar 2,9s depois do
   pedido — o tempo de ir buscar o ficheiro — contra 1,05s nas seguintes. Pior
   ainda no aplauso, que agora salta para o pico do clipe e por isso PRECISA de
   metadados antes de arrancar.
   Um pedido no inicio da rodada resolve: o navegador guarda a resposta e todos
   os momentos do jogo passam a sair no instante certo. Sao ficheiros pequenos
   e ja' vao no mesmo deploy. */
let RF_SOM_PRE = false;
function rfSomPreCarregar(){
  if(RF_SOM_PRE) return;
  RF_SOM_PRE = true;
  [RF_GOL_REDE, RF_GOL_FESTA, RF_CHUTE_SRC, RF_QUASE_SRC, RF_VITORIA_SRC,
   RF_SONS.penaltiPerdido, RF_SONS.cartaoVermelho].forEach(src => {
    try{ const a = new Audio(); a.preload = 'auto'; a.src = src; a.load(); }catch(err){}
  });
}
function rfVitoriaParar(){
  const a = RF_VITORIA; if(!a) return;
  RF_VITORIA = null;
  try{ a.pause(); }catch(e){}
}
function liveApitoFinal(RL){
  if(!RL || RL._apitoFim) return;
  RL._apitoFim = 1;
  if(typeof rfApito==='function') rfApito(3, true);
  if(typeof rfTorcidaDesligar==='function') rfTorcidaDesligar();
}
/* ---- multiplicador de ritmo VÁLIDO agora ----
   Online a fonte da verdade é a SALA (NET.room.speedMult, escolhido pelo anfitrião). CL.speedMult
   é só um espelho local, e no CONVIDADO ele só é atualizado quando chega um onState trazendo
   speedMult (ver wireNet) — até lá fica no 1 do boot. Ler o espelho fazia o convidado calcular um
   ritmo diferente do anfitrião; e como o Modo Camarote é travado por velocidade, ele aparecia
   liberado só pra quem tinha o valor certo — na prática, só pro anfitrião. */
function roundSpeedMult(){
  // teste ligado: o ritmo é o mesmo pra todo mundo, sala ou solo — inclusive pro convidado, que
  // normalmente segue o anfitrião (senão um lado correria e o outro não)
  if(TEMPO_TESTE && TEMPO_MULT[TEMPO_TESTE]) return TEMPO_MULT[TEMPO_TESTE];
  if(CL.online && typeof NET!=='undefined' && NET.room && NET.room.speedMult) return NET.room.speedMult;
  return CL.speedMult||1;
}
/* ---- PISO DE RITMO ----
   O tempo NÃO tem nenhum papel na sincronia: o resultado sai do snapshot congelado do apito
   (kickoff_lineups), dos streams pré-computados (round_events) e do resolve-round — todo mundo
   vê o mesmo placar em qualquer velocidade. O único lugar em que o ritmo importa de verdade é a
   TRANSMISSÃO AO VIVO entre humanos (Fases 3B/3C): o autoritativo emite um snapshot no mínimo a
   cada ~900ms (ver maybeBroadcastMatch), então numa partida rápida demais quem assiste recebe o
   jogo aos saltos — ou só o placar final. Por isso o piso entra SÓ quando existe transmissão
   humano×humano viva nesta rodada; nas demais o anfitrião manda no ritmo sem freio nenhum. */
const STREAM_MIN_MS=300;   // ~3 minutos de jogo por batida de heartbeat (900ms) — assistível
function onlineTickFloorMs(RL){
  // com o teste ligado o piso cai pro próprio ritmo de teste: o piso existe pra transmissão
  // humano×humano ficar assistível, e em bancada a gente quer justamente que ela voe
  if(TEMPO_TESTE && TEMPO_MS[TEMPO_TESTE]) return 12;
  if(!CL.online || !RL) return 12;
  const ms=RL.matches||[];
  const assistindo = ms.some(m=>(m.streamRemote||m.spectate) && !m.streamDone && !m.streamDead);
  const meAssistem = ms.some(m=>m.user && m.streamCast && m.sim && !m.sim.done
    && CL.humans && CL.humans[m.h===CL.clubId?m.a:m.h]);   // meu confronto é contra outro humano
  return (assistindo||meAssistem) ? STREAM_MIN_MS : 12;
}
/* ---- PRORROGAÇÃO AO VIVO: mesma partida, mais 30min (2 tempos de 15) gerados com o
   mesmo motor (gols/cartões/lesões/pênaltis podem acontecer igual ao tempo normal — um
   pênalti do usuário aqui pausa e abre o modal normal, igual sempre). Os eventos entram
   na timeline da própria partida (deslocados +90'), então liveTick continua tocando
   normalmente — só o relógio muda de escala/rótulo (ver scLive). ---- */
/* A PRORROGAÇÃO GANHOU TELA (telas/Modal - Prorrogacao). Ela não tinha
   cabeçalho próprio: o relógio simplesmente passava dos 90 e o jogador
   descobria depois. A tela avisa antes, mostra como o elenco está e libera
   a QUARTA troca — que é a regra que só a prorrogação abre.
   startExtraTime() agora só apresenta; quem estende o relógio é
   startExtraTimeGo(), chamado pelo botão da tela. */
function startExtraTime(m){
  const RL=CL.live; if(!RL) return;
  RL.penMatch=m; CL._extraPend=m;
  overlayC(rfProrrogacaoHTML(RL));
}
function startExtraTimeGo(){
  clCloseOverlay();
  const m=CL._extraPend; CL._extraPend=null;
  if(m) startExtraTimeLegado(m);
}
function startExtraTimeLegado(m){
  const RL=CL.live;
  RL.cup.wentExtra=true;
  // FASE 3A: sessão interativa continua na MESMA partida — mantém quem está em campo, cartões e
  // substituições usadas (as decisões seguem valendo na prorrogação; o relógio se estende sozinho
  // pela regra de sessão-viva no liveTick).
  if(m.sim){
    m.sim.beginExtraTime();
    RL.extraStartMinute=RL.minute;
    RL.maxMin=RL.minute+34;
    toastC('⏱️ Empate! Vamos pra prorrogação.');
    cdraw();
    CL._liveTimer=setTimeout(liveTick,900);
    return;
  }
  const roundLabel = RL.cup.key==='copaBrasil' ? ('copaBrasil-r'+RL.cup.bracket.round) : (RL.cup.key+'-r'+RL.cup.bracket.round);
  const seed=hashSeed(S.seed,'cup',roundLabel,RL.cup.tie.h,RL.cup.tie.a,'extra');
  const ev=simEventsC(m.h,m.a,seed,{extraTime:true});
  ev.events.forEach(e=>{ e.min+=90; m.events.push(e); });
  RL.extraStartMinute=RL.minute;
  RL.maxMin=m.events.length ? m.events[m.events.length-1].min : (RL.minute+34);
  toastC('⏱️ Empate! Vamos pra prorrogação.');
  cdraw();
  CL._liveTimer=setTimeout(liveTick,900);
}
/* ---- DISPUTA DE PÊNALTIS AO VIVO: mesma mecânica visual do pênalti batido em campo
   (modal clássico, usuário escolhe quem bate, suspense, revelação) repetida cobrança a
   cobrança, alternando os dois times — só o time do usuário (m.user) escolhe; o outro
   lado (CPU, ou o adversário do usuário) tem o cobrador escolhido automaticamente pelo
   motor (mesmo peso de força/posição de sempre) e resolve na hora, sem pausar. 5 cobranças
   normais por time; se seguir empatado, morte súbita (1 cobrança cada, decide assim que
   alguém marca e o outro não). ---- */
function startPenaltyShootout(m){
  const RL=CL.live;
  RL.cup.wentPens=true; RL.paused=true;
  RL.pens={ h:[], a:[], turn:'H' };
  // TRAZ A MINHA PARTIDA PRA TELA. A rodada de copa mostra TODOS os confrontos da fase (ver
  // startCupRound), e nesse caso RL.sel nasce null — nenhum confronto selecionado. Só que o modal
  // (placar da disputa, escolha do batedor, suspense) é renderizado DENTRO do confronto
  // selecionado: RL.sel!=null é a condição em scLive. Sem esta linha a disputa inteira acontecia
  // INVISÍVEL — o usuário não via o placar nem podia escolher quem bate, e cada cobrança dele só
  // saía quando o relógio de 10s estourava e o batedor automático entrava. Uma disputa de 5+5
  // cobranças levava mais de um minuto de tela parada, e quem estava na sala achava que travou.
  // openPenaltyModal (pênalti dentro da partida) sempre fez isso; a disputa é que não fazia.
  const mi=RL.matches.indexOf(m); if(mi>=0) RL.sel=mi;
  toastC('🥅 Segue empatado — vai pra disputa de pênaltis!');
  cdraw();
  setTimeout(shootoutNextKick,1000);
}
function shootoutDecided(P){
  const nH=P.h.length, nA=P.a.length;
  if(nH===0 && nA===0) return false;
  // P.h/P.a guardam {name,scored} — filtra por .scored (um {scored:false} ainda é "truthy").
  const scoredH=P.h.filter(k=>k.scored).length, scoredA=P.a.filter(k=>k.scored).length;
  // FASE DE MELHOR-DE-5: decide a QUALQUER cobrança, inclusive no meio da rodada (regra oficial).
  // Assim que o time que está atrás não tiver mais como alcançar — mesmo com um lado tendo batido
  // uma vez a mais que o outro — a disputa acaba na hora, sem cobranças inúteis. Antes o código só
  // olhava quando os dois tinham batido o mesmo número (nH===nA), então numa vantagem irreversível
  // criada por uma cobrança ímpar (ex.: 4×1 com o rival tendo batido só 3) ele ainda deixava o
  // próximo bater — daí "eu já tinha ganho e meu último jogador ainda foi bater".
  if(nH<5 || nA<5){
    const remH=Math.max(0,5-nH), remA=Math.max(0,5-nA);
    return scoredH>scoredA+remA || scoredA>scoredH+remH;
  }
  // MORTE SÚBITA (os dois já bateram 5+): só decide com rodada completa (nº igual) e placar diferente.
  return nH===nA && scoredH!==scoredA;
}
/* regra oficial (IFAB): dentro da MESMA disputa, um jogador só pode bater de novo depois
   que todos os outros elegíveis do time já bateram uma vez — nunca antes disso. `pool` já
   vem sem goleiro (só bate goleiro em emergência, ver fallback abaixo); `takenNames` junta
   os nomes que já bateram NESTA disputa pro lado em questão (RL.pens.h/a). Se todo mundo
   elegível já bateu (disputa foi longe, morte súbita), reabre o ciclo do zero. */
function shootoutEligibleTakers(pool, takenNames){
  const fresh=pool.filter(p=>!takenNames.has(p.n));
  return fresh.length ? fresh : pool;
}
/* ---- QUEM PODE BATER UM PÊNALTI AGORA: só quem está EM CAMPO ----
   Antes todos os seletores de batedor (pênalti em campo e disputa de pênaltis, tanto do usuário
   quanto da CPU) liam o ONZE INICIAL (xiPlayers/availableXI). Isso ignora tudo o que aconteceu
   durante a partida: um jogador EXPULSO continuava na lista e podia ser escolhido pra bater —
   foi exatamente o que apareceu no playtest. Substituído idem (aparecia mesmo tendo saído), e
   quem entrou do banco não aparecia.
   A verdade é a sessão da partida: m.sim.onField(side), que o motor mantém removendo de campo
   expulsos, lesionados e substituídos (removeFromField em simulate.js). Fallbacks, em ordem:
   onze inicial (partida remota/transmitida, sem sessão local) e elenco (rede de segurança). */
function penaltyTakerPool(m, clubId){
  let pool=null;
  if(m && m.sim && typeof m.sim.onField==='function'){
    const side = m.h===clubId ? 'H' : (m.a===clubId ? 'A' : null);
    if(side) pool=m.sim.onField(side);
  }
  if(!pool || !pool.length) pool=xiPlayers(clubId);
  if(!pool || !pool.length) pool=squad(clubId);
  const line=pool.filter(p=>p.s!=='GK');
  return line.length ? line : pool;   // só sobrou goleiro em campo: ele bate (emergência)
}
function shootoutNextKick(){
  const RL=CL.live; if(!RL || !RL.pens) return;
  // teto de segurança (mesmo usado em resolveDrawnKnockoutTie pro caso não-interativo):
  // decide na marra se por algum motivo passar de 20 cobranças cada — nunca deveria
  // chegar nem perto disso na prática, é só rede de proteção contra loop infinito.
  if(shootoutDecided(RL.pens) || RL.pens.h.length>=20){ finishPenaltyShootout(); return; }
  const m=RL.matches[0], side=RL.pens.turn;
  const teamId=side==='H'?m.h:m.a;
  const isUserTurn = m.user && teamId===CL.clubId;
  cdraw();
  if(isUserTurn) openShootoutPickerModal();
  else {
    const oppId=side==='H'?m.a:m.h;
    const gk=squad(oppId).find(p=>p.s==='GK')||null;
    const pool=penaltyTakerPool(m, teamId);   // só quem terminou a partida EM CAMPO (sem expulso)
    const takenNames=new Set((side==='H'?RL.pens.h:RL.pens.a).map(k=>k.name));
    const eligible=shootoutEligibleTakers(pool, takenNames);
    const R=makeRng(hashSeed(S.seed,S.round,'pens',m.h,m.a,side,RL.pens.h.length+RL.pens.a.length));
    const taker=pickPenaltyTaker(eligible,R);
    const scored=R.random()<penaltyConvChance(taker,gk);
    /* A COBRANÇA DO ADVERSÁRIO TAMBÉM SE VÊ. Antes era `setTimeout(record…,700)`:
       o placar de bolinhas mudava sozinho e o utilizador nunca via quem bateu nem
       se entrou — a série "piscava" e no fim aparecia um resultado que ninguém
       tinha acompanhado. Agora passa pela MESMA revelação da cobrança dele
       (suspense → resultado), que é o que a disputa tem de dramático. */
    shootoutRevelar(side, taker?taker.n:null, scored);
  }
}
/* ===== A REVELAÇÃO DE UMA COBRANÇA, IGUAL PARA OS DOIS LADOS =====
   Mantém `pensPicking` ligado enquanto anima: é essa bandeira que faz a tela
   ao vivo desenhar o modal da disputa (ver liveModalHTML/shootoutPickerHTML).
   Só ao fim é que a cobrança é REGISTADA — antes disso o placar não muda, para
   a bolinha aparecer junto com a revelação e não antes dela. */
function shootoutRevelar(side, takerName, scored){
  const RL=CL.live; if(!RL || !RL.pens) return;
  /* uma revelacao de cada vez: chamada duas vezes seguidas, a segunda apagava os relogios da
     primeira e recomecava o suspense — a serie nunca avancava */
  if(CL.penPhase) return;
  if(CL._penPrazoTimer){ clearTimeout(CL._penPrazoTimer); CL._penPrazoTimer=null; }
  if(CL._penRevealTimer) clearTimeout(CL._penRevealTimer);
  if(CL._penCloseTimer) clearTimeout(CL._penCloseTimer);
  RL.pensPicking=true;
  CL.penPhase='suspense'; CL.penResultScorer=takerName; CL.penResultScored=scored;
  cdraw();
  const rapido=!!CL.penAuto;               // "⏩ Simular o resto" continua a valer
  CL._penRevealTimer=setTimeout(()=>{
    CL.penPhase='result'; sfx(scored?'penaltiGol':'penaltiPerdido');
    rfPenaltiSom(scored);
    cdraw();
    CL._penCloseTimer=setTimeout(()=>{
      CL.penPhase=null; CL.penResultScorer=null; CL.penResultScored=null;
      recordShootoutKick(side, takerName, scored);
    }, rapido?350:1800);
  }, rapido?200:1200);
}
function openShootoutPickerModal(){
  const RL=CL.live;
  // rede de segurança do mesmo problema de startPenaltyShootout: se por qualquer caminho a
  // seleção se perder no meio da disputa, o modal de escolha do batedor sumiria e a cobrança
  // seria decidida sozinha pelo relógio, sem o usuário ver nada.
  if(RL.sel==null) RL.sel=0;   // a MINHA partida é sempre matches[0] numa rodada de copa
  const pool=penaltyTakerPool(RL.matches[0], CL.clubId);
  const takenNames=new Set((RL.pens.turn==='H'?RL.pens.h:RL.pens.a).map(k=>k.name));
  const takers=shootoutEligibleTakers(pool, takenNames);
  const best=takers.slice().sort((a,b)=>b.f-a.f)[0];
  CL.penSel=best?best.n:(takers[0]&&takers[0].n)||null;
  /* CADA COBRANÇA COMEÇA SEM CANTO ESCOLHIDO. `CL.penCanto` é global e sobrevive à cobrança
     anterior — sem zerar, a 2ª batida da série já nasceria com o canto da 1ª marcado na baliza e
     levaria o bônus de escolha (penaltyConvChance, +6 pontos) sem o jogador ter escolhido nada. */
  CL.penCanto=null;
  CL.penDeadline=Date.now()+10000;
  RL.pensPicking=true;
  sfx('penalti'); cdraw();
  /* modo automatico ligado pelo "Simular o resto": nao espera os dez segundos,
     bate com o batedor pre-escolhido e segue para a proxima */
  if(CL.penAuto){ setTimeout(()=>resolveShootoutKick(CL.penSel), 220); return; }
  if(CL._penTimer) clearInterval(CL._penTimer);
  CL._penTimer=setInterval(shootoutPenaltyTick,200);
  /* ===== A COBRANCA NAO PODE DEPENDER SO DO INTERVALO =====
     O prazo de 10s vivia unicamente dentro de shootoutPenaltyTick, um setInterval que (a) escreve
     num elemento `#cl-pen-count` que a pele nova JA NAO DESENHA e (b) se apaga sozinho sempre que
     `pensPicking` pisca para falso. Morto o intervalo, NADA mais resolvia a cobranca:
     resolveShootoutKick so e chamado por ele ou pelo clique em "Bater". A disputa ficava parada
     para sempre a espera, com a tela ao vivo a redesenhar por tras — era o "piscando em loop".
     Medido: prazo vencido ha 51 segundos, intervalo inexistente, zero cobrancas registadas.
     Agora o prazo tem um relogio proprio, que dispara mesmo que o intervalo tenha morrido. */
  if(CL._penPrazoTimer) clearTimeout(CL._penPrazoTimer);
  CL._penPrazoTimer=setTimeout(()=>{
    const R2=CL.live;
    if(R2 && R2.pensPicking && !CL.penPhase) resolveShootoutKick(CL.penSel);
  }, Math.max(300, CL.penDeadline-Date.now()+120));
}
function shootoutPenaltyTick(){ const RL=CL.live; if(!RL||!RL.pensPicking){ clearInterval(CL._penTimer); return; }
  const left=Math.max(0,CL.penDeadline-Date.now()); const secs=Math.ceil(left/1000);
  const cd=$c('#cl-pen-count'); if(cd) cd.textContent=secs+'s';
  if(left<=0){ clearInterval(CL._penTimer); resolveShootoutKick(CL.penSel); }
}
function resolveShootoutKick(takerName){
  const RL=CL.live; if(!RL||!RL.pensPicking) return;
  if(CL._penTimer){ clearInterval(CL._penTimer); CL._penTimer=null; }
  // NÃO zera RL.pensPicking aqui — só quando a cobrança é de fato registrada em
  // recordShootoutKick(), depois do suspense+revelação. Zerar cedo demais (como antes)
  // fazia "shooting" (liveModalHTML) virar false no meio da animação, escondendo o modal
  // de suspense/revelação e mostrando por engano a barra de ação normal ("Continuar" etc)
  // — se o usuário clicasse nela, a partida seguia e terminava o mata-mata sem a disputa
  // de pênaltis ter de fato terminado (RL.pens.finalH/finalA nunca calculados), travando
  // o confronto com "pênaltis undefined×undefined" pra sempre.
  const m=RL.matches[0], side=RL.pens.turn;
  const teamId=side==='H'?m.h:m.a, oppId=side==='H'?m.a:m.h;
  const taker=findP(takerName,teamId);
  const gk=squad(oppId).find(p=>p.s==='GK')||null;
  const kickIdx=RL.pens.h.length+RL.pens.a.length;
  const R=makeRng(hashSeed(S.seed,S.round,'pens',m.h,m.a,side,kickIdx,takerName));
  const scored=R.random()<penaltyConvChance(taker,gk,{humano:true,canto:CL.penCanto});
  /* mesma revelação da cobrança do adversário — uma função só para os dois lados */
  shootoutRevelar(side, taker?taker.n:takerName, scored);
}
function recordShootoutKick(side,takerName,scored){
  const RL=CL.live; if(!RL||!RL.pens) return;
  if(CL._penPrazoTimer){ clearTimeout(CL._penPrazoTimer); CL._penPrazoTimer=null; }
  if(CL._penTimer){ clearInterval(CL._penTimer); CL._penTimer=null; }
  RL.pensPicking=false;
  (side==='H'?RL.pens.h:RL.pens.a).push({name:takerName,scored});
  RL.pens.turn = side==='H' ? 'A' : 'H';
  cdraw();
  setTimeout(shootoutNextKick,1200);
}
function finishPenaltyShootout(){
  CL.penAuto=false;                     // o modo automatico vale so para esta disputa
  const RL=CL.live; const P=RL.pens;
  P.finalH=P.h.filter(k=>k.scored).length; P.finalA=P.a.filter(k=>k.scored).length;
  // se bateu o teto de segurança (20 cobranças cada) ainda empatado — praticamente
  // impossível na prática — desempata pro lado de casa, só pra sempre ter um vencedor.
  if(P.finalH===P.finalA) P.finalH++;
  /* GANHOU NOS PENALTIS E' VITORIA COMO OUTRA QUALQUER. O `camFinal` nao serve
     aqui: para ele a partida acabou empatada no tempo normal, e quem decide
     e' esta contagem. */
  {
    const m = RL.matches[0];
    const lado = m ? rfLadoDoUtilizador(m) : null;
    if(lado){
      const meus = lado==='H' ? P.finalH : P.finalA;
      const deles = lado==='H' ? P.finalA : P.finalH;
      if(meus > deles && typeof rfVitoriaSom==='function') rfVitoriaSom();
    }
  }
  RL.paused=false; RL.done=true;
  finishCupLiveMatch();
}
/* ---- PÊNALTI INTERATIVO: pausa a partida, mostra o modal clássico, escolhe o batedor.
   Se não decidir em 10s, bate automaticamente com o jogador pré-selecionado (o de maior força). ---- */
function openPenaltyModal(m,e){ const RL=CL.live;
  RL.paused=true; RL.penMatch=m; RL.penEvent=e; RL.sel=RL.matches.indexOf(m);
  const takers=penaltyTakerPool(m, CL.clubId);   // sem expulso/substituído (ver penaltyTakerPool)
  const best=takers.slice().sort((a,b)=>b.f-a.f)[0];
  CL.penSel = best ? best.n : (takers[0]&&takers[0].n) || null;
  CL.penDeadline = Date.now()+10000;
  sfx('penalti'); cdraw();
  if(CL._penTimer) clearInterval(CL._penTimer);
  CL._penTimer=setInterval(penaltyTick, 200);
}
function penaltyTick(){ const RL=CL.live; if(!RL || !RL.penEvent){ clearInterval(CL._penTimer); return; }
  const left=Math.max(0, CL.penDeadline-Date.now());
  const secs=Math.ceil(left/1000);
  const cd=$c('#cl-pen-count'); if(cd) cd.textContent=secs+'s';
  if(left<=0){ clearInterval(CL._penTimer); resolvePenalty(CL.penSel); }
}
function penaltySelect(name){ CL.penSel=name; cdraw(); }
/* ---- resultado do pênalti: agora em 3 fases, igual ao RetroFoot98 clássico —
   1) escolhe o batedor  2) suspense (só o título, alguns segundos)
   3) revelação dramática (GOLO em vermelho / Defendeu em preto) antes de continuar. ---- */
function resolvePenalty(takerName){
  const RL=CL.live; if(!RL || !RL.penEvent) return;
  if(CL._penTimer){ clearInterval(CL._penTimer); CL._penTimer=null; }
  const e=RL.penEvent;
  if(e._remote){
    // FASE 3B (visitante): mando a escolha do batedor pro mandante e fico no suspense — a
    // revelação chega pelo stream (closeRemoteDecision). Timer de segurança fecha se nada vier.
    if(typeof NET!=='undefined' && NET.broadcastDecision && CL._remoteDecision)
      NET.broadcastDecision({ k:CL._remoteDecision.k, side:(RL.penMatch.h===CL.clubId?'H':'A'), decision:{tipo:'penalti', batedor:takerName, canto:CL.penCanto} });
    CL.penPhase='suspense'; CL.penResultScorer=takerName; CL.penResultScored=null;
    cdraw();
    CL._penRevealTimer=setTimeout(()=>{ if(CL.penPhase==='suspense'){ CL._remoteDecision=null; closePenaltyModal(); } }, 9000);
    return;
  }
  let scored;
  if(RL.penMatch && RL.penMatch.sim){
    // FASE 3A: a SESSÃO decide (mesma RNG determinística de sempre) e já aplica placar/artilheiro/log
    scored=RL.penMatch.sim.applyDecision({tipo:'penalti', batedor:takerName, canto:CL.penCanto});
    e._resolved=true;
  } else {
    const taker=findP(takerName,CL.clubId);
    const oppId = RL.penMatch.h===CL.clubId ? RL.penMatch.a : RL.penMatch.h;
    const gk=squad(oppId).find(p=>p.s==='GK')||null;
    const R=makeRng(hashSeed(S.seed,S.round,'pen',e.min,takerName));
    const pConv=penaltyConvChance(taker,gk,{humano:true,canto:CL.penCanto});
    scored=R.random()<pConv;
    e.scored=scored; e.scorer=taker?taker.n:e.scorer; e._resolved=true;
  }
  CL.penPhase='suspense'; CL.penResultScorer=e.scorer; CL.penResultScored=scored;
  cdraw();
  CL._penRevealTimer=setTimeout(()=>penaltyReveal(scored,e.scorer), 1400);
}
function penaltyReveal(scored,scorer){
  CL.penPhase='result';
  sfx(scored?'penaltiGol':'penaltiPerdido');
  /* COLADO AO LANCE, nao ao evento. O gol e a perda de penalti so' chegariam
     ao som quando o laco de eventos consumisse o evento, ja' depois do modal
     fechar — o estadio rugia com atraso. Aqui e' no instante da revelacao. */
  if(typeof camOn==='function' && camOn()){
    if(scored){ rfGolSom(true); camCelebrar(); }   // penalti do utilizador: e' sempre gol dele
    else if(typeof rfSomTocar==='function') rfSomTocar('penaltiPerdido');
  }
  cdraw();
  CL._penCloseTimer=setTimeout(closePenaltyModal, 2200);
}
function closePenaltyModal(){
  const RL=CL.live; if(!RL) return;
  const scored=CL.penResultScored, scorer=CL.penResultScorer;
  toastC(scored ? `⚽ GOL! ${scorer||''} converteu o pênalti!` : `❌ ${scorer||''} desperdiçou o pênalti!`);
  RL.paused=false; RL.penMatch=null; RL.penEvent=null;
  CL.penSel=null; CL.penPhase=null; CL.penResultScorer=null; CL.penResultScored=null;
  cdraw();
  CL._liveTimer=setTimeout(liveTick,420);
}

function liveRowClick(i){ CL.live.sel=i; CL.subOut=CL.subIn=null; cdraw(); }
// Fechar o modal (RL.sel=null) SEMPRE revela algo útil por baixo — mesmo em partida avulsa de
// copa/assento, a tela ao vivo já desenha a própria linha do jogo + relógio (ver scLive, single =
// RL.cup||RL.humanSeat, começa com sel:null em startCupLiveMatch). Antes, pra copa, o intervalo
// deixava RL.sel=0 (modal continuava aberto, sem jeito de fechar) e fora do intervalo o botão virava
// um no-op — o "Continuar" clicava e nada acontecia. clique no card (liveRowClick) reabre quando quiser.
function liveContinue(){ const RL=CL.live; if(!RL) return;
  if(RL.paused){ clearHalftimeCountdown(); RL.paused=false; RL.halftimeLeft=null; RL.sel=null; cdraw(); CL._liveTimer=setTimeout(liveTick,320); return; }
  RL.sel=null; cdraw(); }
/* INTERVALO na Resenha: no máximo 10s para fazer a substituição — se o usuário não apertar
   Continuar, avança sozinho ao fim do tempo (mantém todos os treinadores sincronizados no tempo). */
let HALFTIME_TIMER=null;
function startHalftimeCountdown(){
  clearHalftimeCountdown();
  const RL=CL.live; if(!RL) return;
  RL.halftimeLeft=10;
  HALFTIME_TIMER=setInterval(()=>{
    const rl=CL.live;
    if(!rl || !rl.paused){ clearHalftimeCountdown(); return; }
    rl.halftimeLeft=(rl.halftimeLeft!=null?rl.halftimeLeft:10)-1;
    const el=document.querySelector('.cl-ht-count'); if(el) el.textContent=Math.max(0,rl.halftimeLeft);
    if(rl.halftimeLeft<=0){ clearHalftimeCountdown(); liveContinue(); }
  }, 1000);
}
function clearHalftimeCountdown(){ if(HALFTIME_TIMER){ clearInterval(HALFTIME_TIMER); HALFTIME_TIMER=null; } }
/* ---- LESÃO: jogador do usuário se machuca em campo — pausa e pede pra escolher quem
   entra no lugar, filtrando pela MESMA posição do lesionado (com reserva de emergência
   se não sobrar ninguém daquela posição no banco). Modal clássico: barra de título com
   o nome do clube, fundo vinho, lista de opções, botão OK. ---- */
function openInjuryModal(m,e){ const RL=CL.live;
  RL.paused=true; RL.injMatch=m; RL.injEvent=e; RL.sel=RL.matches.indexOf(m);
  // PRÉ-SELEÇÃO + AUTO-AVANÇO (10s), igual ao modal de pênalti: este modal PAUSA a partida, e na
  // Resenha isso segurava todo mundo esperando um clique. Já vem com o 1º sugerido (mesma posição
  // do lesionado, topo da lista) marcado, então se o treinador não decidir a troca acontece sozinha
  // com uma escolha sensata em vez de travar o jogo. Sem reservas -> segue com 10 (resolveInjuryNoSub).
  const opts=injurySubOptions(e);
  CL.injSel = opts.length ? opts[0].pid : null;
  CL.injDeadline = Date.now()+10000;
  sfx('lesao'); cdraw();
  if(CL._injTimer) clearInterval(CL._injTimer);
  CL._injTimer=setInterval(injuryTick, 200);
}
function injuryTick(){ const RL=CL.live;
  if(!RL || !RL.injEvent){ if(CL._injTimer){ clearInterval(CL._injTimer); CL._injTimer=null; } return; }
  const left=Math.max(0, (CL.injDeadline||0)-Date.now());
  const cd=$c('#cl-inj-count'); if(cd) cd.textContent=Math.ceil(left/1000)+'s';
  if(left<=0){
    clearInterval(CL._injTimer); CL._injTimer=null;
    if(CL.injSel) resolveInjurySub(CL.injSel); else resolveInjuryNoSub();
  }
}
function clearInjuryTimer(){ if(CL._injTimer){ clearInterval(CL._injTimer); CL._injTimer=null; } }
/* sempre lista TODOS os reservas disponíveis, de qualquer posição — antes só mostrava os
   da mesma posição do lesionado quando havia algum, então se um zagueiro se lesionasse o
   goleiro reserva desaparecia da lista (só reaparecia numa lesão futura sem zagueiro
   disponível), como se não pudesse ser escolhido ali. O treinador pode legitimamente
   querer escalar qualquer reserva (ex: sacrificar um atacante pra fechar a defesa); só
   ordena os da mesma posição primeiro, pra sugerir a troca mais natural sem obrigar nada. */
function injurySubOptions(e){
  if((CL.subsUsed||0)>=3) return []; // Fase 3A: lesão gasta uma substituição — esgotadas, segue com 10
  const xiSet=new Set(S.xi||[]);   // pids
  let bench=squad(CL.clubId).filter(p=>!xiSet.has(p.pid) && !(p.suspended>0) && !(p.injuredMatches>0)).sort(bySquadOrder);
  // regra de 1 goleiro: se o lesionado é GOLEIRO, só oferece goleiros do banco (a menos que não
  // haja nenhum — aí libera pra não deixar o gol vazio). Se o lesionado é de LINHA, nunca oferece
  // goleiro (senão o time ficaria com 2 goleiros em campo).
  if(e.pos==='GK'){ const gks=bench.filter(p=>p.s==='GK'); if(gks.length) bench=gks; }
  else bench=bench.filter(p=>p.s!=='GK');
  const samePos=bench.filter(p=>p.s===e.pos), rest=bench.filter(p=>p.s!==e.pos);
  return [...samePos, ...rest];
}
/* cor do modal de lesão = cor real do clube do jogador lesionado (mesma lógica do
   modal de pênalti, ver penaltyClubStyle) — antes ficava sempre vinho fixo. */
function injuryClubStyle(){
  const c=clubOf(CL.clubId); if(!c || !c.color) return '';
  const {col,col2}=clubColors(c);
  return `style="--inj-bg:linear-gradient(165deg,${col} 45%,${col2} 100%);--inj-fg:${txtOn(col)}"`;
}
function injurySubHTML(m,e){
  // TELA PORTADA (telas/Modal - Lesao)
  return rfLesaoHTML(m,e);
}
function injurySubHTMLLegado(m,e){
  const posName={GK:'Goleiro',DEF:'Zagueiro',MID:'Meia',ATT:'Atacante'}[e.pos]||'Jogador';
  const secsLeft=Math.max(0, Math.ceil(((CL.injDeadline||0)-Date.now())/1000)); // auto-avanço (ver injuryTick)
  const opts=injurySubOptions(e);
  const noOpts = !opts.length;
  const rows=noOpts ? '<div class="cl-pen-row" style="cursor:default">Sem reservas disponíveis.</div>' : opts.map(p=>{
    const samePos=p.s===e.pos;
    return `<div class="cl-pen-row ${CL.injSel===p.pid?'sel':''}" onclick="injurySelect('${escC(p.pid)}')">
      <span class="cl-pen-pos">${posLetter(p.s)}</span><span class="cl-pen-n">${escC(p.n)}${samePos?' <span class="cl-inj-suggest">★ sugerido</span>':''}</span><span class="cl-pen-r">${p.f}</span>
    </div>`;
  }).join('');
  // sem reserva disponível (banco esgotado) -> não pode travar o jogo esperando uma escolha
  // impossível: deixa seguir com um jogador a menos, igual acontece numa expulsão.
  const actionBtn = noOpts
    ? btn('Continuar com 10 jogadores','resolveInjuryNoSub()',{icon:'➡',cls:'cl-btn-ok'})
    : btn('OK','resolveInjurySub(CL.injSel)',{icon:'✔',cls:'cl-btn-ok',dis:!CL.injSel});
  return `<div class="cl-pen-overlay"><div class="cl-inj-modal" ${injuryClubStyle()}>
    <div class="cl-inj-title"><span class="cl-inj-min">–</span><span>${escC(clubOf(CL.clubId).short)}</span></div>
    <div class="cl-inj-body">
      <div class="cl-inj-msg">${escC(e.player)} (${posName}) lesionou-se${noOpts?', mas não há reservas disponíveis':' e tem de ser substituído'}.<br>${noOpts?'O time seguirá com um jogador a menos.':'Escolha o jogador a entrar.'} <span id="cl-inj-count" class="cl-pen-count">${secsLeft}s</span></div>
      <div class="cl-pen-list">${rows}</div>
      <div class="cl-pen-btn">${actionBtn}</div>
    </div>
  </div></div>`;
}
function injurySelect(pid){ CL.injSel=pid; cdraw(); }
function resolveInjurySub(replacementPid){
  const RL=CL.live; if(!RL || !RL.injEvent || !replacementPid) return;
  clearInjuryTimer();
  const e=RL.injEvent; const rep=pById(replacementPid,CL.clubId); if(!rep) return;
  if(e._remote){
    // FASE 3B (visitante): decisão viaja pro mandante; o efeito aparece no stream
    if(typeof NET!=='undefined' && NET.broadcastDecision && CL._remoteDecision)
      NET.broadcastDecision({ k:CL._remoteDecision.k, side:(RL.injMatch.h===CL.clubId?'H':'A'), decision:{tipo:'lesao-sub', entraPid:replacementPid} });
    CL.subsUsed=(CL.subsUsed||0)+1;
    const outPidR = e.pid || ((squad(CL.clubId).find(x=>x.n===e.player)||{}).pid);
    const idxR=(S.xi||[]).indexOf(outPidR); if(idxR>=0) S.xi[idxR]=rep.pid;
    clearInjuryTimer(); CL._remoteDecision=null;
    toastC(`✚→✔ ${rep.n} entrou no lugar de ${e.player}.`);
    RL.paused=false; RL.injMatch=null; RL.injEvent=null; CL.injSel=null;
    cdraw(); CL._liveTimer=setTimeout(liveTick,420);
    return;
  }
  // FASE 3A: a troca entra NO MOTOR — o time volta a ter 11 e a força recalcula com quem entrou
  // (gasta uma substituição, como no futebol de verdade). O placar dali em diante sente a decisão.
  if(RL.injMatch && RL.injMatch.sim){ RL.injMatch.sim.applyDecision({tipo:'lesao-sub', entraPid:replacementPid}); CL.subsUsed=(CL.subsUsed||0)+1; }
  // o lesionado é identificado pelo pid do evento (e.pid); fallback pro nome em saves/eventos antigos
  const outPid = e.pid || ((squad(CL.clubId).find(x=>x.n===e.player)||{}).pid);
  const idx=(S.xi||[]).indexOf(outPid);
  if(idx>=0) S.xi[idx]=rep.pid;
  e._resolved=true;
  toastC(`✚→✔ ${rep.n} entrou no lugar de ${e.player}.`);
  RL.paused=false; RL.injMatch=null; RL.injEvent=null; CL.injSel=null;
  cdraw();
  CL._liveTimer=setTimeout(liveTick,420);
}
function resolveInjuryNoSub(){
  const RL=CL.live; if(!RL || !RL.injEvent) return;
  clearInjuryTimer();
  const e=RL.injEvent; e._resolved=true;
  if(e._remote){
    if(typeof NET!=='undefined' && NET.broadcastDecision && CL._remoteDecision)
      NET.broadcastDecision({ k:CL._remoteDecision.k, side:(RL.injMatch.h===CL.clubId?'H':'A'), decision:{tipo:'lesao-sem-sub'} });
    CL._remoteDecision=null;
    RL.paused=false; RL.injMatch=null; RL.injEvent=null; CL.injSel=null;
    cdraw(); CL._liveTimer=setTimeout(liveTick,420);
    return;
  }
  if(RL.injMatch && RL.injMatch.sim) RL.injMatch.sim.applyDecision({tipo:'lesao-sem-sub'}); // segue com 10 (motor já removeu o lesionado)
  toastC(`✚ ${e.player} lesionou-se — o time seguiu com um jogador a menos.`);
  RL.paused=false; RL.injMatch=null; RL.injEvent=null; CL.injSel=null;
  cdraw();
  CL._liveTimer=setTimeout(liveTick,420);
}
/* ---- EXPULSÃO (Fase 3A): jogador do usuário recebe vermelho — o time JÁ perdeu ele no motor
   (segue com 10, força recalculada). O modal deixa REORGANIZAR: sacrificar um jogador em campo
   pra entrar um do banco (gasta uma substituição) — útil pra repor goleiro expulso ou fechar o
   setor exposto. 12s pra decidir; padrão = seguir com 10 sem mexer. ---- */
function openRedCardModal(m,e){ const RL=CL.live;
  RL.paused=true; RL.redMatch=m; RL.redEvent=e; RL.sel=RL.matches.indexOf(m);
  CL.redIn=null; CL.redOut=null;
  CL.redDeadline=Date.now()+12000;
  /* O "PODE ISSO ARNALDO" ENTRA COM O MODAL, nao depois dele. A expulsao DELE
     nao e' consumida pelo laco de eventos enquanto a reorganizacao nao for
     decidida (ver `pendingRed`), e o som vivia nesse consumo — chegava com o
     modal ja' fechado, comentando um lance que a tela tinha deixado para tras.
     `_camSons` e' marcado aqui para o laco nao o repetir quando enfim passar
     por ele. A do adversario nao tem modal, e continua a sair por la'. */
  if(typeof rfSomTocar==='function'){
    m._camSons = m._camSons || {};
    if(!m._camSons.cartaoVermelho){ m._camSons.cartaoVermelho = 1; rfSomTocar('cartaoVermelho'); }
  }
  sfx('lesao'); cdraw();
  if(CL._redTimer) clearInterval(CL._redTimer);
  CL._redTimer=setInterval(redCardTick,200);
}
function redCardTick(){ const RL=CL.live;
  if(!RL || !RL.redEvent){ clearRedTimer(); return; }
  const left=Math.max(0,(CL.redDeadline||0)-Date.now());
  const cd=$c('#cl-red-count'); if(cd) cd.textContent=Math.ceil(left/1000)+'s';
  if(left<=0){ clearRedTimer(); resolveRedSkip(); }
}
function clearRedTimer(){ if(CL._redTimer){ clearInterval(CL._redTimer); CL._redTimer=null; } }
function redSelect(kind,pid){ if(kind==='in')CL.redIn=pid; else CL.redOut=pid; cdraw(); }
/* opções de quem ENTRA: goleiro expulso -> só goleiros do banco (se houver); linha -> banco de linha */
function redCardBench(m,e){
  if((CL.subsUsed||0)>=3) return [];
  let bench;
  if(m.sim){ const side=m.sim.userSide; if(!side) return []; bench=m.sim.benchOf(side).sort(bySquadOrder); }
  else { // FASE 3B (visitante remoto): banco derivado do elenco/escala local — mesma visão do mandante
    const xiSet=new Set(S.xi||[]);
    bench=squad(CL.clubId).filter(p=>!xiSet.has(p.pid)&&!(p.suspended>0)&&!(p.injuredMatches>0)).sort(bySquadOrder);
  }
  if(e.pos==='GK'){ const gks=bench.filter(p=>p.s==='GK'); if(gks.length) bench=gks; }
  else bench=bench.filter(p=>p.s!=='GK');
  return bench;
}
function redCardOnField(m,e){
  // quem SAI: nunca o goleiro (se entra goleiro repondo GK expulso, sai jogador de linha)
  const list=m.sim ? m.sim.onField(m.sim.userSide) : xiPlayers(CL.clubId).filter(p=>p.pid!==e.pid);
  return list.filter(p=>p.s!=='GK');
}
function resolveRedSkip(){
  const RL=CL.live; if(!RL || !RL.redEvent) return;
  clearRedTimer();
  const e=RL.redEvent;
  if(e._remote){
    if(typeof NET!=='undefined' && NET.broadcastDecision && CL._remoteDecision)
      NET.broadcastDecision({ k:CL._remoteDecision.k, side:(RL.redMatch.h===CL.clubId?'H':'A'), decision:{tipo:'expulsao-segue'} });
    CL._remoteDecision=null;
    toastC(`🟥 ${e.player} expulso — o time segue com um jogador a menos.`);
    RL.paused=false; RL.redMatch=null; RL.redEvent=null; CL.redIn=null; CL.redOut=null;
    cdraw(); CL._liveTimer=setTimeout(liveTick,420);
    return;
  }
  if(RL.redMatch && RL.redMatch.sim) RL.redMatch.sim.applyDecision({tipo:'expulsao-segue'});
  e._resolved=true;
  toastC(`🟥 ${e.player} expulso — o time segue com um jogador a menos.`);
  RL.paused=false; RL.redMatch=null; RL.redEvent=null; CL.redIn=null; CL.redOut=null;
  cdraw(); CL._liveTimer=setTimeout(liveTick,420);
}
function resolveRedConfirm(){
  const RL=CL.live; if(!RL || !RL.redEvent || !CL.redIn || !CL.redOut) return;
  clearRedTimer();
  const e=RL.redEvent;
  const entra=pById(CL.redIn,CL.clubId), sai=pById(CL.redOut,CL.clubId);
  if(e._remote){
    if(typeof NET!=='undefined' && NET.broadcastDecision && CL._remoteDecision)
      NET.broadcastDecision({ k:CL._remoteDecision.k, side:(RL.redMatch.h===CL.clubId?'H':'A'), decision:{tipo:'expulsao-reorg', saiPid:CL.redOut, entraPid:CL.redIn} });
    CL.subsUsed=(CL.subsUsed||0)+1;
    const idxR=(S.xi||[]).indexOf(CL.redOut); if(idxR>=0) S.xi[idxR]=CL.redIn;
    CL._remoteDecision=null;
    toastC(`🟥 ${e.player} expulso. ⇄ ${entra?entra.n:''} entrou no lugar de ${sai?sai.n:''} pra reorganizar.`);
    RL.paused=false; RL.redMatch=null; RL.redEvent=null; CL.redIn=null; CL.redOut=null;
    cdraw(); CL._liveTimer=setTimeout(liveTick,420);
    return;
  }
  if(RL.redMatch && RL.redMatch.sim) RL.redMatch.sim.applyDecision({tipo:'expulsao-reorg', saiPid:CL.redOut, entraPid:CL.redIn});
  CL.subsUsed=(CL.subsUsed||0)+1;
  const idx=(S.xi||[]).indexOf(CL.redOut); if(idx>=0) S.xi[idx]=CL.redIn; // registro da escalação acompanha
  e._resolved=true;
  toastC(`🟥 ${e.player} expulso. ⇄ ${entra?entra.n:''} entrou no lugar de ${sai?sai.n:''} pra reorganizar.`);
  RL.paused=false; RL.redMatch=null; RL.redEvent=null; CL.redIn=null; CL.redOut=null;
  cdraw(); CL._liveTimer=setTimeout(liveTick,420);
}
function redCardHTML(m,e){
  // TELA PORTADA (telas/Modal - Cartao Vermelho)
  return rfExpulsaoHTML(m,e);
}
function redCardHTMLLegado(m,e){
  const secsLeft=Math.max(0, Math.ceil(((CL.redDeadline||0)-Date.now())/1000));
  const bench=redCardBench(m,e);
  const canReorg=bench.length>0;
  const row=(p,kind,sel)=>`<div class="cl-pen-row ${sel?'sel':''}" onclick="redSelect('${kind}','${escC(p.pid)}')">
      <span class="cl-pen-pos">${posLetter(p.s)}</span><span class="cl-pen-n">${escC(p.n)}</span>${notaChip(p)}<span class="cl-pen-r">${p.f}</span></div>`;
  const inRows=bench.map(p=>row(p,'in',CL.redIn===p.pid)).join('');
  const outRows=canReorg?redCardOnField(m,e).map(p=>row(p,'out',CL.redOut===p.pid)).join(''):'';
  // Entra/Sai lado a lado (mesmo padrão de duas colunas do subPanelHTML/cl-sub-cols), não mais
  // duas listas cheias empilhadas — aquilo fugia do padrão compacto dos outros modais de decisão
  // ao vivo (injurySubHTML/penaltyHTML, sempre uma cl-pen-list só) e tomava a tela toda.
  return `<div class="cl-pen-overlay"><div class="cl-inj-modal cl-inj-modal-wide" ${injuryClubStyle()}>
    <div class="cl-inj-title"><span class="cl-inj-min">🟥</span><span>${escC(clubOf(CL.clubId).short)}</span></div>
    <div class="cl-inj-body">
      <div class="cl-inj-msg">${escC(e.player)} foi EXPULSO (${escC(e.reason||'')}) — o time segue com um a menos.<br>
      ${canReorg?'Quer reorganizar? Escolha quem sai e quem entra (gasta uma substituição).':'Sem opções de reorganização.'}
      <span id="cl-red-count" class="cl-pen-count">${secsLeft}s</span></div>
      ${canReorg?`<div class="cl-pen-cols">
        <div class="cl-pen-col"><div class="cl-pen-col-lbl">Sai</div><div class="cl-pen-list">${outRows}</div></div>
        <div class="cl-pen-col"><div class="cl-pen-col-lbl">Entra</div><div class="cl-pen-list">${inRows}</div></div>
      </div>`:''}
      <div class="cl-pen-btn">${canReorg?btn('Reorganizar','resolveRedConfirm()',{icon:'⇄',cls:'cl-btn-ok',dis:!(CL.redIn&&CL.redOut)}):''}
      ${btn('Seguir com 10','resolveRedSkip()',{icon:'➡',cls:'cl-btn-cancel'})}</div>
    </div>
  </div></div>`;
}
function liveSubPick(side,pid){ if(side==='out')CL.subOut=pid; else CL.subIn=pid; updateLive(); }
function liveDoSub(){ if(!CL.subOut||!CL.subIn){ toastC('Escolha um titular e um reserva.'); return; }
  if((CL.subsUsed||0)>=3){ toastC('Máximo de 3 substituições.'); return; }
  const outP=pById(CL.subOut,CL.clubId), inP=pById(CL.subIn,CL.clubId);   // subOut/subIn = pids
  if(outP&&inP&&(inP.s==='GK')!==(outP.s==='GK')){ // mantém exatamente 1 goleiro em campo
    toastC(inP.s==='GK'?'Já tem um goleiro em campo — troque goleiro por goleiro.':'Só troque o goleiro por outro goleiro.'); return; }
  // FASE 3A: a substituição entra NO MOTOR — quem entra joga com a energia/força dele já no
  // próximo minuto. FASE 3B (visitante): a decisão viaja pro mandante e o efeito volta pelo stream.
  const _um=(CL.live&&CL.live.matches||[]).find(x=>x.user&&(x.sim||x.streamRemote));
  if(_um&&_um.sim) _um.sim.applyDecision({tipo:'sub', saiPid:CL.subOut, entraPid:CL.subIn});
  else if(_um&&_um.streamRemote&&typeof NET!=='undefined'&&NET.broadcastDecision)
    NET.broadcastDecision({ k:_um.streamKey, side:(_um.h===CL.clubId?'H':'A'), decision:{tipo:'sub', saiPid:CL.subOut, entraPid:CL.subIn} });
  S.xi=(S.xi||[]).map(x=>x===CL.subOut?CL.subIn:x); CL.subsUsed=(CL.subsUsed||0)+1;
  if(outP&&inP) toastC(inP.n.split(' ').slice(-1)[0]+' entrou no lugar de '+outP.n.split(' ').slice(-1)[0]); CL.subOut=CL.subIn=null; updateLive(); }
function txtOn(hex){ return lumin(hex)>0.58?'#111':'#fff'; }
/* O PLACAR É UMA PEÇA SÓ, e ela é a da tela nova (painel escuro com dígitos
   amarelos, ver rfLvPlacarHTML). Esta função é o ponto por onde o placar é
   redesenhado a cada minuto — se ela continuasse devolvendo dois <b>, o
   primeiro tique da partida apagaria o painel que o render inicial montou. */
function liveScoreCells(m){
  if(typeof rfLvPlacarHTML==='function') return rfLvPlacarHTML(m.hg||0, m.ag||0, true);
  return `<b>${m.hg}</b><b>${m.ag}</b>`;
}
/* ---- accordion por divisão (ranking + jogos ao vivo): a divisão do usuário
   fica no topo e aberta por padrão; as outras começam colapsadas. ---- */
function divAccOpen(key,d){ const st=CL[key]; if(st && st[d]!=null) return st[d]; return d===S.division; }
function clToggleDivAcc(key,d){ if(!CL[key]){ CL[key]={}; DIV_ORDER.forEach(x=>CL[key][x]=(x===S.division)); } CL[key][d]=!CL[key][d];
  if(CL.screen==='classif') armClassifTimer();
  cdraw(); }
function divOrderUserFirst(){ return [S.division, ...DIV_ORDER.filter(d=>d!==S.division)]; }
/* AVISO DE ESPERA NO APITO. Sem ele o jogador clicava "Entrar em campo" e ficava olhando uma tela
   parada, sem saber por quê — e era justamente aí que ele concluía que o jogo tinha travado. Agora
   diz o que está acontecendo e mostra o cronômetro da sala, que é o que força a entrada de todos
   quando zera. Vale pros dois lados: quem segura o apito (mandante) e quem espera a transmissão. */
function kickoffWaitHTML(RL){
  if(!CL.online || !RL || RL.done) return '';
  const m=(RL.matches||[])[0]; if(!m || !m.user) return '';
  const segurando=!!kickoffWaitingMatch(RL);
  const esperandoStream=!!(m.streamRemote && !m.streamDone && !m.streamDead && !(m.events||[]).length);
  if(!segurando && !esperandoStream) return '';
  const opp=kickoffPartnerOf(m); if(!opp) return '';
  const room=(typeof NET!=='undefined')?NET.room:null;
  const dl=(room && room.deadline)||0;
  const secs = dl>0 ? Math.max(0, Math.ceil((dl-Date.now())/1000))
                    : Math.max(0, Math.ceil((KICKOFF_MAX_WAIT_MS-(nowMs()-(RL._kickSince||nowMs())))/1000));
  const nome=(CL.humans&&CL.humans[opp])||((clubOf(opp)||{}).short)||'o adversário';
  return `<div class="cl-kickwait">
    <span class="cl-kickwait-spin">⏳</span>
    <span class="cl-kickwait-t">Aguardando <b>${escC(nome)}</b> entrar em campo</span>
    <span class="cl-kickwait-c">${secs}s</span>
    <span class="cl-kickwait-sub">Quando o cronômetro zerar, a partida começa de qualquer forma.</span>
  </div>`;
}
function scLive(){ const RL=CL.live; if(!RL) return '';
  // PARTIDA AO VIVO: a tela nova desenha TODOS os casos, inclusive pênaltis,
  // prorrogação e partida avulsa de copa. Não há caminho de volta pro desenho
  // antigo — ele não deve reaparecer em nenhuma situação de borda.
  return rfLiveHTML(RL);
  const rowHTML=(m,i)=>{const hc=clubOf(m.h),ac=clubOf(m.a);
    return `<div class="cl-lrow" onclick="liveRowClick(${i})">
      <span class="cl-latt">${grp(m.att)}</span>
      <span class="cl-lteam" style="${clubStripe(hc)}">${escC(hc.short)}</span>
      <span class="cl-lsc" id="cl-lm-${i}">${liveScoreCells(m)}</span>
      <span class="cl-lteam" style="${clubStripe(ac)}">${escC(ac.short)}</span>
      <span class="cl-lgoal" id="cl-lg-${i}"></span></div>`;};
  // partida(s) de copa: lista simples (não tem divisão A/B/C/D pra agrupar) — cobre tanto
  // a partida própria do usuário (uma só, modal abre sozinho) quanto o modo espectador
  // (várias partidas simultâneas da mesma rodada, nenhuma do usuário — ver startCupSpectate).
  // divisão do usuário no topo e aberta; as demais colapsadas por padrão (accordion)
  const single = RL.cup || RL.humanSeat; // partida avulsa (copa OU assento hotseat) — lista simples, sem accordion por divisão do universo primário
  const groups = single
    ? `<div class="cl-live-div open"><div class="cl-live-div-body">${RL.matches.map((m,i)=>rowHTML(m,i)).join('')}</div></div>`
    : divOrderUserFirst().map(d=>{
    const rows=RL.matches.map((m,i)=>({m,i})).filter(x=>(x.m.div||S.division)===d);
    if(!rows.length) return '';
    const open=divAccOpen('liveDivOpen',d); const mine=d===S.division;
    return `<fieldset class="cl-live-div ${open?'open':'collapsed'}">
      <legend onclick="clToggleDivAcc('liveDivOpen','${d}')"><span class="cl-live-legend-trophy">${divisionTrophyImg(d,18)||'🏆'}</span> ${escC(classifDivName(d))}${mine?' <span class="cl-acc-you">você</span>':''} <span class="cl-acc-arrow ${open?'':'closed'}">▾</span></legend>
      <div class="cl-live-div-body">${rows.map(x=>rowHTML(x.m,x.i)).join('')}</div>
    </fieldset>`;
  }).join('');
  // rótulo do estágio: prioriza pênaltis > prorrogação > fase normal da copa/liga
  const stageLabel = RL.pens ? '🥅 Disputa de pênaltis'
    : RL.extraStartMinute!=null ? '⏱️ Prorrogação'
    : RL.cup ? (RL.cup.stage==='group' ? 'Fase de grupos'
        : (RL.cup.bracket ? cupPhaseLabel(RL.cup.bracket.round, RL.cup.bracket.roundsTotal) : 'Fase eliminatória'))
      : null;
  // MODO CAMAROTE: interruptor no topo direito — só faz sentido quando existe partida DO USUÁRIO
  // nesta rodada (no modo espectador de copa não há jogo dele pra assistir de camarote).
  const userMatch = RL.matches.find(m=>m.user);
  const camSw = userMatch ? camSwitchHTML() : '';
  const cupTop = RL.cup ? `<div class="cl-live-cup-top">${camSw}${trophyImg(RL.cup.key,64)}
      <div class="cl-live-cup-name">${escC(COMP_DEFS[RL.cup.key].name)}</div>
      <div class="cl-live-cup-stage">${escC(stageLabel)}</div>
    </div>` : '';
  // cabeçalho da partida de assento (hotseat): nome do treinador + clube + país
  const hsTop = RL.humanSeat ? (function(){ const st=RL.humanSeat.seat; const c=clubOf(st.clubId)||{}; const fl=(typeof flagImg==='function')?flagImg(st.country):'';
    return `<div class="cl-live-cup-top">${camSw}<div class="cl-live-cup-name">${escC(st.name)} · ${escC(c.short||c.name||'')}</div>
      <div class="cl-live-cup-stage">${fl} ${escC(st.country)} · ${RL.jornada}ª Semana</div></div>`; })() : '';
  // o dia entra junto da rodada: na partida ao vivo o jogador vê que aquele jogo é de um DIA
  // (quarta de copa ou fim de semana de liga), não de um bloco de semana indistinto.
  const _liveDay = (typeof calRowDate==='function') ? calRowDate(Math.max(0,(RL.jornada||1)-1), RL.cup?(RL.cup.key||true):null) : '';
  const topLabel = `${RL.jornada}ª Semana - ${S.season}${_liveDay?' · '+_liveDay:''}`;
  const shootoutBoard = RL.pens ? shootoutScoreboardHTML(RL) : '';
  const camAberto = !!(userMatch && camOn());
  return `<div class="cl-live${camAberto?' rf-cam-open':''}">${kickoffWaitHTML(RL)}${cupTop}${hsTop}${single?'':`<div class="cl-live-top">${divisionTrophyImg(S.division,20)} ${topLabel}${camSw}</div>`}
    ${RL.pens ? '' : `<div class="cl-live-clock" id="cl-liveclock" style="--pct:${liveClockPct(RL)}">${RL.extraStartMinute!=null?'<span class="cl-live-clock-lbl">PRORR.</span>':''}</div>`}
    ${shootoutBoard}
    ${groups}
    ${rfAdEspaco('rf98.live.inline',{cls:'rf-ad-inline',formato:'970×90'})}
    ${camAberto?camaroteHTML(userMatch):''}
    ${RL.sel!=null?`<div class="cl-live-overlay"><div class="cl-live-modal" id="cl-livemodal">${liveModalHTML(RL.matches[RL.sel])}</div></div>`:''}
  </div>`;
}
/* ===================================================================
   MODO CAMAROTE — a rodada inteira continua rolando ao fundo, mas o
   usuário assiste SÓ à partida dele, em tela cheia, com narração ao vivo,
   barra de pressão e estatística do jogo. É uma VISUALIZAÇÃO: não muda o
   motor, não muda o resultado — lê os mesmos eventos que alimentam o
   placar e a súmula (ver commentary.js). O interruptor no topo direito
   alterna entre a visão de tabela (todos os jogos da rodada) e o Camarote,
   e a escolha fica guardada pras próximas rodadas.
   =================================================================== */
const CAM_TATICA={retranca:'Retranca',equilibrado:'Equilibrado',ofensivo:'Ofensivo'};
/* ---- LIMITE DE VELOCIDADE ----
   O Camarote é feito pra ACOMPANHAR o jogo: narração linha a linha, barra de pressão reagindo,
   placar mudando. No 'Usain Bolt' (37ms/minuto) a partida inteira acaba em ~3,5s — não dá tempo
   de ler uma linha sequer, e a barra de pressão vira um borrão. Então o modo só fica disponível
   até 'Ultrassônico' (110ms/minuto, ~10s de partida), que é o piso do que ainda é assistível.
   Vale pros dois modos: no solo lê a opção local, na Resenha lê o ritmo do anfitrião. */
function camTempoMs(){
  if(CL.online) return TEMPO_MS['Usain Bolt']/roundSpeedMult();
  return TEMPO_MS[tempoLabelAtual()]||TEMPO_MS[TEMPO_DEFAULT];
}
// tolerância de 1ms: o ritmo online vem de uma divisão (37/mult) e pode cair em 109.9999
function camSpeedOk(){ return camTempoMs() >= (TEMPO_MS['Ultrassônico']-1); }
/* preferência do usuário (guardada) E velocidade compatível. A preferência NÃO é apagada quando
   a velocidade bloqueia — quem jogava de camarote volta a ele sozinho ao baixar o ritmo. */
/* O CAMAROTE É A VISÃO PADRÃO. A grade de placares de todas as divisões é um painel de controle:
   serve pra acompanhar a rodada inteira, mas não conta a SUA partida — e é ela que o treinador
   veio ver. Agora a rodada abre no Camarote (relógio, narração, pressão e estatística do seu
   jogo) e o interruptor leva pra grade quando ele quiser ver o resto.
   O estado continua vivendo na PRÓPRIA rodada (RL.camarote), não em CL nem no localStorage: é
   uma escolha daquela rodada, não uma preferência que gruda. `undefined` = padrão (ligado);
   quem desliga grava `false` e volta pra grade só naquela rodada. */
function camOn(){ const RL=CL.live; return !!(RL && RL.camarote!==false) && camSpeedOk(); }
function camMatch(){ const RL=CL.live; return RL ? (RL.matches||[]).find(m=>m.user) : null; }
function camToggle(){ if(!camSpeedOk()){ toastC(camSpeedHint()); return; }   // trancado pela velocidade
  const RL=CL.live; if(!RL) return;
  RL.camarote=!camOn(); cdraw();
  /* O RELOGIO TEM DE CONTINUAR A ANDAR AO TROCAR DE MODO. camToggle so mudava
     a bandeira e redesenhava — nao mexia no temporizador. E liveTick NAO SE
     REAGENDA quando sai cedo (done/paused/userPaused): basta a cadeia morrer
     uma vez para o relogio parar de vez, e ai so um clique que por acaso
     chamasse o tique e que o fazia andar. Era o relatado: sair do Camarote
     para "ver todos os jogos" e o cronometro ficar parado, avancando so ao
     clicar. Aqui a cadeia e sempre devolvida. */
  liveRetomaRelogio(); }
/* ---- devolve a batida do relogio se ela tiver morrido ----
   Chamar isto e sempre seguro: se a partida acabou ou esta pausada de
   proposito, nao faz nada; e o clearTimeout antes evita duas cadeias a correr
   ao mesmo tempo, que fariam o minuto saltar de dois em dois. */
function liveRetomaRelogio(){
  const RL=CL.live;
  if(!RL || RL.done || RL.paused || RL.userPaused) return;
  clearTimeout(CL._liveTimer);
  CL._liveTimer=setTimeout(liveTick,200);
}
/* ---- O CAO DE GUARDA DO RELOGIO ----
   `liveRetomaRelogio` ja' existia, mas so' era chamado por UM botao: o de
   entrar e sair do Camarote. E a cadeia do tique nao se reagenda quando
   `liveTick` sai cedo — basta ela morrer uma vez para o cronometro parar de
   vez. Era por isso que o relogio "voltava a andar quando eu clicava para sair
   do Camarote": aquele clique era o unico caminho de volta em toda a tela.
   As saidas por PAUSA de proposito (intervalo, modal de penalti, lesao,
   expulsao, penaltis) tem cada uma o seu retomar; o que nao tinha dono era o
   caso em que a pausa e' levantada e ninguem reagenda. Este relogio de parede
   bate a cada segundo e devolve a cadeia se ela estiver morta ha' mais de
   1,5s sem que ninguem tenha pedido pausa. Nunca acorda partida pausada nem
   terminada, entao nao atropela modal nenhum. */
function liveWatchdog(){
  clearInterval(CL._liveWD);
  CL._liveWD=setInterval(()=>{
    const RL=CL.live;
    if(!RL || RL.done){ clearInterval(CL._liveWD); CL._liveWD=null; return; }
    if(RL.paused || RL.userPaused) return;            // pausa pedida: e' para ficar parado
    if(nowMs()-(RL._tickAt||0) < 1500) return;        // cadeia viva
    console.warn('relógio da rodada parado sem pausa — cadeia devolvida pelo cão de guarda');
    liveRetomaRelogio();
  }, 1000);
}
function camSpeedHint(){
  return CL.online
    ? '🎥 Camarote indisponível: o anfitrião está no Usain Bolt. Disponível até Ultrassônico.'
    : '🎥 Camarote indisponível no Usain Bolt — mude em Opções › Tempo de jogo (até Ultrassônico).';
}
function camTab(t){ CL.camTab=t; cdraw(); }
function camBackdrop(e){ if(e && e.target===e.currentTarget) camToggle(); }
/* pausa do Camarote: SÓ no solo. No Resenha (online) o ritmo da rodada é o do anfitrião e
   todos avançam juntos — pausar localmente dessincronizaria a sala. */
function camTogglePlay(){ const RL=CL.live; if(!RL||RL.done||CL.online) return;
  { const m=camMatch(); if(m && camMatchOver(m)) return; }
  if(RL.userPaused){ RL.userPaused=false; cdraw(); CL._liveTimer=setTimeout(liveTick,200); }
  else { RL.userPaused=true; clearTimeout(CL._liveTimer); cdraw(); } }

function camEnsure(m){
  if(m._camInit) return m;
  m._camInit=1; m.narr=[]; m.pres=0; m.presBias=0; m.domH=0; m.domA=0; m._camMarks={}; m._camLastLine=0;
  m.camStats={H:{shots:0,goals:0,onTarget:0,saves:0,yellow:0,red:0,subs:0},
              A:{shots:0,goals:0,onTarget:0,saves:0,yellow:0,red:0,subs:0}};
  return m;
}
function camSeed(m){ return (m.seed!=null?m.seed:hashC(String(m.h)+'-'+String(m.a)))>>>0; }
function camCtx(m,mn){
  const hc=clubOf(m.h)||{}, ac=clubOf(m.a)||{};
  if(!m._camGk){ const gkOf=id=>{ try{ const g=(availableXI(id)||[]).find(p=>p.s==='GK'); return g?g.n:'o goleiro'; }catch(e){ return 'o goleiro'; } };
    m._camGk={H:gkOf(m.h), A:gkOf(m.a)}; }
  return { seed:camSeed(m), hShort:hc.short||hc.name||'Casa', aShort:ac.short||ac.name||'Fora',
    gk:m._camGk, hg:m.hg, ag:m.ag, att:grp(m.att||0),
    minute:(mn!=null?mn:camMinuteNow(m,CL.live)) };
}
/* ===== relógio do Camarote =====
   O relógio da RODADA (RL.minute) não serve: RL.maxMin se estende enquanto houver
   transmissão de humano aberta, então RL.minute continua correndo DEPOIS do apito final da
   partida do usuário — o Camarote marcaria 100', 110'… com o jogo dele já encerrado. Cada
   caminho tem a sua própria fonte de verdade:
     · sessão local (m.sim)      -> o relógio da própria sessão (congela sozinho no fim)
     · transmissão (streamRemote)-> o minuto do último snapshot recebido
     · replay/pré-resolvida      -> segue o da rodada e CONGELA no apito final dela
   (partida de espectador — spectate:true, user:false, sim:null — nunca chega aqui: o
   Camarote é só do jogo do usuário, ver camMatch.) */
function camSnap(m){ const s=(CL._liveStreams && m.streamKey) ? CL._liveStreams[m.streamKey] : null; return (s&&s.snap)||null; }
/* fim natural de uma partida sem relógio próprio: 90' + acréscimos já embutidos nos eventos */
function camReplayEnd(m){ const evs=m.events||[]; const last=evs.length?evs[evs.length-1].min:0; return Math.max(94,last); }
function camMatchOver(m){
  if(m.sim) return !!m.sim.done;
  if(m.streamRemote){ const st=camSnap(m); return !!(m.streamDone || m.streamDead || (st&&st.done)); }
  const RL=CL.live; if(!RL) return false;
  if(RL.done) return true;
  return (m.idx>=(m.events||[]).length) && RL.minute>=camReplayEnd(m);
}
function camMinuteNow(m,RL){
  if(m.sim) return m.sim.dispMin ? m.sim.dispMin() : m.sim.minute;
  if(m.streamRemote){ const st=camSnap(m); if(st && st.minute!=null) return st.minute; }
  if(m._camEndMin!=null) return m._camEndMin;         // replay já encerrada: relógio parado
  return RL ? RL.minute : 0;
}
/* quanto do jogo é do MANDANTE agora, em % (0..100) — é o que a barra de pressão desenha.
   Sai da pressão acumulada (eventos recentes, com decaimento) + o viés permanente de expulsão. */
/* O EQUILIBRIO DA PARTIDA — a MESMA conta que a barrinha de posse da ficha de
   estatisticas faz. Vive aqui, e nao nos dois sitios, porque as duas barras tem de
   dizer o mesmo: uma em cima a marcar 50/50 enquanto a de baixo marca 25/75 le-se
   como defeito, e era. Posse de bola quando o motor a da', dominio em campo
   enquanto ela nao existe, meio a meio antes de haver jogo. */
function camEquilibrio(m){
  const live=(m && ((m.sim&&m.sim.perf)||m.livePerf))||null;
  if(live && (live.H.poss+live.A.poss)>0){
    const t=live.H.poss+live.A.poss; return Math.round(100*live.H.poss/t);
  }
  const d=((m&&m.domH)||0)+((m&&m.domA)||0);
  if(d>0) return Math.round(100*(m.domH||0)/d);
  return 50;
}
/* A BARRA DE PRESSAO PARTE DO EQUILIBRIO, e nao do meio.
   Ela era `50 + pres/2`, e `pres` decai 13% por minuto e e' zerado abaixo de 0,5.
   Como os lances sao esparsos, ela passava a partida quase toda EXATAMENTE em
   50/50 -- um pico curto num lance e, tres ou quatro minutos depois, morta no
   meio outra vez. Medido numa partida: 50/50 aos 8', 40' e do 45' em diante,
   enquanto a posse dizia 25/75, 43/57 e 49/51.

   Agora o meio da barra e' o equilibrio da partida (a mesma conta da ficha) e a
   pressao do momento e' o DESVIO em cima disso: ela segue a barra pequena e
   continua a reagir ao lance, que era o que ela existia para mostrar. */
function camShare(m){
  const p=Math.max(-100,Math.min(100,(m.pres||0)+(m.presBias||0)));
  return Math.max(5,Math.min(95,Math.round(camEquilibrio(m)+p/2))); }
/* um evento do motor vira: linha de narração + estatística + empurrão na barra de pressão */
/* =====================================================================
   SONS DO CAMAROTE
   ---------------------------------------------------------------------
   Dez mp3 estavam em public/audio desde sempre, com nomes que descrevem o
   momento exato de cada um — e nenhuma linha de codigo apontava para a pasta.
   Eram publicados a cada deploy e nunca tocavam.

   SO' NO CAMAROTE, por decisao: e' a tela em que o utilizador esta' a ver a
   partida: no resultado seco o som seria um susto sem contexto.

   O VOLUME vive em S.config.somVol (0..1) — dentro do save, como o resto das
   preferencias. `sound` desligado cala tudo, e volume 0 tambem.

   Um audio por vez: dois eventos no mesmo minuto sobrepostos viram ruido, e o
   segundo interrompe o primeiro em vez de somar. */
const RF_SONS = {
  /* O "pode isso arnaldo" era do AMARELO, o lance mais comum do jogo — ouvia-se
     a toda a hora e nunca sobrava espaco para o resto. Passa a ser so' da
     EXPULSAO, que e' o lance que merece uma fala. Amarelo agora e' mudo. */
  cartaoVermelho:'audio/falta-cartao-amarelo-pode-isso-arnaldo.mp3',
  golContra:     'audio/olha-o-que-ele-fez-gol-contra.mp3',
  penaltiDefendido:'audio/penalti-defendido-sai-que-e-sua-tafarel.mp3',
  goleada:       'audio/acima-de-5-gols-virou-passeio-gol-da-alemanha.mp3',
  campeao:       'audio/campeao-acabou-acabou-acabou-galvao-bueno.mp3',
  dobradinha:    'audio/jogador-marcou-mais-de-1-gol-no-jogo.mp3',
  fimVitoria:    'audio/variacao-time-ganhou-encerrado.mp3',
  /* `perdeu_partida.mp3` era o apito final de uma derrota — e, como toda
     derrota o disparava, aparecia sem ligacao nenhuma com o que se via na
     tela. E' um "perdeu" seco, que so' faz sentido colado ao lance: passa a
     ser o PENALTI DESPERDICADO do utilizador, dentro do modal, no momento em
     que a bola nao entra. A derrota fica com o apito neutro. */
  penaltiPerdido:'audio/perdeu_partida.mp3',
  fimDecisivo:   'audio/final-do-jogo-decisivo-haja-coracao.mp3',
  fimNeutro:     'audio/final-do-jogo-bem-amigos-terminou.mp3'
};
let RF_SOM_ATUAL = null, RF_SOM_FILA = null, RF_SOM_FIM = 0, RF_SOM_AGENDA = null;
/* O RESPIRO. Dois momentos colados soavam como uma frase so'; e um clipe que
   comeca no instante em que o outro acaba atropela o facto que a tela ainda
   esta' a mostrar. Um segundo e meio entre falas e' o que separa "dois lances"
   de "um borrao". */
const RF_SOM_RESPIRO = 1500;
/* quanto tempo o gol fica sozinho no ar (cobre a rede + a entrada da festa) */
const RF_SOM_GOL_ESPACO = 3000;
/* Quanto vale cada momento. So' um som MAIS importante interrompe o que esta'
   a tocar; igual ou menor espera a vez. */
/* A ORDEM DE QUEM MANDA. So' um peso MAIOR interrompe o que esta' no ar; igual
   ou menor espera a vez. A escala segue a prioridade pedida: a expulsao e o
   gol vem primeiro, o apito final ganha de tudo o que e' de dentro do jogo. */
const RF_SOM_PESO = { dobradinha:2, golContra:2, cartaoVermelho:3, penaltiDefendido:3,
  penaltiPerdido:3, goleada:3, fimNeutro:4, fimVitoria:4, fimDecisivo:4, campeao:5 };
function rfSomVolume(){
  const v = (S && S.config && S.config.somVol != null) ? Number(S.config.somVol) : 0.7;
  return Math.max(0, Math.min(1, isNaN(v) ? 0.7 : v));
}
function rfSomLigado(){ return !!(S && S.config && S.config.sound); }
/* `forcar` e' o teste do controle de volume: toca mesmo fora do Camarote,
   porque ali o utilizador esta' justamente a regular o volume. */
/* ===== O SOM NAO CORTA MAIS O SOM =====
   Isto pausava o audio anterior e comecava o novo. Num ritmo rapido — e o jogo
   corre em minutos por segundo — dois momentos caem quase juntos, e o segundo
   decapitava o primeiro: na pratica ouvia-se so' um pedaco do primeiro clip de
   cada partida, quase sempre o cartao amarelo, que e' o momento mais comum.
   Era isso o "so' ouco o pode isso arnaldo".
   Agora o ritmo do jogo e' respeitado: quem esta' a tocar TERMINA, e o momento
   seguinte fica UM lugar na fila (so' um — guardar mais faria a narracao
   chegar atrasada, comentando um lance que ja' passou). So' um momento mais
   importante corta o que esta' no ar: o apito final nao espera por um cartao. */
/* ===== A PORTA DE VELOCIDADE SAIU =====
   Ela existiu por uma razao boa: os clipes duram de 2 a 10s e no ritmo padrao
   a partida inteira dura ~10s, entao as falas caiam umas por cima das outras.
   So' que a solucao certa para isso ja' foi construida entretanto — a fila com
   prioridade, o respiro de 1,5s entre falas e a janela de tres segundos em que
   o gol tem a palavra. Com essas tres, o que a porta fazia era so' emudecer o
   jogo no ritmo que toda a gente usa: no Ultrassonico nao se ouvia narracao
   nenhuma, e foi o relatado ("as narracoes nao aparecem mais").
   Agora nao ha' porta: o que regula e' a fila, que ATRASA em vez de apagar. */
function rfSomTocar(chave, forcar){
  const src = RF_SONS[chave]; if(!src) return;
  if(!forcar && !rfSomLigado()) return;
  const vol = rfSomVolume(); if(vol <= 0) return;
  const peso = RF_SOM_PESO[chave] || 1;
  if(RF_SOM_ATUAL && !RF_SOM_ATUAL.ended && !forcar){
    if(peso <= (RF_SOM_ATUAL._rfPeso || 1)){
      /* a fila guarda o mais importante que chegou enquanto o outro tocava */
      if(!RF_SOM_FILA || peso > (RF_SOM_FILA.peso || 1)) RF_SOM_FILA = { chave, peso };
      return;
    }
  }
  /* ===== O GOL TEM A PALAVRA POR TRES SEGUNDOS =====
     A bola na rede, a festa e a linha do gol sao o momento; uma fala que
     comeca por cima deles rouba os tres o mesmo espaco. Qualquer narracao que
     chegue nesta janela espera o fim dela — menos o apito final, que nunca
     espera por nada (peso 4). */
  const esperaGol = forcar ? 0 : RF_SOM_GOL_ESPACO - (Date.now() - RF_TORCIDA_GOL);
  /* acabou de tocar agora mesmo: espera o respiro em vez de emendar */
  const respiro = forcar ? 0 : RF_SOM_RESPIRO - (Date.now() - RF_SOM_FIM);
  const falta = (peso >= 4) ? respiro : Math.max(respiro, esperaGol);
  if(falta > 0){
    if(!RF_SOM_FILA || peso > (RF_SOM_FILA.peso || 1)) RF_SOM_FILA = { chave, peso };
    if(!RF_SOM_AGENDA) RF_SOM_AGENDA = setTimeout(rfSomDaFila, falta);
    return;
  }
  rfSomTocarJa(chave, src, vol, peso);
}
function rfSomDaFila(){
  RF_SOM_AGENDA = null;
  const q = RF_SOM_FILA; RF_SOM_FILA = null;
  if(!q || (RF_SOM_ATUAL && !RF_SOM_ATUAL.ended)) return;
  rfSomTocarJa(q.chave, RF_SONS[q.chave], rfSomVolume(), q.peso);
}
/* TETO DE DURACAO — NENHUM CLIPE PASSA DO APITO FINAL.
   `final-do-jogo-bem-amigos-terminou` tinha 9,2 s enquanto os irmaos dele -- os
   outros fins de partida -- tem entre 1,9 e 2,9 s. A narracao seguia a falar muito
   depois de a tela ja' ter mudado. O ficheiro foi cortado para 3,4 s, na pausa
   natural da fala, mas o CORTE DO FICHEIRO nao e' regra: o proximo clipe que
   alguem pousar na pasta pode voltar a ser comprido. Este teto e' a regra --
   4 segundos, com meio segundo de esvanecimento para nao ser um corte seco.
   Vale para todos: nenhum momento do jogo merece mais tempo do que o apito. */
const RF_SOM_TETO_MS = 4000, RF_SOM_FADE_MS = 500;
function rfSomTocarJa(chave, src, vol, peso){
  try{
    if(RF_SOM_ATUAL){ RF_SOM_ATUAL.onended=null; RF_SOM_ATUAL.pause();
      if(RF_SOM_ATUAL._rfCorte) clearTimeout(RF_SOM_ATUAL._rfCorte);
      RF_SOM_ATUAL = null; }
    const a = new Audio(src); a.volume = vol; a._rfPeso = peso;
    /* o corte comeca antes do teto: primeiro baixa, depois pausa -- e so' age se o
       clipe de facto passar do tempo, entao um clipe curto nunca e' tocado nisto */
    a._rfCorte = setTimeout(() => {
      if(a.ended || a.paused) return;
      const passo = 50, quedas = Math.max(1, Math.round(RF_SOM_FADE_MS/passo));
      let n = 0;
      const baixar = setInterval(() => {
        n++; try{ a.volume = Math.max(0, vol*(1 - n/quedas)); }catch(e){}
        if(n >= quedas){ clearInterval(baixar);
          try{ a.pause(); }catch(e){}
          if(a.onended) a.onended();
        }
      }, passo);
    }, Math.max(0, RF_SOM_TETO_MS - RF_SOM_FADE_MS));
    a.onended = () => {
      if(a._rfCorte){ clearTimeout(a._rfCorte); a._rfCorte = null; }
      if(RF_SOM_ATUAL === a) RF_SOM_ATUAL = null;
      RF_SOM_FIM = Date.now();
      if(RF_SOM_FILA && !RF_SOM_AGENDA) RF_SOM_AGENDA = setTimeout(rfSomDaFila, RF_SOM_RESPIRO);
    };
    /* navegador recusa audio sem gesto do utilizador; a promessa rejeitada nao
       pode subir e derrubar o tique da partida */
    const pr = a.play(); if(pr && pr.catch) pr.catch(()=>{ a.onended=null; if(RF_SOM_ATUAL===a) RF_SOM_ATUAL=null; });
    RF_SOM_ATUAL = a;
  }catch(err){}
}

/* =====================================================================
   AMBIENTE DO CAMAROTE — TORCIDA E APITO
   ---------------------------------------------------------------------
   Nao ha' ficheiro para isto: a pasta audio/ tem os dez clipes de narracao e
   mais nada. Em vez de pedir dois MP3 novos (e mais peso em cada carregamento)
   os dois sao SINTETIZADOS com a Web Audio API:
     · torcida = ruido filtrado num passa-banda grave, com a intensidade a
       oscilar devagar — e' o que o ouvido le' como multidao ao longe;
     · apito   = duas ondas quase afinadas perto dos 2,8 kHz com um trinado
       rapido por cima, que e' a assinatura do apito de arbitro.
   Ao contrario da narracao, estes NAO dependem do ritmo do jogo: sao curtos e
   nao ha' nada para acompanhar neles.
   Se um dia entrarem gravacoes de verdade, e' so' trocar o corpo destas duas
   funcoes — o resto do jogo chama por nome. */
let RF_AC = null;
function rfAudioCtx(){
  try{
    const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null;
    if(!RF_AC) RF_AC = new AC();
    if(RF_AC.state === 'suspended') RF_AC.resume().catch(()=>{});
    return RF_AC;
  }catch(err){ return null; }
}
/* o apito: 1 sopro no inicio, 2 no intervalo, 3 longos no fim */
function rfApito(vezes, longo){
  if(!rfSomLigado()) return;
  const ac = rfAudioCtx(); if(!ac) return;
  const vol = rfSomVolume(); if(vol <= 0) return;
  const dur = longo ? 0.42 : 0.20, gap = dur + 0.12;
  for(let i = 0; i < (vezes||1); i++){
    const t0 = ac.currentTime + i*gap;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.22*vol, t0+0.02);
    g.gain.setValueAtTime(0.22*vol, t0+dur-0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    g.connect(ac.destination);
    /* o TRINADO e' o que distingue um apito de um bip: uma oscilacao rapida
       na frequencia das duas ondas. */
    const lfo = ac.createOscillator(), lfoG = ac.createGain();
    lfo.frequency.value = 26; lfoG.gain.value = 90; lfo.connect(lfoG);
    [2760, 2810].forEach(f => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      lfoG.connect(o.frequency); o.connect(g); o.start(t0); o.stop(t0+dur+0.02);
    });
    lfo.start(t0); lfo.stop(t0+dur+0.02);
  }
}
/* ===== CAMERA LENTA NO GOL DELE =====
   O relogio NAO para — parar seria mentir sobre o que esta' a acontecer em
   campo, e a rodada tem outras partidas a correr. O que muda e' o ritmo do
   tique: durante a festa cada minuto de jogo passa a demorar tres vezes mais,
   e depois volta sozinho ao ritmo escolhido. E' o tempo de a linha da
   narracao ser lida e de a torcida chegar ao pico.
   Mora em `CL` e nao na rodada porque e' uma coisa da TELA, nao do jogo: o
   resultado e a sincronia nao mudam por causa disto (ver o piso de ritmo em
   onlineTickFloorMs, que continua a mandar na transmissao). */
const CAM_LENTO_MS = 4200, CAM_LENTO_MULT = 3;
function camCelebrar(){
  if(typeof camOn!=='function' || !camOn()) return;
  CL._golLentoAte = nowMs() + CAM_LENTO_MS;
}
function camLentoAtivo(){ return !!(CL._golLentoAte && nowMs() < CL._golLentoAte); }

/* ===== A TORCIDA PRECISA DE GRAVACAO, NAO DE SINTESE =====
   A versao sintetizada (ruido rosa num passa-banda grave) soava a MAR, nao a
   estadio — e faz sentido: uma multidao nao e' ruido continuo, e' milhares de
   vozes com ataque, palmas e cantos, coisa que ruido filtrado nao imita. Em
   vez de insistir na sintese, o codigo passa a esperar um ficheiro.

   Basta pousar `public/audio/torcida-estadio.mp3` (qualquer coisa entre 30s e
   2min, que entra em ciclo) e o estadio volta sozinho — sem tocar em codigo.
   Enquanto o ficheiro nao existir, tudo isto e' silencio: o `onerror` desarma
   e nada mais tenta. E' por isso que o GOL esta' mudo por agora — o rugido era
   feito do mesmo ruido. */
const RF_TORCIDA_SRC = 'audio/torcida-estadio.mp3';
const RF_TORCIDA_BASE = 0.34;   // fracao do volume do save, com o jogo a correr
let RF_TORCIDA = null, RF_TORCIDA_SEM = false, RF_TORCIDA_GOL = 0;
function rfTorcidaLigar(){
  if(RF_TORCIDA || RF_TORCIDA_SEM || !rfSomLigado()) return;
  const vol = rfSomVolume(); if(vol <= 0) return;
  try{
    const a = new Audio(RF_TORCIDA_SRC);
    /* ENTRA A SUBIR. O estadio a aparecer do nada, ja' no volume final, soa a
       um botao ligado — e o apito inicial toca justamente por cima disto. */
    a.loop = true; a.volume = 0;
    a.onerror = () => { RF_TORCIDA_SEM = true; RF_TORCIDA = null; };
    const pr = a.play(); if(pr && pr.catch) pr.catch(()=>{});
    RF_TORCIDA = a;
    rfFade(a, 0, RF_TORCIDA_BASE * vol, 1400);
  }catch(err){ RF_TORCIDA_SEM = true; }
}
/* ===== O GOL SAO DOIS SONS EMENDADOS =====
   Primeiro a bola na rede — seco, imediato, e' o instante do gol —, e dois
   segundos depois a torcida sobe. Essa ordem e' o que o ouvido espera: no
   estadio o barulho vem DEPOIS do lance, nunca junto.
   A trava de 2,5s vive aqui, na entrada, e nao em cada metade: o gol de
   penalti chega por dois caminhos (a revelacao do modal e o laco que consome
   o evento) e sem ela sairiam duas bolas na rede e dois rugidos. */
const RF_GOL_REDE = 'audio/gol-bola-na-rede.mp3';
/* A FESTA E' UMA GRAVACAO PROPRIA, nao o fundo levantado. Levantar o volume do
   ciclo de fundo dava um estadio mais ALTO, nao um estadio a FESTEJAR — e a
   diferenca entre as duas coisas e' exactamente o gol. Entra emendada na bola
   na rede, e so' no gol DELE: o estadio nao explode quando se sofre. */
const RF_GOL_FESTA = 'audio/torcida-gol-festa.mp3';
/* O CHUTE E' O QUE VEM ANTES. Ele nao e' um momento por si: e' o instante que
   antecede o desfecho — a bola para fora, a defesa, ou a rede. Por isso entra
   como entrada de outra coisa, nunca sozinho, e SO' AS VEZES: sair em toda a
   finalizacao daria um metronomo, e o que se quer e' variacao. */
const RF_CHUTE_SRC = 'audio/chute-forte.mp3';
const RF_CHUTE_CHANCE = 0.5;    // metade das finalizacoes ganha a entrada
const RF_CHUTE_ANTES = 620;     // quanto o desfecho espera pelo chute
const RF_GOL_ATRASO = 2000;   // da rede ate' a torcida subir
function rfChute(){
  const vol = rfSomVolume(); if(vol <= 0) return;
  try{
    const a = new Audio(RF_CHUTE_SRC); a.volume = Math.min(1, 0.9*vol);
    const pr = a.play(); if(pr && pr.catch) pr.catch(()=>{});
  }catch(err){}
}
/* O GOL DELE E O GOL DO ADVERSARIO NAO SAO O MESMO ACONTECIMENTO. Sair os dois
   com o mesmo rugido e a mesma duracao achatava justamente o momento que a
   pessoa veio ver. O gol do utilizador tem festa mais alta e mais longa; o do
   adversario e' curto, so' o suficiente para se perceber que a bola entrou. */
function rfGolSom(meu){
  if(!rfSomLigado()) return;
  if(Date.now() - RF_TORCIDA_GOL < 2500) return;
  RF_TORCIDA_GOL = Date.now();
  const vol = rfSomVolume(); if(vol <= 0) return;
  const rede = () => {
    try{
      const a = new Audio(RF_GOL_REDE); a.volume = Math.min(1, 0.9*vol);
      const pr = a.play(); if(pr && pr.catch) pr.catch(()=>{});
    }catch(err){}
    /* a torcida entra por cima, sem esperar que a rede acabe — sao camadas do
       mesmo momento, nao uma fila */
    setTimeout(() => {
      if(meu) rfGolFesta();
      else rfTorcidaGol(false);   // gol sofrido: so' um levantar breve do fundo
    }, RF_GOL_ATRASO);
  };
  /* SEM CHUTE POSTICO AQUI. `gol-bola-na-rede.mp3` nao e' so' a rede: medido, o
     ficheiro tem DOIS impactos — um pico a 0,1s (a bola a ser batida) e outro
     a 0,9s (a rede). Ou seja, ele ja' e' a sequencia chute→gol inteira.
     Pôr o `chute-forte` a' frente dava tres impactos: o meu, o dele, e a rede —
     e era o "chute a mais depois da bola bater na rede" que se ouvia.
     O `chute-forte` continua a existir para a finalizacao QUE NAO E' GOL, onde
     o "uuuh" da arquibancada nao traz impacto nenhum consigo. */
  rede();
}
/* a festa, com o fundo a dar-lhe espaco: sem isto o ciclo de 39s continua no
   mesmo nivel por baixo e as duas multidoes brigam pelo mesmo lugar.
   A gravacao tem 5s, mas nao se usa inteira: entra a subir, fica no alto o
   tempo da animacao da linha, e sai a descer. Cortar a seco no fim de um
   coro de multidao e' o que mais se ouve como defeito. */
/* Menos dois segundos: eram 3,4s de ponta a ponta, ficam 1,4s. O que sobra e'
   quase so' rampa — e' de proposito, porque o que faz o gol nesta altura ja'
   nao e' o comprimento do coro, e' a linha a piscar e o relogio em camera
   lenta por tras dele. */
const RF_FESTA_ENTRA = 400, RF_FESTA_DURA = 400, RF_FESTA_SAI = 600;
let RF_FESTA = null;
function rfGolFesta(){
  const vol = rfSomVolume(); if(vol <= 0) return;
  try{
    if(RF_FESTA){ clearTimeout(RF_FESTA._rfFim); clearInterval(RF_FESTA._rfFade);
                  try{ RF_FESTA.pause(); }catch(e){} }
    const a = new Audio(RF_GOL_FESTA); a.volume = 0;
    const pr = a.play(); if(pr && pr.catch) pr.catch(()=>{});
    RF_FESTA = a;
    rfFade(a, 0, Math.min(1, vol), RF_FESTA_ENTRA);
    a._rfFim = setTimeout(() => {
      if(RF_FESTA !== a) return;
      rfFade(a, a.volume, 0, RF_FESTA_SAI, () => { try{ a.pause(); }catch(e){} });
    }, RF_FESTA_ENTRA + RF_FESTA_DURA);
  }catch(err){}
  /* o fundo volta quando a festa ja' saiu, nao antes */
  rfTorcidaAbafar(0.55, RF_FESTA_ENTRA + RF_FESTA_DURA + RF_FESTA_SAI);
}
/* baixa o fundo por um tempo e devolve-o sozinho */
function rfTorcidaAbafar(k, ms){
  const a = RF_TORCIDA; if(!a) return;
  clearInterval(a._rfRampa);
  clearTimeout(a._rfVolta);
  const base = RF_TORCIDA_BASE * rfSomVolume();
  rfFade(a, a.volume, base*k, 400);
  a._rfVolta = setTimeout(() => {
    if(RF_TORCIDA !== a) return;
    rfFade(a, a.volume, RF_TORCIDA_BASE * rfSomVolume(), 1200);
  }, ms);
}
/* o rugido do gol: sobe depressa e desce devagar. Sem `AudioParam` aqui — e'
   um elemento <audio>, entao a rampa e' feita a mao, de 60 em 60ms.
   Sem trava propria: quem controla a repeticao e' o `rfGolSom`, a entrada. */
function rfTorcidaGol(meu){
  if(!RF_TORCIDA) return;
  const a = RF_TORCIDA, vol = rfSomVolume();
  const base = RF_TORCIDA_BASE * vol;
  const alto = Math.min(1, (meu ? 1.0 : 0.72) * vol);
  const segura = meu ? 4.5 : 1.6;   // quanto tempo a festa fica no alto
  const desce  = meu ? 8   : 3.5;   // e quanto demora a assentar
  clearInterval(a._rfRampa); clearInterval(a._rfFade);
  let t = 0;
  a._rfRampa = setInterval(() => {
    t += 0.06;
    if(RF_TORCIDA !== a){ clearInterval(a._rfRampa); return; }
    const k = t < 0.4 ? (t/0.4)                             // sobe em 0,4s
            : t < segura ? 1                                // segura
            : Math.max(0, 1 - (t-segura)/desce);            // e assenta
    a.volume = Math.min(1, base + (alto-base)*k);
    if(t > segura+desce+0.2){ clearInterval(a._rfRampa); a.volume = base; }
  }, 60);
}
/* ===== O "UUUH" DA ARQUIBANCADA =====
   Defesa do goleiro, bola na trave, chute para fora — os tres desfechos de uma
   finalizacao que nao virou gol (ver chanceOutcome, no motor). E' reacao de
   torcida, nao narracao: entra por cima do que estiver a tocar e nao espera
   pelo ritmo lento, como o gol.
   O que ele PRECISA e' de intervalo proprio. Finalizacao e' o evento mais
   comum depois do passe, e no ritmo rapido sairiam varios por segundo — seis
   segundos entre um e outro e' o que separa "o estadio reagiu" de metralhadora. */
const RF_QUASE_SRC = 'audio/torcida-quase-gol.mp3';
const RF_QUASE_INTERVALO = 6000;
let RF_QUASE_EM = 0;
function rfQuaseGol(){
  if(!rfSomLigado()) return;
  if(Date.now() - RF_QUASE_EM < RF_QUASE_INTERVALO) return;
  /* nao se sobrepoe a' festa do gol: la' o estadio ja' esta' de pe' */
  if(Date.now() - RF_TORCIDA_GOL < 6000) return;
  /* a TRAVA E' DA FINALIZACAO INTEIRA, nao do "uuuh": marcada aqui, antes de
     decidir a entrada, para o chute nao sair mais vezes do que o desfecho */
  RF_QUASE_EM = Date.now();
  if(Math.random() < RF_CHUTE_CHANCE){ rfChute(); setTimeout(rfUuuh, RF_CHUTE_ANTES); }
  else rfUuuh();
}
function rfUuuh(){
  const vol = rfSomVolume(); if(vol <= 0) return;
  try{
    const a = new Audio(RF_QUASE_SRC); a.volume = Math.min(1, 0.85*vol);
    const pr = a.play(); if(pr && pr.catch) pr.catch(()=>{});
  }catch(err){}
}
function rfTorcidaDesligar(){
  const a = RF_TORCIDA; if(!a) return;
  RF_TORCIDA = null;
  clearInterval(a._rfRampa); clearTimeout(a._rfVolta);
  /* desvanece em vez de cortar: um loop que para a seco assusta. Mais longo do
     que a entrada — o estadio esvazia devagar, e o apito final esta' por cima. */
  rfFade(a, a.volume, 0, 2200, () => { try{ a.pause(); }catch(e){} });
}

function camOnEvent(m,e){
  if(typeof RF_NARRA==='undefined') return;
  camEnsure(m); const ctx=camCtx(m);
  const A=e.side==='H'?m.camStats.H:m.camStats.A, D=e.side==='H'?m.camStats.A:m.camStats.H;
  let out=null;
  if(e.type==='gol'){ A.shots++; A.goals++; A.onTarget++; }
  else if(e.type==='penalti'){ A.shots++;
    if(e.scored){ A.goals++; A.onTarget++; }
    else { out=RF_NARRA.chanceOutcome(e,ctx.seed); if(out==='defesa'){ A.onTarget++; D.saves++; } } }
  else if(e.type==='chance'){ A.shots++; out=RF_NARRA.chanceOutcome(e,ctx.seed);
    if(out==='defesa'){ A.onTarget++; D.saves++; } }
  else if(e.type==='cartao'){ if(e.cardType==='vermelho'){ A.red++; m.presBias+=(e.side==='H'?-8:8); } else A.yellow++; }
  else if(e.type==='sub'){ A.subs++; }
  rfSomDoEvento(m,e,out);
  const l=RF_NARRA.narrate(e,{...ctx,out});
  if(l){ m.narr.push({min:e.min,icon:l.icon,text:l.text,kind:l.kind,side:e.side}); m._camLastLine=e.min; }
  m.pres=Math.max(-100,Math.min(100,(m.pres||0)+RF_NARRA.pressureOf(e,out)));
}
/* Cada som dispara UMA vez por partida (m._camSons): a goleada continuaria a
   valer a cada gol depois do quinto, e o mesmo artilheiro marcando tres vezes
   repetiria o audio da dobradinha. */
function rfSomDoEvento(m,e,out){
  if(!camOn()) return;
  m._camSons = m._camSons || {};
  const soar = chave => { if(m._camSons[chave]) return; m._camSons[chave]=1; rfSomTocar(chave); };
  if(e.type==='cartao' && e.cardType==='vermelho') soar('cartaoVermelho');
  /* O TAFAREL E' DO MEU GOLEIRO. Isto tocava em qualquer penalti defendido,
     inclusive num que o MEU time desperdicava — festejar a defesa contra mim.
     So' vale quando quem bateu foi o adversario. */
  /* finalizacao que nao virou gol: defesa, trave ou para fora */
  if(e.type==='chance' && (out==='defesa'||out==='trave'||out==='fora')) rfQuaseGol();
  else if(e.type==='penalti' && !e.scored && out==='defesa'){
    const meuLado = (m.h===CL.clubId) ? 'H' : (m.a===CL.clubId ? 'A' : null);
    if(meuLado && e.side!==meuLado) soar('penaltiDefendido');
  }
  if(e.type==='gol' || (e.type==='penalti' && e.scored)){
    const meuLado = (m.h===CL.clubId) ? 'H' : (m.a===CL.clubId ? 'A' : null);
    const meu = !!meuLado && e.side===meuLado;
    rfGolSom(meu);   // bola na rede + estadio: barulho, nao fala — vale em qualquer ritmo
    if(meu) camCelebrar();
    if(((m.hg||0)+(m.ag||0)) >= 5) soar('goleada');
    /* dobradinha: o mesmo nome marcando pela segunda vez nesta partida */
    const meus=(m.goals||[]).filter(g=>g.scorer && g.scorer===e.scorer);
    if(meus.length >= 2) soar('dobradinha');
  }
}
/* DECISIVO = final de mata-mata. A partida ao vivo nao guarda `fase`, mas
   guarda `div`, que nas copas E' a chave da copa — e dali o estado do
   chaveamento responde. E' o MESMO teste do motor (isFinal em core.js): sem
   rodadas restantes, e' a final. Liga cai fora sozinha, porque 'A'..'D' nao
   existem em S.cups. */
function rfSomFinalDeCopa(m){
  if(!m || !m.div || typeof S==='undefined' || !S || !S.cups) return false;
  const c=S.cups[m.div]; if(!c) return false;             // div de liga ('A'..'D') nao esta' em cups
  const b = (m.div==='copaBrasil') ? c : c.bracket;
  if(!b || b.roundsTotal==null || b.round==null) return false;
  return (b.roundsTotal - b.round) <= 0;                  // mesmo teste do motor (core.js isFinal)
}
function camPush(m,kind,extra,mn){
  if(typeof RF_NARRA==='undefined') return;
  if(mn==null) mn=camMinuteNow(m,CL.live);
  const l=RF_NARRA.ambient(kind,{...camCtx(m,mn),...(extra||{})});
  if(l){ m.narr.push({min:mn,icon:l.icon,text:l.text,kind:l.kind}); m._camLastLine=mn; }
}
/* batida de minuto: a pressão decai (o jogo esfria sozinho quando nada acontece), o domínio
   acumula, e as falas de ambiente entram nos marcos (apito, intervalo, acréscimos) e nas
   fases mornas — sempre lendo o estado REAL (pressão do momento + placar).
   O compasso é o MINUTO DA PARTIDA (camMinuteNow), não o da rodada: num stream o relógio
   dela anda em ritmo próprio, e depois do apito final dela a rodada ainda pode correr um
   bom tempo esperando as transmissões dos outros humanos fecharem. */
/* a primeira fala entra com o relógio ainda em zero — antes ela era escrita no primeiro tique,
   quando o cronômetro já tinha andado. Bola rolando é 0'. */
function camKickoffLine(RL){
  try{ const um=(RL&&RL.matches||[]).find(m=>m.user); if(um) camMinuteTick(um,RL); }catch(e){}
}
function camMinuteTick(m,RL){
  camEnsure(m);
  const over=camMatchOver(m);
  const mn=camMinuteNow(m,RL);
  if(over && m._camEndMin==null) m._camEndMin=mn;   // congela o relógio no apito final DELA
  const prev=(m._camTickedMin||0);
  if(mn>prev){
    // um passo de decaimento por minuto de jogo (limitado, caso um snapshot chegue com atraso)
    const steps=Math.min(8, mn-prev);
    for(let i=0;i<steps;i++){
      m.pres=(m.pres||0)*0.87;
      const p=(m.pres||0)+(m.presBias||0);
      if(p>0) m.domH++; else if(p<0) m.domA++; else { m.domH+=0.5; m.domA+=0.5; }
    }
    if(Math.abs(m.pres)<0.5) m.pres=0;
    m._camTickedMin=mn;
  }
  const mark=(k,fn)=>{ if(!m._camMarks[k]){ m._camMarks[k]=1; fn(); } };
  // O JOGO COMEÇA NO MINUTO ZERO. O apito inicial saía carimbado com o minuto em que o relógio
  // já estava (1' ou 2', dependendo de quando a tela apareceu) — a primeira linha da narração
  // nascia atrasada em relação ao lance que ela anuncia, que é a bola rolando. Bola rolando é 0'.
  /* so' a LINHA. O apito e a torcida passaram para o inicio da rodada (ver
     liveTick), porque aqui eles ja' chegavam com a bola a rolar. */
  if(mn>=0)  mark('ini',()=>camPush(m,'inicio',null,0));
  /* A TORCIDA NAO SE CALA NO INTERVALO. Ela baixava aos 45 e voltava aos 46,
     e esse vale era ouvido como uma falha do som — o estadio nao esvazia entre
     os tempos. Fica no mesmo nivel do apito inicial ao final. */
  /* O APITO DO INTERVALO NAO MORA AQUI. Este marco anda pelo relogio da
     PARTIDA (`m.sim.dispMin()`), e a pausa do intervalo anda pelo relogio da
     RODADA (`RL.minute`) — quando a sessao fica um tique atras, a pausa abre
     primeiro, o utilizador faz as substituicoes, carrega em Continuar, e so'
     entao o marco chegava aos 45 e apitava: o apito do intervalo caia com o
     segundo tempo ja' a rolar. Era exactamente o relatado. O apito passou
     para o mesmo sitio que decide o intervalo (ver liveTick), onde nao ha'
     dois relogios para discordarem. */
  if(mn>=45) mark('ht', ()=>camPush(m,'intervalo',null,mn));
  if(mn>=46) mark('h2', ()=>camPush(m,'recomeco',null,mn));
  if(mn>=91 && RL.extraStartMinute==null) mark('acr',()=>camPush(m,'acrescimos',null,mn));
  if(over) return; // apito final é responsabilidade do camEndCheck (depois dos eventos do minuto)
  // fase morna: nenhuma linha há 7 minutos -> comenta o momento do jogo (pressão/placar).
  // `avoid` é a ÚLTIMA fala de ambiente (não a última linha qualquer): com um lance no meio,
  // comparar só com a linha anterior deixava a mesma frase de ambiente voltar logo em seguida.
  /* A FASE MORNA NAO INTERROMPE A FESTA. Ela existe para preencher silencio —
     e nos segundos a seguir ao gol nao ha' silencio nenhum para preencher: ha'
     a linha do gol no topo do feed, a piscar, e o estadio de pe'. */
  if(mn-(m._camLastLine||0)>=7 && Date.now()-RF_TORCIDA_GOL >= RF_SOM_GOL_ESPACO){
    camPush(m,'momento',{share:camShare(m), avoid:m._camLastMomento||null},mn);
    m._camLastMomento=m.narr.length?m.narr[m.narr.length-1].text:null;
  }
}
/* apito final — roda DEPOIS de consumir os eventos do minuto, pra "Fim de jogo" nunca aparecer
   antes do último lance (um gol nos acréscimos, por exemplo). */
function camEndCheck(m,RL){
  camEnsure(m);
  if(!camMatchOver(m)) return;
  if(m._camEndMin==null) m._camEndMin=camMinuteNow(m,RL);
  // stream que MORREU no meio não teve apito final — não anuncia "fim de jogo" com um placar
  // que ainda não é o oficial (ver liveTick: o oficial sai na classificação).
  if(m.streamRemote && m.streamDead && !m.streamDone){
    if(!m._camMarks.fim){ m._camMarks.fim=1; camPush(m,'corte',null,m._camEndMin); }
    return;
  }
  camFinal(m,m._camEndMin);
}
function camFinal(m,mn){ camEnsure(m); if(m._camMarks.fim) return; m._camMarks.fim=1;
  if(m._camEndMin==null) m._camEndMin=(mn!=null?mn:camMinuteNow(m,CL.live));
  camPush(m,'fim',null,m._camEndMin);
  /* O APITO FINAL tem quatro vozes, e a ordem importa: decisivo ganha de
     tudo (e' o jogo que vale titulo ou acesso), depois o resultado, e o
     neutro fica para o empate. */
  liveApitoFinal(CL.live);   // se a rodada ja' apitou, isto nao repete
  {
    /* A COMEMORACAO NAO DEPENDE DO CAMAROTE, como os apitos: ela marca o fim
       da partida DELE, esteja em que tela estiver. A mesma regra da disputa de
       penaltis decide quem e' "ele" quando ha' dois humanos no ecra. */
    const lado = rfLadoDoUtilizador(m);
    if(lado){
      const meus = lado==='H' ? (m.hg||0) : (m.ag||0);
      const deles = lado==='H' ? (m.ag||0) : (m.hg||0);
      if(meus > deles) rfVitoriaSom();
    }
  }
  if(camOn()){
    const meuLado = (m.h===CL.clubId) ? 'H' : (m.a===CL.clubId ? 'A' : null);
    const meus = meuLado==='H' ? (m.hg||0) : (m.ag||0);
    const deles = meuLado==='H' ? (m.ag||0) : (m.hg||0);
    /* DECISIVO tem de ser uma pergunta que o objeto da partida saiba responder.
       `m.decisivo` nao existia — o som nunca tocaria. A resposta que existe:
       ser a FINAL de um mata-mata, que o proprio jogo ja' rotula em
       cupPhaseLabel (dist<=0 -> 'Final'). Fora da copa, o apito segue o
       resultado. */
    if(rfSomFinalDeCopa(m)) rfSomTocar('fimDecisivo');
    else if(meuLado==null || meus===deles) rfSomTocar('fimNeutro');
    else rfSomTocar(meus>deles ? 'fimVitoria' : 'fimNeutro');
  } }

/* ---- interruptor 🎥 MODO CAMAROTE (topo direito, igual ao design) ---- */
function camSwitchHTML(){
  // TRANCADO pela velocidade: o interruptor continua na tela (pra ficar claro que o modo existe e
  // POR QUE não dá pra ligar agora), só que apagado e sem alternar. Clicar explica no toast.
  if(!camSpeedOk()){
    return `<button class="rf-cam-sw dis" onclick="camToggle()" title="${escC(camSpeedHint())}">
      <span class="rf-cam-sw-lbl">🎥 MODO CAMAROTE</span>
      <span class="rf-cam-sw-track"><span class="rf-cam-sw-knob"></span></span>
      <span class="rf-cam-sw-warn">🔒 só até Ultrassônico</span>
    </button>`;
  }
  const on=camOn();
  return `<button class="rf-cam-sw ${on?'on':''}" onclick="camToggle()" title="Ver só o seu jogo, em tela cheia">
    <span class="rf-cam-sw-lbl">🎥 MODO CAMAROTE</span>
    <span class="rf-cam-sw-track"><span class="rf-cam-sw-knob"></span></span>
    <span class="rf-cam-sw-state">${on?'ON':'OFF'}</span>
  </button>`;
}
/* ---- a janela do Camarote ---- */
function camaroteHTML(m){
  // CAMAROTE PORTADO (telas/Modo Camarote). O desenho antigo não é mais
  // alcançável — a sobreposição inteira vem de rfCamHTML.
  return rfCamHTML(CL.live||{matches:[m]});
}
function camAdIdx(){ const RL=CL.live; return Math.floor(((RL&&RL.minute)||0)/8)%AD_SPONSORS.length; }
/* o botão veste as cores da marca em destaque (o relevo 98 vem do bevel de cada uma) */
function camCtaStyle(i){ const s=AD_SPONSORS[i!=null?i:camAdIdx()]; if(!s) return '';
  return `background:${s.bg};color:${s.fg};border-color:${s.bevel}`; }
/* clique no botão da marca em destaque — é o que converte pro patrocinador. Abre em aba nova
   (noopener: a página do anunciante nunca ganha handle da janela do jogo) e registra o evento no
   gtag já presente na página, pra dar número de cliques por marca. */
function camAdClick(){
  const s=AD_SPONSORS[camAdIdx()]; if(!s) return;
  try{ if(typeof gtag==='function') gtag('event','sponsor_click',{sponsor:s.nome, placement:'camarote'}); }catch(e){}
  if(!s.url){ toastC('Link do patrocinador ainda não configurado ('+s.nome+').'); return; }
  window.open(s.url,'_blank','noopener,noreferrer');
}
/* tudo que muda a cada minuto vive aqui dentro (um innerHTML só em camUpdate).
   O DESENHO é o da leva nova, em rf26-live.js — aqui fica só a ponte, porque é
   este nome que camUpdate chama. */
function camDynHTML(m){ return rfCamDynHTML(m); }
/* cores das barras (pressão e estatística): dois clubes de cor parecida — CSA × Nacional,
   dois azuis — deixavam as duas metades da barra indistinguíveis, e aí ela não informa nada.
   Quando as cores colidem, o visitante cai pra segunda cor dele e, se ainda assim colar,
   pra um contraste fixo contra o fundo navy da janela. */
function camHexRgb(h){ h=String(h||'').replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join('');
  const n=parseInt(h||'000000',16)||0; return [(n>>16)&255,(n>>8)&255,n&255]; }
function camColorDist(a,b){ const x=camHexRgb(a), y=camHexRgb(b);
  return Math.sqrt(Math.pow(x[0]-y[0],2)+Math.pow(x[1]-y[1],2)+Math.pow(x[2]-y[2],2)); }
function camBarColors(hc,ac){
  const H=clubColors(hc)||{}, A=clubColors(ac)||{};
  const colH=H.col||'#cc9a1a';
  let colA=A.col||'#1a5bb8';
  if(camColorDist(colH,colA)<110){
    if(A.col2 && camColorDist(colH,A.col2)>=110) colA=A.col2;
    else colA = camColorDist(colH,'#f0f0f0')>=110 ? '#f0f0f0' : '#1a1a1a';
  }
  return {colH,colA};
}
function camLineHTML(l){ return rfCamLinhaHTML(l); }
function camStatsHTML(m){ return rfCamStatsHTML(m); }
/* ---- atualização da janela: NO LUGAR, não redesenhando ----
   Antes isto fazia `host.innerHTML=camDynHTML(m)` a cada minuto. Recriar os nós zera as animações
   e transições: TODAS as linhas de narração re-animavam juntas (o texto piscava sem parar) e a
   barra de pressão pulava em vez de deslizar. Agora só os valores mudam, e a única coisa que
   entra no DOM é a linha NOVA — quando de fato acontece alguma coisa. Redesenho completo fica
   pra troca de aba, que é o único caso em que a estrutura muda de verdade. */
function camUpdate(){
  if(!camOn()) return; const m=camMatch(); if(!m) return;
  /* O apito inicial liga a torcida, mas ele so' toca UMA vez: quem entra no
     Camarote com o jogo a decorrer perdia o estadio para o resto da partida.
     `rfTorcidaLigar` nao faz nada se ja' estiver a tocar. */
  if(!camMatchOver(m)) rfTorcidaLigar();
  const host=document.querySelector('#rf-cam-dyn'); if(!host) return;
  const tab=CL.camTab||'panorama';
  if(host.dataset.tab!==tab || !host.querySelector('#rf-cam-lines')){
    const old=host.querySelector('#rf-cam-lines'); const sc=old?old.scrollTop:0;
    host.innerHTML=camDynHTML(m); host.dataset.tab=tab;
    const nw=host.querySelector('#rf-cam-lines'); if(nw) nw.scrollTop=sc;
  } else {
    camPatchBoard(m); camPatchFeed(m);
    const st=host.querySelector('.rf-cam-stats'); // sem animação: redesenho aqui não pisca
    if(st) st.outerHTML=camStatsHTML(m);
  }
  /* O RODÍZIO CONTA OS LUGARES QUE ESTÃO NA TELA, não os logos de casa: a banda
     do Camarote passou a ter cinco lugares vendáveis (ver RF_CAM_LOGOS em
     rf26-live.js) e AD_SPONSORS tem três — com o índice preso ao tamanho da
     lista de casa, os dois últimos lugares nunca ganhavam o destaque. */
  const ads=document.querySelectorAll('.rf-cam-ad');
  const i=ads.length?Math.floor((((CL.live&&CL.live.minute)||0))/8)%ads.length:0;
  ads.forEach((el,k)=>el.classList.toggle('on',k===i));
  /* O BOTÃO É DO PATROCINADOR EM DESTAQUE — texto, cores e destino saem do
     criativo daquele lugar (ver rfCamCtaHTML). Ele é trocado por inteiro, e não
     campo a campo, porque o lugar em destaque pode simplesmente NÃO TER botão:
     nesse caso o HTML vem vazio e o botão sai da banda até o próximo. */
  const banda=document.querySelector('.rf-cam-patro');
  if(banda && typeof rfCamCtaHTML==='function'){
    /* `i` conta as pastilhas QUE ESTAO NA TELA; o botao pertence a um LUGAR do
       inventario. Com um lugar desligado no painel os dois deixam de coincidir, e
       sem esta traducao o botao passava a ser o do patrocinador errado. */
    const lug=(typeof rfCamLugares==='function')?rfCamLugares():null;
    const k=(lug && lug.length)?(lug[i%lug.length]):i;
    const novo=rfCamCtaHTML(k), atual=banda.querySelector('.rf-cam-cta');
    const chaveAtual=atual?atual.getAttribute('data-ad-cta'):'';
    // só mexe no DOM quando muda de patrocinador: trocar a cada minuto mataria o :hover
    if(!novo && atual) atual.remove();
    else if(novo && (!atual || novo.indexOf('data-ad-cta="'+chaveAtual+'"')<0)){
      if(atual) atual.remove();
      banda.insertAdjacentHTML('beforeend', novo);
    }
  }
  // o selo "AO VIVO" mora na barra de título (fora do bloco redesenhado): apaga na mão
  // quando a partida DELE acaba — a rodada pode seguir rolando bem depois disso.
  const onair=document.querySelector('#rf-cam-onair'); if(onair) onair.hidden=camMatchOver(m);
}
/* placar, relógio, período, botão e barra de pressão — só os VALORES */
function camPatchBoard(m){
  const RL=CL.live; const set=(id,v)=>{ const el=document.querySelector(id); if(el && el.textContent!==v) el.textContent=v; };
  const mn=camMinuteNow(m,RL), over=camMatchOver(m);
  set('#rf-cam-hg', String(m.hg)); set('#rf-cam-ag', String(m.ag)); set('#rf-cam-min', mn+"'");
  // o anel do relógio anda por variável CSS — trocar o style inteiro mataria a transição
  const anel=document.querySelector('#rf-cam-anel');
  if(anel) anel.style.setProperty('--pct', String(liveClockPct(RL)));
  set('#rf-cam-period', RL.pens ? 'PÊNALTIS'
    : RL.extraStartMinute!=null ? 'PRORROGAÇÃO'
    : over ? (m.streamRemote && m.streamDead && !m.streamDone ? 'SEM SINAL' : 'ENCERRADO')
    : mn<=45 ? '1º TEMPO' : mn<=90 ? '2º TEMPO' : 'ACRÉSCIMOS');
  const sh=camShare(m);
  const h=document.querySelector('#rf-cam-presh'), a=document.querySelector('#rf-cam-presa');
  if(h) h.style.width=sh+'%';            // width muda -> a transição CSS desliza em vez de pular
  if(a) a.style.width=(100-sh)+'%';
  const hc=clubOf(m.h)||{}, ac=clubOf(m.a)||{};
  set('#rf-cam-prestag', sh>=64 ? (hc.short||'')+' PRESSIONA' : sh<=36 ? (ac.short||'')+' PRESSIONA' : 'JOGO EQUILIBRADO');
  const play=document.querySelector('.rf-cam-pausar');
  if(play){ const lbl=over?'Fim':(RL.userPaused?'▶ Jogar':'⏸ Pausar');
    if(play.textContent!==lbl) play.textContent=lbl; play.disabled=!!over; }
}
/* só as linhas NOVAS entram (no topo, que é onde a mais recente fica) */
function camPatchFeed(m){
  const box=document.querySelector('#rf-cam-lines'); if(!box) return;
  const antes=parseInt(box.dataset.n||'0',10), agora=m.narr.length;
  if(agora===antes) return;
  if(agora<antes){ box.innerHTML=m.narr.slice().reverse().map(camLineHTML).join(''); box.dataset.n=String(agora); return; }
  const vazio=box.querySelector('.rf-cam-vazio'); if(vazio) vazio.remove();
  // insere de trás pra frente pra manter a ordem (mais recente sempre no topo)
  m.narr.slice(antes).forEach(l=>{
    box.insertAdjacentHTML('afterbegin', camLineHTML(l));
    /* A FESTA E' SO' DA LINHA NOVA. `k-gol` ja' significa "gol dele" (ver
       rfCamLinhaHTML), mas a classe fica na linha para sempre — animar por ela
       faria o feed inteiro re-festejar a cada troca de aba, que e' quando o
       bloco e' redesenhado. `celebra` so' e' posta aqui, no instante em que a
       linha entra, e por isso anima uma vez so'. */
    const nova = box.firstElementChild;
    if(nova && nova.classList.contains('k-gol')) nova.classList.add('celebra');
  });
  box.dataset.n=String(agora);
}

/* % do relógio circular — a prorrogação usa uma escala PRÓPRIA (34min: 30 + acréscimos),
   proporcional ao tempo real dela, em vez da escala de 94min do tempo normal.
   O 94 fixo era outra coordenada solta: o anel fechava aos 94 numa rodada que apitava aos 92
   (e ficava a 97% numa que ia até lá). A escala passa a ser o FIM DE VERDADE desta rodada — o
   mesmo teto que manda o apito (ver liveTetoMin). */
function liveClockPct(RL){
  if(RL.extraStartMinute!=null) return Math.min(100, Math.round((RL.minute-RL.extraStartMinute)/34*100));
  const fim=(typeof liveTetoMin==='function')?liveTetoMin(RL):94;
  return Math.min(100, Math.round(RL.minute/Math.max(1,fim)*100));
}
/* placar da disputa de pênaltis: uma linha de bolinhas por time, ✔ verde quando converte,
   ✖ vermelho quando desperdiça/defende — cresce cobrança a cobrança, igual ao clássico. */
/* O PLACAR COMPACTO NAO PODE SER A TELA INTEIRA. Isto devolvia rfDisputaHTML -- um
   rfOverlay de ecra cheio -- e quem chama embutia o resultado DENTRO de outro modal
   (escolha do batedor, suspense, revelacao). Overlay dentro de overlay: o de dentro
   tapava o de fora em todas as fases, e a disputa parecia congelada numa tela so.
   Agora a tela cheia da disputa e desenhada por shootoutPickerHTML, uma vez so, e
   este continua a ser apenas a fita de bolinhas do caminho antigo. */
function shootoutScoreboardHTML(RL){
  return shootoutScoreboardHTMLLegado(RL);
}
function shootoutScoreboardHTMLLegado(RL){
  const m=RL.matches[0], hc=clubOf(m.h), ac=clubOf(m.a);
  const dot=k=>`<span class="cl-pens-dot ${k.scored?'ok':'miss'}">${k.scored?'✔':'✖'}</span>`;
  return `<div class="cl-pens-board">
    <div class="cl-pens-row"><span class="cl-pens-team" style="${clubStripe(hc)}">${escC(hc.short)}</span>
      <span class="cl-pens-dots">${RL.pens.h.map(dot).join('')}</span>
      <span class="cl-pens-score">${RL.pens.h.filter(k=>k.scored).length}</span></div>
    <div class="cl-pens-row"><span class="cl-pens-team" style="${clubStripe(ac)}">${escC(ac.short)}</span>
      <span class="cl-pens-dots">${RL.pens.a.map(dot).join('')}</span>
      <span class="cl-pens-score">${RL.pens.a.filter(k=>k.scored).length}</span></div>
  </div>`;
}
/* ficha da partida (desempenho): posse, finalizações e chances claras — reflete o novo
   motor que separa domínio do placar. Reusa a caixa do árbitro (cl-lm-ref). */
function matchStatsHTML(m){
  if(!m.perf || !m.perf.H) return '';
  const H=m.perf.H, A=m.perf.A;
  const tot=(H.poss+A.poss)||1; const hP=Math.round(100*H.poss/tot);
  const line=(lbl,hv,av)=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:1px 2px;color:#111"><b style="min-width:36px">${hv}</b><span style="color:#444;flex:1;text-align:center">${lbl}</span><b style="min-width:36px;text-align:right">${av}</b></div>`;
  // envolve num bloco CINZA (igual aos outros da janela) — sem isso a ficha ficava sobre o azul
  // do modal, com texto escuro ilegível.
  return `<div class="cl-lm-statswrap"><fieldset class="cl-lm-ref" style="margin:0"><legend>Ficha da partida</legend>
    ${line('Posse %',hP+'%',(100-hP)+'%')}
    ${line('Finalizações',H.shots,A.shots)}
    ${line('Chances Claras',H.big,A.big)}
  </fieldset></div>`;
}
function liveModalHTML(m){ const RL=CL.live; const hc=clubOf(m.h),ac=clubOf(m.a);
  const shooting=!!RL.pensPicking;
  const halftime=(RL.paused && m.user && !RL.penEvent && !RL.injEvent && !RL.redEvent && !RL.pens);
  const penalty=(RL.penEvent && RL.penMatch===m);
  const injury=(RL.injEvent && RL.injMatch===m);
  const red=(RL.redEvent && RL.redMatch===m);
  // SUBSTITUIÇÃO SÓ NO INTERVALO. Havia um botão "Substituições (n)" no meio da partida que abria
  // o painel a qualquer minuto — mas a troca livre em jogo corrido nunca fez parte do jogo: o
  // momento de mexer no time é o intervalo, e é lá que o painel abre sozinho. O botão prometia
  // uma decisão fora de hora e dava três cliques (abrir, trocar, fechar) pra uma coisa que o
  // intervalo já entrega pronta. Lesão continua sendo a exceção — ela abre o próprio painel
  // (injurySubHTML) na hora em que acontece, porque aí a troca é obrigatória.
  // replay (ver buildLiveMatchObject): o resultado já é oficial, publicado pelo adversário humano —
  // substituições aqui não mudariam nada (os eventos futuros já estão fixados), então nem mostra o painel.
  const showSubs = m.user && !m.replay && !penalty && !injury && !red && !shooting && halftime;
  const incHTML=incidentLines(m);
  // botões de ação ficam FORA de .cl-lm-top de propósito: esse é um flex row com os
  // eventos, e por padrão o flexbox estica todo mundo pra altura do irmão mais alto
  // (align-items:stretch) — com muitos incidentes na partida, isso inflava os botões
  // junto (mesmo com o teto de altura em .cl-lm-events). Como bloco separado abaixo,
  // os botões mantêm sempre o próprio tamanho natural, disputa alguma seja a duração do jogo.
  const actionsHTML=(penalty||injury||red||shooting)?'':`<div class="cl-lm-cont" style="grid-template-columns:${m.user?'1fr 1fr':'1fr'}">
        ${m.user?btn('Compartilhar','clShareResult()',{icon:'📤',cls:'cl-btn-cancel cl-noshot'}):''}
        ${btn('Continuar','liveContinue()',{icon:'✔',cls:'cl-btn-ok'})}
      </div>`;
  // contador do intervalo (Resenha): linha própria, FORA do botão — btn() escapa o label, então
  // HTML no rótulo apareceria como texto quebrado. Atualizado a cada segundo por startHalftimeCountdown.
  const halftimeTimerHTML=(halftime && CL.online)?`<div class="cl-ht-timer">⏱ Avança sozinho em <span class="cl-ht-count">${Math.max(0,RL.halftimeLeft!=null?RL.halftimeLeft:10)}</span>s se você não substituir</div>`:'';
  // FASE 3B (mandante): a sessão está pausada esperando a decisão do VISITANTE (pênalti/lesão/
  // expulsão dele) — aviso com o teto de 15s (depois a decisão padrão é aplicada sozinha).
  const remoteWaitHTML=(m.sim && m.sim.pending && m.sim.pending.ev && m.sim.pending.ev.side!==(m.h===CL.clubId?'H':'A'))
    ? `<div class="cl-ht-timer">📡 Aguardando a decisão do adversário (automática em até 15s)</div>` : '';
  return `<div class="cl-lm-title">${escC(hc.short)}, ${m.hg} - ${escC(ac.short)}, ${m.ag}</div>
    <div class="cl-lm-top">
      <div class="cl-lm-events">${incHTML}</div>
      <fieldset class="cl-lm-ref"><legend>Árbitro</legend><b>${escC(m.ref)}</b></fieldset>
    </div>
    ${m.user?matchStatsHTML(m):''}
    ${halftimeTimerHTML}${remoteWaitHTML}
    ${actionsHTML}
    ${showSubs?subPanelHTML(m):''}
    ${penalty?penaltyPickerHTML():''}${injury?injurySubHTML(m,RL.injEvent):''}${red?redCardHTML(m,RL.redEvent):''}${shooting?shootoutPickerHTML():''}
    ${/* TODOS OS MODAIS DA PARTIDA USAM O MESMO ESPAÇO DO INVENTÁRIO.
          Eram cinco chaves diferentes conforme o momento — machucado, expulsão,
          pênalti, intervalo, partida — e QUATRO delas não existem em
          elifoot_v3.ad_spaces: o painel nunca as listou, ninguém podia vendê-las
          e o lugar ficava eternamente vazio. Só a do intervalo era real.

          É a mesma faixa 728×90, no mesmo sítio da tela, em momentos diferentes
          do mesmo jogo — um espaço, não cinco. Quem compra a faixa do modal
          aparece em todos eles. Se um dia valer separar por momento, o caminho
          é criar as chaves no inventário PRIMEIRO; a divisão não pode nascer no
          cliente, que é como estas quatro nasceram órfãs. */''}
    ${m.user?adSlotHTML('rf98.match.halftime','cl-ad-live'):''}`;
}
/* ---- modal clássico de pênalti: escolhe o batedor, com contagem regressiva de 10s ---- */
function penaltyRating(p){ return Math.max(1,Math.min(9,Math.round((p.f-40)/7))); }
/* cor do modal de pênalti = cor real do clube que está batendo (igual ao clássico:
   ATLETICO PR sai vermelho, VITORIA sai preto — cada time com sua própria paleta) */
function penaltyClubStyle(){
  const RL=CL.live; if(!RL) return '';
  let teamId=null;
  if(RL.penEvent) teamId=RL.penEvent.team;
  else if(RL.pens && RL.matches[0]) teamId = RL.pens.turn==='H'?RL.matches[0].h:RL.matches[0].a;
  if(!teamId) return '';
  const c=clubOf(teamId); if(!c || !c.color) return '';
  const {col,col2}=clubColors(c);
  return `style="--pen-bg:linear-gradient(165deg,${col} 45%,${col2} 100%);--pen-fg:${txtOn(col)}"`;
}
function penaltyPickerHTML(){
  if(CL.penPhase==='suspense') return penaltySuspenseHTML();
  if(CL.penPhase==='result') return penaltyResultHTML();
  // TELA PORTADA (telas/Modal - Penalti Batedor)
  return rfPenaltiBatedorHTML();
}
function penaltyPickerHTMLLegado(){
  const takers=penaltyTakerPool((CL.live&&CL.live.penMatch)||null, CL.clubId);
  const secsLeft=Math.max(0,Math.ceil((CL.penDeadline-Date.now())/1000));
  const rows=takers.map(p=>`<div class="cl-pen-row ${CL.penSel===p.n?'sel':''}" onclick="penaltySelect('${escC(p.n)}')">
      <span class="cl-pen-pos">${posLetter(p.s)}</span><span class="cl-pen-n">${escC(p.n)}</span>${notaChip(p)}<span class="cl-pen-r">${p.f}</span>
    </div>`).join('');
  return `<div class="cl-pen-overlay"><div class="cl-pen-modal" ${penaltyClubStyle()}>
    <div class="cl-pen-title">PENALTI</div>
    <div class="cl-pen-sub">${escC(CL.mgr||'Técnico')}, escolha o jogador para marcar o penalti! <span id="cl-pen-count" class="cl-pen-count">${secsLeft}s</span></div>
    <div class="cl-pen-list">${rows}</div>
    <div class="cl-pen-btn">${btn('Chutar','resolvePenalty(CL.penSel)',{icon:'✔',cls:'cl-btn-ok'})}</div>
  </div></div>`;
}
/* ---- modal de pênalti da DISPUTA (mesma cara do pênalti normal, ver penaltyPickerHTML)
   — só troca o título (numera a cobrança) e chama resolveShootoutKick em vez de
   resolvePenalty. Reaproveita CL.penSel/CL.penPhase/CL.penDeadline (só um dos dois
   fluxos — pênalti em campo ou disputa — está ativo por vez, nunca os dois juntos). ---- */
/* placar (bolinhas ✔/✖) fica DENTRO do próprio modal — o modal de pênalti é um overlay
   que cobre a tela inteira (.cl-live-overlay), então renderizar o placar só no corpo da
   página (por trás do overlay) o deixava invisível durante toda a disputa. Passado como
   `extra` pras 3 fases (escolha/suspense/revelação) — só aparece nas variantes de
   DISPUTA de pênaltis; o pênalti normal em campo (penaltyPickerHTML) não passa `extra`. */
function shootoutPickerHTML(){
  // TELA PORTADA (telas/Modal - Disputa de Penaltis) -- UMA tela para as tres fases da
  // cobranca (escolher, suspense, resultado). Ver rfDisputaHTML: e la que a fase decide
  // o corpo e se ha botao. Antes daqui saiam tres modais diferentes com o placar embutido
  // dentro deles, e o placar (que e ecra cheio) tapava os tres.
  return rfDisputaHTML(CL.live);
}
function shootoutPickerHTMLLegado(){
  const RL=CL.live;
  const board=shootoutScoreboardHTMLLegado(RL);
  if(CL.penPhase==='suspense') return penaltySuspenseHTML(board);
  if(CL.penPhase==='result') return penaltyResultHTML(board);
  const pool=penaltyTakerPool(RL.matches[0], CL.clubId);
  const takenNames=new Set((RL.pens.turn==='H'?RL.pens.h:RL.pens.a).map(k=>k.name));
  const eligible=shootoutEligibleTakers(pool, takenNames);
  const cycleReset = eligible.length===pool.length;
  const secsLeft=Math.max(0,Math.ceil((CL.penDeadline-Date.now())/1000));
  const kickNum=(RL.pens.h.length+RL.pens.a.length)+1;
  const rows=pool.map(p=>{
    const takenBefore = !cycleReset && takenNames.has(p.n);
    return `<div class="cl-pen-row ${CL.penSel===p.n?'sel':''} ${takenBefore?'dis':''}" ${takenBefore?'':`onclick="penaltySelect('${escC(p.n)}')"`}>
      <span class="cl-pen-pos">${posLetter(p.s)}</span><span class="cl-pen-n">${escC(p.n)}${takenBefore?' <span class="cl-pen-taken">já bateu</span>':''}</span><span class="cl-pen-r">${p.f}</span>
    </div>`;
  }).join('');
  return `<div class="cl-pen-overlay"><div class="cl-pen-modal" ${penaltyClubStyle()}>
    ${board}
    <div class="cl-pen-title">PÊNALTI ${kickNum}ª cobrança</div>
    <div class="cl-pen-sub">${escC(CL.mgr||'Técnico')}, escolha quem vai bater! <span id="cl-pen-count" class="cl-pen-count">${secsLeft}s</span></div>
    <div class="cl-pen-list">${rows}</div>
    <div class="cl-pen-btn">${btn('Chutar','resolveShootoutKick(CL.penSel)',{icon:'✔',cls:'cl-btn-ok'})}</div>
  </div></div>`;
}
/* fase 2: suspense — só o título, sem revelar nada ainda (a pausa dramática que faltava) */
function penaltySuspenseHTML(extra){
  // TELA PORTADA (telas/Modal - Penalti Suspense)
  return rfPenaltiSuspenseHTML(extra);
}
function penaltySuspenseHTMLLegado(extra){
  return `<div class="cl-pen-overlay"><div class="cl-pen-modal" ${penaltyClubStyle()}>
    ${extra||''}
    <div class="cl-pen-title">PENALTI</div>
    <div class="cl-pen-suspense-dots">· · ·</div>
  </div></div>`;
}
/* fase 3: revelação — mesma cor do clube em todas as fases; só o texto GOLO/Defendeu muda */
function penaltyResultHTML(extra){
  // TELA PORTADA (telas/Modal - Penalti Resultado)
  return rfPenaltiResultadoHTML(extra);
}
function penaltyResultHTMLLegado(extra){
  const scored=CL.penResultScored;
  return `<div class="cl-pen-overlay"><div class="cl-pen-modal" ${penaltyClubStyle()}>
    ${extra||''}
    <div class="cl-pen-title">PENALTI</div>
    <div class="cl-pen-marcador">Marcador: ${escC(CL.penResultScorer||'')}</div>
    <div class="cl-pen-result ${scored?'golo':'defendeu'}">${scored?'GOL':'Defendeu'}</div>
  </div></div>`;
}
/* linha do tempo de incidentes: gols, cartões e lesões, mais recentes primeiro */
function incidentLines(m){
  let hh=0,aa=0;
  const rows=(m.incidents||[]).map(inc=>{
    if(inc.type==='gol'){ if(inc.side==='H')hh++; else aa++;
      return {min:inc.min,html:`⚽ ${hh}:${aa} ${escC(inc.player)} ${inc.min}'`}; }
    if(inc.type==='penalti'){
      if(inc.scored){ if(inc.side==='H')hh++; else aa++;
        return {min:inc.min,html:`⚽🥅 ${hh}:${aa} ${escC(inc.player)} converteu o pênalti! ${inc.min}'`}; }
      return {min:inc.min,html:`❌🥅 ${escC(inc.player)} perdeu o pênalti! ${inc.min}'`}; }
    if(inc.type==='cartao'){
      const ic=inc.cardType==='vermelho'?'🟥':'🟨';
      const suf=inc.reason==='segundo amarelo'?' (2º amarelo)':'';
      return {min:inc.min,html:`${ic} ${escC(inc.player)}${suf} ${inc.min}'`}; }
    if(inc.type==='sub'){
      return {min:inc.min,html:`⇄ ${escC(inc.player)} entrou${inc.out?` (${escC(inc.out)} saiu)`:''} ${inc.min}'`}; }
    if(inc.type==='lesao'){
      const suf=inc.severity==='grave'?' (grave)':'';
      return {min:inc.min,html:`✚ ${escC(inc.player)}${suf} ${inc.min}'`}; }
    return null;
  }).filter(Boolean).sort((a,b)=>b.min-a.min);
  if(!rows.length) return '<div class="cl-lm-noinc">Sem incidentes ainda</div>';
  return rows.map(r=>`<div>${r.html}</div>`).join('');
}
function subPanelHTML(m){
  // TELA PORTADA (telas/Modal - Substituicao). O painel antigo some.
  return rfSubHTML(m);
}
function subPanelHTMLLegado(m){ const id=CL.clubId; const xiSet=new Set(S.xi||[]); const xi=squad(id).filter(p=>xiSet.has(p.pid)).sort(bySquadOrder); const bench=squad(id).filter(p=>!xiSet.has(p.pid)).sort(bySquadOrder);
  const rowP=(p,side)=>`<div class="cl-sub-row ${((side==='out')?CL.subOut:CL.subIn)===p.pid?'sel':''}" onclick="liveSubPick('${side}','${escC(p.pid)}')"><span class="cl-sub-p">${posLetter(p.s)}</span><span class="cl-sub-n">${escC(p.n)}</span><b>${p.f}</b></div>`;
  return `<fieldset class="cl-sub"><legend>${escC(clubOf(id).short)}</legend>
    <div class="cl-sub-cols"><div class="cl-sub-c">${xi.map(p=>rowP(p,'out')).join('')}</div><div class="cl-sub-c">${bench.map(p=>rowP(p,'in')).join('')}</div></div>
    <div class="cl-sub-btn">${btn('Substituir','liveDoSub()',{icon:'⇄',cls:'cl-btn-ico'})}</div>
  </fieldset>`;
}
/* log opt-in do fluxo pós-rodada — ative com `EF_DEBUG=1` no console pra ver a sequência EXATA de
   telas (waitround/classif/main) e qual caminho fechou a rodada (servidor vs fallback local). */
function _prLog(tag){ try{ if(typeof window!=='undefined' && window.EF_DEBUG){
  console.log('%c[postround]','color:#e2a41c;font-weight:bold', tag,
    '| round='+(typeof S!=='undefined'&&S?S.round:'?'), 'screen='+CL.screen,
    'host='+(typeof NET!=='undefined'&&NET.isHost), 'played='+CL._playedRound); } }catch(e){} }
function showLiveClassif(){ _prLog('showLiveClassif -> classif'); CL.screen='classif';
  // reseta o accordion pra sempre abrir na divisão do usuário ao mostrar o ranking
  CL.clsDivOpen=null;
  armClassifTimer();
  cdraw();
}
/* avança sozinho pra próxima tela depois de 10s sem interação — o "Continuar" continua
   disponível pra quem quiser passar na hora. Reabrir/fechar um accordion (clToggleDivAcc)
   reinicia a contagem, já que isso mostra que o jogador ainda está lendo a tabela. */
function armClassifTimer(){
  if(CL._classifTimer){ clearTimeout(CL._classifTimer); CL._classifTimer=null; }
  CL._classifTimer=setTimeout(()=>{ CL._classifTimer=null; if(CL.screen==='classif'||CL.screen==='seatclassif') clClassifContinue(); }, 10000);
}
/* tabela genérica pra qualquer divisão (a do usuário OU uma das 3 que rodam em segundo plano) */
function sortedTableOf(table){
  return Object.values(table||{}).sort((a,b)=> b.Pts-a.Pts || (b.GF-b.GA)-(a.GF-a.GA) || b.GF-a.GF || String(a.id).localeCompare(String(b.id)) );
}
/* nome da divisão pra classificação/ao-vivo — universo-consciente: Brasil usa "1ª..4ª Divisão";
   universos intl (Alemanha, Itália...) usam o rótulo real (Bundesliga, Serie A...). Antes o
   legend era fixo em A/B/C/D e dava "undefined" em qualquer divisão fora do Brasil. */
function classifDivName(d, country){
  const legend={A:'1ª Divisão',B:'2ª Divisão',C:'3ª Divisão',D:'4ª Divisão'};
  const labels = country
    ? ((typeof UNI_CONFIGS!=='undefined' && UNI_CONFIGS[uniKeyOf(country)] && UNI_CONFIGS[uniKeyOf(country)].label) || {})
    : ((typeof DIV_LABEL_FULL!=='undefined' && DIV_LABEL_FULL) || {});
  return legend[d] || labels[d] || d;
}
function scClassif(){
  // TELA PORTADA (telas/Pos-Rodada - Classificacao)
  return rfPosRodadaHTML();
}
function scClassifLegado(){
  // accordion vertical: divisão do usuário no topo e aberta; as outras colapsadas.
  const panelHTML=(d)=>{
    const isMine = d===S.division;
    const hasQual = d==='A'; // só a Série A classifica pra Libertadores/Sul-Americana
    const tbl = isMine ? sortedTable() : (S.otherDivs && S.otherDivs[d] ? sortedTableOf(S.otherDivs[d].table) : null);
    const open=divAccOpen('clsDivOpen',d);
    const rows=tbl?tbl.map((t,i)=>{ const c=clubOf(t.id); const me=isMine && t.id===CL.clubId;
      const zone=qualificationZone(d,i+1);
      const zoneCell = hasQual ? `<span class="cl-cls2-zone ${zone?'zone-'+zone:''}" title="${zone==='lib'?'Libertadores':zone==='sul'?'Sul-Americana':''}">${zone==='lib'?'Lib':zone==='sul'?'Sul':''}</span>` : '';
      return `<div class="cl-cls2-row ${me?'me':''} ${hasQual?'hasqual':''}" style="${clubStripe(c)}">
        <span class="cl-cls2-pos">${i+1}</span><span class="cl-cls2-n">${escC(c.short)}</span>
        <span class="cl-cls2-pts">${t.Pts}</span><span class="cl-cls2-x">${t.W}</span><span class="cl-cls2-x">${t.D}</span><span class="cl-cls2-x">${t.L}</span>
        <span class="cl-cls2-x">${t.GF}</span><span class="cl-cls2-x">${t.GA}</span>${zoneCell}</div>`; }).join('')
      : '<div class="cl-cls2-empty">—</div>';
    return `<div class="cl-clsacc ${open?'open':'collapsed'} ${isMine?'mine':''}">
      <div class="cl-clsacc-h" onclick="event.stopPropagation();clToggleDivAcc('clsDivOpen','${d}')">
        <span class="cl-clsacc-h-title">${divisionTrophyImg(d,18)||'🏆'} ${escC(classifDivName(d))}${isMine?' <span class="cl-acc-you">você</span>':''}</span>
        <span class="cl-acc-arrow ${open?'':'closed'}">▾</span></div>
      <div class="cl-clsacc-body">
        <div class="cl-cls2-head ${hasQual?'hasqual':''}"><span class="cl-cls2-pos">#</span><span class="cl-cls2-n">Equipa</span><span class="cl-cls2-pts">P</span><span class="cl-cls2-x">V</span><span class="cl-cls2-x">E</span><span class="cl-cls2-x">D</span><span class="cl-cls2-x">GP</span><span class="cl-cls2-x">GC</span>${hasQual?'<span></span>':''}</div>
        ${rows}</div></div>`;
  };
  return `<div class="cl-live cl-classif">
    <div class="cl-classif-buttons">
      ${btn('Compartilhar','clShareStandings()',{icon:'📤',cls:'cl-btn-cancel cl-btn-sm cl-noshot'})}
      ${btn('Continuar','clClassifContinue()',{icon:'✔',cls:'cl-btn-ok cl-btn-sm'})}
    </div>
    <div class="cl-classif-autohint">avança sozinho em alguns segundos...</div>
    <div class="cl-live-top">Classificação - ${S.round}ª semana</div>
    <div class="cl-clsacc-wrap">${DIV_ORDER.map(panelHTML).join('')}</div>
  </div>`;
}
function liveDone(){ _prLog('liveDone -> main'); if(CL._liveTimer)clearTimeout(CL._liveTimer); if(CL._classifTimer){clearTimeout(CL._classifTimer);CL._classifTimer=null;} clearInjuryTimer(); clearCupFlowTimer(); CL.live=null; CL.subsUsed=0; CL._liveBusy=false; CL.screen='main'; CL.tab='jogo'; CL.selPlayer=squad(CL.clubId)[0]?.pid||CL.selPlayer; cdraw();
  if(CL.lastGate) toastC('Bilheteira: +'+grp(CL.lastGate)+' reais'); CL.lastGate=0;
  // notificação de propostas de compra recebidas nesta rodada (toast no topo, ~3s cada) — só as do MEU clube
  /* SO AVISA O QUE AINDA EXISTE. A fila acumula enquanto o jogador nao entra em campo, e
     disparava tudo junto — incluindo propostas ja expiradas, que ele ia procurar em Propostas
     e nao encontrava. Agora cada aviso carrega o id e e conferido contra a lista viva.
     (entradas antigas, guardadas como texto, sao descartadas: nao da para as verificar) */
  const fila=(S._offerToastsByClub&&S._offerToastsByClub[S.clubId])||[];
  if(fila.length){
    let vivas=[];
    try{ vivas=(typeof myIncomingOffers==='function')?myIncomingOffers().map(o=>o.id):[]; }catch(e){}
    const mostrar=fila.filter(t=>t && typeof t==='object' && vivas.indexOf(t.id)>=0);
    mostrar.forEach((t,i)=>setTimeout(()=>toastC(t.msg), 500+i*400));
    if(S._offerToastsByClub) S._offerToastsByClub[S.clubId]=[];
  }
  // cronômetro soberano: QUALQUER cliente reabre a rodada seguinte (não só o host) — ver reopen_ready
  if(CL.online && typeof NET!=='undefined' && NET.gameId && !S.finished){
    if(NET.reopenReady) NET.reopenReady(); else if(NET.isHost) NET.start(); // fallback: transporte local
  }
  if(S.finished) setTimeout(()=>seasonEndDialog(),300); }
/* ---- fim de temporada: mostra campeão + posição final, botão avança a temporada
   (com promoção/rebaixamento de verdade, pré-carregando dados reais da nova divisão) ---- */
/* o marcador é por TEMPORADA: sem zerar, o fim da temporada seguinte não mostraria nada. */
function momentosFimReset(){ CL._momFimVisto=false; }
function seasonEndDialog(){
  if(CL._momFimSeason!==(S.season||0)){ CL._momFimSeason=(S.season||0); CL._momFimVisto=false; }
  // MOMENTOS DE FIM DE TEMPORADA (solo): título / artilheiro / acesso ou queda vêm ANTES do resumo
  // da temporada, um de cada vez. Só entram na primeira passada — quando a fila esvazia, o próprio
  // seasonEndDialog é chamado de novo e segue direto pro resumo.
  if(!CL._momFimVisto){
    CL._momFimVisto=true;
    if(typeof enfileirarMomentosFimDeTemporada==='function') enfileirarMomentosFimDeTemporada();
    if(MOMENTO_FILA.length){ momentoSeguinte(()=>seasonEndDialog()); return; }
  }
  const tbl=sortedTable();
  const champ=clubOf(tbl[0].id).short;
  const myPos=tablePos(S.clubId);
  const hasQual = S.division==='A';
  // mesma info que endSeason() já calculou pro histórico (S.history acabou de ganhar essa
  // entrada) — reaproveita em vez de recalcular, e cobre o "pra qual competição classificou".
  const hist=S.history[S.history.length-1];
  const qualifiedFor=(hist&&hist.qualifiedFor)||[];
  let qualMsg;
  if(qualifiedFor.includes('libertadores')) qualMsg='🏆 Classificado pra Copa Libertadores '+(S.season+1)+'!';
  else if(qualifiedFor.includes('sulamericana')) qualMsg='🏆 Classificado pra Copa Sul-Americana '+(S.season+1)+'!';
  else if(myPos>tbl.length-4 && hasQual) qualMsg='⚠️ Fora das vagas continentais nesta temporada.';
  const rows=tbl.map((t,i)=>{ const c=clubOf(t.id); const me=t.id===S.clubId;
    const zone=hasQual?qualificationZone('A',i+1):null;
    const zoneCell = hasQual ? `<span class="cl-cls2-zone ${zone?'zone-'+zone:''}" title="${zone==='lib'?'Libertadores':zone==='sul'?'Sul-Americana':''}">${zone==='lib'?'Lib':zone==='sul'?'Sul':''}</span>` : '';
    return `<div class="cl-cls2-row ${me?'me':''} ${hasQual?'hasqual':''}" style="${clubStripe(c)}">
      <span class="cl-cls2-pos">${i+1}</span><span class="cl-cls2-n">${escC(c.short)}</span>
      <span class="cl-cls2-pts">${t.Pts}</span><span class="cl-cls2-x">${t.W}</span><span class="cl-cls2-x">${t.D}</span><span class="cl-cls2-x">${t.L}</span>
      <span class="cl-cls2-x">${t.GF}</span><span class="cl-cls2-x">${t.GA}</span>${zoneCell}</div>`; }).join('');
  const pz=S._seasonPrizes;
  const prizeBlock = (pz && pz.total>0) ? `<div class="cl-prizes">
      <div class="cl-prizes-h">💰 Premiação da temporada</div>
      ${pz.lines.map(l=>`<div class="cl-prize-row"><span class="cl-prize-ic">${l.icon}</span><span class="cl-prize-c">${escC(l.comp)}</span><span class="cl-prize-p">${escC(l.place)}</span><span class="cl-prize-v">+${fmt(l.amount)}</span></div>`).join('')}
      <div class="cl-prize-total"><span>Total recebido</span><span>+${fmt(pz.total)}</span></div>
      ${pz.art&&pz.art.mine?`<div class="cl-prize-art">👟 <b>${escC(pz.art.name)}</b> foi artilheiro (${pz.art.goals} gols) e valorizou: ${fmt(pz.art.valFrom)} → <b>${fmt(pz.art.valTo)}</b></div>`:''}
    </div>` : '';
  // TELA PORTADA (telas/Fim de Temporada): rfStage 1080px, sem modal.
  overlayC(rfFimTemporadaHTML());
}
function clAdvanceSeason(){
  clCloseOverlay();
  const nd=pendingDivisionChange();
  const goingReal = nd!==S.division && nd!=='A';
  toastC(goingReal?'Preparando Série '+nd+'...':'Preparando nova temporada...');
  (async ()=>{
    if(goingReal && typeof NET!=='undefined' && NET.getDivisionClubs){
      try{ await loadRealDivisionClubs(nd); }catch(e){ console.warn('divisão real indisponível, usando fallback:',e); }
    }
    newSeasonReset();
    saveV3(); cdraw();
    checkPendingCupDraws(()=>{ // mostra o sorteio da Copa do Brasil da nova temporada antes do aviso de acesso/queda
      if(S._promoRelegNews==='promoted') resultDialog('🔺 Promoção!','Você subiu pra '+divisionLabel()+'!');
      else if(S._promoRelegNews==='relegated') resultDialog('🔻 Rebaixamento','Você caiu pra '+divisionLabel()+'.');
    });
  })().catch(err=>{
    // antes, qualquer erro aqui dentro travava a tela em silêncio (sem nenhum aviso).
    // agora mostra o erro de verdade e tenta voltar pra tela principal mesmo assim.
    console.error('Erro ao avançar de temporada:', err);
    toastC('⚠ Erro ao avançar de temporada: '+(err&&err.message||'desconhecido')+'. Tentando recuperar...');
    try{ CL.screen='main'; CL.tab='jogo'; cdraw(); }catch(e2){ console.error('Falha também ao recuperar:', e2); }
  });
}
/* ---- FIM DE TEMPORADA no ONLINE (server-authoritative) ----
   Cerimônia de premiação do PRÓPRIO clube: posição na divisão DELE + prêmios que ELE recebeu,
   lidos de S._prevSeason via computeMyPrevSeasonPrizes (cada humano vê o SEU resumo — não o do
   anfitrião, que era o bug). Diferente do seasonEndDialog (solo, lê o S ao vivo), aqui a virada
   já aconteceu no SERVIDOR e o estado ao vivo já é a temporada nova; este modal é só comemoração
   pós-fato — "Nova temporada" apenas fecha e fica na tela principal da temporada nova (não chama
   newSeasonReset, que travaria/divergiria no multi-divisão). Chamado nos ramos de virada. */
function onlineSeasonEndDialog(sum){
  const _dl=(typeof DIV_LABEL_FULL!=='undefined' && DIV_LABEL_FULL[S.division]) || ('Série '+S.division);
  if(!sum){ toastC('🏆 Nova temporada '+(S.season||'')+'! Você está na '+_dl+'.'); return; } // save antigo sem snapshot
  const tbl=sum.myTable, champ=(sum.champId&&clubOf(sum.champId)&&clubOf(sum.champId).short)||'—';
  const hasQual = sum.myDiv==='A';
  const rows=tbl.map((t,i)=>{ const c=clubOf(t.id); const me=t.id===CL.clubId;
    const zone=hasQual?qualificationZone('A',i+1):null;
    const zoneCell = hasQual ? `<span class="cl-cls2-zone ${zone?'zone-'+zone:''}" title="${zone==='lib'?'Libertadores':zone==='sul'?'Sul-Americana':''}">${zone==='lib'?'Lib':zone==='sul'?'Sul':''}</span>` : '';
    return `<div class="cl-cls2-row ${me?'me':''} ${hasQual?'hasqual':''}" style="${clubStripe(c)}">
      <span class="cl-cls2-pos">${i+1}</span><span class="cl-cls2-n">${escC(c.short)}</span>
      <span class="cl-cls2-pts">${t.Pts}</span><span class="cl-cls2-x">${t.W}</span><span class="cl-cls2-x">${t.D}</span><span class="cl-cls2-x">${t.L}</span>
      <span class="cl-cls2-x">${t.GF}</span><span class="cl-cls2-x">${t.GA}</span>${zoneCell}</div>`; }).join('');
  const prizeBlock = (sum.total>0) ? `<div class="cl-prizes">
      <div class="cl-prizes-h">💰 Premiação da temporada</div>
      ${sum.lines.map(l=>`<div class="cl-prize-row"><span class="cl-prize-ic">${l.icon}</span><span class="cl-prize-c">${escC(l.comp)}</span><span class="cl-prize-p">${escC(l.place)}</span><span class="cl-prize-v">+${fmt(l.amount)}</span></div>`).join('')}
      <div class="cl-prize-total"><span>Total recebido</span><span>+${fmt(sum.total)}</span></div>
    </div>` : '';
  // aposentadorias do próprio clube (item 5 — sabor): quem pendurou as chuteiras e por quê
  const rets=(sum.retirements||[]);
  const retireBlock = rets.length ? `<div class="cl-prizes" style="margin-top:8px">
      <div class="cl-prizes-h">👋 Aposentadorias no elenco</div>
      ${rets.map(r=>`<div class="cl-prize-row"><span class="cl-prize-ic">🎽</span><span class="cl-prize-c">${escC(r.name)} <span style="opacity:.7">(${r.age||'?'} anos)</span></span><span class="cl-prize-p" style="flex:2;text-align:left;opacity:.85">${escC(r.reason||'')}</span></div>`).join('')}
    </div>` : '';
  // TELA PORTADA (telas/Fim de Temporada): mesma tela, alimentada pelo resumo do assento.
  overlayC(rfFimTemporadaHTML(sum));
  armSeasonEndTimer(); // auto-avança pra não segurar o outro jogador / a próxima rodada
}
/* contador regressivo do modal de fim de temporada (online): 15s e auto-avança pra tela
   principal da temporada nova — mantém o fluxo mesmo se um jogador sair da frente do PC.
   A virada já aconteceu no servidor, então isto é só a cerimônia; auto-avançar é seguro. */
function armSeasonEndTimer(){
  if(CL._seasonEndTimer){ clearInterval(CL._seasonEndTimer); CL._seasonEndTimer=null; }
  CL._seasonEndLeft=15;
  CL._seasonEndTimer=setInterval(()=>{
    CL._seasonEndLeft=(CL._seasonEndLeft!=null?CL._seasonEndLeft:15)-1;
    const el=document.querySelector('#cl-season-count'); if(el) el.textContent=Math.max(0,CL._seasonEndLeft);
    if(CL._seasonEndLeft<=0) clOnlineSeasonContinue();
  }, 1000);
}
/* ================= SALA DE IMPRENSA (fim de temporada) =================
   Substitui o antigo modal de premiação. Fluxo: NOTÍCIAS (fatos da temporada que acabou,
   todos vindos do snapshot autoritativo do servidor) -> COLETIVA (5 perguntas, sempre com
   a opção de não responder) -> FECHAMENTO (manchetes geradas + efeito na moral).
   A virada JÁ aconteceu no servidor, então esta tela não segura o outro jogador — mesmo
   assim cada passo tem contagem regressiva generosa, pra ninguém ficar preso aqui se sair
   da frente do PC. O delta de moral é publicado pro servidor (ver S._netMorale): aplicar
   só no cliente seria desfeito na rodada seguinte, igual acontecia com as transferências. */
function openPressRoom(sum){
  const b=(typeof buildPressBriefing==='function')?buildPressBriefing():null;
  if(!b){ // save antigo sem snapshot: cai no comportamento anterior
    onlineSeasonEndDialog(sum); return;
  }
  CL._press={ step:'news', qIdx:0, answers:[], morale:0, b, sum:sum||null };
  CL.screen='imprensa'; cdraw(); armPressTimer();
}
function armPressTimer(){
  if(CL._pressTimer){ clearInterval(CL._pressTimer); CL._pressTimer=null; }
  CL._pressLeft=25;
  CL._pressTimer=setInterval(()=>{
    if(CL.screen!=='imprensa'){ clearInterval(CL._pressTimer); CL._pressTimer=null; return; }
    CL._pressLeft=(CL._pressLeft!=null?CL._pressLeft:25)-1;
    const el=document.querySelector('#cl-press-count'); if(el) el.textContent=Math.max(0,CL._pressLeft);
    if(CL._pressLeft<=0){ pressAdvanceAuto(); }
  },1000);
}
function clearPressTimer(){ if(CL._pressTimer){ clearInterval(CL._pressTimer); CL._pressTimer=null; } }
/* estouro do relógio: notícias -> coletiva; pergunta -> "não responder"; fim -> começa a temporada */
function pressAdvanceAuto(){
  const P=CL._press; if(!P) return;
  if(P.step==='news') return pressGoQA();
  if(P.step==='qa')   return pressAnswer(-1);
  return pressFinish();
}
function pressGoQA(){ const P=CL._press; if(!P) return; P.step='qa'; P.qIdx=0; cdraw(); armPressTimer(); }
function pressAnswer(optIdx){
  const P=CL._press; if(!P || P.step!=='qa') return;
  const q=PRESS_QUESTIONS[P.qIdx];
  if(optIdx>=0 && q && q.opts[optIdx]){
    const o=q.opts[optIdx];
    P.answers.push({ q:q.q, t:o.t, h:o.h, m:o.m }); P.morale+=o.m;
  } else {
    P.answers.push({ q:(q&&q.q)||'', t:'(não quis responder)', h:null, m:0 });
  }
  P.qIdx++;
  if(P.qIdx>=PRESS_QUESTIONS.length){ P.step='fim'; }
  cdraw(); armPressTimer();
}
/* aplica a moral no MEU elenco e deixa pendente pro servidor (senão a rodada seguinte desfaz) */
function pressFinish(){
  clearPressTimer();
  const P=CL._press; CL._press=null;
  const d=P?Math.max(-15,Math.min(15,P.morale)):0;  // teto de segurança
  if(d && S.squads && S.squads[CL.clubId]){
    S.squads[CL.clubId].forEach(p=>{ p.moral=Math.max(0,Math.min(100,(p.moral!=null?p.moral:70)+d)); });
    if(CL.online) S._netMorale=(S._netMorale||0)+d;   // publicado junto do resultado da rodada
  }
  const _dl=(typeof DIV_LABEL_FULL!=='undefined' && DIV_LABEL_FULL[S.division]) || ('Série '+S.division);
  toastC('🏆 Nova temporada '+(S.season||'')+'! Você está na '+_dl+'.');
  // vai direto pra "Formação" (não "Jogo") — nunca mostramos outra tela antes de uma rodada
  // começar além da de escalação, pro jogador conferir/escolher a tática da temporada nova
  // antes do 1º "Jogar" (ver panSeleccao/clJogar).
  CL.screen='main'; CL.tab='seleccao'; cdraw();
}
function scImprensa(){
  // TELA PORTADA (telas/Imprensa)
  return rfImprensaHTML(CL._press);
}
function scImprensaLegado(){
  const P=CL._press; if(!P) return '';
  const b=P.b, cnt=`<span id="cl-press-count">${Math.max(0,CL._pressLeft!=null?CL._pressLeft:25)}</span>`;
  const hint=`<div class="cl-classif-autohint">avança sozinho em ${cnt}s</div>`;
  if(P.step==='news')  return pressNewsHTML(b,hint);
  if(P.step==='qa')    return pressQAHTML(P,hint);
  return pressEndHTML(P,hint);
}
function pressNewsHTML(b,hint){
  const card=(ic,t,d)=>`<div class="cl-press-card"><span class="cl-press-ic">${ic}</span>
    <div><div class="cl-press-t">${t}</div><div class="cl-press-d">${d}</div></div></div>`;
  const my=b.divs.find(d=>d.div===S.division)||b.divs[0];
  let cards='';
  if(my) cards+=card('🏆',escC(my.campeao)+' é campeão da '+escC(my.label), my.campeaoPts+' pontos na temporada '+b.season+'.');
  if(b.copa) cards+=card('🥇','Copa do Brasil: '+escC(b.copa), 'Levantou a taça nacional.');
  if(b.art)  cards+=card('👟','Artilheiro: '+escC(b.art.nome), b.art.gols+' gols na temporada.');
  b.divs.forEach(d=>{
    if(!d.promovidos.length && !d.rebaixados.length) return;
    const sobe=d.promovidos.length?('<b>Sobem:</b> '+d.promovidos.map(escC).join(', ')):'';
    const cai=d.rebaixados.length?('<b>Caem:</b> '+d.rebaixados.map(escC).join(', ')):'';
    cards+=card('🔀', escC(d.label), [sobe,cai].filter(Boolean).join(' · '));
  });
  if(b.retirements.length){
    cards+=card('👋','Aposentadorias no seu elenco',
      b.retirements.map(r=>escC(r.name)+' <span style="opacity:.75">('+escC(r.reason||'')+')</span>').join('<br>'));
  }
  if(b.humanos.length>1){
    const rk=b.humanos.map((h,i)=>`${i+1}º ${escC(h.nome)} <span style="opacity:.75">(${escC(h.clube)} · ${escC(h.divLabel)}, ${h.pos}º)</span>`).join('<br>');
    cards+=card('📋','Classificação dos treinadores', rk);
  }
  return `<div class="cl-press">
    <div class="cl-press-head"><div class="cl-press-kicker">Resenha Esportiva · Temporada ${b.season}</div>
      <div class="cl-press-h1">O que rolou na temporada</div></div>
    <div class="cl-press-cards">${cards}</div>
    <div class="cl-cal-ok">${btn('Ir para a coletiva','pressGoQA()',{icon:'🎤',cls:'cl-btn-ok'})}</div>
    ${hint}</div>`;
}
function pressQAHTML(P,hint){
  const q=PRESS_QUESTIONS[P.qIdx];
  const opts=q.opts.map((o,i)=>`<button class="cl-press-opt" onclick="pressAnswer(${i})">${escC(o.t)}</button>`).join('');
  return `<div class="cl-press">
    <div class="cl-press-head"><div class="cl-press-kicker">Coletiva de imprensa · pergunta ${P.qIdx+1} de ${PRESS_QUESTIONS.length}</div>
      <div class="cl-press-h1">${escC(q.q)}</div></div>
    <div class="cl-press-opts">${opts}</div>
    <div class="cl-cal-ok">${btn('Não responder','pressAnswer(-1)',{icon:'🚫',cls:'cl-btn-cancel'})}</div>
    ${hint}</div>`;
}
function pressEndHTML(P,hint){
  const hs=P.answers.filter(a=>a.h).map(a=>`<div class="cl-press-card"><span class="cl-press-ic">📰</span>
    <div><div class="cl-press-t">${escC(a.h)}</div><div class="cl-press-d">${escC(a.t)}</div></div></div>`).join('')
    || `<div class="cl-press-card"><span class="cl-press-ic">🤐</span><div><div class="cl-press-t">Sem declarações</div>
        <div class="cl-press-d">Você preferiu não falar com a imprensa.</div></div></div>`;
  const d=Math.max(-15,Math.min(15,P.morale));
  const tone = d>0?'sobe':d<0?'cai':'estável';
  const cls  = d>0?'up':d<0?'down':'';
  const moralTxt = d===0 ? 'A moral do elenco segue estável.'
    : `A moral do elenco <b>${tone}</b> ${d>0?'+':''}${d} ponto${Math.abs(d)===1?'':'s'} para o início da temporada.`;
  return `<div class="cl-press">
    <div class="cl-press-head"><div class="cl-press-kicker">O que saiu nos jornais</div>
      <div class="cl-press-h1">Repercussão da coletiva</div></div>
    <div class="cl-press-cards">${hs}</div>
    <div class="cl-press-moral ${cls}">${moralTxt}</div>
    <div class="cl-cal-ok">${btn('Começar a temporada','pressFinish()',{icon:'✔',cls:'cl-btn-ok'})}</div>
    ${hint}</div>`;
}
function clOnlineSeasonContinue(){
  if(CL._seasonEndTimer){ clearInterval(CL._seasonEndTimer); CL._seasonEndTimer=null; }
  clCloseOverlay();
  const _dl=(typeof DIV_LABEL_FULL!=='undefined' && DIV_LABEL_FULL[S.division]) || ('Série '+S.division);
  toastC('🏆 Nova temporada '+(S.season||'')+'! Você está na '+_dl+'.');
  CL.screen='main'; CL.tab='seleccao'; cdraw();
}
/* ---- corrige a escalação do usuário se algum titular ficou suspenso/lesionado ----
   Chamada após cada rodada E de novo, defensivamente, antes de iniciar a próxima
   partida ao vivo (startLiveRound) — garante que suspenso/lesionado NUNCA fique
   marcado como titular, mesmo que algum estado antigo/salvo tenha escapado da
   primeira correção. Prioriza repor por um reserva da MESMA posição; só usa
   outra posição se não sobrar ninguém disponível daquela posição no banco. */
function fixUserXIAvailability(){
  if(!S.xi || !S.xi.length) return;
  const sq=squad(CL.clubId);                                    // S.xi = pids
  const out=S.xi.filter(pid=>{ const p=sq.find(x=>x.pid===pid); return p && (p.suspended>0 || p.injuredMatches>0); });
  if(!out.length) return;
  const avail=sq.filter(p=>!(p.suspended>0)&&!(p.injuredMatches>0));
  const inXi=new Set(S.xi);
  const bench=avail.filter(p=>!inXi.has(p.pid)).sort((a,b)=>b.f-a.f);
  const fixedXi=S.xi.slice();
  out.forEach(pid=>{
    const p=sq.find(x=>x.pid===pid); const idx=fixedXi.indexOf(pid); if(idx<0) return;
    let subIdx=bench.findIndex(b=>b.s===(p&&p.s));
    if(subIdx<0) subIdx=0; // sem reserva da mesma posição -> qualquer reserva disponível (emergência)
    const sub=bench.splice(subIdx,1)[0];
    if(sub) fixedXi[idx]=sub.pid;
  });
  S.xi=fixedXi;
  // out são PIDS (S.xi = pids), não nomes. Mapeia cada pid pro jogador e usa o sobrenome —
  // antes fazia pid.split(' ') e mostrava o ID cru no aviso de suspensão/lesão.
  const names=out.map(pid=>{ const p=sq.find(x=>x.pid===pid); return p ? p.n.split(' ').slice(-1)[0] : null; }).filter(Boolean).join(', ');
  toastC('⚠ '+names+' fora do próximo jogo — escalação ajustada automaticamente.');
}
/* atualiza a tabela das outras 3 divisões (que rodam em paralelo, só pra ambientação)
   com os resultados que acabaram de ser simulados nesta rodada */
function applyOtherDivResults(RL){
  if(!S.otherDivs) return;
  RL.matches.forEach(m=>{
    if(m.user) return; // a partida do usuário já é tratada por playRound()
    const od=S.otherDivs[m.div]; if(!od || !od.table[m.h] || !od.table[m.a]) return;
    const th=od.table[m.h], ta=od.table[m.a];
    th.P++; ta.P++; th.GF+=m.hg; th.GA+=m.ag; ta.GF+=m.ag; ta.GA+=m.hg;
    if(m.hg>m.ag){ th.W++; th.Pts+=3; ta.L++; } else if(m.hg<m.ag){ ta.W++; ta.Pts+=3; th.L++; } else { th.D++; ta.D++; th.Pts++; ta.Pts++; }
  });
}
/* ---- Fase 2 Etapa A (auditoria server-side): retrato do elenco JUSTO ANTES de
   advancePlayerAvailability()/playRound() mexerem em energia/moral/suspensão — é
   exatamente o estado que o motor usou pra simular a partida em startLiveRound().
   Só os campos que ratings()/simulateMatch() realmente consomem. ---- */
function snapshotSquadForAudit(clubId){
  return squad(clubId).map(p=>({n:p.n,f:p.f,s:p.s,energy:p.energy,moral:p.moral,behavior:p.behavior,suspended:p.suspended,injuredMatches:p.injuredMatches}));
}
function finishLiveRound(){
  CL._postRoundSeats=null; // reset da rotação de classificação (o caminho hotseat a preenche antes do commit)
  const RL=CL.live; const uf=userFixture(); let userResult=null;
  let _auditPayload=null;
  if(uf){ const um=RL.matches.find(m=>m.h===uf[0]&&m.a===uf[1]);
    // gols de pênalti (type:'penalti', scored:true) contam no placar (hg/ag) desde sempre,
    // mas ficavam de fora daqui — o filtro só pegava type==='gol' — então o artilheiro
    // sumia da artilharia e das estatísticas dele mesmo tendo balançado a rede de verdade.
    // caps/matchMinutes = súmula de minutos em campo (ver liveCaps): é o que faz nota, energia,
    // moral e evolução enxergarem quem foi substituído e quem entrou do banco.
    if(um) userResult={hg:um.hg,ag:um.ag,perf:um.perf,scorers:um.events.filter(e=>e.type==='gol'||(e.type==='penalti'&&e.scored)).map(e=>({name:e.scorer,id:e.team})),
      caps:{H:liveCaps(um,'H'),A:liveCaps(um,'A')}, matchMinutes:liveMatchMinutes(um)};
    // payload de auditoria (Fase 2 Etapa A) — só online, e só se a partida do usuário
    // realmente rolou nesta rodada (uf). Capturado AGORA (elenco ainda intocado por
    // advancePlayerAvailability/playRound abaixo) pra bater com o que o motor usou.
    if(um && CL.online){
      const isUserSide=e=>(e.side==='H'&&uf[0]===CL.clubId)||(e.side==='A'&&uf[1]===CL.clubId);
      _auditPayload={
        gameId: NET.gameId, round: S.round, h: uf[0], a: uf[1], submitterClubId: CL.clubId,
        tactic: S.tactic, seed: S.seed,
        xiKickoff: (S.clubXI && S.clubXI[CL.clubId]) || (S.xi||[]).slice(),
        penaltyChoices: um.events.filter(e=>e.type==='penalti'&&e._resolved&&isUserSide(e)).map(e=>({min:e.min,takerName:e.scorer})),
        squadH: snapshotSquadForAudit(uf[0]), squadA: snapshotSquadForAudit(uf[1]),
        clientResult: userResult,
      };
    }
  }
  // receita de bilhetes do jogo do usuário em casa — só pro toast de feedback; o valor já
  // entra no caixa via processFinances()/pushFinanceEntry() (ver core.js), que lê o mesmo
  // CL.live.matches e loga isso na aba Finanças, então NÃO soma direto no S.budget aqui
  // (fazia isso duas vezes: aqui E de novo na renda-base da rodada).
  let gate=0; if(uf && uf[0]===CL.clubId){ const um=RL.matches.find(m=>m.h===uf[0]&&m.a===uf[1]); if(um){ gate=um.att*um.price; CL.lastAtt=um.att; } }
  CL.lastGate=gate;
  // CL.lastGate é zerado logo depois pelo toast da bilheteira; a tela "À espera da
  // rodada" precisa do valor DEPOIS disso, então ele fica guardado aqui também.
  CL._ultimaRenda={ att:CL.lastAtt||0, gate };
  // FASE 2 (hotseat solo): se há OUTROS humanos com jogo nesta rodada, cada um joga a SUA
  // partida ao vivo (passando o aparelho) ANTES de commitar a rodada. Guarda o contexto do
  // manager 1 e enfileira; ao esvaziar a fila, _commitLeagueRound roda com os resultados deles.
  const hq = hasSecondaryHumans() ? buildHumanQueue(uf) : [];
  if(hq.length){
    CL._hotseat={ primaryRL:RL, userResult, audit:_auditPayload, humanResults:{},
      allEvents:RL.matches.flatMap(m=>m.events||[]), queue:hq,
      prevClub:CL.clubId, prevXI:(S.xi||[]).slice(), prevTactic:S.tactic };
    startNextHotseatMatch();
    return;
  }
  // ===== SAVE ÚNICO (online) — NÃO-BLOQUEANTE: publico o MEU resultado real e VOLTO LIVRE pra tela
  // principal. Ninguém fica preso numa tela de espera. Quem FECHA a rodada é só o ANFITRIÃO, quando
  // ninguém está mais em partida (busy limpo, com teto de 90s) — daí ele resolve a rodada uma vez
  // (resultados reais de todos; ausentes simulados) e persiste. Os convidados só ESPELHAM (reconcile).
  if(CL.online && typeof NET!=='undefined' && NET.publishResult){
    const um = uf ? RL.matches.find(m=>m.h===uf[0]&&m.a===uf[1]) : null;
    // FASE 3B: visitante de partida transmitida SÓ publica se o stream terminou (o resultado que
    // assisti é o oficial do mandante — publicá-lo é o backup caso o mandante caia antes de
    // publicar). Stream incompleto -> marcador de folga (o servidor resolve com o stream do apito).
    const streamIncomplete = um && um.streamRemote && !um.streamDone;
    const myResult = (uf && userResult && !streamIncomplete) ? { h:uf[0], a:uf[1], hg:userResult.hg, ag:userResult.ag,
      scorers:userResult.scorers||[], perf:userResult.perf||null, events:(um&&um.events)||[],
      caps:userResult.caps||null, matchMinutes:userResult.matchMinutes||null, // súmula de minutos (ver liveCaps)
      decisions:(um&&um.sim&&um.sim.decisions)||((um&&um.streamResult&&um.streamResult.decisions))||[] } : null; // Fase 3A/3B: log de decisões viaja junto
    NET.publishResult(S.round, myResult || { h:null, a:null, bye:true }); // marcador de folga não trava nada
    if(NET.isHost){ CL._hostPendingCommit = { RL, userResult, audit:_auditPayload, round:S.round, uf }; }
    // F3.3: guarda os inputs de finança do MEU clube pra aplicar ao ADOTAR a rodada do servidor
    // (o servidor não computa finanças; cada humano aplica as suas). gate = bilheteria já capturada.
    const startedNames = ((S.clubXI && S.clubXI[CL.clubId]) || S.xi || []).slice();
    // guardado em S (não CL) e salvo AGORA: CL é só memória — se a aba fechar/recarregar entre o
    // fim da MINHA partida e o reconcile (que só acontece quando a rodada fecha, podendo levar um
    // tempo), o pendente se perdia pra sempre e a rodada nunca creditava salário/receita nem
    // debitava a folha, sem aviso nenhum. Em S sobrevive a um recarregamento (Object.assign do
    // reconcile não apaga chave que não existe no estado do servidor — é um campo só meu).
    S._pendingRoundFin = { userResult, uf, gate:CL.lastGate||0, startedNames, round:S.round };
    save();
    onlineReturnFreeAfterMatch(); // volta LIVRE pra tela principal (não bloqueia)
    return;
  }
  _commitLeagueRound(RL, userResult, {}, RL.matches.flatMap(m=>m.events||[]), _auditPayload);
}
/* pequeno helper de relógio (Date.now indireto pra não quebrar harness/replay determinístico) */
function nowMs(){ try{ return Date.now(); }catch(e){ return 0; } }
/* volta LIVRE pra tela principal depois da minha partida (online, save único). Sem tela de espera:
   fico livre pra gerenciar. O fechamento da rodada é do anfitrião (onlineHostCloseRound) e o
   avanço/reabertura segue soberano pelo cronômetro (reopen_ready quando ninguém está busy). */
/* TELA DE ESPERA pós-partida (online). Antes caía direto no 'main', que ainda mostrava a rodada
   ANTIGA (a rodada só avança quando o servidor fecha) — e só DEPOIS vinha a classificação, deixando
   a ordem das telas errada: time(rodada 3) -> ranking -> time(rodada 4). Agora fica aqui até a
   rodada resolver; o adopt/reconcile leva pra classificação e daí pro time já na rodada nova.
   NÃO pode ser a tela 'live': o heartbeat de "ocupado" liga com CL.screen==='live' e o servidor
   não fecha a rodada enquanto alguém está ocupado — ficaria em deadlock. Tem escape manual
   (clWaitRoundSkip) pra ninguém ficar preso se algo travar do outro lado. */
function scWaitRound(){
  ensureSyncFunTicker();
  // DUAS TELAS PORTADAS PRO MESMO ESTADO (telas/Resenha - Pausa Patrocinada e
  // Resenha - A Espera da Rodada). A janela de 10s do patrocinador é a PAUSA;
  // passada ela, se o que falta são os OUTROS treinadores, a tela vira a sala
  // de espera — que é onde a informação útil é quem já jogou, não a barra.
  let faltaGente=false;
  if(CL.online && typeof NET!=='undefined' && NET.allHumanResultsIn){
    try{ faltaGente=!NET.allHumanResultsIn(S.round); }catch(e){ faltaGente=false; }
  }
  return (pausaOvertime() && faltaGente) ? rfEsperaHTML() : rfPausaHTML();
}
function scWaitRoundLegado(){

  ensureSyncFunTicker();
  const g=pausaGif(), n=(CL._pausaI||0)%PAUSA_GIFS.length;
  return `<div class="rf-view">
    <div class="rf-stephead">
      <span class="rf-steptitle">⏸ Pausa técnica</span>
      <span class="rf-stepmid">Sincronizando a rodada com todos os treinadores</span>
      <span class="rf-steppill" id="rf-clock">${pausaOvertime()?'⏳':'00:'+String(pausaLeft()).padStart(2,'0')}</span>
    </div>
    <div class="rf-content">
      <div class="rf-stage">
        <div class="rf-gifbox">
          <span class="rf-room"></span><span class="rf-roomtint"></span>
          <div class="rf-tv">
            <div class="rf-tvscreen">
              <img class="rf-gifbg" id="rf-gifbg" src="${g.src}" alt="" aria-hidden="true">
              <img class="rf-gif" id="rf-gif" src="${g.src}" alt="">
              <span class="rf-tvglass"></span>
            </div>
            <img class="rf-tvimg" src="img/sync/tv.webp" alt="">
          </div>
        </div>
        <div class="rf-gifcap"><span class="rf-gifnum" id="rf-gifnum">${n+1}/${PAUSA_GIFS.length}</span><span id="rf-gifcap">${escC(g.cap)}</span></div>
      </div>
      <div class="rf-rail">
        <div class="rf-panel rf-panel-joke">
          <div class="rf-ptitle">💬 Resenha dos anos 90</div>
          <p class="rf-joke" id="rf-joke">${escC(pausaJoke())}</p>
        </div>
        <div class="rf-panel">
          <div class="rf-ptitle">🔄 O que está sendo atualizado</div>
          <div id="rf-check">${pausaChecklist()}</div>
        </div>
      </div>
    </div>
    <div class="rf-progstrip">
      <div class="rf-proghead">
        <span class="rf-proglabel" id="rf-proglabel">${escC(pausaWaitLabel())}</span>
        <span class="rf-progpct" id="rf-pct">${pausaOvertime()?'⏳':pausaPct()+'%'}</span>
      </div>
      <div class="rf-progtrack"><div class="rf-progfill" id="rf-fill" style="width:${pausaPct()}%"></div></div>
      <div id="cl-ad-skip" class="rf-skiprow" style="display:${CL._adCont?'':'none'}">${btn('Pular publicidade','clAdSkip()',{icon:'⏭',cls:'cl-btn'})}</div>
      <!-- SAÍDA DE EMERGÊNCIA: o botão acima só aparece quando a rodada JÁ sincronizou (CL._adCont).
           Se o fechamento da rodada trava (anfitrião offline, resolve-round falhando), o jogador
           fica preso aqui. Antes este botão era "Voltar ao meu time", e ele MENTIA: devolvia a tela
           do clube ainda na rodada VELHA (a rodada só avança quando o servidor fecha), então o
           jogador saía da pausa pra uma tela desatualizada e continuava dessincronizado, agora sem
           nem saber disso. Agora o caminho é o certo: sincronizar de verdade com a sala. -->
      <div id="cl-wait-escape" class="rf-skiprow" style="display:${pausaStuck()?'':'none'}">${btn('Sincronizar a Resenha','clResenhaSync()',{icon:'🔄',cls:'cl-btn-ok'})}</div>
    </div>
    <div class="rf-sponsor">
      <div class="rf-sponlabel"><b>Patrocínio oficial</b><span>Quem banca a resenha</span></div>
      <div class="rf-spontrack"><div class="rf-sponrun">${adTilesHTML()}${adTilesHTML()}</div></div>
    </div>
  </div>`;
}
/* clWaitRoundSkip saiu junto com o botão "Voltar ao meu time" (ver scWaitRound): a única coisa
   que ele fazia era trocar pra 'main' com a rodada ainda velha. Quem quer pular a publicidade
   usa clAdSkip direto, que é o outro botão desta mesma barra. */
function onlineReturnFreeAfterMatch(){
  if(CL._liveTimer) clearTimeout(CL._liveTimer);
  CL._playedRound=S.round; // marca que JÁ joguei esta rodada — não re-simulo (evita loop na mesma rodada)
  if(typeof onlineMarkStageDone==='function') onlineMarkStageDone(); // etapa cumprida em definitivo (ver onlineStageDone)
  CL.live=null; CL.subsUsed=0; CL._liveBusy=false;
  _prLog('onlineReturnFreeAfterMatch -> waitround');
  CL._waitSince=nowMs();                     // base dos 10s da pausa (relógio + barra + gate)
  CL._adCont=null; CL._roundSyncedAt=0; if(CL._adT){ clearTimeout(CL._adT); CL._adT=null; }
  CL._pausaI=Math.floor(Math.random()*PAUSA_GIFS.length); CL._pausaTick=0;   // começa num GIF aleatório
  if(CL._syncFunT){ clearInterval(CL._syncFunT); CL._syncFunT=null; }        // realinha o ciclo com a entrada
  CL.screen='waitround'; CL.tab='jogo'; CL.selPlayer=squad(CL.clubId)[0]?.pid||CL.selPlayer; cdraw();
  if(CL.lastGate){ toastC('Bilheteira: +'+grp(CL.lastGate)+' reais'); CL.lastGate=0; }
  // NÃO reabro a próxima rodada aqui: quem fecha e reabre a rodada é o ANFITRIÃO, DEPOIS de resolver
  // (onlineHostCloseRound). Reabrir antes do commit fazia a fase ciclar e travava/loopava a rodada.
}
/* ANFITRIÃO fecha a rodada online: quando NENHUM humano está mais em partida (busy limpo — teto de
   90s no servidor, então não trava), resolve a rodada UMA vez com os resultados publicados por todos
   (ausentes são simulados dentro do playRound) e persiste. Chamado pelo onlineTimerLoop. */
function onlineHostCloseRound(){
  const pc=CL._hostPendingCommit; if(!pc) return;
  if(typeof NET==='undefined' || !NET.isHost){ CL._hostPendingCommit=null; return; }
  if(pc.round!==S.round){ CL._hostPendingCommit=null; return; } // já resolvida por outro caminho
  const room=NET.room; if(!room) return;
  const round=pc.round;
  // busy lido FRESCO dos assentos: room.participants congela o busy no instante do último merge
  // (netMergeParticipants) e, se nenhum evento do realtime chegar depois, um "true" velho ficava
  // pra sempre — o anfitrião esperava um jogador que já tinha saído da partida e a sala inteira
  // parava na pausa técnica. O busy_until é timestamp: comparado agora, expira sozinho.
  /* ===== ITEM 3: QUEM DIZ QUE A RODADA FOI CUMPRIDA É O SERVIDOR =====
     Até aqui o anfitrião decidia sozinho a hora de fechar, por dois palpites LOCAIS: "ninguém está
     com o busy aceso" e "os resultados que eu enxergo já chegaram". Os dois são fotos do instante —
     e foi exatamente delas que nasceram as salas paradas e as rodadas descasadas: bastava um
     cliente estar entre duas telas para o anfitrião ler "todo mundo livre" e fechar por cima de
     quem ainda não tinha jogado.
     Agora a decisão tem uma fonte só: o ponteiro do dia. Cada assento CARIMBA o momento que
     cumpriu (ver roomDayTick); quando o último carimba 'jogando', o SERVIDOR — e mais ninguém —
     vira o momento para 'classificacao'. Ver esse momento no ponteiro é o único sinal de que a
     rodada foi de fato jogada por todos, e é ele que libera o fechamento aqui.
     Sala sem plano de dias (save antigo) continua no caminho de antes: degrada, não trava. */
  const _dia = (NET.room && NET.room.day) || null;
  if(_dia){
    /* UMA PORTA SÓ: o dia de LIGA desta rodada com o momento já em 'classificacao' — o servidor
       dizendo que todos cumpriram a partida. Havia duas, porque existia a "quarta de copa" como um
       fechamento à parte; ela acabou (ver docs/sincronia-resenha.md). As copas da rodada são
       resolvidas neste mesmo fechamento, como sempre foi antes da divisão em dois estágios. */
    const portaAberta = (_dia.round===round && _dia.comp==='liga' && _dia.moment==='classificacao');
    if(!portaAberta){
      if(!CL._hostCloseWaitLog || CL._hostCloseWaitLog!==_dia.idx+':'+_dia.moment){
        CL._hostCloseWaitLog=_dia.idx+':'+_dia.moment;
        _prLog('HOST closeRound: o ponteiro ainda está em '+_dia.comp+'/'+_dia.moment+
               ' (jornada '+_dia.round+') — esperando o último carimbo, sem fechar por palpite');
      }
      return;                      // a pendência só é consumida lá embaixo: ela continua de pé
    }
  } else {
    // CAMINHO ANTIGO (sala sem ponteiro): o busy dos assentos como barreira.
    const _now=nowMs(), _cl=(typeof NET!=='undefined' && NET._claimed)||{};
    let anyBusy=false;
    for(const uid in _cl){ const c=_cl[uid];
      if(c && c.busy_until && new Date(c.busy_until).getTime()>_now){ anyBusy=true; break; } }
    if(anyBusy){ CL._hostCloseSince=0; return; } // espera todos saírem da partida (teto de 90s do busy)
  }
  // todos saíram da partida mas falta resultado de alguém. Dois casos MUITO diferentes:
  // - o jogador CAIU (aba fechada): 3s de carência e fecha, simulado como ausente — como sempre.
  // - o jogador está PRESENTE (heartbeat de presença fresco) e só ainda não jogou — típico de
  //   semana de copa: ele navegava nas telas pós-copa quando a rodada de liga começou. Fechar em
  //   3s fazia a rodada dele rodar em segundo plano SEM ele assistir (bug de produção, 31/jul).
  //   Presente ganha até 120s pra partida dele começar/terminar (o busy segura o resto do tempo).
  if(typeof NET!=='undefined' && NET.allHumanResultsIn && !NET.allHumanResultsIn(round)){
    if(!CL._hostCloseSince) CL._hostCloseSince=nowMs();
    const presente = NET.anyMissingResultOnline && NET.anyMissingResultOnline(round);
    // Carência SÓ pro publish assíncrono aterrissar (~1-2s): 4s presente, 2s ausente. Quem está de
    // fato jogando é coberto pelo anyBusy acima — esta carência nunca foi proteção de partida, era
    // só margem de rede, e como espera cega ela virou boa parte do tempo parado na pausa.
    if(nowMs()-CL._hostCloseSince < (presente?4000:2000)) return;
  }
  CL._hostCloseSince=0;
  CL._hostPendingCommit=null;
  const map = (typeof NET!=='undefined' && NET.collectHumanResults) ? NET.collectHumanResults(round, null) : {};
  const uf=pc.uf; const myKey = uf ? uf[0]+'-'+uf[1] : null;
  const userResultAuth = (myKey && map[myKey]) ? map[myKey] : pc.userResult; // mandante-autoritativo
  const allEvents = Object.values(map).flatMap(r=>r.events||[]);
  // CUTOVER (F3.5): o SERVIDOR resolve a rodada (edge function resolve-round) — autoridade única
  // (liga + outras divisões + copas + virada de temporada). Fallback pro caminho local se a função
  // falhar. Os convidados espelham o estado do servidor pelo onlineReconcileIfBehind, como sempre.
  if(typeof NET!=='undefined' && NET.resolveRound){
    (async ()=>{
      // ESTÁGIO: fechando a quarta-feira, o servidor resolve SÓ as copas e devolve a semana no
      // estágio de sábado; fechando o sábado, resolve a rodada inteira como sempre. Estado sem
      // roundStage (save antigo) cai no caminho de sempre — stage indefinido = 'league'.
      const _stage=undefined;   // não existe mais quarta/sábado: um fechamento por rodada (ver docs/sincronia-resenha.md)
      let res=null; try{ res=await NET.resolveRound(round, _stage); }catch(e){ res={error:(e&&e.message)||'erro'}; }
      if(!res || res.error){
        // NUNCA MAIS COMITAR LOCALMENTE. Aqui havia um fallback que chamava _commitLeagueRound —
        // ou seja, playRound() na MINHA máquina — quando o resolve-round falhava. O efeito medido
        // em produção: eu avançava sozinho pra rodada seguinte enquanto o servidor e todos os
        // outros ficavam na anterior (dois humanos na 8ª, um na 9ª). E não havia volta:
        // onlineReconcileIfBehind só puxa quem está ATRÁS da sala, então quem passou à frente do
        // estado autoritativo ficava divergente pra sempre.
        // O servidor é autoridade única desde o cutover F3.5; falha dele é pra ser REPETIDA, não
        // contornada. Tenta de novo no próximo tique (o fechamento é idempotente por state_version)
        // e, se insistir, oferece a sincronia — que é o caminho de volta que existe hoje.
        CL._closeFails=(CL._closeFails||0)+1;
        console.warn('resolveRound falhou ('+CL._closeFails+'x):', res&&res.error, '— a rodada continua aberta, sem comitar local');
        _prLog('HOST closeRound: servidor falhou -> vai tentar de novo (sem commit local)');
        CL._hostPendingCommit=pc;        // devolve a pendência: o laço tenta fechar de novo
        CL._hostCloseSince=0;
        if(CL._closeFails>=4 && typeof clResenhaSync==='function' && CL._syncOffered!==S.round){
          toastC('⚠ O servidor não está fechando a rodada. Vamos sincronizar a sala.');
          clResenhaSync();
        }
      } else {
        CL._closeFails=0;
        _prLog('HOST closeRound: servidor OK -> onlineAdoptServerRound');
        await onlineAdoptServerRound(pc.RL); // adota o estado resolvido pelo servidor + UI pós-rodada
      }
      if(typeof NET!=='undefined' && NET.reopenReady) NET.reopenReady();
    })();
    return;
  }
  _commitLeagueRound(pc.RL, userResultAuth, map, allEvents, pc.audit); // (sem edge function) resolve + persiste local
  if(typeof NET!=='undefined' && NET.reopenReady) NET.reopenReady();
}
/* F3.5: adota no cliente o estado que o SERVIDOR acabou de resolver (games.shared_state) e mostra a
   UI pós-rodada (classificação, sorteio de copa, eventos de treinador). Espelha a cauda de
   _commitLeagueRound, mas SEM recalcular a rodada (o servidor já fez tudo — inclusive outras divisões,
   copas e a virada de temporada). Job security/eventos de treinador são carreira do cliente, então
   seguem aqui. applyViewerDivision põe a divisão do próprio clube como âncora (temporada 2+). */
/* F3.3: aplica as finanças da rodada do PRÓPRIO clube (salários + receita base + bilheteria + bônus),
   uma vez por rodada, usando os inputs capturados no finishLiveRound (gate = bilheteria já lida do
   CL.live). O servidor NÃO computa finanças — cada humano aplica as suas e publica o caixa no assento
   (senão o reconcile voltaria o valor inicial do shared_state). Chamado por host (adopt) e convidado
   (reconcile), pra os dois lados aplicarem a própria rodada. */
/* ONLINE: cota de fase da Copa do Brasil quando foi o SERVIDOR quem decidiu o meu confronto
   (eu ausente — o resolve-round simula a partida). O servidor carimba t.prize mas NÃO mexe no
   caixa de humano, porque a autoridade desse caixa é o assento (game_seats.budget), escrito só
   pelo meu cliente. Então o crédito sai daqui, ao adotar a rodada. Dois freios contra pagar duas
   vezes: (1) só confronto carimbado com a rodada que acabou de ser resolvida, e (2) um registro
   em memória no CL — que é por-cliente e nunca viaja no shared_state (um contador dentro de S
   vazaria do anfitrião pros convidados no adopt). Quando EU jogo a partida ao vivo, quem paga é
   finishCupLiveMatch e este caminho não acha nada pendente. */
function applyMyCupPrizes(){
  if(!S || !S.cups || !CL.clubId) return;
  const cb=S.cups.copaBrasil; if(!cb) return;
  CL._cupPrizesPaid=CL._cupPrizesPaid||{};
  const ties=[].concat(cb.ties||[], (cb.history||[]).flatMap(h=>h.ties||[]));
  ties.forEach(t=>{
    if(!t || !t.prize || t.jornada!==S.round) return;             // só a rodada recém-adotada
    const meu=(t.prize.pagos||[]).find(x=>x && x.id===CL.clubId); if(!meu || !meu.amt) return;
    const chave=(t.h||'')+'|'+(t.a||'')+'|'+(t.prize.round!=null?t.prize.round:'?');
    if(CL._cupPrizesPaid[chave]) return;
    CL._cupPrizesPaid[chave]=true;
    S.budget=(S.budget||0)+meu.amt; commitBudget();
    if(typeof pushFinanceEntry==='function') pushFinanceEntry({income:meu.amt, log:['🏆 Copa do Brasil — cota de fase: +'+fmt(meu.amt)]});
    toastC('🏆 Cota da Copa do Brasil: +'+fmt(meu.amt));
  });
}
function applyOwnPendingFinances(){
  const f=S._pendingRoundFin; if(!f) return; S._pendingRoundFin=null;
  try{
    if(typeof processFinances==='function') processFinances(f.userResult, f.uf, new Set(f.startedNames||[]), f.gate||0);
    commitBudget();                    // write-back no mundo local + persiste no assento (caminho único)
  }catch(e){ console.warn('finanças da rodada:', e); }
}
async function onlineAdoptServerRound(RL){
  _prLog('onlineAdoptServerRound: entrou (vai sobrescrever S com o shared_state)');
  showSyncLoading(); // ver definição: evita a tela principal "velha" piscar antes da classificação
  let isTurnover=false;
  const _roundAntes=(S&&S.round)||0;
  try{
    const saved = await NET.loadGame();
    CL._adoptedVer=(typeof NET!=='undefined' && NET._loadedVersion)||CL._adoptedVer||0; // versão do estado que acabei de adotar
    if(saved && saved.S){
      const oldSeason = S.season||0;
      /* ===== A VIRADA E "AINDA NAO VI ESTA TEMPORADA", NAO "O NUMERO ACABOU DE MUDAR" =====
         `season > oldSeason` so e verdade para quem estiver a olhar no INSTANTE em que o numero
         muda. Basta o estado novo ter sido adotado por outro caminho antes deste — e ha varios
         (o reconcile, o watch da rodada sem liga, uma sincronia manual) — para este teste dar
         falso e a tela de fim de temporada nunca aparecer. Foi o relatado pelo anfitriao a
         19/08/2026: a temporada virou e ele nao viu nada.
         O carimbo e por cliente e por temporada, entao a tela aparece uma vez e so uma. */
      const novaTemporada=(saved.S.season||0);
      /* a primeira adocao ANCORA no que eu ja tinha, em vez de disparar: sem isto, entrar numa
         sala a meio da temporada mostrava a tela de fim de temporada logo a chegada. */
      if(CL._fimTemporadaVisto==null) CL._fimTemporadaVisto=oldSeason;
      isTurnover = novaTemporada>CL._fimTemporadaVisto;
      if(isTurnover) CL._fimTemporadaVisto=novaTemporada;
      const _career=(typeof snapshotCareer==='function')?snapshotCareer():null; // carreira é minha, não do anfitrião (ver CAREER_KEYS)
      Object.assign(S, saved.S);
      if(typeof restoreCareer==='function') restoreCareer(_career);
      S.clubId = CL.clubId;
      if(typeof applyViewerDivision==='function') applyViewerDivision(CL.clubId);
      S.xi = resolveClubXI(CL.clubId);
      if(typeof syncDataClubsFromState==='function') syncDataClubsFromState();
      if(typeof pruneAppliedNetTransfers==='function') pruneAppliedNetTransfers(); // solta as transferências que o servidor já aplicou
      if(typeof pruneAppliedNetOffers==='function') pruneAppliedNetOffers();       // idem pras propostas mandadas a outro humano
      if(typeof pruneAppliedNetCounters==='function') pruneAppliedNetCounters(); // idem pras contrapropostas
      if(typeof pruneAppliedNetOfferDrops==='function') pruneAppliedNetOfferDrops(); // idem pras baixas de proposta
      if(typeof restoreMyFinances==='function') restoreMyFinances();               // meu log de finanças por cima do que veio do anfitrião
      // rede de segurança: foto do estado ao fim da rodada (ver autosave.js). Idempotente por
      // (temporada, rodada), então chamar de mais de um caminho de adoção não duplica nada.
      if(typeof autoSaveAoFecharJornada==='function') autoSaveAoFecharJornada();
      if(typeof settleMyOutgoingOffers==='function') settleMyOutgoingOffers(); // debita o caixa se alguma proposta MINHA foi aceita
      if(typeof persistCareer==='function') persistCareer();   // a carreira mudou nesta rodada: grava no meu assento
    }
  }catch(e){ console.warn('adotar estado do servidor:', e); }
  applyOwnPendingFinances(); // F3.3: aplica as finanças da MINHA rodada (o servidor não computa finanças)
  applyMyCupPrizes();        // cota de fase da Copa do Brasil decidida pelo servidor (ver applyMyCupPrizes)
  if(typeof fixUserXIAvailability==='function') fixUserXIAvailability();
  if(!S.finished && typeof tickJobSecurity==='function'){ tickJobSecurity(); const je=checkManagerJobEvent(); if(je) CL._pendingManagerEvent=je; }
  if(isTurnover){
    // VIRADA: NÃO mostra a classificação pós-rodada (tabela nova zerada + o cliente ficava preso nela,
    // travando o outro em "esperando"). Vai direto pro main, pronto pra jogar a rodada 1 da temporada nova.
    CL._postRoundSeats=null; CL._playedRound=-1; CL.screen='main'; CL.tab='jogo';
    // premiação do PRÓPRIO clube (posição + prêmios que EU recebi) — cada humano vê o SEU resumo,
    // lido de S._prevSeason. Credita meu caixa ANTES do cdraw (não perde o dinheiro se o desenho
    // falhar); o servidor não credita prêmio, igual às finanças por-humano.
    const _sum=(typeof applyMyPrevSeasonPrizes==='function')?applyMyPrevSeasonPrizes():null; if(typeof accrueCareerStats==='function') accrueCareerStats();
    // registra os TÍTULOS da temporada que fechou — na Resenha o endSeason() do cliente
    // (que sempre fez isso) nunca roda: quem vira a temporada é o servidor.
    if(typeof registerPrevSeasonTitles==='function') registerPrevSeasonTitles();
    queueSeasonCupDrawsIfNew(); // virada: enfileira o sorteio da copa NOVA (mostra na 1ª semana da temporada nova)
    hideSyncLoading();
    cdraw();
    // MOMENTOS DE FIM DE TEMPORADA (título / artilheiro / acesso ou queda) vêm ANTES da sala de
    // imprensa e um de cada vez; a coletiva entra quando a fila esvazia.
    if(typeof enfileirarMomentosFimDeTemporada==='function') enfileirarMomentosFimDeTemporada();
    momentoSeguinte(()=>openPressRoom(_sum));
    return;
  }
  queueSeasonCupDrawsIfNew(); // todo cliente enfileira o sorteio da copa recém-sorteada (não só o host)
  // FECHAMENTO DA QUARTA-FEIRA: só as copas foram resolvidas, a RODADA NÃO MUDOU. Mostrar a
  // classificação da liga aqui seria mostrar a tabela da rodada que ainda nem foi jogada — e a
  // pausa técnica pós-rodada também não cabe. Passa direto pra tela do clube, que é onde o jogador
  // decide a escalação do jogo de sábado. Os sorteios de copa seguem valendo (a chave do mata-mata
  // pode ter acabado de sair na quarta) — por isso eles ficam ANTES desta saída.
  if((S.round||0)===_roundAntes){
    checkPendingCupDraws(()=>{
      hideSyncLoading();
      // LIBERA A RODADA DE LIGA DESTA MESMA RODADA — mas SÓ se eu ainda não a joguei.
      // Este ramo é "a rodada voltou igual", e isso acontece em dois casos bem diferentes: o
      // fechamento da quarta (copas resolvidas, a liga ainda por jogar) e um fechamento
      // IDEMPOTENTE, quando o cão de guarda (onlineOrphanCloseCheck) reexecuta o resolve-round de
      // uma rodada que já estava fechada. Zerar o marcador sem olhar quem eu sou fazia o segundo
      // caso mandar de volta pra rodada que eu ACABEI de jogar: onlineRunRound via
      // _playedRound!==S.round e re-simulava tudo, publicava de novo, o host fechava de novo — o
      // jogo repetindo a mesma rodada várias vezes.
      if(CL._playedRound!==S.round) CL._playedRound=-1;
      // RODADA COLETIVA: fechada a quarta, a classificação de cada copa que entrou em campo
      // aparece pra TODO MUNDO — e este é o momento em que ela é a mesma pra todos, porque o
      // estado já é o que o servidor resolveu. Quem jogou a competição e já leu a chave logo
      // depois do apito não repete a tela (ver cupClassifWasShown); quem não disputa vê aqui,
      // com o painel de dicas + patrocinador no lugar da faixa de resultado.
      queueRoundCupClassifs(S.round, ()=>{ CL.screen='main'; CL.tab='jogo'; cdraw(); });
    });
    return;
  }
  checkPendingCupDraws(()=>{
    hideSyncLoading();
    adGate(()=>{                                   // janela de publicidade: segura a classificação (ver adGate)
      // as copas da rodada vêm ANTES da tabela da liga — mesma ordem em que foram jogadas na
      // semana (quarta antes de sábado). Na semana de dois estágios elas já foram vistas no
      // fechamento da quarta e são puladas; aqui cobrem a semana que degradou pra um estágio só.
      queueRoundCupClassifs(_roundAntes, ()=>{
        const seats=CL._postRoundSeats||[]; CL._postRoundSeats=null;
        if(seats.length) startPostRoundClassifs(seats); else showLiveClassif();
        checkPendingManagerEvents();
        if(typeof handleResenhaCareer==="function") handleResenhaCareer(); // Fase 2: demissão/convite na Resenha
      });
    });
  });
}
/* commit de uma rodada de liga — extraído do fim de finishLiveRound pra ser reusado depois
   da fila de partidas hotseat (FASE 2). humanResults = {fxKey:{hg,ag,scorers,perf,events}}. */
function _commitLeagueRound(RL, userResult, humanResults, allEvents, _auditPayload){
  const _roundJogado=S.round;   // playRound() adianta o S.round; a rodada das copas é esta (ver queueRoundCupClassifs)
  // disciplina/lesões: cumpre suspensões pendentes e aplica os incidentes NOVOS desta rodada
  // (precisa vir ANTES de playRound() pra ratePlayers() enxergar S._roundIncidents)
  advancePlayerAvailability();
  applyMatchIncidents(allEvents);
  playRound(userResult, humanResults);
  applyOtherDivResults(RL);
  fixUserXIAvailability();
  // segurança no cargo do treinador: demissão ou proposta de outro clube, conforme desempenho
  // recente (não durante o resumo de fim de temporada, pra não conflitar com aquele modal)
  if(!S.finished){
    tickJobSecurity();
    const jobEvent=checkManagerJobEvent();
    if(jobEvent) CL._pendingManagerEvent=jobEvent;
  }
  // a tática/formação escolhida agora PERSISTE entre rodadas — antes forçava reescolher
  // toda vez (CL.tacticChosen=false), obrigando o usuário a voltar ao menu Seleccionar
  // a cada rodada só pra liberar o botão Jogar de novo. saveV3() já grava o estado atual.
  saveV3();
  // salva em Supabase se online
  if(CL.online && typeof NET!=='undefined' && NET.saveGame){
    commitBudget();   // write-back no mundo + publica no assento (só o write-back não bastava: o
                      // assento defasado voltava a vencer na adoção da rodada seguinte)
    (async ()=>{ await NET.saveGame({ S, round: S.round }); })().catch(e=>console.warn('Save Supabase:', e));
    // Fase 2 Etapa A: auditoria server-side em paralelo — só registra, nunca bloqueia
    // nem afeta a experiência do jogador (silenciosa mesmo se falhar/timeout).
    if(_auditPayload && typeof sb!=='undefined' && sb && sb.functions){
      sb.functions.invoke('verify-round-result', { body: _auditPayload }).catch(()=>{});
    }
  }
  // se a rodada acabou de decidir um sorteio de copa (Libertadores/Sul-Americana oitavas),
  // mostra a cerimônia ANTES da classificação — igual ao clássico "Sorteio dos jogos da taça".
  // Depois da classificação, se houver demissão/proposta pendente desta rodada, mostra o modal.
  queueSeasonCupDrawsIfNew(); // host (caminho local sem edge function): idem
  checkPendingCupDraws(()=>{
    // RODADA COLETIVA (solo e hotseat): as copas que entraram em campo nesta rodada mostram a
    // classificação delas ANTES da tabela da liga, mesmo pra quem não disputa a competição —
    // esse vê o painel de dicas + patrocinador. Ver queueRoundCupClassifs.
    // rede de segurança: foto do estado com a rodada já fechada (ver autosave.js)
    if(typeof autoSaveAoFecharJornada==='function') autoSaveAoFecharJornada();
    queueRoundCupClassifs(_roundJogado, ()=>{
      const seats=CL._postRoundSeats||[]; CL._postRoundSeats=null;
      if(seats.length) startPostRoundClassifs(seats); // cada humano vê a SUA classificação, em rotação
      else showLiveClassif();                          // solo de 1 humano: como sempre
      checkPendingManagerEvents();
      if(typeof handleResenhaCareer==="function") handleResenhaCareer(); // Fase 2: demissão/convite na Resenha
    });
  });
}
/* fecha uma partida de COPA jogada ao vivo — de propósito NÃO passa por finishLiveRound()/
   playRound(): aquilo é "avançar o mundo em uma rodada inteira" (salários, energia/moral/
   evolução de TODOS os elencos, S.round/S.week/S.day++, sorteio de mercado...). Uma partida
   de copa é só UMA partida a mais na mesma rodada — aplica só os efeitos dela (cartão/
   lesão/nota) e grava o resultado na própria copa, do mesmo jeito que advanceCupBracket/
   advanceGroupStageRound já fazem em segundo plano (ver os guards que fazem o avanço
   automático da mesma rodada pular essa partida específica, já resolvida aqui). */
/* SÚMULA DE MINUTOS de uma partida AO VIVO. Esta é a única partida do jogo com substituição, e
   é justamente onde o onze do fim mentia mais: quem saiu no intervalo não recebia nota, energia
   nem moral, e quem entrou aos 85' recebia tudo como se tivesse jogado os 90. A sessão do motor
   conta os minutos de quem está em campo (session.capsOf). Partida só transmitida (streamRemote,
   sem sessão local) não tem súmula — cai no comportamento antigo, que é o que dá pra saber dali. */
function liveCaps(m,side){ return (m&&m.sim&&m.sim.capsOf)?m.sim.capsOf(side):null; }
function liveMatchMinutes(m){ return (m&&m.sim&&(m.sim.totalMinutes||m.sim.minute))||90; }
/* Resolve o RESTANTE da rodada de uma copa assim que o usuário termina a partida dele, pra
   tabela/chave do pós-jogo já sair completa (era o relato: "só os meus pontos aparecem").
   Marca a competição como resolvida NESTA rodada de liga, senão advancePendingCups avançaria
   a copa uma segunda vez no mesmo sábado. Vale pra qualquer competição e qualquer país — o
   caminho é o mesmo em todos (advanceGroupStageRound / advanceCupBracket). */
function resolveCupRoundRest(key){
  if(!key || !S || !S.cups) return;
  const c=S.cups[key]; if(!c) return;
  if(WORLD_RULES.cupAlreadyResolved(S._cupResolvedRound, key, S.round)) return;   // folha única
  try{
    /* false = o avanco ESPEROU (falta o resultado publicado de um confronto de outro humano,
       ver advanceCupBracket) -- nada foi tocado, entao nada e marcado como resolvido: a proxima
       passada (ou o estado do servidor) completa. */
    let ok=true;
    if(key==='copaBrasil'){
      if(!cupIsFinished(c) && (c.ties||[]).length) ok=advanceCupBracket(c,'copaBrasil-r'+c.round,'copaBrasil')!==false;
    } else if(c.group && !c.bracket){
      // regra de resultado único: ver o bloqueio CPU×CPU dentro de advanceGroupStageRound (core.js)
      if(!c.group.finished) ok=advanceGroupStageRound(c.group, key+'-grupo-r'+c.group.round, key)!==false;
    } else if(c.bracket && !cupIsFinished(c.bracket) && (c.bracket.ties||[]).length){
      ok=advanceCupBracket(c.bracket, key+'-r'+c.bracket.round, key)!==false;
    }
    if(ok) S._cupResolvedRound=WORLD_RULES.markCupResolved(S._cupResolvedRound, key, S.round);
    else console.log('avanço da '+key+' aguarda resultado publicado de outro humano');
  }catch(e){ console.warn('resolveCupRoundRest('+key+'):', e && e.message); }
}
function finishCupLiveMatch(){
  const RL=CL.live, pending=RL.cup, m=RL.matches[0];
  applyMatchIncidents(m.events);
  const scorers=m.events.filter(e=>e.type==='gol'||(e.type==='penalti'&&e.scored)).map(e=>({name:e.scorer,id:e.team}));
  const Rm=makeRng(hashSeed(S.seed,'cuprate',pending.key,S.round,m.h,m.a));
  if(typeof recordScorers==='function') recordScorers(scorers, pending.key); // gol na PRÓPRIA partida de copa ao vivo também tem que contar em S.scorers (ver core.js)
  const mm=liveMatchMinutes(m);
  ratePlayers(m.h,m.hg,m.ag,scorers,Rm,m.perf&&m.perf.H,m.perf&&m.perf.A,liveCaps(m,'H'),mm); ratePlayers(m.a,m.ag,m.hg,scorers,Rm,m.perf&&m.perf.A,m.perf&&m.perf.H,liveCaps(m,'A'),mm);
  if(m.h===CL.clubId) S.budget=(S.budget||0)+(m.att*m.price); // bilheteria do mando de campo, igual à liga
  const compShort=COMP_DEFS[pending.key].short;
  let resultMsg;
  if(pending.stage==='bracket'){
    const t=pending.tie;
    t.hg=m.hg; t.ag=m.ag; t.events=m.events;
    // prorrogação/pênaltis (se houve) já rolaram AO VIVO na tela do usuário — ver
    // startExtraTime/startPenaltyShootout/liveTick — então aqui só empacota o que já
    // aconteceu, não recalcula nada. m.hg/m.ag já inclui os gols da prorrogação (os
    // eventos dela entraram na timeline normal da partida e foram contados igual a
    // qualquer gol do jogo).
    let winner, pens=null, wentToPens=false, wentToExtra=!!RL.cup.wentExtra;
    if(RL.pens){
      wentToPens=true; pens={h:RL.pens.finalH,a:RL.pens.finalA};
      winner = pens.h>pens.a ? t.h : t.a;
    } else {
      winner = m.hg>m.ag ? t.h : t.a; // liveTick garante m.hg!==m.ag antes de chegar aqui
    }
    t.winner=winner; t.pens=pens;
    t.jornada=S.round; // mesmo carimbo do avanço em segundo plano (advanceCupBracket) — Calendário
    // cota da fase: a MINHA partida de copa é decidida aqui, não no advanceCupBracket (que pula
    // confronto já resolvido), então o pagamento também precisa sair daqui. Idempotente por t.prize.
    if(typeof awardCupPhasePrize==='function') awardCupPhasePrize(pending.key, pending.bracket, t);
    const loser=winner===t.h?t.a:t.h; pending.bracket.eliminated[loser]=true;
    // Resenha (online): publica o resultado da MINHA partida de copa (mandante-autoritativo) —
    // o servidor (resolve-round) aplica na chave antes de simular o resto do bracket. Aditivo:
    // no fluxo atual (host-autoritativo via NET.saveGame) nada lê essa coluna ainda; entra em
    // vigor no cutover pro servidor. Só copas de mata-mata (grupos são Série A -> futuro).
    if(CL.online && typeof NET!=='undefined' && NET.publishCupResult){
      // scorers/perf viajam junto: o servidor precisa deles pra creditar o gol na artilharia e o
      // JOGO no Historial (ver cupSumula no resolve-round) — o recordScorers/ratePlayers local
      // acima é sobrescrito pelo adopt da rodada seguinte.
      NET.publishCupResult(S.round, { key:pending.key, h:t.h, a:t.a, hg:m.hg, ag:m.ag, winner, pens, events:m.events,
        scorers, perf:m.perf||null, caps:{H:liveCaps(m,'H'),A:liveCaps(m,'A')}, matchMinutes:liveMatchMinutes(m),
        decisions:(m.sim&&m.sim.decisions)||[] });
    }
    // idem à fase de grupos: os outros confrontos desta MESMA fase são resolvidos agora, pra
    // chave mostrada no pós-jogo já vir completa (advanceCupBracket pula a do usuário, que
    // acabou de receber t.winner acima).
    resolveCupRoundRest(pending.key);
    const userWon=(winner===CL.clubId);
    if(wentToPens){
      const userIsHome=(t.h===CL.clubId);
      const myPen=userIsHome?pens.h:pens.a, oppPen=userIsHome?pens.a:pens.h;
      resultMsg = userWon
        ? `Empate em ${m.hg}×${m.ag} — você venceu nos pênaltis por ${myPen}×${oppPen} e avança na ${compShort}.`
        : `Empate em ${m.hg}×${m.ag} — eliminado nos pênaltis por ${oppPen}×${myPen} da ${compShort}.`;
    } else if(wentToExtra){
      resultMsg = userWon
        ? `Vitória na prorrogação por ${m.hg}×${m.ag}! Você avança na ${compShort}.`
        : `Eliminado na prorrogação — derrota por ${m.hg}×${m.ag} da ${compShort}.`;
    } else {
      resultMsg = userWon
        ? `Vitória por ${m.hg}×${m.ag}! Você avança na ${compShort}.`
        : `Eliminado da ${compShort} — derrota por ${m.hg}×${m.ag}.`;
    }
  } else {
    const mg=pending.group, g=Object.values(mg.groups).find(gr=>gr.label===pending.groupLabel);
    const T=g.table, h=m.h, a=m.a;
    g.results=g.results||[]; g.results.push({r:mg.round, h, a, hg:m.hg, ag:m.ag, jornada:S.round}); // idem advanceGroupStageRound
    T[h].P++; T[a].P++; T[h].GF+=m.hg; T[h].GA+=m.ag; T[a].GF+=m.ag; T[a].GA+=m.hg;
    if(m.hg>m.ag){ T[h].W++; T[a].L++; T[h].Pts+=3; }
    else if(m.hg<m.ag){ T[a].W++; T[h].L++; T[a].Pts+=3; }
    else { T[h].D++; T[a].D++; T[h].Pts++; T[a].Pts++; }
    markMyCupTurnDone(pending.key); // cumpri esta competição NESTA rodada (ver myCupTurnDone no core)
    // AS OUTRAS PARTIDAS DA MESMA RODADA, AGORA. Sem isto a tabela mostrada logo depois do jogo
    // tinha só os pontos do usuário: o resto da rodada da competição só era simulado quando a
    // rodada de LIGA rodasse (sábado), então a classificação do pós-jogo de quarta ficava com
    // uma partida disputada e as outras zeradas. advanceGroupStageRound pula a partida do
    // usuário sozinho (guard pelo resultado já gravado no grupo), então aqui só entram os que faltavam.
    resolveCupRoundRest(pending.key);
    // Resenha (online): publica também o resultado de FASE DE GRUPOS. Antes só o mata-mata era
    // publicado, então o servidor re-simulava a partida que o humano tinha acabado de jogar ao
    // vivo e o adopt seguinte sobrescrevia o placar que ele viu na tela (ver
    // advanceGroupStageRoundS em supabase/functions/resolve-round). `stage:'group'` é o que
    // distingue os dois lá — confronto de grupo não tem vencedor.
    if(CL.online && typeof NET!=='undefined' && NET.publishCupResult){
      NET.publishCupResult(S.round, { key:pending.key, stage:'group', h, a, hg:m.hg, ag:m.ag, events:m.events,
        scorers, perf:m.perf||null, caps:{H:liveCaps(m,'H'),A:liveCaps(m,'A')}, matchMinutes:liveMatchMinutes(m),
        decisions:(m.sim&&m.sim.decisions)||[] });
    }
    const userIsHome=(h===CL.clubId);
    const userGF=userIsHome?m.hg:m.ag, userGA=userIsHome?m.ag:m.hg;
    const outcome=userGF>userGA?'Vitória':userGF<userGA?'Derrota':'Empate';
    resultMsg = `${outcome} por ${userGF}×${userGA} pela fase de grupos da ${compShort}.`;
  }
  saveV3();
  // Resenha (online): saveV3() é no-op nesse modo — persiste no Supabase igual finishLiveRound()
  // já faz pra rodada de liga (só grava de fato se quem está jogando for o anfitrião da
  // sala; característica já existente da arquitetura online, não nova pra copa).
  if(CL.online && typeof NET!=='undefined' && NET.saveGame){
    (async ()=>{ await NET.saveGame({ S, round: S.round }); })().catch(e=>console.warn('Save Supabase (copa):', e));
  }
  // marca esta competição pra mostrar a classificação/chaveamento assim que todas as
  // partidas de copa da rodada (pode haver mais de uma — Copa do Brasil + Libertadores
  // na mesma semana, por exemplo) tiverem sido jogadas — ver clCupResultContinue().
  cupMarkSeen(pending.key); // esta copa está cumprida NESTA rodada — nunca reabrir (ver cupWasSeen)
  if(typeof markMyCupTurnDone==='function') markMyCupTurnDone(pending.key); // vale pro mata-mata também (CdB/oitavas)
  CL._cupResultKeysThisRound = CL._cupResultKeysThisRound || [];
  if(!CL._cupResultKeysThisRound.includes(pending.key)) CL._cupResultKeysThisRound.push(pending.key);
  // o placar viaja com a competição pra ser mostrado como FAIXA no topo da tela da copa —
  // antes ele era um diálogo separado que o usuário tinha que fechar antes de ver a chave
  // (dois passos, dois layouts). Agora resultado e chave são a mesma tela (ver scCupClassif).
  const userGF=(m.h===CL.clubId)?m.hg:m.ag, userGA=(m.h===CL.clubId)?m.ag:m.hg;
  CL._cupResultByKey = CL._cupResultByKey || {};
  CL._cupResultByKey[pending.key] = { score:m.hg+'×'+m.ag, msg:resultMsg, stage:pending.stage,
    tone: userGF>userGA?'win':userGF<userGA?'loss':'draw' };
  CL.screen='main';
  clCupResultContinue(); // vai direto pra tela da copa (chave/grupos) — sem modal no meio
}
/* auto-avanço do fluxo de resultado de copa no ONLINE (modal de resultado -> classificação da
   copa -> onlineMarkReady). Sem isto, se a rede de segurança (onlineRunRound) puxar um usuário
   AUSENTE pra jogar a copa, o fluxo travaria numa dessas telas esperando "Continuar" e seguraria
   o outro jogador. 10s, igual à classificação de liga. No solo não arma (jogador decide no tempo dele). */
const CUP_FLOW_SCREENS=['cupclassif','cupdraw','cupview'];
const CUP_CLASSIF_AUTO_MS=10000;   // igual pra todos (ver showCupClassif)
/* `ms`: a classificação COLETIVA do fim da rodada (queueRoundCupClassifs) entra depois de o
   jogador já ter assistido à rodada inteira, e vem ENCADEADA com a pausa técnica e com a
   classificação da liga. Somar mais 10s ali fazia a virada de rodada passar de meio minuto de
   telas automáticas — foi o "está demorando muito pra avançar depois do jogo". Ela avança em 5s;
   a tela de resultado da PRÓPRIA partida de copa segue com os 10s de sempre, que é onde o jogador
   de fato tem o que ler. Em qualquer uma o "Continuar" passa na hora. */
function armCupFlowTimer(fn, ms){
  if(CL._cupFlowTimer){ clearTimeout(CL._cupFlowTimer); CL._cupFlowTimer=null; }
  if(!CL.online) return;
  CL._cupFlowTimer=setTimeout(()=>{ CL._cupFlowTimer=null;
    // GUARDA DE TELA (o armClassifTimer sempre teve, este não): em 10s o jogador pode já ter
    // saído da copa e estar NA PARTIDA DE LIGA. Sem a guarda, este timer velho disparava
    // finishCupResultFlow no meio do jogo dele — a tela piscava e voltava pra principal, e a
    // rodada seguia rodando invisível (bug do "não assisti a 3ª semana", 01/ago).
    if(CUP_FLOW_SCREENS.indexOf(CL.screen)<0) return;
    try{ fn(); }catch(e){ console.warn('cup flow auto:', e&&e.message); } }, ms||10000);
}
function clearCupFlowTimer(){ if(CL._cupFlowTimer){ clearTimeout(CL._cupFlowTimer); CL._cupFlowTimer=null; } }
function clCupResultContinue(){
  clearCupFlowTimer();
  clCloseOverlay(); CL.live=null;
  // MOMENTO DEPOIS DA FINAL: se a competição acabou de ser decidida e o campeão sou eu, entram o
  // modal de título e, na sequência, o de artilheiro (fila — nunca os dois ao mesmo tempo).
  // Enfileirado aqui e consumido logo abaixo, antes de seguir pra chave/classificação.
  try{
    const _k=(CL._cupResultKeysThisRound||[]).slice();
    _k.forEach(k=>{ if(typeof enfileirarMomentosCopa==='function') enfileirarMomentosCopa(k); });
  }catch(e){}
  if(MOMENTO_FILA.length){ momentoSeguinte(()=>clCupResultContinue()); return; }
  // nunca encadeia direto pra próxima partida de copa aqui, mesmo que já tenha outra
  // pendente (ex: Copa do Brasil + Libertadores na mesma semana) — cada partida tem que
  // passar pela tela principal antes da próxima, pro jogador rever/confirmar a escalação
  // em vez de jogar duas competições seguidas com o mesmo time sem escolher nada. Se
  // sobrar copa pendente, o próximo "Jogar" na tela principal pega ela (ver clJogar()).
  // mostra a classificação/chaveamento da competição que teve jogo agora, pro jogador se
  // situar (igual já fazemos com a tabela de Séries A/B/C/D depois da rodada de liga).
  // A CLASSIFICAÇÃO NÃO É MAIS AQUI. Ela tinha DOIS gatilhos: quem jogava via logo depois do
  // próprio apito, quem não jogava via só no fechamento da rodada — dois momentos diferentes para
  // a mesma tela, separados pelo tempo que os outros levavam pra terminar. Agora existe um
  // gatilho só, o fechamento (queueRoundCupClassifs), onde o estado já é o que o servidor
  // resolveu e TODOS entram juntos: quem jogou com a faixa do próprio placar, quem não jogou com
  // o painel de dicas. Daqui o jogador volta pra TELA DO CLUBE — nunca emenda direto na próxima
  // competição (ver finishCupResultFlow).
  CL._cupResultKeysThisRound=null;
  CL._cupResultRound=S.round;   // a faixa de resultado espera o fechamento (ver cupResultForKey)
  finishCupResultFlow();
}
/* cauda do fluxo pós-copa: igual ao que já existia antes das telas de classificação —
   online marca pronto e espera os outros; solo volta pra tela principal. */
function finishCupResultFlow(){
  // BUG: isto chamava onlineMarkReady() (sinaliza "pronto" pro fechamento da RODADA DE LIGA)
  // toda vez que UMA partida de copa terminava — mesmo quando ainda sobrava outra partida de
  // copa pendente na mesma semana, OU a própria rodada de liga nem tinha sido jogada ainda.
  // Resultado: o anfitrião podia fechar a rodada de liga (simulando o usuário como "ausente")
  // ANTES dele sequer escalar/jogar o próprio jogo — daí a classificação/rodada nova "atravessava"
  // a tela logo depois de uma partida de copa, e só ao voltar pro time é que aparecia atualizado.
  // Só marca pronto quando NÃO sobra mais nada pendente nesta rodada (nem copa, nem a liga).
  // NA QUARTA (semana de dois estágios) a etapa é SÓ a copa: "não joguei a liga" não pode segurar
  // o pronto — a liga pertence ao estágio de sábado, que ainda nem abriu. Era isto que deixava o
  // participante da copa sem marcar pronto depois de jogar, com a quarta esperando por ele.
  /* AQUI TERMINA O QUE EU TINHA A FAZER NO DIA DE COPA — e é só aqui que ele pode ser carimbado.
     O carimbo estava saindo no APITO (finishCupLiveMatch), antes da tela de resultado da minha
     própria partida. Consequência medida em sala real: quem só assistia terminava e carimbava; eu,
     que joguei, carimbava no apito e ainda tinha o meu resultado para ver — o momento virava para
     'classificacao' com eu ainda no meu modal, e o outro humano abria a tabela sozinho. Eu só a via
     depois, ao cair na tela do clube. "Cumpri o dia" tem que significar TERMINEI TUDO, senão o
     ponteiro anda no meio do meu fluxo e a sala se parte exatamente onde ela deveria se juntar.
     A competição é a do PONTEIRO: é o dia que está sendo cumprido, não a minha lista. */
  const _dHoje=(typeof NET!=='undefined' && NET.room)?NET.room.day:null;
  if(_dHoje && _dHoje.comp!=='liga' && typeof cupDayMarkDone==='function') cupDayMarkDone(_dHoje.comp);
  /* IR PARA A TABELA SÓ SE EU AINDA NÃO A VI — e esta condição não é detalhe, é a diferença entre
     duas situações opostas que passam por esta mesma linha:
       · acabei a minha partida e a tabela do dia ainda está por ver -> vou direto para ela, sem
         piscar a tela do clube no meio (foi como o anfitrião a viu "depois" em vez de junto);
       · acabei de SAIR da tabela (cupClassifContinue termina aqui) -> tenho que seguir para a tela
         do clube.
     Sem a condição, o segundo caso caía no `return` abaixo com a tela ainda em 'cupclassif': o
     jogador ficava parado numa classificação já marcada como vista, sem cronômetro nenhum armado,
     e o destravamento de 10s só o trazia de volta para cá — em círculo. Foi o convidado preso no
     dia 5. */
  const _tabelaPorVer = !!(_dHoje && _dHoje.comp!=='liga' && typeof cupClassifWasShown==='function'
                           && !cupClassifWasShown(_dHoje.comp, S.round||0));
  if(_tabelaPorVer){
    if(typeof onlineMomentScreenTick==='function') onlineMomentScreenTick();
    if(CL.screen==='cupclassif') return;
  }
  const stillPending = CL.online && (pendingUserCupMatches().length>0 || CL._playedRound!==S.round);
  if(CL.online && !stillPending){
    // SAI DA TELA ANTES DE MARCAR PRONTO. Ficar na chave/classificação parecia inofensivo, mas o
    // onlineRunRound tem (e precisa ter) a guarda "não interrompe telas de classificação" — com a
    // tela parada em 'cupclassif', a rede de segurança retornava SEM FAZER NADA a cada tique: o
    // host nunca armava o fechamento da quarta, o cronômetro expirava, a fase reabria e a mesma
    // rodada de copa voltava. Medido no harness: era o loop do "repete o jogo da Libertadores".
    // Igual à liga: pronto se espera na tela do clube.
    CL.screen='main'; CL.tab='jogo'; cdraw();
    onlineMarkReady(); return;
  }
  // PARTIDA EM ANDAMENTO tem precedência absoluta sobre a cauda do fluxo da copa: mandar pra
  // 'main' aqui trocava a tela mas NÃO parava o CL.live — o jogo seguia correndo invisível, o
  // resultado era publicado sem ninguém ver, e onlineRunRound ficava bloqueado por CL.live pra
  // sempre. Se estou jogando, a copa já acabou o que tinha pra fazer: não mexe na tela.
  if(CL.live && !CL.live.done){ return; }
  CL.screen='main'; cdraw();
}
/* ---- a chave/classificação da copa logo depois da partida, NA MESMA TELA ----
   Antes eram duas etapas: um diálogo com o placar por cima da tela ao vivo e, só depois de
   fechá-lo, uma tela de chaveamento. Agora é uma tela só (cupScreenHTML): o resultado da
   partida entra como faixa no topo e a chave/grupos ocupa o resto — o usuário termina a
   rodada da copa e continua exatamente onde estava, sem fechar nada. ---- */
/* A FAIXA DE RESULTADO SOBREVIVE ATÉ O FECHAMENTO, mas só da PRÓPRIA rodada: quem jogou a copa
   guarda o placar em CL._cupResultByKey no fim da partida e só o vê na classificação coletiva,
   que vem depois. Sem o carimbo de rodada, um placar da semana passada reapareceria na tela
   desta semana. */
function cupResultForKey(key){
  if(!CL._cupResultByKey) return null;
  if(CL._cupResultRound!=null && CL._cupResultRound!==(S.round||0)) return null;
  return CL._cupResultByKey[key]||null;
}
function showCupClassif(key, round){ CL.screen='cupclassif'; CL._cupClassifKey=key; CL._cupTie=null;
  if(round!=null) CL._cupClassifRound=round;
  const c=S.cups&&S.cups[key], r=cupResultForKey(key);
  // O MARCADOR DE "JÁ VI" É GRAVADO NA SAÍDA (cupClassifContinue), NÃO AQUI.
  // Ele persiste em disco, e marcar na ABERTURA queimava a tela sem o jogador ter visto nada: se
  // o fluxo fosse interrompido no meio — rodada repetindo, reload, sala travada —, a competição
  // ficava marcada como vista para sempre e a classificação nunca mais aparecia naquela rodada.
  // Foi o que apagou as telas de classificação depois das sessões quebradas.
  // abre na aba da fase que ele acabou de jogar (sem fase de grupos, só existe o mata-mata)
  CL.cupTab = !cupHasGroupTab(key,c) ? 'chave' : (r ? (r.stage==='bracket'?'chave':'grupos') : (c.bracket?'chave':'grupos'));
  cdraw();
  // AUTO-AVANÇO UNIFORME. Era 10s pra quem tinha resultado e 5s pra quem não tinha — ou seja, os
  // dois lados da MESMA tela saíam em momentos diferentes. Agora é o mesmo tempo pra todo mundo, e
  // ele é só cortesia pra quem está longe do teclado: ninguém começa o dia seguinte antes de todos
  // saírem daqui, porque 'cupclassif' conta como ocupado e o anfitrião não libera com gente
  // ocupada (ver CLOSING_SCREENS/onlineHostTick).
  armCupFlowTimer(cupClassifContinue, CUP_CLASSIF_AUTO_MS);
}
function scCupClassif(){
  // TELA PORTADA (telas/Copa - Classificacao da Fase)
  return rfCopaFaseHTML(CL._cupClassifKey);
}

function cupClassifContinue(){
  clearCupFlowTimer();
  /* CERIMONIA DA FINAL, mesmo quando o campeao e outro (ver dadosCampeaoCopa):
     a tela de fim de fase que se estava a fechar era a da FINAL, entao a
     competicao acabou aqui -- e o fecho dela e a taca, nao um "Continuar". */
  try{
    const k=CL._cupClassifKey;
    if(k && typeof enfileirarMomentosCopa==='function'){
      const c=S.cups&&S.cups[k], b=(c&&c.champion!==undefined)?c:(c&&c.bracket);
      if(b && b.champion!=null){
        enfileirarMomentosCopa(k);
        if(MOMENTO_FILA.length){ momentoSeguinte(()=>cupClassifContinue()); return; }
      }
    }
  }catch(e){ console.warn('cerimonia da final:', e&&e.message); }
  // AGORA SIM: a tela foi de fato mostrada e o jogador está saindo dela (no botão ou no
  // auto-avanço). Só neste ponto a competição conta como vista nesta rodada — ver showCupClassif.
  if(CL._cupClassifKey) cupClassifMarkShown(CL._cupClassifKey, CL._cupClassifRound);
  const queue=CL._cupClassifQueue||[];
  // ENTRE UMA COMPETIÇÃO E OUTRA, PASSA PELA TELA DO ELENCO. Numa rodada com duas competições
  // (Libertadores na quinta e Copa do Brasil na sexta, por exemplo) a fila emendava a
  // classificação de uma na da outra, e o jogador saltava de competição pra competição sem nunca
  // voltar ao time. Agora a fila para na tela do clube e o próximo "Jogar" pega a competição
  // seguinte — a mesma regra que já valia entre as PARTIDAS de copa, agora também entre as
  // classificações.
  if(queue.length){
    CL._cupClassifQueue=queue;                       // fica pendente: o próximo Jogar retoma
    CL.screen='main'; CL.tab='jogo'; cdraw();
    if(CL.online && typeof onlineMarkReady==='function') onlineMarkReady();
    return;
  }
  CL._cupClassifQueue=null; CL._cupResultByKey=null; CL._cupClassifRound=null;
  // fila montada por queueRoundCupClassifs (fim de rodada): a cauda é o que vem DEPOIS das
  // copas — a classificação da liga ou a tela do clube, conforme o caminho que chamou.
  const tail=CL._cupClassifTail; CL._cupClassifTail=null;
  if(tail){ try{ tail(); }catch(e){ console.warn('pós-classificação de copa:', e&&e.message); } return; }
  finishCupResultFlow();
}
/* ================= A RODADA É DE TODO MUNDO (ligas E copas) =================
   Antes, a tela de classificação/chaveamento de uma copa só aparecia pra quem tinha jogado a
   partida daquela competição: quem não disputa a Libertadores terminava a quarta-feira sem ver
   nada e caía direto na tela do clube, enquanto o vizinho ainda estava lendo a chave. Dois
   jogadores em telas diferentes no mesmo instante é justamente a origem das dessincronias que o
   calendário diário veio resolver.
   A regra agora é uma só, pra qualquer país, liga ou copa: ao fim de uma rodada, TODO humano
   passa pela tela de classificação de TODAS as competições que entraram em campo naquela
   rodada — jogue ele ou não. Quem jogou vê a faixa do próprio resultado; quem não disputa vê,
   no mesmo lugar, o painel de dicas + patrocinador. Ninguém vê a mesma competição duas vezes na
   mesma rodada (o marcador abaixo lembra o que já foi mostrado), então quem acabou de jogar a
   copa e já leu a chave logo depois do apito não repete a tela no fechamento. */
const CUP_CLASSIF_ORDER=['copaBrasil','libertadores','sulamericana','championsLeague','europaLeague'];
/* marcador por (temporada, rodada) — a rodada é sempre a da RODADA JOGADA, não a corrente:
   no fechamento de sábado o S.round já avançou, e sem isso a copa que o jogador acabou de ver na
   quarta apareceria de novo. */
function cupClassifRoundKey(round){ return (S.season||1)+'-'+(round!=null?round:(S.round||0)); }
/* O MARCADOR TAMBÉM PERSISTE (mesmo balde por save/sala do drawSeenKey). Só em memória ele não
   sobrevivia a um reload — e o botão "Sincronizar a Resenha" recarrega a página de propósito —,
   então a classificação da MESMA rodada reaparecia depois de sincronizar: a rodada parecia
   acontecer duas vezes. Guardado por (temporada, rodada, competição), reabrir o jogo devolve o
   jogador ao ponto onde estava sem repetir tela nenhuma. */
/* prefixo 'cls2': os marcadores gravados pela versão anterior foram escritos na ABERTURA da tela,
   então há telas marcadas como vistas que ninguém viu (as sessões que travaram queimaram várias).
   Trocar o prefixo aposenta aqueles registros de uma vez, sem precisar limpar nada na mão. */
function cupClassifSeenMark(key, round){ return 'cls2:'+cupClassifRoundKey(round)+':'+key; }
function cupClassifMarkShown(key, round){
  const rk=cupClassifRoundKey(round);
  if(!CL._cupClsSeen || CL._cupClsSeen.rk!==rk) CL._cupClsSeen={ rk, keys:[] };
  if(!CL._cupClsSeen.keys.includes(key)) CL._cupClsSeen.keys.push(key);
  if(typeof rememberDrawSeen==='function') rememberDrawSeen(cupClassifSeenMark(key, round));
}
function cupClassifWasShown(key, round){
  const rk=cupClassifRoundKey(round);
  if(CL._cupClsSeen && CL._cupClsSeen.rk===rk && CL._cupClsSeen.keys.includes(key)) return true;
  return (typeof drawAlreadySeen==='function') && drawAlreadySeen(cupClassifSeenMark(key, round));
}
/* esta competição de fato entrou em campo NESTA rodada? Lê o carimbo `rodada` que cliente e
   servidor gravam em todo confronto de mata-mata e em todo resultado de grupo — é o único sinal
   que vale nos dois modos. Perguntar só "é a semana dela" (cupTickMatchesRound) traria também a
   copa já encerrada, que bate o tique e não joga nada. */
function cupPlayedInRound(key, round){
  const c=S&&S.cups&&S.cups[key]; if(!c || round==null) return false;
  const b = key==='copaBrasil' ? c : c.bracket;
  if(b){
    if((b.ties||[]).some(t=>t&&t.jornada===round)) return true;
    if((b.history||[]).some(h=>(h.ties||[]).some(t=>t&&t.jornada===round))) return true;
  }
  const mg=c.group;
  if(mg && mg.groups){
    for(const gk in mg.groups){ if(((mg.groups[gk].results)||[]).some(r=>r&&r.jornada===round)) return true; }
  }
  return false;
}
function cupKeysPlayedInRound(round){
  if(!S || !S.cups) return [];
  return CUP_CLASSIF_ORDER.filter(k=>S.cups[k] && cupPlayedInRound(k, round));
}
/* mostra, uma depois da outra, a classificação de cada competição que teve rodada nesta rodada
   e que este jogador ainda não viu — e só então chama `done` (a classificação da liga, ou a tela
   do clube). Ponto ÚNICO da regra: os três caminhos de fim de rodada passam por aqui. */
/* A ORDEM DAS COMPETIÇÕES DE UMA RODADA É A DO CALENDÁRIO DA SALA — o plano de dias, que mora no
   servidor e por isso é igual em todo cliente. Cada cliente ordenava pela sua própria lista, e
   assim os dois humanos viam as mesmas classificações em sequências diferentes. Sala sem plano
   (save antigo) cai na ordem do calendário do mundo (cupDrawOrder), que também é comum a todos. */
function cupOrderForRound(round){
  const plan=(typeof NET!=='undefined' && NET.room && NET.room.dayPlan) || null;
  if(plan && plan.length) return plan.filter(e=>e && e.r===round && e.comp!=='liga').map(e=>e.comp);
  return (typeof cupDrawOrder==='function') ? cupDrawOrder().map(x=>x[0]) : [];
}
/* ===== TODA COPA DECIDIDA TEM CERIMONIA, TENHA EU JOGADO OU NAO =====
   A cerimonia da taca so era enfileirada por dois caminhos: quem acabou de
   jogar a final (clCupResultContinue) e quem passou pela tela de fim de fase
   (cupClassifContinue). Uma final resolvida em segundo plano -- competicao em
   que o clube nem entrou, ou rodada avancada pelo botao "Avancar" -- nao passa
   por nenhum dos dois, e a temporada acabava sem nunca dizer quem levantou a
   Copa do Brasil ou a Sul-Americana. Agora quem manda e o FATO: existe campeao
   e ainda nao foi celebrado nesta temporada -> entra na fila.
   O carimbo vive no SAVE (nao em CL): recarregar a pagina nao pode fazer a
   cerimonia repetir, nem sumir. */
/* ===== A TACA E A ARTILHARIA SAO DE CADA TREINADOR =====
   O carimbo de "esta copa ja foi celebrada" vivia em `S._copaCelebrada` — o estado
   COMPARTILHADO. Numa sala isso quer dizer que o PRIMEIRO cliente a chegar aqui carimba a
   competicao para toda a gente, e os outros nunca veem a taca nem o artilheiro. Foi o relatado a
   19/08/2026: "o modal de artilheiro so apareceu para o anfitriao", e "apareceu em momentos
   diferentes para cada um" — porque cada um chegava aqui na sua hora e so o primeiro passava.

   E o mesmo defeito do sorteio, no mesmo dia e pela mesma razao: cerimonia e UI, e UI nao viaja
   no mundo. A marca passa para o registo POR CLIENTE (localStorage por sala+temporada, o mesmo
   `rememberDrawSeen`/`drawAlreadySeen` dos sorteios), com um prefixo proprio.

   O titulo na carreira anda junto e tambem esta certo assim: a carreira e do ASSENTO, entao cada
   cliente tem de registar o seu — com o carimbo no mundo, quem chegasse depois ficava sem a taca
   na estante. */
function tacaJaCelebradaPorMim(marca){
  const m='taca:'+marca;
  if((CL._copaCelebrada||{})[m]) return true;
  return (typeof drawAlreadySeen==='function') && drawAlreadySeen(m);
}
function marcarTacaCelebradaPorMim(marca){
  const m='taca:'+marca;
  CL._copaCelebrada=CL._copaCelebrada||{}; CL._copaCelebrada[m]=true;
  if(typeof rememberDrawSeen==='function') rememberDrawSeen(m);
}
function celebrarCopasDecididas(){
  try{
    if(!S || !S.cups || typeof enfileirarMomentosCopa!=='function') return 0;
    let n=0;
    (typeof allCupKeys==='function'?allCupKeys():Object.keys(S.cups)).forEach(k=>{
      const c=S.cups[k]; if(!c) return;
      const b=(c.champion!==undefined)?c:c.bracket;
      if(!b || b.champion==null) return;
      const marca=k+':'+(S.season||1);
      if(tacaJaCelebradaPorMim(marca)) return;
      marcarTacaCelebradaPorMim(marca);
      /* O TITULO ENTRA NA CARREIRA NA HORA, nao no fim da temporada. Uma taca ganha em maio
         ficava invisivel na Sala, na Carreira e na Historia ate a temporada fechar. */
      try{ if(String(b.champion)===String(CL.clubId) && typeof coachSpellTitulo==='function'){
             if(typeof coachSpellsMigrar==='function') coachSpellsMigrar();
             coachSpellTitulo(k); } }catch(e){ console.warn('titulo na carreira:', e&&e.message); }
      enfileirarMomentosCopa(k); n++;
    });
    return n;
  }catch(e){ console.warn('celebrar copas:', e&&e.message); return 0; }
}
function queueRoundCupClassifs(round, done){
  done=done||function(){};
  /* a taca vem ANTES da classificacao da rodada: primeiro o fecho da historia,
     depois a tabela. Se houver cerimonia por mostrar, ela abre e esta funcao e
     retomada quando a fila esvaziar. */
  if(celebrarCopasDecididas() && MOMENTO_FILA.length){
    momentoSeguinte(()=>queueRoundCupClassifs(round, done)); return;
  }
  let keys=[];
  try{ keys=cupKeysPlayedInRound(round).filter(k=>!cupClassifWasShown(k, round)); }
  catch(e){ console.warn('classificação de copa da rodada:', e&&e.message); keys=[]; }
  try{ const ordem=cupOrderForRound(round);
       const pos=k=>{ const i=ordem.indexOf(k); return i<0?999:i; };
       keys.sort((a,b)=>pos(a)-pos(b)); }catch(e){}
  if(!keys.length){ done(); return; }
  CL._cupClassifRound=round;
  CL._cupClassifQueue=keys.slice(1);
  CL._cupClassifTail=done;
  showCupClassif(keys[0], round);
}
/* ---- PAINEL DE QUEM NÃO DISPUTA A COMPETIÇÃO (dicas + patrocinador) ----
   Ocupa exatamente o lugar da faixa de resultado na tela de classificação da copa. Em vez de
   fingir um placar que não existe, usa o espaço pra ensinar o que o jogador pode fazer com a
   semana livre — treino, rodízio, base, mercado, estádio — e pra dar uma inserção de marca. A
   dica e a marca são escolhidas pela RODADA, não por sorteio: assim todo mundo na sala vê a
   mesma coisa ao mesmo tempo, que é o ponto da rodada coletiva (e vira assunto de resenha). */
const CUP_IDLE_DICAS=[
  { ic:'🏋', t:'Treino especial', d:'Em Jogador ▸ Treino especial dá pra pôr até 3 atletas ganhando chance extra de evolução a cada rodada. Jovem com ritmo rápido é onde o treino rende mais.' },
  { ic:'🔁', t:'Rodízio do elenco', d:'Jogador cansado rende menos e se machuca mais. Poupe titulares na semana cheia — energia e moral entram direto na nota da partida.' },
  { ic:'💰', t:'Boas transferências', d:'O Leilão de jogadores costuma sair mais barato que a compra direta. E vender quem vive no banco libera salário antes da janela apertar.' },
  { ic:'🌱', t:'Jogador da base', d:'Jogador ▸ Subir jogador da base traz atleta jovem sem custo de transferência — e jovem é justamente quem mais cresce com o treino especial.' },
  { ic:'🏟', t:'Estádio', d:'Em Equipa ▸ Estádio, cada arquibancada nova é bilheteria a mais em TODO jogo em casa, rodada após rodada. Investimento que se paga sozinho.' },
  { ic:'📐', t:'Formação', d:'A formação escolhida persiste entre rodadas. Contra time forte fora de casa, um meio-campista a mais segura o jogo melhor que um atacante.' },
];
function cupIdleIdx(){ return ((S&&S.season||1)*7 + (S&&S.round||0)); }
function cupIdleDica(){ return CUP_IDLE_DICAS[cupIdleIdx()%CUP_IDLE_DICAS.length]; }
function cupIdleSponsorIdx(){ return cupIdleIdx()%AD_SPONSORS.length; }
function cupIdlePanelHTML(key){
  const nome=(COMP_DEFS[key]&&COMP_DEFS[key].name)||'competição';
  const d=cupIdleDica(), si=cupIdleSponsorIdx(), s=AD_SPONSORS[si];
  return `<div class="cl-cupidle">
    <div class="cl-cupidle-tip">
      <div class="cl-cupidle-hd">Hoje é dia de ${escC(nome)} — o seu clube não disputa esta rodada</div>
      <div class="cl-cupidle-dica"><span class="cl-cupidle-ic">${d.ic}</span>
        <span><b>${escC(d.t)}:</b> ${escC(d.d)}</span></div>
    </div>
    ${(function(){
      /* MESMO PATROCINIO DAS OUTRAS FAIXAS (rf98.pausa.barra): quem compra a apresentacao leva
         o Camarote, a pausa e esta tela. Sem criativo, ficam as marcas de casa. */
      const c=(typeof ADS!=='undefined'&&window.ADS)?ADS.get('rf98.pausa.barra'):null;
      if(c && c.ficheiro_url) return `<div class="cl-cupidle-ad"
        data-ad-chave="rf98.pausa.barra" data-ad-id="${escC(c.id)}">
        <span class="cl-cupidle-lbl">RODADA APRESENTADA POR</span>
        <img class="cl-cupidle-logo" src="${escC(c.ficheiro_url)}" alt="Patrocinador">
        ${c.link_destino?`<button class="cl-cupidle-cta" onclick="ADS.clique('rf98.pausa.barra')">Conhecer o patrocinador</button>`:''}
      </div>`;
      return `<div class="cl-cupidle-ad">
        <span class="cl-cupidle-lbl">RODADA APRESENTADA POR</span>
        <img class="cl-cupidle-logo" src="${s.src}" alt="${escC(s.nome)}">
        <button class="cl-cupidle-cta" style="${camCtaStyle(si)}" onclick="cupIdleAdClick()">${escC(s.cta)}</button>
      </div>`;
    })()}
    <div class="cl-cupidle-ad2" data-ad-slot="tela-${escC(key)}-apresenta-300x90">
      <b>${escC(s.nome)}</b>
      <span>${escC(s.cta)}</span>
    </div>
  </div>`;
}
/* mesma mecânica do botão do Camarote (ver camAdClick): abre em aba nova, sem handle da janela
   do jogo, e registra o clique por marca — aqui com o `placement` desta tela. */
function cupIdleAdClick(){
  const s=AD_SPONSORS[cupIdleSponsorIdx()]; if(!s) return;
  try{ if(typeof gtag==='function') gtag('event','sponsor_click',{sponsor:s.nome, placement:'classificacao-copa'}); }catch(e){}
  if(!s.url){ toastC('Link do patrocinador ainda não configurado ('+s.nome+').'); return; }
  window.open(s.url,'_blank','noopener,noreferrer');
}
function updateLive(){ const RL=CL.live; if(!RL) return;
  const clk=document.querySelector('#cl-liveclock'); if(clk) clk.style.setProperty('--pct', liveClockPct(RL));
  RL.matches.forEach((m,i)=>{ const sc=document.querySelector('#cl-lm-'+i); if(sc) sc.innerHTML=liveScoreCells(m);
    // A LINHA DO JOGO TEM ALTURA FIXA (56px, ver .cl-lrow no rebranding): o fato mais
    // recente aparece por extenso e os anteriores viram um contador "+N". Sem isso, num
    // jogo de 4 a 3 a linha crescia e empurrava a lista inteira pra baixo no meio da
    // transmissão — a tabela dançava enquanto o usuário tentava ler o placar.
    /* OS FATOS NAO MORAM MAIS AQUI. `#cl-lg-` era a celula de gol da pele
       antiga, e na pele nova esse id ficou na coluna MIN, de 46px. Este bloco
       continuava a despejar la dentro o texto do fato com as classes antigas
       (cl-lgoal-*), que nao tem limite de largura nenhum: a cada tique o fato
       era injectado na coluna do minuto e transbordava para fora do card, do
       lado direito da tela.
       Na pele nova cada fato e uma pastilha ao lado do NOME do seu time — a do
       mandante a esquerda, a do visitante a direita — e e isso que se
       actualiza. A coluna do minuto volta a mostrar o minuto. */
    /* o minuto e da RODADA (RL.minute), nao da partida: `m.min` nunca existiu e
       a coluna saia vazia. Jogo terminado mostra o apito final. */
    /* FIM E POR JOGO, NAO POR RODADA. A coluna mostrava o relogio da rodada em TODAS as linhas,
       entao um jogo que ja tinha apitado aos 91 continuava a marcar 92, 93, 94 -- a rodada
       inteira parecia estar em campo ate ao ultimo segundo. Ver liveJogoEncerrado. */
    const lg=document.querySelector('#cl-lg-'+i);
    if(lg){ const fim=(typeof liveJogoEncerrado==='function') && liveJogoEncerrado(m,RL);
      lg.textContent = (m.done||fim) ? 'FIM' : ((m.min!=null?m.min:(RL.minute||RL.min||0))+"'"); }
    if(typeof rfLvFatosDeJogo==='function' && typeof rfLvFatosHTML==='function'){
      const f=rfLvFatosDeJogo(m);
      const fh=document.querySelector('#rf-lv-fh-'+i); if(fh) fh.innerHTML=rfLvFatosHTML(f.casa,'esq');
      const fa=document.querySelector('#rf-lv-fa-'+i); if(fa) fa.innerHTML=rfLvFatosHTML(f.fora,'dir');
    } });
  if(RL.sel!=null){ const box=document.querySelector('#cl-livemodal'); if(box) box.innerHTML=liveModalHTML(RL.matches[RL.sel]); }
  /* O RELOGIO DA RODADA, na faixa do topo. Era escrito so no desenho da tela e
     nunca mais tocado: o updateLive remendava o minuto de CADA JOGO mas nao
     este. Quem joga nao dava por isso — o Camarote tem o seu proprio relogio,
     que camUpdate atualiza. Mas quem SO ASSISTE nao tem partida com m.user,
     entao camMatch() devolve undefined, camUpdate() sai na primeira linha, e
     nenhum relogio andava na tela. Era o relatado: "o relogio nao anda quando
     o usuario so assiste". Agora a faixa e remendada sempre. */
  if(RL){
    const mn=(RL.minute!=null?RL.minute:0);
    const el=document.querySelector('#rf-lv-min');
    if(el){ const txt=mn+"'"; if(el.textContent!==txt) el.textContent=txt; }
    const anel=document.querySelector('#rf-lv-anel');
    if(anel && typeof liveClockPct==='function') anel.style.setProperty('--pct', String(liveClockPct(RL)));
  }
  camUpdate(); // Modo Camarote: relógio, placar, barra de pressão, narração e estatística
}
function lastIncidentTxt(inc){
  if(inc.type==='gol') return `⚽ ${escC(inc.player)} ${inc.min}'`;
  if(inc.type==='cartao') return `${inc.cardType==='vermelho'?'🟥':'🟨'} ${escC(inc.player)} ${inc.min}'`;
  if(inc.type==='lesao') return `✚ ${escC(inc.player)} ${inc.min}'`;
  return '';
}

/* ---- painel: ADVERSÁRIO (+ Calendário) ---- */
function panAdversario(oppId){
  if(!oppId) return `<div class="cl-adv">Sem adversário nesta rodada.</div>`;
  const r=ratings(oppId,false); const forca=Math.max(6,Math.min(100,Math.round((r.OS+r.DS)/2)));
  const rnd=rngFrom(hashC(oppId)); const coach=COACHES_C[Math.floor(rnd()*COACHES_C.length)];
  return `<div class="cl-adv">
    <div class="cl-adv-big">${clubLink(oppId)}</div>
    <div class="cl-bar cl-bar-lg"><div class="cl-bar-fill" style="width:${forca}%"></div></div>
    <div class="cl-adv-coach"><span>Treinador</span><b>${escC(coach)}</b></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;max-width:320px">
      ${btn('Calendário','clCalendar()',{icon:'📅',cls:'cl-btn-ok'})}
      ${btn('Ver elenco','clViewTeam(\''+oppId+'\')',{icon:'👥',cls:'cl-btn-ok'})}
    </div>
  </div>`;
}

/* ---- 13 · CALENDÁRIO (modal) ---- */
function userCalendar(){ const out=[]; (S.sched||[]).forEach((rd,i)=>{ const m=rd.find(([h,a])=>h===CL.clubId||a===CL.clubId);
  if(m){ const home=m[0]===CL.clubId; const opp=home?m[1]:m[0];
    // resultado já jogado (ver S.results, alimentado em playRound/resolve-round) — antes o
    // Calendário só mostrava o CONFRONTO (fixture), nunca o placar de rodadas já disputadas.
    const res=(S.results||[]).find(r=>r.round===i && r.h===m[0] && r.a===m[1]);
    const myG=res?(home?res.hg:res.ag):null, oppG=res?(home?res.ag:res.hg):null;
    out.push({n:i+1,w:i,opp,home,myG,oppG}); } }); return out; }   // n = rótulo (1-based); w = semana real (0-based, base da data)
/* cada copa avança numa rodada de liga PRÓPRIA (ver CUP_TICK_OFFSET/cupTickMatchesRound
   em core.js — Copa do Brasil, Libertadores e Sul-Americana ficam defasadas por 1 rodada
   cada, 7 dias no calendário do jogo, bem acima do mínimo de 2 dias pra não parecer que
   clubes jogam duas competições no mesmo dia). Um confronto de copa só fica jogável ao
   vivo na véspera do avanço daquela competição específica. Dá pra prever em QUAL rodada
   de liga cada confronto pendente vai rolar: a próxima rodada em que essa competição bate
   (cupTickMatchesRound), +3 pra cada avanço seguinte (2º confronto de grupo pendente, 3º,
   ...) — é isso que permite intercalar copa e liga no calendário na ordem certa. */
/* próxima rodada em que esta copa entra em campo, e as seguintes. Antes a conta era "acha a
   próxima rodada da faixa e soma 3 por rodada", que só valia enquanto o passo era fixo. Agora as
   rodadas vêm da tabela do calendário (S.cupCalendar, ver ensureCupCalendar no core) — o passo
   estica no mata-mata, então somar 3 daria a rodada errada. Sem tabela (save antigo), a conta
   antiga continua valendo. */
function nextCupJornada(key, stepsAhead){
  const cal=(S.cupCalendar&&S.cupCalendar[key])||null;
  if(cal && cal.length){
    // >= S.round (e não S.round+1): a copa da semana CORRENTE é a que o jogador está prestes a
    // jogar nesta sessão — ela tem que aparecer no Calendário como o próximo jogo, não sumir.
    const futuras=cal.filter(j=>j>=S.round);
    const n=stepsAhead||0;
    // EXTRAPOLA em vez de grampear (mesmo motivo do cupJornadaOfRound): com o Math.min, todas as
    // rodadas de grupo que sobravam além da tabela viravam linhas na MESMA data do Calendário.
    if(futuras.length) return n<futuras.length ? futuras[n] : futuras[futuras.length-1]+(n-futuras.length+1)*3;
    return cal[cal.length-1] + (n+1)*3;
  }
  let j=S.round+1; while(!cupTickMatchesRound(key,j)) j++;
  return j + (stepsAhead||0)*3;
}
/* rodada em que a r-ésima rodada de uma copa foi/será jogada (r começa em 1). Serve de
   fallback pros confrontos JÁ jogados de saves antigos, que não têm o carimbo t.jornada
   (ver advanceCupBracket): a competição bate a cada 3 rodadas, na rodada ≡ CUP_TICK_OFFSET
   (mod 3), e a primeira batida acontece na primeira rodada >= 1 com esse resto. */
/* SEMANA EM QUE A RODADA DE COPA É DE FATO JOGADA.
   Existiu por causa de uma defasagem: os tiques eram numerados pela rodada em que a competição
   AVANÇA (advancePendingCups rodava depois do S.round++) enquanto o jogador jogava a partida uma
   sessão ANTES, então a semana certa era tique-1 e o Calendário mostrava tudo uma rodada à frente.
   A defasagem foi desfeita na raiz: o avanço de copa passou pro COMEÇO da rodada (ver playRound no
   core) e pendingUserCupMatches olha a semana corrente — tique e semana são a mesma coisa agora.
   A função fica como ponto único de tradução: se a relação voltar a mudar, muda só aqui, e não nos
   cinco lugares que exibem rodada de copa. */
function cupWeekOfTick(tick){ return Math.max(0, tick||0); }
/* O Calendário rotula rodada de liga a partir de 1 (userCalendar: n=i+1) e a semana interna é
   0-based. As linhas de copa carregavam a semana crua como rótulo, então copa e liga da MESMA
   semana apareciam com números diferentes — e, pior, a data que eu derivava do rótulo saía uma
   semana adiantada nas linhas de liga. Agora cada linha leva as duas coisas: `n` é o rótulo
   humano (1-based, usado pra ordenar e exibir) e `w` é a semana real (0-based, base da data). */
function cupRowWeek(tick){ return cupWeekOfTick(tick); }
function cupJornadaOfRound(key, r){
  const cal=(S.cupCalendar&&S.cupCalendar[key])||null;
  const i=Math.max(1,r)-1;
  if(cal && cal.length){
    if(i<cal.length) return cal[i];
    // FORA DA TABELA: extrapola em vez de grampear no último slot. O Math.min de antes fazia
    // TODAS as rodadas excedentes caírem na MESMA rodada — várias linhas da mesma competição
    // no mesmo dia do Calendário, que é o "dois jogos de Sul-Americana no mesmo dia" relatado.
    return cal[cal.length-1] + (i-(cal.length-1))*3;
  }
  const off=CUP_TICK_OFFSET[key]||0;
  const first=off>=1?off:3;              // offset 0 -> só bate na rodada 3 (jornada 0 não existe)
  return first + i*3;
}
/* TODOS os confrontos de copa JÁ JOGADOS do clube do usuário, com placar — em qualquer
   competição (Copa do Brasil, Libertadores, Sul-Americana / Champions, Europa), tanto no
   mata-mata quanto na fase de grupos. Sem isto o Calendário só mostrava resultado de LIGA:
   as linhas de copa listavam apenas os jogos futuros e sumiam depois de jogados. */
function userCupPlayedRows(){
  if(!S.cups || !CL.clubId) return [];
  const out=[];
  const meuLado=t=>t && (t.h===CL.clubId||t.a===CL.clubId);
  const addTie=(key,t,r,roundsTotal)=>{
    if(!meuLado(t) || t.hg==null || t.ag==null) return;
    const home=t.h===CL.clubId;
    out.push({key, w:cupRowWeek(t.jornada!=null?t.jornada:cupJornadaOfRound(key,r)), n:cupRowWeek(t.jornada!=null?t.jornada:cupJornadaOfRound(key,r))+1, played:true,
      opp:home?t.a:t.h, home, myG:home?t.hg:t.ag, oppG:home?t.ag:t.hg,
      phase:(typeof cupPhaseLabel==='function')?cupPhaseLabel(r,roundsTotal):null,
      pens:t.pens?(home?t.pens.h+'×'+t.pens.a:t.pens.a+'×'+t.pens.h):null,
      venceu:t.winner?(t.winner===CL.clubId):null});
  };
  const varreBracket=(key,b)=>{
    if(!b) return;
    (b.history||[]).forEach(h=>(h.ties||[]).forEach(t=>addTie(key,t,h.round,b.roundsTotal)));
    // confronto da rodada CORRENTE já decidido mas ainda não arquivado no history
    (b.ties||[]).forEach(t=>{ if(t.winner) addTie(key,t,b.round,b.roundsTotal); });
  };
  allCupKeys().forEach(key=>{
    const c=S.cups[key]; if(!c) return;
    varreBracket(key, key==='copaBrasil' ? c : c.bracket);   // Copa do Brasil é o bracket em si
    const mg=c.group; if(!mg) return;
    Object.values(mg.groups||{}).forEach(g=>{
      (g.results||[]).forEach(m=>{
        if(m.h!==CL.clubId && m.a!==CL.clubId) return;
        const home=m.h===CL.clubId;
        out.push({key, w:cupRowWeek(m.jornada!=null?m.jornada:cupJornadaOfRound(key,(m.r||0)+1)), n:cupRowWeek(m.jornada!=null?m.jornada:cupJornadaOfRound(key,(m.r||0)+1))+1, played:true,
          opp:home?m.a:m.h, home, myG:home?m.hg:m.ag, oppG:home?m.ag:m.hg, phase:'Fase de grupos'});
      });
    });
  });
  return out;
}
/* TODOS os confrontos de copa ainda pendentes do clube do usuário, pro Calendário —
   diferente de pendingUserCupMatches() (que só libera perto do avanço em segundo plano,
   pra saber quando dá pra JOGAR ao vivo), esta função existe só pra EXIBIÇÃO e não tem
   esse gate de "véspera da rodada". Na fase de grupos lista TODAS as rodadas restantes
   (não só a próxima); no mata-mata só dá pra saber o confronto da rodada atual — o
   próximo adversário só é conhecido depois que essa rodada terminar, igual na vida real. */
/* NADA DE COPA APARECE ANTES DO SORTEIO DELA.
   A chave e os grupos são criados no newGame (initSeasonCups) — a cerimônia é só a REVELAÇÃO
   disso. Como o Calendário lê o estado direto, ele mostrava adversário e mando de Libertadores,
   Sul-Americana e Copa do Brasil semanas antes do sorteio acontecer: o jogador via o próprio
   chaveamento antes de ser sorteado. Agora cada competição só entra na lista depois da data do
   seu sorteio (02/03, 11/03, 21/03 — ver cupSeasonDrawDays). Antes disso o que aparece é a linha
   da própria cerimônia (userCupDrawRows), que é a informação honesta naquele momento. */
/* ===== A DATA NAO E A REVELACAO; A CERIMONIA E =====
   Esta pergunta ja existia, mas media a coisa errada: comparava a DATA do sorteio com o dia de
   hoje. Com o calendario por slots as datas de sorteio andaram para o comeco da temporada (a
   Libertadores sorteia no dia do slot 2 menos dois), entao a data ja tinha passado enquanto a
   cerimonia ainda estava por acontecer — e o Calendario e os Campeonatos mostravam o grupo da
   Libertadores antes de o utilizador ver uma bola sair. Foi o relatado a 19/08.

   A regua passa a ser a mesma que decide se a cerimonia ainda te deve alguma coisa:
   `sorteioJaVistoPorMim`, por cliente e por temporada. E o unico marcador honesto — a data diz
   quando o sorteio PODE sair, so a marca diz que ele JA SAIU PARA MIM. Numa sala cada humano
   tem a sua marca, entao ninguem ve o grupo do outro antes da propria cerimonia.

   Duas saidas de seguranca, porque esconder a competicao inteira e caro se a marca faltar:
   competicao sem cerimonia (CUP_SEM_CERIMONIA) volta a regra da data; e competicao que JA
   ROLOU BOLA aparece sempre — save antigo a meio da temporada, ou quem entrou na sala depois,
   nao pode ficar com a copa invisivel. */
function cupJaRolouBola(c){
  try{
    if(!c) return false;
    if(c.group && ((c.group.round||0)>0 || c.group.finished)) return true;
    const b=c.bracket||((c.ties||c.history)?c:null);
    if(b && (((b.history||[]).length>0) || (b.ties||[]).some(t=>t&&t.winner))) return true;
    return false;
  }catch(e){ return false; }
}
function cupRevelada(key){
  try{
    if(typeof S==='undefined' || !S || !S.cups || !S.cups[key]) return true;
    if(cupJaRolouBola(S.cups[key])) return true;
    if(typeof cupTemCerimonia==='function' && cupTemCerimonia(key)
       && typeof sorteioJaVistoPorMim==='function')
      return !!sorteioJaVistoPorMim(key+':'+((S.season)||1));
    const dia=(typeof cupSeasonDrawDays==='function')?cupSeasonDrawDays()[key]:null;
    if(dia==null) return true;
    const hoje=(typeof leagueMatchDay==='function')?leagueMatchDay(S.round||0):(1+(S.round||0)*7);
    return dia<=hoje;
  }catch(e){ return true; }
}
function userCupCalendarRows(){
  if(!S.cups || !CL.clubId) return [];
  const out=[];
  const cb=cupRevelada('copaBrasil') ? S.cups.copaBrasil : null;
  // mostra a Copa do Brasil sempre que o clube estiver CLASSIFICADO (cupCompetitionTeamAlive),
  // não só quando o confronto da fase atual já existe em cb.ties. Entre fases (o clube avançou
  // mas o próximo chaveamento ainda não foi montado, ou passou por um bye) ele fica "vivo" pelo
  // histórico sem estar num tie — antes isso fazia a copa SUMIR do calendário mesmo classificado.
  if(cb && !cupIsFinished(cb) && typeof cupCompetitionTeamAlive==='function' && cupCompetitionTeamAlive(cb, CL.clubId)){
    const tie=(cb.ties||[]).find(t=>!t.winner && (t.h===CL.clubId||t.a===CL.clubId));
    const phase=(typeof cupPhaseLabel==='function')?cupPhaseLabel(cb.round, cb.roundsTotal):null;
    out.push({key:'copaBrasil', w:cupRowWeek(nextCupJornada('copaBrasil',0)), n:cupRowWeek(nextCupJornada('copaBrasil',0))+1, phase,
      opp: tie ? (tie.h===CL.clubId?tie.a:tie.h) : null,          // sem confronto ainda -> "a definir"
      home: tie ? (tie.h===CL.clubId) : null});
  }
  groupCupKeys().forEach(key=>{
    if(!cupRevelada(key)) return;              // sorteio ainda não aconteceu: nada de confronto
    const c=S.cups[key]; if(!c) return;
    if(c.group && !c.bracket && !c.group.finished){
      const mg=c.group;
      Object.values(mg.groups).forEach(g=>{
        if(!g.teams.includes(CL.clubId)) return;
        for(let r=mg.round;r<mg.roundsTotal;r++){
          const fx=(g.sched[r]||[]).find(([h,a])=>h===CL.clubId||a===CL.clubId);
          if(fx) out.push({key, w:cupRowWeek(nextCupJornada(key,r-mg.round)), n:cupRowWeek(nextCupJornada(key,r-mg.round))+1, opp:fx[0]===CL.clubId?fx[1]:fx[0], home:fx[0]===CL.clubId});
        }
      });
    } else if(c.bracket && !cupIsFinished(c.bracket)){
      const tie=(c.bracket.ties||[]).find(t=>!t.winner && (t.h===CL.clubId||t.a===CL.clubId));
      if(tie) out.push({key, w:cupRowWeek(nextCupJornada(key,0)), n:cupRowWeek(nextCupJornada(key,0))+1, opp:tie.h===CL.clubId?tie.a:tie.h, home:tie.h===CL.clubId});
    }
  });
  return out;
}
/* datas de sorteio (Libertadores/Sul-Americana, oitavas de final 2026) pro Calendário —
   só existe data real conhecida pra 2026 (ver COMP_R16_DRAW_2026); temporadas seguintes
   não têm sorteio real, a virada é automática assim que a fase de grupos termina. */
function userCupDrawRows(){
  if(!S.cups) return [];
  const out=[];
  // 1) sorteio de ABERTURA de cada copa (ver cupSeasonDrawDays no core): aparece no calendário
  //    enquanto não aconteceu, dois dias antes da estreia da competição
  if(typeof cupSeasonDrawDays==='function'){
    const dias=cupSeasonDrawDays(), season=S.season||1;
    const feito=k=>(typeof sorteioJaVistoPorMim==='function') && sorteioJaVistoPorMim(k+':'+season);
    Object.keys(dias).forEach(key=>{
      if(!S.cups[key] || feito(key)) return;
      if(typeof cupDoMeuUniverso==='function' && !cupDoMeuUniverso(key)) return;
      const dia=dias[key];
      out.push({key, n:Math.max(1,Math.floor((dia-1)/7)+1), date:realDateForDay(dia), abertura:true});
    });
  }
  // 2) sorteio das OITAVAS das continentais (só 2026 tem data real conhecida)
  if(S.season===2026) groupCupKeys().forEach(key=>{
    const c=S.cups[key]; if(!c || !c.group || c.bracket) return; // só antes do sorteio acontecer
    const d=COMP_R16_DRAW_2026[key]; if(!d) return;
    out.push({key, n:Math.max(S.round+1, jornadaForRealDate(d)), date:d});
  });
  return out;
}
/* DATA REAL DE CADA LINHA DO CALENDÁRIO — é o que torna o "calendário por dia" visível.
   O Calendário listava só o número da rodada ("3ª"), então copa e liga da mesma semana apareciam
   com o MESMO rótulo e nada dizia que uma era no meio da semana e a outra no fim. Era exatamente a
   confusão entre competições: duas linhas iguais, dias diferentes.
   O modelo de dias (validado numa temporada inteira, 131 clubes, zero choques): dentro da semana N
   cada competição tem o SEU dia da semana, fixo e igual pra todos os clubes que a disputam —
   ver COMP_WEEKDAY/leagueMatchDay/cupMatchDay no core. */
/* DIA DO PRÓXIMO JOGO — o mesmo modelo do Calendário, para o fluxo que o usuário percorre a cada
   rodada. O jogo passou a acontecer POR DIA (copa na quarta, liga no fim de semana da mesma
   semana), mas isso só aparecia na lista do Calendário: na tela do clube, na entrada em campo e na
   partida ao vivo continuava tudo em "rodada", como se a semana fosse um bloco só. Aqui o dia
   acompanha o jogador em todas essas telas, que é o que faz a mecânica nova ficar entendível. */
function nextMatchDayLabel(nm){
  if(!nm || typeof calRowDate!=='function') return '';
  try{ return calRowDate((S.round||0), nm.kind==='cup'?(nm.cupKey||true):null); }catch(e){ return ''; }
}
/* `comp`: chave da competição de copa, ou nada/false pra rodada de liga. O dia da semana é FIXO
   por competição (COMP_WEEKDAY/leagueMatchDay no core) — liga gira segunda/quarta/sábado,
   Sul-Americana joga terça, Libertadores quinta, Copa do Brasil sexta. Como o dia sai só da
   competição e da rodada, todos os clubes que disputam a mesma competição veem a MESMA data. */
function calRowDay(n, comp){
  return comp
    ? (typeof cupMatchDay==='function' ? cupMatchDay(typeof comp==='string'?comp:null, n||0) : 1+(n||0)*7+3)
    : (typeof leagueMatchDay==='function' ? leagueMatchDay(n||0) : 1+(n||0)*7+6);
}
function calRowDate(n, comp){
  if(typeof realDateForDay!=='function') return '';
  const d=realDateForDay(calRowDay(n, comp));
  const SEM=['dom','seg','ter','qua','qui','sex','sáb'];
  return SEM[d.getDay()]+' '+fmtRealDate(d);
}
/* ---- FOLGA: DIA DE RODADA EM QUE O MEU CLUBE NÃO ENTRA EM CAMPO ----
   A rodada de cada competição é do mundo, não do clube: ela acontece no mesmo dia pra todo mundo,
   dispute o clube ou não. Antes, o dia de uma competição que eu não jogo simplesmente NÃO EXISTIA
   no meu Calendário — sumia da lista, e não havia como saber que havia rodada rolando naquela
   data (nem por que os outros clubes tinham jogo e eu não). Agora o dia aparece igual, vazio e
   marcado como Folga: vale pra copa que eu não disputo (ou de que fui eliminado) e pra rodada de
   liga em que o meu clube pegou bye. */
function calFolgaRows(cupRows, ligaRows){
  const out=[];
  const linha=(key,w,label)=>{
    const data=calRowDate(w,key||false);
    return {n:w+1, ord:key?0:1, dia:calRowDay(w,key||false), html:
    `<div class="cl-cal-row cl-cal-folga" title="${escC(label)} — o seu clube não joga esta rodada">
      <span class="cl-cal-n" data-d="${escC(data)}">${w+1}ª</span><span class="cl-cal-d">${escC(data)}</span>
      <span class="cl-cal-t">${key?'🏆 ':'⚽ '}<span class="cl-cal-comp">${escC(label)} · </span><i>Folga</i></span>
      <span class="cl-cal-r"></span><span class="cl-cal-cf"></span></div>`};
  };
  try{
    const tem=new Set();
    (cupRows||[]).forEach(r=>{ if(r.key!=null && r.w!=null) tem.add(r.key+':'+r.w); });
    (ligaRows||[]).forEach(r=>{ if(r.w!=null) tem.add('_liga:'+r.w); });
    const cal=S.cupCalendar||{};
    Object.keys(cal).forEach(key=>{
      if(key==='_season' || !Array.isArray(cal[key]) || !COMP_DEFS[key] || !(S.cups&&S.cups[key])) return;
      if(!cupRevelada(key)) return;   // antes do sorteio nem "Folga" faz sentido: não se sabe se o clube joga
      cal[key].forEach(j=>{ if(!tem.has(key+':'+j)) out.push(linha(key, j, COMP_DEFS[key].short)); });
    });
    const nJorn=(Array.isArray(S.sched)&&S.sched.length)||0;
    for(let i=0;i<nJorn;i++) if(!tem.has('_liga:'+i)) out.push(linha(null, i, divisionLabel()));
  }catch(e){ console.warn('folgas do calendário:', e&&e.message); }
  return out;
}
function clCalendar(){
  // intercala copa, sorteio e liga por rodada (ver nextCupJornada/jornadaForRealDate) —
  // na mesma rodada, a(s) partida(s) de copa vêm antes da de liga, igual à ordem real de
  // jogo (clJogar() enfileira as partidas de copa pendentes antes de liberar a rodada de
  // liga); sorteios entram como um marco à parte, sem confronto associado.
  // jogado (com placar) + pendente, na MESMA linha visual da liga — chip V/D/E e o placar,
  // pra copa e liga contarem a temporada do mesmo jeito.
  const cupRows=userCupPlayedRows().concat(userCupCalendarRows()).map(pc=>{
    let extra='';
    if(pc.played){
      const cls = pc.venceu===true?'win' : pc.venceu===false?'loss' : pc.myG>pc.oppG?'win' : pc.myG<pc.oppG?'loss' : 'draw';
      const txt = pc.venceu===true?'V' : pc.venceu===false?'D' : pc.myG>pc.oppG?'V' : pc.myG<pc.oppG?'D' : 'E';
      extra=` <span class="cl-res-chip ${cls}">${txt}</span> <b>${pc.myG}-${pc.oppG}</b>${pc.pens?` <span class="cl-cal-pens">(pên. ${escC(pc.pens)})</span>`:''}`;
    }
    // uma coluna por dado: rodada · data · confronto · resultado · mando (ver .cl-cal-sched).
    // O nome da competição sai do texto no mobile (fica só o 🏆) e vai pro title — sem reticências.
    const comp=COMP_DEFS[pc.key].short;
    const advTxt = pc.opp?clubLink(pc.opp):'<i>adversário a definir</i>';
    const fase = pc.phase?' · '+escC(pc.phase):'';
    return {n:pc.n, ord:0, key:pc.key, w:pc.w, dia:calRowDay(pc.w,pc.key), html:
    `<div class="cl-cal-row cl-cal-cup" title="${escC(comp+(pc.phase?' · '+pc.phase:''))}">
      <span class="cl-cal-n" data-d="${escC(calRowDate(pc.w,pc.key))}">${pc.n}ª</span><span class="cl-cal-d">${calRowDate(pc.w,pc.key)}</span>
      <span class="cl-cal-t">🏆 <span class="cl-cal-comp">${escC(comp)}${fase} · </span>${advTxt}</span>
      <span class="cl-cal-r">${extra}</span><span class="cl-cal-cf">${pc.home==null?'':pc.home?'C':'F'}</span></div>`};
  });
  const drawRows=userCupDrawRows().map(dr=>({n:dr.n, ord:0,
    dia:(typeof dayForRealDate==='function')?dayForRealDate(dr.date):null, html:
    `<div class="cl-cal-row cl-cal-draw" title="${dr.abertura?'Sorteio':'Sorteio das oitavas'} — ${escC(COMP_DEFS[dr.key].short)}">
      <span class="cl-cal-n" data-d="${escC(fmtRealDate(dr.date))}">${dr.n}ª</span><span class="cl-cal-d">${escC(fmtRealDate(dr.date))}</span>
      <span class="cl-cal-t">🎲 ${dr.abertura?'Sorteio':'Sorteio das oitavas'} — ${escC(COMP_DEFS[dr.key].short)}</span>
      <span class="cl-cal-r"></span><span class="cl-cal-cf"></span></div>`}));
  const ligaRows=userCalendar().map(r=>{
    const played=r.myG!=null;
    // chip V/D/E ao lado do placar — só depois de jogado, para o usuário ver de cara como foi
    // sem precisar decorar os números (fundo verde/vermelho/cinza, letra branca).
    const chipCls = !played ? '' : r.myG>r.oppG?'win' : r.myG<r.oppG?'loss' : 'draw';
    const chipTxt = !played ? '' : r.myG>r.oppG?'V' : r.myG<r.oppG?'D' : 'E';
    const chip = played?`<span class="cl-res-chip ${chipCls}">${chipTxt}</span> `:'';
    const score=played?`<b>${r.myG}-${r.oppG}</b>`:'';
    return {n:r.n, ord:1, w:r.w, dia:calRowDay(r.w,false), html:
    `<div class="cl-cal-row">
      <span class="cl-cal-n" data-d="${escC(calRowDate(r.w,false))}">${r.n}ª</span><span class="cl-cal-d">${calRowDate(r.w,false)}</span>
      <span class="cl-cal-t">${clubLink(r.opp)}</span>
      <span class="cl-cal-r">${chip}${score}</span><span class="cl-cal-cf">${r.home?'C':'F'}</span></div>`};
  });
  // ORDENA PELO DIA DE VERDADE. Com um dia da semana próprio por competição, "copa antes da liga
  // na mesma rodada" deixou de ser a ordem real: a Libertadores é quinta e a liga da mesma
  // semana pode cair na segunda. `ord` fica só como desempate de linhas do mesmo dia.
  const rows=cupRows.concat(drawRows).concat(ligaRows).concat(calFolgaRows(cupRows, ligaRows))
    .sort((a,b)=>(a.dia!=null&&b.dia!=null ? a.dia-b.dia : a.n-b.n) || a.n-b.n || a.ord-b.ord)
    .map(r=>r.html).join('');
  const head=`<div class="cl-cal-head"><span>Rod.</span><span>Data</span><span>Confronto</span><span class="r">Result.</span><span class="c">C/F</span></div>`;
  overlayC(dlg('Calendário', `<div class="cl-cal cl-cal-sched">${head}${rows}</div>`,
    {ad:'modal-calendario-728x90',std:true, footer:btn('Fechar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}));
}

/* ---- menu dropdown (topo) ---- */
/* rótulo de cada aba da tela principal — usado pelo hambúrguer pra dizer ONDE o jogador está
   (a barra de abas do rodapé mostra só ícones no telefone). */
/* O cabeçalho "Adversário" (nome, mando, data, rodada) ocupa ~110px no telefone. Ele é contexto
   pro PRÓXIMO JOGO, então vale nas abas onde isso está em questão — Jogo, Formação (escalar
   contra alguém, dentro ou fora de casa, é a hora em que essa informação mais importa) e o
   próprio Adversário. Em Jogador, Finanças e E-mail é só espaço gasto antes do conteúdo. */
const ADV_HDR_TABS={jogo:true, seleccao:true, adversario:true};
const TAB_LABELS={jogo:'Jogo',elenco:'Elenco',jogador:'Jogador',financas:'Finanças',seleccao:'Formação',correio:'E-mail',adversario:'Adversário'};
/* item de menu escolhido: fecha a gaveta/dropdown na mesma ação (ver menuDropdown) */
function clMenuPick(){ CL.menu=null; CL.mobMenuOpen=false; cdraw(); }   // redesenha aqui: as ações que só abrem modal (overlayC) não redesenham a tela de trás
function clMenu(m,e){ if(e)e.stopPropagation(); CL.menu=(CL.menu===m?null:m); cdraw(); }
/* GAVETA LATERAL (telefone). cdraw() recria o DOM inteiro, então a transição de ABERTURA vem de
   uma @keyframes no CSS (anima ao ser inserido). Pra FECHAR não dá pra fazer o mesmo — o
   elemento sumiria antes de animar —, então marcamos .closing, esperamos a animação e só aí
   trocamos o estado e redesenhamos. */
function clToggleMobMenu(e){ if(e)e.stopPropagation();
  if(CL.mobMenuOpen){ closeMobMenu(); return; }
  CL.mobMenuOpen=true; cdraw();
}
function closeMobMenu(){
  const g=$c('.cl-menu.mob-open');
  const fim=()=>{ CL.mobMenuOpen=false; CL.menu=null; cdraw(); };
  if(!g || !isPhone()){ fim(); return; }
  g.classList.add('closing');
  const scrim=$c('.cl-menu-scrim'); if(scrim) scrim.classList.add('closing');
  setTimeout(fim, 240);   // igual à duração da animação em .cl-menu.closing
}
function clToggleRoster(){ CL.rosterOpen = CL.rosterOpen===false ? true : false; cdraw(); }
/* toggle genérico de acordeão — usado em qualquer seção recolhível (país, financeiro, etc.) */
function clToggleAcc(key){ CL[key] = CL[key]===false ? true : false; cdraw(); }
function menuDropdown(name){ name=name||CL.menu;
  const F=Object.keys(FORMATIONS);
  const items={
    'RetroFoot98':[['Opções','clOptions()'],['—'],['Gravar jogo','clSaveMenu()'],['Sair para o menu','clExit()']],
    'Formação':[...F.map((f,i)=>[`${f}`,`clSelFormation('${f}')`,(i+1)+'/'+FKEY[f]]),['—'],['Automático','clSelFormation(\'auto\')'],['Melhores','clSelFormation(\'best\')']],
    'Equipa':[['Estádio','clStadium()'],['Historial','clClubHistory()']],
    'Jogador':[['Vender','clSell()'],['Comprar jogador','clMarketClubs()'],[`Propostas recebidas${myIncomingOffers().length?' ('+myIncomingOffers().length+')':''}`,'clIncomingOffers()'],[`Contrapropostas${(typeof myCounterOffers==='function'&&myCounterOffers().length)?' ('+myCounterOffers().length+')':''}`,'clCounterOffers()'],['Leilão de jogadores','clAuctionScreen()'],[(typeof youthAvailable==='function'&&youthAvailable())?'Subir jogador da base':'Base (indisponível agora)','clPromoteYouth()'],[`Treino especial (${myTrainingList().length}/${TRAINING_MAX_SLOTS})`,'clTrainingScreen()'],['Últimas transferências','clTransferHistory()']],
    'Campeonatos':[['Minhas competições','clCompList()','C'],['—'],['Melhores marcadores','clScorers()'],['Calendário','clCalendar()'],['—'],['Últimos vencedores','clUltimosVencedores()'],['Melhores marcadores de sempre','clScorersAllTime()']].concat((S&&S.bgLeagues&&Object.keys(S.bgLeagues).length)?[['—'],['Ligas internacionais','clBgLeaguesMenu()']]:[]),
    'Treinador':[['História','clCoachHistory()'],['Sala de Troféus','clTrophyRoom()'],['Ranking','clCoachRanking()'],['Ofertas','clJobOffers()'],['Perfil','clPerfilTreinador()']]
  };
  if(CL.online){
    const rItems=[];
    if(typeof NET!=='undefined' && NET.isHost){ const nr=(CL.pendingJoins&&CL.pendingJoins.length)||0; rItems.push(['Aprovar entradas'+(nr?' ('+nr+')':''),'clJoinRequestsPanel()']); }
    rItems.push(['Sincronizar com a sala','clSyncResenha()']);
    rItems.push(['Chamar pra Resenha','clInviteResenha()']);
    items['Modo Resenha']=rItems;
  }
  const list=items[name]||[]; if(!list.length) return '';
  const rows=list.map(it=>{ if(it[0]==='—') return '<div class="cl-menu-sep"></div>';
    // clMenuPick() zera a gaveta ANTES da ação: como a própria ação redesenha a tela (cdraw) ou
    // abre um modal, o menu já sai do caminho no mesmo passo. Sem isso, no telefone, escolher
    // uma formação (ou qualquer item) deixava a gaveta aberta por cima do conteúdo.
    return `<div class="cl-menu-dd-i" onclick="clMenuPick();${it[1]}"><span>${escC(it[0])}</span>${it[2]?`<b>${it[2]}</b>`:''}</div>`; }).join('');
  return `<div class="cl-menu-dd" onclick="event.stopPropagation()">${rows}</div>`;
}
function clStub(t){ CL.menu=null; toastC(t+' — em breve.'); cdraw(); }
/* ---- RetroFoot98 > Opções... ---- */
/* "Tempo de jogo" (ritmo do liveTick) é a única opção com efeito compartilhado no Modo Resenha:
   controla também o intervalo de polling (onlineTimerLoop). Por isso, online, só o Anfitrião pode
   mudar — os convidados ficam travados no valor que ele escolheu (games.speed_mult, já
   sincronizado/restrito por RLS ao host — ver netSetSpeed). Baseline 'Usain Bolt'=1x preserva o
   comportamento padrão de hoje pra quem nunca mexeu na opção (games.speed_mult nasce em 1). */
/* 'Foguete' e o degrau acima do Usain Bolt, para atravessar temporadas depressa e ver o que
   acontece no fim delas. 6ms por minuto de jogo bate no piso do proprio navegador (setTimeout
   nao desce abaixo de ~4ms) e quem manda passa a ser o desenho de cada minuto: da a partida em
   cerca de um segundo. E de TESTE — a opcao diz isso na tela. */
const TEMPO_MS={Curto:360,Médio:560,Longo:820,Ultrassônico:110,'Usain Bolt':37,Foguete:6};
/* PADRÃO (solo e sala nova): Ultrassônico. 'Usain Bolt' (37ms) resolve a rodada em ~3,5s — rápido
   demais pra acompanhar qualquer coisa e, na prática, deixaria o Modo Camarote TRANCADO por padrão
   (ver camSpeedOk), escondendo o modo de quem nunca abriu as Opções. Ultrassônico (110ms, ~10s de
   partida) é o ponto em que ainda dá pra assistir sem ficar lento. Quem quiser o extremo continua
   escolhendo Usain Bolt na mão — só perde o Camarote enquanto estiver nele. */
const TEMPO_DEFAULT='Ultrassônico';
/* ===== INTERRUPTOR TEMPORÁRIO DE TESTE: RITMO ULTRASSÔNICO NOS DOIS MODOS =====
   Ligado, força o rótulo abaixo no Solo E na Resenha, ignorando a opção salva de cada save e o
   ritmo escolhido pelo anfitrião da sala. É uma trava de BANCADA — serve pra rodar temporada
   inteira em minutos enquanto se testa outra coisa, não pra ser o comportamento do jogo.

   PRA DESLIGAR: ponha null aqui. Nada mais precisa mudar — quem lê o ritmo passa por
   tempoLabelAtual()/roundSpeedMult(), e os dois voltam a respeitar a opção do usuário e a
   configuração da sala no mesmo instante.

   Enquanto estiver ligado, a tela de Opções mostra o aviso (ver renderOptions) pra ninguém
   passar meia hora achando que a preferência dele quebrou. */
/* LIGADO EM 'Foguete' (18/08/2026), A PEDIDO, PARA TESTES. Vale para TODAS as competicoes
   (liga e copas correm no mesmo liveTick) e para os dois modos, Solo e Resenha -- na Resenha
   ele passa por cima tanto da opcao de cada jogador como do ritmo escolhido pelo anfitriao,
   que e justamente o ponto: todos correm igual, depressa, sem combinar nada.
   ENQUANTO ESTIVER ASSIM, a escolha em Opcoes -> Tempo de jogo NAO tem efeito (a propria tela
   avisa isso). Voltar a `null` devolve o comando a quem joga -- foi por isso que ele esteve
   desligado desde 17/08. */
const TEMPO_TESTE=null;   // ← rótulo (ex.: 'Foguete') liga a trava de bancada; null devolve o comando a quem joga
/* rótulo de ritmo que vale AGORA (o de teste, quando ligado; senão a opção do save) */
function tempoLabelAtual(){
  if(TEMPO_TESTE && TEMPO_MS[TEMPO_TESTE]) return TEMPO_TESTE;
  const salvo=clOpcoes().tempo;
  /* RITMO SALVO QUE JA NAO EXISTE CAI NO PADRAO. Quem experimentou o 'Foguete' tem o rotulo
     gravado no save; sem esta rede, TEMPO_MS[rotulo] vinha undefined e o relogio da partida
     ficava sem intervalo. */
  return (salvo && TEMPO_MS[salvo]) ? salvo : TEMPO_DEFAULT;
}
/* A Resenha usa a MESMA escala do solo: o rótulo escolhido pelo ANFITRIÃO vale ms por ms pra todo
   mundo (viaja em games.speed_mult = TEMPO_MS['Usain Bolt']/TEMPO_MS[rótulo], então
   TEMPO_MS['Usain Bolt']/speed_mult devolve exatamente o ms dele). A Fase 3B tinha ancorado o
   online num fixo de 360ms pra transmissão ao vivo caber; isso jogou fora a opção do anfitrião —
   'Ultrassônico' virava 1070ms/min. Agora o freio é cirúrgico: só um PISO, e só nas rodadas com
   transmissão humano×humano viva (ver onlineTickFloorMs). */
const TEMPO_MULT={}; Object.keys(TEMPO_MS).forEach(k=>TEMPO_MULT[k]=TEMPO_MS['Usain Bolt']/TEMPO_MS[k]);
function tempoLabelFromMult(mult){ const m=mult||1; let best='Usain Bolt',bd=Infinity;
  Object.keys(TEMPO_MULT).forEach(k=>{ const d=Math.abs(TEMPO_MULT[k]-m); if(d<bd){bd=d;best=k;} }); return best; }
function clSetTempo(label){
  clOpcoes().tempo=label; clOpcoesGravar();
  if(CL.online && typeof NET!=='undefined' && NET.isHost && typeof clSetSpeed==='function') clSetSpeed(TEMPO_MULT[label]||1);
  cdraw();
}
/* ===== OPCOES: UMA SO TELA (27/08) =====
   Existiam TRES superficies para as mesmas opcoes: esta (pele de 98, `renderOptions`), o modal
   novo (rf26-acoes) e a pagina de Configuracoes. A pele nova sobrescreve `window.clOptions`
   (ver rf26-acoes.js), entao este dialogo nunca abria — ficou aqui a duplicar rotulos e a
   convidar a corrigir bug no lado errado. Foi apagado.
   Fica so o carregamento das opcoes, que o modal novo e os consumidores usam. */

/* AS OPCOES PASSAM A SOBREVIVER AO RECARREGAMENTO. `CL.options` e estado de SESSAO: nada
   dali ia para o disco, entao Tempo de jogo, Salvamento automatico e Substituicoes ao
   intervalo — as tres que funcionam de verdade — voltavam ao padrao a cada F5, e o botao
   "Guardar" gravava o save sem gravar as opcoes. Agora a casa delas e `S.config.opcoes`,
   que viaja no save; `CL.options` e so a copia de trabalho. */
const CL_OPCOES_PADRAO={ som:'Sim', autoSave:'Sim', subsIntervalo:'Sim', tempo:TEMPO_DEFAULT };
function clOpcoesCarregar(){
  const guardado=(typeof S!=='undefined' && S && S.config && S.config.opcoes) || {};
  CL.options=Object.assign({}, CL_OPCOES_PADRAO, guardado);
  return CL.options;
}
/* chamada por quem le CL.options: garante que a copia existe e reflete o save */
function clOpcoes(){ return CL.options || clOpcoesCarregar(); }
/* escreve na casa definitiva — sem isto a opcao muda na tela e morre no recarregamento */
function clOpcoesGravar(){
  if(typeof S==='undefined' || !S) return;
  S.config=S.config||{};
  S.config.opcoes=Object.assign({}, S.config.opcoes, CL.options);
}

/* ---- RetroFoot98 > Opções > Voltar a um ponto guardado ----
   Lista as fotos que o salvamento automático guardou (ver autosave.js). Voltar é destrutivo por
   natureza — o que veio depois do ponto some —, então a confirmação diz exatamente o que se
   perde, e na Resenha avisa que a sala inteira volta junto. */
function clAutoSaveAbrir(){
  if(typeof autoSaveLista!=='function'){ toastC('Salvamento automático indisponível.'); return; }
  autoSaveLista().then(fotos=>{
    const online=!!(CL.online), souAnfitriao=(typeof NET!=='undefined' && NET.isHost);
    const trava = (online && !souAnfitriao)
      ? '<div class="cl-opt-teste">🔒 Só o <b>Anfitrião</b> pode voltar a sala a um ponto guardado — o jogo dos dois volta junto.</div>' : '';
    const aviso = (online && souAnfitriao)
      ? '<div class="cl-opt-teste">⚠️ Voltar a sala afeta <b>os dois jogadores</b>: tudo que aconteceu depois do ponto escolhido é descartado.</div>' : '';
    const linhas = fotos.length ? fotos.map(f=>{
      const r=autoSaveRotulo(f);
      const acao=(online && !souAnfitriao) ? '' : btn('Voltar aqui','clAutoSaveVoltar('+f.id+')',{icon:'⏪'});
      return `<div class="cl-orow"><span>${r.fixa?'📌 ':''}${escC(r.que)}<br><i>guardado em ${escC(r.quando)}</i></span>${acao}</div>`;
    }).join('') : '<div class="cl-orow"><span>Nenhum ponto guardado ainda. A primeira foto sai ao fim da próxima rodada.</span></div>';
    overlayC(dlg('Pontos guardados', `<div class="cl-opt"><div class="cl-opanel">${trava}${aviso}${linhas}</div>
      <div class="cl-oside">${btn('Fechar','clOptions()',{icon:'✖',cls:'cl-btn-cancel'})}</div></div>`,
      {w:700,bodyClass:'cl-body-gray',min:true}));
  });
}
function clAutoSaveVoltar(id){
  autoSaveLista().then(fotos=>{
    const f=fotos.find(x=>x.id===id); if(!f){ toastC('Ponto não encontrado.'); return; }
    const r=autoSaveRotulo(f);
    const extra=CL.online?' O jogo dos <b>dois jogadores</b> da sala volta junto.':'';
    overlayC(dlg('Voltar para este ponto?', `<div class="cl-opt"><div class="cl-opanel">
      <div class="cl-orow"><span>Você vai voltar para <b>${escC(r.que)}</b>, guardado em ${escC(r.quando)}.<br>
      Tudo que aconteceu depois disso é descartado e não dá para desfazer.${extra}</span></div></div>
      <div class="cl-oside">${btn('Voltar aqui','clAutoSaveVoltarOk('+id+')',{icon:'⏪',cls:'cl-btn-ok'})}${btn('Cancelar','clAutoSaveAbrir()',{icon:'✖',cls:'cl-btn-cancel'})}</div>
    </div>`,{w:640,bodyClass:'cl-body-gray',min:true}));
  });
}
function clAutoSaveVoltarOk(id){
  autoSaveRestaurar(id).then(res=>{
    if(!res.ok){ toastC('Não deu para voltar: '+(res.erro||'erro desconhecido')); return; }
    clCloseOverlay(); CL.screen='main'; CL.tab='jogo'; cdraw();
    toastC('⏪ Voltou para a temporada '+(S.season||'?')+', rodada '+((S.round||0)+1)+'.');
  });
}
function clOptOk(){ saveV3(); clCloseOverlay(); toastC('Opções guardadas.'); }

/* ---- Treinador > Perfil: preferências de verdade, não só cosmética —
   "Gestão de Salários" reajusta contratos sozinho a cada temporada (ver
   autoManageSalaries em app.js) e "Compra em leilão" filtra de verdade
   o que aparece no seu leilão (ver refreshAuctionPool em app.js). ---- */
function clPerfilTreinador(){ CL.menu=null;
  if(!S.config.profile) S.config.profile=freshConfig().profile; // migração defensiva pra saves antigos
  CL._profileSnapshot=JSON.parse(JSON.stringify(S.config.profile));
  CL.perfilTab='salarios';
  renderPerfilTreinador();
}
function renderPerfilTreinador(){
  const prof=S.config.profile; const tab=CL.perfilTab||'salarios';
  const tabs=`<div class="cl-otabs">
    <span class="cl-otab ${tab==='salarios'?'on':''}" onclick="CL.perfilTab='salarios';renderPerfilTreinador()">Gestão de Salários</span>
    <span class="cl-otab ${tab==='leilao'?'on':''}" onclick="CL.perfilTab='leilao';renderPerfilTreinador()">Compra em leilão</span>
  </div>`;
  let body;
  if(tab==='salarios'){
    const cb=(key,label)=>`<label class="cl-pcheck"><input type="checkbox" ${prof.salaryMgmt[key]?'checked':''} onchange="S.config.profile.salaryMgmt['${key}']=this.checked"> ${label}</label>`;
    body=`<div class="cl-pbody">
      <div class="cl-pmsg">Quero que o computador faça a<br>gestão dos salários:</div>
      ${cb('nacionais','aos jogadores nacionais')}
      ${cb('bosman','aos jogadores estrangeiros abrangidos pela Lei Bosman')}
      ${cb('estrangeiros','aos outros jogadores estrangeiros')}
    </div>`;
  } else {
    const modeRadio=(val,label)=>`<label class="cl-pradio"><input type="radio" name="cl-auctionmode" ${prof.auctionMode===val?'checked':''} onchange="S.config.profile.auctionMode='${val}'"> ${label}</label>`;
    body=`<div class="cl-pbody">
      <label class="cl-pcheck"><input type="checkbox" ${prof.auctionPrivate?'checked':''} onchange="S.config.profile.auctionPrivate=this.checked"> Não quero que os outros vejam as minhas ofertas</label>
      <fieldset class="cl-pfield"><legend>Ofertas</legend>
        ${modeRadio('todos','Quero fazer ofertas a todos os jogadores')}
        ${modeRadio('sem_fracos','Não quero fazer ofertas aos jogadores mais fracos')}
        ${modeRadio('nenhum','Não quero comprar jogadores em leilão')}
      </fieldset>
    </div>`;
  }
  overlayC(dlg('Perfil de '+escC(CL.mgr||'Treinador'), `<div class="cl-opt">
    ${tabs}
    <div class="cl-opanel">${body}</div>
    <div class="cl-oside">${btn('OK','clPerfilOk()',{icon:'✔',cls:'cl-btn-ok'})}${btn('Cancelar','clPerfilCancel()',{icon:'✖',cls:'cl-btn-cancel'})}</div>
  </div>`,{w:740,bodyClass:'cl-body-gray',min:true}));
}
function clPerfilOk(){ saveV3(); clCloseOverlay(); toastC('Preferências do treinador guardadas.'); advanceAuctions(); }
function clPerfilCancel(){ S.config.profile=CL._profileSnapshot; clCloseOverlay(); }

/* ---- Treinador > História / Ranking ---- */
const COACH_POOL=['C. A. Silva','Artur Nunes','Dimas Filgueiras','Wanderlei Sousa','Carlos A. Silva','Antônio Lopes','Celso Roth','Émerson Leão','Cláudio Duarte','Gassem','Eduardo Amorim','Joel Castro','Oswaldo Alvarez','Arnaldo Lira','Felipe Scolari','Rafael Granit','Nelsinho','C. A. Torres','Gilson Nunes','Rubens Minelli','Beto Almeida','Pardal','Lauro Búrigo','Amado Bucar','Abel Braga','Evaristo Macedo','Jair Pereira'];
function coachName(clubId,idx){ if(CL.humans&&CL.humans[clubId]) return CL.humans[clubId]; return COACH_POOL[idx%COACH_POOL.length]; }
/* ícone por tipo de evento da carreira do treinador — troféus de campeão usam a imagem
   real da competição (ver comp); os demais tipos usam um emoji fixo */
const COACH_HIST_ICON={contratado:'🤝', acesso:'🔺', rebaixamento:'🔻', campeao:'🏆', demissao:'🚪'};
function coachHistRowHTML(entry){
  // compat: saves antigos guardavam a linha como texto puro "TEMPORADA  Texto"; sem tipo,
  // sem ícone reconhecido — mostra como estava antes.
  if(typeof entry==='string') return `<div class="cl-chist-row"><span class="cl-chist-ic">📌</span><span>${escC(entry)}</span></div>`;
  const trophy = entry.type==='campeao' && entry.comp ? trophyImg(entry.comp,20) : '';
  const icon = trophy || `<span class="cl-chist-ic">${COACH_HIST_ICON[entry.type]||'📌'}</span>`;
  return `<div class="cl-chist-row">${icon}<span><b>${entry.season}</b> — ${escC(entry.text)}</span></div>`;
}
/* tabela temporada-a-temporada (posição na divisão + fase alcançada em cada copa) —
   reaproveitada por clCoachHistory (carreira inteira, todos os clubes) e clClubHistory
   (só as temporadas de um clube específico). Fonte: S.history, alimentado em endSeason(). */
function seasonHistoryTableHTML(entries){
  if(!entries.length) return '<div class="cl-cup-hint">Nenhuma temporada concluída ainda.</div>';
  const head=`<div class="cl-seasonhist-row cl-seasonhist-head">
    <span>Ano</span><span>Clube</span><span>Posição</span><span>Copa do Brasil</span><span>Libertadores</span><span>Sul-Americana</span></div>`;
  const cupLabel=(h,k)=>escC((h.myCups&&h.myCups[k])||'—');
  const rows=entries.slice().reverse().map(h=>`<div class="cl-seasonhist-row">
      <span class="cl-seasonhist-season">${h.season}</span>
      <span>${escC(h.myClubShort||'—')}</span>
      <span>${h.myPos?h.myPos+'º — Série '+escC(h.division||'A'):'—'}</span>
      <span>${cupLabel(h,'copaBrasil')}</span>
      <span>${cupLabel(h,'libertadores')}</span>
      <span>${cupLabel(h,'sulamericana')}</span>
    </div>`).join('');
  return head+rows;
}
/* barra de SEGURANÇA NO CARGO — reflete a régua jobSecurity (70% posição na tabela + 30% moral
   do elenco). Verde = tranquilo, amarelo = atenção, vermelho = cargo em risco. */
/* ===== CARREIRA NA RESENHA (Fase 2): demissão -> desempregado -> convite -> assume =====
   O motor (tickResenhaCareer, core.js) decide; aqui é a UI + a troca de assento no servidor. */
function handleResenhaCareer(){
  if(typeof tickResenhaCareer!=='function') return;
  const ev=tickResenhaCareer(); if(!ev) return;
  if(ev.kind==='fired') enterResenhaUnemployment();
  else if(ev.kind==='offer') showResenhaOffer(ev.offer);
}
function enterResenhaUnemployment(){
  if(!CL.online) return;
  CL._firedFrom=CL.clubId; CL.unemployed=true; CL._unempRounds=0; CL._pendingResenhaOffer=null;
  S.coachHistory=S.coachHistory||[];
  S.coachHistory.push({season:S.season, type:'demissao', text:`Demitido pelo ${String((clubOf(CL._firedFrom)||{}).short||'clube').toUpperCase()}`});
  /* a passagem pelo clube fecha AQUI e fecha como demissão — quem for demitido fica sem clube por
     algumas rodadas, e esperar pela contratação seguinte para a fechar deixava a Carreira a
     mostrar uma passagem "em curso" num clube que já não é dele. */
  try{ if(typeof coachSpellsMigrar==='function') coachSpellsMigrar();
       if(typeof coachSpellFechar==='function') coachSpellFechar('demitido'); }
  catch(e){ console.warn('passagem (demissão):', e&&e.message); }
  if(typeof persistCareer==='function') persistCareer();   // a carreira mudou: grava no assento (ver #13)
  // libera o clube no servidor (vira CPU); se falhar, desfaz o estado local pra não travar o jogador
  if(typeof NET!=='undefined' && NET.setMyClub){
    NET.setMyClub(null).then(r=>{ if(!r||!r.ok){ console.warn('setMyClub(null):', r&&r.error); CL.unemployed=false; } });
  }
  overlayC(dlg('Você foi demitido', `<div class="cl-res" style="text-align:center;padding:16px">
    <div class="cl-res-score" style="color:#c0392b">Demitido do ${escC((clubOf(CL._firedFrom)||{}).short||'clube')}</div>
    <div class="cl-res-verd" style="margin-top:8px">Os resultados e o clima do vestiário não seguraram o seu cargo.<br>
      Você fica <b>sem clube</b>, acompanhando as rodadas. Em algumas rodadas um clube livre pode te chamar.</div>
    <div class="cl-cal-ok" style="margin-top:14px">${btn('Entendi','clCloseOverlay();CL.screen=\'main\';CL.tab=\'jogo\';cdraw()',{icon:'✔',cls:'cl-btn-ok'})}</div>
  </div>`,{w:470,bodyClass:'cl-body-gray'}));
}
/* A RESENHA USA A MESMA MESA DE JANTAR DA CARREIRA SOLO.
   Antes havia dois caminhos e o multiplayer usava o pobre: um único modal genérico
   "🤝 Proposta de emprego" com Aceitar/Recusar, enquanto o solo tinha as duas etapas
   (showJobInvite -> showJobProposal) com o convite pro jantar, os termos do contrato na mesa e o
   recado do presidente. Era a mesma decisão de carreira contada de duas formas diferentes.
   Agora os dois caminhos entram nas MESMAS telas; `_resenha` marca a oferta pra que aceitar e
   recusar sigam a mecânica da sala (troca de assento via NET.setMyClub) em vez da do solo. */
function showResenhaOffer(offer){
  if(!offer) return;
  offer._resenha=true;
  showJobInvite(offer);
}
function clAcceptResenhaOffer(){
  /* ===== A OFERTA QUE ESTA NA TELA VALE COMO REDE =====
     `CL._pendingResenhaOffer` vive so em memoria: recarregar a pagina (ou uma sincronia da sala,
     que recarrega) apaga-o. Quem tivesse o convite aberto carregava em "Aceitar" e o codigo saia
     por aqui em silencio — o modal fechava e nada acontecia. Era o relatado a 19/08/2026.
     A oferta que o jantar esta a mostrar (`CL._jobOffer`) e a mesma coisa e nao se perde entre
     as duas telas do fluxo, entao serve de segunda fonte. */
  const offer=CL._pendingResenhaOffer || CL._jobOffer || CL._ofertaEmMesa;
  if(!offer || !offer.clubId){
    console.warn('aceitar convite da sala: nao ha oferta em memoria — o modal fecha sem trocar de clube');
    toastC('Esse convite expirou. Espere a próxima sondagem.','warn');
    clCloseOverlay(); return;
  }
  CL._pendingResenhaOffer=offer;
  if(typeof NET==='undefined' || !NET.setMyClub){ toastC('Recurso indisponível.'); return; }
  const from = CL.unemployed ? CL._firedFrom : CL.clubId; // sondagem aceita por quem está empregado: o clube que fica pra trás é o ATUAL
  toastC('Assumindo o clube...');
  NET.setMyClub(offer.clubId).then(r=>{
    if(!r||!r.ok){ toastC('Não deu pra assumir'+((r&&r.error)?' ('+r.error+')':'')+'.'); return; }
    CL.unemployed=false; CL._unempRounds=0; CL._pendingResenhaOffer=null; CL._ofertaEmMesa=null;
    if(Array.isArray(S.pendingJobOffers)) S.pendingJobOffers=S.pendingJobOffers.filter(x=>x.clubId!==offer.clubId);
    CL.clubId=offer.clubId; S.clubId=offer.clubId;
    /* ===== CONVITE DE OUTRO PAÍS: O MUNDO DE LÁ NASCE AGORA =====
       Enquanto ninguém joga num país, ele pode viver de simulação de fundo. A partir do momento
       em que um treinador assume um clube lá, não pode: a regra é que ele assiste a todas as
       partidas das competições do país dele, e uma quick-sim não dá partida para assistir.
       `criarMundoDoPais` monta as divisões com elencos, calendário e tabela — reaproveitando a
       tabela em curso da liga de fundo, para a temporada não recomeçar do zero no meio do ano.
       O país ANTIGO continua vivo: os outros treinadores da sala seguem lá. */
    try{
      const uniNovo=(typeof universoDoClube==='function')?universoDoClube(offer.clubId):null;
      const uniAtual=(typeof activeUniverseKey==='function')?activeUniverseKey():'brasil';
      if(uniNovo && uniNovo!==uniAtual && typeof criarMundoDoPais==='function'){
        criarMundoDoPais(uniNovo, offer.division||null);
        if(typeof setUniverse==='function') setUniverse(uniNovo);   // a MINHA visão passa a ser a de lá
      }
    }catch(e){ console.warn('mundo do país novo:', e && e.message); }
    if(CL.humans){ if(from!=null) delete CL.humans[from]; CL.humans[offer.clubId]=CL.mgr; }
    if(typeof applyViewerDivision==='function') applyViewerDivision(CL.clubId);
    S.xi=(typeof resolveClubXI==='function')?resolveClubXI(CL.clubId):(typeof autoXI==='function'?autoXI(CL.clubId):S.xi);
    CL.tacticChosen=false; CL.formation=null; CL.selPlayer=squad(CL.clubId)[0]?.pid||null; S.jobSecurity=55;
    if(offer.salary) S.coachSalary=offer.salary;     // o número que ele viu na mesa do jantar é o que passa a valer
    S.lastClubChangeSeason=S.season;                 // trava a próxima troca por duas temporadas (ver resenhaCanMoveClub)
    S.coachHistory=S.coachHistory||[];
    S.coachHistory.push({season:S.season, type:'contratado', text:`Contratado pelo ${String((clubOf(offer.clubId)||{}).short||offer.clubId).toUpperCase()}`});
    if(typeof persistCareer==='function') persistCareer();   // a carreira mudou: grava no assento (ver #13)
    clCloseOverlay(); CL.screen='main'; CL.tab='jogo'; cdraw();
    toastC('Você é o novo treinador do '+((clubOf(offer.clubId)||{}).short||''));
  });
}
function jobSecurityTipText(js,lbl){
  return `Segurança atual: ${js}% (${lbl}). Abaixo de 15%, risco de demissão a cada rodada. Acima de 80%, chance de receber convite de outro clube. Calculado com 70% da posição na tabela + 30% da moral do elenco.`;
}
/* dark=true: variante usada em panJogo() (tela principal, fundo escuro) — mesma estrutura de
   .cl-blk-l/.cl-bar da barra de Moral (ver panJogo), só com um gradiente diferente pra
   distinguir visualmente as duas métricas. dark=false (padrão): variante usada em
   clCoachHistory() (modal de fundo claro) — mesma barra, rótulo com cor legível nesse fundo. */
function jobSecurityBarHTML(opts){
  const dark=opts&&opts.dark;
  const js=Math.round(S.jobSecurity!=null?S.jobSecurity:60);
  const lbl = js>=70?'Prestígio alto' : js>=40?'Estável' : js>=16?'Sob pressão' : 'Cargo em risco!';
  const tip=jobSecurityTipText(js,lbl);
  const flag = js<25?' <span class="cl-risk-flag">⚠️ risco</span>':'';
  const bar=`<div class="cl-bar cl-bar-jobsec" style="--val:${js}"><div class="cl-bar-fill" style="width:${js}%"></div></div>`;
  if(dark) return `<div class="cl-blk-l"><span class="cl-tip-label" title="${escC(tip)}">Segurança no cargo</span>${flag}</div>${bar}`;
  return `<div style="margin:2px 0 12px;font-family:var(--sans)">
    <div style="font-size:13px;color:#333;margin-bottom:4px"><span class="cl-tip-label" style="border-bottom-color:rgba(0,0,0,.35)" title="${escC(tip)}">Segurança no cargo</span>${flag}</div>
    ${bar}
  </div>`;
}
function clCoachHistory(){ CL.menu=null;
  const lines=(S.coachHistory&&S.coachHistory.length)?S.coachHistory:[{season:S.season, type:'contratado', text:`Contratado pelo ${clubOf(CL.clubId).short.toUpperCase()}`}];
  const seasonTable=seasonHistoryTableHTML(S.history||[]);
  overlayC(dlg(CL.mgr||'Treinador', `
    ${jobSecurityBarHTML()}
    <div class="cl-seasonhist-wrap">${seasonTable}</div>
    <div class="cl-chist" style="margin-top:12px">${lines.map(coachHistRowHTML).join('')}</div>
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{ad:'modal-historia-728x90',w:660,bodyClass:'cl-body-gray',min:true})); }
/* ---- Equipa > Historial: as temporadas em que o clube (o atual, por padrão) foi
   comandado pelo treinador neste save — útil se ele já assumiu outros clubes e quer ver
   o resumo de um deles. Só cobre clubes que o próprio jogador já comandou (S.history só
   grava detalhe pra CL.clubId de cada temporada, não pra todos os 80 clubes do universo). */
function clClubHistory(clubId){ CL.menu=null;
  clubId = clubId || CL.clubId;
  const c=clubOf(clubId);
  const entries=(S.history||[]).filter(h=>h.clubId===clubId);
  const table=seasonHistoryTableHTML(entries);
  const hint = '<div class="cl-cup-hint">Mostra só as temporadas em que você comandou este clube neste save.</div>';
  overlayC(dlg('Historial — '+(c?c.short:'clube'), `<div class="cl-seasonhist-wrap">${table}</div>${hint}
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:660,bodyClass:'cl-body-gray',min:true})); }
/* CARREIRA (ranking de treinador): acumula, por clube, os PONTOS SOMADOS de todas as temporadas
   encerradas + a contagem de TÍTULOS (campeão da própria divisão). Lê as tabelas finais de
   S._prevSeason (que o servidor fornece na virada) e soma UMA vez por temporada (guarda por
   marcador).

   MORAVA EM CL (client-local) E SUMIA A CADA RECARGA. O acumulado só é somado na VIRADA de
   temporada, e S._prevSeason é consumido ali mesmo — conferido em produção, ele não fica guardado
   no estado da sala. Ou seja: quem recarregasse a página perdia o Ranking de Treinadores pra
   sempre, sem nenhuma forma de recomputar. Mesmo buraco do histórico de títulos, só que numa tela
   diferente. Agora vive em S.coachCareerStats e viaja em CAREER_KEYS -> game_seats.career.
   (o nome não é `careerStats` de propósito: p.careerStats já existe e é a súmula do JOGADOR) */
function accrueCareerStats(){
  const pv=S && S._prevSeason; if(!pv || !pv.tables) return;
  migrateCoachCareerStats();
  if(S._coachCareerSeason===pv.season) return;      // já contei esta temporada
  S._coachCareerSeason=pv.season;
  Object.keys(pv.tables).forEach(div=>{
    (pv.tables[div]||[]).forEach((row,i)=>{
      const s=S.coachCareerStats[row.id]||(S.coachCareerStats[row.id]={pts:0,titles:0});
      s.pts += (row.Pts||0);
      if(i===0) s.titles += 1;                       // campeão da divisão
    });
  });
  if(typeof persistCareer==='function') persistCareer();   // grava no assento junto com o resto da carreira
}
/* sessão que já vinha rodando com o acumulado em CL: aproveita o que ela tem em vez de zerar */
function migrateCoachCareerStats(){
  if(!S) return;
  if(!S.coachCareerStats){
    S.coachCareerStats = (CL && CL.careerStats) ? CL.careerStats : {};
    if(S._coachCareerSeason==null && CL && CL._careerAccruedSeason!=null) S._coachCareerSeason=CL._careerAccruedSeason;
  }
  if(CL) CL.careerStats=S.coachCareerStats;   // leitores antigos continuam vendo a mesma referência
}
/* ================= SALA DE TROFÉUS (handoff "Sala de Troféus do Treinador") =================
   Treinador > Sala de Troféus... — as taças da CARREIRA (não do clube), agrupadas por região,
   com filtro por temporada e o painel CAMPANHA contando como cada título foi ganho.

   FONTE DOS DADOS: S.coachHistory, entradas type:'campeao' — o mesmo registro que a tela de
   História já usava. Desde 05/08/2026 cada título nasce com clube, pontos e o placar da decisão
   (ver endSeason em core.js); títulos gravados ANTES disso aparecem normalmente na estante, só
   sem o cartão de placar — por isso todo acesso a t.final/t.clubShort é defensivo.

   O catálogo de taças (arte, região, dica) fica em src/data/trophy-room.js. Título de uma
   competição fora do catálogo (as ligas dos outros universos, que não têm arte) vira um card
   avulso com o 🏆 genérico, pra estante nunca esconder uma conquista.

   Aba Resenha: ranking de treinadores pela mesma base do Ranking de Treinadores (os clubes da
   divisão atual), com a fila de taças vinda de S.titlesByClub — títulos por clube e competição
   acumulados no fim de cada temporada. As linhas dos rivais não são clicáveis: não guardamos a
   campanha deles, só a contagem, então "abrir a sala do rival" mostraria uma tela vazia. */
function salaRegionForUni(uni){
  if(!uni || uni==='brasil') return 'BRASIL';
  const cfg=(typeof UNI_CONFIGS!=='undefined') && UNI_CONFIGS[uni];
  if(cfg && cfg.src==='conmebol') return 'AMÉRICA DO SUL';
  return 'EUROPA';
}
function salaTitles(){
  return (S.coachHistory||[]).filter(e=>e && typeof e==='object' && e.type==='campeao');
}
/* id estável por competição, inclusive pros títulos antigos que não gravaram `comp` */
function salaCompId(t){ return t.comp || ('outro:'+(t.label||t.text||'Título')); }
/* catálogo (arte + dica) na ordem das prateleiras, mais os cards avulsos das competições
   conquistadas que não estão no catálogo */
function salaCatalog(){
  const base=((typeof TROPHY_ROOM!=='undefined') && TROPHY_ROOM.comps) || [];
  const out=base.slice(), seen=new Set(base.map(c=>c.id));
  salaTitles().forEach(t=>{ const id=salaCompId(t); if(seen.has(id)) return; seen.add(id);
    const nome=t.label || String(t.text||'Título').replace(/^Campeão d[ao] /,'').replace(/ pelo .*$/,'');
    out.push({ id, nome, curto:nome, img:null, regiao:salaRegionForUni(t.uni), tipo:t.kind||'liga', dica:'' });
  });
  return out;
}
function salaWins(compId, season){
  return salaTitles().filter(t=>salaCompId(t)===compId && (season==='Todos' || String(t.season)===season))
    .sort((a,b)=>b.season-a.season);
}
/* faixa do clube: usa as cores reais quando o clube ainda existe neste save; senão, navy neutro
   (títulos de um clube de outra divisão/universo continuam legíveis) */
function salaStripe(t){
  const c = t.clubId && (typeof clubOf==='function') ? clubOf(t.clubId) : null;
  const st = c ? clubStripe(c) : 'background:var(--navy);color:#fff';
  return `<span class="cl-sala-stripe" style="${st}">${escC((c&&c.short)||t.clubShort||'—')}</span>`;
}
function salaImgSrc(comp){ return comp.img ? ('img/trofeus/'+comp.img) : null; }
function clTrophyRoom(){ CL.menu=null;
  if(CL.salaTab==null) CL.salaTab='sala';
  if(CL.salaSeason==null) CL.salaSeason='Todos';
  renderTrophyRoom();
}
function salaSetTab(tab){ CL.salaTab=tab; renderTrophyRoom(); }
function salaSetSeason(s){ CL.salaSeason=s; renderTrophyRoom(); }
function salaSelect(id){ CL.salaSel=id; renderTrophyRoom(); }
function renderTrophyRoom(){
  const cat=salaCatalog(), titles=salaTitles(), season=CL.salaSeason||'Todos';
  const seasons=[...new Set(titles.map(t=>t.season))].sort((a,b)=>b-a);
  const shown=titles.filter(t=>season==='Todos' || String(t.season)===season);
  // seleção inicial: a conquista mais recente da carreira; sem nenhuma, a primeira taça da estante
  if(!CL.salaSel || !cat.some(c=>c.id===CL.salaSel)){
    const ultimo=titles.slice().sort((a,b)=>b.season-a.season)[0];
    CL.salaSel = (ultimo && salaCompId(ultimo)) || (cat[0]&&cat[0].id);
  }
  const sel=cat.find(c=>c.id===CL.salaSel)||cat[0];
  const selWins=sel?salaWins(sel.id,season):[];

  const tab=(t,lbl)=>`<button class="cl-sala-tab ${CL.salaTab===t?'on':''}" onclick="salaSetTab('${t}')">${lbl}</button>`;
  const status = season==='Todos'
    ? (seasons.length?`Carreira completa · ${seasons[seasons.length-1]}–${seasons[0]}`:'Carreira completa')
    : `Temporada ${escC(season)}`;
  const seasBtn=s=>`<button class="cl-sala-seas ${String(season)===String(s)?'on':''}" onclick="salaSetSeason('${s}')">${escC(s)}</button>`;

  const shelves=((typeof TROPHY_ROOM!=='undefined'&&TROPHY_ROOM.regions)||['BRASIL']).map(reg=>{
    const itens=cat.filter(c=>c.regiao===reg);
    if(!itens.length) return '';
    const cards=itens.map(c=>{
      const wins=salaWins(c.id,season), ganho=wins.length>0, src=salaImgSrc(c);
      const h=Math.round(78*(c.escala||1));
      let stack='';
      if(src){
        // uma cópia por conquista extra, atrás e deslocada — a taça "empilha" conforme repete
        const extras=wins.slice(1).map((w,i)=>`<img class="cl-sala-img extra" src="${src}" alt="" draggable="false"
          style="height:${Math.round(h*0.85)}px;transform:translateX(calc(-50% + ${30*(i+1)}px));z-index:${3-i}">`).join('');
        stack=extras+`<img class="cl-sala-img ${ganho?'won':'locked'}" src="${src}" alt="" draggable="false" style="height:${h}px">`;
      } else {
        stack=`<span class="cl-sala-noart ${ganho?'won':''}">🏆</span>`;
      }
      return `<div class="cl-sala-card ${c.id===sel.id?'on':''}" onclick="salaSelect('${escC(c.id)}')">
        <div class="cl-sala-stack" style="height:${h+2}px">
          ${stack}
          ${wins.length>1?`<span class="cl-sala-xn">×${wins.length}</span>`:''}
        </div>
        <div class="cl-sala-cname ${ganho?'':'locked'}">${escC(c.curto||c.nome)}</div>
      </div>`;
    }).join('');
    const n=itens.filter(c=>salaWins(c.id,season).length).length;
    return `<div class="cl-sala-reg">
      <div class="cl-sala-reg-hdr"><span>${escC(reg)}</span><span class="cl-sala-reg-n">${n}/${itens.length}</span></div>
      <div class="cl-sala-shelf">${cards}</div>
    </div>`;
  }).join('');

  const campanha=selWins.map(t=>{
    const f=t.final;
    const rotulo = sel.tipo==='copa' ? 'FINAL' : 'DECISÃO DO TÍTULO';
    const placar = f ? `${f.hg} × ${f.ag}` : '';
    const obs = t.kind==='liga'||sel.tipo==='liga'
      ? (t.pts!=null?`Campeão com ${t.pts} pts.`:'')
      : (f&&f.pens?`Decidido nos pênaltis (${escC(f.pens)}).`:'');
    return `<div class="cl-sala-win">
      <div class="cl-sala-win-top"><span class="cl-sala-win-ano">${t.season}</span>${salaStripe(t)}</div>
      ${f?`<div class="cl-sala-win-rot">${rotulo}</div>
        <div class="cl-sala-win-score">
          <span class="cl-sala-win-team r">${escC(f.home)}</span>
          <span class="cl-sala-win-pl">${escC(placar)}</span>
          <span class="cl-sala-win-team">${escC(f.away)}</span>
        </div>`:`<div class="cl-sala-win-rot">TÍTULO REGISTRADO</div>`}
      ${obs?`<div class="cl-sala-win-obs">${escC(obs)}</div>`:(!f?`<div class="cl-sala-win-obs">Conquistado antes de o jogo começar a guardar o placar da decisão.</div>`:'')}
    </div>`;
  }).join('');
  const selSrc=salaImgSrc(sel);
  const painel=`<div class="cl-sala-pan">
    <div class="cl-sala-pan-hdr"><span>CAMPANHA</span><span class="cl-sala-pan-reg">${escC(sel.regiao)}</span></div>
    <div class="cl-sala-pan-top">
      <div class="cl-sala-pan-frame">${selSrc?`<img class="cl-sala-pan-img ${selWins.length?'won':'locked'}" src="${selSrc}" alt="" draggable="false">`:`<span class="cl-sala-noart ${selWins.length?'won':''}">🏆</span>`}</div>
      <div class="cl-sala-pan-id">
        <div class="cl-sala-pan-name">${escC(sel.nome)}</div>
        <div class="cl-sala-pan-sub">${selWins.length?(selWins.length>1?selWins.length+' conquistas':'1 conquista'):('Sem conquista'+(season==='Todos'?'':' em '+escC(season)))}</div>
      </div>
    </div>
    <div class="cl-sala-pan-list">${campanha}
      ${selWins.length?'':`<div class="cl-sala-lock">
        <div class="cl-sala-lock-t">${sel.embreve?'Ainda não disputado.':'Ainda não conquistado.'}</div>
        <div class="cl-sala-lock-d">${escC(sel.dica||'')}</div>
      </div>`}
    </div>
    ${adSlotHTML('rf98.hub.sidebar','cl-ad-rect')}
  </div>`;

  // --- por clube (rodapé) ---
  const porClube={};
  shown.forEach(t=>{ const k=t.clubId||t.clubShort||'—'; (porClube[k]=porClube[k]||{t,n:0}).n++; });
  const pills=Object.values(porClube).sort((a,b)=>b.n-a.n).map(x=>`<span class="cl-sala-pill">
      ${salaStripe(x.t)}<b>${x.n}</b><i>${x.n>1?'taças':'taça'}</i></span>`).join('');

  const body = CL.salaTab==='resenha' ? salaResenhaHTML() : `<div class="cl-sala-shelves">${shelves}</div>${painel}`;
  overlayC(dlg(`🏆 Sala de Troféus — ${CL.mgr||'Treinador'}`, `<div class="cl-sala ${CL.salaTab==='resenha'?'sem-filtro':''}">
    <div class="cl-sala-tabs">
      ${tab('sala','🏆 Minha sala')}${tab('resenha','👥 Resenha')}
      <span class="cl-sala-status">${escC(status)}</span>
    </div>
    ${CL.salaTab==='resenha' ? '' : `<div class="cl-sala-filtro">
      <span class="cl-sala-flabel">Temporada:</span>
      <span class="cl-sala-seasons">${seasBtn('Todos')}${seasons.map(seasBtn).join('')}</span>
      <span class="cl-sala-total"><span>TAÇAS NA ESTANTE</span><b>${shown.length}</b></span>
    </div>`}
    <div class="cl-sala-body">${body}</div>
    <div class="cl-sala-foot">
      <span class="cl-sala-byclub">
        <span class="cl-sala-byclub-l">POR CLUBE:</span>
        ${pills || '<span class="cl-sala-empty">Nenhum título ainda. As silhuetas mostram tudo o que dá pra ganhar.</span>'}
      </span>
      ${btn('Voltar ao clube','clCloseOverlay()',{icon:'↩',cls:'cl-btn-ico'})}
      ${btn('Mostrar pra resenha','salaSetTab(\'resenha\')',{icon:'📤',cls:'cl-btn-ok cl-btn-ico'})}
    </div>
  </div>`,{w:1120,bodyClass:'cl-body-estante',min:true}));
}
/* Aba Resenha: quem tem mais taça na sala. Mesma base do Ranking de Treinadores (os clubes da
   divisão atual); a fila de taças vem de S.titlesByClub, e a linha do próprio treinador usa a
   carreira dele (S.coachHistory), que atravessa trocas de clube. */
function salaResenhaHTML(){
  const cat=salaCatalog();
  const compById=id=>cat.find(c=>c.id===id);
  const minis=counts=>{
    const out=[];
    // ordem do catálogo (não a de inserção), pra fila de taças ficar igual entre treinadores
    cat.forEach(c=>{ for(let i=0;i<(counts[c.id]||0);i++) out.push(c.id); });
    return out.slice(0,8).map(id=>{ const c=compById(id), src=c&&salaImgSrc(c);
      return src?`<img class="cl-sala-mini" src="${src}" alt="${escC(c.curto||'')}" title="${escC(c.nome||'')}" draggable="false">`
                :`<span class="cl-sala-mini-x" title="${escC((c&&c.nome)||id)}">🏆</span>`; }).join('');
  };
  const meCounts={}; salaTitles().forEach(t=>{ const id=salaCompId(t); meCounts[id]=(meCounts[id]||0)+1; });
  // A LISTA NÃO PODE SER SÓ A DIVISÃO ATUAL. DATA.clubs traz apenas os clubes da divisão em que
  // eu estou (ver syncDataClubsFromState), então o campeão da Série C ou da Série D tinha a taça
  // gravada em S.titlesByClub e NENHUMA linha onde aparecer — sumia da sala como se nunca tivesse
  // sido campeão. Entram também, portanto, os clubes de fora da divisão que têm título: clubOf
  // resolve o registro completo deles pelo S.clubPool, então nome e cores vêm certos.
  const idsDivisao=DATA.clubs.map(c=>c.id);
  const idsComTaca=Object.keys((S&&S.titlesByClub)||{})
    .filter(id=>!idsDivisao.includes(id) && Object.values(S.titlesByClub[id]||{}).some(n=>n>0));
  const rows=idsDivisao.concat(idsComTaca).map((id,i)=>{
    const eu = id===CL.clubId;
    const counts = eu ? meCounts : ((S.titlesByClub&&S.titlesByClub[id])||{});
    const total = Object.values(counts).reduce((a,b)=>a+b,0);
    return { nome: eu?(CL.mgr||'Você'):coachName(id,i), club:clubOf(id)||{id,short:id}, total, counts, eu };
  }).sort((a,b)=> b.total-a.total || a.nome.localeCompare(b.nome));
  const list=rows.map((r,i)=>`<div class="cl-sala-res-row ${r.eu?'me':''}">
    <span class="cl-sala-res-pos">${i+1}</span>
    <span class="cl-sala-res-nome">${escC(r.nome)}</span>
    <span class="cl-sala-stripe cl-sala-res-clube" style="${clubStripe(r.club)}">${escC(r.club.short)}</span>
    <span class="cl-sala-res-minis">${minis(r.counts)}</span>
    <span class="cl-sala-res-total">${r.total}</span><span class="cl-sala-res-lbl">${r.total===1?'taça':'taças'}</span>
  </div>`).join('');
  return `<div class="cl-sala-res">
    <div class="cl-sala-res-hdr"><span>SALA DOS TREINADORES</span><span class="cl-sala-pan-reg">${rows.length} treinadores</span></div>
    <div class="cl-sala-res-list">${list}</div>
    <div class="cl-sala-res-foot">A sua linha fica sempre marcada em azul. Dos rivais o jogo guarda a contagem de taças, não a campanha.</div>
  </div>`;
}
function clCoachRanking(){ CL.menu=null;
  migrateCoachCareerStats();   // save antigo (acumulado ainda em CL): adota antes de desenhar
  // pontuacao com o peso real das conquistas — ver coachRankingScore no core
  const rows=DATA.clubs.map((c,i)=>{
    const t=S.table[c.id]||{Pts:0};
    const sc=(typeof coachRankingScore==='function')?coachRankingScore(c.id, t.Pts||0)
      :{titles:0, total:(t.Pts||0)};
    return {name:coachName(c.id,i),club:clubOf(c.id).short,pts:sc.total,titles:sc.titles,human:!!(CL.humans&&CL.humans[c.id])};
  }).sort((a,b)=>b.pts-a.pts);
  const list=rows.map((r,i)=>`<div class="cl-rank-row ${r.human?'me':''}"><span class="cl-rank-p">${i+1}</span><span class="cl-rank-c">${escC(r.name)}</span><span class="cl-rank-t">${escC(r.club)}</span><span class="cl-rank-n">${r.titles?('🏆 '+r.titles):'—'}</span><span class="cl-rank-n b">${r.pts} pts</span></div>`).join('');
  overlayC(dlg('Ranking de Treinadores', `<div class="cl-rank-head" style="font-size:12px;color:#666;padding:2px 10px 6px">Pontos de jogo somados (todas as temporadas) + títulos com o peso real de cada competição.</div><div class="cl-rank">${list}</div>
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{ad:'modal-ranking-728x90',w:780,bodyClass:'cl-body-gray',min:true})); }

/* ---- Treinador > Ofertas ---- */
function clJobOffers(){ CL.menu=null;
  const offers=S.pendingJobOffers||[];
  if(!offers.length){
    overlayC(dlg('Ofertas', `<div class="cl-offers-empty">
      <div style="padding:20px;text-align:center">Nenhuma oferta no momento.</div>
    </div>
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:600,bodyClass:'cl-body-gray',min:true}));
    return;
  }
  // A CAIXA DE OFERTAS TAMBÉM RECEBE CONVITE DE FORA DO PAÍS. Ela lia o clube com clubOf(), que
  // só conhece o universo do jogador — e sondagem do exterior (a única que existe pra quem está
  // na Série A, ver maybeForeignJobOffer) vem de uma liga de FUNDO, que mora em S.bgLeagues.
  // Resultado: clubOf devolvia undefined, o `.short` explodia e a tela inteira não abria — a
  // oferta existia em S.pendingJobOffers e não havia como vê-la. Agora resolve pelo mesmo
  // caminho do convite (jobOfferClub, que já olhava as duas fontes), e cada dado que só existe
  // pro clube local (elenco, posição na tabela, caixa) aparece como "—" quando não se aplica.
  const rows=offers.map((o,i)=>{
    const c=jobOfferClub(o);
    const sq = (typeof squad==='function') ? squad(o.clubId) : null;
    const avgMoral = (sq && sq.length) ? sq.reduce((s,p)=>s+(p.moral||70),0)/sq.length : null;
    const pos = (typeof sortedTable==='function') ? sortedTable().findIndex(t=>t.id===o.clubId)+1 : 0;
    const posTxt = pos>0 ? pos+'º lugar' : (o.foreign?escC(o.country||'exterior'):'—');
    return `<div class="cl-offer-item">
      <div class="cl-offer-header" style="${clubStripe(c)};padding:8px;border-radius:4px;color:white;margin-bottom:6px">
        <span style="font-weight:bold">${escC(c.short||c.name||'?')}</span> — <span>${escC(jobOfferDivLabel(o))}</span>
      </div>
      <div class="cl-offer-details">
        <div><span>Posição:</span><b>${posTxt}</b></div>
        <div><span>Salário:</span><b>${fmt(o.salary||0)}/sem</b></div>
        <div><span>Moral média do time:</span><b>${avgMoral!=null?Math.round(avgMoral)+'%':'—'}</b></div>
        <div><span>Caixa do clube:</span><b>${c.cash!=null?fmt(c.cash):'—'}</b></div>
      </div>
      <div class="cl-offer-actions">
        ${btn('Aceitar','clAcceptPendingOffer('+i+')',{icon:'✔',cls:'cl-btn-ok'})}
        ${(sq&&sq.length)?btn('Ver elenco','clViewOfferSquad('+i+')',{icon:'👥',cls:'cl-btn-info'}):''}
        ${btn('Recusar','clDeclinePendingOffer('+i+')',{icon:'✖',cls:'cl-btn-cancel'})}
      </div>
    </div>`; }).join('');
  overlayC(dlg('Ofertas de Contratação', `<div class="cl-offers-list">${rows}</div>
    <div class="cl-offer-footer" style="padding:12px;background:#f5f5f5;border-top:1px solid #ddd;color:#666;font-size:13px">
      Você tem até 5 rodadas para responder cada oferta.
    </div>
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:700,bodyClass:'cl-body-gray'}));
}
/* Aceitar pela caixa de ofertas entra no MESMO fluxo de 3 etapas do convite que chega sozinho
   (jantar -> proposta -> boas-vindas, ver showJobInvite). Antes este caminho trocava de clube na
   hora, então a mesma decisão tinha duas experiências diferentes dependendo de por onde o
   jogador chegasse — e por aqui ele nem via os termos antes de confirmar. */
function clAcceptPendingOffer(idx){
  const o=S.pendingJobOffers[idx]; if(!o) return;
  clCloseOverlay();
  /* NA SALA, TODA OFERTA E DA SALA. `showJobInvite` sem esta marca leva o "aceitar" pelo caminho
     do SOLO (applyManagerJobChange local), e ai o cliente fica com um clube que a sala nao
     reconhece — de fora, "assumir o clube nao funcionou". Quem chega pela caixa de ofertas
     entrava exatamente por aqui. */
  if(CL.online) o._resenha=true;
  showJobInvite(o);
}
function clDeclinePendingOffer(idx){
  S.pendingJobOffers.splice(idx,1);
  clJobOffers(); // reabrir modal
}
function clViewOfferSquad(idx){
  const o=S.pendingJobOffers[idx]; if(!o) return;
  const sq = squad(o.clubId) || [];
  const rows=sq.map(p=>`<div class="cl-prow ${p.pid===CL.selPlayer?'sel':''}" style="padding:4px 8px;border-bottom:1px solid #eee">
    <span style="font-weight:bold">${escC(p.n)}</span> <span style="color:#666">${p.pos}</span> <span style="float:right">${p.ov||55}</span>
  </div>`).join('');
  overlayC(dlg('Elenco '+escC(clubOf(o.clubId).short), `<div style="max-height:400px;overflow-y:auto">${rows}</div>
    <div class="cl-cal-ok">${btn('Voltar','clJobOffers()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{w:500,bodyClass:'cl-body-gray',min:true}));
}

/* ---- Modo Resenha > Chamar pra Resenha ---- */
function clInviteResenha(){ CL.menu=null; if(!CL.online){ toastC('Modo Resenha requer jogo online.'); return; }
  const link=(typeof NET!=='undefined')?NET.inviteLink():'';
  // rf98.resenha.invite (1200×630): o cartão que acompanha o convite partilhado. Aqui ele
  // aparece como pré-visualização do que o amigo vai receber — vazio, o modal fica igual.
  const cartao = rfAdEspaco('rf98.resenha.invite', {cls:'rf-ad-card', formato:'1200×630'});
  overlayC(dlg('Chamar pra Resenha', `<div class="cl-invres">
    <div class="cl-invres-msg">Convide amigos para assumir times de CPU nesta partida. Eles entrarão agora mesmo na sua sala de jogo.</div>
    ${cartao}
    <div class="cl-invres-opt" style="margin-bottom:16px">
      <div class="cl-invres-lbl">🔗 Link da sala</div>
      <div class="cl-invres-linkrow">
        <input class="cl-input cl-invres-link" id="cl-invres-link" readonly value="${escC(link)}" onclick="this.select()">
        ${btn('Copiar link','clCopyResenhaLink()',{icon:'📋',cls:'cl-btn-ok'})}
      </div>
    </div>
    <div class="cl-invres-item">
      <div class="cl-invres-club">🎲 Um time livre é <b>sorteado</b> para o convidado ao entrar.</div>
    </div>
    <div class="cl-invite2col">
      <div class="cl-invres-opt">
        <div class="cl-invres-lbl">📱 Por WhatsApp</div>
        <div class="cl-invres-phone"><span class="cl-ddi">+55</span><input class="cl-input" inputmode="numeric" placeholder="DDD + número" id="cl-invres-phone" maxlength="11"></div>
        ${btn('Enviar por WhatsApp','clSendResenhaInvite()',{icon:'✔',cls:'cl-btn-ok'})}
      </div>
      <div class="cl-invres-opt">
        <div class="cl-invres-lbl">✉️ Por e-mail</div>
        <input class="cl-input" type="email" placeholder="email@exemplo.com" id="cl-invres-email">
        ${btn('Enviar por e-mail','clSendResenhaEmailInvite()',{icon:'✔',cls:'cl-btn-ok'})}
      </div>
    </div>
  </div>
  <div class="cl-cal-ok">${btn('Fechar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}</div>`,
  {w:700,bodyClass:'cl-body-green'})); }
/* copia o link da sala com 1 clique — clipboard API com fallback pra execCommand
   (alguns webviews/navegadores mais antigos não expõem navigator.clipboard) */
function clCopyResenhaLink(){
  const inp=document.querySelector('#cl-invres-link'); const link=inp?inp.value:'';
  if(!link){ toastC('⚠ Link indisponível.'); return; }
  const done=()=>toastC('✓ Link copiado!');
  const fallback=()=>{ try{ inp.select(); inp.setSelectionRange(0,99999); document.execCommand('copy'); done(); }
    catch(e){ toastC('⚠ Não foi possível copiar — selecione o link e copie manualmente.'); } };
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(link).then(done).catch(fallback); }
  else fallback();
}
function clSendResenhaInvite(){ const phone=(document.querySelector('#cl-invres-phone')?.value||'').replace(/\D/g,'');
  if(phone.length<10){ toastC('Informe um telefone válido.'); return; }
  const link=(typeof NET!=='undefined')?NET.inviteLink():''; const wa='https://wa.me/55'+phone+'?text='+encodeURIComponent('Vem pra minha Resenha do RetroFoot98! Um time é sorteado pra você. '+link);
  try{ window.open(wa,'_blank'); }catch(e){} toastC('Abrindo WhatsApp','progress'); }
function clSendResenhaEmailInvite(){ const email=(document.querySelector('#cl-invres-email')?.value||'').trim();
  if(!email || !email.includes('@')){ toastC('Informe um e-mail válido.'); return; }
  if(typeof NET==='undefined' || !NET.sendEmailInvite){ toastC('Convite por e-mail requer jogo online.'); return; }
  toastC('Enviando convite por e-mail','progress');
  (async ()=>{ try { await NET.sendEmailInvite(email); toastC('✓ Convite enviado por e-mail!'); const inp=document.querySelector('#cl-invres-email'); if(inp) inp.value=''; }
    catch(e){ toastC('⚠ '+(e&&e.message||'Erro ao enviar convite por e-mail')); } })(); }
function clTab2(t){ CL.menu=null; CL.tab=t; cdraw(); }
/* "Gravar jogo" (menu RetroFoot98).
   NA RESENHA ELE NÃO FAZIA NADA. saveV3() retorna na PRIMEIRA linha quando CL.online (o mundo é
   do servidor, não do save solo), então o menu fechava, a tela redesenhava e o jogador não via
   nem toast nem overlay: pra ele o botão de salvar simplesmente não existia.
   O mundo compartilhado de fato já está gravado no servidor — mas o que é MEU vive no assento
   (carreira, escalação, tática, caixa de entrada) e só sobe em momentos específicos. Aqui a opção
   força essas gravações e responde ao jogador, que é o que ele foi buscar no menu. */
function clSaveMenu(){ CL.menu=null; cdraw();
  if(!CL.online){ saveV3(true); return; }
  if(typeof persistCareer==='function') persistCareer();          // títulos, troféus, Historial
  if(typeof republicarEscalacao==='function') republicarEscalacao(); // escalação e tática do assento
  if(typeof saveInbox==='function') saveInbox();                   // caixa de entrada
  toastC('✓ Resenha gravada — o mundo da sala fica no servidor e o seu progresso, no seu assento.');
}
/* "Sair para o menu" não pode simplesmente descartar a partida em andamento — progresso
   não gravado (rodadas jogadas desde o último save) se perderia sem aviso. Pergunta
   primeiro; em modo online a sala já fica sincronizada a cada rodada (NET.saveGame), então
   não faz sentido oferecer "gravar" ali, só confirmar a saída mesmo. */
function clExit(){
  CL.menu=null; CL._exitSaving=false;
  overlayC(exitModalHTML(!!CL.online));
}
/* modal "Sair para o menu" (handoff_sair_para_o_menu): anatomia padrão dos modais de menu —
   640px, ✕ real na barra de título (o 🗕 decorativo saiu), pergunta no conteúdo e as três
   saídas numa LINHA SÓ no rodapé, destrutiva → recomendada → Cancelar. Fecha no backdrop
   (overlayC.onclick), no ✕, no Esc ou no Cancelar — todos equivalem a cancelar, sem gravar.
   Online: a sala já sincroniza a cada rodada, então ali não se oferece gravar, só confirmar. */
function exitModalHTML(online){
  const saving=!!CL._exitSaving;
  const text = online
    ? 'Sair da partida agora? A sala continua ativa pros outros treinadores — você pode voltar depois.'
    : 'Quer gravar o jogo antes de sair? O progresso não gravado será perdido.';
  const footer = online
    ? `${btn('Sair','clExitConfirm(false)',{icon:'✔',cls:'cl-btn-ok'})}${btn('Cancelar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}`
    : `${btn('Sair sem gravar','clExitConfirm(false)',{icon:'✖',cls:'cl-btn-cancel',dis:saving})}
       ${btn(saving?'Gravando':'Gravar e sair','clExitConfirm(true)',{icon:'✔',cls:'cl-btn-ok',dis:saving})}
       ${btn('Cancelar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel',dis:saving})}`;
  return dlg('Sair para o menu', `<div class="cl-exit-txt">${escC(text)}</div>`,
    {std:true, footer, footerClass:'cl-exit-foot'});
}
async function clExitConfirm(shouldSave){
  if(CL._exitSaving) return;                       // clique duplo em "Gravar e sair"
  if(typeof clStopHostReqPoll==='function') clStopHostReqPoll(); // encerra o acompanhamento de pedidos
  // hotseat: saindo no meio da vez de um assento (não do manager 1) — devolve o contexto pro
  // clube/estado do manager 1 ANTES de gravar/sair, senão saveV3() grava com o clube errado
  // como primário (ela mesma se recusa a gravar com CL._seatContext ainda setado) e a fila de
  // assentos pendente (CL._hotseat) fica pendurada, quebrando a próxima partida que carregar.
  if(CL._seatContext){ exitSeatContext(); CL._hotseat=null; }
  if(shouldSave){
    // o modal FICA na tela enquanto grava, com o botão em "Gravando…" — antes ele sumia no
    // primeiro clique e a gravação corria atrás de uma tela sem nenhum sinal do que acontecia
    CL._exitSaving=true; overlayC(exitModalHTML(!!CL.online));
    try{ await saveV3(true); }                    // já mostra a barra de gravação e um toast
    finally{ CL._exitSaving=false; }
  }
  clCloseOverlay();
  CL.screen='abertura'; cdraw();
}
/* zona de classificação continental pra próxima temporada (só existe na Série A —
   ver computeQualification: G6 -> Libertadores, 7º-12º -> Sul-Americana) */
function qualificationZone(division,pos){
  if(division!=='A') return null;
  if(pos<=6) return 'lib';
  if(pos<=12) return 'sul';
  return null;
}
function qualificationZoneBadge(zone){
  if(zone==='lib') return `<span class="cl-cls-zone zone-lib">${trophyImg('libertadores',14)||'🏆'} Libertadores</span>`;
  if(zone==='sul') return `<span class="cl-cls-zone zone-sul">${trophyImg('sulamericana',14)||'🥈'} Sul-Americana</span>`;
  return '';
}
function clClassif(){ CL.menu=null;
  // a coluna de ZONA (Libertadores/Sul-Americana) só existe na Série A; nas séries B/C/D ela
  // ficava reservada (120px vazios à direita), desalinhando a tabela. Agora é condicional.
  const hasQual = S.division==='A';
  const qcls = hasQual ? '' : ' noqual';
  const rows=sortedTable().map((t,i)=>{const me=t.id===CL.clubId; const zone=hasQual?qualificationZone(S.division,i+1):null;
    return `<div class="cl-cls-row${qcls} ${me?'me':''} ${zone?'zone-'+zone:''}"><span class="cl-cls-p">${i+1}</span><span class="cl-cls-n">${clubLink(t.id)}</span>
      <span class="cl-cls-num b">${t.Pts}</span><span class="cl-cls-num">${t.W}</span><span class="cl-cls-num">${t.D}</span><span class="cl-cls-num">${t.L}</span>
      <span class="cl-cls-num">${t.GF}</span><span class="cl-cls-num">${t.GA}</span>${hasQual?qualificationZoneBadge(zone):''}</div>`;}).join('');
  // cabeçalho DENTRO do mesmo container de rolagem (.cl-cls) das linhas: assim os dois compartilham
  // a MESMA largura (e a mesma redução quando aparece a barra de rolagem), então as colunas 1fr
  // batem exatamente. Antes o head ficava fora, tomava a largura do diálogo e desalinhava/vazava.
  overlayC(dlg('Classificação — '+escC(divisionLabel()), `<div class="cl-cls"><div class="cl-cls-head${qcls}"><span class="cl-cls-p">#</span><span class="cl-cls-n">Equipa</span>
    <span class="cl-cls-num">P</span><span class="cl-cls-num">V</span><span class="cl-cls-num">E</span><span class="cl-cls-num">D</span><span class="cl-cls-num">GP</span><span class="cl-cls-num">GC</span>${hasQual?'<span></span>':''}</div>${rows}</div><div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,
    {w:680,bodyClass:'cl-body-gray',min:true})); }


/* ---- Campeonatos > Minhas competições (lista + estado de classificação) ---- */
function clCompList(){ CL.menu=null;
  const cid=CL.clubId;
  const inSerieA = S.division==='A';
  // competições do universo ativo (Brasil: Copa do Brasil/Libertadores/Sul-Americana;
  // internacional: Champions League/Europa League)
  const cups=allCupKeys().map(k=>({key:k, def:COMP_DEFS[k], c:S.cups&&S.cups[k]}));
  const trophyFor={copaBrasil:'copaBrasil', libertadores:'libertadores', sulamericana:'sulamericana', championsLeague:'championsLeague', europaLeague:'europaLeague'};
  const rows=[`<div class="cl-complist-row" onclick="clClassif()">
      <span class="cl-complist-ic">${divisionTrophyImg(S.division,24)||'🏆'}</span><span class="cl-complist-n">${escC(divisionLabel())}</span>
      <span class="cl-complist-st ok">Disputando — ${tablePos(cid)}º lugar</span></div>`];
  cups.forEach(x=>{
    const disabled = S.compToggle && S.compToggle[x.key]===false;
    // no Brasil, Libertadores/Sul-Americana são exclusivas da Série A; no universo intl não há
    // essa restrição (a vaga na Champions/Europa vem de estar classificado, não da divisão).
    const restrictToSerieA = !isIntlUniverse() && x.key!=='copaBrasil';
    const qualified = (!restrictToSerieA || inSerieA) && S.qualification && S.qualification[x.key] && S.qualification[x.key].includes(cid);
    const c=x.c;
    let statusTxt, statusCls, clickable=false;
    // não classificado/eliminado/fora da Série A não bloqueia mais o acesso — só não
    // dá pra ver uma competição desligada neste save ou que ainda nem foi sorteada
    // (não existe nada pra mostrar). Fora isso, qualquer um pode acompanhar tabela e
    // chaveamento, mesmo sem disputar.
    if(disabled){ statusTxt='Desligada neste save'; statusCls='off'; }
    // Libertadores/Sul-Americana são exclusivas da Série A: fora dela, elas nem existem nesta
    // temporada (na Resenha todos começam na Série D). Sem este ramo ANTES do "!c", apareciam como
    // "Aguardando sorteio" — como se um sorteio fosse rolar, o que nunca acontece nesta divisão.
    else if(restrictToSerieA && !inSerieA){ statusTxt='Só na Série A (suba de divisão)'; statusCls='out'; clickable=!!c; }
    else if(!c){ statusTxt='Aguardando sorteio'; statusCls='off'; }
    else if(cupCompetitionChampion(c)===cid){ statusTxt='🏆 CAMPEÃO'; statusCls='ok'; clickable=true; }
    else if(!qualified){ statusTxt='Não classificado · acompanhar'; statusCls='out'; clickable=true; }
    else if(!cupCompetitionTeamAlive(c,cid)){ statusTxt='Eliminado · acompanhar'; statusCls='out'; clickable=true; }
    // classificado, mas o mata-mata ainda não foi sorteado (data real do sorteio, ver
    // cupAwaitingKnockoutDraw) — dizer a fase aqui seria mentira, e "Eliminado" era pior ainda.
    else if(typeof cupAwaitingKnockoutDraw==='function' && cupAwaitingKnockoutDraw(c,cid)){
      statusTxt='Classificado · aguardando sorteio'; statusCls='ok'; clickable=true; }
    else { statusTxt=cupCompetitionRoundLabel(c,x.key); statusCls='ok'; clickable=true; }
    const icon=trophyImg(trophyFor[x.key],24) || (x.key==='copaBrasil'?flagImg('Brasil'):'🌎');
    rows.push(`<div class="cl-complist-row ${clickable?'':'disabled'}" ${clickable?`onclick="clCupView('${x.key}')"`:''}>
      <span class="cl-complist-ic">${icon}</span>
      <span class="cl-complist-n">${escC(x.def.name)}</span>
      <span class="cl-complist-st ${statusCls}">${statusTxt}</span></div>`);
  });
  overlayC(dlg('Minhas competições', `<div class="cl-complist">${rows.join('')}</div>
    <div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,
    {ad:'modal-competicoes-728x90',w:620,bodyClass:'cl-body-gray',min:true}));
}
/* ================= TELA DA COPA — grupos + mata-mata, NA MESMA TELA (sem modal) =================
   Redesenho do handoff `design_handoff_copa` (protótipo Copa.dc.html): a competição deixa de ser
   um diálogo sobreposto e vira uma TELA de verdade (CL.screen 'cupview' / 'cupclassif'), com
   cabeçalho da competição, abas coladas ao painel (⚽ Fase de Grupos | 🏆 Mata-mata) e o conteúdo
   ocupando a altura restante SEM rolagem vertical.

   Por que tela e não modal: depois de uma partida de copa o usuário já está numa tela de jogo —
   abrir um diálogo por cima quebrava o contexto e obrigava a fechar tudo pra ver a chave. Agora a
   mesma tela mostra o resultado da partida no topo e a chave/grupos embaixo (ver showCupClassif).

   Genérico por construção: nada aqui conhece "Brasil". Fase de grupos sai de c.group.groups (1 a 8
   grupos, qualquer tamanho) e o mata-mata de c.bracket/c — então Copa do Brasil (só mata-mata),
   Libertadores/Sul-Americana e as copas de outros países (Champions/Europa e as que vierem)
   usam exatamente o mesmo componente; quem não tem fase de grupos simplesmente não ganha a aba. */

/* palco de proporção fixa do chaveamento (o protótipo usa 1080×520): tudo é posicionado em
   coordenadas absolutas aqui dentro e o palco inteiro é escalado por transform:scale() pra caber
   no painel (ver cupFitStage) — é assim que a chave cabe na viewport sem rolagem. */
/* A ALTURA DO PALCO SEGUE O PAINEL. A largura é fixa (todas as colunas da chave são posicionadas
   nela), mas a altura era fixa TAMBÉM — e como o painel muda de proporção com a janela, a chave
   nunca casava com ele: escalada por transform:scale() uniforme, ela batia numa dimensão e
   sobrava na outra. Numa tela larga sobrava faixa cinza em cima e embaixo; numa baixa, sobrava
   dos lados. Era esse o "muito espaço vazio ao redor da tabela".
   Agora a altura do palco é calculada a partir da proporção real do painel (medida em
   cupFitStage e guardada em CL._cupHostBox), então a escala cabe nas DUAS dimensões ao mesmo
   tempo e a chave ocupa a janela inteira. As caixas não esticam: elas se ESPALHAM — o eixo
   vertical e a distância entre as chaves crescem junto com a altura. */
const CUP_STAGE_W=1080, CUP_STAGE_H_PADRAO=520;
const CUP_STAGE_H_MIN=430, CUP_STAGE_H_MAX=820;
function cupStageH(){
  const box=(typeof CL!=='undefined') ? CL._cupHostBox : null;
  if(!box || !box.w || !box.h) return CUP_STAGE_H_PADRAO;
  const ideal=Math.round(CUP_STAGE_W*(box.h/box.w));
  return Math.max(CUP_STAGE_H_MIN, Math.min(CUP_STAGE_H_MAX, ideal));
}
/* eixo vertical da chave e distância entre as caixas da coluna mais externa — proporcionais à
   altura do palco (no desenho original: 267/520 e (364/3)/520). */
function cupMidY(){ return cupStageH()/2; }
function cupLeafGap(){ return cupStageH()*0.70/3; }
const CUP_BOX_W=132, CUP_BOX_H=48, CUP_FINAL_W=128, CUP_FINAL_H=54;
const CUP_COL_X=[4,168,332];                      // oitavas · quartas · semi (lado ESQUERDO; o direito é o espelho)
const CUP_FINAL_X=(CUP_STAGE_W-CUP_FINAL_W)/2;    // 476 — a final no eixo central

/* confrontos de uma rodada: já jogada (history) ou a pendente (b.ties). null = rodada futura,
   ainda nem sorteada — vira caixa "a definir" na chave. */
function cupTiesOfRound(b, round){
  const h=(b.history||[]).find(x=>x.round===round);
  if(h) return h.ties||[];
  if(!b.champion && b.round===round) return b.ties||[];
  return null;
}
/* de qual confronto da rodada anterior este time veio. O pareamento do motor é RE-SORTEADO a cada
   fase (advanceCupBracket ordena por overall e emparelha de novo), então não existe árvore guardada
   no estado: ela é reconstruída aqui, de trás pra frente, seguindo quem venceu. null = veio de bye. */
function cupSourceTie(b, round, teamId){
  if(teamId==null) return null;
  const prev=cupTiesOfRound(b, round-1);
  return prev ? (prev.find(t=>t.winner===teamId)||null) : null;
}
function cupNodeDown(b, round, tie, depth){
  const node={round, tie:tie||null, kids:null};
  if(depth<=0) return node;
  node.kids=[ cupNodeDown(b, round-1, tie?cupSourceTie(b,round,tie.h):null, depth-1),
              cupNodeDown(b, round-1, tie?cupSourceTie(b,round,tie.a):null, depth-1) ];
  return node;
}
/* árvore espelhada das ÚLTIMAS fases (oitavas → quartas → semi → final), que é o recorte que o
   design mostra. Ancora na rodada mais avançada que já tem confrontos conhecidos: dali pra baixo
   segue os vencedores (árvore real), e dali pra cima empilha caixas "a definir" até a final —
   assim o usuário sempre enxerga o quanto falta pro título, mesmo antes do sorteio da fase. */
function cupBuildTree(b){
  const R0=Math.max(1, b.roundsTotal-3);
  let anchor=null;
  for(let r=b.roundsTotal;r>=R0;r--){ const t=cupTiesOfRound(b,r); if(t&&t.length){ anchor=r; break; } }
  if(anchor==null) return null;
  const depth=b.roundsTotal-R0;
  let level=cupTiesOfRound(b,anchor).map(t=>cupNodeDown(b,anchor,t,anchor-R0));
  for(let r=anchor+1;r<=b.roundsTotal;r++){
    const up=[];
    for(let i=0;i<level.length;i+=2) up.push({round:r, tie:null, kids:[level[i], level[i+1]||null]});
    level=up;
  }
  return level.length===1 ? {root:level[0], depth} : null;
}
/* nós por nível de UM lado da chave (nível 1 = semi, 2 = quartas, 3 = oitavas), na ordem
   de cima pra baixo — a árvore é perfeita, então basta descer em largura. */
function cupSideLevels(root, depth){
  const out=[]; let cur=root?[root]:[];
  for(let L=1;L<=depth;L++){ out.push(cur); cur=cur.flatMap(n=>(n&&n.kids)?n.kids:[null,null]); }
  if(depth>=1) out.push(cur); // última descida = coluna mais externa
  return out.slice(0, depth); // out[0] = nível 1 ... out[depth-1] = nível depth
}
/* geometria: centro vertical do nó `i` do nível L (1 = mais interno) num lado com `depth` níveis */
function cupLevelGap(L, depth){ return cupLeafGap()*Math.pow(2, depth-L); }
function cupNodeY(L, i, depth){ const n=Math.pow(2,L-1); return cupMidY() + (i-(n-1)/2)*cupLevelGap(L,depth); }
function cupNodeX(L, depth, side){ const x=CUP_COL_X[3-L]!=null?CUP_COL_X[3-L]:CUP_COL_X[0];
  return side==='L' ? x : (CUP_STAGE_W - x - CUP_BOX_W); }

/* ---- peças do palco ---- */
function cupSeg(x,y,w,h,gold,team){
  return `<div class="cl-cupc${gold?' gold':''}" ${team!=null?`data-cupt="${escC(team)}"`:''} style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>`;
}
/* conectores de um pai pros seus dois filhos do MESMO lado: stub horizontal de cada filho até um
   barramento vertical, o barramento ligando os dois, e o stub do barramento até o pai. */
function cupConnectorsHTML(px, py, kids, side, goldTeam){
  const k0=kids[0], k1=kids[1]; if(!k0||!k1) return '';
  const out=[];
  const kx=k0.x, kRight=kx+CUP_BOX_W;
  const bus = side==='L' ? (kRight+px)/2 : (px+CUP_BOX_W+kx)/2;
  [k0,k1].forEach(k=>{
    const team=k.tie&&k.tie.winner!=null?k.tie.winner:null;
    const gold=team!=null&&team===goldTeam, th=gold?3:2;
    const x0 = side==='L' ? kRight : bus, x1 = side==='L' ? bus : kx;
    out.push(cupSeg(x0, k.y-th/2, Math.max(1,x1-x0), th, gold, team));
  });
  // barramento vertical: sempre cinza inteiro; o trecho dourado é só o pedaço que o time
  // destacado percorre de fato (do confronto dele até a altura do confronto seguinte) —
  // pintar a barra toda de dourado faria parecer que os dois lados avançaram.
  out.push(cupSeg(bus-1, Math.min(k0.y,k1.y), 2, Math.abs(k1.y-k0.y), false, null));
  const gk = (k0.tie&&k0.tie.winner!=null&&k0.tie.winner===goldTeam) ? k0
           : (k1.tie&&k1.tie.winner!=null&&k1.tie.winner===goldTeam) ? k1 : null;
  if(gk) out.push(cupSeg(bus-1.5, Math.min(gk.y,py), 3, Math.max(1,Math.abs(py-gk.y)), true, goldTeam));
  const goldV=!!gk, tv=goldV?3:2;
  const px0 = side==='L' ? bus : px+CUP_BOX_W, px1 = side==='L' ? px : bus;
  out.push(cupSeg(px0, py-tv/2, Math.max(1,px1-px0), tv, goldV, goldV?goldTeam:null));
  return out.join('');
}
/* caixa de confronto: 2 linhas (cor do clube · nome com ellipsis · gols em mono).
   Vencedor em negrito escuro, perdedor cinza claro; caixa dourada quando está no caminho do
   time destacado. Clicar abre o detalhe NA PRÓPRIA TELA (faixa embaixo), nunca um modal. */
function cupTieBoxHTML(node, x, y, w, h, key, goldTeam, opts){
  opts=opts||{};
  const t=node.tie;
  const dr=opts.draw;
  const ghost=(cls)=>`<div class="cl-cupbox ghost${cls||''}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">
      <div class="cl-cupbox-row"><span class="cl-cupbox-n">a definir</span></div>
      <div class="cl-cupbox-row"><span class="cl-cupbox-n">a definir</span></div></div>`;
  const sel = CL._cupTie && CL._cupTie.round===node.round && t && CL._cupTie.h===t.h && CL._cupTie.a===t.a;
  if(!t) return ghost();
  // durante o sorteio o confronto só aparece depois de ser sorteado — é o preenchimento
  // bola-a-bola acontecendo na PRÓPRIA chave, em vez de numa lista à parte.
  if(dr && !cupDrawHasTie(dr,t)) return ghost(' waiting');
  const fresh = dr && cupDrawLast(dr) && cupDrawLast(dr).h===t.h && cupDrawLast(dr).a===t.a;
  const onGold = goldTeam!=null && (t.h===goldTeam||t.a===goldTeam) && (t.winner==null||t.winner===goldTeam);
  const mine = cupIsHumanClub(t.h)||cupIsHumanClub(t.a);
  const row=(id,gols,isWin)=>{
    const cl=clubOf(id); const {col}=clubColors(cl);
    const decided=t.winner!=null;
    const pen = t.pens && Number.isFinite(t.pens.h) && Number.isFinite(t.pens.a) ? (id===t.h?t.pens.h:t.pens.a) : null;
    // o motor guarda o placar do TEMPO NORMAL no confronto (ver advanceCupBracket): empate com
    // vencedor e sem pênaltis = decidido na prorrogação. Sem esta marca a caixa mostraria
    // "0 × 0" com um vencedor em negrito e nenhuma explicação.
    const aet = decided && isWin && t.hg===t.ag && pen==null ? '<i class="cl-cupbox-pen">ap</i>' : '';
    return `<div class="cl-cupbox-row ${decided?(isWin?'win':'lose'):''}" data-cupt="${escC(id)}"
        onmouseover="cupHover('${escC(id)}')" onmouseout="cupHover(null)">
      <span class="cl-cupbox-c" style="background:${col}"></span>
      <span class="cl-cupbox-n">${escC(cl?cl.short:id)}</span>
      ${dr?'':`<span class="cl-cupbox-g">${gols==null?'–':gols}${pen!=null?`<i class="cl-cupbox-pen">${pen}</i>`:aet}</span>`}</div>`;
  };
  // no sorteio a caixa não é clicável (não há partida pra detalhar ainda)
  const act = dr ? '' : `role="button" tabindex="0"
      onclick="cupPickTie('${escC(key)}',${node.round},'${escC(t.h)}','${escC(t.a)}')"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();cupPickTie('${escC(key)}',${node.round},'${escC(t.h)}','${escC(t.a)}')}"`;
  return `<div class="cl-cupbox${onGold?' gold':''}${mine?' me':''}${sel?' sel':''}${fresh?' fresh':''}" ${act}
      style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">
    ${row(t.h,t.hg,t.winner===t.h)}${row(t.a,t.ag,t.winner===t.a)}</div>`;
}
/* faixa de detalhe do confronto selecionado (mesma tela, sem modal): fase, placar, pênaltis e gols */
function cupTieDetailHTML(b, key){
  const s=CL._cupTie; if(!s || s.key!==key) return '';
  const ties=cupTiesOfRound(b, s.round)||[];
  const t=ties.find(x=>x.h===s.h&&x.a===s.a); if(!t) return '';
  const hn=clubOf(t.h), an=clubOf(t.a);
  const sc = t.winner==null ? 'a jogar' : `${t.hg}×${t.ag}`;
  const pens = t.pens && Number.isFinite(t.pens.h) && Number.isFinite(t.pens.a) ? ` · pênaltis ${t.pens.h}×${t.pens.a}`
    : (t.winner!=null && t.hg===t.ag ? ' · decidido na prorrogação' : '');
  const gols=(t.events||[]).filter(e=>e.type==='gol').map(e=>`${escC(e.scorer||e.player||'')} ${e.min}'`).join(' · ');
  return `<div class="cl-cupdetail">
    <b>${escC(cupPhaseLabel(s.round,b.roundsTotal))}</b>
    <span>${escC(hn?hn.short:t.h)} <b>${escC(sc)}</b> ${escC(an?an.short:t.a)}${escC(pens)}</span>
    <span class="cl-cupdetail-g">${gols?'⚽ '+gols:'sem gols registrados'}</span>
    <button class="cl-cupdetail-x" onclick="cupPickTie(null)" aria-label="Fechar detalhe">✕</button></div>`;
}
/* ---- chaveamento: chave espelhada com conectores e o troféu no centro ---- */
function cupBracketStageHTML(c, key, opts){
  opts=opts||{};
  const b = c.champion!==undefined ? c : c.bracket;
  if(!b){
    if(c.group && c.group.finished){
      const drawDate=key && S.season===2026 ? COMP_R16_DRAW_2026[key] : null;
      return cupEmptyStageHTML(`Fase de grupos encerrada — aguardando o sorteio das oitavas de final${drawDate?` (${fmtRealDate(drawDate)})`:''}.`);
    }
    return cupEmptyStageHTML('A fase eliminatória ainda não começou — aguardando o fim da fase de grupos.');
  }
  const tree=cupBuildTree(b);
  // fases iniciais de chaveamentos grandes (Copa do Brasil parte de ~80 clubes) têm dezenas de
  // confrontos: não cabem numa chave espelhada legível, então essa etapa vira uma grade de
  // confrontos no MESMO palco, com o mesmo visual — a chave espelhada entra a partir das oitavas.
  const deepest = b.champion ? b.roundsTotal : b.round;
  if(!tree || deepest < b.roundsTotal-3) return cupEarlyStageHTML(b, key, opts);
  // time cujo caminho vai em dourado: o campeão, quando já existe; senão o clube do usuário
  // (é o que ele quer seguir na chave). Sem nenhum dos dois, ninguém fica dourado.
  const goldTeam = b.champion || (cupTeamAlive(b,CL.clubId) ? CL.clubId : null);
  const depth=tree.depth, root=tree.root;
  const sides={L:root.kids?root.kids[0]:null, R:root.kids?root.kids[1]:null};
  const boxes=[], conns=[], labels=[];
  const phaseName=(L)=>cupPhaseLabel(b.roundsTotal-L, b.roundsTotal).replace(' de final','').toUpperCase();
  ['L','R'].forEach(side=>{
    const levels=cupSideLevels(sides[side], depth);
    // posiciona: nível 1 (semi) é o mais interno; nível `depth` o mais externo
    levels.forEach((nodes,li)=>{
      const L=li+1;
      nodes.forEach((n,i)=>{ if(!n) return; n.x=cupNodeX(L,depth,side); n.y=cupNodeY(L,i,depth); });
    });
    levels.forEach((nodes,li)=>{
      const L=li+1;
      nodes.forEach(n=>{ if(!n) return;
        boxes.push(cupTieBoxHTML(n, n.x, n.y-CUP_BOX_H/2, CUP_BOX_W, CUP_BOX_H, key, goldTeam, opts));
        if(n.kids && L<depth) conns.push(cupConnectorsHTML(n.x, n.y, n.kids, side, goldTeam));
      });
      if(nodes.some(Boolean)) labels.push(`<div class="cl-cuplbl" style="left:${cupNodeX(L,depth,side)}px;width:${CUP_BOX_W}px">${escC(phaseName(L))}</div>`);
    });
    // ligação do lado com a final
    const inner=levels[0] && levels[0][0];
    if(inner){
      const team=inner.tie&&inner.tie.winner!=null?inner.tie.winner:null;
      const gold=team!=null&&team===goldTeam, th=gold?3:2;
      conns.push(side==='L'
        ? cupSeg(inner.x+CUP_BOX_W, cupMidY()-th/2, CUP_FINAL_X-(inner.x+CUP_BOX_W), th, gold, team)
        : cupSeg(CUP_FINAL_X+CUP_FINAL_W, cupMidY()-th/2, inner.x-(CUP_FINAL_X+CUP_FINAL_W), th, gold, team));
    }
  });
  boxes.push(cupTieBoxHTML(root, CUP_FINAL_X, cupMidY()-CUP_FINAL_H/2, CUP_FINAL_W, CUP_FINAL_H, key, goldTeam, opts));
  labels.push(`<div class="cl-cuplbl final" style="left:${CUP_FINAL_X}px;width:${CUP_FINAL_W}px">FINAL</div>`);
  const champ=b.champion, champCl=champ?clubOf(champ):null;
  // no sorteio quem manda no troféu é o painel lateral da cerimônia (ver cupDrawSideHTML) —
  // duas taças na mesma tela só competiriam entre si.
  const trofeu=opts.draw?'':`<div class="cl-cuptrophy" style="left:${CUP_STAGE_W/2-90}px">
      <!-- A ARTE DO TROFEU VEM DO ARQUIVO, NAO DO trophies.js. A embutida e
           achatada (fundo preto na Serie A e na Libertadores, branco na Serie D)
           e no meio da chave aparecia como um quadrado escuro. Os .webp de
           img/trofeus tem alfa e recortam -- mesma regra da faixa da rodada ao
           vivo (ver rfCompTrofeuHTML). -->
      <div class="cl-cuptrophy-box${champ?'':' pending'}">${
        (typeof rfCompTrofeuHTML==='function' && typeof rfCompInfo==='function' && (rfCompInfo(key)||{}).trofeu)
          ? rfCompTrofeuHTML(rfCompInfo(key),104)
          : (trophyImg(key,104)||'🏆')}</div>
      <div class="cl-cuptrophy-lbl">${champ?'CAMPEÃO':'A TAÇA'}</div>
      ${champ?`<div class="cl-cuptrophy-club" style="${clubStripe(champCl)}">${escC(champCl?champCl.short:champ)}</div>`
             :`<div class="cl-cuptrophy-club pending">${escC(cupPhaseLabel(b.round,b.roundsTotal))}</div>`}
      ${cupPrizeBadgeHTML(key)}</div>`;
  const legendTeam = (!opts.draw && goldTeam) ? (goldTeam===b.champion ? 'caminho do campeão' : `caminho do ${(clubOf(goldTeam)||{}).short||'seu clube'}`) : '';
  const legend = legendTeam ? `<div class="cl-cuplegend"><span class="cl-cuplegend-l"></span>${escC(legendTeam)}</div>` : '';
  return cupStageWrap(`${labels.join('')}${conns.join('')}${boxes.join('')}${trofeu}${legend}${opts.draw?'':cupTieDetailHTML(b,key)}`);
}
/* fases iniciais (dezenas de confrontos): grade de caixas no mesmo palco, mesmo visual da chave */
function cupEarlyStageHTML(b, key, opts){
  opts=opts||{};
  const round=b.champion?b.roundsTotal:b.round;
  const ties=cupTiesOfRound(b, round)||[];
  const goldTeam = cupTeamAlive(b,CL.clubId) ? CL.clubId : null;
  if(!ties.length) return cupEmptyStageHTML('O chaveamento ainda não começou.');
  const dr=opts.draw;
  // no sorteio os isentos ganham uma faixa própria embaixo — sem ela, metade dos clubes (48 dos
  // 64 na Copa do Brasil) sairia do pote e não apareceria em lugar nenhum da tela.
  const byeIds = dr ? (b.byeTeams||b.pendingByes||[]) : [];
  const showByes = dr && byeIds.length>0;
  const top=52, band=cupStageH()-top-14;
  const tieBand = showByes ? Math.round(band*0.54) : band;
  const cols=Math.min(8, Math.max(4, Math.ceil(Math.sqrt(ties.length*CUP_STAGE_W/tieBand))));
  const rows=Math.ceil(ties.length/cols);
  const cw=(CUP_STAGE_W-16)/cols, ch=Math.min(CUP_BOX_H+26, tieBand/rows);
  const bw=Math.min(CUP_BOX_W+18, cw-10), bh=Math.min(CUP_BOX_H, ch-8);
  const y0=top+Math.max(0,(tieBand-rows*ch)/2); // bloco centralizado na faixa, não colado no topo
  const boxes=ties.map((t,i)=>{
    const r=Math.floor(i/cols), col=i%cols;
    return cupTieBoxHTML({round, tie:t}, 8+col*cw+(cw-bw)/2, y0+r*ch, bw, bh, key, goldTeam, opts);
  });
  if(showByes) boxes.push(cupDrawByeBandHTML(byeIds, dr, top+tieBand+4, band-tieBand-4));
  const byes=(b.pendingByes||[]).length;
  const sub = dr
    ? `${cupDrawTieCount(dr)}/${ties.length} confrontos sorteados${byeIds.length?` · ${cupDrawByeCount(dr)}/${byeIds.length} isentos`:''}`
    : `${ties.length} confronto${ties.length>1?'s':''}${byes?` · ${byes} clube${byes>1?'s':''} de folga`:''} · a chave espelhada começa nas oitavas`;
  const head=`<div class="cl-cupearly-h" style="width:${CUP_STAGE_W}px">${escC(cupPhaseLabel(round,b.roundsTotal).toUpperCase())}
      <span>${escC(sub)}</span></div>`;
  return cupStageWrap(`${head}${boxes.join('')}${dr?'':cupTieDetailHTML(b,key)}`);
}
/* faixa dos ISENTOS durante o sorteio: uma ficha por clube que passa direto de fase, preenchendo
   na ordem em que sai do pote (mesmo tratamento das caixas de confronto). */
function cupDrawByeBandHTML(byeIds, dr, y, h){
  const drawn=dr.drawn.filter(p=>p.bye).map(p=>p.h);
  const last=cupDrawLast(dr);
  const n=byeIds.length;
  const cols=Math.min(8, Math.max(4, Math.ceil(n/Math.max(1,Math.floor((h-18)/26)))));
  const rows=Math.ceil(n/cols);
  const cw=(CUP_STAGE_W-16)/cols, chh=Math.min(26, Math.max(14,(h-18)/rows));
  const chips=[];
  for(let i=0;i<n;i++){
    const id=drawn[i], r=Math.floor(i/cols), col=i%cols;
    const st=`left:${8+col*cw}px;top:${y+18+r*chh}px;width:${cw-6}px;height:${chh-3}px`;
    if(id==null){ chips.push(`<div class="cl-cupbye empty" style="${st}"></div>`); continue; }
    const cl=clubOf(id);
    chips.push(`<div class="cl-cupbye${last&&last.bye&&last.h===id?' fresh':''}${cupIsHumanClub(id)?' me':''}"
      style="${st};${clubStripe(cl)}">${escC(cl?cl.short:id)}</div>`);
  }
  return `<div class="cl-cupbye-h" style="left:8px;top:${y}px;width:${CUP_STAGE_W-16}px">ISENTOS — passam direto de fase <b>${drawn.length}/${n}</b></div>${chips.join('')}`;
}
function cupEmptyStageHTML(msg){ return cupStageWrap(`<div class="cl-cupempty">${trophyImg(CL._cupKey,72)||'🏆'}<p>${escC(msg)}</p></div>`); }
function cupStageWrap(inner){ return `<div class="cl-cupstage-host"><div class="cl-cupstage" id="cl-cupstage"
    style="width:${CUP_STAGE_W}px;height:${cupStageH()}px">${inner}</div></div>`; }

/* ---- fase de grupos: grade de grupos, TODOS visíveis ao mesmo tempo, sem rolagem ---- */
function cupGroupGridHTML(c, key, opts){
  opts=opts||{};
  if(!c.group) return `<div class="cl-cupempty"><p>Esta competição não tem fase de grupos.</p></div>`;
  const g=c.group, labels=Object.keys(g.groups);
  const cols = labels.length>=7?4 : labels.length>=5?3 : labels.length>=2?2 : 1;
  const rows = Math.ceil(labels.length/cols);
  // durante o SORTEIO o grupo do usuário não pode ir pra frente nem ser marcado: isso entregaria
  // o resultado antes de a bola dele sair do pote. Só depois de sorteado é que ele se destaca.
  const drawn = opts.draw ? opts.draw.drawn.some(p=>p.h===CL.clubId) : true;
  const myLabel = drawn ? labels.find(l=>g.groups[l].teams.includes(CL.clubId)) : null;
  const ordered = (myLabel && !opts.draw) ? [myLabel, ...labels.filter(l=>l!==myLabel)] : labels;
  // a grade da COMPETIÇÃO leva uma marca própria: o cartão dela tem seis colunas de tabela e, no
  // telefone, precisa da largura inteira (o do sorteio, com uma linha por clube, cabe em duas)
  return `<div class="cl-cupgrid ${opts.draw?'':'cl-cupgrid-comp'}" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)">
    ${ordered.map(l=>cupGroupCardHTML(g, l, l===myLabel, opts)).join('')}</div>`;
}
function cupGroupCardHTML(g, label, mine, opts){
  const grp=g.groups[label];
  if(opts.draw) return cupGroupDrawCardHTML(grp, label, mine, opts.draw);
  const lastRound = Math.max(0, (g.round||0)-1);
  const res=(grp.results||[]).filter(r=>r.r===lastRound).slice(0,3);
  const live = !!opts.live && !g.finished && res.length>0;
  const badge = g.finished
    ? `<b class="done">ENCERRADO</b>`
    : live
      ? `<b class="live"><i></i>AO VIVO</b>`
      : `<b>RODADA ${Math.min((g.round||0)+1, g.roundsTotal)}/${g.roundsTotal}</b>`;
  // OS JOGOS DA RODADA: duas plaquetas nas cores dos clubes com o placar no meio. É a informação
  // que estava faltando na tela clara — sem ela a tabela mudava sozinha, sem dizer por quê.
  const matchRow=(r)=>{
    const h=clubOf(r.h), a=clubOf(r.a);
    const venceH=r.hg>r.ag, venceA=r.ag>r.hg;
    return `<div class="cl-cup2-m">
      <span class="cl-cup2-mt ${venceH?'ganhou':''}" style="${clubStripe(h)}">${escC(h?h.short:r.h)}</span>
      <span class="cl-cup2-ms">${r.hg}<i>×</i>${r.ag}</span>
      <span class="cl-cup2-mt ${venceA?'ganhou':''}" style="${clubStripe(a)}">${escC(a?a.short:r.a)}</span></div>`;
  };
  const jogos = res.length
    ? res.map(matchRow).join('')
    : `<div class="cl-cup2-m vazio">aguardando a 1ª semana</div>`;
  const standings=groupTableStandings(grp);
  const adv=g.advancePerGroup||2;
  // A TABELA COMPLETA, não só os pontos: jogos, saldo e pontos. Quem olha uma fase de grupos
  // quer saber se ainda dá — e "ainda dá" se lê no saldo e nos jogos que faltam, não no Pts.
  const rows=standings.map((t,i)=>{
    const cl=clubOf(t.id); const {col,col2}=clubColors(cl); const txtCor=barTextColor(col,col2);
    const zone = i<adv ? 'ok' : (i===adv ? 'edge' : '');
    const sg=(t.GF||0)-(t.GA||0);
    return `<div class="cl-cup2-lin ${zone} ${t.id===CL.clubId?'me':''}">
      <span class="cl-cup2-pos" style="background:${col};color:${txtCor}">${i+1}</span>
      ${cl?clubCrestHTML(cl):''}
      <span class="cl-cup2-tn">${escC(cl?cl.short:t.id)}</span>
      <span class="cl-cup2-td">${t.P||0}</span>
      <span class="cl-cup2-td">${sg>0?'+':''}${sg}</span>
      <span class="cl-cup2-tp">${t.Pts||0}</span></div>`;
  }).join('');
  return `<div class="cl-cup2-gc${mine?' mine':''}">
    <div class="cl-cup2-gc-h"><span>Grupo ${escC(label)}</span>${badge}</div>
    <div class="cl-cup2-jogos">${jogos}</div>
    <div class="cl-cup2-tab">
      <div class="cl-cup2-lh"><span></span><span></span><span>CLASSIFICAÇÃO</span><span>J</span><span>SG</span><span>P</span></div>
      ${rows}
    </div></div>`;
}
/* card do grupo DURANTE O SORTEIO: só as vagas do grupo, preenchidas na ordem em que os clubes
   saem do pote. Sem jogos e sem tabela — ainda não existe nada disputado pra mostrar. */
function cupGroupDrawCardHTML(grp, label, mine, dr){
  const size=(grp.teams||[]).length||4;
  const drawn=dr.drawn.filter(p=>p.group===label).map(p=>p.h);
  const last=cupDrawLast(dr);
  const fresco = !!(last && last.group===label);
  const slots=[];
  for(let i=0;i<size;i++){
    const id=drawn[i];
    if(id==null){ slots.push(`<div class="cl-cup2-r empty"><i>${i+1}</i><span class="cl-cup2-rn">—</span></div>`); continue; }
    const cl=clubOf(id); const {col}=clubColors(cl);
    const novo = last && last.group===label && last.h===id;
    slots.push(`<div class="cl-cup2-r${novo?' fresh':''}${cupIsHumanClub(id)?' me':''}" style="--barra:${col}">
      <i>${i+1}</i>${cl?clubCrestHTML(cl):''}<span class="cl-cup2-rn">${escC(cl?cl.short:id)}</span></div>`);
  }
  const full=drawn.length>=size;
  return `<div class="cl-cup2-gc${mine?' mine':''}${fresco?' fresco':''}">
    <div class="cl-cup2-gc-h"><span>Grupo ${escC(label)}</span><b class="${full?'full':''}">${drawn.length}/${size}</b></div>
    <div class="cl-cup2-gc-b">${slots.join('')}</div></div>`;
}

/* ================= PREMIAÇÃO EM DESTAQUE (troféu + dinheiro) =================
   O que o campeão leva, no mesmo lugar em que a taça aparece. Copa do Brasil paga cota POR
   FASE durante a temporada (a da final é o prêmio de campeão); as continentais pagam no
   fechamento (PRIZES.CUP[categoria].campeao). Ver prizes.js. */
function cupChampionPrize(key){
  if(typeof PRIZES==='undefined') return 0;
  if(key==='copaBrasil') return (PRIZES.CB_PHASE&&PRIZES.CB_PHASE.final)||0;
  const t=PRIZES.CUP&&PRIZES.CUP[PRIZES.cupCategory(key)];
  return (t&&t.campeao)||0;
}
/* ícone de dinheiro acumulado: maços de notas empilhados (SVG inline — nada de asset externo) */
function moneyStackSVG(size){
  const s=size||20;
  return `<svg class="cl-money-ic" width="${s}" height="${Math.round(s*0.84)}" viewBox="0 0 25 21" aria-hidden="true" focusable="false">
    <g stroke="#063d18" stroke-width="1.1" stroke-linejoin="round">
      <rect x="1.5" y="13.5" width="22" height="6" rx="1" fill="#2f8f4f"/>
      <rect x="2.5" y="8"    width="20" height="6" rx="1" fill="#3fa35c"/>
      <rect x="3.5" y="2.5"  width="18" height="6" rx="1" fill="#57bd72"/>
    </g>
    <circle cx="12.5" cy="5.5" r="1.7" fill="none" stroke="#063d18" stroke-width="1.1"/>
    <path d="M6 4.2v2.6M19 4.2v2.6" stroke="#063d18" stroke-width="1.1" stroke-linecap="round"/>
  </svg>`;
}
function cupPrizeBadgeHTML(key, cls){
  const v=cupChampionPrize(key); if(!v) return '';
  const txt = typeof fmt==='function' ? fmt(v) : String(v);
  return `<div class="cl-cupprize ${cls||''}" title="Premiação do campeão">
    ${moneyStackSVG(20)}<b>${escC(txt)}</b><i>ao campeão</i></div>`;
}

/* ---- casca da tela: cabeçalho + abas coladas ao painel + conteúdo ---- */
function cupHasGroupTab(key,c){ return !!(COMP_HAS_GROUP[key] && c && c.group); }
function cupPhaseTabsHTML(key, hasGroup, tab, status, locked){
  // no sorteio as abas ficam travadas na fase sorteada: sair dela no meio da cerimônia só
  // mostraria uma fase vazia e quebraria o encadeamento do tick.
  const t=(id,label,icon)=>`<button role="tab" aria-selected="${tab===id}" ${locked?'disabled':''}
      class="cl-cuptab${tab===id?' active':''}${locked?' locked':''}"
      ${locked?'':`onclick="clCupTab('${escC(key)}','${id}')"`}>${icon} ${escC(label)}</button>`;
  return `<div class="cl-cuptabs" role="tablist">
    ${hasGroup?t('grupos','Fase de Grupos','⚽'):''}${t('chave','Mata-mata','🏆')}
    <div class="cl-cuptabs-sp"></div><div class="cl-cuptabs-st">${escC(status||'')}</div></div>`;
}
/* opts: {actions} — HTML dos botões do canto (Voltar / Continuar / Acelerar); {result} — faixa
   do resultado da partida recém-jogada; {live} — marca os grupos como AO VIVO nesta rodada;
   {draw} — estado da cerimônia de sorteio (CL.cupDraw): trava a aba, abre o painel do troféu/
   premiação/pote e faz a grade e a chave se preencherem clube a clube. */
/* ===== A TELA DA COMPETIÇÃO USA A MESMA CASCA CLARA DO SORTEIO =====
   Eram dois desenhos para a mesma competição: a cerimônia era clara e larga, com a taça contando
   a história à esquerda; a tabela de grupos era um painel escuro, com cartões apertados. Quem
   acabava de ver o sorteio entrava na classificação e parecia ter mudado de jogo.
   Agora é uma casca só (cupLightShell): muda o que a coluna da esquerda conta — no sorteio, o
   pote e a última bola; na competição, a fase, o seu grupo e a premiação — e o que o cartão de
   grupo mostra: as vagas se preenchendo lá, os jogos e a tabela aqui. */
function cupSideHTML(key, o){
  o=o||{};
  const c=S.cups&&S.cups[key];
  const camp=cupCompetitionChampion(c) ? (clubOf(cupCompetitionChampion(c))||{}).short : cupLastChampion(key);
  const rotulo=cupCompetitionChampion(c) ? 'CAMPEÃO' : (cupLastChampion(key)?'CAMPEÃO ATUAL':COMP_DEFS[key].short.toUpperCase());
  const premio=cupChampionPrize(key);
  const g=c&&c.group;
  const fase = cupCompetitionRoundLabel(c,key);
  // MEU GRUPO: onde eu estou, agora. É a única informação da tela que é sobre o usuário — e era
  // a que dava mais trabalho pra achar (procurar o próprio clube em oito cartões).
  let meu='';
  if(g && g.groups){
    const label=Object.keys(g.groups).find(l=>(g.groups[l].teams||[]).includes(CL.clubId));
    if(label){
      const tb=groupTableStandings(g.groups[label]);
      const pos=tb.findIndex(t=>t.id===CL.clubId);
      const eu=tb[pos]; const adv=g.advancePerGroup||2;
      const cl=clubOf(CL.clubId);
      meu=`<div class="cl-cup2-card cl-cup2-meu">
        <h4>SEU GRUPO</h4>
        <div class="cl-cup2-meu-b">
          ${cl?clubCrestHTML(cl):''}
          <div class="cl-cup2-meu-t">
            <b>Grupo ${escC(label)} · ${pos+1}º lugar</b>
            <span>${eu?`${eu.Pts} pt${eu.Pts===1?'':'s'} em ${eu.P} jogo${eu.P===1?'':'s'}`:'—'}</span>
          </div>
        </div>
        <div class="cl-cup2-meu-z ${pos<adv?'ok':'fora'}">${pos<adv?'✓ na zona de classificação':'✗ fora da zona (top '+adv+' passa)'}</div>
      </div>`;
    }
  }
  return `<aside class="cl-cup2-side">
    <div class="cl-cup2-card cl-cup2-trophy">
      <div class="cl-cup2-trophy-img">${trophyImg(key,150)||'🏆'}</div>
      <div class="cl-cup2-trophy-lbl">${escC(rotulo)}</div>
      <div class="cl-cup2-trophy-nm">${escC(String(camp||'a definir').toUpperCase())}</div>
    </div>
    <div class="cl-cup2-card cl-cup2-fase">
      <h4>ONDE A COPA ESTÁ</h4>
      <div class="cl-cup2-fase-t">${escC(fase||'—')}</div>
      ${g?`<div class="cl-cup2-fase-d">${Object.keys(g.groups||{}).length} grupos · passam ${g.advancePerGroup||2} de cada</div>`:''}
    </div>
    ${premio?`<div class="cl-cup2-card cl-cup2-prize">${moneyStackSVG(26)}
      <div><span>PRÊMIO TOTAL</span><b>${escC(fmt(premio))}</b><i>AO CAMPEÃO</i></div></div>`:''}
    ${meu}</aside>`;
}
/* casca clara compartilhada pelo sorteio e pela competição */
function cupLightShell(key, o){
  const fim=o.fim;
  const aba=(id,label,ativa,clicavel)=>clicavel
    ? `<button class="cl-cup2-tab${ativa?' on':''}" onclick="clCupTab('${escC(key)}','${id}')">${escC(label)}</button>`
    : `<span class="cl-cup2-tab${ativa?' on':''}">${escC(label)}</span>`;
  return `<div class="cl-cupscr cl-cup2">
    <header class="cl-cup2-hdr">
      <span class="cl-cup2-tr">${trophyImg(key,44)||'🏆'}</span>
      <h1 class="cl-cup2-nm">${escC(COMP_DEFS[key].name.toUpperCase())}</h1>
      <span class="cl-cup2-yr">${escC(String(S.season||''))}</span>
      <div class="cl-cup2-sp"></div>
      ${o.status?`<div class="cl-cup2-st${fim?' done':''}">${o.status}</div>`:''}
      ${o.actions?`<div class="cl-cup2-act">${o.actions}</div>`:''}
    </header>
    ${o.result||''}
    <div class="cl-cup2-body">
      ${o.side}
      <main class="cl-cup2-main">
        <div class="cl-cup2-tabs">${o.hasGroup?aba('grupos','FASE DE GRUPOS',o.tab==='grupos',o.tabsOn):''}${aba('chave','MATA-MATA',o.tab==='chave',o.tabsOn)}</div>
        <div class="cl-cup2-stage">${o.body}</div>
        ${cupAdSlotHTML(key, o.tab==='grupos'?'grupos':'confrontos')}
      </main>
    </div>
  </div>`;
}
function cupScreenHTML(key, opts){
  opts=opts||{};
  const c=S.cups&&S.cups[key]; if(!c) return '';
  CL._cupKey=key;
  const hasGroup=cupHasGroupTab(key,c);
  const tab = hasGroup ? (CL.cupTab==='chave'?'chave':'grupos') : 'chave';
  const body = tab==='grupos' ? cupGroupGridHTML(c,key,opts) : cupBracketStageHTML(c,key,opts);
  const champ=cupCompetitionChampion(c);
  return cupLightShell(key, {
    tab, hasGroup, tabsOn:true, body, actions:opts.actions, result:opts.result,
    fim:!!champ,
    status: champ ? `<span>campeão: ${escC((clubOf(champ)||{}).short||champ)}</span><span class="cl-cup2-ok">🏆</span>`
                  : `<span>${escC(cupCompetitionRoundLabel(c,key)||'')}</span>`,
    side: cupSideHTML(key, {}),
  });
}
/* ===== CERIMÔNIA DO SORTEIO — layout claro (Libertadores, Sul-Americana, Copa do Brasil) =====
   A cerimônia é o único momento em que a competição é a tela inteira, e ela tinha o mesmo
   cinza de painel do resto do jogo: taça pequena, pote como lista de sistema, grupos em caixas
   iguais às da tabela. Agora é uma tela clara e larga, com a coluna da esquerda contando a
   história da taça (troféu, campeão atual, premiação, em que etapa o sorteio está, o pote
   encolhendo e a última bola tirada) e a direita mostrando as vagas se preenchendo.
   NADA aqui é específico da Libertadores: tudo sai da chave (`key`) — troféu, nome, premiação
   e campeão do ano passado —, então a Sul-Americana e a Copa do Brasil usam a mesma tela. */
function cupLastChampion(key){
  const h=(S.history||[]);
  for(let i=h.length-1;i>=0;i--){ const w=h[i].cups&&h[i].cups[key]; if(w) return w; }
  return null;
}
/* espaço publicitário das telas de copa. Era um id por TELA (sorteio, grupos, confrontos),
   inventado aqui; agora é a chave `rf98.copa.sponsor` do inventário do painel — uma marca
   patrocina A COPA, não cada tela dela, e é assim que o espaço é vendido. */
function cupAdSlotHTML(key, tela){ return adSlotHTML('rf98.copa.sponsor'); }
function cupDrawSideHTML(key, dr){
  const isGroup=dr.stage==='group';
  const last=cupDrawLast(dr);
  const camp=cupLastChampion(key);
  const premio=cupChampionPrize(key);
  const etapa=(id,n,label,ativa)=>`<div class="cl-cup2-step${ativa?' on':''}"><i>${n}</i><span>${escC(label)}</span></div>`;
  const potRows=dr.remaining.map(id=>{ const cl=clubOf(id);
    return `<div class="cl-cup2-pot-r${cupIsHumanClub(id)?' me':''}">${escC(cl?cl.name:id)}</div>`; }).join('')
    || '<div class="cl-cup2-pot-r empty">— pote vazio —</div>';
  let ultimo='';
  if(last){
    const hCl=clubOf(last.h), aCl=last.a?clubOf(last.a):null;
    const tag = last.group!=null ? 'GRUPO '+escC(last.group) : (last.bye ? 'ISENTO' : '');
    ultimo=`<div class="cl-cup2-card cl-cup2-last">
      <h4>${isGroup?'ÚLTIMO SORTEADO':'ÚLTIMO CONFRONTO'}</h4>
      <div class="cl-cup2-last-b">
        ${hCl?clubCrestHTML(hCl):''}
        <div class="cl-cup2-last-t"><b>${escC(hCl?hCl.short.toUpperCase():last.h)}</b>
          ${aCl?`<span>× ${escC(aCl.short.toUpperCase())}</span>`:`<span>${tag}</span>`}</div>
      </div></div>`;
  }
  return `<aside class="cl-cup2-side">
    <div class="cl-cup2-card cl-cup2-trophy">
      <div class="cl-cup2-trophy-img">${trophyImg(key,150)||'🏆'}</div>
      ${camp?`<div class="cl-cup2-trophy-lbl">CAMPEÃO ATUAL</div><div class="cl-cup2-trophy-nm">${escC(String(camp).toUpperCase())}</div>`
            :`<div class="cl-cup2-trophy-lbl">${escC(COMP_DEFS[key].short.toUpperCase())}</div><div class="cl-cup2-trophy-nm">1ª EDIÇÃO DO SAVE</div>`}
    </div>
    ${premio?`<div class="cl-cup2-card cl-cup2-prize">${moneyStackSVG(26)}
      <div><span>PRÊMIO TOTAL</span><b>${escC(fmt(premio))}</b><i>AO CAMPEÃO</i></div></div>`:''}
    <div class="cl-cup2-card cl-cup2-steps">
      <h4>SORTEIO</h4>
      ${COMP_HAS_GROUP[key]?etapa('grupos',1,'FASE DE GRUPOS',isGroup):''}
      ${etapa('chave',COMP_HAS_GROUP[key]?2:1,'MATA-MATA',!isGroup)}
    </div>
    <div class="cl-cup2-card cl-cup2-pot">
      <h4>POTE <i title="Clubes que ainda não saíram">${dr.remaining.length}</i></h4>
      <div class="cl-cup2-pot-l">${potRows}</div>
    </div>
    ${ultimo}</aside>`;
}
function cupDrawScreenHTML(key, dr, actions){
  // CERIMÔNIA PORTADA (ver src/ui/rf26-sorteio.js): as telas Sorteio 2..6 do
  // pacote. O Brasileirão (Sorteio 1) fica de fora de propósito — aquele
  // formato já vem pronto de base no jogo, e a tela de referência dele não
  // deve substituir o que já existe.
  if(key!=='brasileirao') return rfSorteioHTML(key, dr);
  const c=S.cups&&S.cups[key]; if(!c) return '';
  CL._cupKey=key;
  const hasGroup=cupHasGroupTab(key,c) && dr.stage==='group';
  const tab = dr.stage==='group'?'grupos':'chave';
  const body = tab==='grupos' ? cupGroupGridHTML(c,key,{draw:dr}) : cupBracketStageHTML(c,key,{draw:dr});
  const fim=dr.idx>=dr.reveal.length;
  return cupLightShell(key, {
    tab, hasGroup, tabsOn:false, body, actions, fim,
    // A CERIMÔNIA PRECISA DE UMA BARRA, NÃO SÓ DE UM CONTADOR (regra do rebranding):
    // "2/32" não diz quanto falta sem fazer conta; a barra diz de relance. O número
    // continua ao lado, em mono, porque quem acompanha sorteio quer os dois.
    status: fim ? `<span>Sorteio encerrado</span><span class="cl-cup2-ok">✓</span>`
                : `<span class="rf-draw-prog">
                     <span class="rf-draw-bar"><i style="width:${Math.round(100*dr.idx/Math.max(1,dr.reveal.length))}%"></i></span>
                     <span class="rf-draw-n">${dr.idx}/${dr.reveal.length}</span>
                   </span>`,
    side: cupDrawSideHTML(key,dr),
  });
}
/* ---- estado/interação da tela (tudo na própria tela: nada abre modal) ---- */
function clCupTab(key,tab){ CL.cupTab=tab; CL._cupTie=null; cdraw(); }
function clCupView(key, tab){ CL.menu=null; clCloseOverlay();
  const c=S.cups&&S.cups[key]; if(!c) return;
  CL._cupKey=key; CL._cupTie=null;
  CL.cupTab = tab || (cupHasGroupTab(key,c) ? (CL.cupTab||'grupos') : 'chave');
  CL.screen='cupview'; cdraw();
}
function scCupView(){
  // TELA PORTADA (telas/Competicao - Visao Geral)
  return rfCompeticaoHTML(CL._cupKey);
}
function scCupViewLegado(){
  const key=CL._cupKey; if(!key || !(S.cups&&S.cups[key])) { CL.screen='main'; return scMain(); }
  return cupScreenHTML(key, {actions:btn('Voltar','clCupViewBack()',{icon:'◀',cls:'cl-btn-cancel cl-btn-sm'})});
}
/* FECHAR A COMPETICAO VOLTA AO JOGO, e mais nada. Ao sair da tela de uma copa
   abria-se por cima o dialogo antigo "Minhas competicoes" -- a lista das quatro
   competicoes com o selo de estado. Ele fazia sentido quando era a UNICA porta
   para as copas; hoje a pagina Campeonatos tem as abas (Minhas competicoes,
   Calendario, Artilharia, Historia) e o cartao de cada competicao, ou seja: a
   lista reaparecia por cima da tela que a substituiu.

   `clCompList` continua a existir -- e a servir o menu antigo (Campeonatos >
   Minhas competicoes), que ainda e a navegacao do desktop legado. */
function clCupViewBack(){ CL.screen=CL._seatContext?'seatturn':'main'; CL._cupTie=null; cdraw(); }
/* ---- leitura do estado da cerimônia (CL.cupDraw) pelos componentes da tela ---- */
function cupDrawLast(dr){ return dr && dr.drawn.length ? dr.drawn[dr.drawn.length-1] : null; }
function cupDrawHasTie(dr, t){ return !!(dr && dr.drawn.some(p=>!p.bye && p.group==null && p.h===t.h && p.a===t.a)); }
function cupDrawTieCount(dr){ return dr ? dr.drawn.filter(p=>!p.bye && p.group==null).length : 0; }
function cupDrawByeCount(dr){ return dr ? dr.drawn.filter(p=>p.bye).length : 0; }
/* clube comandado por gente de verdade: o meu no solo, qualquer assento humano na Resenha */
function cupIsHumanClub(id){ return id!=null && (id===CL.clubId || !!(CL.humans && CL.humans[id])); }
/* destaque do caminho de um time na chave (hover) — o realce é aplicado direto no DOM pra não
   re-renderizar o palco inteiro a cada passada do mouse. */
function cupHover(id){
  const st=document.querySelector('#cl-cupstage')||document.querySelector('.cl-cupscr');
  if(!st) return;
  st.querySelectorAll('.hl').forEach(e=>e.classList.remove('hl'));
  if(id==null) return;
  const want=String(id);
  st.querySelectorAll('[data-cupt]').forEach(e=>{ if(e.getAttribute('data-cupt')===want) e.classList.add('hl'); });
}
function cupPickTie(key, round, h, a){
  CL._cupTie = key==null ? null : {key, round, h, a};
  cdraw();
}
/* escala o palco pra caber no painel — é isto que garante "sem rolagem" em qualquer resolução.
   No mobile o palco não desce de 0.5 (abaixo disso vira ilegível): ali sim ele rola na horizontal. */
function cupFitStage(){
  const stage=document.querySelector('#cl-cupstage'); if(!stage) return;
  const host=stage.parentElement; if(!host) return;
  const narrow=window.innerWidth<=760;
  if(!narrow) host.style.height=''; // limpa a altura fixa do modo mobile (ex: girou o aparelho)
  const w=host.clientWidth || (host.parentElement?host.parentElement.clientWidth:0);
  // O PALCO SEM MEDIDA NÃO PODE SER DESISTIDO. Este ajuste roda num requestAnimationFrame logo
  // depois de o cdraw trocar o innerHTML, e nem sempre o navegador já fez o layout desse HTML
  // novo — clientWidth vem 0. Desistir aqui deixava o palco SEM transform nenhum (chave em
  // tamanho bruto, transbordando o painel) e nada mais tentava de novo. Tenta no quadro
  // seguinte, com um teto pra não virar laço se a tela estiver mesmo escondida.
  const hMedida=host.clientHeight;
  if(!w || (!narrow && !hMedida)){
    CL._cupFitTentativas=(CL._cupFitTentativas||0)+1;
    if(CL._cupFitTentativas<=10) requestAnimationFrame(cupFitStage);
    return;
  }
  CL._cupFitTentativas=0;
  // desktop: cabe na largura E na altura do painel (é o que garante "sem rolagem nenhuma").
  // mobile: a escala vem só da largura, com piso de 0.5 (abaixo disso os nomes ficam
  // ilegíveis) — e o host encolhe pra altura real do palco, senão sobraria uma faixa cinza.
  let s; const h=hMedida;
  // guarda a caixa medida ANTES de escalar: é dela que sai a altura do palco no próximo desenho
  // (ver cupStageH). No telefone o palco não segue a proporção — ali ele rola e a altura padrão
  // é a que mantém a chave legível.
  const H=narrow?CUP_STAGE_H_PADRAO:cupStageH();
  if(narrow){ s=Math.max(Math.min(w/CUP_STAGE_W,1), 0.5); }
  else { s=Math.min(w/CUP_STAGE_W, h/H); }
  stage.style.transform='scale('+s+')';
  stage.style.left=Math.max(0,(w-CUP_STAGE_W*s)/2)+'px';
  stage.style.top=narrow?'0px':Math.max(0,(h-H*s)/2)+'px';
  if(narrow) host.style.height=(H*s)+'px';
  if(narrow) return;
  /* O PALCO FOI DESENHADO COM UMA ALTURA; o painel pode pedir outra (primeira abertura, janela
     redimensionada, barra lateral que mudou de tamanho). Guarda a medida e redesenha UMA vez se a
     diferença for grande o bastante pra valer — o guarda por valor impede o vaivém de redesenhos
     (mede, redesenha, mede de novo, redesenha...) que um limiar solto provocaria. */
  const antes=CL._cupHostBox;
  if(!antes || Math.abs(antes.w-w)>2 || Math.abs(antes.h-h)>2){
    CL._cupHostBox={w,h};
    const idealNovo=cupStageH();
    if(Math.abs(idealNovo-H)>8 && CL._cupRedesenho!==idealNovo){
      CL._cupRedesenho=idealNovo;
      cdraw();
    }
  }
}

/* ================= SORTEIO DOS JOGOS DA TAÇA (cerimônia animada, igual ao RetroFoot98 clássico) =================
   Quando um chaveamento novo é montado (Copa do Brasil no início da temporada; Libertadores/
   Sul-Americana no dia real do sorteio das oitavas), o pareamento em si já foi decidido de
   forma determinística (makeBracket — mesmo overall/seed de sempre); esta tela só ANIMA a
   revelação bola-a-bola desse resultado, com ~2s entre cada sorteio (acelerável), igual à
   tela clássica "Sorteio dos jogos da taça": lista de times à esquerda (encolhendo conforme
   saem), confrontos sorteados à direita, e destaque embaixo pro(s) time(s) do usuário —
   um único destaque no modo solo, ou um por jogador humano (cores do próprio clube) na Resenha. */
/* fila de sorteios a mostrar: cada item é {key, stage} — stage 'group' (fase de grupos,
   time -> grupo) ou 'bracket' (mata-mata, pares/isento). */
function queueDrawShow(key, stage){
  /* PORTA UNICA DA FILA DE CERIMONIAS: competicao sem cerimonia nunca entra,
     venha o pedido de onde vier (abertura da temporada, data do sorteio, ou o
     sorteio do mata-mata das continentais). Ver CUP_SEM_CERIMONIA, no core. */
  if(typeof cupTemCerimonia==='function' && !cupTemCerimonia(key)) return;
  S._pendingDrawShows=S._pendingDrawShows||[]; stage=stage||'bracket';
  if(!S._pendingDrawShows.some(x=>(x&&x.key)===key && (x&&x.stage||'bracket')===stage)) S._pendingDrawShows.push({key, stage}); }
/* ONLINE: cada cliente enfileira o sorteio da copa NOVA da temporada por conta própria.
   Antes o sorteio dependia de S._pendingDrawShows, uma fila de UI que vivia no cliente que
   CRIOU a copa (o host, no newGame da 1ª temporada) — na virada o servidor cria a chave mas não
   enfileira nada, e na 1ª temporada havia corrida (o host mostrava e limpava antes do convidado
   adotar). Resultado: só o anfitrião via o sorteio. Aqui, ao adotar o estado, TODO cliente detecta
   a chave recém-sorteada (round 1, sem campeão, com confrontos / fase de grupos) e enfileira o
   sorteio se ainda não mostrou nesta temporada (marcador LOCAL por cliente, key+season). Assim
   todos veem, e a barreira 'busy' do cupdraw (ver onlineTimerLoop) segura a rodada até todos
   terminarem de assistir. */
/* MARCADOR DE CERIMÔNIA JÁ ASSISTIDA, RESISTENTE A RELOAD.
   CL._drawShownSeason e CL._drawPlayedSeason vivem só em memória: recarregar a página (o que o
   botão "Sincronizar a Resenha" faz de propósito) apagava os dois e a cerimônia voltava do zero.
   Aqui o mesmo marcador é gravado por SALA + temporada, então a sincronia devolve o jogador ao
   ponto onde ele estava sem repetir sorteio nenhum. localStorage (e não sessionStorage) porque
   vale entre sessões: quem fecha o navegador e volta no dia seguinte também não deve rever. */
/* O MARCADOR É POR SAVE, não por modo. Era 'rf98:draws:solo' pra qualquer jogo solo — um balde
   só, compartilhado por todos os saves da máquina. Com as cerimônias no começo do jogo isso
   ficou gritante: bastava ter visto os sorteios uma vez pra que TODO save novo entrasse direto
   na tela do clube, sem sorteio nenhum. Na Resenha a sala já identificava o jogo; no solo quem
   identifica é o seed do save (único por partida, estável entre sessões). */
function drawSeenKey(){
  const sala=(typeof NET!=='undefined'&&NET.room&&NET.room.code)||null;
  const save=(typeof S!=='undefined'&&S&&S.seed!=null)?('solo:'+S.seed):'solo';
  return 'rf98:draws:'+(sala||save);
}
function drawSeenSet(){ try{ return JSON.parse(localStorage.getItem(drawSeenKey())||'{}')||{}; }catch(e){ return {}; } }
function drawAlreadySeen(mark){ return drawSeenSet()[mark]===true; }
function rememberDrawSeen(mark){
  try{ const m=drawSeenSet(); m[mark]=true; localStorage.setItem(drawSeenKey(), JSON.stringify(m)); }catch(e){}
}
function queueSeasonCupDrawsIfNew(){
  if(typeof CL==='undefined' || !CL.online || !S || !S.cups) return;
  CL._drawShownSeason = CL._drawShownSeason || {};
  const season = S.season||1;
  // MESMA ordem de calendário do início da temporada (ver cupDrawOrder no core): quem joga antes,
  // sorteia antes. Antes era uma lista fixa começando pela Copa do Brasil, que é a última a entrar
  // em campo — então, quando mais de um sorteio caía na mesma transição, a cerimônia saía fora de
  // ordem em relação às partidas que vinham a seguir.
  const defs=(typeof cupDrawOrder==='function') ? cupDrawOrder()
    : [['copaBrasil','bracket'],['libertadores','group'],['sulamericana','group'],['championsLeague','group'],['europaLeague','group']];
  defs.forEach(([key,stage])=>{
    const c=S.cups[key]; if(!c) return;
    // "FRESCA" TEM QUE SIGNIFICAR "AINDA NÃO COMEÇOU", NÃO "ESTÁ EM ANDAMENTO".
    // O teste das continentais era `c.group && !c.bracket`, verdadeiro durante a fase de grupos
    // INTEIRA (6 rodadas). Como o marcador de "já mostrei" vive em CL e não sobrevive a um reload,
    // qualquer recarga no meio da fase de grupos re-enfileirava a cerimônia — e o botão
    // "Sincronizar a Resenha" recarrega a página de propósito, então ele passou a garantir um
    // sorteio repetido da Libertadores com a competição já rolando. Foi o relatado.
    // Agora fresca = nenhuma rodada disputada ainda: grupo na rodada 0, ou chave sem nenhum
    // confronto decidido. Isso vale mesmo sem marcador nenhum, que é o que torna a correção
    // resistente a reload.
    const fresh = (key==='copaBrasil')
      ? (c.round===1 && !c.champion && !((c.ties||[]).some(t=>t&&t.winner))
         && ((c.ties&&c.ties.length) || (c.pendingByes&&c.pendingByes.length)))
      : !!(c.group && !c.bracket && (c.group.round||0)===0 && !c.group.finished);
    const mark = key+':'+season;
    /* A MARCA DE "JÁ VI" É ESCRITA AO ASSISTIR, NÃO AO ENFILEIRAR.
       Este rememberDrawSeen ficava aqui, no momento em que a cerimônia entrava na FILA — ou seja,
       o cliente gravava em disco que tinha visto um sorteio que ainda não tinha começado. Bastava a
       cerimônia não chegar a rolar (dados ainda não montados, tela trocada por cima, adoção no meio)
       para ela ficar marcada como vista e nunca mais voltar NAQUELE cliente — enquanto o outro, com
       um instante de diferença, assistia normalmente. Era assim que o mesmo sorteio aparecia para o
       convidado e não para o anfitrião. O startCupDrawReplay grava exatamente esta marca quando a
       cerimônia de fato começa; o CL._drawShownSeason (só em memória) continua evitando enfileirar
       duas vezes na mesma sessão. */
    if(fresh && CL._drawShownSeason[mark]!==true && !drawAlreadySeen(mark)){
      CL._drawShownSeason[mark]=true; queueDrawShow(key, stage);
    }
  });
}
/* dispara o próximo sorteio pendente, se houver; encadeia até esvaziar a fila e só então
   chama onDone (ex: mostrar a classificação da rodada, ou o aviso de acesso/queda) */
/* A ORDEM DA FILA É DO MUNDO, NÃO DE QUEM ENFILEIROU PRIMEIRO.
   As cerimônias entram por dois caminhos (queueDueCupDraws, pela data; queueSeasonCupDrawsIfNew,
   ao detectar copa recém-sorteada) e o primeiro percorre Object.keys(S.cups), cuja ordem é
   arbitrária. Dois clientes montavam a mesma fila em ordens diferentes e assistiam às mesmas
   cerimônias em sequências diferentes — relatado: o convidado via a Copa do Brasil DEPOIS da
   Sul-Americana. cupDrawOrder() é a ordem do calendário (quem joga antes, sorteia antes) e é igual
   em todo cliente, porque sai do mundo. */
function sortPendingDrawShows(){
  if(!S._pendingDrawShows || S._pendingDrawShows.length<2) return;
  if(typeof cupDrawOrder!=='function') return;
  const ordem=cupDrawOrder().map(x=>x[0]);
  const pos=k=>{ const i=ordem.indexOf(k); return i<0?999:i; };
  S._pendingDrawShows.sort((a,b)=>pos((a&&a.key)||a)-pos((b&&b.key)||b));
}
function checkPendingCupDraws(onDone){
  /* LIMPA A FILA DAS COMPETICOES QUE JA NAO TEM CERIMONIA. A fila mora no SAVE
     (S._pendingDrawShows): quem ja tinha a Copa do Brasil enfileirada antes de
     ela deixar de ter sorteio continuava a ver a tela antiga a cada carregamento
     -- a porta de entrada foi fechada, mas quem ja estava dentro ficou. */
  if(S._pendingDrawShows && S._pendingDrawShows.length && typeof cupTemCerimonia==='function'){
    S._pendingDrawShows=S._pendingDrawShows.filter(x=>cupTemCerimonia((x&&x.key)||x));
  }
  if(!S._pendingDrawShows || !S._pendingDrawShows.length){ if(onDone) onDone(); return false; }
  sortPendingDrawShows();
  const item=S._pendingDrawShows.shift();
  const key=(item&&item.key)||item, stage=(item&&item.stage)||'bracket'; // retrocompat com saves que guardaram só a string
  // JÁ MOSTREI este sorteio nesta sessão (marcador em startCupDrawReplay): pula. A fila mora no
  // shared_state e o host salva ANTES de consumi-la, então toda adoção de estado no online
  // re-enfileirava um sorteio já assistido — o usuário via a MESMA cerimônia duas vezes seguidas.
  // O marcador vive em CL (não persiste): após recarregar a página, um sorteio pendente de verdade
  // ainda aparece normalmente.
  const mark=key+':'+stage+':'+(S.season||1);
  // copa que nao e do MEU universo (fui treinar fora): a entrada e drenada sem cerimonia
  if(typeof cupDoMeuUniverso==='function' && !cupDoMeuUniverso(key)) return checkPendingCupDraws(onDone);
  // o marcador também é lido do armazenamento (ver drawAlreadySeen): sem isso, a fila que veio no
  // shared_state re-exibia a cerimônia depois de um reload — inclusive o do botão de sincronizar.
  if((CL._drawPlayedSeason||{})[mark] || drawAlreadySeen(mark)) return checkPendingCupDraws(onDone);
  /* CERIMÔNIA NUNCA SE PERDE EM SILÊNCIO. O startCupDrawReplay desiste quando os dados dela ainda
     não existem (chave/grupos por montar) — e como a entrada JÁ tinha saído da fila, ela sumia para
     sempre NAQUELE cliente, enquanto o outro, que chegou ali um instante depois, assistia normal.
     É uma das formas de "o sorteio apareceu para um e não para o outro". Agora a entrada volta para
     a fila e é tentada de novo; se depois de algumas voltas os dados continuarem sem existir, sai
     do caminho com aviso no console, em vez de segurar a sala calada. */
  if(!startCupDrawReplay(key, stage, ()=>checkPendingCupDraws(onDone))){
    CL._drawRetry=CL._drawRetry||{};
    CL._drawRetry[mark]=(CL._drawRetry[mark]||0)+1;
    if(CL._drawRetry[mark]<=5){
      S._pendingDrawShows.push(item);
      console.warn('sorteio '+mark+' ainda sem dados (tentativa '+CL._drawRetry[mark]+') — devolvido à fila');
    } else {
      console.warn('sorteio '+mark+' descartado: os dados nunca ficaram prontos');
    }
    if(onDone) onDone();
    return false;
  }
  return true;
}
/* devolve TRUE se a cerimônia começou; FALSE se os dados dela ainda não existem — quem chamou
   decide o que fazer com isso (ver checkPendingCupDraws: devolve a entrada à fila em vez de
   perdê-la). Antes os dois casos saíam iguais e calados, e o sorteio sumia só para quem passou
   por aqui cedo demais. */
function startCupDrawReplay(key, stage, onDone){
  if(typeof stage==='function'){ onDone=stage; stage='bracket'; } // retrocompat
  /* competicao sem cerimonia (ver CUP_SEM_CERIMONIA, no core): devolve false e
     quem chamou segue em frente -- e o mesmo caminho de quando os dados do
     sorteio ainda nao existem, ja tratado por todos os chamadores. */
  if(typeof cupTemCerimonia==='function' && !cupTemCerimonia(key)) return false;
  const c=S.cups&&S.cups[key];
  let reveal=[], remaining=[];
  if(stage==='group'){
    const g=c&&c.group; if(!g||!g.groups) return false;
    Object.values(g.groups).forEach(grp=>{ (grp.teams||[]).forEach(id=>reveal.push({type:'group',id,group:grp.label})); });
    reveal.sort((a,b)=>clubOf(a.id).name.localeCompare(clubOf(b.id).name)); // sai em ordem alfabética
    remaining=reveal.map(r=>r.id);
  } else {
    const b = c&&c.champion!==undefined ? c : (c&&c.bracket);
    if(!b || !Array.isArray(b.ties) || !Array.isArray(b.byeTeams)) return false;
    // confrontos PRIMEIRO, isentos depois: agora que o sorteio acontece na própria chave, sair
    // pelos isentos deixaria a chave vazia por quase toda a cerimônia (na Copa do Brasil são 48
    // isentos pra 16 confrontos) — o jogador olharia 3/4 do sorteio pra caixas "a definir".
    b.ties.forEach(t=>reveal.push({type:'tie',h:t.h,a:t.a})); b.byeTeams.forEach(id=>reveal.push({type:'bye',id}));
    remaining=[...b.byeTeams,...b.ties.flatMap(t=>[t.h,t.a])].sort((x,y)=>clubOf(x).name.localeCompare(clubOf(y).name));
  }
  CL._drawPlayedSeason=CL._drawPlayedSeason||{};
  CL._drawPlayedSeason[key+':'+stage+':'+(S.season||1)]=true; // ver checkPendingCupDraws (sorteio duplicado)
  rememberDrawSeen(key+':'+stage+':'+(S.season||1));           // e grava, pra sobreviver ao reload da sincronia
  rememberDrawSeen(key+':'+(S.season||1));                     // mesma marca usada por queueSeasonCupDrawsIfNew
  CL.cupDraw={ key, stage, reveal, idx:0, drawn:[], remaining, fast:false, onDone };
  CL.screen='cupdraw'; cdraw();
  cupDrawTick();
  return true;
}
function cupDrawTick(){
  const st=CL.cupDraw; if(!st || CL.screen!=='cupdraw') return;
  if(st.idx>=st.reveal.length){
    // ao terminar o sorteio: se há uma próxima tela (done — tipicamente a CLASSIFICAÇÃO pós-rodada),
    // deixa ELA definir o screen. Antes fazia screen='main'+cdraw() ANTES de done(), o que piscava a
    // tela inicial no meio: sorteio -> tela-inicial(flash) -> classificação -> tela-inicial (item 3).
    CL._cupDrawTimer=setTimeout(()=>{ const done=st.onDone; CL.cupDraw=null;
      if(done) done();
      // se done() NÃO navegou (ex.: início do jogo passa onDone=()=>{}), a tela continua em 'cupdraw'
      // -> volta pro time. Se done() foi pra classificação (pós-rodada), screen já mudou e não piscamos
      // a tela inicial (era o item 3). Cobre os dois casos sem regressão.
      if(CL.screen==='cupdraw'){ CL.screen='main'; CL.tab='jogo'; cdraw(); } }, st.fast?400:1800);
    cdraw(); return;
  }
  const item=st.reveal[st.idx++];
  if(item.type==='bye'){ st.drawn.push({h:item.id,a:null,bye:true}); st.remaining=st.remaining.filter(id=>id!==item.id); }
  else if(item.type==='group'){ st.drawn.push({h:item.id,group:item.group}); st.remaining=st.remaining.filter(id=>id!==item.id); }
  else { st.drawn.push({h:item.h,a:item.a}); st.remaining=st.remaining.filter(id=>id!==item.h&&id!==item.a); }
  cdraw();
  CL._cupDrawTimer=setTimeout(cupDrawTick, st.fast?150:2000);
}
function clCupDrawSkip(){ if(CL.cupDraw){ CL.cupDraw.fast=true; toastC('⏩ Sorteio acelerado'); } }
/* O sorteio usa A MESMA TELA da competição (cupScreenHTML): as bolas caem direto nas vagas dos
   grupos e nas caixas da chave, em vez de numa lista "Times | Sorteados" à parte que o usuário
   depois tinha que traduzir mentalmente pro chaveamento. */
function scCupDraw(){
  const st=CL.cupDraw; if(!st) return deskWrap('');
  const done=st.idx>=st.reveal.length;
  const actions = done ? '' : btn('Acelerar','clCupDrawSkip()',{icon:'⏩',cls:'cl-btn-cancel cl-btn-sm',dis:st.fast});
  return cupDrawScreenHTML(st.key, st, actions);
}

/* ---- Seleccionar (tática/formação) ---- */
/* O BOTÃO DIZ EM QUE PÉ EU ESTOU. Na Resenha, clicar em "Jogar" durante o momento 'escalando' não
   começa a partida — ele diz "estou pronto", e a rodada só entra em campo quando o último treinador
   disser o mesmo. Sem um sinal na tela, o jogador clicava e nada visível acontecia (só um toast que
   some em 2s): ele não sabia se tinha clicado, e clicava de novo. Agora o próprio botão vira o
   estado: verde, "Pronto", e sem ação — junto com a barra de status, que já diz por quem a sala
   está esperando. Fora da Resenha (solo/hotseat) nada muda: lá "Jogar" começa a partida mesmo. */
/* "PRONTO" SÓ ENQUANTO ESTÁ SE ESCALANDO. A chave do pronto é o DIA, e o dia dura os três
   momentos — então o botão continuava verde depois da partida e durante a classificação, dizendo
   "Pronto" para uma coisa que já aconteceu. Pronto para quê? Só faz sentido enquanto a sala está
   no momento de escalar; passado isso, o botão volta a ser o botão de sempre. */
function estouPronto(){
  if(!CL.online || typeof onlineStageKey!=='function') return false;
  if(typeof roomMoment==='function' && roomMoment()!=='escalando') return false;
  return CL._readyForStage===onlineStageKey();
}
/* A ESCALAÇÃO QUE VALE É A QUE ESTÁ NA TELA — inclusive depois de eu ficar pronto.
   Ela é publicada no instante do "estou pronto" (é com ela que o servidor simula o meu clube se eu
   sumir, e é ela que o apito congela para todos). Só que a espera pelo outro treinador pode durar
   bastante agora — a sala aguarda sem pressa —, e nessa janela é natural mexer no time de novo. A
   mudança ficava fora: o jogador via uma formação na tela e a rodada usava outra, sem aviso.
   Republicar é barato e fecha essa porta. Antes do apito o servidor ainda não congelou nada, então
   a última versão publicada é a que entra em campo. */
function republicarEscalacao(){
  if(!estouPronto()) return;
  if(typeof NET==='undefined' || !NET.publishLineup || typeof S==='undefined' || !S) return;
  if(CL.humans && !CL.humans[CL.clubId]) return;
  NET.publishLineup((S.xi||[]).slice(), S.tactic||'equilibrado');
}
function jogarBtnHTML(ok){
  // PRONTO É UM INTERRUPTOR, NÃO UM CARIMBO SEM VOLTA. Ele nasceu desabilitado — o jogador que
  // clicasse e mudasse de ideia ficava preso, com a sala andando por cima dele. Clicar de novo
  // cancela: eu deixo de estar pronto e a sala volta a esperar por mim, que é o comportamento
  // honesto de quem decide a própria escalação.
  if(estouPronto()) return btn('Pronto','clCancelarPronto()',{icon:'✔',cls:'cl-btn-ok cl-btn-on'});
  return btn('Jogar','clJogar()',{icon:'⚽',cls:'cl-btn-ok',dis:!ok});
}
/* CANCELA O "ESTOU PRONTO". Tira o meu carimbo do servidor (day_unack) e volto a ser esperado.
   Só vale enquanto a sala está em 'escalando': depois disso a rodada já começou para todos, e
   desfazer seria voltar a sala no tempo — coisa que ninguém pode fazer sozinho. */
function clCancelarPronto(){
  if(!estouPronto()) return;
  const d=(typeof NET!=='undefined' && NET.room)?NET.room.day:null;
  CL._readyForStage=null;
  CL._dayAckKey=null;                       // libera o carimbo pra sair de novo quando eu voltar
  if(typeof NET!=='undefined' && NET.setReady) NET.setReady(false, CL.clubId);
  if(d && typeof NET!=='undefined' && NET.dayUnack){
    Promise.resolve(NET.dayUnack(d.idx, d.moment))
      .then(()=>{ if(NET.refreshDay) return NET.refreshDay(); })
      .catch(e=>console.warn('cancelar pronto:', e && e.message));
  }
  toastC('Você não está mais pronto — a sala espera por você.');
  cdraw();
}
/* CL.xiModo guarda QUAL BOTÃO foi apertado ('auto'/'best'/null); CL.formation guarda sempre uma
   formação de verdade. Antes CL.formation virava o texto 'Automático'/'Melhores', e aí o campo
   caía nas faixas genéricas (PITCH_BANDS._) e o "Seleccionar descansados" reescalava num 4-3-3
   que ninguém pediu — os jogadores mudavam de lugar sem o usuário mexer em nada. */
function clSelFormation(f){ CL.menu=null; let adjustedFrom=null;
  if(f==='auto'){ S.xi=autoXI(CL.clubId); CL.formation=coherentFormation(CL.clubId,'4-3-3');
    CL.xiModo='auto'; S.tactic='equilibrado'; }
  else if(f==='best'){ const forma=bestFormationForSquad(CL.clubId) || coherentFormation(CL.clubId,'4-3-3');
    S.xi=pickXIByFormation(CL.clubId,forma); CL.formation=forma; CL.xiModo='best'; S.tactic=tacticPosture(forma); }
  else { const real=coherentFormation(CL.clubId,f); if(real!==f) adjustedFrom=f;
    S.xi=pickXIByFormation(CL.clubId,real); CL.formation=real; CL.xiModo=null; S.tactic=tacticPosture(real); }
  CL.tacticChosen=true; CL.tab='seleccao'; saveV3();
  republicarEscalacao();   // mudei o time depois de ficar pronto? o que vale é o que está na tela
  cdraw();
  const rotulo = CL.xiModo==='best' ? ('Melhores de cada posição ('+CL.formation+')')
               : CL.xiModo==='auto' ? ('Automático ('+CL.formation+')') : ('Tática '+CL.formation);
  toastC(adjustedFrom ? `Sem jogadores pro ${adjustedFrom} — ajustado pra ${CL.formation}.` : rotulo+' seleccionada.'); }
/* "Seleccionar descansados": reaplica a formação já escolhida trocando o critério de escala
   de força (p.f) por energia (menos cansados primeiro), respeitando os setores da formação.
   Disponível só depois que uma formação foi escolhida (CL.tacticChosen) — funciona igual em
   solo, resenha e hotseat porque só mexe em S.xi/CL.formation, igual clSelFormation. */
function clSelectRested(){ if(!CL.tacticChosen) return;
  const f=(FORMATIONS[CL.formation])?CL.formation:'4-3-3';
  S.xi=pickXIByFormationRested(CL.clubId,f); saveV3();
  republicarEscalacao(); cdraw();
  toastC('🔋 Onze mais descansado seleccionado.'); }

/* ---- Estádio (Equipa > Estádio...) ---- */
function clStadium(){ CL.menu=null; renderStadium(false); }
function standSVG(cap){ const tiers=Math.min(6,Math.max(1,Math.round((cap-STAND_START)/STAND_SEATS)+1)); const arcs=[];
  for(let i=0;i<tiers;i++){ const ry=40+i*9; arcs.push(`<path d="M ${100-ry*1.55} 128 A ${ry*1.55} ${ry} 0 0 1 ${100+ry*1.55} 128" fill="none" stroke="#9a9a9a" stroke-width="7"/>`); }
  return `<svg viewBox="0 0 200 165" class="cl-est-svg">${arcs.join('')}
    <ellipse cx="100" cy="118" rx="64" ry="38" fill="#2f7d32" stroke="#e9e36a" stroke-width="3"/>
    <rect x="68" y="96" width="64" height="44" fill="none" stroke="#fff" stroke-width="1.4"/>
    <line x1="100" y1="96" x2="100" y2="140" stroke="#fff" stroke-width="1.4"/>
    <circle cx="100" cy="118" r="8" fill="none" stroke="#fff" stroke-width="1.4"/></svg>`; }
/* foto real do estádio (ver public/src/data/stadium-images.js), quando o clube tem uma —
   hoje as Séries A, B, C e D do Brasil. Sem foto, cai no desenho genérico de sempre (standSVG). */
function stadiumPhotoFor(clubId){
  const p=(typeof STADIUM_IMG!=='undefined' && clubId) ? STADIUM_IMG[clubId] : null;
  return p || null;
}
function renderStadium(built){ const st0=myStadium(); const cap=(st0&&st0.capacity)||STAND_START;
  const maxCap=stadiumMaxCapacity(); const atMax=cap>=maxCap;
  const builtSeason=(st0&&st0.builtThisSeason)||0; const seasonLeft=Math.max(0,SEASON_BUILD_LIMIT-builtSeason);
  const cost=standCost(); const seasonFull=seasonLeft<STAND_SEATS;
  const dis=atMax||seasonFull;
  const photo=stadiumPhotoFor(S.clubId);
  overlayC(dlg('Estádio', `<div class="cl-est">
    ${photo?`<img class="cl-est-photo" src="${escC(photo)}" alt="Estádio">`:standSVG(cap)}
    <div class="cl-est-cap">${grp(cap)} lugares</div>
    <div class="cl-est-price">Preço de uma bancada com<br>${grp(STAND_SEATS)} lugares: ${fmt(cost)}</div>
    <div class="cl-est-maxcap">Teto do estádio para o porte do clube: ${grp(maxCap)} lugares<br>Obras liberadas nesta temporada: ${grp(seasonLeft)} lugares</div>
    <div class="cl-est-btns">${btn('Construir','clBuildStand()',{icon:'🚜',cls:'cl-btn-ico',dis:dis})}${btn('Fechar','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok cl-btn-ico'})}</div>
    ${built?`<div class="cl-est-note">As novas bancadas só estarão disponíveis para o próximo jogo</div>`:''}
    ${atMax?`<div class="cl-est-note">⚠ Estádio no teto para o porte atual do clube. Cresça o clube pra ampliar mais.</div>`:seasonFull?`<div class="cl-est-note">⚠ Limite de obras da temporada atingido — o resto só na próxima temporada (obra é lenta).</div>`:''}
  </div>`,{w:660,bodyClass:'cl-body-estadio',min:true})); }
/* `silencioso` existe para a obra em SERIE: a calculadora do estádio (ver rfEstConstruirGo em
   rf26-acoes.js) contrata várias bancadas de uma vez e chama esta função uma vez por bancada.
   Sem ele, cada volta reabria o diálogo antigo por cima do novo. As regras não mudam — quem cobra
   o caixa, sobe a capacidade, publica na sala e escreve nas finanças continua a ser esta função,
   uma bancada de cada vez. Devolve `false` quando recusa, para quem está em série poder parar. */
function clBuildStand(silencioso){
  const _recusa=(msg)=>{ if(!silencioso){ toastC(msg); renderStadium(false); } return false; };
  S.clubStadiumCap=S.clubStadiumCap||{};
  if(!S.clubStadiumCap[CL.clubId])S.clubStadiumCap[CL.clubId]={capacity:STAND_START,builtThisSeason:0};
  const st=S.clubStadiumCap[CL.clubId]; const cap=st.capacity||STAND_START; const cost=standCost();
  if(cap+STAND_SEATS>stadiumMaxCapacity()) return _recusa('⚠ Estádio no teto para o porte do clube — cresça o clube (título/elenco) pra poder ampliar mais.');
  if(((st.builtThisSeason||0)+STAND_SEATS)>SEASON_BUILD_LIMIT) return _recusa('⚠ Obra é lenta: só '+grp(SEASON_BUILD_LIMIT)+' lugares por temporada. Continue na próxima.');
  if((S.budget||0)<cost){ if(!silencioso) toastC('Caixa insuficiente para construir ('+fmt(cost)+').'); return false; }
  S.budget-=cost; commitBudget();                      // publica: senão o custo da obra é revertido na próxima rodada
  st.capacity+=STAND_SEATS; st.builtThisSeason=(st.builtThisSeason||0)+STAND_SEATS;
  commitStadium();                                      // publica: senão a bancada some na próxima rodada (Resenha)
  pushFinanceEntry({stadium:cost, log:[`🏟️ Bancada construída: +${grp(STAND_SEATS)} lugares (${fmt(cost)})`]});
  saveV3(); if(!silencioso) renderStadium(true); return true; }

/* ---- Jogador > Vender (painel na aba + leilão) ---- */
function windowClosedMsg(){ const st=transferWindowStatus();
  return st.opensIn!=null ? `⛔ Janela de transferências fechada. Abre em ${st.opensIn} rodada${st.opensIn===1?'':'s'}.` : '⛔ Janela de transferências fechada — não há mais janelas nesta temporada.'; }
/* CHIP DA JANELA: mesma pintura do "Compartilhar" (cl-chip), ao lado dele na mesma linha.
   O texto diz só o que importa — quantas rodadas faltam pra virar — em vez de repetir o estado
   e o prazo ("Janela aberta (fecha em 9)"); o cadeado aberto/fechado já dá o estado. */
/* ===== COMPARTILHAR =====
   O botão virou só o ícone, ao lado do nome do treinador, e abre um menu com os quatro destinos.
   O QUE DÁ PRA FAZER DE VERDADE numa página web: quando o aparelho tem compartilhamento nativo
   com arquivo (navigator.share + files — praticamente todo celular hoje), a imagem e o texto vão
   direto pra bandeja do sistema e o usuário toca no app escolhido; é assim que Instagram e TikTok
   recebem a imagem, porque nenhum dos dois aceita publicação por URL. Sem esse suporte (desktop),
   a imagem é baixada e, quando o destino tem compositor web (X e WhatsApp), ele abre já com a
   mensagem pronta pro usuário anexar a imagem. */
const SHARE_ALVOS=[
  {id:'whatsapp', nome:'WhatsApp', ico:'💬'},
  {id:'instagram',nome:'Instagram',ico:'📷'},
  {id:'tiktok',   nome:'TikTok',   ico:'🎵'},
  {id:'x',        nome:'X',        ico:'𝕏'},
];
function shareMenuHTML(){
  if(!CL.shareOpen) return '';
  return `<div class="cl-share-menu" onclick="event.stopPropagation()">
    <div class="cl-share-menu-h">Compartilhar em</div>
    ${SHARE_ALVOS.map(a=>`<button class="cl-share-opt" onclick="clShareTo('${a.id}')"><span>${a.ico}</span>${escC(a.nome)}</button>`).join('')}
  </div>`;
}
function clShareMenu(e){ if(e)e.stopPropagation(); CL.shareOpen=!CL.shareOpen; cdraw(); }
/* mensagem padrão: clube, divisão, posição e o convite — o mesmo texto em todos os destinos */
function shareMessage(){
  const c=(typeof clubOf==='function')&&clubOf(CL.clubId);
  const pos=(typeof tablePos==='function')?tablePos(CL.clubId):null;
  const div=(typeof divisionLabel==='function')?divisionLabel():'';
  const partes=[];
  partes.push(`Tô comandando o ${(c&&c.short)||'meu time'} no RetroFoot98`);
  if(div) partes.push(`na ${div}`);
  if(pos) partes.push(`— ${pos}º lugar`);
  return partes.join(' ')+'. Monta o seu e joga comigo: https://retrofoot98.com.br';
}
async function clShareTo(alvo){
  CL.shareOpen=false; cdraw();
  const texto=shareMessage();
  try{
    toastC('Gerando imagem...');
    const blob=await buildShareBlob();
    const file=new File([blob],'retrofoot98.png',{type:'image/png'});
    // caminho bom (celular): bandeja nativa com a imagem — é o único jeito de Instagram/TikTok
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], text:texto, title:'RetroFoot98'});
      return;
    }
    // sem compartilhamento nativo: baixa a imagem e abre o compositor de quem tem
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='retrofoot98.png'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 20000);
    if(alvo==='x'){ window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(texto),'_blank','noopener'); toastC('Imagem baixada — anexe no post.'); }
    else if(alvo==='whatsapp'){ window.open('https://wa.me/?text='+encodeURIComponent(texto),'_blank','noopener'); toastC('Imagem baixada — anexe na conversa.'); }
    else toastC('Imagem baixada — publique no '+(SHARE_ALVOS.find(x=>x.id===alvo)||{}).nome+'.');
  }catch(e){
    if(e && e.name==='AbortError') return;             // o usuário fechou a bandeja: não é erro
    console.warn('compartilhar:', e); toastC('⚠ '+((e&&e.message)||'erro ao gerar imagem'));
  }
}
function windowBadge(){ const st=transferWindowStatus();
  if(st.open) return `<span class="cl-chip cl-winbadge open" title="Janela de transferências aberta">🔓 Janela fecha em ${st.closesIn}</span>`;
  return `<span class="cl-chip cl-winbadge closed" title="Janela de transferências fechada">🔒 ${st.opensIn!=null?'Janela abre em '+st.opensIn:'Janela fechada'}</span>`; }
/* atualiza o preço de venda pedido SEM re-renderizar a tela inteira (cdraw() recriava o
   <input>, derrubando o foco a cada tecla — tinha que clicar de novo pra continuar digitando).
   Só mexe no texto/valor dos elementos afetados, mantendo o cursor no lugar. */
function clSellPriceInput(input){
  const typed=clMoneyInputReformat(input);                       // valor na moeda exibida (já reformatado, cursor preservado)
  CL.sellPrice=String(curParse(typed));                          // guarda sempre em R$ interno
  const p=squad(CL.clubId).find(x=>x.pid===CL.selPlayer); if(!p) return;
  const askingPrice=CL.sellPrice?parseInt(CL.sellPrice):0;       // R$
  const mv=p.mv||0;
  const diff=askingPrice-mv;
  const diffPct=mv>0?Math.round((diff/mv)*100):0;
  const diffLabel=diff>0?`+${moneyDisp(diff)} (+${diffPct}%)`:diff<0?`${moneyDisp(diff)} (${diffPct}%)`:'Preço igual';
  const askedEl=$c('#cl-sellprice-asked'); if(askedEl) askedEl.textContent=askingPrice>0?moneyDisp(askingPrice):'-';
  const diffEl=$c('#cl-sellprice-diff'); if(diffEl) diffEl.textContent=diffLabel;
  const warnEl=$c('#cl-sellprice-warn'); if(warnEl) warnEl.style.display=(askingPrice>0 && askingPrice<sellMinPrice(mv))?'block':'none';
}
/* Jogador > Subir jogador da base (item 5): 1 por janela de transferências (2 por temporada, uma em
   cada janela). Mostra 3 candidatos ao mesmo tempo (gerados na posição mais carente do elenco).
   Como as 3 opções já aparecem juntas, não tem "escolher outro" — seria um reroll de graça. O
   lote fica FIXO (guardado em S._youthCandidates/_youthCandidatesRound) até a rodada avançar de
   verdade; se o usuário fechar sem promover, reabrir o menu mostra o MESMO lote nesta rodada e só
   sorteia um novo na próxima. Nada é adicionado ao elenco até "Promover". */
function clPromoteYouth(){ CL.menu=null;
  if(typeof youthAvailable!=='function' || !youthAvailable()){
    toastC(typeof youthUnavailableMsg==='function'?youthUnavailableMsg():'Indisponível agora.');
    return;
  }
  const temLoteDaRodada = S._youthCandidates && S._youthCandidates.length && S._youthCandidatesRound===S.round;
  if(!temLoteDaRodada) rollYouthCandidatesForRound();
  renderYouthPromoteModal();
}
function renderYouthPromoteModal(){
  const cands=S._youthCandidates||[];
  // card em 3 faixas (cabeçalho / estatísticas / botão): com grid-template-rows o botão encosta
  // na base dos três cards mesmo quando um nome ocupa duas linhas — antes desalinhava.
  const card=(c,i)=>{ const y=c.youth;
    return `<div class="cl-youth-card">
      <div class="cl-youth-card-hd"><div class="cl-youth-name">${escC(y.n)}</div><div class="cl-youth-pos">${escC(c.posNome)}</div></div>
      <div class="cl-youth-stats">
        <span>Idade</span><b>${y.age} anos</b>
        <span>Força</span><b>${y.f}</b>
        <span>Comportamento</span><b>${escC(playerBehaviorLabel(y))}</b>
        <span>Salário</span><b class="mono">${fmt(c.contract.salary)}/sem</b>
      </div>
      ${btn('Promover','clConfirmYouth('+i+')',{icon:'✔',cls:'cl-btn-ok'})}
    </div>`;
  };
  overlayC(dlg('Categoria de base', `
    <div class="cl-youth-note">Você só pode subir 1 jogador da base por janela de transferências. Se fechar sem promover, estas mesmas opções continuam valendo até a próxima rodada.</div>
    <div class="cl-youth-grid">${cands.map(card).join('')}</div>
  `,{std:true, footer:btn('Fechar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}));
}
function clConfirmYouth(i){
  const cands=S._youthCandidates||[]; const c=cands[i]; if(!c) return;
  confirmYouthPromotion(c);
  clCloseOverlay();
  toastC(`🌱 ${c.youth.n} promovido para o elenco!`);
  cdraw();
}
function clSell(){ CL.menu=null;
  if(!canNegotiate()){ toastC(windowClosedMsg()); return; }
  const p=squad(CL.clubId).find(x=>x.pid===CL.selPlayer);
  if(!p){ toastC('Selecciona um jogador na lista primeiro.'); cdraw(); return; }
  CL.tab='jogador'; CL.rightMode='vender'; CL.sellPrice=''; cdraw(); }
function clSellConfirm(){
  if(!canNegotiate()){ toastC(windowClosedMsg()); CL.rightMode=null; cdraw(); return; }
  const p=squad(CL.clubId).find(x=>x.pid===CL.selPlayer); if(!p){ CL.rightMode=null; cdraw(); return; }
  if(typeof isTradeLocked==='function' && isTradeLocked(p)){ toastC(`${p.n} foi comprado nesta temporada e ainda não pode ser vendido.`); CL.rightMode=null; cdraw(); return; }
  // piso de elenco (goleiro): última barreira — a tela já avisa, mas a venda instantânea era o
  // caminho mais curto pra deixar o time sem goleiro nenhum e travar o botão Jogar.
  if(typeof canReleaseFromSquad==='function'){ const fl=canReleaseFromSquad(CL.clubId,p);
    if(!fl.ok){ toastC(fl.msg); CL.rightMode=null; cdraw(); return; } }
  const seed=(hashC(p.n)+ (S.round||0)*7)>>>0; const rnd=rngFrom(seed);
  // exclui clubes de OUTROS humanos do sorteio de comprador — "Vender" é uma venda instantânea ao
  // mercado (CPU), sem consentimento; sem este filtro, o sorteio podia "empurrar" seu jogador pro
  // elenco de outro treinador humano sem ele nunca ter feito proposta nenhuma. Pra vender pra um
  // humano de verdade, o comprador manda uma proposta (ver sendHumanOffer) que você aceita/recusa.
  const buyers=DATA.clubs.filter(c=>c.id!==CL.clubId && !(CL.online && CL.humans && CL.humans[c.id]));
  const buyer=buyers[Math.floor(rnd()*buyers.length)];
  const base=Math.round(p.mv/1000); const ask=Math.round((parseInt(CL.sellPrice,10)||0)/1000); // sellPrice em reais -> milhares
  /* VENDER DEIXOU DE SER CASTIGO. A faixa era 0,7-1,4x do valor de mercado e,
     pior, pedir acima de 1,2x da proposta cortava-a para 0,85x: quem escrevia o
     preco que queria recebia MENOS do que quem nao escrevia nada. Agora a faixa
     e 0,85-1,55x, o pedido e coberto ate 1,35x, e pedir acima disso custa 8% em
     vez de 15% -- continua a haver limite, mas pedir o justo passa a compensar. */
  let feeK=Math.max(1,Math.round(base*(0.85+rnd()*0.7)));          // proposta do mercado em milhares
  if(ask>0 && ask<=feeK*1.35) feeK=Math.max(ask,feeK); else if(ask>feeK*1.35) feeK=Math.round(feeK*0.92);
  const fee=feeK*1000;
  const preOpen=inPreWindow();
  if(!inTransferWindow() && preOpen){
    // PRÉ-ACORDO: fecha o negócio, mas o jogador só sai na abertura da janela (segue jogando até lá)
    p._pendingSale=true;
    S.pendingTransfers=S.pendingTransfers||[];
    S.pendingTransfers.push({ kind:'sell', sellerId:CL.clubId, playerName:p.n, buyerId:buyer.id, buyerName:clubOf(buyer.id).short, buyerCountry:null, fee, executeRound:preOpen });
    S.roundNews=S.roundNews||[]; S.roundNews.push(`🤝 Acordo fechado: ${p.n} vai pro ${clubOf(buyer.id).short} na abertura da janela (rodada ${preOpen+1}) por ${fmt(fee)}.`);
    saveV3(); CL.rightMode=null;
    resultDialog('🤝 Acordo fechado', `${p.n} vai pro ${clubOf(buyer.id).short} por ${fmt(fee)}, com a mudança de clube na abertura da janela (rodada ${preOpen+1}). Ele segue jogando por você até lá.`);
    return;
  }
  S.budget=(S.budget||0)+fee; S.squads[CL.clubId]=S.squads[CL.clubId].filter(x=>x.n!==p.n);
  if(S.xi) S.xi=S.xi.filter(x=>x!==p.pid);
  commitBudget();                                              // publica o caixa: senão o crédito é revertido no adopt do servidor
  // AVISA O SERVIDOR (saída do mundo): sem isto, o servidor não sabe da venda e RETRAZ o jogador ao
  // adotar a rodada (o time volta ao estado do shared_state). Era o bug do "vendido volta pro elenco".
  if(typeof recordNetTransfer==='function') recordNetTransfer(CL.clubId, null, p.n, null, fee, p.pid);
  pushFinanceEntry({playerSales:fee, log:[`💰 ${p.n} vendido ao ${clubOf(buyer.id).short} por ${fmt(fee)}.`]});
  S.roundNews=S.roundNews||[]; S.roundNews.push(`💰 ${p.n} vendido ao ${clubOf(buyer.id).short} por ${fmt(fee)}.`);
  saveV3(); auctionDialog(p,buyer,feeK); }
/* A TELA DE VENDA PASSOU PARA A PELE NOVA (ver 'mkt-vendido' em rf26-acoes.js). Era a ultima
   do Mercado que ainda abria em overlay legado — fundo amarelo, cabecalho preto — e mostrava
   dados que o motor nao produz (a nacionalidade vinha escrita "Brasil" para todo jogador).
   O jogador ja saiu do elenco aqui, por isso os dados dele viajam no objeto do dialogo. */
function auctionDialog(p,buyer,feeK){
  const sq=squad(CL.clubId);
  const sub=sq.filter(x=>x.s===p.s).sort((a,b)=>(b.f||0)-(a.f||0))[0];
  const dados={ player:p.n, buyer:(clubOf(buyer.id)||buyer).short||'', fee:feeK*1000,
    salario:(p.contract&&p.contract.salary)||0,
    vm:(typeof computeVM==='function')?computeVM(p):(p.mv||0),
    sub:sub?(sub.n+' (força '+sub.f+')'):'' };
  if(typeof rfAcAbrir==='function'){ rfAcAbrir('mkt-vendido', dados); return; }
  toastC('Jogador vendido.'); cdraw();
}
function clCloseAuction(){ clCloseOverlay(); CL.rightMode=null; CL.selPlayer=squad(CL.clubId)[0]?.pid||null; cdraw(); toastC('Jogador vendido.'); }

/* ---- Jogador (aba) > Renovar contrato (painel) ---- */
function clRenew(){ const p=squad(CL.clubId).find(x=>x.pid===CL.selPlayer); if(!p){ toastC('Selecciona um jogador.'); return; }
  CL.tab='jogador'; CL.rightMode='renovar'; CL.newSalary=Math.round(p.mv*0.0006); cdraw(); }
function clSalaryStep(d){ const p=squad(CL.clubId).find(x=>x.pid===CL.selPlayer); const base=Math.round((p?p.mv:1e6)*0.0006);
  CL.newSalary=Math.max(Math.round(base*0.4), (CL.newSalary||base)+d*Math.max(100,Math.round(base*0.1))); const n=document.querySelector('#cl-sal'); if(n)n.textContent=grp(CL.newSalary); }
function clRenewPropose(){
  const p=squad(CL.clubId).find(x=>x.pid===CL.selPlayer);
  if(!p) return;

  const oldSalary = (p.contract && p.contract.salary) || 0;
  const newYears = 3;
  const weeksPerYear = S.sched.length||38; // idem renewPanel() — 38 rodadas reais, não 52 semanas fixas
  const totalCost = CL.newSalary * newYears * weeksPerYear;
  const oldAnnualCost = oldSalary * weeksPerYear;
  const extraCost = totalCost - (oldAnnualCost * newYears);

  // validar se há orçamento suficiente para a renovação
  if(S.budget < 0 && extraCost > 0){
    toastC('⚠️ Caixa insuficiente para renovar este contrato.');
    return;
  }

  // atualizar contrato
  p.contract = Object.assign({}, p.contract, {salary: CL.newSalary, years: newYears});
  p.moral = Math.min(100, (p.moral||70) + 6);

  // registrar na notícia de rodada
  S.roundNews = S.roundNews || [];
  S.roundNews.push(`✍️ ${p.n} renovou contrato: ${fmt(CL.newSalary)}/sem por ${newYears} ano(s).`);

  saveV3();
  CL.rightMode = null;
  cdraw();
  toastC('✓ Contrato renovado com sucesso.');
}
function clCancelRight(){ CL.rightMode=null; cdraw(); }

/* ---- Campeonato > Melhores marcadores ---- */
/* acha o clube de um jogador só pelo nome — útil em telas que só guardam o nome (artilheiros, notícias) */
function findPlayerClub(name){
  for(const cid of Object.keys(S.squads||{})){ if(S.squads[cid].some(p=>p.n===name)) return cid; }
  return null;
}
function clScorers(){ CL.menu=null;
  const arr=Object.entries(S.scorers||{}).map(([n,g])=>({n,g})).sort((a,b)=>b.g-a.g).slice(0,20);
  const rows=arr.length?arr.map((s,i)=>{ const cid=findPlayerClub(s.n);
    return `<div class="cl-cal-row"><span class="cl-cal-n">${i+1}</span><span class="cl-cal-t">${playerLink(s.n,cid)}${cid?' <small style="color:#666">('+escC(clubOf(cid).short)+')</small>':''}</span><span class="cl-cal-cf">${s.g}</span></div>`;
  }).join(''):'<div style="padding:14px">Sem gols marcados ainda.</div>';
  overlayC(dlg('Melhores marcadores', `<div class="cl-cal">${rows}</div><div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{ad:'modal-marcadores-728x90',w:520,bodyClass:'cl-body-gray',min:true})); }

/* ---- Campeonato > Últimos vencedores: histórico persistido por save (S.history), com o
   campeão da liga (por divisão) e das copas (Copa do Brasil/Libertadores/Sul-Americana).
   Um bloco por temporada (fieldset/legend, no estilo clássico das listas) — cada competição
   numa linha própria com nome à esquerda e campeão à direita, em vez do texto corrido de
   antes, pra ficar fácil de escanear com muitas temporadas acumuladas. ---- */
function clUltimosVencedores(){ CL.menu=null;
  const hist=(S.history||[]).slice().reverse().slice(0,15);
  const winnerRow=(label,trophy,winner)=> winner ? `<div class="cl-winrow">
      <span class="cl-winrow-lbl">${trophy?trophyImg(trophy,16)+' ':''}${escC(label)}</span>
      <span class="cl-winrow-val">${escC(winner)}</span>
    </div>` : '';
  const blocks=hist.length?hist.map(h=>{
    const rows=[winnerRow(classifDivName(h.division||'A', h.country), 'serie'+(h.division||'A'), h.champ)]
      .concat(allCupKeys().map(k=>winnerRow(COMP_DEFS[k].short, k, h.cups&&h.cups[k])))
      .filter(Boolean).join('');
    return `<fieldset class="cl-cup-round"><legend>${h.season}</legend>${rows}</fieldset>`;
  }).join(''):'<div class="cl-cup-hint">Ainda não há temporadas concluídas neste save.</div>';
  overlayC(dlg('Últimos vencedores', `<div class="cl-cup-groups-wrap">${blocks}</div><div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{ad:'modal-vencedores-728x90',w:560,bodyClass:'cl-body-gray',min:true})); }

/* ---- Campeonato > Melhores marcadores de sempre: acumulado histórico (S.allTimeScorers,
   gravado a cada fim de temporada) + gols da temporada em andamento, persistido no save. ---- */
function clScorersAllTime(){ CL.menu=null;
  const acc={...(S.allTimeScorers||{})};
  Object.entries(S.scorers||{}).forEach(([n,g])=>{ acc[n]=(acc[n]||0)+g; });
  const arr=Object.entries(acc).map(([n,g])=>({n,g})).sort((a,b)=>b.g-a.g).slice(0,20);
  const rows=arr.length?arr.map((s,i)=>{ const cid=findPlayerClub(s.n);
    return `<div class="cl-cal-row"><span class="cl-cal-n">${i+1}</span><span class="cl-cal-t">${playerLink(s.n,cid)}${cid?' <small style="color:#666">('+escC(clubOf(cid).short)+')</small>':''}</span><span class="cl-cal-cf">${s.g}</span></div>`;
  }).join(''):'<div style="padding:14px">Sem gols marcados ainda.</div>';
  overlayC(dlg('Melhores marcadores de sempre', `<div class="cl-cal">${rows}</div><div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,{ad:'modal-marcadores-sempre-728x90',w:520,bodyClass:'cl-body-gray',min:true})); }

/* ---- Campeonatos > Ligas internacionais: visualizador das ligas de background por país
   (tabela, artilheiros, artilheiros de sempre, campeões). Só leitura — cada liga roda sozinha. */
function bgDivLabel(country,divKey){ const cfg=(typeof UNI_CONFIGS!=='undefined')&&UNI_CONFIGS[country]; return (cfg&&cfg.label&&cfg.label[divKey])||divKey; }
function clBgLeaguesMenu(){ CL.menu=null;
  if(!S.bgLeagues || !Object.keys(S.bgLeagues).length){ toastC('Nenhuma liga internacional neste save.'); return; }
  const countries=Object.keys(S.bgLeagues);
  CL.bgView=CL.bgView||{};
  if(!CL.bgView.country || countries.indexOf(CL.bgView.country)<0) CL.bgView.country=countries[0];
  CL.bgView.tab=CL.bgView.tab||'tabela';
  renderBgLeagues();
}
function renderBgLeagues(){
  const V=CL.bgView; const L=S.bgLeagues[V.country]; if(!L){ clCloseOverlay(); return; }
  const countries=Object.keys(S.bgLeagues);
  const divKeys=Object.keys(L.divs);
  if(!V.div || divKeys.indexOf(V.div)<0) V.div=divKeys[0];
  const ctryTabs=countries.map(c=>`<span class="cl-otab ${c===V.country?'on':''}" onclick="CL.bgView.country='${c}';CL.bgView.div=null;renderBgLeagues()">${flagImg(c)} ${escC(c)}</span>`).join('');
  const divTabs=divKeys.length>1?('<div class="cl-otabs">'+divKeys.map(d=>`<span class="cl-otab ${d===V.div?'on':''}" onclick="CL.bgView.div='${d}';renderBgLeagues()">${escC(bgDivLabel(V.country,d))}</span>`).join('')+'</div>'):'';
  const contentTabs=[['tabela','Tabela'],['artilheiros','Artilheiros'],['sempre','De sempre'],['transferencias','Transferências'],['historico','Campeões']].map(a=>`<span class="cl-otab ${V.tab===a[0]?'on':''}" onclick="CL.bgView.tab='${a[0]}';renderBgLeagues()">${a[1]}</span>`).join('');
  let body='';
  if(V.tab==='tabela'){
    body=bgStandings(V.country,V.div).map((t,i)=>{const c=bgClubById(t.id);return `<div class="cl-cal-row"><span class="cl-cal-n">${i+1}</span><span class="cl-cal-t">${escC(c?c.short:t.id)} <small style="color:#888">${t.P}j ${t.W}-${t.D}-${t.L}</small></span><span class="cl-cal-cf">${t.Pts}</span></div>`;}).join('');
  } else if(V.tab==='artilheiros'||V.tab==='sempre'){
    const src=V.tab==='sempre'?L.allTimeScorers:L.scorers;
    const list=Object.entries(src).sort((a,b)=>b[1]-a[1]).slice(0,25);
    body=list.length?list.map((x,i)=>`<div class="cl-cal-row"><span class="cl-cal-n">${i+1}</span><span class="cl-cal-t">${escC(x[0])}</span><span class="cl-cal-cf">${x[1]}</span></div>`).join(''):'<div style="padding:14px">Ainda sem gols nesta temporada.</div>';
  } else if(V.tab==='transferencias'){
    const log=L.transferLog||[];
    body=log.length?log.slice(0,30).map(t=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 12px;border-bottom:1px solid rgba(0,0,0,.12)">
      <span style="flex:1;min-width:0"><b>${escC(t.player)}</b><br><small style="color:#888">${escC(t.from)} → ${escC(t.to)}</small></span>
      <span style="white-space:nowrap;font-weight:700;font-size:12px">${fmt(t.fee)}</span></div>`).join(''):'<div style="padding:14px">Nenhuma transferência ainda (acontecem nas janelas de transferência).</div>';
  } else {
    body=(L.history||[]).length?L.history.slice().reverse().map(h=>`<div class="cl-cal-row"><span class="cl-cal-n">${h.season}</span><span class="cl-cal-t">🏆 ${escC(h.champ)}</span><span class="cl-cal-cf" style="font-size:11px">${escC(h.artilheiro)}</span></div>`).join(''):'<div style="padding:14px">Nenhuma temporada concluída ainda.</div>';
  }
  overlayC(dlg('Ligas internacionais', `
    <div class="cl-otabs" style="flex-wrap:wrap">${ctryTabs}</div>
    ${divTabs}
    <div class="cl-otabs">${contentTabs}</div>
    <div class="cl-cal">${body}</div>
    <div class="cl-cal-ok">${btn('Fechar','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,
    {ad:'modal-ligas-728x90',w:560,bodyClass:'cl-body-gray',min:true}));
}

/* ---- Jogador > Propostas recebidas: ofertas de compra pelos jogadores do usuário ---- */
/* Contrapropostas recebidas (eu comprador): aceitar manda uma proposta NOVA no valor pedido
   (acceptCounterOffer -> sendHumanOffer), que segue o caminho normal até o vendedor. */
function clCounterOffers(){ CL.menu=null;
  const list=(typeof myCounterOffers==='function')?myCounterOffers():[];
  const rows=list.length?list.map(c=>`<div style="padding:10px 12px;border-bottom:1px solid rgba(0,0,0,.12)">
      <div><b>${escC(c.playerName)}</b> <small style="color:#888">(força ${c.playerForce})</small></div>
      <div style="font-size:12px;color:#555;margin:4px 0">🧑 ${escC(c.sellerHumanName||'treinador')} (${escC(c.sellerName||'')}) recusou ${fmt(c.offeredFee)} e pede <b>${fmt(c.askFee)}</b>.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        ${btn('Aceitar e propor '+fmt(c.askFee),'clAcceptCounter('+c.id+')',{icon:'✔',cls:'cl-btn-ok cl-btn-mini'})}
        ${btn('Recusar','clRejectCounter('+c.id+')',{cls:'cl-btn-cancel cl-btn-mini'})}
      </div></div>`).join('')
    :'<div style="padding:16px;text-align:center;color:#888">Nenhuma contraproposta no momento.</div>';
  overlayC(dlg('Contrapropostas recebidas', `<div class="cl-mkt-squad">${rows}</div>
    <div class="cl-cal-ok">${btn('Fechar','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>`,
    {w:560,bodyClass:'cl-body-gray',min:true}));
}
function clAcceptCounter(id){ const r=acceptCounterOffer(id); toastC(r.msg); saveV3(); clCounterOffers(); cdraw(); }
function clRejectCounter(id){ const r=rejectCounterOffer(id); toastC(r.msg); saveV3(); clCounterOffers(); cdraw(); }
function clIncomingOffers(){ CL.menu=null;
  const offers=myIncomingOffers().filter(o=>o.expiresRound>S.round);
  const rows=offers.length?offers.map(o=>{
    const roundsLeft=Math.max(0,o.expiresRound-S.round);
    // propostas de HUMANO não têm resposta algorítmica da CPU (sem maxFee/state) — "negociar"
    // aqui é recusar sinalizando um valor (counterHumanOffer), não a contraproposta automática.
    // barra de ação numa LINHA SÓ: Aceitar · campo de valor (flex:1) · Contrapropor/Negociar ·
    // Recusar. Antes era flex-wrap e quebrava em duas linhas assim que o nome do botão crescia.
    const campo = `<span class="cl-money-field cl-off-field"><span class="cl-money-cur">${curSym()}</span><input class="cl-money-in" id="cl-ask-${o.id}" inputmode="numeric" placeholder="${o.buyerIsHuman?'eu toparia':'pedir mais'}" oninput="clMoneyInputReformat(this)"></span>`;
    const counterUI = o.buyerIsHuman
      ? campo+btn('Negociar','clCounterHumanOffer('+o.id+')',{cls:'cl-btn-mini'})
      : (o.state!=='final' ? campo+btn('Contrapropor','clCounterOffer('+o.id+')',{cls:'cl-btn-mini'}) : '');
    const fromLabel = o.buyerIsHuman ? `🧑 ${escC(o.buyerHumanName||'treinador humano')} (${escC(o.buyerName)})` : `${escC(o.buyerName)}${o.buyerCountry?' · '+escC(o.buyerCountry):''}`;
    return `<div class="cl-off">
      <div class="cl-off-hd">
        <div class="cl-off-id"><b>${escC(o.playerName)}</b> <small>(força ${o.playerForce})</small>
          <div class="cl-off-from">${fromLabel} · expira em ${roundsLeft} rodada(s)</div></div>
        <div class="cl-off-fee">${fmt(o.fee)}</div>
      </div>
      ${o.lastMsg?`<div class="cl-off-msg">💬 ${escC(o.lastMsg)}</div>`:''}
      <div class="cl-off-acts">
        ${btn('Aceitar','clAcceptOffer('+o.id+')',{icon:'✔',cls:'cl-btn-mini cl-btn-ok'})}${counterUI}${btn('Recusar','clRejectOffer('+o.id+')',{icon:'✖',cls:'cl-btn-mini cl-btn-cancel'})}
      </div></div>`;
  }).join(''):'<div class="cl-off-empty">Nenhuma proposta no momento.<br><small>Clubes fazem propostas pelos seus destaques enquanto a janela está aberta.</small></div>';
  // pré-acordos pendentes (entram em vigor na abertura da janela)
  const pend=(S.pendingTransfers||[]);
  const pendHtml=pend.length?`<div class="cl-off-pre"><div class="cl-off-pre-h">🤝 Pré-acordos (entram em vigor na abertura da janela)</div>`+
    pend.map(t=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid rgba(0,0,0,.1)">
      <span style="flex:1;min-width:0"><b>${escC(t.playerName)}</b><br><small style="color:#888">${t.kind==='buy'?'chega de '+escC(clubOf(t.sellerId)?clubOf(t.sellerId).short:'?'):'sai pro '+escC(t.buyerName)} · rodada ${t.executeRound+1}</small></span>
      <span style="white-space:nowrap;font-weight:700;font-size:12px">${t.kind==='buy'?'−':'+'}${fmt(t.fee)}</span></div>`).join('')+'</div>':'';
  overlayC(dlg('Propostas recebidas', `${pendHtml}<div class="cl-cal cl-off-list">${rows}</div>`,
    {std:true, footer:btn('Fechar','clCloseOverlay()',{icon:'✖',cls:'cl-btn-cancel'})}));
}
function clAcceptOffer(id){ const r=acceptIncomingOffer(id); toastC(r&&r.msg||''); if(r&&r.ok){ clCloseOverlay(); cdraw(); } else { clIncomingOffers(); } }
function clRejectOffer(id){ rejectIncomingOffer(id); clIncomingOffers(); }
function clCounterOffer(id){
  const el=$c('#cl-ask-'+id); const typed=el?(parseInt((el.value||'').replace(/\D/g,''))||0):0;
  if(typed<=0){ toastC('Digite quanto você quer pedir.'); return; }
  counterIncomingOffer(id, curParse(typed)); // valor digitado (moeda exibida) -> R$
  clIncomingOffers(); // re-renderiza já com a resposta do clube
}
function clCounterHumanOffer(id){
  const el=$c('#cl-ask-'+id); const typed=el?(parseInt((el.value||'').replace(/\D/g,''))||0):0;
  if(typed<=0){ toastC('Digite quanto você toparia.'); return; }
  const r=counterHumanOffer(id, curParse(typed));
  toastC(r.msg);
  if(r.ok) saveV3();
  clIncomingOffers();
}

/* ===== O MOMENTO 'CLASSIFICACAO' ABRE A TELA DA COMPETIÇÃO DO DIA =====
   Fecha o passo 1 no terceiro momento. A classificação de copa estava pendurada no FECHAMENTO da
   rodada — e o fechamento passou a esperar o ponteiro chegar ao dia de liga, então a tabela da
   Libertadores só apareceria depois da Sul-Americana e da Copa do Brasil, todas juntas no fim.
   Agora cada dia termina com a sua própria tabela, e ela abre para todos no mesmo instante: o
   momento só vira 'classificacao' quando o último assento terminou de jogar/assistir.
   A tabela da LIGA continua vindo do fechamento, e tem que ser assim — ela depende do mundo já
   resolvido pelo servidor (outras divisões, finanças, virada). */
function onlineMomentScreenTick(){
  if(!CL.online || typeof NET==='undefined' || !NET.room || typeof S==='undefined' || !S) return;
  const d=NET.room.day; if(!d || d.moment!=='classificacao' || d.comp==='liga') return;
  if(d.round!==(S.round||0)) return;
  if(CL.live || CL._liveBusy) return;
  const _vista=(typeof cupClassifWasShown==='function') && cupClassifWasShown(d.comp, S.round||0);
  /* TELA DE CLASSIFICAÇÃO JÁ CUMPRIDA E SEM CRONÔMETRO ARMADO = TELA MORTA. Não há mais nada para
     acontecer ali: a tabela já foi marcada como vista e nenhum relógio vai tirar o jogador dela.
     Ficar é travar a sala inteira, porque 'cupclassif' conta como ocupado. Esta rede existe porque
     esta classe de defeito já me pegou duas vezes — é barata e o custo de errar para o outro lado
     (sair de uma tela que ainda tinha o que mostrar) é zero, já que a marca de "vista" só é
     gravada na saída legítima. */
  if(CL.screen==='cupclassif' && _vista && !CL._cupFlowTimer){
    console.warn('classificação da '+d.comp+' já vista e sem cronômetro — voltando à tela do clube');
    CL.screen='main'; CL.tab='jogo'; cdraw(); return;
  }
  // não atravessa nenhuma tela que já é do fluxo (inclusive a própria)
  if(CL.screen==='cupclassif' || CL.screen==='cupdraw' || CL.screen==='classif'
     || CL.screen==='seatclassif' || CL.screen==='live') return;
  if(_vista) return;
  if(typeof roomDayNadaACumprir==='function' && roomDayNadaACumprir(d.comp)) return;  // nada aconteceu hoje
  if(typeof showCupClassif!=='function') return;
  showCupClassif(d.comp, S.round||0);
}
/* ===================== "ESPERANDO POR X" — A MESA DO ANFITRIÃO =====================
   O ponteiro só vira o dia quando o ÚLTIMO assento carimba. Isso é o que mantém todo mundo na
   mesma tela — e é também a única forma de a sala parar por causa de uma pessoa. Até aqui essa
   espera era invisível: quem terminou ficava olhando a tela do clube sem saber se o jogo tinha
   travado, por quem estava esperando, nem o que fazer. A saída existia só como rede de segurança
   automática (45s), que é o contrário do que a gente quer: uma decisão sem dono, tomada por um
   relógio, atropelando quem talvez só tenha ido buscar um café.
   Agora a espera tem NOME e tem DONO. Quem está esperando vê por quem; o anfitrião — o mesmo que
   já dá a largada (ver onlineHostRelease) — decide entre esperar mais ou seguir sem quem falta.
   "Começar sem eles" é uma liberação explícita no servidor (day_ack com segundos negativos), e
   vale inclusive para quem está com o jogo aberto e parado, que é o caso que nenhum teto de
   ausência resolvia. */
/* 25s: ler o elenco, trocar um titular e escolher a formação leva mais que 12s — com o limite
   curto, o painel aparecia no meio do trabalho normal do jogador e parecia cobrança. Espera de
   verdade é a que passa de meia dúzia de segundos DEPOIS de a pessoa não ter mais o que fazer. */
const WAIT_PANEL_AFTER_MS=25000;
const WAIT_PANEL_POLL_MS=3000;
function onlineWaitingTick(){
  if(!CL.online || typeof NET==='undefined' || !NET.room || !NET.room.day || !NET.dayStatus) return;
  const d=NET.room.day, chave=d.idx+':'+d.moment;
  if(CL._waitKey!==chave){ CL._waitKey=chave; CL._waitSince=Date.now(); CL._waitInfo=null;
    if(CL._waitOpen){ CL._waitOpen=false; CL._waitAssin=null; clCloseOverlay(); } }   // o dia andou: some sozinho
  if(Date.now()-(CL._waitSince||0) < WAIT_PANEL_AFTER_MS) return;
  /* E QUANDO QUEM ESTÁ SEGURANDO A SALA SOU EU? Até agora este painel só aparecia para quem já
     tinha feito a sua parte — ou seja, a única pessoa que podia destravar a sala era justamente a
     única que não recebia aviso nenhum. Ela ficava na tela do clube achando que o jogo tinha
     travado, e do outro lado a sala parada esperando por ela. Foi o relatado: "o convidado travou
     na tela do treinador e não avançou".
     Quem deve o carimbo vê o inverso: a sala está esperando por VOCÊ, e o que fazer. */
  if(CL._dayAckKey!==chave){
    if(CL.live || CL.screen==='live' || CL.screen==='cupdraw' || CL.screen==='classif'
       || CL.screen==='seatclassif' || CL.screen==='cupclassif') return;   // estou no meio da minha parte
    if(CL._waitMeShown!==chave){ CL._waitMeShown=chave; showResenhaWaitingMe(d); }
    return;
  }
  if(CL._waitSnoozeUntil && Date.now()<CL._waitSnoozeUntil) return;
  // nunca por cima de partida, cerimônia ou tela de decisão
  if(CL.live || CL.screen==='live' || CL.screen==='cupdraw' || CL.screen==='classif'
     || CL.screen==='seatclassif' || CL.screen==='cupclassif') return;
  /* QUEM FECHOU A ABA NÃO PODE CONGELAR A SALA. Agora que ninguém entra em campo antes de o
     último assento carimbar, um jogador que simplesmente sumiu pararia a sala para sempre — o
     cronômetro, que antes o pulava, não pula mais ninguém (e é isso que a gente quer).
     Passados 45s, o assento que não dá sinal de vida há 45s é dispensado e a sala segue. Quem
     está com o jogo aberto continua sendo esperado, com nome, no painel abaixo: presença é
     respeitada, ausência não trava.

     QUALQUER ASSENTO DISPARA ISTO, NÃO SÓ O ANFITRIÃO. Enquanto era `NET.isHost`, a saída da sala
     dependia de UM navegador estar aberto — e o anfitrião é tão capaz de fechar a aba quanto os
     outros. Quando era ele quem sumia, ninguém restante conseguia destravar: a sala esperava para
     sempre, que é exatamente o que esta rede existe para impedir.

     É seguro porque QUEM DECIDE É O SERVIDOR, não este cliente: a RPC `day_ack` com segundos
     POSITIVOS só desconta assentos cujo `last_seen` já passou do prazo, e quem está com o jogo
     aberto continua a contar. A liberação que dispensa gente PRESENTE é a de segundos negativos
     ("começar sem eles"), e essa a própria função restringe ao anfitrião, no banco
     (`v_host is not distinct from auth.uid()`) — a checagem no cliente é reforço, não a tranca.

     O intervalo entre tentativas é escalonado por assento (0 a ~6s a partir do id) para os três
     clientes não baterem na mesma linha no mesmo instante: a função tranca a sala com
     `for update`, e disparar em uníssono é fila garantida sem ganho nenhum. */
  const _meuOffset = (function(){
    const id=(typeof NET!=='undefined' && NET.uid) ? String(NET.uid) : '';
    let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))|0;
    return Math.abs(h)%6000;
  })();
  if(NET.dayAck && Date.now()-(CL._waitSince||0) > 45000
     && Date.now()-(CL._absentTryT||0) > 15000+_meuOffset){
    CL._absentTryT=Date.now();
    Promise.resolve(NET.dayAck(d.idx, d.moment, 45)).then(r=>{
      if(r && r.faltam===0) console.warn('assento sem sinal de vida há 45s dispensado — a sala segue');
    }).catch(()=>{});
  }
  if(Date.now()-(CL._waitPollT||0) < WAIT_PANEL_POLL_MS) return;
  CL._waitPollT=Date.now();
  Promise.resolve(NET.dayStatus()).then(st=>{
    if(!st || !st.faltam){ if(CL._waitOpen){ CL._waitOpen=false; clCloseOverlay(); } return; }
    /* SÓ REDESENHA SE MUDOU. A consulta roda a cada 3s enquanto a espera dura, e o painel era
       reconstruído a cada volta — o modal inteiro pisca na cara de quem está esperando, e um
       clique pode cair no vazio entre um desenho e o outro. Redesenhar só quando muda quem falta
       (ou quando o painel ainda não está aberto) deixa a tela parada, como ela deve ficar. */
    const assinatura=(st.faltam||0)+'|'+((st.nomes_faltando||[]).join(','))+'|'+st.idx+':'+st.momento;
    if(CL._waitOpen && CL._waitAssin===assinatura) return;
    CL._waitAssin=assinatura; CL._waitInfo=st; showResenhaWaiting(st);
  }).catch(()=>{});
}
/* O QUE CADA MOMENTO SIGNIFICA PARA QUEM ESTÁ LENDO. "escalando" não quer dizer nada para o
   jogador; "escolhendo o time" quer. */
const ESPERA_MOMENTO={ escalando:'escolhendo o time', jogando:'em campo', classificacao:'vendo a classificação' };
function showResenhaWaiting(st){
  const ehHost=(typeof NET!=='undefined' && NET.isHost);
  const corpo=(typeof rfSalaEsperaHTML==='function') ? rfSalaEsperaHTML(st) : '';
  const pe = `<span class="rf-esp-foot-nota">${ehHost?'Você é o anfitrião da sala.'
        :'Só o anfitrião pode seguir sem eles.'}</span><div class="rf-sp"></div>`
    + `<button type="button" class="rf-ov-cta" onclick="clWaitMore()">⏳ Aguardar</button>`
    + (ehHost?`<button type="button" class="rf-ov-b2" onclick="clWaitSkipAbsent()">⏭ Começar sem eles</button>`:'');
  CL._waitOpen=true;
  /* no telefone o título completo não cabe na barra e saía "Resenha — sala em es…" */
  const tit=(typeof isPhone==='function'&&isPhone())?'Sala em espera':'Resenha — sala em espera';
  /* 520 E A LARGURA PADRAO dos dialogos (.rf-dlg no CSS, e o w por omissao do
     rfAcao). Este estava a 560 — so ele e mais um —, entao entre as telas da
     Resenha o modal mudava de largura sem motivo. O glifo e o ponto do
     desenho, nao a ampulheta: a ampulheta repete-se no botao "Aguardar". */
  overlayC(dlg(tit, corpo, {w:520, glyph:'●', tone:'marca', footer:pe}));
}
/* O AVISO PARA QUEM ESTÁ SEGURANDO A SALA. Mesma linguagem visual do painel de espera, mensagem
   invertida — e com o botão que resolve, para o jogador não ter de adivinhar o que o jogo quer. */
function showResenhaWaitingMe(d){
  const ehLiga=(d.comp==='liga');
  const comp = ehLiga ? 'Brasileirão'
    : ((typeof COMP_DEFS!=='undefined' && COMP_DEFS[d.comp] && COMP_DEFS[d.comp].short) || 'Copa');
  const trof = (!ehLiga && typeof trophyImg==='function') ? trophyImg(d.comp,64) : '';
  // diz onde está o botão, já que o aviso não age no lugar do jogador
  const oQue = {
    escalando:'Escale o time e clique em Jogar — a rodada só começa com todos prontos.',
    jogando:'Clique em Jogar para entrar em campo: a rodada está acontecendo agora.',
    classificacao:'Feche a classificação para a sala seguir para o próximo dia.'
  }[d.moment] || 'Continue de onde você parou para a sala seguir.';

  const corpo=`
    <div class="cl-esp">
      <div class="cl-esp-top">
        <div>
          <div class="cl-mom-kicker">A SALA ESTÁ ESPERANDO</div>
          <div class="cl-mom-manchete">Por você</div>
          <div class="cl-esp-ctx">Rodada ${escC(String((d.round!=null?d.round:0)+1))} · ${escC(comp)}</div>
        </div>
        ${trof?`<div class="cl-esp-trofeu">${trof}</div>`:''}
      </div>
      <div class="cl-esp-quem">
        <span class="cl-esp-av">!</span>
        <span class="cl-esp-msg">${escC(oQue)}</span>
      </div>
      <div class="cl-esp-nota">Os outros treinadores estão parados no mesmo ponto, esperando por
        você. Ninguém avança sozinho.</div>
    </div>`;
  /* O AVISO NÃO AGE — ELE AVISA. Este modal tinha um botão que fazia a ação por você ("Estou
     pronto", "Entrar em campo"). Era um SEGUNDO lugar para a mesma coisa, e um lugar ruim: dava
     para ficar pronto por um atalho, sem sequer olhar o time, que é justamente o que a gente
     passou a semana tirando do jogo. A ação vive num lugar só — o botão da tela do clube. Aqui
     fica o aviso e o caminho: feche e faça. */
  const pe = btn('Entendi','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'});
  /* MESMO TOM E MESMA LARGURA DO IRMÃO (showResenhaWaiting, logo acima). Este modal ficou para
     trás em três coisas ao mesmo tempo, e por isso destoava do resto da Resenha:
       · sem `tone:'marca'`, o cabeçalho saía na cor do CLUBE. Num clube vermelho a tela da SALA
         ficava vermelha — e a sala não é de ninguém. É exatamente o caso que o tom de marca
         existe para atender (ver o comentário em dlg()).
       · `w:560` quando o padrão é 520, então o modal mudava de largura entre uma tela da Resenha
         e a seguinte. O irmão já tinha sido corrigido e o comentário de lá diz "só ele e mais
         um" — este era o mais um.
       · `std:true` era inerte (só decide a largura PADRÃO, e havia `w`), e `bodyClass` o dlg()
         não lê — quem lê essa opção é o cartão da Home (cl-home-pagebox-b, ~linha 1783). Outras
         chamadas de dlg() também a passam e também a perdem; não foram tocadas aqui porque é
         varredura à parte, não defeito deste modal. */
  overlayC(dlg('Resenha — a sala espera por você', corpo, {w:520, glyph:'●', tone:'marca', footer:pe}));
}
function clWaitMore(){ CL._waitSnoozeUntil=Date.now()+10000; CL._waitOpen=false; CL._waitAssin=null; clCloseOverlay(); }
function clWaitSkipAbsent(){
  const d=(typeof NET!=='undefined' && NET.room)?NET.room.day:null;
  CL._waitOpen=false; clCloseOverlay();
  if(!d || !NET.dayAck) return;
  // segundos NEGATIVOS = liberação explícita (ver a migração do day_ack): segue sem quem falta,
  // esteja ele ausente ou presente e parado. É uma decisão do anfitrião, não de um cronômetro.
  toastC('⏭ Seguindo sem quem faltava.');
  Promise.resolve(NET.dayAck(d.idx, d.moment, -1))
    .then(()=>{ if(NET.refreshDay) return NET.refreshDay(); })
    .catch(e=>console.warn('começar sem eles:', e && e.message));
}
/* ---- overlays / toasts ---- */
/* ===== MODAL OBRIGATORIO: A DECISAO NAO PODE SER DISPENSADA =====
   Todo modal do jogo tem tres saidas — o X no cabecalho, o clique fora e o Esc — e isso esta
   certo para 99% deles: modal que se pode fechar e modal que nao esta a pedir nada. A janela da
   demissao nao e desse tipo. Ela pergunta "qual e o seu proximo clube?" e, fechada sem resposta,
   deixava o treinador no clube que acabou de o despedir: o jogo seguia como se nada fosse.
   `obrigatorio` fecha as tres saidas de uma vez. Quem abre um modal assim TEM de dar um caminho
   de saida dentro do corpo — senao o jogo tranca. */
function overlayC(html, opts){ opts=opts||{};
  let o=$c('#c-overlay'); if(!o){ o=document.createElement('div'); o.id='c-overlay'; o.className='cl-overlay'; o.onclick=()=>{ if(!o.dataset.obrigatorio) clCloseOverlay(); }; document.body.appendChild(o); }
  if(opts.obrigatorio) o.dataset.obrigatorio='1'; else delete o.dataset.obrigatorio;
  o.innerHTML=`<div class="cl-overlay-in" onclick="event.stopPropagation()">${html}</div>`; o.style.display='flex'; }
function clCloseOverlay(){ const o=$c('#c-overlay'); if(o){ delete o.dataset.obrigatorio; o.style.display='none'; o.innerHTML=''; } }
/* Esc fecha o modal aberto — o terceiro caminho de fechamento do padrão de modais (os outros
   dois, ✕ na barra e clique fora, já existem). Alcance idêntico ao do clique fora: só o
   #c-overlay, que é sempre dispensável; o overlay de sincronização da rodada é outro elemento
   e não é atingido. */
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape') return;
  const o=$c('#c-overlay'); if(!o || o.style.display==='none' || !o.innerHTML) return;
  if(o.dataset.obrigatorio) return;                 // ver overlayC: decisao que nao se dispensa
  clCloseOverlay();
});
function resultDialog(score,verd){ overlayC(dlg('RetroFoot98', `<div class="cl-res"><div class="cl-res-score">${escC(score)}</div>
  <div class="cl-res-verd">${escC(verd)}</div><div class="cl-cal-ok">${btn('OK','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div></div>`,{w:520,bodyClass:'cl-body-green'})); }
/* ===== TOAST (rebranding 2026) — cinco tons, um glifo fixo por tom =====
   Escuro, filete de 4px à esquerda na cor do tom, UMA frase, some sozinho.
   Toast NUNCA pede decisão — decisão é Dialog (ver a regra "página ou popup").

   A assinatura antiga toastC('texto') continua valendo nos 200+ lugares que já
   chamam assim: quando o tom não é informado, ele é DEDUZIDO da própria frase,
   porque o jogo já escrevia o glifo no texto ("⚠ ...", "✓ ...") e já usava
   reticências pra processo em curso ("Conectando…"). Assim a migração não exige
   tocar em cada chamada, e o glifo duplicado é removido do texto — quem escreveu
   "⚠ Caixa insuficiente" vira tom `warn` com o ⚠ vindo do componente, não do texto.

   opts: {action, onAction, ms} — ação à direita existe só no tom `info`. */
const TOAST_TONES={
  info:    {glyph:''},
  success: {glyph:'✓'},
  warn:    {glyph:'⚠'},
  danger:  {glyph:'✖'},
  progress:{glyph:''}
};
function toastTone(msg){
  const m=String(msg||'');
  if(/^\s*[⚠️]/.test(m)) return 'warn';
  if(/^\s*[✖✕❌]/.test(m)) return 'danger';
  if(/^\s*[✓✔]/.test(m)) return 'success';
  /* Antes o tom `progress` era deduzido de reticências no fim da frase
     ("Conectando…"). As reticências saíram da interface inteira, então o tom
     agora vem EXPLÍCITO na chamada: toastC('Carregando jogo','progress'). O
     teste continua aqui só para não quebrar chamada antiga que ainda escreva
     assim — mas nada novo deve depender dele. */
  if(/(…|\.\.\.)\s*$/.test(m)) return 'progress';
  return 'info';
}
function toastC(msg, tone, opts){
  opts=opts||{};
  let txt=String(msg==null?'':msg);
  tone=tone||toastTone(txt);
  // tira o glifo do TEXTO — quem desenha o glifo agora é o componente
  txt=txt.replace(/^\s*[⚠️✖✕❌✓✔]\uFE0F?\s*/,'');
  const t=$c('#c-toast')||(()=>{ const n=document.createElement('div'); n.id='c-toast'; document.body.appendChild(n); return n; })();
  const cfg=TOAST_TONES[tone]||TOAST_TONES.info;
  const glyph=(opts.glyph!==undefined)?opts.glyph:cfg.glyph;
  const d=document.createElement('div');
  d.className='rf-toast rf-toast-'+tone;
  d.innerHTML=`${glyph?`<span class="rf-toast-ico">${escC(glyph)}</span>`:''}<span class="rf-toast-t"></span>${opts.action?`<span class="rf-toast-act">${escC(opts.action)}</span>`:''}`;
  d.querySelector('.rf-toast-t').textContent=txt;   // textContent: a frase nunca é HTML
  if(opts.action&&opts.onAction){ d.querySelector('.rf-toast-act').onclick=()=>{ opts.onAction(); toastFecha(d); }; }
  t.appendChild(d);
  setTimeout(()=>toastFecha(d), opts.ms||2600);
}
/* O toast some com animação de saída (rf-toast-sai, 280ms) em vez de sumir de
   uma vez: a remoção do nó só acontece quando a animação termina. O `dataset`
   é a trava — sem ela, o clique na ação e o temporizador disparariam a saída
   duas vezes e a segunda reiniciaria a animação já no fim. */
const TOAST_SAI_MS=280;
function toastFecha(d){
  if(!d||!d.parentNode||d.dataset.saindo) return;
  d.dataset.saindo='1';
  d.classList.add('rf-toast-saindo');
  setTimeout(()=>d.remove(), TOAST_SAI_MS);
}

/* fechar dropdown ao clicar fora */
document.addEventListener('click',()=>{
  // o dropdown do time de coração vive no overlay do modal, que se redesenha
  // sozinho — fechar com cdraw() aqui apagaria o modal inteiro
  if(CL.waitlistClubeOpen){ CL.waitlistClubeOpen=false; rfWaitlistDraw(); return; }
  if(CL.shareOpen){ CL.shareOpen=false; cdraw(); return; }
  if(CL.mobMenuOpen && isPhone()){ closeMobMenu(); return; }   // gaveta sai deslizando, não some
  if(CL.menu||CL.mobMenuOpen){ CL.menu=null; CL.mobMenuOpen=false; cdraw(); }
});
/* o palco do chaveamento é escalado por JS (proporção fixa): reescala ao girar/redimensionar,
   senão a chave ficaria cortada ou pequena demais depois de mudar o tamanho da janela. */
window.addEventListener('resize',()=>{ if(CL.screen==='cupclassif'||CL.screen==='cupview'||CL.screen==='cupdraw') cupFitStage(); });
/* ---- atalhos de teclado pra tática rápida (formação), sem precisar abrir o menu
   Seleccionar. F1-F6 igual ao clássico — mas o navegador intercepta F1 (Ajuda) e
   às vezes F5 (recarregar) ANTES do JavaScript da página receber o evento, então
   nenhum preventDefault resolve isso. Por isso as teclas 1-6 funcionam igual, sem
   esse problema — é o atalho confiável de verdade; F1-F6 continua valendo de bônus
   nos navegadores onde não é bloqueado. ---- */
const FKEY_INV = Object.fromEntries(Object.entries(FKEY).map(([f,k])=>[k,f]));
/* atalho SÓ com F1-F6 (nunca dígito puro 1-6) — dígito puro conflitava com o
   preenchimento do valor de venda do jogador (campo "Vender" na tela do time),
   onde digitar 1-6 pra compor o preço trocava a tática sem querer. */
function tacticShortcutsActive(){
  // só faz sentido trocar tática na tela principal, fora de partida ao vivo e sem menu aberto
  return CL.screen==='main' && !CL.live && !CL.menu;
}
function handleTacticShortcut(key){
  const f=FKEY_INV[key];
  if(!f || !tacticShortcutsActive()) return false;
  clSelFormation(f);
  return true;
}
document.addEventListener('keydown', (e)=>{
  const tag=(e.target&&e.target.tagName)||'';
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return; // não atrapalha quem tá digitando
  // Esc fecha o Modo Camarote e devolve a visão de tabela (todos os jogos da rodada)
  if(e.key==='Escape' && CL.screen==='live' && camOn() && camMatch()){ camToggle(); e.preventDefault(); return; }
  /* ESC FECHA O QUE ESTIVER ABERTO — a mesma saida do X (ver rfOvFecharPadrao):
     dialogo de acao, ou a sobreposicao de partida aplicando a decisao mais
     conservadora, para a partida nunca ficar em pausa sem dono. */
  if(e.key==='Escape'){
    if(CL.acao && typeof rfAcFechar==='function'){ rfAcFechar(); e.preventDefault(); return; }
    const RL=CL.live;
    if(RL && (RL.injEvent||RL.redEvent||RL.penEvent||RL.pensPicking) && typeof rfOvFecharPadrao==='function'){
      rfOvFecharPadrao(); e.preventDefault(); return;
    }
  }
  if(FKEY_INV[e.key] && handleTacticShortcut(e.key)) e.preventDefault(); // evita F1=ajuda do navegador, F5=recarregar, etc.
});


/* ===================================================================
   SELETOR DE PATCH DE DADOS (anfitrião)
   -------------------------------------------------------------------
   Um patch é um conjunto de correções de catálogo (clubes, elencos, escudos)
   publicado no painel dos sócios. O "Patch Original RetroFoot 2026" entra
   sozinho em todo jogo novo; os demais são escolhidos por quem CRIA o jogo.

   Por que só na criação: mpBuildInitialState() materializa os elencos DENTRO
   do save/da sala, e o servidor resolve as rodadas em cima desse estado. Basta
   o catálogo estar corrigido na hora de criar — quem entra na sala depois
   recebe o elenco pronto e não precisa ter o patch. Quem entra numa sala com
   patch aplica só para VER os mesmos nomes e escudos do anfitrião
   (ver netJoinRoom).
   =================================================================== */
let PATCHES_CACHE = null;
async function patchesDisponiveis(){
  if(PATCHES_CACHE) return PATCHES_CACHE;
  if(!window.RF_PACKS) return [];
  let token = null;
  try{ token = (typeof NET!=='undefined' && NET.accessToken) ? await NET.accessToken() : null; }catch(e){}
  try{ PATCHES_CACHE = await RF_PACKS.meusPacotes(token); }catch(e){ PATCHES_CACHE = []; }
  return PATCHES_CACHE;
}
/* bloco pronto para entrar em qualquer tela de criação. Desenha vazio e se
   preenche quando a lista chega — nunca segura o desenho da tela. */
function patchPickerHTML(){
  return `<div class="cl-authfield" id="cl-patch-box" style="display:none">
      <label>Dados do jogo</label>
      <select id="cl-patch-sel" onchange="clPatchPick(this.value)"></select>
      <div class="cl-authhint" id="cl-patch-hint"></div>
    </div>`;
}
async function patchPickerFill(){
  const box = document.getElementById('cl-patch-box'); if(!box) return;
  const lista = await patchesDisponiveis();
  if(!lista.length) return;                      // sem patch nenhum: nem mostra a opção
  const sel = document.getElementById('cl-patch-sel');
  const oficial = lista.find(p=>p.oficial);
  const outros = lista.filter(p=>!p.oficial);
  sel.innerHTML = [oficial].filter(Boolean).map(p=>
      `<option value="">${escC(p.nome||'Patch Original RetroFoot 2026')} (padrão)</option>`).join('')
    + outros.map(p=>`<option value="${escC(p.id)}" ${CL.packId===p.id?'selected':''}>${escC(p.nome)}</option>`).join('');
  document.getElementById('cl-patch-hint').textContent = outros.length
    ? 'O patch escolhido vale para este jogo. Quem entrar na sala depois não precisa tê-lo.'
    : 'Você ainda não tem outros patches. O original entra sozinho.';
  box.style.display = outros.length ? '' : 'none';
}
function clPatchPick(id){ CL.packId = id || null; }
/* aplica o patch escolhido ANTES de o universo ser montado */
async function aplicarPatchEscolhido(){
  if(CL.packId && window.RF_PACKS){
    try{ await RF_PACKS.usarPacote(CL.packId); }
    catch(e){ console.warn('patch de dados:', e && e.message); }
  }
}
/* link ?pacote=CODIGO — adiciona o patch à conta e já deixa escolhido */
async function clPatchPorLink(){
  let cod=null; try{ cod = new URLSearchParams(location.search).get('pacote'); }catch(e){}
  if(!cod || !window.RF_PACKS) return;
  try{
    const lista = await patchesDisponiveis();
    const achado = lista.find(p => String(p.codigo).toUpperCase() === cod.toUpperCase());
    if(achado){ CL.packId = achado.oficial ? null : achado.id; return; }
    if(typeof NET!=='undefined' && NET.adicionarPatch){
      const p = await NET.adicionarPatch(cod);
      if(p){ PATCHES_CACHE = null; CL.packId = p.id;
             toastC('Patch "'+p.nome+'" adicionado à sua conta.'); }
    }
  }catch(e){ console.warn('patch por link:', e && e.message); }
}
