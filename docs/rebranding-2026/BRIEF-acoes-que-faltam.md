# As 11 ações que ainda precisam de tela

**Produto:** RetroFoot98 — jogo de gerir clube de futebol, no navegador, em português de Portugal.
**O que é isto:** o rebranding já cobriu as 7 páginas do jogo e 24 diálogos de ação. Estas 11 ações
ficaram de fora. Abaixo está, para cada uma, o que criar, onde ela vive e o que a aciona.

---

## Como ler

| Campo | O que responde |
|---|---|
| **Onde fica** | página ▸ aba ▸ o elemento exacto. É o caminho que o utilizador faz. |
| **O que aciona** | o clique (ou o evento) que abre a tela. |
| **Para que serve** | o que a ação faz no jogo, em uma frase. |
| **Dados disponíveis** | o que o motor sabe de verdade e pode aparecer na tela. |
| **Conteúdo da tela** | os blocos que a tela precisa ter, de cima para baixo. |
| **Ações** | os botões, e qual é o principal. |

O campo **⚠ Não inventar** aparece onde há risco de pedir um dado que o jogo não calcula. É a regra
mais importante daqui: **uma tela que mostra um número que o motor não produz não pode ser
construída.** Faltando informação para um bloco, tire o bloco — não invente o número.

Uma nota de escrita: o jogo é em **português de Portugal** ("seleccionar", "acção", "connosco").
É intencional, não é erro.

---

## 1 · Opções do jogo

- **Onde fica:** Configurações ▸ Opções · Configurações ▸ Jogo · Treinador ▸ Perfil.
- **O que aciona:** os três levam à mesma tela — as pílulas de moeda/ritmo/modo e o botão
  "Abrir opções do jogo" (Configurações ▸ Opções), o botão "Opções" (Configurações ▸ Jogo), e
  "Abrir as opções" (Treinador ▸ Perfil).
- **Para que serve:** ajustar como o jogo se comporta — o que mostra, quando grava, a que ritmo joga.
- **Dados disponíveis:** oito ajustes, em dois grupos.
  - *Geral:* mostrar chicotadas psicológicas (Nunca / Dos humanos / De todos) · ver sorteio da taça
    (Nunca / Quando houver humanos / Sempre) · gravar o jogo (Nunca / De 3 em 3 jornadas / Sempre) ·
    som (Sim / Não) · salvamento automático (Sim / Não, guarda as 3 últimas jornadas e o fim de cada
    temporada) · voltar a um ponto guardado (leva a outra tela).
  - *Jogo:* substituições ao intervalo (Sim / Não) · ver desempates por penalties nos jogos sem
    treinadores humanos (Sim / Não) · tempo de jogo (Curto / Médio / Longo / Ultrassónico).
- **Conteúdo da tela:**
  1. Duas abas: **Geral** e **Jogo**.
  2. Uma linha por ajuste: nome à esquerda, controlo à direita. Alguns pedem uma segunda linha de
     explicação (o salvamento automático explica o que guarda).
  3. **Estado bloqueado:** no Modo Resenha, quem não é anfitrião não pode mudar o *tempo de jogo* —
     a linha aparece travada, com a nota de que quem define é o Anfitrião. Este estado precisa de
     desenho próprio.
  4. "Voltar a um ponto guardado" é uma linha com **botão**, não um interruptor — leva a outra tela.
- **Ações:** `Cancelar` · `Guardar` *(principal)*.
- **⚠ Não inventar:** são exactamente estes oito ajustes. Nada de volume, idioma, tema,
  notificações, privacidade ou conta — o jogo não tem nada disso.

---

## 2 · Sair para o menu

- **Onde fica:** Configurações ▸ Jogo.
- **O que aciona:** o botão "Sair para o menu".
- **Para que serve:** deixar a partida e voltar à lista de saves. Não apaga nada.
- **Dados disponíveis:** clube · jornada actual · se há algo por gravar.
- **Conteúdo da tela:** confirmação curta. Clube e jornada, e a garantia explícita de que **nada se
  perde** — é o medo que esta tela existe para resolver.
- **Ações:** `Cancelar` · `Gravar e sair` *(principal)*.
- **Ver antes de desenhar:** já existe uma tela quase igual, "Sair deste save?". Pode ser a mesma —
  ver a pergunta 1 no fim do documento.

