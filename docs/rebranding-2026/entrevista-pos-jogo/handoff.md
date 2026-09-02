# Handoff: Modal de Entrevista Pós-Jogo (desktop + mobile)

## ⚠ Antes de implementar

- **Nomes de competições, clubes e troféus foram ajustados no jogo depois deste design.** Os textos do protótipo (`XV 2 × 1 Cianorte`, `Série D`, `XV de Piracicaba`, `Dida Mesquita`, `Rádio Interior`) são exemplo. Puxe os nomes reais do estado da partida e do clube na implementação, e confira o mapeamento atual de troféus/competições antes de reaproveitar qualquer rótulo.
- **As fotos são slots vazios de propósito.** No protótipo são áreas de drop; na implementação use o avatar do treinador já existente no jogo e a foto/avatar do repórter (ou um retrato genérico por veículo).
- **Os deltas de moral e de segurança no cargo são valores de design, não balanceamento.** Ajuste com quem cuida da mecânica; o design só assume que cada resposta tem um par (`Δ moral`, `Δ cargo`) e um par de reações (imprensa, torcida).

## Overview

Modal de entrevista pós-jogo: o treinador responde a 3 perguntas da imprensa e cada resposta move, na hora, duas barras de destaque — **moral do time** e **segurança no cargo do treinador** — além de gerar a repercussão de imprensa e torcida. É a ponte de UI para conectar respostas à mecânica do jogo.

Composição: foto do treinador à esquerda, foto e nome do entrevistador à direita, quiz no centro (pergunta no topo, botões de resposta abaixo), barras de destaque na base.

## About the Design Files

Os arquivos em `design/` são **referências de design em HTML** — protótipos de aparência e comportamento, não código de produção. A tarefa é **recriar estas telas no ambiente já existente do jogo** (HTML/CSS/JS vanilla em página única, `public/index.html`), usando as classes e padrões que já existem lá. Abrem direto no navegador se `support.js` e `image-slot.js` estiverem ao lado.

## Fidelity

**Alta fidelidade.** Cores, tipografia, espaçamentos, transições e estados estão finais.

## Telas

### 1. Desktop — `Modal - Entrevista Pos-Jogo.dc.html`

- **Fundo (sala de imprensa)**: `radial-gradient(120% 90% at 50% 0%,#123a5e,#0e2a41 52%,#08131c)`, faixas horizontais `repeating-linear-gradient(180deg,rgba(255,255,255,.03) 0 44px,transparent 44px 88px)` e dois halos de flash (220px branco e 260px `rgba(242,185,12,.4)`) com `flashPulse` 3.4s / 4.6s `ease-in-out infinite` entre opacidade .14 e .36.
- **Cartão do modal**: 940px de largura, `border-radius:24px`, `#fff`, `box-shadow:0 44px 100px -44px rgba(0,0,0,.78)`.
- **Cabeçalho**: gradiente `linear-gradient(100deg,#0e2f66,#17458F 62%)`, padding `18px 22px`, barra amarela `#F2B90C` de 5px à esquerda. Kicker mono 10px `.14em` `#a9bfe0` (`PÓS-JOGO · 12ª RODADA · XV 2 × 1 CIANORTE`), título 22px/700 branco. À direita, chip `AO VIVO`: fundo `#c0392b`, raio 99px, ponto de 9px com `liveDot` 1.4s.
- **Corpo**: grid `196px | 1fr | 196px`, `gap:14px`.
  - **Coluna do treinador**: cartão branco borda `#dde7db` raio 18px. Foto 196px de altura (`object-fit:cover`) com degradê inferior `rgba(9,18,13,.94)→0` a 56% e etiqueta `TREINADOR` (mono 9px, fundo `#F2B90C`, texto `#0b1710`). Abaixo: nome 16px/700, faixa do clube (barra `#17458F` de 4px + texto 12px `#78877c`), divisor `#e6ece4`, duas linhas mono `NO CARGO 14 jogos` e `APROVEITAMENTO 58%`.
  - **Coluna central (quiz)**:
    - **Cartão da pergunta**: borda `#dde7db` com borda-esquerda 4px `#F2B90C`, raio 18px, padding `16px 18px`. Kicker mono 10px/700 `#17458F` (`PERGUNTA 1 · O JOGO`), pergunta 21px/700 `-.02em` `line-height:1.3`, nota 12.5px `#78877c`. À direita do kicker, indicador de passos: pontos de 8px (`#dde7db` pendente, `#F2B90C` atual — que estica para 22px de largura, `#17458F` respondida), `transition:all .25s ease`.
    - **Botões de resposta** (3): cartão branco, borda `#dde7db`, raio 14px, padding `13px 15px`, cursor pointer, `transition:border-color .18s, background .18s`; hover `border-color:#17458F; background:#f7faf6`. Conteúdo: tom em mono 9px/700 `.14em` `#17458F` (`PROTETOR`, `DIRETO`, `TÉCNICO`, `ABRAÇO`, `AMBÍGUO`, `DURO`, `INSTITUCIONAL`, `PRESSÃO`, `IRÔNICO`), fala 14px/600 `#12201a`, e dois chips de prévia de impacto (`moral +6`, `cargo −2`) — verde `#2f8f4a` sobre `#eaf6ee`, vermelho `#c0392b` sobre `#fbeceb`, mono 10px, raio 6px. Os chips de prévia podem ser desligados (prop `mostrarPrevias`) se a mecânica preferir esconder o impacto.
    - **Repercussão imediata** (aparece após responder, `entraResposta` .28s): cartão `#f6f8f5` borda `#e6ece4` raio 16px, com duas linhas — etiqueta `IMPRENSA` (fundo `#e8eef7`) e `TORCIDA` (fundo `#f4ecd2`), texto 12.5px `#3a473f`.
  - **Coluna do repórter**: igual à do treinador; etiqueta `REPÓRTER` em `#17458F`/branco, faixa vermelha `#c0392b`, linhas mono `TOM DA COLETIVA` (neutro / cordial / tenso / quente, cor conforme o tom) e `PERGUNTAS 1 / 3`.
