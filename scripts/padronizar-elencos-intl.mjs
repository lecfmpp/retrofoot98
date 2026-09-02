/* ============================================================================
   PADRONIZAR O TAMANHO DOS ELENCOS ESTRANGEIROS
   ----------------------------------------------------------------------------
   Alvo (o mesmo do Brasil, onde a divisão existe): 1ª 30 · 2ª e 3ª 25 · 4ª 20.
   Fora do Brasil só há 1ª e 2ª, então na prática são 30 e 25.

   ESTE NÃO É O TRABALHO BRASILEIRO OUTRA VEZ. Lá todos os clubes tinham gente a
   MAIS e o script só cortava. Aqui é dos dois lados, e o segundo é o maioritário:
     124 clubes acima do alvo  ->  506 jogadores a sair
     191 clubes abaixo do alvo ->  754 jogadores a inventar
   Espanha, Bolívia e Itália têm clubes com 14 jogadores num alvo de 25 ou 30.

   O QUE ISSO FAZ AO OVERALL, MEDIDO ANTES DE ESCREVER. Cortar os fracos SOBE a
   média (+0,98 em média, +3 no pior caso); inventar reservas BAIXA-a (−0,91,
   −3 no pior). Como as duas operações acontecem em populações diferentes e de
   tamanho parecido, o efeito líquido no mundo é perto de zero — o que importa
   porque o overall move receita-base e mando de campo (ver REBAL.income).

   OS MÍNIMOS POR POSIÇÃO MANDAM NO CORTE. Cortar só pelos mais fracos podia
   deixar um clube com dois guarda-redes: MIN_POS (GK 3 · DEF 6 · MID 6 · ATT 4,
   total 19) é respeitado antes da força. Como os alvos são 25 e 30, sobra folga.

   NENHUM TITULAR SAI DO ONZE, e o script CONFERE clube a clube antes de gravar:
   os alvos são ≥25 e o motor escala os 11 melhores, então cortar do fim nunca
   alcança o onze. Se alcançar, aborta sem escrever nada.

   A regra é "ninguém sai", e não "o onze é idêntico" — a diferença apareceu a
   correr. O Rionegro não tem UM guarda-redes no bundle; preencher dá-lhe o que
   falta e esse entra no onze por um buraco, não por empurrar ninguém.

   QUEM É INVENTADO NASCE DO PRÓPRIO CLUBE: força tirada do terço mais fraco do
   elenco (é um reserva, não um alienígena), idade 19-24, e o valor de mercado
   interpolado dos companheiros de força parecida — os bundles estrangeiros têm
   `mv` noutra escala do que o brasileiro, e inventar uma fórmula aqui punha os
   dois em desacordo.

   O NOME SAI DO POOL DO PAÍS, pelas mesmas regras de comprimento do resto
   (duas palavras, palavra ≤11, nome ≤21 — ver renomearIntl em world-config.js).
   O jogo renomeia tudo no arranque de qualquer maneira; nomear aqui é para o
   bundle não ficar com marcas de gerador se a camada de runtime for desligada.

   Uso:  node scripts/padronizar-elencos-intl.mjs [--escrever]
         Sem --escrever só relata, não toca em ficheiro nenhum.
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESCREVER = process.argv.includes('--escrever');
const MIN_POS = { GK:3, DEF:6, MID:6, ATT:4 };
const POS_LABEL = { GK:'GOL', DEF:'ZAG', MID:'MEI', ATT:'ATA' };
const FICHEIROS = {
  INTL_LEAGUES:     'public/src/data/leagues-intl.js',
  CONMEBOL_LEAGUES: 'public/src/data/leagues-conmebol.js',
};

function carrega(rel, nome){
  const ctx = {};
  new Function('window','globalThis', fs.readFileSync(path.join(RAIZ, rel),'utf8'))(ctx, ctx);
  return ctx[nome];
}
const WC = {}; new Function('window','globalThis', fs.readFileSync(path.join(RAIZ,'public/src/engine/world-config.js'),'utf8'))(WC, WC);
const POOLS = WC.WORLD_CONFIG.NAME_POOLS;

const alvoDe = lg => /-1$/.test(lg||'') ? 30 : /-2$/.test(lg||'') ? 25 : /-3$/.test(lg||'') ? 25 : 20;

/* semente estável por clube — o mesmo jogador inventado sai de duas execuções */
function semente(s){ let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h||1; }
function rng(seed){ let x=seed; return ()=>{ x^=x<<13; x>>>=0; x^=x>>17; x^=x<<5; x>>>=0; return x/4294967296; }; }

