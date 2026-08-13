/* =====================================================================
   RetroFoot98 — LEVA 4: FLUXO DE ENTRADA
   Portado de telas/Fluxo - Escolha de Moeda · Pais Jogavel · Carregando ·
   Numero de Treinadores · Escolha dos Clubes · Continuar Save ·
   Conta - Recuperar Senha · Landing - Paginas Institucionais.

   Todas usam o MESMO envelope de assistente do onboarding (rfWiz), com a
   trilha de seis passos: Entrar · Modo · País e liga · Sala · Convites ·
   Clube. A recuperação de senha é a exceção: ela não é um passo do fluxo,
   e por isso entra sem trilha.
   ===================================================================== */

/* cartão grande de escolha, com ícone em cima (moeda, país, nº de treinadores) */
function rfEscolha(o){
  return `<div class="rf-esc ${o.on?'on':''}" onclick="${o.acao}" role="button" tabindex="0">
    ${o.ico?`<span class="rf-esc-ico">${o.ico}</span>`:''}
    <span class="rf-esc-t">${escC(o.titulo)}</span>
    ${o.valor?`<span class="rf-esc-v">${escC(o.valor)}</span>`:''}
    ${o.sub?`<span class="rf-esc-s">${escC(o.sub)}</span>`:''}
  </div>`;
}

/* =====================================================================
   1 · ESCOLHA DE MOEDA (passo 3)
   ===================================================================== */
const RF_MOEDAS=[
  { k:'Reais',    ico:'🇧🇷', t:'Real',  simb:'R$',  taxa:1,       sub:'o padrão do futebol brasileiro' },
  { k:'Euros',    ico:'🇪🇺', t:'Euro',  simb:'€',   taxa:0.168,   sub:'se você compara com a Europa' },
  { k:'Dólares',  ico:'🌎', t:'Dólar', simb:'US$', taxa:0.184,   sub:'referência internacional' },
];
function rfMoedaHTML(){
  const cur=CL.currency||'Reais';
  /* O VALOR DE CADA CARTÃO é o mesmo caixa inicial convertido — a referência
     mostra os três lado a lado justamente pra dar a escala. O caixa real do
     clube só existe depois de newGame(), então aqui vai o valor típico da
     divisão de entrada (REBAL.budget com a mediana), não um número inventado. */
  const base=(typeof REBAL!=='undefined'&&REBAL.budget)
    ? REBAL.budget((typeof computeStartDivision==='function'?computeStartDivision():'D'), {random:()=>0.5}) : 0;
  const corpo=`
    ${rfWizHead('Passo 3 de 6','Em que moeda você quer jogar?',
      'Vale para salários, transferências e o caixa do clube. Dá para trocar depois nas opções.')}
    <div class="rf-wiz-mid">
      <div class="rf-esc-grid tres">${RF_MOEDAS.map(m=>rfEscolha({
        ico:m.ico, titulo:m.t, valor:base?rfMoedaFmt(m,base):'—', sub:m.sub, on:cur===m.k,
        acao:`rfMoedaSel('${m.k}')`
      })).join('')}</div>
      <span class="rf-wiz-nota-c">O valor mostrado é o caixa inicial típico da divisão de entrada, convertido.</span>
    </div>`;
  return rfWiz({ passo:3, corpo, nota:'Você pode trocar depois em Clube & Sistema.',
    voltar:'clMoedaBack()', voltarLabel:'‹ Voltar ao país',
    topoDir:'', cta:'Continuar', ctaOn:'clMoedaOk()' });
}
function rfMoedaFmt(m, base){
  const v=Math.round(base*m.taxa);
  return m.simb+' '+(typeof grp==='function'?grp(v):v);
}
function rfMoedaSel(k){ CL.currency=k; cdraw(); }

/* =====================================================================
   2 · PAÍS JOGÁVEL (passo 3)
   ===================================================================== */
