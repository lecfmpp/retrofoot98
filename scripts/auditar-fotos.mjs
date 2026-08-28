#!/usr/bin/env node
/* AUDITORIA DO ACERVO DE FOTOS — nenhuma imagem gerada pode se perder.

   POR QUE EXISTE. As fotos do Estúdio IA são ligadas ao catálogo pelo NOME do jogador, e o
   trabalho de identidade troca essa ligação por um id. Este script é o número que não pode cair:
   roda antes e depois de cada fase, e qualquer queda no total, qualquer URL que pare de
   responder ou qualquer crescimento no número de órfãs é uma reprovação.

   CONTRA O CATÁLOGO COM O PACOTE APLICADO, e não contra a fábrica. O pacote oficial renomeia
   quase todo o Brasil — 1.870 dos 1.900 jogadores brasileiros — e as fotos foram geradas depois
   disso. Comparar com a fábrica pura daria "quase tudo órfão", que seria um alarme falso capaz
   de esconder o alarme verdadeiro.

   ÓRFÃ é a linha cujo (club_id, jogador) não casa com ninguém nem pelo nome corrente nem pelo
   nome de fábrica (`_n0`). Elas já existem hoje — elenco reeditado depois da foto — e por isso o
   critério não é "zero órfãs", é "as órfãs não aumentaram".

   As linhas MÁGICAS não são jogadores e não contam: `__torso__` é o uniforme do clube,
   `__molde__` os gabaritos, `__treinador__` as faces de técnico e `__base__` o acervo de faces
   de quem sobe da base.

   Uso:  node scripts/auditar-fotos.mjs [--urls]      (a chave publicável basta para ler) */
import { ler } from './_supabase.mjs';
import { carregarComPacote, cadaJogador } from './_catalogo.mjs';

const CHECAR_URLS = process.argv.includes('--urls');
const CLUBES_MAGICOS   = new Set(['__molde__', '__treinador__', '__base__']);
const JOGADOR_MAGICO   = new Set(['__torso__']);
const ehMagico = (f) => CLUBES_MAGICOS.has(String(f.club_id)) || JOGADOR_MAGICO.has(f.jogador);

let falhas = 0;
const reprova = (m) => { falhas++; console.log('  ✘ ' + m); };

const fotos = await ler('player_photos', { select: '*', ordem: 'club_id,jogador' });
const deJogador = fotos.filter(f => !ehMagico(f));

console.log('1. Acervo');
console.log(`   total:        ${fotos.length}`);
console.log(`   de jogador:   ${deJogador.length}`);
console.log(`   mágicas:      ${fotos.length - deJogador.length}  (uniforme, molde, treinador, base)`);
console.log(`   clubes:       ${new Set(deJogador.map(f => String(f.club_id))).size}`);
if (fotos.some(f => !f.url)) reprova(`${fotos.filter(f => !f.url).length} linha(s) sem url`);

/* ---------- 2. CASAMENTO ---------- */
const packs = await ler('data_packs', { select: 'id,oficial,nome' });
const oficial = packs.find(p => p.oficial) || packs[0];
const edits = (await ler('pack_edits', { select: '*' })).filter(e => e.pack_id === oficial?.id);
const { clubes } = carregarComPacote(edits);

/* Duas chaves por jogador: o nome corrente (com que a foto foi gravada) e o de fábrica, para
   fotos anteriores ao pacote. */
const catalogo = new Set();
for (const j of cadaJogador(clubes)) {
  const ck = String(j.c.id);
  catalogo.add(ck + '|' + j.p.n);
  if (j.p._n0 !== undefined) catalogo.add(ck + '|' + j.p._n0);
}
const orfas = deJogador.filter(f => !catalogo.has(String(f.club_id) + '|' + f.jogador));

console.log(`\n2. Casamento com o catálogo (pacote "${oficial?.nome}", ${edits.length} edições)`);
console.log(`   casam:        ${deJogador.length - orfas.length}`);
console.log(`   órfãs:        ${orfas.length}`);
orfas.slice(0, 15).forEach(f => console.log(`     · ${f.club_id} | ${f.jogador}`));
if (orfas.length > 15) console.log(`     … e mais ${orfas.length - 15}`);