---

## 3 · Apagar save (na lista de saves)

- **Onde fica:** Continuar save — a tela de escolha de save, antes de entrar no jogo.
- **O que aciona:** o ícone de lixeira na linha de cada save.
- **Para que serve:** apagar uma carreira guardada. **Não tem volta.**
- **Dados disponíveis:** nome do save · clube · temporada · jornada · quando foi gravado.
- **Conteúdo da tela:**
  1. Aviso do que some: temporada, elenco, histórico do treinador.
  2. Os dados do save que vai morrer, para confirmar que é esse mesmo.
  3. **Confirmação por digitação** — escrever o nome do clube para libertar o botão.
- **Ações:** `Cancelar` · `Apagar para sempre` *(principal, destrutiva)*.
- **Ver antes de desenhar:** esta tela **já existe**, chamada a partir de Configurações. Aqui é a
  mesma tela chamada de outro sítio. Só precisa de confirmação de que serve nos dois contextos —
  provavelmente **não precisa de desenho novo**.

---

## 4 · Histórico do clube

- **Onde fica:** Formação ▸ Classificação, e na página Campeonatos.
- **O que aciona:** **o clique na linha da tabela**. Não há botão — a linha inteira é o gatilho.
- **Para que serve:** ver as temporadas em que o utilizador comandou aquele clube neste save.
- **Dados disponíveis:** por temporada — divisão, posição final, pontos, e se foi título. **Só das
  temporadas em que o utilizador comandou aquele clube.** Para os outros 79 clubes do mundo, vem vazio.
- **Conteúdo da tela:**
  1. Escudo e nome do clube.
  2. Tabela de temporadas: ano · divisão · posição · pontos · troféu quando houver.
  3. **O estado vazio é o caso mais comum.** O utilizador clica em qualquer linha e quase sempre não
     comandou aquele clube. Este estado precisa do mesmo cuidado do cheio: tem de explicar *porquê*
     está vazio, não só dizer "sem dados".
- **Ações:** `Fechar` *(única)*.
- **⚠ Não inventar:** não há história dos clubes antes do save começar — nem fundação, nem estádio,
  nem rivalidades, nem ídolos, nem palmarés real. O mundo começa do zero em 2026.

---

## 5 · Construir arquibancada

- **Onde fica:** Finanças ▸ Estádio.
- **O que aciona:** o botão de construir.
- **Para que serve:** ampliar o estádio em 5.000 lugares, pagando à vista. Mais lugares = mais
  bilheteria por jogo em casa.
- **Dados disponíveis:** capacidade actual · capacidade máxima para o porte do clube · quanto já foi
  construído nesta temporada · custo da próxima bancada (sobe conforme o estádio cresce) · caixa actual.
- **Regras que a tela tem de comunicar** — as três são recusas reais do motor:
  1. 5.000 lugares por bancada.
  2. Máximo de 10.000 lugares por temporada — obra é lenta, cresce por anos.
  3. Tecto por porte do clube — para passar dele é preciso crescer o clube (título, elenco).
- **Conteúdo da tela:**
  1. Capacidade agora → capacidade depois, com o salto visível.
  2. Custo, e o caixa depois da obra.
  3. Quanto resta da cota da temporada.
  4. O ganho — ver ⚠ abaixo.
- **Estados de recusa:** as três regras acima podem bloquear a obra. Cada uma precisa da sua
  mensagem, porque o que o utilizador deve fazer é diferente em cada caso (esperar a próxima
  temporada, ganhar título, arranjar dinheiro).
- **Ações:** `Cancelar` · `Construir` *(principal)*.
- **⚠ Não inventar:** o jogo **não calcula** a receita futura da bancada nova. O bloco 4 só pode ser
  texto explicativo ("mais lugares rendem mais bilheteria nos jogos em casa"), nunca um valor
  previsto. Também não há plantas, sectores, nomes de arquibancada nem obra em fases — a bancada é
  um número.

---

## 6 · Chamar pra Resenha

