# Mapa de telas e painel admin

Este capítulo tem duas partes:

- **Parte A — Mapa de telas do jogo.** Serve para responder ao jogador "onde fica tal coisa?" e "como chego lá?". Descreve a pele atual do jogo (o redesenho de 2026, chamado internamente de "rf26").
- **Parte B — Painel dos sócios (painel admin).** Serve para quem atende o jogador: onde achar a conta, o plano, os saves e as salas, e o que cada papel de acesso consegue ver.

Os nomes de botões, abas e menus estão escritos como aparecem na tela. Quando o código deixa alguma dúvida, o texto avisa.

---

# PARTE A — MAPA DE TELAS DO JOGO

## Visão geral da navegação

O jogo tem três grandes momentos:

1. **Fora do jogo.** É a página inicial (landing) e as páginas institucionais.
2. **Assistente de entrada.** Criar conta ou entrar, escolher o modo e montar o save.
3. **Dentro do save.** É a área logada, com o **menu lateral** (desktop) ou a **barra inferior** (celular). Dentro dela ficam as telas de partida, de classificação, de sorteio, do fim de temporada e da entrevista coletiva.

Uma regra de desenho explica boa parte da navegação: **o que está no menu é página; o que aparece sozinho é janela (popup).** Proposta recebida, convite de emprego, lesão no meio do jogo e confirmação de exclusão são janelas. Mercado, Elenco e Finanças são páginas com abas.

### O menu lateral (desktop)

A barra lateral fica à esquerda e tem, de cima para baixo:

- **Escudo e nome do clube**, com a divisão e o ano. Clicar aí volta para a Formação (a página inicial do save).
- **Os destinos do menu, nesta ordem:**
  1. **Formação** (a página inicial, também chamada de "hub")
  2. **Mercado**
  3. **Elenco & Base**
  4. **Campeonatos**
  5. **Treinador**
  6. **Finanças**
  7. **E-mail**
  8. **Ranking**
  9. **Configurações**
  10. **Minha Conta**
  11. **Sair do jogo** (sempre o último)
- **Contadores (bolinhas numeradas)** em três itens:
  - E-mail: mensagens não lidas.
  - Mercado: propostas e contrapropostas recebidas.
  - Treinador: ofertas de emprego.
- **Um quadro de publicidade** (vitrine de patrocinador) e o **botão do grupo do WhatsApp**, quando o link está configurado.
- **Recolher menu**, no pé da barra. É a seta que encolhe a barra só para ícones e expande de volta. A escolha fica guardada no aparelho.

Navegar pelo menu **sempre volta ao próprio clube**. Se o jogador estava "visitando" o elenco de outro time e clica em "Elenco & Base", ele volta ao elenco dele.

### A barra inferior (celular)

No telefone não há barra lateral. Embaixo da tela aparecem:

- **Formação**, **Elenco**, **Mercado** e **Tabela** (a Tabela é a página Campeonatos).
- **Mais**: abre uma folha com os outros destinos (Treinador, Finanças, E-mail, Ranking, Configurações, Minha Conta e Sair do jogo) e, no fim, o nome e o e-mail da conta com o botão **Sair da conta**.
- **O botão principal de avanço** (Jogar / Avançar / Escolher formação etc.). Veja "O botão Jogar" mais abaixo.

### O cabeçalho das páginas

- **Formação** abre com a **faixa do clube**. Ela mostra escudo, nome do clube, nome do treinador, país, divisão, a data do dia do jogo e o ano, o dinheiro **Em caixa** e a **Forma** (os últimos resultados).
  - Numa sala do Modo Resenha, a faixa também tem um botão para **sincronizar a sala**.
  - Com a conta logada, aparece o nome do jogador com "· Sair". Esse botão grava e sai da conta.
