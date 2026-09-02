/* =====================================================================
   RetroFoot98 — CERIMÔNIA DO SORTEIO
   Pacote "Sorteio das Competições" (desktop + mobile).

   UM DESENHO SÓ, PARA TODAS AS COMPETIÇÕES. Antes havia três miolos e um
   painel de 270px; agora é um palco de gala com a mesma estrutura em toda a
   parte — chips, barra da competição, palco do troféu com a premiação, e um
   painel de abas à direita. Uma competição nova não precisa de tela nova:
   precisa de um tema (quatro variáveis CSS) e dos dados que o save já tem.

   O QUE VEM DO JOGO, E NÃO DO PACOTE. O handoff avisa que os nomes e troféus
   mudaram depois do design, e avisa bem:
     · nome da competição  -> COMP_DEFS (o pacote oficial já os renomeia:
       "Liberta Cup", "Copa da Federação")
     · troféu              -> TROPHIES, o mesmo mapa da tela de jogos ao vivo
     · premiação por fase  -> PRIZES.CUP / PRIZES.CB_PHASE, os valores reais
     · clubes              -> S.cups[key], sorteados de verdade
   Nada do protótipo é copiado como verdade: só o layout.

   LAYOUT PRIMEIRO. Onde o save ainda não tem o dado (títulos do campeão
   atual), o texto fica curto e honesto em vez de inventado.
   ===================================================================== */

/* ---- temas: os MESMOS gradientes da barra de jogos ao vivo ---- */
const RF_SRT_TEMAS = {
  copaBrasil:      { grad:'linear-gradient(100deg,#06301a,#0b4d28 46%,#1f8f4a)', ac:'#9be8b8', ink:'#c9f5da', glow:'rgba(46,180,105,.34)', moeda:'R$' },
  libertadores:    { grad:'linear-gradient(100deg,#2b1b02,#7d550b 44%,#c69526)', ac:'#f7dd8e', ink:'#ffeab5', glow:'rgba(242,185,12,.4)',  moeda:'US$' },
  sulamericana:    { grad:'linear-gradient(100deg,#14181c,#2e363d 52%,#7f8a94)', ac:'#dfe6ec', ink:'#eef2f6', glow:'rgba(200,214,228,.3)', moeda:'US$' },
  championsLeague: { grad:'linear-gradient(100deg,#08122e,#12306e 46%,#2f5fb8)', ac:'#a9c6ff', ink:'#d3e2ff', glow:'rgba(60,120,230,.34)',  moeda:'€'  },
  europaLeague:    { grad:'linear-gradient(100deg,#221004,#6b3a08 46%,#c4761f)', ac:'#ffc890', ink:'#ffe0bd', glow:'rgba(220,130,40,.34)',  moeda:'€'  },
};
/* competição que ainda não tem tema herda o cinza da Sul-Americana: é neutro e
   nunca finge ser outra competição. */
function rfSrtTema(key){ return RF_SRT_TEMAS[key] || RF_SRT_TEMAS.sulamericana; }
function rfSrtVars(key){ const t=rfSrtTema(key);
  return `--sg:${t.grad};--sa:${t.ac};--si:${t.ink};--sw:${t.glow}`; }

/* ---- o troféu como imagem de fundo: o palco e a barra pedem `background-image`,
   e TROPHIES guarda um data: URI, então serve aos dois sem ida à rede ---- */
function rfSrtTrofeuBg(key){
  const src=(typeof TROPHIES!=='undefined') && TROPHIES[key];
  return src ? `background-image:url('${src}')` : '';
}

/* ---- PREMIAÇÃO POR FASE, dos valores REAIS ----
   PRIZES.CUP tem a tabela por fase alcançada de cada categoria; a Copa do Brasil
   é a exceção, porque paga por fase VENCIDA durante a temporada (CB_PHASE). Ler
   daqui é o que faz a cerimônia prometer o que o caixa vai mesmo pagar. */
