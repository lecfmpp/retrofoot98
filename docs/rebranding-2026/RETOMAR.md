# Onde retomar — rebranding 2026

Atualizado em 2026-08-14. Último commit: ver `git log -1`.

## Onde trabalhar

```
/Users/clawdio/Documents/GitHub/Elifoot/.claude/worktrees/retrofoot-new-layout-design-c09780
```

Branch **`claude/retrofoot-new-layout-design-c09780`**. É uma *worktree*, não o checkout
principal. O `~/Documents/GitHub/Elifoot` está em `main`, que ainda tem a pele Windows 98 —
abrir a sessão lá mostra o jogo antigo e dá a impressão de que nada foi feito.

Servidor: **um só, na 5199**, fixado em `.claude/launch.json`.

```bash
open 'http://localhost:5199/?rf=hub'
```

O `?rf=` é atalho de bancada (só localhost): `hub`, `mercado`, `elenco`, `campeonatos`,
`treinador`, `financas`, `email`, `config`. Para a rodada ao vivo não há atalho — chame
`startLiveRound()` na consola e depois `liveTick()` umas dezenas de vezes para haver fatos.

## As telas de referência

Os pacotes do designer estão **dentro do repo**, não no scratchpad (o scratchpad morre com a
sessão):

| Pasta | O quê |
|---|---|
| `docs/rebranding-2026/telas/` | pacotes 1 a 4 |
| `docs/rebranding-2026/telas-v3/` | **o mais recente** — 130 telas, inclui as Ações Internas, o Hub v2, as Abas Completas e as 4 telas novas das 11 ações |

Sempre que houver conflito entre pastas, **vale a `telas-v3`**.

## O roteiro do designer

`docs/rebranding-2026/PROMPT-IMPLEMENTACAO-leva7.md` é o mapeamento tela a tela do pacote v3
para as funções de `main.js` que elas substituem, com a secção **21** dedicada às 11 ações que
faltam. Vale mais do que o `BRIEF-acoes-que-faltam.md`, que é anterior às decisões de desenho.

## O que falta, em ordem

### ~~1 · Modo Camarote~~ — FEITO (commit `63987cb`)
O desenho de `telas-v3/Modo Camarote.dc.html` está no ar, ligado ao motor de sempre. Duas coisas
a saber antes de mexer nele:

- Os ids (`#rf-cam-dyn`, `#rf-cam-hg`, `#rf-cam-min`, `#rf-cam-anel`, `#rf-cam-presh`,
  `#rf-cam-lines`…) são **contrato** com `camUpdate`/`camPatchBoard`/`camPatchFeed`, que
  atualizam no lugar. Trocar um id apaga a animação da narração e faz a barra de pressão pular.
- `main.css` ainda tem `.rf-cam-sw*` (o interruptor da barra da partida), e ele é código morto —
  `camSwitchHTML` só é chamado no trecho de `scLive` que vem DEPOIS do `return rfLiveHTML(RL)`.
  Aliás, todo esse trecho é morto e nunca foi apagado.

### 2 · As quatro telas novas do último pacote
- `Acoes - Opcoes e Estadio.dc.html` — resolve **Opções do jogo** e **Construir arquibancada**.
- `Chamar pra Resenha.dc.html`
- `Avancar Temporada - Acesso.dc.html` e `Avancar Temporada - Rebaixado.dc.html` — o designer
  **dividiu em duas telas** o que o brief pedia como uma só. Melhor assim.

### 3 · O resto das 11 ações
O roteiro é `docs/rebranding-2026/BRIEF-acoes-que-faltam.md`, que diz por ação onde ela fica, o
que a aciona e que dados o motor tem. Continuam sem desenho: histórico do clube, apagar save a
partir da lista de saves, e sair para o menu.

### 4 · Dois gatilhos que faltam (programação, não desenho)
- **Arrematado!** — falta disparar no fecho do lote de leilão.
- **Caixa insuficiente** — falta disparar na validação de caixa da proposta.

### 5 · Limpeza
O Mercado anterior ao pacote de abas ficou órfão e ninguém apagou: `rfMercadoResumoHTML`,
`rfMercadoComprarHTML`, `rfMercadoLinhaHTML`, `rfPropostaCardHTML`, `rfMktLeilaoCard`,
`rfMktVendaCard` em `rf26.js`. Zero chamadas, e são eles que fazem `clMarketPlayer`,
`clAuctionBidPrompt`, `clAcceptOffer` e `clRejectOffer` aparecerem em qualquer busca por
"ainda usa popup antigo".

## Como o código está organizado

| Arquivo | O quê |
|---|---|
| `rf26.js` | envelope, sidebar, `RF_PAGES`, roteador de página, peças partilhadas |
| `rf26-acoes.js` | os 24 diálogos de ação interna (`rfAcao`, `rfAcAbrir('id', dados)`) |
| `rf26-mercado.js` | as 6 abas do Mercado |
| `rf26-elenco.js`, `rf26-campeonatos.js`, `rf26-treinador.js`, `rf26-financas.js`, `rf26-email-config.js` | as outras páginas |
| `rf26-live.js` | Rodada ao vivo |
| `rf26-partida.js`, `rf26-resenha.js`, `rf26-competicao.js`, `rf26-fluxo.js`, `rf26-onboarding.js` | levas 2 a 4 |
| `styles/rf26.css` | a camada de desenho inteira |

Para abrir uma ação de qualquer sítio: `rfAcAbrir('id', dados)`. Os ids estão em `RF_ACOES`,
no fim de `rf26-acoes.js`.

## Duas armadilhas já pagas

1. **O lado do incidente vem em MAIÚSCULA** (`side:'H'`/`'A'`). Comparar com `'h'` fazia a
   Rodada ao vivo ficar sem fato nenhum.
2. **Medir layout com o painel do navegador escondido dá tudo zero** — e parece transbordo em
   todo lado. Antes de diagnosticar overflow, confirme `innerWidth > 0`.

## Perguntas de produto ainda em aberto

1. "Sair para o menu" e "Sair deste save" são a mesma coisa? Se forem, é uma tela só.
2. O histórico do clube vale a pena? Fica quase sempre vazio — o utilizador comandou um clube e
   a classificação tem vinte.
3. As gavetas do Mercado voltaram a ser diálogo porque o pacote de Ações Internas define ação
   interna como diálogo. Se a intenção continua a ser *sem sobreposição*, o corpo dos 24 já está
   escrito e serve nos dois formatos — é trocar o envelope.
