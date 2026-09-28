# Visão geral, conta e planos

Base de conhecimento para o time de suporte do RetroFoot (antigo "RetroFoot98"). Tudo aqui foi conferido no código do jogo e nas notas internas até 28/09/2026. Quando algo está desligado, incerto ou em conflito entre telas, isso está dito explicitamente.

Glossário rápido:
- **Peladeiro** = nome do plano gratuito em todas as telas (no banco ele se chama `free`; internamente a chave é `gratis`). Nunca se diz "grátis pra sempre": o preço é "R$ 0 na 1ª temporada".
- **Pro** = o único plano pago vendido hoje.
- **Resenha** e **Embaixador** = planos pagos antigos, que não se vendem mais. Quem ainda tem um deles é tratado como Pro.
- **Save** = uma carreira gravada na nuvem (um clube, uma história).

---

## O que é o RetroFoot

O RetroFoot é um jogo de técnico de futebol (manager) retrô, no estilo dos clássicos dos anos 90, jogado **direto no navegador**, sem instalar nada, no computador ou no celular. Frase da página inicial: "O clássico da sua infância, agora online e com os amigos."

O jogador é o técnico: escala o time, define a tática, negocia jogadores no mercado (com leilão), cuida do caixa, do estádio e dos patrocínios, e disputa liga e copas. A partida é mostrada ao vivo, com narração lance a lance.

Pontos que o suporte precisa saber:
- **Todo mundo começa na Série D** (a divisão mais baixa) e sobe jogando. Não dá para escolher a divisão inicial.
- **O clube é sorteado**, nunca escolhido. O jogador escolhe o país; o clube sai numa cerimônia de sorteio.
- **Nomes fictícios**: clubes, jogadores e competições têm nomes fictícios (ex.: as copas aparecem como "Copa da Federação", "Liberta Cup", "Copa de Clubes da América"; a Série A aparece como "Liga Soberana"). Os nomes exatos vêm do pacote oficial e podem mudar pelo painel, então a tela do jogo é a referência.
- **Masculino e feminino**: dá para comandar o time masculino ou o feminino (mesmos clubes, mesmo calendário, mesmas competições).
- Cada divisão do Brasil tem 20 clubes. Da Série D, B e C sobem 4; das Séries A, B e C caem 4.
- Os saves ficam **na nuvem**, ligados à conta: dá para começar no computador e continuar no celular com a mesma conta.

Atenção: o arquivo público `llms.txt` do site está **desatualizado** (fala em jogar na Europa e em jogo "gratuito"). Na versão atual só se joga no Brasil (ver "Travas da 1ª versão pública") e o gratuito é limitado à 1ª temporada. Não use esse texto como referência.

Referência técnica: `public/src/ui/rf26-landing.js` (`rfLandingHTML`), `public/src/data/universos.js`.

---

## Os dois modos: Modo Solo e Modo Resenha

Sempre chame os modos pelo nome próprio: **Modo Solo** e **Modo Resenha**.

### Modo Solo
- Carreira de um treinador contra a máquina. Selos na tela de escolha: "Online" e "Single-player".
- Texto da tela: "Pega um clube da Série D e sobe até a elite no seu ritmo. Mercado, finanças e o calendário completo de copas — sem depender de ninguém entrar na sala."
- Botão: **Jogar sozinho**.
- É o único modo disponível hoje para todos.
- Não existe mais "vários jogadores no mesmo aparelho" (hotseat): essa opção foi desligada. Quem quer jogar com amigos é direcionado ao Modo Resenha.

### Modo Resenha
- Multiplayer online: um anfitrião abre uma sala, chama a turma por link, código, WhatsApp ou e-mail, os clubes são sorteados entre os treinadores e todos jogam a mesma semana, na mesma tabela, com o mesmo mercado e chat da sala.
- **Situação atual: "Em breve".** Desde 25/09 o cartão do Modo Resenha aparece com o selo "Em breve" e não é clicável. Ele chega como "versão Beta" e será **exclusivo do Pro**.
- O botão do cartão muda conforme o plano:
  - Peladeiro: **Garantir acesso com o Pro** (abre a oferta do Pro).
  - Pro: **✓ Acesso garantido no lançamento** (ao clicar aparece: "Você é Pro: o seu acesso ao Modo Resenha está garantido no lançamento do Beta.").
- Tamanho da sala: o limite gravado no servidor é **10 treinadores por sala** (para Pro). Há textos divergentes no site: a seção da página inicial diz "Salas de 3 a 8 treinadores" e o cartão do Pro diz "até 10 treinadores". Uma tela antiga ainda diz "até 20". Para o suporte, o número que vale é o do servidor: até 10. Não prometa data de lançamento.

**Onde fica no jogo:** depois de entrar na conta, tela "Como você quer jogar?" (passo "Modo"), com os dois cartões com foto.

### Perguntas frequentes
- **Consigo jogar com meus amigos agora?** Ainda não. O Modo Resenha está "Em breve" e será exclusivo do Pro no lançamento da versão Beta.
- **Se eu assinar o Pro agora, tenho a Resenha?** O Pro garante o acesso quando a versão Beta do Modo Resenha for lançada. Hoje o Pro libera temporadas e carreiras ilimitadas no Modo Solo.
- **Posso escolher meu time?** Não. Você escolhe o país; o clube é sorteado na Série D, igual para todo mundo.

Referência técnica: `public/src/ui/rf26-onboarding.js` (`rfOb2`), `public/src/ui/main.js` (`RESENHA_EM_BREVE=true`, `clPickResenha`), `rf26-landing.js` (`rfLpResenhaHTML`, `RF_SALA_HUMANOS`).

---

## Página inicial (landing) e lista de espera

