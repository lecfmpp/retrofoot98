# Cobertura de telas — o que está feito e o que falta

Atualizado em 2026-08-13, na branch `claude/retrofoot-new-layout-design-c09780`.

## Placar

| | |
|---|---|
| Telas dos pacotes de design, portadas | **55** |
| Telas do jogo sem tela de design, restantes | **24** |

`main` continua com a pele Windows 98. Tudo abaixo vive na branch.

---

## Já feito

### Pacote 1 — 50 telas

| Bloco | Telas | Onde vive |
|---|---|---|
| Hub do Time | Sidebar + Sidebar Recolhida + Mobile | `src/ui/rf26.js` |
| As 7 páginas | Mercado, Elenco & Base, Campeonatos, Finanças, Treinador, Clube & Sistema, E-mail (+ mobile de cada) | `src/ui/rf26.js` |
| Onboarding | 1 a 7, desktop e mobile | `src/ui/rf26-onboarding.js` |
| Sorteios | 2 a 6, desktop e mobile | `src/ui/rf26-sorteio.js` |
| Partida | PartidaAoVivo, Modo Camarote | `src/ui/rf26-live.js` |
| Popups | Popups e Toasts (Dialog + os 5 tons), Convite para Jantar, Jantar e Proposta | `src/ui/rf26.js` + `dlg()` em `main.js` |
| Chat | Chat da Resenha (3 estados) | `src/ui/rf26.js` |
| Landing | Landing - Home | `src/ui/rf26-landing.js` |

> **Sorteio 1 (Brasileirão)** ficou de fora a pedido: aquele formato já vem
> pronto de base no jogo.

### Pacote 2 — 5 telas

| Tela | Substituiu | Onde vive |
|---|---|---|
| Resenha - Lobby da Sala | `renderOnline()` | `src/ui/rf26-partida.js` |
| Pos-Rodada - Classificacao | `scClassif()` | `src/ui/rf26-partida.js` |
| Modal - Substituicao | `subPanelHTML()` | `src/ui/rf26-partida.js` |
| Modal - Lesao | `injurySubHTML()` | `src/ui/rf26-partida.js` |
| Modal - Cartao Vermelho | `redCardHTML()` | `src/ui/rf26-partida.js` |

Trouxe dois envelopes que viraram peça de sistema:

- **`rfOverlay()`** — o que acontece *durante* a partida: gramado escurecido,
  janela branca de raio 24, cabeçalho azul com filete amarelo, rodapé claro.
- **`rfStage()`** — o que acontece *entre* as partidas: faixa do clube no topo,
  mesa verde-clara e cards brancos.

### Decisões de produto tomadas no caminho

- **Equipa saiu da sidebar** (2026-08-13, decisão do usuário): elenco e formação
  já cobrem o time. O estádio já morava em Finanças; o **historial do clube** era
  o único dado sem outra casa e foi para **Campeonatos ▸ Historial do clube**.
  A sidebar ficou com **8 destinos**.
- **Modo Resenha marcado EM BREVE** no onboarding, conforme o pacote.
- **O desenho antigo não é mais alcançável**: saíram todos os fallbacks do tipo
  "se a função nova existir, senão desenha a velha".

---

## O que falta — 24 telas

Estas existem no jogo e ainda desenham com o shell antigo.

### Como usar

| Coluna | Para que serve |
|---|---|
| **print** | Arquivo em `screenshots-atual/` — o desenho de hoje |
| **função** | Quem monta o HTML, em `public/src/ui/main.js` salvo indicação |
| **classe** | Prefixo CSS em `public/src/styles/main.css` |
| **`CL.screen`** | A chave da tela. O roteador é o `switch` do `cdraw()` em `main.js:672` |

> **Atenção ao prefixo `rf-`:** a Pausa Patrocinada já usa `rf-` no CSS antigo —
> veio de um handoff anterior. Não confundir com o `rf-` do rebranding 2026,
> que mora em `public/src/styles/rf26.css`.

### 1 · Fluxo principal

| # | Tela | print | função | classe | `CL.screen` |
|---|---|---|---|---|---|
| 1 | **Escolha de moeda** | `06 - Escolha de moeda.png` | `scMoeda()` `2165` | `cl-bigsel` | `moeda` |
| 2 | **País jogável** | — | `scPaisJogavel()` `2139` | `cl-ctry` | `paisJogavel` |
| 3 | **Carregando** | — | `scLoading()` `2185` | `cl-prog` | `loading` |
| 4 | **Número de treinadores** | `07 - Numero de jogadores.png` | `scJogadores()` `2212` | `cl-prow` | `jogadores` |
| 5 | **Escolha dos clubes** | `08 - Escolha os clubes (sorteio).png` | `scEscolhaClubes()` `2782` | `cl-navysel`, `cl-pick` | `escolhaclubes` |
| 6 | **Continuar um save** | `03` e `04 - Solo - ...png` | `scModoSolo()` `1882` | `cl-mc` | `modosolo` |

