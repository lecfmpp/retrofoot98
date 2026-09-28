# Elenco, mercado e finanças

Esta seção explica como funcionam os jogadores, o elenco, a base, o mercado de transferências e o dinheiro do clube no RetroFoot98. Tudo aqui foi levantado do código do jogo (situação de setembro de 2026). Quando algo não está claro no código, o texto diz isso.

Conceitos que aparecem o tempo todo:

- **Rodada = semana.** Uma rodada de liga é uma semana do calendário (7 dias). Todo salário do jogo é **semanal**, pago **a cada rodada**. Na tela, salário e folha aparecem como "/rodada".
- **Temporada da liga = 38 rodadas** na Série A de 20 clubes (o número real é o tamanho do calendário do campeonato).
- **Caixa** é o dinheiro disponível do clube. Tudo é guardado internamente em reais (R$). A moeda escolhida nas opções (Reais, Dólares ou Euros) muda só a exibição: US$ 1 ≈ R$ 5,40 e € 1 ≈ R$ 6,20.
- **Modo Solo** e **Modo Resenha** seguem as mesmas regras de mercado e finanças. As diferenças estão apontadas quando existem.

---

## 1. O jogador e seus atributos

Cada jogador tem estes dados principais:

| Dado | O que é | Escala |
|---|---|---|
| **Força** | O nível geral do jogador. É o número que o motor de partida usa, que define valor de mercado e salário. | 1 a 99 |
| **Posição** | Goleiro (G), Defesa (D), Meio (M) ou Ataque (A). | — |
| **Idade** | Sobe 1 ano a cada virada de temporada. | anos |
| **Atributos** | 16 atributos de 1 a 20 (Finalização, Passe, Drible, Desarme, Cabeceio, Cruzamento, Visão de jogo, Posicionamento, Compostura, Determinação, Velocidade, Resistência, Força física, Agilidade, Reflexos e Defesa/mãos do goleiro). | 1–20 |
| **Comportamento** | Traço fixo, sorteado uma vez: Exemplar, Manso, Discreto, Encrenqueiro, Brigão ou Casca-Grossa. | — |
| **Moral** | Humor do jogador. | 0–100 |
| **Energia** | Cansaço físico. | 0–100 |
| **Contrato** | Salário semanal, papel no elenco e cláusulas. | — |
| **Nacionalidade** | Define se conta na cota de estrangeiros. | — |

### Faixas de força (referência do próprio jogo)

- Série A: 38–49 · Série B: 25–37 · Série C: 13–24 · Série D: 3–12
- Estrela: 50–69 · Craque Nacional: 70–89 · Craque Mundial: 90–99

A força exibida sai dos atributos: os atributos da posição viram uma "força bruta", que depois passa por uma curva própria de cada divisão. Por isso a força pode **dar saltos** (2 a 4 pontos de uma vez) ou **não mudar** mesmo o jogador tendo evoluído um atributo. Na Série D, 1 ponto de força bruta pode valer cerca de +3 de força exibida; na Série A, cerca de +0,6.

No motor de partida, a força acima de 49 é "comprimida" (um craque é o melhor em campo, mas não torna o time imbatível). No goleiro essa compressão é mais leve. A tela, o valor e o salário sempre usam a força cheia.

### Comportamento

É um traço fixo, e muda três coisas:

| Comportamento | Chance de cartão | Chance de lesão | Valor de mercado |
|---|---|---|---|
| Exemplar | ×0,4 | ×0,85 | ×1,15 |
| Manso | ×0,75 | ×0,55 | ×1,02 |
| Discreto | ×1,0 | ×1,6 | ×1,06 |
| Encrenqueiro | ×1,7 | ×1,0 | ×0,98 |
| Brigão | ×2,4 | ×1,05 | ×0,92 |
| Casca-Grossa | ×3,2 | ×1,1 | ×0,85 |

Zagueiros tendem a sair com comportamentos mais agressivos. Goleiros, meias e atacantes tendem a sair Exemplar ou Manso.

### Energia e moral

- **Energia:** a cada rodada, todo jogador recupera de 6 a 16 pontos. Quem entra em campo perde de 12 a 22 pontos, proporcional aos minutos jogados, e a energia nunca cai abaixo de 20 por esse desgaste. No motor, energia baixa reduz o rendimento: a força em campo vale entre 60% (energia 0) e 100% (energia 100) do normal.
- **Moral:** depois de cada jogo, quem entrou ganha +8 na vitória, +1 no empate e perde 8 na derrota. Quem fez gol ganha +6 extra. A cada rodada, a moral se aproxima um pouco de 70 (8% da distância). Na virada de temporada, todos voltam para moral 70 e energia 100.
- **Papel prometido no contrato:** um "Jogador Chave" que fica fora do time perde 8 de moral por rodada, e um "Titular Regular" perde 4.

### Evolução (por que o jogador sobe ou cai de força)

A cada rodada, o jogador pode ganhar ou perder pontos de atributo:

| Fonte | Como funciona |
|---|---|
| **Jogar bem** | Só vale para quem jogou e tem média de nota ≥ 6,8 nos últimos 3 jogos. São 2 sorteios por rodada. A chance cresce com a nota e com gols recentes, e é multiplicada pelo fator de idade: até 20 anos ×1,0 · 21–23 ×0,7 · 24–27 ×0,35 · 28–30 ×0,10 · 31+ zero. Títulos na carreira dão um bônus pequeno. |
| **Treino especial** | 1 sorteio de 5% por rodada (9% se o jogador tiver a ⭐ "estrelinha" de destaque, que cerca de 15% dos jogadores têm). |
| **Jovem até 20 anos** | Mesmo sem jogar, 1 sorteio de 12% × fator de idade. |
| **Idade 29+** | 3 sorteios de queda em Velocidade, Agilidade e Resistência. A chance é maior quanto mais velho (29–30, 31–32, 33+) e fica menor se o jogador estiver jogando bem. |
| **Banco 4+ rodadas** | Quem passa 4 ou mais rodadas seguidas fora do time pode perder atributos físicos (até 25% de chance). Jovens até 20 anos e quem está em treino não sofrem essa perda. |

