# RetroFoot98 — Design System 2026

Sistema visual do rebranding do RetroFoot98, o jogo de gestão de futebol em português brasileiro (na linhagem do Elifoot 98). O jogo é o mesmo: você é o treinador, escala o time, negocia jogadores, cuida do caixa e briga para subir de série. O que muda é a pele.

Este sistema substitui a estética de janelas do Windows 98 (bisel 3D, barra de título azul-marinho, fundo verde-feltro cheio) por uma **superfície clara, cantos arredondados e densidade de tabela preservada**. A estrutura do jogo não mudou — o elenco continua listado por posição com força, energia, salário e valor; o campo continua mostrando o onze; as competições continuam nas mesmas abas.

**Origem:** a identidade foi decidida na tela do elenco (o "Hub do time"), iterada ao vivo com o usuário e aprovada na versão `3a` de `Rebranding Elenco.dc.html`, na raiz deste projeto. Essa tela é a fonte da verdade — todo token aqui foi extraído dela.

**Fontes lidas:**
- `Rebranding Elenco.dc.html` (raiz) — as três rodadas de exploração; `3a` é o layout final.
- Pasta local `Elifoot/` — o app em produção (`public/index.html`, `public/src/ui/main.js`, dados de clubes e escudos em `public/src/data/`), de onde vieram formações, atalhos F1–F6, nomes de menu e a grafia lusitana.
- `Elifoot/screenshots-atual/` — as telas do jogo hoje (elenco, formação, jogo, jogador).
- Design system anterior: projeto `RetroFoot98 Design System` (`_ds/` neste projeto), que documenta a pele Windows 98.

---

## O que mudou em relação à pele antiga

| Antes (Win98) | Agora (2026) |
|---|---|
| Bisel 3D de 2px em tudo | Superfície branca com hairline de 1px e raio 18px |
| Fundo verde-feltro cheio | Verde-claro neutro `--surface-desk` como mesa, cards brancos por cima |
| Barra de título azul-marinho | Faixa do clube com as cores do time |
| Cantos quadrados por padrão | Cantos arredondados por padrão |
| Cinza-chrome nos botões | Amarelo do clube na ação principal, branco com borda no resto |
| Verde dominante | Verde só no gramado e nas superfícies neutras |

O que **não** mudou e não deve mudar: densidade de dados, tabelas sem linhas de grade, números em mono alinhados à direita, e a voz do jogo.

---

## CONTENT FUNDAMENTALS

Voz de torcedor brasileiro explicando a tela para um amigo. Nunca manual de produto, nunca corporativo.

- **Idioma:** português do Brasil, segunda pessoa, informal — o jogo fala com **você**.
- **Tom:** direto, sem enfeite. Frases curtas. **Imperativo** quando instrui ("Escolha a tática no menu Seleccionar primeiro."); **factual** quando reporta ("Jogo gravado na nuvem.", "Times sorteados!").
- **Futebolês de verdade:** "arrematado no leilão", "titulares marcados com T na lista", "à espera dos treinadores", "onze 11/11".
- **Reticências para processo** ("Conectando…", "Carregando jogo…") e para itens de menu que abrem diálogo ("Classificação…", "Ver tabela completa…", "Calendário…"). Rótulo sem reticências executa a ação na hora.
- **Números por extenso na prosa, mono nas colunas.** "Dinheiro em caixa: 1 milhão e 271 mil reais" em texto corrido; `R$ 1.271.000` na tabela.
- **Emoji como glifo funcional, com parcimônia:** ⚽ no botão de jogar, 🟢 na janela aberta, 💾 em gravar, 🔨 em leilão, ⚠ em avisos, ✓ em confirmações. Não decoram cada linha.

### A grafia proposital — NÃO "corrigir"
O jogo usa grafia europeia em termos específicos, como homenagem ao Elifoot: **"Selecção", "Seleccionar", "Selecciona"** (com **cç**), além de "equipa", "à espera", "guardadas". Mantenha.

### Nunca
Voz motivacional ou de produtividade ("desbloqueie", "otimize sua experiência"). Se a frase parece de app de produtividade, está errada.

---

## VISUAL FOUNDATIONS

### Cores
Duas famílias que nunca se misturam:

1. **Cores do clube** (`--club-*`) — variam por time, lidas de `color`/`color2` no banco de clubes. Uma primária (corpo da camisa, faixa do topo, valores em destaque, chip ativo) e uma secundária (gola e mangas da camisa, botão Jogar, filete da faixa, número nas costas). Os tokens padrão trazem o XV Piracicaba: `#17458F` e `#F2B90C`.
2. **Cromo neutro** (`--surface-*`, `--line-*`, `--text-*`) — **verde-claro, igual para todos os clubes**. `--surface-desk #e8f0e7` é a mesa; cards são brancos; linhas são hairlines verdes bem claras. Isso foi decidido explicitamente: o cromo não segue o clube, só o conteúdo do clube segue.

