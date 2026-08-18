# Plano — Motor de calendário por slots, e a fundação multi-país

Escrito em 2026-08-17, depois de achar a causa raiz do "a final acontece sem o jogador".
Substitui o plano em prosa de `como-funciona-o-calendario.html` (que continua válido como
explicação do problema).

---

## 0. A causa raiz, medida

Nas TRÊS salas com `day_plan` no banco (`LXS6H` — a de 3 humanos —, `CMP7F` e `UGW92`), a
**final da Sul-Americana está agendada ANTES da semifinal**:

| posição no plano | competição | rodada | dia |
|---|---|---|---|
| 60 | Sul-Americana | idx 10 (final) | 264 |
| 61 | Sul-Americana | idx 9 (semi)   | 266 |

Reproduzido fora do banco com `buildDayPlan`:

- continentais com **11** rodadas → inversão na Sul-Americana;
- continentais com **12** rodadas → inversão na Sul-Americana **e na Libertadores**.

12 é o total real da Libertadores quando ela gasta o tique extra do sorteio das oitavas
(`cupTotalRounds` = `roundsTotal + 1 + ko`). É por isso que a final da Libertadores não foi vista.

### Por quê

`buildDayPlan` mistura dois sistemas de coordenadas:

- a **jornada** de cada rodada vem de `ancorarNaTemporada(buildCupSchedule(...))`, que espreme
  a competição para caber na temporada;
- o **dia** vem de `cupMatchDayByRound(k, i)` — a *i-ésima data da folha* —, que **não se move**
  quando a ancoragem move a jornada. Para as rodadas que a folha não cobre (a final), o dia é
  sintetizado de `leagueMatchDay(jornada)+1`.

E `dias.sort((a,b)=>a.dia-b.dia)` ordena **por data**. A jornada fica crescente — a invariante
que o código protege e documenta — mas a data fica invertida, e quem manda no ponteiro é a data.
A invariante que importava nunca foi verificada.

**Conclusão de projeto:** o defeito é a existência de duas coordenadas. Slot resolve por
construção, não por conserto. É por isso que a especificação de slots é adotada.

---

## Princípio único do plano

> Existe UMA coordenada ordenável para a temporada: `(slot, janela)`.
> A data do calendário real é um **rótulo derivado** dela, nunca uma segunda fonte de verdade.

Ordem dentro do slot: `MIDWEEK_1 < MIDWEEK_2 < WEEKEND`.

Isso também resolve, sem sort por data, o caso que obrigou o sort por data: a final da Copa do
Brasil (06/12) é depois do último jogo da liga (03/12). Ela deixa de disputar a jornada 37 e
passa a ocupar um **slot próprio depois do último slot de liga**. A "matriz de slots" não é só
arrumação: é o critério de desempate que faltava.

---

## Fase 0 — Stopgap ✅ FEITO (commit 4fc9f33)

**Objetivo:** voltar a ver as finais na próxima Resenha, sem esperar a fundação.

- Em `buildDayPlan`, trocar a chave de ordenação de `dia` para `(jornada, ordemDeJanela)`,
  com a janela derivada provisoriamente da competição (copa = midweek, liga = weekend) e a
  Copa do Brasil final ancorada depois do último slot de liga.
- Acrescentar uma asserção barata no fim de `buildDayPlan`: para cada competição, os `idx`
  aparecem em ordem crescente na lista final. Se não aparecerem, **conserta e loga** — nunca
  lança (travar já matou uma sala; ver `prorrogarPorCopasPendentes`).

**Aceite:** rodar `buildDayPlan` com totais 11 e 12 nas continentais e obter zero inversões;
uma sala nova mostra a semifinal antes da final nas três copas.

**Risco:** baixo e contido a uma função. É jogado fora na Fase 2 — de propósito.

---

## Fase 1 — Harness v2 (porta de entrada das fases seguintes)

Hoje o harness de 2 clientes (`public/harness/`) só exercita semana de UM estágio: sem
`NET.resolveRound`, o anfitrião fecha pelo caminho local e a quarta dedicada de copa nunca é
testada. Sem isso, nada abaixo é verificável a não ser jogando 38 jornadas.

- Mockar `resolve-round` com estágios no `__HSRV`.
- Cenário novo: **semana com três copas + liga**, com 3 assentos humanos.
- Cenário novo: **temporada acelerada até a final** — pular direto para os últimos 10 slots e
  exigir que as três finais aconteçam, com campeão e taça, em todos os assentos.

Esse segundo cenário é o teste de regressão do bug da Fase 0. Ele é a rede permanente.

