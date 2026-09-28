# Modo Resenha, saves e problemas

Esta seção explica como funciona o **Modo Resenha** (o modo multiplayer online do RetroFoot98), como os jogos são gravados (saves) no **Modo Solo** e na Resenha, e o que o suporte deve responder quando algo dá errado. Tudo aqui descreve o comportamento atual do código do jogo. Onde algo não está claro, isso é dito.

Nomes a usar sempre com o jogador: **Modo Solo** e **Modo Resenha**, com esses nomes próprios.

---

## Situação atual do Modo Resenha (leia primeiro)

- Na tela de escolha de modo, o cartão do **Modo Resenha aparece como "Em breve"**. O texto diz que ele "chega em breve, em versão Beta, com acesso exclusivo para quem é Pro". O cartão não abre o fluxo de criar ou entrar em sala. O botão do cartão leva à oferta do plano Pro. Para quem já é Pro, o botão diz "✓ Acesso garantido no lançamento".
- Na mesma tela o texto diz: "O Modo Resenha chega em breve, em versão Beta, com acesso exclusivo para quem é Pro. O Modo Solo já está completo."
- Mesmo com o cartão fechado, **links de convite de salas que já existem continuam funcionando** (o endereço com `/convite/CODIGO` ou `?sala=CODIGO` abre direto o caminho de entrada da sala). Quem pode de fato ocupar um lugar na sala é decidido pelo servidor, que consulta o plano da conta.
- Pelas regras de planos atuais, só existem dois planos: **Peladeiro** (o gratuito) e **Pro**. O Modo Resenha, tanto para abrir sala quanto para entrar, é do **Pro**. As janelas de bloqueio dizem: "Abrir a sua sala [...] é exclusivo do Pro quando lançarmos a versão Beta do Modo Resenha" e "Jogar a mesma semana com a turma, na sala de um amigo ou na sua, é exclusivo do Pro".

**Ponto incerto:** alguns comentários antigos no código ainda dizem que "entrar com código é de graça em qualquer plano". As regras de planos mais novas e as mensagens da tela dizem que é Pro. Se um jogador Peladeiro disser que conseguiu entrar numa sala por link, ou que foi barrado, trate como caso para o time de desenvolvimento confirmar, porque quem decide é o servidor.

Referência técnica: `RESENHA_EM_BREVE` em `public/src/ui/main.js`; cartão de modo em `public/src/ui/rf26-onboarding.js`; travas `RF_TRAVAS` e `rfPodeHospedar`/`rfPodeResenha` em `public/src/ui/rf26-landing.js`; `docs/plano-gratis-pro.md`.

---

## O que é o Modo Resenha

O Modo Resenha é uma liga online em que vários treinadores humanos jogam **a mesma temporada, no mesmo mundo e ao mesmo tempo**. Cada treinador comanda um clube, os outros clubes são controlados pela máquina (CPU), e todos veem a mesma tabela, os mesmos resultados e o mesmo calendário. A sala tem um **anfitrião** (quem criou) e **convidados**.

Características principais:

- A sala sempre começa no **Brasil**, na **Série D** (o degrau de baixo da pirâmide), igual ao Modo Solo. O anfitrião não escolhe divisão. A tela de criar sala mostra a pirâmide e diz: "Todos entram no mesmo degrau".
- Se houver mais de um país com calendário disponível, o anfitrião pode marcar outras "ligas jogáveis". Elas rodam no mundo da sala e podem convidar os treinadores para treinar lá, mas todos começam no Brasil. Hoje isso só aparece se existir mais de um país com calendário.
- Os clubes dos humanos são **sorteados**. Ninguém escolhe o próprio clube.
- O ritmo das partidas (velocidade) é definido pelo **anfitrião**. Na tela de Configurações, o convidado vê: "Numa resenha, quem define o tempo de jogo é o Anfitrião".
- Existe **chat** da sala (no lobby e como bolha flutuante dentro do jogo). O chat fica em silêncio durante a partida ao vivo e no Modo Camarote.
- O "hotseat" (vários treinadores passando o mesmo aparelho) existe no código, mas está **desligado na interface**. Quem quer jogar com amigos é direcionado para o Modo Resenha online.

Referência técnica: `rfOb4` em `public/src/ui/rf26-onboarding.js`; `RESENHA_START_DIV` em `public/src/engine/core.js`; `CHAT_ATIVO` em `public/src/net/local-transport.js`.

---

## Criar uma sala

**Onde fica no jogo:** Escolher modo → Modo Resenha → "Criar ou entrar numa sala?" → cartão **"Criar uma sala"** (ou o botão "Criar a minha sala").

Passo a passo:

1. É preciso estar logado. O fluxo pede login ou cadastro (nome de treinador, e-mail, senha; no cadastro também WhatsApp e time do coração).
2. Se a conta não tiver direito a hospedar, abre a janela "O Modo Resenha é do Pro" em vez de seguir. O servidor também recusa a criação se o plano não permitir.
3. Tela **"Abrir a sua sala"**: o anfitrião dá um **nome à sala** (até 24 caracteres, ex.: "Resenha da firma"). A tela mostra o código da sala, o limite de treinadores e "clubes por sorteio".
4. Ao clicar em **"Abrir a sala"**, a sala é criada, o anfitrião já recebe um clube sorteado e vai para a tela de convites (o lobby).

Sobre o código da sala:
- Tem **5 caracteres**, com letras e números, sem I, O, 0 e 1 (tirados por serem confundíveis). Exemplo de formato: `7KP2M`.
- A tela de criar sala tem a nota "A sala fica aberta por 7 dias sem ninguém entrar". **Incerto:** não foi localizada no código do jogo a regra que fecha a sala nesse prazo; pode estar no servidor.

Referência técnica: `clResenhaCreate`, `clOpenRoom` em `public/src/net/local-transport.js`; `netCreateRoom` em `public/src/net/supabase-adapter.js`; `RF_CODIGO_ALFA` em `public/src/ui/rf26-resenha-entrada.js`.

---

## Convidar treinadores

**Onde fica no jogo:** tela da sala aberta (lobby), logo depois de criar.

O anfitrião tem estas formas de chamar gente:

