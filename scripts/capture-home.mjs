// Captura as telas REAIS do jogo que a home usa (pele 2026).
// Uso: node scripts/capture-home.mjs   (dev em http://localhost:5199)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE='http://localhost:5199/';
const OUT=resolve(process.cwd(),'public/img/home');
mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const browser=await puppeteer.launch({executablePath:CHROME,headless:'new',
  args:['--no-sandbox','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'],
  defaultViewport:{width:1440,height:900,deviceScaleFactor:2}});

async function novaPagina(alvo){
  const page=await browser.newPage();
  /* SEM O CLIENTE DO VITE. A arvore e partilhada por varias sessoes: qualquer
     ficheiro que mude enquanto isto corre dispara um full-reload, o estado do
     jogo evapora no meio da captura e o script morre com "CL is not defined".
     Aqui nao se quer HMR nenhum -- quer-se uma pagina parada para fotografar. */
  await page.setRequestInterception(true);
  page.on('request',r=>{ /@vite\/client/.test(r.url()) ? r.abort() : r.continue(); });
  page.on('pageerror',e=>console.log('  [pageerror]',String(e).slice(0,140)));
  await page.goto(BASE+'?rf='+alvo,{waitUntil:'networkidle2',timeout:60000});
  await sleep(2600);
  return page;
}
const SEM_ADS=`.rf-ad-top,[data-ad-rail],.rf-ad-anchor,.rf-sb-ad,.rf-sb-next,.cl-ad,.rf-ad,.rf-adph,
  .rf-ad-fixo,.rf-ad-inline,.rf-ad-splash,.rf-cam-ad,.rf-cam-banda,.rf-cam-patro,[data-ad-vazio],[data-ad-fixo]{display:none!important}`;
/* ANIMACAO DESLIGADA NA HORA DA FOTO. O painel do chat entra com `ds-fade-up`,
   e a captura forca um repintar que faz a animacao recomecar do zero -- o
   retrato saia com o painel a 30% de opacidade, com o campo a aparecer por
   tras do texto. Congelar animacao e transicao resolve isso e, de quebra,
   tira qualquer barra a meio de encher das outras telas. */
const SEM_ANIMACAO=`*,*::before,*::after{animation:none!important;transition:none!important}`;
async function semAnuncios(page){
  await page.addStyleTag({content:SEM_ADS}).catch(()=>{});
  await page.addStyleTag({content:SEM_ANIMACAO}).catch(()=>{});
}
/* RECORTE PELO RETANGULO, NAO PELO ELEMENTO. elementHandle.screenshot() rola o
   elemento ate a vista e calcula o quadro a partir do fluxo da pagina -- num
   painel `position:fixed` (o chat) isso devolve o pedaco de pagina que esta por
   baixo, e nao o painel. Medir o rect e recortar a foto da JANELA acerta nos
   dois casos, com uma folga para a sombra caber. */
async function shot(page,nome,sel,folga){
  await semAnuncios(page);
  try{ await page.evaluate(()=>{const t=document.getElementById('c-toast'); if(t) t.replaceChildren();}); }catch(e){}
  await sleep(300);
  if(!sel){ await page.screenshot({path:resolve(OUT,nome+'.png')}); console.log('  📸',nome); return; }
  const f=folga==null?18:folga;
  const r=await page.evaluate((s,f)=>{
    const el=document.querySelector(s); if(!el) return null;
    const b=el.getBoundingClientRect();
    return {x:Math.max(0,b.x-f), y:Math.max(0,b.y-f),
      width:Math.min(innerWidth-Math.max(0,b.x-f), b.width+f*2),
      height:Math.min(innerHeight-Math.max(0,b.y-f), b.height+f*2)};
  }, sel, f);
  if(!r || r.width<8 || r.height<8){ console.log('  ✗ sem elemento',sel,'para',nome); return; }
  await page.screenshot({path:resolve(OUT,nome+'.png'), clip:r});
  console.log('  📸',nome);
}

// 1. Formação (hub)
{ const p=await novaPagina('hub');
  console.log('screen=',await p.evaluate(()=>CL.screen),'page=',await p.evaluate(()=>rfState().page));
  await shot(p,'formacao'); await p.close(); }

// 2. Elenco  3. Ficha do jogador
{ const p=await novaPagina('elenco');
  await shot(p,'elenco');
  await p.evaluate(()=>rfGo('elenco','ficha')); await sleep(900);
  await shot(p,'ficha-jogador');
  /* SO O RETRATO. A seccao "seja um jogador oficial" poe o retrato do jogador
     lado a lado com a foto de infancia de quem assina — para isso e preciso o
     cartao sozinho, nao a pagina inteira. */
  await shot(p,'retrato-jogador','.rf-fx-retrato',0);
  await p.close(); }

