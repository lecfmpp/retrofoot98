# V1 · Pacote de publicação (YouTube, 16:9)

**Marca:** RetroFoot (só RetroFoot neste vídeo).
**Base:** roteiro do V1 em `docs/conteudo/plano-conteudo.html` (parte 5, "O Elifoot da escola, refeito para 2026"),
atualizado para o produto de hoje (`docs/conhecimento/01-visao-geral-conta-planos.md`, `docs/plano-gratis-pro.md`).
**Status:** título A, capa EP. 01, sem preço e sem "Elifoot" aprovados pelo Leandro em 01/10/2026. Nada foi gravado, publicado nem agendado. Fluxo completo em `../FLUXO.md`.

> Convenção: tudo entre `[colchetes]` é número ou dado que o Leandro precisa preencher ou confirmar.
> Nenhum número de jogadores, vendas ou resultado foi inventado.

---

## 1. O que mudou em relação ao plano de conteúdo (e por quê)

O plano foi escrito quando o objetivo era a lista de espera. O produto mudou depois disso, e o roteiro
tinha de acompanhar. Mudei só o que estava desatualizado ou o que ajuda retenção/SEO:

| # | No plano | No pacote | Motivo |
|---|---|---|---|
| 1 | CTA: "lista de espera de 100 vagas" + barra de vagas no cartão final | CTA: **"a 1ª temporada é grátis; para seguir a carreira, Pro"** | A lista de espera está desligada desde 04/09/2026 (`RF_SO_LISTA=false`). O foco agora é conversão para o Pro. Prometer vaga que não existe seria falso. |
| 2 | Título "O Elifoot da escola, refeito para 2026" | Títulos com **"manager de futebol"**, sem dizer que é o Elifoot | O próprio site responde "O RetroFoot é o Elifoot? Não, é um jogo próprio" (`seo/pages.mjs`). Dizer "refeito" sugere ligação com marca de terceiro. "Elifoot" fica só como comparação falada/descrição — ver decisão D2. |
| 3 | "Países: Brasil e ligas europeias" | Só **Brasil** jogável; outros países aparecem "EM BREVE" | Trava `RF_SO_BRASIL` ligada. Mostrar a tela como ela é. |
| 4 | Modo Solo **ou** Modo Resenha | Mostrar o cartão do Modo Resenha com o selo **"Em breve"** e dizer "vem para quem é Pro" | Resenha está "Em breve" e será exclusivo do Pro no Beta. Não prometer data. |
| 5 | Gancho de 12 s só com rosto | Gancho de 30 s com **promessa + loop aberto** (o sorteio aparece girando mas o resultado só sai aos ~3:00) | Retenção: quem quer saber que clube saiu fica até o sorteio. |
| 6 | Sem menção ao jogo grátis até o fim | **CTA leve aos ~3:40**, logo depois do sorteio (pico de interesse), e CTA completo no fim | Quem sai no meio também leva o link. Uma frase, sem quebrar o ritmo. |
| 7 | Rodada ao vivo em silêncio por 10 s | Mantido, mas com **um narrador de placar** (texto na tela "4 divisões · 40 jogos ao mesmo tempo") | Silêncio funciona com o som do jogo por cima; o texto segura quem assiste sem áudio. |
| 8 | Fecho anuncia "tela de escalação na quinta" | Mantido (V2), mais a **tela final** apontando para o V2 e para o link | Série: cada vídeo empurra o próximo. |
| 9 | Texto em português europeu ("a rolar", "rato", "telemóvel") | Português do Brasil | Público do canal. |
| 10 | Duração 9–11 min | Alvo **9 min 30 s** (faixa 9–10:30) | Mesma faixa do plano; o trecho do menu foi encurtado em 30 s (era o ponto mais provável de queda). |

O que ficou igual: a regra "nada de tela sem cara, nada de cara sem tela", o formato 30/70 que muda
conforme o momento, a ordem das cenas (abertura → criar save → sorteio → entrada no clube → volta guiada →
rodada ao vivo → pedido) e as falas-sentido do plano.

---

## 2. Objetivo, público e duração

