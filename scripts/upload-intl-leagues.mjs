#!/usr/bin/env node
/* ============================================================================
   Sobe as ligas europeias (public/src/data/leagues-intl.js -> window.INTL_LEAGUES)
   para a tabela elifoot_v3.division_clubs no Supabase, no MESMO formato do Brasil.

   Rode uma vez por temporada (depois de re-raspar/atualizar o leagues-intl.js):
     SUPABASE_SERVICE_KEY='...' node scripts/upload-intl-leagues.mjs

   A service_role key vem do painel Supabase (Settings > API > service_role).
   Ela fica só na SUA env — nunca é commitada. É necessária porque a RLS da
   division_clubs só permite leitura pública (escrita = service role).
   ============================================================================ */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SB_URL = 'https://alxwgqvjmetjbbqtjkhx.supabase.co';
const SCHEMA = 'elifoot_v3';
const KEY = process.env.SUPABASE_SERVICE_KEY;
if(!KEY){ console.error('❌ Defina SUPABASE_SERVICE_KEY (service_role, do painel Supabase).'); process.exit(1); }

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = resolve(__dirname, '../public/src/data/leagues-intl.js');

// lg (código de liga nos dados) -> divisão (chave do universo, igual ao cliente)
const LG_TO_DIV = { 'ENG-1':'PL','ENG-2':'CH','ESP-1':'ES','ESP-2':'ES2','ITA-1':'IT','ITA-2':'IT2','GER-1':'DE','GER-2':'DE2','POR-1':'PT','POR-2':'PT2' };

// carrega window.INTL_LEAGUES sem navegador
const globalWindow = {};
new Function('window', readFileSync(DATA_FILE,'utf8'))(globalWindow);
const IL = globalWindow.INTL_LEAGUES || {};

const rows = [];
for(const country of Object.keys(IL)){
  for(const c of IL[country]){
    const division = LG_TO_DIV[c.lg];
    if(!division){ console.warn(`  ⚠ liga sem mapa de divisão: ${c.lg} (${c.name}) — pulado`); continue; }
    const club_id = c.tk ? String(c.tk) : String(c.id||'').replace(/^intl_/,''); // client reconstrói id = 'intl_'+club_id
    if(!club_id){ console.warn(`  ⚠ clube sem id: ${c.name} — pulado`); continue; }
    rows.push({
      country, division, club_id,
      name: c.name, short: c.short || c.name,
      color: c.color || '#888888', color2: c.color2 || null, crest: c.crest || null,
      overall: Math.round(c.overall || 60),
      squad: c.squad || [],
    });
  }
}
console.log(`Preparados ${rows.length} clubes de ${Object.keys(IL).length} países (${rows.reduce((s,r)=>s+r.squad.length,0)} jogadores).`);

async function upsertBatch(batch){
  const res = await fetch(`${SB_URL}/rest/v1/division_clubs?on_conflict=division,club_id`, {
    method: 'POST',
    headers: {
      'apikey': KEY, 'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'Content-Profile': SCHEMA, 'Accept-Profile': SCHEMA,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  });
  if(!res.ok){ throw new Error(`HTTP ${res.status}: ${await res.text()}`); }
}

const BATCH = 20;
let done = 0;
for(let i=0;i<rows.length;i+=BATCH){
  const batch = rows.slice(i, i+BATCH);
  try { await upsertBatch(batch); done += batch.length; process.stdout.write(`\r  enviados ${done}/${rows.length}`); }
  catch(e){ console.error(`\n❌ Falha no lote ${i}-${i+batch.length}: ${e.message}`); process.exit(1); }
}
console.log(`\n✅ Concluído: ${done} clubes europeus no elifoot_v3.division_clubs.`);
