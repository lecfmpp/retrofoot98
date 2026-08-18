/* CONFERÊNCIA DO CALENDÁRIO — a rede que faltava.
   Monta o plano de dias (WORLD_RULES.buildDayPlan) para TODOS os países declarados na folha de
   slots (engine/calendars.js) e em todos os formatos de copa plausíveis, e verifica as
   invariantes que importam.

   POR QUE EXISTE. Em 17/08/2026 as três salas com day_plan do banco tinham a FINAL da
   Sul-Americana agendada ANTES da própria semifinal, e com 12 rodadas continentais a Libertadores
   também. O modelo antigo tinha DUAS coordenadas — a jornada, que a ancoragem espremia, e a data,
   que vinha da folha e não se movia junto — e o plano era ordenado pela data. O código protegia a
   invariante das jornadas crescentes; a que quebrou (as rodadas de uma competição aparecem no
   plano na ordem em que se jogam) nunca tinha sido verificada por ninguém.

   Hoje só existe `(slot, janela)` e a ordem é monótona por construção. Este arquivo continua
   aqui porque "por construção" é uma afirmação sobre o código de hoje, e porque é ele que
   valida a folha de um país NOVO — que é dado escrito à mão, e dado escrito à mão erra.

   Uso:  node scripts/teste-calendario.mjs        (sai 1 se alguma invariante falhar) */
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
require(resolve(raiz, 'public/src/data/universos.js'));
require(resolve(raiz, 'public/src/engine/calendars.js'));
require(resolve(raiz, 'public/src/engine/world-rules.js'));
const W = globalThis.WORLD_RULES, C = globalThis.CALENDARIOS_API, U = globalThis.UNIVERSOS;

/* Totais plausíveis de rodada. As continentais variam com o formato: 6 de grupos + 1 tique só
   para sortear o mata-mata + 4 de mata-mata = 11, e 12 quando há uma fase a mais (ver
   cupTotalRounds em core.js). Os extremos estão aqui de propósito: uma folha de país nova tem de
   continuar a fechar mesmo quando o formato do save não bate com o número de slots declarados. */
const TOTAIS_POSSIVEIS = { nacional: [6, 7, 8], continental: [10, 11, 12, 13, 14] };

let falhas = 0;
function reprova(caso, msg) { falhas++; console.log('  ✘ ' + caso + ' — ' + msg); }

/* combinações de formato para as copas de um país */
function combinacoes(cal) {
  const copas = Object.keys(cal.competicoes).filter((k) => k !== 'liga');
  const opcoes = copas.map((k) => (k === 'copaBrasil' ? TOTAIS_POSSIVEIS.nacional : TOTAIS_POSSIVEIS.continental));
  let saida = [{}];
  copas.forEach((k, i) => {
    const nova = [];
    saida.forEach((base) => opcoes[i].forEach((n) => nova.push(Object.assign({}, base, { [k]: n }))));
    saida = nova;
  });
  return { copas, combos: saida };
}