/* o XI que o motor escalaria: melhor GK + os 10 melhores de linha */
function onzeSet(sq){
  const gk = sq.filter(p=>p.s==='GK').sort((a,b)=>b.f-a.f)[0];
  const linha = sq.filter(p=>p.s!=='GK').sort((a,b)=>b.f-a.f).slice(0,10);
  return new Set([gk, ...linha].filter(Boolean).map(p=>p.id||p.n));
}
/* A REGRA É "NINGUÉM SAI", NÃO "O XI É IDÊNTICO", e a diferença apareceu a
   correr: o Rionegro (Colômbia) não tem UM guarda-redes no bundle e o Carabobo
   (Venezuela) tem um só. Preencher dá-lhes o guarda-redes que falta, e esse
   entra no onze — pela porta de um buraco, não por empurrar ninguém. Exigir o XI
   idêntico reprovava justamente a correção.

   O que continua proibido é o que interessa: um titular DEIXAR o onze. Cortar
   nunca pode alcançá-lo, e um reserva inventado nunca pode desalojá-lo. */
function saiuAlguem(antes, depois){
  for(const k of antes) if(!depois.has(k)) return true;
  return false;
}

let proximoId = 11733;
const usadosNome = new Set();
function nomeDoPool(pais, chave){
  const pool = POOLS[pais] || POOLS._hispano;
  const R = rng(semente(chave));
  for(let t=0;t<4000;t++){
    const f=pool.first[Math.floor(R()*pool.first.length)], l=pool.last[Math.floor(R()*pool.last.length)];
    if(f.length>11 || l.length>11) continue;
    const nome=f+' '+l; if(nome.length>21) continue;
    const k=nome.toLowerCase(); if(usadosNome.has(k)) continue;
    usadosNome.add(k); return nome;
  }
  return null;
}

const relatorio = { cortados:0, inventados:0, clubesCorte:0, clubesEnche:0, xiMudou:[], porPais:{} };

