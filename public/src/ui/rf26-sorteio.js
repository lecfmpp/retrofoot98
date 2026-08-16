/* =====================================================================
   RetroFoot98 — CERIMÔNIA DO SORTEIO (rebranding 2026)
   Portado de docs/rebranding-2026/telas/Sorteio 2..6.

   O Sorteio 1 (Brasileirão) NÃO entra aqui: aquele formato já vem pronto
   de base no jogo, por decisão do usuário.

   As cinco telas restantes têm o MESMO envelope — o shell do onboarding
   sem a trilha — e três miolos diferentes:
     · CONFRONTOS  Copa do Brasil: pares de ida e volta (tela 2)
     · GRUPOS      Libertadores e Sul-Americana: 8 grupos de 4 (telas 3 e 4)
     · CHAVE       Playoffs: bracket simétrico com a taça no meio (5 e 6)
   Nos três, o painel do troféu de 270px fica à esquerda e a cerimônia à
   direita, com barra de progresso embaixo.

   LAYOUT PRIMEIRO: onde o save ainda não tem o dado que a tela mostra
   (campeão atual, premiação, potes), o texto da referência é usado como
   está — a ligação com o motor vem depois, sem mexer no desenho.
   ===================================================================== */

/* ---- envelope comum: mesmo shell do onboarding, sem trilha ---- */
function rfSorteioShell(o){
  /* A CERIMÔNIA É MAIS LARGA QUE O ASSISTENTE. Ela reaproveitava o `.rf-wiz-in`
     do onboarding, de 980px — largura pensada para uma coluna de perguntas, não
     para oito grupos de quatro clubes lado a lado. Descontando os paddings
     sobravam 131px por coluna de grupo e 63px para o nome do clube: quinze
     nomes saíam cortados ("Coquimb…", "Universid…", "Always R…").
     O pacote desenha esta tela a 1080, e é essa a largura que ela pede. */
  return `<div class="rf-wiz rf-wiz-larga">
    <div class="rf-wiz-in">
      <div class="rf-wiz-marca">
        <img src="img/logo.webp" width="32" height="32" alt="RetroFoot98">
        <span class="rf-wiz-marca-t">RetroFoot<span class="rf-wiz-marca-98">98</span></span>
      </div>
      <div class="rf-wiz-shell">
        <div class="rf-wiz-card">
          ${rfWizHead('Cerimônia do sorteio', o.titulo, o.sub)}
          <div class="rf-srt">
            ${rfSrtTrofeuHTML(o)}
            <div class="rf-srt-mid">
              <div class="rf-label"><span class="rf-label-t">${escC(o.rotulo||'Sorteados')}</span>
                <span class="rf-label-r">${escC(o.estado||'')}</span></div>
              ${o.corpo||''}
              ${rfSrtProgressoHTML(o.feito||0,o.total||0)}
              ${o.meu?`<div class="rf-srt-meu">${rfIcone('jogar',16)} ${o.meu}</div>`:''}
            </div>
          </div>
        </div>
      </div>
      <div class="rf-wiz-acao">
        <span class="rf-wiz-nota">${escC(o.nota||'')}</span>
        <div class="rf-sp"></div>
        <button type="button" class="rf-wiz-b2" onclick="${o.acelerar||'clCupDrawSkip()'}">⏩ Acelerar</button>
      </div>
    </div>
  </div>`;
}
function rfSrtProgressoHTML(feito,total){
  const pct=total?Math.round(100*feito/total):0;
  return `<div class="rf-srt-prog">
    <span class="rf-srt-bar"><i style="width:${pct}%"></i></span>
    <span class="rf-srt-n">${feito} / ${total}</span>
  </div>`;
}
/* painel do troféu: 270px, gradiente do clube, ficha e potes */
function rfSrtTrofeuHTML(o){
  const linha=(l,v)=>`<div class="rf-srt-row"><span class="rf-srt-l">${escC(l)}</span>
    <span class="rf-srt-v">${escC(String(v))}</span></div>`;
  return `<aside class="rf-srt-trofeu">
    <div class="rf-srt-top">
      <span class="rf-srt-ic">${o.trofeu||rfIcone('trofeu',16)+''}</span>
      <span class="rf-srt-nome">${escC(o.comp||'')}</span>
      <span class="rf-srt-fase">${escC(o.fase||'')}</span>
    </div>
    <div class="rf-srt-hr"></div>
    ${(o.ficha||[]).map(([l,v])=>linha(l,v)).join('')}
    ${o.potes&&o.potes.length?`<div class="rf-srt-hr"></div>
      <span class="rf-srt-secao">Potes</span>
      ${o.potes.map((p,i)=>`<div class="rf-srt-pote ${p.on?'on':''}">
        <span class="rf-srt-pn">${i+1}</span>
        <span class="rf-srt-pl">${escC(p.label)}</span>
        <span class="rf-srt-pq">${escC(p.qtd)}</span>
      </div>`).join('')}`:''}
  </aside>`;
}

