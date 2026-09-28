/* ============================================================================
   VALIDA AS RESPOSTAS PRONTAS DO "SOBRE O JOGO" antes do push
   ----------------------------------------------------------------------------
   docs/conhecimento/faq/*.json são a fonte das respostas prontas 'claude'.
   Quem as leva ao banco é o próprio banco: o botão "Atualizar respostas
   prontas" do painel chama admin_rf98.sobre_faq_sincronizar(), que baixa estes
   JSON da main no GitHub (scripts/sql/sobre_faq.sql). Lá também há validação,
   mas um erro lá só aparece depois do push — aqui aparece antes.

   Uso: node scripts/validar-faq.mjs
   ============================================================================ */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PASTA = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'conhecimento', 'faq');
const erros = [], avisos = [], ids = new Set();
let total = 0;
for (const f of readdirSync(PASTA).filter(f => f.endsWith('.json')).sort()) {
  let arr;
  try { arr = JSON.parse(readFileSync(join(PASTA, f), 'utf8')); }
  catch (e) { erros.push(`${f}: JSON inválido (${e.message})`); continue; }
  if (!Array.isArray(arr)) { erros.push(`${f}: não é uma lista`); continue; }
  arr.forEach((q, i) => {
    const onde = `${f}#${i} (${q && q.id})`;
    if (!q || typeof q.id !== 'string' || !/^\d\d-\d{3}$/.test(q.id)) return erros.push(`${onde}: id inválido (formato NN-NNN)`);
    if (ids.has(q.id)) return erros.push(`${onde}: id repetido`);
    if (!String(q.pergunta || '').trim() || !String(q.resposta || '').trim()) return erros.push(`${onde}: sem pergunta ou resposta`);
    ids.add(q.id); total++;
    if (!Array.isArray(q.variacoes) || q.variacoes.length < 3) avisos.push(`${onde}: poucas variações — a busca acha menos`);
  });
}
avisos.forEach(a => console.warn('aviso:', a));
if (erros.length) { console.error(erros.join('\n')); process.exit(1); }
console.log(`${total} respostas prontas válidas. Depois do push na main: painel → Sobre o jogo → Atualizar respostas prontas.`);