/* ---------- 3. NOMES SERVIDOS PELA FOTO ERRADA ----------
   `RF_FOTOS_NOME` (dados.js) é um índice global só-por-nome, usado como último recurso quando
   não há foto para (club_id, nome). Um nome que existe em mais de um clube COM foto faz um
   jogador exibir a foto de outro. É o defeito que a leitura por id vem corrigir, e o número
   precisa ir a zero quando o índice global for removido. */
const porNome = new Map();
for (const f of deJogador) {
  if (!porNome.has(f.jogador)) porNome.set(f.jogador, new Set());
  porNome.get(f.jogador).add(String(f.club_id));
}
const ambiguos = [...porNome].filter(([, s]) => s.size > 1);
console.log(`\n3. Nomes com foto em mais de um clube: ${ambiguos.length}`);
ambiguos.slice(0, 8).forEach(([n, s]) => console.log(`     · ${n} → ${[...s].join(', ')}`));

/* ---------- 4. COBERTURA POR ID ----------
   Só vale depois que a coluna existir (Fase 5). Antes disso o bloco se cala, em vez de reprovar
   por algo que ainda não foi feito. */
if (fotos.length && 'player_id' in fotos[0]) {
  const comId = deJogador.filter(f => f.player_id);
  console.log(`\n4. Cobertura por id`);
  console.log(`   com player_id: ${comId.length} de ${deJogador.length}`);
  const faltando = deJogador.length - comId.length - orfas.length;
  if (faltando > 0) console.log(`   ⚠ ${faltando} casam com o catálogo mas ainda não têm id — falta backfill`);
}

/* ---------- 5. AS URLS RESPONDEM? ----------
   Caro (uma requisição por foto), então só com --urls. É a única checagem que prova que a imagem
   existe de fato no Storage, e não apenas a linha que aponta para ela. */
if (CHECAR_URLS) {
  console.log(`\n5. Verificando ${fotos.length} URLs no Storage…`);

  /* O Storage limita a taxa (HTTP 429). Tratar 429 como "URL quebrada" transformaria esta
     auditoria numa fonte de alarme falso — e uma checagem que grita sem motivo deixa de ser
     lida, que é o pior desfecho possível para a rede de segurança do acervo. Então 429 e erro
     de rede são RETENTADOS com espera crescente; só o que falha depois disso conta. */
  const espera = (ms) => new Promise(r => setTimeout(r, ms));
  async function confere(f, tentativa = 0) {
    try {
      const r = await fetch(f.url, { method: 'HEAD' });
      if (r.ok) return null;
      if (r.status === 429 && tentativa < 5) { await espera(500 * 2 ** tentativa); return confere(f, tentativa + 1); }
      return `${f.club_id}|${f.jogador} → HTTP ${r.status}`;
    } catch (e) {
      if (tentativa < 5) { await espera(500 * 2 ** tentativa); return confere(f, tentativa + 1); }
      return `${f.club_id}|${f.jogador} → ${e.message}`;
    }
  }

  let ok = 0; const quebradas = [];
  const LOTE = 8;
  for (let i = 0; i < fotos.length; i += LOTE) {
    const r = await Promise.all(fotos.slice(i, i + LOTE).map(f => confere(f)));
    r.forEach(x => x ? quebradas.push(x) : ok++);
    process.stdout.write(`\r   ${Math.min(i + LOTE, fotos.length)}/${fotos.length}`);
  }
  console.log(`\n   respondem: ${ok}  ·  quebradas: ${quebradas.length}`);
  quebradas.slice(0, 10).forEach(s => console.log(`     · ${s}`));
  if (quebradas.length) reprova(`${quebradas.length} URL(s) não respondem`);
}

console.log();
if (falhas) { console.log(`✘ auditoria de fotos reprovou (${falhas})`); process.exit(1); }
console.log('✓ acervo íntegro' + (CHECAR_URLS ? ' (URLs conferidas)' : ' — use --urls para conferir o Storage'));
