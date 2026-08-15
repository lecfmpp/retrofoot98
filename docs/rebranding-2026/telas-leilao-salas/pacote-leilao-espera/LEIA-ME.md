# Leilão e sala de espera — desktop e mobile

15 arquivos de tela. Abra qualquer `.html` direto no navegador — sem servidor, sem
build.

---

## `1-leilao/`

| Arquivo | O que é |
|---|---|
| Mercado - Abas.html | a aba Leilão, com os lotes a correr e o botão Dar lance / Cobrir |
| Mercado - Abas - Mobile.html | idem em 390px |
| Acoes - Mercado.html | galeria com os 4 diálogos de leilão: Dar lance · Cobrir lance · Resultado do leilão · Listar para venda |
| Modal - Leilao de Outro Clube.html | outro clube pôs um jogador em leilão — a sua chance de entrar |
| Modal - Leilao de Outro Clube - Mobile.html | idem em 390px |

O leilão vive em três lugares, e é importante não confundi-los:

1. **A aba Leilão** do Mercado (`Mercado - Abas`) lista os lotes a correr, com o
   tempo restante em mono e o lance atual. É de onde tudo parte.
2. **Os diálogos** (`Acoes - Mercado`) são o que abre ao clicar:
   - **Dar lance** — atalhos de +25 / +50 / +100 mil em vez de forçar digitação, e o
     caixa que sobra se vencer
   - **Cobrir lance** — mostra quem cobriu, quanto falta de tempo e **quantas vezes
     você já cobriu (2 de 3)**; depois da terceira o leilão fecha no maior lance
   - **Resultado do leilão** — 🔨 arrematado, com o segundo colocado e o ganho de
     força no setor
   - **Listar para venda** — é aqui que se escolhe entre venda direta e **leilão de
     24h**
3. **`Modal - Leilao de Outro Clube`** é o aviso de que outro clube listou alguém —
   entra por cima da tela, não pela aba.

### Uma tela que ainda não existe

Falta o **seu** leilão em andamento: o jogador que você listou, quem está a dar
lance, quanto tempo resta e o botão de encerrar antes do prazo. Hoje o jogador lista
e não tem onde acompanhar. São duas telas (o leilão a correr e o resultado da venda)
— diga se quer que eu desenhe.

---

## `2-sala-de-espera/`

| Arquivo | O que é |
|---|---|
| Modal - Sala em Espera.html | diálogo curto: quem já jogou, quem falta, e o anfitrião pode forçar a rodada |
| Modal - Sala em Espera - Mobile.html | folha de baixo com alça de arrasto |
| Resenha - A Espera da Rodada.html | tela cheia: barra de progresso, treinadores e o seu resultado da jornada |
| Resenha - A Espera da Rodada - Mobile.html | idem em 390px |
| Resenha - Passe o Aparelho.html | mesmo aparelho: entregue ao próximo treinador |
| Resenha - Passe o Aparelho - Mobile.html | idem em 390px |
| Resenha - Entrega do Aparelho.html | acabou a sua vez, devolva ao anfitrião |
| Resenha - Entrega do Aparelho - Mobile.html | idem em 390px |
| Resenha - Pausa Patrocinada.html | a rodada está a sincronizar — slider de patrocinador e checklist |
| Resenha - Pausa Patrocinada - Mobile.html | idem em 390px |

Cinco situações diferentes de espera, e cada uma tem envelope próprio:

- **Modal - Sala em Espera** é **diálogo** — curto, sobre véu, para consultar de
  relance quem falta sem sair do que estava a fazer. Cabeçalho azul com ponto
  pulsando, barra "Já jogaram · 2 de 4", e o anfitrião ganha o botão de forçar a
  rodada.
- **A Espera da Rodada** é **página cheia** — quando o jogador já jogou e não tem
  mais nada a fazer até a rodada fechar. Traz o resultado da própria partida.
- **Passe o Aparelho** e **Entrega do Aparelho** são o modo mesmo-aparelho: a
  primeira pede para entregar ao próximo (escudo grande, assento 3 de 4), a segunda
  fecha a vez e devolve ao anfitrião.
- **Pausa Patrocinada** é a sincronização em si, com o slider de patrocinadores e o
  checklist do que está a processar.

No mobile, o diálogo vira **folha de baixo com alça de arrasto**; o status do
treinador desce para a segunda linha (não cabe ao lado do nome em 390px) e os botões
empilham em largura cheia.

---

## Duas regras que valem para todas

**A identidade é única para todos os clubes.** Azul `#17458F` e amarelo `#F2B90C`
são do RetroFoot98, não do clube — na seleção, nos cabeçalhos e no botão primário. A
cor do clube entra só nas camisas e no card do adversário.

**Verifique desktop e mobile antes de fechar cada tela.** A maioria dos defeitos
deste projeto apareceu no mobile.
