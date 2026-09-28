# Motor de partida

Esta seção explica como o RetroFoot98 decide uma partida, do apito inicial ao final: de onde vem a força de cada time, o que a formação e a tática mudam, como gols, cartões, lesões e pênaltis são sorteados, o que o treinador pode fazer durante o jogo ao vivo e o que muda entre o Modo Solo e o Modo Resenha.

Os números vêm do código do jogo. Quando um número foi **medido** (milhares de partidas simuladas com o motor real, em laboratório), isso está indicado. Porcentagens medidas valem para times sintéticos iguais e servem para dar noção de tamanho. Não são promessas para um jogo específico.

---

## Visão geral: como uma partida acontece

A partida é simulada **minuto a minuto** (90 minutos mais os acréscimos). Em cada minuto:

1. O jogo move um "ponteiro de posse/território" que vai de −1,15 (campo do mandante, pressão do visitante) a +1,15 (campo do visitante, pressão do mandante). Tecnicamente é um "passeio aleatório": o ponteiro guarda parte da posição anterior (82%), soma uma tendência e soma um sorteio.
2. A **tendência** depende da força dos dois times, do meio-campo, da tática e do mando de campo. O time mais forte empurra o ponteiro para o lado dele com mais frequência.
3. Quando o ponteiro passa de 0,58 para um dos lados, o time que ataca pode **finalizar**. Quanto mais fundo o ponteiro, maior a chance de sair o chute.
4. Cada finalização pode virar **gol**, **chance perdida** ou, raramente, **pênalti**.
5. Se não saiu finalização no minuto, o jogo sorteia um possível **cartão** e, se também não sair, uma possível **lesão**.
6. Depois de um gol, o ponteiro volta um pouco para o campo de quem sofreu (a "saída de bola").

Números de uma partida típica entre times iguais (medição em laboratório, 6.000 partidas):

- cerca de **2,1 gols por partida** no total;
- cerca de **4 finalizações perigosas** por partida, somando os dois times (é o que o motor conta como "chute");
- cerca de **1,8 cartões amarelos** e **0,16 vermelhos** por partida;
- cerca de **1 lesão a cada 4 a 5 partidas**;
- cerca de **1 pênalti a cada 10 partidas**, convertido em ~75% das vezes;
- cerca de **10–12% dos jogos terminam 0 × 0**.

**Referência técnica:** `public/src/engine/simulate.js` (`simulateMatch`, `tickMinute`, `matchMu`, constantes `ENG`/`ENG2`); `public/src/engine/match-engine.js` (`simMatchPure`, o mesmo motor sem dependências, usado também pelo servidor).

---

## A força do jogador

Cada jogador tem uma **Força** (o número exibido no elenco, de 1 a 99) e atributos individuais de 1 a 20 (finalização, passe, drible, desarme, visão, posicionamento, reflexos, defesa com as mãos etc.).

### De onde vem a Força

- A Força é a **média ponderada dos atributos** do perfil da posição, convertida pela curva da divisão. Cada posição dá mais peso a atributos diferentes. Atacante: finalização (22), drible (15), velocidade (13)… Meio-campo: passe (20), visão (16), posicionamento (11)… Zagueiro: desarme (22), posicionamento (16), cabeceio (14)… Goleiro: reflexos (34), mãos (30), posicionamento (14)…
- A curva da divisão coloca o jogador **regular** de cada divisão numa faixa: Série A 38–49, Série B 25–37, Série C 13–24, Série D 3–12. Os craques sobem para as faixas Estrela (50–69), Craque Nacional (70–89) e Craque Mundial (90–99). Craque Mundial é raríssimo: um a três por liga, e só nas primeiras divisões.

### A força que o motor usa não é a força exibida

Para o motor, a Força acima de 49 é **comprimida**. Assim um time recheado de craques não fica imbatível:

- **Jogador de linha:** até 49 vale igual. Acima disso, só 1/3 do excedente conta. Exemplos: Força 60 vale ~52,6 no motor; 70 vale ~55,9; 82 vale ~59,9; 90 vale ~62,5; 99 vale ~65,5.
- **Goleiro:** a compressão é mais leve, porque há só um em campo. Força 60 vale ~55,6; 70 vale ~61,5; 90 vale ~73,2; 99 vale ~78,5.

O craque continua sendo o melhor do elenco e dá vantagem real, mas moderada. A tela, o valor de mercado e o salário usam a Força cheia.

### Atributos que entram direto na partida

Além da Força, alguns atributos pesam no jogo. Pesa o atributo **relativo ao nível do próprio jogador**, então um "artilheiro nato" finaliza melhor que um colega genérico de mesma Força:

| Onde entra | Atributo | Efeito |
|---|---|---|
| Nota de ataque do time | Drible dos atacantes | ±10% por jogador (0,90 a 1,10) |
| Nota de meio-campo | Passe + Visão dos meias | ±4% (0,96 a 1,04) |
| Nota de defesa | Desarme + Posicionamento dos zagueiros | ±10% |
| Nota do goleiro | Reflexos + Mãos | ±15% (0,85 a 1,15) |
| Quem faz o gol | Finalização | peso de 0,82 a 1,28 no sorteio do artilheiro |
| Quem dá a assistência | Passe + Visão | peso de 0,80 a 1,30 |

**Referência técnica:** `public/index.html` (`POS_PROFILE`, `attrFactor`, `genAttrs`, `ratings`); `public/src/data/rebalance.js` (`BANDS`, `force`, `engForce`, `engForceGK`).