- **Onde fica:** Configurações ▸ Modo Resenha · a barra do clube no topo · a Partida ao Vivo.
- **O que aciona:** o botão "Chamar pra Resenha" nos três sítios.
- **Para que serve:** convidar um amigo para assumir um clube da máquina *nesta partida em curso*.
  Ele entra imediatamente na sala.
- **Dados disponíveis:** link da sala · código da sala · quantos assentos estão ocupados · quais
  clubes estão livres.
- **Conteúdo da tela:**
  1. Uma frase a explicar o que acontece: o amigo entra agora e assume um time da máquina.
  2. **Link da sala** com botão de copiar — é o caminho principal, precisa de peso.
  3. **Por WhatsApp:** campo de telefone com o +55 fixo à esquerda, e botão de enviar.
  4. **Por e-mail:** campo de e-mail e botão de enviar.
  5. A nota de que **o clube do convidado é sorteado** ao entrar — ele não escolhe.
- **Ações:** `Fechar` *(única — as acções estão no corpo)*.
- **⚠ Não inventar:** não há lista de amigos, histórico de convites, nem convite por utilizador do
  jogo. São três canais: link, WhatsApp, e-mail.
- **Nota:** é a mais cheia das onze — quatro blocos de acção. Ver a pergunta 3 no fim.

---

## 7 · Avançar temporada

- **Onde fica:** Competição ▸ Visão geral.
- **O que aciona:** o botão no fim da tela, no fecho da temporada.
- **Para que serve:** fechar a temporada e começar a seguinte. É irreversível e muda o mundo todo:
  promoções, descidas, novo calendário, mercado reaberto.
- **Dados disponíveis:** posição final · se subiu, desceu ou ficou · títulos da temporada · o que
  muda na temporada nova (divisão, competições em que entra).
- **Conteúdo da tela:** o balanço da temporada que acaba, e depois o que espera na que começa.
- **Dois desfechos opostos:** subir e descer usam a mesma tela. Ela tem de aguentar celebração e
  luto — este é o principal desafio do desenho aqui.
- **Ações:** `Começar a temporada` *(única)*.
- **⚠ Não inventar:** não há renovação de contrato do treinador, metas da direcção para o ano novo,
  nem orçamento negociado. A temporada nova começa com o que ficou.
- **Formato:** é uma passagem de temporada, não uma confirmação — pede tela cheia, não cartão.

---

## 8 · Voltar ao hub (na classificação de copa)

- **Onde fica:** Copa ▸ Classificação da fase.
- **O que aciona:** o botão "Voltar ao hub".
- **⚠ Provavelmente não precisa de tela nenhuma.** É navegação pura: devia simplesmente levar o
  utilizador à Formação. Hoje abre uma tela porque herdou um caminho antigo. A correcção é técnica,
  não de desenho. Está aqui só para não ficar esquecido.

---

## 9, 10, 11 · Convite e proposta de emprego

- **Onde fica:** aparecem sozinhas, sobre qualquer página.
- **O que aciona:** **não há clique** — o jogo abre quando outro clube quer o utilizador como treinador.
- **Estado:** as duas telas (o convite para jantar e a proposta) **já estão desenhadas e
  implementadas**. O que ficou para trás são **três botões dentro delas**: "Recusar o convite",
  "Aceitar o jantar" e "Agradecer e ficar".
- **O que falta:** confirmar que os três botões seguem o padrão e que o que abrem depois é tela
  nova. **Não precisam de desenho novo — precisam de revisão.**

---

## Duas telas prontas à espera de gatilho

Não precisam de desenho. Estão implementadas e ninguém as dispara ainda — é trabalho de
programação, listado aqui só para o quadro ficar completo:

- **Arrematado!** — o resultado do leilão, quando o lote fecha e o utilizador levou o jogador.
- **Caixa insuficiente** — quando a proposta passa do que há em caixa.

---

## Três perguntas a responder antes de desenhar

1. **"Sair para o menu" e "Sair deste save" são a mesma coisa?** Se forem, é uma tela, não duas.
2. **O histórico do clube vale a pena?** A tabela está quase sempre vazia — o utilizador comandou um
   clube e a classificação tem vinte. Talvez o clique na linha deva mostrar outra coisa, ou nada.
3. **"Chamar pra Resenha" cabe num diálogo?** São quatro blocos de acção — pode querer ser uma tela.
