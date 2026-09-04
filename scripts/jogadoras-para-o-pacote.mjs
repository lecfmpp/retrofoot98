/* ============================================================================
   AS 1.900 JOGADORAS SAEM DO FICHEIRO E ENTRAM NO PACOTE
   ----------------------------------------------------------------------------
   POR QUE. O universo masculino guarda os nomes no BANCO (pack_edits.patch.squad)
   e o feminino guardava-os num ficheiro estatico do repositorio. Duas fontes
   diferentes para a mesma coisa: o painel so' via uma delas, a vaga do Embaixador
   so' entrava na base de uma delas, e qualquer regra nova tinha de ser escrita
   duas vezes. Este script poe as duas no mesmo sitio.

   A CHAVE CONTINUA A SER O ID, e isso NAO e' inconsistencia. O pacote oficial
   renomeia 1.870 dos 1.900 nomes masculinos; uma chave por nome no mapa feminino
   apontaria para nomes que o jogo ja' nao usa (ver o cabecalho de
   data/jogadoras-brasil.js, que e' onde esta decisao nasceu). Por isso o mapa
   irmao chama-se `squadFem` e nao se mistura com `squad`.

   O FICHEIRO NAO E' APAGADO por este script, de proposito: ele passa a ser a
   primeira pintura e a rede de quem esta' sem ligacao — a mesma relacao que o
   masculino tem com o seu cache. Quando o pacote estiver a servir isto em
   producao ha' uns dias, apagar o ficheiro e' um commit de uma linha.

   COMO RODAR
     node scripts/jogadoras-para-o-pacote.mjs            # so' conta, nao escreve
     SUPABASE_SERVICE_KEY=... node scripts/jogadoras-para-o-pacote.mjs --aplicar

   A chave de escrita fica na env de quem roda e nunca no repositorio — e' a
   convencao dos outros scripts de bancada (ver scripts/_supabase.mjs).
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { ler, upsert, SCHEMA } from './_supabase.mjs';

const APLICAR = process.argv.includes('--aplicar');
const RAIZ = path.join(process.cwd(), 'public', 'src', 'data');

/* os ficheiros de dados sao scripts que atribuem a `window`; aqui o window e' o global */
globalThis.window = globalThis;
for (const f of ['game-data.js', 'leagues-brasil-lower.js', 'jogadoras-brasil.js']) {
  new Function(fs.readFileSync(path.join(RAIZ, f), 'utf8'))();
}

const FEM = globalThis.JOGADORAS_BR || {};
const listas = [['A', (globalThis.GAME_DATA && globalThis.GAME_DATA.clubs) || []]];
for (const d of ['B', 'C', 'D']) listas.push([d, (globalThis.BRASIL_LOWER || {})[d] || []]);

/* de que CLUBE e' cada jogadora: o mapa do ficheiro e' global por id, e o pacote e' por clube.
   O `vistos` protege contra o mesmo id aparecer em duas listas (a Serie A vive em dois sitios). */
const porClube = {}, divDe = {}, vistos = new Set();
for (const [div, lista] of listas) {
  for (const c of lista) {
    for (const p of (c.squad || [])) {
      if (!p || p.id == null || FEM[p.id] == null || vistos.has(p.id)) continue;
      vistos.add(p.id);
      (porClube[c.id] = porClube[c.id] || {})[p.id] = { n: FEM[p.id] };
      divDe[c.id] = div;
    }
  }
}

const total = Object.keys(FEM).length, casadas = vistos.size;
const clubes = Object.keys(porClube);
console.log(`ficheiro: ${total} jogadoras · casadas com clube: ${casadas} · orfas: ${total - casadas} · clubes: ${clubes.length}`);
if (total !== casadas) {
  console.error('ABORTA: ha jogadora sem clube. O mapa e o catalogo teriam de discordar — conferir antes de escrever.');
  process.exit(1);
}

const packs = await ler('data_packs', { select: 'id,oficial' });
const oficial = (packs || []).find(p => p.oficial);
if (!oficial) { console.error('ABORTA: nao achei o pacote oficial.'); process.exit(1); }

const linhas = await ler('pack_edits', { select: 'pack_id,club_id,divisao,novo,patch' });
const atual = new Map((linhas || []).filter(l => l.pack_id === oficial.id).map(l => [l.club_id, l]));

/* MERGE, nao substituicao: o clube ja' tem `squad` (nomes masculinos), `name`, `crest` e
   `short` no mesmo patch — reescrever o patch inteiro apagaria tudo isso. */
const escrever = clubes.map(cid => {
  const linha = atual.get(cid);
  const patch = Object.assign({}, (linha && linha.patch) || {});
  patch.squadFem = Object.assign({}, patch.squadFem || {}, porClube[cid]);
  return {
    pack_id: oficial.id, club_id: cid,
    divisao: (linha && linha.divisao) || divDe[cid],
    novo: (linha && linha.novo) || false,
    patch,
  };
});

const novos = escrever.filter(l => !atual.has(l.club_id)).length;
console.log(`pacote oficial ${oficial.id}: ${escrever.length} clubes a escrever (${novos} sem linha hoje)`);

if (!APLICAR) {
  const [ex] = escrever;
  console.log('amostra:', ex.club_id, '→', Object.keys(ex.patch.squadFem).length, 'jogadoras',
              '| outras chaves do patch preservadas:', Object.keys(ex.patch).filter(k => k !== 'squadFem').join(', ') || '(nenhuma)');
  console.log('\nnada foi escrito. Para aplicar:  SUPABASE_SERVICE_KEY=... node scripts/jogadoras-para-o-pacote.mjs --aplicar');
  process.exit(0);
}

await upsert('pack_edits', escrever, 'pack_id,club_id');
console.log(`escrito. ${escrever.length} clubes com squadFem no ${SCHEMA}.pack_edits.`);
