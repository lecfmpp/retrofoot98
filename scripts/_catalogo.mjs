/* CARREGADOR DO CATÁLOGO DE FÁBRICA — a folha única de "quem são os clubes e jogadores".

   POR QUE EXISTE. Três scripts precisam ler os mesmos quatro bundles (auditoria de identidade,
   atribuição de ids, geração do bundle feminino). Cada um carregando à sua maneira é o padrão de
   "três cópias da mesma regra" que os cabeçalhos de world-rules.js e world-config.js apontam
   como a causa histórica dos bugs de calendário. Aqui é uma leitura só.

   O QUE ELE NÃO FAZ: não aplica `pack_edits`. O que sai daqui é a FÁBRICA, tal como está nos
   arquivos. Quem precisa do catálogo corrigido tem de aplicar o pacote por cima — e é de
   propósito que isso seja uma decisão explícita de quem chama, não um efeito colateral. */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* Os bundles são `window.X = {...}` numa linha só, gerados por scraping. Um contexto de VM com
   um `window` vazio basta — e é o mesmo truque que scripts/arena-brasil.mjs já usa. */
function carregarBundle(rel) {
  const ctx = { window: {} };
  ctx.globalThis = ctx;
  runInNewContext(readFileSync(resolve(RAIZ, rel), 'utf8'), ctx);
  return ctx.window;
}

export const ARQUIVOS = {
  serieA:  'public/src/data/game-data.js',
  lower:   'public/src/data/leagues-brasil-lower.js',
  intl:    'public/src/data/leagues-intl.js',
  conmebol:'public/src/data/leagues-conmebol.js',
};

/* Devolve a lista PLANA de clubes, cada um com de onde veio. `c` é a REFERÊNCIA VIVA ao objeto
   dentro do bundle — quem for gravar (atribuir-ids) escreve nela e depois reserializa o arquivo;
   quem for só ler não deve mutar. `arquivo` diz qual bundle reserializar. */
export function carregarClubes() {
  const out = [];
  const A = carregarBundle(ARQUIVOS.serieA).GAME_DATA;
  (A?.clubs || []).forEach(c => out.push({ c, pais: 'Brasil', div: 'A', arquivo: 'serieA' }));

  const LOW = carregarBundle(ARQUIVOS.lower).BRASIL_LOWER || {};
  for (const d of ['B', 'C', 'D']) (LOW[d] || []).forEach(c => out.push({ c, pais: 'Brasil', div: d, arquivo: 'lower' }));

  const IL = carregarBundle(ARQUIVOS.intl).INTL_LEAGUES || {};
  for (const pais in IL) (IL[pais] || []).forEach(c => out.push({ c, pais, div: c.lg || '—', arquivo: 'intl' }));

  const CB = carregarBundle(ARQUIVOS.conmebol).CONMEBOL_LEAGUES || {};
  for (const pais in CB) (CB[pais] || []).forEach(c => out.push({ c, pais, div: c.lg || '—', arquivo: 'conmebol' }));

  return out;
}

/* O FORMATO DO ID DE CLUBE. Cinco convenções conviveram ao longo do projeto e nenhuma delas é
   renomeável hoje: o club_id está gravado como texto dentro de player_photos, pack_edits, do
   JSON dos solo_saves e do shared_state das salas. Aqui elas são apenas CLASSIFICADAS, para que
   a bagunça fique visível e auditável em vez de espalhada. */
export function formatoDoId(id) {
  const s = String(id ?? '');
  if (/^\d+$/.test(s))      return 'numerico';   // Série A — id do Transfermarkt
  if (s.startsWith('br_'))  return 'br';         // Séries B/C/D
  if (s.startsWith('intl_'))return 'intl';       // Europa
  if (s.startsWith('cmb_')) return 'cmb';        // CONMEBOL
  if (s.startsWith('proc_'))return 'proc';       // procedural
  if (s.startsWith('cf_'))  return 'cf';         // clube feminino
  return 'outro';
}

/* Percorre todos os jogadores de todos os clubes. Um lugar só para quem quiser contar, validar
   ou escrever — sem que cada script reinvente o laço duplo. */
export function* cadaJogador(clubes) {
  for (const item of clubes) {
    const squad = item.c.squad || [];
    for (let i = 0; i < squad.length; i++) yield { ...item, p: squad[i], idx: i };
  }
}

/* ---------- O CATÁLOGO COMO O JOGADOR VÊ: FÁBRICA + PACOTE ----------

   POR QUE ISTO É NECESSÁRIO. O pacote oficial não faz ajustes de canto: ele RENOMEIA quase tudo
   — clubes e jogadores ganham nomes fictícios. Uma auditoria que compare o acervo de fotos com a
   fábrica pura conclui que quase nada casa, porque as fotos foram geradas sobre o catálogo já
   corrigido. O que vale como "quem existe" é fábrica + pacote.

   E O PACOTE NÃO É REIMPLEMENTADO AQUI. `net/dados.js` expõe `window.RF_PACKS.aplicar`, e é essa
   função — a mesma que roda no navegador — que é carregada num contexto de VM e chamada. Uma
   segunda implementação da resolução de nomes (com a âncora `_n0` e o sufixo `##N` dos
   homônimos) seria a terceira cópia da mesma regra, que é o padrão que os cabeçalhos de
   world-rules.js e world-config.js apontam como a causa histórica dos bugs.

   Depois de aplicado, cada jogador renomeado carrega `_n0` = nome de fábrica; `p.n` é o nome
   corrente. É esse par que liga uma foto (gravada com o nome corrente) ao jogador de fábrica. */
export function carregarComPacote(edits) {
  const win = {};
  const ctx = { window: win, console,
    /* Sem rede e sem armazenamento: `dados.js` busca o pacote sozinho ao carregar, e aqui quem
       manda as edições é quem chama. Os stubs fazem esse caminho automático virar no-op. */
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    fetch: () => Promise.reject(new Error('sem rede na bancada')),
    setTimeout, clearTimeout };
  ctx.globalThis = ctx;

  for (const rel of Object.values(ARQUIVOS)) runInNewContext(readFileSync(resolve(RAIZ, rel), 'utf8'), ctx);
  runInNewContext(readFileSync(resolve(RAIZ, 'public/src/data/universos.js'), 'utf8'), ctx);
  runInNewContext(readFileSync(resolve(RAIZ, 'public/src/net/dados.js'), 'utf8'), ctx);

  if (!win.RF_PACKS || !win.RF_PACKS.aplicar) throw new Error('RF_PACKS.aplicar não foi exposto por dados.js');
  const aplicadas = win.RF_PACKS.aplicar(edits || []);

  const out = [];
  (win.GAME_DATA?.clubs || []).forEach(c => out.push({ c, pais: 'Brasil', div: 'A', arquivo: 'serieA' }));
  const LOW = win.BRASIL_LOWER || {};
  for (const d of ['B', 'C', 'D']) (LOW[d] || []).forEach(c => out.push({ c, pais: 'Brasil', div: d, arquivo: 'lower' }));
  for (const [glob, arq] of [[win.INTL_LEAGUES, 'intl'], [win.CONMEBOL_LEAGUES, 'conmebol']])
    for (const pais in (glob || {})) (glob[pais] || []).forEach(c => out.push({ c, pais, div: c.lg || '—', arquivo: arq }));

  return { clubes: out, aplicadas };
}
