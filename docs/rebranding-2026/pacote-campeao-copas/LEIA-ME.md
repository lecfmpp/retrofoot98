# Modais de campeão das copas — pacote de entrega

## Telas

| Arquivo | |
|---|---|
| `Modal - Campeao da Copa.dc.html` / `... - Mobile.dc.html` | Copa do Brasil |
| `Modal - Campeao da Libertadores.dc.html` / `... - Mobile.dc.html` | Libertadores |
| `Modal - Campeao da Sul-Americana.dc.html` / `... - Mobile.dc.html` | Sul-Americana |
| `PROMPT-IMPLEMENTACAO.md` | Prompt para o Claude: estrutura, regras de conteúdo, identidade por copa, contrato de dados, critérios de aceite |
| `support.js`, `image-slot.js`, `assets/` | Runtime, componente da arte e imagens |

## Como abrir

Mantenha a pasta junta e abra qualquer `.dc.html` no navegador.

A área da arte da comemoração é um espaço para imagem: arraste um arquivo em cima dela para ver o modal com a arte real (a manchete, o troféu e o degradê ficam por cima). **Eu não gero imagens** — essas artes precisam vir prontas do jogo ou de um gerador de imagem.

## Escudos e artes provisórios

Os escudos usados são os que existem na pasta do projeto (Boca Juniors e Independiente estão com escudo emprestado). Troque pelos arquivos reais na implementação.

## Como usar com o Claude

Mande o `PROMPT-IMPLEMENTACAO.md` inteiro junto com os 6 HTML. O prompt já separa o que é um modal só (estrutura) do que muda por competição (cabeçalho, rótulo, painel de pontos, troféu) e traz a variante de quando o campeão **não** é o clube do jogador — sem pontos de treinador.