function rfSrtPremios(key){
  if(typeof PRIZES==='undefined') return [];
  const din=v=>{
    if(!v) return '—';
    if(v>=1e6){ const m=v/1e6; return (Math.round(m*100)/100).toString().replace('.',',')+' mi'; }
    return Math.round(v/1000)+' mil';
  };
  if(key==='copaBrasil'){
    const P=PRIZES.CB_PHASE||{};
    return [['Campeão',din(P.final)],['Vice-campeão',din(P.vice)],['Semifinal',din(P.semi)],
            ['Quartas de final',din(P.quartas)],['Oitavas de final',din(P.oitavas)],
            ['16 avos de final',din(P.dezesseis)],['1ª e 2ª fase',din(P.f1)]];
  }
  const t=(PRIZES.CUP||{})[PRIZES.cupCategory?PRIZES.cupCategory(key):'nat'];
  if(!t) return [];
  return [['Campeão',din(t.campeao)],['Vice-campeão',din(t.vice)],['Semifinal',din(t.semi)],
          ['Quartas de final',din(t.quartas)],['Oitavas de final',din(t.oitavas)],
          ['Fase de grupos',din(t.part)]];
}
function rfSrtPremioCampeao(key){
  const l=rfSrtPremios(key); return l.length?l[0][1]:'—';
}

/* ---- estado da tela: competição, aba e o alternador de resultados ---- */
function rfSrtAba(){ return CL.srtAba||'auto'; }
function rfSrtSetAba(a){ CL.srtAba=a; cdraw(); }
function rfSrtToggleFim(){ CL.srtFim=!CL.srtFim; cdraw(); }

/* ---- chips: todas as copas que existem neste save ---- */
function rfSrtChipsHTML(atual){
  const keys=Object.keys((S&&S.cups)||{});
  if(keys.length<2) return '';
  return `<div class="rf-srt-chips">${keys.map(k=>{
    const d=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[k])||{};
    return `<button type="button" class="rf-srt-chip ${k===atual?'on':''}" style="${k===atual?rfSrtVars(k):''}"
      onclick="rfSrtVerComp('${escC(k)}')">
      <i style="${rfSrtTrofeuBg(k)}"></i>${escC(d.short||d.name||k)}</button>`;
  }).join('')}</div>`;
}
/* trocar de competição volta à 1ª aba: o handoff pede, e é o certo — a aba de
   grupos não existe em mata-mata e ficaria a apontar para o vazio. */
function rfSrtVerComp(k){ CL.srtComp=k; CL.srtAba='auto'; cdraw(); }

/* ---- vaga de clube ---- */
function rfSrtVaga(club, opts){
  opts=opts||{};
  if(!club) return `<div class="rf-srt-vaga vazia"><span class="rf-srt-bolha"></span>
    <span class="rf-srt-cn">a definir</span></div>`;
  return `<div class="rf-srt-vaga caiu ${opts.meu?'meu':''}">
    <span class="rf-srt-crest">${rfCrest(club,19)}</span>
    <span class="rf-srt-cn">${escC(club.short||club.name||'')}</span></div>`;
}
const rfSrtClube = id => id!=null ? (anyClubOf(id)||{short:String(id)}) : null;

/* ---- ABA 1 · grupos ---- */
function rfSrtGruposHTML(grupos, meuId, letras){
  return `<div class="rf-srt-grupos">${grupos.map((g,i)=>{
    const L=(letras&&letras[i])||String.fromCharCode(65+i);
    return `<div class="rf-srt-grupo">
      <div class="rf-srt-ghd"><span class="rf-srt-gb">${escC(L)}</span>
        <span class="rf-srt-gt">Grupo ${escC(L)}</span></div>
      ${g.map(id=>rfSrtVaga(rfSrtClube(id),{meu:id===meuId})).join('')}
    </div>`;}).join('')}</div>`;
}

/* ---- ABA 2 · confrontos ----
   `pares` = [[casa, fora, golsCasa, golsFora], ...]; os dois últimos só existem
   quando a rodada já foi jogada, e é isso que o alternador liga. */