// 4. Rodada ao vivo  5. Camarote  6. Pênalti
{ const p=await novaPagina('hub');
  // sem a pausa do intervalo: ela abre o modal de substituicao por cima da rodada ao vivo
  await p.evaluate(()=>{ CL.options=Object.assign({},CL.options||{},{subsIntervalo:'Não',som:'Não'}); });
  await p.evaluate(()=>clJogar()); await sleep(2500);
  // o sorteio da copa entra na frente na primeira semana: pula e segue ate a rodada ao vivo
  for(let i=0;i<40 && await p.evaluate(()=>CL.screen!=='live');i++){
    await p.evaluate(()=>{
      if(CL.screen==='cupdraw' && typeof clCupDrawSkip==='function') return clCupDrawSkip();
      if((CL.screen==='classif'||CL.screen==='seatclassif') && typeof clClassifContinue==='function') return clClassifContinue();
      if(CL.screen==='main' && typeof clJogar==='function') return clJogar();
    });
    await sleep(700);
  }
  console.log('screen apos jogar=',await p.evaluate(()=>CL.screen), 'live=', await p.evaluate(()=>!!CL.live));
  // o Camarote ja abre ligado; o primeiro retrato e ele, o segundo e a rodada da semana
  // espera o RELOGIO da partida, nao o relogio de parede: o headless estrangula os timers
  // e um sleep fixo tanto pega o 3' como o intervalo.
  let ultimoMin=0;
  for(let i=0;i<300;i++){
    const st=await p.evaluate(()=>({tela:CL.screen,min:(CL.live&&CL.live.minute)||0}));
    // a partida acabou enquanto se esperava: fotografar agora e o que ha
    if(st.tela!=='live'){ console.log('  (a rodada saiu de live em', st.min, "')"); break; }
    // o relogio voltou atras = comecou outra partida; nao vale continuar a esperar.
    // So conta depois do arranque: nos primeiros minutos ele ainda oscila.
    if(ultimoMin>10 && st.min<ultimoMin) break;
    ultimoMin=st.min;
    if(st.min>=40) break;
    await sleep(400);
  }
  console.log('  minuto=',ultimoMin);
  /* O QUE ESTA POR CIMA FICA ESCONDIDO, NAO FECHADO. Uma expulsao ou uma lesao
     abre modal no meio da partida, pausa tudo e volta a abrir logo a seguir --
     fechar nao chega, a proxima ocorrencia cai em cima da foto seguinte. Aqui
     o overlay so deixa de ser desenhado enquanto se fotografa a partida; o
     modal do penalti, esse, e fotografado de proposito, e por isso a regra sai
     antes dele. */
  await p.evaluate(()=>{
    const st=document.createElement('style'); st.id='rf-shot-sem-overlay';
    st.textContent='#c-overlay{display:none!important}';
    document.head.appendChild(st);
  });
  await sleep(400);
  const cam=await p.evaluate(()=>!!document.querySelector('.rf-cam'));
  await shot(p, cam?'camarote':'rodada-ao-vivo');
  await p.evaluate(()=>{ if(typeof camToggle==='function') camToggle(); }); await sleep(2500);
  await shot(p, cam?'rodada-ao-vivo':'camarote');
  await p.evaluate(()=>{ const st=document.getElementById('rf-shot-sem-overlay'); if(st) st.remove();
    if(typeof clCloseOverlay==='function') clCloseOverlay(); });
  if(!cam) await p.evaluate(()=>{ if(typeof camToggle==='function') camToggle(); });
  await sleep(800);
  // penalti: força o modal do batedor na partida do usuário
  const ok=await p.evaluate(()=>{
    const RL=CL.live; if(!RL) return 'sem live';
    const m=(RL.matches||[]).find(x=>x.user)||(RL.matches||[])[0]; if(!m) return 'sem partida';
    const side=(m.h===CL.clubId)?'H':'A';
    const e={type:'penalti',min:63,side,scorer:null,scored:true,_forcado:true};
    openPenaltyModal(m,e); return 'ok';
  });
  console.log('  penalti:',ok); await sleep(1200);
  await shot(p,'penalti');
  await p.close(); }

/* ---------------------------------------------------------------------
   MERCADO E CAMPEONATOS — as telas que a landing desenhava a mao
   As maquetes de leilao, propostas, classificacao e chat eram HTML escrito
   a mao dentro da landing. Envelheceram mal (colunas desalinhadas, numeros
   inventados). Passam a ser foto do jogo, como as outras.
   --------------------------------------------------------------------- */
{ const p=await novaPagina('mercado');
  /* Propostas fica de fora: na 1a semana a aba esta legitimamente vazia
     ("Nenhuma proposta no momento") e um retrato vazio nao vende nada. */
  for(const [tab,nome] of [['leilao','leilao']]){
    await p.evaluate(t=>rfGo('mercado',t), tab); await sleep(1100);
    await shot(p, nome);
  }
  await p.close(); }

