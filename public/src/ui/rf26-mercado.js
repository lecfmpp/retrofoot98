/* =====================================================================
   RetroFoot98 — MERCADO, as seis abas completas
   Portado de telas/Mercado - Abas.html (pacote "Abas Completas").

   Cada aba é uma TELA INTEIRA, com os blocos que o pacote define:
     Comprar         · Jogadores no mercado + O que o caixa permite
     Leilão          · Lotes abertos + Arrematados recentemente
     Propostas       · Um card por proposta + Impacto se aceitar
     Contrapropostas · Negociações em andamento + Como negociar
     Vender          · Seu elenco à venda + Quem você não deveria vender
     Transferências  · Janela + Movimentações da divisão

   ONDE O JOGO NÃO TEM O DADO, A TELA DIZ ISSO. O relógio de leilão da
   referência ("02:14") não existe aqui: o leilão do RetroFoot98 fecha por
   RODADA (roundsLeft), então a coluna mostra rodadas. Inventar um relógio
   seria prometer um leilão em tempo real que o motor não roda.
   ===================================================================== */

/* DINHEIRO POR EXTENSO — "R$ 620 mil", "R$ 1,25 mi". É a escrita das
   telas, e nenhuma outra: fmt() dá "R$ 762k" e mvShort() dá "50M", duas
   abreviações que a referência não usa em lugar nenhum do Mercado. */
/* O SÍMBOLO SEM A CONVERSÃO É UMA MENTIRA. Esta função punha "€" (ou o que
   fosse) à frente de um número que continuava em reais internos, enquanto o
   `mvShort` e o `fmt` ao lado dela, na mesma linha da mesma tabela, convertiam.
   Em Reais (taxa 1) ninguém via; em qualquer outra moeda os dois números da
   mesma linha discordavam. O motor guarda tudo em R$ e converte só na
   apresentação — aqui é a apresentação. */
/* o valor de mercado que a interface mostra é sempre o VIVO (idade + fase),
   nunca o `p.mv` de base — é o mesmo por que o motor precifica (ver liveMV) */
function rfVM(p){ return (typeof computeVM==='function'&&p&&p.n)?computeVM(p):((p&&p.mv)||0); }
function rfDin(v){
  v=Math.round((typeof curConv==='function')?curConv(v||0):(v||0));
  const s=(typeof curSym==='function')?curSym():'R$';
  const neg=v<0?'-':''; v=Math.abs(v);
  const num=(n,c)=>String(n.toFixed(c)).replace('.',',').replace(/,0+$/,'');
  if(v>=1e9) return neg+s+' '+num(v/1e9,2)+' bi';
  if(v>=1e6) return neg+s+' '+num(v/1e6,2)+' mi';
  if(v>=1e3) return neg+s+' '+num(v/1e3,0)+' mil';
  return neg+s+' '+v;
}

/* ---- peças que se repetem nas seis abas ---- */
/* AÇÕES DO CABEÇALHO — os dois botões do canto superior direito */
function rfMktAcoesHTML(){
  return `<div class="rf-mk-acoes">
    <button type="button" class="rf-btn rf-btn-secondary" onclick="rfMktExportar()">${rfIcone('exportar',16)} Exportar lista</button>
    <button type="button" class="rf-btn rf-btn-cta" onclick="rfMktIrBuscar()">${rfIcone('buscar',16)} Buscar jogador</button>
  </div>`;
}
function rfMktExportar(){
  const linhas=rfMktMercado().map(({p,clubId,ask})=>[p.n,rfPosInicial(p.s),p.age||'',p.f,
    (anyClubOf(clubId)||{short:''}).short, ask, rfMkSalario(p)].join(';'));
  const txt='jogador;pos;idade;forca;clube;valor;salario\n'+linhas.join('\n');
  try{
    const a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(txt);
    a.download='mercado-'+(S.season||'')+'.csv'; a.click();
    toastC('Lista exportada.');
  }catch(e){ toastC('Não deu pra exportar aqui.'); }
}
/* TABELA — a grelha da referência: cabeçalho em mono espaçado, linhas
   altas, e a última coluna reservada pro botão de ação. */
/* Todas as seis abas do Mercado passam por AQUI, então a rolagem dentro do
   card e o limite de linhas entram numa alteração só. `linhas` aceita array
   (o corte precisa acontecer por linha) ou a string já junta, para as
   chamadas antigas continuarem funcionando — sem `chave` não há limite. */
function rfMkTabela(cols, cabecalho, linhas, vazio, chave){
  const arr = Array.isArray(linhas) ? linhas
    : (typeof linhas==='string' && linhas ? [linhas] : []);
  const corpo = chave
    ? rfLista(chave, arr, vazio)
    : `<div class="rf-mkt-body">${(Array.isArray(linhas)?linhas.join(''):linhas) || `<div class="rf-empty">${escC(vazio||'Nada aqui agora.')}</div>`}</div>`;
  /* `data-mkt` dá nome à tabela: no telefone cada aba precisa da sua própria
     prioridade de colunas, e sem isso uma regra escrita para o Comprar (7
     colunas) desalinharia o Vender (9) e o Leilão. */
  return `<div class="rf-mkt" data-mkt="${escC(chave||'')}" style="--rf-mkt-cols:${cols}">
    <div class="rf-mkt-head">${cabecalho}</div>
    ${corpo}
  </div>`;
}
/* mesma conta do calendário (rfCpDataDaJornada): o motor não guarda data por
   rodada, deriva do dia — sete por rodada */
/* FECHA: a DATA, nao a contagem. A coluna dizia "3 rodadas", que obriga a
   contar de cabeca para saber quando e — e ocupava o dobro da largura. Agora
   sai a data do dia em que o lote fecha, na mesma regua curta do calendario
   (rfMkDataDaJornada: sete dias por rodada). Sem data calculavel, cai na
   contagem de antes em vez de mostrar travessao. */
function rfMkFechaEm(roundsLeft){
  if(roundsLeft==null) return '—';
  const d=rfMkDataDaJornada((S.round||0)+roundsLeft);
  if(d) return d;
  return roundsLeft+(roundsLeft===1?' semana':' semanas');
}
/* mesma fonte unica do calendario (ver dataCurtaDaJornada). Tinha aqui a sua
   propria conta `1+i*7+6`, que e a da LIGA — e por isso o mercado e o
   calendario podiam discordar se uma delas mudasse. */
function rfMkDataDaJornada(i){
  return (typeof dataCurtaDaJornada==='function') ? dataCurtaDaJornada(i, 'liga') : '';
}
function rfMkClube(id, cObj, pais){
  // clube do exterior ainda não materializado: anyClubOf não o conhece — o objeto do bundle
  // vem junto da linha (ver rfMktMercado) e o clique materializa antes de abrir o elenco
  const c=cObj||anyClubOf(id)||{short:'—'};
  const acao = (id===CL.clubId) ? 'clGoSquad()'
    : pais ? `rfMkVerClubeFora('${escC(String(pais))}','${escC(String(id))}')`
    : `clViewTeam('${escC(String(id))}')`;
  return `<span class="rf-mkt-clube rf-clicavel" title="Ver o elenco do ${escC(c.short||'')}"
    onclick="event.stopPropagation();${acao}">${rfCrest(c,22)}<span>${escC(c.short)}</span></span>`;
}
function rfMkVerClubeFora(pais,id){
  if(typeof ensureForeignClub==='function') ensureForeignClub(pais,id);
  if(typeof clViewTeam==='function') clViewTeam(id);
}
function rfMkPos(p){ return `<span class="rf-mkt-pos">${escC(rfPosInicial(p.s))}</span>`; }
/* a referência usa UMA letra por setor (G/D/M/A) */
function rfPosInicial(s){ return ({GK:'G',DEF:'D',MID:'M',ATT:'A'})[s]||'—'; }
function rfMkSalario(p){
  const sal=(p.contract&&p.contract.salary)||p.salary||0;
  return sal?rfDin(sal):'—';
}
function rfMkFimContrato(p){
  const anos=(p.contract&&p.contract.years)!=null?p.contract.years:p.contract;
  return (typeof anos==='number')?String((S.season||0)+anos):'—';
}
/* botão de linha: contorno fino, texto na cor da marca. O amarelo cheio
   fica reservado pra linha em destaque (o lance que é seu, o negócio
   aceito) — é assim que a referência separa as duas. */
function rfMkBt(rot, acao, cta){
  return `<span class="rf-mkt-act"><button type="button" class="rf-mkt-bt ${cta?'cta':''}"
    onclick="event.stopPropagation();${acao}">${escC(rot)}</button></span>`;
}
/* camisa pequena do Vender — a mesma peça do banco, sem colete */
/* MESMA CAMISA DO RESTO DO JOGO. Aqui havia um segundo desenho — 34×30, sem
   gola, número em 11px preso ao corpo — e o número saía miúdo e desalinhado em
   relação ao das outras listas. Agora é a peça canónica, no tamanho médio. */
function rfMkCamisaHTML(num, p){ return rfElCamisa(num,'m', p); }
/* miniatura de foto nas TABELAS do mercado (comprar/leilão): entra antes do
   nome quando o jogador tem foto do Estúdio; sem foto, nada muda */
function rfMkFotoMini(p, clubId){
  const foto = (typeof rfFotoDe==='function') ? rfFotoDe(p, clubId) : null;
  if(!foto) return '';
  /* foto e nome levam ao MESMO lugar: a ficha do jogador (a proposta é só
     pelo botão Propor da linha ou pelo botão dentro da ficha) */
  return rfLinkJogador(p.n, clubId, rfFotoNumHTML(foto, p&&p.num, 'm'))+' ';
}

/* =====================================================================
   1 · COMPRAR
   ===================================================================== */
/* por que ordenar a lista — cada um vale nas duas direccoes (ver rfMktVirar) */
const RF_MKT_ORD=[['forca','Força'],['preco','Preço'],['idade','Idade'],
                  ['gols','Gols na temporada'],['nome','Nome'],['clube','Clube']];
