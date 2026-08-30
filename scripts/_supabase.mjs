/* CLIENTE REST MÍNIMO DO SUPABASE PARA OS SCRIPTS DE BANCADA.

   POR QUE EXISTE. scripts/upload-intl-leagues.mjs já falava com a REST API na mão. Com o backup,
   a auditoria e os backfills, viraram cinco scripts com o mesmo cabeçalho de autenticação e a
   mesma paginação — e paginação escrita cinco vezes é paginação errada em algum lugar. Aqui é
   uma vez só.

   AS DUAS CHAVES, e por que a auditoria não deve exigir a privilegiada:

   · A PUBLICÁVEL é a mesma que o site carrega (supabase-adapter.js) — pública por desenho, vai
     no bundle. Basta para ler o que o próprio jogo lê: player_photos, pack_edits, division_clubs.
     É o suficiente para `auditar-fotos.mjs`, que roda a cada fase; uma checagem de rotina que
     pedisse credencial de service_role acabaria não sendo rodada.
   · A SERVICE_ROLE (`SUPABASE_SERVICE_KEY`, painel > Settings > API) fica só na env de quem
     roda, nunca commitada. É exigida para escrever e para ler o que a RLS protege — o backup
     precisa enxergar solo_saves e games. Peça-a com `chave({ escrita: true })`. */
export const SB_URL = 'https://alxwgqvjmetjbbqtjkhx.supabase.co';
export const SCHEMA = 'elifoot_v3';
const PUBLICAVEL = 'sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';

/* Uma service_role e' um JWT (`eyJ...`, tre^s partes) ou uma chave nova (`sb_secret_...`).
   Conferir o FORMATO antes de sair usando evita o modo de falha mais chato: copiar o
   placeholder do exemplo, ou meia chave, e receber de volta um "HTTP 401 Invalid API key" com
   stack trace do fetch -- que nao diz que o problema esta' na variavel de ambiente. */
function pareceChave(k) {
  return /^eyJ[\w-]*\.[\w-]+\.[\w-]+$/.test(k) || /^sb_secret_[\w-]{10,}$/.test(k);
}

export function chave({ escrita = false } = {}) {
  const k = process.env.SUPABASE_SERVICE_KEY;
  if (k && pareceChave(k)) return k;
  if (k) {
    console.error(`❌ SUPABASE_SERVICE_KEY não parece uma chave: ${JSON.stringify(k.slice(0, 24))}${k.length > 24 ? '…' : ''}`);
    console.error('   A service_role começa com "eyJ" (JWT) ou "sb_secret_".');
    console.error('   Pegue em: Supabase > Settings > API > service_role (secret).');
    process.exit(1);
  }
  if (escrita) {
    console.error('❌ Esta operação precisa de SUPABASE_SERVICE_KEY (service_role, painel Supabase > Settings > API).');
    console.error('   Ex.: SUPABASE_SERVICE_KEY="eyJ..." node scripts/<este-script>.mjs');
    process.exit(1);
  }
  return PUBLICAVEL;
}

function cabecalhos(extra = {}, opts = {}) {
  const k = chave(opts);
  return { apikey: k, Authorization: `Bearer ${k}`, 'Accept-Profile': SCHEMA, 'Content-Profile': SCHEMA, ...extra };
}

/* Lê uma tabela inteira, paginando. O PostgREST tem teto por requisição (1000 por padrão), então
   uma leitura sem paginação devolve um resultado TRUNCADO em silêncio — que num script de backup
   seria a pior falha possível: um dump que parece completo e não é. */
export async function ler(tabela, { select = '*', ordem = null, pagina = 1000, privilegiado = false } = {}) {
  const out = [];
  for (let de = 0; ; de += pagina) {
    const q = new URLSearchParams({ select });
    if (ordem) q.set('order', ordem);
    const res = await fetch(`${SB_URL}/rest/v1/${tabela}?${q}`, {
      headers: cabecalhos({ Range: `${de}-${de + pagina - 1}`, 'Range-Unit': 'items' }, { escrita: privilegiado }),
    });
    if (!res.ok) throw new Error(`GET ${tabela} → HTTP ${res.status}: ${await res.text()}`);
    const lote = await res.json();
    out.push(...lote);
    if (lote.length < pagina) return out;
  }
}

export async function contar(tabela, { privilegiado = false } = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${tabela}?select=*`, {
    headers: cabecalhos({ Prefer: 'count=exact', Range: '0-0' }, { escrita: privilegiado }),
  });
  if (!res.ok) throw new Error(`COUNT ${tabela} → HTTP ${res.status}`);
  return Number((res.headers.get('content-range') || '/0').split('/')[1] || 0);
}

/* Upsert em lotes. `conflito` são as colunas da unique key, como o PostgREST espera. */
export async function upsert(tabela, linhas, conflito, tamanho = 200) {
  let feitas = 0;
  for (let i = 0; i < linhas.length; i += tamanho) {
    const lote = linhas.slice(i, i + tamanho);
    const res = await fetch(`${SB_URL}/rest/v1/${tabela}?on_conflict=${conflito}`, {
      method: 'POST',
      headers: cabecalhos({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, { escrita: true }),
      body: JSON.stringify(lote),
    });
    if (!res.ok) throw new Error(`UPSERT ${tabela} lote ${i} → HTTP ${res.status}: ${await res.text()}`);
    feitas += lote.length;
    process.stdout.write(`\r   ${tabela}: ${feitas}/${linhas.length}`);
  }
  if (linhas.length) process.stdout.write('\n');
  return feitas;
}
