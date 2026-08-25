/* =====================================================================
   RetroFoot98 — ELENCO & BASE, as quatro abas completas
   Marcação de telas-v3/Elenco e Base - Abas.dc.html, coluna por coluna.

   O DESENHO VEM PRIMEIRO. Uma versão anterior desta tela omitia de
   propósito o que o motor não tem — potencial do garoto, nível do CT, foco
   de treino por tema — e explicava a ausência em nota de rodapé. A decisão
   agora é outra: a tela é o desenho, inteiro, e o que ainda não tem fonte
   no motor aparece com o dado mais próximo que existe ou com um traço.
   Ligar cada peça à base vem depois, uma a uma.

   O que é DERIVADO (e não lido) está marcado caso a caso lá embaixo.
   ===================================================================== */

/* ---- peças ---- */
function rfElBarra(rot, valor, pct, cor){
  return `<div class="rf-el-attr">
    <span class="rf-el-attr-l">${escC(rot)}</span>
    <span class="rf-el-attr-b"><i style="width:${Math.max(0,Math.min(100,pct))}%;background:${cor||'var(--club-primary)'}"></i></span>
    <span class="rf-el-attr-v">${escC(String(valor))}</span>
  </div>`;
}
/* A CAMISA COM O NÚMERO — cinco caixas absolutas: corpo, duas mangas, gola e
   o número por cima. É a marca da tabela de elenco no pacote; sem ela a linha
   vira uma planilha. Vem em dois tamanhos: 'p' na tabela, 'g' na ficha. */
/* `tam`: '' (28px, listas densas), 'm' (34px) ou 'g' (54px). É a ÚNICA camisa do
   jogo — o Mercado tinha um desenho próprio, sem gola e com o número em 11px,
   e as duas peças nunca coincidiam lado a lado. */
/* foto do Estúdio para QUALQUER jogador: pelo clube dele (quando informado),
   pelo clube do usuário, ou pelo nome (cobre mercado/leilão de outros clubes) */
function rfFotoDe(p, clubId){
  if(!p || !p.n) return null;
  const F = window.RF_FOTOS||{}, N = window.RF_FOTOS_NOME||{};
  return (clubId!=null && F[String(clubId)+'|'+p.n]) || F[String(CL.clubId)+'|'+p.n] || N[p.n] || null;
}
function rfElCamisa(num, tam, p, clubId){
  const cls = tam===true ? 'g' : (tam||'');
  const foto = rfFotoDe(p, clubId);
  if(foto) return rfFotoNumHTML(foto, num, 'el');
  return `<span class="rf-el-camisa ${cls}">
    <i class="c-corpo"></i><i class="c-mgesq"></i><i class="c-mgdir"></i><i class="c-gola"></i>
    <b>${escC(String(num||''))}</b>
  </span>`;
}
/* barrinha fina de 6px usada em ENERGIA, POTENCIAL e PROGRESSO */
/* `larg` virou TETO, não largura fixa: a barra enche a célula até esse limite.
   Como largura fixa ela ficava numa poça de espaço vazio agora que as colunas
   numéricas dividem a folga da tela. */
function rfElMini(pct, cor, larg){
  pct=Math.max(0,Math.min(100,Math.round(pct||0)));
  return `<span class="rf-el-mini" ${larg?`style="--mini-w:${larg*2}px"`:''}><i style="width:${pct}%;background:${cor}"></i></span>`;
}
/* a escala verde→amarelo→vermelho que o pacote usa nas três barras */
function rfElTom(pct){
  return pct>=80?'#2fbf5f':pct>=60?'#8cc63f':pct>=40?'#F2B90C':'#d94141';
}
/* A COLUNA MOSTRAVA V/E/D — vitoria, empate, derrota — que e forma de TIME.
   Aplicada a um jogador nao dizia nada: ela pegava as ultimas tres NOTAS dele
   (p.stats.r3) e reduzia cada uma a uma letra, com o corte em 6. Quem jogou
   com 6,1 e quem jogou com 9,4 apareciam iguais, ambos "V", e a informacao
   que o motor tinha — a nota — perdia-se na traducao.

   Agora e a MEDIA das notas, que e o que playerForma() ja calculava no motor
   e nunca chegava a esta tabela. `stats.r3` guarda so os ultimos tres jogos,
   entao e a media dos tres — e o que existe; nao ha media de temporada
   gravada em lado nenhum. Sem jogo nenhum fica travessao.
   As faixas de cor sao as mesmas do resto do jogo (notaCls): 7,5 destaque ·
   6,8 portao da evolucao · 6 abaixo disso foi mal. */
function rfElForma(p){
  const n=(typeof playerForma==='function')?playerForma(p):null;
  const jogos=((p.stats&&p.stats.r3)||[]).length;
  const cls=(typeof notaCls==='function')?notaCls(n):'na';
  const txt=(typeof notaTxt==='function')?notaTxt(n):(n==null?'—':String(n));
  const titulo=n==null
    ? 'Ainda não jogou nesta temporada'
    : ('Média das notas dos últimos '+jogos+' jogo'+(jogos===1?'':'s'));
  return `<span class="rf-el-forma"><span class="rf-el-nota ${cls}" title="${escC(titulo)}">${escC(txt)}</span></span>`;
}
/* linha de estatística dos rodapés (RESUMO POR SETOR, INVESTIMENTO NA BASE):
   rótulo micro em mono, número grande, e uma legenda opcional embaixo */
function rfElStat(rot, valor, sub){
  return `<div class="rf-el-stat">
    <span class="rf-el-stat-l">${escC(rot)}</span>
    <span class="rf-el-stat-v">${escC(String(valor))}</span>
    ${sub?`<span class="rf-el-stat-s">${escC(sub)}</span>`:''}
  </div>`;
}

/* =====================================================================
   1 · ELENCO — pacote "Telas de Elenco e Ficha do Jogador" (24/08)
   Portado de telas-ref/telas/3-elenco-desktop.html. Tudo que o jogo tem
   de verdade entra real (força, energia, forma, salário, nacionalidade,
   treino especial, resumo por setor, posição na tabela); o que o motor
   não guarda entra estável e honesto (ano de fundação: determinístico
   por clube; foto de perfil: o retrato único do pacote, para todos).
   ===================================================================== */
const RF_EL_COLS='34px minmax(0,1.2fr) 34px 34px 40px 40px minmax(62px,.5fr) minmax(62px,.5fr) minmax(78px,.6fr) minmax(52px,.45fr)';
/* ano de fundação: o dado não existe no jogo — sai ESTÁVEL do id do clube
   (mesmo clube, mesmo ano, em todo save), nunca de Math.random() */
function rfFxFundado(clubId){ return 1900+((typeof hashSeed==='function'?hashSeed('fundado',String(clubId)):0)>>>0)%80; }
/* foto do jogador: a costurada no Estúdio (clube atual -> por nome, para o
   transferido ainda sem recostura) e, sem nenhuma, o retrato único de sempre */
/* FOTO COMPOSTA da ficha: a foto costurada + as camadas do uniforme (escudo,
   patrocinador, fabricante) nas MESMAS posições do painel. As posições salvas
   são do quadro do uniforme; o mapa abaixo (idêntico ao do Estúdio) as desloca
   para o quadro da foto. Tudo vive num quadro 2:3 que o contêiner corta em
   cover — foto e camadas nunca desalinham entre si. */
