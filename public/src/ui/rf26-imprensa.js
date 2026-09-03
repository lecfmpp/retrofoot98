/* =====================================================================
   RetroFoot98 — ASSESSORIA DE IMPRENSA · ENTREVISTA PÓS-JOGO

   O QUE EXISTIA. Uma coletiva só, na VIRADA DE TEMPORADA (openPressRoom),
   com cinco perguntas FIXAS escritas para o começo de ano ("qual a meta do
   clube para esta temporada?") e um único efeito: moral do elenco. Entre
   uma temporada e a seguinte — trinta e oito rodadas — a imprensa não
   existia, e nada do que o treinador dizia tinha que ver com o que tinha
   acabado de acontecer em campo.

   O QUE ESTE FICHEIRO É. A entrevista pós-jogo do handoff de design
   "Modal - Entrevista Pos-Jogo": TRÊS perguntas — uma sobre O JOGO, uma
   sobre O ELENCO, uma sobre O CLUBE —, cada uma com três respostas de tom
   declarado, e cada resposta movendo na hora as duas barras de destaque
   (moral do time e segurança no cargo) mais a repercussão de imprensa e
   torcida. Aqui moram as perguntas, os fatos que as montam e as contas; o
   desenho está em rfEntrevistaHTML, no fim do ficheiro.

   AS PERGUNTAS SAEM DO JOGO, NÃO DE UMA LISTA. Cada tema só existe quando
   o fato existe: a goleada que acabou de acontecer, o jejum, o embalo, a
   proposta que chegou por um titular, o caixa no vermelho, a cadeira a
   tremer. É por isso que a pergunta cita o placar e o nome do adversário —
   quem responde está a falar da SUA semana.

   O QUE UMA RESPOSTA MEXE (os três números que o jogo já usa e mostra):
     · moral do elenco    (p.moral, 0-100)  — alimenta o desempenho em campo
     · segurança no cargo (S.jobSecurity)   — demissão abaixo de 15, sondagem acima de 80
     · reputação          (S.coachRep)      — a pílula "Reputação" do cabeçalho

   As duas primeiras são as BARRAS do design. A reputação é o terceiro chip
   da resposta e uma linha do cartão do treinador: nunca tinha sido escrita
   por ninguém — nascia em 50 e ficava lá —, e é na coletiva que se ganha ou
   se perde o que os outros pensam de si.

   FREQUÊNCIA. Uma coletiva por rodada seria ruído; uma por temporada é o
   que havia. A régua está em RF_PRESS_CFG:

     · MODO SOLO    — de 3 em 3 rodadas, ou de 2 em 2 quando há um gatilho
                      (goleada, jejum, crise), até 8 por temporada.
     · MODO RESENHA — de 4 em 4 rodadas (3 com gatilho), até 5 por temporada.

   QUANDO APARECE. Depois da classificação de pós-rodada, já com a rodada
   reaberta para a sala (ver posRodadaFim em main.js) — a entrevista de um
   treinador nunca segura a mesa dos outros. Nunca na 1ª rodada (a coletiva
   de temporada acabou de acontecer), nem com a temporada fechada, nem na
   semana de demissão.

   ---------------------------------------------------------------------
   CONTRATO (para quem mexer no desenho ou na mecânica)

     ESTADO   · CL._press = {
                  modo   : 'rodada' | undefined (undefined = fim de temporada)
                  step   : 'news' | 'qa' | 'fim'
                  qIdx   : índice da pergunta em curso
                  qs     : as perguntas desta coletiva (só no modo rodada)
                  answers: [{q,t,h,m,c,r,imprensa,torcida}] o já respondido
                  morale/cargo/rep : os somatórios até agora
                  fatos  : rfPressFatos() — a semana em números
                  reporter, base : o repórter e os valores de partida
                }
     LEITURA  · rfPressQs(P)            as perguntas certas nos dois modos
                rfPressEfeitoTxt(op)    o preço de uma opção, em português
                rfEntrevistaHTML(P)     a tela da entrevista pós-jogo
     ESCRITA  · pressAnswer(i)          responde (i = -1 é "não declarar nada")
                rfPressPular()          pula o resto sem aplicar mais deltas
                pressFinish()           fecha, aplica e devolve o jogador
   ===================================================================== */

/* A RÉGUA DOS DOIS MODOS. `intervalo` é o mínimo de rodadas entre coletivas
   de rotina; `intervaloGatilho` é o mínimo quando a semana traz um fato que
   pede microfone. `teto` é o máximo por temporada — o que impede uma
   sequência de gatilhos de virar coletiva toda semana. */
const RF_PRESS_CFG = {
  solo:    { intervalo:3, intervaloGatilho:2, teto:8, perguntas:3 },
  resenha: { intervalo:4, intervaloGatilho:3, teto:5, perguntas:3 },
};
function rfPressCfg(){
  return (typeof CL!=='undefined' && CL.online) ? RF_PRESS_CFG.resenha : RF_PRESS_CFG.solo;
}
/* O CARIMBO VIVE NA CARREIRA, NÃO NO MUNDO. Em sala de Resenha o S é estado
   PARTILHADO (produzido pelo anfitrião): um contador de coletivas do MEU
   clube guardado lá seria adotado por toda a gente. `pressState` entra em
   CAREER_KEYS (ver core.js) e viaja no assento, como o resto da carreira. */