- **Link da sala** ("o jeito mais rápido"), com botão **Copiar link**. O link tem o formato `/convite/CODIGO`. Essa página mostra uma imagem de convite na pré-visualização do WhatsApp e redireciona na hora para o jogo com `?sala=CODIGO`. Links antigos no formato `?sala=CODIGO` continuam valendo.
- **WhatsApp**: digita DDD + número e clica em Enviar. O jogo abre o WhatsApp com uma mensagem pronta ("Bora jogar RetroFoot comigo! [...]") e o link.
- **E-mail**: digita o e-mail e clica em Enviar. O jogo manda o convite por e-mail.
- **"Quem já tem conta"**: busca por nome ou e-mail (mínimo 3 letras) e clica em **Convidar**. Esse convite é interno e deixa a pessoa **pré-aprovada**.
- **Código**: a pessoa pode simplesmente digitar o código de 5 caracteres.

A lista "Treinadores na sala" mostra cada pessoa com "● na sala" ou "convite enviado", e a contagem "X dentro · Y convidados · Z vagas". O anfitrião tem o botão **Remover** ao lado de cada convidado.

### Aprovação de entrada

Quem entra pelo **link** ou pelo **código** e ainda não tem lugar na sala **não entra direto**: o jogo cria um **pedido de entrada** e mostra a tela **"À espera de aprovação"** ("Pedido enviado! Aguardando o anfitrião aprovar a sua entrada [...]"). Essa tela tem o botão **"Cancelar pedido"**.

Do lado do anfitrião, aparece no topo do lobby o bloco **"PEDIRAM PARA ENTRAR"**, com **Aprovar** e **Recusar** para cada pessoa. Quando o anfitrião aprova, o convidado entra sozinho, sem precisar fazer nada. Se recusar, o convidado vê "O anfitrião recusou sua entrada na Resenha".

Entram **direto, sem pedido**: o próprio anfitrião, quem já tem lugar (assento) na sala, quem foi convidado pela busca interna e quem já teve pedido aprovado antes.

Antes de entrar pela primeira vez, o convidado passa pelo passo de escolher o **rosto e a idade do treinador** (só uma vez; quem já escolheu segue direto).

Referência técnica: `rfOb5` em `public/src/ui/rf26-onboarding.js`; `netRequestJoin`, `netDecideJoin` em `public/src/net/supabase-adapter.js`; `clRequestOrJoin`, `scWaitApproval` em `public/src/net/local-transport.js`; `public/convite.html`.

---

## Entrar numa sala

**Onde fica no jogo:** Modo Resenha → "Criar ou entrar numa sala?" → **"Entrar com código"**, ou o campo "TEM UM CÓDIGO? COLE AQUI" na mesma tela.

- A tela **"Entrar numa Resenha"** tem 5 caixas para o código. O texto diz: "Cinco caracteres. O anfitrião te passa por WhatsApp ou pelo link do convite" e "Recebeu um link? Abra que o código entra sozinho."
- Se a entrada falhar, o motivo fica escrito na tela (em vermelho, com ⚠) até a pessoa mexer no código. Mensagens comuns:
  - **"Sala não encontrada"**: código errado, ou a sala não existe.
  - **"Esta sala foi encerrada."**: o anfitrião apagou a sala.
- Quem abre o link de convite sem estar logado cai na tela de login/cadastro com o título "Entrar na sala". Depois de logar ou criar a conta, o pedido de entrada sai **automaticamente**. Exceção: se o cadastro exigir confirmação de e-mail, a pessoa precisa confirmar e entrar de novo.

### Minhas salas

**Onde fica no jogo:** "Voltar a uma sala" (aparece quando a pessoa tem salas ativas) ou "Ver as N salas…".

A tela **"Minhas salas"** lista todas as salas em que a pessoa joga ou foi convidada, com clube, papel (anfitrião/convidado), onde está (ex.: "5ª semana · a sua vez") e um selo:

| Selo | Significado |
|---|---|
| À ESPERA | convite pendente, sala no lobby esperando treinadores, ou rodada parada esperando **você** |
| A COMEÇAR | a sala está no início, na escolha/sorteio dos clubes |
| A CORRER | temporada em andamento |
| ENCERRADA | sala terminada |

Há filtros: Todas, À espera de você, A correr, Encerradas. As salas que esperam pela pessoa aparecem primeiro. O ícone de lixeira apaga a sala (se for anfitrião) ou sai dela (se for convidado).

Referência técnica: `rfEntrarCodigoHTML`, `rfMinhasSalasHTML`, `rfSalaEstado` em `public/src/ui/rf26-resenha-entrada.js`.

---

## Quantos treinadores cabem

- **Mínimo para começar: 2 treinadores dentro da sala.** Sem isso, o botão do anfitrião fica desligado e a tela diz "Precisa de pelo menos 2 treinadores na sala para começar."
- **Máximo de pessoas:** definido pelo plano do anfitrião, no servidor. Quando a tela não consegue ler esse número, usa **10** como reserva. As telas mostram "até N treinadores". A recusa final é do servidor, na hora de ocupar o lugar.
- **Máximo de clubes:** a sala tem um lugar por clube da divisão (20 na Série D). Por isso o limite de pessoas é sempre menor ou igual a 20.

**Ponto incerto:** o número exato de pessoas por sala no plano Pro vem do banco e não está fixo no código do jogo. Textos antigos citavam 8, 10 e 20 em lugares diferentes. Para uma resposta exata, consulte o time de desenvolvimento.

Referência técnica: `rfTetoHumanos`, `RF_SALA_HUMANOS` em `public/src/ui/rf26-landing.js`; `rfSalaTeto` em `public/src/ui/rf26-resenha-entrada.js`.

---

## Começar a temporada e sorteio dos clubes

**Onde fica no jogo:** lobby, botão do anfitrião **"Começar (sortear times)"**.