/* ---- vaga de clube dentro de um grupo/confronto ---- */
function rfSrtVaga(club, opts){
  opts=opts||{};
  if(!club) return `<div class="rf-srt-vaga vazia">
    <span class="rf-srt-bolha"></span><span class="rf-srt-cn">a definir</span></div>`;
  return `<div class="rf-srt-vaga ${opts.novo?'caiu':''} ${opts.meu?'meu':''}">
    <span class="rf-srt-crest">${rfCrest(club,20)}</span>
    <span class="rf-srt-cn">${escC(club.short||club.name||'')}</span>
  </div>`;
}

/* =====================================================================
   MIOLO 1 · GRUPOS (Libertadores, Sul-Americana)
   ===================================================================== */
function rfSrtGruposHTML(grupos, meuId, letras){
  return `<div class="rf-srt-grupos">${grupos.map((g,i)=>{
    const L=(letras&&letras[i])||String.fromCharCode(65+i);
    return `
    <div class="rf-srt-grupo">
      <div class="rf-srt-ghd">
        <span class="rf-srt-gb">${escC(L)}</span>
        <span class="rf-srt-gt">Grupo ${escC(L)}</span>
      </div>
      ${g.map(id=>rfSrtVaga(id?(anyClubOf(id)||{short:String(id)}):null,{meu:id===meuId})).join('')}
    </div>`;}).join('')}</div>`;
}

/* =====================================================================
   MIOLO 2 · CONFRONTOS (Copa do Brasil)
   ===================================================================== */
function rfSrtConfrontosHTML(pares, meuId){
  return `<div class="rf-srt-confrontos">${pares.map(([a,b])=>{
    const ca=a?(anyClubOf(a)||{short:String(a)}):null, cb=b?(anyClubOf(b)||{short:String(b)}):null;
    const meu=(a===meuId||b===meuId);
    return `<div class="rf-srt-conf ${meu?'meu':''}">
      <span class="rf-srt-lado dir">${ca?`<span class="rf-srt-cn">${escC(ca.short)}</span>${rfCrest(ca,20)}`:'<span class="rf-srt-cn vazio">a definir</span>'}</span>
      <span class="rf-srt-x">×</span>
      <span class="rf-srt-lado">${cb?`${rfCrest(cb,20)}<span class="rf-srt-cn">${escC(cb.short)}</span>`:'<span class="rf-srt-cn vazio">a definir</span>'}</span>
    </div>`;
  }).join('')}</div>`;
}

/* =====================================================================
   MIOLO 3 · CHAVE (playoffs) — bracket simétrico com a taça no meio
   ===================================================================== */
function rfSrtChaveHTML(fases, meuId){
  // `fases` = [oitavas, quartas, semi] em pares; o desenho espelha os dois lados
  const lado=(lista,dir)=>`<div class="rf-srt-col ${dir}">
    ${lista.map(par=>`<div class="rf-srt-par">
      ${par.map(id=>rfSrtVaga(id?(anyClubOf(id)||{short:String(id)}):null,{meu:id===meuId})).join('')}
    </div>`).join('')}</div>`;
  const meio=(l)=>Math.ceil(l.length/2);
  const cols=fases.map(f=>({esq:f.slice(0,meio(f)), dir:f.slice(meio(f))}));
  const rot=['Oitavas','Quartas','Semi'];
  return `<div class="rf-srt-chave">
    <div class="rf-srt-rots">${rot.map(r=>`<span>${r}</span>`).join('')}<span>Final</span>${rot.slice().reverse().map(r=>`<span>${r}</span>`).join('')}</div>
    <div class="rf-srt-bracket">
      ${cols.map(c=>lado(c.esq,'e')).join('')}
      <div class="rf-srt-final"><span class="rf-srt-taca">🏆</span></div>
      ${cols.slice().reverse().map(c=>lado(c.dir,'d')).join('')}
    </div>
  </div>`;
}

/* =====================================================================
   MONTAGEM: lê a copa do save e escolhe o miolo
   ===================================================================== */
