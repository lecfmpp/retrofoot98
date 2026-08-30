-- RESTAURA O SQUAD DO PALMEIRAS (club_id 1023) NO PACOTE OFICIAL
--
-- O QUE ACONTECEU. Salvar um clube no painel gravava a coluna `patch` INTEIRA. Quando o
-- formulario do elenco nao estava carregado, o diff saia sem `squad` e o patch era regravado
-- sem ele -- apagando os 30 nomes ficticios do Palmeiras. O bug foi corrigido em fd24208
-- ("o patch que deixou de se apagar"), mas o estrago ja' estava feito neste clube.
--
-- POR QUE AS FOTOS "SUMIRAM". Elas nao sumiram: estao todas em player_photos, com URL valida.
-- Foram geradas com os nomes FICTICIOS (Alex Bezerra, Fabio Nascimento...). Sem o squad no
-- patch, o clube volta aos nomes reais (Lucas Evangelista, Erick Bele...) e o painel, que casa
-- foto por (club_id, nome), nao encontra nenhuma. Restaurado o squad, as 30 reaparecem.
--
-- E' SEGURO. `patch || '{...}'` faz MERGE: as chaves crest, name e short do Palmeiras ficam
-- como estao; so' `squad` volta. E e' idempotente -- rodar duas vezes da' o mesmo resultado.
-- Conferido: dos 80 clubes cobertos pelo gerador de nomes, o Palmeiras e' o UNICO sem squad.
--
-- Reverter: scripts/sql/nomes-ficticios-reverter.sql (linha do club_id 1023).

set search_path to elifoot_v3;

update pack_edits set patch = patch || '{"squad":{"Erick Belé":{"n":"Fábio Nascimento"},"Mauricio":{"n":"Maicon Freitas"},"Carlos Miguel":{"n":"Samuel Correia"},"Luighi":{"n":"Wellington Bezerra"},"Lucas Evangelista":{"n":"Alex Bezerra"},"Alexander Barboza":{"n":"Carlos Melo"},"Naves":{"n":"Antônio Guimarães"},"Khellven":{"n":"Tiago Nascimento"},"Allan":{"n":"Gabriel Teixeira"},"Emiliano Martínez":{"n":"André Cavalcanti"},"Riquelme Fillipi":{"n":"Vagner Pereira"},"Joaquín Piquerez":{"n":"Vitor Machado"},"Andreas Pereira":{"n":"Otávio Guimarães"},"Paulinho":{"n":"Anderson Oliveira"},"Arthur Gabriel":{"n":"Vinícius Souza"},"Luis Pacheco":{"n":"Carlos Machado"},"Luis Benedetti":{"n":"Emerson Ferreira"},"Flaco López":{"n":"Matheus Silva"},"Felipe Anderson":{"n":"Felipe Nascimento"},"Ramón Sosa":{"n":"André Rocha"},"Murilo":{"n":"Vinícius Farias"},"Kaique Pereira":{"n":"Gustavo Farias"},"Jefté":{"n":"Paulinho"},"Gustavo Gómez":{"n":"Wesley Peixoto"},"Marlon Freitas":{"n":"Cico"},"Bruno Fuchs":{"n":"Cícero Batista"},"Jhon Arias":{"n":"Gabriel Correia"},"Agustín Giay":{"n":"Alex Oliveira"},"Larson":{"n":"Sebastião Martins"},"Vitor Roque":{"n":"Vagner Teixeira"}}}'::jsonb where pack_id = '61717da5-0f7a-48a1-ae6e-acacacad8cf5' and club_id = '1023';

-- confere: tem de voltar 30
select club_id,
       (select count(*) from jsonb_object_keys(coalesce(patch->'squad','{}'::jsonb))) as jogadores_no_squad
from pack_edits where club_id = '1023';