---

## A força do time (as três notas de setor)

O motor resume cada time em três notas, calculadas a partir de **quem está em campo**:

- **Ataque (OS):** média dos atacantes.
- **Meio-campo (MS):** média dos meias.
- **Defesa (DS):** 35% do goleiro + 65% da média dos zagueiros.

Cada jogador entra na média com: *Força do motor × fator de energia × fator de atributo*.

Detalhes importantes:

- As notas são **médias, não somas**. Colocar mais gente num setor não soma força; pode até baixar a média, se o jogador extra for mais fraco. Um 4-2-4 com o 4º atacante fraco tem ataque médio **menor** do que um 4-5-1 com só o craque na frente.
- Setor vazio (nenhum jogador daquela posição) vale 28, o que é muito baixo.
- Com essas notas, o motor calcula dois índices:
  - **Índice ofensivo** = 55% ataque + 45% meio-campo;
  - **Índice defensivo** = 72% defesa + 28% meio-campo.
- O **meio-campo pesa dos dois lados**: ajuda a atacar, ajuda a defender e ainda controla a posse. Por isso um meio forte decide muitos jogos.

**Referência técnica:** `public/index.html` (`ratings`); `public/src/engine/simulate.js` (`atkIndex`, `defIndex`, `sessionRatingsFromPlayers`); `public/src/engine/match-engine.js` (`computeRatings`).

---

## Energia (cansaço)

- Cada jogador tem **energia de 0 a 100%**, e ela multiplica a força dele no motor pelo fator **0,6 + 0,4 × energia**. Com 100% conta a força inteira; com 70% conta 88%; com 50% conta 80%; com 20% (o mínimo) conta 68%.
- **Peso medido:** um time inteiro com 70% de energia, jogando em casa contra um time igual descansado, vence só ~21% das vezes (com todos a 100% seriam ~42%) e perde ~53%. A energia pesa muito.
- **Gasto:** depois de cada rodada, quem entrou em campo perde de 12 a 22 pontos de energia, **proporcional aos minutos jogados**. Quem saiu no intervalo gasta metade. A energia nunca cai abaixo de 20% por esse gasto.
- **Recuperação:** a cada rodada, **todos** os jogadores recuperam de 6 a 16 pontos (até 100%).
- **Quem cansa:** no Modo Solo, só o elenco do usuário perde energia. Os times da CPU jogam sempre descansados. No Modo Resenha, o servidor aplica o cansaço só aos clubes dos treinadores humanos. Copa não tem regra própria: o cansaço é aplicado no fechamento da rodada de liga.
- **Onde fica no jogo:** a pílula de energia aparece debaixo de cada camisa no campo da Formação e na lista do elenco. O botão **"Selecionar descansados"** monta o onze pela energia, dentro da formação escolhida.

> Observação interna (27/09): a equipe investigou mudar a regra de energia (CPU também cansar, copa gastar energia) e decidiu **adiar**. A regra acima é a que está valendo.

**Referência técnica:** `public/src/engine/core.js` (`playRound`, `capsDrain`); `supabase/functions/resolve-round/index.ts` (passo 4, energia/moral).

---

## Moral

- Cada jogador tem **moral de 0 a 100**.
- **Moral do time abaixo de 50** (média de quem joga): as três notas de setor caem **15%**. Medido: com moral 45 um time igual em casa vence só ~16% (em vez de ~42%).
- **Moral do finalizador abaixo de 40:** a chance de converter a finalização cai **pela metade**.
- A moral também mexe um pouco na chance de gol de pênalti (±1,2 ponto percentual a cada 10 de moral acima ou abaixo de 70).
- **O que muda a moral depois do jogo** (vale para todo mundo que entrou em campo, mesmo por poucos minutos):
  - vitória **+8**, empate **+1**, derrota **−8**;
  - cada gol marcado: **+6** para o autor;
  - cartão vermelho: **−8** para o expulso; lesão: **−5** para o lesionado.
- **Promessas de contrato:** um "Jogador Chave" que não começa jogando perde **8** de moral; um "Titular Regular", **4**.
- **Volta ao normal:** toda rodada, a moral de todos anda 8% em direção a 70.
- A coletiva de imprensa também pode mexer na moral. Isso é tratado em outra seção.

**Referência técnica:** `public/index.html` (`ratings`, `teamMorale`); `public/src/engine/core.js` (`postMatchMorale`, `enforceRoles`, `applyMatchIncidents`, `playRound`).

---

## Lesões e suspensões (quem fica fora)

- **Jogador suspenso ou lesionado nunca entra em campo.** Se o treinador o deixou na escalação, o motor tira esse jogador e completa o time com o **reserva disponível de maior Força**, sem olhar a posição. Isso explica o caso "escalei fulano e ele não jogou".
- **Cartão vermelho** (direto ou por segundo amarelo): o jogador cumpre **1 partida de suspensão**.
- **Amarelos não acumulam suspensão.** O jogo conta os amarelos nas estatísticas, mas não há regra de "3 amarelos = suspenso".
- **Lesão:** 30% das lesões são **graves**, com 2 a 4 partidas fora. As outras 70% são **leves**: metade não tira o jogador de nenhuma partida (só o tira do jogo em que aconteceu), a outra metade tira de 1 partida.
- Suspensões e lesões diminuem uma partida por rodada cumprida.
- **Quem se machuca mais:** o comportamento do jogador pesa. Chance relativa de lesão: Discreto ×1,6; Casca-Grossa ×1,1; Brigão ×1,05; Encrenqueiro ×1,0; Exemplar ×0,85; Manso ×0,55.

