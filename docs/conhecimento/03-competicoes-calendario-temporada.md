# Competições, calendário e temporada

Esta seção explica como o mundo do RetroFoot98 está organizado: que países e divisões existem, quem sobe e quem desce, como funcionam as copas, como o calendário distribui os jogos ao longo do ano, quanto dinheiro cada competição paga e o que acontece na virada de uma temporada para a outra.

Tudo aqui foi tirado do código do jogo. Quando algo não pôde ser confirmado, o texto diz isso.

---

## Nomes que o jogador vê × nomes internos

O jogo não usa os nomes reais das competições. Um "pacote oficial" troca os nomes na tela. O suporte deve usar **os nomes do jogo** ao responder, mas o jogador pode escrever o nome real ("Libertadores", "Brasileirão"). A tabela abaixo liga os dois.

| O jogador vê | Equivale a (nome interno/real) |
|---|---|
| Liga Soberana (abreviada "Série A") | Série A / Brasileirão |
| Liga Acesso ("Série B") | Série B |
| Liga Impulso ("Série C") | Série C |
| Liga Raiz ("Série D") | Série D |
| Copa da Federação | Copa do Brasil |
| Liberta Cup | Copa Libertadores |
| Copa de Clubes da América ("Clubes da América") | Copa Sul-Americana |
| Copa dos Campeões | Champions League |
| Copa Continental | Europa League |

Ligas estrangeiras também foram renomeadas. Por exemplo: Crown League e Vanguard League (Inglaterra, 1ª e 2ª divisões), Liga Hispânica e Liga Segunda (Espanha), Lega Suprema e Lega Ascesa (Itália), Meisterliga e Zweite Liga (Alemanha), Liga Lusitana e Liga Navegação (Portugal), Liga Albiceleste (Argentina), Liga Charrúa (Uruguai), Liga Cafetera (Colômbia), Liga Andina (Chile), Liga Inca (Peru), Liga Equinocial (Equador), Liga Guaraní (Paraguai), Liga Llanera (Venezuela) e Liga Altiplano (Bolívia).

Os nomes vêm do painel de administração e podem mudar sem atualizar o jogo. No restante deste documento aparece o nome do jogo seguido do nome real entre parênteses quando isso ajuda.

Referência técnica: `public/src/data/pacote-oficial.js` (snapshot dos nomes), `public/src/data/competicoes.js` (`COMPETICOES`, `COMP_CHAVE_DIVISAO`).

---

## Países e universos disponíveis

O motor tem **15 países** ("universos"), e cada um tem pirâmide, clubes e elencos:

- **Brasil**: quatro divisões (A, B, C e D).
- **Europa** (duas divisões cada): Inglaterra, Espanha, Itália, Alemanha e Portugal.
- **América do Sul** (uma divisão cada, sem acesso nem rebaixamento): Argentina, Uruguai, Colômbia, Chile, Peru, Equador, Paraguai, Venezuela e Bolívia.

**Na versão pública atual só o Brasil é jogável.** Há três travas separadas:

1. **Só o Brasil se joga**: o jogador só pode escolher um clube brasileiro para treinar.
2. **O mercado é o mundo todo**: dá para comprar jogadores de qualquer país que tenha elenco no jogo e vender para eles, desde a 1ª temporada.
3. **O treinador não sai do país**: o treinador não recebe convite para treinar clube de outro país. A carreira fica dentro das quatro divisões brasileiras.

Os outros 14 países continuam rodando "de fundo" (veja *Ligas de fundo*). Os jogadores estrangeiros aparecem com nomes fictícios gerados pelo jogo, e não com os nomes reais.

**Futebol feminino.** Existe uma modalidade feminina, e ela está ligada: ao criar o save, o jogador escolhe a modalidade. O universo feminino do Brasil é um "gêmeo" do masculino: mesma pirâmide (A–D, 20 clubes cada), mesmo acesso e rebaixamento, mesmo calendário e os mesmos clubes (nome, escudo, cores e estádio). O que muda são as jogadoras, que têm nomes femininos próprios. Os adversários estrangeiros das copas continentais também jogam com elencos femininos. No código, o mundo feminino tem as mesmas três copas do masculino (Copa da Federação, Liberta Cup e Copa de Clubes da América). O texto da tela de criação, porém, cita só a Copa da Federação e a Liberta Cup. **Incerto:** não foi confirmado se a Copa de Clubes da América aparece de fato num save feminino.

Onde fica no jogo: na criação do save (onboarding), no passo em que se escolhe o país e onde se entra na pirâmide.

Referência técnica: `public/src/data/universos.js` (`UNIVERSOS`, `RF_SO_BRASIL`, `RF_MERCADO_MUNDIAL`, `RF_TREINADOR_SO_NO_PAIS`), `public/src/data/universos-fem.js` (`brasilFem`, `RF_MODALIDADES`), `public/src/engine/world-config-fem.js`.

---

## Divisões, número de clubes e acesso/rebaixamento

### Brasil (o país jogável)

| Divisão | Clubes | Rodadas | Sobem | Descem |
|---|---|---|---|---|
| Série A (Liga Soberana) | 20 | 38 | — | 4 (17º ao 20º) |
| Série B (Liga Acesso) | 20 | 38 | 4 (1º ao 4º) | 4 (17º ao 20º) |
| Série C (Liga Impulso) | 20 | 38 | 4 (1º ao 4º) | 4 (17º ao 20º) |
| Série D (Liga Raiz) | 20 | 38 | 4 (1º ao 4º) | — (não há queda) |

