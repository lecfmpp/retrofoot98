# Checklist — Bugs da virada de temporada (Resenha, sala WEBLG)

Origem: primeira virada de temporada jogada no modo Resenha (https://retrofoot.com.br/?sala=WEBLG), 2026-08-20.
Investigação feita no código de `main` + worktree do rebranding. Cada item traz a causa encontrada e o caminho de correção.

Fluxo de trabalho: um item por vez → implementar → commitar → publicar → usuário testa.

---

## 1. [ ] Tela de finalização de temporada não apareceu para todos os humanos

Um jogador foi direto para o sorteio da Libertadores da temporada nova, sem ver o resumo da temporada que fechou.

**Causa (3 caminhos confirmados):**
- **Reconexão/reload engole a virada** — [local-transport.js:1295](public/src/net/local-transport.js:1295)-1340: ao entrar na sala o cliente faz `Object.assign(S, savedState.S)` sem checar se a temporada virou enquanto ele estava fora. Não abre resumo, não abre sala de imprensa e **nem roda `applyMyPrevSeasonPrizes()`** — ou seja, esse jogador também perde a premiação em dinheiro.
- **`isTurnover` é palpite local** — [main.js:7967](public/src/ui/main.js:7967) e [local-transport.js:469](public/src/net/local-transport.js:469) comparam `S.season` local vs servidor. Se o cliente já adotou o estado novo por outro caminho, o ramo do resumo nunca dispara e a tela se perde para sempre.
- **Sorteio da copa nova abre por cima** — o guard de `onlineOpenQueuedDraw()` ([local-transport.js:2197](public/src/net/local-transport.js:2197)) só olha `CL.screen!=='main'`, mas os momentos de fim de temporada e o `onlineSeasonEndDialog` são overlays com `CL.screen==='main'`. O sorteio da Libertadores enfileirado em [main.js:8002](public/src/ui/main.js:8002) atropela o resumo. (Mesmo padrão da memória "ninguém ocupado não é dia cumprido": decisão por palpite local em vez de carimbo por assento.)

**Correção:** carimbo explícito por assento no servidor — `season_summary_seen` (ou campo no `game_seats`) marcando "vi o resumo da temporada N". Cliente que adota estado com `season > carimbo` abre o resumo (e aplica premiação) antes de qualquer outra coisa; guard do sorteio segura enquanto houver momento/resumo aberto.

---

## 2. [ ] Grupo H da Sul-Americana com só 3 clubes

**Causa:** a edição real de 2026 tem **7 brasileiros** na Sul-Americana, mas a cota do servidor é fixa em 6 ([resolve-round/index.ts:1269](supabase/functions/resolve-round/index.ts): `SUL_SLOTS_BR = 6`). Na virada, o servidor recicla os estrangeiros da edição anterior (25) + 6 brasileiros novos = **31 clubes**, e `splitIntoGroupsT` fatia de 4 em 4 sem exigir múltiplo → 7 grupos de 4 + grupo H com 3. **É permanente**: 31 vira 31 de novo todo ano.

**Correção:** normalizar o total para múltiplo de 4 (32) antes de fatiar — completar com o próximo da tabela da liga ou com estrangeiro reciclado; e validar `total % 4 === 0` nas duas copas. O mesmo furo existe no solo ([core.js:2100](public/src/engine/core.js:2100) e o filtro de `uid` em 2105-2120).

---

## 3. [ ] Campeão da Sul-Americana não vai para a Libertadores seguinte

**Causa: a regra não existe.** Todas as fontes de vaga (cliente e servidor) usam só posição na liga: 1º-6º → Libertadores, 7º-12º → Sul-Americana. Nenhuma consulta campeão de copa. Um clube pode ser campeão da Sula e ficar fora das duas copas se terminou 13º.

**Correção (definir regra antes):** campeão da Sula ganha vaga na Libertadores seguinte (como na vida real); campeão da Libertadores idem. A vaga entra no lugar do 6º/12º da liga (sem inflar o total — ver item 2). Implementar nos dois lugares: `rebuildContinentalCups` (servidor) e `computeQualification`/`unifiedContinentalQualification` (solo).
Pergunta da memória de copas: antes de mexer, conferir colisão de jornada entre as duas copas.

---

## 4. [ ] Jogo está repetindo os clubes das copas?

**Resposta: parte sim, parte não.**
- **Brasileiros: dinâmico e correto.** Usa a tabela final real da temporada que fechou (`_prevTables` no servidor, `S._topFinalStandings` no solo). O bug antigo da lista congelada por overall já foi corrigido.
- **Estrangeiros: estáticos para sempre.** O servidor recicla exatamente os mesmos estrangeiros da edição anterior, por design (não simula as ligas vizinhas). Nunca trocam de copa entre si.

**Correção (decidir escopo):** aceitar como limitação por ora, ou criar rotação leve (ex.: embaralhar/promover-rebaixar alguns estrangeiros entre Liberta e Sula por temporada) sem simular as ligas. Ligado ao adiamento "Resenha multi-país".

---

## 5. [ ] Histórico de campeões e artilheiros de TODAS as competições, TODOS os anos

**Causa:** `S.history` guarda por temporada só o campeão **da divisão do jogador** e **1 artilheiro** (o da divisão do jogador). Campeões das outras divisões e das copas viram strings soltas; artilheiro por competição não existe no servidor (`S.scorersByComp` só existe no worktree do rebranding, e nem lá o caminho Resenha grava `divChamps`/`artPorComp`).

**Correção:**
- Servidor (`resolve-round`): na virada, gravar em estrutura append-only no `shared_state` (ex.: `S.archive[season]`): campeão de cada divisão, campeão de cada copa (nacional + Liberta + Sula), artilheiro por competição.
- Portar `S.scorersByComp` para o servidor (hoje só mexe em `S.scorers`).
- Preencher `divChamps`/`artPorComp` também no caminho Resenha (`registerPrevSeasonTitles`).

---

## 6. [x] Classificações finais de todas as competições — nunca se apagam, vão pro servidor

**Feito em 2026-08-21 (aguardando teste):** nasceu o `S.archive` — append-only, uma entrada por temporada, com as tabelas finais das 4 divisões, artilharia (top 25) e cada copa compacta (campeão, grupos, mata-mata, sem narração). Escrito pelo servidor na virada (`archiveSeasonT` no resolve-round) e pelo cliente no solo (`archiveSeason` no core.js). O resgate (`backfillArchiveT` / `archiveBackfill`) recupera a temporada fechada da WEBLG do `_prevSeason` no próximo resolve — só os grupos das continentais dessa 1ª temporada não são recuperáveis. UI: filtro de temporada em Campeonatos ganhou os cartões de classificação final (ligas, grupos e mata-mata das copas) e a artilharia arquivada. Coberto pelo bloco 7 do `teste-virada.mjs` (portão do deploy).

**Causa:** a tabela completa da temporada vai para `S._prevSeason`, que é um **buffer de uma temporada só, sobrescrito na virada seguinte**. Da temporada N, em N+2 só sobra top3 + rebaixados da divisão do jogador. Não há tabela Supabase de histórico — tudo vive em `games.shared_state` (jsonb).

**Correção:** arquivar por temporada, permanente, no `shared_state` (ou tabela própria se pesar): tabelas finais das 4 divisões + fases/grupos finais das copas. UI: qualquer usuário consulta a classificação final de qualquer competição de qualquer temporada.

**URGENTE antes da próxima virada da WEBLG:** o `_prevSeason` da temporada que acabou de fechar **ainda existe** no `shared_state` da sala. Se o arquivamento entrar antes da próxima virada, essa temporada é salva; senão, morre.

---

## 7. [ ] Filtro de temporada no Perfil está nas abas erradas (worktree rebranding)

Regra definida pelo usuário:
- **Sem filtro de tempo:** Perfil (estático, editável pelo usuário) e Ofertas (do momento).
- **Com filtro de tempo:** Ranking, Sala de Troféus, Carreira, História.

**Estado atual** ([rf26-competicao.js:1446](public/src/ui/rf26-competicao.js:1446)-1600, no worktree): a barra de chips é injetada no envelope da **página** inteira, então aparece também em Perfil/Ofertas (caindo num "sem arquivo"). Ranking hoje é tratado como "do momento" (retorna `null`).

**Correção:** esconder a barra de chips nas abas Perfil e Ofertas; adicionar suporte a arquivo por temporada na aba Ranking. Depende dos itens 5/6 para ter dado histórico de verdade.

---

## 8. [x] Sidebar: só a publicidade no cartão do pé

Pedido de 2026-08-20: remover o "Próximo jogo" + adversário do cartão do pé da sidebar — a informação já vive no cartão do adversário dentro do bloco Formações. O cartão fica só com o quadrado do patrocinador.
Feito em `rfSidebarHTML` (rf26.js) + limpeza do CSS morto (`rf-sb-next-hd/opp/livre`). Aguardando teste do usuário.

## 9. [x] Bloco Formações: pílulas à esquerda, próximo jogo à direita

Pedido de 2026-08-20: inverter as duas colunas do bloco Formações — pílulas de formação (com o "Seleccionar descansados") na coluna esquerda, cartão do adversário/próximo jogo na direita. Feito trocando a ordem em `rfHubHTML` e invertendo a proporção do grid `.rf-form-duas` (o adversário mantém a coluna um pouco maior). Aguardando teste do usuário.

---

## Ordem sugerida

1. **Item 6** (arquivar classificações) — urgente: salva a temporada que fechou na WEBLG antes da próxima virada.
2. **Item 5** (campeões/artilheiros por competição) — mesma mexida no `resolve-round`, natural fazer junto.
3. **Item 2** (grupo de 3) — se repete toda temporada.
4. **Item 1** (tela de finalização + premiação perdida na reconexão).
5. **Item 3** (vaga do campeão da Sula) — depende de definir a regra.
6. **Item 7** (filtro no perfil) — worktree do rebranding, depende de 5/6.
7. **Item 4** (rotação de estrangeiros) — decidir escopo, pode ficar.