**Referência técnica:** `public/src/engine/simulate.js` (`availableXI`); `public/src/engine/core.js` (`advancePlayerAvailability`, `applyMatchIncidents`).

---

## Mando de campo e torcida

- O mandante recebe um pequeno empurrão na tendência de posse, entre **0,007 e 0,016**. O valor cresce com o tamanho do estádio (de 8 mil a 75 mil lugares).
- No Modo Solo, o tamanho do estádio usado pelo motor é estimado pelo **porte do clube** (overall). Não ficou claro no código se a expansão de estádio feita pelo usuário entra nessa conta. O ramo que leria o estádio do usuário usa um campo antigo, marcado como aposentado. Considere **incerto**. No Modo Resenha, o motor usa sempre a estimativa pelo porte, para todos os clientes chegarem à mesma conta.
- **Peso medido** com times iguais: estádio médio (20 mil) = mandante vence ~42%, empata ~29%, perde ~28%. Estádio de 75 mil = mandante vence ~47%.
- **Público e preço do ingresso não mudam a força em campo.** Afetam só a bilheteria (finanças).

**Referência técnica:** `public/src/engine/simulate.js` (`homeAdvantage`); `public/src/engine/match-engine.js` (`homeAdvantageFromCap`, `capFromOverall`).

---

## Clássicos (mais imprevisibilidade)

Nos clássicos cadastrados, o sorteio de cada minuto fica **18% mais "nervoso"**, com mais variação. A força não muda. O jogo fica menos previsível e o azarão ganha mais vezes. A lista inclui, entre outros: Fla-Flu, Flamengo × Vasco, Flamengo × Botafogo, Fluminense × Vasco, Botafogo × Vasco, os clássicos paulistas entre Corinthians, Palmeiras, São Paulo e Santos, Gre-Nal, Atlético × Cruzeiro, Ba-Vi, além de clássicos europeus (Real × Barcelona, Milan × Inter, Benfica × Porto etc.).

O motor também aceita a marca de "partida decisiva", que aumentaria a variação em 12%. Pelo que se viu no código, **nenhuma tela liga essa marca hoje**, então na prática ela não atua.

**Referência técnica:** `public/src/engine/simulate.js` (`RIVALRIES`, `isDerby`).

---

## Formações disponíveis

São **seis formações**, sempre com 1 goleiro:

| Formação | Zagueiros–Meias–Atacantes | Tecla | Postura tática que ela liga |
|---|---|---|---|
| 3-3-4 | 3–3–4 | F1 | **Ofensivo** |
| 3-4-3 | 3–4–3 | F2 | Equilibrado |
| 4-2-4 | 4–2–4 | F3 | **Ofensivo** |
| 4-3-3 | 4–3–3 | F4 | Equilibrado |
| 4-4-2 | 4–4–2 | F5 | Equilibrado |
| 4-5-1 | 4–5–1 | F6 | **Retranca** |

Há também dois botões de atalho na mesma grade:

- **Auto (tecla A):** escalação automática. Pega o melhor goleiro, os 4 melhores zagueiros, os 3 melhores meias e os 3 melhores atacantes disponíveis (um 4-3-3 pela Força) e põe a postura **Equilibrado**.
- **11+ (Melhores):** mantém a formação já escolhida e troca os nomes pelos **mais fortes de cada posição**. Se nenhuma formação tinha sido escolhida, o jogo escolhe a que dá o onze mais forte possível. No empate, fica a mais parecida com o 4-4-2.

Se o elenco não tem jogadores suficientes numa posição (por exemplo, 4-5-1 sem 5 meias), o jogo **ajusta sozinho para a formação mais parecida** que o elenco comporta e avisa: "Sem jogadores pro X — ajustado pra Y".

**Onde fica no jogo:** página **Formação** (Hub do time), bloco de formações abaixo do campo. No celular fica na aba "Formação". Cada pastilha de formação mostra uma régua de três tarjas (Retranca / Equilibrado / Ofensivo) com a postura dela acesa.

**Para liberar o botão Jogar**, três coisas precisam estar certas: uma formação/tática escolhida, **11 jogadores** no onze e **exatamente 1 goleiro**. Se não houver goleiro, ou houver dois, a tela avisa.

### O que a formação faz no motor

A formação muda as notas pela **contagem real de jogadores por setor no onze**, tendo o 4-3-3 como referência neutra:

- cada **atacante a mais** que 3: ataque +4,5% e defesa −4,0%;
- cada **zagueiro a mais** que 4: defesa +1,0% e ataque −1,0%;
- cada **meia a mais** que 3: meio-campo +0,5%, mais um pequeno bônus de posse.

Resumo: a formação é uma **troca de estilo**, não um botão de vitória. Mais atacantes = jogo mais aberto, com mais gols dos dois lados. Mais zagueiros e meias = jogo mais fechado.

**Taxa de vitória medida com times iguais, os dois lados na postura equilibrada** (3.000 partidas cada): 4-5-1 39% · 4-4-2 38% · 3-4-3 37% · 4-3-3 34% · 3-3-4 33% · 4-2-4 32%. As formações ficam próximas entre si. As defensivas sofrem um pouco menos gol; as ofensivas marcam e sofrem mais.