Ao todo são **80 clubes** na pirâmide brasileira. Todas as divisões jogam pontos corridos, com turno e returno: 38 rodadas, cada clube enfrenta cada adversário duas vezes (uma em casa e outra fora). A vitória vale 3 pontos e o empate, 1.

- **Não existe playoff de acesso.** Sobem os 4 primeiros, e só. A tela chegou a anunciar um "playoff do acesso", que foi removido porque o jogo nunca o disputava.
- **Na Série D ninguém cai**, porque não há divisão abaixo. Mesmo assim, na tela de fim de temporada quem termina no terço de baixo da Série D (do 15º ao 20º) recebe o desfecho "Rebaixado" como sinal de fracasso. **O clube continua na Série D.**
- As quatro divisões correm de verdade ao mesmo tempo, e a promoção e o rebaixamento acontecem em todas elas no fim do ano (não só na divisão do jogador).

### Outros países (rodam de fundo)

| País | Divisões (clubes) | Sobem da 2ª | Descem da 1ª |
|---|---|---|---|
| Inglaterra | 1ª (20) · 2ª (24) | 3 | 3 |
| Espanha | 1ª (20) · 2ª (18) | 3 | 3 |
| Itália | 1ª (20) · 2ª (18) | 3 | 3 |
| Alemanha | 1ª (18) · 2ª (18) | 3 | 3 |
| Portugal | 1ª (18) · 2ª (18) | 3 | 3 |
| Argentina | única (30) | — | — |
| Uruguai | única (16) | — | — |
| Colômbia | única (20) | — | — |
| Chile | única (16) | — | — |
| Peru | única (18) | — | — |
| Equador | única (16) | — | — |
| Paraguai | única (12) | — | — |
| Venezuela | única (14) | — | — |
| Bolívia | única (16) | — | — |

### Critérios de desempate da tabela

A classificação é ordenada, nesta ordem, por:

1. **Pontos**
2. **Saldo de gols**
3. **Gols marcados**
4. Se ainda houver empate, um critério técnico interno (o código do clube). Na prática é um desempate arbitrário, **não** é confronto direto nem sorteio.

**Não entram:** número de vitórias, confronto direto, cartões nem gols fora de casa. As mesmas regras valem para os grupos das copas continentais e para as ligas de fundo.

Onde fica no jogo: **Campeonatos → Classificação** (abre na liga do próprio clube, com filtros de país, liga e divisão).

Referência técnica: `UNIVERSOS` em `public/src/data/universos.js`; `sortTableRows`, `decidePromotionRelegation` e `computeDivisionSwap` em `public/src/engine/core.js`; `rfDesfecho` em `public/src/ui/rf26-competicao.js`.

---

## Ligas de fundo

Todo país que não é o do jogador roda como **liga de fundo**. Em cada rodada o jogo simula os resultados de forma leve, com base na força (overall) dos clubes e numa vantagem para o mandante. Esses resultados alimentam a tabela, o campeão, a artilharia (ligas de topo) e o histórico de cada país.

- No fim de cada temporada, cada liga de fundo registra o campeão da 1ª divisão e o artilheiro, aplica acesso e rebaixamento entre as suas divisões (quando tem mais de uma) e zera a tabela.
- A classificação real das ligas de fundo sul-americanas é o que decide quais clubes estrangeiros entram nas copas continentais (veja *Liberta Cup e Copa de Clubes da América*).
- Os clubes dessas ligas aparecem no mercado de transferências e podem fazer propostas pelos jogadores do usuário.

Onde fica no jogo: **Campeonatos → Ligas internacionais** (a aba só aparece quando há liga de fundo carregada) e **Campeonatos → Classificação**, pelo filtro de país.

Referência técnica: `bgLeagueCountries`, `initBgLeagues`, `advanceBgLeagues`, `bgQuickSim` e `rollBgLeaguesSeason` em `core.js`.

---

## Copa da Federação (Copa do Brasil)

**Quem disputa:** os **80 clubes** das quatro divisões (A, B, C e D), qualquer que seja a divisão do usuário. Todos os anos, todos entram.

**Formato:** mata-mata do começo ao fim, sem fase de grupos.

- **Jogo único**, não há ida e volta. O primeiro clube do confronto é o mandante e fica com a bilheteria.
- **Não existe regra do gol fora**, porque não há dois jogos.
- **Empate no tempo normal vai para a prorrogação.** Se continuar empatado, vai para os **pênaltis**: 5 cobranças para cada lado e, persistindo o empate, cobranças alternadas (morte súbita). Não há sorteio de cara ou coroa.

**Chaveamento com 80 clubes (7 fases):**

| Fase | Quem joga |
|---|---|
| 1ª fase | 32 clubes (16 jogos). Os outros **48 ficam isentos** |
| 2ª fase | Os 16 vencedores + os 48 isentos = 64 clubes (32 jogos) |
| 16 avos de final | 32 clubes |
| Oitavas de final | 16 |
| Quartas de final | 8 |
| Semifinal | 4 |
| Final | 2 |

**Quem fica isento da 1ª fase:** os 24 clubes mais fortes (por overall) passam direto sempre. Outros 24 isentos são sorteados entre os clubes seguintes da lista de força. Por isso os grandes quase nunca jogam a 1ª fase, mas os clubes no limite do corte às vezes escapam e às vezes não, conforme o ano.

