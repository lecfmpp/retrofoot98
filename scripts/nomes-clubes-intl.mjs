/* ============================================================================
   NOMES FICTÍCIOS DOS CLUBES ESTRANGEIROS — gerador do patch
   ----------------------------------------------------------------------------
   Os 80 clubes brasileiros já jogam com nome fictício (Palmeiras é "Academia
   Palestra", Flamengo é "Urubu da Gávea") — o pacote oficial guarda `name`,
   `short` e `crest` de cada um. Os 352 de fora nunca foram tocados: chegam ao
   jogador como Arsenal, Real Madrid, Bayern Munich, Boca Juniors.

   AQUI O PACOTE É O CAMINHO CERTO, ao contrário do que aconteceu com os NOMES
   DE JOGADOR. Lá eram 9.832 linhas, 470 KB, e o pacote é descarregado por todo
   cliente no arranque: teria multiplicado por 5,4 o custo de cada primeira
   visita, e por isso o nome passou a ser calculado. Aqui são 352 nomes, ~14 KB
   — ruído ao lado dos 106 KB que o pacote já pesa — e há uma razão positiva
   para eles viajarem: nome de clube é identidade, é pouco, é visível, e o painel
   tem editor para o corrigir um a um. Nome de jogador não tem nada disso.

   OS LUGARES SÃO INVENTADOS, de propósito. Usar cidades reais aproximaria de
   novo o clube fictício do verdadeiro ("Manchester" puxa Manchester United);
   inventar o topónimo corta essa ligação e continua a soar do país.

   O IDIOMA VEM DO PAÍS: United/City/Rovers em Inglaterra, SV/FC/1904 na
   Alemanha, AC/Calcio/US em Itália, Real/Deportivo/CF em Espanha, Club
   Atlético/Deportivo na América do Sul. Sem isto os 352 sairiam todos com cara
   de mesmo sítio.

   COMPRIMENTO, MEDIDO E NÃO ESCOLHIDO: nos 80 fictícios brasileiros o `short`
   vai até 22 caracteres; nos 352 estrangeiros de fábrica, até 16. Fica o teto
   mais apertado dos dois em `short` (18) e 28 no `name`, que é onde os slots já
   provaram aguentar.

   NINGUÉM REAL, EM DOIS NÍVEIS. O gerador rejeita o nome inteiro que calhe de ser
   igual ao de um clube do jogo. Mas isso não bastava: seis TOPÓNIMOS que eu tinha
   inventado eram, afinal, ecos de clubes reais — Estoril (GD Estoril Praia),
   Santa Fe (Independiente Santa Fe), Santa Cruz, Fortaleza, Aurora (Club Aurora)
   e Huanca (Sport Huancayo). Um nome novo montado sobre eles continuava a apontar
   para o clube verdadeiro. Foram trocados; a conferência que os apanhou está em
   scripts/nomes-clubes-intl.mjs --auditar.

   Uso:  node scripts/nomes-clubes-intl.mjs            (relata)
         node scripts/nomes-clubes-intl.mjs --sql      (escreve o SQL)
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const PACOTE = '61717da5-0f7a-48a1-ae6e-acacacad8cf5';
const MAX_SHORT = 18, MAX_NAME = 28;

function bundle(rel){ const c={}; new Function('window','globalThis', fs.readFileSync(path.join(RAIZ,rel),'utf8'))(c,c); return c; }
const g = {};
Object.assign(g, bundle('public/src/data/game-data.js'));
Object.assign(g, bundle('public/src/data/leagues-brasil-lower.js'));
Object.assign(g, bundle('public/src/data/leagues-intl.js'));
Object.assign(g, bundle('public/src/data/leagues-conmebol.js'));

/* topónimos inventados por país */
const LUGARES = {
 Inglaterra: 'Northbridge Ashcombe Redmoor Kingsport Elderfield Westhaven Blackmoor Thornbury Greyvale Oakhurst Fairport Highgrove Stonebrook Winterby Marshford Eastgate Clifton Ravenshall Brookden Wychwood Hartley Millbrook Kestrel Longmere Southwell Whitcombe Barrowgate Cravenhill Dunmoor Fenwick',
 Alemanha:   'Rheinstadt Falkenberg Grünwald Steinbach Adlerheim Nordhafen Weissenfeld Lindenau Hochberg Rosenthal Eichwald Sonnenau Kronsberg Blaustein Waldheim Ostmark Silberbach Tannberg Neuhafen Wolfsheim Bergstadt Kirschau Moorfeld Erlenbach Hafenstadt Sturmfeld Elbenau Rautal Königsau Weststadt',
 'Itália':   'Montebello Valdarno Castelrosso Portomare Rocchetta Verdecolle Sanmartino Belforte Torreblu Vallenova Costamare Pietralta Fonteverde Colledoro Rivamonte Altavilla Borgorosso Marefiore Solepiano Vialonga Cimabella Ponteverde Ortavia Serrafalco Lucarno Montedoro Casalbruno Terranova Ventarosa Salicorno',
 Espanha:    'Valdemar Ríoblanco Montecerro Puertoluz Villamar Peñalta Sierrablanca Campoverde Torreluna Altamira Riberamar Sanmiguel Vegabaja Costaflor Montelirio Puentenuevo Playamar Robledal Sanlorenzo Valdeoro Cerroalto Duraznal Marbrisa Olivares Ponteverde Riofrío Solariega Torremar Vallehondo Zafiral',
 Portugal:   'Ribamar Vilanova Serrafria Praiabela Castelinho Montalegre Fonteclara Douroverde Praiabela Alvorada Barcelinho Caminhoso Estrelas Foznova Guimalta Lagoaverde Marinhal Olivedo Pinhalvo Quintela Rochavelha Salgueiro Tormenta Ursulina Valverde Aguiarim Boavila Coimbrelo Douradal Corvelo',
 Argentina:    'Río Verde|Villa Alborada|Puerto Real|Cerro Azul|Nueva Palma|San Telmo|Alto Prado|Costa Brava|Monte Cielo|Valle Norte|Laguna Sur|Punta Rosa|Bella Vista|Campo Alegre|El Sauce|El Progreso|Fuerte Blanco|Gran Río|La Estancia|Los Álamos|Mar Chico|Nogal|Pampa Real|Quebracho|Riacho|Santa Elena|Tierra Roja|Vista Alegre|Zonda|Las Lomas',
 Uruguai:    'Punta Clara|Río Blanco|Cerro Verde|Villa Sur|Paso Real|Costa Dorada|Playa Nueva|Monte Rey|Laguna Azul|Bella Unión|Alto Este|Campo Verde|Estanque|Fortín|Gran Sol|Isla Verde|La Barra|Los Robles|Mar Bravo|Nogales|Palma Sur|Quinta Real|Riachuelo|Santa Rosa|Tres Cruces|Valle Claro|Vista Mar|Zapicán|Ombú|Sauce Norte',
 'Colômbia':    'Valle Alto|Río Dorado|Sierra Nueva|Puerto Sol|Cerro Verde|Villa Real|Alto Cauca|Bella Flor|Campo Nuevo|El Llano|Esmeralda|Fuente Clara|Gran Sabana|Hacienda|Los Andes|Mar Caribe|Nogal Real|Palma Alta|Quinta Sur|Riofuerte|Fuente Sur|Tierra Grata|Valle Sur|Vista Nueva|Zafra|Aguadulce|Bosque Real|Costa Norte|Dorado Sur|El Portal',
 Chile:    'Valle Andino|Río Claro|Puerto Bravo|Cerro Nevado|Villa Austral|Alto Maipo|Bahía Sur|Campo Alto|Estrecho|Fuerte Real|Gran Cordón|Hualco|Lago Azul|Monte Frío|Nueva Alborada|Pampa Sur|Quilmén|Roca Blanca|Cruz Alta|Tierra Fría|Valle Nevado|Ventisca|Zona Sur|Antuco|Bosque Sur|Costa Fría|El Viento|Estepa|Fiordo|Puerto Frío',
 Peru:    'Alto Andes|Río Sagrado|Valle Inca|Puerto Sol|Cerro Blanco|Villa Andina|Bahía Norte|Campo Real|Baluarte|Gran Valle|Huayna|Lago Sur|Monte Sacro|Nueva Costa|Pampa Verde|Quilca|Riobamba|Santa Luz|Tierra Alta|Urubamba|Valle Norte|Vista Andina|Yaraví|Zafiro|Amaru|Bosque Alto|Costa Sur|Dorado Inca|El Ande|Alto Sol',
 Equador:    'Mitad Norte|Río Verde|Valle Andino|Puerto Nuevo|Cerro Azul|Villa Costa|Bahía Real|Campo Sol|Esmeralda|Fortín|Gran Costa|Huaca|Lago Verde|Monte Cruz|Nueva Luz|Palma Real|Quinta Sur|Ribera|Santa Ana|Tierra Verde|Valle Sol|Vista Mar|Yagual|Zamorano|Alborada|Bosque Andino|Costa Viva|Dorado Norte|El Faro|Mar Nuevo',
 Paraguai:    'Río Guaraní|Villa Nueva|Cerro Real|Puerto Palma|Alto Chaco|Bella Vista|Campo Verde|El Norte|Estancia|Fuerte Sur|Gran Chaco|Itaguá|Lago Azul|Monte Rey|Nueva Alborada|Palma Sur|Quinta Real|Ribera|Cruz Alta|Tierra Roja|Valle Guaraní|Vista Sur|Yacaré|Zarza|Aguará|Bosque Real|Costa Verde|Dorado Este|Tacuara|Río Blanco',
 Venezuela:    'Costa Azul|Río Llano|Valle Real|Puerto Verde|Cerro Norte|Villa Sol|Bahía Dorada|Campo Llanero|El Ávila|Esmeralda|Fuerte Mar|Gran Llano|Horizonte|Lago Real|Monte Claro|Nueva Costa|Palma Verde|Quinta Mar|Ribereña|Santa Marta|Tierra Llana|Valle Norte|Vista Bella|Yare|Zulia Norte|Alborada|Bosque Llano|Costa Firme|Dorado Mar|El Tuy',
 'Bolívia':    'Alto Andino|Río Grande|Valle Real|Puerto Sur|Cerro Rico|Villa Andina|Bahía Seca|Campo Alto|Illimani|Baluarte|Gran Meseta|Wayra|Lago Alto|Monte Sur|Nueva Paz|Pampa Real|Quinta Andina|Ribera|Santa Ana|Tierra Alta|Valle Verde|Vista Andina|Yungas|Zafra|Altiplano|Bosque Sur|Costa Seca|Dorado Alto|El Chaco|Cordillera',
};
const AFIXO = {
 Inglaterra: [p=>[p+' United',p+' Utd'], p=>[p+' City',p+' City'], p=>[p+' Rovers',p+' Rovers'],
              p=>[p+' Athletic',p+' Athletic'], p=>[p+' Town',p+' Town'], p=>[p+' Wanderers',p+' Wanderers']],
 Alemanha:   [p=>['SV '+p,'SV '+p], p=>['FC '+p,'FC '+p], p=>[p+' 04',p+' 04'],
              p=>['SC '+p,'SC '+p], p=>['VfB '+p,'VfB '+p], p=>[p+' 1906',p+' 1906']],
 'Itália':   [p=>['AC '+p,'AC '+p], p=>[p+' Calcio',p+' Calcio'], p=>['US '+p,'US '+p],
              p=>['SS '+p,'SS '+p], p=>[p+' FC',p+' FC'], p=>['AS '+p,'AS '+p]],
 Espanha:    [p=>['Real '+p,'Real '+p], p=>[p+' CF',p+' CF'], p=>['Atlético '+p,'Atl. '+p],
              p=>['Deportivo '+p,'Dep. '+p], p=>['CD '+p,'CD '+p], p=>['UD '+p,'UD '+p]],
 Portugal:   [p=>['SC '+p,'SC '+p], p=>[p+' FC',p+' FC'], p=>['Académica '+p,'Acad. '+p],
              p=>['CD '+p,'CD '+p], p=>[p+' SAD',p+' SAD'], p=>['GD '+p,'GD '+p]],
};
const AFIXO_SUL = [p=>['Club '+p,p], p=>['Atlético '+p,'Atl. '+p], p=>['Deportivo '+p,'Dep. '+p],
                   p=>[p+' FC',p+' FC'], p=>['CA '+p,'CA '+p], p=>['Sport '+p,'Sport '+p]];

