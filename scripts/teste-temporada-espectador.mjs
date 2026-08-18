/* BANCADA DA TEMPORADA — "EU VI TODAS AS FINAIS?"

   POR QUE EXISTE. O defeito que custou mais caro neste projeto foi silencioso: as rodadas de
   copa eram resolvidas em segundo plano e o jogador só dava pela falta em dezembro, quando a
   final "não acontecia". Nenhum teste de dados apanha isso — o calendário estava certo, os
   campeões existiam, e mesmo assim ninguém tinha visto nada.

   E a minha primeira tentativa de automação MENTIU: um condutor que forçava telas
   (`CL.screen='main'`) quebrou o encadeamento das cerimônias e concluiu que a tela de espectador
   nunca abria — o que era falso. Por isso esta bancada **clica nos botões de verdade** e **tira
   screenshots**: o que ela afirma, afirma porque a tela mostrou.

   O QUE FAZ. Adianta um save de solo até a jornada 30 (isso é preparação, não é o que se testa),
   e daí em diante joga pela interface até a 2ª rodada da temporada seguinte — atravessando as
   finais das três copas e a virada de ano. Regista, para cada rodada de copa, se ela foi
   ASSISTIDA ou resolvida em segundo plano, e guarda um PNG de cada final.

   REPROVA se alguma final não foi assistida.

   ESTADO EM 18/08/2026: INCOMPLETA. Chega à jornada 32 e emperra na tela principal — clica a ação
   principal e nada avança. Falta descobrir o quê. Fica no repositório porque as três armadilhas
   que ela já custou estão resolvidas aqui dentro e valem para qualquer automação futura:
     1. O botão de ação NÃO se acha por texto: o rótulo muda ("Jogar", "Ver o sorteio",
        "Avançar dia"). É `.rf-btn-primary.rf-btn-full`. Procurar por texto fazia a bancada clicar
        no escudo do clube e rodar sem sair do lugar.
     2. A barra lateral inteira é proibida: navegar não é jogar.
     3. A partida PAUSA no intervalo (minuto 45) à espera de um clique. Sem tratar isso, a bancada
        fica presa para sempre num jogo que não acaba — custou duas execuções de dez minutos.
   E a lição maior: NÃO forçar `CL.screen`. Foi assim que a primeira automação concluiu, e me fez
   afirmar, que a tela de espectador nunca abria — o que era falso.

   Uso:  node scripts/teste-temporada-espectador.mjs          (dev server em :5199)
         node scripts/teste-temporada-espectador.mjs --ver    (abre o navegador à vista) */
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:5199/?rf=hub';
const SAIDA = '/tmp/temporada-espectador';
const VER = process.argv.includes('--ver');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(SAIDA, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: VER ? false : 'new',
  args: ['--no-sandbox', '--disable-background-timer-throttling',
         '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
  defaultViewport: { width: 1440, height: 950 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  [ERRO DA PÁGINA] ' + String(e).split('\n')[0]));
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(2500);

/* ---- instrumentação: quem abriu tela, quem resolveu no escuro ---- */
await page.evaluate(() => {
  window.__T = { assistidas: [], fundo: [], finais: [] };
  const oS = window.startCupRound;
  window.startCupRound = function (k, st, p) {
    const r = oS.apply(this, arguments);
    if (r) window.__T.assistidas.push({ j: S.round, comp: k, stage: st, meu: !!p });
    return r;
  };
  const marcaFinal = (comp) => {
    const c = S.cups[comp], b = (c && c.champion !== undefined) ? c : (c && c.bracket);
    // final = a chave tem UM confronto e o vencedor dele leva a taça
    return !!(b && !b.champion && (b.ties || []).length === 1);
  };
  window.__ehFinal = marcaFinal;
  const oA = window.advanceCupBracket;
  window.advanceCupBracket = function (S_, b, seed, ...rest) {
    const comp = String(seed).replace(/-r\d+$/, '');
    window.__T.fundo.push({ j: S.round, comp, final: (b && (b.ties || []).length === 1) });
    return oA.apply(this, arguments);
  };
});

/* ---- preparação: até a jornada 30 sem interface (não é o que se testa) ---- */
console.log('preparando: avanço rápido até a jornada 30…');
await page.evaluate(() => {
  CL.tacticChosen = true;
  let g = 0;
  while (S.round < 30 && !S.finished && g++ < 200) playRound(null, null);
  // zera o que a preparação registou: o teste começa agora
  window.__T = { assistidas: [], fundo: [], finais: [] };
  S._copaNaoAssistida = {};
});
const inicio = await page.evaluate(() => ({ j: S.round, t: S.season }));
console.log(`começa na jornada ${inicio.j}, temporada ${inicio.t}\n`);

/* ---- o teste: joga pela INTERFACE até a 2ª rodada da temporada seguinte ---- */
const alvo = { temporada: inicio.t + 1, jornada: 2 };
let passos = 0, ultimo = '', semAcao = 0;
const tiros = [];

while (passos++ < 1200) {
  const st = await page.evaluate(() => ({
    j: S.round, t: S.season, tela: CL.screen, live: !!CL.live,
    cup: (CL.live && CL.live.cup && CL.live.cup.key) || null,
    espectador: !!(CL.live && CL.live.cup && CL.live.cup.spectate),
    ehFinalDaTela: !!(CL.live && CL.live.cup && CL.live.matches && CL.live.matches.length === 1),
    fim: S.season > 0,
  }));
  if (st.t > alvo.temporada || (st.t === alvo.temporada && st.j >= alvo.jornada)) break;

  /* PROGRESSO EM ARQUIVO. A saída da consola fica presa em qualquer `| tail`, e uma bancada que
     demora minutos sem dar sinal é indistinguível de uma travada — perdi duas execuções assim. */
  const chave = st.tela + '|' + st.cup + '|' + st.j + '|' + st.t;
  if (chave !== ultimo) {
    ultimo = chave;
    const linha = `passo ${passos} · t${st.t} j${st.j} · ${st.tela}${st.cup ? ' · ' + st.cup + (st.espectador ? ' (assistindo)' : '') : ''}`;
    console.log(linha);
    try { writeFileSync(`${SAIDA}/progresso.txt`, linha + '\n' + new Date().toISOString()); } catch (e) {}
  }

  /* PNG de toda partida de copa que entra em campo — é a prova de que a tela existiu */
  if (st.live && st.cup) {
    const nome = `${SAIDA}/j${String(st.j).padStart(2, '0')}-${st.cup}${st.ehFinalDaTela ? '-FINAL' : ''}.png`;
    try { await page.screenshot({ path: nome }); tiros.push(nome); } catch (e) {}
  }

  /* clica o que a tela oferece — botões de verdade, nunca CL.screen na marra.
     O botão de ação principal é `.rf-btn-primary.rf-btn-full` e o RÓTULO DELE MUDA: diz "Jogar",
     mas também "Ver o sorteio", "Avançar dia", "Continuar"… Procurar por texto falha, e foi o que
     travou a primeira versão desta bancada — ela clicava no primeiro botão visível, que é o
     escudo do clube na barra lateral, e ficava a rodar sem sair do lugar.
     A barra lateral inteira é PROIBIDA: navegar para outra tela não é jogar. */
  const clicou = await page.evaluate(() => {
    const vis = (el) => el && el.offsetParent !== null && !el.disabled;
    /* PARTIDA EM CAMPO. Enquanto corre, deixa correr — a bancada tem de VER o jogo, é esse o
       ponto dela. Quando termina, `RL.done` fica verdadeiro e a tela espera um clique: sem tratar
       isso, a bancada fica presa para sempre num jogo que já acabou (foi o que aconteceu na
       primeira execução, parada na jornada 30). Acelera o relógio ao máximo que a UI oferece. */
    if (CL.live) {
      CL.speedMult = 3;
      /* O INTERVALO PAUSA A PARTIDA no minuto 45 e espera um clique em Continuar. A primeira
         versão desta bancada ficava presa aí para sempre — "tem partida ao vivo, deixa correr" —
         e eu levei duas execuções de dez minutos a perceber. É o botão do jogo que se clica,
         não uma variável: liveContinue é o mesmo caminho do dedo do jogador. */
      if (CL.live.paused) { if (typeof liveContinue === 'function') liveContinue(); return 'intervalo'; }
      if (!CL.live.done) return 'live';
      const fim = Array.from(document.querySelectorAll('.cl-btn, .rf-btn, .rf-ov-cta, .rf-dlg-foot button'))
        .filter((b) => b.offsetParent !== null && !b.disabled);
      if (fim.length) { const t = (fim[0].textContent || '').trim(); fim[0].click(); return 'fim:' + t; }
      return 'live-parado';
    }
    const proibido = (el) => el.closest('.rf-sidebar, .rf-nav, .rf-sb-club, .rf-sb-toggle')
      || /rf-nav-i|rf-sb-club|rf-sb-toggle|rf-band-gravar/.test(el.className || '');
    // 1) ação principal (o botão grande do "próximo jogo")
    const acao = Array.from(document.querySelectorAll('.rf-btn-primary.rf-btn-full')).find(vis);
    if (acao) { const t = (acao.textContent || '').trim(); acao.click(); return 'acao:' + t; }
    // 2) botões de janela (rodapé de diálogo, overlays, classificações)
    const janela = Array.from(document.querySelectorAll(
      '.rf-dlg-foot button, .cl-cal-ok button, .rf-ov-cta, .cl-btn, .rf-btn')).filter((b) => vis(b) && !proibido(b));
    if (janela.length) { const t = (janela[0].textContent || '').trim(); janela[0].click(); return 'janela:' + t; }
    return 'nada';
  });
  if (clicou === 'live-parado' || clicou === 'nada') semAcao++; else semAcao = 0;
  if (semAcao === 25 && st.live) {
    // rede: encerra a partida pelo caminho oficial do jogo, nunca mexendo em CL.screen
    await page.evaluate(() => {
      const RL = CL.live; if (!RL) return; RL.done = true;
      if (RL.cup && RL.cup.spectate && typeof finishCupSpectate === 'function') finishCupSpectate();
      else if (RL.cup && typeof finishCupLiveMatch === 'function') finishCupLiveMatch();
      else if (typeof finishLiveRound === 'function') finishLiveRound();
    });
  }
  if (semAcao > 40) { console.log('  parado: nenhuma ação disponível na tela ' + st.tela); break; }

  await sleep(clicou === 'live' ? 400 : 250);
}

const T = await page.evaluate(() => ({ ...window.__T, j: S.round, t: S.season,
  aviso: S._copaNaoAssistida || {} }));

/* ---- veredicto ---- */
console.log(`terminou na jornada ${T.j}, temporada ${T.t}`);
console.log(`\nrodadas de copa ASSISTIDAS: ${T.assistidas.length}`);
T.assistidas.forEach((a) => console.log(`   j${a.j}  ${a.comp}/${a.stage}${a.meu ? '  (meu clube)' : ''}`));
console.log(`\nresolvidas EM SEGUNDO PLANO: ${T.fundo.length}`);
T.fundo.forEach((f) => console.log(`   j${f.j}  ${f.comp}${f.final ? '  ← ERA A FINAL' : ''}`));

const finaisNoEscuro = T.fundo.filter((f) => f.final);
console.log(`\nscreenshots: ${tiros.length} em ${SAIDA}`);
writeFileSync(`${SAIDA}/resultado.json`, JSON.stringify(T, null, 1));

await browser.close();
if (finaisNoEscuro.length) {
  console.log(`\n✘ ${finaisNoEscuro.length} final(is) decidida(s) sem o jogador assistir: ` +
    finaisNoEscuro.map((f) => f.comp + ' (j' + f.j + ')').join(', '));
  process.exit(1);
}
if (!T.assistidas.length) { console.log('\n✘ nenhuma rodada de copa foi assistida — o fluxo do espectador não abriu'); process.exit(1); }
console.log('\n✓ nenhuma final decidida no escuro');
