/* =====================================================================
   RetroFoot98 — ASSESSORIA DE IMPRENSA (a coletiva de CADA RODADA)

   O QUE EXISTIA. Uma coletiva só, na VIRADA DE TEMPORADA (openPressRoom),
   com cinco perguntas FIXAS escritas para o começo de ano ("qual a meta do
   clube para esta temporada?") e um único efeito: moral do elenco. Entre
   uma temporada e a seguinte — trinta e oito rodadas — a imprensa não
   existia, e nada do que o treinador dizia tinha que ver com o que tinha
   acabado de acontecer em campo.

   O QUE ESTE FICHEIRO ACRESCENTA. A coletiva de RODADA: duas perguntas
   montadas a partir dos FATOS da semana que fechou — o placar do último
   jogo, o jejum, o embalo, a posição na tabela, a proposta que chegou por
   um titular, o caixa no vermelho, a cadeira a tremer. Cada resposta mexe
   em três números que o jogo JÁ USA e mostra na tela:

     · moral do elenco  (p.moral, 0-100)  — alimenta o desempenho em campo
     · segurança no cargo (S.jobSecurity) — demissão abaixo de 15, sondagem acima de 80
     · reputação do treinador (S.coachRep) — a pílula "Reputação" do cabeçalho

   A reputação NUNCA era escrita por ninguém: nascia em 50 e ficava lá para
   sempre. A coletiva é o primeiro sítio que a move, e é o sítio certo —
   reputação é o que os outros pensam de si, e é na coletiva que se fala.

   FREQUÊNCIA. Uma coletiva a cada rodada seria ruído; uma por temporada é
   o que havia. A régua está em RF_PRESS_CFG e é diferente nos dois modos:

     · MODO SOLO    — de 3 em 3 rodadas, ou de 2 em 2 quando há um gatilho
                      (goleada, jejum, crise), até 8 por temporada, 30s por
                      pergunta.
     · MODO RESENHA — de 4 em 4 rodadas (de 3 em 3 com gatilho), até 5 por
                      temporada, 20s por pergunta. Menos vezes e mais curta
                      de propósito: na sala há gente à espera, e o relógio
                      da tela avança sozinho para ninguém prender a mesa.

   QUANDO APARECE. Depois da classificação de pós-rodada e ANTES de voltar
   ao clube (ver rfPressTentarRodada, chamada em clClassifContinue). Nunca
   na rodada 1 (a coletiva de temporada acabou de acontecer) nem com a
   temporada terminada (aí manda a sala de imprensa grande).

   ---------------------------------------------------------------------
   CONTRATO COM A TELA (para trocar o desenho sem tocar na mecânica)

   Este ficheiro NÃO desenha a coletiva — quem desenha é rfImprensaHTML, em
   rf26-competicao.js. Um desenho novo só precisa de honrar isto:

     ENTRADA  · CL._press = {
                  modo   : 'rodada' | undefined (undefined = fim de temporada)
                  step   : 'news' | 'qa' | 'fim'
                  qIdx   : índice da pergunta em curso
                  qs     : as perguntas desta coletiva (só no modo rodada)
                  answers: [{q,t,h,m,c,r}] o que já foi respondido
                  morale/cargo/rep : os somatórios até agora
                  fatos  : o resultado de rfPressFatos() (a pauta da semana)
                }
     LEITURA  · rfPressQs(P)          as perguntas certas nos dois modos
                rfPressEfeitoTxt(op)  o preço de uma opção, em português
                rfImPautaHTML(fatos)  as notícias da semana (coluna esquerda)
     ESCRITA  · pressAnswer(i)        responde (i = -1 é "não declarar nada")
                pressFinish()         fecha, aplica e devolve o jogador
     RELÓGIO  · CL._pressLeft é o contador, armado por armPressTimer()

   Nada mais deste ficheiro é chamado pela tela. Trocar rfImprensaHTML por
   outro desenho não exige mudar uma linha aqui.
   ===================================================================== */

/* A RÉGUA DOS DOIS MODOS. `intervalo` é o mínimo de rodadas entre coletivas
   de rotina; `intervaloGatilho` é o mínimo quando a semana traz um fato que
   pede microfone. `teto` é o máximo por temporada — o que impede uma
   sequência de gatilhos de virar coletiva toda semana. */
