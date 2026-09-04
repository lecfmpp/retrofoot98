/* ===== tick_rooms: tirar as duas chamadas mortas, e com elas o cronometro =====
   Aplicado em producao a 2026-09-04 (migracao
   `tick_rooms_sem_cronometro_e_sem_funcoes_mortas`).

   O SINTOMA: o cron `elifoot-tick-rooms` (job 7, de 5 em 5 segundos) falhava SEMPRE, com
   "function elifoot_v3.arm_ready_timer(text) does not exist" — 2204 falhas nas 24h em que se
   olhou, e a falhar ha' muito mais tempo do que isso.

   A CAUSA: duas chamadas mortas dentro do ramo 'ready'.
     · elifoot_v3.arm_ready_timer — nao existe em schema nenhum (removida na limpeza do ponteiro
       de dia, sem que o tick_rooms fosse actualizado);
     · elifoot_v3.advance_phase_if_expired — existe so' em `public`, e aqui o search_path e' ''
       (nome qualificado obrigatorio), entao nunca resolveria.

   O QUE ISSO CUSTAVA: a excepcao aborta a instrucao INTEIRA, entao a unica rede que interessava
   — reabrir a rodada orfa quando o anfitriao cai — era desfeita por rollback sempre que qualquer
   sala em 'ready' entrasse no laco. Na pratica o cron estava morto.

   O QUE **NAO** SE FEZ: ressuscitar o arm_ready_timer. O modelo actual e' o do ponteiro de dia
   (docs/sincronia-resenha.md): a sala anda quando todos carimbam, e quem segue sem alguem e' o
   ANFITRIAO, por um botao — nunca um cronometro. As duas chamadas mortas eram as duas pontas do
   modelo velho (armar o prazo; avancar quando ele vence) e por isso saem em vez de voltar. O
   servidor tambem nao comeca rodada: `start_running` e' exclusiva do anfitriao.

   FICA exactamente UMA accao automatica, a mesma que o cliente ja' faz pelo cao de guarda: a
   rodada 'running' sem ninguem ocupado e parada ha' mais do que a carencia volta a abrir.

   POR FAZER: existe um segundo tick_rooms(boolean,integer) — a versao de 2 argumentos, que o cron
   nao chama — ainda com as duas chamadas mortas. Nao foi tocada por nao se saber quem a chama;
   se ninguem a chamar, o certo e' larga-la (DROP).
*/

CREATE OR REPLACE FUNCTION elifoot_v3.tick_rooms(p_dry boolean DEFAULT true, p_ativa_min integer DEFAULT 10, p_reabrir_min integer DEFAULT 2)
 RETURNS TABLE(game_id text, fase text, acao text, detalhe text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  g record; v_busy int; v_seats int; v_naoprontos int; v_res text; v_parada int;
begin
  for g in
    select gm.id, gm.phase, gm.ready_deadline, gm.paused, gm.round, gm.updated_at
      from elifoot_v3.games gm
     where gm.phase in ('ready','running')
       and coalesce(gm.paused,false) = false
       and exists (
         select 1 from elifoot_v3.game_seats s
          where s.game_id = gm.id and s.user_id is not null
            and s.last_seen is not null
            and s.last_seen > now() - make_interval(mins => p_ativa_min))
  loop
    select count(*) into v_busy from elifoot_v3.game_seats s
      where s.game_id = g.id and s.user_id is not null
        and s.busy_until is not null and s.busy_until > now();
    select count(*) into v_seats from elifoot_v3.game_seats s
      where s.game_id = g.id and s.user_id is not null;
    select count(*) into v_naoprontos from elifoot_v3.game_seats s
      where s.game_id = g.id and s.user_id is not null and coalesce(s.is_ready,false) = false;
    v_parada := round(extract(epoch from now() - g.updated_at));

    if g.phase = 'running' then
      if v_busy > 0 then
        game_id:=g.id; fase:=g.phase; acao:='espera'; detalhe:=v_busy||' em campo/cerimônia';
        return next;
      elsif v_parada < p_reabrir_min * 60 then
        -- CARÊNCIA: alguém pode estar fechando a rodada agora. Não reabre por baixo dele.
        game_id:=g.id; fase:=g.phase; acao:='carencia';
        detalhe:='parada há '||v_parada||'s (reabre a partir de '||(p_reabrir_min*60)||'s)';
        return next;
      else
        if p_dry then v_res:='reabriria';
        else v_res:='reopen:'||elifoot_v3.reopen_ready(g.id); end if;
        game_id:=g.id; fase:=g.phase; acao:=v_res;
        detalhe:='rodada '||g.round||' órfã há '||v_parada||'s, ninguém ocupado';
        return next;
      end if;

    else -- 'ready': o servidor OLHA e não age (ver o cabeçalho)
      game_id:=g.id; fase:=g.phase; acao:='observa';
      detalhe := case when v_busy > 0
                      then v_busy||' ocupado(s) — a sala espera por eles'
                      else v_naoprontos||' de '||v_seats||' ainda não prontos — quem segue sem eles é o anfitrião' end;
      return next;
    end if;
  end loop;
  return;
end;
$function$;