A página inicial (`retrofoot.com.br`) tem:
- **Cabeçalho**: logotipo, links "O jogo", "Por dentro", "Modo Resenha", "Planos", o botão **Começar carreira** e, à direita, **Entrar** (sem sessão) ou o crachá da conta (com sessão). No celular os links ficam no menu (ícone de hambúrguer), onde também está **Sair da conta**.
- **Topo (hero)**: título "O clássico da sua infância, agora online e com os amigos.", um vídeo, o botão **Começar carreira** e a nota "Comece no Peladeiro: a 1ª temporada inteira de graça, com o Modo Solo completo. Sem instalar nada, sem cartão."
- Seções: "Da Série D ao topo, no seu ritmo." · "Por dentro do jogo" (telas reais) · Modo Resenha (marcado "em breve") · Mercado/leilão · Momentos · **Planos** ("Escolha o seu banco de reservas.") · **Plano Pro** ("Tudo o que vem junto com a coroa.") · rodapé com links para páginas (termos, privacidade, media kit etc.).
- **Todos os botões "Começar carreira" levam à seção de Planos**, não direto ao jogo. Lá, o cartão do Peladeiro ("Bater a primeira pelada") leva ao cadastro; o do Pro abre o pagamento.
- **Crachá da conta** no cabeçalho: mostra o nome e o plano (Peladeiro em amarelo; Pro em dourado com coroa 👑). Clicar nele leva direto à escolha de modo. Ao lado há o botão **Sair**.
- Widget do WhatsApp (pílula verde no canto inferior direito) — ver "Grupo do WhatsApp".

### Lista de espera
- **Desligada desde 04/09/2026**, quando o pagamento entrou no ar. A seção "Lista de espera" ("Só N treinadores entram na primeira versão") não aparece mais e nenhum botão leva a ela. O código continua existindo para uma eventual reabertura.
- Se alguém perguntar sobre "minha vaga na lista de espera": hoje não há fila. Qualquer pessoa cria a conta e joga o Peladeiro na hora.

Referência técnica: `rf26-landing.js` (`RF_SO_LISTA=false`, `rfLpListaHTML`, `rfLpNavHTML`, `rfContaChipHTML`).

---

## Cadastro (criar conta)

**Onde fica no jogo:** botão **Entrar** no cabeçalho, ou **Começar carreira → Bater a primeira pelada**. Abre a tela "Crie sua conta e entre no jogo." (passo "Entrar"), com duas abas: **Criar conta** e **Entrar**.

Campos do cadastro, em ordem:
1. **Nome do treinador** (obrigatório).
2. **E-mail** (obrigatório).
3. **WhatsApp** — **opcional** desde 17/09/2026. Tem seletor de país (Brasil é o padrão; há dezenas de países com máscara própria). Se começar a digitar, precisa completar o número ou apagar: número incompleto trava o botão ("WhatsApp incompleto. Complete o número ou deixe em branco.").
4. **Seu time do coração** — **obrigatório** (ver tópico próprio).
5. **Senha** — regras mostradas com visto verde conforme se digita: **pelo menos 6 caracteres, uma letra e um número**. Senhas que já apareceram em vazamentos conhecidos são **recusadas pelo servidor** ("Essa senha também aparece em vazamentos conhecidos — escolha outra.").
6. Caixinha "Quero receber aviso quando abrir vaga nas Ligas Oficiais." (vem marcada). Observação: no código atual do cadastro essa escolha **não é enviada a lugar nenhum** — é um resto da fase de lista de espera. Não prometa nada com base nela.

Botão: **Criar conta e continuar** (fica apagado até nome, e-mail, senha válida, WhatsApp completo ou vazio, e time do coração estarem OK).

O que acontece depois:
- Aparece "Conta criada!" e a pessoa vai direto para "Como você quer jogar?". Não há e-mail de confirmação obrigatório hoje (se um dia for ligado, a mensagem será "Conta criada! Confirme seu e-mail antes de entrar").
- Abre uma vez o **modal do grupo do WhatsApp** ("✓ CONTA CRIADA! Agora entra pro grupo da resenha").
- Começa a sequência de e-mails de boas-vindas (ver "E-mails que o jogador recebe").
- Origem do cadastro (UTM/link de parceiro) é gravada junto da conta, para o painel.

Mensagens de erro comuns:
- "Essa conta já existe. Use "Entrar" com sua senha." — o e-mail já tem conta; a tela muda sozinha para a aba Entrar.
- "E-mail inválido. Confira o endereço e tente de novo."
- "Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente de novo."
- "Sem conexão com o servidor. Verifique sua internet e tente de novo."

### Perguntas frequentes
- **O WhatsApp é obrigatório?** Não. É opcional; mas se começar a preencher, tem de completar.
- **Minha senha é recusada e parece certa.** Precisa ter 6+ caracteres, uma letra e um número, e não pode ser uma senha já vazada na internet. Troque por outra.
- **Criei a conta e não recebi e-mail de confirmação.** Não é necessário confirmar o e-mail para jogar hoje. Os e-mails de boas-vindas chegam do remetente "O Presidente · RetroFoot".

Referência técnica: `rf26-onboarding.js` (`rfOb1`, `RF_SENHA_REGRAS`, `rfObPronto`), `main.js` (`clLoginSignup`), `public/src/net/supabase-adapter.js` (`netAuthSignUp`, `authErrPt`), `public/src/ui/rf-whatsapp.js`.

---

## Time do coração no cadastro

- Pergunta **obrigatória** no cadastro desde 27/09/2026: campo "Seu time do coração", com busca ("Buscar time").
- A lista traz **80 clubes reais** das Séries A a D, **com nome e escudo reais** (exceção consciente: o jogo em si continua com nomes fictícios; aqui é só "para quem você torce").
- Opções extras: **Outro time** (abre o campo "Qual time?", até 40 caracteres) e **Não torço para nenhum time**.
- Serve para a equipe contar torcidas. Não muda nada no jogo (não influencia sorteio, clube, nada).
- Contas criadas antes de 27/09 não têm essa resposta. Existe um e-mail "Time do coração" preparado para perguntar a elas, mas o link de resposta (`/?time-do-coracao`) **ainda não é tratado pelo jogo** — não há hoje tela para quem já tem conta preencher o time depois.

### Perguntas frequentes
- **Escolher o time do coração faz eu jogar com ele?** Não. O clube é sempre sorteado; o time do coração é só uma informação do seu perfil.
- **Posso mudar o time do coração depois?** Não existe tela para isso hoje. Encaminhe a um dev se for necessário.

Referência técnica: `public/src/ui/rf-time-coracao.js`, `public/src/data/times-coracao.js`.

---

## Login, sair e recuperação de senha

### Entrar
- Aba **Entrar**: só e-mail e senha. Botão **Entrar e continuar**. Abaixo do campo de senha, o link **Esqueci minha senha**.
- Quem já está logado e abre o passo 1 vê "Você já está logado" com o e-mail, e as opções **Continuar** ou "Não é você? **Entrar com outra conta**".

### Sair
- Cabeçalho das páginas públicas: botão **Sair** ao lado do crachá (no celular, no menu ☰ → "Sair da conta").
- Dentro do jogo: **Configurações → Opções → Conta → Sair da conta**, ou a página **Sair do jogo → Conta → Sair da conta**. Sair desliga só aquele aparelho.

