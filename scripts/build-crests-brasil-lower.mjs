#!/usr/bin/env node
/* ============================================================================
   Escudo REAL dos 60 clubes das Séries B/C/D do Brasileirão (public/src/data/
   leagues-brasil-lower.js), direto do Transfermarkt — gera public/src/data/
   club-crests-brasil-lower.js (window.CLUB_CREST_BRASIL_LOWER, id do jogo ->
   URL do escudo). Clube ausente aqui cai no badge de cores (clubCrestHTML,
   ui/main.js) — não editar à mão, rode o script de novo pra atualizar.

   Série B: o id do jogo já embute o ID numérico do Transfermarkt (ex.:
   "br_B_10870" -> clube 10870) — confirmado clube a clube antes de escrever
   este script — então a URL do escudo é só template, sem precisar buscar.

   Séries C/D: id é um slug (ex.: "br_D_abc"), sem ID do TM embutido — busca
   por nome na busca rápida do Transfermarkt (schnellsuche) e pontua os
   candidatos: sobreposição de nome normalizado, sigla de estado (do `short`
   do jogo, do título do candidato E do slug da URL — "guarani-fc-sp-" bate
   com "SP") batendo, bandeira Brazil, filtro de time de base/reserva, e
   valor de mercado como desempate final (clube profissional de verdade tem
   valor > 0; um xará amador quase sempre não tem). Só grava automático
   quando o melhor candidato bate com folga do 2º lugar — o resto fica pra
   revisão manual (ver MISSES no final do log), NUNCA um chute.

   Rode uma vez (ou quando quiser re-capturar):
     node scripts/build-crests-brasil-lower.mjs
   ============================================================================ */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_FILE = resolve(__dirname, '../public/src/data/leagues-brasil-lower.js');
const OUT_FILE = resolve(__dirname, '../public/src/data/club-crests-brasil-lower.js');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const DELAY_MS = 900;
const MAX_RETRIES = 3;

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function loadGlobal(file, key){
  const w = {};
  new Function('window', readFileSync(file,'utf8'))(w);
  return w[key] || {};
}

const BR_STATES = new Set(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']);
function stateHintOf(text){
  if(!text) return null;
  const paren = /\(([a-z]{2})\)/i.exec(text);
  if(paren && BR_STATES.has(paren[1].toUpperCase())) return paren[1].toUpperCase();
  const dash = /-([a-z]{2})\)?\s*$/i.exec(text);
  if(dash && BR_STATES.has(dash[1].toUpperCase())) return dash[1].toUpperCase();
  const lastWord = text.trim().split(/\s+/).pop() || '';
  if(BR_STATES.has(lastWord.toUpperCase())) return lastWord.toUpperCase();
  return null;
}
function stateHintOfSlug(href){
  // "/guarani-fc-sp-/startseite/verein/1755" -> "sp" ; "/guarani-esporte-clube-mg-/..." -> "mg"
  const m = /^\/([a-z0-9-]+)\/startseite\/verein\/\d+/.exec(href||'');
  if(!m) return null;
  const parts = m[1].split('-').filter(Boolean);
  const last = parts[parts.length-1] || '';
  return BR_STATES.has(last.toUpperCase()) ? last.toUpperCase() : null;
}
function stripAccents(s){ return s.normalize('NFD').replace(/[̀-ͯ]/g,''); }
function normTokens(s){
  return stripAccents(s||'').toLowerCase()
    .replace(/\((?:[a-z]{2})\)/g,' ')
    .replace(/\b(futebol clube|esporte clube|clube de regatas|associacao atletica|desportiva|atletico clube|clube atletico|associacao|ec|fc|ac|aa|cr|sc|ad)\b/g,' ')
    .replace(/[^a-z0-9 ]/g,' ')
    .split(/\s+/).filter(Boolean);
}
function tokenScore(aTokens, bTokens){
  const bSet = new Set(bTokens);
  let hit=0; aTokens.forEach(t=>{ if(bSet.has(t)) hit++; });
  return aTokens.length ? hit/aTokens.length : 0;
}
function marketValueScore(raw){
  if(!raw || raw==='-') return 0;
  const m = /€([\d.,]+)([km]?)/i.exec(raw); if(!m) return 0;
  let n = parseFloat(m[1].replace(/,/g,'.'));
  if(/m/i.test(m[2])) n *= 1_000_000; else if(/k/i.test(m[2])) n *= 1_000;
  return Math.log10(1+n) / 8; // ~0..1 pra clubes até ~€100m
}