**Sorteio das fases seguintes:** o jogo não monta uma chave fixa desde o início. A cada fase ele remonta os confrontos: os classificados são ordenados por força e pareados em sequência. Por isso a chave mostrada na tela é reconstruída fase a fase.

**Dinheiro:** veja *Premiações*. A Copa da Federação paga **durante a temporada**, fase a fase, a **quem joga a fase**, ganhando ou perdendo.

**Vaga continental:** o **campeão** da Copa da Federação ganha vaga na Liberta Cup do ano seguinte, mesmo que seja da Série B, C ou D. O vice **não** ganha vaga.

Referência técnica: `copaBrasilQualification`, `makeBracket`, `advanceCupBracket` e `cupPhaseLabel` em `core.js`; `resolveDrawnKnockoutTie` em `public/src/engine/simulate.js`.

---

## Liberta Cup e Copa de Clubes da América (Libertadores e Sul-Americana)

### Formato (as duas iguais)

1. **Fase de grupos:** grupos de 4, turno e returno dentro do grupo (6 rodadas). Os **2 primeiros de cada grupo** avançam. Os critérios de desempate são os mesmos da liga: pontos, saldo, gols marcados.
2. **Sorteio do mata-mata:** entre o fim dos grupos e as oitavas há uma "semana de sorteio", sem jogo.
3. **Mata-mata:** com 8 grupos, 16 clubes → oitavas, quartas, semifinal e final.
   - **Jogo único** em todas as fases, inclusive na final. Não há ida e volta nem gol fora.
   - Empate: **prorrogação** e depois **pênaltis**, como na Copa da Federação.
   - Na primeira fase do mata-mata os confrontos são sorteados. Nas seguintes, os classificados são ordenados por força e pareados.

Com 32 clubes, cada copa tem 11 "datas": 6 de grupo, 1 de sorteio e 4 de mata-mata.

### Quem se classifica: 1ª temporada (2026)

Na primeira temporada do save valem os **grupos reais** do sorteio de 2026 (8 grupos, A a H, com 32 clubes em cada copa). Os clubes brasileiros que estão nessas listas são os que se classificaram na vida real. Se o clube do usuário não está nos grupos reais, ele não joga a copa continental em 2026, mesmo sendo da Série A.

### Quem se classifica: da 2ª temporada em diante

A classificação passa a sair **do que aconteceu no jogo**, com base na tabela final da 1ª divisão de cada país. As vagas por país são estas:

| País | Liberta Cup | Copa de Clubes da América |
|---|---|---|
| Brasil | 6 | 6 |
| Argentina | 6 | 5 |
| Colômbia | 4 | 4 |
| Chile | 3 | 3 |
| Uruguai | 3 | 3 |
| Peru | 3 | 3 |
| Equador | 2 | 2 |
| Paraguai | 2 | 2 |
| Venezuela | 2 | 2 |
| Bolívia | 1 | 2 |

São 32 clubes em cada copa, divididos em grupos de 4 por sorteio.

**Regras do Brasil (pela Série A da temporada que acabou):**

- **1º ao 6º** → Liberta Cup.
- **7º ao 12º** → Copa de Clubes da América.
- **Entram na frente, "furando a fila" das 6 vagas da Liberta Cup:**
  - o campeão da Liberta Cup (defende o título), desde que esteja na Série A;
  - o campeão da Copa de Clubes da América, que **sobe** para a Liberta Cup (de qualquer país);
  - o **campeão da Copa da Federação** (de qualquer divisão).

  Quando um deles ocupa vaga, a tabela preenche o resto e a Copa de Clubes da América fica com os melhores colocados que sobraram.
- Um campeão continental de outro país tem a vaga garantida, mesmo que a cota do país dele não o incluísse.
- Nenhum clube joga as duas copas: quem está na Liberta Cup sai da Copa de Clubes da América. Se o total não fechar em múltiplo de 4, o jogo completa com os primeiros clubes que ficaram de fora das cotas de cada país (ou corta o excesso), para não haver grupo de 3.

**Quem subiu de divisão NÃO herda vaga pela posição.** Um clube que acabou de subir da Série B não disputou a Série A, então a posição dele na B não conta como classificação continental. Ele só joga uma continental no ano de estreia na A se já tinha vaga por outro caminho (por exemplo, sendo campeão da Copa da Federação).

**As continentais existem no mundo mesmo que o usuário esteja na Série B, C ou D.** Elas são disputadas pelos classificados da Série A (clubes da CPU ou humanos). O usuário só joga se estiver classificado.

**Adversários estrangeiros** saem das ligas de fundo sul-americanas. Quando o clube real existe no banco de elencos, entra com o elenco dele (com os nomes fictícios do jogo). Caso contrário, o jogo gera um elenco.

### Países europeus

Os universos europeus (hoje não jogáveis) usam a Copa dos Campeões e a Copa Continental no mesmo formato. Com as vagas por liga da Europa, o clube do usuário do 1º ao 4º vai para a Copa dos Campeões e o 5º e o 6º para a Copa Continental. Hoje isso só aparece como informação, porque ninguém treina clube europeu.

Onde fica no jogo: **Campeonatos → Minhas competições** (cartão de cada copa com o botão Abrir) e a tela da competição (visão geral, grupos e chave).