const RF_PRESS_CFG = {
  solo:    { intervalo:3, intervaloGatilho:2, teto:8, perguntas:2, segundos:30 },
  resenha: { intervalo:4, intervaloGatilho:3, teto:5, perguntas:2, segundos:20 },
};
function rfPressCfg(){
  return (typeof CL!=='undefined' && CL.online) ? RF_PRESS_CFG.resenha : RF_PRESS_CFG.solo;
}
/* O CARIMBO VIVE NA CARREIRA, NÃO NO MUNDO. Em sala de Resenha o S é estado
   PARTILHADO (produzido pelo anfitrião): um contador de coletivas do MEU
   clube guardado lá seria adotado por toda a gente. `pressState` entra em
   CAREER_KEYS (ver core.js) e viaja no assento, como o resto da carreira. */
function rfPressState(){
  if(typeof S==='undefined' || !S) return {season:0, ultima:-99, total:0};
  const temporada=S.season||0;
  if(!S.pressState || S.pressState.season!==temporada){
    S.pressState={ season:temporada, ultima:-99, total:0, ultimos:[] };
  }
  if(!Array.isArray(S.pressState.ultimos)) S.pressState.ultimos=[];
  return S.pressState;
}
function rfPressMarcar(temas){
  const st=rfPressState();
  st.ultima=(S.round||0); st.total=(st.total||0)+1;
  /* GUARDA OS TEMAS DA VEZ PASSADA. Duas semanas com a mesma pergunta fazem a
     coletiva parecer um formulário — e era exactamente o que a tela de antes
     era, com as mesmas cinco perguntas todas as temporadas. */
  st.ultimos=(temas||[]).map(t=>t&&t.id).filter(Boolean);
}

/* =====================================================================
   OS FATOS DA SEMANA
   Tudo o que as perguntas podem citar sai daqui, e sai do ESTADO — nenhuma
   pergunta inventa um facto. O que não se conseguir apurar vem nulo, e o
   tema que dependia dele simplesmente não entra no sorteio.
   ===================================================================== */