- **Objetivo do vídeo:** levar quem jogava manager de futebol nos anos 90/2000 a **começar uma carreira grátis**
  (1ª temporada no plano Peladeiro) e plantar a ideia do **Pro** — que é o que deixa a carreira continuar
  depois da 1ª temporada. A conversão para Pro acontece no jogo (paywall de fim de temporada, lembretes,
  e-mails); o vídeo abre a porta e explica a regra com honestidade.
- **Métrica principal:** cadastros com origem `YouTube` (canal calculado por `admin_rf98.origem_canal()`;
  `utm_source=youtube` cai em "YouTube") e, depois, quantos desses viram Pro.
- **Métricas de apoio (plano, parte 8):** duração média ≥ 40% do vídeo; cliques no link da descrição.
- **Público:** homens e mulheres de [faixa etária a confirmar — o plano assume "mais de trinta anos"] que jogaram
  manager de futebol no PC da escola/casa; hoje jogam no celular; torcem por clube brasileiro; não querem instalar nada.
- **Duração alvo:** 9:30 (faixa 9:00–10:30). Formato 16:9.

---

## 3. Títulos (3 opções, ≤ 60 caracteres)

Palavra-chave principal: **manager de futebol (online)** — é a página de maior prioridade do site
(`/elifoot-online/`, título "Manager de futebol online e grátis") e o termo que o próprio jogo usa.

| # | Título | Caracteres | Ângulo |
|---|---|---|---|
| **A (recomendado)** | Manager de futebol online: o jogo me deu um time da Série D | 59 | Curiosidade + palavra-chave no início |
| B | O manager de futebol da escola voltou (e roda no navegador) | 59 | Nostalgia (é o gancho do plano) |
| C | Manager de futebol online: não escolhi meu time. Sorteei. | 57 | O diferencial do jogo (sorteio) |

Sugestão de teste: publicar com **A** e a capa "EP. 01" (seção 10); se o CTR das primeiras 48 h ficar abaixo de [meta de CTR],
trocar para **C** + a capa "Da Série D ao título" (ou usar o "Testar e comparar" do YouTube, se o canal tiver).

---

## 4. Gancho (0:00–0:30)

O plano abria com 12 s de rosto. Abaixo, a versão de 30 s: mesma frase de abertura, mais uma promessa
e um loop aberto que só fecha no sorteio.

| Tempo | Tela | Fala (sentido; diga com as suas palavras) |
|---|---|---|
| 0:00–0:04 | **Só rosto**, plano fechado. | "Se você tem mais de trinta anos, você já perdeu uma tarde inteira num jogo de técnico de futebol." |
| 0:04–0:08 | Corte seco: **sorteio do clube girando** (B-01, sem mostrar o resultado). | "Só que neste aqui você não escolhe o seu time." |
| 0:08–0:14 | Rosto 30 / jogo 70: **escudo fictício de clube da Série D** desfocado, só a silhueta. | "O jogo sorteia. E o que ele me deu… você vai ver daqui a pouco." |
| 0:14–0:22 | Montagem rápida (1 s cada): campo da Formação → leilão → rodada ao vivo → Camarote. | "Escalação, mercado com leilão, rodada ao vivo com as quatro divisões. Tudo no navegador, sem instalar nada." |
| 0:22–0:30 | **Landing rolando devagar**, sem fala. Música do jogo respira. Texto: **RetroFoot**. | — (3 s de silêncio, como no plano) |

Regras do gancho: a cara reage antes de explicar; nenhum logo, nome ou tela de outro jogo; o resultado do
sorteio **não** aparece antes de 3:00.

---

## 5. Roteiro final com marcações de tela / B-roll

Legenda: **R** = rosto, **J** = jogo. "R30/J70" = rosto em 30% do quadro, jogo em 70%.
Os códigos **B-xx** apontam para a lista de capturas em `gravacao.md`.

### 0:00 · Gancho
Ver seção 4.

### 0:30 · Apresentação — R40/J60 (jogo parado na landing, B-02)
> "Isto é o RetroFoot. É um manager de futebol no estilo dos que a gente jogava na escola, feito do zero para
> 2026, e roda no navegador — no computador ou no celular, sem baixar nada. Eu sou [nome/papel do apresentador],
> um dos que estão construindo o jogo, e neste canal você vai ver o jogo crescer em tempo real."

