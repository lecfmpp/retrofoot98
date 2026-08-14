# RetroFoot98 — Rebranding 2026 · Prompt de implementação

Cole este arquivo inteiro no Claude Code, dentro do repositório do RetroFoot98, junto com a pasta `telas/` deste pacote.

---

## Contexto

O RetroFoot98 hoje é um único HTML de ~11.500 linhas (`public/index.html` + `public/src/ui/main.js`) com a pele de janelas do Windows 98: bisel 3D de 2px, barra de título azul-marinho, fundo verde-feltro cheio, cantos vivos.

Este pacote é o rebranding aprovado: superfície clara, cantos arredondados, cores do clube aplicadas ao conteúdo e cromo verde neutro igual para todos os times. **A estrutura do jogo não muda** — mesmas formações (F1–F6), mesmas colunas de elenco, mesmos menus, mesma lógica. Muda só a pele e a organização das telas.

**Não reescreva a lógica do jogo.** O trabalho é de camada visual e de navegação.

---

## O que vem no pacote

```
telas/            todas as telas em HTML, desktop e mobile
tokens/           CSS custom properties (cores, tipo, espaçamento, forma, movimento)
styles.css        entrada única — só @import
components/       componentes React de referência (brand, core, data, game, feedback)
guidelines/       cards de especímen das fundações
assets/           escudos e fotos de estádio já usados nas telas
readme.md         o guia completo do design system
```

As telas são HTML estático com estilos inline. Trate como **referência visual pixel a pixel**, não como código de produção: leia os valores (cores, raios, tamanhos, pesos) e aplique no CSS do jogo.

---

## Ordem de implementação

### 1. Tokens (primeiro, sempre)

Copie `tokens/` para `public/src/styles/` e importe antes de `main.css`. Depois substitua, no CSS existente, os valores fixos pelas variáveis:

| Antes | Agora |
|---|---|
| `#000080` (navy) | `var(--club-primary)` |
| `#2f8f2f` (felt) | `var(--surface-desk)` |
| `#c0c0c0` (chrome) | `var(--surface-card)` |
| `#ffff00` (yellow) | `var(--club-secondary)` |
| bisel de 2px | `border:1px solid var(--line-1)` + `border-radius:var(--r-card)` |

`--club-primary` e `--club-secondary` são **por clube**: no `newGame()`/`cdraw()`, escreva `color` e `color2` do clube do usuário nessas duas variáveis no elemento raiz. Todo o resto do cromo é fixo.

### 2. Componentes base

Comece pelos que aparecem em toda tela: `Card`, `Button`, `Chip`, `SectionLabel`, `MenuBar`/sidebar, `Toast`, `Dialog`. Cada um tem `.jsx` de referência e `.prompt.md` com quando usar. O jogo não usa React — leia o JSX como especificação e implemente com as funções de template que já existem (`dlg()`, `btn()`, `overlayC()`, `toastC()`).

**Regra de ouro do `toastC()`**: o toast agora é escuro com filete de 4px à esquerda na cor do tom. Cinco tons: `success` ✓, `warn` ⚠, `danger` ✖, `progress` (reticências), `info` (glifo livre + ação opcional). Ver `telas/Popups e Toasts.html`.

### 3. Hub do time

`telas/Hub do Time - Sidebar.html` é a tela principal e o padrão de envelope de todas as outras:

- Faixa do clube no topo (escudo, treinador em Georgia, forma V/E/D, caixa, contagem para o apito)
- **Sidebar de 216px** que colapsa para 62px — substitui a barra de menu horizontal atual (`clMenuHTML`)
- Publicidade: banner 970×90 no topo, dois trilhos 160×600 nas laterais, faixa 320×50 no rodapé
- Área central de duas colunas

**O campo tem tamanho fixo: 470×585px, `flex:0 0 auto`, `box-sizing:border-box`.** Ele nunca encolhe, nem quando a sidebar expande. O shell usa `width:max-content` para acompanhar.

### 4. As demais telas

Cada modal de menu vira **página** dentro do mesmo envelope. Consolidação aprovada:

| Página | Substitui |
|---|---|
| Equipa (Hub) | tela atual + Estádio + Historial |
| Mercado | Comprar, Vender, Leilão, Propostas, Contrapropostas, Últimas transferências |
| Elenco & Base | Ficha do jogador, Subir da base, Treino especial |
| Campeonatos | Minhas competições, Calendário, Artilharia, Últimos vencedores, Marcadores de sempre, Ligas internacionais |
| Treinador | História, Sala de Troféus, Ranking, Ofertas, Perfil |
| Finanças | Finanças, Histórico financeiro, Estádio, Patrocínio |
| Clube & Sistema | E-mail, Opções, Gravar, Sair, Modo Resenha |

