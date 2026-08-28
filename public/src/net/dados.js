/* ============================================================================
   PACOTES DE DADOS — catálogo de fábrica + correções por cima
   ----------------------------------------------------------------------------
   Clubes e elencos vêm de public/src/data/*.js (window.GAME_DATA para a Série A,
   window.BRASIL_LOWER para B/C/D). Esses arquivos continuam sendo a base: são
   iguais para todo jogador, mudam raramente e já vêm pela CDN. O banco guarda só
   o que DIFERE — o pacote.

   QUANDO O PACOTE ENTRA. mpBuildInitialState() materializa os elencos DENTRO do
   save/da sala no momento da criação, e o resolve-round trabalha em cima desse
   estado. Ou seja: basta o catálogo estar corrigido na hora de criar o jogo.
   Quem entra na sala depois recebe o elenco pronto pelo shared_state — não
   precisa ter o pacote, e não há como divergir do anfitrião.

   O PACOTE OFICIAL é aplicado sempre, para todo mundo: é onde a equipe corrige
   dado errado do catálogo. Um pacote de anfitrião entra por cima dele.

   Save já começado não muda — o universo está gravado dentro dele.
   ============================================================================ */
(function(){
'use strict';

const SB_URL = 'https://alxwgqvjmetjbbqtjkhx.supabase.co';
const SB_KEY = 'sb_publishable_WxYyZVfS-ER00kl2q5bBHg_qifOGq5k';
const REST   = SB_URL + '/rest/v1/';
const CACHE  = 'rf98:pack:oficial:v1';

/* Onde cada clube mora, por origem:
     Brasil Série A  -> window.GAME_DATA.clubs
     Brasil B/C/D    -> window.BRASIL_LOWER[div]
     Europa          -> window.INTL_LEAGUES[país]      (lista única por país; a divisão é o campo lg)
     América do Sul  -> window.CONMEBOL_LEAGUES[país]  (divisão única)
   Um clube novo entra na lista do país escolhido no editor; sem país, cai no Brasil. */
function listas(){
  const out = [];
  if(window.GAME_DATA && Array.isArray(window.GAME_DATA.clubs)) out.push({div:'A', pais:'brasil', arr:window.GAME_DATA.clubs});
  if(window.BRASIL_LOWER) for(const d of ['B','C','D']){
    if(Array.isArray(window.BRASIL_LOWER[d])) out.push({div:d, pais:'brasil', arr:window.BRASIL_LOWER[d]});
  }
  for(const fonte of ['INTL_LEAGUES','CONMEBOL_LEAGUES']){
    const mapa = window[fonte]; if(!mapa) continue;
    for(const pais of Object.keys(mapa))
      if(Array.isArray(mapa[pais])) out.push({ div:null, pais, arr:mapa[pais] });
  }
  return out;
}
/* lista de destino de um clube NOVO: país primeiro (Europa/CONMEBOL têm uma lista
   por país), divisão depois (só o Brasil é separado por divisão) */
function listaDestino(pais, divisao){
  const ls = listas();
  if(pais && pais !== 'brasil'){
    const nome = (window.UNIVERSOS && window.UNIVERSOS[pais] && window.UNIVERSOS[pais].country) || pais;
    const l = ls.find(x => x.pais === nome) || ls.find(x => x.pais === pais);
    if(l) return l;
  }
  return ls.find(x => x.pais === 'brasil' && x.div === (divisao||'D')) || ls[0];
}
function acharClube(id){
  for(const l of listas()){ const c = l.arr.find(x => String(x.id) === String(id)); if(c) return c; }
  return null;
}

/* lista fechada de propósito: patch com chave errada não planta campo novo dentro
   do objeto de clube que o motor lê */
const CAMPOS_CLUBE   = ['name','short','color','color2','crest','OS','MS','DS','overall'];
const CAMPOS_JOGADOR = ['n','p','s','f','age','mv','num','nat','ft','moral','energy'];
function copiar(destino, patch, permitidos){
  for(const k of permitidos) if(patch[k] !== undefined && patch[k] !== null) destino[k] = patch[k];
}

/* ÂNCORA DE NOME (`_n0`). O patch acha o jogador pelo NOME, e o pacote oficial
   agora TROCA esse nome (nomes fictícios no lugar dos reais). Duas coisas quebram
   se a busca olhar só para o nome corrente:

     · o pacote oficial é aplicado DUAS vezes por visita — uma do cache do
       localStorage, síncrona, antes do motor montar nada, e outra quando a rede
       responde (ver o fim deste arquivo);
     · a planilha REUSA nomes: no Curitiba FC "Renato Marques" vira "Bruno Melo"
       enquanto o "Bruno Melo" de verdade vira "Márcio Cardoso". Na segunda
       passada a chave "Bruno Melo" acharia o Renato já renomeado e os dois
       terminariam com o mesmo nome.

   Então quem é renomeado guarda o nome de fábrica em `_n0`, e a busca prefere
   `_n0`. Com isso reaplicar o pacote continua sendo atribuição, não acúmulo —
   que é o contrato deste arquivo. Sem `_n0` (todo patch que não mexe em `n`)
   nada muda: casa pelo nome corrente como sempre. */
function candidatos(sq, nome){
  const ancorados = sq.filter(x => x._n0 === nome);
  return ancorados.length ? ancorados : sq.filter(x => x._n0 === undefined && x.n === nome);
}
function renomear(p, dados){
  if(dados.n && dados.n !== p.n && p._n0 === undefined) p._n0 = p.n;
  copiar(p, dados, CAMPOS_JOGADOR);
}

/* aplica uma lista de edições sobre o catálogo em memória. Idempotente: é
   atribuição, não incremento — reaplicar o mesmo pacote não acumula efeito. */
/* CHAVE DAS LINHAS DE CALENDÁRIO no pacote: uma por país. `pack_edits` é indexado por
   (pack_id, club_id), então o país entra no lugar do id do clube. É o que permite um pacote
   trazer vários países sem tabela nova. */
const PREFIXO_CALENDARIO = '__calendario__:';

function aplicar(edits){
  if(!Array.isArray(edits) || !edits.length) return 0;
  let n = 0;
  for(const e of edits){
    try{
      /* FOLHA DE CALENDÁRIO — o que faz "acrescentar um país" ser trabalho de painel e não de
         código. Passa pelo validador antes de entrar: folha com erro é RECUSADA e a do
         repositório continua a valer, porque um calendário torto vindo do banco só se descobre
         em dezembro, quando a final não acontece. */
      if(typeof e.club_id === 'string' && e.club_id.indexOf(PREFIXO_CALENDARIO) === 0){
        const pais = e.club_id.slice(PREFIXO_CALENDARIO.length);
        const API = (typeof globalThis!=='undefined') && globalThis.CALENDARIOS_API;
        if(API && API.instalarCalendario && e.patch){
          const uni = (window.UNIVERSOS||{})[pais];
          const r = API.instalarCalendario(pais, e.patch, { divisoes: uni && uni.size });
          if(r.ok) n++;
          else console.warn('pacote: calendário de '+pais+' recusado — '+r.motivo,
                            r.problemas.filter(x=>x.nivel==='erro').map(x=>x.texto));
        }
        continue;
      }
      if(e.novo){
        const alvo = listaDestino((e.patch||{}).pais, e.divisao);
        if(!alvo || acharClube(e.club_id)) continue;
        const clube = Object.assign({}, e.patch, { id: e.club_id });
        if(!Array.isArray(clube.squad)) clube.squad = [];
        // fora do Brasil a divisão é o campo lg ('ENG-1'), não uma lista separada
        const uni = (window.UNIVERSOS||{})[(e.patch||{}).pais];
        if(uni && uni.lg && e.divisao && uni.lg[e.divisao]) clube.lg = uni.lg[e.divisao];
        alvo.arr.push(clube); n++; continue;
      }
      const clube = acharClube(e.club_id);
      if(!clube) continue;
      copiar(clube, e.patch||{}, CAMPOS_CLUBE);
      const sq = Array.isArray(clube.squad) ? clube.squad : null;
      if(sq && e.patch){
        /* jogador é identificado pelo NOME: o elenco de fábrica não tem id estável.
           Quando o MESMO nome aparece duas vezes no elenco (há dois "João Pedro"
           no br_C_brusque), a chave leva o sufixo `##N` — o N-ésimo homônimo, na
           ordem do elenco, 1-based. Sem sufixo continua sendo o primeiro que casar.

           OS ALVOS SÃO RESOLVIDOS ANTES DE QUALQUER ESCRITA porque o patch de
           nomes fictícios RENOMEIA: se aplicássemos `##1` na hora, o `##2` já não
           acharia dois homônimos e o segundo jogador ficaria com o nome real. */
        if(e.patch.squad){
          const alvos = [];
          for(const chave of Object.keys(e.patch.squad)){
            const m = /^([\s\S]*)##(\d+)$/.exec(chave);
            const nome = m ? m[1] : chave;
            const ordem = m ? (parseInt(m[2],10) - 1) : 0;
            const cands = candidatos(sq, nome);
            if(cands[ordem]) alvos.push([cands[ordem], e.patch.squad[chave]]);
          }
          for(const [p, dados] of alvos) renomear(p, dados);
        }
        if(Array.isArray(e.patch.squad_remover)) for(const nome of e.patch.squad_remover){
          const i = sq.findIndex(x => x.n === nome); if(i>=0) sq.splice(i,1);
        }
        if(Array.isArray(e.patch.squad_novos)) for(const novo of e.patch.squad_novos){
          if(!novo || !novo.n || sq.some(x => x.n === novo.n)) continue;
          const p = { moral:70, energy:100 }; copiar(p, novo, CAMPOS_JOGADOR); sq.push(p);
        }
      }
      n++;
    }catch(err){ /* um patch torto não pode derrubar o boot do jogo */ }
  }
  return n;
}

function buscarEdits(packId){
  const q = packId ? 'pack_id=eq.'+encodeURIComponent(packId)
                   : 'pack_id=eq.'+encodeURIComponent(PACOTE_OFICIAL||'');
  return fetch(REST + 'pack_edits?select=club_id,divisao,novo,patch&' + q,
    { headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY, 'Accept-Profile':'elifoot_v3' } })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP '+r.status)));
}

/* FOTOS E UNIFORMES DO PACOTE (Estúdio IA do painel dos sócios):
   · RF_FOTOS[club_id|nome] -> foto final do jogador (rosto costurado no uniforme);
   · RF_FOTOS_NOME[nome]    -> a mesma foto indexada só pelo nome (fallback para
     jogador transferido, até a recostura no clube novo);
   · RF_UNIFORMES[club_id]  -> uniforme do clube (url, miniatura, patrocinador e
     posições das camadas), para o campo e as páginas do clube.
   Carrega SOLTO depois do boot — a UI usa quando estiver no ar e cai no retrato
   padrão enquanto isso; erro aqui não pode derrubar nada. */
window.RF_FOTOS = window.RF_FOTOS || {};
window.RF_FOTOS_NOME = window.RF_FOTOS_NOME || {};
window.RF_UNIFORMES = window.RF_UNIFORMES || {};
/* A CABECA, guardada a' parte da foto costurada. E' ela que faz a camisa
   trocar numa transferencia: a montagem em `atributos.montagem` nasce presa
   ao clube de origem, mas a cabeca serve a qualquer um. O jogo monta cabeca +
   camisa do clube ATUAL na hora de desenhar — sem gerar nada.
   `RF_ROSTO_MED` traz a medida que o painel gravou (topo, base, largura,
   centro do recorte): sem ela nao ha' como posicionar, e medir na hora seria
   uma leitura de canvas por retrato. */
window.RF_ROSTOS = window.RF_ROSTOS || {};
window.RF_ROSTOS_NOME = window.RF_ROSTOS_NOME || {};
window.RF_ROSTO_MED = window.RF_ROSTO_MED || {};
window.RF_ROSTO_AJ = window.RF_ROSTO_AJ || {};
/* QUE TIPO DE RECORTE a foto tem. O card poe a identidade do clube no fundo,
   e isso so' funciona com foto de fundo TRANSPARENTE: as antigas sao opacas e
   tapam o fundo inteiro. O card precisa saber a diferenca para nao afastar a
   foto e deixar um retangulo cinza flutuando sobre as listras. */
window.RF_FOTO_RECORTE = window.RF_FOTO_RECORTE || {};
window.RF_FOTO_POS = window.RF_FOTO_POS || {};
/* RF_TREINADORES['m1'..'f5'] -> as 10 faces padrão de treinador, escolhidas no
   assistente por quem não gera a própria. Moram na MESMA tabela (linhas com
   club_id '__treinador__', como os moldes usam '__molde__'), então vêm de
   carona nesta busca — sem requisição nova e sem asset a commitar. */
window.RF_TREINADORES = window.RF_TREINADORES || {};
window.RF_TREINADOR_MARCA = window.RF_TREINADOR_MARCA || {};   // {escudoUrl, marcaUrl, escudo, marca}
window.RF_TREINADOR_POS = window.RF_TREINADOR_POS || {};       // ajuste solto por face
function buscarFotos(packId){
  if(!packId) return;
  fetch(REST + 'player_photos?select=club_id,jogador,url,atributos&pack_id=eq.'+encodeURIComponent(packId),
    { headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY, 'Accept-Profile':'elifoot_v3' } })
    .then(r => r.ok ? r.json() : [])
    .then(rows => {
      for(const f of rows||[]){
        if(!f || f.club_id === '__molde__') continue;
        /* ANTES do ramo do torso e do de jogador: a face do treinador não é
           foto de elenco nem uniforme, e deixá-la cair nos ramos de baixo a
           colocaria em RF_FOTOS com o nome 'm1'. */
        if(f.club_id === '__treinador__'){
          /* '__marca__' nao e' uma face: e' a linha dos LOGOS (escudo + marca)
             e da posicao padrao deles. A roupa sai limpa da IA e o desenho
             entra como camada por cima — ver o Estudio. */
          if(f.jogador === '__marca__'){ window.RF_TREINADOR_MARCA = f.atributos || {}; continue; }
          if(f.url) window.RF_TREINADORES[f.jogador] = f.url;
          const at = f.atributos || {};
          if(at.pos) window.RF_TREINADOR_POS[f.jogador] = at.pos;
          continue;
        }
        const at = f.atributos || {};
        if(f.jogador === '__torso__'){
          if(at.rascunho) continue;   // rascunho é do Estúdio — o jogo só mostra o APLICADO
          window.RF_UNIFORMES[String(f.club_id)] = Object.assign({ url:f.url }, at);
          continue;
        }
        /* A CABECA entra mesmo quando a montagem existe: e' ela que permite
           remontar noutro clube. `url === montagem` e' foto antiga, de antes
           da separacao em camadas — ali nao ha' cabeca solta. */
        if(f.url && at.montagem !== f.url && at.medida){
          const chave = String(f.club_id)+'|'+f.jogador;
          window.RF_ROSTOS[chave] = f.url;
          window.RF_ROSTOS_NOME[f.jogador] = f.url;
          window.RF_ROSTO_MED[f.jogador] = at.medida;
          if(at.encaixe) window.RF_ROSTO_AJ[f.jogador] = at.encaixe;
        }
        if(at.recorte) window.RF_FOTO_RECORTE[f.jogador] = at.recorte;
        const foto = at.montagem || null;   // a foto costurada segue de reserva
        if(!foto) continue;
        /* ajuste de camadas SÓ desta foto: a costura por IA nunca devolve o
           enquadramento no mesmo pixel, então o Estúdio deixa acertar escudo,
           patrocinador e fabricante foto a foto. Vazio = segue o clube. */
        if(at.pos) window.RF_FOTO_POS[String(f.club_id)+'|'+f.jogador] = at.pos;
        window.RF_FOTOS[String(f.club_id)+'|'+f.jogador] = foto;
        window.RF_FOTOS_NOME[f.jogador] = foto;
      }
    })
    .catch(()=>{});
}

