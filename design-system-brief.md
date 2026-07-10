# RetroFoot98 — Design System Brief

## O que é

RetroFoot98 é um jogo de futebol de gerenciamento (estilo Elifoot 98 / Championship Manager clássico), 100% web, com estética **retrô/vintage de desktop Windows 98** — janelas com bordas 3D chanfradas, barra de título azul-marinho, botões cinza "chrome" com efeito de pressionar. É um app real em produção (não mockup), hoje implementado como uma única página HTML/CSS/JS vanilla (sem framework de componentes).

**Objetivo deste documento:** servir de referência para gerar um design system a partir do estilo visual já existente do app — cores, tipografia, componentes e padrões de layout extraídos diretamente do código de produção.

---

## 1. Identidade visual

- **Nome da marca:** RetroFoot98
- **Logo:** escudo/brasão em pixel art, bola de futebol no topo, faixa preta central com "RETROFOOT98" (RETRO+FOOT em branco, "98" em dourado/laranja), fundo listrado em verde, estrela branca na base. Arquivo: `logo.webp` (500×500, fundo transparente).
- **Badges de feature** (mesmo estilo de escudo pixel art, cada um com um ícone temático + texto): `badge-clubes.webp`, `badge-liga.webp`, `badge-chat.webp`.
- **Favicon/app icon:** a mesma logo, usada também como ícone de 18×18 na barra de título superior das páginas públicas.

## 2. Paleta de cores

### Tokens principais (CSS custom properties já definidos no código)

| Token | Hex | Uso |
|---|---|---|
| `--felt` | `#2f8f2f` | Verde "gramado" — cor de fundo predominante do app inteiro (como o feltro de uma mesa/campo) |
| `--navy` | `#000080` | Azul-marinho — barras de título, janelas de diálogo, destaques de texto/seleção |
| `--chrome` | `#c0c0c0` | Cinza "Windows 98" — fundo de botões e painéis neutros |
| `--yellow` | `#ffff00` | Amarelo puro — texto de destaque, títulos, links ativos |
| `--yellowlite` | `#ffff66` | Amarelo claro — variação de destaque |
| `--bluetxt` | `#3a3ad6` | Azul-texto — links e nomes de adversário/clube |
| `--bevL` | `#ffffff` | Bisel claro (luz) — topo/esquerda de bordas 3D "para fora" |
| `--bevL2` | `#dfdfdf` | Bisel claro secundário |
| `--bevD` | `#808080` | Bisel escuro (sombra) — base/direita de bordas 3D |
| `--bevD2` | `#000000` | Bisel escuro secundário (contorno externo) |

### Cores funcionais / semânticas

| Cor | Hex | Uso |
|---|---|---|
| Verde sucesso | `#0b7a2f` / `#0a7a2f` / `#1a8f3c` | Ações positivas, badge "100% Online", botões "ok" |
| Verde-claro texto | `#eaffea` / `#cfe6cf` / `#9fe89f` | Texto secundário sobre fundo verde |
| Vermelho erro/cancelar | `#c00` / `#e21c1c` / `#c0392b` | Ações destrutivas, cancelar, alertas |
| Dourado/laranja | `#cc9a1a` / `#e67e22` | Zona de classificação secundária (ex: Sul-Americana), "98" da logo |
| Cinza texto | `#666` / `#888` / `#999` / `#aaa` | Texto terciário, desabilitado |
| Branco / Preto | `#fff` / `#000` | Texto base sobre fundo escuro/claro |

**Observação de uso:** o app usa fundo verde (`--felt`) como padrão em quase todas as telas públicas; janelas de diálogo têm fundo próprio por contexto — verde (`cl-body-green`, ações principais), amarelo pastel `#ffffcc` (`cl-body-yellow`, sorteios/leilões), ou cinza chrome (`cl-body-gray`, opções/configurações/formulários neutros).

## 3. Tipografia

