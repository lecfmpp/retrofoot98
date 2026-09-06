// ============================================================================
// PÁGINAS LEGAIS — RetroFoot
// Mesmo gerador das páginas de conteúdo (scripts/build-seo.mjs), lista separada
// de propósito: estas não são marketing. Não levam "resumo rápido", nem FAQ, nem
// cartão de referência, nem entram na grelha "Conheça o RetroFoot" da home —
// entram no rodapé, que é onde se procura por elas.
//
// ORIGEM DO TEXTO: rascunhos do Bruno (Drive, 04/09/2026). O que está aqui NÃO é
// cópia literal deles: os rascunhos traziam marcadores por preencher ([DATA],
// [RAZÃO SOCIAL], [CNPJ], [NOME DO PROCESSADOR DE PAGAMENTO]) e notas de revisão
// endereçadas ao dono ("Só publiquem as categorias...", "[manter esta frase
// somente se for tecnicamente verdadeiro]"). Publicar isso como termos vigentes
// seria pôr no ar um documento que ainda está a perguntar coisas.
//
// CADA AFIRMAÇÃO TÉCNICA FOI CONFERIDA CONTRA O CÓDIGO — um texto legal que
// descreve errado o que o produto faz é pior do que não existir:
//  · processador de pagamento = Stripe (supabase/functions/criar-checkout e
//    stripe-webhook; a tabela elifoot_v3.stripe_customers);
//  · a foto do Embaixador é apagada LOGO APÓS a geração, dando certo ou dando
//    errado (o `finally` de supabase/functions/player-avatar/index.ts remove-a do
//    bucket privado). O rascunho prometia menos do que o código já faz;
//  · o retrato é gerado pela OpenAI (gpt-image-1) — transferência internacional
//    real, e por isso declarada;
//  · ao cair do Embaixador, o jogador volta para a fila e recupera o nome de base
//    (vaga_liberar_do_usuario, chamada dentro do `gravar` do stripe-webhook);
//  · analítica = Google Analytics 4 (G-YE7PT01DGY, em public/index.html), que
//    carrega em toda visita. NÃO HÁ banner de consentimento nem painel "Gerenciar
//    Cookies": o Aviso descreve o que existe hoje, e o banner é a tarefa seguinte.
//
// DECISÕES DO DONO (04/09/2026): não há CNPJ — o texto não afirma pessoa jurídica
// nenhuma; contato único em suporte@retrofoot.com.br; o recurso de foto é 18+ (por
// enquanto declarado no texto, com a validação no jogo por fazer).
// ============================================================================

const ATUALIZADO = '5 de setembro de 2026';
const CONTATO = 'suporte@retrofoot.com.br';

/* o rodapé de cada página legal aponta para as outras duas: quem chega aos Termos
   procurando a Privacidade não deve ter de voltar à home para a encontrar */
const verTambem = atual => {
  const todas = [
    ['privacidade', 'Política de Privacidade'],
    ['termos', 'Termos de Uso'],
    ['cookies', 'Aviso de Cookies'],
  ].filter(([s]) => s !== atual);
  return `<aside class="legal-ver">
    <span class="legal-ver-t">Ver também</span>
    ${todas.map(([s, t]) => `<a href="/${s}/">${t}</a>`).join('')}
  </aside>`;
};

const cabecalho = `<p class="legal-data">Última atualização: <strong>${ATUALIZADO}</strong></p>`;