const RF_MKT_FILTROS=[
  /* ===== O MERCADO ABRE O MUNDO (regra do dono, 21/08) =====
     O primeiro filtro é o PAÍS: "o meu campeonato" é o mercado de sempre, e cada país com
     bundle de clubes+elencos reais (CONMEBOL + Europa) vira uma prateleira navegável — o
     talento barato do vizinho e o astro internacional, nos dois modos, desde a 1ª temporada.
     A lista é lida direto do bundle; o clube só entra no mundo quando se abre negociação
     (ensureForeignClub). O filtro de clube carrega conforme o país escolhido. */
  { k:'pais',  l:'País',    op:()=>rfMktPaisesOp() },
  { k:'pos',   l:'Posição', op:[['all','Todas'],['GK',(typeof RF_GENERO!=='undefined'?RF_GENERO:{t:x=>x}).t('Goleiros')],['DEF','Defesa'],['MID','Meio'],['ATT','Ataque']] },
  /* ===== A ESCALA DO FILTRO NAO ERA A ESCALA DO JOGO =====
     As opcoes eram 70+/80+/90+, herdadas de um jogo em que a forca vai a 99 na media. Aqui a
     forca REAL do plantel vive noutra faixa: medido nos 5175 jogadores de um save, a mediana e
     34, o percentil 90 e 43 e SO 17 jogadores passam de 70. Ou seja, os tres degraus filtravam
     praticamente tudo — o jogador abria a caixa, escolhia 70+ e a lista esvaziava.
     Agora os degraus cobrem a faixa onde os jogadores de facto estao, sem perder o topo. */
  /* ===== FAIXAS, NAO SO' O "A PARTIR DE" =====
     Os degraus eram todos `20+`, `30+`... — abertos para cima e sem nada abaixo de 20, entao
     nao havia como pedir "os baratos": o inicio da tabela (0 a 20) era invisivel, e cada
     degrau continha todos os de cima. Agora sao FAIXAS fechadas, que e' o que se procura no
     mercado ("um de 30 a 40 que eu consiga pagar"), com o topo aberto onde ele de facto
     acaba (medido: mediana 34, percentil 90 em 43, so' 17 jogadores acima de 70). */
  { k:'forca', l:'Força',   op:[['all','qualquer'],
                                ['0-10','0 a 10'],['11-20','11 a 20'],['21-30','21 a 30'],
                                ['31-40','31 a 40'],['41-50','41 a 50'],['51-60','51 a 60'],
                                ['61-70','61 a 70'],['71-','71 ou mais']] },
  { k:'idade', l:'Idade',   op:[['all','qualquer'],['23','até 23'],['27','até 27'],['30','até 30']] },
  { k:'preco', l:'Preço',   op:[['all','qualquer'],['caixa','o que cabe no caixa'],['meio','até metade do caixa']] },
  /* ===== NACIONALIDADE (regra do dono, 22/08) =====
     Cada liga tem cota de estrangeiros (UNI_CONFIGS.foreignMax) e a compra é BLOQUEADA quando
     ela enche — então quem está com a cota apertada precisa achar os nacionais de relance.
     Os dois primeiros degraus são exatamente os lados da cota (nacional = fora da cota,
     estrangeiro = conta); o resto é a lista real de nacionalidades do mercado escolhido. */
  { k:'nac',   l:'Nacionalidade', op:()=>rfMktNacOp() },
  /* o pacote traz CINCO filtros; faltava o de clube */
  { k:'clube', l:'Clube',   op:()=>rfMktClubesOp() },
];
/* os clubes que de facto têm alguém à venda, em ordem alfabética */
/* Os clubes vêm de DATA.clubs, NÃO do mercado já filtrado: se saíssem da lista
   filtrada, escolher um clube deixaria só ele na própria caixa de selecção e não
   haveria como voltar a outro. */
/* ===== O PAIS PRIMEIRO, A DIVISAO DEBAIXO DELE =====
   "o meu campeonato" nao dizia QUAL campeonato — quem abria a caixa via um rotulo que so'
   faz sentido para quem ja' sabe a resposta. Agora cada pais e' um grupo: a primeira linha
   e' o pais inteiro (o padrao, com TODOS os jogadores dele) e debaixo vem uma linha por
   divisao, para quem procura na segunda da Espanha sem varrer a primeira.

   O valor viaja como `pais` ou `pais|LIGA` e e' partido em rfMktSetF: `f.pais` continua a
   ser so' o pais (e' dele que dependem o mercado, o filtro de clube e a cota), e a divisao
   fica em `f.div`. Assim nada do que ja' existia precisa de saber que a divisao existe. */
function rfMktDivisoesDe(pais){
  /* as divisoes saem dos proprios jogadores (`lg`): e' o unico sitio onde a segunda divisao
     de um pais esta' escrita, e sai de graca porque a lista ja' foi lida. */
  const clubes=(typeof foreignClubsOf==='function')?foreignClubsOf(pais):[];
  const set=new Set();
  clubes.forEach(c=>{ ((c.squad)||[]).forEach(p=>{ if(p&&p.lg) set.add(p.lg); }); });
  return [...set].sort();
}
function rfMktDivLabel(lg){
  /* dois formatos convivem: 'ESP-2' (numero) e 'BRA-D' (letra da serie). Sem tratar a letra,
     a caixa mostrava o codigo cru — 'BRA-D' em vez de 'Série D'. */
  const t=String(lg||'');
  const num=t.match(/-(\d+)$/);
  if(num) return num[1]+'ª divisão';
  const letra=t.match(/-([A-Z])$/);
  if(letra){
    const rot=(typeof DIV_LABEL_FULL!=='undefined')?DIV_LABEL_FULL:{};
    return rot[letra[1]] || ('Série '+letra[1]);
  }
  return t;
}
function rfMktPaisesOp(){
  const paises=(typeof foreignMarketCountries==='function')?foreignMarketCountries():[];
  const meuPais=(typeof activeUniCfg==='function' && activeUniCfg() && activeUniCfg().country) || 'Brasil';
  const op=[['meu', meuPais+' — todo o país']];
  /* o meu campeonato tem as divisoes do JOGO (Serie A..D), que nao vivem no `lg` dos
     jogadores da base domestica — vem do rotulo do universo activo */
  const meusRot=(typeof DIV_LABEL_FULL!=='undefined')?DIV_LABEL_FULL:{};
  Object.keys(meusRot).forEach(d=>op.push(['meu|'+d, '   '+meusRot[d]]));
  paises.forEach(pais=>{
    /* O MEU PAIS NAO ENTRA DUAS VEZES. A lista do exterior inclui o proprio pais do save
       (foreignClubsOf('Brasil') devolve a Serie A), e a caixa abria com 'Brasil — todo o país'
       repetido: uma vez como o meu campeonato, outra como prateleira estrangeira. */
    if(pais===meuPais) return;
    op.push([pais, pais+' — todo o país']);
    rfMktDivisoesDe(pais).forEach(lg=>op.push([pais+'|'+lg, '   '+rfMktDivLabel(lg)]));
  });
  return op;
}
/* nacionalidades que de facto existem no mercado escolhido — da MESMA fonte crua que o
   filtro de clube (nunca da lista já filtrada, senão escolher uma prende a caixa nela) */
function rfMktNacOp(){
  const f=rfMktF();
  const fora = f.pais && f.pais!=='meu';
  const clubes = fora ? ((typeof foreignClubsOf==='function')?foreignClubsOf(f.pais):[])
                      : rfMktClubesDoMeuPais(f.div);
  const set=new Set();
  clubes.forEach(c=>{
    if(c.id===CL.clubId) return;
    const elenco = fora ? ((S.squads&&S.squads[c.id]) || c.squad || []) : (squad(c.id)||[]);
    (elenco||[]).forEach(p=>{ if(p&&p.nat) set.add(p.nat); });
  });
  /* uma linha por nacionalidade JA' EM PORTUGUES: 'Brasil' e 'Brazil' colapsam na mesma. */
  const porPT=new Map();
  set.forEach(n=>{ const pt=rfNacPT(n); if(!porPT.has(pt)) porPT.set(pt,pt); });
  const lista=[...porPT.keys()].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(n=>[n,n]);
  return [['all','qualquer'],['nac','nacionais (fora da cota)'],['estr','estrangeiros (contam na cota)']].concat(lista);
}
function rfMktClubesOp(){
  const f=rfMktF();
  const fonte = (f.pais && f.pais!=='meu' && typeof foreignClubsOf==='function')
    ? foreignClubsOf(f.pais)
    : rfMktClubesDoMeuPais(f.div);
  const lista=fonte
    .filter(c=>c.id!==CL.clubId)
    .map(c=>[String(c.id), c.short||c.name||String(c.id)])
    .sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
  return [['all','qualquer']].concat(lista);
}
/* "31-40" -> 31 a 40 (inclusive); "71-" -> 71 para cima */
function rfMktNaFaixa(v, faixa){
  const [lo,hi]=String(faixa).split('-');
  const n=Number(v)||0;
  if(n < Number(lo)) return false;
  return (hi==='' || hi==null) ? true : n <= Number(hi);
}
/* ===== UMA NACIONALIDADE, UM NOME =====
   A base domestica escreve em portugues ('Brasil') e os pacotes do exterior em ingles
   ('Brazil', 'Spain', 'Germany'...). A caixa listava os dois lados como se fossem paises
   diferentes — e o caso que se via era 'Brasil' e 'Brazil', porque so' ai ha gente dos dois
   lados (os 1406 da base + os 273 brasileiros que jogam fora).

   NAO SE APAGA O MENOR: os 273 sao brasileiros de verdade, a jogar no estrangeiro; apaga-los
   tirava-os do mercado. O que estava errado era o ROTULO, e e' o rotulo que se corrige — o
   motor ja' tratava os dois como domesticos (UNI_CONFIGS.brasil.nat = ['Brasil','Brazil']),
   entao a cota de estrangeiros nunca se enganou; so' a lista e' que mostrava duas linhas. */
const RF_NAC_PT={
  Brazil:'Brasil', Spain:'Espanha', Italy:'Itália', Germany:'Alemanha', England:'Inglaterra',
  France:'França', Netherlands:'Holanda', Belgium:'Bélgica', Switzerland:'Suíça',
  Austria:'Áustria', Croatia:'Croácia', Serbia:'Sérvia', Denmark:'Dinamarca',
  Sweden:'Suécia', Norway:'Noruega', Poland:'Polónia', Turkey:'Turquia', Greece:'Grécia',
  Russia:'Rússia', Ukraine:'Ucrânia', 'Czech Republic':'Chéquia', Hungary:'Hungria',
  Romania:'Roménia', Ireland:'Irlanda', Scotland:'Escócia', Wales:'País de Gales',
  'Northern Ireland':'Irlanda do Norte', Morocco:'Marrocos', Algeria:'Argélia',
  Senegal:'Senegal', Nigeria:'Nigéria', Ghana:'Gana', Cameroon:'Camarões',
  'Ivory Coast':'Costa do Marfim', Egypt:'Egito', Japan:'Japão', 'South Korea':'Coreia do Sul',
  Australia:'Austrália', 'United States':'Estados Unidos', Canada:'Canadá', Mexico:'México',
  Argentina:'Argentina', Uruguay:'Uruguai', Colombia:'Colômbia', Chile:'Chile', Peru:'Peru',
  Ecuador:'Equador', Paraguay:'Paraguai', Venezuela:'Venezuela', Bolivia:'Bolívia',
  Panama:'Panamá', 'Dominican Republic':'República Dominicana', Syria:'Síria',
  Armenia:'Arménia', Portugal:'Portugal'
};
function rfNacPT(n){ return RF_NAC_PT[n] || n || ''; }
function rfMktF(){ const f=CL.mktF||(CL.mktF={pais:'meu',div:'all',pos:'all',forca:'all',idade:'all',preco:'all',clube:'all',ord:'forca',dir:'desc',q:''}); if(f.nac==null) f.nac='all'; if(f.div==null) f.div='all'; if(f.ord==null) f.ord='forca'; if(f.dir==null) f.dir='desc'; return f; }
function rfMktSetF(k,v){
  const f=rfMktF();
  if(k==='pais'){
    /* o valor traz pais e divisao juntos (ver rfMktPaisesOp) */
    const [pais,div]=String(v).split('|');
    f.pais=pais; f.div=div||'all';
    f.clube='all'; f.nac='all';   // clube e nacionalidade são DO país escolhido — trocar de país os zera
  } else f[k]=v;
  if(f.pais==null) f.pais='meu';  // filtro salvo antes do país existir
  CL._mktCache2=null; cdraw();
}
/* a mesma caixa mostra pais e divisao: o valor seleccionado tem de ser reconstruido */
function rfMktPaisVal(){ const f=rfMktF(); return f.div && f.div!=='all' ? (f.pais+'|'+f.div) : f.pais; }
function rfMktSetOrd(v){ const f=rfMktF(); f.ord=v; CL._mktCache2=null; cdraw(); }
/* ===== SUBIR OU DESCER =====
   A lista saia sempre da forca, do maior para o menor — nao havia como pedir "o mais barato
   primeiro" nem "o mais novo". O criterio e a direccao sao duas escolhas separadas de
   proposito: trocar a direccao nao pode obrigar a reescolher o criterio. */