function rfSorteioHTML(key, dr){
  const c=(S.cups&&S.cups[key])||{};
  const def=(typeof COMP_DEFS!=='undefined'&&COMP_DEFS[key])||{};
  const meu=CL.clubId;
  const feito=dr?dr.idx:0, total=dr?dr.reveal.length:0;
  const trofeu=(typeof trophyImg==='function'&&trophyImg(key,44))||rfIcone('trofeu',16)+'';

  // FICHA do painel: o que o save sabe; o resto vem da tela (ver cabeçalho)
  const campeao=(()=>{ const h=(S.history||[]).slice().reverse().find(x=>x.cups&&x.cups[key]);
    return (h&&h.cups[key])||'—'; })();

  /* A ESTRUTURA REAL DA COPA no save é c.group.groups, um objeto indexado
     por LETRA ({A:{label,teams,table}, B:{...}}), não um array. Ler direto
     dela — em vez de inventar um formato — é o que faz a cerimônia mostrar
     os clubes de verdade caindo nos grupos de verdade. As vagas ainda não
     sorteadas vêm como buraco no array de `teams`, e é isso que vira o
     "a definir" da tela. */
  const gobj=(c.group&&c.group.groups)||null;
  const letras=gobj?Object.keys(gobj).sort():[];
  const porGrupo=letras.length?((gobj[letras[0]].teams||[]).length||4):4;
  // quantos de cada grupo já caíram: o sorteio revela um clube por vez
  const sorteados=new Set((dr?dr.reveal.slice(0,feito):[]).map(r=>r.id));
  const grupos=letras.map(L=>{
    const t=(gobj[L].teams||[]).slice();
    // antes do fim da cerimônia, só mostra quem já foi revelado
    return t.map(id=>(!dr||dr.idx>=dr.reveal.length||sorteados.has(id))?id:null);
  });
  const ehGrupo=grupos.length>0 && dr && dr.stage==='group';

  if(ehGrupo){
    return rfSorteioShell({
      titulo:def.name||key, sub:def.drawSub||`${grupos.length*porGrupo} clubes em ${grupos.length} grupos de ${porGrupo}.`,
      trofeu, comp:def.short||def.name||key, fase:`FASE DE GRUPOS · ${S.season||''}`,
      ficha:[['Campeão atual',campeao],['Clubes',grupos.length*porGrupo],
             ['Grupos',`${grupos.length} de ${porGrupo}`],['Premiação',def.prize||'—']],
      potes:Array.from({length:porGrupo},(_,i)=>({label:'Pote '+(i+1),
        qtd:grupos.length+(i?' clubes':' cabeças'), on:dr&&Math.floor(feito/grupos.length)===i})),
      rotulo:'Grupos sorteados', estado: total?`pote ${Math.min(porGrupo,Math.floor(feito/grupos.length)+1)} em sorteio`:'',
      corpo:rfSrtGruposHTML(grupos,meu,letras), feito, total,
      nota:`Sorteando ${feito} de ${total} clubes já caíram.`,
    });
  }

  // mata-mata: pares da fase corrente
  const br=c.bracket||{};
  const pares=(br.ties||br.matches||[]).map(t=>[t.h||t[0], t.a||t[1]]);
  const copaBR = key==='copaBrasil';
  return rfSorteioShell({
    titulo:def.name||key,
    sub: copaBR ? 'Mata-mata de ida e volta desde a primeira fase.' : 'Mata-mata de ida e volta.',
    trofeu, comp:def.short||def.name||key, fase:`${copaBR?'1ª FASE':'MATA-MATA'} · ${S.season||''}`,
    ficha:[['Campeão atual',campeao],['Clubes',pares.length*2||'—'],
           ['Formato','ida e volta'],['Premiação',def.prize||'—']],
    rotulo: copaBR?'Confrontos da 1ª fase':'Chave', estado:'volta em casa',
    corpo: copaBR ? rfSrtConfrontosHTML(pares,meu) : rfSrtChaveHTML([pares],meu),
    feito, total,
    meu: (()=>{ const p=pares.find(x=>x[0]===meu||x[1]===meu); if(!p) return '';
      const outro=anyClubOf(p[0]===meu?p[1]:p[0])||{short:'—'};
      return `O seu confronto saiu: <b>${escC((clubOf(meu)||{short:''}).short)} × ${escC(outro.short)}</b> — ida fora, volta em casa.`; })(),
    nota:`Sorteando os confrontos: ${feito} de ${total} definidos.`,
  });
}
