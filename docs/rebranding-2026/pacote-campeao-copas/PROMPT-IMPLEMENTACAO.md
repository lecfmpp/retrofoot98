# PROMPT DE IMPLEMENTAÇÃO — Modal "Campeão da copa"

Um único modal, três identidades: Copa do Brasil, Libertadores e Sul-Americana. Desktop e mobile.

## Para que serve

Fecha uma competição de copa. Aparece **uma vez**, quando a final é decidida, para qualquer clube campeão — inclusive quando o campeão não é o clube do jogador (aí é notícia, não comemoração). Depois disso a competição fica marcada como encerrada na temporada e a chave em Campeonatos passa a exibir o campeão em dourado.

Gatilho: processamento da final no calendário (mesmo ponto em que o modal de avanço de dias entrega o resultado). No Modo Resenha, aparece para todos os treinadores da sala.

## Estrutura (igual nas três copas)

1. **Cabeçalho** com faixa dourada à esquerda, contexto em mono (`LIBERTADORES · TEMPORADA 2026`), título (`Final — Libertadores`) e ✕ para fechar.
2. **Arte da comemoração** (16:9 no desktop, 4:3 no mobile) com scrim escuro, rótulo `CAMPEÃO DA <COPA>` na cor da competição, manchete em serifa itálica (`Fluminense é campeão.`) e o troféu da competição em selo no canto inferior direito. A arte é imagem de verdade, fornecida pelo jogo — o slot no design existe só para você encaixar o arquivo.
3. **Resultado da final**: `FINAL · data · estádio`, público em mono, escudos + nomes com o placar em bloco navy, e a linha dos gols abaixo. Vencedor em negrito escuro, vice em cinza.
4. **Premiação em destaque** — painel dourado com o valor cheio em mono (`R$ 130.000.000`) e a nota "creditado no caixa do clube".
5. **Pontos de treinador** — painel na cor da competição com `+260`, total acumulado e nível.
6. **Três indicadores** da campanha do campeão: jogos (com gols marcados), fases, temporada (com a contagem de títulos).
7. **Nota de encerramento** + ações: `⏩ Ver o caminho` (abre a chave da competição em Campeonatos) e `✔ Comemorar` (fecha).
8. **Slot de anúncio** 468×60 no desktop, 320×50 no mobile.

Mobile: bottom sheet, arte 4:3, premiação e pontos na mesma faixa (valor à esquerda, pontos à direita), indicadores em três colunas compactas, ações no rodapé com safe-area — `Comemorar` primeiro, 48px.

## Regras de conteúdo

- **Quando o campeão é o clube do jogador**: manchete com o nome do clube, premiação creditada, pontos de treinador somados, `Comemorar` como ação primária.
- **Quando o campeão é outro clube**: mesma estrutura, mas **sem pontos de treinador** (o painel sai e a premiação ocupa a linha inteira) e a ação primária vira `Fechar`. A nota de encerramento explica que a competição terminou para todos.
- Se a final foi decidida nos pênaltis, o placar mostra o tempo normal e a linha dos gols termina com "nos pênaltis, 4×2".
- Números tabulares sempre em mono; dinheiro em prosa por extenso apenas em texto corrido, nunca no painel de premiação.

## Identidade por competição

| | Cabeçalho | Rótulo do herói | Painel de pontos | Troféu |
|---|---|---|---|---|
| Copa do Brasil | `#0e2f66 → #17458F` | dourado `#F2B90C` | azul `#eef3fa` / `#d3dfef` / `#17458F` | `assets/trofeus/copa-do-brasil.webp` |
| Libertadores | `#2b0a0d → #9e1b22` | dourado `#F2B90C` | vinho `#fdeeee` / `#f2cfd0` / `#9e1b22` | `assets/trofeus/libertadores.webp` |
| Sul-Americana | `#08262b → #0f6b74` | laranja `#F6A32A` | teal `#eaf5f6` / `#cbe4e7` / `#0f6b74` | `assets/trofeus/sul-americana.webp` |

Faixa dourada, painel de premiação, tipografia e espaçamentos são idênticos nas três — só a cor do cabeçalho, o rótulo do herói, o painel de pontos e o troféu mudam. Não criar paleta nova para outras copas: reaproveitar esse mesmo esquema (cabeçalho escuro da competição + dourado do produto).

## Contrato de dados

```js
championModal = {
  competition: { key:'libertadores', name:'Libertadores', season:2026,
                 trophy:'assets/trofeus/libertadores.webp',
                 theme:{ header:'#2b0a0d,#9e1b22', accent:'#F2B90C',
                         points:{bg:'#fdeeee', border:'#f2cfd0', color:'#9e1b22'} } },
  art: 'img/campeao/libertadores-2026.webp',      // arte da comemoração
  headline: 'Fluminense é campeão.',
  final: { date:'04/nov', venue:'Monumental', attendance:71902,
           home:{club:'Fluminense', crest:'…', score:2, winner:true},
           away:{club:'Boca Juniors', crest:'…', score:1, winner:false},
           scorers:'Gols de Cano e John Kennedy.', penalties:null },
  prize: 130000000,
  coach: { isUserClub:true, points:260, total:1620, level:7 },   // coach:null se não for o clube do jogador
  campaign: { games:14, goals:26, rounds:6, roundsNote:'invicto fora de casa', titles:'1º título' }
}
```

## Critérios de aceite

1. Um modal por final decidida, sem repetir na próxima entrada no jogo.
2. Premiação e pontos de treinador legíveis de imediato — são os dois números que o jogador procura.
3. Quando o campeão é outro clube, nenhum ponto de treinador é exibido nem creditado.
4. `Ver o caminho` abre a chave da competição já na aba/vista da copa correta.
5. A arte da comemoração nunca cobre o troféu nem a manchete; sem arte, o fundo escuro + troféu + manchete continuam legíveis.
6. As três identidades usam a mesma estrutura — nada de layout próprio por copa.
