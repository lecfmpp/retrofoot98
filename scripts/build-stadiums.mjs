#!/usr/bin/env node
/* ============================================================================
   Captura a capacidade REAL de estádio dos 352 clubes estrangeiros do jogo
   (public/src/data/leagues-intl.js + leagues-conmebol.js) direto do Transfermarkt,
   e gera public/src/data/stadiums-intl.js (window.STADIUM_CAP, id -> capacidade).

   Fonte: cada clube já carrega o próprio ID do Transfermarkt no campo `tk`
   (ex.: Bayern Munich tk="27", River Plate tk="cmb_209" -> TM id 209) — raspado
   originalmente via Apify quando esses arquivos foram montados. Não precisa de
   nenhum "match" por nome: a página do clube no TM é acessível só pelo ID
   numérico, o slug da URL é decorativo (testado: /x/stadion/verein/{id} funciona
   igual pra qualquer clube).

   A API pública terceirizada (transfermarkt-api.fly.dev) que o plano original
   previa usar está fora do ar (500 em toda chamada, confirmado antes de escrever
   este script) — por isso aqui é scraping direto da própria página de estádio do
   Transfermarkt, parseando a tabela "Stadium information" (linha "Total capacity:").

   Rode uma vez (ou quando quiser re-capturar):
     node scripts/build-stadiums.mjs
   ============================================================================ */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INTL_FILE = resolve(__dirname, '../public/src/data/leagues-intl.js');
const CONMEBOL_FILE = resolve(__dirname, '../public/src/data/leagues-conmebol.js');
const OUT_FILE = resolve(__dirname, '../public/src/data/stadiums-intl.js');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const DELAY_MS = 650;          // educado com o servidor — ~352 clubes * 0.65s ≈ 4min, sem contar retries
const MAX_RETRIES = 3;

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

// carrega window.INTL_LEAGUES / window.CONMEBOL_LEAGUES sem navegador (mesmo truque de upload-intl-leagues.mjs)
function loadGlobal(file, key){
  const w = {};
  new Function('window', readFileSync(file,'utf8'))(w);
  return w[key] || {};
}

const INTL = loadGlobal(INTL_FILE, 'INTL_LEAGUES');
const CONMEBOL = loadGlobal(CONMEBOL_FILE, 'CONMEBOL_LEAGUES');

// lista única de clubes: {gameId, tmId, name}
const clubs = [];
for(const [country, list] of Object.entries(INTL)){
  for(const c of list){
    if(!c.id || !c.tk) continue;
    clubs.push({ gameId: c.id, tmId: String(c.tk), name: c.name, country });
  }
}
for(const [country, list] of Object.entries(CONMEBOL)){
  for(const c of list){
    const raw = c.tk || c.id; if(!raw) continue;
    const tmId = String(raw).replace(/^cmb_/,'');
    if(!c.id) continue;
    clubs.push({ gameId: c.id, tmId, name: c.name, country });
  }
}
console.log(`${clubs.length} clubes pra capturar (${Object.keys(INTL).length} países europeus + ${Object.keys(CONMEBOL).length} países CONMEBOL).`);

// extrai "Total capacity:" (ou "Seats:" como fallback) da tabela de infos do estádio.
// valores vêm no formato europeu "75.000" (ponto = separador de milhar) — não decimal.
function parseCapacity(html){
  const rows = {};
  const re = /<th>([^<]*)<\/th>\s*<td>([^<]*)<\/td>/g;
  let m;
  while((m = re.exec(html))){
    const label = m[1].trim().toLowerCase();
    const val = m[2].trim();
    if(label) rows[label] = val;
  }
  const raw = rows['total capacity:'] || rows['seats:'];
  if(!raw) return null;
  const n = parseInt(raw.replace(/\./g,'').replace(/[^\d]/g,''), 10);
  return (Number.isFinite(n) && n>0) ? n : null;
}

async function fetchCapacity(tmId){
  for(let attempt=1; attempt<=MAX_RETRIES; attempt++){
    try {
      const res = await fetch(`https://www.transfermarkt.us/x/stadion/verein/${tmId}`, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      });
      if(res.status===429 || res.status===403){
        await sleep(DELAY_MS * attempt * 3); continue; // backoff maior em bloqueio/rate-limit
      }
      if(!res.ok) return null;
      const html = await res.text();
      return parseCapacity(html);
    } catch(e){
      if(attempt===MAX_RETRIES) return null;
      await sleep(DELAY_MS * attempt * 2);
    }
  }
  return null;
}

const STADIUM_CAP = {};
const misses = [];
let done = 0;
for(const c of clubs){
  const cap = await fetchCapacity(c.tmId);
  if(cap){ STADIUM_CAP[c.gameId] = cap; }
  else { misses.push(`${c.name} (${c.country}, tm=${c.tmId})`); }
  done++;
  process.stdout.write(`\r  ${done}/${clubs.length} — ${Object.keys(STADIUM_CAP).length} ok, ${misses.length} falhas`);
  await sleep(DELAY_MS);
}
console.log('');

if(misses.length){
  console.log(`\n⚠ ${misses.length} clube(s) sem capacidade capturada (ficam no fallback sintético do jogo):`);
  misses.forEach(m=>console.log('  - '+m));
}

const sortedKeys = Object.keys(STADIUM_CAP).sort();
const body = sortedKeys.map(k=>`  ${JSON.stringify(k)}:${STADIUM_CAP[k]}`).join(',\n');
const out = `/* Capacidade REAL de estádio dos clubes estrangeiros (id do jogo -> lugares), raspada do
   Transfermarkt (www.transfermarkt.us/x/stadion/verein/{id_tm}) via scripts/build-stadiums.mjs.
   Clube ausente aqui cai no fallback sintético de sempre (realCapFor() em main.js) — não editar
   à mão, rode o script de novo pra atualizar. Capturado em ${new Date().toISOString().slice(0,10)}:
   ${sortedKeys.length}/${clubs.length} clubes. */
window.STADIUM_CAP = {
${body}
};
`;
writeFileSync(OUT_FILE, out, 'utf8');
console.log(`\n✅ ${sortedKeys.length}/${clubs.length} clubes gravados em ${OUT_FILE}`);
