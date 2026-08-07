/* Injeta public/src/engine/world-rules.js DENTRO do resolve-round, entre marcadores.
   É o que torna "folha única" verdade e não promessa: não há porte manual, e o CI falha se o
   bloco no servidor estiver diferente do arquivo fonte (--check).
   Uso:  node scripts/sync-world-rules.mjs          (escreve)
         node scripts/sync-world-rules.mjs --check  (só verifica; sai 1 se divergir) */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FONTE = resolve(raiz, 'public/src/engine/world-rules.js');
const ALVO  = resolve(raiz, 'supabase/functions/resolve-round/index.ts');
const INI = '/* <<< WORLD_RULES:INICIO — gerado por scripts/sync-world-rules.mjs, NÃO editar aqui >>> */';
const FIM = '/* <<< WORLD_RULES:FIM >>> */';

const fonte = readFileSync(FONTE, 'utf8').trimEnd();
const alvo  = readFileSync(ALVO, 'utf8');

const i = alvo.indexOf(INI), j = alvo.indexOf(FIM);
if (i < 0 || j < 0) {
  console.error('sync-world-rules: marcadores não encontrados em', ALVO);
  process.exit(1);
}
const bloco = INI + '\n' + fonte + '\n' + FIM;
const novo = alvo.slice(0, i) + bloco + alvo.slice(j + FIM.length);

if (process.argv.includes('--check')) {
  if (novo !== alvo) {
    console.error('✘ world-rules DIVERGIU: o bloco no resolve-round não é igual a public/src/engine/world-rules.js');
    console.error('  rode: node scripts/sync-world-rules.mjs');
    process.exit(1);
  }
  console.log('✓ world-rules em dia (cliente e servidor com a mesma folha)');
  process.exit(0);
}
if (novo === alvo) { console.log('✓ world-rules já estava em dia'); }
else { writeFileSync(ALVO, novo); console.log('✓ world-rules injetado no resolve-round'); }
