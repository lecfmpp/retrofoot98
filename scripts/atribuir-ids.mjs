#!/usr/bin/env node
/* O ID DO JOGADOR — atribuído uma vez, gravado no bundle, para sempre.

   POR QUE. O jogador não tinha identidade nenhuma. `pack_edits` casa por nome, as fotos casam
   por nome, e o `pid` que existe desde julho é sequencial POR SAVE (`S._pidSeq`): o mesmo
   Vitor Roque é `p147` num save e `p203` noutro. Serve ao motor, não serve ao catálogo. Sem um
   id que atravesse saves, a foto de uma pessoa é servida a outra — já acontece hoje, em 42
   nomes que existem em mais de um clube.

   O ID NÃO CONTÉM O CLUBE, e essa é a regra que manda em tudo aqui. O jogador é transferido
   durante o save; um id que trouxesse clube, liga ou país quebraria na primeira negociação e
   levaria a foto junto. `jm000001` é opaco de propósito: não significa nada além de "este
   jogador".

   POR QUE ESCREVER NO BUNDLE É SEGURO. Os quatro arquivos têm exatamente uma linha de dados
   cada (`window.X = {...};`), e um round-trip JSON.parse→JSON.stringify devolve os quatro BYTE
   A BYTE idênticos — verificado antes de escrever a primeira vez. Então a única diferença que
   este script pode produzir é o campo que ele acrescenta.

   A PRIMEIRA EXECUÇÃO É POSICIONAL, E ISSO RESOLVE OS HOMÔNIMOS. Não há casamento por nome:
   percorre-se o elenco na ordem e atribui-se o próximo da sequência. É por isso que os dois
   clubes com dois "João Pedro"/"João Vitor" no mesmo elenco não travam nada — eles seriam um
   problema para quem tentasse casar por nome, que é exatamente o que este id vem eliminar.
   Da segunda execução em diante o id já está no arquivo e ninguém precisa casar nada.

   NEM TODO JOGADOR DENTRO DE UM SAVE TEM `id`, E ISSO É O DESENHO. `id` é identidade de
   CATÁLOGO: só tem quem veio de um bundle. Quem nasce em tempo de execução — o completamento
   de posições (`ensureClubPositions`, que dá um terceiro goleiro a um elenco de 20 da Série D),
   as regens da virada, os juvenis — nasce sem `id` e com `pid`, que é a identidade DENTRO do
   save. Medido num mundo montado: 2.796 de 2.889 jogadores com `id`, e os 93 restantes eram
   exatamente um ou dois por clube da Série D, todos do completamento de posição. Isso não é
   buraco: um jogador que não está no catálogo também não tem foto no acervo, que é o que o
   `id` serve para casar.

   SAVES EXISTENTES NÃO SÃO TOCADOS. `newGame()` copia os elencos para dentro de `S.squads`
   quando o jogo nasce; um save já criado carrega a própria cópia e nunca relê o bundle. É o
   mesmo que aconteceu com o `pid`: 11 saves de julho nunca o ganharam e seguem funcionando.

   Uso:  node scripts/atribuir-ids.mjs            (relata o que faria)
         node scripts/atribuir-ids.mjs --gravar   (escreve nos bundles) */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RAIZ } from './_catalogo.mjs';

const GRAVAR = process.argv.includes('--gravar');

/* A ordem é a identidade da sequência: mudá-la faria a próxima execução atribuir ids diferentes
   aos mesmos jogadores. Ela é a mesma de `carregarClubes()`. */
const BUNDLES = [
  { arquivo: 'public/src/data/game-data.js',           global: 'window.GAME_DATA',        clubes: (o) => o.clubs || [] },
  { arquivo: 'public/src/data/leagues-brasil-lower.js', global: 'window.BRASIL_LOWER',     clubes: (o) => ['B','C','D'].flatMap(d => o[d] || []) },
  { arquivo: 'public/src/data/leagues-intl.js',         global: 'window.INTL_LEAGUES',     clubes: (o) => Object.keys(o).flatMap(p => o[p] || []) },
  { arquivo: 'public/src/data/leagues-conmebol.js',     global: 'window.CONMEBOL_LEAGUES', clubes: (o) => Object.keys(o).flatMap(p => o[p] || []) },
];

const PREFIXO = 'jm';
const LARGURA = 6;
const formata = (n) => PREFIXO + String(n).padStart(LARGURA, '0');

/* Lê a linha de dados de um bundle sem tocar no cabeçalho nem no resto do arquivo. */
function abrir(b) {
  const caminho = resolve(RAIZ, b.arquivo);
  const bruto = readFileSync(caminho, 'utf8');
  const linhas = bruto.split('\n');
  const i = linhas.findIndex(l => l.startsWith(b.global));
  if (i < 0) throw new Error(`${b.arquivo}: não achei a linha de ${b.global}`);
  const pre = b.global + ' = ';
  if (!linhas[i].startsWith(pre)) throw new Error(`${b.arquivo}: prefixo inesperado`);
  const obj = JSON.parse(linhas[i].slice(pre.length).replace(/;\s*$/, ''));
  return { caminho, linhas, i, pre, obj };
}

/* Varre o que já existe ANTES de atribuir qualquer coisa: a sequência tem de continuar de onde
   parou, e um id repetido tem de parar o script em vez de virar dois jogadores com a mesma
   identidade. */
let maior = 0;
const usados = new Map();
const repetidos = [];
const abertos = BUNDLES.map(b => ({ b, ...abrir(b) }));

for (const { b, obj } of abertos)
  for (const c of b.clubes(obj))
    for (const p of (c.squad || [])) {
      if (p.id == null) continue;
      if (usados.has(p.id)) repetidos.push(`${p.id}: ${usados.get(p.id)} / ${c.id}|${p.n}`);
      else usados.set(p.id, `${c.id}|${p.n}`);
      const m = /^jm(\d+)$/.exec(String(p.id));
      if (m) maior = Math.max(maior, Number(m[1]));
    }

if (repetidos.length) {
  console.error(`❌ ${repetidos.length} id(s) repetido(s) — nada foi gravado:`);
  repetidos.slice(0, 10).forEach(r => console.error('   ' + r));
  process.exit(1);
}

let novos = 0, jaTinham = usados.size;
const porArquivo = [];

for (const a of abertos) {
  let n = 0;
  for (const c of a.b.clubes(a.obj)) {
    const sq = c.squad || [];
    for (let k = 0; k < sq.length; k++) {
      if (sq[k].id != null) continue;
      /* O id vai na FRENTE do objeto: é o primeiro campo de quem lê o arquivo, e a ordem dos
         demais fica exatamente como estava. */
      sq[k] = { id: formata(++maior), ...sq[k] };
      n++; novos++;
    }
  }
  porArquivo.push({ nome: a.b.arquivo.split('/').pop(), novos: n });
}

console.log(`${jaTinham + novos} jogadores  ·  já tinham id: ${jaTinham}  ·  novos: ${novos}`);
for (const p of porArquivo) console.log(`   ${p.nome.padEnd(26)} ${String(p.novos).padStart(5)}`);

if (!GRAVAR) { console.log('\n(ensaio — use --gravar para escrever nos bundles)'); process.exit(0); }
if (!novos)  { console.log('\n✓ nada a fazer: todo jogador já tem id'); process.exit(0); }

for (const a of abertos) {
  a.linhas[a.i] = a.pre + JSON.stringify(a.obj) + ';';
  writeFileSync(a.caminho, a.linhas.join('\n'));
}
console.log(`\n✎ ${novos} id(s) gravado(s) — de ${formata(jaTinham + 1)} a ${formata(maior)}`);
