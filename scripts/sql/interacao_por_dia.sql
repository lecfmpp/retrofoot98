-- "ATIVO" POR DIA = LOGIN OU JOGADA, NAS OUTRAS TELAS DO PAINEL (25/09/2026)
-- Continuação de interacao_usuario.sql. O painel inicial ("Ativos (7 dias)", "voltaram noutro
-- dia", e o "por usuário ativo" das Finanças, que usa o mesmo número) e o gráfico do Analytics
-- ("ativos por dia") contavam quem teve MINUTOS em elifoot_v3.user_activity — o tique do
-- rf_heartbeat, que corre com a aba visível dentro do jogo, sem clique nenhum.
--
-- Agora cada interação (login, Jogar, Pronto, Avançar dia) soma 1 em user_activity.interacoes do
-- dia, e essas telas contam dia com interacoes > 0. Dias ANTERIORES a 26/09/2026 não têm o
-- contador e continuam valendo pela regra antiga (minutos > 0) — sem isso o gráfico despencaria
-- por falta de histórico, não por falta de jogadores.
-- Não entra aqui: o "visto" por SALA no detalhe do usuário (presença naquela sala — a marca de
-- interação é da conta) e o último acesso da EQUIPE do painel (outra coisa).

alter table elifoot_v3.user_activity add column if not exists interacoes int not null default 0;

drop function if exists elifoot_v3.rf_interacao(text);
create or replace function elifoot_v3.rf_interacao(p_tipo text default 'rodada', p_modo text default 'solo')
returns void language plpgsql security definer set search_path = elifoot_v3, public as $$
declare n int;
begin
  if auth.uid() is null then return; end if;
  insert into elifoot_v3.user_interacao (user_id, ultima, tipo)
  values (auth.uid(), now(), left(coalesce(p_tipo, 'rodada'), 20))
  on conflict (user_id) do update set ultima = excluded.ultima, tipo = excluded.tipo
   where elifoot_v3.user_interacao.ultima < now() - interval '1 minute';
  get diagnostics n = row_count;
  if n > 0 then                                   -- mesmo freio de 1 min para o contador do dia
    insert into elifoot_v3.user_activity (user_id, dia, minutos, modo, interacoes)
    values (auth.uid(), current_date, 0, case when p_modo = 'resenha' then 'resenha' else 'solo' end, 1)
    on conflict (user_id, dia, modo) do update set interacoes = elifoot_v3.user_activity.interacoes + 1;
  end if;
end $$;
revoke all on function elifoot_v3.rf_interacao(text, text) from public, anon;
grant execute on function elifoot_v3.rf_interacao(text, text) to authenticated;

-- overview e analytics: acrescenta o filtro às contagens de "ativos", por substituição exata
-- (falha se o trecho não estiver lá; nada muda nesse caso).
do $$
declare d text; n text;
  f constant text := ' and (interacoes > 0 or (dia < date ''2026-09-26'' and minutos > 0))';
begin
  d := pg_get_functiondef('admin_rf98.overview'::regproc);
  if position('interacoes > 0' in d) = 0 then
    if (length(d) - length(replace(d, 'where dia >= current_date - 7', ''))) / length('where dia >= current_date - 7') <> 2 then
      raise exception 'overview: esperava 2 contagens de ativos (ativos7 e retorno)';
    end if;
    execute replace(d, 'where dia >= current_date - 7', 'where dia >= current_date - 7' || f);
  end if;

  d := pg_get_functiondef('admin_rf98.analytics'::regproc);
  if position('interacoes > 0' in d) = 0 then
    n := replace(d, 'where dia >= current_date-(p_dias-1) group by dia',
                    'where dia >= current_date-(p_dias-1)' || f || ' group by dia');
    if n = d then raise exception 'analytics: contagem de sessões não encontrada'; end if;
    execute n;
  end if;
end $$;
