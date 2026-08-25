# Modo Solo — o fluxo completo até a temporada começar

22 arquivos de tela: 11 telas, cada uma com o par `- Mobile.html` em
390px. Abra qualquer `.html` direto no navegador — sem servidor, sem build.

Este pacote cobre **só o Modo Solo**, do login até a última tela antes do primeiro
jogo. Nada de Modo Resenha aqui: criar sala, convites, número de treinadores,
escolha dos clubes e lobby ficaram de fora de propósito.

---

## A sequência

| # | Tela | O que faz |
|---|---|---|
| 1 | Onboarding 1 - Entrar | e-mail ou Google; acordeão com os saves gravados |
| 1b | Conta - Recuperar Senha | desvio do passo 1, quando esquece a senha |
| 2 | Onboarding 2 - Modo | Solo ou Resenha — daqui em diante, só Solo |
| 2b | Onboarding 2b - Solo Comecar | a bifurcação do Solo, com atalho para os 3 saves recentes |
| 2c | Fluxo - Continuar Save | só quem escolheu Continuar — os 16 saves na nuvem |
| 3 | Onboarding 3 - Pais e Ligas | país e divisão de entrada, numa tela |
| 3a | Fluxo - Pais Jogavel | variante em que país e divisão são passos separados |
| 4 | Fluxo - Escolha de Moeda | real, euro ou dólar — vale para salários e caixa |
| 5 | Fluxo - Carregando | monta divisões, elencos e calendário |
| 6 | Onboarding 6 - Sorteio do Clube | o clube sai no sorteio, com elenco e caixa |
| 7 | Onboarding 7 - Boas-vindas | última tela antes da temporada: estádio, vídeo, indicadores, tabela e recado da diretoria |

**Caminho de quem começa do zero:**
1 → 2 → 2b → 3 → 4 → 5 → 6 → 7 → primeiro jogo

**Caminho de quem retoma:**
1 → 2 → 2b → (atalho do save recente, ou 2c para a lista) → direto ao Hub

Os passos **Sala** e **Convites** da trilha do topo continuam visíveis em cinza no
Solo, mas são saltados — a trilha não muda de tamanho entre os modos.

---

## Duas telas que se sobrepõem — escolha uma

**3 · Onboarding 3 - Pais e Ligas** e **3a · Fluxo - Pais Jogavel** resolvem o
mesmo passo de formas diferentes:

- **Onboarding 3** junta país e divisão numa tela só — menos cliques, e é a que o
  fluxo novo usa.
- **Fluxo - Pais Jogavel** mantém a separação do jogo atual (`scPaisJogavel()` em
  `public/src/ui/main.js:2139`), com a divisão vindo depois.

Implemente a **Onboarding 3** e descarte a 3a, a menos que queira manter a
separação por algum motivo de produto. As duas estão no pacote para você comparar.

---

## Onde cada tela entra no código

| Tela | Substitui em `public/src/ui/main.js` | `CL.screen` |
|---|---|---|
| Onboarding 1 - Entrar | `scLogin()` | `login` |
| Conta - Recuperar Senha | `scResetPassword()` 1689 | `resetpassword` |
| Onboarding 2 - Modo | `scModo()` | `modo` |
| Onboarding 2b - Solo Comecar | `scModoSolo()` 1882 | `modosolo` |
| Fluxo - Continuar Save | `scModoSolo()` 1882 (a lista) | `modosolo` |
| Fluxo - Pais Jogavel | `scPaisJogavel()` 2139 | `paisJogavel` |
| Fluxo - Escolha de Moeda | `scMoeda()` 2165 | `moeda` |
| Fluxo - Carregando | `scLoading()` 2185 | `loading` |
| Onboarding 6 - Sorteio do Clube | `scSorteio()` | `sorteio` |
| Onboarding 7 - Boas-vindas | — (tela nova) | — |

Atenção ao `scModoSolo()`: **duas** telas cobrem essa função. A 2b é a escolha
(novo × continuar, com os 3 saves recentes como atalho); a Continuar Save é a lista
completa. Não troque uma pela outra.

---

## O envelope

Todas usam `build/wizard.js` → `wiz()`: trilha de passos numerada no topo (feito =
verde com ✓, atual = azul cheio, futuro = cinza), conteúdo num card branco de raio
18px sobre fundo `#e8f0e7`, e a ação principal no rodapé à direita.

No mobile a trilha vira barra de progresso de 6 segmentos no cabeçalho azul, e a
ação principal fica `position:sticky` no pé da tela.

**Tela 5 (Carregando) não tem ação** — ela avança sozinha quando o save termina de
montar.