for (const pais of C.paisesComCalendario()) {
  const cal = C.calendarioDe(pais);
  const { copas, combos } = combinacoes(cal);
  console.log(pais + ' — ' + combos.length + ' combinações de formato, ' + cal.slotsTotal + ' slots');

  /* ===== A FOLHA, antes de qualquer plano =====
     Duas competições do mesmo país não podem partilhar `(slot, janela)`: seria a sala inteira
     em duas telas ao mesmo tempo. E a liga tem de ter slots para a divisão MAIS LONGA do país —
     uma Championship de 24 clubes joga 46 rodadas, não 38. */
  const ocupadas = new Set();
  Object.entries(cal.competicoes).forEach(([k, c]) => c.slots.forEach((s) => {
    const chave = s + ':' + c.janela;
    if (ocupadas.has(chave)) reprova(pais, 'slot ' + s + ' / ' + c.janela + ' com mais de uma competição (' + k + ')');
    ocupadas.add(chave);
  }));
  Object.entries(cal.competicoes).forEach(([k, c]) => {
    if (C.JANELAS.indexOf(c.janela) < 0) reprova(pais, k + ': janela desconhecida "' + c.janela + '"');
    for (let i = 1; i < c.slots.length; i++)
      if (c.slots[i] <= c.slots[i - 1]) reprova(pais, k + ': slots fora de ordem (' + c.slots[i - 1] + ' -> ' + c.slots[i] + ')');
    if (c.slots.some((s) => s < 1 || s > cal.slotsTotal)) reprova(pais, k + ': slot fora de 1..' + cal.slotsTotal);
  });

  for (const totais of combos) {
    const caso = pais + ' [' + copas.map((k) => k + ' ' + totais[k]).join(', ') + ']';
    const plano = W.buildDayPlan(copas, null, totais, { pais });
    if (!plano.length) { reprova(caso, 'plano vazio'); continue; }

    /* 1. NENHUMA COMPETIÇÃO ANDA PARA TRÁS — a final nunca antes da semifinal.
          É a invariante que quebrou e produziu o bug. */
    for (const k of copas) {
      const idxs = plano.filter((e) => e.comp === k).map((e) => e.idx);
      for (let i = 1; i < idxs.length; i++)
        if (idxs[i] <= idxs[i - 1]) { reprova(caso, k + ': rodada ' + idxs[i] + ' aparece depois da ' + idxs[i - 1]); break; }
    }

    /* 2. NENHUMA RODADA PERDIDA. Era assim que a final desaparecia: o gerador antigo cortava o
          excedente em silêncio e a competição nunca chegava ao campeão. */
    for (const k of copas) {
      const faltam = [];
      for (let i = 0; i < totais[k]; i++) if (!plano.some((e) => e.comp === k && e.idx === i)) faltam.push(i);
      if (faltam.length) reprova(caso, k + ': rodadas sem dia — ' + faltam.join(', '));
    }

    /* 3. A ORDEM DO PLANO É A DA CHAVE DO SLOT, sem exceção. */
    for (let i = 1; i < plano.length; i++) {
      const a = C.chaveDoDia(plano[i - 1].slot, plano[i - 1].janela), b = C.chaveDoDia(plano[i].slot, plano[i].janela);
      if (b < a) { reprova(caso, 'plano fora de ordem na posição ' + i); break; }
    }

    /* 4. A LIGA INTEIRA ESTÁ LÁ, uma vez cada. */
    const liga = plano.filter((e) => e.comp === 'liga').map((e) => e.idx);
    if (liga.length !== cal.competicoes.liga.slots.length) reprova(caso, 'liga com ' + liga.length + ' jornadas');
    if (new Set(liga).size !== liga.length) reprova(caso, 'liga com jornada repetida');

    /* 5. UMA COMPETIÇÃO NÃO JOGA DUAS VEZES NO MESMO DIA, nem duas competições partilham o dia —
          a sala inteira tem de estar sempre na mesma tela. */
    const porDia = {};
    plano.forEach((e) => { const c = (porDia[e.slot + ':' + e.janela] = porDia[e.slot + ':' + e.janela] || []); c.push(e.comp); });
    Object.entries(porDia).forEach(([d, l]) => { if (l.length > 1) reprova(caso, 'dia ' + d + ' com ' + l.join(' + ')); });

    /* 6. TODA FINAL ACONTECE DEPOIS DO ÚLTIMO JOGO DA LIGA.
          É o que o calendário antigo não sabia representar: espremia a final para trás (e ela
          colidia) ou a perdia. Com slots, as finais moram em slots que a liga não usa. */
    const fimDaLiga = plano.map((e, i) => (e.comp === 'liga' ? i : -1)).filter((i) => i >= 0).pop();
    for (const k of copas) {
      const posFinal = plano.map((e, i) => (e.comp === k && e.idx === totais[k] - 1 ? i : -1)).filter((i) => i >= 0).pop();
      if (posFinal == null) { reprova(caso, k + ': sem final no plano'); continue; }
      if (posFinal < fimDaLiga) reprova(caso, k + ': final antes do último jogo de liga');
    }
  }
}

