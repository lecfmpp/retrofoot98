# Painel dos sócios — como funciona

Painel de administração do RetroFoot98: usuários, engajamento, finanças, publicidade e
funcionalidades. Vive em `public/admin/` (HTML/CSS/JS clássico, sem build, como o jogo) e é
publicado num **site Firebase separado** — deploy do painel não toca no jogo, e o jogo não
serve nenhum arquivo do painel.

Referência de design: o handoff *Dashboard administrativo do projeto* (protótipo
`Painel Admin v2.dc.html` + `IMPLEMENTACAO.md`).

---

## 1. Onde vive cada coisa

| Peça | Caminho |
|---|---|
| Página do painel | `public/admin/index.html` · `admin.css` · `admin.js` |
| Entrega de anúncios no jogo | `public/src/net/ads.js` |
| Slots dentro do jogo | `adSlotHTML()` / `anchorAdHTML()` em `public/src/ui/main.js` |
| Estilo dos criativos | bloco “CRIATIVO DE VERDADE” em `public/src/styles/main.css` |
| Batimento de tempo de jogo | `netStartHeartbeat()` em `public/src/net/supabase-adapter.js` |
| Hosting | `firebase.json` (dois targets: `jogo` e `admin`) · `.firebaserc` |

### Uma página de cada vez

Cada aba é uma função `pgX()` assíncrona: pede à base, **espera**, e só então escreve em
`#page`. Enquanto ninguém mandava nisso, dois desenhos podiam estar no ar ao mesmo tempo — o
sócio clicava em *Usuários* com a *Visão geral* ainda carregando — e quem escrevia na tela era
quem **respondia por último**, não quem foi pedido por último. Os dois sintomas conhecidos eram
o mesmo bug: abrir uma página e ver o conteúdo da anterior, e ter de clicar duas ou três vezes
até "pegar" (cada clique sorteava a corrida de novo).

`irPara()` agora tira uma **senha** (`pedirDesenho()`) por navegação e passa-a à `pgX()`. Antes
de escrever, a página confere `desenhoAtual(senha)`: com senha vencida sai fora sem pintar nada
— nem o HTML, nem os handlers que vêm depois dele. O último clique é sempre o que manda.

> **Página nova ou desenho novo tem de fazer o mesmo.** A assinatura é
> `async function pgX(forcar, senha = pedirDesenho())` — o valor por omissão é o que faz
> `pgX()` chamada à mão (a busca com debounce, o redesenho depois de gravar) tirar senha
> própria em vez de nascer vencida. Antes de cada `el('page').innerHTML =`, um
> `if(!desenhoAtual(senha)) return;`.

O item clicado também pisca no menu enquanto a base responde: sem sinal nenhum, página lenta
parecia clique perdido — e a resposta natural era clicar de novo.

### Dois schemas no Supabase, de propósito

- **`admin_rf98`** — o que só os sócios veem: `adm_users`, `adm_invites`, `adm_lancamentos`,
  `adm_patrocinadores`, `adm_user_plans`, `adm_kanban_cols`, `adm_features`, `adm_config`,
  `adm_parceiros`, `adm_conteudo` e `adm_audit` (o registro de ações, § 3b).
  O papel `anon` **não tem sequer USAGE** neste schema: um bug no jogo não alcança as finanças.
- **`elifoot_v3`** (schema do jogo) — só o que o **jogo** precisa ler/escrever:
  `ad_spaces`, `ad_creatives`, `ad_events` e `user_activity`.

A linha divisória é “quem toca nisto?”, não “isto é do painel?”. O inventário de anúncios é
servido ao jogador deslogado, então pertence ao schema do jogo.

> O schema novo foi exposto na API com
> `alter role authenticator set pgrst.db_schemas = 'public, elifoot_v3, admin_rf98'`.
> **Atenção:** gravar a página *Settings → API* no dashboard do Supabase pode reescrever essa
> lista. Se o painel começar a devolver 404 nas tabelas, é isto — reponha `admin_rf98` na lista
> de *Exposed schemas*.

---

## 2. Quem entra no painel

Não há trigger em `auth.users`: a **mesma** base autentica os jogadores do jogo. Ser admin é
estar em `admin_rf98.adm_users`, e o único caminho para lá é:

1. um sócio cria um convite (`admin_rf98.convidar(email, papel, mensagem)`);
2. a pessoa entra (ou cria conta) com **esse e-mail**;
3. o painel chama `admin_rf98.reivindicar_convite(token)`, que confere e-mail × convite e insere
   a linha em `adm_users`.

Sem convite ativo, o painel não abre — mesmo com conta válida no jogo.

