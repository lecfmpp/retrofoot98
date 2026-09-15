#!/usr/bin/env node
/* CHECAGEM DIÁRIA: o ranking de treinadores está recebendo dado novo?
   ===========================================================================
   POR QUE EXISTE. A escrita do ranking (coach_titles/coach_seasons) é
   deliberadamente silenciosa (ver enviarTitulos/enviarTemporadas em
   public/src/engine/core.js): se o RPC de gravação falhar em produção (RLS,
   timeout, migração revertida), ninguém vê erro nenhum — só sumiria um
   console.warn no navegador de quem estivesse jogando. Este script é o
   substituto: chama o MESMO RPC que a tela de ranking usa (rf_ranking,
   security definer, chave pública) e reporta a atividade mais recente.

   NÃO precisa de service_role: rf_ranking já é a leitura pública de produção
   (a mesma que a faixa do topo do jogo chama a cada carga de página). */
import { SB_URL, SCHEMA, chave } from './_supabase.mjs';

async function rfRanking(modo, limite) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/rf_ranking`, {
    method: 'POST',
    headers: {
      apikey: chave(), Authorization: `Bearer ${chave()}`,
      'Content-Profile': SCHEMA, 'Accept-Profile': SCHEMA, 'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_modo: modo, p_limite: limite }),
  });
  if (!res.ok) throw new Error(`rf_ranking(${modo}) → HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

function horasDesde(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 36e5;
}

const LIMIAR_HORAS = Number(process.env.RANKING_LIMIAR_HORAS || 48);

const linhas = await rfRanking('geral', 100);
if (!linhas.length) {
  console.log('⚠ rf_ranking devolveu ZERO linhas — coach_titles/coach_seasons parecem vazios, ou o RPC mudou.');
  process.exit(1);
}

const maisRecente = linhas.reduce((a, b) => (horasDesde(a.ultimo) < horasDesde(b.ultimo) ? a : b));
const h = horasDesde(maisRecente.ultimo);
const totalTitulos = linhas.reduce((s, l) => s + Number(l.titulos || 0), 0);
const totalTemporadas = linhas.reduce((s, l) => s + Number(l.temporadas || 0), 0);

console.log(`Treinadores no ranking: ${linhas.length}  ·  títulos somados: ${totalTitulos}  ·  temporadas somadas: ${totalTemporadas}`);
console.log(`Atividade mais recente: ${maisRecente.treinador} — ${maisRecente.ultimo} (${h.toFixed(1)}h atrás)`);

if (h > LIMIAR_HORAS) {
  console.log(`⚠ Nenhum registro novo em coach_titles/coach_seasons há mais de ${LIMIAR_HORAS}h — pode ser só falta de jogo, ou a gravação parou de funcionar. Vale conferir se alguém jogou nesse período.`);
  process.exit(1);
}
console.log('✓ ranking com atividade recente');