| Token | Fontes | Uso |
|---|---|---|
| `--sans` | Tahoma, "Segoe UI", Arial, sans-serif | Fonte padrão de toda a UI (texto, botões, formulários) — reforça a estética Windows 98 |
| `--serif` | Georgia, "Times New Roman", serif | Uso decorativo: nome do técnico/manager, títulos hero (itálico, negrito) |
| `--mono` | Consolas, "JetBrains Mono", monospace | Números: placares, dinheiro, estatísticas, código de sala, cronômetro — sempre que precisão numérica/alinhamento tabular importa |

**Escala de tamanho observada:** 11px (rótulos mínimos) → 13-15px (corpo/padrão) → 20-30px (destaques, placares, nome do técnico) → 64px+ (não mais usado desde a v2 — hoje o hero é a imagem da logo, não texto).

**Peso:** a UI usa negrito (700-800) com frequência para hierarquia, já que não há muita variação de tamanho — o negrito é o principal recurso de ênfase.

## 4. Elevação e bordas — o elemento assinatura

Todo elemento "clicável" ou "em janela" usa o efeito clássico de **bisel 3D chanfrado** de UI de 1998:

```css
/* "para fora" (botão no estado normal, painel elevado) */
border: 2px solid;
border-color: var(--bevL) var(--bevD2) var(--bevD2) var(--bevL);
/* topo/esquerda claros, base/direita escuros = luz vindo de cima-esquerda */

/* "pressionado" (:active, ou painel "afundado") */
border-color: var(--bevD2) var(--bevL) var(--bevL) var(--bevD2);
/* inverte — topo/esquerda escuros = luz "presa" embaixo */
```

Isso é usado em: botões, inputs, janelas de diálogo, badges pequenos. É o principal diferenciador visual do produto — **qualquer novo componente deve manter esse padrão de bisel**, não usar `box-shadow` suave nem `border-radius` grande (exceção: badges/pills modernos, ver seção 6.4).

## 5. Estrutura de janela (padrão de diálogo)

Praticamente toda a UI é composta de "janelas" flutuantes centralizadas sobre o fundo verde:

```
┌─────────────────────────────────┐  ← .cl-topbar (barra cinza, 26px, fixa no topo, ícone 18px + nome do app)
├─────────────────────────────────┤
│         [logo 140px, opcional]  │  ← só em páginas públicas, acima da janela
│  ┌───────────────────────────┐  │
│  │  Título da janela (navy)  │  │  ← .cl-dlg-title
│  ├───────────────────────────┤  │
│  │                           │  │  ← .cl-dlg-body (fundo verde/amarelo/cinza
│  │      conteúdo             │  │     conforme contexto)
│  │                           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

- Moldura externa (`.cl-dlg`) é sempre azul-marinho (`--navy`), 3px de padding, cantos retos (sem `border-radius`).
- Pode ter um **selo/badge circular-arredondado** flutuando no canto superior-esquerdo, sobrepondo a borda (usado para: troféu da competição em sorteios, ou pequeno selo da logo) — esse é o único lugar onde `border-radius` grande (12px) aparece.
- Em mobile (<760px), a janela vira 100% da largura da viewport, sem centralização.

## 6. Componentes principais

### 6.1 Botão (`.cl-btn`)
- Base: fundo `--chrome`, bisel 3D "para fora", `min-height:46px`, ícone (emoji, 20px) empilhado acima do texto (não lado a lado, por padrão).
- Variantes: `.cl-btn-ok` (ícone verde), `.cl-btn-cancel` (ícone vermelho), `.cl-btn-big` (56px, CTA principal), `.cl-btn-sm` (28px, compacto), `.cl-btn-mini` (ícone e texto lado a lado, ação secundária inline), `.cl-btn-wide` (largo, ação única centralizada).
- Estado pressionado: inverte o bisel (não usa mudança de cor).
- Estado desabilitado: texto cinza `#808080`, ícone com opacidade 0.4.

