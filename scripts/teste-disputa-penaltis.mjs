/* BANCADA DA DISPUTA DE PÊNALTIS.
   Monta uma partida de copa empatada, dispara a disputa e clica em "Bater" sempre que a
   cobrança for minha — imprimindo, cobrança a cobrança, o que a tela mostra e o que o motor
   registou. Serve para apanhar o padrão de bug que já apareceu duas vezes aqui: a série
   avança por baixo mas a TELA fica parada (sobreposição a tapar sobreposição, placar a ler
   os dados errados). Guarda um PNG por 0,4s em /tmp/pen — é neles que a falha se vê.
   Uso: node scripts/teste-disputa-penaltis.mjs   (dev server em http://localhost:5199) */
import puppeteer from 'puppeteer-core';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({ executablePath:CHROME, headless:'new',
  args:['--no-sandbox','--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'],
  defaultViewport:{ width:1440, height:950 } });
const page=await browser.newPage();
page.on('pageerror',e=>console.log('  [ERRO PAGINA]',String(e).split('\n')[0]));
page.on('console',m=>{ const t=m.text(); if(/\[pen\]/.test(t)) console.log('  '+t); });
await page.goto('http://localhost:5199/?rf=hub',{waitUntil:'networkidle2',timeout:60000});
await sleep(1800);

// monta a disputa
const setup=await page.evaluate(()=>{
  const meu=CL.clubId;
  const lista=(S.divisionClubs&&(S.divisionClubs[S.division]||[]))||[];
  const ids=lista.map(c=>c.id||c).filter(x=>x&&x!==meu);
  const opp=ids[0];
  if(!opp) return {erro:'sem adversario', amostra:Object.keys(window).filter(k=>/club/i.test(k)).slice(0,20)};
  CL.tacticChosen=true; S.xi=autoXI(meu);
  const m=buildLiveMatchObject(meu,opp,'penteste',{user:true,div:'copaBrasil',cupKey:'copaBrasil'});
  m.hg=1; m.ag=1; m.events=m.events.filter(()=>false);
  const RL={ jornada:S.round+1, minute:120, half:2, done:false, sel:0, subOpen:false,
    matches:[m], maxMin:120,
    cup:{ key:'copaBrasil', stage:'bracket', bracket:{round:1}, tie:{h:meu,a:opp,hg:1,ag:1} } };
  CL.live=RL; CL.screen='live';
  // instrumentação
  window.__pen=[];
  const env=(...a)=>{ window.__pen.push(a.join(' ')); console.log('[pen] '+a.join(' ')); };
  ['shootoutNextKick','shootoutRevelar','recordShootoutKick','resolveShootoutKick',
   'openShootoutPickerModal','finishPenaltyShootout'].forEach(n=>{
    const f=window[n]; window[n]=function(){ env('→',n,JSON.stringify([].slice.call(arguments)));
      try{ return f.apply(this,arguments); }catch(e){ env('!! EXCEÇÃO em',n,e&&e.message); throw e; } };
  });
  startPenaltyShootout(m);
  return {meu,opp};
});
console.log('setup:',JSON.stringify(setup));

import {mkdirSync} from 'node:fs';
mkdirSync('/tmp/pen',{recursive:true});
// clica em "Chutar" sempre que o modal de escolha estiver na tela
for(let i=0;i<70;i++){
  await sleep(400);
  await page.screenshot({path:`/tmp/pen/t${String(i).padStart(3,'0')}.png`});
  const st=await page.evaluate(()=>{
    const RL=CL.live; if(!RL) return {fim:true};
    const btn=[...document.querySelectorAll('button,[onclick]')]
      .find(b=>/resolveShootoutKick/.test(b.getAttribute('onclick')||''));
    if(btn && !CL.penPhase && !window.__esperei){ window.__esperei=1; return {espera:true}; }
    if(btn && !CL.penPhase){ window.__esperei=0; btn.click(); return {clicou:true, quem:btn.textContent.trim()}; }
    return { picking:!!RL.pensPicking, fase:CL.penPhase||'-', turn:RL.pens&&RL.pens.turn,
             h:(RL.pens&&RL.pens.h.length)||0, a:(RL.pens&&RL.pens.a.length)||0,
             done:!!RL.done, botao:!!btn };
  });
  if(st.fim){ console.log('CL.live sumiu (disputa terminou e saiu da tela)'); break; }
  if(st.clicou){ console.log(`t=${(i*0.4).toFixed(1)}s  CLIQUE em Chutar`); continue; }
  console.log(`t=${(i*0.4).toFixed(1)}s  ${st.h}x${st.a} turn=${st.turn} picking=${st.picking} fase=${st.fase} botao=${st.botao} done=${st.done}`);
  if(st.done) break;
}
const log=await page.evaluate(()=>window.__pen||[]);
console.log('\n--- rastro ---'); log.forEach(l=>console.log('  '+l));
await browser.close();
