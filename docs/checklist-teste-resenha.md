# Checklist de teste — Modo Resenha (sessão com os sócios)

**Objetivo da sessão:** provar que a sala é **um jogo só para todo mundo** — mesmos resultados, mesma
tabela, mesmos fatos no fim da temporada — e que **ninguém anda sozinho** nem fica preso esperando.

**Como usar:** cada item tem *como testar* → *aprovado quando* → *reprovado se*. Marque `[x]` aprovado,
`[!]` reprovado (e cole as linhas do console), `[-]` não testado.

**Regra de ouro do modo:** o servidor é a única fonte. Se cliente e servidor discordarem, a tela
**segura** — nunca devolve a decisão ao cliente. Qualquer item em que o cliente decidiu sozinho é
reprovado, mesmo que o resultado tenha ficado "certo por acaso".

Referência técnica: [docs/sincronia-resenha.md](sincronia-resenha.md) (ponteiro do dia, carimbos, console).

---

## 0. Antes de começar (5 min, todos juntos)

- [ ] Todos na **mesma versão publicada** (recarregar com cache limpo; confirmar o mesmo número de versão em Opções).
- [ ] Cada sócio entra **uma vez** pelo link com `?debug=1` (ex.: `retrofoot.com.br/?debug=1`) — o modo
      detalhado fica **gravado no navegador** e sobrevive a F5, "Sincronizar sala" e reentrada.
      Desliga com `?debug=0`. (Não precisa mais digitar `window.EF_DEBUG` no console.)
- [ ] Cada sócio **no desktop** com **F12 → Console aberto**. As linhas `carimbei` e `[mesa] liberando`
      saem sempre; o `?debug=1` acrescenta o rastro `[postround]`, que é o que explica "a tela apareceu
      na hora errada". No celular não há console — garantir pelo menos dois sócios no PC.
- [ ] Definir e anotar: **quem é o anfitrião**, código da sala, quantos assentos, clube de cada um.
- [ ] Anotar o **dispositivo de cada um** (desktop/celular, navegador, rede) — metade dos bugs de sincronia são de aba em segundo plano ou 4G.
- [ ] Combinar que **ninguém fecha a aba** sem avisar (fechar aba é um teste específico, na seção 9).
- [ ] Alguém fica responsável por **gravar a tela** (a evidência de "a tela X apareceu na hora errada" é sempre visual).

---

## 1. Entrada na sala e sorteio

- [ ] **Criar sala** — anfitrião cria, recebe código. *Aprovado:* código funciona no primeiro convite.
- [ ] **Entrar por código** com todos os sócios. *Reprovado se:* alguém entra e vê a sala em estado diferente dos outros.
- [ ] **Lista de salas** mostra escudo/clube/temporada corretos para quem já jogou.
- [ ] **Sorteio dos clubes** — cada treinador recebe clube **distinto**. Console: `✓ Sorteio: N/N treinadores receberam clube distinto.`
- [ ] **Todos veem o sorteio** (não só quem estava na tela na hora). Quem entra atrasado vê o resultado, não uma tela vazia.
- [ ] **Estado inicial semeado** pelo anfitrião (`✓ Estado inicial semeado (rodada 0)`) e baixado por todos (`✓ Jogo carregado (rodada N) — clube: X`).
- [ ] **Escolhas do assistente** (países, moeda, nº de jogadores) são as mesmas para todos — ninguém vê um catálogo diferente.
- [ ] **Reentrar na sala** logo depois de entrar (fechar e abrir) devolve o mesmo assento, o mesmo clube e o mesmo dia.
- [ ] **Realtime conectado** nos dois (`✓ Realtime conectado`). Sem isso o resto do teste não vale.

---

## 2. Ponteiro do dia — o coração do modo

O dia tem três momentos, sempre nesta ordem: **escalando → jogando → classificação**.

- [ ] **"Jogar" não começa a partida** — clicar em Jogar durante `escalando` só diz "estou pronto".
      *Reprovado se:* a partida abre para quem clicou antes dos outros.
- [ ] **Cada clique gera um carimbo** — console: `carimbei diaN (competição/momento) — ainda faltam K: FULANO`.
- [ ] **A sala só vira com o último carimbo** (`ainda faltam 0`) e vira **para todos ao mesmo tempo**.
- [ ] **Ninguém pula um momento** — nunca ver `escalando` → `classificacao` sem `jogando` no meio.
- [ ] **Ninguém avança de dia sozinho** (o item mais importante do teste): um sócio clica em tudo o que
      encontrar pela frente enquanto o outro fica **parado de propósito**. *Aprovado quando:* ele fica
      travado no momento atual, com aviso na tela. *Reprovado se:* ele chega ao dia seguinte, ou vê
      classificação/mercado de um dia que a sala não abriu.
