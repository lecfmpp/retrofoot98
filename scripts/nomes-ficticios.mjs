/* ============================================================================
   NOMES FICTÍCIOS DE JOGADOR — gerador do patch
   ----------------------------------------------------------------------------
   O catálogo de fábrica (public/src/data/game-data.js e leagues-brasil-lower.js)
   ainda traz o nome REAL de cada jogador. Os CLUBES já foram renomeados por
   pacote (o pacote OFICIAL tem `name`/`short`/`crest` fictícios para os 80
   clubes brasileiros). Falta a mesma coisa para os 1.900 jogadores.

   POR QUE PATCH E NÃO EDIÇÃO DO BUNDLE. O bundle é o mesmo arquivo servido pela
   CDN para todo mundo; mexer nele é irreversível sem novo deploy. O pacote mora
   no banco, entra no boot (net/dados.js) antes de o motor montar qualquer coisa,
   e sai com um DELETE. Voltar atrás é uma consulta, não um deploy.

   COMO ELE VOLTA ATRÁS. Este script não sobrescreve nada: ele ACRESCENTA a
   chave `squad` ao patch que cada clube já tem no pacote oficial. O SQL de
   reversão faz `patch - 'squad'`, devolvendo a linha ao estado de hoje — os
   nomes de clube e os escudos continuam intactos nos dois sentidos.

   AS FOTOS ANDAM JUNTO. player_photos é indexada por (club_id, jogador) com o
   nome REAL (777 fotos do Estúdio IA). Renomear o jogador sem renomear a foto
   quebraria RF_FOTOS[club_id|nome] — então o mesmo par de SQLs renomeia as duas
   pontas.

   HOMÔNIMOS. Dois clubes têm dois jogadores com nome IDÊNTICO no elenco
   (br_C_brusque: dois "João Pedro"; br_D_marciliodias: dois "João Vitor"). Como
   o patch identifica jogador pelo nome, esses casos saem com o sufixo `##N`
   (1-based, na ordem do elenco) — ver o trecho de `squad` em net/dados.js.

   Uso:  node scripts/nomes-ficticios.mjs
   Escreve scripts/sql/nomes-ficticios-aplicar.sql e -reverter.sql.
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const PACOTE_OFICIAL = '61717da5-0f7a-48a1-ae6e-acacacad8cf5';

/* ---- catálogo de fábrica ------------------------------------------------- */
function bundle(rel){
  const s = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  return JSON.parse(s.slice(s.indexOf('=') + 1).trim().replace(/;\s*$/, ''));
}
const clubes = new Map();
for(const c of bundle('public/src/data/game-data.js').clubs) clubes.set(String(c.id), c);
const baixo = bundle('public/src/data/leagues-brasil-lower.js');
for(const d of ['B','C','D']) for(const c of baixo[d]) clubes.set(String(c.id), c);

/* mesma normalização que gerou a coluna `jogador_chave` da planilha */
const chave = s => s.normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');

/* ---- planilha ------------------------------------------------------------ */
const csv = fs.readFileSync(path.join(RAIZ, 'scripts/dados/nomes-ficticios.csv'), 'utf8')
  .replace(/^﻿/, '').trim().split(/\r?\n/);
const cab = csv.shift().split(';');
const linhas = csv.map(l => {
  const v = l.split(';'), o = {};
  cab.forEach((k, i) => o[k] = v[i] === undefined ? '' : v[i]);
  return o;
});

/* ---- casamento planilha x elenco ----------------------------------------- */
const problemas = [];
const porClube = new Map();     // club_id -> { "nome atual" | "nome atual##N" : novo }
const fotos = [];               // { club_id, de, para }
const usados = new Map();       // club_id -> Map(slug -> quantos já consumidos)