**Referência técnica:** `public/src/ui/main.js` (`FORMATIONS`, `FKEY`, `tacticPosture`, `clSelFormation`, `pickXIByFormation`, `bestFormationForSquad`, `coherentFormation`); `public/src/ui/rf26.js` (`rfFormacoesHTML`, `TATICA_DESC`); `public/src/engine/simulate.js` (`formationEmphasis`).

---

## Táticas (Ofensivo, Equilibrado, Retranca)

**A tática não é uma escolha separada: ela sai da formação.** Formação com 4 atacantes = Ofensivo; com 1 atacante = Retranca; o resto = Equilibrado. O "Auto" sempre usa Equilibrado. A tática aparece no Modo Camarote como "Sua tática: 4-4-2 Equilibrado".

Efeito de cada postura no motor:

| Postura | Ataque | Defesa | Empurrão na posse | Descrição na tela |
|---|---|---|---|---|
| Ofensivo | ×1,04 | **×0,80** | +0,016 | "Ataca mais, mas abre mais chances pro rival" |
| Equilibrado | ×1,00 | ×1,00 | 0 | "Não pesa pra nenhum lado" |
| Retranca | ×0,93 | **×1,20** | −0,008 | "Segura mais atrás, cria menos chances" |

Essas multiplicações se somam ao efeito da formação. Um 3-3-4, por exemplo, ganha o ataque extra dos 4 atacantes **e** o custo defensivo do Ofensivo.

**Resultado medido com times iguais, os dois em 4-3-3** (3.000 partidas cada):

- Ofensivo × Equilibrado: 37% vitórias · 29% empates · 35% derrotas;
- Ofensivo × Retranca: 35% · 30% · 35%;
- Retranca × Equilibrado: 37% · 31% · 32%.

**Conclusão para o suporte:** nenhuma tática é "a melhor". O que decide é a qualidade do elenco. Na mesma medição, um time 20% mais forte vence **~72%** das vezes (19% empates, 9% derrotas).

> Histórico: até 21/08/2026 o Ofensivo não tinha custo defensivo e virou um "botão de vitória" (82% contra o Equilibrado). Daí vieram relatos antigos de que o 3-3-4 "só dava goleada". Isso foi corrigido e está em produção. Se alguém citar esse comportamento, é coisa da versão antiga.

**A CPU joga sempre no Equilibrado.** No Modo Resenha, o clube de outro treinador humano usa a tática que ele publicou. Se ele não confirmou a escalação a tempo, vale a tática da rodada anterior dele.

**Referência técnica:** `public/src/engine/simulate.js` (`TACTIC_BETA`, `TACTIC_EMPHASIS`, `tacticForClub`); `scripts/arena-motor.mjs` (laboratório que gera essas medições).

---

## Escalação automática × manual; quem a CPU escala

- **Escalação manual:** o treinador escolhe a formação e depois ajusta os nomes arrastando entre campo e banco (ou tocando no titular e depois no reserva). Não existe jogar fora de posição: cada jogador entra no setor da própria posição (Goleiro, Defesa, Meio, Ataque).
- **Selecionar descansados:** refaz o onze da formação atual escolhendo quem tem **mais energia** (e, no empate, mais Força). Só aparece depois que uma formação foi escolhida.
- **Clubes da CPU:** o motor escala os **11 jogadores disponíveis de maior Força**, sem montar formação específica e sempre no Equilibrado.
- **Modo Resenha, outro humano:** vale a última escalação publicada por ele. Se ele nunca publicou, entra a escalação automática.
- **Capitão e cobradores fixos:** **não existem** no jogo. Não há capitão nem batedor de pênalti pré-definido. O batedor é escolhido na hora do pênalti (veja abaixo).

**Referência técnica:** `public/src/engine/simulate.js` (`availableXI`); `public/index.html` (`autoXI`); `public/src/ui/main.js` (`clSelectRested`, `pickXIByFormationRested`).

---

## Como os gols são decididos

1. **Finaliza?** Quando o ponteiro de posse passa de 0,58 para o lado de um time, sai um chute com chance de até 28% por minuto. A chance cresce quanto mais perto do gol está o ponteiro.
2. **Pênalti?** 2,5% das finalizações viram pênalti (veja a seção de pênaltis).
3. **Quem chuta?** Sorteio entre **atacantes e meias** em campo, com peso Força × fator de finalização. Zagueiro e goleiro só finalizam se não houver atacante nem meia em campo.
4. **Vira gol?** A chance básica é 52%, ajustada pelo equilíbrio entre o índice ofensivo de quem ataca e o índice defensivo de quem defende, mais um bônus pela diferença entre os dois. Fica sempre entre **8% e 85%**. Se a moral do finalizador está abaixo de 40, a chance cai pela metade.
5. **Assistência:** 68% dos gols têm assistência (nunca em gol de pênalti; goleiro não dá assistência). O motor compartilhado reparte as assistências por setor, mirando meio-campo 47,5%, ataque 32,5% e defesa 20%. Dentro do setor, quem tem mais Força e passe/visão assiste mais.
6. **Finalização que não vira gol:** na narração e nas estatísticas vira **defesa do goleiro (46%)**, **na trave (10%)** ou **para fora (44%)**. Essa divisão é só de apresentação: o motor registra "chance perdida", e a narração decide o desfecho de forma fixa para aquele lance.