const RF_FOTO_AJUSTE = { y0:34, yEsc:0.70, xEsc:0.77 };
const RF_POS_PADRAO = { patro:{x:33,y:65,w:34}, escudo:{x:57,y:30,w:22}, fabricante:{x:27,y:57,w:9} };
function rfFxPosFoto(p2){
  const w = p2.w * RF_FOTO_AJUSTE.xEsc;
  const cx = 50 + (p2.x + p2.w/2 - 50) * RF_FOTO_AJUSTE.xEsc;
  return { x: cx - w/2, y: RF_FOTO_AJUSTE.y0 + p2.y * RF_FOTO_AJUSTE.yEsc, w };
}
function rfFxFotoComposta(p, crest){
  const foto = rfFxFoto(p);
  if(foto === 'img/jogador-perfil.png')
    return `<img src="${foto}" alt="${escC(p.n)}">`;
  const uni = (window.RF_UNIFORMES||{})[String(CL.clubId)] || {};
  const camada = (url, pos, padrao) => {
    if(!url) return '';
    const v = rfFxPosFoto(Object.assign({}, padrao, pos||{}));
    return `<img src="${escC(url)}" alt="" loading="lazy" draggable="false"
      style="position:absolute;left:${v.x}%;top:${v.y}%;width:${v.w}%">`;
  };
  return `<span class="rf-fx-quadro" aria-hidden="true">
    <img src="${escC(foto)}" alt="${escC(p.n)}">
    ${camada(crest, uni.escudo, RF_POS_PADRAO.escudo)}
    ${camada(uni.fabricanteUrl, uni.fabricante, RF_POS_PADRAO.fabricante)}
    ${camada(uni.patroUrl, uni.patro, RF_POS_PADRAO.patro)}
  </span>`;
}
function rfFxFoto(p){
  if(p && p.n){
    const porClube = window.RF_FOTOS && window.RF_FOTOS[String(CL.clubId)+'|'+p.n];
    if(porClube) return porClube;
    const porNome = window.RF_FOTOS_NOME && window.RF_FOTOS_NOME[p.n];
    if(porNome) return porNome;
  }
  return 'img/jogador-perfil.png';
}
function rfElnEnCor(v){ return v>=80?'#35b34a':v>=55?'#8dc63f':'#f2b90c'; }
function rfElnFormaHTML(p){
  const n=(typeof playerForma==='function')?playerForma(p):null;
  if(n==null) return '<span class="rf-eln-c dim ctr">—</span>';
  const t=(typeof notaTxt==='function')?notaTxt(n):String(n);
  if(n>=6.8) return `<span class="rf-eln-pill ok">${escC(t)}</span>`;
  if(n<6)    return `<span class="rf-eln-pill ruim">${escC(t)}</span>`;
  return `<span class="rf-eln-c forte ctr">${escC(t)}</span>`;
}
function rfElnRows(n){ CL.elnRows=n; cdraw(); }
function rfElElencoHTML(){
  const sq=squad(CL.clubId).slice().sort(bySquadOrder);
  const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};
  const clube=clubOf(CL.clubId)||{};
  const crest=(typeof clubCrestUrl==='function')?clubCrestUrl(clube):null;
  const pos=(typeof tablePos==='function')?tablePos(CL.clubId):0;
  const divLbl=(typeof DIV_LABEL_FULL!=='undefined'&&DIV_LABEL_FULL[S.division])||('Série '+S.division);
  const pais=(typeof universeCountryInfo==='function')?((universeCountryInfo()||{}).name||''):'';
  const fMedia=sq.length?Math.round(sq.reduce((t,p)=>t+(p.f||0),0)/sq.length):0;
  const idMedia=sq.length?(Math.round(10*sq.reduce((t,p)=>t+(p.age||0),0)/sq.length)/10):0;
  const folha=rfFolha();
  const mostrar=CL.elnRows||20;
  const lista=sq.slice(0,mostrar);
  const treinoSet=new Set(((S.trainingByClub&&S.trainingByClub[CL.clubId])||[]).map(String));
  const linhas=lista.map(p=>{
    const sel=CL.selPlayer===p.pid;
    const en=Math.round(p.energy!=null?p.energy:100);
    const emTreino=treinoSet.has(String(p.pid))||p._training;
    const tit=false;
    return `<div class="rf-eln-row rf-eln-g ${sel?'sel':''}" onclick="rfSelPlayer('${escC(p.pid)}')">
      <span class="rf-eln-jog">
        ${rfFotoNumHTML(rfFxFoto(p), nums[p.pid]||p.num||'', 'eln')}
        <b class="rf-eln-nome">${escC(p.n)}</b>
        ${emTreino?'<img class="rf-eln-cone" src="img/treino-especial-cone.webp" width="13" height="13" alt="Em treino especial" title="Em treino especial — chance extra de evolução a cada rodada">':''}
        ${(p.suspended>0)?' 🟥':''}${(p.injuredMatches>0)?' ✚':''}
      </span>
      ${(typeof rfNacHTML==='function')?rfNacHTML(p,'rf-eln-c ctr'):''}
      <span class="rf-eln-c ctr">${escC(rfPosInicial(p.s))}</span>
      <span class="rf-eln-c dir">${p.age||'—'}</span>
      <b class="rf-eln-for dir">${p.f}</b>
      <span class="rf-eln-en"><i style="width:${en}%;background:${rfElnEnCor(en)}"></i></span>
      ${rfElnFormaHTML(p)}
      <span class="rf-eln-c dir">${escC(rfDin((typeof playerSalary==='function')?playerSalary(p):0))}</span>
      <span class="rf-eln-c dim dir">${escC(rfMkFimContrato(p))}</span>
    </div>`;
  }).join('');
  const setores=[['GK','GOLEIROS'],['DEF','DEFESA'],['MID','MEIO'],['ATT','ATAQUE']];
  const resumo=setores.map(([k,l])=>{
    const g=sq.filter(p=>p.s===k);
    const media=g.length?Math.round(g.reduce((t,p)=>t+(p.f||0),0)/g.length):0;
    return `<div class="rf-eln-setor"><span class="rf-fx-microt">${escC(l)}</span>
      <b class="rf-eln-setor-n">${g.length}</b>
      <span class="rf-eln-setor-s">${media?('força média '+media):'sem jogadores'}</span></div>`;
  }).join('');
  const seletor=[20,50,100].map(n=>`<span class="rf-eln-rows ${mostrar===n?'on':''}" onclick="rfElnRows(${n})">${n}</span>`).join('');
  return `
    <div class="rf-card rf-eln-band">
      ${crest?`<img class="rf-eln-crest" src="${escC(crest)}" alt="Escudo">`:(typeof clubCrestHTML==='function'?clubCrestHTML(clube):'')}
      <div class="rf-eln-band-id">
        <span class="rf-fx-microt">${escC(divLbl.toUpperCase())} · TEMPORADA ${escC(String(S.season||''))}</span>
        <b class="rf-eln-band-n">${escC(clube.name||clube.short||'—')}</b>
        <span class="rf-eln-band-s">${escC(pais)} · fundado em ${rfFxFundado(CL.clubId)}${pos?' · '+pos+'º na tabela':''}</span>
      </div>
      <div class="rf-eln-band-kpis">
        <div class="rf-eln-bk"><span class="rf-fx-microt">FORÇA MÉDIA</span><b>${fMedia}</b></div>
        <div class="rf-eln-bk"><span class="rf-fx-microt">IDADE MÉDIA</span><b>${String(idMedia).replace('.',',')}</b></div>
        <div class="rf-eln-bk oliva"><span class="rf-fx-microt">FOLHA / SEM</span><b>${escC(rfDin(folha))}</b></div>
      </div>
    </div>
    <div class="rf-card rf-eln-tbl">
      <div class="rf-label"><span class="rf-label-t">ELENCO PRINCIPAL</span>
        <span class="rf-label-r">${sq.length} no elenco</span></div>
      <div class="rf-eln-head rf-eln-g">
        <span>JOGADOR</span><span class="ctr">NAC</span><span class="ctr">POS</span><span class="dir">IDA</span>
        <span class="dir">FOR</span><span>ENERGIA</span><span class="ctr">FORMA</span><span class="dir">SALÁRIO</span><span class="dir">FIM</span>
      </div>
      <div class="rf-eln-list">${linhas||'<div class="rf-empty">Elenco vazio.</div>'}</div>
      <div class="rf-eln-foot">
        <span>mostrando ${lista.length} de ${sq.length}</span>
        <span class="rf-sp"></span>
        <span>linhas</span>${seletor}
      </div>
    </div>
    <div class="rf-card rf-eln-resumo">
      <span class="rf-fx-microt">RESUMO POR SETOR</span>
      <div class="rf-eln-setores">${resumo}</div>
    </div>`;
}

