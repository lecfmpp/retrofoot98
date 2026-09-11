# Finanças dos clubes — como o dinheiro entra e sai

Levantado do código em 10/09/2026. Serve de base para o **alerta de endividamento** (avisar o usuário, antes de uma compra, que ela vai deixar o caixa negativo).

Onde a regra mora:

| O quê | Arquivo |
|---|---|
| Tabelas de receita, salário, valor, caixa inicial, OPEX, bônus de vitória | `public/src/data/rebalance.js` (`REBAL`) |
| Premiações, preço do ingresso, bônus de acesso | `public/src/data/prizes.js` (`PRIZES`) |
| Fechamento da rodada do usuário | `processFinances` em `public/src/engine/core.js` (~l. 5959) |
| Extrato e totais da temporada | `pushFinanceEntry` em `core.js` (~l. 6044) |
| Prêmios de fim de temporada | `awardSeasonPrizes` em `core.js` (~l. 6158) |
| Caixa dos clubes da CPU | `WORLD_RULES.cpuCaixaRodada` (`engine/world-rules.js`) + `applyCpuSeasonFinances` |
| Aba Finanças (Resumo/Extrato/Projeção) | `public/src/ui/rf26-financas.js` |

**Unidade de tempo:** 1 rodada = 1 semana (`S.week++`, `S.day += 7`). Todo salário no jogo é **semanal** e é pago **toda rodada**.

---

## 1. Receitas

A "receita-base" do clube (`REBAL.income`) sai do **overall** do clube e é repartida em três partes (`REBAL.receitaPartes`):

| Parte | Peso | Depende de | Quando entra |
|---|---|---|---|
| **Cota de TV fixa** | 25% | overall **médio da divisão**, congelado na virada de temporada | toda rodada |
| **Cota de TV por mérito** | 25% | overall do próprio clube | toda rodada |
| **Patrocínio** | 50% | overall do próprio clube | **o ano inteiro de uma vez, na 1ª rodada da temporada** |

Além da base:

| Receita | Valor | Quando entra |
|---|---|---|
| **Bilheteria** | público × ingresso. Ingresso fixo por divisão: A R$25 · B R$20 · C R$15 · D R$10. Público = capacidade × ocupação (12%–99%), que sobe com o momento do time e cai com o preço (`attendanceFor`, `ui/main.js` ~l. 6836) | só nas rodadas **em casa** |
| **Prêmio de vitória / empate** | 12% / 4% da receita-base | na rodada do jogo |
| **Venda de jogador** | valor da venda | na hora |
| **Multa rescisória (Europa leva jogador)** | valor da cláusula | na hora |
| **Copa do Brasil** | por fase vencida: 1ª fase 0,52M · 2ª 1,04M · 16 avos 1,95M · oitavas 2,6M · quartas 5,2M · semi 11,7M · vice 18,2M · campeão 36,4M | **na hora**, a cada fase |
| **Prêmio da liga** | por posição final (tabela abaixo) | **fim da temporada** |
| **Outras copas** (Libertadores, Sul-Americana, Champions, Europa League) | pela fase alcançada | **fim da temporada** |
| **Artilheiro da divisão** (se for do seu clube) | A 3,9M · B 1,95M · C 0,91M · D 0,52M | fim da temporada |
| **Bônus de acesso** | subir para a C 0,75M · B 2M · A 4M | fim da temporada |

Prêmio da liga por posição (`PRIZES.LEAGUE`, "upper" = até 35% da tabela, "mid" = até 70%):

| Divisão | Campeão | Vice | 3º–4º | Parte de cima | Meio | Parte de baixo |
|---|---|---|---|---|---|---|
| A | 26M | 18,2M | 13M | 7,8M | 4,55M | 2,6M |
| B | 11,7M | 7,8M | 5,2M | 3,25M | 1,95M | 1,17M |
| C | 5,2M | 3,51M | 2,34M | 1,43M | 0,91M | 0,52M |
| D | 2,6M | 1,69M | 1,17M | 0,715M | 0,455M | 0,26M |

## 2. Despesas