Os sub-itens viram **abas dentro da página**, nunca páginas novas.

### 5. Página ou popup

- **Página** = destino de menu. Tem URL e histórico.
- **Popup (`Dialog`)** = o que acontece sozinho no save: oferta de emprego, título, artilharia, leilão encerrado, proposta recebida, lesão grave, convite de Resenha, confirmação destrutiva.

Na dúvida: se está no menu, é página; se apareceu sozinho, é popup.

### 6. Mobile

Cada tela tem sua versão `- Mobile.html` em 390px:

- Sidebar vira **barra inferior fixa** com 5 destinos + botão ⚽ Jogar
- Sub-seções viram abas horizontais roláveis
- Tabelas perdem colunas (elenco fica em POS, nome, força, energia)
- **O campo continua sendo campo** — 326×406, com todas as marcações. Não vire lista.
- Popup vira *bottom sheet* com alça e ações empilhadas; o toast fica a 12px das bordas, acima da barra inferior

### 7. Partida ao Vivo e Modo Camarote

`telas/PartidaAoVivo.html` e `telas/Modo Camarote.html` já estão prontas e seguem `camaroteHTML()` / `camDynHTML()` do `main.js`. Detalhes que importam:

- Placar em painel escuro com dígitos amarelos e malha de pontos (estilo marcador de estádio)
- Linha de jogo com **altura fixa de 56px**: fatos extras viram `+N`, nunca empurram a linha
- Escudos com fundo transparente, sem moldura, 30px
- Barra de pressão com as duas cores de clube e divisor a 50%

### 8. Onboarding (7 passos)

O fluxo de entrada é um wizard de 7 telas, cada uma com versão mobile:

| Passo | Tela | O que faz |
|---|---|---|
| 1 | Onboarding 1 - Entrar | e-mail/Google, ou continuar um save (acordeão com os saves gravados) |
| 2 | Onboarding 2 - Modo | 🛋️ Modo Solo ou 🍺 Modo Resenha (este marcado EM BREVE na beta) |
| 3 | Onboarding 3 - Pais e Ligas | escolha do país e da divisão de entrada |
| 4 | Onboarding 4 - Criar Sala | código da sala, ritmo, quem pode entrar (só Resenha) |
| 5 | Onboarding 5 - Convites | lista de treinadores, convite por e-mail/WhatsApp, chat da sala |
| 6 | Onboarding 6 - Sorteio do Clube | o clube sai no sorteio, com os dados do elenco e do caixa |
| 7 | Onboarding 7 - Boas-vindas | estádio, vídeo do treinador, indicadores, tabela e recado da diretoria |

No desktop o passo aparece como trilha numerada à esquerda; no mobile vira barra de progresso no cabeçalho azul e a ação principal fica fixa no rodapé.

### 9. Sorteios das competições

**A Série D não tem sorteio.** Os grupos já vêm formados no início do save — a
liga é montada com o país e a divisão escolhidos no onboarding. Só as copas
sorteiam.


Cinco telas, todas com o mesmo envelope — painel do troféu à esquerda (campeão atual, formato, premiação, potes ou caminho do campeão) e a cerimônia à direita, com barra de progresso e as bolas caindo:

| Tela | Formato |
|---|---|
| Sorteio 2 - Copa do Brasil | confrontos de ida e volta da 1ª fase |
| Sorteio 3 - Libertadores | 8 grupos de 4, sorteio por pote |
| Sorteio 4 - Sul-Americana | idem, com nota do playoff dos terceiros da Libertadores |
| Sorteio 5 - Playoff Serie D | chave de mata-mata das oitavas à final |
| Sorteio 6 - Playoff Libertadores | idem, com datas de ida |

No mobile o bracket não cabe: a navegação é por fase (Oitavas · Quartas · Semi · Final).

### 10. Chat da Resenha

`telas/Chat da Resenha.html` define o comportamento em três estados no desktop — fechado (bolha com contador pulsando), espiada (uma linha por 4s, some sozinha) e aberto (painel de 264px flutuando, sem empurrar o conteúdo).

Regras: silêncio total durante a partida ao vivo e no Camarote; o contador é o único aviso (sem som, sem notificação do navegador); atalhos C para abrir e Esc para fechar. No mobile não existe bolha — o chat é o terceiro item da barra inferior e abre como folha de baixo ocupando 66% da tela.

### 11. Modais de oferta

Seguem `showJobInvite` e `showJobProposal` do `main.js`:

- **Modal - Convite para Jantar**: vídeo do convite, contexto do clube que sondou e a sua segurança no cargo atual
- **Modal - Jantar e Proposta**: vídeo da assinatura, termos (salário, prêmio, caixa, objetivo) e a fala do presidente

### 12. Landing

`telas/Landing - Home.html` é a página pública: hero com as telas do jogo sobrepostas, faixas de carreira solo (com a classificação real), Modo Resenha, mercado/leilão, cards das ligas oficiais, lista de espera com barra de vagas e rodapé escuro com as páginas de SEO.

### 13. Sobreposições de partida e pós-rodada (leva 2)

Portadas a partir do documento de cobertura de 2026-08-13. Cada uma substitui a
função indicada em `public/src/ui/main.js`, trocando o shell antigo
(`titleBarTop` + `deskWrap`) pelo envelope novo.

| Tela | Substitui | Classe antiga |
|---|---|---|
| Resenha - Lobby da Sala | `renderOnline()` em `src/net/local-transport.js:569` | `cl-sala` |
| Pos-Rodada - Classificacao | `scClassif()` `7432` (`CL.screen = 'classif'`) | `cl-cls2` |
| Modal - Substituicao | `subPanelHTML()` `7392` | `cl-sub` |
| Modal - Lesao | `injurySubHTML()` `6482` | `cl-inj` |
| Modal - Cartao Vermelho | `redCardHTML()` `6637` | `cl-inj` |

**Envelope de sobreposição** (`build/overlay.js` → `overlay()`): gramado escurecido
em radial-gradient com as faixas horizontais, janela branca centrada de raio 24px,
cabeçalho em degradê azul com filete amarelo à esquerda, corpo em cards brancos e
rodapé cinza-claro com as ações. No mobile a janela vira tela cheia (390px, sem
raio) e o rodapé fica `position:sticky`.

**Envelope de página cheia** (`stage()`): mesma faixa azul do clube no topo, corpo
em `#e8f0e7` e cards brancos — é o que Pos-Rodada e Lobby usam.

Regras específicas:

- **Substituição** — as 3 trocas aparecem como pílulas no cabeçalho; a linha
  selecionada em campo e a do banco ficam com borda azul; o resumo sai/entra mostra
  o efeito na força da linha. A troca por lesão **não** consome uma das 3.
- **Lesão / expulsão** — card com filete vermelho de 4px à esquerda, tempo fora ou
  suspensão em mono, e a lista de substitutos ordenada por posição com a penalidade
  de "fora de posição" explícita.
- **Expulsão** — as três opções de reorganização (3-2-4, 3-3-3, 4-3-2) com a
  recomendada pré-selecionada.
- **Pós-rodada** — a tabela mantém as faixas de zona (verde acesso, amarelo playoff,
  vermelho rebaixamento) com legenda no pé do card; os resultados trazem o público
  em mono à esquerda, como no original.
- **Lobby** — o clube do jogador humano usa **sempre** o escudo do próprio clube
  (`uploads/…` / `assets/crests/`), nunca um escudo de placeholder.

### 14. Sobreposições de partida (leva 3)

| Tela | Substitui | Classe antiga |
|---|---|---|
| Modal - Penalti Batedor | `penaltyPickerHTML()` `7298` | `cl-pen` |
| Modal - Penalti Suspense | `penaltySuspenseHTML()` `7351` | `cl-pen` |
| Modal - Penalti Resultado | `penaltyResultHTML()` `7359` | `cl-pen` |
| Modal - Disputa de Penaltis | `shootoutScoreboardHTML()` `7213` | `cl-pens` |
| Modal - Prorrogacao | `startExtraTime()` `6095` (hoje não tem cabeçalho próprio) | — |

O gol é a própria grade de escolha: 290×112px dentro das traves, dividido em
**8 quadrados** (4 ALTO em cima, 4 RASTEIRO embaixo). A marca do pênalti e o
texto de instrução ficam abaixo, no gramado. Na disputa, cada cobrança é uma
bolinha: verde (●) convertida, vermelha (✖) perdida, cinza vazia pendente.

A prorrogação mostra a **quarta pílula** de substituição em verde — é a troca
extra que só a prorrogação libera.

### 15. Entre rodadas e competições

| Tela | Substitui | `CL.screen` |
|---|---|---|
| Fim de Temporada | `dlg('Fim da temporada!'…)` `7515` / `7579` | — |
| Copa - Classificacao da Fase | `scCupClassif()` `8540` | `cupclassif` |
| Competicao - Visao Geral | `scCupView()` `10549` | `cupview` |
| Imprensa | `scImprensa()` `7669` | `imprensa` |
| Adversario - Ver Time | `scTeamView()` `3842` | `teamview` |