function rfPressFatos(){
  const f={ gatilhos:[] };
  if(typeof S==='undefined' || !S) return f;
  const meuId=(typeof CL!=='undefined'&&CL.clubId)||S.clubId;
  /* o fallback é um SUBSTANTIVO SEM ARTIGO: as frases já trazem o "do"/"contra o"
     à frente, e um "o adversário" aqui dava "diante do o adversário". */
  const curto=id=>{ const c=(typeof anyClubOf==='function'?anyClubOf(id):null)||(typeof clubOf==='function'?clubOf(id):null); return (c&&c.short)||'adversário'; };

  /* ---- os meus últimos jogos de liga, do mais recente para trás ---- */
  const meus=(S.results||[]).filter(r=>r && (r.h===meuId||r.a===meuId));
  const linha=meus.slice(-5).reverse().map(r=>{
    const casa=r.h===meuId;
    const gp=casa?r.hg:r.ag, gc=casa?r.ag:r.hg;
    return { gp, gc, casa, adv:curto(casa?r.a:r.h), rodada:r.round,
             res: gp>gc?'V' : gp<gc?'D' : 'E' };
  });
  f.ult=linha[0]||null;
  f.forma=linha.map(x=>x.res).join('');

  /* ---- tabela ---- */
  try{
    f.pos=(typeof tablePos==='function')?tablePos(meuId):null;
    const t=(typeof sortedTable==='function')?sortedTable():[];
    f.total=t.length||null;
    f.lider=t[0]?curto(t[0].id):null;
    f.souLider=!!(t[0]&&t[0].id===meuId);
    f.zona=(f.pos&&f.total)?(f.pos>f.total-4):false;
  }catch(e){}
  f.divisao=(typeof divisionLabel==='function')?divisionLabel():'';

  /* ---- próximo adversário (o jogo de liga da rodada que abre agora) ---- */
  try{
    const fx=((S.sched||[])[S.round]||[]).find(par=>par && (par[0]===meuId||par[1]===meuId));
    if(fx){ const outro=fx[0]===meuId?fx[1]:fx[0];
      f.prox={ id:outro, nome:curto(outro), casa:fx[0]===meuId,
               pos:(typeof tablePos==='function')?tablePos(outro):null }; }
  }catch(e){}

  /* ---- elenco, cargo e caixa ---- */
  const sq=(typeof squad==='function')?(squad(meuId)||[]):[];
  f.moralMedia = sq.length ? Math.round(sq.reduce((s,p)=>s+(p.moral==null?70:p.moral),0)/sq.length) : 70;
  f.seg = (S.jobSecurity!=null)?S.jobSecurity:60;
  f.rep = (S.coachRep!=null)?S.coachRep:50;
  f.caixa = S.budget||0;

  /* destaque: quem mais marcou pelo meu clube nesta temporada */
  try{
    let melhor=null;
    sq.forEach(p=>{ const g=(S.scorers&&S.scorers[p.n])||0; if(g>0 && (!melhor||g>melhor.gols)) melhor={nome:p.n, gols:g, pid:p.pid}; });
    f.destaque=melhor;
  }catch(e){}

  /* proposta viva por um jogador meu — o fato mais concreto que a semana pode trazer */
  try{
    const ofs=(typeof myIncomingOffers==='function')?myIncomingOffers():[];
    if(ofs && ofs.length){ const o=ofs[0];
      f.proposta={ jogador:o.playerName, valor:o.fee, clube:curto(o.buyerId)||o.buyerName }; }
  }catch(e){}

  /* ---- OS GATILHOS: o que, nesta semana, pede microfone ---- */
  const g=f.gatilhos;
  if(f.ult && f.ult.res==='D' && (f.ult.gc-f.ult.gp)>=3) g.push('goleada-sofrida');
  if(f.ult && f.ult.res==='V' && (f.ult.gp-f.ult.gc)>=3) g.push('goleada-aplicada');
  if(f.forma.slice(0,3)==='DDD' || (f.forma.length>=4 && f.forma.slice(0,4).indexOf('V')<0)) g.push('jejum');
  if(f.forma.slice(0,3)==='VVV') g.push('embalo');
  if(f.seg<30) g.push('cargo-risco');
  if(f.caixa<0) g.push('caixa');
  if(f.proposta) g.push('proposta');
  if(f.souLider) g.push('lider');
  else if(f.zona) g.push('zona');
  if(f.moralMedia<55) g.push('vestiario');
  return f;
}

/* =====================================================================
   OS TEMAS
   Cada tema é uma pergunta que só existe quando o fato existe (`quando`), e
   três respostas com o preço à vista. Os números são pequenos de propósito:
   uma coletiva INCLINA a temporada, não a decide.

     m = moral do elenco (todos os jogadores)   c = segurança no cargo
     r = reputação do treinador                 h = a manchete que sai
   ===================================================================== */
