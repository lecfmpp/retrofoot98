-- ===== FOTO DE FIM DE TEMPORADA NA NUVEM (Modo Solo) =====
-- O "voltar a um ponto guardado" (Configuracoes) so' lia o IndexedDB do navegador: noutro
-- aparelho, noutro navegador ou depois de limpar os dados, a lista vinha vazia. A foto de FIM
-- DE TEMPORADA passa a ir tambem para aqui, tirada na virada (clAdvanceSeason), antes de
-- newSeasonReset — e' o ponto que salva uma carreira quando a virada corre mal (save do GRINGO,
-- 23/09). As fotos de rodada continuam so' locais: 3 MB a cada rodada, para todos, e' caro.
--
-- `seed` separa carreiras com o MESMO nome de save: um jogo novo gravado por cima de "SAVE01"
-- nao pode oferecer as fotos da carreira antiga. O trigger apaga as de outra semente e guarda
-- as 3 temporadas mais recentes de cada carreira.

create table if not exists elifoot_v3.solo_save_fotos (
  id         bigserial primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  save_name  text not null,
  seed       text not null,
  club_id    text,
  season     integer not null,
  round      integer,
  state      jsonb not null,
  criado_em  timestamptz not null default now(),
  unique (user_id, save_name, seed, season)
);

alter table elifoot_v3.solo_save_fotos enable row level security;

drop policy if exists v3_solo_save_fotos_select on elifoot_v3.solo_save_fotos;
drop policy if exists v3_solo_save_fotos_insert on elifoot_v3.solo_save_fotos;
drop policy if exists v3_solo_save_fotos_update on elifoot_v3.solo_save_fotos;
drop policy if exists v3_solo_save_fotos_delete on elifoot_v3.solo_save_fotos;
create policy v3_solo_save_fotos_select on elifoot_v3.solo_save_fotos for select to authenticated using (auth.uid() = user_id);
create policy v3_solo_save_fotos_insert on elifoot_v3.solo_save_fotos for insert to authenticated with check (auth.uid() = user_id);
create policy v3_solo_save_fotos_update on elifoot_v3.solo_save_fotos for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy v3_solo_save_fotos_delete on elifoot_v3.solo_save_fotos for delete to authenticated using (auth.uid() = user_id);

revoke all on elifoot_v3.solo_save_fotos from anon;
grant select, insert, update, delete on elifoot_v3.solo_save_fotos to authenticated;
grant usage, select on sequence elifoot_v3.solo_save_fotos_id_seq to authenticated;

create or replace function elifoot_v3.solo_save_fotos_poda()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  delete from elifoot_v3.solo_save_fotos f
   where f.user_id = new.user_id and f.save_name = new.save_name and f.seed <> new.seed;
  delete from elifoot_v3.solo_save_fotos f
   where f.user_id = new.user_id and f.save_name = new.save_name and f.seed = new.seed
     and f.id not in (select g.id from elifoot_v3.solo_save_fotos g
                       where g.user_id = new.user_id and g.save_name = new.save_name and g.seed = new.seed
                       order by g.season desc limit 3);
  return null;
end; $$;

drop trigger if exists solo_save_fotos_poda on elifoot_v3.solo_save_fotos;
create trigger solo_save_fotos_poda after insert or update on elifoot_v3.solo_save_fotos
  for each row execute function elifoot_v3.solo_save_fotos_poda();
