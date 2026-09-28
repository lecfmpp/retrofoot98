# E-mails do RetroFoot — onboarding, Dicas do Presidente e newsletter (27/09/2026)

Objetivo: **reduzir o churn da 1ª temporada** — ensinar o jogo na ordem em que as dúvidas aparecem,
para o jogador chegar ao fim da temporada (e ao paywall) sabendo jogar.

- Fonte dos templates: `scripts/build-emails.mjs` → `emails/templates/<alias>.html` + `index.json`.
- No Resend: os 12 estão como **rascunho (draft)**, com o mesmo alias. Nada foi publicado nem enviado.
- Mudou o texto? Editar o gerador, rodar `node scripts/build-emails.mjs` e atualizar o HTML no Resend.
- Todos os links levam `utm_source=email&utm_medium=email&utm_campaign=<alias>`.

## Cabeçalho de mídia (todos os templates)

Todo e-mail abre o cartão com uma imagem do tema, trocável a cada envio por 3 variáveis:

| Variável | O que é |
|----------|---------|
| `HEADER_IMG` | URL pública de **JPG, PNG ou GIF**. Formato ideal 16:9, **1120×630** (aparece com 558 px de largura) |
| `HEADER_ALT` | texto que aparece se a imagem não carregar |
| `HEADER_LINK` | para onde o clique na imagem leva |

- **Imagem:** subir o arquivo (ex.: `public/img/email/` e publicar o jogo, ou o Storage do Supabase) e passar a URL.
- **GIF:** anima no Gmail e no Apple Mail; o Outlook do Windows mostra só o 1º quadro — o 1º quadro tem de se explicar sozinho. Manter abaixo de ~1 MB.
- **Vídeo:** e-mail não toca vídeo. O padrão é a miniatura com botão de play levando ao vídeo:
  `node scripts/build-email-capas.mjs video <ID_DO_YOUTUBE> <nome>` gera `public/img/email/<nome>.jpg`;
  depois `HEADER_IMG` = essa imagem e `HEADER_LINK` = o link do vídeo.
- Sem passar nada, cada template usa a sua capa padrão (em `public/img/email/`, geradas pelo mesmo
  script a partir das telas e pôsteres do jogo). A newsletter vem com o vídeo "Como jogar RetroFoot".
- Nunca passar `HEADER_IMG` vazio: vira imagem quebrada. Para "sem imagem", use a capa padrão.

| Template | Capa padrão |
|----------|-------------|
| boas-vindas | pôster "contrato assinado" |
| dica 1–6 | telas do jogo: Mercado, Finanças, Elenco, Treino, Copa, Classificação |
| dica 7 | pôster "técnico campeão" |
| newsletter | miniatura do vídeo "Como jogar RetroFoot" (com play) → /guia/ |
| novidade | tela inicial do clube |
| time do coração | tela do estádio |
| sentimos sua falta | rodada ao vivo |

## Falta para ligar (depois do domínio)

1. **Domínio de envio**: hoje só `retrofoot98.com.br` está verificado no Resend. Definir o remetente
   (ex.: `RetroFoot <presidente@...>`) e colocar como `from` nos templates.
2. **Publicar** cada template (publish-template).
3. **Audiência**: sincronizar as contas (auth.users) com um segmento "RetroFoot" no Resend, com
   FIRST_NAME. Excluir sócios e contas de teste.
4. **Gatilhos** (abaixo) — pelo jogo mandando eventos ao Resend, via edge function.
5. **Pergunta do time do coração**: o botão leva a `/?time-do-coracao`. O jogo ainda **não** trata
   esse endereço — antes de enviar, fazer o jogo abrir o campo (rfTimeCampoHTML) para quem está logado
   e salvar em `raw_user_meta_data` (mesmas chaves do cadastro).

## Sequência de onboarding (1ª temporada do Modo Solo)

Gatilho ideal = **progresso no jogo** (rodada do save), porque há quem jogue a temporada em um dia e
quem leve semanas. Se não der para mandar eventos do jogo, usar a coluna "reserva por dias".

| # | Template | Gatilho ideal | Reserva por dias | O que ensina |
|---|----------|---------------|------------------|--------------|
| 0 | `rf-boas-vindas` | cadastro | dia 0 | Solo, Resenha, grupo do WhatsApp, guia com vídeo |
| 1 | `rf-dica-1-janela` | save criado (rodada 1) | dia 1 | janela aberta nas rodadas 1–10, reforçar o setor fraco, negociação em 3 dias |
| 2 | `rf-dica-2-caixa` | rodada 3 | dia 2 | patrocínio do ano entra na 1ª rodada, o Contador, caixa no vermelho, estádio espera |
| 3 | `rf-dica-3-rodizio` | rodada 6 | dia 4 | energia, moral < 50, rodízio, vermelho suspende 1 jogo, 2 goleiros |
| 4 | `rf-dica-4-evolucao` | rodada 8 (antes de a janela fechar) | dia 6 | treino especial (3 vagas, grátis), jogar bem evolui, 1 da base por janela |
| 5 | `rf-dica-5-copa` | 1ª partida de copa ou rodada 12 | dia 9 | Copa da Federação paga por fase; oitavas > título da Série D |
| 6 | `rf-dica-6-acesso` | rodada 21 (janela reabre) | dia 12 | 4 primeiros sobem, reforçar até a rodada 30, mais um da base |
| 7 | `rf-dica-7-fim-temporada` | rodada 33 | dia 15 | segurança no cargo, resumo da virada, opinião = temporada grátis |

Regras da sequência:
- **Parar** a sequência quando o jogador vira a temporada (já passou pelo paywall) ou se descadastra.
- **Não mandar dica atrasada**: se o save já passou da rodada do gatilho de duas dicas, mandar só a mais recente.
- **Máximo 1 e-mail por dia** por pessoa.
- `rf-sentimos-falta`: **7 dias sem interação** (rf_interacao) durante a 1ª temporada — no lugar da
  próxima dica, uma vez só.

## Avulsos

| Template | Quando | Variáveis |
|----------|--------|-----------|
| `rf-newsletter-mensal` | 1× por mês, para todos | ASSUNTO, PREVIEW, EDICAO, TITULO, INTRO, DESTAQUE_TITULO, DESTAQUE_TEXTO, NOVIDADE_1..3, CTA_TEXTO, CTA_URL |
| `rf-novidade` | lançamento de recurso | RECURSO, RESUMO, TEXTO, COMO_1, COMO_2, CTA_TEXTO, CTA_URL |
| `rf-time-do-coracao` | uma vez, para as contas sem time (324 em 27/09) | RESPONDER_URL |
| `rf-sentimos-falta` | reengajamento | NOVIDADE |

## Fatos usados nas dicas (conferidos no código em 27/09)

Janelas `TRANSFER_WINDOWS=[[0,9],[20,29]]` = rodadas 1–10 e 21–30 (core.js). Base: 1 por janela,
16–19 anos, salário 40%. Treino especial: 3 vagas, sem custo, não rende a partir dos 31. Série D:
20 clubes, 38 rodadas, sobem 4, desempate pontos → saldo → gols. Patrocínio do ano entra na 1ª
rodada; metas camisa (top 4), manga (quartas de copa), placas (acesso). Copa da Federação paga por
fase na hora. Moral média < 50 = −15%. Vermelho = 1 jogo; sem suspensão por amarelos.
**Não prometer tática vencedora**: depois do rebalance de 21/08, quem decide é a qualidade do elenco.
Se alguma regra mudar, revisar as dicas.
