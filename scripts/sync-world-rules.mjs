/* Injeta as FOLHAS COMPARTILHADAS (regras de mundo, universos, configuração de país) DENTRO do
   resolve-round, entre marcadores.
   É o que torna "folha única" verdade e não promessa: não há porte manual, e o CI falha se o
   bloco no servidor estiver diferente do arquivo fonte (--check).
   Uso:  node scripts/sync-world-rules.mjs          (escreve)
         node scripts/sync-world-rules.mjs --check  (só verifica; sai 1 se divergir) */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ALVO = resolve(raiz, 'supabase/functions/resolve-round/index.ts');

/* AS FOLHAS. Cada uma tem o seu par de marcadores no resolve-round. Acrescentar uma folha nova é
   acrescentar uma linha aqui e o par de marcadores lá — não há mais nada a fazer.
   A ORDEM importa: o bloco é colado tal e qual, então uma folha que leia outra tem de vir depois.
   `world-config.js` lê UNIVERSOS preguiçosamente (dentro das funções), mas manter a ordem de
   dependência declarada evita ter de descobrir isso de novo mais tarde. */
const FOLHAS = [
  { nome: 'CALENDARIOS',  arquivo: 'public/src/engine/calendars.js' },
  { nome: 'WORLD_RULES',  arquivo: 'public/src/engine/world-rules.js' },
  { nome: 'UNIVERSOS',    arquivo: 'public/src/data/universos.js' },
  { nome: 'WORLD_CONFIG', arquivo: 'public/src/engine/world-config.js' },
];

const conferir = process.argv.includes('--check');
let alvo = readFileSync(ALVO, 'utf8');
const divergentes = [];

for (const f of FOLHAS) {
  const INI = `/* <<< ${f.nome}:INICIO — gerado por scripts/sync-world-rules.mjs, NÃO editar aqui >>> */`;
  const FIM = `/* <<< ${f.nome}:FIM >>> */`;
  const i = alvo.indexOf(INI), j = alvo.indexOf(FIM);
  if (i < 0 || j < 0) {
    console.error(`sync-world-rules: marcadores de ${f.nome} não encontrados em ${ALVO}`);
    console.error(`  esperado:\n  ${INI}\n  ${FIM}`);
    process.exit(1);
  }
  const fonte = readFileSync(resolve(raiz, f.arquivo), 'utf8').trimEnd();
  const antes = alvo;
  alvo = alvo.slice(0, i) + INI + '\n' + fonte + '\n' + FIM + alvo.slice(j + FIM.length);
  if (alvo !== antes) divergentes.push(f);
}

if (conferir) {
  if (divergentes.length) {
    console.error('✘ folha(s) DIVERGIRAM entre o cliente e o resolve-round:');
    divergentes.forEach((f) => console.error(`    ${f.nome}  (${f.arquivo})`));
    console.error('  rode: node scripts/sync-world-rules.mjs');
    process.exit(1);
  }
  console.log(`✓ ${FOLHAS.length} folha(s) em dia (cliente e servidor com o mesmo código)`);
  process.exit(0);
}
if (!divergentes.length) { console.log('✓ folhas já estavam em dia'); }
else {
  writeFileSync(ALVO, alvo);
  console.log(`✓ injetado no resolve-round: ${divergentes.map((f) => f.nome).join(', ')}`);
}