---

## Fase 2 — Motor de slots (`world-rules` v2)

Onde: `public/src/engine/world-rules.js` (propagado byte a byte ao `resolve-round` por
`scripts/sync-world-rules.mjs`).

Contratos:

```js
JANELAS = ['MIDWEEK_1','MIDWEEK_2','WEEKEND'];       // ordem dentro do slot
chave(slot, janela) = slot*3 + JANELAS.indexOf(janela)   // estritamente monótona
```

- `buildDayPlan` passa a montar a partir de `(slot, janela)` e a ordenar por `chave`. O `dia`
  continua no objeto do plano — como **rótulo**, vindo do mapa de datas do país.
- `ancorarNaTemporada` e o sort por data saem. A ancoragem some porque a folha por país já
  declara os slots: nada precisa ser espremido.
- `prorrogarPorCopasPendentes` **fica**, como rede de segurança que passa a quase nunca disparar
  (o validador da Fase 3 pega antes). Mantém o comportamento de estender, nunca travar.

Salas e saves atuais são descartáveis (decisão do usuário em 17/08), então **não há migração nem
versionamento de plano** — o que corta a parte mais cara e mais arriscada do trabalho.

---

## Fase 2b — Tirar o Brasil de dentro do `resolve-round` ✅ FEITO (d0b3027, b44412e, b358785, 2b0e3c3)

### O diagnóstico, medido em 17/08 no código atual

O "100% Brasil" do servidor não é a resolução inteira — é um punhado de tabelas congeladas,
todas no bloco da virada de temporada:

```
DIV_ORDER                                     13 usos
DIVISION_SIZE / PROMO / RELEG                  2 usos cada
DIVISION_FORCE_RANGE / DIV_FORCE_CAP           por letra A/B/C/D
BAND_BY_DIV                                    já conhece PL/ES/IT/DE/PT e CH/ES2/IT2/DE2/PT2
BR_FIRST / BR_LAST                             nomes de regen, só brasileiros
LIB_SLOTS_BR / SUL_SLOTS_BR                    5 usos
```

O cabeçalho do bloco diz `Config brasileira (Resenha = sempre Brasil)`. O **cliente já resolveu
o mesmo problema**: `setUniverse(key)` (`core.js:2825`) troca `DIV_ORDER`, `DIVISION_SIZE`,
`DIVISION_PROMO` e `DIVISION_RELEG` lendo `UNI_CONFIGS` = `window.UNIVERSOS`, que descreve os 15
países. E `INTL_NAME_POOL` (`core.js:3125`) já tem nomes de Espanha, Itália, Alemanha e Portugal.

Ou seja: não falta desenho nem dado. Falta o servidor ler a folha que o cliente já lê — que é
exatamente a causa histórica descrita no cabeçalho do `world-rules.js`.

### A solução, em cinco peças

**1. `S.intlUniverse` já viaja no `shared_state`.** Medido no banco: `shared_state.S` tem
`division:'A'` e `otherDivs {B,C,D}`, e **não** tem `intlUniverse` — porque a sala é sempre Brasil
hoje e o cliente só grava o campo quando é internacional. O servidor passa a ler
`S.intlUniverse || 'brasil'`. **Nenhuma coluna nova, nenhuma migração, retrocompatível por
construção** (ausente = Brasil, que é o que as salas atuais são).

**2. Uma folha a mais, pelo mesmo mecanismo.** `scripts/sync-world-rules.mjs` deixa de injetar
UM arquivo e passa a injetar uma LISTA de folhas, cada uma com seu par de marcadores. Nasce
`public/src/engine/world-config.js`, no mesmo padrão do `world-rules.js` (IIFE sobre `globalThis`
+ `module.exports`, nada de `S`/`CL`/DOM), com:

- `UNIVERSOS` — movido de `data/universos.js`, que vira um re-export de duas linhas para o painel
  continuar funcionando;
- `NAME_POOLS` por país — o `BR_FIRST/BR_LAST` e o `INTL_NAME_POOL` juntos, mais Inglaterra, que
  hoje não existe em lugar nenhum;
- `CONFEDERACOES`;
- as tabelas de força e banda, reindexadas (peça 3).

Detalhe que morde: `universos.js` hoje faz `window.UNIVERSOS = {...}`, e o Deno moderno **não tem
`window`**. A conversão para o padrão `globalThis` é obrigatória, não cosmética.

**3. Indexar por NÍVEL da pirâmide, não pela letra da divisão.** É o coração da fase.

