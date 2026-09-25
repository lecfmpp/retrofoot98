/* ============================================================================
   CÓPIA DO PACOTE OFICIAL DENTRO DO JOGO
   ----------------------------------------------------------------------------
   O pacote oficial (nomes fictícios de clubes e jogadores, escudos, calendários)
   mora no Supabase e o net/dados.js o busca a cada visita. Quando o Supabase cai,
   quem abre o jogo SEM o cache do localStorage (jogador novo, outro aparelho, aba
   anónima) recebia o catálogo de fábrica — nomes, escudos e jogadores REAIS — e
   o save criado ali ficava com eles para sempre. Aconteceu em 24/09/2026.

   Este script grava o pacote em public/src/data/pacote-oficial.js, que o
   index.html carrega antes do dados.js. Assim o jogo nunca depende da rede para
   ter os nomes fictícios: a rede só serve para trazer edições mais novas.

   Corre no `npm run build`. Supabase fora do ar na hora do build = mantém a
   cópia que já está no repo (e avisa). Sem cópia nenhuma = FALHA, e o deploy
   não sai — publicar sem o pacote é exatamente o bug que isto evita.

   Uso:  node scripts/pacote-oficial-snapshot.mjs
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DESTINO = path.join(RAIZ, 'public/src/data/pacote-oficial.js');
const REST = 'https://alxwgqvjmetjbbqtjkhx.supabase.co/rest/v1/';
const SB_KEY = 'sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';
const CAB = { apikey:SB_KEY, Authorization:'Bearer '+SB_KEY, 'Accept-Profile':'elifoot_v3' };
const PAGINA = 1000;
/* o pacote de hoje tem ~80 clubes com `squad`; bem menos que isso é pacote
   cortado a meio, e gravar isso por cima de uma cópia boa seria pior que nada */
const MINIMO_SQUADS = 60;

async function pegar(url){
  const r = await fetch(url, { headers:CAB, signal:AbortSignal.timeout(30000) });
  if(!r.ok) throw new Error('HTTP '+r.status+' em '+url.split('?')[0]);
  return r.json();
}

async function baixar(){
  const ps = await pegar(REST+'data_packs?select=id&oficial=is.true&limit=1');
  if(!ps.length) throw new Error('nenhum pacote marcado como oficial');
  const id = ps[0].id;
  const v = [];
  for(let de = 0; ; de += PAGINA){
    const linhas = await pegar(REST+'pack_edits?select=club_id,divisao,novo,patch'
      +'&pack_id=eq.'+id+'&order=club_id.asc&limit='+PAGINA+'&offset='+de);
    v.push(...linhas);
    if(linhas.length < PAGINA) break;
  }
  return { id, t:Date.now(), v };
}

/* `squad` é um objeto {nome real (##N) → nome novo}, ver aplicar() no dados.js */
function squads(p){ return p.v.filter(e => e.patch && e.patch.squad && Object.keys(e.patch.squad).length).length; }

function lerAtual(){
  if(!fs.existsSync(DESTINO)) return null;
  const s = fs.readFileSync(DESTINO, 'utf8');
  return JSON.parse(s.slice(s.indexOf('=') + 1).trim().replace(/;\s*$/, ''));
}

const atual = lerAtual();
try{
  const novo = await baixar();
  if(squads(novo) < MINIMO_SQUADS)
    throw new Error('pacote veio com só '+squads(novo)+' elencos (mínimo '+MINIMO_SQUADS+')');
  fs.writeFileSync(DESTINO,
    '/* GERADO por scripts/pacote-oficial-snapshot.mjs — não editar à mão. */\n'
    + 'window.RF_PACOTE_OFICIAL = ' + JSON.stringify(novo) + ';\n');
  console.log('pacote oficial: '+novo.v.length+' linhas, '+squads(novo)+' elencos → '+path.relative(RAIZ, DESTINO));
}catch(e){
  if(atual && squads(atual) >= MINIMO_SQUADS){
    console.warn('⚠ pacote oficial: não deu para baixar ('+e.message+'). Mantendo a cópia de '
      + new Date(atual.t).toISOString() + ' ('+squads(atual)+' elencos).');
  }else{
    console.error('✖ pacote oficial: não deu para baixar ('+e.message+') e não há cópia válida no repo.\n'
      + '  Publicar assim põe nomes e escudos REAIS no jogo de quem não tem cache. Build interrompido.');
    process.exit(1);
  }
}