for(const r of linhas){
  const c = clubes.get(r.clube_id);
  if(!c){ problemas.push(`clube ${r.clube_id} não existe no bundle`); continue; }
  const slug = r.jogador_chave.split('|')[1];
  const iguais = c.squad.filter(p => chave(p.n) === slug);
  if(!iguais.length){ problemas.push(`${r.jogador_chave} sem par no elenco`); continue; }
  if(!r.jogador.trim()){ problemas.push(`${r.jogador_chave} sem nome novo`); continue; }

  let mapa = usados.get(r.clube_id);
  if(!mapa){ mapa = new Map(); usados.set(r.clube_id, mapa); }
  const ordem = mapa.get(slug) || 0;          // 0 na primeira vez
  mapa.set(slug, ordem + 1);
  if(ordem >= iguais.length){ problemas.push(`${r.jogador_chave} aparece mais vezes na planilha que no elenco`); continue; }

  const atual = iguais[ordem].n;
  /* só carimba ##N quando o nome REALMENTE se repete no elenco; senão o patch
     antigo (sem sufixo) e o novo escreveriam chaves diferentes para o mesmo
     jogador */
  const k = iguais.length > 1 ? `${atual}##${ordem + 1}` : atual;

  let squad = porClube.get(r.clube_id);
  if(!squad){ squad = {}; porClube.set(r.clube_id, squad); }
  if(squad[k]) problemas.push(`chave repetida ${r.clube_id} / ${k}`);
  squad[k] = { n: r.jogador };

  /* a foto é indexada pelo nome puro; homônimo tem no máximo uma foto e ela
     seguiria o primeiro dos dois — deixamos de fora para não trocar a foto
     errada de dono */
  if(iguais.length === 1) fotos.push({ club: r.clube_id, de: atual, para: r.jogador });
}

/* nome novo repetido dentro do mesmo clube voltaria a criar homônimo */
for(const [cid, squad] of porClube){
  const vistos = new Set();
  for(const k of Object.keys(squad)){
    const n = squad[k].n;
    if(vistos.has(n)) problemas.push(`nome novo repetido em ${cid}: ${n}`);
    vistos.add(n);
  }
}

/* A CHAVE PRIMÁRIA de player_photos é (pack_id, club_id, jogador): o nome novo de
   um jogador não pode cair em cima da foto de alguém que NÃO está sendo
   renomeado — os homônimos, que ficam de fora do mapa de fotos. (Cadeia entre
   dois renomeados é caso resolvido, o SQL passa por um nome de passagem.) */
for(const [cid] of porClube){
  const mapa = fotos.filter(f => f.club === cid);
  const saindo = new Set(mapa.map(f => f.de));
  const parados = new Set(clubes.get(cid).squad.map(p => p.n).filter(n => !saindo.has(n)));
  for(const f of mapa)
    if(parados.has(f.para)) problemas.push(`${cid}: nome novo "${f.para}" colide com foto que fica (homônimo)`);
}

if(problemas.length){
  console.error('ABORTADO — ' + problemas.length + ' problema(s):');
  problemas.slice(0, 40).forEach(p => console.error('  · ' + p));
  process.exit(1);
}