**Referência técnica:** `public/src/engine/simulate.js` (`tickMinute`, `shotConv`, `scorerFrom`, `assistFrom`); `public/src/engine/match-engine.js` (`ALVO` das assistências); `public/src/engine/commentary.js` (`chanceOutcome`).

---

## Cartões

- Em cada minuto sem finalização há **2,2% de chance** de falta com cartão. Quem comete a falta é sempre o time **sem** a posse. Isso dá, em média, ~1,8 amarelo e ~0,16 vermelho por partida.
- **Quem leva o cartão:** sorteio entre os jogadores de linha em campo (goleiro nunca). Jogadores mais fracos levam mais (peso = 110 − Força), multiplicado pelo comportamento: Casca-Grossa ×3,2; Brigão ×2,4; Encrenqueiro ×1,7; Discreto ×1,0; Manso ×0,75; Exemplar ×0,4.
- **Vermelho direto:** 3,5% dos cartões. **Segundo amarelo** na mesma partida = vermelho.
- **Time com menos jogadores:** com 10 em campo, as três notas caem para 90%; com 9, 78%; com 8 ou menos, 65%.
- Expulsão = 1 jogo de suspensão; o jogador perde 8 de moral e leva −1,4 na nota da partida.

**Referência técnica:** `public/src/engine/simulate.js` (`pickFoulPlayer`, `teamPenalty`); `public/index.html` (`BEHAVIOR_CARD_MULT`).

---

## Lesões durante a partida

- Em cada minuto sem finalização nem cartão há **0,26% de chance** de lesão: cerca de 1 lesão a cada 4–5 partidas.
- A lesão pode ser de qualquer um dos dois times (50% cada) e de qualquer jogador em campo, com peso pelo comportamento (Discreto se machuca mais, Manso menos).
- O lesionado **sai de campo na hora** e o time fica com um a menos até entrar alguém. Veja a partida ao vivo.
- Duração: veja a seção "Lesões e suspensões".

---

## Pênaltis durante a partida

- **Chance de conversão** (pênalti simulado pelo motor): base de 76%, somando:
  - Força do batedor: cada 10 pontos acima (ou abaixo) de 70 = +3,5 (ou −3,5) pontos percentuais;
  - posição: atacante +5, meia +2, zagueiro −2, goleiro −8 pontos percentuais;
  - goleiro adversário: cada 10 pontos de Força acima de 65 = −2,2 pontos percentuais;
  - moral do batedor: ±1,2 ponto percentual a cada 10 de moral em relação a 70.
  - Resultado sempre entre **42% e 93%**. Nunca é garantido.
- **Quando o batedor é escolhido por gente** (o treinador escolhe no modal da partida ao vivo, ou na disputa de pênaltis), a regra é mais generosa: piso de **72%**, teto de **95%**, e **escolher o canto dá +6 pontos percentuais**.
- **Quem bate, se ninguém escolhe:** na CPU, sorteio pela Força com preferência por atacante (×1,3) e meia (×1,1). No modal do treinador, já vem marcado o jogador **de maior Força em campo**, e se o tempo acabar (10 segundos) é ele quem bate.
- Só pode bater quem **está em campo** naquele momento: expulsos e substituídos não aparecem na lista.

**Referência técnica:** `public/src/engine/simulate.js` (`pickPenaltyTaker`, `penaltyConvChance`); `public/src/ui/main.js` (`openPenaltyModal`, `penaltyTakerPool`).

---

## Prorrogação e disputa de pênaltis (copas)

As copas em mata-mata do jogo são sempre de **jogo único**, sem ida e volta. Se o jogo empata nos 90 minutos:

### Quando o treinador joga a partida ao vivo

1. Aparece a tela **"Vamos para a prorrogação"**, com a energia dos 4 titulares mais cansados e as trocas restantes. O treinador pode fazer uma substituição antes de começar.
2. A prorrogação tem **30 minutos** (dois tempos de 15) mais 1 a 3 de acréscimo, jogados ao vivo na **mesma partida**: quem está em campo, os cartões e as substituições usadas continuam valendo.
3. Se continuar empatado, vem a **disputa de pênaltis ao vivo**: 5 cobranças alternadas por time e depois morte súbita. A disputa acaba assim que um lado não tem mais como alcançar o outro. O treinador escolhe cada batedor do seu time (10 segundos por cobrança; se não escolher, bate o pré-selecionado). Há o botão **"Simular o resto"**, que passa a bater automaticamente. O adversário escolhe pelo motor. Um jogador só bate de novo depois que todos os outros do time já bateram.

> **Divergência encontrada no código:** a tela da prorrogação diz que a prorrogação "libera uma troca extra" (4 no total). O código que executa a substituição, porém, continua bloqueando em **3** ("Máximo de 3 substituições."). Na prática a 4ª troca **não** funciona hoje. Se um usuário reclamar disso, a reclamação procede.

### Quando a partida é resolvida sem o treinador assistir (em segundo plano)

A prorrogação é resumida: cada time tem uma chance de marcar **1 gol** (entre 18% e 55%, conforme a vantagem de força). Persistindo o empate, a disputa usa as cobranças alternadas com a mesma fórmula de conversão. Esta conta usa uma semente própria, então o resultado é sempre o mesmo para aquele confronto.