export const legal = [

  // ============================== PRIVACIDADE ==============================
  {
    slug: 'privacidade', ready: true, legal: true, priority: 0.3, lastmod: '2026-09-05',
    title: 'Política de Privacidade',
    description: 'Como o RetroFoot coleta, usa, guarda e protege os dados de quem joga — incluindo a foto do Plano Embaixador, que é apagada logo depois de gerar o avatar.',
    h1: 'Política de Privacidade',
    body: `
${cabecalho}
<p class="lead">A sua privacidade também entra em campo. Esta Política explica como o RetroFoot
coleta, utiliza, armazena e protege os dados pessoais de quem acessa o site, cria uma conta, joga,
participa do Modo Resenha, contrata um plano ou entra em contato conosco.</p>
<p>O RetroFoot é um projeto independente, mantido pela equipe responsável pelo serviço, que pode ser
contatada a qualquer momento pelo e-mail <a href="mailto:${CONTATO}">${CONTATO}</a>. Ao utilizar o
RetroFoot, você declara ter lido esta Política e estar ciente das práticas aqui descritas.</p>

<h2>Quais dados podemos coletar</h2>
<p>Dependendo de como você usa o RetroFoot, podemos tratar informações como nome, nome de usuário,
e-mail, senha protegida por mecanismos de segurança, informações do perfil, plano contratado e
histórico relacionado à conta.</p>
<p>Também registramos informações do uso do jogo: clubes, saves, partidas, competições, interações
dentro do Modo Resenha, configurações, progresso e outras ações necessárias para o funcionamento da
experiência.</p>
<p>Quando você faz uma assinatura, dados relacionados à transação são tratados. Os dados completos
do cartão <strong>não passam por nós</strong>: são processados diretamente pela <strong>Stripe</strong>,
de acordo com as regras e políticas próprias desse fornecedor. Guardamos apenas o identificador que
liga a sua conta à assinatura, o plano contratado e a data de validade.</p>
<p>Também podemos coletar dados técnicos, como endereço IP, tipo de dispositivo, navegador, sistema
operacional, identificadores de sessão, registros de acesso e informações sobre desempenho e erros.</p>
<p>Se você entrar em contato conosco, podemos armazenar as informações da mensagem e os dados
necessários para responder ao atendimento.</p>

<h2>Para que utilizamos esses dados</h2>
<p>Para criar e administrar a sua conta, disponibilizar o jogo, manter os seus saves e partidas,
executar as funcionalidades multiplayer, processar assinaturas e pagamentos, oferecer suporte,
melhorar o desempenho do jogo, prevenir fraudes e abusos e cumprir obrigações legais.</p>
<p>Também usamos informações de uso de forma agregada ou anonimizada para entender como o RetroFoot
é utilizado e desenvolver novos recursos.</p>
<p>Mensagens promocionais só são enviadas quando houver base legal adequada e, quando necessário,
com a sua autorização. Você pode deixar de recebê-las a qualquer momento.</p>

<h2>Plano Embaixador: a sua foto e o seu jogador</h2>
<p>Quem assina o Plano Embaixador pode, se quiser, enviar uma fotografia própria para que seja criado
um jogador personalizado inspirado na sua aparência. <strong>O envio é opcional</strong> e o recurso é
destinado exclusivamente a maiores de 18 anos.</p>
<p><strong>A fotografia original não fica guardada.</strong> Ela é enviada para um espaço privado,
usada para gerar o retrato e apagada em seguida — dando certo ou dando errado. O que permanece
vinculado à sua conta é apenas o avatar gerado.</p>
<p>Para gerar o retrato, a fotografia é transmitida ao nosso fornecedor de geração de imagem, a
<strong>OpenAI</strong>, exclusivamente para essa finalidade. Isso significa que há
<strong>transferência internacional</strong> desse dado, tratada na seção abaixo.</p>
<p>O avatar gerado pode aparecer para outros jogadores durante partidas, telas de elenco, competições,
rankings e outras áreas do jogo — é essa a função dele. O avatar passa por adaptações artísticas para
manter o padrão visual do RetroFoot e, portanto, <strong>não é uma reprodução fotográfica exata</strong>
da pessoa.</p>
<p>A sua fotografia e o seu avatar <strong>não são usados em publicidade, redes sociais ou materiais
promocionais</strong> do RetroFoot sem uma autorização adicional e específica sua.</p>
<p>Não usamos a fotografia enviada para reconhecimento facial, autenticação biométrica ou qualquer
forma de identificação biométrica.</p>
<p>Ao cancelar o Plano Embaixador, o jogador personalizado é retirado ao final do período já
contratado: a vaga volta para a fila e o atleta recupera o nome de base. Você também pode pedir a
remoção do avatar antes disso, pelo e-mail de contato.</p>

<h2>Compartilhamento de dados</h2>
<p><strong>Não vendemos dados pessoais.</strong></p>
<p>Compartilhamos informações apenas quando necessário para o funcionamento do RetroFoot — com
provedores de hospedagem e infraestrutura, serviços de e-mail, processadores de pagamento,
ferramentas de segurança, análise de desempenho e o fornecedor responsável pela geração do avatar do
Plano Embaixador. Cada fornecedor recebe somente os dados necessários para executar o seu serviço.</p>
<p>Também podemos compartilhar informações quando isso for necessário para cumprir obrigação legal,
ordem judicial, proteger direitos ou prevenir fraude e atividades ilícitas.</p>

<h2>Transferência internacional</h2>
<p>Parte dos fornecedores que usamos armazena ou processa dados fora do Brasil — é o caso da
infraestrutura do jogo, do processamento de pagamentos e da geração do avatar do Plano Embaixador.
Quando houver transferência internacional de dados pessoais, adotamos mecanismos e medidas
compatíveis com a legislação aplicável de proteção de dados.</p>

<h2>Por quanto tempo mantemos os dados</h2>
<p>Pelo período necessário para prestar os serviços, cumprir as finalidades descritas nesta Política,
proteger direitos e cumprir obrigações legais ou regulatórias. Quando uma informação deixar de ser
necessária, ela poderá ser excluída ou anonimizada, observadas as hipóteses legais que permitam a sua
conservação.</p>

<h2>Segurança</h2>
<p>Adotamos medidas técnicas e administrativas razoáveis para proteger informações contra acessos não
autorizados, perda, alteração, divulgação ou destruição indevida. Nenhum sistema conectado à internet
é completamente imune a incidentes, mas buscamos práticas compatíveis com a natureza dos dados e com
os riscos envolvidos.</p>

<h2>Os seus direitos</h2>
<p>Nos termos da LGPD, você pode solicitar, conforme aplicável: confirmação sobre o tratamento dos
seus dados, acesso, correção, atualização, anonimização, bloqueio ou eliminação, informações sobre
compartilhamento, portabilidade quando regulamentada e aplicável, oposição ao tratamento e revogação
de consentimento.</p>
<p>O exercício desses direitos é <strong>gratuito</strong>. Para exercê-los, escreva para
<a href="mailto:${CONTATO}">${CONTATO}</a>. Podemos pedir informações adicionais para confirmar a sua
identidade e proteger a conta contra pedidos fraudulentos.</p>

<h2>Crianças e adolescentes</h2>
<p>O recurso de envio de fotografia e criação de avatar do Plano Embaixador é destinado
<strong>exclusivamente a maiores de 18 anos</strong>. Caso o RetroFoot venha a permitir essa
funcionalidade para menores, esta Política e os procedimentos de autorização serão adaptados antes da
disponibilização do recurso.</p>

<h2>Alterações desta Política</h2>
<p>Esta Política pode ser atualizada para refletir mudanças no RetroFoot, nos seus recursos ou nas
exigências legais. Quando a alteração for relevante, comunicaremos pelos canais disponíveis.</p>

<h2>Contato</h2>
<p>Para dúvidas sobre privacidade e proteção de dados, escreva para
<a href="mailto:${CONTATO}">${CONTATO}</a>.</p>
${verTambem('privacidade')}`,
  },

  // ================================ TERMOS ================================
  {
    slug: 'termos', ready: true, legal: true, priority: 0.3, lastmod: '2026-09-05',
    title: 'Termos de Uso',
    description: 'As regras de uso do RetroFoot: conta, planos e assinaturas, o jogador personalizado do Plano Embaixador, convivência no Modo Resenha e integridade do jogo.',
    h1: 'Termos de Uso',
    body: `
${cabecalho}
<p class="lead">Bem-vindo ao RetroFoot. Estes Termos estabelecem as regras para utilização do site, do
jogo, dos recursos multiplayer, dos planos pagos e dos demais serviços oferecidos.</p>
<p>Ao criar uma conta ou utilizar o serviço, você concorda com estes Termos e com a nossa
<a href="/privacidade/">Política de Privacidade</a>.</p>

<h2>O RetroFoot</h2>
<p>O RetroFoot é um jogo de gerenciamento de futebol que permite administrar clubes, jogadores,
escalações, competições, mercado, finanças, partidas e outras funcionalidades disponibilizadas ao
longo da experiência. Alguns recursos variam conforme o plano contratado.</p>
<p>O RetroFoot é um <strong>produto independente</strong> e não possui vínculo com clubes, atletas,
federações ou competições reais, salvo quando essa relação for expressamente informada.</p>

<h2>A sua conta</h2>
<p>Para usar determinadas funcionalidades é necessário criar uma conta. Você é responsável por
fornecer informações corretas, manter as suas credenciais protegidas e pelas atividades realizadas na
sua conta.</p>
<p>A conta é pessoal e não deve ser vendida, emprestada ou transferida a terceiros sem autorização do
RetroFoot.</p>

<h2>Planos e assinaturas</h2>
<p>O RetroFoot oferece modalidades gratuitas e pagas, com benefícios e funcionalidades diferentes. O
preço, o período de cobrança, os recursos incluídos e as condições de renovação são apresentados
antes da contratação.</p>
<p>Os pagamentos são processados pela <strong>Stripe</strong>. Assinaturas recorrentes podem ser
canceladas conforme as condições informadas na área da conta: o cancelamento impede novas cobranças,
observadas as regras do ciclo já contratado.</p>
<p>Quando aplicável, o consumidor pode exercer os direitos previstos na legislação brasileira,
inclusive o <strong>direito de arrependimento</strong> em contratações realizadas fora do
estabelecimento comercial, nos termos do art. 49 do Código de Defesa do Consumidor.</p>

<h2>Plano Embaixador e jogador personalizado</h2>
<p>O Plano Embaixador pode incluir a possibilidade de enviar uma fotografia própria para a criação de
um jogador personalizado inspirado na sua aparência. O recurso é destinado a
<strong>maiores de 18 anos</strong>.</p>
<p>O envio da fotografia é opcional e deve ser feito <strong>exclusivamente pelo próprio titular da
imagem</strong>. Não é permitido enviar fotografia de outra pessoa — amigos, familiares, celebridades,
atletas ou terceiros — sem autorização válida.</p>
<p>Ao pedir a criação do jogador, você autoriza o RetroFoot a processar a fotografia e a utilizar o
avatar gerado dentro do jogo, inclusive em partidas, elencos, competições e telas que possam ser
vistas por outros usuários. Essa autorização é <strong>limitada à prestação da funcionalidade
contratada</strong>: ela não autoriza o uso da sua fotografia real ou do seu avatar em publicidade,
redes sociais, anúncios ou campanhas promocionais, o que dependerá sempre de autorização adicional.</p>
<p>O avatar passa por adaptações artísticas e técnicas para manter o padrão visual do RetroFoot e,
portanto, não constitui reprodução fotográfica exata da pessoa.</p>
<p><strong>Em caso de cancelamento do Plano Embaixador, o jogador personalizado é retirado ao final do
período já contratado</strong>: a vaga volta para a fila e fica livre para outro Embaixador. Quem
reassinar depois não recupera a mesma vaga — entra na fila e escolhe outra. Você pode também pedir a
retirada do avatar antes disso, nas condições da
<a href="/privacidade/">Política de Privacidade</a>.</p>

<h2>Regras de convivência</h2>
<p>Recursos sociais, chat e Modo Resenha devem ser usados de maneira respeitosa. Não é permitido usar
o RetroFoot para ameaçar, assediar, discriminar, praticar fraude, divulgar conteúdo ilegal, tentar
obter acesso indevido a outras contas, explorar falhas deliberadamente ou prejudicar a experiência de
outros jogadores.</p>
<p>Contas envolvidas em abuso podem ser advertidas, suspensas ou encerradas, conforme a gravidade da
conduta.</p>

<h2>Integridade do jogo</h2>
<p>É proibido usar scripts, bots, ferramentas de automação, manipulação de resultados, exploração
intencional de vulnerabilidades ou qualquer mecanismo destinado a obter vantagem indevida.</p>
<p>Se você encontrar um erro ou uma vulnerabilidade, avise a nossa equipe.</p>

<h2>Atualizações e mudanças</h2>
<p>O RetroFoot é um jogo em evolução. Recursos, telas, regras, balanceamento, campeonatos, valores
internos e sistemas podem ser ajustados para melhorar a experiência ou manter o equilíbrio do jogo.
Alterações relevantes em planos pagos são comunicadas quando necessário.</p>

<h2>Propriedade intelectual</h2>
<p>O nome RetroFoot, a identidade visual, a interface, os textos, os sistemas, as ilustrações, o
código, os sons e os demais conteúdos próprios são protegidos pela legislação aplicável.</p>
<p>O uso do RetroFoot concede apenas uma licença pessoal, limitada, revogável e não exclusiva para
utilização do serviço conforme estes Termos. Nenhum conteúdo pode ser copiado, vendido, redistribuído
ou explorado comercialmente sem autorização.</p>

<h2>Publicidade</h2>
<p>O RetroFoot pode exibir publicidade e conteúdo de patrocinadores em diferentes áreas do jogo. A
presença de uma marca dentro do jogo não significa que ela participe do desenvolvimento nem que tenha
acesso às conversas e aos dados pessoais dos usuários, salvo quando outra situação for expressamente
informada na <a href="/privacidade/">Política de Privacidade</a>.</p>

<h2>Disponibilidade</h2>
<p>Trabalhamos para manter o RetroFoot disponível e estável, mas podem ocorrer interrupções
temporárias para atualizações, manutenção, falhas técnicas ou situações fora do nosso controle.</p>

<h2>Encerramento da conta</h2>
<p>Você pode pedir o encerramento da sua conta pelos canais disponibilizados. O RetroFoot também pode
suspender ou encerrar contas que violem estes Termos, pratiquem fraude ou coloquem em risco o serviço
ou outros usuários. As consequências do encerramento sobre assinaturas, saves e avatares são
informadas conforme o caso.</p>

<h2>Legislação aplicável</h2>
<p>Estes Termos são regidos pela legislação brasileira, inclusive pelas normas aplicáveis às relações
de consumo. Nenhuma disposição destes Termos busca limitar direitos que não possam ser afastados pela
legislação.</p>

<h2>Contato</h2>
<p>Dúvidas sobre estes Termos: <a href="mailto:${CONTATO}">${CONTATO}</a>.</p>
${verTambem('termos')}`,
  },

  // ================================ COOKIES ================================
  {
    slug: 'cookies', ready: true, legal: true, priority: 0.3, lastmod: '2026-09-05',
    title: 'Aviso de Cookies',
    description: 'Quais cookies e tecnologias semelhantes o RetroFoot usa hoje — os essenciais da sua sessão e o Google Analytics — e como bloquear o que não quiser.',
    h1: 'Aviso de Cookies',
    body: `
${cabecalho}
<p class="lead">No futebol, cookie não entra em campo. No navegador, ajuda o jogo a funcionar. Este
Aviso explica quais cookies e tecnologias semelhantes o RetroFoot usa — e descreve o que acontece
<strong>hoje</strong>, não o que pretendemos fazer.</p>

<h2>O que são cookies</h2>
<p>Cookies são pequenos arquivos ou identificadores guardados no navegador ou no dispositivo durante
a navegação. Servem para permitir funcionalidades essenciais, lembrar preferências, medir o
desempenho do site e entender como os visitantes usam as páginas.</p>
<p>Além dos cookies propriamente ditos, o RetroFoot usa o <strong>armazenamento local do navegador</strong>
(<em>localStorage</em>) para guardar coisas como a sua sessão, o save em andamento e preferências de
tela. Esses dados ficam no seu aparelho.</p>

<h2>O que o RetroFoot usa hoje</h2>
<p><strong>Essenciais.</strong> São necessários para entrar na conta, manter a sessão aberta, guardar
o seu progresso e proteger o serviço. Sem eles o jogo não funciona.</p>
<p><strong>Análise.</strong> Usamos o <strong>Google Analytics 4</strong> para entender, de forma
estatística, quantas pessoas visitam o site, por onde chegam e quais telas usam. Esses dados nos
ajudam a decidir o que melhorar.</p>
<p><strong>Vídeo.</strong> Os vídeos incorporados no site usam o modo sem cookies do YouTube
(<em>youtube-nocookie.com</em>) e só são carregados quando você aperta o play.</p>
<p><strong>Pagamento.</strong> Ao assinar um plano, o checkout é operado pela <strong>Stripe</strong>,
que usa os próprios cookies para segurança e prevenção de fraude, conforme as políticas dela.</p>
<p><strong>Publicidade.</strong> O RetroFoot exibe anúncios de patrocinadores em espaços próprios do
jogo. Esses anúncios são servidos pela nossa própria infraestrutura e
<strong>não usam cookies de rastreamento publicitário</strong> hoje. Se isso mudar, este Aviso será
atualizado antes.</p>

<h2>Como controlar os cookies</h2>
<p>Sejamos diretos: <strong>o RetroFoot ainda não tem um painel de gerenciamento de cookies</strong>.
Estamos construindo um, com as opções de aceitar, recusar os não essenciais e escolher categoria a
categoria — como recomenda a ANPD. Enquanto ele não existe, os cookies de análise são carregados
junto com o site.</p>
<p>Até lá, você pode controlá-los pelo próprio navegador: todos permitem bloquear ou apagar cookies
de um site, e a maioria oferece um modo de navegação privada. O Google Analytics também pode ser
bloqueado com a <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener external">extensão
oficial de desativação do Google</a>. Bloquear os cookies essenciais impede o login e o
funcionamento do jogo.</p>
<p>Assim que o painel estiver no ar, este Aviso será atualizado e a escolha passará a ficar com
você, na primeira visita.</p>

<h2>Por quanto tempo permanecem</h2>
<p>Alguns cookies são apagados quando o navegador fecha. Outros permanecem por um período
determinado. Buscamos limitar a duração ao tempo necessário para cumprir a finalidade de cada um.</p>

<h2>Atualizações</h2>
<p>Este Aviso é atualizado sempre que novas tecnologias, ferramentas ou fornecedores forem
incorporados ao RetroFoot — e será atualizado quando o painel de cookies entrar no ar.</p>

<h2>Contato</h2>
<p>Dúvidas sobre cookies e privacidade: <a href="mailto:${CONTATO}">${CONTATO}</a>.</p>
${verTambem('cookies')}`,
  },
];