const RF_PRESS_TEMAS = [
{ id:'goleada-sofrida', gatilho:'goleada-sofrida',
  quando:f=>!!f.ult,
  q:f=>`Goleada por ${f.ult.gc}×${f.ult.gp} diante do ${f.ult.adv}. O que explica um resultado desses?`,
  opts:f=>[
    { t:'A culpa é minha. Errei na preparação.',            m:+5, c:-4, r:+1, h:'Treinador assume a goleada: "o erro foi meu"' },
    { t:'Faltou vergonha na cara de alguns.',               m:-6, c:+2, r:-1, h:'Treinador dispara contra o elenco após goleada' },
    { t:'Foi um dia ruim. Não se joga assim toda semana.',  m:+1, c:-1, r: 0, h:'"Foi um dia ruim", minimiza o treinador' } ] },

{ id:'goleada-aplicada', gatilho:'goleada-aplicada',
  quando:f=>!!f.ult,
  q:f=>`${f.ult.gp}×${f.ult.gc} no ${f.ult.adv}. O time achou o caminho?`,
  opts:f=>[
    { t:'O mérito é dos jogadores, do primeiro ao último.', m:+5, c: 0, r:+1, h:'Técnico credita goleada ao elenco' },
    { t:'É o trabalho da comissão aparecendo.',             m:-2, c:+3, r:+2, h:'Treinador puxa para si o crédito da goleada' },
    { t:'Uma goleada não ganha nada. Segue o jogo.',        m:+1, c:+1, r:+1, h:'Discurso pé no chão depois da goleada' } ] },

{ id:'jejum', gatilho:'jejum',
  quando:f=>!!f.forma,
  q:f=>`São ${Math.min(5,f.forma.length)} jogos sem vencer. Até quando a diretoria deve ter paciência?`,
  opts:f=>[
    { t:'Respondo por isso. Se for para cair, caio eu.',    m:+6, c:-3, r:+2, h:'Treinador põe o cargo à frente do elenco' },
    { t:'O elenco não é o que eu pedi.',                    m:-6, c:-5, r:-2, h:'Técnico expõe o elenco e cobra reforços' },
    { t:'Não vou dar prazo a ninguém. Vamos trabalhar.',    m: 0, c:+2, r: 0, h:'"Sem prazos", diz o treinador sobre o jejum' } ] },

{ id:'embalo', gatilho:'embalo',
  quando:f=>!!f.forma,
  q:f=>`Três vitórias seguidas. Dá para sonhar mais alto?`,
  opts:f=>[
    { t:'Sim. Vamos brigar por tudo o que estiver em jogo.',m:+4, c:+4, r:+3, h:'Promessa ousada depois da terceira vitória seguida' },
    { t:'Uma partida de cada vez. Sem promessa vazia.',     m:+2, c:+1, r:+1, h:'Treinador segura a euforia' },
    { t:'A sequência esconde problemas que eu vejo.',       m:-4, c: 0, r: 0, h:'Técnico esfria o embalo e aponta problemas' } ] },

{ id:'cargo-risco', gatilho:'cargo-risco',
  quando:f=>true,
  q:f=>`Trabalham-se os bastidores de uma demissão. Você se sente ameaçado?`,
  opts:f=>[
    { t:'Trabalho sob pressão desde sempre. Sigo firme.',   m:+2, c:+4, r:+2, h:'Treinador rebate boatos de demissão' },
    { t:'Quem decide é a diretoria. Não é comigo.',         m:-1, c:-3, r:-2, h:'"Quem decide é a diretoria", desconversa o treinador' },
    { t:'Se quiserem me tirar, que tirem hoje.',            m:+4, c:-6, r:+1, h:'Treinador desafia a diretoria em coletiva tensa' } ] },

{ id:'caixa', gatilho:'caixa',
  quando:f=>true,
  q:f=>`O clube fechou a semana com o caixa no vermelho. Isso chega ao campo?`,
  opts:f=>[
    { t:'O grupo não pode pagar por conta de gestão.',      m:+5, c:-5, r:+1, h:'Treinador defende elenco e alfineta a gestão' },
    { t:'Vamos vender quem estiver sobrando.',              m:-4, c:+5, r: 0, h:'Técnico admite vendas para equilibrar o caixa' },
    { t:'Dinheiro é assunto da diretoria. Falo de futebol.',m: 0, c:+1, r:+1, h:'Treinador desvia de pergunta sobre finanças' } ] },

{ id:'proposta', gatilho:'proposta',
  quando:f=>!!f.proposta,
  q:f=>`Chegou proposta do ${f.proposta.clube} por ${f.proposta.jogador}. Ele fica?`,
  opts:f=>[
    { t:'Ele fica. Não abro mão de peça nenhuma.',          m:+5, c:-4, r:+1, h:'Treinador crava permanência de titular' },
    { t:'Todo mundo tem preço. É com a diretoria.',         m:-4, c:+4, r: 0, h:'"Todo mundo tem preço", diz o treinador' },
    { t:'Não comento negociação em andamento.',             m: 0, c: 0, r:+1, h:'Treinador evita falar de proposta' } ] },

{ id:'lider', gatilho:'lider',
  quando:f=>true,
  q:f=>`Líder da ${f.divisao||'competição'}. O time é favorito ao título?`,
  opts:f=>[
    { t:'Somos, sim. E vamos assumir esse peso.',           m:+3, c:+5, r:+3, h:'Treinador assume favoritismo na liderança' },
    { t:'Liderança de agora não vale taça nenhuma.',        m:+1, c: 0, r:+1, h:'Líder, treinador pede pé no chão' },
    { t:'Favorito é quem gasta mais. Não somos nós.',       m:-2, c:-2, r: 0, h:'Treinador foge do favoritismo mesmo na ponta' } ] },

{ id:'zona', gatilho:'zona',
  quando:f=>!!f.pos,
  q:f=>`${f.pos}º colocado, dentro da zona de queda. O que dizer à torcida?`,
  opts:f=>[
    { t:'Não vamos cair. Assumo o compromisso.',            m:+5, c:+3, r:+2, h:'Treinador promete permanência à torcida' },
    { t:'A tabela é dura, mas o elenco reage.',             m:+2, c: 0, r: 0, h:'Treinador aposta na reação do grupo' },
    { t:'Sendo realista, o time é o que é.',                m:-5, c:-4, r:-2, h:'"O time é o que é", desabafa o treinador' } ] },

{ id:'vestiario', gatilho:'vestiario',
  quando:f=>true,
  q:f=>`Fala-se em clima ruim no vestiário. Procede?`,
  opts:f=>[
    { t:'Vestiário é assunto interno. Ponto final.',        m:+4, c: 0, r:+1, h:'Treinador fecha o vestiário à imprensa' },
    { t:'Existe insatisfação, sim, e vou resolver.',        m:-3, c:+2, r: 0, h:'Técnico admite insatisfação no elenco' },
    { t:'Quem não estiver feliz pode procurar outro clube.',m:-6, c:+4, r:-1, h:'Ultimato público: "quem não estiver feliz, procure outro clube"' } ] },

/* ---- os de rotina: sempre disponíveis, entram quando não há gatilho ---- */
{ id:'proximo', rotina:true,
  quando:f=>!!f.prox,
  q:f=>`${f.prox.casa?'Em casa contra o':'Fora, diante do'} ${f.prox.nome}${f.prox.pos?' ('+f.prox.pos+'º)':''}. Como encara o jogo?`,
  opts:f=>[
    { t:'Vamos impor o nosso jogo, seja onde for.',         m:+3, c:+1, r:+1, h:'Treinador promete jogo ofensivo na rodada' },
    { t:'Adversário forte. Vamos sofrer e é normal.',       m:-3, c:-1, r: 0, h:'Técnico já prepara o terreno para dificuldades' },
    { t:'Não comento adversário. Foco no nosso trabalho.',  m: 0, c: 0, r: 0, h:'Treinador desconversa sobre o próximo rival' } ] },

{ id:'destaque', rotina:true,
  quando:f=>!!f.destaque,
  q:f=>`${f.destaque.nome} chegou a ${f.destaque.gols} gol${f.destaque.gols===1?'':'s'} na temporada. É o nome do time?`,
  opts:f=>[
    { t:'É o nosso melhor jogador, e digo sem medo.',       m:+2, c: 0, r:+1, h:'Treinador eleva '+ (f.destaque?f.destaque.nome:'') +' a nome do time' },
    { t:'Ele marca porque os outros dez trabalham.',        m:+4, c: 0, r:+1, h:'Técnico divide os méritos do artilheiro com o grupo' },
    { t:'Pode render muito mais do que está rendendo.',     m:-3, c:+2, r: 0, h:'Cobrança pública ao artilheiro do time' } ] },

{ id:'torcida', rotina:true,
  quando:f=>true,
  q:f=>`Um recado para a torcida antes da próxima rodada?`,
  opts:f=>[
    { t:'A torcida é o nosso décimo segundo jogador.',      m:+3, c:+1, r:+1, h:'Aceno à arquibancada: "vocês são o 12º jogador"' },
    { t:'Peço paciência. O trabalho vai dar resultado.',    m:+1, c:-1, r: 0, h:'Treinador pede paciência à torcida' },
    { t:'A cobrança excessiva às vezes atrapalha o time.',  m:-4, c:-2, r:-1, h:'Polêmica: treinador reclama da cobrança da torcida' } ] },

{ id:'trabalho', rotina:true,
  quando:f=>true,
  q:f=>`Depois de ${(typeof S!=='undefined'&&S.round)||0} rodadas, o que já dá para dizer do seu trabalho?`,
  opts:f=>[
    { t:'O time já tem cara. O resto vem com o tempo.',     m:+3, c:+1, r:+1, h:'"O time já tem cara", avalia o treinador' },
    { t:'Estamos abaixo do que eu esperava.',               m:-3, c:-2, r: 0, h:'Treinador se diz insatisfeito com o próprio trabalho' },
    { t:'Julguem no fim da temporada, não agora.',          m: 0, c:+2, r:+1, h:'Treinador pede que o julguem no fim da temporada' } ] },
];