// cada linha da tabela de clubes: crest + link "startseite/verein/{id}" + país (bandeira) +
// squad (valor de mercado). A 2ª linha da inline-table (competição) às vezes vem VAZIA
// (<tr><td></td></tr>) em vez de omitida — o grupo captura os dois casos.
function parseCandidates(html){
  const out = [];
  const rowRe = /suche-vereinswappen"><img src="([^"]+)"[^>]*title="([^"]*)"[^>]*\/><\/td><td><table class="inline-table"><tr><td class="hauptlink"><a title="[^"]*" href="(\/[a-z0-9-]*\/startseite\/verein\/(\d+))">([^<]*)<\/a><\/td><\/tr><tr><td>(?:<a title="([^"]*)"[^>]*>[^<]*<\/a>)?<\/td><\/tr><\/table><\/td><td class="zentriert"><img src="[^"]+" title="([^"]*)"[^>]*\/><\/td><td class="zentriert"><a[^>]*>[^<]*<\/a><\/td><td class="rechts">([^<]*)<\/td>/g;
  let m;
  while((m = rowRe.exec(html))){
    out.push({ href:m[3], tmId:m[4], name:m[5], competition:m[6]||'', country:m[7]||'', marketValue:m[8]||'' });
  }
  return out;
}

async function searchClub(query){
  for(let attempt=1; attempt<=MAX_RETRIES; attempt++){
    try {
      const url = `https://www.transfermarkt.us/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers:{ 'User-Agent':UA, 'Accept-Language':'pt-BR,pt;q=0.9,en;q=0.8' } });
      if(res.status===429 || res.status===403){ await sleep(DELAY_MS*attempt*3); continue; }
      if(!res.ok) return [];
      return parseCandidates(await res.text());
    } catch(e){
      if(attempt===MAX_RETRIES) return [];
      await sleep(DELAY_MS*attempt*2);
    }
  }
  return [];
}

function scoreCandidates(club, cands){
  const myTokens = normTokens(club.name);
  const myState = stateHintOf(club.short) || stateHintOf(club.name);
  return cands
    .filter(cand => !/\b(u1[4-9]|u2[0-3]|sub-?\d+|reservas|women|feminin|ii)\b/i.test(cand.name))
    .map(cand => {
      const candTokens = normTokens(cand.name);
      let score = tokenScore(myTokens, candTokens) * 0.55 + tokenScore(candTokens, myTokens) * 0.25;
      if(cand.country === 'Brazil') score += 0.3; else score -= 0.15;
      const candState = stateHintOf(cand.name) || stateHintOfSlug(cand.href);
      if(myState && candState) score += (myState===candState) ? 0.3 : -0.2;
      if(/brasil|brazil|brasileiro/i.test(cand.competition)) score += 0.08;
      score += marketValueScore(cand.marketValue) * 0.15;
      return { ...cand, score };
    })
    .sort((a,b) => b.score - a.score);
}

// Os 20 clubes que a busca automática não conseguiu confirmar com folga (nome comum, homônimo
// de outro clube/país, ou a busca da Transfermarkt não devolveu nenhum candidato pro termo
// composto "nome + estado") — cada um checado individualmente contra o perfil real do clube no
// Transfermarkt (cidade, estádio, competição) antes de entrar aqui. NUNCA um chute: dois desses
// (São José e Botafogo-PB) teriam saído errados se a gente tivesse confiado só no 1º colocado do
// score automático — por isso a revisão manual, não um threshold mais frouxo.
const MANUAL_OVERRIDES = {
  br_C_anapolisgo:      17568, // Anápolis FC (GO)
  br_C_botafogopb:      17964, // Botafogo Futebol Clube (PB)
  br_C_confianca:        3280, // AD Confiança (SE)
  br_C_ferroviaria:     15882, // Ferroviária / Associação Ferroviária de Esportes (SP, Araraquara)
  br_C_figueirense:      4064, // Figueirense Futebol Clube (SC)
  br_C_guarani:           1755, // Guarani Futebol Clube (SP)
  br_C_itabaiana:        8547, // Associação Olímpica de Itabaiana (SE)
  br_C_ituano:           4773, // Ituano Futebol Clube (SP)
  br_C_maringa:         33003, // Maringá Futebol Clube (PR)
  br_C_santacruz:        1785, // Santa Cruz Futebol Clube (PE, Recife)
  br_C_ypiranga:        16869, // Ypiranga Futebol Clube (RS, Erechim)
  br_D_americarn:        1751, // América Futebol Clube (RN, Natal)
  br_D_asa:             20092, // Agremiação Sportiva Arapiraquense (AL)
  br_D_capital:         82329, // Capital Futebol Clube (TO, Palmas)
  br_D_crac:            12602, // Clube Recreativo e Atlético Catalano (GO)
  br_D_ferroviario:     11931, // Ferroviário Atlético Clube (CE)
  br_D_nacional:        22782, // Nacional Futebol Clube (AM, Manaus)
  br_D_portuguesacarioca: 52517, // AA Portuguesa (RJ, Ilha do Governador)
  br_D_saojose:          7535, // Esporte Clube São José (RS, Porto Alegre)
  br_D_uberlandia:       8825, // Uberlândia Esporte Clube (MG)
};

export { loadGlobal, searchClub, scoreCandidates, parseCandidates, sleep, DELAY_MS, MANUAL_OVERRIDES };

// só roda a captura quando chamado diretamente (node scripts/build-crests-brasil-lower.mjs) —
// build-crests-dryrun.mjs importa as funções acima pra testar contra HTML salvo, sem rede.
if(import.meta.url === `file://${process.argv[1]}`){
  const BRASIL_LOWER = loadGlobal(SRC_FILE, 'BRASIL_LOWER');
  const clubs = [];
  for(const div of Object.keys(BRASIL_LOWER)){
    for(const c of BRASIL_LOWER[div]) clubs.push({ div, id:c.id, name:c.name, short:c.short });
  }
  console.log(`${clubs.length} clubes (Séries ${Object.keys(BRASIL_LOWER).join('/')}).`);

  const CREST = {};
  const bDone = [];
  for(const c of clubs){
    const m = /^br_B_(\d+)$/.exec(c.id);
    if(m){ CREST[c.id] = `https://tmssl.akamaized.net/images/wappen/big/${m[1]}.png`; bDone.push(c.id); }
  }
  console.log(`Série B: ${bDone.length}/${clubs.filter(c=>c.div==='B').length} via ID embutido no id do jogo.`);

  const misses = [];
  let cDone = 0;
  let overrideDone = 0;
  const cdClubs = clubs.filter(c=>c.div!=='B');
  for(const c of cdClubs){
    if(MANUAL_OVERRIDES[c.id] != null){
      CREST[c.id] = `https://tmssl.akamaized.net/images/wappen/big/${MANUAL_OVERRIDES[c.id]}.png`;
      overrideDone++; cDone++;
      process.stdout.write(`\r  ${cDone}/${cdClubs.length} — ${cdClubs.length - misses.length} ok (${overrideDone} confirmados manualmente), ${misses.length} p/ revisão`);
      continue; // sem override não precisa buscar de novo — já checado à mão contra o TM real
    }
    const cands = await searchClub(c.name);
    const scored = scoreCandidates(c, cands);
    const best = scored[0], second = scored[1];
    const confident = best && best.score >= 0.6 && (!second || best.score - second.score >= 0.15);
    if(confident){
      CREST[c.id] = `https://tmssl.akamaized.net/images/wappen/big/${best.tmId}.png`;
    } else {
      misses.push({ club: `${c.name} (${c.short})`, id: c.id,
        top3: scored.slice(0,3).map(s=>`${s.name} [tm=${s.tmId}, ${s.country}, score=${s.score.toFixed(2)}]`) });
    }
    cDone++;
    process.stdout.write(`\r  ${cDone}/${cdClubs.length} — ${cdClubs.length - misses.length} ok (${overrideDone} confirmados manualmente), ${misses.length} p/ revisão`);
    await sleep(DELAY_MS);
  }
  console.log('');

  if(misses.length){
    console.log(`\n⚠ ${misses.length} clube(s) sem match automático confiável (ficam no badge de cores por enquanto):`);
    misses.forEach(m => {
      console.log(`  - ${m.club} (${m.id})`);
      m.top3.forEach(t => console.log(`      · ${t}`));
    });
  }

  const sortedKeys = Object.keys(CREST).sort();
  const body = sortedKeys.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(CREST[k])}`).join(',\n');
  const out = `/* Escudo REAL dos clubes das Séries B/C/D do Brasileirão (id do jogo -> URL do escudo),
   capturado do Transfermarkt via scripts/build-crests-brasil-lower.mjs. Clube ausente aqui
   (busca ambígua/sem match confiável) cai no badge de cores de sempre — ver clubCrestHTML em
   ui/main.js. Não editar à mão, rode o script de novo pra atualizar. Capturado em
   ${new Date().toISOString().slice(0,10)}: ${sortedKeys.length}/${clubs.length} clubes. */
window.CLUB_CREST_BRASIL_LOWER = {
${body}
};
`;
  writeFileSync(OUT_FILE, out, 'utf8');
  console.log(`\n✅ ${sortedKeys.length}/${clubs.length} clubes gravados em ${OUT_FILE}`);
}