Referência técnica: `initSeasonCups`, `makeGroupStage`, `splitIntoGroups`, `groupStageAdvancers`, `unifiedContinentalQualification`, `nationalCupFinalists`, `LIB_SLOTS_UNI`/`SUL_SLOTS_UNI`, `LIBERTADORES_GROUPS_2026`/`SULAMERICANA_GROUPS_2026` e `advancePendingCups` em `core.js`; `CONFEDERACOES` em `public/src/engine/world-config.js`.

---

## Estaduais e outras competições

**Não há campeonatos estaduais** no jogo, nem supercopa, Recopa ou Mundial de Clubes. As competições que existem para quem joga no Brasil são a liga (Séries A–D), a Copa da Federação, a Liberta Cup e a Copa de Clubes da América. O calendário já foi desenhado para receber uma competição mundial no futuro, mas ela não existe hoje.

**Ligar e desligar copas:** o código guarda um "interruptor" por copa, e uma copa desligada não é criada. Esse interruptor existia na tela antiga de criação de save. **Incerto:** na criação de save atual não foi encontrado nenhum controle para ele, então hoje as três copas devem vir sempre ligadas.

---

## Calendário: semanas, janelas e datas

### Como o ano é dividido

O calendário é contado em **semanas** (no código, "slots"). Cada semana tem **três momentos** ("janelas"), nesta ordem:

1. **Meio de semana 1** (terça/quarta)
2. **Meio de semana 2** (quinta)
3. **Fim de semana**

A regra geral:

- **A liga joga sempre no fim de semana.**
- **As copas jogam no meio da semana.** A Liberta Cup usa o Meio de semana 1. A Copa de Clubes da América e a Copa da Federação dividem o Meio de semana 2, mas **nunca na mesma semana**.
- **Nunca há duas competições no mesmo momento.** O jogador nunca tem dois jogos no mesmo dia.
- **Cada final tem uma semana só dela, sem rodada de liga**, e todas as finais acontecem **antes da última rodada do campeonato**. A última rodada da liga é o último jogo do ano.

### Calendário do Brasil (42 semanas)

A temporada começa em **1º de março** e tem **42 semanas**.

| Competição | Semanas usadas |
|---|---|
| Liga (38 rodadas) | 1 a 20, 22 a 38, e **42** (a última rodada) |
| Liberta Cup | 5, 8, 11, 14, 17, 20 (grupos) · 24 (sorteio) · 28, 32, 36 (oitavas, quartas, semi) · **39 (final)** |
| Copa de Clubes da América | 6, 9, 12, 15, 18, 21 (grupos) · 25 (sorteio) · 29, 33, 37 (oitavas, quartas, semi) · **40 (final)** |
| Copa da Federação | 4, 10, 16, 23, 30, 35 · **41 (final)** |

Portanto:

- A **semana 21** não tem liga: é a parada do meio do ano. Só a Copa de Clubes da América joga nela.
- As **semanas 39, 40 e 41** são as das finais (Liberta Cup, Copa de Clubes da América e Copa da Federação, nessa ordem), sem jogo de liga.
- A **semana 42** é a 38ª e última rodada da liga, que fecha a temporada.

A distribuição de semanas acima vale quando cada continental tem 32 clubes (11 datas). A folha do calendário reserva 12 semanas para cada continental e, quando uma copa precisa de menos datas, ela usa as **últimas** semanas reservadas, para a final continuar no lugar certo. Se um formato precisar de mais datas, a copa ganha semanas **antes** da estreia.

### Datas mostradas na tela

As datas são **rótulos**: a ordem dos jogos é decidida pela semana, não pela data. As rodadas de liga seguem uma lista de datas reais (01/03, 07/03, 30/03, 10/04, e assim por diante). Os jogos de meio de semana aparecem 4 dias (Meio de semana 1) ou 3 dias (Meio de semana 2) antes do jogo de liga daquela semana. Em semanas sem liga, a data avança 7 dias por semana a partir da última rodada de liga. Datas aproximadas das decisões: final da Liberta Cup por volta de **04/12**, final da Copa de Clubes da América por volta de **12/12**, final da Copa da Federação por volta de **19/12** e última rodada da liga em **29/12**. Uma data exibida nunca "volta para trás" em relação ao jogo anterior.

### Sorteios

Cada copa tem uma cerimônia de sorteio **dois dias antes da estreia**, e cada sorteio aparece na data dele (o save não abre com vários sorteios seguidos). O sorteio do mata-mata das continentais acontece na "semana de sorteio", depois da fase de grupos.

### A temporada espera as finais

Se, por algum problema de dados, uma copa ainda tiver jogos pendentes quando a liga termina, a temporada **é estendida automaticamente**: o jogo cria semanas extras só com jogos de copa e mostra a notícia "A temporada foi estendida: ainda falta decidir…". No Modo Solo o limite é de **24 semanas extras**. Passado esse limite, a temporada fecha mesmo assim e aparece o aviso "A temporada terminou com competição por decidir". Em funcionamento normal isso não deveria acontecer, porque o calendário já foi montado para caber.

### Janelas de transferência (ligadas ao calendário)

Existem **duas janelas por temporada**: da rodada 0 à 9 e da rodada 20 à 29, contando pela rodada interna do calendário, que começa em 0. Fora delas não há transferências. Também é nas janelas que a base pode subir jogadores: no máximo **1 por janela** (2 por temporada), com elenco de até 40 jogadores.

### Outros países