const REAIS = new Set();
const addReais = l => (l||[]).forEach(c=>{ if(c.name) REAIS.add(c.name.toLowerCase()); if(c.short) REAIS.add(c.short.toLowerCase()); });
addReais(g.GAME_DATA && g.GAME_DATA.clubs);
for(const d of ['B','C','D']) addReais(g.BRASIL_LOWER && g.BRASIL_LOWER[d]);
for(const f of ['INTL_LEAGUES','CONMEBOL_LEAGUES']) for(const k in g[f]) addReais(g[f][k]);

function semente(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h||1; }
function rng(seed){ let x=seed; return ()=>{ x^=x<<13;x>>>=0; x^=x>>17; x^=x<<5;x>>>=0; return x/4294967296; }; }

const usados = new Set();
const linhas = [];
for(const f of ['INTL_LEAGUES','CONMEBOL_LEAGUES']){
  for(const pais of Object.keys(g[f]||{})){
    /* '|' separa topónimos de DUAS palavras ("Río Verde"); onde não há '|', o país usa
         topónimos de uma palavra só e o espaço serve. Tentei adivinhar o corte por regex e
         "Río Verde" virou "Río" e "Verde" — os clubes sul-americanos saíram todos "CA Campo". */
      const cru = LUGARES[pais]||'';
      const lugares = (cru.includes('|') ? cru.split('|') : cru.split(/\s+/)).map(s=>s.trim()).filter(Boolean);
    const afixos = AFIXO[pais] || AFIXO_SUL;
    for(const c of (g[f][pais]||[])){
      const R = rng(semente('clube|'+c.id));
      let escolhido = null;
      for(let t=0;t<4000 && !escolhido;t++){
        const lugar = lugares[Math.floor(R()*lugares.length)];
        const [nome, curto] = afixos[Math.floor(R()*afixos.length)](lugar);
        if(!nome || nome.length>MAX_NAME || curto.length>MAX_SHORT) continue;
        const k = nome.toLowerCase();
        if(usados.has(k) || REAIS.has(k) || REAIS.has(curto.toLowerCase())) continue;
        usados.add(k); escolhido = { nome, curto };
      }
      if(escolhido) linhas.push({ id:String(c.id), pais, de:c.short, name:escolhido.nome, short:escolhido.curto });
    }
  }
}