function rfPaisHTML(){
  const paises=selectedPlayableCountries();
  const sel=CL.playCountry||paises[0];
  const corpo=`
    ${rfWizHead('Passo 3 de 6','Onde você vai treinar?',
      'O país define as divisões, as copas e o calendário do save.')}
    <div class="rf-wiz-mid">
      <div class="rf-esc-grid dois">${paises.map(c=>{
        const uk=(typeof countryUniverseKey==='function')?countryUniverseKey(c):null;
        const n=rfClubesDoPais(uk)||((typeof intlTeams==='function'&&intlTeams(c))||0);
        return `<div class="rf-esc linha ${sel===c?'on':''}" onclick="rfPaisSel('${escC(c)}')" role="button" tabindex="0">
          <span class="rf-esc-ico">${(typeof flagImg==='function')?flagImg(c):'🏳️'}</span>
          <span class="rf-esc-id"><span class="rf-esc-t">${escC(c)}</span>
            <span class="rf-esc-s">${escC(rfDivisoesDe(c))}${n?' · '+n+' clubes':''}</span></span>
        </div>`;
      }).join('')}</div>
    </div>`;
  return rfWiz({ passo:3, corpo, nota:'Mais países entram nas próximas atualizações.',
    voltar:'clGoPaises()', voltarLabel:'‹ Voltar ao modo',
    cta:`Continuar com ${sel||'o país'}`, ctaOff:!sel, ctaOn:'clPaisJogavelOk()' });
}
function rfPaisSel(c){ CL.playCountry=c; cdraw(); }
/* as divisões daquele país saem do UNI_CONFIGS, não de uma lista à parte */
function rfDivisoesDe(c){
  const uk=(typeof countryUniverseKey==='function')?countryUniverseKey(c):null;
  const cfg=(typeof UNI_CONFIGS!=='undefined'&&uk)?UNI_CONFIGS[uk]:null;
  if(!cfg||!cfg.order||!cfg.order.length) return '';
  const lbl=cfg.label||{};
  return cfg.order.map(d=>lbl[d]||d).join(', ');
}

/* =====================================================================
   3 · CARREGANDO (sem passo: é a transição)
   ===================================================================== */
const RF_LOAD_ETAPAS=[
  { t:'Divisões e clubes',   ate:25 },
  { t:'Elencos e contratos', ate:60 },
  { t:'Calendário e copas',  ate:85 },
  { t:'Mercado inicial',     ate:100 },
];
const RF_LOAD_DICAS=[
  'Na Série D o mercado é curto. Guarde caixa para a segunda janela.',
  'Time cansado rende menos: rode o elenco nas rodadas seguidas.',
  'Jogador com contrato acabando sai de graça — renove antes da última janela.',
  'Vitória em casa rende bilheteria: encher o estádio é dinheiro no caixa.',
];
function rfCarregandoHTML(){
  const pct=CL._loadPct||0;
  const atual=RF_LOAD_ETAPAS.find(e=>pct<e.ate)||RF_LOAD_ETAPAS[RF_LOAD_ETAPAS.length-1];
  const dica=RF_LOAD_DICAS[Math.abs(pct)%RF_LOAD_DICAS.length];
  const splash=window.ADS?ADS.html('rf98.loading.splash',{cls:'rf-ad-splash'}):'';
  const corpo=`
    ${rfWizHead('A preparar o seu save','Carregando jogo…',
      'Montando as divisões, os elencos e o calendário da temporada.')}
    <div class="rf-wiz-mid">
      ${splash}
      <div class="rf-pz-barra">
        <div class="rf-label"><span class="rf-label-t">${escC(atual.t)}</span>
          <span class="rf-pz-pct" id="cl-load-pct">${pct}%</span></div>
        <div class="rf-pz-trilho"><div class="rf-pz-fill" id="cl-load-fill" style="width:${pct}%"></div></div>
      </div>
      ${RF_LOAD_ETAPAS.map(e=>{
        const feito=pct>=e.ate, agora=!feito&&e===atual;
        return `<div class="rf-pz-lin">
          <span class="rf-pz-i ${feito?'ok':agora?'agora':''}">${feito?'✓':agora?'⏳':'·'}</span>
          <span class="rf-pz-t">${escC(e.t)}</span>
          <div class="rf-sp"></div>
          <span class="rf-pz-e">${feito?'feito':agora?'a montar':'na fila'}</span>
        </div>`;
      }).join('')}
      <span class="rf-wiz-dica">Dica: ${escC(dica)}</span>
    </div>`;
  return rfWiz({ semTrilha:true, corpo });
}

/* as etapas avançam junto com a barra, sem redesenhar a tela inteira (um cdraw
   a cada 180ms tiraria o foco e piscaria o splash do patrocinador) */