| Despesa | Valor | Quando sai |
|---|---|---|
| **Folha salarial** | soma de `contract.salary` do elenco (tabela de salário abaixo) | **toda rodada** |
| **Custo operacional (OPEX)** | 8% da receita-base cheia | toda rodada |
| **Bônus de gol** | 1 semana do salário do jogador por gol (só contratos com `bonusGoal`, força ≥ 42) | na rodada |
| **Bônus de clean sheet** | 1 semana de salário para GK/DEF titular que não sofreu gol | na rodada |
| **Meta de 50% dos jogos** | 2 semanas de salário, uma vez por temporada, quando o jogador atinge metade das partidas | na rodada em que bate a meta |
| **Compra de jogador** | a taxa combinada (`offerFee`) | **na hora**, ao fechar |
| **Leilão** | o lance vencedor | na hora |
| **Obra no estádio** | +5.000 lugares por R$4M × (0,7 + capacidade/50.000) — ex.: com 75k lugares, 8,8M a obra | na hora |

Não é despesa do clube: o **salário do treinador** (`S.coachSalary`) é só do treinador, não sai do caixa.

Salário semanal e valor de mercado por força do jogador (`REBAL.wage` / `REBAL.valueBase`, valor antes do fator idade):

| Força | 10 | 20 | 30 | 40 | 45 | 50 | 60 | 70 | 80 | 90 |
|---|---|---|---|---|---|---|---|---|---|---|
| Salário/semana | 3k | 10k | 22k | 43k | 58k | 78k | 130k | 220k | 420k | 800k |
| Valor | 0,2M | 0,7M | 1,6M | 4M | 6M | 9M | 18M | 35M | 70M | 150M |

O **preço pedido** numa compra é o valor de mercado ao vivo × 1,15, e mais: × 1,40 se o vendedor está no Z-4, × 1,20 se está entre os 6 primeiros (`playerAsk`, `core.js` ~l. 163). Um jogador de força 60 custa, na prática, **21 a 25M**.

## 3. O clube típico de cada divisão (por rodada)

Calculado com as tabelas do jogo, para um clube de overall na média da divisão:

| | A (ov 47) | B (ov 31) | C (ov 19) | D (ov 8) |
|---|---|---|---|---|
| Caixa inicial (sorteado) | 10–20M | 6,5–9,5M | 3–5M | 1–2,5M |
| Receita-base | 2,92M | 1,13M | 0,32M | 0,07M |
| — cota de TV (fixa + mérito) por rodada | 1,46M | 0,56M | 0,16M | 0,035M |
| — **patrocínio do ano, pago na 1ª rodada** (× 38) | **~55M** | **~21M** | **~6M** | **~1,3M** |
| Folha (calibrada em ~58% da receita-base) | ~1,69M | ~0,65M | ~0,18M | ~0,04M |
| OPEX | 0,23M | 0,09M | 0,03M | 0,006M |
| Bilheteria por jogo em casa (aprox.) | ~1M | ~0,6M | ~0,25M | ~0,08M |

A calibração deixa a folha em 56–60% da receita-base em todas as divisões (A 56,6% · B 59,4% · C 60,1% · D 60,5%, medido em 03/09).

**O saldo recorrente da Série A por rodada (TV + bilheteria − folha − OPEX) é de apenas ~+134 mil**, e 4 clubes da A já têm esse saldo negativo. Esses 4 dependem do patrocínio para fechar o ano, sem folga para elenco caro que não venha acompanhado de uma venda.

## 4. Calendário do dinheiro numa temporada

```
Rodada 1   ── PATROCÍNIO DO ANO INTEIRO cai no caixa (pico do ano)
Rodadas 0–9 ── 1ª JANELA de transferências aberta       ← caixa inflado + mercado aberto
Toda rodada ── + cota de TV  + bilheteria (em casa)  + prêmio de vitória/empate
             ── − folha  − OPEX  − bônus (gol, clean sheet, meta 50%)
Copa do Brasil ── + cota a cada fase vencida, na hora
Rodadas 20–29 ── 2ª JANELA
Fim da temporada ── + prêmio da liga, copas, artilheiro, acesso
Virada ── extrato e totais zeram; patrocínio do ano novo entra na 1ª rodada
```