### 6.2 Badge/Selo (`.cl-dlg-badge`)
- Pílula branca com bordas 3D + `border-radius:12px`, flutuando sobre o canto da janela.
- Contém: ícone (30px, imagem de troféu ou logo) + texto curto em negrito.
- Única exceção deliberada ao "sem cantos arredondados" — usado para dar destaque extra (ex: qual competição está sendo sorteada).

### 6.3 Card de escolha (`.cl-mc-card`)
- Usado nas telas de decisão (Solo vs Resenha, Novo jogo vs Continuar): card 260px, fundo translúcido branco (`rgba(255,255,255,.1)`), borda 2px translúcida, `border-radius:12px`, hover realça borda para amarelo.
- Este é o componente "moderno" do sistema — mistura o vintage com um toque de UI atual (translucidez, hover suave).

### 6.4 Formulário / Input (`.cl-input`, `.cl-select`)
- Fundo branco, bisel 3D "para dentro" (invertido — afundado), sem `border-radius`, sem foco com glow — outline removido, foco visual vem do próprio bisel.
- Campos monetários (`.cl-money-field`) têm prefixo "R$" em verde-escuro e valor alinhado à direita em monospace.

### 6.5 Tabelas / Linhas de lista
- Sem bordas de grade tradicionais — linhas alternam fundo ou usam cor do clube como "stripe" lateral/fundo (`clubStripe()` — cor primária do time como fundo, cor secundária como texto, com contraste garantido automaticamente).
- Números sempre em monospace, alinhados à direita.
- Zonas de classificação (ex: vaga pra Libertadores/Sul-Americana) marcadas com barra lateral colorida de 4px + badge de texto.

### 6.6 Abas (`.cl-tab`)
- Aba ativa: fundo quase-preto (`#111`), sublinhado amarelo de 2px, texto branco. Inativa: texto cinza claro, sem fundo.

## 7. Iconografia

- **Emoji nativos** são usados como ícones em toda a UI (⚽ 👥 💬 🔴 🟢 ✔ ✖ 📤 💰 🔄 📅 ⏳), não há um icon set customizado — isso é intencional (leve, universal, combina com o tom "retrô/casual").
- **Imagens customizadas** só para: logo, badges de feature, e troféus de competição (arte pixel/ilustrada própria, não emoji) — esses sim merecem tratamento de asset real no design system.

## 8. Layout & responsividade

- Container raiz sempre centralizado (`flex; align-items:center; justify-content:center`) sobre fundo verde de tela cheia.
- Breakpoint único: **760px**. Abaixo disso: janelas viram full-width, grupos de botões empilham em coluna, tabelas reduzem fonte/colunas, botão de ação principal (ex: "Jogar") vira `position:fixed` no rodapé pra sempre estar alcançável sem rolar.
- Não há grid system formal — layout é feito com flexbox pontual por componente.

## 9. Tom & personalidade

- **Nostálgico, não datado**: referencia UI de 1998 de propósito (é o conceito central do produto), mas com toques modernos pontuais (glassmorphism leve nos cards de escolha, sombras suaves nos badges).
- **Denso mas organizado**: muita informação por tela (típico de jogos de gerência), organizada em janelas/abas bem definidas em vez de scroll infinito.
- **Brasileiro/futebolístico**: linguagem em PT-BR, referências a competições reais (Libertadores, Sul-Americana, Copa do Brasil, Séries A-D).

---

## Anexos recomendados junto com este documento

Ao anexar este briefing no Claude Design, inclua também:

1. **`logo.webp`** e os 3 badges (`badge-clubes.webp`, `badge-liga.webp`, `badge-chat.webp`) — em `public/img/`.
2. **Screenshots** (desktop + mobile) de: tela inicial (Acerca), Login, tela principal do time (hub logado), uma partida ao vivo, um modal de confirmação (ex: leilão), a tabela de classificação.
3. Opcional: o bloco de CSS `:root` (10 linhas, listado na seção 2) como texto solto, caso quiram os valores exatos sem precisar reextrair de screenshot.