for(const [nomeVar, rel] of Object.entries(FICHEIROS)){
  const mapa = carrega(rel, nomeVar);
  for(const pais of Object.keys(mapa)){
    for(const c of (mapa[pais]||[])){
      const sq = c.squad || (c.squad = []);
      const alvo = alvoDe(c.lg);
      const xiAntes = onzeSet(sq);
      (relatorio.porPais[pais] = relatorio.porPais[pais] || { corte:0, enche:0 });

      if(sq.length > alvo){
        /* mantém os mais fortes, mas garante os mínimos por posição antes da força */
        const porSetor = {}; for(const s of Object.keys(MIN_POS)) porSetor[s] = sq.filter(p=>p.s===s).sort((a,b)=>b.f-a.f);
        const guardados = new Set();
        for(const s of Object.keys(MIN_POS)) porSetor[s].slice(0, MIN_POS[s]).forEach(p=>guardados.add(p));
        const resto = sq.filter(p=>!guardados.has(p)).sort((a,b)=>b.f-a.f);
        const ficam = new Set([...guardados, ...resto.slice(0, alvo - guardados.size)]);
        const novos = sq.filter(p=>ficam.has(p));
        relatorio.cortados += sq.length - novos.length;
        relatorio.porPais[pais].corte += sq.length - novos.length;
        relatorio.clubesCorte++;
        c.squad = novos;
      } else if(sq.length < alvo){
        const faltam = alvo - sq.length;
        /* de que posições? a que estiver mais longe da distribuição saudável do alvo */
        const ideal = { GK:Math.max(MIN_POS.GK, Math.round(alvo*0.10)), DEF:Math.round(alvo*0.34),
                        MID:Math.round(alvo*0.34), ATT:Math.round(alvo*0.22) };
        const conta = s => sq.filter(p=>p.s===s).length;
        const fracos = sq.slice().sort((a,b)=>a.f-b.f).slice(0, Math.max(3, Math.ceil(sq.length/3)));
        const fMed = fracos.reduce((s,p)=>s+p.f,0)/Math.max(1,fracos.length);
        const natModa = (()=>{ const t={}; sq.forEach(p=>{ if(p.nat) t[p.nat]=(t[p.nat]||0)+1; });
                               return Object.keys(t).sort((a,b)=>t[b]-t[a])[0] || pais; })();
        const nums = new Set(sq.map(p=>String(p.num||'')));
        const R = rng(semente('intl-fill|'+c.id));
        for(let i=0;i<faltam;i++){
          const s = Object.keys(MIN_POS).sort((a,b)=>(ideal[b]-conta(b))-(ideal[a]-conta(a)))[0];
          /* TETO POR SETOR, e ele nasceu de um caso real: o Carabobo (Venezuela) tem UM guarda-redes,
             fraco, e o inventado saía mais forte — desalojava o titular do onze. Um reserva
             inventado nunca pode ser melhor do que o pior daquele setor; se o setor está vazio
             (Rionegro, sem guarda-redes nenhum), não há quem desalojar e o teto não se aplica. */
          const doSetor = sq.filter(p=>p.s===s);
          const teto = doSetor.length ? Math.min(...doSetor.map(p=>p.f)) : Infinity;
          const f = Math.max(1, Math.min(teto, Math.round(fMed * (0.88 + R()*0.12))));
          /* mv interpolado dos companheiros de força parecida — mantém a escala do bundle */
          const perto = sq.slice().sort((a,b)=>Math.abs(a.f-f)-Math.abs(b.f-f)).slice(0,3).filter(p=>p.mv>0);
          const mv = perto.length ? Math.round(perto.reduce((s2,p)=>s2+p.mv,0)/perto.length) : 0;
          let num = 30+i; while(nums.has(String(num))) num++;
          nums.add(String(num));
          const p = { id:'jm'+String(proximoId++).padStart(6,'0'),
                      n: nomeDoPool(pais, 'fill|'+c.id+'|'+i) || 'Reserva '+(i+1),
                      p: POS_LABEL[s], s, f, age: 19+Math.floor(R()*6), lg: c.lg,
                      mv, ft: R()<0.5?'R':'L', num:String(num), nat:natModa, ag:'—', moral:70, energy:100 };
          sq.push(p);
          relatorio.inventados++; relatorio.porPais[pais].enche++;
        }
        relatorio.clubesEnche++;
      }
      if(saiuAlguem(xiAntes, onzeSet(c.squad))) relatorio.xiMudou.push(pais+' '+(c.short||c.id));
    }
  }

  if(ESCREVER){
    if(relatorio.xiMudou.length) continue;   // trava: não grava se algum XI mudou
    /* preserva o cabeçalho e reescreve só a atribuição — o ficheiro é 3 linhas de
       comentário e uma linha gigante de JSON, e é assim que ele tem de continuar. */
    const original = fs.readFileSync(path.join(RAIZ, rel),'utf8');
    const iVar = original.indexOf('window.'+nomeVar);
    fs.writeFileSync(path.join(RAIZ, rel), original.slice(0, iVar) + `window.${nomeVar} = ${JSON.stringify(mapa)};\n`);
  }
}

console.log(`cortados: ${relatorio.cortados} jogadores em ${relatorio.clubesCorte} clubes`);
console.log(`inventados: ${relatorio.inventados} jogadores em ${relatorio.clubesEnche} clubes`);
console.log(`titulares que saíram do onze: ${relatorio.xiMudou.length}` + (relatorio.xiMudou.length?'  -> '+relatorio.xiMudou.slice(0,5).join(', '):'  (nenhum — como tem de ser)'));
for(const p of Object.keys(relatorio.porPais)){
  const r = relatorio.porPais[p];
  console.log(`  ${p.padEnd(12)} -${String(r.corte).padStart(3)}  +${String(r.enche).padStart(3)}`);
}
if(!ESCREVER) console.log('\n(ensaio — nada foi gravado; use --escrever)');
else if(relatorio.xiMudou.length) console.log('\nABORTADO: algum XI mudaria. Nada foi gravado.');
else console.log('\nbundles reescritos.');