function rfCarregandoEtapas(pct){
  const linhas=document.querySelectorAll('.rf-wiz-mid .rf-pz-lin');
  if(!linhas.length) return;
  const atual=RF_LOAD_ETAPAS.find(e=>pct<e.ate)||RF_LOAD_ETAPAS[RF_LOAD_ETAPAS.length-1];
  RF_LOAD_ETAPAS.forEach((e,i)=>{
    const l=linhas[i]; if(!l) return;
    const feito=pct>=e.ate, agora=!feito&&e===atual;
    const ico=l.querySelector('.rf-pz-i'), est=l.querySelector('.rf-pz-e');
    if(ico){ ico.className='rf-pz-i '+(feito?'ok':agora?'agora':''); ico.textContent=feito?'✓':agora?'⏳':'·'; }
    if(est) est.textContent=feito?'feito':agora?'a montar':'na fila';
  });
  const rot=document.querySelector('.rf-wiz-mid .rf-label-t');
  if(rot) rot.textContent=atual.t;
}

/* =====================================================================
   4 · NÚMERO DE TREINADORES (passo 4)
   ===================================================================== */
/* HOTSEAT DESLIGADO NA UI. A máquina do multiplayer local está toda no lugar
   (CL._hotseat, enterSeatContext, a fila de assentos), mas a entrada por esta
   tela foi removida antes do rebranding — quem quer jogar com gente é mandado
   pro Modo Resenha. A tela da referência tem os oito cartões, e eles ficam:
   o layout é o do pacote, e os cartões acima de 1 usam o mesmo tratamento de
   "Em breve" que o Modo Resenha já tem no passo 2, em vez de religar em
   silêncio um caminho que o produto desligou. */
const RF_HOTSEAT_LIGADO=false;
function rfTreinadoresHTML(){
  const n=Math.max(1,(CL.names||[]).filter(x=>(x||'').trim()).length||1);
  const cartao=k=>{
    const off=!RF_HOTSEAT_LIGADO && k>1;
    return `<div class="rf-esc ${n===k?'on':''} ${off?'off':''}"
      ${off?'':`onclick="rfTreinadoresSel(${k})" role="button" tabindex="0"`}>
      <span class="rf-esc-t grande">${k}</span>
      <span class="rf-esc-s">${k===1?'só você':'treinadores'}</span>
      ${off?'<span class="rf-esc-tag">Em breve</span>':''}
    </div>`;
  };
  const corpo=`
    ${rfWizHead('Passo 4 de 6','Quantos treinadores na sala?',
      'Cada treinador comanda um clube. Os outros ficam com a máquina.')}
    <div class="rf-wiz-mid">
      <div class="rf-esc-grid quatro">${[1,2,3,4].map(cartao).join('')}</div>
      <div class="rf-esc-grid quatro">${[5,6,7,8].map(cartao).join('')}</div>
      <div class="rf-tr-nomes">
        ${(CL.names||['']).slice(0,n).map((nm,i)=>rfCampo(i===0?'Treinador 1 (você)':'Treinador '+(i+1),
          `<input class="rf-campo-c" ${i===0?'id="cl-focus"':''} maxlength="12" placeholder="TREINADOR"
             value="${escC(nm||'')}" oninput="rfNomeTreinador(${i},this.value)">`)).join('')}
      </div>
      ${RF_HOTSEAT_LIGADO?'':`<div class="rf-aviso"><span class="rf-aviso-i">👥</span>
        <span>Jogar com mais gente é o <b>Modo Resenha</b>: cada um no seu aparelho, online,
        com tabela e chat da liga.</span></div>`}
      <div class="rf-ft-grid tres">
        <div class="rf-ft-b"><span class="rf-ov-res-t">Rodada</span>
          <span class="rf-ft-bv sm">1 por sessão</span></div>
        <div class="rf-ft-b"><span class="rf-ov-res-t">Clubes humanos</span>
          <span class="rf-ft-bv sm">${n} de ${rfClubesNaDivisao()}</span></div>
        <div class="rf-ft-b"><span class="rf-ov-res-t">Os outros</span>
          <span class="rf-ft-bv sm">máquina</span></div>
      </div>
    </div>`;
  return rfWiz({ passo:4, corpo,
    nota:'Os clubes que sobram ficam com a máquina.',
    voltar:'clGoMoeda()', voltarLabel:'‹ Voltar à moeda',
    cta:`Continuar com ${n}`, ctaOn:'clEscolherClubes()' });
}
function rfTreinadoresSel(k){
  CL.names=CL.names||[];
  while(CL.names.length<k) CL.names.push('TREINADOR '+(CL.names.length+1));
  CL.names=CL.names.slice(0,k);
  if(!CL.names[0]) CL.names[0]=(CL.mgr||'TREINADOR').toUpperCase();
  cdraw();
}
function rfNomeTreinador(i,v){ CL.names[i]=String(v||'').toUpperCase(); cdraw(); }
function rfClubesNaDivisao(){
  const pool=CL._pickPool&&CL._pickPool[(CL.playCountry||'Brasil')];
  if(pool&&pool.length) return pool.length;
  return (typeof DATA!=='undefined'&&DATA.clubs)?DATA.clubs.length:'—';
}