**Papéis:** `socio` (tudo), `financeiro` (Finanças + Publicidade), `produto` (Analytics,
Usuários, Resenhas, Funcionalidades), `leitura` (vê, não escreve). O papel é aplicado nos dois
lados: a navegação esconde o que não interessa e a RLS recusa a escrita (`admin_rf98.pode()`).

**Primeiro acesso:** o primeiro convite não pode sair do painel (não haveria sócio para clicar
no botão), então foi criado direto no banco — `socio` para `lecfmpp@gmail.com`. Do segundo em
diante é tudo pela tela *Equipe admin*. Para repetir o truque com outro e-mail, no SQL editor:

```sql
insert into admin_rf98.adm_invites (email, papel, expira_em)
values ('outro@email.com', 'socio', now() + interval '30 days')
on conflict (lower(email)) where aceito_em is null
do update set papel = 'socio', expira_em = now() + interval '30 days';
```

**Envio do convite:** o painel gera o link (`?convite=<token>`) e copia-o para a área de
transferência — não manda e-mail sozinho, porque isso exige uma edge function com credencial de
envio. A recuperação de senha, essa sim, reutiliza a function `send-password-reset` que
o jogo já usa (com o e-mail da marca, via Resend).

---

## 3. Publicidade — o inventário e a ligação com o jogo

O contrato entre painel e jogo é a **chave** do espaço. Os onze espaços estão em
`elifoot_v3.ad_spaces` — e as medidas são as que o **jogo de facto desenha** (conferidas no
navegador, não deduzidas do código):

| Chave | Onde aparece no jogo | Desktop | Celular | Formatos | Peso |
|---|---|---|---|---|---|
| `rf98.top.970x90` | topo de **todas** as páginas | 970×90 | 320×100 | JPG, PNG, WEBP | 120 KB |
| `rf98.anchor.bottom` | faixa fixa no rodapé, todas as páginas | 970×90 | 320×50 | JPG, PNG, WEBP | 150 KB |
| `rf98.hub.sidebar` | coluna do Hub, junto da classificação | 300×250 | 300×250 | JPG, PNG, WEBP | 120 KB |
| `rf98.match.halftime` | modal do intervalo da partida | 728×90 | 320×50 | + MP4 (≤15 s) | 800 KB |
| `rf98.copa.sponsor` | modais de copa (sorteio, grupos, chave) | 728×90 | 320×50 | JPG, PNG, WEBP | 120 KB |
| `rf98.auction.footer` | modal de leilão | 728×90 | 320×50 | JPG, PNG, WEBP | 120 KB |
| `rf98.loading.splash` | tela “A iniciar o jogo…” | 1280×720 | 1280×720 | JPG, WEBP | 400 KB |
| `rf98.live.inline` | rodada ao vivo, abaixo da faixa da competição | 468×60 | 468×60 | JPG, PNG, WEBP | 60 KB |
| `rf98.resenha.invite` | cartão do convite da Resenha | 1200×630 | 1200×630 | JPG, PNG | 300 KB |
| `rf98.rail.esq` | rodada ao vivo e Camarote, à esquerda | 160×600 | 160×600 | JPG, PNG, WEBP | 120 KB |
| `rf98.rail.dir` | idem, à direita | 160×600 | 160×600 | JPG, PNG, WEBP | 120 KB |

Fora deste inventário há as **placas do campo** (6 horizontais de 169×22 e 6 verticais de
19×192, no cartão de Formação) e a **barra de patrocínio do Camarote**. As duas são desenhadas
pelo jogo a partir de `AD_SPONSORS`, não passam pelo painel — se forem para venda, precisam de
chave própria em `ad_spaces` como as outras.

**Os três espaços de modal são a mesma faixa.** Intervalo, cabeçalho de copa e rodapé do
leilão passam todos pelo mesmo bloco, que reserva 90px de altura — por isso os três são
728×90. O inventário descrevia um interstitial 640×480 e um logo quadrado 250×250 que o jogo
não desenha: uma arte nessas medidas passava na validação do painel e entrava esmagada.

**O splash é 16:9 nas duas larguras.** O retrato 720×1280 que estava no inventário entraria
com tarjas — a caixa mantém a proporção do cinema em qualquer tela.

**Os trilhos precisam de largura.** O direito só aparece acima de 1420px e ambos somem abaixo
de 1180px: em portátil pequeno e telefone eles não existem, e é por isso que valem menos que a
faixa de topo, que aparece sempre.

**O espaço é sempre visível.** Até agosto de 2026 a regra era o contrário — “espaço sem
criativo não é desenhado” — e o efeito era que oito das dez chaves não existiam na tela: não
dava para ver o inventário nem conferir se ele cabia no desenho. Agora o jogo desenha o espaço
com a arte quando há criativo publicado e com um marcador do formato quando não há (ver
`rfAdEspaco` em `public/src/ui/rf26.js`). O marcador tem a medida exata do anúncio, então
publicar não mexe no layout: só troca o conteúdo do lugar que já estava reservado.

