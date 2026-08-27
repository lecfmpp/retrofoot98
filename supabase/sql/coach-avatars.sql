-- ==================================================================
-- AVATAR DO TREINADOR — tabela, buckets e a trava da cota.
--
-- Uma linha por CONTA (nao por save): a foto custa dinheiro, entao ela
-- pertence ao treinador e reaparece em todos os saves dele.
--
-- Quem escreve o que:
--   · o JOGADOR mexe em genero, preset e no aceite dos termos;
--   · a EDGE FUNCTION (service role) mexe em url, estilo e geracoes.
-- A separacao nao e' decorativa: `geracoes` e' a cota que segura o custo,
-- e `url` e' o resultado pago. Se o browser pudesse escrever esses dois,
-- a cota seria uma sugestao.
-- ==================================================================

create table if not exists elifoot_v3.coach_avatars (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  genero        text        check (genero in ('m','f')),
  preset        text,                       -- face padrao escolhida: m1..m5 / f1..f5
  url           text,                       -- retrato gerado por IA (vence o preset)
  estilo        text,                       -- estilo usado na geracao
  geracoes      int         not null default 0,
  termos_versao text,                       -- versao do texto legal aceite
  termos_em     timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table elifoot_v3.coach_avatars is
  'Avatar do treinador, uma linha por conta. url/estilo/geracoes so a service role escreve (ver trigger coach_avatars_guarda).';

alter table elifoot_v3.coach_avatars enable row level security;

drop policy if exists coach_avatars_ler   on elifoot_v3.coach_avatars;
drop policy if exists coach_avatars_criar on elifoot_v3.coach_avatars;
drop policy if exists coach_avatars_mudar on elifoot_v3.coach_avatars;

create policy coach_avatars_ler on elifoot_v3.coach_avatars
  for select to authenticated using (user_id = auth.uid());

create policy coach_avatars_criar on elifoot_v3.coach_avatars
  for insert to authenticated with check (user_id = auth.uid());

create policy coach_avatars_mudar on elifoot_v3.coach_avatars
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- RLS diz QUAIS LINHAS, nunca QUAIS COLUNAS. Sem este trigger, o jogador
-- passa na policy acima e escreve `geracoes = 0` a cada geracao — cota
-- infinita — ou cola uma `url` qualquer. A service role passa reto.
create or replace function elifoot_v3.coach_avatars_guarda()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Quem e' a service role se reconhece por NAO TER auth.uid(): a edge function
  -- conecta sem JWT de usuario. Isto e' mais confiavel que farejar o nome do
  -- papel — e a diferenca importa, porque um falso negativo aqui reverteria a
  -- gravacao da funcao EM SILENCIO, e o recurso pareceria quebrado sem erro.
  if auth.uid() is null
     or current_setting('role', true) = 'service_role'
     or auth.role() = 'service_role' then
    new.atualizado_em := now();
    return new;
  end if;
  new.url        := old.url;
  new.estilo     := old.estilo;
  new.geracoes   := old.geracoes;
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists coach_avatars_guarda on elifoot_v3.coach_avatars;
create trigger coach_avatars_guarda before update on elifoot_v3.coach_avatars
  for each row execute function elifoot_v3.coach_avatars_guarda();

-- COTA ATOMICA. Duas abas gerando ao mesmo tempo fariam ler-3, ler-3,
-- gravar-4, gravar-4 — uma geracao de graca por corrida. O incremento
-- acontece ANTES da chamada a OpenAI e num comando so; estourou o teto,
-- devolve null e a funcao recusa sem gastar.
-- O UID VEM POR PARAMETRO, nao de auth.uid(): quem chama e' a edge function
-- com a service role, que nao carrega JWT de usuario nenhum — la' dentro
-- auth.uid() e' NULL e a cota recusaria todo mundo, sempre. Por isso o
-- EXECUTE fica so' com a service role (grant no fim do bloco).
create or replace function elifoot_v3.coach_avatar_consumir(p_user uuid, p_teto int)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if p_user is null then return null; end if;
  insert into elifoot_v3.coach_avatars (user_id, geracoes)
       values (p_user, 1)
  on conflict (user_id) do update
          set geracoes = elifoot_v3.coach_avatars.geracoes + 1,
              atualizado_em = now()
        where elifoot_v3.coach_avatars.geracoes < p_teto
    returning geracoes into v_n;
  return v_n;   -- null = teto estourado (o ON CONFLICT nao casou o WHERE)
end $$;

revoke all on function elifoot_v3.coach_avatar_consumir(uuid, int) from public, anon, authenticated;
grant execute on function elifoot_v3.coach_avatar_consumir(uuid, int) to service_role;

-- ---------- BUCKETS ----------
-- publico: os retratos prontos, servidos ao jogo como qualquer outra arte.
insert into storage.buckets (id, name, public)
     values ('treinadores', 'treinadores', true)
on conflict (id) do nothing;

-- PRIVADO: a foto pessoal de referencia pousa aqui por alguns segundos e
-- a edge function apaga. Sem policy de SELECT para ninguem: so a service
-- role le. E' o ponto mais sensivel do recurso.
insert into storage.buckets (id, name, public)
     values ('referencias-treinador', 'referencias-treinador', false)
on conflict (id) do nothing;

drop policy if exists ref_treinador_enviar  on storage.objects;
drop policy if exists ref_treinador_remover on storage.objects;

-- so na PROPRIA pasta: o path tem de comecar por {uid}/
create policy ref_treinador_enviar on storage.objects
  for insert to authenticated
  with check (bucket_id = 'referencias-treinador'
              and (storage.foldername(name))[1] = auth.uid()::text);

-- deixa o jogador desistir e apagar a propria foto antes de gerar
create policy ref_treinador_remover on storage.objects
  for delete to authenticated
  using (bucket_id = 'referencias-treinador'
         and (storage.foldername(name))[1] = auth.uid()::text);