/* ---- SQL ----------------------------------------------------------------- */
const asp = s => "'" + String(s).replace(/'/g, "''") + "'";
const jsonb = o => asp(JSON.stringify(o)) + '::jsonb';

const cabecalho = titulo => `-- ${titulo}
-- Gerado por scripts/nomes-ficticios.mjs — não editar à mão.
-- Pacote oficial ${PACOTE_OFICIAL} · ${porClube.size} clubes · ${linhas.length} jogadores
set search_path to elifoot_v3;
begin;
`;

/* AS FOTOS SAEM DO PRÓPRIO PATCH. player_photos é indexada por (pack_id,
   club_id, jogador) com o nome REAL; renomear o jogador sem renomear a foto
   quebraria RF_FOTOS[club_id|nome]. O mapa "real -> fictício" já é exatamente o
   `squad` que acabou de entrar em pack_edits, então o SQL lê de lá em vez de
   repetir 1.900 pares — o que mantém o arquivo legível e impede que as duas
   metades saiam de sincronia.

   FORA DO MAPA: as chaves com sufixo `##N`. Homônimo tem no máximo uma foto e
   ela seguiria o primeiro dos dois — melhor não trocar a foto de dono.

   DOIS TEMPOS por causa da PK: a planilha encadeia nomes ("Renato Marques" vira
   "Bruno Melo" enquanto o "Bruno Melo" de verdade vira outra coisa), então todos
   os alvos passam por um nome de passagem antes de receber o definitivo. */
const MAPA = `with mapa as (
       select e.club_id, k as de, e.patch->'squad'->k->>'n' as para
         from pack_edits e, lateral jsonb_object_keys(e.patch->'squad') k
        where e.pack_id = ${asp(PACOTE_OFICIAL)} and e.patch ? 'squad' and k !~ '##[0-9]+$'
     )`;
function renomearFotos(inverso){
  const de = inverso ? 'm.para' : 'm.de', para = inverso ? 'm.de' : 'm.para';
  const onde = alvo => `\n from mapa m\n where p.pack_id = ${asp(PACOTE_OFICIAL)}`
                     + ` and p.club_id = m.club_id and p.jogador = ${alvo};`;
  return [
    '-- 1/2 tira os alvos do caminho (a PK não aceita a cadeia de uma vez)',
    `${MAPA}\nupdate player_photos p set jogador = '~ren~' || p.jogador` + onde(de),
    '-- 2/2 grava o nome definitivo',
    `${MAPA}\nupdate player_photos p set jogador = ${para}` + onde(`'~ren~' || ${de}`)
  ];
}

const aplicar = [cabecalho('APLICAR os nomes fictícios de jogador')];
for(const [cid, squad] of porClube){
  aplicar.push(`update pack_edits set patch = patch || ${jsonb({ squad })}`
             + ` where pack_id = ${asp(PACOTE_OFICIAL)} and club_id = ${asp(cid)};`);
}
aplicar.push('', ...renomearFotos(false), 'commit;');

/* ORDEM IMPORTA na volta: as fotos são renomeadas ANTES de a chave `squad` sair,
   porque é dela que o mapa é lido. */
const reverter = [cabecalho('REVERTER os nomes fictícios de jogador')];
reverter.push(...renomearFotos(true), '',
  `update pack_edits set patch = patch - 'squad' where pack_id = ${asp(PACOTE_OFICIAL)};`, 'commit;');

/* --json <arquivo>: despeja o mesmo payload no formato que net/dados.js recebe do
   banco. É o que scripts/teste-nomes-ficticios.mjs aplica no bundle para conferir
   que nenhum nome real sobra. */
const iJson = process.argv.indexOf('--json');
if(iJson > 0 && process.argv[iJson+1]){
  fs.writeFileSync(process.argv[iJson+1], JSON.stringify(
    [...porClube].map(([club_id, squad]) => ({ club_id, divisao:null, novo:false, patch:{ squad } })), null, 1));
}

const dir = path.join(RAIZ, 'scripts/sql');
fs.writeFileSync(path.join(dir, 'nomes-ficticios-aplicar.sql'), aplicar.join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'nomes-ficticios-reverter.sql'), reverter.join('\n') + '\n');

const homonimos = [...porClube].flatMap(([cid, s]) => Object.keys(s).filter(k => k.includes('##')).map(k => cid + ' / ' + k));
console.log(`${linhas.length} jogadores · ${porClube.size} clubes · ${fotos.length} fotos renomeadas`);
console.log(`homônimos com sufixo ##N: ${homonimos.length}` + (homonimos.length ? '\n  · ' + homonimos.join('\n  · ') : ''));
console.log('escrito: scripts/sql/nomes-ficticios-aplicar.sql e -reverter.sql');