### Ciclo de vida

1. **Upload** (painel → Publicidade → *Enviar*): valida **extensão**, **peso** e **dimensão
   exata** (desktop ou celular) lendo o próprio arquivo antes de subir; MP4 também valida a
   duração (≤ 15 s). Vai para o bucket público `publicidade`.
2. **Publicar substitui**: o criativo anterior daquela chave passa a `ativo = false`. Um espaço
   tem no máximo um criativo no ar.
3. **Leitura no jogo**: `ads.js` faz um GET público de `ad_creatives` (RLS deixa ver só o que
   está no ar), guarda em memória e em `localStorage`, e recarrega a cada 5 minutos.
4. **Impressão**: contada quando o bloco **entra no viewport** (`IntersectionObserver`), no
   máximo uma por chave a cada 30 s — o jogo remonta a tela inteira a cada `cdraw()`, contar no
   desenho inflaria tudo. **Clique**: registrado e abre o `link_destino` em aba nova
   (`noopener`).
5. Ambos gravam em `elifoot_v3.ad_events` via `rf_ad_event()`, e o painel mostra impressões,
   cliques e CTR dos últimos 30 dias.

Para acrescentar um espaço novo: inserir a linha em `ad_spaces` **e** chamar
`adSlotHTML('nova.chave')` (ou `ADS.html(...)`) na tela — sem os dois lados, o painel mostra um
espaço que nunca aparece.

### Parceiros — quem cadastrou

`adm_parceiros.criado_por` guarda a conta que cadastrou o parceiro, e `parceiros()` resolve o
nome em `adm_users` (com o e-mail da conta como reserva, para quem já saiu do painel — nesse
caso a linha aparece marcada em âmbar). A página mostra isso em três lugares: coluna
**Responsável** na tabela, bloco **Quem cadastrou cada parceiro** (parceiros, inscritos e
pagantes por pessoa) e uma linha no topo da ficha do parceiro.

O bloco soma inscritos e pagantes, não só a contagem de parceiros: dois parceiros que trazem
300 inscritos valem mais que dez parados, e contar cabeça esconderia isso.

### Apagar contas de jogador

`admin_rf98.apagar_usuarios(uuid[])` — socio-only, auditada. **auth.users não tem FK vinda de
`solo_saves`, `game_seats`, `games`, `room_invites` nem `join_requests`**: essas tabelas guardam
o `user_id` como uuid solto, então um DELETE na conta deixaria save e assento órfãos (foi isso
que fez o funil dizer "14 jogaram para 12 contas"). A limpeza é explícita:

| O que | Vira |
|---|---|
| saves solo da pessoa | apagados |
| assentos dela em salas de outros | devolvidos à CPU (a sala segue jogável) |
| salas que ela **hospeda** | apagadas (sala sem anfitrião não funciona) |
| convites e pedidos dela | apagados |
| referências em auditoria/lançamentos | anuladas (FK `NO ACTION` bloquearia o delete) |

Duas travas, testadas: não apaga a **própria** conta, e recusa a seleção inteira se houver
**admin do painel** nela (tire o acesso em *Equipe admin* antes). Antes de confirmar, o painel
chama `resumo_usuarios()` e mostra quantos saves, assentos e salas vão junto — e avisa quando as
salas da pessoa têm **outros treinadores** dentro.

### Reenviar senha

Em *Usuários*, o link **Reenviar** chama a mesma edge function do "Esqueci a senha" do jogo
(`send-password-reset`, template da marca via Resend), com `redirectTo` para o **site do jogo**.
O painel não gera nem vê senha: o link é criado no servidor e vai direto para o e-mail da pessoa.

### Apagar salas e saves

Em *Resenhas & solo* cada linha tem caixa de seleção, com atalhos por critério — salas **sem
humano** ou **paradas há 14 dias**, saves **parados há 14/30 dias** ou **sem temporada**. A barra
flutuante mostra o que está selecionado e abre a confirmação, que exige digitar o **número de
itens** (um "tem certeza?" não segura quem acabou de clicar em "selecionar todos") e avisa
quantos treinadores humanos e quantos itens **com movimento recente** estão na lista.

`admin_rf98.apagar_salas(text[])` e `admin_rf98.apagar_saves(jsonb)` — socio-only, ambas
auditadas. Um save é identificado pelo **par `user_id` + `save_name`**: o nome sozinho não
identifica, dois jogadores podem ter um save "TESTE".

### Apagar uma sala