A ficha do jogador mostra esse "raio-X" (a previsão de força por temporada), usando a mesma conta do motor.

### Aposentadoria

A partir dos 32 anos há chance de aposentadoria na virada de temporada: 32 anos 11%, 33 anos 24%, 34 anos 40%, 35 anos 56%, 36 anos 71%, 37 anos 83%, 38 anos 92%, 39 anos 97%, 40+ anos 100%. No máximo 3 jogadores por clube se aposentam por temporada. Quem se aposenta é substituído por um jovem de 18 a 22 anos, na mesma posição e no nível da divisão. O Diretor de Futebol manda um e-mail durante a temporada com a lista exata de quem vai se aposentar. A lista pode mudar se o elenco mudar por compra ou venda.

**Referência técnica:** `evolvePlayer` e `computeVM` em `public/index.html`; `growthProfileOf`, `retireChance` e `predictSeasonRetirements` em `public/src/engine/core.js`; curvas de força em `public/src/data/rebalance.js` (`REBAL.force`, `BANDS`).

---

## 2. Ficha do jogador e fotos

**Onde fica no jogo:** Elenco & Base → aba Ficha, ou clicando no nome de qualquer jogador (no elenco, no mercado ou na formação).

A ficha mostra os 16 atributos; um gráfico só com os atributos que o motor de partida realmente usa para aquela posição; comparação com a média da posição na divisão; estatísticas da temporada (jogos, gols, assistências, jogos sem sofrer gol, cartões); contrato; comportamento; lesões; histórico de transferências; e o ritmo de evolução.

- Desde 26/08 as **assistências** são reais: o motor sorteia quem deu o passe do gol.
- Alguns números da ficha são **derivados**, não gravados: minutos = jogos × 90; gols sofridos do goleiro = gols sofridos pelo time na temporada; o "ano de fundação" do clube é um número fixo gerado por clube.
- A ficha completa também abre para jogadores de **outros clubes**. Só as ações (escalar, renovar, vender) ficam restritas ao dono do elenco.

### Fotos dos jogadores

- As fotos vêm do Estúdio IA do painel administrativo. Quando existe cabeça e manequim, o jogo monta o retrato com a camisa do **clube atual** do jogador, e por isso a camisa muda quando ele é transferido.
- Jogador sem foto aparece com a imagem padrão (silhueta).
- Jovens da base, e qualquer jogador de até 22 anos sem foto própria, recebem um rosto de um **acervo da base**. Esse rosto fica marcado no jogador e o acompanha pela carreira, mesmo depois dos 22.

**Referência técnica:** `rfElFichaHTML` e `rfFotoDe` em `public/src/ui/rf26-elenco.js`.

---

## 3. Nomes fictícios dos jogadores

**Por que os jogadores não têm os nomes reais?** Desde 28/08/2026, os cerca de 1.900 jogadores das quatro divisões brasileiras (Séries A, B, C e D) usam **nomes fictícios**. É uma medida de segurança de marca: o jogo não usa o nome de atletas reais. Os nomes e escudos dos clubes não foram alterados por essa troca.

Como funciona, em termos simples:

- Os nomes fictícios fazem parte do "pacote oficial" de dados, aplicado sobre o catálogo do jogo toda vez que ele abre.
- Desde 25/09/2026, uma cópia desse pacote vai **embutida** no próprio jogo. Antes disso, se o servidor estivesse fora do ar e o navegador não tivesse cópia guardada, um **jogo novo** podia nascer com nomes e escudos reais, e o save ficava assim. Esse problema foi corrigido.
- Jogadores de clientes do plano Embaixador aprovados na moderação podem aparecer com o nome e a foto escolhidos pelo assinante. Esse nome vale por cima do nome fictício.
- As fotos acompanham o nome novo.

**Perguntas frequentes**

- *"Um jogador está com nome real no meu save."* Provavelmente é um save criado num momento em que o pacote oficial não carregou (ver acima). O save guarda os nomes com que nasceu. Encaminhar para a equipe técnica com o nome do clube e do jogador.
- *"Por que o jogador X não é o do time de verdade?"* Porque os nomes são fictícios de propósito.

**Referência técnica:** `public/src/net/dados.js` (aplicação do pacote e âncora de nome `_n0`), `public/src/data/pacote-oficial.js` (cópia embutida).

---

## 4. Página Elenco & Base

**Onde fica no jogo:** menu Elenco. Tem as abas Elenco, Ficha, Base e Treino.

### Aba Elenco

Mostra o cabeçalho do clube (divisão, temporada, posição na tabela, força média, idade média e **folha por semana**) e a tabela do elenco com nacionalidade, posição, idade, força, energia, forma, salário e fim de contrato. Dá para escolher 20, 50 ou 100 linhas. Embaixo aparece o resumo por setor (quantidade e força média de goleiros, defesa, meio e ataque).

- **Forma** é a **média das notas dos últimos 3 jogos**, não V/E/D. Sem jogos, aparece um traço.
- Ícones: cone = em treino especial; cartão vermelho = suspenso; cruz = lesionado.
- **FIM (fim de contrato):** a maioria dos jogadores aparece com "—", porque o contrato padrão não tem duração. Só quem foi renovado pela tela nova tem um ano de término (temporada atual + anos). **Contrato não vence e o jogador não sai de graça no fim**: não existe mecânica de expiração no código.

### Visitar outro clube

Clicando no nome/escudo de um clube (no mercado, na tabela etc.), a página Elenco passa a mostrar o elenco **daquele** clube, com as mesmas colunas e fichas completas, mas sem folha salarial e sem ações. Há um botão para voltar ao próprio clube. Clubes do exterior abertos só para olhar entram em modo "vitrine" (não pesam no save).

### Aba Base (subir jogador das categorias de base)