/* =====================================================================
   5 · ESCOLHA DOS CLUBES (passo 6)
   Duas faces: antes do sorteio, cada treinador escolhe o país; depois, a
   tabela "Times sorteados!" da referência, com quem ficou com o quê.
   ===================================================================== */
function rfClubesHTML(){
  const paises=selectedPlayableCountries();
  const pick=CL.pick||[];
  const sorteado=pick.length>0 && pick.every(p=>p.clubId);
  const poolById={};
  Object.values(CL._pickPool||{}).forEach(arr=>(arr||[]).forEach(c=>{ poolById[c.id]=c; }));

  if(!sorteado){
    const corpo=`
      ${rfWizHead('Passo 6 de 6','De onde sai cada clube?',
        'Cada treinador escolhe o país. O clube é sempre sorteado — ninguém escolhe o próprio time.')}
      <div class="rf-wiz-mid">
        <div class="rf-cb-head"><span>TREINADOR</span><span>PAÍS</span></div>
        ${pick.map((p,i)=>`<div class="rf-cb-lin">
          <span class="rf-cb-n">${escC(p.name)}${i===0?' <i>(você)</i>':''}</span>
          <select class="rf-campo-c" onchange="clPickCountry(${i},this.value)">
            ${paises.map(c=>`<option value="${escC(c)}" ${p.country===c?'selected':''}>${escC(c)}</option>`).join('')}
          </select>
        </div>`).join('')}
      </div>`;
    return rfWiz({ passo:6, corpo, nota:'Os clubes restantes ficam com a máquina.',
      voltar:'clGoJogadores()', voltarLabel:'‹ Voltar aos treinadores',
      cta:'🎲 Sortear os clubes', ctaOn:'clSortearPick()' });
  }

  const corpo=`
    ${rfWizHead('Passo 6 de 6','Times sorteados!',
      'O sorteio distribuiu os clubes entre os treinadores. Confira antes de começar.')}
    <div class="rf-wiz-mid">
      <div class="rf-cs-head"><span></span><span>CLUBE</span><span>DIVISÃO</span><span>FORÇA</span><span>TREINADOR</span></div>
      ${pick.map((p,i)=>{
        const c=poolById[p.clubId]||{short:String(p.clubId)};
        return `<div class="rf-cs-lin ${i===0?'me':''}">
          <span class="rf-ft-crest">${rfCrest(c,26)}</span>
          <span class="rf-cs-c">${escC(c.short||c.name||'')}</span>
          <span class="rf-cs-d">${escC(rfDivDoClube(c))}</span>
          <span class="rf-cs-f">${c.overall!=null?c.overall:'—'}</span>
          <span class="rf-cs-t">${escC(p.name)}${i===0?' (você)':''}</span>
        </div>`;
      }).join('')}
      <span class="rf-wiz-nota-c">O caixa de cada clube é definido quando a temporada começa.</span>
    </div>`;
  return rfWiz({ passo:6, corpo, nota:'Os demais clubes ficam com a máquina.',
    voltar:'clSortearPick()', voltarLabel:'🎲 Sortear de novo',
    cta:'⚽ Começar a temporada', ctaOn:'startSoloDraw()' });
}
function rfDivDoClube(c){
  const d=c.div||c.division||c.lg;
  return d?((typeof divisionLabelOf==='function')?divisionLabelOf(d):('Série '+d)):'—';
}

/* =====================================================================
   6 · CONTINUAR UM SAVE (passo 2 — é onde o Modo Solo se abre)
   ===================================================================== */