- Assim que cada pessoa entra na sala ainda no lobby, ela já recebe um clube **livre e aleatório**, para aparecer na lista. Ninguém escolhe.
- Quando o anfitrião clica em **Começar**, o jogo **re-sorteia todos os clubes** dos treinadores presentes. A nota na tela diz: "Ao começar, os clubes [...] são sorteados entre os treinadores que estiverem na sala. Quem não tiver entrado fica de fora e o clube vai para a máquina."
- Todos (anfitrião e convidados) veem a **cerimônia de sorteio**: revela um treinador e o seu clube de cada vez (cerca de 2 segundos cada), na mesma ordem para todos. Há um botão para **acelerar**. No fim, cada um cai na tela do seu clube.
- O convidado que estava no lobby entra no jogo junto quando o anfitrião começa. Se não entrar, a tela do lobby do convidado tem o botão **"Sincronizar"** ("À espera do anfitrião — toque em Sincronizar se ele já começou").

### Entrar com a temporada já em andamento

Quem entra numa sala que já começou vê a tela "A Resenha [nome] já começou (Nª rodada). Um clube livre (hoje da CPU) é sorteado pra você assumir o comando", com o botão **"🎲 Entrar com time sorteado"**. Se não houver clube livre, aparece "Não há mais clubes livres nesta sala no momento."

Referência técnica: `clLobbyStart`, `startResenhaDraw`, `routeAfterJoin`, `scMidJoin` em `public/src/net/local-transport.js`; `netDrawClubs` em `public/src/net/supabase-adapter.js`.

---

## Como a semana anda: dias, momentos e "pronto"

A temporada da sala é uma lista de **dias** (65 dias no plano atual). Cada dia tem **uma competição** (Brasileirão, Copa do Brasil, Libertadores, Sul-Americana) e passa por **três momentos, sempre nesta ordem**:

| Momento | O que todos veem | O que o jogador faz para "cumprir" |
|---|---|---|
| **Escalando** | a tela do clube | clicar em **Jogar**, que quer dizer "estou pronto" |
| **Jogando** | a competição do dia em campo, para todos ao mesmo tempo | terminar a partida (e ver o resultado) ou terminar de assistir |
| **Classificação** | a tabela ou chave daquela competição | sair da tela de classificação |

Regras importantes para explicar ao jogador:

- **Clicar em "Jogar" não começa a partida na hora.** Ele marca o treinador como pronto. A partida só começa quando **o último** treinador ficar pronto, e aí começa **para todos no mesmo instante**.
- **Quem não tem jogo na competição do dia assiste.** É o mesmo dia para todos. Ninguém pula uma copa só porque não a disputa.
- A tabela do Brasileirão aparece depois que a rodada é fechada no servidor. As tabelas de copa aparecem no fim do próprio dia daquela copa.
- **O jogo anda quando todo mundo cumpriu o momento.** Cada cumprimento é um "carimbo" enviado ao servidor. Quando o último carimba, o servidor vira o momento (ou o dia). Nenhum jogador consegue avançar sozinho.

Referência técnica: `docs/sincronia-resenha.md`; `roomDayTick`, `onlineMomentScreenTick` em `public/src/net/local-transport.js`; `buildDayPlan` em `public/src/engine/world-rules.js`.

---

## O servidor manda: resultado e jornada

Esta é a regra mais importante do Modo Resenha: **o servidor é a única fonte de verdade**.

- **Quem decide em que dia e momento a sala está é o servidor** (um "ponteiro" gravado na sala). Se o jogo de um jogador discordar do servidor, a tela dele **espera**, nunca decide sozinha.
- **Resultados de jogos entre clubes da máquina (CPU × CPU)** nunca são decididos no aparelho de ninguém. Só o servidor os calcula. Por isso todos veem o mesmo placar em todos os confrontos, inclusive nos que nenhum humano jogou. Se uma tabela de copa aparecer com jogos "a disputar" por um instante, é esperado: o aparelho está esperando o servidor, em vez de inventar um resultado.
- **A partida de cada humano** é jogada no aparelho dele e o resultado é publicado no servidor. No fim do dia de liga, o **anfitrião** pede ao servidor para fechar a rodada: o servidor calcula as outras divisões, as copas, as finanças da máquina, o leilão e, quando for o caso, a virada de temporada. Todos então adotam o mesmo mundo novo.
- **O anfitrião não é "dono" do resultado.** Ele só executa o que o servidor decidiu: dar a largada quando o momento vira "jogando" e pedir o fechamento da rodada.
- **Se o anfitrião cair**, qualquer outro aparelho da sala fecha a rodada pelo servidor depois de cerca de **15 segundos**, e só depois que o servidor já considerou o dia cumprido (é o "cão de guarda").
- **Jogador muito atrasado**: se o jogo de alguém ficar 3 rodadas ou mais atrás da sala, o jogo puxa o estado da sala por cima, sem inventar resultado.

Referência técnica: memória interna "resultado único na Resenha"; `onlineHostCloseRound`, `onlineOrphanCloseCheck`, `ROUND_LAG_MAX` em `public/src/net/local-transport.js`; `supabase/functions/resolve-round/index.ts`.

---

## Espera: "esperando por X" e "A sala está esperando por você"

Como a sala só anda com todos, às vezes alguém segura o jogo. O jogo mostra isso com nome:

- Depois de **cerca de 25 segundos** parado no mesmo momento, **quem já cumpriu** vê o painel **"Resenha — sala em espera"** (no celular, "Sala em espera"), com quem ainda falta e o que a pessoa está fazendo ("escolhendo o time", "em campo", "vendo a classificação"). Botões: **"⏳ Aguardar"** e, só para o anfitrião, **"⏭ Começar sem eles"**. Para convidados aparece a nota "Só o anfitrião pode seguir sem eles."
- **Quem está segurando a sala** vê o aviso **"A SALA ESTÁ ESPERANDO — Por você"**, com a instrução do que fazer:
  - escalando: "Escale o time e clique em Jogar — a rodada só começa com todos prontos."
  - jogando: "Clique em Jogar para entrar em campo: a rodada está acontecendo agora."
  - classificação: "Feche a classificação para a sala seguir para o próximo dia."
  Esse aviso **não faz a ação pelo jogador**. O botão que resolve é o da tela do clube.