function rfMktVirar(){ const f=rfMktF(); f.dir = f.dir==='desc' ? 'asc' : 'desc'; CL._mktCache2=null; cdraw(); }
function rfMktLimpar(){ CL.mktF={pais:'meu',div:'all',pos:'all',forca:'all',idade:'all',preco:'all',nac:'all',clube:'all',ord:'forca',dir:'desc',q:''}; CL._mktCache2=null; cdraw(); }
/* ===== BUSCA POR NOME =====
   "Buscar jogador", no Resumo, levava para a aba Comprar e mais nada: nao havia
   campo nenhum onde escrever um nome. Quem procura alguem em concreto tinha de
   percorrer sessenta linhas ordenadas por forca.

   O CAMPO NAO REDESENHA A TELA A CADA TECLA. `cdraw()` recria o HTML por
   innerHTML: o input perderia o foco e o cursor voltaria ao inicio, o que
   inverte o texto de quem escreve depressa (ja aconteceu no nome do treinador).
   Aqui so a LISTA e refeita, no lugar, e o campo nem sabe. */
/* "Buscar jogador" leva a aba Comprar E poe o cursor no campo -- antes so
   trocava de aba, e quem procurava um nome ficava a olhar para a lista. */
function rfMktIrBuscar(){
  rfSetTab('mercado','comprar');
  setTimeout(()=>{ const i=document.querySelector('#rf-mkt-q'); if(i){ i.focus(); i.select(); } },40);
}
function rfMktNorm(t){
  return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function rfMktBusca(v){
  rfMktF().q=v||'';
  CL._mktCache2=null;
  const alvo=document.querySelector('.rf-mkt[data-mkt="mkt-mercado"]');
  if(!alvo) { cdraw(); return; }
  const novo=document.createElement('div');
  novo.innerHTML=rfMktComprarTabelaHTML();
  const cheio=novo.querySelector('.rf-mkt[data-mkt="mkt-mercado"]');
  if(cheio) alvo.replaceWith(cheio);
  const cnt=document.querySelector('[data-mkt-conta]');
  if(cnt) cnt.textContent=rfMktConta();
}
/* o mercado inteiro, com os filtros da referência aplicados */
/* PRÉVIA CALIBRADA DO ELENCO ESTRANGEIRO AINDA NÃO MATERIALIZADO. O bundle de um país
   (leagues-intl.js/leagues-conmebol.js) guarda a força REAL, crua (ex.: 72) — a mesma
   escala que `attachAttrs` (index.html) sempre remapeia via REBAL.force(rawF,'A') na hora
   de materializar o clube (ensureForeignClub). Antes desta função, a lista de Comprar
   mostrava o jogador com a força CRUA (72) porque o clube só é materializado quando a
   negociação abre — daí "chegou com 72 lá fora e virou 44 no meu elenco", o mesmo número,
   só que visto ANTES e DEPOIS do mesmo remapeamento. Aqui aplicamos o MESMO remapeamento
   (força + valor) só para EXIBIR, numa cópia rasa — sem tocar no objeto do bundle nem
   materializar nada, então "olhar" continua sem custo (ver o comentário de
   ensureForeignClub: nada entra no mundo só de ser visto). */
function rfMktCalibPreview(p){
  if(!p || p._rb) return p;   // já materializado (ou sem REBAL disponível): os campos já são os certos
  if(typeof REBAL==='undefined' || !REBAL.force) return p;
  const rawF=p.rawF!=null?p.rawF:p.f;
  const f=REBAL.force(rawF,'A');
  let mv=REBAL.value(f,p.age);
  /* O COMPORTAMENTO TAMBÉM ENTRA NO VALOR (attachAttrs, index.html) — de 0,65x
     (Casca-Grossa) a 1,35x (Exemplar) — e é sorteado de forma DETERMINÍSTICA
     (hash do nome+posição, nunca Math.random()), então dá pra prever aqui o
     mesmo resultado que a materialização real vai dar, sem materializar nada. */
  const behavior=(typeof assignBehavior==='function')?assignBehavior({...p,rawF,f}):null;
  if(behavior && typeof BEHAVIOR_MV_MULT!=='undefined') mv=Math.round(mv*(BEHAVIOR_MV_MULT[behavior]||1));
  return {...p, rawF, f, mv, behavior};
}
/* ===== O MEU PAIS SAO AS QUATRO DIVISOES, NAO SO' A MINHA =====
   A prateleira domestica era `DATA.clubs` — os 20 clubes da MINHA divisao — e a Serie A
   entrava por um atalho: `foreignClubsOf('Brasil')` devolve `DATA.clubsSerieA`, e por isso o
   Brasil aparecia na lista do estrangeiro. Resultado: quem estava na Serie D via a propria
   divisao e a Serie A, e as Series B e C nao existiam no mercado.
   O mundo tem as quatro (S.divisionClubs, com elenco em S.squads), entao a lista pode ser
   honesta: "todo o país" e' o país inteiro, e cada divisao e' uma prateleira. */
function rfMktClubesDoMeuPais(div){
  const dc=(S&&S.divisionClubs)||null;
  const resolve=id=>(typeof anyClubOf==='function'?anyClubOf(id):(typeof clubOf==='function'?clubOf(id):null));
  if(!dc || !Object.keys(dc).length) return DATA.clubs||[];   // save antigo: o de sempre
  const ids = (div && div!=='all') ? (dc[div]||[]) : Object.keys(dc).reduce((a,d)=>a.concat(dc[d]||[]),[]);
  const out=[]; const visto=new Set();
  ids.forEach(id=>{ if(visto.has(id)) return; visto.add(id); const c=resolve(id); if(c) out.push(c); });
  return out.length?out:(DATA.clubs||[]);
}
function rfMktMercado(){
  const f=rfMktF();
  const teto=S.budget||0;
  const out=[];
  const fora = f.pais && f.pais!=='meu';
  /* no exterior a fonte é o BUNDLE do país (clubes+elencos reais); um clube já materializado
     no mundo (compra anterior, copa continental) usa o elenco VIVO do S.squads — é nele que
     as vendas já feitas aparecem */
  const clubes = fora ? ((typeof foreignClubsOf==='function')?foreignClubsOf(f.pais):[])
                      : rfMktClubesDoMeuPais(f.div);
  clubes.forEach(c=>{
    if(c.id===CL.clubId) return;
    const jaMaterializado = !!(S.squads&&S.squads[c.id]);
    const elenco = fora
      ? (S.squads&&S.squads[c.id] || (typeof gkSquad==='function'?gkSquad(c):(c.squad||[])))
      : (squad(c.id)||[]);
    (elenco||[]).forEach(p0=>{
      const p = (fora && !jaMaterializado) ? rfMktCalibPreview(p0) : p0;
      if(typeof isTradeLocked==='function' && isTradeLocked(p)) return;
      if(f.pos!=='all' && p.s!==f.pos) return;
      /* nacionalidade: os dois degraus da cota usam a MESMA régua do motor (playerIsForeign,
         contra o universo do MEU campeonato) — o filtro nunca discorda do bloqueio real */
      if(f.nac && f.nac!=='all'){
        const estr=(typeof playerIsForeign==='function') && playerIsForeign(p);
        if(f.nac==='nac' && estr) return;
        else if(f.nac==='estr' && !estr) return;
        else if(f.nac!=='nac' && f.nac!=='estr' && rfNacPT(p.nat)!==f.nac) return;
      }
      if(f.forca!=='all' && !rfMktNaFaixa(p.f||0, f.forca)) return;
      /* no exterior a divisao esta' no `lg` do jogador; no meu pais a fonte de clubes ja'
         veio filtrada por divisao (rfMktClubesDoMeuPais), entao aqui nao ha o que fazer */
      if(fora && f.div && f.div!=='all' && p.lg!==f.div) return;
      if(f.idade!=='all' && (p.age||0)>Number(f.idade)) return;
      let ask=p.mv||0;
      try{ if(typeof playerAsk==='function') ask=playerAsk(p,c.id); }catch(e){}
      /* PERFORMANCE MEXE NO PREÇO (item 4): os gols da temporada na liga de fundo encarecem
         o jogador — artilheiro custa mais, apagado custa o de tabela. O mesmo fator entra no
         mv na materialização (ensureForeignClub), então a negociação cobra o que a lista diz. */
      let gols=0;
      if(fora){
        const L=(S.bgLeagues||{})[f.pais];
        gols=(L&&L.scorers&&L.scorers[p.n])||0;
        if(gols>0) ask=Math.round(ask*(1+Math.min(0.5,gols*0.04)));
      }
      if(f.preco==='caixa' && ask>teto) return;
      if(f.preco==='meio'  && ask>teto/2) return;
      if(f.clube && f.clube!=='all' && String(c.id)!==String(f.clube)) return;
      if(f.q && rfMktNorm(p.n).indexOf(rfMktNorm(f.q))<0) return;
      out.push({p,clubId:c.id,ask,pais:fora?f.pais:null,clube:c,gols});
    });
  });
  const dir = f.dir==='asc' ? 1 : -1;
  const chave = {
    forca: r=>r.p.f||0,
    idade: r=>r.p.age||0,
    preco: r=>r.ask||0,
    gols:  r=>r.gols||0,
    nome:  r=>rfMktNorm(r.p.n),
    clube: r=>rfMktNorm((r.clube&&(r.clube.short||r.clube.name))||''),
  }[f.ord] || (r=>r.p.f||0);
  out.sort((a,b)=>{
    const x=chave(a), y=chave(b);
    if(typeof x==='string') return dir * x.localeCompare(y,'pt-BR');
    return dir * (x-y);
  });
  return out;
}
/* FILTRO = PÍLULA, não caixa de selecção do sistema. O <select> nativo é o
   último resto de aparência de sistema operativo na tela; aqui ele fica por
   baixo, invisível, e quem se vê é a pílula com rótulo e valor. */
function rfMktFiltrosHTML(){
  const f=rfMktF();
  return `<div class="rf-mkf">
    ${RF_MKT_FILTROS.map(ff0=>{
      /* as opções podem ser LISTA ou FUNÇÃO: o filtro de clube só sabe quais
         clubes existem depois de montar o mercado, e a lista muda a cada save */
      const ff={...ff0, op:(typeof ff0.op==='function')?ff0.op():ff0.op};
      /* o filtro de país guarda DUAS coisas (país e divisão) numa caixa só */
      const val = ff.k==='pais' ? rfMktPaisVal() : f[ff.k];
      const at=(ff.op.find(o=>o[0]===val)||ff.op[0])[1];
      return `<label class="rf-mkf-p">
        <span class="rf-mkf-l">${escC(ff.l)}</span>
        <span class="rf-mkf-v">${escC(String(at).trim())}</span>
        <span class="rf-mkf-c">▾</span>
        <select onchange="rfMktSetF('${ff.k}',this.value)">
          ${ff.op.map(([v,l])=>`<option value="${v}" ${val===v?'selected':''}>${escC(l)}</option>`).join('')}
        </select>
      </label>`;
    }).join('')}
    ${/* ===== ORDENAR: O CRITERIO E A DIRECCAO =====
         A pilula escolhe POR QUE ordenar; o botao ao lado vira a direccao. Sao dois controlos
         porque sao duas perguntas — e virar a ordem e' o gesto mais repetido dos dois. */''}
    <label class="rf-mkf-p">
      <span class="rf-mkf-l">Ordenar por</span>
      <span class="rf-mkf-v">${escC((RF_MKT_ORD.find(o=>o[0]===f.ord)||RF_MKT_ORD[0])[1])}</span>
      <span class="rf-mkf-c">▾</span>
      <select onchange="rfMktSetOrd(this.value)">
        ${RF_MKT_ORD.map(([v,l])=>`<option value="${v}" ${f.ord===v?'selected':''}>${escC(l)}</option>`).join('')}
      </select>
    </label>
    <button type="button" class="rf-mkf-dir" onclick="rfMktVirar()"
      title="${f.dir==='desc'?'Do maior para o menor — clique para inverter':'Do menor para o maior — clique para inverter'}"
      aria-label="${f.dir==='desc'?'Ordem decrescente':'Ordem crescente'}">
      <span aria-hidden="true">${f.dir==='desc'?'↓':'↑'}</span>
      <b>${f.dir==='desc'?'maior primeiro':'menor primeiro'}</b>
    </button>
    <label class="rf-mkf-busca">
      <span class="rf-mkf-busca-i">${rfIcone('buscar',15)}</span>
      <input id="rf-mkt-q" type="search" placeholder="Buscar jogador pelo nome"
        value="${escC(f.q||'')}" oninput="rfMktBusca(this.value)"
        onkeydown="if(event.key==='Escape'){this.value='';rfMktBusca('')}">
    </label>
    <div class="rf-sp"></div>
    <button type="button" class="rf-mkf-x" onclick="rfMktLimpar()">Limpar filtros</button>
  </div>`;
}
/* A TABELA SEPARADA DA TELA: a busca por nome refaz so isto, no lugar, sem
   passar por cdraw() -- ver rfMktBusca. */
function rfMktComprarTabelaHTML(){
  const mostra=rfMktMercado().slice(0,60);
  const linhas=mostra.map(({p,clubId,ask,pais,clube,gols})=>{
    const propor=`rfMkPropor('${escC(clubId)}','${escC(p.n)}','${escC(pais||'')}')`;
    /* bandeira + o lado da cota no title: quem está com a cota cheia enxerga de relance
       quem pode e quem não pode contratar (mesma régua do motor — playerIsForeign) */
    const estr=(typeof playerIsForeign==='function') && playerIsForeign(p);
    const nac=`<span class="rf-mkt-x rf-mkt-nac" title="${escC(p.nat||'nacionalidade desconhecida')}${estr?' · estrangeiro (conta na cota)':' · não conta na cota'}">${(typeof flagImg==='function'&&p.nat)?flagImg(p.nat):'—'}</span>`;
    return `<div class="rf-mkt-row" onclick="rfVerFichaJogador('${escC(p.n)}','${escC(String(clubId))}'${pais?`,'${escC(String(pais))}'`:''})" title="Ver a ficha de ${escC(p.n)}">
    <span class="rf-mkt-n">${rfMkFotoMini(p, clubId)}${rfLinkJogador(p.n, clubId)}${gols?` <em class="rf-mkt-gols" title="${gols} gols nesta temporada — a performance encarece o passe">⚽${gols}</em>`:''}</span>
    <span class="rf-mkt-f">${p.f}</span>
    ${rfMkPos(p)}
    ${nac}
    <span class="rf-mkt-x">${p.age||'—'}</span>
    ${rfMkClube(clubId, pais?clube:null, pais)}
    <span class="rf-mkt-v">${escC(rfDin(ask))}</span>
    <span class="rf-mkt-v leve">${escC(rfMkSalario(p))}</span>
    ${rfMkBt('Propor',propor)}
  </div>`;});
  const cabecalho=`<span>JOGADOR</span><span class="dir">FOR</span><span class="dir">POS</span>
    <span class="dir">NAC</span><span class="dir">IDA</span>
    <span>CLUBE</span><span class="dir">VALOR</span><span class="dir">SALÁRIO</span><span></span>`;
  const vazio=(rfMktF().q||'').trim()
    ? `${(typeof RF_GENERO!=='undefined'?RF_GENERO:{t:x=>x,ehFem:()=>false}).t('Nenhum')} ${(typeof RF_GENERO!=='undefined'?RF_GENERO:{t:x=>x,ehFem:()=>false}).t('jogador')} com esse nome — e os filtros de posicao, forca e preco tambem contam.`
    : `${(typeof RF_GENERO!=='undefined'?RF_GENERO:{t:x=>x,ehFem:()=>false}).t('Nenhum')} ${(typeof RF_GENERO!=='undefined'?RF_GENERO:{t:x=>x,ehFem:()=>false}).t('jogador')} com esses filtros.`;
  /* GRADE LITERAL DO PACOTE (Mercado - Abas): duas colunas flexiveis (1.3fr e
     1fr) repartem nome e clube. */
  return rfMkTabela('minmax(0,1.3fr) 28px 34px 34px 34px minmax(0,1fr) 96px 84px 74px',
    cabecalho, linhas, vazio, 'mkt-mercado');
}
function rfMktConta(){
  const todos=rfMktMercado();
  return Math.min(60,todos.length)+' de '+todos.length;
}
function rfMktComprarHTML(){
  if(typeof canNegotiate==='function' && !canNegotiate())
    return rfCol(rfCard(`${(typeof RF_GENERO!=='undefined'?RF_GENERO:{t:x=>x,ehFem:()=>false}).t('Jogadores')} no mercado`,
      `<div class="rf-empty">${escC(typeof windowClosedMsg==='function'?windowClosedMsg():'A janela de transferências está fechada.')}</div>`));
  const teto=S.budget||0;
  const folha=rfFolha();
  const sq=squad(CL.clubId);
  /* a cota de estrangeiros da liga, SEMPRE à vista: era invisível até o bloqueio acontecer,
     e o "cota cheia" parecia erro. Mesma conta do motor (squadForeignCount/foreignMax). */
  const cfgUni=(typeof activeUniCfg==='function')?activeUniCfg():null;
  const cotaMax=(cfgUni&&cfgUni.foreignMax)||0;
  const cotaAtual=(cotaMax&&typeof squadForeignCount==='function')?squadForeignCount(CL.clubId):0;
  const kpiCota=cotaMax?rfKpiHTML('Estrangeiros', cotaAtual+' de '+cotaMax,
    cotaAtual>=cotaMax?'cota cheia — só nacionais':'vagas na cota da liga',
    cotaAtual>=cotaMax?'ruim':''):'';
  return rfMktGavetaHTML(['oferta']) + rfCol(
    rfCard(`${(typeof RF_GENERO!=='undefined'?RF_GENERO:{t:x=>x,ehFem:()=>false}).t('Jogadores')} no mercado`,
      rfMktFiltrosHTML() + rfMktComprarTabelaHTML(),
      {right: `<span data-mkt-conta>${escC(rfMktConta())}</span>`})
    + rfCard('O que o caixa permite', `
      <div class="rf-kpis rf-kpis-4">
        ${rfKpiHTML('Caixa', rfDin(teto))}
        ${rfKpiHTML('Folha atual', rfDin(folha)+'/mês')}
        ${rfKpiHTML('Margem de salário', rfDin(Math.max(0,Math.round(teto/12)-folha))+'/mês')}
        ${rfKpiHTML('Elenco', sq.length+' de 30')}
        ${kpiCota}
      </div>`)
  );
}

/* =====================================================================
   2 · LEILÃO
   ===================================================================== */
function rfMktLeilaoHTML(){
  if(typeof mergeAuctionBidsFromSeats==='function'){ try{ mergeAuctionBidsFromSeats(); }catch(e){} }
  const lots=((S.auctions&&S.auctions.lots)||[]);
  const abertos=lots.filter(l=>l.status==='open');
  const fechados=lots.filter(l=>l.status!=='open').slice(-6).reverse();
  const linha=l=>{
    const p=(typeof findP==='function')?findP(l.player,l.sellerId):null; if(!p) return '';
    const meu=l.leader===S.clubId;
    return `<div class="rf-mkt-row ${meu?'destaque':''}">
      <span class="rf-mkt-n">${rfMkFotoMini(p, l.sellerId)}${rfLinkJogador(p.n, l.sellerId)}</span>
      <span class="rf-mkt-f">${p.f}</span>
      ${rfMkPos(p)}
      ${(typeof rfNacHTML==='function')?rfNacHTML(p,'rf-mkt-x'):''}
      <span class="rf-mkt-x">${p.age||'—'}</span>
      ${rfMkClube(l.sellerId)}
      <span class="rf-mkt-v">${escC(rfDin(l.bid))}</span>
      <span class="rf-mkt-v ${l.myBid?'meu':'leve'}">${l.myBid?escC(rfDin(l.myBid)):'—'}</span>
      <span class="rf-mkt-prazo">${escC(rfMkFechaEm(l.roundsLeft))}</span>
      ${rfMkBt(meu?'Cobrir':'Dar lance',`rfMkLance('${escC(l.sellerId)}','${escC(l.player)}')`, meu)}
    </div>`;
  };
  const cabecalho=`<span>JOGADOR</span><span class="dir">FOR</span><span class="dir">POS</span>
    <span class="dir">NAC</span><span class="dir">IDA</span>
    <span>CLUBE</span><span class="dir">LANCE ATUAL</span><span class="dir">SEU LANCE</span>
    <span class="dir">FECHA</span><span></span>`;
  const arrematados=fechados.map(l=>{
    const p=(typeof findP==='function')?findP(l.player,l.sellerId):null;
    const c=anyClubOf(l.leader==='cpu'?l.sellerId:l.leader)||{short:'—'};
    const meu=l.leader===S.clubId;
    return `<div class="rf-arr ${meu?'destaque':''}">
      <span class="rf-arr-i">🔨</span>
      <span class="rf-arr-n">${escC(l.player)}</span>
      <span class="rf-arr-s">${p?escC(rfPosInicial(p.s))+' · força '+p.f:''}</span>
      <span class="rf-arr-c">${escC(c.short)}</span>
      <span class="rf-arr-v">${escC(rfDin(l.bid))}</span>
    </div>`;
  }).join('');
  return rfMktGavetaHTML(['lance']) + rfCol(
    rfCard('Lotes abertos',
      rfMkTabela('minmax(0,1fr) 44px 48px 40px 48px minmax(0,160px) 116px 108px 92px 104px',
        cabecalho, abertos.map(linha), 'Nenhum leilão aberto nesta semana.', 'mkt-leilao'),
      {right: abertos.length? abertos.length+' ativos':''})
    + rfCard('Arrematados recentemente',
      arrematados || '<span class="rf-note">Ainda não houve arremate nesta temporada.</span>')
  );
}

/* =====================================================================
   3 · PROPOSTAS — um card por proposta, com os quatro números
   ===================================================================== */
function rfMktPropostasHTML(){
  const ofertas=rfPropostas().filter(o=>o.expiresRound>S.round);
  if(!ofertas.length) return rfCol(rfCard('Propostas recebidas',
    `<div class="rf-empty">Nenhuma proposta no momento.<br><small>Clubes fazem propostas pelos seus destaques enquanto a janela está aberta.</small></div>`));
  const sq=squad(CL.clubId);
  const cards=ofertas.map((o,i)=>{
    const p=sq.find(x=>x.n===o.playerName)||{};
    const rodadas=Math.max(0,o.expiresRound-S.round);
    const vm=(typeof computeVM==='function'&&p.n)?computeVM(p):(p.mv||0);
    const sal=(p.contract&&p.contract.salary)||p.salary||0;
    const sub=sq.filter(x=>x.s===p.s && x.n!==p.n).sort((a,b)=>(b.f||0)-(a.f||0))[0];
    const acima=vm?(o.fee>=vm):null;
    // a tarja da esquerda é a urgência: vermelha quando resta uma rodada
    return `<div class="rf-card rf-prop2 ${rodadas<=1?'urgente':'atencao'}">
      <div class="rf-prop2-hd">
        <span class="rf-prop2-crest">${rfCrest(anyClubOf(o.buyerId)||{short:o.buyerName||'—'},44)}</span>
        <div class="rf-prop2-id">
          <span class="rf-prop2-t">${escC(o.buyerName||'Um clube')} quer o ${rfLinkJogador(o.playerName, CL.clubId)}</span>
          <!-- no telefone o prazo entra curto: "resposta em 2 rodadas" quebrava a
               linha em duas e o desenho mostra o contexto numa linha só.
               Fica "rodadas", que é a unidade real do motor — o desenho escreve
               "dias", mas dia não quer dizer nada aqui e seria falso. -->
          <span class="rf-prop2-s">${escC(rfPosInicial(p.s))} · ${p.age||'—'} anos · força ${o.playerForce||p.f||'—'} · ${
            (typeof isPhone==='function'&&isPhone())?'':'resposta em '}${rodadas} semana${rodadas===1?'':'s'}</span>
        </div>
        <div class="rf-sp"></div>
        <div class="rf-prop2-acts">
          <button type="button" class="rf-btn rf-btn-recusar" onclick="rfAcAbrir('mkt-recusar',{id:${o.id}})">Recusar</button>
          <button type="button" class="rf-btn rf-btn-secondary" onclick="rfMkContrapor(${o.id})">Contrapropor</button>
          <button type="button" class="rf-btn rf-btn-cta" onclick="rfAcAbrir('mkt-aceitar',{id:${o.id}})">Aceitar</button>
        </div>
      </div>
      <div class="rf-prop2-nums">
        ${rfKpiHTML('Oferta', rfDin(o.fee), 'à vista')}
        ${rfKpiHTML('Salário que sai', sal?rfDin(sal):'—', sal?'alívio na folha':'', sal?'bom':'')}
        ${rfKpiHTML('Valor de mercado', vm?rfDin(vm):'—',
          acima===null?'':(acima?'acima do valor':'abaixo do valor'), acima===null?'':(acima?'bom':'ruim'))}
        <!-- "PROVAVEL": e o palpite do jogo sobre quem herda a vaga, nao uma
             escalacao. Quem decide continua a ser o utilizador. -->
        ${rfKpiHTML('Provável substituto', sub?sub.n:'—', sub?'já no elenco':'sem reserva no setor', sub?'':'ruim')}
      </div>
      ${o.lastMsg?`<span class="rf-prop-msg">${rfIcone('chat',16)} ${escC(o.lastMsg)}</span>`:''}
    </div>`;
  }).join('');
  const totalFee=ofertas.reduce((t,o)=>t+(o.fee||0),0);
  const totalSal=ofertas.reduce((t,o)=>{ const p=sq.find(x=>x.n===o.playerName);
    return t+((p&&((p.contract&&p.contract.salary)||p.salary))||0); },0);
  // força de ataque e meio ANTES e DEPOIS, pra medir o buraco que a saída abre
  const saindo=new Set(ofertas.map(o=>o.playerName));
  const media=(lista,sec)=>{ const f=lista.filter(x=>x.s===sec).slice().sort((a,b)=>b.f-a.f).slice(0,4);
    return f.length?Math.round(f.reduce((t,x)=>t+x.f,0)/f.length):0; };
  const depois=sq.filter(x=>!saindo.has(x.n));
  const dAtt=media(depois,'ATT')-media(sq,'ATT'), dMid=media(depois,'MID')-media(sq,'MID');
  const del=n=>n===0?'':(n>0?'+'+n:String(n));
  return rfMktGavetaHTML(['contra']) + rfCol(cards +
    rfCard(`Impacto se aceitar ${ofertas.length===1?'a proposta':(ofertas.length===2?'as duas':'as '+ofertas.length)}`, `
      <div class="rf-kpis rf-kpis-4">
        ${rfKpiHTML('Caixa', rfDin((S.budget||0)+totalFee), '+'+rfDin(totalFee), 'bom')}
        ${rfKpiHTML('Folha', rfDin(rfFolha()-totalSal)+'/mês', totalSal?'−'+rfDin(totalSal):'', 'bom')}
        ${rfKpiHTML('Força do ataque', String(media(depois,'ATT')), del(dAtt), dAtt<0?'ruim':'bom')}
        ${rfKpiHTML('Força do meio', String(media(depois,'MID')), del(dMid), dMid<0?'ruim':'bom')}
      </div>`)
  );
}

/* =====================================================================
   4 · CONTRAPROPOSTAS
   ===================================================================== */
/* a SITUAÇÃO é uma tarja de três estados, e a cor é a distância que falta:
   cinza quando ainda não decidiram, amarelo quando falta pouco, verde
   quando aceitaram — aí a linha inteira acende e o botão vira Fechar. */
function rfMkSituacao(minha, pedido){
  if(!pedido || pedido<=minha) return {k:'ok', t:'ACEITO'};
  const dif=(pedido-minha)/pedido;
  return dif<=0.1 ? {k:'quase', t:'QUASE FECHADO'} : {k:'neutro', t:'A DECIDIR'};
}
function rfMktContraHTML(){
  const lista=(typeof myCounterOffers==='function')?myCounterOffers():[];
  const linhas=lista.map(o=>{
    /* OS NOMES DOS CAMPOS ESTAVAM ERRADOS, E A TABELA MENTIA POR ISSO.
       A contraproposta guarda `askFee` (o que eles pedem) e `offeredFee` (o que eu ofereci) —
       ver counterHumanOffer no core. Aqui liam-se `o.ask`/`o.counter`/`o.fee`, que não existem:
       PEDIDO DELES saía sempre "—", SUA OFERTA saía R$ 0 e, como rfMkSituacao trata pedido 0
       como "não pediram nada", TODA linha aparecia verde com a etiqueta ACEITO e um botão
       "Fechar". Uma negociação por decidir era mostrada como negócio feito. */
    const pedido=o.askFee||0, minha=o.offeredFee||0;
    const dif=pedido-minha;
    const st=rfMkSituacao(minha,pedido);
    const feito=st.k==='ok';
    return `<div class="rf-mkt-row ${feito?'destaque':''}" onclick="rfMkContraReceb(${o.id})">
      <span class="rf-mkt-n">${escC(o.playerName||'')}</span>
      <span class="rf-mkt-pos">${escC(o.playerPos||'—')}</span>
      ${o.sellerId?rfMkClube(o.sellerId):'<span class="rf-mkt-clube">—</span>'}
      <span class="rf-mkt-v meu">${escC(rfDin(minha))}</span>
      <span class="rf-mkt-v">${pedido?escC(rfDin(pedido)):'—'}</span>
      <span class="rf-mkt-v ${dif>0?'ruim':'leve'}">${dif>0?escC(rfDin(dif)):'—'}</span>
      <span class="rf-mkt-tag ${st.k}">${st.t}</span>
      ${rfMkBt('Responder',`rfMkContraReceb(${o.id})`, true)}
    </div>`;
  });
  const cabecalho=`<span>JOGADOR</span><span>POS</span><span>CLUBE</span>
    <span class="dir">SUA OFERTA</span><span class="dir">PEDIDO DELES</span>
    <span class="dir">DIFERENÇA</span><span class="dir">SITUAÇÃO</span><span></span>`;
  return rfMktGavetaHTML(['oferta']) + rfCol(
    rfCard('Negociações em andamento',
      rfMkTabela('minmax(0,1fr) 44px minmax(0,160px) 116px 124px 112px 132px 104px',
        cabecalho, linhas, 'Nenhuma negociação aberta agora.', 'mkt-propostas'),
      {right: lista.length? lista.length+' abertas':''})
    + rfCard('Como negociar',
      `<p class="rf-texto">Cada subida na oferta consome um dia da janela. Clubes da mesma divisão
       pedem 20% a mais quando o jogador é titular. Se a diferença for menor que 10%, costumam
       aceitar na primeira contraproposta.</p>`)
  );
}

/* =====================================================================
   5 · VENDER
   ===================================================================== */
function rfMktVenderHTML(){
  const sq=squad(CL.clubId).slice().sort((a,b)=>(b.f||0)-(a.f||0));
  const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};
  const xi=new Set(xiPlayers(CL.clubId).map(p=>p.pid));
  const linhas=sq.map((p,i)=>{
    const vm=(typeof computeVM==='function')?computeVM(p):(p.mv||0);
    // INTERESSE: quantos clubes já mandaram proposta por ele
    const clubes=rfPropostas().filter(o=>o.playerName===p.n).length;
    /* SEM LINHA DESTACADA. O primeiro da lista vinha com contorno claro como se
       estivesse selecionado, mas ninguém o selecionou — era só o mais valioso.
       Marca de seleção que não corresponde a uma escolha do utilizador confunde
       em vez de orientar. */
    return `<div class="rf-mkt-row" onclick="rfVerFichaJogador('${escC(p.n)}','${escC(String(CL.clubId))}')" title="Ver a ficha de ${escC(p.n)}">
      <span class="rf-mkt-n">${rfMkFotoMini(p, CL.clubId)}${rfLinkJogador(p.n, CL.clubId)}</span>
      <span class="rf-mkt-f">${p.f}</span>
      ${rfMkPos(p)}
      ${(typeof rfNacHTML==='function')?rfNacHTML(p,'rf-mkt-x'):''}
      <span class="rf-mkt-x">${p.age||'—'}</span>
      <span class="rf-mkt-v">${escC(rfDin(vm))}</span>
      <span class="rf-mkt-v leve">${escC(rfMkSalario(p))}</span>
      ${rfMkBt('Listar',`rfMkListar('${escC(p.pid)}')`)}
    </div>`;
  });
  /* FIM DE CONTRATO e INTERESSE saíram: com nove colunas o botão Listar só
     aparecia depois de rolar. As duas continuam na ficha do jogador. */
  const cabecalho=`<span>JOGADOR</span><span class="dir">FOR</span><span class="dir">POS</span>
    <span class="dir">NAC</span><span class="dir">IDA</span>
    <span class="dir">VALOR</span><span class="dir">SALÁRIO</span><span></span>`;
  // QUEM VOCÊ NÃO DEVERIA VENDER: o titular mais caro de repor
  const chave=[...xi].map(pid=>sq.find(p=>p.pid===pid)).filter(Boolean).filter(p=>{
    const outros=sq.filter(x=>x.s===p.s && x.pid!==p.pid && (x.f||0)>=(p.f||0)-5);
    return outros.length===0;
  }).sort((a,b)=>(b.f||0)-(a.f||0))[0];
  const gols=(chave&&chave.stats&&chave.stats.goals)||0;
  const golsTime=sq.reduce((t,p)=>t+((p.stats&&p.stats.goals)||0),0);
  return rfMktGavetaHTML(['listar']) + rfCol(
    rfCard('Seu elenco à venda',
      rfMkTabela('minmax(0,1.3fr) 28px 34px 34px 34px 96px 92px 74px',
        cabecalho, linhas, 'Elenco vazio.', 'mkt-vender'),
      {right: sq.length+' jogadores'})
    + rfCard('Quem você não deveria vender',
      chave
        ? `<p class="rf-texto">${escC(chave.n)} é o único do sector com esse nível no elenco${
            golsTime?` e responde por ${gols} dos ${golsTime} gols do time`:''}. Vender agora abre
           um buraco no onze que o banco não cobre, e a direcção cobra explicação se a campanha cair.</p>`
        : `<p class="rf-texto">O banco cobre todos os titulares. Dá para negociar sem abrir buraco no onze.</p>`)
  );
}