function rfSelPlayer(pid){ CL.selPlayer=pid; rfSetTab('elenco','ficha'); }

/* =====================================================================
   RENOVAR CONTRATO — o botão existia, a renovação não acontecia.

   `elenco-renovar` desenhava o salário, os anos e a chance de aceitar, e o
   botão "Oferecer renovação" não tinha `on:` nenhum: fechava o diálogo e o
   contrato ficava exatamente como estava. É o mesmo defeito que o "Promover"
   da Base tinha — a tela inteira construída, sem o fio até ao motor.

   Aqui não há função pronta para reaproveitar: o `clRenewPropose` da pele
   antiga lê `CL.newSalary`, um estado que só o painel antigo preenchia, e fixa
   três anos. Esta faz o mesmo trabalho a partir dos campos do diálogo novo, com
   a mesma regra de caixa e o mesmo efeito na moral.

   A CHANCE DE ACEITAR É REAL. O diálogo mostra uma percentagem; se ela fosse
   decorativa, oferecer o mínimo teria o mesmo resultado que oferecer o dobro.
   O sorteio usa a mesma conta que a tela imprime.
   ===================================================================== */
function rfElRenovarGo(pid){
  const p=squad(CL.clubId).find(x=>String(x.pid)===String(pid));
  if(!p){ toastC('Esse jogador não está mais no elenco.'); CL.acao=null; cdraw(); return; }
  const salAtual=(p.contract&&p.contract.salary)||p.salary||0;
  const novo=(typeof rfMkVal==='function')?rfMkVal('rf-ac-novo'):0;
  const anosEl=document.querySelector('#rf-ac-anos');
  const anos=Math.max(1,Math.min(6,parseInt(anosEl&&anosEl.textContent,10)||3));
  if(novo<=0){ toastC('Digite o novo salário.'); return; }
  if(novo<Math.round(salAtual*0.9)){
    toastC(`${p.n} não escuta menos do que ganha hoje.`); return; }

  /* CAIXA: a renovação não pode ser assinada com o clube no vermelho e a folha
     a subir — mesma regra do caminho antigo (clRenewPropose). */
  const semanas=(S.sched&&S.sched.length)||38;
  const extra=(novo-salAtual)*semanas*anos;
  if((S.budget||0)<0 && extra>0){ toastC('⚠️ Caixa insuficiente para renovar este contrato.'); return; }

  const chance=rfElChanceRenovar(p, novo);
  const R=(typeof makeRng==='function')?makeRng(hashSeed(S.seed,'renova',p.pid,S.round)):null;
  const sorte=R?R.random()*100:Math.random()*100;
  if(sorte>chance){
    p.moral=Math.max(0,(p.moral||70)-3);
    rfGravar();
    CL.acao=null;
    toastC(`${p.n} recusou a proposta. Ele quer mais.`);
    cdraw(); return;
  }
  p.contract=Object.assign({}, p.contract||{}, {salary:novo, years:anos});
  p.moral=Math.min(100,(p.moral||70)+6);
  S.roundNews=S.roundNews||[];
  S.roundNews.push(`✍️ ${p.n} renovou contrato: ${fmt(novo)}/mês por ${anos} ano${anos>1?'s':''}.`);
  rfGravar();
  CL.acao=null;
  rfAcAbrir('elenco-renovado', {nome:p.n, salario:novo, ate:(S.season||2026)+anos});
}
/* a mesma conta que o diálogo imprime — uma fonte só para o número e o sorteio */
function rfElChanceRenovar(p, novo){
  const sal=(p.contract&&p.contract.salary)||p.salary||0;
  return Math.max(5,Math.min(95, 50 + Math.round((novo-sal)/Math.max(1,sal)*140) - Math.max(0,(p.f||0)-70)));
}

/* =====================================================================
   2 · FICHA DO JOGADOR — pacote "Telas de Elenco e Ficha do Jogador" (24/08)
   Portado de telas-ref/telas/1-ficha-do-jogador-desktop.html.
   TUDO QUE EXISTE ENTRA REAL: os 16 atributos (p.attr), o hexágono (média
   simples dos atributos de cada eixo), a média da posição na divisão (o
   polígono tracejado é calculado dos elencos REAIS de DATA.clubs), os
   destaques da temporada (p.stats: cs/apps/goals/yellows/reds), contrato,
   comportamento, lesões, a carreira (p.transferHistory + p.mv0) e o ritmo
   de evolução (growthProfileOf — o MESMO cálculo do motor).
   O que o motor não guarda entra estável e sinalizado nos comentários:
   minutos = jogos×90; assistências = derivada determinística de gols/jogos;
   gols sofridos do goleiro = GA do TIME na temporada (o motor não separa
   por goleiro); ano de fundação = determinístico por clube.
   ===================================================================== */
const RF_FX_EIXOS_LINHA=[['FINALIZAÇÃO',['fin','cab']],['PASSE',['pas','cru','vis']],['DRIBLE',['dri','agi']],['DEFESA',['des','pos']],['FÍSICO',['vel','fis','res']],['MENTAL',['com','det']]];
const RF_FX_EIXOS_GK=[['REFLEXOS',['ref']],['MÃOS',['mao']],['POSICIONAMENTO',['pos']],['AGILIDADE',['agi']],['PASSE',['pas','cru','vis']],['FÍSICO',['vel','fis','res']]];
function rfFxEixos(p){ return p.s==='GK'?RF_FX_EIXOS_GK:RF_FX_EIXOS_LINHA; }
function rfFxEixoVal(a,keys){ let s=0,n=0; keys.forEach(k=>{ if(a&&a[k]!=null){ s+=a[k]; n++; } }); return n?Math.max(1,Math.min(20,Math.round(s/n))):10; }
/* o polígono tracejado é REAL: média dos eixos de todos os jogadores da MESMA posição
   nos elencos da divisão do usuário (DATA.clubs) — é o "média dos goleiros da série" */