function rfSavesHTML(){
  const carregando=CL.soloSaves==null;
  const saves=(CL.soloSaves||[]).slice()
    .sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
  const corpo=`
    ${rfWizHead('Modo solo','Onde você parou',
      'Os saves ficam na nuvem — entre de qualquer aparelho com a mesma conta.')}
    <div class="rf-wiz-mid">
      ${carregando?'<span class="rf-note">Carregando os seus jogos salvos…</span>'
        :saves.map((s,i)=>`<div class="rf-sv-lin ${i===0?'me':''}" onclick="clLoadSave('${escC(s.name)}')">
          <span class="rf-sv-ico">💾</span>
          <span class="rf-sv-id"><span class="rf-sv-n">${escC(s.name)}</span>
            <span class="rf-sv-s">${escC(rfSaveQuando(s))}</span></span>
          <div class="rf-sp"></div>
          <span class="rf-sv-b">${i===0?'Continuar':'Abrir'}</span>
          <button type="button" class="rf-sv-x" title="Apagar este jogo"
            onclick="event.stopPropagation();clDeleteSave('${escC(s.name)}')">🗑</button>
        </div>`).join('')}
      <div class="rf-sv-lin novo" onclick="clSoloNew()">
        <span class="rf-sv-ico">＋</span>
        <span class="rf-sv-id"><span class="rf-sv-n">Começar um save novo</span>
          <span class="rf-sv-s">Escolha país, liga e clube outra vez</span></span>
      </div>
    </div>`;
  return rfWiz({ passo:2, corpo, nota:'Jogo gravado na nuvem.',
    voltar:'clGoModo()', voltarLabel:'‹ Voltar ao modo',
    cta: saves.length?`Continuar ${saves[0].name}`:'Começar um save novo',
    ctaOn: saves.length?`clLoadSave('${(saves[0].name||'').replace(/'/g,"\\'")}')`:'clSoloNew()' });
}
function rfSaveQuando(s){
  if(!s.updated_at) return 'Jogo salvo';
  const d=new Date(s.updated_at), min=Math.round((Date.now()-d.getTime())/60000);
  if(min<1) return 'agora mesmo';
  if(min<60) return `há ${min} minuto${min===1?'':'s'}`;
  const h=Math.round(min/60);
  if(h<24) return `há ${h} hora${h===1?'':'s'}`;
  const dias=Math.round(h/24);
  if(dias<7) return `há ${dias} dia${dias===1?'':'s'}`;
  return d.toLocaleDateString('pt-BR')+', '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}

/* =====================================================================
   7 · RECUPERAR SENHA — fora da trilha (não é passo do fluxo)
   ===================================================================== */
function rfRecuperarSenhaHTML(){
  const email=CL._resetEmail||'';
  const corpo=`
    ${rfWizHead('Acesso à conta','Esqueceu a senha?',
      'Coloque o e-mail da conta. Enviamos um link para você criar uma nova.')}
    <div class="rf-wiz-mid">
      <div class="rf-wiz-form">
        ${rfCampo('E-mail da conta',
          `<input class="rf-campo-c" id="cl-focus" type="email" inputmode="email" autocomplete="email"
             placeholder="voce@exemplo.com" value="${escC(email)}"
             oninput="CL._resetEmail=this.value" onkeydown="if(event.key==='Enter')clSendResetLink()">`)}
        <div class="rf-aviso"><span class="rf-aviso-i">✉️</span>
          <span>O link vale por 30 minutos. Se não chegar, confira o spam antes de pedir outro.</span></div>
      </div>
    </div>`;
  return rfWiz({ semTrilha:true, corpo, nota:'Os seus saves na nuvem continuam intactos.',
    voltar:'clGoAbertura()', voltarLabel:'‹ Voltar ao login',
    cta:'Enviar o link', ctaOff:!(email&&email.includes('@')), ctaOn:'clSendResetLink()' });
}
/* a outra ponta do mesmo caminho: o link do e-mail cai aqui pra criar a senha.
   Não tem tela de referência própria — usa o mesmo envelope, sem trilha. */
