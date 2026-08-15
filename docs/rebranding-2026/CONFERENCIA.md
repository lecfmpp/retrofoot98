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
- [x] **Grade da tabela** restaurada para a literal do pacote
      (`20px 24px minmax(0,1fr) 26px 34px 34px 42px 46px 58px`)

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

### A corrigir
- [ ] **Tabela do Elenco no mobile.** O pacote reduz para **3 colunas** —
      JOGADOR · FRC · ENER. Hoje mostramos as 8 do desktop espremidas em 375px.

## 1.3 Formação — SIDEBAR RECOLHIDA
- [ ] Ainda não conferida.

---

# 2 · Mercado — a conferir
# 3 · Elenco & Base — a conferir
# 4 · Campeonatos — a conferir
# 5 · Treinador — a conferir
# 6 · Finanças — a conferir
# 7 · E-mail — a conferir
# 8 · Modo Resenha — a conferir (abas: Sala · Treinadores · Chat · Sair da sala)
# 9 · Configurações — a conferir (deve ficar só com Perfil · Opções)
# 10 · Sair do jogo — a conferir (abas: Gravar e sair · Outros saves · Apagar)