**Troféus são arte real, não emoji nem escudo.** Copiados de
`public/img/trofeus/` para `assets/trofeus/` — Série C, Série D, Copa do Brasil,
Libertadores e Sul-Americana. O troféu aparece a 104–112px nas telas de
competição e fim de temporada, e a ~64px no card de resumo. **Nunca** use o
escudo do clube no lugar do troféu.

**Fim de temporada** tem um placeholder de vídeo 16:9 no topo com as seis
situações possíveis como pílulas — Título, Acesso, Playoff, Meio de tabela,
Rebaixado, Demitido. Cada uma aponta para um vídeo diferente; o selo dentro do
placeholder mostra o desfecho corrente.

### 16. Modo Resenha — pausa e assentos

| Tela | Substitui | `CL.screen` |
|---|---|---|
| Resenha - Pausa Patrocinada | `showSyncLoading()` `631` + `pausaChecklist()` `558` | sobreposição `#c-syncload` |
| Resenha - A Espera da Rodada | `scWaitRound()` `7875` | `waitround` |
| Resenha - Passe o Aparelho | `scSeatTurn()` `3082` | `seatturn` |
| Resenha - Classificacao do Assento | `scSeatClassif()` `3043` | `seatclassif` |
| Resenha - Entrega do Aparelho | `scHandoff()` `3135` | `handoff` |

**O slider de patrocinadores é o `.rf-sponsor` da base, portado.** Faixa
"Patrocínio oficial · Quem banca a resenha", trilho com os logos de
`AD_SPONSORS` (Betano, CazéTV, iFood — copiados para `assets/sponsors/`)
duplicados e rodando em `sponRun 18s linear infinite`, com máscara em degradê
nas duas pontas. Abaixo, a chamada do patrocinador da vez na cor da marca
(`bg`/`fg` do `AD_SPONSORS`) — **texto apenas, sem logo**, exatamente como o
`camCtaStyle()` faz: o logo é desenhado em vermelho escuro e desaparece sobre
o fundo `#cc0000`.

### 17. Fluxo de entrada (passos que faltavam)

| Tela | Substitui | `CL.screen` |
|---|---|---|
| Fluxo - Escolha de Moeda | `scMoeda()` `2165` | `moeda` |
| Fluxo - Pais Jogavel | `scPaisJogavel()` `2139` | `paisJogavel` |
| Fluxo - Carregando | `scLoading()` `2185` | `loading` |
| Fluxo - Numero de Treinadores | `scJogadores()` `2212` | `jogadores` |
| Fluxo - Escolha dos Clubes | `scEscolhaClubes()` `2782` | `escolhaclubes` |
| Fluxo - Continuar Save | `scModoSolo()` `1882` | `modosolo` |
| Conta - Recuperar Senha | `scResetPassword()` `1689` | `resetpassword` |
| Landing - Paginas Institucionais | `landingPageHTML()` `1536` + as 5 views | `abertura` + `CL.landingView` |

Todas usam o mesmo envelope de assistente (`build/wizard.js` → `wiz()`) já
aprovado no onboarding: trilha de passos numerada no topo, conteúdo central e a
ação principal no rodapé à direita.

**A página "Equipa" foi deliberadamente descartada** — Elenco & Base e Formação
já cobrem a função. Não porte `rfEquipaHTML()`; remova o destino de `RF_PAGES`.

### 18. Abas internas completas (leva 5)

Sete páginas, 31 abas com conteúdo completo. Cada página é **um arquivo** com as
abas funcionais: clicar troca o painel, com `tabIn .26s ease`.

| Arquivo | Abas | Substitui |
|---|---|---|
| Mercado - Abas | Comprar · Leilão · Propostas (2) · Contrapropostas · Vender · Transferências | modais de mercado e leilão |
| Elenco e Base - Abas | Elenco · Ficha do jogador · Base · Treino especial | `cl-main` roster + ficha |
| Campeonatos - Abas | Minhas competições · Calendário · Artilharia · História · Ligas internacionais | `scCupView()` + calendário |
| Treinador - Abas | Carreira · História · Sala de Troféus · Ranking · Ofertas (1) · Perfil | telas de carreira |
| Financas - Abas | Resumo · Extrato · Histórico · Estádio · Patrocínio | modais de finanças |
| E-mail - Abas | Caixa de entrada · Arquivadas | `cl-main` e-mail |
| Configuracoes - Abas | Opções · Jogo · Modo Resenha | `cl-main` opções + sala |

