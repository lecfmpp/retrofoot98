# Motor 2.0 — do estudo à implementação

*Escrito em 20/08/2026, a partir do estudo do dono do jogo e das medições feitas no motor atual
(arena com as funções reais, milhares de partidas — ver memória `motor-de-partida-pesos`).*

## 1. Onde o motor atual JÁ coincide com o estudo

| Peça do estudo | Estado no motor atual |
|---|---|
| 90 sorteios, um por minuto | ✅ Existe (`tickMinute`, random walk de posse) |
| Semente determinística por partida | ✅ Existe e é a base da Resenha (mesma seed = mesmo placar em todo cliente e no servidor) |
| DS = 35% goleiro + 65% defesa | ✅ Exatamente esses pesos |
| Energia como fator `0,6 + 0,4×energia` | ✅ Exatamente essa curva |
| Moral <50 ⇒ −15% | ✅ Existe |
| Compressão de craques | ✅ `engForce` (f90→~62; goleiro comprime menos) |
| Contribuição cruzada parcial | ⚠️ Só no nível dos ÍNDICES: `atk = 0,55·OS + 0,45·MS`, `def = 0,72·DS + 0,28·MS`. Nada por jogador |
| Expulsão reduz o time | ✅ 10 em campo ⇒ ×0,90 |
| Laboratório de balanceamento | ⚠️ Existe só como arena improvisada no browser (foi como medimos); não é script de CI |

## 2. Onde o motor atual DIVERGE do estudo — e o que as medições mostraram

**A tática é o problema nº 1, e o estudo nem a prevê.** O estudo tira mentalidade
ofensiva/defensiva do escopo ("o valor estratégico deve vir da escalação e da formação").
O motor atual tem `TACTIC_BETA` (retranca −0,09 / equilibrado 0 / ofensivo +0,10) somando
DIRETO no drift de posse, sem custo nenhum. Medido com times idênticos e mesma formação:
**ofensivo × equilibrado = 82% de vitórias (3,12×0,34); ofensivo × retranca = 99% (5,31×0,09)**.
A tática pesa ~3× mais que um elenco 20% melhor. É a causa real do relato "3-3-4 só dá goleada"
(a CPU joga sempre equilibrado; quem escolhe 3-3-4 tende a pôr ofensivo junto).

**A formação atual tem bônus mágicos — exatamente o que o estudo proíbe.**
`formationEmphasis` aplica multiplicadores por contagem de setor (±4,5% OS, ±4% DS) e
`alphaMidCount` dá +0,018 de drift POR MEIA A MAIS. Medido com tática igual: o meta silencioso é
o **4-5-1 (49% de vitórias)**, não o 3-3-4 (30%, igual ao 4-3-3); o pior é o 4-2-4 (22%).

**As notas de setor são MÉDIAS, não somas — o oposto do problema que o estudo ataca.** Escalar
4 atacantes inclui o 4º melhor e BAIXA a média do ataque; 1 atacante usa só o craque. O estudo
assume somas ("cada atacante 70 soma 70") e prescreve retorno decrescente; nós precisamos do
retorno decrescente pelo motivo INVERSO: ao trocar média por contribuição somada (necessário
para "mais gente no setor ajuda"), o decrescente é o que impede a duplicação de ataque.

**Um jogador é um número só.** Não existem os 6 atributos de linha nem os 4 de goleiro; o
goleiro não tem Reflexo/Posicionamento — ele é só 35% do DS. Não existe tipo de lance
(construção/contra-ataque/bola parada): toda chance resolve pela mesma fórmula `shotConv`.

**Fora de posição não existe** (a escalação por setor impede, mas improvisar não é possível
nem penalizado). **Parâmetros estão espalhados** (`ENG`, `ENG2`, `TACTIC_BETA`, `engForce`,
constantes soltas) em vez do `MATCH_ENGINE_CONFIG` único.

## 3. A restrição que o estudo não conhece: a Resenha

Tudo no motor precisa ser **determinístico e idêntico em três lugares**: cliente que joga,
cliente que assiste e servidor (`resolve-round`). Consequências para o plano:

1. **Atributos ocultos não precisam de migração de banco**: derivam de forma DETERMINÍSTICA do
   próprio jogador — `hashSeed(pid, posição)` escolhe o perfil, e os atributos saem do perfil +
   força atual. O mesmo jogador tem os mesmos atributos em qualquer cliente, para sempre, sem
   escrever nada em lugar nenhum. Evolução de força mantém o perfil e re-escala os atributos.
   (É a adaptação do §4.5/4.6 do estudo ao nosso mundo, onde o elenco vive no save, não numa
   tabela de jogadores.)
