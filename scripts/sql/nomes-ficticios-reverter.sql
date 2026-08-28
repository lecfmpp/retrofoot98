-- REVERTER os nomes fictícios de jogador
-- Gerado por scripts/nomes-ficticios.mjs — não editar à mão.
-- Pacote oficial 61717da5-0f7a-48a1-ae6e-acacacad8cf5 · 80 clubes · 1900 jogadores
set search_path to elifoot_v3;
begin;

-- 1/2 tira os alvos do caminho (a PK não aceita a cadeia de uma vez)
with mapa as (
       select e.club_id, k as de, e.patch->'squad'->k->>'n' as para
         from pack_edits e, lateral jsonb_object_keys(e.patch->'squad') k
        where e.pack_id = '61717da5-0f7a-48a1-ae6e-acacacad8cf5' and e.patch ? 'squad' and k !~ '##[0-9]+$'
     )
update player_photos p set jogador = '~ren~' || p.jogador
 from mapa m
 where p.pack_id = '61717da5-0f7a-48a1-ae6e-acacacad8cf5' and p.club_id = m.club_id and p.jogador = m.para;
-- 2/2 grava o nome definitivo
with mapa as (
       select e.club_id, k as de, e.patch->'squad'->k->>'n' as para
         from pack_edits e, lateral jsonb_object_keys(e.patch->'squad') k
        where e.pack_id = '61717da5-0f7a-48a1-ae6e-acacacad8cf5' and e.patch ? 'squad' and k !~ '##[0-9]+$'
     )
update player_photos p set jogador = m.de
 from mapa m
 where p.pack_id = '61717da5-0f7a-48a1-ae6e-acacacad8cf5' and p.club_id = m.club_id and p.jogador = '~ren~' || m.para;

update pack_edits set patch = patch - 'squad' where pack_id = '61717da5-0f7a-48a1-ae6e-acacacad8cf5';
commit;