- **Barras de destaque**: grid de 2 colunas, cartões brancos raio 18px. Cada um: rótulo mono 10px/700 `.14em` `#8b978d` (`MORAL DO TIME`, `SEGURANÇA NO CARGO`), chip de delta (`+6` / `−11`, mono 11px/700, fundo da própria cor com alpha `1a`), número mono 22px/700, trilha de 16px raio 99px `#eef1ee` com preenchimento colorido por faixa e `transition:width .55s cubic-bezier(.22,.61,.36,1), background .3s`. Rótulo de estado embaixo à esquerda e origem à direita (`VESTIÁRIO` / `DIRETORIA`).
  - Faixas de cor: `≥66` verde `#2f8f4a`; `40–65` amarelo `#F2B90C`; `<40` vermelho `#c0392b`.
  - Rótulos de moral: ≥80 `Vestiário comprado` · ≥66 `Grupo confiante` · ≥40 `Clima instável` · <40 `Vestiário rachado`.
  - Rótulos de cargo: ≥80 `Cargo blindado` · ≥66 `Diretoria tranquila` · ≥40 `Sob observação` · <40 `Demissão no radar`.
- **Rodapé**: nota explicativa 12px `#78877c` à esquerda e botão à direita — `⏩ Pular a coletiva` (fundo `#F2B90C`, texto `#17458F`) durante o quiz, virando `✓ Voltar ao clube` (fundo `#17458F`, texto branco) no fim. Altura 44px, raio 13px.

### 2. Mobile — `Modal - Entrevista Pos-Jogo - Mobile.dc.html`

Largura **390px**, rolagem vertical, mesmo conteúdo reordenado por prioridade:

1. Cabeçalho compacto (título 18px, chip `AO VIVO`).
2. **Treinador e repórter lado a lado** (2 colunas, foto de 112px, nome 14px, subtítulo 11px; o tom da coletiva vai na linha do repórter).
3. **Barras de moral e cargo** em 2 colunas, versão compacta (rótulo `MORAL` / `CARGO`, número mono 18px, trilha de 12px).
4. **Cartão da pergunta** (17px/700) com o indicador de passos.
5. **Botões de resposta** empilhados, fala 13.5px, com os chips de prévia; feedback de toque via `style-active` (sem hover).
6. **Repercussão imediata** (imprensa + torcida).
7. **Rodapé fixo** (`position:fixed`, 390px centrado, gradiente para `rgba(8,19,28,.96)`) com `PERGUNTAS 1 / 3` e o botão de ação — alvo de toque ≥44px.

Ordem é intencional: no mobile as barras ficam acima do quiz para que o efeito da resposta seja visível sem rolar.

## Interações e comportamento

| Ação | Efeito |
|---|---|
| Tocar/clicar numa resposta | aplica `Δ moral` e `Δ cargo` (limitados a 0–100), anima as duas barras, mostra os chips de delta, exibe as reações de imprensa e torcida, marca o passo e avança para a próxima pergunta |
| Última resposta | estado final: cartão da pergunta vira “Coletiva encerrada”, botão passa a `✓ Voltar ao clube` |
| `⏩ Pular a coletiva` | vai direto ao estado final sem aplicar mais deltas |

Não existe refazer a coletiva: a decisão é definitiva (removido a pedido).

Animações: `flashPulse` (flashes do fundo), `liveDot` (ponto do AO VIVO), `entraResposta` (entrada do bloco de repercussão), e as transições de largura/cor das barras. Nada decorativo além disso.

## Estado necessário