function rfFxMediaEixos(p){
  const eixos=rfFxEixos(p); const sum=eixos.map(()=>0); let n=0;
  (DATA.clubs||[]).forEach(c=>{ (squad(c.id)||[]).forEach(x=>{
    if(x.s===p.s&&x.attr){ n++; eixos.forEach((e,i)=>{ sum[i]+=rfFxEixoVal(x.attr,e[1]); }); } }); });
  return n?sum.map(v=>v/n):null;
}
function rfFxHexPts(vals){
  const U=[[0,-1],[0.866,-0.5],[0.866,0.5],[0,1],[-0.866,0.5],[-0.866,-0.5]];
  return vals.map((v,i)=>{ const r=110*Math.max(0,Math.min(20,v))/20;
    return (150+U[i][0]*r).toFixed(1)+','+(150+U[i][1]*r).toFixed(1); }).join(' ');
}
function rfFxHexSVG(p){
  const eixos=rfFxEixos(p);
  const vals=eixos.map(e=>rfFxEixoVal(p.attr,e[1]));
  const media=rfFxMediaEixos(p);
  const anel=f=>{ const U=[[0,-1],[0.866,-0.5],[0.866,0.5],[0,1],[-0.866,0.5],[-0.866,-0.5]];
    return U.map(u=>(150+u[0]*110*f).toFixed(2)+','+(150+u[1]*110*f).toFixed(2)).join(' '); };
  const pts=rfFxHexPts(vals).split(' ');
  const lbl=[[150,14,31,'middle'],[262,80,97,'start'],[262,212,229,'start'],[150,278,295,'middle'],[38,212,229,'end'],[38,80,97,'end']];
  return `<svg viewBox="-74 4 448 300" preserveAspectRatio="xMidYMid meet" class="rf-fx-hex">
    <polygon points="${anel(1)}" fill="#f7faf5" stroke="#e6ece4" stroke-width="1.5"></polygon>
    <polygon points="${anel(0.75)}" fill="none" stroke="#e6ece4" stroke-width="1.5"></polygon>
    <polygon points="${anel(0.5)}" fill="none" stroke="#e6ece4" stroke-width="1.5"></polygon>
    <polygon points="${anel(0.25)}" fill="none" stroke="#e6ece4" stroke-width="1.5"></polygon>
    <g stroke="#e6ece4" stroke-width="1.5">${anel(1).split(' ').map(pt=>`<line x1="150" y1="150" x2="${pt.split(',')[0]}" y2="${pt.split(',')[1]}"></line>`).join('')}</g>
    ${media?`<polygon points="${rfFxHexPts(media)}" fill="none" stroke="#c3ccc5" stroke-width="2" stroke-dasharray="5 4"></polygon>`:''}
    <polygon points="${rfFxHexPts(vals)}" fill="rgba(139,154,31,.20)" stroke="#8b9a1f" stroke-width="2.5" stroke-linejoin="round"></polygon>
    <g fill="#8b9a1f">${pts.map((pt,i)=>`<circle cx="${pt.split(',')[0]}" cy="${pt.split(',')[1]}" r="${i===0?4.5:i===1?4:3.5}"></circle>`).join('')}</g>
    <g font-family="IBM Plex Mono, ui-monospace, monospace" font-size="10" font-weight="600" letter-spacing="0.1em" fill="#9aa79e">
      ${eixos.map((e,i)=>`<text x="${lbl[i][0]}" y="${lbl[i][1]}" text-anchor="${lbl[i][3]}">${escC(e[0])}</text>`).join('')}
    </g>
    <g font-family="IBM Plex Mono, ui-monospace, monospace" font-size="15" font-weight="700">
      ${vals.map((v,i)=>`<text x="${lbl[i][0]}" y="${lbl[i][2]}" text-anchor="${lbl[i][3]}" fill="${v>=15?'#6f7d18':'#3c4a41'}">${v}</text>`).join('')}
    </g>
  </svg>`;
}
/* ponto forte/fraco: maior e menor atributo. Jogador de linha não concorre nos
   atributos de goleiro (ref/mao são baixos por construção — seria sempre o "fraco"). */
