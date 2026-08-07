# A dinâmica da Resenha: quem decide o quê

**Para que serve este documento:** listar TODAS as peças que decidem *qual tela cada jogador vê* e
*quando a rodada avança* no modo Resenha (multijogador), explicadas em português simples, em ordem
de importância, e dizer com franqueza quais são indispensáveis e quais podem ser removidas.

---

## 1. O diagnóstico, antes da lista

O jogo não está errado por causa de um defeito. Está errado porque hoje existem **oito caminhos
diferentes capazes de fazer a rodada avançar** e **seis definições diferentes de "eu já cumpri a
minha parte"**. Cada um deles foi criado para resolver um travamento real, e cada um funciona
sozinho — mas eles não concordam entre si.

Enquanto isso for verdade, todo conserto pontual vai continuar produzindo o defeito seguinte, que é
exatamente o que aconteceu nos últimos dias:

> Corrigi o carimbo do dia → o cão de guarda passou a fechar a rodada antes do carimbo.
> Corrigi o cão de guarda → o ponteiro ficou preso num momento que ninguém podia mais carimbar.
> Corrigi o carimbo atrasado → a fila de cerimônias apareceu para um e não para o outro.

**Os oito caminhos que hoje avançam o jogo:**

| # | Quem avança | Como decide |
|---|---|---|
| 1 | Anfitrião dá a largada (`onlineHostRelease`) | "todos prontos e ninguém ocupado" |
| 2 | Cronômetro da sala vence (`arm_ready_timer` + prazo) | relógio |
| 3 | Anfitrião fecha a rodada (`onlineHostCloseRound`) | hoje: o ponteiro; antes: palpite local |
| 4 | **Cão de guarda** (`onlineOrphanCloseCheck`) | relógio de 6s a 100s, em **qualquer** cliente |
| 5 | Servidor vira o dia (`day_ack`) | carimbo de todos os assentos |
| 6 | Rede de segurança do ponteiro (`day_sync`) | relógio de 45s |
| 7 | Virada de temporada (`onlineCompleteSeasonTurnover`) | calendário acabou |
| 8 | Fechamento local (`_commitLeagueRound`) | quando não há servidor (solo / degradação) |

**As seis definições de "já cumpri":** `CL._playedRound`, `CL._stageDone`, `cupWasSeen`,
`game_seats.last_result_round`, `game_seats.day_ack` e `is_ready`. Elas são atualizadas em momentos
diferentes, e três delas são só do navegador do jogador — ou seja, os dois humanos podem responder
"sim" e "não" à mesma pergunta ao mesmo tempo, os dois com razão.

**A recomendação deste documento em uma frase:** manter **um** caminho de avanço (o nº 5, o
carimbo no servidor), **uma** definição de "cumpri" (o carimbo) e **um** escape (o botão do
anfitrião) — e apagar o resto.

---

## 2. Nível 1 — O coração. Sem isto não existe "mesma tela para todos"

Estas peças são a espinha do modelo novo. São poucas de propósito.

### `games.day_plan` — o calendário da sala
A temporada inteira vira uma lista de 65 "dias", em ordem de data, cada um dizendo **qual
competição entra em campo naquele dia** (Libertadores dia 8, Sul-Americana dia 11, Brasileirão dia
14...). É escrito uma vez, quando a sala começa, e nunca mais muda.
**CRUCIAL.** É o roteiro. Sem ele cada jogador deduz o que jogar a partir do próprio estado — que
foi a origem de "um jogou a Copa do Brasil e o outro a Sul-Americana".

### `games.day_idx` + `games.day_moment` — o ponteiro
Duas colunas dizendo em que dia da lista a sala está e em que momento do dia: `escalando` (todos
chegando), `jogando` (a partida) ou `classificacao` (a tabela depois).
**CRUCIAL.** É a única resposta para "que tela todo mundo deveria estar vendo agora".

### `game_seats.day_ack` — o carimbo de cada jogador
Uma marca por assento: "eu cumpri o dia 8, momento *jogando*".
**CRUCIAL.** É o que substitui o palpite "acho que todo mundo terminou".

### `day_ack()` (banco) — o único que faz o jogo andar
Recebe o carimbo de um jogador. Se ainda falta alguém, **não faz nada**. Quando o último carimba,
avança o momento; e ao acabar os três momentos, vira o dia e escreve a jornada nova.
**CRUCIAL.** Este é o coração: nenhum navegador pode avançar o jogo, só o servidor, e só com todos
os carimbos na mesa.