- [ ] **Painel "esperando por X"** aparece para quem já carimbou, com o **nome** de quem falta.
- [ ] **Painel "A sala está esperando por você"** aparece para quem falta, **com o botão do que fazer**.
      *Reprovado se:* a pessoa que segura a sala não vê nada (é o defeito clássico de sala parada).
- [ ] **Os dois consoles no mesmo dia** — nunca `dia7` e `dia8` por mais de poucos segundos.
- [ ] **`[mesa] liberando` só no anfitrião**, e **uma vez por dia**.
- [ ] **`[mesa] liberando` nunca no convidado.**
- [ ] **Quem não joga a competição do dia assiste** — ninguém pula uma copa que não disputa.
- [ ] **Tempo de aparecimento:** cronometrar o intervalo entre o `ainda faltam 0` e a tela abrir em
      cada dispositivo. *Aprovado:* ≤ ~3s e **igual** para todos. *Reprovado se:* um vê a tela 10s
      antes do outro, ou um vê e o outro nunca vê.

---

## 3. Partidas ao vivo

### 3.1 Humano × CPU
- [ ] Placar, gols e eventos **iguais nas duas telas** (quem joga e quem assiste depois na tabela).
- [ ] Substituição, lesão, expulsão e pênalti funcionam sem travar a sala.
- [ ] Terminar a partida gera o carimbo de `jogando` — **depois** de ver o resultado, não no apito.

### 3.2 Humano × Humano (o caso crítico)
- [ ] Os dois entram **no mesmo instante**.
- [ ] **Mesmo placar, mesmos gols, mesmos marcadores** nas duas telas — conferir gol a gol, não só o final.
- [ ] **Decisões remotas**: pênalti, substituição, expulsão — cada um decide do seu lado e o outro vê a
      mesma consequência.
- [ ] **Disputa de pênaltis** (forçar um empate em mata-mata) termina igual para os dois.
- [ ] Um dos dois **minimiza a aba durante a partida** → ao voltar, o jogo dele está no mesmo ponto
      dos outros (ou o auto-resolver de decisão vencida agiu, e o outro viu a mesma coisa).
- [ ] **Resultado CPU × CPU nunca decide no cliente** — os dois veem o mesmo placar em todos os
      confrontos da rodada, inclusive os que nenhum humano jogou. *Reprovado se:* as tabelas divergirem
      em uma linha sequer.

### 3.3 Espectador
- [ ] Quem assiste vê a **mesma narração e o mesmo placar** de quem joga.
- [ ] Console **não** mostra `espectador: rodada resolvida em segundo plano sem ter sido assistida`.

---

## 4. Resultados e classificação — fonte única

Depois de **cada** rodada, os dois (ou mais) sócios comparam a tela lado a lado:

- [ ] **Tabela da divisão** idêntica: pontos, saldo, jogos, ordem.
- [ ] **Tabelas das outras divisões** idênticas.
- [ ] **Chaves/grupos das copas** (Copa do Brasil, Libertadores, Sul-Americana) idênticos.
- [ ] **Artilharia** idêntica — mesmos nomes, mesmo número de gols.
- [ ] **Assistências** idênticas.
- [ ] **Ligas internacionais de fundo** (líderes e artilheiros por país) idênticas.
- [ ] **Notícias/e-mails da rodada** coerentes entre si (não precisam ser iguais — são do assento —
      mas não podem citar fatos diferentes).
- [ ] **Nenhuma divergência sobrevive a um F5**: se um viu diferente, recarregar e comparar de novo;
      se persiste, é bug de servidor; se some, é bug de tela (anote qual dos dois).

---

## 5. Persistência (rodada a rodada, e entre sessões)

- [ ] **F5 no meio de um dia** — volta no mesmo dia, no mesmo momento, com o mesmo elenco/escalação.
- [ ] **F5 logo após uma partida** — o resultado não é perdido nem recontado.
- [ ] **Fechar o navegador e voltar 10 minutos depois** — o assento, o caixa, a carreira e o inbox estão lá.
- [ ] **Trocar de dispositivo** (começar no PC, continuar no celular, mesmo login) — mesmo save, mesmo dia.
- [ ] **Botão "Sincronizar sala"** (no lugar do Gravar): grava o que é do assento, recarrega e adota o
      estado do servidor, **sem sair da sala e sem logout**.
