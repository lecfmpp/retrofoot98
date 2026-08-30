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

Nada, desde agosto de 2026 — os **catorze** espaços passam pelo painel. A única coisa que **não**
é inventário são as marcas na tela de **Finanças**: ali elas ilustram quanto os espaços do estádio
rendem ao clube, que é ficção do jogo, não publicidade a vender.

## O inventário mudou em 30/08/2026

Eram quinze; são catorze. O que mexeu, e porquê:

- **Saiu `rf98.anchor.bottom`** (billboard âncora). A faixa fixa do rodapé foi aposentada em
  18/08 por comer a base do ecrã em todas as páginas, e o media kit continuava a vendê-la.
- **Saiu `rf98.pausa.video`** (vídeo da pausa). O bloco foi removido do desenho da Resenha.
- **Entrou `rf98.entrada.sorteio`** (boas-vindas ao clube, 970×250). É a entrada no clube depois
  do sorteio — o momento mais visto do funil: toda carreira nova passa por ele uma vez, entre
  saber que clube tirou e entrar nele. Já com cartão e captura no documento.
- **A faixa do intervalo (`rf98.match.halftime`) passou a cobrir todos os modais da partida** —
  intervalo, machucado, expulsão e escolha de pênalti. Antes cada momento pedia uma chave
  própria e quatro delas não existiam no inventário: ninguém as podia vender e o lugar ficava
  vazio. Quem compra esta faixa aparece nos quatro.

**Os dois trilhos não têm versão móvel.** O painel mostra 160×600 no telemóvel porque a coluna
não aceita vazio, mas o CSS esconde-os abaixo de 1180px (o direito já abaixo de 1420px). Não
encomende arte móvel para `rf98.rail.esq` nem `rf98.rail.dir` — a nota no painel diz o mesmo.