const asp = s => "'"+String(s).replace(/'/g,"''")+"'";
if(process.argv.includes('--sql')){
  const out = [`-- NOMES FICTÍCIOS DOS CLUBES ESTRANGEIROS`,
    `-- Gerado por scripts/nomes-clubes-intl.mjs — não editar à mão.`,
    `-- ${linhas.length} clubes · pacote ${PACOTE}`, `set search_path to elifoot_v3;`, `begin;`];
  for(const l of linhas)
    out.push(`insert into pack_edits (pack_id, club_id, patch) values (${asp(PACOTE)}, ${asp(l.id)}, ${asp(JSON.stringify({name:l.name, short:l.short}))}::jsonb)`
           + `\n  on conflict (pack_id, club_id) do update set patch = pack_edits.patch || excluded.patch;`);
  out.push('', 'commit;');
  fs.writeFileSync(path.join(RAIZ,'scripts/sql/nomes-clubes-intl-aplicar.sql'), out.join('\n')+'\n');
  const ids = linhas.map(l=>asp(l.id)).join(', ');
  fs.writeFileSync(path.join(RAIZ,'scripts/sql/nomes-clubes-intl-reverter.sql'),
    [`-- REVERTER os nomes fictícios dos clubes estrangeiros`, `set search_path to elifoot_v3;`, `begin;`,
     `delete from pack_edits where pack_id = ${asp(PACOTE)} and club_id in (${ids})`,
     `  and (patch - 'name' - 'short') = '{}'::jsonb;`,
     `update pack_edits set patch = patch - 'name' - 'short'`,
     ` where pack_id = ${asp(PACOTE)} and club_id in (${ids});`, '', 'commit;'].join('\n')+'\n');
}

const maxN = Math.max(...linhas.map(l=>l.name.length)), maxS = Math.max(...linhas.map(l=>l.short.length));
console.log(`${linhas.length} clubes · ${usados.size} nomes distintos · name máx ${maxN} (limite ${MAX_NAME}) · short máx ${maxS} (limite ${MAX_SHORT})`);
console.log(`coincidem com clube real: ${linhas.filter(l=>REAIS.has(l.name.toLowerCase())).length}`);
const porPais = {}; linhas.forEach(l=>(porPais[l.pais]=porPais[l.pais]||[]).push(l));
for(const p of Object.keys(porPais))
  console.log(`  ${p.padEnd(12)} ${String(porPais[p].length).padStart(3)}  ${porPais[p].slice(0,3).map(l=>l.de+' → '+l.short).join(' · ')}`);
