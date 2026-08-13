# Telas a desenhar — 24 restantes

Atualizado em 2026-08-13. Estas telas existem no jogo e ainda usam o desenho
antigo. As dos pacotes 1 e 2 já estão implementadas e saíram desta lista.

## Como ler

| Coluna | O que é |
|---|---|
| **print** | Arquivo em `screenshots-atual/` — o desenho de hoje, para referência |
| **função** | Quem monta o HTML, em `public/src/ui/main.js` salvo indicação |
| **classe** | Prefixo CSS em `public/src/styles/main.css` |
| **`CL.screen`** | Chave da tela no `switch` do `cdraw()`, `main.js:672` |

**Envelopes já prontos, reaproveitáveis:**

- `rfOverlay()` — sobreposição durante a partida (gramado escurecido, janela
  branca de raio 24, cabeçalho azul com filete amarelo, rodapé claro)
- `rfStage()` — página cheia entre partidas (faixa do clube, mesa verde-clara)
- `rfWiz()` — passo de onboarding (marca, trilha de 5 passos, card, barra de ação)
- `dlg()` — popup padrão (cabeçalho na cor do clube, corpo branco, rodapé)

As telas marcadas **↪** encaixam num envelope existente — só precisam do miolo.

> **Atenção:** a Pausa Patrocinada usa prefixo `rf-` no CSS **antigo** (veio de
> um handoff anterior). Não confundir com o `rf-` do rebranding, que mora em
> `public/src/styles/rf26.css`.

---

## 1 · Partida — prioridade alta

Sobreposições sobre `live`. Nenhuma tem `CL.screen` próprio. **↪ `rfOverlay()`**

| # | Tela | print | função | classe |
|---|---|---|---|---|
| 1 | **Pênalti — escolher batedor** | `37 - Partida - Penalti (escolher batedor).png` | `penaltyPickerHTML()` `7306` | `cl-pen` |
| 2 | **Pênalti — suspense** | `38 - Partida - Penalti (suspense).png` | `penaltySuspenseHTML()` `7359` | `cl-pen` |
| 3 | **Pênalti — resultado** | `39 - Partida - Penalti (gol).png` | `penaltyResultHTML()` `7367` | `cl-pen` |
| 4 | **Disputa de pênaltis** | `45 - Partida - Disputa de penaltis.png` | `shootoutScoreboardHTML()` `7221` | `cl-pens` |
| 5 | **Prorrogação** | — | `startExtraTime()` `6150`; cabeçalho de `RL.extraStartMinute` | — |
| 6 | **Detalhe de um jogo** | `34`–`36 - Partida ao vivo...png` | `liveModalHTML()` `7248` | `cl-lm` |

As 1 a 5 decidem mata-mata e hoje caem na tela genérica de Partida ao Vivo, que
não tem placar de série nem cabeçalho de prorrogação.

## 2 · Entre rodadas

| # | Tela | print | função | classe | `CL.screen` |
|---|---|---|---|---|---|
| 7 | **Fim de temporada** ↪ `dlg()` | `46 - Fim de temporada (premiacao).png` | `dlg('Fim da temporada!'…)` `7531` e `7595` | `cl-dlg` | — |
| 8 | **Tela da competição** ↪ `rfStage()` | `23 - Modal - Minhas competicoes.png` | `scCupView()` `10565` | `cl-cup2` | `cupview` |
| 9 | **Classificação de copa** ↪ `rfStage()` | — | `scCupClassif()` `8556` | `cl-cupres` | `cupclassif` |
| 10 | **Imprensa** | — | `scImprensa()` `7685` | `cl-press` | `imprensa` |

## 3 · Modo Resenha

| # | Tela | print | função | classe | `CL.screen` |
|---|---|---|---|---|---|
| 11 | **Pausa patrocinada** | — | `PAUSA_GIFS` `470`, `pausaChecklist()` `558`, monta em `showSyncLoading()` `631` | `rf-step`, `rf-stage`, `rf-tv` | *(sobreposição `#c-syncload`)* |
| 12 | **À espera da rodada** ↪ `rfStage()` | — | `scWaitRound()` `7891` | `cl-wait` | `waitround` |
| 13 | **Passe o aparelho** | — | `scSeatTurn()` `3082` | reusa `cl-main` (é o Hub com outro cabeçalho) | `seatturn` |
| 14 | **Classificação do assento** ↪ `rfStage()` | — | `scSeatClassif()` `3043` | `cl-cls2` | `seatclassif` |
| 15 | **Entrega do aparelho** ↪ `rfStage()` | — | `scHandoff()` `3135` | `cl-handoff` | `handoff` |

## 4 · Onboarding e entrada

| # | Tela | print | função | classe | `CL.screen` |
|---|---|---|---|---|---|
| 16 | **Continuar um save** ↪ `rfWiz()` | `03` e `04 - Solo - ...png` | `scModoSolo()` `1882` | `cl-mc` | `modosolo` |
| 17 | **Escolha de moeda** ↪ `rfWiz()` | `06 - Escolha de moeda.png` | `scMoeda()` `2165` | `cl-bigsel` | `moeda` |
| 18 | **Carregando** ↪ `rfWiz()` | — | `scLoading()` `2185` | `cl-prog` | `loading` |
| 19 | **País jogável** ↪ `rfWiz()` | — | `scPaisJogavel()` `2139` | `cl-ctry` | `paisJogavel` |
| 20 | **Número de treinadores** ↪ `rfWiz()` | `07 - Numero de jogadores.png` | `scJogadores()` `2212` | `cl-prow` | `jogadores` |
| 21 | **Escolha dos clubes** ↪ `rfWiz()` | `08 - Escolha os clubes (sorteio).png` | `scEscolhaClubes()` `2782` | `cl-navysel`, `cl-pick` | `escolhaclubes` |
| 22 | **Recuperar senha** ↪ `rfWiz()` | — | `scResetPassword()` `1689` | `cl-authform` | `resetpassword` |

As 17 a 21 encaixam nos marcos *Configurar* e *Sorteio* da trilha de 5 passos
que o onboarding já tem — não mudam a contagem de passos.

## 5 · Secundárias

| # | Tela | print | função | classe | `CL.screen` |
|---|---|---|---|---|---|
| 23 | **Ver time de outro clube** | — | `scTeamView()` `3842` | `cl-main` | `teamview` |
| 24 | **Páginas institucionais** | — | `landingPageHTML()` `1536`; conteúdo em `landingSobreHTML()` `1544`, `landingAjudaHTML()` `1552`, `landingContatoHTML()` `1570`, `landingTermosHTML()` `1580`, `landingPrivHTML()` `1589` | `cl-lp-page` | `abertura` + `CL.landingView` |

---

## Ordem sugerida

1. **Pênaltis e prorrogação** (1–5) — decidem mata-mata; o envelope já existe
2. **Fim de temporada** (7) — o momento de celebração do save
3. **Pausa patrocinada** (11) — toda virada de rodada na Resenha
4. **Continuar um save** (16) — primeira coisa que o jogador que volta encontra
5. **Tela da competição** (8) — ver grupos e chave fora do sorteio

## Ver o desenho de hoje rodando

```bash
npm run dev
```

Depois `http://localhost:5199/?rf=hub`. Para as telas de partida, use **Jogar** —
passa pelo sorteio e cai na rodada ao vivo.
