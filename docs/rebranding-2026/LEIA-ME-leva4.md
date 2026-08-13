# Leva 4 — Como usar este pacote

56 arquivos de tela (28 desktop + 28 mobile), o design system e o prompt de
implementação. Todas as telas do documento de cobertura de 2026-08-13 estão aqui,
exceto **Equipa**, descartada por decisão de produto.

## O que abrir primeiro

1. **`PROMPT-IMPLEMENTACAO.md`** — cole inteiro no Claude Code, dentro do
   repositório do RetroFoot98, junto com a pasta `telas/`. As seções 13 a 17
   cobrem esta leva e trazem a função e a classe CSS que cada tela substitui.
2. **`telas/*.html`** — abra qualquer uma direto no navegador. Não precisa de
   servidor nem build; `support.js` já vai junto.

## O que tem nesta leva

**Sobreposições de partida** — Substituição, Lesão, Cartão vermelho, Pênalti
(batedor, suspense, resultado), Disputa de pênaltis, Prorrogação.

**Entre rodadas** — Classificação pós-rodada, Classificação de copa, Visão da
competição, Imprensa, Fim de temporada, Ver time de outro clube.

**Modo Resenha** — Lobby da sala, Pausa patrocinada, À espera da rodada, Passe o
aparelho, Classificação do assento, Entrega do aparelho.

**Fluxo de entrada** — Escolha de moeda, País jogável, Carregando, Número de
treinadores, Escolha dos clubes, Continuar um save, Recuperar senha, Páginas
institucionais.

## Assets que entraram agora

| Pasta | Origem no repositório | Para que serve |
|---|---|---|
| `assets/trofeus/` | `public/img/trofeus/` | Série C, Série D, Copa do Brasil, Libertadores, Sul-Americana — telas de competição e fim de temporada |
| `assets/sponsors/` | `public/img/sponsors/` | Betano, CazéTV, iFood — slider da pausa patrocinada |
| `assets/crests/` | escudos enviados | 6 escudos reais; os demais clubes repetem um deles apenas para validar layout |
| `assets/estadios/` | `public/img/estadios/brasil-d/` | foto do estádio do XV, usada no Camarote |

## Três coisas que não podem mudar na implementação

1. **Troféu é arte real.** Nunca use o escudo do clube nem emoji no lugar dele.
2. **O CTA do patrocinador é só texto.** O logo vai nos tiles brancos do slider,
   nunca sobre o fundo colorido da marca.
3. **O clube do jogador humano usa sempre o próprio escudo**, em qualquer lista.

## Mobile

Cada tela tem o par `- Mobile.html` em 390px: coluna única, cabeçalho sem cantos
arredondados, grades de 3 e 4 colunas reduzidas a 2, e o rodapé de ação
`position:sticky` no pé da tela.