### Esqueci minha senha
1. Na aba Entrar, clicar em **Esqueci minha senha**.
2. Tela "Esqueceu a senha?": colocar o e-mail e clicar em **Enviar o link**.
3. Aviso: "✓ Link enviado! Confira seu e-mail (e a caixa de spam)." Por segurança, a resposta é sempre a mesma, exista ou não conta com aquele e-mail.
4. O e-mail tem o assunto "Redefina sua senha — RetroFoot98". O link **vale 30 minutos e é de uso único**.
5. O link abre a tela "Crie uma senha nova" (campos Nova senha e Confirmar senha, mesmas regras do cadastro). Botão **Salvar senha**.
- Os saves na nuvem **não são afetados** pela troca de senha.

### Trocar a senha estando logado
- **Configurações → Opções → Conta → Trocar a senha**: envia um link para o e-mail da conta. Atenção: esse diálogo diz que o link "vale por uma hora", mas o e-mail de redefinição diz 30 minutos. Oriente a usar o link o quanto antes.

### Apagar a conta
- **Não é possível apagar a conta de dentro do jogo.** O botão "Apagar a conta" abre um aviso: "Ainda não dá para apagar a conta de dentro do jogo." e oferece apenas **Apagar um save** ou **Sair da conta**. Pedidos de exclusão de conta devem ser escalados para a equipe.

### Perguntas frequentes
- **O link de senha não funciona.** Provavelmente expirou (30 min) ou já foi usado. Peça um novo em "Esqueci minha senha" e confira o spam.
- **Entrei e não vejo meus saves.** Confirme se entrou com o mesmo e-mail que usou antes: os saves e o plano ficam na conta, não no aparelho.

Referência técnica: `main.js` (`clForgotPassword`, `clSendResetLink`, `clDoUpdatePassword`), `rf26-fluxo.js` (`rfRecuperarSenhaHTML`, `rfNovaSenhaHTML`), `supabase/functions/send-password-reset`, `rf26-acoes.js` (diálogos `conta-senha`, `conta-apagar`).

---

## Onboarding: do cadastro ao primeiro jogo (Modo Solo)

O assistente mostra uma régua de passos no topo ("PASSO N DE M"). A régua do Modo Solo é:

**Entrar → Modo → Save → (Modalidade) → País e liga → Treinador → Clube → Jogar**

O passo "Modalidade" aparece porque o futebol feminino está ligado. Um passo dourado extra, "Seu jogador" 👑, só aparece para contas com o antigo plano Embaixador que ainda não usaram a vaga (na prática, hoje ninguém).

Passo a passo:

1. **Entrar** — criar conta ou entrar (ver acima).
2. **Modo** — "Como você quer jogar?": **Jogar sozinho** (Modo Solo) ou o cartão do Modo Resenha ("Em breve").
3. **Save** — tela "Onde você quer jogar?" (ou "Comece a sua carreira." se não houver nenhum save):
   - Lista dos saves na nuvem, com escudo, clube, divisão, temporada, semana e quando foi gravado. Clicar numa linha abre o save; o mais recente tem o botão **Continuar**. O ícone de lixeira apaga o save (pede confirmação: "Apagar jogo? ... Esta ação não pode ser desfeita.").
   - Última linha: **Começar um jogo novo**. O nome do save é gerado sozinho (SAVE01, SAVE02…).
   - No topo aparece o contador de saves ("1 de 1" no Peladeiro). Se o plano não permite mais carreiras, a linha aparece com 🔒 e abre o aviso de plano (ver "Planos").
4. **Modalidade** — "Você comanda o time masculino ou o feminino?": **Escolher masculino** ou **Escolher feminino**.
5. **País e liga** — "Escolha o país. O clube é sempre sorteado.":
   - País principal: hoje **só Brasil** é selecionável. Abaixo aparece a pirâmide das 4 divisões com o selo **VOCÊ COMEÇA AQUI** na Série D (não é clicável).
   - "Outros países": Inglaterra, Portugal, Espanha, Itália, Alemanha e Argentina aparecem como cartões **EM BREVE** (desligados). Texto: essas ligas já existem no mundo do jogo — dá para comprar e vender nelas e elas podem sondar o técnico —, mas ainda não dá para treinar lá.
   - Botão: **Sortear meu clube**.
   - Em seguida vem a tela de **moeda**: "Em que moeda você quer jogar?" — **Real (R$)**, **Euro (€)** ou **Dólar (US$)**. Vale para salários, transferências e caixa. Os cartões mostram a faixa de caixa inicial da divisão convertida.
6. **Treinador** — "Quem é você na beira do campo":
   - **O seu nome de treinador** (até 12 caracteres; aceita minúsculas e acentos).
   - **A sua idade (25 a 75)** — padrão 36; valor fora da faixa vira 36. A idade envelhece uma temporada por vez.
   - **A sua cara no jogo** — **obrigatório**. Três caminhos: **Subir a minha foto** (JPG, PNG ou WebP, até 2 MB, rosto de frente), **Criar com IA** (ver "Treinador e avatar": hoje aparece como "Em breve" para quase todos) ou uma das **5 faces desenhadas** (há 5 de "Treinador" e 5 de "Treinadora", nos estilos Terno, Agasalho, Polo, Blazer e Retrô 90). Dá para arrastar a foto dentro do quadro para enquadrar.
   - O botão só libera com a cara escolhida ("Escolha a sua cara" → **Continuar**).
7. **Clube (sorteio)** — "Cerimônia do sorteio": "Sorteando os clubes, boa sorte!". O ⏩ acelera a cerimônia ("mas a bola é a mesma"). Ao fim: "Times sorteados!", com o clube, elenco, caixa e estádio. Botão **Iniciar temporada**. Depois vem a tela "Carregando jogo", que dura **cerca de 10 segundos de propósito** (é espaço de patrocinador); não é travamento.
8. **Jogar (boas-vindas)** — "Bem-vindo ao [clube]." com estádio, divisão, elenco, caixa, objetivo cobrado pela diretoria, primeiro jogo e o recado do presidente. Botão **Entrar no clube** → cai na tela de Formação.

