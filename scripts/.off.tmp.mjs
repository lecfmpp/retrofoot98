import puppeteer from 'puppeteer-core';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT='/private/tmp/claude-501/-Users-clawdio-Documents-GitHub-Elifoot/92a88e1b-59a6-4f11-9a0f-571567c8f14b/scratchpad';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
const DESLIGADOS=process.argv[2]?process.argv[2].split(','):[];
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox'],
  defaultViewport:{width:1600,height:1000,deviceScaleFactor:1}});
const p=await b.newPage();
p.on('pageerror',e=>console.log(' [erro]',String(e).slice(0,120)));
await p.setRequestInterception(true);
p.on('request',req=>{ const u=req.url();
  if(u.includes('ad_spaces?select=chave&ligado=eq.false')){
    if(req.method()==='OPTIONS') return req.respond({status:204,headers:CORS,body:''});
    return req.respond({status:200,contentType:'application/json',headers:CORS,
      body:JSON.stringify(DESLIGADOS.map(c=>({chave:c})))});
  } req.continue(); });
await p.evaluateOnNewDocument(()=>{ try{ localStorage.removeItem('rf98:ads:v1'); }catch(e){} });
await p.goto('http://localhost:5199/?rf=hub',{waitUntil:'networkidle2',timeout:60000});
await sleep(3500);
await p.evaluate(()=>rfGo('hub')); await sleep(1500);
const med=async(rot)=>console.log(rot, JSON.stringify(await p.evaluate(()=>{
  const q=s=>document.querySelector(s); const n=s=>document.querySelectorAll(s).length;
  const cx=s=>{const e=q(s); if(!e) return null; const r=e.getBoundingClientRect();
    return Math.round(r.width)+'x'+Math.round(r.height)+'@'+Math.round(r.left);};
  return {topo:cx('.rf-ad-top')||'(sem)', trilhoEsq:cx('[data-ad-rail="left"]')||'(sem)',
    trilhoDir:cx('[data-ad-rail="right"]')||'(sem)', faixaViva:cx('.rf-ad-inline')||'(sem)',
    placasCima:n('.cl-pitch-ads.top .cl-pitch-ad'), placasArte:n('.cl-pitch-ads .cl-pitch-ad.arte'),
    bandaCam:cx('.rf-cam-patro')||'(sem)', pastilhas:n('.rf-cam-ad'),
    colunaMid:cx('.rf-lv-mid')||cx('.rf-cols')||'(n/a)'};})));
await med('HUB    ');
const el=await p.$('.rf-pitch-card'); if(el) await el.screenshot({path:OUT+'/off-campo.png'});
await p.screenshot({path:OUT+'/off-hub.png',clip:{x:0,y:0,width:1600,height:340}});
await p.evaluate(()=>{ let g=0; while(g++<3){ try{ playRound(null); }catch(e){ S.round++; } }
  CL.tacticChosen=true; S.xi=autoXI(CL.clubId); startLiveRound(); });
await sleep(2500);
await med('CAMAROTE');
const c=await p.$('.rf-cam-env'); if(c) await p.screenshot({path:OUT+'/off-cam.png',clip:{x:0,y:0,width:1600,height:420}});
await p.evaluate(()=>camToggle()); await sleep(1500);
await med('AO VIVO');
await p.screenshot({path:OUT+'/off-live.png',clip:{x:0,y:0,width:1600,height:400}});
await b.close(); process.exit(0);