- Mostra **3 candidatos** de 16 a 19 anos. O lote fica **fixo até a próxima rodada ser jogada**. Reabrir a tela não sorteia outro lote.
- A posição sugerida é a **mais carente** do elenco. Se houver menos de 3 goleiros, sai goleiro. Os três candidatos tendem a ter posições diferentes.
- A força do garoto é sorteada dentro da faixa da divisão do clube (mais ou menos o nível do time).
- O salário do jovem é **40% do salário normal** para aquela força (mínimo R$ 1.000 por semana).
- **Limite: 1 jovem por janela de transferências**, ou seja, **2 por temporada** (uma em cada janela). Fora da janela a base não sobe ninguém.
- Com o elenco em **40 jogadores**, não dá para promover.
- As colunas "Potencial" e "Pronto em" são **estimativas** da tela (a força projetada até os 24 anos pelo ritmo de evolução). O motor não guarda um "potencial" oculto.

### Aba Treino (treino especial)

- Até **3 jogadores** em treino especial ao mesmo tempo.
- Quem está em treino ganha, a cada rodada, uma chance extra de **5%** de subir um atributo (**9%** com a ⭐ estrelinha), somada à evolução normal.
- Quem está em treino **não perde ritmo** por ficar no banco.
- A tela mostra o ganho previsto em "força por temporada".

**Referência técnica:** `rfElElencoHTML`, `rfElBaseHTML`, `rfElTreinoHTML` em `public/src/ui/rf26-elenco.js`; `youthAvailable`, `generateYouthCandidate`, `confirmYouthPromotion`, `startTraining` em `public/src/engine/core.js`.

---

## 5. Valor de mercado (valor do passe)

O valor de mercado mostrado em todas as telas é calculado **na hora** (é o chamado "valor vivo"), assim:

**Valor = tabela da força × fator idade × fator potencial × fator comportamento × fator momento × bônus de artilharia**

1. **Tabela da força** (valor-base): força 5 = R$ 80 mil · 10 = 200 mil · 20 = 700 mil · 30 = 1,6 mi · 40 = 4 mi · 45 = 6 mi · 50 = 9 mi · 60 = 18 mi · 70 = 35 mi · 80 = 70 mi · 90 = 150 mi · 99 = 260 mi. Entre esses pontos o valor é interpolado.
2. **Fator idade:** até 21 anos ×1,35 · 22–27 ×1,00 · 28–31 ×0,80 · 32–35 ×0,50 · 36+ ×0,25.
3. **Fator potencial:** jovem bom vale até **+20%**. O bônus cai com a idade (some aos 24) e cresce com a força.
4. **Fator comportamento:** de ×0,85 (Casca-Grossa) a ×1,15 (Exemplar). Ver a tabela da seção 1.
5. **Fator momento:** de **×0,75 a ×1,40**. Sobe com a média das últimas 3 notas (cada ponto acima de 6,5 vale +10%) e com gols recentes. Com 5 ou mais jogos na temporada, entra também a produção: gols + 0,7 × assistências por jogo, comparados com o esperado da posição (atacante 0,35 · meia 0,15 · defensor 0,05). No goleiro conta a taxa de jogos sem sofrer gol.
6. **Artilharia:** o artilheiro da divisão ganha **+20% permanente** no valor, acumulável até +60%.

O valor mínimo é R$ 30 mil, e o valor é arredondado ao milhar.

Mudanças importantes (11/09/2026):

- Antes, trocar de liga podia cortar o valor em até 93% (por exemplo, de Portugal para a Série D). **Isso foi removido.** Trocar de clube ou de liga **não muda** o valor.
- O **contrato não entra na conta do valor**. O diálogo de renovação diz "contrato vencendo derruba o valor do passe", mas não há nada no cálculo que faça isso (ver seção 9).

**Referência técnica:** `computeVM`, `fatorPotencial`, `fatorMomento`, `BEHAVIOR_MV_MULT` em `public/index.html`; `REBAL.value` em `rebalance.js`; `MARKET.ageFactor` em `public/src/data/market-engine.js`.

---

## 6. Janela de transferências

- **Duas janelas por temporada, de 10 rodadas cada:**
  - Rodadas 1 a 10 (internamente, rodadas 0–9): **ABERTA**
  - Rodadas 11 a 20: fechada
  - Rodadas 21 a 30 (internamente, 20–29): **ABERTA**
  - Rodada 31 até o fim: fechada
- Com a janela fechada **não dá para**: comprar, vender, dar lance em leilão, receber propostas, aceitar propostas nem subir jogador da base. A tela mostra em quantas rodadas a janela abre.
- A "pré-janela" (fechar acordo antes e o jogador chegar depois) foi **desligada**. Só existe negociação com a janela aberta.
- Clubes da CPU também só negociam entre si com a janela aberta.
- **Trava de revenda:** jogador comprado (inclusive em leilão) fica **travado até o fim da temporada**. Não pode ser vendido, receber proposta nem ir para leilão até a virada.

**Referência técnica:** `TRANSFER_WINDOWS`, `inTransferWindow`, `applyTradeLock`, `isTradeLocked` em `core.js`.

---

## 7. Mercado: comprar jogador

**Onde fica no jogo:** menu Mercado. Abas: Comprar, Leilão, Propostas, Contrapropostas, Vender e Transferências.

### A lista de compra

- Mostra jogadores dos outros clubes do seu país (por divisão) ou de **ligas do exterior** (filtro País). Há filtros de posição, nacionalidade, força, idade, preço ("cabe no caixa" / "até metade do caixa"), clube, busca por nome e ordenação.
- Jogadores com a trava de revenda (comprados nesta temporada) não aparecem.
- O bloco "O que o caixa permite" mostra caixa, folha atual por rodada, **margem de salário** (quanto de salário novo cabe por rodada sem a folha passar do que entra de TV e bilheteria) e o número de jogadores no elenco ("X de 30", que é só uma referência visual) e a cota de estrangeiros.

### Preço pedido pelo clube vendedor

**Pedido = valor de mercado × 1,15**, e ainda:
- × **1,40** se o vendedor está no **Z-4** (17º lugar ou pior);
- × **1,20** se o vendedor está entre os **6 primeiros**.

O pedido é arredondado ao milhar. No mercado do exterior, os gols do jogador na liga de lá encarecem o preço: +4% por gol, até +50%.

### A negociação em 3 etapas (clube da CPU)

