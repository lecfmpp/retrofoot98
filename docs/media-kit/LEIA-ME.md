# Media kit — os espaços publicitários

`media-kit.html` é o documento pronto (imagens embutidas, abre sozinho no navegador).
`telas/` são as capturas em PNG e `web/` as mesmas em JPEG, para reaproveitar noutro lugar.

## Como refazer as capturas

Com o servidor de desenvolvimento no ar (`npm run dev -- --port 5199`):

```
node scripts/capture-ads.mjs
```

O script abre o jogo, navega até cada espaço, **destaca-o a amarelo** com o resto da tela
escurecida e grava uma imagem por espaço — desktop a 1440px e telefone a 375px. É por isso
que as medidas do media kit são as da tela publicada e não as do papel: elas saem do jogo
a correr.

Depois, para reduzir e voltar a embutir no HTML:

```
cd docs/media-kit
for f in telas/*.png; do sips -Z 1500 -s format jpeg -s formatOptions 78 "$f" \
  --out "web/$(basename "$f" .png).jpg"; done
```

## Contatos no documento

Capa e rodapé trazem `publicidade@retrofoot.com.br` e `+1 647 862 3292`. Estão escritos no
HTML — para trocar, procure por `contato` em `media-kit.html`.

## O que fica de fora do inventário

Nada, desde agosto de 2026 — os quinze espaços passam pelo painel. A única coisa que **não** é
inventário são as marcas na tela de **Finanças**: ali elas ilustram quanto os espaços do estádio
rendem ao clube, que é ficção do jogo, não publicidade a vender.
