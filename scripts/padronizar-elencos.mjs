/* ============================================================================
   PADRONIZAR O TAMANHO DOS ELENCOS BRASILEIROS
   ----------------------------------------------------------------------------
   Alvo: Série A 30, B 25, C 20, D 20.

   POR QUE ISTO NÃO MEXE NO JOGO. O motor calcula OS/MS/DS só a partir dos 11
   que entram em campo (computeRatings -> best11, match-engine.js). Nada em
   simMatchPure lê o tamanho do elenco. Como todos os alvos são >= 20, cortar
   os mais fracos nunca alcança o XI — e o script CONFERE isso clube a clube
   antes de gravar: se um XI mudar, ele aborta sem escrever nada.

   O QUE MUDA, E FOI ACEITO. Depois da primeira virada de temporada o
   `overall` passa a ser a média do elenco inteiro (recomputeClubOverall,
   core.js). Cortar os fracos sobe essa média: +1,75 na Série A (pior clube
   +3,76), +0,85 na B, ~0 na C e na D. Isso puxa mando de campo e receita-base
   para cima — mas sobe para todos juntos, então o equilíbrio relativo entre
   clubes quase não se move.

   FONTE CERTA: os bundles. Para o Brasil o jogo lê window.GAME_DATA (Série A)
   e window.BRASIL_LOWER (B/C/D) — `elifoot_v3.division_clubs` NÃO é consultada
   (ver core.js: `if(division==='A') return DATA.clubsSerieA` e o comentário
   "PRIORIDADE sobre Supabase" nas séries de baixo).

   Uso:  node scripts/padronizar-elencos.mjs [--aplicar]
   Sem --aplicar ele só relata (ensaio). Com, grava os dois arquivos.
   ========================================================================= */
import fs from 'node:fs';

const ALVO = { A: 30, B: 25, C: 20, D: 20 };

/* piso por setor: abaixo disto uma formação fica sem opção. GK 2 é o mesmo
   SQUAD_FLOOR que o motor já usa para impedir venda (core.js:193). */
const PISO = { GK: 2, DEF: 5, MID: 5, ATT: 3 };
/* proporção-alvo do elenco, usada só para escolher ONDE entra quem falta */
const IDEAL = { GK: 0.11, DEF: 0.32, MID: 0.32, ATT: 0.25 };

/* posição detalhada (campo `p`) coerente com o setor — o motor não lê `p`,
   mas a UI mostra, e um "DEF" com p:"CA" ficaria absurdo na tela */
const POS_DO_SETOR = { GK: 'GOL', DEF: 'ZAG', MID: 'MC', ATT: 'CA' };

const NOMES = ['João','Pedro','Lucas','Gabriel','Matheus','Rafael','Bruno','Diego','Felipe','Thiago',
  'André','Carlos','Daniel','Eduardo','Fábio','Gustavo','Henrique','Igor','Jorge','Kaique',
  'Leandro','Marcelo','Nathan','Otávio','Paulo','Renato','Sérgio','Tiago','Vitor','Wesley'];
const SOBRENOMES = ['Silva','Santos','Oliveira','Souza','Costa','Pereira','Almeida','Ferreira','Rodrigues','Gomes',
  'Martins','Araújo','Melo','Barbosa','Ribeiro','Carvalho','Lima','Nascimento','Rocha','Dias'];