/* =====================================================================
   6 · TRANSFERÊNCIAS
   ===================================================================== */
function rfMktTransfHTML(){
  const nomeDe=id=>{ if(!id) return 'fora do mundo';
    const c=anyClubOf(id); return (c&&c.short)||String(id); };
  /* O jogo não guarda um log global: o histórico VIAJA COM O JOGADOR
     (p.transferHistory, ver recordTransferHistory no core). Então as
     movimentações da divisão são varridas dos elencos de todos os clubes. */
  const ent=[];
  (DATA.clubs||[]).forEach(c=>{ (squad(c.id)||[]).forEach(p=>{
    (p.transferHistory||[]).forEach(h=>ent.push({p,h}));
  }); });
  ent.sort((a,b)=>(b.h.season-a.h.season)||(b.h.round-a.h.round));
  /* QUANDO: data curta (7/mar), a mesma régua do calendário — sete dias por
     rodada, ver rfCpDataDaJornada. Antes saía em texto ("há 3 rodadas",
     "temporada 2027"), que ocupava o dobro da largura e ainda obrigava a contar
     de cabeça para saber quando foi. De outra temporada, entra o ano. */
  const quando=h=>{
    const d=rfMkDataDaJornada(h.round||0);
    if(h.season!==S.season) return (d?d+'/':'')+String(h.season||'').slice(-2);
    return d||'—';
  };
  /* SEM DESTAQUE NAS LINHAS. Marcava toda transferência que envolvia o seu clube,
     e numa janela movimentada isso enchia a tabela de faixas coloridas — o
     realce perdia o sentido e o bloco ficava pesado de ler. O seu clube já se
     identifica pelo escudo e pelo nome na própria linha. */
  const linhas=ent.map(({p,h})=>`<div class="rf-mkt-row">
    <span class="rf-mkt-n">${escC(p.n)}</span>
    ${rfMkPos(p)}
    <span class="rf-mkt-f">${p.f}</span>
    ${h.from?rfMkClube(h.from):`<span class="rf-mkt-clube">${escC(nomeDe(h.from))}</span>`}
    <span class="rf-mkt-seta">→</span>
    ${h.to?rfMkClube(h.to):`<span class="rf-mkt-clube">${escC(nomeDe(h.to))}</span>`}
    <span class="rf-mkt-v">${escC(rfDin(h.fee||0))}</span>
    <span class="rf-mkt-x">${escC(quando(h))}</span>
  </div>`);
  const cabecalho=`<span>JOGADOR</span><span>POS</span><span>FOR</span><span>DE</span>
    <span></span><span>PARA</span><span class="dir">VALOR</span><span class="dir">QUANDO</span>`;
  const aberta=(typeof inTransferWindow==='function')?inTransferWindow():true;
  const jornadas=(S.sched||[]).length||14;
  const pct=Math.max(0,Math.min(100,Math.round((S.round||0)/rodadas*100)));
  const faltam=Math.max(0,rodadas-(S.round||0));
  return rfCol(
    rfCard('Janela de transferências', `
      <div class="rf-jan-l">
        <span class="rf-jan-t">${aberta?'Aberta desde a 1ª semana':'Fechada'}</span>
        <span class="rf-jan-p">${pct}%</span>
      </div>
      <div class="rf-jan-trilho"><i style="width:${pct}%"></i></div>`,
      {right: aberta?('fecha em '+faltam+' semana'+(faltam===1?'':'s')):'fechada'})
    + rfCard('Movimentações da divisão',
      rfMkTabela('minmax(0,1fr) 44px 48px minmax(0,150px) 28px minmax(0,150px) 116px 116px',
        /* CHAVE PRÓPRIA. Esta tabela usava 'mkt-contra', a mesma das
           contrapropostas: as duas dividiam o estado da lista longa e herdavam
           uma da outra a grade do telefone, o que partia o cabeçalho em duas
           linhas e desalinhava as colunas. */
        cabecalho, linhas, 'Nenhuma transferência registrada ainda nesta temporada.', 'mkt-transf'),
      {right: ent.length? ent.length+' no total':''})
  );
}