let PACOTE_OFICIAL = null;
const aplicados = new Set();

/* 1) CACHE, SÍNCRONO — o pacote oficial da visita anterior entra antes de o motor
      montar qualquer coisa. Sem isto, quem criasse um jogo nos primeiros milissegundos
      pegaria o catálogo sem correção. */
try{
  const c = JSON.parse(localStorage.getItem(CACHE)||'null');
  if(c && Array.isArray(c.v)){ aplicar(c.v); PACOTE_OFICIAL = c.id||null; aplicados.add('oficial'); }
}catch(e){}

/* 2) REDE — atualiza para a próxima visita (e para esta, se ainda der tempo) */
fetch(REST + 'data_packs?select=id,codigo,nome&oficial=is.true&limit=1',
      { headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY, 'Accept-Profile':'elifoot_v3' } })
  .then(r => r.ok ? r.json() : [])
  .then(ps => {
    if(!ps || !ps.length) return;
    PACOTE_OFICIAL = ps[0].id;
    buscarFotos(PACOTE_OFICIAL);
    return buscarEdits(PACOTE_OFICIAL).then(edits => {
      aplicar(edits); aplicados.add('oficial');
      try{ localStorage.setItem(CACHE, JSON.stringify({ t:Date.now(), id:PACOTE_OFICIAL, v:edits })); }catch(e){}
    });
  })
  .catch(()=>{ /* sem rede: fica com o cache */ });