function rfFxForteFraco(p){
  const a=p.attr||{}; const keys=(typeof ATTR_KEYS!=='undefined'?ATTR_KEYS:Object.keys(a))
    .filter(k=>a[k]!=null && (p.s==='GK'||(k!=='ref'&&k!=='mao')));
  if(!keys.length) return null;
  let hi=keys[0], lo=keys[0];
  keys.forEach(k=>{ if(a[k]>a[hi])hi=k; if(a[k]<a[lo])lo=k; });
  const L=(typeof ATTR_LABEL!=='undefined')?ATTR_LABEL:{};
  const nome=k=>String(L[k]||k).replace(' (GOL)','');
  return { hi:{k:hi,v:a[hi],n:nome(hi)}, lo:{k:lo,v:a[lo],n:nome(lo)} };
}
function rfFxAttrLinha(rot,v,forte){
  const cor=v>=15?'#6f7d18':v>=10?'#8b9a1f':v>=7?'#b9c94a':'#c3ccc5';
  const num=v>=15?'alto':v<=6?'baixo':'';
  return `<span class="rf-fx-attr"><span class="rf-fx-attr-n${forte?' forte':''}">${escC(rot)}</span>
    <span class="rf-fx-attr-b"><i style="width:${Math.round(100*v/20)}%;background:${cor}"></i></span>
    <span class="rf-fx-attr-v ${num}">${v}</span></span>`;
}
function rfFxGrupoHTML(titulo, pares, p, oliva, extraHTML){
  return `<div class="rf-fx-grupo"><span class="rf-fx-microt ${oliva?'oliva':''}">${escC(titulo)}</span>
    ${pares.map(([k,rot])=>rfFxAttrLinha(rot,(p.attr&&p.attr[k]!=null)?p.attr[k]:1, oliva)).join('')}${extraHTML||''}</div>`;
}
function rfFxDestaques(p){
  const st=p.stats||{}; const apps=st.apps||0;
  const forma=(typeof playerForma==='function')?playerForma(p):null;
  const notas=((st.r3)||[]).length;
  const gols=(S.scorers&&S.scorers[p.n])||st.goals||0;
  const cart=(st.yellows||0)+'A '+(st.reds||0)+'V';
  const beh=(typeof playerBehaviorLabel==='function')?playerBehaviorLabel(p):'';
  const cardMult=(typeof BEHAVIOR_CARD_MULT!=='undefined'&&BEHAVIOR_CARD_MULT[p.behavior])||1;
  const risco=cardMult>=2.4?'risco alto':cardMult>=1.7?'risco médio':'risco baixo';
  const c=(rot,val,sub,oliva)=>`<div class="rf-fx-dest ${oliva?'oliva':''}">
    <span class="rf-fx-microt">${escC(rot)}</span><b>${escC(val)}</b><span class="rf-fx-dest-s">${escC(sub)}</span></div>`;
  if(p.s==='GK'){
    /* gols sofridos POR GOLEIRO o motor não separa — entra o GA do TIME na temporada, dito assim */
    const ga=(S.table&&S.table[CL.clubId]&&S.table[CL.clubId].GA)||0;
    const jgs=(S.table&&S.table[CL.clubId]&&S.table[CL.clubId].P)||0;
    return c('SEM SOFRER GOL', String(st.cs||0), apps?('de '+apps+' jogos · '+Math.round(100*(st.cs||0)/apps)+'%'):'ainda sem jogos', true)
      + c('NOTA MÉDIA', forma!=null?notaTxt(forma):'—', notas?('últimos '+notas+' jogos'):'ainda sem nota')
      + c('JOGOS', String(apps), (apps*90).toLocaleString('pt-BR')+' minutos')
      + c('GOLS SOFRIDOS', String(ga), jgs?('do time · '+String(Math.round(10*ga/Math.max(1,jgs))/10).replace('.',',')+' por jogo'):'do time na temporada')
      + c('CARTÕES', cart, beh?(beh+' · '+risco):'');
  }
  /* assistências o motor não regista — número ESTÁVEL derivado de gols+jogos (não é aleatório) */
  const assist=Math.max(0, Math.round(gols*0.6+apps*0.08));
  return c('GOLS', String(gols), apps?('em '+apps+' jogos'):'ainda sem jogos', true)
    + c('NOTA MÉDIA', forma!=null?notaTxt(forma):'—', notas?('últimos '+notas+' jogos'):'ainda sem nota')
    + c('JOGOS', String(apps), (apps*90).toLocaleString('pt-BR')+' minutos')
    + c('ASSISTÊNCIAS', String(assist), 'na temporada')
    + c('CARTÕES', cart, beh?(beh+' · '+risco):'');
}
function rfFxCarreira(p){
  const st=p.stats||{}; const tot=(typeof careerHistTotals==='function')?careerHistTotals(p):{apps:0,goals:0};
  const nomeDe=id=>{ if(id==null) return 'Fora do país'; const c=(typeof anyClubOf==='function')?anyClubOf(id):null; return (c&&(c.short||c.name))||'—'; };
  const hist=(p.transferHistory||[]);
  const etapas=[];
  const cAtual=clubOf(CL.clubId)||{};
  const crest=(typeof clubCrestUrl==='function')?clubCrestUrl(cAtual):null;
  if(hist.length){
    const h0=hist[0];
    etapas.push({anos:'até '+(h0.season||S.season), clube:nomeDe(h0.from), sub:'clube formador',
      chips:['formado na base'], passe:p.mv0||0, delta:null, atual:false});
    hist.forEach((h,i)=>{
      const prox=hist[i+1];
      const ult=i===hist.length-1;
      const prev=i===0?(p.mv0||h.fee||0):(hist[i-1].fee||p.mv0||0);
      const valor=ult?rfVM(p):(h.fee||0);
      const base=ult?(h.fee||prev):prev;
      const delta=base?Math.round(100*(valor-base)/base):null;
      etapas.push({ anos:(h.season||'')+' — '+(prox?(prox.season||''):'hoje'),
        clube:nomeDe(h.to==null?CL.clubId:h.to), sub:ult?'clube atual':'transferência',
        chips: ult?[(st.apps||0)+' jogos','titular'].slice(0,(S.xi||[]).indexOf(p.pid)>=0?2:1)
                 :[(h.fee?('passe '+rfDin(h.fee)):'sem taxa')],
        passe:valor, delta, atual:ult });
    });
  } else {
    const delta=(p.mv0&&p.mv0!==rfVM(p))?Math.round(100*(rfVM(p)-p.mv0)/p.mv0):null;
    etapas.push({anos:'— hoje', clube:cAtual.short||'—', sub:'clube atual',
      chips:[(st.apps||0)+' jogos'].concat((S.xi||[]).indexOf(p.pid)>=0?['titular']:[]),
      passe:rfVM(p), delta, atual:true});
  }
  const mostra=etapas.slice(-3);
  const cols=mostra.length;
  const html=mostra.map(e=>{
    const dchip=e.delta==null?'<span class="rf-fx-passe-s">'+(e.atual&&etapas.length===1?'primeiro contrato':'')+'</span>'
      : e.delta>=0?`<span class="rf-fx-chip sobe">▲ +${e.delta}%</span>`
      : `<span class="rf-fx-chip cai">▼ ${e.delta}%</span>`;
    const corPasse=e.delta==null?'#3c4a41':(e.delta>=0?'#2f8f2f':'#c0453f');
    return `<div class="rf-fx-etapa ${e.atual?'atual':''}">
      <div class="rf-fx-etapa-tl"><i></i><span></span></div>
      <span class="rf-fx-etapa-anos">${escC(String(e.anos))}</span>
      <span class="rf-fx-etapa-clube">${e.atual&&crest?`<img src="${escC(crest)}" alt="">`:''}${escC(e.clube)}</span>
      <span class="rf-fx-etapa-sub">${escC(e.sub)}</span>
      <div class="rf-fx-etapa-chips">${e.chips.map(ch=>`<span class="rf-fx-chip ${e.atual?'oliva':''}">${escC(ch)}</span>`).join('')}</div>
      <div class="rf-fx-passe"><span class="rf-fx-microt">PASSE</span>
        <b style="color:${corPasse}">${escC(rfDin(e.passe||0))}</b>${dchip}</div>
    </div>`;
  }).join('');
  return { html:`<div class="rf-fx-carreira" style="--etapas:${cols}">${html}</div>`,
    resumo:(tot.apps||0)+' jogos · '+(tot.goals||0)+' gols · '+Math.max(1,etapas.length)+' clube'+(etapas.length>1?'s':'') };
}
function rfFxEvolucaoHTML(p){
  const g=(typeof growthProfileOf==='function')?growthProfileOf(p):null;
  if(!g) return '';
  const r=(typeof ritmoLabel==='function')?ritmoLabel(g.forcaPorTemporada):{txt:'—',cls:''};
  const corR=r.cls==='rapido'?'#2f8f2f':r.cls==='parado'?'#c0453f':'#3c4a41';
  const fontes=g.fontes.slice(0,3).map(f=>
    `<span class="rf-fx-linha"><span class="rf-sp2">${f.sinal>0?'▲':'▼'} ${escC(f.label)}</span><b style="color:${f.sinal>0?'#2f8f2f':'#c0453f'}">${(typeof ritmoPct==='function')?ritmoPct(f.chance):''}/rodada</b></span>`).join('');
  const vazio=`<div class="rf-fx-aviso"><img src="img/treino-especial-cone.webp" width="14" height="14" alt="" style="opacity:.45">
    <span>${p.age>=31?'Fora da faixa de crescimento pela idade. Treino especial não rende mais neste jogador.':'Precisa jogar bem (nota ≥ 6,8) ou entrar em treino especial para evoluir.'}</span></div>`;
  const salto=Math.round((g.porPonto||0)*10)/10;
  return `<div class="rf-card rf-fx-card rf-fx-evolucao">
    <span class="rf-fx-microt">COMO A FORÇA EVOLUI</span>
    <span class="rf-fx-linha"><span>Ritmo de evolução</span><b style="color:${corR}">${escC(r.txt)}</b></span>
    ${fontes||vazio}
    <span class="rf-fx-linha"><span class="rf-sp2">No ritmo de agora</span><b>${(typeof ritmoNum==='function')?ritmoNum(g.forcaPorTemporada):''} de força / temporada</b></span>
    <span class="rf-fx-nota">Nesta faixa da escala, cada ponto de atributo vale ~${String(salto).replace('.',',')} de força.</span>
  </div>`;
}
function rfElFichaHTML(){
  const sq=squad(CL.clubId);
  const p=sq.find(x=>x.pid===CL.selPlayer)||sq[0];
  if(!p) return rfCol(rfCard('Ficha do jogador','<div class="rf-empty">Selecciona um jogador no Elenco.</div>'));
  const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};
  const num=nums[p.pid]||p.num||'';
  const en=Math.round(p.energy!=null?p.energy:100);
  const moral=Math.round(p.moral!=null?p.moral:70);
  const clube=clubOf(CL.clubId)||{};
  const crest=(typeof clubCrestUrl==='function')?clubCrestUrl(clube):null;
  const divLbl=(typeof DIV_LABEL_FULL!=='undefined'&&DIV_LABEL_FULL[S.division])||('Série '+S.division);
  const pais=(typeof universeCountryInfo==='function')?((universeCountryInfo()||{}).name||''):'';
  const ff=rfFxForteFraco(p);
  const ehGK=p.s==='GK';
  const perfil={GK:'PERFIL DE GOLEIRO',DEF:'PERFIL DE DEFENSOR',MID:'PERFIL DE MEIO-CAMPISTA',ATT:'PERFIL DE ATACANTE'}[p.s]||'PERFIL DO JOGADOR';
  const carreira=rfFxCarreira(p);
  const tot=(typeof careerHistTotals==='function')?careerHistTotals(p):{injuries:0};
  const sal=(typeof playerSalary==='function')?playerSalary(p):0;
  const notaGK=`Reflexos e mãos pesam 64% da força de um goleiro e entram direto no rating dele na partida.`;
  const notaLinha=`Finalização decide quem marca o gol e quem bate pênalti — um artilheiro nato finaliza melhor que um "faz-tudo" da mesma força.`;
  return `
    <div class="rf-card rf-fx-ident">
      ${crest?`<img class="rf-fx-ident-crest" src="${escC(crest)}" alt="Escudo">`:(typeof clubCrestHTML==='function'?clubCrestHTML(clube):'')}
      <div class="rf-fx-ident-id">
        <div class="rf-fx-ident-l1"><span class="rf-fx-num">${escC(String(num))}</span><b>${escC(p.n)}</b></div>
        <span class="rf-fx-ident-sub">${escC(rfPosInicial(p.s))} · ${p.age||'?'} anos · ${p.ft==='L'?'canhoto':'destro'}${p.nat?' · '+((typeof rfNacHTML==='function')?rfNacHTML(p)+' ':'')+escC(p.nat):''} · ${escC(clube.short||'')}</span>
      </div>
      <div class="rf-fx-ident-acts">
        <button type="button" class="rf-btn rf-btn-cta" onclick="rfAcAbrir('elenco-renovar',{pid:'${escC(p.pid)}'})">Renovar contrato</button>
        <button type="button" class="rf-btn rf-btn-vender" onclick="rfAcAbrir('mkt-listar',{pid:'${escC(p.pid)}'})">Listar para venda</button>
      </div>
    </div>
    <div class="rf-fx-destaques">${rfFxDestaques(p)}</div>
    <div class="rf-fx-grid">
      <div class="rf-card rf-fx-card rf-fx-carac">
        <div class="rf-fx-carac-hd"><span class="rf-fx-microt">CARACTERÍSTICAS · ${escC(perfil)}</span>
          <span class="rf-sp"></span>
          <span class="rf-fx-legenda"><i></i>MÉDIA DA POSIÇÃO NA SÉRIE</span></div>
        <div class="rf-fx-carac-grid">
          <div class="rf-fx-retrato">
            ${rfFxFotoComposta(p, crest)}
            <i class="rf-fx-retrato-veu"></i>
            <span class="rf-fx-num flutua">${escC(String(num))}</span>
            ${(crest && rfFxFoto(p)==='img/jogador-perfil.png')?`<img class="rf-fx-retrato-crest" src="${escC(crest)}" alt="">`:''}
            <span class="rf-fx-retrato-id">
              <span class="rf-fx-microt claro">${escC(String(rfPosLabel(p.s)).toUpperCase())} · ${p.age||'?'} ANOS</span>
              <b>${escC(p.n)}</b>
              <span class="rf-fx-retrato-f"><b>${p.f}</b><i>DE FORÇA</i></span>
            </span>
          </div>
          <div class="rf-fx-hexcol">
            ${rfFxHexSVG(p)}
            ${ff?`<div class="rf-fx-ff">
              <span class="rf-fx-ffchip forte"><b>${ff.hi.v}</b><span><i>PONTO FORTE</i>${escC(ff.hi.n)}</span></span>
              <span class="rf-fx-ffchip fraco"><b>${ff.lo.v}</b><span><i>PONTO FRACO</i>${escC(ff.lo.n)}</span></span>
            </div>`:''}
          </div>
          <div class="rf-fx-attrs">
            ${rfFxGrupoHTML('TÉCNICOS',[['fin','Finalização'],['pas','Passe'],['dri','Drible'],['des','Desarme'],['cab','Cabeceio'],['cru','Cruzamento']],p)}
            ${rfFxGrupoHTML('MENTAIS',[['vis','Visão de jogo'],['pos','Posicionamento'],['com','Compostura'],['det','Determinação']],p)}
            ${rfFxGrupoHTML('FÍSICOS',[['vel','Velocidade'],['res','Resistência'],['fis','Força física'],['agi','Agilidade']],p)}
            ${rfFxGrupoHTML('GOLEIRO',[['ref','Reflexos'],['mao','Defesa/mãos']],p,ehGK,
              `<span class="rf-fx-nota caixa">${escC(ehGK?notaGK:notaLinha)}</span>`)}
          </div>
        </div>
        <span class="rf-fx-rodape">Os 16 atributos vão de 1 a 20 e evoluem rodada a rodada. Eles alimentam a força do jogador pelo perfil da posição — e finalização, reflexos e mãos ainda entram direto na partida, decidindo gol, pênalti e defesa.</span>
      </div>
      <div class="rf-fx-lateral">
        <div class="rf-card rf-fx-card">
          <span class="rf-fx-microt">CLUBE</span>
          <div class="rf-fx-clube">
            ${crest?`<img src="${escC(crest)}" alt="Escudo">`:''}
            <span><b>${escC(clube.name||clube.short||'—')}</b>
              <span class="rf-fx-clube-s">${escC(divLbl)} · ${escC(pais)}</span>
              <span class="rf-fx-clube-f">Fundado em ${rfFxFundado(CL.clubId)}</span></span>
          </div>
        </div>
        <div class="rf-card rf-fx-card">
          <span class="rf-fx-microt">NA PARTIDA</span>
          <div class="rf-fx-barras">
            <span>Força</span><span class="rf-fx-barra"><i style="width:${Math.min(100,p.f)}%;background:#8b9a1f"></i></span><b>${p.f}</b>
            <span>Energia</span><span class="rf-fx-barra"><i style="width:${en}%;background:${rfElnEnCor(en)}"></i></span><b>${en}%</b>
            <span>Moral</span><span class="rf-fx-barra"><i style="width:${moral}%;background:linear-gradient(90deg,#b9c94a,#f2b90c)"></i></span><b>${moral}</b>
          </div>
          <span class="rf-fx-nota">A energia multiplica a força dentro do jogo e a moral do time abaixo de 50 corta 15% de tudo.</span>
        </div>
        <div class="rf-card rf-fx-card">
          <span class="rf-fx-microt">CONTRATO E MORAL</span>
          <span class="rf-fx-linha"><span class="rf-sp2">Salário</span><b>${escC(rfDin(sal))}</b></span>
          <span class="rf-fx-linha"><span class="rf-sp2">Fim do contrato</span><b>${escC(rfMkFimContrato(p))}</b></span>
          <span class="rf-fx-linha"><span class="rf-sp2">Valor de mercado</span><b>${escC(rfDin(rfVM(p)))}</b></span>
          <span class="rf-fx-linha"><span class="rf-sp2">Comportamento</span><b>${escC((typeof playerBehaviorLabel==='function')?playerBehaviorLabel(p):'—')}</b></span>
          <span class="rf-fx-linha"><span class="rf-sp2">Lesões na carreira</span><b>${tot.injuries||0}</b></span>
        </div>
      </div>
    </div>
    <div class="rf-fx-grid">
      <div class="rf-card rf-fx-card">
        <div class="rf-fx-carac-hd"><span class="rf-fx-microt">CARREIRA</span><span class="rf-sp"></span>
          <span class="rf-fx-legenda sem-traco">${escC(carreira.resumo)}</span></div>
        ${carreira.html}
      </div>
      ${rfFxEvolucaoHTML(p)}
    </div>`;
}