### Modo teste / escolha de divisão
- Houve um "modo teste" que deixava escolher a divisão inicial (para testar a Série A e as copas). **Foi desligado em 04/09/2026.** Hoje todos começam na Série D, sem exceção.
- Existe no código um botão de bancada "🧪 PULAR 30 E TESTAR" (joga sozinho até a rodada 31). Ele **não aparece para os jogadores** (não está ligado em nenhuma tela). Se um jogador disser que viu algo assim, escale.

### Perguntas frequentes
- **Posso começar na Série A?** Não. Todo mundo começa na Série D e sobe jogando.
- **Posso jogar com um clube europeu?** Ainda não. As ligas estrangeiras aparecem como "EM BREVE". Mas dá para comprar e vender jogadores delas.
- **A tela ficou 10 segundos em "Carregando jogo".** É normal, é o tempo fixo da tela de carregamento.
- **Posso trocar minha foto depois?** Sim, em Configurações (Perfil). A mesma foto vale para o ranking.

Referência técnica: `main.js` (`RF_TRILHAS`, `rfTrilhaDe`, `computeStartDivision`, `TESTING_FREE_DIVISION_PICK=false`, `RF_LOAD_MS=10000`), `rf26-onboarding.js` (`rfOb2`, `rfOb3`, `rfOb6`, `rfOb7`), `rf26-fluxo.js` (`rfObSoloHTML`, `rfMoedaHTML`, `rfTreinadoresHTML`, `rfAvatarBlocoHTML`), `rf26-modalidade.js`.

---

## Travas da 1ª versão pública (país, mercado, treinador)

Três chaves independentes definem o que a versão pública permite:

| Trava | Estado atual | O que significa para o jogador |
|---|---|---|
| País jogável (`RF_SO_BRASIL`) | **Ligada** | Só se pode **escolher um clube do Brasil** (Séries A–D, masculino ou feminino). Os outros países aparecem "EM BREVE". |
| Mercado mundial (`RF_MERCADO_MUNDIAL`) | **Ligado (aberto)** | O mercado é **o mundo todo**: dá para comprar de clubes estrangeiros e vender para eles. Os estrangeiros também têm nomes fictícios. |
| Treinador só no país (`RF_TREINADOR_SO_NO_PAIS`) | **Ligada** | A carreira do técnico fica **dentro do Brasil**: clubes do exterior não convidam o técnico para treiná-los. Convites de outros clubes brasileiros continuam existindo. |

As ligas estrangeiras rodam "de fundo" (simuladas) e aparecem em Campeonatos e no mercado.

### Perguntas frequentes
- **Por que não recebo proposta de clube europeu?** Nesta versão a carreira do treinador é só no Brasil. É uma trava da primeira versão pública.
- **Posso contratar jogador de fora?** Sim, o mercado é mundial.

Referência técnica: `public/src/data/universos.js` (as três flags), `public/src/engine/core.js` (`clubesDoExterior`, `foreignMarketCountries`).

---

## Planos: Peladeiro × Pro

Desde 25/09/2026 existem **só dois planos**. As regras novas estão **ligadas no servidor desde 25/09 à noite**.

| | **Peladeiro** (grátis) | **Pro** |
|---|---|---|
| Preço | R$ 0 "na 1ª temporada" | **R$ 19,90/mês** ou **R$ 178,80/ano** (dá R$ 14,90/mês; economia de 25%) |
| Modo Solo | completo (Séries A–D, mercado, táticas, copas, finanças) | completo |
| Temporadas por carreira | **1** (mais as temporadas extras grátis, ver abaixo) | **ilimitadas** |
| Carreiras (saves) | **1 por conta** | **ilimitadas** |
| Save na nuvem | sim | sim |
| Modo Resenha | não | **acesso exclusivo quando a versão Beta for lançada** |
| Velocidade "Ultrassônico" | não (Curto, Médio, Longo) | sim |
| Selo Pro | não | coroa dourada 👑 no crachá/perfil |
| Retrato do treinador por IA | não | **não** (vira item avulso, "em breve") |
| Jogador na base oficial | não | **não** (saiu da vitrine; vira item avulso) |

Itens listados no cartão do Pro: "Tudo o que está no Peladeiro · Temporadas ilimitadas: jogue quantos anos quiser · Acesso exclusivo ao Modo Resenha quando lançarmos a versão Beta · Carreiras ilimitadas no Modo Solo · Sua carreira salva na nuvem, de qualquer aparelho · Velocidade Ultrassônico e Selo Pro no seu perfil".

Detalhes que geram dúvida:
- **"1 carreira por conta"** conta as carreiras que **existem** agora. Quem apaga o save pode criar outro (que também começa com 1 temporada). Contas que já tinham mais de uma carreira antes da mudança ficam com elas.
- **O Selo Pro no ranking** ainda não foi feito: o selo aparece no crachá/perfil, não na tabela do ranking.
- **Desconto Beta** (50% nos 3 primeiros meses): **desligado**. O Pro nasceu sem desconto; o preço é o de tabela.
- **Velocidade**: Curto, Médio e Longo são livres; **Ultrassônico** (partida em ~10 segundos) é do Pro. No Peladeiro o Ultrassônico aparece com 🔒 em Configurações → Tempo de jogo e explica: "O ritmo Ultrassônico é do Pro". O Modo Camarote funciona em todos os ritmos.
- **Planos antigos**: contas com "Resenha" ou "Embaixador" contam como Pro. Em 27/09 não restava nenhuma conta nesses planos no banco (a última virou Pro). Contas da equipe/parceiros podem ter plano de cortesia sem cobrança no Stripe.

**Onde fica no jogo:**
- Página inicial → seção **Planos** (com seletor **Mensal / Anual**, "economize 25%").
- Dentro do jogo: barra lateral → **Minha Conta**. Mostra "SEU PLANO ATUAL", a escada Peladeiro → Pro, os cartões dos planos e, para quem é Pro, o botão **Gerir assinatura**. O subtítulo mostra o e-mail e o plano ("… · Plano Peladeiro").

### Perguntas frequentes
- **O jogo é grátis?** A 1ª temporada de uma carreira é grátis, completa, sem cartão. Para continuar a mesma carreira nas temporadas seguintes (ou ter várias carreiras), é preciso o Pro — com duas exceções grátis (opinião e post, ver "Paywall").
- **Quanto custa o Pro?** R$ 19,90 por mês ou R$ 178,80 por ano.
- **Tem período de teste ou cupom?** Não há teste grátis do Pro nem desconto de Beta ativo. A 1ª temporada grátis é o "teste".
- **Posso ter duas carreiras no Peladeiro?** Não; uma por conta. Pode apagar a atual e começar outra.
- **O Pro dá o avatar por IA?** Não. O retrato por IA vai ser um item vendido à parte, ainda "em breve".

