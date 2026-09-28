# Base de conhecimento do assistente "Sobre o jogo"

Estes `.md` são tudo o que a IA da página **Sobre o jogo** do painel sabe. A edge function
`sobre-o-jogo` manda a base inteira ao Gemini em toda pergunta, como instrução de sistema.
Este LEIA-ME não entra.

- Escritos em 28/09/2026 a partir do código (public/src, supabase/functions, docs). O código
  é a verdade: quando uma regra do jogo mudar, a seção dela tem de mudar junto, senão a IA
  responde a regra velha com toda a confiança.
- Onde algo era incerto no código, o texto diz "incerto". A IA repassa a incerteza em vez de inventar.
- Ideias do que acrescentar: perguntas com 👎 ou repetidas em `admin_rf98.sobre_perguntas`.

Para publicar uma mudança:

1. editar / criar o `.md` (a ordem do nome é a ordem na base);
2. `node scripts/build-conhecimento.mjs` — regrava `supabase/functions/sobre-o-jogo/conhecimento.ts`;
3. commit + push na `main`. O workflow de edge functions publica, e barra o deploy se o
   passo 2 tiver sido esquecido (`--check`).

Nada de segredos, IDs de projeto ou dados de jogadores aqui: tudo isto vai para a API do Google.