/* =====================================================================
   3 · BASE
   Grade do pacote: nome / 28 / 30 / 34 / 74 / 74 / 74 / 74
   ===================================================================== */
const RF_BASE_COLS='minmax(0,1.2fr) 34px 40px 40px minmax(74px,.5fr) minmax(74px,.5fr) minmax(74px,.5fr) minmax(74px,.5fr)';
/* POTENCIAL e PRONTO EM são DERIVADOS — o motor não guarda nenhum dos dois.
   O garoto tem força e idade, e o crescimento sai de growthProfileOf; então
   o potencial é a força projetada até os 24 e o "pronto em" é quanto falta
   pra lá. Quando ligarmos a base de verdade, é só trocar as duas contas. */
function rfElPotencial(y){
  const g=(typeof growthProfileOf==='function')?growthProfileOf(y):null;
  const porTemp=(g&&g.forcaPorTemporada)||2;
  const anos=Math.max(0, 24-(y.age||18));
  /* ARREDONDADO. A forca do motor e fracionaria (33.509940930...) e o teto
     herdava as casas todas — a tela mostrava "pode chegar a 41.8199404". Numero
     de forca le-se inteiro; a precisao interna continua intacta no motor. */
  const teto=Math.round(Math.min(99,(y.f||0)+porTemp*anos));
  return {teto, anos, pct:Math.round(100*teto/99)};
}
function rfElBaseHTML(){
  const disp=(typeof youthAvailable==='function')&&youthAvailable();
  // o lote da rodada é o que o motor tem de "categoria de base"
  if(disp && !(S._youthCandidates && S._youthCandidates.length && S._youthCandidatesRound===S.round)
     && typeof rollYouthCandidatesForRound==='function') rollYouthCandidatesForRound();
  const cands=(S._youthCandidates||[]);
  const linhas=cands.map((c,i)=>{
    const y=c.youth; if(!y) return '';
    const pot=rfElPotencial(y);
    /* A ESCOLHA É DE QUEM JOGA. Todas as linhas chamavam `rfAcPromover()` sem
       argumento, e essa função abria sempre o mais forte do lote: clicar no
       terceiro garoto abria a ficha do primeiro. E a segunda e a terceira linha
       diziam "Ver", que não levava a lado nenhum diferente. Agora cada linha
       leva o seu índice e todas dizem Promover — são três candidatos, e o lote
       só dá para promover um. */
    const primeiro=i===(CL.baseSel||0);
    const sal=(c.contract&&c.contract.salary)||y.salary||0;
    return `<div class="rf-el-row ${primeiro?'sel':''}" onclick="rfBaseSel(${i})">
      <span class="rf-el-nome">${escC(y.n)}</span>
      <span class="rf-el-c">${escC(rfPosInicial(y.s))}</span>
      <span class="rf-el-c">${y.age||'—'}</span>
      <span class="rf-el-forte">${y.f}</span>
      ${rfElMini(pot.pct, rfElTom(pot.pct), 62)}
      <span class="rf-el-d">${pot.anos?(pot.anos+' ano'+(pot.anos>1?'s':'')):'agora'}</span>
      <span class="rf-el-d">${escC(sal?rfDin(sal):'—')}</span>
      <span class="rf-el-act"><button type="button" class="rf-el-bt ${primeiro?'cta':''}"
        onclick="event.stopPropagation();rfAcPromover(${i})">Promover</button></span>
    </div>`;
  }).join('');
  const cab=`<div class="rf-el-head" style="--el-cols:${RF_BASE_COLS}">
    <span>JOGADOR</span><span>POS</span><span>IDA</span><span>FOR</span>
    <span>POTENCIAL</span><span>PRONTO EM</span><span class="dir">SALÁRIO</span><span></span>
  </div>`;
  // INVESTIMENTO NA BASE: gasto sai da soma dos contratos do lote. Nível do CT
  // e vendas da base o motor não tem — entram como traço, não como número
  // inventado.
  const gasto=cands.reduce((t,c)=>t+(((c.contract&&c.contract.salary)||0)),0);
  const promovidos=(S.youthPromotedSeason===S.season)?1:0;
  return `<div class="rf-card rf-el-tbl" data-el="base" style="--el-cols:${RF_BASE_COLS}">
      <div class="rf-label"><span class="rf-label-t">CATEGORIA DE BASE</span>
        <span class="rf-label-r">${cands.length} em formação</span></div>
      ${cab}
      ${linhas || `<div class="rf-empty">${escC((typeof youthUnavailableMsg==='function'&&!disp)?youthUnavailableMsg():'A base não tem candidatos nesta semana.')}</div>`}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">INVESTIMENTO NA BASE</span></div>
      <div class="rf-el-stats">
        ${rfElStat('GASTO POR MÊS', gasto?rfDin(gasto):'R$ 0')}
        ${rfElStat('NÍVEL DO CT', '—', 'o motor ainda não tem CT')}
        ${rfElStat('PROMOVIDOS EM '+(S.season||''), promovidos, promovidos?'cota da temporada usada':'cota livre')}
        ${rfElStat('VENDIDOS DA BASE', '—', 'sem histórico por origem')}
      </div>
    </div>`;
}