/* MONTA A COLETIVA. Primeiro os temas com gatilho (na ordem em que a semana os
   produziu), depois os de rotina para completar. Nunca repete o tema que abriu
   a coletiva anterior — duas semanas seguidas com a mesma pergunta soa a
   formulário, e é justamente o que esta tela deixou de ser. */
function rfPressPerguntas(fatos){
  const f=fatos||rfPressFatos();
  const cfg=rfPressCfg();
  const st=rfPressState();
  const repetidos=st.ultimos||[];
  const vistos={};
  const escolhidos=[];
  /* DUAS PASSAGENS. Na primeira, nenhum tema da coletiva anterior entra; na
     segunda (só se faltarem perguntas) a regra afrouxa, porque uma coletiva
     com uma pergunta repetida é melhor do que uma coletiva vazia. */
  const cabe=(t,livre)=>{
    if(!t || vistos[t.id]) return false;
    if(!livre && repetidos.indexOf(t.id)>=0) return false;
    try{ if(t.quando && !t.quando(f)) return false; }catch(e){ return false; }
    return true;
  };
  const juntar=(t,livre)=>{ if(!cabe(t,livre)) return; vistos[t.id]=true; escolhidos.push(t); };

  /* OS DE ROTINA GIRAM. Sem isto entravam sempre pela mesma ordem, e a segunda
     pergunta era a mesma o ano inteiro: a lista roda pelo número de coletivas
     já dadas nesta temporada. */
  const rotina=RF_PRESS_TEMAS.filter(t=>t.rotina);
  const giro=rotina.length?((st.total||0)%rotina.length):0;
  const rodados=rotina.slice(giro).concat(rotina.slice(0,giro));

  [false,true].forEach(livre=>{
    (f.gatilhos||[]).forEach(g=>{
      if(escolhidos.length>=cfg.perguntas) return;
      juntar(RF_PRESS_TEMAS.find(t=>t.gatilho===g), livre);
    });
    rodados.forEach(t=>{
      if(escolhidos.length>=cfg.perguntas) return;
      juntar(t, livre);
    });
  });

  return escolhidos.map(t=>{
    let q='', opts=[];
    try{ q=t.q(f); opts=t.opts(f)||[]; }catch(e){ return null; }
    return q&&opts.length ? { id:t.id, q, opts } : null;
  }).filter(Boolean);
}

