# Telas que o jogo tem e o pacote de design não cobre

Estado em 2026-08-13, na branch `claude/retrofoot-new-layout-design-c09780`.

As 55 telas dos dois pacotes estão portadas. Estas aqui **existem no jogo** e ficaram sem
equivalente no pacote — hoje desenham com o shell antigo (`titleBarTop` +
`deskWrap` + `wizShell`), que é justamente o que o rebranding tira.

## Como usar esta lista

Cada tela tem quatro referências, para você achar o desenho atual e redesenhar
em cima:

| Coluna | Para que serve |
|---|---|
| **print** | O arquivo em `screenshots-atual/` — é o desenho de hoje, do jeito que o jogador vê |
| **função** | Quem monta o HTML, em `public/src/ui/main.js` salvo indicação |
| **classe** | O prefixo CSS da tela em `public/src/styles/main.css` — busque por ele para achar todo o estilo |
| **`CL.screen`** | A chave da tela. O roteador é o `switch` do `cdraw()` em `main.js:672` — trocar a tela é trocar o `case` dela |

Nem toda tela tem print: as marcadas com `—` não foram capturadas. As que não
têm `CL.screen` são sobreposições (modais) e trocam no ponto onde são chamadas.

> **Atenção ao prefixo `rf-`:** a Pausa Patrocinada (nº 23) já usa `rf-` no CSS
> antigo — ela veio de um handoff anterior. Não confundir com o `rf-` do
> rebranding 2026 (`public/src/styles/rf26.css`). São arquivos diferentes.

---

## 1 · Fluxo principal

| # | Tela | print | função | classe | `CL.screen` |
|---|---|---|---|---|---|
| 1 | **Equipa** | — | `rfEquipaHTML()` `src/ui/rf26.js:1606` | `rf-eq-` | *(destino da sidebar, `RF_PAGES` em `rf26.js:76`)* |
| 2 | **Escolha de moeda** | `06 - Escolha de moeda.png` | `scMoeda()` `2165` | `cl-bigsel` | `moeda` |
| 3 | **País jogável** | — | `scPaisJogavel()` `2139` | `cl-ctry` | `paisJogavel` |
| 4 | **Carregando** | — | `scLoading()` `2185` | `cl-prog` | `loading` |
| 5 | **Número de treinadores** | `07 - Numero de jogadores.png` | `scJogadores()` `2212` | `cl-prow` | `jogadores` |
| 6 | **Escolha dos clubes** | `08 - Escolha os clubes (sorteio).png` | `scEscolhaClubes()` `2782` | `cl-navysel`, `cl-pick` | `escolhaclubes` |
| 7 | **Continuar um save** | `03 - Solo - novo ou continuar.png`, `04 - Solo - nome do save.png` | `scModoSolo()` `1882` | `cl-mc` | `modosolo` |

> A tela 1 do pacote (*Onboarding 1 - Entrar*) mostra o acordeão de saves, mas a
> lista em si é a de nº 7 — vale desenhar as duas juntas.

## 2 · Partida — o que acontece dentro do jogo

Estas são **sobreposições** sobre a partida ao vivo. Nenhuma tem `CL.screen`
próprio: aparecem por cima de `live`.

| # | Tela | print | função | classe |
|---|---|---|---|---|
| 8 | **Pênalti — escolher batedor** | `37 - Partida - Penalti (escolher batedor).png` | `penaltyPickerHTML()` `7298` | `cl-pen` |
| 9 | **Pênalti — suspense** | `38 - Partida - Penalti (suspense).png` | `penaltySuspenseHTML()` `7351` | `cl-pen` |
| 10 | **Pênalti — resultado** | `39 - Partida - Penalti (gol).png` | `penaltyResultHTML()` `7359` | `cl-pen` |
| 11 | **Disputa de pênaltis** | `45 - Partida - Disputa de penaltis.png` | `shootoutScoreboardHTML()` `7213` | `cl-pens` |