function rfNovaSenhaHTML(){
  const st=CL.resetPw||(CL.resetPw={password:'',confirm:'',focus:'password'});
  const ok=st.password.length>=6 && st.password===st.confirm;
  const difere=st.confirm.length>0 && st.password!==st.confirm;
  const idP=st.focus!=='confirm'?'id="cl-focus"':'', idC=st.focus==='confirm'?'id="cl-focus"':'';
  const corpo=`
    ${rfWizHead('Acesso à conta','Crie uma senha nova','Mínimo de 6 caracteres. Depois disso já dá para entrar.')}
    <div class="rf-wiz-mid">
      <div class="rf-wiz-form">
        ${rfCampo('Nova senha',
          `<input class="rf-campo-c" ${idP} type="password" autocomplete="new-password" minlength="6"
             placeholder="••••••••" value="${escC(st.password)}"
             onfocus="CL.resetPw.focus='password'" oninput="clResetPwInput(this,'password')">`)}
        ${rfCampo('Confirmar senha',
          `<input class="rf-campo-c" ${idC} type="password" autocomplete="new-password"
             placeholder="••••••••" value="${escC(st.confirm)}"
             onfocus="CL.resetPw.focus='confirm'" oninput="clResetPwInput(this,'confirm')"
             onkeydown="if(event.key==='Enter')clDoUpdatePassword()">`)}
        <div class="rf-aviso erro" id="cl-pwwarn" style="display:${difere?'':'none'}">
          <span class="rf-aviso-i">⚠</span><span>As senhas não coincidem.</span></div>
      </div>
    </div>`;
  return rfWiz({ semTrilha:true, corpo, nota:'Os seus saves na nuvem continuam intactos.',
    voltar:'clGoAbertura()', voltarLabel:'‹ Voltar ao início',
    cta:'Salvar senha', ctaOff:!ok, ctaOn:'clDoUpdatePassword()' });
}

/* =====================================================================
   8 · PÁGINAS INSTITUCIONAIS — rfStage com índice à esquerda
   ===================================================================== */
const RF_INSTITUCIONAIS=[
  { k:'sobre',     t:'Sobre o RetroFoot98' },
  { k:'ajuda',     t:'Ajuda' },
  { k:'contato',   t:'Contato' },
  { k:'termos',    t:'Termos de uso' },
  { k:'privacidade',t:'Privacidade' },
];
function rfInstitucionalHTML(view){
  view=view||CL.landingView||'sobre';
  const def=RF_INSTITUCIONAIS.find(x=>x.k===view)||RF_INSTITUCIONAIS[0];
  return rfStage({
    w:1020, semEscudo:true,
    contexto:'RetroFoot98',
    titulo:def.t,
    corpo:`<div class="rf-in-cols">
      <div class="rf-card rf-in-nav">
        ${RF_INSTITUCIONAIS.map(x=>`<button type="button" class="rf-in-l ${x.k===view?'on':''}"
          onclick="clLandingGo('${x.k}')">${escC(x.t)}</button>`).join('')}
      </div>
      <div class="rf-card rf-in-corpo">
        <span class="rf-in-h">${escC(def.t)}</span>
        ${rfInstitucionalCorpo(view)}
      </div>
    </div>`,
    acoes:`<span class="rf-im-auto">© ${new Date().getFullYear()} RetroFoot98</span>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" onclick="clGoModo()"><span>⚽</span> Jogar agora</button>`
  });
}
/* quantos clubes o país tem no total: DATA.clubs, antes do jogo começar, é só
   o bundle da divisão de topo — a conta certa é a soma das divisões do universo */
