# Grátis × Pro — plano de implementação (25/09/2026)

Fonte: doc "Estratégia de Monetização & Transição de Planos" (Google Docs) + decisões do dono em 25/09.

## Regras decididas

| | Grátis (`free`) | Pro (`pro`) |
|---|---|---|
| Preço | R$ 0 | R$ 19,90/mês ou R$ 178,80/ano (= R$ 14,90/mês) |
| Modo Solo | completo, **1 temporada por carreira** | temporadas ilimitadas |
| Carreiras | **1 carreira por conta** (hoje o banco deixa 3 novas/mês — corrigir) | ilimitadas |
| Save | nuvem (como hoje — decisão: NÃO ir para IndexedDB agora) | nuvem |
| Modo Resenha | não | entra e hospeda (herda tudo do antigo Embaixador) |
| Velocidade Ultrassônico | não | sim |
| Ranking | participa | participa + selo Pro |
| Avatar IA | não | **não** — vira item pago avulso (marketing depois) |
| Jogador no banco oficial | não | **não** — sai da vitrine |

- Só existem 2 planos. `resenha` e `embaixador` deixam de ser vendidos; quem os tem é lido como `pro`.
- Quem já tem avatar IA ou jogador no banco **mantém** (não se retira nada de ninguém).
- Cupom beta (50% × 3 meses) **removido**.

### Veteranos (cortesia Beta)
Toda carreira que, no dia do lançamento, já passou da 1ª temporada ganha **a temporada atual + 2 viradas**.
Contagem **por carreira existente** (snapshot no lançamento). Carreiras novas seguem a regra de 1 temporada.
Popup (1x por carreira) explicando: jogador da fase Beta, mantém o gratuito por mais 2 temporadas; depois
precisa ser Pro para seguirmos salvando na nuvem (custo de servidor/armazenamento do histórico, jogar online de qualquer aparelho).
Em 25/09: 16 contas / 27 carreiras nessa situação.

### Paywall de fim de temporada (pedido do dono, 25/09)
Mensagem personalizada pelo resultado + 3 dicas tiradas do que aconteceu na temporada, benefícios do Pro,
e UMA saída grátis por vez (escada, para não poluir o modal):

| Fim da… | Saída grátis oferecida |
|---|---|
| 1ª temporada | "Conta o que achou do jogo" → texto → libera +1 temporada na hora |
| 2ª temporada | "Posta ou grava um vídeo" → cola o link → libera +1 temporada |
| 3ª temporada | só o Pro |

Situações da mensagem: campeão · subiu (G4) · brigou pelo acesso e não subiu · meio de tabela · rebaixado.
Dicas por sinal da temporada (escolher até 3): caixa/dívida, força do elenco vs. liga, queda cedo na copa,
lesões/cansaço sem rodízio, poucas contratações, defesa vazada.
O feedback e o link vão para o WhatsApp do dono (+1 647 862 3292) pelo mesmo caminho do aviso do grupo
(tabela → pg_net → Green-API), e a liberação é uma RPC no servidor (trava do save respeita).

## Fases

1. **Banco** — `user_plans.plan` aceita `pro`; `plano_limites`/`my_plan` com `temporadas_max` e leitura
   `resenha|embaixador|pro` ⇒ Pro; tabela de cortesia por carreira (snapshot `temporadas_fechadas + 2`);
   trigger em `solo_saves` recusa temporada acima do teto (`PLANO_TEMPORADAS`); sai a cota mensal;
   `pode_resenha`/`pode_hospedar` = Pro; `avatar_ia` só para quem já tem. Puxar as definições VIVAS antes (repo está atrás).
2. **Stripe** — produto "RetroFoot Pro", preços com metadata `plano=pro` `ciclo=mes|ano` (1990 / 17880);
   `criar-checkout` e `stripe-webhook` aceitam `pro` (NOME_PLANO, planoDaAssinatura, vaga_liberar só p/ quem não tem vaga);
   nova edge function de portal (Stripe Billing Portal) + botão "Gerir assinatura" em Minha Conta;
   arquivar preços antigos e o cupom beta.
3. **Jogo** — paywall em `clAdvanceSeason()` (main.js) antes de qualquer mutação; modal de celebração do doc;
   volta do checkout retoma o mesmo save; popups de upgrade viram 1 plano; `PLANO_TEMPORADAS` tratado no `_saveV3Enviar`;
   selo Pro no cabeçalho e ranking; popup de cortesia dos veteranos; corrigir `saveV3()` sem argumento na virada (no-op).
4. **Vitrine e textos** — `RF_PLANOS` com 2 colunas; `seo/pages.mjs`, `seo/legal.mjs`, JSON-LD de `index.html`,
   `rf26-pagamento.js`, travas antigas (`RF_TRAVAS`), textos de cota mensal.
5. **(Depois, opcional)** save local para o Grátis + telemetria leve.

## Pendências antes de ligar
- Teste de 16/09: as 6 contas pagas estão `free`; restaurar pelo `bkp_user_plans_20260916` (fundadores viram Pro).
- 3 assinaturas de fundadores seguem nos preços antigos no Stripe — decidir se migram para o preço Pro.
- 1 Embaixador pago por Pix: vira Pro até o `until` atual.

## Estado (25/09)
- Fase 1 (banco) aplicada e DESLIGADA — `scripts/sql/planos_gratis_pro.sql`. Ligar: `select elifoot_v3.planos_lancar();`
- Stripe (live, conta Retrofoot): produto `prod_VKGHkYMPFeZVyp` "RetroFoot Pro";
  `price_1UJbl3G6vHgCiPOGzjaIjGuj` R$ 19,90/mês (`plano=pro ciclo=mes`),
  `price_1UJbl4G6vHgCiPOGjPxG2XSa` R$ 178,80/ano (`plano=pro ciclo=ano`).
- Assinaturas dos fundadores canceladas no Stripe pelo dono (25/09); eles ficam no gratuito.
- Decidido: depoimento = +1 temporada; post/vídeo = +1; aviso vai ao grupo de sempre ("PB Games"), liberação automática.

## Checklist do dia do lançamento
1. Publicar edge functions (checkout/webhook com `pro`) e o jogo com o paywall.
2. `select elifoot_v3.planos_lancar();` (grava veteranos e liga as travas).
3. Arquivar no Stripe os preços de Resenha/Embaixador (mensal e anual) e o cupom beta.