| 15 | **Detalhe de um jogo** | `34`–`36 - Partida ao vivo...png` | `liveModalHTML()` `7240` | `cl-lm` |
| 16 | **Prorrogação** | — | `startExtraTime()` `6095`; cabeçalho vem de `RL.extraStartMinute` | — |

> **8 a 11 e 16:** hoje passam pela Partida ao Vivo nova, que **não tem** placar
> de série de pênaltis nem cabeçalho de prorrogação. Funciona, está incompleto.

## 3 · Entre rodadas

| # | Tela | print | função | classe | `CL.screen` |
|---|---|---|---|---|---|

| 18 | **Classificação de copa** | — | `scCupClassif()` `8540` | `cl-cupres` | `cupclassif` |
| 19 | **Tela da competição** | `23 - Modal - Minhas competicoes.png` | `scCupView()` `10549` | `cl-cup2` | `cupview` |
| 20 | **Fim de temporada** | `46 - Fim de temporada (premiacao).png` | `dlg('Fim da temporada!'…)` `7515` e `7579` | `cl-dlg` | — |
| 21 | **Imprensa** | — | `scImprensa()` `7669` | `cl-press` | `imprensa` |

## 4 · Modo Resenha

| # | Tela | print | função | classe | `CL.screen` |
|---|---|---|---|---|---|

| 23 | **Pausa patrocinada** | — | `PAUSA_GIFS` `470`, `pausaChecklist()` `558`, monta em `showSyncLoading()` `631` | `rf-step`, `rf-stage`, `rf-tv` | *(sobreposição `#c-syncload`)* |
| 24 | **À espera da rodada** | — | `scWaitRound()` `7875` | `cl-wait` | `waitround` |
| 25 | **Passe o aparelho** | — | `scSeatTurn()` `3082` | reusa `cl-main` (é o Hub com outro cabeçalho) | `seatturn` |
| 26 | **Classificação do assento** | — | `scSeatClassif()` `3043` | `cl-cls2` | `seatclassif` |
| 27 | **Entrega do aparelho** | — | `scHandoff()` `3135` | `cl-handoff` | `handoff` |

## 5 · Secundárias

| # | Tela | print | função | classe | `CL.screen` |
|---|---|---|---|---|---|
| 28 | **Ver time de outro clube** | — | `scTeamView()` `3842` | `cl-main` | `teamview` |
| 29 | **Recuperar senha** | — | `scResetPassword()` `1689` | `cl-authform` | `resetpassword` |
| 30 | **Páginas institucionais** | — | `landingPageHTML()` `1536`; conteúdo em `landingSobreHTML()` `1544`, `landingAjudaHTML()` `1552`, `landingContatoHTML()` `1570`, `landingTermosHTML()` `1580`, `landingPrivHTML()` `1589` | `cl-lp-page` | `abertura` + `CL.landingView` |

---

## Prioridade sugerida

Pelo que o jogador esbarra com mais frequência:

1. **Equipa** (1) — está na sidebar, a um clique o tempo todo
2. **Pênaltis** (8–11) — decidem mata-mata, e hoje passam pela tela genérica
3. **Fim de temporada** (20) — é o momento de celebração do save
4. **Pausa patrocinada** (23) — toda virada de rodada na Resenha
5. **Prorrogação** (16) — mesma lacuna dos pênaltis

> **Leva 2 entregue em 2026-08-13:** lobby da Resenha, classificação
> pós-rodada, substituição, lesão e cartão vermelho saíram desta lista e
> estão portadas em `src/ui/rf26-partida.js`.

## Onde ver o desenho de hoje rodando

O atalho de bancada abre o jogo direto, sem passar pelo onboarding:

```bash
npm run dev
```

Depois abra `http://localhost:5199/?rf=hub`. Para as telas de partida, use o
botão **Jogar** — ele passa pelo sorteio e cai na rodada ao vivo.
