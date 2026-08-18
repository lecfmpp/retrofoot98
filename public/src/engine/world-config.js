/* ===================================================================
   CONFIGURAÇÃO DE MUNDO — a segunda folha ÚNICA compartilhada cliente ⇄ servidor.

   POR QUE ISTO EXISTE. O `world-rules.js` acabou com as duas versões das regras de CALENDÁRIO.
   Faltava o mesmo para as regras de PAÍS. Hoje elas estão escritas em três lugares:

     · `data/universos.js` descreve os 15 países (divisões, tamanho, acesso, rebaixamento) e o
       cliente já os usa por `setUniverse()`;
     · `resolve-round` tem DIV_ORDER / DIVISION_SIZE / DIVISION_PROMO / DIVISION_RELEG congelados
       no Brasil, com o comentário "Config brasileira (Resenha = sempre Brasil)";
     · `data/rebalance.js` e o `resolve-round` têm, CADA UM, um `BAND_BY_DIV` escrito à mão que
       traduz PL/CH/ES/ES2/... para as faixas A/B — e que só cobre seis países.

   Três cópias da mesma regra é exatamente o padrão que o cabeçalho do `world-rules.js` descreve
   como a causa dos bugs de calendário. Esta folha é o lugar único.

   A IDEIA CENTRAL: INDEXAR POR NÍVEL, NÃO PELA LETRA DA DIVISÃO.
   `A/B/C/D` são nomes brasileiros. O que a regra realmente quer saber é a PROFUNDIDADE na
   pirâmide — 1ª divisão, 2ª, 3ª. `UNIVERSOS[pais].order` já é essa lista, em ordem. Então:

       nivel = order.indexOf(divisao)        brasil: A=0 B=1 C=2 D=3   ·   Inglaterra: PL=0 CH=1

   Com isso o mapa escrito à mão desaparece e QUALQUER país novo — inclusive um criado no painel
   admin — funciona sem tocar em código. Para o Brasil o resultado é idêntico ao de hoje, e é
   isso que `scripts/teste-universos.mjs` prova.

   REGRA DE OURO (a mesma do world-rules.js): nada de S, CL, DATA, DOM ou qualquer global do
   jogo. `UNIVERSOS` é lido PREGUIÇOSAMENTE, dentro das funções — o painel admin carrega os
   arquivos em paralelo, e ler no topo criaria dependência de ordem de carga.

   PROPAGAÇÃO É AUTOMÁTICA: scripts/sync-world-rules.mjs injeta esta folha dentro do
   resolve-round entre marcadores, no build e no CI. Não há porte manual.
   =================================================================== */
(function(root){
  'use strict';

  const PADRAO='brasil';
  function universos(){ return root.UNIVERSOS || {}; }
  function uniCfg(key){ const U=universos(); return U[key] || U[PADRAO] || null; }
  /* chave do universo a partir do estado do jogo. `S.intlUniverse` é o campo que o save já
     guarda (core.js: activeUniverseKey) e que já viaja dentro do shared_state — ausente = Brasil,
     que é o que toda sala criada até agosto/2026 é. Retrocompatível por construção. */
  function uniDoEstado(S){ return (S && S.intlUniverse) || PADRAO; }

  /* ---------- NÍVEL NA PIRÂMIDE ---------- */
  function nivelDaDivisao(uniKey, div){
    const c=uniCfg(uniKey); if(!c || !c.order) return 0;
    const i=c.order.indexOf(div);
    return i<0 ? 0 : i;                       // divisão desconhecida conta como 1ª (nunca negativa)
  }
  function divisoesDe(uniKey){ const c=uniCfg(uniKey); return (c && c.order) ? c.order.slice() : ['A','B','C','D']; }
  function tamanhoDaDivisao(uniKey, div){ const c=uniCfg(uniKey); return (c && c.size && c.size[div]) || 20; }
  function sobemDaDivisao(uniKey, div){ const c=uniCfg(uniKey); return (c && c.promo && c.promo[div]) || 0; }
  function descemDaDivisao(uniKey, div){ const c=uniCfg(uniKey); return (c && c.releg && c.releg[div]) || 0; }

  /* ---------- TABELAS POR NÍVEL ----------
     Os valores são EXATAMENTE os que estavam escritos por letra: para o Brasil, nível 0 = 'A',
     1 = 'B', 2 = 'C', 3 = 'D'. Uma pirâmide mais funda que a tabela usa o último nível. */
  const BANDA_POR_NIVEL=['A','B','C','D'];
  const FORCA_POR_NIVEL=[[58,88],[58,80],[52,74],[48,68]];
  const CAP_POR_NIVEL=[99,37,24,12];
  function _porNivel(tab, n){ return tab[Math.max(0, Math.min(n, tab.length-1))]; }

  function bandaDaDivisao(uniKey, div){ return _porNivel(BANDA_POR_NIVEL, nivelDaDivisao(uniKey, div)); }
  function forcaDaDivisao(uniKey, div){ return _porNivel(FORCA_POR_NIVEL, nivelDaDivisao(uniKey, div)).slice(); }
  function capDaDivisao(uniKey, div){ return _porNivel(CAP_POR_NIVEL, nivelDaDivisao(uniKey, div)); }

  /* Tabelas prontas, com as LETRAS daquele país como chave. É o formato que o cliente e o
     servidor já consomem (`DIVISION_FORCE_RANGE[division]`), então ligar a folha não exige
     reescrever quem lê — só trocar de onde a tabela vem. */
  function tabelasDoUniverso(uniKey){
    const ordem=divisoesDe(uniKey);
    const size={}, promo={}, releg={}, forca={}, cap={}, banda={};
    ordem.forEach(d=>{
      size[d]=tamanhoDaDivisao(uniKey,d); promo[d]=sobemDaDivisao(uniKey,d); releg[d]=descemDaDivisao(uniKey,d);
      forca[d]=forcaDaDivisao(uniKey,d);  cap[d]=capDaDivisao(uniKey,d);     banda[d]=bandaDaDivisao(uniKey,d);
    });
    return { ordem, size, promo, releg, forca, cap, banda };
  }
  /* A banda de uma divisão SEM saber o país — é o que `rebalance.force(rawF, division)` tem em
     mãos. Procura a letra em todos os universos; se dois países usarem a mesma letra, o nível é o
     mesmo nos dois (é o que 'A'/'B' significam), então a ambiguidade não muda o resultado. */
  function bandaDaDivisaoSemPais(div){
    const U=universos();
    for(const k in U){ const o=U[k] && U[k].order; if(o && o.indexOf(div)>=0) return _porNivel(BANDA_POR_NIVEL, o.indexOf(div)); }
    return BANDA_POR_NIVEL[0];
  }

  const API={ PADRAO, uniCfg, uniDoEstado, nivelDaDivisao, divisoesDe,
    tamanhoDaDivisao, sobemDaDivisao, descemDaDivisao,
    BANDA_POR_NIVEL, FORCA_POR_NIVEL, CAP_POR_NIVEL,
    bandaDaDivisao, forcaDaDivisao, capDaDivisao, bandaDaDivisaoSemPais, tabelasDoUniverso };
  root.WORLD_CONFIG=API;
  if(typeof module!=='undefined' && module.exports){ module.exports=API; }
})(typeof globalThis!=='undefined'?globalThis:this);