```js
nivel = U.order.indexOf(divisao)     // brasil: A=0,B=1,C=2,D=3   ·   Inglaterra: PL=0, CH=1
```

`BAND_BY_DIV`, `DIVISION_FORCE_RANGE`, `DIV_FORCE_CAP` e `LEAGUE_PRIZE` passam a ser tabelas por
nível. O mapa escrito à mão que hoje traduz PL/ES/IT/DE/PT desaparece — e **qualquer país novo
criado no painel funciona sem tocar em código**, que é o objetivo da fundação inteira.

**4. `rebuildContinentalCups` por confederação.** Hoje assume que `topStandings` é a Série A
brasileira e usa `LIB_SLOTS_BR`/`SUL_SLOTS_BR`. Passa a ler `CONFEDERACOES`:

```js
CONFEDERACOES = {
  CONMEBOL: { copas:['libertadores','sulamericana'],
              vagas:{ brasil:{libertadores:6, sulamericana:6}, Argentina:{...}, ... } },
  UEFA:     { copas:['championsLeague','europaLeague'], vagas:{ Inglaterra:{...}, ... } }
}
```

`CUP_TICK_OFFSET` já reserva os slots de `championsLeague` e `europaLeague` — o desenho já previa.

**5. A trava do CI vale para a folha nova.** `sync-world-rules.mjs --check` já derruba o CI quando
o bloco do servidor diverge da fonte. A folha nova entra no mesmo `--check`. É o que impede a
terceira cópia de voltar.

### Ordem de trabalho, cada passo verificável sozinho

**Como ficou, medido em 18/08:** as seis tabelas da pirâmide, as bandas de força, as copas de
cada país, as vagas continentais, os nomes de regen, a nacionalidade e o código de liga saem
todos de `S.intlUniverse`. Sobraram no servidor apenas literais que são chave de tabela
(`CUP_TICK_OFFSET`) ou o nome da tabela de cotas da copa nacional (`copaBrasilPhaseCash`), cujos
VALORES continuam brasileiros — um país novo precisa da sua própria tabela de cotas, e isso é
dado a preencher, não regra a mudar.

| | Passo | Como se prova |
|---|---|---|
| 1 | `universos.js` vira IIFE; sync passa a aceitar N folhas | refactor puro: `--check` verde e o painel abre |
| 2 | `world-config.js` com as tabelas por nível; servidor usa nível | **Brasil tem de sair byte-idêntico** ao de hoje |
| 3 | As quatro constantes viram leitura de `S.intlUniverse` | cenário de virada no harness: Brasil idêntico; Inglaterra fecha PL=20, CH=24, sobe 3 / desce 3 |
| 4 | `CONFEDERACOES` + `rebuildContinentalCups` | um save inglês remonta Champions/Europa em vez de Libertadores |
| 5 | Pools de nomes por país | regen inglês deixa de se chamar "Gabriel Silva" |

O passo 2 é o teste que importa: se o Brasil não sair **byte-idêntico**, a generalização mexeu em
algo que não devia. `computeDivisionSwap` está documentado como "provado byte-idêntico ao
cliente" — por isso cliente e servidor têm de receber o mesmo refactor na mesma entrega, e por
isso a folha compartilhada não é opcional.

### Por que depois do harness v2, e não antes

A virada de temporada roda **uma vez a cada 38 jornadas** e não tem teste nenhum hoje. Mexer em
promoção e rebaixamento no servidor autoritativo sem rede é o tipo de mudança que se descobre em
dezembro — que é exatamente o modo de falha que este plano existe para acabar. O harness v2 ganha
um **cenário de virada de temporada** como pré-requisito desta fase.

### O que esta fase NÃO entrega

País jogável. Para jogar a Premier League faltam ainda elencos (`bgLeagues` guarda só
`{clubIds, sched, table}`), o calendário do país (Fases 3 e 4) e as travas do cliente
(`onlineBeginSeason` força `setUniverse('brasil')`, `RESENHA_START_DIV='D'`, `resenhaOfferClubs`
filtra só Brasil). Vale antecipar porque é fundação barata, porque evita mexer na virada de
temporada duas vezes, e porque é ela que faz "criar um país no painel" virar verdade em vez de
promessa.

## Fase 3 — Uma folha por país, fora do motor, com validador

### Formato

Um arquivo por país, no padrão já usado por `universos.js` (atribuição a `window`, carregado por
`<script>` — nada de `fetch`, para não introduzir ordem de carga assíncrona no boot do motor):

`public/src/data/calendars/brasil.js`