- `q` — índice da pergunta atual (`>= total` = coletiva encerrada).
- `feitas` — quantas perguntas foram respondidas (indicador de passos e contador).
- `moral`, `cargo` — 0–100, inicializados pelo estado real do jogo (no protótipo: props `moralInicial` 62 e `cargoInicial` 54).
- `ultima` — resposta escolhida por último (fonte dos chips de delta, do tom da coletiva e das duas falas de repercussão).

Conteúdo por pergunta: `kicker`, `pergunta`, `nota` e 3 respostas com `tom`, `texto`, `moral`, `cargo`, `imprensa`, `torcida`. As 3 perguntas do protótipo (o jogo · o elenco · o clube) servem de modelo de variedade: uma sobre o desempenho, uma sobre um jogador, uma sobre a diretoria.

**Ganchos para a mecânica**: ao encerrar, os valores finais de moral e de segurança no cargo devem ser gravados no save (moral entra no próximo treino/partida; segurança no cargo entra na avaliação da diretoria). As falas de imprensa também podem virar manchete no e-mail/imprensa do clube.

## Design tokens

- **Fundos**: `#fff` (modal e cartões), `#f6f8f5` (repercussão), `#eef1ee` (trilha das barras), gradiente da sala de imprensa `#123a5e → #0e2a41 → #08131c`.
- **Bordas**: `#dde7db`, divisores `#e6ece4`, borda de input/hover `#17458F`.
- **Texto**: `#12201a` (principal), `#3a473f`, `#78877c`, `#8b978d`, `#9aa79e` (mono/rótulos).
- **Marca**: azul `#17458F` (e `#0e2f66` no gradiente), amarelo `#F2B90C`, vermelho `#c0392b`, verde de sucesso `#2f8f4a`, âmbar de alerta `#a8730c`.
- **Tipografia**: Space Grotesk 400/500/600/700 (texto); IBM Plex Mono 400/500/600/700 (números, kickers, etiquetas, sempre em caixa alta com `letter-spacing` .1em–.14em). Escala: 22 · 21 · 18 · 17 · 16 · 14 · 13.5 · 12.5 · 12 · 11.5 · 11 · 10 · 9 · 8.5px.
- **Raios**: 24 (modal) · 20 (modal mobile) · 18 · 16 · 14 · 13 · 6 · 99px (chips e barras).
- **Sombras**: modal desktop `0 44px 100px -44px rgba(0,0,0,.78)`; modal mobile `0 30px 70px -34px rgba(0,0,0,.8)`; botão principal `0 8px 18px -10px rgba(18,32,26,.5)`.
- **Espaçamento**: 22 · 20 · 18 · 16 · 14 · 13 · 12 · 11 · 10 · 9 · 8 · 7px.

## Áudio ambiente

O modal toca um **ambiente de sala de imprensa em loop enquanto está aberto**, e o som para no instante em que ele fecha.

- Arquivo: `design/assets/audio/coletiva-ambiente.mp3` (crédito: Freesound community — "people talking"; confira a licença antes de publicar).
- Loop contínuo, **volume 0.22** (ambiente, nunca competindo com a leitura).
- Implementação no protótipo: o áudio é criado ao montar o modal (`loop = true`, `volume = .22`) e no desmonte é feito `pause()` + `currentTime = 0` e a referência é descartada — é isso que garante o corte imediato ao fechar. Faça o mesmo no jogo: **um ponto de criação junto da abertura do modal e um de parada junto do fechamento**, sem deixar a instância viva depois.
- Autoplay bloqueado: navegadores podem recusar o `play()` inicial. O protótipo registra um `pointerdown` único no documento para iniciar o som no primeiro toque/clique; reaproveite ou ligue o som ao mesmo gesto que abre o modal.
- **Botão de som** no cabeçalho: no desktop `🔊 Som da sala` (chip amarelo quando ligado, translúcido quando mudo); no mobile é um botão redondo de 32px com o mesmo comportamento. A preferência do jogador de áudio/mudo do jogo deve prevalecer sobre o padrão ligado.

## Assets

- `design/assets/audio/coletiva-ambiente.mp3` — ambiente da coletiva (loop).
- `design/assets/marca/marca-completa-clara.svg` — marca sobre fundo escuro (não usada dentro do modal, incluída para contexto).
- Fotos do treinador e do repórter: **não há asset** — são slots (`image-slot`) no protótipo. Use os avatares reais do jogo.

## Arquivos

- `design/Modal - Entrevista Pos-Jogo.dc.html` — desktop (940px).
- `design/Modal - Entrevista Pos-Jogo - Mobile.dc.html` — mobile (390px).
- `design/support.js`, `design/image-slot.js` — runtime para abrir os protótipos no navegador.

O roteiro das perguntas, os deltas e as falas de repercussão estão no bloco `<script type="text/x-dc">` ao fim de cada arquivo (método `roteiro`) — é de lá que se extraem os textos.