- **"Começar sem eles"** (só anfitrião) é uma liberação explícita no servidor: a sala segue sem quem falta, esteja essa pessoa ausente ou com o jogo aberto e parado. Não existe cronômetro que avance a sala sozinho para quem está presente.
- **Quem fechou a aba** (sem sinal de vida há 45 segundos) é **dispensado automaticamente** depois de 45 segundos de espera, e a sala segue. Quem está com o jogo aberto continua sendo esperado.

Referência técnica: `onlineWaitingTick`, `showResenhaWaiting`, `showResenhaWaitingMe`, `clWaitSkipAbsent` em `public/src/ui/main.js`.

---

## Mercado e leilão na Resenha

- Propostas, contrapropostas, vendas e contratações entre humanos **viajam junto com o resultado da rodada**. Enquanto a rodada não fecha, elas ficam pendentes. Por isso, sincronizar a sala no meio de uma rodada pode colocar essas negociações em risco (o jogo avisa, veja "Sincronizar sala").
- O **caixa de cada humano** é guardado no lugar (assento) dele no servidor, e é o próprio aparelho do jogador que debita ou credita.
- **Leilão:** o lance de cada humano é publicado no servidor. O **servidor resolve o leilão** a cada fechamento de rodada: vale o maior lance, e em empate exato vence quem deu o lance primeiro. O servidor move o jogador para o elenco do vencedor; o débito no caixa do humano vencedor é feito pelo aparelho dele. Se o vencedor humano não tiver caixa ou vaga (por exemplo, cota de estrangeiros), a recusa é decidida no aparelho dele.
- Consequência prática: **no Modo Resenha, um lote de leilão só anda quando a rodada fecha.** Dar um lance e ver o lote "parado" até o fim da semana é normal.

Referência técnica: `netPublishBids` em `public/src/net/supabase-adapter.js`; `auctionRound` e `leilaoRodada` em `supabase/functions/resolve-round/index.ts`.

---

## Fim de temporada na Resenha

- **Quem vira a temporada é o servidor**, no fechamento da última rodada.
- A **tela de fim de temporada** deve aparecer para **todos** os humanos, inclusive para quem estava desconectado na virada e entrou depois. Ao entrar, o jogo verifica se a temporada virou enquanto a pessoa estava fora e então aplica a premiação em dinheiro, registra os títulos e mostra o resumo. Isso é controlado por um carimbo por treinador, para não pagar em dobro.
- O **sorteio das copas da temporada nova espera**: não abre por cima do resumo da temporada.
- As **vagas continentais** no Brasil: o campeão da Copa do Brasil (só o campeão, não o vice), o campeão da Libertadores e o campeão da Sul-Americana vão para a Libertadores seguinte, na frente das vagas por tabela; ninguém fica nas duas copas. Os grupos das copas fecham em múltiplo de 4.
- Títulos, artilheiros por competição e classificações finais vão para o arquivo da sala.

**Ponto incerto:** a documentação interna marca várias dessas correções como "aguardando teste" (agosto). O suporte deve tratar divergência no fim de temporada entre jogadores da mesma sala como bug a escalar.

Referência técnica: `docs/checklist-fim-de-temporada-resenha.md`; `docs/checklist-teste-resenha.md` (seção 8).

---

## Sincronizar sala

**Onde fica no jogo:** no Modo Resenha, o botão **"Sincronizar sala"** fica na faixa do topo, no lugar do botão "Gravar" do Solo.

- O botão grava o que é do treinador (carreira, finanças, caixa de entrada), **recarrega a página** e volta direto para a tela do clube, com o estado do servidor, **sem sair da sala e sem pedir login**.
- Também existe o modal **"Sincronizar a Resenha"** ("Deu aquela piscada e perdeu o bonde?"), que antes de recarregar confere se é seguro:
  - **Bloqueia** se houver partida em andamento: "Você está no meio de uma partida. Termine o jogo primeiro — sincronizar agora apagaria o resultado dela."
  - **Avisa** (e pede para marcar "Entendi o risco e quero sincronizar mesmo assim") se o resultado da partida ainda não chegou no servidor, se há negociações ainda não confirmadas, ou se o jogador é o anfitrião e está fechando a rodada.
  - Se estiver tudo certo: "✓ Tudo certo. Nenhuma partida em andamento e nada seu pendente no servidor."
- Durante a Resenha o endereço da página guarda `?sala=CODIGO`. Assim até um F5 comum volta para a sala certa.

Referência técnica: `rfSincronizarSala` em `public/src/ui/rf26.js`; `clResenhaSync`, `resenhaSyncCheck`, `resenhaRememberRoomInUrl` em `public/src/net/local-transport.js`.

---

## Sair, apagar e remover

- **Convidado sai da sala** (Configurações → "Sair da resenha", ou lixeira em Minhas salas): o lugar dele é liberado e **o clube passa a ser jogado pela máquina**. A janela diz: "Os outros treinadores continuam a semana sem você — e seu clube passa a ser jogado pela máquina" e "Dá para voltar depois com o mesmo código, desde que a sala ainda esteja aberta". Ao voltar, a pessoa entra como numa sala nova (pode passar por aprovação e recebe um clube livre sorteado, não necessariamente o antigo).
- **Anfitrião apaga a sala**: a sala é marcada como encerrada e **some para todos** os participantes ("Apagar a Resenha [nome]? A sala some pra todos os participantes."). Quem tentar entrar depois vê "Esta sala foi encerrada." Não há como desfazer pelo jogo.
- **Fechar a sala no lobby** ("Fechar a sala") só sai da tela; não apaga a sala.
- **Anfitrião remove um treinador** (botão Remover no lobby): o removido vê "Você foi removido da sala pelo anfitrião", o clube dele vai para a máquina, e o convite/aprovação dele é apagado. Para voltar, precisa ser aprovado de novo.

Referência técnica: `clDeleteRoom`, `clDeleteRoomGo` em `public/src/net/local-transport.js`; `netDeleteRoom`, `netKick`, `netHandleKicked` em `public/src/net/supabase-adapter.js`; `rfSairSalaGo` em `public/src/ui/rf26-email-config.js`.

---

## O que acontece se alguém some

