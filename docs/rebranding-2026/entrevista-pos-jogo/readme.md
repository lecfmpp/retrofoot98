# Entrevista pós-jogo — o que foi implementado do handoff

O pacote original está aqui ao lado (`handoff.md` e os dois `.dc.html`, desktop
e mobile). Este ficheiro diz **onde cada peça foi parar no jogo** e **o que
mudou de propósito** em relação ao protótipo.

## Onde está no código

| Peça | Ficheiro |
|---|---|
| Perguntas, respostas, fatos da semana, régua de frequência | `public/src/ui/rf26-imprensa.js` |
| A tela (desktop + mobile) | `rfEntrevistaHTML`, no mesmo ficheiro |
| Estilos `rf-ent-*` | `public/src/styles/rf26.css` (bloco no fim) |
| Momento em que abre | `posRodadaFim`, em `public/src/ui/main.js` |
| Áudio ambiente | `public/audio/coletiva-ambiente.mp3` |

## O que veio igual

- Sala de imprensa escura com faixas e dois flashes pulsando; cartão de 940px,
  cabeçalho em degradê com filete amarelo, chip **AO VIVO** e botão de som.
- Três colunas (treinador · quiz · repórter), cartão da pergunta com filete
  amarelo à esquerda, indicador de passos (ponto pendente / atual esticado /
  respondido), três respostas com tom em mono, fala e chips de prévia.
- **Repercussão imediata** (imprensa + torcida) entrando com animação depois de
  cada resposta.
- Duas barras de destaque com as faixas de cor e os rótulos do handoff
  (`Vestiário comprado`, `Sob observação`, `Demissão no radar`…).
- Rodapé com `⏩ Pular a coletiva` virando `✓ Voltar ao clube`.
- Mobile de 390px com a ordem invertida: pessoas → barras → pergunta → respostas,
  rodapé colado ao fundo.
- Áudio em loop a 0.22 criado na abertura e destruído no fecho, com destrave por
  `pointerdown` quando o navegador recusa o autoplay.

## O que mudou, e por quê

- **Os textos são gerados, não fixos.** O protótipo traz três perguntas de
  exemplo; no jogo há 17 temas divididos pelos mesmos três blocos, e a pergunta
  cita o placar, o adversário, o artilheiro ou a proposta que chegou nesta
  semana. Sem isso a coletiva repetiria as mesmas três perguntas a cada rodada.
- **Um terceiro número: reputação.** O handoff assume o par (moral, cargo). O
  jogo já mostrava uma pílula "Reputação" que ninguém nunca escrevia — ela entra
  como terceiro chip da resposta e como linha do cartão do treinador, sem tocar
  nas duas barras de destaque.
- **A cor das barras é fixa, não do clube.** O resto do modal veste as cores do
  clube (é a convenção das telas de palco do jogo); as três faixas das barras
  não, senão num clube de camisa verde o amarelo do "atenção" viraria o verde do
  "está tudo bem".
- **Sem contador regressivo.** A entrevista abre com a rodada já reaberta para a
  sala (Modo Resenha incluído), então ninguém está à espera — e um relógio a
  correr por cima de uma decisão que mexe na temporada só faz clicar sem ler.
- **Fotos.** O treinador usa o avatar que o jogador já escolheu ou gerou
  (`rfCoachAvatarUrl`). O repórter não tem asset nenhum no jogo: em vez de
  inventar um retrato, fica o monograma sobre o fundo escuro do design.
- **Magnitudes.** Os deltas são os do espírito do handoff (±2 a ±12), mas
  reescritos junto com as falas de cada tema — o handoff avisa que os números
  dele são de design, não de balanceamento.

## Áudio: falta conferir a licença

`coletiva-ambiente.mp3` veio do pacote com o crédito "Freesound community —
*people talking*". **Antes de publicar**, confirme a licença e o crédito
necessário; se não der, o som sai sem quebrar nada (a tela funciona muda e a
preferência de som do jogador já a desliga).