/* =====================================================================
   A REGRA DE APARIÇÃO
   Devolve {sim, fatos, motivo}. Só diz sim quando a rodada fechou, a
   temporada continua, e a régua do modo (RF_PRESS_CFG) deixa.
   ===================================================================== */
function rfPressDevida(){
  if(typeof S==='undefined' || !S) return {sim:false};
  if(S.finished) return {sim:false};                       // fim de temporada tem a sala de imprensa grande
  if(typeof CL!=='undefined' && CL.unemployed) return {sim:false};
  /* SEMANA DE DEMISSÃO OU DE CONVITE NÃO TEM COLETIVA. checkManagerJobEvent deixa
     o evento pendente no fim da rodada e o modal dele abre a seguir: dar uma
     entrevista sobre a próxima partida entre o apito e o "você está demitido"
     seria a coletiva a falar de um emprego que já acabou. */
  if(typeof CL!=='undefined' && CL._pendingManagerEvent) return {sim:false};
  const r=S.round||0;
  if(r<2) return {sim:false};                              // a coletiva de temporada acabou de acontecer
  const cfg=rfPressCfg(), st=rfPressState();
  if(st.ultima===r) return {sim:false};                    // já houve coletiva nesta rodada
  if((st.total||0)>=cfg.teto) return {sim:false};          // teto da temporada
  const fatos=rfPressFatos();
  const desde=r-(st.ultima!=null?st.ultima:-99);
  const temGatilho=(fatos.gatilhos||[]).length>0;
  if(temGatilho && desde>=cfg.intervaloGatilho) return {sim:true, fatos, motivo:fatos.gatilhos[0]};
  if(desde>=cfg.intervalo) return {sim:true, fatos, motivo:'rotina'};
  return {sim:false};
}

