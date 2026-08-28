#!/usr/bin/env node
/* BACKUP DA BASE ANTES DE MEXER NA IDENTIDADE — a rede de segurança que vem antes de tudo.

   POR QUE EXISTE. As 846 fotos do Estúdio IA custaram dinheiro e tempo, e estão ligadas ao
   catálogo por NOME. Todo o trabalho de identidade mexe justamente nessa ligação. Antes da
   primeira alteração, o estado inteiro sai para arquivo e vai para o git — se algo der errado em
   qualquer fase, existe um ponto de retorno que não depende de o banco estar íntegro.

   O que sai: player_photos, pack_edits e division_clubs por inteiro (são o catálogo corrigido e
   o acervo de imagens), mais um índice de solo_saves e games — destes NÃO se dumpa o estado, que
   é grande e privado: basta saber quantos são e de quem, para conferir depois que nenhum sumiu.

   Uso:  SUPABASE_SERVICE_KEY='...' node scripts/dump-base.mjs */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ler, contar } from './_supabase.mjs';
import { RAIZ } from './_catalogo.mjs';

/* A data vem da env quando se quer reproduzir um dump antigo; senão é hoje. */
const carimbo = process.env.DUMP_DATA || new Date().toISOString().slice(0, 10);
const destino = resolve(RAIZ, 'backups', carimbo);
mkdirSync(destino, { recursive: true });

const TABELAS = [
  { nome: 'player_photos',  select: '*', ordem: 'club_id,jogador' },
  { nome: 'pack_edits',     select: '*', ordem: 'pack_id,club_id' },
  { nome: 'division_clubs', select: '*', ordem: 'country,division,club_id' },
  { nome: 'data_packs',     select: '*', ordem: 'criado_em' },
  /* Índice, não conteúdo: o estado dos saves e das salas é grande e privado. */
  { nome: 'solo_saves',     select: 'user_id,save_name,updated_at', ordem: 'updated_at' },
  { nome: 'games',          select: 'id,host_id,phase,round,state_version', ordem: 'id' },
];

console.log(`Backup em backups/${carimbo}/\n`);
const resumo = {};
for (const t of TABELAS) {
  const total = await contar(t.nome, { privilegiado: true });
  const linhas = await ler(t.nome, { select: t.select, ordem: t.ordem, privilegiado: true });
  /* Um dump mais curto que a contagem é um dump truncado — e um dump truncado que se diz
     completo é pior que dump nenhum. */
  if (linhas.length !== total) {
    console.error(`❌ ${t.nome}: lidas ${linhas.length} de ${total} linhas — dump incompleto, abortando.`);
    process.exit(1);
  }
  writeFileSync(resolve(destino, `${t.nome}.json`), JSON.stringify(linhas, null, 1));
  resumo[t.nome] = total;
  console.log(`  ✓ ${String(total).padStart(5)}  ${t.nome}`);
}

writeFileSync(resolve(destino, 'resumo.json'), JSON.stringify({ carimbo, contagens: resumo }, null, 2));
console.log(`\n✅ Backup completo em backups/${carimbo}/ — commite este diretório.`);