**Referência técnica:** `public/src/engine/simulate.js` (`resolveDrawnKnockoutTie`, `liveMatchSession.beginExtraTime`); `public/src/ui/main.js` (`startExtraTime`, `startPenaltyShootout`, `shootoutDecided`, `shootoutEligibleTakers`); `public/src/ui/rf26-partida.js` (`rfProrrogacaoHTML`).

---

## A partida ao vivo (o que o treinador vê e pode fazer)

### A tela

- **Rodada ao vivo:** mostra todos os jogos da rodada ao mesmo tempo, em cartões por divisão ou competição. Cada linha tem público, mandante, placar, visitante e minuto, com os fatos (gol, cartão, lesão, substituição) como pastilhas. No topo, uma faixa mostra o período (1º tempo, 2º tempo, Acréscimos, Prorrogação, Pênaltis, "Seu jogo encerrado") e um relógio.
- **Modo Camarote** (visão padrão quando o usuário tem jogo): mostra só a partida do usuário, com placar de estádio, **barra de pressão** e três abas: *Panorama do Jogo*, *Comentários* (narração lance a lance) e *Estatísticas* (posse, finalizações, no alvo, defesas, cartões, substituições; ficha com árbitro, público, ingresso, tática e trocas usadas "x de 3"). Tem botão **Pausar/Jogar** no Solo. No Resenha não dá para pausar ("ritmo da sala"). O botão **Modo Camarote** no topo alterna entre as duas visões.
- **Narração:** todo texto sai de um evento real do motor (gol, chance, pênalti, cartão, lesão, substituição). Só a redação é sorteada, e de forma fixa por lance, para os dois lados de um confronto humano × humano lerem a mesma narração. Nada é inventado. Há uma "câmera lenta" (ritmo 3× mais lento por alguns segundos) na comemoração de gol do usuário.

### Velocidade (Opções → Tempo de jogo)

| Opção | Tempo por minuto de jogo | Quem pode usar |
|---|---|---|
| Longo | 820 ms (~1min15s de partida) | todos |
| Médio | 560 ms | todos |
| Curto | 360 ms (~33 s de partida) | todos |
| Ultrassônico | 110 ms (~10 s de partida) | plano pago (Pro) |
| Usain Bolt / Foguete | 37 ms / 6 ms | só ferramenta interna de teste, não aparecem para o usuário |

- O padrão é o **mais rápido que o plano permite**: Ultrassônico para o Pro, Curto para o plano grátis.
- O Modo Camarote só funciona até a velocidade Ultrassônica. Numa velocidade mais rápida (só nas de teste), o botão fica apagado e explica o motivo.
- **No Modo Resenha, quem manda no ritmo é o anfitrião da sala**, e vale para todos. Nas partidas humano × humano transmitidas existe um ritmo mínimo, para a transmissão acompanhar.

### Intervalo

- Aos 45 minutos toca o apito e, se a opção **"Substituições ao intervalo"** estiver em "Sim" (padrão), a partida **pausa** e abre o painel de substituição.
- **Solo:** espera o treinador clicar em continuar, sem limite de tempo.
- **Resenha:** o intervalo dura no máximo **20 segundos**, com contador na tela, e depois segue sozinho para manter a sala sincronizada.

### Substituições

- **Máximo de 3 por partida.** Em regra, as trocas voluntárias só são feitas **no intervalo** (e na tela antes da prorrogação). Durante o jogo corrido não há botão de substituir livre.
- Goleiro só troca por goleiro.
- Quem saiu não volta. Suspensos, lesionados e expulsos não aparecem no banco.
- A troca vale **no minuto seguinte**: o motor recalcula as notas do time com a Força e a energia de quem entrou.
- **Lesão de um jogador seu:** a partida pausa e abre um painel com 15 segundos para escolher quem entra. Já vem pré-selecionado um reserva da mesma posição. Se o tempo acabar, a troca acontece sozinha. Isso **gasta uma das 3 substituições**. Sem trocas restantes, o time segue com 10.
- **Expulsão de um jogador seu:** o time já está com 10 no motor. Abre um painel de 12 segundos para **reorganizar**: tirar alguém de campo e pôr um reserva, por exemplo para repor um goleiro expulso. Isso gasta uma substituição e o time **continua com 10**. O padrão, se não decidir, é "Seguir com 10".
- **Pênalti a favor:** abre o painel do batedor com 10 segundos (veja Pênaltis).

**Referência técnica:** `public/src/ui/rf26-live.js` (`rfLiveHTML`, `rfLvSobreposicaoHTML`, Camarote); `public/src/ui/main.js` (`liveTick`, `TEMPO_MS`, `tempoLiberado`, `startHalftimeCountdown`, `liveDoSub`, `openInjuryModal`, `openRedCardModal`); `public/src/ui/rf26-partida.js` (`rfSubHTML`); `public/src/engine/commentary.js`.

---

## Nota da partida (a nota de cada jogador)

Todo mundo que entrou em campo recebe nota, inclusive quem saiu no intervalo. A conta:

- base **6,0** + (Força − 65) × 0,045 + uma pequena variação aleatória;
- **coletivo**, proporcional aos minutos jogados: vitória +0,5, derrota −0,5; domínio do jogo (posse e chances) até ±0,6; jogo sem sofrer gol +0,6 para goleiro e zagueiros;
- **individual**, inteiro: cada gol +1,3; cada assistência +0,7; amarelo −0,15; vermelho −1,4; lesão −0,8;
- nota final sempre entre **3 e 10**.