/* ABRE A COLETIVA DE RODADA. Devolve true quando tomou conta da tela — quem
   chama (o fim do pós-rodada) usa isso para NÃO seguir para o clube, e a
   própria coletiva chama o `depois` quando acaba. Devolver false é o caso
   normal: na maioria das rodadas não há coletiva, e o fluxo segue igual. */
function rfPressTentarRodada(depois){
  try{
    if(typeof CL==='undefined') return false;
    if(CL.screen==='imprensa') return false;               // já estamos numa
    const d=rfPressDevida();
    if(!d.sim) return false;
    const qs=rfPressPerguntas(d.fatos);
    if(!qs.length) return false;
    rfPressMarcar(qs);
    CL._press={ modo:'rodada', step:'qa', qIdx:0, qs, answers:[],
                morale:0, cargo:0, rep:0, fatos:d.fatos, motivo:d.motivo,
                b:null, depois:(typeof depois==='function')?depois:null };
    CL.screen='imprensa';
    cdraw();
    if(typeof armPressTimer==='function') armPressTimer();
    return true;
  }catch(e){ console.warn('coletiva da rodada:', e&&e.message); return false; }
}

/* as perguntas da coletiva em curso: as da rodada, ou as fixas de temporada */
function rfPressQs(P){
  P=P||(typeof CL!=='undefined'?CL._press:null);
  if(P && P.qs && P.qs.length) return P.qs;
  return (typeof PRESS_QUESTIONS!=='undefined')?PRESS_QUESTIONS:[];
}

/* ===== O QUE A COLETIVA MEXE =====
   Um sítio só, para os dois modos. Tetos de segurança por coletiva: nem a
   melhor entrevista salva uma temporada, nem a pior a enterra.
   `_netMorale` é o que faz a moral sobreviver na Resenha — aplicar só no
   cliente seria desfeito na adoção da rodada seguinte (mesma razão do
   pressFinish de sempre). */
function rfPressAplicar(P){
  if(!P || typeof S==='undefined' || !S) return {moral:0, cargo:0, rep:0};
  const lim=(v,a,b)=>Math.max(a,Math.min(b,v));
  const dMoral=lim(Math.round(P.morale||0), -12, 12);
  const dCargo=lim(Math.round(P.cargo||0),  -12, 12);
  const dRep  =lim(Math.round(P.rep||0),     -6,  6);
  const meuId=(typeof CL!=='undefined'&&CL.clubId)||S.clubId;

  if(dMoral){
    try{
      const sq=(typeof squad==='function')?(squad(meuId)||[]):[];
      sq.forEach(p=>{ p.moral=lim((p.moral==null?70:p.moral)+dMoral, 0, 100); });
      if(typeof CL!=='undefined' && CL.online) S._netMorale=(S._netMorale||0)+dMoral;
    }catch(e){ console.warn('moral da coletiva:', e&&e.message); }
  }
  if(dCargo) S.jobSecurity=lim((S.jobSecurity==null?60:S.jobSecurity)+dCargo, 0, 100);
  if(dRep)   S.coachRep   =lim((S.coachRep==null?50:S.coachRep)+dRep, 0, 100);

  /* a coletiva vira NOTÍCIA DA RODADA: sem isto, o efeito acontecia e nada na
     tela dizia por quê. Uma linha por manchete publicada, mais o resumo. */
  S.roundNews=S.roundNews||[];
  (P.answers||[]).forEach(a=>{ if(a && a.h) S.roundNews.push('🎙️ '+a.h+'.'); });
  const partes=[];
  if(dMoral) partes.push('moral do elenco '+(dMoral>0?'+':'')+dMoral);
  if(dCargo) partes.push('segurança no cargo '+(dCargo>0?'+':'')+dCargo+' (agora '+S.jobSecurity+'/100)');
  if(dRep)   partes.push('reputação '+(dRep>0?'+':'')+dRep+' (agora '+S.coachRep+'/100)');
  if(partes.length) S.roundNews.push('🎙️ Repercussão da coletiva: '+partes.join(' · ')+'.');

  try{ if(typeof persistCareer==='function') persistCareer(); }catch(e){}
  try{ if(typeof rfGravar==='function') rfGravar(); else if(typeof saveV3==='function') saveV3(); }catch(e){}
  return { moral:dMoral, cargo:dCargo, rep:dRep };
}

