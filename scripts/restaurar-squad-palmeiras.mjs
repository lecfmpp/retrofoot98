#!/usr/bin/env node
/* RESTAURA O SQUAD DO PALMEIRAS NO PACOTE OFICIAL — uma correção de dado, não de código.

   O QUE ACONTECEU. Salvar um clube no painel gravava a coluna `patch` INTEIRA. Quando o
   formulário do elenco não estava carregado, o diff saía sem `squad` e o patch era regravado
   sem ele — apagando os 30 nomes fictícios do Palmeiras. O bug foi corrigido em fd24208
   ("o patch que deixou de se apagar"), mas o estrago neste clube já estava feito.

   POR QUE AS FOTOS "SUMIRAM". Não sumiram: as 1.090 linhas de player_photos estão lá, com URL
   válida. Elas foram geradas com os nomes FICTÍCIOS (Alex Bezerra, Fábio Nascimento…). Sem o
   squad no patch, o clube volta aos nomes reais (Lucas Evangelista, Erick Belé…) e o painel,
   que casa foto por (club_id, nome), não encontra nenhuma das 30.

   POR QUE É SEGURO. Faz MERGE, como o SQL do gerador: lê o patch atual, acrescenta `squad` e
   grava — `crest`, `name` e `short` ficam como estão. É idempotente. E os nomes vêm do
   scripts/sql/nomes-ficticios-aplicar.sql, que é a fonte que gerou os originais: conferido que
   os 30 são exatamente os que as fotos esperam.

   Conferido antes de escrever: dos 80 clubes cobertos pelo gerador, o Palmeiras é o ÚNICO sem
   squad. Os outros 79 estão intactos.

   Uso:  SUPABASE_SERVICE_KEY=... node scripts/restaurar-squad-palmeiras.mjs */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ler, SB_URL, SCHEMA, chave } from './_supabase.mjs';
import { RAIZ } from './_catalogo.mjs';

const CLUBE = '1023';

/* Os nomes saem do SQL do gerador — não de uma lista digitada aqui. Uma segunda cópia divergiria
   dele no dia em que os nomes fossem regerados. */
const sql = readFileSync(resolve(RAIZ, 'scripts/sql/nomes-ficticios-aplicar.sql'), 'utf8');
const linha = sql.split('\n').find(l => l.includes(`club_id = '${CLUBE}'`));
if (!linha) { console.error(`❌ não achei a linha do clube ${CLUBE} em nomes-ficticios-aplicar.sql`); process.exit(1); }
const json = linha.match(/'(\{"squad".*\})'::jsonb/);
if (!json) { console.error('❌ não consegui extrair o bloco squad do SQL'); process.exit(1); }
const squad = JSON.parse(json[1]).squad;
console.log(`${Object.keys(squad).length} renomeações no SQL do gerador`);

const packs = await ler('data_packs', { select: 'id,oficial,nome' });
const oficial = packs.find(p => p.oficial);
if (!oficial) { console.error('❌ não há pacote oficial'); process.exit(1); }

const atual = (await ler('pack_edits', { select: '*' }))
  .find(e => e.pack_id === oficial.id && String(e.club_id) === CLUBE);
if (!atual) { console.error(`❌ o clube ${CLUBE} não tem pack_edit no pacote oficial`); process.exit(1); }

const tinha = Object.keys((atual.patch || {}).squad || {}).length;
console.log(`patch atual: chaves [${Object.keys(atual.patch || {}).sort().join(', ')}] · squad com ${tinha}`);
if (tinha) { console.log('\n✓ o squad já está lá — nada a fazer'); process.exit(0); }

const novo = { ...(atual.patch || {}), squad };
const res = await fetch(`${SB_URL}/rest/v1/pack_edits?pack_id=eq.${oficial.id}&club_id=eq.${CLUBE}`, {
  method: 'PATCH',
  headers: {
    apikey: chave({ escrita: true }), Authorization: `Bearer ${chave({ escrita: true })}`,
    'Accept-Profile': SCHEMA, 'Content-Profile': SCHEMA,
    'Content-Type': 'application/json', Prefer: 'return=representation',
  },
  body: JSON.stringify({ patch: novo }),
});
if (!res.ok) { console.error(`❌ ${res.status}: ${await res.text()}`); process.exit(1); }

const [depois] = await res.json();
const agora = Object.keys((depois.patch || {}).squad || {}).length;
const chaves = Object.keys(depois.patch || {}).sort().join(', ');
console.log(`patch agora:  chaves [${chaves}] · squad com ${agora}`);
if (agora !== Object.keys(squad).length) { console.error('❌ o squad não bateu depois de gravar'); process.exit(1); }
if (!['crest','name','short'].every(k => k in (depois.patch || {}))) {
  console.error('❌ o merge perdeu crest/name/short — reverta com scripts/sql/nomes-ficticios-reverter.sql');
  process.exit(1);
}
console.log(`\n✓ squad do Palmeiras restaurado (${agora} jogadores) — as 30 fotos voltam a casar`);
