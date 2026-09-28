-- ===== SOBRE O JOGO: histórico do assistente de IA (28/09/2026) =====
-- Uma linha por pergunta feita ao assistente da página "Sobre o jogo" do painel.
-- Quem ESCREVE é só a edge function `sobre-o-jogo` (service_role), com o custo calculado do
-- `usageMetadata` que o Gemini devolve. Serve para duas coisas:
--   · saber o que o suporte pergunta — pergunta repetida ou resposta com 👎 é buraco na base
--     de conhecimento (docs/conhecimento/), e é lá que se conserta;
--   · o gasto do mês, mostrado na própria página.
-- FORA de elifoot_v3.ia_custos de propósito: aquela tabela é conferida contra a fatura da
-- OpenAI (Finanças → IA), e linha do Gemini ali desalinharia a conciliação.
-- Lembrete de admin_rf98: tabela nova nasce SEM grant — o grant vai junto.

create table if not exists admin_rf98.sobre_perguntas (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  pergunta text not null,
  resposta text,
  modelo text,
  tokens_in integer,
  tokens_out integer,
  tokens_cache integer,
  custo_usd numeric(12,6),
  util boolean,
  criado_em timestamptz not null default now()
);
create index if not exists sobre_perguntas_criado_idx on admin_rf98.sobre_perguntas (criado_em desc);
alter table admin_rf98.sobre_perguntas enable row level security;
create policy sobre_perguntas_sel on admin_rf98.sobre_perguntas for select to authenticated using (admin_rf98.is_admin());
-- voto de utilidade: o próprio autor marca 👍/👎 na resposta que recebeu
create policy sobre_perguntas_voto on admin_rf98.sobre_perguntas for update to authenticated
  using (admin_rf98.is_admin() and user_id = auth.uid()) with check (admin_rf98.is_admin() and user_id = auth.uid());
grant select on admin_rf98.sobre_perguntas to authenticated;
grant update (util) on admin_rf98.sobre_perguntas to authenticated;
grant all on admin_rf98.sobre_perguntas to service_role;