{ const p=await novaPagina('campeonatos');
  await p.evaluate(()=>rfGo('campeonatos','classificacao')); await sleep(1200);
  await shot(p,'classificacao');
  await p.close(); }

/* ---------------------------------------------------------------------
   O CHAT DA RESENHA — o painel de verdade, nao o desenho
   rfChatDisponivel() exige sala online, e o telefone esta excluido de
   proposito. Aqui monta-se a sala minima que o COMPONENTE precisa para se
   desenhar (NET.room + mensagens) e fotografa-se o painel real, com o CSS
   real. Nada disto toca no transporte: e a mesma marcacao que a Resenha
   mostra em jogo.
   --------------------------------------------------------------------- */
{ const p=await novaPagina('elenco');
  await p.evaluate(()=>{
    CL.online=true;
    window.NET=window.NET||{};
    NET.self={id:'u1',name:'Gringo'};
    NET.room={code:'RF-7742',name:'Sala do canal',chat:[
      {id:'u2',name:'lucão',  text:'contratei o camisa 10 no leilão 🔨', ts:1},
      {id:'u3',name:'tiu',    text:'tomou 4 do meu time reserva kkk',    ts:2},
      {id:'u1',name:'Gringo', text:'espera a volta, tô montando time',   ts:3},
      {id:'u4',name:'marreco',text:'sobe logo essa Série D, treinador',  ts:4},
    ]};
    CL.chatOpen=true; CL.chatUnread=0;
    if(typeof rfChatRender==='function') rfChatRender();
  });
  /* FUNDO LIMPO ATRAS DO PAINEL. O chat vive em #rf-chat-host, colado ao body e
     FORA de #c-root -- entao esconder o #c-root apaga a pagina do jogo por tras
     e deixa so o painel. Sem isto o recorte apanha o gramado da Formacao e a
     foto parece um erro de renderizacao. */
  await p.addStyleTag({content:'#c-root{visibility:hidden}body{background:var(--surface-desk,#e9efe9)}'});
  await sleep(1200);
  await shot(p,'chat-resenha','.rf-chat-painel',16);
  await p.close(); }

/* ---------------------------------------------------------------------
   A SALA DA RESENHA CHEIA
   ?rf=ob5 desenha o lobby com a sala de bancada (um participante). Aqui a
   sala e povoada ate 8 — o teto do plano Embaixador — para a foto mostrar
   uma sala como ela e quando a turma toda entrou.
   --------------------------------------------------------------------- */
const SEM_NAV_PUBLICA=`.rf-lp-nav{display:none!important}`;
const RF_TURMA=['Gringo','lucão','tiu','marreco','Zé do Bairro','Rikelmi','Dona Sonia','Perereca'];
{ const p=await novaPagina('ob5');
  await p.evaluate(nomes=>{
    /* a sala de bancada nasce chamada "Sala de bancada" e com ?sala=null no link:
       dois carimbos de desenvolvimento que nao podem aparecer numa pagina de venda */
    NET.room.name='Resenha da firma'; NET.room.code='RF-7742';
    CL.net=CL.net||{}; CL.net.roomName='Resenha da firma';
    NET.inviteLink=()=>'retrofoot.com.br/s/RF-7742';
    NET.room.participants=nomes.map((n,i)=>({id:'u'+(i+1),name:n,host:i===0,confirmed:true}));
    if(typeof rfBancadaDesenha==='function') rfBancadaDesenha(5);
  }, RF_TURMA);
  await p.addStyleTag({content:SEM_NAV_PUBLICA});
  await sleep(1100);
  await shot(p,'sala-resenha');
  await p.close(); }

{ const p=await novaPagina('ob6');
  await p.evaluate(nomes=>{
    const pool=DATA.clubs.slice(0,nomes.length);
    CL.soloDraw={ list:pool.map((c,i)=>({name:nomes[i],clubId:c.id})),
      idx:nomes.length-1, poolById:Object.fromEntries(pool.map(c=>[c.id,c])) };
    if(typeof rfBancadaDesenha==='function') rfBancadaDesenha(6);
  }, RF_TURMA);
  await p.addStyleTag({content:SEM_NAV_PUBLICA});
  await sleep(1100);
  await shot(p,'sorteio-resenha');
  await p.close(); }

await browser.close();
console.log('pronto →',OUT);