### `day_status()` (banco) — por quem estamos esperando
Devolve quem ainda não carimbou, com nome.
**CRUCIAL** — é o que alimenta o "esperando por X". Sem isto a espera é invisível e parece travamento.

### `roomDay()` (cliente) — qual é o dia, na minha tela
Lê o ponteiro. Se ele fala da mesma jornada que eu, devolve o dia. Se discorda, devolve *segure* — e
eu não decido nada por conta própria.
**CRUCIAL.** É a porta que impede o cliente de voltar a adivinhar.

### `roomDayTick()` + `roomDayFact()` (cliente) — quando eu carimbo
Uma vez por volta do relógio, pergunta: "eu já cumpri o momento em que a sala está?" (cheguei na
tela do clube / joguei a partida de hoje / vi a classificação e voltei). Se sim, carimba.
**CRUCIAL.** É a ponte entre o que o jogador fez e o que o servidor sabe.

### `roomDayRefresh()` (cliente) — reler o ponteiro
Relê o ponteiro do servidor a cada 2 segundos, em vez de esperar um aviso que pode se perder.
**CRUCIAL.** Sem isto o servidor está certo e cada jogador decide com uma cópia velha — foi assim
que um foi assistir à Libertadores enquanto o outro esperava a jornada.

### `onlineWaitingTick()` + "Começar sem eles"
Depois de 12 segundos parados, quem já fez a sua parte vê o nome de quem falta e o anfitrião pode
liberar a sala.
**CRUCIAL.** É o único escape que a gente quer manter: com nome, com dono e com decisão humana.

---

## 3. Nível 2 — Quem executa a rodada depois que o servidor mandou

O ponteiro diz *quando*; estas peças fazem *o quê*.

### `onlineHostRelease()` / `onlineHostTick()` — a largada
O anfitrião abre a partida para todos ao mesmo tempo (`start_running` no banco, que também congela
as escalações de todos no mesmo instante).
**CRUCIAL, mas hoje decide errado:** ele libera com "todos prontos e ninguém ocupado", que é
palpite local. Deveria liberar quando o **momento do ponteiro vira `jogando`** — ou seja, quando o
servidor disser que todos chegaram. Ver "corte proposto" no fim.

### `onlineHostCloseRound()` — o fechamento
Quando o dia de liga chega ao momento `classificacao` (todos jogaram), o anfitrião pede ao servidor
para resolver a rodada.
**CRUCIAL.**

### `resolve-round` (servidor) — quem calcula o mundo
Roda a rodada inteira: os jogos das outras divisões, as copas, as finanças, a virada de temporada.
É o único que escreve o mundo.
**CRUCIAL.**

### `onlineAdoptServerRound()` / `onlineReconcileIfBehind()` — todo mundo copia o mesmo mundo
Depois que o servidor resolve, cada cliente baixa o estado e o adota. É isto que garante que a
tabela do Brasileirão é igual para os dois.
**CRUCIAL.**

### `startLiveRound()` / `startCupRound()` / `buildLiveMatchObject()` — a partida na tela
Colocam a partida em campo — jogando ou assistindo. Quem não disputa a competição do dia assiste à
mesma partida, e não uma simulação sua.
**CRUCIAL.**

### `finishLiveRound()` / `finishCupLiveMatch()` / `publishResult` — publicar o resultado
Ao apitar, o cliente publica o placar no assento dele para que o servidor use o resultado real.
**CRUCIAL.**

### `clJogar()` — o botão Jogar
Decide o que acontece quando o jogador clica. Desde ontem ele obedece ao dia; antes disso ele pegava
a primeira partida da lista do próprio jogador — a causa direta de "cada um numa competição".
**CRUCIAL** (com a obediência ao dia).

---

## 4. Nível 3 — As telas do fluxo (importantes para a experiência, não para a sincronia)

- **`showCupIntro()` / `showLeagueIntro()`** — o aviso "agora é a Libertadores" antes de entrar em
  campo. *Mantém.* É o que evita a partida começar sozinha sem o jogador entender.
- **`showLiveClassif()` / `showCupClassif()` / `queueRoundCupClassifs()`** — as tabelas depois da
  rodada, na ordem do calendário da sala. *Mantém.*
- **`startSeasonOpeningDraws()` / `startCupDrawReplay()` / `checkPendingCupDraws()`** — as
  cerimônias de sorteio. *Mantém*, mas é a parte mais frágil do código (ver nº 6).
- **`startPostRoundClassifs()` / `clClassifContinue()`** — a rotação de classificações por assento.
  *Mantém.*
