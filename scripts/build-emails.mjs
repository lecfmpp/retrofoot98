/* ===== TEMPLATES DE E-MAIL DO RETROFOOT (27/09/2026) =====
   Gera emails/templates/<alias>.html — a fonte da verdade dos templates que estão no Resend
   (mesmo alias lá). Rodar `node scripts/build-emails.mjs` e colar/atualizar no Resend.

   Mesma pele do e-mail de senha (supabase/functions/send-password-reset): tabela, CSS inline,
   cartão branco sobre #f1f4f1, botão amarelo da marca com texto azul.

   Variáveis no formato do Resend: {{{NOME}}}. FIRST_NAME e RESEND_UNSUBSCRIBE_URL são do próprio
   Resend (não declarar). Os links levam utm_source=email&utm_medium=email&utm_campaign=<alias>,
   que o rastreamento de origem do cadastro já entende (docs/rastreamento-origem.md).

   CABEÇALHO DE MÍDIA (pedido do dono, 28/09): todo template abre o cartão com uma imagem que
   representa o tema, trocável a cada envio pelas variáveis
     HEADER_IMG   URL pública de JPG/PNG/GIF (GIF anima no Gmail/Apple Mail; Outlook mostra o 1º quadro)
     HEADER_ALT   texto alternativo
     HEADER_LINK  para onde o clique leva (num vídeo: o link do vídeo)
   Vídeo não toca em e-mail: usar a miniatura com play (scripts/build-email-capas.mjs video <ID> <nome>).
   Padrão por template em public/img/email/ (mesmo script). Formato: 16:9, 1120×630. */
import { mkdirSync, writeFileSync } from 'node:fs';

const SITE = 'https://retrofoot.com.br';
const LOGO = `${SITE}/img/logo.png`;
const GRUPO_WPP = 'https://chat.whatsapp.com/H1AuqFrKDqn4Dd2BicnXqV';
const C = {
  pagina: '#f1f4f1', cartao: '#ffffff', linha: '#dde7db', titulo: '#12201a', texto: '#3a473f',
  fraco: '#78877c', amarelo: '#F2B90C', azul: '#17458F', verdeClaro: '#eef5ef',
};
const FONTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const CAPA = (nome) => `${SITE}/img/email/${nome}.jpg`;
/* utm_content diz QUAL link foi clicado (botao, capa, logo, link_guia, rodape_site...): o rastreamento
   de origem do cadastro (net/origem.js) grava os cinco utm_*, e o clique do Resend fica por link. */
const utm = (url, alias, content) => url + (url.includes('?') ? '&' : '?') +
  `utm_source=email&utm_medium=email&utm_campaign=${alias}` + (content ? `&utm_content=${content}` : '');