O "jogo sem sofrer gol" entra na estatística do jogador só se ele jogou pelo menos metade da partida.

**Referência técnica:** `public/src/engine/match-engine.js` (`rateAppearances`, `domAdjust`).

---

## Evolução dos jogadores e treino

A evolução acontece **toda rodada, para todos os jogadores de todos os clubes**. O jogador não ganha Força diretamente: ganha **pontos de atributo**, e a Força é recalculada a partir deles. Por isso às vezes ele joga bem e a Força não muda, e às vezes ela "salta" 2 a 4 pontos de uma vez, por causa da curva da divisão.

- **Forma** = média das notas das últimas 3 partidas.
- **Potencial de crescimento pela idade:** até 20 anos 1,0; 21–23 0,7; 24–27 0,35; 28–30 0,10; 31+ 0.
- **Jogou e teve forma ≥ 6,8:** duas tentativas por rodada de ganhar +1 num atributo da posição. A chance sobe com a forma, com gols recentes e com títulos e temporadas na elite (até +50%).
- **Jovem (até 20) que não jogou:** ainda evolui devagar e não perde ritmo por ficar no banco.
- **Declínio por idade:** a partir de 29 anos, chance de perder velocidade, agilidade ou resistência (maior aos 31+ e 33+). Boa forma atenua a queda em até ~38%.
- **Banco prolongado:** 4 ou mais rodadas seguidas sem entrar em campo (maiores de 20 anos, fora do treino) dão chance de perder 1 ponto físico (velocidade, agilidade ou resistência).
- **Treino especial:** até **3 jogadores por vez**. Cada um ganha uma tentativa extra por rodada, com 5% de chance de +1 atributo. Jogadores "estrelinha" (cerca de 15% dos jogadores, marca fixa de cada um) têm 9%. Quem está em treino não perde ritmo no banco. **Onde fica no jogo:** ficha do jogador → Treino especial (botão "Treinar"). O cone laranja marca quem está treinando.

**Referência técnica:** `public/index.html` (`evolvePlayer`); `public/src/engine/core.js` (`startTraining`, `TRAINING_MAX_SLOTS`, `hasEstrelinha`).

---

## Aleatoriedade e "semente" (por que o resultado é o que é)

- Tudo no motor usa um **gerador de números aleatórios com semente**. A semente de cada partida é derivada da semente do save, do número da rodada e dos dois clubes. Resultado: **mesma semente + mesmos times = mesmo placar**. É isso que permite ao Modo Resenha mostrar a mesma partida para todos.
- A sorte existe e é grande: mesmo 20% mais forte, um time perde cerca de 1 em cada 10 jogos e empata cerca de 1 em cada 5.

---

## Modo Solo × Modo Resenha: quem decide o resultado

### Modo Solo

- **Tudo roda no aparelho do usuário.** A partida do usuário é jogada ao vivo pela "sessão interativa", que aceita decisões: substituições, batedor de pênalti, troca na lesão, reorganização na expulsão. As outras partidas da rodada, CPU × CPU, também são simuladas no aparelho, com o mesmo motor.
- Em copas que o clube do usuário não disputa, o padrão desde 27/09 é **não assistir**: o jogo simula e mostra só o resultado. Dá para mudar em Opções → Partida → "Assistir copas".

### Modo Resenha (multijogador)

- **Partida de um humano:** vale o **resultado que o próprio humano jogou e publicou**. O servidor aceita esse resultado.
- **Humano × humano:** o aparelho do **mandante** roda a partida e transmite para o visitante. O visitante assiste pela transmissão e suas decisões (substituições, batedor etc.) viajam pela rede até o mandante. Se o mandante não estiver presente, o visitante passa a rodar a partida. Se a transmissão ficar muda por ~10 segundos, o aparelho converte para uma partida local.
- **CPU × CPU (qualquer competição, qualquer país): quem decide é SEMPRE o servidor.** Nenhum aparelho de jogador pode decidir um confronto que nenhum humano jogou. Antes, cada aparelho calculava por conta própria e os resultados divergiam entre jogadores (tabelas diferentes para o mesmo clube). Hoje, as partidas de liga são pré-simuladas no servidor no apito inicial, e os aparelhos só **reproduzem** esse resultado na tela. O servidor usa **o mesmo motor** do aparelho, e é o servidor que fecha a rodada: aplica energia, moral, evolução, suspensões e lesões.
- **Treinador que não confirmou a escalação a tempo:** o time dele entra com a **última escalação e tática publicadas**. Se nunca publicou, entra a automática.
- **Enquanto o servidor não fecha a rodada,** um confronto de copa sem humano pode aparecer como "aguardando" ou "— de disputa". É proposital: o jogo prefere mostrar "aguardando" a mostrar um resultado que pode ser diferente do de outro jogador.
- **Versão do motor:** o servidor grava a versão do motor. Se o aparelho estiver com versão diferente (depois de uma atualização no meio da sala), o jogo pede para recarregar.

**Referência técnica:** `public/src/engine/simulate.js` (`liveMatchSession`, `SIM_ESCALACAO_PUBLICADA`, `tacticForClub`, `availableXI`); `public/src/ui/main.js` (montagem da partida ao vivo humano × humano, `streamRemote`); `supabase/functions/kickoff-round/index.ts` (pré-simulação no apito); `supabase/functions/resolve-round/index.ts` (fechamento da rodada, `MOTOR_VER`); `public/src/engine/core.js` (`advanceCupBracket`, `advanceGroupStageRound`, bloqueio de CPU × CPU no Resenha).

