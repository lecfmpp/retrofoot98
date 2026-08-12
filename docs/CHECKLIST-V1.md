# Checklist de lançamento — RetroFoot98 v1

Ordenado por **complexidade × impacto na jogabilidade × credibilidade do jogo**.
O que é perfumaria e estética ficou no fim.

Os números (#1 a #16) são os da lista original e **não mudam** — são identificadores
estáveis. O que mudou foi a ordem de execução.

Um item só sai da lista depois que o usuário testar no ar
(implementar → commitar → publicar → testar).

> **ESTADO EM 12/08/2026, madrugada.** Implementados e commitados: #8, #10 (raiz),
> #9, #13, #12, #4. **A edge function `resolve-round` está NO AR** (GitHub Actions, deploy
> com sucesso). **O SITE NÃO FOI PUBLICADO**: `firebase deploy` falhou com
> *"credentials are no longer valid"* — só o usuário resolve, com
> `firebase login --reauth`. Enquanto isso, produção roda o cliente ANTIGO com o
> servidor NOVO; a mudança do servidor é retrocompatível de propósito (cliente sem
> `results`/`key` cai exatamente no comportamento anterior), então nada quebra —
> mas as correções só chegam ao jogador depois do deploy do site.

---

## Bloco A — Integridade da partida e do save

**É aqui que o jogo perde credibilidade.** Um usuário que ganha e é eliminado, ou que
perde os títulos que conquistou, não volta. Também é o bloco mais complexo: mexe em
sincronia servidor⇄cliente, não em tela.

### A1 · #8 — ✅ FEITO (commit 6f7d350) — Resultado divergente entre usuários
O pior bug da lista, e o mais caro. Sintoma: o dono do time vê um placar, os outros
humanos veem outro; alguém que **ganhou o jogo foi eliminado**.
Pista forte do usuário: **mesmos jogos de competições diferentes caindo no mesmo dia**.
Se a chave que identifica a partida (`streamKey` / chave do confronto) não carrega a
competição, dois jogos do mesmo par de clubes no mesmo dia colidem — e o resultado de um
sobrescreve o outro.
Onde olhar: `ui/main.js` (`onNetMatchLive`, `m.streamKey`, ~5700) e
`supabase/functions/resolve-round`.
**Investigação primeiro, código depois** — reservar uma sessão só pra isso, com o harness
de 2 clientes (`/harness/` + `scenario()`) rodando antes e depois.

### A2 · #10 — ✅ RAIZ CORRIGIDA (mesmo commit do #8), falta o usuário confirmar no ar
Ganhou e o dinheiro não entrou no caixa; nem viu o jogo da final.
**Muito provavelmente consequência de A1**: se a partida não foi reconhecida como a final
daquela competição, nem a tela dispara nem o prêmio é pago.
`data/prizes.js`, `engine/world-rules.js`.
Tratar como **verificação depois de A1**, não como fix independente — corrigir isolado
corre o risco de mascarar a causa real.

### A3 · #13 — ✅ FEITO (commit 4481e3b) — Histórico perdido no logout + re-entrada
Títulos, troféus e conquistas somem para os humanos. Perda de dados é a classe de bug que
mais destrói confiança: o usuário deixa de acreditar que vale a pena continuar jogando.
`data/trophy-room.js`, `engine/autosave.js`, e o carregamento do save em
`net/supabase-adapter.js`.
A pergunta central: o histórico é persistido **por assento no servidor**, ou só existe no
estado local que o login recria do zero?

### A4 · #12 — ✅ FEITO (commit 7ca6e81) — Botão "Gravar jogo" não fazia nada na Resenha
Fica junto de A3 porque é a mesma ansiedade do usuário — *"meu progresso está seguro?"*.
Impacto alto, complexidade provavelmente baixa (condição de render do header).
Bom candidato para sair no mesmo commit de A3.

---

## Bloco B — Fluxos de jogo: o que não acontece e o que quebra

Não corrompem dado, mas quebram a partida em andamento, deixam uma feature inacessível ou
atropelam um momento que o jogo deveria dar ao treinador.