## 5. O que acontece quando o caixa fica negativo

Hoje, **quase nada**. É isso que o alerta tem de resolver.

- A única consequência é uma notícia por rodada: *"⚠️ Caixa negativo (…). Folha salarial pressionando as contas."* (`core.js` ~l. 6032).
- Não existe empréstimo, juro, penhora, venda forçada nem proibição de contratar.
- A segurança no cargo (`tickJobSecurity`) é 70% posição na tabela + 30% moral. **O caixa não entra**, então dívida não demite ninguém.
- A compra só é bloqueada se **a taxa** for maior que o caixa (`finalizeTransfer`: *"Caixa insuficiente pra fechar a taxa combinada"*). **O salário do contratado não é verificado.** Dá para gastar o caixa inteiro numa compra e ver a folha nova levar o caixa para o vermelho nas rodadas seguintes.
- Os clubes da CPU têm um piso: o caixa nunca cai abaixo de −4 × receita-base.

## 6. Por que o usuário se endivida sem perceber

1. **O patrocínio cria uma falsa sensação de riqueza.** Na 1ª rodada entra o ano inteiro (≈ 19 rodadas de receita-base na Série A), justamente quando a 1ª janela está aberta. O caixa parece enorme, mas é o dinheiro do ano, não uma sobra.
2. **O custo de um jogador é a taxa + o salário até o fim do ano, e a tela só cobra a taxa.** Um força 60 custa ~22M de taxa e mais 130k/semana; comprado na rodada 3, são ~4,6M de salário até o fim da temporada, mais bônus de gol e da meta de 50% (2 semanas).
3. **A folha já nasce no limite.** Com ~58% da receita-base e OPEX de 8%, o saldo recorrente da Série A é de ~+134k/rodada. Um salário de 130k/semana praticamente zera a sobra; um de 220k (força 70) a torna negativa.
4. **Os prêmios chegam só no fim da temporada.** Quem conta com eles para pagar a folha passa o ano no vermelho. Um rebaixamento derruba o prêmio e a divisão de uma vez.
5. **A projeção da aba Finanças olha para trás.** "Saldo previsto" (`rfFiResumoHTML`) = caixa + média por rodada já realizada × rodadas que faltam. Uma compra recém-feita só pesa na média depois de algumas rodadas, e o salário novo não entra na conta no momento da decisão.

## 7. Base para o alerta (a conta a fazer antes de uma compra)

Tudo o que o alerta precisa já existe como função:

```
rodadasQueFaltam = S.sched.length - S.round
folhaNova        = folha atual + salário do contratado
ritmoPorRodada   = cota de TV (receitaPartes.tvFixa + tvMerito)
                 + bilheteria média (≈ metade das rodadas em casa)
                 − folhaNova − OPEX (REBAL.OPEX × receita-base)
caixaNoFimDoAno  = S.budget − taxa + ritmoPorRodada × rodadasQueFaltam
```

- Se `caixaNoFimDoAno < 0` → **aviso vermelho**: "Com esta compra você termina a temporada com −X".
- Se `ritmoPorRodada < 0` → **aviso amarelo**: "Sua folha passa a custar mais do que a TV e a bilheteria rendem. Você perde Y por rodada."
- Não contar prêmios na projeção (são incertos). No máximo, mostrar à parte: "o prêmio mínimo da sua divisão é Z".
- Mostrar em quantas rodadas o caixa vira: `S.budget − taxa` ÷ |ritmoPorRodada|.
- Os mesmos pontos de entrada servem para leilão (lance), obra de estádio e renovação com aumento.

---

### Divergência a conferir

`mpFinances` (`core.js` ~l. 5759, caminho antigo do multiplayer) paga a meta de 50% dos jogos como **4 semanas** de salário; `processFinances` (solo) paga **2**. Se `mpFinances` ainda estiver em uso em algum lugar, as duas contas discordam.