Em *Resenhas & solo*, o ✕ na linha da sala chama `admin_rf98.apagar_sala(codigo)` — só para
`socio`. É um DELETE de verdade em `elifoot_v3.games`; as seis tabelas filhas (`game_seats`,
`messages`, `game_results`, `room_invites`, `join_requests`, `round_events`) têm FK
`ON DELETE CASCADE` e vão junto. **Não há cópia do `shared_state` em lugar nenhum**: quem
estava jogando perde a temporada. Por isso o painel exige digitar o código da sala e avisa
quantos humanos estão sentados nela antes de liberar o botão.

---

## 3b. Registro — o que cada pessoa fez

Toda escrita do painel deixa uma linha em `admin_rf98.adm_audit`
(`quando`, `quem`, `quem_email`, `acao`, `alvo`, `detalhe` em JSONB). Duas mãos escrevem lá:

- **o painel**, pela função `registrar(acao, alvo, detalhe)` em `admin.js`, para o que passa
  direto por RLS (criar card, publicar criativo, editar clube, subir vídeo…);
- **o banco**, pela função `admin_rf98.registrar()`, para o que já é função `SECURITY DEFINER`
  (`apagar_sala`, `apagar_usuarios`, `convidar`, `reivindicar_convite`…) — ali o registro entra
  na **mesma transação**: se a ação der errado, a linha de auditoria cai junto.

**Ninguém edita o próprio rastro.** `adm_audit` tem política de `SELECT` (qualquer admin) e de
`INSERT` (só com `quem = auth.uid()`). Não há política de `UPDATE` nem de `DELETE` — com RLS
ligada, a ausência é a proibição.

A página **Registro** (menu, só para `socio`) lê isso em duas alturas:

| Bloco | O que responde |
|---|---|
| KPIs | quantas ações no período, quantas pessoas mexeram, área mais movimentada, última ação |
| *Quem fez o quê* | por pessoa: total, as três áreas em que mais mexeu, quando foi a última e qual |
| *Registro* | a lista, filtrável por pessoa, por área e por busca livre; CSV; clique abre o `detalhe` cru |

O período é o mesmo seletor do cabeçalho (7 dias / 30 dias / Ano) que o resto do painel usa.
A busca livre varre também o **JSON do detalhe**: procurar "Palmeiras" acha a edição de clube
mesmo que o nome do clube só exista lá dentro.

**Quem saiu do painel continua aparecendo**, identificado pelo e-mail gravado na linha e marcado
em âmbar. Tirar o acesso de alguém não pode apagar o que essa pessoa fez — seria o oposto de
auditoria.

**Ação nova entra no catálogo `ACOES`** (rótulo) e, se o prefixo for novo, em `AREA_POR_PREFIXO`
(área). Sem isso a linha **ainda aparece** — nada fica escondido —, mas com a chave técnica crua
em vez da frase.

O que o `detalhe` guarda é escolhido por ação, e é aí que mora a leitura útil: `clube.editar`
grava os **nomes** dos jogadores criados, alterados e removidos (não só a contagem — "3 novos"
não diz a ninguém o que entrou no elenco); `criativo.publicar` grava o arquivo e o peso;
`feature.mover`, a coluna de origem e a de destino.

---

## 4. De onde vem cada número

Tudo o que o painel mostra sai da base real, através de funções `SECURITY DEFINER` em
`admin_rf98` (o painel roda no browser e não pode ler `auth.users` diretamente):
`overview`, `usuarios`, `jogos`, `analytics`, `publicidade`.

- **Pontos / ranking**: `Pts` do clube do técnico em cada save solo (`solo_saves`) e em cada
  assento de Resenha (`games.shared_state`).
- **Tempo de jogo / ativos**: `user_activity`, alimentada pelo batimento de um minuto do próprio
  jogo — só conta com a aba visível, logado e **dentro** de um jogo (a Home e os assistentes de
  criação não contam). Contas antigas aparecem com 0 min: a medição só existe a partir de agora.
- **Convites da Resenha**: `room_invites` + `join_requests`; `aceite` = o convidado acabou
  sentado naquela sala; `expirado` = mais de 48 h sem isso.
- **Plano / MRR**: `adm_user_plans`, mantida à mão — não há cobrança ligada ao jogo. Enquanto
  ninguém preencher, todos aparecem como `grátis` e o MRR é R$ 0. É o único lugar onde o painel
  depende de dado inserido manualmente, e é de propósito: melhor um zero honesto do que um número
  inventado.
- **Finanças**: `adm_lancamentos`, em centavos. Recorrência mensal/anual materializa os meses em
  falta ao abrir a página (`gerar_recorrencias()`, idempotente).
