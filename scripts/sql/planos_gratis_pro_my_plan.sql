-- GRÁTIS × PRO — my_plan com a regra nova de carreiras (fase 4, 25/09/2026)
-- APLICAR NO LANÇAMENTO, junto do `select elifoot_v3.planos_lancar();` (docs/plano-gratis-pro.md).
--
-- O jogo decide se mostra "Novo jogo" trancado por `saves_no_mes` (rfPodeSalvarNovo): com a regra
-- antiga era "carreiras CRIADAS neste ciclo mensal". Com o Grátis × Pro ligado, a trava do banco
-- (solo_saves_teto) conta as carreiras que EXISTEM — então o número que o jogo lê tem de ser esse,
-- senão a tela tranca quem pode e deixa passar quem o servidor vai recusar.
-- Desligado (planos_config.gratis_pro = false) continua exatamente como antes.

create or replace function elifoot_v3.my_plan()
returns table(plan text, pro boolean, until timestamp with time zone, saves_max integer, pode_hospedar boolean,
              sala_max integer, avatar_ia boolean, pode_resenha boolean, resenha_ate timestamp with time zone,
              saves_no_mes integer, saves_renova_em timestamp with time zone)
language sql stable security definer set search_path = '' as $$
  with ini as (select coalesce(elifoot_v3.inicio_da_cota(auth.uid()), elifoot_v3.inicio_do_mes_br()) as d),
       lig as (select elifoot_v3.gratis_pro_ligado() as novo)
  select l.plan, (l.plan <> 'free'),
         (select up.until from elifoot_v3.user_plans up where up.user_id = auth.uid()),
         l.saves_max, l.pode_hospedar, l.sala_max, l.avatar_ia, l.pode_resenha, l.resenha_ate,
         case when (select novo from lig)
              then (select count(*)::int from elifoot_v3.solo_saves s where s.user_id = auth.uid())
              else (select count(*)::int from elifoot_v3.solo_save_criacoes c
                     where c.user_id = auth.uid() and c.criado_em >= (select d from ini)) end,
         case when (select novo from lig) then null
              else ((select d from ini) + interval '1 month') end
  from elifoot_v3.plano_limites(auth.uid()) l;
$$;
