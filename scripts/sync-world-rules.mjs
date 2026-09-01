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
  /* O MOTOR DE PARTIDA. Era colado na mão, e o comentário dizia "fonte única" como
     promessa: bastava esquecer a cópia para cliente e servidor decidirem partidas
     de formas diferentes. Agora é injetado como as outras folhas, e o --check
     reprova o build se divergirem. */
  { nome: 'MATCH_ENGINE', arquivo: 'public/src/engine/match-engine.js' },
  { nome: 'CALENDARIOS',  arquivo: 'public/src/engine/calendars.js' },
  { nome: 'WORLD_RULES',  arquivo: 'public/src/engine/world-rules.js' },
  { nome: 'UNIVERSOS',    arquivo: 'public/src/data/universos.js' },
  /* O UNIVERSO FEMININO. Sem esta folha o servidor não conhece `brasilFem`, e uniCfg() cai no
     universo PADRÃO — que não declara `src:'conmebol'`. O efeito medido: copasDe('brasilFem')
     devolvia ["championsLeague","europaLeague"], ou seja, uma sala feminina na Resenha jogaria
     Champions e Europa no lugar de Copa do Brasil, Libertadores e Sul-Americana. É o mesmo erro
     que a Fase 8 corrigiu no cliente; faltava o outro lado. DEPOIS de UNIVERSOS: o arquivo
     estende `root.UNIVERSOS` e desiste se ele ainda não existir. */
  { nome: 'UNIVERSOS_FEM', arquivo: 'public/src/data/universos-fem.js' },
  { nome: 'WORLD_CONFIG', arquivo: 'public/src/engine/world-config.js' },
  /* A FOLHA FEMININA — o cabeçalho dela sempre disse "esta folha vai para o servidor", mas ela
     nunca tinha sido registrada aqui. Traz COPA_NACIONAL.brasilFem e NAME_POOLS.brasilFem: sem o
     segundo, nomesDoPais('brasilFem') caía em _hispano e a virada de temporada de um mundo
     feminino gerava reforços com nome masculino (Martín, Diego, Franco). DEPOIS de WORLD_CONFIG,
     que é o objeto que ela estende. */
  { nome: 'WORLD_CONFIG_FEM', arquivo: 'public/src/engine/world-config-fem.js' },
  /* AS TABELAS DE ECONOMIA. Eram copiadas À MÃO para dentro do resolve-round — receita, salário,
     capacidade, OPEX, bônus de resultado e premiação de liga — com um comentário lá avisando que
     "qualquer mexida aqui precisa ser refletida no cliente". Bastava esquecer a cópia para o caixa
     da CPU divergir do caixa do humano no meio da Resenha, sem erro nenhum aparecer. Agora são
     folha, como as outras, e o --check reprova o build se divergirem.
     DEPOIS de WORLD_CONFIG: REBAL.bandKey lê WORLD_CONFIG.bandaDaDivisaoSemPais. */
  { nome: 'REBALANCE',    arquivo: 'public/src/data/rebalance.js' },
  { nome: 'PRIZES',       arquivo: 'public/src/data/prizes.js' },
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
