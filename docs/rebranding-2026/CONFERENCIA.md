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
Conferida contra `Hub do Time - Sidebar Recolhida.html`.
- [x] A barra passa de 240px para **68px**, só ícones com `title`, e o painel
      cresce para 1372 sem rolagem horizontal
- [x] O **botão Jogar** próprio da barra recolhida existe e é **amarelo** — o
      pacote desenha-o como peça à parte, e é a regra que você fixou ("sempre
      com fundo amarelo, expandida e recolhida")
- [x] O alternador fica no pé, e o cartão do próximo jogo dá lugar ao botão
- [x] Efeito colateral bem-vindo: com 172px a mais, a tabela do Elenco mostra os
      nomes por extenso ("Joaquín Piquerez", "Alexander Barboza")

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

### Calendário — corrigido
- [x] **A fase de grupos faltava por inteiro.** O laço das copas só lia
      `c.bracket.ties` — o mata-mata. Numa copa ainda nos grupos, que é onde a
      Libertadores e a Sul-Americana passam metade da temporada, o cartão dizia
      "sem jogos seus nesta copa ainda" com **seis jornadas sorteadas** no grupo
      do clube. Medido: grupo F, 6 jornadas, 0 mostradas
- [x] **Cabeçalhos sobre tabelas vazias** — com três copas empilhadas eram três
      cabeçalhos a anunciar nada. Só entram quando há linha
- [x] **Copa que o clube não disputa** deixou de ganhar cartão aqui também
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

## As ofertas de emprego eram invisíveis

Toda a pele nova lia **`S.jobOffers`** — um campo que o motor **nunca escreve**.
O que existe é `S.pendingJobOffers`. Consequência: a aba Ofertas aparecia sempre
vazia, o contador da barra lateral sempre a zero e o resumo do Hub sempre em
branco, mesmo com propostas reais na mesa.

E os dois botões do cartão chamavam `clAcceptJobOffer` / `clRejectJobOffer` —
funções que **não existem**; o `&&` engolia o clique em silêncio. Aceitar entra
agora no mesmo fluxo do convite que chega sozinho (jantar → proposta →
boas-vindas), em vez de trocar de clube na hora.

Conferido: a aba passou a marcar "Ofertas (1)", recusar grava no disco e aceitar
abre a proposta.

## O botão Gravar não gravava

Na faixa do clube, `onclick="clSaveGame && clSaveGame()"` — e `clSaveGame` não
existe. O botão mais visível do jogo não fazia nada. Passa a chamar
`rfAcGravar()`, que grava e mostra a confirmação.
# 6 · Finanças

Cinco abas (Resumo · Extrato · Histórico · Estádio · Patrocínio), todas com
conteúdo, e o caixa da tela bate com o `S.budget` do motor. Obras do estádio
(`clBuildStand`) funcionam.

### Corrigido nesta rodada
- [x] **O preço do bilhete não é uma escolha deste jogo.** Havia três faixas
      clicáveis — 25% abaixo, hoje, 30% acima — com o efeito no público ao lado.
      Nenhuma mudava nada: as três chamavam `clTicketPrice && clTicketPrice()`, e
      **`clTicketPrice` não existe** — o `&&` transformava o clique num silêncio.
      E não podia existir: a bilheteria do motor é `att × ticketPriceForDivision(div)`,
      uma tabela fixa (A:25 · B:20 · C:15 · D:10) que o jogador não toca.
      No lugar da escolha falsa entrou a tabela verdadeira, com a divisão do
      clube marcada — responde à única pergunta real: quanto rende subir
- [x] **"R$ 0k"** — o preço é por lugar (8, 10, 25 reais) e passava pelo `fmt`,
      que encurta para milhares. Agora usa um formatador de dinheiro miúdo
# 7 · E-mail

### Corrigido nesta rodada
- [x] **Abrir uma mensagem não fazia nada.** As linhas chamavam `clInboxOpen`,
      que **não existe** — o real é `clOpenEmail(key)`. A página inteira era
      inerte: clicar numa mensagem não abria, não marcava como lida, nada
- [x] Arquivar e Responder ligados (ver a tabela dos diálogos, secção 5)

Conferido: clicar abre a mensagem, marca como lida e o par Arquivar/Responder
age.
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

# 9 · Configurações

Duas abas (Opções · Jogo), sem rolagem lateral em 375px, e todos os botões
apontam para funções que existem.

### Corrigido nesta rodada
- [x] **As preferências moravam onde nada é guardado.** Os seis interruptores
      escreviam em `CL.options` — e `CL` é o estado da **sessão**: só o `S` vai
      para o disco. Voltavam ao padrão a cada recarregamento, e ninguém
      percebia porque o interruptor mudava na tela.
      Pior no **Som da partida**: o motor lê `S.config.sound` e o interruptor
      escrevia noutro sítio — desligar o som não desligava som nenhum.
      Agora as chaves que o motor conhece vão para `S.config`, as de interface
      para `S.config.ui`, e alternar grava
# 10 · Sair do jogo

Quatro ações, todas ligadas: Gravar e sair · Começar outro save · Sair da conta ·
Apagar este save. Sem rolagem lateral em 375px.

### Divergência deliberada
- O pacote desenha três **abas** (Gravar e sair · Outros saves · Apagar); o jogo
  usa dois blocos (SAVE ATUAL · CONTA) com as quatro ações. As abas do pacote
  separariam o que cabe numa tela só — anotado, não perseguido

---

# 11 · Auditoria de pele: o que ainda desenha o layout antigo

Anotação antiga dizia que "7 passos da Resenha continuam na pele antiga".
**Está desactualizada** — foram portados. Conferido rota a rota:

- As 15 telas de `case '…'` em `main.js` delegam todas ao desenho novo
  (`scWaitRound` → `rfPausa`/`rfEspera`, `scCupDraw` → `rfSorteio`, etc.)
- Os 9 passos de `renderOnline()` desenham no invólucro novo do wizard —
  `rf26.css` repinta o `cl-wiz-*`, então contar classes `cl-` engana. Verificado
  visualmente e por medição

### Corrigido nesta rodada
- [x] **Os dois cartões de escolha ficavam numa coluna.** `rf26.css` punha
      `.cl-wiz-cards{flex-direction:column}`: em 1440 os dois ocupavam a metade
      esquerda de um cartão de 780px e a direita ficava vazia. São sempre
      **dois** — Solo/Resenha, Novo/Continuar, Criar/Entrar — e a escolha entre
      dois lê-se melhor a par. Agora é grade de duas colunas, uma no telefone,
      igual ao `.rf-modos` do pacote

### Estado
Dez páginas + fluxo de onboarding + fluxo da Resenha: todas no desenho novo, sem
rolagem lateral em 1440 e em 375, sem erros de consola.

---

# 12 · Modais de partida

Sete modais auditados: substituição, lesão, expulsão, prorrogação, pênalti
(batedor · suspense · resultado) e disputa de pênaltis.

### Varreduras estáticas — passam limpo
- Nenhum `onclick` para função inexistente
- Nenhum `<button>` sem ação
- Os sete campos de `S.` que o ficheiro lê são todos escritos pelo motor

### Corrigido nesta rodada
- [x] **Seis botões com o rótulo decapitado no telefone**, em quatro modais:
      "Manter a formação", "Fazer uma substituição", "Começar a prorrogação",
      "Deixar o capitão bater", "Bater com …", "⏩ Simular o resto".
      A barra de ação espremia os dois botões numa linha só com reticências; em
      375px cada um fica com ~160px e todo rótulo acima de ~14 caracteres saía
      pela metade. **Um botão que não diz o que faz não é um botão.**

      A barra passa a **quebrar** em vez de cortar. Quem decide é
      `min-width:max-content`: o botão diz ao layout de quanto precisa para o
      rótulo inteiro, e a linha quebra quando os dois não cabem juntos. Um
      número fixo não servia — testei com 150px e dois rótulos de 22 caracteres
      cabiam na conta e continuavam cortados.
- [x] Com a barra a quebrar, os dois rótulos que eu tinha encurtado à mão
      ("Confirmar", "Voltar") **voltaram ao completo** — eram remendos para o
      mesmo problema, e o telefone deixou de precisar deles

Conferido: 375px sem nada cortado nos sete modais; 1440 mantém os dois botões
lado a lado.

---

# 13 · Vídeos: os cinco que temos, e onde tocam

| Vídeo | Modal | Estava a tocar? |
|---|---|---|
| `momento-campeao.mp4` | Momento campeão (liga e copa) | sim |
| `momento-crise.mp4` | Momento de crise | sim |
| `boas-vindas-presidente.mp4` | Boas-vindas do presidente | sim |
| `convite-jantar.mp4` | Convite para jantar | **não** |
| `convite-assinatura.mp4` | O jantar e a proposta | **não** |

### Corrigido nesta rodada
- [x] **Dois vídeos existiam no disco e não tocavam em lado nenhum.** O pacote
      desenha estes dois modais com um bloco "ESPAÇO RESERVADO · 16:9", e o
      porte copiou o bloco **à letra** — o jogo mostrava o cartaz do mockup, com
      o texto do mockup, no lugar exato onde o vídeo devia estar.
      Eles tocavam no desenho antigo: quando `showJobInvite`/`showJobProposal`
      passaram a devolver o modal novo, o código velho — e o vídeo com ele —
      ficou depois do `return`, inalcançável.
- [x] `rfVideoHTML` passa a aceitar um ficheiro. Com ele, o espaço 16:9 **é** o
      vídeo, com legenda sobre um rodapé escuro; sem ele continua o cartaz — que
      é o certo para os **seis momentos que ainda não têm filme** (marcador de
      liga e de copa, promovido, rebaixado, abertura e final de copa)
- [x] Nunca com som: `muted` no HTML **e** `volume=0` ao carregar

Conferido nos cinco: tocam, em loop, mudos, e em 375px o quadro respeita o 16:9
(311×175) dentro da tela.

### Se quiser mais vídeos
Os seis buracos já têm chave e comentário em `VIDEOS_MOMENTO` (main.js): basta
pôr o ficheiro em `public/video/` e trocar o `null` pelo caminho.