- **`adGate()` / a pausa patrocinada** — segura a tela por alguns segundos entre a rodada e a
  classificação. **PODE SAIR sem prejuízo à dinâmica** (é comercial, não sincronia). Enquanto
  existir, ela conta como "ocupado" e atrasa o carimbo de todo mundo.
- **`momentoSeguinte()` / momentos de fim de temporada / sala de imprensa** — cerimônias entre
  temporadas. *Mantém*, não interferem na rodada.

---

## 5. Nível 4 — Redes de segurança: aqui está o problema

Cada uma nasceu de um travamento real. Juntas, elas são a razão de o jogo continuar fora de ordem,
porque **todas podem decidir sozinhas**.

### `onlineOrphanCloseCheck()` — o "cão de guarda"
Qualquer cliente fecha a rodada se ela ficar aberta por um tempo (**6 segundos** quando ninguém está
marcado como ocupado).
**É O PIOR OFENSOR.** No seu último teste ele fechou praticamente todas as rodadas — algumas com o
outro humano ainda em campo — e foi assim que a jornada 3 desapareceu entre a 2 e a 4.
**Veredito: manter só como socorro para "o anfitrião caiu", nunca como decisor.** Já foi amarrado ao
ponteiro; o certo é ir além e exigir que o anfitrião esteja mesmo ausente (sem sinal de vida por
~45s). Se ainda assim aparecer no log, é bug.

### `day_sync()` — a rede de segurança do ponteiro
Empurra o ponteiro para a frente quando ele fica para trás por 45 segundos.
**PODE SAIR depois que os carimbos estiverem confiáveis.** Ele empurra usando o número local da
jornada — exatamente a fonte de verdade que estamos aposentando. No seu último log, era ele quem
movia o ponteiro em **todas** as jornadas: o carimbo nunca funcionou, e ele mascarou isso.

### `advance_phase_if_expired` (banco) + `arm_ready_timer` — o cronômetro de 60s
O relógio que começa a rodada mesmo sem todos prontos.
**PODE SAIR**, e deve — assim que o "Começar sem eles" estiver validado. Um relógio que atropela o
jogador é a definição de "cada um numa tela". *Nunca remover antes do botão*, senão a sala trava sem
saída.

### `onlineCupDayPending()` + `cupDayWaitExpired()` (teto de 90s)
Barreira antiga: "não libere a liga enquanto alguém dever a copa da semana".
**PODE SAIR.** É exatamente o que o ponteiro faz agora, e melhor — dia a dia, competição a
competição. Hoje ela só acrescenta uma espera concorrente e um teto que solta sozinho.

### `onlineCupObligationPending()` (teto de 60s)
Marca o jogador como ocupado enquanto ele deve uma partida de copa.
**PODE SAIR** pelo mesmo motivo. Já causou dois travamentos ("a pendência que só se resolve depois
do avanço bloqueava o avanço").

### `CUP_STAGE_MAX_MS` (240s) e o estágio "quarta-feira"
Um segundo conceito de tempo — "quarta de copa" e "sábado de liga" — que vive **dentro do estado do
jogo**, atrasado em relação ao ponteiro.
**PODE E DEVE SAIR.** O dia do ponteiro já é isto, com mais precisão. Esse campo atrasado foi a
causa direta da jornada 2 fechar sem ninguém jogar.

### `BUSY_MAX_MS` / "destravando NO LUGAR"
Depois de 10 segundos "ocupado", o cliente tenta se desentalar sozinho.
**PODE SAIR** quando o carimbo for a única barreira: não haverá mais um "ocupado" para destravar.

### `ROUND_LAG_MAX` — puxar à força quem ficou 3 rodadas atrás
Último recurso para um save já quebrado.
**MANTÉM.** É barato e só age no que já está perdido.

---

## 6. Nível 5 — As peças que existem só porque as outras falham

- **`onlineBusyReason()` / `busy_until` / `CLOSING_SCREENS`** — todo o conceito de "ocupado". Ele
  existe para o servidor não avançar por cima de alguém. **Com o carimbo, ele perde a função:**
  ninguém avança sem carimbo, então não é preciso adivinhar quem está ocupado. *Pode sair por
  último, depois que o resto estiver de pé.*
- **`onlineStageKey()` / `onlineStageDone()` / `CL._stageDone`** — a memória local de "já cumpri
  esta etapa". **Deve ser substituída pelo carimbo do dia** (é a mesma informação, guardada em dois
  lugares que discordam). Hoje já usa o dia como chave, o que é meio caminho.
