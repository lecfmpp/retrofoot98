#!/usr/bin/env node
/* O MUNDO MASCULINO, BYTE A BYTE — a fotografia contra a qual tudo é comparado.

   POR QUE EXISTE. O universo feminino entra por acréscimo, mas duas coisas do trabalho tocam o
   que já está no ar: gravar um `id` em cada jogador dos bundles, e registrar chaves novas em
   tabelas que o masculino também lê. Nenhum teste do repositório olhava para o CATÁLOGO em si —
   `teste-universos` prova as regras de país, `teste-virada` roda a virada no servidor real e
   `teste-calendario` cobre as datas, mas os 432 clubes e os 11.732 jogadores não tinham rede
   nenhuma. Esta é a rede que faltava, e só ela: repetir o que os outros três já provam seria a
   segunda cópia da mesma regra.

   O QUE ELE IGNORA, E POR QUE ISSO É O DESENHO E NÃO UM BURACO. O hash de cada jogador cobre
   TODOS os campos MENOS `id`. É o que permite a fase de identidade acrescentar o id sem
   reprovar, e ao mesmo tempo garante que ela não encostou em mais nada: qualquer mexida em
   nome, posição, força, idade, valor, nacionalidade ou liga muda o hash e derruba o teste.

   ONDE ELE MORA. Entra no `npm run teste`, que roda dentro do `npm run build`, que roda dentro
   do `npm run deploy`. Não é preciso lembrar de rodá-lo: publicar com o mundo masculino
   alterado deixa de ser possível.

   OFFLINE DE PROPÓSITO. Não fala com o banco. O catálogo com o pacote aplicado depende de
   `pack_edits`, que muda quando alguém edita no painel — legitimamente. Um teste de build que
   reprovasse por causa disso seria desligado na primeira semana. Quem confere o pacote é
   `auditar-fotos.mjs`, que já precisa de rede.

   Uso:  node scripts/teste-regressao-masculina.mjs            (compara; sai 1 se divergir)
         node scripts/teste-regressao-masculina.mjs --gravar   (regrava a fotografia) */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { carregarClubes, cadaJogador, RAIZ } from './_catalogo.mjs';

const GRAVAR = process.argv.includes('--gravar');
const ARQUIVO = resolve(RAIZ, 'scripts/baseline-masculino.json');

/* Hash estável: as chaves entram em ordem, para que a serialização não dependa da ordem em que
   o objeto foi montado. */
function hash(v) {
  const canon = (x) => Array.isArray(x) ? x.map(canon)
    : (x && typeof x === 'object') ? Object.keys(x).sort().reduce((o, k) => (o[k] = canon(x[k]), o), {})
    : x;
  return createHash('sha1').update(JSON.stringify(canon(v))).digest('hex').slice(0, 16);
}

/* ---------- o retrato ---------- */
const CAMPOS_CLUBE = ['id','name','short','color','color2','crest','lg','OS','MS','DS','overall'];
/* `id` de fora — ver o cabeçalho. `_rb`/`_rbOv` são marcas de rebalanceamento já aplicado e
   entram, porque uma mudança nelas é mudança de força. */
const IGNORAR_JOGADOR = new Set(['id']);

/* POR CLUBE, E NÃO POR GRUPO. Um hash por divisão diria "os elencos da Série B mudaram" e
   deixaria a busca do que mudou para quem estivesse depurando — que é justamente o momento em
   que menos se quer procurar. Com um hash por clube, o teste diz o nome do clube; e como o
   elenco é hasheado jogador a jogador, ele também sabe apontar quem. São 432 entradas, uns
   poucos KB, e o arquivo vira um documento legível do que existe. */