| Situação | O que o jogo faz |
|---|---|
| Convidado fecha a aba ou perde a internet | Depois de 45 segundos sem sinal de vida, a sala segue sem ele. Quando volta, entra no dia atual da sala. |
| Convidado com o jogo aberto, mas parado | A sala espera, com o nome dele no painel. Ele vê "A sala está esperando por você". Só o anfitrião pode seguir sem ele ("Começar sem eles"). |
| Anfitrião cai durante a rodada | Outro aparelho fecha a rodada pelo servidor depois de ~15 segundos (cão de guarda). |
| Aba em segundo plano durante uma decisão com prazo (pênalti, expulsão) | O jogo resolve a decisão pelo padrão cerca de 2 segundos depois do prazo, para a sala não travar. |
| Sessão (login) expira no meio da Resenha | O jogo tira a pessoa da sala e mostra "Sua sessão expirou — entre de novo pra voltar à Resenha". Basta logar e entrar de novo. |
| Aba aberta desde antes de uma atualização do jogo | Aparece a barra amarela de versão (veja Solução de problemas). |

---

## Saves no Modo Solo

### Onde fica o save

- O save do Modo Solo fica **na nuvem, ligado à conta**. **É preciso estar logado** para jogar e gravar.
- O jogo também guarda uma cópia no navegador, mas **ao recarregar a página, o jogo carrega o último save da nuvem**. A cópia local não é o save oficial.
- Cada save tem um nome automático (**SAVE01, SAVE02…**), pulando os nomes que já existem na conta. A lista de saves mostra o escudo e o nome do clube, a temporada, a divisão e a rodada.

### Quando o jogo grava na nuvem

Desde 25/09 o jogo grava na nuvem **só nestes momentos**:

1. **Fim de rodada** (liga e copa). No máximo **uma vez a cada 2 minutos**: o que acontecer no meio vai junto no envio seguinte.
2. **Criação do jogo.**
3. **Quando o jogador pede**: botão **Gravar** (faixa do topo), **"Gravar agora"** em Configurações, **"Gravar e sair"** do save, **sair da conta** e **encerrar carreira**. Esses gravam na hora.
4. **Quando a aba fica escondida** (trocar de aba, minimizar, ir fechar) e há algo por gravar: grava na hora.

Ações como escalar, mexer no mercado ou mudar opções **não gravam sozinhas**; elas vão junto no próximo save de rodada.

Se a gravação falhar por servidor ou rede, o jogo tenta de novo sozinho, esperando cada vez mais (até 10 minutos). No "Gravar" manual, o jogador vê a barra "Gravando na nuvem..." e depois "✓ Jogo gravado na nuvem." ou uma mensagem de erro:
- "⚠ Sessão expirada — faça login novamente pra gravar na nuvem."
- "⚠ Não foi possível gravar na nuvem (motivo)."

**Consequência importante para o suporte:** se o jogador fechar o navegador de forma abrupta (ou o aparelho travar) logo depois de jogar, ele pode voltar **algumas ações ou até uma rodada para trás** (no máximo o que aconteceu desde o último envio, que ocorre pelo menos a cada 2 minutos em que houve rodada nova). Recomende usar **Gravar** antes de fechar.

Os saves são enviados **compactados**. O tamanho do save cresce com o tempo de carreira; saves muito grandes já causaram quedas do servidor em setembro, e por isso o ritmo de gravação foi limitado.

Referência técnica: `saveV3`, `_saveV3Enviar`, `SAVE_AUTO_MS` em `public/src/ui/main.js`; `rfGravar` em `public/src/ui/rf26.js`; `netSaveSoloGame`, `empacotarSave` em `public/src/net/supabase-adapter.js`.

### Pontos guardados (salvamento automático e "voltar no tempo")

**Onde fica no jogo:** Configurações → cartão **Gravação**.

- A opção **"Salvamento automático"** ("As 3 últimas semanas e o fim de cada temporada") vem **ligada** por padrão.
- O jogo tira uma **foto** do estado ao fim de cada rodada e guarda **as 3 mais recentes** no navegador daquele aparelho, mais uma foto **fixa** da última rodada de cada temporada encerrada (até 3 temporadas).
- No **Modo Solo**, a foto de **fim de temporada** vai **também para a nuvem** (até 3 temporadas por carreira). Na lista ela aparece com a etiqueta **NUVEM** e o ícone ☁️. As outras aparecem como **AUTO** (rodada) ou **TEMPORADA**.
- Para voltar: escolher o ponto e clicar em **"Voltar para …"**. O aviso da tela: "Escolha o ponto e a temporada volta para lá. O que veio depois é perdido."
- Os pontos de rodada ficam **só naquele navegador**. Trocar de aparelho, usar aba anônima ou limpar os dados do site apaga esses pontos. A foto de fim de temporada na nuvem continua valendo em qualquer aparelho.
- Se o navegador não tiver espaço, o jogo avisa uma vez: "⚠ Sem espaço neste navegador para guardar os pontos de rodada." (no Solo, acrescenta "O fim de cada temporada continua guardado na nuvem."). O motivo também aparece em Configurações.
- Esse interruptor **não desliga** a gravação normal do save na nuvem; ele só controla os pontos guardados.
- **No Modo Resenha**, os pontos existem só no aparelho, não há foto na nuvem, e **só o anfitrião pode voltar a sala** para um ponto (porque isso muda o jogo de todos). Para um convidado, a resposta é "só o Anfitrião pode voltar a sala".

Referência técnica: `public/src/engine/autosave.js` (`autoSaveGuardar`, `autoSaveNuvemFimDeTemporada`, `autoSaveRestaurar`); `rfOpPontos` em `public/src/ui/rf26-email-config.js`.

### Limites por plano (saves e temporadas)

Pelas regras de planos em vigor desde 25/09 (veja também a seção de planos da base):

- **Peladeiro (gratuito):** Modo Solo completo, **1 carreira por conta** e **1 temporada por carreira**. No fim da temporada, ao clicar para começar a próxima, abre o **paywall de fim de temporada**, com uma saída grátis por vez: no fim da 1ª temporada, mandar um depoimento libera +1 temporada; no fim da 2ª, postar ou gravar um vídeo libera +1; depois disso, só com o Pro.
- **Veteranos da fase Beta:** carreiras que já tinham passado da 1ª temporada no lançamento ganharam a temporada atual **+ 2 viradas** de cortesia.
- **Pro:** carreiras e temporadas ilimitadas.
- Se o servidor recusar o save por passar do limite de temporadas, abre a janela do paywall (uma vez por save em cada aba, e nunca no meio de uma partida). Se o save passar do limite de carreiras, abre a janela "O Peladeiro tem uma carreira".
- **As travas só recusam gravar; nunca alteram nem apagam o save existente.** A carreira gravada continua inteira.