**Menu lateral definitivo** (8 destinos, nesta ordem): Formação, Mercado,
Elenco & Base, Campeonatos, Treinador, Finanças, E-mail, Configurações. O item
"RetroFoot98" saiu — o escudo no topo da sidebar já faz o papel de voltar ao hub.

**Como as abas funcionam.** Todos os painéis existem no template; a lógica só
troca a visibilidade do wrapper. Nenhum painel é montado por JS — o conteúdo é
markup normal, editável e indexável.

```js
// build/tabpage.js → logic()
vals['panel' + i] = i === this.state.tab
  ? { display:'flex', flexDirection:'column', gap:'14px', animation:'tabIn .26s ease' }
  : { display:'none' };
```

**Padrões de conteúdo que se repetem** (todos em `build/tabpage.js`):

- `table(cols, head, rows)` — grade sem linhas de grade; cabeçalho em mono 9px
  com letter-spacing; linha destacada (o seu clube/jogador) com fundo `#eef3fa`
  e borda azul. Números sempre em mono, alinhados à direita.
- `stats(items, n)` — bloco de indicadores: rótulo mono 9px, valor mono 19px,
  legenda 11px opcionalmente colorida (verde bom, vermelho ruim, amarelo atenção).
- `bar(pct)` — barra de 6px que muda de cor por faixa: ≥75 verde, ≥50 verde-claro,
  ≥30 amarelo, abaixo vermelho. Vale para energia, potencial e progresso de treino.
- `jersey(n)` — camisa do clube com o número, nas listas de jogador.
- `tag(texto, bg, fg)` — pílula mono 9px para estado (ACEITO, ATIVO, ENTRADA).

**Mobile (390px).** Mesmo arquivo, com quatro mudanças: trilhos de publicidade e
sidebar escondidos por CSS (`display:none!important` — inline style não perde
para media query), shell sem cantos arredondados, grades multi-coluna reduzidas a
uma ou duas, e as tabelas com `min-width:600px` dentro de um card com
`overflow-x:auto` — rolam lateralmente em vez de esmagar a coluna do nome.

**A barra de abas rola horizontalmente** no mobile; a aba ativa não muda de
tamanho, só de cor.

### 19. Diálogos e confirmações de ação (leva 6)

Os botões das telas internas abrem diálogos — 24 no total, em três arquivos de
galeria. Cada galeria tem a lista à esquerda e o diálogo real renderizado à
direita, sobre o fundo da tela de origem.

| Arquivo | Diálogos |
|---|---|
| Acoes - Mercado | Propor · Dar lance · Cobrir lance · Aceitar proposta · Recusar proposta · Contrapropor · Listar para venda · Resultado do leilão · Caixa insuficiente |
| Acoes - Elenco e E-mail | Responder e-mail · Arquivar · Renovar contrato · Contrato renovado · Não dá para renovar · Promover da base · Confirmar treino |
| Acoes - Sistema e Conta | Gravar · Sair do save · Apagar save · Encerrar carreira · Sair da sala · Trocar senha · Apagar conta · Sincronizar |

**Anatomia do diálogo** (`build/dialog.js` → `dialog()`): janela branca de raio
18px, 420–560px de largura, cabeçalho em degradê azul com filete de 5px à
esquerda — **amarelo** para ação normal, **verde** para confirmação de sucesso,
**vermelho** para ação destrutiva. Corpo em blocos de 14px de gap, rodapé
`#f7faf6` com a ação secundária à esquerda e a primária à direita.

Regras de conteúdo, todas vindas do jogo:

- **Todo diálogo de valor mostra a consequência antes de confirmar.** Propor
  mostra o caixa depois da compra, a folha depois da contratação e a margem de
  salário restante. Aceitar uma venda mostra a queda na força do setor. Renovar
  mostra as luvas à vista e a folha resultante. O jogador nunca confirma no escuro.
- **Barra de chance** em contraproposta e renovação: verde quando é certa,
  amarelo quando é média, com as faixas de valor em mono abaixo.
- **Avisos usam os três tons do jogo** — `warn()`: amarelo neutro para
  informação, vermelho com ⚠ para risco, verde com ✓ para confirmação. As frases
  seguem o original: "⚠ Caixa insuficiente para renovar este contrato.",
  "✓ Contrato renovado com sucesso.", "Jogo gravado na nuvem."
- **Ação destrutiva pede confirmação digitada.** Apagar save pede o nome do
  clube; apagar conta pede a palavra APAGAR. Nunca só um botão vermelho.
