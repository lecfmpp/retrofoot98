/* ============================================================================
   CARTÃO DE PARTILHA — garante que a meta tag aponta para uma imagem QUE EXISTE
   ----------------------------------------------------------------------------
   O og:image do site e o da página de convite apontam para a MORADA FIXA do
   criativo (rf98.resenha.invite/atual.png), reescrita pelo painel a cada
   publicação: é isso que deixa trocar a arte sem republicar o site.

   Só que a morada fixa nasce na primeira publicação feita pelo painel novo.
   Enquanto ela não existir, a meta tag apontaria para um 404 — e um cartão
   partido é PIOR do que o cartão antigo. Este passo do build resolve isso sem
   ninguém ter de se lembrar de nada: pergunta ao inventário qual é o criativo
   no ar, usa a morada fixa SE ela responder, e cai no ficheiro daquela
   publicação quando ainda não responder.

   O resultado converge sozinho: no dia em que a morada fixa passar a existir, o
   build passa a usá-la e o painel volta a mandar sem republicar.

   Não falha o build. Sem rede, ou com o inventário vazio, deixa o HTML como
   está — o site publica-se à mesma, com a arte que já lá estava.
   ============================================================================ */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SB   = 'https://alxwgqvjmetjbbqtjkhx.supabase.co';
const KEY  = 'sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';
const CHAVE = 'rf98.resenha.invite';
const FIXA  = `${SB}/storage/v1/object/public/publicidade/${CHAVE}/atual.png`;
const DIST  = resolve(process.cwd(), 'dist');
const PAGINAS = ['index.html', 'convite.html'];

const responde = async url => {
  try{ const r = await fetch(url, { method:'HEAD' }); return r.ok; }catch(e){ return false; }
};

async function urlDoCartao(){
  if(await responde(FIXA)) return { url: FIXA, de: 'morada fixa (o painel manda)' };
  try{
    const r = await fetch(`${SB}/rest/v1/ad_creatives?select=ficheiro_url,no_ar_de,no_ar_ate`
      + `&chave_espaco=eq.${CHAVE}&ativo=eq.true&order=criado_em.desc&limit=1`,
      { headers:{ apikey:KEY, Authorization:'Bearer '+KEY, 'Accept-Profile':'elifoot_v3' } });
    if(!r.ok) return null;
    const [c] = await r.json();
    if(c && c.ficheiro_url && await responde(c.ficheiro_url))
      return { url: c.ficheiro_url, de: 'criativo desta publicação (a morada fixa ainda não existe)' };
  }catch(e){}
  return null;
}

const alvo = await urlDoCartao();
if(!alvo){
  console.log('CARTAO  — inventário indisponível; o HTML fica como está.');
} else if(alvo.url === FIXA){
  console.log('CARTAO  ✓ morada fixa no ar — nada a reescrever.');
} else {
  let tocados = 0;
  for(const f of PAGINAS){
    const p = resolve(DIST, f);
    if(!existsSync(p)) continue;
    const antes = readFileSync(p, 'utf8');
    const depois = antes.split(FIXA).join(alvo.url);
    if(depois !== antes){ writeFileSync(p, depois); tocados++; }
  }
  console.log(`CARTAO  ⚠ ${alvo.de}`);
  console.log(`CARTAO    ${tocados} página(s) reescritas para ${alvo.url.split('/').pop()}`);
}