Referência técnica: `rf26-landing.js` (`RF_PLANOS`, `RF_BETA={on:false}`, `RF_TRAVAS`, `RF_LP_EMBAIXADOR`), `rf26-planos.js`, `scripts/sql/planos_gratis_pro.sql` (`plano_limites`), `docs/plano-gratis-pro.md`, `main.js` (`TEMPO_PAGO`, `tempoLiberado`).

---

## Paywall de fim de temporada e temporadas extras grátis

### Quando aparece
Ao fim da temporada, quando o jogador do Peladeiro clica para começar a próxima temporada, o jogo consulta o servidor **antes** de virar o ano. Conforme o caso abre um destes popups:

| Variante | Quando | Título | Saída |
|---|---|---|---|
| **Bloqueio** | a próxima temporada passaria do limite da carreira | "🔒 FIM DA TEMPORADA DO PELADEIRO — Para seguir com esta carreira, vire Pro." | Assinar o Pro **ou** UMA saída grátis (se ainda houver). Botão "Voltar ao resumo". |
| **Última** | veterano entrando na última temporada de cortesia | "⏳ ÚLTIMA TEMPORADA GRÁTIS" | Assinar ou **Jogar a última temporada grátis** |
| **Beta** | veterano, primeiro fim de temporada após 25/09 (1x por carreira) | "🔨 JOGADOR DA FASE BETA — Você ganhou mais 2 temporadas grátis." | Assinar ou **Continuar grátis (N temporadas)** |

O lado esquerdo do popup é personalizado pelo resultado da temporada — 5 situações: **Campeão**, **Subiu de divisão**, **Faltou pouco** (terminou até 3 posições abaixo da zona de acesso), **Temporada de construção** (meio de tabela) e **Recomeço** (rebaixado) — e traz até **3 dicas** tiradas do que aconteceu (caixa no vermelho ou prejuízo, elenco fraco para a divisão, eliminação cedo em copa, muitas lesões ou elenco esgotado, defesa muito vazada, nenhuma contratação).

Quem é Pro nunca vê o paywall. No Modo Resenha ele não existe (quem vira a temporada lá é o servidor).

### A escada das temporadas grátis
No bloqueio, o Peladeiro recebe **uma saída grátis por vez**, com o mesmo destaque do botão de assinar:
1. **"Ganhar 1 temporada grátis — dar minha opinião"**: escrever o que achou do jogo (mínimo **20 caracteres**, máximo 2.000). Botão "Enviar e liberar a temporada". Libera **na hora** (+1 temporada). Mensagem: "✓ Obrigado pela opinião! Temporada liberada."
2. **"Ganhar 1 temporada grátis — postar sobre o jogo"**: colar o link de um post ou vídeo sobre o RetroFoot. Redes aceitas: **Instagram, TikTok, YouTube, X/Twitter, Facebook, Threads e Kwai**. Libera na hora (+1). Mensagem: "✓ Valeu pela divulgação! Temporada liberada."
3. Depois disso, **só o Pro**.

Regras:
- Cada saída vale **uma vez por conta** (não por carreira). Apagar o save não renova.
- A temporada extra ganha por opinião/post vale para **qualquer carreira da conta**.
- O texto/link vai para a equipe. A liberação é automática; ninguém aprova à mão.
- Erros possíveis: "Escreva um pouco mais — pelo menos 20 caracteres." · "Esse link não parece ser de uma rede social (…)" · "Você já usou a sua temporada por opinião/post."

### Veteranos (jogadores da fase Beta)
- Toda carreira do plano gratuito que, no lançamento das regras (25/09), **já tinha passado da 1ª temporada** ganhou **a temporada atual + 2 viradas** de cortesia (limite = temporada em curso + 2). Contagem por carreira. Em 25/09 eram 28 carreiras (18 contas).
- Carreiras novas seguem a regra de 1 temporada.
- Quem era Pro no lançamento **não** entrou como veterano. Se cancelar o Pro depois, uma carreira longa fica sem poder virar a temporada (joga a temporada gravada, mas não avança).
- Essa regra foi confirmada pelo dono em 27/09 e não deve ser discutida com o jogador como "negociável".

### Lembretes no meio da temporada
Para quem está logado e não é Pro, aparecem até 3 lembretes do Pro por temporada, uma vez cada: **Temporada nova** (a partir da 1ª rodada), **Virada do turno** (metade do campeonato) e **Reta final** (~80% das rodadas ou 5 rodadas antes do fim). Não repetem ao recarregar a página. Botão para fechar: **Continuar no Peladeiro**.

### Save recusado ("ESTA TEMPORADA NÃO ESTÁ SENDO SALVA")
O servidor recusa gravar uma temporada acima do limite. Isso pode acontecer, por exemplo, com uma aba antiga aberta, ou quando alguém cancela o Pro com o jogo aberto e vira a temporada. Então aparece o popup "⚠️ ESTA TEMPORADA NÃO ESTÁ SENDO SALVA — Seu plano Peladeiro não grava esta temporada." Fechar volta ao **último ponto salvo** ("Voltando ao último ponto salvo da sua carreira…"). O jogo relê o plano antes da virada para evitar esse caso. O save no servidor **nunca é alterado nem apagado** pela trava: ela só recusa gravar o que passa do limite.

### Perguntas frequentes
- **Terminei a temporada e o jogo não deixa continuar.** É o limite do Peladeiro (1 temporada por carreira). Opções: assinar o Pro, ou usar a temporada grátis por opinião e depois a por post, se ainda não usou.
- **Usei a opinião numa carreira; posso usar de novo em outra?** Não; é uma por conta. Mas a temporada extra vale para todas as carreiras da conta.
- **O popup aparece toda hora.** Provavelmente é o caso "save recusado" (aba antiga ou plano mudou com o jogo aberto). Peça para recarregar a página; se for Pro, conferir se o pagamento está ativo.
- **Perdi o que joguei depois da recusa?** O que foi jogado acima do limite não foi gravado; o jogo volta ao último ponto salvo na nuvem.

Referência técnica: `public/src/ui/rf26-paywall.js` (`rfPwAntesDaVirada`, `rfPwDecidir`, `rfPwSaida`, `rfPwEnviar`), `rf26-planos.js` (`rfUpMarcoRodada`, `RF_UP_MOTIVOS`), SQL `elifoot_v3.rf_temporadas`, `rf_liberar_temporada`, `planos_lancar`, trigger `solo_saves_temporadas` (erro `PLANO_TEMPORADAS`).