A Inglaterra tem uma folha própria de 50 semanas (a 2ª divisão tem 24 clubes e 46 rodadas), com as finais nas semanas 47 e 48 e a última rodada na 50. Divisões com menos rodadas do que a folha prevê ficam com os jogos espalhados pelas semanas e também terminam na última. Países sem folha própria usam a do Brasil. O calendário é mundial: todo país começa em 1º de março, e a "semana 40" é a mesma para todos.

Onde fica no jogo: **Campeonatos → Calendário**. Mostra a temporada inteira do clube, liga e copas. Os chips no topo filtram por competição.

Referência técnica: `public/src/engine/calendars.js` (`CALENDARIOS.brasil`, `JANELAS`, `validarCalendario`); `public/src/engine/world-rules.js` (`buildDayPlan`, `slotsDaCompeticao`, `slotsDaLiga`, `dataDoDia`, `cupDrawDay`, `prorrogarPorCopasPendentes`); `prorrogarSeFaltaCopa` e `TRANSFER_WINDOWS` em `core.js`.

---

## Premiações em dinheiro

Os valores são **modestos de propósito**, calibrados à economia do jogo e não aos valores reais: um título rende mais ou menos uma boa contratação. A ordem de importância segue a vida real (continental > copa nacional > liga), com uma exceção registrada no código: o **título da Copa da Federação paga mais que o título da Série A** (36,4 mi contra 26 mi). Isso é intencional ou, pelo menos, conhecido. Os valores abaixo já incluem o reajuste de 1,3× aplicado em setembro de 2026.

### Liga: prêmio pela posição final (pago no fim da temporada)

Todo clube recebe alguma coisa. Com 20 clubes, as faixas são: 1º, 2º, 3º–4º, 5º–7º, 8º–14º e 15º–20º.

| Divisão | Campeão | Vice | 3º–4º | 5º–7º | 8º–14º | 15º–20º |
|---|---|---|---|---|---|---|
| Série A | R$ 26 mi | 18,2 mi | 13 mi | 7,8 mi | 4,55 mi | 2,6 mi |
| Série B | 11,7 mi | 7,8 mi | 5,2 mi | 3,25 mi | 1,95 mi | 1,17 mi |
| Série C | 5,2 mi | 3,51 mi | 2,34 mi | 1,43 mi | 910 mil | 520 mil |
| Série D | 2,6 mi | 1,69 mi | 1,17 mi | 715 mil | 455 mil | 260 mil |

(As ligas estrangeiras usam a tabela da Série A para a 1ª divisão e a da Série B para a 2ª.)

### Bônus de acesso (pago uma vez, no fim da temporada em que o clube sobe)

| Sobe para | Bônus |
|---|---|
| Série A | R$ 4 mi |
| Série B | R$ 2 mi |
| Série C | R$ 750 mil |

Quem cai ou continua na mesma divisão não recebe esse bônus.

### Copa da Federação: cota por fase, paga na hora

A cota é paga **no momento em que o confronto é decidido**, aos **dois clubes** que disputaram a fase, ganhando ou perdendo. Na final, campeão e vice recebem valores diferentes. Isso vale para todos os clubes, não só para o do usuário. Nas fases **antes das oitavas**, clubes das Séries A e B recebem **1,6×** o valor dos clubes das Séries C e D (como na Copa do Brasil real).

| Fase disputada | Séries C/D | Séries A/B |
|---|---|---|
| 1ª fase | R$ 520 mil | R$ 832 mil |
| 2ª fase | 1,04 mi | 1,664 mi |
| 16 avos | 1,95 mi | 3,12 mi |
| Oitavas | 2,6 mi | 2,6 mi |
| Quartas | 5,2 mi | 5,2 mi |
| Semifinal | 11,7 mi | 11,7 mi |
| Final: campeão | 36,4 mi | 36,4 mi |
| Final: vice | 18,2 mi | 18,2 mi |

Cada cota aparece no extrato de Finanças ("Copa da Federação — [fase]") e nas notícias da rodada. Clube isento na 1ª fase não recebe a cota dela, porque não a disputou. A Copa da Federação **não paga nada de novo no fim da temporada**: a cota por fase substitui essa premiação.

### Copas continentais: pela fase alcançada, paga quando a copa termina

O valor corresponde à **fase mais longe que o clube alcançou** e é pago **assim que a copa tem campeão**, sem esperar o fim da temporada. Quem cai na fase de grupos recebe a cota de participação.

| Fase alcançada | Liberta Cup | Copa de Clubes da América | Copa dos Campeões | Copa Continental |
|---|---|---|---|---|
| Campeão | R$ 31,2 mi | 15,6 mi | 28,6 mi | 15,6 mi |
| Vice | 15,6 mi | 7,8 mi | 16,9 mi | 9,1 mi |
| Semifinal | 9,1 mi | 4,55 mi | 10,4 mi | 5,2 mi |
| Quartas | 6,5 mi | 3,25 mi | 6,5 mi | 3,25 mi |
| Oitavas | 3,9 mi | 1,95 mi | 3,9 mi | 1,95 mi |
| Participação (grupos) | 1,95 mi | 910 mil | 2,6 mi | 1,3 mi |

### Artilheiro

Quem termina em 1º na lista de artilharia da temporada ganha:

- **valorização de +20%** no valor de mercado, que é permanente e acumula até o teto de +60% (1,6×), vale para qualquer clube e fica registrada na carreira do jogador;
- **dinheiro para o clube, só se o artilheiro for do clube do usuário**: Série A R$ 3,9 mi, Série B 1,95 mi, Série C 910 mil, Série D 520 mil.

