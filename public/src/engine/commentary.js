/* ===================================================================
   NARRAÇÃO AO VIVO — MODO CAMAROTE
   Transforma os EVENTOS REAIS do motor de partida (gol, chance, pênalti,
   cartão, lesão, substituição) em texto de locução em português, e dá o
   peso de cada acontecimento pra BARRA DE PRESSÃO.

   Nada aqui inventa fato: todo texto sai de um evento que o motor de fato
   gerou (mesmo evento que move o placar e a súmula). A única coisa
   sorteada é a REDAÇÃO — e o sorteio é determinístico (hash do seed da
   partida + minuto + lado), então os dois lados de um confronto
   humano×humano leem exatamente a mesma narração.

   Módulo puro: não usa S/CL/DATA. Só o que vem no ctx.
   =================================================================== */
(function(root){
  'use strict';

  /* FNV-1a + finalizador estilo murmur: sem o embaralhamento final, os BITS BAIXOS do FNV
     mudam muito pouco entre chaves parecidas ("…|18", "…|25", "…|32") — e como a escolha da
     frase é `hash % n`, a narração repetia a MESMA linha várias vezes seguidas. */
  function h32(){ let h=2166136261>>>0; const s=Array.prototype.join.call(arguments,'|');
    for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
    h^=h>>>16; h=Math.imul(h,2246822507); h^=h>>>13; h=Math.imul(h,3266489909); h^=h>>>16;
    return h>>>0; }
  /* `avoid` evita repetir a frase imediatamente anterior (as falas de ambiente entram de
     tempos em tempos; ler a mesma duas vezes seguidas quebra a ilusão da narração). */
  function pick(list,key,avoid){
    let v=list[h32(key)%list.length];
    for(let i=1;avoid && v===avoid && i<list.length;i++) v=list[h32(key,'#',i)%list.length];
    return v; }
  /* ===== AS QUATRO PALAVRAS QUE MUDAM COM QUEM JOGA =====
     O modulo e' puro de proposito -- nao le^ S nem CL -- entao quem chama passa `ctx.fem`. Sao
     poucas palavras, e estao aqui em vez de virem do RF_GENERO para que essa pureza continue
     valendo: commentary.js roda igual no cliente e em teste, sem globais montados. */
  const TERMO={
    goleiro:  ['goleiro','goleira'],
    atacante: ['atacante','atacante'],
    batedor:  ['batedor','batedora'],
    jogador:  ['jogador','jogadora'],
    reserva:  ['reserva','reserva'],
    titular:  ['titular','titular'],
  };
  function G_(chave,fem){ const par=TERMO[chave]; return par ? par[fem?1:0] : chave; }
  /* ARTIGO E TERMINACAO. Trocar so' o substantivo produzia "o goleira" e "{P} esta' expulso"
     no feminino -- o artigo e o adjetivo ficavam para tras. Em vez de escrever as frases duas
     vezes, elas ganham dois marcadores: {a} vira o artigo e {e}/{E} viram a terminacao. Assim
     'EXPULS{E}!' cobre expulso e expulsa, e a lista de frases continua sendo uma so'. */
  function art(fem){ return fem ? 'a' : 'o'; }
  function last(n,fem){ const p=String(n||'').trim().split(/\s+/); return p.length>1?p[p.length-1]:(p[0]||(art(fem)+' '+G_('jogador',fem))); }

  /* ---- desfecho de uma FINALIZAÇÃO que não virou gol ----
     O motor emite 'chance' (chutou, não fez) sem dizer se foi defesa, trave
     ou pra fora. Aqui isso é decidido de forma DETERMINÍSTICA a partir do
     próprio evento — e a narração e as estatísticas ("No alvo", "Defesas")
     leem o MESMO desfecho, então a tela nunca se contradiz. */
  function chanceOutcome(ev,seed){
    const r=(h32(seed,'ch',ev.min,ev.side,ev.scorer||'')%1000)/1000;
    if(r<0.46) return 'defesa';
    if(r<0.56) return 'trave';
    return 'fora';
  }

  /* ---- NOMES DE CLUBE ENTRAM SEM ARTIGO ----
     Gênero de nome de clube em português não dá pra deduzir do nome ("o Flamengo", mas
     "a Portuguesa", "a Chapecoense"), e o jogo tem 430 clubes de 16 países. Em vez de
     arriscar "GOL DO Portuguesa", as frases são escritas pra não precisar de artigo antes
     de {T}/{O}/{H}/{A} — construção que a locução esportiva usa o tempo todo
     ("Flamengo pressiona", "Portuguesa administra a vantagem"). */
  const GOL=[
    'GOL! {P} acha o canto e balança a rede.',
    'GOL DE {P}! Apareceu na hora certa e empurrou pra dentro.',
    'É GOL! {P} solta a bomba e não deu chance pro {K}.',
    'GOL! {P} cabeceia firme e a rede balança.',
    'GOL DE {P}! Recebeu livre na área e mandou pra dentro.',
    'GOL! {P} tabela, entra na área e finaliza no cantinho.'
  ];
  const GOL_VIRADA=[
    'VIRADA! {P} marca e {T} passa à frente.',
    'VIROU! Gol de {P} — {T} agora está na frente.'
  ];
  const GOL_EMPATE=[
    'EMPATOU! {P} aproveita a sobra e deixa tudo igual.',
    'GOL DE EMPATE! {P} não perdoa e {T} reage.'
  ];
  const PEN_GOL=[
    'PÊNALTI CONVERTIDO! {P} desloca {G} e marca.',
    'NA MARCA DA CAL: {P} bate com categoria e faz.',
    'GOL DE PÊNALTI! {P} escolhe o canto e {G} não alcança.'
  ];
  const PEN_DEF=[
    'DEFENDEU! {G} pega a cobrança de {P}.',
    'QUE DEFESA! {G} adivinha o canto e pega o pênalti de {P}.'
  ];
  const PEN_FORA=[
    '{P} manda a cobrança por cima do gol! Perdeu o pênalti.',
    'INCRÍVEL! {P} bate mal e a bola sai pela linha de fundo.'
  ];
  const PEN_TRAVE=[
    'NA TRAVE! {P} bate o pênalti e carimba o poste.',
    'INACREDITÁVEL! A cobrança de {P} explode na trave.'
  ];
  const CH_DEFESA=[
    'Que defesa! {G} espalma o chute de {P}.',
    '{G} salva! Chute forte de {P} no canto.',
    'Defendeu {G}! {P} chutou colocado e o {K} voou.',
    '{P} finaliza de primeira e {G} manda pra escanteio.'
  ];
  const CH_TRAVE=[
    '{P} carimba a trave! Quase o gol.',
    'NA TRAVE! {P} bate de fora e a bola volta em campo.',
    'Uh! {P} cabeceia no travessão.'
  ];
  const CH_FORA=[
    '{P} arrisca de fora e manda por cima.',
    '{P} chuta cruzado e a bola passa raspando a trave.',
    'Que perdida! {P} ficou cara a cara e mandou pra fora.',
    '{P} tenta o chute de canhota e joga pra fora.'
  ];
  const AMARELO=[
    'Amarelo pra {P} — chegou atrasad{e} na dividida.',
    'Cartão amarelo pra {P}, falta dura no meio-campo.',
    '{P} leva o amarelo por reclamação com o árbitro.',
    'Amarelo pra {P}: segurou o contra-ataque na falta.'
  ];
  const VERMELHO_DIR=[
    'EXPULS{E}! {P} vai direto pro vermelho — {T} fica com 10.',
    'VERMELHO DIRETO pra {P}! {T} joga com um a menos.'
  ];
  const VERMELHO_2A=[
    'SEGUNDO AMARELO e rua! {P} está expuls{e}, {T} fica com 10.',
    '{P} leva o segundo amarelo e é expuls{e}. Complicou o jogo de {T}.'
  ];
  const LESAO_GRAVE=[
    '{P} cai sentindo e pede substituição — não tem condições de seguir.',
    'Problema sério: {P} se machuca e sai de campo.'
  ];
  const LESAO_LEVE=[
    '{P} sente e recebe atendimento no gramado.',
    'Atendimento pra {P} à beira do campo.'
  ];
  const SUB=[
    'Mexe {T}: entra {P}, sai {S}.',
    'Substituição em {T} — {S} dá lugar a {P}.',
    'Troca em {T}: {P} entra no lugar de {S}.'
  ];

  const AMB_INICIO=[
    'Bola rolando! {H} recebe {A} com {N} pagantes na arquibancada.',
    'Começa o jogo! {H} × {A}, casa cheia com {N} torcedores.',
    'Apita o árbitro: {H} e {A} começam a partida diante de {N} pessoas.'
  ];
  const AMB_INTERVALO=['Fim do primeiro tempo: {H} {HG} × {AG} {A}.'];
  const AMB_RECOMECO=[
    'Recomeça a partida no segundo tempo.',
    'Times de volta pro segundo tempo.'
  ];
  const AMB_ACRESCIMOS=['Estamos nos acréscimos.'];
  const AMB_FIM=['Fim de jogo: {H} {HG} × {AG} {A}.'];
  /* transmissão do adversário caiu no meio: o placar da tela ainda não é o oficial
     (o servidor fecha a partida na virada da rodada) — não anuncia fim de jogo. */
  const AMB_CORTE=['Transmissão interrompida. O resultado oficial sai na classificação.'];

  /* falas de ambiente durante as fases mornas — SEMPRE derivadas do estado real
     (quem está pressionando pela barra de pressão, e o placar do momento). */
  const AMB_PRESS=[
    '{T} empilha ataques e {O} não consegue sair do campo de defesa.',
    'Pressão total de {T} — a bola vive no campo de {O}.',
    '{T} encurrala o adversário e {O} só se defende.',
    '{T} tomou conta do jogo e {O} recua as linhas.',
    'Escanteio atrás de escanteio: a defesa de {O} afasta como dá.',
    '{T} toca no campo de ataque e {O} corre atrás da bola.',
    'A torcida empurra {T}, que joga com todo mundo no ataque.'
  ];
  const AMB_EQUI=[
    'Jogo truncado no meio-campo, nenhum dos dois consegue engrenar.',
    'Partida equilibrada, as duas equipes se estudam.',
    'Muita disputa no meio e pouca chegada nas áreas.',
    'Ritmo cai e o jogo fica travado entre as intermediárias.',
    'Bola parada de um lado, bola parada do outro — jogo picotado.',
    'As duas equipes trocam passes na defesa, sem pressa.',
    'Faltas seguidas esfriam o ritmo da partida.',
    'Ninguém quer se expor: jogo de xadrez no meio-campo.'
  ];
  const AMB_PLACAR=[
    '{T} administra a vantagem e toca a bola com calma.',
    '{O} precisa se lançar ao ataque pra buscar o resultado.',
    '{T} segura o resultado e {O} se joga à frente.',
    'O tempo corre contra {O}, que empurra o time todo pra cima.'
  ];

  function fill(tpl,v){ return tpl.replace(/\{(\w+)\}/g,function(_,k){ return v[k]!=null?v[k]:''; }); }
  /* como `avoid` é o TEXTO já montado da última fala, a comparação tem que ser feita depois
     de preencher os nomes dos times — dois modelos diferentes podem gerar a mesma frase. */
  function pickAvoiding(list,key,avoid,vars){
    if(!avoid) return pick(list,key);
    for(let i=0;i<list.length;i++){ const t=list[h32(key,'#',i)%list.length];
      if(fill(t,vars)!==avoid) return t; }
    return pick(list,key);
  }

  /* ---- narração de UM evento do motor ----
     ev  : evento cru (type/side/min/scorer/player/...)
     ctx : { seed, hShort, aShort, gk:{H,A}, hg, ag, out }
     devolve { icon, text, kind } ou null. kind pinta a linha na tela. */
  function narrate(ev,ctx){
    if(!ev) return null;
    const mine=ev.side==='H', T=mine?ctx.hShort:ctx.aShort, O=mine?ctx.aShort:ctx.hShort;
    const fem=!!(ctx&&ctx.fem);
    const G=(ev.gk)||(mine?ctx.gk.A:ctx.gk.H)||(art(fem)+' '+G_('goleiro',fem));
    const key=[ctx.seed,ev.type,ev.min,ev.side].join('|');
    /* {K} e' a palavra 'goleiro' DENTRO das frases -- as duas que a citam ('nao deu chance pro
       {K}', 'o {K} voou') nao podiam ser resolvidas so' nos fallbacks. */
    const v={T:T,O:O,G:last(G,fem),K:G_('goleiro',fem),a:art(fem),e:art(fem),E:art(fem).toUpperCase()};
    if(ev.type==='gol'){
      v.P=ev.scorer||(art(fem)+' '+G_('atacante',fem));
      const hg=ctx.hg, ag=ctx.ag;
      const bank = (hg===ag) ? GOL_EMPATE : ((mine&&hg===ag+1&&ag>0)||(!mine&&ag===hg+1&&hg>0)) ? GOL_VIRADA : GOL;
      return {icon:'⚽', kind:'gol', text:fill(pick(bank,key),v)+' '+ctx.hShort+' '+hg+' × '+ag+' '+ctx.aShort+'.'};
    }
    if(ev.type==='penalti'){
      v.P=ev.scorer||(art(fem)+' '+G_('batedor',fem));
      if(ev.scored) return {icon:'⚽', kind:'gol', text:fill(pick(PEN_GOL,key),v)+' '+ctx.hShort+' '+ctx.hg+' × '+ctx.ag+' '+ctx.aShort+'.'};
      const o=ctx.out||'defesa';
      const bank = o==='trave'?PEN_TRAVE : o==='fora'?PEN_FORA : PEN_DEF;
      return {icon:o==='defesa'?'✋':'❌', kind:o==='defesa'?'defesa':'chance', text:fill(pick(bank,key),v)};
    }
    if(ev.type==='chance'){
      v.P=ev.scorer||(art(fem)+' '+G_('atacante',fem));
      const o=ctx.out||'fora';
      if(o==='defesa') return {icon:'✋', kind:'defesa', text:fill(pick(CH_DEFESA,key),v)};
      if(o==='trave')  return {icon:'◎', kind:'chance', text:fill(pick(CH_TRAVE,key),v)};
      return {icon:'◎', kind:'chance', text:fill(pick(CH_FORA,key),v)};
    }
    if(ev.type==='cartao'){
      v.P=ev.player||(art(fem)+' '+G_('jogador',fem));
      if(ev.cardType==='vermelho')
        return {icon:'🟥', kind:'cartao', text:fill(pick(ev.reason==='segundo amarelo'?VERMELHO_2A:VERMELHO_DIR,key),v)};
      return {icon:'🟨', kind:'cartao', text:fill(pick(AMARELO,key),v)};
    }
    if(ev.type==='lesao'){
      v.P=ev.player||(art(fem)+' '+G_('jogador',fem));
      return {icon:'✚', kind:'lesao', text:fill(pick(ev.severity==='grave'?LESAO_GRAVE:LESAO_LEVE,key),v)};
    }
    if(ev.type==='sub'){
      v.P=ev.player||(art(fem)+' '+G_('reserva',fem)); v.S=ev.out||(art(fem)+' '+G_('titular',fem));
      return {icon:'🔄', kind:'sub', text:fill(pick(SUB,key),v)};
    }
    return null;
  }

  /* ---- falas de ambiente (início, intervalo, acréscimos, fim, e a leitura
     do momento do jogo nas fases sem evento) ---- */
  function ambient(kind,ctx){
    const v={H:ctx.hShort, A:ctx.aShort, HG:ctx.hg, AG:ctx.ag, N:ctx.att||0};
    const key=[ctx.seed,'amb',kind,ctx.minute||0].join('|');
    if(kind==='inicio')     return {icon:'⏱', kind:'n', text:fill(pick(AMB_INICIO,key),v)};
    if(kind==='intervalo')  return {icon:'⏱', kind:'n', text:fill(pick(AMB_INTERVALO,key),v)};
    if(kind==='recomeco')   return {icon:'⏱', kind:'n', text:fill(pick(AMB_RECOMECO,key),v)};
    if(kind==='acrescimos') return {icon:'⏱', kind:'n', text:fill(pick(AMB_ACRESCIMOS,key),v)};
    if(kind==='fim')        return {icon:'⏱', kind:'n', text:fill(pick(AMB_FIM,key),v)};
    if(kind==='corte')      return {icon:'📡', kind:'lesao', text:fill(pick(AMB_CORTE,key),v)};
    if(kind==='momento'){
      const share=ctx.share!=null?ctx.share:50;              // 0..100, quanto do jogo é do mandante
      const diff=(ctx.hg||0)-(ctx.ag||0);
      const avoid=ctx.avoid||null;   // última fala de ambiente — não repete de cara
      if(share>=64 || share<=36){
        const home=share>=64, vv={T:home?ctx.hShort:ctx.aShort, O:home?ctx.aShort:ctx.hShort};
        return {icon:'•', kind:'n', text:fill(pickAvoiding(AMB_PRESS,key,avoid,vv),vv)};
      }
      if(diff!==0 && (ctx.minute||0)>=60){
        const lead=diff>0, vv={T:lead?ctx.hShort:ctx.aShort, O:lead?ctx.aShort:ctx.hShort};
        return {icon:'•', kind:'n', text:fill(pickAvoiding(AMB_PLACAR,key,avoid,vv),vv)};
      }
      return {icon:'•', kind:'n', text:fill(pickAvoiding(AMB_EQUI,key,avoid,v),v)};
    }
    return null;
  }

  /* ---- peso do evento na BARRA DE PRESSÃO (positivo = pro lado que fez) ----
     A barra é a leitura do momento do jogo: cada finalização/gol empurra a
     pressão pro lado de quem atacou, faltas e cartões empurram pro lado de
     quem sofreu, lesão custa um pouco pra quem perdeu o jogador. */
  function pressureOf(ev,outcome){
    if(!ev) return 0;
    const s=ev.side==='H'?1:-1;
    if(ev.type==='gol') return 34*s;
    if(ev.type==='penalti') return (ev.scored?30:18)*s;
    if(ev.type==='chance') return (outcome==='trave'?26:outcome==='defesa'?22:16)*s;
    if(ev.type==='cartao') return (ev.cardType==='vermelho'?14:7)*(-s); // falta de um => pressão do outro
    if(ev.type==='lesao') return 5*(-s);
    return 0;
  }

  const API={ narrate:narrate, ambient:ambient, chanceOutcome:chanceOutcome, pressureOf:pressureOf };
  if(typeof module!=='undefined' && module.exports){ module.exports=API; }
  root.RF_NARRA=API;
})(typeof globalThis!=='undefined'?globalThis:this);