Referência técnica: `docs/plano-gratis-pro.md`; `public/src/ui/rf26-paywall.js` (`rfPwRecusado`); tratamento de `PLANO_TEMPORADAS` e `PLANO_SAVES` em `_saveV3Enviar` (`public/src/ui/main.js`).

### Carregar, sair, apagar

- **Carregar:** Modo Solo → lista de saves → tocar no save. O jogo baixa da nuvem e abre na tela do clube.
- **Sair do save:** "Sair deste save?" → **"Gravar e sair"** ("Nada se perde: o save é gravado antes de sair e aparece na lista de saves").
- **Apagar:** "Apagar o save do [clube]?" pede para **digitar o nome do clube** para confirmar. "Isto não tem volta. A temporada, o elenco e o histórico do treinador somem para sempre." As fotos de fim de temporada na nuvem daquele save também são apagadas. O suporte não tem como desfazer pelo jogo.
- **Encerrar carreira:** a carreira vai para o hall e não continua; o save fica só para consulta; o histórico continua na sala de troféus.
- **Apagar a conta:** **não dá para fazer de dentro do jogo hoje.** A janela diz "Ainda não dá para apagar a conta de dentro do jogo" e oferece apagar um save ou sair da conta.

Referência técnica: `clLoadSave`, `clDeleteSave` em `public/src/ui/main.js`; diálogos `sys-sair-save`, `sys-apagar-save`, `sys-encerrar`, `conta-apagar` em `public/src/ui/rf26-acoes.js`.

### Trocar de aparelho

- **Modo Solo:** basta entrar com a **mesma conta** no outro aparelho. O save vem da nuvem. Para não perder o que foi feito por último, **grave antes** no aparelho antigo (botão Gravar). Os pontos de rodada do salvamento automático **não** vão junto (só a foto de fim de temporada na nuvem).
- **Modo Resenha:** entrar com a mesma conta e abrir a sala (Minhas salas, ou o link). O mundo vem do servidor; o lugar, o clube, o caixa e a carreira do treinador também.
- O login fica guardado no navegador: recarregar a página não desloga.

---

## Saves no Modo Resenha

- Na Resenha **não existe "Gravar"**: o estado mora no servidor. O botão da faixa do topo vira **"Sincronizar sala"**.
- O **mundo da sala** (tabelas, calendário, elencos, copas) é publicado no servidor a cada fechamento de rodada.
- O que é **de cada treinador** (clube, caixa, carreira, títulos, extrato, caixa de entrada) fica no lugar dele na sala, no servidor.
- Uma sala conta como um jogo à parte; ela não aparece na lista de saves do Solo.

---

## Solução de problemas

### "O jogo travou no dia" / "Não sai do lugar" (Resenha)

Na maioria das vezes a sala **não travou: está esperando alguém**.

O que responder:
1. Pergunte se aparece o painel **"sala em espera"** com o nome de quem falta. Se sim, é espera normal. A pessoa citada deve fazer a parte dela (clicar em Jogar, terminar a partida ou fechar a classificação).
2. Se quem falta não responde, o **anfitrião** pode usar **"⏭ Começar sem eles"**.
3. Se quem falta fechou a aba, a sala segue sozinha depois de 45 segundos.
4. Se ninguém vê painel nenhum e nada acontece, peça ao jogador para usar **"Sincronizar sala"**.
5. Se continuar parado depois de sincronizar (nos dois aparelhos), escale para dev.

### "Aguardando outros treinadores" / "À espera dos treinadores"

- Na tela de fechamento da semana aparecem mensagens como "A semana abre quando todos publicarem o resultado." ou "Todos já jogaram. Assim que a tabela fechar, a próxima semana abre." São esperas normais do fechamento no servidor.
- Se ficar muito tempo, a tela mostra um botão de escape que abre o **Sincronizar**.
- Na lista de salas, "À espera de você" / "a sua vez" quer dizer que a sala está parada esperando **esse** jogador.

### "Cliquei em Jogar e a partida não começou"

Comportamento esperado na Resenha: **Jogar = estou pronto**. A partida começa para todos quando o último ficar pronto. Explique isso e mostre o painel de espera.

### Tela de decisão presa / Modo Camarote não fecha

Houve um defeito corrigido em 27/09: na última partida de uma copa, o Camarote ficava por cima do aviso de título/eliminação e o ✖ não funcionava. Hoje o ✖ do Camarote sempre redesenha a tela.

O que responder:
1. Peça para clicar no **✖ do Camarote** ou fechar o modal (✖, clicar fora ou Esc; algumas janelas obrigatórias, como a da demissão, só fecham pelos botões de dentro).
2. Se não fechar: **Solo** → recarregar a página (volta ao último save na nuvem); **Resenha** → **"Sincronizar sala"** (se houver partida em andamento, termine antes).
3. Se o problema se repetir, escale com o nome da competição e a fase.

### Erro de conexão, "CORS" no console, login sumindo, nada carrega

- Mensagens de "CORS" no console do navegador quase sempre significam que o **servidor (banco) está fora do ar** (erro 522 por trás), e não um problema de configuração do jogador.
- Sinais típicos: login não funciona, saves não carregam, "Não foi possível conectar ao servidor", nomes do pacote não chegam.
- Existe um monitor automático que testa o servidor de hora em hora e avisa a equipe.
- Houve quedas assim em 24 e 25/09. Numa delas o painel do provedor dizia "saudável" mesmo com o banco fora.

O que responder: "Estamos com instabilidade no servidor. Seu save está guardado; tente de novo em alguns minutos." **Escale para dev** se vários jogadores relatarem ao mesmo tempo.

### Barra amarela: "O jogo foi atualizado enquanto esta aba estava aberta"