---

## Assinar o Pro: checkout Stripe, cartão e Pix

### Caminhos para assinar
- Página inicial → **Planos** → cartão do Pro → **Assinar o Pro**; ou seção "Plano Pro" → **👑 Assinar o Pro — R$ 19,90/mês**.
- Dentro do jogo: **Minha Conta** → cartão do Pro; qualquer 🔒 de plano; os lembretes; o paywall de fim de temporada.
- **Link direto `retrofoot.com.br/?pro`** (ou `?pro=ano`, que já abre no anual): abre a oferta do Pro assim que a página carrega. Usado nos e-mails. Quem já é Pro vê "Você já é Pro. Bom jogo!".

### O fluxo
1. Popup do Pro ("A carreira não para na 1ª temporada"): escolher **Mensal** ou **Anual**, e **PAGAR COM**: **Cartão** ou **Pix**. Botão **Assinar o Pro — R$ X/mês|ano**. Fechar: **Agora não**.
2. **Sem conta/sem login**: aparece "Crie a sua conta (ou entre) para assinar o Pro." e o jogo leva ao cadastro. A intenção fica guardada: logo depois do login, o checkout abre sozinho.
3. Abre a página de pagamento do **Stripe**. De dentro do jogo ela abre **em outra aba** (para não perder a partida); da página inicial abre na mesma aba.
4. Depois de pagar, o Stripe volta ao site e o jogo mostra "Confirmando o pagamento…" e, quando o servidor confirma, "PAGAMENTO CONFIRMADO — Agora a carreira não para, treinador." com botão **Voltar para a minha carreira**. O comprovante vai para o e-mail da conta.
5. Se vier do paywall, a tela fica em "⏳ AGUARDANDO O PAGAMENTO — Termine o pagamento na aba do Stripe." e confere sozinha a cada 5 segundos (por até 20 minutos). Há o botão **Já paguei — continuar**. Quando confirma: "✓ Bem-vindo ao Pro! Bora para a próxima temporada." e a temporada vira **com o save intacto**.

### Cartão × Pix
- **Cartão** = assinatura: renova sozinha todo mês (ou todo ano). Cancela quando quiser.
- **Pix** = pagamento **único** do período (1 mês ou 1 ano), **sem renovação automática**. Quando vencer, é só pagar outro Pix. O QR do Pix expira em **30 minutos**; passado isso nada é cobrado nem concedido. Pagar Pix de novo antes de vencer soma o período (não perde os dias restantes).
- Quem já tem assinatura ativa no cartão não pode pagar Pix por cima: "Você já tem uma assinatura ativa no cartão. O Pix fica para depois que ela acabar."
- Se o Pix não estiver habilitado na conta Stripe, a mensagem é "O Pix ainda não está disponível. Por enquanto, assine com o cartão." (não é possível confirmar pelo código se o Pix está ativo hoje).

### Quem concede o plano
Só o servidor, depois que o Stripe confirma o pagamento. Voltar à página com "assinatura=ok" **não** libera nada sozinho. Normalmente leva segundos. Se passar de ~30 segundos, a tela diz "O pagamento está sendo confirmado. … Se em alguns minutos nada mudar, fale com a gente — nenhuma cobrança se perde." Se a pessoa voltou do Stripe sem estar logada: "Entre na conta que fez a assinatura." (o plano fica na conta, não no aparelho).

### Mensagens de erro do checkout
- "O pagamento não carregou nesta aba. Recarregue a página e tente de novo."
- "Não consegui abrir o pagamento agora. Tente de novo em instantes."
- Bloqueador de pop-up: se a nova aba for bloqueada, o jogo troca a própria página para o Stripe.

### Perguntas frequentes
- **Paguei e continuo Peladeiro.** Confirmar que entrou na **mesma conta** usada no pagamento; esperar alguns minutos (o Stripe avisa o servidor de forma assíncrona); recarregar a página. Se o Pix foi gerado mas não pago em 30 min, nada foi cobrado. Persistindo, escale com o e-mail da conta e a data do pagamento.
- **Posso pagar por um link de pagamento do Stripe que alguém me mandou?** Não use. Só o botão do jogo (ou o link `?pro`) liga o pagamento à conta; um link solto do Stripe não sabe quem pagou.
- **O Pix renova sozinho?** Não. Vale 1 mês ou 1 ano e depois é preciso pagar de novo.

Referência técnica: `rf26-landing.js` (`rfPlanoCta`, `rfPlanoEscolherForma`, `rfPlanoIntencaoRetomar`), `rf26-planos.js` (`rfUpPopupPlano`), `public/src/ui/rf-link-pro.js`, `public/src/ui/rf26-pagamento.js`, `supabase/functions/criar-checkout`, `supabase/functions/stripe-webhook`.

---

## Portal da assinatura: cancelar, trocar cartão, faturas

- **Onde fica no jogo:** barra lateral → **Minha Conta** → botão **Gerir assinatura** (só aparece para quem é Pro). Abre o portal do Stripe em outra aba.
- No portal a pessoa pode **cancelar**, **trocar mensal/anual**, **trocar o cartão** e **ver faturas**.
- **Cancelamento**: impede novas cobranças; o Pro continua valendo **até o fim do período já pago**. No fim do período a conta volta sozinha ao Peladeiro.
- O servidor dá **2 dias de folga** depois do fim do período pago antes de rebaixar (para um atraso do Stripe não trancar quem pagou). Se o cartão for recusado na renovação ("past_due"), o acesso continua enquanto o Stripe tenta cobrar; quando ele desiste, a conta volta ao Peladeiro.
- Quem paga por Pix ou tem plano de cortesia da equipe não tem assinatura no Stripe: o botão responde "Seu plano não tem cobrança no Stripe — não há assinatura para gerir."
- **Trocar de plano** gera uma assinatura nova e cancela a antiga com rateio (o que sobrou vira crédito na próxima fatura).
- Os termos de uso citam o direito de arrependimento do art. 49 do CDC. Reembolso é tratado pela equipe (o sistema registra reembolsos feitos no Stripe), então pedidos de reembolso devem ser escalados.

