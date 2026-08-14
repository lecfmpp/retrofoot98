# Brief de design — as 11 ações que ainda usam a tela antiga

**Para:** quem vai desenhar estas telas
**Produto:** RetroFoot98 — jogo de gerir clube de futebol, no navegador, em português de Portugal
**Estado:** o rebranding 2026 já cobriu as 7 páginas do jogo e 24 diálogos de ação. Estas 11 ações
ficaram de fora e ainda abrem a interface antiga (cinzenta, estilo Windows 98). É o último resto.

---

## 1. Como ler este documento

Cada ação abaixo tem cinco campos, sempre na mesma ordem:

| Campo | O que responde |
|---|---|
| **Onde clica** | página ▸ aba ▸ o elemento exacto. É o caminho que o utilizador faz. |
| **Para que serve** | o que a acção faz no jogo, em uma frase. |
| **O que o jogo sabe** | os dados que existem de verdade e podem aparecer na tela. |
| **O que a tela mostra** | os blocos que a tela precisa ter, de cima para baixo. |
| **Rodapé** | os botões, e qual deles é a acção dominante. |

Há também um campo **⚠ Não inventar** quando existe risco de desenhar um dado que o jogo não tem.
Esse campo é a regra mais importante do documento: **uma tela que mostra um número que o motor não
calcula é uma tela que não pode ser construída.** Se faltar informação para um bloco ficar bonito,
o caminho é tirar o bloco, não inventar o número.

---

## 2. O sistema visual (não é negociável)

Já existe um sistema. Estas 11 telas entram nele, não ao lado dele.

### 2.1 O envelope de diálogo

Todas estas telas — com quatro excepções marcadas mais abaixo — usam **o mesmo envelope** que os 24
diálogos já desenhados:

```
┌─────────────────────────────────────────┐
│▌ MERCADO · COMPRAR              ← kicker│  cabeçalho: degradê escuro
│▌ Proposta por Éder Nunes         ← título│  filete amarelo de 5px à esquerda
├─────────────────────────────────────────┤
│                                         │
│  [faixa de identidade]                  │  corpo: 18px de respiro, 14px entre blocos
│  [campo com rótulo e ajuda]             │
│  [linha de consequência]                │
│  nota final em cinza                    │
│                                         │
├─────────────────────────────────────────┤
│ Cancelar                    Acção ──────│  rodapé: fundo levemente mais escuro
└─────────────────────────────────────────┘
```

- **Largura:** 440px (aviso curto), 460–480px (confirmação), 500–520px (formulário).
- **Cantos:** 18px. **Sombra:** difusa e baixa, o cartão flutua pouco.
- **Cabeçalho:** degradê de 100° do azul profundo para o azul da marca. Filete amarelo de 5px
  colado à esquerda, de topo a base. Kicker em mono, 9px, maiúsculas, espaçamento de .14em,
  azul claro. Título em 17px, negrito, branco.
- **Rodapé:** três tons de botão, e só três — **amarelo** (a acção), **contorno** (voltar/cancelar),
  **vermelho** (o que não tem volta). Um botão só encosta à direita; dois abrem-se nas pontas.

### 2.2 As peças que já existem — reutilize antes de inventar

| Peça | Para quê |
|---|---|
| **Faixa de identidade** | camisa + nome + linha de contexto + um número à direita. Fundo suave, cantos de 14px. |
| **Campo** | rótulo em maiúsculas pequenas, caixa de 46px, linha de ajuda em cinza por baixo. |
| **− valor ＋** | escolher um número pequeno (anos de contrato, quantidade). |
| **Linha de consequência** | rótulo à esquerda, número à direita. Verde = entra, amarelo = atenção, vermelho = sai. |
| **Medidor de chance** | barra de 8px com a percentagem por cima. |
| **Selo de resultado** | emoji grande, título, subtítulo. Para telas de "aconteceu". |
| **Lista de opções** | rádio + título + explicação. Para escolher entre caminhos. |
| **Aviso em bloco** | parágrafo com barra colorida à esquerda. Amarelo = atenção, vermelho = perigo. |

### 2.3 Regras de linguagem visual