- **`cupWasSeen()` / `cupMarkSeen()`** — memória local de "já vi esta copa nesta jornada". Mesma
  observação: é o carimbo do dia, em outro caderno.
- **`CL._playedRound`** — mais uma memória local da mesma coisa. **Pode sair.**
- **`onlineRecoverRunRound()` / `onlineOpenQueuedDraw()` / `onlineForceExpiredDecision()`** —
  remendos que empurram um cliente preso. *Mantém enquanto houver telas que travam;* o segundo e o
  terceiro consertam defeitos reais e recentes.
- **`S._pendingDrawShows` / `S._cupDrawQueued`** — a fila de cerimônias mora no **mundo
  compartilhado**, mas quem a consome é a tela de cada jogador. Essa mistura é a origem de "o
  sorteio apareceu para um e não para o outro". **Deveria virar um dia do ponteiro** (um dia de
  cerimônia, como já existe dia de copa), e aí a fila local desaparece.

---

## 7. O corte que eu recomendo, em ordem

Cada passo deixa o jogo funcionando; nenhum depende de um teste manual gigante.

1. **A largada passa a ser o ponteiro.** `onlineHostRelease` libera quando o momento vira `jogando`
   (todos chegaram), não com "prontos e não ocupados". *Some o cronômetro de 60s.*
2. **O cão de guarda só age com o anfitrião ausente de verdade** (sem sinal de vida por 45s).
3. **Apaga as barreiras de copa antigas** (`onlineCupDayPending`, `onlineCupObligationPending`,
   `cupDayWaitExpired`) — o dia já faz isso.
4. **Apaga o estágio "quarta/sábado"** (`S.roundStage`, `CUP_STAGE_MAX_MS`): o dia é a unidade.
5. **Uma memória só de "cumpri"**: o carimbo. Saem `_playedRound`, `_stageDone`, `cupWasSeen`.
6. **Some o "ocupado"** inteiro (`busy_until`, `CLOSING_SCREENS`, `onlineBusyReason`).
7. **A cerimônia de sorteio vira um dia do ponteiro** — e a fila compartilhada desaparece.
8. **Por último, apaga o `day_sync`**: se os carimbos são confiáveis, ele nunca deveria disparar.

No fim disso sobra uma linha de decisão só:

> o jogador cumpre → carimba → o servidor conta os carimbos → o servidor vira o dia → todos veem a
> mesma tela. E, se alguém não carimba, **o anfitrião decide** — não um cronômetro.

---

## 8. Tabela-resumo

| Peça | O que faz | Veredito |
|---|---|---|
| `day_plan` / `day_idx` / `day_moment` | o roteiro e o ponteiro | **crucial** |
| `day_ack()` + `game_seats.day_ack` | o único caminho de avanço | **crucial** |
| `day_status()` + "esperando por X" | espera com nome e dono | **crucial** |
| `roomDay` / `roomDayTick` / `roomDayFact` | ler o dia e carimbar | **crucial** |
| `roomDayRefresh` | reler o ponteiro a cada 2s | **crucial** |
| `onlineHostRelease` / `start_running` | a largada simultânea | **crucial** (mudar o critério) |
| `onlineHostCloseRound` + `resolve-round` | fechar e calcular o mundo | **crucial** |
| `onlineAdoptServerRound` / `onlineReconcileIfBehind` | todos com o mesmo mundo | **crucial** |
| `startLiveRound` / `startCupRound` / `buildLiveMatchObject` | a partida na tela | **crucial** |
| `clJogar` | o botão, obedecendo ao dia | **crucial** |
| telas de intro e classificação | experiência | mantém |
| `onlineOrphanCloseCheck` | cão de guarda | **restringir a "anfitrião caiu"** |
| `arm_ready_timer` / `advance_phase_if_expired` | cronômetro de 60s | **remover** (depois do botão) |
| `onlineCupDayPending` / `cupDayWaitExpired` | barreira de copa | **remover** |
| `onlineCupObligationPending` | dívida de copa como "ocupado" | **remover** |
| `S.roundStage` / `CUP_STAGE_MAX_MS` | estágio quarta/sábado | **remover** |
| `_playedRound` / `_stageDone` / `cupWasSeen` | três memórias de "cumpri" | **remover** |
| `busy_until` / `CLOSING_SCREENS` / `onlineBusyReason` | o "ocupado" | **remover por último** |
| `day_sync` | rede de segurança do ponteiro | **remover no fim** |
| `adGate` / pausa patrocinada | comercial | pode sair |
| `ROUND_LAG_MAX` | save já quebrado | mantém |
