# Conferência tela a tela — pacote final vs. jogo

Comparação de cada tela do `pacote-final` com o que está implementado. Uma página por
vez, na ordem da barra lateral. `[ ]` = a corrigir, `[x]` = conferido e correto.

**Fonte da verdade:** os arquivos de `pacote-final/telas/`. Onde o jogo diverge, o jogo
está errado — salvo as três exceções abaixo, que foram decididas por você.

## Exceções acordadas (o pacote diz uma coisa, seguimos outra)

| Assunto | O pacote pede | O que fazemos | Por quê |
|---|---|---|---|
| Cor do clube na interface | azul/amarelo fixos; cor do clube só nas camisas e no card do adversário | **mantida a cor do clube** em toda a interface | decisão sua (14/ago) |
| Selo do Modo Resenha | manter "EM BREVE" até o lançamento | **modo liberado** | decisão sua — teste interno |
| Alinhamento numérico | números à direita | **à direita** (revertido o alinhamento à esquerda pedido antes) | pacote vence, confirmado por você |

---

# 1 · Formação (Hub do Time)

Arquivos do pacote: `Hub do Time - Sidebar.html`, `Hub do Time - Mobile.html`,
`Hub do Time - Sidebar Recolhida.html`

## 1.1 Formação — DESKTOP

### Está correto
- [x] Duas colunas: lista/indicadores à esquerda, campo à direita
- [x] Campo com 470px e marcações, placas de publicidade nas quatro bordas
- [x] Blocos presentes e na ordem do pacote: Elenco · Moral do plantel · Segurança no
      cargo · Classificação · Tática · Formações · Artilheiro/Destaque/Em baixa ·
      Adversário · Suplentes · Patrocínio
- [x] Elenco com as 9 colunas do pacote, na ordem: (marca) · POS · NOME · ID · FRC ·
      NOTA · ENER · SAL. · VALOR
- [x] Números à direita, em IBM Plex Mono
- [x] 8 formações, incluindo "11+ Melhores", e "Seleccionar descansados"
- [x] Link "Ver tabela completa" no bloco de classificação
- [x] Suplentes agrupados por GOLEIROS / DEFESA / MEIO / ATAQUE
- [x] Contadores nos itens da barra lateral (aparecem quando há pendências)

### Corrigido nesta rodada
- [x] **Ordem da barra lateral** — Modo Resenha passou para entre E-mail e
      Configurações, como no pacote
- [x] **"Sair do jogo"** (chave `sairjogo`) no lugar de "Sair"
- [x] **Botão "Gravar"** na faixa do clube
- [x] **Valores com moeda** — `R$ 125k` / `R$ 12M` nas colunas SAL. e VALOR
- [x] **Contagem do cabeçalho** — "31 jogadores · 11 titulares"
- [x] ~~**Grade da tabela** restaurada para a literal do pacote~~ — **revertido**
      (ver abaixo): a literal não cabe na coluna que temos

### Bloqueado — precisa da sua decisão
- [ ] **A coluna da esquerda tem 380px; o pacote desenha com 530px.**
      Medi o próprio arquivo do pacote: a grade dele é `530px minmax(0,1fr)`, soma
      **1476px** e **rola horizontalmente numa janela de 1440** (1792 vs 1440).
      O campo é 470×585 nos dois — igual.
      Em 1440 não cabem 530 (lista) + 770 (campo + banco + placas). Ou o campo
      encolhe abaixo de 470, ou a lista fica nos 380 e o nome do jogador trunca.
      Rolagem horizontal está descartada pela sua regra de "painel sempre visível
      em 100%".

### A conferir ainda
- [ ] **"Apito inicial"** — o pacote mostra contagem ("2d 14h"). Implementei a
      contagem, mas ela só existe na Resenha (`NET.room.deadline`); no Solo o jogo é
      por turnos e não há relógio, então cai para a data. Confirmar se está certo.

## 1.2 Formação — MOBILE (375px)