function retrato() {
  const clubes = carregarClubes();
  const porClube = {};
  const grupos = {};

  for (const it of clubes) {
    const k = `${it.pais}|${it.div}`;
    (grupos[k] = grupos[k] || { clubes: 0, jogadores: 0 });
    const ident = {}; for (const c of CAMPOS_CLUBE) ident[c] = it.c[c];
    const elenco = (it.c.squad || []).map(p => {
      const j = {}; for (const campo of Object.keys(p)) if (!IGNORAR_JOGADOR.has(campo)) j[campo] = p[campo];
      return { n: p.n, h: hash(j) };
    });
    porClube[String(it.c.id)] = {
      grupo: k, nome: it.c.short || it.c.name,
      hIdent: hash(ident), nJog: elenco.length, hElenco: hash(elenco),
      jogadores: elenco.reduce((o, e) => (o[e.n] = e.h, o), {}),
    };
    grupos[k].clubes++; grupos[k].jogadores += elenco.length;
  }

  const catalogo = {};
  for (const k of Object.keys(grupos).sort()) catalogo[k] = grupos[k];

  /* As folhas de economia: um alias de liga registrado por engano no mundo feminino apareceria
     aqui, e é o tipo de vazamento que ninguém procuraria. */
  const ctx = { window: {}, console }; ctx.globalThis = ctx;
  for (const f of ['public/src/engine/world-config.js', 'public/src/data/universos.js',
                   'public/src/data/market-engine.js', 'public/src/data/rebalance.js',
                   'public/src/data/prizes.js'])
    runInNewContext(readFileSync(resolve(RAIZ, f), 'utf8'), ctx);

  /* AS FOLHAS MUDAM DE VITRINE. `REBAL` e `PRIZES` moravam em `window` e passaram para
     `globalThis` quando a economia virou folha unica (a23a548) -- lendo so' `window`, este teste
     via `undefined` e acusava "mudou" sem nada ter mudado de verdade. Procurar nos dois lugares
     e' o que separa "a calibracao mudou" de "o arquivo se expoe de outro jeito". */
  const de = (nome) => ctx.window[nome] || ctx[nome] || {};
  const M = de('MARKET');
  const mercado = {
    ligas: hash(M.LEAGUES || {}),
    divisionToLeague: ['A','B','C','D'].map(d => M.divisionToLeague ? M.divisionToLeague(d) : null),
    premios: hash(de('PRIZES')),
  };

  /* REBAL é função, não tabela: a calibração só se compara aplicando-a. Uma grade fixa de
     entradas cobre as quatro faixas de divisão de ponta a ponta.

     A GRADE COBRE O DINHEIRO, E NAO SO' A FORCA. Antes só `force` entrava, e por isso o
     trabalho de folha/receita (a23a548) passou por aqui sem ser visto: ele mexeu em salário,
     orçamento e receita, que é onde o jogo dói. Um teste que cobre a metade barata da
     calibração dá a impressão de proteger a outra. */
  const R = de('REBAL');
  const ap = (fn, ...a) => (typeof R[fn] === 'function' ? R[fn](...a) : null);
  const grade = [];
  for (const div of ['A','B','C','D']) for (let raw = 40; raw <= 95; raw += 5) {
    const f = ap('force', raw, div);
    grade.push([div, raw, f, ap('value', f, 27), ap('salary', f, 27), ap('wage', f, 27)]);
  }
  /* orçamento, receita e capacidade saem do OVERALL do clube, não da força de um jogador */
  for (const div of ['A','B','C','D']) for (const ovr of [15, 20, 25, 35, 50, 65, 80])
    grade.push(['clube', div, ovr, ap('budget', ovr, div), ap('income', ovr, div),
                ap('stadiumCapForDivision', ovr, div)]);
  const rebalance = hash(grade);

  const totais = Object.values(catalogo).reduce((a, g) => ({ clubes: a.clubes + g.clubes, jogadores: a.jogadores + g.jogadores }), { clubes: 0, jogadores: 0 });

  return { versao: 2, totais, catalogo, clubes: porClube, mercado, rebalance };
}

/* ---------- comparação ---------- */
const atual = retrato();

if (GRAVAR) {
  writeFileSync(ARQUIVO, JSON.stringify(atual, null, 1));
  console.log(`✎ fotografia gravada: ${totalTexto(atual)}`);
  console.log('  scripts/baseline-masculino.json — commite este arquivo.');
  process.exit(0);
}

function totalTexto(r) { return `${r.totais.clubes} clubes · ${r.totais.jogadores} jogadores`; }

if (!existsSync(ARQUIVO)) {
  console.error('❌ scripts/baseline-masculino.json não existe.');
  console.error('   Gere-o com o código ainda intocado: node scripts/teste-regressao-masculina.mjs --gravar');
  process.exit(1);
}
const base = JSON.parse(readFileSync(ARQUIVO, 'utf8'));