### B1 · #16 — Duas semanas de entressafra depois do fim das competições
**A única feature nova da lista, e o item mais complexo depois do #8.**
Hoje a temporada acaba e o jogo **vira sozinho**: da última rodada vai direto pro
`newSeasonReset()`. O treinador não tem onde ver o que fez, analisar o elenco nem se
planejar. As duas semanas criam esse respiro.
Liga-se diretamente ao **A2 (#10)** — *"não vi o jogo da final, o prêmio não entrou"* é o
mesmo sintoma visto de outro ângulo: **o fim de temporada passa rápido demais**.

**O que já existe (boa notícia):**
- A máquina de celebração está pronta: `MOMENTO_FILA` / `enfileirarMomento` /
  `MOMENTO_DEFS` (`ui/main.js:4321-4340`), com 9 momentos definidos.
- `enfileirarMomentosFimDeTemporada` (`ui/main.js:4519`) já enfileira campeão da liga,
  artilheiro, promovido e rebaixado; `enfileirarMomentosCopa` (`4529`) faz o das copas.
- `prorrogarSeFaltaCopa` / `prorrogarPorCopasPendentes` (`engine/world-rules.js`) **já
  implementa "estender a temporada com jornadas extras"** — é o mecanismo natural pra
  reusar nas 2 semanas, em vez de inventar outro.

**O que falta (o trabalho de verdade):**
1. **O calendário, não a tela.** `engine/core.js:3904`: quando `S.round>=S.sched.length`,
   ou prorroga por copa pendente ou chama `endSeason()` direto. As 2 semanas entram aqui.
2. **Na Resenha quem vira a temporada é o SERVIDOR** (`resolveSeasonTurnover`,
   `core.js:4257`). Então isso **não é mudança de UI — é mudança de calendário no
   servidor**, e todos os assentos têm que concordar sobre estar na semana de entressafra.
   Cai direto na regra do ponteiro de dia: *"ninguém ocupado" não é "dia cumprido"*.
   **Rodar o harness de 2 clientes antes e depois.**
3. **O que o treinador faz nessas 2 semanas** precisa ser decidido: elenco, finanças,
   histórico e mercado já são telas existentes — o mínimo é liberar a navegação e não
   deixar botão de "avançar" pulando tudo.
4. `seasonEndDialog` (`ui/main.js:7300`) hoje termina no botão **"Nova temporada"** →
   `clAdvanceSeason()`, que reseta na hora. Esse botão passa a abrir a entressafra, e o
   reset vai pro fim da segunda semana.

**Sobre os modais de celebração — o que existe e o que falta em arte:**
Os modais estão todos **prontos e funcionando**; o que falta é o vídeo de cada um.
`VIDEOS_MOMENTO` (`ui/main.js:4305-4317`) tem um comentário explicando que o valor está
`null` de propósito (caminho pra arquivo inexistente suja o console com 404) e que **basta
soltar o arquivo e trocar o `null` pelo caminho**.
- ✅ **Com vídeo:** `campeao-liga`, `campeao-copa` (`momento-campeao.mp4`), `crise`.
- ⬜ **Sem vídeo (é aqui que o design entra):** `marcador-liga`, `marcador-copa`,
  `promovido`, `rebaixado`, `final-copa`.
  *(`abertura-copa` também está sem, mas vai ser removido — ver #15.)*

Ou seja: quando for implementar, o que você precisa passar são **as 5 telas acima**. Não
precisa redesenhar o modal, só a arte que entra nele.

### B2 · #3 — ⚠️ NÃO RESOLVIDO — investigado a fundo, ver nota abaixo
Alta frequência: acontece **toda vez** que o usuário bate um pênalti, no momento de maior
tensão do jogo. Por isso vem antes dos outros do bloco.
**O que eu descartei lendo o código (pra não refazer o caminho):**
o painel de substituição (`subPanelHTML`) só é renderizado quando `showSubs` é verdadeiro, e
`showSubs` exige `halftime`, que por sua vez exige `!RL.penEvent` (`ui/main.js`, `liveModalHTML`).
Ou seja: enquanto o pênalti está ativo o painel está corretamente bloqueado, e
`closePenaltyModal` limpa `RL.paused` e `RL.penEvent` **antes** do `cdraw()`. Também conferi
que `applyDecision({tipo:'penalti'})` não gera evento de lesão/substituição, e que
`RL.halftimeDone` não é reiniciado (nem na prorrogação).

**Conclusão da investigação:** se o painel aparece, é porque a partida ENTROU no estado de
intervalo. A hipótese que sobra — e que só o teste confirma — é o pênalti perto do minuto 45:
o `liveTick` retorna cedo enquanto o pênalti está pendente, o intervalo fica represado e dispara
assim que o modal fecha, colando um no outro.

**Para o próximo passo, preciso de uma informação que só o jogo em uso dá:** o modal de
substituição aparece em pênalti de QUALQUER minuto, ou só nos que acontecem perto do intervalo
(ou perto do fim, na prorrogação)? Com essa resposta o conserto é direto; sem ela, mexer no
fluxo da partida ao vivo no escuro é pior que deixar como está.

### B3 · #9 — ✅ FEITO (commit 3e2d53e) — Escalava machucado e suspenso
O filtro da escalação automática está ignorando o estado de lesão. Entra aqui porque
escalar um machucado contamina a simulação inteira daquela partida — o usuário vê um
resultado que não corresponde ao time que ele acha que montou.

### B4 · #14 — Proposta de clube a outro treinador humano usa o modal errado
Esperado: **convite para o jantar** → depois o modal de **aceitar ou recusar**.
Na Resenha aparece só um modal genérico.
**Confirmado pelo usuário: o modal genérico APARECE** — ou seja, o gatilho
(`tickResenhaCareer`, `engine/core.js:3486`) funciona, e o defeito é só qual modal a
Resenha escolhe abrir. Isso reduz bastante o fix.
Existem dois caminhos no código e o multiplayer usa o pobre:
- **Solo:** `ui/main.js:2415-2490` (convite pro jantar, vídeo `video/convite-jantar.mp4`)
  → `ui/main.js:2509-2546` (jantar com a diretoria, termos reais, "Aceitar oferta").
- **Resenha:** `handleResenhaCareer` (`ui/main.js:9112`) → `showResenhaOffer`
  (`ui/main.js:9136`) abre **um único** modal "🤝 Proposta de emprego".

Sub-tarefas:
1. `showResenhaOffer` chama `showJobInvite(offer)` em vez de montar o modal genérico.
2. `clJobProposalAccept` desvia para `clAcceptResenhaOffer` quando `CL.online` — na Resenha
   a troca de assento é via `NET.setMyClub`, não pelo caminho solo.
3. **A oferta da Resenha não carrega `salary`**: `core.js:3520` monta `{clubId, division}` e
   só. O modal do jantar exibe `o.salary` e o prêmio derivado dele (`ui/main.js:2507`) —
   hoje sairia "0/sem". Preencher o salário na oferta.
4. **Caso desempregado** (pós-demissão): o convite usa o clube atual (`me.short`) e a tabela
   em volta da sua posição (`jobInviteTableHTML`). Sem clube, os dois quebram — precisa de
   variante de texto e de tabela.

---

## Bloco C — Legibilidade de tela

Não é estética: são telas que **ficam difíceis de ler ou de usar**. Fica abaixo de A e B
porque nenhum deles altera o resultado do jogo, mas acima da perfumaria porque atrapalham
a jogar.

### C1 · #11 — Tela piscando (comentários no Modo Camarote, fatos nos jogos ao vivo)
Piscar durante a partida cansa e passa impressão de coisa quebrada.
Causa provável: re-render do container inteiro a cada tick em vez de append incremental.
`engine/commentary.js` + o loop `liveTick` no `ui/main.js`.

### C2 · #2 — Espaçamento das linhas nas tabelas em resolução 100%
Sintoma foi na Libertadores e Sul-Americana, mas o escopo pedido é maior: **normalizar
todas as telas de tabela e classificação para resoluções diferentes**.
`public/src/styles/`. Fazer como **uma passada única de layout responsivo**, não remendo
por tela — remendar tela por tela é o que garante que volta a quebrar.

---

## Bloco D — Remoções de escopo

Não são bugs: é tirar coisa do ar pro v1. Rápidas, risco ~zero, cabem em um commit só e
podem entrar em **qualquer momento** — inclusive como intervalo entre dois itens pesados
do Bloco A.

- **#1 — Remover o botão "Sincronizar" das telas de onboarding.**
  Fluxo em `net/local-transport.js:214-320` (`resyncDialog`). Tirar só do onboarding,
  manter no painel da sala.
- **#4 — ✅ FEITO (commit 8189e4f) — Chat fora do ar.**
  Desligado por uma constante `CHAT_ATIVO` em `net/local-transport.js`: some a doca
  flutuante "💬 Chat da Liga" (que ficava por cima do jogo em todas as telas online,
  inclusive a partida ao vivo), some a seção "Chat da sala" do lobby, e o `onChat`
  retorna cedo — sem badge de não-lidas e sem toast interrompendo a partida.
  Transporte, histórico em `room.chat` e coluna no banco **intactos**: voltar é trocar
  a constante pra `true`, sem migração e sem perder conversa.
- **#15 — Remover o modal de preparação para a Copa do Brasil** (ficou sem função).
  É o momento `'abertura-copa'` — *"A COPA COMEÇA HOJE / Preparar o time"*.
  Onde vive: `MOMENTO_DEFS['abertura-copa']` (`ui/main.js:4328`),
  `VIDEOS_MOMENTO['abertura-copa']` (`ui/main.js:4314`, já está `null`), e a chamada em
  `ui/main.js:5306`.

  ⚠️ **Cuidado — a linha 5306 dispara os DOIS momentos:**
  ```
  abrirMomento(ehFinal ? 'final-copa' : 'abertura-copa', ...)
  ```
  O `'final-copa'` **tem que continuar existindo**. Ele é justamente a tela da final da
  Copa do Brasil que o usuário relatou não ter visto em **A2 (#10)** — apagar o ramo
  inteiro do `if` mataria a evidência desse bug e a tela que provavelmente queremos de
  volta funcionando. A remoção é só do ramo `abertura-copa`.

  Verificar também o slot de anúncio `tela-copa-prejogo-728x90` (`ui/main.js:4395`), que
  hoje é **compartilhado** pelos dois momentos — ele precisa continuar servindo o
  `final-copa` depois da remoção.

---

## Bloco E — Conteúdo e estética (perfumaria)

Último. Nada aqui bloqueia o lançamento. Dentro do bloco, os dois primeiros afetam a
credibilidade do conteúdo (um atacante de 45 anos quebra a imersão), o último é estética pura.

- **#6 — Ajustar idades dos jogadores.**
- **#7 — Ajustar os nomes.**
- **#5 — Trocar cores dos times de fora do Brasil.** Estética pura.

---

## Notas de método

- **Ordem de execução:** A1 → A2 (verificação) → A3 + A4 → B1 (#16) → B2 (#3) → B3 (#9)
  → B4 (#14) → C1 → C2 → D → E.
- **A1 domina o cronograma.** É o único item que é investigação antes de implementação.
  Se ele demorar, D e E podem ser feitos em paralelo por serem independentes da sincronia.
- **Único desvio do critério pedido:** o Bloco D estava em primeiro na versão anterior
  porque reduz a superfície de teste dos bugs de cima. Como não impacta jogabilidade,
  desceu — mas se o Bloco A travar, D é o melhor lugar para gastar uma hora solta.
- **Paralelizáveis com o resto:** C2, E e o Bloco D — com **uma exceção**: o #15 encosta na
  mesma linha (`ui/main.js:5306`) que a tela da final da Copa investigada em A2 (#10).
  Fazer o #15 **depois** de A2, ou pelo menos não antes de saber por que a final não
  apareceu — senão a remoção vira suspeita na hora de depurar.

### Perguntas em aberto

1. **#7 "ajustar os nomes"** — nomes de jogadores (gerador), de clubes internacionais ou de
   competições? Muda completamente o tamanho do trabalho.
2. **#6 idades** — é a distribuição inicial do elenco que está errada, ou o envelhecimento
   entre temporadas?
3. **#4 chat** — esconder atrás de uma flag (volta fácil) ou remover o código de vez?