Além disso: escala de energia vermelho→verde (`--energy-20` a `--energy-100`), zonas de tabela (acesso verde, neutro cinza, rebaixamento vermelho) e o gramado (`--pitch-1`/`--pitch-2`).

**Nunca** invente uma terceira paleta "mais moderna", nem use gradiente decorativo. Os únicos gradientes são funcionais: a faixa do topo (`--club-primary-deep` → `--club-primary`) e as faixas do gramado.

### Tipografia
Três famílias, sem exceção:
- **Space Grotesk** — interface inteira. Peso carrega hierarquia: 700 em títulos e destaques, 600 em valores, 500 em linhas de lista.
- **IBM Plex Mono** — todo número: força, energia, valores, pontos, datas, atalhos F1–F6, cabeçalhos de coluna. Sempre alinhado à direita em tabela.
- **Georgia itálico/regular** — resquício retrô, um único uso por tela: o nome do treinador. Não use serifa em mais nada.

Rótulos de seção são `--fs-label` (10px), 700, `letter-spacing:.12em`, maiúsculas, cor `--text-muted`.

### Espaçamento e densidade
Densidade é característica, não defeito. Este público quer tabela, estatística e dinheiro na tela. Ajuste hierarquia e respiro, **nunca corte dados**. Padding de card 16px, linha de tabela 6–7px vertical, gap de grade 14px.

### Layout
Grade de duas colunas dentro de um shell de 1280px: **530px fixos** à esquerda (elenco, moral, classificação) e `minmax(0,1fr)` à direita (campo, formações, adversário). A coluna direita precisa de `min-width:0` para o campo encolher em vez de empurrar. As duas colunas terminam alinhadas: um card de cada lado leva `flex:1` para absorver a folga.

Menu único no topo, com ícone e rótulo por item, chip ativo em azul cheio. Nunca duplique navegação numa segunda barra lateral.

### Fundos
Sem imagem, textura ou padrão de fundo. As duas exceções, ambas dentro do campo: as **faixas horizontais de grama** (`repeating-linear-gradient`, dois tons) e o **escudo em marca-d'água** a 8–10% de opacidade atrás dos jogadores.

### Cantos, bordas e elevação
Raio por escala: shell 24px, card 18px, bloco interno 14px, controle 12px, chip 10px, linha de tabela 9px, tag 6px, pílula 99px. Borda é sempre hairline de 1px; **não existe bisel**. Sombra só no shell (`--shadow-shell`), no gramado (sombra interna nas bordas) e nas camisas (`drop-shadow`) — nunca em botão ou campo de formulário.

### Estados
- **Hover:** fundo vai para `--surface-sunken`; linha de tabela vai para o mesmo tom. Botão amarelo clareia para `--club-secondary-hover`.
- **Ativo/selecionado:** chip com fundo `--club-primary` e texto branco; linha do seu time com fundo `--surface-row-active` e nome em 700.
- **Pressionado:** sem afundar, sem bisel — só o hover mais escuro.
- **Desabilitado:** texto `--text-faint`, sem cursor.

### Movimento
Mínimo e funcional. Transição de `background`/`color` em 180ms nos chips e linhas; troca de competição faz um `fade-up` de 320ms (`ds-fade-up`); o botão Jogar tem um pulso lento (`ds-cta-pulse`, 2,4s) que **para no hover**. Sem bounce, sem loop decorativo, sem parallax.

### Transparência e blur
Sem blur em lugar nenhum. Transparência só sobre o azul do clube (`rgba(255,255,255,.09)` na mini-tabela do adversário) e sobre o gramado (linhas do campo e sombra do texto dos jogadores).

---

## ICONOGRAPHY

- **Emoji nativo é o sistema de ícones**, herdado do jogo: ⚽ 👥 👤 🏆 🏠 🥅 💰 ✉️ 🛡️ 🎓 💾 🟢 🟩 🔨 ⚠ ✓ 🔄. Sem icon font, sem biblioteca SVG, sem set customizado.
- **Escudos de clube** vêm de arquivo (`club-crests-*.js` no jogo aponta para URLs remotas). Quando o arquivo não carrega, o fallback é o **badge de iniciais** nas cores do clube — comportamento que o jogo já tem em `clubCrestHTML()`. O componente `ClubBadge` implementa os dois casos.
- **Camisas e coletes são desenhados com CSS** (divs posicionadas), não SVG: corpo na primária, gola e mangas na secundária, número nas costas. O reserva usa a mesma camisa com colete na secundária por cima.
- Não desenhe ícones novos em SVG. Precisando de um glifo, use emoji coerente com a lista acima.

---

## Publicidade e responsividade (regra para todas as telas)

Toda tela nova nasce pronta para implementação em várias resoluções e com o inventário de publicidade previsto:

- **Topo:** banner de 970×90 acima da faixa principal da tela.
- **Laterais:** dois trilhos de 160×600, `position:sticky`, fora da coluna de conteúdo (`max-width` 1180px no miolo, 1560px no envelope).
- **Rodapé:** faixa fixa de 320×50.
- **Dentro do jogo:** placas ao redor do campo (`AdBoard`), o único lugar onde publicidade encosta no conteúdo.

Ordem de sacrifício quando a tela encolhe — a publicidade sai antes do conteúdo:

| Largura | Comportamento |
|---|---|
| ≤1560px | some o trilho da direita |
| ≤1320px | somem os dois trilhos |
| ≤1024px | o cabeçalho quebra em duas linhas; o relógio vai para o fim |
| ≤760px | banner do topo vira 100px de altura; o CTA principal ocupa a linha inteira |

**Media query é a única exceção à regra de estilo inline.** Ela não existe em atributo `style`, então mora num bloco `<style>` no `<helmet>`, sempre atrelada a atributos `data-*` (`[data-ad-rail]`, `[data-live-header]`), nunca a classes de componente.

## Página ou popup — a regra de decisão

**Página** = tudo que é destino de menu. Abre no mesmo envelope da tela de Formação (faixa do clube, menu único no topo, publicidade lateral, área central de duas colunas), com URL própria e histórico de navegação.

Viram página: Opções, Gravar jogo, Estádio, Historial, Vender, Comprar jogador, Propostas recebidas, Contrapropostas, Leilão de jogadores, Base, Treino especial, Últimas transferências, Minhas competições, Melhores marcadores, Calendário, Últimos vencedores, Melhores marcadores de sempre, Ligas internacionais, História do treinador, Sala de Troféus, Ranking, Ofertas, Perfil, Finanças, E-mail, Adversário.

**Popup (`Dialog`)** = o que **acontece** no meio do save e precisa de leitura ou decisão na hora. O jogador não foi procurar — a coisa veio até ele.

Viram popup: oferta de emprego de outro clube, título conquistado e celebrações, artilharia e prêmios de fim de temporada, leilão encerrado, proposta recebida por um jogador seu, lesão grave, demissão iminente, convite para Resenha, confirmações destrutivas (vender, demitir, sair sem gravar).

Na dúvida: **se está no menu, é página; se apareceu sozinho, é popup.**

## Avisos (`Toast`)

Aviso passageiro, um por vez, empilhado no rodapé central, sem exigir clique. Cinco tons, cada um com glifo fixo:

| Tom | Glifo | Quando | Exemplo |
|---|---|---|---|
| `success` | ✓ | confirmação | "Jogo gravado na nuvem." |
| `warn` | ⚠ | impedimento contornável | "Caixa insuficiente para renovar este contrato." |
| `danger` | ✖ | regra violada | "Máximo de 3 substituições." |
| `progress` | — | processo em curso, reticências | "Conectando…" |
| `info` | livre | fato do jogo, aceita ação à direita | "🔨 Kaique arrematado por 120 mil." + *Ver* |

Fundo escuro `#12201a` (ou azul do clube no `info`), filete de 4px à esquerda na cor do tom, texto branco, raio 12, sombra baixa, entrada com `ds-fade-up`. Uma frase só, na voz do jogo. **Toast nunca pede decisão** — decisão é `Dialog`.

## Index

- `styles.css` — ponto de entrada (só `@import`).
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `shape.css`, `motion.css`.
- `guidelines/` — cards de especímen (cores, tipo, espaçamento, marca, gramado).
- `components/brand/` — `ClubBadge`, `ClubHeader`.
- `components/core/` — `Button`, `Chip`, `Card`, `SectionLabel`, `MenuBar`.
- `components/feedback/` — `Toast`, `Dialog`.
- `components/data/` — `StatBar`, `EnergyBar`, `StandingsTable`, `SquadTable`.
- `components/game/` — `Jersey`, `Pitch`, `AdBoard`, `BenchList`, `FormationGrid`, `OpponentCard`.
- `ui_kits/hub/` — recriação da tela principal (Hub do time), o layout `3a` aprovado.
- `SKILL.md` — wrapper compatível com Agent Skills.

## Intentional additions

Nenhuma. Todo componente aqui existe na tela aprovada `3a` ou no jogo em produção. `Chip` cobre três usos que já existiam (formação com atalho, competição, status) em vez de virar três componentes.

## Caveats

- As fontes vêm do Google Fonts por `@import`. Se o RetroFoot98 tiver arquivos próprios, troque `tokens/fonts.css` por `@font-face` locais.
- Os escudos reais dependem de URLs externas (Transfermarkt) que não carregam em preview offline; o sistema entrega o fallback de iniciais.
- As cores de clube nos tokens são as do XV Piracicaba. Cada clube sobrescreve `--club-primary` / `--club-secondary` no escopo da tela.