/* =====================================================================
   AS GAVETAS DO MERCADO — o que era modal agora acontece DENTRO da aba

   Nenhuma ação do Mercado abre mais sobreposição. Propor, cobrir um
   leilão, contrapropor e listar pra venda abrem uma GAVETA: um cartão
   que nasce no topo da própria aba, empurra a tabela pra baixo e fecha
   sozinho quando o negócio termina. A tabela continua visível o tempo
   todo — era isso que o modal tirava.

   O motor é o MESMO de antes (startNego/clubRespond/agentRespond/
   finalizeTransfer/placeAuctionBid/counterIncomingOffer). O que mudou é
   só quem desenha o passo: em vez de renderMarketOffer() abrir o dlg,
   cada ação chama cdraw() e a gaveta se redesenha no lugar.
   ===================================================================== */
function rfMkP(){ return CL.mkP||null; }
function rfMkFechar(){ CL.mkP=null; CL.market=null; cdraw(); }
/* O MESMO CAMPO TEM DOIS NOMES. A gaveta do Mercado desenha `rf-mk-*`; os
   diálogos de ação (rf26-acoes.js) desenham `rf-ac-*`. Os handlers só procuravam
   `rf-mk-*`, então TODA proposta feita pelo diálogo lia zero e devolvia "Digite
   quanto você quer oferecer" — mesmo com o valor digitado à vista. Valia para
   propor, dar lance, listar e contrapor: quatro botões mortos pelo mesmo motivo.
   Aqui a busca aceita os dois nomes, e o diálogo tem prioridade porque, quando
   ele está aberto, é nele que a pessoa está a escrever. */
