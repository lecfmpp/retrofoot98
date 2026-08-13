# Telas que o jogo tem e o pacote de design não cobre

Estado em 2026-08-13, na branch `claude/retrofoot-new-layout-design-c09780`.

As 50 telas do zip estão portadas. Estas aqui são telas que **existem no jogo**
e ficaram sem equivalente no pacote — hoje elas desenham com o shell antigo
(`titleBarTop` + `deskWrap` + `wizShell`), que é justamente o que o rebranding
tira. Quando a tela nova chegar, o ponto de troca é o `case` do `cdraw()`.

## Como ler as referências

- **`CL.screen`** — a chave da tela. O roteador é o `switch` dentro de
  `cdraw()`, em `public/src/ui/main.js:672`. Trocar uma tela é trocar o `case` dela.
- **função** — quem monta o HTML hoje.
- **chegada** — o que leva o jogador até ali.

---

## 1 · Bloqueiam o fluxo principal

| # | Tela | `CL.screen` | Função (arquivo:linha) | Chegada |
|---|---|---|---|---|
| 1 | **Equipa** | *(não é tela; é destino da sidebar)* | `rfEquipaHTML()` — `src/ui/rf26.js:1606`; destino em `RF_PAGES`, `rf26.js:76` | Sidebar ▸ Equipa. **Único destino da sidebar da referência sem tela própria** — montei com identidade do clube + estádio + historial |
| 2 | **Escolha de moeda** | `moeda` | `scMoeda()` — `main.js:2165` | Onboarding solo, depois de País e Ligas |
| 3 | **País jogável** | `paisJogavel` | `scPaisJogavel()` — `main.js:2139` | Só quando mais de um país jogável é escolhido |
| 4 | **Carregando** | `loading` | `scLoading()` — `main.js:2185` | Entre a configuração e o sorteio do clube |
| 5 | **Sorteio dos treinadores** | `jogadores` | `scJogadores()` — `main.js:2212` | Antes do sorteio de clubes (define quem é quem) |
| 6 | **Escolha de clubes** | `escolhaclubes` | `scEscolhaClubes()` — `main.js:2782` | Variante do sorteio quando a sala escolhe em vez de sortear |

> **Nota sobre a 2 e a 4:** o pacote traz o onboarding em 5 marcos (Entrar ·
> Modo · Configurar · Sorteio · Jogar). Moeda e Carregando caem dentro de
> *Configurar* e *Sorteio* — se você desenhá-las, elas encaixam na trilha
> existente sem mudar a contagem de passos.

## 2 · Partida — bordas que hoje caem na tela genérica

| # | Tela | Onde | Função (arquivo:linha) | Chegada |
|---|---|---|---|---|
| 7 | **Disputa de pênaltis** | dentro de `live` | `shootoutScoreboardHTML()` — `main.js:7213`; ligado por `startPenaltyShootout()` em `main.js:6096` | Mata-mata empatado após a prorrogação |
| 8 | **Prorrogação** | dentro de `live` | `startExtraTime()` — `main.js:6095`; o cabeçalho sai de `RL.extraStartMinute` | Mata-mata empatado no tempo normal |
| 9 | **Partida avulsa de copa** | dentro de `live` | `scLive()` com `RL.cup` — `main.js:6716` | Jogo de copa fora da rodada de liga |
| 10 | **Classificação de fim de rodada** | `classif` | `scClassif()` — `main.js:7432` | Depois de cada rodada de liga |
| 11 | **Classificação de copa** | `cupclassif` | `scCupClassif()` — `main.js:8540` | Depois de cada rodada de copa |
| 12 | **Tela da competição** | `cupview` | `scCupView()` — `main.js:10549` | Campeonatos ▸ ver grupos/chave fora do sorteio |

> **Nota:** 7, 8 e 9 são as três exceções que eu removi do `scLive()`. Hoje elas
> passam pela tela nova de Partida ao Vivo, que **não tem** o placar de série
> de pênaltis nem o cabeçalho de troféu — funciona, mas está incompleto.

## 3 · Modo Resenha

| # | Tela | `CL.screen` | Função (arquivo:linha) | Chegada |
|---|---|---|---|---|
| 13 | **Lobby da sala** | `online` | `renderOnline()` — `src/net/local-transport.js:569` | Criar ou entrar numa sala. **É a tela mais antiga que sobrou** — 8 caminhos levam até ela |
| 14 | **Pausa patrocinada** | *(sobreposição)* | `PAUSA_GIFS`/`pausaChecklist()` — `main.js:470` e `main.js:558` | Intervalo entre o fim da rodada e a classificação |
| 15 | **Passe o aparelho** (hotseat) | `seatturn` | `scSeatTurn()` — `main.js:3082` | Modo hotseat, ao trocar de treinador |
| 16 | **Classificação do assento** | `seatclassif` | `scSeatClassif()` — `main.js:3043` | Fim da rodada no hotseat |
| 17 | **Entrega do aparelho** | `handoff` | `scHandoff()` — `main.js:3135` | Transição entre assentos |
| 18 | **À espera da rodada** | `waitround` | `scWaitRound()` — `main.js:7875` | Esperando os outros treinadores |

## 4 · Secundárias

| # | Tela | `CL.screen` | Função (arquivo:linha) | Chegada |
|---|---|---|---|---|
| 19 | **Ver time de outro clube** | `teamview` | `scTeamView()` — `main.js:3842` | Clicar no nome de um clube em qualquer lista |
| 20 | **Imprensa** | `imprensa` | `scImprensa()` — `main.js:7669` | Eventos de imprensa entre rodadas |
| 21 | **Recuperar senha** | `resetpassword` | `scResetPassword()` — `main.js:1689` | Link de e-mail de recuperação |
| 22 | **Continuar um save** | `modosolo` | `scModoSolo()` — `main.js:1882` | Onboarding ▸ Entrar ▸ continuar save. A tela 1 do pacote mostra o acordeão de saves, mas a lista em si é esta |
| 23 | **Páginas institucionais** | `abertura` + `CL.landingView` | `landingPageHTML()` — `main.js:1536`; conteúdo em `landingSobreHTML()` (1544), `landingAjudaHTML()` (1552), `landingContatoHTML()` (1570), `landingTermosHTML()` (1580), `landingPrivHTML()` (1589) | Rodapé da landing |

---

## Sugestão de prioridade

Pelo que o jogador esbarra com mais frequência:

1. **Lobby da Resenha** (13) — a mais antiga que sobrou, e é a porta do modo
   multiplayer inteiro
2. **Equipa** (1) — está na sidebar, então é um clique de distância o tempo todo
3. **Classificação de fim de rodada** (10) — aparece depois de *toda* rodada
4. **Pênaltis** (7) e **prorrogação** (8) — decidem mata-mata
5. **Pausa patrocinada** (14) — aparece toda virada de rodada na Resenha

O resto pode vir depois sem prejudicar a experiência principal.
