#!/usr/bin/env node
/* AUDITORIA DE IDENTIDADE DO CATÁLOGO — o que existe, em que formato, e o que colide.

   POR QUE EXISTE. O jogador não tinha id nenhum: `pack_edits` casa por nome, as fotos casam por
   nome, e o `pid` do motor é sequencial POR SAVE (S._pidSeq), então o mesmo jogador é `p147` num
   save e `p203` noutro — serve ao motor, não serve como identidade de catálogo. O resultado
   aparece em produção: nomes repetidos entre clubes fazem um jogador exibir a foto de outro.

   Este arquivo é a régua. Ele nasce RELATANDO (Fase 1), para medir o tamanho do problema antes
   de encostar em qualquer dado, e passa a REPROVAR (Fase 4, com --exigir-id) depois que todo
   jogador tiver id. A partir daí ele entra no `npm run teste` e nenhum id fora do padrão volta
   a entrar sem que o build caia.

   Uso:  node scripts/auditar-identidade.mjs [--exigir-id]   (sai 1 se reprovar) */
import { carregarClubes, cadaJogador, formatoDoId } from './_catalogo.mjs';

const EXIGIR = process.argv.includes('--exigir-id');
const PADRAO_JOGADOR = /^j[mf]\d{6}$/;

const clubes = carregarClubes();
let falhas = 0;
const reprova = (msg) => { falhas++; console.log('  ✘ ' + msg); };

/* ---------- 1. CLUBES ---------- */
console.log(`1. Clubes: ${clubes.length}`);
const porFormato = {};
const idsClube = new Map();
const dupClube = [];
for (const it of clubes) {
  const f = formatoDoId(it.c.id);
  porFormato[f] = (porFormato[f] || 0) + 1;
  const k = String(it.c.id);
  if (idsClube.has(k)) dupClube.push(k); else idsClube.set(k, it);
}
Object.entries(porFormato).sort((a, b) => b[1] - a[1])
  .forEach(([f, n]) => console.log(`   ${String(n).padStart(4)}  ${f}`));
if (dupClube.length) reprova(`club_id repetido: ${[...new Set(dupClube)].join(', ')}`);

/* ---------- 2. JOGADORES E IDS ---------- */
const jogadores = [...cadaJogador(clubes)];
const comId = jogadores.filter(j => j.p.id != null);
console.log(`\n2. Jogadores: ${jogadores.length}  ·  com id: ${comId.length}  ·  sem id: ${jogadores.length - comId.length}`);

const vistos = new Map();
const idsRepetidos = [];
const foraDoPadrao = [];
for (const j of comId) {
  const id = String(j.p.id);
  if (!PADRAO_JOGADOR.test(id)) foraDoPadrao.push(`${id} (${j.p.n} / ${j.c.short || j.c.name})`);
  if (vistos.has(id)) idsRepetidos.push(`${id}: "${vistos.get(id)}" e "${j.p.n}"`);
  else vistos.set(id, j.p.n);
}

if (EXIGIR) {
  if (comId.length !== jogadores.length) reprova(`${jogadores.length - comId.length} jogador(es) sem id`);
  if (idsRepetidos.length) reprova(`${idsRepetidos.length} id(s) repetido(s):\n      ` + idsRepetidos.slice(0, 10).join('\n      '));
  if (foraDoPadrao.length) reprova(`${foraDoPadrao.length} id(s) fora do padrão jm/jf + 6 dígitos:\n      ` + foraDoPadrao.slice(0, 10).join('\n      '));
} else {
  if (idsRepetidos.length) console.log(`   ⚠ ${idsRepetidos.length} id(s) repetido(s)`);
  if (foraDoPadrao.length) console.log(`   ⚠ ${foraDoPadrao.length} id(s) fora do padrão`);
}

/* ---------- 3. NOMES — a identidade de fato usada hoje ----------
   Duas medidas diferentes, e só a primeira é um defeito:
   · repetido DENTRO do mesmo clube quebra o casamento por nome do pack_edits, porque não há
     como saber de qual dos dois se está falando (o id, por ser posicional, não se importa);
   · repetido ENTRE clubes é o que faz RF_FOTOS_NOME (o índice global por nome, dados.js) servir
     a foto do jogador errado. É o número que a leitura por id vem corrigir. */
const porClube = new Map();
const globalNomes = new Map();
for (const j of jogadores) {
  const ck = String(j.c.id);
  if (!porClube.has(ck)) porClube.set(ck, new Map());
  const m = porClube.get(ck);
  m.set(j.p.n, (m.get(j.p.n) || 0) + 1);
  if (!globalNomes.has(j.p.n)) globalNomes.set(j.p.n, new Set());
  globalNomes.get(j.p.n).add(ck);
}
const dentroDoClube = [];
for (const [ck, m] of porClube) for (const [nome, n] of m) if (n > 1) dentroDoClube.push(`${nome} ×${n} em ${ck}`);
const entreClubes = [...globalNomes].filter(([, s]) => s.size > 1);

console.log(`\n3. Nomes`);
console.log(`   ${jogadores.length} jogadores  ·  ${globalNomes.size} nomes distintos`);
console.log(`   repetidos DENTRO do mesmo clube: ${dentroDoClube.length}  ${dentroDoClube.length ? '← bloqueiam o casamento por nome' : ''}`);
console.log(`   repetidos ENTRE clubes:          ${entreClubes.length}  ← servidos pela foto errada hoje (RF_FOTOS_NOME)`);
dentroDoClube.slice(0, 10).forEach(s => console.log(`     · ${s}`));

/* HOMONIMO NAO REPROVA — e essa decisao mudou durante a Fase 4. A regra antiga supunha que a
   atribuicao de id casaria por (club_id, nome), e dois "Joao Pedro" no mesmo elenco travariam
   tudo. A atribuicao acabou sendo POSICIONAL — percorre o elenco na ordem e numera —, entao
   homonimo nunca foi obstaculo para ela. Mais: e' precisamente o caso que o id resolve.

   Continua sendo aviso porque `pack_edits` ainda casa por nome (dados.js) e continua ambiguo
   nesses dois elencos. E' divida conhecida e pre-existente; travar o build por ela pararia o
   deploy por uma condicao que ja' estava la' antes deste trabalho comecar. */
if (dentroDoClube.length) console.log(`   ⚠ homônimo no mesmo elenco não impede o id (que é posicional), mas mantém pack_edits ambíguo nesses clubes`);

console.log();
if (falhas) { console.log(`✘ auditoria de identidade reprovou (${falhas})`); process.exit(1); }
console.log(EXIGIR ? '✓ identidade em ordem' : '✓ relatório gerado (modo relato — use --exigir-id para reprovar)');