```js
window.CALENDARIOS = window.CALENDARIOS || {};
window.CALENDARIOS.brasil = {
  pais: 'brasil',
  slots_total: 40,
  competicoes: [
    { id:'liga',        tipo:'LIGA',      janela:'WEEKEND',
      slots:[1,...,38] },
    { id:'copaBrasil',  tipo:'MATA_MATA', janela:'MIDWEEK_2',
      slots:[4,8,14,20,26,32,40], formato:{ rodadas:7, idaEVolta:true } },
    { id:'libertadores',tipo:'GRUPOS_E_MATA_MATA', janela:'MIDWEEK_1',
      slots:[5,7,9,12,15,18,23,28,33,37,39], formato:{ grupos:8, avancamPorGrupo:2, rodadasGrupo:6, tiqueDeSorteio:true } },
    { id:'sulamericana',tipo:'GRUPOS_E_MATA_MATA', janela:'MIDWEEK_2',
      slots:[6,10,13,16,19,22,24,29,34,38], formato:{ ... } }
  ],
  datas: { /* slot+janela -> 'MM-DD', só rótulo */ }
};
```

Diferenças deliberadas em relação à especificação original: `formato` é obrigatório (é dele que
sai o total de rodadas de verdade, incluindo o tique de sorteio), e as datas são um mapa separado
— para deixar explícito que são rótulo.

### `validarCalendario(pais)` — a porta obrigatória

Roda na montagem da temporada e no CI. **Avisa e completa; nunca trava.**

1. `slots.length >= totalDeRodadas(formato)` — incluindo o tique de sorteio. *É esta regra que
   teria pego o bug.*
2. Slots estritamente crescentes por competição, e a ordem no plano final igual à ordem das
   rodadas da competição. *É a invariante que quebrou.*
3. Nenhum clube joga duas vezes no mesmo `(slot, janela)`.
4. Toda competição chega à final dentro de `slots_total`.
5. Duas competições do mesmo país nunca partilham `(slot, janela)` — é o que mantém a sala
   inteira sempre na mesma tela.
6. Liga: `slots.length === 2*(clubes-1)`.

O que faltar, o validador completa na hora (estendendo a faixa da competição) e registra em
`S.roundNews` e no console — o conserto deixa de acontecer em dezembro.

### Propagação ao servidor

`scripts/sync-world-rules.mjs` passa a injetar **também** os calendários no `resolve-round`,
pelo mesmo mecanismo de marcadores. Sem isso volta a haver duas cópias das mesmas datas — que é a
causa histórica documentada no cabeçalho do `world-rules.js`.

### Países da primeira leva

Reusando o que já existe em `UNIVERSOS` (15 países já configurados com divisões, acesso,
rebaixamento e `foreignMax`): Brasil, Inglaterra, Espanha, Itália, Alemanha, Portugal, Argentina,
Colômbia. Com slots, ligas de tamanhos diferentes deixam de ser problema — uma liga de 18 clubes
ocupa 34 dos 38 slots de fim de semana e pronto. Não é preciso restringir a ligas de 20.

---

## Fase 4 — Autoria pelo painel admin

O painel **já tem** a maior parte disto e não foi aproveitado: a aba Competições do editor
(`admin/admin.js`, `abaCompeticoes`) edita competições com país, tipo, nº de clubes, acesso,
rebaixamento, vagas continentais e datas; valida conflitos de data; e grava no pacote como a
linha especial `pack_edits.__competicoes__`. O aviso âmbar na própria tela diz que falta só o
motor ler dali.

O trabalho é portanto:

1. **Trocar datas por slots na edição.** A grade passa a ser `slots_total × 3 janelas`, com as
   competições pintadas nas células. A data vira campo de rótulo, opcional.
2. **Rodar `validarCalendario` na tela**, com o mesmo código do motor (importado, não
   reescrito — a regra de ouro deste projeto). Os seis erros aparecem em vermelho antes de salvar,
   com o texto do que falta.
3. **Chave por país:** a linha vira `__calendario__:<pais>`, para um pacote poder trazer vários
   países.
4. **O motor passa a ler o pacote.** `dados.js` já aplica `pack_edits` no cliente e `games.pack_id`
   já existe; o `resolve-round` passa a carregar a mesma linha. Ordem de precedência:
   `pacote da sala` > `arquivo do país` > erro do validador.
**Armadilha medida em 18/08:** `carregarCatalogo()` busca os arquivos em `JOGO_URL`, que é
**produção** (`https://retrofoot98.com.br`), não o localhost — e um único 404 rejeita o
`Promise.all`, deixando a página do Editor sem catálogo nenhum. Acrescentar `world-config.js` (ou
qualquer folha) à lista só depois de o site estar publicado com ela, e de preferência tornando o
carregamento tolerante a folha ausente.