- Rosto maior enquanto fala. Texto na tela: **"Sem instalar · computador e celular · save na nuvem"**.
- Mudança: "refeito para 2026" virou "no estilo dos que a gente jogava" (ver tabela, item 2).

### 1:00 · Criar a carreira do zero — R30/J70 (B-03 a B-06)
> "Vou começar uma carreira do zero, do jeito que qualquer um começa."

1. **Como você quer jogar?** (B-03) — "Tem o Modo Solo, contra a máquina, e o Modo Resenha, com os amigos.
   A Resenha está chegando — vem para quem é Pro. Hoje eu vou de Solo." Passar o mouse no selo **Em breve**.
2. **Masculino ou feminino** (B-04) — uma frase: "Dá para comandar o time masculino ou o feminino."
3. **País e liga** (B-05) — "Hoje o país é o Brasil. E repara aqui: todo mundo começa na Série D." Zoom de
   captura no selo **VOCÊ COMEÇA AQUI**.
4. **Moeda** (B-05b) — "Real, euro ou dólar. Vou de real."
5. **Treinador** (B-06) — nome, idade, cara (usar uma das faces desenhadas ou a foto do apresentador, se ele aprovar).

> "Repara numa coisa: em nenhum momento eu escolhi o meu clube."

Ritmo: devagar, uma frase por tela. Se esta parte passar de 1:30 na gravação, cortar a moeda e a modalidade na edição.

### 2:30 · O sorteio — R30→R50 no resultado (B-07, gravar inteiro)
> "O clube é sorteado. Você não pega o time rico — pega o que te calhou, e vira o que der para virar.
> É isso que faz a carreira valer."

- Deixar a cerimônia correr (não usar o ⏩ na gravação principal).
- **O rosto cresce no momento do resultado. Reação genuína, sem regravar.** Fecha o loop aberto do gancho.
- Texto na tela no resultado: **[nome fictício do clube] · Série D**.

### 3:20 · Entrada no clube — R30/J70 (B-08, B-09)
> "Série D, caixa curta, elenco fraco. Perfeito."

- Tela de carregamento (B-08): cortar para 2 s na edição (ela dura ~10 s de propósito).
- Boas-vindas (B-09): estádio, divisão, elenco, caixa, objetivo da diretoria, recado do presidente.
  Passar o mouse pelos números enquanto fala. Ler em voz alta o objetivo cobrado pela diretoria.

### 3:40 · CTA leve (novo) — R50/J50, 10 segundos
> "Se você quer ver qual clube o sorteio te dá: a primeira temporada é de graça, completa, sem cartão.
> O link está na descrição."

- Texto na tela: **"1ª temporada grátis · link na descrição"**. Não mostrar preço aqui.

### 3:50 · Volta guiada, sem entrar em nada — R30/J70 (B-10 a B-16)
> "Formação, elenco, mercado, campeonatos, treinador, finanças, e-mail. Cada uma destas vai virar um vídeo —
> hoje é só para você ver o tamanho da coisa."

Uma frase e uma pausa por página, clique lento:
- **Formação** (B-10): "O campo visto de cima: camisa, número e energia de cada titular."
- **Elenco & Base** (B-11): "O elenco inteiro e os garotos que sobem da base."
- **Mercado** (B-12): "Comprar, vender e o leilão — onde se ganha ou se perde a temporada."
- **Campeonatos** (B-13): "Liga, copas, artilharia."
- **Treinador** (B-14): "A carreira do técnico e o ranking de treinadores."
- **Finanças** (B-15): "Folha, bilheteria, sócios, patrocínio e a obra do estádio."
- **E-mail** (B-16): "E o clube fala com você pela caixa de entrada: imprensa, propostas, recados."

Mudança: o plano dava 2 min para este trecho; aqui são 1:40 (é o trecho com maior risco de queda).
Na edição, um contador discreto no canto ("7 telas · 7 vídeos") dá sensação de progresso.

### 5:30 · Uma rodada ao vivo, sem explicar — R15/J85 (B-18, gravar inteira)
> "Aperta aqui e a rodada inteira começa a rolar. As quatro divisões ao mesmo tempo."