- [ ] **Nada de fato de jogo só no cliente**: caixa, extrato, premiação, títulos e carreira sobrevivem
      a um `localStorage` limpo. *Teste:* limpar dados do site de um sócio e reentrar — o que voltar do
      servidor tem que ser tudo.
- [ ] **Duas abas do mesmo jogador** não criam dois assentos nem carimbos dobrados.

---

## 6. Mercado e negociação entre humanos

- [ ] **Proposta de um humano para outro** chega ao destinatário na rodada certa.
- [ ] **Contraproposta** e **recusa** aparecem para os dois lados.
- [ ] **Aceite debita o caixa de quem comprou e credita quem vendeu** — conferir os dois extratos.
- [ ] **O jogador troca de elenco de verdade** nas duas telas (some de um, aparece no outro).
- [ ] **Leilão**: um sócio põe à venda, o outro vê o leilão aberto; o fechamento é o mesmo para os dois.
- [ ] **Leilão fechado por outro clube** aparece uma vez só, sem repetir a cada tela.
- [ ] **Subir da base** e **renovação de contrato** não divergem entre as telas.
- [ ] **Mercado exterior** (filtro de país): comprar de um clube nunca visto pelo servidor funciona —
      o jogador chega inteiro (força, salário, contrato, valor).
- [ ] **Sem dinheiro duplicado**: somar caixa dos humanos antes e depois de uma negociação — a
      diferença tem que fechar exatamente com o valor da transação + taxas.
- [ ] **Negociar durante o momento errado** (ex.: durante `jogando`) não quebra o carimbo nem trava a sala.

---

## 7. Finanças e clube

- [ ] **Patrocínio pago de uma vez no início da temporada** — mesmo valor mostrado e creditado.
- [ ] **Cota de TV** visível e coerente com o extrato (nada invisível na aba).
- [ ] **Folha salarial, bilheteria e obras do estádio** batem com o extrato de cada rodada.
- [ ] **Extrato fecha com o total** — somar as linhas e comparar com o caixa.
- [ ] **Estádio**: construir numa rodada e ver o efeito na seguinte, com o mesmo custo nas duas telas.

---

## 8. Virada de temporada (o teste mais caro — reservar tempo)

Se a sessão não chegar ao fim da temporada, **rodar uma sala de teste com temporada curta** só para isto.

- [ ] **A tela de fim de temporada aparece para TODOS os humanos** — inclusive para quem estava
      desconectado na hora da virada e entrou depois. *Reprovado se:* alguém cai direto no sorteio da
      copa nova sem ver o resumo.
- [ ] **A premiação em dinheiro é aplicada a todos**, uma vez só (conferir o extrato).
- [ ] **O sorteio da copa nova não abre por cima** do resumo de temporada.
- [ ] **Títulos registrados** para o campeão certo, em todas as competições (4 divisões + copas).
- [ ] **Artilheiro por competição** gravado e visível no histórico.
- [ ] **Assistências** da temporada preservadas no arquivo.
- [ ] **Classificações finais arquivadas** — abrir o filtro de temporada e conferir a tabela final de
      cada competição da temporada que fechou.
- [ ] **Promoções e rebaixamentos** iguais nas telas de todos.
- [ ] **Vagas continentais**: campeão da Copa do Brasil, campeão da Libertadores e campeão da
      Sul-Americana entram na Libertadores seguinte; ninguém em duas copas ao mesmo tempo.
- [ ] **Grupos das copas fecham em múltiplo de 4** (nenhum grupo com 3 clubes).
- [ ] **Sala de Troféus** mantém tudo o que o treinador já ganhou, inclusive de clubes anteriores e de
      outros países — nada some na virada.
- [ ] **Ranking de treinadores** com foto da temporada que fechou (escolher um ano passado mostra o
      ranking daquele fim de temporada).
- [ ] **Nenhum sócio perde nada** ao recarregar durante a virada — testar de propósito: um dá F5 no
      meio do processo de virada.

---

## 9. Treinador — moral, sondagens e transferência

- [ ] **Segurança no cargo** sobe/desce coerente com a campanha, e o número é o mesmo depois de um F5.
- [ ] **Moral do plantel** reage a resultados, títulos e à sala de imprensa.
- [ ] **Sala de imprensa** aparece na hora certa e as respostas mexem de verdade na moral.
- [ ] **Sondagens de outros clubes** chegam a quem está com segurança alta — e a régua faz sentido
      (indo bem na Série A o convite não vem da Premier no primeiro ano).
