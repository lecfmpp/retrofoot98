# Sugestões de mudança na mecânica do jogo — para depois

**Status:** backlog, pausado em 2026-07-08
**Contexto:** desdobramento técnico das recomendações do [Elifoot2026_Motor_de_Simulacao_Relatorio.pdf](Elifoot2026_Motor_de_Simulacao_Relatorio.pdf) (já compartilhado com o sócio). Aqui vai o nível de detalhe de implementação — arquivo, linha, esforço estimado — para quando decidirmos retomar.

Nenhum destes itens foi implementado ainda. Ordem = impacto estimado, não urgência.

---

## 1. Job periódico de atualização de dados reais (maior impacto)

**Problema hoje:** todo o elenco vem de `window.GAME_DATA` ([public/index.html:646](../public/index.html)), um JSON estático embutido no HTML, capturado uma vez ("Investbola/Transfermarkt", temporada "Brasileirão 2026") e nunca mais atualizado. Força, lesões e valor de mercado ficam congelados no momento da captura.

**Proposta:** criar uma Supabase Edge Function agendada (cron) que sincroniza a tabela `elifoot_v3.division_clubs` com uma fonte real atualizada periodicamente (ex: semanal). O jogo já sabe ler esses dados via `loadRealDivisionClubs()` ([public/index.html:1548](../public/index.html)) e `normalizeDivisionClubRow()` ([public/index.html:1536](../public/index.html)) — falta só popular/atualizar a tabela de origem.

**Depende de:** escolher a fonte de dados (API paga tipo Transfermarkt/Sofascore, ou scraping próprio) e decidir a frequência.

**Esforço:** médio-alto (depende da fonte escolhida).

---

## 2. Moral inicial ponderada por momento real do clube

**Problema hoje:** todo jogador de todo clube começa com `moral:70` fixo — ver `newGame()` ([public/index.html:1529](../public/index.html)) e `mpBuildInitialState()` ([public/index.html:1635](../public/index.html)). Não reflete crise, fase boa, ou pressão sobre o técnico no mundo real.

**Proposta:** ao sincronizar os dados reais (item 1), trazer também um indicador simples de momento do clube (ex: resultados dos últimos 5 jogos reais) e mapear para um valor inicial de moral por clube em vez do 70 universal.

**Depende de:** item 1 estar implementado (mesma fonte de dados).

**Esforço:** baixo, uma vez que o item 1 exista.

---

## 3. Mando de campo variável por clube

**Problema hoje:** `gammaHome=0.06` ([public/index.html:938](../public/index.html)) é um bônus fixo e idêntico somado ao `mu` para os 700+ clubes do jogo, dentro de `simulateMatch()` ([public/index.html:961](../public/index.html)) e `mpSim()` ([public/index.html:1662](../public/index.html)). Não pondera capacidade de estádio, público médio real nem efeito visitante.

**Proposta:** substituir a constante fixa por um valor por clube, calculado a partir de um dado real simples (capacidade do estádio ou público médio) já trazido junto com o item 1. Manter um piso/teto (ex: 0,03–0,10) para não desequilibrar o motor.

**Depende de:** item 1 (precisa do dado de estádio/público na sincronização).

**Esforço:** baixo — é trocar uma constante por um lookup, a lógica de `mu` não muda.

---

## 4. Fator de rivalidade / clássico

**Problema hoje:** não existe conceito de rivalidade no motor — um clássico roda com a mesma lógica genérica de qualquer confronto da rodada.

**Proposta:** tabela estática de pares de clubes rivais (não depende de dado externo, pode ser curada manualmente) que aplica um pequeno ajuste de variância extra (não necessariamente de força) nesses confrontos específicos — ex: aumentar levemente o `sd` (desvio) do passeio aleatório em `ENG` ([public/index.html:939](../public/index.html)) só para esses jogos.

**Depende de:** nada — pode ser feito isolado, sem esperar os outros itens.

**Esforço:** baixo.

---

## 5. Importar lesões e suspensões reais no início da temporada

**Problema hoje:** todo o elenco começa 100% disponível (`suspended:0`, `injuredMatches:0` implícitos) — lesões e suspensões só existem quando geradas pelo próprio motor durante a partida (`applyMatchIncidents()`, [public/index.html:1765](../public/index.html)).

**Proposta:** ao sincronizar os dados reais (item 1), trazer também o status real de lesão/suspensão de cada jogador no momento da captura, e usar isso para inicializar `p.suspended` / `p.injuredMatches` no início da temporada.

**Depende de:** item 1 (mesma fonte de dados precisa incluir departamento médico).

**Esforço:** baixo depois do item 1 — são só dois campos a mais no payload.

---

## 6. Ligar atributos técnicos a dados reais quando existirem

**Problema hoje:** os atributos individuais (finalização, passe, drible etc., escala 1–20) são inteiramente sintéticos — gerados por `genAttrs()` ([public/index.html:754](../public/index.html)) a partir de um único número de força geral (`p.f`), não de estatística real nenhuma.

**Proposta:** onde houver estatística real disponível na fonte de dados (xG, passes certos, desarmes por jogo), usar isso para calibrar os atributos específicos em vez de derivar tudo do overall único. Pode ser feito de forma incremental — só para os atributos onde a fonte de dados tiver boa cobertura.

**Depende de:** item 1, e de a fonte de dados escolhida ter estatísticas granulares (nem toda fonte tem).

**Esforço:** alto — é a mudança mais profunda no motor de geração de atributos.

---

## Lacunas que ficam de fora deste backlog (por ora)

Do relatório original, estes pontos não viraram item de backlog ainda por serem mudanças de escopo maior ou dependerem de decisão de produto primeiro:

- Fadiga de calendário real (jogos continentais no meio de semana, viagens)
- Fator de "importância da partida" (final de copa, rebaixamento na última rodada)
- Táticas além das 3 categorias atuais (retranca/equilibrado/ofensivo) — exigiria redesenhar `TACTIC_BETA` e possivelmente a interação entre formações

Retomar esta lista quando o roadmap dos 6 itens acima estiver definido.