- Jogo a 85%. Deixar o placar mexer. **10 s sem fala** (som do jogo nos gols).
- Texto na tela (item 7 da tabela): **"4 divisões · rodada inteira ao vivo"**.
- Se a partida do clube do apresentador tiver gol, pênalti ou expulsão, **reagir** — não regravar.
- Entrar no **Modo Camarote** por 20–30 s (B-19): "E esta é a minha partida em tela cheia, com narração."

### 7:30 · Pós-rodada — R30/J70 (B-20)
> "Acabou a rodada, a tabela inteira mexe. E a próxima semana começa."

- Mostrar a classificação das quatro divisões e onde o clube ficou.

### 8:00 · O pedido — R60/J40 (B-21, B-22)
Fala (adaptada do plano, com a regra atual do produto):
> "O RetroFoot está sendo feito agora, e você pode jogar hoje. A primeira temporada da sua carreira é de graça,
> com o Modo Solo completo. Se você gostar e quiser continuar a mesma carreira — subir da Série D, ter mais de um
> save, e entrar no Modo Resenha quando ele chegar —, isso é o Pro. O link está aqui embaixo e no primeiro comentário."

- Na tela (B-21): a seção **Planos** da landing, com Peladeiro e Pro lado a lado.
  Preço só se o Leandro confirmar no dia da gravação: **R$ [19,90]/mês ou R$ [178,80]/ano**
  (valores de `docs/plano-gratis-pro.md`; conferir se continuam os mesmos).

### 8:40 · Próximo vídeo — R70/J30
> "Na quinta que vem eu volto com a tela de escalação, que é onde este jogo ganha ou perde você.
> Escreve aqui embaixo qual clube você acha que o sorteio te daria."

- Pergunta nos comentários = engajamento (substitui "eu leio todos" do V2 do plano).

### 9:00–9:30 · Tela final (20 s)
- Elementos: vídeo **V2** (ou "Vídeo mais recente" enquanto o V2 não existir), botão **Inscrever-se**,
  e o rosto ao lado. Fundo: Formação do clube sorteado (B-10) desfocada.
- Texto: **"Começa grátis: retrofoot.com.br"**.

---

## 6. CTA e links (com UTM)

Todas as URLs levam `utm_source=youtube&utm_medium=video&utm_campaign=v1`. Acrescentei `utm_content`
para saber de que ponto veio o clique (o rastreamento já grava `utm_content`; não muda o canal).

| Uso | URL |
|---|---|
| **Principal — começar grátis** (descrição, 1ª linha) | `https://retrofoot.com.br/?utm_source=youtube&utm_medium=video&utm_campaign=v1&utm_content=descricao` |
| Comentário fixado | `https://retrofoot.com.br/?utm_source=youtube&utm_medium=video&utm_campaign=v1&utm_content=comentario` |
| **Direto para o Pro** (abre a oferta ao carregar; `?pro` é tratado por `rf-link-pro.js`, que mantém os UTM) | `https://retrofoot.com.br/?pro&utm_source=youtube&utm_medium=video&utm_campaign=v1&utm_content=pro` |
| Pro anual | `https://retrofoot.com.br/?pro=ano&utm_source=youtube&utm_medium=video&utm_campaign=v1&utm_content=pro-anual` |
| Guia do treinador (apoio) | `https://retrofoot.com.br/guia/?utm_source=youtube&utm_medium=video&utm_campaign=v1&utm_content=guia` |

Observações:
- O YouTube só mostra links clicáveis na descrição/comentário; o cartão final aponta para o vídeo seguinte, não para o site
  (links externos em cartão exigem o Programa de Parcerias). Por isso o CTA falado manda para "aqui embaixo".
- Nunca usar `utm_medium` com `paid`, `cpc` ou `ads` em link orgânico (vira anúncio no painel — `docs/rastreamento-origem.md`).

---

## 7. Capítulos (tempos estimados — ajustar no corte final)

```
0:00 O jogo que não deixa você escolher o time
0:30 O que é o RetroFoot
1:00 Criando a carreira do zero
2:30 O sorteio do clube
3:20 Bem-vindo à Série D
3:50 Tudo o que tem no jogo, tela por tela
5:30 Uma rodada ao vivo (4 divisões)
7:30 Como ficou a tabela
8:00 Como jogar de graça (e o que é o Pro)
8:40 O próximo vídeo
```