- **Emoji é o sistema de ícones.** Não desenhe ícones novos, não use biblioteca de ícones.
- **Números são sempre em fonte mono e alinhados à direita.** Dinheiro, força, idade, percentagem.
- **Dinheiro escreve-se por extenso:** `R$ 620 mil`, `R$ 1,25 mi`. Nunca `620k`, nunca `1.2M`.
- **Sem degradês decorativos.** O único degradê do sistema é o do cabeçalho do diálogo.
- **Sem relevos, sem biséis, sem sombra interna.** Isso é a pele antiga.
- **O escudo do clube é sempre imagem real**, nunca desenho. Sobre fundo branco, sem moldura.
- **O troféu é arte real**, nunca escudo e nunca emoji.
- **Português de Portugal**: "seleccionar", "acção", "connosco". É intencional.

### 2.4 Modo escuro e telemóvel

- **Telemóvel (≤560px):** o diálogo encosta na base do ecrã, ocupa a largura toda, cantos
  arredondados só em cima. Os botões do rodapé passam a ocupar metade cada.
- Não há modo escuro. Não desenhe um.

---

## 3. As 11 telas

### Grupo A — Sistema e conta (encaixam no envelope de diálogo)

---

#### A1 · Opções do jogo

- **Onde clica:** três sítios levam à mesma tela — **Configurações ▸ Opções** (nas pílulas de
  moeda, ritmo e modo, e no botão "⚙️ Abrir opções do jogo"), **Configurações ▸ Jogo** ("⚙️ Opções"),
  e **Treinador ▸ Perfil** ("Abrir as opções").
- **Para que serve:** ajustar como o jogo se comporta — o que mostra, quando grava, a que ritmo joga.
- **O que o jogo sabe:** oito ajustes reais, divididos em dois grupos.
  - *Geral:* mostrar chicotadas psicológicas (Nunca / Dos humanos / De todos) · ver sorteio da taça
    (Nunca / Quando houver humanos / Sempre) · gravar o jogo (Nunca / De 3 em 3 jornadas / Sempre) ·
    som (Sim / Não) · salvamento automático (Sim / Não) · **voltar a um ponto guardado** (abre outra tela).
  - *Jogo:* substituições ao intervalo (Sim / Não) · ver desempates por penalties nos jogos sem
    humanos (Sim / Não) · **tempo de jogo** (Curto / Médio / Longo / Ultrassónico).
- **O que a tela mostra:**
  1. Duas abas no topo do corpo: **Geral** e **Jogo**.
  2. Uma linha por ajuste: nome à esquerda, controlo à direita. Alguns têm uma segunda linha de
     explicação em cinza (o salvamento automático explica que guarda as 3 últimas jornadas).
  3. Um caso especial: **na Resenha, quem não é anfitrião vê o "tempo de jogo" bloqueado** — com
     cadeado e a nota "definido pelo Anfitrião". Desenhe este estado.
  4. "Voltar a um ponto guardado" é uma **linha com botão**, não um interruptor — leva a outra tela.
- **Rodapé:** `Cancelar` (contorno) · `Guardar` (amarelo).
- **⚠ Não inventar:** não há mais ajustes. Nada de volume, idioma, tema, notificações ou
  privacidade — o jogo não tem nada disso.

---

#### A2 · Sair para o menu

- **Onde clica:** **Configurações ▸ Jogo** ▸ "↩ Sair para o menu".
- **Para que serve:** deixar a partida e voltar à lista de saves. Não apaga nada.
- **O que o jogo sabe:** o clube, a jornada actual, e se há algo por gravar.
- **O que a tela mostra:** confirmação curta. Clube e jornada como linhas de consequência, e a
  garantia explícita de que **nada se perde** — é o medo que esta tela tem de resolver.
- **Rodapé:** `Cancelar` (contorno) · `Gravar e sair` (amarelo).
- **Nota:** já existe um diálogo desenhado quase igual (`Sair deste save?`). Esta tela pode ser
  o mesmo desenho — vale confirmar se são a mesma coisa ou se o menu é destino diferente.

---

#### A3 · Apagar save (a partir da lista de saves)

- **Onde clica:** **Continuar save** (a tela de escolha de save, antes de entrar no jogo) ▸ o
  ícone de lixeira na linha de cada save.
