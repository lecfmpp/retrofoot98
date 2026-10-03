# Ligar o Visiflow (Rastro) ao RetroFoot — estudo curto (02/10/2026)

Objetivo: usar o Visiflow (gravação de sessões, heatmaps, funil) para **filtrar** o que os
jogadores fazem e **gerar diagnósticos** (aba "Diagnóstico" do Visiflow) sobre onde o jogo perde
gente. Este documento é só o estudo: nada aqui muda produção.

## 1. O que já está ligado

- **Snippet instalado** em `public/index.html` (`<head>`): fila `window.rastro` + loader
  `rastro-ingest/s.js?k=<chave do site>`. Roda em toda página do jogo.
- **`public/src/net/rastro-marcos.js`** (tudo dentro de `try/catch`, não quebra o jogo):
  - `screen` a cada troca de tela (`main/<aba>`, `login`, `modo`...);
  - marcos: `clube_escolhido` (clube, país, divisão, modo), `cadastro_concluido`,
    `primeira_partida`, `rodada_10`, `temporada_1_concluida`.
- **`identify`** com o **uuid da conta** (nunca e-mail ou nome) no login e no cadastro
  (`supabase-adapter.js`). É a mesma chave que o painel dos sócios já usa (`auth.users.id`),
  então dá para cruzar Visiflow ↔ Painel RetroFoot sem tabela de ligação.

## 2. O que o Visiflow já permite filtrar (sem código novo)

- Por **usuário**: `https://visiflow.me/sites/<slug>/sessoes?user_id=<uuid>` abre direto o replay
  se houver uma sessão gravada. Dá para ir do painel dos sócios ao replay de uma conta.
- Por **dispositivo** (celular / tablet / computador): o Visiflow já separa sempre (heatmap nunca
  mistura). É a fonte confiável de "quem joga de onde" para sessões gravadas.
- **Funil** (um por site): `$visit` → `cadastro_concluido` → `clube_escolhido` → `primeira_partida`
  → `rodada_10` → `temporada_1_concluida`. Cada etapa pode filtrar por propriedade
  (`modo`, `divisao`, `clube`, `pais`) e agrupar por ela.

## 3. O que falta instrumentar (proposta, ordem de valor)

| Evento | Props | Por que |
|---|---|---|
| `paywall_exibido` | `variante`, `situacao`, `divisao`, `temporada` | já existe em `NET.paywallEvento` (banco); espelhar no Visiflow para ver o replay de quem viu o paywall |
| `paywall_saiu` / `virou_pro` | `como` (grátis, depoimento, post, pro) | funil do paywall com vídeo |
| `contratacao_fechada` / `proposta_enviada` | `etapa` | medir se o fluxo de contratar (agora em 2 etapas) trava |
| `coletiva_aberta` | `modo` | ver se a coletiva (agora com metade da frequência) irrita |
| `licenca_pro_vista` | — | interesse na página nova da Licença Pro |
| `erro_tela` | `tela`, `msg` curta | `window.onerror` -> evento; liga replay a bug |

Regra: props curtas, sem dado pessoal. Ligar tudo via `rfRastro('track', ...)`, que já engole erros.

## 4. Ligações possíveis entre o Painel do RetroFoot e o Visiflow

1. **Link por conta (esforço: pequeno, sem servidor).** Na tabela Usuários do admin, um ícone que
   abre `visiflow.me/sites/<slug>/sessoes?user_id=<id>`. O id já é o mesmo do `identify`.
2. **API de leitura (esforço: médio).** `rastro-read` é servidor-a-servidor: `GET /users?user_ids=a,b,c`
   com `Authorization: Bearer rk_...` devolve por usuário `sessions`, `sessions_with_video`,
   `first/last_session_at`, `total_duration_s`, `latest_replay_url`. Uma Edge Function do RetroFoot
   (a chave `rk_` fica em secret, nunca no navegador do admin) chamaria em lotes (limite 120 req/min)
   e o admin ganharia colunas "sessões gravadas", "tempo gravado" e "último replay".
   Atenção: chave só vê o site dela; criar em Visiflow → Configurações → Chaves de leitura.
3. **Filtro cruzado (esforço: médio).** O admin filtra por plano/origem/plataforma e manda a
   lista de ids ao `rastro-read` para ver "dos 40 Pro, quantos têm replay". Também serve para
   escolher quais replays assistir (ex.: quem fechou a 1ª temporada versus quem sumiu na rodada 3).

## 5. Diagnósticos (aba "Diagnóstico" do Visiflow)

- A IA (Gemini) recebe **texto das sessões + eventos**, nunca vídeo nem ids de usuário; tudo passa
  por `scrub()` (e-mail, telefone, CPF, números longos).
- **Briefing sugerido** para o RetroFoot: problema ("poucos chegam à rodada 10"), objetivo
  (1ª temporada concluída), contexto (jogo de gestão no navegador, Solo e Resenha), páginas
  (`main/hub`, `main/mercado`, `main/tabela`...), CTAs (Criar conta, Jogar, Avançar, Propor,
  Licença Pro).
- **Privacidade (importante):** o texto de botões e telas é gravado como está. No RetroFoot
  aparecem nome do técnico, chat da Resenha e WhatsApp. Marcar com `class="rastro-mask"` esses
  elementos (nome do treinador, chat, campos de contato) antes de ligar em escala; inputs de
  e-mail/telefone/senha já são mascarados por padrão. Falta citar o Visiflow na Política de
  Privacidade/Cookies e, idealmente, oferecer o opt-out por navegador (`rastro.optout()`).

## 6. Risco técnico a medir antes de gravar tudo

O jogo **redesenha a tela inteira** (`cdraw()` reescreve `innerHTML`) a cada ação e a cada minuto
da partida ao vivo. Para o rrweb isso vira muita mutação de DOM: lotes grandes e vídeos pesados.
Recomendação: começar com **amostragem** (ex.: 20-30%), teto de vídeo por sessão (padrão 30 min),
"só jogadores novos" e retenção curta; medir tamanho médio de sessão e custo no Storage na 1ª semana.
O "partida rodando sozinha" não conta como atividade, então a pausa por inatividade continua válida.

## 7. Plano em passos

1. (pequeno) Adicionar eventos da tabela da seção 3, começando por paywall e `erro_tela`.
2. (pequeno) Máscaras `rastro-mask` nos elementos de nome/chat/contato.
3. (pequeno) Ícone "ver replay" no admin com `?user_id=`.
4. (médio) Edge Function que consulta `rastro-read` e alimenta colunas no admin.
5. (depois de 1 semana de dados) Preencher o briefing e rodar o 1º diagnóstico; comparar celular
   × computador (há dado de plataforma também no painel dos sócios desde 02/10/2026).

## Decisões que dependem do dono

- Percentual de amostragem inicial e retenção dos vídeos.
- Aceitar/mostrar o aviso de privacidade antes de gravar em produção.
- Se o diagnóstico roda manualmente (sob demanda) ou toda semana.