Aparece na **Resenha** quando a aba está rodando uma versão do motor de partidas diferente da que o servidor usa (por exemplo, aba aberta desde antes de uma atualização). O texto: "O jogo foi atualizado enquanto esta aba estava aberta. Recarregue para continuar — seus resultados não valem até lá." com o botão **"Recarregar agora"**.

O que responder: clicar em **Recarregar agora**. Enquanto não recarregar, os resultados daquela aba não valem para a sala. O Modo Solo **não** tem esse aviso.

### Save "pulou temporadas" / "todos se aposentaram" / clube caiu de divisão sem jogar

Defeito conhecido ("virada fantasma"), **corrigido em 23/09**: cliques repetidos em "começar a próxima temporada" podiam virar a temporada mais de uma vez. Sinais: o ano do save está à frente do que a pessoa jogou, muitos jogadores aposentados, subidas/descidas estranhas. Hoje o jogo aceita um clique por vez e recusa virar temporada sem nenhum jogo disputado.

O que responder:
1. Veja se há ponto guardado anterior em Configurações → Gravação (em especial a foto **NUVEM** de fim de temporada) e oriente a voltar para ele.
2. Se não houver, escale para dev com o nome da conta e do save (ex.: SAVE01). Saves afetados antes da correção podem não ter reparo.

### Nomes reais de jogadores ou clubes aparecendo

O jogo usa nomes fictícios (pacote oficial). Em 24–25/09, com o servidor fora, jogos **novos** foram criados com nomes reais porque o pacote não chegava. Hoje o pacote oficial vai **embutido** no jogo e a publicação é bloqueada sem ele.

O que responder: se o save foi **criado** durante uma queda, ele pode ter ficado com nomes reais (o save guarda os nomes da criação). Escale para dev com a data de criação do save. Se aparecer num jogo novo criado agora, escale imediatamente.

### Lentidão

Causas mais comuns:
- **Save grande** (carreiras longas no Solo). Carregar e gravar demora mais.
- **Aba em segundo plano** (o navegador desacelera o jogo); na Resenha isso também atrasa a sala.
- **Instabilidade do servidor** (veja o item de conexão).
- Velocidade da partida: no Solo, o jogador escolhe em Opções (Curto, Médio, Longo; o Ultrassônico é do Pro). Na Resenha, quem define é o anfitrião.

O que responder: manter a aba em primeiro plano, fechar outras abas pesadas, recarregar a página. Se for geral, verificar se o servidor está instável.

### Cache e recarregar

- **Solo:** recarregar (F5) volta para a mesma página, carregando o último save da nuvem.
- **Resenha:** preferir **"Sincronizar sala"**. Um F5 comum também volta para a sala (o endereço guarda `?sala=CODIGO`).
- Se a pessoa suspeita de versão velha: recarregar com cache limpo (no computador, Ctrl+Shift+R ou Cmd+Shift+R).
- **Limpar os dados do site** apaga os pontos guardados locais (fotos de rodada), mas não apaga o save da nuvem nem a sala.

### Navegador e celular

- O código **não define um navegador oficial** e não mostra aviso de navegador não suportado. A equipe usa o **Chrome no computador** para testes e diagnóstico (é onde fica o console).
- O jogo tem layout de celular. No celular não há console, então relatos de bug de sincronia são mais fáceis de investigar com alguém no computador.
- Metade dos problemas de sincronia vem de **aba em segundo plano ou rede móvel (4G)**. No celular, bloquear a tela ou trocar de app equivale a pôr a aba em segundo plano.
- **Aba anônima/privada:** o login e os pontos guardados locais valem só naquela sessão.

### "Sua sessão expirou"

Na Resenha, a pessoa é tirada da sala para o login. No Solo, a gravação falha com "Sessão expirada — faça login novamente pra gravar na nuvem". Resposta: entrar de novo com a mesma conta. O save na nuvem continua lá.

### Não consegue entrar na sala

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| "Sala não encontrada" | código errado | conferir as 5 letras/números (não existem I, O, 0, 1) |
| "Esta sala foi encerrada." | o anfitrião apagou a sala | pedir um novo convite |
| Fica em "À espera de aprovação" | o anfitrião ainda não aprovou | o anfitrião deve abrir a sala e clicar em **Aprovar** em "PEDIRAM PARA ENTRAR" |
| "O anfitrião recusou sua entrada" | recusado | falar com o anfitrião |
| "Não há mais clubes livres" | sala cheia | não há vaga |
| Janela "O Modo Resenha é do Pro" | plano sem acesso | explicar o plano Pro |
| Fez login pelo link e "nada aconteceu" | era um defeito antigo, hoje o pedido sai sozinho | pedir para abrir o link de novo já logado |

---

## Roteiro de diagnóstico para o suporte

Use estas perguntas na ordem. Anote as respostas antes de escalar.

**1. Qual modo?** Modo Solo ou Modo Resenha?

**2. Identificação**
- E-mail da conta (para o dev localizar; não pedir senha nunca).
- Solo: nome do save (SAVE01…), clube, temporada e rodada.
- Resenha: **código da sala** (5 caracteres), quem é o anfitrião, quantos treinadores, clube de cada um.

**3. Aparelho e rede:** computador ou celular? Qual navegador? Wi-Fi ou 4G? A aba ficou em segundo plano?

**4. O que aparece na tela:** pedir **print ou vídeo**. Existe painel "sala em espera", aviso "A sala está esperando por você", barra amarela de atualização, ou alguma mensagem com ⚠?

**5. Já tentou o básico?**
- Resenha: **Sincronizar sala**? Todos os treinadores estão na mesma tela/dia?
- Solo: recarregar a página? Gravar?
- Barra amarela: clicou em **Recarregar agora**?

**6. É geral?** Outros jogadores relatam o mesmo agora? (Se sim, suspeitar de servidor fora.)

