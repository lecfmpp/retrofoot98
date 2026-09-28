/* ============================================================================
   BASE DE CONHECIMENTO DO ASSISTENTE "SOBRE O JOGO"
   ----------------------------------------------------------------------------
   Junta docs/conhecimento/*.md (em ordem de nome) num único texto e grava em
   supabase/functions/sobre-o-jogo/conhecimento.ts, que a edge function manda
   ao Gemini como instrução de sistema a cada pergunta.

   POR QUE UM .ts GERADO, e não ler o .md em tempo de execução: o deploy da
   edge function empacota só o que é IMPORTADO. Um .md solto ao lado do
   index.ts não sobe sem config extra, e a função responderia sem base — sem
   erro, só inventando. Importado, se o ficheiro faltar o deploy quebra.

   Uso:
     node scripts/build-conhecimento.mjs           # regrava o .ts
     node scripts/build-conhecimento.mjs --check   # falha se o .ts estiver velho (CI)

   Para ENSINAR algo novo ao assistente: editar/criar um .md em
   docs/conhecimento/, rodar este script e publicar a função (push na main).
   ============================================================================ */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = join(RAIZ, 'docs', 'conhecimento');
const SAIDA = join(RAIZ, 'supabase', 'functions', 'sobre-o-jogo', 'conhecimento.ts');

const arquivos = readdirSync(PASTA).filter(f => f.endsWith('.md') && f !== 'LEIA-ME.md').sort();
if(!arquivos.length){ console.error('docs/conhecimento/ sem .md — nada para empacotar.'); process.exit(1); }

const texto = arquivos.map(f => readFileSync(join(PASTA, f), 'utf8').trim()).join('\n\n---\n\n');
const secoes = arquivos.map(f => f.replace(/\.md$/, ''));

const ts = `/* GERADO por scripts/build-conhecimento.mjs a partir de docs/conhecimento/*.md.
   NÃO EDITAR À MÃO — edite os .md e rode o script. */
export const SECOES: string[] = ${JSON.stringify(secoes)};
export const CONHECIMENTO: string = ${JSON.stringify(texto)};
`;

if(process.argv.includes('--check')){
  const atual = existsSync(SAIDA) ? readFileSync(SAIDA, 'utf8') : '';
  if(atual !== ts){
    console.error('conhecimento.ts está desatualizado: rode `node scripts/build-conhecimento.mjs` e commite.');
    process.exit(1);
  }
  console.log(`Base de conhecimento em dia (${arquivos.length} seções).`);
} else {
  writeFileSync(SAIDA, ts);
  const palavras = texto.split(/\s+/).length;
  console.log(`conhecimento.ts gravado: ${arquivos.length} seções, ~${palavras} palavras (~${Math.round(palavras*1.6/1000)}k tokens).`);
}