(Regras do YouTube atendidas: começa em 0:00, ≥ 3 capítulos, cada um com ≥ 10 s.)

---

## 8. Descrição completa

```
O jogo me deu um clube da Série D — e eu não escolhi. 🎲
O RetroFoot é um manager de futebol online, no estilo dos que a gente jogava na escola, que roda no navegador (computador ou celular), sem instalar nada.

▶ Comece a sua carreira de graça (1ª temporada completa, sem cartão):
https://retrofoot.com.br/?utm_source=youtube&utm_medium=video&utm_campaign=v1&utm_content=descricao

👑 Quer continuar a carreira depois da 1ª temporada? Conheça o Pro:
https://retrofoot.com.br/?pro&utm_source=youtube&utm_medium=video&utm_campaign=v1&utm_content=pro

Neste vídeo eu começo uma carreira do zero: escolho o modo, o país e a moeda, monto o treinador e deixo o sorteio decidir o clube. Depois passo por todas as telas do jogo — formação, elenco, mercado com leilão, campeonatos, treinador, finanças e e-mail — e jogo uma rodada ao vivo, com as quatro divisões ao mesmo tempo e a minha partida no Modo Camarote.

No RetroFoot:
• Todo mundo começa na Série D e sobe jogando
• O clube é sorteado, nunca escolhido
• Mercado com propostas, contrapropostas e leilão
• Rodada ao vivo, com narração lance a lance
• Save na nuvem: comece no PC, continue no celular
• Modo Resenha (multiplayer com os amigos) chegando — exclusivo do Pro

Peladeiro (grátis): a 1ª temporada da carreira no Modo Solo completo.
Pro: temporadas e carreiras ilimitadas, velocidade Ultrassônico, Selo Pro e acesso ao Modo Resenha quando a versão Beta for lançada. [R$ 19,90/mês ou R$ 178,80/ano — confirmar antes de publicar]

📖 Guia do treinador (táticas, dinheiro, como subir):
https://retrofoot.com.br/guia/?utm_source=youtube&utm_medium=video&utm_campaign=v1&utm_content=guia

Capítulos
0:00 O jogo que não deixa você escolher o time
0:30 O que é o RetroFoot
1:00 Criando a carreira do zero
2:30 O sorteio do clube
3:20 Bem-vindo à Série D
3:50 Tudo o que tem no jogo, tela por tela
5:30 Uma rodada ao vivo (4 divisões)
7:30 Como ficou a tabela
8:00 Como jogar de graça (e o que é o Pro)
8:40 O próximo vídeo

Qual clube você acha que o sorteio te daria? Conta nos comentários.

O RetroFoot é um jogo próprio, feito do zero. Clubes, jogadores e competições no jogo têm nomes fictícios.

#managerdefutebol #jogodetecnico #retrofoot
```

**Comentário fixado** (mesma chamada, sem variação — regra da parte 7 do plano):

```
▶ Comece a sua carreira de graça (1ª temporada completa): https://retrofoot.com.br/?utm_source=youtube&utm_medium=video&utm_campaign=v1&utm_content=comentario
Qual clube o sorteio te deu? Responde aqui embaixo 👇
```

Opcional, a decidir (D4): incluir o link do grupo do WhatsApp da comunidade que já está no site.

---

## 9. Tags

Ordem = prioridade (o YouTube aceita até 500 caracteres no total).

```
manager de futebol, manager de futebol online, jogo de técnico de futebol, jogo de treinador de futebol,
manager de futebol grátis, jogo de futebol no navegador, retrofoot, retrofoot98, manager de futebol brasileiro,
jogo de ser técnico de futebol, série d, jogo de futebol online grátis, simulador de técnico de futebol,
jogo de gerenciar time de futebol, manager de futebol no celular, jogo de futebol retrô, jogos antigos de futebol
```

Tags com nome de terceiros (Elifoot, Brasfoot, Football Manager) ficaram **fora** de propósito — ver decisão D2.
O YouTube trata tag de marca alheia como metadado enganoso quando o vídeo não é sobre ela.

