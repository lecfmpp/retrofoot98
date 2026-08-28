/* ============================================================================
   TESTE DO PATCH DE NOMES FICTÍCIOS
   ----------------------------------------------------------------------------
   Carrega o net/dados.js DE VERDADE (com window/fetch/localStorage de mentira),
   aplica o patch gerado por scripts/nomes-ficticios.mjs em cima do catálogo de
   fábrica e confere três coisas:

     1. todo jogador da planilha ficou com o nome novo;
     2. nenhum nome real sobrou nos 80 clubes brasileiros — inclusive os dois
        pares de homônimos, que é onde a chave `##N` é testada;
     3. aplicar duas vezes dá o mesmo resultado (o pacote é reaplicado a cada
        boot a partir do cache do localStorage).

   Uso:  node scripts/teste-nomes-ficticios.mjs
   ========================================================================= */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const RAIZ = path.resolve(import.meta.dirname, '..');
const tmp = path.join(os.tmpdir(), 'nomes-ficticios-patch.json');
execFileSync('node', [path.join(RAIZ, 'scripts/nomes-ficticios.mjs'), '--json', tmp], { stdio:'inherit' });
const edits = JSON.parse(fs.readFileSync(tmp, 'utf8'));

/* --- bancada: só o que dados.js toca no carregamento ---------------------- */
function bundle(rel){
  const s = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  return JSON.parse(s.slice(s.indexOf('=') + 1).trim().replace(/;\s*$/, ''));
}
const janela = {
  GAME_DATA: bundle('public/src/data/game-data.js'),
  BRASIL_LOWER: bundle('public/src/data/leagues-brasil-lower.js'),
  UNIVERSOS: {},
  localStorage: { getItem: () => null, setItem: () => {} }
};
globalThis.window = janela;
globalThis.localStorage = janela.localStorage;
globalThis.fetch = () => new Promise(() => {});          // rede nunca responde
const aviso = console.warn; console.warn = () => {};
new Function(fs.readFileSync(path.join(RAIZ, 'public/src/net/dados.js'), 'utf8'))();
console.warn = aviso;

const RF = janela.RF_PACKS;
if(!RF || typeof RF.aplicar !== 'function') throw new Error('RF_PACKS não subiu');

/* --- estado antes, para saber o que tem de mudar -------------------------- */
const antes = new Map();   // club_id -> [nomes]
for(const e of edits) antes.set(e.club_id, RF.acharClube(e.club_id).squad.map(p => p.n));

const n1 = RF.aplicar(edits);
const depois1 = new Map();
for(const e of edits) depois1.set(e.club_id, RF.acharClube(e.club_id).squad.map(p => p.n));
RF.aplicar(edits);                                        // idempotência

/* --- conferência ---------------------------------------------------------- */
const falhas = [];
if(n1 !== edits.length) falhas.push(`aplicar() tocou ${n1} clubes, esperado ${edits.length}`);

for(const e of edits){
  const novos = new Set(Object.values(e.patch.squad).map(v => v.n));
  const atual = RF.acharClube(e.club_id).squad.map(p => p.n);

  for(const n of novos) if(!atual.includes(n)) falhas.push(`${e.club_id}: nome novo ausente — ${n}`);

  /* a planilha cobre o elenco inteiro, então NENHUM jogador pode ter escapado.
     Conferimos jogador a jogador (`_n0` gravado, nome corrente diferente do de
     fábrica) e não por lista de nomes: a planilha REUSA cinco nomes reais como
     nome novo de outro jogador do mesmo clube — "Bruno Melo" continua existindo
     no Curitiba FC, mas é o Renato Marques renomeado, não o Bruno Melo original. */
  for(const p of RF.acharClube(e.club_id).squad){
    if(p._n0 === undefined) falhas.push(`${e.club_id}: jogador não renomeado — ${p.n}`);
    else if(p._n0 === p.n)  falhas.push(`${e.club_id}: renomeado para o mesmo nome — ${p.n}`);
  }

  const d1 = depois1.get(e.club_id);
  if(atual.join('|') !== d1.join('|')) falhas.push(`${e.club_id}: segunda aplicação mudou o elenco`);

  const repetidos = atual.filter((x,i) => atual.indexOf(x) !== i);
  if(repetidos.length) falhas.push(`${e.club_id}: nome repetido depois do patch — ${repetidos.join(', ')}`);
}

if(falhas.length){
  console.error(`\nFALHOU — ${falhas.length} problema(s):`);
  falhas.slice(0, 40).forEach(f => console.error('  · ' + f));
  process.exit(1);
}
const total = edits.reduce((s,e) => s + Object.keys(e.patch.squad).length, 0);
console.log(`\nOK — ${edits.length} clubes, ${total} jogadores renomeados, nenhum nome real restante, reaplicação estável.`);