- **Para que serve:** apagar uma carreira guardada. **Não tem volta.**
- **O que o jogo sabe:** nome do save, clube, temporada, jornada, quando foi gravado.
- **O que a tela mostra:**
  1. Aviso em bloco vermelho: o que some (temporada, elenco, histórico do treinador).
  2. As linhas do save que vai morrer, para o utilizador confirmar que é esse mesmo.
  3. **Campo de confirmação por digitação** — escrever o nome do clube para libertar o botão.
- **Rodapé:** `Cancelar` (contorno) · `Apagar para sempre` (**vermelho**).
- **Nota:** o diálogo `Apagar o save` já está desenhado e implementado em Configurações. Esta
  tela é o mesmo diálogo chamado de outro sítio — provavelmente **não precisa de desenho novo**,
  só de confirmação de que serve nos dois contextos.

---

#### A4 · Histórico do clube

- **Onde clica:** **Formação ▸ Classificação** (e na página Campeonatos) ▸ **clique numa linha
  da tabela**. Repare: não há botão. A linha inteira é o gatilho.
- **Para que serve:** ver as temporadas em que o utilizador comandou aquele clube neste save.
- **O que o jogo sabe:** por temporada — divisão, posição final, pontos, e se foi título.
  **Só das temporadas em que o utilizador comandou aquele clube.** Para os outros 79 clubes do
  mundo, a lista vem vazia.
- **O que a tela mostra:**
  1. Escudo e nome do clube no cabeçalho.
  2. Tabela de temporadas: ano · divisão · posição · pontos · troféu quando houver.
  3. **O estado vazio é o caso mais comum** — o utilizador clica em qualquer linha da tabela e
     quase sempre não comandou aquele clube. Desenhe esse estado com o mesmo cuidado do cheio:
     tem de explicar *porquê* está vazio, não só dizer "sem dados".
- **Rodapé:** `Fechar` (amarelo, botão único).
- **⚠ Não inventar:** não há história dos clubes antes do save começar. Não há fundação, estádio,
  rivalidades, ídolos, nem palmarés real. O jogo começa do zero em 2026.

---

### Grupo B — Ações de jogo (encaixam no envelope de diálogo)

---

#### B1 · Construir arquibancada

- **Onde clica:** **Finanças ▸ Estádio** ▸ o botão de construir.
- **Para que serve:** ampliar o estádio em 5.000 lugares, pagando à vista. Mais lugares = mais
  bilheteria por jogo em casa.
- **O que o jogo sabe:** capacidade actual · capacidade máxima para o porte do clube · quanto já
  foi construído nesta temporada · custo da próxima bancada (sobe conforme o estádio cresce) ·
  caixa actual.
- **Regras que a tela tem de comunicar** — as três são recusas reais do motor:
  1. **5.000 lugares por bancada.**
  2. **Máximo de 10.000 lugares por temporada** — "obra é lenta, cresce por anos".
  3. **Tecto por porte do clube** — para passar dele, é preciso crescer o clube (título, elenco).
- **O que a tela mostra:**
  1. Capacidade agora → capacidade depois, com o salto visível.
  2. Custo, e o caixa depois da obra (vermelho se não dá).
  3. Quanto resta da cota da temporada — uma barra serve bem aqui.
  4. O ganho: quanto isto significa em bilheteria. *(Ver ⚠ abaixo.)*
