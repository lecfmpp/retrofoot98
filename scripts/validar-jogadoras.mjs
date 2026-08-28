#!/usr/bin/env node
/* VALIDADOR DA BASE DE JOGADORAS — a porta de entrada do universo feminino.

   POR QUE EXISTE. A planilha é a fonte do elenco feminino inteiro, e um erro nela só apareceria
   dentro do jogo, tarde: um elenco com 19 jogadoras não escala, uma posição fora da tabela vira
   jogadora sem setor, e um NOME REPETIDO corrompe artilharia e escalação — o motor ainda
   identifica jogador por nome em vários pontos (S.scorers, negociações, disputa de pênaltis).

   E POR QUE A UNICIDADE É CONTRA O CATÁLOGO COM O PACOTE. O pacote oficial renomeia 1.870 dos
   1.900 jogadores brasileiros, e usa o mesmo estilo de apelido da base feminina — "Muralha",
   "Pantera", "Furacão". Comparar só com a fábrica encontraria 2 colisões e deixaria passar 30.
   Os dois conjuntos contam: o nome corrente e o de fábrica (`_n0`), porque uma foto ou um patch
   antigo pode se referir a qualquer um dos dois.

   Uso:  node scripts/validar-jogadoras.mjs [caminho.csv]     (sai 1 se reprovar)
         node scripts/validar-jogadoras.mjs entrada.csv --corrigir saida.csv */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ler } from './_supabase.mjs';
import { carregarComPacote, cadaJogador, RAIZ } from './_catalogo.mjs';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const ENTRADA = resolve(args[0] || 'dados-fonte/jogadoras-brasil.csv');
const iCorrigir = process.argv.indexOf('--corrigir');
const SAIDA = iCorrigir >= 0 ? resolve(process.argv[iCorrigir + 1] || ENTRADA) : null;

/* Estrutura esperada, medida no catálogo masculino: as duas pirâmides são iguais. */
const ELENCO = { A: 30, B: 25, C: 20, D: 20 };
const CLUBES_POR_DIV = 20;
const POSICOES = ['GOL','ZAG','LAD','LAE','VOL','MC','MEI','PD','PE','SA','CA'];
const SETORES = ['GK','DEF','MID','ATT'];

/* SUBSTITUIÇÕES DE NOME. Trinta apelidos da base feminina existem também no masculino. Como o
   nome é a chave de identidade em boa parte do motor, dois jogadores homônimos em mundos
   diferentes ainda assim disputam o índice global de fotos por nome (RF_FOTOS_NOME, dados.js).
   A troca preserva o estilo — apelido curto continua apelido curto — e é uma tabela explícita,
   e não uma regra automática, porque nome é coisa que se lê e se escolhe. */
const TROCAS = {
  Rafa:'Rafaella', Deni:'Denise', Duda:'Eduarda', Dri:'Driele', Dani:'Daniela',
  Rafinha:'Rafinha Dias', Mila:'Milena',
  Xerife:'Xerifa', 'Furacão':'Ventania', Brasa:'Fagulha', Piolho:'Pulguinha', Bala:'Estopim',
  Prata:'Platina', Bronze:'Cobre', Flecha:'Setinha', Parede:'Trave', Rocha:'Pedra',
  Foguetinho:'Foguetinha', Diamante:'Esmeralda', 'Canhão':'Bazuca', Tronco:'Raiz',
  'Relâmpago':'Trovoada', Besouro:'Vespa', Bode:'Corça', Palito:'Agulha', Formiga:'Abelha',
  Muralha:'Barreira', Foguinho:'Chama', Pantera:'Tigresa', Fera:'Selvagem',
};

/* ---------- leitura ---------- */
const bruto = readFileSync(ENTRADA, 'utf8').replace(/^﻿/, '');
const linhas = bruto.split(/\r?\n/).filter(l => l.trim());
const cab = linhas[0].split(';');
const rows = linhas.slice(1).map(l => { const c = l.split(';'); const o = {}; cab.forEach((h, i) => o[h] = c[i]); return o; });

let falhas = 0;
const reprova = (m) => { falhas++; console.log('  ✘ ' + m); };
console.log(`Base: ${ENTRADA.replace(RAIZ + '/', '')}  ·  ${rows.length} linhas\n`);

/* ---------- 1. ESTRUTURA ---------- */
console.log('1. Estrutura');
const porClube = new Map();
for (const r of rows) {
  if (!porClube.has(r.clube_id)) porClube.set(r.clube_id, []);
  porClube.get(r.clube_id).push(r);
}
const porDiv = {};
for (const [id, sq] of porClube) {
  const d = sq[0].serie;
  (porDiv[d] = porDiv[d] || []).push(id);
  if (sq.length !== ELENCO[d]) reprova(`clube ${id} (série ${d}): ${sq.length} jogadoras, esperado ${ELENCO[d]}`);
}
for (const d of Object.keys(ELENCO)) {
  const n = (porDiv[d] || []).length;
  console.log(`   série ${d}: ${String(n).padStart(2)} clubes × ${ELENCO[d]} = ${n * ELENCO[d]}`);
  if (n !== CLUBES_POR_DIV) reprova(`série ${d} tem ${n} clubes, esperado ${CLUBES_POR_DIV}`);
}