function casca({ alias, preview, corpo, marketing = true }) {
  /* a imagem ocupa a largura do cartão (560 − 2px de borda) e não tem altura fixa: GIF/imagem de outra
     proporção não deforma */
  const rodape = marketing
    ? `Você recebe este e-mail porque tem conta no RetroFoot.<br>
       <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${C.fraco};text-decoration:underline;">Não quero mais receber</a>`
    : `Você recebe este e-mail porque acabou de criar sua conta no RetroFoot.`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>RetroFoot</title>
</head>
<body style="margin:0;padding:0;background-color:${C.pagina};font-family:${FONTE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.pagina}" style="background-color:${C.pagina};">
<tr><td align="center" style="padding-top:36px;padding-bottom:36px;padding-left:16px;padding-right:16px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
    <tr><td align="center" style="padding-bottom:20px;">
      <a href="${utm(SITE + '/', alias, 'logo')}" target="_blank"><img src="${LOGO}" width="56" height="56" alt="RetroFoot" border="0" style="display:block;width:56px;height:56px;"></a>
    </td></tr>
    <tr><td bgcolor="${C.cartao}" style="background-color:${C.cartao};border:1px solid ${C.linha};border-radius:14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font-size:0;line-height:0;">
          <a href="{{{HEADER_LINK}}}" target="_blank"><img src="{{{HEADER_IMG}}}" width="558" alt="{{{HEADER_ALT}}}" border="0" style="display:block;width:100%;max-width:558px;height:auto;border-radius:13px 13px 0 0;color:${C.fraco};font-family:${FONTE};font-size:13px;"></a>
        </td></tr>
        <tr><td style="padding-top:30px;padding-bottom:30px;padding-left:34px;padding-right:34px;">
${corpo}
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding-top:22px;">
      <p style="margin:0;color:${C.fraco};font-family:${FONTE};font-size:11px;line-height:1.7;">
        RetroFoot — o clássico da sua infância, agora online.<br>
        <a href="${utm(SITE + '/', alias, 'rodape_site')}" style="color:${C.fraco};text-decoration:underline;">retrofoot.com.br</a> ·
        <a href="${utm(GRUPO_WPP, alias, 'rodape_whatsapp')}" style="color:${C.fraco};text-decoration:underline;">Grupo do WhatsApp</a><br>
        ${rodape}
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

const rotulo = (t) => `      <p style="margin:0;color:${C.fraco};font-family:${FONTE};font-size:11px;line-height:1.4;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">${t}</p>`;
const titulo = (t) => `      <h1 style="margin:10px 0 14px 0;color:${C.titulo};font-family:${FONTE};font-size:24px;line-height:1.3;font-weight:700;">${t}</h1>`;
const subtitulo = (t) => `      <h2 style="margin:26px 0 8px 0;color:${C.titulo};font-family:${FONTE};font-size:17px;line-height:1.35;font-weight:700;">${t}</h2>`;
const par = (t) => `      <p style="margin:0 0 14px 0;color:${C.texto};font-family:${FONTE};font-size:15px;line-height:1.65;">${t}</p>`;
const nota = (t) => `      <p style="margin:18px 0 0 0;color:${C.fraco};font-family:${FONTE};font-size:12px;line-height:1.6;">${t}</p>`;
const linha = () => `      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${C.linha};font-size:0;line-height:0;height:1px;padding-top:0;">&nbsp;</td></tr></table>`;
/* botão: table dentro de table porque o Outlook ignora padding em <a> */
const botao = (texto, url) => `      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;margin-bottom:6px;"><tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="center" bgcolor="${C.amarelo}" style="background-color:${C.amarelo};border-radius:10px;">
            <a href="${url}" target="_blank" style="display:inline-block;padding-top:16px;padding-bottom:16px;padding-left:32px;padding-right:32px;color:${C.azul};font-family:${FONTE};font-size:15px;font-weight:700;line-height:1;text-decoration:none;border-radius:10px;">${texto}</a>
          </td>
        </tr></table>
      </td></tr></table>`;
/* lista com marcador — tabela para o Outlook alinhar */
const itens = (lista) => `      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
${lista.map(([t, d]) => `        <tr>
          <td width="22" valign="top" style="padding-top:3px;color:${C.amarelo};font-family:${FONTE};font-size:15px;line-height:1.6;font-weight:700;">▸</td>
          <td valign="top" style="padding-bottom:10px;color:${C.texto};font-family:${FONTE};font-size:15px;line-height:1.6;"><strong style="color:${C.titulo};">${t}</strong>${d ? `<br>${d}` : ''}</td>
        </tr>`).join('\n')}
      </table>`;
const caixa = (html) => `      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;margin-bottom:8px;"><tr>
        <td bgcolor="${C.verdeClaro}" style="background-color:${C.verdeClaro};border-radius:10px;padding-top:16px;padding-bottom:16px;padding-left:18px;padding-right:18px;color:${C.texto};font-family:${FONTE};font-size:14px;line-height:1.6;">${html}</td>
      </tr></table>`;

const T = [];

/* 1. Boas-vindas — transacional, sai logo depois do cadastro */
T.push({
  alias: 'rf-boas-vindas', nome: '[RetroFoot] Onboarding 0 · Boas-vindas (dia 0)', marketing: false,
  capa: { img: CAPA('boas-vindas'), alt: 'Contrato assinado: bem-vindo ao RetroFoot' },
  assunto: 'Bem-vindo ao RetroFoot, {{{FIRST_NAME}}}! ⚽',
  preview: 'Sua conta está pronta. Escolha o clube e comece a sua primeira temporada.',
  variaveis: [],
  corpo: (a) => [
    rotulo('Conta criada'),
    titulo('Bem-vindo ao RetroFoot, {{{FIRST_NAME}}}!'),
    par('Sua conta está pronta e os seus saves ficam guardados na nuvem — dá para começar no computador e continuar no celular.'),
    par('Três jeitos de aproveitar desde o primeiro dia:'),
    itens([
      ['Modo Solo', 'Assuma um clube pequeno e leve até o topo, temporada após temporada.'],
      ['Modo Resenha', 'Monte uma sala e jogue o campeonato com os amigos, cada um com o seu time.'],
      ['Grupo do WhatsApp', 'Dicas, novidades em primeira mão e conversa direta com quem faz o jogo.'],
    ]),
    botao('Começar a jogar', utm(SITE + '/', a, 'botao')),
    nota(`Primeira vez? O <a href="${utm(SITE + '/guia/', a, 'link_guia')}" style="color:${C.azul};">guia do jogo</a> tem o vídeo "Como jogar RetroFoot" com o básico em poucos minutos.`),
  ],
});

/* 2. Newsletter mensal — casca com blocos variáveis */
T.push({
  alias: 'rf-newsletter-mensal', nome: '[RetroFoot] Newsletter mensal',
  capa: { img: CAPA('video-como-jogar'), alt: 'Vídeo: Como jogar RetroFoot', link: utm(SITE + '/guia/', 'rf-newsletter-mensal', 'capa') },
  assunto: '{{{ASSUNTO}}}',
  preview: '{{{PREVIEW}}}',
  variaveis: [
    ['ASSUNTO', 'Novidades do RetroFoot'], ['PREVIEW', 'O que mudou no jogo este mês.'],
    ['EDICAO', 'Edição do mês'], ['TITULO', 'O que rolou no RetroFoot'],
    ['INTRO', 'Um resumo rápido do que mudou no jogo e do que vem por aí.'],
    ['DESTAQUE_TITULO', 'Destaque do mês'], ['DESTAQUE_TEXTO', 'Texto do destaque.'],
    ['NOVIDADE_1', 'Novidade 1'], ['NOVIDADE_2', 'Novidade 2'], ['NOVIDADE_3', 'Novidade 3'],
    ['CTA_TEXTO', 'Jogar agora'], ['CTA_URL', utm(SITE + '/', 'rf-newsletter-mensal', 'botao')],
  ],
  corpo: (a) => [
    rotulo('{{{EDICAO}}}'),
    titulo('{{{TITULO}}}'),
    par('Oi, {{{FIRST_NAME}}}! {{{INTRO}}}'),
    subtitulo('{{{DESTAQUE_TITULO}}}'),
    par('{{{DESTAQUE_TEXTO}}}'),
    subtitulo('Novidades no jogo'),
    itens([['{{{NOVIDADE_1}}}'], ['{{{NOVIDADE_2}}}'], ['{{{NOVIDADE_3}}}']]),
    botao('{{{CTA_TEXTO}}}', '{{{CTA_URL}}}'),
    linha(),
    subtitulo('Você decide o que vem depois'),
    par(`No <a href="${utm(SITE + '/roadmap/', a, 'link_roadmap')}" style="color:${C.azul};font-weight:700;">roadmap público</a> você vota nas próximas funcionalidades. As mais votadas sobem na fila.`),
  ],
});

/* 3. Pergunta do time do coração — para as contas criadas antes de 27/09 */
T.push({
  alias: 'rf-time-do-coracao', nome: '[RetroFoot] Pergunta · Time do coração',
  capa: { img: CAPA('time-do-coracao'), alt: 'O estádio do seu clube no RetroFoot' },
  assunto: '{{{FIRST_NAME}}}, pra qual time você torce?',
  preview: 'Uma pergunta só, um toque para responder.',
  variaveis: [['RESPONDER_URL', utm(SITE + '/?time-do-coracao', 'rf-time-do-coracao', 'botao')]],
  corpo: () => [
    rotulo('Uma pergunta rápida'),
    titulo('Pra qual time você torce, {{{FIRST_NAME}}}?'),
    par('No RetroFoot você pode treinar qualquer clube — mas o coração é um só. Queremos saber qual é o seu.'),
    par('Leva um toque: escolha o time na lista (com o escudo) e pronto. Com isso vamos preparar novidades e ações especiais para cada torcida.'),
    botao('Escolher meu time', '{{{RESPONDER_URL}}}'),
    nota('Não torce para ninguém? Tem essa opção também.'),
  ],
});

/* 4. Anúncio de novidade — um recurso novo, e-mail avulso */
T.push({
  alias: 'rf-novidade', nome: '[RetroFoot] Anúncio de novidade',
  capa: { img: CAPA('novidade'), alt: 'Novidade no RetroFoot' },
  assunto: 'Novidade no RetroFoot: {{{RECURSO}}}',
  preview: '{{{RESUMO}}}',
  variaveis: [
    ['RECURSO', 'recurso novo'], ['RESUMO', 'Chegou uma novidade no jogo.'],
    ['TEXTO', 'Descrição do que mudou e por que vale a pena testar.'],
    ['COMO_1', 'Passo 1'], ['COMO_2', 'Passo 2'],
    ['CTA_TEXTO', 'Experimentar agora'], ['CTA_URL', utm(SITE + '/', 'rf-novidade', 'botao')],
  ],
  corpo: (a) => [
    rotulo('Novidade no jogo'),
    titulo('{{{RECURSO}}}'),
    par('Oi, {{{FIRST_NAME}}}! {{{TEXTO}}}'),
    caixa(`<strong style="color:${C.titulo};">Como usar</strong><br>1. {{{COMO_1}}}<br>2. {{{COMO_2}}}`),
    botao('{{{CTA_TEXTO}}}', '{{{CTA_URL}}}'),
    nota(`Tem ideia ou achou um problema? Conte no <a href="${utm(GRUPO_WPP, a, 'link_whatsapp')}" style="color:${C.azul};">grupo do WhatsApp</a>.`),
  ],
});

/* 5. Sentimos sua falta — reengajamento de quem parou de jogar */
T.push({
  alias: 'rf-sentimos-falta', nome: '[RetroFoot] Reengajamento · Sentimos sua falta',
  capa: { img: CAPA('sentimos-falta'), alt: 'Rodada ao vivo no RetroFoot' },
  assunto: '{{{FIRST_NAME}}}, o seu time está esperando o técnico',
  preview: 'O seu save continua na nuvem, do jeitinho que você deixou.',
  variaveis: [['NOVIDADE', 'o roadmap público, onde você vota no que entra no jogo']],
  corpo: (a) => [
    rotulo('Seu save continua lá'),
    titulo('O vestiário está esperando, {{{FIRST_NAME}}}'),
    par('Faz um tempo que você não aparece no RetroFoot. O seu save está guardado na nuvem, do jeitinho que você deixou — é só entrar e continuar a temporada.'),
    par('Enquanto isso, chegou coisa nova: {{{NOVIDADE}}}.'),
    botao('Voltar para o meu time', utm(SITE + '/', a, 'botao')),
    nota(`Prefere jogar com os amigos? No <a href="${utm(SITE + '/jogar-com-amigos/', a, 'link_resenha')}" style="color:${C.azul};">Modo Resenha</a> cada um treina o seu time no mesmo campeonato.`),
  ],
});

/* 6–12. DICAS DO PRESIDENTE — sequência de onboarding da 1ª temporada (docs/emails-onboarding.md).
   Objetivo: reduzir o churn da 1ª temporada ensinando o jogo na ordem em que as dúvidas aparecem.
   REGRA: só números que estão no código (conferidos em 27/09 — janelas, base, treino, patrocínio,
   copa, energia, moral, cargo). Nada de "a tática vencedora": a qualidade decide (simulate.js). */
const dica = ({ n, curto, capa, alias, assunto, preview, tituloTxt, abertura, pontos, fazer, cta = 'Abrir o meu clube', ps }) => ({
  alias, nome: `[RetroFoot] Dica ${n}/7 · ${curto}`, assunto, preview, variaveis: [], capa,
  corpo: (a) => [
    rotulo(`Dica do Presidente · ${n} de 7`),
    titulo(tituloTxt),
    par(`{{{FIRST_NAME}}}, ${abertura}`),
    itens(pontos),
    caixa(`<strong style="color:${C.titulo};">Faça agora</strong><br>${fazer}`),
    botao(cta, utm(SITE + '/', a, 'botao')),
    `      <p style="margin:18px 0 0 0;color:${C.texto};font-family:${FONTE};font-size:14px;line-height:1.6;">Um abraço,<br><strong style="color:${C.titulo};">O Presidente</strong></p>`,
    ps ? nota(`P.S. ${ps}`) : '',
  ],
});

T.push(dica({ n: 1, capa: { img: CAPA('dica-janela'), alt: 'Tela do Mercado com a janela de transferências aberta' }, curto: 'Janela aberta', alias: 'rf-dica-1-janela',
  assunto: 'As 10 primeiras rodadas decidem a sua temporada',
  preview: 'A janela de transferências está aberta agora — e fecha na rodada 11.',
  tituloTxt: 'A janela está aberta. Use-a.',
  abertura: 'bem-vindo ao clube. A primeira lição da casa: o mercado não fica aberto o ano todo.',
  pontos: [
    ['Janela aberta nas rodadas 1 a 10', 'Depois fecha e só reabre na rodada 21. Quem chega na rodada 11 sem reforço vai até a metade do campeonato com o que tem.'],
    ['Olhe primeiro onde o time é fraco', 'Um bom jogador na posição mais carente vale mais que um craque onde já está bem servido.'],
    ['Negociação leva 3 dias', 'O clube responde à taxa, o empresário avalia salário e papel, e aí sai o veredito. Oferta muito abaixo do pedido é recusada de cara.'],
  ],
  fazer: 'Abra o elenco, veja qual setor tem a força mais baixa e procure um reforço para ele antes da rodada 10.',
  ps: 'Jogador comprado não pode ser revendido na mesma temporada. Compre para ficar.',
}));

T.push(dica({ n: 2, capa: { img: CAPA('dica-caixa'), alt: 'Tela de Finanças do clube' }, curto: 'Caixa', alias: 'rf-dica-2-caixa',
  assunto: 'Aquele dinheiro no caixa não é sobra',
  preview: 'O patrocínio do ano inteiro entra de uma vez na 1ª rodada.',
  tituloTxt: 'Cuide do caixa como se fosse seu',
  abertura: 'preciso falar de dinheiro. É o erro nº 1 de quem chega na Série D.',
  pontos: [
    ['O patrocínio do ano entra todo na 1ª rodada', 'O caixa parece cheio, mas esse é o dinheiro da temporada inteira. Os salários saem toda rodada.'],
    ['Escute o Contador', 'Em toda compra, lance ou obra ele mostra como o caixa fica no fim da temporada. Se aparecer "Isto vai endividar o clube", volte e reveja.'],
    ['Caixa no vermelho trava o clube', 'Sem reforços, sem obras — e a diretoria perde a paciência com o técnico.'],
    ['Estádio pode esperar', 'Ampliar custa mais do que um clube da Série D tem no começo. Primeiro o time, depois a obra.'],
  ],
  fazer: 'Abra as Finanças e veja o selo do clube: o objetivo é terminar a temporada "No azul, com folga".',
}));

T.push(dica({ n: 3, capa: { img: CAPA('dica-rodizio'), alt: 'Tela do Elenco' }, curto: 'Rodízio', alias: 'rf-dica-3-rodizio',
  assunto: 'Seu time está cansado (e você nem percebeu)',
  preview: 'Energia e moral mexem na força do time em campo. Rodízio é obrigatório.',
  tituloTxt: 'Time cansado perde jogo ganho',
  abertura: 'vi o time em campo e tenho uma observação: força no papel não é força no gramado.',
  pontos: [
    ['Energia pesa na força em campo', 'Cada jogo gasta energia e a recuperação é parcial por rodada. Em semana com copa e liga, são dois jogos.'],
    ['Moral também joga', 'Vitória sobe, derrota desce. Com a moral média do time abaixo de 50, o rendimento cai para todo mundo.'],
    ['Use o banco', 'Poupar 2 ou 3 titulares cansados rende mais que insistir nos mesmos 11. O botão "Auto" ajuda a escalar quem está em condições.'],
    ['Cartão vermelho suspende 1 jogo', 'Tenha reserva em todas as posições — e sempre 2 goleiros.'],
  ],
  fazer: 'Antes da próxima rodada, olhe a energia do elenco e troque quem está no limite.',
}));

T.push(dica({ n: 4, capa: { img: CAPA('dica-evolucao'), alt: 'Tela do Treino especial' }, curto: 'Evolução e base', alias: 'rf-dica-4-evolucao',
  assunto: 'Como transformar garoto em titular',
  preview: 'Treino especial é de graça e a base libera um jovem por janela.',
  tituloTxt: 'Time forte se constrói, não se compra',
  abertura: 'na Série D ninguém tem dinheiro para comprar um time pronto. Então vamos formar um.',
  pontos: [
    ['Treino especial: 3 vagas, custo zero', 'Não gasta dinheiro nem energia. Coloque ali os jovens com mais potencial — a partir dos 31 anos já não rende.'],
    ['Jogar bem é o que mais faz evoluir', 'Quem entra em campo e tem boa atuação cresce mais rápido. Jovem até 20 anos cresce até no banco.'],
    ['Suba 1 jogador da base por janela', 'Na Categoria de base aparecem 3 garotos de 16 a 19 anos na posição mais carente, com salário menor. Só com a janela aberta.'],
    ['Não deixe ninguém esquecido', '4 semanas seguidas fora do time e o jogador perde ritmo — quem está no treino especial fica protegido.'],
  ],
  fazer: 'Ocupe as 3 vagas do treino especial e, com a janela aberta, veja os garotos da Categoria de base.',
}));

T.push(dica({ n: 5, capa: { img: CAPA('dica-copa'), alt: 'Tela da Copa da Federação' }, curto: 'Copa', alias: 'rf-dica-5-copa',
  assunto: 'O prêmio que vale mais que o título da Série D',
  preview: 'A Copa da Federação paga por fase disputada — e paga na hora.',
  tituloTxt: 'Não despreze a Copa da Federação',
  abertura: 'enquanto todo mundo pensa só no campeonato, a copa é onde o clube pequeno enche o cofre.',
  pontos: [
    ['Paga por fase, na hora', 'Cada fase disputada rende premiação. Chegar às oitavas já vale mais do que ser campeão da Série D.'],
    ['Mata-mata com os 80 clubes', 'Da Série A à D. Um dia bom derruba gigante — e quem é campeão ganha vaga no continental.'],
    ['Ajuda o patrocinador', 'Chegar às quartas de uma copa cumpre a meta da manga e rende bônus no fim da temporada.'],
  ],
  fazer: 'Na semana de copa, escale forte na copa e gire o elenco na liga. Dinheiro da copa vira reforço na janela seguinte.',
  cta: 'Ver a Copa da Federação',
}));

T.push(dica({ n: 6, capa: { img: CAPA('dica-acesso'), alt: 'Tela da Classificação' }, curto: 'Acesso', alias: 'rf-dica-6-acesso',
  assunto: 'Rodada 21: a janela reabriu. É agora.',
  preview: 'Os 4 primeiros sobem. A segunda janela é a última chance de reforço.',
  tituloTxt: 'A reta do acesso começa agora',
  abertura: 'a segunda janela abriu (rodadas 21 a 30) e ela é a última da temporada. Vamos falar de acesso.',
  pontos: [
    ['Os 4 primeiros sobem para a Série C', 'São 38 rodadas em pontos corridos. Empate em pontos decide no saldo de gols e depois nos gols marcados.'],
    ['Reforce onde perdeu pontos', 'Olhe os jogos que escaparam no primeiro turno: tomou gol demais ou fez gol de menos? Compre para isso.'],
    ['Suba mais um da base', 'A nova janela libera mais um jovem da Categoria de base.'],
    ['Subir paga', 'Bônus de acesso, meta do patrocinador das placas e uma divisão com mais público e mais dinheiro.'],
  ],
  fazer: 'Veja a sua posição na tabela e a distância para o 4º lugar. Até a rodada 30 dá para contratar.',
}));

T.push(dica({ n: 7, capa: { img: CAPA('dica-fim-temporada'), alt: 'Técnico campeão com a taça' }, curto: 'Fim da temporada', alias: 'rf-dica-7-fim-temporada',
  assunto: 'O fim da temporada não é o fim da carreira',
  preview: 'Como fechar bem o ano e garantir a próxima temporada da sua carreira.',
  tituloTxt: 'A temporada acaba. A carreira, não.',
  abertura: 'estamos chegando ao fim da primeira temporada. Independente da posição, você aprendeu o caminho — agora é construir em cima dele.',
  pontos: [
    ['A segurança no cargo depende da tabela e da moral', 'Terminar bem e com o grupo feliz deixa a diretoria confiante — e às vezes chegam convites de outros clubes.'],
    ['Na virada você recebe um resumo', 'Com o que funcionou e 3 dicas tiradas da sua própria temporada.'],
    ['Ganhe mais uma temporada grátis', 'No fim da 1ª temporada, é só deixar a sua opinião sobre o jogo e a próxima temporada é liberada na hora.'],
  ],
  fazer: 'Jogue as últimas rodadas com o time mais descansado possível e, na virada, deixe a sua opinião para seguir com a carreira.',
  cta: 'Terminar a temporada',
  ps: 'Quer jogar sem limite de temporadas? O Pro libera temporadas e carreiras ilimitadas e o Modo Resenha.',
}));

/* 13–15. CONVERSÃO (28/09) — um por segmento do Resend (docs/emails-onboarding.md, "Segmentos").
   Preço e benefícios são os do paywall (rf26-paywall.js / RF_PLANOS): R$ 19,90/mês, R$ 178,80/ano
   (−25%), cartão (renova) ou Pix (avulso, sem renovação). O "Ultrassônico" fica de fora do e-mail:
   sem contexto, não vende. O botão usa o link direto do Pro (?pro / ?pro=ano, ui/rf-link-pro.js):
   abre a oferta no jogo e, sem sessão, pede login antes do checkout. */
const assinatura = `      <p style="margin:18px 0 0 0;color:${C.texto};font-family:${FONTE};font-size:14px;line-height:1.6;">Um abraço,<br><strong style="color:${C.titulo};">O Presidente</strong></p>`;
const BENS_PRO = [
  ['Temporadas e carreiras ilimitadas', 'Suba da Série D até a elite sem trava no caminho.'],
  ['Carreira na nuvem, de qualquer aparelho', 'Comece no computador e continue no celular.'],
  ['Acesso exclusivo ao Modo Resenha (Beta)', 'Monte uma sala e dispute o campeonato com os amigos.'],
];
const b = (t) => `<strong style="color:${C.titulo};">${t}</strong>`;

T.push({
  alias: 'rf-ativar-1a-rodada', nome: '[RetroFoot] Ativação · Jogue a 1ª rodada',
  capa: { img: CAPA('video-como-jogar'), alt: 'Vídeo: Como jogar RetroFoot', link: utm(SITE + '/guia/', 'rf-ativar-1a-rodada', 'capa') },
  assunto: '{{{FIRST_NAME}}}, o seu time ainda não entrou em campo',
  preview: 'A primeira partida leva uns 2 minutos. O vestiário está pronto.',
  variaveis: [],
  corpo: (a) => [
    rotulo('Seu clube está esperando'),
    titulo('Falta só o apito inicial'),
    par('{{{FIRST_NAME}}}, a sua conta está criada, mas o seu time ainda não jogou. A primeira rodada leva uns 2 minutos — e é ali que o RetroFoot começa de verdade.'),
    itens([
      ['1. Escolha o seu clube', 'Todo técnico começa na Série D, com um clube pequeno e muita história para escrever.'],
      ['2. Escale com um toque', 'O botão "Auto" monta o melhor time possível. Dá para ajustar depois, com calma.'],
      ['3. Jogue a 1ª rodada', 'Acompanhe o jogo ao vivo e veja a tabela mexer.'],
    ]),
    botao('Jogar minha 1ª rodada', utm(SITE + '/', a, 'botao')),
    nota(`Primeira vez? O vídeo <a href="${utm(SITE + '/guia/', a, 'link_guia')}" style="color:${C.azul};">Como jogar RetroFoot</a> mostra o básico em poucos minutos.`),
    assinatura,
    nota('P.S. O seu save fica na nuvem: comece no computador e continue no celular.'),
  ],
});

T.push({
  alias: 'rf-pro-travado', nome: '[RetroFoot] Conversão · Travado no paywall',
  capa: { img: CAPA('pro-travado'), alt: 'O técnico planejando a próxima temporada' },
  assunto: '{{{FIRST_NAME}}}, a sua carreira parou na virada',
  preview: 'O seu clube continua salvo. A próxima temporada está a um clique.',
  variaveis: [],
  corpo: (a) => [
    rotulo('Sua carreira está em pausa'),
    titulo('A próxima temporada está esperando por você'),
    par('{{{FIRST_NAME}}}, você fechou a temporada e parou na hora da virada. O elenco, o caixa e a história do seu clube continuam salvos, do jeitinho que você deixou.'),
    subtitulo('Com o Pro, a carreira não para mais'),
    itens(BENS_PRO),
    caixa(`${b('R$ 19,90 por mês')} — cancela quando quiser.<br>Ou ${b('R$ 178,80 por ano')}: sai por R$ 14,90 por mês (25% menos).<br>No cartão ou no Pix (o Pix vale pelo período, sem renovação automática).`),
    botao('Seguir a carreira no Pro', utm(SITE + '/?pro', a, 'botao')),
    nota('O botão abre a assinatura do Pro já no jogo (se pedir, entre na sua conta primeiro — é assim que o Pro cai no seu save). Prefere seguir de graça? Se ainda houver uma saída grátis para a sua carreira, ela aparece ao clicar em "Começar a próxima temporada".'),
    assinatura,
  ],
});

T.push({
  alias: 'rf-pro-extra', nome: '[RetroFoot] Conversão · Temporada extra',
  capa: { img: CAPA('pro-extra'), alt: 'Técnico erguendo a chuteira de ouro' },
  assunto: '{{{FIRST_NAME}}}, pense na próxima virada antes que ela chegue',
  preview: 'A sua temporada extra está valendo. Veja o que o Pro libera para a carreira não parar.',
  variaveis: [],
  corpo: (a) => [
    rotulo('Temporada extra em andamento'),
    titulo('Você ganhou mais uma temporada. E depois?'),
    par('{{{FIRST_NAME}}}, obrigado por seguir com o RetroFoot. A temporada extra que você liberou está valendo — mas as temporadas grátis têm limite, e a carreira trava de novo numa das próximas viradas.'),
    subtitulo('O que muda com o Pro'),
    itens(BENS_PRO),
    caixa(`${b('Plano anual: R$ 178,80')} — R$ 14,90 por mês, 25% menos que o mensal (R$ 19,90).<br>Um pagamento e um ano inteiro de carreira sem trava.`),
    botao('Assinar o Pro anual', utm(SITE + '/?pro=ano', a, 'botao')),
    nota('O botão abre a assinatura já no plano anual (se pedir, entre na sua conta primeiro). Pagamento pelo Stripe, no cartão ou no Pix — dá para trocar para o mensal na mesma tela.'),
    assinatura,
    nota('P.S. Quem assina agora não perde nada: a temporada extra continua, e as próximas vêm sem trava.'),
  ],
});

/* 16. TRAVADO NO 1º PAYWALL (28/09) — segmento 5a. REGRA DO DONO: oferta do Pro só a partir do 2º
   paywall (o do post); aqui NÃO se fala de Pro — só do caminho grátis (dar a opinião), que é o botão
   "Ganhar 1 temporada grátis — dar minha opinião" da virada (rf26-paywall.js, texto ≥ 20 caracteres). */
T.push({
  alias: 'rf-pw1-opiniao', nome: '[RetroFoot] 1º paywall · Temporada grátis',
  capa: { img: CAPA('pro-travado'), alt: 'O técnico planejando a próxima temporada' },
  assunto: '{{{FIRST_NAME}}}, a sua próxima temporada é grátis',
  preview: 'Uma opinião sobre o jogo e a carreira segue, sem pagar nada.',
  variaveis: [],
  corpo: (a) => [
    rotulo('Sua carreira está em pausa'),
    titulo('Falta um passo para a próxima temporada'),
    par('{{{FIRST_NAME}}}, você fechou a primeira temporada e parou na virada. O seu clube continua salvo, do jeitinho que você deixou — e a próxima temporada sai de graça.'),
    subtitulo('Como liberar'),
    itens([
      ['1. Entre no jogo e abra o seu save', ''],
      ['2. Clique em "Começar a próxima temporada"', ''],
      ['3. Escolha "Ganhar 1 temporada grátis — dar minha opinião"', 'Conte em uma ou duas frases o que achou do RetroFoot. A temporada é liberada na hora.'],
    ]),
    caixa('A sua opinião vai direto para quem faz o jogo e ajuda a decidir o que entra nas próximas versões.'),
    botao('Continuar a minha carreira', utm(SITE + '/', a, 'botao')),
    assinatura,
    nota('P.S. Leva menos de um minuto.'),
  ],
});

mkdirSync('emails/templates', { recursive: true });
const indice = [];
for (const t of T) {
  const html = casca({ alias: t.alias, preview: t.preview, corpo: t.corpo(t.alias).join('\n'), marketing: t.marketing !== false });
  writeFileSync(`emails/templates/${t.alias}.html`, html);
  const cab = [['HEADER_IMG', t.capa.img], ['HEADER_ALT', t.capa.alt], ['HEADER_LINK', t.capa.link || utm(SITE + '/', t.alias, 'capa')]];
  indice.push({ alias: t.alias, nome: t.nome, assunto: t.assunto, marketing: t.marketing !== false,
    variaveis: [...cab, ...t.variaveis].map(([key, fallbackValue]) => ({ key, type: 'string', fallbackValue })) });
}
writeFileSync('emails/templates/index.json', JSON.stringify(indice, null, 2) + '\n');
console.log(`${T.length} templates em emails/templates/`);