- **Atalhos de valor** no lance do leilão (+25 mil / +50 mil / +100 mil) em vez
  de forçar digitação, e o cobrir lance mostra quantas vezes já cobriu (2 de 3).
- **Quando a ação não é possível, o diálogo oferece a saída** — "Caixa
  insuficiente" e "Não dá para renovar" listam de onde tirar o dinheiro, com o
  valor que cada opção libera.

**No app navegável** (`RetroFoot98 - App.dc.html`) as três galerias ficam na
seção DIÁLOGOS E CONFIRMAÇÕES do menu lateral.

### 20. Mapa de interações — o que cada botão faz

Os diálogos da seção 19 estão **ligados dentro das próprias páginas**. Abrir
qualquer arquivo abaixo e clicar num botão abre o diálogo real, com fundo
escurecido e fechamento pelo backdrop.

**Formação** (`Hub do Time - Sidebar Recolhida`, `Hub do Time - Sidebar`)

| Elemento | Ação |
|---|---|
| Chips F1–F8 de formação | troca a escalação no campo, sem diálogo |
| Chips de competição na tabela | troca a tabela com transição, sem diálogo |
| Ver tabela completa… | abre **Classificação completa** — 11 posições, seletor dos 8 grupos, legenda de zonas |
| ⚽ Jogar | vai para a partida ao vivo |
| Recolher menu | alterna a sidebar entre 224px e 62px |

**Mercado** — 25 botões ligados a 9 diálogos

| Botão | Aba | Diálogo |
|---|---|---|
| Propor | Comprar | Proposta por um jogador |
| Dar lance | Leilão | Lance no leilão |
| Cobrir | Leilão | Cobrir o lance do rival |
| Aceitar | Propostas | Aceitar a venda |
| Recusar | Propostas | Recusar a proposta |
| Contrapropor | Propostas | Contraproposta |
| Subir | Contrapropostas | Contraproposta |
| Fechar | Contrapropostas | Resultado — negócio fechado |
| Listar | Vender | Listar para venda |

**Elenco & Base** — 11 botões ligados a 7 diálogos: Renovar contrato…,
Listar para venda, Promover (base), Ver (base), Tirar (treino).

**E-mail** — Responder abre a composição com as três posturas; Arquivar abre a
confirmação.

**Treinador** — Encerrar a carreira abre a confirmação destrutiva.

**Configurações** — 10 botões: Gravar agora, Voltar aos saves, Apagar este save,
Sair da sala, Trocar a senha, Apagar a conta, Sincronizar agora, Começar outro
save, Sair da conta.

**Como a camada foi montada** (o padrão a reproduzir em código):

```js
// estado
state = { tab: 0, dlg: -1 };

// renderVals
vals.dlgLayer = this.state.dlg < 0
  ? { display: 'none' }
  : { position:'fixed', inset:0, zIndex:90, display:'flex',
      alignItems:'flex-start', justifyContent:'center',
      padding:'48px 20px', overflow:'auto', animation:'dlgIn .2s ease' };
vals.closeDlg = () => this.setState({ dlg: -1 });
for (let k = 0; k < N; k++) {
  vals['open' + k] = () => this.setState({ dlg: k });
  vals['dlg' + k] = this.state.dlg === k
    ? { position:'relative', display:'flex', justifyContent:'center', width:'100%',
        animation:'dlgUp .24s ease' }
    : { display: 'none' };
}
```

Três regras da camada:

1. **Todos os diálogos existem no HTML ao mesmo tempo** — só a visibilidade muda.
   Nada é montado por JS, então o conteúdo é editável e indexável.
2. **O backdrop fecha** (`rgba(11,26,18,.42)`), e a janela entra com
   `dlgUp .24s` — deslocamento de 10px e escala de .985, nada mais.
3. **O diálogo alinha ao topo** (`align-items:flex-start` com 48px de padding),
   não ao centro: diálogos altos como a classificação completa rolam junto com a
   página em vez de estourar a viewport.

**App navegável** — `RetroFoot98 - App.dc.html` é o ponto de entrada: menu
lateral com os 8 destinos, a seção DURANTE O JOGO com as sobreposições e fluxos,
a seção DIÁLOGOS E CONFIRMAÇÕES com as três galerias, alternância
desktop/mobile e "abrir só esta tela" em aba nova.

### 21. As 11 ações que faltavam (leva 7)

Cobre o documento das ações pendentes. Três decisões tomadas antes de desenhar:

1. **"Sair para o menu" e "Sair deste save" são a mesma tela.** Uma só —
   `Acoes - Sistema e Conta` ▸ *Sair do save*. Chame do menu e de Configurações.
