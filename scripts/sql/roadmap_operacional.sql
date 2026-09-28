-- ===== MARKETING E OPERAÇÃO — TERCEIRA CATEGORIA (27/09/2026) =====
-- Pedido do dono: há itens que não são bug nem recurso do jogo — marketing e tarefas operacionais dos
-- sócios. adm_features.tipo ganha 'operacional': aba própria no Roadmap do painel, NÃO passa pela
-- votação e NUNCA vai ao roadmap público (como bug).
-- O andamento reusa a coluna bug_status (é o "status interno" dos itens que não vão ao roadmap):
--   aberto = A fazer · corrigindo = Fazendo · corrigido = Feito · nao_e_bug = Descartado
-- (os rótulos por tipo ficam no painel, ver BUG_ST/OPS_ST em admin.js).
-- Pré-classificação: só títulos claramente de marketing/operação; arquivados que estavam "Feito" entram
-- como Feito. Os demais arquivados ficam como os sócios deixaram.

alter table admin_rf98.adm_features drop constraint if exists adm_features_tipo_chk;
alter table admin_rf98.adm_features add constraint adm_features_tipo_chk check (tipo in ('recurso','bug','operacional'));

update admin_rf98.adm_features f set tipo = 'operacional',
       bug_status = case when c.nome = 'Feito' then 'corrigido' else 'aberto' end
       -- (a 1ª versão também punha as arquivadas em 'pendente' — ERRO, desarquivava o que o sócio
       --  arquivou; corrigido e reparado em arquivo_respeitado.sql. Nunca mexer em ideia_status aqui.)
  from admin_rf98.adm_kanban_cols c
 where c.id = f.coluna_id and f.tipo = 'recurso' and f.ideia_status in ('pendente','arquivada')
   and f.titulo in (
     'Definir a sequência de e-mails da lista de espera', 'Newsletter de atualizações do jogo',
     'Email mkt dentro do save aberto', 'Criar capa para o canal do Youtube',
     'Já está no Drive os textos da Política de Pivacidade e Termos de Uso', 'Nova logo e identidade visual no site',
     'Nova página de Vídeos no painel', 'Perguntas no modal da Lista de Espera', 'Publicidade no e-mail do treinador',
     'Respostas de e-mail coerentes, com os links certos', 'Revisar imagens e textos da homepage',
     'Conectar o meio de pagamento', 'Ajustar publicidade e banners');

-- nem bug nem operacional entram na votação do roadmap
create or replace function admin_rf98.ideia_nao_bug() returns trigger language plpgsql as $$
begin
  if exists (select 1 from admin_rf98.adm_features where id = new.ideia_id and tipo in ('bug','operacional')) then
    raise exception 'Só recurso do jogo vai para o roadmap — bug e marketing/operação não entram na votação';
  end if;
  return new;
end $$;