function rfPressState(){
  if(typeof S==='undefined' || !S) return {season:0, ultima:-99, total:0, ultimos:[]};
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
  f.meuId=meuId;
  f.clube=curto(meuId);

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
  f.jogos=meus.length;
  if(f.ult){
    /* o placar como o cabeçalho do design o escreve: XV 2 × 1 CIANORTE */
    f.placar=f.ult.casa ? (f.clube+' '+f.ult.gp+' × '+f.ult.gc+' '+f.ult.adv)
                        : (f.ult.adv+' '+f.ult.gc+' × '+f.ult.gp+' '+f.clube);
  }

  /* ---- tabela ---- */
  try{
    f.pos=(typeof tablePos==='function')?tablePos(meuId):null;
    const t=(typeof sortedTable==='function')?sortedTable():[];
    f.total=t.length||null;
    f.lider=t[0]?curto(t[0].id):null;
    f.souLider=!!(t[0]&&t[0].id===meuId);
    f.zona=(f.pos&&f.total)?(f.pos>f.total-4):false;
    const meu=(S.table||{})[meuId];
    if(meu){
      const j=(meu.W||0)+(meu.D||0)+(meu.L||0);
      f.pontos=meu.Pts||0;
      f.aproveitamento=j?Math.round(((meu.W||0)*3+(meu.D||0))/(j*3)*100):null;
    }
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

  /* os dois jogadores que a coletiva pode citar: o que mais marcou e o de
     maior força (o "camisa 10" do design, quando ainda ninguém marcou) */
  try{
    let melhor=null, craque=null;
    sq.forEach(p=>{
      const g=(S.scorers&&S.scorers[p.n])||0;
      if(g>0 && (!melhor||g>melhor.gols)) melhor={nome:p.n, gols:g, pid:p.pid};
      if(!craque || (p.f||0)>(craque.f||0)) craque={nome:p.n, f:p.f||0, pid:p.pid, moral:(p.moral==null?70:p.moral)};
    });
    f.destaque=melhor; f.craque=craque;
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

/* ===== O REPÓRTER =====
   O design põe nome, veículo e foto de quem pergunta. O nome sai do mesmo
   gerador com semente que assina os e-mails da diretoria (inboxSigner), e o
   veículo de uma lista fixa — assim o repórter é sempre o mesmo dentro da
   mesma rodada (redesenhar a tela não troca a pessoa à sua frente) e muda de
   uma coletiva para a outra. */
const RF_PRESS_VEICULOS=[
  ['Rádio Interior','setorista'], ['Diário Esportivo','repórter de campo'],
  ['Canal Placar','comentarista'], ['Gazeta do Esporte','colunista'],
  ['TV Bandeirantes do Vale','setorista'], ['Portal Lance Regional','repórter'],
  ['Jornal da Praça','chefe de reportagem'], ['Rádio Cidade AM','narrador'],
];
function rfPressReporter(){
  const rodada=(S&&S.round)||0, clube=(S&&S.clubId)||'x';
  let nome=null;
  try{ if(typeof inboxSigner==='function') nome=inboxSigner('imprensa'+rodada, clube); }catch(e){}
  if(!nome) nome='Setorista';
  let i=0;
  try{ i=Math.abs((typeof hashC==='function')?hashC(String(clube)+'|'+rodada):(rodada*7))%RF_PRESS_VEICULOS.length; }
  catch(e){ i=rodada%RF_PRESS_VEICULOS.length; }
  const v=RF_PRESS_VEICULOS[i];
  /* `_clube`/`_rodada` viajam com o reporter porque a foto e' resolvida DE NOVO no desenho: o
     pacote pode chegar da rede depois de a coletiva ja' ter comecado, e sem as coordenadas nao
     haveria como recalcular a escolha certa (a de S seria a da rodada seguinte). */
  return { nome, veiculo:v[0], funcao:v[1], _clube:clube, _rodada:rodada, foto:rfPressFoto(clube, rodada) };
}
/* ===== A CARA DE QUEM PERGUNTA =====
   As faces sao geradas no painel (Estudio IA > Jornalistas) e chegam em RF_JORNALISTAS pela mesma
   busca das fotos de elenco. Aqui so' se escolhe UMA.

   A ESCOLHA E' POR PESSOA, NAO POR VEICULO, e de proposito: sao dez faces para oito veiculos, e a
   mesma redacao pode mandar gente diferente. Por isso o indice sai de um sal DIFERENTE do que
   escolhe o veiculo — com o mesmo sal, a cara ficaria colada ao nome do jornal para sempre e duas
   das dez nunca apareceriam.

   DETERMINISTICA pelo par (clube, rodada), como o resto do reporter: redesenhar a tela nao troca a
   pessoa a' sua frente, e os dois clientes de uma Resenha veem a mesma cara.

   Sem nenhuma face gerada devolve null, e quem desenha volta a's iniciais do nome — o retrato e'
   enfeite, nunca requisito (mesma regra de rfCoachAvatarUrl). */
function rfPressFoto(clube, rodada){
  const M=(typeof window!=='undefined' && window.RF_JORNALISTAS) || {};
  const chaves=Object.keys(M).filter(k=>M[k]).sort();     // ordenado: a escolha nao pode depender da ordem de chegada da rede
  if(!chaves.length) return null;
  let i=0;
  try{ i=Math.abs((typeof hashC==='function')?hashC('jorn|'+String(clube)+'|'+rodada):(rodada*13+5))%chaves.length; }
  catch(e){ i=rodada%chaves.length; }
  return M[chaves[i]]||null;
}

/* =====================================================================
   OS TEMAS

   Três blocos, um por pergunta, na ordem do design: O JOGO (o que acabou de
   acontecer em campo), O ELENCO (um jogador, um nome com cara) e O CLUBE (a
   diretoria, a campanha, a torcida). Cada tema só entra se o fato existir
   (`quando`), e cada bloco tem pelo menos um tema de ROTINA que existe
   sempre — uma coletiva nunca fica com menos de três perguntas.

   Cada resposta traz o que o design pede:
     tom   — a etiqueta em mono (PROTETOR, DIRETO, DURO…)
     t     — a fala, entre aspas, como sai na coletiva
     m/c/r — moral do elenco · segurança no cargo · reputação
     h     — a manchete que o jornal publica (vai para as notícias da rodada)
     imprensa / torcida — a repercussão imediata das duas bancadas
   ===================================================================== */
const RF_PRESS_TEMAS = [

/* ---------- BLOCO 1 · O JOGO ---------- */
{ id:'goleada-sofrida', bloco:'jogo', gatilho:'goleada-sofrida',
  quando:f=>!!f.ult,
  kicker:'O JOGO',
  q:f=>`Goleada por ${f.ult.gc}×${f.ult.gp} diante do ${f.ult.adv}. O que explica um resultado desses?`,
  nota:f=>`O time levou ${f.ult.gc} gols ${f.ult.casa?'em casa':'fora'}. A pergunta é provocativa de propósito.`,
  opts:f=>[
    { tom:'PROTETOR', t:'“O grupo não fugiu da responsabilidade. O erro de leitura foi meu.”',
      m:+6, c:-4, r:+1, h:'Treinador assume a goleada: "o erro foi meu"',
      imprensa:'Setoristas registram a assunção de culpa e poupam o elenco na manchete.',
      torcida:'A arquibancada respeita o gesto, mas quer resposta no próximo jogo.' },
    { tom:'DURO', t:'“Faltou vergonha na cara. Levar isso em campo não é questão de tática.”',
      m:-9, c:+3, r:-1, h:'Treinador dispara contra o elenco após goleada',
      imprensa:'Manchete garantida: a bancada adora uma cobrança pública.',
      torcida:'Torcida em festa com a bronca — e de olho em quem vai pagar.' },
    { tom:'TÉCNICO', t:'“Perdemos os duelos no meio. É corrigível e vai ser corrigido na semana.”',
      m:+1, c:-1, r:+2, h:'"Erro corrigível", diz o treinador sobre a goleada',
      imprensa:'Resposta fria esvazia a polêmica; ninguém sai com título pronto.',
      torcida:'Parte da torcida acha morno, mas ninguém se irrita.' } ] },

{ id:'goleada-aplicada', bloco:'jogo', gatilho:'goleada-aplicada',
  quando:f=>!!f.ult,
  kicker:'O JOGO',
  q:f=>`${f.ult.gp}×${f.ult.gc} no ${f.ult.adv}. O time achou o caminho?`,
  nota:f=>'Goleada é o dia em que todo mundo quer ouvir você. Também é o dia em que se promete demais.',
  opts:f=>[
    { tom:'ABRAÇO', t:'“O mérito é dos jogadores, do primeiro ao último. Eu só escalei.”',
      m:+6, c: 0, r:+1, h:'Técnico credita goleada ao elenco',
      imprensa:'Discurso simpático, pouco material para manchete.',
      torcida:'Torcida gosta: "esse aí defende o grupo".' },
    { tom:'TÉCNICO', t:'“É o trabalho da comissão aparecendo. Treinamos isso a semana toda.”',
      m:-2, c:+4, r:+2, h:'Treinador puxa para si o crédito da goleada',
      imprensa:'A bancada anota o recado à diretoria: o método está funcionando.',
      torcida:'Uma parte torce o nariz para o autoelogio.' },
    { tom:'CONTIDO', t:'“Uma goleada não ganha nada. Segunda-feira já começa outro jogo.”',
      m:+2, c:+2, r:+1, h:'Discurso pé no chão depois da goleada',
      imprensa:'Frieza calculada; a coletiva termina sem assunto.',
      torcida:'Torcida queria festa, mas entende o recado.' } ] },

{ id:'jejum', bloco:'jogo', gatilho:'jejum',
  quando:f=>!!f.forma,
  kicker:'O JOGO',
  q:f=>`São ${Math.min(5,f.forma.length)} jogos sem vencer. Até quando a diretoria deve ter paciência?`,
  nota:f=>`Sequência recente: ${f.forma.split('').join(' ')}. A pergunta vai chegar ao vestiário antes de você.`,
  opts:f=>[
    { tom:'PROTETOR', t:'“Respondo por isso. Se for para cair a cabeça de alguém, que caia a minha.”',
      m:+7, c:-3, r:+2, h:'Treinador põe o cargo à frente do elenco',
      imprensa:'Frase forte, abre a coletiva de todos os jornais da noite.',
      torcida:'A arquibancada compra a postura — por enquanto.' },
    { tom:'PRESSÃO', t:'“O elenco que eu pedi não é este. Ninguém ganha campeonato só com vontade.”',
      m:-8, c:-6, r:-1, h:'Técnico expõe o elenco e cobra reforços',
      imprensa:'Crise servida: comissão contra diretoria em praça pública.',
      torcida:'Torcida se divide entre apoiar o pedido e xingar a desculpa.' },
    { tom:'INSTITUCIONAL', t:'“Não vou dar prazo a ninguém. Vamos trabalhar e virar isso.”',
      m: 0, c:+3, r: 0, h:'"Sem prazos", diz o treinador sobre o jejum',
      imprensa:'Resposta protocolar; a bancada insiste e não tira nada.',
      torcida:'Torcida acha pouco para o tamanho da crise.' } ] },

{ id:'embalo', bloco:'jogo', gatilho:'embalo',
  quando:f=>!!f.forma,
  kicker:'O JOGO',
  q:f=>'Três vitórias seguidas. Dá para sonhar mais alto?',
  nota:f=>f.pos?`O time é o ${f.pos}º colocado e a sequência mudou o clima na cidade.`:'A sequência mudou o clima na cidade.',
  opts:f=>[
    { tom:'OUSADO', t:'“Sim. Vamos brigar por tudo o que estiver em jogo, sem rodeio.”',
      m:+5, c:+5, r:+3, h:'Promessa ousada depois da terceira vitória seguida',
      imprensa:'A frase vira chamada: o treinador assumiu o favoritismo.',
      torcida:'Arquibancada empolgada — e agora cobrando o que foi prometido.' },
    { tom:'CONTIDO', t:'“Uma partida de cada vez. Promessa vazia não põe ponto na tabela.”',
      m:+2, c:+1, r:+1, h:'Treinador segura a euforia',
      imprensa:'Ninguém sai com manchete, e é isso que você queria.',
      torcida:'Torcida respeita, mas queria ouvir a palavra "título".' },
    { tom:'DURO', t:'“A sequência esconde problemas que eu vejo e vocês não veem.”',
      m:-4, c: 0, r:+1, h:'Técnico esfria o embalo e aponta problemas',
      imprensa:'A bancada compra a análise e cobra nomes na próxima.',
      torcida:'Vestiário e torcida acham a hora errada para o balde de água fria.' } ] },

{ id:'balanco', bloco:'jogo', rotina:true,
  quando:f=>!!f.ult,
  kicker:'O JOGO',
  q:f=>f.ult.res==='V' ? `Vitória por ${f.ult.gp}×${f.ult.gc} ${f.ult.casa?'em casa':'fora'}. O time convenceu?`
      : f.ult.res==='E' ? `Empate em ${f.ult.gp}×${f.ult.gc} com o ${f.ult.adv}. Ponto ganho ou dois perdidos?`
      : `Derrota por ${f.ult.gc}×${f.ult.gp} para o ${f.ult.adv}. O que faltou?`,
  nota:f=>`${f.placar||''}${f.pos?' · '+f.pos+'º na '+(f.divisao||'tabela'):''}.`,
  opts:f=>[
    { tom:'PROTETOR', t:'“O time correu, se doeu e fez o que a gente treinou. Assino embaixo.”',
      m:+4, c: 0, r:+1, h:'Treinador defende a atuação do time',
      imprensa:'Nada de novo para a bancada, mas o grupo fica coberto.',
      torcida:'Torcida acha o discurso condescendente demais.' },
    { tom:'DIRETO', t:'“Não convenceu. E dentro do vestiário eu vou ser bem mais duro que aqui.”',
      m:-5, c:+3, r: 0, h:'Cobrança pública: técnico diz que o time não convenceu',
      imprensa:'A imprensa gosta da franqueza e destaca a cobrança.',
      torcida:'"Finalmente alguém falou", comemora a arquibancada.' },
    { tom:'TÉCNICO', t:'“Foi o jogo que a gente queria jogar. Os números da partida explicam.”',
      m:+1, c:+2, r:+2, h:'Treinador defende o plano de jogo com números',
      imprensa:'Resposta técnica, sem gancho de polêmica.',
      torcida:'Parte da torcida acha que faltou emoção na resposta.' } ] },

{ id:'proximo', bloco:'jogo', rotina:true,
  quando:f=>!!f.prox,
  kicker:'O JOGO',
  q:f=>`${f.prox.casa?'Em casa contra o':'Fora, diante do'} ${f.prox.nome}${f.prox.pos?' ('+f.prox.pos+'º)':''}. Como encara?`,
  nota:f=>'A pergunta é sobre a próxima rodada — e a resposta vai colada na capa de amanhã.',
  opts:f=>[
    { tom:'OUSADO', t:'“Vamos impor o nosso jogo, seja onde for e contra quem for.”',
      m:+4, c:+1, r:+1, h:'Treinador promete jogo ofensivo na rodada',
      imprensa:'Boa chamada para a véspera; a bancada aprova.',
      torcida:'Torcida vai lotar o setor com essa promessa.' },
    { tom:'CAUTELOSO', t:'“Adversário forte. Vamos sofrer em alguns momentos, e isso é normal.”',
      m:-3, c:-1, r: 0, h:'Técnico já prepara o terreno para dificuldades',
      imprensa:'A bancada lê como blindagem antecipada.',
      torcida:'Arquibancada não gosta de ouvir derrota anunciada.' },
    { tom:'INSTITUCIONAL', t:'“Não comento adversário. Falo do nosso trabalho.”',
      m: 0, c: 0, r:+1, h:'Treinador desconversa sobre o próximo rival',
      imprensa:'Resposta seca; o repórter passa para a próxima.',
      torcida:'Ninguém se anima, ninguém se irrita.' } ] },

/* ---------- BLOCO 2 · O ELENCO ---------- */
{ id:'proposta', bloco:'elenco', gatilho:'proposta',
  quando:f=>!!f.proposta,
  kicker:'O ELENCO',
  q:f=>`Chegou proposta do ${f.proposta.clube} por ${f.proposta.jogador}. Ele fica?`,
  nota:f=>'Cuidado: a resposta chega ao vestiário e à mesa da diretoria antes de você sair da sala.',
  opts:f=>[
    { tom:'ABRAÇO', t:'“Ele fica. Não abro mão de peça nenhuma no meio da temporada.”',
      m:+6, c:-4, r:+1, h:'Treinador crava permanência de titular',
      imprensa:'A bancada acha que você comprou briga com a diretoria.',
      torcida:'Torcida abraça a postura e pressiona pela permanência.' },
    { tom:'AMBÍGUO', t:'“Todo mundo tem preço. Quem decide isso é a diretoria, não eu.”',
      m:-5, c:+4, r: 0, h:'"Todo mundo tem preço", diz o treinador',
      imprensa:'Imprensa lê como sinal verde para a negociação.',
      torcida:'Arquibancada entende que o jogador já foi vendido.' },
    { tom:'INSTITUCIONAL', t:'“Não comento negociação em andamento. Nem eu sei o desfecho.”',
      m: 0, c: 0, r:+1, h:'Treinador evita falar da proposta',
      imprensa:'Sem manchete, mas a pergunta volta na próxima coletiva.',
      torcida:'Torcida fica no escuro e reclama nas redes.' } ] },

{ id:'vestiario', bloco:'elenco', gatilho:'vestiario',
  quando:f=>true,
  kicker:'O ELENCO',
  q:f=>'Fala-se em clima ruim no vestiário. Procede?',
  nota:f=>`A moral média do elenco está em ${f.moralMedia}/100 — e isso costuma vazar antes de aparecer em campo.`,
  opts:f=>[
    { tom:'PROTETOR', t:'“Vestiário é assunto interno. O que se passa lá dentro fica lá dentro.”',
      m:+5, c: 0, r:+1, h:'Treinador fecha o vestiário à imprensa',
      imprensa:'A bancada insiste, não tira nada, e escreve sobre o silêncio.',
      torcida:'Torcida valoriza a proteção ao grupo.' },
    { tom:'DIRETO', t:'“Existe insatisfação, sim. E é meu trabalho resolver isso na semana.”',
      m:-3, c:+3, r:+1, h:'Técnico admite insatisfação no elenco',
      imprensa:'Confirmação oficial: a matéria já estava pronta.',
      torcida:'Arquibancada quer saber quem são os insatisfeitos.' },
    { tom:'DURO', t:'“Quem não estiver feliz aqui pode procurar outro clube em janeiro.”',
      m:-11, c:+5, r:-1, h:'Ultimato público: "quem não estiver feliz, procure outro clube"',
      imprensa:'Bomba da noite; o assunto rende a semana inteira.',
      torcida:'Arquibancada aplaude de pé, o vestiário congela.' } ] },

{ id:'destaque', bloco:'elenco', rotina:true,
  quando:f=>!!f.destaque,
  kicker:'O ELENCO',
  q:f=>`${f.destaque.nome} chegou a ${f.destaque.gols} gol${f.destaque.gols===1?'':'s'} na temporada. É o nome do time?`,
  nota:f=>'Elogiar um nome é sempre falar dos outros dez. O vestiário vai contar as palavras.',
  opts:f=>[
    { tom:'DIRETO', t:'“É o nosso melhor jogador e eu digo isso sem medo de melindrar ninguém.”',
      m:+2, c: 0, r:+1, h:()=>'Treinador eleva o artilheiro a nome do time',
      imprensa:'Chamada fácil para a capa de amanhã.',
      torcida:'Torcida concorda e já pede renovação de contrato.' },
    { tom:'ABRAÇO', t:'“Ele marca porque os outros dez trabalham. O gol é do grupo.”',
      m:+5, c: 0, r:+1, h:'Técnico divide os méritos do artilheiro com o grupo',
      imprensa:'Discurso previsível, pouco aproveitável.',
      torcida:'Vestiário e arquibancada aprovam a divisão do mérito.' },
    { tom:'PRESSÃO', t:'“Pode render muito mais do que está rendendo. Ele sabe disso.”',
      m:-4, c:+2, r: 0, h:'Cobrança pública ao artilheiro do time',
      imprensa:'Manchete pronta: técnico cobra o artilheiro em público.',
      torcida:'Torcida se divide entre a cobrança e a defesa do ídolo.' } ] },

{ id:'craque', bloco:'elenco', rotina:true,
  quando:f=>!!f.craque,
  kicker:'O ELENCO',
  q:f=>`${f.craque.nome} foi o mais cobrado da arquibancada no último jogo. Ele segue titular?`,
  nota:f=>'Cuidado: a resposta chega ao vestiário antes de você.',
  opts:f=>[
    { tom:'ABRAÇO', t:'“Continua. É ele que decide os nossos jogos, e vai ouvir aplauso na próxima.”',
      m:+7, c:-2, r:+1, h:'Treinador banca o titular vaiado pela torcida',
      imprensa:'A bancada acha que você comprou briga com a arquibancada.',
      torcida:'Divide a torcida: uns respeitam a lealdade, outros vaiam de novo.' },
    { tom:'AMBÍGUO', t:'“Joga quem treina melhor na semana. Vale para ele e para todos.”',
      m:-3, c:+2, r: 0, h:'"Joga quem treina melhor", avisa o treinador',
      imprensa:'Imprensa lê como recado interno e cobra definição na véspera.',
      torcida:'Torcida entende o recado e aprova a meritocracia.' },
    { tom:'DURO', t:'“A cobrança foi justa. No nível daquele jogo, ele não pode repetir.”',
      m:-10, c:+6, r:-1, h:'Técnico endossa a vaia ao seu principal jogador',
      imprensa:'Manchete garantida: o treinador entregou o próprio craque.',
      torcida:'Arquibancada em festa com o técnico.' } ] },

/* ---------- BLOCO 3 · O CLUBE ---------- */
{ id:'cargo-risco', bloco:'clube', gatilho:'cargo-risco',
  quando:f=>true,
  kicker:'O CLUBE',
  q:f=>'Trabalham-se os bastidores de uma demissão. Você se sente ameaçado?',
  nota:f=>`A segurança no cargo está em ${f.seg}/100. Abaixo de 15, a diretoria decide sem avisar.`,
  opts:f=>[
    { tom:'FIRME', t:'“Trabalho sob pressão desde o primeiro dia. Sigo firme e sem chorar.”',
      m:+3, c:+4, r:+2, h:'Treinador rebate boatos de demissão',
      imprensa:'A bancada registra a firmeza e reduz o tom da matéria.',
      torcida:'Torcida respeita quem não foge da pergunta.' },
    { tom:'INSTITUCIONAL', t:'“Quem decide isso é a diretoria. Não é assunto meu.”',
      m:-1, c:-3, r:-2, h:'"Quem decide é a diretoria", desconversa o treinador',
      imprensa:'Resposta lida como acenar a bandeira branca.',
      torcida:'Arquibancada interpreta como desistência.' },
    { tom:'DESAFIO', t:'“Se quiserem me tirar, que tirem hoje. Não vou pedir para ficar.”',
      m:+5, c:-7, r:+1, h:'Treinador desafia a diretoria em coletiva tensa',
      imprensa:'Bomba: a coletiva vira crise entre comissão e diretoria.',
      torcida:'Torcida abraça o treinador e pressiona a diretoria.' } ] },

{ id:'caixa', bloco:'clube', gatilho:'caixa',
  quando:f=>true,
  kicker:'O CLUBE',
  q:f=>'O clube fechou a semana com o caixa no vermelho. Isso chega ao campo?',
  nota:f=>`Caixa atual: ${(typeof rfDin==='function')?rfDin(f.caixa):f.caixa}. A pergunta é para o treinador, mas a conta é da diretoria.`,
  opts:f=>[
    { tom:'PROTETOR', t:'“O grupo não pode pagar a conta de decisões que não foram dele.”',
      m:+6, c:-5, r:+1, h:'Treinador defende elenco e alfineta a gestão',
      imprensa:'Farpa registrada: comissão cobra a diretoria em público.',
      torcida:'Torcida entra junto e cobra a diretoria nas redes.' },
    { tom:'PRAGMÁTICO', t:'“Vamos vender quem estiver sobrando. Não tem drama nisso.”',
      m:-5, c:+5, r: 0, h:'Técnico admite vendas para equilibrar o caixa',
      imprensa:'A bancada já pede a lista de quem sai.',
      torcida:'Arquibancada não gosta de ouvir "vender" no meio da temporada.' },
    { tom:'INSTITUCIONAL', t:'“Dinheiro é assunto da diretoria. Eu falo de futebol.”',
      m: 0, c:+2, r:+1, h:'Treinador desvia de pergunta sobre finanças',
      imprensa:'Nada aproveitável; a pergunta volta na semana que vem.',
      torcida:'Torcida queria uma posição e não teve.' } ] },

{ id:'lider', bloco:'clube', gatilho:'lider',
  quando:f=>true,
  kicker:'O CLUBE',
  q:f=>`Líder da ${f.divisao||'competição'}. O clube é favorito ao título?`,
  nota:f=>f.pontos!=null?`${f.pontos} pontos${f.aproveitamento!=null?' e '+f.aproveitamento+'% de aproveitamento':''} até aqui.`:'A pergunta que a cidade inteira quer ouvir respondida.',
  opts:f=>[
    { tom:'OUSADO', t:'“Somos, sim. E vamos assumir esse peso em vez de fugir dele.”',
      m:+4, c:+5, r:+3, h:'Treinador assume favoritismo na liderança',
      imprensa:'Manchete de primeira página, com foto.',
      torcida:'A torcida delira e já fala em taça.' },
    { tom:'CONTIDO', t:'“Liderança de agora não vale taça nenhuma. Vale no fim.”',
      m:+1, c: 0, r:+1, h:'Líder, treinador pede pé no chão',
      imprensa:'Resposta clássica; ninguém escreve nada de novo.',
      torcida:'Torcida acha o discurso repetido, mas concorda.' },
    { tom:'CAUTELOSO', t:'“Favorito é quem gasta mais. Não somos nós, e todo mundo sabe.”',
      m:-2, c:-3, r: 0, h:'Treinador foge do favoritismo mesmo na ponta',
      imprensa:'A bancada lê como falta de ambição do projeto.',
      torcida:'Arquibancada queria ouvir coragem do líder.' } ] },

{ id:'zona', bloco:'clube', gatilho:'zona',
  quando:f=>!!f.pos,
  kicker:'O CLUBE',
  q:f=>`${f.pos}º colocado, dentro da zona de queda. O que dizer à torcida?`,
  nota:f=>`${f.total?f.total+' clubes na '+(f.divisao||'divisão')+'. ':''}É aqui que a coletiva vira ou não uma crise.`,
  opts:f=>[
    { tom:'FIRME', t:'“Não vamos cair. Assumo esse compromisso com a cara e a coragem.”',
      m:+6, c:+3, r:+2, h:'Treinador promete permanência à torcida',
      imprensa:'A promessa vira título — e vira cobrança daqui a um mês.',
      torcida:'Torcida se agarra à promessa e promete lotar o estádio.' },
    { tom:'CONTIDO', t:'“A tabela é dura, mas este elenco reage. Peço confiança.”',
      m:+2, c: 0, r: 0, h:'Treinador aposta na reação do grupo',
      imprensa:'Discurso morno para o tamanho da situação.',
      torcida:'Arquibancada queria mais peito e diz isso nas redes.' },
    { tom:'DIRETO', t:'“Sendo realista, o time é o que é. Vamos brigar com o que temos.”',
      m:-6, c:-4, r:-2, h:'"O time é o que é", desabafa o treinador',
      imprensa:'A frase é lida como entrega antecipada.',
      torcida:'Torcida se revolta com a sinceridade.' } ] },

{ id:'reforcos', bloco:'clube', rotina:true,
  quando:f=>true,
  kicker:'O CLUBE',
  q:f=>'A diretoria não trouxe o reforço que você pediu. Reclama em público?',
  nota:f=>'Última pergunta. É aqui que a coletiva vira ou não uma crise.',
  opts:f=>[
    { tom:'INSTITUCIONAL', t:'“Conversa de clube fica no clube. Trabalho com quem eu tenho.”',
      m:+3, c:+6, r:+1, h:'Treinador mantém a discussão de reforços em casa',
      imprensa:'Imprensa acha pouco, mas registra a postura institucional.',
      torcida:'Torcida esperava mais peito, e diz isso nas redes.' },
    { tom:'PRESSÃO', t:'“Pedi um reforço na abertura da janela. Ainda espero. A torcida merece saber.”',
      m:+5, c:-9, r:+1, h:'Treinador cobra reforços publicamente e expõe a diretoria',
      imprensa:'Bomba: a coletiva vira crise entre comissão e diretoria.',
      torcida:'Torcida abraça o treinador e pressiona a diretoria.' },
    { tom:'IRÔNICO', t:'“Reforço? Aqui a gente contrata pela lista de aniversário do sócio.”',
      m:-4, c:-6, r:-2, h:'Ironia do treinador sobre a política de contratações',
      imprensa:'A ironia rende clipe e desgasta os dois lados.',
      torcida:'Rende meme, mas ninguém sai defendido.' } ] },

{ id:'torcida', bloco:'clube', rotina:true,
  quando:f=>true,
  kicker:'O CLUBE',
  q:f=>'Um recado para a torcida antes da próxima rodada?',
  nota:f=>'A pergunta fácil do fim da coletiva. Também é a que mais rende recorte.',
  opts:f=>[
    { tom:'ABRAÇO', t:'“A torcida é o nosso décimo segundo jogador. Precisamos dela apertando.”',
      m:+4, c:+1, r:+1, h:'Aceno à arquibancada: "vocês são o 12º jogador"',
      imprensa:'Frase de sempre, mas rende foto bonita.',
      torcida:'Arquibancada responde com promessa de casa cheia.' },
    { tom:'CONTIDO', t:'“Peço paciência. O trabalho vai dar resultado, e não é em uma semana.”',
      m:+1, c:-1, r: 0, h:'Treinador pede paciência à torcida',
      imprensa:'A bancada lê pedido de tempo como sinal de fraqueza.',
      torcida:'Torcida ouve "paciência" pela terceira vez no ano.' },
    { tom:'DIRETO', t:'“A cobrança exagerada às vezes atrapalha mais do que ajuda.”',
      m:-5, c:-2, r:-1, h:'Polêmica: treinador reclama da cobrança da torcida',
      imprensa:'Manchete servida de graça na última pergunta.',
      torcida:'Arquibancada se sente atacada e promete resposta no domingo.' } ] },

{ id:'trabalho', bloco:'clube', rotina:true,
  quando:f=>true,
  kicker:'O CLUBE',
  q:f=>`Depois de ${(typeof S!=='undefined'&&S.round)||0} rodadas, o que já dá para dizer do seu trabalho?`,
  nota:f=>f.aproveitamento!=null?`Aproveitamento de ${f.aproveitamento}% no comando${f.jogos?' em '+f.jogos+' jogos':''}.`:'A pergunta é sobre você, não sobre o time.',
  opts:f=>[
    { tom:'FIRME', t:'“O time já tem cara. O resultado vem, e vem com este grupo.”',
      m:+4, c:+2, r:+1, h:'"O time já tem cara", avalia o treinador',
      imprensa:'A bancada aceita o balanço sem contestar.',
      torcida:'Torcida gosta de ouvir convicção.' },
    { tom:'DIRETO', t:'“Estamos abaixo do que eu esperava. A responsabilidade começa em mim.”',
      m:-3, c:-2, r:+2, h:'Treinador se diz insatisfeito com o próprio trabalho',
      imprensa:'Honestidade rende respeito na bancada e uma manchete dura.',
      torcida:'Torcida valoriza a sinceridade, mas fica preocupada.' },
    { tom:'INSTITUCIONAL', t:'“Julguem no fim da temporada, não no meio dela.”',
      m: 0, c:+3, r:+1, h:'Treinador pede que o julguem no fim da temporada',
      imprensa:'Resposta defensiva; a bancada guarda a pergunta.',
      torcida:'Arquibancada não gosta de esperar para julgar.' } ] },
];

/* MONTA A COLETIVA: uma pergunta por bloco (o jogo · o elenco · o clube),
   como o design pede. Dentro de cada bloco vale primeiro o tema com GATILHO
   — o fato que a semana produziu —, e só depois os de rotina, que giram para
   a segunda semana não repetir a pergunta da primeira. Um bloco que não tem
   nada a perguntar cede o lugar a outro, para a coletiva nunca vir curta. */
function rfPressPerguntas(fatos){
  const f=fatos||rfPressFatos();
  const cfg=rfPressCfg();
  const st=rfPressState();
  const repetidos=st.ultimos||[];
  const vistos={};
  const escolhidos=[];
  const cabe=(t,livre)=>{
    if(!t || vistos[t.id]) return false;
    if(!livre && repetidos.indexOf(t.id)>=0) return false;
    try{ if(t.quando && !t.quando(f)) return false; }catch(e){ return false; }
    return true;
  };
  const juntar=(t,livre)=>{ if(!cabe(t,livre)) return false; vistos[t.id]=true; escolhidos.push(t); return true; };

  /* os de rotina GIRAM: sem isto entravam sempre pela mesma ordem, e a mesma
     pergunta fechava a coletiva o ano inteiro. */
  const giroDe=lista=>{ if(!lista.length) return lista;
    const g=(st.total||0)%lista.length; return lista.slice(g).concat(lista.slice(0,g)); };
  const doBloco=b=>RF_PRESS_TEMAS.filter(t=>t.bloco===b);
  const gatilhoDe=(lista,livre)=>{
    for(const g of (f.gatilhos||[])){
      const t=lista.find(x=>x.gatilho===g);
      if(t && juntar(t,livre)) return true;
    }
    return false;
  };

  ['jogo','elenco','clube'].forEach(b=>{
    if(escolhidos.length>=cfg.perguntas) return;
    const lista=doBloco(b);
    if(gatilhoDe(lista,false)) return;                       // o fato da semana ganha
    if(giroDe(lista.filter(t=>t.rotina)).some(t=>juntar(t,false))) return;
    /* o bloco não tinha nada de novo: aceita repetir antes de ficar sem pergunta */
    if(gatilhoDe(lista,true)) return;
    giroDe(lista).some(t=>juntar(t,true));
  });
  /* ainda falta pergunta (bloco vazio): completa com o que houver em qualquer bloco */
  [false,true].forEach(livre=>{
    if(escolhidos.length>=cfg.perguntas) return;
    giroDe(RF_PRESS_TEMAS).some(t=>{
      if(escolhidos.length>=cfg.perguntas) return true;
      juntar(t,livre); return false;
    });
  });

  return escolhidos.slice(0,cfg.perguntas).map((t,i)=>{
    let q='', opts=[], nota='';
    try{
      q=t.q(f); opts=t.opts(f)||[];
      nota=t.nota?t.nota(f):'';
    }catch(e){ return null; }
    if(!q || !opts.length) return null;
    return { id:t.id, bloco:t.bloco, kicker:'PERGUNTA '+(i+1)+' · '+(t.kicker||'A SEMANA'),
             q, nota,
             opts:opts.map(o=>({ tom:o.tom||'', t:o.t, m:o.m||0, c:o.c||0, r:o.r||0,
                                 h:(typeof o.h==='function')?o.h():o.h,
                                 imprensa:o.imprensa||'', torcida:o.torcida||'' })) };
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

/* ABRE A ENTREVISTA PÓS-JOGO. Devolve true quando tomou conta da tela — quem
   chama (o fim do pós-rodada) usa isso para saber que a tela mudou de dono.
   Devolver false é o caso normal: na maioria das rodadas não há coletiva. */
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
                reporter:rfPressReporter(),
                base:{ moral:d.fatos.moralMedia, cargo:d.fatos.seg, rep:d.fatos.rep },
                b:null, depois:(typeof depois==='function')?depois:null };
    CL.screen='imprensa';
    /* NÃO ARMA RELÓGIO. A entrevista de rodada acontece com a rodada já
       reaberta para a sala (ver posRodadaFim): ninguém está à espera, e um
       contador a correr por cima de uma decisão que mexe na temporada só
       serve para o jogador clicar sem ler. O relógio continua a existir na
       coletiva de FIM DE TEMPORADA, que corre dentro da virada. */
    if(typeof clearPressTimer==='function') clearPressTimer();
    rfPressSomIniciar();
    cdraw();
    return true;
  }catch(e){ console.warn('coletiva da rodada:', e&&e.message); return false; }
}

/* as perguntas da coletiva em curso: as da rodada, ou as fixas de temporada */
function rfPressQs(P){
  P=P||(typeof CL!=='undefined'?CL._press:null);
  if(P && P.qs && P.qs.length) return P.qs;
  return (typeof PRESS_QUESTIONS!=='undefined')?PRESS_QUESTIONS:[];
}
/* PULAR A COLETIVA (o botão do design): salta o que falta SEM aplicar mais
   nenhum delta — o que já foi respondido continua valendo. */
function rfPressPular(){
  const P=(typeof CL!=='undefined')?CL._press:null;
  if(!P || P.step==='fim') return;
  const qs=rfPressQs(P);
  P.qIdx=qs.length; P.step='fim'; P.pulou=true;
  cdraw();
}

/* ===== O QUE A COLETIVA MEXE =====
   Um sítio só, para os dois modos. Na Resenha a moral tem de ser PUBLICADA
   (S._netMorale): aplicar só no cliente seria desfeito na adoção da rodada
   seguinte — a mesma razão do pressFinish de sempre. */
function rfPressAplicar(P){
  if(!P || typeof S==='undefined' || !S) return {moral:0, cargo:0, rep:0};
  const lim=(v,a,b)=>Math.max(a,Math.min(b,v));
  const daRodada=(P.modo==='rodada');
  /* A COLETIVA DE TEMPORADA MANTÉM O TETO DE ±15 que sempre teve. A de rodada
     não precisa de teto: cada resposta mostra o seu preço antes do clique, e
     três respostas incendiárias seguidas DEVEM custar caro — é o que o design
     chama de "é aqui que a coletiva vira ou não uma crise". */
  const dMoral=Math.round(daRodada?(P.morale||0):lim(P.morale||0,-15,15));
  const dCargo=Math.round(daRodada?(P.cargo||0):0);
  const dRep  =Math.round(daRodada?(P.rep||0):0);
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

  /* a coletiva vira NOTÍCIA DA RODADA: sem isto o efeito acontecia e nada na
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

/* o texto que cada resposta mostra ANTES do clique — a escolha é informada,
   nunca adivinhada. Aceita tanto a opção nova (m/c/r) como a antiga (só m). */
function rfPressEfeitoTxt(o){
  if(!o) return '';
  if(typeof o==='number') o={m:o};
  const p=[];
  if(o.m) p.push('moral do elenco '+(o.m>0?'+':'−')+Math.abs(o.m));
  if(o.c) p.push('cargo '+(o.c>0?'+':'−')+Math.abs(o.c));
  if(o.r) p.push('reputação '+(o.r>0?'+':'−')+Math.abs(o.r));
  return p.length?p.join(' · '):'sem efeito, sem risco';
}

/* =====================================================================
   O SOM DA SALA
   O handoff pede um ambiente de coletiva em loop enquanto o modal está
   aberto, e SILÊNCIO no instante em que ele fecha. Um ponto de criação
   (abertura) e um de parada (fecho), sem deixar a instância viva depois —
   é isso que garante o corte imediato.

   Não passa pela fila de narração do jogo (RF_SONS/rfSomTocar): aquilo é
   para clipes de lance, com prioridade e respiro entre falas. Isto é um
   fundo contínuo, e as duas coisas não disputam o mesmo canal.
   ===================================================================== */
const RF_PRESS_SOM_SRC='audio/coletiva-ambiente.mp3';
const RF_PRESS_SOM_VOL=0.22;
let RF_PRESS_SOM=null, RF_PRESS_SOM_DESTRAVA=null;
/* a preferência de som do jogador manda (Configurações → Som da partida);
   o mudo da própria coletiva é uma segunda chave, só desta tela. */
function rfPressSomLigado(){
  if(typeof CL!=='undefined' && CL._pressMudo) return false;
  return (typeof rfSomLigado==='function') ? rfSomLigado() : true;
}
function rfPressSomIniciar(){
  rfPressSomParar();
  if(!rfPressSomLigado()) return;
  try{
    RF_PRESS_SOM=new Audio(RF_PRESS_SOM_SRC);
    RF_PRESS_SOM.loop=true;
    RF_PRESS_SOM.volume=RF_PRESS_SOM_VOL;
    const p=RF_PRESS_SOM.play();
    if(p && p.catch) p.catch(()=>{
      /* AUTOPLAY BLOQUEADO. O navegador pode recusar o play inicial quando a
         tela abre sem um gesto imediatamente antes. Um único ouvinte de
         pointerdown liga o som no primeiro toque e sai de cena. */
      RF_PRESS_SOM_DESTRAVA=()=>{ if(RF_PRESS_SOM && rfPressSomLigado()){ try{ RF_PRESS_SOM.play(); }catch(e){} } };
      document.addEventListener('pointerdown', RF_PRESS_SOM_DESTRAVA, {once:true});
    });
  }catch(e){ RF_PRESS_SOM=null; }
}
function rfPressSomParar(){
  if(RF_PRESS_SOM_DESTRAVA){
    try{ document.removeEventListener('pointerdown', RF_PRESS_SOM_DESTRAVA); }catch(e){}
    RF_PRESS_SOM_DESTRAVA=null;
  }
  if(RF_PRESS_SOM){
    try{ RF_PRESS_SOM.pause(); RF_PRESS_SOM.currentTime=0; }catch(e){}
    RF_PRESS_SOM=null;
  }
}
function rfPressSomAlternar(){
  CL._pressMudo=!CL._pressMudo;
  if(CL._pressMudo) rfPressSomParar(); else rfPressSomIniciar();
  cdraw();
}

/* =====================================================================
   A TELA · MODAL DE ENTREVISTA PÓS-JOGO
   Portado de "design_handoff_entrevista_pos_jogo": sala de imprensa escura
   com flashes ao fundo, cartão branco de 940px, cabeçalho azul com filete
   amarelo e chip AO VIVO, três colunas (treinador · quiz · repórter), as
   duas barras de destaque e o rodapé de ação. O mobile é o mesmo HTML
   reordenado por CSS (ver .rf-ent-* em styles/rf26.css).

   As classes substituem os estilos inline do protótipo — o jogo já tem os
   mesmos valores em tokens (--club-primary #17458F, --club-secondary
   #F2B90C, --line-1 #dde7db, --text-1 #12201a, Space Grotesk + IBM Plex
   Mono), então o desenho sai igual sem hex solto na marcação.
   ===================================================================== */
function rfEntFaixa(v){ return v>=66?'ok' : v>=40?'aviso' : 'ruim'; }
function rfEntRotuloMoral(v){
  return v>=80?'Vestiário comprado' : v>=66?'Grupo confiante' : v>=40?'Clima instável' : 'Vestiário rachado';
}
function rfEntRotuloCargo(v){
  return v>=80?'Cargo blindado' : v>=66?'Diretoria tranquila' : v>=40?'Sob observação' : 'Demissão no radar';
}
function rfEntSinal(v){ return (v>0?'+':v<0?'−':'')+Math.abs(v); }
/* o chip de delta de uma resposta (moral / cargo / reputação). Só aparece
   quando o número existe: um "0" não é informação, é ruído. */
function rfEntChip(rot, v){
  if(!v) return '';
  return `<span class="rf-ent-chip ${v>0?'sobe':'cai'}">${escC(rot)} ${escC(rfEntSinal(v))}</span>`;
}
function rfEntBarraHTML(rot, valor, delta, origem, rotulo){
  const v=Math.max(0,Math.min(100,Math.round(valor)));
  return `<div class="rf-ent-barra">
    <div class="rf-ent-barra-top">
      <span class="rf-ent-barra-l">${escC(rot)}</span>
      <div class="rf-sp"></div>
      ${delta?`<span class="rf-ent-delta ${delta>0?'sobe':'cai'}">${escC(rfEntSinal(delta))}</span>`:''}
      <span class="rf-ent-barra-v">${v}</span>
    </div>
    <div class="rf-ent-trilha"><i class="${rfEntFaixa(v)}" style="width:${v}%"></i></div>
    <div class="rf-ent-barra-pe">
      <span class="rf-ent-barra-e">${escC(rotulo)}</span>
      <span class="rf-ent-barra-o">${escC(origem)}</span>
    </div>
  </div>`;
}
/* o retrato de quem fala. O treinador usa o avatar já existente no jogo
   (rfCoachAvatarUrl); o repórter não tem asset nenhum — em vez de inventar
   uma foto, fica o monograma sobre o fundo escuro do design. */
function rfEntRetratoHTML(cls, etiqueta, url, iniciais){
  return `<div class="rf-ent-foto ${cls}">
    ${url?`<img src="${escC(url)}" alt="" draggable="false">`
        :`<span class="rf-ent-mono-ini">${escC(iniciais||'—')}</span>`}
    <span class="rf-ent-foto-veu"></span>
    <span class="rf-ent-etq">${escC(etiqueta)}</span>
  </div>`;
}
/* a foto do reporter no momento do DESENHO. Prefere a que ja' vinha no estado; se ela e' nula
   (coletiva aberta antes de o pacote chegar), recalcula pelas coordenadas guardadas. Continua
   deterministica: a mesma cara para o mesmo (clube, rodada), em qualquer cliente. */
function rfPressFotoDe(rep){
  if(!rep) return null;
  if(rep.foto) return rep.foto;
  if(rep._clube==null || typeof rfPressFoto!=='function') return null;
  return rfPressFoto(rep._clube, rep._rodada||0);
}
function rfEntIniciais(nome){
  return String(nome||'').trim().split(/\s+/).slice(0,2).map(p=>p.charAt(0).toUpperCase()).join('')||'—';
}
function rfEntrevistaHTML(P){
  P=P||(typeof CL!=='undefined'?CL._press:null);
  if(!P) return '';
  const qs=rfPressQs(P);
  const total=qs.length;
  const feitas=Math.min((P.answers||[]).length, total);
  const fim=(P.step==='fim') || P.qIdx>=total;
  const idx=Math.min(P.qIdx||0, Math.max(0,total-1));
  const passo=qs[idx]||{opts:[]};
  const u=(P.answers||[]).filter(a=>a && a.t).slice(-1)[0]||null;   // a última resposta DADA
  const f=P.fatos||{};
  const base=P.base||{moral:70, cargo:60, rep:50};

  /* os números que as barras mostram são os que vão ser gravados: base + o que
     já foi respondido. Nada de prometer um valor e aplicar outro no fim. */
  const moral=Math.max(0,Math.min(100, Math.round((base.moral==null?70:base.moral)+(P.morale||0))));
  const cargo=Math.max(0,Math.min(100, Math.round((base.cargo==null?60:base.cargo)+(P.cargo||0))));
  const rep  =Math.max(0,Math.min(100, Math.round((base.rep==null?50:base.rep)+(P.rep||0))));

  const cl=(typeof clubOf==='function')?(clubOf(CL.clubId)||{}):{};
  const rep0=P.reporter||{nome:'Setorista', veiculo:'Imprensa', funcao:'repórter'};
  const tom = !u ? {t:'neutro', c:''}
    : (u.c>=4) ? {t:'quente', c:'quente'}
    : (u.m<=-8) ? {t:'tenso', c:'tenso'}
    : {t:'cordial', c:'cordial'};

  const kicker=[
    'PÓS-JOGO',
    ((S.round||0))+'ª RODADA',
    (f.placar||'').toUpperCase()
  ].filter(Boolean).join(' · ');

  const passosHTML=qs.map((_,n)=>{
    const cls=n<feitas?'feito':(n===idx&&!fim?'atual':'');
    return `<span class="rf-ent-passo ${cls}"></span>`;
  }).join('');

  const respostasHTML = fim ? '' : `<div class="rf-ent-ops">${
    (passo.opts||[]).map((o,i)=>`<button type="button" class="rf-ent-op" onclick="pressAnswer(${i})">
      ${o.tom?`<span class="rf-ent-op-tom">${escC(o.tom)}</span>`:''}
      <span class="rf-ent-op-t">${escC(o.t)}</span>
      <span class="rf-ent-op-chips">
        ${rfEntChip('moral',o.m)}${rfEntChip('cargo',o.c)}${rfEntChip('reputação',o.r)}
      </span>
    </button>`).join('')}</div>`;

  const reacaoHTML = (u && (u.imprensa||u.torcida)) ? `<div class="rf-ent-reacao">
      <div class="rf-ent-reacao-hd"><span>REPERCUSSÃO IMEDIATA</span><i></i></div>
      ${u.imprensa?`<div class="rf-ent-reacao-l">
        <span class="rf-ent-tag imprensa">IMPRENSA</span>
        <span>${escC(u.imprensa)}</span></div>`:''}
      ${u.torcida?`<div class="rf-ent-reacao-l">
        <span class="rf-ent-tag torcida">TORCIDA</span>
        <span>${escC(u.torcida)}</span></div>`:''}
    </div>` : '';

  const somOn=rfPressSomLigado();
  return `<div class="rf-ent-sala">
    <span class="rf-ent-listras"></span>
    <span class="rf-ent-flash a"></span><span class="rf-ent-flash b"></span>

    <div class="rf-ent" role="dialog" aria-modal="true" aria-label="Entrevista pós-jogo">
      <div class="rf-ent-hd">
        <span class="rf-ent-hd-filete"></span>
        <div class="rf-ent-hd-id">
          <span class="rf-ent-hd-k">${escC(kicker)}</span>
          <span class="rf-ent-hd-t">Entrevista pós-jogo</span>
        </div>
        <div class="rf-sp"></div>
        <button type="button" class="rf-ent-som ${somOn?'on':''}" onclick="rfPressSomAlternar()"
          aria-pressed="${somOn?'true':'false'}">${somOn?'🔊':'🔇'} <b>Som da sala</b></button>
        <span class="rf-ent-live"><i></i>AO VIVO</span>
      </div>

      <!-- OS CINCO BLOCOS SÃO IRMÃOS DE PROPÓSITO. O desktop põe treinador,
           quiz e repórter lado a lado; o mobile põe as duas pessoas em cima,
           depois as BARRAS e só então o quiz — para o efeito da resposta ficar
           visível sem rolar, como o handoff pede. Sem envólucro no meio, a
           mesma marcação serve às duas ordens (grid-template-areas). -->
      <div class="rf-ent-corpo">

          <div class="rf-ent-pessoa treinador">
            ${rfEntRetratoHTML('treinador','TREINADOR',
                (typeof rfCoachAvatarUrl==='function')?rfCoachAvatarUrl():null,
                rfEntIniciais((typeof rfTreinadorNome==='function')?rfTreinadorNome():'Treinador'))}
            <div class="rf-ent-pessoa-id">
              <span class="rf-ent-pessoa-n">${escC((typeof rfTreinadorNome==='function')?rfTreinadorNome():'Você')}</span>
              <div class="rf-ent-pessoa-s"><i class="clube"></i>
                <span>${escC(cl.short||f.clube||'—')}${f.divisao?' · '+escC(f.divisao):''}</span></div>
              <div class="rf-ent-div"></div>
              <div class="rf-ent-linha"><span>NO CARGO</span><b>${f.jogos||0} jogo${(f.jogos||0)===1?'':'s'}</b></div>
              <div class="rf-ent-linha"><span>APROVEITAMENTO</span><b>${f.aproveitamento!=null?f.aproveitamento+'%':'—'}</b></div>
              <div class="rf-ent-linha"><span>REPUTAÇÃO</span><b>${rep}${(P.rep?' ('+rfEntSinal(P.rep)+')':'')}</b></div>
            </div>
          </div>

          <div class="rf-ent-quiz">
            <div class="rf-ent-pergunta">
              <div class="rf-ent-pergunta-hd">
                <span class="rf-ent-pergunta-k">${escC(fim?'COLETIVA ENCERRADA':(passo.kicker||''))}</span>
                <div class="rf-sp"></div>
                <div class="rf-ent-passos">${passosHTML}</div>
              </div>
              <p class="rf-ent-q">${escC(fim
                ? 'Coletiva encerrada. O que você disse já está circulando.'
                : (passo.q||''))}</p>
              <span class="rf-ent-nota">${escC(fim
                ? 'Moral e segurança no cargo entram na próxima semana de jogo com estes valores.'
                : (passo.nota||''))}</span>
            </div>
            ${respostasHTML}
            ${reacaoHTML}
          </div>

          <div class="rf-ent-pessoa reporter">
            ${rfEntRetratoHTML('reporter','REPÓRTER', rfPressFotoDe(rep0), rfEntIniciais(rep0.nome))}
            <div class="rf-ent-pessoa-id">
              <span class="rf-ent-pessoa-n">${escC(rep0.nome)}</span>
              <div class="rf-ent-pessoa-s"><i class="veiculo"></i>
                <span>${escC(rep0.veiculo)}${rep0.funcao?' · '+escC(rep0.funcao):''}</span></div>
              <div class="rf-ent-div"></div>
              <div class="rf-ent-linha tom"><span>TOM DA COLETIVA</span>
                <b class="rf-ent-tom ${tom.c}">${escC(tom.t)}</b></div>
              <div class="rf-ent-linha"><span>PERGUNTAS</span><b>${feitas} / ${total}</b></div>
            </div>
          </div>

        <div class="rf-ent-barras">
          ${rfEntBarraHTML('MORAL DO TIME', moral, u?u.m:0, 'VESTIÁRIO', rfEntRotuloMoral(moral))}
          ${rfEntBarraHTML('SEGURANÇA NO CARGO', cargo, u?u.c:0, 'DIRETORIA', rfEntRotuloCargo(cargo))}
        </div>

        <div class="rf-ent-pe">
          <span class="rf-ent-pe-nota">${escC(fim
            ? 'As respostas já foram aplicadas: a moral entra no próximo treino e a segurança no cargo entra na avaliação da diretoria.'
            : 'Cada resposta mexe na moral do vestiário e na sua segurança no cargo — e a imprensa repercute na hora.')}</span>
          <div class="rf-sp"></div>
          <span class="rf-ent-pe-conta">PERGUNTAS ${feitas} / ${total}</span>
          ${fim
            ? `<button type="button" class="rf-ent-bt fim" onclick="pressFinish()">✓ Voltar ao clube</button>`
            : `<button type="button" class="rf-ent-bt" onclick="rfPressPular()">⏩ Pular a coletiva</button>`}
        </div>
      </div>
    </div>
  </div>`;
}