1. **Taxa (Dia 1):** você oferece um valor.
   - Oferta ≥ pedido (com 0,5% de tolerância para arredondamento): **aceita**.
   - Oferta entre **82% e 100%** do pedido: o clube faz **contraproposta** no meio do caminho entre a sua oferta e o pedido. Há um botão "Igualar pedido". Cobrir a contraproposta fecha a taxa.
   - Oferta **abaixo de 82%** do pedido: **recusa imediata**, e essa negociação é encerrada.
2. **Salário (Dia 2):** o empresário avalia os termos. O salário inicial sugerido é o da tabela para a força do jogador. O "interesse" do empresário parte de 45 e muda assim:
   - salário ≥ 110% da tabela: +22 · salário ≥ 85% desse valor: +8 · abaixo disso: −18;
   - papel prometido: Jogador Chave +14 · Titular Regular +7 · Rotação 0 · outros −4 (e +6 se for "Jovem da Base" com até 21 anos);
   - cláusula de bônus por gol +4; cláusula de liberação para a Europa +8;
   - seu clube entre os 6 primeiros +12; no Z-4 −14;
   - jogador em grande fase −8.
   - **Interesse ≥ 70:** aceita. **Entre 45 e 69:** pede **115% do salário da tabela**, e você precisa pagar pelo menos isso. **Abaixo de 45:** sem interesse.
3. **Fechar (Dia 3):** a taxa sai do caixa **na hora** e o salário entra na folha a partir da rodada seguinte. O jogador chega com moral 75.

- Negociação parada por mais de 3 dias sem chegar à etapa final **expira**.
- A compra é **bloqueada** se a **taxa for maior que o caixa** ("Caixa insuficiente pra fechar a taxa combinada"). O motor **não verifica o salário**. É para isso que existe o Contador (seção 13).
- **Cota de estrangeiros:** no futebol brasileiro, **no máximo 8 estrangeiros** no elenco. Outros países têm cotas próprias (Inglaterra 22, Espanha 15, Itália 16, Alemanha 17, Portugal 18). Jogador sem nacionalidade registrada conta como nacional.
- **Cláusula de liberação para a Europa:** se for concedida na negociação, vale 2× o valor de mercado. Depois, a cada rodada, um clube europeu tem 1,2% de chance de pagar a multa por esse jogador, se ele tiver até 23 anos ou estiver em grande fase. O dinheiro entra, mas o jogador sai do jogo.

### Comprar de outro treinador (Modo Resenha)

Clube de outro humano não negocia com a regra da CPU. A proposta vai para o **e-mail do outro treinador**, que aceita, recusa ou faz contraproposta. O **seu caixa só é debitado quando o jogador chega** ao seu elenco. Se a proposta expirar sem resposta, nada é cobrado.

### Limite de elenco

- Não encontrei no código um **limite máximo** para comprar jogador (a tela mostra "de 30" como referência).
- A promoção da base para em **40 jogadores**.
- Clubes da CPU não compram se tiverem 32 ou mais jogadores e não vendem se tiverem 16 ou menos.
- **Piso de goleiros:** todo clube mantém pelo menos **2 goleiros**. Nenhum caminho de saída (venda, proposta, multa, leilão) deixa o clube com menos.

**Referência técnica:** `playerAsk`, `startNego`, `clubRespond`, `agentInterest`, `agentRespond`, `finalizeTransfer`, `checkForeignQuota`, `canReleaseFromSquad`, `europeRaids` em `core.js`; tela em `public/src/ui/rf26-mercado.js` (`rfMktMercado`, `rfMkFinalizar`).

---

## 8. Mercado: vender, propostas recebidas e leilão

### Vender direto (aba Vender → "Listar")

- Você escolhe o jogador e o preço pedido (a sugestão é o valor de mercado). A venda é **imediata** para um clube da CPU sorteado da sua divisão. Clubes de outros humanos nunca entram nesse sorteio.
- O mercado oferece de **85% a 155%** do valor-base guardado do jogador. Se o seu preço estiver até **1,35×** a oferta sorteada, você recebe o seu preço (ou a oferta, se ela for maior). Se pedir **acima disso**, a oferta cai 8%.
- Bloqueios: janela fechada, jogador comprado nesta temporada e piso de goleiros.
- A tela avisa "Quem você não deveria vender": o titular que é o único do setor com aquele nível.

### Propostas recebidas (aba Propostas)

- Só chegam com a janela aberta. Em cerca de 66% das rodadas de janela chega uma proposta nova, com no máximo **6 propostas pendentes** ao mesmo tempo. Seu elenco precisa ter mais de 16 jogadores.
- Os clubes miram preferencialmente os **melhores** do seu elenco (os 40% de maior força).
- Comprador: clubes do seu país ou de ligas do exterior, **só os de nível compatível**. O jogador precisa ter força no máximo 12 acima do overall do clube comprador, e o comprador não se interessa por quem está mais de 10 abaixo do próprio nível.
- Valor oferecido: **100% a 170% do valor de mercado**. A proposta **vale 3 rodadas**.
- **Contraproposta sua:** cada comprador tem um teto secreto de 115% a 130% da primeira oferta (mais 20% se o jogador estiver em grande fase).
  - Pedido até a oferta atual: segue a oferta.
  - Pedido até o teto: o comprador **aceita** o seu valor (falta só confirmar).
  - Pedido acima do teto: ele sobe até o meio do caminho. Depois de 3 rodadas de regateio, ou se o pedido passar de 1,3× o teto, ele dá a **"palavra final"** no valor do teto: é aceitar ou recusar.
- Para aceitar, o elenco precisa ter **mais de 15 jogadores**, e o piso de goleiros tem de ser respeitado.

### Leilão (aba Leilão)