> Moeda e Carregando encaixam nos marcos *Configurar* e *Sorteio* da trilha de
> 5 passos que o onboarding já tem — não mudam a contagem.

### 2 · Partida

Sobreposições sobre `live`. Nenhuma tem `CL.screen` próprio.

| # | Tela | print | função | classe |
|---|---|---|---|---|
| 7 | **Pênalti — escolher batedor** | `37 - Partida - Penalti (escolher batedor).png` | `penaltyPickerHTML()` `7306` | `cl-pen` |
| 8 | **Pênalti — suspense** | `38 - Partida - Penalti (suspense).png` | `penaltySuspenseHTML()` `7359` | `cl-pen` |
| 9 | **Pênalti — resultado** | `39 - Partida - Penalti (gol).png` | `penaltyResultHTML()` `7367` | `cl-pen` |
| 10 | **Disputa de pênaltis** | `45 - Partida - Disputa de penaltis.png` | `shootoutScoreboardHTML()` `7221` | `cl-pens` |
| 11 | **Prorrogação** | — | `startExtraTime()` `6150`; cabeçalho de `RL.extraStartMinute` | — |
| 12 | **Detalhe de um jogo** | `34`–`36 - Partida ao vivo...png` | `liveModalHTML()` `7248` | `cl-lm` |

> **7 a 11** passam hoje pela Partida ao Vivo nova, que não tem placar de série
> de pênaltis nem cabeçalho de prorrogação. Funciona, está incompleto.
> Os envelopes `rfOverlay()` já existem — estas telas encaixam neles.

### 3 · Entre rodadas

| # | Tela | print | função | classe | `CL.screen` |
|---|---|---|---|---|---|
| 13 | **Classificação de copa** | — | `scCupClassif()` `8556` | `cl-cupres` | `cupclassif` |
| 14 | **Tela da competição** | `23 - Modal - Minhas competicoes.png` | `scCupView()` `10565` | `cl-cup2` | `cupview` |
| 15 | **Fim de temporada** | `46 - Fim de temporada (premiacao).png` | `dlg('Fim da temporada!'…)` `7531` e `7595` | `cl-dlg` | — |
| 16 | **Imprensa** | — | `scImprensa()` `7685` | `cl-press` | `imprensa` |

### 4 · Modo Resenha

| # | Tela | print | função | classe | `CL.screen` |
|---|---|---|---|---|---|
| 17 | **Pausa patrocinada** | — | `PAUSA_GIFS` `470`, `pausaChecklist()` `558`, monta em `showSyncLoading()` `631` | `rf-step`, `rf-stage`, `rf-tv` | *(sobreposição `#c-syncload`)* |
| 18 | **À espera da rodada** | — | `scWaitRound()` `7891` | `cl-wait` | `waitround` |
| 19 | **Passe o aparelho** | — | `scSeatTurn()` `3082` | reusa `cl-main` (é o Hub com outro cabeçalho) | `seatturn` |
| 20 | **Classificação do assento** | — | `scSeatClassif()` `3043` | `cl-cls2` | `seatclassif` |
| 21 | **Entrega do aparelho** | — | `scHandoff()` `3135` | `cl-handoff` | `handoff` |

### 5 · Secundárias

| # | Tela | print | função | classe | `CL.screen` |
|---|---|---|---|---|---|
| 22 | **Ver time de outro clube** | — | `scTeamView()` `3842` | `cl-main` | `teamview` |
| 23 | **Recuperar senha** | — | `scResetPassword()` `1689` | `cl-authform` | `resetpassword` |
| 24 | **Páginas institucionais** | — | `landingPageHTML()` `1536`; conteúdo em `landingSobreHTML()` `1544`, `landingAjudaHTML()` `1552`, `landingContatoHTML()` `1570`, `landingTermosHTML()` `1580`, `landingPrivHTML()` `1589` | `cl-lp-page` | `abertura` + `CL.landingView` |

---

## Prioridade sugerida

1. **Pênaltis** (7–10) e **prorrogação** (11) — decidem mata-mata e hoje caem na
   tela genérica. Os envelopes já existem, então é a leva mais barata de fazer.
2. **Fim de temporada** (15) — é o momento de celebração do save.
3. **Pausa patrocinada** (17) — toda virada de rodada na Resenha.
4. **Continuar um save** (6) — a primeira coisa que o jogador que volta encontra.
5. **Tela da competição** (14) — ver grupos e chave fora do sorteio.

O resto pode vir depois sem prejudicar a experiência principal.

## Onde ver o desenho de hoje rodando

```bash
npm run dev
```

Depois `http://localhost:5199/?rf=hub`. Para as telas de partida, use **Jogar** —
passa pelo sorteio e cai na rodada ao vivo.
