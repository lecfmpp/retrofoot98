# A dinâmica da Resenha: como funciona hoje

**Para que serve este documento:** explicar, em português simples, como o modo Resenha mantém os
dois humanos na mesma tela; e dar um guia do que aparece no console do Chrome a cada passo, para
acompanhar a transição de rodadas e telas enquanto se joga.

Atualizado depois da limpeza de 07/08/2026. A versão anterior deste documento listava oito
caminhos capazes de fazer a rodada avançar e seis definições de "já cumpri a minha parte". **Hoje
existe um caminho e uma definição.**

---

## 1. A ideia, em cinco linhas

A temporada é uma lista de **dias**. Cada dia tem uma competição (Libertadores, Copa do Brasil,
Brasileirão…) e três momentos: **escalando → jogando → classificação**.

O servidor guarda um **ponteiro**: em que dia a sala está e em que momento. Cada jogador, ao
cumprir o momento, **carimba**. Quando o último carimba — e só então — o servidor vira o momento.
Nenhum cliente pode virar nada sozinho.

> **A regra que resume tudo:** o jogo anda quando todo mundo carimbou. Se alguém não carimba, a
> sala espera — com o nome dele na tela — e quem decide seguir sem ele é o anfitrião, por um botão.
> Nunca um cronômetro.

---

## 2. O que cada momento significa

| Momento | O que está na tela de todos | O que faz o seu carimbo sair |
|---|---|---|
| **escalando** | tela do clube | você clicar em **Jogar** ("estou pronto") |
| **jogando** | a competição do dia, para todos ao mesmo tempo | sua partida terminar — ou você terminar de assistir |
| **classificação** | a tabela/chave daquela competição | você sair da tela de classificação |

Três detalhes que parecem pequenos e não são:

- **"Jogar" durante `escalando` não começa a partida.** Ele diz "estou pronto". A partida começa
  quando o último jogador ficar pronto — aí ela começa para os dois no mesmo instante.
- **Quem não tem jogo na competição do dia assiste.** É o mesmo dia para todos; ninguém pula uma
  competição porque não a disputa.
- **A tabela do Brasileirão é a exceção:** ela aparece depois do fechamento da rodada, porque
  depende do mundo já calculado pelo servidor (outras divisões, finanças, virada de temporada). As
  tabelas de copa aparecem no fim do próprio dia daquela copa.

---

## 3. Uma jornada inteira, passo a passo

Exemplo real: jornada com Libertadores na quarta e Brasileirão no sábado.

1. **Dia da Libertadores, momento `escalando`.** Os dois na tela do clube. Cada um escala e clica
   em Jogar. Cada clique manda um carimbo.
2. **Último carimbo → o servidor vira para `jogando`.** O anfitrião vê isso e abre a partida para a
   sala (é o único momento em que ele age, e ele só executa o que o servidor decidiu).
3. **Os dois entram juntos.** Quem tem confronto joga; quem não tem assiste à mesma rodada.
4. **Cada um termina → carimba.** Quem jogou vê o resultado da própria partida antes de carimbar —
   "cumpri o dia" quer dizer *terminei tudo*, não *apitou*.
5. **Último carimbo → o servidor vira para `classificação`.** A chave/tabela da Libertadores abre
   para os dois ao mesmo tempo.
6. **Cada um sai da tabela → carimba.** O último carimbo vira o **dia**: o ponteiro passa para o
   dia do Brasileirão, e a jornada da sala passa a sair dali.
7. **Dia do Brasileirão:** mesmos três momentos. No fim de `jogando`, o anfitrião fecha a rodada no
   servidor (é o único que fecha), todos adotam o mundo novo e veem a tabela.

---

## 4. O que aparece no console do Chrome

Abra com **F12 → Console**, nos dois navegadores. Vale acompanhar os dois lado a lado: quase todo
problema de sincronia aparece como uma diferença entre eles.

### 4.1 Entrada na sala (uma vez, no começo)

| Mensagem | Significa |
|---|---|
| `✓ Supabase pronto (sessão ativa: …)` | conectou ao servidor |
| `✓ Realtime conectado (elifoot_v3)` | vai receber avisos de mudança na sala |
| `✓ Sorteio: 2/2 treinadores receberam clube distinto.` | sorteio dos clubes ok |
| `✓ Estado inicial semeado (rodada 0)` | o anfitrião gravou o mundo inicial |
| `✓ Jogo carregado (rodada N) — clube: X` | o convidado baixou o mundo |