2. **Apagar save é a mesma tela nos dois contextos** (lista de saves e
   Configurações). Não há desenho novo — só o segundo gatilho.
3. **"Chamar pra Resenha" não cabe num diálogo.** São quatro blocos de acção —
   virou tela cheia: `Chamar pra Resenha.dc.html`.

| Tela | Onde fica | Arquivo |
|---|---|---|
| Opções · Geral | Configurações ▸ Opções | `Acoes - Opcoes e Estadio` #1 |
| Opções · Jogo | Opções ▸ aba Jogo | `Acoes - Opcoes e Estadio` #2 |
| Opções · ajuste bloqueado | Resenha, quem não é anfitrião | `Acoes - Opcoes e Estadio` #3 |
| Histórico do clube · vazio | clique na linha da tabela | `Acoes - Opcoes e Estadio` #4 |
| Histórico do clube · cheio | clique na linha do seu clube | `Acoes - Opcoes e Estadio` #5 |
| Construir arquibancada | Finanças ▸ Estádio | `Acoes - Opcoes e Estadio` #6 |
| Recusa · cota da temporada | ao passar de 10.000 lugares no ano | `Acoes - Opcoes e Estadio` #7 |
| Recusa · tecto do porte | ao passar do tecto do clube | `Acoes - Opcoes e Estadio` #8 |
| Recusa · caixa insuficiente | ao construir sem caixa | `Acoes - Opcoes e Estadio` #9 |
| Chamar pra Resenha | Configurações ▸ Modo Resenha · barra do clube · Partida ao Vivo | `Chamar pra Resenha` |
| Avançar temporada · acesso | Competição ▸ Visão geral, no fecho | `Avancar Temporada - Acesso` |
| Avançar temporada · rebaixado | idem | `Avancar Temporada - Rebaixado` |

**Opções são exactamente oito ajustes**, em duas abas. Geral: chicotadas
psicológicas (Nunca / Dos humanos / De todos), sorteio da taça (Nunca / Com
humanos / Sempre), gravar o jogo (Nunca / 3 em 3 / Sempre), som, salvamento
automático, voltar a um ponto guardado (linha com **botão**, não interruptor).
Jogo: substituições ao intervalo, desempates por penalties, tempo de jogo
(Curto / Médio / Longo / Ultrassónico). **Não acrescente volume, idioma, tema,
notificações, privacidade ou conta** — o jogo não tem nada disso.