- **Rodapé:** `Cancelar` (contorno) · `🏗 Construir` (amarelo).
- **⚠ Não inventar:** o jogo **não calcula** a receita futura da bancada nova. Se o bloco 4 for
  desenhado, tem de ser como texto explicativo ("mais lugares rendem mais bilheteria nos jogos em
  casa"), nunca como um número de reais previsto. Também não há plantas, sectores, nomes de
  arquibancada, nem obra em fases — a bancada é um número.

---

#### B2 · Chamar pra Resenha

- **Onde clica:** três sítios — **Configurações ▸ Modo Resenha**, a **barra do clube** no topo, e
  durante a **Partida ao Vivo**.
- **Para que serve:** convidar um amigo para assumir um clube da máquina *nesta partida em curso*.
  Ele entra imediatamente na sala.
- **O que o jogo sabe:** o link da sala · o código da sala · quantos assentos estão ocupados ·
  quais clubes estão livres.
- **O que a tela mostra:**
  1. Uma frase a explicar o que acontece: o amigo entra agora e assume um time da máquina.
  2. **Link da sala** com botão de copiar — este é o caminho principal, dê-lhe peso.
  3. **Por WhatsApp**: campo de telefone com o +55 fixo à esquerda, e botão de enviar.
  4. **Por e-mail**: campo de e-mail e botão de enviar.
  5. A nota de que **o clube do convidado é sorteado** ao entrar — ele não escolhe.
- **Rodapé:** `Fechar` (contorno, botão único — as acções estão no corpo).
- **⚠ Não inventar:** não há lista de amigos, não há histórico de convites, não há convite por
  utilizador do jogo. São três canais: link, WhatsApp, e-mail.
- **Nota de composição:** esta tela tem quatro blocos de acção e é a mais cheia das onze. Pode
  precisar de 560px em vez de 520px. É o único sítio onde vale abrir a excepção de largura.

---

### Grupo C — Passagens de fluxo (NÃO são diálogo — são tela cheia)

Estas quatro não cabem num cartão de 500px. São momentos de transição do jogo, e o sistema já tem
um envelope para isso: **a tela cheia entre partidas** — fundo verde-escuro, um cartão largo ao
centro, sem botão de fechar. Desenhe-as nesse envelope, não no de diálogo.

---

#### C1 · Avançar temporada

- **Onde clica:** **Competição ▸ Visão geral** ▸ o botão grande no fim da tela, no fecho da temporada.
- **Para que serve:** fechar a temporada e começar a seguinte. É irreversível e muda o mundo todo:
  promoções, descidas, novo calendário, mercado reaberto.
- **O que o jogo sabe:** posição final · se subiu, desceu ou ficou · títulos da temporada ·
  o que muda na temporada nova (divisão, competições em que entra).
- **O que a tela mostra:** o balanço da temporada que acaba, e depois o que espera na que começa.
  É uma tela de **celebração ou de luto**, conforme o desfecho — o desenho tem de aguentar os dois.
- **Rodapé:** um botão só, dominante: `Começar a temporada`.
- **⚠ Não inventar:** não há renovação de contrato do treinador, não há metas da direção para o
  ano novo, não há orçamento negociado. A temporada nova começa com o que ficou.

---

#### C2 · Voltar ao hub (a partir da classificação de copa)

- **Onde clica:** **Copa ▸ Classificação da fase** ▸ "Voltar ao hub".
- **Para que serve:** sair da tela da copa e voltar à Formação.
- **⚠ Isto provavelmente não precisa de desenho.** É navegação pura — não devia abrir tela
  nenhuma. Hoje abre porque herdou o caminho antigo. **A correção certa é técnica, não de design:
  o botão deve simplesmente navegar.** Está listado aqui só para não ficar esquecido.

---

#### C3 e C4 · Convite e proposta de emprego

- **Onde clica:** **não há clique** — estas telas aparecem sozinhas quando outro clube quer o
  utilizador como treinador.
- **Estado:** **já foram desenhadas** (as telas `Modal - Convite para Jantar` e
  `Modal - Jantar e Proposta` do pacote anterior) e já estão implementadas. O que ainda usa a pele
  antiga são **três botões dentro delas**: "Recusar o convite", "Aceitar o jantar" e
  "Agradecer e ficar".
- **O que falta:** só confirmar que estes três botões seguem os três tons do sistema
  (amarelo / contorno / vermelho) e que o que abrem depois é tela nova. **Não precisam de
  desenho novo** — precisam de revisão.

---

## 4. Duas telas prontas à espera de gatilho

Não precisam de desenho. Estão implementadas e ninguém as dispara ainda — é trabalho de
programação, e está aqui só para o quadro ficar completo:

- **Arrematado!** — o resultado do leilão, quando o lote fecha e o utilizador levou o jogador.
- **Caixa insuficiente** — quando a proposta passa do que há em caixa.

---

## 5. O que perguntar antes de desenhar

Três decisões que não estão tomadas e mudam o desenho:

1. **"Sair para o menu" e "Sair deste save" são a mesma coisa?** Se forem, é uma tela, não duas.
2. **O histórico do clube vale a pena?** A tabela está quase sempre vazia, porque o utilizador
   comandou um clube e a classificação tem vinte. Talvez o clique na linha deva mostrar outra
   coisa — ou não fazer nada.
3. **"Chamar pra Resenha" cabe num diálogo?** São quatro blocos de acção. Pode ser que queira ser
   uma tela, não um cartão.