2. **O motor novo tem de morar numa folha única** (`match-engine.js` já é compartilhado com as
   edge functions) e a troca cliente+servidor é ATÔMICA, com carimbo de versão no save
   (`S.motorV`), como fizemos com `CAL_VERSAO` — sala antiga continua no motor 1, sala nova
   nasce no 2. Duas versões do motor na mesma sala = placares divergentes, o bug que acabámos
   de matar.
3. A **sessão ao vivo** (pênalti/lesão/expulsão/substituição com modal, prorrogação, disputa de
   pênaltis, transmissão por snapshot) tem de continuar funcionando por cima do motor novo — o
   loop de 90 minutos e a API (`session.step`, `pending`, `applyDecision`) ficam.

## 4. O plano, em fases

**Fase 0 — cirurgia no motor atual (dias, sem redesign).** Mata o desbalanço medido sem
esperar o motor novo: dar custo simétrico à tática (ofensivo: +drift, −defesa efetiva;
retranca: −drift, +defesa) **ou removê-la** (ver decisão em aberto abaixo); reduzir
`alphaMidCount`; validar na arena (meta: nenhum confronto de escolhas com times iguais fora de
~33–45% de vitórias).

**Fase 1 — laboratório de verdade.** `scripts/arena-motor.mjs` headless (o motor roda em node
com um S falso), com a matriz do §14: todas × todas as formações, 80×70, 90×55, energia,
moral, expulsão, distribuição de placares (4+/5+/7+/10+), conversão por faixa de vantagem.
Vira teste de CI como `teste-calendario`. **Sem laboratório não se mexe em motor** — regra da
casa a partir daqui.

**Fase 2 — parâmetros centralizados.** `MATCH_ENGINE_CONFIG` único na folha compartilhada;
`ENG`/`ENG2`/`TACTIC_BETA`/curvas migram para lá. Zero mudança de comportamento (arena prova).

**Fase 3 — atributos ocultos.** Derivação determinística (perfil por `hashSeed(pid)`, 6
atributos de linha / 4 de goleiro, dispersão de 20–35 pontos, força ponderada convergindo ao
overall). Força efetiva = atributo × energia × moral × posição. A ficha do jogador pode até
mostrá-los depois (decisão de UI à parte).

**Fase 4 — setores por contribuição cruzada + retorno decrescente.** DS/MS/OS deixam de ser
médias: cada jogador contribui para 1–3 setores pela tabela do §7, ordenado por contribuição e
com os coeficientes decrescentes do §8.1. Some o `formationEmphasis` e o `alphaMidCount` — a
formação passa a valer só pelo que distribui, como o estudo manda.

**Fase 5 — o minuto em etapas.** Iniciativa (`MS_A/(MS_A+MS_B)` com variação), tipo de lance
(6 tipos do §9.2, cada um lendo atributos diferentes), criação (ataque do lance × defesa do
lance), finalização × goleiro (Reflexo/Posicionamento entram aqui). Variação multiplicativa
0,92–1,08 por disputa. Compressão de domínio + amortecimento por placar largo (§10.1), sem
teto rígido. O random walk de posse morre; o loop de 90 minutos e a API da sessão ficam.

**Fase 6 — calibração e corte.** Rodar a matriz completa até bater os critérios do §18;
sincronizar a folha no `resolve-round` (deploy só por GitHub Actions); `S.motorV=2` para salas
novas; harness de 2 clientes antes de publicar; Resenha real como teste final.

Fases 0–2 são independentes do redesign e entregam valor imediato. 3→6 são sequenciais.

## 5. Decisões que são do dono

1. **O que fazer com retranca/equilibrado/ofensivo?** O estudo os tira do escopo. Opções:
   (a) remover os botões (o valor estratégico fica todo em escalação+formação, como o estudo
   quer); (b) manter com custo simétrico (viram troca de estilo, não força). A Fase 0 precisa
   dessa resposta.
2. **Quando disparar a Fase 0** — ela mexe no placar de TODAS as ligas em andamento (solo e
   Resenha). Sugestão: junto de uma virada de temporada, ou já, avisando os sócios.
3. **Atributos visíveis ou ocultos na ficha do jogador** (não bloqueia nada até a Fase 3).
