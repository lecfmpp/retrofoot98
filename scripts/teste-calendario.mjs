/* CONFERÊNCIA DO CALENDÁRIO — a rede que faltava.
   Roda o gerador de dias (WORLD_RULES.buildDayPlan) e verifica as invariantes que importam,
   para TODOS os totais de rodada plausíveis de cada copa. Sem navegador e sem servidor: é só a
   folha, que é onde o calendário mora.

   POR QUE EXISTE. Em 17/08/2026 as três salas com day_plan do banco tinham a FINAL da
   Sul-Americana agendada ANTES da própria semifinal, e com 12 rodadas continentais a
   Libertadores também. O plano era ordenado por DATA enquanto a jornada vinha da ancoragem —
   duas coordenadas que podiam discordar. O código protegia a invariante das jornadas crescentes;
   a que quebrou (as rodadas de uma competição aparecem no plano na ordem em que se jogam) nunca
   tinha sido verificada por ninguém. Este arquivo verifica-a.

   Uso:  node scripts/teste-calendario.mjs        (sai 1 se alguma invariante falhar) */
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
require(resolve(raiz, 'public/src/engine/world-rules.js'));
const W = globalThis.WORLD_RULES;

const COPAS = ['copaBrasil', 'libertadores', 'sulamericana'];
/* totais plausíveis de cada copa. As continentais variam com o formato: 6 de grupos + 1 tique de
   sorteio + 4 de mata-mata = 11, e 12 quando há uma fase a mais (ver cupTotalRounds em core.js).
   O 13 está aqui de propósito: uma folha nova de país tem de continuar a fechar. */
const TOTAIS = { copaBrasil: [6, 7, 8], libertadores: [10, 11, 12, 13], sulamericana: [10, 11, 12, 13] };

let falhas = 0;
function reprova(caso, msg) { falhas++; console.log('  ✘ ' + caso + ' — ' + msg); }

function combinacoes() {
  const out = [];
  for (const cb of TOTAIS.copaBrasil)
    for (const lib of TOTAIS.libertadores)
      for (const sul of TOTAIS.sulamericana)
        out.push({ copaBrasil: cb, libertadores: lib, sulamericana: sul });
  return out;
}

console.log('Conferência do calendário — ' + combinacoes().length + ' combinações de formato\n');

for (const totais of combinacoes()) {
  const caso = 'CdB ' + totais.copaBrasil + ' / Lib ' + totais.libertadores + ' / Sul ' + totais.sulamericana;
  const plano = W.buildDayPlan(COPAS, null, totais);

  /* 1. NENHUMA COMPETIÇÃO ANDA PARA TRÁS — a final nunca antes da semifinal.
        É a invariante que quebrou e produziu o bug. */
  for (const k of COPAS) {
    const idxs = plano.filter(e => e.comp === k).map(e => e.idx);
    for (let i = 1; i < idxs.length; i++)
      if (idxs[i] <= idxs[i - 1]) { reprova(caso, k + ': rodada ' + idxs[i] + ' aparece depois da ' + idxs[i - 1]); break; }
  }

  /* 2. NENHUMA RODADA PERDIDA — toda rodada de toda copa tem um dia no plano.
        Era assim que a final desaparecia antes (o gerador cortava o excedente em silêncio). */
  for (const k of COPAS) {
    const faltam = [];
    for (let i = 0; i < totais[k]; i++) if (!plano.some(e => e.comp === k && e.idx === i)) faltam.push(i);
    if (faltam.length) reprova(caso, k + ': rodadas sem dia no plano — ' + faltam.join(', '));
  }

  /* 3. A LIGA INTEIRA ESTÁ LÁ, uma vez cada. */
  const liga = plano.filter(e => e.comp === 'liga').map(e => e.idx);
  const ligaEsperada = W.calendar().league.length;
  if (liga.length !== ligaEsperada) reprova(caso, 'liga com ' + liga.length + ' jornadas, esperado ' + ligaEsperada);
  if (new Set(liga).size !== liga.length) reprova(caso, 'liga com jornada repetida no plano');

  /* 4. UMA COMPETIÇÃO NÃO JOGA DUAS VEZES NA MESMA JORNADA. */
  const porJornada = {};
  plano.forEach(e => { const c = porJornada[e.r] = porJornada[e.r] || {}; c[e.comp] = (c[e.comp] || 0) + 1; });
  Object.keys(porJornada).forEach(r => Object.keys(porJornada[r]).forEach(k => {
    if (porJornada[r][k] > 1) reprova(caso, k + ' joga ' + porJornada[r][k] + 'x na jornada ' + r);
  }));

  /* 5. A FINAL DA COPA DO BRASIL CONTINUA DEPOIS DO ÚLTIMO JOGO DA LIGA.
        Só na configuração REAL (7 rodadas): é a 7ª data da folha, 06/12, e o último jogo da liga
        é 03/12. Com menos rodadas a final usa uma data anterior da folha e vir antes é o certo —
        a invariante é "a ordem é a da folha", que o teste 1 já cobre. Este caso existe porque foi
        ele que obrigou a ordenação a olhar para a data, e uma regressão aqui é silenciosa. */
  const ultimaLiga = plano.map((e, i) => e.comp === 'liga' ? i : -1).filter(i => i >= 0).pop();
  const finalCdB = plano.findIndex(e => e.comp === 'copaBrasil' && e.idx === totais.copaBrasil - 1);
  if (finalCdB < 0) reprova(caso, 'final da Copa do Brasil não está no plano');
  else if (totais.copaBrasil === 7 && finalCdB < ultimaLiga)
    reprova(caso, 'final da Copa do Brasil antes do último jogo de liga');
}

/* 6. UM UNIVERSO SEM AS CONTINENTAIS (começar na Série D, ou um país fora da CONMEBOL) continua
      a gerar plano — é o caminho que o multi-país vai usar. */
const soLiga = W.buildDayPlan(['copaBrasil'], null, { copaBrasil: 7 });
if (!soLiga.length) reprova('só Copa do Brasil', 'plano vazio');
if (!soLiga.some(e => e.comp === 'copaBrasil' && e.idx === 6)) reprova('só Copa do Brasil', 'final sem dia');

console.log('');
if (falhas) { console.log('✘ ' + falhas + ' invariante(s) quebrada(s)'); process.exit(1); }
console.log('✓ calendário íntegro em todas as combinações');