---

## 10. Thumbnail — usar o design system do RetroFoot98 (não criar do zero)

**Regra (pedido do Leandro, 01/10):** toda capa de YouTube do RetroFoot sai dos modelos que já existem:

- **Design system:** "RetroFoot98 Design System" (feito no Claude Design) — https://claude.ai/artifact/PBgFZRDDUhZknVqtJFiLPa.
  Dele vêm cores, fontes, selos e o logo `Retrofoot.com.br`. Nada de paleta ou fonte nova.
- **Modelos no Canva:** "RetroFoot98 — Capas YouTube (12 modelos)" — https://www.canva.com/d/rUN1TN9RO9x-7te
  (exportado do design system). Também existe "RetroFoot98 — Capa EP. 01 · Primeira Resenha" para a série da Resenha.
- **Fluxo:** copiar a página do modelo para um design novo (o original nunca é editado), trocar só texto e a imagem
  da direita, exportar PNG 1280×720 ≤ 2 MB.

Estrutura comum dos modelos: fundo de gramado escuro (ou claro, nos de explicação), logo no canto superior esquerdo,
selo azul do episódio/tema, título em duas linhas em caixa alta condensada com a 2ª linha numa faixa amarela,
linha de apoio em fonte mono com o traço amarelo, e a metade direita com a **tela do jogo** separada por um filete amarelo.

### Capa do V1 (recomendada) — modelo "EP. 01 · Você jogava isso na escola"
- **Base:** página 7 dos 12 modelos. Cópia de trabalho já criada: "RetroFoot98 — Capas YouTube (12 modelos)" com 1 página
  — https://www.canva.com/d/K8qSJ5y_aCQeBQx (renomear para "Capa V1" ao editar).
- **Texto (já no modelo, combina com o título A sem repetir):** "VOCÊ JOGAVA / ISSO NA ESCOLA / **AGORA É 2026**" ·
  apoio "SEM INSTALAR NADA · NO NAVEGADOR" · selo "EP. 01" · etiqueta "HOJE".
- **O que trocar:** a captura da direita (hoje é uma partida genérica) por um quadro da gravação do V1 —
  de preferência o **cartão do clube sorteado com o selo "Série D"** (o momento do título A), ou a partida ao vivo
  se o sorteio não render bem em 1280×720.
- **Rosto:** o modelo não usa rosto. Se o Leandro quiser aparecer, o recorte entra por cima do filete amarelo, à direita
  (decisão D3).

### Alternativas para teste A/B (mesmos modelos)
- **"Da Série D ao título"** (página 11, selo TEMPORADA) — trocar o troféu da direita pela tela do clube sorteado.
  Combina com os títulos A e C.
- **"Perdi nos pênaltis"** (página 4, selo DESAFIO) — só se a gravação tiver um momento real assim; nunca montar placar.

Regras que continuam: sem escudos/nomes de clubes reais, sem jogadores reais, sem tela de outro jogo
(nem Elifoot, nem Brasfoot); só escudos fictícios do próprio jogo. Antes de publicar, conferir a capa em 160 px de largura.


---

## 11. Decisões que dependem do Leandro

| # | Decisão | Opções |
|---|---|---|
| D1 | Aprovar título + thumbnail para a publicação | A + capa EP. 01 (recomendado) · C + "Da Série D ao título" · B + capa EP. 01 |
| D2 | Usar a palavra "Elifoot" | **Recomendado:** só falada como comparação ("no estilo dos que a gente jogava"), sem título, tag ou arte. Alternativa: citar "estilo Elifoot" na descrição, como o site faz em `/elifoot-online/`. |
| D3 | Quem apresenta e se o rosto vai na thumbnail | [nome] · thumbnail com rosto ou sem rosto |
| D4 | Link do grupo do WhatsApp na descrição | sim / não |
| D5 | Mostrar preço do Pro no vídeo | sim (confirmar valores no dia) / não (só "Pro" e link) |
| D6 | Conta usada na gravação | conta de gravação dedicada (recomendado — ver `gravacao.md`) ou conta própria |
| D7 | Publicar, agendar e data | Plano: quinta da semana 1. Publicar e agendar são do Leandro. |
