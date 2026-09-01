/* BUCKET DAS TAÇAS — arte de troféu enviada pelo painel (Editor de dados > Troféus & nomes).
   Espelha byte a byte as políticas do bucket `escudos`: qualquer um LÊ (o jogo mostra a taça
   sem estar autenticado), e só quem tem a permissão 'dados' no painel ESCREVE ou APAGA.
   Sem UPDATE de propósito — o painel nunca reescreve um objeto: cada envio gera um caminho
   novo (`<pais>/<comp>-<timestamp>.<ext>`), então trocar a arte não depende de upsert e a
   versão anterior continua servindo quem tem a página aberta.
   JÁ APLICADO em 01/09/2026 no projeto alxwgqvjmetjbbqtjkhx. Fica aqui como registro. */
insert into storage.buckets (id, name, public, file_size_limit)
values ('trofeus','trofeus',true, 2097152)
on conflict (id) do nothing;

drop policy if exists trofeus_read on storage.objects;
create policy trofeus_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'trofeus');

drop policy if exists trofeus_write on storage.objects;
create policy trofeus_write on storage.objects for insert to authenticated
  with check (bucket_id = 'trofeus' and admin_rf98.pode('dados'));

drop policy if exists trofeus_del on storage.objects;
create policy trofeus_del on storage.objects for delete to authenticated
  using (bucket_id = 'trofeus' and admin_rf98.pode('dados'));