### 4.2 O ciclo normal de um dia — é isto que você vai ver o tempo todo

| Mensagem | Quando aparece | O que quer dizer |
|---|---|---|
| `a sala está em "escalando" no dia da libertadores — ninguém entra em campo antes de todos chegarem` | enquanto falta alguém ficar pronto | **normal.** A sala está esperando o carimbo de alguém |
| `carimbei dia7 (libertadores/escalando) — ainda faltam 1: LEANDRO` | quando **você** carimba | **a mensagem mais importante.** Diz o que você cumpriu e por quem a sala ainda espera |
| `carimbei dia7 (libertadores/escalando) — ainda faltam 0` | quando o **último** carimba | o momento vai virar agora |
| `[mesa] liberando 2026:dia7 (o dia virou para jogando) — 2/2 prontos` | só no anfitrião | ele abriu a partida para a sala |
| `✓ Jogo salvo (v4, rodada 2)` | no anfitrião, ao fechar a rodada | o mundo novo foi publicado |

**Como ler uma sala parada:** procure o último `carimbei`. O que vem depois de *"ainda faltam"* é
exatamente quem está segurando o jogo — e essa pessoa vê na tela dela o aviso **"A sala está
esperando por você"**, com o botão do que fazer.

### 4.3 Como ler as mensagens: o que cada palavra quer dizer

Duas linhas contam quase toda a história. Vale conhecê-las por dentro.

#### `carimbei` — "eu terminei a minha parte deste momento"

**Carimbar** é o jogo dizendo ao servidor: *"cumpri o que este momento pedia de mim"*. É como
assinar uma lista de presença — o dia só vira quando todas as assinaturas estiverem lá. Cada
jogador assina a sua; ninguém assina pelo outro.

```
carimbei dia7 (sulamericana/classificacao) — ainda faltam 1: LEANDRO
         ─┬──  ─────┬─────  ──────┬──────       ────┬────  ───┬───
          │         │             │                 │         └─ quem ainda não assinou
          │         │             │                 └─ quantos faltam (0 = o dia vai virar agora)
          │         │             └─ o momento
          │         └─ a competição em campo hoje
          └─ qual dia da temporada (0 a 64)
```

**A competição** é uma destas:

| Aparece como | É |
|---|---|
| `liga` | rodada do Brasileirão |
| `copaBrasil` | Copa do Brasil |
| `libertadores` | Libertadores |
| `sulamericana` | Sul-Americana |

**O momento** é um destes três, sempre nesta ordem:

| Aparece como | Quer dizer | Você carimba quando |
|---|---|---|
| `escalando` | todos na tela do clube | clica em **Jogar** ("estou pronto") |
| `jogando` | a competição está em campo | sua partida acaba, ou você termina de assistir |
| `classificacao` | a tabela/chave daquela competição | sai da tela de classificação |

Então `sulamericana/classificacao` lê-se: *"o dia de hoje é o da Sul-Americana, e a sala está no
momento de ver a classificação dela"*. E `copaBrasil/jogando`: *"é o dia da Copa do Brasil e as
partidas estão em campo agora"*.

#### `[mesa] liberando` — o anfitrião abrindo a partida

```
[mesa] liberando 2026:dia7 (o dia virou para jogando) — 2/2 prontos
                 ──┬─ ─┬──  ──────────┬────────────     ─┬─
                 ano  dia          o motivo           quantos prontos
```

Aparece **só no console do anfitrião**, e só uma vez por dia. "Mesa" é a mesa do anfitrião: o único
lugar do jogo em que alguém abre a partida — e, note, ele abre **porque o servidor decidiu**, não
porque achou que estava na hora. O motivo é sempre `o dia virou para jogando`.

#### A sequência que você deve ver — um dia inteiro

Num dia de Sul-Americana com dois jogadores, o console dos dois, somado, mostra exatamente isto:

```
(A) carimbei dia7 (sulamericana/escalando) — ainda faltam 1: LEANDRO   ← A ficou pronto, falta B
(B) carimbei dia7 (sulamericana/escalando) — ainda faltam 0            ← B ficou pronto, o momento vira
    [mesa] liberando 2026:dia7 (o dia virou para jogando) — 2/2 prontos ← só no anfitrião
     … os dois em campo …
(B) carimbei dia7 (sulamericana/jogando) — ainda faltam 1: CLAUDIO     ← B acabou primeiro
(A) carimbei dia7 (sulamericana/jogando) — ainda faltam 0              ← A acabou, o momento vira
     … a classificação da Sul-Americana abre para os dois …
(A) carimbei dia7 (sulamericana/classificacao) — ainda faltam 1: LEANDRO
(B) carimbei dia7 (sulamericana/classificacao) — ainda faltam 0        ← o DIA vira: vai para o dia8
```

Três carimbos por jogador, por dia. A ordem entre os dois jogadores muda (quem clicou antes, quem
terminou antes) — o que **não** muda é a ordem dos momentos.

#### As combinações que denunciam um defeito

| O que você vê | O que está errado |
|---|---|
| um momento **pulado** (`escalando` → `classificacao`, sem `jogando`) | alguém carimbou uma coisa que não fez |
| `.../jogando` carimbado **sem ninguém ter entrado em campo** | o carimbo está saindo cedo demais — é o defeito que fez a jornada 2 sumir |
| o mesmo `diaN` aparecendo **duas vezes** com o mesmo momento | o dia voltou atrás, ou o carimbo foi contado duas vezes |
| os dois consoles em **dias diferentes** (`dia7` e `dia8`) por mais de uns segundos | os clientes estão lendo ponteiros diferentes |
| `ainda faltam 0` e **nada acontece depois** | o momento virou e ninguém reagiu — a tela seguinte não abriu |
| `ainda faltam 1: FULANO` **parado por minutos** | a sala está esperando o Fulano; ele deve estar vendo "A sala está esperando por você" |
| nenhum `carimbei` durante uma jornada inteira | o ponteiro não está sendo usado — a sala pode ser antiga, sem calendário de dias |
| `[mesa] liberando` aparecendo **duas vezes** para o mesmo dia | a partida foi aberta duas vezes |
| `[mesa] liberando` **no console do convidado** | quem não é anfitrião está abrindo partida |

### 4.4 Mensagens de espera legítima (não são erro)

| Mensagem | O que está acontecendo |
|---|---|
| `entrada em campo barrada: a sala está em "escalando", não em "jogando"` | algum caminho tentou começar a partida antes da hora e foi barrado. É a trava funcionando |
| `sala no dia da jornada 3 (liga) e eu na 4 — esperando os dois concordarem` | seu jogo e o ponteiro discordam por um instante; você espera, sem decidir nada sozinho |
| `assento sem sinal de vida há 45s dispensado — a sala segue` | alguém fechou a aba; o anfitrião seguiu sem essa pessoa |
| `classificação da libertadores já vista e sem cronômetro — voltando à tela do clube` | uma rede de segurança tirou você de uma tela que já não tinha o que mostrar |

### 4.5 Sinais de problema — **estes eu quero saber**

| Mensagem | O que significa |
|---|---|
| `ponteiro e jornada local discordam há 12s: ponteiro=5 eu=6` | as duas contagens da jornada divergiram e não voltaram. **Não deveria acontecer nunca** |
| `cão de guarda: rodada N aberta há Xs sem fechar — resolvendo pelo servidor` | o anfitrião não fechou a rodada e outro cliente fechou por ele. Só é normal se o anfitrião tiver caído |
| `à frente da sala: eu=6 sala=5 — esperando o fechamento` | seu jogo passou à frente da sala |
| `atrasado 3 rodada(s) — puxando o estado da sala por cima da tela` | seu save ficou tão para trás que foi preciso puxá-lo à força |
| `pausa há 23s \| fase=running rodada: eu=4 sala=4 …` | a sala está parada há mais de 12s; a linha diz quem não publicou resultado |
| `sorteio X ainda sem dados (tentativa N) — devolvido à fila` | uma cerimônia não pôde abrir; ela volta para a fila em vez de se perder |

Ao mandar um relato, o mais útil é: **a última linha `carimbei` de cada jogador** e qualquer
mensagem da tabela 4.5.

### 4.6 Modo detalhado (opcional)

No console, antes de jogar:

```js
window.EF_DEBUG = true
```

