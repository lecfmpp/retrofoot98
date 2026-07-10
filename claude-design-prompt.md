Quero criar um design system para o **RetroFoot98**, um jogo de futebol de gerenciamento (estilo Elifoot 98 / Championship Manager clássico) que já está em produção. Não é um projeto novo — é a extração e sistematização do visual e da voz que o jogo já tem hoje. Anexei um briefing (`design-system-brief.md`) com cores, tipografia e componentes extraídos direto do CSS de produção, mais screenshots das telas reais e os arquivos da logo/badges. Este prompt cobre o que o briefing não cobre: voz de marca, linguagem e as regras de "não descaracterizar".

## Estilo do jogo

Simulador de gerenciamento de futebol em português do Brasil, jogado solo contra a máquina ou online com amigos ("Modo Resenha"). O jogador é o técnico: escala time, negocia jogadores, administra o caixa do clube, disputa Série A-D e copas (Libertadores, Sul-Americana, Copa do Brasil). Denso em informação (tabelas, estatísticas, finanças), mas organizado em janelas e abas — não é minimalista, é "arrumado".

## Brand voice

- **Tom:** direto, informal, sem enrolação. Frases curtas, imperativas quando é instrução ("Escolha a tática no menu Seleccionar primeiro"), factuais quando é status ("Jogo gravado na nuvem", "Times sorteados!").
- **Registro:** trata o jogador na 2ª pessoa ("você"), como um amigo explicando a tela, não como um manual técnico.
- **Futebolês brasileiro real:** usa vocabulário de torcedor/comentarista quando cabe ("arrematado no leilão", "sorteio dos jogos da taça", "à espera dos treinadores"), não tradução literal de termos em inglês.
- **Pontuação com personalidade:** reticências (`…`) em estados de carregamento, exclamação moderada em confirmações boas ("Conta criada!", "Pronto! À espera dos outros treinadores."), sem exagero — não é linguagem de app gamificado com emoji em toda frase.
- **Peculiaridade ortográfica proposital, não corrigir:** o jogo usa grafia em português europeu em alguns termos específicos — "Selecção", "Seleccionar", "Selecciona" (com cç), em vez de "Seleção"/"Selecionar" do português do Brasil. É uma homenagem ao Elifoot original e faz parte da identidade — mantenha essa grafia nesses termos específicos, mesmo com o resto do texto em PT-BR padrão.
- **Nunca:** corporativo, motivacional, cheio de jargão de produto ("desbloqueie", "otimize sua experiência"). Se soa como um app de produtividade, está errado para essa marca.

## Estilo visual — regras de não descaracterizar

O documento anexo já traz cores, tipografia e componentes. Reforçando o que **não pode virar genérico**:

1. **O bisel 3D é a assinatura visual do produto.** Botões, janelas e campos usam bordas 2px com luz clara no topo/esquerda e escura embaixo/direita (efeito "para fora"), invertendo no estado pressionado. Não substitua por `box-shadow` suave, glassmorphism generalizado ou flat design — isso descaracteriza o produto por completo.
2. **Cantos são retos por padrão.** `border-radius` só aparece em 2 lugares deliberados: badges/selos pequenos (pílulas) e os cards modernos de escolha (Solo vs Resenha). Fora disso, quadrado.
3. **Ícones são emoji nativos**, não um icon set customizado (⚽ 👥 💬 ✔ ✖ 📤 💰). É proposital — mantém o app leve e com um tom mais casual/universal. As únicas imagens customizadas são a logo, os badges de feature e os troféus de competição (esses sim em arte própria pixel/ilustrada).
4. **Paleta é fixa e limitada:** verde-gramado, azul-marinho, cinza-chrome, amarelo — não introduza uma paleta paralela "mais moderna". Cores funcionais (verde=sucesso, vermelho=cancelar/erro) já existem e devem ser reaproveitadas, não redefinidas.
5. **Densidade é aceitável.** Não simplifique telas removendo dados pra "arejar" — o público desse jogo gosta de ver tabela, estatística, dinheiro. Ajuste hierarquia e espaçamento, não corte conteúdo.
6. **Convenções de mobile já existem** (breakpoint único em 760px, botões empilham, ação principal fixa no rodapé) — mantenha esse padrão, não reinvente a navegação mobile do zero.

## O que eu quero do design system

- Tokens de cor, tipografia e espaçamento formalizados a partir do que já existe (não recolorir/re-tipografar do zero).
- Componentes documentados com todos os estados reais que já uso: normal, hover, pressionado, desabilitado — sempre respeitando a regra do bisel.
- Qualquer componente novo sugerido deve primeiro tentar reaproveitar um padrão existente (ex: card de escolha, badge de selo) antes de propor algo inédito.
- Se for sugerir alguma evolução visual, sinalize claramente como "proposta de evolução" separada do "sistema atual documentado" — não quero as duas coisas misturadas sem aviso.
