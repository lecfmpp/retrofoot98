#!/usr/bin/env node
/* O REGISTRO DE IDENTIDADE — do bundle para o banco.

   POR QUE EXISTE. A identidade do catálogo está espalhada por quatro arquivos .js de 1,9 MB,
   em cinco formatos de id que ninguém consegue enxergar juntos. Este script lê os bundles e
   escreve o que existe em `catalog_clubs`: um clube por linha, com o formato do seu id
   classificado. É o que torna a bagunça auditável — e é de onde os ids novos vão nascer.

   O JOGO NÃO LÊ ESTA TABELA. Ele continua carregando os `<script src>` como sempre: síncrono,
   offline, sem rede no boot. Quebrar isso seria trocar um problema de arrumação por um risco
   de disponibilidade.

   POR QUE ELE GERA SQL E NÃO SÓ ESCREVE. Escrever exige a service_role, que vive só na env de
   quem publica. Gerar o .sql deixa a operação revisável antes de tocar a base, e é o padrão que
   `teste-nomes-ficticios.mjs` já usa em scripts/sql/. Com SUPABASE_SERVICE_KEY na env, ele
   também aplica direto.

   Uso:  node scripts/build-catalog.mjs                       (gera scripts/sql/catalog-clubs.sql)
         SUPABASE_SERVICE_KEY=... node scripts/build-catalog.mjs --aplicar */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { carregarClubes, formatoDoId, RAIZ } from './_catalogo.mjs';
import { upsert, contar } from './_supabase.mjs';

const APLICAR = process.argv.includes('--aplicar');
const SAIDA = resolve(RAIZ, 'scripts/sql/catalog-clubs.sql');

const clubes = carregarClubes();
const linhas = clubes.map(it => ({
  club_id: String(it.c.id),
  formato: formatoDoId(it.c.id),
  modalidade: 'masc',
  base_club: null,
  country: it.pais,
  division: it.div,
  /* SÓ O RÓTULO CURTO. O nome longo e o escudo ficam de fora de propósito: eles vivem no bundle,
     e uma segunda cópia aqui é a divergência que este trabalho existe para evitar — corrigir o
     escudo no painel e a tabela continuar com o antigo. `short` entra porque é o que torna uma
     auditoria legível ("Palmeiras [1023]") sem virar fonte de verdade de nada. */
  short: it.c.short ?? it.c.name ?? null,
}));

/* Um id repetido entre bundles seria um clube existindo em dois lugares — e a chave primária
   rejeitaria em silêncio um dos dois. Melhor descobrir aqui. */
const vistos = new Map();
const repetidos = [];
for (const l of linhas) {
  if (vistos.has(l.club_id)) repetidos.push(`${l.club_id}: ${vistos.get(l.club_id)} / ${l.country}|${l.division}`);
  else vistos.set(l.club_id, `${l.country}|${l.division}`);
}
if (repetidos.length) {
  console.error(`❌ ${repetidos.length} club_id repetido(s) entre bundles:`);
  repetidos.slice(0, 10).forEach(r => console.error('   ' + r));
  process.exit(1);
}

const porFormato = linhas.reduce((o, l) => (o[l.formato] = (o[l.formato] || 0) + 1, o), {});
console.log(`${linhas.length} clubes`);
for (const f of Object.keys(porFormato).sort((a, b) => porFormato[b] - porFormato[a]))
  console.log(`   ${f.padEnd(9)} ${String(porFormato[f]).padStart(3)}`);

const esc = (v) => v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const sql = [
  '-- gerado por scripts/build-catalog.mjs — não editar à mão',
  `-- ${linhas.length} clubes do catálogo de fábrica`,
  'begin;',
  ...linhas.map(l => `insert into elifoot_v3.catalog_clubs (club_id,formato,modalidade,base_club,country,division,short) values (${
    [l.club_id, l.formato, l.modalidade, l.base_club, l.country, l.division, l.short].map(esc).join(',')
  }) on conflict (club_id) do update set formato=excluded.formato, country=excluded.country, division=excluded.division, short=excluded.short;`),
  'commit;',
].join('\n');

mkdirSync(resolve(RAIZ, 'scripts/sql'), { recursive: true });
writeFileSync(SAIDA, sql + '\n');
console.log(`\nescrito: scripts/sql/catalog-clubs.sql`);

if (APLICAR) {
  await upsert('catalog_clubs', linhas, 'club_id');
  /* Confere do outro lado. Um upsert que responde 2xx mas grava menos linhas do que devia é
     exatamente o tipo de falha silenciosa que só apareceria muito depois, na primeira auditoria
     que não fechasse. */
  const n = await contar('catalog_clubs');
  if (n !== linhas.length) {
    console.error(`❌ gravou ${n} de ${linhas.length} clubes — a tabela não bate com o catálogo.`);
    process.exit(1);
  }
  console.log(`✓ ${n} clubes em catalog_clubs`);
}