/* =====================================================================
   4 · TREINO ESPECIAL

   ESTA TELA EXPLICAVA TRÊS MECÂNICAS QUE NÃO EXISTEM.

   Havia um "FOCO DO TREINO" com três temas e promessas concretas ("+2 na
   finalização de até 3 atacantes"), que o próprio código admitia não estarem
   ligados a nada. Havia um bloco "CUSTO E RISCO" a dizer que o treino gasta
   energia e dobra o risco de lesão — o motor não cobra energia nenhuma. E
   havia um diálogo de confirmação semanal com "−10% de energia por jogador",
   igualmente inventado. Por cima disso tudo, a coluna PROGRESSO mostrava
   `rodada % 38 / 38`: o andamento da TEMPORADA, idêntico em todas as linhas.

   O que o motor faz é uma coisa só, e cabe numa frase: até três jogadores em
   treino, e quem está em treino ganha um sorteio extra de evolução por rodada
   (5%, ou 9% com destaque). Sem custo. É isso que a tela passa a dizer.

   O resto do ecrã agora vem de `growthProfileOf(p)`, que é o mesmo cálculo do
   `evolvePlayer` lido de fora: dá a chance real por fonte e o ganho de força
   por temporada. Números do motor, não promessas.
   ===================================================================== */
const RF_TRN_COLS='34px minmax(0,1.2fr) 34px 40px minmax(74px,.5fr) minmax(0,1fr) minmax(74px,.5fr)';
/* "+1,7 força" / "sem ganho previsto" */
function rfTrnGanho(g){
  const v=Math.round(((g&&g.forcaPorTemporada)||0)*10)/10;
  if(!v) return {txt:'sem ganho previsto', v:0};
  const sinal=v>0?'+':'−';
  return {txt:sinal+String(Math.abs(v)).replace('.',',')+' força por temporada', v};
}
/* a chance do sorteio do treino, em percentagem inteira */
function rfTrnChance(p){
  const star=(typeof hasEstrelinha==='function')&&hasEstrelinha(p);
  return {pct:star?9:5, star};
}
function rfElTreinoHTML(){
  const lista=(typeof myTrainingList==='function')?myTrainingList():[];
  const max=(typeof TRAINING_MAX_SLOTS!=='undefined')?TRAINING_MAX_SLOTS:3;
  const sq=squad(CL.clubId);
  const emTreino=new Set(lista.map(String));
  const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};

  /* A LISTA É O ELENCO INTEIRO, ordenado por quem mais cresce agora — e não só
     os três já escolhidos. Antes, para pôr alguém em treino era preciso achar um
     botão que abria OUTRO ecrã com outra lista; a escolha e a consequência
     viviam em sítios diferentes. Aqui vê-se, na mesma linha, quanto o jogador
     cresce e o botão que o põe a treinar. */
  const comG=sq.map(p=>({p, g:(typeof growthProfileOf==='function')?growthProfileOf(p):null}))
    .sort((a,b)=>{
      const ta=emTreino.has(String(a.p.pid))?1:0, tb=emTreino.has(String(b.p.pid))?1:0;
      if(ta!==tb) return tb-ta;                       // quem já treina fica em cima
      return ((b.g&&b.g.forcaPorTemporada)||0)-((a.g&&a.g.forcaPorTemporada)||0);
    });

  const linhas=comG.map(({p,g})=>{
    const treina=emTreino.has(String(p.pid));
    const ganho=rfTrnGanho(g);
    const ch=rfTrnChance(p);
    const cheio=lista.length>=max;
    return `<div class="rf-el-row ${treina?'sel':''}">
      ${rfElCamisa(nums[p.pid]||p.num||'', '', p)}
      <!-- o crescimento aparece DUAS vezes de propósito: como coluna no
           computador e como segunda linha do nome no telefone, onde a coluna
           de ação fica presa à direita e taparia a coluna. Só uma delas está
           visível de cada vez (ver rf26.css). -->
      <span class="rf-el-nome">${escC(p.n)}${ch.star?' <i class="rf-trn-star" title="Destaque: evolui mais rápido">★</i>':''}
        <i class="rf-el-sub ${ganho.v<0?'cai':(ganho.v>0?'sobe':'')}">${escC(ganho.txt)}</i></span>
      <span class="rf-el-c">${escC(rfPosInicial(p.s))}</span>
      <span class="rf-el-forte">${p.f}</span>
      <span class="rf-el-c">${p.age||'—'} anos</span>
      <span class="rf-el-ganho ${ganho.v<0?'cai':(ganho.v>0?'sobe':'')}">${escC(ganho.txt)}</span>
      <span class="rf-el-act"><button type="button"
        class="rf-el-bt ${treina?'perigo':'cta'}" ${(!treina&&cheio)?'disabled title="As 3 vagas estão ocupadas"':''}
        onclick="event.stopPropagation();rfTrnToggle('${escC(p.pid)}')">${treina?'Tirar':'Treinar'}</button></span>
    </div>`;
  }).join('');

  const cab=`<div class="rf-el-head" style="--el-cols:${RF_TRN_COLS}">
    <span></span><span>JOGADOR</span><span>POS</span><span class="dir">FOR</span>
    <span class="dir">IDADE</span><span class="dir">CRESCIMENTO PREVISTO</span><span></span>
  </div>`;

  /* Quem está em treino, dito por extenso: nome e a chance dele. Três linhas,
     não uma tabela — é a resposta a "o que é que eu estou a ganhar com isto". */
  const dentro=lista.map(pid=>{
    const p=sq.find(x=>x.pid===pid); if(!p) return '';
    const ch=rfTrnChance(p);
    return `<div class="rf-linha"><span class="rf-linha-t">${escC(p.n)}${ch.star?' ★':''}</span>
      <span class="rf-linha-v">+${ch.pct}% de evoluir por semana</span></div>`;
  }).join('');

  return `<div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">COMO FUNCIONA</span>
        <span class="rf-label-r">${lista.length} de ${max} vagas</span></div>
      <span class="rf-el-texto">Até <b>${max} jogadores</b> podem estar em treino especial ao mesmo
        tempo. Quem está em treino ganha <b>um sorteio extra de evolução por semana</b> — 5% de
        chance, ou 9% para quem é destaque (★). <b>Não custa dinheiro nem energia</b>, e pode-se
        trocar quem treina quando se quiser.</span>
      ${dentro || '<span class="rf-note">Ninguém em treino. As três vagas estão livres.</span>'}
    </div>
    <div class="rf-card rf-el-tbl" data-el="treino" style="--el-cols:${RF_TRN_COLS}">
      <div class="rf-label"><span class="rf-label-t">QUEM PODE TREINAR</span>
        <span class="rf-label-r">do que mais cresce ao que menos cresce</span></div>
      ${cab}
      ${linhas || '<div class="rf-empty">Elenco vazio.</div>'}
    </div>
    <div class="rf-card">
      <div class="rf-label"><span class="rf-label-t">DE ONDE VEM O CRESCIMENTO</span></div>
      <span class="rf-el-texto">A força não sobe sozinha: o jogador ganha ponto de atributo, e a
        força é a média deles. <b>Jogar bem</b> é a maior fonte — nota acima de 6,8 dá dois
        sorteios por semana. <b>Ter até 20 anos</b> dá um sorteio mesmo sem jogar. O
        <b>treino especial</b> soma o dele por cima. A partir dos <b>29 anos</b> começa o
        desgaste, e quem passa <b>4 semanas seguidas fora do time</b> perde ritmo — treinar
        protege dessa perda.</span>
    </div>`;
}
function rfTrnToggle(pid){
  const lista=(typeof myTrainingList==='function')?myTrainingList():[];
  const treina=lista.map(String).indexOf(String(pid))>=0;
  if(treina){
    if(typeof stopTraining==='function') stopTraining(pid);
    const p=squad(CL.clubId).find(x=>String(x.pid)===String(pid));
    toastC((p?p.n:'Jogador')+' saiu do treino especial.');
  }else{
    const r=(typeof startTraining==='function')?startTraining(pid):{ok:false,msg:'Treino indisponível.'};
    toastC(r.msg||'');
    if(!r.ok){ cdraw(); return; }
  }
  rfGravar();
  cdraw();
}
/* ---- as duas ações que precisam de dado antes de abrir o diálogo ---- */
/* PROMOVER: o pacote desenha a confirmação de UM garoto, não a lista.
   Quem escolhe continua sendo a tela da base do motor; aqui abrimos a
   confirmação já com o candidato que ela devolve. */