5. **Botão "Duplicar país"** — partir de um país existente e trocar as datas é o caminho de 5
   minutos para acrescentar um calendário novo, que é o que o usuário pediu.

Resultado: acrescentar um país passa a ser preencher uma grade no painel, sem tocar em código.

---

## Fase 5 — Multi-país jogável (solo e Resenha)

Esta é a fase que a fundação habilita, e é a mais cara. O calendário deixa de ser bloqueio; o que
sobra é engine.

1. **`endSeason` é global** e precisa virar por país (a pirâmide em si já foi resolvida na
   Fase 2b).
2. **Elencos**: `S.bgLeagues` guarda só `{clubIds, sched, table}` — sem elencos. País jogável
   exige elenco completo.
3. **Orçamento de tamanho**: `shared_state` já pesa 2,58 MB com os 80 clubes brasileiros (uma sala
   chegou a 3,3 MB) e é lido e gravado a **cada** fechamento de rodada. Regra de projeto para não
   estourar: **só o país ocupado por algum humano ganha elencos completos**; os demais continuam
   leves. Um país extra ocupado ≈ +600 kB.
4. **Travas de Brasil no cliente**: `onlineBeginSeason` força `setUniverse('brasil')`,
   `RESENHA_START_DIV='D'`, `CL.bgCountries=[]`, e `resenhaOfferClubs` filtra só Brasil.

Recorte recomendado para a primeira entrega jogável: **uma sala = um país**, escolhido no lobby.
Isso entrega "outras ligas jogáveis" no solo e na Resenha sem abrir transferência internacional
nem calendários divergentes na mesma sala. Sala com países **misturados** vem depois, e com a
fundação de slots já no ar ela passa a ser trabalho de engine, não de calendário.

---

## Fase 6 — O timeout de ausente (fecha o item 5 do ponteiro de dia)

A especificação pede timeout de 20s marcando o ausente como pronto. O parâmetro existe
(`day_ack(..., ignorar_ausentes_seg)`) e está fixo em 0 **de propósito**: o modal "esperando por
X" nunca foi entregue, e ligar o timeout sem ele faz o jogador perder a final por ter saído da
mesa. Os dois entram juntos, com 45s em vez de 20s, e com "aguardar mais 10s" / "começar sem eles"
como decisão explícita de quem está na sala.

---

## O que NÃO entra

- **Protocolo WebSocket próprio.** Os três eventos já existem sobre o Supabase Realtime
  (`mlive` = ticks, `mready` = kickoff, `mdec` = decisões) e a máquina de estados síncrona está
  no ar desde 07/08 (`day_ack` por assento, `day_status`, `day_idx`/`day_moment`). Trocar o
  transporte não resolve nada do que quebrou e reabre bugs de sincronia já pagos.
- **Eliminar `DateTime`.** O slot manda; a data continua visível, e contratos, mercado e idade
  não são tocados.
- **Espectador obrigatório em toda janela.** Uma semana com as três copas viraria quatro
  transmissões seguidas antes do resumo. Fica opcional, com "pular".

---

## Backup

- Trabalho no worktree `claude/calendar-multiplayer-sync-4c6601`; `main` continua publicável a
  qualquer momento.
- O validador **avisa e completa**, nunca trava. Travar já transformou erro de dado em sala morta.
- O harness v2 (Fase 1) é porta obrigatória das Fases 2 a 5.
- Ferramenta de diff de plano: gerar o `day_plan` novo e o antigo lado a lado para o mesmo país e
  comparar antes de publicar.
- Cada fase termina com deploy para o usuário testar item por item — não se acumula fase.

---

## Ordem e por que ela é esta

| | Fase | Entrega para o jogador |
|---|---|---|
| 1 | Stopgap | as finais voltam a acontecer, já na próxima Resenha |
| 2 | Harness v2 (inclui cenário de virada) | nada visível; é o que impede a regressão |
| 2b | ✅ `resolve-round` sem Brasil embutido | nada visível; fundação multi-país |
| 3 | Motor de slots | nada visível; a classe de bug morre |
| 4 | Folha por país + validador | outros países ganham calendário de verdade |
| 5 | Painel admin | acrescentar país vira trabalho de tela, não de código |
| 6 | Multi-país jogável | outras ligas jogáveis no solo e na Resenha |
| 7 | Timeout + modal de ausente | sala não trava mais por quem saiu da mesa |