- **Gasto de IA**: ver § 4b — são duas contas do mesmo dinheiro, e elas não valem o mesmo.
- **Analytics**: contas criadas, atividade diária e funil saem da base própria. Os blocos de
  **GA4** (origem de tráfego, páginas, dispositivo) precisam da Google Analytics Data API, que
  exige uma chave de serviço no servidor — o painel não pode guardá-la. Assim que houver um job a
  escrever o snapshot em `adm_config['ga4_snapshot']`, os blocos aparecem sozinhos:

  ```json
  { "visitas": 12000, "fontes": [{"nome":"Orgânico","pct":42}],
    "paginas": [{"url":"/","n":8100}], "device": [{"l":"Celular","v":"63%"}] }
  ```

---

## 3c. Funcionalidades — o card como ficha

O quadro tem de continuar legível **de relance**: título, prioridade, nota de uma linha, autor,
votos. Tudo o que é comprido vive na **ficha**, que abre ao clicar no card.

| Onde | O quê |
|---|---|
| Card no quadro | checkbox de feito, título, prioridade, nota curta, origem, votos, quem criou e quando |
| Ficha (clique no card) | título, nota, **conteúdo** (texto livre com links), prioridade, origem, coluna, autoria e o **histórico do card** |

**Prioridade** tem quatro valores — *Urgente*, *Importante*, *Para depois*, *Só ideia* — e um
quinto estado que é **não ter**: card recém-criado não é "só ideia", é não triado, e pintar os
dois igual esconderia a fila de triagem.

**O checkbox move para a coluna de conclusão** (`colunaFeito()`: por nome — *Feito*, *Concluído*,
*Pronto*, *Done* — com a última coluna como reserva). Desmarcar devolve à coluna de origem, que
fica guardada; sem registro dela, volta para a primeira. Sem isso, desmarcar deixaria o card
preso em "Feito".