**O ajuste bloqueado tem desenho próprio:** cartão com borda tracejada, fundo
`#f7f9f7`, rótulo em cinza com 🔒, o segmento inteiro em cinza-claro e
`cursor:not-allowed`, e a explicação de quem decide ("quem define o tempo de
jogo é o Anfitrião").

**O estado vazio do histórico é o caso principal**, não a excepção — o utilizador
clica em qualquer linha e quase sempre não comandou aquele clube. A tela explica
*por quê* está vazio, em duas frases: o histórico é só das temporadas dele, e o
mundo do jogo começou em 2026. Nunca "sem dados".

**A obra do estádio comunica as três regras do motor** numa lista no pé do
diálogo: 5.000 lugares por bancada, 10.000 por temporada, tecto por porte do
clube. Cada recusa tem diálogo próprio porque a saída é diferente — esperar a
temporada, ganhar título, arranjar dinheiro. **A receita futura da bancada não
existe** no motor: o rodapé diz "mais lugares rendem mais bilheteria nos jogos em
casa" e nunca um valor previsto.

**Chamar pra Resenha** dá peso ao link (cartão com borda azul de 2px e etiqueta
MAIS RÁPIDO); WhatsApp e e-mail vêm abaixo com o mesmo formato campo+botão, o
`+55` fixo à esquerda separado por um filete. À direita, o código para digitar à
mão, a nota de que **o clube do convidado é sorteado**, e quem já está na sala.
Sem lista de amigos e sem histórico de convites — são três canais, ponto.

**Avançar temporada são duas telas, não uma com condicional.** Acesso e
rebaixamento partilham a estrutura mas invertem tudo o que carrega emoção: o
troféu vem a 104px e colorido no acesso, a 84px em cinza no rebaixamento; o
filete lateral é verde ou vermelho; "o que muda em 2027" lista ganhos ou perdas
nas mesmas quatro linhas (divisão, copa, cotas de TV, mercado). Nenhuma das duas
promete renovação de contrato, metas da direcção ou orçamento — a temporada nova
começa com o que ficou.

**Item 8 do documento — "Voltar ao hub" na classificação de copa — não recebeu
tela.** É navegação pura: deve levar à Formação. A correcção é técnica.

**Itens 9–11 — os três botões dos modais de emprego** ("Recusar o convite",
"Aceitar o jantar", "Agradecer e ficar") continuam no padrão dos diálogos já
implementados. Não precisam de desenho novo.

**Ligações já feitas nas páginas:** Finanças ▸ Estádio → as três obras abrem
Construir bancada e as recusas; Configurações ▸ Opções → "⚙️ Abrir opções do
jogo" abre Opções · Geral.

---

## Regras que não podem ser quebradas

1. **Grafia lusitana proposital**: "Selecção", "Seleccionar", "Selecciona", "equipa", "à espera". Não corrigir.
2. **Densidade de dados**: nunca corte colunas para "dar respiro". Ajuste hierarquia, não conteúdo.
3. **Números sempre em IBM Plex Mono**, alinhados à direita em tabela.
4. **Georgia só no nome do treinador**, um uso por tela.
5. **Emoji é o sistema de ícones.** Não introduza biblioteca de ícones. Emoji não aceita `color` — quando precisar de um ícone colorido (o do estádio, por exemplo), desenhe em CSS.
6. **Sem gradiente decorativo.** Os únicos gradientes são a faixa do clube, as faixas do gramado e a barra de moral.
7. **Sem bisel, sem sombra em botão.** Elevação é hairline + raio; sombra só no shell, no gramado e nas camisas.
8. **A publicidade sai antes do conteúdo** quando a tela encolhe: ≤1560px some o trilho direito, ≤1320px somem os dois.
9. **Escudos**: `<img>` do arquivo real, com badge de iniciais nas cores do clube como fallback — o mesmo comportamento de `clubCrestHTML()`.

---

## Checklist de aceite

- [ ] Tokens carregados e `--club-primary`/`--club-secondary` trocando por clube
- [ ] Nenhum bisel de 2px restante no CSS
- [ ] Sidebar colapsa e expande, com o estado persistido
- [ ] Campo com 470×585 em qualquer largura de janela e com a sidebar em qualquer estado
- [ ] As 7 páginas navegáveis pela sidebar, com as abas internas funcionando
- [ ] Popups só para acontecimentos; nenhum item de menu abrindo modal
- [ ] `toastC()` com os 5 tons
- [ ] Mobile: barra inferior, campo preservado, popup em bottom sheet
- [ ] Grafia "Selecção/Seleccionar" intacta
- [ ] Nenhum rótulo quebrando em duas linhas (todo rótulo de coluna, chip e contador leva `white-space:nowrap`)
- [ ] Onboarding com os 7 passos, mobile inclusive, e o Modo Resenha marcado EM BREVE
- [ ] Sorteios com o painel do troféu e a barra de progresso; no mobile, navegação por fase
- [ ] Chat em silêncio durante a partida ao vivo; no mobile, item de barra e folha de baixo

---

## Onde mexer no código atual

| O quê | Arquivo | Referência |
|---|---|---|
| Menu principal → sidebar | `main.js` `clMenuHTML()` ~8937 | Hub - Sidebar |
| Formação e atalhos F1–F6 | `main.js` `FORMATIONS`/`FKEY` ~140 | Hub |
| Camarote | `main.js` `camaroteHTML()` ~6842 | Modo Camarote |
| Barra de pressão | `main.js` `camPressureHTML()` ~6929 | Modo Camarote |
| Estatísticas do Camarote | `main.js` `camStatsHTML()` ~6963 | Modo Camarote |
| Estádio | `main.js` `renderStadium()` ~10737 | Finanças ▸ Estádio |
| Escudos | `data/club-crests-brasil-lower.js` | todas |
| Fotos de estádio | `public/img/estadios/` | Modo Camarote, Finanças |
| CSS base | `public/src/styles/main.css` | tokens/ |
| Convite de emprego | `main.js` `showJobInvite()` | Modal - Convite para Jantar |
| Proposta de emprego | `main.js` `showJobProposal()` | Modal - Jantar e Proposta |
| Sorteios | `main.js` `drawGroups()` / `drawKnockout()` | Sorteio 1–6 |

---

## Como trabalhar

Faça **uma tela por vez**, na ordem: tokens → componentes base → Hub → Mercado → Campeonatos → Finanças → Elenco & Base → Treinador → Clube & Sistema → Onboarding → Sorteios → Chat → Landing. Depois de cada uma, compare lado a lado com o HTML de referência antes de seguir.

Não invente telas que não estão no pacote. Se faltar alguma coisa, pergunte.