---

## Perguntas frequentes

**"Por que perdi com um time mais forte?"**
O motor tem bastante sorte embutida. Em laboratório, um time 20% mais forte vence ~72%, empata ~19% e perde ~9%. Antes de concluir que "está bugado", confira:
(1) **energia**: um time cansado (70%) cai muito de rendimento, e no Solo a CPU está sempre descansada;
(2) **moral do time abaixo de 50**, que corta 15% de tudo;
(3) **desfalques**: suspenso ou lesionado sai e é substituído pelo reserva mais forte, que pode ser de outra posição;
(4) **expulsão**: com 10, o time vale 90%;
(5) a **Força exibida dos craques é comprimida no motor**: um 90 não vale o dobro de um 45;
(6) **mando e clássico**: fora de casa e em clássico o azarão tem mais chance.

**"A tática/formação X é melhor?"**
Não. Desde 21/08/2026, com times iguais, todas as formações vencem entre ~32% e ~39%, e Ofensivo, Equilibrado e Retranca se equilibram (~35–37% cada). Ofensivo marca mais e sofre mais; Retranca sofre menos e marca menos. O que mais pesa é a qualidade e o estado (energia/moral) do elenco. Relatos de que o 3-3-4 "só dá goleada" são da versão antiga.

**"Onde escolho Ofensivo ou Retranca?"**
Não há seletor separado: a postura vem da formação. 3-3-4 e 4-2-4 = Ofensivo; 4-5-1 = Retranca; 3-4-3, 4-3-3 e 4-4-2 = Equilibrado; Auto = Equilibrado. A régua embaixo de cada formação mostra qual é.

**"Por que o jogador que escalei não entrou?"**
Porque estava **suspenso** (vermelho na partida anterior) ou **lesionado**. O motor tira o indisponível e põe o reserva disponível de maior Força. No Resenha, outra causa possível: a escalação não foi confirmada a tempo e entrou a última publicada.

**"Por que meu jogador foi substituído / entrou alguém sozinho?"**
Na lesão ou expulsão o painel tem prazo (15 s na lesão, 12 s na expulsão). Se o tempo acaba, a lesão é resolvida com o reserva pré-selecionado da mesma posição e a expulsão segue com 10.

**"Não consigo fazer substituição no meio do jogo."**
É a regra atual: trocas voluntárias no **intervalo** (se a opção "Substituições ao intervalo" estiver ligada) e na tela antes da prorrogação. Durante o jogo só se troca por causa de lesão ou reorganização por expulsão. Máximo de 3 por partida.

**"A prorrogação diz que tenho 4 trocas, mas não consegui fazer a 4ª."**
Divergência conhecida no código: a tela promete a 4ª troca, mas a substituição continua limitada a 3. Encaminhar como bug.

**"Meu jogador levou 3 amarelos e não foi suspenso."**
Correto: o jogo não tem suspensão por acúmulo de amarelos. Só o vermelho (direto ou por 2 amarelos no mesmo jogo) suspende, por 1 partida.

**"Pênalti é sorteio?"**
Não é 50/50. A chance depende do batedor (Força, posição, moral) e do goleiro. Na simulação fica entre 42% e 93%. Quando o treinador escolhe o batedor, fica entre 72% e 95%, com +6 pontos se escolher o canto. Goleiro batendo é o pior caso.

**"Por que o resultado no Resenha foi diferente do que eu vi / do meu amigo?"**
O resultado oficial de CPU × CPU é o do servidor. Se alguém viu um placar diferente, provavelmente era um estado local antigo, antes de adotar a rodada do servidor. Recarregar resolve. Se as versões do motor forem diferentes, o jogo pede recarga. Placar divergente persistente deve ser encaminhado à equipe técnica.

**"A velocidade Ultrassônico sumiu."**
Ultrassônico é do plano pago. No plano grátis o jogo volta para Curto/Médio/Longo, mesmo que a opção tenha sido gravada antes. No Resenha, a velocidade é a do anfitrião.

**"O Modo Camarote está apagado."**
O Camarote só funciona até a velocidade Ultrassônica, e só quando o clube do usuário tem jogo na rodada. Assistindo a uma copa sem jogar, não há Camarote.

**"O time da CPU nunca cansa?"**
No Modo Solo, não: só o elenco do usuário perde energia. No Resenha, só os clubes dos humanos. É a regra atual. A equipe discutiu mudá-la e adiou.

**"Meu jogador jogou bem e a Força não subiu."**
A evolução é por pontos de atributo, com chance, e depende da idade. Depois dos 30 praticamente só há declínio. A Força exibida só muda quando os atributos somam o bastante para virar um ponto na curva da divisão. O Treino especial dá uma chance extra por rodada.

---

## Pontos incertos ou a confirmar

- Se a **expansão de estádio** do usuário no Solo altera o mando de campo no motor. O código lê um campo que parece aposentado e cai na estimativa pelo porte do clube.
- A marca de **"partida decisiva"** (+12% de variação) existe no motor, mas não foi encontrado nenhum ponto do jogo que a ligue.
- A **4ª substituição da prorrogação**: prometida pela tela e bloqueada pelo código (limite 3).
- As porcentagens "medidas" vêm de laboratório com times sintéticos (sem atributos individuais e, na medição de táticas e formações, sem a compressão de craques). Servem como ordem de grandeza.