- Só funciona com a janela aberta. Mantém cerca de **8 lotes** de jogadores de clubes da CPU.
- Cada lote tem de **2 a 20 clubes interessados**. Jogador mais forte e mais novo atrai mais interessados.
- O lance inicial fica entre 60% e 75% do valor de mercado.
- Cada lote tem um **teto** (escondido) que a CPU aceita pagar: de cerca de 1,15× (2 interessados) a cerca de 2,6× o valor (20 interessados).
- O lote fica aberto por **3 rodadas**. A cada rodada, se você estiver na frente mas **abaixo do teto**, a CPU **cobre** o seu lance. **Para garantir a compra, é preciso dar um lance acima do teto.** A tela avisa quando o lance ainda pode ser coberto.
- O dinheiro **só sai quando o lote fecha** e você é o vencedor. Se o caixa não cobrir o lance nessa hora, você perde o lote.
- Vencer o leilão dá contrato de "Rotação" com salário da tabela, e o jogador fica travado até o fim da temporada.
- É possível desligar o leilão (ou esconder os jogadores fracos) em Treinador → Perfil.
- No Modo Resenha, todos os humanos disputam os mesmos lotes. O maior lance vence, e em caso de empate vence quem deu o lance primeiro.

### Mercado da CPU

A cada rodada de janela, 2 a 4 negócios acontecem entre clubes da CPU da sua liga (aba Transferências). O dinheiro sai de um caixa e entra no outro. Um clube sem dinheiro tenta vender alguém antes de comprar. Ligas do exterior também negociam entre si, mais raramente.

**Referência técnica:** `clSellConfirm` em `public/src/ui/main.js`; `generateIncomingOffers`, `clubWouldSign`, `counterIncomingOffer`, `acceptIncomingOffer`, `placeAuctionBid`, `advanceAuctions` em `core.js`; `leilaoRodada` e `cpuMarket` em `public/src/engine/world-rules.js`.

---

## 9. Contratos, renovação e salários

### Salário (tabela por força, por semana/rodada)

| Força | 5 | 10 | 20 | 30 | 40 | 45 | 50 | 60 | 70 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Salário | 1 mil | 3 mil | 10 mil | 22 mil | 43 mil | 58 mil | 78 mil | 130 mil | 220 mil | 420 mil | 800 mil | 1,3 mi |

### Contrato padrão

- Papel: força ≥ 50 → Jogador Chave · força ≥ 36 → Titular Regular · até 20 anos → Jovem da Base · outros → Rotação.
- **Bônus por gol** (força ≥ 42): 1 semana de salário por gol. O mesmo contrato paga 1 semana a goleiro ou defensor titular que não sofre gol.
- **Meta de 50% dos jogos:** 2 semanas de salário, **uma vez por temporada**, quando o jogador atinge metade das partidas.
- Sem cláusula europeia, salvo se concedida na compra.

### Renovar contrato

**Onde fica no jogo:** Ficha do jogador → "Renovar contrato".

- O campo sugere **+20%** sobre o salário atual. Você escolhe o salário e de 1 a 6 anos (padrão 3).
- O jogador **não aceita menos de 90%** do salário atual.
- **Chance de aceitar** = 50% + (aumento percentual × 1,4) − (força acima de 70), entre 5% e 95%. Exemplo: +20% de aumento para um jogador de força 60 dá 50 + 28 = 78%. A chance mostrada na tela é a mesma usada no sorteio.
- Se recusar: moral −3. Se aceitar: moral +6 e o contrato ganha ano de término.
- Com o **caixa negativo**, não dá para renovar com aumento.
- A renovação **não muda o valor de mercado**, e não existe vencimento de contrato. A frase "contrato vencendo derruba o valor do passe", que aparece no diálogo, **não corresponde a nenhuma regra do cálculo atual**.

### Gestão automática de salários

Em Treinador → Perfil há a opção "Gestão de Salários" (nacionais / Bosman / estrangeiros). Com ela ligada, quando o salário do jogador fica mais de 5% abaixo da tabela para a força dele, o jogo reajusta sozinho para o valor da tabela, e o jogador ganha +4 de moral.

**Referência técnica:** `REBAL.wage` em `rebalance.js`; `defaultContract` e `autoManageSalaries` em `public/index.html`; `rfElRenovarGo` e `rfElChanceRenovar` em `rf26-elenco.js`; diálogo `elenco-renovar` em `public/src/ui/rf26-acoes.js`.

---

## 10. Finanças: de onde vem o dinheiro

**Onde fica no jogo:** menu Finanças. Abas: Resumo, Extrato, Estádio e Patrocínio, com a faixa azul do Contador no topo.

### A receita-base

Tudo parte de uma **receita-base por rodada**, calculada pelo overall do clube (a força média do elenco). Ela se divide em três partes:

| Parte | Peso | Depende de | Quando entra |
|---|---|---|---|
| Cota de TV fixa | 25% | overall **médio da divisão** (fixado na virada) | toda rodada |
| Cota de TV por mérito | 25% | overall do próprio clube | toda rodada |
| **Patrocínio** | 50% | overall do próprio clube | **o ano inteiro de uma vez, na 1ª rodada da temporada** |

Valores de referência para um clube médio: Série A ~R$ 2,9 mi por rodada de receita-base; Série B ~1,1 mi; Série C ~320 mil; Série D ~70 mil. O patrocínio do ano chega a **~R$ 55 mi na Série A**, ~21 mi na B, ~6 mi na C e ~1,3 mi na D.

### Patrocínio (aba Patrocínio)

- O valor do ano é fechado **no início da temporada**, pela força do elenco naquele momento. Reforço contratado no meio do ano só pesa no contrato do ano seguinte.
- O valor se divide em três espaços, cada um com uma **meta de bônus** paga **no fim da temporada**:
  - **Camisa (patrocinador principal)**, 55% do total. Meta: terminar entre os 4 primeiros da liga. Bônus: 20% da parte da camisa.
  - **Manga**, 27%. Meta: chegar às quartas de final de alguma copa. Bônus: 20% da parte da manga.
  - **Placas do estádio**, 18%. Meta: terminar entre os 6 primeiros (na 1ª divisão) ou subir de divisão (nas outras). Bônus: 25% da parte das placas.
- "Marca em breve" é só a arte da marca. O dinheiro é pago mesmo sem marca estampada.

### Outras receitas