A lista de artilharia da temporada soma os gols da liga da divisão do usuário e os gols de todas as copas.

### Bilheteria de copa

Nos jogos de copa, o **mandante** fica com a bilheteria, calculada como na liga (público × preço do ingresso). O preço do ingresso é fixo por divisão: Série A R$ 25, Série B R$ 20, Série C R$ 15 e Série D R$ 10.

### Metas de patrocínio

No fim da temporada, o patrocínio paga bônus quando o clube cumpre metas: terminar entre os 4 primeiros; chegar às quartas de uma copa; e terminar entre os 6 primeiros (na 1ª divisão) ou subir de divisão (nas demais). O detalhe fica na seção de finanças.

### Quando e onde o jogador vê o dinheiro

- Cotas da Copa da Federação, bilheterias e continentais: ao longo do ano, no extrato de **Finanças** e nas notícias.
- Liga, acesso, artilheiro e metas de patrocínio: **no fim da temporada**, detalhados na tela/modal de fim de temporada.
- O dinheiro nunca é pago duas vezes. Uma continental já paga quando terminou não se repete no fechamento.

Referência técnica: `public/src/data/prizes.js` (`LEAGUE`, `ACCESS`, `CUP`, `CB_PHASE`, `CB_TIER_INICIAL`, `ART_CASH`, `TICKET`); `awardCupPhasePrize`, `pagarCopasContinentais`, `creditarBilheteriaCopa`, `awardSeasonPrizes` e `patroMetas` em `core.js`.

---

## Fim de temporada e virada

### Quando a temporada acaba

A temporada acaba **depois da última rodada da liga** (a 38ª, na semana 42), já com todas as finais de copa disputadas antes dela. Nesse momento o jogo fecha o ano (tabelas finais, prêmios, históricos) e mostra a tela de **Fim de Temporada**. A temporada seguinte só começa quando o jogador clica para avançar.

- **Não dá para virar uma temporada sem jogar.** Se a temporada nova ainda não teve nenhum jogo, o botão responde "A temporada X já começou. Jogue as rodadas para avançar." Essa trava foi criada depois de um caso de "virada fantasma", em que cliques repetidos fizeram um save pular anos sem jogar, envelhecendo e aposentando jogadores.
- Um clique por vez: enquanto a virada está sendo processada, novos cliques são ignorados.
- **Plano gratuito (Peladeiro):** antes da virada, quem não é Pro passa pela tela de planos (paywall). A regra do plano gratuito é explicada na seção de planos.

### A tela de Fim de Temporada

A tela mostra um de cinco desfechos: **Título**, **Acesso**, **Meio de tabela**, **Rebaixado** ou **Demitido**. Mostra também os números da temporada, "o que muda agora" e um resumo detalhado com a premiação linha a linha. Quem ganha um título vê também o modal de campeão com a taça da competição.

### O que acontece na virada, em ordem

1. **Finanças dos clubes da CPU:** cada clube da CPU recebe o bônus por desempenho (vitórias e empates) e o prêmio da posição final. Os estádios da CPU podem crescer.
2. **Classificação continental:** a tabela final da Série A é guardada para decidir as vagas (veja acima).
3. **Acesso e rebaixamento nas quatro divisões**, pelas tabelas finais. Se o clube do usuário mudou de divisão, ele passa a jogar com os novos adversários. O treinador fica no mesmo clube: o clube desce ou sobe com ele.
4. **Tabelas e artilharia zeradas.** A temporada avança um número (2026 → 2027), o calendário é refeito e o dia volta para o início.
5. **Estado dos jogadores reiniciado:** moral volta a 70, energia a 100, suspensões e lesões são limpas e as estatísticas da temporada são zeradas. Antes disso, jogos, gols, assistências, cartões e lesões vão para o histórico de carreira de cada jogador.
6. **Envelhecimento e aposentadoria** (veja abaixo).
7. **Salário do treinador +5%**, se ele não foi demitido durante o ano.
8. **Ajuste automático de salários** dos jogadores, só se a opção "Gestão de Salários" estiver ligada no perfil do treinador. Nesse caso, quem ganha visivelmente abaixo do valor justo tem o salário reajustado.
9. **Copas da temporada nova montadas** (Copa da Federação com as 80 equipes; continentais com os classificados). Os sorteios aparecem nas datas deles.
10. **Ligas de fundo viradas** (campeão, histórico, acesso e rebaixamento).
11. **Save gravado.** No Modo Solo, uma "foto" do fim de temporada também é enviada para a nuvem antes da virada.

### Contratos

**Não há contratos que vencem no fim da temporada.** O código não tem data de término de contrato de jogador. O jogador fica até ser vendido ou se aposentar. O salário só muda por renovação manual ou pela Gestão de Salários automática. Jogadores comprados durante a temporada ficam sem poder ser revendidos até a virada (trava de revenda), que expira sozinha na temporada nova.

### Aposentadoria

A cada virada, todos os jogadores ficam **1 ano mais velhos**, e a partir dos 32 anos há uma chance de aposentadoria:

| Idade | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40+ |
|---|---|---|---|---|---|---|---|---|---|
| Chance | 11% | 24% | 40% | 56% | 71% | 83% | 92% | 97% | 100% |

