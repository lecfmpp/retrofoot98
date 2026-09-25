-- CLUBE FICTÍCIO NA LISTA DE USUÁRIOS (25/09/2026)
-- A lista mostrava o id do clube sem prefixo ("flamengo") — o nome REAL. Agora admin_rf98.usuarios
-- devolve o clube do save/assento MAIS RECENTE (antes era max(club_id), o maior em ordem
-- alfabética) com o nome e o escudo do PACOTE OFICIAL (os mesmos que o jogo mostra):
--   clube_nome    patch.short/name do pacote; sem ele, solo_saves.club_short (o nome gravado
--                 pelo próprio jogo, que já vem fictício — cobre os clubes de fora do Brasil)
--   clube_escudo  patch.crest do pacote (URL no Storage); sem ele, o painel mostra só as letras
-- Patch por substituição exata, como os anteriores.
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('admin_rf98.usuarios'::regproc);
  if position('clube_escudo' in d) > 0 then return; end if;          -- já aplicado

  n := replace(d, 'max(s.club_id) clube',
    '(array_agg(s.club_id order by s.updated_at desc))[1] clube,' ||
    ' (array_agg(s.club_short order by s.updated_at desc))[1] clube_curto');
  if n = d then raise exception 'usuarios: clube do solo não encontrado'; end if;
  d := n;
  n := replace(d, 'max(a.club_id) clube',
    '(array_agg(a.club_id order by greatest(a.last_seen, a.joined_at) desc nulls last))[1] clube');
  if n = d then raise exception 'usuarios: clube da resenha não encontrado'; end if;
  d := n;
  n := replace(d, '  tempo as (',
    '  pacote as (select e.club_id, coalesce(nullif(e.patch->>''short'',''''), nullif(e.patch->>''name'','''')) nome,' ||
    ' nullif(e.patch->>''crest'','''') escudo from elifoot_v3.pack_edits e' ||
    ' join elifoot_v3.data_packs dp on dp.id = e.pack_id and dp.oficial),' || chr(10) ||
    '  tempo as (');
  if n = d then raise exception 'usuarios: CTE tempo não encontrada'; end if;
  d := n;
  n := replace(d, '    left join tempo t on t.user_id = b.id',
    '    left join tempo t on t.user_id = b.id' || chr(10) ||
    '    left join pacote pk on pk.club_id = coalesce(so.clube, re.clube)');
  if n = d then raise exception 'usuarios: join de tempo não encontrado'; end if;
  d := n;
  n := replace(d, '''criado_em'', b.created_at,',
    '''criado_em'', b.created_at, ''clube_nome'', coalesce(pk.nome, so.clube_curto),' ||
    ' ''clube_escudo'', pk.escudo,');
  if n = d then raise exception 'usuarios: campo criado_em não encontrado'; end if;
  execute n;
end $$;
