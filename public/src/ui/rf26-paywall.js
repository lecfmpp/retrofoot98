/* =====================================================================
   PAYWALL DE FIM DE TEMPORADA — Grátis × Pro (25/09/2026, docs/plano-gratis-pro.md)
   ---------------------------------------------------------------------
   O Grátis joga 1 temporada por carreira. Ao clicar em "Começar a próxima temporada"
   (clAdvanceSeason), quem não é Pro passa por aqui ANTES de a virada mexer no save.

   O QUE ABRE, conforme o servidor (rf_temporadas) e a temporada que acabou (k):
   - 'bloqueio' — a próxima (k+1) passa do teto da carreira. Só vira com o Pro, ou com UMA saída
     grátis por vez (escada): depoimento (+1) → post/vídeo (+1) → só o Pro.
   - 'ultima'   — veterano da fase Beta a entrar na última temporada de cortesia: aviso com
     o Pro, e "jogar a última temporada grátis".
   - 'beta'     — veterano no primeiro fim de temporada depois do lançamento: explica a cortesia
     (uma vez por carreira).
   Nada disso → a virada segue como sempre.

   A mensagem da esquerda muda com o resultado (5 situações) e as 3 dicas saem do que aconteceu
   na temporada (caixa, força do elenco, copas, lesões, contratações, defesa).

   PELE: a mesma do popup de um plano (rf-up-horiz, rf26-planos.js) — venda à esquerda, decisão
   à direita. As poucas classes próprias começam por rf-pw-.

   BANCADA: rfPwDemo('acesso','bloqueio') abre o popup com o save aberto, sem servidor.
   localStorage 'rf98:pwTeste' = JSON do rf_temporadas simula o servidor na virada de verdade.
   ===================================================================== */

/* preço do Pro: o de RF_PLANOS (rf26-landing.js), que é o do Stripe; a reserva só vale se a
   landing não carregou */
const RF_PW_PRO = (typeof RF_PLANOS!=='undefined' && RF_PLANOS.find(p=>p.key==='pro')) || { key:'pro', nome:'Pro', mes:1990, ano:17880 };
const RF_PW = { ctx:null, vista:'pro', texto:'', link:'', enviando:false, erro:'', espera:null };

/* ---------- as 5 situações ---------- */
function rfPwSituacao(){
  let d = (typeof rfDesfecho==='function') ? rfDesfecho() : 'meio';
  if(d==='demitido') d='meio';
  const pos = (typeof rfMinhaPosicao==='function') ? rfMinhaPosicao() : 0;
  const promo = (typeof DIVISION_PROMO!=='undefined' && DIVISION_PROMO[S.division]) || 0;
  if(d==='meio' && promo && pos && pos<=promo+3) d='quase';
  return { k:d, pos };
}
function rfPwTextos(sit){
  const cl=(typeof clubOf==='function' && clubOf(CL.clubId)) || {short:'seu time'};
  const clube=cl.short||cl.name||'seu time';
  const div=(typeof divisionLabelOf==='function') ? divisionLabelOf(S.division) : '';
  const acima=(typeof rfDivAcima==='function' && typeof divisionLabelOf==='function') ? divisionLabelOf(rfDivAcima()) : '';
  const sobe = acima && acima!==div;
  const G=(typeof RF_GENERO!=='undefined')?RF_GENERO:{t:x=>x};
  const prof = CL.mgr ? CL.mgr.split(' ')[0] : G.t('professor');
  const T={
    titulo:{ ico:'🏆', selo:'CAMPEÃO', tom:'ouro',
      titulo:`Campeão da ${div}! Que temporada, ${prof}.`,
      frase: sobe
        ? `O ${clube} levantou a taça e sobe para a ${acima}. Lá em cima a folha é maior, os rivais são mais fortes e quem não se prepara cai no primeiro ano. Organize o caixa, reforce o elenco e prepare o grupo para as copas — é onde o dinheiro dá o salto.`
        : `O ${clube} levantou a taça. Defender o título é mais difícil que ganhar: todo mundo vai jogar a vida contra você. Caixa em dia, elenco mais forte e um grupo pronto para as copas.` },
    acesso:{ ico:'🚀', selo:'SUBIU DE DIVISÃO', tom:'verde',
      titulo:`Acesso! O ${clube} está na ${acima||'divisão de cima'}.`,
      frase:`Que campanha, ${prof}. Agora a conversa muda: a ${acima||'nova divisão'} cobra elenco mais forte e caixa organizado — sem isso o acesso vira rebaixamento. Reforce o time, prepare o grupo para as copas, onde o dinheiro dá o salto, e cuide do físico revezando sempre que der.` },
    quase:{ ico:'🔥', selo:'FALTOU POUCO', tom:'ouro',
      titulo:`${sit.pos}º lugar — o acesso passou raspando.`,
      frase:`Você brigou lá em cima até o fim, ${prof}. O time já mostrou que pode; com alguns ajustes a próxima é para subir. Olha onde dá para ganhar esses pontos:` },
    meio:{ ico:'📋', selo:'TEMPORADA DE CONSTRUÇÃO', tom:'azul',
      titulo:`${sit.pos?sit.pos+'º lugar':'Temporada fechada'}: o ${clube} já tem uma cara.`,
      frase:`Bom trabalho no primeiro ano, ${prof}. A base está montada — agora é dar o passo seguinte. Pelo que aconteceu nesta temporada, é aqui que dá para crescer:` },
    rebaixado:{ ico:'💪', selo:'RECOMEÇO', tom:'vermelho',
      titulo:`A queda doeu. O trabalho não acabou.`,
      frase:`Todo grande treinador já caiu uma vez, ${prof}. Você conhece o elenco e sabe onde a temporada escapou — a próxima é a chance de voltar mais forte. Comece por aqui:` },
  };
  return T[sit.k]||T.meio;
}