function rfMkNum(id){
  const alt=String(id||'').replace(/^rf-mk-/,'rf-ac-');
  const el=document.querySelector('#'+alt) || document.querySelector('#'+id);
  return el ? (parseInt((el.value||'').replace(/\D/g,''),10)||0) : 0;
}
/* O QUE ENTRA TEM DE VOLTAR NA MESMA MOEDA EM QUE SAIU.
   Todo campo de dinheiro destes diálogos é preenchido com `moneyDisp(...)`, que
   converte de R$ interno para a moeda escolhida. Mas quatro dos seis leitores
   pegavam o número digitado e mandavam direto para o motor, sem desfazer a
   conversão: a proposta, o salário da negociação, a proposta a humano e o lance
   do leilão. Em Reais (taxa 1) ninguém via; em qualquer outra moeda o jogador
   escrevia um valor e o caixa era debitado noutro — dinheiro a sério, errado.
   `rfMkVal` é o leitor de dinheiro; `rfMkNum` fica para o que não é dinheiro. */
function rfMkVal(id){
  const v=rfMkNum(id);
  return (typeof curParse==='function')?curParse(v):v;
}
/* moldura comum: título, subtítulo, o ✕ e o corpo */
function rfMkGavetaHTML(titulo, sub, corpo){
  return `<div class="rf-card rf-gaveta">
    <div class="rf-gaveta-hd">
      <div class="rf-gaveta-id">
        <span class="rf-gaveta-t">${titulo}</span>
        ${sub?`<span class="rf-gaveta-s">${sub}</span>`:''}
      </div>
      <button type="button" class="rf-gaveta-x" onclick="rfMkFechar()" title="Fechar">✕</button>
    </div>
    ${corpo}
  </div>`;
}
function rfMkCampoHTML(id, rotulo, valor, dica){
  return `<label class="rf-mkc">
    <span class="rf-mkc-l">${escC(rotulo)}</span>
    <span class="rf-mkc-f"><span class="rf-mkc-cur">${escC(curSym())}</span>
      <input class="rf-mkc-in" id="${id}" inputmode="numeric" value="${valor?escC(moneyDisp(valor)):''}"
        oninput="clMoneyInputReformat(this)"></span>
    ${dica?`<span class="rf-mkc-d">${dica}</span>`:''}
  </label>`;
}