function rfSrtConfrontosHTML(pares, meuId, mm, letras, fim){
  return `<div class="rf-srt-confrontos ${mm?'mm':''}">${pares.map((p,i)=>{
    const a=rfSrtClube(p[0]), b=rfSrtClube(p[1]);
    const meu=(p[0]===meuId||p[1]===meuId);
    const temGols=fim && p[2]!=null && p[3]!=null;
    const aWin=temGols && p[2]>=p[3], bWin=temGols && p[3]>p[2];
    return `<div class="rf-srt-conf ${meu?'meu':''}">
      <span class="rf-srt-conf-n">${escC(mm?String(i+1).padStart(2,'0'):((letras&&letras[i])||''))}</span>
      <span class="rf-srt-conf-l">
        <span class="rf-srt-conf-c ${a?'':'vazio'}">${escC(a?a.short:'a definir')}</span>
        <span class="rf-srt-conf-c ${b?'':'vazio'}">${escC(b?b.short:'a definir')}</span></span>
      ${temGols?`<span class="rf-srt-conf-g">
        <span class="${aWin?'win':''}">${p[2]}</span><span class="${bWin?'win':''}">${p[3]}</span></span>`:''}
    </div>`;}).join('')}</div>`;
}

/* ---- ABA 3 · chave até a taça ----
   As fases derivam dos confrontos: quem vence uma passa para a seguinte. Sem
   resultados, a chave mostra a estrutura com as vagas por preencher. */
function rfSrtTieHTML(t, fim, cls){
  const a=rfSrtClube(t&&t[0]), b=rfSrtClube(t&&t[1]);
  const gols=fim && t && t[2]!=null && t[3]!=null;
  const aw=gols && t[2]>=t[3], bw=gols && t[3]>t[2];
  const lin=(c,win,g)=>`<span class="rf-srt-tie-r ${win?'win':''}">
    <span class="rf-srt-tie-n">${escC(c?c.short:'a definir')}</span>
    ${gols?`<span class="rf-srt-tie-g">${g}</span>`:''}</span>`;
  return `<div class="rf-srt-tie ${cls||''}">${lin(a,aw,t&&t[2])}${lin(b,bw,t&&t[3])}</div>`;
}
function rfSrtChaveHTML(K, key, fim){
  const col=(lista,rot)=>`<div class="rf-srt-col">
    <span class="rf-srt-fase-l">${escC(rot)}</span>
    ${lista.map(t=>rfSrtTieHTML(t,fim)).join('')}</div>`;
  const meio=a=>Math.ceil(a.length/2);
  const oi=K.oitavas||[], qu=K.quartas||[], se=K.semis||[];
  const campeao=fim&&K.campeao?rfSrtClube(K.campeao):null;
  return `<div class="rf-srt-chave">
    ${col(oi.slice(0,meio(oi)),'Oitavas')}
    ${col(qu.slice(0,meio(qu)),'Quartas')}
    ${col(se.slice(0,meio(se)),'Semifinal')}
    <div class="rf-srt-centro">
      <span class="rf-srt-centro-tr" style="${rfSrtTrofeuBg(key)}"></span>
      <span class="rf-srt-fase-l">Final</span>
      ${rfSrtTieHTML(K.finalTie,fim,'final')}
      ${campeao?`<span class="rf-srt-faixa">🏆 ${escC(campeao.short)}</span>`:''}
    </div>
    ${col(se.slice(meio(se)),'Semifinal')}
    ${col(qu.slice(meio(qu)),'Quartas')}
    ${col(oi.slice(meio(oi)),'Oitavas')}
  </div>`;
}
/* deriva a chave dos confrontos: o vencedor de cada par sobe. Sem placar, a fase
   seguinte fica com vagas vazias — que é exatamente o que se sabe antes de jogar. */
function rfSrtChaveDe(pares){
  const venc=t=>(t && t[2]!=null && t[3]!=null) ? (t[2]>=t[3]?t[0]:t[1]) : null;
  const juntar=arr=>{ const out=[]; for(let i=0;i<arr.length;i+=2)
    out.push([venc(arr[i]), venc(arr[i+1]), null, null]); return out; };
  const oitavas=pares.slice(0,8);
  const quartas=juntar(oitavas), semis=juntar(quartas), fin=juntar(semis)[0]||[null,null];
  return { oitavas, quartas, semis, finalTie:fin, campeao:venc(fin) };
}

/* =====================================================================
   MONTAGEM
   ===================================================================== */