/* ---------- as dicas, do que aconteceu na temporada ---------- */
function rfPwNum(v){ return Number(v)||0; }
function rfPwDicas(sit){
  const dicas=[], my=CL.clubId;
  const tbl=S.table||{};
  const ids=Object.keys(tbl);
  const sq=(S.squads&&S.squads[my])||[];
  const G=(typeof RF_GENERO!=='undefined')?RF_GENERO:{t:x=>x};
  try{ // caixa da temporada
    const st=S.seasonTotals||{};
    const net=(rfPwNum(st.income)+rfPwNum(st.playerSales))
      -(rfPwNum(st.salaries)+rfPwNum(st.bonuses)+rfPwNum(st.opex)+rfPwNum(st.playerPurchases)+rfPwNum(st.stadium));
    if(rfPwNum(S.budget)<0) dicas.push({p:10, ico:'🧾', t:'Seu clube terminou no vermelho',
      x:`O caixa fechou em ${rfPwReais(S.budget)}. Venda quem não joga e segure a folha antes de contratar.`});
    else if(net<0) dicas.push({p:8, ico:'💸', t:'A temporada deu prejuízo',
      x:`Saíram ${rfPwReais(-net)} a mais do que entraram. Organize as finanças antes da próxima.`});
  }catch(e){}
  try{ // força do elenco na divisão
    const forca=cid=>{ const s=((S.squads&&S.squads[cid])||[]).map(p=>rfPwNum(p.f)).sort((a,b)=>b-a).slice(0,11);
      return s.length ? s.reduce((a,b)=>a+b,0)/s.length : 0; };
    const lista=ids.map(id=>({id, f:forca(id)})).filter(x=>x.f>0).sort((a,b)=>b.f-a.f);
    const i=lista.findIndex(x=>String(x.id)===String(my));
    if(i>=0 && lista.length>3 && (i+1)>lista.length/2) dicas.push({p:9, ico:'📈',
      t:`Seu elenco é o ${i+1}º mais forte de ${lista.length}`,
      x:sit.k==='acesso'||sit.k==='titulo'
        ? 'Na divisão de cima a diferença aumenta. Compre jogadores melhores para os titulares.'
        : 'Contrate para as posições mais fracas: o time titular precisa subir de nível.'});
  }catch(e){}
  try{ // copas: caiu cedo?
    const cedo=Object.keys(S.cups||{}).map(k=>({k, c:S.cups[k]})).find(({c})=>{
      const b=c&&(c.champion!==undefined?c:c.bracket);
      if(!b||!b.eliminated||!b.eliminated[my]) return false;
      const fases=(b.history||[]).filter(h=>(h.ties||[]).some(t=>String(t.h)===String(my)||String(t.a)===String(my))).length;
      return fases<=2;
    });
    if(cedo) dicas.push({p:7, ico:'🏟️', t:'Eliminado cedo na copa',
      x:'É nas copas que o dinheiro dá o salto: cada fase paga prêmio e bilheteria. Monte um elenco para as duas frentes.'});
  }catch(e){}
  try{ // lesões e desgaste
    const les=sq.reduce((a,p)=>a+rfPwNum(p.stats&&p.stats.injuries),0);
    const en=sq.length ? sq.reduce((a,p)=>a+rfPwNum(p.energy),0)/sq.length : 100;
    if(les>=4) dicas.push({p:6, ico:'🩹', t:`${les} lesões na temporada`,
      x:'Titular cansado se machuca. Reveze o time sempre que der e cuide da parte física.'});
    else if(en<65) dicas.push({p:5, ico:'🔋', t:'O elenco terminou esgotado',
      x:'Energia média abaixo de 65%. Revezar o time evita lesões e queda de rendimento.'});
  }catch(e){}
  try{ // defesa
    const ga=ids.map(id=>rfPwNum(tbl[id].GA)).sort((a,b)=>b-a);
    const meu=rfPwNum(tbl[my]&&tbl[my].GA);
    if(ga.length>4 && meu>0 && meu>=ga[Math.floor(ga.length/3)]) dicas.push({p:5, ico:'🧤',
      t:`A defesa levou ${meu} gols`, x:'Uma das mais vazadas da divisão. Zagueiro e goleiro são os reforços que mais valem pontos.'});
  }catch(e){}
  try{ // contratações
    const chegou=sq.filter(p=>(p.transferHistory||[]).some(h=>h.season===S.season && String(h.to)===String(my))).length;
    if(!chegou) dicas.push({p:4, ico:'🤝', t:'Você não contratou ninguém',
      x:'O mercado é onde o time muda de patamar. Na pré-temporada, procure reforços que caibam no caixa.'});
  }catch(e){}
  /* completa até 3 com o conselho da situação (o que o dono pediu: finanças, reforço, copas, físico) */
  const base=[
    {p:1, ico:'💰', t:'Organize as finanças', x:'Folha em dia e caixa para reforçar: a próxima temporada começa na janela de transferências.'},
    {p:1, ico:'📈', t:'Suba o nível do time', x:'Compre jogadores melhores para as posições mais fracas do time titular.'},
    {p:1, ico:'🏟️', t:'Prepare o elenco para as copas', x:'É onde o dinheiro dá o salto — elenco curto não aguenta duas frentes.'},
    {p:1, ico:'🔋', t:'Cuide do físico', x:'Reveze o time sempre que der: titular cansado rende menos e se machuca.'},
  ];
  dicas.sort((a,b)=>b.p-a.p);
  const out=dicas.slice(0,3);
  for(const b of base){ if(out.length>=3) break; if(!out.some(d=>d.ico===b.ico)) out.push(b); }
  return out;
}
function rfPwReais(v){
  const n=Math.round(Number(v)||0);
  const abs=Math.abs(n), s=n<0?'−':'';
  if(abs>=1e6) return s+'R$ '+(abs/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mi';
  if(abs>=1e3) return s+'R$ '+Math.round(abs/1e3)+' mil';
  return s+'R$ '+abs;
}

/* ---------- temporadas iniciadas desta carreira (mesma conta do servidor) ---------- */
function rfPwIniciadas(){
  const h=Array.isArray(S.history)?S.history:[];
  const ult=h.length?h[h.length-1]:null;
  return h.length + ((ult && String(ult.season)===String(S.season)) ? 0 : 1);
}

/* ---------- a porta: chamada no topo de clAdvanceSeason ---------- */
function rfPwTeste(){ try{ const v=localStorage.getItem('rf98:pwTeste'); return v?JSON.parse(v):null; }catch(e){ return null; } }
function rfPwVistoBeta(){ try{ return !!localStorage.getItem('rf98:pwBeta:'+(CL.save||'')); }catch(e){ return false; } }
function rfPwMarcarBeta(){ try{ localStorage.setItem('rf98:pwBeta:'+(CL.save||''), '1'); }catch(e){} }

function rfPwDecidir(st){
  if(!st || !st.ligado || st.pro) return null;
  const prox=rfPwIniciadas()+1;
  if(prox>st.teto) return 'bloqueio';
  if(st.veterano && prox===st.teto) return 'ultima';
  if(st.veterano && !rfPwVistoBeta()) return 'beta';
  return null;
}
/* true = o paywall assumiu a virada (ela acontece depois, por rfPwSeguir, se for liberada) */
function rfPwAntesDaVirada(){
  if(CL._pwLiberado){ CL._pwLiberado=false; return false; }
  if(CL.online) return false;                                   // Resenha: o servidor vira
  const teste=rfPwTeste();
  const st0=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  if(!teste && (!st0.loggedIn || st0.pro)) return false;         // Pro (ou sem sessão) nem espera
  const decidir=st=>{
    const v=rfPwDecidir(st);
    if(!v) return rfPwSeguir();
    rfPwAbrir(v, st);
  };
  if(teste){ decidir(teste); return true; }
  if(!(NET && NET.temporadas)) return false;
  NET.temporadas(CL.save).then(st=>{
    /* sem resposta do servidor a virada segue: a trava do banco (PLANO_TEMPORADAS) é o
       cinto de segurança, e o _saveV3Enviar abre este mesmo popup se ela recusar */
    if(!st) return rfPwSeguir();
    decidir(st);
  });
  return true;
}
function rfPwSeguir(){
  rfPwParar();
  const recusado = RF_PW.ctx && RF_PW.ctx.recusado;
  RF_PW.ctx=null;
  if(typeof rfUpFechar==='function') rfUpFechar();
  /* recusado pelo servidor: a temporada JÁ virou neste navegador; liberar é só gravar de novo */
  if(recusado){ if(typeof saveV3==='function') saveV3(true); return; }
  CL._pwLiberado=true;
  if(typeof clAdvanceSeason==='function') clAdvanceSeason();
}

/* ---------- o popup ---------- */
function rfPwAbrir(variante, st){
  const sit=rfPwSituacao();
  RF_PW.ctx={ variante, st:st||{}, sit, txt:rfPwTextos(sit), dicas:rfPwDicas(sit) };
  RF_PW.vista='pro'; RF_PW.erro=''; RF_PW.enviando=false;
  if(variante==='beta') rfPwMarcarBeta();
  const velho=document.querySelector('.rf-up-pop.rf-pw'); if(velho) delete velho.dataset.vista;  // popup novo abre no topo
  rfPwDesenhar();
}
function rfPwFechar(){ rfPwParar(); RF_PW.ctx=null; if(typeof rfUpFechar==='function') rfUpFechar(); }
function rfPwVista(v){ RF_PW.vista=v; RF_PW.erro=''; rfPwDesenhar(); }
function rfPwCiclo(k){ RF_UP.ciclo = k==='ano'?'ano':'mes'; rfPwDesenhar(); }
function rfPwForma(k){ RF_UP.forma = k==='pix'?'pix':'cartao'; rfPwDesenhar(); }

function rfPwEsquerdaHTML(c){
  const div=(typeof divisionLabelOf==='function') ? divisionLabelOf(S.division) : '';
  return `<div class="rf-up-venda rf-pw-venda tom-${c.txt.tom}">
      <div class="rf-up-venda-hd">
        <span class="rf-up-venda-ico">${c.txt.ico}</span>
        <span class="rf-up-venda-id"><span class="rf-up-mono">FIM DA TEMPORADA ${escC(String(S.season||''))} · ${escC(div.toUpperCase())} · ${escC(c.txt.selo)}</span>
          <b>${escC(c.txt.titulo)}</b></span>
      </div>
      <span class="rf-up-venda-frase rf-pw-frase">${escC(c.txt.frase)}</span>
      <div class="rf-up-bens rf-pw-dicas">
        <span class="rf-up-mono rf-pw-dicas-t">PARA A PRÓXIMA TEMPORADA</span>
        ${c.dicas.map(d=>`<div class="rf-up-bem"><span class="rf-up-bem-ico">${d.ico}</span>
          <span class="rf-up-bem-t"><b>${escC(d.t)}</b><span>${escC(d.x)}</span></span></div>`).join('')}
      </div>
    </div>`;
}

/* a saída grátis desta vez (uma só, em escada) */
function rfPwSaida(c){
  const st=c.st||{};
  if(c.variante!=='bloqueio') return null;
  if(!st.depoimento_usado) return 'depoimento';
  if(!st.post_usado) return 'post';
  return null;
}
function rfPwProHTML(c){
  const p=RF_PW_PRO, ciclo=RF_UP.ciclo, pix=RF_UP.forma==='pix';
  const eco=Math.round((p.mes*12-p.ano)*100/(p.mes*12));
  const preco = ciclo==='ano' ? rfBRL(p.ano) : rfBRL(p.mes);
  const opcoes=[
    {k:'mes', t:'Mensal', nota:'cobrado todo mês', preco:rfBRL(p.mes), sub:'por mês', selo:''},
    {k:'ano', t:'Anual', nota:`dá ${rfBRL(Math.round(p.ano/12))} por mês`, preco:rfBRL(p.ano), sub:'por ano', selo:eco>0?'−'+eco+'%':''},
  ];
  const restam=Math.max(0,(c.st.teto||0)-rfPwIniciadas());
  const topo = {
    bloqueio:{ selo:'🔒 FIM DA TEMPORADA DO PELADEIRO', t:'Para seguir com esta carreira, vire Pro.' },
    ultima:  { selo:'⏳ ÚLTIMA TEMPORADA GRÁTIS', t:'A próxima é a sua última temporada no Peladeiro.' },
    beta:    { selo:'🔨 JOGADOR DA FASE BETA', t:'Você ganhou mais 2 temporadas grátis.' },
  }[c.variante];
  const aviso = c.variante==='beta'
    ? `Por jogar desde a fase Beta, você segue no Peladeiro por mais 2 temporadas nesta carreira. Depois disso, para continuar, será preciso ser Pro: é o que paga o servidor e o armazenamento do seu histórico, para você jogar online e de qualquer aparelho.`
    : c.variante==='ultima'
      ? `Obrigado por jogar desde a fase Beta. Depois da próxima temporada, esta carreira só continua no Pro — é o que mantém o seu save na nuvem, jogável de qualquer aparelho.`
      : '';
  const saida=rfPwSaida(c);
  /* A SAÍDA GRÁTIS TEM O MESMO PESO DO "ASSINAR" (pedido do dono, 25/09): botão do mesmo
     tamanho logo abaixo, separado por um "ou" — não um link escondido numa caixa. */
  const convite = saida ? `
      <div class="rf-pw-ou"><span>ou</span></div>
      <div class="rf-pw-gratis">
        <button type="button" class="rf-up-cta rf-pw-cta2" onclick="rfPwVista('${saida}')">
          <span class="rf-up-emo">${saida==='depoimento'?'💬':'📣'}</span>
          <span>${saida==='depoimento'?'Ganhar 1 temporada grátis — dar minha opinião':'Ganhar 1 temporada grátis — postar sobre o jogo'}</span></button>
        <span class="rf-up-cta-nota">${saida==='depoimento'
          ? 'Conte o que achou do RetroFoot e a próxima temporada é liberada na hora.'
          : 'Poste um vídeo ou post sobre o RetroFoot nas suas redes e cole o link.'}</span>
      </div>` : '';
  const fica = c.variante==='bloqueio' ? 'Voltar ao resumo'
    : c.variante==='ultima' ? 'Jogar a última temporada grátis'
    : `Continuar grátis${restam?` (${restam} temporada${restam>1?'s':''})`:''}`;
  const ficaAcao = c.variante==='bloqueio' ? 'rfPwFechar()' : 'rfPwSeguir()';
  return `
      <div class="rf-pw-topo"><span class="rf-up-mono">${escC(topo.selo)}</span><b>${escC(topo.t)}</b>
        ${aviso?`<span>${escC(aviso)}</span>`:''}</div>
      <div class="rf-pw-bens">
        ${['Temporadas e carreiras ilimitadas','Carreira na nuvem, de qualquer aparelho','Acesso exclusivo ao Modo Resenha (Beta)','Ultrassônico e Selo Pro']
          .map(b=>`<span><i>✓</i>${escC(b)}</span>`).join('')}
      </div>
      <div class="rf-up-opcoes">
        ${opcoes.map(o=>`
        <button type="button" role="radio" aria-checked="${ciclo===o.k}" class="rf-up-opcao${ciclo===o.k?' on':''}" onclick="rfPwCiclo('${o.k}')">
          <span class="rf-up-radio"></span>
          <span class="rf-up-opcao-t"><span><b>${o.t}</b>${o.selo?`<span class="rf-up-eco">${o.selo}</span>`:''}</span>
            <span class="rf-up-opcao-n">${escC(o.nota)}</span></span>
          <span class="rf-up-opcao-p"><b>${escC(o.preco)}</b><span>${escC(o.sub)}</span></span>
        </button>`).join('')}
        <div class="rf-up-forma" role="radiogroup" aria-label="Pagar com">
          <span class="rf-up-mono">PAGAR COM</span>
          <button type="button" role="radio" aria-checked="${!pix}" class="${!pix?'on':''}" onclick="rfPwForma('cartao')"><span class="rf-up-emo">💳</span><span>Cartão</span></button>
          <button type="button" role="radio" aria-checked="${pix}" class="${pix?'on':''}" onclick="rfPwForma('pix')"><span class="rf-up-emo">⚡</span><span>Pix</span></button>
        </div>
      </div>
      <div class="rf-up-pe rf-pw-pe-pro">
        <button type="button" class="rf-up-cta" onclick="rfPwPagar()"><span>Assinar o Pro — ${escC(preco)}/${ciclo==='ano'?'ano':'mês'}</span></button>
        <span class="rf-up-cta-nota">${escC(pix ? `Um Pix de ${preco}, vale por ${ciclo==='ano'?'um ano':'um mês'}. Sem renovação automática.` : (ciclo==='ano'?`Um pagamento de ${preco}. Renova daqui a um ano.`:'Renova todo mês. Cancela quando quiser.'))}</span>
        ${convite}
      </div>
      <div class="rf-up-rodape">
        <span class="rf-up-cobranca"><span class="rf-up-emo">🔒</span><span>Stripe · ${pix?'pagamento único':'cancela quando quiser'}</span></span>
        <span class="rf-sp"></span>
        <button type="button" class="rf-up-agora${c.variante!=='bloqueio'?' rf-pw-na-barra':''}" onclick="${ficaAcao}">${escC(fica)}</button>
      </div>`;
}
/* NO CELULAR os dois botões ficam presos no pé da janela (a pessoa lê a temporada e as dicas
   rolando, sem perder a decisão de vista). No desktop esta barra não aparece. */
function rfPwBarraHTML(c){
  const ciclo=RF_UP.ciclo, preco = ciclo==='ano' ? rfBRL(RF_PW_PRO.ano) : rfBRL(RF_PW_PRO.mes);
  const saida=rfPwSaida(c);
  const dois = saida
    ? `<button type="button" class="rf-up-cta rf-pw-cta2" onclick="rfPwVista('${saida}')"><span class="rf-up-emo">${saida==='depoimento'?'💬':'📣'}</span>
        <span>${saida==='depoimento'?'Ganhar 1 temporada grátis — dar minha opinião':'Ganhar 1 temporada grátis — postar sobre o jogo'}</span></button>`
    : c.variante!=='bloqueio'
      ? `<button type="button" class="rf-up-cta rf-pw-cta2" onclick="rfPwSeguir()"><span>${c.variante==='ultima'?'Jogar a última temporada grátis':'Continuar grátis'}</span></button>`
      : '';
  return `<div class="rf-pw-barra">
      <button type="button" class="rf-up-cta" onclick="rfPwPagar()"><span>Assinar o Pro — ${escC(preco)}/${ciclo==='ano'?'ano':'mês'}</span></button>
      ${dois}
    </div>`;
}
function rfPwFormHTML(tipo){
  const dep = tipo==='depoimento';
  const val = dep ? RF_PW.texto : RF_PW.link;
  const ok = dep ? val.trim().length>=20 : /^https?:\/\/\S+\.\S+/i.test(val.trim());
  return `
      <div class="rf-pw-topo"><span class="rf-up-mono">${dep?'💬 SUA OPINIÃO VALE UMA TEMPORADA':'📣 SEU POST VALE UMA TEMPORADA'}</span>
        <b>${dep?'O que você achou do RetroFoot?':'Poste sobre o RetroFoot e cole o link'}</b>
        <span>${dep
          ? 'Do que gostou, do que sentiu falta, o que mudaria. Vai direto para a equipe que faz o jogo — e a próxima temporada é liberada assim que você enviar.'
          : 'Um vídeo ou post no Instagram, TikTok, YouTube, X, Facebook ou Kwai mostrando a sua carreira. A temporada é liberada assim que você enviar o link.'}</span></div>
      ${dep
        ? `<textarea class="rf-pw-campo" rows="6" maxlength="2000" placeholder="Escreva aqui…" oninput="RF_PW.texto=this.value;rfPwAtualizarBotao()">${escC(val)}</textarea>
           <span class="rf-pw-conta" data-pw-conta>${val.trim().length<20?`Mais ${20-val.trim().length} caracteres`:'Pronto para enviar'}</span>`
        : `<input class="rf-pw-campo" type="url" inputmode="url" placeholder="https://www.instagram.com/p/…" value="${escC(val)}" oninput="RF_PW.link=this.value;rfPwAtualizarBotao()">`}
      ${RF_PW.erro?`<span class="rf-pw-erro">${escC(RF_PW.erro)}</span>`:''}
      <div class="rf-up-pe">
        <button type="button" class="rf-up-cta" data-pw-enviar ${ok&&!RF_PW.enviando?'':'disabled'} onclick="rfPwEnviar('${tipo}')">
          <span>${RF_PW.enviando?'Enviando…':(dep?'Enviar e liberar a temporada':'Enviar o link e liberar a temporada')}</span></button>
      </div>
      <div class="rf-up-rodape"><span class="rf-sp"></span>
        <button type="button" class="rf-up-agora" onclick="rfPwVista('pro')">← Voltar</button></div>`;
}
/* só o botão e o contador mudam a cada tecla — redesenhar tudo apagaria o cursor
   (ver memória "cdraw() por tecla mata o cursor") */
function rfPwAtualizarBotao(){
  const dep=RF_PW.vista==='depoimento';
  const v=(dep?RF_PW.texto:RF_PW.link).trim();
  const ok= dep ? v.length>=20 : /^https?:\/\/\S+\.\S+/i.test(v);
  const b=document.querySelector('[data-pw-enviar]'); if(b) b.disabled=!ok||RF_PW.enviando;
  const c=document.querySelector('[data-pw-conta]'); if(c) c.textContent = v.length<20?`Mais ${20-v.length} caracteres`:'Pronto para enviar';
}
function rfPwEsperaHTML(){
  return `
      <div class="rf-pw-topo"><span class="rf-up-mono">⏳ AGUARDANDO O PAGAMENTO</span>
        <b>Termine o pagamento na aba do Stripe.</b>
        <span>Assim que ele confirmar, esta tela percebe sozinha e a próxima temporada começa — com o seu save intacto.</span></div>
      <div class="rf-pw-espera"><span class="rf-pw-roda" aria-hidden="true"></span><span>Conferindo a sua conta…</span></div>
      <div class="rf-up-pe">
        <button type="button" class="rf-up-cta" onclick="rfPwConferir(true)"><span>Já paguei — continuar</span></button>
      </div>
      <div class="rf-up-rodape"><span class="rf-sp"></span>
        <button type="button" class="rf-up-agora" onclick="rfPwParar();rfPwVista('pro')">← Voltar</button></div>`;
}
function rfPwDesenhar(){
  const c=RF_PW.ctx; if(!c) return;
  const dir = RF_PW.vista==='depoimento' || RF_PW.vista==='post' ? rfPwFormHTML(RF_PW.vista)
    : RF_PW.vista==='espera' ? rfPwEsperaHTML() : rfPwProHTML(c);
  const fecha = c.variante==='bloqueio' || RF_PW.vista==='espera' ? 'rfPwFechar()' : 'rfPwSeguir()';
  /* trocar mensal/anual ou cartão/Pix redesenha tudo: sem guardar a rolagem, no celular a
     janela pulava de volta para o topo a cada toque */
  const velho=document.querySelector('.rf-up-pop.rf-pw');
  const y = (velho && velho.dataset.vista===RF_PW.vista) ? velho.scrollTop : 0;
  rfUpMostrar(`${rfPwEsquerdaHTML(c)}
    <div class="rf-up-decisao rf-pw-decisao">
      <button type="button" class="rf-up-x" aria-label="Fechar" onclick="${fecha}">✕</button>
      ${dir}
    </div>
    ${RF_PW.vista==='pro'?rfPwBarraHTML(c):''}`, 'rf-up-horiz rf-pw');
  const novo=document.querySelector('.rf-up-pop.rf-pw');
  if(novo){ novo.dataset.vista=RF_PW.vista; if(y) novo.scrollTop=y; }
  /* o clique no fundo e o Esc do rfUpMostrar só fecham — num aviso, fechar é seguir */
  if(RF_UP) RF_UP.aberto=null;
}

/* ---------- ações ---------- */
function rfPwResumo(){
  const c=RF_PW.ctx; if(!c) return '';
  const div=(typeof divisionLabelOf==='function') ? divisionLabelOf(S.division) : '';
  return `${c.txt.selo.toLowerCase()} — ${div}${c.sit.pos?`, ${c.sit.pos}º lugar`:''} (temporada ${S.season||''})`;
}
function rfPwEnviar(tipo){
  if(RF_PW.enviando) return;
  const dep=tipo==='depoimento';
  RF_PW.enviando=true; RF_PW.erro=''; rfPwAtualizarBotao();
  const teste=rfPwTeste();
  const chamada = teste
    ? new Promise(r=>setTimeout(()=>{ teste.teto=(teste.teto||1)+1; teste[dep?'depoimento_usado':'post_usado']=true;
        try{ localStorage.setItem('rf98:pwTeste', JSON.stringify(teste)); }catch(e){}
        r({ teto:teste.teto }); }, 600))
    : NET.liberarTemporada(CL.save, tipo, dep?RF_PW.texto.trim():null, dep?null:RF_PW.link.trim(), rfPwResumo());
  chamada.then(r=>{
    RF_PW.enviando=false;
    if(r && r.teto){
      RF_PW.texto=''; RF_PW.link='';
      toastC(dep ? '✓ Obrigado pela opinião! Temporada liberada.' : '✓ Valeu pela divulgação! Temporada liberada.');
      return rfPwSeguir();
    }
    RF_PW.erro = ({
      DEPOIMENTO_CURTO:'Escreva um pouco mais — pelo menos 20 caracteres.',
      LINK_INVALIDO:'Esse link não parece ser de uma rede social (Instagram, TikTok, YouTube, X, Facebook, Kwai).',
      JA_USADO: dep?'Você já usou a sua temporada por opinião.':'Você já usou a sua temporada por post.',
    })[r&&r.erro] || 'Não consegui enviar agora. Tente de novo em instantes.';
    rfPwDesenhar();
  });
}
function rfPwPagar(){
  if(typeof rfPlanoCta!=='function') return;
  rfPlanoCta('pro', 'temporada', RF_UP.ciclo, RF_UP.forma);
  RF_PW.vista='espera'; rfPwDesenhar();
  rfPwParar();
  RF_PW.espera = setInterval(()=>rfPwConferir(false), 5000);
  setTimeout(rfPwParar, 20*60*1000);   // 20 min de paciência
}
function rfPwParar(){ if(RF_PW.espera){ clearInterval(RF_PW.espera); RF_PW.espera=null; } }
async function rfPwConferir(clicou){
  try{
    if(NET && NET.carregarPlano) await NET.carregarPlano();
    const st=(NET&&NET.authStatus)?NET.authStatus():{};
    if(st.pro){ toastC('✓ Bem-vindo ao Pro! Bora para a próxima temporada.'); return rfPwSeguir(); }
    if(clicou) toastC('O pagamento ainda não chegou. Se acabou de pagar, espere alguns segundos.','warn');
  }catch(e){ if(clicou) toastC('Não consegui conferir agora. Tente de novo.','warn'); }
}

/* ---------- a trava do servidor recusou o save (PLANO_TEMPORADAS) ---------- */
function rfPwRecusado(){
  if(RF_PW.ctx) return;   // já aberto
  if(typeof S==='undefined' || !S) return;
  const abrir=st=>{ if(RF_PW.ctx) return;
    rfPwAbrir('bloqueio', Object.assign({ ligado:true, pro:false, teto:rfPwIniciadas()-1 }, st||{}));
    RF_PW.ctx.recusado=true; };
  if(NET && NET.temporadas) NET.temporadas(CL.save).then(abrir); else abrir(null);
}

/* ---------- bancada ---------- */
/* rfPwDemo('titulo'|'acesso'|'quase'|'meio'|'rebaixado', 'bloqueio'|'ultima'|'beta', 'depoimento'|'post'|'pro') */
function rfPwDemo(sitK, variante, saida){
  variante=variante||'bloqueio';
  const st={ ligado:true, pro:false, teto:rfPwIniciadas()+(variante==='bloqueio'?0:1), veterano:variante!=='bloqueio',
    depoimento_usado:saida==='post'||saida==='pro', post_usado:saida==='pro' };
  rfPwAbrir(variante, st);
  if(sitK){
    const sit={k:sitK, pos:({titulo:1,acesso:3,quase:6,meio:11,rebaixado:19})[sitK]||rfPwSituacao().pos};
    RF_PW.ctx.sit=sit; RF_PW.ctx.txt=rfPwTextos(sit); RF_PW.ctx.dicas=rfPwDicas(sit);
    rfPwDesenhar();
  }
}