/* ---- 1 · PROPOR / SUBIR A OFERTA (Comprar e Contrapropostas) ---- */
function rfMkPropor(clubId, nome, pais){
  // clube do exterior: entra no mundo AGORA (elenco real do bundle) — é a pré-condição de
  // toda a negociação existente (findP, playerAsk, S.negos) funcionar sem saber de onde veio
  if(pais && typeof ensureForeignClub==='function') ensureForeignClub(pais, clubId);
  rfAcPreparar(clubId, nome); if(!CL.market) return;
  rfAcAbrir('mkt-propor', {clubId, player:nome, oferta:CL.market.offer});
}
function rfAcPreparar(clubId, nome){
  CL.market=null;
  const p=(typeof findP==='function')?findP(nome,clubId):null; if(!p) return;
  if(typeof isTradeLocked==='function' && isTradeLocked(p)){
    toastC(`${p.n} já foi negociado nesta temporada.`); return; }
  const ask=(typeof playerAsk==='function')?playerAsk(p,clubId):(p.mv||0);
  /* REAPROVEITA A NEGOCIACAO JA ABERTA, SE HOUVER — mas o campo do vendedor no nego é
     `sellerId` (ver startNego, core.js), nunca `clubId`. Este filtro comparava com
     `n.clubId`, que não existe em nenhum nego: a busca nunca achava nada, então CADA
     clique em "Propor" (mesmo no MESMO jogador, com contraproposta em aberto) começava
     um negócio do zero, com o campo voltando a nascer no PEDIDO CHEIO (100% do ask) —
     era isso que parecia "o valor sobe sozinho a cada clique". Também trocado `!n.done`
     (campo que também não existe) por `n.stage!=='done'`, que é como o motor marca
     negociação encerrada (aceita, recusada ou expirada — ver clubRespond/finalizeTransfer). */
  const idx=(S.negos||[]).findIndex(n=>n && n.sellerId===clubId && n.player===nome && n.stage!=='done');
  CL.market={step:'offer', clubId, player:nome,
    offer: idx>=0 ? (S.negos[idx].clubCounter||S.negos[idx].offerFee) : Math.round(ask/1000)*1000,
    negoIdx: idx>=0?idx:null};
}
function rfMkProporFee(){
  const M=CL.market; if(!M) return;
  /* clube de outro treinador nao passa por aqui -- e sendHumanOffer que vale. Rede de
     seguranca para qualquer caminho que ainda caia neste botao (ver o dialogo mkt-propor). */
  if(CL.online && CL.humans && CL.humans[M.clubId]){ rfMkEnviarHumano(); return; }
  M.offer=rfMkVal('rf-mk-fee');
  if(M.offer<=0){ toastC('Digite quanto você quer oferecer.'); return; }
  if(M.negoIdx==null) M.negoIdx=startNego(M.clubId,M.player,M.offer);
  /* startNego devolve -1 quando recusa abrir (janela fechada, jogador travado, clube de
     humano). S.negos[-1] e undefined, e o que se via era um botao que nao fazia nada --
     sem toast, sem erro. Agora o motivo aparece. */
  if(M.negoIdx==null || M.negoIdx<0){
    M.negoIdx=null;
    toastC('⚠ '+((typeof canNegotiate==='function' && !canNegotiate())
      ? 'A janela de transferências está fechada.'
      : 'Não é possível abrir negociação por este jogador agora.'));
    return;
  }
  if(S.negos[M.negoIdx]) S.negos[M.negoIdx].offerFee=M.offer;
  const r=clubRespond(S.negos[M.negoIdx]); toastC(r.msg||''); cdraw();
}
function rfMkIgualar(){
  const M=CL.market; const n=M&&M.negoIdx!=null?S.negos[M.negoIdx]:null;
  if(!n||!n.clubCounter){ toastC('Não há pedido pra igualar.'); return; }
  if(n.clubCounter>(S.budget||0)){ toastC('Caixa insuficiente pra igualar esse pedido.'); return; }
  M.offer=n.clubCounter;
  S.negos[M.negoIdx].offerFee=M.offer;
  const r=clubRespond(S.negos[M.negoIdx]); toastC(r.msg||''); cdraw();
}
/* LIA O CAMPO ERRADO. O diálogo novo (rf26-acoes.js) desenha o input com o id
   `rf-ac-sal`; aqui lia-se `rf-mk-sal`, que é o da gaveta ANTIGA. Fora dela o
   selector não achava nada, `rfMkVal` devolvia 0 e o `||n.salary` repunha o
   valor de antes — ou seja, o que o utilizador escrevesse no campo do salário
   era simplesmente ignorado. Agora lê o que estiver na tela, seja qual for. */
function rfMkSalarioDoCampo(){
  const v=rfMkVal('rf-ac-sal');
  return v || rfMkVal('rf-mk-sal') || 0;
}
function rfMkTermos(){
  const M=CL.market; const n=S.negos[M.negoIdx];
  n.salary=rfMkSalarioDoCampo()||n.salary;
  const r=agentRespond(n); toastC(r.msg||''); cdraw();
}
function rfMkAceitarAgente(){
  const M=CL.market; const n=S.negos[M.negoIdx];
  if(n.agentCounter) n.salary=n.agentCounter; cdraw();
}
function rfMkFinalizar(){
  const M=CL.market; const n=S.negos[M.negoIdx];
  /* grava o que está no campo ANTES de fechar: no veredito com pedido do
     empresário em aberto o campo é editável e é ele que manda */
  const doCampo=rfMkSalarioDoCampo();
  if(n && doCampo) n.salary=doCampo;
  const r=finalizeTransfer(M.negoIdx);
  toastC(r.msg||'');
  if(r.ok){ rfGravar(); CL.mkP=null; CL.market=null; CL.acao=null; }
  cdraw();
}
function rfMkOfertaHTML(){
  const M=CL.market; if(!M) return '';
  const p=(typeof findP==='function')?findP(M.player,M.clubId):null;
  if(!p){ CL.mkP=null; return ''; }
  const c=anyClubOf(M.clubId)||{short:'—'};
  const n=M.negoIdx!=null?S.negos[M.negoIdx]:null;
  const sub=`${escC(rfPosInicial(p.s))} · ${p.age||'—'} anos · força ${p.f} · ${escC(c.short)}`;
  // clube de outro humano: proposta vai pro e-mail dele, não há regateio algorítmico
  if(CL.online && CL.humans && CL.humans[M.clubId]){
    return rfMkGavetaHTML('Proposta por '+escC(p.n), sub, `
      <span class="rf-note">Este jogador é de outro treinador. A proposta vai direto pro e-mail dele — ele aceita, recusa ou negocia.</span>
      <div class="rf-mkg-linha">
        ${rfMkCampoHTML('rf-mk-fee','Sua proposta',M.offer,'valor de mercado '+escC(rfDin(rfVM(p))))}
        <button type="button" class="rf-btn rf-btn-primary" onclick="rfMkEnviarHumano()">Enviar proposta</button>
      </div>`);
  }
  if(!n || n.stage==='fee' || n.stage==='counterFee'){
    const pediu = n && n.stage==='counterFee' && n.clubCounter;
    return rfMkGavetaHTML('Proposta por '+escC(p.n), sub, `
      ${pediu?`<div class="rf-mkg-aviso">O ${escC(c.short)} quer a partir de <b>${escC(rfDin(n.clubCounter))}</b>.
        <button type="button" class="rf-btn rf-btn-ghost" onclick="rfMkIgualar()">Igualar pedido</button></div>`:''}
      <div class="rf-mkg-linha">
        ${rfMkCampoHTML('rf-mk-fee','Sua proposta (taxa)',M.offer,'valor de mercado '+escC(rfDin(rfVM(p)))+' · caixa '+escC(rfDin(S.budget||0)))}
        <button type="button" class="rf-btn rf-btn-primary" onclick="rfMkProporFee()">Propor</button>
      </div>`);
  }
  if(n.stage==='terms'){
    return rfMkGavetaHTML('Salário de '+escC(p.n), 'taxa acertada em '+escC(rfDin(n.offerFee)), `
      ${n.agentCounter?`<div class="rf-mkg-aviso">O empresário pede <b>${escC(fmt(n.agentCounter))}</b> por semana.
        <button type="button" class="rf-btn rf-btn-ghost" onclick="rfMkAceitarAgente()">Aceitar o pedido</button></div>`:''}
      <div class="rf-mkg-linha">
        ${rfMkCampoHTML('rf-mk-sal','Salário semanal',n.salary,'a folha de hoje é '+escC(rfDin(rfFolha())))}
        <button type="button" class="rf-btn rf-btn-primary" onclick="rfMkTermos()">Oferecer</button>
      </div>`);
  }
  return rfMkGavetaHTML(escC(p.n)+' está fechado', 'taxa '+escC(rfDin(n.offerFee))+' · salário '+escC(rfDin(n.salary||0)), `
    <div class="rf-mkg-linha">
      <span class="rf-note">Falta só assinar. O valor sai do caixa na hora e o salário entra na folha do mês seguinte.</span>
      <button type="button" class="rf-btn rf-btn-cta" onclick="rfMkFinalizar()">Fechar contratação</button>
    </div>`);
}
function rfMkEnviarHumano(){
  const M=CL.market; M.offer=rfMkVal('rf-mk-fee');
  const r=sendHumanOffer(M.clubId,M.player,M.offer); toastC(r.msg||'');
  if(r.ok){ rfGravar(); CL.mkP=null; CL.market=null; CL.acao=null; }
  cdraw();
}
function rfFolha(){
  return squad(CL.clubId).reduce((t,p)=>t+((p.contract&&p.contract.salary)||p.salary||0),0);
}

/* ---- 2 · LANCE DE LEILÃO ---- */
function rfMkLance(sellerId, player){
  if(typeof mergeAuctionBidsFromSeats==='function'){ try{ mergeAuctionBidsFromSeats(); }catch(e){} }
  CL.mkP={tipo:'lance', sellerId, player};
  const lot=((S.auctions&&S.auctions.lots)||[]).find(l=>l.id===sellerId+'|'+player);
  // COBRIR e DAR LANCE são dois diálogos diferentes no pacote: cobrir é
  // quando alguém já está na frente, e abre com o aviso de quem é.
  const cobrir = lot && lot.leader && lot.leader!==S.clubId && lot.myBid;
  rfAcAbrir(cobrir?'mkt-cobrir':'mkt-lance', {sellerId, player});
}
/* Mostra o próximo leilão fechado por OUTRO clube, um de cada vez, e só uma vez
   por venda. Chamado ao voltar da rodada (ver rfPrContinuar): é o momento em que
   o utilizador está a par do que aconteceu na rodada. */