### Está correto
- [x] Barra lateral some e vira barra inferior
- [x] Campo continua existindo, com **326×406px** — exatamente a medida do pacote
- [x] Sem rolagem horizontal

### Corrigido nesta rodada
- [x] **Elenco em 3 colunas** — JOGADOR · FRC · ENER, como no pacote
- [x] **Ordem dos blocos** — o pacote intercala as duas colunas em vez de empilhar
      uma depois da outra. Agora: campo → formações → elenco → destaques →
      indicadores → classificação
- [x] **Anúncio foi para o pé** — estava no topo, empurrando o jogo para baixo da
      dobra em 375px
- [x] **Rótulo da tática** — "titulares marcados com T na lista" sai no telefone;
      era a armadilha nº 1 do prompt (nowrap em flex corta em vez de quebrar)

### Mobile — segunda rodada (a regra do app)
Regra que você fixou: **no telefone nada é rolagem única. O conteúdo aparece
conforme se clica no menu e nas abas — vale para todas as telas.**

- [x] **Três abas no Hub** — Formação · Elenco · Jogo. Cada uma mostra o seu; o que
      não é da aba ativa não existe na tela
- [x] **Chat desligado no telefone** — desligado na fonte (`rfChatDisponivel`), então
      somem bolha, item da barra inferior, atalho de teclado e folha de baixo
- [x] **Carrossel lateral** em Formações e Suplentes, com pastilhas menores
      (autorizado para todas as telas no mobile)
- [x] **Faixa de estado** FORMA · MORAL · janela de transferências, abaixo do
      cabeçalho — é onde o pacote põe o moral, e por isso os cartões "Moral do
      plantel" e "Segurança no cargo" não aparecem em nenhuma aba do telefone
- [x] **Cabeçalho compacto** — saem Forma, Apito inicial e Gravar (que vivem na
      faixa, na aba Jogo e na página Sair do jogo)
- [x] **Crachá T/R** de volta na lista do Elenco

### Pequenas divergências que sobraram no mobile
- [ ] O rótulo da coluna diz **NOME**; o pacote escreve **JOGADOR**
- [ ] O cabeçalho do bloco diz "31 jogadores · 11 titulares"; o pacote encurta para
      "26 · 11 titulares"

## 1.3 Formação — SIDEBAR RECOLHIDA
- [ ] Ainda não conferida.

### A grade do Elenco no Hub — a literal do pacote não cabe
A literal do pacote soma 284px de faixas + 64px de folga = 348, numa coluna de
378. Sobravam 30px para o NOME — medido, **10px**. O jogador chamava-se "C" e a
nota saía "9," cortada por cima da energia.

Como a coluna **não** cresce para os 530 do pacote (decisão abaixo), saiu o
**SALÁRIO**: é a coluna menos útil para escalar um time — decisão de mercado,
não de escalação — e a única das nove que aparece inteira noutro sítio (Elenco &
Base tem SALÁRIO e FIM; a ficha do jogador tem as duas). O interruptor `sal` já
existia para isto e o modo `elenco` já o usava. Nenhum dado se perde: muda de
tela.

Resultado medido: NOME de 10px → 85px, NOTA de 34px (a largura exata de "9,4",
sem um pixel de sobra) → 40px, e nenhuma célula a encostar na seguinte.

## Decisão registrada
- **Resolução:** fica como está publicado. A divergência de largura do pacote
  (coluna de 530px, grade de 1476px, rolagem horizontal em 1440) **não será
  perseguida** — decisão sua. O desktop da Formação está aprovado.

---

# 2 · Mercado — a conferir
# 3 · Elenco & Base

## 3.1 Elenco & Base — MOBILE (375px)

