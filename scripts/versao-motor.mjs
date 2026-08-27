/* CARIMBO DE VERSÃO DO MOTOR — o que impede dois humanos de jogarem a MESMA sala
   com regras diferentes.

   O PROBLEMA: o Firebase serve o build novo, mas quem já está com a aba aberta segue
   com o JavaScript velho até recarregar. Publicar no meio de uma Resenha deixa um
   jogador com o motor novo e o outro com o antigo. Enquanto tudo é decidido no
   servidor isso passa batido; no instante em que o cliente antecipa qualquer coisa,
   os dois veem jogos diferentes — e ninguém descobre por quê.

   A IDEIA: um carimbo que muda SÓ quando o motor muda. Trocar uma cor não obriga
   ninguém a recarregar; mexer no TACTIC_BETA obriga. O carimbo é o hash do conteúdo
   que decide partida — não a data do build, que mudaria a cada deploy.

   Uso:  node scripts/versao-motor.mjs           (escreve o carimbo nos dois lados)
         node scripts/versao-motor.mjs --check   (só verifica; sai 1 se desatualizado) */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/* O CARIMBO NÃO PODE ENTRAR NO PRÓPRIO HASH. Ele é gravado dentro de um arquivo que
   também é medido — sem apagá-lo antes, escrever o valor mudaria o hash que acabou
   de ser calculado, e o --check nunca daria em dia. */
const SEM_CARIMBO = /(\/\* @motor-ver \*\/ *const \w+ *= *')[0-9a-f]*(')/g;
const ler = (p) => readFileSync(resolve(raiz, p), 'utf8').replace(SEM_CARIMBO, '$1$2');

/* AS FONTES DO CARIMBO. Só entra aqui o que muda o RESULTADO de uma partida.
   Acrescentar um arquivo novo é acrescentar uma linha — mas pense antes: cada
   arquivo aqui é um motivo a mais para pedir recarga aos jogadores. */
const FONTES = [
  'public/src/engine/match-engine.js',
  'public/src/engine/simulate.js',
];
/* De index.html e do resolve-round só entram os TRECHOS do motor: o arquivo inteiro
   mudaria o carimbo por qualquer edição de tela. */
const TRECHOS = [
  ['public/index.html', /const ATTR_KEYS=[\s\S]*?function attachAttrs/],
  ['public/index.html', /function ratings\(id, useXI\)\{[\s\S]*?return \{OS,MS,DS/],
];

function calcular() {
  const h = createHash('sha256');
  for (const f of FONTES) h.update(ler(f));
  for (const [f, re] of TRECHOS) {
    const m = ler(f).match(re);
    if (!m) throw new Error(`trecho do motor não encontrado em ${f} — o regex de versao-motor.mjs precisa ser ajustado`);
    h.update(m[0]);
  }
  return h.digest('hex').slice(0, 12);
}

/* onde o carimbo é gravado, entre marcadores, nos dois lados */
const ALVOS = [
  { arquivo: 'public/index.html',
    marca: /(\/\* @motor-ver \*\/ *const RF_MOTOR_VER *= *')[0-9a-f]*(')/ },
  { arquivo: 'supabase/functions/resolve-round/index.ts',
    marca: /(\/\* @motor-ver \*\/ *const MOTOR_VER *= *')[0-9a-f]*(')/ },
];

/* MODO --servidor: usado pelo CI que publica as edge functions a partir do `main`,
   onde o cliente NÃO está presente (o jogo vive noutro ramo). Ali não dá para
   recalcular o hash — dá para exigir que o carimbo do servidor exista e não esteja
   vazio, o que pega o caso real: alguém publicar um resolve-round que nunca passou
   pelo stamper. A igualdade entre os dois lados é garantida no `npm run build`. */
if (process.argv.includes('--servidor')) {
  const alvo = ALVOS.find(a => a.arquivo.includes('resolve-round'));
  const m = readFileSync(resolve(raiz, alvo.arquivo), 'utf8').match(alvo.marca);
  const v = m && m[0].split("'")[1];
  if (!v) {
    console.error('✗ resolve-round sem carimbo de motor — rode `node scripts/versao-motor.mjs` no ramo do jogo antes de publicar.');
    process.exit(1);
  }
  console.log(`✓ resolve-round carimbado (${v})`);
  process.exit(0);
}

const ver = calcular();
const checar = process.argv.includes('--check');
let divergiu = 0;

for (const { arquivo, marca } of ALVOS) {
  const caminho = resolve(raiz, arquivo);
  const src = readFileSync(caminho, 'utf8');
  const m = src.match(marca);
  if (!m) {
    console.error(`✗ ${arquivo}: marcador /* @motor-ver */ não encontrado`);
    process.exit(1);
  }
  const atual = m[0].split("'")[1];
  if (atual === ver) continue;
  if (checar) {
    console.error(`✗ ${arquivo}: carimbo ${atual || '(vazio)'} — o motor mudou e vale ${ver}`);
    divergiu++;
  } else {
    writeFileSync(caminho, src.replace(marca, `$1${ver}$2`));
    console.log(`✓ ${arquivo}: carimbo ${atual || '(vazio)'} → ${ver}`);
  }
}

if (checar) {
  if (divergiu) {
    console.error('\nRode: node scripts/versao-motor.mjs   e publique cliente e servidor juntos.');
    process.exit(1);
  }
  console.log(`✓ carimbo do motor em dia nos dois lados (${ver})`);
} else if (!divergiu) {
  console.log(`✓ carimbo do motor: ${ver}`);
}