| Receita | Valor | Quando |
|---|---|---|
| **Bilheteria** | público × ingresso | só em jogos em casa |
| **Prêmio de vitória / empate** | 12% / 4% da receita-base | na rodada |
| **Venda de jogador / multa europeia** | valor do negócio | na hora |
| **Copa nacional (Copa do Brasil / "Copa da Federação")** | cota por fase **disputada**, paga aos dois clubes do confronto: 1ª fase 0,52 mi · 2ª 1,04 mi · 16 avos 1,95 mi · oitavas 2,6 mi · quartas 5,2 mi · semi 11,7 mi · vice 18,2 mi · campeão 36,4 mi. Antes das oitavas, clubes das Séries A e B recebem 1,6×. | na hora, a cada fase |
| **Bilheteria de copa** | também existe em jogos de copa em casa | no jogo |
| **Prêmio da liga** | por posição final (tabela abaixo) | fim da temporada |
| **Copas continentais** | por fase alcançada. Libertadores: campeão 31,2 mi, vice 15,6, semi 9,1, quartas 6,5, oitavas 3,9, participação 1,95. Sul-Americana: campeão 15,6 mi, vice 7,8, semi 4,55, quartas 3,25, oitavas 1,95, participação 0,91. | quando a copa termina |
| **Artilheiro da divisão** (se for do seu clube) | A 3,9 mi · B 1,95 mi · C 0,91 mi · D 0,52 mi | fim da temporada |
| **Bônus de acesso** | subir para a C 0,75 mi · para a B 2 mi · para a A 4 mi | fim da temporada |
| **Metas do patrocínio** | ver acima | fim da temporada |

Prêmio da liga por posição ("parte de cima" = até 35% da tabela; "meio" = até 70%):

| Divisão | Campeão | Vice | 3º–4º | Parte de cima | Meio | Parte de baixo |
|---|---|---|---|---|---|---|
| A | 26 mi | 18,2 mi | 13 mi | 7,8 mi | 4,55 mi | 2,6 mi |
| B | 11,7 mi | 7,8 mi | 5,2 mi | 3,25 mi | 1,95 mi | 1,17 mi |
| C | 5,2 mi | 3,51 mi | 2,34 mi | 1,43 mi | 0,91 mi | 0,52 mi |
| D | 2,6 mi | 1,69 mi | 1,17 mi | 0,715 mi | 0,455 mi | 0,26 mi |

A premiação da temporada chega num e-mail ("Premiação da temporada"), e o valor já entra no caixa.

### Caixa inicial

Sorteado ao começar: Série A R$ 10–20 mi · B 6,5–9,5 mi · C 3–5 mi · D 1–2,5 mi.

**Referência técnica:** `processFinances`, `pushFinanceEntry`, `awardSeasonPrizes`, `patroMetas`, `PATRO_ESPACOS`, `awardCupPhasePrize` e `pagarCopasContinentais` em `core.js`; `REBAL.income`, `REBAL.receitaPartes` e `REBAL.budget` em `rebalance.js`; `public/src/data/prizes.js`; `docs/financas-dos-clubes.md`.

---

## 11. Finanças: para onde vai o dinheiro

| Despesa | Valor | Quando |
|---|---|---|
| **Folha salarial** | soma dos salários do elenco | toda rodada |
| **Custo operacional** | 8% da receita-base | toda rodada |
| **Bônus de gol / sem sofrer gol** | 1 semana de salário do jogador | na rodada |
| **Meta de 50% dos jogos** | 2 semanas de salário, 1 vez por temporada | na rodada em que bate |
| **Compra de jogador** | a taxa acertada | na hora |
| **Leilão** | o lance vencedor | quando o lote fecha |
| **Obra no estádio** | ver seção 12 | na hora |

O que **não existe** como despesa do clube:

- **Salário do treinador:** é do treinador e não sai do caixa do clube.
- **Empréstimos, juros ou financiamento:** não existem no jogo. Também **não há empréstimo de jogadores**. A palavra só aparece numa dica de texto ("vender ou emprestar quem não joga"), sem mecânica por trás.
- **Créditos de IA:** não há custo de IA no caixa do clube. O Estúdio IA é ferramenta do painel administrativo, não do jogador.

A folha é calibrada para ficar em ~56–60% da receita-base em todas as divisões. Na Série A, o saldo recorrente por rodada (TV + bilheteria − folha − custos, sem patrocínio) de um clube médio é de só **~+134 mil**. Por isso um salário alto novo pode deixar o clube perdendo dinheiro a cada rodada.

### Abas Resumo e Extrato

- **Resumo:** gráficos mês a mês de receita e despesa, e os totais da temporada por tipo (Cota de TV fixa, Cota de TV por mérito, Patrocínio, Bilheteria, Prêmio de desempenho, vendas, compras, estádio).
- **Extrato:** as movimentações recentes com data. O jogo guarda os **12 lançamentos mais recentes**. Os totais da temporada somam tudo, sem esse limite.
- Os totais zeram na virada de temporada.

**Referência técnica:** `processFinances` em `core.js`; `public/src/ui/rf26-financas.js` (`rfFiResumoHTML`, `rfFiExtratoHTML`).

---

## 12. Estádio, ingresso e torcida

**Onde fica no jogo:** Finanças → aba Estádio.

- **Capacidade inicial:** para clubes com dado real de estádio (principalmente os estrangeiros), usa a capacidade real. Para os outros, depende do porte (overall): cerca de 75 mil lugares num clube típico da Série A, 50 mil na B, 25 mil na C e 10 mil na D.
- **Ingresso:** preço **fixo por divisão**, e o jogador **não escolhe**: Série A R$ 25 · B R$ 20 · C R$ 15 · D R$ 10.
- **Público:** capacidade × ocupação. A ocupação fica entre **12% e 99%** e depende de três coisas: o preço do ingresso (ingresso mais caro enche menos), o **momento do time** (aproveitamento de pontos na tabela) e um fator aleatório. Não existe outro número de "torcida" que mexa no público.

### Ampliar o estádio