### Corrigido nesta rodada
- [x] **A tabela saía do card.** As colunas do desenho somam ~530px e o card tem
      ~350px; a grade fazia o que uma grade faz: segurava as faixas fixas, esmagava
      a única flexível (o NOME chegou a **0px**) e jogava FORMA · SALÁRIO · FIM
      para fora da borda direita do card.
      Agora cada uma das três tabelas tem a sua própria grade de telefone, com
      largura explícita em todas as colunas, e o card rola de lado — a mesma regra
      que você fixou para o Mercado ("todas na mesma linha se couber; se não
      couber, scroll lateral"). Nada some e nada sai do card.
- [x] **Identidade por tabela** (`data-el="elenco|base|treino"`) — as três dividiam
      a mesma classe `.rf-el-tbl`, então qualquer regra de telefone acertava as três
      de uma vez. É a mesma armadilha que já tinha dado problema no Mercado.
- [x] Cabeçalho em **uma linha só** nas três abas (16px de altura)

## 3.2 Elenco & Base — DESKTOP (1440)

Conferido bloco a bloco contra `Elenco e Base - Abas.html`.

### Está correto
- [x] **Elenco** — 9 colunas na ordem do pacote (camisa · JOGADOR · POS · IDA ·
      FOR · ENERGIA · FORMA · SALÁRIO · FIM) e o bloco RESUMO POR SETOR com
      GOLEIROS · DEFESA · MEIO · ATAQUE
- [x] **Base** — CATEGORIA DE BASE com POTENCIAL e PRONTO EM na tabela, e
      INVESTIMENTO NA BASE com os quatro do pacote: GASTO POR MÊS · NÍVEL DO CT ·
      PROMOVIDOS EM 2026 · VENDIDOS DA BASE
- [x] **Treino especial** — FOCO DO TREINO · QUEM VAI TREINAR (com PROGRESSO e
      GANHO ESPERADO na tabela) · CUSTO E RISCO
- [x] Colunas alinhadas ao pixel entre cabeçalho e linha nas três tabelas
- [x] Sem rolagem horizontal em 1440

### Corrigido nesta rodada
- [x] **O quarto bloco de NA TEMPORADA.** O pacote desenha quatro; o jogo tinha
      três, e o terceiro ficava órfão na grade. O quarto do pacote é
      **ASSISTÊNCIAS**, que o motor não regista (`p.stats` guarda r3, g3, apps,
      goals e cs). Entra o que existe de verdade: **jogos sem sofrer gol** para
      o goleiro, **jogos** para o resto. A legenda de GOLS deixou de repetir a
      contagem de jogos e passou a dar o aproveitamento ("1 a cada 4 jogos")
- [x] **Botões da ficha** — Renovar contrato leva o amarelo padrão e Listar para
      venda um vermelho claro; estavam ao contrário

# 4 · Campeonatos

Conferida em 1440 e em 375. As quatro abas (Minhas competições · Calendário ·
Artilharia · História) desenham, sem rolagem lateral da página, e os dados vêm
do motor.

### Corrigido nesta rodada
- [x] **"ELIMINADO" numa copa em que o clube nunca entrou.** "Minhas
      competições" listava toda copa que existe no save e carimbava ELIMINADO
      onde o clube não estivesse vivo — mas `cupCompetitionTeamAlive` devolve
      falso nos dois casos, quem caiu e quem nunca foi sorteado. O cartão dizia
      "eliminado · fase de grupos, rodada 1/6" enquanto o bloco de baixo
      garantia "você está em todas as competições deste save".
      `S.qualification[k]` é a lista de inscritos e responde exatamente a "eu
      entrei nesta?". Quem não está nela vai para o bloco de baixo; ELIMINADO
      fica para quem entrou e caiu. O bloco de baixo passa a dar o motivo certo
      dos três possíveis: desligada no save, existe mas sem o seu clube, ou
      ainda não sorteada

### A conferir ainda
- [ ] Calendário: cabeçalhos repetidos quando há várias copas empilhadas
      (anotado antes, ainda não tratado)
# 5 · Treinador

Seis abas (Carreira · História · Sala de Troféus · Ranking · Ofertas · Perfil),
todas com conteúdo do motor e sem rolagem lateral em 375px.

## Os botões de confirmar que não confirmavam nada

`rfAcao` desenha cada ação com `onclick="${a.on||'rfAcFechar()'}"` — uma ação
sem `on:` apenas **fecha** o diálogo. Doze diálogos estavam assim. Sete tinham um
botão que devia agir e não agia; clicar não fazia nada, e nada avisava:

| Diálogo | Botão | Agora faz |
|---|---|---|
| `elenco-renovar` | Oferecer renovação | renova de verdade, com sorteio pela chance mostrada |
| `base-promover` | Promover | sobe o garoto ao elenco |
| `sys-sair-save` | Gravar e sair | grava local + nuvem e volta à abertura |
| `sys-apagar-save` | Apagar para sempre | apaga, com a trava do nome do clube |
| `sys-encerrar` | Encerrar carreira | carimba o fim no save e volta à abertura |
| `sys-sair-sala` | Sair da resenha | usa o `clDeleteRoomGo` que já falava com o servidor |
| `mail-arquivar` | Arquivar | marca como lida (é o que "arquivado" significa aqui) |
| `mail-responder` | Enviar resposta | guarda a resposta no próprio e-mail |
| `sys-sincronizar` | Pular espera | adia a consulta e devolve o jogador à tela |

Três não tinham como funcionar, e passam a dizê-lo em vez de fingir:
- **`treino-confirmar` removido** — anunciava "−10% de energia por jogador", um
  custo que o motor nunca cobrou, e depois da reescrita do Treino ninguém o abria
- **`conta-senha`** — os três campos não levavam a lado nenhum: o
  `netUpdatePassword` só funciona dentro da sessão temporária do link de e-mail.
  O diálogo passa a enviar esse link, que é o caminho real
- **`conta-apagar`** — não há chamada de remoção de conta em lado nenhum. O
  diálogo explica isso e aponta o que dá para fazer hoje

As restantes ("Continuar", "Entendi", "Fechar") são informativas: fechar **é** o
que devem fazer.
# 6 · Finanças — a conferir
# 7 · E-mail — a conferir
# 8 · Modo Resenha

## 8.1 Sala em espera (diálogo) — DESKTOP e MOBILE

Arquivos do pacote: `Modal - Sala em Espera.html`, `Modal - Sala em Espera - Mobile.html`

- [x] **Portada para o desenho novo.** A tela já existia e já estava ligada de
      verdade (`showResenhaWaiting`, chamada pelo relógio da sala) — só que na
      pele antiga, com `cl-esp-*`. É o padrão que se repete neste porte: a rota
      certa, o destino velho. Trocado só o destino; quem chama, quando chama e o
      que os botões fazem continua igual.
- [x] Cabeçalho com ampulheta, manchete em serifa itálica, "Jornada 11 ·
      Brasileirão", linhas amarelas de quem falta com o estado à direita
- [x] **Barra "JÁ JOGARAM · 2 de 4"** — é o que o pacote acrescenta ao que havia.
      Sem ela, "faltam 2" não diz se a sala tem três pessoas ou dez
- [x] Rodapé: "Você é o anfitrião da sala" + Aguardar (amarelo) + Começar sem eles
- [x] **Mobile**: folha de baixo com alça de arrasto (vem do `.rf-dlg`), estado do
      treinador desce para a segunda linha e os botões empilham em largura cheia
- [x] Título encurta para "Sala em espera" no telefone — o completo saía cortado

### Divergências deliberadas
- O troféu da competição, que a pele antiga mostrava nas copas, saiu: o pacote não
  desenha esse espaço, e o texto "Jornada 11 · Copa do Brasil" já diz qual é
- Cabeçalho na cor do clube, não no azul da marca — é a exceção acordada no topo

## 8.2 Pausa Patrocinada — DESKTOP e MOBILE
- [x] Cabeçalho, barra "A preparar a próxima jornada" com percentagem, bloco de
      patrocínio com esteira de logos, espaço 16:9 do patrocinador, checklist e
      "Treinadores na sala 4/4"
- [x] Mobile em 390px: uma coluna, sem rolagem lateral. A esteira de logos
      transborda o trilho de propósito e é recortada por ele (`overflow:hidden`)
- **Divergência deliberada:** o pacote escreve a checklist como texto fixo
  ("Resultados da 8ª jornada", "Mercado e propostas"). No jogo os quatro passos
  são ligados ao estado real da sincronização e mudam de "a processar" para
  "feito" sozinhos — o texto difere, o desenho não

## 8.3 À Espera da Rodada — DESKTOP e MOBILE
- [x] Barra "Já jogaram", duas colunas (treinadores da sala · o seu resultado),
      placar com escudos, blocos GOLS · PÚBLICO · BILHETERIA, rodapé com
      "Sincronizar a Resenha" e "Abrir o chat"
- [x] Mobile em 390px: uma coluna, sem rolagem lateral
- **Divergência deliberada:** o pacote põe **NOTA DO JOGO 4,4** no quarto bloco.
  O jogo não tem nota de partida — só nota de jogador (`playerNota`). Fica
  **MANDO**, que é verdade, em vez de inventar um número

## 8.4 Passe o Aparelho · Entrega do Aparelho — DESKTOP e MOBILE
- [x] As duas conferem com o pacote: escudo grande, nome, "Assento 3 de 4",
      aviso, e a lista de quem já jogou na primeira; aperto de mão, "Devolva o
      aparelho a X" e os quatro blocos na segunda
- [x] Mobile em 390px: uma coluna, sem rolagem lateral
- [x] **Corrigido:** o quarto bloco da Entrega mostrava MANDO; o pacote pede
      **POSIÇÃO**. Agora mostra a posição na tabela — mas só quando o clube do
      assento está mesmo na tabela do utilizador (num assento de outro país ou
      divisão, `tablePos` não diz nada sobre ele); fora disso, volta ao mando

## 8.5 Página Modo Resenha — DESKTOP e MOBILE

Conferida contra `Modo Resenha.html`.

### Corrigido nesta rodada
- [x] **"Sala —" com o código impresso logo abaixo.** O cartão lia
      `NET.room.code` e o subtítulo lia `S.room`/`CL.roomCode`, que no Resenha
      ficam vazios: duas fontes para o mesmo código. Agora é uma função só
- [x] **A jornada no subtítulo** — "Sala 7KP2M · 4 treinadores · 9ª jornada"
- [x] **As duas ações do cabeçalho** (Copiar convite · Sincronizar), que o
      pacote desenha e não existiam
- [x] **"Janela de mercado" nas regras** — o pacote pede essa linha;
      `transferWindowStatus()` devolve números, e a frase é montada a partir
      deles ("aberta · fecha em 9 rodadas")
- [x] **A sincronização diz há quanto tempo** em vez de repetir o código da sala,
      que já está em letras grandes no cartão de cima
- [x] **Cartão CHAT DA SALA** — o pacote põe o chat nesta página; o jogo só tinha
      a bolha flutuante. É uma segunda porta para o mesmo chat, não um chat
      paralelo, e cada campo ganhou id próprio para os dois não disputarem o
      mesmo `#rf-chat-in`
- [x] **Mobile:** a tabela da sala saía com "TREINADORCLUBE" — os dois rótulos
      colados — e o clube em "Corin…". Faltava-lhe identidade (`data-el="sala"`)
      para apanhar as regras de telefone das outras tabelas. Agora rola de lado
      dentro do card, como no Elenco e no Mercado

### Divergência deliberada
- O pacote arruma CÓDIGO + REGRAS na primeira linha e TREINADORES +
  SINCRONIZAÇÃO na segunda. O jogo dá a largura inteira à tabela de
  treinadores: são 5 colunas, e em meia largura o nome do clube trunca — o
  mesmo defeito que se acabou de corrigir no telefone
- A linha "Divisão" fica, além das quatro do pacote: numa sala é informação
  que ninguém deduz

# 9 · Configurações — a conferir (deve ficar só com Perfil · Opções)
# 10 · Sair do jogo — a conferir (abas: Gravar e sair · Outros saves · Apagar)