/* =====================================================================
   A PAUTA DA SEMANA (coluna da esquerda da coletiva de rodada)
   As mesmas notícias que a sala de imprensa de fim de temporada desenha
   (rfImNoticia, em rf26-competicao.js), só que sobre a semana que fechou:
   o placar, a sequência, a tabela, e o assunto que trouxe os jornalistas.
   É o CONTEXTO da pergunta — sem ele a coletiva parecia um formulário.
   ===================================================================== */
function rfImPautaHTML(f){
  if(!f || typeof rfImNoticia!=='function') return '';
  const meu=(typeof clubOf==='function')?clubOf((typeof CL!=='undefined'&&CL.clubId)||S.clubId):null;
  const jornal=(meu&&meu.n)?('Diário de '+meu.n):'Diário do Clube';
  const out=[];
  if(f.ult){
    const placar=f.ult.gp+'×'+f.ult.gc+' '+(f.ult.casa?'em casa':'fora')+', contra o '+f.ult.adv;
    const titulo=f.ult.res==='V' ? ((meu&&meu.short)||'O time')+' vence e respira'
               : f.ult.res==='D' ? ((meu&&meu.short)||'O time')+' perde e a pressão sobe'
               : 'Empate deixa gosto de pouco';
    out.push(rfImNoticia('Rodada', jornal+' · hoje', titulo, placar, true));
  }
  if(f.forma && f.forma.length>=3){
    const v=(f.forma.match(/V/g)||[]).length, e=(f.forma.match(/E/g)||[]).length, d=(f.forma.match(/D/g)||[]).length;
    out.push(rfImNoticia('Sequência','Boletim estatístico · hoje',
      'Últimos '+f.forma.length+' jogos: '+f.forma.split('').join(' '),
      v+' vitória'+(v===1?'':'s')+' · '+e+' empate'+(e===1?'':'s')+' · '+d+' derrota'+(d===1?'':'s')));
  }
  if(f.pos && f.total){
    out.push(rfImNoticia('Tabela','Rádio Esportiva · agora',
      f.pos+'º na '+(f.divisao||'competição')+(f.total?' entre '+f.total+' clubes':''),
      f.souLider ? 'Na ponta da tabela.'
        : (f.lider? ('Líder: '+f.lider+'.') : '') + (f.zona? ' Dentro da zona de rebaixamento.' : '')));
  }
  if(f.proposta){
    out.push(rfImNoticia('Mercado','Coluna do mercado · ontem',
      f.proposta.clube+' faz proposta por '+f.proposta.jogador,
      'A negociação está na mesa da diretoria.'));
  }
  if(f.prox){
    out.push(rfImNoticia('Próxima','Pauta da semana · amanhã',
      (f.prox.casa?'Em casa contra o ':'Fora, diante do ')+f.prox.nome,
      f.prox.pos?(f.prox.nome+' é o '+f.prox.pos+'º colocado.'):''));
  }
  return out.join('');
}

/* o texto que cada resposta mostra ANTES do clique — a escolha é informada,
   nunca adivinhada. Aceita tanto a opção nova (m/c/r) como a antiga (só m). */
function rfPressEfeitoTxt(o){
  if(!o) return '';
  const p=[];
  if(o.m) p.push('moral do elenco '+(o.m>0?'+':'−')+Math.abs(o.m));
  if(o.c) p.push('cargo '+(o.c>0?'+':'−')+Math.abs(o.c));
  if(o.r) p.push('reputação '+(o.r>0?'+':'−')+Math.abs(o.r));
  return p.length?p.join(' · '):'sem efeito, sem risco';
}
