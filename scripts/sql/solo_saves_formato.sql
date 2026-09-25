-- TRAVA DO SAVE COMPRIMIDO (25/09/2026)
-- Desde o formato 'gz1' (ver empacotarSave em public/src/net/supabase-adapter.js) o `S` gravado
-- é só um RESUMO marcado com `_comprimido` e o estado inteiro vai em `Sz`. Um cliente ANTIGO
-- (aba aberta antes do deploy) que carregue um save assim não conhece `Sz`: fica com o resumo
-- como se fosse o jogo e, ao gravar, mandaria o resumo sem `Sz` — apagando a carreira inteira.
-- Esta trava recusa exatamente essa escrita. Cliente novo nunca manda `_comprimido` sem `Sz`.
create or replace function elifoot_v3.solo_saves_formato() returns trigger
language plpgsql as $$
begin
  if jsonb_typeof(new.state->'S') = 'object'
     and (new.state->'S') ? '_comprimido'
     and not (new.state ? 'Sz') then
    raise exception 'SAVE_FORMATO: esta aba está desatualizada — recarregue a página para gravar'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists solo_saves_formato on elifoot_v3.solo_saves;
create trigger solo_saves_formato
  before insert or update of state on elifoot_v3.solo_saves
  for each row execute function elifoot_v3.solo_saves_formato();
