-- REGISTRO DE IDENTIDADE DO CATALOGO — aplicado em 2026-08-28 (elifoot_v3).
--
-- O jogo NAO le estas tabelas. Elas existem para que a identidade de clubes e jogadores fique
-- visivel e auditavel num lugar so', em vez de espalhada por quatro bundles .js de 1,9 MB. Sao
-- a origem dos ids novos (jogadoras e clubes femininos) e o espelho do que ja' existe.
--
-- POR QUE club_id FICA COMO ESTA'. Ele esta' gravado como texto dentro de player_photos (846
-- linhas), pack_edits (81), do JSON de 54 solo_saves e do shared_state de 27 salas. Renomear os
-- cinco formatos legados exigiria reescrever tudo isso de forma coordenada e sem falhas -- uma
-- linha esquecida seria foto orfa, patch perdido ou save quebrado. Aqui eles sao apenas
-- CLASSIFICADOS pela coluna `formato`.

create table if not exists elifoot_v3.catalog_clubs (
  club_id     text primary key,                        -- o id LEGADO, exatamente como esta' hoje
  formato     text not null,                           -- numerico | br | intl | cmb | proc | cf
  modalidade  text not null default 'masc',            -- masc | fem
  base_club   text,                                    -- so' para clube feminino: aponta o masculino
  country     text,
  division    text,
  -- SO' O ROTULO CURTO. O nome longo e o escudo ficam de fora de proposito: vivem no bundle, e
  -- uma segunda copia aqui seria a divergencia que este trabalho existe para evitar.
  short       text,
  criado_em   timestamptz not null default now(),
  constraint catalog_clubs_modalidade_ck check (modalidade in ('masc','fem')),
  -- um clube feminino sem base_club nao teria de onde herdar nome, escudo e cores
  constraint catalog_clubs_base_ck check (modalidade = 'masc' or base_club is not null)
);

create table if not exists elifoot_v3.catalog_players (
  player_id       text primary key,                    -- jm000001 (masculino) | jf000001 (feminina)
  modalidade      text not null,
  nome            text not null,
  pos             text,
  -- ORIGEM, NAO DONO: o jogador e' transferido durante o save e o id NAO acompanha o clube.
  -- Serve para auditoria (de onde ele saiu no catalogo), nunca como identidade.
  club_id_origem  text references elifoot_v3.catalog_clubs(club_id),
  country         text,
  division        text,
  criado_em       timestamptz not null default now(),
  constraint catalog_players_modalidade_ck check (modalidade in ('masc','fem'))
);

create index if not exists catalog_clubs_modalidade_ix on elifoot_v3.catalog_clubs (modalidade);
create index if not exists catalog_clubs_base_ix       on elifoot_v3.catalog_clubs (base_club);
create index if not exists catalog_players_clube_ix    on elifoot_v3.catalog_players (club_id_origem);
create index if not exists catalog_players_modal_ix    on elifoot_v3.catalog_players (modalidade);
-- o nome deixa de ser identidade, mas continua sendo por onde se procura
create index if not exists catalog_players_nome_ix     on elifoot_v3.catalog_players (nome);

-- Mesmo padrao de division_clubs: leitura publica, escrita so' pela service_role (que passa por
-- cima do RLS). O painel podera' ler; ninguem escreve pela API anonima.
alter table elifoot_v3.catalog_clubs   enable row level security;
alter table elifoot_v3.catalog_players enable row level security;
drop policy if exists catalog_clubs_sel   on elifoot_v3.catalog_clubs;
drop policy if exists catalog_players_sel on elifoot_v3.catalog_players;
create policy catalog_clubs_sel   on elifoot_v3.catalog_clubs   for select using (true);
create policy catalog_players_sel on elifoot_v3.catalog_players for select using (true);
