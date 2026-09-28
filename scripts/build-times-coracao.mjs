#!/usr/bin/env node
/* TIMES DO CORAÇÃO — lista para a pergunta do cadastro (27/09/2026).
   Gera public/src/data/times-coracao.js (window.RF_TIMES_CORACAO) com os clubes brasileiros das
   Séries A a D pelo NOME REAL e ESCUDO REAL, lidos dos dados de FÁBRICA (game-data.js,
   leagues-brasil-lower.js, club-crests-brasil-lower.js) — antes do pacote oficial, que no jogo troca
   tudo por fictício. Decisão do dono: no cadastro aparece o real (é a pergunta "para quem você torce",
   não o jogo). Escudo sem captura → o cadastro mostra um selo com as cores do clube.
   Uso: node scripts/build-times-coracao.mjs   (rodar de novo se a lista de clubes mudar) */
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['public/src/data/game-data.js', 'public/src/data/leagues-brasil-lower.js', 'public/src/data/club-crests-brasil-lower.js'])
  vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
const W = ctx.window, esc = W.CLUB_CREST_BRASIL_LOWER || {};
const limpa = (u) => u ? String(u).replace('akamaized.net//', 'akamaized.net/') : null;
const times = [];
for (const c of W.GAME_DATA.clubs) times.push({ id: String(c.id), nome: c.short || c.name, completo: c.name, serie: 'A', escudo: limpa(c.crest), cor: c.color || null, cor2: c.color2 || null });
for (const s of ['B', 'C', 'D']) for (const c of (W.BRASIL_LOWER[s] || []))
  times.push({ id: String(c.id), nome: c.short || c.name, completo: c.name, serie: s, escudo: limpa(c.crest || esc[c.id]), cor: c.color || null, cor2: c.color2 || null });
times.sort((a, b) => a.serie.localeCompare(b.serie) || a.nome.localeCompare(b.nome, 'pt-BR'));
const out = `/* GERADO por scripts/build-times-coracao.mjs — não editar à mão.
   Clubes brasileiros (Séries A–D) com NOME e ESCUDO REAIS, só para a pergunta "time do coração" do
   cadastro. O jogo em si continua com os nomes fictícios do pacote oficial. */
window.RF_TIMES_CORACAO = ${JSON.stringify(times)};
`;
fs.writeFileSync('public/src/data/times-coracao.js', out);
const porSerie = times.reduce((m, t) => (m[t.serie] = (m[t.serie] || 0) + 1, m), {});
console.log(`times do coração: ${times.length} clubes`, porSerie, `· com escudo: ${times.filter(t => t.escudo).length}`);
