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

/* `privilegiado` marca o que a chave publicavel NAO alcanca. As quatro primeiras tem politica
   de leitura publica (o proprio jogo as le^ no boot), entao o backup do que importa -- as fotos
   e o pacote -- roda sem credencial nenhuma. Exigir service_role para tudo fazia o backup
   inteiro depender de uma chave que so' quem publica tem, e backup que nao se consegue rodar
   nao e' backup. */
const TABELAS = [
  { nome: 'player_photos',  select: '*', ordem: 'club_id,jogador' },
  { nome: 'pack_edits',     select: '*', ordem: 'pack_id,club_id' },
  { nome: 'division_clubs', select: '*', ordem: 'country,division,club_id' },
  { nome: 'data_packs',     select: '*', ordem: 'criado_em' },
  /* Índice, não conteúdo: o estado dos saves e das salas é grande e privado. */
  { nome: 'solo_saves',     select: 'user_id,save_name,updated_at', ordem: 'updated_at', privilegiado: true },
  { nome: 'games',          select: 'id,host_id,phase,round,state_version', ordem: 'id', privilegiado: true },
];
const TEM_CHAVE = !!process.env.SUPABASE_SERVICE_KEY;

console.log(`Backup em backups/${carimbo}/\n`);
const resumo = {};
const pulados = [];
for (const t of TABELAS) {
  if (t.privilegiado && !TEM_CHAVE) { pulados.push(t.nome); continue; }
  const total = await contar(t.nome, { privilegiado: !!t.privilegiado });
  const linhas = await ler(t.nome, { select: t.select, ordem: t.ordem, privilegiado: !!t.privilegiado });
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

if (pulados.length) {
  console.log(`\n  ⚠ sem SUPABASE_SERVICE_KEY: ${pulados.join(', ')} ficaram de fora (indice de saves e salas).`);
  console.log('    O essencial -- fotos, pacote e catalogo -- esta' + String.fromCharCode(39) + ' salvo.');
}
writeFileSync(resolve(destino, 'resumo.json'), JSON.stringify({ carimbo, contagens: resumo, pulados }, null, 2));
/* "Completo" so' quando for verdade: um backup parcial que se anuncia completo e' pior que um
   que avisa, porque so' se descobre a falta no dia em que ele precisa servir. */
console.log(pulados.length
  ? `\n✅ Backup PARCIAL em backups/${carimbo}/ (${pulados.length} tabela(s) de fora) — commite este diretório.`
  : `\n✅ Backup completo em backups/${carimbo}/ — commite este diretório.`);