/* 7. UMA LIGA MAIS CURTA QUE A FOLHA usa só os primeiros slots — é o que faz um país com
      divisões de tamanhos diferentes (Premier 38, Championship 46) caber na mesma folha. */
{
  const curta = W.buildDayPlan(['championsLeague', 'europaLeague'], null,
    { championsLeague: 12, europaLeague: 12 }, { pais: 'Inglaterra', jornadasLiga: 38 });
  const liga = curta.filter((e) => e.comp === 'liga');
  if (liga.length !== 38) { falhas++; console.log('  ✘ liga curta: ' + liga.length + ' jornadas, esperado 38'); }
  const idxs = curta.filter((e) => e.comp === 'championsLeague').map((e) => e.idx);
  for (let i = 1; i < idxs.length; i++)
    if (idxs[i] <= idxs[i - 1]) { falhas++; console.log('  ✘ liga curta: Champions fora de ordem'); break; }
}

/* 8. PAÍS SEM FOLHA cai no Brasil em vez de devolver plano vazio — sala nova de um país ainda
      não desenhado tem de abrir, não morrer. */
{
  const fallback = W.buildDayPlan(['copaBrasil'], null, { copaBrasil: 7 }, { pais: 'Narnia' });
  if (!fallback.length) { falhas++; console.log('  ✘ país sem folha: plano vazio'); }
}

/* 9. O CALENDÁRIO DO SOLO É O MESMO DA SALA.
      `S.cupCalendar` (solo, e a trava "uma rodada por competição por jornada" no servidor) vem de
      buildCupSchedule; o plano de dias da sala vem de buildDayPlan. São dois caminhos, e têm de
      dar a MESMA lista de jornadas — enquanto não davam, o solo dizia que a final da Libertadores
      era na jornada 40 e a sala dizia 39. Dois calendários é a forma exata do bug que os slots
      vieram resolver, então esta é a invariante que impede a recaída. */
for (const pais of C.paisesComCalendario()) {
  const cal = C.calendarioDe(pais);
  const copas = Object.keys(cal.competicoes).filter((k) => k !== 'liga');
  for (const totais of combinacoes(cal).combos) {
    const plano = W.buildDayPlan(copas, null, totais, { pais });
    for (const k of copas) {
      const doPlano = plano.filter((e) => e.comp === k).map((e) => e.r);
      const doSolo = W.buildCupSchedule(k, totais[k], null, pais);
      if (JSON.stringify(doPlano) !== JSON.stringify(doSolo))
        reprova(pais + ' ' + k + ' x' + totais[k], 'solo e sala com calendários diferentes\n      sala: ' + JSON.stringify(doPlano) + '\n      solo: ' + JSON.stringify(doSolo));
    }
  }
}

/* 10. NADA A INVENTAR NO FIM DO ANO.
       A temporada passou a nascer com as jornadas das finais (ensureCupCalendar). Se o calendário
       estiver certo, `prorrogarPorCopasPendentes` não tem o que fazer — e é isso que a torna rede
       de segurança em vez de conserto de todo ano. Aqui: uma temporada cujas copas já têm todas
       as jornadas marcadas não pode ganhar jornada nenhuma. */
{
  const cal = C.calendarioDe('brasil');
  const copas = Object.keys(cal.competicoes).filter((k) => k !== 'liga');
  const totais = {}; copas.forEach((k) => totais[k] = k === 'copaBrasil' ? 7 : 11);
  const cupCalendar = {}; copas.forEach((k) => cupCalendar[k] = W.buildCupSchedule(k, totais[k], null, 'brasil'));
  const maior = Math.max(...copas.flatMap((k) => cupCalendar[k]));
  const S = { sched: Array.from({ length: maior + 1 }, () => []), cupCalendar, round: 0 };
  const pendentes = copas.map((k) => ({ key: k, faltam: 1, criar: 0 }));
  const antes = S.sched.length;
  W.prorrogarPorCopasPendentes(S, pendentes, 24);
  if (S.sched.length !== antes) { falhas++; console.log('  ✘ prorrogação inventou ' + (S.sched.length - antes) + ' jornada(s) num calendário completo'); }
  copas.forEach((k) => {
    if (JSON.stringify(S.cupCalendar[k]) !== JSON.stringify(cupCalendar[k]))
      { falhas++; console.log('  ✘ prorrogação mexeu no calendário de ' + k); }
  });
}