Liga o rastro `[postround]` — cada passo do fluxo pós-rodada com a jornada, a tela e se aquele
cliente é o anfitrião. Útil quando o problema é "a tela X apareceu na hora errada".

---

## 5. As peças que existem hoje

Depois da limpeza, a lista inteira cabe numa tabela.

### No servidor (banco)

| Peça | Papel |
|---|---|
| `games.day_plan` | o calendário da sala: 65 dias, cada um com a sua competição |
| `games.day_idx` + `day_moment` | **o ponteiro**: onde a sala está |
| `game_seats.day_ack` | o carimbo de cada jogador |
| `day_ack()` | **a única função que move o ponteiro** — conta os carimbos e vira o momento/dia |
| `day_status()` | quem ainda não carimbou, com nome |
| `day_current()` | o dia atual (lido pelos clientes a cada 2s) |
| `start_running()` | a largada, exclusiva do anfitrião; congela as escalações de todos |
| `reopen_ready()` | reabre a fase para o dia seguinte |
| `resolve-round` (edge function) | calcula o mundo: outras divisões, copas, finanças, virada |

### No cliente

| Peça | Papel |
|---|---|
| `roomDay()` | qual é o dia — e segura a tela se discordar do servidor |
| `roomDayRefresh()` | relê o ponteiro a cada 2s (não confia só no aviso do realtime) |
| `roomDayFact()` | responde "eu cumpri este momento?" |
| `roomDayTick()` | carimba, e escreve no console o `carimbei …` |
| `onlineMomentScreenTick()` | abre a tela que o momento pede |
| `onlineWaitingTick()` | os dois painéis: "esperando por X" e "a sala espera por você" |
| `onlineHostTick()` | o anfitrião executa a largada quando o momento vira `jogando` |
| `onlineHostCloseRound()` | o anfitrião fecha a rodada quando o momento vira `classificação` |
| `onlineReconcileIfBehind()` | todo mundo adota o mesmo mundo depois do fechamento |
| `startLiveRound()` / `startCupRound()` | a porta física: nada entra em campo fora de `jogando` |
| `onlineOrphanCloseCheck()` | último recurso: fecha a rodada se o anfitrião sumiu |

---

## 6. A limpeza terminou

O **estágio "quarta/sábado"** era a última unidade de tempo concorrente com o dia: uma "quarta de
copa" e um "sábado de liga" que viviam dentro do estado do jogo e chegavam atrasados em relação ao
ponteiro. Foi ele que fez a jornada 2 fechar sem ninguém jogar, e ele saiu.

O que isso muda na prática: **um fechamento por jornada**, em vez de dois. As copas da semana são
resolvidas no mesmo fechamento da rodada de liga — como era antes da divisão em estágios — e quem
separa as competições agora é o **dia** do ponteiro, que é mais preciso: cada copa tem o seu dia,
com os seus três momentos, em vez de todas amontoadas numa "quarta".

Isso foi feito **sem alterar o `resolve-round`**: quando o cliente não pede um estágio, a função
já resolve as copas junto da liga (era o caminho de degradação que ela mesma previa). Uma mudança a
menos onde ela seria mais cara.

**As redes de segurança que ficaram** — quatro, cada uma com uma justificativa que se sustenta:

| Rede | Existe para |
|---|---|
| cão de guarda | o anfitrião caiu e ninguém fecharia a rodada |
| `ROUND_LAG_MAX` | save tão atrasado que já quebrou |
| auto-resolver de decisão vencida | aba em segundo plano congela os prazos de expulsão/pênalti |
| dispensa por 45s sem sinal de vida | quem fechou a aba não pode congelar a sala |

Nenhuma delas decide o avanço do jogo: elas só cobrem o caso em que alguém desapareceu.

---

## 7. Se travar, o roteiro é este

1. Olhe o **último `carimbei`** nos dois consoles. Quem aparece depois de *"ainda faltam"* é quem
   está segurando.
2. Na tela dessa pessoa deve estar o aviso **"A sala está esperando por você"**, com o botão do que
   fazer. Se não estiver, isso já é o defeito.
3. Se ela não puder continuar, o anfitrião usa **"Começar sem eles"**.
4. Se nada disso resolver, copie as linhas da tabela 4.5 dos **dois** navegadores — elas dizem qual
   dos dois lados andou sozinho.