**Os filtros escondem, não removem.** O card filtrado continua na coluna e na ordem dele — é o
que faz o arrasto e a gravação de ordem continuarem corretos — e o cabeçalho diz quantos estão
escondidos, porque um quadro que parece vazio por causa de um filtro esquecido é pior do que
nenhum filtro. O corte por data é sobre a **criação** do card, que é a pergunta real ("o que
entrou esta semana?"), não sobre a última mexida.

**O histórico do card não é tabela nova**: sai de `adm_audit`, filtrado por
`detalhe->>'feature_id'`. Filtrar pelo título não serviria — o título muda, e o histórico é
justamente onde se vê que mudou. Por isso **toda ação de card grava o id** em `feature_id`
(`supabase/sql/features-autoria.sql` cria o índice que torna essa pergunta barata). Cards
mexidos antes de 03/09/2026 só passam a ter histórico a partir da mexida seguinte.

Ler é leitura: **quem tem papel de `leitura` abre a ficha, vê o conteúdo e o histórico** — só não
edita. Prender a ficha ao papel de escrita tiraria de metade da equipe a parte mais útil dela.

---

## 4a. Finanças — período, despesas e as duas moedas

**Dois filtros, de propósito diferente.** O de cima (ano + mês; mês vazio = ano inteiro) serve
para **fechar um período** — manda nos KPIs, nas receitas e no fechamento. O da aba *Despesas* é
**independente** e serve para outra pergunta: "o que saiu ultimamente". Por isso ela abre nos
**últimos gastos**, atravessando meses — presa ao mês corrente, no dia 2 ela estaria vazia. A
lista de meses sai dos lançamentos, não de um intervalo inventado: mês sem movimento não aparece
e lançamento antigo não fica inalcançável.

**Quase tudo segue o filtro** — KPIs, receitas, despesas do período, fechamento e o card de gasto
de IA. A exceção é o gráfico *Lucro por mês*, que é a **tendência** dos últimos seis meses (vem de
`overview`, não dos lançamentos filtrados): ele diz isso no próprio bloco e marca a barra do mês
escolhido. Parado ao lado de KPIs que mudam, parecia não ter atualizado.

**A sincronia da despesa de IA não corre a cada troca de filtro.** Ela grava lançamento a
lançamento, sequencialmente, e persiste o câmbio da fatura — segundos de escritas. Presa ao
desenho, fazia cada mudança de mês demorar tanto que a pessoa mexia no filtro outra vez, e aí a
primeira renderização voltava com **senha vencida** e não pintava: o sintoma era *"tem de repetir
a escolha do mês para funcionar"*. Ela é manutenção de dados, não desenho — corre ao abrir a
página e no máximo uma vez por minuto (`IA_SINCRONIZADA_EM`). Trocar filtro passou a ser leitura
do que já está em memória.

**Redesenho de dentro da página nunca falha em silêncio.** Trocar um filtro chama `pgX()` de
novo, e essa promessa não era apanhada por ninguém — só `irPara()` tem `.catch`. Qualquer erro no
meio virava rejeição silenciosa e a tela ficava com os números **antigos**, sem aviso: um sintoma
indistinguível de "o filtro não funciona". Todo redesenho passa agora por `redesenhar()`, que
mostra o erro num toast.

**Real primário, dólar secundário.** O painel fecha em real — é a moeda do projeto —, mas metade
do custo nasce em dólar (OpenAI, Supabase, softwares), e converter de cabeça a cada linha é onde
se erra a conta. Então o real manda no tamanho e na cor, e o dólar vai junto, menor
(`brlUsd()` para a coluna de valor, `brlEUsd()` para uma linha só). A cotação é a mesma de todo
o painel (`cotacaoUSD()`, cache de 1h, que alimenta `COTACAO`); enquanto ela não tiver sido
buscada, o dólar **não aparece** — em vez de aparecer convertido por um número inventado.

---

## 4b. Gasto de IA — a estimativa e a fatura

O painel tem **duas contas do mesmo dinheiro**, e elas não valem o mesmo:

| | De onde vem | Quando vale |
|---|---|---|
| **Estimativa** | `elifoot_v3.ia_custos` — uma linha por geração, escrita pela edge function a partir do `usage` que a própria OpenAI devolve (`custo_fonte='tokens'`) ou, quando ele não vem, de uma tabela de preço por imagem (`'tabela'`) | sempre; é diária e está sempre em dia |
| **Fatura** | a API de custos da organização (`/v1/organization/costs`, via a edge function `openai-custos`), ou o export de uso (*Usage → Export*) largado à mão. Os dois vão para `adm_config['openai_faturas']` | quando cobre o **mês inteiro** |

As duas batem quase sempre — a estimativa usa os mesmos tokens e a mesma tabela de preços
(`TOK_USD` na edge function = `OPENAI_TOK_USD` no painel; **mexeu numa, mexa na outra**).
Divergem quando a geração é cobrada mas não chega a ser registrada: pedido que falha depois de a
imagem sair, tentativa repetida, ou chamada feita antes de o registro de custo entrar no ar. Em
agosto de 2026 a estimativa deu US$ 239,35 e a fatura US$ 260,83 — os US$ 21,48 de diferença
estão todos em 25, 26 e 27/08; de 28/08 em diante as duas contas batem ao cêntimo.

**A explicação vive num FAQ recolhido no fim da página** (`<details>` nativo, abre e fecha no
clique, nasce fechado). Empilhada sob os cartões, a tabela de conciliação era cinco colunas mais
dois parágrafos no meio da página de finanças, e ninguém a lia. Quem abre Finanças quer os
números; a explicação é procurada depois, quando a dúvida aparece — e é lá que ela está, junto da
conciliação mês a mês.

**A fatura chega sozinha.** Ao abrir Finanças — no máximo uma vez por hora (`OPENAI_PUXADA_EM`) —
`puxarFaturaOpenAI()` chama a edge function `openai-custos`, que pergunta à OpenAI quanto cada dia
custou. O endpoint devolve **dólares**, já como vão ser cobrados, e não tokens: não há tabela de
preços pelo meio. O resultado entra no mesmo `adm_config['openai_faturas']` onde o CSV entrava, e
tudo o que vem depois — "só fecha o mês inteiro", câmbio congelado, despesa lançada — é o caminho
que já existia. O botão *Puxar da OpenAI* fura a espera de uma hora.

**Qual chave.** A função tenta primeiro a do Estúdio (`OPENAI-RETROFOOT`), que já está
configurada — não faz sentido exigir uma chave nova antes de saber se a que existe serve. Mas
`/v1/organization/*` é endpoint de **organização**, e a OpenAI documenta que ele quer uma **Admin
key** (`sk-admin-…`, em *platform.openai.com → Settings → Organization → Admin keys*): uma chave de
projeto costuma levar 401 ali. Quando isso acontece, o FAQ mostra exatamente essa frase e o que
fazer — guardar a Admin key no secret **`OPENAI-ADMIN`**, que tem prioridade quando existe. Nenhuma
das duas passa pelo browser; é por isso que a edge function existe em vez de o painel falar com a
OpenAI direto (que, além da chave, esbarra no CORS). Enquanto a fatura não vier, o mês fecha pela
estimativa — nada quebra.

**Conciliar à mão continua a existir**, em *Finanças → FAQ → Conciliar por CSV*. O ficheiro traz
**tokens, não dólares**: o custo é calculado com a tabela de preços, que é como a própria fatura o
faz. A tela mostra os dois números lado a lado antes de gravar. Uma importação manual que cubra
**mais** do que a API conhece não é substituída por ela — senão um mês fechado reabriria.

---

## 4c. Receita — o Stripe lança sozinho

A receita era **digitada à mão**: alguém olhava o painel do Stripe e escrevia *+ Receita* mês a
mês. Enquanto ninguém escrevia, a página mostrava prejuízo com o dinheiro já na conta.

**Quem grava é o webhook.** `stripe-webhook` já era o único sítio que sabe, com prova de
assinatura, que uma cobrança foi paga — só que usava o evento para conceder plano e deitava fora o
**valor**. Agora cada cobrança paga vira uma linha em `admin_rf98.stripe_pagamentos`
(`supabase/sql/stripe-receita.sql`):

| Evento | O que grava |
|---|---|
| `invoice.paid` | a cobrança da assinatura — a primeira, cada renovação e a diferença de uma troca de plano |
| `checkout.session.completed` / `async_payment_succeeded` (Pix) | a compra avulsa, quando o dinheiro entra |
| `charge.refunded` | o reembolso, na **mesma** linha da cobrança (`amount_refunded` é acumulado) |

**Os dois eventos novos têm de estar ligados no endpoint do Stripe** (*Developers → Webhooks →
o endpoint → Update details*): `invoice.paid` e `charge.refunded`. Sem eles a tabela fica vazia e
a receita volta a ser manual, sem erro nenhum na tela.

**A assinatura é registrada no `invoice.paid`, não no `checkout.session.completed`.** Somar a
sessão *e* a fatura contaria a primeira cobrança duas vezes; e só a fatura chega nas **renovações**,
que são a maior parte da receita.

**O id do Stripe é a chave primária.** O Stripe reenvia eventos quando quer, e um `upsert` sobre o
id faz a reentrega não somar nada. Somar duas vezes a mesma venda é pior do que não somar nenhuma:
um número errado ninguém desconfia, um número em falta aparece.

**Registrar dinheiro nunca derruba o webhook.** O plano é o que a pessoa pagou para ter; a linha de
receita é contabilidade nossa. Se a segunda falhar, o erro fica no log e o plano entra na mesma —
devolver 500 poria o Stripe a reenviar o evento (e a regravar o plano) por causa de um relatório.

**Duas linhas por mês no extrato, e não uma:**

| Linha | Tipo | Categoria | Valor |
|---|---|---|---|
| `Assinaturas e Pix — Stripe` | receita | `assinaturas` | bruto − reembolsos |
| `Taxas do Stripe` | despesa | `taxas` | a taxa da adquirente |

Lançar só o líquido esconderia o **custo de vender**, que é real, cresce com o faturamento e é
exatamente o número que decide se vale mudar de gateway. A taxa vem da *balance transaction* da
cobrança e exige `charge_read` na chave restrita; sem a permissão ela fica `null` — o banco entende
isso como *"ainda não contada"* e lança a receita bruta sem taxa, em vez de fingir que a taxa é zero.

**A soma é trabalho de banco** (`admin_rf98.stripe_receita_mes()`), pelo mesmo motivo de
`ia_custos_mes()`: `select()` sem `range()` para em 1000 linhas sem avisar, e o painel somaria um
pedaço da receita sem erro nenhum. O mês é cortado em **UTC**, como o da IA — os dois números do
mesmo mês têm de ser cortados no mesmo sítio, ou o fecho nunca bate.

**A sincronia corre ao abrir a página e no máximo uma vez por minuto**
(`STRIPE_SINCRONIZADO_EM`), como a da IA e pela mesma razão: é manutenção de dados, não desenho.

### O histórico anterior ao webhook

O webhook só grava o que acontece **depois de ele existir** (deploy de 21/09/2026). As cobranças
antigas estão no Stripe e em lado nenhum nosso — sem elas, os meses velhos fecham com despesa cheia
e receita zero. O botão **Importar histórico**, no card *Receita do Stripe*, chama a edge function
`stripe-backfill` (só sócio), que percorre as cobranças e grava o que faltava.

Ela percorre **`charges`**, e não faturas: uma volta apanha as assinaturas *e* os Pix, e a
`balance_transaction` vem expandida na mesma listagem — a taxa entra sem uma ida extra por cobrança.

**As permissões da chave restrita.** A `rk_live_…` do projeto nasceu só com o que o webhook
precisava para conceder plano. Para o dinheiro, ligue em *Dashboard → Developers → API keys → a
chave → Edit*:

| Permissão | Para quê | Sem ela |
|---|---|---|
| **Charges and Refunds → Read** | listar as cobranças | o backfill não corre de todo |
| **Balance transactions → Read** | a taxa e o líquido | receita entra, taxa fica `null` (avisa na tela) |
| **Checkout Sessions → Read** | casar um Pix antigo com a sessão dele | o Pix entra com o id da cobrança |
| **Payment Intents → Read** | o mesmo caminho, no webhook | a taxa do Pix novo não é lida |

**A chave de cada linha é a mesma que o webhook escreve**: id da *fatura* para assinatura, id da
*sessão* para Pix (achada pelo `payment_intent`). Se fosse o id da cobrança, correr o backfill
depois de o webhook já ter gravado criaria uma segunda linha para o mesmo dinheiro e o mês
apareceria com o dobro da receita. Com a mesma chave, o `upsert` só atualiza — **pode correr as
vezes que for**. Uma cobrança sem sessão (feita à mão no painel do Stripe) usa o próprio id, que o
webhook nunca escreve: também não duplica.

**Uma fatura só substitui a estimativa se cobrir o mês inteiro** (`ate` ≥ último dia do mês).
Um export baixado hoje leva o mês corrente pela metade; tomá-lo como fatura fecharia setembro com
dois dias de gasto. Export parcial fica guardado, marcado como *parcial* na tela, e não substitui
nada.

**O câmbio fica gravado com a fatura**, no dia em que a despesa é de facto lançada. Mês fechado
não muda de valor em reais porque o dólar mexeu hoje; reimportar o mesmo mês mantém o câmbio com
que ele entrou no extrato. O mês corrente não tem fatura e acompanha o câmbio do dia — ele ainda
está a acontecer.

### Três armadilhas que já morderam aqui

1. **A despesa mensal só era sincronizada no mês corrente.** Na virada do mês a linha congelava no
   valor que tinha na última abertura da página — sempre a meio do mês. Agosto ficou em R$ 292,28,
   escrito no dia 25, com o mês a fechar dez vezes acima disso. Agora `sincronizarDespesaIA()`
   percorre **todo** mês com gasto, fechado ou não.
2. **`ia_custos` passou das 1000 linhas.** Lida com `select()` sem `range()`, o Supabase devolvia
   as primeiras mil sem erro e sem aviso: com 4881 linhas, o painel somava um quinto do gasto — e
   *lançava* esse quinto como despesa. A soma passou para o banco,
   `admin_rf98.ia_custos_mes()` (`supabase/sql/ia-custos-mes.sql`), que devolve uma linha por
   mês/tipo. É a mesma armadilha já documentada em `todasAsLinhas()`, desta vez nas finanças.
3. **A tabela de preços é um PISO, não o preço.** Ela cobre só a imagem de **saída** e ignora o
   prompt e a imagem de entrada — subestima 3% (rosto, prompt curto) a 10% (montagem, que manda
   imagem no pedido). Em 02/09/2026, 65% das gerações tinham sido precificadas assim. O card
   agora separa **medido pelos tokens** de **estimado pela tabela**, com o custo por imagem de
   cada um: era daí que vinha a sensação de "o custo que aparece não é real".
4. **O card só somava os grupos que ele desenhava.** `camisa` e `treinador` não estavam em nenhum
   grupo e sumiam da conta — US$ 108 fora do total. Agora o total é a soma de **todos** os tipos e
   o que não cabe num grupo nomeado cai em *Outros*, para aparecer em vez de desaparecer.

---

## 5. Deploy

### As edge functions das finanças

A fatura da OpenAI e a receita do Stripe não vivem no painel — vivem em duas funções. Depois de
mexer em qualquer uma delas:

```bash
supabase functions deploy openai-custos --project-ref alxwgqvjmetjbbqtjkhx
```

```bash
supabase functions deploy stripe-backfill --project-ref alxwgqvjmetjbbqtjkhx
```

```bash
supabase functions deploy stripe-webhook --no-verify-jwt --project-ref alxwgqvjmetjbbqtjkhx
```

O `--no-verify-jwt` do webhook **não é opcional**: quem chama é o Stripe, que não tem sessão. A
porta dele é a assinatura HMAC, não o JWT.

O secret da Admin key, **se** a chave do Estúdio levar 401 no endpoint de custos:

```bash
supabase secrets set OPENAI-ADMIN=sk-admin-... --project-ref alxwgqvjmetjbbqtjkhx
```

E no Stripe, em *Developers → Webhooks*, o endpoint tem de ouvir também `invoice.paid` e
`charge.refunded` — sem eles a receita não chega.

### O painel

O painel é um site Firebase próprio no mesmo projeto (`elifoot-d368d`). O `firebase.json` já
está com os dois targets; falta criar o site e apontar o domínio:

```bash
firebase login --reauth
```

```bash
firebase hosting:sites:create retrofoot98-admin --project elifoot-d368d
```

```bash
firebase deploy --only hosting:admin --project elifoot-d368d
```

O domínio **https://admin.retrofoot.com.br** já está apontado para este site e no ar.

**O deploy do jogo mudou de comando** (agora há dois sites):

```bash
npm run build && firebase deploy --only hosting:jogo --project elifoot-d368d
```

`firebase deploy --only hosting` passa a publicar **os dois** sites. Se algum comando reclamar
que o target não está aplicado, é porque o `.firebaserc` não foi lido — confirme que o site do
jogo se chama mesmo `elifoot-d368d` com `firebase hosting:sites:list`.