let falhas = 0;
const reprova = (m) => { falhas++; console.log('  ✘ ' + m); };

console.log(`Mundo masculino: ${totalTexto(atual)}\n`);

console.log('1. Contagens por país e divisão');
const grupos = [...new Set([...Object.keys(base.catalogo), ...Object.keys(atual.catalogo)])].sort();
for (const k of grupos) {
  const b = base.catalogo[k], a = atual.catalogo[k];
  if (!b) { reprova(`grupo NOVO: ${k}`); continue; }
  if (!a) { reprova(`grupo SUMIU: ${k}`); continue; }
  if (b.clubes !== a.clubes)       reprova(`${k}: clubes ${b.clubes} → ${a.clubes}`);
  if (b.jogadores !== a.jogadores) reprova(`${k}: jogadores ${b.jogadores} → ${a.jogadores}`);
}
if (!falhas) console.log(`   ${grupos.length} grupos, contagens idênticas`);

console.log('\n2. Clubes e elencos');
const ids = [...new Set([...Object.keys(base.clubes || {}), ...Object.keys(atual.clubes)])].sort();
let iguais = 0;
for (const id of ids) {
  const b = (base.clubes || {})[id], a = atual.clubes[id];
  if (!b) { reprova(`clube NOVO: ${id} (${a.nome})`); continue; }
  if (!a) { reprova(`clube SUMIU: ${id} (${b.nome})`); continue; }
  if (b.hIdent === a.hIdent && b.hElenco === a.hElenco) { iguais++; continue; }

  const onde = `${a.nome} [${id}]`;
  if (b.hIdent !== a.hIdent) reprova(`${onde}: identidade do clube mudou (nome, cores, escudo, liga ou força)`);
  if (b.hElenco !== a.hElenco) {
    /* Desce até o jogador: é a diferença entre "algo mudou na Série B" e "a força do Vitor
       Roque mudou". Sem isto, o teste acusa e não ajuda. */
    const nomes = [...new Set([...Object.keys(b.jogadores || {}), ...Object.keys(a.jogadores || {})])];
    const saiu    = nomes.filter(n => b.jogadores[n] && !a.jogadores[n]);
    const entrou  = nomes.filter(n => !b.jogadores[n] && a.jogadores[n]);
    const mudou   = nomes.filter(n => b.jogadores[n] && a.jogadores[n] && b.jogadores[n] !== a.jogadores[n]);
    const partes = [];
    if (mudou.length)  partes.push(`${mudou.length} alterado(s): ${mudou.slice(0, 4).join(', ')}${mudou.length > 4 ? '…' : ''}`);
    if (saiu.length)   partes.push(`${saiu.length} removido(s): ${saiu.slice(0, 4).join(', ')}${saiu.length > 4 ? '…' : ''}`);
    if (entrou.length) partes.push(`${entrou.length} acrescentado(s): ${entrou.slice(0, 4).join(', ')}${entrou.length > 4 ? '…' : ''}`);
    reprova(`${onde}: elenco — ${partes.join(' · ') || 'ordem mudou'}`);
  }
}
console.log(`   ${iguais} de ${ids.length} clubes idênticos`);

console.log('\n3. Economia');
if (base.mercado.ligas !== atual.mercado.ligas) reprova('MARKET.LEAGUES mudou');
if (JSON.stringify(base.mercado.divisionToLeague) !== JSON.stringify(atual.mercado.divisionToLeague))
  reprova(`divisionToLeague mudou: ${JSON.stringify(base.mercado.divisionToLeague)} → ${JSON.stringify(atual.mercado.divisionToLeague)}`);
if (base.mercado.premios !== atual.mercado.premios) reprova('PRIZES mudou');
if (base.rebalance !== atual.rebalance) reprova('REBAL.force mudou (calibração de força)');
if (!falhas || falhas === 0) console.log('   mercado, prêmios e rebalanceamento idênticos');

console.log();
if (falhas) {
  console.log(`✘ o mundo masculino MUDOU (${falhas} diferença(s))`);
  console.log('  Se a mudança é intencional e revisada, regrave: node scripts/teste-regressao-masculina.mjs --gravar');
  process.exit(1);
}
console.log('✓ mundo masculino inalterado');