function rfClubesDoPais(uk){
  const cfg=(typeof UNI_CONFIGS!=='undefined')?UNI_CONFIGS[uk]:null;
  if(!cfg||!cfg.size) return 0;
  return (cfg.order||[]).reduce((t,d)=>t+(cfg.size[d]||0),0);
}
function rfInstitucionalCorpo(view){
  const p=t=>`<p class="rf-in-p">${t}</p>`;
  if(view==='ajuda'){
    const passos=[
      ['1','Escolha o modo.','Solo contra a máquina ou Modo Resenha, com a liga da galera.'],
      ['2','Pegue um clube.','Elencos reais das quatro divisões. O clube é sorteado.'],
      ['3','Monte a tática e jogue.','Escale os titulares, ajuste a formação e mande ver na rodada.'],
    ];
    return passos.map(([n,t,d])=>`<div class="rf-in-passo">
      <span class="rf-in-pn">${n}</span>
      <span class="rf-in-pd"><b>${escC(t)}</b><span>${escC(d)}</span></span>
    </div>`).join('');
  }
  if(view==='contato') return p('Achou um bug, tem uma ideia ou quer chamar pra resenha? Fala com a gente:')
    +`<div class="rf-in-ct"><span>✉️</span><span class="rf-in-mono">contato@retrofoot98.com</span></div>
      <div class="rf-in-ct"><span>🐦</span><b>@retrofoot98</b><span class="rf-in-mudo">— novidades e updates</span></div>`;
  if(view==='termos') return p('<b>1. O jogo.</b> O RetroFoot98 é gratuito para jogar. Você é responsável pela sua conta e pelo que faz nas ligas em que entra.')
    +p('<b>2. Fair play.</b> Nada de trapaça, bots ou ofensa na resenha. Contas fora da linha podem ser suspensas.')
    +p('<b>3. Marcas.</b> Nomes de clubes e jogadores pertencem aos seus donos e são usados apenas para fins de simulação.')
    +`<span class="rf-in-fine">Versão v2026.01</span>`;
  if(view==='privacidade') return p('<b>O que guardamos.</b> Só o essencial pra você jogar: e-mail, apelido de treinador e o progresso do seu clube, gravado na nuvem.')
    +p('<b>O que não fazemos.</b> A gente não vende os seus dados. Sem rastreio pra fora do jogo.')
    +p('<b>Os seus direitos.</b> Você pode pedir os seus dados ou apagar a conta quando quiser — é só falar com a gente no Contato.')
    +`<span class="rf-in-fine">Versão v2026.01</span>`;
  return p('O RetroFoot98 é um jogo de gestão de futebol jogado no navegador, na linhagem dos gestores clássicos. Você é o treinador: escolhe a tática, negocia jogadores, cuida do caixa e briga por acesso nas Séries A, B, C e D e nas copas.')
    +p('Feito por quem cresceu jogando gestor de futebol no computador da família. Roda em qualquer navegador, sem instalar nada, e o save fica na nuvem.')
    +`<div class="rf-ft-grid">
        <div class="rf-ft-b"><span class="rf-ov-res-t">Divisões</span>
          <span class="rf-ft-bv sm">4 no Brasil</span></div>
        <div class="rf-ft-b"><span class="rf-ov-res-t">Clubes</span>
          <span class="rf-ft-bv sm">${rfClubesDoPais('brasil')||'—'}</span></div>
        <div class="rf-ft-b"><span class="rf-ov-res-t">Copas</span>
          <span class="rf-ft-bv sm">Copa do Brasil, Libertadores, Sul-Americana</span></div>
        <div class="rf-ft-b"><span class="rf-ov-res-t">Preço</span>
          <span class="rf-ft-bv sm">grátis</span></div>
      </div>`;
}


/* =====================================================================
   LISTA DE ESPERA — o formulário no desenho novo
   Era uma janela do skin antigo (janelaHTML + .cl-lp-*). Ela é chamada de
   dois lugares que já foram portados — a landing e, agora, o cartão do
   Modo Resenha no passo 2 do onboarding — então uma janela do Windows 98
   abrindo por cima do jogo novo era a última coisa que restava do skin.

   A GRAVAÇÃO NÃO MUDOU: continua clWaitlistSubmit/clWaitlistIndicar, na
   tabela retrofoot_waitlist do Supabase, com a mesma validação. Aqui é só
   o desenho — e `origem`, que passa a dizer de qual tela veio o lead.
   ===================================================================== */
