-- ==================================================================
-- LISTA DE ESPERA — o painel passa a poder LER.
--
-- COMO ESTAVA: `elifoot_v3.retrofoot_waitlist` tinha UMA policy —
-- `waitlist_insert_anon`, de INSERT para anon/authenticated. Com RLS
-- ligada e nenhuma policy de SELECT, ninguém lia a tabela: nem o jogo
-- (que não precisa) nem o painel (que precisa). Era por isso que o
-- número da landing vinha de uma RPC (`retrofoot_waitlist_count`) em vez
-- de um `count(*)` — a RPC roda como dona e passa por cima da RLS.
--
-- Contar servia para a barra de vagas. Não serve para acompanhar a lista:
-- quem entrou, quando, o que respondeu sobre preço, de que time é, quem
-- indicou amigos. Esses dados existem desde 12/08/2026 e não havia
-- NENHUMA porta para os ver — nem no painel, nem no jogo.
--
-- O QUE ESTE FICHEIRO FAZ: abre SELECT só para quem já é administrador,
-- pela mesma função que fecha o resto do painel (`admin_rf98.is_admin()`,
-- a mesma de ad_creatives, ad_events, momento_videos e user_activity).
-- Nada muda para o anon: quem preenche o formulário continua a poder
-- gravar e continua sem poder ler — a lista de e-mails de quem se
-- inscreveu não pode ficar a um `select` de distância da chave publicável
-- que viaja no bundle do jogo.
--
-- INSERT fica como está: não se toca na porta por onde a lista cresce.
--
-- Para desfazer:
--   drop policy waitlist_admin_sel on elifoot_v3.retrofoot_waitlist;
-- ==================================================================

alter table elifoot_v3.retrofoot_waitlist enable row level security;

drop policy if exists waitlist_admin_sel on elifoot_v3.retrofoot_waitlist;
create policy waitlist_admin_sel
  on elifoot_v3.retrofoot_waitlist
  for select
  to authenticated
  using (admin_rf98.is_admin());
