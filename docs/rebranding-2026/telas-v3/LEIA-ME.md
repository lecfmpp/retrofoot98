# RetroFoot98 — protótipo navegável completo

## Comece por aqui

Abra **`RetroFoot98 - App.dc.html`**. É a casca do app: menu lateral funcional à
esquerda, e todas as telas carregando dentro dela.

O que funciona ao clique:

- **8 destinos do menu** — Formação, Mercado, Elenco & Base, Campeonatos,
  Treinador, Finanças, E-mail, Configurações. Cada um abre a página real com
  todas as suas abas funcionando.
- **Bloco DURANTE O JOGO** — partida ao vivo, Camarote, substituição, lesão,
  cartão vermelho, pênalti, disputa de pênaltis, prorrogação, pós-rodada,
  imprensa, fim de temporada, lobby e pausa da Resenha, sorteio, onboarding e
  landing.
- **Recolher menu** — alterna entre 224px e 64px, como no jogo.
- **Desktop / Mobile** — troca a mesma tela entre a versão de desktop e a de
  390px, no cabeçalho.
- **Abrir só esta tela ↗** — abre a tela atual em aba nova, sem a casca.
- **⚽ Jogar** — leva direto para a partida ao vivo.

## Como a casca funciona

Cada tela é um arquivo próprio, carregado num `<iframe>`. A casca injeta um
`<style>` na página embutida escondendo a sidebar e os trilhos de publicidade
dela — então nada aparece duas vezes. Isso é só do protótipo: **na
implementação real, o menu da casca é o layout e as páginas são rotas**, sem
iframe.

Ver `PROMPT-IMPLEMENTACAO.md` para o mapeamento de cada tela às funções de
`public/src/ui/main.js` que ela substitui.

## Importante

Mantenha a pasta inteira junta: `support.js`, `assets/` e `uploads/` precisam
estar ao lado dos `.html`. Abra no Chrome ou Firefox.

121 telas no total.