function rfSorteioHTML(key, dr){
  if(CL.srtComp && S.cups && S.cups[CL.srtComp]) key=CL.srtComp;
  const c=(S.cups&&S.cups[key])||{};
  const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[key])||{};
  const tema=rfSrtTema(key), meu=CL.clubId;
  const feito=dr?dr.idx:0, total=dr?dr.reveal.length:0;
  const fim=!!CL.srtFim;

  /* campeão atual: o save guarda o histórico por temporada. Sem histórico ainda
     (1ª temporada), o palco diz isso em vez de inventar um nome. */
  const campeao=(()=>{ const h=(S.history||[]).slice().reverse().find(x=>x.cups&&x.cups[key]);
    return (h&&h.cups[key])||null; })();
  const nTitulos=(S.history||[]).filter(x=>x.cups&&x.cups[key]&&x.cups[key]===campeao).length;

  /* ---- grupos: a estrutura real do save é c.group.groups, indexada por LETRA ---- */
  const gobj=(c.group&&c.group.groups)||null;
  const letras=gobj?Object.keys(gobj).sort():[];
  const porGrupo=letras.length?((gobj[letras[0]].teams||[]).length||4):4;
  const sorteados=new Set((dr?dr.reveal.slice(0,feito):[]).map(r=>r.id));
  const grupos=letras.map(L=>(gobj[L].teams||[]).slice()
    .map(id=>(!dr||dr.idx>=dr.reveal.length||sorteados.has(id))?id:null));
  const temGrupos=grupos.length>0;

  /* ---- JOGOS DA FASE DE GRUPOS ----
     A aba "Confrontos da fase" do desenho mostra os jogos DOS GRUPOS, não o
     mata-mata — e eles existem no save: cada grupo tem `sched` (uma lista de
     rodadas, cada uma com os seus jogos) e `results` (o que já foi jogado).
     O desenho supunha 48 (turno único); o jogo faz turno e returno, então são
     96. O layout aguenta — a grelha corre para baixo, como corre no telemóvel. */
  const jogosGrupo=[];
  if(gobj) for(const L of letras){
    const g=gobj[L]||{}, res=g.results||[];
    (g.sched||[]).forEach((rodada,ri)=>(rodada||[]).forEach(([h,a])=>{
      const r=res.find(x=>x && x.r===ri && x.h===h && x.a===a);
      jogosGrupo.push([h,a, r?r.hg:null, r?r.ag:null, L]);
    }));
  }

  /* ---- confrontos: a copa nacional guarda-os no próprio objeto; as continentais
     em c.bracket. É a mesma pergunta que advancePendingCups faz. ---- */
  const br=(c && c.champion!==undefined) ? c : (c.bracket||{});
  const cru=(br.ties||br.matches||[]);
  const jaSaiu=(h,a)=> !dr || dr.idx>=dr.reveal.length ||
    (dr.drawn||[]).some(p=>!p.bye && p.group==null && p.h===h && p.a===a);
  const pares=cru.map(t=>{
    const h=t.h!=null?t.h:t[0], a=t.a!=null?t.a:t[1];
    if(!jaSaiu(h,a)) return [null,null,null,null];
    return [h,a, t.hg!=null?t.hg:null, t.ag!=null?t.ag:null];
  });

  /* aba: 'auto' escolhe a primeira que existe. Mata-mata não tem grupos. */
  let aba=rfSrtAba();
  if(aba==='auto' || (aba==='grupos'&&!temGrupos)) aba = temGrupos ? 'grupos' : 'confrontos';
  /* numa competição de grupos, "confrontos" são os jogos da fase; num mata-mata,
     são os pares da chave. É a mesma aba com a fonte certa para cada formato. */
  const listaConf = temGrupos ? jogosGrupo : pares;
  const nConf=listaConf.length;
  if(aba==='chave' && pares.length<8) aba = temGrupos?'grupos':'confrontos';

  const corpo = aba==='grupos' ? rfSrtGruposHTML(grupos,meu,letras)
    : aba==='chave' ? rfSrtChaveHTML(rfSrtChaveDe(pares),key,fim)
    : rfSrtConfrontosHTML(listaConf,meu,!temGrupos,
        temGrupos?listaConf.map(j=>j[4]):null, fim);

  const abaBt=(id,rot,mostra)=>mostra?`<button type="button" class="rf-srt-aba ${aba===id?'on':''}"
      onclick="rfSrtSetAba('${id}')">${escC(rot)}</button>`:'';
  const prem=rfSrtPremios(key);
  const meuPar=(temGrupos?[]:pares).find(p=>p[0]===meu||p[1]===meu);

  return `<div class="rf-srt" style="${rfSrtVars(key)}">
   <div class="rf-srt-in">
    <div class="rf-srt-top">
      <img src="img/marca-clara.svg" alt="Retrofoot.com.br">
      <span class="rf-srt-kick">Cerimônia do sorteio · Temporada ${escC(String(S.season||''))}</span>
    </div>
    ${rfSrtChipsHTML(key)}

    <div class="rf-srt-bar">
      <i class="ac"></i><i class="glow"></i>
      <span class="rf-srt-bar-tr" style="${rfSrtTrofeuBg(key)}"></span>
      <span class="rf-srt-bar-id">
        <span class="rf-srt-bar-k">${escC(temGrupos?'Fase de grupos':'Mata-mata')} · ${escC(String(S.season||''))}</span>
        <span class="rf-srt-bar-t">${escC(def.name||key)}</span>
        <span class="rf-srt-bar-s">${escC(temGrupos
          ? `${grupos.length*porGrupo} clubes em ${grupos.length} grupos de ${porGrupo}`
          : `${nConf} confrontos de ida e volta`)}</span>
      </span>
      <span class="rf-srt-bar-pr">
        <span class="rf-srt-bar-pl">Prêmio ao campeão</span>
        <span class="rf-srt-bar-pv">${escC(tema.moeda)} ${escC(rfSrtPremioCampeao(key))}</span>
        ${prem[1]?`<span class="rf-srt-bar-pn">mais ${escC(prem[1][1])} ao vice</span>`:''}
      </span>
    </div>

    <div class="rf-srt-grid">
      <aside class="rf-srt-palco">
        <i class="glow"></i>
        <span class="rf-srt-palco-tr" style="${rfSrtTrofeuBg(key)}"></span>
        <span class="rf-srt-regua"></span>
        <span class="rf-srt-camp-l">Campeão atual</span>
        <span class="rf-srt-camp-n">${escC(campeao?((anyClubOf(campeao)||{short:campeao}).short||campeao):'—')}</span>
        <span class="rf-srt-camp-s">${escC(campeao?`${nTitulos} ${nTitulos===1?'título':'títulos'} nesta carreira`:'primeira edição desta carreira')}</span>
        ${prem.length?`<div class="rf-srt-prem">
          <div class="rf-srt-prem-h"><span>Premiação por fase</span><span>${escC(tema.moeda)}</span></div>
          ${prem.map(([f,v],i)=>`<div class="rf-srt-prem-r ${i===0?'top':''}">
            <span class="rf-srt-prem-f">${escC(f)}</span>
            <span class="rf-srt-prem-v">${escC(v)}</span></div>`).join('')}
        </div>`:''}
      </aside>

      <section class="rf-srt-painel">
        <div class="rf-srt-abas">
          ${abaBt('grupos','Grupos sorteados',temGrupos)}
          ${abaBt('confrontos',temGrupos?`Confrontos da fase · ${nConf}`:`${nConf} confrontos`,nConf>0)}
          ${abaBt('chave','Chave até a taça',nConf>=8)}
          <button type="button" class="rf-srt-tog ${fim?'on':''}" onclick="rfSrtToggleFim()">
            ${fim?'● Resultados da rodada':'○ Antes da rodada'}</button>
        </div>
        <span class="rf-srt-status">${escC(dr&&dr.idx<dr.reveal.length
          ? `${feito} de ${total} clubes já caíram` : (fim?'rodada encerrada':'chave definida · aguardando a rodada'))}</span>
        ${corpo}
        ${meuPar?`<div class="rf-srt-meu">O seu confronto saiu: <b>${escC((clubOf(meu)||{short:''}).short)} × ${escC((rfSrtClube(meuPar[0]===meu?meuPar[1]:meuPar[0])||{short:'—'}).short)}</b> — ida fora, volta em casa.</div>`:''}
        <div class="rf-srt-foot">
          <span class="rf-srt-bar-p"><i style="width:${total?Math.round(100*feito/total):100}%"></i></span>
          <span class="rf-srt-n">${total?`${feito} / ${total}`:`${nConf} jogos`}</span>
          <button type="button" class="rf-srt-go" onclick="clCupDrawSkip()">⏩ Acelerar</button>
        </div>
      </section>
    </div>
   </div>
  </div>`;
}