/* ---------- 2. POSIÇÕES ---------- */
console.log('\n2. Posições');
const posRuins = rows.filter(r => !POSICOES.includes(r.posicao));
const setRuins = rows.filter(r => !SETORES.includes(r.setor));
if (posRuins.length) reprova(`${posRuins.length} posição(ões) fora da tabela: ${[...new Set(posRuins.map(r => r.posicao))].join(', ')}`);
if (setRuins.length) reprova(`${setRuins.length} setor(es) fora da tabela: ${[...new Set(setRuins.map(r => r.setor))].join(', ')}`);
if (!posRuins.length && !setRuins.length) console.log('   todas válidas');

/* ---------- 3. CLUBES CASAM COM O MASCULINO ---------- */
const packs = await ler('data_packs', { select: 'id,oficial,nome' });
const oficial = packs.find(p => p.oficial) || packs[0];
const edits = (await ler('pack_edits', { select: '*' })).filter(e => e.pack_id === oficial?.id);
const { clubes } = carregarComPacote(edits);
const porId = new Map(clubes.map(x => [String(x.c.id), x]));

console.log('\n3. Clubes');
const semBase = [...porClube.keys()].filter(id => !porId.has(String(id)));
const divErrada = [...porClube.entries()].filter(([id, sq]) => porId.has(String(id)) && porId.get(String(id)).div !== sq[0].serie);
console.log(`   ${porClube.size} clubes  ·  casam com o masculino: ${porClube.size - semBase.length}`);
if (semBase.length) reprova(`${semBase.length} clube(s) sem correspondente masculino: ${semBase.slice(0, 5).join(', ')}`);
if (divErrada.length) reprova(`${divErrada.length} clube(s) em divisão diferente do masculino`);

/* ---------- 4. NOMES ---------- */
const masculinos = new Set();
for (const j of cadaJogador(clubes)) { masculinos.add(j.p.n); if (j.p._n0 !== undefined) masculinos.add(j.p._n0); }

console.log(`\n4. Nomes  (universo masculino: ${masculinos.size} nomes, correntes + de fábrica)`);
const conta = new Map();
for (const r of rows) conta.set(r.jogador, (conta.get(r.jogador) || 0) + 1);
const repetidos = [...conta].filter(([, n]) => n > 1);
const colidem = [...conta.keys()].filter(n => masculinos.has(n));

console.log(`   distintos:            ${conta.size} de ${rows.length}`);
console.log(`   repetidos entre si:   ${repetidos.length}`);
console.log(`   colidem com o masc.:  ${colidem.length}`);
if (repetidos.length) reprova(`repetidos: ${repetidos.slice(0, 8).map(([n, q]) => `${n} ×${q}`).join(', ')}`);

/* ---------- 5. CORREÇÃO ----------
   Não basta o substituto não existir no masculino: ele também não pode já existir entre as
   jogadoras, senão a troca conserta uma colisão criando outra. */
if (colidem.length) {
  const semTroca = colidem.filter(n => !TROCAS[n]);
  if (semTroca.length) reprova(`${semTroca.length} nome(s) colidem e não têm substituto na tabela TROCAS: ${semTroca.join(', ')}`);

  const usados = new Set(conta.keys());
  const ruins = [];
  for (const [de, para] of Object.entries(TROCAS)) {
    if (masculinos.has(para)) ruins.push(`${para} (substituto de ${de}) já existe no masculino`);
    if (usados.has(para) && para !== de) ruins.push(`${para} (substituto de ${de}) já existe entre as jogadoras`);
  }
  ruins.forEach(r => reprova(r));

  if (SAIDA && !ruins.length && !semTroca.length) {
    let trocadas = 0;
    for (const r of rows) if (TROCAS[r.jogador]) { r.jogador = TROCAS[r.jogador]; trocadas++; }
    const saida = '﻿' + [cab.join(';'), ...rows.map(r => cab.map(h => r[h] ?? '').join(';'))].join('\r\n') + '\r\n';
    writeFileSync(SAIDA, saida, 'utf8');
    console.log(`\n   ✎ ${trocadas} nome(s) trocado(s) → ${SAIDA.replace(RAIZ + '/', '')}`);
    console.log('     rode de novo, sem --corrigir, para conferir.');
    falhas = 0;   // a correção foi o pedido; a conferência é a próxima execução
  } else if (!SAIDA) {
    console.log(`   ${colidem.length} para trocar (use --corrigir <saida.csv>): ${colidem.slice(0, 12).join(', ')}${colidem.length > 12 ? '…' : ''}`);
  }
}

console.log();
if (falhas) { console.log(`✘ base de jogadoras reprovou (${falhas})`); process.exit(1); }
console.log('✓ base de jogadoras válida');