/* RNG determinístico por clube: rodar duas vezes dá exatamente o mesmo elenco */
function rng(semente){
  let h = 2166136261;
  for(const ch of String(semente)){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

const setoresDe = sq => sq.reduce((a,p) => (a[p.s] = (a[p.s]||0)+1, a), {GK:0,DEF:0,MID:0,ATT:0});
const onzeMelhores = sq => sq.slice().sort((a,b)=>b.f-a.f).slice(0,11).map(p=>p.n).sort();

/* ---------- CORTAR: os mais fracos, sem furar o piso nem tocar o XI ---------- */
function cortar(sq, alvo){
  const protegidos = new Set(onzeMelhores(sq));
  const fora = sq.filter(p => !protegidos.has(p.n)).sort((a,b) => a.f - b.f);   // mais fraco primeiro
  const conta = setoresDe(sq);
  const remover = new Set();
  for(const p of fora){
    if(sq.length - remover.size <= alvo) break;
    if(conta[p.s] - 1 < PISO[p.s]) continue;      // o piso do setor manda mais que a ordem de força
    remover.add(p); conta[p.s]--;
  }
  return sq.filter(p => !remover.has(p));
}

/* ---------- ENCHER: abaixo do 11º melhor, para nunca invadir o XI ---------- */
function encher(sq, alvo, clube, div){
  const r = rng((clube.id||clube.short)+'|pad|'+alvo);
  const ordenado = sq.map(p=>p.f).sort((a,b)=>b-a);
  const decimoPrimeiro = ordenado[10] != null ? ordenado[10] : ordenado[ordenado.length-1];
  const media = ordenado.reduce((s,f)=>s+f,0) / ordenado.length;
  /* teto: nunca alcança o 11º melhor. Piso: não inventa jogador pior que o
     pior do elenco, senão a média desaba mais do que o necessário. */
  const teto = Math.max(1, decimoPrimeiro - 1);
  const base = Math.max(ordenado[ordenado.length-1], Math.min(Math.round(media), teto));
  const modeloA = div === 'A';
  let i = 0;
  while(sq.length < alvo){
    const conta = setoresDe(sq);
    /* entra no setor mais distante da proporção ideal */
    const setor = Object.keys(IDEAL).sort((a,b) =>
      (conta[a]/alvo - IDEAL[a]) - (conta[b]/alvo - IDEAL[b]))[0];
    const f = Math.max(1, Math.min(teto, base - Math.round(r()*2)));
    /* nome inédito no clube: tentar UMA vez deixava colisão passar (aconteceu
       em 2 clubes na primeira rodada). Insiste até achar, com saída de segurança. */
    let nome = '', tent = 0;
    do { nome = NOMES[Math.floor(r()*NOMES.length)] + ' ' + SOBRENOMES[Math.floor(r()*SOBRENOMES.length)];
         if(tent > 8) nome += ' ' + SOBRENOMES[Math.floor(r()*SOBRENOMES.length)];
    } while(sq.some(x => x.n === nome) && ++tent < 40);
    const p = {
      n: nome,
      p: POS_DO_SETOR[setor], s: setor, f,
      age: 19 + Math.floor(r()*6),
      mv: Math.round(f*f*4000),
      ft: r() < 0.8 ? 'R' : 'L',
      num: '', nat: 'Brasil', moral: 70, energy: 100
    };
    /* a Série A e as séries de baixo têm formas DIFERENTES de jogador: só as de
       baixo carregam rawF/_rb/_div/lg (marca do remapeamento por divisão). */
    if(modeloA) p.ag = '—';
    else Object.assign(p, { rawF: f, _rb: 1, _div: div, lg: 'BRA-'+div });
    sq.push(p); i++;
    if(i > 60) break;   // trava de segurança: nunca deve acontecer
  }
  return sq;
}

/* ---------- CONSERTAR SETOR FURADO ----------
   Sete clubes da Série D já vinham com UM goleiro só, e um com dois atacantes.
   Isso é anterior a esta padronização, mas seria irresponsável normalizar o
   tamanho e deixar o buraco: com um goleiro só, uma lesão deixa o clube sem
   reserva na posição, e o motor exige exatamente 1 GK no XI.
   Troca o mais fraco do setor mais cheio por um jogador do setor em falta —
   o tamanho não muda e nenhum dos dois estava no XI. */
function consertarSetores(sq, clube, div){
  const r = rng((clube.id||clube.short)+'|setor');
  const protegidos = new Set(onzeMelhores(sq));
  let trocas = 0;
  for(let volta = 0; volta < 8; volta++){
    const conta = setoresDe(sq);
    const falta = Object.keys(PISO).find(s => conta[s] < PISO[s]);
    if(!falta) break;
    /* doador: setor com maior folga sobre o próprio piso */
    const doador = Object.keys(PISO)
      .filter(s => s !== falta && conta[s] - 1 >= PISO[s])
      .sort((a,b) => (conta[b]-PISO[b]) - (conta[a]-PISO[a]))[0];
    if(!doador) break;
    const alvoTroca = sq.filter(p => p.s === doador && !protegidos.has(p.n))
                        .sort((a,b) => a.f - b.f)[0];
    if(!alvoTroca) break;
    const ordenado = sq.map(p=>p.f).sort((a,b)=>b-a);
    const teto = Math.max(1, (ordenado[10] != null ? ordenado[10] : ordenado[ordenado.length-1]) - 1);
    alvoTroca.s = falta;
    alvoTroca.p = POS_DO_SETOR[falta];
    alvoTroca.f = Math.min(alvoTroca.f, teto);
    if(alvoTroca.rawF != null) alvoTroca.rawF = alvoTroca.f;
    alvoTroca.mv = Math.round(alvoTroca.f * alvoTroca.f * 4000);
    trocas++;
  }
  return trocas;
}

/* ---------- execução ---------- */
const aplicar = process.argv.includes('--aplicar');
globalThis.window = {};
const arqA = 'public/src/data/game-data.js';
const arqL = 'public/src/data/leagues-brasil-lower.js';
eval(fs.readFileSync(arqA,'utf8'));
eval(fs.readFileSync(arqL,'utf8'));

const grupos = { A: window.GAME_DATA.clubs };
for(const d of ['B','C','D']) grupos[d] = window.BRASIL_LOWER[d];

let abortar = null;
const relato = [];
for(const div of ['A','B','C','D']){
  const alvo = ALVO[div];
  let cortados = 0, criados = 0, consertados = 0, driftSoma = 0;
  for(const c of grupos[div]){
    const antesXI = onzeMelhores(c.squad);
    const antesMedia = c.squad.reduce((s,p)=>s+p.f,0) / c.squad.length;

    let sq = c.squad;
    if(sq.length > alvo){ const n = sq.length; sq = cortar(sq, alvo); cortados += n - sq.length; }
    else if(sq.length < alvo){ const n = sq.length; sq = encher(sq, alvo, c, div); criados += sq.length - n; }
    c.squad = sq;
    consertados += consertarSetores(c.squad, c, div);

    /* PORTÃO: se o XI mudou, o corte alcançou um titular — não grava nada. */
    const depoisXI = onzeMelhores(c.squad);
    if(antesXI.join('|') !== depoisXI.join('|'))
      abortar = `${div} ${c.short}: o XI mudou (${antesXI.filter(n=>!depoisXI.includes(n)).join(', ')} saiu)`;
    if(c.squad.length !== alvo && !(sq.length > alvo))
      abortar = `${div} ${c.short}: ficou com ${c.squad.length}, alvo ${alvo}`;

    driftSoma += (c.squad.reduce((s,p)=>s+p.f,0)/c.squad.length) - antesMedia;
  }
  const t = grupos[div].map(c=>c.squad.length);
  relato.push({ div, alvo, clubes: grupos[div].length, cortados, criados, consertados,
    tamanhos: `${Math.min(...t)}–${Math.max(...t)}`,
    drift: (driftSoma/grupos[div].length).toFixed(2) });
}

console.log('div  alvo  clubes  cortados  criados  setor_ok  tamanho_final  deriva_overall');
for(const r of relato)
  console.log(`${r.div}     ${String(r.alvo).padStart(2)}     ${r.clubes}      ${String(r.cortados).padStart(4)}     ${String(r.criados).padStart(4)}      ${String(r.consertados).padStart(4)}     ${r.tamanhos.padEnd(9)}      ${r.drift>0?'+':''}${r.drift}`);

if(abortar){ console.error('\nABORTADO — ' + abortar + '\nNada foi gravado.'); process.exit(1); }
console.log('\nXI conferido clube a clube: nenhum titular saiu.');

if(!aplicar){ console.log('Ensaio. Rode com --aplicar para gravar.'); process.exit(0); }
fs.writeFileSync(arqA, 'window.GAME_DATA = ' + JSON.stringify(window.GAME_DATA) + ';\n');
fs.writeFileSync(arqL, 'window.BRASIL_LOWER = ' + JSON.stringify(window.BRASIL_LOWER) + ';\n');
console.log('Gravado em ' + arqA + ' e ' + arqL + '.');