- [ ] **Aceitar um convite** troca o treinador de clube dentro da sala: os outros sócios veem a mudança,
      o clube antigo continua existindo com CPU no comando.
- [ ] **Recusar** mantém tudo como estava, sem congelar a sala.
- [ ] **Demissão** (deixar a segurança cair) tem um caminho de saída que não quebra a sala dos outros.
- [ ] **Histórico/carreira** do treinador acompanha a mudança de clube (títulos anteriores não somem).

---

## 10. Resiliência — o que acontece quando alguém some

- [ ] **Sócio fecha a aba no meio de um momento** → depois de ~45s a sala **segue sem ele** (`assento sem
      sinal de vida há 45s dispensado`). *Reprovado se:* a sala congela para sempre.
- [ ] **Ele volta depois** → entra no dia atual da sala, sem forçar ninguém a voltar atrás.
- [ ] **Botão "Começar sem eles"** do anfitrião funciona e é o **único** jeito manual de seguir.
      *Reprovado se:* existir qualquer cronômetro que avance a sala sozinha.
- [ ] **O anfitrião cai** durante a rodada → o cão de guarda fecha pelo servidor
      (`cão de guarda: rodada N aberta há Xs sem fechar`) e todos adotam o mesmo mundo.
- [ ] **Queda de internet de 30s** em um sócio (modo avião) → ao voltar ele reconcilia sem perder rodada.
- [ ] **Aba em segundo plano** durante uma decisão com prazo (pênalti/expulsão) → o auto-resolver age e
      o outro lado vê a mesma consequência.
- [ ] **Um sócio muito atrasado** (deixar 2-3 rodadas passarem sem carimbar) → puxa o estado da sala
      por cima, sem inventar resultado local.

---

## 11. Multiplayer com mais de 2 (o que muda no grupo)

- [ ] Rodar a sessão com **3+ sócios** — a maioria dos bugs de sincronia só aparece do 3º em diante.
- [ ] O painel de espera lista **todos** os que faltam, não só um nome.
- [ ] Um sócio saindo no meio não trava os outros dois.
- [ ] **Dois humanos no mesmo confronto + um terceiro assistindo**: os três veem o mesmo placar.
- [ ] Sorteio distribui clubes distintos para todos os assentos.
- [ ] Tempo de abertura das telas continua próximo entre os N dispositivos (medir com o mais lento).

---

## 12. Telas e ritmo (jogabilidade em grupo)

- [ ] Nenhuma tela obrigatória aparece **só para um** (resumo de temporada, sorteio, premiação, imprensa).
- [ ] Nenhuma tela fica **presa** sem botão de saída.
- [ ] **Celular e desktop** mostram os mesmos dados e no mesmo ritmo.
- [ ] **Respiro entre elementos** — listas, linhas e cartões não encostam uns nos outros (queixa recorrente).
- [ ] O jogo diz sempre **de quem é a vez / o que falta** — ninguém precisa perguntar no grupo do WhatsApp.
- [ ] Tempo total de uma rodada com N jogadores é aceitável (cronometrar uma rodada inteira).

---

## 13. O que coletar em cada bug

Sem isto, o relato não é investigável:

1. **A última linha `carimbei` de cada sócio** (as duas/três, não só a de quem viu o problema).
2. Qualquer linha da tabela **4.5 do [sincronia-resenha.md](sincronia-resenha.md)** (sinais de problema).
3. **Código da sala, dia, competição, momento** e horário aproximado.
4. **Print ou vídeo** das telas divergentes, lado a lado.
5. Quem é o **anfitrião** e o dispositivo/rede de cada um.

### Sinais que reprovam na hora
- `ponteiro e jornada local discordam há Xs`
- `[mesa] liberando` no console de um convidado, ou duas vezes no mesmo dia
- momento pulado, ou o mesmo `diaN` com o mesmo momento duas vezes
- `ainda faltam 0` e **nada acontece** depois
- consoles em dias diferentes por mais de poucos segundos
- qualquer resultado de partida diferente entre duas telas

---

## 14. Registro da sessão

| # | Categoria | Item | Resultado | Evidência (console/print) | Responsável |
|---|---|---|---|---|---|
| 1 |  |  | ✅ / ❌ |  |  |

Ao fim da sessão, fechar com três números: **quantos itens aprovados**, **quantos reprovados** e
**quantos bloqueiam jogar em grupo hoje**. Esses últimos viram a fila da próxima sessão de trabalho.