- No máximo **3 aposentadorias por clube por temporada**. Se mais jogadores "passarem" no sorteio, saem os mais velhos.
- Cada aposentado é substituído na hora por um **jovem de 18 a 22 anos** da mesma posição, gerado com força compatível com a divisão, para o elenco não ficar desfalcado.
- A aposentadoria vem com um motivo ("a idade pesou", "virou comentarista", "parou por lesões", "foi cuidar dos negócios", "aposentou milionário"). Os motivos aparecem na notícia e na Sala de Imprensa.
- A previsão é exata: o jogo consegue mostrar antes quem vai se aposentar na próxima virada, desde que o elenco não mude até lá.

### Jovens e regens

- Os **substitutos de aposentados** (18 a 22 anos) são os "regens" do jogo.
- A **base** (aba Elenco → Base) sobe até 1 jovem por janela de transferência, escolhido entre 3 candidatos.

### O que acontece com o save

- O save continua o mesmo: a carreira só avança um ano. Históricos, títulos, artilharia de todos os tempos e finanças por temporada ficam guardados para sempre.
- Cada temporada fechada vira uma entrada de **arquivo permanente**, com as tabelas finais, os 25 maiores artilheiros, os campeões de cada copa e o artilheiro de cada competição.

Referência técnica: `endSeason`, `archiveSeason`, `newSeasonReset`, `applySeasonAgingAndRetirement`, `RETIRE_CHANCE_BY_AGE`, `MAX_RETIREMENTS_PER_CLUB_SEASON`, `retirementReplacement` e `applyCpuSeasonFinances` em `core.js`; `clAdvanceSeason` em `public/src/ui/main.js`; `autoManageSalaries` em `public/index.html`; `rfFimTemporadaHTML` em `rf26-competicao.js`.

---

## Modo Resenha (multijogador): o que muda

O Modo Resenha aparece hoje como "Em breve" na tela inicial, mas as regras já estão no código.

- **Quem decide os resultados entre clubes da CPU é sempre o servidor**, nunca o aparelho de um jogador. Assim, todos na sala veem o mesmo placar e a mesma tabela. Jogos de humanos entram com o resultado que o próprio humano jogou.
- **A virada de temporada é feita pelo servidor.** Cada humano vê na tela de fim de temporada o resumo do **próprio** clube (posição, prêmios, acesso) e recebe os prêmios no próprio caixa.
- As regras de calendário, formato, vagas, acesso, rebaixamento, aposentadoria (incluindo o limite de 3 por clube) e cotas da Copa da Federação são **as mesmas do Modo Solo**: vêm do mesmo arquivo de regras, usado pelo aparelho e pelo servidor.
- O calendário é da sala: o dia só avança quando todos cumprem o seu jogo.

---

## Artilharia, prêmios individuais, títulos e histórico

**Artilharia** (Campeonatos → Artilharia): mostra até 20 artilheiros, com gols e média de gols por jogo. Sem filtro, é a artilharia da temporada, somando liga e copas. Com o chip de uma competição, mostra só os gols daquela competição. A aba traz ainda os cartões "Seus marcadores" (gols do elenco do usuário) e "Defesas menos vazadas" (os 5 clubes que menos sofreram gols na liga). Não existe prêmio de garçom (assistências) nem de melhor goleiro. O jogo registra assistências, mas não paga prêmio por elas.

**Prêmio individual:** o único é o de **artilheiro** (valorização e dinheiro, veja *Premiações*). Não há "melhor jogador da temporada".

**Títulos e histórico:**

- **Campeonatos → História:** uma linha por temporada do clube na gestão do usuário (ano, divisão, posição, desfecho e resultado nas copas) e a estante "Títulos do clube".
- **Treinador → Sala de Troféus:** os títulos do treinador na carreira, com o clube e a decisão (placar da final, nas copas; campanha, nas ligas).
- Os títulos também alimentam o **ranking de treinadores** e a "força" da carreira do treinador. Os detalhes estão na seção de carreira e ranking.
- Cada jogador guarda o próprio histórico (títulos, temporadas na elite, melhor posição e uma linha por temporada com clube, jogos, gols e assistências).

---

## Telas de Campeonatos e de Competição

**Campeonatos** (menu principal; no celular aparece como "Tabela") tem estas abas:

- **Minhas competições:** um cartão por competição que o clube disputa, com o troféu, a posição ou fase atual e um selo. Ser eliminado aparece como ELIMINADO. As copas em que o clube **não entrou** ficam numa lista separada embaixo, sem o selo de eliminado.
- **Calendário:** a temporada inteira do clube, liga e copas, com datas. Os chips filtram por competição.
- **Classificação:** a tabela, que abre na liga do clube e tem filtros para ver outras divisões, outros países e as copas (grupos).
- **Artilharia:** veja acima.
- **História:** veja acima.
- **Ligas internacionais:** líder e vice de cada liga de fundo (só aparece se houver liga de fundo).

**Tela de uma competição** (aberta pelo botão Abrir do cartão): visão geral, fase de grupos (um cartão por grupo, com os 2 primeiros destacados), a **chave do mata-mata** (no celular, uma fase por vez) e "o seu caminho" na copa. Enquanto a cerimônia de sorteio não acontece, a tela não mostra os grupos nem a chave. Entre o fim dos grupos e o sorteio do mata-mata, quem se classificou aparece como "aguardando sorteio", e não como eliminado.