function rfWaitlistDraw(){
  if(!CL.waitlistOpen) return;
  overlayC(rfWaitlistHTML());
}
function rfWaitlistHTML(){
  const w=CL.waitlist||{};
  const vagas=(typeof WAITLIST_VAGAS!=='undefined')?WAITLIST_VAGAS:500;
  const feitas=(CL.waitlistCount!=null)?CL.waitlistCount:null;
  const pct=(feitas!=null&&vagas)?Math.min(100,Math.round(feitas/vagas*100)):null;

  if(CL.waitlistSent){
    const amigos=(w.amigos||['']).map((a,i)=>`<div class="rf-wl-amigo">
      <input class="rf-campo-c" type="email" inputmode="email" autocomplete="off"
        placeholder="email do amigo" value="${escC(a||'')}" oninput="clWaitlistAmigo(${i},this.value)">
      <button type="button" class="rf-wl-x" aria-label="Remover" onclick="clWaitlistRmAmigo(${i})">✕</button>
    </div>`).join('');
    return dlg('Você está na lista', `
      <div class="rf-wl">
        <div class="rf-wl-ok">
          <span class="rf-wl-ok-i">✓</span>
          <span class="rf-wl-ok-d">
            <span class="rf-wl-ok-t">Vaga garantida.</span>
            <span class="rf-note">A gente avisa por e-mail quando a sua vaga entre os
              ${vagas} primeiros for liberada.</span></span>
        </div>
        ${CL.waitlistAmigosOk?'<div class="rf-aviso"><span class="rf-aviso-i">✓</span><span>Indicações guardadas.</span></div>':''}
        <p class="rf-in-p">Agora chama a galera: <b>cada amigo indicado sobe você na fila</b> —
          dá para montar a liga inteira antes do lançamento.</p>
        <div class="rf-wl-amigos">${amigos}</div>
        <button type="button" class="rf-btn rf-btn-secondary" onclick="clWaitlistAddAmigo()">+ Adicionar outro e-mail</button>
        <div class="rf-wl-zap">
          <span class="rf-label-t">Ou chama direto no WhatsApp</span>
          <div class="rf-wl-zap-l">
            <input class="rf-campo-c" type="tel" inputmode="tel" placeholder="DDD + número"
              value="${escC(w.zap||'')}" oninput="clWaitlistSet('zap',this.value)">
            <a class="rf-btn rf-btn-secondary" href="${waitlistZapHref()}" target="_blank" rel="noopener">💬 Convidar</a>
          </div>
        </div>
      </div>`, {
      w:560, glyph:'🎉',
      footer:`<button type="button" class="rf-ov-b2" onclick="clWaitlistClose()">Fechar</button>
        <div class="rf-sp"></div>
        <button type="button" class="rf-ov-cta" ${CL.waitlistBusy?'disabled':''}
          onclick="clWaitlistIndicar()">${CL.waitlistBusy?'Gravando…':'Enviar indicações'}</button>`
    });
  }

  return dlg('Lista de espera', `
    <div class="rf-wl">
      <div class="rf-aviso"><span class="rf-aviso-i">⚠</span>
        <span><b>Vagas limitadas:</b> a primeira versão libera o jogo para <b>${vagas} treinadores</b>.
          Quem indicar amigos sobe na fila.</span></div>
      ${pct!=null?`<div class="rf-pz-barra">
        <div class="rf-label"><span class="rf-label-t">Vagas preenchidas</span>
          <span class="rf-pz-pct">${feitas} / ${vagas}</span></div>
        <div class="rf-pz-trilho"><div class="rf-pz-fill" style="width:${pct}%"></div></div>
      </div>`:''}
      ${CL.waitlistErr?`<div class="rf-aviso erro"><span class="rf-aviso-i">⚠</span><span>${escC(CL.waitlistErr)}</span></div>`:''}
      <div class="rf-wl-form">
        ${rfCampo('Nome do treinador',
          `<input class="rf-campo-c" id="cl-focus" type="text" autocomplete="name"
             placeholder="Como te chamam na resenha" value="${escC(w.nome||'')}"
             oninput="clWaitlistSet('nome',this.value)">`)}
        <div class="rf-wl-2">
          ${rfCampo('E-mail',
            `<input class="rf-campo-c" type="email" inputmode="email" autocomplete="email"
               placeholder="voce@email.com" value="${escC(w.email||'')}"
               oninput="clWaitlistSet('email',this.value)">`)}
          ${rfCampo('WhatsApp (opcional)',
            `<input class="rf-campo-c" type="tel" inputmode="tel" autocomplete="tel"
               placeholder="(11) 99999-0000" value="${escC(w.tel||'')}"
               oninput="clWaitlistSet('tel',this.value)">`)}
        </div>
        ${rfCampo('O que não pode faltar no RetroFoot? (opcional)',
          `<input class="rf-campo-c" type="text" placeholder="Fala o recurso que você quer ver no jogo"
             value="${escC(w.resposta||'')}" oninput="clWaitlistSet('resposta',this.value)"
             onkeydown="if(event.key==='Enter')clWaitlistSubmit()">`)}
      </div>
    </div>`, {
    w:560, glyph:'📋',
    footer:`<span class="rf-im-auto">A gente só usa os seus dados pra avisar da vaga.</span>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" ${CL.waitlistBusy?'disabled':''}
        onclick="clWaitlistSubmit()">${CL.waitlistBusy?'Gravando…':'Garantir minha vaga'}</button>`
  });
}