- Cada obra é uma **bancada de 5.000 lugares**.
- **Custo de uma bancada** = R$ 4 mi × (0,7 + capacidade atual ÷ 50.000). Exemplos: com 20 mil lugares, 4,4 mi; com 50 mil, 6,8 mi; com 75 mil, 8,8 mi. Quanto maior o estádio, mais cara a próxima bancada.
- **Limite por temporada:** 10.000 lugares (2 bancadas). O limite zera na virada.
- **Teto pelo porte do clube:** a capacidade inicial esperada para o overall do clube + 15.000, com máximo absoluto de **90.000**. No teto, só crescendo o clube (elenco mais forte).
- O caixa precisa cobrir o custo da obra. A obra passa pelo Contador (seção 13).
- As bancadas novas valem **a partir do próximo jogo**.
- Os clubes da CPU também ampliam o estádio sozinhos na virada, com as mesmas regras.

**Referência técnica:** `clBuildStand`, `standCostFor`, `stadiumMaxCapacityFor`, `attendanceFor` e `ticketPriceForDivision` em `public/src/ui/main.js`; `rfEstConstruirGo` e diálogos `est-*` em `rf26-acoes.js`; `PRIZES.ticketPrice`; `public/src/data/stadiums-intl.js`.

---

## 13. O Contador do clube e o alerta de endividamento

O Contador é um personagem do jogo (uma pessoa fictícia com nome e rosto) que olha o caixa e diz o que cada decisão vai fazer com ele. Foi criado porque **o motor só confere se a taxa cabe no caixa, nunca o salário**, e porque o patrocínio do ano inteiro entra de uma vez na 1ª rodada, justamente com a janela aberta. Isso dá uma falsa sensação de sobra.

- Existem **10 contadores fictícios** (5 homens e 5 mulheres). Um é sorteado **por save** na primeira vez e acompanha o treinador mesmo que ele troque de clube. Sem foto gerada, aparecem as iniciais.
- **Onde aparece:**
  1. Num cartão dentro de todo diálogo que gasta dinheiro: compra (nas 3 etapas), proposta a outro humano, lance, cobertura de lance, obra no estádio e renovação. O cartão mostra "Caixa depois", "Por rodada" e "Fim da temporada".
  2. Na **faixa azul fixa** no topo de Finanças, com a situação do dia (a fala muda conforme a aba).
  3. No aviso **"Isto vai endividar o clube"**, que segura a compra, o lance ou a obra quando ela deixaria o caixa negativo **no fim da temporada**. O aviso tem as opções "Voltar e rever" e "Seguir mesmo assim". **Ele não proíbe**: avisa uma vez, e a decisão é do treinador.

### A conta do Contador

- **Ritmo por rodada** = cota de TV + bilheteria média (a de um jogo em casa ÷ 2) − folha (com o salário novo) − custo operacional.
- **Fim da temporada** = caixa − gasto agora + patrocínio ainda não recebido + ritmo × rodadas que faltam.
- **Não conta** prêmios de vitória nem premiação de fim de ano. É prudente de propósito.
- Níveis: **perigo** (caixa já negativo depois do gasto, ou fim do ano negativo); **atenção** (a folha passa a custar mais do que TV e bilheteria rendem); **ok**.

**Referência técnica:** `public/src/ui/rf26-contador.js` (`rfCtConta`, `rfCtSegurar`, `RF_CT_POOL`); faixa em `rfFiFaixaHTML` (`rf26-financas.js`).

---

## 14. O que acontece com o caixa negativo

Desde 10/09/2026, dívida tem consequência:

1. **Pesa na segurança no cargo.** A barra "Segurança no cargo" (0–100) se move a cada rodada 18% na direção de um alvo:
   - **Alvo = 70% posição na tabela + 30% moral média do elenco − penalidade financeira.** (1º lugar = 100 na parte da tabela; lanterna = 0.)
   - **Penalidade com caixa negativo:** 8 pontos + 3,2 por "rodada de receita-base" devida, até **40 pontos**. Uma dívida de 10 rodadas de receita leva até o líder para a zona de risco.
   - **Penalidade com caixa positivo mas projeção do ano negativa:** 10 pontos.
2. **Demissão:** com a segurança em **15 ou menos** (a partir da 5ª rodada), há chance de demissão a cada rodada, até 30% com a barra em 0. No Modo Resenha, o limite é 12.
3. **Demitido com o caixa no vermelho** só recebe opções de clube **da divisão de baixo**. Se já estiver na última divisão, só entre os 5 clubes mais fracos dela. Demitido com caixa positivo escolhe entre até 3 clubes da mesma divisão ou de uma abaixo.
4. **Não entra reforço nem obra:** como a compra, o lance e a obra exigem que o valor caiba no caixa, com caixa negativo nenhum gasto passa. A renovação com aumento também é bloqueada.
5. **Avisos:** notícia de rodada ("Caixa negativo… Folha salarial pressionando as contas"), e-mail do Presidente ("Caixa no vermelho"), e a imprensa pode perguntar sobre o caixa na entrevista.

Não existe falência, venda forçada nem empréstimo. Os clubes da CPU têm um piso: o caixa deles nunca cai abaixo de −4 × a receita-base.

**Referência técnica:** `penalidadeFinanceira`, `tickJobSecurity`, `checkManagerJobEvent`, `generateFiringOptions` e `tickResenhaCareer` em `core.js`.

---

## 15. Propostas de outros clubes para o treinador

- Com segurança no cargo **≥ 80** (a partir da 5ª rodada), há **6% de chance por rodada** (8% com a barra em 90 ou mais) de um convite de outro clube. O treinador precisa ter moral média do elenco ≥ 65, ou algum título ou final disputada.
- O convite costuma vir de um clube um pouco melhor da mesma divisão (overall de +2 a +14). Em 25% das vezes vem de um clube fraco da divisão de cima. Às vezes vem do **exterior**: 15% das sondagens sem títulos, subindo com títulos até 60%. Para o exterior, a segurança exigida é 82, reduzida pelos títulos até um mínimo de 60.
- **Salário proposto** = salário atual (ou, para quem nunca mudou de clube, 100 mil + 5 mil × overall do clube) + 10% + 2% por ponto de overall de diferença entre os clubes.
- O convite fica na caixa de ofertas (Treinador → Ofertas) por **5 rodadas**.
- **Descanso:** depois de trocar de clube voluntariamente, é preciso esperar **2 temporadas** para receber nova sondagem. Demissão não conta.
- A diretoria manda o e-mail "Conversa séria sobre o seu trabalho" quando a segurança fica abaixo de 30.

