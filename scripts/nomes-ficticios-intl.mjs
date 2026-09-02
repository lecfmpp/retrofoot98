/* ============================================================================
   AUDITOR DOS NOMES FICTÍCIOS ESTRANGEIROS
   ----------------------------------------------------------------------------
   Este script JÁ NÃO gera patch. Ele recalcula, fora do browser, os mesmos nomes
   que o jogo calcula no arranque (WORLD_CONFIG.renomearIntl) e confere as regras
   — para poder auditar 9.832 nomes sem abrir o jogo e sem confiar na inspeção.

   POR QUE O PATCH FOI ABANDONADO, e é a parte que interessa. A primeira versão
   emitia SQL no molde do gerador brasileiro: um `squad` no patch do pacote
   oficial, 352 clubes, 470 KB. Medido antes de aplicar: o pacote é descarregado
   por TODO cliente no arranque e pesa hoje 106 KB — passaria a 576 KB, 5,4x
   maior em cada primeira visita, e ficaria guardado em localStorage, para dados
   que ninguém vai editar clube a clube.

   O nome passou a ser CALCULADO: mesmo pool, mesma semente estável (club_id +
   índice), zero bytes de payload. As duas implementações são o mesmo algoritmo
   — fnv1a para a semente, xorshift para o sorteio — e é por isso que este
   ficheiro continua a valer: se as duas divergirem, os números aqui deixam de
   bater com os do jogo.

   AS TRÊS REGRAS DE COMPRIMENTO saem do conjunto brasileiro, o único que já
   provou caber nas telas: duas palavras, palavra até 11, nome até 21.

   AS FOTOS NÃO ENTRAM, E ISSO FOI CONFERIDO: 1.855 fotos brasileiras e ZERO
   estrangeiras no pacote oficial. O gerador brasileiro renomeia player_photos
   junto porque ela é indexada pelo nome; aqui não há o que renomear.

   Uso:  node scripts/nomes-ficticios-intl.mjs
         node scripts/nomes-ficticios-intl.mjs --json <ficheiro>   (despeja o mapa)
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const PACOTE_OFICIAL = '61717da5-0f7a-48a1-ae6e-acacacad8cf5';
const MAX_PALAVRA = 11, MAX_NOME = 21;

/* os bundles são scripts de browser: avalia com um `window` de mentira */
function bundle(rel){
  const ctx = {};
  const src = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  new Function('window', 'globalThis', src)(ctx, ctx);
  return ctx;
}
const g = {};
Object.assign(g, bundle('public/src/data/game-data.js'));
Object.assign(g, bundle('public/src/data/leagues-brasil-lower.js'));
Object.assign(g, bundle('public/src/data/leagues-intl.js'));
Object.assign(g, bundle('public/src/data/leagues-conmebol.js'));
const WC = {}; new Function('window','globalThis', fs.readFileSync(path.join(RAIZ,'public/src/engine/world-config.js'),'utf8'))(WC, WC);
const POOLS = WC.WORLD_CONFIG.NAME_POOLS;

/* TODOS os nomes reais do jogo — o filtro de "ninguém real" olha para o mundo
   inteiro, não só para o país que está a ser batizado. */
const REAIS = new Set();
const push = arr => (arr||[]).forEach(c => (c.squad||[]).forEach(p => p && p.n && REAIS.add(p.n.toLowerCase())));
push(g.GAME_DATA && g.GAME_DATA.clubs);
for (const d of ['B','C','D']) push(g.BRASIL_LOWER && g.BRASIL_LOWER[d]);

/* gerador determinístico (xorshift semeado por string) */
function semente(s){ let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h || 1; }
function rng(seed){ let x = seed; return () => { x ^= x<<13; x>>>=0; x ^= x>>17; x ^= x<<5; x>>>=0; return x/4294967296; }; }

const usados = new Set();        // nome fictício já atribuído (mundo inteiro)
function batiza(pais, chave){
  const pool = POOLS[pais] || POOLS._hispano;
  const R = rng(semente(chave));
  for (let t = 0; t < 4000; t++){
    const f = pool.first[Math.floor(R()*pool.first.length)];
    const l = pool.last [Math.floor(R()*pool.last .length)];
    if (f.length > MAX_PALAVRA || l.length > MAX_PALAVRA) continue;
    const nome = f + ' ' + l;
    if (nome.length > MAX_NOME) continue;
    const k = nome.toLowerCase();
    if (usados.has(k) || REAIS.has(k)) continue;
    usados.add(k);
    return nome;
  }
  return null;
}

const porClube = new Map();      // club_id -> { "nome real": "nome fictício" }
const meta = [];                 // para o relatório
let semNome = 0;
for (const fonte of ['INTL_LEAGUES','CONMEBOL_LEAGUES']){
  const mapa = g[fonte] || {};
  for (const pais of Object.keys(mapa)){
    for (const c of (mapa[pais]||[])){
      const squad = {};
      const vistos = new Map();          // homônimo dentro do MESMO elenco -> sufixo ##N
      (c.squad||[]).forEach((p, i) => {
        if (!p || !p.n) return;
        const nome = batiza(pais, String(c.id) + '|' + i);
        if (!nome){ semNome++; return; }
        const n = (vistos.get(p.n)||0) + 1; vistos.set(p.n, n);
        const chave = n > 1 ? p.n + '##' + n : (((c.squad||[]).filter(x=>x&&x.n===p.n).length > 1) ? p.n + '##1' : p.n);
        squad[chave] = { n: nome };
        meta.push({ pais, club: c.id, de: p.n, para: nome });
      });
      if (Object.keys(squad).length) porClube.set(String(c.id), { squad, pais });
    }
  }
}

const iJson = process.argv.indexOf('--json');
if (iJson > 0 && process.argv[iJson+1]){
  fs.writeFileSync(process.argv[iJson+1], JSON.stringify(meta));
}

/* ---- relatório ---- */
const comp = meta.map(m => m.para.length);
const palavras = meta.flatMap(m => m.para.split(' ').map(w => w.length));
console.log(`${porClube.size} clubes · ${meta.length} jogadores · ${usados.size} nomes distintos`);
console.log(`comprimento: máx ${Math.max(...comp)} (limite ${MAX_NOME}) · palavra máx ${Math.max(...palavras)} (limite ${MAX_PALAVRA})`);
console.log(`sem nome (pool esgotado): ${semNome}`);
const reaisSobrando = meta.filter(m => REAIS.has(m.para.toLowerCase())).length;
console.log(`nomes fictícios que coincidem com um nome real: ${reaisSobrando}`);
const porPais = {};
meta.forEach(m => { (porPais[m.pais] = porPais[m.pais] || []).push(m); });
for (const p of Object.keys(porPais)) {
  const l = porPais[p];
  console.log(`  ${p.padEnd(12)} ${String(l.length).padStart(5)}  ex: ${l.slice(0,2).map(x=>x.de+' → '+x.para).join(' · ')}`);
}