function rfMkLeilaoOutroPendente(){
  const fila=(typeof S!=='undefined' && S.auctionSales)||[];
  const v=fila.find(x=>x && !x._visto);
  if(!v) return false;
  v._visto=true;
  rfAcAbrir('mkt-leilao-outro',{venda:v});
  return true;
}
function rfMkLanceGo(){
  const P=CL.mkP; const id=P.sellerId+'|'+P.player;
  const lot=((S.auctions&&S.auctions.lots)||[]).find(l=>l.id===id);
  /* COBERTURA = dar lance quando a liderança é de outro clube. O motor não
     contava isso; o diálogo do pacote mostra "2 de 3" e avisa que na terceira o
     lote fecha, então o número precisa existir em algum lugar. Fica no próprio
     lote, que é salvo junto com o resto do leilão. */
  const eraCobertura = !!(lot && lot.leader && lot.leader!==S.clubId);
  const r=placeAuctionBid(id, rfMkVal('rf-mk-lance'));
  if(r&&r.ok&&eraCobertura&&lot) lot.myCovers=(lot.myCovers||0)+1;
  toastC(r.msg||'');
  if(r.ok){ rfGravar(); CL.mkP=null; CL.acao=null; }
  cdraw();
}
function rfMkLanceHTML(){
  const P=CL.mkP;
  const lot=((S.auctions&&S.auctions.lots)||[]).find(l=>l.id===P.sellerId+'|'+P.player && l.status==='open');
  const p=(typeof findP==='function')?findP(P.player,P.sellerId):null;
  if(!lot||!p){ CL.mkP=null; return ''; }
  const c=anyClubOf(P.sellerId)||{short:'—'};
  const meu=lot.leader===S.clubId;
  const sugerido=Math.round(lot.bid+Math.max(50000,lot.bid*0.08));
  return rfMkGavetaHTML('Lance por '+escC(p.n),
    `${escC(rfPosInicial(p.s))} · força ${p.f} · ${escC(c.short)} · ${lot.interest} clubes na disputa`, `
    <div class="rf-mkg-aviso">Maior lance agora: <b>${escC(mvShort(lot.bid))}</b> ${meu?'(seu)':'(concorrência)'}
      · fecha em <b>${lot.roundsLeft} semana${lot.roundsLeft===1?'':'s'}</b></div>
    <div class="rf-mkg-linha">
      ${rfMkCampoHTML('rf-mk-lance','Seu lance',sugerido,'precisa passar de '+escC(mvShort(lot.bid))+' · caixa '+escC(rfDin(S.budget||0)))}
      <button type="button" class="rf-btn rf-btn-cta" onclick="rfMkLanceGo()">Confirmar lance</button>
    </div>`);
}

/* ---- 3 · CONTRAPROPOR (uma proposta recebida) ---- */
function rfMkContrapor(id){ CL.mkP={tipo:'contra', id}; rfAcAbrir('mkt-contra',{id}); }
function rfMkContraporGo(){
  /* mesma regra do rfMkListarGo: o id vem do dialogo aberto, com CL.mkP so como reserva */
  const d=(typeof rfAcD==='function')?rfAcD():{};
  const P={ id:(d&&d.id!=null)?d.id:(CL.mkP&&CL.mkP.id) };
  if(P.id==null){ toastC('Escolha a proposta primeiro.'); return; }
  const valor=rfMkVal('rf-mk-ask');
  if(valor<=0){ toastC('Digite quanto você quer pedir.'); return; }
  const o=rfPropostas().find(x=>x.id===P.id);
  /* PEDIR ABAIXO DA OFERTA NAO E CONTRAPROPOSTA. O motor aceita e responde "segue valendo X" —
     so que gasta uma das tres rodadas de negociacao e nada muda no ecra. Barrado aqui, com o
     numero a bater: e a mesma conta que enche o campo. */
  if(o && valor<=(o.fee||0)){ toastC('Peça mais do que os '+rfDin(o.fee||0)+' que eles já oferecem.'); return; }
  const humano = o && CL.online && CL.humans && CL.humans[o.buyerId];
  const r = humano ? counterHumanOffer(P.id, valor)
                   : (counterIncomingOffer(P.id, valor)||{ok:true});
  if(r&&r.msg) toastC(r.msg);
  if(!r||r.ok!==false) rfGravar();
  /* ===== O DIALOGO SO FECHA QUANDO NAO HA MAIS NADA A DECIDIR =====
     Ele fechava sempre que a resposta vinha "ok" — e o caso mais importante e justamente esse:
     "toparam o seu pedido". A venda NAO estava feita (falta aceitar), mas o diálogo desaparecia
     e o jogador tinha de voltar à lista e procurar a proposta outra vez, sem o número que
     acabara de negociar à frente. Agora fica aberto enquanto a proposta existir: ali estão a
     resposta deles, o valor novo e o botão de aceitar. */
  if(!rfPropostas().find(x=>x.id===P.id)){ CL.mkP=null; CL.acao=null; }
  cdraw();
}
function rfMkContraHTML(){
  const o=rfPropostas().find(x=>x.id===CL.mkP.id);
  if(!o){ CL.mkP=null; return ''; }
  const p=squad(CL.clubId).find(x=>x.n===o.playerName)||{};
  const vm=(typeof computeVM==='function'&&p.n)?computeVM(p):(p.mv||0);
  return rfMkGavetaHTML('Contraproposta por '+escC(o.playerName),
    `${escC(o.buyerName||'um clube')} ofereceu ${escC(rfDin(o.fee||0))}`, `
    <div class="rf-mkg-linha">
      ${rfMkCampoHTML('rf-mk-ask','Quanto você pede',Math.round((vm||o.fee)*1.15/1000)*1000,
        'valor de mercado '+escC(mvShort(vm||0))+' · pedir muito acima costuma matar a negociação')}
      <button type="button" class="rf-btn rf-btn-primary" onclick="rfMkContraporGo()">Enviar contraproposta</button>
    </div>`);
}

/* ---- 4 · LISTAR PRA VENDA ---- */
function rfMkListar(pid){ CL.mkP={tipo:'listar', pid}; CL.selPlayer=pid; rfAcAbrir('mkt-listar',{pid}); }
/* ===== QUEM MANDA E O DIALOGO ABERTO, NAO O CL.mkP =====
   Isto lia `CL.mkP.pid` a seco. Pela aba Vender funcionava (rfMkListar escreve o CL.mkP antes
   de abrir), mas pela FICHA DO JOGADOR o botao chama rfAcAbrir('mkt-listar') direto, sem
   escrever nada — CL.mkP estava null e o clique morria num TypeError, sem toast, sem tela nova,
   sem nada no ecra. Era o "clico em Listar e nao acontece nada".
   O pid ja viaja nos dados do proprio dialogo (rfAcD), que e a fonte que existe nos dois
   caminhos; o CL.mkP fica so como reserva para quem ainda o escreve. */
function rfMkListarGo(){
  const d=(typeof rfAcD==='function')?rfAcD():{};
  const pid=(d&&d.pid) || (CL.mkP&&CL.mkP.pid);
  if(!pid){ toastC('Escolha o jogador primeiro.'); return; }
  CL.selPlayer=pid;
  CL.sellPrice=String(rfMkNum('rf-mk-preco')||'');
  CL.mkP=null; CL.acao=null;
  /* TIRA ESTE DIALOGO DO ECRA ANTES DE A VENDA DESENHAR O DELA. clSellConfirm termina em
     auctionDialog, uma tela legada que se sobrepoe sem refazer o desenho todo: sem este cdraw
     o "Listar para venda" ficava por cima do resultado da venda, e o jogador via os dois
     empilhados. Zerar CL.acao nao chega — quem tira do DOM e o redesenho. */
  if(typeof cdraw==='function') cdraw();
  clSellConfirm();
}
function rfMkListarHTML(){
  const p=squad(CL.clubId).find(x=>x.pid===(CL.mkP&&CL.mkP.pid));
  if(!p){ CL.mkP=null; return ''; }
  const vm=(typeof computeVM==='function')?computeVM(p):(p.mv||0);
  const titular=xiPlayers(CL.clubId).some(x=>x.pid===p.pid);
  return rfMkGavetaHTML('Listar '+escC(p.n),
    `${escC(rfPosInicial(p.s))} · ${p.age||'—'} anos · força ${p.f} · ${titular?'titular':'reserva'}`, `
    ${titular?'<div class="rf-mkg-aviso">É titular. Sair dele agora abre buraco no onze até você repor.</div>':''}
    <div class="rf-mkg-linha">
      ${rfMkCampoHTML('rf-mk-preco','Preço que você pede',Math.round(vm/1000)*1000,
        'valor de mercado '+escC(rfDin(vm))+' · pedir muito acima afasta comprador')}
      <button type="button" class="rf-btn rf-btn-cta" onclick="rfMkListarGo()">Pôr à venda</button>
    </div>`);
}

/* a gaveta certa pra aba certa — cada aba chama isto no topo */
/* AS GAVETAS SAÍRAM. O pacote "Ações Internas" define ação interna como
   DIÁLOGO — cartão centrado, cabeçalho em degradê, filete amarelo —, não
   como cartão dentro da aba. Quem desenha agora é rfAcao(), em
   rf26-acoes.js; esta função devolve vazio para as abas não mudarem. */
function rfMktGavetaHTML(abas){
  return '';
  const P=rfMkP(); if(!P) return '';
  if(abas && abas.indexOf(P.tipo)<0) return '';
  if(P.tipo==='oferta') return rfMkOfertaHTML();
  if(P.tipo==='lance')  return rfMkLanceHTML();
  if(P.tipo==='contra') return rfMkContraHTML();
  if(P.tipo==='listar') return rfMkListarHTML();
  return '';
}

/* aceitar e recusar também deixam de abrir sobreposição: resolvem na
   própria aba e o cartão da proposta some da lista no redesenho. */
function rfMkAceitar(id){
  const r=(typeof acceptIncomingOffer==='function')?acceptIncomingOffer(id):null;
  toastC((r&&r.msg)||'');
  if(r&&r.ok){ rfGravar(); CL.mkP=null; CL.acao=null; }
  cdraw();
}
/* ===== CONTRAPROPOSTA RECEBIDA (Resenha) =====
   Aceitar = mandar a proposta no valor pedido (acceptCounterOffer -> sendHumanOffer). Pode
   falhar por caixa, janela fechada ou cota: nesse caso o diálogo FICA aberto com a mensagem,
   senão a recusa do motor sumia junto com a tela e parecia que o botão não fez nada. */
/* fecha a tela de venda concluida e devolve a selecao do Elenco a um jogador que existe —
   o vendido saiu, e a ficha ficaria a apontar para um pid que ja nao esta la */
function rfMkVendidoFechar(){
  CL.acao=null; CL.rightMode=null;
  const sq=(typeof squad==='function')?squad(CL.clubId):[];
  CL.selPlayer=(sq[0]&&sq[0].pid)||null;
  if(typeof cdraw==='function') cdraw();
}
function rfMkContraReceb(id){ rfAcAbrir('mkt-contra-receb',{id}); }
function rfMkContraRecebAceitar(id){
  const r=(typeof acceptCounterOffer==='function')?acceptCounterOffer(id):null;
  toastC((r&&r.msg)||'');
  if(r&&r.ok){ rfGravar(); CL.acao=null; }
  cdraw();
}
function rfMkContraRecebRecusar(id){
  const r=(typeof rejectCounterOffer==='function')?rejectCounterOffer(id):null;
  toastC((r&&r.msg)||'');
  rfGravar(); CL.acao=null; cdraw();
}
function rfMkRecusar(id){
  if(typeof rejectIncomingOffer==='function') rejectIncomingOffer(id);
  if(CL.mkP&&CL.mkP.tipo==='contra'&&CL.mkP.id===id) CL.mkP=null;
  CL.acao=null;
  cdraw();
}