### Perguntas frequentes
- **Como cancelo?** Minha Conta → Gerir assinatura → cancelar no portal do Stripe. Continua Pro até o fim do período pago.
- **Cancelei e perdi minha carreira?** Não. Nada é apagado. Mas, no Peladeiro, carreiras que já passaram da 1ª temporada não conseguem virar para a próxima; ao voltar ao Pro, seguem normalmente.
- **Não vejo o botão Gerir assinatura.** Ele só aparece para contas Pro. Se a pessoa paga e não é Pro no jogo, ver "Paguei e continuo Peladeiro".

Referência técnica: `supabase/functions/portal-assinatura`, `rf26-planos.js` (`rfUpGerirAssinatura`), `stripe-webhook` (`FOLGA_MS`, `VIVOS`), `seo/legal.mjs` (termos).

---

## Treinador e avatar

- A identidade do treinador (nome, idade, cara) é criada no onboarding (passo "Treinador").
- **Nome**: até 12 caracteres, do jeito que foi escrito (sem forçar maiúsculas). Pode ser trocado depois em **Treinador → Perfil → Trocar o nome** (leva às Opções).
- **Idade**: 25 a 75, envelhece 1 ano por temporada. Saves antigos, de antes desse campo, começam em 36.
- **Cara**: foto própria (JPG/PNG/WebP até 2 MB), face desenhada (5 por gênero) ou retrato por IA. A foto fica no perfil da conta e aparece na ficha do treinador, nas entrevistas, no ranking e na Resenha. Trocar: **Configurações → Perfil**.
- **Retrato por IA**: hoje aparece como **"Em breve"** com 🔒 para Peladeiro e Pro. Ao clicar: "O retrato por IA vem aí — … vai ser um item à parte, e chega em breve." Só contas do antigo Embaixador ainda têm o direito, e mesmo assim **1 geração por conta** (depois de gerar, o cartão só permite escolher o retrato já gerado).
- **Página Treinador** (barra lateral): abas **Carreira, História, Sala de Troféus, Ranking, Ofertas, Perfil, Meu jogador**. A aba "Ranking" dessa página é o ranking **interno do save** (treinadores dos clubes da divisão, calculado pelo jogo), diferente do ranking global de treinadores. Em Perfil há **Encerrar a carreira**. No topo, **Exportar carreira** e **Ver ofertas**.

### Perguntas frequentes
- **Como coloco minha foto no ranking?** Configurações → Perfil → enviar foto. Sem foto, aparecem as iniciais.
- **Quero o avatar por IA.** Ainda não está à venda; será um item avulso "em breve". O Pro não inclui.

Referência técnica: `rf26-fluxo.js` (`rfTreinadoresHTML`, `rfAvatarBlocoHTML`), `rf26-treinador.js`, `rf26-landing.js` (`RF_TRAVAS.avatar`, `rfPodeAvatarIA`), edge function `coach-avatar`.

---

## "Meu jogador" (jogador na base oficial)

- Era um benefício do antigo plano **Embaixador**: colocar o próprio nome e a própria cara num jogador real da base oficial (4 vagas por clube, nos 80 clubes das 4 divisões, nas duas modalidades — 640 vagas). O jogador então aparece nos elencos de **todos** os treinadores.
- **Situação atual:** saiu da vitrine em 25/09. O **Pro não inclui**. Vai voltar como item avulso, "em breve". Quem já tem jogador aprovado **mantém**.
- **Onde fica no jogo:** **Treinador → Meu jogador**. Para quem não é Embaixador aparece: "Pôr o seu nome e a sua cara num jogador da base oficial … vai ser um item à parte, e chega em breve."
- Para quem já tem, a aba mostra o status:
  - **Em análise**: "A gente revisa o nome e a foto antes de entrarem na base de todo mundo — em até 48 horas."
  - **Aprovado**: "Ele já está no pack oficial: aparece nos saves novos, de todos os treinadores."
  - **Recusado**: mostra o motivo registrado pela moderação.
- Regras: nome de até **16 caracteres**; "vale apelido, mas nada de ofensa — a moderação reprova e a vaga volta para a fila". Foto só do próprio titular, maior de 18 anos (termos). O jogador aprovado entra **só nos saves novos** — um save em andamento mantém o elenco antigo até a próxima carreira. Há o botão **Largar a vaga**.
- Pelos termos, ao cancelar o Embaixador o jogador personalizado é retirado ao fim do período contratado e a vaga volta para a fila.

### Perguntas frequentes
- **Meu jogador foi aprovado e não aparece no meu save.** Ele só entra em saves criados depois da aprovação.
- **Assinei o Pro, onde crio meu jogador?** O Pro não inclui esse recurso; ele virá como item avulso.

Referência técnica: `public/src/ui/rf26-meujogador.js` (`rfMjHTML`, `rfMjPassoVale`), `seo/legal.mjs`.

---

## Ranking de treinadores

- **Onde fica no jogo:** barra lateral → **Ranking** ("Ranking dos treinadores"). Há também uma faixa com o top e "A SUA POSIÇÃO" no topo do jogo.
- É um ranking **global**, somando **Modo Solo e Modo Resenha**, de todos os treinadores com conta.
- Mostra o **pódio** (1º, 2º, 3º, com foto ou iniciais) e a tabela: POS, variação na semana (▲/▼), TREINADOR, ÚLTIMO SAVE (clube e modo), TÍTULOS, CAMPANHA, TOTAL.

### Como os pontos são calculados (regra "v2", desde 23/09/2026)
**Campanha (por temporada):**
- Pontos da liga × fator da divisão: **Série A 1,0 · B 0,9 · C 0,8 · D 0,7**.
- + pontos de copa: **3 por vitória, 1 por empate** (fator 1,0). Empate que foi para os pênaltis conta 1.
- + **10 pontos** por temporada terminada.

**Títulos:** cada título vale **40 + 6 × peso da competição**. Pesos no Brasil:

| Título | Peso | Pontos no ranking |
|---|---|---|
| Liberta Cup (Libertadores) | 20 | 160 |
| Série A | 15 | 130 |
| Copa da Federação (copa nacional) | 12 | 112 |
| Copa de Clubes da América (Sul-Americana) | 10 | 100 |
| Série B | 3 | 58 |
| Série C | 1 | 46 |
| Série D | 0,5 | 43 |

O texto explicativo na tela simplifica ("cada vitória vale 3 e cada empate 1, na liga e nas copas, mais 10 por temporada terminada") e não menciona o fator de divisão da liga — a conta real aplica o fator.