/* 11. O RÓTULO DE DATA NUNCA ANDA PARA TRÁS.
       A data deixou de ordenar coisa nenhuma, mas continua na tela. As datas reais da liga não
       são igualmente espaçadas (entre 24/10 e 27/10 há três dias), e recuar quatro dias para a
       janela de meio de semana punha o dia ANTES do jogo do slot anterior — a tela mostrava
       27/10 e a seguir 26/10. */
/* Varre também EPOCHS diferentes (cada temporada começa noutro dia da semana, e é aí que o
   espaçamento das datas reais muda de forma) e ligas de tamanhos diferentes. */
const EPOCHS = [null, [2026, 2, 1], [2027, 1, 15], [2028, 6, 3], [2029, 0, 29]];
for (const pais of C.paisesComCalendario()) {
  const cal = C.calendarioDe(pais);
  const copas = Object.keys(cal.competicoes).filter((k) => k !== 'liga');
  for (const totais of combinacoes(cal).combos) {
    for (const ep of EPOCHS) {
      for (const jl of [null, 34, 38, 46]) {
        const plano = W.buildDayPlan(copas, ep, totais, { pais, jornadasLiga: jl });
        for (let i = 1; i < plano.length; i++) {
          if (plano[i].dia < plano[i - 1].dia) {
            reprova(pais, 'data anda para trás (epoch ' + JSON.stringify(ep) + ', liga ' + jl + '): ' +
              plano[i - 1].comp + ' dia ' + plano[i - 1].dia + ' -> ' + plano[i].comp + ' dia ' + plano[i].dia);
            break;
          }
        }
      }
    }
  }
}
/* E o caminho do SOLO, que mostra data pela mesma folha (leagueMatchDay / cupMatchDayAt). */
for (const pais of C.paisesComCalendario()) {
  let ant = -1;
  for (let j = 0; j < C.calendarioDe(pais).slotsTotal; j++) {
    const d = W.leagueMatchDay(j, null, pais);
    if (d < ant) { reprova(pais, 'dia de liga anda para trás na jornada ' + j); break; }
    ant = d;
  }
}

/* 12. A FOLHA DE CADA PAÍS PASSA NO PRÓPRIO VALIDADOR.
       `validarCalendario` é o mesmo código que o painel admin roda na tela e que o motor roda ao
       montar a temporada — se ele reprova uma folha que está no repositório, é a folha que está
       errada. Os totais aqui são os reais do Brasil (7 e 11) e o formato cheio das europeias. */
for (const pais of C.paisesComCalendario()) {
  const cal = C.calendarioDe(pais);
  const totais = {};
  Object.keys(cal.competicoes).forEach((k) => { if (k !== 'liga') totais[k] = (k === 'copaBrasil') ? 7 : 11; });
  const problemas = C.validarCalendario(pais, { totais, divisoes: U[pais] && U[pais].size });
  problemas.filter((x) => x.nivel === 'erro').forEach((x) => reprova(pais, 'validador: ' + (x.comp || '') + ' — ' + x.texto));
  problemas.filter((x) => x.nivel === 'aviso').forEach((x) => console.log('      aviso: ' + pais + ' ' + (x.comp || '') + ' — ' + x.texto));
}

console.log('');
if (falhas) { console.log('✘ ' + falhas + ' invariante(s) quebrada(s)'); process.exit(1); }
console.log('✓ calendário íntegro — ' + C.paisesComCalendario().join(', '));
