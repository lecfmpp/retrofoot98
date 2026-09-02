/* ============================================================================
   NOMES FICTÍCIOS DOS JOGADORES ESTRANGEIROS — gerador do patch
   ----------------------------------------------------------------------------
   Os 1.900 brasileiros já jogam com nome fictício (scripts/nomes-ficticios.mjs,
   a partir de um CSV curado). Os 9.832 de fora ainda chegam com o nome REAL do
   bundle — e chegam ao jogador de verdade, porque o mercado lê a lista direto
   dos bundles: com RF_SO_BRASIL desligado, dá para contratar "Declan Rice".

   MESMO MECANISMO, OUTRA FONTE. Lá os nomes vieram de uma planilha; aqui são
   SORTEADOS dos NAME_POOLS por país (engine/world-config.js), que existem desde
   sempre para batizar reforços e foram ampliados para ~50x50 por país. Nada de
   novo no caminho de aplicação: continua um `squad` no patch do pacote oficial,
   lido por net/dados.js no boot, e continua saindo com um DELETE.

   INSERT, NÃO UPDATE. Os 80 clubes brasileiros já têm linha em pack_edits (o
   pacote renomeia clube e escudo). Os 352 de fora não têm nenhuma — o pacote
   nunca precisou tocar-lhes. Por isso aqui é `insert ... on conflict do update`.

   AS TRÊS REGRAS DE COMPRIMENTO saem do conjunto brasileiro, que é o único que
   já provou caber nas telas: nome de DUAS palavras (nunca três), palavra de no
   máximo 11 caracteres, nome inteiro de no máximo 21. Hoje o bundle tem nomes
   de 45 ("Bernardo Fernandes da Silva Junior") — e há slots sem reticências,
   onde isso não corta: estoura.

   AS FOTOS NÃO ENTRAM AQUI, E ISSO FOI CONFERIDO. O gerador brasileiro renomeia
   player_photos junto, porque ela é indexada por (club_id, jogador) com o nome e
   renomear só um lado quebraria RF_FOTOS[club_id|nome]. Medido no pacote oficial:
   1.855 fotos brasileiras e ZERO estrangeiras — o Estúdio IA nunca gerou nenhuma
   para fora do Brasil. Não há o que renomear; se um dia houver, este script
   precisa do mesmo par de UPDATEs que o brasileiro tem.

   DETERMINÍSTICO. A semente é (club_id, índice no elenco), então rodar duas
   vezes dá o mesmo resultado e o SQL é reproduzível. Não depende da ordem em
   que os países aparecem nem de Math.random.

   NINGUÉM REAL. Um nome sorteado que calhe de ser igual a um nome REAL de
   qualquer jogador de qualquer bundle é rejeitado — o pool tem "Declan" e tem
   "Rice", e a combinação sairia sozinha mais cedo ou mais tarde.

   Uso:  node scripts/nomes-ficticios-intl.mjs
         node scripts/nomes-ficticios-intl.mjs --json <ficheiro>
   Escreve scripts/sql/nomes-ficticios-intl-aplicar.sql e -reverter.sql.
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

const asp = s => "'" + String(s).replace(/'/g, "''") + "'";
const jsonb = o => asp(JSON.stringify(o)) + '::jsonb';
const cabecalho = t => `-- ${t}
-- Gerado por scripts/nomes-ficticios-intl.mjs — não editar à mão.
-- Pacote oficial ${PACOTE_OFICIAL} · ${porClube.size} clubes · ${meta.length} jogadores
set search_path to elifoot_v3;
begin;
`;

const aplicar = [cabecalho('APLICAR os nomes fictícios dos jogadores estrangeiros')];
for (const [cid, {squad}] of porClube){
  aplicar.push(`insert into pack_edits (pack_id, club_id, patch) values (${asp(PACOTE_OFICIAL)}, ${asp(cid)}, ${jsonb({squad})})`
             + `\n  on conflict (pack_id, club_id) do update set patch = pack_edits.patch || excluded.patch;`);
}
aplicar.push('', 'commit;');

/* A VOLTA TIRA A LINHA INTEIRA quando ela só existe por causa disto, e tira só a
   chave `squad` quando o clube já tinha patch antes (nome, escudo). Assim
   reverter não apaga trabalho de outra pessoa. */
const reverter = [cabecalho('REVERTER os nomes fictícios dos jogadores estrangeiros')];
const ids = [...porClube.keys()].map(asp).join(', ');
reverter.push(`delete from pack_edits where pack_id = ${asp(PACOTE_OFICIAL)} and club_id in (${ids})`
            + `\n  and patch - 'squad' = '{}'::jsonb;`);
reverter.push(`update pack_edits set patch = patch - 'squad'`
            + `\n where pack_id = ${asp(PACOTE_OFICIAL)} and club_id in (${ids});`);
reverter.push('', 'commit;');

const dir = path.join(RAIZ, 'scripts/sql');
fs.writeFileSync(path.join(dir, 'nomes-ficticios-intl-aplicar.sql'),  aplicar.join('\n')  + '\n');
fs.writeFileSync(path.join(dir, 'nomes-ficticios-intl-reverter.sql'), reverter.join('\n') + '\n');

const iJson = process.argv.indexOf('--json');
if (iJson > 0 && process.argv[iJson+1]){
  const payload = [...porClube].map(([club_id, {squad}]) => ({ club_id, patch:{ squad } }));
  fs.writeFileSync(process.argv[iJson+1], JSON.stringify(payload));
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
