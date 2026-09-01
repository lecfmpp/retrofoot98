#!/usr/bin/env node
/* O ELENCO FEMININO — da planilha para o bundle, indexado por ID.

   O QUE ELE GERA. `public/src/data/jogadoras-brasil.js`, um mapa plano
   `{ jm000001: "Aline Lima", … }`: para cada jogador do catálogo brasileiro, o nome da jogadora
   que ocupa o lugar dele no universo feminino. O elenco feminino de um clube é o elenco dele
   com o campo `n` trocado — nada mais.

   POR QUE O ID, E NÃO O NOME NEM O ÍNDICE. Foi para isto que a identidade das fases 1-4 existiu.
   · Por NOME quebraria com o pacote oficial, que renomeia 1.870 dos 1.900 jogadores brasileiros:
     a chave seria um nome que o jogo já não usa.
   · Por ÍNDICE quebraria com `squad_remover` (dados.js faz `splice`, e todos os índices abaixo
     do removido deslizam), e com qualquer re-raspagem que reordene o elenco.
   · Por ID não quebra com nenhum dos dois. É o único campo do jogador que não muda de dono.

   COMO A PLANILHA CASA COM O CATÁLOGO. Ela não traz o id — traz `clube_id` e os atributos. Mas
   é o espelho exato do elenco masculino: medido, os 80 clubes têm a MESMA distribuição de força,
   e as 1.900 jogadoras pareiam 1-para-1 por (força, idade, posição, setor). O pareamento é feito
   nessa chave, dentro de cada clube, e é o que traduz "linha da planilha" em "id de jogador".

   O `valor_brl` DA PLANILHA É IGNORADO, DE PROPÓSITO. Ele soma 1,68× o masculino na Série A
   (R$ 20,9 bi contra R$ 12,5 bi) — orçamento, folha e mercado sairiam desbalanceados na divisão
   mais visível do jogo. Como o elenco feminino herda o objeto do masculino e só troca o nome,
   a economia fica idêntica por construção, que foi a decisão tomada para esta entrega.

   Uso:  node scripts/build-jogadoras.mjs [--gravar] */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { carregarClubes, RAIZ } from './_catalogo.mjs';

const GRAVAR = process.argv.includes('--gravar');
const ENTRADA = resolve(RAIZ, 'dados-fonte/jogadoras-brasil.csv');
const SAIDA = resolve(RAIZ, 'public/src/data/jogadoras-brasil.js');

/* ---------- a planilha ---------- */
const bruto = readFileSync(ENTRADA, 'utf8').replace(/^﻿/, '');
const linhas = bruto.split(/\r?\n/).filter(l => l.trim());
const cab = linhas[0].split(';');
const planilha = linhas.slice(1).map(l => { const c = l.split(';'); const o = {}; cab.forEach((h, i) => o[h] = c[i]); return o; })
  /* A ordem da planilha é a identidade do desempate: dois jogadores com a mesma (força, idade,
     posição, setor) no mesmo clube são intercambiáveis, mas a atribuição tem de ser a mesma em
     toda execução. `linha` é o número original da planilha. */
  .sort((a, b) => Number(a.linha) - Number(b.linha));

const porClube = new Map();
for (const r of planilha) {
  if (!porClube.has(r.clube_id)) porClube.set(r.clube_id, []);
  porClube.get(r.clube_id).push(r);
}

/* ---------- o catálogo de fábrica ---------- */
const clubes = new Map(carregarClubes().filter(x => x.pais === 'Brasil').map(x => [String(x.c.id), x.c]));
const chave = (f, a, p, s) => `${f}|${a}|${p}|${s}`;

const mapa = {};
let pareados = 0, semPar = [], semId = [];

for (const [cid, linhasDoClube] of porClube) {
  const clube = clubes.get(cid);
  if (!clube) { semPar.push(`clube ${cid} não existe no catálogo brasileiro`); continue; }

  /* Os candidatos de cada chave saem numa fila, e cada jogadora consome um. Sem a fila, dois
     jogadores idênticos receberiam a mesma jogadora e um ficaria sem nome. */
  const fila = new Map();
  for (const p of (clube.squad || [])) {
    const k = chave(p.f, p.age, p.p, p.s);
    if (!fila.has(k)) fila.set(k, []);
    fila.get(k).push(p);
  }

  for (const r of linhasDoClube) {
    const k = chave(Number(r.forca), Number(r.idade), r.posicao, r.setor);
    const alvo = (fila.get(k) || []).shift();
    if (!alvo) { semPar.push(`${cid} · ${r.jogador} (${k})`); continue; }
    if (alvo.id == null) { semId.push(`${cid} · ${alvo.n}`); continue; }
    mapa[alvo.id] = r.jogador;
    pareados++;
  }
}

/* ---------- conferências que impedem um bundle torto de ser escrito ---------- */
let falhas = 0;
const reprova = (m) => { falhas++; console.log('  ✘ ' + m); };

console.log(`planilha: ${planilha.length} jogadoras · catálogo brasileiro: ${clubes.size} clubes`);
console.log(`pareadas por (força, idade, posição, setor): ${pareados}`);

if (semPar.length) reprova(`${semPar.length} sem par no catálogo:\n      ` + semPar.slice(0, 6).join('\n      '));
if (semId.length)  reprova(`${semId.length} jogador(es) do catálogo sem id — rode scripts/atribuir-ids.mjs`);
if (pareados !== planilha.length) reprova(`pareadas ${pareados} de ${planilha.length}`);

/* O nome é o que a tela mostra e o que o acervo de fotos ainda usa como chave secundária: dois
   iguais no mesmo mundo confundem artilharia, escalação e foto. */
const nomes = Object.values(mapa);
const repetidos = [...new Set(nomes.filter((n, i) => nomes.indexOf(n) !== i))];
if (repetidos.length) reprova(`${repetidos.length} nome(s) repetido(s): ${repetidos.slice(0, 6).join(', ')}`);

const ids = Object.keys(mapa);
if (new Set(ids).size !== ids.length) reprova('id repetido no mapa');

if (falhas) { console.log(`\n✘ nada foi gravado (${falhas})`); process.exit(1); }
console.log(`${ids.length} ids · ${new Set(nomes).size} nomes distintos`);

if (!GRAVAR) { console.log('\n(ensaio — use --gravar)'); process.exit(0); }

const corpo = JSON.stringify(mapa);
writeFileSync(SAIDA, `/* ELENCO FEMININO DO BRASIL — 1.900 jogadoras, indexadas pelo ID do jogador
   cujo lugar elas ocupam. Gerado por scripts/build-jogadoras.mjs a partir de
   dados-fonte/jogadoras-brasil.csv — não editar à mão.

   O universo feminino usa OS MESMOS CLUBES: mesmo id, mesmo escudo, mesmas cores, mesmo
   estádio. O elenco de um clube é o elenco dele com o campo \`n\` trocado pelo nome daqui, o
   que mantém força, idade, valor e a economia inteira idênticos ao masculino — de propósito.

   A chave é o ID e não o nome porque o pacote oficial renomeia 1.870 dos 1.900 jogadores
   brasileiros; um mapa por nome apontaria para nomes que o jogo já não usa. */
window.JOGADORAS_BR = ${corpo};\n`);
console.log(`\n✎ ${(corpo.length / 1024).toFixed(0)} KB → public/src/data/jogadoras-brasil.js`);