/* PACOTE DA SALA/DO SAVE — chamado antes de gerar o universo (anfitrião) e ao
   entrar numa sala criada com pacote (convidado, para ver os mesmos nomes e
   escudos que o anfitrião). Devolve quantos clubes foram tocados. */
async function usarPacote(packId){
  if(!packId || aplicados.has(packId)) return 0;
  try{
    const edits = await buscarEdits(packId);
    const n = aplicar(edits);
    aplicados.add(packId);
    return n;
  }catch(e){ console.warn('pacote de dados:', e && e.message); return 0; }
}

/* pacotes que esta conta pode usar como anfitrião: o oficial + os que ela tem */
async function meusPacotes(token){
  const h = { apikey:SB_KEY, Authorization:'Bearer '+(token||SB_KEY), 'Accept-Profile':'elifoot_v3' };
  const [ofi, meus] = await Promise.all([
    fetch(REST+'data_packs?select=id,codigo,nome,descricao,oficial&oficial=is.true', {headers:h}).then(r=>r.json()).catch(()=>[]),
    token ? fetch(REST+'pack_users?select=pack_id,data_packs(id,codigo,nome,descricao,oficial)', {headers:h})
              .then(r=>r.json()).catch(()=>[]) : Promise.resolve([])
  ]);
  const out = (ofi||[]).slice();
  (meus||[]).forEach(m => { if(m.data_packs && !out.some(p=>p.id===m.data_packs.id)) out.push(m.data_packs); });
  return out;
}

window.RF_PACKS = { aplicar, usarPacote, meusPacotes, acharClube,
                    get oficial(){ return PACOTE_OFICIAL; } };
})();