- **As outras páginas** abrem com título, uma linha de resumo e, à direita, **dois botões de ação** (por exemplo, "Exportar lista" e "Buscar jogador" no Mercado). Logo abaixo ficam as **abas** da página.
- No topo da janela pode aparecer uma **faixa do ranking** com a posição do jogador (#posição e pontos).
- No celular, a Formação ganha uma tira com **FORMA · MORAL · situação da janela de transferências**.

### O botão Jogar (o botão principal de avanço)

O texto do botão muda conforme o próximo passo, e o botão faz exatamente o que diz. No desktop ele fica no **cartão do adversário**, dentro do bloco "Formações" da página Formação. No celular fica na barra inferior. Os textos possíveis, na ordem em que o jogo decide:

| Texto no botão | O que significa |
|---|---|
| **Em campo** | Já há uma partida em andamento. |
| **Ver classificação** | Numa semana com várias competições, há uma tabela de copa para ver antes. |
| **Escolher formação** | Falta escolher a tática. O botão leva ao bloco de formações. |
| **Ver o sorteio** | Há um sorteio de copa para assistir. |
| **Escalar um goleiro** / **Só um goleiro** | O time está sem goleiro ou com mais de um goleiro escalado. |
| **Acertando a semana** / **Fechando a semana** | Só no Modo Resenha: é preciso aguardar a sala. |
| **Quase pronto** / **Pronto** | No Modo Resenha, "Jogar" marca que o treinador está pronto. Clicar de novo cancela. |
| **Jogar** | Entra em campo. |
| **Assistir à semana** | Há uma copa rodando que o clube do jogador não disputa. |
| **Avançar** | Só no Modo Solo: semana sem jogo. O botão passa a semana. |

**Cores do botão:**

- **Verde:** o clique leva a jogo.
- **Amarelo:** "quase pronto", ou seja, falta o resto da sala.
- **Azul:** falta algum passo antes do jogo.

Abaixo das formações aparece a tira **"Esta semana"**, com os sete dias:

- dia **colorido**: jogo do clube do jogador;
- dia **apagado**: competição que ele só assiste;
- dia **vazio**: sem jogo.

Referência técnica: `rfProximaAcao`, `rfJogar`, `rfSemanaHTML` em `public/src/ui/rf26.js`.

### Atalhos de teclado

- **F1 a F6** trocam a formação na página Formação: F1 = 3-3-4, F2 = 3-4-3, F3 = 4-2-4, F4 = 4-3-3, F5 = 4-4-2, F6 = 4-5-1.
  - Só valem fora de partida e fora de campo de texto.
  - Alguns navegadores tomam o F1 (ajuda) e o F5 (recarregar) antes do jogo. Nesse caso, o jogador deve clicar na formação.
  - Os números 1 a 6 sozinhos **não** trocam a formação, de propósito: eles conflitavam com o campo de preço de venda.
- **Esc** fecha a janela aberta. Não fecha as decisões obrigatórias, como a janela de demissão. O Esc também fecha o campo em tela cheia, o Modo Camarote e o chat.
- **C** abre e fecha o chat, só no Modo Resenha e só no desktop. Não funciona enquanto o jogador digita.

Referência técnica: `FKEY` e os ouvintes de teclado em `public/src/ui/main.js`; o chat em `rf26.js`.

---

## Entrada no jogo (antes do save)

### Página inicial (landing)

É a página pública, com menu no topo: **O jogo**, **Por dentro**, **Modo Resenha** e **Planos**. Dela partem o cadastro e o login. As páginas institucionais (sobre, ajuda, contato, termos) usam o mesmo cabeçalho.

### Assistente (onboarding)

As telas do assistente têm uma **régua de passos**:

- **Modo Solo:** Entrar · Modo · Save · País e liga · Treinador · Clube · Jogar.
- **Modo Resenha (quem cria a sala):** Entrar · Modo · Treinador · País e liga · Sala · Convites · Clube · Jogar.
- **Convidado que entra por código:** Entrar · Modo · Código · Treinador · Sala · Clube · Jogar.

As telas principais:

- **Entrar.** Duas abas: **Criar conta** e **Entrar**.
  - Para criar conta, pede nome do treinador, e-mail, WhatsApp, time do coração (obrigatório) e senha (6 ou mais caracteres, com letra e número).
  - Há uma caixa opcional: "Quero receber aviso quando abrir vaga nas Ligas Oficiais".
  - Na aba Entrar existe o link **Esqueci minha senha**.
  - Se o jogador já está logado, a tela diz "Você já está logado" e oferece **Entrar com outra conta**.
- **Modo.** Dois cartões: **Modo Solo** ("Jogar sozinho") e **Modo Resenha**.
  - Nesta versão o Modo Resenha aparece como **"Em breve"**. O botão dele oferece "Garantir acesso com o Pro", ou mostra "Acesso garantido no lançamento" para quem já é Pro.
- **Save (Modo Solo).** Lista os saves na nuvem com o botão **Continuar**, mais a opção de começar um save novo e dar nome a ele.
- **Modalidade.** Masculino ou feminino. Por enquanto o universo feminino existe só no Brasil.
- **País e liga**, **moeda** (Real, Euro ou Dólar), **carregamento** e **treinador** (escolher a cara do treinador).
- **Meu jogador.** Passo só para quem tem direito à vaga de jogador na base oficial e ainda não a usou. Veja "Treinador > Meu jogador".
- **Sorteio do clube** e **Boas-vindas.** O clube sai no sorteio, e depois o jogador entra na Formação.

Referência técnica: `rf26-onboarding.js`, `rf26-fluxo.js`, `rf26-modalidade.js` e o roteador `cdraw()` em `main.js`.

---

## Formação (página inicial do save)

É a tela de trabalho do treinador e o destino do escudo no topo do menu.

**Desktop, coluna da esquerda:**

- **Elenco.** Tabela com os jogadores e a contagem de titulares.
- **Moral do plantel** e **Segurança no cargo.** Dois medidores de 0 a 100.
- **Classificação compacta**, com botões por competição e o botão **Ver tabela completa**.
- **Destaques do plantel.** Artilheiro do clube, destaque da rodada e quem está em baixa.

**Desktop, coluna da direita:**

- **Formações.** São oito botões: as seis táticas, mais **Auto** (escalação automática) e **11+** (os melhores de cada posição).
  - Cada tática tem uma régua de postura: ofensivo, equilibrado ou retranca.
  - Abaixo fica o botão **Seleccionar descansados**, que reescala o time dando prioridade a quem tem mais energia, sem mudar a formação. Ele só funciona depois de escolher a tática.
  - Ao lado fica o **cartão do Adversário**, com a mini-tabela comparando os dois clubes e o **botão Jogar**.
  - Por baixo fica a tira **Esta semana**.
- **Campo.** Mostra a tática escolhida, a contagem "onze X/11" e a legenda T (titular) / R (reserva).
  - O ícone de expandir abre o **campo em tela cheia**. Nessa tela dá para arrastar um titular para o banco para substituí-lo, e há os botões "Escolher formação" e Jogar.
  - "Trazer de volta" fecha a tela cheia.

**Celular:** a Formação tem três abas no topo, **Formação · Elenco · Jogo**. Cada uma mostra uma parte do conteúdo acima.

**Quando as contas estão no vermelho**, aparece no topo o aviso do **contador do clube**, com o botão **Ver finanças**.

Referência técnica: `rfHubHTML`, `rfFormacoesHTML` (`rf26.js`); `rfNotasHTML` e o cartão do adversário (`rf26-formacao.js`).

---

## Mercado

**Ações no topo:** **Exportar lista** (baixa uma planilha CSV) e **Buscar jogador**.

A linha de resumo diz se a janela está aberta ou fechada e mostra o caixa e a folha por rodada.

**Abas:**

- **Comprar.** Mostra "Jogadores no mercado": uma lista única com filtros por posição, **Ordenar por**, uma busca ("Buscar jogador pelo nome") e **Limpar filtros**.
  - Cada linha tem o botão **Propor**.
  - Ao lado fica o bloco **"O que o caixa permite"**, com Caixa, Folha atual, Margem de salário, Elenco (X de 30) e a cota de estrangeiros, quando existe.
- **Vender.** Mostra "Seu elenco à venda", com o botão **Listar**, e o bloco "Quem você não deveria vender". Para pôr um jogador à venda, a confirmação é **Pôr à venda**.
- **Leilão.** Mostra "Lotes abertos", com os botões **Dar lance** ou **Cobrir** (quando o lance é do próprio jogador), e "Arrematados recentemente".
  - O leilão fecha por **rodada**, não por relógio. A confirmação é **Confirmar lance**.
- **Propostas.** Um cartão para cada proposta recebida, com três botões: **Recusar**, **Contrapropor** e **Aceitar**.
  - Mostra o impacto de aceitar: caixa, folha, força do ataque e do meio, e o provável substituto.
- **Contrapropostas.** "Negociações em andamento", com o botão **Responder**, e o bloco "Como negociar".
- **Transferências.** Mostra a janela de transferências e as "Movimentações da divisão".

**A contratação anda em etapas**, dentro de uma janela de ação. Os botões são **Propor**, **Igualar pedido**, **Oferecer** (termos) e, no fim, **Fechar contratação**.

- Com outro treinador humano, o botão é **Enviar proposta**.
- Numa contraproposta, o botão é **Enviar contraproposta**.

**Regra de navegação:** clicar no **nome de um jogador** abre a **ficha** dele. A ficha tem os botões de transferência. O nome nunca abre a negociação direto.

Referência técnica: `public/src/ui/rf26-mercado.js`.

---

## Elenco & Base

**Ações no topo:** **Exportar elenco** e **Ir para a formação**.

A linha de resumo mostra quantos jogadores há no principal, quantos na base e a folha por semana.

**Abas:**

- **Elenco.** A tabela "ELENCO PRINCIPAL". Clicar num jogador seleciona o jogador e abre a ficha.
- **Ficha do jogador.** Atributos, pontos fortes e fracos, carreira e evolução. Os botões mudam conforme o jogador:
  - jogador do próprio time: **Renovar contrato** e **Listar para venda**;
  - jogador de outro clube: **Fazer proposta**.
- **Base.** "CATEGORIA DE BASE", com o botão **Promover** em cada garoto, e "INVESTIMENTO NA BASE".
- **Treino especial.** Blocos "COMO FUNCIONA", "QUEM PODE TREINAR" e "DE ONDE VEM O CRESCIMENTO". Nesta aba o jogador liga e desliga o treino de cada atleta.

**Visitar outro clube:** clicar no **escudo ou no nome de um clube**, em quase todo o jogo, abre o elenco daquele clube nesta mesma página.

- O título vira "Elenco · (clube)" e o elenco fica só para leitura.
- As abas Base e Treino especial somem.
- O botão **‹ Voltar ao meu elenco** retorna ao próprio time.
- Durante a partida ao vivo, os escudos **não** são clicáveis. Isso é de propósito, para o jogador não sair do jogo sem querer.

Referência técnica: `public/src/ui/rf26-elenco.js`.

---

## Campeonatos

**Ações no topo:** **Calendário completo** e **Ver classificação**.

A linha de resumo mostra as competições do clube e quantas semanas já foram disputadas.

**Abas:**

- **Minhas competições.** Um cartão por competição, com o botão **Abrir**, e o bloco "COMPETIÇÕES QUE VOCÊ NÃO DISPUTA".
- **Calendário.** Os jogos do clube na temporada: liga e copas, com datas.
- **Classificação.** A tabela, com **filtro próprio de país e competição**. Dá para ver ligas de outros países.
- **Artilharia.** "SEUS MARCADORES" e "DEFESAS MENOS VAZADAS".
- **História.** "HISTÓRICO DO CLUBE" e "TÍTULOS DO CLUBE".
- **Ligas internacionais.** Só aparece quando há ligas de outros países carregadas no save. Mostra "LIGAS DO MUNDO", "ARTILHEIROS PELO MUNDO", "ÚLTIMOS CAMPEÕES POR PAÍS" e "COPAS CONTINENTAIS".

Em Minhas competições, Calendário e Artilharia há uma **barra de botões por competição**, que filtra as três abas ao mesmo tempo. Campeonatos e Treinador também têm uma **barra de temporadas**: escolher um ano passado mostra o arquivo daquele ano.

Referência técnica: `public/src/ui/rf26-campeonatos.js`.

---

## Treinador

**Ações no topo:** **Exportar carreira** e **Ver ofertas**.

A linha de resumo mostra o nome, a temporada, o número de jogos e a segurança no cargo em porcentagem.

**Abas:**

- **Carreira.** "NÚMEROS DA CARREIRA", "CLUBES TREINADOS" e "SEGURANÇA NO CARGO".
- **História.** "LINHA DO TEMPO" e "MARCAS PESSOAIS".
- **Sala de Troféus.** Os troféus do treinador.
- **Ranking.** "RANKING DE TREINADORES" e "COMO O RANKING É CALCULADO".
- **Ofertas.** Convites de outros clubes, com os botões **Recusar** e **Aceitar o jantar**. Também mostra "CLUBES QUE JÁ SONDARAM" e "O QUE ACONTECE SE VOCÊ SAIR".
- **Perfil.** "DADOS DO TREINADOR", "COMO A IMPRENSA TE DESCREVE" e "AJUSTES". Os ajustes são três botões:
  - **Trocar o nome**, que leva a Configurações;
  - **Ver histórico completo**;
  - **Encerrar a carreira**.
- **Meu jogador.** É a vaga para pôr o próprio nome e rosto num jogador da base oficial. A vaga é do treinador, não do clube.
  - O nome e a foto passam por **moderação** no painel antes de entrar no jogo. Depois de aprovados, só aparecem em **saves novos**.
  - Os botões são **Escolher outro time**, **Fazer isso depois** e **Largar a vaga**.
  - Quem tem direito à vaga mudou com a troca de planos em 25/09. Pelas notas internas, a vaga saiu da vitrine do Pro e quem já tinha uma continua com ela. Para qualquer caso concreto, confirme no painel (página "Jogadores").

Referência técnica: `rf26-treinador.js` e `rf26-meujogador.js`.

---

## Finanças

**Ações no topo:** **Exportar balanço** e **Ver extrato**.

A linha de resumo mostra o caixa, a folha por rodada e o saldo da última rodada.

No topo de **todas** as abas fica o **contador do clube**, com a situação do caixa hoje. O contador é uma pessoa fictícia, sorteada por save. Ele também aparece dentro de toda decisão que gasta dinheiro: compra, lance, obra, renovação. Quando a decisão deixa o caixa negativo no fim da temporada, ele segura a decisão com dois botões: "Voltar e rever" e "Seguir mesmo assim".

**Abas:**

- **Resumo.** Gráficos mensais de receitas e despesas, mais os blocos ENTRA (bilheteria, patrocínio, venda de jogadores…) e SAI (folha salarial, bônus, custo operacional, compras, obras).
- **Extrato.** Os lançamentos agrupados por rodada.
- **Estádio.** Capacidade, preço e os pacotes de obra (+lugares), cada um com o aviso "cabe no caixa de hoje" ou "faltam R$ X no caixa".
- **Patrocínio.** Os contratos por espaço, com metas e bônus. O valor do ano inteiro entra de uma vez, na 1ª rodada da temporada.

Referência técnica: `rf26-financas.js` e `rf26-contador.js`.

---

## E-mail

O título da página é "E-mail & Sistema". **Ações no topo:** **Gravar** e **Marcar como lidas**.

**Abas:**

- **Caixa de entrada.** A lista fica à esquerda e a mensagem aberta à direita ("MENSAGEM ABERTA").
  - Algumas mensagens aceitam resposta ("A SUA RESPOSTA").
  - Algumas têm um botão que leva ao lugar onde o assunto se resolve, como o Mercado ou as Ofertas.
- **Arquivadas.** Arquivar tira a mensagem da caixa de entrada. Apagar é definitivo e é outra ação.

Algumas mensagens de premiação oferecem **Falar com a imprensa** ou **Não falar agora**. Isso mexe na moral do elenco e na segurança no cargo, uma vez por premiação.

Referência técnica: `rf26-email-config.js`.

---

## Ranking

É a página do ranking de treinadores do jogo inteiro, com os dois modos somados.

- **Filtros de escopo:** Global · Amigos · Minhas resenhas.
- **Filtros de período:** Dia · Semana · Mês · Sempre. Dia, Semana e Mês mostram os pontos **ganhos naquele período**. Sempre mostra o total.
- **Botões:** **Ver mais 20** e **Ir para a minha posição**.
- A lista se atualiza sozinha a cada 10 minutos. Se o jogador reclamar que o ranking "não mexe", pode ser só essa espera.
- Para sumir da lista pública, o jogador desliga "Aparecer no ranking global" em Configurações > Perfil. Ele continua pontuando.

Referência técnica: `rf26-ranking.js`.

---

## Configurações

No menu o nome é "Configurações". O título da página é **"Opções do jogo"**.

**Ações no topo:** **Voltar ao hub** e **Guardar opções**.

A linha de resumo mostra o modo (Solo, ou Resenha com o código da sala), o clube e se a gravação automática está ligada. A página tem cinco cartões. No celular eles viram um acordeão.

- **Perfil.**
  - **Enviar foto** / **Trocar a foto** e **Usar as iniciais**. A foto aparece no ranking, na Resenha e no chat.
  - O interruptor **Aparecer no ranking global**.
  - Sem login, o cartão pede para entrar na conta.
- **Partida.**
  - **Tempo de jogo:** Curto, Médio, Longo e, com cadeado, os ritmos pagos, como o Ultrassônico, que é do Pro. Numa resenha, quem define o ritmo é o anfitrião.
  - **Substituições ao intervalo:** Sim ou Não.
  - **Assistir copas que você não disputa:** só no Modo Solo.
- **Avisos e som.** **Som da partida** (liga e desliga) e o **Volume**.
- **Gravação.**
  - **Salvamento automático.** Guarda as 3 últimas semanas e o fim de cada temporada.
  - **Voltar a um ponto guardado.** O jogador escolhe o ponto e clica "Voltar para …". **O que veio depois desse ponto é perdido.**
  - **Gravar agora.**
  - Os pontos têm etiquetas: AUTO, TEMPORADA ou NUVEM.
- **Conta.** **Trocar a senha**, **Sair da conta** e **Apagar a conta**. Apagar a conta remove os saves na nuvem e a carreira de treinador, e não tem volta.

Referência técnica: `rfCfOpcoesHTML` em `rf26-email-config.js`.

---

## Minha Conta (planos e sala)

Esta página tem o plano da conta. Numa resenha online, ela também tem a sala. O nome antigo era "Modo Resenha".

- **Planos.** Mostra "SEU PLANO ATUAL", a escada de degraus e os cartões dos planos.
  - Hoje são dois planos: **Peladeiro** (o gratuito) e **Pro**.
  - Há a escolha entre mês e ano.
  - A cobrança é pelo Stripe, no cartão ou no Pix.
  - Para quem é Pro, aparece o botão **Gerir assinatura**, que abre o portal do Stripe. Se a conta não tem cobrança no Stripe, o jogo avisa que não há assinatura para gerir.
  - Os botões **Assinar** e o do plano seguinte abrem a janela de compra.
- **Sala (só no Modo Resenha online):**
  - **CÓDIGO DA SALA**, com os botões **Copiar convite** e **Abrir o chat**;
  - a tabela **TREINADORES**, com o estado de cada um: JOGOU, EM PARTIDA ou NÃO ENTROU;
  - **REGRAS DA SALA**: ritmo, janela de mercado, divisão, quem pode entrar e anfitrião;
  - **SINCRONIZAÇÃO**, com os botões **Aprovar entradas** (só o anfitrião), **Sincronizar agora** e **Sair da sala**;
  - o **CHAT DA SALA**.
- As ações do topo (só na Resenha) são **Copiar convite** e **Sincronizar**.

Referência técnica: `rf26-planos.js` (`rfUpPaginaHTML`) e `rfCfResenhaHTML` em `rf26-email-config.js`.

---

## Sair do jogo

A linha de resumo mostra quando o save foi gravado. A página tem quatro blocos:

- **SAVE ATUAL.** Botões **Gravar e sair do save**, **Começar outro save** e **Baixar o save** (baixa um arquivo .json).
- **OUTROS SAVES.** Os saves da conta na nuvem, cada um com o botão **Abrir**.
- **SALA DA RESENHA** (só online). **Sair da sala**. Sair da sala não apaga o save, mas o clube fica sem treinador nas semanas seguintes.
- **CONTA.** **Sair da conta** e **Apagar este save**.

---

## Telas de partida e entre rodadas

- **Partida ao vivo.** Mostra a rodada inteira ao mesmo tempo, com um cartão por divisão ou competição e uma linha por jogo.
  - A faixa do topo tem o nome da competição, a indicação "Ao vivo", o relógio, o período (1º tempo, 2º tempo, Acréscimos, Prorrogação, Pênaltis, "Seu jogo encerrado") e o placar do jogo do jogador.
  - O botão **Modo Camarote** fica na faixa.
- **Modo Camarote.** Abre por padrão quando o jogador tem jogo na rodada. Mostra só o jogo dele, com narração, pressão e estatísticas, enquanto a rodada segue ao fundo.
  - O botão ⏸ **Pausar** / ▶ **Jogar** só existe no Solo. Na Resenha o ritmo é do anfitrião.
  - **Esc** ou o botão ✕ ("Voltar à semana") fecha o Camarote.
  - Nos ritmos mais rápidos o Camarote pode ficar travado. Ele mostra a explicação ao ser clicado.
- **Janelas durante o jogo:**
  - **Substituição**, só no intervalo e se a opção estiver ligada;
  - **Lesão**, com o botão "Seguir com 10";
  - **Cartão vermelho**, com o botão "Manter a formação";
  - **Pênalti**, com o botão "Deixar o capitão bater";
  - **disputa de pênaltis**;
  - **prorrogação**, com os botões "Fazer uma substituição" e "Começar a prorrogação".
- **Classificação pós-rodada** e **classificação da fase de copa.** Têm o botão **Continuar** e, na copa, a aba "Tabela do grupo".
- **Sorteio das competições.** É uma cerimônia com o troféu, a premiação por fase e os clubes sorteados.
- **Entrevista coletiva (Imprensa).**
  - Aparece **depois da classificação pós-rodada**, nunca na 1ª rodada.
  - No Solo, aparece de 3 em 3 rodadas (de 2 em 2 quando há um fato marcante, como goleada, jejum ou crise), até 8 por temporada. Na Resenha, de 4 em 4 (3 com fato marcante), até 5 por temporada.
  - São três perguntas, uma sobre o jogo, uma sobre o elenco e uma sobre o clube, cada uma com três respostas.
  - As respostas mexem na moral, na segurança no cargo e na reputação.
  - O botão **⏩ Pular a coletiva** encerra a entrevista sem aplicar mais efeitos.
  - Não é uma página do menu. É uma janela que aparece sozinha.
- **Fim de temporada.** Mostra o desfecho (Título, Acesso, Meio de tabela, Rebaixado ou Demitido) e o botão **Começar a próxima temporada**.
  - Para quem **não é Pro**, esse clique pode abrir antes o **aviso de fim de temporada (paywall)**. O Peladeiro joga 1 temporada por carreira, com saídas grátis uma de cada vez: depoimento (+1 temporada), depois post ou vídeo (+1), depois só o Pro.
  - Veteranos da fase Beta recebem avisos próprios.
- **Telas da Resenha.** Espera da rodada, "Passe o aparelho" e entrega do aparelho (no jogo no mesmo aparelho) e classificação do assento.

Referência técnica: `rf26-live.js`, `rf26-partida.js`, `rf26-competicao.js`, `rf26-sorteio.js`, `rf26-imprensa.js`, `rf26-paywall.js` e `rf26-resenha.js`.

---

## Outros elementos fixos da tela

- **Chat da Resenha.** No desktop é uma bolha no canto inferior direito. No celular o chat está **desligado** de propósito. Ele fica em silêncio durante a partida ao vivo e o Camarote: sem espiada e sem pulsar.
- **Grupo do WhatsApp.** Tem três pontos de entrada:
  - uma janela única logo após criar a conta;
  - uma pílula nas páginas públicas;
  - na área logada, um botão no pé da barra lateral (desktop) ou uma lingueta na borda direita (celular).
- **Aba de Opinião.** Foi **removida** a pedido (23/09). Os recados de jogadores chegam hoje pelos depoimentos do aviso de fim de temporada.

---

# PARTE B — PAINEL DOS SÓCIOS (PAINEL ADMIN)

## O que é e quem entra

O painel é um site separado do jogo. Publicar um não afeta o outro. O painel usa **a mesma base de contas do jogo**, mas só entra quem tem um **convite ativo**:

1. um sócio cria o convite em **Equipe admin**;
2. a pessoa entra (ou cria conta) com **aquele e-mail**;
3. o convite é reivindicado e a conta vira admin.

Sem convite, o painel não abre, mesmo com uma conta válida no jogo. O convite gera um **link** que é copiado. O painel não manda e-mail de convite sozinho.

### Papéis de acesso e o que cada um vê

| Página do menu | Sócio | Financeiro | Produto | Leitura |
|---|:-:|:-:|:-:|:-:|
| Visão geral | ✓ | ✓ | ✓ | ✓ |
| Sobre o jogo | ✓ | ✓ | ✓ | ✓ |
| Usuários | ✓ | — | ✓ | ✓ |
| Analytics | ✓ | — | ✓ | ✓ |
| Finanças | ✓ | ✓ | — | ✓ |
| Publicidade | ✓ | ✓ | — | ✓ |
| Vídeos | ✓ | — | ✓ | ✓ |
| Roadmap | ✓ | — | ✓ | ✓ |
| Parceiros | ✓ | ✓ | ✓ | ✓ |
| Conteúdo | ✓ | — | ✓ | ✓ |
| Editor de dados | ✓ | — | ✓ | ✓ |
| Estúdio IA | ✓ | — | ✓ | ✓ |
| Jogadores (moderação) | ✓ | — | ✓ | ✓ |
| Equipe admin | ✓ | — | — | — |
| Registro | ✓ | — | — | — |

**Quem pode alterar dados:**

- **Sócio** altera tudo.
- **Financeiro** altera só Finanças e Publicidade.
- **Produto** altera as áreas de produto (Roadmap e afins) e de dados (Editor, Estúdio).
- **Leitura** vê, mas não altera nada.

Isso vale nas duas pontas: o menu esconde o que o papel não vê, e o banco recusa a escrita de quem não pode.

**Ações destrutivas são só do sócio.** Isso inclui apagar contas de jogador, salas e saves. No Roadmap público, também só o sócio move itens.

Existe uma divergência entre a documentação e o código. O documento interno descreve o papel Produto como "Analytics, Usuários, Resenhas, Funcionalidades". O mapa de acesso do código dá mais páginas a ele, como mostra a tabela acima. **A tabela segue o código.**

Referência técnica: `ACESSO`, `podeVer`, `podeEditar` e `NAV` em `public/admin/admin.js`; `docs/painel-admin.md` §2.

### Navegação geral do painel

- Menu lateral à esquerda. No celular, abre pelo botão de menu.
- Botão **Sair** para encerrar a sessão.
- **Seletor de período no topo:** 7 dias · 30 dias · Ano · Escolher datas (De/Até). Só aparece nas páginas que o respeitam: Visão geral, Analytics (as duas abas), Publicidade e Registro.
- Passar o mouse sobre cabeçalhos e células mostra **dicas** que explicam cada número.

---

## Visão geral

É o painel inicial. Mostra os indicadores (**Usuários no jogo**, **Ativos no período**, **Tempo médio por usuário** e **Lucro no período**), o bloco **Engajamento**, o **Ranking de pontuação** e o resumo **Receita, despesa e lucro** ("Onde entra e onde sai").

Serve para ter o quadro geral. Não é o lugar para atender um jogador específico.

---

## Sobre o jogo

Está no menu para **todos os papéis**, com o subtítulo "Pergunte à IA como o jogo funciona — regras, motor, planos, Resenha e telas". É o assistente que usa esta base de conhecimento.

- **Primeiro, as respostas prontas.** A pergunta é comparada com um banco de ~400 respostas prontas (sem IA, na hora, sem custo). Se bater, aparece com o selo **"Resposta pronta · sem IA"**, a **Sugestão de resposta ao jogador** e perguntas relacionadas. Enquanto se digita, a caixa **"Já respondidas:"** mostra as parecidas para clicar direto.
- **Não é isso? Perguntar à IA** manda a mesma pergunta para a IA. Quando não há resposta pronta parecida, a IA responde sozinha.
- **Conversa** à esquerda: escreva a pergunta e aperte Enter (Shift+Enter quebra a linha). A resposta da IA aparece aos poucos, enquanto é escrita. Cada resposta da IA tem **Copiar**, **👍** (útil) e **👎** (errada ou incompleta).
- Sócio e Produto veem também **Salvar como resposta pronta** (numa resposta boa da IA: da próxima vez sai pronta, sem custo), **Tirar do ar** (numa resposta pronta errada) e **Atualizar respostas prontas** (baixa a versão mais nova das prontas escritas pelos devs).
- **Nova conversa** limpa a tela. A conversa fica só na aba aberta: recarregar a página começa do zero.
- À direita: **Sugestões** de perguntas, **Perguntas recentes da equipe** (clique para perguntar de novo; mostram "pronta" ou "IA") e o **Uso no mês** (quantas saíram prontas, quantas pela IA, o custo em dólares e a economia estimada).
- A IA responde só com o que está nesta base. Quando a base não cobre o assunto, ela diz isso. Toda pergunta fica registrada, e as marcadas com 👎 mostram o que falta acrescentar.
- Para ensinar algo novo à IA, um dev atualiza os textos da base e publica de novo.

---

## Usuários (a página principal do suporte)

É aqui que se **acha a conta de um jogador**.

**Como achar uma conta:**

- A **busca** ("Nome, e-mail, clube, WhatsApp…") procura por nome do técnico, e-mail, clube e número de WhatsApp. Para o WhatsApp, bastam 3 ou mais dígitos.
- **Filtros:** Estado, Modo, Plano, Origem, Grupo, WhatsApp. Também há um recorte por data de **cadastro** ou de **último acesso**.
- Clicar no cabeçalho de uma coluna **ordena** a tabela.

**Colunas da tabela:**

| Coluna | O que mostra |
|---|---|
| **Técnico** | Nome, clube do save mais recente (sigla e escudo) e e-mail. Contas de sócio têm uma etiqueta e ficam fora dos números do topo. |
| **WhatsApp** | O número do cadastro. Clicar abre a conversa. Contas antigas podem não ter. |
| **Grupo** | Se a pessoa clicou para entrar no grupo do WhatsApp, e por qual botão. |
| **Plano** | **Peladeiro** (gratuito) ou **Pro**. Passar o mouse mostra a validade ("Válido até…" ou "Sem prazo"), a **origem** do plano e o MRR. |
| **Origem** | O canal que trouxe a pessoa até o cadastro. |
| **Time** | O time do coração escolhido no cadastro. Contas anteriores a 27/09/2026 não têm. |
| **Carreiras** | Saves no Solo / salas na Resenha. |
| **Temporadas** | Temporadas fechadas no Solo / na Resenha. |
| **Partidas** | Partidas de liga no Solo / na Resenha. A marca "parcial" quer dizer que o total real é maior. |
| **Títulos** | Títulos no Solo / na Resenha. |
| **Campanha** | Melhor divisão e posição em que terminou uma temporada. |
| **Tempo** | Minutos com o jogo aberto e visível, dentro de um save. Embaixo, os últimos 7 dias. |
| **Dias ativos** | Dias com login ou jogada, nos últimos 7 e 30 dias. |
| **Cadastro** | Data em que a conta foi criada. |
| **Último acesso** | O mais recente entre login, save do Solo e jogada. Abrir o jogo já logado, sem jogar, **não conta**. |
| **Estado** | **Ativo** (até 2 dias), **Parado** (3 a 13 dias) ou **Perdido** (14 dias ou mais). |
| **Senha** | O link **Reenviar**. |

**A ficha do jogador.** Clicar numa linha abre a carreira completa da pessoa:

- os fatos: plano e validade, WhatsApp, cadastro, origem, time do coração, grupo do WhatsApp, último acesso, tempo de jogo e dias ativos;
- a tabela **Modo Solo**, com uma linha por save: nome do save, clube, divisão e temporada atuais, rodada, quando foi gravado, partidas, pontos, V-E-D, temporadas e campanha;
- a tabela **Modo Resenha**, com uma linha por sala: código, clube, fase e última presença;
- a lista de **Títulos**.

**Reenviar senha.** O link "Reenviar" abre a janela **Enviar link de nova senha**, com o botão **Enviar e-mail**.

- Vai para o e-mail da pessoa um link de uso único para definir uma senha nova no jogo.
- **O painel nunca vê nem define a senha.**
- A ação fica no Registro.

**Apagar contas (só sócio).** Há caixas de seleção e atalhos (visíveis, nunca jogaram, parados há X dias).

- Antes de confirmar, o painel mostra quantos saves, assentos e salas vão junto.
- Os saves da pessoa são apagados.
- Os assentos dela em salas de outros voltam para a CPU.
- As salas que ela hospeda são apagadas.
- O painel não deixa apagar a própria conta nem contas de admin.

**O que o painel não faz.** O código desta página **não tem botão para mudar o plano** de um jogador. O plano vem do banco e é gravado pelo pagamento no Stripe. Mudança manual de plano é feita fora do painel, direto no banco, pelos responsáveis técnicos.

Referência técnica: `pgUsuarios`, `usLinhaTds`, `modalUsuario`, `modalResetSenha` e `PLANOS_ADM` em `admin.js`.

---

---

## Analytics

Tem duas abas no topo: **Visitas e funil** e **Resenhas & solo**.

### Aba Visitas e funil

Mostra os números de aquisição e uso:

- **Contas criadas no período**, **Ativos no período** e **Chegaram a jogar (total)**;
- os gráficos **Atividade e contas criadas** e **Funil de conversão**;
- **Temporadas completas por pessoa**;
- **Dispositivo e retenção**;
- o bloco **Stripe · sem as contas dos sócios**: Assinantes (hoje), Churn, Saíram do Pro no período e **Churn e reembolsos**.

Os blocos de **Origem do tráfego, Páginas mais vistas e Dispositivo (GA4)** só aparecem quando houver dados do Google Analytics gravados no sistema. Por enquanto podem estar vazios.

"Ativo" quer dizer que a pessoa teve login ou jogada no dia. Deixar o jogo aberto não conta.

### Aba Resenhas & solo

Fica em **Analytics → Resenhas & solo** (até 28/09/2026 era uma página própria no menu). Mostra as salas, os saves e os convites.

**Indicadores do topo** (seguem o período escolhido):

- Salas criadas no período;
- Salas sem humano (hoje);
- Jogaram no Solo no período;
- Convites no período, com a porcentagem aceita.

**"Modo Resenha — salas abertas".** Mostra o estado de hoje e não segue o período. Colunas: Sala (código), Anfitrião, Treinadores (humanos/lugares), Jornada, Aberta há, Ativa há. "Ativa há" fica vermelho a partir de 14 dias.

**"Modo Solo — saves por jogador".** Uma linha por jogador. Colunas: Jogador, Conta (e-mail), Saves, Parados, Divisões, Último salvamento.

**"Convites de sala".** Colunas: Destino (mascarado), Sala, Enviado, Estado (aceito, pendente ou expirado). Abaixo ficam os **Pedidos para entrar**.

**Limpeza (só sócio):**

- Atalhos de seleção: salas **sem humano** ou **paradas 14d+**; saves **parados 14d+** ou **30d+**; convites **expirados** ou **já aceitos**.
- Para confirmar, é preciso **digitar o número de itens**.
- Para apagar uma única sala, clicar no ✕ e **digitar o código da sala**.
- **Apagar sala não tem volta.** Quem estava jogando perde a temporada.

**Para o suporte:** para saber a sala em que um jogador está, é mais fácil abrir a ficha dele em **Usuários**, na tabela Modo Resenha. Esta página responde "quais salas existem" e "quem tem saves parados".

Referência técnica: `pgJogos` em `admin.js`; `docs/painel-admin.md` §3.

---

## Roadmap

Tem cinco abas:

- **Banco de ideias.** As ideias vindas da equipe, de jogadores, do grupo do WhatsApp ou de parceiros.
  - Cada sócio vota **aprovar** ou **recusar**.
  - Com todos os sócios ativos aprovando, a ideia vira um item do roadmap público.
  - Com a maioria recusando, ela fica recusada.
  - Filtros: Aguardando aprovação, Aprovadas, Recusadas, Arquivadas, Todas.
- **Roadmap (kanban).** O quadro público, com as colunas **Em análise**, **Planejado**, **Em desenvolvimento** e **Lançado**, e os votos dos jogadores. Só o sócio mexe. O link **Ver página pública ↗** abre a página /roadmap/ do site.
- **Bugs.** A situação de cada bug. Bugs nunca vão para o roadmap.
- **Marketing e operação.** Tarefas internas.
- **Depoimentos.** O que os jogadores escreveram na 1ª saída grátis do aviso de fim de temporada, e os posts da 2ª saída. Cada depoimento pode **virar ideia ou bug**.

**Para o suporte:** quando um jogador sugere algo ou relata um bug, o lugar de registrar é aqui. Uma sugestão vai para o Banco de ideias; um bug vai para a aba Bugs. O jogador pode acompanhar pelo roadmap público do site.

---

## Jogadores (jogadores dos assinantes Pro, moderação)

É a fila de moderação do nome e da foto que um assinante pôs num jogador da base oficial.

- **Na fila:** foto, nome novo ("entra no lugar de …"), clube, série, posição, força e universo (masculino ou feminino). Três botões:
  - **Ver foto**;
  - **Recusar**, que **exige um motivo**. O assinante lê esse texto. Recusada, a vaga volta a ficar livre;
  - **Aprovar**. A mensagem de confirmação é "Aprovado — já entra nos saves novos".
- **Já no ar:** os jogadores aprovados.

**Para o suporte:** se o jogador pergunta "por que meu jogador não aparece?", há três respostas possíveis:

1. o pedido ainda está na fila;
2. foi recusado, e o motivo está gravado para ele;
3. foi aprovado, mas o save dele é anterior à aprovação. O jogador aprovado só aparece em **saves novos**.

---

## Editor de dados

Serve para editar o catálogo do jogo: clubes, elencos, escudos e força. As edições ficam guardadas em **pacotes (patches)**.

- O **pacote oficial** entra sozinho em todo jogo novo. É onde se corrige um dado errado.
- Outros pacotes têm dono e só valem para quem os escolhe ao criar a partida.
- Abas: **Clubes**, **Jogadores**, **Competições**, **Troféus & nomes** e **Economia**.
- Há ações para importar arquivo e exportar CSV.

**Para o suporte:** uma correção feita aqui vale para **jogos novos**. Um save em andamento tem o elenco guardado dentro dele e não muda. Se o jogador reportar um nome, uma força ou um escudo errado, registre para quem cuida dos dados.

---

## Estúdio IA

É a oficina de imagens geradas por IA. Abas:

- **Escudos**;
- **Uniformes**;
- **Fotos de jogadores**;
- **Treinadores** (as 10 faces padrão, mais o número e o custo dos avatares gerados por assinantes);
- **Jornalistas**;
- **Contadores** (as faces do contador do clube).

Tem busca por clube e filtro por país. **Não é uma ferramenta de atendimento.** Só interessa ao suporte quando um jogador pergunta por que um jogador ou um clube ainda não tem foto: nem todos têm imagem gerada.

---

## Registro (só sócio)

É o registro de quem fez o quê no painel. Toda escrita do painel deixa uma linha: reenviar senha, apagar sala, aprovar jogador, editar clube e assim por diante.

- **Indicadores:** ações no período, pessoas que mexeram, área mais movimentada e última ação.
- **"Quem fez o quê":** o resumo por pessoa.
- **Lista filtrável** por pessoa, por área e por busca livre (a busca também procura dentro do detalhe). Pode ser exportada em CSV.
- Ninguém edita nem apaga o próprio rastro.
- Quem saiu do painel continua aparecendo, marcado em âmbar.

**Para o suporte:** é o lugar para conferir, por exemplo, se o link de senha já foi reenviado para um jogador e quando.

---

## Outras páginas (menos usadas no atendimento)

- **Finanças.** Receita (lançada automaticamente pelo Stripe), despesas, gasto de IA e o fechamento por mês ou ano.
- **Publicidade.** Os espaços de anúncio do jogo e os criativos no ar, com impressões, cliques e CTR.
- **Vídeos.** Os vídeos das celebrações do jogo (campeão, acesso, queda…): quando cada um aparece e se está ligado.
- **Parceiros.** Os influenciadores, o link de indicação e o que cada um trouxe.
- **Conteúdo.** O calendário de conteúdo, da ideia ao agendado.
- **Equipe admin** (só sócio). Criar convite, mudar o papel e tirar o acesso de alguém.

---

## Perguntas frequentes

**Onde o jogador troca a formação?**
Na página **Formação** (primeiro item do menu, ou o escudo no topo da barra lateral), no bloco **Formações**. No celular, fica na aba "Formação" da página inicial. Também dá para usar as teclas F1 a F6.

**O botão Jogar não faz nada. O que pode ser?**
O texto do botão diz o que falta: "Escolher formação", "Escalar um goleiro", "Ver o sorteio", "Ver classificação". Na Resenha, "Quase pronto" ou "Acertando a semana" quer dizer que a sala ainda está esperando os outros treinadores.

**Onde o jogador vê a tabela do campeonato?**
Em **Campeonatos > Classificação**. Também dá pelo botão "Ver tabela completa" da classificação compacta na Formação. No celular, fica no item **Tabela** da barra inferior.

**Onde o jogador compra ou vende jogadores?**
Na página **Mercado**, abas **Comprar**, **Vender** e **Leilão**. As propostas recebidas ficam na aba **Propostas**.

**Onde ele renova o contrato de um jogador?**
Em **Elenco & Base**: abrir a ficha do jogador e clicar em **Renovar contrato**.

**Como ele volta para o próprio elenco depois de ver outro clube?**
Pelo botão **‹ Voltar ao meu elenco**, ou clicando em "Elenco & Base" no menu.

**Onde ele muda a velocidade da partida, o som ou a gravação automática?**
Em **Configurações** (título "Opções do jogo"), nos cartões **Partida**, **Avisos e som** e **Gravação**. Na Resenha, o tempo de jogo é definido pelo anfitrião.

**Como o jogador volta a um ponto anterior do save?**
Em **Configurações > Gravação > Voltar a um ponto guardado**. Ele escolhe o ponto e clica em "Voltar para…". Tudo o que veio depois desse ponto é perdido.

**Onde ele troca a senha, sai da conta ou apaga a conta?**
Em **Configurações > Conta**. "Sair da conta" também aparece em **Sair do jogo**, na faixa do clube ("· Sair") e no menu "Mais" do celular.

**Onde ele vê e gere o plano?**
Em **Minha Conta**. Quem é Pro tem o botão **Gerir assinatura**, que abre o portal do Stripe.

**Como abro outro save ou começo um novo?**
Em **Sair do jogo**: "Outros saves" (botão **Abrir**) ou **Começar outro save**.

**Onde fica a entrevista coletiva?**
Não está no menu. Ela aparece sozinha, depois da classificação pós-rodada, de tempos em tempos. Pode ser pulada com "⏩ Pular a coletiva".

**Como vejo o plano de um jogador no painel?**
Em **Usuários**: busque pelo e-mail ou nome e olhe a coluna **Plano** (Peladeiro ou Pro). Passe o mouse para ver a validade e a origem. A ficha (clique na linha) também mostra o plano.

**Como vejo os saves e as salas de um jogador?**
Em **Usuários**, clicando na linha da pessoa. A ficha lista cada save do Modo Solo (divisão, temporada, rodada, quando foi gravado) e cada sala do Modo Resenha.

**O jogador esqueceu a senha. O que faço pelo painel?**
Em **Usuários**, na linha dele, clique em **Reenviar** e depois em **Enviar e-mail**. Ele recebe um link de uso único. O painel não mostra nem define senha.

**Posso mudar o plano de um jogador pelo painel?**
Pelo que o código mostra, não. O painel só exibe o plano. Encaminhe para os responsáveis técnicos.

**O jogador diz que o nome ou a foto que ele mandou não aparece.**
Veja a página **Jogadores**: ainda está na fila, foi recusado (com motivo) ou já está no ar. Depois de aprovado, só aparece em saves novos.

**Quem da equipe pode apagar uma conta, uma sala ou um save?**
Só quem tem papel de **sócio**. Os outros papéis não veem os botões.

**Por que um membro da equipe não vê a página Usuários?**
Porque o papel dele é **Financeiro**, que só vê Visão geral, Sobre o jogo, Finanças, Publicidade e Parceiros. Um sócio pode mudar o papel em **Equipe admin**.

---

## O que ficou incerto neste capítulo

- **"Meu jogador":** quem tem direito à vaga depois da troca de planos de 25/09 (Peladeiro × Pro) não fica claro só pelo código da tela. As notas internas dizem que a vaga saiu da oferta do Pro e que quem já tinha mantém.
- **"Trocar o nome"** (Treinador > Perfil) leva a Configurações. O código lido não mostra ali um campo de nome explícito.
- O **Modo Resenha** está marcado como "Em breve" para novos jogos (versão Beta, exclusiva do Pro). As telas da sala descritas aqui valem para quem já está numa sala.