**Referência técnica:** `generateJobOffer`, `proposedCoachSalary`, `SONDAGEM_EXTERIOR`, `podeMudarDeClube` em `core.js`; e-mails em `syncInbox` (`public/src/ui/main.js`).

---

## 16. Imprensa e notícias

- **Notícias da rodada:** contratações, vendas, leilões, propostas recebidas, patrocínio recebido, caixa negativo, promoção da base, negócios da CPU etc.
- **E-mails:** cada compra e venda vira um e-mail do Diretor de Futebol com o caixa depois do negócio. Aposentadorias previstas e realizadas também geram e-mail, assim como os convites do Presidente, o aviso de cargo e a premiação.
- **Entrevista pós-jogo (coletiva):** tem 3 perguntas (sobre o jogo, o elenco e o clube), montadas a partir dos fatos da semana: goleada, jejum, proposta por um titular, caixa no vermelho, cargo em risco. Cada resposta mostra antes o seu efeito em três números: **moral do elenco**, **segurança no cargo** e **reputação** do treinador (0–100, começa em 50). Frequência: no Modo Solo, a cada 3 rodadas (2 se houver um fato marcante), até 8 por temporada; no Modo Resenha, a cada 4 rodadas (3 com fato marcante), até 5 por temporada. Nunca acontece na 1ª rodada.

**Referência técnica:** `public/src/ui/rf26-imprensa.js` (`RF_PRESS_CFG`, `RF_PRESS_TEMAS`, `rfPressAplicar`).

---

## 17. Perguntas frequentes

**Por que o clube não aceita minha proposta?**
O clube da CPU pede o valor de mercado × 1,15 (× 1,40 se estiver no Z-4; × 1,20 se estiver entre os 6 primeiros). Oferta abaixo de 82% do pedido é recusada na hora. Entre 82% e 100%, vem contraproposta. Outros motivos possíveis: janela fechada; jogador comprado nesta temporada (trava de revenda); cota de estrangeiros cheia (8 no Brasil); caixa menor que a taxa; ou, na etapa do salário, empresário sem interesse (salário baixo, papel pouco importante, clube mal colocado).

**A taxa foi aceita, mas não consigo fechar.**
Se o empresário pediu um salário maior (115% da tabela), o salário oferecido tem de cobrir esse pedido. Também pode ser o aviso do Contador segurando a compra: escolha "Seguir mesmo assim" se quiser continuar.

**Por que meu caixa está negativo?**
Quase sempre por um destes motivos: (1) o patrocínio do ano inteiro entrou na 1ª rodada e foi gasto em contratações; depois disso o clube vive só de TV e bilheteria; (2) a folha subiu com as compras (o motor só confere a taxa, não o salário); (3) bônus de gol e da meta de 50% dos jogos; (4) obra no estádio; (5) os prêmios só entram no fim da temporada. Para sair: vender (principalmente salários altos), esperar prêmios e o patrocínio do ano seguinte, evitar novas compras.

**O que acontece se eu ficar com o caixa negativo?**
Nenhuma compra, lance, obra ou renovação com aumento passa; a segurança no cargo cai (até −40 pontos no alvo); se for demitido, só recebe convite de clube da divisão de baixo. Não há falência nem juros.

**Como aumento o estádio?**
Finanças → aba Estádio → construir bancadas. Cada bancada tem 5 mil lugares, com no máximo 2 bancadas por temporada, respeitando o teto do porte do clube (e o máximo de 90 mil). O custo sobe com o tamanho do estádio e precisa caber no caixa.

**Posso mudar o preço do ingresso?**
Não. O preço é fixo por divisão (A R$ 25, B 20, C 15, D 10).

**Por que o valor do meu jogador caiu?**
O valor é recalculado toda hora: idade (cai aos 28, aos 32 e aos 36), fase (notas baixas e atacante sem gol reduzem até 25%), força e potencial de jovem, que some aos 24. Trocar de clube ou de liga **não** muda mais o valor.

**Por que não recebo propostas pelo meu jogador?**
Propostas só chegam com a janela aberta, não em toda rodada (cerca de 2 em cada 3), com no máximo 6 pendentes, e só se o elenco tiver mais de 16 jogadores. Jogador comprado nesta temporada não recebe proposta. E o comprador precisa ter nível compatível com o jogador.

**Dei lance no leilão e perdi.**
A CPU cobre qualquer lance abaixo do teto do lote. Para garantir, é preciso passar desse teto. Também se perde o lote se o caixa não cobrir o lance no momento em que ele fecha.

**Posso emprestar jogador ou pegar dinheiro emprestado?**
Não. Nenhuma das duas mecânicas existe.

**Quando o contrato do jogador acaba?**
Não acaba. Não existe vencimento de contrato. A coluna "FIM" só mostra um ano para quem foi renovado.

**Quantos jogadores posso subir da base?**
Um por janela de transferências (2 por temporada), com a janela aberta e o elenco abaixo de 40.

**O salário do treinador sai do caixa do clube?**
Não.

---

## O que ficou incerto neste levantamento

- **Limite máximo de elenco para compras:** não achei trava no código (a tela mostra "de 30" como referência; a base para em 40).
- A frase do diálogo de renovação sobre "contrato vencendo derruba o valor do passe" não tem regra correspondente no cálculo.
- A **venda direta** usa o valor-base guardado do jogador (atualizado a cada rodada pela evolução), e não o valor vivo da tela. Os dois costumam ser iguais, mas podem diferir logo depois de uma mudança de fase.
- No Modo Resenha, o servidor calcula as finanças dos clubes da CPU e algumas taxas usando uma versão do valor de mercado que pode diferir um pouco da tela. Isso não afeta o que o jogador humano vê nem paga.