### Períodos: Dia / Semana / Mês / Sempre
- **Sempre** = total acumulado ("CLASSIFICAÇÃO GERAL").
- **Dia / Semana / Mês** = pontos **ganhos no período** (total de agora menos uma "foto" tirada no início do período). A foto é tirada **todo dia às 00h05 (horário de Brasília)**. A semana começa na **segunda-feira**; o mês, no dia 1.
- A seta ▲/▼ do "Sempre" compara a posição atual com a da foto de segunda-feira; quem não estava na foto aparece com "—".

### Quando atualiza
- Os pontos chegam ao servidor a cada gravação do save na nuvem (fim de rodada, com intervalo mínimo de ~2 minutos entre gravações automáticas).
- A tela guarda a lista por **10 minutos**; depois disso, ao abrir de novo, busca a versão nova.

### Filtros "Global / Amigos / Minhas resenhas"
Os botões existem na tela, mas no código atual **só mudam o rótulo**: a lista mostrada é sempre a global. Não prometa filtro por amigos.

### Perguntas frequentes
- **Meus pontos não mudaram.** Espere até 10 minutos e reabra a página; os pontos só sobem depois que o save grava na nuvem (fim de rodada).
- **Por que meu título da Série D vale tão pouco?** Cada título pesa pela competição: Série D = 43 pontos, Série A = 130, Liberta Cup = 160.
- **Não apareço no ranking.** É preciso ter jogado com a conta logada e o save ter gravado na nuvem. O ranking identifica pelo nome do treinador.
- **Minha foto não aparece.** Enviar em Configurações → Perfil.

Referência técnica: `public/src/ui/rf26-ranking.js` (`RF_RANK_PERIODOS`, `RF_RANK_VALIDADE`), `public/src/engine/core.js` (`RANKING_*`, `pontosDeTitulo`, `pontosDeTemporadaRanking`), `scripts/sql/ranking_v2_periodos.sql` (`rf_ranking`, `rf_fechar_dia`).

---

## Grupo do WhatsApp

- Existe um grupo oficial da comunidade no WhatsApp. O convite aparece em três lugares, todos com o mesmo link:
  1. **Modal pós-cadastro** (uma vez, logo depois de criar a conta): "✓ CONTA CRIADA! Agora entra pro grupo da resenha", com os benefícios "Ache adversário pro Modo Resenha", "Saiba antes das novidades", "Fale direto com quem faz o jogo" e o botão **Entrar no Whatsapp da Resenha** ("GRÁTIS · ABRE NO WHATSAPP"). Não tem ✕: fecha com Esc ou clicando fora.
  2. **Páginas públicas** (home e páginas do site): pílula verde no canto inferior direito.
  3. **Dentro do jogo**: no computador, cartão verde-escuro no pé da barra lateral; no celular, uma lingueta na borda direita.
- O ícone dá uma "tremida" discreta a cada 10 segundos, e para de tremer depois que a pessoa clica em Entrar. As peças somem enquanto há partida ao vivo, leilão, pênaltis ou modal aberto.
- Participar é opcional e grátis.

Referência técnica: `public/src/ui/rf26-grupo-wpp.js` (`RF_WHATSAPP_URL`, `CTA`).

---

## Aba "Dar opinião"

- **Removida em 23/09/2026.** O botão/aba de opinião não aparece mais no jogo; o grupo do WhatsApp cumpre esse papel.
- A única "opinião" existente hoje é a do **paywall de fim de temporada** (dar opinião = +1 temporada grátis, uma vez por conta).

Referência técnica: `public/src/ui/rf26-opiniao.js` (fora do `index.html`).

---

## E-mails que o jogador recebe

Remetentes: **"O Presidente · RetroFoot"** (boas-vindas, dicas e reengajamento) e **"RetroFoot"** (newsletter, novidades, time do coração). As respostas vão para o endereço de suporte. Todos os links têm parâmetros de rastreamento (utm).

### Automáticos
| Quando | E-mail |
|---|---|
| Cadastro (dia 0) | **Boas-vindas** — Modo Solo, Modo Resenha, grupo do WhatsApp, guia com vídeo |
| Dia 1 | **Dica do Presidente 1** — janela de transferências (rodadas 1–10), reforçar o setor fraco |
| Dia 2 | **Dica 2** — caixa: patrocínio do ano entra na 1ª rodada, o Contador, caixa no vermelho |
| Dia 4 | **Dica 3** — rodízio: energia, moral, suspensão por vermelho, 2 goleiros |
| Dia 6 | **Dica 4** — evolução: treino especial (3 vagas, grátis), base (1 por janela) |
| Dia 9 | **Dica 5** — copa: a Copa da Federação paga por fase |
| Dia 12 | **Dica 6** — acesso: 4 primeiros sobem, janela reabre (rodadas 21–30) |
| Dia 15 | **Dica 7** — fim de temporada: segurança no cargo, a virada, opinião = temporada grátis |
| Esqueci minha senha | "Redefina sua senha — RetroFoot98" (link de 30 min, uso único) |
| Pagamento | Comprovante do Stripe no e-mail da conta |

A sequência de onboarding (boas-vindas + 7 dicas) está **ligada desde 28/09/2026** e vale **só para cadastros novos** (a base antiga não entra). Ela é por dias desde o cadastro, não pelo progresso no jogo.

### Por segmento / campanhas
- **Ativação** ("Jogue a 1ª rodada"): para quem se cadastrou e não jogou, ou parou antes da 2ª rodada (enviado em 28/09).
- **Conversão para o Pro**: para quem ficou travado no paywall e para quem está numa temporada extra grátis (usam o link `?pro`).
- **Sentimos sua falta**: inativos há 7+ dias.
- **Newsletter mensal** e **Novidade** (lançamento de recurso): para todos.
- **Time do coração**: para contas sem essa resposta — preparado, mas o link de resposta ainda não funciona no jogo (ver tópico próprio).

### Perguntas frequentes
- **Recebi dicas mas já passei dessa fase.** A sequência é por dias desde o cadastro, então pode chegar dica "atrasada".
- **Não recebo nenhum e-mail.** Conferir spam/promoções e o e-mail da conta. Contas antigas (antes de 28/09) não recebem a sequência de boas-vindas.
- **Quero parar de receber.** Usar o link de descadastro no rodapé do e-mail; se não resolver, escalar.

Referência técnica: `docs/emails-onboarding.md`, `scripts/build-emails.mjs`, `supabase/functions/send-password-reset`.