Referência técnica: `public/src/ui/rf26-campeonatos.js` (`rfCpMinhasHTML`, `rfCpCalendarioHTML`, `rfMdClassifHTML`, `rfCpArtilhariaHTML`, `rfCpHistoriaHTML`, `rfCpIntlHTML`); `public/src/ui/rf26-competicao.js` (`rfCompeticaoHTML`, `rfCopaGruposHTML`, `rfChaveVistaHTML`); `RF_PAGES` em `public/src/ui/rf26.js`.

---

## Perguntas frequentes

**Por que meu time não foi para a Liberta Cup (Libertadores)?**
Confira, nesta ordem:
1. **É a 1ª temporada (2026)?** Nela valem os grupos reais de 2026. Se o clube não se classificou na vida real, não joga, mesmo sendo da Série A.
2. **Terminou entre o 1º e o 6º da Série A?** Só a Série A dá vaga pela tabela. Do 7º ao 12º a vaga é na Copa de Clubes da América.
3. **Acabou de subir?** Quem subiu da Série B não disputou a A, então não tem vaga pela posição. A vaga pela liga só vem depois de uma temporada inteira na A.
4. **Alguém "furou a fila"?** O campeão da Liberta Cup, o campeão da Copa de Clubes da América e o campeão da Copa da Federação entram na frente. Por isso o 6º colocado pode ficar sem vaga na Liberta Cup e ir para a Copa de Clubes da América.
5. A vaga na Liberta Cup também vem por **título da Copa da Federação** (só o campeão; o vice não).

**Por que caí com X pontos?**
A queda é só pela **posição**: caem os 4 últimos (17º ao 20º) nas Séries A, B e C, não importa a pontuação. Em caso de empate em pontos, desempatam o saldo de gols e depois os gols marcados. **Confronto direto e número de vitórias não contam.** Na Série D ninguém cai.

**Meu time ficou em 5º e não subiu. Não tinha playoff?**
Não. Não existe playoff de acesso no jogo: sobem só os 4 primeiros.

**A tela disse "Rebaixado" mas estou na Série D. Vou cair?**
Não, porque não há divisão abaixo da D. Na tela de fim de temporada, quem termina no terço de baixo da Série D recebe o desfecho "Rebaixado" como indicação de temporada ruim, mas continua na Série D.

**Quando acaba a temporada?**
Depois da 38ª rodada da liga, que é o último jogo do ano (semana 42, por volta de 29/12). As finais das copas acontecem antes, nas semanas 39, 40 e 41. Depois o jogador vê a tela de Fim de Temporada e clica para começar a próxima.

**Por que ficou uma semana sem jogo de liga no meio do ano / no fim do ano?**
A semana 21 é a parada do meio do ano. As semanas 39 a 41 são reservadas para as três finais de copa, sem jogo de liga. É proposital, para que as finais não fiquem depois do fim da liga.

**A Copa da Federação / Liberta Cup tem jogo de ida e volta? Gol fora vale?**
Não. Todos os confrontos de mata-mata são em jogo único, com prorrogação e pênaltis em caso de empate. Não existe regra do gol fora.

**Por que meu time não jogou a 1ª fase da Copa da Federação?**
Dos 80 clubes, 48 ficam isentos da 1ª fase: os 24 mais fortes sempre, e outros 24 sorteados entre os seguintes. O clube do usuário continua na copa e estreia na 2ª fase.

**Recebi pouco (ou nada) pela Copa da Federação no fim da temporada.**
A Copa da Federação paga **durante a temporada**, fase a fase, e não no fechamento. O dinheiro aparece no extrato de Finanças como "Copa da Federação — [fase]" no momento de cada jogo.

**Ganhei a Copa da Federação e não apareceu o prêmio no resumo de fim de temporada.**
Pelo mesmo motivo: a cota do campeão (R$ 36,4 mi) foi paga na hora da final e está no extrato.

**Quando recebo o prêmio da Liberta Cup?**
Quando a copa termina, isto é, quando sai o campeão (semana 39), pela fase mais longe que o clube alcançou. Quem caiu nos grupos recebe a cota de participação.

**O artilheiro do meu time não trouxe dinheiro.**
O dinheiro de artilheiro só é pago se o **1º colocado da artilharia da temporada** for do clube do usuário. A valorização de +20% no passe vale para qualquer clube.

**Meus jogadores se aposentaram todos de uma vez!**
O limite normal é de 3 aposentadorias por clube por virada. Se o elenco envelheceu vários anos "de uma vez" ou houve mais de 3 aposentadorias, pode ser a antiga "virada fantasma" (temporadas puladas sem jogar), já corrigida. Nesse caso, encaminhe ao time técnico com o nome do save e as temporadas envolvidas.

**Vou perder meu jogador porque o contrato acabou?**
Não. Contratos não vencem no fim da temporada.

**Posso jogar com clube de outro país / ir treinar na Europa?**
Na versão atual, não. Só é possível treinar clube brasileiro, e o treinador não recebe convite de fora do país. Os outros países existem, rodam de fundo e fazem parte do mercado de jogadores.

**Existe campeonato estadual?**
Não. As competições são a liga (Séries A–D), a Copa da Federação, a Liberta Cup e a Copa de Clubes da América.

**A temporada foi "estendida". O que é isso?**
Quando alguma copa ainda tem jogo pendente depois do fim da liga, o jogo cria semanas extras só com esses jogos, em vez de pular a final. Isso não deveria acontecer em condições normais. Se acontecer sempre, avise o time técnico.