**7. Na Resenha, se a pessoa estiver no computador:** pedir para abrir o console (F12 → Console) e copiar:
- a **última linha que começa com "carimbei"** de **cada** jogador (ela diz em que dia e momento a sala está e por quem espera: "ainda faltam 1: NOME");
- qualquer linha com "ponteiro e jornada local discordam", "cão de guarda", "à frente da sala", "atrasado N rodada(s)", "pausa há", "motor divergente".
- Para relatos detalhados, o jogador pode abrir o jogo uma vez com `?debug=1` no endereço (liga um rastro extra, que fica gravado no navegador; `?debug=0` desliga).

### Quando resolver sozinho

- Sala esperando alguém com nome na tela → explicar e orientar (Jogar, terminar a partida, fechar a classificação; ou anfitrião usa "Começar sem eles").
- "Cliquei em Jogar e não começou" → explicar "Jogar = pronto".
- Barra amarela → recarregar.
- Sessão expirada → entrar de novo.
- Código errado, sala encerrada, aprovação pendente → orientar.
- Perdeu pouca coisa no Solo depois de fechar o navegador → explicar o ritmo de gravação e recomendar Gravar antes de sair.
- Voltar a um ponto guardado → orientar em Configurações → Gravação.

### Quando escalar para dev

Escale **sempre** que houver:
- **Resultados diferentes** entre jogadores da mesma sala (placar, tabela, artilharia, chave de copa) que continuam diferentes **depois de sincronizar**.
- Jogadores da mesma sala em **dias diferentes** por mais de alguns segundos, ou um jogador que **avançou sozinho**.
- Sala parada **sem painel de espera** para ninguém, mesmo depois de sincronizar.
- Momento pulado (ex.: foi de escalando direto para classificação), partida que "sumiu", rodada que fechou sem ninguém jogar.
- Fim de temporada que não apareceu para alguém, premiação em dobro ou faltando, títulos errados.
- Dinheiro sumindo ou duplicando em negociação entre humanos; jogador que não mudou de elenco depois de venda/leilão.
- Save que pulou temporadas, save corrompido, save que não carrega, **nomes reais** em jogo novo.
- Paywall ou limite de plano que parece errado (ex.: Pro sendo bloqueado).
- Vários jogadores com erro de conexão ao mesmo tempo (servidor fora).
- Qualquer mensagem de erro que não esteja nesta base.

Leve para o dev: modo, conta, save ou código da sala, horário aproximado, aparelho/navegador/rede, prints, e as linhas de console quando houver.

---

## Perguntas frequentes

**Como jogo com meus amigos?**
Pelo Modo Resenha. Hoje ele aparece como "Em breve", com lançamento em versão Beta exclusiva para quem é Pro. Quando estiver aberto: um amigo cria a sala e manda o link ou o código de 5 caracteres; os outros entram e o anfitrião aprova.

**Posso escolher meu clube na Resenha?**
Não. Os clubes são sorteados entre os treinadores presentes quando o anfitrião clica em Começar. Todos começam na Série D do Brasil.

**Quantas pessoas cabem numa sala?**
Pelo menos 2 para começar. O máximo depende do plano do anfitrião e é controlado pelo servidor; a tela mostra "até N treinadores". Nunca passa do número de clubes da divisão (20 na Série D).

**Por que a partida não começa quando clico em Jogar?**
Na Resenha, Jogar quer dizer "estou pronto". A partida começa para todos juntos quando o último treinador ficar pronto.

**Um amigo sumiu e a sala parou. E agora?**
Se ele fechou o jogo, a sala segue sozinha em cerca de 45 segundos. Se ele está com o jogo aberto e parado, o anfitrião pode clicar em "Começar sem eles".

**O anfitrião caiu. A sala acaba?**
Não. A rodada é fechada pelo servidor a pedido de outro treinador depois de uns 15 segundos. Se o anfitrião **apagar** a sala, aí ela acaba para todos.

**Quem decide os resultados na Resenha?**
O servidor. Os jogos da máquina contra a máquina só são calculados no servidor, então todos veem o mesmo. A partida de cada humano é jogada no aparelho dele e publicada no servidor.

**Dei um lance no leilão e nada aconteceu.**
Na Resenha, o leilão anda quando a rodada fecha no servidor. O maior lance vence; em empate, quem deu o lance primeiro.

**Saí da sala. Posso voltar?**
Pode, com o mesmo código, se a sala ainda estiver aberta. Mas, ao sair, o seu clube passa para a máquina, e ao voltar você recebe um clube livre sorteado.

**Onde fica meu save?**
No Modo Solo, na nuvem, ligado à sua conta. Na Resenha, no servidor da sala.

**O jogo grava sozinho?**
Sim, no fim das rodadas (no máximo a cada 2 minutos) e quando você troca de aba ou minimiza. Para garantir, use o botão Gravar antes de fechar.

**Voltei e perdi as últimas jogadas.**
Provavelmente o navegador foi fechado antes do envio seguinte. O jogo carrega o último save da nuvem. Veja também Configurações → Gravação, onde ficam os pontos guardados.

**Dá para voltar para uma rodada anterior?**
Sim: Configurações → Gravação → escolher o ponto → "Voltar para…". Tudo o que veio depois é perdido. Na Resenha, só o anfitrião pode fazer isso.

**Troquei de celular/computador. Perdi o jogo?**
Não. Entre com a mesma conta. Os pontos de rodada ficam no aparelho antigo, mas o save e a foto de fim de temporada estão na nuvem.

**Apaguei meu save sem querer. Dá para recuperar?**
Pelo jogo, não. O apagar pede para digitar o nome do clube justamente por isso. Escale para dev se houver pedido, mas não prometa recuperação.

**Como apago minha conta?**
Ainda não dá para fazer isso dentro do jogo. É possível apagar saves e sair da conta.

**Quantas carreiras e temporadas posso jogar?**
No Peladeiro, 1 carreira com 1 temporada (com até +2 temporadas grátis pelo depoimento e pelo post/vídeo, uma de cada vez). No Pro, ilimitado. Carreiras da fase Beta ganharam temporadas extras de cortesia.

**Apareceu uma barra amarela dizendo que o jogo foi atualizado.**
Clique em "Recarregar agora". Até recarregar, os resultados daquela aba não valem na sala.

**Vi "CORS" ou erro de conexão.**
Quase sempre é o servidor fora do ar por alguns minutos. Seu save continua guardado. Tente de novo mais tarde.