function rfAcPromover(idx){
  // A base sorteia UM LOTE por rodada (S._youthCandidates). O pacote
  // desenha a confirmação de um garoto, então abrimos com o mais forte do
  // lote. Sem lote — janela fechada, cota usada, elenco cheio — o diálogo
  // é o "não dá para promover", com o motivo que o motor dá. NUNCA cai no
  // modal antigo: ele não existe mais nesta pele.
  if(typeof youthAvailable!=='function' || !youthAvailable()){
    rfAcAbrir('elenco-semrenovar', {motivo:(typeof youthUnavailableMsg==='function')
      ? youthUnavailableMsg() : 'A base não tem ninguém pronto agora.'});
    return;
  }
  if(!(S._youthCandidates && S._youthCandidates.length && S._youthCandidatesRound===S.round)
     && typeof rollYouthCandidatesForRound==='function') rollYouthCandidatesForRound();
  // o candidato é um invólucro: o jogador de verdade mora em c.youth
  const lote=S._youthCandidates||[];
  const i=(idx!=null && lote[idx]) ? idx : (CL.baseSel||0);
  const c=lote[i];
  const y=c&&c.youth;
  if(!y){ rfAcAbrir('elenco-semrenovar', {motivo:'A base não tem candidatos nesta semana.'}); return; }
  const pot=rfElPotencial(y);
  rfAcAbrir('base-promover', {idx:i, p:y, pronto:pot.anos?(pot.anos+' ano'+(pot.anos>1?'s':'')):'agora',
    teto:pot.teto, salario:(c.contract&&c.contract.salary)||y.salary||0, num:y.num});
}
function rfBaseSel(i){ CL.baseSel=i; cdraw(); }
/* A PROMOÇÃO ACONTECE AQUI — e antes não acontecia em lado nenhum. O diálogo
   `base-promover` tinha o botão "Promover" sem `on:` nenhum: clicava, fechava,
   e o garoto continuava na base. O motor já tinha tudo pronto
   (`confirmYouthPromotion`), faltava o fio. */
function rfBasePromoverGo(idx){
  const c=(S._youthCandidates||[])[idx];
  if(!c || !c.youth){ toastC('Esse candidato não está mais disponível.'); CL.acao=null; cdraw(); return; }
  if(typeof youthAvailable==='function' && !youthAvailable()){
    toastC((typeof youthUnavailableMsg==='function')?youthUnavailableMsg():'Não dá para promover agora.');
    CL.acao=null; cdraw(); return;
  }
  const nome=c.youth.n, forca=c.youth.f;
  try{ confirmYouthPromotion(c); }
  catch(e){ toastC('Não foi possível promover: '+(e&&e.message||'erro')); CL.acao=null; cdraw(); return; }
  CL.baseSel=0; CL.acao=null;
  toastC('🌱 '+nome+' subiu para o elenco principal (força '+forca+').');
  cdraw();
}
/* `rfAcTreino` saiu com o resto do treino inventado: ela abria o diálogo
   `treino-confirmar`, que anunciava "−10% de energia por jogador" — um custo
   que o motor nunca cobrou. Pôr e tirar do treino agora acontece na própria
   linha da tabela (rfTrnToggle), sem confirmação, porque não há nada a
   confirmar: a troca é reversível e não custa nada. */

/* ---- cabeçalho da página: o subtítulo conta o elenco, e as duas ações do
   pacote ficam no canto (a amarela leva pra Formação, que é onde se escala) ---- */
function rfElSubHTML(){
  const sq=squad(CL.clubId);
  const base=(S._youthCandidates&&S._youthCandidatesRound===S.round)?S._youthCandidates.length:0;
  const folha=sq.reduce((t,p)=>t+(typeof playerSalary==='function'?playerSalary(p):0),0);
  return `${sq.length} no principal · ${base} na base · folha ${fmt(folha)}/sem`;
}
function rfElAcoesHTML(){
  return `<div class="rf-mk-acoes">
    <button type="button" class="rf-btn rf-btn-secondary" onclick="rfElExportar()">${rfIcone('exportar',16)} Exportar elenco</button>
    <button type="button" class="rf-btn rf-btn-cta" onclick="rfGo('hub')">${rfIcone('jogar',16)} Ir para a formação</button>
  </div>`;
}
function rfElExportar(){
  const sq=squad(CL.clubId).slice().sort(bySquadOrder);
  const nums=(typeof clubShirtNumbers==='function')?clubShirtNumbers(CL.clubId):{};
  const linhas=sq.map(p=>[nums[p.pid]||p.num||'', p.n, rfPosInicial(p.s), p.age||'', p.f,
    Math.round(p.energy!=null?p.energy:100), rfMkSalario(p), rfMkFimContrato(p)].join(';'));
  const txt='numero;jogador;pos;idade;forca;energia;salario;fim\n'+linhas.join('\n');
  try{
    const a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(txt);
    a.download='elenco-'+(S.season||'')+'.csv'; a.click();
    toastC('Elenco exportado.');
  }catch(e){ toastC('Não deu pra exportar aqui.'); }
}
